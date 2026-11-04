"""Pippy 配音（edge-tts en-US-AnaNeural）：每句兩次，take1 0.8 倍（-20%）、take2 0.7 倍（-30%），並存逐字時間。
  python scripts/gen_voices.py S04 S05 ...   -> voices/<id>_1.mp3、<id>_2.mp3，逐字時間併入 voices/words.json
"""
import asyncio, json, sys
from pathlib import Path
import edge_tts

FILM = Path(__file__).resolve().parents[1]
VOICE, RATES = "en-US-AnaNeural", {1: "-20%", 2: "-30%"}
TEXT = {
    "S03": "Long ago, in 1620, a ship sailed from England to America.",
    "S04": "The ship was the Mayflower. About 100 people were on it.",
    "S05": "Today, we call them the Pilgrims.",
    "S06": "They came to the land of the Wampanoag people.",
    "S07": "The first winter was very cold and hard.",
    "S08": "A Wampanoag man, Tisquantum, helped them plant corn.",
    "S09": "In the fall of 1621, they had a good harvest and a big feast.",
    "S10": "Massasoit, a Wampanoag leader, came with about 90 men. They ate together for three days.",
    "S11": "In 1863, Thanksgiving became a holiday. Today, it is on the fourth Thursday of November.",
    "S12": "For many Native people, it is also a day to remember their history.",
    # 開場、單字段（劇本 v1；這些只念一次，用 take1 0.8 倍）
    "S01": "Hi, everyone! I'm Pippy, the Pumpkin Pie Kid. Happy Thanksgiving!",
    "S02": "Thanksgiving is a big holiday in America. Let's learn how it started!",
    "S13": "Now let's learn some Thanksgiving words. Say them with me!",
    "W14": "Mayflower.", "E14": "The Pilgrims came on the Mayflower.",
    "W15": "Pilgrims.", "E15": "The Pilgrims came from England.",
    "W16": "feast.", "E16": "A feast is a big, big dinner.",
    "W17": "turkey.", "E17": "People have turkey on Thanksgiving Day.",
    "W18": "potatoes.", "E18": "Mashed potatoes are yummy!",
    "W19": "pumpkin pie.", "E19": "Pumpkin pie... that's me! People eat pumpkin pie for dessert.",
    "W20": "thankful.", "E20": "I'm thankful for my friends. What are you thankful for?",
    # 是非題（劇本 v2 Q1–Q3）＋結尾
    "QI": "Let's play True or False!",
    "Q1": "The Mayflower was a ship.", "A1": "True! The Mayflower was a ship.",
    "Q2": "The Pilgrims came from Taiwan.", "A2": "False! The Pilgrims came from England.",
    "Q3": "Thanksgiving is on the fourth Thursday of November.", "A3": "True! It is on the fourth Thursday of November.",
    "S21": "Now, let's listen to our friends. What are they thankful for? Happy Thanksgiving!",
}


async def take(sid, k):
    for n in range(6):           # edge-tts sometimes answers 503: wait and retry
        try:
            return await _take(sid, k)
        except Exception as e:
            print(f"  retry {sid}_{k} ({type(e).__name__})", flush=True); await asyncio.sleep(5 * (n + 1))
    raise RuntimeError(f"edge-tts failed for {sid}_{k}")


async def _take(sid, k):
    com = edge_tts.Communicate(TEXT[sid], VOICE, rate=RATES[k], boundary="WordBoundary")
    audio, words = bytearray(), []
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append(dict(w=ch["text"], t=ch["offset"] / 1e7, d=ch["duration"] / 1e7))
    (FILM / "voices" / f"{sid}_{k}.mp3").write_bytes(bytes(audio))
    return words


async def main(ids):
    p = FILM / "voices" / "words.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    for sid in ids:
        data[sid] = dict(text=TEXT[sid], take1=await take(sid, 1), take2=await take(sid, 2))
        print(sid, [w["w"] for w in data[sid]["take1"]], f"{data[sid]['take2'][-1]['t'] + data[sid]['take2'][-1]['d']:.2f}s")
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
