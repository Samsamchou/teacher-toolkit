# S07–S12 場景（由 scenes.py 用 exec 載入；共用 scenes.py 裡的 E、T、SHOT、PROPS、L 等變數）
# 新英格蘭台上的清教徒聚落、玉米田、長桌；S11 桌曆；S12 營火晚景
COT = (-0.55, 0.15)


def cottage():
    return E.place(f"{PROPS}/cottage.glb", 0.1, (COT[0], COT[1], 0.012), 0, "long")


def shot_cam(lens1, f1, lens2, f2, p1, p2):
    cam, aim, foc = E.camera("cam", lens1 if SHOT == "r1" else lens2, f1 if SHOT == "r1" else f2)
    E.key_cam(cam, aim, foc, p1 if SHOT == "r1" else p2)
    return cam


def lin(a, b, c, d, e):
    """鏡頭從 (a 位置, b 目標) 慢慢移到 (c, d)，對焦 e。"""
    def path(t):
        u = t / T["dur"]
        return vlerp(a, c, u), vlerp(b, d, u), Vector(e)
    return path


def wooden_number(txt, loc, t_on, size=0.05):
    n = E.text_obj(txt, size, E.wood(), extrude=0.005); n.rotation_euler = (math.radians(90), 0, 0); n.location = loc
    E.pop_in(n, t_on); return n


def grow(objs, t0, t1):
    """一格一格長高（定格）：t0 前很小，t1 長到原本大小。"""
    for c in objs:
        c["s0"] = c.scale.x
    for fr in E.frames():
        t = fr / E.FPS
        g = 0.12 + 0.88 * min(1, max(0, (t - t0) / max(0.1, t1 - t0)))
        g = round(g * 6) / 6
        for i, c in enumerate(objs):
            gi = max(0.12, min(1, g - i * 0.03)); s0 = c["s0"]
            c.scale = (s0 * gi,) * 3; c.keyframe_insert("scale", frame=fr)
    for c in objs: E.constant(c)


def corn_rows():
    out = []
    for r in range(2):
        for c in range(4):
            out.append(E.place(f"{PROPS}/corn.glb", 0.07, (-0.53 + c * 0.022, -0.14 + r * 0.045, 0.012), math.radians(c * 37), "z"))
    return out


if SID == "S07":
    cottage()
    fam = [E.Char("pilgrim_man", (-0.575, 0.075), 0), E.Char("pilgrim_woman", (-0.545, 0.07), 0), E.Char("pilgrim_child", (-0.518, 0.065), 0)]
    for fr in E.frames():
        t = fr / E.FPS; k = fr // 2
        for i, ch in enumerate(fam):
            sh = 3 * ((k + i) % 2 * 2 - 1) if t > T["cold"] - 0.3 else 0          # 發抖：每 2 格左右晃
            ch.at(t, face_deg=sh)
            ch.pose(t, E.P_hug() if t > T["winter"] else E.P_stand(), twist={"Head": (0, 0, -8 if t > T["cold"] else 0)})
    for ch in fam: ch.finish()
    E.falling(160, (-0.74, -0.25, 0.015), (-0.38, 0.25, 0.26), 0.05, E.felt("snowFlake", (0.97, 0.98, 1.0)), r=0.0016, seed=7)
    # 溫度計：紅色水銀往下掉
    E.cyl((-0.485, 0.11, 0.05), 0.0045, 0.075, E.mat("glass", (0.85, 0.9, 0.95), 0.1))
    E.ball((-0.485, 0.11, 0.014), 0.007, E.mat("merc", (0.8, 0.1, 0.08), 0.3))
    merc = E.cyl((-0.485, 0.105, 0.016), 0.0028, 1.0, E.mat("merc", (0.8, 0.1, 0.08), 0.3))
    for fr in E.frames():
        t = fr / E.FPS; u = ease((t - T["cold"] + 0.2) / 1.2); h = 0.06 * (1 - 0.8 * u)
        merc.scale = (1, 1, h); merc.location.z = 0.016 + h / 2
        merc.keyframe_insert("scale", frame=fr); merc.keyframe_insert("location", frame=fr)
    E.constant(merc)
    E.flag("winter", (-0.47, 0.17, 0.012), T["winter"], lean=-5)
    shot_cam(42, 5.0, 55, 3.5,
             lin((-0.52, -0.34, 0.19), (-0.55, 0.08, 0.035), (-0.53, -0.31, 0.17), (-0.55, 0.085, 0.035), (-0.55, 0.07, 0.03)),
             lin((-0.53, -0.16, 0.065), (-0.545, 0.075, 0.045), (-0.535, -0.14, 0.06), (-0.545, 0.075, 0.045), (-0.545, 0.07, 0.045)))

