import cairo, math, random

W, H, FPS = 1920, 1080, 30
LINE = (0.17, 0.11, 0.09)
FONT = "Comic Relief"

def hexc(h, a=1):
    h = h.lstrip('#'); return (int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255, a)
def clamp(x, a=0, b=1): return max(a, min(b, x))
def ease(t): t = clamp(t); return t*t*(3-2*t)
def back_out(t):
    t = clamp(t); c = 2.2; return 1 + (c+1)*(t-1)**3 + c*(t-1)**2
def lerp(a, b, t): return a + (b-a)*t
def S(s): return max(s, 0.001)

def rrect(c, x, y, w, h, r):
    r = min(r, w/2, h/2); c.new_sub_path()
    c.arc(x+w-r, y+r, r, -math.pi/2, 0); c.arc(x+w-r, y+h-r, r, 0, math.pi/2)
    c.arc(x+r, y+h-r, r, math.pi/2, math.pi); c.arc(x+r, y+r, r, math.pi, 3*math.pi/2); c.close_path()
def poly(c, pts):
    c.move_to(*pts[0]); [c.line_to(*p) for p in pts[1:]]; c.close_path()
def stroke(c, w=3.2, col=LINE):
    c.set_source_rgb(*col[:3]); c.set_line_width(w); c.set_line_join(1); c.set_line_cap(1); c.stroke()
def fs(c, col, lw=3.2):
    c.set_source_rgba(*col); c.fill_preserve(); stroke(c, lw)
def shade(c, path_fn, shadow_fn, base, dark, lw=3.2):
    path_fn(); c.set_source_rgba(*base); c.fill_preserve()
    c.save(); c.clip(); shadow_fn(); c.set_source_rgba(*dark); c.fill(); c.restore()
    path_fn(); stroke(c, lw)
def darker(col, k=0.78): return (col[0]*k, col[1]*k, col[2]*k, col[3] if len(col) > 3 else 1)

def font(c, size, bold=True):
    c.select_font_face(FONT, 0, 1 if bold else 0); c.set_font_size(size)
def text_c(c, txt, x, y, size, col=LINE, bold=True):
    font(c, size, bold); e = c.text_extents(txt)
    c.move_to(x - e.width/2 - e.x_bearing, y); c.set_source_rgba(*(col if len(col) == 4 else (*col, 1))); c.show_text(txt)
def wrap(c, txt, size, maxw, bold=True):
    font(c, size, bold); words = txt.split(); lines = []; cur = ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if c.text_extents(t).x_advance > maxw and cur: lines.append(cur); cur = w_
        else: cur = t
    if cur: lines.append(cur)
    return lines

# ======================= CHARACTERS =======================
SKINS = dict(a=hexc('e8b894'), b=hexc('c98d68'), c=hexc('8d5a3b'), d=hexc('f1cdb0'), e=hexc('6b4430'))
CAST = {
    'you':   dict(skin='b', hair='short', hair_col=hexc('2b1f1a'), shirt=hexc('e9e2d2'), jacket=hexc('3f6f8f'), pants=hexc('3a3f4c'), shoes=hexc('2d2a2a'), stubble=True),
    'mom':   dict(skin='b', hair='bun', hair_col=hexc('3a2a22'), shirt=hexc('b65a4a'), dress=True, pants=hexc('6a3a34'), shoes=hexc('3b2a26'), female=True),
    'dad':   dict(skin='b', hair='short', hair_col=hexc('4a4a4a'), shirt=hexc('7a8f6a'), pants=hexc('4a4038'), shoes=hexc('3b2a26'), mustache=True, stubble=True),
    'boss':  dict(skin='d', hair='slick', hair_col=hexc('1e1a1a'), shirt=hexc('f2efe8'), jacket=hexc('2a2a36'), tie=hexc('a8322c'), pants=hexc('2a2a36'), shoes=hexc('1a1616'), mustache=True),
    'rich':  dict(skin='d', hair='bald', hair_col=hexc('9a9a9a'), shirt=hexc('f2efe8'), jacket=hexc('3a2050'), tie=hexc('d8b45a'), pants=hexc('3a2050'), shoes=hexc('1a1616'), mustache=True, tophat=True, chubby=True),
    'hero':  dict(skin='c', hair='short', hair_col=hexc('1e1715'), shirt=hexc('c9a46a'), pants=hexc('5a4a3a'), shoes=hexc('4a3426'), patched=True),
    'friend1': dict(skin='a', hair='curly', hair_col=hexc('7a3e22'), shirt=hexc('d9a23e'), pants=hexc('3a4a5c'), shoes=hexc('f0f0f0')),
    'friend2': dict(skin='c', hair='long', hair_col=hexc('1e1715'), shirt=hexc('6a8fb8'), dress=False, pants=hexc('2e2e3a'), shoes=hexc('2d2a2a'), female=True),
    'boone': dict(skin='b', hair='short', hair_col=hexc('2b1f1a'), shirt=hexc('8f6a4a'), jacket=hexc('3a2a2a'), pants=hexc('4a3a30'), shoes=hexc('3b2a1e'), mustache=True, stubble=True, stetson=hexc('2a1f1b'), bandana=hexc('a8322c'), holster=True),
    'ruth':  dict(skin='a', hair='long', hair_col=hexc('8a3a22'), shirt=hexc('e2d6bc'), jacket=hexc('6a4a2c'), pants=hexc('5a4a3a'), shoes=hexc('3b2a1e'), female=True, stetson=hexc('8a6a4a'), band=hexc('3a2a22'), holster=True),
    'pip':   dict(skin='d', hair='curly', hair_col=hexc('c89a4a'), shirt=hexc('6a8fb8'), pants=hexc('8a7a5a'), shoes=hexc('6a4a2a'), bandana=hexc('d8b45a')),
    'sheriff': dict(skin='c', hair='short', hair_col=hexc('d0d0d0'), shirt=hexc('e8e0cc'), jacket=hexc('5a5a3a'), pants=hexc('3a3a40'), shoes=hexc('2a2220'), mustache=True, stetson=hexc('d8c8a0'), band=hexc('6a4a2a'), holster=True, star=True),
    'kid':   dict(skin='b', hair='short', hair_col=hexc('2b1f1a'), shirt=hexc('e8c34a'), pants=hexc('3a5a8a'), shoes=hexc('d84a3a'), chibi=True),
    'worker': dict(skin='b', hair='short', hair_col=hexc('3a2a22'), shirt=hexc('4a6a9a'), pants=hexc('3a3a44'), shoes=hexc('2d2a2a'), mustache=True, stubble=True, cap=hexc('c9a23a')),
}

