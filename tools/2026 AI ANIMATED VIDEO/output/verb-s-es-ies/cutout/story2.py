"""故事 2（＋es）：Shuiling 的慢跑星期六 — 畫風 J 剪紙人偶（B01–B03）＋KIE Seedance 動作鏡頭（B04 慢跑、B05 經過老火車站、B06 看電視、B07 寫功課）。
7 句故事＋3 題三選一。結構照 story1.py（共用元件直接 import，不改 story1.py）。姿勢檢查點：rdq/RDQ-spec-story2-actions-20261121.md。
  python cutout/story2.py [--stills [秒…]] [名稱]   → renders/<名稱>.mp4＋<名稱>-720p.mp4（--stills 只出檢查圖 renders/story2_check.jpg）
佔位模式：renders/kie/<鏡頭>_720p_1.mp4 還沒拍時，那一鏡用首幀 assets/firstframes/ff2_*.png 當靜態畫面（慢慢推近 1.00→1.05，左上角標 placeholder）；
拍好後自動改播影片（clip_frames／draw_clip／tmap，和故事 1 一樣），再看抽格把檔頭的 TOOT／LAUGH／WRITE 改成影片裡真正的秒數。
座標：世界 1920×1080，地面 y=GROUND；鏡頭 (fx, fy, z)。字幕、字卡在螢幕座標。
"""
import sys, os, math, json, subprocess, re, glob, tempfile
import numpy as np, cairo, soundfile as sf
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..'); sys.path.insert(0, HERE)
import cast as K, lipsync as L
import story1 as S1                                     # 只借用共用元件（不改它）
from story1 import verb_card, SFX, tone, put, music, tmap, cam_at, fy_for, run_pose, to_img
from cast import E, hexc, rrect, poly, stroke, fs, LINE
W, H, FPS, SR = 1920, 1080, 30, L.SR
GROUND, SC = 780, 0.92
RED = hexc('e8413c'); NAVY = hexc('1d1240')
SUF = dict(goes='es', passes='es', watches='es', does='es')              # 動詞字尾（永遠紅色）
ease, lerp, clamp = E.ease, E.lerp, E.clamp
TMP = os.path.join(tempfile.gettempdir(), 'verbs-story2-frames')
MAN = 'manifest_s2.json'
# 動作鏡頭：clip＝KIE 影片檔（renders/kie/）、ff＝首幀（assets/firstframes/）、tail＝句子唸完後再停幾秒、dy＝畫面再往上移幾 px（讓腳在字幕框上面；底下露出的一小條用最後一列補）、cut＝進這一鏡的轉場（x 交叉淡化／dip 暗下再亮）
SHOTS = [dict(key='jog', clip='jog_720p_1.mp4', ff='ff2_jog.png', line='B04', lead=0.8, tail=1.6, cut='x', dy=45),
         dict(key='station', clip='station_720p_1.mp4', ff='ff2_station.png', line='B05', lead=0.6, tail=0.7, cut='x', dy=45),
         dict(key='tv', clip='tv_720p_1.mp4', ff='ff2_tv.png', line='B06', lead=0.8, tail=0.9, cut='dip', dy=50),
         dict(key='homework', clip='homework_720p_1.mp4', ff='ff2_homework.png', line='B07', lead=0.8, tail=1.9, cut='x', dy=95)]
# 影片裡的秒數（KIE 影片拍好後，看抽格改）：TOOT＝火車冒汽笛白煙、LAUGH＝水鈴開始大笑、WRITE＝鉛筆開始在紙上寫。None＝不對時、照原速播。
JOG = None; TOOT = 3.0; LAUGH = 4.5; WRITE = 0.6    # 11/21 看 720p 抽格量的（homework 影片已剪掉開頭 0.45 秒的跳動，原檔 _raw）
EVENT = dict(jog=(JOG, None), station=(TOOT, 6), tv=(LAUGH, 5), homework=(WRITE, 1))     # (影片秒數, 對到這一句的第幾個字)
COUNT = 4                                                # 三選一倒數秒數（老師 11/21）
# 字卡位置（螢幕座標；不擋臉、不擋主要動作 — 換首幀或影片後要重看 --stills）
CARD = dict(jog=(1330, 190), station=(1010, 130), tv=(960, 150), homework=(470, 200))
WORD = dict(station=(1560, 150), tv=(1110, 410))        # Toot, toot!／Ha ha! 大字位置


