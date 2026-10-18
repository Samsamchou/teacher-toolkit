# -*- coding: utf-8 -*-
"""Battle-plan options for the teacher: how many battles, after which question, and the seconds of
EVERY battle, so the teacher can pick a plan and change any single battle's time.

  python -I battle_plan.py --items 32                       # compare every 2 / 3 / 4 questions
  python -I battle_plan.py --items 32 --every 3 --boss 2    # one plan, per-battle table
  python -I battle_plan.py --items 32 --every 3 --boss 2 --seconds "20,21,22,23,24,25,26,28,30,67,67" --json plan.json

Defaults follow the accepted HWG5 mission: normal battles grow from 20 s to 30 s, the last
--boss battles are Boss phases of 67 s. Time estimates use ~50 s per question (40 s spelling,
60 s drag-and-drop, incl. retries and explanations) + ~10 s per battle for loading and results.
"""
import argparse, json, math, sys

def plan(items, every, boss, seconds=None, first=20.0, last=30.0, boss_seconds=67.0):
    n = math.ceil(items / every)
    afters = [min(items, every * (i + 1)) for i in range(n)]
    normal = n - boss
    if seconds:
        secs = [float(s) for s in seconds.split(",")]
        if len(secs) != n:
            raise SystemExit(f"--seconds has {len(secs)} values but this plan has {n} battles")
    else:
        secs = [round(first + (last - first) * i / max(1, normal - 1)) for i in range(normal)] + [boss_seconds] * boss
    rows = [{"battle": i + 1, "afterQuestion": afters[i], "questions": afters[i] - (afters[i - 1] if i else 0),
             "seconds": secs[i], "boss": i >= normal, "bossPhase": (i - normal + 1) if i >= normal else None} for i in range(n)]
    game = sum(secs) + 10 * n
    answer = items * 50 + 5 * 60  # questions + ~5 min of story narration
    return {"items": items, "every": every, "battles": n, "boss": boss, "rows": rows,
            "gameMinutes": round(game / 60, 1), "totalMinutes": round((game + answer) / 60)}

def show(p):
    print(f"\n每 {p['every']} 題一戰：共 {p['battles']} 場（Boss {p['boss']} 場）｜遊戲約 {p['gameMinutes']} 分｜全程約 {p['totalMinutes']} 分")
    print("| 場次 | 接在第幾題後 | 這場前答幾題 | 秒數 | 類型 |")
    print("|---|---|---|---|---|")
    for r in p["rows"]:
        kind = f"Boss 第 {r['bossPhase']} 階段" if r["boss"] else "一般"
        print(f"| {r['battle']} | {r['afterQuestion']} | {r['questions']} | {r['seconds']:g} | {kind} |")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--items", type=int, required=True)
    ap.add_argument("--every", type=int)
    ap.add_argument("--boss", type=int, default=2)
    ap.add_argument("--seconds")
    ap.add_argument("--first", type=float, default=20.0)
    ap.add_argument("--last", type=float, default=30.0)
    ap.add_argument("--boss-seconds", type=float, default=67.0)
    ap.add_argument("--json")
    a = ap.parse_args()
    choices = [a.every] if a.every else [2, 3, 4]
    plans = [plan(a.items, e, a.boss, a.seconds if a.every else None, a.first, a.last, a.boss_seconds) for e in choices]
    for p in plans:
        show(p)
    if a.json:
        open(a.json, "w", encoding="utf-8").write(json.dumps(plans[0] if a.every else plans, ensure_ascii=False, indent=1))