POSES = {
    'idle':  dict(ba1=0.12, ba2=-0.12, fa1=-0.12, fa2=0.12),
    'hips':  dict(ba1=0.38, ba2=-1.25, fa1=-0.38, fa2=1.25),
    'cross': dict(ba1=-0.25, ba2=-1.75, fa1=0.25, fa2=1.75, both_front=True),
    'point': dict(ba1=0.12, ba2=-0.12, fa1=-1.75, fa2=0.15),
    'shrug': dict(ba1=0.9, ba2=-1.7, fa1=-0.9, fa2=1.7),
    'think': dict(ba1=-0.25, ba2=-1.75, fa1=-0.35, fa2=2.75, both_front=True),
    'wave':  dict(ba1=0.12, ba2=-0.12, fa1=-2.6, fa2=0.35),
    'up':    dict(ba1=2.6, ba2=-0.35, fa1=-2.6, fa2=0.35),
    'sad':   dict(ba1=0.05, ba2=-0.05, fa1=-0.05, fa2=0.05),
    'hold':  dict(ba1=0.12, ba2=-0.12, fa1=-0.55, fa2=1.6),
    'present': dict(ba1=0.12, ba2=-0.12, fa1=-1.2, fa2=-0.3),
}
EXPR = {
    'neutral': dict(brow=0, smile=0, look=0),
    'happy':   dict(brow=-3, smile=6, look=0),
    'worried': dict(brow=-6, smile=-4, look=0, tilt=1),
    'angry':   dict(brow=6, smile=-3, look=0),
    'sly':     dict(brow=4, smile=5, look=2),
    'think':   dict(brow=-4, smile=-1, look=3),
    'sad':     dict(brow=-7, smile=-6, look=-1),
    'shock':   dict(brow=-9, smile=0, look=0, mouth_o=True),
}

def arm(c, sx, sy, a1, a2, col, dcol, skin, ua=88, fa=80, w=26):
    c.save(); c.translate(sx, sy); c.rotate(a1)
    shade(c, lambda: rrect(c, -w/2, -6, w, ua+8, w/2), lambda: c.rectangle(w*0.15, -10, w, ua+30), col, dcol)
    c.translate(0, ua-4); c.rotate(a2)
    shade(c, lambda: rrect(c, -w/2+1, -6, w-2, fa, w/2-1), lambda: c.rectangle(w*0.12, -10, w, fa+20), col, dcol)
    c.arc(0, fa+4, 13.5, 0, 6.3); fs(c, skin)
    c.restore()

def head(c, d, t, ex, blink, chibi=False):
    skin = SKINS[d['skin']]; sd = darker(skin, 0.84); hc = d['hair_col']
    R = 1.0
    # back hair (long / bun)
    if d['hair'] == 'long':
        rrect(c, -46, -48, 92, 120, 40); fs(c, hc)
    if d['hair'] == 'bun':
        c.arc(0, -62, 22, 0, 6.3); fs(c, hc)
    for s in (-1, 1):
        c.save(); c.translate(s*38, 4); c.scale(0.6, 1); c.arc(0, 0, 13, 0, 6.3); c.restore(); fs(c, skin)
    if chibi:
        face = lambda: (c.new_sub_path(), c.arc(0, 0, 50, 0, 6.3))
    elif d.get('female'):
        face = lambda: (c.move_to(-37, -30), c.curve_to(-40, 10, -32, 36, -12, 50), c.curve_to(-4, 55, 4, 55, 12, 50),
                        c.curve_to(32, 36, 40, 10, 37, -30), c.curve_to(30, -62, -30, -62, -37, -30), c.close_path())
    else:
        face = lambda: (c.move_to(-38, -30), c.curve_to(-42, 10, -36, 34, -16, 52), c.curve_to(-6, 60, 6, 60, 16, 52),
                        c.curve_to(36, 34, 42, 10, 38, -30), c.curve_to(30, -62, -30, -62, -38, -30), c.close_path())
    shade(c, face, lambda: (c.move_to(14, -70), c.curve_to(30, 0, 30, 30, 8, 70), c.line_to(60, 70), c.line_to(60, -70), c.close_path()), skin, sd)
    if d.get('stubble'):
        c.save(); face(); c.clip()
        c.move_to(-40, 12); c.curve_to(-30, 30, -20, 40, 0, 42); c.curve_to(20, 40, 30, 30, 40, 12)
        c.line_to(40, 70); c.line_to(-40, 70); c.close_path(); c.set_source_rgba(0.2, 0.14, 0.11, 0.35); c.fill(); c.restore()
    if d.get('mustache'):
        c.move_to(-20, 26); c.curve_to(-10, 18, 10, 18, 20, 26)
        c.set_source_rgba(*hc); c.set_line_width(7); c.set_line_cap(1); c.stroke()
    if not chibi:
        poly(c, [(2, -6), (10, 14), (-2, 16)]); c.set_source_rgba(*sd); c.fill()
    # eyes
    for s in (-1, 1):
        ex_ = s*16
        if blink:
            c.move_to(ex_-8, -6); c.line_to(ex_+8, -6); stroke(c, 3)
        elif chibi:
            c.arc(ex_+ex.get('look', 0), -4, 5, 0, 6.3); c.set_source_rgb(*LINE); c.fill()
        else:
            c.save(); c.translate(ex_, -6); c.scale(1.4, 1); c.arc(0, 0, 5.5, 0, 6.3); c.restore(); c.set_source_rgb(0.98, 0.95, 0.9); c.fill()
            c.arc(ex_+1.5+ex.get('look', 0), -6, 3.6, 0, 6.3); c.set_source_rgb(*LINE); c.fill()
            if d.get('female'):
                c.move_to(ex_-9, -10); c.line_to(ex_+9 if s > 0 else ex_+8, -11); stroke(c, 2.6)
        b = ex.get('brow', 0)
        inner = b if b > 0 else b*0.4
        outer = 0 if b > 0 else b
        by = -21
        x_in, x_out = ex_ - s*11, ex_ + s*12
        c.move_to(x_out, by + outer*0.6); c.line_to(x_in, by + inner*0.6 + (2 if b > 0 else -2 if b < 0 else 0))
        c.set_source_rgba(*hc); c.set_line_width(5 if d.get('female') or chibi else 7); c.set_line_cap(1); c.stroke()
    if d.get('glasses'):
        for s in (-1, 1): c.new_sub_path(); c.arc(s*16, -6, 11, 0, 6.3)
        stroke(c, 2.6)
    # mouth
    sm = ex.get('smile', 0)
    if ex.get('mouth_o'):
        c.save(); c.translate(0, 36); c.scale(0.8, 1); c.arc(0, 0, 7, 0, 6.3); c.restore(); c.set_source_rgb(0.35, 0.12, 0.1); c.fill()
    else:
        c.move_to(-10, 35); c.curve_to(-4, 35+sm, 4, 35+sm, 10, 35 - (0 if sm >= 0 else 0))
        stroke(c, 3)
    if d.get('female'):
        pass
    # hair top
    hs = d['hair']
    if hs in ('short', 'curly', 'slick', 'long', 'bun'):
        c.new_path()
        if hs == 'curly':
            for i in range(9):
                a = math.pi + i*math.pi/8; c.new_sub_path(); c.arc(42*math.cos(a), -22 + 38*math.sin(a), 15, 0, 6.3)
            c.set_source_rgba(*hc); c.fill_preserve(); stroke(c, 2.5)
        else:
            top = lambda: (c.move_to(-41, -14), c.curve_to(-46, -64, 46, -72, 41, -14),
                           c.curve_to(30, -36 if hs != 'slick' else -40, -10, -44, -36, -26) if hs != 'long' and hs != 'bun' else c.curve_to(20, -46, -20, -46, -41, -14),
                           c.close_path())
            shade(c, top, lambda: c.rectangle(14, -80, 40, 80), hc, darker(hc, 0.75), 2.8)
    elif hs == 'bald':
        c.move_to(-38, -18); c.curve_to(-40, -6, -40, 4, -38, 10); c.set_source_rgba(*hc); c.set_line_width(8); c.stroke()
        c.move_to(38, -18); c.curve_to(40, -6, 40, 4, 38, 10); c.stroke()
    if d.get('cap'):
        shade(c, lambda: (c.move_to(-42, -24), c.curve_to(-44, -72, 44, -72, 42, -24), c.close_path()), lambda: c.rectangle(14, -80, 40, 60), d['cap'], darker(d['cap']))
        poly(c, [(-44, -24), (66, -24), (60, -14), (-44, -16)]); fs(c, darker(d['cap'], 0.8))
    if d.get('stetson'):
        hc2 = d['stetson']
        c.save(); c.translate(0, -38)
        shade(c, lambda: (c.move_to(-34, 0), c.curve_to(-36, -40, -26, -62, 0, -54), c.curve_to(26, -62, 36, -40, 34, 0), c.close_path()),
                 lambda: c.rectangle(10, -80, 40, 90), hc2, darker(hc2, 0.75))
        c.move_to(-34, -12); c.line_to(34, -12); c.set_source_rgba(*d.get('band', hexc('8a6a4a'))); c.set_line_width(8); c.stroke()
        shade(c, lambda: (c.move_to(-86, -2), c.curve_to(-60, 12, 60, 12, 86, -2), c.curve_to(92, 8, 70, 16, 0, 18),
                          c.curve_to(-70, 16, -92, 8, -86, -2), c.close_path()), lambda: c.rectangle(-100, 10, 200, 20), hc2, darker(hc2, 0.75))
        c.restore()
    if d.get('tophat'):
        c.save(); c.translate(0, -40); c.rotate(-0.08)
        rrect(c, -64, -6, 128, 14, 6); fs(c, hexc('1c1a22'))
        rrect(c, -38, -82, 76, 80, 6); fs(c, hexc('1c1a22'))
        c.rectangle(-38, -22, 76, 12); c.set_source_rgba(*hexc('a8322c')); c.fill(); c.restore()

