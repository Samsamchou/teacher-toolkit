# 封面、封底：Codex CLI 生成的背景（無字）＋程式排版英文字（Comic Relief）。輸出 1920×1080 PNG。
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

R = Path(__file__).resolve().parent
FONTS = R.parents[2] / 'HWG 7 U02 CLIPS/114 句型情境/Six_Friends_20260914/postproduction/fonts'
F = lambda n, b=True: ImageFont.truetype(str(FONTS / ('ComicRelief-Bold.ttf' if b else 'ComicRelief-Regular.ttf')), n)
W, H = 1920, 1080

cover = ImageOps.fit(Image.open(R / 'assets/cover_raw_V01.png').convert('RGB'), (W, H), method=Image.Resampling.LANCZOS)
d = ImageDraw.Draw(cover)
d.text((W // 2, 70), 'Where Are You Going?', font=F(118), fill='#154c61', anchor='mt', stroke_width=6, stroke_fill='white')
d.text((W // 2, 215), 'A Trip to Ershui', font=F(58), fill='#1d6b58', anchor='mt', stroke_width=4, stroke_fill='white')
cover.save(R / 'HWG5U03_Cover_V01.png')

ending = ImageOps.fit(Image.open(R / 'assets/ending_raw_V01.png').convert('RGB'), (W, H), method=Image.Resampling.LANCZOS)
d = ImageDraw.Draw(ending)
rows = [('Where are you going?', 66, True, '#164c60', 150), ("I'm going to the park.", 60, False, '#174c50', 245),
        ("Where's the park?", 66, True, '#164c60', 400), ("It's on Yuan Ji Road.", 60, False, '#174c50', 495),
        ("Let's go together!", 54, True, '#c0582b', 690)]
for text, size, bold, color, y in rows:
    d.text((110, y), text, font=F(size, bold), fill=color)
ending.save(R / 'HWG5U03_Ending_V01.png')
print('ok')
