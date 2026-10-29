"""render_v1.py — 影片 2 What day is today?（兩位老師＋對話動畫，1920×1080、30 fps）；前半段從影片 1 的 render_v1.py 複製。
沿用試片 v2.3 定案的做法：姿勢渲染圖＋嘴形／眨眼貼片、Comic Relief 英文、72 px 字幕（框底 y=960）、仿射呼吸擺動、輕推鏡頭。
新增：Ms. Nova 在左、Mr. Cosmo 在右，中間全息螢幕放內容；依時間軸換姿勢（0.15 秒交叉淡入）；各段字卡動畫；片尾授權字卡。
時間軸：timeline_v1.json（build_voice_v1.py 產生）。
用法：python -I render_v1.py --still T ... | --frames | --segment g0 g1 out.mp4（給 pilot-nova/run_segments.py 用）
"""
import sys, json, math, pathlib, subprocess, re, os, glob, random
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
ST = HERE.parent
W, H, FPS = 1920, 1080, 30
TL = json.loads((HERE / 'timeline_v1.json').read_text(encoding='utf-8'))
SEGS = TL['segs']; SECT = TL['sections']
CREDITS_SEC = 8.0
DUR = TL['dur'] + CREDITS_SEC

# ---------- 字型（同試片 v2.3） ----------
FONT_DIR = os.environ.get('FONT_DIR', 'C:/Windows/Fonts')
PROJECT_FONTS = str(ST / 'fonts')
F_EN = os.path.join(PROJECT_FONTS, 'ComicRelief-Bold.ttf'); F_EN_REG = os.path.join(PROJECT_FONTS, 'ComicRelief-Regular.ttf')
F_ZH = os.path.join(FONT_DIR, 'msjhbd.ttc'); F_IPA = os.path.join(FONT_DIR, 'segoeuib.ttf')
_fc = {}
def font(f, s):
    k = (f, max(1, int(s)))
    if k not in _fc: _fc[k] = ImageFont.truetype(f, k[1])
    return _fc[k]
def font_for(ch, en):
    if ord(ch) < 128: return en
    if '⺀' <= ch <= '鿿' or '＀' <= ch <= '￯' or '　' <= ch <= '〿': return F_ZH
    return F_IPA
def runs(s, en):
    out = []
    for ch in s:
        f = font_for(ch, en)
        if out and out[-1][1] == f: out[-1][0] += ch
        else: out.append([ch, f])
    return out
def mixed_width(d, s, size, en): return sum(d.textlength(t, font=font(f, size)) for t, f in runs(s, en))
def draw_mixed(d, x, y, s, size, fill, en):
    asc = max(font(f, size).getmetrics()[0] for t, f in runs(s, en))
    for t, f in runs(s, en):
        fo = font(f, size); d.text((x, y + asc - fo.getmetrics()[0]), t, font=fo, fill=fill); x += d.textlength(t, font=fo)
CYAN, ORANGE, RED, INK, WHITE, NAVY, GREEN, GREY = (46, 197, 232), (255, 138, 61), (255, 80, 80), (30, 40, 70), (255, 255, 255), (10, 20, 50), (90, 220, 120), (120, 130, 150)
clamp = lambda x, a=0, b=1: max(a, min(b, x))
prog = lambda t, a, d=.35: clamp((t - a) / d)
def back(k):
    if k <= 0: return 0
    if k >= 1: return 1
    s = 1.7; k -= 1; return k * k * ((s + 1) * k + s) + 1
def text_center(d, s, cx, cy, f, fill, stroke=0, sf=None):
    b = d.textbbox((0, 0), s, font=f); d.text((cx - (b[2] - b[0]) / 2 - b[0], cy - (b[3] - b[1]) / 2 - b[1]), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=sf)

# ---------- 時間軸查詢 ----------
def seg_at(t): return next((s for s in SEGS if s['t0'] <= t < s['t1']), None)
def last_seg(t): return next((s for s in reversed(SEGS) if s['t0'] <= t), None)
def sec_at(t):
    s = last_seg(t); return s['sec'] if s else '01-open'
def sec_segs(sec): return [s for s in SEGS if s['sec'] == sec]
def find(sec, pred, n=0):
    hits = [s for s in sec_segs(sec) if pred(s)]; return hits[n] if len(hits) > n else None
def vis_has(sec, txt, n=0): return find(sec, lambda s: txt in s['vis'], n)

