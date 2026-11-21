"""故事 1（＋s）：Ken 和媽媽的棒球日 — 畫風 J 剪紙人偶。8 句故事＋3 題三選一。
python cutout/story1.py [--stills]   → renders/story1-trial-v1.mp4（--stills 只出檢查圖 renders/story1_check.jpg）
座標：世界 1920×1080，地面 y=GROUND；鏡頭 (fx, fy, z)。字幕在螢幕座標。
"""
import sys, os, math, json, subprocess, re
import numpy as np, cairo, soundfile as sf
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..'); sys.path.insert(0, HERE)
import cast as K, lipsync as L
from cast import E, hexc, rrect, poly, stroke, fs, LINE
W, H, FPS, SR = 1920, 1080, 30, L.SR
GROUND, SC = 780, 0.92
RED = hexc('e8413c'); NAVY = hexc('1d1240')
SUF = dict(plays='s', throws='s', hits='s', runs='s', gets='s')          # 動詞字尾（永遠紅色）
ease, lerp, clamp = E.ease, E.lerp, E.clamp


# ---------- 聲音 ----------
def load_line(lid, t0):
    base = os.path.join(ROOT, 'audio', 'story', lid); ph = json.load(open(base + '_phones.json')); a, _ = sf.read(base + '.wav')
    words = {}
    for p in ph:
        w = words.setdefault(p['wi'], [p['t0'] + t0, p['t1'] + t0, p['word']]); w[1] = p['t1'] + t0
    man = {m['id']: m for m in json.load(open(os.path.join(ROOT, 'audio', 'story', 'manifest.json'), encoding='utf-8'))}[lid]
    return dict(id=lid, who=man['who'], text=man['text'], audio=a.astype(np.float32), t0=t0, t1=t0 + len(a)/SR, words=[tuple(words[k]) for k in sorted(words)], track=L.build_track(ph, t0))

def tone(freqs, dur, decay, amp=0.2):
    tt = np.arange(int(dur*SR))/SR; return (sum(a*np.sin(2*np.pi*f*tt) for f, a in freqs)*np.exp(-tt*decay)*amp).astype(np.float32)
SFX = dict(
    ding=lambda: tone([(1318, 0.5), (2637, 0.3), (1976, 0.2)], 0.9, 5.5, 0.22),
    beep=lambda: tone([(880, 1.0)], 0.12, 8, 0.12),
    pop=lambda: tone([(520, 0.7), (780, 0.3)], 0.14, 26, 0.2),
    crack=lambda: (np.random.RandomState(3).randn(int(0.09*SR))*np.exp(-np.arange(int(0.09*SR))/SR*60)*0.35).astype(np.float32) + np.pad(tone([(190, 1.0)], 0.07, 40, 0.3), (0, int(0.09*SR) - int(0.07*SR))),
    whoosh=lambda: (np.convolve(np.random.RandomState(5).randn(int(0.4*SR)), np.ones(24)/24, 'same')*np.sin(np.linspace(0, np.pi, int(0.4*SR)))**2*0.5).astype(np.float32),
    catch=lambda: tone([(240, 1.0), (120, 0.6)], 0.1, 45, 0.3),
)
def put(audio, a, t):
    s = int(t*SR); n = len(audio)
    if 0 <= s < n: audio[s:s + len(a)] += a[:n - s]

def music(n, env_voice):
    """配樂：沒人說話時 RMS 0.030（約 1/4），有人說話再壓到 0.6 倍；頭尾淡入淡出（同 Vienna）。"""
    wav = os.path.join(ROOT, 'audio', 'story', '_bgm.wav')
    if not os.path.exists(wav): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'sfx', 'bgm.mp3'), '-ac', '1', '-ar', str(SR), wav], check=True)
    a, _ = sf.read(wav); a = np.tile(a, int(n/len(a)) + 2)[:n].astype(np.float32)
    a *= 0.030/max(1e-6, float(np.sqrt(np.mean(a**2))))
    env = np.interp(np.arange(n)/SR, np.arange(len(env_voice))/FPS, np.minimum(1.0, env_voice*3))
    k = int(0.35*SR); env = np.convolve(env, np.ones(k)/k, mode='same'); a *= (1 - 0.4*np.clip(env*1.6, 0, 1))
    f = int(0.6*SR); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f); return a


