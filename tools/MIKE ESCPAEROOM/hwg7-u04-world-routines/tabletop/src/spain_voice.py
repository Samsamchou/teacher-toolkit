"""Voice lines for the Spain dinner film with word timings (edge-tts word boundaries) -> tabletop/audio/spain_*.mp3 + spain_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the Spanish pupil is a GIRL (Ana), rate -12 %.
Teacher 11/20: no local-language line (0A); SP2 says the content-file sentence (2B)."""
import asyncio, json
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
GIRL = ('en-US-AnaNeural', '+0Hz', '-12%')
LINES = {'q': ('What time do you have dinner?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I have dinner at nine fifteen.',) + GIRL,
         'eat': ('I eat a tortilla and salad with my family.',) + GIRL,
         'late': ("I have dinner at nine fifteen. It's late!",) + GIRL}


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'spain_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    (out / 'spain_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
