"""A Day in Vienna — 畫風 J 角色程式（國小生約 4.3 頭身、大人約 6.3 頭身）。
座標：腳底中心 (0,0)，往上為負 y。手用 IK 指定目標點，道具接觸點可精準到像素。
"""
import os, sys, math, random
HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'skills', 'growkaz-cutout-tales', 'scripts'))
sys.path.insert(0, SKILL)
import engine as E
E.FONT = "Comic Relief"
from engine import hexc, rrect, poly, stroke, fs, shade, darker, lerp, ease, clamp, LINE

SKIN = dict(light=hexc('f3d2b6'), tan=hexc('e2b48e'), warm=hexc('d9a07a'))

KID = dict(hip=-178, sh=-310, neck=-342, hy=-404, R=64, sw=46, ww=42, lx=18, lw=30, ua=58, fa=56, aw=23, hr=14, adult=False)
ADULT = dict(hip=-300, sh=-505, neck=-540, hy=-588, R=50, sw=56, ww=50, lx=22, lw=34, ua=100, fa=94, aw=28, hr=15, adult=True)

CAST = {
    'amber':  dict(P=KID, skin='light', hair='braids', hc=hexc('4a2c1e'), top='uniform', topc=hexc('2f3f6e'), bottom='skirt', botc=hexc('2f3f6e'),
                   legs='socks', sockc=hexc('f4f1ea'), shoes=hexc('2a2424'), glasses=True, female=True, sleeve='long'),
    'teddy':  dict(P=KID, skin='tan', hair='spiky', hc=hexc('1d1a1c'), top='tee', topc=hexc('f2c53d'), bottom='shorts', botc=hexc('3d6fb0'),
                   legs='socks', sockc=hexc('f4f1ea'), shoes=hexc('d9483b'), sleeve='short'),
    'mia':    dict(P=KID, skin='light', hair='pony', hc=hexc('f0c75a'), top='dress', topc=hexc('f08aa8'), bottom='none', botc=hexc('f08aa8'),
                   legs='socks', sockc=hexc('ffffff'), shoes=hexc('e0577c'), female=True, sleeve='puff'),
    'edison': dict(P=KID, skin='light', hair='curly', hc=hexc('e0782e'), top='overalls', topc=hexc('7dbf6a'), bottom='pants', botc=hexc('4b74b8'),
                   legs='pants', shoes=hexc('7a4a2c'), sleeve='short', freckles=True),
    'rocky':  dict(P=KID, skin='warm', hair='shaggy', hc=hexc('5a3a22'), top='tunic', topc=hexc('e9a43c'), bottom='none', botc=hexc('e9a43c'),
                   legs='bare', shoes=hexc('8a5a34'), sleeve='none', sandals=True),
    'lena':   dict(P=KID, skin='light', hair='bob', hc=hexc('a0482a'), top='coat', topc=hexc('c8323a'), bottom='none', botc=hexc('c8323a'),
                   legs='socks', sockc=hexc('e8e2d8'), shoes=hexc('6a3e24'), female=True, sleeve='long', beret=hexc('c8323a')),
    'mozart': dict(P=ADULT, skin='light', hair='wig', hc=hexc('f1eee8'), top='frock', topc=hexc('c0303a'), bottom='breeches', botc=hexc('c0303a'),
                   legs='stockings', sockc=hexc('f7f4ee'), shoes=hexc('1f1b1d'), sleeve='long', vest=hexc('f2e2b8'), trim=hexc('e3b94a')),
    'beethoven': dict(P=ADULT, skin='tan', hair='wild', hc=hexc('2e2a30'), top='frock', topc=hexc('34405a'), bottom='pants', botc=hexc('3a3a40'),
                   legs='pants', shoes=hexc('1f1b1d'), sleeve='long', vest=hexc('c99a3a'), trim=None, heavybrow=True),
    'abu':    dict(robot=True),
}
NAMES = dict(amber='Amber', teddy='Teddy', mia='Mia', edison='Edison', rocky='Rocky', lena='Lena', mozart='Mozart', beethoven='Beethoven', abu='Abu')

EXPR = {
    'neutral': dict(brow=0, smile=2, look=0),
    'happy':   dict(brow=-3, smile=7, look=0),
    'excited': dict(brow=-6, smile=9, look=0, big=True),
    'surprised': dict(brow=-8, smile=0, look=0, o=True),
    'think':   dict(brow=-4, smile=0, look=3),
    'blow':    dict(brow=-2, smile=0, look=0, blow=True),
    'focus':   dict(brow=3, smile=2, look=2),
}

# ---------------- helpers ----------------
def seg(c, x0, y0, x1, y1, w, col):
    L = math.hypot(x1 - x0, y1 - y0); a = math.atan2(-(x1 - x0), y1 - y0)
    c.save(); c.translate(x0, y0); c.rotate(a)
    shade(c, lambda: rrect(c, -w/2, -w/2, w, L + w, w/2), lambda: c.rectangle(w*0.2, -w, w, L + 2*w), col, darker(col))
    c.restore()

def ik(sx, sy, hx, hy, l1, l2, side):
    dx, dy = hx - sx, hy - sy; d = math.hypot(dx, dy)
    d = clamp(d, abs(l1 - l2) + 0.5, l1 + l2 - 0.5)
    a = math.atan2(dy, dx)
    b = math.acos(clamp((l1*l1 + d*d - l2*l2)/(2*l1*d), -1, 1))
    best = None
    for bend in (1, -1):
        ex, ey = sx + l1*math.cos(a + bend*b), sy + l1*math.sin(a + bend*b)
        score = ex*side + ey*0.35          # 手肘往外、往下
        if best is None or score > best[0]: best = (score, ex, ey)
    _, ex, ey = best
    ux, uy = hx - ex, hy - ey; n = math.hypot(ux, uy) or 1
    return (ex, ey), (ex + ux/n*l2, ey + uy/n*l2)

def mitten(c, x, y, r, skin, ang=0.0, grip=False):
    c.save(); c.translate(x, y); c.rotate(ang)
    c.new_path(); c.arc(0, 0, r, 0, 6.3); fs(c, skin, 2.8)
    if grip:   # 手指包住握把：三條指節線
        for i in (-1, 0, 1):
            c.move_to(-r*0.55, i*r*0.42); c.line_to(r*0.6, i*r*0.42); stroke(c, 2, darker(skin, 0.7))
    else:      # 大拇指
        c.save(); c.translate(-r*0.75, -r*0.35); c.rotate(-0.6); c.scale(0.45, 0.7); c.arc(0, 0, r, 0, 6.3); c.restore(); fs(c, skin, 2.4)
    c.restore()