elif SID == "S08":
    cottage()
    tq = E.Char("tisquantum", (-0.605, -0.075), 40)
    pm = E.Char("pilgrim_man", (-0.57, -0.085), -20)
    corns = corn_rows()
    for fr in E.frames():
        t = fr / E.FPS
        tq.pose(t, E.P_point_down(right=False) if t > T["helped"] else E.P_stand(), twist={"Head": (0, -15 if t > T["helped"] else 0, 0)})
        pm.pose(t, E.P_stand(), twist={"Head": (0, 15 * math.sin(t * 1.5), -10 if t > T["plant"] else 0)})
    tq.finish(); pm.finish()
    grow(corns, T["plant"] - 0.3, T["dur"] - 0.3)
    E.flag("Tisquantum", (-0.65, -0.02, 0.012), T["Tisquantum"], lean=6, size=0.022)
    E.flag("corn", (-0.46, -0.08, 0.012), T["corn"], lean=-6)
    shot_cam(42, 5.0, 40, 4.0,
             lin((-0.56, -0.32, 0.16), (-0.56, -0.09, 0.03), (-0.56, -0.29, 0.145), (-0.55, -0.09, 0.03), (-0.57, -0.09, 0.03)),
             lin((-0.6, -0.27, 0.065), (-0.575, -0.08, 0.04), (-0.585, -0.26, 0.065), (-0.565, -0.09, 0.04), (-0.585, -0.08, 0.04)))

