# 畫風 H 桌上微縮共用引擎（感恩節課堂版）
# 世界：夜晚書桌。中間是大西洋舊地圖（右 England、左 America）；右邊英國港口台、左邊新英格蘭台；牆上軟木板海報。
# 所有動作每 2 格才變一次（定格感），關鍵影格一律 CONSTANT。
import bpy, bmesh, math, mathutils, os, random, time
from mathutils import Vector, Matrix, Quaternion

FPS = 24
sc = None
D = FONTS = None


def f(t): return round(t * FPS)


def init(props_dir, fonts_dir, dur):
    global sc, D, FONTS
    D, FONTS = props_dir, fonts_dir
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS; sc.frame_start, sc.frame_end = 0, f(dur)
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.view_settings.view_transform = "AgX"
    try: sc.view_settings.look = "AgX - Medium High Contrast"
    except Exception: pass
    w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.008, 0.01, 0.028, 1)
    return sc


def frames(step=2):
    return range(0, sc.frame_end + step, step)


# ---------- 材質 ----------
_M = {}
def mat(n, c, r=0.5):
    if n in _M: return _M[n]
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r
    _M[n] = m; return m


def felt(n, c):
    """毛氈：顏色＋細噪點凹凸。"""
    if n in _M: return _M[n]
    m = mat(n, c, 0.95); nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 400; nz.inputs["Detail"].default_value = 8
    bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = 0.25
    nt.links.new(nz.outputs["Fac"], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], b.inputs["Normal"])
    return m


def wood():
    if "wood" in _M: return _M["wood"]
    m = bpy.data.materials.new("wood"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.38
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (2.0, 40.0, 1.0)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 8.0
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.13, 0.05, 0.02, 1); cr.color_ramp.elements[1].color = (0.32, 0.14, 0.06, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"]); nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    _M["wood"] = m; return m


def emission(n, c, s):
    if n in _M: return _M[n]
    m = bpy.data.materials.new(n); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"]); e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = (*c, 1); e.inputs[1].default_value = s
    nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs[0]); _M[n] = m; return m


def tex_mat(n, img, rough=0.8, bump=0.12):
    m = bpy.data.materials.new(n); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = rough
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(img)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 180; nz.inputs["Detail"].default_value = 6
    bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = bump
    nt.links.new(nz.outputs["Fac"], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], b.inputs["Normal"])
    return m


def box(loc, scl, m, name="box", bevel=0.002, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = name
    o.scale = scl; o.data.materials.append(m)
    if bevel:
        bv = o.modifiers.new("bv", "BEVEL"); bv.width = bevel; bv.segments = 2
    return o


def cyl(loc, r, h, m, rot=(0, 0, 0), verts=24, name="cyl"):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o


def cone(loc, r1, r2, h, m, verts=16, name="cone"):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=loc, vertices=verts)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o


def ball(loc, r, m, name="ball"):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=20, ring_count=12)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def empty(n, loc=(0, 0, 0)):
    e = bpy.data.objects.new(n, None); sc.collection.objects.link(e); e.location = loc; return e


def parent_all(objs, root):
    for o in objs:
        if o.parent is None: o.parent = root


# ---------- 關鍵影格工具 ----------
def constant(o):
    ad = o.animation_data
    if not ad or not ad.action: return
    act = ad.action
    curves = list(act.fcurves) if hasattr(act, "fcurves") and len(act.fcurves) else \
        [fc for l in getattr(act, "layers", []) for s in l.strips for cb in s.channelbags for fc in cb.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"


def show_between(objs, t_on=None, t_off=None):
    """整格切換顯示：t_on 之前、t_off 之後隱藏。"""
    for o in objs:
        o.hide_render = t_on is not None; o.keyframe_insert("hide_render", frame=-1)
        if t_on is not None:
            o.hide_render = False; o.keyframe_insert("hide_render", frame=f(t_on))
        if t_off is not None:
            o.hide_render = True; o.keyframe_insert("hide_render", frame=f(t_off))
        for c in o.children_recursive:
            show_between([c], t_on, t_off) if c.type in ("MESH", "FONT", "CURVE") else None


def pop_in(o, t_on, s1=1.0):
    for fr, s in [(-1, 0.001), (f(t_on), 0.001), (f(t_on) + 2, 0.7 * s1), (f(t_on) + 4, 1.15 * s1), (f(t_on) + 6, s1)]:
        o.scale = (s, s, s); o.keyframe_insert("scale", frame=fr)
    constant(o)


def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


def lerp(a, b, u): return a + (b - a) * u


def vlerp(a, b, u): return Vector(a).lerp(Vector(b), u)


# ---------- 書桌世界 ----------
def desk_world(lamp_on=True):
    box((0, 0.1, -0.02), (2.6, 1.5, 0.04), wood(), "desk")
    box((0, 0.85, 0.5), (3.2, 0.02, 1.4), mat("wall", (0.03, 0.03, 0.06), 0.9), "wall")
    city = [emission("cityW", (1, 0.75, 0.4), 5), emission("cityB", (0.5, 0.75, 1), 4)]
    for i in range(30):
        x = -0.6 + (i * 0.37) % 1.2; z = 0.12 + ((i * 53) % 11) * 0.025
        ball((x, 0.83, z), 0.006 + (i % 3) * 0.003, city[i % 4 == 0])
    # 地圖
    MW, MH = 0.80, 0.45
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=80, y_subdivisions=46, size=1, location=(0, 0, 0.0008))
    mp = bpy.context.object; mp.name = "map"; mp.scale = (MW, MH, 1)
    for v in mp.data.vertices:
        ex = max(0, abs(v.co.x) * 2 - 0.86) / 0.14; ey = max(0, abs(v.co.y) * 2 - 0.8) / 0.2
        v.co.z = 0.012 * (ex ** 2) * (0.4 + ey) / MW
    mp.data.materials.append(tex_mat("map", f"{D}/atlantic_map.png")); bpy.ops.object.shade_smooth()
    return mp


