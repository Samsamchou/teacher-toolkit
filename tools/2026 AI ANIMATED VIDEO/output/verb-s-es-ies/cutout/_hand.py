def mitten(c, x, y, r, skin, ang=0.0, grip=False, side=1):
    """張開的手：手掌＋四根手指＋拇指（老師 11/21：要看得到手指）。局部 +y＝前臂往手的方向；拇指朝身體內側。grip＝握住東西（手指彎起包住）。"""
    c.save(); c.translate(x, y); c.rotate(ang)
    dk = darker(skin, 0.7)
    if grip:
        rrect(c, -r*0.95, -r*0.75, r*1.9, r*1.6, r*0.6); fs(c, skin, 2.6)
        for i in range(4):   # 四根彎起來的手指（指節）
            rrect(c, -r*0.92 + i*r*0.47, r*0.1, r*0.44, r*0.85, r*0.2); fs(c, skin, 2.2)
        c.save(); c.translate(-side*r*0.85, -r*0.1); c.rotate(side*0.5); rrect(c, -r*0.24, -r*0.2, r*0.48, r*0.95, r*0.22); fs(c, skin, 2.2); c.restore()
    else:
        L = (0.95, 1.12, 1.05, 0.85); xs = (-0.63, -0.21, 0.21, 0.63)
        for i in range(4):
            j = i if side > 0 else 3 - i
            c.save(); c.translate(xs[i]*r, r*0.55); c.rotate(-xs[i]*0.28); rrect(c, -r*0.2, 0, r*0.4, r*L[j], r*0.2); fs(c, skin, 2.2); c.restore()
        c.save(); c.translate(-side*r*0.8, -r*0.15); c.rotate(side*0.85); rrect(c, -r*0.22, 0, r*0.44, r*0.95, r*0.22); fs(c, skin, 2.2); c.restore()   # 拇指
        rrect(c, -r*0.9, -r*0.7, r*1.8, r*1.5, r*0.55); fs(c, skin, 2.6)
        c.new_path(); c.move_to(-r*0.35, r*0.35); c.curve_to(-r*0.1, r*0.5, r*0.2, r*0.5, r*0.4, r*0.3); stroke(c, 1.6, dk)
    c.restore()
