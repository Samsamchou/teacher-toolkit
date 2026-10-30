"""把 HWG5 U01+U02 闖關題庫轉成 RPG 用的題庫（2026-10-30 老師要求：保留原本的拼字與拖放題，不用選擇題）。

輸出：
  content/hwg5-u01-u02/bank.json   遊戲讀的題庫
  content/hwg5-u01-u02/review.md   給老師核對的轉換表
題目圖片沿用闖關任務的 questions/Qxx.webp。
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "escape room HWG5-U01-U02"
SRC_BANK = SRC / "content" / "question-bank.v0.1.json"
SRC_IMG = SRC / "site" / "public" / "hwg5-u01-u02" / "assets" / "images" / "questions"
OUT = ROOT / "content" / "hwg5-u01-u02"

# 兩格拖放題：三個錯誤組合（只改一格，逼學生看圖或看文法）
WRONG_PAIRS = {
    "Q01": [("day", "9:50"), ("time", "9:15"), ("time", "5:50")],
    "Q02": [("do", "Monday"), ("are", "Monday"), ("is", "Sunday")],
    "Q03": [("Sunday", "is"), ("Monday", "isn't"), ("Monday", "does")],
    "Q04": [("PE", "do"), ("art", "does"), ("art", "don't")],
    "Q06": [("is", "Tuesday"), ("doesn't", "Tuesday"), ("isn't", "Sunday")],
    "Q08": [("art", "do"), ("music", "does"), ("music", "is")],
    "Q10": [("time", "Wednesday"), ("day", "Monday"), ("day", "Tuesday")],
    "Q12": [("Do", "math"), ("Is", "math"), ("Does", "music")],
    "Q14": [("time", "Thursday"), ("today", "Tuesday"), ("today", "Wednesday")],
    "Q16": [("Does", "Chinese"), ("Is", "Chinese"), ("Are", "Chinese")],
    "Q18": [("Chinese", "does"), ("English", "do"), ("English", "is")],
    "Q20": [("Do", "science"), ("Is", "science"), ("Does", "English")],
    "Q22": [("art", "doesn't"), ("PE", "don't"), ("PE", "isn't")],
    "Q24": [("science", "don't"), ("social studies", "doesn't"), ("social studies", "aren't")],
    "Q25": [("Do", "isn't"), ("Does", "isn't"), ("Is", "don't")],
}

# 拼字題：三個常見錯誤拼法
MISSPELL = {
    "Tuesday": ["Tuseday", "Teusday", "Tusday"],
    "music": ["musik", "muisc", "misic"],
    "Wednesday": ["Wensday", "Wednsday", "Wendesday"],
    "math": ["meth", "mash", "maht"],
    "Thursday": ["Thurday", "Tursday", "Thrusday"],
    "Chinese": ["Chinses", "Chainese", "Chinees"],
    "English": ["Englsh", "Inglish", "Englihs"],
    "science": ["sience", "scince", "sciense"],
    "Friday": ["Firday", "Fryday", "Friady"],
    "social studies": ["socail studies", "social studys", "soshal studies"],
    "Saturday": ["Saterday", "Satuday", "Saturdy"],
}

ZH_WORD = {
    "Tuesday": "星期二", "music": "音樂", "Wednesday": "星期三", "math": "數學",
    "Thursday": "星期四", "Chinese": "國語", "English": "英語", "science": "自然",
    "Friday": "星期五", "social studies": "社會", "Saturday": "星期六",
}

EXPLAIN = {
    "Q01": "問時間用 What time is it?。短針靠近 10、長針指著 10，所以是 9:50。",
    "Q02": "問星期幾用 What day is it?，it 後面配 is。圖上亮的是 Monday（星期一）。",
    "Q03": "問「今天是星期一嗎？」用 Is it Monday today?，肯定回答是 Yes, it is.",
    "Q04": "圖中在畫畫，是 art（美術）課。用 Do you…? 問，就用 Yes, I do. 回答。",
    "Q05": "Tuesday（星期二）拼成 T-u-e-s-d-a-y，u 和 e 不要寫反。",
    "Q06": "今天不是星期一，要說 No, it isn't.，再補一句 It's Tuesday.",
    "Q07": "music（音樂）拼成 m-u-s-i-c，結尾是 c，不是 k。",
    "Q08": "吹直笛是 music（音樂）課。用 Do you…? 問，就回答 Yes, I do.",
    "Q09": "Wednesday（星期三）拼成 W-e-d-n-e-s-d-a-y，中間的 d 不發音，但要寫出來。",
    "Q10": "問「今天星期幾？」用 What day is today?，回答 It's Wednesday.",
    "Q11": "math（數學）拼成 m-a-t-h，結尾是 th。",
    "Q12": "主詞 Jack 是他（第三人稱單數），問句開頭用 Does。算盤代表 math（數學）。",
    "Q13": "Thursday（星期四）拼成 T-h-u-r-s-d-a-y，開頭是 Th。",
    "Q14": "問「今天星期幾？」用 What day is today?，圖上亮的是 Thursday（星期四）。",
    "Q15": "Chinese（國語）拼成 C-h-i-n-e-s-e，開頭 C 要大寫。",
    "Q16": "主詞是 you，問句開頭用 Do，不用 Does 或 Is。",
    "Q17": "English（英語）拼成 E-n-g-l-i-s-h，開頭 E 要大寫。",
    "Q18": "戴耳機看英文書是 English（英語）課。Does he…? 就用 Yes, he does. 回答。",
    "Q19": "science（自然）拼成 s-c-i-e-n-c-e，開頭是 sc。",
    "Q20": "Jenny 是她（第三人稱單數），問句開頭用 Does。顯微鏡代表 science（自然）。",
    "Q21": "Friday（星期五）拼成 F-r-i-d-a-y。",
    "Q22": "體育館代表 PE（體育）。Does she…? 的否定回答是 No, she doesn't.",
    "Q23": "social studies（社會）是兩個字：social＋studies。",
    "Q24": "地球儀和地圖代表 social studies（社會）。Do we…? 的否定回答是 No, we don't.",
    "Q25": "問「今天是…嗎？」用 Is it…?，否定回答是 No, it isn't.",
    "Q26": "Saturday（星期六）拼成 S-a-t-u-r-d-a-y。",
    "Q27": "Is it…? 的肯定回答是 Yes, it is.",
    "Q28": "今天不是星期一，是星期二，所以說 No, it isn't. It's Tuesday.",
    "Q29": "Do you…? 的肯定回答是 Yes, I do.",
    "Q30": "Do you…? 的否定回答是 No, I don't.",
    "Q31": "Tom 是男生，所以用 he：Yes, he does.",
    "Q32": "Jenny 是女生，所以用 she：No, she doesn't.",
}


def draw_clock(path, c):
    """原闖關遊戲用 SVG 疊時鐘指針；這裡直接畫進圖片（座標系 1536×1024）。"""
    import math
    from PIL import Image, ImageDraw
    im = Image.open(path).convert("RGB")
    k = im.size[0] / 1536
    h, m = map(int, c["time"].split(":"))
    cx, cy, r = c["cx"] * k, c["cy"] * k, c["r"] * k
    d = ImageDraw.Draw(im)
    def tip(deg, ln):
        rad = math.radians(deg - 90)
        return cx + math.cos(rad) * ln, cy + math.sin(rad) * ln
    d.line([(cx, cy), tip(m * 6, r * 0.84)], fill="#2f6fd6", width=max(3, round(9 * k)))
    d.line([(cx, cy), tip(((h % 12) + m / 60) * 30, r * 0.46)], fill="#1f2440", width=round(24 * k))
    rr = 13 * k
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill="#c0392b")
    im.save(path, "WEBP", quality=88)


def fill(lines, values):
    """把 {1}{2} 換成答案，產生完整句（讀題與解析用）。"""
    out = []
    for ln in lines:
        t = ln["text"]
        for i, v in enumerate(values, 1):
            t = t.replace("{%d}" % i, v)
        out.append(f'{ln["speaker"]}: {t}')
    return out


def blankify(lines):
    out = []
    for ln in lines:
        t = ln["text"]
        for i in (1, 2):
            t = t.replace("{%d}" % i, "____")
        out.append({"speaker": ln["speaker"], "text": t})
    return out


def main():
    src = json.loads(SRC_BANK.read_text(encoding="utf-8"))
    (OUT / "images").mkdir(parents=True, exist_ok=True)
    items, rows = [], []
    for q in src["items"]:
        qid = q["id"]
        img = Path(q["image"]).stem + ".webp"
        shutil.copy2(SRC_IMG / img, OUT / "images" / img)
        if q.get("clock"):
            draw_clock(OUT / "images" / img, q["clock"])
        common = {
            "id": qid,
            "type": q["type"],
            "image": f"images/{img}",
            "context": q["contextEn"],
            "explanation": EXPLAIN[qid],
            "correctEn": q.get("correctEn", ""),
            "audio": f"audio/{qid}.mp3",
            "weekStrip": q.get("weekStrip"),
            "mirror": bool(q.get("mirrorFrame")),
        }
        if q["type"] == "spell":
            sp = q["spell"]
            answer = sp["answer"]
            items.append({**common, "prompt": "Spell the word.",
                          "spell": {"answer": answer, "distractorLetters": sp["distractorLetters"], "groups": sp["groups"]},
                          "answerText": answer, "readText": f"{q['contextEn']} Spell the word."})
            extra = "、".join(sp["distractorLetters"])
            rows.append(f"| {qid} | 拼字 | {q['contextEn']}（{ZH_WORD.get(answer, '')}） | **{answer}** | 多給的字母：{extra} | {EXPLAIN[qid]} |")
        else:
            answers = [b["answer"] for b in q["blanks"]]
            items.append({**common, "prompt": "Drag the cards into the blanks.",
                          "lines": q["lines"], "blanks": answers, "distractors": q["distractors"],
                          "answerText": " / ".join(answers),
                          "readText": " ".join(ln["text"] for ln in q["lines"]).replace("{1}", "blank").replace("{2}", "blank")})
            dialog = "<br>".join(f"{l['speaker']}: {l['text']}" for l in blankify(q["lines"]))
            rows.append(f"| {qid} | 拖放 | {dialog} | **{' / '.join(answers)}** | 多給的字卡：{'、'.join(q['distractors'])} | {EXPLAIN[qid]} |")

    bank = {
        "id": "hwg5-u01-u02",
        "title": "HWG5 U01–U02 時鐘塔大冒險",
        "subtitle": "What day is it? / Do you have … class?",
        "grade": 5,
        "fullScore": 100,
        "weekOrder": src["weekStripOrder"],
        "weekLabels": src["weekStripLabels"],
        "items": items,
    }
    (OUT / "bank.json").write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")
    md = [
        "# HWG5 U01–U02 RPG 題庫（沿用原本的拼字＋拖放題）",
        "",
        f"共 {len(items)} 題，每題 {100/len(items):.3f} 分，總分 100（四捨五入到整數）。題目圖片沿用闖關任務。",
        "拼字題：字母方塊（含多給的干擾字母）拼出單字；拖放題：把字卡拖進空格（含干擾字卡）。第一次送出就全對才算分。",
        "",
        "| 題 | 題型 | 題目（____ 是空格） | 正解 | 干擾 | 答錯時的解題秘笈 |",
        "|---|---|---|---|---|---|",
        *rows,
    ]
    (OUT / "review.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print("items", len(items), "->", OUT)


if __name__ == "__main__":
    sys.exit(main())
