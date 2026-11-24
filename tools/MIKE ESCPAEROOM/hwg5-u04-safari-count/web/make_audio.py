"""Safari Count voices with edge-tts (same voices as World Routines web/make_audio.py):
country pupil = Ana (girl) / Christopher +50Hz (boy); the traveller (hero) = Jenny when the hero is a girl, Christopher +50Hz when a boy.
The buddy question has two versions: hero girl -> buddy boy (he), hero boy -> buddy girl (she).
  python web/make_audio.py [--force]   -> web/audio/<station>-*.mp3"""
import asyncio, json, sys
from pathlib import Path
import edge_tts
root = Path(__file__).resolve().parent
bank = json.loads((root.parent / 'content' / 'stations.json').read_text(encoding='utf-8'))['stations']
BOY = dict(voice='en-US-ChristopherNeural', pitch='+50Hz', rate='-12%')
GIRL = dict(voice='en-US-AnaNeural', pitch='+0Hz', rate='-12%')
HERO = {'g': dict(voice='en-US-JennyNeural', pitch='+0Hz', rate='-12%'), 'b': BOY}
out = root / 'audio'; out.mkdir(exist_ok=True)


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
            for h in 'gb': await say(it['spoken'], f"{sid}-{it['key']}-a-{h}", HERO[h])
        L = s['like']; ans = 'does' if L['yes'] else "doesn't"
        for h, pro in (('g', 'he'), ('b', 'she')):
            await say(f"Does {pro} like {L['animal']}?", f'{sid}-like-q-{h}', pv)
            await say(f"{'Yes' if L['yes'] else 'No'}, {pro} {ans}.", f'{sid}-like-a-{h}', HERO[h])
asyncio.run(main())
print(len(list(out.glob('*.mp3'))), 'files')
