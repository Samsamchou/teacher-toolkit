"""Voice lines for the Japan lunch film with word timings (edge-tts word boundaries) -> tabletop/audio/japan_*.mp3 + japan_words.json
Same voices as the website (web/make_audio.py): Jenny asks, Christopher +50 Hz is the boy, rate -12 %."""
import asyncio, json
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
LINES = {'q': ('What time do you have lunch?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I have lunch at twelve fifteen.', 'en-US-ChristopherNeural', '+50Hz', '-12%'),
         'serve': ('I serve lunch to my classmates.', 'en-US-ChristopherNeural', '+50Hz', '-12%'),
         'eat': ('I eat lunch in my classroom. I eat rice, fish and miso soup.', 'en-US-ChristopherNeural', '+50Hz', '-12%'),
         'itadaki': ('いただきます！', 'ja-JP-KeitaNeural', '+50Hz', '-5%')}


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'japan_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
    (out / 'japan_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
