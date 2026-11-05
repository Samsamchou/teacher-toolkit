"""build_voice_v1.py — 影片 6〈Is she from India?〉的聲音時間軸（從影片 5 複製；Amy＝Ana、Ben＝Roger +40Hz）。
- Nova：en-US-AvaNeural／zh-TW-HsiaoChenNeural；Cosmo：en-US-GuyNeural／zh-TW-YunJheNeural；語速都 -20%（0.8 倍）。
- 發音按鈕播 phonics-audio/processed/ 的真人音檔（不用 TTS）。
- TTS 片段快取在 segs/<雜湊>.mp3（文字與聲音沒變就不重做）。
- TTS_FIX：字幕顯示原文，但送給 TTS 的拼法改成唸得對的寫法（由 whisper 檢查後決定）。
輸出：voice_v1.wav、timeline_v1.json。用法：python -I build_voice_v1.py
"""
import asyncio, json, pathlib, subprocess, hashlib, sys
import numpy as np, edge_tts, soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import SCRIPT

PA = HERE.parent / 'phonics-audio' / 'processed'
SR = 48000; RATE = '-20%'; GAP = 0.45; SEC_GAP = 1.0
VOICE = {('nova', 'say'): 'en-US-AvaNeural', ('nova', 'zh'): 'zh-TW-HsiaoChenNeural',
         ('cosmo', 'say'): 'en-US-GuyNeural', ('cosmo', 'zh'): 'zh-TW-YunJheNeural'}
# 2026-10-29 學生角色（對話動畫）：Amy＝AnaNeural；Ben＝男聲提高音調（老師試聽後定案，見 voice-test/audition.md）
VOICE.update({('amy', 'say'): 'en-US-AnaNeural', ('ben', 'say'): 'en-US-RogerNeural', ('emma', 'say'): 'en-US-AriaNeural'})   # 影片 5：2026-11-04 老師試聽選 4 號（Aria 調高音），和 Amy（Ana）分得出來
PITCH = {'en-US-RogerNeural': '+40Hz', 'en-US-AriaNeural': '+35Hz'}  # 2026-10-29 老師選 Ben 4
TTS_FIX = {  # 字幕顯示左邊，TTS 唸右邊（2026-10-20 whisper 檢查後決定）
 'What day is today?': 'What day, is today?',
 'Now watch. It and is change places!': 'Now watch. It, and is, change places!',   # 影片 3：is 被聽成 his
 'Now watch. She and is change places!': 'Now watch. She, and is, change places!',   # 影片 6：比照影片 3
 'Is she from the UK?': 'Is she, from the UK?',   # 影片 6：Amy（Ana）把 Is 吞掉，聽成 The shoe from the UK
 'Is she from the USA?': 'Is she, from the USA?',
 'P.E. class? Yay!': 'P, E, class? Yay!',   # 影片 3：P.E. 被唸成 P
 'Fa... ther.': 'Fah... ther.',   # 影片 4：Fa 被唸成字母 F-A；father 的 a 是 /ɑ/
 'fa... ther.': 'fah... ther.',
 'Mo... ther.': 'Muh... ther.',   # Mo 被唸成字母或長音 o；mother 的 o 是 /ʌ/
 'mo... ther.': 'muh... ther.',
 'Bro... ther.': 'Bruh... ther.',   # Bro 會唸成 /broʊ/；brother 的 o 是 /ʌ/
 '字尾的 er，嘴巴微微張開、舌頭往後捲，唸 /ɚ/。': '字尾的 er，嘴巴微微張開、舌頭往後捲，唸',   # v1.1：音標不送 TTS（會唸成斜線），改插老師錄音
 '小提醒：mother 和 brother 的 o，唸起來像短 u 的 /ʌ/，': '小提醒：mother 和 brother 的 o，唸起來像短 u 的',
 '還有，father 的 a 唸 /ɑ/，': '還有，father 的 a 唸',
 'Look at the letter I in sister.': 'Look at the letter I, in sister.',
 'Crayons? Why?': 'Cray-ons? Why?',   # Amy 這句在全片裡 whisper 聽成 Clans，加連字號讓 cray 唸清楚   # 單獨一句時 Ava 的 day 太輕（聽成 What is today），在 day 後稍停，也對應 What day｜is today 的分塊
 'Look at "It\'s". It\'s is a short way to say "It is".': "Look at the word It's. It's is a short way to say, It is."}  # 原句唸成 Look out
SOUND_VIS = {'short-u-1': ['M02_A'], 'short-e-1': ['M08_mid', 'M03_E'], 'short-a-1': ['M02_A'],
             'En-us-A_upper': ['M08_mid', 'M03_E'], 'En-us-blue': ['M07_L', 'M05_U'], 'En-us-u': ['M03_E', 'M05_U'], 'ref-er-1': ['M08_mid'], 'En-us-I': ['M02_A', 'M03_E'],
             'En-us-er': ['M08_mid', 'M04_O'], 'dg-th-voiceless': ['M07_L'], 'dg-th-voiced': ['M07_L'], 'short-i-1': ['M03_E'], 'short-o-1': ['M02_A']}

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
    t = 0.8; out = []; segs = []; prev = None; sections = {}
    for i, (sec, who, kind, val, vis) in enumerate(SCRIPT):
        if prev is not None:
            if sec != prev[0]: t += SEC_GAP
            elif '句中' in vis or '句中' in prev[2]: t += 0.25   # v1.1 句中插錄音：前後只留 0.25 秒
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
        out.append((t, a)); segs.append(seg); t += len(a) / SR; prev = (sec, kind, vis)
    total = t + 1.5
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for t0, a in out: k = int(round(t0 * SR)); buf[k:k + len(a)] += a
    buf = buf[:int(total * SR)]
    sf.write(str(HERE / 'voice_v1.wav'), np.clip(buf, -1, 1), SR, subtype='PCM_16')
    (HERE / 'timeline_v1.json').write_text(json.dumps({'dur': round(total, 3), 'voices': {f'{k[0]}-{k[1]}': v for k, v in VOICE.items()},
                                                       'rate': RATE, 'sections': sections, 'segs': segs}, ensure_ascii=False, indent=1), encoding='utf-8')
    for s, (a, b) in sections.items(): print(f'{s:8s} {a:7.1f}-{b:7.1f}  {b - a:5.1f}s')
    print(f'total {total:.1f}s = {int(total // 60)}:{total % 60:04.1f}')

asyncio.run(main())
