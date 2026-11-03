"""render_v1.py — 影片 3 Is it ___ today?（2026-11-02 從影片 2 複製；新增 swap／merge 動畫、Yes 綠✔／No 紅✘、句尾 ↗）；原說明：影片 2 What day is today?（兩位老師＋對話動畫，1920×1080、30 fps）；前半段從影片 1 的 render_v1.py 複製。
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
ease = lambda k: k * k * (3 - 2 * k)
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
            pd = pathlib.Path(d) / ('patches-v2' if (pathlib.Path(d) / 'patches-v2/patches.json').exists() else 'patches')   # 2026-11-02 斜臉嘴型 v2（face_set2.py）
            patches = json.loads((pd / 'patches.json').read_text(encoding='utf-8')); patches['_dir'] = str(pd)
            self.cfg[pose] = (base, pathlib.Path(d), patches)
        return self.cfg[pose]
    def image(self, pose, mouth, blink):
        key = (pose, mouth, blink)
        if key not in self.cache:
            base, d, pj = self.pose_files(pose)
            im = Image.open(base).convert('RGBA')
            if mouth and pathlib.Path(pj['_dir']).name != 'patches-v2': mouth = None   # 2026-11-03：沒有新嘴型的姿勢（P01／P08 交接瞬間）不貼舊嘴型，避免灰痕
            for vid in ([mouth] if mouth else []) + (['B01_blink'] if blink else []):
                if vid in pj['patches']:
                    im.alpha_composite(Image.open(pathlib.Path(pj['_dir']) / f'{vid}.png').convert('RGBA'), tuple(pj['patches'][vid]['x2_xy']))
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
        elif s['who'] == who and s['kind'] == 'say' and re.match(r"(Let me check! )?Yes, it is", s['text']): p = 'P07'   # 影片 3：答 Yes 比讚
        elif s['who'] == who and s['kind'] == 'say' and re.match(r"(Hmm\.\.\. )?No, it isn't", s['text']): p = 'P06'   # 答 No 想一想
        elif s['kind'] == 'turn':
            p = 'P08' if lead is not None and lead['sec'] == s['sec'] and lead['who'] in (who, 'both') else 'P01'
        elif s['who'] in (who, 'both'):
            if hold and hold[1] == s['sec'] and s['kind'] != 'zh' and tr and tr[-1][1] == hold[0]: p = hold[0]
            elif s['kind'] == 'zh': p = 'P05'
            elif s['sec'] in ('02-swap', '03-yes', '04-no', '05-demo', '06-ctx', '07-talk', '08-quiz'): p = POINT[who]
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
import talk_deluxe as TD
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
    out = [c for k, c in (('問號發光', '?'), ('句點發光', '.'), ('撇號發光', "'")) if k in vis and c in line]
    for m in re.finditer(r"([A-Za-z' ?]+?) (?:發光|放大)", vis):
        ph = m.group(1).strip()
        if ph and ph in line: out.append(ph)
    return out

def draw_card_line(d, line, cy, size, hots, k=1.0, maxw=800, cx=None):
    cx = CX if cx is None else cx
    f = font(F_EN, size)
    while d.textlength(line, font=f) > maxw and size > 30: size -= 2; f = font(F_EN, size)
    pat = '(' + '|'.join([re.escape(h) for h in hots] + [DAY_RE.pattern[1:-1], r'\bYes\b', r'\bNo\b']) + ')'
    parts = [p for p in re.split(pat, line) if p]
    x = cx - d.textlength(line, font=f) / 2
    LAST_END[0] = (cx + d.textlength(line, font=f) / 2, cy)
    for p in parts:
        col = ORANGE if (p in hots or DAY_RE.fullmatch(p)) else GREEN if p == 'Yes' else (255, 95, 95) if p == 'No' else WHITE
        d.text((x, cy - size * .62), p, font=f, fill=(*col, int(255 * k)), stroke_width=3, stroke_fill=(*NAVY, int(255 * k))); x += d.textlength(p, font=f)

LAST_END = [(0, 0)]   # 最後畫的一行字卡的右端（給 ↗ 用）
def vparts(s): return set((s['vis'] if s else '').split('；'))
def check_mark(d, cx, cy, r, k, ok):
    """綠色圓＋勾（ok）或紅色圓＋叉；程式畫，不靠字型。"""
    r *= k
    if r < 2: return
    col = (60, 190, 100) if ok else (230, 70, 70)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*col, 255), outline=(*WHITE, 255), width=4)
    if ok: d.line([(cx - r * .45, cy + r * .02), (cx - r * .1, cy + r * .38), (cx + r * .5, cy - r * .35)], fill=(*WHITE, 255), width=max(2, round(r * .22)), joint='curve')
    else:
        for a, b in (((-.38, -.38), (.38, .38)), ((-.38, .38), (.38, -.38))):
            d.line([(cx + r * a[0], cy + r * a[1]), (cx + r * b[0], cy + r * b[1])], fill=(*WHITE, 255), width=max(2, round(r * .22)))
def rise_arrow(d, x, y, k, t):
    """句尾上揚箭頭 ↗：每 1.2 秒畫一次。"""
    if k <= .3: return
    q = .85 + .15 * math.sin(2 * math.pi * t / 1.2)   # 整支箭頭一直看得到，輕輕放大縮小（靜止畫面也清楚）
    x1, y1 = x + 70 * q, y - 55 * q
    d.line([(x, y), (x1, y1)], fill=(*ORANGE, 255), width=9)
    if q > .3:
        a = math.atan2(y1 - y, x1 - x)
        for da in (2.6, -2.6):
            d.line([(x1, y1), (x1 + 26 * math.cos(a + da), y1 + 26 * math.sin(a + da))], fill=(*ORANGE, 255), width=9)
def marks(d, t, s, cy, box_h, k, y0=None, lh=0):
    """✔／✘ 畫在字卡框內左側（不會被老師的手擋住）；↗ 由 card() 在最後一行字後面畫。"""
    vp = vparts(s)
    if 'yes' in vp and 'no' in vp: check_mark(d, CX - 375, y0, 34, k, True); check_mark(d, CX - 375, y0 + lh, 34, k, False)
    elif 'yes' in vp: check_mark(d, CX - 375, cy, 38, k, True)
    elif 'no' in vp: check_mark(d, CX - 375, cy, 38, k, False)

def swap_anim(d, t, s, cy, size=78):
    """It is Monday today. → Is it Monday today?：It 和 is 換位置（上下弧線），句點變問號。"""
    p = ease(clamp((t - s['t0'] - .5) / 1.6))
    A = ['It', 'is', 'Monday', 'today', '.']; B = ['Is', 'it', 'Monday', 'today', '?']
    f = font(F_EN, size); sp = d.textlength(' ', font=f)
    def xs(words):
        ws = [d.textlength(w, font=f) for w in words]; x = CX - (sum(ws) + sp * 3) / 2; out = []
        for i, w in enumerate(ws): out.append(x); x += w + (sp if i < 3 else 0)
        return out
    xa, xb = xs(A), xs(B)
    d.rounded_rectangle((CX - 430, cy - 70, CX + 430, cy + 70), 30, fill=(10, 20, 45, 215), outline=(*CYAN, 255), width=4)
    def put(txt, x, y, col, a=1.0):
        d.text((x, y - size * .62), txt, font=f, fill=(*col, int(255 * a)), stroke_width=3, stroke_fill=(*NAVY, int(255 * a)))
    put('It' if p < .5 else 'it', xa[0] + (xb[1] - xa[0]) * p, cy + 90 * math.sin(math.pi * p), ORANGE)   # It 從下方繞到後面
    put('is' if p < .5 else 'Is', xa[1] + (xb[0] - xa[1]) * p, cy - 90 * math.sin(math.pi * p), ORANGE)   # is 從上方繞到前面
    put('Monday', xa[2] + (xb[2] - xa[2]) * p, cy, ORANGE); put('today', xa[3] + (xb[3] - xa[3]) * p, cy, WHITE)
    put('.', xa[4] + (xb[4] - xa[4]) * p, cy, WHITE, 1 - p); put('?', xb[4], cy, ORANGE, p)

def merge_anim(d, t, s, cy, size=96):
    """is not → isn't：兩個字靠攏，o 縮小消失，撇號從上方掉進來。"""
    p = ease(clamp((t - s['t0'] - .5) / 1.6))
    f = font(F_EN, size); W_ = lambda x: d.textlength(x, font=f)
    a0 = CX - W_('is not') / 2; b0 = CX - W_("isn't") / 2
    pa = {'is': a0, 'n': a0 + W_('is '), 'o': a0 + W_('is n'), 't': a0 + W_('is no')}
    pb = {'is': b0, 'n': b0 + W_('is'), "'": b0 + W_('isn'), 't': b0 + W_("isn'")}
    d.rounded_rectangle((CX - 330, cy - 80, CX + 330, cy + 80), 30, fill=(10, 20, 45, 215), outline=(*CYAN, 255), width=4)
    def put(txt, x, y, col, a=1.0, sc=1.0):
        ff = font(F_EN, max(1, size * sc)); d.text((x, y - size * .62), txt, font=ff, fill=(*col, int(255 * a)), stroke_width=3, stroke_fill=(*NAVY, int(255 * a)))
    for k_ in ('is', 'n', 't'): put(k_, pa[k_] + (pb[k_] - pa[k_]) * p, cy, WHITE)
    put('o', pa['o'] + (pb["'"] - pa['o']) * p, cy, RED, 1 - p, max(.05, 1 - p))
    put("'", pb["'"], cy - 120 * (1 - p), ORANGE, p)

