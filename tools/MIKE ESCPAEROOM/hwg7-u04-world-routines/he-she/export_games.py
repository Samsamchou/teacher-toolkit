"""Re-export the 4 Godot games after adding the he/she data files (STATION_MANUAL.md section 4.1: work on a C-drive copy).
  python he-she/export_games.py [game ...]
Per game: copy to %TEMP%/wrt_godot/<game> (no .godot, *.import, web, qa, art_source) -> import twice -> smoke tests:
good robot for every I country, good + bad robot for every he/she country -> export Web -> old games/<game>/web backed up
to tabletop/work/games_web_backup/<game>, new web copied back. Stops at the first failed test (web untouched)."""
import json, os, shutil, subprocess, sys
from pathlib import Path

GAMES = Path(__file__).resolve().parents[1] / 'games'
BACKUP = Path(__file__).resolve().parents[1] / 'tabletop' / 'work' / 'games_web_backup'
GODOT = r'C:\Users\User\Godot\Godot_v4.7.2-stable_win64_console.exe'
TMP = Path(os.environ['TEMP']) / 'wrt_godot'


def godot(path, *args, timeout=900):
    r = subprocess.run([GODOT, '--headless', '--path', str(path), *args], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout)
    return r.returncode, r.stdout + r.stderr


def one(game):
    src, work = GAMES / game, TMP / game
    if work.exists(): shutil.rmtree(work)
    shutil.copytree(src, work, ignore=shutil.ignore_patterns('.godot', '*.import', 'web', 'qa', 'art_source'))
    for _ in range(2): godot(work, '--import')
    countries = sorted(p.stem for p in (src / 'data').glob('*.json') if p.stem != 'rules')
    for c in countries:
        for mode in ([''] if not c.startswith('hs_') else ['', 'bad']):
            code, out = godot(work, '--script', 'res://scripts/qa_smoke.gd', '--', f'country={c}', *([mode] if mode else []))
            ok = 'QA_SMOKE_OK' in out
            tail = ' | '.join(l for l in out.splitlines() if 'QA_' in l or 'round' in l.lower())[-300:]
            print(f'{game} {c} {mode or "good"}: {"OK" if ok else "FAIL"}  {tail}', flush=True)
            if not ok and mode != 'bad':
                print(out[-2000:]); return False
    (work / 'web').mkdir(exist_ok=True)
    code, out = godot(work, '--export-release', 'Web', 'web/index.html')
    if not (work / 'web' / 'index.pck').exists():
        print('EXPORT FAILED', out[-1500:]); return False
    if (src / 'web').exists():
        if (BACKUP / game).exists(): shutil.rmtree(BACKUP / game)
        shutil.copytree(src / 'web', BACKUP / game)
        shutil.rmtree(src / 'web')
    shutil.copytree(work / 'web', src / 'web')
    print(f'{game} exported: index.pck {(src / "web" / "index.pck").stat().st_size / 1e6:.2f} MB', flush=True)
    return True


for g in (sys.argv[1:] or ['bento-catch', 'bus-dash', 'clock-ninja', 'luggage-belt']):
    if not one(g): print('STOP at', g); sys.exit(1)
print('ALL GAMES DONE')
