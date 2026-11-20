"""Browser run of the exported Luggage Belt with real mouse drags: screenshots of every phase, Finish button, contact sheet.
python tools/qa_web.py <web_dir> <out_dir> [hero] [country]
Packs good things (half released on the suitcase, half anywhere else below the belt), drags suitcases onto the trolley
(round 2 wrongly on purpose), presses Finish, and writes <out_dir>/overview.jpg."""
import glob, os, sys, time, threading, functools, http.server
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
root, out = sys.argv[1], sys.argv[2]
hero = sys.argv[3] if len(sys.argv) > 3 else 'girl'
country = sys.argv[4] if len(sys.argv) > 4 else 'singapore'
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(out, '*.png')):
    os.remove(f)


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


class Srv(http.server.ThreadingHTTPServer):
    allow_reuse_address = False      # on Windows reuse lets two QA servers share one port (another game's QA got served once)


srv = Srv(('127.0.0.1', 0), functools.partial(Q, directory=root))      # a free port picked by the OS
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = br.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.on('console', lambda m: errs.append(m.text[:150]) if m.type == 'error' else None)
    page.goto(f'http://127.0.0.1:{port}/index.html?country={country}&qa=1&hero={hero}')
    page.wait_for_function("document.title.length > 0", timeout=30000)
    assert 'Luggage' in page.title(), 'wrong game served: ' + page.title()
    page.wait_for_function("window.__bento && window.__bento.state === 'TITLE'", timeout=120000)
    st = lambda: page.evaluate('window.__bento')
    sx = 1280 / st()['w']
    shot = lambda name: page.screenshot(path=os.path.join(out, name))
    time.sleep(1.5); shot('01_title.png')
    page.mouse.click(640, 400); t0 = time.time()
    shots, drags, next_drag, score_before = set(), 0, 0.0, 0
    while time.time() - t0 < 300:
        s = st()
        if s['state'] == 'END':
            break
        if s['state'] == 'CLOCK' and s.get('answerable') and 'okCase' in s:
            idx = s['clockIdx']
            if ('c', idx) not in shots:
                shots.add(('c', idx)); time.sleep(1.0); shot(f'04_clock_{idx + 1}.png')
                s = st()
                if not s.get('answerable'):
                    continue
                pick = s['okCase'] if idx != 1 else (s['okCase'] + 1) % 3      # round 2 wrongly on purpose
                cx, cy = s['cases'][pick]; tx, ty = s['trolley']
                page.mouse.move(cx * sx, cy * sx); page.mouse.down()
                page.mouse.move((cx + tx) / 2 * sx, (cy + ty) / 2 * sx, steps=6)
                if idx == 0:
                    shot('05_dragging_suitcase.png')
                page.mouse.move(tx * sx, ty * sx, steps=6); page.mouse.up()
                time.sleep(0.6); shot(f'06_clock_result_{idx + 1}.png')
        elif s['state'] in ('PLAY', 'READY'):
            if 'finish' in s:
                time.sleep(0.5); shot('07_finish_button.png')
                # re-read: the first status after Finish appears can still hold [0, 0] (the rect is set when it is drawn)
                for _ in range(20):
                    f = st().get('finish') or [0, 0]
                    if f[0] > 0:
                        break
                    time.sleep(0.1)
                page.mouse.click(f[0] * sx, f[1] * sx)
                page.wait_for_function("window.__bento.state === 'END'", timeout=8000); break
            goods = [i for i in s.get('items', []) if i[2] == 0]
            if goods and time.time() >= next_drag:
                x, y, _ = max(goods, key=lambda i: i[0])
                x += s.get('speed', 90) * 0.08          # the belt keeps moving while the mouse travels
                if drags % 2 == 0:
                    tx, ty = s['pack']                      # onto the open suitcase
                else:
                    tx, ty = s['w'] * 0.55, s['dropY'] + (s['h'] - s['dropY']) * 0.6     # anywhere below the belt
                page.mouse.move(x * sx, y * sx); page.mouse.down()
                page.mouse.move((x + tx) / 2 * sx, (y + ty) / 2 * sx, steps=5)
                if s['playT'] > 3 and 'drag' not in shots:
                    shots.add('drag'); shot('03_dragging_item.png')
                page.mouse.move(tx * sx, ty * sx, steps=5); page.mouse.up()
                drags += 1; next_drag = time.time() + 0.9
            if s['playT'] > 2 and 'play' not in shots:
                shots.add('play'); shot('02_play.png')
            if s['playT'] > 25 and 'play2' not in shots:
                shots.add('play2'); shot('02b_play_later.png')
        time.sleep(0.05)
    s = st(); time.sleep(3.0); shot('08_end.png')
    print(country, hero, 'rounds', s.get('rounds'), 'playT', s['playT'], 'score', s['score'], 'stars', s['stars'],
          'clocks', s['clocksCorrect'], 'hearts', s['hearts'], 'drags', drags, 'errors', errs)
    br.close()
srv.shutdown()

# contact sheet of every screenshot
files = sorted(glob.glob(os.path.join(out, '*.png')))
cols, tw, th = 3, 640, 360
sheet = Image.new('RGB', (cols * tw, ((len(files) + cols - 1) // cols) * (th + 28)), (30, 32, 48))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th))
    x, y = (i % cols) * tw, (i // cols) * (th + 28)
    sheet.paste(im, (x, y + 28)); d.text((x + 8, y + 8), os.path.basename(f), fill=(255, 255, 255))
sheet.save(os.path.join(out, 'overview.jpg'), quality=85)
print('overview', os.path.join(out, 'overview.jpg'), len(files), 'shots')
