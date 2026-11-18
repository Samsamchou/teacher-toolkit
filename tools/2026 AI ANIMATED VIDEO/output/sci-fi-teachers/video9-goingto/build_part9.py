"""build_part9.py — 影片 9 情境動畫段（8 個地點）的聲音與時間軸。
台詞照網站 Guess 版 3D planet/godot-ershui-planet/data/listen.json（一字不改）。
- Ken：en-US-GuyNeural +18Hz（和網站一樣）；問句 Where are you going?：Nova（en-US-AvaNeural）；語速都 -20%。
- 每段：情境句（DAY／WEATHER 圖字卡）→ 想做的事 → Nova 問 → 猜 3 秒 → Ken 走到地點（鏡頭拉遠、招牌亮）→ 答句 → Your turn 3 秒。
輸出：part9.wav、tabletop/src/timing.json（每段 t0、dur、各拍時間，秒；段內時間從 0 起算）。
用法：python -I build_part9.py
"""
import asyncio, json, pathlib, hashlib, subprocess
import numpy as np, edge_tts, soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
LISTEN = pathlib.Path('G:/我的雲端硬碟/teacher-toolkit/tools/2026 REA Games/3D planet/godot-ershui-planet/data/listen.json')
SR = 48000; RATE = '-20%'
KEN = ('en-US-GuyNeural', '+18Hz'); NOVA = ('en-US-AvaNeural', '+0Hz')
ORDER = ['post', 'supermarket', 'library', 'hospital', 'park', 'bookstore', 'museum', 'station']
SID = {'post': 'POST', 'supermarket': 'SUPER', 'library': 'LIB', 'hospital': 'HOSP', 'park': 'PARK',
       'bookstore': 'BOOK', 'museum': 'MUSEUM', 'station': 'STATION'}
GAP, GUESS, WALK, TURN, TAIL = 0.45, 3.0, 2.6, 3.0, 0.8
OPEN_DUR, END_DUR = 5.0, 3.0
SEGS = HERE / 'segs'; SEGS.mkdir(exist_ok=True)


async def synth(text, vp):
    voice, pitch = vp
    f = SEGS / (hashlib.sha1(f'{voice}|{RATE}|{pitch}|{text}'.encode()).hexdigest()[:16] + '.mp3')
    j = f.with_suffix('.json')
    if f.exists() and j.exists(): return f, json.loads(j.read_text(encoding='utf-8'))
    for attempt in range(10):
        words = []
        async def run():
            with open(f, 'wb') as fh:
                async for ch in edge_tts.Communicate(text, voice, rate=RATE, pitch=pitch, boundary='WordBoundary').stream():
                    if ch['type'] == 'audio': fh.write(ch['data'])
                    elif ch['type'] == 'WordBoundary':
                        words.append({'w': ch['text'], 't0': ch['offset'] / 1e7, 't1': (ch['offset'] + ch['duration']) / 1e7})
        try:
            await asyncio.wait_for(run(), 60); break
        except Exception:
            if attempt == 9: raise
            await asyncio.sleep(3 + 3 * attempt)
    j.write_text(json.dumps(words, ensure_ascii=False), encoding='utf-8')
    return f, words


def load(f):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True)
    a = np.frombuffer(r.stdout, np.float32).copy()
    nz = np.nonzero(np.abs(a) > 0.01)[0]   # 去掉前後靜音，時間才準
    return a[max(0, nz[0] - 480):nz[-1] + 2400] if len(nz) else a, (max(0, nz[0] - 480) / SR if len(nz) else 0.0)


async def main():
    items = {d['id']: d for d in json.loads(LISTEN.read_text(encoding='utf-8'))['items']}
    track = [np.zeros(int(OPEN_DUR * SR), np.float32)]
    tm = {'OPEN': {'t0': 0.0, 'dur': OPEN_DUR}}
    t_abs = OPEN_DUR
    for pid in ORDER:
        d = items[pid]; word = d['word']
        lines = [('scene', d['scene'], KEN), ('reason', d['reason'], KEN), ('ask', 'Where are you going?', NOVA),
                 ('answer', f"I'm going to the {word}.", KEN)]
        seg = {'t0': round(t_abs, 3), 'place': pid, 'word': word, 'text': {k: t for k, t, _ in lines}}
        buf = []; t = 0.0
        for k, text, vp in lines:
            if k == 'answer':
                seg['guess'] = [round(t, 3), round(t + GUESS, 3)]; buf.append(np.zeros(int(GUESS * SR), np.float32)); t += GUESS
                seg['walk'] = [round(t, 3), round(t + WALK, 3)]; buf.append(np.zeros(int(WALK * SR), np.float32)); t += WALK
            f, words = await synth(text, vp); a, lead = load(f)
            seg[k] = [round(t, 3), round(t + len(a) / SR, 3)]
            seg.setdefault('words', {})[k] = [[w['w'], round(t + w['t0'] - lead, 3), round(t + w['t1'] - lead, 3)] for w in words]   # 對嘴用
            if k == 'scene':   # DAY／WEATHER 卡跳出的時間＝唸到星期、天氣那個字
                for w in words:
                    ww = w['w'].strip('.,').lower()
                    if ww.endswith('day') and ww not in ('today',): seg['day'] = [ww.capitalize(), round(t + w['t0'] - lead, 3)]
                    if ww in ('sunny', 'cloudy', 'rainy', 'windy', 'cold', 'hot'): seg['weather'] = [ww, round(t + w['t0'] - lead, 3)]
            buf.append(a); t += len(a) / SR
            gap = 0.5 if k == 'answer' else GAP
            buf.append(np.zeros(int(gap * SR), np.float32)); t += gap
        seg['turn'] = [round(t, 3), round(t + TURN, 3)]; buf.append(np.zeros(int((TURN + TAIL) * SR), np.float32)); t += TURN + TAIL
        seg['dur'] = round(t, 3)
        tm[SID[pid]] = seg; track += buf; t_abs += t
    tm['END'] = {'t0': round(t_abs, 3), 'dur': END_DUR}; track.append(np.zeros(int(END_DUR * SR), np.float32)); t_abs += END_DUR
    sf.write(HERE / 'part9.wav', np.concatenate(track) * 0.9, SR)
    out = HERE / 'tabletop' / 'src' / 'timing.json'
    out.write_text(json.dumps(tm, ensure_ascii=False, indent=1), encoding='utf-8')
    for k, v in tm.items(): print(k, v['t0'], v['dur'], v.get('day'), v.get('weather'))
    print('total', round(t_abs, 2))

asyncio.run(main())
