"""Generate voice lines (edge-tts) and synthesized SFX / music loop.
Usage: python tools/make_audio.py [--voice-only|--sfx-only]
Voice lines are made for every clock_rounds[].time found in data/*.json."""
import asyncio, json, os, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
VOICE = "en-US-AnaNeural"
ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen "
        "fourteen fifteen sixteen seventeen eighteen nineteen").split()
TENS = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty"}


def time_words(hhmm):
    h, m = int(hhmm[:2]), int(hhmm[2:])
    hw = ONES[h]
    if m == 0:
        return hw + " o'clock"
    if m < 10:
        return hw + " oh " + ONES[m]
    if m < 20:
        return hw + " " + ONES[m]
    t, o = divmod(m, 10)
    return hw + " " + TENS[t] + ("-" + ONES[o] if o else "")


async def voices():
    import edge_tts
    times = set()
    for f in os.listdir(os.path.join(ROOT, "data")):
        if f.endswith(".json") and f != "rules.json":
            cfg = json.load(open(os.path.join(ROOT, "data", f), encoding="utf-8"))
            for r in cfg["clock_rounds"]:
                times.add(r["time"].replace(":", "").zfill(4))
            for t in cfg.get("review_times", []):      # times of the stations visited earlier
                times.add(t.replace(":", "").zfill(4))
    for t in sorted(times):
        if os.path.exists(os.path.join(ROOT, "audio", "times", t + ".mp3")) and "--all" not in sys.argv:
            continue
        text = "It's " + time_words(t) + "."
        out = os.path.join(ROOT, "audio", "times", t + ".mp3")
        tmp = out + ".raw.mp3"
        await edge_tts.Communicate(text, VOICE, rate="-12%").save(tmp)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af",
                        "loudnorm=I=-15:TP=-1.5,apad=pad_dur=0.15", "-ac", "1", "-ar", "44100",
                        "-b:a", "96k", out], check=True)
        os.remove(tmp)
        print(t, text)


def save(name, x, vol=0.8):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * vol
    path = os.path.join(ROOT, "audio", "sfx", name + ".wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    return path


def env(n, a=0.005, r=0.08):
    e = np.ones(n)
    na = max(1, min(n, int(a * SR)))
    nr = max(1, min(n, int(r * SR)))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def tone(f, d, kind="sine", a=0.005, r=0.08):
    n = int(d * SR)
    t = np.arange(n) / SR
    if np.isscalar(f):
        f = np.full(n, float(f))
    else:
        f = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(f)), f)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "square":
        y = np.sign(np.sin(ph)) * 0.6
    elif kind == "tri":
        y = 2 / np.pi * np.arcsin(np.sin(ph))
    elif kind == "bell":
        y = np.sin(ph) + 0.5 * np.sin(2 * ph) * np.exp(-t * 8) + 0.25 * np.sin(3.01 * ph) * np.exp(-t * 12)
    else:
        y = np.sin(ph)
    return y * env(n, a, min(r, d * 0.6))


def seq(notes, kind="bell", gap=0.0):
    out = []
    for f, d in notes:
        out.append(tone(f, d, kind) * np.exp(-np.arange(int(d * SR)) / SR * 3))
        if gap:
            out.append(np.zeros(int(gap * SR)))
    return np.concatenate(out)


def N(semis):
    return 440.0 * 2 ** (semis / 12.0)   # semitones from A4


C5, D5, E5, G5, A5, C6, E6, G6 = N(3), N(5), N(7), N(10), N(12), N(15), N(19), N(22)