# ---------- 畫面元件 ----------
def park(c, t):
    g = cairo.LinearGradient(0, 0, 0, 640)
    for k, col in ((0, '6fb0ea'), (0.6, 'b4d8f2'), (1, 'e6f2f8')): g.add_color_stop_rgba(k, *hexc(col))
    c.rectangle(-500, -300, W + 1000, 1000); c.set_source(g); c.fill()
    c.new_path(); c.arc(1650, 150, 70, 0, 6.3); c.set_source_rgba(*hexc('ffe27a')); c.fill()
    for i in range(12):
        a = i*math.pi/6 + t*0.15; c.move_to(1650 + 90*math.cos(a), 150 + 90*math.sin(a)); c.line_to(1650 + 118*math.cos(a), 150 + 118*math.sin(a)); stroke(c, 7, hexc('ffe27a'))
    E.cloud(c, 240 + t*5, 150, 1.0, (1, 1, 1, 0.85)); E.cloud(c, 1100 + t*3.5, 110, 1.25, (1, 1, 1, 0.8))
    for i in range(-3, 16):   # 遠方樹
        x = i*170 + 40; c.rectangle(x - 9, 520, 18, 110); fs(c, hexc('8a5a34'), 2.4)
        for dx, dy, r in ((0, -70, 62), (-42, -30, 48), (42, -30, 48)): c.new_path(); c.arc(x + dx, 520 + dy, r, 0, 6.3); fs(c, hexc('4f8f4a' if i % 2 else '5fa052'), 2.6)
    c.rectangle(-500, 600, W + 1000, 30); fs(c, hexc('f4efe4'), 2.6)   # 圍欄
    for x in range(-480, W + 500, 60): c.rectangle(x, 570, 12, 70); fs(c, hexc('f4efe4'), 2.2)
    g = cairo.LinearGradient(0, 640, 0, H); g.add_color_stop_rgba(0, *hexc('8cc46a')); g.add_color_stop_rgba(1, *hexc('5f9a4a'))
    c.rectangle(-500, 640, W + 1000, 700); c.set_source(g); c.fill(); c.move_to(-500, 640); c.line_to(W + 500, 640); stroke(c, 3)
    c.save(); c.translate(960, 830); c.scale(1, 0.13); c.new_path(); c.arc(0, 0, 1150, 0, 6.3); c.restore(); fs(c, hexc('e2c08e'), 3)   # 紅土內野
    for x in (480, 1440): poly(c, [(x - 44, 800), (x + 44, 800), (x + 56, 822), (x - 56, 822)]); fs(c, hexc('fbfaf4'), 2.6)

def ball(c, x, y, r=17, rot=0.0):
    c.save(); c.translate(x, y); c.rotate(rot); c.new_path(); c.arc(0, 0, r, 0, 6.3); fs(c, hexc('fbfaf4'), 2.6)
    for s in (-1, 1): c.new_path(); c.arc(s*r*1.15, 0, r*0.85, math.pi - 0.75 if s > 0 else -0.75, math.pi + 0.75 if s > 0 else 0.75); stroke(c, 2, RED)
    c.restore()

def bat_pose(k):
    """Ken 揮棒：k 0→1。回傳（握點、球棒角度、甜蜜點），都是角色座標。球棒從舉在右肩上方 → 水平掃過 → 收到左下。"""
    e = ease(k); gx, gy = lerp(74, -44, e), lerp(-292, -268, e); ang = math.radians(lerp(-60, -252, e)); Lb = 178
    return (gx, gy), ang, (gx + Lb*0.74*math.cos(ang), gy + Lb*0.74*math.sin(ang))
K_HIT = 0.585           # ease(k)=0.625 → 球棒水平朝左（-180°）

def draw_bat(c, k):
    (gx, gy), ang, _ = bat_pose(k); c.save(); c.translate(gx, gy); c.rotate(ang)
    c.new_path(); c.move_to(-34, -7); c.line_to(60, -8); c.curve_to(110, -17, 150, -18, 178, -15); c.curve_to(190, -8, 190, 8, 178, 15); c.curve_to(150, 18, 110, 17, 60, 8); c.line_to(-34, 7); c.close_path(); fs(c, hexc('e0a85a'), 2.8)
    rrect(c, -44, -11, 12, 22, 5); fs(c, hexc('b8803a'), 2.4); c.restore()

def verb_card(c, t, t0, x, y, stem, suf, size=120):
    """動詞大字卡：字幹深色＋字尾紅色（唸到這個字時跳出）。"""
    if t < t0: return
    k = E.pop(t, t0); E.font(c, size); ws, we = c.text_extents(stem).x_advance, c.text_extents(suf).x_advance; w = ws + we + 110; h = size*1.5
    c.save(); c.translate(x, y); c.rotate(-0.04); c.scale(E.S(k), E.S(k))
    rrect(c, -w/2 + 8, -h/2 + 10, w, h, 30); c.set_source_rgba(0, 0, 0, 0.25); c.fill()
    rrect(c, -w/2, -h/2, w, h, 30); fs(c, hexc('fffaf0'), 5)
    c.move_to(-(ws + we)/2, size*0.34); c.set_source_rgba(*NAVY); c.show_text(stem)
    ks = E.pop(t, t0 + 0.25); c.save(); c.translate(-(ws + we)/2 + ws + we/2, size*0.34); c.scale(E.S(ks), E.S(ks)); c.move_to(-we/2, 0); c.set_source_rgba(*RED); c.show_text(suf); c.restore()
    c.restore()

