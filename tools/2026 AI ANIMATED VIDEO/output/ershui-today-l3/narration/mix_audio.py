"""mix_audio.py — narration.wav ＋ 程式合成音效（無版權）→ mix.wav
- 三個景點開始（第 3、11、18 句）前 0.5 秒：「叮」
- 英文字卡翻面時：輕輕的「啵」
- 第 25 句（不安全）開頭：兩聲短警示
"""
import json, pathlib, subprocess
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent; SR = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(HERE / 'narration.wav'), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                     capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.float32).copy()
tl = json.loads((HERE / 'timeline.json').read_text(encoding='utf-8'))
tt = np.arange(int(1.2 * SR)) / SR
ding = (0.6 * np.sin(2 * np.pi * 1318.5 * tt) + 0.35 * np.sin(2 * np.pi * 2637 * tt) + 0.2 * np.sin(2 * np.pi * 1975.5 * tt)) * np.exp(-tt * 4.2) * 0.2
tp = np.arange(int(.18 * SR)) / SR
popfx = np.sin(2 * np.pi * (500 + 900 * tp / .18) * tp) * np.exp(-tp * 22) * 0.18
tb = np.arange(int(.22 * SR)) / SR
beep = np.sign(np.sin(2 * np.pi * 880 * tb)) * 0.05 * np.exp(-tb * 6)


def add(sig, t):
    k = int(t * SR)
    if 0 <= k < len(v): v[k:k + len(sig)] += sig[:len(v) - k]


L = {l['i']: l for l in tl['lines']}
for i in (3, 11, 18): add(ding, L[i]['t0'] - .5)
for w in tl['words']: add(popfx, w['t0'] + .2)
add(beep, L[25]['t0'] - .45); add(beep, L[25]['t0'] - .2)
pcm = (np.clip(v, -1, 1) * 32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(HERE / 'mix.wav')], input=pcm, check=True)
print('mix.wav', round(len(v) / SR, 3))
