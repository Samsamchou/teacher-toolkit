import json, math, sys, os, subprocess, cairo
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from engine import *

TIM = json.load(open(os.environ.get('TIMING', 'timing.json')))  # made by scripts/align.py
FEET = 1035

# ------------------------------------------------------------- set renderers
def set_apt(c, t, mood='dusk', couch_=True, lamp_=True, win_x=1180):
    m = MOODS[mood]
    wall(c, hexc('c9a98a') if mood != 'night' else hexc('6a5a72'), hexc('9a6a4a'))
    window(c, win_x, 170, 460, 380, m, t)
    frame_pic(c, 260, 220, 170, 130, hexc('e0b070')); frame_pic(c, 470, 260, 110, 150, hexc('8ab0c0'))
    if lamp_: lamp(c, 1760, 800)
    if couch_: couch(c, 140, 820, hexc('5a7a8a'))
    plant(c, 1060, 800)

def set_room_night(c, t):
    set_apt(c, t, 'night', couch_=False)
    c.set_source_rgba(0.05, 0.05, 0.15, 0.25); c.paint()

def set_office(c, t, mood='day'):
    m = MOODS[mood]
    wall(c, hexc('b9c4cc'), hexc('6a6a72'))
    window(c, 1260, 150, 520, 400, m, t)
    for i in range(9): c.rectangle(1260, 160 + i*44, 520, 6); c.set_source_rgba(0.95, 0.95, 0.95, 0.5); c.fill()
    frame_pic(c, 300, 230, 220, 150, hexc('e0c060'))
    rrect(c, 330, 260, 160, 90, 2); c.set_source_rgba(*hexc('7ab06a')); c.fill()
    c.move_to(340, 340); c.line_to(380, 310); c.line_to(420, 325); c.line_to(480, 270); stroke(c, 5, (1, 1, 1))
    plant(c, 140, 800)

def set_street(c, t, mood='dusk', lamps=True):
    m = MOODS[mood]; street(c, m, t); ground_street(c)
    if lamps: streetlamp(c, 220, mood != 'day'); streetlamp(c, 1640, mood != 'day')

def set_stage(c, t): stage(c, t)

def set_dinner(c, t, mood='night'):
    m = MOODS[mood]
    wall(c, hexc('b98a6a'), hexc('7a5236'))
    window(c, 760, 160, 400, 330, m, t)
    glow(c, 960, 120, 60, (1, 0.85, 0.5), 0.5, 5)
    c.move_to(960, 0); c.line_to(960, 110); stroke(c, 3)
    poly(c, [(900, 140), (1020, 140), (990, 100), (930, 100)]); fs(c, hexc('f2d79a'))
    frame_pic(c, 260, 240, 180, 140, hexc('d0a070')); frame_pic(c, 1520, 240, 160, 180, hexc('a0c0a0'))

def set_plain(c, t, a='3a2a4a', b='140c18'): plain(c, a, b)

def set_roof(c, t, mood='dusk'):
    m = MOODS[mood]; sky(c, m); sun(c, W*0.55, 700, 200, m)
    stars(c, 0.25); skyline(c, 860, m, t, True)
    c.rectangle(0, 860, W, H); c.set_source_rgb(0.1, 0.06, 0.11); c.fill()
    for x in (200, 1500): rrect(c, x, 790, 120, 70, 4); c.set_source_rgb(0.1, 0.06, 0.11); c.fill()

def table_fg(c, t):
    rrect(c, 260, 820, 1400, 40, 10); fs(c, hexc('9a6a44'))
    rrect(c, 290, 860, 1340, 240, 0); fs(c, hexc('7a4e30'))
    for x in (520, 900, 1300):
        c.save(); c.translate(x, 818); c.scale(1, 0.3); c.arc(0, 0, 70, 0, 6.3); c.restore(); fs(c, (0.97, 0.96, 0.93, 1))

SETS = dict(apt=set_apt, night=set_room_night, office=set_office, street=set_street, stage=set_stage, dinner=set_dinner, plain=set_plain, roof=set_roof)

# ------------------------------------------------------------- helpers
def C(n, x, s=1.25, pose='idle', expr='neutral', flip=False, g=(), e=(), talk=(), y=FEET, sil=False):
    return dict(n=n, x=x, s=s, pose=pose, expr=expr, flip=flip, g=list(g), e=list(e), talk=list(talk), y=y, sil=sil)

def head_y(ch):
    chibi = CAST[ch['n']].get('chibi')
    return ch['y'] - (560 if chibi else 470) * ch['s'] * (0.62 if chibi else 1) * (1 if not chibi else 1.0)

def pose_at(ch, lt):
    pose, k, pose2 = ch['pose'], 0, None
    cur = ch['pose']
    for (tt, p) in ch['g']:
        if lt >= tt:
            kk = ease((lt - tt)/0.45)
            if kk < 1: return cur, p, kk
            cur = p
    return cur, None, 0

def expr_at(ch, lt):
    ex = ch['expr']
    for tt, x in ch['e']:
        if lt >= tt: ex = x
    return ex

