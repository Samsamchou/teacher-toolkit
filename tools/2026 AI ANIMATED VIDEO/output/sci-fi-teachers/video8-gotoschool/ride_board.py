"""ride_board.py — 影片 8〈I go to school by bus.〉的白板畫面（規格卡 rdq/RDQ-spec-video8-go-to-school-20261108.md）。
交通工具圖卡、周老師照片、by／on 對照、拍音節（圖卡版）、朋友上學卡、文法表 I go／He、She、人名 goes、go → goes 變身、
情境動畫（畫風 H 桌上微縮，Blender 畫面全螢幕）、Game time（記得誰怎麼上學、go 還是 goes）。由 render_v1.py 呼叫：RB.init(globals())。
"""
import math, pathlib, re, sys, json
from PIL import Image, ImageDraw, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import KIDS, K, WORDS, SYL

R = None
def init(g):
    global R
    class NS: pass
    R = NS(); R.__dict__.update(g)

RIDE_KEY = {'by bike': 'bike', 'by bus': 'bus', 'by car': 'car', 'by metro': 'metro', 'by MRT': 'metro', 'by metro. By MRT': 'metro',
            'by scooter': 'scooter', 'by taxi': 'taxi', 'by train': 'train', 'on foot': 'foot', 'by boat': 'boat', 'by plane': 'plane',
            'school': 'school', 'metro': 'metro', 'MRT': 'metro', 'scooter': 'scooter', 'taxi': 'taxi', 'bike': 'bike'}
WORD_ZH = {w: zh for w, zh, _ in WORDS}
GRID11 = ['by bike', 'by bus', 'by car', 'by metro', 'by scooter', 'by taxi', 'by train', 'on foot', 'by boat', 'by plane', 'school']
def ride_img(w): return 'ride-' + RIDE_KEY.get(w, w)
def label(w): return 'by metro / by MRT' if w.startswith('by metro') else w

# ---------- 總覽：11 張圖卡（接力時唸到的那張放大、橘框） ----------
def ride_grid(L, d, t, s, lit=None, t_in=None):
    for i, w in enumerate(GRID11):
        r, c = divmod(i, 4) if i < 8 else (2, i - 8 + .5)
        cx = R.CX - 300 + c * 200; cy = 150 + r * 180
        kk = R.back(R.prog(t, t_in + .07 * i, .3)) if t_in is not None else 1.0
        on = lit is not None and (lit == w or (lit == 'by MRT' and w == 'by metro'))
        R.paste_art(L, ride_img(w), cx, cy - 15, 125, 125, kk * (1.12 if on else 1), R.ORANGE if on else R.CYAN)
        if kk > .5: R.text_center(d, w, cx, cy + 68, R.font(R.F_EN, 30 if on else 26), (*(R.ORANGE if on else R.WHITE), 255), 3, (*R.NAVY, 255))

# ---------- 單字卡：大圖＋英文＋中文 ----------
def word_card(L, d, t, s, w, g0):
    k = R.back(R.prog(t, g0['t0'], .4))
    R.paste_art(L, ride_img(w), R.CX, 300, 360, 360, k)
    if k > .3:
        R.text_center(d, label(w), R.CX, 545, R.font(R.F_EN, 84 if len(label(w)) < 12 else 66), (*R.WHITE, 255), 4, (*R.NAVY, 255))
        zh = WORD_ZH.get(w) or WORD_ZH.get('by metro. By MRT')
        if zh:
            gw = max(150, d.textlength(zh, font=R.font(R.F_ZH, 50)) / 2 + 36)
            d.rounded_rectangle((R.CX - gw, 610, R.CX + gw, 680), 26, fill=(*R.ORANGE, 235)); R.text_center(d, zh, R.CX, 645, R.font(R.F_ZH, 50), (*R.WHITE, 255))

