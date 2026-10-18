"""analyze_song.py（2d-animations skill 通用版）— 本機逐字辨識（faster-whisper small.en）＋拍點分析（librosa）。
放在 output/<song>/src/ 下執行；自動讀 output/<song>/sources/ 裡唯一的 .mp3 與 .docx。
輸出（data/）：
  lyrics-docx.json     歌詞 Word 檔逐行（含 [ ] 舞台指示、段落、角色標籤）
  lyrics-mp3-tag.txt   MP3 內嵌歌詞標籤（Suno 常有；可能與 Word 檔不同，例如段落重複次數）
  audio-tags.json      MP3 標題等標籤（例：標題含「0.84x」表示放慢版）
  asr-unprompted.json  不給歌詞提示的逐字辨識（檢查 Suno 實際唱了什麼）
  asr-prompted.json    以正式歌詞為 initial_prompt 的逐字辨識（時間較準）
  music-analysis.json  速度候選、拍點、每秒響度
全部是候選資料（UNVERIFIED），要逐句比對並請教師聽校。
Word 檔處理（測試中遇過）：
  - 一段內用 <w:br/> 換行 → 先還原成換行再逐行拆；
  - [Child A]／[Child B]／[Both] 這類說話者標籤 → 記在後續每一句的 role 欄；
  - 同名段落（兩次 [Chorus]）自動編號 Chorus 1、Chorus 2。
用法: python -I analyze_song.py
"""
import json, pathlib, re, subprocess, zipfile, html, tempfile, sys, wave
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parents[1]; src = root / 'sources'; data = root / 'data'; data.mkdir(exist_ok=True)
mp3s, docxs = sorted(src.glob('*.mp3')), sorted(p for p in src.glob('*.docx') if not p.name.startswith('~$'))
if len(mp3s) != 1 or len(docxs) != 1: sys.exit(f'sources/ 需要剛好 1 個 .mp3 和 1 個 .docx（現有 {len(mp3s)} 個 mp3、{len(docxs)} 個 docx）')
mp3, docx = mp3s[0], docxs[0]

# 1. 歌詞 Word 檔 / lyrics docx → 逐行
SECTION = r'(Intro|Verse(?: \d+)?|Pre-Chorus|Chorus|Post-Chorus|Bridge|Dance Break|Break|Interlude|Final Chorus|Outro|Hook|Rap)'
SPEAKER = r'(Child [A-Z]|Both(?:, sung)?|All|Group|Boy|Girl|Male(?: voice)?|Female(?: voice)?|Teacher|Student[s]?(?: [A-Z])?|[A-Z][a-z]+)'
xml = zipfile.ZipFile(docx).read('word/document.xml').decode('utf-8')
xml = re.sub(r'<w:br\s*/>|<w:cr\s*/>', '<w:t>\n</w:t>', xml)                     # 段內換行 / in-paragraph line breaks
paras = [html.unescape(''.join(re.findall(r'<w:t(?:\s[^>]*)?>(.*?)</w:t>', p, re.S))) for p in re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)]
lines, sec, role, seen = [], None, None, {}
for t in (x.strip() for p in paras for x in p.split('\n')):
    if not t: continue
    m = re.fullmatch(r'\[' + SECTION + r'\]', t)
    if m:
        base = m.group(1); seen[base] = seen.get(base, 0) + 1; role = None
        sec = f'{base} {seen[base]}' if base in ('Verse', 'Chorus', 'Pre-Chorus', 'Post-Chorus', 'Bridge', 'Dance Break', 'Hook') else base   # 重複段落編號 / number repeated sections
        continue
    if t.startswith('['):
        r = re.fullmatch(r'\[' + SPEAKER + r'\]', t)
        if r: role = r.group(1)                                                       # 說話者標籤 / speaker tag
        lines.append({'section': sec, 'direction': t}); continue
    lines.append({'section': sec, 'role': role, 'text': t})
(data / 'lyrics-docx.json').write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding='utf-8')
sung = [l['text'] for l in lines if 'text' in l]

# 2. MP3 標籤 / embedded tags
tags = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format_tags:format=duration', '-of', 'json', str(mp3)]).decode('utf-8', 'replace'))
fmt = tags.get('format', {}); tg = {k.lower(): v for k, v in fmt.get('tags', {}).items()}
lyr_tag = next((v for k, v in tg.items() if k.startswith('lyrics')), '')
(data / 'lyrics-mp3-tag.txt').write_text(lyr_tag, encoding='utf-8')
(data / 'audio-tags.json').write_text(json.dumps({'file': mp3.name, 'duration': float(fmt.get('duration', 0)), 'tags': {k: v for k, v in tg.items() if not k.startswith('lyrics')}}, ensure_ascii=False, indent=1), encoding='utf-8')
if lyr_tag:
    tag_lines = [x.strip() for x in lyr_tag.splitlines() if x.strip() and not x.strip().startswith('[')]
    if tag_lines != sung: print(f'注意：MP3 內嵌歌詞（{len(tag_lines)} 句）與 Word 檔（{len(sung)} 句）不同，請比對 data/lyrics-mp3-tag.txt')
if re.search(r'\d\.\d+x', tg.get('title', '')): print(f"注意：MP3 標題「{tg['title']}」看起來是變速版")

# 3. 逐字辨識 / word-level ASR（直接給 numpy 陣列，避開 PyAV 版本問題）
import numpy as np
wav = pathlib.Path(tempfile.gettempdir()) / f'{root.name}-16k.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', '16000', str(wav)], check=True)
with wave.open(str(wav)) as w: audio16 = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
from faster_whisper import WhisperModel
model = WhisperModel('small.en', device='cpu', compute_type='int8')
def asr(prompt):
    segs, info = model.transcribe(audio16, language='en', word_timestamps=True, vad_filter=False, beam_size=5, initial_prompt=prompt, condition_on_previous_text=False)
    out = [{'start': round(s.start, 2), 'end': round(s.end, 2), 'text': s.text,
            'words': [{'word': w.word, 'start': round(w.start, 2), 'end': round(w.end, 2), 'probability': round(w.probability, 3)} for w in (s.words or [])]} for s in segs]
    return {'model': 'faster-whisper small.en int8', 'prompted': bool(prompt), 'duration': info.duration, 'status': 'UNVERIFIED', 'segments': out}
for name, prompt in (('asr-unprompted.json', None), ('asr-prompted.json', ' '.join(sung[:40]))):
    r = asr(prompt); (data / name).write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
    print(name, len(r['segments']), 'segments', sum(len(s['words']) for s in r['segments']), 'words')

# 4. 拍點 / beats
import librosa
y, sr = librosa.load(str(wav), sr=16000, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
rms = librosa.feature.rms(y=y, frame_length=16000, hop_length=16000)[0]
music = {'method': 'librosa beat_track on 16 kHz mono; candidates only (could be half/double)', 'status': 'UNVERIFIED',
         'tempo_candidate': float(np.atleast_1d(tempo)[0]), 'beat_count': int(len(beats)), 'beats': [round(float(b), 3) for b in beats],
         'rms_db_per_second': [round(float(20 * np.log10(v + 1e-9)), 1) for v in rms], 'duration': round(len(y) / sr, 3)}
(data / 'music-analysis.json').write_text(json.dumps(music, indent=1), encoding='utf-8')
print('lyric lines', len(sung), '| tempo', round(music['tempo_candidate'], 2), '| beats', music['beat_count'], '| duration', music['duration'])
