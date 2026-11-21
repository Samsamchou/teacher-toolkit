"""故事 3（＋ies）：Zun-Bo 的風箏 — 畫風 J 剪紙人偶（C01–C03 介紹）＋KIE Seedance 動作鏡頭（放風箏、試放＋卡樹、哭、跑來幫忙、竹竿取風箏、開心放風箏）。9 句故事＋3 題三選一。
結構照 story1.py（共用元件直接 import story1 as S1，不改 story1.py）。姿勢檢查點：rdq/RDQ-spec-story3-actions-20261121.md。
python cutout/story3.py [名稱] [--stills [秒…]]   → renders/<名稱>.mp4＋-720p（--stills 只出檢查圖 renders/story3_check.jpg）
【佔位模式】renders/kie/<鏡頭>_720p_1.mp4 還沒拍時，該鏡頭用首幀 PNG（assets/firstframes/ff3_*.png）靜態圖慢慢推近 1.00→1.05 代替；影片拍好後自動改播影片。
座標：世界 1920×1080，地面 y=GROUND；鏡頭 (fx, fy, z)。字幕在螢幕座標。風向：左 → 右。
"""
import sys, os, math, json, subprocess, re, glob, tempfile
import numpy as np, cairo, soundfile as sf
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..'); sys.path.insert(0, HERE)
import cast as K, lipsync as L
import story1 as S1
import story3_bg as BG
from cast import E, hexc, rrect, poly, stroke, fs, LINE
from story1 import tmap, flame, put, music, cam_at, fy_for, verb_card, run_pose, SFX, tone, to_img
W, H, FPS, SR = 1920, 1080, 30, L.SR
GROUND, SC = 780, 0.92
RED = hexc('e8413c'); NAVY = hexc('1d1240')
SUF = dict(studies='ies', flies='ies', tries='ies', cries='ies', hurries='ies')      # 動詞字尾（永遠紅色）；字幹＝去掉 ies（stud、fl、tr、cr、hurr）
ease, lerp, clamp = E.ease, E.lerp, E.clamp
TMP = os.path.join(tempfile.gettempdir(), 'verbs-story3-frames')
COUNT = 4                                          # 三選一倒數秒數（老師 11/21）
USE_HELP = True                                    # 竹竿取風箏那一鏡（沒有台詞；要省 KIE 點數改 False）

# ---------- KIE 動作鏡頭（還沒拍 → 佔位）----------
SHOTS = dict(                                      # 鏡頭名＝kie_actions_s3.py 的 SHOTS；dur＝預計拍的秒數
    fly=dict(clip='s3_fly_720p_1.mp4', ff='ff3_fly.png', dur=5),
    try_=dict(clip='s3_try_720p_1.mp4', ff='ff3_try.png', dur=6),
    cry=dict(clip='s3_cry_720p_1.mp4', ff='ff3_cry.png', dur=5),          # C07（老師 11/21：哭也拍 KIE，不用程式人偶）
    hurry=dict(clip='s3_hurry_720p_1.mp4', ff='ff3_hurry.png', dur=5),
    help=dict(clip='s3_help_720p_1.mp4', ff='ff3_help.png', dur=5),
    happy=dict(clip='s3_happy_720p_1.mp4', ff='ff3_happy.png', dur=5),
)
# 影片裡的事件秒數（KIE 拍好後看抽格量，再改這裡對時；佔位模式下只影響音效和字卡時間）
STUCK = 3.9      # try_：風箏碰到樹、卡住
CRY = 1.5        # cry：哭得最清楚的時候（眼淚掉、肩膀抖）→ 對到旁白唸「cries」
ARRIVE = 4.0     # hurry：水鈴跑到圳寶旁邊
FREE = 3.0       # help：風箏離開樹枝
# 動詞字卡位置（螢幕座標；左上角天空，首幀都留空 → 不擋臉、不擋風箏）
CARD = dict(C04=(470, 180), C05=(470, 180), C07=(1010, 165), C08=(750, 160), C09=(470, 180))


def clip_frames(name):
    od = os.path.join(TMP, name); os.makedirs(od, exist_ok=True); fs_ = sorted(glob.glob(os.path.join(od, 'f_*.png')))
    if not fs_:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'renders', 'kie', SHOTS[name]['clip']), '-vf', f'fps={FPS},scale={W}:{H}:flags=lanczos', os.path.join(od, 'f_%04d.png')], check=True)
        fs_ = sorted(glob.glob(os.path.join(od, 'f_*.png')))
    return fs_

