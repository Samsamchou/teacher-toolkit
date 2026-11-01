"""把 Wayground 綜合小考（English exam 專案的 quiz_items.json＋0.8 倍速音檔＋圖片）轉成 3D 闖關題庫，
再呼叫 build_mission.py 做成任務資料夾。題型、題數與 Wayground 一致（教師 2026-11-01 RDQ 規格）。

用法：
  python -I -X utf8 tools/build_wayground_sets.py            # 六套全部
  python -I -X utf8 tools/build_wayground_sets.py hwg5u01    # 只做一套
  加 --site <資料夾> 先輸出到別處試做

Wayground 題型 → 遊戲題型：
  選擇題（文字／圖片選項、O／X、閱讀題組、聽力對話）→ choice
  重新排序（聽力排序、句子重組、11/01 改的字母排序）→ order
  填空（每個字母一格）→ spell（字母磚剛好是題目給的字母）
  標籤題（2×2 四格圖）→ label（算 1 題）
  拖放題（對話空格＋多餘字）→ drag（算 1 題）
"""
import itertools
import json
import random
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SRC_ROOT = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\English exam\teachingmaterial-backup-20261017\output")
OUT_ROOT = HERE / "data" / "wayground"

# 代號、來源資料夾、任務名稱、英文名稱、短名（給學生看「這次的題目」）
SETS = [
    ("hwg5u01", "HWG5_小考_Starter-U1_20261031", "二水 3D 英語闖關 HWG5-U01 綜合小考", "Ershui 3D Quest · HWG5 U01", "HWG5-U01 綜合小考"),
    ("hwg5u02", "HWG5_小考_U02_20261031", "二水 3D 英語闖關 HWG5-U02 綜合小考", "Ershui 3D Quest · HWG5 U02", "HWG5-U02 綜合小考"),
    ("hwg5r1", "HWG5_小考_Review1_20261031", "二水 3D 英語闖關 HWG5-review1 綜合小考", "Ershui 3D Quest · HWG5 Review 1", "HWG5-review1 綜合小考"),
    ("hwg7u01", "HWG7_小考_U01_20261031", "二水 3D 英語闖關 HWG7-U01 綜合小考", "Ershui 3D Quest · HWG7 U01", "HWG7-U01 綜合小考"),
    ("hwg7u02", "HWG7_小考_U02_20261031", "二水 3D 英語闖關 HWG7-U02 綜合小考", "Ershui 3D Quest · HWG7 U02", "HWG7-U02 綜合小考"),
    ("hwg7r1", "HWG7_小考_Review1_20261101", "二水 3D 英語闖關 HWG7-review1 綜合小考", "Ershui 3D Quest · HWG7 Review 1", "HWG7-review1 綜合小考"),
]
# Wayground 題數（各份檢核報告讀回的數字）
EXPECT = {"hwg5u01": 44, "hwg5u02": 44, "hwg5r1": 40, "hwg7u01": 44, "hwg7u02": 44, "hwg7r1": 40}

# 2026-11-01 教師指示：這些「讀寫一」單字題在 Wayground 由填空改成重新排序（5 張拆字卡，正確順序）
# 來源：output/SF3_小考_期中範圍讀寫_20261101/_紀錄/舊小考改重新排序_清單_已完成.md
REORDER = {
    "hwg5u01": {"Wednesday": ["Wed", "nes", "d", "a", "y"], "Thursday": ["Th", "ur", "s", "d", "ay"],
                "Saturday": ["Sa", "t", "ur", "d", "ay"]},
    "hwg5u02": {"science": ["s", "ci", "en", "c", "e"], "English": ["E", "ng", "l", "i", "sh"],
                "Chinese": ["Ch", "i", "n", "e", "se"]},
    "hwg7u01": {"Australia": ["Au", "s", "tra", "li", "a"], "Vietnam": ["Vi", "e", "t", "n", "am"],
                "Thursday": ["Th", "ur", "s", "d", "ay"]},
    "hwg7u02": {"train": ["t", "r", "a", "i", "n"], "scooter": ["s", "c", "oo", "t", "er"],
                "metro": ["m", "e", "t", "r", "o"]},
}
REORDER_PROMPT = "Look and Order 看圖，將字母排成正確的單字。"