def map_px(u, v, MW=0.80, MH=0.45):
    return Vector(((u / 1672 - 0.5) * MW, (0.5 - v / 941) * MH, 0.0015))


def lights(lamp=1.0, cold=0.0):
    """檯燈暖光（lamp 0–1 可做開燈）＋冷色補光＋背光；cold>0 時整體偏藍（冬天）。"""
    bpy.ops.object.light_add(type="SPOT", location=(-0.45, -0.35, 0.75)); L = bpy.context.object; L.name = "lamp"
    L.data.energy = 55 * lamp; L.data.color = (1, 0.7, 0.35) if not cold else (0.75, 0.82, 1)
    L.data.spot_size = math.radians(80); L.data.spot_blend = 0.6
    L.data.shadow_soft_size = 0.06; L.rotation_euler = (math.radians(30), math.radians(-28), 0)
    bpy.ops.object.light_add(type="AREA", location=(0.6, -0.45, 0.35)); F = bpy.context.object; F.name = "fill"
    F.data.energy = 9 + 10 * cold; F.data.color = (0.5, 0.8, 1); F.data.size = 0.45; F.rotation_euler = (math.radians(55), 0, math.radians(35))
    bpy.ops.object.light_add(type="AREA", location=(0.05, 0.7, 0.3)); R = bpy.context.object; R.name = "rim"
    R.data.energy = 6; R.data.color = (0.6, 0.7, 1); R.data.size = 0.7; R.rotation_euler = (math.radians(-70), 0, 0)
    return L, F, R


# ---------- 匯入 Tripo 道具 ----------
def place(path, size, loc, rot_z=0.0, axis="z"):
    bpy.ops.import_scene.gltf(filepath=path); objs = list(bpy.context.selected_objects)
    meshes = [o for o in objs if o.type == "MESH"]
    bpy.context.view_layer.update()
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for o in meshes:
        for v in o.bound_box:
            p = o.matrix_world @ Vector(v); mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    dim = mx - mn; ref = {"z": dim.z, "long": max(dim.x, dim.y), "x": dim.x}[axis]; s = size / ref
    root = empty(os.path.basename(path))
    parent_all(objs, root)
    for o in objs:
        if o.parent == root: o.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    root.scale = (s, s, s); root.location = loc; root.rotation_euler = (0, 0, rot_z)
    return root


# ---------- 有骨架的人物 ----------
CHARS = []        # 所有人物（給 check 模式算頭頂與模糊）
FSTOP = float(os.environ.get("FSTOP_MIN", "16"))   # v2：光圈至少 f/16（公仔只有 9 公分，大光圈會糊）
HEIGHT = {"man": 0.09, "woman": 0.085, "child": 0.066, "tisquantum": 0.094, "massasoit": 0.092}


