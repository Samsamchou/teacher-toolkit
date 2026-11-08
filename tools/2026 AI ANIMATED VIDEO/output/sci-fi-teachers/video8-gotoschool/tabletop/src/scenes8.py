# 影片 8 情境動畫（畫風 H 桌上微縮）：桌上小鎮的早晨，十位朋友搭不同交通工具到紙箱學校。
# blender -b --factory-startup --python scenes8.py -- <props> <fonts> <SID> <mode> ...
#   SID：LINEUP（檢查模型方向）、OPEN、Mia…Nam、END；mode 同 engine.run（sheet／range／check／save）
# 世界：木頭桌面上一塊圓形綠色毛氈小鎮，紙箱學校在中間；十條「路」像星星一樣從外圈通到學校（馬路、鐵軌、河、跑道、人行道）。
# 朋友是紙片立牌（去背全身圖＋白色卡紙邊＋木頭底座）；腳踏車、機車、船、走路：立牌跟著一起走；
# 汽車、計程車、公車、火車、捷運、飛機：立牌跳進去（縮小消失），到學校再跳出來。
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
from mathutils import Vector
import engine as E
from engine import f, ease, lerp

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SID = A[0], A[1], A[2]
TM = json.load(open(os.path.join(HERE, "timing.json")))
KIDS = [("Mia", "boat"), ("Raj", "train"), ("Yuki", "bike"), ("Wei", "metro"), ("Sofia", "plane"),
        ("Kai", "scooter"), ("Lily", "bus"), ("Tom", "car"), ("Jisu", "taxi"), ("Nam", "foot")]
RIDE_ON = {"bike", "scooter", "boat", "foot"}          # 立牌看得到（騎在上面／站在甲板／走路）
LANE = {"boat": "water", "train": "rail", "metro": "rail", "plane": "runway", "bike": "bikelane", "foot": "sidewalk",
        "bus": "road", "car": "road", "taxi": "road", "scooter": "road"}
SIZE = {"bike": 0.075, "scooter": 0.085, "car": 0.115, "taxi": 0.115, "bus": 0.17, "train": 0.22, "metro": 0.22,
        "boat": 0.15, "plane": 0.17}
# 模型「車頭」方向的修正角（度）：匯入後車頭若朝 +X 就是 0；LINEUP 縮圖看過再填
YAW = {k: float(os.environ.get("YAW_" + k, "0")) for k in SIZE}
YAW.update(json.load(open(os.path.join(HERE, "yaw.json"))) if os.path.exists(os.path.join(HERE, "yaw.json")) else {})
KID_H = 0.075                    # 立牌高度（公尺）
R0, R1 = 0.74, 0.27              # 起點、終點（離學校中心的距離）
GZ = 0.012                       # 毛氈底板厚度＝地面高度

dur = TM[SID]["dur"] if SID in TM else 8.0
E.init(PROPS, FONTS, dur)
sc = E.sc

# ---------- 早晨的世界 ----------
w = sc.world.node_tree.nodes["Background"]; w.inputs[0].default_value = (0.55, 0.72, 0.95, 1); w.inputs[1].default_value = 0.35


def day_lights(sun=1.0):
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 2)); S = bpy.context.object; S.name = "sun"
    S.data.energy = 3.2 * sun; S.data.color = (1, 0.9, 0.75); S.data.angle = math.radians(6)
    S.rotation_euler = (math.radians(50), 0, math.radians(-35))
    bpy.ops.object.light_add(type="AREA", location=(-0.9, -1.0, 0.9)); F = bpy.context.object; F.name = "fill"
    F.data.energy = 60; F.data.color = (0.8, 0.9, 1); F.data.size = 1.2; F.rotation_euler = (math.radians(55), 0, math.radians(-40))
    return S