# ---------- by／on 對照 ----------
RIDE_W = ['by bike', 'by scooter']; TAKE_W = ['by bus', 'by car', 'by metro', 'by taxi', 'by train', 'by boat', 'by plane']
def byon_board(L, d, t, s):
    v = s['vis']
    if '騎：' in v:   # 只有「騎」：兩張大圖
        d.rounded_rectangle((R.CX - 360, 120, R.CX + 360, 640), 30, fill=(10, 20, 45, 215), outline=(*R.ORANGE, 255), width=5)
        R.text_center(d, '騎 ride', R.CX, 180, R.font(R.F_ZH, 60), (*R.ORANGE, 255))
        for i, w in enumerate(RIDE_W):
            k = R.back(R.prog(t, s['t0'] + .2 * i, .35)); R.paste_art(L, ride_img(w), R.CX - 170 + 340 * i, 380, 260, 260, k)
            R.text_center(d, w, R.CX - 170 + 340 * i, 560, R.font(R.F_EN, 52), (*R.WHITE, 255), 3, (*R.NAVY, 255))
        return
    if '兩欄' in v:   # 騎／搭兩欄
        two = True
        for j, (zh, ws) in enumerate((('騎', RIDE_W), ('搭', TAKE_W))):
            if not two and j == 1: continue
            x0 = R.CX - 360 if two else R.CX - 200; x1 = x0 + (260 if two and j == 0 else 520 if two else 400)
            if two and j == 1: x0, x1 = R.CX - 80, R.CX + 400
            d.rounded_rectangle((x0, 120, x1, 690), 30, fill=(10, 20, 45, 215), outline=(*(R.ORANGE if j == 0 else R.CYAN), 255), width=5)
            R.text_center(d, zh, (x0 + x1) / 2, 175, R.font(R.F_ZH, 64), (*(R.ORANGE if j == 0 else R.CYAN), 255))
            cols = 1 if (x1 - x0) < 300 else 2
            for i, w in enumerate(ws):
                cc, rr = i % cols, i // cols; cx = x0 + (x1 - x0) * (cc + .5) / cols; cy = 280 + rr * (110 if cols == 2 else 190)
                sz = 90 if cols == 2 else 140
                R.paste_art(L, ride_img(w), cx - (70 if cols == 2 else 0), cy, sz, sz, 1.0)
                if cols == 2: R.text_center(d, w[3:], cx + 40, cy, R.font(R.F_EN, 30), (*R.WHITE, 255), 3, (*R.NAVY, 255))
                else: R.text_center(d, w, cx, cy + 90, R.font(R.F_EN, 32), (*R.WHITE, 255), 3, (*R.NAVY, 255))
        return
    # on foot vs by foot
    R.paste_art(L, 'ride-foot', R.CX, 270, 320, 320, 1.0)
    for i, (txt, ok) in enumerate((('on foot', True), ('by foot', False))):
        cx = R.CX - 220 + i * 440; cy = 560
        d.rounded_rectangle((cx - 190, cy - 70, cx + 190, cy + 70), 30, fill=(10, 20, 45, 220), outline=(*(R.GREEN if ok else R.RED), 255), width=6)
        f = R.font(R.F_EN, 74); w2 = d.textlength(txt, font=f); x = cx - w2 / 2
        for part in re.split(r'(on|by)', txt, maxsplit=1):
            if not part: continue
            col = R.ORANGE if part in ('on', 'by') and ok else R.WHITE
            d.text((x, cy - 46), part, font=f, fill=(*col, 255), stroke_width=3, stroke_fill=(*R.NAVY, 255)); x += d.textlength(part, font=f)
        if ok and '圈' in s['vis']:
            ox = cx - w2 / 2 + d.textlength('on', font=f) / 2; d.ellipse((ox - 62, cy - 52, ox + 62, cy + 46), outline=(*R.ORANGE, 255), width=6)
        R.check_mark(d, cx + 160, cy - 70, 30, 1.0, ok)
        if not ok:
            d.line((cx - 170, cy + 40, cx + 170, cy - 40), fill=(*R.RED, 230), width=9)

