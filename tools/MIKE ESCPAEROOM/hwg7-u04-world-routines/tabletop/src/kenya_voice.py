"""Voice lines for the Kenya "get up" film with word timings (edge-tts word boundaries) -> tabletop/audio/kenya_*.mp3 + kenya_words.json
Same voices as the website (web/make_audio.py): Jenny asks, the Kenyan pupil is a GIRL (en-US-AnaNeural +0Hz), rate -12 %.
Teacher 11/20: no local-language line (0A); KE2 "It's dark!", KE3 "Good morning!"; teacher 11/20 late night (1B):
KE4 second line is the content-file sentence "I drink tea and eat mandazi." (replaces "I eat mandazi.").
KE4 order follows that sentence: first the sip of tea, then the bite of mandazi. The sentence is made ONCE (natural prosody) and
cut in the pause between "tea" and "and" into kenya_tea1.mp3 ("I drink tea") and kenya_tea2.mp3 ("and eat mandazi."), so that
kenya_compose.py can start "I drink tea" on the sip and "and eat mandazi" on the bite. 'yawn' is a soft yawn sound for KE2 (no subtitle).
edge-tts calls have a 60 s timeout and 10 tries (shared pitfall rule 10.5)."""
import asyncio, json, subprocess
from pathlib import Path
import numpy as np
import edge_tts

out = Path(__file__).resolve().parents[1] / 'audio'
GIRL = ('en-US-AnaNeural', '+0Hz', '-12%')
LINES = {'q': ('What time do you get up?', 'en-US-JennyNeural', '+0Hz', '-12%'),
         'a': ('I get up at five forty.',) + GIRL,
         'dark': ("It's dark!",) + GIRL,
         'gm': ('Good morning!',) + GIRL,
         'tea': ('I drink tea and eat mandazi.',) + GIRL,
         'yawn': ('Haaaah... hmm.', 'en-US-AnaNeural', '+0Hz', '-30%')}
SR = 24000


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
            (out / f'kenya_{key}.mp3').write_bytes(bytes(audio))
            return ws
        except Exception as e:                       # NoAudioReceived / timeouts: try again
            print(key, 'try', attempt + 1, 'failed:', e)
    raise SystemExit(f'{key}: edge-tts failed 10 times')


def pcm(path):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.float32)


def length(path):
    return len(pcm(path)) / SR


def split_tea(ws):
    """Cut kenya_tea.mp3 in the quietest 40 ms between the end of "tea" and the start of "and" (word times can be ~0.16 s early)."""
    x = pcm(out / 'kenya_tea.mp3')
    i_tea = next(i for i, w in enumerate(ws) if w[0].strip(',.!?').lower() == 'tea')
    a, b = ws[i_tea][2] - 0.05, ws[i_tea + 1][1] + 0.25
    win = int(0.04 * SR); best, cut = None, None
    for s in range(int(a * SR), int(b * SR) - win, int(0.005 * SR)):
        e = float(np.sqrt(np.mean(x[s:s + win] ** 2)))
        if best is None or e < best: best, cut = e, (s + win / 2) / SR
    for key, ss, to in (('tea1', 0.0, cut), ('tea2', cut, None)):
        cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(out / 'kenya_tea.mp3'), '-ss', f'{ss:.3f}'] + (['-to', f'{to:.3f}'] if to else []) + \
              ['-af', 'afade=t=in:d=0.01' if ss > 0 else 'anull', '-c:a', 'libmp3lame', '-q:a', '2', str(out / f'kenya_{key}.mp3')]
        subprocess.run(cmd, check=True)
    w1 = [w for w in ws[:i_tea + 1]]
    w2 = [[w[0], round(w[1] - cut, 3), round(w[2] - cut, 3)] for w in ws[i_tea + 1:]]
    print('tea cut at %.3f s (rms %.4f)' % (cut, best))
    return cut, w1, w2


async def main():
    words = {}
    for key, (text, voice, pitch, rate) in LINES.items():
        ws = await one(key, text, voice, pitch, rate)
        words[key] = {'text': text, 'words': ws, 'len': round(length(out / f'kenya_{key}.mp3'), 3)}
        print(key, 'words end', round(ws[-1][2], 2) if ws else '-', 'file', words[key]['len'], text)
    cut, w1, w2 = split_tea(words['tea']['words'])
    words['tea1'] = {'text': 'I drink tea', 'words': w1, 'len': round(length(out / 'kenya_tea1.mp3'), 3), 'cut': round(cut, 3)}
    words['tea2'] = {'text': 'and eat mandazi.', 'words': w2, 'len': round(length(out / 'kenya_tea2.mp3'), 3)}
    for k in ('tea1', 'tea2'): print(k, words[k]['len'], [w[0] for w in words[k]['words']])
    (out / 'kenya_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')

asyncio.run(main())
