"""render_pilot_v2.py — Ms. Nova 對嘴試片 v2（規格卡 r1；約 53 秒，1920×1080、30 fps）。
新增：全息螢幕「發音按鈕」播放下載／老師錄的發音（喇叭＋聲波），帶唸兩輪、每輪 2 秒倒數「Your turn! 換你唸！」，整字也帶唸兩輪；中文由曉臻說。
用法：python -I render_pilot_v2.py [--still T ...]   不給 --still 就輸出 renders/pilot-nova-v2.mp4
"""
import sys, json, math, pathlib, subprocess, re
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
ST = HERE.parent
W, H, FPS = 1920, 1080, 30
TL = json.loads((HERE / 'timeline_v2.json').read_text(encoding='utf-8'))
SEGS = TL['segs']
FACE = ST / 'characters/nova/face-nova-P01-v2'
PATCH = json.loads((FACE / 'patches/patches.json').read_text(encoding='utf-8'))['patches']
F_EN = 'C:/Windows/Fonts/ARLRDBD.TTF'; F_ZH = 'C:/Windows/Fonts/msjhbd.ttc'; F_IPA = 'C:/Windows/Fonts/segoeuib.ttf'
_fc = {}
def font(f, s):
    k = (f, max(1, int(s)))
    if k not in _fc: _fc[k] = ImageFont.truetype(f, k[1])
    return _fc[k]
CYAN, ORANGE, RED, INK, WHITE, NAVY = (46, 197, 232), (255, 138, 61), (255, 80, 80), (30, 40, 70), (255, 255, 255), (10, 20, 50)

# ---------- 嘴形 ----------
LETTER_NAME = {'U': ['M03_E', 'M05_U'], 'A': ['M03_E'], 'Y': ['M02_A', 'M03_E']}
WORD = {'a': ['M08_mid'], 'ms.': ['M01_rest', 'M03_E', 'M08_mid'], "i'm": ['M02_A', 'M03_E', 'M01_rest'],
        'the': ['M07_L', 'M08_mid'], 'say': ['M08_mid', 'M03_E'], 'of': ['M08_mid', 'M06_FV'], 'job': ['M08_mid', 'M04_O', 'M01_rest'],
        'great': ['M08_mid', 'M03_E', 'M08_mid'], 'me': ['M01_rest', 'M03_E'], 'now': ['M08_mid', 'M04_O']}
ZH = {'是': 'M08_mid', '星': 'M03_E', '期': 'M03_E', '日': 'M08_mid'}
DIG = [('th', 'M07_L'), ('sh', 'M05_U'), ('ch', 'M05_U'), ('wh', 'M05_U'), ('ee', 'M03_E'), ('ea', 'M03_E'), ('ay', 'M03_E'),
       ('ai', 'M03_E'), ('ey', 'M03_E'), ('oo', 'M05_U'), ('ou', 'M04_O'), ('ow', 'M04_O'), ('ck', 'M08_mid')]
# 一般 e/i/y 用微張；長音 ee/ay 與字母名才用 E
ONE = {'a': 'M02_A', 'e': 'M08_mid', 'i': 'M08_mid', 'o': 'M04_O', 'u': 'M02_A', 'y': 'M08_mid', 'w': 'M05_U', 'f': 'M06_FV',
       'v': 'M06_FV', 'm': 'M01_rest', 'b': 'M01_rest', 'p': 'M01_rest', 'l': 'M07_L'}
VOWEL = {'M02_A', 'M03_E', 'M04_O', 'M05_U'}

def word_visemes(w):
    raw = w.strip('.,!?')
    if raw in LETTER_NAME: return LETTER_NAME[raw]
    lw = w.lower().strip(',!?')
    if lw in WORD: return WORD[lw]
    lw = re.sub(r'[^a-z]', '', lw)
    if len(lw) > 3 and lw.endswith('e') and lw[-2] not in 'aeiou': lw = lw[:-1]
    out, i = [], 0
    while i < len(lw):
        d = next((v for k, v in DIG if lw.startswith(k, i)), None)
        if d: out.append(d); i += 2; continue
        out.append(ONE.get(lw[i], 'M08_mid')); i += 1
    return [v for k, v in enumerate(out) if k == 0 or v != out[k - 1]] or ['M08_mid']

