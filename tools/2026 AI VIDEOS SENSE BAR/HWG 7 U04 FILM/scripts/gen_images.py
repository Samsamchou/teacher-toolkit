"""Generate scene masters and first frames with Codex CLI (built-in image generation).

  python scripts/gen_images.py masters            # all scene masters -> masters/<name>.png
  python scripts/gen_images.py frames [S01 S05]   # first frames -> frames/<id>.png (default: all missing)
  python scripts/gen_images.py sheet              # frames/_sheet.jpg for review

Codex cannot write to G:, so each job runs in a temp folder on C: and the PNG is copied back.
Frames are center-cropped to 16:9 and resized to 1536x864 (H3 input size).
"""
import json, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageDraw

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
WORK = Path(tempfile.gettempdir()) / "hwg7u04_codex"
PAR = 6
SIZE = (1536, 864)


def codex_image(name, prompt, refs, dst):
    d = WORK / name
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    args = []
    for i, r in enumerate(refs):
        local = d / f"ref{i}_{Path(r).name}"
        shutil.copy(r, local)
        args += ["-i", local.name]
    full = (f"Use your built-in image generation tool to create one image.\n\n{prompt}\n\n"
            f"Save the PNG as out.png in the current directory. Reply with the saved file path only.")
    codex = shutil.which("codex") or shutil.which("codex.cmd")
    r = subprocess.run([codex, "exec", "--skip-git-repo-check", "-s", "workspace-write", *args, "-"], cwd=d,
                       input=full, capture_output=True, text=True, encoding="utf-8", errors="replace")
    (d / "log.txt").write_text(r.stdout + r.stderr, encoding="utf-8")
    out = d / "out.png"
    if not out.exists():
        return f"{name} FAILED (log: {d / 'log.txt'})"
    im = Image.open(out).convert("RGB")
    w, h = im.size
    tw = min(w, int(h * 16 / 9)); th = int(tw * 9 / 16)
    im = im.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th)).resize(SIZE, Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst)
    (dst.with_suffix(".prompt.txt")).write_text(prompt + "\nrefs: " + ", ".join(Path(r).name for r in refs), encoding="utf-8")
    return f"{name} OK"


def masters():
    jobs = []
    for n, desc in CFG["masters"].items():
        p = f"Scene master background for an animated film. {desc}\n\nStyle: {CFG['style']}"
        jobs.append((f"master_{n}", p, [], FILM / "masters" / f"{n}.png"))
    run(jobs)


def frames(ids):
    jobs = []
    for s in CFG["shots"]:
        dst = FILM / "frames" / f"{s['id']}.png"
        if ids and s["id"] not in ids:
            continue
        if not ids and dst.exists():
            continue
        refs = [FILM / "masters" / f"{s['scene']}.png"] + [FILM / "chars" / f"{k}.png" for k in s["refs"]]
        who = "; ".join(CFG["chars"][k] for k in s["refs"]) or "no characters, only hands as described"
        ref_note = ("Attached image 1 is the location reference: keep the same place, layout, lighting and time of day. "
                    + ("The other attached images are the exact character sheets: keep each character's face, hair, "
                       "colors and costume identical to the sheet. " if s["refs"] else ""))
        only = f"Draw only these characters and no one else: {who}." if s["refs"] else ""
        p = f"First frame of shot {s['id']} of an animated film. {s['frame']}\n\n{only}\n\n{ref_note}\n\nStyle: {CFG['style']}"
        jobs.append((s["id"], p, refs, dst))
    run(jobs)


def run(jobs):
    print(f"{len(jobs)} images, {PAR} at a time", flush=True)
    with ThreadPoolExecutor(PAR) as ex:
        for msg in ex.map(lambda j: codex_image(*j), jobs):
            print(msg, flush=True)


def sheet():
    ids = [s["id"] for s in CFG["shots"]]
    w, h = 512, 288
    cols = 4
    rows = (len(ids) + cols - 1) // cols
    c = Image.new("RGB", (w * cols, h * rows), "black")
    for k, i in enumerate(ids):
        f = FILM / "frames" / f"{i}.png"
        if f.exists():
            c.paste(Image.open(f).convert("RGB").resize((w, h)), ((k % cols) * w, (k // cols) * h))
        d = ImageDraw.Draw(c)
        d.rectangle(((k % cols) * w, (k // cols) * h, (k % cols) * w + 60, (k // cols) * h + 22), fill="black")
        d.text(((k % cols) * w + 6, (k // cols) * h + 5), i, fill="yellow")
    c.save(FILM / "frames" / "_sheet.jpg", quality=85)
    print("frames/_sheet.jpg", c.size)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "masters":
        masters()
    elif cmd == "frames":
        frames(sys.argv[2:])
    elif cmd == "sheet":
        sheet()