def card(d, t, s, cy, size=74):
    tg = tags(s); txt = tg.get('card')
    if not txt: return
    first = next(x for x in SEGS if tags(x).get('card') == txt and x['t0'] <= s['t0'] and x['sec'] == s['sec'])
    k = 1.0 if '完成' in s['vis'] else back(prog(t, first['t0'], .35))
    if '在上方' in s['vis']: lines = ['What day is today?', '=', txt]
    elif ' = ' in txt: a, b = txt.split(' = '); lines = [a, '=', b]
    elif ' / ' in txt: lines = txt.split(' / ')
    else:
        m = re.match(r"((?:Yes, it is\.)|(?:No, it isn't\. It's \w+\.)) (.+)", txt)   # 答句＋語境句：拆成兩行，字才不會太小
        lines = [m.group(1), m.group(2)] if m else [txt]
    hots = hot_phrases(s['vis'], ' '.join(lines))
    lh = size * 1.18 if len(lines) > 1 else 0; y0 = cy - lh * (len(lines) - 1) / 2
    box_h = size * .75 + lh * (len(lines) - 1) + 40
    d.rounded_rectangle((CX - 430, cy - box_h / 2 - 10, CX + 430, cy + box_h / 2 + 10), 30, fill=(10, 20, 45, int(215 * k)), outline=(*CYAN, int(255 * k)), width=4)
    yn = bool({'yes', 'no'} & vparts(s)); tx = CX + 40 if yn else CX
    marks(d, t, s, cy, box_h, k, y0, lh)
    for i, ln in enumerate(lines):
        if ln == '=': text_center(d, '=', CX, y0 + i * lh, font(F_EN, size * .8 * k or 1), (*ORANGE, 255)); continue
        draw_card_line(d, ln, y0 + i * lh, size * k or 1, hots, k, 700 if yn else 800, tx)
    if 'rise' in vparts(s): ex, ey = LAST_END[0]; rise_arrow(d, ex + 14, ey + 4, k, t)
    gl = re.findall('「(.+?)」', s['vis'])
    if gl:
        g0 = next(x for x in SEGS if gl[-1] in x['vis'] and x['sec'] == s['sec'])
        kk = back(prog(t, g0['t0'], .35))
        if kk > 0:
            gy = cy + box_h / 2 + 52
            gw = max(230, d.textlength(gl[-1], font=font(F_ZH, 52)) / 2 + 40)
            d.rounded_rectangle((CX - gw, gy - 38 * kk, CX + gw, gy + 38 * kk), 26, fill=(*ORANGE, 235))
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
    """影片 3 開場：標題 → 回顧影片 2（What day is today? It's Friday.）→ 新問句 → 兩種問句並排對比。"""
    s = last_seg(t); tg = tags(s)
    if not tg:
        k = back(prog(t, sec_segs('01-open')[0]['t0']))
        text_center(d, 'Is it ___ today?', CX, 430, font(F_EN, 84 * k), (*CYAN, 255), 4, (*NAVY, 255))
        text_center(d, "Yes, it is. / No, it isn't.", CX, 550, font(F_EN, 56 * k), (*WHITE, 255), 3, (*NAVY, 255)); return
    if '兩張字卡並排' in s['vis']:
        k = back(prog(t, s['t0'], .4))
        for i, (q, zh, col) in enumerate((('What day is today?', '問：星期幾？', CYAN), ('Is it Friday today?', '問：是不是？', ORANGE))):
            cy = 250 + i * 250
            d.rounded_rectangle((CX - 400, cy - 70, CX + 400, cy + 70), 30, fill=(10, 20, 45, int(215 * k)), outline=(*col, 255), width=5)
            draw_card_line(d, q, cy - 8, 64 * k or 1, [], k)
            if i == 1: ex, ey = LAST_END[0]
            text_center(d, zh, CX, cy + 110, font(F_ZH, 46 * k or 1), (*col, 255), 3, (*NAVY, 255))
        rise_arrow(d, ex + 14, ey + 4, k, t); return
    board_generic(L, d, t)

