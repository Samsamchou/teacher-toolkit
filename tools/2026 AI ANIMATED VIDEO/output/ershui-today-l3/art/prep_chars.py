"""prep_chars.py — 把核准透明角色 PNG 裁到角色範圍、縮到高 900 px，存 art/chars/<編號>.png（畫面程式用）。
記錄 chars.json：每張寬高（腳底＝圖片底邊）。用法：python -I prep_chars.py
"""
import json, pathlib
from PIL import Image

ART = pathlib.Path(__file__).resolve().parent
CH = pathlib.Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui\共用視覺資產\二水在地課程角色組_20260903")
NEED = ["13", "14", "15", "18", "19", "20", "21", "22", "23", "28", "29", "30", "33", "34", "36", "37", "38"]
out = ART / "chars"; out.mkdir(exist_ok=True); meta = {}
for n in NEED:
    p = next((CH / "05_追加姿勢_20260904").glob(f"{n}_*.png"))
    if "16x9" in p.name: p = next(q for q in (CH / "05_追加姿勢_20260904").glob(f"{n}_*.png") if "16x9" not in q.name)
    im = Image.open(p).convert("RGBA"); im = im.crop(im.getchannel("A").getbbox())
    h = 900; im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    im.save(out / f"{n}.png"); meta[n] = dict(name=p.stem, w=im.width, h=im.height); print(n, p.stem, im.size)
(ART / "chars.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
