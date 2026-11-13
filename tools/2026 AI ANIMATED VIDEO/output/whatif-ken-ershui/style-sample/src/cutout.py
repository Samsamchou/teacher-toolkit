import sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
r, g, b = a[...,0], a[...,1], a[...,2]
# green dominance -> alpha
d = g - np.maximum(r, b)
alpha = np.clip(1.0 - (d - 40) / 60.0, 0, 1)
# despill: clamp green to max(r,b) on edges
g2 = np.where(d > 0, np.maximum(r, b) + 0.3 * np.clip(d, 0, None) * alpha, g)
out = np.dstack([r, np.minimum(g, g2), b, alpha * 255]).clip(0, 255).astype(np.uint8)
im = Image.fromarray(out, "RGBA")
bbox = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
im.crop(bbox).save(dst)
print("saved", dst, im.crop(bbox).size)