elif SID == "S09":
    cottage(); corn_rows()
    for i, (x, y) in enumerate(((-0.62, -0.06), (-0.6, -0.085), (-0.58, -0.055))):
        E.place(f"{PROPS}/harvest_basket.glb", 0.032, (x, y, 0.012), math.radians(i * 40), "long")
    table = E.obstacle(E.place(f"{PROPS}/feast_table.glb", 0.09, (-0.66, 0.03, 0.012), 0, "long")); E.pop_in(table, T["feast"], s1=table.scale.x)
    fam = [E.Char("pilgrim_man", (-0.64, -0.1), 15), E.Char("pilgrim_woman", (-0.575, -0.115), -10), E.Char("pilgrim_child", (-0.6, -0.12), 0)]
    for fr in E.frames():
        t = fr / E.FPS; k = fr // 2
        fam[0].pose(t, E.P_stand())
        fam[1].pose(t, E.P_open() if t > T["harvest"] else E.P_stand())
        fam[2].pose(t, E.P_wave(k // 2, right=True) if t > T["harvest"] else E.P_stand())
    for ch in fam: ch.finish()
    E.falling(25, (-0.74, -0.05, 0.015), (-0.46, 0.2, 0.18), 0.04, E.felt("fallLeafA", (0.85, 0.4, 0.08)), r=0.0022, flat=True, seed=3)
    E.falling(25, (-0.74, -0.05, 0.015), (-0.46, 0.2, 0.18), 0.035, E.felt("fallLeafB", (0.7, 0.2, 0.06)), r=0.0022, flat=True, seed=4)
    wooden_number("1621", (-0.58, 0.14, 0.045), T["n1621"], 0.05)
    E.flag("harvest", (-0.545, -0.03, 0.012), T["harvest"], lean=-6)
    E.flag("feast", (-0.71, 0.06, 0.012), T["feast"], lean=6)
    shot_cam(42, 5.0, 50, 3.5,
             lin((-0.56, -0.48, 0.27), (-0.6, 0.0, 0.02), (-0.57, -0.43, 0.24), (-0.6, 0.0, 0.02), (-0.6, -0.06, 0.03)),
             lin((-0.66, -0.3, 0.07), (-0.61, -0.05, 0.03), (-0.63, -0.29, 0.07), (-0.62, -0.03, 0.03), (-0.61, -0.08, 0.03)))

elif SID == "S10":
    cottage()
    for x in (-0.71, -0.62, -0.53):
        E.obstacle(E.place(f"{PROPS}/feast_table.glb", 0.09, (x, 0.0, 0.012), 0, "long"))
    for i, (x, y) in enumerate(((-0.48, -0.06), (-0.47, -0.085))):
        E.place(f"{PROPS}/harvest_basket.glb", 0.03, (x, y, 0.012), math.radians(i * 50), "long")
    seats = [("pilgrim_man", -0.70), ("pilgrim_woman", -0.668), ("pilgrim_child", -0.638), ("massasoit", -0.605), ("wampanoag_man", -0.572),
             ("tisquantum", -0.54), ("wampanoag_woman", -0.508), ("wampanoag_child", -0.478)]
    chars = {n: E.Char(n, (-0.82, 0.1) if n == "massasoit" else (x, 0.045), 0) for n, x in seats}
    M_PATH = [(-0.82, 0.1), (-0.80, -0.055), (-0.7, -0.05)]

    def m_walk(u):
        """u 0→1：沿 M_PATH 等速走（兩段折線）。"""
        segs = [Vector(M_PATH[i + 1]) - Vector(M_PATH[i]) for i in range(2)]; L = [v.length for v in segs]; d = u * sum(L)
        if d <= L[0]: return Vector(M_PATH[0]) + segs[0] * (d / L[0])
        return Vector(M_PATH[1]) + segs[1] * ((d - L[0]) / L[1])

    rows_t = [T["about"] + 0.12 * r for r in range(9)]
    pegs = E.peg_grid(E.peg_doll_proto("native"), (-0.865, -0.175, 0.012), 10, 9, 0.017, 0.015, rows_t, face_deg=-20)
    for o in pegs:                                                          # 吃飯時小人偶退場，只留有名字的人物在桌邊
        o.hide_render = True; o.keyframe_insert("hide_render", frame=f(T["They"]))
    for fr in E.frames():
        t = fr / E.FPS; k = fr // 2
        for n, x in seats:
            ch = chars[n]
            if t < T["They"]:
                if n == "massasoit":
                    u = ease((t - 0.3) / (T["came"] - 0.3)); walking = 0.3 < t < T["came"]
                    seg1 = (Vector(M_PATH[1]) - Vector(M_PATH[0])).length; seg2 = (Vector(M_PATH[2]) - Vector(M_PATH[1])).length
                    ch.at(t, m_walk(u), (0 if u < seg1 / (seg1 + seg2) else 90) if walking else 0, hop=0.0015 * (k % 2) if walking else 0)
                    ch.pose(t, E.P_walk(k) if walking else (E.P_greet() if t < T["about"] else E.P_stand()))
                elif n.startswith("pilgrim"):
                    ch.at(t, (x + 0.06, -0.07), 0); ch.pose(t, E.P_open() if t > T["came"] else E.P_stand())
                else:
                    ch.at(t, (x, 0.5), 0); ch.pose(t, E.P_stand())                 # 還沒入席：放到畫面外
            else:
                ch.at(t, (x, 0.045), 0); ch.pose(t, E.P_eat(k + len(n)))
    for ch in chars.values(): ch.finish()
    piv = E.empty("dayPivot", (-0.62, 0.24, 0.03))                          # 太陽月亮轉 3 圈＝三天
    sun = E.cyl((0.13, 0, 0), 0.02, 0.003, E.emission("sunE", (1, 0.75, 0.25), 6), rot=(math.radians(90), 0, 0)); sun.parent = piv
    moon = E.cyl((-0.13, 0, 0), 0.016, 0.003, E.emission("moonE", (0.8, 0.85, 1), 3), rot=(math.radians(90), 0, 0)); moon.parent = piv
    for fr in E.frames():
        t = fr / E.FPS; u = max(0, (t - T["They"]) / (T["dur"] - T["They"] - 0.3))
        piv.rotation_euler.y = -math.radians(90) + min(1, u) * 3 * 2 * math.pi
        piv.keyframe_insert("rotation_euler", index=1, frame=fr)
    E.constant(piv)
    def s10_r2(t):
        if t < T["They"]:
            u = ease((t - 0.3) / (T["came"] - 0.3)); m = m_walk(u)
            return Vector((m.x - 0.06, m.y - 0.2, 0.07)), Vector((m.x, m.y, 0.045)), Vector((m.x, m.y, 0.045))
        return Vector((-0.62, -0.2, 0.075)), Vector((-0.62, 0.04, 0.045)), Vector((-0.62, 0.045, 0.045))
    E.flag("Massasoit", (-0.9, 0.17, 0.012), T["Massasoit"], lean=6, size=0.022)
    shot_cam(40, 5.6, 50, 3.5,
             lin((-0.68, -0.52, 0.3), (-0.7, -0.05, 0.03), (-0.67, -0.48, 0.28), (-0.68, -0.03, 0.03), (-0.68, -0.04, 0.03)), s10_r2)

elif SID == "S11":
    import json
    lay = json.load(open(f"{PROPS}/cal_layout.json"))
    CAL = Vector((0.3, -0.38, 0.0))
    E.place(f"{PROPS}/desk_calendar.glb", 0.15, CAL, 0, "x")
    PW, PH = 0.128, 0.098; tilt = math.radians(float(os.environ.get("CAL_TILT", "14")))
    pz = float(os.environ.get("CAL_Z", "0.058")); py = float(os.environ.get("CAL_Y", "-0.045"))
    holder = E.empty("pageHolder", (CAL.x, CAL.y + py, pz)); holder.rotation_euler = (math.radians(90) - tilt, 0, 0)

    def page(img, name):
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0)); o = bpy.context.object; o.name = name
        o.scale = (PW, PH, 1); o.data.materials.append(E.tex_mat(name, f"{PROPS}/{img}", rough=0.8, bump=0.03))
        o.parent = holder; return o
    page("cal_nov2026.png", "pageNov")
    hinge = E.empty("pageHinge"); hinge.parent = holder; hinge.location = (0, PH / 2, 0.0006)
    p63 = page("cal_1863.png", "page1863"); p63.parent = hinge; p63.location = (0, -PH / 2, 0)
    for fr in E.frames():                                                   # 翻頁：往上翻走
        t = fr / E.FPS; u = ease((t - T["Today"] + 0.4) / 0.6)
        hinge.rotation_euler.x = math.radians(-200 * u); hinge.keyframe_insert("rotation_euler", index=0, frame=fr)
    E.constant(hinge)
    for o in [p63] + list(hinge.children):                                 # 翻完就藏起來（不然倒著露在上面）
        o.hide_render = False; o.keyframe_insert("hide_render", frame=-1)
        o.hide_render = True; o.keyframe_insert("hide_render", frame=f(T["Today"] + 0.25))
    stamp = E.text_obj("holiday", 0.024, E.mat("stampRed", (0.75, 0.1, 0.08), 0.5), extrude=0.0006)
    stamp.parent = hinge; stamp.location = (0.0, -PH * 0.78, 0.001); stamp.rotation_euler = (0, 0, math.radians(-8)); E.pop_in(stamp, T["holiday"])
    # v3：holiday 的圖示——軟陶火雞＋收成籃，在月曆兩旁跳出來
    turkey = E.place(f"{PROPS}/turkey.glb", 0.06, (CAL.x - 0.112, CAL.y - 0.075, 0.0), math.radians(18), "z"); E.pop_in(turkey, T["holiday"], s1=turkey.scale.x)
    bask = E.place(f"{PROPS}/harvest_basket.glb", 0.045, (CAL.x + 0.112, CAL.y - 0.075, 0.0), math.radians(-20), "long"); E.pop_in(bask, T["holiday"] + 0.25, s1=bask.scale.x)
    ring_m = E.mat("ringRed", (0.8, 0.12, 0.08), 0.4); glow = E.emission("ringGlow", (1, 0.6, 0.2), 4)
    cw, ch_ = lay["cell"]
    for i, d in enumerate(("5", "12", "19", "26")):                           # 數星期四，26 發亮
        u, v = lay["thursdays"][d]
        bpy.ops.mesh.primitive_torus_add(major_radius=PW * cw * 0.42, minor_radius=0.0009, location=(0, 0, 0))
        r = bpy.context.object; r.data.materials.append(glow if d == "26" else ring_m); r.parent = holder
        r.location = ((u - 0.5) * PW, (0.5 - v) * PH, 0.001)
        E.pop_in(r, T["fourth"] - 1.2 + 0.4 * i)
    S11_D = [float(x) for x in os.environ.get("S11_D", "0.42,0.39,0.40,0.37").split(",")]   # r1 起、迄距離；r2 起、迄距離
    S11_AZ = float(os.environ.get("S11_AZ", "0.062"))                                         # 對準點高度（越高，月曆越往下）
    dv = Vector((0, -0.965, 0.262)); aim11 = Vector((0.3, -0.43, S11_AZ))
    shot_cam(45, 5.6, 55, 5.6,
             lin(aim11 + dv * S11_D[0], aim11, aim11 + dv * S11_D[1], aim11, (0.3, -0.43, 0.055)),
             lin(aim11 + dv * S11_D[2] + Vector((0.01, 0, 0)), aim11, aim11 + dv * S11_D[3], aim11, (0.3, -0.43, 0.052)))

