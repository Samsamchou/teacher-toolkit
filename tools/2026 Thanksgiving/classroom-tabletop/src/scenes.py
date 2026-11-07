# 感恩節課堂版場景（片頭海報＋開場、S04–S06）
# blender -b --factory-startup --python scenes.py -- <props> <fonts> <SID> <shot r1|r2> <mode> ...
#   SID: O（海報＋開場）、S04、S05、S06
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
from engine import f, ease, lerp, vlerp

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SID, SHOT = A[0], A[1], A[2], A[3]
LEAD = 0.5
# 各句時間（片段秒）：配音在 0.5 秒開始；W 是關鍵字出現的時間
TIMES = {
    ("O", "r1"): dict(dur=17.6),
    ("S04", "r1"): dict(dur=8.2, Mayflower=1.21, About=3.31, n100=3.8, end=7.10),
    ("S04", "r2"): dict(dur=9.2, Mayflower=1.37, About=3.79, n100=4.34, end=8.11),
    ("S05", "r1"): dict(dur=4.8, Today=0.11, Pilgrims=2.16, end=4.20),
    ("S05", "r2"): dict(dur=5.4, Today=0.12, Pilgrims=2.46, end=4.80),
    ("S06", "r1"): dict(dur=5.4, Wampanoag=1.99, people=3.03, end=4.75),
    ("S06", "r2"): dict(dur=6.0, Wampanoag=2.26, people=3.46, end=5.42),
    ("S07", "r1"): dict(dur=5.9, winter=0.85, cold=2.24, hard=3.02, end=4.75),
    ("S07", "r2"): dict(dur=6.6, winter=0.96, cold=2.55, hard=3.44, end=5.42),
    ("S08", "r1"): dict(dur=7.7, Wampanoag=0.27, Tisquantum=2.19, helped=3.63, plant=4.33, corn=4.86, end=6.55),
    ("S08", "r2"): dict(dur=8.6, Wampanoag=0.3, Tisquantum=2.5, helped=4.14, plant=4.94, corn=5.55, end=7.49),
    ("S09", "r1"): dict(dur=8.6, fall=0.47, n1621=1.08, harvest=4.13, feast=5.69, end=7.44),
    ("S09", "r2"): dict(dur=9.7, fall=0.53, n1621=1.23, harvest=4.71, feast=6.5, end=8.52),
    ("S10", "r1"): dict(dur=11.8, Massasoit=0.11, leader=2.67, came=3.67, about=4.27, n90=4.66, They=6.77, three=8.47, end=10.63),
    ("S10", "r2"): dict(dur=13.3, Massasoit=0.12, leader=3.05, came=4.19, about=4.87, n90=5.32, They=7.73, three=9.68, end=12.17),
    ("S11", "r1"): dict(dur=12.2, n1863=0.11, holiday=3.99, Today=5.88, fourth=7.58, Thursday=8.09, November=9.12, end=11.04),
    ("S11", "r2"): dict(dur=13.8, n1863=0.12, holiday=4.55, Today=6.71, fourth=8.66, Thursday=9.25, November=10.43, end=12.62),
    ("S12", "r1"): dict(dur=8.0, Native=0.85, remember=4.1, history=4.99, end=6.82),
    ("S12", "r2"): dict(dur=9.0, Native=0.96, remember=4.67, history=5.69, end=7.8),
}
T = {k: (v + LEAD if k not in ("dur",) else v) for k, v in TIMES[(SID, SHOT)].items()}
E.init(PROPS, FONTS, T["dur"])
# v2：依 chk_report 的頭頂數據把鏡頭往上抬／往後拉（頭頂留 8% 以上、第 2 次改成中景）
E.REFRAME = {("S05", "r2"): (0.010, 1.15), ("S06", "r2"): (0.020, 1.15), ("S07", "r2"): (0.014, 1.15),
             ("S08", "r1"): (0.030, 1.0), ("S08", "r2"): (0.020, 1.15), ("S09", "r2"): (0.020, 1.15),
             ("S10", "r1"): (0.009, 1.0), ("S10", "r2"): (0.014, 1.15), ("S12", "r2"): (0.020, 1.15)}.get((SID, SHOT), (0.0, 1.0))
