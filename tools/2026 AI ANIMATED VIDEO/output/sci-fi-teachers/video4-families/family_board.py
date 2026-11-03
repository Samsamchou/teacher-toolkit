"""family_board.py — 影片 4〈Families〉的白板畫面（規格卡 rdq/RDQ-spec-video4-families-20261103.md）。
全家福合成（客廳場景＋7 人去背圖）、單字大卡（家人圖＋字母標色）、六張單字總覽、發音按鈕、He's／She's 圖示、Emma 介紹家人的剪紙動畫。
由 render_v1.py 呼叫：FB.init(globals()) 取得字型、顏色與工具函式。
"""
import math, json, pathlib
from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent; CUT = HERE / 'talk-art/cut'
R = None
def init(g):
    global R
    class NS: pass
    R = NS(); R.__dict__.update(g)

PW, PH = 1184, 666; PX0, PY0 = 960 - PW // 2, 92
WORDS = ['father', 'mother', 'grandfather', 'grandmother', 'brother', 'sister']
ZH = {'father': '爸爸', 'mother': '媽媽', 'grandfather': '爺爺／外公', 'grandmother': '奶奶／外婆', 'brother': '哥哥／弟弟', 'sister': '姊姊／妹妹'}
SHORT = {'father': 'dad', 'mother': 'mom', 'grandfather': 'grandpa', 'grandmother': 'grandma'}
HE = {'father', 'grandfather', 'brother'}
BLUE, PINK, GREEN2, PURPLE = (90, 170, 255), (255, 120, 190), (80, 220, 130), (190, 140, 255)
VOWEL = {'father': 1, 'mother': 1, 'grandfather': 2, 'grandmother': 2, 'brother': 2, 'sister': 1}   # 老師在課本標的母音位置
OAS_U = {'mother': 1, 'brother': 2, 'grandmother': 6}   # o 唸 /ʌ/ 的位置

_c = {}
def cut(k):
    if k not in _c: _c[k] = Image.open(CUT / f'{k}.png').convert('RGBA')
    return _c[k]
def scaled(k, h):
    key = (k, round(h))
    if key not in _c:
        im = cut(k); _c[key] = im.resize((max(1, round(im.width * h / im.height)), round(h)), Image.LANCZOS)
    return _c[key]
def scene():
    if 'scene' not in _c:
        im = Image.open(HERE / 'talk-art/scene-livingroom.png').convert('RGB')
        im = im.resize((1920, round(im.height * 1920 / im.width)), Image.LANCZOS)
        y0 = (im.height - 1080) // 2; _c['scene'] = im.crop((0, y0, 1920, y0 + 1080)).convert('RGBA')
    return _c['scene']

# ---------- 全家福 ----------
FAMILY = [  # (人, 腳的 x, 腳的 y, 身高) — 後排站在沙發前，前排站在地毯上
 ('grandfather', 640, 900, 560), ('grandmother', 860, 900, 540), ('father', 1110, 900, 640), ('mother', 1340, 900, 610),
 ('sister', 560, 1030, 520), ('emma', 960, 1040, 440), ('brother', 1290, 1040, 360)]
def family_panel(t, focus=None, flash=0.0):
    W = scene().copy(); d = ImageDraw.Draw(W)
    for who, fx, fy, h in FAMILY:
        im = scaled(f'sheet-{who}', h)
        sh = Image.new('L', (int(im.width * .9), 36), 0); ImageDraw.Draw(sh).ellipse((0, 0, sh.width - 1, 35), fill=100)
        W.paste((25, 25, 45), (round(fx - sh.width / 2), fy - 20), sh.filter(ImageFilter.GaussianBlur(7)))
        if focus and who != focus: im = _dim(im, .45)
        dy = 3 * math.sin(t * 2 * math.pi / 3.3 + fx)
        if focus == who:   # 被指到的人：光圈＋上下跳動的箭頭
            g = Image.new('L', (im.width + 120, im.height + 120), 0); ImageDraw.Draw(g).ellipse((0, 0, g.width - 1, g.height - 1), fill=150)
            W.paste((255, 220, 120), (round(fx - g.width / 2), round(fy - h - 60)), g.filter(ImageFilter.GaussianBlur(40)))
        W.alpha_composite(im, (round(fx - im.width / 2), round(fy - h + dy)))
        if focus == who:
            ay = fy - h - 70 + 14 * math.sin(t * 6)
            d.polygon([(fx - 36, ay - 50), (fx + 36, ay - 50), (fx, ay)], fill=(255, 140, 60, 255), outline=(255, 255, 255, 255))
    if flash > 0: W.alpha_composite(Image.new('RGBA', W.size, (255, 255, 255, int(220 * flash))))
    return W.resize((PW, PH), Image.LANCZOS)

