"""render.py — 畫風 K 頁面逐格截圖（頁面提供 window.READY、window.DUR、window.renderFrame(t)）。
自帶本機 http 伺服器，根目錄＝2026 Christmas/。
  python -I render.py sample.html --query shot=forest --still 1.0
  python -I render.py sample.html --query shot=forest --fps 24 [--t0 0 --t1 4] [--audio a.wav]
"""
import argparse, subprocess, sys, pathlib, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('page'); ap.add_argument('--fps', type=int, default=24); ap.add_argument('--still', type=float)
ap.add_argument('--query', default=''); ap.add_argument('--out'); ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float)
ap.add_argument('--audio')
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent
root = here.parent
rend = root / 'renders'; rend.mkdir(exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root))); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
rel = (here / a.page).relative_to(root).as_posix()
url = f'http://127.0.0.1:{port}/{rel}' + (('?' + a.query) if a.query else '')
stem = pathlib.Path(a.page).stem + (('-' + a.query.replace('=', '').replace('&', '-')) if a.query else '')
code = 0
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=d3d11', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type in ('error', 'warning') and print(m.type, m.text[:300]))
    pg.goto(url)
    for _ in range(240):
        if errs: break
        if pg.evaluate('window.READY===true'): break
        pg.wait_for_timeout(500)
    if errs or not pg.evaluate('window.READY===true'):
        print('FAILED', errs[:3]); b.close(); srv.shutdown(); sys.exit(1)
    if a.still is not None:
        f = pathlib.Path(a.out) if a.out else rend / f'{stem}-still-{a.still:.2f}.png'
        pg.evaluate(f'renderFrame({a.still})'); pg.evaluate(f'renderFrame({a.still})')
        pg.locator('#wrap').screenshot(path=str(f)); print(f)
    else:
        t1 = a.t1 if a.t1 is not None else pg.evaluate('window.DUR')
        silent = rend / f'{stem}-silent.mp4'
        ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(a.fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', str(silent)], stdin=subprocess.PIPE)
        n = round((t1 - a.t0) * a.fps)
        for i in range(n):
            pg.evaluate(f'renderFrame({a.t0 + i / a.fps})')
            ff.stdin.write(pg.locator('#wrap').screenshot(type='jpeg', quality=94))
            if errs: print('pageerror', errs[0]); code = 1; break
        ff.stdin.close(); ff.wait()
        final = pathlib.Path(a.out) if a.out else rend / f'{stem}.mp4'
        if a.audio:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', a.audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', str(final)], check=True)
        else:
            silent.replace(final)
        print(final, n, 'frames')
    b.close()
srv.shutdown(); sys.exit(code)