class Char:
    """Tripo＋Mixamo 骨架人物。用『骨頭指向某方向』擺姿勢（人物自己的座標：-Y 前、+Z 上、-X 是他的右邊）。"""

    def __init__(self, name, loc, face_deg=0.0, height=None):
        bpy.ops.import_scene.gltf(filepath=f"{D}/{name}.glb"); objs = list(bpy.context.selected_objects)
        self.arm = next(o for o in objs if o.type == "ARMATURE")
        meshes = [o for o in objs if o.type == "MESH"]
        bpy.context.view_layer.update()
        zs = [(o.matrix_world @ Vector(v)).z for o in meshes for v in o.bound_box]
        h = max(zs) - min(zs); s = (height or HEIGHT.get(name.split("_")[-1], 0.09)) / h
        self.root = empty("char_" + name)
        parent_all(objs, self.root)
        self.root.scale = (s, s, s); self.base_z = -min(zs) * s
        self.root.location = (loc[0], loc[1], self.base_z + (loc[2] if len(loc) > 2 else ground_z(loc[0], loc[1])))
        self.root.rotation_euler = (0, 0, math.radians(face_deg))
        self.pb = {b.name.split(":")[-1]: b for b in self.arm.pose.bones}
        for b in self.pb.values(): b.rotation_mode = "QUATERNION"
        self.name = name; self.meshes = meshes; self.h = h * s
        CHARS.append(self)

    def at(self, t, loc=None, face_deg=None, hop=0.0):
        fr = f(t)
        if loc is not None:
            self.root.location = (loc[0], loc[1], self.base_z + hop + (loc[2] if len(loc) > 2 else ground_z(loc[0], loc[1])))
            self.root.keyframe_insert("location", frame=fr)
        if face_deg is not None:
            self.root.rotation_euler = (0, 0, math.radians(face_deg)); self.root.keyframe_insert("rotation_euler", frame=fr)

    def _aim(self, bone, d_local):
        pb = self.pb[bone]
        bpy.context.view_layer.update()
        M = pb.matrix.copy()
        y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
        w = self.root.matrix_world.to_3x3().normalized() @ Vector(d_local).normalized()
        d = (self.arm.matrix_world.to_3x3().inverted() @ w).normalized()
        R = y.rotation_difference(d).to_matrix() @ M.to_3x3()
        N = R.to_4x4(); N.translation = M.translation
        pb.matrix = N

    def pose(self, t, aims=None, twist=None):
        """aims: {骨頭: 方向(人物座標)}，依序擺（先上臂再前臂）；twist: {骨頭: (x,y,z) 度} 直接加在 Euler（頭轉向用）。"""
        for b in self.pb.values(): b.rotation_quaternion = (1, 0, 0, 0)
        for bone, d in (aims or {}).items(): self._aim(bone, d)
        for bone, (x, y, z) in (twist or {}).items():
            q = mathutils.Euler((math.radians(x), math.radians(y), math.radians(z))).to_quaternion()
            self.pb[bone].rotation_quaternion = self.pb[bone].rotation_quaternion @ q
        fr = f(t)
        for b in self.pb.values(): b.keyframe_insert("rotation_quaternion", frame=fr)

    def finish(self):
        constant(self.arm); constant(self.root)


# 常用姿勢（人物座標：-X＝他的右邊、-Y＝前）
def P_stand():
    return {"RightArm": (-0.3, 0.05, -1), "RightForeArm": (-0.2, -0.1, -1), "LeftArm": (0.3, 0.05, -1), "LeftForeArm": (0.2, -0.1, -1)}


def P_wave(k, right=True):
    s = -1 if right else 1; side = "Right" if right else "Left"; other = "Left" if right else "Right"
    a = {f"{side}Arm": (s * 0.75, -0.15, 0.55), f"{side}ForeArm": (s * (0.15 if k % 2 else 0.55), -0.15, 1),
         f"{other}Arm": (-s * 0.3, 0.05, -1), f"{other}ForeArm": (-s * 0.2, -0.1, -1)}
    return a


def P_walk(k):
    """k 為步伐相位 0–3。"""
    sw = [0.35, 0.0, -0.35, 0.0][k % 4]
    return {"RightUpLeg": (0, -sw, -1), "LeftUpLeg": (0, sw, -1), "RightLeg": (0, -sw * 0.3, -1), "LeftLeg": (0, sw * 0.3, -1),
            "RightArm": (-0.3, sw * 0.8, -1), "LeftArm": (0.3, -sw * 0.8, -1),
            "RightForeArm": (-0.2, sw * 0.8 - 0.2, -1), "LeftForeArm": (0.2, -sw * 0.8 - 0.2, -1)}


def P_greet():
    """右手舉起手掌向前（打招呼），左手自然垂下。"""
    return {"RightArm": (-0.6, -0.3, 0.1), "RightForeArm": (-0.15, -0.25, 1), "LeftArm": (0.3, 0.05, -1), "LeftForeArm": (0.2, -0.1, -1)}


def P_chest(right=True):
    """手放胸口（不擋臉）。"""
    s = -1 if right else 1; side = "Right" if right else "Left"; other = "Left" if right else "Right"
    return {f"{side}Arm": (s * 0.35, -0.45, -0.8), f"{side}ForeArm": (-s * 0.9, -0.35, 0.35),
            f"{other}Arm": (-s * 0.3, 0.05, -1), f"{other}ForeArm": (-s * 0.2, -0.1, -1)}


def P_open():
    """雙手微張（歡迎）。"""
    return {"RightArm": (-0.75, -0.25, -0.55), "RightForeArm": (-0.6, -0.5, -0.4), "LeftArm": (0.75, -0.25, -0.55), "LeftForeArm": (0.6, -0.5, -0.4)}


def P_point(d, right=True):
    side = "Right" if right else "Left"; other = "Left" if right else "Right"; s = 1 if right else -1
    return {f"{side}Arm": d, f"{side}ForeArm": d, f"{other}Arm": (s * 0.3, 0.05, -1), f"{other}ForeArm": (s * 0.2, -0.1, -1)}


# ---------- 文字、牙籤旗 ----------
_font = None
def font():
    global _font
    if _font is None: _font = bpy.data.fonts.load(f"{FONTS}/ComicRelief-Regular.ttf")
    return _font


def text_obj(s, size, m, extrude=0.0004):
    cu = bpy.data.curves.new(s, "FONT"); cu.body = s; cu.font = font(); cu.size = size; cu.extrude = extrude
    cu.align_x = "CENTER"; cu.align_y = "CENTER"
    o = bpy.data.objects.new("txt_" + s, cu); sc.collection.objects.link(o); o.data.materials.append(m); return o


