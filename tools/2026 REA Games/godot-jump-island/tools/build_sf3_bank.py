"""把 SF3 四年級期中範圍讀寫小考（Wayground 版，17 題、100 分）轉成 Jump Island 的任務題庫。

用法：python -I -X utf8 tools/build_sf3_bank.py [--site <資料夾>]
來源：English exam/.../output/SF3_小考_期中範圍讀寫_20261101/_紀錄/quiz_items.json 與 images/
輸出：data/sf3/questions.json、quiz_plan.json，再呼叫二水 3D 闖關的 build_mission.py 做成
      site/public/ershui-3d-quest-jump/（bank/、data.js；index.html 已存在就不覆蓋）。

題型、題數不變（教師 2026-11-09 RDQ）；同日追加第 1–10 關各 2 題聽力（SF3 Phonics 1＋2），共 37 題：
  一、看圖排字 10 題 → order（5 張拆字卡，順序用 Wayground 打亂後的 shown）
  二、Read and Match 2 題 → label（2×2 四格圖 (a)–(d)，4 句當標籤；文字用 Wayground v2 縮短版）
  三、對話填空 5 題 → drag（2 格＋2 張多餘字卡）
13 關配題：第 1–10 關各 1 題排字、第 11 關 1 題對話填空；第 12、13 魔王關各 1 題 Read and Match＋2 題對話填空。
"""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SRC = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\English exam\teachingmaterial-backup-20261017\output"
           r"\SF3_小考_期中範圍讀寫_20261101\_紀錄")
QUEST = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 3D games\godot-ershui-quest")
OUT = HERE / "data" / "sf3"

# Wayground v2 的標籤文字（上限 40 字元，二-2 兩句改短；見 Wayground_檢核報告_20261101.txt）
LABEL_TEXT = {
    "1": {"a": "Sorry, I'm late. / Come in, please.", "b": "Is he a nurse? Yes, he is.",
          "c": "He's a driver.", "d": "Who's she? She's my grandma."},
    "2": {"a": "Is she a farmer? Yes, she is.", "b": "My dad is a cook.",
          "c": "Have a seat, please. / Thank you.", "d": "Who's he? He's my brother."},
}
PANEL = {"a": 1, "b": 2, "c": 3, "d": 4}
PLAN = {
    "station": ["R1-1"], "inn": ["R1-2"], "seven": ["R1-3"], "school": ["R1-4"], "teatop": ["R1-5"],
    "market": ["R1-6"], "post": ["R1-7"], "bookstore": ["R1-8"], "pxmart": ["R1-9"], "library": ["R1-10"],
    "farm": ["R3-1"],
    "park": ["R2-1", "R3-2", "R3-3"],
    "lawn": ["R2-2", "R3-4", "R3-5"],
}


# ---- 聽力 20 題（教師 2026-11-09 追加：第 1–10 關各加 2 題，SF3 Phonics 1＋Phonics 2）----
# 題目字表來自 SF3 Phonics 1、2；音檔用小考做法（Gemini TTS 兒童聲 Leda、0.8 倍速、字＋1.5 秒＋字）重做，見 make_sf3_listen_audio.py。
# 課本原音的 den 被辨識成 "10"，所以不用 den 當題目。
# (關卡, 聽力 A：聽音選例字 [正解, 干擾, 干擾], 聽力 B：聽音選開頭字母 單字)
PHONICS = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\GPT Sites games\參考遊戲\SF3 PHONICS")
AUDIO = {
    "bat": "Phonics 1/02_bat字.mp3", "big": "Phonics 1/04_big字.mp3", "pat": "Phonics 1/06_pat字.mp3",
    "pig": "Phonics 1/08_pig字.mp3", "bus": "Phonics 1/10_bus字.mp3", "pin": "Phonics 1/12_pin字.mp3",
    "bed": "Phonics 1/14_bed字.mp3", "pot": "Phonics 1/16_pot字.mp3",
    "dip": "Phonics 2/03_dip圖.mp3", "ten": "Phonics 2/05_ten圖.mp3", "tip": "Phonics 2/07_tip圖.mp3",
    "dad": "Phonics 2/10_dad字.mp3", "top": "Phonics 2/12_top字.mp3", "duck": "Phonics 2/14_duck字.mp3",
    "tub": "Phonics 2/16_tub字.mp3",
}
LISTEN = [
    ("station", ["bed", "pet", "bad"], "top"),
    ("inn", ["pig", "big", "pin"], "bat"),
    ("seven", ["bat", "pat", "bet"], "dip"),
    ("school", ["pot", "dot", "pit"], "big"),
    ("teatop", ["bus", "bun", "bat"], "tub"),
    ("market", ["ten", "tin", "den"], "pin"),
    ("post", ["dip", "tip", "dig"], "duck"),
    ("bookstore", ["duck", "tuck", "dock"], "pat"),
    ("pxmart", ["tub", "tab", "tug"], "dad"),
    ("library", ["dad", "tad", "did"], "pot"),
]
LETTERS = {"b": ["b", "p", "d"], "p": ["p", "b", "t"], "d": ["d", "t", "b"], "t": ["t", "d", "p"]}
POS = [0, 2, 1, 1, 0, 2, 2, 1, 0, 1, 2, 0, 1, 0, 2, 0, 2, 1, 2, 1]   # 正解放第幾個（A／B／C 平均）


