"""Voice lines for the India "go home" film with word timings (edge-tts word boundaries) -> tabletop/audio/india_*.mp3 + india_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the Indian pupil is a BOY (Christopher +50Hz), rate -12 %.
Teacher 11/20: no local-language line (0A); auto-rickshaw (2B): IN4 says "I go home by auto-rickshaw.";
teacher 11/20 late night: IN3 says "Here it comes!", no driver. IN4 repeats the answer line 'a'.
edge-tts calls have a 60 s timeout and 10 tries (shared pitfall rule 10.5)."""
import asyncio, json, subprocess
from pathlib import Path
import edge_tts

out = Path(__file__).resolve().parents[1] / 'audio'
BOY = ('en-US-ChristopherNeural', '+50Hz', '-12%')
LINES = {'q': ('What time do you go home?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I go home at two forty.',) + BOY,
         'empty': ('My tiffin box is empty!',) + BOY,
         'comes': ('Here it comes!',) + BOY,
         'by': ('I go home by auto-rickshaw.',) + BOY}


async def one(key, text, voice, pitch, rate):
    for attempt in range(10):
        try:
            com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
            audio, ws = bytearray(), []

            async def pull():
                async for ch in com.stream():
                    if ch['type'] == 'audio': audio.extend(ch['data'])
                    elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
            await asyncio.wait_for(pull(), 60)
            if not audio: raise RuntimeError('no audio')
            (out / f'india_{key}.mp3').write_bytes(bytes(audio))
            return ws
        except Exception as e:
            print(key, 'try', attempt + 1, 'failed:', e)
    raise SystemExit(f'{key}: edge-tts failed 10 times')


def length(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True)
    return float(r.stdout.strip())


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        ws = await one(key, text, voice, pitch, rate)
        words[key] = {'text': text, 'words': ws, 'len': round(length(out / f'india_{key}.mp3'), 3)}
        print(key, 'words end', round(ws[-1][2], 2) if ws else '-', 'file', words[key]['len'], text, [w[0] for w in ws])
    (out / 'india_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')

asyncio.run(main())
