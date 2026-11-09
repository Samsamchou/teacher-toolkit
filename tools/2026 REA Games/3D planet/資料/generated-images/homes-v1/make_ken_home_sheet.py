# Ken 的家三款候選對照表（A／B／C 並排，白底大字標籤）
import os
from PIL import Image, ImageDraw, ImageFont
D = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\generated-images\homes-v1"
OUT = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\freetime\ken-home-exterior-candidates-v1.png"
S, PAD, TOP = 800, 40, 150
sheet = Image.new("RGB", (PAD + 3 * (S + PAD), TOP + S + PAD), "white")
dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 110)
except OSError: font = ImageFont.load_default()
for i, L in enumerate("ABC"):
    im = Image.open(os.path.join(D, f"ken_home_{L}.png")).convert("RGB")
    im.thumbnail((S, S))
    x = PAD + i * (S + PAD)
    sheet.paste(im, (x + (S - im.width) // 2, TOP + (S - im.height) // 2))
    w = dr.textlength(L, font=font)
    dr.text((x + (S - w) / 2, 15), L, fill="black", font=font)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sheet.save(OUT)
print("saved", OUT, sheet.size)
