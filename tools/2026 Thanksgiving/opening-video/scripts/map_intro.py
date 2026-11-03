"""S03 開頭 3 秒地圖動畫（程式畫，文字一定正確）：England → America 虛線航線、小船移動、1620 彈出。
  python scripts/map_intro.py   -> work/S03_map.mp4（1920x1080, 24 fps, 3.0 s, 無聲）
"""
import math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FILM = Path(__file__).resolve().parents[1]
OUT = FILM / "work"; OUT.mkdir(exist_ok=True)
W, H, FPS, SECS = 1920, 1080, 24, 3.0
FONT_EN = str(FILM.parents[1] / "2026 AI VIDEOS SENSE BAR" / "SF3 R1 Daily talk" / "fonts" / "ComicRelief-Regular.ttf")
FONT_ZH = "C:/Windows/Fonts/msjhbd.ttc"
SEA, LAND, LAND_EDGE = (120, 190, 230), (238, 214, 160), (190, 150, 95)
ENG = (1560, 400)   # England
AME = (430, 560)    # America (New England coast)


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, t)))


def base():
    im = Image.new("RGB", (W, H), SEA)
    d = ImageDraw.Draw(im)
    for y in range(0, H, 60):  # soft wave lines
        d.arc([-200, y, W + 200, y + 120], 200, 340, fill=(140, 205, 240), width=3)
    # North America (left) and Europe (right): simple friendly blobs
    d.polygon([(0, 120), (300, 90), (520, 250), (470, 430), (520, 600), (380, 760), (250, 980), (0, 1000)], fill=LAND, outline=LAND_EDGE)
    d.polygon([(1700, 120), (1920, 80), (1920, 900), (1780, 860), (1700, 640), (1760, 520), (1690, 380)], fill=LAND, outline=LAND_EDGE)
    d.polygon([(1500, 300), (1600, 270), (1630, 420), (1560, 500), (1490, 450)], fill=LAND, outline=LAND_EDGE)  # Great Britain
    return im.filter(ImageFilter.SMOOTH)


def label(d, xy, en, zh, alpha):
    if alpha <= 0:
        return
    fe, fz = ImageFont.truetype(FONT_EN, 64), ImageFont.truetype(FONT_ZH, 46)
    x, y = xy
    c = (40, 40, 60)
    d.text((x, y), en, font=fe, fill=c + (int(255 * alpha),), anchor="mm", stroke_width=6, stroke_fill=(255, 255, 255, int(255 * alpha)))
    d.text((x, y + 64), zh, font=fz, fill=(200, 80, 20, int(255 * alpha)), anchor="mm", stroke_width=5, stroke_fill=(255, 255, 255, int(255 * alpha)))


def frame(i, bg):
    t = i / FPS
    im = bg.convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    label(d, (ENG[0], ENG[1] - 150), "England", "英格蘭", ease(t / 0.4))
    label(d, (AME[0] + 200, AME[1] + 170), "America", "美洲", ease((t - 0.3) / 0.4))
    p = ease((t - 0.4) / 2.0)  # ship progress
    # curved route
    pts = []
    for k in range(101):
        u = k / 100
        x = ENG[0] + (AME[0] - ENG[0]) * u
        y = ENG[1] + (AME[1] - ENG[1]) * u - 160 * math.sin(math.pi * u)
        pts.append((x, y))
    for k in range(0, int(100 * p), 3):
        d.line([pts[k], pts[min(k + 1, 100)]], fill=(255, 255, 255, 255), width=10)
    d.ellipse([ENG[0] - 16, ENG[1] - 16, ENG[0] + 16, ENG[1] + 16], fill=(220, 60, 40, 255))
    d.ellipse([AME[0] - 16, AME[1] - 16, AME[0] + 16, AME[1] + 16], fill=(220, 60, 40, int(255 * ease((t - 0.3) / 0.4))))
    sx, sy = pts[int(100 * p)]
    bob = 6 * math.sin(t * 8)
    d.polygon([(sx - 50, sy + bob), (sx + 50, sy + bob), (sx + 34, sy + 30 + bob), (sx - 34, sy + 30 + bob)], fill=(130, 80, 40, 255))
    d.line([(sx, sy + bob), (sx, sy - 70 + bob)], fill=(90, 60, 30, 255), width=6)
    d.polygon([(sx + 4, sy - 66 + bob), (sx + 4, sy - 10 + bob), (sx + 44, sy - 20 + bob)], fill=(250, 245, 230, 255))
    d.polygon([(sx - 4, sy - 60 + bob), (sx - 4, sy - 10 + bob), (sx - 38, sy - 18 + bob)], fill=(250, 245, 230, 255))
    # 1620 pop
    a = (t - 0.6) / 0.35
    if a > 0:
        s = 1 + 0.25 * math.sin(math.pi * min(1, a)) if a < 1 else 1
        f = ImageFont.truetype(FONT_EN, int(170 * s))
        d.text((W // 2, 170), "1620", font=f, fill=(255, 200, 40, 255), anchor="mm", stroke_width=12, stroke_fill=(90, 50, 20, 255))
    im.alpha_composite(ov)
    return im.convert("RGB")


if __name__ == "__main__":
    bg = base()
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(OUT / "S03_map.mp4")], stdin=subprocess.PIPE)
    for i in range(int(SECS * FPS)):
        p.stdin.write(frame(i, bg).tobytes())
    p.stdin.close(); p.wait()
    frame(int(2.5 * FPS), bg).save(OUT / "S03_map_check.png")
    print(OUT / "S03_map.mp4")
