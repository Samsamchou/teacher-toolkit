"""render_pilot.py — Ms. Nova 對嘴試片（約 24 秒，1920×1080、30 fps）。
畫面：科幻教室背景＋Nova（Tripo P01 渲染圖，呼吸／輕擺／眨眼／嘴形）＋右側全息螢幕上的程式字卡（Sunday 拼讀）＋底部字幕。
嘴形：依 timeline.json 每個字的時間，把字母規則轉成嘴形序列（visemes.json 可檢查）。
用法：python -I render_pilot.py [--still T ...]   不給 --still 就輸出 renders/pilot-nova-v1.mp4
"""
import sys, json, math, pathlib, subprocess, re
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
ST = HERE.parent
W, H, FPS = 1920, 1080, 30
TL = json.loads((HERE / 'timeline.json').read_text(encoding='utf-8'))
FACE = ST / 'characters/nova/face-nova-P01-v2'
PATCH = json.loads((FACE / 'patches/patches.json').read_text(encoding='utf-8'))['patches']
F_EN = 'C:/Windows/Fonts/ARLRDBD.TTF'; F_ZH = 'C:/Windows/Fonts/msjhbd.ttc'
font = lambda f, s: ImageFont.truetype(f, s)
CYAN, ORANGE, RED, INK, WHITE = (46, 197, 232), (255, 138, 61), (255, 80, 80), (30, 40, 70), (255, 255, 255)

# ---------- 嘴形：字母規則 ----------
LETTER_NAME = {'U': ['M03_E', 'M05_U'], 'A': ['M03_E'], 'Y': ['M02_A', 'M03_E']}
WORD = {'uh': ['M02_A'], 'a': ['M08_mid'], 'ms.': ['M01_rest', 'M03_E', 'M08_mid'], "i'm": ['M02_A', 'M03_E', 'M01_rest'],
        'the': ['M07_L', 'M08_mid'], 'says': ['M08_mid', 'M03_E', 'M08_mid'], 'say': ['M08_mid', 'M03_E'],
        'of': ['M08_mid', 'M06_FV'], 'is': ['M03_E', 'M08_mid']}
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
    if len(lw) > 3 and lw.endswith('e') and lw[-2] not in 'aeiou': lw = lw[:-1]   # 字尾不發音的 e
    out, i = [], 0
    while i < len(lw):
        d = next((v for k, v in DIG if lw.startswith(k, i)), None)
        if d: out.append(d); i += 2; continue
        out.append(ONE.get(lw[i], 'M08_mid')); i += 1
    dedup = [v for k, v in enumerate(out) if k == 0 or v != out[k - 1]]
    return dedup or ['M08_mid']

def build_track():
    track = []  # (t0, t1, viseme)
    for ln in TL['lines']:
        ws = ln['words']
        if ln['key'] == 'zh':  # 中文：WordBoundary 的文字在 Windows 會亂碼，改用原文字元分配時間
            en, rest = ws[0], ws[1:]
            ws = [en] + [{'w': c, 't0': rest[0]['t0'] + k * (rest[-1]['t1'] - rest[0]['t0']) / 4,
                          't1': rest[0]['t0'] + (k + 1) * (rest[-1]['t1'] - rest[0]['t0']) / 4} for k, c in enumerate('是星期日')]
        for w in ws:
            vs = [ZH[w['w']]] if w['w'] in ZH else word_visemes(w['w'])
            wt = [1.0 if v in VOWEL else .6 for v in vs]; tot = sum(wt); t = w['t0']; d = max(w['t1'] - w['t0'], .08)
            for v, k in zip(vs, wt):
                track.append((round(t, 3), round(t + d * k / tot, 3), v)); t += d * k / tot
    return track

TRACK = build_track()
(HERE / 'visemes.json').write_text(json.dumps(TRACK, ensure_ascii=False), encoding='utf-8')

def viseme_at(t):
    for t0, t1, v in TRACK:
        if t0 - .03 <= t < t1 + .03: return v
    # 句中兩字之間的短空檔：保持微張，不閉嘴
    for ln in TL['lines']:
        if ln['t0'] <= t < ln['t1']: return 'M08_mid'
    return None   # None＝原本的微笑閉嘴

# ---------- 人物圖層 ----------
K = 0.6   # x2 渲染圖 → 畫面
BASE = Image.open(ST / 'characters/nova/renders/nova-P01-v2-yaw0-x2.png').convert('RGBA')
def compose(mouth, blink):
    im = BASE.copy()
    for vid in ([mouth] if mouth else []) + (['B01_blink'] if blink else []):
        p = PATCH[vid]; im.alpha_composite(Image.open(FACE / 'patches' / f'{vid}.png').convert('RGBA'), tuple(p['x2_xy']))
    return im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS)
