"""build_voice_v1.py — 影片 1 的聲音時間軸（兩位老師）。
- Nova：en-US-AvaNeural／zh-TW-HsiaoChenNeural；Cosmo：en-US-GuyNeural／zh-TW-YunJheNeural；語速都 -20%（0.8 倍）。
- 發音按鈕播 phonics-audio/processed/ 的真人音檔（不用 TTS）。
- TTS 片段快取在 segs/<雜湊>.mp3（文字與聲音沒變就不重做）。
- TTS_FIX：字幕顯示原文，但送給 TTS 的拼法改成唸得對的寫法（由 whisper 檢查後決定）。
輸出：voice_v1.wav、timeline_v1.json。用法：python -I build_voice_v1.py
"""
import asyncio, json, pathlib, subprocess, hashlib, sys
import numpy as np, edge_tts, soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import SCRIPT

PA = HERE.parent / 'phonics-audio' / 'processed'
SR = 48000; RATE = '-20%'; GAP = 0.45; SEC_GAP = 1.0
VOICE = {('nova', 'say'): 'en-US-AvaNeural', ('nova', 'zh'): 'zh-TW-HsiaoChenNeural',
         ('cosmo', 'say'): 'en-US-GuyNeural', ('cosmo', 'zh'): 'zh-TW-YunJheNeural'}
TTS_FIX = {  # 字幕顯示左邊，TTS 唸右邊（2026-10-20 whisper 檢查後決定）
 'Sun, day.': 'Sun... day.', 'Mon, day.': 'Mon... day.', 'Tues, day.': 'Tues... day.', 'Wednes, day.': 'Wens... day.',
 'Thurs, day.': 'Thurs... day.',
 'Fri, day.': 'Fri... day.', 'Sat, ur, day.': 'Sat... er... day.',
 'end with D, A, Y. Day!': 'end with D... A... Y. Day!',  # 字母拼讀分開唸
 # 縮寫：TTS 會把 Sun. 唸成 Sunday、Mon. 卻唸 Mon，不一致；改成唸字母＋dot，強調「加一個點」
 'Sunday, S, U, N. Sun. Monday, M, O, N. Mon. Tuesday, T, U, E. Tue.': 'Sunday. S, U, N, dot! Monday. M, O, N, dot! Tuesday. T, U, E, dot!',
 'Wednesday, W, E, D. Wed. Thursday, T, H, U. Thu.': 'Wednesday. W, E, D, dot! Thursday. T, H, U, dot!',
 'Friday, F, R, I. Fri. Saturday, S, A, T. Sat.': 'Friday. F, R, I, dot! Saturday. S, A, T, dot!'}
SOUND_VIS = {'short-u-1': ['M02_A'], 'short-e-1': ['M08_mid', 'M03_E'], 'short-a-1': ['M02_A'],
             'En-us-A_upper': ['M08_mid', 'M03_E'], 'En-us-blue': ['M07_L', 'M05_U'], 'En-us-u': ['M03_E', 'M05_U'], 'ref-er-1': ['M08_mid'], 'En-us-I': ['M02_A', 'M03_E'],
             'En-us-er': ['M08_mid', 'M04_O'], 'dg-th-voiceless': ['M07_L']}

def tts_text(t):
    if t in TTS_FIX: return TTS_FIX[t]
    for a, b in TTS_FIX.items(): t = t.replace(a, b)
    return t

async def synth(text, voice):
    f = HERE / 'segs' / (hashlib.sha1(f'{voice}|{RATE}|{text}'.encode()).hexdigest()[:16] + '.mp3')
    j = f.with_suffix('.json')
    if f.exists() and j.exists(): return f, json.loads(j.read_text(encoding='utf-8'))
    words = []
    with open(f, 'wb') as fh:
        async for ch in edge_tts.Communicate(text, voice, rate=RATE, boundary='WordBoundary').stream():
            if ch['type'] == 'audio': fh.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'w': ch['text'], 't0': ch['offset'] / 1e7, 't1': (ch['offset'] + ch['duration']) / 1e7})
    j.write_text(json.dumps(words, ensure_ascii=False), encoding='utf-8'); return f, words

def decode(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def trim(a):
    loud = np.where(np.abs(a) > 0.01)[0]; s0, s1 = max(0, loud[0] - int(.03 * SR)), min(len(a), loud[-1] + int(.08 * SR))
    return a[s0:s1], s0 / SR

async def speak(who, kind, text):
    """回傳 (音訊, words, voices)。both＝兩人齊唸，各自合成後疊加，字詞時間取 Nova 的。"""
    whos = ['nova', 'cosmo'] if who == 'both' else [who]
    parts = []
    for w in whos:
        v = VOICE[(w, kind)]; f, words = await synth(tts_text(text), v)
        a, lead = trim(decode(f)); parts.append((a, [{'w': x['w'], 't0': x['t0'] - lead, 't1': x['t1'] - lead} for x in words], v))
    n = max(len(p[0]) for p in parts); a = np.zeros(n, np.float32)
    for p in parts: a[:len(p[0])] += p[0] * (0.9 / len(parts) ** 0.5)
    return a, parts[0][1], [p[2] for p in parts]

async def main():
    (HERE / 'segs').mkdir(exist_ok=True)
    t = 0.8; out = []; segs = []; prev = None; sections = {}
    for i, (sec, who, kind, val, vis) in enumerate(SCRIPT):
        if prev is not None:
            if sec != prev[0]: t += SEC_GAP
            elif not (prev[1] == 'sound' and kind == 'turn'): t += GAP
        seg = {'i': i, 'sec': sec, 'who': who, 'kind': kind, 'vis': vis}
        if kind in ('say', 'zh'):
            a, words, voices = await speak(who, kind, val)
            seg.update(text=val, voices=voices, words=[{'w': w['w'], 't0': round(t + w['t0'], 3), 't1': round(t + w['t1'], 3)} for w in words])
        elif kind == 'sound':
            a, sr = sf.read(str(PA / f'{val}.wav'), dtype='float32'); assert sr == SR, val
            a = a * 0.8; seg.update(clip=val, visemes=SOUND_VIS[val])
        else:
            t += 0.25; a = np.zeros(int(val * SR), np.float32); seg.update(sec_len=val)
        seg['t0'] = round(t, 3); seg['t1'] = round(t + len(a) / SR, 3)
        if kind == 'sound':
            hop = SR // 30; env = [float(np.sqrt((a[k:k + hop] ** 2).mean())) for k in range(0, len(a), hop)]; m = max(env) or 1
            seg['env'] = [round(e / m, 3) for e in env]
        sections.setdefault(sec, [seg['t0'], seg['t1']])[1] = seg['t1']
        out.append((t, a)); segs.append(seg); t += len(a) / SR; prev = (sec, kind)
    total = t + 1.5
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for t0, a in out: k = int(round(t0 * SR)); buf[k:k + len(a)] += a
    buf = buf[:int(total * SR)]
    sf.write(str(HERE / 'voice_v1.wav'), np.clip(buf, -1, 1), SR, subtype='PCM_16')
    (HERE / 'timeline_v1.json').write_text(json.dumps({'dur': round(total, 3), 'voices': {f'{k[0]}-{k[1]}': v for k, v in VOICE.items()},
                                                       'rate': RATE, 'sections': sections, 'segs': segs}, ensure_ascii=False, indent=1), encoding='utf-8')
    for s, (a, b) in sections.items(): print(f'{s:8s} {a:7.1f}-{b:7.1f}  {b - a:5.1f}s')
    print(f'total {total:.1f}s = {int(total // 60)}:{total % 60:04.1f}')

asyncio.run(main())
