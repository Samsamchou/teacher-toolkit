"""精準對嘴 v2（11/17）：
1. edge-tts 配音（0.8 倍）→ 去頭尾靜音。
2. align.py 強制對齊，量出每個音素真正的起訖時間（v1 用 edge 的逐字時間，實測比聲音早約 0.16 秒，已棄用）。
3. 音素 → 9 種嘴形；閉唇 P/B 放在爆破音「之前」的閉合期；每個嘴形至少 3 格；太短的子音併入鄰居。
4. 嘴形參數連續混合（過渡格）＋音量微調開合；下巴由 cast.head() 依開口帶動。
    seg = make_line(text, voice, out_base)             # dict(audio, dur, phones, words)
    track = build_track(seg['phones'], offset)
    mouth = mouth_at(track, env, t)                    # 給 cast.draw(mouth=…)
"""
import asyncio, re, subprocess, json
import numpy as np
import edge_tts
import phalign as AL
from cast import SHAPES, blend

SR = 24000; FPS = 30
P2V = {'AA': 'D', 'AH': 'D', 'AY': 'D', 'AW': 'D', 'AE': 'C', 'EH': 'C', 'EY': 'C', 'IY': 'B', 'IH': 'B', 'Y': 'B',
       'AO': 'E', 'OW': 'E', 'OY': 'E', 'ER': 'E', 'R': 'E', 'UW': 'F', 'UH': 'F', 'W': 'F',
       'M': 'A', 'B': 'A', 'P': 'A', 'F': 'G', 'V': 'G', 'L': 'H', 'TH': 'H', 'DH': 'H'}
VOW = AL.VOW
LEAD = 1/FPS            # 嘴形比聲音早 1 格（人看嘴的習慣）
MIN = 3/FPS             # 每個嘴形至少 3 格
SMOOTH = 1/FPS          # 過渡：前後各 1 格加權混合

def vis_of(p):
    if p == 'AH0': return 'C'
    return P2V.get(re.sub(r'\d', '', p), 'B')