# ---------- KIE 影片／首幀佔位 ----------
def clip_frames(sh):
    """有影片 → 抽格檔清單；沒有 → None（佔位模式）。"""
    src = os.path.join(ROOT, 'renders', 'kie', sh['clip'])
    if not os.path.exists(src): return None
    od = os.path.join(TMP, sh['key']); os.makedirs(od, exist_ok=True); fs_ = sorted(glob.glob(os.path.join(od, 'f_*.png')))
    if not fs_ or os.path.getmtime(fs_[0]) < os.path.getmtime(src):
        for f in fs_: os.remove(f)
        subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', src, '-vf', f'fps={FPS},scale={W}:{H}:flags=lanczos', os.path.join(od, 'f_%04d.png')], check=True)
        fs_ = sorted(glob.glob(os.path.join(od, 'f_*.png')))
    return fs_
_cache = {}; _still = {}
def _place(c, z=1.0, dy=0):
    """和故事 1 一樣：放大 1.04、往上移約 45 px（再加 dy），讓腳不被字幕擋到；z＝再推近（以畫面中間偏上為中心）。"""
    c.translate(W/2, H*0.45); c.scale(z, z); c.translate(-W/2, -H*0.45); c.translate(W/2, 0); c.scale(1.04, 1.04); c.translate(-W/2, -43 - dy/1.04)
def _paint(c, surf, dy):
    c.set_source_surface(surf, 0, 0); c.get_source().set_filter(cairo.FILTER_BILINEAR); c.paint()
    if dy > 60:                                                               # 移很多（寫功課）：補左下角的素色（桌子／地板），不拉長（腳會被拉成直條）
        d = surf.get_data(); o = (H - 6)*surf.get_stride() + 30*4; b, g, r = d[o], d[o + 1], d[o + 2]
        c.set_source_rgb(r/255, g/255, b/255); c.rectangle(0, H - 1, W, 80); c.fill()
    elif dy > 0:                                                              # 往上移後底下露出的一小條：把最後兩列拉長補上（那裡是素色地面）
        c.save(); c.translate(0, H - 2); c.scale(1, 60); c.set_source_surface(surf, 0, -(H - 2)); c.get_source().set_filter(cairo.FILTER_NEAREST); c.rectangle(0, 0, W, 2); c.fill(); c.restore()
def draw_clip(c, files, tc, dy=0):
    f = files[max(0, min(len(files) - 1, int(tc*FPS)))]
    if _cache.get('f') != f: _cache['f'] = f; _cache['s'] = cairo.ImageSurface.create_from_png(f)
    c.save(); _place(c, 1.0, dy); _paint(c, _cache['s'], dy); c.restore()
def draw_still(c, sh, k):
    """佔位：首幀靜態畫面，k 0→1 慢慢推近 1.00→1.05。"""
    if sh['key'] not in _still:
        im = Image.open(os.path.join(ROOT, 'assets', 'firstframes', sh['ff'])).convert('RGB'); r = max(W/im.width, H/im.height)
        im = im.resize((round(im.width*r), round(im.height*r)), Image.LANCZOS); x0, y0 = (im.width - W)//2, (im.height - H)//2; im = im.crop((x0, y0, x0 + W, y0 + H))
        b = np.ascontiguousarray(np.dstack([np.array(im)[..., ::-1], np.full((H, W), 255, np.uint8)])); _still[sh['key']] = (cairo.ImageSurface.create_for_data(memoryview(b), cairo.FORMAT_ARGB32, W, H, W*4), b)
    c.save(); _place(c, lerp(1.0, 1.05, clamp(k)), sh['dy']); _paint(c, _still[sh['key']][0], sh['dy']); c.restore()
    E.font(c, 26); c.set_source_rgba(0, 0, 0, 0.45); rrect(c, 24, 20, 372, 44, 10); c.fill(); c.move_to(40, 51); c.set_source_rgba(1, 1, 1, 0.9); c.show_text('placeholder (first frame)')


