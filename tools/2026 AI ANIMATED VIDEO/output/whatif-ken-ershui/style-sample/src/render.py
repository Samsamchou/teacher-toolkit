"""render.py：用 Playwright 把 sample.html 的三種畫面各截一張 1920x1080 PNG。
用法：python render.py <輸出資料夾>
"""
import sys, pathlib, threading, http.server, functools
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(here))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_address[1]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    for f, name in [("A", "sample-A-title.png"), ("B", "sample-B-oneword.png"), ("C", "sample-C-karaoke.png")]:
        pg.goto(f"http://127.0.0.1:{port}/sample.html?frame={f}")
        pg.wait_for_selector("body[data-ready='1']")
        pg.screenshot(path=str(out / name))
        print("saved", out / name)
    b.close()
srv.shutdown()
