"""全片合成：講解＋故事 1–3 → 一支完整長片＋4 支單獨影片，字幕版與聽力版，各 1080p／720p，整支 −16 LUFS。
  python src/assemble.py v1      （先要有 renders/parts/ 的 8 個分段檔，見 HANDOFF）
每個分段先量響度、加固定增益到 −16 LUFS（不用 loudnorm：有閃避的混音會被它拉壞），統一成 1920×1080、30 fps、AAC 48 kHz 立體聲，再接起來。
"""
import re, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent; PARTS = ROOT / "renders" / "parts"; OUT = ROOT / "renders" / "final"; OUT.mkdir(parents=True, exist_ok=True)
VER = sys.argv[1] if len(sys.argv) > 1 else "v1"
SEG = [("1-explain", "explain"), ("2-story1", "story1"), ("3-story2", "story2"), ("4-story3", "story3")]


def run(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, a)], check=True)
def lufs(f):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(f), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="ignore").stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])
def dur(f): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout)


for tag in ("", "-listening"):
    norm = []
    for label, key in SEG:
        src = PARTS / f"{key}{tag}.mp4"; dst = OUT / f"verbs-{label}-{VER}{tag}.mp4"; g = -16.0 - lufs(src)
        run("-i", src, "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p", "-af", f"volume={g:.2f}dB,alimiter=limit=0.95:level=false,aresample=48000",
            "-ac", "2", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dst)
        norm.append(dst); print(dst.name, round(dur(dst), 2), "s", "gain", round(g, 2), "->", lufs(dst), "LUFS", flush=True)
    lst = OUT / "_list.txt"; lst.write_text("".join(f"file '{p.name}'\n" for p in norm), encoding="utf-8")
    full = OUT / f"verbs-full-{VER}{tag}.mp4"
    run("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", full); lst.unlink()
    print(full.name, round(dur(full), 2), "s", lufs(full), "LUFS", "(parts sum", round(sum(dur(p) for p in norm), 2), ")", flush=True)
    for p in norm + [full]:
        run("-i", p, "-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "24", "-preset", "medium", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", p.with_name(p.stem + "-720p.mp4"))
print("ALLDONE")