# ---------- 嘴形 ----------
LETTER_NAME = {'U': ['M03_E', 'M05_U'], 'A': ['M03_E'], 'Y': ['M02_A', 'M03_E'], 'E': ['M03_E'], 'O': ['M04_O'], 'I': ['M02_A', 'M03_E'],
               'D': ['M08_mid', 'M03_E'], 'R': ['M02_A'], 'S': ['M03_E', 'M08_mid'], 'N': ['M03_E', 'M08_mid'], 'M': ['M03_E', 'M01_rest'],
               'T': ['M08_mid', 'M03_E'], 'H': ['M03_E', 'M08_mid'], 'W': ['M01_rest', 'M05_U'], 'F': ['M03_E', 'M06_FV']}
WORD = {'a': ['M08_mid'], 'ms.': ['M01_rest', 'M03_E', 'M08_mid'], "i'm": ['M02_A', 'M03_E', 'M01_rest'], 'mr.': ['M01_rest', 'M08_mid'],
        'the': ['M07_L', 'M08_mid'], 'say': ['M08_mid', 'M03_E'], 'of': ['M08_mid', 'M06_FV'], 'job': ['M08_mid', 'M04_O', 'M01_rest'],
        'great': ['M08_mid', 'M03_E', 'M08_mid'], 'me': ['M01_rest', 'M03_E'], 'now': ['M08_mid', 'M04_O'], 'you': ['M03_E', 'M05_U'],
        'your': ['M03_E', 'M04_O'], 'two': ['M08_mid', 'M05_U'], 'to': ['M08_mid', 'M05_U'], 'dot': ['M08_mid', 'M04_O', 'M08_mid']}
DIG = [('th', 'M07_L'), ('sh', 'M05_U'), ('ch', 'M05_U'), ('wh', 'M05_U'), ('ee', 'M03_E'), ('ea', 'M03_E'), ('ay', 'M03_E'),
       ('ai', 'M03_E'), ('ey', 'M03_E'), ('oo', 'M05_U'), ('ou', 'M04_O'), ('ow', 'M04_O'), ('ck', 'M08_mid')]
ONE = {'a': 'M02_A', 'e': 'M08_mid', 'i': 'M08_mid', 'o': 'M04_O', 'u': 'M02_A', 'y': 'M08_mid', 'w': 'M05_U', 'f': 'M06_FV',
       'v': 'M06_FV', 'm': 'M01_rest', 'b': 'M01_rest', 'p': 'M01_rest', 'l': 'M07_L'}
VOWEL = {'M02_A', 'M03_E', 'M04_O', 'M05_U'}
ZH_CYCLE = ['M08_mid', 'M02_A', 'M03_E', 'M08_mid', 'M04_O', 'M02_A']

def word_visemes(w):
    raw = w.strip('.,!?')
    if raw in LETTER_NAME: return LETTER_NAME[raw]
    lw = w.lower().strip(',!?')
    if lw in WORD: return WORD[lw]
    lw = re.sub(r'[^a-z]', '', lw)
    if not lw: return ['M08_mid']
    if len(lw) > 3 and lw.endswith('e') and lw[-2] not in 'aeiou': lw = lw[:-1]
    out, i = [], 0
    while i < len(lw):
        d = next((v for k, v in DIG if lw.startswith(k, i)), None)
        if d: out.append(d); i += 2; continue
        out.append(ONE.get(lw[i], 'M08_mid')); i += 1
    return [v for k, v in enumerate(out) if k == 0 or v != out[k - 1]] or ['M08_mid']

def build_tracks():
    tr = {'nova': [], 'cosmo': [], 'amy': [], 'ben': []}
    for s in SEGS:
        if s['kind'] not in ('say', 'zh'): continue
        whos = ['nova', 'cosmo'] if s['who'] == 'both' else [s['who']]
        for w in s['words']:
            if all(ord(c) < 128 for c in w['w']): vs = word_visemes(w['w'])
            else:  # 中文：WordBoundary 字串在 Windows 可能亂碼，只用時間；每個詞依長度輪流張合
                n = max(1, round((w['t1'] - w['t0']) / .2)); vs = [ZH_CYCLE[(hash(w['t0']) + k) % len(ZH_CYCLE)] for k in range(n)]
            wt = [1.0 if v in VOWEL else .6 for v in vs]; tot = sum(wt); t = w['t0']; d = max(w['t1'] - w['t0'], .08)
            for v, k in zip(vs, wt):
                for who in whos: tr[who].append((t, t + d * k / tot, v))
                t += d * k / tot
    return tr
TRACKS = build_tracks()

