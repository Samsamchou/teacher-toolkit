"""把網頁動畫逐格錄成 MP4（含英文朗讀與音效）。

  python scripts/export_mp4.py mom            # 只錄 my mom 5 句 → renders/thankful_mom.mp4
  python scripts/export_mp4.py                # 所有已做好的句子 → renders/thankful_all.mp4
"""
import base64, subprocess, sys, wave
from pathlib import Path
import numpy as np
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "renders"; OUT.mkdir(exist_ok=True)
FPS = 30
SR = 44100


def read_audio(path):
    """mp3/wav → float32 單聲道 44.1k（用 ffmpeg 解碼）。"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def add(buf, clip, at, gain):
    i = int(at * SR); j = min(len(buf), i + len(clip))
    if i < len(buf):
        buf[i:j] += clip[: j - i] * gain


def main(groups):
    name = "_".join(groups) if groups else "all"
    tmp_audio = OUT / f"_{name}.wav"
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1700, "height": 1100})
        pg.add_init_script("window.EXPORT_MODE = true;")
        pg.goto((ROOT / "index.html").as_uri())
        pg.evaluate("document.fonts.load('58px \"Comic Relief\"')"); pg.wait_for_timeout(800)
        sents = pg.evaluate("SENT.map(s => ({key: s.key, group: s.group, audio: s.audio, sfx: SCENES[s.key].sfx}))")
        idx = [i for i, s in enumerate(sents) if not groups or s["group"] in groups]
        total = 0.0; plan = []
        for i in idx:
            tm = pg.evaluate(f"timingOf({i})"); plan.append((i, tm, total)); total += tm["end"]
        audio = np.zeros(int(total * SR) + SR, dtype=np.float32)
        sfx_cache = {}
        frames_dir = OUT / f"_frames_{name}"; frames_dir.mkdir(exist_ok=True)
        for f in frames_dir.glob("*.jpg"):
            f.unlink()
        n = 0
        for i, tm, off in plan:
            s = sents[i]
            add(audio, read_audio(ROOT / s["audio"]), off + 0.6, 1.0)
            for u, sname in s["sfx"]:
                clip = sfx_cache.setdefault(sname, read_audio(ROOT / "sfx" / f"{sname}.wav"))
                add(audio, clip, off + tm["tB"] + u, 0.35)
            nf = int(tm["end"] * FPS)
            for k in range(nf):
                url = pg.evaluate(f"(renderAt({i},{k / FPS}), document.getElementById('stage').toDataURL('image/jpeg', .9))")
                (frames_dir / f"{n:06d}.jpg").write_bytes(base64.b64decode(url.split(",")[1])); n += 1
            print(s["key"], "frames", nf, flush=True)
        b.close()
    audio = np.clip(audio, -1, 1)
    with wave.open(str(tmp_audio), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((audio * 32767).astype("<i2").tobytes())
    dst = OUT / f"thankful_{name}.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", str(frames_dir / "%06d.jpg"), "-i", str(tmp_audio),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-shortest", str(dst)], check=True)
    for f in frames_dir.glob("*.jpg"):
        f.unlink()
    frames_dir.rmdir(); tmp_audio.unlink()
    print("saved", dst, round(dst.stat().st_size / 1e6, 1), "MB")


if __name__ == "__main__":
    main(sys.argv[1:])
