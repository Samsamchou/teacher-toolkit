"""Word start/end times for every spoken line, for karaoke subtitles.
Run with a Python that has faster-whisper (e.g. the scratch venv):  <py> -I scripts/word_times.py
Reads shots.json; audio = voices_final/<id>.wav (lines), voices_final/<id>_narr.wav (narration),
(times are relative to the start of each wav). Writes work/word_times.json:
  {"S02": [{"w": "Wow!", "s": 0.12, "e": 0.40}, ...], "S01_narr": [...]}
The subtitle words always come from the script; dictation only supplies times. Script words that dictation
missed get times interpolated between their neighbours (or spread by length inside the speech span).
"""
import difflib, json, re, subprocess, sys
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
SR = 16000


def pcm(f, start=0.0):
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", f"{start}", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(out, np.int16).astype(np.float32) / 32768


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def align(script, heard, span):
    sw = script.split()
    hw = [h for h in heard if norm(h["w"])]
    res = [None] * len(sw)
    sm = difflib.SequenceMatcher(None, [norm(w) for w in sw], [norm(h["w"]) for h in hw], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            res[a + k] = (hw[b + k]["s"], hw[b + k]["e"])
    s0, e0 = span
    if all(r is None for r in res):  # nothing matched: spread by word length over the speech span
        L = np.cumsum([0] + [len(w) + 1 for w in sw]); L = L / L[-1]
        return [dict(w=w, s=round(s0 + (e0 - s0) * L[i], 3), e=round(s0 + (e0 - s0) * L[i + 1], 3)) for i, w in enumerate(sw)]
    for i in range(len(sw)):  # fill gaps between known neighbours
        if res[i] is None:
            prev = next((res[j][1] for j in range(i - 1, -1, -1) if res[j]), s0)
            nxt_i = next((j for j in range(i + 1, len(sw)) if res[j]), None)
            nxt = res[nxt_i][0] if nxt_i is not None else e0
            gap = [j for j in range(i, nxt_i if nxt_i is not None else len(sw)) if res[j] is None]
            step = max(nxt - prev, 0.1) / len(gap)
            for k, j in enumerate(gap):
                res[j] = (prev + k * step, prev + (k + 1) * step)
    return [dict(w=w, s=round(r[0], 3), e=round(r[1], 3)) for w, r in zip(sw, res)]


m = WhisperModel("small.en", device="cpu", compute_type="int8")
out = {}
for s in CFG["shots"]:
    items = []
    if s.get("narr"):
        items.append((s["id"] + "_narr", FILM / "voices_final" / f"{s['id']}_narr.wav", 0.0, s["narr"]))
    if s.get("line"):
        items.append((s["id"], FILM / "voices_final" / f"{s['id']}.wav", 0.0, s["line"]["text"]))
    for key, f, start, text in items:
        a = pcm(f, start)
        segs, _ = m.transcribe(a, language="en", word_timestamps=True, vad_filter=False, initial_prompt=text)
        heard = [dict(w=w.word.strip(), s=w.start, e=w.end) for sg in segs for w in (sg.words or [])]
        rms = np.convolve(np.abs(a), np.ones(160) / 160, mode="same")
        voiced = np.where(rms > 0.02)[0]
        span = (voiced[0] / SR, voiced[-1] / SR) if len(voiced) else (0.0, len(a) / SR)
        out[key] = align(text, heard, span)
        print(key, " ".join(f"{w['w']}@{w['s']:.2f}" for w in out[key]), flush=True)
(FILM / "work" / "word_times.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
