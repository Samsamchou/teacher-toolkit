"""逐題核對六套 3D 闖關綜合小考題庫（RDQ 2026-11-01 驗收條件 1）。

讀「網站上實際的 bank.json＋bank-*.pak」，對照：
  1. 題數＝Wayground 檢核報告的題數；題型照 Wayground 對應（含 11/01 改成重新排序的 12 題）
  2. 正解＝quiz_items.json（選擇題答案、排序順序、拼字、標籤位置、拖放空格）
  3. 文字審閱稿 docx 裡找得到每題的題幹／選項／答案文字
  4. 聽力題音檔＝「音檔_0.8倍速_每題」原檔（逐位元組比對）；圖片都在 pak 裡
輸出：data/wayground/驗證報告.md；有問題時結束碼 1。

用法：python -I -X utf8 tools/verify_wayground_sets.py
"""
import json
import re
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_wayground_sets import SETS, EXPECT, REORDER, SRC_ROOT, OUT_ROOT  # noqa: E402

SITE = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public")


def read_pak(path: Path) -> dict:
    b = path.read_bytes()
    assert b[:4] == b"QB01"
    n = struct.unpack("<I", b[4:8])[0]
    head = json.loads(b[8:8 + n].decode("utf-8"))
    start = 8 + n
    return {f["path"]: b[start + f["offset"]: start + f["offset"] + f["size"]] for f in head["files"]}


