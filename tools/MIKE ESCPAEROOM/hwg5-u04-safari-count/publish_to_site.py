"""Copy Safari Count static parts into the site: public/safari-count/ (puzzle card page, icons, card background, fonts, audio, photo game)
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
# Start-screen music for both versions (teacher 11/27, Music 3): music/bgm.mp3 -> /safari-count/audio/bgm.mp3
if (here / 'music' / 'bgm.mp3').exists(): shutil.copy2(here / 'music' / 'bgm.mp3', dest / 'audio' / 'bgm.mp3'); print('start music copied')
shutil.copy2(here / 'content' / 'stations.json', site / 'functions' / 'safari-content.json'); print('bank copied')
# Photo game (Godot Web export, games/photo-count/web): copied only when built, old files replaced.
game = here / 'games' / 'photo-count' / 'web'
if (game / 'index.pck').exists():
    gdst = dest / 'games' / 'photo-count'
    if gdst.exists(): shutil.rmtree(gdst)
    print('photo game', copy(game, gdst))
# Count pictures (clean film frames, web/count/<station>-<key>.jpg) and the story films (720p): tabletop/out/<station>_<key>[_clue_<g|b>]_720.mp4
# -> public/safari-count/films/<station>-<key>[-clue-<g|b>].mp4 (teacher 11/25: count from the picture, like clue at the end of the last film).
(dest / 'count').mkdir(parents=True, exist_ok=True); n = 0
for f in (here / 'web' / 'count').glob('*-*.jpg'):
    if not f.name.startswith('v2-'): shutil.copy2(f, dest / 'count' / f.name); n += 1   # v2 pictures go to /safari-count-2
print('count pictures', n)
films = dest / 'films'; films.mkdir(parents=True, exist_ok=True); n = 0
for f in (here / 'tabletop' / 'out').glob('*_720.mp4'):
    if f.name.startswith('v2_'): continue
    shutil.copy2(f, films / (f.name[:-len('_720.mp4')].replace('_clue_', '-clue-').replace('_', '-', 1) + '.mp4')); n += 1
print('films', n)

# ---- Version 2 (/safari-count-2, teacher 11/27): its own bank, voices, count pictures and films; cards (?v=2), icons and the photo game are shared ----
dest2 = site / 'public' / 'safari-count-2'
shutil.copy2(here / 'content' / 'stations_v2.json', site / 'functions' / 'safari2-content.json'); print('v2 bank copied')
if (here / 'web' / 'audio_v2').exists(): print('v2 audio', copy(here / 'web' / 'audio_v2', dest2 / 'audio', '*.mp3'))
print('v2 count pictures', copy(here / 'web' / 'count', dest2 / 'count', 'v2-*.jpg'))
films2 = dest2 / 'films'; films2.mkdir(parents=True, exist_ok=True); n = 0
for f in (here / 'tabletop' / 'out').glob('v2_*_720.mp4'):
    shutil.copy2(f, films2 / (f.name[3:-len('_720.mp4')].replace('_clue_', '-clue-').replace('_', '-', 1) + '.mp4')); n += 1
print('v2 films', n)
