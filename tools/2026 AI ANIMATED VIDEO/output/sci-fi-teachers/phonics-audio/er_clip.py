"""er_clip.py — Saturday 的 ur 唸 /ɚ/（同 teacher 的 -er，不是 Thursday 重讀的 /ɝ/）。
下載 teacher（維基共享資源，Dvortygirl，CC BY-SA 3.0），把字尾 -er 切出來：
找最後一段高頻（ch／t／s 子音）結束的位置，之後到結尾就是 -er 母音。輸出 er/processed/*.wav、er-teacher.wav（給影片用）、試聽帶 er/reel-er.mp3。
用法：python -I er_clip.py
"""
import json, time, urllib.request, pathlib, hashlib, subprocess, sys
import numpy as np, soundfile as sf
sys.stdout.reconfigure(encoding='utf-8')
HERE = pathlib.Path(__file__).resolve().parent; E = HERE / 'er'; RAW = E / 'raw'; OUT = E / 'processed'
RAW.mkdir(parents=True, exist_ok=True); OUT.mkdir(exist_ok=True)
UA = {'User-Agent': 'teacher-toolkit-phonics/1.0 (classroom video; contact via GitHub Samsamchou)'}
SR = 48000; WORDS = ['teacher']   # letter 的 t 是美式閃音、沒有高頻爆破，切不出來；只用 teacher
cand = {c['file']: c for c in json.loads((E / 'candidates.json').read_text(encoding='utf-8'))}
src = []
for w in WORDS:
    c = cand[f'En-us-{w}.ogg']; f = RAW / c['file']
    if not f.exists(): f.write_bytes(urllib.request.urlopen(urllib.request.Request(c['url'], headers=UA), timeout=60).read()); time.sleep(8)
    b = f.read_bytes(); src.append({**c, 'size_matches_commons': len(b) == c['bytes'], 'sha256': hashlib.sha256(b).hexdigest()})
(E / 'sources.json').write_text(json.dumps(src, ensure_ascii=False, indent=1), encoding='utf-8')

def load(f):   # 舊 Ogg 用 libsndfile 解碼（本機 ffmpeg 9.0.1 會截斷）
    d, sr = sf.read(str(f), dtype='float32', always_2d=True); d = d.mean(1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-ar', str(SR), '-f', 'f32le', '-'],
                         input=d.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def trim(a):
    env = np.convolve(np.abs(a), np.ones(480) / 480, 'same'); thr = max(env.max() * .008, 1e-4)
    idx = np.where(env > thr)[0]; return a[max(0, idx[0] - int(.04 * SR)):min(len(a), idx[-1] + int(.12 * SR))].copy()
def norm(a):
    fade = int(.012 * SR); a = a.copy(); a[:fade] *= np.linspace(0, 1, fade); a[-fade:] *= np.linspace(1, 0, fade)
    return a / max(np.abs(a).max(), 1e-6) * 10 ** (-3 / 20)
def er_tail(a):
    """每 10 ms 算高頻比例（>3 kHz 能量／全部），最後一段高頻比例 >0.5 的子音結束後 +15 ms 起算。"""
    hop = 480; n = len(a) // hop; hf = []; en = []
    for k in range(n):
        x = a[k * hop:(k + 1) * hop] * np.hanning(hop); X = np.abs(np.fft.rfft(x)) ** 2; fr = np.fft.rfftfreq(hop, 1 / SR)
        hf.append(X[fr > 3000].sum() / max(X.sum(), 1e-12)); en.append(X.sum())
    hf = np.array(hf); en = np.array(en); loud = en > en.max() * .002
    cons = np.where((hf > .5) & loud)[0]; start = (cons[-1] + 1) * hop + int(.015 * SR)
    return a[start:], start / SR
words = {}
for s in src:
    w = s['file'][6:-4]; a = trim(load(RAW / s['file'])); words[w] = norm(a)
    sf.write(str(OUT / f'En-us-{w}.wav'), words[w], SR, subtype='PCM_16')
    er, t0 = er_tail(a); er = norm(trim(er)); sf.write(str(OUT / f'er-{w}.wav'), er, SR, subtype='PCM_16')
    print(w, 'word', round(len(a) / SR, 2), 's; -er from', round(t0, 2), 's, length', round(len(er) / SR, 2), 's')
sf.write(str(HERE / 'processed' / 'er-teacher.wav'), sf.read(str(OUT / 'er-teacher.wav'))[0].astype(np.float32), SR, subtype='PCM_16')

sat = sf.read(str(HERE / 'processed' / 'En-us-Saturday.wav'), dtype='float32')[0]; ur = sf.read(str(HERE / 'processed' / 'En-us-er.wav'), dtype='float32')[0]
gap, big = np.zeros(int(.7 * SR), np.float32), np.zeros(int(1.6 * SR), np.float32)
REEL = [('0', '目前使用（Thursday 的重讀 ur /ɝ/，單字 er）', ur), ('1', 'teacher 的 -er /ɚ/（從 teacher 切出）', np.asarray(sf.read(str(OUT / 'er-teacher.wav'), dtype='float32')[0]))]
buf, t = [big[:SR // 2]], .5; md = ['# Saturday 的 ur（-er /ɚ/）試聽帶', '', '每組：候選音 → 停 0.7 秒 → 原單字 teacher→ Saturday。', '',
                                  '| 編號 | 時間 | 候選音 |', '|---|---|---|']
for no, desc, a in REEL:
    md.append(f'| {no} | {t:5.1f}s | {desc} |'); w = {'1': 'teacher'}.get(no)
    for x in [a, gap] + ([words[w], gap] if w else []) + [sat, big]: buf.append(x); t += len(x) / SR
sf.write(str(E / 'reel-er.wav'), np.concatenate(buf), SR, subtype='PCM_16')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(E / 'reel-er.wav'), '-b:a', '192k', str(E / 'reel-er.mp3')], check=True)
md += ['', '來源：維基共享資源 En-us-teacher.ogg（Dvortygirl，CC BY-SA 3.0）。影片採用 1 號（er-teacher.wav）。']
(E / 'reel-er.md').write_text('\n'.join(md) + '\n', encoding='utf-8'); print('reel', round(t, 1))
