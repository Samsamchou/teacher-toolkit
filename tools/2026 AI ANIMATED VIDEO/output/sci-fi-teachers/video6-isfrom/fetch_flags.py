"""fetch_flags.py — 影片 6 的十面國旗：從 Wikimedia Commons 下載官方 SVG（公有領域），用 Playwright 轉成寬 900 的 PNG（保留各國原本比例）。
不用 AI 畫國旗（容易畫錯）。輸出 flags/<國名>.png 與 flags/sources.json（片尾授權字卡用）。
用法：python -I fetch_flags.py
"""
import json, pathlib, urllib.request, urllib.error, hashlib, time
HERE = pathlib.Path(__file__).resolve().parent; OUT = HERE / 'flags'; OUT.mkdir(exist_ok=True)
FILES = {'Australia': 'Flag_of_Australia.svg', 'India': 'Flag_of_India.svg', 'Japan': 'Flag_of_Japan.svg',
         'Singapore': 'Flag_of_Singapore.svg', 'Spain': 'Flag_of_Spain.svg', 'Taiwan': 'Flag_of_the_Republic_of_China.svg',
         'the UK': 'Flag_of_the_United_Kingdom.svg', 'the USA': 'Flag_of_the_United_States.svg',
         'Korea': 'Flag_of_South_Korea.svg', 'Vietnam': 'Flag_of_Vietnam.svg'}
UA = {'User-Agent': 'teacher-toolkit-flag-fetch/1.0 (classroom video)'}
def slug(c): return c.replace('the ', '').replace(' ', '').lower()

src = {}
for c, fn in FILES.items():
    svg = OUT / f'{slug(c)}.svg'
    if not svg.exists():
        req = urllib.request.Request(f'https://commons.wikimedia.org/wiki/Special:FilePath/{fn}', headers=UA)
        for k in range(6):   # Commons 會回 429 限流：等久一點再試
            try: data = urllib.request.urlopen(req, timeout=60).read(); break
            except urllib.error.HTTPError as e:
                if e.code != 429 or k == 5: raise
                time.sleep(15 * (k + 1))
        time.sleep(4)
        assert data.lstrip()[:5] in (b'<?xml', b'<svg ') or b'<svg' in data[:400], (c, data[:80])
        svg.write_bytes(data)
    src[c] = {'file': fn, 'url': f'https://commons.wikimedia.org/wiki/File:{fn}', 'sha256': hashlib.sha256(svg.read_bytes()).hexdigest()}

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 900, 'height': 600})
    for c in FILES:
        svg = (OUT / f'{slug(c)}.svg').read_text(encoding='utf-8')
        pg.set_content('<html><body style="margin:0;background:transparent">'
                       f'<img id="f" style="width:900px;height:auto;display:block" src="data:image/svg+xml;base64,'
                       + __import__('base64').b64encode(svg.encode()).decode() + '"></body></html>')
        pg.wait_for_function('document.getElementById("f").complete')
        pg.locator('#f').screenshot(path=str(OUT / f'{slug(c)}.png'))
        print(c, 'ok', flush=True)
    b.close()
(OUT / 'sources.json').write_text(json.dumps(src, ensure_ascii=False, indent=1), encoding='utf-8')
