"""A Day in Vienna 全片（畫風 J 剪紙人偶）。
python src/film.py --stills          → renders/film/check_*.jpg（每句一格＋插入鏡頭）
python src/film.py [--nosub] [v1]    → renders/film/vienna_<ver>_sub_1080p.mp4（--nosub 為聽力版 _listen）
時間軸＝BEATS（依序排），每個 beat 是：clip（3D／Seedance 影片）、stage（人偶對話）、insert（道具特寫）。
3D 影片還沒正式渲好的鏡頭，自動用 1 秒試渲拉長當替代（列印 PLACEHOLDER）。
"""
import sys, os, math, json, subprocess, glob
import numpy as np, cairo, soundfile as sf
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..'); sys.path.insert(0, HERE)
import cast as K, lipsync as L, pilot_s2 as PS, qc_props as QP, piano_synth
from cast import E, hexc, rrect, poly, stroke, fs, LINE
from qc_costume import garden_bg, room_bg, label
QP.frame_label = lambda *a, **k: None
QP.garden_bg = lambda c, t=0: room_bg(c)            # 直笛特寫改在 Mozart 的房間
W, H, FPS = 1920, 1080, 30
SC = 0.86                                           # 人偶縮放
KIDS = ['mia', 'amber', 'teddy', 'edison', 'rocky']
HGT = dict(abu=468, mozart=549, beethoven=549)       # 其他＝402（已乘 SC）
NOSUB = '--nosub' in sys.argv
LN = {}; ENV = None


def hgt(w): return HGT.get(w, 402)
def wt(lid, i): return LN[lid]['words'][min(i, len(LN[lid]['words']) - 1)][0]
def on(lid, t, pre=0.15, post=0.25): return LN[lid]['t0'] - pre <= t <= LN[lid]['t1'] + post
def after(lid, t, d=0.0): return t >= LN[lid]['t1'] + d
SPK = {}
def speakers(lid):
    if lid == 'L11': return KIDS
    if lid == 'L21': return KIDS + ['abu', 'lena']
    return SPK[lid]


def mouth(who, t):
    for lid, ln in LN.items():
        if who in speakers(lid) and L.speaking(ln['track'], t): return L.mouth_at(ln['track'], ENV, t), True
    return 'X', False


# ======================= 素材 =======================
def get_clip(name):
    if name.startswith('V'):
        return PS.clip_frames(name, os.path.join(ROOT, 'seedance', name, '720p_1.mp4')), True
    full = os.path.join(ROOT, 'renders', '3d', 'full', name + '.mp4')
    if os.path.exists(full): return PS.clip_frames(name + '_full', full), True
    print('PLACEHOLDER 3D clip', name); return PS.clip_frames(name + '_1s', os.path.join(ROOT, 'renders', '3d', 'test1s', name + '_1s.mp4')), False


CLIPS = {}
def clip(name):
    if name not in CLIPS: CLIPS[name] = get_clip(name)
    return CLIPS[name]


_img = {}
def image(path):
    if path not in _img: _img[path] = cairo.ImageSurface.create_from_png(path)
    return _img[path]


# ======================= 圖示字卡（v2：字卡上有圖，學生看圖就懂單字） =======================
def icon_tram(c, u):
    """紅色電車側面圖，寬約 2.3u、高約 1.3u，原點在中心。"""
    w, h = 2.3*u, 0.86*u; y0 = -0.42*u
    c.new_path(); c.move_to(-0.25*u, y0 - 0.02*u); c.line_to(0.0, y0 - 0.30*u); c.line_to(0.25*u, y0 - 0.02*u); stroke(c, 3.0)        # 集電弓
    c.new_path(); c.move_to(-0.42*u, y0 - 0.30*u); c.line_to(0.42*u, y0 - 0.30*u); stroke(c, 3.0)
    rrect(c, -w/2 + 0.08*u, y0 - 0.06*u, w - 0.16*u, 0.14*u, 0.05*u); fs(c, hexc('b9bec4'), 2.6)                                     # 車頂
    rrect(c, -w/2, y0, w, h, 0.16*u); fs(c, hexc('f4f1ea'), 3.2)                                                                    # 上半（米白）
    c.save(); rrect(c, -w/2, y0, w, h, 0.16*u); c.clip(); c.rectangle(-w/2, y0 + h*0.52, w, h); c.set_source_rgba(*hexc('d8332e')); c.fill(); c.restore()
    rrect(c, -w/2, y0, w, h, 0.16*u); stroke(c, 3.2)
    for k in range(4):                                                                                                               # 車窗
        rrect(c, -w/2 + 0.16*u + k*0.52*u, y0 + 0.10*u, 0.40*u, 0.30*u, 0.05*u); fs(c, hexc('8fc4e6'), 2.4)
    rrect(c, -0.13*u, y0 + h*0.50, 0.26*u, h*0.46, 0.03*u); fs(c, hexc('a81e24'), 2.2)                                               # 車門
    c.new_path(); c.arc(w/2 - 0.12*u, y0 + h*0.72, 0.06*u, 0, math.tau); fs(c, hexc('fff3b8'), 2)                                    # 車燈
    for x in (-0.68*u, 0.68*u): c.new_path(); c.arc(x, y0 + h + 0.02*u, 0.15*u, 0, math.tau); fs(c, hexc('2a2f3a'), 2.6)             # 輪子
    c.new_path(); c.move_to(-w/2 - 0.12*u, y0 + h + 0.19*u); c.line_to(w/2 + 0.12*u, y0 + h + 0.19*u); stroke(c, 4, hexc('4a4a52'))  # 軌道