def mouth_at(who, t):
    s = seg_at(t)
    if s and s['kind'] == 'sound' and s['who'] == who:
        k = int((t - s['t0']) * 30); env = s['env'][min(k, len(s['env']) - 1)]
        if env < .12: return None
        vs = s['visemes']; return vs[min(len(vs) - 1, int(len(vs) * (t - s['t0']) / (s['t1'] - s['t0'])))]
    for t0, t1, v in TRACKS[who]:
        if t0 - .03 <= t < t1 + .03: return v
    if s and s['kind'] in ('say', 'zh') and s['who'] in (who, 'both'): return 'M08_mid'
    return None
def talking(who, t):
    s = seg_at(t); return bool(s and s['kind'] in ('say', 'zh') and s['who'] in (who, 'both'))

# ---------- 人物與姿勢 ----------
K = 0.42; TOP = 24; HEAD_Y = 114
POS = {'nova': 280, 'cosmo': 1640}
POINT = {'nova': 'P03', 'cosmo': 'P04'}   # 指向中間螢幕：Nova 在左往右指，Cosmo 在右往左指
class Teacher:
    def __init__(self, who):
        self.who = who; self.cache = {}; self.cfg = {}
    def pose_files(self, pose):
        if pose not in self.cfg:
            d = sorted(glob.glob(str(ST / f'characters/{self.who}/face-{self.who}-{pose}-*')))[-1]
            ver = d.rsplit('-', 1)[1]
            base = ST / f'characters/{self.who}/renders/{self.who}-{pose}-{ver}-yaw0-x2.png'
            patches = json.loads((pathlib.Path(d) / 'patches/patches.json').read_text(encoding='utf-8'))
            self.cfg[pose] = (base, pathlib.Path(d), patches)
        return self.cfg[pose]
    def image(self, pose, mouth, blink):
        key = (pose, mouth, blink)
        if key not in self.cache:
            base, d, pj = self.pose_files(pose)
            im = Image.open(base).convert('RGBA')
            for vid in ([mouth] if mouth else []) + (['B01_blink'] if blink else []):
                if vid in pj['patches']:
                    im.alpha_composite(Image.open(d / 'patches' / f'{vid}.png').convert('RGBA'), tuple(pj['patches'][vid]['x2_xy']))
            self.cache[key] = im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS)
        return self.cache[key]
    def face_xy(self, pose):
        _, _, pj = self.pose_files(pose); c = pj['crop_in_x2']
        return ((c[0] + c[2]) / 2, (c[1] + c[3]) / 2 + 60)
T = {'nova': Teacher('nova'), 'cosmo': Teacher('cosmo')}

def vis_poses(s):
    """從畫面說明抓指定姿勢：「Nova 揮手 P02」「兩位老師揮手 P02」；沒寫人名就給說話的人。"""
    out = {}
    for m in re.finditer(r'(Nova|Cosmo|兩位老師)?[^P，；]*P(\d\d)', s['vis']):
        who = m.group(1); p = 'P' + m.group(2)
        if who == 'Nova': out['nova'] = p
        elif who == 'Cosmo': out['cosmo'] = p
        elif who == '兩位老師': out['nova'] = out['cosmo'] = p
        elif s['who'] in ('nova', 'cosmo'): out[s['who']] = p
        else: out['nova'] = out['cosmo'] = p
    return out

def build_pose_track(who):
    """每段決定這位老師的姿勢，回傳 [(t0, pose)]。"""
    tr = []; lead = None; hold = None
    for s in SEGS:
        vp = vis_poses(s)
        if s['kind'] in ('say', 'zh', 'sound') and s['who'] in (who, 'both'): lead = s
        if s['who'] in ('amy', 'ben'): p = 'P08'   # 學生對話時老師聆聽
        elif who in vp: p = vp[who]; hold = (p, s['sec'])
        elif s['kind'] == 'turn':
            p = 'P08' if lead is not None and lead['sec'] == s['sec'] and lead['who'] in (who, 'both') else 'P01'
        elif s['who'] in (who, 'both'):
            if hold and hold[1] == s['sec'] and s['kind'] != 'zh' and tr and tr[-1][1] == hold[0]: p = hold[0]
            elif s['kind'] == 'zh': p = 'P05'
            elif s['sec'] in ('02-q1', '03-ans', '04-q2', '05-demo', '06-ctx', '07-talk', '08-quiz'): p = POINT[who]
            else: p = 'P05'
        else:
            p = hold[0] if hold and hold[1] == s['sec'] and tr and tr[-1][1] == hold[0] and s['kind'] != 'turn' else 'P01'
        if not tr or tr[-1][1] != p: tr.append((s['t0'] - .1, p))
    return tr
