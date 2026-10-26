"""Contact sheet: 6 evenly spaced frames per clip, one row per clip.
  python scripts/sheet_clips.py out.jpg S01=seedance/S01/ref_1.mp4 S20=h3/S20/clip.mp4 ...
"""
import subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw

W, H, N = 400, 225, 6


def frames(mp4):
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4],
                               capture_output=True, text=True).stdout)
    out = []
    for k in range(N):
        t = 0.05 + k * max(dur - 0.2, 0.1) / (N - 1)
        f = Path(tempfile.gettempdir()) / f"_sheet_{k}.png"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", mp4, "-frames:v", "1",
                        "-vf", f"scale={W}:{H}", str(f)])
        out.append(Image.open(f).convert("RGB"))
    return out, dur


dst, items = sys.argv[1], [a.split("=", 1) for a in sys.argv[2:]]
c = Image.new("RGB", (W * N, H * len(items)), "black")
d = ImageDraw.Draw(c)
for r, (label, mp4) in enumerate(items):
    ims, dur = frames(mp4)
    for k, im in enumerate(ims):
        c.paste(im, (k * W, r * H))
    d.rectangle((0, r * H, 150, r * H + 22), fill="black")
    d.text((6, r * H + 5), f"{label}  {dur:.1f}s", fill="yellow")
c.save(dst, quality=85)
print(dst, c.size)
