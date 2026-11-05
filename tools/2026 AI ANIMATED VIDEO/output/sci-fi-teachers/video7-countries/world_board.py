"""world_board.py — 影片 6〈Is she from India?〉的白板畫面（規格卡 rdq/RDQ-spec-video6-is-she-from-20261105.md）。
十位朋友照片卡（Codex 圖）＋國旗（Wikimedia Commons 官方 SVG 轉 PNG，fetch_flags.py）、十人總覽與接力亮人、
國名大寫字母卡、句型對調（She is → Is she）、Is → is 回到句尾。由 render_v1.py 呼叫：WB.init(globals())。
"""
import math, pathlib, re, sys
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import KIDS, K

R = None
def init(g):
    global R
    class NS: pass
    R = NS(); R.__dict__.update(g)

CTRY = {k[2]: k for k in KIDS}            # 國名 → 朋友
def slug(c): return c.replace('the ', '').replace(' ', '').lower()
_c = {}
def flag(ctry, w):
    k = ('flag', ctry, round(w))
    if k not in _c:
        im = Image.open(HERE / 'flags' / f'{slug(ctry)}.png').convert('RGBA')
        im = im.resize((round(w), round(im.height * w / im.width)), Image.LANCZOS)
        _c[k] = im
    return _c[k]

def paste_flag(L, ctry, cx, cy, w, k=1.0):
    """國旗加白邊與淡陰影（白底國旗在深色背景上才看得清楚）。"""
    if k <= .02: return
    im = flag(ctry, max(4, w * k)); d = ImageDraw.Draw(L)
    x0, y0 = round(cx - im.width / 2), round(cy - im.height / 2)
    d.rounded_rectangle((x0 - 5, y0 - 5, x0 + im.width + 5, y0 + im.height + 5), 8, fill=(255, 255, 255, 255), outline=(40, 50, 80, 255), width=2)
    L.alpha_composite(im, (x0, y0))

def kid_card(L, d, name, cx, cy, size, k=1.0, border=None, flag_k=1.0, dim=False):
    """朋友照片卡（圓角＋邊框）＋右下角國旗。"""
    if k <= .02: return
    border = border or R.CYAN
    R.paste_art(L, f'kid-{name.lower()}', cx, cy, size, size, k, border)
    if dim:
        s = size * k; ov = Image.new('RGBA', (round(s), round(s)), (10, 15, 35, 150))
        m = Image.new('L', ov.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, ov.width - 1, ov.height - 1), 28, fill=150); ov.putalpha(m)
        L.alpha_composite(ov, (round(cx - s / 2), round(cy - s / 2)))
    if flag_k > 0:
        ctry = K[name][2]; fw = size * .36
        paste_flag(L, ctry, cx + size * k / 2 - fw * .42, cy + size * k / 2 - fw * .28, fw, k * flag_k)

GRID = [(R_, C_) for R_ in range(2) for C_ in range(5)]
def world_grid(L, d, t, s, lit=None, t_in=None):
    """十人總覽：兩排各五張照片卡，下面放國旗與國名；lit＝正在唸的國家（放大、橘框、國名橘色）。"""
    for i, (name, p, ctry, zh, mark) in enumerate(KIDS):
        r, c = GRID[i]; cx = R.CX - 320 + c * 160; cy = 205 + r * 290
        kk = R.back(R.prog(t, t_in + .1 * i, .3)) if t_in is not None else 1.0
        on = lit == ctry
        kid_card(L, d, name, cx, cy, 140, kk * (1.12 if on else 1), R.ORANGE if on else R.CYAN, flag_k=0)
        if kk > .5:
            paste_flag(L, ctry, cx, cy + 112, 84 * (1.1 if on else 1))
            R.text_center(d, ctry, cx, cy + 170, R.font(R.F_EN, 30 if on else 26), (*(R.ORANGE if on else R.WHITE), 255), 3, (*R.NAVY, 255))