def board_open_v2(L, d, t):   # 影片 2 的開場（保留參考）
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
    vp = vparts(s)
    if 'swap' in vp: swap_anim(d, t, s, 400); return
    if 'merge' in vp: merge_anim(d, t, s, 400); return
    day = tg.get('cal') or tg.get('quiz'); img = tg.get('img')
    if img:
        first = next(x for x in SEGS if tags(x).get('img') == img and x['sec'] == s['sec'])
        paste_art(L, img, CX - 40, 320, 640, 427, back(prog(t, first['t0'], .4)))
        if day: calendar(L, d, t, day, CX + 330, 250, 170)
        card(d, t, s, 640, 60)
    elif day:
        first = next(x for x in SEGS if (tags(x).get('cal') or tags(x).get('quiz')) == day and x['t0'] <= s['t0'] and x['sec'] == s['sec'])
        covered = False   # 影片 3：學生要看月曆才能回答 Yes／No
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

# 2026-10-30 老師：學生對嘴有些嘴型跟不上單字 → 改成「聲音大小決定張多大、單字字母只決定圓嘴或扁嘴」，
# 每 1/15 秒最多換一次嘴型；字和字之間聲音變小時自然閉嘴。
_ENV = None
def voice_env():
    global _ENV
    if _ENV is None:
        import soundfile as sf, numpy as np
        a, sr = sf.read(str(HERE / 'voice_v1.wav'), dtype='float32')
        if a.ndim > 1: a = a.mean(1)
        hop = sr // 100; n = len(a) // hop
        rms = np.sqrt((a[:n * hop].reshape(n, hop) ** 2).mean(1))
        rms = np.convolve(rms, np.ones(3) / 3, 'same')
        _ENV = (rms / max(np.percentile(rms[rms > 1e-4], 95), 1e-6)).clip(0, 1.2)
    return _ENV
