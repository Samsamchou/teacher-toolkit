"""make_rain.py：程式合成 20 秒雨聲（粉紅雜訊＋帶通＋隨機雨滴），免費、可重現。"""
import sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
sr, dur = 48000, 20.0
rng = np.random.default_rng(7)
n = int(sr * dur)
w = rng.standard_normal(n)
f = np.fft.rfft(w); fr = np.fft.rfftfreq(n, 1 / sr); f[1:] /= np.sqrt(fr[1:]); pink = np.fft.irfft(f, n)
sos = butter(4, [400, 7000], btype="band", fs=sr, output="sos")
rain = sosfilt(sos, pink); rain /= np.max(np.abs(rain))
drops = np.zeros(n)
for t in rng.uniform(0, dur, 900):
    i = int(t * sr); L = int(sr * 0.012)
    if i + L < n: drops[i:i + L] += rng.uniform(0.2, 0.6) * np.exp(-np.linspace(0, 8, L)) * rng.standard_normal(L)
drops = sosfilt(butter(2, 2500, btype="high", fs=sr, output="sos"), drops)
out = 0.6 * rain + 0.4 * drops / (np.max(np.abs(drops)) + 1e-9)
fade = int(sr * 0.5); out[:fade] *= np.linspace(0, 1, fade); out[-fade:] *= np.linspace(1, 0, fade)
sf.write(sys.argv[1], (out / np.max(np.abs(out)) * 0.7).astype(np.float32), sr)
print("saved", sys.argv[1])