if (SID, SHOT) == ("S07", "r2"): E.FLAG_HIDE = {"winter"}   # v3：近景只剩溫度計後面，放了會被擋
if SID in ("S07", "S08", "S09", "S10", "S12"):   # v3：人物站上 1.2 公分底板後，鏡頭也抬高 1.2 公分（構圖和 v2 一樣）
    E.REFRAME = (E.REFRAME[0] + 0.012, E.REFRAME[1])
E.desk_world()

# ---------- 共用：牆上軟木板海報、檯燈、兩個布景台 ----------
def poster_wall():
    cork = E.mat("cork", (0.55, 0.38, 0.2), 0.95)
    E.box((0.0, 0.832, 0.62), (0.82, 0.012, 0.56), cork, "corkboard", bevel=0.004)
    frame_m = E.wood()
    for (x, z, sx, sz) in ((0, 0.9, 0.86, 0.025), (0, 0.34, 0.86, 0.025), (-0.42, 0.62, 0.025, 0.58), (0.42, 0.62, 0.025, 0.58)):
        E.box((x, 0.828, z), (sx, 0.02, sz), frame_m, "frame")
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0.0, 0.8245, 0.62), rotation=(math.radians(90), 0, 0))
    p = bpy.context.object; p.name = "poster"; p.scale = (0.72, 0.48, 1)
    p.data.materials.append(E.tex_mat("poster", f"{PROPS}/poster_tex.png", rough=0.75, bump=0.05))
    pin = E.mat("pin", (0.75, 0.12, 0.1), 0.3)
    for x, z in ((-0.35, 0.85), (0.35, 0.85), (-0.35, 0.39), (0.35, 0.39)):
        E.ball((x, 0.822, z), 0.006, pin)


def desk_lamp():
    brass = E.mat("lampBrass", (0.6, 0.42, 0.18), 0.3); green = E.mat("lampShade", (0.1, 0.25, 0.18), 0.4)
    E.cyl((-0.62, 0.42, 0.006), 0.07, 0.012, brass)
    E.cyl((-0.62, 0.42, 0.2), 0.008, 0.38, brass)
    E.cyl((-0.55, 0.35, 0.39), 0.006, 0.2, brass, rot=(math.radians(-45), math.radians(35), 0))
    sh = E.cone((-0.48, 0.28, 0.42), 0.075, 0.03, 0.07, green); sh.rotation_euler = (math.radians(40), math.radians(-25), 0)
    E.ball((-0.48, 0.28, 0.395), 0.018, E.emission("bulb", (1, 0.8, 0.5), 8))


