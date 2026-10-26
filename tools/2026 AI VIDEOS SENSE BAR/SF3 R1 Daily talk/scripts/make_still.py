"""S15 knock shot, made locally (no AI video): slow push-in on frames/S15.png, the door shakes on each knock,
and a synthesized wooden knock sound. Output still/S15.mp4 (1344x768, 24 fps, 48 kHz audio) + still/S15_knock.wav.
  python scripts/make_still.py
"""
import json, subprocess
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
S = next(s for s in CFG["shots"] if s["id"] == "S15")
OUT = FILM / "still"; OUT.mkdir(exist_ok=True)
W, H, FPS, SR = 1344, 768, 24, 48000
DUR = S["dur"]
KNOCKS = [0.55, 0.80, 1.35, 1.60]  # "knock, knock!" = two pairs


def knock_wav():
    t = np.arange(int(DUR * SR)) / SR
    out = np.zeros_like(t)
    rng = np.random.default_rng(7)
    for k in KNOCKS:
        m = t >= k
        tt = t[m] - k
        body = 0.9 * np.exp(-tt * 38) * np.sin(2 * np.pi * 140 * tt) + 0.5 * np.exp(-tt * 55) * np.sin(2 * np.pi * 310 * tt)
        click = 0.35 * np.exp(-tt * 400) * rng.standard_normal(len(tt))
        out[m] += body + click
    out = out / np.abs(out).max() * 0.6
    f = OUT / "S15_knock.wav"
    sf.write(f, out.astype(np.float32), SR)
    return f


def frames():
    src = Image.open(FILM / "frames" / "S15.png").convert("RGB").resize((int(W * 1.12), int(H * 1.12)), Image.LANCZOS)
    n = int(DUR * FPS)
    d = OUT / "_frames"; d.mkdir(exist_ok=True)
    for i in range(n):
        t = i / FPS
        z = 1.0 + 0.06 * t / DUR                     # slow push-in
        shake = sum(np.exp(-(t - k) * 30) * np.sin((t - k) * 90) for k in KNOCKS if t >= k) * 4
        cw, ch = W / z * 1.0, H / z * 1.0
        cx, cy = src.width / 2 + shake, src.height / 2
        box = (cx - cw / 2 * 1.12 / 1.12, cy - ch / 2, cx + cw / 2, cy + ch / 2)
        src.crop(tuple(int(round(v)) for v in box)).resize((W, H), Image.LANCZOS).save(d / f"{i:04d}.png")
    return d


if __name__ == "__main__":
    a = knock_wav()
    d = frames()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(d / "%04d.png"), "-i", str(a),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    str(OUT / "S15.mp4")], check=True)
    for f in d.glob("*.png"):
        f.unlink()
    d.rmdir()
    print(OUT / "S15.mp4")