def icon_bike(c, u):
    """紅色腳踏車側面圖，寬約 2.1u，原點在中心。"""
    R = 0.40*u; y = 0.22*u; xa, xb = -0.62*u, 0.62*u
    for x in (xa, xb): c.new_path(); c.arc(x, y, R, 0, math.tau); stroke(c, 7, hexc('2a2a30')); c.new_path(); c.arc(x, y, 0.05*u, 0, math.tau); fs(c, hexc('8a8f96'), 2)
    bb = (-0.02*u, y); seat = (-0.26*u, -0.34*u); head = (0.44*u, -0.40*u)
    for a, b in ((bb, (xa, y)), (bb, seat), (seat, (xa, y)), (seat, (head[0] - 0.05*u, head[1] + 0.10*u)), (bb, (head[0] - 0.02*u, head[1] + 0.16*u)), (head, (xb, y))):
        c.new_path(); c.move_to(*a); c.line_to(*b); stroke(c, 10, LINE); c.new_path(); c.move_to(*a); c.line_to(*b); stroke(c, 5.5, hexc('d8433a'))
    rrect(c, seat[0] - 0.18*u, seat[1] - 0.10*u, 0.34*u, 0.10*u, 0.04*u); fs(c, hexc('3a2a24'), 2.4)
    c.new_path(); c.move_to(*head); c.line_to(head[0] - 0.02*u, head[1] - 0.16*u); stroke(c, 6, hexc('8a8f96'))
    rrect(c, head[0] - 0.18*u, head[1] - 0.22*u, 0.32*u, 0.08*u, 0.04*u); fs(c, hexc('3a2a24'), 2.2)


def icon_card(c, t, t0, x, y, txt, icon, rot=-0.03, size=76, t1=None):
    """圖示＋大字的字卡：紙色底、紅色雙框（和印章同風格），蓋章式彈出。"""
    if t < t0 or (t1 is not None and t > t1): return
    sc = E.lerp(2.0, 1, E.ease((t - t0)/0.18)) if t - t0 < 0.18 else 1
    a = E.clamp((t - t0)/0.12)*(1 if t1 is None else E.clamp((t1 - t)/0.2))
    col = (0.78, 0.15, 0.13); u = size*1.3                           # 圖示比字高，一眼先看到圖
    E.font(c, size); tw = c.text_extents(txt).x_advance; iw = 2.6*u; w = iw + tw + 76; h = size*2.7
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc)
    c.push_group()
    rrect(c, -w/2 + 8, -h/2 + 10, w, h, 10); c.set_source_rgba(0, 0, 0, 0.22); c.fill()
    rrect(c, -w/2, -h/2, w, h, 10); c.set_source_rgba(0.98, 0.95, 0.88, 1); c.fill()
    for o in (0, 10):
        rrect(c, -w/2 + o/2, -h/2 + o/2, w - o, h - o, 10); c.set_source_rgba(*col, 1); c.set_line_width(6 if o == 0 else 3); c.stroke()
    c.save(); c.translate(-w/2 + 22 + iw/2, 0.04*u); icon(c, u); c.restore()
    c.move_to(-w/2 + 22 + iw + 14, size*0.36); c.set_source_rgba(*col, 1); E.font(c, size); c.show_text(txt)
    c.pop_group_to_source(); c.paint_with_alpha(a)
    c.restore()


def hud_tram3d(c, t, B):
    """電車停好之後，在電車旁用大標籤標出 tram，箭頭指到車身（圖和字對在一起）。"""
    t0 = B['t0'] + 3.25
    if t < t0: return
    k = E.back_out((t - t0)/0.28); a = E.clamp((t - t0)/0.15); x, y = 470, 215; tx, ty = 845, 400
    c.push_group()
    e = E.ease((t - t0 - 0.15)/0.3); ex, ey = E.lerp(x + 120, tx, e), E.lerp(y + 50, ty, e)
    for wd, col in ((16, (1, 1, 1)), (8, (0.78, 0.15, 0.13))):                       # 白邊紅箭頭
        c.new_path(); c.move_to(x + 120, y + 50); c.line_to(ex, ey); stroke(c, wd, col)
        if e > 0.95:
            an = math.atan2(ty - y - 50, tx - x - 120)
            for da in (2.55, -2.55): c.new_path(); c.move_to(tx, ty); c.line_to(tx + 44*math.cos(an + da), ty + 44*math.sin(an + da)); stroke(c, wd, col)
    c.save(); c.translate(x, y); c.rotate(-0.04); c.scale(k, k)
    E.font(c, 92); tw = c.text_extents('tram').x_advance; w, h = tw + 80, 150
    rrect(c, -w/2, -h/2, w, h, 16); c.set_source_rgba(0.98, 0.95, 0.88, 1); c.fill_preserve(); stroke(c, 6, (0.78, 0.15, 0.13))
    c.move_to(-tw/2, 30); c.set_source_rgba(0.78, 0.15, 0.13, 1); c.show_text('tram'); c.restore()
    c.pop_group_to_source(); c.paint_with_alpha(a)


# ======================= 背景 =======================
def box_bg(c, t):
    """歌劇院包廂：深紅牆、金色拱、布幕。"""
    c.set_source_rgba(*hexc('5a1420')); c.paint()
    g = cairo.RadialGradient(960, 300, 60, 960, 300, 900); g.add_color_stop_rgba(0, 1, 0.85, 0.5, 0.30); g.add_color_stop_rgba(1, 1, 0.85, 0.5, 0); c.set_source(g); c.paint()
    for x in (200, 960, 1720):
        rrect(c, x - 34, 60, 68, 760, 10); fs(c, hexc('d9b44a'))
        c.rectangle(x - 54, 40, 108, 34); fs(c, hexc('e8c868'))
    for x0, x1 in ((234, 926), (994, 1686)):
        c.new_path(); c.move_to(x0, 320); c.curve_to(x0, 60, x1, 60, x1, 320); c.line_to(x1, 90); c.line_to(x0, 90); c.close_path(); fs(c, hexc('7a1c2a'))
        for s, xx in ((1, x0), (-1, x1)):
            c.new_path(); c.move_to(xx, 90); c.curve_to(xx + s*90, 260, xx + s*40, 480, xx + s*110, 700); c.line_to(xx, 700); c.close_path(); fs(c, hexc('a82434'))
    c.rectangle(0, 880, W, 200); c.set_source_rgba(*hexc('3a0c16')); c.fill()


def box_front(c, t, B):
    """包廂前緣（擋住腿）：金色欄杆＋紅絨。"""
    c.rectangle(0, 790, W, 320); fs(c, hexc('8a1c2c'))                 # 欄杆在腰部高度：看得到上半身和手
    c.rectangle(0, 770, W, 44); fs(c, hexc('e8c868'))
    for i in range(13):
        rrect(c, 60 + i*150, 840, 110, 130, 14); fs(c, hexc('a82434'), 2.6)
    c.rectangle(0, 1000, W, 30); fs(c, hexc('d9b44a'))


