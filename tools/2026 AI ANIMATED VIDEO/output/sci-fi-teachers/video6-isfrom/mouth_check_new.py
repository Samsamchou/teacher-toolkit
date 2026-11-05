"""mouth_check_new.py <姿勢 ...> — 只對指定的新姿勢自動找嘴巴（不動 cut.json），輸出加格線的放大檢查圖 talk-art/v3-mouth-check.jpg，
用來決定 find_mouths.py 的 MANUAL 錨點。格線每 50 px，左上角標出裁切原點。"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent; CUT = HERE / 'talk-art/cut'

def find(im):
    a = np.asarray(im, np.float32)[:460]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    m = (al > 200) & (r > 120) & (r - g > 55) & (g < 130) & (b > 55) & (b < 150) & (r - b > 45)
    ys, xs = np.nonzero(m)
    if len(xs) < 30: return [im.width // 2, 260, 50]
    cx, cy = np.median(xs), np.median(ys); keep = (abs(xs - cx) < 70) & (abs(ys - cy) < 50)
    return [int(xs[keep].mean()), int(ys[keep].mean()), 50]

ks = sys.argv[1:]
o = Image.new('RGB', (400 * len(ks), 400), 'white')
for i, k in enumerate(ks):
    im = Image.open(CUT / f'{k}.png').convert('RGBA'); mo = find(im); print(k, mo, im.size)
    x0, y0 = max(0, mo[0] - 200), max(0, mo[1] - 250)
    cr = Image.new('RGBA', (400, 400), 'white'); cr.alpha_composite(im.crop((x0, y0, x0 + 400, y0 + 400)))
    d = ImageDraw.Draw(cr)
    for gx in range(0, 400, 50): d.line((gx, 0, gx, 400), fill=(190, 190, 190, 255))
    for gy in range(0, 400, 50): d.line((0, gy, 400, gy), fill=(190, 190, 190, 255))
    x, y, w = mo[0] - x0, mo[1] - y0, mo[2]; d.ellipse((x - w / 2, y - w * .35, x + w / 2, y + w * .35), outline='red', width=3)
    d.text((4, 4), f'{k} x0={x0} y0={y0}', fill='black'); o.paste(cr.convert('RGB'), (i * 400, 0))
o.save(HERE / 'talk-art/v3-mouth-check.jpg', quality=92)
