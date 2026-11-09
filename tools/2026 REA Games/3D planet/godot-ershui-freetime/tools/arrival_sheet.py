"""把 test_arr_*.png（每站抵達畫面）排成檢查表 arrival_checklist.png，每格標地點名。
用法：python -I tools/arrival_sheet.py
"""
import glob
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
names = {p["id"]: p["zh"] for p in json.load(open(os.path.join(HERE, "data", "map.json"), encoding="utf-8"))["places"]}
PRE = sys.argv[1] if len(sys.argv) > 1 else "arr"   # arr＝抵達畫面；face＝押注畫面
files = sorted(glob.glob(os.path.join(HERE, "test_%s_*.png" % PRE)))
W, H, C = 480, 270, 4
rows = (len(files) + C - 1) // C
sheet = Image.new("RGB", (W * C, (H + 30) * rows), "white")
try:
    font = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 22)
except OSError:
    font = ImageFont.load_default()
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    pid = os.path.basename(f)[len("test_%s_" % PRE):-4]
    x, y = (i % C) * W, (i // C) * (H + 30)
    sheet.paste(Image.open(f).convert("RGB").resize((W, H)), (x, y + 30))
    d.text((x + 6, y + 3), "%d. %s (%s)" % (i + 1, names.get(pid, pid), pid), fill="black", font=font)
out = os.path.join(HERE, "arrival_checklist.png" if PRE == "arr" else "%s_checklist.png" % PRE)
sheet.save(out)
print(out, len(files))