# ---------- 拍音節（上方圖卡＋音節方塊） ----------
def clap_board(L, d, t, s, w, seg_claps=None, turn=None):
    parts, st = SYL[w]; n = len(parts)
    R.paste_art(L, ride_img(w), R.CX, 215, 230, 230, 1.0)
    R.text_center(d, w, R.CX, 380, R.font(R.F_EN, 74), (*R.WHITE, 255), 4, (*R.NAVY, 255))
    big_i = st if n > 1 else -1
    fs = [R.font(R.F_EN, 74 if i == big_i else 56) for i in range(n)]
    ws = [max(120, d.textlength(p.upper() if i == big_i else p, font=fs[i]) + 60) for i, p in enumerate(parts)]
    gap = 22; x = R.CX - (sum(ws) + gap * (n - 1)) / 2; cy = 560; lit = -1; pop = 0.0
    if seg_claps:
        for k, tc in enumerate(seg_claps):
            if t >= tc - .02: lit = k; pop = R.clamp(1 - (t - tc) / .35)
    elif turn is not None:
        k = int((t - turn['t0'] - .3) / .6)
        if 0 <= k < n: lit = k; pop = R.clamp(1 - ((t - turn['t0'] - .3) - .6 * k) / .35)
    for i, p in enumerate(parts):
        big = i == big_i; on = i == lit; done = lit >= i
        h = 130 if big else 104; sc = 1 + (.12 * pop if on else 0); w2, h2 = ws[i] * sc, h * sc; cx = x + ws[i] / 2
        fill = (255, 150, 60, 235) if (on or (done and seg_claps)) and big else (46, 197, 232, 235) if (on or (done and seg_claps)) else (10, 20, 45, 220)
        d.rounded_rectangle((cx - w2 / 2, cy - h2 / 2, cx + w2 / 2, cy + h2 / 2), 26, fill=fill, outline=(*(R.ORANGE if big else R.CYAN), 255), width=6 if big else 4)
        R.text_center(d, p.upper() if big else p, cx, cy, R.font(R.F_EN, (74 if big else 56) * sc), (*R.WHITE, 255), 3, (*R.NAVY, 255))
        if on: R.WB.burst(d, cx, cy - h2 / 2 - 34, 30, pop)
        x += ws[i] + gap
    R.text_center(d, f'{n} beat' + ('s' if n > 1 else ''), R.CX, 668, R.font(R.F_EN, 40), (*R.ORANGE, 255), 3, (*R.NAVY, 255))

# ---------- 朋友上學卡 ----------
def go_card(L, d, name, cx, cy, size, k=1.0, border=None):
    if k <= .02: return
    R.paste_art(L, f'go-{name.lower()}', cx, cy, size, size, k, border or R.CYAN)

def friends_grid(L, d, t, s, t_in):
    for i, (name, p, ctry, ride, zh) in enumerate(KIDS):
        r, c = divmod(i, 5); cx = R.CX - 320 + c * 160; cy = 205 + r * 290
        kk = R.back(R.prog(t, t_in + .1 * i, .3))
        go_card(L, d, name, cx, cy, 140, kk)
        if kk > .5:
            R.text_center(d, name, cx, cy + 92, R.font(R.F_EN, 28), (*R.ORANGE, 255), 3, (*R.NAVY, 255))
            R.text_center(d, ride, cx, cy + 130, R.font(R.F_EN, 26), (*R.WHITE, 255), 3, (*R.NAVY, 255))

