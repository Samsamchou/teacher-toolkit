"""cards9.py — 影片 9 情境動畫的 2D 疊圖（PIL）：DAY 圖字卡、WEATHER 圖字卡、字幕、猜猜倒數、Your turn。
英文字一律 Comic Relief（2026-11-10 老師）；字幕往上 56 px、底邊 ≥ 84 px（2026-11-15 老師）。
overlay(seg, t) → 1920×1080 RGBA；seg＝timing.json 的一段，t＝段內秒數。
"""
import math, pathlib
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
FONTS = HERE.parent / 'fonts'
CARDS = HERE / 'tabletop' / 'cards'
W, H = 1920, 1080
DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
_F = {}


def font(size, bold=True):
    k = (size, bold)
    if k not in _F: _F[k] = ImageFont.truetype(str(FONTS / ('ComicRelief-Bold.ttf' if bold else 'ComicRelief-Regular.ttf')), size)
    return _F[k]


def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


def pop(t, t0):
    """跳出來：0 → 1.12 → 1（0.3 秒）。"""
    x = (t - t0) / 0.3
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    return 1.12 * math.sin(x * math.pi / 2) if x < 0.7 else 1.12 - 0.12 * (x - 0.7) / 0.3


_IMG = {}


def wx_img(name, size):
    k = (name, size)
    if k not in _IMG:
        im = Image.open(CARDS / f'wx-{name}.png').convert('RGBA'); im.thumbnail((size, size), Image.LANCZOS); _IMG[k] = im
    return _IMG[k]


