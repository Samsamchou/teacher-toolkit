"""鋼琴內部鏡頭（3D-5）的合成鋼琴：Für Elise 開頭 12 個音，和 b3d_vienna.py 的 SEQ 一一對應。
每個音 7 格，琴槌在按鍵後第 2 格碰到琴弦 → 音符起點 = (i*7 + 2)/30 秒。
python src/piano_synth.py → audio/music/fur_elise_s5.wav（24 kHz 單聲道，3.6 秒含尾音）"""
import os, numpy as np, soundfile as sf
SR, FPS = 24000, 30
NOTES = [659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 440.00, 261.63, 329.63, 440.00]
ONSETS = [(i*7 + 2)/FPS for i in range(len(NOTES))]


def tone(f, dur=1.6):
    t = np.arange(int(dur*SR))/SR; y = np.zeros_like(t)
    for k, amp in enumerate((1.0, 0.55, 0.28, 0.16, 0.08, 0.05), 1):
        fk = f*k*(1 + 0.0004*k*k)                                  # 琴弦泛音略微偏高
        if fk < SR/2: y += amp*np.sin(2*np.pi*fk*t)*np.exp(-t*(2.2 + 1.3*k))
    att = np.minimum(1.0, t/0.006)                                 # 6 ms 起音
    thump = 0.25*np.exp(-t*90)*np.sin(2*np.pi*180*t)               # 琴槌敲擊聲
    return (y*att + thump).astype(np.float32)


def render():
    n = int((ONSETS[-1] + 1.8)*SR); out = np.zeros(n, np.float32)
    for f, t0 in zip(NOTES, ONSETS):
        y = tone(f); s = int(t0*SR); out[s:s + len(y)] += y[:n - s]
    out *= 0.7/np.abs(out).max(); out[-int(0.3*SR):] *= np.linspace(1, 0, int(0.3*SR))
    return out


if __name__ == '__main__':
    od = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio', 'music'); os.makedirs(od, exist_ok=True)
    a = render(); sf.write(os.path.join(od, 'fur_elise_s5.wav'), a, SR); print('ok', round(len(a)/SR, 2), 's', [round(t, 3) for t in ONSETS])
