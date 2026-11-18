"""build_voice_v1.py — 影片 9〈I'm going to the ___.〉的聲音時間軸（從影片 8 複製）。
- Nova：en-US-AvaNeural／zh-TW-HsiaoChenNeural；Cosmo：en-US-GuyNeural／zh-TW-YunJheNeural；語速都 -20%（0.8 倍）。
- 發音按鈕播 phonics-audio/processed/：短 a、er、短 o、短 i＝老師錄音；ar（En-us-are）、oo、long a＝Wikimedia Commons。
- 第 6 段情境動畫：Nova、Cosmo 的開場兩句照常合成，Ken 的部分直接接 part9.wav（POST 到 END，和桌上微縮渲染的時間一樣）。
- TTS 片段快取在 segs/<雜湊>.mp3。TTS_FIX：字幕顯示原文，送 TTS 的拼法改成唸得對的寫法。
輸出：voice_v1.wav、timeline_v1.json。用法：python -I build_voice_v1.py
"""
import asyncio, json, pathlib, subprocess, hashlib, sys
import numpy as np, edge_tts, soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import SCRIPT, SYL, SYL_TTS, syl_line

PA = HERE.parent / 'phonics-audio' / 'processed'
SR = 48000; RATE = '-20%'; GAP = 0.45; SEC_GAP = 1.0
VOICE = {('nova', 'say'): 'en-US-AvaNeural', ('nova', 'zh'): 'zh-TW-HsiaoChenNeural',
         ('cosmo', 'say'): 'en-US-GuyNeural', ('cosmo', 'zh'): 'zh-TW-YunJheNeural'}
PITCH = {}
TTS_FIX = {**{syl_line(c): SYL_TTS[c] for c in SYL},
 'Hot. Dog. Hos!': 'Hot. Dog. Hoss!', 'Sit. Pig. Pi!': 'Sit. Pig. Pih!',
 'Now look at T, I, O, N. It says shun.': 'Now look at T, I, O, N. It says, shun.',
 'Su... per... mar... ket. Supermarket!': 'Soo... per... mar... ket. Supermarket!'}
SOUND_VIS = {'short-a-1': ['M02_A'], 'En-us-are': ['M02_A'], 'ref-er-1': ['M08_mid'], 'Near-close_near-back_rounded_vowel': ['M05_U'],
             'short-o-1': ['M02_A'], 'short-i-1': ['M03_E'], 'En-us-A_upper': ['M08_mid', 'M03_E']}
PART9 = json.loads((HERE / 'tabletop' / 'src' / 'timing.json').read_text(encoding='utf-8'))

def tts_text(t):
    if t in TTS_FIX: return TTS_FIX[t]
    for a, b in TTS_FIX.items(): t = t.replace(a, b)
    return t

async def synth(text, voice):
    pitch = PITCH.get(voice, '+0Hz')
    f = HERE / 'segs' / (hashlib.sha1(f'{voice}|{RATE}|{text}'.encode() + (pitch.encode() if pitch != '+0Hz' else b'')).hexdigest()[:16] + '.mp3')
    j = f.with_suffix('.json')
    if f.exists() and j.exists(): return f, json.loads(j.read_text(encoding='utf-8'))
    for attempt in range(10):   # edge-tts 偶爾回 NoAudioReceived（同一句重試就好）；影片 6 雲哲時好時壞 → 最多試 10 次
        words = []
        async def run():
            with open(f, 'wb') as fh:
                async for ch in edge_tts.Communicate(text, voice, rate=RATE, pitch=pitch, boundary='WordBoundary').stream():
                    if ch['type'] == 'audio': fh.write(ch['data'])
                    elif ch['type'] == 'WordBoundary':
                        words.append({'w': ch['text'], 't0': ch['offset'] / 1e7, 't1': (ch['offset'] + ch['duration']) / 1e7})
        try:
            await asyncio.wait_for(run(), 60)   # 影片 6：edge-tts 曾卡住 18 分鐘不回應 → 每句最多等 60 秒再重試
            break
        except Exception:   # NoAudioReceived、503 握手失敗都重試
            if attempt == 9: print('TTS 失敗：', voice, repr(text), flush=True); raise
            await asyncio.sleep(3 + 3 * attempt)
    j.write_text(json.dumps(words, ensure_ascii=False), encoding='utf-8'); return f, words

def clap(strong):
    """程式拍手聲：短促的雜訊爆音＋帶通（不用 AI 生成）；重音那拍大聲。"""
    rng = np.random.default_rng(7 if strong else 3); n = int(.09 * SR)
    x = rng.standard_normal(n).astype(np.float32) * np.exp(-np.arange(n) / (SR * .012)).astype(np.float32)
    x = np.convolve(x, np.ones(6, np.float32) / 6, 'same'); x -= np.convolve(x, np.ones(40, np.float32) / 40, 'same')
    return x / np.abs(x).max() * (.55 if strong else .3)