def leopard(c, x0, y0, x1, y1):
    rnd = random.Random(5)
    for _ in range(26):
        x = rnd.uniform(x0, x1); y = rnd.uniform(y0, y1); r = rnd.uniform(5, 9)
        for k in range(5):
            a = k*1.25 + rnd.random()*0.3
            c.save(); c.translate(x + r*math.cos(a), y + r*math.sin(a)); c.rotate(a); c.scale(1, 0.55); c.arc(0, 0, 3.2, 0, 6.3); c.restore()
            c.set_source_rgba(*hexc('5a3418')); c.fill()

# ---------------- hair ----------------
def hair_back(c, d, R):
    h, hc = d['hair'], d['hc']
    if h == 'pony':
        c.save(); c.translate(R*0.95, -R*0.55); c.rotate(0.5)
        shade(c, lambda: (c.move_to(0, 0), c.curve_to(R*0.55, R*0.2, R*0.6, R*1.1, R*0.15, R*1.45), c.curve_to(R*0.2, R*0.9, -R*0.1, R*0.5, 0, 0), c.close_path()),
              lambda: c.rectangle(R*0.3, -R, R, R*3), hc, darker(hc, 0.82))
        c.restore()
    if h == 'bob':
        shade(c, lambda: rrect(c, -R*1.12, -R*0.95, R*2.24, R*1.75, R*0.7), lambda: c.rectangle(R*0.4, -R*2, R*2, R*4), hc, darker(hc, 0.8))
    if h == 'wild':   # 貝多芬：蓬鬆波浪亂髮（一圈圓團），和 Teddy 的尖刺頭區分
        rnd = random.Random(3)
        for i in range(13):
            a = math.pi*0.78 + i*(math.pi*1.44/12)
            r = R*rnd.uniform(1.0, 1.12); rr = R*rnd.uniform(0.36, 0.46)
            c.new_path(); c.arc(r*math.cos(a), -R*0.1 + r*math.sin(a), rr, 0, 6.3); fs(c, hc, 2.6)
            c.new_path(); c.arc(r*math.cos(a) + rr*0.25, -R*0.1 + r*math.sin(a) - rr*0.2, rr*0.45, 0.6, 2.4); stroke(c, 2, hexc('5a5560'))
    if h == 'wig':   # 黑色緞帶馬尾（從頸後露出一點）
        c.save(); c.translate(R*0.62, R*0.72)
        for s in (-1, 1):
            poly(c, [(0, 0), (s*R*0.42, -R*0.2), (s*R*0.42, R*0.22)]); fs(c, hexc('1f1b1d'), 2.4)
        c.new_path(); c.arc(0, 0, R*0.1, 0, 6.3); fs(c, hexc('1f1b1d'), 2.2); c.restore()

def braid(c, s, R, hc):
    for i in range(6):
        y = -R*0.05 + i*R*0.27; x = s*(R*0.95 + i*R*0.03)
        c.save(); c.translate(x, y); c.rotate(s*0.25); c.scale(0.8, 1); c.new_path(); c.arc(0, 0, R*0.19, 0, 6.3); c.restore(); fs(c, hc, 2.4)
    y = -R*0.05 + 6*R*0.27; x = s*(R*0.95 + 6*R*0.03)
    rrect(c, x - R*0.12, y - R*0.12, R*0.24, R*0.12, 3); fs(c, hexc('d9433b'), 2)
    poly(c, [(x - R*0.13, y), (x + R*0.13, y), (x + R*0.16, y + R*0.3), (x - R*0.16, y + R*0.3)]); fs(c, hc, 2.2)

def cap_path(c, R, fringe, top=1.12, side=1.05, low=0.12):
    c.move_to(-R*side, R*low)
    c.curve_to(-R*side*1.08, -R*(1.45 + (top - 1.12)), R*side*1.08, -R*(1.45 + (top - 1.12)), R*side, R*low)
    c.curve_to(R*side, R*low, R*side, R*low, R*side, R*low)
    c.curve_to(R*0.95, -R*0.1, R*0.9, -R*0.3, R*0.85, -R*0.3)
    for (x, y) in fringe: c.line_to(x*R, y*R)
    c.line_to(-R*0.85, -R*0.3); c.curve_to(-R*0.9, -R*0.3, -R*0.95, -R*0.1, -R*side, R*low); c.close_path()

