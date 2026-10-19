"""split_refs.py — 老師提供的短母音音檔（references/[a].mp3 等，已複製成 refs-src/short-*.mp3），每檔唸兩次。
依能量切成兩段：processed/short-<v>-1.wav、short-<v>-2.wav（48 kHz 單聲道、峰值 -3 dB），寫 processed/short-vowels.json。"""
import json, subprocess, pathlib
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent; SR = 48000; OUT = HERE / 'processed'
def load(f):
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32).copy()
def save(a, f):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(f)], input=(np.clip(a, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
rec = {}
for v in 'aeiou':
    a = load(HERE / 'refs-src' / f'short-{v}.mp3')
    env = np.convolve(np.abs(a), np.ones(480) / 480, 'same'); on = env > env.max() * .02
    segs, start = [], None
    for i, x in enumerate(on):
        if x and start is None: start = i
        if not x and start is not None:
            if i - start > .06 * SR: segs.append((start, i))
            start = None
    if start is not None: segs.append((start, len(a)))
    # 間隔小於 0.15 秒的段落合併
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < .15 * SR: merged[-1] = (merged[-1][0], s[1])
        else: merged.append(s)
    rec[v] = []
    for k, (s0, s1) in enumerate(merged[:2], 1):
        c = a[max(0, s0 - int(.03 * SR)):min(len(a), s1 + int(.08 * SR))].copy(); f = int(.01 * SR)
        c[:f] *= np.linspace(0, 1, f); c[-f:] *= np.linspace(1, 0, f); c = c / np.abs(c).max() * 10 ** (-3 / 20)
        save(c, OUT / f'short-{v}-{k}.wav'); rec[v].append({'file': f'short-{v}-{k}.wav', 'sec': round(len(c) / SR, 3), 'start_in_src': round(s0 / SR, 3)})
    print(v, len(merged), 'segments', rec[v])
(OUT / 'short-vowels.json').write_text(json.dumps({'source': 'teacher-provided references/[a|e|i|o|u].mp3 (2026-10-19)', 'clips': rec}, indent=1), encoding='utf-8')
