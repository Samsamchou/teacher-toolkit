"""Safari Count voices with edge-tts (same voices as World Routines web/make_audio.py):
country pupil = Ana (girl) / Christopher +50Hz (boy); the traveller (hero) = Jenny when the hero is a girl, Christopher +50Hz when a boy.
The buddy question has two versions: hero girl -> buddy boy (he), hero boy -> buddy girl (she).
  python web/make_audio.py [--force] [--v2]   -> web/audio/<station>-*.mp3 (version 2: web/audio_v2/)
<station>-like-clue-<g|b>.mp3 = the buddy's clue ("I love pandas!"); <station>-<animal>-qm.mp3 = the question with the animal hidden (played before the puzzle is solved)."""
import asyncio, json, sys
from pathlib import Path
import edge_tts
root = Path(__file__).resolve().parent
# --v2: Safari Count version 2 (teacher 11/27) -> content/stations_v2.json, web/audio_v2/ (same file names, served from /safari-count-2/audio)
V2 = '--v2' in sys.argv
bank = json.loads((root.parent / 'content' / ('stations_v2.json' if V2 else 'stations.json')).read_text(encoding='utf-8'))['stations']
BOY = dict(voice='en-US-ChristopherNeural', pitch='+50Hz', rate='-12%')
GIRL = dict(voice='en-US-AnaNeural', pitch='+0Hz', rate='-12%')
BUDDY_GIRL = dict(voice='en-GB-MaisieNeural', pitch='+0Hz', rate='-8%')
HERO = {'g': dict(voice='en-US-JennyNeural', pitch='+0Hz', rate='-12%'), 'b': BOY}
out = root / ('audio_v2' if V2 else 'audio'); out.mkdir(exist_ok=True)


async def say(text, name, v):
    p = out / f'{name}.mp3'
    if p.exists() and '--force' not in sys.argv: return
    await edge_tts.Communicate(text, v['voice'], pitch=v['pitch'], rate=v['rate']).save(str(p)); print(name, '|', text)


async def main():
    for s in bank:
        if s.get('comingSoon'): continue
        pv = GIRL if s['pupilVoice'] == 'girl' else BOY; sid = s['id']
        await say(s['welcome'], f'{sid}-welcome', pv)
        for it in s['items']:
            await say(it['question'], f"{sid}-{it['key']}-q", pv)
            # Before the puzzle is solved the animal is hidden (teacher 11/25): "Look! How many ... are there?"
            await say(it['question'].replace(it['plural'], '...'), f"{sid}-{it['key']}-qm", pv)
            for h in 'gb': await say(it['spoken'], f"{sid}-{it['key']}-a-{h}", HERO[h])
        L = s['like']; ans = 'does' if L['yes'] else "doesn't"
        for h, pro in (('g', 'he'), ('b', 'she')):
            await say(f"Does {pro} like {L['animal']}?", f'{sid}-like-q-{h}', pv)
            # A No answer goes on to say what the buddy does like (Japan: "No, he doesn't. He likes horses.").
            tail = f" {pro.capitalize()} likes {L['likes']}." if not L['yes'] and L.get('likes') else ''
            await say(f"{'Yes' if L['yes'] else 'No'}, {pro} {ans}.{tail}", f'{sid}-like-a-{h}', HERO[h])
            # The buddy's own words, the pupil's evidence for the answer (teacher 11/25): boy buddy = Christopher, girl buddy = Maisie
            # (a child voice that is not the country pupil's Ana).
            if L.get('clue'): await say(L['clue'], f'{sid}-like-clue-{h}', BOY if pro == 'he' else BUDDY_GIRL)
asyncio.run(main())
print(len(list(out.glob('*.mp3'))), 'files')
