"""lipsync9.py — Ken 對嘴時間軸：依 part9.wav 的音量（每 2 格一次）決定嘴形，只在 Ken 自己說的字裡張嘴。
0 閉嘴、1 微張、2 張開、3 圓嘴（to、going、post、today 這類 o／u 音的前半段）。
輸出 tabletop/src/mouth9.json：{SID: [每個偶數格的嘴形]}。用法：python -I lipsync9.py
"""
import json, pathlib
import numpy as np, soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
TM = json.loads((HERE / 'tabletop' / 'src' / 'timing.json').read_text(encoding='utf-8'))
a, SR = sf.read(HERE / 'part9.wav'); a = a if a.ndim == 1 else a.mean(1)
FPS = 24; ROUND = {'to', 'going', 'post', 'today', 'school', 'go'}
out = {}
for sid, seg in TM.items():
    if 'words' not in seg: continue
    words = [w for k in ('scene', 'reason', 'answer') for w in seg['words'][k]]
    def rms(t):
        i = int((seg['t0'] + t) * SR); h = SR // 24
        x = a[max(0, i - h):i + h]; return float(np.sqrt((x ** 2).mean())) if len(x) else 0.0
    ref = np.percentile([rms(t / 100) for w in words for t in range(int(w[1] * 100), int(w[2] * 100), 2)], 90)
    track = []
    for fr in range(0, round(seg['dur'] * FPS) + 2, 2):
        t = fr / FPS; st = 0
        w = next((w for w in words if w[1] - 0.02 <= t <= w[2] + 0.02), None)
        if w:
            lv = rms(t) / ref
            st = 0 if lv < 0.15 else (1 if lv < 0.5 else 2)
            ww = w[0].strip('.,?!').lower()
            if st and ww in ROUND and t < (w[1] + w[2]) / 2: st = 3
        track.append(st)
    out[sid] = track
    print(sid, ''.join(str(x) for x in track[:60]))
(HERE / 'tabletop' / 'src' / 'mouth9.json').write_text(json.dumps(out), encoding='utf-8')