# ---------- 文法表 ----------
def grammar_board(L, d, t, s):
    v = s['vis']; k2 = R.back(R.prog(t, s['t0'] + .2, .4)) if '亮' in v and 'He' in v else 0.0
    rows = [('I', 'go', R.WHITE), ('He', 'goes', R.FB.BLUE), ('She', 'goes', R.FB.PINK), ('Lily / Raj', 'goes', R.ORANGE)]
    for i, (subj, verb, col) in enumerate(rows):
        cy = 170 + i * 135; on = i == 0 or k2 > 0; a = 1.0 if on else .35
        d.rounded_rectangle((R.CX - 400, cy - 55, R.CX + 400, cy + 55), 26, fill=(10, 20, 45, int(220 * a)), outline=(*(R.ORANGE if i else R.CYAN), int(255 * a)), width=4)
        if i == 3: R.text_center(d, '人名', R.CX - 330, cy, R.font(R.F_ZH, 34), (*R.ORANGE, int(255 * a)))
        R.text_center(d, subj, R.CX - 170, cy, R.font(R.F_EN, 62 if i < 3 else 50), (*col, int(255 * a)), 3, (*R.NAVY, int(255 * a)))
        vk = 1.0 if i == 0 else k2
        R.text_center(d, verb, R.CX + 90, cy, R.font(R.F_EN, 66), (*(R.WHITE if i == 0 else R.ORANGE), int(255 * max(.35, vk))), 3, (*R.NAVY, 255))
        R.text_center(d, 'to school.', R.CX + 290, cy, R.font(R.F_EN, 40), (*R.WHITE, int(200 * a)), 2, (*R.NAVY, 255))

def goes_anim(d, t, s, cy=380, size=150):
    """go → goes：e、s 從上方飛進來、橘色發光。"""
    g0 = next(x for x in R.SEGS if x['sec'] == s['sec'] and 'goes' in R.vparts(x))
    p = 1.0 if '完成' in s['vis'] or s['t0'] > g0['t0'] + .01 else R.ease(R.clamp((t - g0['t0'] - .8) / 1.4))
    f = R.font(R.F_EN, size); wg = d.textlength('go', font=f); wf = d.textlength('goes', font=f)
    x0 = R.CX - wf / 2 * p - wg / 2 * (1 - p)
    d.rounded_rectangle((R.CX - 330, cy - 120, R.CX + 330, cy + 120), 34, fill=(10, 20, 45, 215), outline=(*R.CYAN, 255), width=5)
    d.text((x0, cy - size * .62), 'go', font=f, fill=(*R.WHITE, 255), stroke_width=4, stroke_fill=(*R.NAVY, 255))
    xe = x0 + wg; glow = .6 + .4 * math.sin(t * 6)
    for j, ch in enumerate('es'):
        q = R.clamp(p * 1.4 - j * .4); x = xe + d.textlength('es'[:j], font=f)
        d.text((x, cy - size * .62 - 200 * (1 - q)), ch, font=f, fill=(*R.ORANGE, int(255 * q)), stroke_width=4, stroke_fill=(*R.NAVY, int(255 * q)))
    if p >= 1: d.rounded_rectangle((xe - 10, cy - size * .6, xe + d.textlength('es', font=f) + 10, cy + size * .45), 20, outline=(*R.ORANGE, int(255 * glow)), width=6)
    R.text_center(d, '+ es', R.CX + 250, cy - 150, R.font(R.F_EN, 54), (*R.ORANGE, int(255 * R.clamp(p * 2))), 3, (*R.NAVY, 255))

