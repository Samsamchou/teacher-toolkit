"""build_voice_v2.py — 試片 v2 的聲音時間軸（規格卡 r1）。
- Nova 英文：en-US-AvaNeural（純英文聲音）；中文：zh-TW-HsiaoChenNeural（曉臻，台灣口音）。
- 母音／組合音：用試聽帶 v4 定案的音檔（phonics-audio/processed/*.wav），由全息螢幕發音按鈕播放。
- 帶唸：示範一次 →「Say it with me.」→ 播音＋留 2 秒給學生跟唸，兩輪；整字也帶唸兩輪。
輸出：segs/*.mp3、voice_v2.wav、timeline_v2.json。用法：python -I build_voice_v2.py
"""
import asyncio, json, pathlib, subprocess
import numpy as np, edge_tts, soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
PA = HERE.parent / 'phonics-audio' / 'processed'
SR = 48000
EN, ZH = 'en-US-AvaNeural', 'zh-TW-HsiaoChenNeural'
RATE = '-20%'; GAP = 0.45; TURN = 2.0   # 2026-10-19 老師：Nova 語速 0.8 倍（英文與中文都套用）
SEQ = [  # (種類, 事件 key, 內容)
 ('say', 'hello', "Hi, class! I'm Ms. Nova."),
 ('say', 'intro', "Let's learn a day of the week."),
 ('say', 'word', "Look at this word. Sunday!"),
 ('say', 'u_intro', "Look at the letter U. Listen."),
 ('sound', 'u_demo', 'short-u-1'),
 ('say', 'u_with', "Say it with me."),
 ('sound', 'u_r1', 'short-u-1'), ('turn', 'u_r1', 'u'),
 ('sound', 'u_r2', 'short-u-1'), ('turn', 'u_r2', 'u'),
 ('say', 'sun', "Great job! Sun!"),
 ('say', 'ay_intro', "Now look at A and Y. Listen."),
 ('sound', 'ay_demo', 'En-us-A_upper'),
 ('say', 'ay_with', "Say it with me."),
 ('sound', 'ay_r1', 'En-us-A_upper'), ('turn', 'ay_r1', 'ay'),
 ('sound', 'ay_r2', 'En-us-A_upper'), ('turn', 'ay_r2', 'ay'),
 ('say', 'day', "Great job! Day!"),
 ('say', 'blend', "Now the whole word. Sun, day. Sunday!"),
 ('say', 'w_r1', "Say it with me. Sunday!"), ('turn', 'w_r1', 'word'),
 ('say', 'w_r2', "Sunday!"), ('turn', 'w_r2', 'word'),
 ('zh', 'zh', "Sunday 是星期日。"),
]
SOUND_VIS = {'short-u-1': ['M02_A'], 'En-us-A_upper': ['M08_mid', 'M03_E']}

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
    return np.frombuffer(raw, np.float32).copy()

def trim(a):
    loud = np.where(np.abs(a) > 0.01)[0]; s0, s1 = max(0, loud[0] - int(.03 * SR)), min(len(a), loud[-1] + int(.08 * SR))
    return a[s0:s1], s0 / SR

async def main():
    (HERE / 'segs').mkdir(exist_ok=True)
    t = 0.8; out = []; segs = []; prev = None
    for i, (kind, key, val) in enumerate(SEQ, 1):
        if prev is not None and not (prev == 'sound' and kind == 'turn'): t += GAP
        if kind in ('say', 'zh'):
            f = HERE / 'segs' / f'{i:02d}-{key}.mp3'
            words = await synth(val, EN if kind == 'say' else ZH, f)
            a, lead = trim(decode(f)); a = a * 0.9
            seg = {'kind': kind, 'key': key, 'text': val, 'voice': EN if kind == 'say' else ZH,
                   'words': [{'w': w['w'], 't0': round(t + w['t0'] - lead, 3), 't1': round(t + w['t1'] - lead, 3)} for w in words]}
        elif kind == 'sound':
            a, sr = sf.read(str(PA / f'{val}.wav'), dtype='float32'); assert sr == SR
            a = a * 0.8
            seg = {'kind': 'sound', 'key': key, 'clip': val, 'visemes': SOUND_VIS[val]}
        else:  # turn：學生跟唸的 2 秒空白
            a = np.zeros(int(TURN * SR), np.float32); seg = {'kind': 'turn', 'key': key, 'target': val}
            t += 0.25  # 播音後先停一下再進入跟唸
        seg['t0'] = round(t, 3); seg['t1'] = round(t + len(a) / SR, 3)
        if kind == 'sound':  # 給嘴形用的音量包絡（每 1/30 秒）
            hop = SR // 30; env = [float(np.sqrt((a[k:k + hop] ** 2).mean())) for k in range(0, len(a), hop)]; m = max(env) or 1
            seg['env'] = [round(e / m, 3) for e in env]
        out.append((t, a)); segs.append(seg); t += len(a) / SR; prev = kind
        print(f"{seg['t0']:6.2f}-{seg['t1']:6.2f} {kind:5s} {key:9s} {val}")
    total = t + 1.2
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for t0, a in out: k = int(round(t0 * SR)); buf[k:k + len(a)] += a
    buf = buf[:int(total * SR)]
    sf.write(str(HERE / 'voice_v2.wav'), np.clip(buf, -1, 1), SR, subtype='PCM_16')
    (HERE / 'timeline_v2.json').write_text(json.dumps({'dur': round(total, 3), 'en_voice': EN, 'zh_voice': ZH, 'rate': RATE, 'turn_sec': TURN, 'segs': segs},
                                                      ensure_ascii=False, indent=1), encoding='utf-8')
    print('total', round(total, 2))

asyncio.run(main())
