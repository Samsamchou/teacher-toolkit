"""Render Safari Count puzzle cards (each answer x 4 stages) to out/<ANS>/ with Playwright.
python src/render.py PANDA BEARS        (no arguments = all 12 answers)
python src/render.py --v2 [KOALA ...]   version 2 cards (teacher 11/27) to out2/<ANS>/
Fails (exit 1) on any page error, console error or missing image."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ALL = ['PANDA', 'BEARS', 'LIONS', 'HORSES', 'ZEBRAS', 'RHINO', 'TIGERS', 'MONKEYS', 'ELEPHANTS', 'TURTLES', 'KOALAS', 'LION']
ALL2 = ['KOALA', 'ELEPHANTS', 'RHINOS', 'TIGER', 'LIONS', 'MONKEYS', 'TURTLES', 'BEAR', 'PANDAS', 'TIGERS', 'ZEBRAS', 'HORSES']
root = Path(__file__).resolve().parent.parent
html = (root / 'src' / 'cards.html').as_uri()
v2 = '--v2' in sys.argv
args = [a for a in sys.argv[1:] if a != '--v2'] or (ALL2 if v2 else ALL)
outdir, q = (root / 'out2', '&v=2') if v2 else (root / 'out', '')
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
        # anything wider or taller than the 1600x900 card means the puzzle does not fit
        over = pg.evaluate('(()=>{const c=document.getElementById("card").getBoundingClientRect();return [...document.querySelectorAll("#card *")].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>c.right+1||r.bottom>c.bottom+1)}).length})()')
        if over: errors.append(f'overflow: {url} ({over} elements outside the card)')
        pg.screenshot(path=str(path))
    for a in args:
        out = outdir / a; out.mkdir(parents=True, exist_ok=True)
        for s in ['puzzle', 'hint1', 'hint2', 'answer']:
            shot(f'{html}?ans={a}&stage={s}{q}', out / f'{a}-{s}.png')
        print('rendered', a)
    b.close()
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('done, 0 errors')
