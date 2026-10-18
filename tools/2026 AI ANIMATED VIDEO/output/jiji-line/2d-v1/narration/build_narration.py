"""build_narration.py — 用 edge-tts 產生 24 句台灣口音旁白，去頭尾靜音，排成全片時間軸。

輸出（在本資料夾）：
  lines/NN-<section>-<F|M>.mp3   每句原始語音（edge-tts 原檔）
  narration.wav                  全片旁白（48 kHz 單聲道，已放在正確時間）
  timeline.json                  段落、每句、每個句意（用 edge-tts 的 SentenceBoundary 對時）
  ../engine/timeline.js          給畫面程式用的同一份時間軸
用法：python -I build_narration.py
"""
import asyncio, json, pathlib, subprocess, re
import numpy as np
import edge_tts

HERE = pathlib.Path(__file__).resolve().parent
SR = 48000
VOICE = {"F": "zh-TW-HsiaoChenNeural", "M": "zh-TW-YunJheNeural"}
NAME = {"F": "小晨", "M": "小哲"}
RATE = "-5%"
# 段落：key, 顯示名, 開頭留白（秒；車站段含站名牌轉場）
SECTIONS = [("open", "開場", 1.0), ("ershui", "第1站 二水", 2.8), ("yuanquan", "第2站 源泉", 2.8),
            ("jiji", "第3站 集集", 2.8), ("shuili", "第4站 水里", 2.8), ("checheng", "第5站 車埕", 2.8),
            ("ending", "結尾", 1.2)]
GAP, SECTION_TAIL, END_TAIL = 0.8, 1.0, 2.5
LINES = [
 ("open","F","嗨！我是小晨。"),
 ("open","M","我是小哲！今天我們要搭小火車，認識集集線！"),
 ("open","F","集集線從彰化二水出發，沿著濁水溪開進南投的山裡。一百多年前，它是為了蓋日月潭發電廠而建的。"),
 ("open","M","我們要停靠五個車站，出發囉！"),
 ("ershui","M","第一站，二水車站！這裡是集集線的起點，也是縱貫線和集集線交會的地方。"),
 ("ershui","F","二水以前叫做「二八水」，名字和濁水溪、八堡圳的傳說有關。"),
 ("ershui","M","以前蒸汽火車會在這裡加水、維修。現在車站還能看到被叫做「蒸汽女王」的老火車頭喔！"),
 ("yuanquan","F","第二站，源泉車站！它的舊名叫做「鼻仔頭」。"),
 ("yuanquan","M","為什麼叫源泉呢？因為附近就是八堡圳的源頭。"),
 ("yuanquan","F","八堡圳是台灣最古老的水圳之一。三百多年來，它把濁水溪的水送到彰化平原，灌溉一大片稻田。"),
 ("yuanquan","M","所以源泉，就是水的源頭！"),
 ("jiji","M","第三站，集集車站！這是一座用檜木蓋的日式木造車站，已經快一百歲了。"),
 ("jiji","F","一九九九年九二一大地震時，車站被震得歪歪斜斜。大家細心修復，讓它恢復原來的樣子。"),
 ("jiji","M","車站附近有集集老街和綠色隧道，可以騎腳踏車，在大樹下吹涼風。"),
 ("shuili","F","第四站，水里車站！水里以前叫做「水裡坑」，是山城裡熱鬧的交通中心。"),
 ("shuili","M","很久以前，要去爬玉山的人常從水里出發。火車快到水里時，天氣好還能看見玉山喔！"),
 ("shuili","F","水里溪旁有大觀、明湖等發電廠。來到水里，別忘了吃一支古早味的枝仔冰！"),
 ("checheng","M","最後一站，車埕車站！這裡是集集線的終點。"),
 ("checheng","F","「埕」是空地的意思。以前山上的木頭用火車運到這裡，車埕成了熱鬧的木材集散地。"),
 ("checheng","M","車站旁的貯木池，以前用來泡木頭，現在變成美麗的生態池。木造車站和木業展示館，都在說著木頭小鎮的故事。"),
 ("ending","F","二水、源泉、集集、水里、車埕，我們走完集集線了！"),
 ("ending","M","停駛將近五年的集集線，在二〇二六年六月恢復全線通車。"),
 ("ending","F","下次和家人一起來搭火車吧！"),
 ("ending","M","掰掰！"),
]

