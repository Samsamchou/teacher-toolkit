"""place_board.py — 影片 9〈I'm going to the ___.〉的白板畫面（規格卡 rdq/RDQ-spec-video9-*.md）。
9 張地點卡總覽（接力亮）、單字大卡（地點圖＋規則字母上色＋中文）、兩張例字卡、發音按鈕、拍音節方塊、句型卡、
情境動畫（桌上微縮渲染＋cards9 疊圖）、2 ICONS 1 PLACE（網站 Guess 版的圖示）。由 render_v1.py 呼叫：PB.init(globals())。
"""
import math, pathlib, re, sys, json
from PIL import Image, ImageDraw, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import SYL
import cards9

R = None
def init(g):
    global R
    class NS: pass
    R = NS(); R.__dict__.update(g)

PLACES = ['bank', 'park', 'supermarket', 'bookstore', 'hospital', 'train station', 'museum', 'library', 'post office']
ZH = {'bank': '銀行', 'park': '公園', 'supermarket': '超市', 'bookstore': '書店', 'hospital': '醫院', 'train station': '火車站',
      'museum': '博物館', 'library': '圖書館', 'post office': '郵局'}
COL = {'紅': (255, 90, 90), '藍': (90, 170, 255), '綠': (80, 220, 130), '橘': (255, 150, 60), '紫': (190, 140, 255), '粉紅': (255, 120, 190)}
ICON_DIR = pathlib.Path('G:/我的雲端硬碟/teacher-toolkit/tools/escape room HWG5-U01-U02/site/public/ershui-3d-quest-planetlisten/clues/icons')
ICON_ID = {'library': 'library', 'hospital': 'hospital', 'park': 'park', 'post office': 'post', 'bookstore': 'bookstore'}
def pimg(w): return 'place-' + w.replace(' ', '-')


def his(s):
    """hi:字母:顏色 → [(字母, 顏色)]。"""
    out = []
    for p in (s['vis'] if s else '').split('；'):
        if p.startswith('hi:'):
            _, a, c = p.split(':'); out.append((a, COL.get(c, R.ORANGE)))
    return out


def color_word(d, word, cx, cy, size, hl, k=1.0, maxw=900):
    """把字畫出來，hl 裡的字母組（第一次出現的位置）上色。"""
    f = R.font(R.F_EN, size)
    while d.textlength(word, font=f) > maxw and size > 30: size -= 4; f = R.font(R.F_EN, size)
    marks = [None] * len(word)
    for a, c in hl:
        i = word.find(a)
        if i >= 0:
            for j in range(i, i + len(a)): marks[j] = c
    x = cx - d.textlength(word, font=f) / 2
    for j, ch in enumerate(word):
        col = marks[j] or R.WHITE
        d.text((x, cy - size * .62), ch, font=f, fill=(*col, int(255 * k)), stroke_width=4, stroke_fill=(*R.NAVY, int(255 * k)))
        if marks[j]:   # 上色字母下面加底線
            w_ = d.textlength(ch, font=f); d.rectangle((x, cy + size * .45, x + w_, cy + size * .45 + 7), fill=(*col, int(255 * k)))
        x += d.textlength(ch, font=f)


def run_start(s, key_fn):
    v = key_fn(s); g0 = s
    for x in reversed([x for x in R.SEGS if x['t0'] < s['t0'] and x['sec'] == s['sec']]):
        if key_fn(x) == v: g0 = x
        else: break
    return g0


def tagv(s, k):
    for p in (s['vis'] if s else '').split('；'):
        if p.startswith(k + ':'): return p[len(k) + 1:]
    return None


