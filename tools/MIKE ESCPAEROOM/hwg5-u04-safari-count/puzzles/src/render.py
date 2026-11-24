"""Render Safari Count puzzle cards (each answer x 4 stages) to out/<ANS>/ with Playwright.
python src/render.py PANDA BEARS"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parent.parent
html = (root / 'src' / 'cards.html').as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1600, 'height': 900})
    for a in sys.argv[1:]:
        out = root / 'out' / a; out.mkdir(parents=True, exist_ok=True)
        for s in ['puzzle', 'hint1', 'hint2', 'answer']:
            pg.goto(f'{html}?ans={a}&stage={s}'); pg.wait_for_timeout(300); pg.screenshot(path=str(out / f'{a}-{s}.png'))
    b.close()
print('done')
