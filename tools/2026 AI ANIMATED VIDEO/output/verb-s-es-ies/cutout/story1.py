"""故事 1（＋s）：Ken 和媽媽的棒球日 — 畫風 J 剪紙人偶（開頭 4 句）＋KIE Seedance 動作鏡頭（丟球＋打擊、跑步、接球）。8 句故事＋3 題三選一。
v2（老師 11/21）：動作照真實姿勢（規格卡 rdq/RDQ-spec-story1-actions-20261121.md）、字卡加強、倒數 4 秒。v1 備份 story1_v1.py。
python cutout/story1.py [--stills]   → renders/story1-trial-v1.mp4（--stills 只出檢查圖 renders/story1_check.jpg）
座標：世界 1920×1080，地面 y=GROUND；鏡頭 (fx, fy, z)。字幕在螢幕座標。
"""
import sys, os, math, json, subprocess, re, glob, tempfile
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
TMP = os.path.join(tempfile.gettempdir(), 'verbs-story1-frames')
CLIPS = dict(th='throw_hit_720p_1.mp4', run='run_720p_1.mp4', catch='catch_720p_1.mp4')
REL, HIT, CATCH = 2.5, 4.4, 0.4      # 影片裡的秒數：出手、球棒碰到球、球進手套（看抽格量的）
COUNT = 4                                          # 三選一倒數秒數（老師 11/21）


# ---------- KIE 影片 ----------
def clip_frames(name):
    od = os.path.join(TMP, name); os.makedirs(od, exist_ok=True); fs_ = sorted(glob.glob(os.path.join(od, 'f_*.png')))
    if not fs_:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'renders', 'kie', CLIPS[name]), '-vf', f'fps={FPS},scale={W}:{H}:flags=lanczos', os.path.join(od, 'f_%04d.png')], check=True)
        fs_ = sorted(glob.glob(os.path.join(od, 'f_*.png')))
    return fs_
_cache = {}
def draw_clip(c, files, tc):
    """tc＝影片秒數。放大 1.04、往上移 45 px，讓腳不被字幕擋到。"""
    f = files[max(0, min(len(files) - 1, int(tc*FPS)))]
    if _cache.get('f') != f: _cache['f'] = f; _cache['s'] = cairo.ImageSurface.create_from_png(f)
    c.save(); c.translate(W/2, 0); c.scale(1.04, 1.04); c.translate(-W/2, -43); c.set_source_surface(_cache['s'], 0, 0); c.paint(); c.restore()
def tmap(t, keys):
    """影片時間對照：keys＝[(成片秒, 影片秒)…]，中間線性內插。"""
    if t <= keys[0][0]: return keys[0][1]
    for (a, x), (b, y) in zip(keys, keys[1:]):
        if t <= b: return x + (y - x)*(t - a)/max(1e-6, b - a)
    return keys[-1][1]
_flame = {}
def flame(c, x, y, h, alpha=1.0, rot=0.0):
    if 's' not in _flame:
        im = Image.open(os.path.join(ROOT, 'assets', 'flame_cut.png')).convert('RGBA'); im.thumbnail((400, 400)); a = np.array(im).astype(np.float32); a[..., :3] *= a[..., 3:4]/255
        b = np.ascontiguousarray(a[..., [2, 1, 0, 3]].astype(np.uint8)); _flame['s'] = cairo.ImageSurface.create_for_data(memoryview(b), cairo.FORMAT_ARGB32, im.width, im.height, im.width*4); _flame['wh'] = im.size; _flame['b'] = b
    w, hh = _flame['wh']; k = h/hh
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k); c.set_source_surface(_flame['s'], -w/2, -hh/2); c.paint_with_alpha(alpha); c.restore()


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