def england_board():
    """右邊：英國港口（深灰綠毛氈陸地＋深藍海、木頭碼頭、石板廣場、木屋排、桶子木箱、路燈）。"""
    E.board((0.72, 0.0), (0.56, 0.52), E.felt("engLand", (0.16, 0.24, 0.13)), "engBoard")
    E.box((0.48, 0.0, 0.0135), (0.09, 0.52, 0.003), E.felt("engSea", (0.07, 0.28, 0.36)), "engSea", bevel=0.001)
    E.box((0.68, -0.07, 0.0128), (0.25, 0.24, 0.0012), E.felt("cobble", (0.2, 0.17, 0.13)), "square", bevel=0)
    for i in range(9):                                   # 木頭碼頭
        E.box((0.535 + i * 0.012, 0.08, 0.016), (0.011, 0.07, 0.004), E.wood(), "plank")
    for x in (0.53, 0.64):
        for y in (0.05, 0.11): E.cyl((x, y, 0.012), 0.004, 0.024, E.wood())
    walls = [E.felt("wallA", (0.82, 0.76, 0.64)), E.felt("wallB", (0.7, 0.62, 0.5)), E.felt("wallC", (0.62, 0.58, 0.52))]
    roofs = [E.felt("roofA", (0.36, 0.16, 0.1)), E.felt("roofB", (0.22, 0.2, 0.22))]
    win = E.emission("winGlow", (1, 0.75, 0.35), 3)
    for k, (x, y, w) in enumerate(((0.72, 0.19, 0.055), (0.785, 0.2, 0.05), (0.845, 0.19, 0.055), (0.905, 0.2, 0.05), (0.93, 0.1, 0.05), (0.93, 0.01, 0.05))):
        h = 0.045 + (k % 2) * 0.01; rotz = math.radians(90) if x > 0.92 and y < 0.15 else 0
        E.box((x, y, 0.012 + h / 2), (w, 0.045, h), walls[k % 3], "house", rot=(0, 0, rotz))
        # 屋頂：方塊轉 45 度，上半露出來就是人字形屋頂
        pr = E.box((x, y, 0.012 + h), (w * 1.08, 0.036, 0.036), roofs[k % 2], "roof", bevel=0.001)
        pr.rotation_euler = (math.radians(45), 0, rotz) if not rotz else (0, math.radians(45), rotz - math.radians(90))
        dx, dy = (0, -0.0235) if not rotz else (-0.0235, 0)
        E.box((x + dx, y + dy, 0.012 + 0.012), (0.01, 0.002, 0.022), E.wood(), "door", bevel=0, rot=(0, 0, rotz))
        for wx in (-0.016, 0.016):
            ox, oy = (wx, -0.0236) if not rotz else (-0.0236, wx)
            E.box((x + ox, y + oy, 0.012 + h * 0.62), (0.009, 0.002, 0.009), win, "win", bevel=0, rot=(0, 0, rotz))
    for (x, y) in ((0.66, 0.13), (0.672, 0.145), (0.684, 0.13), (0.6, 0.15)):
        E.cyl((x, y, 0.012 + 0.008), 0.0065, 0.016, E.wood())
    crate = E.felt("crate", (0.45, 0.3, 0.16))
    for (x, y, z) in ((0.555, 0.15, 0.019), (0.57, 0.15, 0.019), (0.562, 0.15, 0.033)):
        E.box((x, y, z), (0.013, 0.013, 0.013), crate, "crate", bevel=0.001)
    sack = E.felt("sack", (0.7, 0.6, 0.42))
    for (x, y) in ((0.7, 0.12), (0.712, 0.118)): E.ball((x, y, 0.019), 0.008, sack)
    for (x, y) in ((0.575, -0.19), (0.79, -0.19), (0.575, 0.03), (0.79, 0.03)):   # 路燈
        E.cyl((x, y, 0.012 + 0.03), 0.0015, 0.06, E.mat("iron", (0.05, 0.05, 0.05), 0.5))
        E.ball((x, y, 0.012 + 0.063), 0.005, E.emission("lampGlow", (1, 0.75, 0.4), 6))
    for k, (x, y) in enumerate(((0.95, -0.2), (0.97, -0.1), (0.88, -0.23), (0.62, 0.22))):
        E.paper_tree((x, y, 0.012), 0.07, seed=k)


def newengland_board(autumn=False, snow=False, settle=False):
    """左邊：新英格蘭（綠毛氈、紙樹林、wetu 村莊）。"""
    land = E.felt("neSnow", (0.92, 0.93, 0.96)) if snow else E.felt("neLand", (0.24, 0.36, 0.18))
    E.board((-0.72, 0.0), (0.56, 0.52), land, "neBoard")
    import random
    rnd = random.Random(3)
    spots = []
    for k in range(26):
        x = rnd.uniform(-0.98, -0.47); y = rnd.uniform(-0.24, 0.24)
        if abs(x + 0.80) < 0.09 and -0.05 < y < 0.22: continue      # 村莊空地
        if abs(x + 0.78) < 0.14 and y < 0.05: continue               # 鏡頭往村莊看的通道
        if x > -0.6 and y < -0.05: continue                          # 前景留空
        if settle and x > -0.66: continue                            # S07 起：清教徒小屋、玉米田、長桌的空地
        spots.append((x, y)); E.paper_tree((x, y, 0.012), rnd.uniform(0.06, 0.1), autumn=autumn, snow=snow, seed=k)
    wetu = E.place(f"{PROPS}/wetu.glb", 0.13, (-0.80, 0.15, 0.012), math.radians(10), "x")
    stones = E.felt("stoneNE", (0.45, 0.43, 0.4))
    for k in range(7):
        a = k / 7 * 6.283; E.ball((-0.71 + 0.014 * math.cos(a), 0.09 + 0.014 * math.sin(a), 0.014), 0.005, stones)
    for k in range(3):
        E.cyl((-0.71, 0.09, 0.02), 0.002, 0.03, E.wood(), rot=(math.radians(70), 0, k * 2.1))
    return wetu


