"""動作合邏輯修正：所有檢查圖的總覽（縮圖＋檔名＋一句說明）→ ../資料/freetime/motion-check-index-v1.png
用法：python -I tools/motion_index.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.dirname(ROOT), "資料", "freetime")
FONT = os.path.join(ROOT, "assets", "fonts", "ComicRelief-Regular.ttf")
FONTB = os.path.join(ROOT, "assets", "fonts", "ComicRelief-Bold.ttf")

SHEETS = [
    ("motion-fix-before-after-v2.png", "5 reported problems: before / after"),
    ("motion-check-ken-v2.png", "Ken x 11 activities, 4 key frames + mesh contacts"),
    ("motion-check-shuiling-v1.png", "Shuiling x 11 activities"),
    ("motion-check-zunbo-v1.png", "Zun-Bo x 11 activities"),
    ("motion-check-movement-v2.png", "Ken movement: walk, jog, home door, sit / stand"),
    ("motion-check-clues-v1.png", "11 clue animations (code)"),
]


def main():
    import re
    def latest(f):   # 同名取最新版（-v1、-v2…）
        base = re.sub(r"-v\d+\.png$", "", f)
        vs = [g for g in os.listdir(OUT) if re.fullmatch(re.escape(base) + r"-v\d+\.png", g)]
        return max(vs, key=lambda g: int(re.search(r"-v(\d+)\.png$", g).group(1))) if vs else f
    sheets = [(latest(f), t) for f, t in SHEETS]
    have = [(f, t) for f, t in sheets if os.path.exists(os.path.join(OUT, f))]
    TW, TH = 420, 520
    cols = 3
    rows = (len(have) + cols - 1) // cols
    W = 40 + cols * (TW + 30)
    H = 110 + rows * (TH + 90)
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    d.text((24, 20), "Free Time planet - motion logic check sheets (2026-11-10)", fill="#111", font=ImageFont.truetype(FONTB, 34))
    d.text((24, 64), "Folder: 3D planet > (data folder) > freetime   - open each file for full size", fill="#555", font=ImageFont.truetype(FONT, 18))
    for i, (f, t) in enumerate(have):
        x = 24 + (i % cols) * (TW + 30)
        y = 110 + (i // cols) * (TH + 90)
        th = Image.open(os.path.join(OUT, f)).convert("RGB")
        th.thumbnail((TW, TH))
        d.rectangle([x - 2, y - 2, x + TW + 2, y + TH + 2], outline="#ccc")
        im.paste(th, (x + (TW - th.width) // 2, y))
        d.text((x, y + TH + 8), f, fill="#7b5ea7", font=ImageFont.truetype(FONTB, 18))
        d.text((x, y + TH + 34), t, fill="#333", font=ImageFont.truetype(FONT, 17))
    missing = [f for f, _ in sheets if not os.path.exists(os.path.join(OUT, f))]
    if missing:
        d.text((24, H - 30), "missing: " + ", ".join(missing), fill="#c92a2a", font=ImageFont.truetype(FONT, 16))
    out = os.path.join(OUT, "motion-check-index-v3.png")
    im.save(out)
    print("saved", out, im.size, "missing", missing)


if __name__ == "__main__":
    main()
