"""從 HWG5 U01+U02 站台資料產生 Godot 用的題庫與題目配置。

用法：python -I tools/build_quiz_data.py
- 讀 escape room HWG5-U01-U02/site/public/hwg5-u01-u02/data.js（建置後的題庫）
- 複製題目圖片（webp）與回饋語音（mp3）到 assets/
- 產生 data/questions.json（題目）與 data/quiz_plan.json（每個地點出哪幾題）

題目配置（目前 32 題；之後加入 16 題聽力時，每個一般地點 +1、水公園 +3、草原 +2，
合計變成一般 3 題×11、水公園 7、草原 8，共 48 題）：
- 11 個一般地點：各 1 題拼字 + 1 題拖放
- 二八水水公園（魔王）：4 題兩格拖放
- 水心之初大草原（魔王）：6 題完整句子拖放
"""
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SRC = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public\hwg5-u01-u02")

NORMAL_ORDER = ["station", "inn", "seven", "school", "teatop", "market", "post", "pxmart", "bookstore", "library", "farm"]
PARK = ["Q12", "Q16", "Q20", "Q22"]
LAWN = ["Q27", "Q28", "Q29", "Q30", "Q31", "Q32"]


# ---- HWG5 R1 聽力 19 題（來源：2026 3D games/HWG 5 R1 Listening/聽力題目 19.docx）----
# 第 1–6、18、19 題的干擾選項由 Claude 依相近發音自訂；第 7–12 題選項是 ChatGPT API 插圖；
# 第 11–17 題音檔由 tools/generate_listening_tts.mjs 產生，其餘用教師提供的 MP3。
IMG = "res://assets/listening/{}.png"
LISTEN = [
    ("L01", ["fly", "fry", "flag"], None, "fly"),
    ("L02", ["tie", "toe", "pie"], None, "tie"),
    ("L03", ["May", "my", "day"], None, "May"),
    ("L04", ["read", "red", "road"], None, "read"),
    ("L05", ["nail", "mail", "nine"], None, "nail"),
    ("L06", ["leaf", "loaf", "life"], None, "leaf"),
    ("L07", [IMG.format("cal-wed"), IMG.format("cal-fri"), IMG.format("cal-mon")], None, "Wed. (Wednesday)"),
    ("L08", [IMG.format("cal-mon"), IMG.format("cal-fri"), IMG.format("cal-sun")], None, "Mon. (Monday)"),
    ("L09", [IMG.format("mon-pe"), IMG.format("mon-art"), IMG.format("wed-pe")], None, "Mon. + PE class"),
    ("L10", [IMG.format("tue-english"), IMG.format("tue-science"), IMG.format("mon-english")], None, "Tue. + English class"),
    ("L11", [IMG.format("money-90"), IMG.format("money-100"), IMG.format("money-80")], "I have ninety dollars.", "90"),
    ("L12", [IMG.format("money-100"), IMG.format("money-90"), IMG.format("money-80")], "I have one hundred dollars.", "100"),
    ("L13", ["No, he doesn't.", "No, I don't.", "No, he isn't."], "Does he have math class on Friday?", "No, he doesn't."),
    ("L14", ["Yes, she does.", "Yes, I do.", "Yes, she is."], "Does she have Chinese class on Friday?", "Yes, she does."),
    ("L15", ["No, it isn't. It's Saturday.", "Yes, it is. It's Saturday.", "No, I'm not."], "Is it Sunday today?", "No, it isn't. It's Saturday."),
    ("L16", ["Yes, it is.", "Yes, I do.", "Yes, it is. It's Sunday."], "Is it Saturday today?", "Yes, it is."),
    ("L17", ["It's Monday.", "Yes, it is.", "No, it isn't."], "What day is today?", "It's Monday."),
    ("L18", ["cake", "lake", "cook"], None, "cake"),
    ("L19", ["these", "this", "those"], None, "these"),
]
# 一般地點各 1 題（L01–L11），火車站、驛站、便利商店再各多 1 題（L12、L18、L19）；
# 回答句型的 L13–L17 放魔王區：水公園 3 題、草原 2 題。
LISTEN_PLAN = {
    "station": ["L01", "L12"], "inn": ["L02", "L18"], "seven": ["L03", "L19"],
    "school": ["L04"], "teatop": ["L05"], "market": ["L06"], "post": ["L07"], "pxmart": ["L08"],
    "bookstore": ["L09"], "library": ["L10"], "farm": ["L11"],
    "park": ["L13", "L14", "L15"], "lawn": ["L16", "L17"],
}


