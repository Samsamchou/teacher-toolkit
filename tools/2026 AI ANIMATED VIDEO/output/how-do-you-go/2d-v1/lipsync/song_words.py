"""song_words.py — 產生全曲共用時間資料 engine/song-data.js：
  SONG = { dur, bpm, beats[], cues: [[t0, t1, text, tokens:[[a, b, tok], ...]], ...] }
- cues：52 句正式字幕（renders/How-Do-You-Go-English.srt，已校驗時碼）。
- tokens：把每句的字（含標點）依序對到 faster-whisper 逐字時碼（data/asr-candidates.json＋asr-focused-candidates.json）；
  對不到的字（如 (Hey!) 群喊）在前後已對到的字之間平均內插，並限制在該句時間內、單調遞增。
- beats：librosa 拍點候選（data/music-candidates.json，約 136 BPM）。
所有時間為「全曲秒數」。場景用 SCENE.songStart 換成本地時間。
用法: python -I song_words.py
"""
import json, pathlib, re

here = pathlib.Path(__file__).resolve().parent; song = here.parents[1]
srt = (song / 'renders' / 'How-Do-You-Go-English.srt').read_text(encoding='utf-8').strip().split('\n\n')
def sec(x): h, m, r = x.split(':'); a, b = r.split(','); return int(h) * 3600 + int(m) * 60 + int(a) + int(b) / 1000
cues = []
for blk in srt:
    l = blk.split('\n'); a, b = l[1].split(' --> '); cues.append([sec(a), sec(b), ' '.join(l[2:])])
asr = json.loads((song / 'data' / 'asr-candidates.json').read_text(encoding='utf-8'))
words = [(w['start'], w['end'], w['word']) for s in asr['segments'] for w in s['words']]
foc = json.loads((song / 'data' / 'asr-focused-candidates.json').read_text(encoding='utf-8'))
words = [w for w in words if not (118 <= w[0] < 148.5)] + [(w['start'], w['end'], w['word']) for s in foc for w in s['words']]
words.sort()
norm = lambda s: re.sub(r"[^a-z']", '', s.lower().replace('’', "'"))
out, unmatched, respread = [], 0, []
for t0, t1, text in cues:
    toks = [x for x in re.sub(r'—', '— ', text).split(' ') if x]
    pool = [w for w in words if t0 - .3 <= w[0] < t1 + .2]
    times, j = [None] * len(toks), 0
    for i, tk in enumerate(toks):
        n = norm(tk)
        for k in range(j, min(j + 4, len(pool))):
            if norm(pool[k][2]) == n and n:
                times[i] = [max(t0, pool[k][0]), min(t1, max(pool[k][1], pool[k][0] + .1))]; j = k + 1; break
    # 內插未對到的字 / interpolate gaps
    i = 0
    while i < len(toks):
        if times[i] is None:
            k = i
            while k < len(toks) and times[k] is None: k += 1
            a = times[i - 1][1] if i > 0 else t0
            b = times[k][0] if k < len(toks) else t1
            step = max(.08, (b - a) / (k - i))
            for m in range(i, k): times[m] = [a + (m - i) * step, a + (m - i + 1) * step]; unmatched += 1
            i = k
        else: i += 1
    for m in range(1, len(times)):                      # 單調 / monotonic
        if times[m][0] < times[m - 1][0]: times[m][0] = times[m - 1][0]
        times[m][1] = max(times[m][1], times[m][0] + .06)
    # ASR 把整句擠在很短時間（< 30% 句長、句長 > 3 s）時，改依字長平均分配到整句 / re-spread compressed lines
    if t1 - t0 > 3 and times[-1][1] - times[0][0] < .3 * (t1 - t0):
        wts = [max(1, len(norm(x))) for x in toks]; acc = t0; span = (t1 - t0) * .92
        for m, wv in enumerate(wts): d = span * wv / sum(wts); times[m] = [acc, acc + d * .85]; acc += d
        respread.append(text)
    out.append([round(t0, 3), round(t1, 3), text, [[round(a, 3), round(b, 3), tk] for (a, b), tk in zip(times, toks)]])
music = json.loads((song / 'data' / 'music-candidates.json').read_text(encoding='utf-8'))
data = {'dur': 172.133333, 'bpm': round(music['tempo_candidate'], 2), 'beats': [round(b, 3) for b in music['beat_candidates']], 'cues': out}
dst = here.parent / 'engine' / 'song-data.js'
dst.write_text('// 自動產生 by lipsync/song_words.py — 全曲字幕／逐字／拍點（全曲秒數）/ generated\nconst SONG = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
print(dst.name, len(out), 'cues;', sum(len(c[3]) for c in out), 'tokens;', unmatched, 'interpolated; re-spread:', [x.encode('ascii', 'replace').decode() for x in respread])
