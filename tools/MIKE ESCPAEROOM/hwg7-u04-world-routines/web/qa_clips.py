"""Walk the map-animation clips in the local preview (vite --mode preview, port 3001): opening after login (once per device),
flight clip when travelling (no Skip on the first view, Skip from the second), fallback when a clip cannot load,
ending after the 10th stamp and its replay button.  python web/qa_clips.py <out_dir>"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:3001/world-routines?open=all'
IDS = ['taiwan', 'japan', 'usa', 'uk', 'spain', 'egypt', 'kenya', 'india', 'singapore', 'australia']
problems, n = [], 0


def shot(page, name):
    global n
    n += 1; page.screenshot(path=str(out / f'{n:02d}_{name}.png')); print('shot', n, name, flush=True)


def clip(page, name, skip_expected):
    """The clip overlay is up, plays the right file, and shows Skip only when expected. Then jump to its end."""
    page.wait_for_selector('.wr-clip video', timeout=8000)
    src = page.locator('.wr-clip video').get_attribute('src')
    assert src.endswith(f'/video/map_{name}.mp4'), src
    page.wait_for_function("document.querySelector('.wr-clip video').currentTime > 1.2", timeout=20000)
    assert not page.evaluate("document.querySelector('.wr-clip video').muted"), 'the clip must play with sound'
    has_skip = page.locator('.wr-clip-skip').count() > 0
    assert has_skip == skip_expected, f'{name}: skip button shown={has_skip}, expected={skip_expected}'
    shot(page, f'clip_{name}')
    return has_skip


def to_end(page):
    page.evaluate("(() => { const v = document.querySelector('.wr-clip video'); v.currentTime = v.duration - 0.25 })()")


def login(page):
    page.goto(BASE); page.wait_for_selector('.wr-login')
    page.click('.wr-hero-card:has-text("Girl")'); page.fill('input', '60130'); page.click('button.wr-big')


with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': 1180, 'height': 820})
    page = ctx.new_page()
    page.on('console', lambda m: problems.append(f'console {m.type}: {m.text[:200]}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: problems.append(f'pageerror: {str(e)[:200]}'))
    page.on('response', lambda r: problems.append(f'{r.status} {r.url}') if r.status >= 400 else None)

    # 1. opening: plays once after login, no Skip the first time, then the map
    login(page); clip(page, 'opening', False); to_end(page); page.wait_for_selector('.wr-map', timeout=8000); shot(page, 'map_after_opening')
    # 2. second login on the same device: straight to the map
    login(page); page.wait_for_selector('.wr-map', timeout=8000)
    assert page.locator('.wr-clip').count() == 0, 'the opening should play only once per device'
    # 3. flight clip Taiwan -> Japan: first view no Skip, runs to the end, then the station
    page.click('.wr-pin:has-text("Japan")'); clip(page, 'leg_japan', False); to_end(page)
    page.wait_for_selector('.wr-meet', timeout=8000); shot(page, 'japan_meet_after_clip')
    # 4. same trip again: Skip is there and works
    page.click('button:has-text("← Map")'); page.wait_for_selector('.wr-map')
    page.click('.wr-pin:has-text("Japan")'); clip(page, 'leg_japan', True); page.click('.wr-clip-skip')
    page.wait_for_selector('.wr-meet', timeout=8000)
    # 5. a clip that cannot load never blocks the trip: the old hero-on-the-map trip runs instead
    page.click('button:has-text("← Map")'); page.wait_for_selector('.wr-map')
    page.route('**/video/map_leg_usa.mp4', lambda r: r.abort())
    page.click('.wr-pin:has-text("USA")'); page.wait_for_selector('.wr-travel-note', timeout=8000); shot(page, 'usa_fallback_trip')
    page.wait_for_selector('.wr-meet', timeout=8000)
    problems[:] = [x for x in problems if 'map_leg_usa' not in x and 'ERR_FAILED' not in x]     # the abort above is on purpose
    # 6. ending: with all ten stamps, leaving a station plays the recap once; the finish card can replay it
    done = {i: {'gameDone': True, 'stars': 3} for i in IDS}
    page.route('**/__preview/cloud/routinesState', lambda r: r.fulfill(status=200, content_type='application/json',
               body=json.dumps({'stations': done, 'remaining': 30})))
    login(page); page.wait_for_selector('.wr-finish', timeout=8000); shot(page, 'map_finished')
    page.click('.wr-pin:has-text("Kenya")'); page.wait_for_selector('.wr-topbar', timeout=8000)
    page.click('button:has-text("← Map")'); clip(page, 'ending', False); to_end(page)
    page.wait_for_selector('.wr-finish', timeout=8000)
    page.click('button:has-text("Watch the trip again")'); clip(page, 'ending', True); page.click('.wr-clip-skip')
    page.wait_for_selector('.wr-finish', timeout=8000)
    # 7. portrait tablet: the clip is letterboxed, not cropped
    page.set_viewport_size({'width': 820, 'height': 1180})
    page.click('button:has-text("Watch the trip again")'); page.wait_for_selector('.wr-clip video'); page.wait_for_timeout(2500); shot(page, 'clip_portrait')
    box = page.locator('.wr-clip video').bounding_box(); assert box['width'] <= 820 and box['height'] <= 1180, box
    browser.close()
print('PROBLEMS', len(problems))
for line in dict.fromkeys(problems):
    print(' ', line)