def draw_char(c, ch, t, lt, seed):
    c.save(); c.translate(ch['x'], ch['y']); c.scale(ch['s'], ch['s'])
    c.save(); c.scale(1, 0.16); c.arc(0, 0, 110, 0, 6.3); c.set_source_rgba(0, 0, 0, 0.22); c.fill(); c.restore()
    p1, p2, k = pose_at(ch, lt)
    ex = expr_at(ch, lt)
    blink = ((t + seed*1.37) % 3.6) < 0.13
    talking = any(a <= lt <= b for a, b in ch['talk'])
    if talking and int(lt*8) % 2 == 0:
        EXPR['_talk'] = dict(EXPR[ex]); EXPR['_talk']['mouth_o'] = True; ex = '_talk'
    character(c, ch['n'], t, p1, ex, blink, ch['flip'], p2, k, seed)
    c.restore()

class Shot:
    def __init__(self, part, i0, i1, bg, chars=(), ov=None, mood=None, fg=None, zoom=(1.0, 1.12), focus=None, bgargs=None):
        self.t0 = TIM[part][i0]['t0']; self.t1 = TIM[part][i1]['t1']
        self.bg, self.chars, self.ov, self.fg = bg, list(chars), ov, fg
        self.zoom, self.focus, self.bgargs = zoom, focus, bgargs or {}

    def render(self, c, t):
        lt = t - self.t0; dur = self.t1 - self.t0
        z = lerp(self.zoom[0], self.zoom[1], ease(lt/dur))
        fx, fy = self.focus or (W/2, H*0.55)
        def cam(depth):
            zz = 1 + (z - 1)*depth; c.translate(fx, fy); c.scale(zz, zz); c.translate(-fx - lt*5*depth, -fy)
        c.save(); cam(0.6); SETS[self.bg](c, t, **self.bgargs); c.restore()
        c.save(); cam(1.0)
        for i, ch in enumerate(self.chars):
            draw_char(c, ch, t, lt, i + int(ch['x']))
        if self.fg: self.fg(c, t)
        c.restore()
        moodc = MOODS.get(self.bgargs.get('mood', 'dusk'), MOODS['dusk'])
        dust(c, t, moodc['dust'])
        vignette(c, 0.6)
        if self.ov:
            # overlay coords follow the camera loosely so tags stay attached
            c.save(); cam(0.85); self.ov(c, lt); c.restore()

def speech(c, lt, ch, t0, t1, txt, dx=0, dy=-150, think=False, size=34, maxw=560):
    hx, hy = ch['x'], head_y(ch)
    bx, by = clamp(hx + dx, 340, W - 340), max(150, hy + dy)
    bubble(c, lt, t0, t1, bx, by, txt, tip=(hx - bx, hy - by - 30), size=size, maxw=maxw, think=think)

def qlist(c, lt, x, y, title, items, w=640, paper=True, rot=-0.025, t0=0):
    """items: (time, text, mark) mark in {'check','q','x',None}"""
    if lt < t0: return
    s = pop(lt, t0, 0.32); h = 110 + len(items)*62
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(S(s), S(s))
    shadow_rect(c, -w/2, -h/2, w, h, 10)
    rrect(c, -w/2, -h/2, w, h, 10); fs(c, hexc('f6ecd6') if paper else hexc('2f4a3a'), 4)
    if not paper: rrect(c, -w/2+14, -h/2+14, w-28, h-28, 6); stroke(c, 6, hexc('8a5a3a'))
    tc = LINE if paper else (0.97, 0.97, 0.92)
    text_c(c, title, 0, -h/2 + 62, 38, tc)
    c.move_to(-w/2 + 40, -h/2 + 84); c.line_to(w/2 - 40, -h/2 + 84); stroke(c, 2.5, tc)
    for i, (tt, txt, mark) in enumerate(items):
        k = clamp((lt - tt)/0.25)
        if k <= 0: continue
        yy = -h/2 + 140 + i*62
        font(c, 31, False); c.move_to(-w/2 + 96, yy); c.set_source_rgba(tc[0], tc[1], tc[2], k); c.show_text(txt)
        ms = back_out((lt - tt)/0.3)
        c.save(); c.translate(-w/2 + 58, yy - 11); c.scale(S(ms), S(ms))
        if mark == 'check':
            c.arc(0, 0, 20, 0, 6.3); c.set_source_rgba(*hexc('5a9a4a')); c.fill(); c.move_to(-9, 0); c.line_to(-2, 8); c.line_to(10, -8); stroke(c, 5, (1, 1, 1))
        elif mark == 'x':
            c.arc(0, 0, 20, 0, 6.3); c.set_source_rgba(*hexc('c4403a')); c.fill(); c.move_to(-8, -8); c.line_to(8, 8); c.move_to(8, -8); c.line_to(-8, 8); stroke(c, 5, (1, 1, 1))
        elif mark == 'q':
            c.arc(0, 0, 20, 0, 6.3); c.set_source_rgba(*hexc('e0a030')); c.fill(); text_c(c, '?', 0, 11, 30, (1, 1, 1))
        else:
            c.arc(0, 0, 7, 0, 6.3); c.set_source_rgba(*tc[:3], 1); c.fill()
        c.restore()
    c.restore()