SEASON = {"S07": "snow", "S09": "autumn", "S10": "autumn", "S12": "night"}.get(SID, "")
poster_wall(); desk_lamp(); england_board()
newengland_board(autumn=SEASON == "autumn", snow=SEASON == "snow", settle=SID in ("S07", "S08", "S09", "S10", "S12"))
L, Fl, R = E.lights(lamp=0.35 if SEASON == "night" else 1.0, cold=1.0 if SEASON == "snow" else 0.0)
# 五月花號（依句子放在不同位置）
def ship_at(loc, heading_deg):
    s = E.place(f"{PROPS}/mayflower.glb", 0.11, loc, 0, "long")
    h = E.empty("shipHolder", loc); s.parent = h; s.location = (0, 0, 0); h.rotation_euler.z = math.radians(heading_deg)
    for fr in E.frames():
        t = fr / E.FPS
        h.location.z = loc[2] + 0.001 * math.sin(t * 4); h.rotation_euler.x = math.radians(2 * math.sin(t * 2.7))
        h.keyframe_insert("location", index=2, frame=fr); h.keyframe_insert("rotation_euler", index=0, frame=fr)
    E.constant(h); return h

# ---------- 各段 ----------
if SID == "O":
    # 0.0 暗 → 0.3 檯燈亮（海報出現）→ 0.3–6.3 海報慢推 → 6.3–8.3 往下到書桌 → 8.6 配音、書翻開 → 13.2 鏡頭升到地圖上方
    ship_at(E.map_px(1385, 548) + Vector((0, 0, 0.0015)), 180)
    for fr, e in ((-1, 0.0), (f(0.3), 55.0)):
        L.data.energy = e; L.data.keyframe_insert("energy", frame=fr)
    for fr, e in ((-1, 2.0), (f(0.3), 9.0)):
        Fl.data.energy = e; Fl.data.keyframe_insert("energy", frame=fr)
    E.constant(L.data); E.constant(Fl.data)
    # 書：封面翻開，右頁是片名
    paper = E.mat("pagePaper", (0.78, 0.7, 0.55), 0.85); coverm = E.felt("bookCover", (0.28, 0.07, 0.04))
    bx, by = 0.0, -0.36
    E.box((bx + 0.06, by, 0.008), (0.12, 0.17, 0.016), paper, "pagesR")
    E.box((bx + 0.06, by, 0.0005), (0.125, 0.175, 0.001), coverm, "backCover", bevel=0)
    hinge = E.empty("hinge", (bx, by, 0.016))
    cov = E.box((0.0625, 0, 0.001), (0.125, 0.175, 0.002), coverm, "frontCover", bevel=0.0005); cov.parent = hinge
    lpages = E.box((0.06, 0, -0.004), (0.12, 0.17, 0.006), paper, "pagesL", bevel=0); lpages.parent = hinge
    for fr in E.frames():
        t = fr / E.FPS; u = ease((t - 8.6) / 1.2)
        hinge.rotation_euler.y = math.radians(-178 * u); hinge.keyframe_insert("rotation_euler", index=1, frame=fr)
    E.constant(hinge)
    ink = E.mat("titleInk", (0.3, 0.12, 0.05), 0.5)
    t1 = E.text_obj("How Thanksgiving", 0.016, ink); t1.location = (bx + 0.06, by + 0.025, 0.0165)
    t2 = E.text_obj("Began", 0.024, ink); t2.location = (bx + 0.06, by - 0.008, 0.0165)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.06, 0, 0.0021)); mpg = bpy.context.object; mpg.scale = (0.1, 0.07, 1)
    mpg.rotation_euler = (0, math.radians(180), math.radians(180)); mpg.data.materials.append(E.tex_mat("pageMap", f"{PROPS}/atlantic_map.png", bump=0.03)); mpg.parent = hinge
    mpg.location = (0.06, 0, -0.0072)
    red = E.mat("titleRed", (0.75, 0.12, 0.08), 0.5)
    leaf = E.text_obj("~ 1620 ~", 0.012, red); leaf.location = (bx + 0.06, by - 0.045, 0.0165)
    cam, aim, foc = E.camera("cam", 42, 5.6)
    P_POSTER = ((0.0, 0.05, 0.62), (0.0, 0.83, 0.62))         # (相機, 目標)
    P_BOOK = ((0.02, -0.7, 0.34), (0.0, -0.36, 0.0))
    P_MAP = ((0.10, -0.62, 0.66), (0.04, 0.0, 0.0))
    CUT = 6.8      # 海報 → 書本：直接切換（合成時在這一格做 0.6 秒溶接），不讓鏡頭掃過地圖
    def path(t):
        if t < CUT:
            u = ease(t / CUT); c = vlerp((0.0, -0.42, 0.62), (0.0, -0.3, 0.62), u); return c, P_POSTER[1], Vector((0, 0.8245, 0.62))
        if t < 8.6:
            return Vector(P_BOOK[0]), Vector(P_BOOK[1]), Vector(P_BOOK[1])
        if t < 13.2:
            return vlerp(P_BOOK[0], (0.02, -0.64, 0.29), (t - 8.6) / 4.6), P_BOOK[1], Vector(P_BOOK[1])
        u = ease((t - 13.2) / 3.6); c = vlerp((0.02, -0.64, 0.29), P_MAP[0], u); a = vlerp(P_BOOK[1], P_MAP[1], u)
        return c, a, vlerp(P_BOOK[1], (0.2, 0.0, 0.02), u)
    E.key_cam(cam, aim, foc, path)