LOCS = ["station", "inn", "seven", "school", "teatop", "market", "post", "bookstore", "pxmart", "library", "farm",
        "park", "lawn"]
NORMAL = LOCS[:11]


def letter_index(a: str, n: int) -> int:
    i = "ABCDE".index(a.strip().upper())
    assert i < n, a
    return i


def strip_note(t: str) -> str:
    # 「90（數字卡）」→「90」
    return t.split("（")[0].strip()


def scramble(chunks: list, seed: str) -> list:
    """打亂成和正確順序不同的排列（同一題每次一樣）"""
    rng = random.Random(seed)
    out = chunks[:]
    for _ in range(50):
        rng.shuffle(out)
        if out != chunks:
            return out
    return list(reversed(chunks))


def sentence_order(chunks: list, answer: str) -> list:
    for p in itertools.permutations(chunks):
        if " ".join(p) == answer:
            return list(p)
    sys.exit(f"句子重組拼不回答案：{chunks} → {answer}")


class Builder:
    def __init__(self, code: str, folder: str):
        self.code = code
        self.src = SRC_ROOT / folder
        self.rec = self.src / "_紀錄"
        self.data = json.loads((self.rec / "quiz_items.json").read_text(encoding="utf-8"))
        self.items = []      # 遊戲題目
        self.units = []      # [{ids, reading}] 同一段對話／短文的題目要在同一個地點
        self.seq = 0

    def img(self, name: str) -> str:
        p = self.rec / "images" / f"{name}.png"
        if not p.exists():
            sys.exit(f"找不到圖片：{p}")
        return str(p)

    def aud(self, sid: str, q: str, fallback: str = "") -> str:
        d = self.src / "音檔_0.8倍速_每題"
        for name in [f"{sid}-{q}", fallback]:
            if name and (d / f"{name}.mp3").exists():
                return str(d / f"{name}.mp3")
        sys.exit(f"找不到音檔：{sid}-{q}（{d}）")

    def add(self, it: dict, unit: list) -> None:
        self.seq += 1
        base = {"seq": self.seq, "weekStrip": None, "clock": None, "mirrorFrame": False, "lines": []}
        base.update(it)
        self.items.append(base)
        unit.append(base["id"])

    def chart_image(self, sec: dict) -> str:
        """HWG7-review1 讀寫八：Wayground 放的是圖表 PDF；把 PDF 第一頁轉成圖片"""
        import pymupdf
        pdfs = list((self.src / "閱讀PDF").glob("R8_*.pdf"))
        if not pdfs:
            sys.exit("找不到讀寫八的圖表 PDF")
        out = OUT_ROOT / self.code / "R8_chart.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        doc = pymupdf.open(str(pdfs[0]))
        page = doc[0]
        pix = page.get_pixmap(dpi=160)
        pix.save(str(out))
        # 裁掉頁面四周空白，只留標題＋表格＋註解（整頁縮小會看不清楚）
        from PIL import Image, ImageOps
        im = Image.open(out).convert("RGB")
        box = ImageOps.invert(im.convert("L")).point(lambda v: 255 if v > 24 else 0).getbbox()
        if box:
            pad = 16
            box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
            im = im.crop(box)
        im.save(out)
        return str(out)

    def build(self) -> None:
        for sec in self.data["sections"]:
            sid = sec["id"]
            prompt = sec["title"]
            listening = sec["part"] == "聽力"
            if sid == "R4":
                self.label(sec, prompt)
            elif sid == "R5":
                self.drag(sec, prompt)
            elif sid == "R1":
                for it in sec["items"]:
                    self.spell(sid, it, prompt)
            elif sid == "L3":
                for it in sec["items"]:
                    unit = []
                    order = it["answer_order"]
                    self.add({
                        "id": f"{sid}-{it['q']}", "type": "order", "prompt": prompt,
                        "chunks": it["shown"], "answer": order, "audio": self.aud(sid, it["q"]),
                        "hint1En": f'The first word is "{order[0]}".',
                        "hint2En": f'It starts with "{order[0]}", then "{order[1]}".',
                        "correctEn": " → ".join(order),
                        "teacherText": f"聽力排序：{' → '.join(order)}",
                    }, unit)
                    self.units.append({"ids": unit, "reading": False})
            elif sid == "R6":
                for it in sec["items"]:
                    unit = []
                    order = sentence_order(it["chunks"], it["answer"])
                    self.add({
                        "id": f"{sid}-{it['q']}", "type": "order", "prompt": prompt,
                        "chunks": it["chunks"], "answer": order,
                        "hint1En": f'The first part is "{order[0]}".',
                        "hint2En": f'It starts with "{order[0]} {order[1]}".',
                        "correctEn": it["answer"],
                        "teacherText": f"句子重組：{it['answer']}",
                    }, unit)
                    self.units.append({"ids": unit, "reading": False})
            else:
                self.choice_section(sec, prompt, listening)

    def choice_section(self, sec: dict, prompt: str, listening: bool) -> None:
        sid = sec["id"]
        reading_group = sid.startswith("R7") or sid == "R8"
        group_unit = []
        dialog_units = {}
        image = ""
        if sec.get("images"):
            image = self.img(sec["images"][0])
        elif sec.get("chart"):
            image = self.chart_image(sec)
        first_q_of = {}
        for it in sec["items"]:
            q = it["q"]
            opts_text = it.get("options", [])
            if sid == "L5":
                options = [{"text": "O"}, {"text": "X"}]
                ans = 0 if it["answer"].strip().upper() == "O" else 1
            elif it.get("images") and len(it["images"]) == len(opts_text):
                options = [{"image": self.img(n), "text": strip_note(t)} for n, t in zip(it["images"], opts_text)]
                ans = letter_index(it["answer"], len(options))
            else:
                options = [{"text": t} for t in opts_text]
                ans = letter_index(it["answer"], len(options))
            entry = {"id": f"{sid}-{q}", "type": "choice", "prompt": prompt, "options": options, "answer": ans}
            if it.get("stem"):
                entry["stem"] = it["stem"]
            if sid == "L5" and it.get("images"):
                entry["image"] = self.img(it["images"][0])
            elif image:
                entry["image"] = image
            if sec.get("passage"):
                entry["passage"] = sec["passage"]
                if sec.get("notes_en"):
                    entry["notes"] = sec["notes_en"]
            script = it.get("script")
            if listening:
                dia = it.get("dialogue", "")
                if dia and dia not in first_q_of:
                    first_q_of[dia] = q
                    dialog_units[dia] = []
                entry["audio"] = self.aud(sid, q, f"{sid}-{first_q_of[dia]}" if dia else "")
            ans_text = options[ans].get("text", "")
            wrong = next(i for i in range(len(options)) if i != ans)
            wrong_txt = (f'"{options[wrong]["text"]}"' if "image" not in options[wrong]
                         else f"picture {wrong + 1}")
            entry["hint1En"] = "Listen again carefully." if listening else "Read it again carefully."
            entry["hint2En"] = f"It is not {wrong_txt}."
            if listening and script and len(script) <= 2 and not it.get("dialogue"):
                entry["correctEn"] = f"Answer: {ans_text}\n" + "  ".join(dict.fromkeys(script))
            else:
                entry["correctEn"] = f"Answer: {ans_text}"
            stem = it.get("stem", "")
            entry["teacherText"] = f"{'聽力' if listening else '閱讀'}：{stem + ' → ' if stem else ''}{ans_text}" + (
                f"（{' / '.join(dict.fromkeys(script))}）" if listening and script and len(script) <= 2 else "")
            if script:
                entry["transcript"] = " ".join(script)
            dia = it.get("dialogue", "")
            if reading_group:
                self.add(entry, group_unit)
            elif dia:
                self.add(entry, dialog_units[dia])
            else:
                u = []
                self.add(entry, u)
                self.units.append({"ids": u, "reading": False})
        for dia, u in dialog_units.items():
            if u:
                self.units.append({"ids": u, "reading": False})
        if group_unit:
            self.units.append({"ids": group_unit, "reading": True})

    def spell(self, sid: str, it: dict, prompt: str) -> None:
        word = it["answer"]
        unit = []
        mod = REORDER.get(self.code, {}).get(word)
        if mod:
            assert "".join(mod) == word, (mod, word)
            self.add({
                "id": f"{sid}-{it['q']}", "type": "order", "prompt": REORDER_PROMPT,
                "image": self.img(it["images"][0]), "chunks": scramble(mod, self.code + word), "answer": mod,
                "hint1En": f'It starts with "{mod[0]}".', "hint2En": f'It starts with "{mod[0]}{mod[1]}".',
                "correctEn": word, "teacherText": f"字母排序：{word}",
            }, unit)
        else:
            letters = [c.strip() for c in it["letters"].split(",")]
            assert sorted(letters) == sorted(word.replace(" ", "")), (letters, word)
            self.add({
                "id": f"{sid}-{it['q']}", "type": "spell", "prompt": prompt, "image": self.img(it["images"][0]),
                "spell": {"answer": word, "distractorLetters": "", "groups": [len(w) for w in word.split()],
                          "caseSensitive": True},
                "hint1En": f'It starts with "{word[0]}".',
                "hint2En": f'It starts with "{word[:2]}" and has {len(word.replace(" ", ""))} letters.',
                "correctEn": word, "teacherText": f"拼字：{word}",
            }, unit)
        self.units.append({"ids": unit, "reading": False})

    def label(self, sec: dict, prompt: str) -> None:
        pn = sec["panel_numbers"]
        labels = [{"text": it["sentence"], "panel": int(pn[it["q"]])} for it in sec["items"]]
        labels.sort(key=lambda l: l["panel"])
        assert sorted(l["panel"] for l in labels) == [1, 2, 3, 4], labels
        unit = []
        self.add({
            "id": "R4", "type": "label", "prompt": prompt, "image": self.img(sec["images"][0]), "labels": labels,
            "hint1En": f'Picture {labels[0]["panel"]}: "{labels[0]["text"]}"',
            "hint2En": f'Picture {labels[0]["panel"]}: "{labels[0]["text"]}"  Picture {labels[1]["panel"]}: "{labels[1]["text"]}"',
            "correctEn": "\n".join(f'{l["panel"]}. {l["text"]}' for l in labels),
            "teacherText": "標籤題：" + "　".join(f'{l["panel"]}. {l["text"]}' for l in labels),
        }, unit)
        self.units.append({"ids": unit, "reading": False})

    def drag(self, sec: dict, prompt: str) -> None:
        import re
        lines, n = [], 0
        for raw in sec["text"].split("\n"):
            sp, _, txt = raw.partition(":")
            txt = re.sub(r"__\((\d)\)__", lambda m: "{%s}" % m.group(1), txt.strip())
            lines.append({"speaker": sp.strip(), "text": txt})
        answers = sec["answers"]
        rest = list(sec["word_bank"])
        for a in answers:
            rest.remove(a)
        filled = []
        for l in lines:
            filled.append(f'{l["speaker"]}: ' + re.sub(r"\{(\d)\}", lambda m: answers[int(m.group(1)) - 1], l["text"]))
        unit = []
        self.add({
            "id": "R5", "type": "drag", "prompt": prompt, "image": self.img(sec["images"][0]), "lines": lines,
            "blanks": [{"id": i + 1, "answer": a} for i, a in enumerate(answers)], "distractors": rest,
            "hint1En": f'Blank 1 is "{answers[0]}".', "hint2En": f'Blank 1 is "{answers[0]}", blank 2 is "{answers[1]}".',
            "correctEn": "\n".join(filled), "teacherText": "拖放：" + "　".join(filled),
        }, unit)
        self.units.append({"ids": unit, "reading": False})

    def plan(self) -> dict:
        """13 個地點：閱讀題組放魔王關（park、lawn）；其他題目照順序平均分到其餘地點，同一段對話不拆開"""
        reading = [u for u in self.units if u["reading"]]
        normal = [u for u in self.units if not u["reading"]]
        loc = {}
        if len(reading) == 1:
            loc["lawn"] = reading[0]["ids"]
        elif len(reading) == 2:
            loc["park"], loc["lawn"] = reading[0]["ids"], reading[1]["ids"]
        elif len(reading) >= 3:
            loc["park"] = [i for u in reading[:-1] for i in u["ids"]]
            loc["lawn"] = reading[-1]["ids"]
        targets = NORMAL + [b for b in ("park", "lawn") if b not in loc]
        sizes = [len(u["ids"]) for u in normal]
        parts = partition(sizes, len(targets))
        k = 0
        for name, cnt in zip(targets, parts):
            loc[name] = [i for u in normal[k:k + cnt] for i in u["ids"]]
            k += cnt
        return {"locations": {l: loc[l] for l in LOCS}}


