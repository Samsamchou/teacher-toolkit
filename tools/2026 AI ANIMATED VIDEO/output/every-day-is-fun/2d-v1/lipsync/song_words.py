"""song_words.py（Every Day Is Fun）— 產生全曲共用時間資料 engine/song-data.js：
  SONG = { dur, bpm, beats[], cues: [[t0, t1, text, tokens:[[a, b, tok], ...]], ...] }
- cues：data/lyrics-timing.json 的 52 句（依實際演唱順序；Dance Break 已展開為 7 句）。
- tokens：每句的字依序對到 ASR 逐字時碼（asr-prompted 與 asr-unprompted 取對上較多者），對不到的字在前後之間內插。
- beats：data/music-analysis.json（librosa，約 104 BPM，候選值）。
用法: python -I song_words.py
"""
import json, pathlib, re
here = pathlib.Path(__file__).resolve().parent; song = here.parents[1]; data = song / 'data'
lines = json.loads((data / 'lyrics-timing.json').read_text(encoding='utf-8'))['lines']
norm = lambda s: re.sub(r"[^a-z']", '', s.lower().replace('’', "'"))
alias = {'pe': {'pe', 'p', 'pea'}, 'bye': {'bye', 'byebye'}}
def eq(a, b): return a == b or b in alias.get(a, ()) or (len(a) > 3 and (a.startswith(b) or b.startswith(a)))
def words(name):
    d = json.loads((data / name).read_text(encoding='utf-8'))
    return [(w['start'], w['end'], norm(w['word'])) for s in d['segments'] for w in s['words']]
W = [words('asr-prompted.json'), words('asr-unprompted.json')]
cues, interp = [], 0
for i, l in enumerate(lines):
    t0, t1 = l['start'], l['end']
    nxt = lines[i + 1]['start'] if i + 1 < len(lines) else t1 + 1.5
    t1 = max(t1, min(nxt - .05, t1 + .35))                      # 字幕多停一下 / hold subtitle briefly
    toks = [x for x in re.sub(r'—', '— ', l['text']).split(' ') if x]
    best = None
    for ws in W:
        pool = [w for w in ws if t0 - .4 <= w[0] < t1 + .2]; j = 0; times = [None] * len(toks)
        for k, tk in enumerate(toks):
            n = norm(tk)
            for m in range(j, min(j + 4, len(pool))):
                if n and eq(n, pool[m][2]): times[k] = [max(t0, pool[m][0]), max(pool[m][1], pool[m][0] + .1)]; j = m + 1; break
        hits = sum(x is not None for x in times)
        if best is None or hits > best[0]: best = (hits, times)
    times = best[1]
    k = 0
    while k < len(toks):                                         # 內插 / interpolate gaps
        if times[k] is None:
            e = k
            while e < len(toks) and times[e] is None: e += 1
            a = times[k - 1][1] if k > 0 else t0; b = times[e][0] if e < len(toks) else l['end']
            step = max(.08, (b - a) / (e - k))
            for m in range(k, e): times[m] = [a + (m - k) * step, a + (m - k + 1) * step]; interp += 1
            k = e
        else: k += 1
    for m in range(1, len(times)):
        if times[m][0] < times[m - 1][0]: times[m][0] = times[m - 1][0]
        times[m][1] = max(times[m][1], times[m][0] + .06)
    cues.append([round(t0, 3), round(t1, 3), l['text'], [[round(a, 3), round(b, 3), tk] for (a, b), tk in zip(times, toks)]])
music = json.loads((data / 'music-analysis.json').read_text(encoding='utf-8'))
out = {'dur': 190.0, 'bpm': round(music['tempo_candidate'], 2), 'beats': music['beats'], 'cues': cues}
dst = here.parent / 'engine' / 'song-data.js'
dst.write_text('// 自動產生 by lipsync/song_words.py（Every Day Is Fun）— 字幕／逐字／拍點（全曲秒數）/ generated\nconst SONG = ' + json.dumps(out, ensure_ascii=False) + ';\n', encoding='utf-8')
print(dst.name, len(cues), 'cues;', sum(len(c[3]) for c in cues), 'tokens;', interp, 'interpolated')