def hair_front(c, d, R):
    h, hc = d['hair'], d['hc']; dk = darker(hc, 0.8)
    sh = lambda: c.rectangle(R*0.35, -R*2, R*2, R*4)
    if h == 'braids':
        for s in (-1, 1): braid(c, s, R, hc)
        shade(c, lambda: cap_path(c, R, [(0.55, -0.45), (0.08, -0.72), (0, -0.62), (-0.08, -0.72), (-0.55, -0.45)]), sh, hc, dk)
    elif h == 'spiky':
        pts = [(-1.02, 0.05), (-1.18, -0.45), (-0.85, -0.6), (-1.0, -1.05), (-0.48, -0.95), (-0.38, -1.4), (0, -1.02), (0.26, -1.45), (0.46, -0.98),
               (0.98, -1.15), (0.84, -0.62), (1.2, -0.52), (1.02, 0.05), (0.88, -0.3), (0.55, -0.55), (0.32, -0.32), (0.05, -0.58), (-0.25, -0.34), (-0.55, -0.56), (-0.85, -0.3)]
        shade(c, lambda: poly(c, [(x*R, y*R) for x, y in pts]), sh, hc, darker(hc, 0.6))
    elif h == 'pony':
        shade(c, lambda: cap_path(c, R, [(0.75, -0.2), (0.3, -0.5), (-0.2, -0.62), (-0.6, -0.48)]), sh, hc, dk)
        c.save(); c.translate(R*0.78, -R*0.72)
        for s in (-1, 1): poly(c, [(0, 0), (s*R*0.32, -R*0.2), (s*R*0.32, R*0.18)]); fs(c, hexc('f05a8a'), 2.4)
        c.new_path(); c.arc(0, 0, R*0.09, 0, 6.3); fs(c, hexc('f05a8a'), 2.2); c.restore()
    elif h == 'curly':
        shade(c, lambda: cap_path(c, R, [(0.5, -0.55), (0, -0.6), (-0.5, -0.55)]), sh, hc, dk)
        for i in range(12):
            a = math.pi*0.93 + i*(math.pi*1.14/11)
            c.new_path(); c.arc(R*0.98*math.cos(a), -R*0.12 + R*0.98*math.sin(a), R*0.27, 0, 6.3); fs(c, hc, 2.4)
        for x in (-0.35, 0.05, 0.42):
            c.new_path(); c.arc(x*R, -R*0.6, R*0.22, 0, 6.3); fs(c, hc, 2.4)
    elif h == 'shaggy':
        pts = [(-1.05, 0.25), (-1.2, -0.3), (-1.0, -0.75), (-0.7, -1.15), (-0.2, -1.2), (0.3, -1.25), (0.8, -1.05), (1.15, -0.65), (1.22, -0.1), (1.05, 0.25),
               (0.9, -0.25), (0.7, -0.4), (0.55, -0.22), (0.3, -0.52), (0.05, -0.3), (-0.2, -0.55), (-0.45, -0.28), (-0.7, -0.5), (-0.9, -0.2)]
        shade(c, lambda: poly(c, [(x*R, y*R) for x, y in pts]), sh, hc, darker(hc, 0.75))
        c.save(); c.translate(R*0.35, -R*1.08); c.rotate(-0.4)   # 骨頭髮夾
        rrect(c, -R*0.32, -R*0.07, R*0.64, R*0.14, 4); fs(c, hexc('f6efe0'), 2.2)
        for s in (-1, 1):
            for t in (-1, 1): c.new_path(); c.arc(s*R*0.34, t*R*0.08, R*0.09, 0, 6.3); fs(c, hexc('f6efe0'), 2.2)
        c.restore()
    elif h == 'bob':
        shade(c, lambda: cap_path(c, R, [(0.82, -0.32), (0.5, -0.36), (0, -0.38), (-0.5, -0.36), (-0.82, -0.32)]), sh, hc, dk)
        if d.get('beret'):
            c.save(); c.translate(-R*0.15, -R*0.95); c.rotate(-0.22)
            shade(c, lambda: (c.new_path(), c.save(), c.scale(1.05, 0.38), c.arc(0, 0, R, 0, 6.3), c.restore()), lambda: c.rectangle(R*0.3, -R, R, R*2), d['beret'], darker(d['beret']))
            rrect(c, -R*0.05, -R*0.52, R*0.1, R*0.18, 3); fs(c, darker(d['beret']), 2); c.restore()
    elif h == 'wig':
        shade(c, lambda: cap_path(c, R, [(0.7, -0.5), (0.3, -0.68), (0, -0.7), (-0.3, -0.68), (-0.7, -0.5)], top=1.2), sh, hc, darker(hc, 0.85))
        for s in (-1, 1):
            for j, y in enumerate((-0.12, 0.22)):
                c.save(); c.translate(s*R*1.0, y*R); c.scale(1, 0.62); c.new_path(); c.arc(0, 0, R*0.27, 0, 6.3); c.restore(); fs(c, hc, 2.4)
                c.save(); c.translate(s*R*1.0, y*R); c.scale(1, 0.62); c.new_path(); c.arc(0, 0, R*0.12, 0, 6.3); c.restore(); stroke(c, 1.8, darker(hc, 0.7))
    elif h == 'wild':
        shade(c, lambda: cap_path(c, R, [(0.7, -0.42), (0.45, -0.62), (0.2, -0.45), (-0.05, -0.66), (-0.3, -0.5), (-0.6, -0.6), (-0.8, -0.38)]), sh, hc, darker(hc, 0.6))
        for s_ in (-1, 1):  # 鬢角
            poly(c, [(s_*R*0.92, -R*0.1), (s_*R*0.98, R*0.4), (s_*R*0.84, R*0.36), (s_*R*0.8, -R*0.05)]); fs(c, hc, 2.2)

# ---------------- 嘴形（viseme）----------------
# X 休息  A 閉唇 M/B/P  B 露齒 小開（K S T D N Y EE…）  C 中開 E/AE  D 大開 AA/AH/AY
# E 圓嘴 O/AW/OW/ER  F 嘟嘴 OO/W  G 上齒咬下唇 F/V  H 舌尖頂上齒 L/TH
MOUTH_IN, TONGUE, LIP = hexc('5a1e1e'), hexc('e2707a'), hexc('c76a6a')
# 參數化嘴形（單位＝頭半徑 R）：w 半寬、h 開口高、rnd 圓唇、tt 上排牙、tb 下排牙、press 閉唇、bite 咬唇、tng 舌尖、lip 嘟唇
SHAPES = dict(
    X=dict(w=.24, h=0.0, rnd=0, tt=0, tb=0, press=0, bite=0, tng=0, lip=0),
    A=dict(w=.21, h=0.0, rnd=0, tt=0, tb=0, press=1, bite=0, tng=0, lip=0),
    B=dict(w=.29, h=.13, rnd=0, tt=1, tb=1, press=0, bite=0, tng=0, lip=0),
    C=dict(w=.29, h=.27, rnd=0, tt=1, tb=0, press=0, bite=0, tng=0, lip=0),
    D=dict(w=.31, h=.40, rnd=0, tt=1, tb=0, press=0, bite=0, tng=0, lip=0),
    E=dict(w=.18, h=.34, rnd=1, tt=0, tb=0, press=0, bite=0, tng=0, lip=0),
    F=dict(w=.11, h=.12, rnd=1, tt=0, tb=0, press=0, bite=0, tng=0, lip=1),
    G=dict(w=.25, h=.12, rnd=0, tt=1, tb=0, press=0, bite=1, tng=0, lip=0),
    H=dict(w=.27, h=.28, rnd=0, tt=1, tb=0, press=0, bite=0, tng=1, lip=0),
)
VIS_OPEN = {k: v['h']/0.40 for k, v in SHAPES.items()}

def mouth_params(mouth):
    """接受 'C'、('C', 0.9)、或已混合好的參數 dict。"""
    if isinstance(mouth, dict): return mouth
    if isinstance(mouth, tuple): vis, amp = mouth
    elif isinstance(mouth, str): vis, amp = mouth, 1.0
    else:   # 舊的 0–1 開合值
        m = float(mouth); return blend([(SHAPES['X'], 1 - m), (SHAPES['D'], m)]) if m > 0.05 else dict(SHAPES['X'])
    p = dict(SHAPES[vis]); p['h'] *= amp; return p

def blend(items):
    tot = sum(w for _, w in items) or 1
    return {k: sum(p[k]*w for p, w in items)/tot for k in SHAPES['X']}