def character(c, name, t, pose='idle', expr='neutral', blink=False, flip=False, pose2=None, k=0.0, seed=0):
    d = CAST[name]
    p = dict(POSES[pose]);
    if pose2:
        q = POSES[pose2]
        for key in ('ba1', 'ba2', 'fa1', 'fa2'): p[key] = lerp(p[key], q[key], k)
        if k > 0.5: p['both_front'] = q.get('both_front', False)
    ex = EXPR[expr]
    c.save()
    if flip: c.scale(-1, 1)
    chibi = d.get('chibi')
    if chibi: c.scale(0.62, 0.62)
    ph = seed*1.7
    breathe = math.sin(t*2.1+ph)*0.012; bob = math.sin(t*2.1+0.6+ph)*1.6
    skin = SKINS[d['skin']]
    wid = 1.25 if d.get('chubby') else 1.0
    legh = 150 if chibi else 230
    # legs
    for lx in (-24, 24):
        shade(c, lambda: (c.move_to(lx-22*wid, -legh), c.line_to(lx+22*wid, -legh), c.line_to(lx+19, -26), c.line_to(lx-19, -26), c.close_path()),
                 lambda: c.rectangle(lx+6, -legh-10, 34, legh), d['pants'], darker(d['pants']))
        rrect(c, lx-22 + (0 if lx > 0 else -8), -30, 46, 30, 12); fs(c, d['shoes'])
    c.save(); c.translate(0, -legh+2); c.scale(1+breathe, 1+breathe); c.translate(0, bob*0.3)
    shirt = d['shirt']; jacket = d.get('jacket')
    sleeve = jacket or shirt
    if not p.get('both_front'):
        arm(c, -52*wid, -150, p['ba1'], p['ba2'], sleeve, darker(sleeve), skin)
    # torso
    tw = 56*wid
    body = lambda: (c.move_to(-tw, -168), c.curve_to(-tw-4, -100, -tw+6, -40, -tw+10, 6), c.line_to(tw-10, 6),
                    c.curve_to(tw-6, -40, tw+4, -100, tw, -168), c.curve_to(30, -182, -30, -182, -tw, -168), c.close_path())
    if d.get('dress'):
        shade(c, lambda: (c.move_to(-tw, -168), c.curve_to(-tw-4, -100, -tw+6, -40, -tw-24, 120), c.line_to(tw+24, 120),
                          c.curve_to(tw-6, -40, tw+4, -100, tw, -168), c.curve_to(30, -182, -30, -182, -tw, -168), c.close_path()),
                 lambda: c.rectangle(18, -200, 90, 340), shirt, darker(shirt))
    else:
        shade(c, body, lambda: c.rectangle(18, -200, 90, 230), shirt, darker(shirt))
    if d.get('patched'):
        rrect(c, -34, -70, 24, 22, 3); fs(c, hexc('8a6a44'), 2.4)
    if d.get('tie'):
        poly(c, [(-8, -168), (8, -168), (12, -60), (0, -44), (-12, -60)]); fs(c, d['tie'], 2.6)
    if jacket:
        for s in (-1, 1):
            if s < 0:
                shade(c, lambda: (c.move_to(-tw-2, -166), c.curve_to(-tw-6, -100, -tw+4, -40, -tw+8, 10), c.line_to(-14, 10), c.line_to(-16, -70), c.line_to(-26, -170), c.close_path()),
                         lambda: c.rectangle(0, 0, 0, 0), jacket, darker(jacket))
            else:
                shade(c, lambda: (c.move_to(tw+2, -166), c.curve_to(tw+6, -100, tw-4, -40, tw-8, 10), c.line_to(14, 10), c.line_to(16, -70), c.line_to(26, -170), c.close_path()),
                         lambda: c.rectangle(0, -200, 90, 230), jacket, darker(jacket))
    if not d.get('dress'):
        rrect(c, -tw+8, -4, 2*tw-16, 14, 3); fs(c, hexc('3a2a22'), 2.6)
    # neck
    rrect(c, -15, -194, 30, 30, 8); fs(c, darker(skin, 0.86))
    if d.get('tie') or jacket:
        poly(c, [(-24, -176), (0, -150), (24, -176), (0, -168)]); fs(c, shirt, 2.6)
    if d.get('bandana'):
        poly(c, [(-32, -176), (32, -176), (0, -142)]); fs(c, d['bandana'], 2.6)
        rrect(c, -34, -184, 68, 15, 7); fs(c, d['bandana'], 2.6)
    if d.get('holster'):
        shade(c, lambda: (c.move_to(-tw-4, 12), c.line_to(-tw+20, 12), c.line_to(-tw+22, 76), c.line_to(-tw+2, 82), c.close_path()),
                 lambda: c.rectangle(-tw+10, 0, 20, 90), hexc('7a4a2c'), hexc('5e3820'))
        rrect(c, -tw-2, -6, 14, 26, 4); fs(c, hexc('2b2b2e'))
    if d.get('star'):
        star_ = [(0 + (14 if i % 2 == 0 else 6)*math.cos(-math.pi/2 + i*math.pi/5) + 30, -120 + (14 if i % 2 == 0 else 6)*math.sin(-math.pi/2 + i*math.pi/5)) for i in range(10)]
        poly(c, star_); fs(c, hexc('e8c04a'), 2.2)
    # head
    c.save(); hy = -238 + bob*0.5
    if chibi: c.translate(0, -175); c.scale(1.9, 1.9); c.translate(0, -40)
    else: c.translate(0, hy)
    tilt = ex.get('tilt', 0)*0.06
    c.rotate(math.sin(t*0.9+ph)*0.025 + tilt)
    head(c, d, t, ex, blink, chibi)
    c.restore()
    if p.get('both_front'):
        arm(c, -52*wid, -150, p['ba1'], p['ba2'], sleeve, darker(sleeve), skin)
    arm(c, 52*wid, -150, p['fa1'], p['fa2'], sleeve, darker(sleeve), skin)
    c.restore()
    c.restore()

