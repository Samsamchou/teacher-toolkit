"""Build the 12-question Kahoot quiz for the Jiji Line extended video (v2.2; 2026-11-22 Q3/Q12 drop the 蒸汽女王 nickname).

Copies KahootQuizTemplate.xlsx, fills rows 9-20, and writes a segment table.
Segment bounds are whole seconds placed in the pauses between narration lines
(from narration/timeline.json), so no sentence is cut.
Usage: python -I build_kahoot_quiz.py <path-to-KahootQuizTemplate.xlsx>
"""
import json
import shutil
import sys
from pathlib import Path

import openpyxl

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
RENDERS = ROOT / "renders"
XLSX = RENDERS / "集集線延長版-Kahoot-12題.xlsx"
TABLE = RENDERS / "集集線延長版-Kahoot-段落對照表.md"
TIME_LIMIT = 30

# (start s, end s, narration lines, type M=記憶 U=理解, question, [3 options], correct 1-3)
QUIZ = [
    (0, 27, "1–4", "U", "一百多年前，集集線是為了什麼而建的？",
     ["為了載遊客去爬玉山", "為了蓋日月潭發電廠", "為了把糖運到車埕"], 2),
    (27, 60, "5–9", "U", "旅客想從縱貫線換搭集集線的小火車，要在哪一站換車？",
     ["二水車站", "集集車站", "車埕車站"], 1),
    (60, 86, "10–13", "M", "二水車站附近的二八水水公園，可以看到編號 CT278 的什麼？",
     ["一座長長的老窯", "一座檜木造的車站", "一台老火車頭"], 3),
    (86, 110, "14–16", "U", "源泉車站為什麼叫做「源泉」？",
     ["因為附近就是八堡圳的源頭", "因為它的舊名叫做「鼻仔頭」", "因為明湖水庫的水來自這裡"], 1),
    (110, 133, "17–19", "M", "大家為了感謝教大家開水圳的「林先生」，在源泉蓋了什麼？",
     ["木業展示館", "二八水水公園", "林先生廟"], 3),
    (133, 155, "20–22", "U", "九二一大地震後，集集車站為什麼沒有被拆掉？",
     ["因為地震時車站完全沒有受損", "因為大家努力爭取，決定照原來的樣子重建", "因為車站要改成陶藝園區"], 2),
    (155, 181, "23–26", "M", "集集綠色隧道兩旁種的是什麼樹？",
     ["檜木", "香蕉樹", "樟樹"], 3),
    (181, 201, "27–28", "U", "影片說水里以前是山城的交通中心，從哪件事可以看出來？",
     ["以前要去爬玉山的人常從水里出發", "站前空地停滿運糖的台車", "車站旁有長長的綠色隧道"], 1),
    (201, 228, "29–32", "U", "水里的「蛇窯」為什麼叫做蛇窯？",
     ["因為窯裡住著很多蛇", "因為窯身又長又窄，看起來像一條蛇", "因為以前專門燒蛇形的陶器"], 2),
    (228, 252, "33–35", "M", "「車埕」的「埕」是什麼意思？",
     ["終點", "空地", "木頭"], 2),
    (252, 279, "36–39", "M", "車站旁的貯木池以前用來泡木頭，現在變成了什麼？",
     ["陶藝園區", "木業展示館", "美麗的生態池"], 3),
    (279, 309, "40–45", "M", "集集線恢復全線通車時，推出了哪一種可愛的紀念車票？",
     ["石虎紀念車票", "蛇窯紀念車票", "林先生紀念車票"], 1),
]


def mmss(s):
    return f"{s // 60}:{s % 60:02d}"


def check(timeline):
    lines = timeline["lines"]
    prev_end = 0
    for n, (a, b, rng, *_rest) in enumerate(QUIZ, 1):
        assert a == prev_end, f"Q{n} does not start where Q{n - 1} ended"
        prev_end = b
        for ln in lines:  # every line must sit wholly inside one segment (20 ms tolerance)
            if ln["t0"] < b < ln["t1"] - 0.02 and ln["t0"] >= a:
                raise SystemExit(f"Q{n} end {b}s cuts line {ln['i']}")
    assert prev_end >= timeline["dur"], "segments do not reach the end of the video"
    for n, q in enumerate(QUIZ, 1):
        assert len(q[4]) <= 120 and all(len(o) <= 75 for o in q[5]), f"Q{n} too long"
    counts = [sum(1 for q in QUIZ if q[6] == k) for k in (1, 2, 3)]
    types = [sum(1 for q in QUIZ if q[3] == t) for t in "MU"]
    assert counts == [4, 4, 4], counts
    assert types == [6, 6], types


def main():
    template = Path(sys.argv[1])
    timeline = json.loads((ROOT / "narration" / "timeline.json").read_text(encoding="utf-8"))
    check(timeline)

    shutil.copyfile(template, XLSX)
    wb = openpyxl.load_workbook(XLSX)
    ws = wb.active
    for i, (_a, _b, _r, _t, q, opts, ans) in enumerate(QUIZ):
        row = 9 + i
        ws.cell(row, 1).value = i + 1
        ws.cell(row, 2).value = q
        for j in range(4):
            ws.cell(row, 3 + j).value = opts[j] if j < 3 else None
        ws.cell(row, 7).value = TIME_LIMIT
        ws.cell(row, 8).value = str(ans)
    wb.save(XLSX)

    out = [
        "# 集集線延長版 v2.2 × Kahoot 段落對照表",
        "",
        "影片：`集集線五站-2D動畫-延長版-v2.2.mp4`（5:08；2026-11-22 第 12 句改為 CT278，拿掉「蒸汽女王」暱稱）。每段切在兩句旁白之間的停頓，不切斷句子。",
        "Kahoot 做法：每題前加一張 slide → 加入 YouTube 影片 → 開始／結束時間填下表秒數 → 下一張接該題。",
        "",
        "| 題 | 影片段落 | YouTube 開始（秒） | YouTube 結束（秒） | 旁白句 | 題型 | 題目 | 正解 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for i, (a, b, rng, t, q, opts, ans) in enumerate(QUIZ, 1):
        kind = "記憶" if t == "M" else "理解"
        out.append(f"| {i} | {mmss(a)}–{mmss(b)} | {a} | {b} | {rng} | {kind} | {q} | {ans}. {opts[ans - 1]} |")
    out += ["", "答題時間每題 30 秒；正解分布 1／2／3 號各 4 題；記憶 6 題、理解 6 題。", ""]
    TABLE.write_text("\n".join(out), encoding="utf-8")
    print("wrote", XLSX.name, "and", TABLE.name)


if __name__ == "__main__":
    main()