def _dim(im, a):
    im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * a))); return im

def paste_panel(L, P, k=1.0):
    d = ImageDraw.Draw(L)
    if k < 1: P = P.resize((max(2, round(PW * (.9 + .1 * k))), max(2, round(PH * (.9 + .1 * k)))))
    x0, y0 = 960 - P.width // 2, PY0 + (PH - P.height) // 2
    d.rounded_rectangle((x0 - 6, y0 - 6, x0 + P.width + 6, y0 + P.height + 6), 34, fill=(*R.CYAN, 255))
    m = Image.new('L', P.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, P.width - 1, P.height - 1), 30, fill=255)
    P = P.copy(); P.putalpha(m); L.alpha_composite(P, (x0, y0)); return x0, y0

# ---------- 字母標色 ----------
def letter_cols(word, hi):
    """回傳每個字母的 (顏色, 底線)；er／th 橘色，母音綠色（o 唸 /ʌ/ 時上方加小 u），father 的 a 紫色（/ɑ/）。"""
    w = word.lower(); out = [(R.WHITE, False)] * len(word)
    if 'er' in hi and w.endswith('er'): out[-2:] = [(R.ORANGE, True)] * 2
    if 'th' in hi and 'th' in w: i = w.index('th'); out[i:i + 2] = [(R.ORANGE, True)] * 2
    if 'a' in hi and w.startswith('grand'): out[2] = (GREEN2, True)
    if 'a' in hi and w == 'father': out[1] = (PURPLE, True)
    if 'i' in hi and w == 'sister': out[1] = (GREEN2, True)
    if 'o' in hi and w in OAS_U: out[OAS_U[w]] = (GREEN2, True)
    if 'v' in hi and w in VOWEL and out[VOWEL[w]][0] == R.WHITE: out[VOWEL[w]] = (GREEN2, True)
    return out

def draw_word(d, word, cx, cy, size, hi, k=1.0, u_above=False):
    f = R.font(R.F_EN, max(1, size * k)); cols = letter_cols(word, hi); w = d.textlength(word, font=f); x = cx - w / 2
    for ch, (col, ul) in zip(word, cols):
        cw = d.textlength(ch, font=f)
        d.text((x, cy - size * k * .62), ch, font=f, fill=(*col, 255), stroke_width=4, stroke_fill=(*R.NAVY, 255))
        if ul: d.rounded_rectangle((x + 2, cy + size * k * .42, x + cw - 2, cy + size * k * .42 + 7), 3, fill=(*col, 255))
        if u_above and ch.lower() == 'o' and word.lower() in OAS_U:
            R.text_center(d, 'u', x + cw / 2, cy - size * k * .9, R.font(R.F_EN, size * k * .5), (*GREEN2, 255), 3, (*R.NAVY, 255))
        x += cw
    return x

def tagset(s): return set((s['vis'] if s else '').split('；'))
def hi_of(s): return {p[3:] for p in tagset(s) if p.startswith('hi:')}
def tag(s, k):
    for p in tagset(s):
        if p.startswith(k + ':'): return p[len(k) + 1:]
    return None

