"""把一份題庫做成「任務資料夾」，給共用的 3D 遊戲讀取。

用法：
  python -I tools/build_mission.py --mission ershui-3d-quest --unit "二水 3D 英語闖關 HWG5 R1" ^
      --title "Ershui 3D English Quest" --questions data/questions.json --plan data/quiz_plan.json

輸出到 site/public/<mission>/：
  bank/bank.json                題目＋13 個地點的配題＋任務資訊（遊戲讀這份）
  bank/questions/*.webp         題目插圖
  bank/audio/feedback/*.mp3     答對後 Tick 的回饋語音
  bank/audio/listening/*.mp3    聽力題音檔
  bank/listening/*.webp         聽力選項插圖（PNG 會轉成 WebP 縮小）
  bank/fonts/cjk-*.ttf          這個任務用到的中文字（遊戲 UI 字＋題目字）的字型子集
  data.js                       網頁外框計分、教師後台用的題庫摘要

questions.json 裡的 image / audio / options[].image 路徑可以寫 res://assets/... 或任何本機路徑，
這支程式會複製檔案並改成 bank 內的相對路徑。格式說明見 tools/BANK-FORMAT.md。
"""
import argparse
import glob
import hashlib
import json
import os
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent.parent
SITE = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public")
NOTO = Path(r"C:\Users\User\Godot\dl\NotoSansTC.ttf")

# 13 個地點是遊戲本身固定的（二水街道），題庫只決定每個地點出哪些題目。
LOCS = [
    ("station", "二水火車站", "train station"), ("inn", "二八水驛站", "restaurant"),
    ("seven", "便利商店", "convenience store"), ("school", "二水國小", "school"),
    ("teatop", "飲料店", "tea shop"), ("market", "二水超市", "supermarket"),
    ("post", "二水郵局", "post office"), ("bookstore", "大盟書局", "bookstore"),
    ("pxmart", "超市", "supermarket"), ("library", "二水鄉立圖書館", "library"),
    ("farm", "八堡圳農情館", "coffee shop"), ("park", "二八水水公園", "park"),
    ("lawn", "水心之初大草原", "park"),
]
BOSS = {"park", "lawn"}
SUBDIR = {"image_q": "questions", "image_l": "listening", "audio_f": "audio/feedback", "audio_l": "audio/listening"}


INDEX_HTML = """<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#1f2a5a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>{UNIT}</title>
  <link rel="stylesheet" href="../shared/quest3d.css">
</head>
<body>
  <main id="app"><p class="loading">Loading…</p></main>
  <!-- 3D 任務：題庫在 ./bank/ 與 ./data.js；外框與遊戲是所有任務共用的 -->
  <script type="module">
    import { BANK } from "./data.js";
    import { start } from "../shared/quest3d-app.mjs";
    start(BANK);
  </script>
</body>
</html>
"""

CARD_HTML = """      <a class="mission open" href="{SLUG}/">
        <span class="pic" style="--pic:url('{SLUG}/cover.webp')"></span>
        <span class="body">
          <span class="unit">{UNIT}</span>
          <span class="name">{TITLE}</span>
          <span class="meta">{N} questions · 13 places</span>
          <span class="go">▶ Start</span>
        </span>
      </a>"""


def resolve(src: str) -> Path:
    if src.startswith("res://"):
        return HERE / src[len("res://"):]
    p = Path(src)
    return p if p.is_absolute() else HERE / p


def is_real_mp3(p: Path) -> bool:
    """檔頭是 ID3 標籤或 MPEG 音框同步碼才算真的 MP3。"""
    head = p.read_bytes()[:3]
    return head == b"ID3" or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)


def safe_name(stem: str) -> str:
    """教師檔名常有空白、引號、中文：轉成安全的 ASCII 檔名。"""
    s = re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-")
    return s[:60] or "audio"


