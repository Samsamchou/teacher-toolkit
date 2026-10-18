"""song_lipsync.py — 讓角色跟著「原曲」對嘴（不用 TTS）。
做法：
  1. 字詞時間：engine/song-data.js（正式字幕逐字，對到 faster-whisper 時碼；先跑 song_words.py）。
  2. 音量：ffmpeg 取原曲中央聲道（人聲多在中央）＋ 300–3000 Hz 帶通，算 60 Hz RMS。
  3. 嘴型 = 每個字的「開→合」弧線 × 該字內的人聲能量起伏；字與字之間閉嘴。圓唇字（o/u 音）給 round=1。
輸出 scenes/<scene>.lipsync.js：LIPSYNC = {fps, env[], round[], words:[[t0,t1,word]]}（時間為場景本地秒）。
用法: python -I song_lipsync.py s01-taiwan-car --start 14.83 --dur 7.0
"""
import argparse, array, json, math, pathlib, re, subprocess

ap = argparse.ArgumentParser(); ap.add_argument('scene'); ap.add_argument('--start', type=float, required=True)
ap.add_argument('--dur', type=float, required=True); ap.add_argument('--fps', type=int, default=60)
ap.add_argument('--adlibs', action='store_true', help='加入字幕外的和聲（oh oh、yeah、dribble、bye 等；取自 data/asr-unprompted.json 中不屬於任何字幕字的辨識字）')
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent; song_dir = here.parents[1]
SR = 24000
pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(a.start), '-t', str(a.dur), '-i', str(song_dir / 'sources' / 'Every Day Is Fun.mp3'),
                               '-af', 'pan=mono|c0=0.5*c0+0.5*c1,highpass=f=300,lowpass=f=3000', '-ar', str(SR), '-f', 's16le', '-'])
x = array.array('h', pcm); hop = SR // a.fps; nf = round(a.dur * a.fps)
rms = [math.sqrt(sum(v * v for v in x[i * hop:(i + 1) * hop]) / hop) / 32768 if i * hop < len(x) else 0 for i in range(nf)]

# 逐字時碼：engine/song-data.js（song_words.py 已把正式字幕對到 ASR 逐字並內插）/ aligned tokens
sd = (here.parent / 'engine' / 'song-data.js').read_text(encoding='utf-8'); SONG = json.loads(sd[sd.index('{'):sd.rindex('}') + 1])
words = [(a_ - a.start, b_ - a.start, tk) for c in SONG['cues'] for a_, b_, tk in c[3] if a.start - .05 <= a_ < a.start + a.dur - .05]
if a.adlibs:   # 字幕沒有的和聲也要張嘴，但不進字幕 / ad-libs outside subtitle tokens: mouth only
    un = json.loads((song_dir / 'data' / 'asr-unprompted.json').read_text(encoding='utf-8'))
    for seg in un['segments']:
        for w in seg['words']:
            s0, s1 = w['start'] - a.start, w['end'] - a.start
            if 0 <= s0 < a.dur and not any(x[0] - .1 < s0 < x[1] + .1 for x in words): words.append((s0, max(s1, s0 + .2), w['word'].strip()))
    words.sort()
ROUND = re.compile(r"(oo|o|u|w)", re.I)
env, rnd = [0.0] * nf, [0.0] * nf
for t0, t1, w in words:
    t1 = max(t1, t0 + .12)                     # 太短的字至少開口 0.12 s
    f0, f1 = int(t0 * a.fps), min(nf, int(math.ceil(t1 * a.fps)))
    seg = rms[f0:f1] or [0]; lo, hi = min(seg), max(seg) + 1e-9
    for f in range(f0, f1):
        k = (f - f0 + .5) / max(1, f1 - f0)
        arc = math.sin(math.pi * min(1, k * 1.25)) ** .6   # 快開、近字尾收
        energy = .45 + .55 * (rms[f] - lo) / (hi - lo)
        env[f] = max(env[f], arc * energy)
        rnd[f] = 1.0 if ROUND.search(w) else 0.0
sm, prev = [], 0.0
for v in env: prev += (v - prev) * (.7 if v > prev else .45); sm.append(round(prev, 3))
out = here.parent / 'scenes' / f'{a.scene}.lipsync.js'
out.write_text('// 自動產生 by lipsync/song_lipsync.py（原曲對嘴）— 勿手改 / generated\nconst LIPSYNC = ' +
               json.dumps({'fps': a.fps, 'env': sm, 'round': rnd, 'words': [[round(t0, 3), round(t1, 3), w] for t0, t1, w in words]}, ensure_ascii=False) + ';\n', encoding='utf-8')
print(out.name, nf, 'frames;', len(words), 'words')
print(''.join(' .:-=+*#%@'[min(9, int(v * 9.99))] for v in sm[::2]))
