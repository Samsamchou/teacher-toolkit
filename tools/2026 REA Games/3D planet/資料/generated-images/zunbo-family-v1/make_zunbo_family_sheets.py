# 圳寶媽媽／機車 三款候選對照表（A／B／C 並排，白底大字標籤）
import os
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__))
FT = os.path.normpath(os.path.join(D, "..", "..", "freetime"))
S, PAD, TOP = 800, 40, 150
try: font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 110)
except OSError: font = ImageFont.load_default()
for stem, name in (("mom", "zunbo-mom-candidates-v1.png"), ("scooter", "scooter-candidates-v1.png")):
    sheet = Image.new("RGB", (PAD + 3 * (S + PAD), TOP + S + PAD), "white")
    dr = ImageDraw.Draw(sheet)
    for i, L in enumerate("ABC"):
        im = Image.open(os.path.join(D, f"{stem}_{L}.png")).convert("RGB")
        im.thumbnail((S, S))
        x = PAD + i * (S + PAD)
        sheet.paste(im, (x + (S - im.width) // 2, TOP + (S - im.height) // 2))
        w = dr.textlength(L, font=font)
        dr.text((x + (S - w) / 2, 15), L, fill="black", font=font)
    out = os.path.join(FT, name); sheet.save(out); print("saved", out, sheet.size)