# ---------- 9 張地點卡總覽 ----------
def places_grid(L, d, t, s, lit=None, t_in=None):
    for i, w in enumerate(PLACES):
        r, c = divmod(i, 3); cx = R.CX - 250 + c * 250; cy = 150 + r * 205
        kk = R.back(R.prog(t, t_in + .07 * i, .3)) if t_in is not None else 1.0
        on = lit is not None and lit.lower() == w
        R.paste_art(L, pimg(w), cx, cy - 18, 140, 140, kk * (1.12 if on else 1), R.ORANGE if on else R.CYAN)
        if kk > .5: R.text_center(d, w, cx, cy + 74, R.font(R.F_EN, 32 if on else 27), (*(R.ORANGE if on else R.WHITE), 255), 3, (*R.NAVY, 255))


# ---------- 單字大卡 ----------
def word_card(L, d, t, s, w, g0, hl):
    k = R.back(R.prog(t, g0['t0'], .4))
    d.rounded_rectangle((R.CX - 430, 95, R.CX + 430, 720), 34, fill=(10, 20, 45, int(225 * min(1, k))), outline=(*R.CYAN, 255), width=5)
    R.paste_art(L, pimg(w), R.CX, 300, 360, 360, k)
    if k > .3:
        color_word(d, w, R.CX, 555, 100 if len(w) < 10 else 82, hl)
        gl = [p for p in s['vis'].split('；') if p.startswith('「')]
        if gl:
            zh = gl[0].strip('「」'); gw = max(140, d.textlength(zh, font=R.font(R.F_ZH, 50)) / 2 + 36)
            d.rounded_rectangle((R.CX - gw, 625, R.CX + gw, 695), 26, fill=(*R.ORANGE, 235)); R.text_center(d, zh, R.CX, 660, R.font(R.F_ZH, 50), (*R.WHITE, 255))


def ex_cards(L, d, t, s, words, hl, w_main):
    """例字：上方是主字（上色），下面兩張例字卡並排（圖＋字，同樣的字母上色）。老師站在兩側，卡片不能超出中間白板。"""
    g0 = run_start(s, lambda x: tagv(x, 'ex'))
    d.rounded_rectangle((R.CX - 430, 95, R.CX + 430, 720), 34, fill=(10, 20, 45, 235), outline=(*R.CYAN, 255), width=5)
    color_word(d, w_main, R.CX, 170, 84, hl)
    for i, ew in enumerate(words):
        cx = R.CX + (-1 if i == 0 else 1) * 205; kk = R.back(R.prog(t, g0['t0'] + .5 * i, .35))
        if kk <= .02: continue
        d.rounded_rectangle((cx - 185, 250, cx + 185, 690), 30, fill=(20, 32, 64, 255), outline=(*R.ORANGE, 255), width=5)
        R.paste_art(L, 'ex-' + ew, cx, 420, 290, 290, kk)
        if kk > .3: color_word(d, ew, cx, 625, 76, hl, 1.0, 340)


# ---------- 拍音節 ----------
def burst(d, cx, cy, r, a):
    if a <= 0: return
    for k in range(10):
        ang = k * math.pi / 5; r0, r1 = r * .45, r * (1 + .15 * (k % 2))
        d.line([(cx + r0 * math.cos(ang), cy + r0 * math.sin(ang)), (cx + r1 * math.cos(ang), cy + r1 * math.sin(ang))], fill=(255, 220, 90, int(255 * a)), width=7)


