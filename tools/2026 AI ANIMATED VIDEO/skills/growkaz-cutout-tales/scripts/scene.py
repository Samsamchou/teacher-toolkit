import cairo, math, random, subprocess, sys

W, H, FPS, DUR = 1920, 1080, 30, 20
N = FPS * DUR
OUT = sys.argv[1] if len(sys.argv) > 1 else "scene.mp4"
LINE = (0.17, 0.11, 0.09)
random.seed(4)

def hexc(h, a=1):
    h = h.lstrip('#'); return (int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255, a)

def clamp(x, a=0, b=1): return max(a, min(b, x))
def ease(t): t = clamp(t); return t*t*(3-2*t)
def back_out(t):
    t = clamp(t); c = 2.2
    return 1 + (c+1)*(t-1)**3 + c*(t-1)**2
def lerp(a, b, t): return a + (b-a)*t

def rrect(c, x, y, w, h, r):
    r = min(r, w/2, h/2)
    c.new_sub_path()
    c.arc(x+w-r, y+r, r, -math.pi/2, 0); c.arc(x+w-r, y+h-r, r, 0, math.pi/2)
    c.arc(x+r, y+h-r, r, math.pi/2, math.pi); c.arc(x+r, y+r, r, math.pi, 3*math.pi/2)
    c.close_path()

def poly(c, pts):
    c.move_to(*pts[0])
    for p in pts[1:]: c.line_to(*p)
    c.close_path()

def fs(c, col, lw=3.2, stroke=True):
    c.set_source_rgba(*col);
    if stroke:
        c.fill_preserve(); c.set_source_rgb(*LINE); c.set_line_width(lw)
        c.set_line_join(cairo.LINE_JOIN_ROUND); c.stroke()
    else: c.fill()

def shade(c, path_fn, shadow_fn, base, dark):
    """fill base, then shadow clipped to the shape, then outline"""
    path_fn(); c.set_source_rgba(*base); c.fill_preserve()
    c.save(); c.clip(); shadow_fn(); c.set_source_rgba(*dark); c.fill(); c.restore()
    path_fn(); c.set_source_rgb(*LINE); c.set_line_width(3.2); c.set_line_join(cairo.LINE_JOIN_ROUND); c.stroke()

# ---------------- palette ----------------
SKIN, SKIN_D = hexc('d9a37e'), hexc('b97f5f')
HAIR = hexc('3b2a22')
SHIRT, SHIRT_D = hexc('8fa3b8'), hexc('6d8199')
VEST, VEST_D = hexc('5a3a2c'), hexc('432a20')
PANTS, PANTS_D = hexc('4a4f5c'), hexc('363a45')
BOOT, BOOT_D = hexc('5b3a26'), hexc('3f281a')
HAT, HAT_D = hexc('3a2c26'), hexc('2a1f1b')
BAND = hexc('b8402f')
LEATHER = hexc('7a4a2c')
BUCKLE = hexc('d8b45a')

# ---------------- character ----------------
def arm(c, sx, sy, a1, a2, front=True):
    """upper arm rotated a1 from straight-down, forearm a2 relative"""
    c.save(); c.translate(sx, sy); c.rotate(a1)
    shade(c, lambda: rrect(c, -14, -6, 28, 92, 13),
             lambda: c.rectangle(4, -10, 20, 110), SHIRT, SHIRT_D)
    c.translate(0, 82); c.rotate(a2)
    shade(c, lambda: rrect(c, -12, -6, 24, 80, 11),
             lambda: c.rectangle(3, -10, 20, 100), SHIRT, SHIRT_D)
    # cuff + hand
    rrect(c, -13, 62, 26, 10, 4); fs(c, SHIRT_D, 2.6)
    c.arc(0, 86, 14, 0, 2*math.pi); fs(c, SKIN)
    c.restore()