def flow(c, lt, t0, t1, a, b, y=480):
    """two cards with an arrow: a -> b"""
    for i, (x, txt, tt, col) in enumerate(((560, a, t0, hexc('f6ecd6')), (1360, b, t1, hexc('f3c9b8')))):
        if lt < tt: continue
        s = pop(lt, tt, 0.32)
        lines = wrap(c, txt, 40, 440); h = len(lines)*52 + 60
        c.save(); c.translate(x, y); c.rotate(-0.03 if i == 0 else 0.03); c.scale(S(s), S(s))
        shadow_rect(c, -260, -h/2, 520, h, 14); rrect(c, -260, -h/2, 520, h, 14); fs(c, col, 4)
        for j, l in enumerate(lines): text_c(c, l, 0, -h/2 + 30 + 40 + j*52, 40)
        c.restore()
    if lt > t0 + 0.4:
        k = ease((lt - t0 - 0.4)/0.5); c.move_to(840, y); c.line_to(lerp(840, 1070, k), y); stroke(c, 10, (1, 1, 1))
        if k > 0.95: poly(c, [(1090, y), (1060, y - 22), (1060, y + 22)]); c.set_source_rgb(1, 1, 1); c.fill()

# =============================================================== PART 1
def part1():
    P = 0; L = []
    you = C('you', 960, pose='idle', g=[(0.3, 'present'), (2.4, 'idle')], talk=[(0.3, 2.3)])
    fr = C('friend1', 380, 1.18, flip=True, g=[(2.6, 'point'), (4.6, 'idle')], talk=[(3.0, 5.6)], expr='neutral', e=[(2.6, 'worried')])
    mom = C('mom', 1500, 1.2, g=[(6.0, 'hips')], talk=[(6.1, 7.8)], e=[(6.0, 'neutral')])
    dad = C('dad', 1760, 1.22, g=[(7.8, 'point')], talk=[(7.9, 9.8)])
    def o0(c, lt):
        speech(c, lt, you, 0.2, 2.6, "I want to make more money!", dy=-170)
        speech(c, lt, fr, 2.6, 6.0, "Don't get too obsessed.", dx=120, dy=-130)
        speech(c, lt, mom, 6.1, 7.85, "Money isn't everything.", dx=-150, dy=-120)
        speech(c, lt, dad, 7.9, 9.9, "Be grateful for what you have.", dx=-300, dy=-140)
    L.append(Shot(P, 0, 2, 'apt', [fr, you, mom, dad], o0, bgargs=dict(mood='dusk')))

    you2 = C('you', 960, 1.3, pose='think', expr='think', e=[(3.2, 'worried')])
    def o1(c, lt):
        speech(c, lt, you2, 0.4, 5.6, "Does wanting more make me a worse person?", dx=0, dy=-170, think=True)
        icon(c, lt, 1.4, 520, 520, 'money', 1.1); icon(c, lt, 3.0, 1420, 520, 'question', 1.3)
    L.append(Shot(P, 3, 3, 'night', [you2], o1, bgargs={}))

    kid = C('kid', 760, 1.25, pose='hold', expr='happy')
    def o2(c, lt):
        icon(c, lt, 0.3, 1000, 640, 'book', 1.3)
        tag(c, lt, 0.8, 1300, 300, "STORIES", "we hear growing up")
    L.append(Shot(P, 4, 4, 'apt', [kid], o2, bgargs=dict(mood='night', lamp_=True)))

    rich = C('rich', 620, 1.25, pose='hips', expr='sly')
    hero = C('hero', 1300, 1.22, pose='idle', expr='happy', g=[(5.0, 'wave')], e=[(4.4, 'happy')])
    def o3(c, lt):
        tag(c, lt, 0.4, 380, 250, "THE VILLAIN", "cares only about profit")
        icon(c, lt, 1.2, 360, 760, 'bag', 1.0)
        tag(c, lt, 4.4, 1560, 250, "THE HERO", "has little, does right", rot=0.04)
        icon(c, lt, 5.2, 1560, 740, 'heart', 0.8)
    L.append(Shot(P, 5, 5, 'stage', [rich, hero], o3))

    dad2 = C('dad', 520, 1.15, pose='idle', g=[(0.2, 'point')], talk=[(0.3, 2.0)], expr='angry')
    mom2 = C('mom', 1400, 1.1, pose='idle', g=[(2.1, 'shrug')], talk=[(2.2, 3.8)])
    kid2 = C('kid', 960, 1.2, expr='worried', e=[(0.0, 'neutral'), (0.4, 'think')])
    def o4(c, lt):
        speech(c, lt, dad2, 0.2, 2.1, "Rich people are greedy.", dx=60, dy=-120)
        speech(c, lt, mom2, 2.1, 3.94, "Money changes people.", dx=-60, dy=-120)
    L.append(Shot(P, 6, 6, 'dinner', [dad2, kid2, mom2], o4, fg=table_fg, bgargs=dict(mood='night')))

    you3 = C('you', 960, 1.3, pose='sad', expr='sad')
    def o5(c, lt):
        caption(c, lt, 0.4, 3.9, "Some beliefs come from painful experiences", y=150)
    L.append(Shot(P, 7, 7, 'night', [you3], o5))

    boss = C('boss', 640, 1.28, pose='hips', expr='sly')
    worker = C('worker', 1260, 1.22, pose='hold', expr='sad', flip=True)
    def o6(c, lt):
        tag(c, lt, 0.2, 1320, 250, "YOUR PARENT", "working hard")
        stamp(c, lt, 1.0, 1260, 470, "UNDERPAID", rot=-0.08)
    L.append(Shot(P, 8, 8, 'office', [boss, worker], o6))

    rich2 = C('rich', 520, 1.2, pose='up', expr='sly')
    fam = [C('dad', 1180, 1.12, expr='sad', flip=True), C('kid', 1400, 1.12, expr='sad', flip=True), C('mom', 1620, 1.1, expr='sad', flip=True)]
    def o7(c, lt):
        icon(c, lt, 0.3, 380, 200, 'money', 0.9); icon(c, lt, 0.6, 660, 160, 'money', 0.8)
        tag(c, lt, 0.8, 520, 380, "DISHONEST", "got rich")
        tag(c, lt, 2.2, 1400, 330, "HONEST", "still struggling", rot=0.04)
    L.append(Shot(P, 9, 9, 'street', [rich2] + fam, o7, bgargs=dict(mood='day')))

    you4 = C('you', 960, 1.3, pose='idle', expr='neutral', g=[(0.4, 'hold')])
    def o8(c, lt):
        icon(c, lt, 0.3, 1300, 450, 'heart', 1.2)
        caption(c, lt, 0.5, 3.2, "These experiences deserve to be taken seriously", y=150)
    L.append(Shot(P, 10, 10, 'apt', [you4], o8, bgargs=dict(mood='gold')))

    def o9(c, lt):
        flow(c, lt, 0.3, 2.0, "A belief about someone's behavior", "A belief about wealth itself")
        bigword(c, lt, 2.6, 960, 840, "THE SHIFT", 70, (1, 0.86, 0.35))
    L.append(Shot(P, 11, 11, 'plain', [], o9, bgargs=dict(a='4a2e52', b='160c1c')))

    def o10(c, lt):
        qlist(c, lt, 960, 520, "WHAT WE HEARD", [(0.3, "Some people make money by hurting others", None),
                                                  (2.6, "Making money MEANS hurting others", 'x')], w=900, paper=False)
        stamp(c, lt, 2.4, 1330, 300, "BECOMES", rot=0.1)
    L.append(Shot(P, 12, 12, 'plain', [], o10, bgargs=dict(a='3a3a2a', b='14140c')))

    you5 = C('you', 960, 1.3, pose='idle', expr='worried')
    def o11(c, lt):
        icon(c, lt, 0.4, 500, 420, 'house', 1.0); icon(c, lt, 0.8, 1420, 420, 'shield', 1.0)
        stamp(c, lt, 2.4, 960, 170, "MORALLY SUSPICIOUS?", rot=-0.05)
    L.append(Shot(P, 13, 13, 'apt', [you5], o11, bgargs=dict(mood='day')))

    you6 = C('you', 960, 1.3, pose='present', expr='happy', g=[(3.0, 'hold')])
    def o12(c, lt):
        icon(c, lt, 0.1, 420, 300, 'shield', 0.9); tag(c, lt, 0.3, 420, 450, "EMERGENCY", "savings")
        icon(c, lt, 1.6, 1500, 300, 'heart', 0.8); tag(c, lt, 1.8, 1500, 450, "HELP PARENTS")
        icon(c, lt, 3.2, 420, 640, 'house', 0.8); tag(c, lt, 3.4, 420, 780, "A COMFY HOME")
        icon(c, lt, 5.0, 1500, 640, 'briefcase', 0.8); stamp(c, lt, 5.5, 1500, 780, "QUIT THAT JOB", rot=0.06, size=28)
    L.append(Shot(P, 14, 15, 'apt', [you6], o12, bgargs=dict(mood='day')))

    you7 = C('you', 960, 1.3, pose='think', expr='worried')
    def o13(c, lt): speech(c, lt, you7, 0.3, 4.1, "Am I being selfish?", dy=-170, think=True)
    L.append(Shot(P, 16, 16, 'night', [you7], o13))

    def o14(c, lt):
        icon(c, lt, 0.2, 960, 520, 'scale', 2.0)
        bigword(c, lt, 0.8, 960, 220, "FAIRNESS", 96, (1, 0.86, 0.35))
    L.append(Shot(P, 17, 17, 'plain', [], o14, bgargs=dict(a='2e3a5a', b='0c1020')))

    rich3 = C('rich', 960, 1.25, pose='hips', expr='sly')
    f1 = C('friend1', 380, 1.15, pose='think', expr='think'); f2 = C('friend2', 1560, 1.15, pose='cross', expr='think', flip=True)
    def o15(c, lt):
        icon(c, lt, 0.3, 380, 300, 'question', 1); icon(c, lt, 0.6, 1560, 300, 'question', 1)
        caption(c, lt, 0.5, 3.5, "How did they get it?", y=150)
    L.append(Shot(P, 18, 18, 'street', [f1, rich3, f2], o15, bgargs=dict(mood='dusk')))

    rich4 = C('rich', 1450, 1.25, pose='hips', expr='sly', flip=True)
    def o16(c, lt):
        qlist(c, lt, 650, 470, "HOW DID THEY GET RICH?", [(0.1, "Built something useful?", 'q'), (1.83, "Inherited an advantage?", 'q'),
                                                           (3.44, "Took a risk?", 'q'), (3.9, "At someone else's expense?", 'q')], w=760)
    L.append(Shot(P, 19, 22, 'office', [rich4], o16))

    boss2 = C('boss', 700, 1.28, pose='point', expr='angry')
    worker2 = C('worker', 1300, 1.2, pose='sad', expr='sad', flip=True)
    def o17(c, lt):
        caption(c, lt, 0.3, 7.2, "Businesses mistreating workers", y=150)
        stamp(c, lt, 3.8, 1300, 420, "BROKEN PROMISES", rot=-0.06)
    L.append(Shot(P, 23, 23, 'office', [boss2, worker2], o17))

    you8 = C('you', 1250, 1.25, pose='idle', expr='neutral', flip=True)
    fr8 = C('friend1', 640, 1.2, pose='cross', expr='angry')
    def o18(c, lt):
        stamp(c, lt, 0.5, 640, 260, "JUMPING TO CONCLUSIONS", rot=-0.06, size=30)
    L.append(Shot(P, 24, 24, 'street', [fr8, you8], o18, bgargs=dict(mood='dusk')))

    you9 = C('you', 640, 1.25, pose='present', talk=[(0.2, 1.6)], expr='happy')
    fr9 = C('friend2', 1320, 1.2, pose='cross', expr='shock', flip=True, e=[(2.2, 'angry')])
    def o19(c, lt):
        speech(c, lt, you9, 0.1, 5.6, "I want to earn more.", dx=-60, dy=-150)
        speech(c, lt, fr9, 2.3, 5.6, "I'll do anything to get rich!", dx=60, dy=-150, think=True)
        stamp(c, lt, 3.0, 1560, 640, "WHAT THEY HEAR", rot=0.07, size=28)
    L.append(Shot(P, 25, 25, 'street', [you9, fr9], o19, bgargs=dict(mood='dusk')))

    you10 = C('you', 960, 1.3, pose='present', expr='happy', g=[(2.0, 'point'), (4.0, 'hips')])
    def o20(c, lt):
        icon(c, lt, 0.4, 420, 330, 'book', 0.9); tag(c, lt, 0.6, 420, 480, "LEARN A SKILL")
        icon(c, lt, 2.1, 1500, 330, 'handshake', 0.9); tag(c, lt, 2.3, 1500, 480, "NEGOTIATE PAY")
        icon(c, lt, 3.9, 420, 660, 'briefcase', 0.9); tag(c, lt, 4.1, 420, 800, "HONEST BUSINESS")
    L.append(Shot(P, 26, 26, 'office', [you10], o20))

    you11 = C('you', 960, 1.3, pose='hips', expr='neutral')
    def o21(c, lt):
        bigword(c, lt, 0.3, 560, 330, "AMBITION", 80, (1, 0.86, 0.35))
        bigword(c, lt, 1.0, 960, 250, "≠", 110, (1, 1, 1))
        bigword(c, lt, 1.5, 1380, 330, "CHARACTER", 80, (0.75, 0.9, 1))
    L.append(Shot(P, 27, 27, 'street', [you11], o21, bgargs=dict(mood='night')))

    fam2 = [C('dad', 620, 1.15, expr='happy'), C('kid', 860, 1.15, expr='happy'), C('mom', 1100, 1.12, expr='happy'), C('you', 1360, 1.2, expr='happy')]
    def o22(c, lt):
        bigword(c, lt, 0.4, 960, 200, "BELONGING", 100, (1, 0.86, 0.35))
        icon(c, lt, 1.4, 1640, 420, 'heart', 0.9)
    L.append(Shot(P, 28, 28, 'apt', fam2, o22, bgargs=dict(mood='gold', couch_=False)))

    dad3 = C('dad', 560, 1.12, expr='worried'); mom3 = C('mom', 1380, 1.08, expr='worried', flip=True); kid3 = C('kid', 960, 1.15, expr='neutral')
    def o23(c, lt):
        icon(c, lt, 0.5, 720, 760, 'bill', 0.7); icon(c, lt, 0.8, 1200, 760, 'bill', 0.7)
        tag(c, lt, 1.0, 960, 160, "SHARED STRUGGLE", "how families connect")
        icon(c, lt, 7.4, 960, 330, 'heart', 0.9)
        caption(c, lt, 7.2, 10.8, "Same worries. Same sacrifices.", y=980)
    L.append(Shot(P, 29, 30, 'dinner', [dad3, kid3, mom3], o23, fg=table_fg, bgargs=dict(mood='night')))

    fam3 = [C('dad', 360, 1.1, expr='sad'), C('mom', 580, 1.08, expr='sad')]
    you12 = C('you', 1500, 1.3, pose='idle', expr='worried', flip=True)
    def o24(c, lt):
        arrow_label(c, lt, 0.4, 1050, 320, 1360, 420, "MORE SUCCESS")
        caption(c, lt, 1.2, 4.0, "Becoming distant from them?", y=150)
    L.append(Shot(P, 31, 31, 'street', fam3 + [you12], o24, bgargs=dict(mood='dusk')))

    you13 = C('you', 960, 1.3, pose='idle', expr='worried', e=[(2.1, 'sad')])
    f13 = C('friend1', 380, 1.15, pose='cross', expr='angry'); f14 = C('friend2', 1560, 1.15, pose='cross', expr='sly', flip=True)
    def o25(c, lt):
        speech(c, lt, you13, 0.1, 2.0, "Will my friends think I'm showing off?", dy=-170, think=True)
        speech(c, lt, you13, 2.1, 4.5, "Will my family think I feel superior?", dy=-170, think=True)
        speech(c, lt, you13, 4.6, 6.5, "Will they still recognize me?", dy=-170, think=True)
    L.append(Shot(P, 32, 34, 'apt', [f13, you13, f14], o25, bgargs=dict(mood='dusk', couch_=False)))

    you14 = C('you', 960, 1.3, pose='sad', expr='sad')
    def o26(c, lt):
        icon(c, lt, 0.3, 1400, 400, 'heart', 1.1)
        caption(c, lt, 0.5, 4.5, "Guilt can hide a fear of losing connection", y=150)
    L.append(Shot(P, 35, 35, 'night', [you14], o26))

    dad4 = C('dad', 760, 1.25, pose='point', expr='angry', talk=[(0.2, 3.6)])
    you15 = C('you', 1300, 1.25, expr='worried', flip=True)
    def o27(c, lt):
        caption(c, lt, 0.3, 3.8, "Criticism can carry the same fear", y=150)
    L.append(Shot(P, 36, 36, 'apt', [dad4, you15], o27, bgargs=dict(mood='dusk', couch_=False)))

    mom4 = C('mom', 760, 1.25, pose='hips', expr='neutral', talk=[(0.2, 2.6)], e=[(2.8, 'sad')], g=[(2.8, 'sad')])
    you16 = C('you', 1300, 1.25, expr='neutral', flip=True, e=[(3.0, 'sad')])
    def o28(c, lt):
        speech(c, lt, mom4, 0.1, 2.8, "Don't forget where you came from.", dx=0, dy=-140)
        speech(c, lt, mom4, 3.0, 6.3, "When your life changes... will there still be room for us?", dx=60, dy=-160, think=True, maxw=620)
    L.append(Shot(P, 37, 37, 'apt', [mom4, you16], o28, bgargs=dict(mood='gold', couch_=False)))
    return L

