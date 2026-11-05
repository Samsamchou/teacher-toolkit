"""gen_song.py — data/lines.json＋build_table.py 的中文句意＋Whisper 逐字時間 → 3d/engine/song-data.js
用法: python -I src/gen_song.py
"""
import json, pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parents[1]
L = json.loads((root / 'data' / 'lines.json').read_text(encoding='utf-8'))['lines']
src = (root / 'src' / 'build_table.py').read_text(encoding='utf-8')
ns = {}; exec(src[src.index('R = {'):src.index('EXTRA = {')], ns); R = ns['R']
asr = json.loads((root / 'data' / 'asr-prompted.json').read_text(encoding='utf-8'))
words = [w for s in asr for w in s['words']]
norm = lambda s: re.sub(r"[^a-z]", '', s.lower())
cues = []
for l in L:
    toks = l['text'].replace('(o-o-o-oh)', '').split()
    ws = [w for w in words if l['start'] - .3 <= w['s'] < l['end']]
    out, j = [], 0
    for k, tk in enumerate(toks):   # 逐字：和 ASR 對上就用 ASR 時間，否則平均分配 / match ASR or spread evenly
        t = l['start'] + (l['end'] - l['start']) * k / len(toks)
        for jj in range(j, len(ws)):
            if norm(ws[jj]['w']) and norm(ws[jj]['w'])[:4] == norm(tk)[:4]: t = ws[jj]['s']; j = jj + 1; break
        out.append([round(max(t, l['start']), 2), 0, tk])
    for k in range(len(out)): out[k][1] = out[k + 1][0] if k + 1 < len(out) else l['end']
    cues.append([l['start'], l['end'], l['text'].replace("'it", "' it").replace("'the", "' the").replace("'light", "' light").replace("'down", "' down").replace("'up", "' up"), out, R[l['n']][0], 'en'])
data = {'dur': 222.5, 'cues': cues}
p = root / '3d' / 'engine' / 'song-data.js'
p.write_text('// 自動產生 by src/gen_song.py（Birds）— 字幕／逐字／中文句意\nconst SONG = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
print('wrote', p, len(cues), 'cues')
