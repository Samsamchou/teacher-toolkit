"""Free Time 版：Ken B／水鈴／圳寶三條路線的語音（免費 edge-tts，和 make_freetime_assets.py 的 Ken A 同聲音同設定）。

- 旁白 en-US-JennyNeural（-20%）：ft_<路線>_intro、ft_<路線>_scene_qNN（情境＋問句）、ft_<路線>_question（只有問句）
- Ken 的聲音 en-US-GuyNeural +18Hz（-20%）：ft_<路線>_ans_<活動>（She goes jogging in her free time.）、ft_<路線>_pattern（She … 嗶 … in her free time.）
- Ken B 的答案句和 Ken A 一樣（I … in my free time.）→ 直接用原本的 ft_ans_<活動>.mp3、ft_pattern.mp3，不重做。
用法：python -I tools/make_freetime_route_voices.py   （做完要跑 Godot --headless --import）
"""
import asyncio, json, os, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.path.join(HERE, "assets", "audio", "voice")
RATE = "-20%"
NARRATOR = ("en-US-JennyNeural", "+0Hz")
KEN = ("en-US-GuyNeural", "+18Hz")
ROUTES = ["ken_b", "shuiling", "zunbo"]


async def save(key, text, vp):
    import edge_tts
    path = os.path.join(VOICE, key + ".mp3")
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, vp[0], rate=RATE, pitch=vp[1]).save(path)
            if os.path.getsize(path) > 2000:
                print(key, "|", text)
                return
        except Exception as e:  # 網路偶爾斷：重試
            print("retry", key, e)
        await asyncio.sleep(2)
    raise SystemExit("failed " + key)


async def main():
    only = [a for a in sys.argv[1:] if not a.startswith("-")] or ROUTES
    for rid in only:
        D = json.load(open(os.path.join(HERE, "data", "freetime_%s.json" % rid), encoding="utf-8"))
        pre = "ft_%s_" % rid
        await save(pre + "intro", D["intro"], NARRATOR)
        await save(pre + "question", D["question"], NARRATOR)
        for it in D["items"]:
            await save(pre + "scene_" + it["id"], "%s %s" % (it["context"], it["question"]), NARRATOR)
        if D["subject"] == "I":
            continue
        for act, ph in D["phrases3"].items():
            await save(pre + "ans_" + act, "%s %s in %s free time." % (D["subject"], ph, D["possessive"]), KEN)
        await save("_p1", D["subject"], KEN)
        await save("_p2", "in %s free time." % D["possessive"], KEN)
        p1, p2 = os.path.join(VOICE, "_p1.mp3"), os.path.join(VOICE, "_p2.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p1, "-f", "lavfi", "-i", "sine=frequency=880:duration=0.7", "-i", p2,
                        "-filter_complex", "[0]aresample=24000,aformat=channel_layouts=mono[a];[1]volume=0.25,aresample=24000,aformat=channel_layouts=mono,adelay=150|150,apad=pad_dur=0.15[b];[2]aresample=24000,aformat=channel_layouts=mono[c];[a][b][c]concat=n=3:v=0:a=1",
                        "-ar", "24000", "-ac", "1", os.path.join(VOICE, pre + "pattern.mp3")], check=True)
        os.remove(p1)
        os.remove(p2)
        print(pre + "pattern")


asyncio.run(main())