def verb_card(c, t, t0, x, y, stem, suf, size=150):
    """動詞大字卡（v2 加強）：字幹先出現 → 小火苗飛來貼到字尾 → 變成紅色 s，放大彈一下、閃紅光。t0＝唸到這個字的時間。"""
    ta = t0 - 0.3
    if t < ta: return
    k = E.pop(t, ta); E.font(c, size); ws, we = c.text_extents(stem).x_advance, c.text_extents(suf).x_advance if suf else 0; w = ws + we + 130; h = size*1.5
    hit = t0 + 0.12; ks = E.pop(t, hit, 0.4) if suf else 0
    c.save(); c.translate(x, y); c.rotate(-0.03); c.scale(E.S(k), E.S(k))
    rrect(c, -w/2 + 10, -h/2 + 12, w, h, 36); c.set_source_rgba(0, 0, 0, 0.28); c.fill()
    rrect(c, -w/2, -h/2, w, h, 36); fs(c, hexc('fffaf0'), 7)
    c.move_to(-(ws + we)/2, size*0.34); c.set_source_rgba(*NAVY); c.show_text(stem)
    if suf:
        sx = -(ws + we)/2 + ws + we/2; sy = size*0.34
        if t >= hit:
            pulse = max(0.0, 1 - (t - hit)/0.7)                                   # 紅光
            g = cairo.RadialGradient(sx, sy - size*0.3, 5, sx, sy - size*0.3, size*(0.9 + 0.5*pulse)); g.add_color_stop_rgba(0, 1, 0.35, 0.2, 0.75*pulse); g.add_color_stop_rgba(1, 1, 0.35, 0.2, 0)
            c.set_source(g); c.rectangle(sx - size*1.6, sy - size*1.9, size*3.2, size*3.2); c.fill()
            sc = E.S(ks)*(1 + 0.35*pulse); c.save(); c.translate(sx, sy); c.scale(sc, sc); c.move_to(-we/2, 0); c.set_source_rgba(1, 1, 1, 1); c.set_line_width(size*0.12); c.set_line_join(1)
            c.text_path(suf); c.stroke_preserve(); c.set_source_rgba(*RED); c.fill(); c.restore()
        if ta + 0.05 <= t < hit + 0.25:                                           # 小火苗從右上飛來
            kf = ease((t - ta - 0.05)/(hit - ta - 0.05)); fx = lerp(w/2 + 260, sx, kf); fy = lerp(-h/2 - 220, sy - size*0.3, kf) - 60*math.sin(kf*math.pi)
            flame(c, fx, fy, lerp(170, 110, kf), alpha=1 - clamp((t - hit)/0.25), rot=0.15*math.sin(t*14))
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
    lh = size*1.45; yb = H - 84 - 28           # 字幕框底邊離畫面底 89 px（≥84）
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
    cl = {k: clip_frames(k) for k in CLIPS}; T['clips'] = cl; d = {k: len(v)/FPS for k, v in cl.items()}
    # 鏡頭 1（丟球＋打擊）：出手對到 throws、球棒碰球對到 hits；碰球前後 0.6 秒放慢成 0.25 倍
    T['d0'] = T['c1']; T['A05'] = load_line('A05', T['d0'] + REL - 0.75); T['tr'] = T['d0'] + REL
    fc = T['d0'] + HIT; T['th'] = fc + 0.1
    T['A06'] = load_line('A06', 0.0); off = T['A06']['words'][1][0]; T['A06'] = load_line('A06', max(T['A05']['t1'] + 0.25, T['th'] - off - 0.05))
    slow = max(0.0, T['A06']['words'][1][0] + 0.05 - T['th'])                  # 句子排不進去時，把影片往後延（碰球前停格）
    T['th'] += slow; fc += slow
    T['k1'] = [(T['d0'], 0.0), (T['d0'] + HIT - 0.4, HIT - 0.4), (fc - 0.1, HIT - 0.1) if slow else (fc - 0.1, HIT - 0.1), (fc + 0.5, HIT + 0.05), (fc + 0.5 + d['th'] - HIT - 0.05, d['th'])]
    T['e1'] = max(T['A06']['t1'] + 0.7, T['k1'][-1][0] + 0.3)
    # 鏡頭 2（跑步）
    T['A07'] = load_line('A07', T['e1'] + 0.6); T['f1'] = min(T['e1'] + d['run'] - 0.1, T['A07']['t1'] + 1.7)
    # 鏡頭 3（接球）：球進手套對到 gets
    T['A08'] = load_line('A08', T['f1'] + 0.9); T['tg'] = T['A08']['words'][1][0] + 0.12
    T['k3'] = [(T['f1'], 0.0), (T['tg'] - 0.25, max(0.0, CATCH - 0.25)), (T['tg'], CATCH), (T['tg'] + d['catch'] - CATCH, d['catch'])]
    T['g1'] = max(T['A08']['t1'] + 2.2, T['k3'][-1][0] - 0.2)
    # 三選一
    QS = [dict(pre='Mom', post='the ball.', ans=('throw', 's'), opts=['throws', 'throw', 'throwies'], voice='A05'),
          dict(pre='Ken', post='the ball.', ans=('hit', 's'), opts=['hit', 'hits', 'hites'], voice='AQ2'),
          dict(pre='We', post='baseball at the park.', ans=('play', ''), opts=['plays', 'play', 'playes'], voice='A04')]
    t = T['g1'] + 0.4; T['AQ0'] = load_line('AQ0', t + 0.5); T['quiz'] = []
    for i, q in enumerate(QS):
        q = dict(q); q['t0'] = t; q['c0'] = t + (1.7 if i == 0 else 1.0); q['rev'] = q['c0'] + COUNT
        q['line'] = load_line(q['voice'], q['rev'] + 0.35); q['line']['id'] = f'Q{i}'; q['t1'] = q['line']['t1'] + 1.3; t = q['t1']; T['quiz'].append(q)
    T['end'] = t + 0.6
    n = int(T['end']*SR) + 1; voice = np.zeros(n, np.float32)
    for k in ('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'AQ0'): put(voice, T[k]['audio'], T[k]['t0'])
    for q in T['quiz']: put(voice, q['line']['audio'], q['line']['t0'])
    T['env'] = L.envelope(voice, FPS); audio = voice.copy()
    put(audio, SFX['whoosh'](), 0.2); put(audio, SFX['ding'](), wt('A02', 4, 0.12)); put(audio, SFX['pop'](), wt('A03', 2)); put(audio, SFX['pop'](), wt('A04', 1))
    put(audio, SFX['whoosh'](), T['tr']); put(audio, SFX['ding'](), wt('A05', 1, 0.12)); put(audio, SFX['crack'](), T['th'] - 0.1); put(audio, SFX['ding'](), wt('A06', 1, 0.12)); put(audio, SFX['ding'](), wt('A06', 4))
    put(audio, SFX['ding'](), wt('A07', 1, 0.12)); put(audio, SFX['catch'](), T['tg']); put(audio, SFX['ding'](), wt('A08', 1, 0.12))
    for q in T['quiz']:
        put(audio, SFX['whoosh'](), q['t0'])
        for i in range(COUNT): put(audio, SFX['beep'](), q['c0'] + i)
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
    if a2['words'][4][0] <= t < T['a1'] + 0.2: verb_card(c, t, a2['words'][4][0], 560, 170, 'play', 's', 130)
    if a3['words'][2][0] <= t < T['b1'] + 0.2: sun_card(c, t, a3['words'][2][0], 400, 250)
    if a4['words'][1][0] <= t: verb_card(c, t, a4['words'][1][0], 440, 200, 'play', '', 130)

def game(c, t, T):
    """A05–A08：KIE 影片三個鏡頭（丟球＋打擊、跑步、接球），鏡頭之間 0.3 秒交叉淡化。"""
    a5, a6, a7, a8 = T['A05'], T['A06'], T['A07'], T['A08']; cl = T['clips']; X = 0.3
    def s1(tt): draw_clip(c, cl['th'], tmap(tt, T['k1']))
    def s2(tt): draw_clip(c, cl['run'], tt - T['e1'])
    def s3(tt): draw_clip(c, cl['catch'], tmap(tt, T['k3']))
    if t < T['e1']: s1(t)
    elif t < T['f1']:
        s2(t)
        if t < T['e1'] + X: c.push_group(); s1(T['e1']); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - T['e1'])/X)
    else:
        s3(t)
        if t < T['f1'] + X: c.push_group(); s2(T['f1']); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - T['f1'])/X)
    if a5['words'][1][0] - 0.3 <= t < a6['t0'] - 0.1: verb_card(c, t, a5['words'][1][0], 1540, 160, 'throw', 's', 130)
    if a6['words'][1][0] - 0.3 <= t < T['e1'] - 0.1:
        verb_card(c, t, a6['words'][1][0], 1560, 160, 'hit', 's', 130)
        if t >= a6['words'][4][0]: E.bigword(c, t, a6['words'][4][0], 1040, 330, 'Wow!', 120, col=(1, 0.85, 0.3))
    if a7['words'][1][0] - 0.3 <= t < T['f1'] - 0.05: verb_card(c, t, a7['words'][1][0], 1180, 170, 'run', 's')
    if a8['words'][1][0] - 0.3 <= t: verb_card(c, t, a8['words'][1][0], 1180, 170, 'get', 's')

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
        el = t - q['c0']; left = COUNT - int(el); c.new_path(); c.arc(W/2, 900, 62, 0, 6.3); c.set_source_rgba(0.1, 0.07, 0.2, 0.75); c.fill()
        c.new_path(); c.arc(W/2, 900, 62, -math.pi/2, -math.pi/2 + 2*math.pi*(1 - el/COUNT)); stroke(c, 14, hexc('ffb02e')); E.text_c(c, str(left), W/2, 926, 76, (1, 1, 1))

