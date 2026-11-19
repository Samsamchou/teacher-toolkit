# 影片 9 情境動畫（畫風 H 桌上微縮）：微縮二水小鎮，Ken 從中間廣場走到 8 個地點（建築沿用二水小行星的模型）。
# blender -b --factory-startup --python scenes9.py -- <props> <fonts> <SID> <mode> ...
#   SID：LINEUP（檢查建築正門方向）、OPEN、POST…STATION、END；mode 同 engine.run（sheet／range／check／save）
# 每段：Ken 在廣場說情境句、想做的事 → Nova 問 → 猜 3 秒（鏡頭只拍 Ken，看不到要去的地方）
#       → 走過去（鏡頭拉遠、看到建築）→ 到達、招牌跳出來 → 答句 → Your turn。
# 規則（影片 8 學到的）：立牌貼地不懸空、走路小跳步、不穿過建築；DAY／WEATHER 字卡和字幕在合成時疊（不在 3D 裡）。
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
from mathutils import Vector
import engine as E
from engine import f, ease, lerp

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SID = A[0], A[1], A[2]
TM = json.load(open(os.path.join(HERE, "timing.json"), encoding="utf-8"))
# (SID, 模型, 招牌字)；順序＝影片順序＝繞圈順序（第一個 POST 在正前方 -Y）
PLACES = [("POST", "bld_post", "post office"), ("SUPER", "bld_pxmart", "supermarket"), ("LIB", "bld_library", "library"),
          ("HOSP", "bld_health", "hospital"), ("PARK", "bld_waterpark_clean", "park"), ("BOOK", "bld_bookstore", "bookstore"),
          ("MUSEUM", "bld_museum", "museum"), ("STATION", "bld_station", "train station")]
ORDER = [p[0] for p in PLACES]
ANG = {sid: math.radians(-90 + 45 * i) for i, sid in enumerate(ORDER)}
YAW = json.load(open(os.path.join(HERE, "yaw9.json"))) if os.path.exists(os.path.join(HERE, "yaw9.json")) else {}
BLD_SIZE = {"bld_station": 0.26, "bld_pxmart": 0.24, "bld_waterpark": 0.24, "bld_waterpark_clean": 0.24}   # 其他 0.21（最長邊，公尺）
R_BLD, R_SIGN, R_ARR, R_START = 0.60, 0.43, 0.38, 0.07
KID_H = 0.075; GZ = 0.012
WX = {"sunny": (1.0, (0.55, 0.72, 0.95)), "cloudy": (0.55, (0.62, 0.66, 0.72)), "rainy": (0.4, (0.45, 0.5, 0.6)),
      "cold": (0.65, (0.7, 0.78, 0.9)), "hot": (1.15, (0.6, 0.75, 0.95)), "windy": (0.85, (0.6, 0.72, 0.9))}

dur = TM[SID]["dur"] if SID in TM else 6.0
E.init(PROPS, FONTS, dur)
sc = E.sc
weather = TM.get(SID, {}).get("weather", ["sunny"])[0]
sun_k, sky = WX.get(weather, WX["sunny"])
w = sc.world.node_tree.nodes["Background"]; w.inputs[0].default_value = (*sky, 1); w.inputs[1].default_value = 0.35


def day_lights(k=1.0, cold=False):
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 2)); S = bpy.context.object; S.name = "sun"
    S.data.energy = 3.2 * k; S.data.color = (0.85, 0.92, 1.0) if cold else (1, 0.9, 0.75); S.data.angle = math.radians(6 if k > 0.8 else 25)
    S.rotation_euler = (math.radians(50), 0, math.radians(-35))
    bpy.ops.object.light_add(type="AREA", location=(-0.9, -1.0, 0.9)); F = bpy.context.object; F.name = "fill"
    F.data.energy = 60 * (0.8 + 0.4 * (1 - min(k, 1))); F.data.color = (0.8, 0.9, 1); F.data.size = 1.2
    F.rotation_euler = (math.radians(55), 0, math.radians(-40))
    return S


MOUTHS = ["closed", "small", "open", "round"]   # 2026-11-18 老師：Ken 說話要對嘴（Codex 張嘴版只貼回嘴巴，mouth9.py）
MOUTH_TRACK = json.load(open(os.path.join(HERE, "mouth9.json"))) if os.path.exists(os.path.join(HERE, "mouth9.json")) else {}


