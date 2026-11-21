"""一次性：把 Vienna 的 cast.py 加上 Ken、媽媽、爸爸、Shuiling、Zun-Bo（已套用；留作紀錄）。"""
p = 'cast.py'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:60]); s = s.replace(a, b)
rep('"""A Day in Vienna — 畫風 J 角色程式', '"""動詞 -s/-es/-ies 文法片 — 畫風 J 角色程式（從 A Day in Vienna 的 cast.py 複製，加 Ken、媽媽、爸爸、Shuiling、Zun-Bo）')
rep("    'abu':    dict(robot=True),\n}", """    'abu':    dict(robot=True),
    'ken':    dict(P=KID, skin='light', hair='spiky', hc=hexc('1d1a1c'), top='jumpsuit', topc=hexc('27335e'), sleevec=hexc('f28a2e'), bottom='none', botc=hexc('27335e'),
                   legs='pants', shoes=hexc('f28a2e'), sleeve='long', goggles=True),
    'mom':    dict(P=ADULT, skin='light', hair='long', hc=hexc('2b2530'), top='cardigan', topc=hexc('b99ad8'), bottom='pants', botc=hexc('2f4379'),
                   legs='pants', shoes=hexc('f1e6d8'), sleeve='long', female=True),
    'dad':    dict(P=ADULT, skin='tan', hair='cap', hc=hexc('2b2420'), top='jacket', topc=hexc('6d7480'), bottom='pants', botc=hexc('27335e'),
                   legs='pants', shoes=hexc('f4f1ea'), sleeve='long', capc=hexc('f28a2e')),
    'shuiling': dict(P=KID, skin='light', hair='drop', hc=hexc('6fb4f0'), top='dress', topc=hexc('5f9a3c'), puffc=hexc('fbfaf4'), bottom='none', botc=hexc('5f9a3c'),
                   legs='socks', sockc=hexc('fbfaf4'), shoes=hexc('5f9a3c'), female=True, sleeve='puff', bell=True),
    'zunbo':  dict(zunbo=True),
}""")
rep("NAMES = dict(amber='Amber',", "NAMES = dict(ken='Ken', mom='Mom', dad='Dad', shuiling='Shuiling', zunbo='Zun-Bo', amber='Amber',")
rep("    if h == 'wild':   # 貝多芬", """    if h == 'long':   # 媽媽：及肩長髮
        shade(c, lambda: rrect(c, -R*1.14, -R*1.0, R*2.28, R*2.5, R*0.75), lambda: c.rectangle(R*0.4, -R*2, R*2, R*5), hc, darker(hc, 0.75))
    if h == 'drop':   # 水鈴：水藍色蓬髮＋兩側捲捲
        dk = darker(hc, 0.82)
        shade(c, lambda: rrect(c, -R*1.3, -R*1.05, R*2.6, R*2.2, R*0.9), lambda: c.rectangle(R*0.45, -R*2, R*2, R*5), hc, dk)
        for s_ in (-1, 1):
            for (dx, dy, rr) in ((1.28, 0.85, 0.34), (1.05, 1.18, 0.3)):
                c.new_path(); c.arc(s_*dx*R, dy*R, rr*R, 0, 6.3); fs(c, hc, 2.6)
                c.new_path(); c.arc(s_*dx*R, dy*R, rr*R*0.5, 0.5, 4.2); stroke(c, 2, hexc('e9f5ff'))
    if h == 'wild':   # 貝多芬""")
