"""build_voice.py — 把某場景的 TTS 句子依 lines.json 的 at（秒）排上時間軸，輸出：
  1. tts/<scene>-voice.wav：整段配音（48 kHz mono，長度 = 場景長度）
  2. scenes/<scene>.voice.js：VOICE = {fps, env[], cues[]}；env 為 60 Hz 口型開合 0–1（RMS 包絡，正規化＋平滑），
     cues 為依實測秒數產生的字幕時碼。只用標準函式庫（wave/array），不需 numpy。
用法: python -I build_voice.py s01-taiwan-car --dur 7.0
"""
import argparse, array, json, math, pathlib, subprocess, wave

ap = argparse.ArgumentParser(); ap.add_argument('scene'); ap.add_argument('--dur', type=float, required=True); ap.add_argument('--fps', type=int, default=60)
a = ap.parse_args()
root = pathlib.Path(__file__).resolve().parent
cfg = json.loads((root / 'lines.json').read_text(encoding='utf-8'))
lines = [l for l in cfg['lines'] if l['scene'] == a.scene]
SR = 24000
n = int(a.dur * SR); mix = [0.0] * n; cues = []
for l in lines:
    with wave.open(str(root / 'wav' / f"{l['id']}.wav")) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2, 'expect 24 kHz mono 16-bit'
        s = array.array('h', w.readframes(w.getnframes()))
    o = int(l['at'] * SR)
    if o + len(s) > n: raise SystemExit(f"{l['id']} 超出場景長度：{l['at'] + len(s) / SR:.2f}s > {a.dur}s")
    for i, v in enumerate(s): mix[o + i] += v
    cues.append([round(l['at'], 3), round(l['at'] + len(s) / SR, 3), l['text']])
# 口型包絡：每格 RMS → dB 門檻 → 0–1 → 攻擊快／釋放慢平滑
hop = SR // a.fps; env = []
for f in range(math.ceil(n / hop)):
    seg = mix[f * hop:(f + 1) * hop]
    rms = math.sqrt(sum(x * x for x in seg) / max(1, len(seg))) / 32768
    db = 20 * math.log10(rms + 1e-9)
    env.append(min(1.0, max(0.0, (db + 30) / 20)) ** 1.5)   # -30 dB 閉口、-10 dB 全開；指數讓音節間更明顯閉合
sm, prev = [], 0.0
for v in env:
    prev = prev + (v - prev) * (0.8 if v > prev else 0.5); sm.append(round(prev, 3))
# 輸出配音 wav（先 24k，再交 ffmpeg 轉 48k）
tmp = root / f'{a.scene}-voice-24k.wav'
with wave.open(str(tmp), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(array.array('h', (max(-32768, min(32767, int(x))) for x in mix)).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-ar', '48000', str(root / f'{a.scene}-voice.wav')], check=True); tmp.unlink()
js = root.parent / 'scenes' / f'{a.scene}.voice.js'
js.write_text('// 自動產生 by tts/build_voice.py — 勿手改 / generated\nconst VOICE = ' + json.dumps({'fps': a.fps, 'env': sm, 'cues': cues}, ensure_ascii=False) + ';\n', encoding='utf-8')
print(js.name, len(sm), 'frames;', 'cues', cues)
