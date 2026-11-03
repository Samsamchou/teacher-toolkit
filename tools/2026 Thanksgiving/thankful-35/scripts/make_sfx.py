"""用程式合成的音效（不需要外部音效庫，沒有授權問題）。輸出 sfx/<name>.wav。"""
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 44100
rng = np.random.default_rng(7)


def env(n, a=0.005, r=0.3):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-t / r)
    return e


def tone(freqs, dur, r=0.3, kind="sine"):
    n = int(SR * dur); t = np.arange(n) / SR; out = np.zeros(n)
    for f in freqs:
        ph = 2 * np.pi * np.cumsum(f if np.ndim(f) else np.full(n, f)) / SR
        out += np.sin(ph) if kind == "sine" else np.sign(np.sin(ph)) * .3
    return out / len(freqs) * env(n, r=r)


def sweep(f0, f1, dur, r=0.2):
    n = int(SR * dur); f = np.geomspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, r=r)


def noise(dur, lo=None, hi=None, r=0.2):
    n = int(SR * dur); x = rng.standard_normal(n)
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1 / SR)
    if lo: X[fr < lo] = 0
    if hi: X[fr > hi] = 0
    return np.fft.irfft(X, n) / 3 * env(n, a=0.01, r=r)


def cat(*parts, gap=0.0):
    out = []
    for p in parts:
        out += [p, np.zeros(int(SR * gap))]
    return np.concatenate(out)


SFX = {
    "pop": sweep(300, 900, 0.12, r=0.05),
    "chime": cat(tone([1318], .5, .35), tone([1568], .5, .35), tone([2093], .9, .5), gap=-0.0)[: int(SR * 1.2)],
    "sparkle": sum(np.pad(tone([2000 + 400 * i], .25, .1), (int(SR * .06 * i), int(SR * .6)))[: int(SR * .6)] for i in range(5)),
    "whoosh": noise(.6, 400, 3000, r=.25) * np.sin(np.linspace(0, np.pi, int(SR * .6))),
    "sizzle": noise(2.5, 3000, 12000, r=3.0) * (0.6 + 0.4 * np.sin(np.linspace(0, 60, int(SR * 2.5)))) * .6,
    "heart": cat(tone([523, 659], .25, .2), tone([659, 784], .25, .2), tone([784, 1047], .6, .4)),
    "page": noise(.35, 800, 6000, r=.12),
    "ding": tone([1760, 2637], 1.0, .45),
    "boing": sweep(180, 520, .35, r=.25) * (1 + .5 * np.sin(np.linspace(0, 60, int(SR * .35)))),
    "yum": cat(tone([784], .15, .1), tone([988], .15, .1), tone([1175], .35, .2)),
    "bounce": cat(sweep(400, 200, .1, .05), sweep(500, 250, .1, .05), gap=.05),
}

if __name__ == "__main__":
    d = ROOT / "sfx"; d.mkdir(exist_ok=True)
    for name, x in SFX.items():
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
        pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
        with wave.open(str(d / f"{name}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        print(name, round(len(x) / SR, 2), "s")