POSE_TR = {w: build_pose_track(w) for w in T}
FADE = .15
def pose_at(who, t):
    tr = POSE_TR[who]; i = max([k for k, (t0, _) in enumerate(tr) if t0 <= t] + [0])
    cur = tr[i][1]; prev = tr[i - 1][1] if i > 0 else None
    k = clamp((t - tr[i][0]) / FADE) if prev else 1
    return cur, prev, k

def blink_times(seed):
    r = random.Random(seed); t, out = 1.5, []
    while t < DUR: out.append(t); t += r.uniform(2.6, 5.2)
    return out
BLINK = {'nova': blink_times(1), 'cosmo': blink_times(2)}
def is_blink(who, t): return any(b <= t < b + .13 for b in BLINK[who])

def sway_matrix(w, h, angle, sy):
    r = -math.radians(angle % 360.0)
    a, b, d, e = math.cos(r), math.sin(r), -math.sin(r), math.cos(r)
    cx, cy = w / 2, h
    return (a, b, a * -cx + b * -cy + cx, d / sy, e / sy, (d * -cx + e * -cy + cy) / sy)

def draw_teacher(im, who, t):
    cur, prev, k = pose_at(who, t); m = mouth_at(who, t); bl = is_blink(who, t)
    img = T[who].image(cur, m, bl)
    if k < 1 and prev:   # 換姿勢：短暫交叉淡入
        img = Image.blend(T[who].image(prev, None, False), img, k)
    ph = 0 if who == 'nova' else 1.3
    breathe = 1 + .006 * math.sin(2 * math.pi * t / 3.6 + ph)
    bob = 6 * math.sin(2 * math.pi * t * 2.2) if talking(who, t) else 0
    sway = .8 * math.sin(2 * math.pi * t / 7.0 + ph)
    sc = side_k(t)   # 對話動畫時老師縮小退到兩側
    if sc < .999: img = img.resize((round(img.width * sc), round(img.height * sc)), Image.BILINEAR)
    h2 = round(img.height * breathe)
    n2 = img.transform((img.width, h2), Image.AFFINE, sway_matrix(img.width, h2, sway, h2 / img.height), resample=Image.BILINEAR)
    x = POS[who] + (1 - sc) / .28 * (-140 if who == 'nova' else 140)
    im.alpha_composite(n2, (round(x - n2.width // 2), round(TOP - HEAD_Y * K * sc + bob)))

def name_tag(im, t):
    d = ImageDraw.Draw(im)
    for who, label, key in (('nova', 'Ms. Nova', 0), ('cosmo', 'Mr. Cosmo', 1)):
        s = sec_segs('01-open')[key]; k = back(prog(t, s['t0'])) * (1 - clamp((t - (sec_segs('01-open')[2]['t0'] - .2)) / .4))   # 標題出現前收起，避免重疊
        if k <= 0: continue
        pose = pose_at(who, t)[0]; fx, fy = T[who].face_xy(pose)
        x = POS[who] + (fx - 1024) * K; y = TOP + (fy - HEAD_Y) * K
        f = font(F_EN, 44 * k); w = d.textlength(label, font=f)
        tx = x + (260 * K + 30 + w / 2 + 28) * (1 if who == 'nova' else -1)
        d.rounded_rectangle((tx - w / 2 - 28, y - 36 * k, tx + w / 2 + 28, y + 36 * k), 34, fill=(*CYAN, 235))
        text_center(d, label, tx, y, f, (*INK, 255))

# ---------- 背景與素材 ----------
bg = Image.open(ST / 'art/bg-classroom-v1.png').convert('RGB')
BG = bg.resize((1920, 1280), Image.LANCZOS).crop((0, 60, 1920, 1140)).convert('RGBA')
CX = 960; BOARD = (560, 90, 1360, 770)
_art = {}
def art(k, size):
    key = (k, size)
    if key not in _art:
        f = HERE / 'art' / f'{k}.png'
        if k.startswith('v1-'): f = ST / 'video1-days/art' / f'{k[3:]}.png'   # 沿用影片 1 的插圖
        elif k.startswith('day-'): f = ST / 'video1-days/art' / f'{k}.png'
        im = Image.open(f).convert('RGBA') if f.exists() else Image.new('RGBA', (8, 8), (60, 80, 120, 255))   # 還沒生的圖先用色塊
        im = im.resize(size, Image.LANCZOS)
        m = Image.new('L', size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), 28, fill=255); im.putalpha(m)
        _art[key] = im
    return _art[key]
def paste_art(L, k, cx, cy, w, h, scale=1.0, border=CYAN):
    if scale <= 0.02: return
    sw, sh = max(2, round(w * scale)), max(2, round(h * scale)); im = art(k, (sw, sh))
    d = ImageDraw.Draw(L); x0, y0 = round(cx - sw / 2), round(cy - sh / 2)
    d.rounded_rectangle((x0 - 6, y0 - 6, x0 + sw + 6, y0 + sh + 6), 32, fill=(*border, 255))
    L.alpha_composite(im, (x0, y0))

# ---------- 影片 2：畫面標記與字卡 ----------
sys.path.insert(0, str(HERE))
from script_v1 import TALKS
import talk_scene as TS
TAGS = ('card', 'cal', 'img', 'quiz', 'talk', 'scene', 'pass')
def tags(s):
    out = {}
    for part in (s['vis'] if s else '').split('；'):
        k, _, v = part.partition(':')
        if k in TAGS and v: out[k] = v
    return out
DAY_RE = re.compile(r'(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)')
NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
DAY_IMG = {n: f'day-{n[:3].lower()}' for n in NAMES}

TALK_T = [s for s in SEGS if 'talk:' in s['vis']]
T_TALK0, T_TALK1 = TALK_T[0]['t0'] - .3, TALK_T[-1]['t1'] + .3
def side_k(t):
    """對話動畫期間老師縮小到 0.72 倍、退到兩側（前後 0.5 秒緩動）。"""
    a = clamp((t - (T_TALK0 - .5)) / .5) * (1 - clamp((t - T_TALK1) / .5))
    return 1 - .28 * a

def your_turn(d, t, turn, y=95):
    kk = back(prog(t, turn['t0'], .3))
    f3 = font(F_EN, 50 * kk); f4 = font(F_ZH, 40 * kk); txt = 'Your turn!'
    bw = d.textlength(txt, font=f3) + d.textlength(' 換你唸！', font=f4) + 80
    d.rounded_rectangle((CX - bw / 2, y - 42 * kk, CX + bw / 2, y + 42 * kk), 42, fill=(*CYAN, 245))
    x0 = CX - bw / 2 + 40; d.text((x0, y - 30 * kk), txt, font=f3, fill=(*INK, 255))
    d.text((x0 + d.textlength(txt, font=f3) + 16, y - 26 * kk), '換你唸！', font=f4, fill=(*INK, 255))
    p = clamp((t - turn['t0']) / (turn['t1'] - turn['t0']))
    d.rounded_rectangle((CX - 300, 742, CX + 300, 758), 8, fill=(40, 60, 100, 255))
    d.rounded_rectangle((CX - 300, 742, CX - 300 + 600 * (1 - p), 758), 8, fill=(*ORANGE, 255))

def hot_phrases(vis, line):
    """畫面說明裡「X 發光／放大」的 X，若出現在這行字卡就標橘色；「整句放大」整行標橘色。"""
    if '整句放大' in vis: return [line]
    out = []
    for m in re.finditer(r"([A-Za-z' ?]+?) (?:發光|放大)", vis):
        ph = m.group(1).strip()
        if ph and ph in line: out.append(ph)
    return out

def draw_card_line(d, line, cy, size, hots, k=1.0, maxw=800):
    f = font(F_EN, size)
    while d.textlength(line, font=f) > maxw and size > 30: size -= 2; f = font(F_EN, size)
    pat = '(' + '|'.join([re.escape(h) for h in hots] + [DAY_RE.pattern[1:-1]]) + ')'
    parts = [p for p in re.split(pat, line) if p]
    x = CX - d.textlength(line, font=f) / 2
    for p in parts:
        col = ORANGE if (p in hots or DAY_RE.fullmatch(p)) else WHITE
        d.text((x, cy - size * .62), p, font=f, fill=(*col, int(255 * k)), stroke_width=3, stroke_fill=(*NAVY, int(255 * k))); x += d.textlength(p, font=f)

def card(d, t, s, cy, size=74):
    tg = tags(s); txt = tg.get('card')
    if not txt: return
    first = next(x for x in SEGS if tags(x).get('card') == txt and x['t0'] <= s['t0'] and x['sec'] == s['sec'])
    k = back(prog(t, first['t0'], .35))
    if '在上方' in s['vis']: lines = ['What day is today?', '=', txt]
    elif ' = ' in txt: a, b = txt.split(' = '); lines = [a, '=', b]
    elif ' / ' in txt: lines = txt.split(' / ')
    else: lines = [txt]
    hots = hot_phrases(s['vis'], ' '.join(lines))
    lh = size * 1.18 if len(lines) > 1 else 0; y0 = cy - lh * (len(lines) - 1) / 2
    box_h = size * .75 + lh * (len(lines) - 1) + 40
    d.rounded_rectangle((CX - 430, cy - box_h / 2 - 10, CX + 430, cy + box_h / 2 + 10), 30, fill=(10, 20, 45, int(215 * k)), outline=(*CYAN, int(255 * k)), width=4)
    for i, ln in enumerate(lines):
        if ln == '=': text_center(d, '=', CX, y0 + i * lh, font(F_EN, size * .8 * k or 1), (*ORANGE, 255)); continue
        draw_card_line(d, ln, y0 + i * lh, size * k or 1, hots, k)
    gl = re.findall('「(.+?)」', s['vis'])
    if gl:
        g0 = next(x for x in SEGS if gl[-1] in x['vis'] and x['sec'] == s['sec'])
        kk = back(prog(t, g0['t0'], .35))
        if kk > 0:
            gy = cy + box_h / 2 + 52
            d.rounded_rectangle((CX - 230, gy - 38 * kk, CX + 230, gy + 38 * kk), 26, fill=(*ORANGE, 235))
            text_center(d, gl[-1], CX, gy, font(F_ZH, 52 * kk), (*WHITE, 255))

def calendar(L, d, t, day, cx, cy, w, covered=False, k=1.0):
    """全息月曆：上方 TODAY 標籤＋星期圖＋星期名稱（猜星期時名稱先蓋住）。"""
    if k <= 0: return
    w = w * k; h = w * 1.28
    d.rounded_rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), 22, fill=(10, 20, 45, 235), outline=(*CYAN, 255), width=5)
    d.rounded_rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2 + w * .2), 22, fill=(*ORANGE, 255))
    text_center(d, 'TODAY', cx, cy - h / 2 + w * .1, font(F_EN, w * .12), (*WHITE, 255))
    L.alpha_composite(art(DAY_IMG[day], (round(w * .72), round(w * .72))), (round(cx - w * .36), round(cy - h / 2 + w * .26)))
    ny = cy + h / 2 - w * .17
    if covered:
        d.rounded_rectangle((cx - w * .42, ny - w * .1, cx + w * .42, ny + w * .1), 14, fill=(60, 80, 120, 255))
        text_center(d, '?', cx, ny, font(F_EN, w * .16), (*WHITE, 255))
    else: text_center(d, day, cx, ny, font(F_EN, w * .14), (*ORANGE, 255), 3, (*NAVY, 255))