def build_track():
    track = []
    for s in SEGS:
        if s['kind'] not in ('say', 'zh'): continue
        ws = s['words']
        if s['kind'] == 'zh':   # WordBoundary 中文字在 Windows 會亂碼：第一個字是 Sunday，其餘時間平均分給「是星期日」
            en, rest = ws[0], ws[1:]; a, b = rest[0]['t0'], rest[-1]['t1']
            ws = [en] + [{'w': c, 't0': a + k * (b - a) / 4, 't1': a + (k + 1) * (b - a) / 4} for k, c in enumerate('是星期日')]
        for w in ws:
            vs = [ZH[w['w']]] if w['w'] in ZH else word_visemes(w['w'])
            wt = [1.0 if v in VOWEL else .6 for v in vs]; tot = sum(wt); t = w['t0']; d = max(w['t1'] - w['t0'], .08)
            for v, k in zip(vs, wt): track.append((t, t + d * k / tot, v)); t += d * k / tot
    return track
TRACK = build_track()
(HERE / 'visemes_v2.json').write_text(json.dumps(TRACK), encoding='utf-8')

def seg_at(t):
    return next((s for s in SEGS if s['t0'] <= t < s['t1']), None)

def mouth_at(t):
    s = seg_at(t)
    if s and s['kind'] == 'sound':   # Nova 跟著發音按鈕做嘴形（有聲音時才張嘴）
        k = int((t - s['t0']) * 30); env = s['env'][min(k, len(s['env']) - 1)]
        if env < .12: return None
        vs = s['visemes']; return vs[min(len(vs) - 1, int(len(vs) * (t - s['t0']) / (s['t1'] - s['t0'])))]
    for t0, t1, v in TRACK:
        if t0 - .03 <= t < t1 + .03: return v
    if s and s['kind'] in ('say', 'zh'): return 'M08_mid'
    return None

# ---------- 人物 ----------
K = 0.6
BASE = Image.open(ST / 'characters/nova/renders/nova-P01-v2-yaw0-x2.png').convert('RGBA')
CACHE = {}
def nova(mouth, blink):
    key = (mouth, blink)
    if key not in CACHE:
        im = BASE.copy()
        for vid in ([mouth] if mouth else []) + (['B01_blink'] if blink else []):
            im.alpha_composite(Image.open(FACE / 'patches' / f'{vid}.png').convert('RGBA'), tuple(PATCH[vid]['x2_xy']))
        CACHE[key] = im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS)
    return CACHE[key]
BLINKS = [2.6, 6.4, 9.9, 13.8, 17.2, 21.9, 25.0, 29.1, 33.4, 37.9, 42.2, 45.0, 48.8, 52.0]
def is_blink(t): return any(b <= t < b + .13 for b in BLINKS)

# ---------- 背景與工具 ----------
bg = Image.open(ST / 'art/bg-classroom-v1.png').convert('RGB')
BG = bg.resize((1920, 1280), Image.LANCZOS).crop((0, 60, 1920, 1140)).convert('RGBA')
SCREEN = (790, 235, 1810, 715); CX = (SCREEN[0] + SCREEN[2]) // 2
clamp = lambda x, a=0, b=1: max(a, min(b, x))
prog = lambda t, a, d=.35: clamp((t - a) / d)
def back(k):
    if k <= 0: return 0
    if k >= 1: return 1
    s = 1.7; k -= 1; return k * k * ((s + 1) * k + s) + 1