def sfx():
    rng = np.random.default_rng(7)
    save("catch", tone([700, 1250], 0.11, "tri"), 0.7)
    save("catch2", seq([(E5, 0.06), (A5, 0.10)], "bell"), 0.7)
    nb = int(0.30 * SR)
    save("bad", tone([220, 90], 0.30, "square", r=0.15) + 0.4 * rng.standard_normal(nb) * env(nb, 0.002, 0.2), 0.7)
    save("miss", tone([420, 180], 0.22, "sine", r=0.12), 0.5)
    save("combo", seq([(C5, 0.06), (E5, 0.06), (G5, 0.06), (C6, 0.16)], "bell"), 0.7)
    save("clock_in", seq([(G5, 0.12), (C6, 0.12), (G5, 0.12), (C6, 0.25)], "bell", 0.02), 0.7)
    save("clock_ok", seq([(C5, 0.09), (E5, 0.09), (G5, 0.09), (C6, 0.09), (E6, 0.09), (G6, 0.35)], "bell"), 0.8)
    save("clock_bad", seq([(N(-2), 0.18), (N(-6), 0.18), (N(-9), 0.4)], "square"), 0.55)
    save("start", seq([(G5, 0.1), (C6, 0.1), (E6, 0.25)], "bell"), 0.7)
    save("tick", tone(1500, 0.04, "sine", r=0.03), 0.4)
    save("win", seq([(C5, 0.14), (E5, 0.14), (G5, 0.14), (C6, 0.28), (G5, 0.14), (C6, 0.5)], "bell"), 0.8)
    save("star", seq([(E6, 0.07), (G6, 0.22)], "bell"), 0.7)
    save("lose", seq([(N(0), 0.2), (N(-2), 0.2), (N(-4), 0.2), (N(-7), 0.5)], "tri"), 0.6)


def music():
    """Original 8-bar bouncy loop, 132 BPM (self-composed, no third-party audio)."""
    bpm = 132
    beat = 60 / bpm
    bars = 8
    n = int(bars * 4 * beat * SR)
    mix = np.zeros(n + SR)

    def put(y, t0, g=1.0):
        i = int(t0 * SR)
        j = min(len(mix), i + len(y))
        mix[i:j] += y[:j - i] * g

    chords = [(-9, -5, -2), (-4, 0, 3), (-7, -4, 0), (-2, 2, 5)] * 2
    bass = [-21, -16, -19, -14] * 2
    mel = [[3, 7, 10, 7, 12, 10, 7, 3], [8, 12, 15, 12, 8, 12, 10, 8],
           [5, 8, 12, 8, 15, 12, 8, 5], [10, 14, 17, 14, 10, 7, 5, 2],
           [3, 7, 10, 15, 12, 10, 7, 10], [8, 12, 15, 20, 15, 12, 10, 8],
           [5, 8, 12, 17, 15, 12, 8, 5], [10, 14, 10, 7, 5, 2, 3, 3]]
    rng = np.random.default_rng(3)
    for b in range(bars):
        t0 = b * 4 * beat
        for k in range(4):
            put(tone(N(bass[b] + (12 if k % 2 else 0)), beat * 0.9, "tri", r=0.1), t0 + k * beat, 0.5)
        for k in (1, 3):
            for s in chords[b]:
                put(tone(N(s), beat * 0.45, "square", r=0.1), t0 + k * beat, 0.07)
        for k, s in enumerate(mel[b]):
            d = beat * 0.5
            m = int(d * 0.95 * SR)
            put(tone(N(s), d * 0.95, "bell", r=0.08) * np.exp(-np.arange(m) / SR * 4), t0 + k * d, 0.32)
        for k in range(8):
            m = int(0.04 * SR)
            put(rng.standard_normal(m) * np.exp(-np.arange(m) / SR * 90), t0 + k * beat / 2, 0.05 if k % 2 else 0.09)
        for k in (0, 2):
            put(tone([150, 45], 0.14, "sine", r=0.1), t0 + k * beat, 0.6)
    mix[:SR] += mix[n:n + SR]
    p = save("_music", mix[:n], 0.5)
    out = os.path.join(ROOT, "audio", "music_loop.ogg")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", p, "-c:a", "libvorbis", "-q:a", "3", out], check=True)
    os.remove(p)


if __name__ == "__main__":
    if "--sfx-only" not in sys.argv:
        asyncio.run(voices())
    if "--voice-only" not in sys.argv:
        sfx()
        music()
    print("audio done")