def board_open(L, d, t):
    ss = sec_segs('01-open'); t_cards, chorus, t_title = ss[2]['t0'], ss[3], ss[4]['t0']
    k = back(prog(t, t_title))
    if k > 0: text_center(d, 'What day is today?', CX, 150, font(F_EN, 76 * k), (*CYAN, 255), 4, (*NAVY, 255))
    ws = [w for w in chorus['words'] if DAY_RE.fullmatch(w['w'].strip(',!.'))]
    lit = max([i for i, w in enumerate(ws) if w['t0'] <= t < chorus['t1'] + .2] + [-1])
    for i, n in enumerate(NAMES):
        kk = back(prog(t, t_cards + .12 * i, .3)); row, col = (0, i) if i < 4 else (1, i - 4)
        cx = CX - 285 + col * 190 + (95 if row else 0); cy = 330 + row * 230
        on = i == lit; paste_art(L, DAY_IMG[n], cx, cy, 160, 160, kk * (1.15 if on else 1), ORANGE if on else CYAN)
        if kk > .5: text_center(d, n, cx, cy + 102, font(F_EN, 30), (*ORANGE, 255) if on else (*WHITE, 255), 3, (*NAVY, 255))

def board_generic(L, d, t):
    s = last_seg(t); tg = tags(s); cur = seg_at(t)
    if s['sec'] in ('06-ctx', '05-demo') and not tg:
        title = 'Ask and Answer!' if s['sec'] == '06-ctx' else "Let's go!"
        text_center(d, title, CX, 400, font(F_EN, 80 * back(prog(t, s['t0']))), (*CYAN, 255), 4, (*NAVY, 255)); return
    day = tg.get('cal') or tg.get('quiz'); img = tg.get('img')
    if img:
        first = next(x for x in SEGS if tags(x).get('img') == img and x['sec'] == s['sec'])
        paste_art(L, img, CX - 40, 320, 640, 427, back(prog(t, first['t0'], .4)))
        if day: calendar(L, d, t, day, CX + 330, 250, 170)
        card(d, t, s, 640, 60)
    elif day:
        first = next(x for x in SEGS if (tags(x).get('cal') or tags(x).get('quiz')) == day and x['t0'] <= s['t0'] and x['sec'] == s['sec'])
        covered = 'quiz' in tg and '揭曉' not in s['vis']
        calendar(L, d, t, day, CX, 330, 250, covered, back(prog(t, first['t0'], .4)))
        card(d, t, s, 640, 64)
    else:
        card(d, t, s, 400)
    if cur and cur['kind'] == 'turn': your_turn(d, t, cur)

