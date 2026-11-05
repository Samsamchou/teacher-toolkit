"""check_voice_v1.py — 用 faster-whisper small.en 聽寫每一句英文 TTS，和腳本比對，列出不一致的句子。"""
import json, pathlib, re, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
HERE = pathlib.Path(__file__).resolve().parent
tl = json.loads((HERE / 'timeline_v1.json').read_text(encoding='utf-8'))
a, sr = sf.read(str(HERE / 'voice_v1.wav'), dtype='float32')
m = WhisperModel('small.en', device='cpu', compute_type='int8')
norm = lambda s: re.sub(r'[^a-z ]', '', s.lower().replace('-', ' ')).split()
rows = []
for s in tl['segs']:
    if s['kind'] != 'say': continue
    clip = a[int(s['t0'] * sr):int(s['t1'] * sr)]
    clip16 = np.interp(np.arange(0, len(clip), sr / 16000), np.arange(len(clip)), clip).astype(np.float32)
    txt = ' '.join(x.text for x in m.transcribe(clip16, language='en', beam_size=5)[0]).strip()
    ok = norm(txt) == norm(s['text'])
    rows.append({'i': s['i'], 'who': s['who'], 'text': s['text'], 'heard': txt, 'ok': ok})
    if not ok: print(f"[{s['i']:3d}] {s['who']:5s} {s['text']!r}\n       heard {txt!r}")
(HERE / 'check_voice_v1.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
print('checked', len(rows), 'mismatch', sum(not r['ok'] for r in rows))