def karaoke(c, t, seg):
    """卡拉 OK：唸到的字變黃；動詞字尾 s 永遠紅色。太長自動分兩行。"""
    if not seg or not (seg['t0'] - 0.15 <= t <= seg['t1'] + 0.35): return
    size = 58; E.font(c, size); ws = seg['text'].split(); sp = c.text_extents('a b').x_advance - c.text_extents('ab').x_advance
    wd = [c.text_extents(w).x_advance for w in ws]; rows = [list(range(len(ws)))]
    if sum(wd) + sp*(len(ws) - 1) > W - 420:
        half = sum(wd)/2; acc = 0; k = 0
        while k < len(ws) - 1 and acc + wd[k] < half: acc += wd[k]; k += 1
        rows = [list(range(k)), list(range(k, len(ws)))]
    lh = size*1.45; yb = H - 84 - 56
    for r, idx in enumerate(rows):
        tot = sum(wd[i] for i in idx) + sp*(len(idx) - 1); x = W/2 - tot/2; y = yb - (len(rows) - 1 - r)*lh
        rrect(c, x - 36, y - size - 12, tot + 72, size*1.6, 18); c.set_source_rgba(0.1, 0.07, 0.1, 0.8); c.fill()
        for i in idx:
            on = i < len(seg['words']) and t >= seg['words'][i][0]; col = hexc('ffd84a') if on else (1, 1, 1, 1)
            core = re.sub(r'[^A-Za-z]', '', ws[i]).lower(); suf = SUF.get(core)
            if suf:
                m = re.match(r"([A-Za-z']+)(.*)", ws[i]); stem = m.group(1)[:-len(suf)]; tail = m.group(2)
                c.move_to(x, y); c.set_source_rgba(*col); c.show_text(stem); c.set_source_rgba(*hexc('ff6a5c')); c.show_text(suf); c.set_source_rgba(*col); c.show_text(tail)
            else:
                c.move_to(x, y); c.set_source_rgba(*col); c.show_text(ws[i])
            x += wd[i] + sp

def run_pose(ph):
    """跑步：腳踝一前一後、抬腳；手臂彎曲反向擺。回傳 feet、hands、身體上下。"""
    feet = {s: (s*10 + 62*math.sin(ph + (0 if s < 0 else math.pi)), -24 - 52*max(0.0, math.cos(ph + (0 if s < 0 else math.pi)))) for s in (-1, 1)}
    hands = {s: (s*74 + 46*math.sin(ph + (math.pi if s < 0 else 0)), -372 - 22*math.cos(ph + (math.pi if s < 0 else 0))) for s in (-1, 1)}
    return feet, hands, -9*abs(math.sin(ph))

def sun_card(c, t, t0, x, y):
    """SUNDAY 月曆卡＋太陽圖示。"""
    if t < t0: return
    k = E.pop(t, t0); c.save(); c.translate(x, y); c.rotate(-0.04); c.scale(E.S(k), E.S(k))
    rrect(c, -190 + 8, -120 + 10, 380, 240, 26); c.set_source_rgba(0, 0, 0, 0.25); c.fill()
    rrect(c, -190, -120, 380, 240, 26); fs(c, hexc('fffaf0'), 5); rrect(c, -190, -120, 380, 74, 26); fs(c, hexc('e8413c'), 5)
    E.text_c(c, 'SUNDAY', 0, -70, 54, (1, 1, 1)); c.new_path(); c.arc(0, 40, 44, 0, 6.3); fs(c, hexc('ffd84a'), 4)
    for i in range(8):
        a = i*math.pi/4 + t*0.6; c.move_to(58*math.cos(a), 40 + 58*math.sin(a)); c.line_to(78*math.cos(a), 40 + 78*math.sin(a)); stroke(c, 7, hexc('ffb02e'))
    c.restore()