def character(c, t, blink, pose):
    breathe = math.sin(t*2.1)*0.012
    bob = math.sin(t*2.1+0.6)*1.6
    # ---- legs
    for lx, flip in ((-24, 0), (24, 1)):
        shade(c, lambda: (c.move_to(lx-22, -230), c.line_to(lx+22, -230), c.line_to(lx+19, -32), c.line_to(lx-19, -32), c.close_path()),
                 lambda: c.rectangle(lx+6, -240, 30, 220), PANTS, PANTS_D)
        # boot
        bx = lx + (6 if flip else -6)
        shade(c, lambda: (c.move_to(lx-21, -42), c.line_to(lx+21, -42), c.line_to(lx+22, -8),
                          c.curve_to(bx+40*(1 if flip else -1)*0+30, -6, bx+34, 0, bx+30, 0) if flip else c.line_to(lx+22,-8),
                          c.line_to(lx-30 if not flip else lx-22, 0), c.close_path()),
                 lambda: c.rectangle(lx-40, -14, 90, 20), BOOT, BOOT_D)
    c.save(); c.translate(0, -228); c.scale(1+breathe, 1+breathe); c.translate(0, bob*0.3)
    # ---- back arm (left side of screen)
    arm(c, -52, -150, pose['ba1'], pose['ba2'])
    # ---- torso: shirt then vest
    shade(c, lambda: (c.move_to(-56, -168), c.curve_to(-60, -100, -50, -40, -46, 6), c.line_to(46, 6),
                      c.curve_to(50, -40, 60, -100, 56, -168), c.curve_to(30, -180, -30, -180, -56, -168), c.close_path()),
             lambda: c.rectangle(18, -200, 60, 220), SHIRT, SHIRT_D)
    for s in (-1, 1):
        shade(c, lambda: (c.move_to(s*58, -166), c.curve_to(s*62, -100, s*52, -40, s*48, 8), c.line_to(s*10, 8),
                          c.line_to(s*8, -60), c.line_to(s*22, -168), c.close_path()),
                 lambda: c.rectangle(min(s*80, s*30) if s > 0 else -80, -200, 50, 220) if s > 0 else c.rectangle(-60, 0, 0, 0),
                 VEST, VEST_D)
        c.arc(s*18, -80, 3.5, 0, 6.3); c.arc(s*18, -40, 3.5, 0, 6.3); c.set_source_rgba(*BUCKLE); c.fill()
    # satchel strap
    c.move_to(-50, -164); c.line_to(44, -10); c.set_line_width(14); c.set_source_rgb(*LINE); c.stroke()
    c.move_to(-50, -164); c.line_to(44, -10); c.set_line_width(9); c.set_source_rgba(*LEATHER); c.stroke()
    # belt + buckle + holster
    rrect(c, -50, -4, 100, 18, 3); fs(c, LEATHER)
    rrect(c, -12, -6, 24, 22, 4); fs(c, BUCKLE)
    shade(c, lambda: (c.move_to(-60, 10), c.line_to(-36, 10), c.line_to(-34, 74), c.line_to(-54, 80), c.close_path()),
             lambda: c.rectangle(-46, 0, 20, 90), LEATHER, hexc('5e3820'))
    rrect(c, -58, -6, 14, 26, 4); fs(c, hexc('2b2b2e'))  # pistol grip
    # ---- neck + bandana
    rrect(c, -16, -196, 32, 34, 8); fs(c, SKIN_D)
    poly(c, [(-34, -176), (34, -176), (0, -140)]); fs(c, BAND)
    rrect(c, -36, -184, 72, 16, 7); fs(c, BAND)
    # ---- head
    c.save(); c.translate(0, -238 + bob*0.5); c.rotate(math.sin(t*0.9)*0.025 + pose['head'])
    for s in (-1, 1):
        c.save(); c.translate(s*38, 4); c.scale(0.6, 1); c.arc(0, 0, 13, 0, 6.3); c.restore(); fs(c, SKIN)
    face = lambda: (c.move_to(-38, -30), c.curve_to(-42, 10, -36, 34, -16, 52), c.curve_to(-6, 60, 6, 60, 16, 52),
                    c.curve_to(36, 34, 42, 10, 38, -30), c.curve_to(30, -62, -30, -62, -38, -30), c.close_path())
    shade(c, face, lambda: (c.move_to(14, -70), c.curve_to(30, 0, 30, 30, 8, 70), c.line_to(60, 70), c.line_to(60, -70), c.close_path()), SKIN, SKIN_D)
    # stubble / beard
    c.save(); face(); c.clip()
    c.move_to(-40, 12); c.curve_to(-30, 30, -20, 40, 0, 42); c.curve_to(20, 40, 30, 30, 40, 12)
    c.line_to(40, 70); c.line_to(-40, 70); c.close_path(); c.set_source_rgba(0.24, 0.17, 0.13, 0.55); c.fill()
    c.restore()
    # mustache
    c.move_to(-20, 26); c.curve_to(-10, 18, 10, 18, 20, 26); c.curve_to(10, 24, -10, 24, -20, 26)
    c.set_source_rgba(*HAIR); c.set_line_width(7); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    # nose wedge
    poly(c, [(2, -6), (10, 14), (-2, 16)]); c.set_source_rgba(*SKIN_D); c.fill()
    # eyes
    for s in (-1, 1):
        ex = s*16
        if blink:
            c.move_to(ex-8, -6); c.line_to(ex+8, -6); c.set_source_rgb(*LINE); c.set_line_width(3); c.stroke()
        else:
            c.save(); c.translate(ex, -6); c.scale(1.4, 1); c.arc(0, 0, 5.5, 0, 6.3); c.restore()
            c.set_source_rgb(0.98, 0.95, 0.9); c.fill()
            c.arc(ex+1.5+pose['look'], -6, 3.6, 0, 6.3); c.set_source_rgb(*LINE); c.fill()
        # heavy brows
        by = -20 + pose['brow']*(1 if s < 0 else 0.4)
        c.move_to(ex-12, by + s*-1); c.line_to(ex+12, by - 3 + (pose['brow'] if s > 0 else 0))
        c.set_source_rgba(*HAIR); c.set_line_width(7); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    # mouth
    c.move_to(-9, 36); c.curve_to(-3, 38+pose['smile'], 3, 38+pose['smile'], 10, 34 - pose['smile']*0.3)
    c.set_source_rgb(*LINE); c.set_line_width(3); c.stroke()
    # hair at sides
    for s in (-1, 1):
        poly(c, [(s*40, -34), (s*34, -12), (s*30, -36)]); fs(c, HAIR, 2.5)
    # hat (tips with pose)
    c.save(); c.translate(0, -38); c.rotate(pose['hat_rot']); c.translate(0, pose['hat_dy'])
    shade(c, lambda: (c.move_to(-34, 0), c.curve_to(-36, -40, -26, -62, 0, -54), c.curve_to(26, -62, 36, -40, 34, 0), c.close_path()),
             lambda: c.rectangle(10, -80, 40, 90), HAT, HAT_D)
    c.move_to(-34, -12); c.line_to(34, -12); c.set_source_rgba(*hexc('8a6a4a')); c.set_line_width(8); c.stroke()
    shade(c, lambda: (c.move_to(-86, -2), c.curve_to(-60, 12, 60, 12, 86, -2), c.curve_to(92, 8, 70, 16, 0, 18),
                      c.curve_to(-70, 16, -92, 8, -86, -2), c.close_path()),
             lambda: c.rectangle(-100, 10, 200, 20), HAT, HAT_D)
    c.restore()
    c.restore()
    # ---- front arm (right side of screen) drawn over torso
    arm(c, 52, -150, pose['fa1'], pose['fa2'])
    c.restore()

