"""產生題目與答案句的英文語音（edge-tts，0.8 倍速）。

- 旁白（題目、He's/She's going…）：en-US-JennyNeural
- Ken 回答（I'm going…）：en-US-GuyNeural，音調調高一點，聽起來像大男孩
輸出：assets/audio/voice/*.mp3；清單寫在 assets/audio/voice/voice-list.json
用法：python -I tools/make_voice.py
"""
import asyncio
import json
import os

import edge_tts

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "assets", "audio", "voice")
RATE = "-20%"
NARRATOR = ("en-US-JennyNeural", "+0Hz")
KEN = ("en-US-GuyNeural", "+18Hz")
ROBOT = ("en-US-AriaNeural", "+30Hz")   # 機器人圳寶：中性、高一點的聲音

COLORS = ["red", "yellow", "green", "blue", "black", "white", "purple", "pink", "orange", "brown"]
WORDS = json.load(open(os.path.join(HERE, "data", "map.json"), encoding="utf-8"))["words"]


def lines():
    yield "q_you_1", "Ken, where are you going?", NARRATOR
    yield "q_you_2", "Where are you going, Ken?", NARRATOR
    yield "q_he", "Where is he going?", NARRATOR
    yield "q_she", "Where is she going?", NARRATOR
    yield "q_we", "Where are you going?", NARRATOR
    for w in WORDS:
        k = w.replace(" ", "_")
        yield f"a_i_{k}", f"I'm going to the {w}.", KEN
        yield f"a_he_{k}", f"He's going to the {w}.", NARRATOR
        yield f"a_she_{k}", f"She's going to the {w}.", NARRATOR
        yield f"a_we_{k}", f"We're going to the {w}.", KEN
        yield f"q_where_{k}", f"Where's the {w}?", NARRATOR
    for c in COLORS:
        yield f"a_road_{c}", f"It's on {c.capitalize()} Road.", NARRATOR
        yield f"a_street_{c}", f"It's on {c.capitalize()} Street.", NARRATOR


async def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    listing = []
    for key, text, (voice, pitch) in lines():
        path = os.path.join(OUT, key + ".mp3")
        await edge_tts.Communicate(text, voice, rate=RATE, pitch=pitch).save(path)
        listing.append({"key": key, "text": text, "voice": voice, "rate": RATE, "pitch": pitch})
        print(key, os.path.getsize(path))
    json.dump(listing, open(os.path.join(OUT, "voice-list.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


asyncio.run(main())
