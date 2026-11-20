"""Voice lines for the Egypt breakfast film with word timings (edge-tts word boundaries) -> tabletop/audio/egypt_*.mp3 + egypt_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the Egyptian pupil is a BOY (Christopher +50Hz), rate -12 %.
Teacher 11/20: no local-language line (0A); EG2 says "I eat ful and ta'ameya." (2B). EG4 repeats the answer line 'a'."""
import asyncio, json
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
BOY = ('en-US-ChristopherNeural', '+50Hz', '-12%')
LINES = {'q': ('What time do you have breakfast?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I have breakfast at six thirty-five.',) + BOY,
         'eat': ("I eat ful and ta'ameya.",) + BOY}


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'egypt_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    (out / 'egypt_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