def flag(label, loc, t_on, lean=8, face_deg=0, size=0.027):
    card_m = mat("card", (0.95, 0.9, 0.78), 0.7); txt_m = mat("txtInk", (0.2, 0.09, 0.04), 0.5); pick_m = mat("pick", (0.85, 0.7, 0.45), 0.6)
    root = empty("flag_" + label, loc)
    pk = cyl((0, 0, 0.045), 0.0012, 0.09, pick_m); pk.parent = root
    tw = 0.7 * size * len(label) + 0.02
    card = box((tw / 2 + 0.001, 0, 0.07), (tw, 0.0008, size * 1.33), card_m, "card_" + label, bevel=0.0004); card.parent = root
    t = text_obj(label, size, txt_m); t.parent = root; t.location = (tw / 2 + 0.001, -0.0009, 0.07); t.rotation_euler = (math.radians(90), 0, 0)
    root.rotation_euler = (0, math.radians(lean), math.radians(face_deg))
    pop_in(root, t_on); FLAGS.append((label, root, card, t_on)); return root


FLAGS = []      # v3：(字, 立牌 root, 卡片, 出現秒數)
OBSTACLES = []  # v3：桌子等人物不能穿過的東西（root）


def obstacle(root):
    OBSTACLES.append(root); return root


# ---------- 小木偶（數量說故事） ----------
def peg_doll_proto(style="pilgrim"):
    """style：pilgrim（帽子／頭巾）或 native（鹿皮色身體＋黑髮，不戴羽毛）。"""
    wd = mat("pegWood", (0.75, 0.55, 0.32), 0.45)
    if style == "native":
        return peg_native_proto(wd)
    cols = [felt("pegA", (0.25, 0.18, 0.12)), felt("pegB", (0.45, 0.12, 0.1)), felt("pegC", (0.18, 0.25, 0.15)), felt("pegD", (0.55, 0.45, 0.2))]
    protos = []
    for i, c in enumerate(cols):
        body = cone((0, 0, 0.011), 0.0075, 0.005, 0.022, c, name=f"pegBody{i}")
        head = ball((0, 0, 0.026), 0.0058, wd, name=f"pegHead{i}")
        parts = [body, head]
        if i % 2 == 0:
            parts.append(cyl((0, 0, 0.0315), 0.0068, 0.0012, mat("hatBlk", (0.05, 0.05, 0.05), 0.7)))
            parts.append(cyl((0, 0, 0.034), 0.0042, 0.005, mat("hatBlk", (0.05, 0.05, 0.05), 0.7)))
        else:
            parts.append(ball((0, 0.0005, 0.0285), 0.0052, felt("coif", (0.9, 0.88, 0.82))))
        for p in parts: p.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.select_all(action="DESELECT")
        for p in parts: p.select_set(True)
        bpy.ops.object.join(); o = bpy.context.object; o.name = f"peg{i}"; o.location = (0, 0, -5)
        protos.append(o)
    return protos


def peg_grid(protos, origin, cols, rows, dx, dy, t_rows, face_deg=0):
    """一排一排出現：t_rows[r] 是第 r 排出現的時間。回傳所有小人偶。"""
    out = []
    for r in range(rows):
        for c in range(cols):
            p = protos[(r * cols + c) % len(protos)]
            o = p.copy(); sc.collection.objects.link(o)
            o.location = (origin[0] + c * dx, origin[1] + r * dy, origin[2])
            o.rotation_euler.z = math.radians(face_deg + ((r * 7 + c * 13) % 9 - 4) * 3)
            o.hide_render = True; o.keyframe_insert("hide_render", frame=-1)
            o.hide_render = False; o.keyframe_insert("hide_render", frame=f(t_rows[r]))
            # 出現時往上彈一下
            for fr, z in ((f(t_rows[r]), 0.006), (f(t_rows[r]) + 2, 0.0), ):
                o.location.z = origin[2] + z; o.keyframe_insert("location", index=2, frame=fr)
            constant(o); out.append(o)
    return out


# ---------- 自然小道具（紙樹、石頭、紙浪） ----------
def paper_tree(loc, h, autumn=False, snow=False, seed=0):
    rnd = random.Random(seed)
    trunk = cyl((loc[0], loc[1], h * 0.18), h * 0.05, h * 0.36, mat("trunk", (0.25, 0.14, 0.07), 0.8))
    if autumn: leaf = felt(f"leafA{seed % 3}", [(0.75, 0.35, 0.08), (0.8, 0.55, 0.1), (0.6, 0.18, 0.06)][seed % 3])
    else: leaf = felt(f"leafG{seed % 3}", [(0.12, 0.32, 0.12), (0.16, 0.4, 0.14), (0.1, 0.26, 0.12)][seed % 3])
    objs = [trunk]
    for k in range(3):
        objs.append(cone((loc[0], loc[1], h * (0.38 + k * 0.2)), h * (0.33 - k * 0.07), 0, h * 0.38, leaf, verts=8 + rnd.randint(0, 3)))
        if snow:
            objs.append(cone((loc[0], loc[1], h * (0.45 + k * 0.2)), h * (0.2 - k * 0.05), 0, h * 0.2, felt("snowFelt", (0.95, 0.96, 1.0)), verts=8))
    return objs