def clap_board(L, d, t, s, w, seg_claps=None, turn=None):
    parts, st = SYL[w]; n = len(parts)
    R.paste_art(L, pimg(w), R.CX, 215, 230, 230, 1.0)
    R.text_center(d, w, R.CX, 380, R.font(R.F_EN, 74), (*R.WHITE, 255), 4, (*R.NAVY, 255))
    fs = [R.font(R.F_EN, 74 if i == st else 56) for i in range(n)]
    ws = [max(120, d.textlength(p.upper() if i == st else p, font=fs[i]) + 60) for i, p in enumerate(parts)]
    gap = 22; x = R.CX - (sum(ws) + gap * (n - 1)) / 2; cy = 560; lit = -1; pop = 0.0
    if seg_claps:
        for k, tc in enumerate(seg_claps):
            if t >= tc - .02: lit = k; pop = R.clamp(1 - (t - tc) / .35)
    elif turn is not None:
        k = int((t - turn['t0'] - .3) / .6)
        if 0 <= k < n: lit = k; pop = R.clamp(1 - ((t - turn['t0'] - .3) - .6 * k) / .35)
    for i, p in enumerate(parts):
        big = i == st; on = i == lit; done = lit >= i
        h = 130 if big else 104; sc = 1 + (.12 * pop if on else 0); w2, h2 = ws[i] * sc, h * sc; cx = x + ws[i] / 2
        fill = (255, 150, 60, 235) if (on or (done and seg_claps)) and big else (46, 197, 232, 235) if (on or (done and seg_claps)) else (10, 20, 45, 220)
        d.rounded_rectangle((cx - w2 / 2, cy - h2 / 2, cx + w2 / 2, cy + h2 / 2), 26, fill=fill, outline=(*(R.ORANGE if big else R.CYAN), 255), width=6 if big else 4)
        R.text_center(d, p.upper() if big else p, cx, cy, R.font(R.F_EN, (74 if big else 56) * sc), (*R.WHITE, 255), 3, (*R.NAVY, 255))
        if on: burst(d, cx, cy - h2 / 2 - 34, 30, pop)
        x += ws[i] + gap
    R.text_center(d, f'{n} beats', R.CX, 668, R.font(R.F_EN, 40), (*R.ORANGE, 255), 3, (*R.NAVY, 255))


# ---------- 2 ICONS 1 PLACE ----------
_ic = {}
def icon(name, size):
    k = (name, size)
    if k not in _ic:
        im = Image.open(ICON_DIR / f'{name}.webp').convert('RGBA'); im.thumbnail((size, size), Image.LANCZOS)
        bg = Image.new('RGBA', (size, size), (255, 255, 255, 255)); bg.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
        m = Image.new('L', (size, size), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), 28, fill=255); bg.putalpha(m); _ic[k] = bg
    return _ic[k]


def icons_board(L, d, t, s, place, reveal):
    g0 = run_start(s, lambda x: tagv(x, 'icons'))
    lid = ICON_ID[place]
    for i in (1, 2):
        kk = R.back(R.prog(t, g0['t0'] + .3 * (i - 1), .35))
        if kk <= .02: continue
        sz = round(300 * min(kk, 1.1)); cx = R.CX + (-1 if i == 1 else 1) * 200
        d.rounded_rectangle((cx - sz / 2 - 8, 260 - sz / 2 - 8, cx + sz / 2 + 8, 260 + sz / 2 + 8), 34, fill=(*R.CYAN, 255))
        L.alpha_composite(icon(f'{lid}_{i}', sz), (round(cx - sz / 2), round(260 - sz / 2)))
    if t >= g0['t0'] + .6: R.text_center(d, '+', R.CX, 260, R.font(R.F_EN, 90), (*R.ORANGE, 255), 4, (*R.NAVY, 255))
    if reveal:
        k = R.back(R.prog(t, s['t0'], .35))
        R.paste_art(L, pimg(place), R.CX, 520, 190, 190, k)
        R.card(d, t, s, 680, 58)
    else:
        R.text_center(d, '?', R.CX, 520, R.font(R.F_EN, 150), (*R.ORANGE, 255), 5, (*R.NAVY, 255))


# ---------- 情境動畫 ----------
TT = json.loads((HERE / 'tabletop' / 'src' / 'timing.json').read_text(encoding='utf-8'))
STORY = None
def story_seg():
    global STORY
    if STORY is None: STORY = next(x for x in R.SEGS if x['kind'] == 'story')
    return STORY

