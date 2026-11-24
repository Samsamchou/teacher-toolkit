"""Walk Taiwan in the local preview (port 3001) and save screenshots.  python web/qa_walk.py <out_dir>"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); n = 0; problems = []
def shot(pg, name):
    global n; n += 1; pg.screenshot(path=str(out / f'{n:02d}_{name}.png')); print('shot', n, name, flush=True)
def drag_fill(pg, words):
    for w in words: pg.click(f'.wr-chips button:text-is("{w}")')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    pg = b.new_context(viewport={'width': 1180, 'height': 820}, permissions=['microphone']).new_page()
    pg.on('pageerror', lambda e: problems.append(str(e)[:200])); pg.on('response', lambda r: problems.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.goto('http://127.0.0.1:3001/safari-count'); pg.wait_for_selector('.wr-hero-card'); shot(pg, 'start')
    pg.click('.wr-hero-card:has-text("Girl")'); pg.wait_for_selector('.wr-map'); pg.wait_for_timeout(600); shot(pg, 'map')
    pg.click('.wr-pin:has-text("Taiwan")'); pg.wait_for_selector('.wr-meet'); shot(pg, 'meet1')
    pg.click('text=Open the puzzle'); pg.wait_for_timeout(1500); shot(pg, 'puzzle1')
    pg.click('text=Hint 1'); pg.wait_for_timeout(800); pg.fill('.sc-guess input', 'zebra'); pg.click('.sc-guess button'); pg.wait_for_timeout(300); shot(pg, 'wrong_guess')
    pg.fill('.sc-guess input', 'panda'); pg.click('.sc-guess button'); pg.wait_for_timeout(1200); shot(pg, 'solved1')
    pg.click('text=Count them'); pg.click('.wr-keys button:text-is("1")'); pg.wait_for_selector('.wr-chips'); shot(pg, 'drag1')
    drag_fill(pg, ['many', 'pandas', 'are', "'s", 'one']); shot(pg, 'drag1_filled'); pg.click('text=Check 送出'); pg.wait_for_timeout(400); shot(pg, 'reveal1')
    pg.click('text=Watch the story'); shot(pg, 'video1'); pg.click('text=Next 下一步')
    pg.click('text=Open the puzzle'); pg.wait_for_timeout(1500); shot(pg, 'puzzle2')
    pg.fill('.sc-guess input', 'bears'); pg.click('.sc-guess button'); pg.wait_for_timeout(1200); pg.click('text=Count them')
    pg.click('.wr-keys button:text-is("3")'); shot(pg, 'count_wrong'); pg.click('.wr-keys button:text-is("2")'); pg.wait_for_timeout(300); shot(pg, 'speak2')
    pg.click('text=Record'); pg.wait_for_timeout(1500); pg.click('text=Stop'); pg.wait_for_selector('.wr-review audio'); pg.click('.wr-review button'); pg.wait_for_timeout(300); shot(pg, 'reveal2')
    pg.click('text=Watch the story'); pg.click('text=Next 下一步'); pg.wait_for_timeout(300); shot(pg, 'like')
    drag_fill(pg, ['Yes', 'does']); pg.click('text=Check 送出'); pg.wait_for_timeout(300); shot(pg, 'stamp')
    pg.click('text=Back to the map'); pg.wait_for_timeout(500); shot(pg, 'map_after')
    b.close()
print('PROBLEMS', len(problems)); [print(' ', x) for x in dict.fromkeys(problems)]
