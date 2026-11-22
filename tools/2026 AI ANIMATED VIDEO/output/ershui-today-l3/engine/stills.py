"""stills.py T1 T2 ... [--nosub] [--tag name] — 一次開瀏覽器輸出多張單格，並拼成總表 contact-<tag>.jpg"""
import sys, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
here = pathlib.Path(__file__).resolve().parent; ROOT = here.parent
args = [a for a in sys.argv[1:]]; nosub = '--nosub' in args; tag = 'stills'
if '--tag' in args: i = args.index('--tag'); tag = args[i + 1]; del args[i:i + 2]
ts = [float(a) for a in args if not a.startswith('--')]
out = ROOT / 'qa' / tag; out.mkdir(parents=True, exist_ok=True)
files = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=d3d11'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto((here / 'player.html').as_uri() + ('?nosub=1' if nosub else '')); pg.wait_for_function('window.READY===true', timeout=120000)
    for t in ts:
        f = out / f'{t:07.2f}.png'; pg.evaluate(f'renderFrame({t})'); pg.locator('#cv').screenshot(path=str(f)); files.append((t, f))
    b.close()
cols = 3; tw, th = 640, 360; rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 30)), 'white'); d = ImageDraw.Draw(sheet)
for k, (t, f) in enumerate(files):
    x, y = (k % cols) * tw, (k // cols) * (th + 30)
    sheet.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, y + 30)); d.text((x + 6, y + 8), f't = {t:.2f}s', fill='black')
sheet.save(out.parent / f'contact-{tag}.jpg', quality=88); print(out.parent / f'contact-{tag}.jpg')
