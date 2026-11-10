"""倒數嗶聲（每秒一次）＋答案「叮」。輸出 16 秒 WAV。python make_sfx.py <act秒> <輸出.wav>"""
import sys, numpy as np, wave
SR = 48000
act = float(sys.argv[1]); out = sys.argv[2]; dur = act + 6
y = np.zeros(int(SR * dur))
def add(t0, sig):
    i = int(t0 * SR); y[i:i + len(sig)] += sig[:len(y) - i]
def tone(f, d, decay):
    t = np.arange(int(SR * d)) / SR
    env = np.exp(-t * decay) * np.minimum(1, t / 0.004)
    return np.sin(2 * np.pi * f * t) * env
for k in range(3):
    add(act + k, 0.45 * tone(880 if k < 2 else 988, 0.18, 18))
t = np.arange(int(SR * 1.6)) / SR
ding = (np.sin(2*np.pi*1318.5*t) + 0.55*np.sin(2*np.pi*1975.5*t) + 0.25*np.sin(2*np.pi*2637*t)) * np.exp(-t*3.2) * np.minimum(1, t/0.003)
add(act + 3, 0.32 * ding)
y = np.clip(y, -1, 1)
st = (np.stack([y, y], 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('sfx', out, dur)
