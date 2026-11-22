"""patch_line12_ct278.py — v2.2 修正（2026-11-22 老師選 A）：第 12 句拿掉「蒸汽女王」暱稱。

原因：主流媒體（公視、ETtoday）把「機關車女王／蒸機女王」用在 CT273；二水二八水水公園展示的是 CT278＋台糖 345。
做法：只重做第 12 句 edge-tts（小哲，-5%），其他 44 句的音檔與句界完全不動；
      第 12 句之後的旁白與時間軸整段平移 delta 秒。改前檔案先備份到 _history/v2.1-before-ct278-20261122/。
用法：python -I patch_line12_ct278.py
"""
import asyncio, json, pathlib, shutil, subprocess
import numpy as np
import edge_tts

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SR = 48000
LINE = 12
NEW_TEXT = "以前蒸汽火車會在這裡加水、維修。現在還能看到編號CT278的老蒸汽火車頭喔！"
NEW_UNITS = ["以前蒸汽火車會在這裡加水、維修。", "現在還能看到編號CT278的老蒸汽火車頭喔！"]
VOICE, RATE = "zh-TW-YunJheNeural", "-5%"
HIST = ROOT / "_history" / "v2.1-before-ct278-20261122"


def decode(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


async def synth(f):
    sents = []
    with open(f, "wb") as fh:
        async for ch in edge_tts.Communicate(NEW_TEXT, VOICE, rate=RATE).stream():
            if ch["type"] == "audio": fh.write(ch["data"])
            elif ch["type"] == "SentenceBoundary":
                sents.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return sents


def main():
    tl = json.loads((HERE / "timeline.json").read_text(encoding="utf-8"))
    if any("CT278" in u["text"] for u in tl["units"]):
        raise SystemExit("已經修正過（timeline 已有 CT278），不重複執行")
    # 1. 備份
    HIST.mkdir(parents=True, exist_ok=True)
    mp3 = HERE / "lines" / f"{LINE:02d}-ershui-M.mp3"
    for f in [HERE / "timeline.json", HERE / "narration.wav", HERE / "mix.wav", ROOT / "engine" / "timeline.js", mp3]:
        shutil.copy2(f, HIST / f.name)
    # 2. 新語音（同 build_narration 的去頭尾靜音）
    sents = asyncio.run(synth(mp3))
    a = decode(mp3)
    loud = np.where(np.abs(a) > 0.01)[0]
    s0, s1 = max(0, loud[0] - int(0.03 * SR)), min(len(a), loud[-1] + int(0.08 * SR))
    new = a[s0:s1]; lead = s0 / SR; ndur = len(new) / SR
    ln = next(l for l in tl["lines"] if l["i"] == LINE)
    t0, t1 = ln["t0"], ln["t1"]; delta = round(ndur - (t1 - t0), 3)
    # 3. 旁白：剪掉舊第 12 句，放入新句，後面整段平移
    v = decode(HIST / "narration.wav")
    k0, k1 = int(round(t0 * SR)), int(round(t1 * SR))
    v = np.concatenate([v[:k0], new, v[k1:]])
    pcm = (np.clip(v, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(HERE / "narration.wav")],
                   input=pcm, check=True)
    # 4. 時間軸
    sh = lambda x: round(x + delta, 3) if x >= t1 - 1e-6 else x
    ln["text"] = NEW_TEXT; ln["t1"] = round(t0 + ndur, 3)
    for l in tl["lines"]:
        if l["i"] != LINE: l["t0"], l["t1"] = sh(l["t0"]), sh(l["t1"])
    sb = [s for s in sents if s[2].strip()]
    assert len(sb) == 2, sb
    split = round(t0 + max(0, sb[1][0] - lead), 3)
    old_units = [u for u in tl["units"] if u["line"] == LINE]
    assert len(old_units) == 2
    old_units[0].update(text=NEW_UNITS[0], t0=t0, t1=split)
    old_units[1].update(text=NEW_UNITS[1], t0=split, t1=round(t0 + ndur, 3))
    for u in tl["units"]:
        if u["line"] != LINE: u["t0"], u["t1"] = sh(u["t0"]), sh(u["t1"])
    for s in tl["sections"]:
        s["t0"], s["t1"] = sh(s["t0"]), sh(s["t1"]) if s["t1"] > t0 else s["t1"]
    tl["dur"] = round(tl["dur"] + delta, 3)
    (HERE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "engine" / "timeline.js").write_text("const TL = " + json.dumps(tl, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"line12 {t1 - t0:.3f}s -> {ndur:.3f}s  delta {delta:+.3f}s  dur {tl['dur']}  wav {len(v) / SR:.3f}s")
    for s in tl["sections"]: print(s["key"], s["t0"], s["t1"])


main()
