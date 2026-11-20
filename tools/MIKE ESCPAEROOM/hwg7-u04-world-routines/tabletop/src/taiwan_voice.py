"""Voice lines for the Taiwan breakfast film with word timings (edge-tts word boundaries) -> tabletop/audio/taiwan_*.mp3 + taiwan_words.json
Same voices as the website (web/make_audio.py): Jenny asks, Ana is the Taiwanese girl, rate -12 %. "Zao an" is a Taiwan Mandarin girl's voice."""
import asyncio, json
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
LINES = {'q': ('What time do you have breakfast?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I have breakfast at six forty-five.', 'en-US-AnaNeural', '+0Hz', '-12%'),
         'get': ('I get my breakfast at the breakfast shop.', 'en-US-AnaNeural', '+0Hz', '-12%'),
         'zaoan': ('早安！', 'zh-TW-HsiaoChenNeural', '+30Hz', '-5%'),
         'gm': ('Good morning!', 'en-US-AnaNeural', '+0Hz', '-12%'),
         'eat': ('I eat egg pancakes and drink soy milk. I have breakfast at six forty-five.', 'en-US-AnaNeural', '+0Hz', '-12%')}


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'taiwan_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    (out / 'taiwan_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