def seg(key, kind=None): return next(s for s in SEGS if s['key'] == key and (kind is None or s['kind'] == kind))
def word_t(key, w, n=0):
    hits = [x for x in seg(key, 'say')['words'] if x['w'].strip('.,!?').lower() == w.lower()]; return hits[n]['t0']
def text_center(d, s, cx, cy, f, fill, stroke=0, sf=None):
    b = d.textbbox((0, 0), s, font=f); d.text((cx - (b[2] - b[0]) / 2 - b[0], cy - (b[3] - b[1]) / 2 - b[1]), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=sf)

T_TITLE = seg('intro')['t0']; T_WORD = word_t('word', 'sunday')
T_U = seg('u_intro')['t0']; T_AY = seg('ay_intro')['t0']
T_SUN = word_t('sun', 'sun'); T_DAY = word_t('day', 'day')
T_BL1 = word_t('blend', 'sun'); T_BL2 = word_t('blend', 'sunday'); T_ZH = seg('zh')['t0']
CHIP = {'u': ('/ʌ/', seg('u_demo', 'sound')['t0']), 'ay': ('/eɪ/', seg('ay_demo', 'sound')['t0'])}
WORD_SAY = [word_t('w_r1', 'sunday'), seg('w_r2')['t0']]

def letters_layout(d, t, size):
    """回傳每個字母的 (字, 群組, x 中心, 寬)。群組 1＝u，2＝ay。"""
    f = font(F_EN, size); parts = [('S', 0), ('u', 1), ('n', 0), ('d', 0), ('a', 2), ('y', 2)]
    sep = 0
    if T_BL1 - .2 <= t < T_BL2: sep = 60 * clamp((t - (T_BL1 - .2)) / .3)
    if t >= T_BL2: sep = 60 * (1 - clamp((t - T_BL2) / .25))
    ws = [d.textlength(c, font=f) for c, _ in parts]; x = CX - (sum(ws) + sep) / 2; out = []
    for n, ((c, g), w) in enumerate(zip(parts, ws)):
        if n == 3: x += sep
        out.append((c, g, x + w / 2, w)); x += w
    return out

def sound_button(d, t, s, cx, cy):
    """喇叭圓鈕（單字左側）＋按鈕下方隨音量跳動的聲波條。"""
    k = int((t - s['t0']) * 30); env = s['env'][min(k, len(s['env']) - 1)]
    r = 44 + 6 * env
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*CYAN, 245), outline=(*WHITE, 255), width=4)
    d.polygon([(cx - 22, cy - 10), (cx - 8, cy - 10), (cx + 8, cy - 24), (cx + 8, cy + 24), (cx - 8, cy + 10), (cx - 22, cy + 10)], fill=(*INK, 255))
    for i in range(5):
        h = 10 + 50 * env * (0.55 + 0.45 * math.sin(t * 23 + i * 1.7) ** 2)
        x = cx - 58 + i * 25; d.rounded_rectangle((x, cy + 100 - h / 2, x + 14, cy + 100 + h / 2), 7, fill=(*ORANGE, 255))