def split_units(text):
    return [p for p in re.findall(r"[^。！？]+[。！？]?", text) if p.strip()]

async def synth(i, sec, who, text):
    f = HERE / "lines" / f"{i:02d}-{sec}-{who}.mp3"
    sents = []
    with open(f, "wb") as fh:
        async for ch in edge_tts.Communicate(text, VOICE[who], rate=RATE).stream():
            if ch["type"] == "audio": fh.write(ch["data"])
            elif ch["type"] == "SentenceBoundary":
                sents.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return f, sents

def decode(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

async def main():
    (HERE / "lines").mkdir(exist_ok=True)
    clips = []
    for i, (sec, who, text) in enumerate(LINES, 1):
        f, sents = await synth(i, sec, who, text)
        a = decode(f)
        loud = np.where(np.abs(a) > 0.01)[0]
        s0, s1 = max(0, loud[0] - int(0.03 * SR)), min(len(a), loud[-1] + int(0.08 * SR))
        clips.append(dict(i=i, sec=sec, who=who, text=text, audio=a[s0:s1], lead=s0 / SR, sents=sents))
        print(i, round((s1 - s0) / SR, 2), len(sents), "sentences")
    # 排時間軸
    t = 0.0; secs = []; units = []; lines = []; out = []
    for key, label, head in SECTIONS:
        s_start = t; t += head
        for c in [c for c in clips if c["sec"] == key]:
            dur = len(c["audio"]) / SR
            out.append((t, c["audio"]))
            lines.append(dict(i=c["i"], sec=key, who=c["who"], name=NAME[c["who"]], text=c["text"], t0=round(t, 3), t1=round(t + dur, 3)))
            parts = split_units(c["text"])
            sb = [s for s in c["sents"] if s[2].strip()]
            if len(sb) == len(parts):   # 用 edge-tts 句界
                bounds = [(max(0, s[0] - c["lead"]), max(0, s[1] - c["lead"])) for s in sb]
                bounds[-1] = (bounds[-1][0], dur)
                for k in range(len(bounds) - 1): bounds[k] = (bounds[k][0], bounds[k + 1][0])
                bounds[0] = (0, bounds[0][1])
            else:                       # 退回依字數比例
                n = sum(len(p) for p in parts); acc = 0; bounds = []
                for p in parts: bounds.append((dur * acc / n, dur * (acc + len(p)) / n)); acc += len(p)
            for p, (a0, a1) in zip(parts, bounds):
                units.append(dict(n=len(units) + 1, line=c["i"], sec=key, who=c["who"], name=NAME[c["who"]], text=p,
                                  t0=round(t + a0, 3), t1=round(t + a1, 3)))
            t += dur + GAP
        t += SECTION_TAIL - GAP
        secs.append(dict(key=key, label=label, t0=round(s_start, 3), t1=round(t, 3)))
    total = t + END_TAIL - SECTION_TAIL
    secs[-1]["t1"] = round(total, 3)
    buf = np.zeros(int(round(total * SR)) + SR, np.float32)
    for t0, a in out:
        k = int(round(t0 * SR)); buf[k:k + len(a)] += a
    buf = buf[:int(round(total * SR))]
    pcm = (np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(HERE / "narration.wav")], input=pcm, check=True)
    tl = dict(dur=round(total, 3), voices=VOICE, rate=RATE, sections=secs, lines=lines, units=units)
    (HERE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    (HERE.parent / "engine" / "timeline.js").write_text("const TL = " + json.dumps(tl, ensure_ascii=False) + ";\n", encoding="utf-8")
    print("total", round(total, 2), "units", len(units))
    for s in secs: print(s)

asyncio.run(main())
