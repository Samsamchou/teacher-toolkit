"""cutout.py：綠幕去背（v2，11/13）。只去掉「接近純綠 #00FF00」的像素，
角色身上的綠色（水鈴的綠裙、圳寶的青綠外殼）不會被吃掉。
用法：python src/cutout.py <輸入.png> <輸出.png>
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
dist = np.sqrt(r ** 2 + (255 - g) ** 2 + b ** 2)          # 離純綠多遠
alpha = np.clip((dist - 70) / 90.0, 0, 1)
# 邊緣去綠溢色：只處理半透明邊緣、而且綠色明顯偏高的像素
spill = (alpha < 0.98) & (g > np.maximum(r, b))
g2 = np.where(spill, np.maximum(r, b) + (g - np.maximum(r, b)) * 0.25, g)
out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
im = Image.fromarray(out, "RGBA")
bbox = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
im.crop(bbox).save(dst)
print("saved", dst, im.crop(bbox).size)