# =============================================================== PART 2
def part2():
    P = 1; L = []
    you = C('you', 960, 1.3, pose='think', expr='think')
    def o0(c, lt):
        bigword(c, lt, 0.4, 560, 260, "MORE", 96, (0.7, 0.95, 0.7))
        bigword(c, lt, 1.2, 960, 220, "vs", 64)
        bigword(c, lt, 2.0, 1380, 260, "TOO MUCH", 96, (1, 0.6, 0.55))
    L.append(Shot(P, 0, 0, 'street', [you], o0, bgargs=dict(mood='dusk')))

    you2 = C('you', 1450, 1.25, pose='idle', expr='neutral', flip=True, e=[(2.9, 'think')])
    def o1(c, lt):
        qlist(c, lt, 640, 500, "WHERE'S THE LINE?", [(0.1, "Cover rent", 'check'), (1.2, "Emergency fund", 'check'),
              (2.9, "A bigger house", 'q'), (4.0, "Retire early", 'q'), (5.1, "A successful business", 'q')], w=700)
    L.append(Shot(P, 1, 3, 'apt', [you2], o1, bgargs=dict(mood='day', couch_=False)))

    a = C('friend1', 480, 1.18, expr='neutral'); b = C('you', 960, 1.22, expr='neutral'); d = C('friend2', 1440, 1.18, expr='neutral', flip=True)
    def o2(c, lt):
        caption(c, lt, 0.4, 5.0, "Money means different things to different people", y=150)
        icon(c, lt, 5.1, 480, 330, 'shield', 0.9); bigword(c, lt, 5.2, 480, 470, "SAFETY", 50, (0.75, 0.9, 1))
        icon(c, lt, 7.3, 960, 300, 'clock', 0.9); bigword(c, lt, 7.4, 960, 440, "FREEDOM", 50, (0.7, 0.95, 0.7))
        icon(c, lt, 8.3, 1440, 330, 'trophy', 0.9); bigword(c, lt, 8.4, 1440, 470, "RECOGNITION", 50, (1, 0.86, 0.35))
    L.append(Shot(P, 4, 7, 'street', [a, b, d], o2, bgargs=dict(mood='gold')))

    you3 = C('you', 960, 1.3, pose='hips', expr='happy', e=[(3.0, 'sly')])
    fam = C('mom', 380, 1.12, expr='happy'); dbt = C('friend1', 1560, 1.15, pose='cross', expr='angry', flip=True)
    def o3(c, lt):
        caption(c, lt, 0.2, 2.0, "Motives can overlap", y=150)
        icon(c, lt, 2.2, 380, 330, 'heart', 0.8); tag(c, lt, 2.4, 380, 470, "PROVIDE")
        tag(c, lt, 4.0, 1560, 330, "THE DOUBTERS", "prove them wrong", rot=0.05)
    L.append(Shot(P, 8, 9, 'apt', [fam, you3, dbt], o3, bgargs=dict(mood='dusk', couch_=False)))

    you4 = C('you', 960, 1.3, pose='think', expr='think')
    def o4(c, lt): bigword(c, lt, 0.5, 960, 220, "WHAT IS THE MONEY FOR?", 76, (1, 0.86, 0.35))
    L.append(Shot(P, 10, 10, 'night', [you4], o4))

    you5 = C('you', 1450, 1.25, pose='think', expr='think', flip=True, e=[(5.9, 'worried')])
    def o5(c, lt):
        qlist(c, lt, 640, 480, "ASK YOURSELF", [(0.1, "Will it solve a practical problem?", 'q'), (3.84, "Will it give me control of my time?", 'q'),
              (5.86, "Will it finally make me feel worthy?", 'q')], w=820)
    L.append(Shot(P, 11, 13, 'night', [you5], o5))

    you6 = C('you', 960, 1.3, pose='hold', expr='neutral')
    def o6(c, lt):
        icon(c, lt, 0.4, 1320, 520, 'book', 1.0)
        caption(c, lt, 0.4, 4.5, "Your motivation shows if the goal gives you what you need", y=150)
    L.append(Shot(P, 14, 14, 'apt', [you6], o6, bgargs=dict(mood='gold', couch_=False)))

    def o7(c, lt):
        icon(c, lt, 0.3, 960, 560, 'warning', 2.2)
        bigword(c, lt, 0.8, 960, 240, "IT CAN BECOME HARMFUL", 80, (1, 0.6, 0.55))
    L.append(Shot(P, 15, 15, 'street', [], o7, bgargs=dict(mood='night')))

    boss = C('boss', 960, 1.3, pose='hips', expr='sly')
    def o8(c, lt):
        stamp(c, lt, 0.4, 470, 320, "EXCUSING DISHONESTY", rot=-0.07, size=30)
        stamp(c, lt, 3.2, 1460, 440, "SACRIFICING RELATIONSHIPS", rot=0.06, size=30)
        stamp(c, lt, 6.4, 520, 640, "PEOPLE = PROFIT", rot=0.05, size=34)
    L.append(Shot(P, 16, 17, 'office', [boss], o8))

    you7 = C('you', 1450, 1.25, flip=True, expr='neutral')
    def o9(c, lt):
        counter(c, lt, 0.1, 2.0, 640, 420, 0, 250000)
        bigword(c, lt, 0.9, 640, 600, "≠ CHARACTER", 70, (1, 1, 1))
    L.append(Shot(P, 18, 18, 'office', [you7], o9))

    you8 = C('you', 1480, 1.25, pose='think', flip=True, expr='think')
    def o10(c, lt):
        qlist(c, lt, 660, 490, "LOOK AT THE CHOICES", [(1.2, "How are they earning it?", 'q'), (5.33, "Who benefits?", 'q'),
              (6.66, "Who bears the cost?", 'q'), (7.84, "Are they being honest?", 'q')], w=760)
    L.append(Shot(P, 19, 22, 'office', [you8], o10))

    you9 = C('you', 1450, 1.25, pose='present', flip=True, expr='neutral')
    def o11(c, lt):
        card(c, lt, 0.3, 660, 470, "FINISH THIS SENTENCE", ["“I want more money because…”"], w=780, paper=False)
        stamp(c, lt, 4.0, 660, 720, "BE SPECIFIC", rot=-0.06)
    L.append(Shot(P, 23, 24, 'apt', [you9], o11, bgargs=dict(mood='day', couch_=False)))

    you10 = C('you', 960, 1.3, pose='sad', expr='worried')
    def o12(c, lt):
        icon(c, lt, 0.3, 1380, 460, 'bill', 1.2); icon(c, lt, 1.4, 540, 420, 'warning', 0.9)
        caption(c, lt, 0.5, 4.7, "One unexpected bill away from panic", y=150)
    L.append(Shot(P, 25, 25, 'night', [you10], o12))

    you11 = C('you', 860, 1.28, pose='idle', expr='happy'); kid = C('kid', 1220, 1.2, pose='wave', expr='happy', flip=True)
    def o13(c, lt):
        icon(c, lt, 0.3, 1560, 300, 'clock', 0.9); tag(c, lt, 0.5, 520, 300, "MORE TIME", "with your kids")
    L.append(Shot(P, 26, 26, 'apt', [you11, kid], o13, bgargs=dict(mood='gold')))

    you12 = C('you', 960, 1.3, pose='present', expr='happy')
    def o14(c, lt):
        icon(c, lt, 0.2, 1400, 420, 'gear', 1.1); tag(c, lt, 0.4, 500, 330, "BUILD SOMETHING", "you care about")
    L.append(Shot(P, 27, 27, 'office', [you12], o14))

    you13 = C('you', 1450, 1.25, pose='hips', flip=True, expr='neutral')
    def o15(c, lt):
        qlist(c, lt, 660, 500, "MY BOUNDARIES", [(3.9, "Promises I won't make", 'x'), (5.85, "Work I won't accept", 'x'),
              (7.7, "Relationships I'll protect", 'check')], w=740, paper=False)
        icon(c, lt, 0.4, 1450, 220, 'shield', 0.8)
    L.append(Shot(P, 28, 31, 'apt', [you13], o15, bgargs=dict(mood='dusk', couch_=False)))

    you14 = C('you', 960, 1.3, pose='hold', expr='happy')
    def o16(c, lt):
        icon(c, lt, 0.2, 500, 420, 'heart', 0.9); caption(c, lt, 0.3, 4.1, "Grateful for what you have AND wanting better", y=150)
        icon(c, lt, 4.3, 1420, 420, 'scale', 1.0); caption(c, lt, 4.3, 7.6, "Caring about inequality AND asking for fair pay", y=150)
        icon(c, lt, 7.9, 500, 420, 'trophy', 0.9); caption(c, lt, 7.8, 11.4, "Chasing success AND staying accountable", y=150)
    L.append(Shot(P, 32, 34, 'apt', [you14], o16, bgargs=dict(mood='gold', couch_=False)))

    def o17(c, lt):
        bigword(c, lt, 0.3, 960, 420, "So why do people think", 64)
        bigword(c, lt, 1.0, 960, 540, "MAKING MORE MONEY IS EVIL?", 80, (1, 0.6, 0.55))
    L.append(Shot(P, 35, 35, 'plain', [], o17, bgargs=dict(a='4a2028', b='12080a')))

    f1 = C('worker', 480, 1.15, expr='sad'); f2 = C('dad', 960, 1.18, expr='neutral'); f3 = C('mom', 1440, 1.15, expr='worried', flip=True)
    def o18(c, lt):
        tag(c, lt, 0.2, 480, 300, "SAW REAL HARM")
        tag(c, lt, 2.7, 960, 260, "INHERITED BELIEFS")
        tag(c, lt, 5.6, 1440, 300, "FEAR OF CHANGE", "& losing people", rot=0.04)
    L.append(Shot(P, 36, 38, 'street', [f1, f2, f3], o18, bgargs=dict(mood='dusk')))

    def o19(c, lt):
        icon(c, lt, 0.2, 960, 560, 'scale', 2.0)
        caption(c, lt, 0.4, 2.6, "Understanding helps us judge ambition thoughtfully", y=180)
    L.append(Shot(P, 39, 39, 'plain', [], o19, bgargs=dict(a='2e3a5a', b='0c1020')))

    you15 = C('you', 960, 1.25, pose='hips', expr='neutral')
    def o20(c, lt):
        bigword(c, lt, 4.5, 960, 200, "What are you willing", 70)
        bigword(c, lt, 5.6, 960, 300, "to do for it?", 90, (1, 0.86, 0.35))
    L.append(Shot(P, 40, 40, 'roof', [you15], o20, zoom=(1.0, 1.18), bgargs=dict(mood='dusk')))
    return L