# ---------- 聲音 ----------
def load_line(lid, t0):
    base = os.path.join(ROOT, 'audio', 'story', lid); ph = json.load(open(base + '_phones.json')); a, _ = sf.read(base + '.wav')
    words = {}
    for p in ph:
        w = words.setdefault(p['wi'], [p['t0'] + t0, p['t1'] + t0, p['word']]); w[1] = p['t1'] + t0
    man = {m['id']: m for m in json.load(open(os.path.join(ROOT, 'audio', 'story', MAN), encoding='utf-8'))}[lid]
    return dict(id=lid, who=man['who'], text=man['text'], audio=a.astype(np.float32), t0=t0, t1=t0 + len(a)/SR, words=[tuple(words[k]) for k in sorted(words)], track=L.build_track(ph, t0))

def whistle():
    """蒸汽火車汽笛（小聲，墊在旁白 Toot 下面）。"""
    n = int(0.42*SR); tt = np.arange(n)/SR; env = np.minimum(1, tt/0.04)*np.minimum(1, (0.42 - tt)/0.12)
    return (sum(a*np.sin(2*np.pi*f*tt*(1 + 0.004*np.sin(2*np.pi*6*tt))) for f, a in ((622, 0.5), (740, 0.35), (932, 0.25)))*env*0.07).astype(np.float32)


# ---------- 畫面元件 ----------
def riverside(c, t):
    """陰天的河邊（B01–B03 和三選一的背景）：灰白雲、遠山、河、草地、步道。"""
    g = cairo.LinearGradient(0, 0, 0, 600)
    for k, col in ((0, 'a9b9c9'), (0.6, 'cfd9e2'), (1, 'e6ecf0')): g.add_color_stop_rgba(k, *hexc(col))
    c.rectangle(-500, -300, W + 1000, 950); c.set_source(g); c.fill()
    for i, (x, y, s, a) in enumerate(((120, 120, 1.5, 0.9), (640, 80, 1.9, 0.8), (1180, 130, 1.6, 0.9), (1680, 90, 1.8, 0.85), (380, 230, 1.2, 0.7), (1450, 250, 1.3, 0.7), (900, 260, 1.1, 0.6))):
        E.cloud(c, x + t*(3 + i % 3), y, s, (0.95 - 0.06*(i % 2), 0.96 - 0.06*(i % 2), 0.98 - 0.05*(i % 2), a))
    for i in range(-2, 9):                                                      # 遠山
        x = i*300 + 80; c.new_path(); c.move_to(x - 260, 540); c.curve_to(x - 120, 400 - 40*(i % 2), x + 120, 400 - 40*(i % 2), x + 260, 540); c.close_path(); fs(c, hexc('8fae9a' if i % 2 else '9dba9f'), 2.4)
    for i in range(-3, 16):                                                     # 對岸的樹
        x = i*170 + 90; c.rectangle(x - 7, 490, 14, 50); fs(c, hexc('8a5a34'), 2.2)
        for dx, dy, r in ((0, -34, 40), (-28, -8, 30), (28, -8, 30)): c.new_path(); c.arc(x + dx, 490 + dy, r, 0, 6.3); fs(c, hexc('5c9458' if i % 2 else '6aa25e'), 2.4)
    c.rectangle(-500, 536, W + 1000, 26); fs(c, hexc('7fae62'), 2.4)            # 對岸
    g = cairo.LinearGradient(0, 560, 0, 660); g.add_color_stop_rgba(0, *hexc('8db4cf')); g.add_color_stop_rgba(1, *hexc('6f9dbd'))
    c.rectangle(-500, 560, W + 1000, 100); c.set_source(g); c.fill(); c.move_to(-500, 560); c.line_to(W + 500, 560); stroke(c, 3)
    for i in range(-4, 14):                                                     # 水波
        x = i*190 + (t*14) % 190; y = 585 + 28*(i % 3); c.move_to(x, y); c.curve_to(x + 18, y - 8, x + 36, y + 8, x + 60, y); stroke(c, 4, (1, 1, 1, 0.55))
    g = cairo.LinearGradient(0, 660, 0, H); g.add_color_stop_rgba(0, *hexc('86bd68')); g.add_color_stop_rgba(1, *hexc('5f9a4a'))
    c.rectangle(-500, 660, W + 1000, 700); c.set_source(g); c.fill(); c.move_to(-500, 660); c.line_to(W + 500, 660); stroke(c, 3)
    c.rectangle(-500, 690, W + 1000, 12); fs(c, hexc('f4efe4'), 2.2)            # 欄杆
    for x in range(-480, W + 500, 120): c.rectangle(x, 668, 12, 62); fs(c, hexc('f4efe4'), 2.2)
    c.rectangle(-500, 742, W + 1000, 130); fs(c, hexc('e2c08e'), 3)             # 步道