def draw_mouth(c, p, R, my, sm=2):
    w, h = p['w']*R, p['h']*R; rnd = p['rnd']
    if h < R*0.045:                                   # 閉嘴：X 微笑線 → A 抿唇粗線
        pr = p['press']; k = sm*(1 - pr)
        c.new_path(); c.move_to(-w, my - k*0.2); c.curve_to(-w*0.4, my + k + pr*2, w*0.4, my + k + pr*2, w, my - k*0.2); stroke(c, 3.2 + 1.6*pr)
        if pr > 0.5:
            c.new_path(); c.move_to(-w*0.45, my + R*0.09); c.curve_to(-w*0.15, my + R*0.12, w*0.15, my + R*0.12, w*0.45, my + R*0.09); stroke(c, 2.2, (0.55, 0.36, 0.3))
        return
    yt = my - h*(0.10 + 0.32*rnd); yb = my + h*(0.90 - 0.32*rnd); yc = lerp(my - h*0.02, (yt + yb)/2, rnd)
    kx = lerp(0.45, 0.62, rnd)
    def path():
        c.new_path(); c.move_to(-w, yc)
        c.curve_to(-w, lerp(yc, yt, 0.2 + 0.8*rnd), -w*kx, yt, 0, yt); c.curve_to(w*kx, yt, w, lerp(yc, yt, 0.2 + 0.8*rnd), w, yc)
        c.curve_to(w, lerp(yc, yb, 0.75), w*kx, yb, 0, yb); c.curve_to(-w*kx, yb, -w, lerp(yc, yb, 0.75), -w, yc); c.close_path()
    if p['lip'] > 0.4:                                # 嘟嘴：外圈唇色
        c.save(); c.translate(0, (yt + yb)/2); c.scale(1.45, 1.4); c.translate(0, -(yt + yb)/2); path(); c.restore()
        c.set_source_rgba(*LIP); c.fill_preserve(); stroke(c, 2.6)
    path(); c.set_source_rgba(*MOUTH_IN); c.fill_preserve(); c.save(); c.clip()
    if h > R*0.16 and p['tb'] < 0.5:                  # 舌頭在下方
        c.new_path(); c.save(); c.translate(0, yb + h*0.05); c.scale(w*0.62, h*0.42); c.arc(0, 0, 1, 0, 6.3); c.restore(); c.set_source_rgba(*TONGUE); c.fill()
    if p['tng'] > 0.5:                                # 舌尖頂上齒（L／TH）
        c.new_path(); c.save(); c.translate(0, yt + h*0.34); c.scale(w*0.42, h*0.3); c.arc(0, 0, 1, 0, 6.3); c.restore(); c.set_source_rgba(*TONGUE); c.fill()
    if p['tt'] > 0.3:
        th_ = min(R*0.075, h*0.5)*p['tt']; c.rectangle(-w, yt - 2, 2*w, th_ + 2 + (yc - yt)*0.3); c.set_source_rgb(1, 1, 1); c.fill()
    if p['tb'] > 0.3:
        th_ = h*0.42*p['tb']; c.rectangle(-w, yb - th_, 2*w, th_ + 2); c.set_source_rgb(0.96, 0.96, 0.94); c.fill()
        c.new_path(); c.move_to(-w, (yt + yb)/2 + 1); c.line_to(w, (yt + yb)/2 + 1); stroke(c, 1.6, (0.6, 0.55, 0.55))
    c.restore(); path(); stroke(c, 3)
    if p['bite'] > 0.5:                               # 下唇收進上齒下面（F／V）
        c.new_path(); c.move_to(-w*0.85, yb - h*0.25); c.curve_to(-w*0.3, yb - h*0.62, w*0.3, yb - h*0.62, w*0.85, yb - h*0.25)
        c.curve_to(w*0.5, yb + h*0.5, -w*0.5, yb + h*0.5, -w*0.85, yb - h*0.25); c.close_path(); c.set_source_rgba(*LIP); c.fill_preserve(); stroke(c, 2.6)

# ---------------- head ----------------
def head(c, d, R, ex, mouth, blink, mouth_mode, t, adult):
    skin = SKIN[d['skin']]; sd = darker(skin, 0.86); hc = d['hc']
    if d['hair'] not in ('wig', 'wild', 'bob'):
        for s in (-1, 1):
            c.save(); c.translate(s*R*0.98, R*0.08); c.scale(0.55, 0.85); c.new_path(); c.arc(0, 0, R*0.22, 0, 6.3); c.restore(); fs(c, skin, 2.6)
    mp = None
    if mouth_mode != 'none' and not ex.get('blow') and (isinstance(mouth, (str, tuple, dict)) or (isinstance(mouth, (int, float)) and mouth > 0.05)):
        mp = mouth_params(mouth)
    jaw = (mp['h']*0.3 if mp else 0)                 # 下巴跟著開口往下
    ry = (1.1 if adult else 0.96) + jaw
    face = lambda: (c.new_path(), c.move_to(-R, -R*0.1), c.curve_to(-R, R*0.6*ry, -R*0.55, R*ry, 0, R*ry), c.curve_to(R*0.55, R*ry, R, R*0.6*ry, R, -R*0.1),
                    c.curve_to(R, -R*1.15, -R, -R*1.15, -R, -R*0.1), c.close_path())
    shade(c, face, lambda: (c.move_to(R*0.35, -R*1.3), c.curve_to(R*0.7, -R*0.2, R*0.7, R*0.4, R*0.25, R*1.3), c.line_to(R*1.5, R*1.3), c.line_to(R*1.5, -R*1.3), c.close_path()), skin, sd)
    if not adult:
        for s in (-1, 1):
            c.save(); c.translate(s*R*0.58, R*0.42); c.scale(1.3, 0.8); c.new_path(); c.arc(0, 0, R*0.12, 0, 6.3); c.restore(); c.set_source_rgba(0.95, 0.45, 0.45, 0.35); c.fill()
    if d.get('freckles'):
        for s in (-1, 1):
            for dx, dy in ((0.48, 0.3), (0.6, 0.36), (0.54, 0.44)):
                c.new_path(); c.arc(s*dx*R, dy*R, 1.8, 0, 6.3); c.set_source_rgba(0.7, 0.4, 0.25, 0.8); c.fill()
    # eyes
    es = 0.75 if adult else 1.0
    look = ex.get('look', 0)
    for s in (-1, 1):
        x = s*R*0.37; y = R*0.08
        if blink:
            c.new_path(); c.move_to(x - R*0.15*es, y); c.curve_to(x - R*0.05, y + R*0.07, x + R*0.05, y + R*0.07, x + R*0.15*es, y); stroke(c, 3.2)
        else:
            c.save(); c.translate(x, y); c.scale(0.86, 1); c.new_path(); c.arc(0, 0, R*0.2*es, 0, 6.3); c.restore(); c.set_source_rgb(0.99, 0.98, 0.95); c.fill_preserve(); stroke(c, 2.2)
            c.new_path(); c.arc(x + look, y + R*0.02, R*0.12*es, 0, 6.3); c.set_source_rgb(*LINE); c.fill()
            c.new_path(); c.arc(x + look + R*0.04, y - R*0.03, R*0.04*es, 0, 6.3); c.set_source_rgb(1, 1, 1); c.fill()
            if d.get('female'):
                c.new_path(); c.move_to(x - s*R*0.05, y - R*0.17); c.line_to(x + s*R*0.2, y - R*0.2); stroke(c, 2.6)
        b = ex.get('brow', 0); by = -R*0.24
        bc = darker(hc, 0.55) if d['hair'] in ('pony', 'wig') else hc
        c.new_path(); c.move_to(x + s*R*0.18, by + min(0, b)*0.6); c.line_to(x - s*R*0.16, by + b*0.5 + (2 if b > 0 else -2 if b < 0 else 0))
        c.set_source_rgba(*bc); c.set_line_width(R*(0.14 if d.get('heavybrow') else 0.1)); c.set_line_cap(1); c.stroke()
    if d.get('glasses'):
        for s in (-1, 1):
            c.new_path(); rrect(c, s*R*0.37 - R*0.27, R*0.08 - R*0.22, R*0.54, R*0.44, R*0.16); c.set_source_rgba(1, 1, 1, 0.12); c.fill_preserve(); stroke(c, 3.2, hexc('7a2e2e'))
        c.new_path(); c.move_to(-R*0.1, R*0.03); c.curve_to(-R*0.04, -R*0.02, R*0.04, -R*0.02, R*0.1, R*0.03); stroke(c, 3, hexc('7a2e2e'))
    # nose
    c.new_path()
    if adult:
        c.move_to(R*0.02, R*0.12); c.curve_to(R*0.16, R*0.38, R*0.1, R*0.44, -R*0.04, R*0.44); stroke(c, 2.6, darker(skin, 0.6))
    else:
        c.save(); c.translate(0, R*0.34); c.scale(1.3, 0.8); c.arc(0, 0, R*0.06, 0, 6.3); c.restore(); c.set_source_rgba(*darker(skin, 0.75)); c.fill()
    # mouth
    my = R*(0.62 if adult else 0.56)
    sm = ex.get('smile', 0)
    if mouth_mode == 'none': mouth = 0
    if mp is not None:
        draw_mouth(c, mp, R, my + jaw*R*0.35, sm)
    elif ex.get('blow'):
        c.new_path(); c.save(); c.translate(0, my); c.scale(1, 0.85); c.arc(0, 0, R*0.1, 0, 6.3); c.restore(); fs(c, hexc('c0605a'), 2.6)
        for s in (-1, 1):
            c.save(); c.translate(s*R*0.5, R*0.48); c.scale(1.2, 1); c.new_path(); c.arc(0, 0, R*0.16, 0, 6.3); c.restore(); c.set_source_rgba(0.95, 0.5, 0.5, 0.35); c.fill()
    elif ex.get('o') and mouth_mode != 'none':
        c.new_path(); c.save(); c.translate(0, my); c.scale(0.8, 1); c.arc(0, 0, R*0.13, 0, 6.3); c.restore(); fs(c, hexc('5a1e1e'), 2.6)
    elif mouth < 0.06:
        w = R*0.22
        c.new_path(); c.move_to(-w, my - sm*0.2); c.curve_to(-w*0.4, my + sm, w*0.4, my + sm, w, my - sm*0.2); stroke(c, 3.2)
    else:
        w = R*(0.17 + 0.07*mouth); dep = R*(0.08 + 0.26*mouth)
        path = lambda: (c.new_path(), c.move_to(-w, my - 2), c.curve_to(-w*0.4, my + 2, w*0.4, my + 2, w, my - 2), c.curve_to(w*0.9, my + dep, -w*0.9, my + dep, -w, my - 2), c.close_path())
        path(); c.set_source_rgba(*hexc('5a1e1e')); c.fill_preserve(); c.save(); c.clip()
        c.new_path(); c.save(); c.translate(0, my + dep*0.95); c.scale(1.4, 0.7); c.arc(0, 0, w*0.45, 0, 6.3); c.restore(); c.set_source_rgba(*hexc('e2707a')); c.fill()
        c.rectangle(-w, my - 4, 2*w, R*0.06); c.set_source_rgb(1, 1, 1); c.fill(); c.restore()
        path(); stroke(c, 3)
    hair_front(c, d, R)