rep("    elif h == 'wild':\n        shade(c, lambda: cap_path(c, R, [(0.7, -0.42)", """    elif h == 'long':
        shade(c, lambda: cap_path(c, R, [(0.8, -0.2), (0.45, -0.52), (-0.1, -0.7), (-0.5, -0.5), (-0.82, -0.22)]), sh, hc, darker(hc, 0.75))
    elif h == 'cap':   # 爸爸：短髮＋橘白棒球帽
        shade(c, lambda: cap_path(c, R, [(0.8, -0.3), (0, -0.36), (-0.8, -0.3)], top=1.0), sh, hc, darker(hc, 0.75))
        cc = d.get('capc', hexc('f28a2e'))
        dome = lambda: (c.new_path(), c.move_to(-R*1.04, -R*0.42), c.curve_to(-R*1.1, -R*1.55, R*1.1, -R*1.55, R*1.04, -R*0.42), c.close_path())
        shade(c, dome, lambda: c.rectangle(R*0.35, -R*2, R*2, R*3), cc, darker(cc, 0.82))
        fp = lambda: (c.new_path(), c.move_to(-R*0.5, -R*0.42), c.curve_to(-R*0.5, -R*1.22, R*0.5, -R*1.22, R*0.5, -R*0.42), c.close_path())
        fp(); fs(c, hexc('fbfaf4'), 2.6)
        br = lambda: (c.new_path(), c.move_to(-R*1.08, -R*0.42), c.line_to(R*1.08, -R*0.42), c.curve_to(R*1.2, -R*0.26, R*0.9, -R*0.2, R*0.2, -R*0.2), c.curve_to(-R*0.9, -R*0.2, -R*1.2, -R*0.26, -R*1.08, -R*0.42), c.close_path())
        shade(c, br, lambda: c.rectangle(R*0.35, -R, R*2, R*2), cc, darker(cc, 0.75))
        c.new_path(); c.arc(0, -R*1.27, R*0.08, 0, 6.3); fs(c, cc, 2)
    elif h == 'drop':   # 水鈴：瀏海＋頭頂水滴尖（往左捲）＋兩側稻穗與小白花
        dk = darker(hc, 0.82)
        tip = lambda: (c.new_path(), c.move_to(-R*0.62, -R*0.95), c.curve_to(-R*0.45, -R*1.7, R*0.1, -R*1.95, -R*0.28, -R*2.38),
                       c.curve_to(-R*0.55, -R*2.62, -R*0.82, -R*2.3, -R*0.6, -R*2.18), c.curve_to(-R*0.42, -R*2.1, -R*0.4, -R*2.28, -R*0.5, -R*2.3),
                       c.curve_to(R*0.75, -R*2.2, R*0.9, -R*1.4, R*0.68, -R*0.9), c.close_path())
        shade(c, tip, sh, hc, dk)
        shade(c, lambda: cap_path(c, R, [(0.78, -0.18), (0.52, -0.5), (0.3, -0.24), (0.02, -0.56), (-0.28, -0.26), (-0.52, -0.52), (-0.8, -0.18)], top=1.2, side=1.1), sh, hc, dk)
        c.new_path(); c.move_to(-R*0.3, -R*1.15); c.curve_to(-R*0.05, -R*1.5, R*0.3, -R*1.35, R*0.4, -R*1.0); stroke(c, 2.4, hexc('e9f5ff'))
        for s_ in (-1, 1):   # 稻穗
            c.save(); c.translate(s_*R*1.02, -R*0.55); c.rotate(s_*0.42)
            c.new_path(); c.move_to(0, R*0.3); c.line_to(0, -R*1.05); stroke(c, 3, hexc('7a8a2e'))
            for i in range(5):
                for q in (-1, 1):
                    c.save(); c.translate(q*R*0.13, -R*0.2 - i*R*0.2); c.rotate(q*0.5); c.scale(0.55, 1); c.new_path(); c.arc(0, 0, R*0.16, 0, 6.3); c.restore(); fs(c, hexc('f2b53a'), 2)
            c.save(); c.translate(0, -R*1.12); c.scale(0.55, 1); c.new_path(); c.arc(0, 0, R*0.16, 0, 6.3); c.restore(); fs(c, hexc('f2b53a'), 2)
            for a in range(5):   # 小白花
                c.new_path(); c.arc(R*0.02 + R*0.13*math.cos(a*1.257), R*0.38 + R*0.13*math.sin(a*1.257), R*0.09, 0, 6.3); fs(c, hexc('ffffff'), 1.6)
            c.new_path(); c.arc(R*0.02, R*0.38, R*0.06, 0, 6.3); fs(c, hexc('f2c53d'), 1.4)
            c.restore()
    elif h == 'wild':
        shade(c, lambda: cap_path(c, R, [(0.7, -0.42)""")