def sat_card(c, t, t0, x, y):
    """SATURDAY 月曆卡＋雲圖示（陰天）。"""
    if t < t0: return
    k = E.pop(t, t0); c.save(); c.translate(x, y); c.rotate(-0.04); c.scale(E.S(k), E.S(k))
    rrect(c, -205 + 8, -120 + 10, 410, 240, 26); c.set_source_rgba(0, 0, 0, 0.25); c.fill()
    rrect(c, -205, -120, 410, 240, 26); fs(c, hexc('fffaf0'), 5); rrect(c, -205, -120, 410, 74, 26); fs(c, hexc('e8413c'), 5)
    E.text_c(c, 'SATURDAY', 0, -70, 52, (1, 1, 1))
    def cloud(cx, cy, s, col):
        dx = 6*math.sin(t*0.8 + cx); c.new_path()
        c.move_to(cx + dx - 62*s, cy + 26*s); c.arc(cx + dx - 44*s, cy + 4*s, 24*s, math.pi*0.5, math.pi*1.4); c.arc(cx + dx - 8*s, cy - 16*s, 32*s, math.pi*1.05, math.pi*1.85)
        c.arc(cx + dx + 36*s, cy + 2*s, 26*s, math.pi*1.4, math.pi*0.5); c.close_path(); fs(c, hexc(col), 4)
    cloud(34, 30, 1.0, 'aab4c2'); cloud(-22, 50, 1.15, 'e9edf2')
    c.restore()


def karaoke(c, t, seg):
    """卡拉 OK：唸到的字變黃；動詞字尾 es 永遠紅色。太長自動分兩行。（同 story1，SUF 換成這一段的）"""
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


