"""mouth9.py — Ken 對嘴立牌：把 Codex 張嘴圖對齊原圖（找位移＋縮放），只把嘴巴那一小塊（羽化橢圓）貼回原圖，
再用原圖的去背遮罩和裁切範圍輸出 props/stand-ken-<嘴形>.png（和 props/stand-ken.png 尺寸完全一樣，切換時不會跳）。
老師規則：嘴巴不用程式畫，用模型畫的張嘴版貼回。用法：python -I mouth9.py
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove

HERE = pathlib.Path(__file__).resolve().parent
base = Image.open(HERE / 'refs' / 'stand-ken.png').convert('RGB')
B = np.asarray(base, np.float32)
EYES = (440, 225, 600, 300)      # 對齊用：眉毛＋眼睛（原圖座標）
MC, MR = (514, 323), (64, 40)    # 嘴巴橢圓中心、半徑（原圖座標）


def align(v):
    """在 ±24 px、縮放 0.96–1.04 裡找跟原圖眼睛最像的位置；回傳對齊後的整張圖。"""
    best = None
    ref = B[EYES[1]:EYES[3], EYES[0]:EYES[2]]
    for s in np.arange(0.96, 1.041, 0.01):
        w, h = round(v.width * s), round(v.height * s); vs = np.asarray(v.resize((w, h), Image.LANCZOS), np.float32)
        cx, cy = 512 * s, 300 * s   # 以臉中心縮放
        for dy in range(-24, 25, 2):
            for dx in range(-24, 25, 2):
                ox, oy = round(cx - 512 + dx), round(cy - 300 + dy)
                y0, x0 = EYES[1] + oy, EYES[0] + ox
                if y0 < 0 or x0 < 0: continue
                d = ((vs[y0:y0 + ref.shape[0], x0:x0 + ref.shape[1]] - ref) ** 2).mean()
                if best is None or d < best[0]: best = (d, s, ox, oy)
    d, s, ox, oy = best
    # 細調 ±1
    vs = v.resize((round(v.width * s), round(v.height * s)), Image.LANCZOS)
    out = Image.new('RGB', base.size, 'white'); out.paste(vs, (-ox, -oy))
    return out, best


cut = remove(base.convert('RGBA'))
alpha = cut.split()[3].point(lambda a: 255 if a > 24 else 0)
bbox = alpha.getbbox()
mask = Image.new('L', base.size, 0)
ImageDraw.Draw(mask).ellipse((MC[0] - MR[0], MC[1] - MR[1], MC[0] + MR[0], MC[1] + MR[1]), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(9))
sheet = Image.new('RGB', (4 * 300, 260), 'white')
for k, nm in enumerate(['closed', 'small', 'open', 'round']):
    if nm == 'closed': img = base.copy()
    else:
        v, info = align(Image.open(HERE / 'refs' / f'mouth-ken-{nm}.png').convert('RGB'))
        print(nm, 'diff %.1f scale %.2f dx %d dy %d' % info)
        img = base.copy(); img.paste(v, (0, 0), mask)
    rgba = img.convert('RGBA'); rgba.putalpha(cut.split()[3])
    rgba.crop(bbox).save(HERE / 'props' / f'stand-ken-{nm}.png')
    sheet.paste(img.crop((414, 190, 614, 400)).resize((300, 260)), (k * 300, 0))
sheet.save(HERE / 'qa' / 'mouth-patch-check.jpg', quality=90); print('ok', bbox)
