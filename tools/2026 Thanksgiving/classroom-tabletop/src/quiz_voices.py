"""課堂版片尾是非題配音（edge-tts en-US-AnaNeural，-20%，跟全校版同一個聲音）。
  python src/quiz_voices.py → voices/CQ1.mp3 … CA3.mp3（開頭的 Let's play True or False! 沿用全校版 QI_1.mp3）
"""
import asyncio, sys
from pathlib import Path
import edge_tts

OUT = Path(__file__).resolve().parents[1] / "voices"; OUT.mkdir(exist_ok=True)
TEXT = {"CQ1": "The Pilgrims came to America in 1620.", "CA1": "True! The Pilgrims came to America in 1620.",
        "CQ2": "Tisquantum helped them plant rice.", "CA2": "False! Tisquantum helped them plant corn.",
        "CQ3": "They ate together for three days.", "CA3": "True! They ate together for three days."}
# v2 片頭單字卡：每張卡念一次單字
for _w in ("Mayflower", "Pilgrims", "Wampanoag", "winter", "corn", "harvest", "feast", "holiday"):
    TEXT[f"W_{_w}"] = _w + "."
if "words" in sys.argv: TEXT = {k: v for k, v in TEXT.items() if k.startswith("W_")}


async def one(k, t):
    for i in range(6):
        try:
            await edge_tts.Communicate(t, "en-US-AnaNeural", rate="-20%").save(str(OUT / f"{k}.mp3")); return
        except Exception as e:
            print("retry", k, e); await asyncio.sleep(3)
    raise SystemExit(f"TTS failed {k}")


async def main():
    for k, t in TEXT.items():
        await one(k, t); print(k, flush=True)

asyncio.run(main())