# ======================= ENVIRONMENT =======================
random.seed(7)
STARS = [(random.random()*W*1.4 - 100, random.random()*420, random.random()) for _ in range(80)]
DUST = [(random.random()*W, random.random()*H, random.uniform(1.2, 3.2), random.random()*6.3, random.uniform(8, 22)) for _ in range(90)]

MOODS = {
    'dusk':  dict(sky=('3d2a5c', 'c4566a', 'f6a65a'), far='7d4a72', near='a65a6a', city='4a2e52', win='f6c46d', light=(1, 0.72, 0.4), dust=(1, 0.88, 0.65)),
    'night': dict(sky=('0f1430', '1d2550', '34407a'), far='1c2448', near='252f5c', city='161c3a', win='f2c46d', light=(0.8, 0.85, 1), dust=(0.8, 0.85, 1)),
    'day':   dict(sky=('6fa8de', 'a9d0ef', 'dcecf6'), far='8aa6c2', near='a9bfd4', city='7f97b3', win='e6f0f8', light=(1, 0.97, 0.85), dust=(1, 1, 0.9)),
    'gold':  dict(sky=('5a3a6a', 'e07a5a', 'ffc870'), far='9a5a6a', near='c47a6a', city='5e3a50', win='ffd88a', light=(1, 0.8, 0.5), dust=(1, 0.9, 0.7)),
}

def sky(c, m):
    a, b, d = m['sky']; g = cairo.LinearGradient(0, 0, 0, H*0.8)
    g.add_color_stop_rgba(0, *hexc(a)); g.add_color_stop_rgba(0.55, *hexc(b)); g.add_color_stop_rgba(1, *hexc(d))
    c.set_source(g); c.paint()
def glow(c, x, y, r, col, a=0.55, k=5):
    g = cairo.RadialGradient(x, y, r*0.4, x, y, r*k)
    g.add_color_stop_rgba(0, col[0], col[1], col[2], a); g.add_color_stop_rgba(1, col[0], col[1], col[2], 0)
    c.set_source(g); c.paint()
def sun(c, x, y, r, m, moon=False):
    glow(c, x, y, r, m['light'])
    c.arc(x, y, r, 0, 6.3); c.set_source_rgba(1, 0.95, 0.8 if not moon else 0.92, 1); c.fill()
def cloud(c, x, y, s, col):
    c.save(); c.translate(x, y); c.scale(s, s)
    for dx, dy, r in ((0, 0, 40), (45, -18, 48), (95, -6, 38), (135, 6, 28), (-35, 8, 26)): c.new_sub_path(); c.arc(dx, dy, r, 0, 6.3)
    c.rectangle(-60, 6, 220, 30); c.set_source_rgba(*col); c.fill(); c.restore()
def stars(c, a=0.4):
    for x, y, s in STARS: c.arc(x, y, 1+s, 0, 6.3); c.set_source_rgba(1, 1, 1, a*s); c.fill()

random.seed(11)
SKYLINE = []
x = -300
while x < W + 400:
    w_ = random.randint(90, 200); h_ = random.randint(180, 480); SKYLINE.append((x, w_, h_, random.random())); x += w_ + random.randint(-10, 20)