# ---------- 時間軸 ----------
STORY = ('B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07')
def build():
    T = {}; wt = lambda k, i, d=0.0: T[k]['words'][i][0] + d
    T['a0'] = 2.4
    T['B01'] = load_line('B01', T['a0'] + 0.6); T['B02'] = load_line('B02', T['B01']['t1'] + 1.5); T['a1'] = T['B02']['t1'] + 0.8
    T['B03'] = load_line('B03', T['a1'] + 0.5); T['c1'] = T['B03']['t1'] + 1.0
    # 動作鏡頭：每一鏡＝lead 秒後開始唸 → 唸完再停 tail 秒。有影片時用 EVENT 把影片裡的事件對到那個字。
    t = T['c1']; T['shots'] = []
    for sh in SHOTS:
        s = dict(sh); s['t0'] = t; ln = T[s['line']] = load_line(s['line'], t + s['lead']); s['t1'] = ln['t1'] + s['tail']; s['files'] = clip_frames(s)
        if s['files']:
            d = len(s['files'])/FPS; ev, wi = EVENT[s['key']]
            if ev is None: s['keys'] = [(s['t0'], 0.0), (s['t0'] + d, d)]
            else:
                te = ln['words'][wi][0]; s['keys'] = [(s['t0'], 0.0), (te, ev), (te + (d - ev), d)]
            print(f"clip {s['key']}: {d:.2f}s 影片，鏡頭長 {s['t1'] - s['t0']:.2f}s" + ('  ※影片比鏡頭短，最後會停格' if s['keys'][-1][0] < s['t1'] - 0.05 else ''))
        else: print(f"placeholder {s['key']}: 首幀靜態 {s['t1'] - s['t0']:.2f}s")
        T['shots'].append(s); t = s['t1']
    T['g1'] = t
    # 三選一
    QS = [dict(pre='She', post='the old train station.', ans=('pass', 'es'), opts=['passs', 'passes', 'pass'], voice='BQ1'),
          dict(lead='At home,', pre='she', post='TV.', ans=('watch', 'es'), opts=['watches', 'watchs', 'watch'], voice='BQ2'),
          dict(pre='She', post='her homework, too.', ans=('do', 'es'), opts=['dos', 'do', 'does'], voice='B07')]
    t = T['g1'] + 0.4; T['AQ0'] = load_line('AQ0', t + 0.5); T['quiz'] = []
    for i, q in enumerate(QS):
        q = dict(q); q['t0'] = t; q['c0'] = t + (1.7 if i == 0 else 1.0); q['rev'] = q['c0'] + COUNT
        q['line'] = load_line(q['voice'], q['rev'] + 0.35); q['line']['id'] = f'Q{i}'; q['t1'] = q['line']['t1'] + 1.3; t = q['t1']; T['quiz'].append(q)
    T['end'] = t + 0.6
    n = int(T['end']*SR) + 1; voice = np.zeros(n, np.float32)
    for k in STORY + ('AQ0',): put(voice, T[k]['audio'], T[k]['t0'])
    for q in T['quiz']: put(voice, q['line']['audio'], q['line']['t0'])
    T['env'] = L.envelope(voice, FPS); audio = voice.copy()
    put(audio, SFX['whoosh'](), 0.2); put(audio, SFX['pop'](), wt('B01', 4)); put(audio, SFX['ding'](), wt('B02', 3, 0.12)); put(audio, SFX['pop'](), wt('B03', 2))
    for k in ('B04', 'B05', 'B06', 'B07'): put(audio, SFX['ding'](), wt(k, VERB[k][0], 0.12))
    put(audio, whistle(), wt('B05', 6, -0.05)); put(audio, whistle(), wt('B05', 7, -0.05)); put(audio, SFX['pop'](), wt('B06', 5))
    for s in T['shots'][1:]: put(audio, SFX['whoosh']()*0.5, s['t0'] - 0.15)
    for q in T['quiz']:
        put(audio, SFX['whoosh'](), q['t0'])
        for i in range(COUNT): put(audio, SFX['beep'](), q['c0'] + i)
        put(audio, SFX['ding'](), q['rev'])
    audio += music(n, T['env']); T['audio'] = np.clip(audio, -1, 1)
    return T
VERB = dict(B04=(1, 'go', 'es'), B05=(1, 'pass', 'es'), B06=(3, 'watch', 'es'), B07=(1, 'do', 'es'))   # 句子裡第幾個字是動詞、字幹、字尾


