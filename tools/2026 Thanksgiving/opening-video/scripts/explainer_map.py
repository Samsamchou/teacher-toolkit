"""S03 解說動畫（第二次念）：地圖跟著字走。念到 England → 英格蘭亮起、船出發；念到 America → 船抵達、美洲亮起。
版面：最上方 130 px 留給標籤、最下方 230 px 留給字幕、右下角留給 Pippy 小頭像（地圖內容不放在這些區域）。
  python scripts/explainer_map.py   -> work/X03_map.mp4（長度＝S03_2 片長）
"""
import json, math, subprocess, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FILM = Path(__file__).resolve().parents[1]
OUT = FILM / "work"; OUT.mkdir(exist_ok=True)
W, H, FPS, SR, LINE_AT = 1920, 1080, 24, 48000, 0.5
FONTS = FILM / "work" / "fonts"
FONT_EN, FONT_ZH = str(FONTS / "ComicRelief-Regular.ttf"), str(FONTS / "msjhbd.ttc")
SEA, LAND, EDGE = (120, 190, 230), (238, 214, 160), (190, 150, 95)
ENG, AME = (1500, 470), (430, 560)


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, t)))


def word_times():
    w = json.loads((FILM / "voices" / "words.json").read_text(encoding="utf-8"))["S03"]["take2"]
    t = Path(tempfile.mkdtemp()) / "a.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(FILM / "voices" / "S03_2.mp3"), "-ar", str(SR), "-ac", "1", str(t)], check=True)
    a, _ = sf.read(str(t), dtype="float32"); idx = np.where(np.abs(a) > 0.01)[0]; off = max(0, idx[0] - 2400) / SR
    return {x["w"]: (LINE_AT + x["t"] - off, x["d"]) for x in w}


def base():
    im = Image.new("RGB", (W, H), SEA); d = ImageDraw.Draw(im)
    for y in range(0, H, 60):
        d.arc([-200, y, W + 200, y + 120], 200, 340, fill=(140, 205, 240), width=3)
    d.polygon([(0, 140), (300, 130), (520, 290), (470, 450), (520, 620), (380, 760), (260, 1080), (0, 1080)], fill=LAND, outline=EDGE)
    d.polygon([(1720, 160), (1920, 140), (1920, 1080), (1800, 1080), (1720, 700), (1780, 560), (1710, 420)], fill=LAND, outline=EDGE)
    d.polygon([(1440, 370), (1540, 340), (1570, 490), (1500, 570), (1430, 520)], fill=LAND, outline=EDGE)  # Great Britain
    return im.filter(ImageFilter.SMOOTH)


def glow(d, xy, r, a):
    for k in range(6, 0, -1):
        d.ellipse([xy[0] - r * k / 3, xy[1] - r * k / 3, xy[0] + r * k / 3, xy[1] + r * k / 3], fill=(255, 230, 90, int(a * 30)))


def label(d, xy, en, zh, a):
    if a <= 0:
        return
    fe, fz = ImageFont.truetype(FONT_EN, 66), ImageFont.truetype(FONT_ZH, 48)
    d.text(xy, en, font=fe, fill=(40, 40, 60, int(255 * a)), anchor="mm", stroke_width=6, stroke_fill=(255, 255, 255, int(255 * a)))
    d.text((xy[0], xy[1] + 66), zh, font=fz, fill=(200, 80, 20, int(255 * a)), anchor="mm", stroke_width=5, stroke_fill=(255, 255, 255, int(255 * a)))


def frame(t, bg, T):
    im = bg.convert("RGBA"); ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    t_eng, _ = T["England"]; t_ame, d_ame = T["America"]
    dep, arr = t_eng, t_ame + d_ame          # ship leaves on "England", arrives at the end of "America"
    a_e = ease((t - t_eng + 0.2) / 0.3); a_a = ease((t - t_ame + 0.1) / 0.3)
    glow(d, ENG, 40, a_e); glow(d, AME, 40, a_a)
    label(d, (ENG[0], ENG[1] - 150), "England", "英格蘭", a_e)
    label(d, (AME[0] + 230, AME[1] + 40), "America", "美洲", a_a)
    p = ease((t - dep) / max(0.8, arr - dep))
    pts = [(ENG[0] + (AME[0] - ENG[0]) * u, ENG[1] + (AME[1] - ENG[1]) * u - 170 * math.sin(math.pi * u)) for u in np.linspace(0, 1, 101)]
    for k in range(0, int(100 * p), 3):
        d.line([pts[k], pts[min(k + 1, 100)]], fill=(255, 255, 255, 255), width=10)
    for xy, a in ((ENG, 1), (AME, a_a)):
        d.ellipse([xy[0] - 16, xy[1] - 16, xy[0] + 16, xy[1] + 16], fill=(220, 60, 40, int(255 * a)))
    if t >= t_eng - 0.6:   # ship appears at England just before it leaves
        sx, sy = pts[int(100 * p)]; bob = 6 * math.sin(t * 8); s = 1.3
        d.polygon([(sx - 50 * s, sy + bob), (sx + 50 * s, sy + bob), (sx + 34 * s, sy + 30 * s + bob), (sx - 34 * s, sy + 30 * s + bob)], fill=(130, 80, 40, 255))
        d.line([(sx, sy + bob), (sx, sy - 70 * s + bob)], fill=(90, 60, 30, 255), width=7)
        d.polygon([(sx + 4, sy - 66 * s + bob), (sx + 4, sy - 10 + bob), (sx + 44 * s, sy - 20 + bob)], fill=(250, 245, 230, 255))
        d.polygon([(sx - 4, sy - 60 * s + bob), (sx - 4, sy - 10 + bob), (sx - 38 * s, sy - 18 + bob)], fill=(250, 245, 230, 255))
    im.alpha_composite(ov)
    return im.convert("RGB")


if __name__ == "__main__":
    T = word_times()
    secs = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                 str(FILM / "h3" / "S03_2" / "clip.mp4")], capture_output=True, text=True).stdout)
    bg = base()
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(OUT / "X03_map.mp4")], stdin=subprocess.PIPE)
    for i in range(int(round(secs * FPS))):
        p.stdin.write(frame(i / FPS, bg, T).tobytes())
    p.stdin.close(); p.wait()
    (OUT / "X03_events.json").write_text(json.dumps({k: v for k, v in T.items()}, indent=1), encoding="utf-8")
    for tt in (T["England"][0] + 0.3, T["America"][0] + 1.0):
        frame(tt, bg, T).save(OUT / f"X03_check_{tt:.1f}.png")
    print(OUT / "X03_map.mp4", f"{secs:.2f}s", {k: round(v[0], 2) for k, v in T.items()})