def room_scene_bg(c, t):
    room_bg(c)
    # Mozart 的書桌（譜紙＋墨水瓶）與 Beethoven 身後的鋼琴側影
    rrect(c, 1210, 640, 300, 26, 6); fs(c, hexc('8a5a2c'))
    for x in (1226, 1478): c.rectangle(x, 666, 16, 156); fs(c, hexc('6a3e24'))
    poly(c, [(1250, 640), (1370, 640), (1384, 610), (1264, 610)]); fs(c, hexc('f4e8c8'), 2.4)
    rrect(c, 1420, 606, 34, 34, 6); fs(c, hexc('2e3240'), 2.4)
    c.new_path(); c.move_to(1437, 606); c.line_to(1470, 520); stroke(c, 5, hexc('fbfaf6')); c.new_path(); c.move_to(1437, 606); c.line_to(1470, 520); stroke(c, 1.4)
    E.shade(c, lambda: (c.new_path(), c.move_to(1560, 560), c.line_to(1920, 560), c.line_to(1920, 700), c.line_to(1560, 700), c.close_path()), lambda: c.rectangle(1560, 660, 400, 40), hexc('241e22'), hexc('15111a'))
    poly(c, [(1600, 558), (1920, 558), (1920, 380)]); fs(c, hexc('2e272c'))
    for x in (1590, 1880): c.rectangle(x, 700, 22, 122); fs(c, hexc('241e22'))


def dusk_bg(c, t):
    g = cairo.LinearGradient(0, 0, 0, 900)
    for k, col in ((0, '3d2a5c'), (0.45, 'c4566a'), (0.8, 'f6a65a'), (1, 'ffd28a')): g.add_color_stop_rgba(k, *hexc(col))
    c.set_source(g); c.paint()
    E.glow(c, 960, 560, 330, (1.0, 0.8, 0.45), 0.5, 5)
    c.new_path(); c.arc(960, 560, 300, 0, math.tau); c.set_source_rgba(*hexc('ffe2a0')); c.fill()
    dk = hexc('6a3a5a')
    c.save(); c.translate(960, 800)                     # 宮殿剪影
    c.rectangle(-700, -150, 1400, 150); c.rectangle(-190, -250, 380, 250); c.set_source_rgba(*dk); c.fill()
    poly(c, [(-210, -250), (0, -320), (210, -250)]); c.set_source_rgba(*dk); c.fill()
    c.new_path(); c.arc(0, -330, 50, math.pi, 0); c.fill()
    c.restore()
    for i in range(-1, 22):
        c.new_path(); c.arc(i*95, 810, 60, 0, 6.3); c.set_source_rgba(*hexc('2a1a2e')); c.fill()
    c.rectangle(0, 810, W, 300); c.set_source_rgba(*hexc('1c1220')); c.fill()


BK = 0.8; CRANK = 46; BB_Y = -88; SEAT_TOP = -222          # 兒童車：縮小 0.8、坐墊放低（腳踩得到踏板）
def bike(c, x, y, roll, crank=0.0):
    """側面腳踏車（車頭朝右）。原點＝兩輪中間的地面。roll＝輪子轉角，crank＝曲柄角。"""
    c.save(); c.translate(x, y); c.scale(BK, BK)
    R = 92; fw, rw = 150, -150; hub = -R
    for wx in (rw, fw):
        c.new_path(); c.arc(wx, hub, R, 0, math.tau); stroke(c, 13, hexc('2a2a30')); c.new_path(); c.arc(wx, hub, R - 9, 0, math.tau); stroke(c, 3, hexc('c8ccd2'))
        for k in range(8):
            a = roll + k*math.pi/4; c.new_path(); c.move_to(wx, hub); c.line_to(wx + (R - 10)*math.cos(a), hub + (R - 10)*math.sin(a)); stroke(c, 2, hexc('b0b4ba'))
        c.new_path(); c.arc(wx, hub, 9, 0, math.tau); fs(c, hexc('8a8f96'), 2)
    red = hexc('d8433a'); bb = (0, BB_Y); seat = (-62, SEAT_TOP + 20); head = (112, -262)
    for a, b in ((bb, (rw, hub)), (bb, seat), (seat, (rw, hub)), (seat, (head[0] - 14, head[1] + 26)), (bb, (head[0] - 6, head[1] + 44)), (head, (fw, hub))):
        c.new_path(); c.move_to(*a); c.line_to(*b); stroke(c, 15, LINE); c.new_path(); c.move_to(*a); c.line_to(*b); stroke(c, 9, red)
    rrect(c, seat[0] - 44, seat[1] - 20, 82, 20, 9); fs(c, hexc('3a2a24'))
    c.new_path(); c.move_to(head[0], head[1]); c.line_to(head[0] - 4, head[1] - 40); stroke(c, 10, hexc('8a8f96'))
    rrect(c, head[0] - 40, head[1] - 52, 74, 16, 8); fs(c, hexc('3a2a24'))                      # 握把（朝騎士）
    c.new_path(); c.arc(*bb, 22, 0, math.tau); fs(c, hexc('c8ccd2'), 2.6)
    for s in (-1, 1):
        px, py = bb[0] + s*CRANK*math.cos(crank), bb[1] + s*CRANK*math.sin(crank)
        c.new_path(); c.move_to(*bb); c.line_to(px, py); stroke(c, 7, hexc('8a8f96')); rrect(c, px - 22, py - 7, 44, 14, 4); fs(c, hexc('3a2a24'), 2)
    rrect(c, head[0] - 2, head[1] + 2, 60, 46, 10); fs(c, hexc('c99a4a'))                          # 車籃
    c.restore()