elif SID == "S04":
    ship = ship_at((0.485, 0.08, 0.0145), 90)            # 停在碼頭邊，船頭朝北
    E.flag("Mayflower", (0.55, 0.13, 0.016), T["Mayflower"], lean=-6)
    protos = E.peg_doll_proto()
    rows_t = [T["About"] + 0.25 * r for r in range(10)]
    E.peg_grid(protos, (0.585, -0.16, 0.012), 10, 10, 0.022, 0.02, rows_t, face_deg=180)
    if SHOT == "r2":
        n = E.text_obj("100", 0.06, E.wood(), extrude=0.005); n.rotation_euler = (math.radians(90), 0, 0)
        n.location = (0.63, 0.075, 0.05); E.pop_in(n, T["n100"])
    cam, aim, foc = E.camera("cam", 40 if SHOT == "r1" else 45, 5.6 if SHOT == "r1" else 5.0)
    if SHOT == "r1":
        def path(t):
            u = t / T["dur"]
            return vlerp((0.62, -0.5, 0.35), (0.63, -0.45, 0.31), u), vlerp((0.63, 0.0, 0.0), (0.64, 0.01, 0.0), u), Vector((0.6, 0.0, 0.02))
    else:
        def path(t):
            u = t / T["dur"]
            return vlerp((0.42, -0.27, 0.08), (0.45, -0.28, 0.085), u), vlerp((0.56, 0.05, 0.035), (0.58, 0.05, 0.035), u), Vector((0.53, 0.04, 0.03))
    E.key_cam(cam, aim, foc, path)

