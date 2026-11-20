"""Render all puzzle cards (6 types x 2 answers x 4 stages) to PNG with Playwright."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parent.parent
html = (root/'src'/'cards.html').as_uri()
TYPES = ['mirror','shape','homo','seg','utopia','keypad']
ANS = sys.argv[1:] or ['0315','1645']
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1600,'height':900})
    for a in ANS:
        out = root/'out'/a; out.mkdir(parents=True, exist_ok=True)
        for i,t in enumerate(TYPES,1):
            for s in ['puzzle','hint1','hint2','answer']:
                pg.goto(f'{html}?type={t}&ans={a}&stage={s}'); pg.wait_for_timeout(250)
                pg.screenshot(path=str(out/f'{i}-{t}-{s}.png'))
    b.close()
print('done')
