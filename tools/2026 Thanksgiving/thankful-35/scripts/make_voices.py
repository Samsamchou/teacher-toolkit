"""35 句英文朗讀（edge-tts）＋逐字時間，給網頁卡拉 OK 用。

  python scripts/make_voices.py            # 全部（已存在就跳過）
  python scripts/make_voices.py mom        # 只做某一組

輸出 audio/<id>_<n>.mp3 與 data.js（window.SENTENCES，含逐字時間）。
"""
import asyncio, json, sys
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICE = "en-US-AnaNeural"   # 美式童聲
RATE = "-20%"               # 約 0.8 倍速
AUDIO = ROOT / "audio"


def sentence(target, reason):
    return f"I'm thankful for {target} because {reason}."


async def tts(text, mp3):
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    words = []
    with open(mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "t": round(ch["offset"] / 1e7, 3),
                              "d": round(ch["duration"] / 1e7, 3)})
    return words


async def main(only):
    cfg = json.loads((ROOT / "sentences.json").read_text(encoding="utf-8"))
    AUDIO.mkdir(exist_ok=True)
    cache_p = ROOT / "audio" / "_words.json"
    cache = json.loads(cache_p.read_text(encoding="utf-8")) if cache_p.exists() else {}
    out = []
    for g in cfg["groups"]:
        for i, it in enumerate(g["items"], 1):
            key = f"{g['id']}_{i}"
            text = sentence(g["target"], it["reason"])
            mp3 = AUDIO / f"{key}.mp3"
            if (not only or g["id"] in only) and (not mp3.exists() or cache.get(key, {}).get("text") != text):
                cache[key] = {"text": text, "words": await tts(text, mp3)}
                print("voice", key, flush=True)
            out.append({"key": key, "group": g["id"], "n": i, "target": g["target"], "zh_target": g["zh_target"],
                        "reason": it["reason"],
                        "text": text, "zh": it["zh"], "audio": f"audio/{key}.mp3",
                        "words": cache.get(key, {}).get("words", [])})
    cache_p.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "data.js").write_text("window.SENTENCES = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n",
                                  encoding="utf-8")
    print("data.js:", len(out), "sentences")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