_sf = {}
def _frame(sid, lt):
    fr = max(0, min(int(lt * 24) // 2 * 2, int(TT[sid]['dur'] * 24) // 2 * 2))
    d = HERE / 'tabletop' / 'renders' / sid
    frames = sorted(d.glob('f*.png')) if d.exists() else []
    if not frames:
        key = ('ph', sid)
        if key not in _sf: _sf[key] = Image.new('RGB', (R.W, R.H), (90, 130, 90))
        return _sf[key]
    p = d / f'f{fr:04d}.png'
    if not p.exists(): p = min(frames, key=lambda q: abs(int(q.stem[1:]) - fr))
    if p not in _sf:
        if len(_sf) > 40: _sf.clear()
        _sf[p] = Image.open(p).convert('RGB').resize((R.W, R.H), Image.BICUBIC)
    return _sf[p]


def story_frame(t):
    """回傳 (畫面 RGBA, 疊圖 RGBA 或 None)。開場兩句播 OPEN；之後依 part9 時間找段落。"""
    st = story_seg()
    if t < st['t0']:
        lt = t - (st['t0'] - TT['OPEN']['dur']); return _frame('OPEN', lt).convert('RGBA'), None
    p = t - st['part9_offset']; sid = 'POST'
    for k, v in TT.items():
        if k != 'OPEN' and v['t0'] <= p: sid = k
    lt = p - TT[sid]['t0']
    im = _frame(sid, lt).convert('RGBA')
    ov = cards9.overlay(TT[sid], lt) if 'walk' in TT[sid] else None
    return im, ov


# ---------- 白板總入口 ----------
def board_v9(L, d, t):
    s = R.last_seg(t) or R.SEGS[0]; cur = R.seg_at(t); sec = s['sec']; tg = R.tags(s)
    turn = cur is not None and cur['kind'] == 'turn'
    w = tagv(s, 'word'); clap = tagv(s, 'clap'); ex = tagv(s, 'ex'); ic = tagv(s, 'icons')
    vis = s['vis']
    if vis.startswith('places') or sec in ('02-rule',) or (sec == '08-end' and 'places' in vis):
        first = next(x for x in R.SEGS if x['sec'] == sec and x['vis'].startswith('places'))
        lit = (R.relay_word(s, t) or '').strip(',!. ') if s['who'] == 'relay' else None
        places_grid(L, d, t, s, lit, first['t0'])
        if sec == '01-open' and t < first['t0']: pass
        if turn: R.your_turn(d, t, cur, 90)
        return
    if sec == '01-open':
        k = R.back(R.prog(t, s['t0']))
        R.text_center(d, 'Places', R.CX, 330, R.font(R.F_EN, 110 * k), (*R.CYAN, 255), 5, (*R.NAVY, 255))
        R.text_center(d, "I'm going to the ___.", R.CX, 480, R.font(R.F_EN, 72 * R.back(R.prog(t, s['t0'] + .3))), (*R.WHITE, 255), 4, (*R.NAVY, 255)); return
    if clap:
        claps = None if turn else s.get('claps')
        clap_board(L, d, t, s, clap, claps, cur if turn else None)
        if turn: R.your_turn(d, t, cur, 90)
        return
    if ic:
        icons_board(L, d, t, s, ic, '揭曉' in vis)
        if turn: R.your_turn(d, t, cur, 90)
        return
    if w and tg.get('card'):   # 句型：地點圖＋句型卡
        g0 = run_start(s, lambda x: tagv(x, 'word'))
        R.paste_art(L, pimg(w), R.CX, 270, 330, 330, R.back(R.prog(t, g0['t0'], .4)))
        R.card(d, t, s, 600, 70)
    elif w:
        hl = his(s); g0 = run_start(s, lambda x: tagv(x, 'word'))
        if ex: ex_cards(L, d, t, s, ex.split(','), hl, w)
        else: word_card(L, d, t, s, w, g0, hl)
    elif tg.get('card'):
        R.card(d, t, s, 400)
    if cur and cur['kind'] == 'sound': R.FB.sound_button(d, t, cur, R.CX - 150, 655)
    if turn: R.your_turn(d, t, cur, 90)
