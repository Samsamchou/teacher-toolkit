"""long_u_reel.py — Tuesday 的 ue（long u）候選音試聽帶。
下載 long-u/candidates.json 中選定的單字錄音（維基共享資源）→ long-u/processed/*.wav（48 kHz、去靜音、-3 dBFS，whisper 確認是對的字）
→ 試聽帶 long-u/reel-long-u.mp3 與 reel-long-u.md：每個候選音播一次，接著播 Tuesday，方便比較。用法：python -I long_u_reel.py
"""
import json, time, urllib.request, pathlib, hashlib, sys
import numpy as np, soundfile as sf
sys.stdout.reconfigure(encoding='utf-8')
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
LU = HERE / 'long-u'; RAW = LU / 'raw'; OUT = LU / 'processed'; OUT.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'teacher-toolkit-phonics/1.0 (classroom video; contact via GitHub Samsamchou)'}
SR = 48000
PICK = ['true', 'glue', 'suit', 'fruit', 'juice', 'flute', 'rule', 'tune', 'cube', 'cute']
cand = {c['file']: c for c in json.loads((LU / 'candidates.json').read_text(encoding='utf-8'))}
src = []
for w in PICK:
    c = cand[f'En-us-{w}.ogg']; f = RAW / c['file']
    if not f.exists():
        f.write_bytes(urllib.request.urlopen(urllib.request.Request(c['url'], headers=UA), timeout=60).read()); time.sleep(8)
    b = f.read_bytes(); src.append({**c, 'size_matches_commons': len(b) == c['bytes'], 'sha256': hashlib.sha256(b).hexdigest()})
    print('ok', c['file'], len(b) == c['bytes'], flush=True)
(LU / 'sources.json').write_text(json.dumps(src, ensure_ascii=False, indent=1), encoding='utf-8')

import subprocess
def load(f):   # 舊 Ogg 用 libsndfile 解碼（本機 ffmpeg 9.0.1 會截斷），ffmpeg 只做重取樣
    d, sr = sf.read(str(f), dtype='float32', always_2d=True); d = d.mean(1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-ar', str(SR), '-f', 'f32le', '-'],
                         input=d.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def trim(a):
    env = np.convolve(np.abs(a), np.ones(480) / 480, 'same'); thr = max(env.max() * .008, 1e-4)
    idx = np.where(env > thr)[0]; s0, s1 = max(0, idx[0] - int(.04 * SR)), min(len(a), idx[-1] + int(.12 * SR))
    a = a[s0:s1].copy(); fade = int(.01 * SR); a[:fade] *= np.linspace(0, 1, fade); a[-fade:] *= np.linspace(1, 0, fade)
    return a / max(np.abs(a).max(), 1e-6) * 10 ** (-3 / 20)
from faster_whisper import WhisperModel
asr = WhisperModel('small.en', device='cpu', compute_type='int8')
for s in src:
    a = trim(load(RAW / s['file'])); sf.write(str(OUT / (s['file'][:-4] + '.wav')), a, SR, subtype='PCM_16')
    pad = np.zeros(8000, np.float32); a16 = np.concatenate([pad, a[::3], pad])
    s['asr'] = ' '.join(x.text.strip() for x in asr.transcribe(a16, language='en', condition_on_previous_text=False, initial_prompt='A single English word.')[0])
    print(s['file'], '→', s['asr'])

P = HERE / 'processed'
def clip(name):
    f = OUT / f'{name}.wav' if (OUT / f'{name}.wav').exists() else P / f'{name}.wav'
    a, sr = sf.read(str(f), dtype='float32'); assert sr == SR; return a
REEL = [  # (編號, 說明, 檔名)
 ('0', '目前使用：ue（美式單字 blue）', 'En-us-blue'),
 ('1', 'IPA 標準音 /uː/（單獨母音，不是單字）', 'Close_back_rounded_vowel'),
 ('2', '字母名 U /juː/（字母本身的名字）', 'En-us-u'),
 ('3', 'ue：true', 'En-us-true'), ('4', 'ue：glue', 'En-us-glue'),
 ('5', 'ui：suit', 'En-us-suit'), ('6', 'ui：fruit', 'En-us-fruit'), ('7', 'ui：juice', 'En-us-juice'),
 ('8', 'u_e：flute', 'En-us-flute'), ('9', 'u_e：rule', 'En-us-rule'), ('10', 'u_e：tune', 'En-us-tune'),
 ('11', 'u_e：cube（/juː/，前面多一個 y 音）', 'En-us-cube'), ('12', 'u_e：cute（/juː/，前面多一個 y 音）', 'En-us-cute'),
]
gap, big = np.zeros(int(.7 * SR), np.float32), np.zeros(int(1.6 * SR), np.float32)
buf, t, md = [big[:SR // 2]], .5, ['# Tuesday 的 ue（long u）候選音試聽帶', '',
      '每個候選音播一次 → 停 0.7 秒 → 播 Tuesday（美式真人錄音）。時間為試聽帶內的秒數。', '',
      '| 編號 | 時間 | 候選音 | 檔案 |', '|---|---|---|---|']
tue = clip('En-us-Tuesday')
for no, desc, name in REEL:
    a = clip(name); md.append(f'| {no} | {t:5.1f}s | {desc} | {name} |')
    for x in (a, gap, tue, big): buf.append(x); t += len(x) / SR
w = np.concatenate(buf); sf.write(str(LU / 'reel-long-u.wav'), w, SR, subtype='PCM_16')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(LU / 'reel-long-u.wav'), '-b:a', '192k', str(LU / 'reel-long-u.mp3')], check=True)
md += ['', '## 新下載的單字錄音（維基共享資源）', '', '| 檔案 | 授權 | 作者 | whisper 聽寫 |', '|---|---|---|---|']
md += [f"| {s['file']} | {s['license']} | {s['artist']} | {s['asr']} |" for s in src]
(LU / 'reel-long-u.md').write_text('\n'.join(md) + '\n', encoding='utf-8'); print('reel', round(t, 1), 's')
