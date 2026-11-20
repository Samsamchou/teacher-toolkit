"""Browser run of the exported Bus Dash: screenshots of every phase, lane control with the mouse, Finish button.
python tools/qa_web.py <web_dir> <out_dir> [hero] [country]"""
import sys, time, threading, functools, http.server
from playwright.sync_api import sync_playwright
root, out = sys.argv[1], sys.argv[2]
hero = sys.argv[3] if len(sys.argv) > 3 else 'girl'
country = sys.argv[4] if len(sys.argv) > 4 else 'taiwan'


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=root))   # port 0: the OS picks a free port (other browser tests may run at the same time)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = br.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:150]))
    page.on('console', lambda m: errs.append(m.text[:150]) if m.type == 'error' else None)
    page.goto(f'http://127.0.0.1:{port}/index.html?country={country}&qa=1&hero={hero}')
    page.wait_for_function("window.__bento && window.__bento.state === 'TITLE'", timeout=120000)
    st = lambda: page.evaluate('window.__bento')
    sx = 1280 / st()['w']
    time.sleep(1.5); page.screenshot(path=f'{out}/01_title_{hero}.png')
    page.mouse.click(640, 400); t0 = time.time()
    page.mouse.move(300, 400); page.mouse.down()
    shots, sweep, wrong_done = set(), 0, False
    while time.time() - t0 < 260:
        s = st()
        if s['state'] == 'END': break
        ys = s.get('laneY', [300, 450, 600])
        if s['state'] == 'CLOCK' and 'okLane' in s:
            idx = s['clockIdx']
            lane = s['okLane'] if idx != 1 else (s['okLane'] + 1) % 3      # answer round 2 wrongly on purpose
            page.mouse.move(300, ys[lane] * sx, steps=2)
            if ('c', idx) not in shots:
                shots.add(('c', idx)); time.sleep(3.2); page.screenshot(path=f'{out}/03_clock_{idx + 1}.png')
            if s['clocksCorrect'] + (3 - s['hearts']) > idx and ('r', idx) not in shots:
                shots.add(('r', idx)); time.sleep(0.4); page.screenshot(path=f'{out}/04_clock_result_{idx + 1}.png')
        elif s['state'] == 'PLAY':
            if 'finish' in s:
                time.sleep(0.5); page.screenshot(path=f'{out}/05_finish_button.png')
                f = s['finish']; page.mouse.up(); page.mouse.click(f[0] * sx, f[1] * sx)
                page.wait_for_function("window.__bento.state === 'END'", timeout=5000); break
            sweep += 1
            bad = s.get('badAhead', [False] * 3); cur = s['lane']
            if bad[cur]:
                free = [i for i in (1, 0, 2) if not bad[i]]
                if free: page.mouse.move(300, ys[min(free, key=lambda i: abs(i - cur))] * sx, steps=2)
            if s['playT'] > 5 and 'play' not in shots:
                shots.add('play'); page.screenshot(path=f'{out}/02_play.png')
        time.sleep(0.05)
    s = st(); time.sleep(3.0); page.screenshot(path=f'{out}/06_end.png')
    print(country, hero, 'rounds', s.get('rounds'), 'playT', s['playT'], 'score', s['score'], 'stars', s['stars'], 'clocks', s['clocksCorrect'], 'hearts', s['hearts'], 'errors', errs)
    br.close()