# ---------- Game time ----------
def gogoes_board(L, d, t, s, sent):
    ans = None
    m = re.match(r'(\S+) (go|goes) to school (.+)\.', sent)
    if m: ans = m.group(2); subj, rest = m.group(1), m.group(3)
    else: subj, rest = re.match(r'(\S+) ___ to school (.+)\.', sent).groups() if '___' in sent else ('', '')
    f = R.font(R.F_EN, 70); line = f'{subj} {ans or "____"} to school {rest}.'
    d.rounded_rectangle((R.CX - 430, 250, R.CX + 430, 380), 30, fill=(10, 20, 45, 220), outline=(*R.CYAN, 255), width=4)
    x = R.CX - d.textlength(line, font=f) / 2
    for part in re.split(r'(go(?:es)?|____)', line, maxsplit=1):
        if not part: continue
        col = R.ORANGE if part in ('go', 'goes', '____') else R.FB.BLUE if part.strip() == 'He' else R.FB.PINK if part.strip() == 'She' else R.WHITE
        d.text((x, 315 - 44), part, font=f, fill=(*col, 255), stroke_width=3, stroke_fill=(*R.NAVY, 255)); x += d.textlength(part, font=f)
    for i, opt in enumerate(('go', 'goes')):
        cx = R.CX - 170 + i * 340; on = ans == opt; dim = ans is not None and not on
        d.rounded_rectangle((cx - 130, 470, cx + 130, 590), 36, fill=(*(R.ORANGE if on else (40, 60, 110)), 235 if not dim else 120),
                            outline=(*(R.ORANGE if on else R.CYAN), 255), width=5)
        R.text_center(d, opt, cx, 528, R.font(R.F_EN, 74), (*R.WHITE, 255 if not dim else 120), 3, (*R.NAVY, 255))

def memory_quiz(L, d, t, s, ride, revealed):
    name = next(k[0] for k in KIDS if k[3] == ride)
    g0 = R.run_start(s, 'quiz'); k = R.back(R.prog(t, g0['t0'], .4))
    if revealed: go_card(L, d, name, R.CX, 330, 380, 1.0, R.ORANGE)
    else:
        R.WB.kid_card(L, d, name, R.CX, 330, 380, k, flag_k=0)
        if k > .5: R.text_center(d, '?', R.CX + 230, 170, R.font(R.F_EN, 140), (*R.ORANGE, 255), 6, (*R.NAVY, 255))
    R.text_center(d, name, R.CX - 250, 520, R.font(R.F_EN, 50), (*R.ORANGE, 255), 3, (*R.NAVY, 255))