def strip(a, width, m, z=0.0012, r0=R1 - 0.05, r1=R0 + 0.06, name="strip"):
    u = Vector((math.cos(a), math.sin(a), 0)); mid = u * ((r0 + r1) / 2)
    return E.box((mid.x, mid.y, GZ + z / 2), (r1 - r0, width, z), m, name, bevel=0.0006, rot=(0, 0, a))


def lane(a, kind):
    u = Vector((math.cos(a), math.sin(a), 0)); p = Vector((-u.y, u.x, 0))
    if kind == "road":
        strip(a, 0.10, E.felt("road", (0.18, 0.18, 0.2)))
        for k in range(9):
            r = R1 + 0.02 + k * 0.055; c = u * r
            E.box((c.x, c.y, GZ + 0.0016), (0.025, 0.005, 0.0008), E.mat("dash", (0.95, 0.95, 0.9), 0.6), "dash", bevel=0, rot=(0, 0, a))
    elif kind == "bikelane":
        strip(a, 0.07, E.felt("bikelane", (0.2, 0.55, 0.45)))
    elif kind == "sidewalk":
        strip(a, 0.07, E.felt("walk", (0.85, 0.78, 0.62)))
        for k in range(12):
            r = R1 + k * 0.042; c = u * r
            E.box((c.x, c.y, GZ + 0.0016), (0.002, 0.07, 0.0006), E.mat("tileline", (0.65, 0.58, 0.45), 0.8), "tl", bevel=0, rot=(0, 0, a))
    elif kind == "water":
        strip(a, 0.20, E.mat("water", (0.15, 0.45, 0.8), 0.15), z=0.0015)
    elif kind == "runway":
        strip(a, 0.13, E.felt("runway", (0.12, 0.12, 0.14)))
        for k in range(8):
            r = R1 + 0.03 + k * 0.06; c = u * r
            E.box((c.x, c.y, GZ + 0.0016), (0.03, 0.006, 0.0008), E.mat("dash", (0.95, 0.95, 0.9), 0.6), "dash", bevel=0, rot=(0, 0, a))
    elif kind == "rail":
        strip(a, 0.07, E.felt("ballast", (0.42, 0.36, 0.3)))
        for k in range(26):
            r = R1 - 0.03 + k * 0.021; c = u * r
            E.box((c.x, c.y, GZ + 0.0025), (0.008, 0.055, 0.0025), E.wood(), "sleeper", bevel=0, rot=(0, 0, a))
        for s in (-0.018, 0.018):
            c = u * ((R1 + R0) / 2 + 0.01) + p * s
            E.box((c.x, c.y, GZ + 0.0045), (R0 - R1 + 0.11, 0.003, 0.003), E.mat("rail", (0.6, 0.6, 0.62), 0.3), "rail", bevel=0, rot=(0, 0, a))


def tree(loc, h, seed):
    E.paper_tree((loc[0], loc[1], GZ), h, seed=seed) if hasattr(E, "paper_tree") else None