elif SID in ("S05", "S06"):
    CC = E.map_px(325, 445)                                # Cape Cod 一帶
    ship_at((CC.x + 0.05, CC.y - 0.035, 0.0015), 180)       # 船停在岸外，船頭朝西
    pm = E.Char("pilgrim_man", (CC.x, -0.03), -90)
    pw = E.Char("pilgrim_woman", (CC.x + 0.012, -0.062), -90)
    pc = E.Char("pilgrim_child", (CC.x + 0.004, -0.092), -90)
    wm = E.Char("wampanoag_man", (-0.845, 0.06), 20)
    ww = E.Char("wampanoag_woman", (-0.80, 0.055), 5)
    wc = E.Char("wampanoag_child", (-0.758, 0.04), -15)
    fam_p = [(pm, 0.0, -0.03), (pw, 0.012, -0.062), (pc, 0.004, -0.092)]
    if SID == "S05":
        stop_t = T["Pilgrims"] - 0.2
        for fr in E.frames():
            t = fr / E.FPS; k = fr // 2
            walking = 0.3 < t < stop_t
            u = ease((t - 0.3) / (stop_t - 0.3))
            for ch, dx, dy in fam_p:
                x = CC.x + dx - 0.06 * u
                ch.at(t, (x, dy), -90 if walking or SHOT == "r1" else -60, hop=0.0015 * (k % 2) if walking else 0)
                if walking: ch.pose(t, E.P_walk(k))
                elif SHOT == "r2" and ch is pc and t > T["Pilgrims"]: ch.pose(t, E.P_wave(k // 2, right=True))
                else:
                    look = 25 * math.sin(t * 1.3 + dx * 50) if SHOT == "r2" else 0
                    ch.pose(t, E.P_stand(), twist={"Head": (0, look, 0)})
        E.flag("Pilgrims", (CC.x - 0.05, 0.03, 0.0015), T["Pilgrims"], lean=-5)
        cam, aim, foc = E.camera("cam", 45 if SHOT == "r1" else 55, 4.0 if SHOT == "r1" else 4.0)
        if SHOT == "r1":
            def path(t):
                u = t / T["dur"]
                return vlerp((-0.36, -0.42, 0.22), (-0.38, -0.38, 0.19), u), vlerp((-0.24, -0.04, 0.02), (-0.27, -0.05, 0.03), u), Vector((-0.27, -0.06, 0.04))
        else:
            def path(t):
                u = t / T["dur"]; x = CC.x - 0.06 * ease((t - 0.3) / (stop_t - 0.3))
                return vlerp((-0.5, -0.26, 0.07), (-0.49, -0.25, 0.075), u), Vector((x - 0.01, -0.055, 0.04)), Vector((x, -0.06, 0.045))
        for ch in (wm, ww, wc):
            ch.pose(0, E.P_stand())
    else:  # S06：清教徒一家停在岸邊；鏡頭越過紙樹林到村莊
        for ch, dx, dy in fam_p:
            ch.at(0, (CC.x + dx - 0.06, dy), -90); ch.pose(0, E.P_stand())
        for fr in E.frames():
            t = fr / E.FPS; k = fr // 2
            if SHOT == "r2":
                wm.pose(t, E.P_greet() if t > 1.0 else E.P_stand())
                ww.pose(t, E.P_chest(right=True) if t > 1.6 else E.P_stand())
                wc.pose(t, E.P_wave(k // 2, right=False) if t > T["Wampanoag"] else E.P_stand(), twist={"Head": (0, 10 * math.sin(t), 0)})
            else:
                for ch in (wm, ww, wc):
                    ch.pose(t, E.P_stand(), twist={"Head": (0, 8 * math.sin(t * 1.2 + ch.root.location.x * 40), 0)})
        E.flag("Wampanoag", (-0.765, 0.2, 0.012), T["Wampanoag"], lean=6, size=0.022)
        cam, aim, foc = E.camera("cam", 45 if SHOT == "r1" else 55, 4.0 if SHOT == "r1" else 2.8)
        if SHOT == "r1":
            def path(t):
                u = ease(min(1, t / 2.6))
                c = vlerp((-0.22, -0.42, 0.24), (-0.74, -0.36, 0.2), u)
                a = vlerp((-0.3, -0.04, 0.02), (-0.79, 0.08, 0.03), u)
                return c, a, a
        else:
            def path(t):
                u = t / T["dur"]
                return vlerp((-0.74, -0.2, 0.05), (-0.77, -0.19, 0.055), u), Vector((-0.80, 0.05, 0.045)), Vector((-0.80, 0.05, 0.045))
    E.key_cam(cam, aim, foc, path)
    for ch in (pm, pw, pc, wm, ww, wc): ch.finish()

if SID in ("S07", "S08", "S09", "S10", "S11", "S12"):
    exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes_s07_s12.py"), encoding="utf-8").read())

E.run(A[4:])
