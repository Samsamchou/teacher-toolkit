"""Tile the first frame of each shot folder in a qa/<time>/tout run into one sheet.jpg (2 columns).  python tabletop/src/sheet4.py <qa run dir>"""
import sys
from pathlib import Path
from PIL import Image
run = Path(sys.argv[1]); shots = sorted(d for d in (run / 'tout').iterdir() if d.is_dir())
ims = [Image.open(sorted(d.glob('f*.png'))[0]).convert('RGB') for d in shots]
w, h = ims[0].size; S = Image.new('RGB', (w * 2, h * ((len(ims) + 1) // 2)))
for i, im in enumerate(ims): S.paste(im, ((i % 2) * w, (i // 2) * h))
S.save(run / 'sheet.jpg', quality=88); print(run / 'sheet.jpg')
