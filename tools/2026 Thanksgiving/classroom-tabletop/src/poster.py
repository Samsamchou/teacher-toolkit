"""片頭教學海報：Codex 插圖（沒有字）＋程式疊標題與 8 個單字（英文＋中文）。
  python src/poster.py  →  out/poster_A3.png（4608×3072，可列印）、props/poster_tex.png（2304×1536，給 Blender 當貼圖）
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT.parent / "opening-video" / "work" / "fonts"
EN = str(FONTS / "ComicRelief-Regular.ttf"); ZH = str(FONTS / "msjhbd.ttc")
WORDS = [("Mayflower", "五月花號"), ("Pilgrims", "清教徒"), ("Wampanoag", "萬帕諾亞格族"), ("winter", "冬天"),
         ("corn", "玉米"), ("harvest", "豐收"), ("feast", "盛宴"), ("holiday", "節日")]
# 原圖 1536×1024 座標：標籤條（左、右、上、下）
COLS = [(38, 388), (418, 753), (784, 1121), (1148, 1500)]
ROWS = [(512, 563), (912, 963)]
BROWN = (84, 40, 18); RED = (200, 50, 40)


def build(scale):
    art = Image.open(ROOT / "refs" / "poster_art.png").convert("RGB")
    im = art.resize((1536 * scale, 1024 * scale), Image.LANCZOS); d = ImageDraw.Draw(im)
    S = lambda v: int(v * scale)
    # 標題
    t1, t2 = "How Thanksgiving Began", "感恩節的由來"
    f1 = ImageFont.truetype(EN, S(76)); f2 = ImageFont.truetype(ZH, S(40))
    d.text((S(768), S(62)), t1, font=f1, anchor="mm", fill=BROWN)
    d.text((S(768), S(122)), t2, font=f2, anchor="mm", fill=RED)
    # 8 個單字：英文＋中文同一行
    for i, (en, zh) in enumerate(WORDS):
        (x0, x1), (y0, y1) = COLS[i % 4], ROWS[i // 4]
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        k = 1.0
        while True:                           # 太長就縮小，左右各留 18 px
            fe = ImageFont.truetype(EN, S(36 * k)); fz = ImageFont.truetype(ZH, S(26 * k))
            we = d.textlength(en, font=fe); wz = d.textlength(zh, font=fz); gap = S(14 * k)
            if we + gap + wz <= S(x1 - x0 - 36) or k < 0.6: break
            k -= 0.04
        x = S(cx) - (we + gap + wz) / 2
        d.text((x, S(cy)), en, font=fe, anchor="lm", fill=BROWN)
        d.text((x + we + gap, S(cy) + S(2)), zh, font=fz, anchor="lm", fill=(150, 80, 30))
    return im


if __name__ == "__main__":
    (ROOT / "out").mkdir(exist_ok=True)
    build(3).save(ROOT / "out" / "poster_A3.png")
    build(2).resize((2304, 1536), Image.LANCZOS).save(ROOT / "props" / "poster_tex.png")
    build(1).save(ROOT / "qa" / "poster_check.png")
    print("ok")
