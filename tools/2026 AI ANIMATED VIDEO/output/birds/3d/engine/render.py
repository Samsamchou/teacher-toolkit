"""render.py（Birds，從 Stand Out Fit In v3 render3d.py 改） — 3D 頁面逐格截圖成 MP4（頁面要提供 window.READY、window.DUR、window.SONG0、async window.renderFrame(t)）。
自帶本機 http 伺服器（根目錄＝output/，Three.js 模組與 GLB 才載得進來）。
用法:
  python -I render.py player.html --query scene=s01 --still 1.5              # 單格 PNG（本地秒）
  python -I render.py player.html --query scene=s01 --fps 24 [--nosong]      # 全段 MP4（配原曲同一段）
"""
import argparse, subprocess, sys, pathlib, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('page'); ap.add_argument('--fps', type=int, default=24); ap.add_argument('--still', type=float); ap.add_argument('--stills', default='')
ap.add_argument('--nosong', action='store_true'); ap.add_argument('--out'); ap.add_argument('--query', default='')
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent
outroot = here.parents[2]                      # .../output
song = here.parents[1] / 'sources' / 'birds.mp3'
rend = here.parent / 'renders'; rend.mkdir(exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
Handler = functools.partial(Quiet, directory=str(outroot))
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
rel = (here / a.page).relative_to(outroot).as_posix()
url = f'http://127.0.0.1:{port}/{rel}' + (('?' + a.query) if a.query else '')
stem = pathlib.Path(a.page).stem + (('-' + a.query.replace('=', '').replace('&', '-')) if a.query else '')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=d3d11', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('pageerror:', e)); pg.on('console', lambda m: m.type in ('error', 'warning') and print(m.type, m.text))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    for _ in range(240):
        if errs: print('pageerror(stop):', errs[0]); b.close(); srv.shutdown(); sys.exit(1)
        if pg.evaluate('window.READY===true'): break
        pg.wait_for_timeout(500)
    else: print('timeout'); b.close(); srv.shutdown(); sys.exit(1)
    dur = pg.evaluate('window.DUR'); song0 = pg.evaluate('window.SONG0')
    if a.stills:   # 一次抽多格（本地秒，逗號分隔）/ several stills in one page load
        qa = rend / 'qa'; qa.mkdir(exist_ok=True)
        for x in a.stills.split(','):
            f = qa / f'{stem}-{float(x):06.2f}.png'; pg.evaluate(f'renderFrame({float(x)})'); pg.locator('#wrap').screenshot(path=str(f)); print(f)
        b.close(); srv.shutdown(); sys.exit()
    if a.still is not None:
        f = rend / f'{stem}-still-{a.still:.2f}.png'
        pg.evaluate(f'renderFrame({a.still})'); pg.locator('#wrap').screenshot(path=str(f)); print(f); b.close(); srv.shutdown(); sys.exit()
    f0, f1 = round(song0 * a.fps), round((song0 + dur) * a.fps)
    silent = rend / f'{stem}-silent.mp4'
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(a.fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', str(silent)], stdin=subprocess.PIPE)
    for g in range(f0, f1):
        pg.evaluate(f'renderFrame({g / a.fps - song0})')
        ff.stdin.write(pg.locator('#wrap').screenshot(type='jpeg', quality=94))
    ff.stdin.close(); ff.wait(); b.close()
srv.shutdown()
n = f1 - f0
if a.nosong: print(silent, n, 'frames'); sys.exit()
final = pathlib.Path(a.out) if a.out else rend / f'{stem}.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-ss', str(f0 / a.fps), '-t', str(n / a.fps), '-i', str(song),
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', str(final)], check=True)
print(final, n, 'frames')
