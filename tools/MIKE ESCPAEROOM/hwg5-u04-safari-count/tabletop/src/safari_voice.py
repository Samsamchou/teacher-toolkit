"""Answer lines for the 12 Safari Count films, with word timings (edge-tts word boundaries).
  python tabletop/src/safari_voice.py [station ...]   -> tabletop/audio/<station>_<key>_a.mp3 + safari_words.json
Spec 4C (rdq/RDQ-spec-safari-count-animations-20261125.md): each film says its answer sentence ("There are two bears.").
Voice: Jenny, rate -12 % (the website's traveller voice, web/make_audio.py). ASCII only."""
import asyncio, json, sys
from pathlib import Path
import edge_tts
ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'audio'; out.mkdir(exist_ok=True)
bank = json.loads((ROOT.parent / 'content' / 'stations.json').read_text(encoding='utf-8'))['stations']
VOICE = ('en-US-JennyNeural', '+0Hz', '-12%')
WJ = out / 'safari_words.json'
# 11/25: singular answers are 'There is one ___.' (website spec RDQ-spec-safari-count-question-fixes, teacher-approved)
# Stations still 'comingSoon' in stations.json: answer lines from the approved script (謎題總表與對話稿_v1, 12段動作表_v1)
EXTRA = {'japan': [('lions', 'There are five lions.'), ('horses', 'There are six horses.')],
         'kenya': [('zebras', 'There are eight zebras.'), ('rhino', 'There is one rhino.')],
         'india': [('tigers', 'There are two tigers.'), ('monkeys', 'There are seven monkeys.')],
         'singapore': [('elephants', 'There are four elephants.'), ('turtles', 'There are nine turtles.')],
         'australia': [('koalas', 'There are three koalas.'), ('lion', 'There is one lion.')]}


async def main():
    words = json.loads(WJ.read_text(encoding='utf-8')) if WJ.exists() else {}
    want = sys.argv[1:]
    for s in bank:
        if want and s['id'] not in want: continue
        items = [(it['key'], it['spoken']) for it in s.get('items', [])] or EXTRA.get(s['id'], [])
        for k_, text in items:
            key = f"{s['id']}_{k_}_a"
            com = edge_tts.Communicate(text, VOICE[0], pitch=VOICE[1], rate=VOICE[2], boundary='WordBoundary')
            ws = []
            with open(out / f'{key}.mp3', 'wb') as fh:
                async for ch in com.stream():
                    if ch['type'] == 'audio': fh.write(ch['data'])
                    elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
            words[key] = {'text': text, 'words': ws}
            print(key, round(ws[-1][2], 2) if ws else '-', text)
    WJ.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
