"""cut_ride.py — 把 refs/ride-*.png（Codex 白底騎乘姿勢）去背、裁到人物邊界，存成 props/ride-*.png（紙片立牌用）。
用法：python -I cut_ride.py yuki kai
"""
import sys, pathlib
from PIL import Image
from rembg import remove

HERE = pathlib.Path(__file__).resolve().parent
for nm in sys.argv[1:]:
    im = Image.open(HERE / 'refs' / f'ride-{nm}.png').convert('RGBA')
    cut = remove(im)
    a = cut.split()[3].point(lambda v: 255 if v > 24 else 0)
    cut = cut.crop(a.getbbox())
    cut.save(HERE / 'props' / f'ride-{nm}.png')
    print(nm, cut.size)