def standee(name, img_name, h=KID_H):
    """紙片立牌：去背全身圖（正面，4 種嘴形各一片，同一時間只顯示一片）＋白色卡紙（背面略大＝白邊）＋木頭底座。
    root 在腳底，正面朝 -Y。回傳 (root, {嘴形: 正面那片})。"""
    root = E.empty("kid_" + name); fronts = {}
    for nm in MOUTHS + ["back"]:
        img = bpy.data.images.load(f"{PROPS}/{img_name}-{'closed' if nm == 'back' else nm}.png"); asp = img.size[0] / img.size[1]
        back = nm == "back"
        bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = f"{root.name}_{nm}"
        o.rotation_euler = (math.radians(90), 0, 0); s = 1.05 if back else 1.0
        o.scale = (h * asp * s, h * s, 1); o.location = (0, 0.0012 if back else 0, h / 2 + 0.004)
        m = bpy.data.materials.new(o.name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
        if back:
            b.inputs["Base Color"].default_value = (0.95, 0.93, 0.88, 1); b.inputs["Roughness"].default_value = 0.9
        else:
            nt.links.new(t.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.55; fronts[nm] = o
        nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
        o.data.materials.append(m); o.parent = root
        if not back and nm != "closed": o.scale = (h * asp * 0.001, h * 0.001, 1)
    bs = E.box((0, 0.0006, 0.002), (0.022, 0.012, 0.004), E.wood(), root.name + "_base", bevel=0.001); bs.parent = root
    return root, fronts


def key_mouth(fronts, track):
    """每 2 格換一次嘴形：要顯示的那片 scale 1，其他縮到看不見。"""
    full = {k: tuple(o.scale) if k == "closed" else (o.scale[0] * 1000, o.scale[1] * 1000, 1) for k, o in fronts.items()}
    for i, st in enumerate(track):
        fr = i * 2
        for k, o in fronts.items():
            on = MOUTHS[st] == k
            o.scale = full[k] if on else (full[k][0] * 0.001, full[k][1] * 0.001, 1); o.keyframe_insert("scale", frame=fr)
    for o in fronts.values(): E.constant(o)


def building(sid, model):
    root = E.place(f"{PROPS}/{model}.glb", BLD_SIZE.get(model, 0.21), (0, 0, 0), 0.0, axis="long")
    hold = E.empty("hold_" + sid); root.parent = hold
    root.rotation_euler = (0, 0, math.radians(YAW.get(model, 0)))   # 修正後：正門朝 -Y
    if model == "bld_waterpark_clean":   # 2026-11-19：拿掉戰鬥機、火車頭後，原位置的白色空地和碎石軌道台蓋上綠色毛氈草地（模型座標）
        for (x, y, w_, h_, rot) in ((-0.30, -0.043, 0.33, 0.70, -5.7), (0.064, -0.157, 0.20, 0.38, -9.5), (0.127, 0.298, 0.27, 0.16, -34.0)):
            g = E.box((x, y, 0.058), (w_, h_, 0.036), E.felt("parklawn", (0.36, 0.66, 0.32)), "parklawn", bevel=0.004, rot=(0, 0, math.radians(rot)))
            g.parent = root; g.matrix_parent_inverse.identity()
            for k in range(3):   # 草地上幾叢圓圓的毛氈樹叢
                b = E.ball((x + (k - 1) * w_ * 0.28, y + (k - 1) * h_ * 0.25, 0.09), 0.035, E.felt("leaf", (0.2, 0.5, 0.25)), "bush"); b.parent = root; b.matrix_parent_inverse.identity()
    return hold


def sign(sid, word, a):
    """招牌：兩根木棍＋白色卡紙＋Comic Relief 字，立在建築前、面向廣場。"""
    u = Vector((math.cos(a), math.sin(a), 0)); pp = Vector((-u.y, u.x, 0)); c = u * (R_SIGN - 0.01) + pp * 0.075   # 人行道右邊，不擋正門
    root = E.empty("sign_" + sid, (c.x, c.y, GZ))
    width = 0.016 * len(word) * 0.62 + 0.03
    for sx in (-1, 1):
        E.cyl((sx * (width / 2 - 0.004), 0, 0.022), 0.0015, 0.044, E.wood()).parent = root
    card = E.box((0, 0, 0.05), (width, 0.002, 0.026), E.mat("signcard", (0.98, 0.96, 0.9), 0.6), "signcard_" + sid, bevel=0.0008); card.parent = root
    t = E.text_obj(word, 0.016, E.mat("signink", (0.02, 0.05, 0.18), 0.5)); t.parent = root
    t.location = (0, -0.0015, 0.05); t.rotation_euler = (math.radians(90), 0, 0)
    root.rotation_euler = (0, 0, a - math.pi / 2 + math.radians(25))   # 卡片正面朝廣場、稍微轉向鏡頭
    return root


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
SUN = day_lights(sun_k, cold=(weather == "cold"))

if SID == "LINEUP":   # 兩排；每棟前面（-Y）放紅色箭頭＝「正門應該朝這裡」
    E.sc.frame_end = 0
    for i, (sid, model, word) in enumerate(PLACES):
        x = -0.75 + (i % 4) * 0.5; y = 0.05 - (i // 4) * 0.5
        h = building(sid, model); h.location = (x, y, GZ)
        E.box((x, y - 0.17, GZ + 0.003), (0.012, 0.06, 0.004), E.mat("arrow", (0.9, 0.1, 0.1), 0.5), "arrow")
        E.cone((x, y - 0.205, GZ + 0.003), 0.018, 0.0, 0.02, E.mat("arrow", (0.9, 0.1, 0.1), 0.5)).rotation_euler = (math.radians(90), 0, 0)
        t = E.text_obj(model, 0.03, E.mat("lbl", (0.05, 0.05, 0.05), 0.5)); t.location = (x, y - 0.27, GZ + 0.002)
    c, aim, foc = E.camera("cam", 28, 16)
    c.location = (0, -1.9, 1.7); aim.location = (0, -0.25, 0.02); foc.location = (0, -0.25, 0.03)
    E.sc.frame_end = 8   # 第 1–8 格：每棟從正前方（-Y、紅色箭頭那一側）拍近景，檢查正門
    for o in (c, aim, foc): o.keyframe_insert("location", frame=0)
    for i, (sid, model, word) in enumerate(PLACES):
        x = -0.75 + (i % 4) * 0.5; y = 0.05 - (i // 4) * 0.5
        c.location = (x, y - 0.55, 0.22); aim.location = (x, y, 0.06); foc.location = (x, y - 0.1, 0.06)
        for o in (c, aim, foc): o.keyframe_insert("location", frame=i + 1)
    for o in (c, aim, foc): E.constant(o)
    E.run(A[3:]); raise SystemExit

# 中間廣場（淺色毛氈）＋小噴水池
bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.0015, location=(0, 0, GZ + 0.00075), vertices=64)
bpy.context.object.data.materials.append(E.felt("plaza", (0.88, 0.82, 0.68)))
E.cyl((0, 0, GZ + 0.006), 0.035, 0.01, E.felt("pool", (0.75, 0.72, 0.68)))
E.cyl((0, 0, GZ + 0.0115), 0.028, 0.002, E.mat("water", (0.2, 0.5, 0.85), 0.1))
bld, signs, decor = {}, {}, {i: [] for i in range(8)}
for i, (sid, model, word) in enumerate(PLACES):
    a = ANG[sid]; u = Vector((math.cos(a), math.sin(a), 0))
    mid = u * ((R_START + 0.06 + R_SIGN) / 2)   # 人行道：廣場 → 招牌
    E.box((mid.x, mid.y, GZ + 0.0008), (R_SIGN - R_START - 0.06, 0.06, 0.0016), E.felt("walk", (0.85, 0.78, 0.62)), "walk", bevel=0.0005, rot=(0, 0, a))
    h = building(sid, model); q = u * R_BLD; h.location = (q.x, q.y, GZ); h.rotation_euler = (0, 0, a - math.pi / 2)   # 正門（-Y）朝廣場
    bld[sid] = h; signs[sid] = sign(sid, word, a)
    b = math.radians(-90 + 45 * i + 22.5); v = Vector((math.cos(b), math.sin(b), 0))
    n0 = set(bpy.data.objects.keys())
    for r, s in ((0.30, 1.0), (0.74, 1.3)):
        cc = v * r
        E.cyl((cc.x, cc.y, GZ + 0.02 * s), 0.004, 0.04 * s, E.wood())
        E.ball((cc.x, cc.y, GZ + 0.055 * s), 0.025 * s, E.felt("leaf", (0.2, 0.5, 0.25)))
    decor[i] = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - n0]

ken, ken_fronts = standee("Ken", "stand-ken")
c, aim, foc = E.camera("cam", 40, 16)

if SID in ORDER:
    T = TM[SID]; a = ANG[SID]; i0 = ORDER.index(SID)
    u = Vector((math.cos(a), math.sin(a), 0)); p = Vector((-u.y, u.x, 0))
    face = math.atan2(p.y, p.x) + math.pi / 2          # 立牌正面朝 p（鏡頭在 +p 那一側）
    start = u * R_START; end = u * R_ARR - p * 0.02     # 停在招牌旁邊（不擋招牌）
    t_go, t_arr = T["walk"][0], T["walk"][1]
    # 鏡頭那一側（+p，約 a～a+70 度）的樹和隔壁建築藏起來，免得擋住
    for o in decor[i0]: o.hide_render = True
    nb = ORDER[(i0 + 1) % 8]
    for o in [bld[nb], signs[nb]] + list(bld[nb].children_recursive) + list(signs[nb].children_recursive): o.hide_render = True
    # 這一段的招牌：到達時才跳出來（「亮起」）；別的地點的招牌這一段都不出現（v1 試片：背景看到 museum、train station 招牌會混淆）
    for o in ORDER:
        if o != SID:
            for q in [signs[o]] + list(signs[o].children_recursive): q.hide_render = True
    E.pop_in(signs[SID], t_arr - 0.1)
    if weather == "rainy":
        E.falling(160, (-0.3 + start.x, -0.3 + start.y, GZ), (0.3 + start.x, 0.3 + start.y, 0.35), 0.9, E.mat("drop", (0.6, 0.75, 0.95), 0.1), r=0.0012)
    CAM_W = u * 0.10 + p * 0.10 + Vector((0, 0, 0.16))          # 到達後的鏡頭：在廣場這邊、看向正門（Ken、招牌、建築都在畫面裡）
    AIM_W = u * (R_SIGN + 0.05) + Vector((0, 0, 0.05))

    def wide_of(t): return ease((t - t_go + 0.3) / (t_arr - t_go + 0.6))   # 0＝只拍 Ken；1＝Ken＋招牌＋建築

    def ken_face(t):   # 一開始正面朝 +p（側邊鏡頭）；拉遠時慢慢轉向鏡頭
        wd = wide_of(t); s_ = ease((t - t_go) / (t_arr - t_go)); kq = start.lerp(end, s_)
        dv = (CAM_W - Vector((kq.x, kq.y, 0))); dv.z = 0; dv.normalize()
        tgt = math.atan2(dv.x, -dv.y)
        d = (tgt - face + math.pi) % (2 * math.pi) - math.pi
        return face + d * wd
    for fr in E.frames():
        t = fr / E.FPS
        s_ = ease((t - t_go) / (t_arr - t_go)); q = start.lerp(end, s_)
        hop = 0.006 * abs(math.sin(t * math.pi * 3.2)) if t_go < t < t_arr else 0.0
        talk = (T["scene"][0] <= t <= T["reason"][1]) or (T["answer"][0] <= t <= T["answer"][1])
        wig = math.radians(5) * math.sin(t * 2 * math.pi * 2.0) if talk else 0.0
        key(ken, t, loc=(q.x, q.y, GZ + hop), rot_z=ken_face(t) + wig)
    E.constant(ken)
    if SID in MOUTH_TRACK: key_mouth(ken_fronts, MOUTH_TRACK[SID])

    def cam_path(t):
        s_ = ease((t - t_go) / (t_arr - t_go)); kq = start.lerp(end, s_); kq = Vector((kq.x, kq.y, GZ))
        wd = wide_of(t)
        t0 = kq + Vector((0, 0, 0.04)); c0 = t0 + p * 0.24 - u * 0.05 + Vector((0, 0, 0.03))   # 近景：側面平拍 Ken，背景是天空和牆
        # 2026-11-19 試片 B：鏡頭轉太快，Ken 走路時被切到畫面右邊 → 瞄準點先慢慢移（中途偏向 Ken），到達時才對準招牌（Ken 最多偏 16 度，畫面邊緣 24 度）
        wa = wd * (0.55 + 0.45 * wd ** 3)
        return c0.lerp(CAM_W, wd), t0.lerp(AIM_W, wa), kq.lerp(end + Vector((0, 0, GZ)), wd) + Vector((0, 0, 0.04))
    E.key_cam(c, aim, foc, cam_path)
    for fr in E.frames():
        c.data.dof.aperture_fstop = lerp(2.8, 16, wide_of(fr / E.FPS)); c.data.dof.keyframe_insert("aperture_fstop", frame=fr)
    E.constant(c.data)
else:   # OPEN：繞小鎮半圈、慢慢降低；END：Ken 回到廣場，高處俯瞰
    ken.location = (0, -0.03, GZ); ken.rotation_euler = (0, 0, 0)

    def cam_path(t):
        if SID == "OPEN":
            a = math.radians(-150) + math.radians(70) * ease(t / dur); r = 1.35 - 0.3 * ease(t / dur)
            return (math.cos(a) * r, math.sin(a) * r, 0.85 - 0.25 * ease(t / dur)), (0, 0, 0.04), (0, 0, 0.05)
        a = math.radians(-90 + 8 * ease(t / dur)); return (math.cos(a) * 1.1, math.sin(a) * 1.1, 0.75), (0, 0.02, 0.03), (0, 0, 0.05)
    E.key_cam(c, aim, foc, cam_path)

E.run(A[3:])
