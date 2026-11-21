"""Voice lines for the USA school-bus film with word timings (edge-tts word boundaries) -> tabletop/audio/usa_*.mp3 + usa_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the USA pupil is a GIRL (teacher 11/20) -> Ana, rate -12 %.
Lines follow functions/routines-content.json (usa): question, spoken answer, extended[0].
  python tabletop/src/usa_voice.py            (all lines)
  python tabletop/src/usa_voice.py a gm       (only these keys; the others stay as they are in usa_words.json)
edge-tts sometimes hangs or returns NoAudioReceived: every line has a 60 s timeout and up to 10 tries (shared pitfall rule 10.5)."""
import asyncio, json, sys
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
GIRL = ('en-US-AnaNeural', '+0Hz', '-12%')
LINES = {'q': ('What time do you go to school?', 'en-US-JennyNeural', '+0Hz', '-12%'),   # U1, the traveller asks
         'a': ('I go to school at seven thirty-five.',) + GIRL,                         # U1, the pupil answers
         'gm': ('Good morning! Here comes the bus!',) + GIRL,                           # U3, waving, the bus pulls in
         'a2': ('I go to school at seven thirty-five.',) + GIRL,                        # U4, said again at the bus door
         'bus': ('I go to school by school bus. The bus is yellow.',) + GIRL}           # U4, extended sentence (site: extended[0])


async def one(key, text, voice, pitch, rate):
    for attempt in range(10):
        try:
            ws, audio = [], bytearray()

            async def run():
                com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
                async for ch in com.stream():
                    if ch['type'] == 'audio': audio.extend(ch['data'])
                    elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
            await asyncio.wait_for(run(), 60)
            if not audio or not ws: raise RuntimeError('no audio / no word boundaries')
            (out / f'usa_{key}.mp3').write_bytes(bytes(audio))
            return ws
        except Exception as e:
            print('retry', key, attempt + 1, repr(e)[:120], flush=True)
            await asyncio.sleep(2)
    raise SystemExit('edge-tts failed: ' + key)


async def main():
    keys = sys.argv[1:] or list(LINES)
    wj = out / 'usa_words.json'
    words = json.loads(wj.read_text(encoding='utf-8')) if wj.exists() else {}
    for key in keys:
        text, voice, pitch, rate = LINES[key]
        ws = await one(key, text, voice, pitch, rate)
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2), text, flush=True)
    wj.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
