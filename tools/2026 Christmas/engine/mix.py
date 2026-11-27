"""mix.py — 依 timeline/sXX.json 把配音、程式合成配樂（公版〈Jingle Bells〉音樂盒）與音效混成 audio/mix/sXX.wav。
python -I mix.py s01 [--novoice]
配樂比人聲低 18 dB（老師 11/20 規則），整段固定增益到 −16 LUFS（ffmpeg ebur128 量測，不用 loudnorm）。"""
import json, pathlib, subprocess, sys, re
import numpy as np, soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parents[1]
SR = 48000
rng = np.random.default_rng(7)

def db(x): return 10 ** (x / 20)

# ---------- 音樂盒 / music box ----------
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def hz(n, octv): return 440 * 2 ** ((NOTE[n] + 12 * (octv - 4) - 9) / 12)
def bell(f, dur, amp=0.3):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 3.2) * np.minimum(1, t / 0.004)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 6) + 0.18 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 9)
    return amp * env * s
def pluck(f, dur, amp=0.18):
    t = np.arange(int(SR * dur)) / SR
    return amp * np.exp(-t * 4) * np.minimum(1, t / 0.01) * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t))

MEL = ('E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 E1 D1 D1 E1 D2 G2 '
       'E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 G1 G1 F1 D1 C4').split()
CHORDS = ['C', 'C', 'C', 'C', 'F', 'C', 'D', 'G', 'C', 'C', 'C', 'C', 'F', 'C', 'G', 'C']   # 每小節 4 拍 / one chord per bar
ROOTS = {'C': ('C', 3), 'F': ('F', 2), 'G': ('G', 2), 'D': ('D', 3)}

def musicbox(total, bpm=96):
    beat = 60 / bpm; out = np.zeros(int(SR * (total + 4)))
    loop = []; t = 0.0
    for tok in MEL:
        m = re.match(r'([A-G])([\d.]+)', tok); n, d = m.group(1), float(m.group(2))
        octv = 5 if n in 'CD' and loop and False else (5 if n == 'C' and t > 0 else 4)
        loop.append((t, hz(n, 5 if n in 'C' else 4) * (2 if n == 'C' else 1) / (2 if n == 'C' else 1), d)); t += d
    span = 64 * beat; k = 0
    while k * span < total + 1:
        for (bt, f, d) in loop:
            st = k * span + bt * beat; i = int(st * SR); s = bell(f * 2, max(1.2, d * beat * 1.6), 0.22)
            if i < len(out): out[i:i + len(s)] += s[:len(out) - i]
        for b, ch in enumerate(CHORDS):
            n, o = ROOTS[ch]; st = k * span + b * 4 * beat
            for h in (0, 2):
                i = int((st + h * beat) * SR); s = pluck(hz(n, o), beat * 1.8)
                if i < len(out): out[i:i + len(s)] += s[:len(out) - i]
        k += 1
    out = out[:int(SR * total)]
    fade = int(SR * 1.5); out[:fade] *= np.linspace(0, 1, fade); out[-fade:] *= np.linspace(1, 0, fade)
    return out

# ---------- 音效 / SFX ----------
def lowpass(x, k):
    c = np.cumsum(np.insert(x, 0, 0)); return (c[k:] - c[:-k]) / k
def sfx(kind, dur=None):
    if kind == 'wind':
        d = dur or 6; n = int(SR * d); x = lowpass(rng.standard_normal(n + 400), 400)
        t = np.arange(n) / SR; env = (0.6 + 0.4 * np.sin(t * 1.3) * np.sin(t * 0.37 + 1)) * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 1.0)
        return 6 * x[:n] * env
    if kind == 'whoosh':
        d = 0.9; n = int(SR * d); t = np.arange(n) / SR; x = rng.standard_normal(n + 200)
        y = lowpass(x, 30)[:n] - lowpass(x, 120)[:n]; return 2.5 * y * np.sin(np.pi * t / d) ** 2
    if kind == 'sparkle':
        out = np.zeros(int(SR * 1.4))
        for j, f in enumerate([1568, 2093, 2637, 3136, 4186]):
            s = bell(f, 1.0, 0.25); i = int(j * 0.07 * SR); out[i:i + len(s)] += s[:len(out) - i]
        return out
    if kind == 'ding':
        out = np.zeros(int(SR * 1.6))
        for j, f in enumerate([1046.5, 1318.5, 1568.0]):
            b = bell(f, 1.5, 0.3); i = int(j * 0.045 * SR); out[i:i + len(b)] += b[:len(out) - i]
        return out
    if kind == 'storm':
        d = dur or 4; n = int(SR * d); x = rng.standard_normal(n + 800)
        y = lowpass(x, 60)[:n] * 1.5 + lowpass(x, 600)[:n] * 8
        t = np.arange(n) / SR; env = np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8) * (0.7 + 0.3 * np.sin(t * 2.3))
        return y * env
    if kind == 'paper':
        d = 0.5; n = int(SR * d); out = np.zeros(n)
        for j in range(9):
            i = int(rng.uniform(0, d - 0.05) * SR); m = int(0.02 * SR); out[i:i + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (m / 4))
        return out - lowpass(np.pad(out, (0, 9)), 10)[:n]
    raise ValueError(kind)

def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])

def main(name, novoice=False):
    tl = json.load(open(ROOT / 'timeline' / f'{name}.json', encoding='utf-8'))
    man = {m['id']: m for m in json.load(open(ROOT / 'audio' / 'lines' / 'manifest.json', encoding='utf-8'))}
    n = int(SR * tl['dur']); voice = np.zeros(n); music = np.zeros(n); fx = np.zeros(n)
    for c in tl['cues']:
        a, sr = sf.read(ROOT / 'audio' / 'lines' / f"{c['id']}.wav"); assert sr == SR
        if a.ndim > 1: a = a.mean(1)
        i = int(c['start'] * SR); voice[i:i + len(a)] += a[:n - i]
    m = musicbox(tl['dur'])
    vr = np.sqrt(np.mean(voice[np.abs(voice) > 1e-3] ** 2)); mr = np.sqrt(np.mean(m ** 2)) + 1e-9
    music[:len(m)] = m * (vr / mr) * db(tl['music']['vol_db'])
    for b in tl.get('beats', []): tl.setdefault('sfx', []).append({'t': b['t'] + 0.15, 'type': 'ding', 'db': -16})
    for s in tl.get('sfx', []):
        y = sfx(s['type'], s.get('dur')); y = y / (np.sqrt(np.mean(y ** 2)) + 1e-9) * vr * db(s['db'] + 6)
        i = int(s['t'] * SR); fx[i:i + len(y)] += y[:n - i]
    mix = (0 if novoice else 1) * voice + music + fx
    out = ROOT / 'audio' / 'mix'; out.mkdir(parents=True, exist_ok=True)
    raw = out / f'{name}_raw.wav'; sf.write(raw, mix / max(1, np.abs(mix).max() / 0.9), SR)
    g = -16 - lufs(raw); final = out / f"{name}{'_novoice' if novoice else ''}.wav"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', f'volume={g + 0.6:.2f}dB,alimiter=limit=0.94:attack=3:release=60:level=false', '-ar', str(SR), str(final)], check=True); raw.unlink()
    print(final, 'gain', round(g, 1), 'dB, LUFS ->', round(lufs(final), 1))

if __name__ == '__main__':
    main(sys.argv[1], '--novoice' in sys.argv)