GROUNDS = []   # v3：(xmin, xmax, ymin, ymax, 表面高度)；人物站在上面（v2 以前人物站在 0，小腿陷進 1.2 公分的底板）


def ground_z(x, y):
    zs = [z for (x0, x1, y0, y1, z) in GROUNDS if x0 <= x <= x1 and y0 <= y <= y1]
    return max(zs) if zs else 0.0


def board(loc, size, m, name="board", thick=0.012):
    GROUNDS.append((loc[0] - size[0] / 2, loc[0] + size[0] / 2, loc[1] - size[1] / 2, loc[1] + size[1] / 2, thick))
    return box((loc[0], loc[1], thick / 2), (size[0], size[1], thick), m, name, bevel=0.003)


# ---------- 鏡頭 ----------
def camera(n, lens, fstop):
    aim = empty(n + "_aim"); foc = empty(n + "_focus")
    cd = bpy.data.cameras.new(n); cd.lens = lens; cd.dof.use_dof = True; cd.dof.aperture_fstop = max(fstop, FSTOP); cd.dof.focus_object = foc
    c = bpy.data.objects.new(n, cd); sc.collection.objects.link(c)
    tr = c.constraints.new("TRACK_TO"); tr.target = aim; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
    sc.camera = c
    # 跟著鏡頭的臉部補光（Stand Out Fit In 學到的：避免臉發黑）
    bpy.ops.object.light_add(type="AREA", location=(0, 0, 0)); fl = bpy.context.object; fl.name = n + "_faceFill"
    fl.data.energy = 1.6; fl.data.color = (1, 0.85, 0.7); fl.data.size = 0.25; fl.parent = c; fl.location = (0.08, 0.06, 0.0)
    return c, aim, foc


REFRAME = (0.0, 1.0)   # v2：(往上抬幾公尺, 往後拉幾倍)，由 scenes.py 依檢查數據設定，讓頭頂留 8% 以上
BLUR_PX = 2.5          # v2：人物臉的模糊直徑上限（1080p 像素）


def key_cam(c, aim, foc, path):
    """path(t) -> (cam_loc, aim_loc, focus_loc)；每 2 格一張。有人物時自動對焦＋自動光圈（所有人物都清楚）。"""
    lift, back = REFRAME
    for fr in frames():
        cl, al, fl = (Vector(v) for v in path(fr / FPS))
        al.z += lift; cl.z += lift; cl = al + (cl - al) * back
        c.location, aim.location, foc.location = cl, al, fl
        for o in (c, aim, foc): o.keyframe_insert("location", frame=fr)
    for o in (c, aim, foc): constant(o)
    if CHARS: autofocus(c, foc)


def autofocus(c, foc):
    """每一格：找畫面裡所有人物臉的遠近 → 焦點放在中間（調和平均）→ 光圈調到最近和最遠的人都 ≤ BLUR_PX。
    Blender 的光圈只管景深、不影響亮度，所以光圈數字大沒有副作用。"""
    from bpy_extras.object_utils import world_to_camera_view as w2c
    cd = c.data; px = cd.sensor_width / 1000 / sc.render.resolution_x * 1920 / 1920; fl = cd.lens / 1000
    px = cd.sensor_width / 1000 / 1920
    for fr in frames():
        sc.frame_set(fr)
        M = c.matrix_world; fwd = -(M.to_3x3() @ Vector((0, 0, 1))).normalized(); co = M.translation.copy()
        ds = []
        for ch in CHARS:
            face = ch.arm.matrix_world @ ch.pb["Head"].head; face.z += 0.006
            v = w2c(sc, c, face)
            if v.z > 0 and -0.05 < v.x < 1.05 and -0.05 < v.y < 1.05: ds.append((face - co).dot(fwd))
        N = FSTOP
        if ds:
            dn, df = min(ds), max(ds); s_ = 2 * dn * df / (dn + df)
            foc.location = co + fwd * s_; foc.keyframe_insert("location", frame=fr)
            N = max(FSTOP, fl * fl * abs(s_ - dn) / (dn * max(1e-6, s_ - fl) * BLUR_PX * px) * 1.1)
        cd.dof.aperture_fstop = N; cd.dof.keyframe_insert("aperture_fstop", frame=fr)
    constant(foc); constant(cd)


# ---------- 輸出 ----------
def setup_render(engine, samples, scale):
    sc.render.engine = engine; sc.render.resolution_percentage = int(scale)
    if engine == "CYCLES":
        sc.cycles.samples = int(samples); sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
        pr = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try: pr.compute_device_type = kind; pr.get_devices(); break
            except Exception: pass
        for d in pr.devices: d.use = d.type != "CPU"
    else:
        sc.eevee.taa_render_samples = int(samples)
    sc.render.image_settings.file_format = "PNG"


