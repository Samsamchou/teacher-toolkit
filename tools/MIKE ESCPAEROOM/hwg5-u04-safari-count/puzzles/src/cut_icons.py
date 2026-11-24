"""Cut a Codex 2x2 sticker sheet into single transparent icons (Safari Count).
python src/cut_icons.py <sheet.png> name1 name2 name3 name4   (left-to-right, top-to-bottom)"""
import sys, numpy as np
from PIL import Image, ImageDraw
from pathlib import Path
root = Path(__file__).resolve().parent.parent
sheet, names = sys.argv[1], sys.argv[2:]
im = Image.open(root / 'assets' / 'source' / sheet).convert('RGB'); W, H = im.size
for k, name in enumerate(names):
    q = im.crop(((k % 2) * W // 2, (k // 2) * H // 2, (k % 2 + 1) * W // 2, (k // 2 + 1) * H // 2))
    a = np.asarray(q); ink = a.min(axis=2) < 235
    ys, xs = np.where(ink); pad = 4
    c = q.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), xs.max() + pad, ys.max() + pad)).convert('RGBA')
    w, h = c.size
    for s in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if c.getpixel(s)[3] and min(c.getpixel(s)[:3]) > 225: ImageDraw.floodfill(c, s, (255, 255, 255, 0), thresh=38)
    side = max(w, h); sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(c, ((side - w) // 2, (side - h) // 2))
    sq.resize((400, 400), Image.LANCZOS).save(root / 'assets' / 'icons' / f'{name}.png'); print('icon', name)
