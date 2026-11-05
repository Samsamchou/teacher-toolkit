"""key_green.py — 把 talk-art/ 綠背景角色圖去背：輸出 talk-art/cut/<id>.png（透明背景、裁到角色範圍）與 cut/cut.json（尺寸與腳底位置）。
綠色判斷：g 明顯高於 r、b 的像素視為背景；邊緣半透明並去綠邊（despill）。用法：python -I key_green.py [id ...]
"""
import sys, json, pathlib
import numpy as np
from PIL import Image, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'talk-art'; OUT = SRC / 'cut'; OUT.mkdir(exist_ok=True)

def key(im):
    a = np.asarray(im.convert('RGB'), np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)                       # 綠色多出來的量
    alpha = np.clip(1 - (spill - 40) / 60, 0, 1)        # >100 全透明、<40 全不透明
    m = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.8))
    alpha = np.asarray(m, np.float32) / 255
    g2 = np.where(spill > 0, np.maximum(r, b) + spill * .15, g)   # 去綠邊
    out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

if __name__ == '__main__':
    ids = sys.argv[1:] or [p.stem for p in SRC.glob('*.png') if p.stem.startswith(('sheet-', 'amy-', 'ben-'))]
    meta = json.loads((OUT / 'cut.json').read_text(encoding='utf-8')) if (OUT / 'cut.json').exists() else {}
    for k in ids:
        im = key(Image.open(SRC / f'{k}.png'))
        bb = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        im = im.crop((max(0, bb[0] - 8), max(0, bb[1] - 8), min(im.width, bb[2] + 8), min(im.height, bb[3] + 8)))
        im.save(OUT / f'{k}.png')
        meta[k] = {'size': im.size, 'foot': [im.width // 2, im.height - 8]}
        print(k, im.size)
    (OUT / 'cut.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')