CACHE = {}
def nova(mouth, blink):
    k = (mouth, blink)
    if k not in CACHE: CACHE[k] = compose(mouth, blink)
    return CACHE[k]

BLINKS = [2.6, 6.1, 9.4, 13.3, 16.2, 19.8, 22.6]
def is_blink(t): return any(b <= t < b + .13 for b in BLINKS)

# ---------- 背景 ----------
bg = Image.open(ST / 'art/bg-classroom-v1.png').convert('RGB')
BG = bg.resize((1920, 1280), Image.LANCZOS).crop((0, 60, 1920, 1140)).convert('RGBA')
SCREEN = (790, 235, 1810, 715)   # 螢幕內可寫字範圍（畫面座標）

def line(key): return next(l for l in TL['lines'] if l['key'] == key)
def word_t(key, w, n=0):
    hits = [x for x in line(key)['words'] if x['w'].strip('.,!?').lower() == w.lower()]
    return hits[n]['t0']
clamp = lambda x, a=0, b=1: max(a, min(b, x))
prog = lambda t, a, d=.35: clamp((t - a) / d)
def back(k):
    if k <= 0: return 0
    if k >= 1: return 1
    s = 1.7; k -= 1; return k * k * ((s + 1) * k + s) + 1

T_TITLE = line('intro')['t0']; T_SUNDAY = word_t('word', 'sunday'); T_U = word_t('sun', 'u'); T_UH = word_t('sun', 'uh')
T_SUN = word_t('sun', 'sun'); T_AY = word_t('day', 'a'); T_AYS = word_t('day', 'a', 1); T_DAY = word_t('day', 'day')
T_BL1 = word_t('blend', 'sun'); T_BL2 = word_t('blend', 'sunday'); T_SAY = word_t('blend', 'say'); T_BL3 = word_t('blend', 'sunday', 1)
T_ZH = line('zh')['t0']

def text_center(d, s, cx, cy, f, fill, stroke=0, sf=None):
    b = d.textbbox((0, 0), s, font=f); d.text((cx - (b[2] - b[0]) / 2 - b[0], cy - (b[3] - b[1]) / 2 - b[1]), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=sf)

def board(t):
    """右側全息螢幕的內容（全部程式畫字）。回傳 RGBA 圖層。"""
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    cx = (SCREEN[0] + SCREEN[2]) // 2
    k = back(prog(t, T_TITLE)) if not (T_SAY - .15 <= t < T_ZH) else 0   # 跟讀提示出現時標題先讓位
    if t >= T_ZH: k = back(prog(t, T_ZH))
    if k > 0: text_center(d, 'Days of the Week', cx, 300, font(F_EN, int(58 * k) or 1), (*CYAN, 255))
    if t >= T_SUNDAY:
        k = back(prog(t, T_SUNDAY, .45)); size = int(170 * k) or 1; f = font(F_EN, size)
        # 「Sun」「day」在 blend 段先分開再合起來
        sep = 0
        if T_BL1 - .2 <= t < T_BL2: sep = 60 * clamp((t - (T_BL1 - .2)) / .3)
        if t >= T_BL2: sep = 60 * (1 - clamp((t - T_BL2) / .25))
        parts = [('S', 0), ('u', 1), ('n', 0), ('d', 0), ('a', 2), ('y', 2)]
        widths = [d.textlength(c, font=f) for c, _ in parts]; total = sum(widths) + sep
        x = cx - total / 2; y0 = 470
        pulse_sun = 1 + .08 * max(math.sin(math.pi * clamp((t - T_SUN) / .5)), math.sin(math.pi * clamp((t - T_BL1) / .5)))
        pulse_day = 1 + .08 * max(math.sin(math.pi * clamp((t - T_DAY) / .5)), math.sin(math.pi * clamp((t - (T_BL1 + .45)) / .5)))
        final = math.sin(math.pi * clamp((t - T_BL3) / .6))
        for n, ((c, grp), w) in enumerate(zip(parts, widths)):
            if n == 3: x += sep
            hot = (grp == 1 and t >= T_U) or (grp == 2 and t >= T_AY)
            col = (*ORANGE, 255) if hot else (*WHITE, 255)
            sc = (pulse_sun if n < 3 else pulse_day) * (1 + .06 * final)
            fs = font(F_EN, max(1, int(size * sc)))
            b = d.textbbox((0, 0), c, font=fs); ww = d.textlength(c, font=fs)
            d.text((x + w / 2 - ww / 2, y0 - (b[3]) / 2 - 10), c, font=fs, fill=col, stroke_width=3, stroke_fill=(10, 20, 50, 255))
            if hot:  # 紅色底線（像課本的畫線）
                d.line((x + 6, y0 + 72, x + w - 6, y0 + 72), fill=(*RED, 255), width=9)
            x += w
        # 音標小卡
        for tt, s, xx in ((T_UH, '/ʌ/', cx - 250), (T_AYS, '/eɪ/', cx + 250)):
            k = back(prog(t, tt))
            if k > 0:
                f2 = font('C:/Windows/Fonts/segoeuib.ttf', int(64 * k) or 1)
                bb = d.textbbox((0, 0), s, font=f2); bw, bh = bb[2] - bb[0] + 50, bb[3] - bb[1] + 30
                d.rounded_rectangle((xx - bw / 2, 600 - bh / 2, xx + bw / 2, 600 + bh / 2), 22, fill=(*ORANGE, 235))
                text_center(d, s, xx, 600, f2, (*WHITE, 255))
    if T_SAY - .1 <= t < line('blend')['t1'] + .4:  # 跟讀提示（取代標題位置）
        k = back(prog(t, T_SAY - .1)) * (1 - clamp((t - line('blend')['t1']) / .4))
        f3 = font(F_EN, int(48 * k) or 1); s = 'Your turn!'
        bw = d.textlength(s, font=f3) + 70
        d.rounded_rectangle((cx - bw / 2, 300 - 40 * k, cx + bw / 2, 300 + 40 * k), 40, fill=(*CYAN, 240))
        text_center(d, s, cx, 300, f3, (*INK, 255))
    if t >= T_ZH:
        k = back(prog(t, T_ZH + .5));
        if k > 0: text_center(d, '星期日', cx, 640, font(F_ZH, int(80 * k) or 1), (*WHITE, 255), 3, (10, 20, 50, 255))
    return L