def check_frame(fr):
    """印出每個人物：頭頂 y、腳 y、臉 x/y（0 下 1 上）、臉的模糊直徑（1080p 像素）、離鏡頭距離。"""
    from bpy_extras.object_utils import world_to_camera_view as w2c
    cam = sc.camera; cd = cam.data; M = cam.matrix_world; fwd = -(M.to_3x3() @ Vector((0, 0, 1))).normalized(); co = M.translation
    s = max(1e-4, (cd.dof.focus_object.matrix_world.translation - co).dot(fwd)); fl = cd.lens / 1000; N = cd.dof.aperture_fstop
    for ch in CHARS:
        A = ch.arm.matrix_world; pb = ch.pb
        head = A @ pb["Head"].head; feet = ch.root.matrix_world.translation.copy(); feet.z -= ch.base_z
        top = feet.copy(); top.z = max(feet.z + ch.h, head.z + 0.004)
        top.x, top.y = head.x, head.y
        face = head.copy(); face.z += 0.006
        d = max(1e-4, (face - co).dot(fwd))
        coc = fl * fl * abs(d - s) / (N * d * max(1e-6, s - fl)) / (cd.sensor_width / 1000) * 1920
        t, b, c = w2c(sc, cam, top), w2c(sc, cam, feet), w2c(sc, cam, face)
        print(f"CHK {fr} {ch.name} {t.y:.3f} {b.y:.3f} {c.x:.3f} {c.y:.3f} {coc:.2f} {d:.3f} {c.z:.3f}", flush=True)
        g = (feet.z - ground_z(feet.x, feet.y)) * 1000
        hit = ""
        for ob in OBSTACLES:
            x0, x1, y0, y1, z1 = _bbox(ob)
            r = 0.007
            if x0 - r < feet.x < x1 + r and y0 - r < feet.y < y1 + r and feet.z < z1: hit = ob.name
        vis = 0 < c.x < 1 and 0 < c.y < 1 and c.z > 0
        print(f"GND {fr} {ch.name} {g:.1f} {hit or '-'} {int(vis)}", flush=True)
    dg = bpy.context.evaluated_depsgraph_get()
    for label, root, card, t_on in FLAGS:
        if fr < f(t_on) + 6 or root.hide_render: continue
        pts = [card.matrix_world @ Vector((u, 0, v)) for u in (-0.5, -0.25, 0, 0.25, 0.5) for v in (-0.4, 0, 0.4)]
        pv = [w2c(sc, cam, q) for q in pts]
        inside = sum(1 for q in pv if 0 < q.x < 1 and 0 < q.y < 1 and q.z > 0)
        occ = 0
        fam = {root.name} | {o.name for o in root.children_recursive}
        for q in pts:
            dv = q - co; L = dv.length
            ok, loc_, nrm, idx, ob, mx = sc.ray_cast(dg, co, dv.normalized(), distance=L - 0.0015)
            if ok and ob.name not in fam: occ += 1
        print(f"FLG {fr} {label} {inside} {occ} {len(pts)}", flush=True)


_BB = {}


def _bbox(root):
    if True:
        mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
        for o in [root] + list(root.children_recursive):
            if o.type != "MESH": continue
            for v in o.bound_box:
                q = o.matrix_world @ Vector(v); mn = Vector(map(min, mn, q)); mx = Vector(map(max, mx, q))
        return (mn.x, mx.x, mn.y, mx.y, mx.z)


def run(args):
    """args = [mode, out, ...]：sheet <out> <frames> <engine> <samples> <scale> ／ range <out> <s> <e> <step> <engine> <samples> <scale>"""
    mode = args[0]
    if os.environ.get("FLAG_AUTO", "1") == "1": autoplace_flags()
    if mode == "check":
        for fr in range(0, sc.frame_end + 1, int(args[2])): sc.frame_set(fr); check_frame(fr)
        return
    if mode == "save":
        bpy.ops.wm.save_as_mainfile(filepath=args[1]); return
    out = args[1]; os.makedirs(out, exist_ok=True)
    if mode == "sheet": fr_list = [int(x) for x in args[2].split(",")]; engine, samples, scale = args[3], args[4], args[5]
    else:
        e = sc.frame_end if args[3] == "end" else int(args[3])
        fr_list = list(range(int(args[2]), e + 1, int(args[4]))); engine, samples, scale = args[5], args[6], args[7]
    setup_render(engine, samples, scale)
    for fr in fr_list:
        p = os.path.join(out, f"f{fr:04d}.png")
        if mode == "range" and os.path.exists(p): continue
        sc.frame_set(fr); check_frame(fr); sc.render.filepath = p; t0 = time.time()
        bpy.ops.render.render(write_still=True); print(f"FRAME {fr} {time.time() - t0:.1f}s", flush=True)

def peg_native_proto(wd):
    cols = [felt("pegN1", (0.55, 0.4, 0.24)), felt("pegN2", (0.45, 0.3, 0.18)), felt("pegN3", (0.62, 0.48, 0.3))]
    hair = felt("pegHair", (0.05, 0.04, 0.04))
    protos = []
    for i, c in enumerate(cols):
        parts = [cone((0, 0, 0.011), 0.0075, 0.005, 0.022, c), ball((0, 0, 0.026), 0.0058, wd),
                 ball((0, 0.0012, 0.0275), 0.0056, hair), cyl((0, 0.004, 0.022), 0.0016, 0.012, hair)]
        bpy.ops.object.select_all(action="DESELECT")
        for p in parts: p.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
        o = bpy.context.object; o.name = f"pegN{i}"; o.location = (0, 0, -5); protos.append(o)
    return protos