# ---------------- body ----------------
def torso_path(c, P, x_extra=0, bot=None):
    sw, ww, sh, hip = P['sw'] + x_extra, P['ww'] + x_extra, P['sh'], P['hip'] if bot is None else bot
    c.new_path(); c.move_to(-sw, sh - 6); c.curve_to(-sw - 4, (sh + hip)/2, -ww - 2, hip - 20, -ww, hip + 6); c.line_to(ww, hip + 6)
    c.curve_to(ww + 2, hip - 20, sw + 4, (sh + hip)/2, sw, sh - 6); c.curve_to(sw*0.5, sh - 22, -sw*0.5, sh - 22, -sw, sh - 6); c.close_path()

def legs(c, d, P, t, feet=None):
    skin = SKIN[d['skin']]; hip = P['hip']; lw = P['lw']
    for s in (-1, 1):
        x = s*P['lx']
        col = d['botc'] if d['legs'] == 'pants' else skin
        if feet and s in feet:                      # 指定腳踝位置：大腿＋小腿兩節（膝蓋朝外），鞋子跟著腳
            fx, fy = feet[s]; half = (-24 - hip - 4)/2*1.03
            (kx, ky), (ax, ay) = ik(x, hip + 4, fx, fy, half, half, s)
            seg(c, x, hip + 4, kx, ky, lw, col)
            seg(c, kx, ky, ax, ay, lw, d['sockc'] if d['legs'] in ('socks', 'stockings') else col)
            hh = 26; shade(c, lambda: rrect(c, ax - 20, ay, 44, hh, hh*0.45), lambda: c.rectangle(ax + 4, ay - 2, 40, 4), d['shoes'], darker(d['shoes'], 0.7))
            continue
        seg(c, x, hip + 4, x + s*2, -24, lw, col)
        if d['legs'] in ('socks', 'stockings'):
            top = -86 if d['legs'] == 'socks' else -170
            seg(c, x + s*1, top, x + s*2, -24, lw + 1, d['sockc'])
        if d['legs'] == 'pants' and not P['adult']:
            rrect(c, x - lw/2 - 2, -46, lw + 4, 14, 4); fs(c, darker(d['botc'], 0.85), 2.4)
        # shoe
        sx = x + s*6
        if d.get('sandals'):
            rrect(c, sx - 22, -14, 44, 14, 6); fs(c, d['shoes'], 2.6)
            for yy in (-30, -46): c.new_path(); c.move_to(x - lw/2, yy); c.line_to(x + lw/2, yy + 4); stroke(c, 4, d['shoes'])
        else:
            h = 28 if P['adult'] else 26
            shade(c, lambda: rrect(c, sx - (26 if P['adult'] else 22), -h, (52 if P['adult'] else 44), h, h*0.45), lambda: c.rectangle(sx, -h - 2, 40, 4), d['shoes'], darker(d['shoes'], 0.7))
            if d.get('trim') and P['adult']:
                rrect(c, sx - 7, -h + 4, 14, 10, 2); fs(c, d['trim'], 1.8)

