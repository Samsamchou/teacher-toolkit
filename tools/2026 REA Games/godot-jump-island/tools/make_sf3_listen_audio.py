"""SF3 Phonics 聽力 20 題的音檔：照 2026-10-31 起五六年級小考的做法（English exam 專案
output/HWG5_小考_U02_20261031/_紀錄/audio/ 的 tts_run.py、assemble.py、asr_check.py）。

1. Gemini TTS（gemini-3.8-flash-tts）兒童聲 Leda，只唸這一個字，存 1 倍速原始檔 raw_1x/<字>.wav
2. 0.8 倍速（atempo 一次、音高不變；只修掉字尾靜音，避免切掉 b／p／d／t 開頭）、loudnorm -18
3. 每題：0.5 s ＋ 字 ＋ 1.5 s ＋ 字 ＋ 0.8 s（和小考 L1／L2 單字題一樣）
4. faster-whisper 核對每個字
金鑰只從環境變數 GEMINI_API_KEY 讀，不會印出或寫進檔案。預算上限 US$0.50（14 個字，實際約 US$0.07）。

用法：python -I -X utf8 tools/make_sf3_listen_audio.py
輸出：data/sf3/listen_audio/<題號>.mp3（L1a、L1b…L10b），build_sf3_bank.py 會用這些檔案。
"""
import base64
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "tools"))
from build_sf3_bank import LISTEN  # noqa: E402  題目與字表只在 build_sf3_bank.py 定義一次

W = HERE / "data" / "sf3" / "listen_audio_work"
RAW, WORK = W / "raw_1x", W / "work_08"
OUT = HERE / "data" / "sf3" / "listen_audio"
for d in (RAW, WORK, OUT):
    d.mkdir(parents=True, exist_ok=True)
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
MODEL = "gemini-3.8-flash-tts"
VOICE = "Leda"
STYLE_WORD = ("Clear American English spoken by a child for a phonics listening quiz. "
              "Say only this single English word once, clearly and naturally, with no extra words.")
LIMIT = 0.50
RATE, SR, LEAD, GAP, TAIL = 0.8, 24000, 0.5, 1.5, 0.8
TRIM = "areverse,silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.15,areverse"
# 2026-11-11 教師 iPad 聽到「微微雜音」：字前後各約 0.3–0.5 s 的 TTS 底噪（-45 dB）被 loudnorm 放大，
# 接著突然切成數位靜音。改成：標準化後把頭尾低於 -42 dB 的底噪剪掉（留 0.06／0.12 s），
# 不用 afftdn 降噪：它會把短母音弄糊，語音辨識把 pig 聽成 peg、bed 聽成 bad（phonics 題不能有這種事）。
# 再加 20 ms 淡入、80 ms 淡出，字和靜音之間不會「沙—停」。b／p／d／t 的爆破音遠高於 -42 dB，不會被剪到。
CLEAN = ("silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.06,afade=t=in:d=0.02,"
         "areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.12,afade=t=in:d=0.08,areverse")
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def ff(*a):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *a], check=True)


def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]))


def questions():
    """{題號: 唸的字}"""
    q = {}
    for n, (_loc, words, bword) in enumerate(LISTEN, 1):
        q[f"L{n}a"] = words[0]
        q[f"L{n}b"] = bword
    return q


