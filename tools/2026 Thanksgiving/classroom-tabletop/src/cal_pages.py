"""S11 桌曆的兩張紙：1863 年那頁、2026 年 11 月那頁（星期四那一欄淡淡標出）。
  python src/cal_pages.py → props/cal_1863.png、props/cal_nov2026.png、props/cal_layout.json（星期四格子中心的 UV）
"""
import calendar, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT.parent / "opening-video" / "work" / "fonts"
EN = str(FONTS / "ComicRelief-Regular.ttf")
W, H = 1200, 900
PAPER = (246, 238, 220); INK = (70, 40, 20); RED = (200, 50, 40); SOFT = (236, 214, 170)


def page_1863():
    im = Image.new("RGB", (W, H), PAPER); d = ImageDraw.Draw(im)
    d.text((W / 2, 300), "1863", font=ImageFont.truetype(EN, 330), anchor="mm", fill=INK)
    d.text((W / 2, 560), "Thanksgiving", font=ImageFont.truetype(EN, 110), anchor="mm", fill=INK)
    im.save(ROOT / "props" / "cal_1863.png")


def page_nov():
    im = Image.new("RGB", (W, H), PAPER); d = ImageDraw.Draw(im)
    d.text((W / 2, 80), "November 2026", font=ImageFont.truetype(EN, 92), anchor="mm", fill=INK)
    x0, y0, cw, ch = 70, 210, (W - 140) / 7, 125
    heads = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    d.rectangle([x0 + 4 * cw, y0 - 60, x0 + 5 * cw, y0 + 5 * ch], fill=SOFT)        # 星期四整欄
    for i, h in enumerate(heads):
        d.text((x0 + (i + 0.5) * cw, y0 - 30), h, font=ImageFont.truetype(EN, 46), anchor="mm", fill=RED if i == 4 else INK)
    cal = calendar.Calendar(firstweekday=6)
    thu = {}
    for r, week in enumerate(cal.monthdayscalendar(2026, 11)):
        for c, day in enumerate(week):
            if not day: continue
            cx, cy = x0 + (c + 0.5) * cw, y0 + (r + 0.5) * ch
            d.rectangle([x0 + c * cw, y0 + r * ch, x0 + (c + 1) * cw, y0 + (r + 1) * ch], outline=(200, 180, 150), width=3)
            d.text((cx, cy), str(day), font=ImageFont.truetype(EN, 60), anchor="mm", fill=INK)
            if c == 4: thu[day] = (cx / W, cy / H)
    im.save(ROOT / "props" / "cal_nov2026.png")
    json.dump({"thursdays": thu, "cell": [cw / W, ch / H]}, open(ROOT / "props" / "cal_layout.json", "w"), indent=1)
    print("Thursdays:", sorted(thu))


if __name__ == "__main__":
    page_1863(); page_nov()