# ======================= 場景動作（act 回傳要覆寫的 draw 參數） =======================
def act_garden(who, t, B):
    o = {}
    if who != 'lena':
        names = dict(amber=0, teddy=1, mia=2, edison=3, rocky=4, abu=7)
        tn = wt('N02', names[who])
        if tn <= t <= tn + 0.9: o.update(pose='wave', expr='excited')
        if who == 'amber' and on('L01', t): o.update(pose='cheer', expr='excited')
        if on('L01', t) and who != 'amber': o.update(expr='excited')
        if who == 'teddy' and on('L02', t, post=0.8): o.update(pose='point', expr='excited')
        if LN['N03']['t0'] <= t < LN['L03']['t0']: o.update(expr='surprised')
        if who == 'mia' and on('L04', t): o.update(pose='present')
        if after('L06', t, -0.4): o.update(pose='cheer', expr='excited')
        return o
    # Lena：坐在坐墊上踩踏板騎進來（右手扶把、左手揮手）→ 停車 → 下車站到車旁
    t_in, t_stop, bx, crank = ride(t, B)
    if t < t_in: return dict(hide=True)
    seat_x, oy = bx - 50*BK, B['ground'] + SEAT_TOP*BK + 178*SC            # 臀部（角色座標 y=-178）落在坐墊上
    if t < t_stop + 0.15:
        feet = {}
        for s in (-1, 1):                                                   # 兩腳各踩一個踏板，跟著曲柄轉
            px = bx + s*CRANK*BK*math.cos(crank); py = B['ground'] + (BB_Y + s*CRANK*math.sin(crank))*BK
            feet[s] = ((px - seat_x)/SC, (py - 9 - 26*SC - oy)/SC)
        grip = ((bx + (112 - 6)*BK - seat_x)/SC, (B['ground'] + (-262 - 46)*BK - oy)/SC)
        return dict(x=seat_x, y=oy, feet=feet, hands={1: grip, -1: (-(46 + 70), -310 - 60 + math.sin(t*9)*12)}, grips=(1,), expr='excited')
    t_off = t_stop + 0.6; k = E.ease((t - t_stop - 0.15)/(t_off - t_stop - 0.15))   # 下車：小跳到車的右邊落地
    o = dict(x=E.lerp(seat_x, B['lenax'], k), y=E.lerp(oy, B['ground'], k) - 40*math.sin(k*math.pi))
    if on('L03', t): o.update(pose='wave')
    if on('L05', t): o.update(hands={-1: (-(46 + 100), -305)}, expr='happy')          # 左手指向腳踏車
    if on('L06', t): o.update(pose='point', expr='excited')
    return o


def ride(t, B):
    """回傳 (進場時間, 停車時間, 車的 x, 曲柄角)。輪子與曲柄跟著位移轉（不打滑）。"""
    t_in, t_stop = LN['N03']['t0'] - 0.3, LN['N03']['t1'] + 0.1
    bx = E.lerp(-120, B['bikex'], 1 - (1 - E.clamp((t - t_in)/(t_stop - t_in)))**1.6)
    return t_in, t_stop, bx, (bx + 120)/(92*BK)*0.42


def back_garden(c, t, B):
    t_in, t_stop, bx, crank = ride(t, B)
    if t < t_in: return
    bike(c, bx, B['ground'], bx/(92*BK), crank)


def front_garden(c, t, B):
    for who, i in dict(amber=0, teddy=1, mia=2, edison=3, rocky=4, abu=7).items():
        tn = wt('N02', i)
        if tn <= t <= LN['L01']['t0'] - 0.1:
            k = E.back_out((t - tn)/0.25); x = dict(B['cast'])[who]
            c.save(); c.translate(x, B['ground'] - hgt(who) - 34); c.scale(k, k); label(c, 0, 0, K.NAMES[who], 34); c.restore()
    if LN['L03']['t0'] + 0.3 <= t <= LN['L04']['t0']:
        k = E.back_out((t - LN['L03']['t0'] - 0.3)/0.25); c.save(); c.translate(B['lenax'], B['ground'] - 402 - 34); c.scale(k, k); label(c, 0, 0, 'Lena', 34); c.restore()


def hud_garden(c, t, B):
    # 句 2：右上角彈出高音譜號花圃的小畫面（取自 3D 花園鏡頭最後一格）
    t0 = wt('L02', 2) - 0.05; t1 = LN['L02']['t1'] + 1.0
    if t0 <= t <= t1:
        fl, _ = clip('s0'); k = E.back_out((t - t0)/0.3)*(1 - E.ease((t - t1 + 0.25)/0.25))
        w, h = 480, 270; cx, cy = 1600, 185
        c.save(); c.translate(cx, cy); c.rotate(0.04); c.scale(k, k)
        rrect(c, -w/2 - 14, -h/2 - 14, w + 28, h + 28, 16); fs(c, hexc('fbf6ea'))
        c.save(); rrect(c, -w/2, -h/2, w, h, 8); c.clip(); c.translate(-w/2, -h/2); c.scale(w/1000, w/1000); c.set_source_surface(image(fl[-1]), -460, -470); c.paint(); c.restore()
        rrect(c, -w/2, -h/2, w, h, 8); stroke(c, 3.2); c.restore()
    icon_card(c, t, wt('L05', 3) - 0.05, 1100, 132, 'BY BIKE', icon_bike, t1=LN['L06']['t0'] + 0.2)


def act_stop(who, t, B):
    o = {}; look = t >= wt('L08', 6) - 0.1                                      # "Look!"
    if who == 'rocky' and LN['L07']['t0'] - 0.3 <= t <= LN['L08']['t0'] + 0.4: o.update(pose='chin', expr='think')
    if who == 'edison' and t >= LN['L08']['t0'] - 0.1: o.update(pose='point' if look else 'present')
    if look and who != 'edison': o.update(expr='surprised' if t < LN['L08']['t1'] + 0.5 else 'excited')
    if look and who in ('teddy', 'abu') and t > LN['L08']['t1'] + 0.2: o.update(pose='cheer')
    return o


def act_box(who, t, B):
    o = {}
    if who == 'amber' and on('L09', t): o.update(pose='cheer', expr='excited')
    if on('L09', t) and who != 'amber': o.update(expr='happy')
    if B['n'] == 'box2':
        if who == 'abu':
            if on('L10', t): o.update(pose='cheer')
            if t >= wt('N07', 1) - 0.1: o.update(hands={1: (10, -255)})                # 右手按胸前按鈕
        elif t >= wt('N07', 3) - 0.2: o.update(expr='surprised')
    return o


