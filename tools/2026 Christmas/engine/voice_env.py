"""voice_env.py — 每句配音算 30 fps 音量曲線（0–1），寫進 audio/lines/manifest.json 的 env 欄位（嘴巴 3 段開合用）。"""
import json, pathlib
import numpy as np, soundfile as sf
ROOT = pathlib.Path(__file__).resolve().parents[1]; P = ROOT / 'audio' / 'lines' / 'manifest.json'
man = json.load(open(P, encoding='utf-8'))
for m in man:
    a, sr = sf.read(ROOT / 'audio' / 'lines' / f"{m['id']}.wav")
    if a.ndim > 1: a = a.mean(1)
    hop = sr // 30; n = len(a) // hop
    r = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    r = r / (np.percentile(r, 95) + 1e-9)
    m['env'] = [round(float(min(1, x)), 2) for x in r]
json.dump(man, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(man))