# ---------- 情境動畫（Blender 畫面） ----------
TT = json.loads((HERE / 'tabletop' / 'src' / 'timing.json').read_text(encoding='utf-8'))
ORDER = sorted(TT, key=lambda k: TT[k]['t0'])
_sf = {}
def story_frame(t):
    sid = None
    for k in ORDER:
        if TT[k]['t0'] <= t: sid = k
    sid = sid or ORDER[0]; lt = max(0.0, t - TT[sid]['t0'])
    fr = min(int(lt * 24) // 2 * 2, int(TT[sid]['dur'] * 24) // 2 * 2)
    d = HERE / 'tabletop' / 'renders' / sid
    if d.exists():
        frames = sorted(d.glob('f*.png'))
        if frames:
            p = d / f'f{fr:04d}.png'
            if not p.exists(): p = min(frames, key=lambda q: abs(int(q.stem[1:]) - fr))
            if p not in _sf:
                if len(_sf) > 40: _sf.clear()
                _sf[p] = Image.open(p).convert('RGB').resize((R.W, R.H), Image.BICUBIC)
            return _sf[p], sid
    # 還沒渲染：用朋友上學卡當暫代畫面
    key = ('ph', sid)
    if key not in _sf:
        name = sid if sid in K else 'Lily'
        im = Image.open(HERE / 'art' / f'go-{name.lower()}.png').convert('RGB').resize((R.H, R.H))
        bg = im.resize((R.W, R.W)).crop((0, (R.W - R.H) // 2, R.W, (R.W + R.H) // 2)).filter(ImageFilter.GaussianBlur(30))
        bg.paste(im, ((R.W - R.H) // 2, 0)); _sf[key] = bg
    return _sf[key], sid

def story_overlay(L, d, t, s, cur):
    """情境動畫上方：老師說 He／She goes 起字卡出現在上方，學生跟唸時加 Your turn!。"""
    c = R.tags(s).get('card')
    if c:
        g0 = s; k = R.back(R.prog(t, g0['t0'], .35)); size = 70
        f = R.font(R.F_EN, size); w = d.textlength(c, font=f)
        d.rounded_rectangle((R.CX - w / 2 - 50, 40, R.CX + w / 2 + 50, 150), 34, fill=(10, 20, 45, int(220 * k)), outline=(*R.CYAN, int(255 * k)), width=4)
        R.marks(d, t, s, 95, 110, k, 95, 0) if False else None
        x = R.CX - w / 2
        for part in re.split(r'(\bHe\b|\bShe\b|\bgoes\b)', c):
            if not part: continue
            col = R.FB.BLUE if part == 'He' else R.FB.PINK if part == 'She' else R.ORANGE if part == 'goes' else R.WHITE
            d.text((x, 95 - size * .62), part, font=f, fill=(*col, int(255 * k)), stroke_width=3, stroke_fill=(*R.NAVY, int(255 * k))); x += d.textlength(part, font=f)
    if cur is not None and cur['kind'] == 'turn': R.your_turn(d, t, cur, 210)

# ---------- 白板總入口 ----------
def board_v8(L, d, t):
    s = R.last_seg(t) or R.SEGS[0]; cur = R.seg_at(t); vp = R.vparts(s); sec = s['sec']; tg = R.tags(s)
    c = tg.get('card', ''); kid = tg.get('kid'); turn = cur is not None and cur['kind'] == 'turn'
    v = s['vis']; rides = [p[5:] for p in v.split('；') if p.startswith('ride:')]
    clap = next((p[5:] for p in vp if p.startswith('clap:')), None)
    gog = next((p[7:] for p in vp if p.startswith('gogoes:')), None)
    if sec == '01-open' and 'photo:chou' not in v:
        R.text_center(d, 'How do you go to school?', R.CX, 400, R.font(R.F_EN, 74 * R.back(R.prog(t, s['t0']))), (*R.CYAN, 255), 5, (*R.NAVY, 255))
        R.text_center(d, 'I go to school by bus.', R.CX, 530, R.font(R.F_EN, 64 * R.back(R.prog(t, s['t0'] + .3))), (*R.WHITE, 255), 4, (*R.NAVY, 255)); return
    if 'photo:chou' in v:
        g0 = R.run_start(s, 'photo'); k = R.back(R.prog(t, g0['t0'], .4))
        if k > .02:
            im = R.art('photo-chou', (round(640 * k), round(360 * k)))
            d.rounded_rectangle((R.CX - 320 * k - 6, 300 - 180 * k - 6, R.CX + 320 * k + 6, 300 + 180 * k + 6), 32, fill=(*R.CYAN, 255))
            L.alpha_composite(im, (round(R.CX - 320 * k), round(300 - 180 * k)))
        if c: R.card(d, t, s, 580, 60)
        return
    if v.startswith('ride 總覽') or v.startswith('world'):
        first = next(x for x in R.SEGS if x['sec'] == sec and (x['vis'].startswith('ride 總覽') or x['vis'].startswith('world')))
        if v.startswith('world'): friends_grid(L, d, t, s, first['t0']); return
        lit = (R.relay_word(s, t) or '').strip(',!. ') if s['who'] == 'relay' else None
        ride_grid(L, d, t, s, lit, first['t0']); return
    if clap:
        claps = None if turn else s.get('claps')
        clap_board(L, d, t, s, clap, claps, cur if turn else None)
        if turn: R.your_turn(d, t, cur, 90)
        return
    if 'byon' in vp or v.startswith('byon'):
        byon_board(L, d, t, s)
        if turn: R.your_turn(d, t, cur, 90)
        return
    if 'grammar' in vp or v.startswith('grammar'): grammar_board(L, d, t, s); return
    if v.startswith('goes'):
        goes_anim(d, t, s)
        if turn: R.your_turn(d, t, cur, 90)
        return
    if sec == '07-quiz':
        if v.startswith('gogoes'):
            if gog: gogoes_board(L, d, t, s, gog)
            else: R.text_center(d, 'go or goes?', R.CX, 400, R.font(R.F_EN, 110 * R.back(R.prog(t, s['t0']))), (*R.ORANGE, 255), 5, (*R.NAVY, 255))
        elif tg.get('quiz'):
            memory_quiz(L, d, t, s, tg['quiz'], '揭曉' in v)
            if c: R.card(d, t, s, 625, 60)
        if turn: R.your_turn(d, t, cur, 90)
        return
    if kid:
        g0 = R.run_start(s, 'kid'); speaking = s['who'] in R.FRIENDS and cur is s
        if speaking:
            q = .6 + .4 * abs(math.sin(t * 6)); d.rounded_rectangle((R.CX - 200, 130, R.CX + 200, 530), 40, outline=(*R.ORANGE, int(255 * q)), width=12)
        go_card(L, d, kid, R.CX, 330, 350, R.back(R.prog(t, g0['t0'], .4)), R.ORANGE if s['who'] in R.FRIENDS else None)
        if '人名' in v:
            R.text_center(d, kid, R.CX - 260, 200, R.font(R.F_EN, 60), (*R.ORANGE, 255), 4, (*R.NAVY, 255))
        if c: R.card(d, t, s, 598, 64)
    elif rides and not c.startswith('I go') or (rides and c in ('',)):
        g0 = R.run_start(s, 'ride') if R.tags(s).get('ride') else s
        word_card(L, d, t, s, rides[0], g0)
    elif c:
        if len(rides) == 2:
            for i, w in enumerate(rides): R.paste_art(L, ride_img(w), R.CX - 150 + 300 * i, 270, 240, 240, R.back(R.prog(t, s['t0'] + .15 * i, .35)))
            R.card(d, t, s, 560, 64)
        elif rides:
            R.paste_art(L, ride_img(rides[0]), R.CX, 270, 300, 300, R.back(R.prog(t, s['t0'], .35))); R.card(d, t, s, 560, 64)
        elif '三張字卡' in v:
            for i, (ln, ic) in enumerate((('I go to school by bus.', None), ('He goes to school by train.', False), ('She goes to school by bike.', True))):
                cy = 200 + i * 165; k = R.back(R.prog(t, s['t0'] + .25 * i, .35))
                d.rounded_rectangle((R.CX - 430, cy - 62, R.CX + 430, cy + 62), 28, fill=(10, 20, 45, int(215 * k)), outline=(*R.CYAN, int(255 * k)), width=4)
                if ic is not None: R.FB.person_icon(d, R.CX - 375, cy, 34 * k, ic)
                R.draw_card_line(d, ln, cy, 60 * k or 1, [], k, 700, R.CX + (40 if ic is not None else 0))
            R.text_center(d, 'on foot  /  by bus', R.CX, 690, R.font(R.F_EN, 48), (*R.ORANGE, 255), 3, (*R.NAVY, 255))
        else: R.card(d, t, s, 400)
    elif '三張字卡' in v:
        board_v8_review(L, d, t, s)
    if turn: R.your_turn(d, t, cur, 90)

def board_v8_review(L, d, t, s):
    for i, (ln, ic) in enumerate((('I go to school by bus.', None), ('He goes to school by train.', False), ('She goes to school by bike.', True))):
        cy = 200 + i * 165; k = R.back(R.prog(t, s['t0'] + .25 * i, .35))
        d.rounded_rectangle((R.CX - 430, cy - 62, R.CX + 430, cy + 62), 28, fill=(10, 20, 45, int(215 * k)), outline=(*R.CYAN, int(255 * k)), width=4)
        if ic is not None: R.FB.person_icon(d, R.CX - 375, cy, 34 * k, ic)
        R.draw_card_line(d, ln, cy, 60 * k or 1, [], k, 700, R.CX + (40 if ic is not None else 0))
    R.text_center(d, 'on foot  /  by bus', R.CX, 690, R.font(R.F_EN, 48), (*R.ORANGE, 255), 3, (*R.NAVY, 255))