def card_base(w, h, accent):
    im = Image.new('RGBA', (w + 24, h + 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((12, 18, w + 12, h + 18), 34, fill=(0, 0, 0, 70))            # 影子
    d.rounded_rectangle((6, 6, w + 6, h + 6), 34, fill=(255, 252, 244, 255), outline=accent, width=8)
    return im, d


def day_card(day):
    w, h = 400, 330; im, d = card_base(w, h, (90, 140, 230, 255))
    d.text((w / 2 + 6, 46), 'DAY', font=font(40), fill=(90, 140, 230), anchor='mm')
    # 小月曆：一週七格，今天那格變色（只用星期縮寫字母，教學用）
    cw, x0, y0 = 50, 6 + (w - 7 * 50) / 2, 82
    for i, dn in enumerate(DAYS):
        on = dn == day; x = x0 + i * cw
        d.rounded_rectangle((x + 3, y0, x + cw - 3, y0 + 92), 10, fill=(255, 170, 60) if on else (232, 238, 250),
                            outline=(230, 120, 20) if on else (190, 200, 225), width=3)
        d.text((x + cw / 2, y0 + 30), dn[:2], font=font(24), fill=(255, 255, 255) if on else (110, 120, 150), anchor='mm')
        d.ellipse((x + cw / 2 - 9, y0 + 56, x + cw / 2 + 9, y0 + 74), fill=(255, 255, 255) if on else (200, 208, 228))
    d.text((w / 2 + 6, 258), day, font=font(80 if len(day) < 8 else 70), fill=(40, 60, 120), anchor='mm')
    return im


def weather_card(wx):
    w, h = 400, 330; im, d = card_base(w, h, (60, 170, 120, 255))
    d.text((w / 2 + 6, 46), 'WEATHER', font=font(40), fill=(60, 170, 120), anchor='mm')
    pic = wx_img(wx, 175); im.alpha_composite(pic, (int(w / 2 + 6 - pic.width / 2), int(160 - pic.height / 2)))
    d.text((w / 2 + 6, 282), wx, font=font(76), fill=(30, 90, 60), anchor='mm')
    return im


def paste_scaled(base, im, cx, cy, s, alpha=1.0):
    if s <= 0.01 or alpha <= 0.01: return
    im2 = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    if alpha < 1: im2.putalpha(im2.split()[3].point(lambda v: int(v * alpha)))
    base.alpha_composite(im2, (int(cx - im2.width / 2), int(cy - im2.height / 2)))


def outlined(d, xy, text, fnt, fill, anchor='ms', stroke=7):
    d.text(xy, text, font=fnt, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(25, 25, 40))


def subtitle(d, text, word=None):
    """底部字幕（底邊在 1080-140）；word＝要標黃色的地點字。"""
    fnt = font(70); y = H - 140
    if word and word in text:
        a, b = text.split(word, 1); parts = [(a, (255, 255, 255)), (word, (255, 220, 60)), (b, (255, 255, 255))]
    else: parts = [(text, (255, 255, 255))]
    total = sum(d.textlength(p, font=fnt) for p, _ in parts); x = (W - total) / 2
    for p, col in parts:
        outlined(d, (x, y), p, fnt, col, anchor='ls'); x += d.textlength(p, font=fnt)


def overlay(seg, t):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    t_go = seg['walk'][0]
    fade = 1 - ease((t - t_go) / 0.4)            # 出發時字卡淡出
    if 'day' in seg: paste_scaled(im, day_card(seg['day'][0]), 70 + 212, 60 + 177, pop(t, seg['day'][1]), fade)
    if 'weather' in seg: paste_scaled(im, weather_card(seg['weather'][0]), W - 70 - 212, 60 + 177, pop(t, seg['weather'][1]), fade)
    tx = seg['text']
    if seg['scene'][0] - 0.1 <= t < seg['scene'][1] + 0.3: subtitle(d, tx['scene'])
    elif seg['reason'][0] - 0.1 <= t < seg['reason'][1] + 0.3: subtitle(d, tx['reason'])
    elif seg['ask'][0] - 0.1 <= t < seg['guess'][1]: subtitle(d, tx['ask'])
    elif seg['answer'][0] - 0.1 <= t < seg['turn'][1]: subtitle(d, tx['answer'], seg['word'])
    g0, g1 = seg['guess']
    if g0 <= t < g1:   # 猜猜看：中間上方倒數 3、2、1
        n = 3 - int(t - g0); s = pop(t, g0 + (3 - n))
        d2 = Image.new('RGBA', (300, 300), (0, 0, 0, 0)); dd = ImageDraw.Draw(d2)
        dd.ellipse((10, 10, 290, 290), fill=(255, 200, 60, 235), outline=(255, 255, 255, 255), width=10)
        dd.text((150, 160), str(n), font=font(170), fill=(60, 40, 10), anchor='mm')
        paste_scaled(im, d2, W / 2 + 360, 360, 0.8 * s)   # Ken 右邊（不擋臉）
        outlined(d, (W / 2 + 360, 560), 'Guess!', font(64), (255, 230, 120), anchor='mm', stroke=6)
    r0, r1 = seg['turn']
    if r0 <= t < r1:   # Your turn：說說看（進度條 3 秒）
        s = pop(t, r0)
        card = Image.new('RGBA', (560, 170), (0, 0, 0, 0)); dc = ImageDraw.Draw(card)
        dc.rounded_rectangle((0, 0, 559, 169), 40, fill=(255, 120, 90, 240), outline=(255, 255, 255, 255), width=8)
        dc.text((280, 72), 'Your turn!', font=font(84), fill=(255, 255, 255), anchor='mm')
        k = ease((t - r0) / (r1 - r0)); dc.rounded_rectangle((60, 130, 60 + int(440 * (1 - k)), 148), 9, fill=(255, 240, 200))
        paste_scaled(im, card, W / 2, 200, s)
    return im


if __name__ == '__main__':   # 樣張：每種天氣的兩張字卡＋幾個時間點
    import json, sys
    tm = json.loads((HERE / 'tabletop' / 'src' / 'timing.json').read_text(encoding='utf-8'))
    seg = tm[sys.argv[1] if len(sys.argv) > 1 else 'POST']
    bg = Image.new('RGBA', (W, H), (110, 150, 110, 255))
    for k in ('day', 'weather'):
        pass
    for name, t in [('a', seg['weather'][1] + 1.0), ('b', seg['guess'][0] + 1.2), ('c', seg['turn'][0] + 1.0)]:
        out = bg.copy(); out.alpha_composite(overlay(seg, t)); out.convert('RGB').save(HERE / f'card-sample-{name}.jpg', quality=88)
    print('ok')