# ---------------- environment ----------------
STARS = [(random.random()*W*1.3, random.random()*360, random.random()) for _ in range(70)]
DUST = [(random.random()*W, random.random()*H, random.uniform(1.2, 3.2), random.random()*6.3, random.uniform(8, 22)) for _ in range(90)]
TUFTS = [(random.uniform(-200, W+200), random.uniform(820, 1080)) for _ in range(70)]

def sky(c, top, mid, bot):
    g = cairo.LinearGradient(0, 0, 0, H*0.75)
    g.add_color_stop_rgba(0, *top); g.add_color_stop_rgba(0.55, *mid); g.add_color_stop_rgba(1, *bot)
    c.set_source(g); c.paint()

def sun(c, x, y, r, col):
    g = cairo.RadialGradient(x, y, r*0.6, x, y, r*5)
    g.add_color_stop_rgba(0, col[0], col[1], col[2], 0.55); g.add_color_stop_rgba(1, col[0], col[1], col[2], 0)
    c.set_source(g); c.paint()
    c.arc(x, y, r, 0, 6.3); c.set_source_rgba(1, 0.93, 0.72, 1); c.fill()

def cloud(c, x, y, s, col):
    c.save(); c.translate(x, y); c.scale(max(s,0.001), max(s,0.001))
    for dx, dy, r in ((0, 0, 40), (45, -18, 48), (95, -6, 38), (135, 6, 28), (-35, 8, 26)):
        c.new_sub_path(); c.arc(dx, dy, r, 0, 6.3)
    c.rectangle(-60, 6, 220, 30)
    c.set_source_rgba(*col); c.fill(); c.restore()