BLINK.update({'amy': blink_times(3), 'ben': blink_times(4)})
def kid_gesture(text):
    tl = text.lower()
    if 'good morning' in tl: return 'wave'
    if tl.startswith('oh, no'): return 'surprise'
    if any(w in tl for w in ("let's", 'yay', 'great', 'cool')): return 'cheer'
    if "what's that" in tl: return 'point'
    return 'talk'

def board_talk(L, d, t):
    s = last_seg(t); tg = tags(s); cur = seg_at(t)
    if 'talk' not in tg:   # 段落開頭的標題
        k = back(prog(t, s['t0']))
        text_center(d, 'Listen to Amy and Ben!', CX, 380, font(F_EN, 62 * k), (*CYAN, 255), 4, (*NAVY, 255)); return
    no = int(tg['talk']); scene = next(sc for n, sc, dy, ln, _ in TALKS if n == no)
    t_in = next(x for x in SEGS if tags(x).get('talk') == str(no))['t0'] - .3
    spk = cur['who'] if cur and cur['who'] in ('amy', 'ben') else None
    said = [x for x in SEGS if tags(x).get('talk') == str(no) and x['who'] in ('amy', 'ben') and x['t0'] <= t and tags(x).get('pass') == tg.get('pass')]
    st = {}
    for who in ('amy', 'ben'):
        g = kid_gesture(cur['text']) if spk == who else 'idle'
        prop = {1: 'crayons', 2: 'backpack', 3: 'guitar'}[no] if who == 'ben' else None
        if who == 'amy' and no == 2 and any('basketball' in x['text'] for x in said): prop = 'basketball'
        if prop in ('crayons', 'basketball') and g == 'idle': g = 'hold'
        st[who] = {'mouth': mouth_at(who, t), 'blink': is_blink(who, t), 'gesture': g, 'talking': spk == who, 'prop': prop}
    if no == 2 and spk == 'ben' and 'late' in cur['text']: st['sweat'] = clamp((t - cur['t0']) / .3)
    P = TS.panel(scene, t, st)
    k = clamp((t - t_in) / .4); x0, y0 = CX - TS.PW // 2, 92
    if k < 1:
        P = P.resize((max(2, round(TS.PW * (.9 + .1 * k))), max(2, round(TS.PH * (.9 + .1 * k)))))
        x0, y0 = CX - P.width // 2, 92 + (TS.PH - P.height) // 2
    d.rounded_rectangle((x0 - 6, y0 - 6, x0 + P.width + 6, y0 + P.height + 6), 34, fill=(*CYAN, 255))
    L.alpha_composite(P, (x0, y0))
    ps = tg.get('pass')
    if ps:
        lab = '1st listen' if ps == '1' else '2nd listen'
        f = font(F_EN, 34); w = d.textlength(lab, font=f)
        d.rounded_rectangle((x0 + 20, y0 + 20, x0 + 60 + w, y0 + 76), 26, fill=(*ORANGE, 240)); d.text((x0 + 40, y0 + 26), lab, font=f, fill=(*WHITE, 255))
    else:   # 問答：對話畫面變暗，字卡放在上面
        ov = Image.new('RGBA', P.size, (5, 10, 30, 0)); m = Image.new('L', P.size, 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, P.width - 1, P.height - 1), 30, fill=150); ov.putalpha(m); L.alpha_composite(ov, (x0, y0))
        card(d, t, s, 330 if '=' in tg.get('card', '') else 380)
        if cur and cur['kind'] == 'turn': your_turn(d, t, cur, 660)

