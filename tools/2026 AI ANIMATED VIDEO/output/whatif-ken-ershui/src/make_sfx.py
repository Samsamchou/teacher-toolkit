"""make_sfx.py：程式合成音效（免費、可重現）＋從遊戲環境音剪出每個地點 2.6 秒的線索聲。
用法（專案根目錄）：python src/make_sfx.py
- sfx/clue_<地點>.mp3：遊戲 18 秒環境音裡「最響的 2.6 秒」（重點聲音），前後淡入淡出。
- sfx/pop.wav、whoosh.wav、wind.wav。
"""
import subprocess, tempfile, pathlib
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parents[1]; S = ROOT / "sfx"; SR = 48000
rng = np.random.default_rng(11)


def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.8; sf.write(S / name, x.astype(np.float32), SR); print("saved", name)


# pop：上滑的短音＋點擊
t = np.linspace(0, 0.14, int(SR * 0.14), endpoint=False)
f = 520 + 900 * t / 0.14
save("pop.wav", np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28))
# whoosh：帶通雜訊，頻率掃上再下
n = int(SR * 0.9); w = rng.standard_normal(n); env = np.sin(np.linspace(0, np.pi, n)) ** 2
out = np.zeros(n)
for i, c in enumerate(np.linspace(400, 2400, 9)):
    seg = slice(i * n // 9, (i + 1) * n // 9 + 2000)
    out[seg] += sosfilt(butter(2, [c * 0.7, c * 1.3], btype="band", fs=SR, output="sos"), w[seg])[: len(out[seg])]
save("whoosh.wav", out * env)
# wind：低通雜訊＋慢速起伏
n = SR * 12; w = sosfilt(butter(2, [150, 900], btype="band", fs=SR, output="sos"), rng.standard_normal(n))
lfo = 0.55 + 0.45 * np.sin(np.linspace(0, 12 * 2 * np.pi / 3.1, n)) * np.sin(np.linspace(0, 12 * 2 * np.pi / 7.3, n))
fade = np.ones(n); k = SR // 2; fade[:k] = np.linspace(0, 1, k); fade[-k:] = np.linspace(1, 0, k)
save("wind.wav", w * lfo * fade)

# 線索聲：每個地點最響的 2.6 秒
for amb in sorted(S.glob("amb_*.mp3")):
    place = amb.stem[4:]
    with tempfile.TemporaryDirectory() as td:
        wav = pathlib.Path(td) / "a.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(amb), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
        a, _ = sf.read(wav)
    win, hop = int(SR * 2.6), SR // 10
    best = max(range(0, max(1, len(a) - win), hop), key=lambda i: float(np.mean(a[i:i + win] ** 2)))
    st = best / SR
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{st:.2f}", "-t", "2.6", "-i", str(amb),
                    "-af", "afade=t=in:d=0.15,afade=t=out:st=2.2:d=0.4", str(S / f"clue_{place}.mp3")], check=True)
    print(f"clue_{place}.mp3 from {st:.1f}s")