# ---------- 場景 ----------
KEN_X, SHU_X = 740, 1180
def intro(c, t, T):
    """B01–B03：Shuiling 自我介紹 → Ken 從左邊走進來介紹她 → 星期六、陰天。"""
    b1, b2, b3 = T['B01'], T['B02'], T['B03']
    wide = (960, fy_for(1.05), 1.05)
    keys = [(T['a0'], (960, fy_for(1.0), 1.0)), (b1['t0'] - 0.1, (1150, fy_for(1.3), 1.3)), (b1['t1'] + 0.1, (1150, fy_for(1.3), 1.3)), (b2['t0'] - 0.3, wide), (T['a1'], wide),
            (b3['t0'], (960, fy_for(1.0), 1.0)), (T['c1'], (960, fy_for(1.04), 1.04))]
    fx, fy, z = cam_at(t, keys); c.save(); c.translate(W/2, H/2); c.scale(z, z); c.translate(-fx, -fy); riverside(c, t)
    # Ken 從左邊走進來（B02 開口前 0.2 秒站定）
    kin = clamp((t - (b2['t0'] - 1.3))/1.1); kx = lerp(-330, KEN_X, ease(kin)); walking = 0 < kin < 1
    s_talk = L.speaking(b1['track'], t); k_talk = L.speaking(b2['track'], t)
    hi = b1['t0'] - 0.2 <= t < b1['words'][1][0] + 0.25                          # 說 Hi! 時揮手
    K.draw(c, 'shuiling', t=t, pose='wave' if hi else 'idle', expr='happy', mouth=L.mouth_at(b1['track'], T['env'], t) if s_talk else 'X',
           blink=(t % 3.3 < 0.12) and not s_talk, x=SHU_X, y=GROUND, scale=SC)
    if kin > 0:
        if walking:
            feet, hands, bob = run_pose(t*8); feet = {s: (v[0]*0.5, v[1]*0.6 - 8) for s, v in feet.items()}
            K.draw(c, 'ken', t=t, expr='happy', x=kx, y=GROUND + bob*0.4, scale=SC, feet=feet)
        else:
            pose = 'present' if b2['t0'] - 0.1 <= t <= b2['t1'] + 0.3 else 'idle'
            K.draw(c, 'ken', t=t + 0.7, pose=pose, expr='happy', mouth=L.mouth_at(b2['track'], T['env'], t) if k_talk else 'X', blink=((t + 1.3) % 3.3 < 0.12) and not k_talk, x=kx, y=GROUND, scale=SC)
    c.restore()
    if b1['words'][2][0] <= t < b1['t1'] + 0.15: E.tag(c, t, b1['words'][2][0], 1500, 300, 'Shuiling', None, rot=0.03)
    if b1['words'][4][0] <= t < b1['t1'] + 0.15: verb_card(c, t, b1['words'][4][0], 400, 330, 'go', '', 130)
    if b2['words'][1][0] <= t < T['a1'] + 0.2: E.tag(c, t, b2['words'][1][0], 1560, 190, 'Shuiling', None, rot=0.03)
    if b2['words'][3][0] - 0.3 <= t < T['a1'] + 0.2: verb_card(c, t, b2['words'][3][0], 440, 170, 'go', 'es', 130)
    if b3['words'][2][0] <= t: sat_card(c, t, b3['words'][2][0], 380, 240)

def draw_shot(c, s, t):
    if s['files']: draw_clip(c, s['files'], tmap(t, s['keys']), s['dy'])
    else: draw_still(c, s, (t - s['t0'])/(s['t1'] - s['t0']))

