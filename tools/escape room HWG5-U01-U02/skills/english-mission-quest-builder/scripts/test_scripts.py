# -*- coding: utf-8 -*-
"""Regression test for the skill's scripts against the accepted HWG5 U01+U02 mission.

  python -I test_scripts.py            # exit code 0 = all pass
"""
import subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from parse_question_bank import parse  # noqa: E402
from battle_plan import plan  # noqa: E402

R = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02")
fails = []
def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok: fails.append(msg)

bank = parse(R / "HWG5 U01 + U02 題目與答案表.docx")
check(bank["spelling"] == ["Thursday", "Tuesday", "Wednesday", "Friday", "Saturday", "Chinese", "English",
                           "science", "math", "social studies", "music"], "parser: 11 spelling words in order (incl. 'social studies')")
check(len(bank["drag"]) == 21, "parser: 21 drag items")
d = {x["id"]: x for x in bank["drag"]}
check(d["D02"]["blanks"] == ["time", "9:50"], "parser: D02 blanks time / 9:50")
check(d["D06"]["blanks"] == ["isn't", "Tuesday"], "parser: D06 blanks isn't / Tuesday (apostrophe kept)")
check(d["D17"]["blanks"] == ["social studies", "don't"], "parser: D17 multi-word blank")
check(d["D09"]["kind"] == "complete-answer" and d["D09"]["blanks"] == ["No, it isn't. It's Tuesday."], "parser: D09 complete answer")
check(sum(x["kind"] == "complete-answer" for x in bank["drag"]) == 6, "parser: 6 complete-answer items (D08, D09, D18–D21)")
check(not bank["warnings"], "parser: no warnings on a well-formed bank")
check(sum("same sentence" in n for n in bank["notes"]) == 4, "parser: flags the 4 repeated sentences")

p = plan(32, 3, 2, "20,21,22,23,24,25,26,28,30,67,67")
check(p["battles"] == 11 and [r["afterQuestion"] for r in p["rows"]][-2:] == [30, 32], "plan: HWG5 = 11 battles, last two after Q30 and Q32")
check([r["boss"] for r in p["rows"]].count(True) == 2 and p["rows"][-1]["seconds"] == 67, "plan: 2 boss battles of 67 s")
check(plan(32, 2, 2)["battles"] == 16 and plan(32, 4, 2)["battles"] == 8, "plan: every 2 -> 16, every 4 -> 8")
check(plan(32, 3, 2)["rows"][0]["seconds"] == 20 and plan(32, 3, 2)["rows"][8]["seconds"] == 30, "plan: default normal battles 20 -> 30 s")
bad = subprocess.run([sys.executable, "-I", str(HERE / "battle_plan.py"), "--items", "32", "--every", "3", "--seconds", "1,2"], capture_output=True, text=True)
check(bad.returncode != 0, "plan: wrong number of --seconds values is rejected")

print("ALL PASS" if not fails else f"{len(fails)} FAILED")
sys.exit(1 if fails else 0)
