"""Browser run of the exported Clock Ninja with real mouse taps: title, play (tap the good things), 4 clock rounds
(round 2 answered wrongly on purpose), Finish button, end screen; screenshots + an overview.jpg contact sheet.
python tools/qa_web.py <web_dir> <out_dir> [hero] [country]
Do not run while Godot headless tests are running (a busy PC can make the Finish wait time out)."""
import os, sys, time, threading, functools, http.server
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
root, out = sys.argv[1], sys.argv[2]
hero = sys.argv[3] if len(sys.argv) > 3 else 'girl'
country = sys.argv[4] if len(sys.argv) > 4 else 'uk'
os.makedirs(out, exist_ok=True)


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8793), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
shots_list = []
with sync_playwright() as p:
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = br.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.on('console', lambda m: errs.append(m.text[:150]) if m.type == 'error' else None)
    page.goto(f'http://127.0.0.1:8793/index.html?country={country}&qa=1&hero={hero}')
    page.wait_for_function("window.__bento && window.__bento.state === 'TITLE'", timeout=120000)
    st = lambda: page.evaluate('window.__bento')
    sx = 1280 / st()['w']

    def shot(name):
        path = f'{out}/{name}.png'
        page.screenshot(path=path)
        shots_list.append((name, path))

    time.sleep(1.5); shot(f'01_title_{hero}')
    page.mouse.click(640, 400); t0 = time.time()
    done, last_tap, taps, caught_shot = set(), 0.0, 0, False
    while time.time() - t0 < 1200:      # headless Chromium renders several times slower than real time
        s = st()
        if s['state'] == 'END':
            break
        if s['state'] == 'CLOCK':
            idx = s['clockIdx']
            if 'clocks' in s and ('c', idx) not in done:
                done.add(('c', idx))
                time.sleep(1.4); shot(f'03_clock_{idx + 1}')
                cl = st().get('clocks') or s['clocks']
                ok = [c for c in cl if c[2]][0]
                pick = ok if idx != 1 else [c for c in cl if not c[2]][0]      # round 2 answered wrongly on purpose
                page.mouse.click(pick[0] * sx, pick[1] * sx)
                time.sleep(0.5); shot(f'04_clock_result_{idx + 1}')
        elif s['state'] == 'PLAY':
            if 'finish' in s:
                time.sleep(0.4); shot('05_finish_button')
                f = st().get('finish', s['finish'])
                for attempt in range(3):          # headless Chromium is slow: allow a retry before failing
                    page.mouse.click(f[0] * sx, f[1] * sx, delay=60)
                    try:
                        page.wait_for_function("window.__bento.state === 'END'", timeout=15000); break
                    except Exception:
                        print('finish click', attempt + 1, 'not yet END, state', st()['state'])
                break
            good = s.get('good', [])
            if good and time.time() - last_tap > 0.25:
                g = min(good, key=lambda g: abs(g[3]))           # the one nearest the top of its arc moves least
                x, y = g[0] + g[2] * 0.06, g[1] + g[3] * 0.06
                page.mouse.click(x * sx, y * sx); last_tap = time.time(); taps += 1
                if not caught_shot and s['playT'] > 3:
                    caught_shot = True; time.sleep(0.1); shot('02b_catch_trail')
            if 'play' not in done and ((s['playT'] > 6 and len(good) + len(s.get('bad', [])) >= 3 and s.get('bad')) or s['playT'] > 14):
                done.add('play'); shot('02_play')
        time.sleep(0.04)
    page.wait_for_function("window.__bento.state === 'END'", timeout=60000)
    time.sleep(3.0); s = st(); shot('06_end')
    print(country, hero, 'rounds', s.get('rounds'), 'playT', s['playT'], 'score', s['score'], 'stars', s['stars'],
          'clocks', s['clocksCorrect'], 'hearts', s['hearts'], 'caught', s.get('caught'), 'taps', taps, 'errors', errs)
    br.close()

# contact sheet
cols, tw, th = 3, 640, 360
rows = (len(shots_list) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 28)), (40, 40, 52))
d = ImageDraw.Draw(sheet)
for i, (name, path) in enumerate(shots_list):
    im = Image.open(path).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 28)
    sheet.paste(im, (x, y + 28)); d.text((x + 8, y + 6), name, fill=(255, 230, 120))
sheet.save(f'{out}/overview.jpg', quality=85)
print('overview', f'{out}/overview.jpg', len(shots_list), 'shots')
