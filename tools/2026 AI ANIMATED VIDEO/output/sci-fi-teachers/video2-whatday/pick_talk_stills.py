"""pick_talk_stills.py — 印出某一部對話（預設第 1 部）每句台詞中間的時間，加上問答與跟唸，給 render_v1.py --still 用。"""
import json, pathlib, sys
S = json.loads((pathlib.Path(__file__).resolve().parent / 'timeline_v1.json').read_text(encoding='utf-8'))['segs']
no = sys.argv[1] if len(sys.argv) > 1 else '1'
ts = [round((s['t0'] + s['t1']) / 2, 2) for s in S if f'talk:{no}；' in s['vis'] + '；' and ('pass:1' in s['vis'] or 'pass' not in s['vis'])]
print(' '.join(map(str, ts)))