def front_box2(c, t, B):
    tb = wt('N07', 3)                                                                    # "button"
    if t >= tb:
        x = dict(B['cast'])['abu']; k = E.clamp((t - tb)/0.5)
        E.glow(c, x, B['ground'] - 255*SC, 30 + 90*k, (0.4, 0.9, 1.0), 0.8, 5)


def act_room(who, t, B):
    o = {}; n = B['n']
    if n == 'room1':
        ta = LN['N08']['t0']
        if who in KIDS + ['abu']:
            i = (KIDS + ['abu']).index(who); k = E.back_out((t - ta - 0.15 - i*0.08)/0.3)
            if t < ta + 0.15 + i*0.08: return dict(hide=True)
            o.update(scale=SC*k)
            if on('L11', t): o.update(pose='wave', expr='excited')
        if who == 'mozart':
            if LN['N08']['t0'] <= t < LN['L11']['t0']: o.update(expr='surprised')
            if on('L12', t): o.update(pose='present' if t >= wt('L12', 2) else 'wave')
        if who == 'beethoven' and t >= wt('L12', 4): o.update(pose='wave')
        if who == 'abu' and on('L13', t): o.update(pose='present')
        if who == 'beethoven' and on('L14', t): o.update(pose='present', expr='happy')
    if n == 'room2':
        if who == 'edison' and on('L15', t): o.update(pose='point')
        if who == 'beethoven' and on('L16', t): o.update(hands={-1: (-(56 + 150), -505 + 20)})     # 左手指向 Mozart
        if who == 'mozart' and on('L16', t): o.update(pose='hips', expr='excited')
    if n == 'room3':
        if who == 'mozart':
            if on('N09', t): o.update(pose='chin', expr='think')
            if on('L17', t): o.update(hands={-1: (-(56 + 170), -505 + 30)}, expr='excited')        # 指向孩子們
        if who == 'amber' and on('L18', t): o.update(pose='present', expr='excited')
    if n == 'room4':
        if who == 'mozart' and on('L19', t): o.update(hands={-1: (-(56 + 170), -505 + 40)}, expr='think')
        if who == 'teddy' and on('L20', t): o.update(pose='point', expr='excited')
        if who == 'rocky' and t >= LN['L19']['t0']: o.update(expr='focus', hands={-1: (-74, -205), 1: (74, -205)}, grips=(-1, 1), under=tablet_small)
    if n == 'room5':
        bob = -14*abs(math.sin((t - LN['N10']['t0'])*8 + (KIDS + ['abu', 'mozart', 'beethoven']).index(who)*0.9))
        o.update(expr='excited', y=B['ground'] + bob, pose='cheer' if who in ('teddy', 'mia', 'abu') else 'hips' if who in ('mozart',) else 'idle')
    return o


def tablet_small(c):
    poly(c, [(-80, -252), (80, -252), (92, -160), (-92, -160)]); fs(c, hexc('2e3240'), 3)
    poly(c, [(-70, -244), (70, -244), (80, -168), (-80, -168)]); fs(c, hexc('8fd6ff'), 2)


def front_room(c, t, B):
    n = B['n']; pos = dict(B['cast'])
    def tagc(who, t0, t1, txt):
        if t0 <= t <= t1:
            k = E.back_out((t - t0)/0.25); c.save(); c.translate(pos[who], B['ground'] - hgt(who) - 34); c.scale(k, k); label(c, 0, 0, txt, 34); c.restore()
    if n == 'room1':
        tagc('mozart', LN['L12']['t0'], LN['L13']['t0'], 'Mozart'); tagc('beethoven', wt('L12', 4), LN['L13']['t0'], 'Beethoven')


def act_dusk(who, t, B):
    return dict(pose='wave' if who in ('amber', 'edison', 'lena', 'abu') else 'cheer', expr='happy')


# ======================= 舞台（人偶場景通用） =======================
def cam_targets(B):
    pos = dict(B['cast']); wide = (960, B['ground'] - 300, 1.12) if not B.get('nozoom') else (960, 540, 1.0)
    out = [(B['t0'] - 1, wide)]; ids = [l for l, _ in B.get('lines', [])]
    for k, lid in enumerate(ids):
        sp = speakers(lid)
        if len(sp) == 1 and sp[0] in pos and not B.get('nozoom'):
            w = sp[0]; out.append((LN[lid]['t0'] - 0.3, (pos[w], B['ground'] - hgt(w)*0.60, 1.5 if hgt(w) < 500 else 1.32)))
        else:
            out.append((LN[lid]['t0'] - 0.3, wide))
        nxt = LN[ids[k + 1]]['t0'] - 0.3 if k + 1 < len(ids) else 1e9
        if nxt > LN[lid]['t1'] + 1.0: out.append((LN[lid]['t1'] + 0.5, wide))      # 下一句很快就開始時不拉回全景
    return out


def camera(B, t):
    tg = B['cam']; cur = tg[0][1]; prev = cur; ta = -9
    for a, g in tg:
        if t >= a: prev = cur; cur = g; ta = a
    k = E.ease((t - ta)/0.45)
    return tuple(E.lerp(prev[i], cur[i], k) for i in range(3))


def stage(c, t, B):
    fx, fy, z = camera(B, t)
    # 特寫時不要讓畫面露出邊界
    fx = E.clamp(fx, W/(2*z), W - W/(2*z)); fy = E.clamp(fy, H/(2*z), H - H/(2*z))
    c.save(); c.translate(W/2, H/2); c.scale(z, z); c.translate(-fx, -fy)
    B['bg'](c, t)
    if B.get('back'): B['back'](c, t, B)
    def chars():
        for i, (who, x) in enumerate(B['cast']):
            o = B['act'](who, t, B) if B.get('act') else {}
            if o.get('hide'): continue
            m, talking = mouth(who, t)
            bl = ((t + i*1.3) % 3.3 < 0.12) and not talking
            K.draw(c, who, t=t + i*0.7, pose=o.get('pose', 'idle'), expr=o.get('expr', 'happy'), mouth=m, blink=bl, hands=o.get('hands'), grips=o.get('grips', ()),
                   x=o.get('x', x), y=o.get('y', B['ground']), scale=o.get('scale', SC), under_hands=o.get('under'), feet=o.get('feet'))
    if B.get('silhouette'):
        c.push_group(); chars(); pat = c.pop_group(); c.set_source_rgba(*hexc('1c1220')); c.mask(pat)
    else:
        chars()
    if B.get('front'): B['front'](c, t, B)
    c.restore()
    if B.get('hud'): B['hud'](c, t, B)


