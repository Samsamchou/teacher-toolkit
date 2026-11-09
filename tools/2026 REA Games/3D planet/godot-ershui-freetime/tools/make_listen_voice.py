"""Listen and Guess 的語音（edge-tts，0.8 倍速，和 make_voice.py 同設定）。

- Ken 開場＋問句：en-US-GuyNeural +18Hz（同遊戲裡的 Ken）
  listen_scene_<id>.mp3  例：It's Monday. It's cloudy today. Where are you going?
- 學生的答句（揭曉時播）：en-US-AnaNeural（小孩聲）
  listen_ans_<id>.mp3    例：I'm going to the post office. I want to send a letter.
- 句型示範（口說題連續 2 次未滿 80 分才出現；地點用嗶聲蓋掉，不洩漏答案）
  listen_pattern.mp3     I'm going to the … 嗶
另外把 資料/ambience/final/<id>.mp3 複製成 assets/audio/ambience/<id>.mp3。
用法：python -I tools/make_listen_voice.py
"""
import asyncio, json, os, shutil, subprocess

import edge_tts

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "assets", "audio", "voice")
AMB_SRC = os.path.join(os.path.dirname(HERE), "資料", "ambience", "final")
AMB_OUT = os.path.join(HERE, "assets", "audio", "ambience")
RATE = "-20%"
KEN = ("en-US-GuyNeural", "+18Hz")
KID = ("en-US-AnaNeural", "+0Hz")
ITEMS = json.load(open(os.path.join(HERE, "data", "listen.json"), encoding="utf-8"))["items"]


def answer(it):
    return f"I'm going to {'the ' if it['the'] else ''}{it['word']}. {it['reason']}"


async def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(AMB_OUT, exist_ok=True)
    jobs = []
    for it in ITEMS:
        jobs.append((f"listen_scene_{it['id']}", f"{it['scene']} Where are you going?", KEN))
        jobs.append((f"listen_ans_{it['id']}", answer(it), KID))
    jobs.append(("_pattern_words", "I'm going to the", KID))
    for key, text, (voice, pitch) in jobs:
        await edge_tts.Communicate(text, voice, rate=RATE, pitch=pitch).save(os.path.join(OUT, key + ".mp3"))
        print(key, text)
    # 句型示範：I'm going to the ＋ 0.15 秒空白 ＋ 0.6 秒嗶
    src = os.path.join(OUT, "_pattern_words.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-f", "lavfi", "-i", "sine=frequency=880:duration=0.6",
                    "-filter_complex", "[1]volume=0.25,adelay=150|150[b];[0][b]concat=n=2:v=0:a=1",
                    "-ar", "24000", "-ac", "1", os.path.join(OUT, "listen_pattern.mp3")], check=True)
    os.remove(src)
    for it in ITEMS:
        shutil.copy(os.path.join(AMB_SRC, it["id"] + ".mp3"), os.path.join(AMB_OUT, it["id"] + ".mp3"))
    print("ambience copied", len(ITEMS))


asyncio.run(main())