def standee(name):
    """紙片立牌：去背全身圖（正面）＋白色卡紙（背面、略大＝白邊）＋木頭底座。root 在腳底，正面朝 -Y。"""
    img = bpy.data.images.load(f"{PROPS}/stand-{name.lower()}.png"); asp = img.size[0] / img.size[1]
    root = E.empty("kid_" + name)
    for back in (False, True):
        bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = f"{name}_{'back' if back else 'front'}"
        o.rotation_euler = (math.radians(90), 0, 0)
        s = 1.05 if back else 1.0
        o.scale = (KID_H * asp * s, KID_H * s, 1); o.location = (0, 0.0012 if back else 0, KID_H / 2 + 0.004)
        m = bpy.data.materials.new(o.name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
        if back:
            b.inputs["Base Color"].default_value = (0.95, 0.93, 0.88, 1); b.inputs["Roughness"].default_value = 0.9
        else:
            nt.links.new(t.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.55
        nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
        o.data.materials.append(m); o.parent = root
    base = E.box((0, 0.0006, 0.002), (0.022, 0.012, 0.004), E.wood(), name + "_base", bevel=0.001); base.parent = root
    return root


def vehicle(kind):
    root = E.place(f"{PROPS}/{kind}.glb", SIZE[kind], (0, 0, 0), 0.0, axis="long")
    for o in root.children_recursive:   # 腳踏車模型 190 萬面 → 簡化
        if o.type == "MESH" and len(o.data.polygons) > 150000:
            d = o.modifiers.new("dec", "DECIMATE"); d.ratio = 120000 / len(o.data.polygons)
    holder = E.empty("hold_" + kind); root.parent = holder
    root.rotation_euler = (0, 0, math.radians(YAW.get(kind, 0)))
    return holder


def key(o, t, loc=None, rot_z=None, scale=None):
    fr = f(t)
    if loc is not None: o.location = loc; o.keyframe_insert("location", frame=fr)
    if rot_z is not None: o.rotation_euler = (0, 0, rot_z); o.keyframe_insert("rotation_euler", frame=fr)
    if scale is not None: o.scale = (scale,) * 3; o.keyframe_insert("scale", frame=fr)


# ---------- 搭場景 ----------
E.box((0, 0, -0.02), (3.2, 2.4, 0.04), E.wood(), "desk")
E.box((0, 1.15, 0.6), (3.6, 0.02, 1.4), E.mat("wall", (0.86, 0.8, 0.7), 0.9), "wall")
bpy.ops.mesh.primitive_cylinder_add(radius=0.86, depth=GZ, location=(0, 0, GZ / 2), vertices=96)
town = bpy.context.object; town.name = "town"; town.data.materials.append(E.felt("grass", (0.32, 0.6, 0.3)))
E.GROUNDS.append((-0.86, 0.86, -0.86, 0.86, GZ))
SUN = day_lights()
school = E.place(f"{PROPS}/school.glb", 0.30, (0, 0, GZ), 0.0, axis="long")
ANG = {name: math.radians(-90 + 36 * i) for i, (name, _) in enumerate(KIDS)}   # 第一位（Mia）從正前方（-Y）來
for name, kind in KIDS: lane(ANG[name], LANE[kind])
# 小房子、樹：放在兩條路中間（DECOR[i]＝第 i 和 i+1 條路中間的東西；拍某位朋友時，鏡頭那一側的會藏起來）
DECOR = {i: [] for i in range(10)}
_n0 = set(bpy.data.objects.keys())
def _grab(i):
    global _n0
    new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - _n0]; DECOR[i] += new; _n0 = set(bpy.data.objects.keys())
for i in range(10):
    a = math.radians(-90 + 36 * i + 18); u = Vector((math.cos(a), math.sin(a), 0))
    for r, h in ((0.45, 0.06), (0.66, 0.08)):
        c = u * r
        if (i + int(r * 10)) % 2:
            E.box((c.x, c.y, GZ + h / 2), (0.05, 0.05, h), E.felt(f"house{i % 4}", [(0.9, 0.55, 0.45), (0.95, 0.85, 0.5), (0.6, 0.75, 0.9), (0.85, 0.65, 0.85)][i % 4]), "house", rot=(0, 0, a))
            E.cone((c.x, c.y, GZ + h + 0.015), 0.042, 0.0, 0.03, E.felt("roof", (0.55, 0.25, 0.2)), verts=4).rotation_euler = (0, 0, a + math.pi / 4)
        else:
            E.cyl((c.x, c.y, GZ + 0.02), 0.004, 0.04, E.wood())
            E.ball((c.x, c.y, GZ + 0.055), 0.025, E.felt("leaf", (0.2, 0.5, 0.25)))
    _grab(i)


def path_of(name):
    a = ANG[name]; u = Vector((math.cos(a), math.sin(a), 0)); p = Vector((-u.y, u.x, 0))
    return u, p


def place_kid(name, kind, at_school):
    """回傳 (立牌, 交通工具 holder)，放在起點或學校前（不是這一段主角時用）。"""
    u, p = path_of(name); k = standee(name); v = vehicle(kind) if kind != "foot" else None
    face = math.atan2(p.y, p.x) + math.pi / 2           # 立牌正面朝 p 方向（側邊鏡頭看得到）
    pos = u * (R1 if at_school else R0)
    if v: v.location = (pos.x, pos.y, GZ + (0.0015 if kind == "boat" else 0)); v.rotation_euler = (0, 0, math.atan2(-u.y, -u.x))
    kp = pos + p * (0.07 if v else 0.0) + (u * 0.03 if at_school else Vector())
    k.location = (kp.x, kp.y, GZ); k.rotation_euler = (0, 0, face)
    return k, v


SCENE = {}
if SID == "LINEUP":
    E.sc.frame_end = 0
    for i, kind in enumerate(SIZE):   # 兩排、間隔 0.32；每台右邊（+X）放紅色箭頭＝「應該是車頭的方向」
        x = -0.64 + (i % 5) * 0.32; y = -0.35 - (i // 5) * 0.3
        v = vehicle(kind); v.location = (x, y, GZ + 0.03)
        E.box((x + 0.13, y, GZ + 0.03), (0.05, 0.012, 0.004), E.mat("arrow", (0.9, 0.1, 0.1), 0.5), "arrowX")
        E.cone((x + 0.165, y, GZ + 0.03), 0.018, 0.0, 0.02, E.mat("arrow", (0.9, 0.1, 0.1), 0.5)).rotation_euler = (0, math.radians(90), 0)
    c, aim, foc = E.camera("cam", 30, 8)
    c.location = (0, -1.1, 1.5); aim.location = (0, -0.5, 0.02); foc.location = (0, -0.5, 0.03)
else:
    order = [k for k, _ in KIDS]
    cur = SID if SID in order else None
    idx = order.index(cur) if cur else (len(order) if SID == "END" else -1)
    objs = {}
    for j, (name, kind) in enumerate(KIDS):
        objs[name] = place_kid(name, kind, at_school=(j < idx))
    c, aim, foc = E.camera("cam", 40, 8)
    if cur:   # 鏡頭在 +p 那一側：藏起那一側的房子和樹，還有隔壁那位（還沒出發的）朋友
        ci = order.index(cur)
        for o in DECOR[ci]: o.hide_render = True
        a0 = ANG[cur]   # 鏡頭那一側（a0 ~ a0+55 度）裡其他朋友的立牌和交通工具都藏起來（不管出發了沒）
        for nm, (kk_, vv_) in objs.items():
            if nm == cur: continue
            for o in [x for x in (kk_, vv_) if x]:
                ang = (math.atan2(o.location.y, o.location.x) - a0) % (2 * math.pi)
                if ang < math.radians(55):
                    for q in [o] + list(o.children_recursive): q.hide_render = True
        T = TM[cur]; kind = dict(KIDS)[cur]; k, v = objs[cur]; u, p = path_of(cur)
        tb = T["teacher"][0] - 0.25                       # 上車
        t_go, t_arr = tb + 0.35, T["turn"][0] + 1.0         # 出發、到學校
        face = math.atan2(p.y, p.x) + math.pi / 2
        heading = math.atan2(-u.y, -u.x)

        def vpos(t):
            s = ease((t - t_go) / (t_arr - t_go)); r = lerp(R0, R1, s); q = u * r
            z = GZ + (0.0015 if kind == "boat" else 0)
            if kind == "plane": z += 0.16 * math.sin(math.pi * s) ** 1.2
            if kind == "boat": z += 0.002 * math.sin(t * 6)
            return Vector((q.x, q.y, z))
        start_k = Vector(k.location)
        ride_off = {"bike": Vector((0, 0, 0.025)), "scooter": Vector((0, 0, 0.03)), "boat": Vector((0, 0, 0.035))}
        for fr in E.frames():
            t = fr / E.FPS
            wig = math.radians(7) * math.sin(t * 2 * math.pi * 2.2) if (T["friend"][0] <= t <= T["friend"][1] or t > t_arr + 0.3) else 0.0
            if v: key(v, t, loc=vpos(t), rot_z=heading)
            if kind == "foot":
                s = ease((t - t_go) / (t_arr - t_go)); r = lerp(R0, R1, s); q = u * r
                hop = 0.008 * abs(math.sin(t * math.pi * 3.2)) if t_go < t < t_arr else 0.0
                key(k, t, loc=(q.x, q.y, GZ + hop), rot_z=face + wig, scale=1.0)
            elif t < tb:
                key(k, t, loc=start_k, rot_z=face + wig, scale=1.0)
            elif kind in RIDE_ON:
                vp = vpos(t); off = ride_off[kind]
                if t < t_go:
                    s = (t - tb) / (t_go - tb); q = start_k.lerp(vp + off, s); q.z += 0.03 * math.sin(math.pi * s)
                else: q = vp + off
                key(k, t, loc=q, rot_z=face, scale=1.0)
            else:   # 跳進去：縮小消失；到學校後跳出來
                vp = vpos(t)
                if t < t_go:
                    s = (t - tb) / (t_go - tb); q = start_k.lerp(vp + Vector((0, 0, 0.02)), s); q.z += 0.03 * math.sin(math.pi * s)
                    key(k, t, loc=q, rot_z=face, scale=max(0.001, 1 - s))
                elif t < t_arr + 0.2:
                    key(k, t, loc=vp, rot_z=face, scale=0.001)
                else:
                    s = min(1.0, (t - t_arr - 0.2) / 0.35); end = vpos(t_arr) + p * 0.075
                    q = (vp + Vector((0, 0, 0.02))).lerp(end, s); q.z += 0.03 * math.sin(math.pi * s); q.z = max(q.z, GZ)
                    key(k, t, loc=q, rot_z=face + (wig if s >= 1 else 0), scale=max(0.001, s))
        for o in (k,) + ((v,) if v else ()): E.constant(o)

        def cam_path(t):
            vp = vpos(t) if v else Vector(k.location)
            if kind == "foot":
                s = ease((t - t_go) / (t_arr - t_go)); q = u * lerp(R0, R1, s); vp = Vector((q.x, q.y, GZ))
            near = 1 - ease((t - tb) / 1.2)                  # 開頭（朋友說話）比較近
            side = 0.30 + 0.10 * (1 - near)
            cl = vp + p * side + u * (0.16 + 0.05 * near) + Vector((0, 0, 0.12 + 0.05 * (1 - near) + (0.08 if kind == "plane" else 0)))
            al = vp - u * (0.03 + 0.06 * (1 - near)) + Vector((0, 0, 0.035))
            return cl, al, vp + Vector((0, 0, 0.035))
        E.key_cam(c, aim, foc, cam_path)
    else:   # OPEN：慢慢繞小鎮一圈＋太陽變亮；END：學校前全員到齊
        def cam_path(t):
            if SID == "OPEN":
                a = math.radians(-90) + math.radians(40) * ease(t / dur) - math.radians(20)
                r = 1.25 - 0.25 * ease(t / dur)
                return (math.cos(a) * r, math.sin(a) * r, 0.62 - 0.15 * ease(t / dur)), (0, 0.05, 0.05), (0, -0.3, 0.05)
            a = math.radians(-72 + 6 * ease(t / dur)); return (math.cos(a) * 1.05, math.sin(a) * 1.05, 0.62), (0, 0, 0.05), (0, 0, 0.05)
        E.key_cam(c, aim, foc, cam_path)
        if SID == "OPEN":
            for fr in E.frames():
                SUN.data.energy = 3.2 * (0.35 + 0.65 * ease(fr / E.FPS / 4.0)); SUN.data.keyframe_insert("energy", frame=fr)

E.run(A[3:])
