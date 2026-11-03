"""Pippy 定妝照（三種畫風各一張），用 Codex CLI 內建生圖。

  python scripts/gen_pippy.py            # 產生 chars/pippy_A.png、pippy_B.png、pippy_C.png
  python scripts/gen_pippy.py B          # 只重做 B

Codex 不能寫入 G 槽，所以在 C 槽暫存資料夾生成，再複製回 chars/。
"""
import shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

FILM = Path(__file__).resolve().parents[1]
WORK = Path(tempfile.gettempdir()) / "thanksgiving_pippy_codex"

PIPPY = (
    "Pippy, an original cute mascot character for a children's English lesson video. "
    "His whole body is one small round pumpkin pie standing upright like a disc: a golden-brown crimped pie-crust rim "
    "forms a ring around his face, and the smooth orange pumpkin filling is his face. "
    "Big friendly dark-brown eyes with white highlights, rosy cheeks, small eyebrows, and a clear, simple mouth that can open "
    "wide when he talks (mouth gently open in a happy smile here). A swirl of whipped cream on top of his head like a hair tuft. "
    "He wears a small plain black tall hat with a narrow brown band (no buckle) tilted on the whipped cream, "
    "and a small white collar under his chin. Short cream-colored arms with four-finger hands, short legs with little brown boots. "
    "He is short and round, as tall as a pie standing up. Cheerful, curious, a little clumsy."
)

STYLES = {
    "A": "Soft 3D animated-feature style: rounded clay-like shapes, gentle subsurface lighting, warm autumn color palette, "
         "smooth clean surfaces, like a modern family animation film.",
    "B": "Warm hand-painted storybook style: gouache and colored-pencil textures, soft outlines, cozy autumn palette, "
         "like a classic children's picture book.",
    "C": "Japanese anime cel-shaded style: clean confident line art, flat cel shading with soft gradients, bright warm palette, "
         "TV-anime key-visual finish.",
}


def job(key):
    d = WORK / f"pippy_{key}"
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    prompt = (
        "Use your built-in image generation tool to create one image.\n\n"
        f"Character model sheet: {PIPPY}\n"
        "Show the same character twice side by side, full body: left = front view, right = three-quarter view facing left, "
        "both waving one hand with a big smile. Plain flat light-gray background, no floor shadows, no props. "
        "16:9 landscape image. The image contains no writing of any kind: no letters, no numbers, no words, no logos.\n\n"
        f"Style: {STYLES[key]}\n\n"
        "Save the PNG as out.png in the current directory. Reply with the saved file path only."
    )
    codex = shutil.which("codex") or shutil.which("codex.cmd")
    r = subprocess.run([codex, "exec", "--skip-git-repo-check", "-s", "workspace-write", "-"], cwd=d,
                       input=prompt, capture_output=True, text=True, encoding="utf-8", errors="replace")
    (d / "log.txt").write_text(r.stdout + r.stderr, encoding="utf-8")
    out = d / "out.png"
    if not out.exists():
        # Codex 有時只存到 ~/.codex/generated_images，從 stdout 找路徑
        for line in reversed((r.stdout or "").splitlines()):
            p = Path(line.strip().strip("`"))
            if p.suffix.lower() == ".png" and p.exists():
                shutil.copy(p, out)
                break
    if not out.exists():
        return f"{key} FAILED (log: {d / 'log.txt'})"
    dst = FILM / "chars" / f"pippy_{key}.png"
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.open(out).convert("RGB").save(dst)
    dst.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    return f"{key} OK -> {dst}"


if __name__ == "__main__":
    keys = sys.argv[1:] or list(STYLES)
    with ThreadPoolExecutor(3) as ex:
        for msg in ex.map(job, keys):
            print(msg, flush=True)
