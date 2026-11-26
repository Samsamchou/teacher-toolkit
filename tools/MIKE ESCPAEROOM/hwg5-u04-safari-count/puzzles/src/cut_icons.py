"""Cut a Codex 2x2 sticker sheet into single transparent icons (Safari Count).
python src/cut_icons.py <sheet.png> name1 name2 name3 name4   (left-to-right, top-to-bottom)
A name ending in ":hole" also clears a white hole in the middle (e.g. a ring-shaped mane).
A name ending in ":raw" keeps its own aspect ratio (e.g. a wide grass clump); "-" skips that cell."""
import sys, numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from pathlib import Path
root = Path(__file__).resolve().parent.parent
sheet, names = sys.argv[1], sys.argv[2:]
im = Image.open(root / 'assets' / 'source' / sheet).convert('RGB'); W, H = im.size
for k, name in enumerate(names):
    if name == '-': continue
    raw = name.endswith(':raw'); hole = name.endswith(':hole'); name = name.split(':')[0]
    m = 12   # inset: skip lines/shadows that sit right on the cell border
    q = im.crop(((k % 2) * W // 2 + m, (k // 2) * H // 2 + m, (k % 2 + 1) * W // 2 - m, (k // 2 + 1) * H // 2 - m))
    a = np.asarray(q); ink = a.min(axis=2) < 235
    # keep only the main object: drop bits of a neighbouring icon that cross the cell border
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=6))
    if n > 1:
        big = 1 + int(np.argmax(ndimage.sum(ink, lab, range(1, n + 1))))
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0, big}
        keep = (lab > 0) & ~np.isin(lab, list(edge))   # drop pieces touching the cell border (they belong to a neighbour)
        q = Image.fromarray(np.where(keep[..., None], a, 255).astype(np.uint8)); ink = ink & keep
    ys, xs = np.where(ink); pad = 4
    c = q.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(q.width, xs.max() + pad), min(q.height, ys.max() + pad))).convert('RGBA')
    w, h = c.size
    for s in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if c.getpixel(s)[3] and min(c.getpixel(s)[:3]) > 225: ImageDraw.floodfill(c, s, (255, 255, 255, 0), thresh=38)
    if hole and min(c.getpixel((w // 2, h // 2))[:3]) > 225: ImageDraw.floodfill(c, (w // 2, h // 2), (255, 255, 255, 0), thresh=38)
    if raw:
        k2 = 600 / max(w, h); c.resize((round(w * k2), round(h * k2)), Image.LANCZOS).save(root / 'assets' / 'icons' / f'{name}.png'); print('icon', name, 'raw'); continue
    side = max(w, h); sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(c, ((side - w) // 2, (side - h) // 2))
    sq.resize((400, 400), Image.LANCZOS).save(root / 'assets' / 'icons' / f'{name}.png'); print('icon', name)
