"""Cut the Codex sheets (10 pupils, travel items) into transparent PNGs; make the map JPG."""
import numpy as np
from PIL import Image, ImageDraw
from pathlib import Path
root = Path(__file__).resolve().parent; src = root/'art'/'source'
def cut(im, rows, cols_per_row):
    a = np.asarray(im.convert('RGB')); ink = a.min(axis=2) < 235
    H = ink.shape[0]; out = []
    prof_y = ink.sum(axis=1); ys = np.where(prof_y > 0)[0]; ya, yb = ys[0], ys[-1]
    ycuts = [ya] + [int(ya+(yb-ya)*k/rows)-60+int(np.argmin(prof_y[int(ya+(yb-ya)*k/rows)-60:int(ya+(yb-ya)*k/rows)+60])) for k in range(1, rows)] + [yb+1]
    for (y0, y1), n in zip(zip(ycuts, ycuts[1:]), cols_per_row):
        prof = ink[y0:y1].sum(axis=0); xs = np.where(prof > 0)[0]; xa, xb = xs[0], xs[-1]
        cuts = [xa]
        for k in range(1, n):
            e = int(xa+(xb-xa)*k/n); cuts.append(e-60+int(np.argmin(prof[e-60:e+60])))
        cuts.append(xb+1)
        for a_, b_ in zip(cuts, cuts[1:]):
            sub = ink[y0:y1, a_:b_]; cx = np.where(sub.any(axis=0))[0]; cy = np.where(sub.any(axis=1))[0]
            c = im.crop((a_+cx[0]-3, y0+cy[0]-3, a_+cx[-1]+4, y0+cy[-1]+4)).convert('RGBA'); w, h = c.size
            for s in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]:
                if c.getpixel(s)[3] and min(c.getpixel(s)[:3]) > 225: ImageDraw.floodfill(c, s, (255,255,255,0), thresh=38)
            out.append(c)
    return out
b = Image.open(src/'chars_b.png').convert('RGB')
# The Indian pupil was drawn with a forehead mark; paint it out with the surrounding skin colour (no religious markers).
px = b.load(); skin = px[757, 205]; ImageDraw.Draw(b).ellipse((748, 178, 766, 196), fill=skin)
names = ['taiwan','japan','usa','uk','spain']; 
for n, c in zip(names, cut(Image.open(src/'chars_a.png'), 1, [5])): c.save(root/'art'/'chars'/f'{n}.png')
for n, c in zip(['egypt','kenya','india','singapore','australia'], cut(b, 1, [5])): c.save(root/'art'/'chars'/f'{n}.png')
for n, c in zip(['plane','ship','train','boy','girl','passport'], cut(Image.open(src/'travel_sheet.png'), 2, [3,3])):
    c.thumbnail((520, 520)); c.save(root/'art'/f'{n}.png')
Image.open(src/'world_map.png').convert('RGB').save(root/'art'/'world_map.jpg', quality=90)
# contact sheet for checking
ch = [Image.open(root/'art'/'chars'/f'{n}.png') for n in names+['egypt','kenya','india','singapore','australia']]
sheet = Image.new('RGB', (10*220, 520), 'white')
for i, c in enumerate(ch):
    t = c.copy(); t.thumbnail((210, 500)); sheet.paste(t, (i*220+5, 10), t)
sheet.save(root/'art'/'source'/'_chars_check.jpg')
