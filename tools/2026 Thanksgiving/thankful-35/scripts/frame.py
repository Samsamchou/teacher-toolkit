"""抽單格大圖檢查：python scripts/frame.py mom_1:2.0 mom_2:4 ...（數字 = because 之後幾秒）→ qa/frame_<key>_<u>.png"""
import base64, io, sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1700, "height": 1100})
    pg.add_init_script("window.EXPORT_MODE = true;"); pg.goto((ROOT / "index.html").as_uri())
    pg.evaluate("document.fonts.load('58px \"Comic Relief\"')"); pg.wait_for_timeout(800)
    keys = pg.evaluate("SENT.map(s => s.key)")
    for arg in sys.argv[1:]:
        k, u = arg.split(":"); i = keys.index(k)
        T = pg.evaluate(f"timingOf({i}).tB") + float(u)
        url = pg.evaluate(f"(renderAt({i},{T}), document.getElementById('stage').toDataURL('image/png'))")
        im = Image.open(io.BytesIO(base64.b64decode(url.split(",")[1]))).resize((800, 450))
        out = ROOT / "qa" / f"frame_{k}_{u}.png"; im.save(out); print(out.name)
    b.close()