def decode(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def trim(a):
    loud = np.where(np.abs(a) > 0.01)[0]; s0, s1 = max(0, loud[0] - int(.03 * SR)), min(len(a), loud[-1] + int(.08 * SR))
    return a[s0:s1], s0 / SR

async def speak(who, kind, text):
    """回傳 (音訊, words, voices)。both＝兩人齊唸，各自合成後疊加，字詞時間取 Nova 的。"""
    if who == 'relay':   # 2026-11-04 老師：整串單字不齊唸（聲音重疊），Nova、Cosmo 輪流各唸一個字，字與字間隔 0.3 秒
        toks = [x.strip() for x in text.split(',') if x.strip()]; parts = []; words = []; t = 0.0; voices = []
        for k, tok in enumerate(toks):
            w = ('nova', 'cosmo')[k % 2]; v = VOICE[(w, kind)]; f, _ = await synth(tts_text(tok.strip('!.') + '!'), v)
            a, _ = trim(decode(f)); a = a * 0.9
            words.append({'w': tok + (',' if k < len(toks) - 1 else ''), 't0': t, 't1': t + len(a) / SR, 'who': w})
            parts += [a, np.zeros(int(.3 * SR), np.float32)]; t += len(a) / SR + .3; voices.append(v)
        return np.concatenate(parts[:-1]), words, sorted(set(voices))
    whos = ['nova', 'cosmo'] if who == 'both' else [who]
    parts = []
    for w in whos:
        v = VOICE[(w, kind)]; f, words = await synth(tts_text(text), v)
        a, lead = trim(decode(f)); parts.append((a, [{'w': x['w'], 't0': x['t0'] - lead, 't1': x['t1'] - lead} for x in words], v))
    n = max(len(p[0]) for p in parts); a = np.zeros(n, np.float32)
    for p in parts: a[:len(p[0])] += p[0] * (0.9 / len(parts) ** 0.5)
    return a, parts[0][1], [p[2] for p in parts]

async def main():
    (HERE / 'segs').mkdir(exist_ok=True)
    t = 0.8; out = []; segs = []; prev = None; sections = {}; story_done = False
    p9, _ = sf.read(str(HERE / 'part9.wav'), dtype='float32')
    for i, (sec, who, kind, val, vis) in enumerate(SCRIPT):
        if who == 'ken' or (sec == '06-story' and kind == 'turn'):
            if story_done: continue
            # 情境動畫：整段接 part9.wav 的 POST～END（Ken、Nova 問句、猜、Your turn 都在裡面）
            t += GAP; s0 = PART9['POST']['t0']; s1 = PART9['END']['t0'] + PART9['END']['dur']
            a = p9[int(s0 * SR):int(s1 * SR)]
            seg = {'i': i, 'sec': sec, 'who': 'story', 'kind': 'story', 'vis': 'story', 't0': round(t, 3), 't1': round(t + len(a) / SR, 3),
                   'part9_offset': round(t - s0, 3)}
            sections.setdefault(sec, [seg['t0'], seg['t1']])[1] = seg['t1']
            out.append((t, a)); segs.append(seg); t += len(a) / SR; prev = (sec, 'story', 'story'); story_done = True
            continue
        if prev is not None:
            if sec != prev[0]: t += SEC_GAP
            elif not (prev[1] == 'sound' and kind == 'turn'): t += GAP
        seg = {'i': i, 'sec': sec, 'who': who, 'kind': kind, 'vis': vis}
        if kind in ('say', 'zh'):
            a, words, voices = await speak(who, kind, val)
            seg.update(text=val, voices=voices, words=[{**w, 't0': round(t + w['t0'], 3), 't1': round(t + w['t1'], 3)} for w in words])
        elif kind == 'sound':
            a, sr = sf.read(str(PA / f'{val}.wav'), dtype='float32'); assert sr == SR, val
            a = a * 0.8; seg.update(clip=val, visemes=SOUND_VIS[val])
        else:
            t += 0.25; a = np.zeros(int(val * SR), np.float32); seg.update(sec_len=val)
        seg['t0'] = round(t, 3); seg['t1'] = round(t + len(a) / SR, 3)
        if kind == 'sound':
            hop = SR // 30; env = [float(np.sqrt((a[k:k + hop] ** 2).mean())) for k in range(0, len(a), hop)]; m = max(env) or 1
            seg['env'] = [round(e / m, 3) for e in env]
        sections.setdefault(sec, [seg['t0'], seg['t1']])[1] = seg['t1']
        if kind == 'say' and '拍手' in vis:   # 每個音節一聲拍手（重音那拍大聲），時間取 TTS 的字詞邊界
            w_ = vis.split('clap:')[1].split('；')[0]; parts, st = SYL[w_]; ws = seg['words']
            if len(ws) != len(parts):
                ws = [{'t0': seg['t0'] + (seg['t1'] - seg['t0']) * k / len(parts)} for k in range(len(parts))]
                print('拍手平均分配：', w_, len(seg['words']), flush=True)
            seg['claps'] = [round(w['t0'], 3) for w in ws]; seg['stress'] = st
            for k, tc in enumerate(seg['claps']): out.append((tc, clap(k == st)))
        out.append((t, a)); segs.append(seg); t += len(a) / SR; prev = (sec, kind, vis)
    total = t + 1.5
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for t0, a in out: k = int(round(t0 * SR)); buf[k:k + len(a)] += a
    buf = buf[:int(total * SR)]
    sf.write(str(HERE / 'voice_v1.wav'), np.clip(buf, -1, 1), SR, subtype='PCM_16')
    (HERE / 'timeline_v1.json').write_text(json.dumps({'dur': round(total, 3), 'voices': {f'{k[0]}-{k[1]}': v for k, v in VOICE.items()},
                                                       'rate': RATE, 'sections': sections, 'segs': segs}, ensure_ascii=False, indent=1), encoding='utf-8')
    for s, (a, b) in sections.items(): print(f'{s:10s} {a:7.1f}-{b:7.1f}  {b - a:5.1f}s')
    print(f'total {total:.1f}s = {int(total // 60)}:{total % 60:04.1f}')

asyncio.run(main())
