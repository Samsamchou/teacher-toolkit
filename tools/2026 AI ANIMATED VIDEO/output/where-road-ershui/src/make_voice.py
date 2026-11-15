"""make_voice.py：照 voices.json 用 edge-tts 生成每句 MP3＋逐字時間 JSON（卡拉 OK 用）。
用法：python make_voice.py <輸出資料夾> [句子 key 開頭，例如 s01]
"""
import sys, json, asyncio, pathlib, edge_tts
here = pathlib.Path(__file__).parent
cfg = json.loads((here / "voices.json").read_text(encoding="utf-8"))
base = pathlib.Path(sys.argv[1])   # audio 資料夾；每句存到 audio/<sXX>/
prefix = sys.argv[2] if len(sys.argv) > 2 else ""
skip = "--force" not in sys.argv

async def one(key, who, text):
    v = cfg["voices"][who]
    com = edge_tts.Communicate(text, v["voice"], rate=v["rate"], pitch=v["pitch"], boundary="WordBoundary")
    audio, words = bytearray(), []
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"w": ch["text"], "t0": ch["offset"] / 1e7, "t1": (ch["offset"] + ch["duration"]) / 1e7})
    out = base / key[:3]; out.mkdir(parents=True, exist_ok=True)
    (out / f"{key}.mp3").write_bytes(audio)
    (out / f"{key}.json").write_text(json.dumps({"who": who, "text": text, "words": words}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(key, round(words[-1]["t1"], 2), "s", len(words), "words")

async def main():
    for k, (who, text) in cfg["lines"].items():
        if k.startswith(prefix) and not (skip and (base / k[:3] / f"{k}.json").exists()):
            for tries in range(4):   # edge-tts 偶爾連線逾時 → 重試
                try:
                    await one(k, who, text); break
                except Exception as e:
                    print("retry", k, type(e).__name__, flush=True); await asyncio.sleep(5)
asyncio.run(main())