def outfit(c, d, P, t):
    top = d['top']; tc = d['topc']; sh, hip = P['sh'], P['hip']; skin = SKIN[d['skin']]
    sd = lambda: c.rectangle(P['sw']*0.3, sh - 60, 200, 600)
    if top == 'tee':
        shade(c, lambda: torso_path(c, P), sd, tc, darker(tc))
        c.new_path(); c.move_to(-14, sh - 16); c.curve_to(-8, sh + 2, 8, sh + 2, 14, sh - 16); stroke(c, 3)
        # 衣服上的小星星
        st = [(-14 + (12 if i % 2 == 0 else 5)*math.cos(-math.pi/2 + i*math.pi/5), sh + 60 + (12 if i % 2 == 0 else 5)*math.sin(-math.pi/2 + i*math.pi/5)) for i in range(10)]
        poly(c, st); fs(c, hexc('ffffff'), 2)
    elif top == 'uniform':
        shade(c, lambda: torso_path(c, P), sd, tc, darker(tc))
        poly(c, [(-30, sh - 14), (0, sh + 34), (30, sh - 14), (16, sh - 18), (0, sh + 8), (-16, sh - 18)]); fs(c, hexc('f6f3ec'), 2.6)
        for s in (-1, 1): poly(c, [(0, sh + 22), (s*20, sh + 12), (s*20, sh + 36)]); fs(c, hexc('d9433b'), 2.2)
        c.new_path(); c.arc(0, sh + 24, 5, 0, 6.3); fs(c, hexc('d9433b'), 2)
        for y in (sh + 60, sh + 92): c.new_path(); c.arc(0, y, 4, 0, 6.3); fs(c, hexc('e3c14a'), 1.6)
    elif top == 'dress':
        dp = lambda: (c.new_path(), c.move_to(-P['sw'], sh - 6), c.curve_to(-P['sw'] - 2, sh + 60, -P['ww'], hip - 40, -P['ww'] - 30, hip + 70),
                      c.line_to(P['ww'] + 30, hip + 70), c.curve_to(P['ww'], hip - 40, P['sw'] + 2, sh + 60, P['sw'], sh - 6),
                      c.curve_to(P['sw']*0.5, sh - 22, -P['sw']*0.5, sh - 22, -P['sw'], sh - 6), c.close_path())
        shade(c, dp, sd, tc, darker(tc))
        rrect(c, -P['ww'] - 4, hip - 50, 2*P['ww'] + 8, 12, 4); fs(c, hexc('ffffff'), 2.2)
        for s in (-1, 1): c.new_path(); c.save(); c.translate(s*13, sh - 10); c.scale(1.2, 0.7); c.arc(0, 0, 14, 0, 6.3); c.restore(); fs(c, hexc('ffffff'), 2.4)
    elif top == 'overalls':
        shade(c, lambda: torso_path(c, P), sd, tc, darker(tc))
        c.save(); torso_path(c, P); c.clip()
        for y in range(int(sh), int(hip), 16): c.rectangle(-80, y, 160, 7); c.set_source_rgba(1, 1, 1, 0.7); c.fill()
        c.restore(); torso_path(c, P); stroke(c, 3.2)
        bc = d['botc']
        shade(c, lambda: rrect(c, -30, sh + 50, 60, hip - sh - 40, 6), lambda: c.rectangle(10, sh, 60, 300), bc, darker(bc))
        shade(c, lambda: (c.new_path(), c.move_to(-P['ww'] - 2, hip - 30), c.line_to(P['ww'] + 2, hip - 30), c.line_to(P['ww'] + 4, hip + 8), c.line_to(-P['ww'] - 4, hip + 8), c.close_path()),
              lambda: c.rectangle(10, hip - 40, 60, 60), bc, darker(bc))
        for s in (-1, 1):
            c.new_path(); c.move_to(s*24, sh + 56); c.line_to(s*34, sh - 10); stroke(c, 9, bc); c.new_path(); c.move_to(s*24, sh + 56); c.line_to(s*34, sh - 10)
            c.new_path(); c.arc(s*23, sh + 58, 5, 0, 6.3); fs(c, hexc('e3c14a'), 1.8)
        rrect(c, -16, sh + 76, 32, 26, 4); fs(c, darker(bc, 0.9), 2.2)
    elif top == 'tunic':
        shade(c, lambda: torso_path(c, P), sd, skin, darker(skin, 0.86))   # 光膀子
        tp = lambda: (c.new_path(), c.move_to(-P['sw'] + 2, sh - 4), c.line_to(-P['sw'] + 22, sh - 10), c.line_to(P['sw'] + 2, sh + 46),
                      c.curve_to(P['ww'] + 6, hip - 30, P['ww'] + 8, hip, P['ww'] + 12, hip + 40),
                      *[c.line_to(P['ww'] + 12 - i*((2*P['ww'] + 24)/8), hip + (40 if i % 2 == 0 else 22)) for i in range(1, 9)],
                      c.curve_to(-P['ww'] - 8, hip, -P['ww'] - 4, sh + 40, -P['sw'] + 2, sh - 4), c.close_path())
        tp(); c.set_source_rgba(*tc); c.fill_preserve(); c.save(); c.clip(); leopard(c, -70, sh - 20, 70, hip + 50)
        c.rectangle(P['sw']*0.3, sh - 60, 200, 600); c.set_source_rgba(0, 0, 0, 0.14); c.fill(); c.restore(); tp(); stroke(c, 3.2)
        rrect(c, -P['ww'] - 6, hip - 22, 2*P['ww'] + 12, 12, 5); fs(c, hexc('7a4a2c'), 2.4)
    elif top == 'coat':
        cp = lambda: (c.new_path(), c.move_to(-P['sw'], sh - 6), c.curve_to(-P['sw'] - 4, sh + 60, -P['ww'] - 6, hip - 40, -P['ww'] - 18, hip + 66),
                      c.line_to(P['ww'] + 18, hip + 66), c.curve_to(P['ww'] + 6, hip - 40, P['sw'] + 4, sh + 60, P['sw'], sh - 6),
                      c.curve_to(P['sw']*0.5, sh - 22, -P['sw']*0.5, sh - 22, -P['sw'], sh - 6), c.close_path())
        shade(c, cp, sd, tc, darker(tc))
        c.new_path(); c.move_to(0, sh - 10); c.line_to(0, hip + 66); stroke(c, 2.6)
        for y in (sh + 40, sh + 80, sh + 120): c.new_path(); c.arc(-10, y, 5, 0, 6.3); fs(c, hexc('f2e2b8'), 1.8)
        for s in (-1, 1): poly(c, [(s*4, sh - 12), (s*30, sh - 16), (s*16, sh + 20)]); fs(c, darker(tc, 0.85), 2.4)
        rrect(c, -P['ww'] - 8, hip - 20, 2*P['ww'] + 16, 12, 4); fs(c, hexc('3a2a22'), 2.2)
    elif top == 'frock':
        # 背後燕尾
        shade(c, lambda: (c.new_path(), c.move_to(-P['ww'] - 6, hip - 40), c.line_to(-P['ww'] - 26, hip + 150), c.line_to(-10, hip + 120), c.line_to(10, hip + 120),
                          c.line_to(P['ww'] + 26, hip + 150), c.line_to(P['ww'] + 6, hip - 40), c.close_path()), lambda: c.rectangle(0, hip - 60, 100, 300), darker(tc, 0.85), darker(tc, 0.7))
        shade(c, lambda: torso_path(c, P, bot=hip + 10), sd, tc, darker(tc))
        v = d['vest']
        vp = lambda: (c.new_path(), c.move_to(-24, sh - 6), c.line_to(24, sh - 6), c.line_to(30, hip + 30), c.line_to(0, hip + 50), c.line_to(-30, hip + 30), c.close_path())
        shade(c, vp, lambda: c.rectangle(8, sh, 60, 400), v, darker(v))
        for y in range(int(sh + 50), int(hip + 20), 34): c.new_path(); c.arc(0, y, 4, 0, 6.3); fs(c, d['trim'] or hexc('8a6a3a'), 1.6)
        if d.get('trim'):
            for s in (-1, 1): c.new_path(); c.move_to(s*26, sh - 4); c.line_to(s*34, hip + 30); stroke(c, 6, d['trim']); c.new_path(); c.move_to(s*26, sh - 4); c.line_to(s*34, hip + 30)
        # 領巾
        jp = lambda: (c.new_path(), c.move_to(-18, sh - 22), c.curve_to(-30, sh + 10, -20, sh + 50, 0, sh + 70), c.curve_to(20, sh + 50, 30, sh + 10, 18, sh - 22), c.close_path())
        jp(); fs(c, hexc('fbfaf6'), 2.6)
        for y in (sh + 6, sh + 30): c.new_path(); c.move_to(-18, y); c.curve_to(-6, y + 10, 6, y + 10, 18, y); stroke(c, 1.8, hexc('b8b0a0'))
    # 下身
    bot = d['bottom']; bc = d['botc']
    if bot == 'skirt':
        sp = lambda: (c.new_path(), c.move_to(-P['ww'] - 2, hip - 12), c.line_to(P['ww'] + 2, hip - 12), c.line_to(P['ww'] + 26, hip + 64), c.line_to(-P['ww'] - 26, hip + 64), c.close_path())
        shade(c, sp, lambda: c.rectangle(14, hip - 20, 80, 120), bc, darker(bc))
        for x in (-30, -12, 8, 26): c.new_path(); c.move_to(x*0.8, hip - 6); c.line_to(x*1.25, hip + 62); stroke(c, 2, darker(bc, 0.6))
    elif bot == 'shorts':
        for s in (-1, 1):
            shade(c, lambda: (c.new_path(), c.move_to(s*2, hip - 14), c.line_to(s*(P['ww'] + 4), hip - 14), c.line_to(s*(P['ww'] + 8), hip + 62), c.line_to(s*4, hip + 62), c.close_path()),
                  lambda: c.rectangle(10, hip - 20, 80, 100), bc, darker(bc))
    elif bot == 'breeches':
        for s in (-1, 1):
            shade(c, lambda: (c.new_path(), c.move_to(s*2, hip - 10), c.line_to(s*(P['ww'] + 2), hip - 10), c.line_to(s*(P['lx'] + P['lw']/2 + 4), -170), c.line_to(s*(P['lx'] - P['lw']/2 - 4), -170), c.close_path()),
                  lambda: c.rectangle(10, hip - 20, 80, 200), bc, darker(bc))
            if d.get('trim'): rrect(c, s*P['lx'] - P['lw']/2 - 5, -178, P['lw'] + 10, 10, 3); fs(c, d['trim'], 1.8)
    elif bot == 'pants' and P['adult']:
        pass
    # 頸
    rrect(c, -P['R']*0.22, P['neck'] - 2, P['R']*0.44, sh - P['neck'] + 14, 6); fs(c, darker(skin, 0.88), 2.6)

