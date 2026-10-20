"""split_er.py — 老師提供的 references/er.mp3（Saturday 的 ur /ɚ/，2026-10-20）→ processed/ref-er-<k>.wav（48 kHz、去靜音、-3 dBFS）。
依能量切段；若唸了兩次就存兩段，影片用第 1 段（同短母音的做法）。用法：python -I split_er.py"""
import json, subprocess, pathlib
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent; SR = 48000; OUT = HERE / 'processed'
a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(HERE / 'references' / 'er.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32).copy()
env = np.convolve(np.abs(a), np.ones(480) / 480, 'same'); on = env > env.max() * .02
segs, start = [], None
for i, x in enumerate(on):
    if x and start is None: start = i
    if not x and start is not None:
        if i - start > .06 * SR: segs.append((start, i))
        start = None
if start is not None: segs.append((start, len(a)))
merged = []
for s in segs:
    if merged and s[0] - merged[-1][1] < .15 * SR: merged[-1] = (merged[-1][0], s[1])
    else: merged.append(s)
rec = []
for k, (s0, s1) in enumerate(merged[:2], 1):
    c = a[max(0, s0 - int(.03 * SR)):min(len(a), s1 + int(.08 * SR))].copy(); f = int(.01 * SR)
    c[:f] *= np.linspace(0, 1, f); c[-f:] *= np.linspace(1, 0, f); c = c / np.abs(c).max() * 10 ** (-3 / 20)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(OUT / f'ref-er-{k}.wav')],
                   input=(np.clip(c, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
    rec.append({'file': f'ref-er-{k}.wav', 'sec': round(len(c) / SR, 3), 'start_in_src': round(s0 / SR, 3)})
print('source', round(len(a) / SR, 2), 's;', len(merged), 'segments', rec)
(OUT / 'ref-er.json').write_text(json.dumps({'source': 'teacher-provided references/er.mp3 (2026-10-20)', 'clips': rec}, indent=1), encoding='utf-8')