def img_surf(path, size=None, cover=None):
    """PNG → cairo surface（預乘 alpha）。cover=(w,h)：裁成同比例再縮放填滿。"""
    im = Image.open(path).convert('RGBA')
    if cover:
        w, h = cover; r = w/h
        if im.width/im.height > r: nw = int(im.height*r); im = im.crop(((im.width - nw)//2, 0, (im.width - nw)//2 + nw, im.height))
        else: nh = int(im.width/r); im = im.crop((0, (im.height - nh)//2, im.width, (im.height - nh)//2 + nh))
        im = im.resize((w, h), Image.LANCZOS)
    elif size: im.thumbnail(size, Image.LANCZOS)
    a = np.array(im).astype(np.float32); a[..., :3] *= a[..., 3:4]/255; b = np.ascontiguousarray(a[..., [2, 1, 0, 3]].astype(np.uint8))
    s = cairo.ImageSurface.create_for_data(memoryview(b), cairo.FORMAT_ARGB32, im.width, im.height, im.width*4); return s, b, im.size

def load_shots():
    """每個鏡頭：有 KIE 影片 → frames；沒有 → 首幀靜態圖（佔位）。"""
    out = {}
    for n, s in SHOTS.items():
        mp4 = os.path.join(ROOT, 'renders', 'kie', s['clip'])
        if os.path.exists(mp4): fr = clip_frames(n); out[n] = dict(kind='clip', files=fr, dur=len(fr)/FPS)
        else:
            surf, keep, _ = img_surf(os.path.join(ROOT, 'assets', 'firstframes', s['ff']), cover=(W, H)); out[n] = dict(kind='still', surf=surf, keep=keep, dur=float(s['dur']))
    return out

def draw_shot(c, sh, tc):
    """tc＝鏡頭秒數。和 story1 一樣放大 1.04、往上移 43 px（腳不被字幕擋）；佔位靜態圖再慢慢推近 1.00→1.05。"""
    if sh['kind'] == 'clip': S1.draw_clip(c, sh['files'], tc); return
    z = 1.04*(1 + 0.05*clamp(tc/sh['dur']))
    c.save(); c.translate(W/2, H*0.42); c.scale(z, z); c.translate(-W/2, -H*0.42 - 43/1.04); c.set_source_surface(sh['surf'], 0, 0); c.paint(); c.restore()


# ---------- 聲音 ----------
_man = {}
def load_line(lid, t0):
    if not _man:
        for f in ('manifest.json', 'manifest_s3.json'):      # AQ0 在 manifest.json（只讀）；C01–C09 在 manifest_s3.json
            for m in json.load(open(os.path.join(ROOT, 'audio', 'story', f), encoding='utf-8')): _man[m['id']] = m
    base = os.path.join(ROOT, 'audio', 'story', lid); ph = json.load(open(base + '_phones.json')); a, _ = sf.read(base + '.wav')
    words = {}
    for p in ph:
        w = words.setdefault(p['wi'], [p['t0'] + t0, p['t1'] + t0, p['word']]); w[1] = p['t1'] + t0
    man = _man[lid]
    return dict(id=lid, who=man['who'], text=man['text'], audio=a.astype(np.float32), t0=t0, t1=t0 + len(a)/SR, words=[tuple(words[k]) for k in sorted(words)], track=L.build_track(ph, t0))

def wind_sfx(dur=1.6, amp=0.16):
    n = int(dur*SR); x = np.convolve(np.random.RandomState(7).randn(n), np.ones(60)/60, 'same'); tt = np.linspace(0, 1, n)
    return (x*np.sin(np.pi*tt)**2*(0.7 + 0.3*np.sin(tt*9))*amp*6).astype(np.float32)
def sad_sfx(): return np.concatenate([tone([(392, 1.0)], 0.28, 5, 0.16), tone([(311, 1.0)], 0.5, 4, 0.16)])
def rustle_sfx():
    n = int(0.35*SR); return (np.random.RandomState(9).randn(n)*np.exp(-np.arange(n)/SR*9)*0.16).astype(np.float32)
def steps_sfx(nstep=7, gap=0.26):
    a = np.zeros(int((nstep*gap + 0.2)*SR), np.float32)
    for i in range(nstep): s = int(i*gap*SR); b = tone([(150, 1.0), (90, 0.6)], 0.08, 50, 0.22); a[s:s + len(b)] += b
    return a


# ---------- 畫面元件 ----------
def ies_card(c, t, t0, x, y, base, size=130):
    """-ies 動詞字卡：先出現原形（fly）→ y 被紅線劃掉 → 小火苗飛來，y 換成紅色 ies（flies），放大彈一下、閃紅光。
    base＝原形（字尾是 y）；t0＝唸到這個字的時間。"""
    stem = base[:-1]; ta = t0 - 0.85; cross = t0 - 0.35; hit = t0 + 0.12
    if t < ta: return
    k = E.pop(t, ta); E.font(c, size); adv = lambda s: c.text_extents(s).x_advance
    ws, wy, we = adv(stem), adv('y'), adv('ies'); w = ws + we + 130; h = size*1.5
    c.save(); c.translate(x, y); c.rotate(-0.03); c.scale(E.S(k), E.S(k))
    rrect(c, -w/2 + 10, -h/2 + 12, w, h, 36); c.set_source_rgba(0, 0, 0, 0.28); c.fill()
    rrect(c, -w/2, -h/2, w, h, 36); fs(c, hexc('fffaf0'), 7)
    x0 = -(ws + we)/2; by = size*0.34
    c.move_to(x0, by); c.set_source_rgba(*NAVY); c.show_text(stem)
    sx = x0 + ws + we/2
    if t < hit:
        c.move_to(x0 + ws, by); c.set_source_rgba(*NAVY[:3], 1.0 if t < cross else 0.55); c.show_text('y')
        if t >= cross:                                                             # 紅線把 y 劃掉
            kx = clamp((t - cross)/0.16); xa, ya, xb, yb = x0 + ws - 6, by + size*0.20, x0 + ws + wy + 6, by - size*0.50
            c.new_path(); c.move_to(xa, ya); c.line_to(lerp(xa, xb, kx), lerp(ya, yb, kx)); c.set_source_rgba(*RED); c.set_line_width(size*0.10); c.set_line_cap(1); c.stroke()
    else:
        pulse = max(0.0, 1 - (t - hit)/0.7); ks = E.pop(t, hit, 0.4)
        g = cairo.RadialGradient(sx, by - size*0.3, 5, sx, by - size*0.3, size*(1.1 + 0.5*pulse)); g.add_color_stop_rgba(0, 1, 0.35, 0.2, 0.75*pulse); g.add_color_stop_rgba(1, 1, 0.35, 0.2, 0)
        c.set_source(g); c.rectangle(sx - size*1.9, by - size*1.9, size*3.8, size*3.2); c.fill()
        sc = E.S(ks)*(1 + 0.3*pulse); c.save(); c.translate(sx, by); c.scale(sc, sc); c.move_to(-we/2, 0); c.set_source_rgba(1, 1, 1, 1); c.set_line_width(size*0.12); c.set_line_join(1)
        c.text_path('ies'); c.stroke_preserve(); c.set_source_rgba(*RED); c.fill(); c.restore()
        kg = (t - hit)/0.6                                                         # 被換掉的 y 往上飄走
        if kg < 1: E.font(c, size*0.6); c.move_to(x0 + ws + 10, by - size*0.75 - 70*kg); c.set_source_rgba(*NAVY[:3], 0.6*(1 - kg)); c.show_text('y'); E.font(c, size)
    if ta + 0.3 <= t < hit + 0.25:                                                 # 小火苗從右上飛來
        kf = ease(clamp((t - ta - 0.3)/(hit - ta - 0.3))); fx = lerp(w/2 + 260, sx, kf); fy = lerp(-h/2 - 220, by - size*0.3, kf) - 60*math.sin(kf*math.pi)
        flame(c, fx, fy, lerp(170, 110, kf), alpha=1 - clamp((t - hit)/0.25), rot=0.15*math.sin(t*14))
    c.restore()

def karaoke(c, t, seg):
    """卡拉 OK：唸到的字變黃；動詞字尾 ies 永遠紅色。太長自動分兩行。（同 story1，SUF 換成故事 3）"""
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

def wind_card(c, t, t0, x, y):
    """SUNDAY 月曆卡＋風的圖示（三條捲捲的風線）。"""
    if t < t0: return
    k = E.pop(t, t0); c.save(); c.translate(x, y); c.rotate(-0.04); c.scale(E.S(k), E.S(k))
    rrect(c, -190 + 8, -120 + 10, 380, 240, 26); c.set_source_rgba(0, 0, 0, 0.25); c.fill()
    rrect(c, -190, -120, 380, 240, 26); fs(c, hexc('fffaf0'), 5); rrect(c, -190, -120, 380, 74, 26); fs(c, hexc('e8413c'), 5)
    E.text_c(c, 'SUNDAY', 0, -70, 54, (1, 1, 1))
    for i, (yy, ln) in enumerate(((0, 150), (40, 200), (80, 120))):
        x0 = -120 + i*14 + 8*math.sin(t*4 + i*1.7); x1 = x0 + ln
        c.new_path(); c.move_to(x0, yy); c.line_to(x1, yy); c.curve_to(x1 + 40, yy, x1 + 40, yy - 40, x1 + 8, yy - 36); c.curve_to(x1 - 8, yy - 32, x1 - 4, yy - 16, x1 + 10, yy - 18)
        c.set_source_rgba(*hexc('4a9be0')); c.set_line_width(11); c.set_line_cap(1); c.stroke()
    c.restore()

_img = {}
def prop(c, name, x, y, h, rot=0.0):
    if name not in _img: _img[name] = img_surf(os.path.join(ROOT, 'assets', name), size=(500, 500))
    s, _, (w, hh) = _img[name]; k = h/hh
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k); c.set_source_surface(s, -w/2, -hh/2); c.paint(); c.restore()


# ---------- 時間軸 ----------
def build():
    T = {}; wt = lambda k, i, d=0.0: T[k]['words'][i][0] + d
    T['a0'] = 2.6
    T['C01'] = load_line('C01', T['a0'] + 0.6); T['C02'] = load_line('C02', T['C01']['t1'] + 1.5); T['a1'] = T['C02']['t1'] + 0.8
    T['C03'] = load_line('C03', T['a1'] + 0.5); T['c1'] = T['C03']['t1'] + 1.2
    sh = load_shots(); T['shots'] = sh; d = {k: v['dur'] for k, v in sh.items()}
    # 鏡頭 fly（C04 Ken flies a kite.）
    T['d0'] = T['c1']; T['C04'] = load_line('C04', T['d0'] + 1.1); T['e1'] = max(T['C04']['t1'] + 2.0, T['d0'] + d['fly'] - 0.1)
    T['kfly'] = [(T['d0'], 0.0), (T['e1'], d['fly'])]
    # 鏡頭 try_（C05 tries ＋ C06 Oh no! 卡樹，一鏡到底）：風箏卡住（STUCK）對到「Oh no!」
    T['C05'] = load_line('C05', T['e1'] + 0.6); T['C06'] = load_line('C06', max(T['C05']['t1'] + 0.5, T['e1'] + STUCK - 0.15)); T['ts'] = T['C06']['t0'] + 0.15
    T['f1'] = max(T['C06']['t1'] + 0.9, T['ts'] + d['try_'] - STUCK)
    T['ktry'] = [(T['e1'], 0.0), (T['ts'], STUCK), (T['ts'] + d['try_'] - STUCK, d['try_'])]
    # 鏡頭 cry（C07 Zun-Bo cries.）：哭得最清楚（CRY）對到「cries」
    T['C07'] = load_line('C07', T['f1'] + 0.9); T['tc'] = T['C07']['words'][1][0] + 0.1; T['g1'] = max(T['C07']['t1'] + 1.9, T['tc'] + d['cry'] - CRY - 0.1)
    T['kcry'] = [(T['f1'], max(0.0, CRY - (T['tc'] - T['f1']))), (T['tc'], CRY), (T['tc'] + d['cry'] - CRY, d['cry'])]
    # 鏡頭 hurry（C08 Shuiling hurries to help.）
    T['C08'] = load_line('C08', T['g1'] + 0.7); T['h1'] = max(T['C08']['t1'] + 1.6, T['g1'] + d['hurry'] - 0.1)
    T['khur'] = [(T['g1'], 0.0), (T['h1'], d['hurry'])]
    # 鏡頭 help（沒有台詞：竹竿把風箏挑下來）
    T['i1'] = T['h1'] + (d['help'] - 0.1 if USE_HELP else 0.0); T['tf'] = T['h1'] + FREE
    # 鏡頭 happy（C09 Now Zun-Bo flies the kite. He is happy!）
    T['C09'] = load_line('C09', T['i1'] + 0.7); T['j1'] = max(T['C09']['t1'] + 1.8, T['i1'] + d['happy'] - 0.1)
    T['khap'] = [(T['i1'], 0.0), (T['j1'], d['happy'])]
    # 三選一（錯誤選項是故意拼錯的字）
    QS = [dict(pre='Ken', post='a kite.', ans=('fl', 'ies'), opts=['flys', 'flies', 'fly'], voice='C04'),
          dict(pre='Zun-Bo', post='.', ans=('cr', 'ies'), opts=['cries', 'crys', 'cry'], voice='C07'),
          dict(pre='Shuiling', post='to help.', ans=('hurr', 'ies'), opts=['hurrys', 'hurry', 'hurries'], voice='C08')]
    t = T['j1'] + 0.4; T['AQ0'] = load_line('AQ0', t + 0.5); T['quiz'] = []
    for i, q in enumerate(QS):
        q = dict(q); q['t0'] = t; q['c0'] = t + (1.7 if i == 0 else 1.0); q['rev'] = q['c0'] + COUNT
        q['line'] = load_line(q['voice'], q['rev'] + 0.35); q['line']['id'] = f'Q{i}'; q['t1'] = q['line']['t1'] + 1.3; t = q['t1']; T['quiz'].append(q)
    T['end'] = t + 0.6
    n = int(T['end']*SR) + 1; voice = np.zeros(n, np.float32)
    for k in LINES + ('AQ0',): put(voice, T[k]['audio'], T[k]['t0'])
    for q in T['quiz']: put(voice, q['line']['audio'], q['line']['t0'])
    T['env'] = L.envelope(voice, FPS); audio = voice.copy()
    put(audio, SFX['whoosh'](), 0.2); put(audio, SFX['ding'](), 1.87); put(audio, SFX['pop'](), wt('C01', 4)); put(audio, SFX['ding'](), wt('C02', 3, 0.12)); put(audio, SFX['pop'](), wt('C03', 2)); put(audio, wind_sfx(), wt('C03', 4, -0.2))
    put(audio, wind_sfx(2.2), T['d0'] + 0.1); put(audio, SFX['ding'](), wt('C04', 1, 0.12))
    put(audio, wind_sfx(1.8), T['e1'] + 0.2); put(audio, SFX['ding'](), wt('C05', 1, 0.12)); put(audio, rustle_sfx(), T['ts']); put(audio, sad_sfx(), T['ts'] + 0.25)
    put(audio, sad_sfx(), T['tc'] + 0.5); put(audio, SFX['ding'](), wt('C07', 1, 0.12)); put(audio, steps_sfx(), T['g1'] + 0.3); put(audio, SFX['ding'](), wt('C08', 1, 0.12))
    if USE_HELP: put(audio, rustle_sfx(), T['tf']); put(audio, SFX['pop'](), T['tf'] + 0.1)
    put(audio, wind_sfx(2.2), T['i1'] + 0.1); put(audio, SFX['ding'](), wt('C09', 2, 0.12)); put(audio, SFX['ding'](), wt('C09', 7))
    for q in T['quiz']:
        put(audio, SFX['whoosh'](), q['t0'])
        for i in range(COUNT): put(audio, SFX['beep'](), q['c0'] + i)
        put(audio, SFX['ding'](), q['rev'])
    audio += music(n, T['env']); T['audio'] = np.clip(audio, -1, 1)
    return T
LINES = ('C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09')


# ---------- 場景 ----------
ZX, KX = 1080, 640          # 介紹段：圳寶、Ken 站的位置（世界 x）
def intro(c, t, T):
    """C01–C03：圳寶拿英文書自我介紹 → Ken 拿著風箏從左邊走進來介紹圳寶 → 星期天、有風。"""
    c1, c2, c3 = T['C01'], T['C02'], T['C03']
    keys = [(T['a0'], (ZX, fy_for(1.0), 1.0)), (c1['t0'] - 0.1, (ZX, fy_for(1.1), 1.1)), (c1['t1'] + 0.1, (ZX, fy_for(1.1), 1.1)), (c2['t0'] - 0.1, (880, fy_for(1.0), 1.0)),
            (T['a1'], (880, fy_for(1.0), 1.0)), (T['c1'], (880, fy_for(1.03), 1.03))]
    fx, fy, z = cam_at(t, keys); c.save(); c.translate(W/2, H/2); c.scale(z, z); c.translate(-fx, -fy); BG.park3(c, t)
    # Ken 從左邊走進來，左手拿著風箏（等一下要放）
    kin = clamp((t - (c1['t1'] + 0.15))/1.15); kx = lerp(-260, KX, ease(kin)); walking = 0 < kin < 1
    ktalk = L.speaking(c2['track'], t); km = L.mouth_at(c2['track'], T['env'], t) if ktalk else 'X'
    khand = {-1: (-96, -206)}
    def kkite(cc): BG.kite(cc, -96 - 44, -206 - 8, 0.72, -0.12 + 0.03*math.sin(t*5), t, tail=True)
    if kin > 0:
        if walking:
            feet, _, bob = run_pose(t*8); feet = {s: (v[0]*0.5, v[1]*0.6 - 8) for s, v in feet.items()}
            K.draw(c, 'ken', t=t, expr='happy', x=kx, y=GROUND + bob*0.4, scale=SC, feet=feet, hands=khand, grips=(-1,), under_hands=kkite)
        else:
            pose = 'present' if c2['t0'] - 0.1 <= t <= c2['t1'] + 0.3 else 'idle'
            K.draw(c, 'ken', t=t + 0.7, pose=pose, expr='happy', mouth=km, blink=((t + 1.3) % 3.3 < 0.12) and not ktalk, x=kx, y=GROUND, scale=SC, hands=khand, grips=(-1,), under_hands=kkite)
    # 圳寶：先揮手說 Hi，再雙手把英文書拿到胸前
    ztalk = L.speaking(c1['track'], t); zm = L.mouth_at(c1['track'], T['env'], t) if ztalk else 0
    up = ease(clamp((t - (c1['words'][3][0] - 0.35))/0.45)); bx, by = lerp(-112, 0, up), lerp(-218, -236, up)
    zh = {-1: (bx - 52, by + 26)}
    if up > 0: zh[1] = (lerp(84, bx + 52, up), lerp(-200, by + 26, up))
    def zbook(cc): prop(cc, 'prop_englishbook_cut.png', bx, by, 104, lerp(-0.25, 0.0, up))
    K.draw(c, 'zunbo', t=t, pose='wave' if up <= 0 and t > T['a0'] + 0.2 else 'idle', expr='happy', mouth=zm, blink=(t % 3.1 < 0.12) and not ztalk, x=ZX, y=GROUND, scale=SC, hands=zh, under_hands=zbook)
    c.restore()
    if c1['words'][2][0] - 0.2 <= t < c1['t1'] + 0.3: E.tag(c, t, c1['words'][2][0] - 0.2, 1420, 250, 'Zun-Bo', None, rot=0.03)
    if c1['words'][4][0] - 0.3 <= t < c1['t1'] + 0.3: verb_card(c, t, c1['words'][4][0], 400, 230, 'study', '', 130)
    if c2['words'][1][0] <= t < T['a1'] + 0.2: E.tag(c, t, c2['words'][1][0], 1560, 170, 'Zun-Bo', None, rot=0.03)
    if c2['words'][3][0] - 0.85 <= t < T['a1'] + 0.2: ies_card(c, t, c2['words'][3][0], 500, 170, 'study', 126)
    if c3['words'][2][0] <= t < T['c1'] + 0.3: wind_card(c, t, c3['words'][2][0], 290, 240)

def action(c, t, T):
    """C04–C09：動作鏡頭（KIE 影片或佔位首幀）；鏡頭之間的轉場在 frame() 做（暗下 0.3 秒再亮起，構圖不同不用交叉淡化，避免重影）。"""
    sh = T['shots']; X = 0.3
    segs = [(T['d0'], lambda tt: draw_shot(c, sh['fly'], tmap(tt, T['kfly']))),
            (T['e1'], lambda tt: draw_shot(c, sh['try_'], tmap(tt, T['ktry']))),
            (T['f1'], lambda tt: draw_shot(c, sh['cry'], tmap(tt, T['kcry']))),
            (T['g1'], lambda tt: draw_shot(c, sh['hurry'], tmap(tt, T['khur'])))]
    if USE_HELP: segs.append((T['h1'], lambda tt: draw_shot(c, sh['help'], tt - T['h1'])))
    segs.append((T['i1'], lambda tt: draw_shot(c, sh['happy'], tmap(tt, T['khap']))))
    i = max(k for k, (ts, _) in enumerate(segs) if t >= ts or k == 0); ts, fn = segs[i]; fn(t)
    c4, c5, c6, c7, c8, c9 = (T[k] for k in ('C04', 'C05', 'C06', 'C07', 'C08', 'C09'))
    if c4['words'][1][0] - 0.85 <= t < T['e1'] - 0.05: ies_card(c, t, c4['words'][1][0], *CARD['C04'], 'fly')
    if c5['words'][1][0] - 0.85 <= t < c6['t0'] - 0.1: ies_card(c, t, c5['words'][1][0], *CARD['C05'], 'try')
    if c6['t0'] <= t < T['f1'] - 0.05: E.bigword(c, t, c6['t0'], 520, 230, 'Oh no!', 120, col=(1, 0.85, 0.3))
    if c7['words'][1][0] - 0.85 <= t < T['g1'] - 0.05: ies_card(c, t, c7['words'][1][0], *CARD['C07'], 'cry')
    if c8['words'][1][0] - 0.85 <= t < T['h1'] - 0.05: ies_card(c, t, c8['words'][1][0], *CARD['C08'], 'hurry')
    if c9['words'][2][0] - 0.85 <= t: ies_card(c, t, c9['words'][2][0], *CARD['C09'], 'fly')

def quiz(c, t, T, q, idx):
    BG.park3(c, t); c.rectangle(0, 0, W, H); c.set_source_rgba(1, 1, 1, 0.6); c.fill()
    rev = t >= q['rev']; kr = E.pop(t, q['rev']) if rev else 0
    E.bigword(c, t, q['t0'] + 0.1, W/2, 130, 'Which word?', 96, col=(1, 0.72, 0.2))
    E.text_c(c, f'{idx + 1} / 3', 1790, 90, 40, (0.2, 0.2, 0.3))
    # 句子卡
    size = 104; E.font(c, size); sp = c.text_extents('a b').x_advance - c.text_extents('ab').x_advance; tight = q['post'] in ('.', '!', '?')
    wpre, wpost = c.text_extents(q['pre']).x_advance, c.text_extents(q['post']).x_advance; wans = c.text_extents(q['ans'][0] + q['ans'][1]).x_advance; wb = max(wans, 300) + 30
    sp2 = 6 if tight else sp; tot = wpre + sp + wb + sp2 + wpost; cw = tot + 160; k0 = E.pop(t, q['t0'] + 0.2)
    c.save(); c.translate(W/2, 400); c.scale(E.S(k0), E.S(k0))
    rrect(c, -cw/2 + 8, -130 + 12, cw, 260, 36); c.set_source_rgba(0, 0, 0, 0.2); c.fill(); rrect(c, -cw/2, -130, cw, 260, 36); fs(c, hexc('fffaf0'), 6)
    x = -tot/2; c.move_to(x, 36); c.set_source_rgba(*hexc('2a6fd6')); c.show_text(q['pre']); x += wpre + sp
    c.move_to(x + 6, 62); c.line_to(x + wb - 6, 62); stroke(c, 8, NAVY)
    if rev:
        c.save(); c.translate(x + wb/2, 36); c.scale(E.S(kr), E.S(kr)); c.move_to(-wans/2, 0); c.set_source_rgba(*NAVY); c.show_text(q['ans'][0]); c.set_source_rgba(*RED); c.show_text(q['ans'][1]); c.restore()
    x += wb + sp2; c.move_to(x, 36); c.set_source_rgba(*NAVY); c.show_text(q['post']); c.restore()
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
    if t < T['a0']:                                                           # 片頭卡：Story 3＋y → ies
        BG.park3(c, t); c.rectangle(0, 0, W, H); c.set_source_rgba(0.12, 0.08, 0.3, 0.55); c.fill()
        E.bigword(c, t, 0.2, W/2, 380, 'Story 3', 190); ies_card(c, t, 1.75, W/2, 650, 'y', 120)      # 字卡：y 劃掉、換成紅色 ies（Comic Relief 沒有箭頭字元）
    elif t < T['c1']: intro(c, t, T)
    elif t < T['j1']:
        action(c, t, T)
    else:
        i = next((k for k, q in enumerate(T['quiz']) if t < q['t1']), len(T['quiz']) - 1); quiz(c, t, T, T['quiz'][i], i)
    if T['a0'] <= t < T['j1']: E.vignette(c, 0.25)
    for b in [T[k] for k in ('c1', 'e1', 'f1', 'g1', 'i1')] + ([T['h1']] if USE_HELP else []):      # 鏡頭轉場：暗下 0.3 秒、再亮起 0.3 秒（共用踩坑規則 12.11）
        if abs(t - b) < X: c.rectangle(0, 0, W, H); c.set_source_rgba(0.07, 0.05, 0.15, 1 - abs(t - b)/X); c.fill()
    cur = next((T[k] for k in LINES if T[k]['t0'] - 0.15 <= t <= T[k]['t1'] + 0.35), None)
    if '--nokara' not in sys.argv: karaoke(c, t, cur)          # 聽力版：不出卡拉 OK 字幕


if __name__ == '__main__':
    E.FONT = 'Comic Relief'; od = os.path.join(ROOT, 'renders'); T = build(); name = next((a for a in sys.argv[1:] if not a.startswith('--') and not re.match(r'^[\d.]+$', a)), 'story3-placeholder-v1')
    print({k: (round(T[k]['t0'], 2), round(T[k]['t1'], 2)) for k in LINES}, {k: round(T[k], 2) for k in ('c1', 'e1', 'ts', 'f1', 'g1', 'h1', 'tf', 'i1', 'j1', 'end')})
    print('shots', {k: v['kind'] for k, v in T['shots'].items()})
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    if '--stills' in sys.argv:
        q = T['quiz']
        ts = [1.9, T['C01']['t0'] + 0.5, T['C01']['words'][4][0] + 0.6, T['C02']['t0'] - 0.5, T['C02']['words'][3][0] - 0.2, T['C02']['words'][3][0] + 0.8, T['C03']['t1'] + 0.3,
              T['C04']['words'][1][0] - 0.2, T['C04']['t1'] + 0.8, T['C05']['t1'] + 0.1, T['C06']['t0'] + 1.2, T['C07']['words'][1][0] - 0.2, T['C07']['t1'] + 0.8,
              T['C08']['t1'] + 0.3, T['h1'] + 2.5, T['C09']['words'][2][0] + 0.7, T['C09']['t1'] + 0.5, q[0]['c0'] + 1.5, q[0]['rev'] + 1.0, q[1]['rev'] + 1.0, q[2]['rev'] + 1.0]
        ts = [float(a) for a in sys.argv[sys.argv.index('--stills') + 1:] if re.match(r'^[\d.]+$', a)] or ts
        cols = 4 if len(ts) > 6 else len(ts); rows = math.ceil(len(ts)/cols); sheet = Image.new('RGB', (640*cols, 360*rows))
        for i, t in enumerate(ts):
            c = cairo.Context(surf); frame(c, t, T); surf.flush(); sheet.paste(to_img(surf).resize((640, 360), Image.LANCZOS), ((i % cols)*640, (i//cols)*360))
        out = os.path.join(od, 'story3_check.jpg'); sheet.save(out, quality=88); print('ok stills', out, [round(x, 2) for x in ts]); sys.exit()
    wav = os.path.join(od, name + '.wav'); sf.write(wav, T['audio'], SR)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); gain = -16.0 - I; print('loudness', I, 'gain', round(gain, 1))
    mp4 = os.path.join(od, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
                          '-af', f'volume={gain:.2f}dB,alimiter=limit=0.95:level=false', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', mp4], stdin=subprocess.PIPE)
    for n in range(int(T['end']*FPS)):
        c = cairo.Context(surf); frame(c, n/FPS, T); surf.flush(); p.stdin.write(bytes(surf.get_data()))
    p.stdin.close(); p.wait(); os.remove(wav); print('ok', mp4)
    m720 = os.path.join(od, name + '-720p.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp4, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', m720], check=True); print('ok', m720)
