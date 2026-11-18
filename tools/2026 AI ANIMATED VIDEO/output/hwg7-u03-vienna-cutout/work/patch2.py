"""v2 修改：BY TRAM／BY BIKE 改成「圖示＋大字」字卡並移到不擋角色的位置；電車 3D 鏡頭加 TRAM 標籤；其他字卡字級加大。"""
p = 'src/film.py'; s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a)); s = s.replace(a, b)

NEW = '''# ======================= 圖示字卡（v2：字卡上有圖，學生看圖就懂單字） =======================
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
    col = (0.78, 0.15, 0.13); u = size*0.95
    E.font(c, size); tw = c.text_extents(txt).x_advance; iw = 2.6*u; w = iw + tw + 70; h = size*2.25
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
    """電車停好之後，在電車旁標出 tram（圖和字對在一起）。"""
    E.arrow_label(c, t, B['t0'] + 3.25, 430, 250, 800, 420, 'tram')


# ======================= 背景 =======================
'''
rep("# ======================= 背景 =======================\n", NEW)
# BY TRAM
rep("      hud=lambda c, t, B: E.stamp(c, t, wt('L08', 4) - 0.05, 1500, 250, 'BY TRAM', size=58)),",
    "      hud=lambda c, t, B: icon_card(c, t, wt('L08', 4) - 0.05, 960, 132, 'BY TRAM', icon_tram)),")
# BY BIKE
rep("    E.stamp(c, t, wt('L05', 3) - 0.05, 620, 240, 'BY BIKE', rot=-0.06, size=58) if LN['L05']['t0'] <= t <= LN['L06']['t0'] + 0.2 else None",
    "    icon_card(c, t, wt('L05', 3) - 0.05, 1100, 132, 'BY BIKE', icon_bike, t1=LN['L06']['t0'] + 0.2)")
# tram 3D beat: hold the last frame a little longer so the label can be read
rep("dict(n='tram', kind='clip', clips=[('s1', 4.0)], lines=[('N05', 0.0)], lead=0.35, min=4.0, tail=0.5),",
    "dict(n='tram', kind='clip', clips=[('s1', 4.0)], lines=[('N05', 0.0)], lead=0.35, min=5.2, tail=0.5, hud=hud_tram3d),")
# other stamps bigger
rep("    return lambda c, t, B: E.stamp(c, t, B['t0'] + d, x, y, txt, size=56)", "    return lambda c, t, B: E.stamp(c, t, B['t0'] + d, x, y, txt, size=72)")
rep("def hud_stamp(txt, d, x=1480, y=230):", "def hud_stamp(txt, d, x=1380, y=200):")
open(p, 'w', encoding='utf-8', newline='\n').write(s); print('patched')
