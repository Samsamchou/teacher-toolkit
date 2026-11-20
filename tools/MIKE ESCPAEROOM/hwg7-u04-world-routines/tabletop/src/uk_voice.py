"""Voice lines for the UK homework film with word timings (edge-tts word boundaries) -> tabletop/audio/uk_*.mp3 + uk_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the UK pupil is a BOY (Christopher +50Hz), rate -12 %."""
import asyncio, json
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
BOY = ('en-US-ChristopherNeural', '+50Hz', '-12%')
LINES = {'q': ('What time do you do your homework?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I do my homework at four thirty.',) + BOY,
         'hw': ('This is my homework.',) + BOY,
         'rw': ('I read and write.',) + BOY,
         'tea': ('I do my homework at four thirty. Then I have tea.',) + BOY}


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'uk_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    (out / 'uk_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