def partition(sizes: list, k: int) -> list:
    """把依序排列的單位切成 k 段（每段至少一個），讓最大的一段題數最少；回傳每段的單位數"""
    n = len(sizes)
    assert n >= k, (n, k)
    pre = [0]
    for s in sizes:
        pre.append(pre[-1] + s)
    INF = 10 ** 9
    best = [[INF] * (n + 1) for _ in range(k + 1)]
    cut = [[0] * (n + 1) for _ in range(k + 1)]
    best[0][0] = 0
    for j in range(1, k + 1):
        for i in range(j, n + 1):
            for m in range(j - 1, i):
                v = max(best[j - 1][m], pre[i] - pre[m])
                if v < best[j][i]:
                    best[j][i], cut[j][i] = v, m
    out, i = [], n
    for j in range(k, 0, -1):
        m = cut[j][i]
        out.append(i - m)
        i = m
    return out[::-1]


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    site = None
    if "--site" in sys.argv:
        site = sys.argv[sys.argv.index("--site") + 1]
        args = [a for a in args if a != site]
    for code, folder, unit, title, short in SETS:
        if args and code not in args:
            continue
        b = Builder(code, folder)
        b.build()
        n = len(b.items)
        if n != EXPECT[code]:
            sys.exit(f"{code}: 題數 {n} 和 Wayground {EXPECT[code]} 不一致")
        out = OUT_ROOT / code
        out.mkdir(parents=True, exist_ok=True)
        (out / "questions.json").write_text(json.dumps({"items": b.items}, ensure_ascii=False, indent=1), encoding="utf-8")
        plan = b.plan()
        (out / "quiz_plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
        counts = {}
        for it in b.items:
            counts[it["type"]] = counts.get(it["type"], 0) + 1
        print(f"== {code}: {n} 題 {counts}")
        print("   " + "  ".join(f"{l}:{len(v)}" for l, v in plan["locations"].items()))
        cmd = [sys.executable, "-I", "-X", "utf8", str(HERE / "tools" / "build_mission.py"),
               "--mission", f"ershui-3d-quest-{code}", "--unit", unit, "--title", title,
               "--questions", str(out / "questions.json"), "--plan", str(out / "quiz_plan.json"), "--short", short, "--no-page"]
        if site:
            cmd += ["--site", site]
        subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()
