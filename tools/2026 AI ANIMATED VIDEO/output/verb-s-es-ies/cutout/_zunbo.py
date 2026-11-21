

def zunbo(c, t, pose, expr, mouth, blink, mouth_mode, hands, under_hands):
    """圳寶 Zun-Bo：青綠頭盔＋頭頂探照燈＋橘色耳罩、白臉大眼、胸口橘色水閘轉盤。"""
    TEAL, W_, OR_, DK = hexc('1f9a8a'), hexc('f7f4ea'), hexc('f28a2e'), hexc('14574f')
    bob = math.sin(t*2.6)*2
    for s in (-1, 1):
        seg(c, s*26, -150, s*28, -40, 26, W_)
        shade(c, lambda: rrect(c, s*30 - 32, -46, 64, 46, 16), lambda: c.rectangle(s*30 + 4, -50, 40, 60), TEAL, darker(TEAL, 0.8))
        c.new_path(); c.arc(s*30 + 14, -22, 6, 0, 6.3); fs(c, hexc('c8e04a'), 1.8)
    c.save(); c.translate(0, bob)
    shade(c, lambda: rrect(c, -74, -336, 148, 196, 46), lambda: c.rectangle(22, -350, 90, 240), W_, darker(W_, 0.87))
    shade(c, lambda: rrect(c, -50, -296, 100, 104, 18), lambda: c.rectangle(14, -300, 60, 120), TEAL, darker(TEAL, 0.82))
    c.new_path(); c.arc(0, -244, 30, 0, 6.3); stroke(c, 14); c.new_path(); c.arc(0, -244, 30, 0, 6.3); stroke(c, 9, OR_)
    for a in range(3):
        c.new_path(); c.move_to(30*math.cos(a*2.094 - 1.57), -244 + 30*math.sin(a*2.094 - 1.57)); c.line_to(0, -244); stroke(c, 7, OR_)
    c.new_path(); c.arc(0, -244, 10, 0, 6.3); fs(c, hexc('c8e04a'), 2.2)
    rrect(c, -14, -356, 28, 26, 6); fs(c, darker(W_, 0.8), 2.6)
    hy = -440
    for s in (-1, 1):   # 耳罩
        c.new_path(); c.arc(s*104, hy + 4, 30, 0, 6.3); fs(c, OR_, 3); c.new_path(); c.arc(s*108, hy + 4, 15, 0, 6.3); fs(c, TEAL, 2.4)
    shade(c, lambda: rrect(c, -104, hy - 92, 208, 180, 78), lambda: c.rectangle(40, hy - 110, 100, 220), TEAL, darker(TEAL, 0.82))
    rrect(c, -78, hy - 52, 156, 122, 54); fs(c, W_, 3)
    c.new_path(); c.arc(0, hy - 108, 34, 0, 6.3); fs(c, OR_, 3); c.new_path(); c.arc(0, hy - 108, 22, 0, 6.3); fs(c, hexc('ffe9a0'), 2.4)   # 頭頂探照燈
    c.new_path(); c.arc(-7, hy - 115, 6, 0, 6.3); c.set_source_rgba(1, 1, 1, 0.9); c.fill()
    for s in (-1, 1): c.new_path(); c.arc(s*62, hy - 78, 9, 0, 6.3); fs(c, hexc('c8e04a'), 2)
    for s in (-1, 1):   # 眼睛、腮紅
        if blink:
            c.new_path(); c.move_to(s*34 - 14, hy - 4); c.curve_to(s*34 - 5, hy + 5, s*34 + 5, hy + 5, s*34 + 14, hy - 4); stroke(c, 4, DK)
        else:
            c.save(); c.translate(s*34, hy - 6); c.scale(0.78, 1); c.new_path(); c.arc(0, 0, 21, 0, 6.3); c.restore(); c.set_source_rgba(*DK); c.fill()
            c.new_path(); c.arc(s*34 + 5, hy - 13, 7, 0, 6.3); c.set_source_rgb(1, 1, 1); c.fill()
            c.new_path(); c.arc(s*34 - 4, hy + 2, 3.5, 0, 6.3); c.set_source_rgb(1, 1, 1); c.fill()
        c.save(); c.translate(s*58, hy + 26); c.scale(1.3, 0.8); c.new_path(); c.arc(0, 0, 11, 0, 6.3); c.restore(); c.set_source_rgba(0.95, 0.5, 0.3, 0.55); c.fill()
    mp = None
    if mouth_mode != 'none' and (isinstance(mouth, (str, tuple, dict)) or (isinstance(mouth, (int, float)) and mouth > 0.05)): mp = mouth_params(mouth)
    c.save(); c.translate(0, hy)
    if mp is not None: draw_mouth(c, mp, 66, 34, 6)
    elif expr == 'sad':
        c.new_path(); c.move_to(-16, 40); c.curve_to(-6, 30, 6, 30, 16, 40); stroke(c, 3.6, DK)
    else:
        c.new_path(); c.move_to(-18, 30); c.curve_to(-8, 44, 8, 44, 18, 30); stroke(c, 3.6, DK)
    c.restore()
    if expr == 'sad':   # 眼淚
        for s in (-1, 1):
            c.new_path(); c.move_to(s*40, hy + 14); c.curve_to(s*54, hy + 36, s*28, hy + 42, s*40, hy + 14); fs(c, hexc('7fd0ff'), 2)
    if under_hands: under_hands(c)
    for side in (-1, 1):
        tgt = (hands or {}).get(side)
        if tgt is None:
            if pose == 'wave' and side > 0: tgt = (140, -400 + math.sin(t*9)*12)
            elif pose == 'present' and side > 0: tgt = (160, -260)
            elif pose == 'cheer': tgt = (side*120, -450)
            else: tgt = (side*84, -200)
        sx, sy = side*66, -306
        (ex_, ey_), (hx, hy_) = ik(sx, sy, tgt[0], tgt[1], 62, 58, side)
        seg(c, sx, sy, ex_, ey_, 24, TEAL); seg(c, ex_, ey_, hx, hy_, 22, W_)
        c.new_path(); c.arc(hx, hy_, 17, 0, 6.3); fs(c, W_, 2.8)
        c.new_path(); c.arc(ex_, ey_, 9, 0, 6.3); fs(c, OR_, 2)
    c.restore()
