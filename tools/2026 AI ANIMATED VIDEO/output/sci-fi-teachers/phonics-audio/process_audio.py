"""process_audio.py — raw/*.ogg → processed/*.wav（48 kHz 單聲道、去頭尾靜音、峰值 -3 dBFS），並做檢查表 processed/report.json。
單字錄音另用 faster-whisper 辨識，確認內容是對的字。
再依 REEL 組出試聽帶 reel-days.wav／.mp3 與 reel-days.md（每段的時間與內容）。用法：python -I process_audio.py
"""
import json, subprocess, pathlib
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent
RAW, OUT = HERE / 'raw', HERE / 'processed'; OUT.mkdir(exist_ok=True)
SR = 48000
src = json.loads((HERE / 'sources.json').read_text(encoding='utf-8'))

def load(f):
    # 注意：本機 ffmpeg 9.0.1 解這批舊 Ogg Vorbis 會丟掉大半樣本，改用 libsndfile 解碼，再交給 ffmpeg 只做重取樣
    import soundfile as sf
    d, sr = sf.read(str(f), dtype='float32', always_2d=True); d = d.mean(1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-ar', str(SR), '-f', 'f32le', '-'],
                         input=d.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def save(a, f):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(f)],
                   input=(np.clip(a, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
def trim(a):
    env = np.convolve(np.abs(a), np.ones(480) / 480, 'same'); thr = max(env.max() * .008, 1e-4)
    idx = np.where(env > thr)[0]; s0, s1 = max(0, idx[0] - int(.04 * SR)), min(len(a), idx[-1] + int(.12 * SR))
    a = a[s0:s1]; fade = int(.01 * SR); a[:fade] *= np.linspace(0, 1, fade); a[-fade:] *= np.linspace(1, 0, fade)
    return a / max(np.abs(a).max(), 1e-6) * 10 ** (-3 / 20)

from faster_whisper import WhisperModel
asr = WhisperModel('small.en', device='cpu', compute_type='int8')
rep = []
for s in src:
    a = trim(load(RAW / s['file'])); out = OUT / (pathlib.Path(s['file']).stem + '.wav'); save(a, out)
    r = {'file': out.name, 'tag': s['tag'], 'ipa': s.get('ipa'), 'example': s.get('example'), 'sec': round(len(a) / SR, 3)}
    if s['tag'] == 'word':
        pad = np.zeros(8000, np.float32); a16 = np.concatenate([pad, a[::3], pad]); segs, _ = asr.transcribe(a16, language='en', condition_on_previous_text=False, initial_prompt='A single English word.'); r['asr'] = ' '.join(x.text.strip() for x in segs)
    rep.append(r); print(r)
(OUT / 'report.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding='utf-8')

# ---------- 試聽帶：七個星期單字的重點音 → 單字 ----------
REEL = [
 ('Sunday', [('u /ʌ/（IPA 標準音）', 'Open-mid_back_unrounded_vowel'), ('u /ʌ/（美式單字 uh）', 'En-us-uh'), ('ay /eɪ/（字母名 A）', 'En-us-A_upper')], 'En-us-Sunday'),
 ('Monday', [('o /ʌ/（IPA 標準音）', 'Open-mid_back_unrounded_vowel'), ('ay /eɪ/（字母名 A）', 'En-us-A_upper')], 'En-us-Monday'),
 ('Tuesday', [('ue /uː/（IPA 標準音）', 'Close_back_rounded_vowel'), ('ue /uː/（美式單字 blue）', 'En-us-blue'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Tuesday'),
 ('Wednesday', [('e /ɛ/（IPA 標準音）', 'Open-mid_front_unrounded_vowel'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Wednesday'),
 ('Thursday', [('th /θ/（IPA 標準音）', 'Voiceless_dental_fricative'), ('ur /ɝ/（美式單字 er）', 'En-us-er'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Thursday'),
 ('Friday', [('i /aɪ/（字母名 I）', 'En-us-I'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Friday'),
 ('Saturday', [('a /æ/（IPA 標準音）', 'Near-open_front_unrounded_vowel'), ('ur /ɚ/（美式單字 er）', 'En-us-er'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Saturday'),
 ('組合音', [('sh（美式單字 she）', 'En-us-she'), ('ch（美式單字 chair）', 'En-us-chair'), ('th（美式單字 thin）', 'En-us-thin'),
           ('wh（美式單字 what）', 'En-us-what')], None),   # 2026-10-19 老師決定：組合音用單字錄音，不用 IPA 子音錄音
]
GAP = np.zeros(int(.7 * SR), np.float32); BIG = np.zeros(int(1.4 * SR), np.float32)
buf, t, md = [], 0.0, ['# 七個星期單字：下載發音試聽帶', '', '每段先播重點母音／組合，再播完整單字（美式真人錄音）。時間為試聽帶內的秒數。', '',
                      '| 時間 | 單字 | 播放內容 | 檔案 |', '|---|---|---|---|']
for word, parts, wfile in REEL:
    for label, stem in parts + ([('完整單字', wfile)] if wfile else []):
        a = load(OUT / f'{stem}.wav'); md.append(f'| {t:5.1f}s | {word} | {label} | {stem} |')
        buf += [a, GAP]; t += (len(a) + len(GAP)) / SR
    buf.append(BIG); t += len(BIG) / SR
reel = np.concatenate(buf); save(reel, HERE / 'reel-days.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(HERE / 'reel-days.wav'), '-b:a', '192k', str(HERE / 'reel-days.mp3')], check=True)
(HERE / 'reel-days.md').write_text('\n'.join(md) + '\n', encoding='utf-8'); print('reel', round(len(reel) / SR, 1), 's')