def listen_items(start_seq: int) -> tuple:
    items, plan_add, k = [], {}, 0
    for n, (loc, words, bword) in enumerate(LISTEN, 1):
        for kind in ("word", "letter"):
            if kind == "word":
                ans, others, audio_word = words[0], words[1:], words[0]
                prompt = "Listen and Choose 聽一聽，選出聽到的單字"
                hint2 = f'Listen to the first sound: "{ans[0]}".'
                correct_en = ans
            else:
                ans = bword[0]
                others = [x for x in LETTERS[ans] if x != ans]
                audio_word = bword
                prompt = "Listen and Choose 聽一聽，這個字的開頭是哪個字母？"
                hint2 = f'The word is "{bword}". What is the first letter?'
                correct_en = f"{bword} → {ans}"
            pos = POS[k]
            k += 1
            opts = list(others)
            opts.insert(pos, ans)
            qid = f"L{n}{'a' if kind == 'word' else 'b'}"
            # 音檔照小考做法重做（教師 2026-11-09）：tools/make_sf3_listen_audio.py → data/sf3/listen_audio/<題號>.mp3
            mp3 = HERE / "data" / "sf3" / "listen_audio" / f"{qid}.mp3"
            if not mp3.exists():
                sys.exit(f"找不到音檔：{mp3}（先跑 tools/make_sf3_listen_audio.py）")
            items.append({
                "id": qid, "seq": start_seq + len(items), "type": "listen", "prompt": prompt, "audio": str(mp3),
                "audioSlow": str(mp3.with_name(f"{qid}_slow.mp3")),
                "options": [{"text": o} for o in opts], "answer": pos, "transcript": None,
                "hint1En": "Tap ▶ Listen and listen again.  再聽一次。", "hint2En": hint2, "correctEn": correct_en,
                "teacherText": f"聽力（{'選例字' if kind == 'word' else '選開頭字母'}）：{audio_word}",
                "weekStrip": None, "clock": None, "mirrorFrame": False, "lines": [],
            })
            plan_add.setdefault(loc, []).append(qid)
    return items, plan_add


def image_for(desc: str) -> str:
    """'A3（重用…）'、'A12 女醫生…'、'B-c' → images/ 裡的檔案"""
    tok = desc.split()[0].split("（")[0]
    imgs = sorted((SRC / "images").glob("*.png"))
    m = re.match(r"A(\d+)$", tok)
    if m:
        pre = f"A{int(m.group(1)):02d}_"
        hit = [p for p in imgs if p.name.startswith(pre)]
    elif tok.startswith("B-") or tok.startswith("B_"):
        hit = [p for p in imgs if p.name.startswith("B_" + tok[2:] + "_")]
    else:
        hit = []
    if len(hit) != 1:
        sys.exit(f"找不到圖：{desc} → {hit}")
    return str(hit[0])


