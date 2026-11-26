"""Render Safari Count puzzle cards (each answer x 4 stages) to out/<ANS>/ with Playwright.
python src/render.py PANDA BEARS        (no arguments = all 12 answers)
Fails (exit 1) on any page error, console error or missing image."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ALL = ['PANDA', 'BEARS', 'LIONS', 'HORSES', 'ZEBRAS', 'RHINO', 'TIGERS', 'MONKEYS', 'ELEPHANTS', 'TURTLES', 'KOALAS', 'LION']
root = Path(__file__).resolve().parent.parent
html = (root / 'src' / 'cards.html').as_uri()
args = sys.argv[1:] or ALL
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1600, 'height': 900})
    pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    pg.on('console', lambda m: m.type == 'error' and errors.append(f'console: {m.text}'))
    pg.on('requestfailed', lambda r: errors.append(f'missing: {r.url}'))
    def shot(url, path):
        pg.goto(url); pg.wait_for_function('window.READY === true', timeout=15000)
        bad = pg.evaluate('[...document.images].filter(i => !i.naturalWidth).map(i => i.src)')
        errors.extend(f'broken image: {u}' for u in bad)
        pg.screenshot(path=str(path))
    for a in args:
        out = root / 'out' / a; out.mkdir(parents=True, exist_ok=True)
        for s in ['puzzle', 'hint1', 'hint2', 'answer']:
            shot(f'{html}?ans={a}&stage={s}', out / f'{a}-{s}.png')
        print('rendered', a)
    b.close()
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('done, 0 errors')