def sleeve_cols(d):
    s = d['sleeve']; skin = SKIN[d['skin']]; tc = d['topc']
    if s == 'long': return tc, tc
    if s in ('short', 'puff'): return tc, skin
    return skin, skin

def arm(c, d, P, side, hand, grip=False, hang=None):
    sx, sy = side*(P['sw'] - 8), P['sh'] + 6
    (ex, ey), (hx, hy) = ik(sx, sy, hand[0], hand[1], P['ua'], P['fa'], side)
    uc, fc = sleeve_cols(d); skin = SKIN[d['skin']]
    seg(c, sx, sy, ex, ey, P['aw'], uc)
    seg(c, ex, ey, hx, hy, P['aw'] - 2, fc)
    if d['sleeve'] == 'puff':
        c.new_path(); c.arc(sx, sy + 6, P['aw']*0.85, 0, 6.3); fs(c, d['topc'], 2.6)
    if d['sleeve'] == 'short':
        c.save(); c.translate(sx, sy); c.rotate(math.atan2(-(ex - sx), ey - sy)); rrect(c, -P['aw']*0.7, -8, P['aw']*1.4, P['ua']*0.55, 8); fs(c, d['topc'], 2.6); c.restore()
    if d['top'] == 'frock':  # 蕾絲袖口
        c.save(); c.translate(hx, hy); c.rotate(math.atan2(-(hx - ex), hy - ey))
        poly(c, [(-P['aw']*0.7, -P['hr'] - 4), (P['aw']*0.7, -P['hr'] - 4), (P['aw']*0.8, -P['hr'] + 6), (-P['aw']*0.8, -P['hr'] + 6)]); fs(c, hexc('fbfaf6'), 2)
        c.restore()
    if d['top'] == 'tunic' and side < 0:
        pass
    mitten(c, hx, hy, P['hr'], skin, ang=math.atan2(-(hx - ex), hy - ey) + (0 if side > 0 else 0), grip=grip)
    return (hx, hy)

def default_hand(P, side, pose, t):
    sw, sh = P['sw'], P['sh']; L = P['ua'] + P['fa']
    sway = math.sin(t*2.1 + side)*2
    if pose == 'wave' and side > 0:
        return (sw + 70, sh - 70 + math.sin(t*9)*12)
    if pose == 'cheer':
        return (side*(sw + 50), sh - L*0.85)
    if pose == 'point' and side > 0:
        return (sw + L*0.92, sh - 10)
    if pose == 'present' and side > 0:
        return (sw + L*0.5, sh + L*0.62)
    if pose == 'chin' and side > 0:      # 托腮
        return (P['R']*0.2, P['hy'] + P['R']*1.05)
    if pose == 'hips':
        return (side*(sw + 22), P['hip'] - 10)
    return (side*(sw + 16) + sway*0.3, sh + L*0.99)

