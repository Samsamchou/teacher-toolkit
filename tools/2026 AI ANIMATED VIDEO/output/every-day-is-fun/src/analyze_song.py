"""analyze_song.py — Every Day Is Fun：本機逐字辨識（faster-whisper small.en）＋拍點分析（librosa）。
輸出（data/）：
  asr-unprompted.json  不給歌詞提示的逐字辨識（用來檢查 Suno 實際唱了什麼，避免被提示「帶著猜」）
  asr-prompted.json    以正式歌詞為 initial_prompt 的逐字辨識（時間較準，用於對齊）
  music-analysis.json  速度候選、拍點、每秒響度
  lyrics-docx.json     歌詞 Word 檔逐段（含 [ ] 舞台指示）
全部為候選資料（UNVERIFIED），仍須逐句比對與聽校。
用法: python -I analyze_song.py
"""
import json, pathlib, re, subprocess, zipfile, html, tempfile
root = pathlib.Path(__file__).resolve().parents[1]; src = root / 'sources'; data = root / 'data'; data.mkdir(exist_ok=True)
mp3 = src / 'Every Day Is Fun.mp3'; docx = src / 'Every Day Is Fun 歌詞.docx'

# 1. 歌詞 Word 檔 / lyrics docx → 段落
xml = zipfile.ZipFile(docx).read('word/document.xml').decode('utf-8')
paras = [html.unescape(''.join(re.findall(r'<w:t(?:\s[^>]*)?>(.*?)</w:t>', p, re.S))) for p in re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)]
lines, sec = [], None
for t in paras:
    t = t.strip()
    if not t: continue
    m = re.fullmatch(r'\[(Intro|Verse \d|Pre-Chorus|Chorus|Bridge|Dance Break|Final Chorus|Outro)\]', t)
    if m: sec = m.group(1); continue
    if t.startswith('['): lines.append({'section': sec, 'direction': t}); continue
    lines.append({'section': sec, 'text': t})
(data / 'lyrics-docx.json').write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding='utf-8')
sung = [l['text'] for l in lines if 'text' in l]

# 2. 轉成 16 kHz 單聲道 wav / decode once
wav = pathlib.Path(tempfile.gettempdir()) / 'edif-16k.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', '16000', str(wav)], check=True)

# 3. 逐字辨識 / word-level ASR
from faster_whisper import WhisperModel
model = WhisperModel('small.en', device='cpu', compute_type='int8')
import wave, numpy as _np
with wave.open(str(wav)) as w: audio16 = _np.frombuffer(w.readframes(w.getnframes()), dtype=_np.int16).astype(_np.float32) / 32768   # 直接給陣列，避開 PyAV 版本問題
def asr(prompt):
    segs, info = model.transcribe(audio16, language='en', word_timestamps=True, vad_filter=False, beam_size=5,
                                  initial_prompt=prompt, condition_on_previous_text=False)
    out = []
    for s in segs:
        out.append({'start': round(s.start, 2), 'end': round(s.end, 2), 'text': s.text,
                    'words': [{'word': w.word, 'start': round(w.start, 2), 'end': round(w.end, 2), 'probability': round(w.probability, 3)} for w in (s.words or [])]})
    return {'model': 'faster-whisper small.en int8', 'prompted': bool(prompt), 'duration': info.duration, 'status': 'UNVERIFIED', 'segments': out}
for name, prompt in (('asr-unprompted.json', None), ('asr-prompted.json', ' '.join(sung[:40]))):
    r = asr(prompt); (data / name).write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
    print(name, len(r['segments']), 'segments', sum(len(s['words']) for s in r['segments']), 'words')

# 4. 拍點 / beats
import librosa, numpy as np
y, sr = librosa.load(str(wav), sr=16000, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
rms = librosa.feature.rms(y=y, frame_length=16000, hop_length=16000)[0]
music = {'method': 'librosa beat_track on 16 kHz mono; candidates only', 'status': 'UNVERIFIED',
         'tempo_candidate': float(np.atleast_1d(tempo)[0]), 'beat_count': int(len(beats)), 'beats': [round(float(b), 3) for b in beats],
         'rms_db_per_second': [round(float(20 * np.log10(v + 1e-9)), 1) for v in rms], 'duration': round(len(y) / sr, 3)}
(data / 'music-analysis.json').write_text(json.dumps(music, indent=1), encoding='utf-8')
print('tempo', round(music['tempo_candidate'], 2), 'beats', music['beat_count'], 'duration', music['duration'])