# ---------- 時間軸 ----------
def build():
    T = {}; wt = lambda k, i, d=0.0: T[k]['words'][i][0] + d
    T['a0'] = 2.4
    T['A01'] = load_line('A01', T['a0'] + 0.6); T['A02'] = load_line('A02', T['A01']['t1'] + 0.6); T['a1'] = T['A02']['t1'] + 0.8
    T['A03'] = load_line('A03', T['a1'] + 0.5); T['b1'] = T['A03']['t1'] + 1.0
    T['A04'] = load_line('A04', T['b1'] + 0.4); T['c1'] = T['A04']['t1'] + 1.1
    T['A05'] = load_line('A05', T['c1'] + 0.9); T['tr'] = wt('A05', 1, 0.2); T['d1'] = max(T['A05']['t1'], T['tr'] + 0.7) + 0.6
    T['A06'] = load_line('A06', T['d1'] + 0.7); T['th'] = wt('A06', 1, 0.15); T['e1'] = T['A06']['t1'] + 1.0
    T['A07'] = load_line('A07', T['e1'] + 0.6); T['f1'] = T['A07']['t1'] + 1.5
    T['A08'] = load_line('A08', T['f1'] + 0.5); T['tg'] = wt('A08', 1, 0.15); T['g1'] = T['A08']['t1'] + 2.0
    # 三選一
    QS = [dict(pre='Mom', post='the ball.', ans=('throw', 's'), opts=['throws', 'throw', 'throwies'], voice='A05'),
          dict(pre='Ken', post='the ball.', ans=('hit', 's'), opts=['hit', 'hits', 'hites'], voice='AQ2'),
          dict(pre='We', post='baseball at the park.', ans=('play', ''), opts=['plays', 'play', 'playes'], voice='A04')]
    t = T['g1'] + 0.4; T['AQ0'] = load_line('AQ0', t + 0.5); T['quiz'] = []
    for i, q in enumerate(QS):
        q = dict(q); q['t0'] = t; q['c0'] = t + (1.7 if i == 0 else 1.0); q['rev'] = q['c0'] + 3.0
        q['line'] = load_line(q['voice'], q['rev'] + 0.35); q['line']['id'] = f'Q{i}'; q['t1'] = q['line']['t1'] + 1.3; t = q['t1']; T['quiz'].append(q)
    T['end'] = t + 0.6
    n = int(T['end']*SR) + 1; voice = np.zeros(n, np.float32)
    for k in ('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'AQ0'): put(voice, T[k]['audio'], T[k]['t0'])
    for q in T['quiz']: put(voice, q['line']['audio'], q['line']['t0'])
    T['env'] = L.envelope(voice, FPS); audio = voice.copy()
    put(audio, SFX['whoosh'](), 0.2); put(audio, SFX['pop'](), wt('A02', 4)); put(audio, SFX['pop'](), wt('A03', 2)); put(audio, SFX['pop'](), wt('A04', 1))
    put(audio, SFX['whoosh'](), T['tr']); put(audio, SFX['pop'](), wt('A05', 1)); put(audio, SFX['crack'](), T['th']); put(audio, SFX['ding'](), wt('A06', 4))
    put(audio, SFX['pop'](), wt('A07', 1)); put(audio, SFX['catch'](), T['tg']); put(audio, SFX['ding'](), T['tg'] + 0.25)
    for q in T['quiz']:
        put(audio, SFX['whoosh'](), q['t0'])
        for i in range(3): put(audio, SFX['beep'](), q['c0'] + i)
        put(audio, SFX['ding'](), q['rev'])
    audio += music(n, T['env']); T['audio'] = np.clip(audio, -1, 1)
    return T


# ---------- 場景 ----------
def cam_at(t, keys):
    for (ta, a), (tb, b) in zip(keys, keys[1:]):
        if t <= tb:
            k = ease((t - ta)/max(1e-6, tb - ta)); return tuple(lerp(a[i], b[i], k) for i in range(3))
    return keys[-1][1]

def fy_for(z): return GROUND - 240/z          # 讓腳底落在螢幕 y=780（字幕上方）

def intro(c, t, T):
    """A01–A04：Ken 自我介紹 → 媽媽走進來 → 星期天晴天 → 一起在公園打棒球。"""
    a1, a2, a3, a4 = T['A01'], T['A02'], T['A03'], T['A04']
    keys = [(T['a0'], (960, fy_for(1.0), 1.0)), (a1['t0'] - 0.1, (990, fy_for(1.3), 1.3)), (a1['t1'] + 0.2, (990, fy_for(1.3), 1.3)), (a2['t0'] + 0.9, (1010, fy_for(1.12), 1.12)),
            (T['a1'], (1010, fy_for(1.12), 1.12)), (a3['t0'], (960, fy_for(1.0), 1.0)), (T['c1'], (960, fy_for(1.04), 1.04))]
    fx, fy, z = cam_at(t, keys); c.save(); c.translate(W/2, H/2); c.scale(z, z); c.translate(-fx, -fy); park(c, t)
    # 媽媽從右邊走進來
    kin = clamp((t - (a2['t0'] - 0.5))/1.1); mx = lerp(2250, 1180, ease(kin)); walking = 0 < kin < 1
    talk = (L.speaking(a1['track'], t) or L.speaking(a2['track'], t) or L.speaking(a4['track'], t))
    tr = a1['track'] if t < a1['t1'] + 0.2 else a2['track'] if t < a2['t1'] + 0.2 else a4['track']
    m = L.mouth_at(tr, T['env'], t) if talk else 'X'
    cheer = t >= a4['words'][1][0]
    pose = 'cheer' if cheer else 'present' if a2['t0'] - 0.1 <= t <= a2['t1'] + 0.3 else 'wave' if t < a1['words'][2][0] else 'idle'
    hop = -10*abs(math.sin((t - a4['words'][1][0])*7)) if cheer and t < T['c1'] - 0.3 else 0
    K.draw(c, 'ken', t=t, pose=pose, expr='excited' if cheer else 'happy', mouth=m, blink=(t % 3.3 < 0.12) and not talk, x=760, y=GROUND + hop, scale=SC)
    if walking:
        feet, hands, bob = run_pose(t*8); feet = {s: (v[0]*0.5, v[1]*0.6 - 8) for s, v in feet.items()}
        K.draw(c, 'mom', t=t, expr='happy', x=mx, y=GROUND + bob*0.4, scale=SC, feet=feet)
    else:
        K.draw(c, 'mom', t=t + 0.7, pose='cheer' if cheer else 'wave' if kin >= 1 and t < a2['t1'] else 'idle', expr='excited' if cheer else 'happy', blink=((t + 1.3) % 3.3 < 0.12), x=mx, y=GROUND + (hop if cheer else 0), scale=SC)
    c.restore()
    E.tag(c, t, a1['t0'], 430, 300, 'Ken', None, rot=-0.04) if t < a2['t0'] - 0.3 else None
    if a2['words'][2][0] <= t < T['a1'] + 0.2: E.tag(c, t, a2['words'][2][0], 1530, 150, 'Mom', None, rot=0.03)
    if a2['words'][4][0] <= t < T['a1'] + 0.2: verb_card(c, t, a2['words'][4][0], 640, 190, 'play', 's')
    if a3['words'][2][0] <= t < T['b1'] + 0.2: sun_card(c, t, a3['words'][2][0], 960, 250)
    if a4['words'][1][0] <= t: verb_card(c, t, a4['words'][1][0], 520, 210, 'play', '')

def game(c, t, T):
    """A05–A08：媽媽丟球 → Ken 打到球 → 媽媽跑 → 媽媽接到球。媽媽 480、Ken 1440（故事後半 Ken 在 1500）。"""
    a5, a6, a7, a8 = T['A05'], T['A06'], T['A07'], T['A08']; tr, th, tg = T['tr'], T['th'], T['tg']
    MX0, KX = 480, 1440; run0, run1 = T['e1'] + 0.25, T['f1'] - 0.15; MX1 = 1020
    kr = clamp((t - run0)/(run1 - run0)); mx = lerp(MX0, MX1, kr)
    zM, zK = 1.15, 1.4
    keys = [(T['c1'], (MX0 + 278, fy_for(zM), zM)), (T['d1'] - 0.35, (MX0 + 278, fy_for(zM), zM)), (T['d1'] + 0.25, (KX - 207, fy_for(zK), zK)), (T['e1'] - 0.3, (KX - 207, fy_for(zK), zK)),
            (T['e1'] + 0.25, (MX0 + 150, fy_for(zM), zM)), (run1, (MX1 + 150, fy_for(zM), zM)), (T['f1'] + 0.4, (1240, fy_for(1.1), 1.1)), (T['g1'], (1240, fy_for(1.13), 1.13))]
    fx, fy, z = cam_at(t, keys); c.save(); c.translate(W/2, H/2); c.scale(z, z); c.translate(-fx, -fy); park(c, t)
    # ---- 球的位置（世界座標）；None＝在手上 ----
    relW = (MX0 + SC*206, GROUND + SC*-584)                                    # 出手點
    (gk, ak, sweet) = bat_pose(K_HIT); hitW = (KX + SC*sweet[0], GROUND + SC*sweet[1])   # 擊球點＝球棒甜蜜點
    catchC = (112, -672); catchW = (MX1 + SC*catchC[0], GROUND + SC*(catchC[1] - 22))
    bpos = None; brot = t*14
    if tr <= t < T['d1'] + 0.25:                                              # 丟出去：往右飛出畫面
        k = (t - tr)/0.55; bpos = (lerp(relW[0], relW[0] + 1250, k), relW[1] + 40*k - 90*math.sin(min(1, k)*math.pi)*0.4)
    elif T['d1'] + 0.25 <= t < th:                                            # 飛向球棒（th 那一刻正好到甜蜜點）
        k = clamp((t - (th - 0.45))/0.45); bpos = (lerp(hitW[0] - 760, hitW[0], k), lerp(hitW[1] - 60, hitW[1], k) - 50*math.sin(k*math.pi)) if t >= th - 0.45 else (-999, -999)
    elif th <= t < tg:                                                        # 被打出去 → 高飛 → 落到媽媽手上
        if t < T['e1'] + 0.25: k = (t - th)/0.9; bpos = (hitW[0] - 520*k, hitW[1] - 900*k + 260*k*k)
        else:
            k = clamp((t - (tg - 0.9))/0.9); bpos = (lerp(catchW[0] - 160, catchW[0], k), lerp(-380, catchW[1], k*k)) if t >= tg - 0.9 else (-999, -999)
    # ---- 媽媽 ----
    if t < T['e1'] + 0.25:                                                    # 丟球
        rest, wind, rel, fol = (72, -312), (16, -682), (200, -560), (176, -372)
        if t < tr - 0.75: hd = rest
        elif t < tr - 0.2: k = ease((t - (tr - 0.75))/0.55); hd = (lerp(rest[0], wind[0], k), lerp(rest[1], wind[1], k))
        elif t < tr: k = ease((t - (tr - 0.2))/0.2); hd = (lerp(wind[0], rel[0], k), lerp(wind[1], rel[1], k))
        elif t < tr + 0.35: k = ease((t - tr)/0.35); hd = (lerp(rel[0], fol[0], k), lerp(rel[1], fol[1], k))
        else: k = ease((t - tr - 0.35)/0.5); hd = (lerp(fol[0], rest[0], k), lerp(fol[1], rest[1], k))
        inhand = t < tr
        K.draw(c, 'mom', t=t, expr='focus' if t < tr else 'happy', blink=(t % 3.1 < 0.12), x=MX0, y=GROUND, scale=SC, hands={1: hd}, grips=(1,) if inhand else ())
        if inhand: ball(c, MX0 + SC*(hd[0] + 6), GROUND + SC*(hd[1] - 24), 17)
    elif kr < 1:                                                              # 跑
        feet, hands, bob = run_pose((t - run0)*11.5)
        K.draw(c, 'mom', t=t, expr='excited', x=mx, y=GROUND + bob, scale=SC, feet=feet, hands=hands)
        for i in range(4):                                                    # 速度線
            yy = GROUND - 150 - i*95; x0 = mx - 150 - (i % 2)*40; c.move_to(x0, yy); c.line_to(x0 - 120 - 30*math.sin(t*20 + i), yy); stroke(c, 7, (1, 1, 1, 0.85))
    else:                                                                     # 接球
        got = t >= tg; hop = -12*abs(math.sin((t - tg)*7)) if got and t > tg + 0.25 else 0
        hands = {1: catchC, -1: (-150, -560)} if got and t > tg + 0.3 else {1: catchC}
        K.draw(c, 'mom', t=t, expr='excited' if got else 'focus', blink=False, x=mx, y=GROUND + hop, scale=SC, hands=hands, grips=(1,) if got else ())
        if got: ball(c, mx + SC*catchC[0], GROUND + hop + SC*(catchC[1] - 24), 17)
    # ---- Ken ----
    kx = KX if t < T['e1'] + 0.25 else 1500
    if t < T['e1'] + 0.25:
        k = clamp((t - (th - 0.21))/0.38) if t >= th - 0.21 else 0.0; g, ang, _ = bat_pose(k); h2 = (g[0] + 24*math.cos(ang), g[1] + 24*math.sin(ang))
        wow = t >= a6['words'][4][0] - 0.05
        K.draw(c, 'ken', t=t, expr='excited' if wow else 'focus', mouth=('D', 0.9) if wow and t < a6['t1'] + 0.2 else 'X', blink=False, x=kx, y=GROUND, scale=SC,
               hands={1: g, -1: h2}, grips=(-1, 1), under_hands=lambda cc: draw_bat(cc, k))
    else:
        got = t >= tg + 0.25; hop = -12*abs(math.sin((t - tg)*7 + 1)) if got else 0
        K.draw(c, 'ken', t=t, pose='cheer' if got else 'idle', expr='excited' if got else 'surprised', blink=False, x=kx, y=GROUND + hop, scale=SC)
    if bpos: ball(c, bpos[0], bpos[1], 17, brot)
    if th <= t < th + 0.3:                                                    # 擊球星星
        k = (t - th)/0.3
        for i in range(8):
            a = i*math.pi/4; c.move_to(hitW[0] + 30*math.cos(a), hitW[1] + 30*math.sin(a)); c.line_to(hitW[0] + (60 + 70*k)*math.cos(a), hitW[1] + (60 + 70*k)*math.sin(a)); stroke(c, 8*(1 - k) + 2, hexc('ffd84a'))
    c.restore()
    if a5['words'][1][0] <= t < T['d1'] - 0.15: verb_card(c, t, a5['words'][1][0], 250, 300, 'throw', 's', 104)
    if a6['words'][1][0] <= t < T['e1'] - 0.15:
        verb_card(c, t, a6['words'][1][0], 520, 250, 'hit', 's')
        if t >= a6['words'][4][0]: E.bigword(c, t, a6['words'][4][0], 520, 470, 'Wow!', 110, col=(1, 0.85, 0.3))
    if a7['words'][1][0] <= t < T['f1'] - 0.1: verb_card(c, t, a7['words'][1][0], 1420, 250, 'run', 's')
    if a8['words'][1][0] <= t: verb_card(c, t, a8['words'][1][0], 300, 280, 'get', 's')

def quiz(c, t, T, q, idx):
    park(c, t); c.rectangle(0, 0, W, H); c.set_source_rgba(1, 1, 1, 0.6); c.fill()
    lt = t - q['t0']; rev = t >= q['rev']; kr = E.pop(t, q['rev']) if rev else 0
    E.bigword(c, t, q['t0'] + 0.1, W/2, 130, 'Which word?', 96, col=(1, 0.72, 0.2))
    E.text_c(c, f'{idx + 1} / 3', 1790, 90, 40, (0.2, 0.2, 0.3))
    # 句子卡
    size = 104; E.font(c, size); sp = c.text_extents('a b').x_advance - c.text_extents('ab').x_advance
    wpre, wpost = c.text_extents(q['pre']).x_advance, c.text_extents(q['post']).x_advance; wans = c.text_extents(q['ans'][0] + q['ans'][1]).x_advance; wb = max(wans, 300) + 30
    tot = wpre + sp + wb + sp + wpost; cw = tot + 160; k0 = E.pop(t, q['t0'] + 0.2)
    c.save(); c.translate(W/2, 400); c.scale(E.S(k0), E.S(k0))
    rrect(c, -cw/2 + 8, -130 + 12, cw, 260, 36); c.set_source_rgba(0, 0, 0, 0.2); c.fill(); rrect(c, -cw/2, -130, cw, 260, 36); fs(c, hexc('fffaf0'), 6)
    x = -tot/2; c.move_to(x, 36); c.set_source_rgba(*hexc('2a6fd6')); c.show_text(q['pre']); x += wpre + sp
    c.move_to(x + 6, 62); c.line_to(x + wb - 6, 62); stroke(c, 8, NAVY)
    if rev:
        ws = c.text_extents(q['ans'][0]).x_advance; c.save(); c.translate(x + wb/2, 36); c.scale(E.S(kr), E.S(kr)); c.move_to(-wans/2, 0); c.set_source_rgba(*NAVY); c.show_text(q['ans'][0]); c.set_source_rgba(*RED); c.show_text(q['ans'][1]); c.restore()
    x += wb + sp; c.move_to(x, 36); c.set_source_rgba(*NAVY); c.show_text(q['post']); c.restore()
    # 三個選項
    correct = q['ans'][0] + q['ans'][1]
    for i, o in enumerate(q['opts']):
        ko = E.pop(t, q['t0'] + 0.45 + i*0.12); ox = 520 + i*440; oy = 700 + math.sin(t*2.4 + i)*6; ok = (o == correct)
        if ko <= 0: continue
        c.save(); c.translate(ox, oy); s = E.S(ko)*(1 + 0.08*kr if rev and ok else 1); c.scale(s, s)
        rrect(c, -185 + 6, -70 + 10, 370, 140, 70); c.set_source_rgba(0, 0, 0, 0.2); c.fill()
        rrect(c, -185, -70, 370, 140, 70); c.set_source_rgba(*(hexc('e9ffe6') if rev and ok else hexc('fffaf0')))
        c.fill_preserve(); stroke(c, 8 if rev and ok else 5, hexc('2fa84a') if rev and ok else hexc('f2a03a'))
        E.text_c(c, o, 0, 26, 72, hexc('1d1240'))
        if rev and not ok: rrect(c, -190, -75, 380, 150, 72); c.set_source_rgba(1, 1, 1, 0.68); c.fill()
        if rev and ok: c.move_to(120, -92); c.line_to(146, -62); c.line_to(196, -124); stroke(c, 14, hexc('2fa84a'))
        c.restore()
    # 倒數
    if q['c0'] <= t < q['rev']:
        el = t - q['c0']; left = 3 - int(el); c.new_path(); c.arc(W/2, 900, 62, 0, 6.3); c.set_source_rgba(0.1, 0.07, 0.2, 0.75); c.fill()
        c.new_path(); c.arc(W/2, 900, 62, -math.pi/2, -math.pi/2 + 2*math.pi*(1 - el/3)); stroke(c, 14, hexc('ffb02e')); E.text_c(c, str(left), W/2, 926, 76, (1, 1, 1))

def frame(c, t, T):
    X = 0.3
    if t < T['a0']:                                                           # 片頭卡
        park(c, t); c.rectangle(0, 0, W, H); c.set_source_rgba(0.12, 0.08, 0.3, 0.55); c.fill()
        E.bigword(c, t, 0.2, W/2, 400, 'Story 1', 190); verb_card(c, t, 0.7, W/2, 640, 'verb + ', 's', 110)
    elif t < T['c1']: intro(c, t, T)
    elif t < T['g1']:
        game(c, t, T)
        if t < T['c1'] + X: c.push_group(); intro(c, T['c1'] - 0.01, T); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - T['c1'])/X)
    else:
        i = next((k for k, q in enumerate(T['quiz']) if t < q['t1']), len(T['quiz']) - 1); quiz(c, t, T, T['quiz'][i], i)
    if T['a0'] <= t < T['g1']: E.vignette(c, 0.25)
    cur = next((T[k] for k in ('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08') if T[k]['t0'] - 0.15 <= t <= T[k]['t1'] + 0.35), None)
    karaoke(c, t, cur)


