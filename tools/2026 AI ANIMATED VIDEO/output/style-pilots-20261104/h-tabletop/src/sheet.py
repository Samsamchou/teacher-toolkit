import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
fs = sorted(glob.glob(os.path.join(d, "f*.png")))
W, H = 640, 360; rows = (len(fs) + cols - 1) // cols
S = Image.new("RGB", (W * cols, H * rows)); fnt = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
for i, p in enumerate(fs):
    fr = int(os.path.basename(p)[1:5]); im = Image.open(p).convert("RGB").resize((W, H)); dr = ImageDraw.Draw(im)
    dr.rectangle([0, 0, 120, 28], fill="black"); dr.text((6, 4), f"{fr/24:.2f}s f{fr}", fill="yellow", font=fnt)
    S.paste(im, ((i % cols) * W, (i // cols) * H))
S.save(out, quality=88)