def board(t):
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    s = seg_at(t)
    turn = s if s and s['kind'] == 'turn' else None
    # 標題（跟讀時讓位給 Your turn）
    k = back(prog(t, T_TITLE)) if not turn else 0
    if k > 0: text_center(d, 'Days of the Week', CX, 300, font(F_EN, 58 * k), (*CYAN, 255))
    if t >= T_WORD:
        k = back(prog(t, T_WORD, .45)); size = 170 * k or 1
        whole = turn and turn['target'] == 'word'
        say_pulse = max([math.sin(math.pi * clamp((t - a) / .6)) for a in WORD_SAY] + [0])
        for c, g, xc, w in letters_layout(d, t, size):
            hot = (g == 1 and t >= T_U) or (g == 2 and t >= T_AY)
            focus = turn and ((turn['target'] == 'u' and g == 1) or (turn['target'] == 'ay' and g == 2))
            pul = 1.0
            if g in (0, 1) and c in 'Sun': pul += .08 * math.sin(math.pi * clamp((t - T_SUN) / .5)) + .08 * math.sin(math.pi * clamp((t - T_BL1) / .5))
            if c in 'day': pul += .08 * math.sin(math.pi * clamp((t - T_DAY) / .5)) + .08 * math.sin(math.pi * clamp((t - (T_BL1 + .45)) / .5))
            if focus: pul += .12 + .04 * math.sin(t * 8)
            pul += .06 * say_pulse
            fs = font(F_EN, size * pul)
            col = (*ORANGE, 255) if hot else (*WHITE, 255)
            if whole: col = (*CYAN, 255) if not hot else (*ORANGE, 255)
            b = d.textbbox((0, 0), c, font=fs); ww = d.textlength(c, font=fs)
            d.text((xc - ww / 2, 470 - b[3] / 2 - 10), c, font=fs, fill=col, stroke_width=3, stroke_fill=(*NAVY, 255))
            if hot: d.line((xc - w / 2 + 6, 542, xc + w / 2 - 6, 542), fill=(*RED, 255), width=9)
        # 音標小卡：第一次示範播音時出現，放在該字母群下方
        lay = letters_layout(d, t, 170)
        for g, (name, ts) in ((1, CHIP['u']), (2, CHIP['ay'])):
            kk = back(prog(t, ts)) * (1 - clamp((t - T_ZH) / .3))
            if kk <= 0: continue
            xs = [xc for c, gg, xc, w in lay if gg == g]; xm = sum(xs) / len(xs)
            f2 = font(F_IPA, 60 * kk); bb = d.textbbox((0, 0), name, font=f2); bw, bh = bb[2] - bb[0] + 46, bb[3] - bb[1] + 28
            d.rounded_rectangle((xm - bw / 2, 610 - bh / 2, xm + bw / 2, 610 + bh / 2), 22, fill=(*ORANGE, 235))
            text_center(d, name, xm, 610, f2, (*WHITE, 255))
    # 發音按鈕：播音時出現在螢幕右下
    if s and s['kind'] == 'sound':
        sound_button(d, t, s, SCREEN[0] + 92, 455)
    # 跟讀：Your turn! 換你唸！＋第幾輪＋2 秒倒數條
    if turn:
        kk = back(prog(t, turn['t0'], .3)); rnd = 1 if turn['key'].endswith('r1') else 2
        f3 = font(F_EN, 50 * kk); f4 = font(F_ZH, 40 * kk)
        txt = 'Your turn!'; bw = d.textlength(txt, font=f3) + d.textlength(' 換你唸！', font=f4) + 80
        d.rounded_rectangle((CX - bw / 2, 300 - 42 * kk, CX + bw / 2, 300 + 42 * kk), 42, fill=(*CYAN, 245))
        x0 = CX - bw / 2 + 40; d.text((x0, 300 - 30 * kk), txt, font=f3, fill=(*INK, 255))
        d.text((x0 + d.textlength(txt, font=f3) + 16, 300 - 26 * kk), '換你唸！', font=f4, fill=(*INK, 255))
        for i in (1, 2):  # 第幾輪的圓點
            xx = SCREEN[2] - 150 + (i - 1) * 50
            d.ellipse((xx - 16, 255 - 16, xx + 16, 255 + 16), fill=(*ORANGE, 255) if i <= rnd else (60, 80, 120, 255))
        p = clamp((t - turn['t0']) / (turn['t1'] - turn['t0']))
        d.rounded_rectangle((CX - 300, 668, CX + 300, 684), 8, fill=(40, 60, 100, 255))
        d.rounded_rectangle((CX - 300, 668, CX - 300 + 600 * (1 - p), 684), 8, fill=(*ORANGE, 255))
    if t >= T_ZH:
        kk = back(prog(t, T_ZH + .5))
        if kk > 0: text_center(d, '星期日', CX, 625, font(F_ZH, 80 * kk), (*WHITE, 255), 3, (*NAVY, 255))
    return L

