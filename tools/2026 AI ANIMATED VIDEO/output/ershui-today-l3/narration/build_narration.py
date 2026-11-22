"""build_narration.py — 〈二水三景點〉旁白：edge-tts 台灣口音中文＋英文單字帶念，排成全片時間軸。

台詞來源：在地課程 10_第3節v2教案與教材_20261122/_work/video_script.py（教師第②b 關確認的文字稿）。
輸出（在本資料夾）：
  lines/NN-<seg>-<who>.mp3       每句原始語音；英文帶念 wNN-<word>.mp3
  narration.wav                  全片旁白（48 kHz 單聲道）
  timeline.json                  段落、每句、每個句意、英文帶念時間
  ../engine/timeline.js          給畫面程式用的同一份時間軸
用法：python -I build_narration.py [--only-words]
"""
import asyncio, json, pathlib, re, subprocess, sys
import numpy as np
import edge_tts

HERE = pathlib.Path(__file__).resolve().parent
SCRIPT_DIR = pathlib.Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui\202609 在地課程3年級上學期教案"
                          r"\二水的現在 第1-5週\03_第3節\10_第3節v2教案與教材_20261122\_work")
sys.path.insert(0, str(SCRIPT_DIR))
import video_script as V  # noqa: E402

SR = 48000
ZH = {"女": ("zh-TW-HsiaoChenNeural", "+0Hz"), "男": ("zh-TW-YunJheNeural", "+0Hz")}
EN = {"女": ("en-US-AnaNeural", "-10%", "+0Hz"), "男": ("en-US-ChristopherNeural", "-15%", "+50Hz")}
RATE = V.RATE
NAME = {"女": "女孩", "男": "男孩"}
HEAD, GAP, SEG_GAP, END_TAIL = 1.0, 0.7, 1.2, 2.5
# 英文帶念：字卡翻面 0.9 秒 → 念 → 停 2.0 秒 → 念 → 停 2.0 秒
W_LEAD, W_PAUSE = 0.9, 2.0
# 顯示文字和送 TTS 的文字分開（踩坑規則：TTS_FIX）
TTS_FIX = {"CT278": "CT278", "臺鐵": "台鐵"}


def split_units(text):
    return [p for p in re.findall(r"[^。！？]+[。！？]?", text) if p.strip()]


async def synth(f, text, voice, rate, pitch):
    sents = []
    for attempt in range(10):
        try:
            sents = []
            with open(f, "wb") as fh:
                async for ch in edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).stream():
                    if ch["type"] == "audio": fh.write(ch["data"])
                    elif ch["type"] == "SentenceBoundary":
                        sents.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
            return sents
        except Exception as e:  # noqa: BLE001
            print("retry", f.name, e); await asyncio.sleep(3)
    raise RuntimeError(f"edge-tts failed: {f}")


def decode(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def trim(a):
    loud = np.where(np.abs(a) > 0.01)[0]
    s0, s1 = max(0, loud[0] - int(0.03 * SR)), min(len(a), loud[-1] + int(0.08 * SR))
    return a[s0:s1], s0 / SR


async def main():
    (HERE / "lines").mkdir(exist_ok=True)
    t = 0.0; out = []; secs = []; lines = []; units = []; words = []; n = 0
    for seg, theme, lvl, q, rows in V.SEGMENTS:
        s_start = t; t += HEAD
        for who, text, card, vis in rows:
            if who == "讀":
                for k, (w, lead, img, zh) in enumerate(V.WORDS, 1):
                    voice, rate, pitch = EN[lead]
                    f = HERE / "lines" / f"w{k:02d}-{w.replace(' ', '_')}-{lead}.mp3"
                    await synth(f, w + ".", voice, rate, pitch)
                    a, _ = trim(decode(f)); d = len(a) / SR
                    w0 = t; t += W_LEAD
                    say = []
                    for rep in range(2):
                        out.append((t, a)); say.append((round(t, 3), round(t + d, 3))); t += d + W_PAUSE
                    words.append(dict(k=k, word=w, zh=zh, img=img, who=lead, name=NAME[lead], t0=round(w0, 3),
                                      say=say, t1=round(t, 3)))
                    print("word", k, w, round(d, 2))
                t += GAP
                continue
            n += 1
            voice, pitch = ZH[who]
            tts = text
            for a_, b_ in TTS_FIX.items(): tts = tts.replace(a_, b_)
            f = HERE / "lines" / f"{n:02d}-s{seg}-{'F' if who == '女' else 'M'}.mp3"
            sents = await synth(f, tts, voice, RATE, pitch)
            a, lead = trim(decode(f)); dur = len(a) / SR
            out.append((t, a))
            lines.append(dict(i=n, seg=seg, who=who, name=NAME[who], text=text, card=card, vis=vis,
                              t0=round(t, 3), t1=round(t + dur, 3)))
            parts = split_units(text); sb = [s for s in sents if s[2].strip()]
            if len(sb) == len(parts):
                bounds = [(max(0, s[0] - lead), max(0, s[1] - lead)) for s in sb]
                bounds[-1] = (bounds[-1][0], dur)
                for k in range(len(bounds) - 1): bounds[k] = (bounds[k][0], bounds[k + 1][0])
                bounds[0] = (0, bounds[0][1])
            else:
                tot = sum(len(p) for p in parts); acc = 0; bounds = []
                for p in parts: bounds.append((dur * acc / tot, dur * (acc + len(p)) / tot)); acc += len(p)
            for p, (a0, a1) in zip(parts, bounds):
                units.append(dict(n=len(units) + 1, line=n, seg=seg, who=who, name=NAME[who], text=p,
                                  t0=round(t + a0, 3), t1=round(t + a1, 3)))
            print(n, seg, round(dur, 2))
            t += dur + GAP
        t += SEG_GAP - GAP
        secs.append(dict(seg=seg, theme=theme, level=lvl, kahoot=q, t0=round(s_start, 3), t1=round(t, 3)))
    total = t + END_TAIL - SEG_GAP
    secs[-1]["t1"] = round(total, 3)
    buf = np.zeros(int(round(total * SR)) + SR, np.float32)
    for t0, a in out:
        k = int(round(t0 * SR)); buf[k:k + len(a)] += a
    buf = buf[:int(round(total * SR))]
    pcm = (np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    str(HERE / "narration.wav")], input=pcm, check=True)
    tl = dict(dur=round(total, 3), rate=RATE, zh=ZH, en=EN, sections=secs, lines=lines, units=units, words=words)
    (HERE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    eng = HERE.parent / "engine"; eng.mkdir(exist_ok=True)
    (eng / "timeline.js").write_text("const TL = " + json.dumps(tl, ensure_ascii=False) + ";\n", encoding="utf-8")
    print("total", round(total, 2), "lines", len(lines), "units", len(units), "words", len(words))
    for s in secs: print(s["seg"], s["t0"], s["t1"], s["theme"])


asyncio.run(main())
