"""逐句抽格：每句取 6 個時間點，拼成 qa/<key>_sheet.jpg 與 qa/_all.jpg。

  python scripts/qa_sheet.py            # 所有已做好的句子
  python scripts/qa_sheet.py mom_1      # 指定句子
"""
import base64, io, sys
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / "qa"; QA.mkdir(exist_ok=True)


def main(keys):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1700, "height": 1100})
        pg.add_init_script("window.EXPORT_MODE = true;")
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto((ROOT / "index.html").as_uri())
        pg.evaluate("document.fonts.load('58px \"Comic Relief\"')")
        pg.wait_for_timeout(800)
        sents = pg.evaluate("SENT.map(s => s.key)")
        rows = []
        for i, k in enumerate(sents):
            if keys and k not in keys:
                continue
            tm = pg.evaluate(f"timingOf({i})")
            ts = [tm["tTarget"] + .4, tm["tB"] + .8, tm["tB"] + 2, tm["tB"] + 3.5, tm["tB"] + 5, tm["end"] - .3]
            frames = []
            for T in ts:
                url = pg.evaluate(f"(renderAt({i},{T}), document.getElementById('stage').toDataURL('image/jpeg', .85))")
                im = Image.open(io.BytesIO(base64.b64decode(url.split(",")[1]))).resize((480, 270))
                ImageDraw.Draw(im).text((8, 8), f"{k} T={T:.1f}", fill="white")
                frames.append(im)
            sheet = Image.new("RGB", (480 * 3, 270 * 2))
            for j, im in enumerate(frames):
                sheet.paste(im, ((j % 3) * 480, (j // 3) * 270))
            sheet.save(QA / f"{k}_sheet.jpg", quality=85)
            rows.append(sheet)
            print(k, "ok", flush=True)
        b.close()
        if errs:
            print("PAGE ERRORS:", errs[:5])
        if rows:
            allim = Image.new("RGB", (rows[0].width, sum(r.height for r in rows)))
            y = 0
            for r in rows:
                allim.paste(r, (0, y)); y += r.height
            allim.save(QA / "_all.jpg", quality=80)


if __name__ == "__main__":
    main(sys.argv[1:])