def subtitle(t):
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); s = seg_at(t)
    if s is None:  # 段落之間的短空檔沿用前一段字幕
        prev = [x for x in SEGS if x['t1'] <= t and t - x['t1'] < .35]; s = prev[-1] if prev else None
    if not s: return L
    if s['kind'] in ('say', 'zh'): txt, col = s['text'], (*CYAN, 255) if s['kind'] == 'say' else (255, 255, 255, 255)
    elif s['kind'] == 'sound': txt, col = {'short-u-1': 'u  /ʌ/', 'En-us-A_upper': 'ay  /eɪ/'}[s['clip']], (*ORANGE, 255)
    else: txt, col = 'Your turn!  換你唸！', (255, 255, 255, 255)
    d = ImageDraw.Draw(L); f = font(F_IPA if s['kind'] == 'sound' else F_ZH, 46); w = d.textlength(txt, font=f)
    d.rounded_rectangle((W / 2 - w / 2 - 30, 975, W / 2 + w / 2 + 30, 1050), 18, fill=(10, 20, 45, 190))
    d.text((W / 2 - w / 2, 985), txt, font=f, fill=col)
    return L

def name_tag(t, L):
    a = word_t('hello', 'nova'); k = back(prog(t, a)) * (1 - clamp((t - (seg('intro')['t1'] + .5)) / .4))
    if k <= 0: return
    d = ImageDraw.Draw(L); f = font(F_EN, 44 * k); s = 'Ms. Nova'; w = d.textlength(s, font=f)
    d.rounded_rectangle((420 - w / 2 - 28, 860 - 36 * k, 420 + w / 2 + 28, 860 + 36 * k), 34, fill=(*CYAN, 235))
    text_center(d, s, 420, 860, f, (*INK, 255))

def frame(t):
    im = BG.copy(); im.alpha_composite(board(t))
    m = mouth_at(t); s = seg_at(t)
    talking = m is not None and not (s and s['kind'] == 'sound')
    nv = nova(m, is_blink(t))
    breathe = 1 + .006 * math.sin(2 * math.pi * t / 3.6)
    bob = 6 * math.sin(2 * math.pi * t * 2.2) if talking else 0
    lean = 1.2 if (s and s['kind'] == 'turn') else 0          # 等學生跟唸時微微側身，像在聆聽
    sway = .8 * math.sin(2 * math.pi * t / 7.0) + lean
    n2 = nv.resize((nv.width, round(nv.height * breathe)))
    n2 = n2.rotate(sway, resample=Image.BICUBIC, center=(n2.width / 2, n2.height), expand=False)
    im.alpha_composite(n2, (420 - n2.width // 2, round(20 - 114 * K + bob)))
    name_tag(t, im); im.alpha_composite(subtitle(t))
    z = 1 + .035 * clamp(t / TL['dur'])
    cw, ch = W / z, H / z; x0, y0 = (W - cw) * .45, (H - ch) * .4
    im = im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((W, H), Image.BICUBIC)
    return im.convert('RGB')

if __name__ == '__main__':
    out = HERE / 'renders'; out.mkdir(exist_ok=True)
    if '--still' in sys.argv:
        for v in sys.argv[sys.argv.index('--still') + 1:]:
            frame(float(v)).save(out / f'v2-still-{float(v):05.2f}.jpg', quality=90); print(v)
        sys.exit()
    n = round(TL['dur'] * FPS); dst = out / 'pilot-nova-v2.1.mp4'   # v2.1：Nova 語速 0.8 倍
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-i', str(HERE / 'voice_v2.wav'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium',
                           '-c:a', 'aac', '-b:a', '192k', '-shortest', str(dst)], stdin=subprocess.PIPE)
    for g in range(n):
        ff.stdin.write(frame(g / FPS).tobytes())
        if g % 300 == 0: print(g, '/', n, flush=True)
    ff.stdin.close(); ff.wait(); print(dst)
