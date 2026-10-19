"""build_voice.py — 試片旁白：edge-tts 逐句合成（WordBoundary 取每個字的時間），排成時間軸。
輸出：lines/*.mp3、voice.wav（48 kHz 單聲道）、timeline.json（句、字、時間）。
另輸出中文聲線比較樣本 samples/zh-*.mp3。用法：python -I build_voice.py
"""
import asyncio, json, pathlib, subprocess
import numpy as np, edge_tts

HERE = pathlib.Path(__file__).resolve().parent
SR = 48000
VOICE = 'en-US-AvaMultilingualNeural'   # Ms. Nova：同一個聲音可說英文與中文
RATE = '-8%'
GAP = 0.45
LINES = [  # (文字, 畫面事件 key)
    ("Hi, class! I'm Ms. Nova.", 'hello'),
    ("Let's learn a day of the week.", 'intro'),
    ("Look at this word. Sunday!", 'word'),
    ("The letter U says uh, uh. Sun!", 'sun'),
    ("A and Y say A, A. Day!", 'day'),
    ("Sun, day. Sunday! Say it with me. Sunday!", 'blend'),
    ("Sunday 是星期日。", 'zh'),
]

async def synth(text, voice, f):
    words = []
    with open(f, 'wb') as fh:
        async for ch in edge_tts.Communicate(text, voice, rate=RATE, boundary='WordBoundary').stream():
            if ch['type'] == 'audio': fh.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'w': ch['text'], 't0': ch['offset'] / 1e7, 't1': (ch['offset'] + ch['duration']) / 1e7})
    return words

def decode(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

async def main():
    (HERE / 'lines').mkdir(exist_ok=True); (HERE / 'samples').mkdir(exist_ok=True)
    t = 0.8; out = []; lines = []
    for i, (text, key) in enumerate(LINES, 1):
        f = HERE / 'lines' / f'{i:02d}.mp3'
        words = await synth(text, VOICE, f)
        a = decode(f); loud = np.where(np.abs(a) > 0.01)[0]
        s0, s1 = max(0, loud[0] - int(.03 * SR)), min(len(a), loud[-1] + int(.08 * SR)); lead = s0 / SR
        a = a[s0:s1]; dur = len(a) / SR
        out.append((t, a))
        lines.append({'i': i, 'key': key, 'text': text, 't0': round(t, 3), 't1': round(t + dur, 3),
                      'words': [{'w': w['w'], 't0': round(t + w['t0'] - lead, 3), 't1': round(t + w['t1'] - lead, 3)} for w in words]})
        print(i, round(dur, 2), [w['w'] for w in words])
        t += dur + GAP
    total = t + 1.0
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for t0, a in out: k = int(round(t0 * SR)); buf[k:k + len(a)] += a
    buf = buf[:int(total * SR)]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(HERE / 'voice.wav')],
                   input=(np.clip(buf, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
    (HERE / 'timeline.json').write_text(json.dumps({'dur': round(total, 3), 'voice': VOICE, 'rate': RATE, 'lines': lines}, ensure_ascii=False, indent=1), encoding='utf-8')
    print('total', round(total, 2))
    # 中文聲線比較：同一個多語聲音 vs 台灣口音曉臻
    for v in ('en-US-AvaMultilingualNeural', 'zh-TW-HsiaoChenNeural'):
        await synth('Sunday 是星期日。It\'s 等於 It is。', v, HERE / 'samples' / f'zh-{v}.mp3')

asyncio.run(main())