def subtitle(t):
    ln = next((l for l in TL['lines'] if l['t0'] - .1 <= t < l['t1'] + .35), None)
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if not ln: return L
    d = ImageDraw.Draw(L); s = ln['text']
    f = font(F_ZH, 46); w = d.textlength(s, font=f)
    d.rounded_rectangle((W / 2 - w / 2 - 30, 975, W / 2 + w / 2 + 30, 1050), 18, fill=(10, 20, 45, 190))
    d.text((W / 2 - w / 2, 985), s, font=f, fill=(*CYAN, 255) if ln['key'] != 'zh' else (255, 255, 255, 255))
    return L

def name_tag(t, L):
    a = word_t('hello', 'nova')
    k = back(prog(t, a)) * (1 - clamp((t - (line('intro')['t1'] + .5)) / .4))
    if k <= 0: return
    d = ImageDraw.Draw(L); f = font(F_EN, int(44 * k) or 1); s = 'Ms. Nova'; w = d.textlength(s, font=f)
    d.rounded_rectangle((420 - w / 2 - 28, 860 - 36 * k, 420 + w / 2 + 28, 860 + 36 * k), 34, fill=(*CYAN, 235))
    text_center(d, s, 420, 860, f, (*INK, 255))

def frame(t):
    im = BG.copy()
    im.alpha_composite(board(t))
    # Nova：呼吸＋說話時輕微點頭感（整體上下）＋緩慢左右擺
    talking = viseme_at(t) is not None
    nv = nova(viewer_mouth(t), is_blink(t))
    breathe = 1 + .006 * math.sin(2 * math.pi * t / 3.6)
    bob = (6 * math.sin(2 * math.pi * t * 2.2)) if talking else 0
    sway = .8 * math.sin(2 * math.pi * t / 7.0)
    n2 = nv.resize((nv.width, round(nv.height * breathe)))
    n2 = n2.rotate(sway, resample=Image.BICUBIC, center=(n2.width / 2, n2.height), expand=False)
    x = 420 - n2.width // 2; y = round(20 - 114 * K + bob)
    im.alpha_composite(n2, (x, y))
    name_tag(t, im)
    im.alpha_composite(subtitle(t))
    # 鏡頭慢慢推近
    z = 1 + .035 * clamp(t / TL['dur'])
    if z > 1.001:
        cw, ch = W / z, H / z; x0, y0 = (W - cw) * .45, (H - ch) * .4
        im = im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((W, H), Image.BICUBIC)
    return im.convert('RGB')

def viewer_mouth(t): return viseme_at(t)

if __name__ == '__main__':
    out = HERE / 'renders'; out.mkdir(exist_ok=True)
    if '--still' in sys.argv:
        for s in sys.argv[sys.argv.index('--still') + 1:]:
            frame(float(s)).save(out / f'still-{float(s):05.2f}.jpg', quality=90); print(s)
        sys.exit()
    n = round(TL['dur'] * FPS); dst = out / 'pilot-nova-v1.mp4'
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-i', str(HERE / 'voice.wav'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium',
                           '-c:a', 'aac', '-b:a', '192k', '-shortest', str(dst)], stdin=subprocess.PIPE)
    for g in range(n):
        ff.stdin.write(frame(g / FPS).tobytes())
        if g % 150 == 0: print(g, '/', n, flush=True)
    ff.stdin.close(); ff.wait(); print(dst)
