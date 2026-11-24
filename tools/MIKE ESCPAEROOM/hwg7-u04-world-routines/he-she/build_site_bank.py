"""he/she website (/world-routines-he-she): question bank + site audio.
  python he-she/build_site_bank.py
-> ../monster-in-my-mind-site/functions/routines-hs-content.json  (stations, read by the callables and the pages)
-> web/audio/hs/<station>-q.mp3 / -a.mp3 / -x1.mp3 ...         (the films' own voice lines: anchor Jenny asks, reporter Ana answers)
Texts follow he-she/關卡2_文字稿與教材清單_20261123.md (teacher-approved 11/23); the displayed extended lines use digits for
times, the audio says them in words. Puzzle types = I version's types moved two stations on (he-she/render_cards.py)."""
import json, shutil, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SITE = ROOT.parent.parent / 'monster-in-my-mind-site'
I_BANK = SITE / 'functions' / 'routines-content.json'
OUT_BANK = SITE / 'functions' / 'routines-hs-content.json'
VOICE = ROOT / 'tabletop' / 'audio'
AUDIO = ROOT / 'web' / 'audio' / 'hs'

# id: name, pronoun, question verb phrase, display, spoken, code, mode, puzzle, [(extended display, [voice keys])], drag
ST = {
    'taiwan': ('Mei', 'she', 'get up', 'She gets up at 6:30.', 'She gets up at six thirty.', '0630', 'drag', 'homo',
               [('Her alarm clock rings at 6:30.', ['ring']), ('She brushes her teeth and puts on her school uniform.', ['brush', 'uniform']),
                ('Then she has breakfast at 6:45.', ['bf'])],
               {'slots': ['does', 'get', 'up'], 'distractors': ['do', 'gets', 'have']}),
    'japan': ('Haruto', 'he', 'take a shower', 'He takes a shower at 8:20.', 'He takes a shower at eight twenty.', '2020', 'speak', 'seg',
              [('First, he washes in the shower.', ['wash']), ("Then he sits in the hot bath. It's called ofuro.", ['bath']),
               ('He goes to bed at 9:00.', ['bed'])], None),
    'usa': ('Emma', 'she', 'have lunch', 'She has lunch at 11:30.', 'She has lunch at eleven thirty.', '1130', 'speak', 'utopia',
            [('She eats lunch in the school cafeteria.', ['cafe']), ('She has a sandwich, an apple and milk.', ['food']),
             ('Lunch is only 25 minutes!', ['min'])], None),
    'uk': ('Oliver', 'he', 'go home', 'He goes home at 3:15.', 'He goes home at three fifteen.', '1515', 'drag', 'keypad',
           [('School ends at 3:15.', ['ends']), ('His dad walks him home.', ['dad']), ('He has a snack, and then he does his homework.', ['snack'])],
           {'slots': ['does', 'go', 'home'], 'distractors': ['do', 'goes', 'bed']}),
    'spain': ('Lucia', 'she', 'have lunch', 'She has lunch at 2:00.', "She has lunch at two o'clock.", '1400', 'speak', 'mirror',
              [('Lunch is her big meal. She eats soup, fish and fruit with her family.', ['eat']), ('Then she rests for a while.', ['rest'])], None),
    'egypt': ('Omar', 'he', 'go to school', 'He goes to school at 7:10.', 'He goes to school at seven ten.', '0710', 'speak', 'shape',
              [('School starts at 7:30.', ['starts']), ('He walks to school with his big sister.', ['walk']),
               ('He carries his school bag on his back.', ['bag'])], None),
    'kenya': ('Amani', 'she', 'have dinner', 'She has dinner at 7:30.', 'She has dinner at seven thirty.', '1930', 'drag', 'homo',
              [('Her family eats dinner together.', ['fam']), ('She eats ugali and sukuma wiki.', ['eat']), ('Ugali is made from white corn flour.', ['flour'])],
              {'slots': ['does', 'have', 'dinner'], 'distractors': ['do', 'has', 'lunch']}),
    'india': ('Arjun', 'he', 'play cricket', 'He plays cricket at 5:00.', "He plays cricket at five o'clock.", '1700', 'speak', 'seg',
              [('He plays cricket with his friends in the street.', ['friends']), ('A school bag is the wicket!', ['bag']),
               ('He goes home at 6:30.', ['home'])], None),
    'singapore': ('Ling', 'she', 'study English', 'She studies English at 4:00.', "She studies English at four o'clock.", '1600', 'drag', 'mirror',
                  [('She goes to an English class after school.', ['class']), ('She reads a story and writes new words.', ['read']),
                   ('She goes home at 6:00.', ['home'])],
                  {'slots': ['does', 'study'], 'distractors': ['do', 'studies', 'studys']}),
    'australia': ('Jack', 'he', 'do his homework', 'He does his homework at 4:45.', 'He does his homework at four forty-five.', '1645', 'speak', 'shape',
                  [('He plays soccer after school.', ['soccer']), ('Then he does his homework at the kitchen table.', ['table']),
                   ('It takes 20 minutes.', ['twenty'])], None),
}


def join_mp3(keys, sid, dst):
    srcs = [VOICE / f'hs_{sid}_{k}.mp3' for k in keys]
    if not all(s.exists() for s in srcs):
        return False
    if len(srcs) == 1:
        shutil.copyfile(srcs[0], dst); return True
    lst = dst.with_suffix('.txt')
    lst.write_text(''.join(f"file '{s.as_posix()}'\n" for s in srcs), encoding='utf-8')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c:a', 'libmp3lame', '-q:a', '3', str(dst)], check=True)
    lst.unlink(); return True


def main():
    base = {s['id']: s for s in json.loads(I_BANK.read_text(encoding='utf-8'))['stations']}
    AUDIO.mkdir(parents=True, exist_ok=True)
    stations, missing = [], []
    for sid, (name, pron, verb, display, spoken, code, mode, puzzle, ext, drag) in ST.items():
        b = base[sid]
        st = {'id': sid, 'order': b['order'], 'country': b['country'], 'transport': b['transport'], 'name': name, 'pronoun': pron,
              'routine': verb, 'question': f'This is {name}. What time does {pron} {verb}?', 'code': code,
              'hour': int(code[:2]), 'minute': int(code[2:]), 'display': display, 'spoken': spoken,
              'extended': [t for t, _ in ext], 'mode': mode, 'puzzle': puzzle, 'game': b['game']}
        if drag: st['drag'] = drag
        stations.append(st)
        for key, dst in [(['q'], f'{sid}-q.mp3'), (['a'], f'{sid}-a.mp3')] + [(keys, f'{sid}-x{i}.mp3') for i, (_, keys) in enumerate(ext, 1)]:
            if not join_mp3(key, sid, AUDIO / dst): missing.append(dst)
    OUT_BANK.write_text(json.dumps({'version': 1, 'variant': 'hs', 'stations': stations}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('bank', OUT_BANK.name, len(stations), 'stations; audio files', len(list(AUDIO.glob('*.mp3'))))
    if missing: print('MISSING voice (not made yet):', ' '.join(missing))


main()
