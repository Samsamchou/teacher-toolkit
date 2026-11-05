"""make_review6.py — 影片 6 插圖總表（art-review-v1.jpg）。"""
import pathlib, sys
from PIL import Image, ImageDraw, ImageFont
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE))
from script_v1 import KIDS
A = HERE / 'art'; F = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 30)
kids = [(f'kid-{n.lower()}', f'{n}｜{c} {z}｜{m}') for n, p, c, z, m in KIDS]
scenes = [('scene-photowall', '對話 1 教室照片牆'), ('scene-intlday', '對話 2 國際日'), ('scene-videocall', '對話 3 平板視訊')]
W = 5 * 400; img = Image.new('RGB', (W, 2 * 450 + 400), 'white'); d = ImageDraw.Draw(img)
for i, (k, cap) in enumerate(kids):
    t = Image.open(A / f'{k}.png').convert('RGB'); t.thumbnail((390, 390)); x, y = (i % 5) * 400, (i // 5) * 450
    img.paste(t, (x + 5, y + 5)); d.text((x + 8, y + 400), cap, fill='black', font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 20))
for i, (k, cap) in enumerate(scenes):
    t = Image.open(A / f'{k}.png').convert('RGB'); t.thumbnail((660, 360)); x, y = i * 666, 905
    img.paste(t, (x + 3, y)); d.text((x + 8, y + t.height - 40), cap, fill='white', font=F, stroke_width=3, stroke_fill='black')
img.save(HERE / 'art-review-v1.jpg', quality=88); print(img.size)