elif SID == "S12":
    cottage()
    fire_pos = Vector((-0.71, 0.09, 0.012))
    flames = [E.cone(fire_pos + Vector((0, 0, h / 2 + 0.004)), r_, 0, h, E.emission(f"flame{k}", c, 4), verts=8)
              for k, (c, r_, h) in enumerate((((1, 0.45, 0.1), 0.007, 0.022), ((1, 0.7, 0.2), 0.005, 0.016)))]
    bpy.ops.object.light_add(type="POINT", location=fire_pos + Vector((0, 0, 0.03))); fire = bpy.context.object
    fire.data.color = (1, 0.55, 0.2); fire.data.shadow_soft_size = 0.01
    for fr in E.frames():
        k = fr // 2
        fire.data.energy = 0.35 + 0.12 * ((k * 7) % 5) / 5; fire.data.keyframe_insert("energy", frame=fr)
        for i, fl in enumerate(flames):
            fl.scale = (1, 1, 0.8 + 0.35 * (((k + i) * 3) % 4) / 4); fl.keyframe_insert("scale", frame=fr)
    E.constant(fire.data)
    for fl in flames: E.constant(fl)
    for n, ang in (("tisquantum", 20), ("wampanoag_man", 55), ("wampanoag_child", 90), ("wampanoag_woman", 125), ("massasoit", 160)):
        a = math.radians(ang); x = fire_pos.x + 0.035 * math.cos(a); y = fire_pos.y + 0.035 * math.sin(a)
        face = math.degrees(math.atan2(fire_pos.y - y, fire_pos.x - x)) + 90             # 面向火
        ch = E.Char(n, (x, y), face)
        for fr in E.frames():
            ch.pose(fr / E.FPS, E.P_warm() if n != "wampanoag_child" else E.P_stand(), twist={"Head": (0, 0, -6)})
        ch.finish()
    rnd = __import__("random").Random(5)
    for i in range(40):                                                   # 牆上的星星
        E.ball((rnd.uniform(-0.9, 0.9), 0.835, rnd.uniform(0.3, 0.95)), 0.002 + rnd.random() * 0.002, E.emission("star", (1, 0.95, 0.8), 5))
    if SHOT == "r2":                                                      # 最後檯燈熄滅
        e0 = L.data.energy
        for lt in (L, Fl, R):                                             # 檯燈和補光一起暗下來，只剩營火
            e0 = lt.data.energy
            for fr, e in ((-1, e0), (f(T["dur"] - 1.6), e0), (f(T["dur"] - 1.2), e0 * (0.0 if lt is L else 0.15))):
                lt.data.energy = e; lt.data.keyframe_insert("energy", frame=fr)
            E.constant(lt.data)
    E.flag("remember", (-0.66, 0.15, 0.012), T["remember"], lean=-6)

    def far(t):
        u = ease(max(0, (t - 1.0) / (T["dur"] - 2.0)))
        return vlerp((-0.7, -0.14, 0.07), (-0.2, -0.85, 0.5), u), vlerp((-0.71, 0.09, 0.03), (-0.5, 0.1, 0.0), u), Vector((-0.71, 0.09, 0.03))
    shot_cam(42, 4.0, 45, 4.0,
             lin((-0.72, -0.32, 0.18), (-0.74, 0.1, 0.03), (-0.71, -0.29, 0.16), (-0.73, 0.1, 0.03), (-0.72, 0.09, 0.03)), far)