# ---------- 六張單字總覽 ----------
def words_grid(L, d, t, s, k=1.0):
    hi = hi_of(s) or {'er'}
    for i, w in enumerate(WORDS):
        col, row = i % 3, i // 3; cx = 960 - 270 + col * 270; cy = 205 + row * 262   # 2026-11-03：往上縮，下方留給發音按鈕
        kk = R.back(R.prog(t, s['t0'] - 2 + .1 * i, .3)) if k < 1 else 1
        on = (('th' in hi and 'th' in w) or ('er' in hi) or ('a' in hi and w.startswith('grand')) or ('i' in hi and w == 'sister')
              or ('o' in hi and w in OAS_U) or ('v' in hi))
        cur = R.relay_word(s, t) if s and s.get('who') == 'relay' else None
        if s and s.get('who') == 'relay': on = (cur or '').lower() == w   # 2026-11-04 接力：唸到哪張亮哪張
        d.rounded_rectangle((cx - 125, cy - 120, cx + 125, cy + 130), 26, fill=(10, 20, 45, 225), outline=(*(R.ORANGE if on else R.CYAN), 255), width=5 if on else 3)
        im = scaled(f'{w}-wave', 170); L.alpha_composite(_dim(im, 1 if on else .5), (round(cx - im.width / 2), round(cy - 115)))
        draw_word(d, w, cx, cy + 92, 40 if len(w) > 7 else 46, hi, u_above='o' in hi)

# ---------- 單字大卡 ----------
def word_card(L, d, t, s, w, k=1.0):
    hi = hi_of(s) | {'v'}; first_k = k
    d.rounded_rectangle((960 - 520, 110, 960 + 520, 700), 34, fill=(10, 20, 45, 225), outline=(*R.CYAN, 255), width=5)
    im = scaled(f'{w}-wave', 520); L.alpha_composite(im, (round(700 - im.width / 2), 150))
    vp = tagset(s)
    draw_word(d, w, 1180, 330, 92 if len(w) < 8 else 74, hi if 'hi:a' not in vp else {'a'}, u_above=True)
    sh = tag(s, 'short')
    if sh: R.text_center(d, sh, 1180, 470, R.font(R.F_EN, 76), (*R.ORANGE, 255), 4, (*R.NAVY, 255))
    gl = [p for p in vp if p.startswith('「')]
    if gl:
        txt = gl[0].strip('「」'); gw = d.textlength(txt, font=R.font(R.F_ZH, 52)) / 2 + 40
        d.rounded_rectangle((1180 - gw, 560, 1180 + gw, 636), 26, fill=(*R.ORANGE, 235)); R.text_center(d, txt, 1180, 598, R.font(R.F_ZH, 52), (*R.WHITE, 255))
    if 'hi:a' in vp and w == 'father':
        R.text_center(d, 'a = /ɑ/', 1180, 470, R.font(R.F_IPA, 60), (*PURPLE, 255), 3, (*R.NAVY, 255))

# ---------- 發音按鈕 ----------
LABEL = {'ref-er-1': 'er  /ɚ/', 'dg-th-voiced': 'th  /ð/', 'short-a-1': 'a  /æ/', 'short-i-1': 'i  /ɪ/', 'short-u-1': 'o  /ʌ/', 'short-o-1': 'a  /ɑ/'}
def sound_button(d, t, s, cx, cy):
    k = int((t - s['t0']) * 30); env = s['env'][min(k, len(s['env']) - 1)]; r = 54 + 8 * env
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*R.CYAN, 245), outline=(*R.WHITE, 255), width=4)
    d.polygon([(cx - 26, cy - 12), (cx - 10, cy - 12), (cx + 10, cy - 28), (cx + 10, cy + 28), (cx - 10, cy + 12), (cx - 26, cy + 12)], fill=(*R.INK, 255))
    R.text_center(d, LABEL.get(s['clip'], ''), cx + 170, cy, R.font(R.F_IPA, 50), (*R.ORANGE, 255), 3, (*R.NAVY, 255))   # 音標放在按鈕右邊

