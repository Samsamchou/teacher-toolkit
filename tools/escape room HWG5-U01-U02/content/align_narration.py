# -*- coding: utf-8 -*-
"""Estimate word timings for a narration MP3 (free, local, no API).

How: ffmpeg silencedetect finds the real pauses; a small dynamic program matches each pause to
the most likely word boundary (punctuation preferred); words inside each speech stretch are then
spread by syllable count. Sentence edges are therefore exact, word edges approximate.

  python -I align_narration.py SEG-01        -> assets/audio/narration/SEG-01.timing.json
"""
import json, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUDIO = HERE.parent / "assets" / "audio" / "narration"
BANK = HERE / "question-bank.v0.1.json"
NOISE, MIN_SIL = "-38dB", 0.18
NON_PUNCT_PENALTY = 4.0  # seconds² — discourages a pause between words with no punctuation


def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and not w.endswith(("le", "ee")) and n > 1:
        n -= 1
    return max(1, n)


def detect(mp3):
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
                               capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout)
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp3), "-af",
                          f"silencedetect=noise={NOISE}:d={MIN_SIL}", "-f", "null", "-"],
                         capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    sil = list(zip(starts, ends + [dur] * (len(starts) - len(ends))))
    lead = sil[0][1] if sil and sil[0][0] <= 0.05 else 0.0
    tail = sil[-1][0] if sil and sil[-1][1] >= dur - 0.05 else dur
    gaps = [(s, e) for s, e in sil if s > lead + 0.01 and e < tail - 0.01]
    return dur, lead, tail, gaps


def align(lines, mp3):
    words = []  # (text, lineIndex)
    for li, line in enumerate(lines):
        for w in line.split():
            words.append((w, li))
    weight = [syllables(w) + 0.15 for w, _ in words]
    punct = [bool(re.search(r"[.,!?;:]\W*$", w)) for w, _ in words]
    dur, lead, tail, gaps = detect(mp3)
    N, P = len(words), len(gaps)
    speech_edges = [lead] + [x for g in gaps for x in g] + [tail]
    regions = [(speech_edges[2 * i], speech_edges[2 * i + 1]) for i in range(P + 1)]
    total_speech = sum(e - s for s, e in regions)
    rate = total_speech / sum(weight)
    cum = [0.0]
    for x in weight:
        cum.append(cum[-1] + x)

    # dp[p][b]: best cost when pause p sits after word b (b = 1..N-1)
    INF = float("inf")
    dp = [[INF] * (N + 1) for _ in range(P + 1)]
    back = [[0] * (N + 1) for _ in range(P + 1)]
    dp[0][0] = 0.0
    for p in range(1, P + 1):
        rs, re_ = regions[p - 1]
        for b in range(p, N - (P - p)):
            pen = 0.0 if punct[b - 1] else NON_PUNCT_PENALTY
            for a in range(p - 1, b):
                if dp[p - 1][a] == INF:
                    continue
                c = dp[p - 1][a] + ((cum[b] - cum[a]) * rate - (re_ - rs)) ** 2 + pen
                if c < dp[p][b]:
                    dp[p][b], back[p][b] = c, a
    best, cost = None, INF
    rs, re_ = regions[P]
    for b in range(P, N):
        if dp[P][b] == INF:
            continue
        c = dp[P][b] + ((cum[N] - cum[b]) * rate - (re_ - rs)) ** 2
        if c < cost:
            best, cost = b, c
    cuts = [N]
    b = best
    for p in range(P, 0, -1):
        cuts.append(b)
        b = back[p][b]
    cuts.append(0)
    cuts = cuts[::-1]  # word index boundaries per region

    out = []
    for r, (s, e) in enumerate(regions):
        a, b = cuts[r], cuts[r + 1]
        span = cum[b] - cum[a] or 1
        t = s
        for i in range(a, b):
            d = (e - s) * weight[i] / span
            out.append(dict(w=words[i][0], line=words[i][1], s=round(t, 3), e=round(t + d, 3)))
            t += d
    return dict(duration=round(dur, 3), pauses=P, method="silencedetect+dp (approximate word edges)",
                fitCost=round(cost, 3), words=out)


if __name__ == "__main__":
    seg = sys.argv[1] if len(sys.argv) > 1 else "SEG-01"
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    lines = bank["story"][seg]["lines"]
    timing = align(lines, AUDIO / f"{seg}.mp3")
    timing["segment"] = seg
    (AUDIO / f"{seg}.timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{seg}: {len(timing['words'])} words, {timing['pauses']} pauses, fit {timing['fitCost']}")
    for li in range(len(lines)):
        ws = [w for w in timing["words"] if w["line"] == li]
        print(f"  {ws[0]['s']:6.2f}-{ws[-1]['e']:6.2f}  {lines[li]}")