def to_img(surf): return Image.frombuffer('RGBA', (W, H), bytes(surf.get_data()), 'raw', 'BGRA', 0, 1).convert('RGB')

if __name__ == '__main__':
    E.FONT = 'Comic Relief'; od = os.path.join(ROOT, 'renders'); T = build(); name = next((a for a in sys.argv[1:] if not a.startswith('--')), 'story1-trial-v1')
    print({k: (round(T[k]['t0'], 2), round(T[k]['t1'], 2)) for k in ('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08')}, 'tr', round(T['tr'], 2), 'th', round(T['th'], 2), 'tg', round(T['tg'], 2), 'end', round(T['end'], 2))
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    if '--stills' in sys.argv:
        q = T['quiz']
        ts = [1.5, T['A01']['t0'] + 1.0, T['A02']['t0'] + 3.0, T['A03']['t0'] + 2.0, T['A04']['t1'] + 0.3, T['tr'] - 0.3, T['tr'] + 0.1, T['th'] - 0.2, T['th'], T['th'] + 0.25,
              T['A07']['t0'] + 0.8, T['f1'] - 0.3, T['tg'] - 0.3, T['tg'] + 0.6, q[0]['c0'] + 1.5, q[0]['rev'] + 1.0, q[1]['rev'] + 1.0, q[2]['rev'] + 1.0]
        ts = [float(a) for a in sys.argv[sys.argv.index('--stills') + 1:] if re.match(r'^[\d.]+$', a)] or ts
        cols = 4 if len(ts) > 6 else len(ts); rows = math.ceil(len(ts)/cols); sheet = Image.new('RGB', (640*cols, 360*rows))
        for i, t in enumerate(ts):
            c = cairo.Context(surf); frame(c, t, T); surf.flush(); sheet.paste(to_img(surf).resize((640, 360), Image.LANCZOS), ((i % cols)*640, (i//cols)*360))
        out = os.path.join(od, 'story1_check.jpg'); sheet.save(out, quality=88); print('ok stills', out, [round(x, 2) for x in ts]); sys.exit()
    wav = os.path.join(od, name + '.wav'); sf.write(wav, T['audio'], SR)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); gain = -16.0 - I; print('loudness', I, 'gain', round(gain, 1))
    mp4 = os.path.join(od, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
                          '-af', f'volume={gain:.2f}dB,alimiter=limit=0.95:level=false', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', mp4], stdin=subprocess.PIPE)
    for n in range(int(T['end']*FPS)):
        c = cairo.Context(surf); frame(c, n/FPS, T); surf.flush(); p.stdin.write(bytes(surf.get_data()))
    p.stdin.close(); p.wait(); os.remove(wav); print('ok', mp4)