def copy_asset(src: str, out_dir: Path, sub: str, to_webp: bool) -> str:
    sp = resolve(src)
    if not sp.exists():
        sys.exit(f"找不到素材：{src}")
    (out_dir / sub).mkdir(parents=True, exist_ok=True)
    if to_webp and sp.suffix.lower() in (".png", ".jpg", ".jpeg"):
        name = sp.stem + ".webp"
        im = Image.open(sp)
        im.thumbnail((768, 768))
        im.save(out_dir / sub / name, "WEBP", quality=82)
    elif sp.suffix.lower() == ".mp3" and not is_real_mp3(sp):
        # 副檔名是 .mp3 但內容其實是 WAV 等其他格式（教師錄音常見）：遊戲只認真正的 MP3，轉檔
        name = safe_name(sp.stem) + ".mp3"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(sp), "-ac", "1", "-ar", "44100", "-b:a", "96k",
                        str(out_dir / sub / name)], check=True)
        print(f"轉成 MP3：{sp.name}")
    else:
        name = sp.name
        shutil.copyfile(sp, out_dir / sub / name)
    return f"{sub}/{name}"


def build_fonts(out_dir: Path, texts: list) -> dict:
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    chars = set("".join(texts))
    for f in glob.glob(str(HERE / "scripts" / "*.gd")):
        chars |= set(open(f, encoding="utf-8").read())
    cjk = "".join(sorted(c for c in chars if ord(c) > 127))
    cjk += "".join(chr(i) for i in range(32, 127)) + "，。！？：；、「」（）…—♥♡★☆✓"
    (out_dir / "fonts").mkdir(parents=True, exist_ok=True)
    out = {}
    for name, w in [("regular", 400), ("bold", 700)]:
        font = instancer.instantiateVariableFont(TTFont(str(NOTO)), {"wght": w})
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        sub = subset.Subsetter(opts)
        sub.populate(text=cjk)
        sub.subset(font)
        rel = f"fonts/cjk-{name}.ttf"
        font.save(str(out_dir / rel))
        out[name] = rel
    lic = Path(str(NOTO)).with_name("NotoSansTC-OFL.txt")
    if lic.exists():
        shutil.copyfile(lic, out_dir / "fonts" / "NotoSansTC-OFL.txt")
    return out