def draw(c, name, t=0.0, pose='idle', expr='happy', mouth=0.0, blink=False, mouth_mode='vector', hands=None, grips=(), x=0, y=0, scale=1.0, under_hands=None, feet=None):
    """feet: {-1:(x,y), 1:(x,y)} 腳踝位置（角色座標）。hands: {-1:(x,y), 1:(x,y)} 角色座標（螢幕左=-1、右=+1）。under_hands(c): 在手臂之前畫的道具。"""
    d = CAST[name]
    c.save(); c.translate(x, y); c.scale(scale, scale)
    if d.get('robot'):
        robot(c, t, pose, mouth, blink, mouth_mode, hands, under_hands); c.restore(); return
    P = d['P']; ex = EXPR[expr]
    bob = math.sin(t*2.1)*1.5
    if d.get('violin'):   # 背後琴盒
        c.save(); c.translate(-P['sw'] - 6, P['sh'] - 30); c.rotate(-0.35)
        vp = lambda: (c.new_path(), c.move_to(0, -30), c.curve_to(30, -34, 34, 30, 22, 60), c.curve_to(34, 90, 40, 160, 0, 170), c.curve_to(-40, 160, -34, 90, -22, 60), c.curve_to(-34, 30, -30, -34, 0, -30), c.close_path())
        shade(c, vp, lambda: c.rectangle(6, -40, 60, 240), hexc('5a3424'), hexc('442618')); c.restore()
    legs(c, d, P, t, feet)
    c.save(); c.translate(0, bob*0.4)
    if d['hair'] in ('pony', 'bob', 'wild', 'wig'):
        c.save(); c.translate(0, P['hy']); hair_back(c, d, P['R']); c.restore()
    outfit(c, d, P, t)
    c.save(); c.translate(0, P['hy'] + bob*0.3); c.rotate(math.sin(t*0.9)*0.02 + ex.get('tilt', 0))
    head(c, d, P['R'], ex, mouth, blink, mouth_mode, t, P['adult'])
    c.restore()
    if under_hands: under_hands(c)
    hp = {}
    for side in (-1, 1):
        target = (hands or {}).get(side) or default_hand(P, side, pose, t)
        hp[side] = arm(c, d, P, side, target, grip=(side in grips))
    c.restore(); c.restore()
    return hp

def robot(c, t, pose, mouth, blink, mouth_mode, hands, under_hands):
    W_, G_, D_ = hexc('f2f4f6'), hexc('b8c2cc'), hexc('2a3340')
    bob = math.sin(t*2.6)*2
    for s in (-1, 1):
        seg(c, s*20, -150, s*22, -26, 22, G_)
        shade(c, lambda: rrect(c, s*22 - 24, -30, 48, 30, 12), lambda: c.rectangle(s*22, -32, 30, 4), W_, darker(W_, 0.8))
    c.save(); c.translate(0, bob)
    # 背包（從兩側露出）
    rrect(c, -78, -320, 156, 150, 24); fs(c, hexc('f08a3a'))
    shade(c, lambda: rrect(c, -64, -330, 128, 190, 40), lambda: c.rectangle(18, -340, 80, 220), W_, darker(W_, 0.85))
    for s in (-1, 1): c.new_path(); c.move_to(s*44, -326); c.line_to(s*40, -190); stroke(c, 10, hexc('d8702a'))
    rrect(c, -30, -280, 60, 50, 8); fs(c, hexc('dfe6ec'), 2.6)
    for i, col in enumerate(('5ad0e6', 'f2c53d', 'e85a5a')): c.new_path(); c.arc(-16 + i*16, -255, 6, 0, 6.3); fs(c, hexc(col), 1.8)
    rrect(c, -12, -350, 24, 26, 6); fs(c, G_, 2.6)
    # 頭
    hy = -420
    c.new_path(); c.move_to(0, hy - 72); c.line_to(0, hy - 108); stroke(c, 4)
    c.new_path(); c.arc(0, hy - 114, 10, 0, 6.3); fs(c, hexc('e85a5a') if (t*2) % 1 < 0.6 else hexc('ff9a8a'), 2.4)
    shade(c, lambda: rrect(c, -88, hy - 74, 176, 142, 46), lambda: c.rectangle(34, hy - 90, 90, 180), W_, darker(W_, 0.86))
    rrect(c, -68, hy - 52, 136, 98, 30); fs(c, D_, 3)
    for s in (-1, 1):
        if blink: c.new_path(); c.move_to(s*30 - 12, hy - 6); c.line_to(s*30 + 12, hy - 6); stroke(c, 5, hexc('5ad0e6'))
        else: rrect(c, s*30 - 10, hy - 26, 20, 36, 10); c.set_source_rgba(*hexc('5ad0e6')); c.fill()
    m = 0 if mouth_mode == 'none' else mouth
    if isinstance(m, (str, tuple, dict)):
        m = mouth_params(m)['h']/0.40
    for i in range(5):
        hh = 4 + m*22*(0.5 + 0.5*math.sin(i*1.7 + t*20)) if m > 0.05 else 4
        rrect(c, -26 + i*12, hy + 26 - hh/2, 8, hh, 3); c.set_source_rgba(*hexc('5ad0e6')); c.fill()
    # 耳機
    c.new_path(); c.move_to(-92, hy - 10); c.curve_to(-96, hy - 110, 96, hy - 110, 92, hy - 10); stroke(c, 10, hexc('3a6fd0'))
    for s in (-1, 1): shade(c, lambda: rrect(c, s*94 - 18, hy - 36, 36, 62, 14), lambda: c.rectangle(s*94, hy - 40, 20, 70), hexc('3a6fd0'), darker(hexc('3a6fd0')))
    if under_hands: under_hands(c)
    P = dict(sw=60, sh=-318, ua=60, fa=56, aw=22, hr=15, hip=-150, R=60, hy=hy)
    for side in (-1, 1):
        L = 116
        tgt = (hands or {}).get(side)
        if tgt is None:
            if pose == 'wave' and side > 0: tgt = (130, -400 + math.sin(t*9)*12)
            elif pose == 'present' and side > 0: tgt = (150, -260)
            elif pose == 'cheer': tgt = (side*110, -440)
            else: tgt = (side*70, -205)
        sx, sy = side*58, -300
        (ex_, ey_), (hx, hy_) = ik(sx, sy, tgt[0], tgt[1], 60, 56, side)
        seg(c, sx, sy, ex_, ey_, 20, G_); seg(c, ex_, ey_, hx, hy_, 20, G_)
        c.new_path(); c.arc(hx, hy_, 15, 0, 6.3); fs(c, W_, 2.8)
    c.restore()