def docx_text(folder: Path) -> str:
    # 不用 python-docx：直接讀 word/document.xml，每個段落接成一行
    import html
    import zipfile
    files = sorted(folder.glob("*文字審閱稿*.docx"))
    if not files:
        return ""
    xml = zipfile.ZipFile(files[-1]).read("word/document.xml").decode("utf-8")
    paras = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", xml, flags=re.S):
        paras.append("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)))
    return norm(html.unescape(" ".join(paras)))


def norm(s: str) -> str:
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip().lower()


def main() -> int:
    lines = ["# 二水 3D 闖關綜合小考題庫：逐題核對報告", "",
             "由 `tools/verify_wayground_sets.py` 產生；對照網站上實際的 bank.json／pak。", ""]
    bad_total = 0
    for code, folder, unit, _title, short in SETS:
        src = SRC_ROOT / folder
        qi = json.loads((src / "_紀錄" / "quiz_items.json").read_text(encoding="utf-8"))
        bank_dir = SITE / f"ershui-3d-quest-{code}" / "bank"
        bank = json.loads((bank_dir / "bank.json").read_text(encoding="utf-8"))
        pak = read_pak(bank_dir / bank["pak"])
        items = {it["id"]: it for it in bank["items"]}
        doc = docx_text(src)
        probs = []
        types = {}
        for it in bank["items"]:
            types[it["type"]] = types.get(it["type"], 0) + 1
        if len(items) != EXPECT[code]:
            probs.append(f"題數 {len(items)} ≠ Wayground {EXPECT[code]}")
        placed = [i for v in bank["locations"].values() for i in v]
        if sorted(placed) != sorted(items):
            probs.append("13 個地點的配題和題目不一致")
        audio_ok = img_ok = doc_hits = doc_total = 0

        def doc_has(text: str, where: str) -> None:
            nonlocal doc_hits, doc_total
            if not doc:
                return
            doc_total += 1
            if norm(text) in doc:
                doc_hits += 1
            else:
                probs.append(f"{where}：審閱稿找不到「{text}」")

        for sec in qi["sections"]:
            sid = sec["id"]
            wg = sec.get("wayground", "")
            if sid == "R4":
                it = items.get("R4")
                if not it or it["type"] != "label":
                    probs.append("R4 標籤題不見或題型不對")
                    continue
                want = {s["sentence"]: int(sec["panel_numbers"][s["q"]]) for s in sec["items"]}
                got = {l["text"]: l["panel"] for l in it["labels"]}
                if want != got:
                    probs.append(f"R4 標籤位置不同：{got} ≠ {want}")
                for s in want:
                    doc_has(s, "R4")
                continue
            if sid == "R5":
                it = items.get("R5")
                if not it or it["type"] != "drag":
                    probs.append("R5 拖放題不見或題型不對")
                    continue
                if [b["answer"] for b in it["blanks"]] != sec["answers"]:
                    probs.append("R5 拖放答案不同")
                if sorted([b["answer"] for b in it["blanks"]] + it["distractors"]) != sorted(sec["word_bank"]):
                    probs.append("R5 字卡（含多餘字）不同")
                for a in sec["answers"]:
                    doc_has(a, "R5")
                continue
            for s in sec["items"]:
                iid = f"{sid}-{s['q']}"
                it = items.get(iid)
                if not it:
                    probs.append(f"{iid} 不見了")
                    continue
                if sid == "R1":
                    mod = REORDER.get(code, {}).get(s["answer"])
                    want_t = "order" if mod else "spell"
                    if it["type"] != want_t:
                        probs.append(f"{iid} 題型 {it['type']} ≠ {want_t}")
                    elif mod and it["answer"] != mod:
                        probs.append(f"{iid} 拆字順序不同")
                    elif not mod and it["spell"]["answer"] != s["answer"]:
                        probs.append(f"{iid} 拼字答案不同")
                    doc_has(s["answer"], iid)
                elif sid == "L3":
                    if it["type"] != "order" or it["answer"] != s["answer_order"]:
                        probs.append(f"{iid} 聽力排序不同")
                    if "重新排序" not in wg:
                        probs.append(f"{iid} Wayground 題型不是重新排序？")
                elif sid == "R6":
                    if it["type"] != "order" or " ".join(it["answer"]) != s["answer"]:
                        probs.append(f"{iid} 句子重組答案不同")
                    doc_has(s["answer"], iid)
                else:
                    if it["type"] != "choice" or "選擇" not in wg and "題組" not in wg:
                        probs.append(f"{iid} 題型 {it['type']}／Wayground「{wg}」")
                    want = "OX".index(s["answer"].strip().upper()) if sid == "L5" else "ABC".index(s["answer"].strip().upper())
                    if it["answer"] != want:
                        probs.append(f"{iid} 正解 {it['answer']} ≠ {want}")
                    if sid != "L5" and "image" not in it["options"][0]:
                        texts = [o["text"] for o in it["options"]]
                        if texts != s["options"]:
                            probs.append(f"{iid} 選項文字不同")
                        doc_has(s["options"][want], iid)
                    if s.get("stem"):
                        doc_has(re.sub(r"^\(對話.\)\s*", "", s["stem"]), iid)
                # 音檔：逐位元組比對原檔
                if sec["part"] == "聽力":
                    data = pak.get(it.get("audio", ""))
                    d = src / "音檔_0.8倍速_每題"
                    cands = [d / f"{sid}-{s['q']}.mp3"]
                    if s.get("dialogue"):
                        cands += sorted(d.glob(f"{sid}-*.mp3"))
                    if data and any(c.exists() and c.read_bytes() == data for c in cands):
                        audio_ok += 1
                    else:
                        probs.append(f"{iid} 音檔和原檔不同或不見")
        # 圖片都在 pak 裡
        for it in bank["items"]:
            for p in [it.get("image", "")] + [o.get("image", "") for o in it.get("options", [])]:
                if p:
                    if p in pak and len(pak[p]) > 1000:
                        img_ok += 1
                    else:
                        probs.append(f"{it['id']} 圖片不見：{p}")
        bad_total += len(probs)
        lines += [f"## {short}（ershui-3d-quest-{code}）", "",
                  f"- 題數：{len(items)}（Wayground {EXPECT[code]}）　題型：{types}",
                  f"- 聽力音檔與原檔一致：{audio_ok} 題　圖片：{img_ok} 張",
                  f"- 審閱稿文字對得上：{doc_hits} / {doc_total}",
                  "- 每地點題數：" + "、".join(f"{k} {len(v)}" for k, v in bank["locations"].items()),
                  f"- 結果：{'✅ 全部一致' if not probs else '❌ ' + str(len(probs)) + ' 個問題'}", ""]
        lines += [f"  - {p}" for p in probs]
        if probs:
            lines.append("")
        print(f"{code}: {len(items)} items, audio {audio_ok}, images {img_ok}, docx {doc_hits}/{doc_total}, problems {len(probs)}")
        for p in probs[:20]:
            print("   ", p)
    (OUT_ROOT / "驗證報告.md").write_text("\n".join(lines), encoding="utf-8")
    print("VERIFY", "OK" if bad_total == 0 else f"{bad_total} problems")
    return 0 if bad_total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