def draw_clip_beat(c, t, B):
    tt = t - B['t0']; acc = 0.0
    for name, dur in B['clips']:
        files, full = clip(name)
        if tt < acc + dur or (name, dur) == B['clips'][-1]:
            i = int((tt - acc)*FPS) if full else int(E.clamp((tt - acc)/dur)*len(files))
            PS.draw_clip(c, files, i); break
        acc += dur
    if B.get('hud'): B['hud'](c, t, B)


def draw_insert(c, t, B):
    tt = t - B['t0']; i = E.clamp(tt/B['step'], 0, 3.999); z = 1 + 0.03*tt             # i 帶小數 → 道具動作連續
    c.save(); c.translate(W/2, H/2); c.scale(z, z); c.translate(-W/2, -H/2); B['fn'](c, i); c.restore()
    if B.get('hud'): B['hud'](c, t, B)


def hud_tag(title, sub, x=300, y=150, d=0.5):
    return lambda c, t, B: E.tag(c, t, B['t0'] + d, x, y, title, sub)
def hud_stamp(txt, d, x=1380, y=200):
    return lambda c, t, B: E.stamp(c, t, B['t0'] + d, x, y, txt, size=72)


def hud_end(c, t, B):
    if t >= LN['N12']['t0'] - 0.2: E.bigword(c, t, LN['N12']['t0'] - 0.2, W/2, 250, 'A Day in Vienna', size=120, col=(1, 0.96, 0.8))
    k = E.clamp((t - (B['t1'] - 1.0))/0.9)
    if k > 0: c.set_source_rgba(0.05, 0.03, 0.06, k); c.paint()


G_CAST = [('lena', 580), ('mia', 760), ('amber', 930), ('teddy', 1100), ('edison', 1270), ('rocky', 1440), ('abu', 1620)]
BOX_CAST = [('lena', 280), ('mia', 500), ('amber', 720), ('teddy', 940), ('edison', 1160), ('rocky', 1380), ('abu', 1600)]
ROOM_CAST = [('mia', 190), ('amber', 360), ('teddy', 530), ('edison', 700), ('rocky', 870), ('abu', 1050), ('mozart', 1360), ('beethoven', 1650)]
DUSK_CAST = [('lena', 300), ('mia', 510), ('amber', 720), ('teddy', 930), ('edison', 1140), ('rocky', 1350), ('abu', 1580)]
ROOM = dict(kind='stage', bg=room_scene_bg, cast=ROOM_CAST, ground=880, act=act_room, front=front_room)

BEATS = [
 # ---- S1 城堡花園 ----
 dict(n='fly', kind='clip', clips=[('s0', 4.0)], lines=[('N01', 0.3)], min=4.0, tail=0.4, hud=hud_tag('VIENNA', 'the city of music')),
 dict(n='garden', kind='stage', bg=lambda c, t: garden_bg(c, t), cast=G_CAST, ground=880, act=act_garden, back=back_garden, front=front_garden, hud=hud_garden, bikex=300, lenax=580,
      lines=[('N02', 0.2), ('L01', 0.5), ('L02', 0.4), ('N03', 1.1), ('L03', 0.9), ('L04', 0.45), ('L05', 0.45), ('L06', 0.6)], tail=0.9),
 # ---- S2 電車站 ----
 dict(n='street', kind='clip', clips=[('V3', 4.0)], lines=[('N04', 0.2)], min=3.8, tail=0.5, hud=hud_tag('VIENNA', 'on the street')),
 dict(n='stop', kind='stage', bg=PS.tram_stop_bg, cast=PS.CASTX, ground=PS.GROUND, act=act_stop, lines=[('L07', 0.3), ('L08', 0.5)], tail=1.0,
      hud=lambda c, t, B: icon_card(c, t, wt('L08', 4) - 0.05, 960, 132, 'BY TRAM', icon_tram)),
 dict(n='tram', kind='clip', clips=[('s1', 4.0)], lines=[('N05', 0.0)], lead=0.35, min=5.2, tail=0.5, hud=hud_tram3d),
 # ---- S3 歌劇院 ----
 dict(n='opera', kind='clip', clips=[('s3', 3.0), ('V1', 5.0)], lines=[('N06', 0.2)], min=7.6, tail=0.4, hud=hud_tag('THE OPERA HOUSE', 'Mozart concert')),
 dict(n='box1', kind='stage', bg=box_bg, cast=BOX_CAST, ground=900, act=act_box, front=box_front, lines=[('L09', 0.3)], tail=0.5),
 dict(n='clap', kind='clip', clips=[('V2', 3.4)], lines=[], min=3.2),
 dict(n='box2', kind='stage', bg=box_bg, cast=BOX_CAST, ground=900, act=act_box, front=lambda c, t, B: (box_front(c, t, B), front_box2(c, t, B)), lines=[('L10', 0.3), ('N07', 0.5)], cut_at=('N07', 4, -0.05)),
 dict(n='tunnel', kind='clip', clips=[('s2', 4.0)], lines=[], min=4.0, cover='N07', flash=True),
 # ---- S4 Mozart 的房間 ----
 dict(ROOM, n='room1', lines=[('N08', 0.2), ('L11', 0.5), ('L12', 0.5), ('L13', 0.6), ('L14', 0.5)], tail=0.5, hud=hud_tag("MOZART'S ROOM", 'long, long ago', d=0.4), flash=True),
 dict(n='piano2d', kind='insert', fn=QP.piano_frame, step=0.4, min=1.6, lines=[]),
 dict(n='piano3d', kind='clip', clips=[('s5', 3.0)], lines=[], min=3.3, hud=hud_stamp('PLAY THE PIANO', 0.9)),
 dict(ROOM, n='room2', lines=[('L15', 0.4), ('L16', 0.5)], tail=0.4),
 dict(n='quill', kind='insert', fn=QP.quill_frame, step=0.6, min=2.6, lines=[], hud=hud_stamp('WRITE MUSIC', 1.3, x=560, y=170)),
 # ---- S5 Mozart 反問 ----
 dict(ROOM, n='room3', lines=[('N09', 0.3), ('L17', 0.5), ('L18', 0.5)], tail=0.4),
 dict(n='recorder', kind='insert', fn=QP.recorder_frame, step=0.6, min=2.6, lines=[], hud=hud_stamp('PLAY THE RECORDER', 1.3)),
 dict(ROOM, n='room4', lines=[('L19', 0.4), ('L20', 0.5)], tail=0.4),
 dict(n='tablet', kind='insert', fn=QP.tablet_frame, step=0.6, min=2.6, lines=[]),
 dict(ROOM, n='room5', lines=[('N10', 0.3)], tail=1.1, nozoom=True),
 # ---- S6 黃昏花園 ----
 dict(n='dusk3d', kind='clip', clips=[('s4', 4.0)], lines=[('N11', 0.3)], min=4.0, tail=0.4),
 dict(n='bye', kind='stage', bg=dusk_bg, cast=DUSK_CAST, ground=870, act=act_dusk, silhouette=True, nozoom=True, lines=[('L21', 0.5), ('N12', 0.5)], tail=2.6, hud=hud_end),
]