rep("if d['hair'] not in ('wig', 'wild', 'bob'):", "if d['hair'] not in ('wig', 'wild', 'bob', 'long', 'drop'):")
rep("    hair_front(c, d, R)\n\n# ---------------- body", """    hair_front(c, d, R)
    if d.get('goggles'):   # Ken：額頭上的護目鏡
        gy = -R*0.62
        c.new_path(); c.move_to(-R*1.0, gy + R*0.1); c.curve_to(-R*0.6, gy - R*0.12, R*0.6, gy - R*0.12, R*1.0, gy + R*0.1); stroke(c, R*0.2)
        c.new_path(); c.move_to(-R*1.0, gy + R*0.1); c.curve_to(-R*0.6, gy - R*0.12, R*0.6, gy - R*0.12, R*1.0, gy + R*0.1); stroke(c, R*0.13, hexc('f28a2e'))
        for s in (-1, 1):
            rrect(c, s*R*0.34 - R*0.3, gy - R*0.26, R*0.6, R*0.44, R*0.16); fs(c, hexc('f28a2e'), 2.8)
            rrect(c, s*R*0.34 - R*0.21, gy - R*0.18, R*0.42, R*0.28, R*0.1); fs(c, hexc('9aa6b8'), 2.2)
            c.new_path(); c.move_to(s*R*0.34 - R*0.12, gy - R*0.1); c.line_to(s*R*0.34 + R*0.02, gy - R*0.1); stroke(c, 2.4, hexc('ffffff'))

# ---------------- body""")
rep("    elif top == 'uniform':\n        shade(c, lambda: torso_path(c, P), sd, tc, darker(tc))", """    elif top == 'jumpsuit':   # Ken：深藍連身裝＋橘色肩片、拉鍊、腰帶
        shade(c, lambda: torso_path(c, P, bot=hip + 22), sd, tc, darker(tc))
        oc = d.get('sleevec', hexc('f28a2e'))
        for s in (-1, 1): poly(c, [(s*P['sw'], sh - 6), (s*16, sh - 18), (s*26, sh + 34), (s*(P['sw'] + 2), sh + 46)]); fs(c, oc, 2.6)
        c.new_path(); c.move_to(0, sh - 14); c.line_to(0, hip - 8); stroke(c, 5, oc)
        rrect(c, -P['ww'] - 3, hip - 12, 2*P['ww'] + 6, 13, 4); fs(c, darker(tc, 0.7), 2.4); rrect(c, -8, hip - 14, 16, 17, 3); fs(c, hexc('c9ccd4'), 2)
        poly(c, [(-16, sh - 18), (0, sh - 2), (16, sh - 18), (10, sh - 26), (-10, sh - 26)]); fs(c, darker(tc, 0.8), 2.4)
    elif top == 'cardigan':   # 媽媽：白色上衣＋薰衣草紫開襟外套
        shade(c, lambda: torso_path(c, P), sd, tc, darker(tc))
        poly(c, [(-20, sh - 12), (20, sh - 12), (26, hip + 6), (-26, hip + 6)]); fs(c, hexc('fbf6f0'), 2.6)
        c.new_path(); c.move_to(-14, sh - 12); c.curve_to(-8, sh + 6, 8, sh + 6, 14, sh - 12); stroke(c, 2.6)
        for y in (sh + 70, sh + 110, sh + 150): c.new_path(); c.arc(36, y, 4.5, 0, 6.3); fs(c, hexc('fbf6f0'), 1.6)
        rrect(c, -P['ww'] - 3, hip - 6, 2*P['ww'] + 6, 14, 4); fs(c, darker(tc, 0.85), 2.4)
    elif top == 'jacket':   # 爸爸：灰色運動外套＋橘色拉鍊
        shade(c, lambda: torso_path(c, P), sd, tc, darker(tc))
        poly(c, [(-18, sh - 14), (0, sh + 30), (18, sh - 14)]); fs(c, hexc('fbfaf4'), 2.4)
        for s in (-1, 1): poly(c, [(s*4, sh + 24), (s*32, sh - 18), (s*20, sh - 22), (s*2, sh + 4)]); fs(c, darker(tc, 0.85), 2.4)
        c.new_path(); c.move_to(0, sh + 30); c.line_to(0, hip + 4); stroke(c, 5, hexc('f28a2e'))
        rrect(c, -P['ww'] - 3, hip - 8, 2*P['ww'] + 6, 14, 4); fs(c, darker(tc, 0.8), 2.4)
    elif top == 'uniform':
        shade(c, lambda: torso_path(c, P), sd, tc, darker(tc))""")
rep("        for s in (-1, 1): c.new_path(); c.save(); c.translate(s*13, sh - 10); c.scale(1.2, 0.7); c.arc(0, 0, 14, 0, 6.3); c.restore(); fs(c, hexc('ffffff'), 2.4)",
    "        for s in (-1, 1): c.new_path(); c.save(); c.translate(s*13, sh - 10); c.scale(1.2, 0.7); c.arc(0, 0, 14, 0, 6.3); c.restore(); fs(c, hexc('ffffff'), 2.4)\n        if d.get('bell'):\n            c.new_path(); c.arc(0, hip - 34, 12, 0, 6.3); fs(c, hexc('f2c53d'), 2.4); c.new_path(); c.move_to(-7, hip - 32); c.line_to(7, hip - 32); stroke(c, 2); c.new_path(); c.arc(0, hip - 27, 2.5, 0, 6.3); fs(c, LINE, 1)")
rep("    if s == 'long': return tc, tc", "    if d.get('sleevec'): return d['sleevec'], d['sleevec']\n    if s == 'long': return tc, tc")
rep("c.arc(sx, sy + 6, P['aw']*0.85, 0, 6.3); fs(c, d['topc'], 2.6)", "c.arc(sx, sy + 6, P['aw']*0.85, 0, 6.3); fs(c, d.get('puffc', d['topc']), 2.6)")
rep("    if s in ('short', 'puff'): return tc, skin", "    if s == 'puff' and d.get('puffc'): return d['puffc'], skin\n    if s in ('short', 'puff'): return tc, skin")
rep("    if d['hair'] in ('pony', 'bob', 'wild', 'wig'):", "    if d['hair'] in ('pony', 'bob', 'wild', 'wig', 'long', 'drop'):")
rep("        robot(c, t, pose, mouth, blink, mouth_mode, hands, under_hands); c.restore(); return\n", "        robot(c, t, pose, mouth, blink, mouth_mode, hands, under_hands); c.restore(); return\n    if d.get('zunbo'):\n        zunbo(c, t, pose, expr, mouth, blink, mouth_mode, hands, under_hands); c.restore(); return\n")
s += open('_zunbo.py', encoding='utf-8').read()
open(p, 'w', encoding='utf-8').write(s); print('patched')