# ---------- He's／She's 小圖示（程式畫） ----------
def person_icon(d, cx, cy, r, she):
    col = PINK if she else BLUE
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*col, 255), outline=(*R.WHITE, 255), width=4)
    d.ellipse((cx - r * .32, cy - r * .62, cx + r * .32, cy - r * .02), fill=(*R.WHITE, 255))
    d.pieslice((cx - r * .62, cy + r * .05, cx + r * .62, cy + r * 1.1), 180, 360, fill=(*R.WHITE, 255))
    if she:   # 女生：兩側髮束
        for sx in (-1, 1): d.ellipse((cx + sx * r * .42 - r * .13, cy - r * .5, cx + sx * r * .42 + r * .13, cy - r * .12), fill=(*R.WHITE, 255))

# ---------- Emma 介紹家人（剪紙動畫） ----------
TALK_PLAN = [('wave', None, None), ('left', 'father', 'L'), ('right', 'mother', 'R'), ('left', 'grandfather', 'L'),
             ('right', 'grandmother', 'R'), ('left', 'sister', 'L'), ('right', 'brother', 'R'), ('self', None, None)]
HEIGHT = {'emma': 600, 'father': 860, 'mother': 820, 'grandfather': 760, 'grandmother': 740, 'sister': 720, 'brother': 500}
SHAPE_OF = {'M01_rest': 'closed', 'M02_A': 'ah', 'M03_E': 'ee', 'M04_O': 'oh', 'M05_U': 'oh', 'M06_FV': 'mid', 'M07_L': 'mid', 'M08_mid': 'mid'}
META = json.loads((CUT / 'cut.json').read_text(encoding='utf-8'))
def emma_img(pose, mouth):
    k = f'emma-{pose}'; sh = SHAPE_OF.get(mouth, 'mid') if mouth else 'closed'
    if sh != 'closed':
        for s_ in (sh, 'mid'):
            if f'{k}-m-{s_}' in META: return f'{k}-m-{s_}'
    return k
def emma_panel(t, lines, mouth_fn, talking_fn):
    idx = max([i for i, l in enumerate(lines) if l[0] - .15 <= t] + [0]); t0, t1 = lines[idx][0], lines[idx][1]; lt = t - t0
    pose, mem, side = TALK_PLAN[min(idx, len(TALK_PLAN) - 1)]
    if idx == 0:   # 第一句：全家福，Emma 在前面揮手
        P = family_panel(t); W = P.resize((1920, 1080), Image.LANCZOS)
        em = scaled(emma_img('wave', mouth_fn('emma', t) if talking_fn('emma', t) else None), 470)
        W.alpha_composite(em, (round(960 - em.width / 2), 1050 - 470))
    else:
        W = scene().copy()
        ex = {'L': 1180, 'R': 740, None: 960}[side]; mx = {'L': 620, 'R': 1300}.get(side)
        if mem:
            mi = scaled(f'{mem}-wave', HEIGHT[mem]); fade = R.clamp(lt / .3)
            g = Image.new('L', (mi.width + 160, mi.height + 100), 0); ImageDraw.Draw(g).ellipse((0, 0, g.width - 1, g.height - 1), fill=120)
            W.paste((255, 225, 140), (round(mx - g.width / 2), round(1030 - HEIGHT[mem] - 50)), g.filter(ImageFilter.GaussianBlur(45)))
            W.alpha_composite(_dim(mi, fade), (round(mx - mi.width / 2), round(1030 - HEIGHT[mem] + 3 * math.sin(lt * 1.9))))
        em = scaled(emma_img(pose, mouth_fn('emma', t) if talking_fn('emma', t) else None), HEIGHT['emma'])
        W.alpha_composite(em, (round(ex - em.width / 2), round(1040 - HEIGHT['emma'] + 3 * math.sin(lt * 1.8))))
    z = 1 + .05 * R.ease(R.clamp(lt / max(t1 - t0, .5)))   # 每句慢慢推近一點
    cw, ch = 1920 / z, 1080 / z
    return W.crop((round((1920 - cw) / 2), round((1080 - ch) * .45), round((1920 + cw) / 2), round((1080 - ch) * .45 + ch))).resize((PW, PH), Image.LANCZOS)
