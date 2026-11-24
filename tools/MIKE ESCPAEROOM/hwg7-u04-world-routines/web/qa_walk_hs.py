"""Walk the he/she trip (/world-routines-he-she) in the local preview (vite --mode preview, port 3001) and save a screenshot of
every step.  python web/qa_walk_hs.py <out_dir>
Checks: opening + grammar clip, Taiwan drag (third-person distractor 'do' is refused), Japan speaking, Singapore two-blank
drag, Egypt 'video coming soon', game URL uses the hs_ settings, the I trip's progress is untouched, he/she teacher page."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
HOST = 'http://127.0.0.1:3001'
problems, n = [], 0


def shot(page, name):
    global n
    n += 1
    page.screenshot(path=str(out / f'{n:02d}_{name}.png'))
    print('shot', n, name, flush=True)


def listen_first(page):
    assert page.locator('button:has-text("Open the puzzle")').is_disabled(), 'puzzle button should start locked'
    page.click('.wr-speaker', force=True)
    page.wait_for_selector('button:has-text("Open the puzzle"):not([disabled])', timeout=20000)


def end_clip(page):
    page.wait_for_selector('.wr-clip video', timeout=8000)
    page.wait_for_function("document.querySelector('.wr-clip video').duration > 0", timeout=20000)
    src = page.locator('.wr-clip video').get_attribute('src'); print('clip', src)
    page.evaluate("(() => { const v = document.querySelector('.wr-clip video'); v.currentTime = v.duration - 0.25 })()")
    # done = this clip is gone (the next clip, e.g. grammar after opening, may take its place)
    page.wait_for_function("s => { const v = document.querySelector('.wr-clip video'); return !v || v.getAttribute('src') !== s }", arg=src, timeout=8000)
    return src


def listen_all(page):
    page.get_by_role('button', name='Listen 聽句子').click()
    page.wait_for_selector('button:has-text("Watch the story"):not([disabled])', timeout=90000)


def drag_station(page, name, wrong, right, code):
    page.click(f'.wr-pin:has-text("{name}")'); page.wait_for_timeout(800)
    if page.locator('.wr-clip').count(): end_clip(page)
    page.wait_for_selector('.wr-meet', timeout=8000); shot(page, f'{name}_meet')
    listen_first(page); page.click('button:has-text("Open the puzzle")'); page.wait_for_timeout(2500); shot(page, f'{name}_puzzle')
    page.click('button:has-text("I got it")'); page.wait_for_selector('.wr-chips'); shot(page, f'{name}_drag_empty')
    assert page.locator('.wr-slot').count() == len(right), f'{name}: {page.locator(".wr-slot").count()} blanks'
    for word in wrong: page.click(f'.wr-chips button:text-is("{word}")')
    for k in code: page.click(f'.wr-keys button:text-is("{k}")')
    page.click('button:has-text("Check")'); page.wait_for_selector('.wr-note'); shot(page, f'{name}_wrong')
    for i in range(len(right)): page.locator('.wr-slot').nth(i).click()     # tapping a filled box empties it
    for word in right: page.click(f'.wr-chips button:text-is("{word}")')
    shot(page, f'{name}_right')
    page.click('button:has-text("Check")'); page.wait_for_selector('.wr-reveal', timeout=8000); page.wait_for_timeout(1500); shot(page, f'{name}_reveal')


def finish_station(page, name, game):
    listen_all(page)
    page.click('button:has-text("Watch the story")'); page.wait_for_timeout(1500); shot(page, f'{name}_video')
    page.click('button:has-text("Play the game")'); page.wait_for_selector('.wr-game iframe', timeout=8000)
    src = page.locator('.wr-game iframe').get_attribute('src'); print(name, 'game', src)
    assert 'country=hs_' in src, f'{name}: game should get the he/she settings'
    page.wait_for_timeout(12000); shot(page, f'{name}_game')
    page.evaluate(f"window.postMessage({{channel:'world-routines',type:'game-done',game:'{game}',country:'x',score:900,stars:2,clocksCorrect:3}}, location.origin)")
    page.wait_for_selector('.wr-stamp', timeout=8000); page.wait_for_timeout(500); shot(page, f'{name}_stamp')
    page.click('button:has-text("Back to the map")'); page.wait_for_selector('.wr-map')


with sync_playwright() as p:
    browser = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': 1180, 'height': 820}, permissions=['microphone'])
    page = ctx.new_page()
    page.on('console', lambda m: problems.append(f'console {m.type}: {m.text[:200]}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: problems.append(f'pageerror: {str(e)[:200]}'))
    page.on('response', lambda r: problems.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    page.goto(HOST + '/world-routines-he-she?open=all'); page.wait_for_selector('.wr-login'); shot(page, 'login')
    page.click('.wr-hero-card:has-text("Girl")'); page.fill('input', '60130'); page.click('button.wr-big')
    assert end_clip(page).endswith('/map_opening.mp4')
    assert end_clip(page).endswith('/hs/grammar.mp4')
    page.wait_for_selector('.wr-map'); page.wait_for_timeout(800); shot(page, 'map')

    drag_station(page, 'Taiwan', ['do', 'get', 'up'], ['does', 'get', 'up'], '0630')
    finish_station(page, 'Taiwan', 'bus-dash')

    # ---- Japan: speaking (the local preview scores a fixed 90)
    page.click('.wr-pin:has-text("Japan")'); page.wait_for_timeout(1200); shot(page, 'japan_travelling')
    leg = end_clip(page); assert '/hs/map_leg_japan.mp4' in leg, leg
    page.wait_for_selector('.wr-meet', timeout=8000); shot(page, 'japan_meet')
    listen_first(page); page.click('button:has-text("Open the puzzle")'); page.wait_for_timeout(2500); shot(page, 'japan_puzzle')
    page.click('button:has-text("I got it")'); page.wait_for_selector('.wr-record'); shot(page, 'japan_speak')
    page.click('button:has-text("Record")'); page.wait_for_selector('.wr-stop', timeout=8000); page.wait_for_timeout(1500)
    page.click('.wr-stop'); page.wait_for_selector('.wr-review', timeout=15000)
    page.click('button:has-text("Send")'); page.wait_for_selector('.wr-score', timeout=15000); shot(page, 'japan_score')
    page.click('button:has-text("Next")'); page.wait_for_selector('.wr-reveal'); page.wait_for_timeout(1500); shot(page, 'japan_reveal')
    finish_station(page, 'Japan', 'bento-catch')

    # ---- Singapore: two blanks (does / study), distractor 'studies'
    drag_station(page, 'Singapore', ['do', 'studies'], ['does', 'study'], '1600')
    page.click('button:has-text("← Map")'); page.wait_for_selector('.wr-map')

    # ---- Egypt: the story video is not made yet -> 'coming soon', the trip goes on
    page.click('.wr-pin:has-text("Egypt")'); page.wait_for_timeout(800)
    if page.locator('.wr-clip').count(): end_clip(page)
    page.wait_for_selector('.wr-meet', timeout=8000); shot(page, 'egypt_meet')
    page.click('button:has-text("← Map")'); page.wait_for_selector('.wr-map'); shot(page, 'map_after')
    page.click('button:has-text("-s / -es / -ies")'); page.wait_for_selector('.wr-clip-skip', timeout=8000); shot(page, 'grammar_button')
    page.click('.wr-clip-skip'); page.wait_for_selector('.wr-map')

    # ---- the I trip keeps its own progress (nothing stamped there)
    call = "async ([a, b]) => { const r = await fetch('/__preview/cloud/' + a, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(b)}); return r.json() }"
    i_state = page.evaluate(call, ['routinesState', {}]); hs_state = page.evaluate(call, ['routinesState', {'variant': 'hs'}])
    print('I stamps', sum(1 for s in i_state['stations'].values() if s['gameDone']), '| he/she stamps', sum(1 for s in hs_state['stations'].values() if s['gameDone']))
    assert not any(s['gameDone'] for s in i_state['stations'].values()), 'he/she stamps leaked into the I trip'

    # ---- teacher page (demo PIN 000000)
    page.goto(HOST + '/world-routines-he-she/teacher'); page.wait_for_selector('input[type=password]')
    page.fill('input[type=password]', '000000'); page.click('button:has-text("登入")'); page.wait_for_selector('.wr-class')
    page.click('.wr-class:has-text("601")'); page.wait_for_selector('.wr-table'); page.wait_for_timeout(300); shot(page, 'teacher_hs_601')
    print('teacher', page.locator('h1').inner_text(), '| rows', page.locator('.wr-table tbody tr').count())
    page.set_viewport_size({'width': 820, 'height': 1180}); page.goto(HOST + '/world-routines-he-she?open=all'); page.wait_for_timeout(1500); shot(page, 'portrait_login')
    browser.close()
print('PROBLEMS', len(problems))
for line in dict.fromkeys(problems):
    print(' ', line)
