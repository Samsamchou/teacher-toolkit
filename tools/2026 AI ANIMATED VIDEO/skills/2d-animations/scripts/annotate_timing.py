"""annotate_timing.py（2d-animations skill 通用版）— 在 align_lines.py 結果上加：句首校正、需聽校旗標、對嘴指定、場景。
- 句首校正：兩份 ASR（提示／不提示）對同一句第一個字的起點相差 > 0.5 s 時，取該字辨識機率較高的那份
  （ASR 常把前奏空白吸進第一個字，造成句首偏早）。被校正的句子標 onset_disagree。
- 旗標 flags：first_word_long（第一個字 > 1.0 s，起點可能偏早）、zero_len_word、low_prob（有字機率 < 0.3）、
  asr_diff（兩次辨識用字不同）、adlib_in_parens（括號和聲，不上字幕）、CROSSES_SCENE（句子跨場景交界，要調場景邊界）。
- 對嘴 lipsync：副歌／Intro／Outro／群唱＝ALL；有說話者標籤（Child A、Both…）＝該標籤；其他＝?（在分鏡表中依教師規則決定）。
- 場景：讀 planning/scenes.json（[["S00","Intro",0.0,11.0], …]，首尾相接、涵蓋全曲）；沒有時暫以「每個段落一個場景」推算，
  邊界放在前一段最後一句與下一段第一句的中點。
輸出 data/lyrics-timing-reviewed.json 與 planning/lyrics-timing-reviewed.csv（UNVERIFIED，待教師聽校）。
"""
import json, re, csv, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parents[1]; data = root / 'data'
T = json.loads((data / 'lyrics-timing.json').read_text(encoding='utf-8'))
dur = json.loads((data / 'music-analysis.json').read_text(encoding='utf-8'))['duration']
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower().replace('’', "'")).split()
def words(name):
    d = json.loads((data / name).read_text(encoding='utf-8'))
    return [dict(w, n=(norm(w['word']) or [''])[0]) for s in d['segments'] for w in s['words']]
W = {'prompted': words('asr-prompted.json'), 'unprompted': words('asr-unprompted.json')}
sc_file = root / 'planning' / 'scenes.json'
if sc_file.exists(): SCENES = [tuple(s) for s in json.loads(sc_file.read_text(encoding='utf-8'))]
else:
    SCENES, lines = [], T['lines']
    for i, r in enumerate(lines):
        if i == 0 or r['section'] != lines[i - 1]['section']:
            b = 0.0 if i == 0 else round((lines[i - 1]['end'] + r['start']) / 2, 2)
            if SCENES: SCENES[-1] = SCENES[-1][:3] + (b,)
            SCENES.append((f'S{len(SCENES):02d}', r['section'] or '?', b, dur))
    print('（尚無 planning/scenes.json：暫以每段一場景推算，分鏡表定案後請寫入 scenes.json 再重跑）')
GROUP = re.compile(r'^(Intro|Outro|Chorus|Final Chorus|Pre-Chorus|Post-Chorus|Hook|Dance Break)', re.I)
def lip(r):
    if r.get('role'): return {'Both': 'A+B', 'Both, sung': 'A+B'}.get(r['role'], r['role'])
    return 'ALL' if GROUP.match(r['section'] or '') else '?'
def span(ws, t0, t1): return [w for w in ws if w['start'] >= t0 - .05 and w['end'] <= t1 + .05]
out = []
for r in T['lines']:
    ws = {k: span(v, r['start'], r['end']) for k, v in W.items()}
    toks = [t for t in norm(re.sub(r'\(.*?\)', '', r['text'])) if t] or [t for t in norm(r['text']) if t]
    first = {}
    for k, v in W.items():
        c = [w for w in v if toks and w['n'] == toks[0] and abs(w['start'] - r['start']) < 1.6]
        if c: first[k] = min(c, key=lambda w: abs(w['start'] - r['start']))
    flags, start, srck = [], r['start'], r['source']
    if len(first) == 2 and abs(first['prompted']['start'] - first['unprompted']['start']) > .5:   # 兩次不一致 → 取高信心 / take the more confident
        srck = max(first, key=lambda k: first[k]['probability']); start = first[srck]['start']; flags.append('onset_disagree')
        if span(W[srck], start, r['end']): ws[srck] = span(W[srck], start, r['end'])
    chosen = ws[srck] or ws['prompted'] or ws['unprompted']
    if chosen and chosen[0]['end'] - chosen[0]['start'] > 1.0: flags.append('first_word_long')
    if any(w['end'] - w['start'] < .02 for w in chosen): flags.append('zero_len_word')
    if any(w['probability'] < .3 for w in chosen): flags.append('low_prob')
    if [w['n'] for w in ws['prompted']] != [w['n'] for w in ws['unprompted']]: flags.append('asr_diff')
    if '(' in r['text']: flags.append('adlib_in_parens')
    if 'interpolated' in (r.get('note') or ''): flags.append('not_found')
    sc = next((s for s in SCENES if s[2] <= start < s[3]), SCENES[-1])
    if r['end'] > sc[3] + .05: flags.append('CROSSES_SCENE')
    out.append({'n': r['n'], 'scene': sc[0], 'section': r['section'], 'role': r.get('role') or '', 'lipsync': lip(r),
                'text': r['text'], 'start': round(start, 2), 'end': r['end'], 'mid': round((start + r['end']) / 2, 2),
                'match': r['match'], 'asr_source': srck, 'f0_median_hz': r['f0_median_hz'], 'voice_guess': r['voice_guess'],
                'flags': ';'.join(flags), 'word_times': ' '.join('%s@%.2f' % (w['word'].strip(' ,.!?'), w['start']) for w in chosen)})
res = {'status': 'UNVERIFIED — 待教師聽校', 'duration_s': dur, 'frames_30fps': round(dur * 30), 'tempo_candidate_bpm': round(T['tempo_candidate'], 2),
       'scenes': [dict(zip(('id', 'name', 'start', 'end'), s)) for s in SCENES], 'lines': out}
(data / 'lyrics-timing-reviewed.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
with open(root / 'planning' / 'lyrics-timing-reviewed.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
print(f"{len(out)} 句；句首校正 {sum('onset_disagree' in o['flags'] for o in out)} 句；跨場景 {sum('CROSSES_SCENE' in o['flags'] for o in out)} 句")
for o in out: print('%2d %s %-12s %-5s %6.2f-%6.2f %-40s %s' % (o['n'], o['scene'], o['section'] or '', o['lipsync'], o['start'], o['end'], o['flags'], o['text']))