def tts(word, key, ledger, lp):
    target = RAW / f"{word}.wav"
    if target.exists():
        return
    payload = {"model": MODEL, "input": [{"type": "user_input", "content": [
        {"type": "text", "text": word, "annotations": [{"type": "speech_metadata", "style": STYLE_WORD}]}]}],
        "response_format": {"type": "audio"}, "generation_config": {"speech_config": [{"voice": VOICE}]}}
    for attempt in range(1, 4):
        spent = sum(c["liability_usd"] for c in ledger["calls"])
        if spent + 0.05 > LIMIT:
            raise RuntimeError("Budget cap reached")
        call = {"word": word, "attempt": attempt, "liability_usd": 0.05, "time": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        ledger["calls"].append(call)
        try:
            req = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(), method="POST",
                                         headers={"Content-Type": "application/json", "x-goog-api-key": key})
            with urllib.request.urlopen(req, timeout=110) as r:
                res = json.load(r)
            usage = res.get("usage") or {}
            if usage:
                ti = usage.get("total_input_tokens", 0)
                to = usage.get("total_output_tokens", 0)
                call["liability_usd"] = round(ti * 0.5e-6 + to * 9e-6, 6)
                call["usage"] = {"input": ti, "output": to}
            blocks = [p for s in res.get("steps", []) if s.get("type") == "model_output"
                      for p in s.get("content", []) if p.get("type") == "audio" and p.get("data")]
            if not blocks:
                raise RuntimeError("no audio in response")
            # 回傳的已經是完整 WAV（含檔頭與結尾的 AI 生成標記），直接存；不要再包一層 WAV 檔頭，
            # 否則檔頭和標記會被當成聲音，變成開頭與結尾的爆音（2026-11-09 教師發現）
            target.write_bytes(base64.b64decode(blocks[-1]["data"]))
            with wave.open(str(target), "rb") as wf:
                assert wf.getnchannels() == 1 and wf.getsampwidth() == 2, "unexpected wav format"
            call["status"] = "complete"
            call["sha256"] = sha(target)
            lp.write_text(json.dumps(ledger, ensure_ascii=False, indent=2), encoding="utf-8")
            return
        except (urllib.error.URLError, RuntimeError, KeyError, ValueError) as e:
            call["status"] = f"failed: {type(e).__name__}"
            lp.write_text(json.dumps(ledger, ensure_ascii=False, indent=2), encoding="utf-8")
            time.sleep(3 * attempt)
    raise RuntimeError(f"TTS failed: {word}")


def main():
    key = os.environ.get("GEMINI_API_KEY")
    assert key, "GEMINI_API_KEY unavailable"
    q = questions()
    words = sorted(set(q.values()))
    lp = W / "budget-ledger.json"
    ledger = json.loads(lp.read_text(encoding="utf-8")) if lp.exists() else {"limit_usd": LIMIT, "calls": []}
    for w in words:
        tts(w, key, ledger, lp)
    for w in words:
        ff("-i", str(RAW / f"{w}.wav"), "-af", f"{TRIM},atempo={RATE},loudnorm=I=-18:TP=-2:LRA=7,aresample={SR},{CLEAN}", "-ac", "1", str(WORK / f"{w}.wav"))
    report = {"rate": RATE, "voice": VOICE, "model": MODEL, "questions": {}}
    for qid, w in q.items():
        seq = [LEAD, w, GAP, w, TAIL]
        inputs, labels = [], []
        for k, s in enumerate(seq):
            if isinstance(s, float):
                inputs += ["-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono:d={s}"]
            else:
                inputs += ["-i", str(WORK / f"{s}.wav")]
            labels.append(f"[{k}:a]")
        mp3 = OUT / f"{qid}.mp3"
        ff(*inputs, "-filter_complex", "".join(labels) + f"concat=n={len(seq)}:v=0:a=1[o]", "-map", "[o]",
           "-c:a", "libmp3lame", "-b:a", "128k", str(mp3))
        # 慢速版（教師 2026-11-11 RDQ ④「慢速再聽一次」）：整段 0.7 倍、音高不變。
        # 本來想在遊戲裡即時變速（音效匯流排＋PitchShift），但網頁版 Godot 在執行中新增匯流排會讓
        # 全部聲音都不播放（教師 iPad 實測），所以改成事先做好的檔案。
        slow = OUT / f"{qid}_slow.mp3"
        ff("-i", str(mp3), "-af", "atempo=0.7", "-c:a", "libmp3lame", "-b:a", "128k", str(slow))
        report["questions"][qid] = {"word": w, "seconds": round(dur(mp3), 2), "sha256": sha(mp3),
                                    "slow_seconds": round(dur(slow), 2)}
    # 語音辨識核對（只核對 0.8 倍速的單字）
    import numpy as np
    from faster_whisper import WhisperModel
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    ok = 0
    for w in words:
        b = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(WORK / f"{w}.wav"), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"])
        a = np.frombuffer(b, np.int16).astype(np.float32) / 32768
        segs, _ = m.transcribe(a, language="en", beam_size=5)
        heard = " ".join(s.text.strip() for s in segs)
        match = heard.lower().strip(" .!?") == w
        ok += match
        report.setdefault("asr", {})[w] = {"heard": heard, "match": match}
        print(f"{w:6} heard={heard!r} {'OK' if match else 'CHECK'}")
    spent = sum(c["liability_usd"] for c in ledger["calls"])
    report["spent_usd"] = round(spent, 4)
    (W / "assembly-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"ASR {ok}/{len(words)} words match; {len(q)} question MP3 -> {OUT}; spent about US${spent:.3f}")


if __name__ == "__main__":
    main()
