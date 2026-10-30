"""用 Codex CLI 生圖（老師指定的唯一生圖來源）。

用法：python tools/gen_image.py <prompt.txt> <輸出.png> [參考圖 ...]
Codex 在 workspace-write 沙箱寫不進 G 槽，所以在暫存資料夾跑，
再從 stdout 或 ~/.codex/generated_images 找到新圖複製回來。
"""
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

GEN_DIR = Path.home() / ".codex" / "generated_images"


def newest_after(t0):
    files = [p for p in GEN_DIR.rglob("*.png") if p.stat().st_mtime >= t0]
    return max(files, key=lambda p: p.stat().st_mtime) if files else None


def main():
    prompt_file, out = Path(sys.argv[1]), Path(sys.argv[2])
    refs = [Path(p).resolve() for p in sys.argv[3:]]
    prompt = prompt_file.read_text(encoding="utf-8")
    prompt += "\n\nUse your built-in image generation tool. Save the PNG as out.png in the current directory. Reply with the saved file path only."
    work = Path(tempfile.mkdtemp(prefix="rpg-gen-"))
    cmd = ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write"]
    for r in refs:
        local = work / ("ref_" + r.name)
        shutil.copy2(r, local)
        cmd += ["-i", str(local)]
    cmd.append("-")
    t0 = time.time()
    res = subprocess.run(cmd, input=prompt, text=True, encoding="utf-8", capture_output=True,
                         cwd=work, shell=(sys.platform == "win32"))
    cand = work / "out.png"
    if not cand.exists():
        m = re.findall(r"[A-Za-z]:\\[^\s\"']+\.png", res.stdout + res.stderr)
        cand = next((Path(p) for p in reversed(m) if Path(p).exists()), None) or newest_after(t0)
    if not cand or not Path(cand).exists():
        print(res.stdout[-2000:], res.stderr[-2000:])
        sys.exit("no image produced")
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(cand, out)
    print("saved", out)


if __name__ == "__main__":
    main()
