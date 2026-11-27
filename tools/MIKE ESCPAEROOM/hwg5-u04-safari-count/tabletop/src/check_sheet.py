"""Check sheet for the teacher: one row per shot (frames side by side, labelled), 640x360 tiles.
  python tabletop/src/check_sheet.py <out.jpg> <run dir> SHOT [SHOT ...]   e.g. qa/v2_check1_taiwan.jpg qa/1127-182218 TV1 TV2 TV1S TV2S"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out, run, shots = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3:]
TW, TH = 640, 360
rows = []
for s in shots:
    d = run / s if (run / s).exists() else run / 'tout' / s
    rows.append((s, sorted(d.glob('f*.png'))))
cols = max(len(f) for _, f in rows)
sheet = Image.new('RGB', (cols * TW, len(rows) * (TH + 34)), '#2b2140'); dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype(str(Path.home() / 'AppData/Local/Microsoft/Windows/Fonts/ComicRelief-Bold.ttf'), 24)
except OSError: font = ImageFont.load_default()
for r, (s, fs) in enumerate(rows):
    for c, f in enumerate(fs):
        x, y = c * TW, r * (TH + 34)
        dr.text((x + 10, y + 4), f'{s}  frame {int(f.stem[1:])} ({int(f.stem[1:]) / 24:.1f} s)', fill='white', font=font)
        sheet.paste(Image.open(f).convert('RGB').resize((TW, TH)), (x, y + 34))
sheet.save(out, quality=88); print(out)
