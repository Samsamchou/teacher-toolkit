"""Voice lines for the he/she Taiwan film "She gets up at six thirty." with word timings (edge-tts word boundaries)
-> tabletop/audio/hs_taiwan_*.mp3 + hs_taiwan_words.json
Anchor (asks, off screen) = Jenny, the website's question voice; reporter (answers, off screen) = Ana; both -12 %.
Mei herself does not speak in the he/she films."""
import asyncio, json
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
ANCHOR, REPORTER = ('en-US-JennyNeural', '+0Hz', '-12%'), ('en-US-AnaNeural', '+0Hz', '-12%')
LINES = {'q': ('This is Mei. What time does she get up?',) + ANCHOR,
         'a': ('She gets up at six thirty.',) + REPORTER,
         'ring': ('Her alarm clock rings at six thirty.',) + REPORTER,
         'brush': ('She brushes her teeth',) + REPORTER,
         'uniform': ('and puts on her school uniform.',) + REPORTER,
         'bf': ('Then she has breakfast at six forty-five.',) + REPORTER}


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'hs_taiwan_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    (out / 'hs_taiwan_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