def frame(c, t, T):
    X = 0.3
    if t < T['a0']:                                                           # 片頭卡
        park(c, t); c.rectangle(0, 0, W, H); c.set_source_rgba(0.12, 0.08, 0.3, 0.55); c.fill()
        E.bigword(c, t, 0.2, W/2, 380, 'Story 1', 190); verb_card(c, t, 1.0, W/2, 650, 'verb + ', 's', 120)
    elif t < T['c1']: intro(c, t, T)
    elif t < T['g1']:
        game(c, t, T)
        if t < T['c1'] + X: c.push_group(); intro(c, T['c1'] - 0.01, T); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - T['c1'])/X)
    else:
        i = next((k for k, q in enumerate(T['quiz']) if t < q['t1']), len(T['quiz']) - 1); quiz(c, t, T, T['quiz'][i], i)
    if T['a0'] <= t < T['g1']: E.vignette(c, 0.25)
    cur = next((T[k] for k in ('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08') if T[k]['t0'] - 0.15 <= t <= T[k]['t1'] + 0.35), None)
    if '--nokara' not in sys.argv: karaoke(c, t, cur)          # 聽力版：不出卡拉 OK 字幕


def to_img(surf): return Image.frombuffer('RGBA', (W, H), bytes(surf.get_data()), 'raw', 'BGRA', 0, 1).convert('RGB')

if __name__ == '__main__':
    E.FONT = 'Comic Relief'; od = os.path.join(ROOT, 'renders'); T = build(); name = next((a for a in sys.argv[1:] if not a.startswith('--') and not re.match(r'^[\d.]+$', a)), 'story1-trial-v2')
    print({k: (round(T[k]['t0'], 2), round(T[k]['t1'], 2)) for k in ('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08')}, 'tr', round(T['tr'], 2), 'th', round(T['th'], 2), 'tg', round(T['tg'], 2), 'end', round(T['end'], 2))
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    if '--stills' in sys.argv:
        q = T['quiz']
        ts = [1.6, T['A01']['t0'] + 1.0, T['A02']['t0'] + 3.0, T['A03']['t0'] + 2.0, T['A04']['t1'] + 0.3, T['tr'] - 0.3, T['tr'] + 0.25, T['th'] - 0.6, T['th'] - 0.1, T['th'] + 0.6,
              T['A07']['t0'] + 0.9, T['f1'] - 0.3, T['tg'] - 0.3, T['tg'] + 0.8, q[0]['c0'] + 1.5, q[0]['rev'] + 1.0, q[1]['rev'] + 1.0, q[2]['rev'] + 1.0]
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
