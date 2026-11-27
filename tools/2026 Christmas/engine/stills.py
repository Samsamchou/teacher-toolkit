"""stills.py — 一次開瀏覽器抽多張靜態圖，拼成總表（檢查用）。
Render several stills in one browser session and tile them into a contact sheet.
  python -X utf8 stills.py s06 20.9 21.8 22.3 --out ../renders/chk-s06.jpg [--clean] [--w 640]
"""
import argparse, sys, pathlib, threading, functools, http.server, socketserver, io
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('scene'); ap.add_argument('times', nargs='+', type=float)
ap.add_argument('--out', required=True); ap.add_argument('--clean', action='store_true'); ap.add_argument('--w', type=int, default=640)
ap.add_argument('--cols', type=int, default=4); ap.add_argument('--full', help='同時存原尺寸 PNG 的資料夾 / also save full-size PNGs here')
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent; root = here.parent

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root))); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{port}/engine/film.html?scene={a.scene}' + ('&clean=1' if a.clean else '')
ims = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=d3d11', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    for _ in range(240):
        if errs or pg.evaluate('window.READY===true'): break
        pg.wait_for_timeout(500)
    if errs: print('FAILED', errs[:3]); sys.exit(1)
    for t in a.times:
        pg.evaluate(f'renderFrame({t})'); pg.evaluate(f'renderFrame({t})')
        png = pg.locator('#wrap').screenshot()
        im = Image.open(io.BytesIO(png)).convert('RGB')
        if a.full:
            fd = pathlib.Path(a.full); fd.mkdir(parents=True, exist_ok=True); im.save(fd / f'{a.scene}-{t:.2f}.png')
        im = im.resize((a.w, a.w * 9 // 16)); d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 70, 22], fill=(0, 0, 0)); d.text((4, 4), f'{t:.2f}', fill=(255, 255, 0))
        ims.append(im)
        if errs: print('pageerror', errs[0]); break
    b.close()
srv.shutdown()
cols = min(a.cols, len(ims)); rows = (len(ims) + cols - 1) // cols; w, h = ims[0].size
S = Image.new('RGB', (w * cols, h * rows))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(a.out, quality=90); print(a.out, len(ims))
