"""render_glb.py <model.glb> <out_prefix> [--scale 2] [--yaw 0 35 ...] — 用 three.js＋Playwright 把一個 Tripo 姿勢模型渲染成透明背景 PNG。
每個 yaw 角度輸出 <out_prefix>-yaw<角度>.png（1024×1536）。燈光與鏡頭固定，所有姿勢光線一致。
"""
import sys, pathlib, http.server, threading, functools, urllib.parse
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
args = sys.argv[1:]
glb = pathlib.Path(args[0]).resolve(); prefix = pathlib.Path(args[1]).resolve()
scale = 1
if '--scale' in args: i = args.index('--scale'); scale = int(args[i + 1]); del args[i:i + 2]
yaws = [float(a) for a in args[args.index('--yaw') + 1:]] if '--yaw' in args else [0.0]
W, H = 1024 * scale, 1536 * scale
root = pathlib.Path(glb.anchor)  # 用磁碟根目錄當 http 根，viewer 與模型都能讀
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
handler.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_port}/'
rel = lambda p: urllib.parse.quote(p.relative_to(root).as_posix())
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=d3d11', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': W, 'height': H})
    for y in yaws:
        pg.goto(f"{base}{rel(HERE / 'glb_viewer.html')}?glb=/{rel(glb)}&yaw={y}&w={W}&h={H}")
        pg.wait_for_function('window.READY===true || window.ERR', timeout=180000)
        err = pg.evaluate('window.ERR || null')
        if err: sys.exit(f'load error: {err}')
        out = prefix.parent / f'{prefix.name}-yaw{int(y)}{"-x%d" % scale if scale > 1 else ""}.png'; out.parent.mkdir(parents=True, exist_ok=True)
        pg.locator('canvas').screenshot(path=str(out), omit_background=True); print(out)
    b.close()
srv.shutdown()