def cap_cards(d, t, s):
    """四張國名卡：第一個大寫字母放大、橘色、輕輕脈動。"""
    for i, w in enumerate(['Australia', 'India', 'Japan', 'Singapore']):
        cx = R.CX - 200 + (i % 2) * 400; cy = 250 + (i // 2) * 230; k = R.back(R.prog(t, s['t0'] + .15 * i, .35))
        d.rounded_rectangle((cx - 185, cy - 85, cx + 185, cy + 85), 28, fill=(10, 20, 45, 220), outline=(*R.CYAN, 255), width=4)
        q = 1.35 + .1 * math.sin(2 * math.pi * t / 1.2) if '大寫字母放大' in s['vis'] else 1.25
        f1 = R.font(R.F_EN, 70 * q * k or 1); f2 = R.font(R.F_EN, 62 * k or 1)
        w1, w2 = d.textlength(w[0], font=f1), d.textlength(w[1:], font=f2); x = cx - (w1 + w2) / 2
        d.text((x, cy + 22 - 70 * q * k * .95), w[0], font=f1, fill=(*R.ORANGE, 255), stroke_width=3, stroke_fill=(*R.NAVY, 255))
        d.text((x + w1, cy + 22 - 62 * k * .95), w[1:], font=f2, fill=(*R.WHITE, 255), stroke_width=3, stroke_fill=(*R.NAVY, 255))

def swap_anim(d, t, s, cy, A, B, size=78):
    """A＝直述句單字、B＝問句單字（第 0、1 個字對調；最後一個是標點）：She is from India. → Is she from India?"""
    p = R.ease(R.clamp((t - s['t0'] - .5) / 1.6))
    f = R.font(R.F_EN, size); sp = d.textlength(' ', font=f); n = len(A)
    def xs(words):
        ws = [d.textlength(w, font=f) for w in words]; x = R.CX - (sum(ws) + sp * (n - 2)) / 2; out = []
        for i, w in enumerate(ws): out.append(x); x += w + (sp if i < n - 2 else 0)
        return out
    xa, xb = xs(A), xs(B)
    d.rounded_rectangle((R.CX - 430, cy - 70, R.CX + 430, cy + 70), 30, fill=(10, 20, 45, 215), outline=(*R.CYAN, 255), width=4)
    def put(txt, x, y, col, a=1.0):
        d.text((x, y - size * .62), txt, font=f, fill=(*col, int(255 * a)), stroke_width=3, stroke_fill=(*R.NAVY, int(255 * a)))
    put(A[0] if p < .5 else B[1], xa[0] + (xb[1] - xa[0]) * p, cy + 90 * math.sin(math.pi * p), R.FB.PINK if A[0].lower() == 'she' else R.FB.BLUE)
    put(A[1] if p < .5 else B[0], xa[1] + (xb[0] - xa[1]) * p, cy - 90 * math.sin(math.pi * p), R.ORANGE)
    for i in range(2, n - 1): put(A[i], xa[i] + (xb[i] - xa[i]) * p, cy, R.WHITE)
    put(A[-1], xa[-1] + (xb[-1] - xa[-1]) * p, cy, R.WHITE, 1 - p); put(B[-1], xb[-1], cy, R.ORANGE, p)

def back_anim(d, t, s, cy, size=70):
    """問句的 Is 回到答句 she 的後面：上排 Is she from India?、下排 Yes, she is.，橘色箭頭從 Is 畫到 is。"""
    f = R.font(R.F_EN, size); y1, y2 = cy - 95, cy + 95
    d.rounded_rectangle((R.CX - 430, y1 - 75, R.CX + 430, y2 + 75), 30, fill=(10, 20, 45, 215), outline=(*R.CYAN, 255), width=4)
    q, a = 'Is she from India?', 'Yes, she is.'
    xq = R.CX - d.textlength(q, font=f) / 2; xa = R.CX - d.textlength(a, font=f) / 2
    def put(txt, x, y, col): d.text((x, y - size * .62), txt, font=f, fill=(*col, 255), stroke_width=3, stroke_fill=(*R.NAVY, 255))
    put('Is', xq, y1, R.ORANGE); put(' she', xq + d.textlength('Is', font=f), y1, R.FB.PINK); put(' from India?', xq + d.textlength('Is she', font=f), y1, R.WHITE)
    put('Yes,', xa, y2, R.GREEN); put(' she', xa + d.textlength('Yes,', font=f), y2, R.FB.PINK)
    p = R.ease(R.clamp((t - s['t0'] - .4) / 1.4))
    put(' is.', xa + d.textlength('Yes, she', font=f), y2, tuple(round(255 + (c - 255) * p) for c in R.ORANGE))
    # 弧線箭頭：從 Is 的下方繞到 is 的上方（畫到 p 的位置）
    sx, sy = xq + d.textlength('Is', font=f) / 2, y1 + size * .45
    ex, ey = xa + d.textlength('Yes, she ', font=f) + d.textlength('is', font=f) / 2, y2 - size * .6
    pts = []
    for j in range(41):
        u = j / 40 * p; x = sx + (ex - sx) * u; y = sy + (ey - sy) * u + 60 * math.sin(math.pi * u) * (1 if ex > sx else -1) * 0
        x += -110 * math.sin(math.pi * u); pts.append((x, y))
    if len(pts) > 1 and p > .02:
        d.line(pts, fill=(*R.ORANGE, 255), width=8, joint='curve')
        if p > .9:
            x1, y1_ = pts[-1]; x0, y0 = pts[-4]; ang = math.atan2(y1_ - y0, x1 - x0)
            for da in (2.6, -2.6): d.line([(x1, y1_), (x1 + 24 * math.cos(ang + da), y1_ + 24 * math.sin(ang + da))], fill=(*R.ORANGE, 255), width=8)

# ---------- 影片 7 ----------
from script_v1 import SYL

def burst(d, cx, cy, r, a):
    """拍手的小爆光（程式畫，不用字型）。"""
    if a <= 0: return
    for k in range(10):
        ang = k * math.pi / 5; r0, r1 = r * .45, r * (1 + .15 * (k % 2))
        d.line([(cx + r0 * math.cos(ang), cy + r0 * math.sin(ang)), (cx + r1 * math.cos(ang), cy + r1 * math.sin(ang))], fill=(255, 220, 90, int(255 * a)), width=7)

def clap_board(L, d, t, s, ctry, seg_claps=None, turn=None):
    """拍音節：上方國旗＋整個國名，下方音節方塊（重音那塊大、橘框）。
    老師一拍一拍唸時方塊依拍手時間亮起並彈一下；學生跟唸時方塊照固定節奏亮起當提示。"""
    parts, st = SYL[ctry]; n = len(parts)
    paste_flag(L, ctry, R.CX, 205, 230)
    R.text_center(d, ctry, R.CX, 375, R.font(R.F_EN, 74), (*R.WHITE, 255), 4, (*R.NAVY, 255))   # 拍手爆光在方塊上方，國名要讓開
    fs = [R.font(R.F_EN, 74 if i == st and n > 1 else 56) for i in range(n)]
    ws = [max(120, d.textlength(p.upper() if i == st and n > 1 else p, font=fs[i]) + 60) for i, p in enumerate(parts)]
    gap = 22; x = R.CX - (sum(ws) + gap * (n - 1)) / 2; cy = 560
    lit = -1; pop = 0.0
    if seg_claps:   # 老師拍音節：每拍亮一塊
        for k, tc in enumerate(seg_claps):
            if t >= tc - .02: lit = k; pop = R.clamp(1 - (t - tc) / .35)
    elif turn is not None:   # 學生跟唸：0.3 秒後每 0.6 秒亮一塊
        k = int((t - turn['t0'] - .3) / .6)
        if 0 <= k < n: lit = k; pop = R.clamp(1 - ((t - turn['t0'] - .3) - .6 * k) / .35)
    for i, p in enumerate(parts):
        big = i == st and n > 1; on = i == lit; done = lit >= i
        h = 130 if big else 104; sc = 1 + (.12 * pop if on else 0)
        w2, h2 = ws[i] * sc, h * sc; cx = x + ws[i] / 2
        fill = (255, 150, 60, 235) if (on or (done and seg_claps)) and big else (46, 197, 232, 235) if (on or (done and seg_claps)) else (10, 20, 45, 220)
        d.rounded_rectangle((cx - w2 / 2, cy - h2 / 2, cx + w2 / 2, cy + h2 / 2), 26, fill=fill, outline=(*(R.ORANGE if big else R.CYAN), 255), width=6 if big else 4)
        R.text_center(d, p.upper() if big else p, cx, cy, R.font(R.F_EN, (74 if big else 56) * sc), (*R.WHITE, 255), 3, (*R.NAVY, 255))
        if on: burst(d, cx, cy - h2 / 2 - 34, 30, pop)
        x += ws[i] + gap
    # 拍數小圓點
    R.text_center(d, f'{n} beat' + ('s' if n > 1 else ''), R.CX, 668, R.font(R.F_EN, 40), (*R.ORANGE, 255), 3, (*R.NAVY, 255))

def merge_word(d, t, s, cy, a_txt, b_txt, size=110):
    """通用縮寫合併：I am → I'm（拿掉第二個字的第一個字母，撇號從上方掉進來）。"""
    p = R.ease(R.clamp((t - s['t0'] - .5) / 1.6)); w0, w1 = a_txt.split(' ')
    f = R.font(R.F_EN, size); W_ = lambda x: d.textlength(x, font=f)
    a0 = R.CX - W_(a_txt) / 2; b0 = R.CX - W_(b_txt) / 2
    d.rounded_rectangle((R.CX - 360, cy - 85, R.CX + 360, cy + 85), 30, fill=(10, 20, 45, 215), outline=(*R.CYAN, 255), width=4)
    def put(txt, x, col, a=1.0, sc=1.0, y=cy):
        ff = R.font(R.F_EN, max(1, size * sc)); d.text((x, y - size * .62), txt, font=ff, fill=(*col, int(255 * a)), stroke_width=3, stroke_fill=(*R.NAVY, int(255 * a)))
    put(w0, a0 + (b0 - a0) * p, R.WHITE)
    put(w1[0], a0 + W_(w0 + ' ') + (b0 + W_(w0) - a0 - W_(w0 + ' ')) * p, R.RED, 1 - p, max(.05, 1 - p))
    put("'", b0 + W_(w0), R.ORANGE, p, 1, cy - 120 * (1 - p))
    put(w1[1:], a0 + W_(w0 + ' ' + w1[0]) + (b0 + W_(w0 + "'") - a0 - W_(w0 + ' ' + w1[0])) * p, R.WHITE)

def big_flag(L, d, t, s, ctry, k=1.0):
    """Game time 看國旗：大國旗置中。"""
    paste_flag(L, ctry, R.CX, 330, 460, k)

def find_board(L, d, t, s, names, reveal=None, t_in=None):
    """聽 I'm from ___. 找人：四張照片卡（不放國旗，看地標找）；揭曉時答對那張放大、橘框，其他變暗。"""
    for i, nm in enumerate(names):
        cx = R.CX - 315 + i * 210; kk = R.back(R.prog(t, t_in + .08 * i, .3)) if t_in is not None else 1.0
        on = reveal == nm
        kid_card(L, d, nm, cx, 330, 190, kk * (1.12 if on else 1), R.ORANGE if on else R.CYAN, flag_k=1.0 if on else 0, dim=bool(reveal) and not on)
        if kk > .5: R.text_center(d, 'ABCD'[i], cx, 455, R.font(R.F_EN, 40), (*R.WHITE, 255), 3, (*R.NAVY, 255))