def P_hug():
    """雙手抱胸發抖（冬天）。"""
    return {"RightArm": (-0.3, -0.5, -0.8), "RightForeArm": (0.9, -0.35, 0.25), "LeftArm": (0.3, -0.5, -0.8), "LeftForeArm": (-0.9, -0.35, 0.25)}


def P_warm():
    """雙手向前烤火。"""
    return {"RightArm": (-0.25, -0.75, -0.6), "RightForeArm": (-0.05, -1, -0.15), "LeftArm": (0.25, -0.75, -0.6), "LeftForeArm": (0.05, -1, -0.15)}


def P_point_down(right=True):
    """指著地上（教種玉米）。"""
    s = -1 if right else 1; side = "Right" if right else "Left"; other = "Left" if right else "Right"
    return {f"{side}Arm": (s * 0.2, -0.7, -0.7), f"{side}ForeArm": (s * 0.1, -0.6, -0.8),
            f"{other}Arm": (-s * 0.3, 0.05, -1), f"{other}ForeArm": (-s * 0.2, -0.1, -1)}


def P_eat(k):
    """坐在桌邊吃東西：右手在嘴前上下（不擋臉：手停在下巴下方）。"""
    up = 0.2 if k % 2 else -0.1
    return {"RightArm": (-0.25, -0.6, -0.75), "RightForeArm": (0.35, -0.75, up), "LeftArm": (0.3, -0.5, -0.8), "LeftForeArm": (-0.2, -1, -0.1)}


def falling(n, box_min, box_max, speed, m, r=0.0015, flat=False, seed=1):
    """雪花或落葉：在一個盒子裡往下掉，到底再從上面出現；每 2 格動一次。"""
    rnd = random.Random(seed); objs = []
    for i in range(n):
        o = (cyl((0, 0, 0), r * 1.6, r * 0.3, m, verts=8) if flat else ball((0, 0, 0), r, m)); objs.append(o)
        x0 = rnd.uniform(box_min[0], box_max[0]); y0 = rnd.uniform(box_min[1], box_max[1]); z0 = rnd.uniform(box_min[2], box_max[2])
        ph = rnd.uniform(0, 6.28); h = box_max[2] - box_min[2]
        for fr in frames():
            t = fr / FPS; z = box_min[2] + (z0 - box_min[2] - speed * t) % h
            o.location = (x0 + 0.004 * math.sin(t * 2 + ph), y0, z)
            if flat: o.rotation_euler = (t * 3 + ph, t * 2, 0); o.keyframe_insert("rotation_euler", frame=fr)
            o.keyframe_insert("location", frame=fr)
        constant(o)
    return objs


# ---------- v3：單字立牌自動擺位 ----------
def _big(ob):
    """小東西（雪花、落葉）不算擋住。"""
    return max(ob.dimensions) > 0.012


FLAG_MAX = 9.5
FLAG_HIDE = set()   # 一定不放的立牌（scenes.py 設定）   # 每格平均扣分超過這個就表示看不清楚 → 這一段不放立牌（scenes.py 依鏡頭設定）