def mountains(c, base, pts, col, snow=None):
    c.move_to(-300, base)
    for x, y in pts: c.line_to(x, y)
    c.line_to(W+300, base); c.line_to(W+300, H); c.line_to(-300, H); c.close_path()
    c.set_source_rgba(*col); c.fill()

def building(c, x, w, h, col, sign=None, trim=hexc('3c2a24')):
    gy = 760
    rrect(c, x, gy-h, w, h, 2); fs(c, col, 3)
    # false-front top
    rrect(c, x-8, gy-h-16, w+16, 22, 3); fs(c, trim, 3)
    for i in range(int(w//70)):
        wx = x + 24 + i*70
        if wx + 36 > x + w - 10: break
        rrect(c, wx, gy-h+50, 36, 48, 3); fs(c, hexc('f2c46d'), 2.6)
        c.move_to(wx+18, gy-h+50); c.line_to(wx+18, gy-h+98); c.set_line_width(2.5); c.set_source_rgb(*LINE); c.stroke()
    # porch roof
    poly(c, [(x-14, gy-112), (x+w+14, gy-112), (x+w+4, gy-92), (x-4, gy-92)]); fs(c, trim, 3)
    for px in (x+6, x+w-10):
        rrect(c, px, gy-92, 8, 92, 2); fs(c, trim, 2.4)
    rrect(c, x + w/2 - 26, gy-84, 52, 84, 3); fs(c, hexc('5a3a2c'), 3)
    if sign:
        rrect(c, x + w/2 - 70, gy-h+8, 140, 32, 4); fs(c, hexc('efe2c4'), 2.6)
        c.select_font_face("Comic Relief", 0, 1); c.set_font_size(19)
        e = c.text_extents(sign); c.move_to(x + w/2 - e.width/2 - e.x_bearing, gy-h+31)
        c.set_source_rgb(*LINE); c.show_text(sign)

def tuft(c, x, y, col):
    for a in (-0.5, -0.15, 0.2, 0.55):
        c.move_to(x, y); c.curve_to(x + a*10, y-10, x + a*22, y-18, x + a*26, y-24)
    c.set_source_rgba(*col); c.set_line_width(2.6); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()

def dust(c, t, col=(1, 0.88, 0.65)):
    for x, y, r, ph, sp in DUST:
        xx = (x + t*sp) % W; yy = (y - t*sp*0.6 + math.sin(t+ph)*12) % H
        a = 0.25 + 0.35*(0.5+0.5*math.sin(t*1.7+ph))
        c.arc(xx, yy, r, 0, 6.3); c.set_source_rgba(col[0], col[1], col[2], a); c.fill()

def vignette(c, strength=0.55):
    g = cairo.RadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*1.05)
    g.add_color_stop_rgba(0, 0, 0, 0, 0); g.add_color_stop_rgba(1, 0.05, 0.02, 0.05, strength)
    c.set_source(g); c.paint()

# ---------------- overlays ----------------
def tag(c, x, y, title, sub, t0, t, rot=-0.05):
    s = back_out((t - t0)/0.28)
    if t < t0: return
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(max(s,0.001), max(s,0.001))
    c.select_font_face("Comic Relief", 0, 1); c.set_font_size(38); e = c.text_extents(title)
    w = max(e.width, 140) + 52; h = 92 if sub else 64
    c.save(); c.translate(5, 7); rrect(c, -w/2, -h/2, w, h, 14); c.set_source_rgba(0, 0, 0, 0.3); c.fill(); c.restore()
    rrect(c, -w/2, -h/2, w, h, 14); c.set_source_rgb(0.98, 0.97, 0.94); c.fill_preserve()
    c.set_source_rgb(*LINE); c.set_line_width(4); c.stroke()
    c.move_to(-e.width/2 - e.x_bearing, (-6 if sub else 14)); c.set_source_rgb(*LINE); c.show_text(title)
    if sub:
        c.select_font_face("Comic Relief", 0, 0); c.set_font_size(20); e2 = c.text_extents(sub)
        c.move_to(-e2.width/2 - e2.x_bearing, 30); c.set_source_rgba(0.35, 0.3, 0.28, 1); c.show_text(sub)
    c.restore()

def star(c, x, y, r):
    pts = []
    for i in range(10):
        a = -math.pi/2 + i*math.pi/5; rr = r if i % 2 == 0 else r*0.45
        pts.append((x + rr*math.cos(a), y + rr*math.sin(a)))
    poly(c, pts); c.set_source_rgba(1, 0.84, 0.3, 1); c.fill_preserve(); c.set_source_rgb(*LINE); c.set_line_width(2.5); c.stroke()

def rating(c, x, y, label, t0, t):
    if t < t0: return
    c.save(); c.translate(x, y)
    a = clamp((t-t0)/0.25)
    c.select_font_face("Comic Relief", 0, 1); c.set_font_size(34); e = c.text_extents(label)
    c.move_to(-e.width/2 - e.x_bearing + 3, 3); c.set_source_rgba(0, 0, 0, 0.4*a); c.show_text(label)
    c.move_to(-e.width/2 - e.x_bearing, 0); c.set_source_rgba(1, 1, 1, a); c.show_text(label)
    for i in range(5):
        s = back_out((t - t0 - 0.25 - i*0.12)/0.25)
        if s <= 0: continue
        c.save(); c.translate(-96 + i*48, 46); c.scale(max(s,0.001), max(s,0.001)); star(c, 0, 0, 20); c.restore()
    c.restore()

def money(c, x, y, txt, t0, t):
    if t < t0: return
    s = back_out((t-t0)/0.3)
    c.save(); c.translate(x, y); c.rotate(0.06); c.scale(max(s,0.001), max(s,0.001))
    c.select_font_face("Comic Relief", 0, 1); c.set_font_size(30); e = c.text_extents(txt)
    w, h = e.width + 50, 64
    rrect(c, -w/2, -h/2, w, h, 6); c.set_source_rgba(0.98, 0.95, 0.88, 0.95); c.fill()
    for o in (0, 6):
        rrect(c, -w/2 + o/2, -h/2 + o/2, w - o, h - o, 6)
        c.set_source_rgba(0.78, 0.15, 0.13, 1); c.set_line_width(5 if o == 0 else 2.5); c.stroke()
    c.move_to(-e.width/2 - e.x_bearing, 11); c.set_source_rgba(0.78, 0.15, 0.13, 1); c.show_text(txt)
    c.restore()

def bubble(c, x, y, txt, tip, t0, t1, t):
    if t < t0 or t > t1: return
    s = back_out((t-t0)/0.3) * (1 - ease((t - (t1-0.2))/0.2))
    c.save(); c.translate(x, y); c.scale(max(s,0.001), max(s,0.001)); c.rotate(-0.03)
    c.select_font_face("Comic Relief", 0, 1); c.set_font_size(34)
    n = int(len(txt) * clamp((t-t0)/1.0))  # typewriter
    e = c.text_extents(txt); w, h = e.width + 70, 90
    c.move_to(-40, h/2 - 4); c.line_to(tip[0], tip[1]); c.line_to(10, h/2 - 4)
    rrect(c, -w/2, -h/2, w, h, 45)
    c.set_source_rgb(0.99, 0.99, 0.97); c.fill_preserve(); c.set_source_rgb(*LINE); c.set_line_width(4); c.stroke()
    c.move_to(-w/2+16, h/2 - 6); c.line_to(-30, h/2-6); c.set_source_rgb(0.99, 0.99, 0.97); c.set_line_width(6); c.stroke()
    c.move_to(-e.width/2 - e.x_bearing, 12); c.set_source_rgb(*LINE); c.show_text(txt[:n])
    c.restore()

# ---------------- shots ----------------
def pose_at(t):
    p = dict(ba1=0.38, ba2=-1.25, fa1=-0.38, fa2=1.25, head=0, look=0, brow=0, smile=0, hat_rot=0, hat_dy=0)
    # hat tip at 7.4s-9.2s : front arm rises to brim
    k = ease((t-7.2)/0.45) * (1 - ease((t-8.9)/0.45))
    p['fa1'] = lerp(-0.38, -2.5, k); p['fa2'] = lerp(1.25, 0.55, k)
    p['hat_rot'] = lerp(0, -0.13, k); p['hat_dy'] = lerp(0, 4, k)
    p['smile'] = lerp(0, 5, k)
    # glance + brow raise when bounty appears
    g = ease((t-3.8)/0.3) * (1 - ease((t-5.6)/0.3))
    p['look'] = g*2.5; p['head'] = -0.04*g; p['brow'] = -4*g
    # stern for line
    s = ease((t-10.6)/0.3)
    p['brow'] += 4*s
    return p

def shot1(c, t):
    # slow push-in camera with parallax
    z = lerp(1.0, 1.13, ease(t/15))
    cx, cy = W*0.56, H*0.62
    def layer(depth, fn):
        c.save(); zz = 1 + (z-1)*depth
        c.translate(cx, cy); c.scale(zz, zz); c.translate(-cx - (t*6*depth), -cy); fn(); c.restore()
    sky(c, hexc('3d2a5c'), hexc('c4566a'), hexc('f6a65a'))
    layer(0.05, lambda: [c.arc(x, y, 1.2+s, 0, 6.3) or c.set_source_rgba(1, 1, 1, 0.35*s) or c.fill() for x, y, s in STARS])
    layer(0.1, lambda: sun(c, 1380, 560, 70, (1, 0.72, 0.4)))
    layer(0.15, lambda: [cloud(c, 200 + t*8, 170, 1.0, hexc('d8708a', 0.55)), cloud(c, 1100 + t*5, 120, 1.3, hexc('e48a7e', 0.5)),
                         cloud(c, 1650 + t*7, 260, 0.8, hexc('f2a07a', 0.6))])
    layer(0.25, lambda: mountains(c, 760, [(-100, 600), (150, 470), (330, 610), (560, 430), (760, 590), (980, 500), (1200, 610),
                                          (1500, 450), (1750, 600), (2000, 520)], hexc('7d4a72')))
    layer(0.4, lambda: mountains(c, 760, [(-100, 680), (300, 610), (650, 690), (1050, 630), (1400, 700), (1800, 620), (2100, 690)], hexc('a65a6a')))
    def town():
        building(c, 80, 290, 300, hexc('a8705a'), "HOTEL")
        building(c, 400, 340, 360, hexc('c99a6e'), "SALOON")
        building(c, 1240, 300, 310, hexc('8e6a5e'), "BANK")
        building(c, 1570, 330, 280, hexc('b5805e'), "GENERAL")
    layer(0.6, town)
    def ground():
        g = cairo.LinearGradient(0, 750, 0, H); g.add_color_stop_rgba(0, *hexc('c98a5a')); g.add_color_stop_rgba(1, *hexc('8e5a3c'))
        c.rectangle(-400, 755, W+800, H); c.set_source(g); c.fill()
        c.move_to(-400, 757); c.line_to(W+400, 757); c.set_source_rgb(*LINE); c.set_line_width(3); c.stroke()
        for x, y in TUFTS: tuft(c, x, y, hexc('6e4a2e'))
        # barrel
        rrect(c, 1080, 830, 80, 104, 18); fs(c, hexc('8a5a36'))
        for yy in (852, 910): c.move_to(1082, yy); c.line_to(1158, yy); c.set_line_width(5); c.set_source_rgba(*hexc('4a3a30')); c.stroke()
    layer(0.85, ground)
    # character
    def hero():
        c.save(); c.translate(W*0.5, 1045); c.scale(1.45,1.45)
        c.save(); c.scale(1, 0.18); c.arc(0, 0, 120, 0, 6.3); c.set_source_rgba(0, 0, 0, 0.25); c.fill(); c.restore()
        blink = any(abs(t - b) < 0.07 for b in (2.3, 6.1, 9.8, 12.9))
        character(c, t, blink, pose_at(t)); c.restore()
    layer(1.0, hero)
    dust(c, t)
    vignette(c)
    tag(c, 560, 380, "SILAS", "the drifter", 1.2, t)
    money(c, 1430, 300, "BOUNTY  $2,500", 4.0, t)
    rating(c, 1500, 160, "GRIT RATING", 5.3, t) if t > 5.3 else None
    bubble(c, 560, 150, "This town ain't big enough.", (150, 150), 10.6, 14.4, t)

def horse_rider(c, t):
    s = t*7.0
    lg = lambda ph: math.sin(s + ph)*0.42
    def leg(x, y, ph, front):
        c.save(); c.translate(x, y); c.rotate(lg(ph)); rrect(c, -9, 0, 18, 70, 8); c.fill()
        c.translate(0, 64); c.rotate(max(0, -lg(ph)*1.3) if front else -max(0, lg(ph))*1.1); rrect(c, -7, 0, 14, 66, 6); c.fill(); c.restore()
    c.set_source_rgb(0.08, 0.05, 0.1)
    bob = abs(math.sin(s))*5
    c.save(); c.translate(0, -bob)
    for x, ph, f in ((-70, 0, 0), (60, math.pi, 1), (-55, math.pi, 0), (75, 0, 1)): leg(x, -150, ph, f)
    c.save(); c.translate(0, -175); c.scale(1.2, 0.62); c.arc(0, 0, 100, 0, 6.3); c.restore(); c.fill()
    poly(c, [(70, -210), (115, -300), (150, -290), (140, -250), (100, -170)]); c.fill()   # neck
    c.save(); c.translate(160, -282); c.rotate(0.55); c.scale(1.6, 0.75); c.arc(0, 0, 28, 0, 6.3); c.restore(); c.fill()  # head
    poly(c, [(126, -320), (134, -342), (142, -316)]); c.fill()
    c.move_to(-118, -195); c.curve_to(-160, -170, -150, -110, -170, -80 + math.sin(s)*6); c.set_line_width(16); c.stroke()  # tail
    # rider
    c.save(); c.translate(-5, -205 + math.sin(s*2)*2)
    rrect(c, -30, -110, 60, 115, 22); c.fill()
    c.arc(0, -138, 30, 0, 6.3); c.fill()
    c.save(); c.translate(0, -158); c.scale(1, 0.28); c.arc(0, 0, 78, 0, 6.3); c.restore(); c.fill()
    c.move_to(-28, -160); c.curve_to(-28, -205, 28, -205, 28, -160); c.fill()
    rrect(c, -14, -10, 28, 95, 12); c.fill()
    c.restore(); c.restore()

def shot2(c, t):
    lt = t - 15
    sky(c, hexc('2a1f4a'), hexc('d0506a'), hexc('ffb060'))
    sun(c, W*0.5, 790, 260, (1, 0.7, 0.45))
    for x, y, s in STARS: c.arc(x, y*0.7, 1+s, 0, 6.3); c.set_source_rgba(1, 1, 1, 0.3*s); c.fill()
    cloud(c, 300 + lt*10, 220, 1.2, hexc('e07a86', 0.5)); cloud(c, 1350 + lt*6, 160, 1.4, hexc('e8907e', 0.45))
    mountains(c, 900, [(-100, 760), (260, 640), (520, 780), (900, 690), (1300, 790), (1600, 660), (2050, 760)], hexc('5a2d55'))
    c.rectangle(0, 860, W, H); c.set_source_rgb(0.1, 0.06, 0.11); c.fill()
    for x, y in TUFTS[:30]:
        c.save(); c.translate(0, 0); tuft(c, x, 862, (0.1, 0.06, 0.11, 1)); c.restore()
    # fence posts
    for i in range(14):
        px = i*150 - (lt*30 % 150); rrect(c, px, 800, 14, 64, 2); c.set_source_rgb(0.1, 0.06, 0.11); c.fill()
    c.rectangle(0, 815, W, 8); c.rectangle(0, 838, W, 8); c.fill()
    c.save(); c.translate(lerp(560, 1260, lt/5), 870); c.scale(1.15, 1.15); horse_rider(c, lt); c.restore()
    dust(c, t, (1, 0.8, 0.6))
    vignette(c, 0.7)
    tag(c, 260, 160, "1899", None, 15.5, t, rot=-0.08)

def frame(i):
    t = i / FPS
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
    if t < 15:
        shot1(c, t)
        f = ease((t-14.6)/0.4)
    else:
        shot2(c, t)
        f = 1 - ease((t-15)/0.4)
        f = max(f, ease((t-19.4)/0.6))
    if f > 0: c.set_source_rgba(0, 0, 0, f); c.paint()
    if t < 0.5: c.set_source_rgba(0, 0, 0, 1-ease(t/0.5)); c.paint()
    return surf

if __name__ == "__main__":
    if len(sys.argv) > 2:  # stills mode
        for ts in map(float, sys.argv[2:]):
            frame(int(ts*FPS)).write_to_png(f"still_{ts}.png")
        sys.exit()
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", OUT], stdin=subprocess.PIPE)
    for i in range(N):
        p.stdin.write(bytes(frame(i).get_data()))
    p.stdin.close(); p.wait()