def board(t):
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L); sec = sec_at(t)
    if sec == '01-open': board_open(L, d, t)
    elif sec == '07-talk': board_talk(L, d, t)
    else: board_generic(L, d, t)
    return L

# ---------- 字幕 ----------
SUB_SIZE, SUB_BOTTOM, SUB_PAD, SUB_MAXW = 72, 960, 18, 1600
KID_COL = {'amy': (255, 190, 140, 255), 'ben': (170, 235, 140, 255)}
def wrap_sub(d, txt):
    if mixed_width(d, txt, SUB_SIZE, F_EN_REG) <= SUB_MAXW or ' ' not in txt: return [txt]
    words = txt.split(' '); best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        m = max(mixed_width(d, a, SUB_SIZE, F_EN_REG), mixed_width(d, b, SUB_SIZE, F_EN_REG))
        if best is None or m < best[0]: best = (m, [a, b])
    return best[1]
def subtitle(t):
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); s = seg_at(t)
    if s is None:
        prev = [x for x in SEGS if x['t1'] <= t and t - x['t1'] < .35]; s = prev[-1] if prev else None
    if not s or tags(s).get('pass') == '1': return L   # 對話第一次播放不顯示字幕（只靠聽）
    if s['kind'] in ('say', 'zh'): txt, col = s['text'], (*CYAN, 255) if s['kind'] == 'say' else (255, 255, 255, 255)
    else: txt, col = 'Your turn!  換你唸！', (255, 255, 255, 255)
    if s['who'] == 'cosmo' and s['kind'] == 'say': col = (150, 225, 255, 255)
    if s['who'] in KID_COL: txt, col = f"{s['who'].title()}: {txt}", KID_COL[s['who']]
    d = ImageDraw.Draw(L); lines = wrap_sub(d, txt); lh = SUB_SIZE + 14
    ws = [mixed_width(d, ln, SUB_SIZE, F_EN_REG) for ln in lines]; w = max(ws)
    top = SUB_BOTTOM - len(lines) * lh - 2 * SUB_PAD
    d.rounded_rectangle((W / 2 - w / 2 - 36, top, W / 2 + w / 2 + 36, SUB_BOTTOM), 24, fill=(10, 20, 45, 205))
    for k, (ln, lw) in enumerate(zip(lines, ws)):
        x = W / 2 - lw / 2; y = top + SUB_PAD + k * lh
        for part in DAY_RE.split(ln):
            if not part: continue
            draw_mixed(d, x, y, part, SUB_SIZE, (*ORANGE, 255) if DAY_RE.fullmatch(part) else col, F_EN_REG)
            x += mixed_width(d, part, SUB_SIZE, F_EN_REG)
    return L