SKYLINE2 = [(x + 60, w_ * 0.8, h_ * 0.7, r) for x, w_, h_, r in SKYLINE]

def skyline(c, base, m, t, far=False):
    col = hexc(m['far' if far else 'city'])
    for x, w_, h_, r in (SKYLINE2 if far else SKYLINE):
        hh = h_ * (0.75 if far else 1)
        c.rectangle(x, base - hh, w_, hh); c.set_source_rgba(*col); c.fill()
        if not far:
            random.seed(int(x))
            for wy in range(int(base - hh + 24), int(base - 20), 34):
                for wx in range(int(x + 14), int(x + w_ - 20), 30):
                    if random.random() < 0.38:
                        c.rectangle(wx, wy, 14, 18); c.set_source_rgba(*hexc(m['win'], 0.85)); c.fill()

def vignette(c, s=0.55):
    g = cairo.RadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*1.05)
    g.add_color_stop_rgba(0, 0, 0, 0, 0); g.add_color_stop_rgba(1, 0.05, 0.02, 0.05, s); c.set_source(g); c.paint()
def dust(c, t, col):
    for x, y, r, ph, sp in DUST:
        xx = (x + t*sp) % W; yy = (y - t*sp*0.6 + math.sin(t+ph)*12) % H
        a = 0.2 + 0.3*(0.5+0.5*math.sin(t*1.7+ph)); c.arc(xx, yy, r, 0, 6.3); c.set_source_rgba(col[0], col[1], col[2], a); c.fill()

# ---- interior pieces
def wall(c, col, floor_col, fy=800):
    g = cairo.LinearGradient(0, 0, 0, fy); g.add_color_stop_rgba(0, *darker(col, 0.8)); g.add_color_stop_rgba(1, *col)
    c.rectangle(0, 0, W, fy); c.set_source(g); c.fill()
    # wainscot
    c.rectangle(0, fy-150, W, 150); c.set_source_rgba(*darker(col, 0.86)); c.fill()
    c.move_to(0, fy-150); c.line_to(W, fy-150); stroke(c, 3, darker(col, 0.6))
    g = cairo.LinearGradient(0, fy, 0, H); g.add_color_stop_rgba(0, *floor_col); g.add_color_stop_rgba(1, *darker(floor_col, 0.7))
    c.rectangle(-300, fy, W+600, H); c.set_source(g); c.fill()
    for i in range(-4, 30):
        c.move_to(i*90, fy); c.line_to(i*90 - 260 + (i*90-W/2)*0.4, H); stroke(c, 2, darker(floor_col, 0.82))
    c.move_to(-300, fy); c.line_to(W+300, fy); stroke(c, 3)

def window(c, x, y, w, h, m, t, city=True):
    rrect(c, x-14, y-14, w+28, h+28, 6); fs(c, hexc('f0e6d6'))
    c.save(); rrect(c, x, y, w, h, 3); c.clip()
    c.translate(x, y); c.scale(w/W, h/(H*0.8))
    sky(c, m)
    if m is MOODS['night']: stars(c, 0.7); sun(c, W*0.75, 160, 60, m, True)
    else: sun(c, W*0.7, 420, 80, m)
    if city: skyline(c, H*0.8, m, t, True); skyline(c, H*0.8 + 40, m, t)
    c.restore()
    rrect(c, x, y, w, h, 3); stroke(c, 4)
    c.move_to(x + w/2, y); c.line_to(x + w/2, y + h); c.move_to(x, y + h/2); c.line_to(x + w, y + h/2); stroke(c, 7, hexc('f0e6d6'));
    rrect(c, x-24, y+h+10, w+48, 18, 4); fs(c, hexc('e2d6c4'))

def lamp(c, x, y, on=True):
    if on: glow(c, x, y-120, 60, (1, 0.85, 0.5), 0.45, 5)
    rrect(c, x-8, y-110, 16, 110, 4); fs(c, hexc('5a4a3a'))
    rrect(c, x-40, y-10, 80, 14, 6); fs(c, hexc('5a4a3a'))
    poly(c, [(x-55, y-110), (x+55, y-110), (x+34, y-180), (x-34, y-180)]); fs(c, hexc('f2d79a'))

def couch(c, x, y, col):
    rrect(c, x, y-170, 520, 120, 30); fs(c, darker(col, 0.85))
    rrect(c, x-20, y-90, 560, 70, 24); fs(c, col)
    for dx in (-40, 500): rrect(c, x+dx, y-140, 60, 120, 26); fs(c, darker(col, 0.9))
    for dx in (10, 490): rrect(c, x+dx, y-24, 20, 24, 4); fs(c, hexc('3a2a22'))

def desk(c, x, y):
    rrect(c, x, y-180, 560, 26, 6); fs(c, hexc('8a5a3a'))
    for dx in (20, 520): rrect(c, x+dx, y-156, 20, 156, 4); fs(c, hexc('6a4228'))
    rrect(c, x+180, y-360, 220, 150, 8); fs(c, hexc('2e3240'))
    rrect(c, x+192, y-348, 196, 126, 4); c.set_source_rgba(*hexc('7ab8e0')); c.fill()
    for i in range(4): c.rectangle(x+206, y-334+i*26, 120 - i*18, 10); c.set_source_rgba(1, 1, 1, 0.7); c.fill()
    rrect(c, x+276, y-210, 28, 30, 4); fs(c, hexc('2e3240'))
    rrect(c, x+440, y-232, 40, 52, 8); fs(c, hexc('e8e0d4'))  # mug

def table(c, x, y, w=700):
    rrect(c, x, y-200, w, 30, 8); fs(c, hexc('9a6a44'))
    for dx in (30, w-50): rrect(c, x+dx, y-170, 20, 170, 4); fs(c, hexc('6a4228'))

def plant(c, x, y):
    rrect(c, x-34, y-80, 68, 80, 8); fs(c, hexc('c4704a'))
    for a in (-0.9, -0.45, 0, 0.45, 0.9):
        c.save(); c.translate(x, y-78); c.rotate(a); c.scale(0.45, 1); c.arc(0, -60, 50, 0, 6.3); c.restore(); fs(c, hexc('5a8a4a'), 2.6)

def frame_pic(c, x, y, w, h, col):
    rrect(c, x, y, w, h, 4); fs(c, hexc('6a4a34')); rrect(c, x+10, y+10, w-20, h-20, 2); fs(c, col, 2)