def build():
    global ENV
    man = json.load(open(os.path.join(ROOT, 'audio', 'lines', 'manifest.json'), encoding='utf-8'))
    for m in man: SPK[m['id']] = m['who'].split('+')
    t = 0.0
    for B in BEATS:
        B['t0'] = t; cur = t + B.get('lead', 0.0)
        for lid, gap in B.get('lines', []):
            cur += gap; LN[lid] = PS.load_line(lid, cur); cur = LN[lid]['t1']
        end = max(t + B.get('min', 0), cur + B.get('tail', 0.5)) if B.get('lines') else t + B['min']
        if 'cut_at' in B: lid, wi, off = B['cut_at']; end = LN[lid]['words'][wi][0] + off
        if 'cover' in B: end = max(end, LN[B['cover']]['t1'] + 0.5)
        B['t1'] = end; t = end
    for B in BEATS:
        if B['kind'] == 'stage': B['cam'] = cam_targets(B)
    return t


# ======================= 聲音 =======================
def bt(n): return next(B for B in BEATS if B['n'] == n)


def sfx_whoosh(n, t0, dur=2.2):
    out = np.zeros(n, np.float32); m = int(dur*L.SR); rng = np.random.default_rng(3); x = rng.standard_normal(m).astype(np.float32)
    y = np.zeros(m, np.float32); a = 0.0
    for i in range(m):
        k = 0.02 + 0.5*(i/m)**2; a += k*(x[i] - a); y[i] = a
    tt = np.arange(m)/m; y *= np.sin(np.pi*tt)**1.5; y *= 0.5/np.abs(y).max()
    s = int(t0*L.SR); out[s:s + m] += y[:n - s]; return out


def sfx_applause(n, t0, dur):
    out = np.zeros(n, np.float32); m = int(dur*L.SR); rng = np.random.default_rng(5); y = np.zeros(m + 2000, np.float32)
    ck = np.exp(-np.arange(900)/110).astype(np.float32)
    for _ in range(int(dur*85)):
        s = rng.integers(0, m); y[s:s + 900] += ck*rng.standard_normal(900).astype(np.float32)*rng.uniform(0.3, 1.0)
    y = y[:m]; y = y - np.concatenate([[0], y[:-1]])*0.85
    tt = np.arange(m)/m; y *= np.minimum(1, tt*8)*np.minimum(1, (1 - tt)*4); y *= 0.16/np.abs(y).max()*3
    s = int(t0*L.SR); out[s:s + m] += np.clip(y, -0.5, 0.5)[:n - s]; return out


def sfx_tones(n, items, kind):
    """items: [(t, freq, dur)]；kind='flute' 直笛、'chip' 遊戲音效。"""
    out = np.zeros(n, np.float32)
    for t0, f, d in items:
        m = int(d*L.SR); tt = np.arange(m)/L.SR
        if kind == 'flute':
            y = (np.sin(2*np.pi*f*tt) + 0.25*np.sin(4*np.pi*f*tt))*np.minimum(1, tt/0.04)*np.minimum(1, (d - tt)/0.08) + 0.03*np.random.default_rng(1).standard_normal(m)
            y *= 0.16
        else:
            y = np.sign(np.sin(2*np.pi*f*tt))*np.exp(-tt*9)*0.07
        s = int(t0*L.SR); out[s:s + m] += y.astype(np.float32)[:max(0, n - s)]
    return out


def music_seg(n, key, t0, t1, src=0.0, level=0.030, mute=()):
    a, msr = sf.read(os.path.join(ROOT, 'audio', 'music', key + '.wav'))
    if a.ndim > 1: a = a.mean(axis=1)
    m = int((t1 - t0)*L.SR); seg = a[int(src*msr):int((src + t1 - t0)*msr) + 2]
    x = np.interp(np.arange(m)/L.SR, np.arange(len(seg))/msr, seg).astype(np.float32)
    x *= level/max(1e-6, float(np.sqrt(np.mean(x**2))))
    f = int(0.8*L.SR); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    out = np.zeros(n, np.float32); s = int(t0*L.SR); out[s:s + m] = x[:n - s]
    g = np.ones(n, np.float32)
    for a0, a1 in mute:
        i0, i1 = int(a0*L.SR), int(a1*L.SR); r = int(0.3*L.SR)
        g[i0:i1] = 0; g[max(0, i0 - r):i0] = np.linspace(1, 0, min(r, i0)); g[i1:i1 + r] = np.linspace(0, 1, r)[:max(0, min(r, n - i1))]
    return out*g


