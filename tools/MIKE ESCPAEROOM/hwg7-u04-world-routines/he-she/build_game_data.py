"""he/she trip: game settings for the 4 Godot games (teacher 11/24: clock rounds use the he/she times).
  python he-she/build_game_data.py
Writes games/<game>/data/hs_<station>.json from the I version's data/<station>.json (same art, same game); the page opens the
game with ?country=hs_<station>. The I version's own data files are not touched.
  round 1 = this station's he/she time; review rounds = he/she times of the stations before it; the other rounds stay.
Then run each game's tools/make_audio.py --voice-only (adds the missing audio/times/HHMM.mp3) and re-export."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAMES = HERE.parent / 'games'
BANK = HERE.parent.parent.parent / 'monster-in-my-mind-site' / 'functions' / 'routines-hs-content.json'


def clock(h, m):
    return f'{h % 12 or 12}:{m:02d}'


def main():
    stations = json.loads(BANK.read_text(encoding='utf-8'))['stations']
    for st in stations:
        src = GAMES / st['game'] / 'data' / f"{st['id']}.json"
        cfg = json.loads(src.read_text(encoding='utf-8'))
        h, m = st['hour'], st['minute']
        target = clock(h, m)
        wrong = [t for t in (clock(h, (m + 15) % 60), clock(h + 1, m), clock(h, (m + 30) % 60)) if t != target][:2]
        rest = [r for r in cfg['clock_rounds'][1:] if r['time'] != target]
        cfg.update({'country': f"hs_{st['id']}", 'subtitle': f"What time does {st['name']} {st['routine']}?", 'target_time': target,
                    'clock_rounds': [{'time': target, 'distractors': wrong}] + rest,
                    'review_times': [clock(p['hour'], p['minute']) for p in stations if p['order'] < st['order']]})
        dst = src.with_name(f"hs_{st['id']}.json")
        dst.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(st['game'], dst.name, target, wrong, 'review', cfg['review_times'])


main()