def street(c, m, t):
    sky(c, m)
    if m is MOODS['night']: stars(c); sun(c, 1500, 180, 55, m, True)
    else: sun(c, 1250, 560, 75, m)
    cloud(c, 250 + t*6, 160, 1.1, (*hexc(m['near'])[:3], 0.45)); cloud(c, 1350 + t*4, 110, 1.3, (*hexc(m['near'])[:3], 0.4))
    skyline(c, 760, m, t, True); skyline(c, 790, m, t)

def ground_street(c):
    c.rectangle(-300, 790, W+600, 60); c.set_source_rgba(*hexc('8a8a90')); c.fill()
    c.move_to(-300, 790); c.line_to(W+300, 790); stroke(c, 3)
    g = cairo.LinearGradient(0, 850, 0, H); g.add_color_stop_rgba(0, *hexc('4a4a54')); g.add_color_stop_rgba(1, *hexc('2e2e36'))
    c.rectangle(-300, 850, W+600, H); c.set_source(g); c.fill()
    c.move_to(-300, 850); c.line_to(W+300, 850); stroke(c, 3)
    for i in range(-2, 14): rrect(c, i*190, 960, 100, 12, 4); c.set_source_rgba(0.95, 0.85, 0.5, 0.8); c.fill()

def streetlamp(c, x, on=True):
    if on: glow(c, x+40, 420, 50, (1, 0.85, 0.5), 0.5, 5)
    rrect(c, x-7, 420, 14, 380, 4); fs(c, hexc('2e2e36'))
    c.move_to(x, 430); c.curve_to(x, 400, x+30, 395, x+46, 405); stroke(c, 8, hexc('2e2e36'))
    rrect(c, x+28, 402, 36, 18, 6); fs(c, hexc('ffe0a0'))

def stage(c, t):
    c.set_source_rgba(*hexc('241a2a')); c.paint()
    glow(c, W/2, 500, 200, (1, 0.85, 0.6), 0.45, 4)
    g = cairo.LinearGradient(0, 820, 0, H); g.add_color_stop_rgba(0, *hexc('8a5a3a')); g.add_color_stop_rgba(1, *hexc('4a2e20'))
    c.rectangle(0, 820, W, H); c.set_source(g); c.fill(); c.move_to(0, 820); c.line_to(W, 820); stroke(c, 3)
    for s in (-1, 1):
        x0 = 0 if s < 0 else W
        for i in range(6):
            xx = x0 - s*(i*46) if s > 0 else i*46
            c.move_to(xx, 0); c.curve_to(xx + 30, 300, xx - 20, 600, xx + 10, 840); c.line_to(xx + 50, 840)
            c.curve_to(xx + 20, 600, xx + 70, 300, xx + 46, 0); c.close_path(); fs(c, hexc('9a2a2a') if i % 2 else hexc('7a1e22'), 2.5)
    for i in range(14):
        xx = i*150 - 20; c.move_to(xx, 0); c.curve_to(xx+40, 90, xx+110, 90, xx+150, 0); c.close_path(); fs(c, hexc('8a2226'), 2.5)

def plain(c, col1, col2):
    g = cairo.RadialGradient(W/2, H*0.45, 100, W/2, H/2, H*1.0)
    g.add_color_stop_rgba(0, *hexc(col1)); g.add_color_stop_rgba(1, *hexc(col2)); c.set_source(g); c.paint()

# ======================= OVERLAYS =======================
def pop(t, t0, d=0.28): return back_out((t - t0)/d)
def shadow_rect(c, x, y, w, h, r, a=0.3):
    c.save(); c.translate(6, 8); rrect(c, x, y, w, h, r); c.set_source_rgba(0, 0, 0, a); c.fill(); c.restore()

def tag(c, t, t0, x, y, title, sub=None, rot=-0.05):
    if t < t0: return
    s = pop(t, t0); c.save(); c.translate(x, y); c.rotate(rot); c.scale(S(s), S(s))
    font(c, 38); e = c.text_extents(title); w = max(e.width, 140) + 52; h = 92 if sub else 64
    shadow_rect(c, -w/2, -h/2, w, h, 14); rrect(c, -w/2, -h/2, w, h, 14); c.set_source_rgb(0.98, 0.97, 0.94); c.fill_preserve(); stroke(c, 4)
    text_c(c, title, 0, -6 if sub else 14, 38)
    if sub: text_c(c, sub, 0, 30, 20, (0.35, 0.3, 0.28), False)
    c.restore()

def stamp(c, t, t0, x, y, txt, rot=0.07, col=(0.78, 0.15, 0.13, 1), size=34):
    if t < t0: return
    s = back_out((t - t0)/0.22) if t - t0 < 0.22 else 1 + 0.0
    sc = lerp(2.2, 1, ease((t-t0)/0.18)) if t - t0 < 0.18 else 1
    a = clamp((t-t0)/0.12)
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc)
    font(c, size); e = c.text_extents(txt); w, h = e.width + 56, size*2
    rrect(c, -w/2, -h/2, w, h, 6); c.set_source_rgba(0.98, 0.95, 0.88, 0.95*a); c.fill()
    for o in (0, 7):
        rrect(c, -w/2 + o/2, -h/2 + o/2, w - o, h - o, 6); c.set_source_rgba(col[0], col[1], col[2], a); c.set_line_width(5 if o == 0 else 2.5); c.stroke()
    text_c(c, txt, 0, size*0.36, size, (col[0], col[1], col[2], a))
    c.restore()