def action(c, t, T):
    """B04–B07：四個動作鏡頭（KIE 影片或首幀佔位）。x＝0.3 秒交叉淡化；dip＝暗下 0.3 秒再亮（換地點）。"""
    X = 0.3; sh = T['shots']; i = next((k for k, s in enumerate(sh) if t < s['t1']), len(sh) - 1); s = sh[i]; draw_shot(c, s, t)
    if i > 0 and s['cut'] == 'x' and t < s['t0'] + X: c.push_group(); draw_shot(c, sh[i - 1], s['t0']); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - s['t0'])/X)
    dark = 0.0
    if i > 0 and s['cut'] == 'dip' and t < s['t0'] + X: dark = 1 - (t - s['t0'])/X
    if i + 1 < len(sh) and sh[i + 1]['cut'] == 'dip' and t > s['t1'] - X: dark = (t - (s['t1'] - X))/X
    ln = T[s['line']]; wi, stem, suf = VERB[s['line']]; tv = ln['words'][wi][0]
    if tv - 0.3 <= t < s['t1'] - 0.05: verb_card(c, t, tv, *CARD[s['key']], stem, suf, 130)
    if s['key'] == 'station' and t >= ln['words'][6][0]: E.bigword(c, t, ln['words'][6][0], *WORD['station'], 'Toot, toot!', 88, col=(1, 0.85, 0.3))
    if s['key'] == 'tv' and t >= ln['words'][5][0]: E.bigword(c, t, ln['words'][5][0], *WORD['tv'], 'Ha ha!', 110, col=(1, 0.85, 0.3))
    if dark > 0: c.rectangle(0, 0, W, H); c.set_source_rgba(0.05, 0.04, 0.1, clamp(dark)); c.fill()

def quiz(c, t, T, q, idx):
    riverside(c, t); c.rectangle(0, 0, W, H); c.set_source_rgba(1, 1, 1, 0.6); c.fill()
    rev = t >= q['rev']; kr = E.pop(t, q['rev']) if rev else 0
    E.bigword(c, t, q['t0'] + 0.1, W/2, 130, 'Which word?', 96, col=(1, 0.72, 0.2))
    E.text_c(c, f'{idx + 1} / 3', 1790, 90, 40, (0.2, 0.2, 0.3))
    # 句子卡（太長自動縮小字，左右各留 60 px）
    lead = q.get('lead', ''); size = 104
    while True:
        E.font(c, size); sp = c.text_extents('a b').x_advance - c.text_extents('ab').x_advance
        wlead = c.text_extents(lead).x_advance + sp if lead else 0
        wpre, wpost = c.text_extents(q['pre']).x_advance, c.text_extents(q['post']).x_advance; wans = c.text_extents(q['ans'][0] + q['ans'][1]).x_advance; wb = max(wans, size*2.9) + 30
        tot = wlead + wpre + sp + wb + sp + wpost; cw = tot + 160
        if cw <= W - 120 or size <= 60: break
        size -= 4
    k0 = E.pop(t, q['t0'] + 0.2); by = size*0.35
    c.save(); c.translate(W/2, 400); c.scale(E.S(k0), E.S(k0))
    rrect(c, -cw/2 + 8, -130 + 12, cw, 260, 36); c.set_source_rgba(0, 0, 0, 0.2); c.fill(); rrect(c, -cw/2, -130, cw, 260, 36); fs(c, hexc('fffaf0'), 6)
    x = -tot/2
    if lead: c.move_to(x, by); c.set_source_rgba(*NAVY); c.show_text(lead); x += wlead
    c.move_to(x, by); c.set_source_rgba(*hexc('2a6fd6')); c.show_text(q['pre']); x += wpre + sp
    c.move_to(x + 6, by + 26); c.line_to(x + wb - 6, by + 26); stroke(c, 8, NAVY)
    if rev:
        c.save(); c.translate(x + wb/2, by); c.scale(E.S(kr), E.S(kr)); c.move_to(-wans/2, 0); c.set_source_rgba(*NAVY); c.show_text(q['ans'][0]); c.set_source_rgba(*RED); c.show_text(q['ans'][1]); c.restore()
    x += wb + sp; c.move_to(x, by); c.set_source_rgba(*NAVY); c.show_text(q['post']); c.restore()
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
        riverside(c, t); c.rectangle(0, 0, W, H); c.set_source_rgba(0.12, 0.08, 0.3, 0.55); c.fill()
        E.bigword(c, t, 0.2, W/2, 380, 'Story 2', 190); verb_card(c, t, 1.0, W/2, 650, 'verb + ', 'es', 120)
    elif t < T['c1']: intro(c, t, T)
    elif t < T['g1']:
        action(c, t, T)
        if t < T['c1'] + X: c.push_group(); intro(c, T['c1'] - 0.01, T); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - T['c1'])/X)
    else:
        i = next((k for k, q in enumerate(T['quiz']) if t < q['t1']), len(T['quiz']) - 1); quiz(c, t, T, T['quiz'][i], i)
    if T['a0'] <= t < T['g1']: E.vignette(c, 0.25)
    cur = next((T[k] for k in STORY if T[k]['t0'] - 0.15 <= t <= T[k]['t1'] + 0.35), None)
    if '--nokara' not in sys.argv: karaoke(c, t, cur)          # 聽力版：不出卡拉 OK 字幕