# --------------------------------------------------------------- render
def render(shots, dur, out, stills=None):
    def frame(t):
        surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
        sh = next((s for s in shots if s.t0 <= t < s.t1), shots[-1])
        sh.render(c, t)
        f = 0
        if sh is not shots[0]: f = max(f, 1 - ease((t - sh.t0)/0.25))
        if sh is not shots[-1]: f = max(f, ease((t - (sh.t1 - 0.2))/0.2))
        f = max(f, 1 - ease(t/0.5), ease((t - (dur - 0.8))/0.8))
        if f > 0: c.set_source_rgba(0, 0, 0, f*0.9 if 0.5 < t < dur - 0.8 else f); c.paint()
        return surf
    if stills:
        return [frame(t) for t in stills]
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    n = int(dur*FPS)
    for i in range(n):
        p.stdin.write(bytes(frame(i/FPS).get_data()))
    p.stdin.close(); p.wait()

if __name__ == '__main__':
    part = int(sys.argv[1]); mode = sys.argv[2]
    shots = part1() if part == 1 else part2()
    dur = TIM[part-1][-1]['t1']
    if mode == 'qc':
        from PIL import Image
        ts = [s.t0 + (s.t1 - s.t0)*0.75 for s in shots]
        ims = render(shots, dur, None, ts)
        cols = 4; rows = math.ceil(len(ims)/cols)
        sheet = Image.new('RGB', (cols*480, rows*270))
        for i, s in enumerate(ims):
            s.write_to_png('/tmp/q.png'); im = Image.open('/tmp/q.png').resize((480, 270))
            sheet.paste(im, ((i % cols)*480, (i//cols)*270))
        sheet.save(f'qc{part}.jpg', quality=85)
    else:
        render(shots, dur, f'part{part}_video.mp4')