def bubble(c, t, t0, t1, x, y, txt, tip=None, size=34, maxw=620, think=False, rot=-0.02):
    if t < t0 or t > t1 + 0.01: return
    s = pop(t, t0, 0.3) * (1 - ease((t - (t1 - 0.2))/0.2))
    lines = wrap(c, txt, size, maxw)
    font(c, size); lw = max(c.text_extents(l).x_advance for l in lines)
    w = lw + 80; h = len(lines)*size*1.3 + 46
    nch = int(len(txt) * clamp((t - t0)/min(1.2, (t1-t0)*0.4)))
    c.save(); c.translate(x, y); c.scale(S(s), S(s)); c.rotate(rot)
    if think:
        if tip:
            for i, r in enumerate((16, 11, 7)):
                fx = lerp(0, tip[0], 0.45 + i*0.2); fy = lerp(h/2, tip[1], 0.45 + i*0.2)
                c.new_sub_path(); c.arc(fx, fy, r, 0, 6.3); c.set_source_rgb(0.99, 0.99, 0.97); c.fill_preserve(); stroke(c, 3.5)
        shadow_rect(c, -w/2, -h/2, w, h, h/2, 0.2)
        rrect(c, -w/2, -h/2, w, h, min(h/2, 50)); c.set_source_rgb(0.99, 0.99, 0.97); c.fill_preserve(); stroke(c, 4)
    else:
        shadow_rect(c, -w/2, -h/2, w, h, min(h/2, 45), 0.2)
        if tip:
            bx = clamp(tip[0]*0.3, -w/2 + 50, w/2 - 80)
            c.move_to(bx - 26, h/2 - 6); c.line_to(tip[0], tip[1]); c.line_to(bx + 26, h/2 - 6); c.close_path()
            c.set_source_rgb(0.99, 0.99, 0.97); c.fill_preserve(); stroke(c, 4)
        rrect(c, -w/2, -h/2, w, h, min(h/2, 45)); c.set_source_rgb(0.99, 0.99, 0.97); c.fill_preserve(); stroke(c, 4)
        if tip:
            c.move_to(bx - 22, h/2 - 2); c.line_to(bx + 22, h/2 - 2); c.set_source_rgb(0.99, 0.99, 0.97); c.set_line_width(8); c.stroke()
    shown = 0; font(c, size)
    for i, l in enumerate(lines):
        part = l[:max(0, nch - shown)]; shown += len(l) + 1
        y0 = -h/2 + 23 + size*1.05 + i*size*1.3
        c.move_to(-lw/2, y0); c.set_source_rgb(*LINE); c.show_text(part)
    c.restore()

def caption(c, t, t0, t1, txt, y=960, size=46, col=(1, 1, 1)):
    """big bold explainer text on a dark ribbon (kinetic keyword)"""
    if t < t0 or t > t1: return
    s = pop(t, t0, 0.3) * (1 - ease((t - (t1 - 0.2))/0.2))
    lines = wrap(c, txt, size, 1400); font(c, size)
    lw = max(c.text_extents(l).x_advance for l in lines); h = len(lines)*size*1.25 + 34
    c.save(); c.translate(W/2, y); c.scale(S(s), S(s)); c.rotate(-0.012)
    rrect(c, -lw/2 - 36, -h/2, lw + 72, h, 12); c.set_source_rgba(0.1, 0.07, 0.1, 0.82); c.fill()
    for i, l in enumerate(lines): text_c(c, l, 0, -h/2 + 17 + size*0.95 + i*size*1.25, size, col)
    c.restore()

def card(c, t, t0, x, y, title, lines_, w=560, rot=-0.03, paper=True, t1=None):
    if t < t0 or (t1 and t > t1): return
    s = pop(t, t0, 0.32)
    if t1: s *= 1 - ease((t - (t1 - 0.2))/0.2)
    h = 110 + len(lines_)*56
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(S(s), S(s))
    shadow_rect(c, -w/2, -h/2, w, h, 10)
    rrect(c, -w/2, -h/2, w, h, 10); fs(c, hexc('f6ecd6') if paper else hexc('2f4a3a'), 4)
    if not paper: rrect(c, -w/2+14, -h/2+14, w-28, h-28, 6); stroke(c, 6, hexc('8a5a3a'))
    tc = LINE if paper else (0.97, 0.97, 0.92)
    text_c(c, title, 0, -h/2 + 62, 40, tc)
    c.move_to(-w/2 + 40, -h/2 + 82); c.line_to(w/2 - 40, -h/2 + 82); stroke(c, 2.5, tc)
    for i, l in enumerate(lines_):
        k = clamp((t - t0 - 0.35 - i*0.45)/0.25)
        if k <= 0: continue
        font(c, 30, False); c.move_to(-w/2 + 46, -h/2 + 136 + i*56); c.set_source_rgba(tc[0], tc[1], tc[2], k); c.show_text(l)
    c.restore()

def counter(c, t, t0, t1, x, y, a, b, prefix='$', size=96, col=(1, 0.86, 0.35)):
    if t < t0: return
    v = lerp(a, b, ease((t - t0)/max(0.5, (t1 - t0)*0.6)))
    s = pop(t, t0)
    txt = f"{prefix}{int(v):,}"
    c.save(); c.translate(x, y); c.scale(S(s), S(s))
    font(c, size); e = c.text_extents(txt)
    c.move_to(-e.width/2 - e.x_bearing + 5, 6); c.set_source_rgba(0, 0, 0, 0.45); c.show_text(txt)
    c.move_to(-e.width/2 - e.x_bearing, 0); c.set_source_rgb(*col); c.show_text(txt)
    c.restore()

def bigword(c, t, t0, x, y, txt, size=84, col=(1, 1, 1), rot=-0.03, t1=None):
    if t < t0 or (t1 and t > t1): return
    s = pop(t, t0)
    if t1: s *= 1 - ease((t - (t1 - 0.2))/0.2)
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(S(s), S(s))
    font(c, size); e = c.text_extents(txt)
    c.move_to(-e.width/2 - e.x_bearing + 5, 7); c.set_source_rgba(0, 0, 0, 0.45); c.show_text(txt)
    c.move_to(-e.width/2 - e.x_bearing, 0); c.set_source_rgba(*(col if len(col) == 4 else (*col, 1))); c.show_text(txt)
    c.restore()

def arrow_label(c, t, t0, x, y, tx, ty, txt):
    if t < t0: return
    k = ease((t - t0)/0.4)
    c.move_to(x, y + 14); ex, ey = lerp(x, tx, k), lerp(y + 14, ty, k)
    mx, my = (x + tx)/2 + 40, (y + ty)/2
    c.curve_to(mx, my, mx, my, ex, ey); stroke(c, 5, (1, 1, 1))
    if k > 0.95:
        a = math.atan2(ty - my, tx - mx)
        for da in (2.6, -2.6):
            c.move_to(tx, ty); c.line_to(tx + 22*math.cos(a + da), ty + 22*math.sin(a + da)); stroke(c, 5, (1, 1, 1))
    bigword(c, t, t0, x, y - 4, txt, 40)

