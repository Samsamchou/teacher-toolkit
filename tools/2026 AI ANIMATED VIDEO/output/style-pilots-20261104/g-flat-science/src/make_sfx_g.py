"""畫風 G 試片音效（全程式合成，可重現）/ procedural SFX for the G pilot."""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 10.0
rng = np.random.default_rng(7)
N = int(SR * DUR)
mix = np.zeros(N)

def t_arr(d): return np.arange(int(SR * d)) / SR
def place(sig, at, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig)); mix[i:j] += sig[: j - i] * gain
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)
def env(n, a, r):
    e = np.ones(n); A = int(a * SR); R = int(r * SR)
    if A: e[:A] = np.linspace(0, 1, A)
    if R: e[-R:] *= np.linspace(1, 0, R)
    return e

# 清晨風聲＋蟲鳴（0–6.8 s 淡出）/ dawn wind + crickets
d = 7.0; n = int(SR * d)
wind = lp(rng.standard_normal(n), 400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t_arr(d)))
place(wind * env(n, 1.0, 1.2), 0, 0.10)
tt = t_arr(d); chirp = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 28 * tt) > 0.6) * (np.sin(2 * np.pi * 0.9 * tt) > 0.2)
place(chirp * env(n, 0.8, 1.0), 0, 0.025)

def blip(f0=700, f1=1300, d=0.12):
    tt = t_arr(d); f = np.linspace(f0, f1, len(tt)); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 28)

# 標籤彈出 / label pops
place(blip(), 1.2, 0.35); place(blip(), 5.4, 0.35); place(blip(), 8.0, 0.35)

# 公車引擎：靠近變大聲、減速降音 / bus engine approaching then slowing
d = 2.6; tt = t_arr(d); n = len(tt)
f = np.interp(tt, [0, 1.7, 2.6], [62, 44, 40]); ph = 2 * np.pi * np.cumsum(f) / SR
eng = sum(np.sin(k * ph) / k for k in range(1, 7)) + 0.4 * lp(rng.standard_normal(n), 300)
amp = np.interp(tt, [0, 1.2, 1.7, 2.6], [0.05, 0.9, 0.6, 0.0])
place(lp(eng, 900) * amp, 3.4, 0.32)
# 輪胎滾動沙沙 / tyre roll
roll = bp(rng.standard_normal(int(SR * 1.7)), 600, 2500) * np.interp(t_arr(1.7), [0, 1.0, 1.7], [0.2, 1, 0])
place(roll, 3.5, 0.05)
# 煞車氣閥 psssh / air brake
d = 0.7; n = int(SR * d)
place(bp(rng.standard_normal(n), 2500, 9000) * np.exp(-t_arr(d) * 5) * env(n, 0.02, 0.1), 5.2, 0.22)
# 車門叮咚 / door ding-dong
for at, fr in [(5.65, 988), (5.9, 784)]:
    tt = t_arr(0.8); place((np.sin(2 * np.pi * fr * tt) + 0.3 * np.sin(2 * np.pi * fr * 2.01 * tt)) * np.exp(-tt * 5), at, 0.18)
# 轉場咻 / whoosh
d = 0.9; n = int(SR * d); tt = t_arr(d)
noise = rng.standard_normal(n); w = np.zeros(n)
for k, (lo, hi) in enumerate([(300, 900), (700, 2000), (1500, 4000), (3000, 8000)]):
    seg = bp(noise, lo, hi) * np.exp(-((tt - (0.15 + k * 0.17)) / 0.14) ** 2); w += seg
place(w, 6.25, 0.5)
# 地圖小公車嗡嗡 / tiny map bus putter
d = 2.4; tt = t_arr(d); put = np.sin(2 * np.pi * 110 * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * tt)) * env(len(tt), 0.3, 0.4)
place(lp(put, 600), 7.0, 0.06)
# 逐字彈出 / word pops (rising pitch)
for i in range(6): place(blip(500 + i * 90, 900 + i * 120, 0.1), 7.4 + i * 0.18, 0.3)
# 結尾鈴聲（大三和弦）/ end chime
tt = t_arr(1.4)
chime = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3) for f in (1046.5, 1318.5, 1568.0))
place(chime, 8.5, 0.12)

mix = mix / max(1e-9, np.abs(mix).max()) * 0.8
wavfile.write(sys.argv[1], SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
print("wrote", sys.argv[1])
