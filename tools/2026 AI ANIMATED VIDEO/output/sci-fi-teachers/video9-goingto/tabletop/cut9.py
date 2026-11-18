"""cut9.py — 把 refs/<名稱>.png（Codex 白底）去背、裁到邊界，存成 props/<名稱>.png（立牌用）或 cards/<名稱>.png（字卡圖）。
用法：python -I cut9.py stand-ken wx-sunny ...
"""
import sys, pathlib
from PIL import Image
from rembg import remove

HERE = pathlib.Path(__file__).resolve().parent
for nm in sys.argv[1:]:
    im = Image.open(HERE / 'refs' / f'{nm}.png').convert('RGBA')
    cut = remove(im)
    a = cut.split()[3].point(lambda v: 255 if v > 24 else 0)
    cut = cut.crop(a.getbbox())
    out = HERE / ('props' if nm.startswith('stand-') else 'cards'); out.mkdir(exist_ok=True)
    cut.save(out / f'{nm}.png'); print(nm, cut.size)