def autoplace_flags(step=0.015, rng=4, every=6):
    """每塊立牌：試放在 (1) 原位置附近、(2) 鏡頭看得到的地面上（人物前面、旁邊），而且轉向鏡頭；
    挑『完整在畫面內、不被擋、不擋臉和身體、底下是空地』的位置。r1、r2 分開算。"""
    from bpy_extras.object_utils import world_to_camera_view as w2c
    if not FLAGS: return
    cam = sc.camera
    allfl = [o for _, r, _, _ in FLAGS for o in [r] + list(r.children_recursive)]
    placed = []
    for label, root, card, t_on in FLAGS:
        frs = list(range(f(t_on) + 6, sc.frame_end + 1, every)) or [sc.frame_end]
        base = root.location.copy(); gz0 = base.z - ground_z(base.x, base.y); rz0 = root.rotation_euler.z
        for o in allfl: o.hide_viewport = False
        bpy.context.view_layer.update(); sc.frame_set(frs[-1])
        R = root.matrix_world.copy()
        rel = [R.inverted() @ (card.matrix_world @ Vector((u, 0, v))) for u in (-0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48) for v in (-0.35, 0, 0.35)]
        foot = [R.inverted() @ (card.matrix_world @ Vector((u, 0, -0.5))) for u in (-0.5, 0, 0.5)] + [Vector((0, 0, 0))]
        mine = [root] + list(root.children_recursive)
        for o in allfl: o.hide_viewport = o in mine            # 只藏自己：已經放好的立牌也算會擋人的東西
        bpy.context.view_layer.update()
        sc.frame_set(frs[len(frs) // 2]); co = cam.matrix_world.translation.copy()
        cands = [(base.x + i * step, base.y + j * step, rz0) for i in range(-rng, rng + 1) for j in range(-rng, rng + 1)]
        fr_ = cam.data.view_frame(scene=sc); Mc = cam.matrix_world
        for sx in (0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95):
            for sy in (0.05, 0.15, 0.25, 0.35, 0.45):
                # view_frame：右上、右下、左下、左上
                tr, br, bl, tl = fr_
                pnt = bl.lerp(br, sx).lerp(tl.lerp(tr, sx), sy); d = (Mc @ pnt - co).normalized()
                if d.z >= -1e-4: continue
                k = (0.012 - co.z) / d.z; q = co + d * k
                g = ground_z(q.x, q.y); k = (g - co.z) / d.z; q = co + d * k
                for dx in (-0.03, 0.0):
                    x, y = q.x + dx, q.y
                    rz = math.atan2(co.x - x, -(co.y - y))
                    cands.append((x, y, rz))
        score = {c: 0.0 for c in cands}
        for fr in frs:
            sc.frame_set(fr); dg = bpy.context.evaluated_depsgraph_get()
            co = cam.matrix_world.translation.copy()
            faces, bodies = [], []
            for ch in CHARS:
                fc = ch.arm.matrix_world @ ch.pb["Head"].head; fc.z += 0.006; v = w2c(sc, cam, fc)
                if v.z > 0 and 0 < v.x < 1 and 0 < v.y < 1: faces.append(v)
                ft = ch.root.matrix_world.translation.copy(); ft.z -= ch.base_z
                for hz in (0.35, 0.6):
                    b = ft.copy(); b.z += ch.h * hz; v = w2c(sc, cam, b)
                    if v.z > 0 and 0 < v.x < 1 and 0 < v.y < 1: bodies.append(v)
            boxes = []
            for (pc, prel) in placed:
                q = [w2c(sc, cam, pc.matrix_world @ v) for v in prel]
                boxes.append((min(a.x for a in q), max(a.x for a in q), min(a.y for a in q), max(a.y for a in q)))
            for c in cands:
                if score[c] == float("inf"): continue
                T = mathutils.Matrix.Translation((c[0], c[1], ground_z(c[0], c[1]) + gz0)) @ mathutils.Euler(R.to_euler()[:2] + (c[2],)).to_matrix().to_4x4() @ mathutils.Matrix.Diagonal(R.to_scale().to_4d())
                pts = [T @ p for p in rel]; pv = [w2c(sc, cam, p) for p in pts]
                inside = sum(1 for q in pv if 0.02 < q.x < 0.98 and 0.03 < q.y < 0.97 and q.z > 0.02)
                sc_ = (len(pts) - inside) * 3 if inside else len(pts) * 1.5
                for p in pts:
                    dv = p - co
                    ok, hl, nm, ix, ob, mx = sc.ray_cast(dg, co, dv.normalized(), distance=max(1e-4, dv.length - 0.0015))
                    sc_ += 4 if ok and _big(ob) else 0
                xs = [q.x for q in pv]; ys = [q.y for q in pv]; zc = min(q.z for q in pv)
                for v in faces:
                    if min(xs) - 0.03 < v.x < max(xs) + 0.03 and min(ys) - 0.03 < v.y < max(ys) + 0.03: sc_ += 10   # 擋臉或躲在頭後面都不行
                for (bx0, bx1, by0, by1) in boxes:
                    if min(xs) < bx1 and max(xs) > bx0 and min(ys) < by1 and max(ys) > by0: sc_ += 20   # 不跟別的立牌重疊
                for v in bodies:
                    if min(xs) < v.x < max(xs) and min(ys) < v.y < max(ys) and zc < v.z: sc_ += 3
                for p in foot:
                    q = T @ p; g = ground_z(q.x, q.y)
                    ok, hl, nm, ix, ob, mx = sc.ray_cast(dg, Vector((q.x, q.y, 0.4)), Vector((0, 0, -1)), distance=0.5)
                    if ok and _big(ob) and hl.z > g + 0.004 and hl.z < q.z + 0.12: score[c] = float("inf"); break
                else:
                    score[c] += sc_
        raw = dict(score)
        for c in cands:
            if score[c] != float("inf"): score[c] += 0.2 * len(frs) * math.hypot(c[0] - base.x, c[1] - base.y) / step
        orig = cands[(2 * rng + 1) ** 2 // 2]
        best = min(cands, key=lambda c: score[c])
        if score[best] < score[orig]:
            root.location = (best[0], best[1], ground_z(best[0], best[1]) + gz0); root.rotation_euler.z = best[2]
        bad = raw[best] / len(frs) > FLAG_MAX or label in FLAG_HIDE
        if bad:                                                  # 怎麼放都看不清楚 → 這一段不放
            for o in mine: o.hide_render = True
        else:
            bpy.context.view_layer.update(); sc.frame_set(frs[-1])
            placed.append((root, [root.matrix_world.inverted() @ p for p in [root.matrix_world @ r_ for r_ in rel]]))
        print(f"FLAGMOVE {label} {best[0] - base.x:+.3f} {best[1] - base.y:+.3f} rot{math.degrees(best[2] - rz0):+.0f} "
              f"{score[orig]:.0f}->{score[best]:.0f} per{len(frs)} raw/fr {raw[best] / len(frs):.1f}{' HIDE' if bad else ''}", flush=True)
    for o in allfl: o.hide_viewport = False
    bpy.context.view_layer.update()
