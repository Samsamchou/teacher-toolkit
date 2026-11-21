"""Voice lines for the Australia shower film with word timings (edge-tts word boundaries) -> tabletop/audio/australia_*.mp3 + australia_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the Australia pupil is a BOY (Christopher +50Hz), rate -12 %.
AU4 "La la la" (teacher 11/20, 3A: about 2 s of humming, head sways, no drawn mouth): the boy voice says "La la la, la la la!"
a little slower, then each syllable is pitch-shifted to a small happy tune (asetrate + atempo keeps the length), so it sounds sung.
ASCII only."""
import asyncio, json, subprocess, tempfile
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
BOY = ('en-US-ChristopherNeural', '+50Hz', '-12%')
LINES = {'q': ('What time do you take a shower?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I take a shower at seven fifteen.',) + BOY,
         'soccer': ('I play soccer after school.',) + BOY,
         'four': ("It's a four-minute shower!",) + BOY,
         'sing': ('I sing a song!',) + BOY,
         'laraw': ('La la la, la la la!', 'en-US-ChristopherNeural', '+50Hz', '-30%')}
TUNE = [0, 2, 4, 0, 4, 7]        # semitones per syllable (do re mi do mi so)


def ff(*args):
    r = subprocess.run(['ffmpeg', '-y', '-nostdin', '-loglevel', 'error', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode: raise SystemExit(r.stderr[-1500:])


def sing(words):
    """Pitch-shift each "la" to the tune; the gaps stay where they were."""
    tmp = Path(tempfile.mkdtemp(prefix='au_la_'))
    src = str(out / 'australia_laraw.mp3')
    ins, flt = [], []
    for i, (w, a, b) in enumerate(words):
        a0 = max(0.0, a - 0.02); b0 = b + 0.04
        r = 2 ** (TUNE[i % len(TUNE)] / 12.0)
        seg = tmp / f's{i}.wav'
        ff('-i', src, '-af', f'atrim={a0:.3f}:{b0:.3f},asetpts=PTS-STARTPTS,aresample=48000,asetrate={48000 * r:.1f},aresample=48000,atempo={1 / r:.5f},'
           f'afade=t=in:d=0.015,afade=t=out:st={max(0.0, b0 - a0 - 0.04):.3f}:d=0.04', str(seg))
        ins += ['-i', str(seg)]; ms = int(a0 * 1000); flt.append(f'[{i}:a]adelay={ms}|{ms}[s{i}]')
    flt.append(''.join(f'[s{i}]' for i in range(len(words))) + f'amix=inputs={len(words)}:normalize=0[o]')
    ff(*ins, '-filter_complex', ';'.join(flt), '-map', '[o]', '-ar', '24000', '-ac', '1', str(out / 'australia_la.mp3'))


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'australia_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    sing(words['laraw']['words'])
    words['la'] = dict(words['laraw'])
    print('la', words['la']['words'][-1][2], '(sung)')
    (out / 'australia_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
