"""align_lines.py（2d-animations skill 通用版）— 把「實際演唱順序」的每一句對到 ASR 逐字時碼，並以音高估男聲／女聲。
演唱順序：
  - 預設＝歌詞 Word 檔順序（data/lyrics-docx.json），不再內建任何一首歌的展開規則。
  - 若 ASR 顯示實唱與 Word 檔不同（段落重複次數、多唱的句子），把實際演唱順序寫進 planning/sung-sequence.txt
    （一行一句，可加「#section=Dance Break」與「#role=Child A」設定其後各句的段落／角色，「#note=…」加備註），本程式會改用它。
時間：asr-prompted 與 asr-unprompted 依序比對，取對上較多字的那份；開始＝第一個對上的字、結束＝最後一個字。
音高：librosa.pyin 對該句時間窗（中央聲道、200–3400 Hz 帶通）取中位數 F0；> 220 Hz 傾向女聲／童聲、< 175 Hz 傾向男聲。
      只在對唱段可信；副歌、群唱被低音伴奏干擾，數值不要採用。
輸出 data/lyrics-timing.json 與 planning/lyrics-timing.csv（接著跑 annotate_timing.py）。
"""
import json, re, pathlib, csv, subprocess, tempfile, sys
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np, librosa
root = pathlib.Path(__file__).resolve().parents[1]; data = root / 'data'; (root / 'planning').mkdir(exist_ok=True)
mp3 = sorted((root / 'sources').glob('*.mp3'))[0]
seq_file = root / 'planning' / 'sung-sequence.txt'
if seq_file.exists():                                                                 # 教師／你確認過的實唱順序 / explicit sung order
    seq, sec, role, note = [], None, None, ''
    for raw in seq_file.read_text(encoding='utf-8').splitlines():
        t = raw.strip()
        if not t: continue
        m = re.match(r'#(section|role|note)=(.*)', t)
        if m: k, v = m.group(1), m.group(2).strip(); sec, role, note = (v, role, note) if k == 'section' else (sec, v or None, note) if k == 'role' else (sec, role, v); continue
        seq.append({'section': sec, 'role': role, 'text': t, 'note': note})
    print(f'使用 planning/sung-sequence.txt：{len(seq)} 句')
else:
    seq = [dict(l) for l in json.loads((data / 'lyrics-docx.json').read_text(encoding='utf-8')) if 'text' in l]
    print(f'使用 Word 檔順序：{len(seq)} 句（若實唱有重複或多唱，請建立 planning/sung-sequence.txt 後重跑）')
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower().replace('’', "'")).split()
def words(name):
    d = json.loads((data / name).read_text(encoding='utf-8'))
    return [(w['start'], w['end'], (norm(w['word']) or [''])[0]) for s in d['segments'] for w in s['words']]
W = {'prompted': words('asr-prompted.json'), 'unprompted': words('asr-unprompted.json')}
alias = {'pe': {'pe', 'p', 'pea'}, "it's": {"it's", 'its'}, 'bye': {'bye', 'byebye'}}
def eq(a, b): return a == b or b in alias.get(a, ()) or (len(a) > 3 and (a.startswith(b) or b.startswith(a)))
def align(seq, ws):
    j, out = 0, []
    for l in seq:
        toks = [t for t in norm(re.sub(r'\(.*?\)', '', l['text'])) if t] or [t for t in norm(l['text']) if t]   # 只有括號的句子用括號內字
        hits = []
        for t in toks:
            for k in range(j, min(j + 8, len(ws))):
                if eq(t, ws[k][2]): hits.append(ws[k]); j = k + 1; break
        out.append((len(hits) / max(1, len(toks)), hits))
    return out
A = {k: align(seq, v) for k, v in W.items()}
wav = pathlib.Path(tempfile.gettempdir()) / f'{root.name}-mid.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-af', 'pan=mono|c0=0.5*c0+0.5*c1,highpass=f=200,lowpass=f=3400', '-ar', '16000', str(wav)], check=True)
y, sr = librosa.load(str(wav), sr=16000)
rows = []
for i, l in enumerate(seq):
    (fp, hp), (fu, hu) = A['prompted'][i], A['unprompted'][i]
    src, frac, hits = ('prompted', fp, hp) if fp >= fu else ('unprompted', fu, hu)
    st, en = (hits[0][0], hits[-1][1]) if hits else (None, None)
    f0med = None
    if st is not None and en - st > .25:
        f0, vf, _ = librosa.pyin(y[int(st * sr):int(en * sr)], fmin=80, fmax=700, sr=sr, frame_length=1024)
        v = f0[vf & ~np.isnan(f0)]
        if len(v) > 5: f0med = float(np.median(v))
    voice = None if f0med is None else ('female/child?' if f0med > 220 else 'male?' if f0med < 175 else 'unclear')
    rows.append({'n': i + 1, 'section': l['section'], 'role': l.get('role'), 'text': l['text'], 'start': st and round(st, 2), 'end': en and round(en, 2),
                 'match': round(frac, 2), 'source': src, 'f0_median_hz': f0med and round(f0med), 'voice_guess': voice, 'note': l.get('note', '')})
for i, r in enumerate(rows):                                                           # 未對上：前後內插 / interpolate unmatched
    if r['start'] is None:
        prev = next((x['end'] for x in reversed(rows[:i]) if x['end']), 0); nxt = next((x['start'] for x in rows[i + 1:] if x['start']), prev + 2)
        r['start'], r['end'], r['note'] = round(prev + .1, 2), round(max(prev + .5, nxt - .1), 2), (r['note'] + '; ' if r['note'] else '') + 'not found in ASR, interpolated'
(data / 'lyrics-timing.json').write_text(json.dumps({'status': 'UNVERIFIED', 'tempo_candidate': json.loads((data / 'music-analysis.json').read_text())['tempo_candidate'], 'lines': rows}, ensure_ascii=False, indent=1), encoding='utf-8')
with open(root / 'planning' / 'lyrics-timing.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
low = [r['n'] for r in rows if r['match'] < .6]
print(f'{len(rows)} 句；對字率 < 0.6：{low or "無"}')
for r in rows: print('%2d %-14s %-10s %6s-%6s m=%.2f %4s %-14s %s %s' % (r['n'], r['section'], r['role'] or '', r['start'], r['end'], r['match'], r['f0_median_hz'] or '', r['voice_guess'] or '', r['text'], r['note']))