def main() -> None:
    site = sys.argv[sys.argv.index("--site") + 1] if "--site" in sys.argv else None
    q = json.loads((SRC / "quiz_items.json").read_text(encoding="utf-8"))
    secs = {s["id"]: s for s in q["sections"]}
    items = []
    for it in secs["R1"]["items"]:
        tiles, word = it["tiles"], it["word"]
        assert "".join(tiles) == word and sorted(it["shown"]) == sorted(tiles), it
        items.append({
            "id": f"R1-{it['q']}", "seq": len(items) + 1, "type": "order",
            "prompt": "Look and Order 看圖，把字卡排成正確的單字", "image": image_for(it["image"]),
            "chunks": it["shown"], "answer": tiles,
            "hint1En": f'It starts with "{tiles[0]}".', "hint2En": f'It starts with "{tiles[0]}{tiles[1]}".',
            "correctEn": word, "teacherText": f"看圖排字：{word}",
            "weekStrip": None, "clock": None, "mirrorFrame": False, "lines": [],
        })
    for it in secs["R2"]["items"]:
        txt = LABEL_TEXT[it["q"]]
        labels = [{"text": txt[k], "panel": PANEL[k]} for k in "abcd"]
        # 檢查：原題每句對應的代號，和縮短後的文字對得上
        for sent, ans in zip(it["sentences"], it["answer"]):
            first = sent.split("\n")[0].replace("A: ", "").strip()[:8]
            assert first in txt[ans], (first, txt[ans])
        img = SRC / "images" / ("B_match_q1.png" if it["q"] == "1" else "C_match_q2.png")
        items.append({
            "id": f"R2-{it['q']}", "seq": len(items) + 1, "type": "label",
            "prompt": "Read and Match 讀一讀，把句子拖到相符的圖片上", "image": str(img), "labels": labels,
            "hint1En": f'Picture (a): "{txt["a"]}"', "hint2En": f'Picture (a): "{txt["a"]}"  Picture (b): "{txt["b"]}"',
            "correctEn": "\n".join(f"({k}) {txt[k]}" for k in "abcd"),
            "teacherText": "Read and Match：" + "　".join(f"({k}) {txt[k]}" for k in "abcd"),
            "weekStrip": None, "clock": None, "mirrorFrame": False,
        })
    for it in secs["R3"]["items"]:
        lines, n = [], 0
        for raw in it["dialogue"].split("\n"):
            sp, _, t = raw.partition(":")

            def blank(_m):
                nonlocal n
                n += 1
                return "{%d}" % n
            lines.append({"speaker": sp.strip(), "text": re.sub(r"_{3,}", blank, t.strip())})
        answers = it["answer"]
        assert n == len(answers) == 2, it
        rest = [w for w in it["box"] if w not in answers]
        assert len(rest) == 2, it
        filled = []
        k = iter(answers)
        for l in lines:
            filled.append(f'{l["speaker"]}: ' + re.sub(r"\{\d\}", lambda _m: next(k), l["text"]))
        items.append({
            "id": f"R3-{it['q']}", "seq": len(items) + 1, "type": "drag",
            "prompt": "Read and Write 讀一讀，把字卡拖進對話的空格", "image": image_for(it["image"]),
            "lines": lines, "blanks": [{"id": i + 1, "answer": a} for i, a in enumerate(answers)], "distractors": rest,
            "hint1En": f'Blank 1 is "{answers[0]}".', "hint2En": f'Blank 1 is "{answers[0]}", blank 2 is "{answers[1]}".',
            "correctEn": "\n".join(filled), "teacherText": "對話填空：" + "　".join(filled),
            "weekStrip": None, "clock": None, "mirrorFrame": False,
        })
    assert len(items) == 17, len(items)
    extra, plan_add = listen_items(len(items) + 1)
    items += extra
    for loc, ids in plan_add.items():
        PLAN[loc] = PLAN[loc] + ids
    assert len(items) == 37, len(items)
    used = sorted(i for v in PLAN.values() for i in v)
    assert used == sorted(i["id"] for i in items), "配題和題目對不上"
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "questions.json").write_text(json.dumps({"source": "SF3 四年級期中範圍讀寫小考 v2（Wayground 2026-11-01）",
                                                    "items": items}, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "quiz_plan.json").write_text(json.dumps({"locations": PLAN}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(items)} items -> {OUT}")
    cmd = [sys.executable, "-I", "-X", "utf8", str(QUEST / "tools" / "build_mission.py"),
           "--mission", "ershui-3d-quest-jump", "--unit", "Ken's Jump Island SF3 R1", "--title", "Ken's Jump Island · SF3 R1",
           "--questions", str(OUT / "questions.json"), "--plan", str(OUT / "quiz_plan.json")]
    if site:
        cmd += ["--site", site]
    subprocess.run(cmd, check=True, cwd=QUEST)


if __name__ == "__main__":
    main()