async def _tts(text, voice, rate, mp3, pitch='+0Hz'):
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    with open(mp3, 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio': f.write(ch['data'])

def make_line(text, voice, out_base, rate='-20%', pad=0.08, pitch='+0Hz'):
    asyncio.run(_tts(text, voice, rate, out_base + '_raw.mp3', pitch))
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', out_base + '_raw.mp3', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32)/32768
    n = SR//100; rms = np.array([np.sqrt(np.mean(a[i*n:(i + 1)*n]**2) + 1e-12) for i in range(len(a)//n)])
    on = np.where(rms > 0.02*rms.max())[0]
    i0 = max(0, on[0]*n - int(pad*SR)); i1 = min(len(a), (on[-1] + 1)*n + int(pad*SR)); a = a[i0:i1]
    import soundfile as sf
    sf.write(out_base + '.wav', a, SR)
    phones = AL.align(out_base + '.wav', text)
    json.dump(phones, open(out_base + '_phones.json', 'w'), indent=0)
    words = {}
    for p in phones:
        w = words.setdefault(p['wi'], [p['t0'], p['t1'], p['word']]); w[1] = p['t1']
    return dict(audio=a, dur=len(a)/SR, phones=phones, words=[tuple(words[k]) for k in sorted(words)], text=text)

def envelope(audio, fps=FPS):
    hop = SR//fps; n = len(audio)//hop + 1
    env = np.array([np.sqrt(np.mean(audio[i*hop:(i + 1)*hop]**2) + 1e-12) for i in range(n)])
    return np.clip(env/(np.percentile(env, 95) or 1), 0, 1.3)

def build_track(phones, offset=0.0):
    """→ [[t0, t1, vis, phone, word]]，時間為全片秒數（已含提早 1 格）。"""
    raw = []
    for i, p in enumerate(phones):
        b = re.sub(r'\d', '', p['phone']); v = vis_of(p['phone']); t0, t1 = p['t0'], p['t1']
        if b in ('P', 'B'):
            t0, t1 = t0 - 0.075, t0 + 0.025          # 雙唇閉合在爆破聲之前
        elif b == 'M':
            if t1 - t0 < MIN: t0 = t1 - MIN          # 鼻音：聲音期間嘴是閉的
        elif v == 'G':
            t0 -= 0.02
            if t1 - t0 < MIN: t1 = t0 + MIN
        raw.append([t0, t1, v, p['phone'], p['word'], b])
    # 閉唇、咬唇有優先權：把鄰居讓出來
    for i, s in enumerate(raw):
        if s[2] in 'AG':
            if i > 0 and raw[i - 1][1] > s[0]:
                if raw[i - 1][5] in VOW and s[0] - raw[i - 1][0] < MIN - 1e-6:      # 別把前一個母音擠到不足 3 格
                    s[0] = min(raw[i - 1][0] + MIN, s[1] - 2/FPS)
                raw[i - 1][1] = s[0]
            if i + 1 < len(raw) and raw[i + 1][0] < s[1]: raw[i + 1][0] = s[1]
    raw = [s for s in raw if s[1] - s[0] > 0.005]
    # 相同嘴形合併
    out = []
    for s in raw:
        if out and out[-1][2] == s[2] and s[0] - out[-1][1] < 0.06:
            out[-1][1] = s[1]; out[-1][3] += ' ' + s[3]
        else: out.append(s[:5])
    # 太短的（<3 格）且不是閉唇／咬唇：併入較長的鄰居
    changed = True
    while changed:
        changed = False
        for i, s in enumerate(out):
            if s[2] in 'AG' or s[1] - s[0] >= MIN - 1e-6: continue
            prev = out[i - 1] if i > 0 and s[0] - out[i - 1][1] < 0.06 else None
            nxt = out[i + 1] if i + 1 < len(out) and out[i + 1][0] - s[1] < 0.06 else None
            cand = [x for x in (prev, nxt) if x is not None and x[2] not in 'AG']
            if not cand:
                s[1] = s[0] + MIN if nxt is None else s[1]
                if nxt is None: continue
                # 夾在兩個閉唇之間：保留
                continue
            tgt = max(cand, key=lambda x: (x[3].split()[0][:2] in VOW or re.sub(r'\d', '', x[3].split()[0]) in VOW, x[1] - x[0]))
            if tgt is prev: prev[1] = s[1]
            else: nxt[0] = s[0]
            out.pop(i); changed = True; break
    # 字間很短的空隙不回到休息嘴
    for i in range(len(out) - 1):
        if 0 < out[i + 1][0] - out[i][1] < 0.10 and out[i][2] not in 'A': out[i][1] = out[i + 1][0]
    return [[float(s[0] + offset - LEAD), float(s[1] + offset - LEAD), s[2], s[3], s[4]] for s in out]

def _shape(track, env, t):
    for s in track:
        if s[0] <= t < s[1]:
            p = dict(SHAPES[s[2]])
            i = int((t + LEAD)*FPS); a = env[i] if 0 <= i < len(env) else 1.0
            if s[2] in 'CDEH': p['h'] *= 0.82 + 0.30*min(1.0, a)
            return p, s
    return dict(SHAPES['X']), None

def mouth_at(track, env, t):
    items = [(_shape(track, env, t - SMOOTH)[0], 0.22), (_shape(track, env, t)[0], 0.56), (_shape(track, env, t + SMOOTH)[0], 0.22)]
    cur, s = _shape(track, env, t)
    if s is not None and s[2] in 'AG' and s[1] - s[0] <= MIN + 1e-6:
        items = [(cur, 1.0)]                           # 短的閉唇／咬唇不被沖淡
    p = blend(items)
    for k in ('press', 'bite', 'tng', 'lip', 'tt', 'tb'): p[k] = cur[k] if s is not None else p[k]
    return p

def seg_at(track, t):
    for s in track:
        if s[0] <= t < s[1]: return s
    return None

def speaking(track, t):
    return bool(track) and track[0][0] - 0.1 <= t <= track[-1][1] + 0.1
