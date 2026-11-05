"""畫風 H 試片音效（全程式合成）/ procedural SFX for the H pilot."""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
SR = 48000; N = SR * 10; rng = np.random.default_rng(11); mix = np.zeros(N)
def ta(d): return np.arange(int(SR * d)) / SR
def place(sig, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig)); mix[i:j] += sig[: j - i] * g
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)
def lp(x, fc): return sosfilt(butter(2, fc, btype="low", fs=SR, output="sos"), x)
def env(n, a, r):
    e = np.ones(n); A, R = int(a * SR), int(r * SR)
    if A: e[:A] = np.linspace(0, 1, A)
    if R: e[-R:] *= np.linspace(1, 0, R)
    return e
# 夜晚房間：低低的嗡聲＋窗外遠方車聲 / night room tone
tt = ta(10); room = lp(rng.standard_normal(N), 250) * 0.6 + 0.15 * np.sin(2 * np.pi * 60 * tt)
place(room * env(N, 0.6, 0.6), 0, 0.05)
# 姿勢切換「喀」（定格感）/ pose-change clicks
def click():
    t = ta(0.05); return bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 120)
for at in (1.0, 2.4, 4.9, 5.8, 8.9): place(click(), at, 0.5)
# 玩具發條馬達 / toy wind-up motor whirr
def motor(d, f0, f1, a):
    t = ta(d); f = np.interp(t, [0, d], [f0, f1]); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * 0.3 + np.sin(2 * ph) * 0.5 + 0.2 * bp(rng.standard_normal(len(t)), 800, 3000)
    am = np.interp(t, [0, d * 0.25, d * 0.75, d], a); return lp(s, 2500) * am
place(motor(2.1, 95, 55, [0.1, 1, 0.8, 0]), 3.0, 0.22)
place(motor(1.9, 60, 90, [0, 0.8, 1, 0]), 6.95, 0.18)
# 塑膠輪子在紙上滾 / wheels rolling on paper
for at, d in ((3.0, 2.0), (7.0, 1.8)):
    n = int(SR * d); place(bp(rng.standard_normal(n), 2000, 7000) * env(n, 0.3, 0.5), at, 0.03)
# 小煞車吱 / tiny brake squeak
for at in (4.95, 8.75):
    t = ta(0.25); place(np.sin(2 * np.pi * np.interp(t, [0, 0.25], [2400, 2100]) * t) * np.exp(-t * 10), at, 0.07)
# 車門叮咚 / bus door ding-dong
for at, fr in ((5.25, 988), (5.5, 784)):
    t = ta(0.7); place((np.sin(2 * np.pi * fr * t) + 0.3 * np.sin(2 * np.pi * fr * 2.01 * t)) * np.exp(-t * 5), at, 0.14)
# 轉場「咻」/ cut whoosh
n = int(SR * 0.5); t = ta(0.5); place(bp(rng.standard_normal(n), 400, 3000) * np.exp(-((t - 0.25) / 0.1) ** 2), 6.25, 0.25)
# 字幕出現「叮」/ subtitle pop
t = ta(0.15); f = np.linspace(600, 1200, len(t)); place(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 25), 6.8, 0.25)
# 結尾鈴聲（學校）/ end chime
t = ta(1.3); place(sum(np.sin(2 * np.pi * fr * t) * np.exp(-t * 3) for fr in (1046.5, 1318.5, 1568.0)), 8.95, 0.1)
mix = mix / max(1e-9, np.abs(mix).max()) * 0.8
wavfile.write(sys.argv[1], SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16)); print("wrote", sys.argv[1])
