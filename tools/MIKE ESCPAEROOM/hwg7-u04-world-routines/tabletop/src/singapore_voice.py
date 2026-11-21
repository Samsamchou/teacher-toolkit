"""Voice lines for the Singapore bedtime film with word timings (edge-tts word boundaries) -> tabletop/audio/singapore_*.mp3 + singapore_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the Singapore pupil is a GIRL (Ana), rate -12 %.
"I brush my teeth and read a book." (teacher 11/20: ONE sentence over SG2 brushing + SG3 reading) is spoken once in one go and cut
between "teeth" and "and": singapore_teeth.mp3 plays in SG2, singapore_book.mp3 in SG3, so the intonation stays one sentence.
ASCII only."""
import asyncio, json, subprocess
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
GIRL = ('en-US-AnaNeural', '+0Hz', '-12%')
LINES = {'q': ('What time do you go to bed?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I go to bed at nine forty-five.',) + GIRL,
         'brushread': ('I brush my teeth and read a book.',) + GIRL,
         'gn': ('Good night!',) + GIRL}


def ff(*args):
    r = subprocess.run(['ffmpeg', '-y', '-nostdin', '-loglevel', 'error', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode: raise SystemExit(r.stderr[-1500:])


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'singapore_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    # cut the one sentence between "teeth" and "and" (in the middle of the little gap), short fades so there is no click
    ws = words['brushread']['words']
    k = next(i for i, w in enumerate(ws) if w[0].lower().startswith('teeth'))
    cut = round((ws[k][2] + ws[k + 1][1]) / 2, 3)
    src = str(out / 'singapore_brushread.mp3')
    ff('-i', src, '-af', f'atrim=0:{cut},afade=t=out:st={max(0.0, cut - 0.03):.3f}:d=0.03', str(out / 'singapore_teeth.mp3'))
    lead = cut                                                # the second part starts exactly at the cut (no tail of "teeth")
    ff('-i', src, '-af', f'atrim={lead}:,asetpts=PTS-STARTPTS,afade=t=in:d=0.02', str(out / 'singapore_book.mp3'))
    words['teeth'] = {'text': 'I brush my teeth', 'words': ws[:k + 1]}
    words['book'] = {'text': 'and read a book.', 'words': [[w, round(a - lead, 3), round(b - lead, 3)] for w, a, b in ws[k + 1:]]}
    print('cut at', cut, 's: teeth', ws[k][2], '| book starts', round(ws[k + 1][1] - lead, 3), 'ends', round(ws[-1][2] - lead, 3))
    (out / 'singapore_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main())