# ---- icons (simple flat props)
def icon(c, t, t0, x, y, kind, s=1.0, t1=None):
    if t < t0 or (t1 and t > t1): return
    k = pop(t, t0) * s
    if t1: k *= 1 - ease((t - (t1 - 0.2))/0.2)
    c.save(); c.translate(x, y + math.sin(t*2 + x)*4); c.scale(S(k), S(k))
    if kind == 'money':
        for i in range(3):
            c.save(); c.translate(i*14 - 14, -i*10); c.rotate(-0.15 + i*0.12)
            rrect(c, -70, -38, 140, 76, 6); fs(c, hexc('7ab06a')); c.arc(0, 0, 20, 0, 6.3); fs(c, hexc('a8d098'), 2.5)
            text_c(c, '$', 0, 11, 30, hexc('3a6a2e')); c.restore()
    elif kind == 'bag':
        c.move_to(-60, 60); c.curve_to(-80, -10, -40, -40, -20, -50); c.line_to(20, -50); c.curve_to(40, -40, 80, -10, 60, 60); c.close_path(); fs(c, hexc('d9b56a'))
        rrect(c, -26, -70, 52, 24, 8); fs(c, hexc('b8944a')); text_c(c, '$', 0, 30, 60, hexc('6a4a1e'))
    elif kind == 'house':
        rrect(c, -70, -30, 140, 100, 4); fs(c, hexc('f0e2c4')); poly(c, [(-90, -26), (0, -100), (90, -26)]); fs(c, hexc('c4504a'))
        rrect(c, -18, 14, 36, 56, 3); fs(c, hexc('8a5a3a')); rrect(c, 28, -10, 30, 28, 3); fs(c, hexc('f6d26a'))
    elif kind == 'heart':
        c.move_to(0, 50); c.curve_to(-90, -10, -50, -80, 0, -36); c.curve_to(50, -80, 90, -10, 0, 50); fs(c, hexc('e05a5a'))
    elif kind == 'shield':
        c.move_to(0, -70); c.curve_to(40, -50, 60, -50, 64, -46); c.curve_to(64, 20, 30, 60, 0, 76); c.curve_to(-30, 60, -64, 20, -64, -46)
        c.curve_to(-60, -50, -40, -50, 0, -70); fs(c, hexc('5a8ac4')); c.move_to(-24, 0); c.line_to(-6, 20); c.line_to(28, -20); stroke(c, 8, (1, 1, 1))
    elif kind == 'clock':
        c.new_path(); c.arc(0, 0, 66, 0, 6.3); fs(c, hexc('f6ecd6')); c.new_path(); c.arc(0, 0, 66, 0, 6.3); stroke(c, 6)
        a = t*2; c.new_path(); c.move_to(0, 0); c.line_to(40*math.sin(a), -40*math.cos(a)); c.move_to(0, 0); c.line_to(0, -28); stroke(c, 6)
    elif kind == 'trophy':
        c.move_to(-50, -60); c.line_to(50, -60); c.curve_to(50, 10, 20, 30, 0, 30); c.curve_to(-20, 30, -50, 10, -50, -60); fs(c, hexc('e8c04a'))
        rrect(c, -10, 30, 20, 30, 3); fs(c, hexc('c89a2a')); rrect(c, -40, 58, 80, 18, 4); fs(c, hexc('6a4a2a'))
        text_c(c, '★', 0, -6, 40, (1, 1, 1))
    elif kind == 'scale':
        rrect(c, -6, -80, 12, 150, 3); fs(c, hexc('c8a24a')); rrect(c, -50, 66, 100, 14, 4); fs(c, hexc('8a6a2a'))
        tl = math.sin(t*1.5)*0.12; c.save(); c.translate(0, -76); c.rotate(tl)
        c.move_to(-110, 0); c.line_to(110, 0); stroke(c, 7, hexc('8a6a2a'))
        for s_ in (-1, 1):
            c.move_to(s_*110, 0); c.line_to(s_*110 - 34, 70); c.move_to(s_*110, 0); c.line_to(s_*110 + 34, 70); stroke(c, 2.5)
            c.move_to(s_*110 - 44, 70); c.curve_to(s_*110 - 30, 96, s_*110 + 30, 96, s_*110 + 44, 70); c.close_path(); fs(c, hexc('e0c060'))
        c.restore()
    elif kind == 'question':
        text_c(c, '?', 0, 30, 130, (1, 1, 1))
    elif kind == 'bill':
        rrect(c, -60, -80, 120, 160, 6); fs(c, (1, 1, 1, 1))
        for i in range(5): c.rectangle(-40, -50 + i*22, 80 - (i % 2)*30, 8); c.set_source_rgba(0.6, 0.6, 0.6, 1); c.fill()
        text_c(c, 'DUE', 0, 70, 26, (0.8, 0.2, 0.2))
    elif kind == 'warning':
        poly(c, [(0, -70), (74, 60), (-74, 60)]); fs(c, hexc('f2c43a')); text_c(c, '!', 0, 46, 80, LINE)
    elif kind == 'phone':
        rrect(c, -40, -74, 80, 148, 14); fs(c, hexc('2e3240')); rrect(c, -32, -62, 64, 118, 6); c.set_source_rgba(*hexc('7ab8e0')); c.fill()
    elif kind == 'briefcase':
        rrect(c, -80, -40, 160, 110, 10); fs(c, hexc('7a4a2c')); rrect(c, -26, -64, 52, 30, 8); stroke(c, 7); c.move_to(-80, 0); c.line_to(80, 0); stroke(c, 3)
    elif kind == 'gear':
        for i in range(8):
            c.save(); c.rotate(i*math.pi/4 + t); rrect(c, -14, -74, 28, 30, 4); fs(c, hexc('9aa4b0')); c.restore()
        c.arc(0, 0, 54, 0, 6.3); fs(c, hexc('9aa4b0')); c.arc(0, 0, 20, 0, 6.3); fs(c, hexc('5a6470'))
    elif kind == 'book':
        rrect(c, -80, -56, 160, 112, 6); fs(c, hexc('8a3a3a')); rrect(c, -70, -46, 140, 92, 4); fs(c, hexc('f6ecd6'), 2); c.move_to(0, -46); c.line_to(0, 46); stroke(c, 3)
    elif kind == 'lock':
        c.arc(0, -30, 34, math.pi, 0); stroke(c, 12, hexc('9aa4b0')); rrect(c, -52, -30, 104, 90, 10); fs(c, hexc('e8c04a'))
    elif kind == 'handshake':
        c.save(); c.rotate(-0.3); rrect(c, -100, -20, 110, 40, 18); fs(c, hexc('c98d68')); c.restore()
        c.save(); c.rotate(0.3); rrect(c, -10, -20, 110, 40, 18); fs(c, hexc('8d5a3b')); c.restore()
    c.restore()
