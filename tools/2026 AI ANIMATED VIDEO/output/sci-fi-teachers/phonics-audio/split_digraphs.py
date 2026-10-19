"""split_digraphs.py — 老師提供的組合音（references/[wh].mp3、[sh]、[th] voiceless、[th] voiced、[ph]、[ch]，已複製成 refs-src/dg-*.mp3），每檔一次。
去頭尾靜音、峰值 -3 dB → processed/dg-<名稱>.wav，寫 processed/digraphs.json。"""
import json, subprocess, pathlib
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent; SR = 48000; OUT = HERE / 'processed'
NAMES = ['wh', 'sh', 'th-voiceless', 'th-voiced', 'ph', 'ch']
rec = {}
for v in NAMES:
    a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(HERE / 'refs-src' / f'dg-{v}.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                                     capture_output=True, check=True).stdout, np.float32).copy()
    env = np.convolve(np.abs(a), np.ones(480) / 480, 'same'); idx = np.where(env > env.max() * .02)[0]
    c = a[max(0, idx[0] - int(.03 * SR)):min(len(a), idx[-1] + int(.08 * SR))].copy(); f = int(.01 * SR)
    c[:f] *= np.linspace(0, 1, f); c[-f:] *= np.linspace(1, 0, f); c = c / np.abs(c).max() * 10 ** (-3 / 20)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(OUT / f'dg-{v}.wav')],
                   input=(np.clip(c, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
    rec[v] = {'file': f'dg-{v}.wav', 'sec': round(len(c) / SR, 3)}; print(v, rec[v])
(OUT / 'digraphs.json').write_text(json.dumps({'source': 'teacher-provided references/[wh|sh|th voiceless|th voiced|ph|ch].mp3 (2026-10-19)', 'clips': rec}, indent=1), encoding='utf-8')
