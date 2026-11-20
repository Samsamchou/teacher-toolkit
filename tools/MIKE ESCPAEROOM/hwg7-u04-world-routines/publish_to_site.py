"""Copy the static parts of World Routines Trip into the site's public/world-routines/ folder:
puzzle card page and its art, map / characters / vehicles, audio, fonts, videos, Godot web exports."""
import shutil
from pathlib import Path

here = Path(__file__).resolve().parent
dest = here.parent.parent / 'monster-in-my-mind-site' / 'public' / 'world-routines'


def copy(src, dst, pattern='*'):
    if not src.exists():
        return 0
    dst.mkdir(parents=True, exist_ok=True)
    n = 0
    for f in src.glob(pattern):
        if f.is_file():
            shutil.copy2(f, dst / f.name)
            n += 1
    return n


dest.mkdir(parents=True, exist_ok=True)
# cards.html lives in puzzles/src and points at ../assets; on the site it sits beside assets/
html = (here / 'puzzles' / 'src' / 'cards.html').read_text(encoding='utf-8').replace('../assets/', 'assets/')
html = html.replace('src: local("Comic Relief Bold"), local("ComicRelief-Bold");', 'src: url("fonts/ComicRelief-Bold.ttf") format("truetype");')
html = html.replace('src: local("Comic Relief"), local("ComicRelief-Regular");', 'src: url("fonts/ComicRelief-Regular.ttf") format("truetype");')
(dest / 'cards.html').write_text(html, encoding='utf-8')
print('card art', copy(here / 'puzzles' / 'assets', dest / 'assets', 'card_bg.png'), copy(here / 'puzzles' / 'assets' / 'icons', dest / 'assets' / 'icons', '*.png'))
print('art', copy(here / 'web' / 'art', dest / 'art', '*.*'), copy(here / 'web' / 'art' / 'chars', dest / 'art' / 'chars', '*.png'))
print('audio', copy(here / 'web' / 'audio', dest / 'audio', '*.mp3'))
print('video', copy(here / 'web' / 'video', dest / 'video', '*.mp4'))
print('music', copy(here / 'web' / 'music', dest / 'music', '*.mp3'), 'art3d', copy(here / 'web' / 'art3d', dest / 'art3d', '*.png'))
fonts = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
print('fonts', copy(fonts, dest / 'fonts', 'ComicRelief-*.ttf'))
games = here / 'games'
for game in (games.glob('*/web') if games.exists() else []):
    target = dest / 'games' / game.parent.name
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(game, target, ignore=shutil.ignore_patterns('*.import', '.gdignore'))   # Godot editor files never go on the site
    print('game', game.parent.name)
