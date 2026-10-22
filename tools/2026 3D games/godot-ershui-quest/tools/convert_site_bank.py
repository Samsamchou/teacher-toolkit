"""把情境任務網站的題庫（site/public/<任務>/data.js）轉成 3D 闖關用的 questions.json＋quiz_plan.json。

用法（HWG7 U01+U02，六年級）：
  python -I -X utf8 tools/convert_site_bank.py --src hwg7-u01-u02 --out data/hwg7 --plan hwg7

產出 <out>/questions.json、<out>/quiz_plan.json，再交給 build_mission.py：
  python -I -X utf8 tools/build_mission.py --mission ershui-3d-quest-hwg7 --unit "二水 3D 英語闖關 HWG7 U01-U02" ^
      --title "Ershui 3D English Quest 6" --questions data/hwg7/questions.json --plan data/hwg7/quiz_plan.json

圖片與 Tick 語音直接用網站資料夾裡的檔案（絕對路徑），build_mission.py 會複製、壓縮並打包。
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SITE = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public")

# 13 個地點的配題（2026-10-22 教師確認）：一般地點各 1 拼字＋1 同主題拖放；兩個魔王關放較難的整句拖放。
PLANS = {
    "hwg7": {
        "station": ["Q01", "Q02"], "inn": ["Q03", "Q04"], "seven": ["Q05", "Q06"],
        "school": ["Q07", "Q08"], "teatop": ["Q09", "Q10"], "market": ["Q12", "Q13"],
        "post": ["Q14", "Q15"], "pxmart": ["Q16", "Q17"], "bookstore": ["Q18", "Q19"],
        "library": ["Q20", "Q21"], "farm": ["Q22", "Q23"],
        "park": ["Q11", "Q24", "Q25"], "lawn": ["Q26", "Q27", "Q28"],
    },
}


# 聽力題：從 English Lesson Hub 的發音題庫挑題（教師 2026-10-22 要求：5 題聽音選單字、5 題聽音選發音組合）。
# 10 題涵蓋 -er、-or、ir、ur、ar、or 六組，單字不重複；音檔已用 faster-whisper 確認唸的字正確。
PHONICS = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG\question-bank\hwg7-su-u02-phonics-20261015")
LISTEN = {
    "hwg7": {
        "bank": PHONICS,
        # (題號, 新題號, 放哪個地點)
        "pick": [(3, "L01", "station"), (6, "L02", "inn"), (9, "L03", "seven"), (11, "L04", "school"), (15, "L05", "teatop"),
                 (19, "L06", "market"), (23, "L07", "post"), (26, "L08", "pxmart"), (31, "L09", "bookstore"), (35, "L10", "library")],
    },
}


# HWG7 R1 聽力 14 題（來源：2026 3D games/HWG 7 R1 Listening/HWG 7 R1 聽力題目.docx，教師 2026-10-22 提供）。
# docx 第一欄是正解；遊戲不會打亂選項，所以這裡把正解放在不同位置（ANS_POS）。
# 第 13、14 題原本沒有 MP3，用 tools/generate_listening_tts.mjs hwg7 產生（generated-tts/H13、H14）。
# 第 4–8 題選項是插圖：ChatGPT API 生圖，數字（348 m、電話、房號）由 tools/make_hwg7_option_images.py 疊上去。
R1 = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 3D games\HWG 7 R1 Listening")
R1_IMG = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 3D games\generated-images\20261022\hwg7-listening\options")
R1_ITEMS = [
    # (題號, 音檔, [正解, 干擾 1, 干擾 2], 文字稿或 None, 地點)
    (1, "1. park pork burn.mp3", ["park pork burn", "pork park burn", "burn park pork"], None, "station"),
    (2, "2. peach parch porch.mp3", ["peach parch porch", "parch peach porch", "porch peach parch"], None, "inn"),
    (3, "3. skirt born barn.mp3", ["skirt born barn", "born skirt barn", "born barn skirt"], None, "seven"),
    (4, "4. Does he go to school by MRT No, he doesn’t. He goes to school by bus..mp3",
     ["img:boy-bus", "img:boy-mrt", "img:boy-train"], "Does he go to school by MRT? No, he doesn't. He goes to school by bus.", "school"),
    (5, "5. Kaohsiung 85 Sky Tower is 348 meters tall..mp3",
     ["img:tower-348", "img:tower-347", "img:tower-248"], "Kaohsiung 85 Sky Tower is 348 meters tall.", "teatop"),
    (6, "6. My phone number is 0919234557.mp3",
     ["img:card-0919234557", "img:card-0910234557", "img:card-0919234556"], "My phone number is 0919234557.", "market"),
    (7, "7. My room number is 472..mp3", ["img:door-472", "img:door-372", "img:door-473"], "My room number is 472.", "post"),
    (8, "8. She's my sister. She goes to the park by bike..mp3",
     ["img:girl-bike", "img:girl-car", "img:girl-walk"], "She's my sister. She goes to the park by bike.", "pxmart"),
    (9, "9. Are you from the UK.mp3", ["No, I'm not.", "No, I don't.", "Yes, I do."], "Are you from the UK?", "bookstore"),
    (10, "10. Does he go to school by taxi.mp3", ["No, he doesn't.", "No, he isn't.", "Yes, I do."],
     "Does he go to school by taxi?", "library"),
    (11, "11. How do you go to school.mp3", ["I go to school on foot.", "He goes to school on foot.", "I am going to school."],
     "How do you go to school?", "farm"),
    (12, "12. Is Andy from India.mp3", ["No, he isn't. He's from Korea.", "No, he isn't. He's from India.", "Yes, he does."],
     "Is Andy from India?", "farm"),
    (13, "generated-tts/H13.mp3", ["I'm from India.", "I'm going to Taiwan.", "Yes, I am."], "Where are you from?", "park"),
    (14, "generated-tts/H14.mp3", ["She goes to school by car.", "He goes to school by car.", "Yes, she does."],
     "How does she go to school?", "lawn"),
]
ANS_POS = [1, 2, 0, 2, 0, 1, 1, 0, 2, 0, 2, 1, 2, 0]   # 每題正解放第幾個（0=A），A/B/C 大致平均


def r1_items() -> tuple:
    items, plan_add = [], {}
    for k, (no, audio, opts, transcript, loc) in enumerate(R1_ITEMS):
        mp3 = R1 / audio
        if not mp3.exists():
            sys.exit(f"找不到音檔：{mp3}")
        correct, wrong = opts[0], opts[1:]
        pos = ANS_POS[k]
        ordered = wrong[:pos] + [correct] + wrong[pos:]
        options = []
        for o in ordered:
            if o.startswith("img:"):
                img = R1_IMG / f"{o[4:]}.png"
                if not img.exists():
                    sys.exit(f"找不到選項插圖：{img}")
                options.append({"image": str(img)})
            else:
                options.append({"text": o})
        new_id = f"H{no:02d}"
        label = correct[4:] if correct.startswith("img:") else correct
        items.append({
            "id": new_id, "seq": 200 + no, "type": "listen", "audio": str(mp3),
            "options": options, "answer": pos, "transcript": transcript,
            "hint1En": "Tap ▶ Listen and listen again.  再聽一次。",
            "hint2En": "Listen to every word, one by one." if transcript is None else "Listen for the key words.",
            # 答對後顯示：圖片題顯示聽到的句子；文字題顯示正解文字
            "correctEn": transcript if correct.startswith("img:") else correct,
            "weekStrip": None, "clock": None, "mirrorFrame": False, "lines": [],
            "source": f"HWG 7 R1 聽力題目.docx 第 {no} 題（{label}）",
        })
        plan_add.setdefault(loc, []).append(new_id)
    return items, plan_add


def listen_items(cfg: dict) -> tuple:
    bank = json.loads((cfg["bank"] / "bank.json").read_text(encoding="utf-8"))
    by_no = {q["number"]: q for q in bank["questions"]}
    items, plan_add = [], {}
    for no, new_id, loc in cfg["pick"]:
        q = by_no[no]
        mp3 = cfg["bank"] / "audio" / f"{q['audioKey']}.mp3"
        if not mp3.exists():
            sys.exit(f"找不到音檔：{mp3}")
        word, group = q["targetWord"], q["group"]
        if q["category"] == "word":
            hint2 = f"Listen for the sound “{group.lstrip('-')}”."
            correct = word
        else:
            hint2 = f"Which letters make the sound in “{word}”?"
            correct = f"{word} → {group}"
        items.append({
            "id": new_id, "seq": 100 + int(new_id[1:]), "type": "listen", "audio": str(mp3),
            "options": [{"text": o} for o in q["options"]], "answer": q["correctIndex"], "transcript": None,
            "hint1En": "Tap ▶ Listen and listen again.  再聽一次。", "hint2En": hint2, "correctEn": correct,
            "weekStrip": None, "clock": None, "mirrorFrame": False, "lines": [],
            "source": f"{bank['title']} #{no} ({q['category']}, {group}, {word})",
        })
        plan_add.setdefault(loc, []).append(new_id)
    return items, plan_add


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="網站任務資料夾名稱，例如 hwg7-u01-u02")
    ap.add_argument("--out", required=True, help="輸出資料夾（相對 godot 專案）")
    ap.add_argument("--plan", required=True, choices=sorted(PLANS))
    a = ap.parse_args()

    src = SITE / a.src
    text = (src / "data.js").read_text(encoding="utf-8")
    bank = json.loads(text[text.index("{"): text.rindex("}") + 1])
    items = []
    for it in bank["items"]:
        img = src / it["image"]
        mp3 = src / it["feedbackTts"]["path"]
        for p in (img, mp3):
            if not p.exists():
                sys.exit(f"找不到素材：{p}")
        item = {
            "id": it["id"], "seq": it["seq"], "type": it["type"],
            "image": str(img), "audio": str(mp3),
            "lines": it["lines"], "hint1En": it["hint1En"], "hint2En": it["hint2En"],
            "correctEn": it["correctEn"], "weekStrip": it.get("weekStrip"), "clock": it.get("clock"),
            "mirrorFrame": bool(it.get("mirrorFrame")),
        }
        if it["type"] == "spell":
            item["spell"] = it["spell"]
        else:
            item["blanks"] = it["blanks"]
            item["distractors"] = it["distractors"]
        items.append(item)

    plan = {k: list(v) for k, v in PLANS[a.plan].items()}
    if a.plan in LISTEN:
        extra, plan_add = listen_items(LISTEN[a.plan])
        items += extra
        for loc, ids in plan_add.items():
            plan[loc] += ids
    if a.plan == "hwg7":
        extra, plan_add = r1_items()
        items += extra
        for loc, ids in plan_add.items():
            plan[loc] += ids

    out = HERE / a.out
    out.mkdir(parents=True, exist_ok=True)
    questions = {
        "source": f"{bank.get('unit', a.src)} (site/public/{a.src}, sourceBankSha256 {bank.get('sourceBankSha256', '')[:12]})",
        "weekStripOrder": bank.get("weekStripOrder", ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]),
        "weekStripLabels": bank.get("weekStripLabels", {}),
        "items": items,
    }
    (out / "questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=1), encoding="utf-8")
    used = sorted(q for v in plan.values() for q in v)
    if used != sorted(i["id"] for i in items):
        sys.exit("配題和題目不一致（有題目沒分配，或分配了不存在的題目）")
    (out / "quiz_plan.json").write_text(json.dumps({"locations": plan}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(items)} items -> {out}")


if __name__ == "__main__":
    main()