CREDITS = ['What day is today?', '', 'Voices: Microsoft Edge neural TTS', 'Font: Comic Relief (SIL Open Font License)',
           'Pictures: gpt-image-2', 'Amy and Ben: drawn with code']
def credits(t):
    L = Image.new('RGBA', (W, H), (8, 14, 36, 255)); d = ImageDraw.Draw(L); k = clamp((t - TL['dur']) / .6)
    for i, ln in enumerate(CREDITS):
        f = font(F_EN, 64 if i == 0 else 40); text_center(d, ln, W / 2, 300 + i * 84, f, (*CYAN, 255) if i == 0 else (*WHITE, 255))
    L.putalpha(int(255 * k)); return L

def frame(t):
    if t >= TL['dur'] + .6: return credits(t).convert('RGB')
    im = BG.copy(); im.alpha_composite(board(t))
    for who in ('nova', 'cosmo'): draw_teacher(im, who, t)
    name_tag(im, t); im.alpha_composite(subtitle(t))
    z = 1 + .03 * (0.5 + 0.5 * math.sin(2 * math.pi * t / 40))
    cw, ch = W / z, H / z; x0, y0 = (W - cw) * .5, (H - ch) * .4
    im = im.convert('RGB').crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((W, H), Image.BICUBIC)
    if t >= TL['dur']: im = Image.alpha_composite(im.convert('RGBA'), credits(t)).convert('RGB')
    return im

if __name__ == '__main__':
    out = HERE / 'renders'; out.mkdir(exist_ok=True)
    n = round(DUR * FPS)
    g_start = round(float(os.environ.get('RENDER_FROM', '0')) * FPS)   # 試片：從這一秒開始（分段格數從 0 算起）
    if os.environ.get('RENDER_UNTIL'): n = round(float(os.environ['RENDER_UNTIL']) * FPS)
    if '--frames' in sys.argv: print(n - g_start); sys.exit()
    if '--still' in sys.argv:
        for v in sys.argv[sys.argv.index('--still') + 1:]:
            frame(float(v)).save(out / f'still-{float(v):06.2f}.jpg', quality=90); print(v)
        sys.exit()
    if '--segment' in sys.argv:
        i = sys.argv.index('--segment'); g0, g1, seg_out = int(sys.argv[i + 1]) + g_start, int(sys.argv[i + 2]) + g_start, sys.argv[i + 3]
        ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                               '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', seg_out], stdin=subprocess.PIPE)
        for g in range(g0, min(g1, n)):
            ff.stdin.write(frame(g / FPS).tobytes())
            if (g - g0) % 300 == 0: print(f'[{g0}-{g1}] {g}', flush=True)
        ff.stdin.close(); ff.wait(); print('done', seg_out); sys.exit()