def listen_items() -> list:
    import random
    out = []
    for qid, opts, transcript, correct_label in LISTEN:
        order = list(range(3))
        random.Random(qid).shuffle(order)
        options = []
        for k in order:
            o = opts[k]
            options.append({"image": o} if o.startswith("res://") else {"text": o})
        answer = order.index(0)
        is_word = transcript is None and not opts[0].startswith("res://")
        correct_en = f"{correct_label}" if transcript is None else f"{transcript}  →  {correct_label}"
        out.append({
            "id": qid, "seq": 100 + int(qid[1:]), "type": "listen",
            "audio": f"res://assets/audio/listening/{qid}.mp3",
            "options": options, "answer": answer,
            "transcript": transcript,
            "hint1En": "Tap ▶ Listen and listen again.  再聽一次。",
            "hint2En": (f"Listen to the first sound: “{correct_label[0]}”." if is_word else "Listen to the key words carefully.  注意聽關鍵字。"),
            "correctEn": correct_en,
            "weekStrip": None, "clock": None, "mirrorFrame": False, "lines": [],
        })
    return out


def main() -> None:
    text = (SRC / "data.js").read_text(encoding="utf-8")
    bank = json.loads(text[text.index("{"): text.rindex("}") + 1])
    (HERE / "assets" / "questions").mkdir(parents=True, exist_ok=True)
    (HERE / "assets" / "audio" / "feedback").mkdir(parents=True, exist_ok=True)
    (HERE / "data").mkdir(exist_ok=True)

    out_items = []
    for it in bank["items"]:
        img_src = SRC / it["image"]
        img_name = img_src.name
        shutil.copyfile(img_src, HERE / "assets" / "questions" / img_name)
        mp3_src = SRC / it["feedbackTts"]["path"]
        shutil.copyfile(mp3_src, HERE / "assets" / "audio" / "feedback" / mp3_src.name)
        item = {
            "id": it["id"],
            "seq": it["seq"],
            "type": it["type"],
            "image": f"res://assets/questions/{img_name}",
            "audio": f"res://assets/audio/feedback/{mp3_src.name}",
            "lines": it["lines"],
            "hint1En": it["hint1En"],
            "hint2En": it["hint2En"],
            "correctEn": it["correctEn"],
            "weekStrip": it.get("weekStrip"),
            "clock": it.get("clock"),
            "mirrorFrame": bool(it.get("mirrorFrame")),
        }
        if it["type"] == "spell":
            item["spell"] = it["spell"]
        else:
            item["blanks"] = it["blanks"]
            item["distractors"] = it["distractors"]
        out_items.append(item)

    out_items += listen_items()
    questions = {
        "source": "HWG5 U01+U02 (escape room HWG5-U01-U02, sourceBankSha256 " + bank["sourceBankSha256"][:12] + ")",
        "weekStripOrder": bank["weekStripOrder"],
        "weekStripLabels": bank["weekStripLabels"],
        "items": out_items,
    }
    (HERE / "data" / "questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=1), encoding="utf-8")

    spell = [i["id"] for i in out_items if i["type"] == "spell"]
    drag = [i["id"] for i in out_items if i["type"] == "drag"]
    used_special = set(PARK) | set(LAWN)
    drag_normal = [d for d in drag if d not in used_special]
    assert len(spell) == 11 and len(drag_normal) == 11, (len(spell), len(drag_normal))
    plan = {}
    for i, loc in enumerate(NORMAL_ORDER):
        ids = [spell[i], drag_normal[i]]
        ids.sort(key=lambda q: int(q[1:]))
        plan[loc] = ids
    plan["park"] = PARK
    plan["lawn"] = LAWN
    for loc, ids in LISTEN_PLAN.items():
        plan[loc] = plan[loc] + ids
    allocated = [q for v in plan.values() for q in v]
    assert sorted(allocated) == sorted(i["id"] for i in out_items), "題目沒有剛好分完"
    (HERE / "data" / "quiz_plan.json").write_text(json.dumps({"locations": plan}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("items", len(out_items), "plan", {k: len(v) for k, v in plan.items()})


if __name__ == "__main__":
    sys.exit(main())
