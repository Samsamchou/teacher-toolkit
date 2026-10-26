"""Character sheets, scene masters and first frames with Codex CLI (built-in image generation).
Adapted from HWG 7 U04 FILM/scripts/gen_images.py.

  python scripts/gen_images.py chars [ken ...]     # chars/<name>.png  (front + three-quarter view, gray background)
  python scripts/gen_images.py masters [park ...]  # masters/<name>.png
  python scripts/gen_images.py frames [S01 ...]    # frames/<id>.png  (default: all missing)
  python scripts/gen_images.py sheet               # chars/_sheet.jpg, masters/_sheet.jpg, frames/_sheet.jpg

Codex cannot write to G:, so each job runs in a temp folder on C: and the PNG is copied back.
Transparent references are flattened onto light gray first (otherwise the model sees black).
"""
import json, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageDraw

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
WORK = Path(tempfile.gettempdir()) / "sf3r1_codex"
PAR = 6
SIZE = (1536, 864)


def flat_copy(src, dst):
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (225, 225, 225, 255))
        bg.alpha_composite(im)
        im = bg
    im.convert("RGB").save(dst)


def codex_image(name, prompt, refs, dst, crop=True):
    d = WORK / name
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    args = []
    for i, r in enumerate(refs):
        local = d / f"ref{i}_{Path(r).stem}.png"
        flat_copy(r, local)
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
    if crop:
        w, h = im.size
        tw = min(w, int(h * 16 / 9)); th = int(tw * 9 / 16)
        im = im.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th)).resize(SIZE, Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst)
    dst.with_suffix(".prompt.txt").write_text(prompt + "\nrefs: " + ", ".join(Path(r).name for r in refs), encoding="utf-8")
    return f"{name} OK"


def chars(names):
    jobs = []
    for n, desc in CFG["chars"].items():
        if names and n not in names:
            continue
        refs = [FILM / p for p in CFG["char_refs"][n]]
        p = (f"Character model sheet for an animated film: {desc}. "
             f"Redraw exactly the character in the attached reference image(s): same face, hair, body proportions, "
             f"colors and costume. {CFG['char_notes'].get(n, '')} "
             f"Show the same character twice side by side, full body from head to shoes, standing in a relaxed neutral pose "
             f"with arms down: left = front view, right = three-quarter view facing left. Gentle smile. "
             f"Plain flat light-gray background, no shadows on the floor, no props.\n\nStyle: {CFG['style']}")
        jobs.append((f"char_{n}", p, refs, FILM / "chars" / f"{n}.png"))
    run(jobs)


def masters(names):
    jobs = []
    for n, desc in CFG["masters"].items():
        if names and n not in names:
            continue
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
        who = "; ".join(CFG["chars"][k] for k in s["refs"])
        ref_note = ("Attached image 1 is the location reference: keep the same place, layout, lighting and time of day. "
                    + ("The other attached images are the exact character sheets: keep each character's face, hair, "
                       "colors, costume and relative height identical to the sheet. Ken and Allen are the same height; "
                       "the adults are a head taller. " if s["refs"] else ""))
        only = f"Draw only these characters and no one else: {who}." if s["refs"] else "No people in the frame."
        p = f"First frame of shot {s['id']} of an animated film. {s['frame']}\n\n{only}\n\n{ref_note}\n\nStyle: {CFG['style']}"
        jobs.append((s["id"], p, refs, dst))
    run(jobs)


def run(jobs):
    print(f"{len(jobs)} images, {PAR} at a time", flush=True)
    with ThreadPoolExecutor(PAR) as ex:
        for msg in ex.map(lambda j: codex_image(*j), jobs):
            print(msg, flush=True)


def grid(files, labels, out, w=512, h=288, cols=4):
    rows = (len(files) + cols - 1) // cols
    c = Image.new("RGB", (w * cols, h * rows), "black")
    d = ImageDraw.Draw(c)
    for k, (f, lab) in enumerate(zip(files, labels)):
        x, y = (k % cols) * w, (k // cols) * h
        if f.exists():
            im = Image.open(f).convert("RGB")
            im.thumbnail((w, h))
            c.paste(im, (x + (w - im.width) // 2, y + (h - im.height) // 2))
        d.rectangle((x, y, x + 9 * len(lab) + 12, y + 22), fill="black")
        d.text((x + 6, y + 5), lab, fill="yellow")
    c.save(out, quality=85)
    print(out, c.size)


def sheet():
    n = list(CFG["chars"])
    grid([FILM / "chars" / f"{k}.png" for k in n], n, FILM / "chars" / "_sheet.jpg", 768, 432, 2)
    m = list(CFG["masters"])
    grid([FILM / "masters" / f"{k}.png" for k in m], m, FILM / "masters" / "_sheet.jpg", 640, 360, 3)
    ids = [s["id"] for s in CFG["shots"]]
    labs = [f"{s['id']} {s.get('gen', 'h3')}" for s in CFG["shots"]]
    grid([FILM / "frames" / f"{i}.png" for i in ids], labs, FILM / "frames" / "_sheet.jpg")


if __name__ == "__main__":
    cmd, rest = sys.argv[1], sys.argv[2:]
    {"chars": lambda: chars(rest), "masters": lambda: masters(rest),
     "frames": lambda: frames(rest), "sheet": sheet}[cmd]()
