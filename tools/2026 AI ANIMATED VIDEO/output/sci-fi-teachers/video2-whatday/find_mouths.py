"""find_mouths.py — 自動找每個姿勢圖的嘴巴位置（嘴唇／口腔的偏紅像素），寫進 talk-art/cut/cut.json 的 mouth: [x, y, w]，並輸出檢查圖 mouth-check.jpg。
只在頭部範圍（上方 460 px）找；找不到或位置怪的，可在 MANUAL 手動覆寫。"""
import json, pathlib
import numpy as np
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent; CUT = HERE / 'talk-art/cut'
MANUAL = {   # 2026-10-30 自動偵測會抓到臉頰，改用人工標記（由 mouth-check.jpg 讀出）
 'amy-basketball': [369, 264, 55], 'amy-calm': [251, 260, 55], 'amy-cheer': [453, 344, 80], 'amy-hug': [234, 244, 55],
 'amy-point': [281, 258, 55], 'amy-puzzled': [303, 262, 45], 'amy-shocked': [242, 266, 45], 'amy-sing': [288, 271, 55],
 'amy-wave': [322, 254, 60], 'ben-case': [201, 273, 60], 'ben-cheer': [335, 315, 70], 'ben-crayons': [302, 267, 55],
 'ben-excited': [517, 296, 65], 'ben-frozen': [430, 278, 30], 'ben-offer': [224, 262, 55], 'ben-panic': [210, 294, 60],
 'ben-show': [223, 278, 55], 'ben-strum': [280, 277, 55], 'sheet-amy': [292, 259, 50], 'sheet-ben': [290, 275, 50]}

def find(im):
    a = np.asarray(im, np.float32)[:460]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    m = (al > 200) & (r > 120) & (r - g > 55) & (g < 130) & (b > 55) & (b < 150) & (r - b > 45)
    ys, xs = np.nonzero(m)
    if len(xs) < 30: return None
    # 取最密集的一團：以中位數為中心，去掉離太遠的點
    cx, cy = np.median(xs), np.median(ys)
    keep = (abs(xs - cx) < 70) & (abs(ys - cy) < 50)
    xs, ys = xs[keep], ys[keep]
    return [int(xs.mean()), int(ys.mean()), int(max(36, np.percentile(xs, 95) - np.percentile(xs, 5) + 16))]

meta = json.loads((CUT / 'cut.json').read_text(encoding='utf-8'))
ks = sorted(meta); cw, ch = 300, 300; cols = 5
sheet = Image.new('RGB', (cols * cw, ((len(ks) + cols - 1) // cols) * cw), 'white'); d = ImageDraw.Draw(sheet)
for i, k in enumerate(ks):
    im = Image.open(CUT / f'{k}.png').convert('RGBA')
    mo = MANUAL.get(k) or find(im); meta[k]['mouth'] = mo
    x0 = max(0, min(im.width - cw, (mo[0] if mo else im.width // 2) - cw // 2)); y0 = max(0, (mo[1] if mo else 250) - 180)
    crop = Image.new('RGBA', (cw, ch), 'white'); crop.alpha_composite(im.crop((x0, y0, x0 + cw, y0 + ch)))
    dd = ImageDraw.Draw(crop)
    if mo: x, y, w = mo[0] - x0, mo[1] - y0, mo[2]; dd.ellipse((x - w / 2, y - w * .35, x + w / 2, y + w * .35), outline=(255, 0, 0, 255), width=3)
    X, Y = (i % cols) * cw, (i // cols) * cw; sheet.paste(crop.convert('RGB'), (X, Y)); d.text((X + 4, Y + 4), f'{k} {mo}', fill='black')
    print(k, mo)
sheet.save(HERE / 'talk-art/mouth-check.jpg', quality=88)
(CUT / 'cut.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')
