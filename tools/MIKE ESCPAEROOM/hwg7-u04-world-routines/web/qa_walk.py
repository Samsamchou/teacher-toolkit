"""Walk the Taiwan (drag) and Japan (speak) stations in the local preview (vite --mode preview, port 3001)
and save a screenshot of every step.  python web/qa_walk.py <out_dir>"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:3001/world-routines?open=all'
problems, n = [], 0


def shot(page, name):
    global n
    n += 1
    page.screenshot(path=str(out / f'{n:02d}_{name}.png'))
    print('shot', n, name, flush=True)


def listen_first(page):
    """The puzzle stays locked until the question has been heard to the end."""
    assert page.locator('button:has-text("Open the puzzle")').is_disabled(), 'puzzle button should start locked'
    page.click('.wr-speaker', force=True)   # the button bounces, so Playwright never sees it as 'stable'
    page.wait_for_selector('button:has-text("Open the puzzle"):not([disabled])', timeout=20000)


def end_clip(page):
    """Map-animation clip (opening / flight): jump to its end so the walk goes on (web/qa_clips.py checks the clips themselves)."""
    page.wait_for_selector('.wr-clip video', timeout=8000)
    page.wait_for_function("document.querySelector('.wr-clip video').duration > 0", timeout=20000)
    page.evaluate("(() => { const v = document.querySelector('.wr-clip video'); v.currentTime = v.duration - 0.25 })()")


def listen_all(page):
    page.get_by_role('button', name='Listen 聽句子').click()
    page.wait_for_selector('button:has-text("Watch the story"):not([disabled])', timeout=90000)


with sync_playwright() as p:
    browser = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': 1180, 'height': 820}, permissions=['microphone'])
    page = ctx.new_page()
    page.on('console', lambda m: problems.append(f'console {m.type}: {m.text[:200]}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: problems.append(f'pageerror: {str(e)[:200]}'))
    page.on('response', lambda r: problems.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    page.goto(BASE); page.wait_for_selector('.wr-login'); shot(page, 'login')
    page.click('.wr-hero-card:has-text("Boy")'); shot(page, 'login_boy'); page.fill('input', '60130'); page.click('button.wr-big'); end_clip(page); page.wait_for_selector('.wr-map'); page.wait_for_timeout(800); shot(page, 'map')
    page.click('button:has-text("World Clock")'); page.wait_for_timeout(300); shot(page, 'world_clock'); page.click('button:has-text("Close")')

    # ---- Taiwan: drag + code
    page.click('.wr-pin:has-text("Taiwan")'); page.wait_for_selector('.wr-meet', timeout=8000); shot(page, 'taiwan_meet')
    listen_first(page); page.click('button:has-text("Open the puzzle")'); page.wait_for_timeout(2500); shot(page, 'taiwan_puzzle')
    page.click('button:has-text("Hint 1")'); page.wait_for_timeout(1500); shot(page, 'taiwan_hint1')
    page.click('button:has-text("I got it")'); page.wait_for_selector('.wr-chips'); shot(page, 'taiwan_drag_empty')
    for word in ['color', 'have', 'breakfast']:
        page.click(f'.wr-chips button:text-is("{word}")')
    for k in '0645':
        page.click(f'.wr-keys button:text-is("{k}")')
    page.click('button:has-text("Check")'); page.wait_for_selector('.wr-note'); shot(page, 'taiwan_drag_wrong_word')
    page.click('.wr-slot >> nth=0')
    # real drag of the right chip into the first box
    chip = page.locator('.wr-chips button:text-is("time")').bounding_box(); slot = page.locator('.wr-slot >> nth=0').bounding_box()
    page.mouse.move(chip['x'] + chip['width'] / 2, chip['y'] + chip['height'] / 2); page.mouse.down()
    page.mouse.move(slot['x'] + slot['width'] / 2, slot['y'] + slot['height'] / 2, steps=8); shot(page, 'taiwan_dragging'); page.mouse.up()
    shot(page, 'taiwan_drag_filled')
    page.click('button:has-text("Check")'); page.wait_for_selector('.wr-reveal', timeout=8000); page.wait_for_timeout(2000); shot(page, 'taiwan_reveal')
    listen_all(page); shot(page, 'taiwan_reveal_listened')
    page.click('button:has-text("Watch the story")'); page.wait_for_timeout(1500); shot(page, 'taiwan_video')
    page.click('button:has-text("Play the game")'); page.wait_for_selector('.wr-game iframe', timeout=8000)
    assert 'hero=boy' in page.locator('.wr-game iframe').get_attribute('src'), 'the game should get the chosen hero'
    page.wait_for_timeout(15000); shot(page, 'taiwan_game')
    page.evaluate("window.postMessage({channel:'world-routines',type:'game-done',game:'bus-dash',country:'taiwan',score:900,stars:2,clocksCorrect:3}, location.origin)")
    page.wait_for_selector('.wr-stamp', timeout=8000); page.wait_for_timeout(600); shot(page, 'taiwan_stamp')
    page.click('button:has-text("Back to the map")'); page.wait_for_selector('.wr-map')

    # ---- Japan: speaking
    page.click('.wr-pin:has-text("Japan")'); page.wait_for_timeout(1600); shot(page, 'japan_travelling'); end_clip(page)
    page.wait_for_selector('.wr-meet', timeout=8000); shot(page, 'japan_meet')
    listen_first(page); page.click('button:has-text("Open the puzzle")'); page.wait_for_timeout(2500); shot(page, 'japan_puzzle')
    page.click('button:has-text("Hint 1")'); page.wait_for_timeout(1200); page.click('button:has-text("Hint 2")'); page.wait_for_timeout(1500); shot(page, 'japan_hint2')
    page.click('button:has-text("I got it")'); page.wait_for_selector('.wr-record'); shot(page, 'japan_speak')
    page.click('button:has-text("Record")'); page.wait_for_selector('.wr-stop', timeout=8000); page.wait_for_timeout(2500); shot(page, 'japan_recording')
    page.click('.wr-stop'); page.wait_for_selector('.wr-review', timeout=15000); shot(page, 'japan_review')
    page.click('button:has-text("Send")'); page.wait_for_selector('.wr-score', timeout=15000); shot(page, 'japan_score')
    page.click('button:has-text("Next")'); page.wait_for_selector('.wr-reveal'); page.wait_for_timeout(2000); shot(page, 'japan_reveal')
    listen_all(page)
    page.click('button:has-text("Watch the story")'); page.wait_for_timeout(1500); shot(page, 'japan_video')
    page.click('button:has-text("Play the game")'); page.wait_for_selector('.wr-game iframe', timeout=8000); page.wait_for_timeout(15000); shot(page, 'japan_game')
    page.evaluate("window.postMessage({channel:'world-routines',type:'game-done',game:'bento-catch',country:'japan',score:120,stars:3,clocksCorrect:3}, location.origin)")
    page.wait_for_selector('.wr-stamp', timeout=8000); page.wait_for_timeout(600); shot(page, 'japan_stamp')
    page.click('button:has-text("Back to the map")'); page.wait_for_selector('.wr-map'); page.wait_for_timeout(800); shot(page, 'map_two_stamps')

    # ---- phone-width check of the map and one puzzle
    page.set_viewport_size({'width': 820, 'height': 1180}); page.wait_for_timeout(500); shot(page, 'map_portrait')
    browser.close()
print('PROBLEMS', len(problems))
for line in dict.fromkeys(problems):
    print(' ', line)