def build_audio(total):
    global ENV
    n = int(total*L.SR) + 1; voice = np.zeros(n, np.float32)
    for ln in LN.values():
        s = int(ln['t0']*L.SR); a = ln['audio']; voice[s:s + len(a)] += a[:n - s]
    ENV = L.envelope(voice, FPS)
    fxs = np.zeros(n, np.float32)
    fxs += PS.bell(bt('tram')['t0'] + 0.05, n)
    fxs += sfx_whoosh(n, bt('tunnel')['t0'] - 0.25)
    fxs += sfx_applause(n, bt('clap')['t0'], bt('clap')['t1'] - bt('clap')['t0'])
    p = piano_synth.render(); s = int(bt('piano3d')['t0']*L.SR); fxs[s:s + len(p)] += 0.55*p[:n - s]
    r0 = bt('recorder')['t0']; fxs += sfx_tones(n, [(r0 + 0.1 + i*0.6, f, 0.5) for i, f in enumerate((523.25, 587.33, 659.25, 783.99))], 'flute')
    g0 = bt('tablet')['t0']; fxs += sfx_tones(n, [(g0 + 0.15 + i*0.6, f, 0.25) for i, f in enumerate((660, 880, 990, 1320))] + [(g0 + 0.3 + i*0.6, 1760, 0.12) for i in (2, 3)], 'chip')
    k = int(0.35*L.SR); env = np.interp(np.arange(n)/L.SR, np.arange(len(ENV))/FPS, np.minimum(1.0, ENV*3)); duck = 1 - 0.4*np.clip(np.convolve(env, np.ones(k)/k, mode='same')*1.6, 0, 1)
    mus = np.zeros(n, np.float32)
    mus += music_seg(n, 'k525_1_allegro', 0.0, bt('tunnel')['t0'] + 0.4, mute=[(bt('clap')['t0'], bt('clap')['t1'])])
    # 歌劇院樂團那 5 秒：配樂當主角（沒有人說話的部分拉高）
    o = bt('opera'); i0, i1 = int((o['t0'] + 3.0)*L.SR), int(o['t1']*L.SR); bump = np.ones(n, np.float32); r = int(0.5*L.SR)
    bump[i0:i1] = 2.2; bump[i0 - r:i0] = np.linspace(1, 2.2, r); bump[i1:i1 + r] = np.linspace(2.2, 1, r)
    mus *= bump
    mus += music_seg(n, 'k545_1_allegro', bt('room1')['t0'] + 0.2, bt('room5')['t1'], mute=[(bt('piano2d')['t0'] + 0.9, bt('piano3d')['t1']), (bt('recorder')['t0'], bt('recorder')['t1']), (bt('tablet')['t0'], bt('tablet')['t1'])])
    mus += music_seg(n, 'k525_2_romanze', bt('dusk3d')['t0'], total, level=0.036)
    return np.clip(voice + fxs + mus*duck, -1, 1)


# ======================= 逐格 =======================
def draw_beat(c, t, B):
    if B['kind'] == 'stage': stage(c, t, B)
    elif B['kind'] == 'clip': draw_clip_beat(c, t, B)
    else: draw_insert(c, t, B)


def frame(c, t):
    i = max(k for k, B in enumerate(BEATS) if t >= B['t0']); B = BEATS[i]; X = 0.3
    draw_beat(c, t, B)
    if i > 0 and t < B['t0'] + X:
        if B.get('flash'):
            c.set_source_rgba(1, 1, 1, 1 - (t - B['t0'])/X); c.paint()
        else:
            c.push_group(); draw_beat(c, t, BEATS[i - 1]); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - B['t0'])/X)
    if i + 1 < len(BEATS) and BEATS[i + 1].get('flash') and t > B['t1'] - 0.25:
        c.set_source_rgba(1, 1, 1, (t - B['t1'] + 0.25)/0.25); c.paint()
    E.vignette(c, 0.3)
    if not NOSUB:
        cur = next((ln for ln in LN.values() if ln['t0'] - 0.15 <= t <= ln['t1'] + 0.35), None)
        PS.karaoke(c, t, cur)


if __name__ == '__main__':
    E.FONT = 'Comic Relief'
    od = os.path.join(ROOT, 'renders', 'film'); os.makedirs(od, exist_ok=True)
    total = build(); audio = build_audio(total)
    for B in BEATS: print(f"{B['n']:9s} {B['t0']:6.2f}-{B['t1']:6.2f}  " + ' '.join(l for l, _ in B.get('lines', [])))
    print('TOTAL', round(total, 2), 's')
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    def grab(t):
        c = cairo.Context(surf); frame(c, t); surf.flush()
        return Image.frombuffer('RGBA', (W, H), bytes(surf.get_data()), 'raw', 'BGRA', 0, 1).convert('RGB')
    if '--stills' in sys.argv:
        ts = [(lid, (ln['t0'] + ln['t1'])/2) for lid, ln in LN.items()] + [(B['n'], (B['t0'] + B['t1'])/2) for B in BEATS if not B.get('lines')] + \
             [('N03in', LN['N03']['t0'] + 0.9), ('N03b', LN['N03']['t0'] + 1.5), ('N03c', LN['N03']['t0'] + 2.1), ('N03off', LN['N03']['t1'] + 0.45), ('L02end', LN['L02']['t1'] + 0.3), ('N07btn', wt('N07', 3) + 0.3), ('N08in', LN['N08']['t0'] + 0.5), ('end', total - 1.6)]
        ts.sort(key=lambda a: a[1])
        for p in range(0, len(ts), 12):
            sh = Image.new('RGB', (640*4, 360*3), (30, 30, 30))
            for j, (nm, t) in enumerate(ts[p:p + 12]):
                im = grab(t).resize((640, 360)); c2 = Image.new('RGB', (150, 22), (20, 20, 20)); im.paste(c2, (0, 0))
                from PIL import ImageDraw
                ImageDraw.Draw(im).text((6, 5), f'{nm} {t:.1f}s', fill=(255, 255, 0)); sh.paste(im, ((j % 4)*640, (j//4)*360))
            sh.save(os.path.join(od, f'check_{p//12 + 1}.jpg'), quality=88)
        print('ok stills', len(ts)); sys.exit()
    ver = next((a for a in sys.argv[1:] if a.startswith('v')), 'v1'); tag = 'listen' if NOSUB else 'sub'
    wav = os.path.join(od, f'vienna_{ver}.wav'); sf.write(wav, audio, L.SR); mp4 = os.path.join(od, f'vienna_{ver}_{tag}_1080p.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
                          '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', mp4], stdin=subprocess.PIPE)
    for n in range(int(total*FPS)):
        c = cairo.Context(surf); frame(c, n/FPS); surf.flush(); p.stdin.write(bytes(surf.get_data()))
    p.stdin.close(); p.wait(); print('ok', mp4)
