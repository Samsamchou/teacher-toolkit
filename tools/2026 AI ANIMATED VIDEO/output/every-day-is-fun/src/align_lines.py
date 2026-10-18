"""align_lines.py — 把「實際演唱順序」的每一句對到 ASR 逐字時碼，並以音高估計男聲／女聲。
- 演唱順序 = 歌詞 Word 檔順序，但 Dance Break 依 ASR 證據展開為 7 句（星期口號重複），標記為「需聽校」。
- 時間：以 asr-prompted 與 asr-unprompted 兩份逐字結果做依序比對，取較多字對上的那份；開始＝第一個對上的字、結束＝最後一個對上的字。
- 音高：librosa.pyin 對該句時間窗（中央聲道、200–3400 Hz 帶通）取有聲音框的中位數 F0；> 220 Hz 傾向女聲、< 175 Hz 傾向男聲，中間為不確定。
  K-pop 群唱與伴奏會干擾，這只是候選判斷，仍需教師試聽確認。
輸出 data/lyrics-timing.json 與 planning/lyrics-timing.csv。
"""
import json, re, pathlib, csv, subprocess, tempfile
import numpy as np, librosa
root = pathlib.Path(__file__).resolve().parents[1]; data = root / 'data'
lines = [l for l in json.loads((data / 'lyrics-docx.json').read_text(encoding='utf-8')) if 'text' in l]
# 依 ASR 展開 Dance Break（Word 檔 1 次＝2 句；實唱約 7 句）/ expand the dance break as actually sung
seq = []
for l in lines:
    if l['section'] == 'Dance Break':
        if any(s['section'] == 'Dance Break' for s in seq): continue
        for k in range(7):
            seq.append({'section': 'Dance Break', 'text': ['Monday, Tuesday, Wednesday, hey! (hey!)', 'Thursday, Friday, Saturday, Sunday! (yeah!)'][k % 2], 'note': 'repeat count from ASR, verify by ear'})
    else: seq.append(dict(l))
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower().replace('’', "'")).split()
def words(name):
    d = json.loads((data / name).read_text(encoding='utf-8'))
    return [(w['start'], w['end'], (norm(w['word']) or [''])[0]) for s in d['segments'] for w in s['words']]
W = {'prompted': words('asr-prompted.json'), 'unprompted': words('asr-unprompted.json')}
alias = {'pe': {'pe', 'p', 'pea'}, 'grandma': {'grandma'}, "it's": {"it's", 'its'}, 'bye': {'bye', 'byebye'}}
def eq(a, b): return a == b or b in alias.get(a, ()) or (len(a) > 3 and (a.startswith(b) or b.startswith(a)))
def align(seq, ws):
    j, out = 0, []
    for l in seq:
        toks = [t for t in norm(re.sub(r'\(.*?\)', '', l['text'])) if t] or [t for t in norm(l['text']) if t]   # 只有括號的句子（dribble、bye-bye）就用括號內的字
        hits = []
        for t in toks:
            for k in range(j, min(j + 8, len(ws))):
                if eq(t, ws[k][2]): hits.append(ws[k]); j = k + 1; break
        out.append((len(hits) / max(1, len(toks)), hits))
    return out
A = {k: align(seq, v) for k, v in W.items()}
# 音高 / pitch
wav = pathlib.Path(tempfile.gettempdir()) / 'edif-mid.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(root / 'sources' / 'Every Day Is Fun.mp3'), '-af', 'pan=mono|c0=0.5*c0+0.5*c1,highpass=f=200,lowpass=f=3400', '-ar', '16000', str(wav)], check=True)
y, sr = librosa.load(str(wav), sr=16000)
rows = []
for i, l in enumerate(seq):
    (fp, hp), (fu, hu) = A['prompted'][i], A['unprompted'][i]
    src, frac, hits = ('prompted', fp, hp) if fp >= fu else ('unprompted', fu, hu)
    st, en = (hits[0][0], hits[-1][1]) if hits else (None, None)
    f0med = None
    if st is not None and en - st > .25:
        seg = y[int(st * sr):int(en * sr)]
        f0, vf, _ = librosa.pyin(seg, fmin=80, fmax=700, sr=sr, frame_length=1024)
        v = f0[vf & ~np.isnan(f0)]
        if len(v) > 5: f0med = float(np.median(v))
    voice = None if f0med is None else ('female?' if f0med > 220 else 'male?' if f0med < 175 else 'unclear')
    rows.append({'n': i + 1, 'section': l['section'], 'text': l['text'], 'start': st and round(st, 2), 'end': en and round(en, 2),
                 'match': round(frac, 2), 'source': src, 'f0_median_hz': f0med and round(f0med), 'voice_guess': voice, 'note': l.get('note', '')})
# 未對上的句子：以前後句內插 / fill unmatched lines between neighbours
for i, r in enumerate(rows):
    if r['start'] is None:
        prev = next((x['end'] for x in reversed(rows[:i]) if x['end']), 0); nxt = next((x['start'] for x in rows[i + 1:] if x['start']), prev + 2)
        r['start'], r['end'], r['note'] = round(prev + .1, 2), round(max(prev + .5, nxt - .1), 2), (r['note'] + '; ' if r['note'] else '') + 'not found in ASR, interpolated'
(data / 'lyrics-timing.json').write_text(json.dumps({'status': 'UNVERIFIED', 'tempo_candidate': json.loads((data / 'music-analysis.json').read_text())['tempo_candidate'], 'lines': rows}, ensure_ascii=False, indent=1), encoding='utf-8')
with open(root / 'planning' / 'lyrics-timing.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
for r in rows: print(('%2d %-12s %6s-%6s m=%.2f %4s %-8s %s %s' % (r['n'], r['section'], r['start'], r['end'], r['match'], r['f0_median_hz'] or '', r['voice_guess'] or '', r['text'], r['note'])).encode('ascii', 'replace').decode())
