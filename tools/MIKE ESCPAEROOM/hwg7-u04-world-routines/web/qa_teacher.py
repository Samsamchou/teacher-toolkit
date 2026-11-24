"""Walk the World Routines teacher page in the local preview (port 3001): a pupil finishes two stations, then the teacher
signs in (demo PIN 000000), opens class 601, a speaking cell, plays both recordings and downloads the CSV.  python web/qa_teacher.py <out_dir>"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
problems = []
with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_context(viewport={'width': 1366, 'height': 900}, accept_downloads=True).new_page()
    page.on('pageerror', lambda e: problems.append(f'pageerror: {e}'))
    page.on('console', lambda m: problems.append(f'console: {m.text[:200]}') if m.type == 'error' else None)
    page.goto('http://127.0.0.1:3001/world-routines'); page.fill('input', '60130'); page.click('button.wr-big'); page.wait_for_selector('.wr-map, .wr-clip')   # the opening clip may play first
    call = "async ([a, b]) => { const r = await fetch('/__preview/cloud/' + a, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(b)}); return r.status }"
    for a, b in (('routinesAnswer', {'station': 'taiwan', 'slots': ['time', 'have', 'breakfast'], 'code': '0645'}), ('routinesGameDone', {'station': 'taiwan', 'stars': 2}),
                 ('scoreRoutineSpeaking', {'station': 'japan', 'attemptId': 'a' * 20, 'audio': ''}), ('routinesGameDone', {'station': 'japan', 'stars': 3})):
        print(a, page.evaluate(call, [a, b]))
    page.goto('http://127.0.0.1:3001/teacher'); page.wait_for_timeout(800); page.screenshot(path=str(out / '01_portal_link.png'))
    page.click('text=World Routines Trip 作息之旅'); page.wait_for_selector('input[type=password]'); page.screenshot(path=str(out / '02_login.png'))
    page.fill('input[type=password]', '000000'); page.click('button:has-text("登入")'); page.wait_for_selector('.wr-class')
    page.click('.wr-class:has-text("601")'); page.wait_for_selector('.wr-table'); page.wait_for_timeout(300); page.screenshot(path=str(out / '03_class601.png'), full_page=True)
    print('rows', page.locator('.wr-table tbody tr').count(), '|', page.locator('[role=status]').first.inner_text())
    page.click('button[aria-label="60130 Japan 口說紀錄"]'); page.wait_for_selector('.wr-records article')
    page.click('.wr-records article >> nth=1 >> button:has-text("播放錄音")'); page.wait_for_selector('.wr-records audio'); page.wait_for_timeout(400)
    page.locator('.wr-records').screenshot(path=str(out / '04_records.png'))
    with page.expect_download() as dl: page.click('button:has-text("下載 CSV")')
    csv = out / 'class601.csv'; dl.value.save_as(csv); print('csv', csv.read_text(encoding='utf-8-sig').splitlines()[:2])
    page.click('.wr-class:has-text("502")'); page.wait_for_timeout(500); print('502 rows', page.locator('.wr-table tbody tr').count())
    page.set_viewport_size({'width': 820, 'height': 1180}); page.click('.wr-class:has-text("601")'); page.wait_for_timeout(500); page.screenshot(path=str(out / '05_ipad.png'))
    browser.close()
print('PROBLEMS', len(problems)); [print(' ', x) for x in problems]
