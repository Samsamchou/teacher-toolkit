"""Smoke test on the PRODUCTION site with the test student ID 60199 (not a real seat number).
Checks: home page has no World Routines tile; login + progress load (App Check + functions); Taiwan drag answer;
Japan speaking: one real AI assessment with the browser's fake microphone (a beep, so it should NOT pass).
  python web/qa_live.py <out_dir>"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
BASE = 'https://talktofriends-6b58d.web.app'
problems = []
with sync_playwright() as p:
    browser = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
    page = browser.new_context(viewport={'width': 1180, 'height': 820}, permissions=['microphone']).new_page()
    page.on('pageerror', lambda e: problems.append(f'pageerror: {str(e)[:200]}'))
    page.on('response', lambda r: problems.append(f'{r.status} {r.url[:120]}') if r.status >= 400 else None)
    page.goto(BASE + '/'); page.wait_for_selector('.activity-tile'); page.wait_for_timeout(500)
    print('home tiles:', page.locator('.activity-tile strong').all_inner_texts()); page.screenshot(path=str(out / 'live_01_home.png'))
    page.goto(BASE + '/world-routines?open=all'); page.wait_for_selector('.wr-login'); page.fill('input', '60199'); page.click('button.wr-big')
    try: page.wait_for_selector('.wr-map', timeout=45000); print('login + state: OK')
    except Exception: print('login FAILED:', page.locator('[role=alert]').all_inner_texts()); page.screenshot(path=str(out / 'live_02_login_fail.png')); browser.close(); print(problems); sys.exit(1)
    page.wait_for_timeout(800); page.screenshot(path=str(out / 'live_02_map.png'))
    # Taiwan: drag + code (no AI)
    page.click('.wr-pin:has-text("Taiwan")'); page.wait_for_selector('.wr-meet, .wr-reveal', timeout=10000)
    if page.locator('.wr-meet').count():
        page.click('button:has-text("Open the puzzle")'); page.wait_for_timeout(2500); page.screenshot(path=str(out / 'live_03_puzzle.png'))
        page.click('button:has-text("I got it")'); page.wait_for_selector('.wr-chips')
        for w in ('time', 'have', 'breakfast'): page.click(f'.wr-chips button:text-is("{w}")')
        for k in '0645': page.click(f'.wr-keys button:text-is("{k}")')
        page.click('button:has-text("Check")')
    page.wait_for_selector('.wr-reveal', timeout=30000); print('Taiwan drag answer: OK'); page.wait_for_timeout(1500); page.screenshot(path=str(out / 'live_04_reveal.png'))
    page.click('button:has-text("Map")'); page.wait_for_selector('.wr-map')
    # Japan: one real speaking assessment with a beep
    page.click('.wr-pin:has-text("Japan")'); page.wait_for_selector('.wr-meet, .wr-reveal', timeout=12000)
    if page.locator('.wr-meet').count():
        page.click('button:has-text("Open the puzzle")'); page.wait_for_timeout(1500); page.click('button:has-text("I got it")'); page.wait_for_selector('.wr-record')
        page.click('button:has-text("Record")'); page.wait_for_selector('.wr-stop', timeout=10000); page.wait_for_timeout(3000); page.click('.wr-stop')
        page.wait_for_selector('.wr-review', timeout=20000); page.click('button:has-text("Send")')
        try:
            page.wait_for_selector('.wr-score, .wr-error', timeout=120000)
            print('speaking result:', ' | '.join(page.locator('.wr-score, .wr-error').all_inner_texts())[:400].replace('\n', ' / '))
        except Exception: print('speaking: no answer in 120 s')
        page.screenshot(path=str(out / 'live_05_speak.png'))
    browser.close()
print('PROBLEMS', len(problems)); [print(' ', x) for x in dict.fromkeys(problems)]
