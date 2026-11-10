"""Free Time 版（HWG7 U03 Ken A）：語音＋線索素材。免費（edge-tts、本機 ffmpeg），不叫任何付費 API。

語音（edge-tts，0.8 倍速，和 make_voice.py 同設定）：
- 旁白 en-US-JennyNeural：ft_intro、ft_scene_qNN（情境＋What do you do in your free time?）
- Ken en-US-GuyNeural +18Hz：ft_ans_<活動>（I study English in my free time.）——選項、揭曉都用
- ft_pattern：I … 嗶 … in my free time.（口說題句型示範，不洩漏答案）
線索（兩人一組線索挑戰用）：資料/freetime/clues → assets/clues/
- icons/<活動>_1..3.png（縮成 256）
- sfx/<活動>.mp3（choice.json 選定版）
- video/<活動>.ogv（Godot 只能播 Theora：640×360、無聲）
用法：python -I tools/make_freetime_assets.py   （加 --no-voice 只做線索）
"""
import asyncio, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.path.join(HERE, "assets", "audio", "voice")
CLUE_SRC = os.path.join(os.path.dirname(HERE), "資料", "freetime", "clues")
CLUE_OUT = os.path.join(HERE, "assets", "clues")
DATA = json.load(open(os.path.join(HERE, "data", "freetime_ken_a.json"), encoding="utf-8"))
RATE = "-20%"
NARRATOR = ("en-US-JennyNeural", "+0Hz")
KEN = ("en-US-GuyNeural", "+18Hz")


async def voices():
    import edge_tts
    jobs = [("ft_intro", DATA["intro"], NARRATOR)]
    for it in DATA["items"]:
        jobs.append((f"ft_scene_{it['id']}", f"{it['context']} {it['question']}", NARRATOR))
    for act, ph in DATA["phrases"].items():
        jobs.append((f"ft_ans_{act}", f"I {ph} in my free time.", KEN))
    jobs.append(("_p1", "I", KEN))
    jobs.append(("_p2", "in my free time.", KEN))
    for key, text, (voice, pitch) in jobs:
        await edge_tts.Communicate(text, voice, rate=RATE, pitch=pitch).save(os.path.join(VOICE, key + ".mp3"))
        print(key, text)
    p1, p2 = os.path.join(VOICE, "_p1.mp3"), os.path.join(VOICE, "_p2.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p1, "-f", "lavfi", "-i", "sine=frequency=880:duration=0.7", "-i", p2,
                    "-filter_complex", "[0]aresample=24000,aformat=channel_layouts=mono[a];[1]volume=0.25,aresample=24000,aformat=channel_layouts=mono,adelay=150|150,apad=pad_dur=0.15[b];[2]aresample=24000,aformat=channel_layouts=mono[c];[a][b][c]concat=n=3:v=0:a=1",
                    "-ar", "24000", "-ac", "1", os.path.join(VOICE, "ft_pattern.mp3")], check=True)
    os.remove(p1)
    os.remove(p2)


def clues():
    from PIL import Image
    acts = list(DATA["phrases"].keys())
    for sub in ["icons", "sfx", "video"]:
        os.makedirs(os.path.join(CLUE_OUT, sub), exist_ok=True)
    for a in acts:
        for k in (1, 2, 3):
            im = Image.open(os.path.join(CLUE_SRC, "icons", f"{a}_{k}.png")).convert("L")
            im.resize((256, 256), Image.LANCZOS).save(os.path.join(CLUE_OUT, "icons", f"{a}_{k}.png"))
        shutil.copy(os.path.join(CLUE_SRC, "sfx", "final", f"{a}.mp3"), os.path.join(CLUE_OUT, "sfx", f"{a}.mp3"))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(CLUE_SRC, "video", "final", f"{a}.mp4"), "-an",
                        "-vf", "scale=640:360,fps=24", "-c:v", "libtheora", "-q:v", "6",
                        os.path.join(CLUE_OUT, "video", f"{a}.ogv")], check=True)
        print("clue", a)


if "--no-voice" not in sys.argv:
    asyncio.run(voices())
clues()
