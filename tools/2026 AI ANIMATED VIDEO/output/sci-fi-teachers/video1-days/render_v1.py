"""render_v1.py — 影片 1 星期單字（兩位老師，1920×1080、30 fps）。
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
    tr = {'nova': [], 'cosmo': []}
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
        if who in vp: p = vp[who]; hold = (p, s['sec'])
        elif s['kind'] == 'turn':
            p = 'P08' if lead is not None and lead['sec'] == s['sec'] and lead['who'] in (who, 'both') else 'P01'
        elif s['who'] in (who, 'both'):
            if hold and hold[1] == s['sec'] and s['kind'] != 'zh' and tr and tr[-1][1] == hold[0]: p = hold[0]
            elif s['kind'] == 'zh': p = 'P05'
            elif s['sec'] in ('03-sun', '04-mon', '05-tue', '06-wed', '07-thu', '08-fri', '09-sat', '02-day', '10-ctx', '12-abbr'): p = POINT[who]
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
    h2 = round(img.height * breathe)
    n2 = img.transform((img.width, h2), Image.AFFINE, sway_matrix(img.width, h2, sway, h2 / img.height), resample=Image.BILINEAR)
    im.alpha_composite(n2, (POS[who] - n2.width // 2, round(TOP - HEAD_Y * K + bob)))

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
        im = Image.open(HERE / 'art' / f'{k}.png').convert('RGBA'); im = im.resize(size, Image.LANCZOS)
        m = Image.new('L', size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), 28, fill=255); im.putalpha(m)
        _art[key] = im
    return _art[key]
def paste_art(L, k, cx, cy, w, h, scale=1.0, border=CYAN):
    if scale <= 0.02: return
    sw, sh = max(2, round(w * scale)), max(2, round(h * scale)); im = art(k, (sw, sh))
    d = ImageDraw.Draw(L); x0, y0 = round(cx - sw / 2), round(cy - sh / 2)
    d.rounded_rectangle((x0 - 6, y0 - 6, x0 + sw + 6, y0 + sh + 6), 32, fill=(*border, 255))
    L.alpha_composite(im, (x0, y0))

# ---------- 七個星期的字卡設定 ----------
# groups：(字母位置, 音標, 音檔)；split：拆字合起的切點；silent：不發音的字母
DAYS = {
 '03-sun': dict(word='Sunday', zh='星期日', img='day-sun', groups=[((1,), '/ʌ/', 'short-u-1')], split=[3]),
 '04-mon': dict(word='Monday', zh='星期一', img='day-mon', groups=[((1,), '/ʌ/', 'short-u-1')], split=[3]),
 '05-tue': dict(word='Tuesday', zh='星期二', img='day-tue', groups=[((1, 2), '/juː/', 'En-us-u')], split=[4]),
 '06-wed': dict(word='Wednesday', zh='星期三', img='day-wed', groups=[((1,), '/ɛ/', 'short-e-1')], split=[6], silent=2),
 '07-thu': dict(word='Thursday', zh='星期四', img='day-thu', groups=[((0, 1), '/θ/', 'dg-th-voiceless'), ((2, 3), '/ɝ/', 'En-us-er')], split=[5]),
 '08-fri': dict(word='Friday', zh='星期五', img='day-fri', groups=[((2,), '/aɪ/', 'En-us-I')], split=[3]),
 '09-sat': dict(word='Saturday', zh='星期六', img='day-sat', groups=[((1,), '/æ/', 'short-a-1'), ((3, 4), '/ɚ/', 'ref-er-1')], split=[3, 5]),
}
ORDER = ['03-sun', '04-mon', '05-tue', '06-wed', '07-thu', '08-fri', '09-sat']
NAMES = [DAYS[k]['word'] for k in ORDER]
ABBR = [w[:3] + '.' for w in NAMES]
SOUND_LABEL = {'short-u-1': '/ʌ/', 'En-us-A_upper': 'ay  /eɪ/', 'En-us-u': 'ue  /juː/', 'ref-er-1': 'ur  /ɚ/', 'short-e-1': 'e  /ɛ/', 'dg-th-voiceless': 'th  /θ/',
               'En-us-er': 'ur  /ɝ/', 'En-us-I': 'i  /aɪ/', 'short-a-1': 'a  /æ/'}

def sound_button(d, t, s, cx, cy):
    k = int((t - s['t0']) * 30); env = s['env'][min(k, len(s['env']) - 1)]; r = 44 + 6 * env
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*CYAN, 245), outline=(*WHITE, 255), width=4)
    d.polygon([(cx - 22, cy - 10), (cx - 8, cy - 10), (cx + 8, cy - 24), (cx + 8, cy + 24), (cx - 8, cy + 10), (cx - 22, cy + 10)], fill=(*INK, 255))
    for i in range(5):
        h = 10 + 50 * env * (0.55 + 0.45 * math.sin(t * 23 + i * 1.7) ** 2)
        x = cx - 58 + i * 25; d.rounded_rectangle((x, cy + 90 - h / 2, x + 14, cy + 90 + h / 2), 7, fill=(*ORANGE, 255))

def your_turn(d, t, turn, y=130, rounds=None):
    kk = back(prog(t, turn['t0'], .3))
    f3 = font(F_EN, 50 * kk); f4 = font(F_ZH, 40 * kk); txt = 'Your turn!'
    bw = d.textlength(txt, font=f3) + d.textlength(' 換你唸！', font=f4) + 80
    d.rounded_rectangle((CX - bw / 2, y - 42 * kk, CX + bw / 2, y + 42 * kk), 42, fill=(*CYAN, 245))
    x0 = CX - bw / 2 + 40; d.text((x0, y - 30 * kk), txt, font=f3, fill=(*INK, 255))
    d.text((x0 + d.textlength(txt, font=f3) + 16, y - 26 * kk), '換你唸！', font=f4, fill=(*INK, 255))
    if rounds:
        for i in (1, 2):
            xx = CX + bw / 2 + 40 + (i - 1) * 46
            d.ellipse((xx - 15, y - 15, xx + 15, y + 15), fill=(*ORANGE, 255) if i <= rounds else (60, 80, 120, 255))
    p = clamp((t - turn['t0']) / (turn['t1'] - turn['t0']))
    d.rounded_rectangle((CX - 300, 742, CX + 300, 758), 8, fill=(40, 60, 100, 255))
    d.rounded_rectangle((CX - 300, 742, CX - 300 + 600 * (1 - p), 758), 8, fill=(*ORANGE, 255))

def turn_round(turn):
    """這個跟唸是同一組的第 1 或第 2 輪。"""
    ss = sec_segs(turn['sec']); i = ss.index(turn); prev = [s for s in ss[:i] if s['kind'] == 'turn']
    return 2 if prev and ss.index(prev[-1]) >= i - 3 else 1

# ---------- 各段畫面 ----------
def board_open(L, d, t):
    s0 = sec_segs('01-open'); t_title = s0[2]['t0']
    k = back(prog(t, t_title))
    if k > 0: text_center(d, 'Days of the Week', CX, 150, font(F_EN, 72 * k), (*CYAN, 255), 4, (*NAVY, 255))
    words = s0[2]['words']; t_w = next((w['t0'] for w in words if w['w'].lower().startswith('seven')), t_title)
    for i, key in enumerate(ORDER):
        kk = back(prog(t, t_w + .25 * i, .3))
        row, col = (0, i) if i < 4 else (1, i - 4)
        cx = CX - 285 + col * 190 + (95 if row else 0); cy = 330 + row * 230
        paste_art(L, DAYS[key]['img'], cx, cy, 160, 160, kk)
        if kk > .5: text_center(d, NAMES[i], cx, cy + 102, font(F_EN, 30), (*WHITE, 255), 3, (*NAVY, 255))

def word_row(d, t, word, size, cy, colors, sep_after=(), sep=0, under=(), focus=(), cross=None, pulse=0):
    """畫一個單字；回傳每個字母 (x 中心, 寬)。colors[i] 是每個字母顏色。"""
    f = font(F_EN, size); ws = [d.textlength(c, font=f) for c in word]
    total = sum(ws) + sep * len(sep_after); x = CX - total / 2; out = []
    for i, (c, w) in enumerate(zip(word, ws)):
        if i in sep_after: x += sep
        pul = 1 + pulse + (.12 + .04 * math.sin(t * 8) if i in focus else 0)
        fs = font(F_EN, size * pul); b = d.textbbox((0, 0), c, font=fs); ww = d.textlength(c, font=fs)
        d.text((x + w / 2 - ww / 2, cy - b[3] / 2 - 10), c, font=fs, fill=colors[i], stroke_width=3, stroke_fill=(*NAVY, 255))
        out.append((x + w / 2, w)); x += w
    for i in under: xc, w = out[i]; d.line((xc - w / 2 + 4, cy + 72 * size / 170, xc + w / 2 - 4, cy + 72 * size / 170), fill=(*RED, 255), width=9)
    if cross is not None:
        xc, w = out[cross]; r = 34 * size / 170
        d.line((xc - r, cy - r - 8, xc + r, cy + r - 8), fill=(*RED, 255), width=10); d.line((xc - r, cy + r - 8, xc + r, cy - r - 8), fill=(*RED, 255), width=10)
    return out

def board_day(L, d, t, sec):
    D = DAYS[sec]; word = D['word']; ss = sec_segs(sec); s = seg_at(t); turn = s if s and s['kind'] == 'turn' else None
    t0 = ss[0]['t0']; k = back(prog(t, t0, .45))
    paste_art(L, D['img'], CX, 255, 300, 300, k * (0.82 if turn else 1))
    size = min(170, 720 / (len(word) * .62)) * k
    if size < 2: return
    n = len(word); ay = (n - 2, n - 1)
    hot = set(ay); under = set(ay); focus = set()
    for idx, ipa, clip in D['groups']:   # 「Look at …」那句（該組第一次播音前的最後一句）開始時變橘色
        first = find(sec, lambda x: x['kind'] == 'sound' and x['clip'] == clip)
        look = [x for x in ss if x['kind'] == 'say' and x['t1'] <= first['t0'] + .01][-1]
        if t >= look['t0']: hot |= set(idx); under |= set(idx)
    # 跟唸時放大目前那一組
    if turn:
        prev = [x for x in ss if x['t1'] <= turn['t0'] + .01]
        last = prev[-1] if prev else None
        if last and last['kind'] == 'sound':
            for idx, ipa, clip in D['groups']:
                if clip == last['clip']: focus |= set(idx)
            if last['clip'] == 'En-us-A_upper': focus |= set(ay)
    whole = turn and not focus
    silent = D.get('silent'); quiet = vis_has(sec, '變灰')
    cross = silent if (silent is not None and quiet and t >= quiet['t0']) else None
    cols = []
    for i in range(n):
        c = (*ORANGE, 255) if i in hot else ((*CYAN, 255) if whole else (*WHITE, 255))
        if cross is not None and i == silent: c = (*GREY, 255)
        cols.append(c)
    bl = vis_has(sec, '分開再合起'); sep = 0
    if bl:
        tw = [w['t0'] for w in bl['words']]; t_merge = tw[-1] if tw else bl['t1']
        if bl['t0'] - .2 <= t < t_merge: sep = 50 * clamp((t - (bl['t0'] - .2)) / .3)
        elif t_merge <= t < t_merge + .25: sep = 50 * (1 - clamp((t - t_merge) / .25))
    say_pulse = 0
    for x in ss:
        if x['kind'] == 'say' and x.get('text', '').rstrip('!') .endswith(word) and x['words']:
            a = x['words'][-1]['t0']; say_pulse = max(say_pulse, .06 * math.sin(math.pi * clamp((t - a) / .6)))
    lay = word_row(d, t, word, size, 515, cols, sep_after=D['split'], sep=sep, under=under, focus=focus, cross=cross, pulse=say_pulse)
    # 音標小卡（第一次播該組音時出現，中文出現時收起）
    zh = vis_has(sec, '卡上出現')
    for idx, ipa, clip in D['groups']:
        first = find(sec, lambda x: x['kind'] == 'sound' and x['clip'] == clip)
        if not first: continue
        kk = back(prog(t, first['t0'])) * (1 - clamp((t - zh['t0']) / .3) if zh else 1)
        if kk <= 0: continue
        xm = sum(lay[i][0] for i in idx) / len(idx)
        f2 = font(F_IPA, 52 * kk); bb = d.textbbox((0, 0), ipa, font=f2); bw, bh = bb[2] - bb[0] + 40, bb[3] - bb[1] + 26
        d.rounded_rectangle((xm - bw / 2, 640 - bh / 2, xm + bw / 2, 640 + bh / 2), 20, fill=(*ORANGE, 235))
        text_center(d, ipa, xm, 640, f2, (*WHITE, 255))
    if zh and t >= zh['t0']:
        kk = back(prog(t, zh['t0'] + .4))
        if kk > 0: text_center(d, D['zh'], CX, 650, font(F_ZH, 80 * kk), (*WHITE, 255), 3, (*NAVY, 255))
    if s and s['kind'] == 'sound': sound_button(d, t, s, BOARD[0] + 70, 250)
    if turn: your_turn(d, t, turn, 110, turn_round(turn))

def board_dayend(L, d, t):
    ss = sec_segs('02-day'); s = seg_at(t); turn = s if s and s['kind'] == 'turn' else None
    t_day = ss[0]['t0']
    for i, w in enumerate(NAMES):
        kk = back(prog(t, ss[0]['t0'] + .12 * i, .3))
        if kk <= 0: continue
        col, row = i % 2, i // 2
        cx = CX - 190 + col * 380 if i < 6 else CX; cy = 180 + row * 125
        f = font(F_EN, 64 * kk); wd = d.textlength(w, font=f); x = cx - wd / 2
        day_on = t >= t_day + 1.0
        for j, c in enumerate(w):
            hot = day_on and j >= len(w) - 3
            fill = (*ORANGE, 255) if hot else (*WHITE, 255)
            if turn and hot: fill = (*CYAN, 255)
            d.text((x, cy - 40), c, font=f, fill=fill, stroke_width=3, stroke_fill=(*NAVY, 255)); cw = d.textlength(c, font=f)
            if hot and j >= len(w) - 2: d.line((x + 2, cy + 38, x + cw - 2, cy + 38), fill=(*RED, 255), width=7)
            x += cw
    first = find('02-day', lambda x: x['kind'] == 'sound')
    if first:
        kk = back(prog(t, first['t0']))
        if kk > 0:
            f2 = font(F_IPA, 52 * kk); txt = 'ay = /eɪ/'
            d.rounded_rectangle((CX - 160, 690 - 38 * kk, CX + 160, 690 + 38 * kk), 22, fill=(*ORANGE, 235)); text_center(d, txt, CX, 690, f2, (*WHITE, 255))
    if s and s['kind'] == 'sound': sound_button(d, t, s, BOARD[0] + 40, 690)
    if turn: your_turn(d, t, turn, 95, turn_round(turn))

def board_ctx(L, d, t):
    ss = sec_segs('10-ctx')
    lab = [x for x in ss if x['t0'] <= t and 'ctx-' in x['vis']]   # 跟唸留白沒有插圖編號，沿用前一句的
    m = re.search(r'ctx-\w+', lab[-1]['vis']) if lab else None
    if not m:   # 段落標題
        k = back(prog(t, ss[0]['t0']))
        text_center(d, 'Days in Sentences', CX, 400, font(F_EN, 76 * k), (*CYAN, 255), 4, (*NAVY, 255)); return
    first = find('10-ctx', lambda x: m.group(0) in x['vis'])
    k = back(prog(t, first['t0'], .4))
    paste_art(L, m.group(0), CX, 360, 660, 440, k)
    sentence_card(d, first['text'], k)   # 2026-10-20 老師：跟唸時學生要看得到句子，句子放在插圖正下方
    cur = seg_at(t)
    if cur and cur['kind'] == 'turn': your_turn(d, t, cur, 110)

def sentence_card(d, txt, k):
    """情境句字卡：插圖正下方，白字、星期單字橘色，太寬就斷成兩行。"""
    if k <= 0: return
    size = 46; f = font(F_EN, size); maxw = 760
    words = txt.split(' '); lines = [txt]
    if d.textlength(txt, font=f) > maxw:
        best = min(range(1, len(words)), key=lambda i: max(d.textlength(' '.join(words[:i]), font=f), d.textlength(' '.join(words[i:]), font=f)))
        lines = [' '.join(words[:best]), ' '.join(words[best:])]
    lh = size + 12; w = max(d.textlength(l, font=f) for l in lines); top = 586
    d.rounded_rectangle((CX - w / 2 - 30, top, CX + w / 2 + 30, top + len(lines) * lh + 24), 22, fill=(10, 20, 45, int(230 * k)), outline=(*CYAN, int(255 * k)), width=3)
    for i, ln in enumerate(lines):
        x = CX - d.textlength(ln, font=f) / 2; y = top + 12 + i * lh
        for part in DAY_RE.split(ln):
            if not part: continue
            d.text((x, y), part, font=f, fill=(*ORANGE, int(255 * k)) if DAY_RE.fullmatch(part) else (*WHITE, int(255 * k)))
            x += d.textlength(part, font=f)

def board_cap(L, d, t):
    ss = sec_segs('11-cap'); q = ss[2]; a = ss[3]
    if t < q['t0']:
        for i, w in enumerate(NAMES):
            kk = back(prog(t, ss[0]['t0'] + .12 * i, .3))
            if kk <= 0: continue
            col, row = i % 2, i // 2
            cx = CX - 190 + col * 380 if i < 6 else CX; cy = 180 + row * 125
            f = font(F_EN, 64 * kk); fb = font(F_EN, 64 * kk * (1.25 + .05 * math.sin(t * 6)))
            wd = d.textlength(w[1:], font=f) + d.textlength(w[0], font=fb); x = cx - wd / 2
            d.text((x, cy - 52), w[0], font=fb, fill=(*ORANGE, 255), stroke_width=3, stroke_fill=(*NAVY, 255)); x += d.textlength(w[0], font=fb)
            d.text((x, cy - 40), w[1:], font=f, fill=(*WHITE, 255), stroke_width=3, stroke_fill=(*NAVY, 255))
        return
    fixed = t >= a['t0'] + .6
    w = 'Sunday' if fixed else 'sunday'
    cols = [(*GREEN, 255) if fixed else (*RED, 255)] + [(*WHITE, 255)] * 5
    word_row(d, t, w, 170 * back(prog(t, q['t0'])), 400, cols, focus={0} if fixed else set())
    if fixed:
        k = back(prog(t, a['t0'] + .6)); cx, cy = CX + 360, 400
        d.ellipse((cx - 55 * k, cy - 55 * k, cx + 55 * k, cy + 55 * k), fill=(*GREEN, 255))
        d.line((cx - 25 * k, cy, cx - 6 * k, cy + 22 * k, cx + 28 * k, cy - 22 * k), fill=(*WHITE, 255), width=12, joint='curve')
    else:
        k = back(prog(t, q['t0'] + .8)); text_center(d, '?', CX + 360, 400, font(F_EN, 130 * k), (*RED, 255), 4, (*NAVY, 255))

def board_abbr(L, d, t):
    ss = sec_segs('12-abbr'); demo = ss[0]
    dots = []   # 每個星期收成縮寫的時間：第 2–4 句 TTS 的第 n 個 dot
    for s in ss[2:5]: dots += [w['t0'] for w in s['words'] if w['w'].lower().strip('.,!') == 'dot']
    if t < ss[2]['t0']:   # 示範：Sunday → Sun.
        t_dot = next((w['t0'] for w in demo['words'] if w['w'].lower().strip('.,!') == 'dot'), demo['t1'])
        kd = clamp((t - (demo['words'][0]['t0'] + 1.5)) / .6)
        abbr_word(d, t, 'Sunday', CX, 400, 150, kd, t >= t_dot)
        if t >= demo['words'][0]['t0'] + 1.0: text_center(d, '1  2  3', CX - 130, 520, font(F_EN, 40), (*ORANGE, 255))
        return
    for i, w in enumerate(NAMES):
        col, row = (0, i) if i < 4 else (1, i - 4)
        cx = CX - 200 + col * 400; cy = 150 + row * 140
        td = dots[i] if i < len(dots) else 1e9
        kk = back(prog(t, ss[2]['t0'] + .1 * i, .3))
        if kk <= 0: continue
        abbr_word(d, t, w, cx, cy, 64 * kk, clamp((t - (td - .9)) / .5), t >= td)

def abbr_word(d, t, w, cx, cy, size, kcol, dot):
    """kcol：後面字母收起來的進度 0→1；dot：句點出現。"""
    f = font(F_EN, size); head = w[:3]; tail = w[3:]
    wh = d.textlength(head, font=f); wt = d.textlength(tail, font=f) * (1 - kcol); wdot = d.textlength('.', font=f) if dot else 0
    x = cx - (wh + wt + wdot) / 2
    d.text((x, cy - size * .6), head, font=f, fill=(*ORANGE, 255) if kcol > 0 else (*WHITE, 255), stroke_width=3, stroke_fill=(*NAVY, 255)); x += wh
    if kcol < 1:
        a = int(255 * (1 - kcol)); d.text((x, cy - size * .6), tail, font=font(F_EN, size * (1 - .5 * kcol) or 1), fill=(*WHITE, a))
    x += wt
    if dot:
        fd = font(F_EN, size * 1.25); d.text((x, cy - size * .75), '.', font=fd, fill=(*RED, 255), stroke_width=3, stroke_fill=(*NAVY, 255))

def board_end(L, d, t):
    ss = sec_segs('13-end'); chorus = ss[1]; turn = ss[3]
    lit = -1
    ws = [w for w in chorus['words'] if w['w'].strip(',!.').lower() in [n.lower() for n in NAMES]]
    for i, w in enumerate(ws):
        if t >= w['t0']: lit = i
    if t >= turn['t0']:
        lit = min(6, int((t - turn['t0']) / (turn['t1'] - turn['t0']) * 7))
        if t >= turn['t1']: lit = 7
    if chorus['t0'] > t: lit = -1
    for i, key in enumerate(ORDER):
        a = 2 * math.pi * i / 7 - math.pi / 2; cx = CX + 270 * math.cos(a); cy = 405 + 255 * math.sin(a)
        kk = back(prog(t, ss[0]['t0'] + .1 * i, .3)); on = (i == lit)
        paste_art(L, DAYS[key]['img'], cx, cy, 130, 130, kk * (1.25 if on else 1), ORANGE if on else CYAN)
        if kk > .5: text_center(d, NAMES[i], cx, cy + 82 * (1.25 if on else 1), font(F_EN, 28), (*ORANGE, 255) if on else (*WHITE, 255), 3, (*NAVY, 255))
    if t >= turn['t0'] and t < turn['t1']: your_turn(d, t, turn, 405 - 15)

CREDITS = ['Days of the Week', '', 'Phonics sounds: short a, e, u, th and er recorded by the teacher',
           'Wikimedia Commons recordings:', 'En-us-A.ogg, En-us-I.ogg (public domain)',
           'En-us-er.ogg by Dvortygirl (CC BY-SA 3.0)', 'En-us-u.ogg by Twocs (CC BY-SA 3.0)',
           'Voices: Microsoft Edge neural TTS', 'Font: Comic Relief (SIL Open Font License)', 'Pictures: gpt-image-2']
def credits(t):
    L = Image.new('RGBA', (W, H), (8, 14, 36, 255)); d = ImageDraw.Draw(L); k = clamp((t - TL['dur']) / .6)
    for i, ln in enumerate(CREDITS):
        f = font(F_EN, 64 if i == 0 else 38); text_center(d, ln, W / 2, 230 + i * 74 - (20 if i == 0 else 0), f, (*CYAN, 255) if i == 0 else (*WHITE, 255))
    L.putalpha(int(255 * k)); return L

BOARDS = {'01-open': board_open, '02-day': board_dayend, '10-ctx': board_ctx, '11-cap': board_cap, '12-abbr': board_abbr, '13-end': board_end}
def board(t):
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L); sec = sec_at(t)
    if sec in DAYS: board_day(L, d, t, sec)
    else: BOARDS[sec](L, d, t)
    return L

# ---------- 字幕：星期單字自動變橘色 ----------
SUB_SIZE, SUB_BOTTOM, SUB_PAD, SUB_MAXW = 72, 960, 18, 1600
DAY_RE = re.compile(r'(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun\.|Mon\.|Tue\.|Wed\.|Thu\.|Fri\.|Sat\.)')
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
    if not s: return L
    if s['kind'] in ('say', 'zh'): txt, col = s['text'], (*CYAN, 255) if s['kind'] == 'say' else (255, 255, 255, 255)
    elif s['kind'] == 'sound': txt, col = SOUND_LABEL[s['clip']], (*ORANGE, 255)
    else: txt, col = 'Your turn!  換你唸！', (255, 255, 255, 255)
    if s['who'] == 'cosmo' and s['kind'] == 'say': col = (150, 225, 255, 255)
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
    if os.environ.get('RENDER_UNTIL'): n = round(float(os.environ['RENDER_UNTIL']) * FPS)   # 試片：只渲染到這一秒
    if '--frames' in sys.argv: print(n); sys.exit()
    if '--still' in sys.argv:
        for v in sys.argv[sys.argv.index('--still') + 1:]:
            frame(float(v)).save(out / f'still-{float(v):06.2f}.jpg', quality=90); print(v)
        sys.exit()
    if '--segment' in sys.argv:
        i = sys.argv.index('--segment'); g0, g1, seg_out = int(sys.argv[i + 1]), int(sys.argv[i + 2]), sys.argv[i + 3]
        ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                               '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', seg_out], stdin=subprocess.PIPE)
        for g in range(g0, min(g1, n)):
            ff.stdin.write(frame(g / FPS).tobytes())
            if (g - g0) % 300 == 0: print(f'[{g0}-{g1}] {g}', flush=True)
        ff.stdin.close(); ff.wait(); print('done', seg_out); sys.exit()