if __name__ == '__main__':
    E.FONT = 'Comic Relief'; od = os.path.join(ROOT, 'renders'); T = build(); name = next((a for a in sys.argv[1:] if not a.startswith('--') and not re.match(r'^[\d.]+$', a)), 'story2-placeholder-v1')
    print({k: (round(T[k]['t0'], 2), round(T[k]['t1'], 2)) for k in STORY}, 'shots', [(s['key'], round(s['t0'], 2), round(s['t1'], 2)) for s in T['shots']], 'end', round(T['end'], 2))
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    if '--stills' in sys.argv:
        q = T['quiz']; sh = T['shots']; w = lambda k, i, d=0.0: T[k]['words'][i][0] + d
        ts = [1.6, w('B01', 1, 0.1), w('B01', 5, 0.3), T['B02']['t0'] - 0.7, w('B02', 3, 0.9), T['B02']['t1'], w('B03', 4, 0.5), T['c1'] - 0.1]
        for s in sh: ts += [s['t0'] + 0.35, w(s['line'], VERB[s['line']][0], 0.9), s['t1'] - 0.35]
        ts[13] = w('B05', 7, 0.3); ts[16] = w('B06', 6, 0.3)          # 這兩鏡的最後一格改抽 Toot, toot!／Ha ha! 大字
        ts += [q[0]['c0'] + 1.5, q[0]['rev'] + 1.0, q[1]['rev'] + 1.0, q[2]['rev'] + 1.0]
        ts = [float(a) for a in sys.argv[sys.argv.index('--stills') + 1:] if re.match(r'^[\d.]+$', a)] or ts
        cols = 4 if len(ts) > 6 else len(ts); rows = math.ceil(len(ts)/cols); sheet = Image.new('RGB', (640*cols, 360*rows))
        for i, t in enumerate(ts):
            c = cairo.Context(surf); frame(c, t, T); surf.flush(); sheet.paste(to_img(surf).resize((640, 360), Image.LANCZOS), ((i % cols)*640, (i//cols)*360))
        out = os.path.join(od, 'story2_check.jpg'); sheet.save(out, quality=88); print('ok stills', out, [round(x, 2) for x in ts]); sys.exit()
    nf = int(T['end']*FPS); wav = os.path.join(od, name + '.wav'); sf.write(wav, T['audio'], SR)
    r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='ignore').stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); gain = -16.0 - I; print('loudness', I, 'gain', round(gain, 1))
    mp4 = os.path.join(od, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
                          '-af', f'volume={gain:.2f}dB,alimiter=limit=0.95:level=false,apad', '-t', f'{nf/FPS:.4f}', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', mp4], stdin=subprocess.PIPE)
    for n in range(nf):
        c = cairo.Context(surf); frame(c, n/FPS, T); surf.flush(); p.stdin.write(bytes(surf.get_data()))
        if n % 300 == 0: print('frame', n, '/', nf, flush=True)
    p.stdin.close(); p.wait(); os.remove(wav); print('ok', mp4)
    m720 = os.path.join(od, name + '-720p.mp4')
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', mp4, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', m720], check=True); print('ok', m720)
