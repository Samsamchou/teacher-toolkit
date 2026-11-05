"""qasheet.py — 把 qa/ 裡某個前綴的抽格拼成一張總表 / contact sheet of QA stills
用法: python -I qasheet.py <qa資料夾> <前綴> <輸出.jpg> [欄數]"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, pre, out = sys.argv[1:4]; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 3
fs = sorted(glob.glob(os.path.join(d, pre + '*.png')))
if not fs: sys.exit('no stills')
W, H = 640, 360; rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (W * cols, H * rows)); fnt = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((W, H)); dr = ImageDraw.Draw(im); lab = os.path.basename(f)[len(pre):-4]
    dr.rectangle([0, 0, 100, 30], fill='black'); dr.text((6, 4), lab, fill='yellow', font=fnt); S.paste(im, ((i % cols) * W, (i // cols) * H))
S.save(out, quality=88); print(out, len(fs))
