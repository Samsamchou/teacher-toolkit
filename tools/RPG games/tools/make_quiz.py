"""把 content/<題組>/ 的題庫、圖片放進網站，並用 edge-tts 預錄讀題音檔。

用法：python tools/make_quiz.py hwg5-u01-u02 [--voice en-US-JennyNeural] [--rate -15%]
輸出：site/public/quizzes/<題組>/{bank.json, images/, audio/}，並更新 quizzes/index.json。
"""
import argparse
import asyncio
import json
import shutil
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent


async def tts(text, path, voice, rate):
    await edge_tts.Communicate(text, voice, rate=rate).save(str(path))


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("quiz")
    ap.add_argument("--voice", default="en-US-JennyNeural")
    ap.add_argument("--rate", default="-15%")   # 0.85 倍
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    src = ROOT / "content" / a.quiz
    dst = ROOT / "site" / "public" / "quizzes" / a.quiz
    bank = json.loads((src / "bank.json").read_text(encoding="utf-8"))
    (dst / "audio").mkdir(parents=True, exist_ok=True)
    shutil.copytree(src / "images", dst / "images", dirs_exist_ok=True)
    for it in bank["items"]:
        mp3 = dst / it["audio"]
        if a.force or not mp3.exists():
            await tts(it["readText"], mp3, a.voice, a.rate)
            print("tts", it["id"], it["readText"])
    (dst / "bank.json").write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")

    idx_path = ROOT / "site" / "public" / "quizzes" / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"quizzes": []}
    entry = {"id": bank["id"], "title": bank["title"], "subtitle": bank.get("subtitle", ""),
             "grade": bank.get("grade"), "count": len(bank["items"])}
    idx["quizzes"] = [q for q in idx["quizzes"] if q["id"] != bank["id"]] + [entry]
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    print("quiz ready:", dst, len(bank["items"]), "items")


if __name__ == "__main__":
    asyncio.run(main())