def pack_assets(out_dir: Path) -> str:
    """把所有插圖、音檔、字型合成一個 bank.pak，iPad 只要下載一個檔（95 個小檔在 iPad 上又慢又容易漏）。

    格式：'QB01' + 索引長度（4 位元組，little-endian）+ 索引 JSON（UTF-8）+ 各檔內容依序相接。
    索引：{"files": [{"path": "questions/Q01.webp", "offset": 0, "size": 1234}, ...]}，offset 從內容區開頭算。
    打包後刪掉零散的素材檔，只留 bank.json、bank.pak 與字型授權。
    """
    files = sorted(p for p in out_dir.rglob("*")
                   if p.is_file() and p.name != "bank.json" and p.suffix.lower() not in (".txt", ".pak"))
    index, blobs, offset = [], [], 0
    for p in files:
        data = p.read_bytes()
        index.append({"path": p.relative_to(out_dir).as_posix(), "offset": offset, "size": len(data)})
        blobs.append(data)
        offset += len(data)
    head = json.dumps({"files": index}, ensure_ascii=False).encode("utf-8")
    payload = b"QB01" + struct.pack("<I", len(head)) + head + b"".join(blobs)
    # 檔名含內容雜湊：CDN 可以長期快取，題目一改檔名就變，不會讀到舊題
    name = f"bank-{hashlib.sha256(payload).hexdigest()[:12]}.pak"
    (out_dir / name).write_bytes(payload)
    for p in files:
        p.unlink()
    for d in sorted((d for d in out_dir.rglob("*") if d.is_dir()), key=lambda d: -len(d.parts)):
        if not any(d.iterdir()):
            d.rmdir()
    return name


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mission", required=True)
    ap.add_argument("--unit", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--questions", required=True)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--site", default=str(SITE), help="網站 public 資料夾（預設 hwg5-clock-tower 的 site/public）")
    a = ap.parse_args()

    q = json.loads(resolve(a.questions).read_text(encoding="utf-8"))
    plan = json.loads(resolve(a.plan).read_text(encoding="utf-8"))
    plan = plan.get("locations", plan)
    mission_dir = Path(a.site) / a.mission
    out_dir = mission_dir / "bank"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    # 檢查：每個地點都有題目、每題只出現一次
    ids = [i["id"] for i in q["items"]]
    for loc, _zh, _en in LOCS:
        if not plan.get(loc):
            sys.exit(f"地點 {loc} 沒有分配題目")
    used = [x for loc, _, _ in LOCS for x in plan[loc]]
    if sorted(used) != sorted(ids):
        sys.exit("quiz_plan 的題目和 questions 不一致（有題目沒分配，或分配了不存在的題目）")
    if len(ids) > 60:
        sys.exit("一個任務最多 60 題（教師後台規則上限）")

    items = []
    texts = [a.unit]
    for it in q["items"]:
        it = dict(it)
        listen = it["type"] == "listen"
        if it.get("image"):
            it["image"] = copy_asset(it["image"], out_dir, SUBDIR["image_q"], True)
        if it.get("audio"):
            it["audio"] = copy_asset(it["audio"], out_dir, SUBDIR["audio_l" if listen else "audio_f"], False)
        opts = []
        for o in it.get("options", []):
            o = dict(o)
            if o.get("image"):
                o["image"] = copy_asset(o["image"], out_dir, SUBDIR["image_l"], True)
            opts.append(o)
        if opts:
            it["options"] = opts
        texts.append(json.dumps(it, ensure_ascii=False))
        items.append(it)

    bank = {
        "mission": a.mission, "unit": a.unit, "title": a.title,
        "weekStripOrder": q.get("weekStripOrder", ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]),
        "weekStripLabels": q.get("weekStripLabels", {}),
        "items": items,
        "locations": {loc: plan[loc] for loc, _, _ in LOCS},
    }
    bank["fonts"] = build_fonts(out_dir, texts)
    bank["pak"] = pack_assets(out_dir)
    (out_dir / "bank.json").write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")

    # 網頁外框用的摘要（計分、教師後台題目文字）
    by_id = {i["id"]: i for i in items}
    rows = []
    for loc, _zh, _en in LOCS:
        for qid in plan[loc]:
            it = by_id[qid]
            row = {"seq": len(rows) + 1, "id": qid, "bankId": qid, "type": it["type"], "location": loc,
                   "answerText": it.get("correctEn", "")}
            if it["type"] == "spell":
                row["spell"] = {"answer": it["spell"]["answer"]}
            elif it["type"] == "drag":
                row["lines"] = it["lines"]
                row["blanks"] = it["blanks"]
            else:
                row["transcript"] = it.get("transcript")
            rows.append(row)
    site_bank = {"mission": a.mission, "unit": a.unit, "title": a.title, "items": rows,
                 "battles": [{"id": loc, "arena": zh, "word": en, "boss": loc in BOSS} for loc, zh, en in LOCS],
                 "rewardIcons": {}}
    (mission_dir / "data.js").write_text(
        "// Generated by godot-ershui-quest/tools/build_mission.py — do not edit by hand.\n"
        "export const BANK = " + json.dumps(site_bank, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

    # 任務頁：只載入自己的 data.js，外框與遊戲都用共用版（第一次建立才寫，之後不覆蓋）
    page = mission_dir / "index.html"
    if not page.exists():
        page.write_text(INDEX_HTML.replace("{UNIT}", a.unit), encoding="utf-8")

    size = sum(f.stat().st_size for f in out_dir.rglob("*") if f.is_file())
    print(f"mission {a.mission}: {len(items)} items, bank {size / 1e6:.1f} MB -> {mission_dir}")
    if not (mission_dir / "cover.webp").exists():
        print("提醒：還沒有封面圖 cover.webp（首頁卡片用）")
    print()
    print("--- 貼到 shared/missions.mjs 的 MISSIONS ---")
    print(f'  {{ slug: "{a.mission}", unit: "{a.unit}", title: "{a.title}" }},')
    print()
    print("--- 貼到首頁 index.html 的任務卡片區 ---")
    print(CARD_HTML.replace("{SLUG}", a.mission).replace("{UNIT}", a.unit).replace("{TITLE}", a.title)
          .replace("{N}", str(len(items))))


if __name__ == "__main__":
    main()
