"""he/she version puzzle cards: I-version card program (puzzles/src/cards.html), new answers, types swapped between stations.
python he-she/render_cards.py      -> he-she/cards/<order>_<station>_<type>.png (puzzle | hint1 / hint2 | answer) + all.jpg"""
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
HTML = (HERE.parent / 'puzzles' / 'src' / 'cards.html').as_uri()
OUT = HERE / 'cards'; OUT.mkdir(exist_ok=True)
# each station takes the I-version type of the station two places later (spec 11/23, revision 2)
CARDS = [('taiwan', 'homo', '0630'), ('japan', 'seg', '2020'), ('usa', 'utopia', '1130'), ('uk', 'keypad', '1515'),
         ('spain', 'mirror', '1400'), ('egypt', 'shape', '0710'), ('kenya', 'homo', '1930'), ('india', 'seg', '1700'),
         ('singapore', 'mirror', '1600'), ('australia', 'shape', '1645')]
STAGES = ['puzzle', 'hint1', 'hint2', 'answer']

if __name__ == '__main__':
    sheets = []
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1600, 'height': 900})
        for k, (sid, typ, ans) in enumerate(CARDS, 1):
            shots = []
            for st in STAGES:
                f = OUT / f'_{sid}_{st}.png'
                pg.goto(f'{HTML}?type={typ}&ans={ans}&stage={st}'); pg.wait_for_timeout(300)
                pg.screenshot(path=str(f)); shots.append(f)
            sheet = OUT / f'{k:02d}_{sid}_{typ}_{ans}.png'
            args = ['ffmpeg', '-v', 'error', '-y'] + sum([['-i', str(f)] for f in shots], []) + \
                   ['-filter_complex', '[0][1]hstack[t];[2][3]hstack[u];[t][u]vstack,scale=1600:-1', str(sheet)]
            subprocess.run(args, check=True)
            for f in shots: f.unlink()
            sheets.append(sheet); print('card', sheet.name, flush=True)
        b.close()
    args = ['ffmpeg', '-v', 'error', '-y'] + sum([['-i', str(f)] for f in sheets], []) + \
           ['-filter_complex', ''.join(f'[{i}]scale=800:-1[s{i}];' for i in range(10)) + ''.join(f'[s{i}]' for i in range(10)) + 'xstack=inputs=10:layout=' +
            '|'.join(f'{(i % 2) * 800}_{(i // 2) * 450}' for i in range(10)), '-q:v', '3', str(OUT / 'all.jpg')]
    subprocess.run(args, check=True); print('sheet', OUT / 'all.jpg')
