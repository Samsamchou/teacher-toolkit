"""pick_stills.py — 從 timeline_v1.json 挑每段代表時間點，印出給 render_v1.py --still 用。"""
import json, pathlib
S = json.loads((pathlib.Path(__file__).resolve().parent / 'timeline_v1.json').read_text(encoding='utf-8'))['segs']
m = lambda s: round((s['t0'] + s['t1']) / 2, 2)
sec = lambda name: [s for s in S if s['sec'] == name]
pick = [m(S[0]), m(S[3])]
for name, idx in [('02-q1', 3), ('02-q1', 8), ('03-ans', 3), ('04-q2', 0), ('05-demo', 0), ('06-ctx', 2), ('06-ctx', 5)]:
    pick.append(m(sec(name)[idx]))
tk = sec('07-talk'); pick += [m(tk[0]), m(tk[4]), m(tk[12]), m(tk[18]), m(tk[20])]
q = sec('08-quiz'); pick += [m(q[1]), m(q[2])]
print(' '.join(map(str, pick)))
