"""Copy Safari Count static parts into the site: public/safari-count/ (puzzle card page, icons, card background, fonts, audio)
and the station bank into functions/safari-content.json.   python publish_to_site.py"""
import shutil
from pathlib import Path
here = Path(__file__).resolve().parent
site = here.parent.parent / 'monster-in-my-mind-site'
dest = site / 'public' / 'safari-count'
def copy(src, dst, pattern='*'):
    dst.mkdir(parents=True, exist_ok=True); n = 0
    for f in src.glob(pattern):
        if f.is_file(): shutil.copy2(f, dst / f.name); n += 1
    return n
dest.mkdir(parents=True, exist_ok=True)
html = (here / 'puzzles' / 'src' / 'cards.html').read_text(encoding='utf-8').replace('../assets/', 'assets/')
html = html.replace('src: local("Comic Relief Bold"), local("ComicRelief-Bold");', 'src: url("/world-routines/fonts/ComicRelief-Bold.ttf") format("truetype");')
html = html.replace('src: local("Comic Relief"), local("ComicRelief-Regular");', 'src: url("/world-routines/fonts/ComicRelief-Regular.ttf") format("truetype");')
(dest / 'cards.html').write_text(html, encoding='utf-8')
print('icons', copy(here / 'puzzles' / 'assets' / 'icons', dest / 'assets' / 'icons', '*.png'))
shutil.copy2(here / 'puzzles' / 'assets' / 'card_bg.png', dest / 'assets' / 'card_bg.png')
print('audio', copy(here / 'web' / 'audio', dest / 'audio', '*.mp3'))
shutil.copy2(here / 'content' / 'stations.json', site / 'functions' / 'safari-content.json'); print('bank copied')