def kid_mouth(w, t):
    tq = math.floor(t * 15) / 15 + 1 / 30
    env = voice_env(); e = float(env[min(len(env) - 1, int(tq * 100))])
    v = mouth_at(w, tq) or 'M08_mid'
    if e < .12: return 'M01_rest'
    if v in ('M04_O', 'M05_U'): return 'M05_U' if e < .35 else 'M04_O'
    if v == 'M03_E': return 'M03_E' if e < .7 else 'M02_A'
    if v in ('M06_FV', 'M07_L'): return 'M08_mid'
    return 'M02_A' if e > .55 else 'M08_mid'

def board_talk(L, d, t):
    s = last_seg(t); tg = tags(s); cur = seg_at(t)
    if 'talk' not in tg:   # 段落開頭的標題
        k = back(prog(t, s['t0']))
        text_center(d, 'Listen to Amy and Ben!', CX, 380, font(F_EN, 62 * k), (*CYAN, 255), 4, (*NAVY, 255)); return
    no = int(tg['talk']); scene = next(x[1] for x in TALKS if x[0] == no)
    t_in = next(x for x in SEGS if tags(x).get('talk') == str(no))['t0'] - .3
    # 2026-10-30 華麗版（規格卡 RDQ-spec-video2-dialogues-deluxe）：Codex 生圖素材＋程式剪紙動畫，每句有自己的鏡頭與動作
    ps_ = tg.get('pass') or '2'   # 問答時停在第二遍最後一句的畫面
    lines = [(x['t0'], x['t1'], x['who'], x['text']) for x in SEGS if tags(x).get('talk') == str(no) and tags(x).get('pass') == ps_ and x['who'] in ('amy', 'ben')]
    tt = t if tg.get('pass') else lines[-1][1] - .05
    talking_fn = lambda w, tq: bool(seg_at(tq) and seg_at(tq)['who'] == w)
    mouth_fn = kid_mouth
    P = TD.panel(no, tt, lines, mouth_fn, talking_fn)
    k = clamp((t - t_in) / .4); x0, y0 = CX - TD.PW // 2, 92
    if k < 1:
        P = P.resize((max(2, round(TD.PW * (.9 + .1 * k))), max(2, round(TD.PH * (.9 + .1 * k)))))
        x0, y0 = CX - P.width // 2, 92 + (TD.PH - P.height) // 2
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
_WRAP = {}
def wrap_sub(d, txt):
    """2026-11-02：長中文句可在中文標點或中文字之間換行，兩行還太寬就排三行（原本只能在空白處切兩行，會超出畫面）。"""
    if txt in _WRAP: return _WRAP[txt]
    W_ = lambda x: mixed_width(d, x, SUB_SIZE, F_EN_REG)
    if W_(txt) <= SUB_MAXW: _WRAP[txt] = [txt]; return [txt]
    cjk = lambda c: ord(c) > 0x2e80
    pos = [i for i in range(1, len(txt)) if txt[i - 1] == ' ' or txt[i - 1] in '，。；：？！」、' or (cjk(txt[i - 1]) and cjk(txt[i]))]
    pen = lambda i: 0 if (txt[i - 1] == ' ' or txt[i - 1] in '，。；：？！」、') else 90   # 優先在標點或空白換行
    best = None
    for i in pos:
        ls = [txt[:i].strip(), txt[i:].strip()]; m = max(map(W_, ls)) + pen(i)
        if best is None or m < best[0]: best = (m, ls)
    if best[0] - 90 > SUB_MAXW:   # 兩行不夠，排三行
        for a in pos:
            for b in pos:
                if b <= a: continue
                ls = [txt[:a].strip(), txt[a:b].strip(), txt[b:].strip()]; m = max(map(W_, ls)) + pen(a) + pen(b) + 400
                if m < best[0]: best = (m, ls)
    _WRAP[txt] = best[1]; return best[1]
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

CREDITS = ['Is it Monday today?', '', 'Voices: Microsoft Edge neural TTS', 'Font: Comic Relief (SIL Open Font License)',
           'Pictures: gpt-image-2 and Codex', 'Amy and Ben: Codex images, animated with code']
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
