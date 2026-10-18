"""mix_audio.py — 旁白 narration.wav ＋ 每個車站站名牌彈出時的「叮」（程式合成，無版權問題）→ mix.wav"""
import json, pathlib, subprocess
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent; SR = 48000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(HERE / 'narration.wav'), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.float32).copy()
tt = np.arange(int(1.2 * SR)) / SR
ding = (0.6 * np.sin(2 * np.pi * 1318.5 * tt) + 0.35 * np.sin(2 * np.pi * 2637 * tt) + 0.2 * np.sin(2 * np.pi * 1975.5 * tt)) * np.exp(-tt * 4.2) * 0.22
tl = json.loads((HERE / 'timeline.json').read_text(encoding='utf-8'))
for s in tl['sections']:
    if s['key'] in ('open', 'ending'): continue
    k = int((s['t0'] + 1.6) * SR); v[k:k + len(ding)] += ding[:len(v) - k]
pcm = (np.clip(v, -1, 1) * 32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(HERE / 'mix.wav')], input=pcm, check=True)
print('mix.wav', round(len(v) / SR, 3))
