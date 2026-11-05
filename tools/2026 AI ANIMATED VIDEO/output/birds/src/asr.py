"""asr.py — 逐字辨識兩次（無提示／歌詞提示），輸出 data/asr-*.json（候選時間，需人工聽校）。
用法: python -I src/asr.py
"""
import json, pathlib, subprocess, sys, tempfile
import numpy as np
from faster_whisper import WhisperModel
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parents[1]
mp3 = root / 'sources' / 'birds.mp3'
lyrics = (root / 'sources' / 'lyrics.txt').read_text(encoding='utf-8')
wav = pathlib.Path(tempfile.gettempdir()) / 'birds-16k.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', '16000', '-f', 's16le', str(wav)], check=True)
audio = np.frombuffer(wav.read_bytes(), np.int16).astype(np.float32) / 32768
model = WhisperModel('small.en', device='cpu', compute_type='int8')
prompt = ' '.join(dict.fromkeys(lyrics.split('\n')))[:800]
for name, kw in [('unprompted', {}), ('prompted', {'initial_prompt': prompt})]:
    segs, _ = model.transcribe(audio, language='en', word_timestamps=True, vad_filter=False,
                               condition_on_previous_text=False, beam_size=5, **kw)
    out = []
    for s in segs:
        out.append({'start': round(s.start, 2), 'end': round(s.end, 2), 'text': s.text.strip(),
                    'words': [{'w': w.word.strip(), 's': round(w.start, 2), 'e': round(w.end, 2), 'p': round(w.probability, 2)} for w in s.words]})
        print(f"[{name}] {s.start:6.1f}-{s.end:6.1f} {s.text.strip()}")
    (root / 'data' / f'asr-{name}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
