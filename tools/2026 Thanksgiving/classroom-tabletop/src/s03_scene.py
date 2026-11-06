# 感恩節由來課堂版（畫風 H 桌上微縮）S03：
# "Long ago, in 1620, a ship sailed from England to America."
# 夜晚書桌上攤開舊地圖，玩具五月花號從 England 航向 America。
# 用法：blender -b --factory-startup --python s03_scene.py -- <props_dir> <fonts_dir> <shot r1|r2> <mode> ...
#   mode = sheet <out_dir> <frames 逗號> <engine> <samples> <scale%>
#   mode = range <out_dir> <start> <end> <step> <engine> <samples> <scale%>
#   mode = save  <out.blend>
# 每一格只由時間決定；只渲偶數格（每 2 格一張＝定格感），合成時每張放 2 格。
import bpy, bmesh, sys, math, mathutils, os, time

A = sys.argv[sys.argv.index("--") + 1:]
D, FONTS, SHOT, MODE = A[0], A[1], A[2], A[3]
FPS = 24
LEAD = 0.5                                  # 配音在片段 0.5 秒開始
TAKE = {"r1": dict(dur=8.6, words={"1620": 1.35, "sailed": 3.89, "England": 4.72, "America": 5.53, "end": 7.49}),
        "r2": dict(dur=9.7, words={"1620": 1.53, "sailed": 4.44, "England": 5.39, "America": 6.32, "end": 8.54})}[SHOT]
W = {k: v + LEAD for k, v in TAKE["words"].items()}
def f(t): return round(t * FPS)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 0, f(TAKE["dur"])
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "AgX"
try: sc.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass

# ---------- 材質 ----------
def mat(n, c, r=0.5):
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r
    return m
def wood():
    m = bpy.data.materials.new("wood"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.38
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (2.0, 40.0, 1.0)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 8.0
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.13, 0.05, 0.02, 1); cr.color_ramp.elements[1].color = (0.32, 0.14, 0.06, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"]); nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    return m
def emission(n, c, s):
    m = bpy.data.materials.new(n); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"]); e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = (*c, 1); e.inputs[1].default_value = s
    nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs[0]); return m
def paper_tex(n, img, rough=0.8):
    """貼圖紙材質＋紙纖維凹凸。"""
    m = bpy.data.materials.new(n); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = rough
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(img)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 180; nz.inputs["Detail"].default_value = 6
    bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = 0.12
    nt.links.new(nz.outputs["Fac"], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], b.inputs["Normal"])
    return m

w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.008, 0.01, 0.028, 1)

def box(loc, scl, m, name="box", bevel=0.002):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name
    o.scale = scl; o.data.materials.append(m)
    if bevel:
        bv = o.modifiers.new("bv", "BEVEL"); bv.width = bevel; bv.segments = 2
    return o

# ---------- 書桌、牆、窗外散景 ----------
box((0, 0.1, -0.02), (2.4, 1.4, 0.04), wood(), "desk")
box((0, 0.8, 0.4), (3.0, 0.02, 1.2), mat("wall", (0.03, 0.03, 0.06), 0.9), "wall")
city = [emission("cityW", (1, 0.75, 0.4), 5), emission("cityB", (0.5, 0.75, 1), 4)]
for i in range(30):
    x = -0.6 + (i * 0.37) % 1.2; z = 0.12 + ((i * 53) % 11) * 0.04
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.006 + (i % 3) * 0.003, location=(x, 0.77, z))
    bpy.context.object.data.materials.append(city[i % 4 == 0])

# ---------- 地圖（紙，邊角微翹） ----------
MW, MH = 0.80, 0.45
bpy.ops.mesh.primitive_grid_add(x_subdivisions=80, y_subdivisions=46, size=1, location=(0, 0, 0.0008))
mp_ = bpy.context.object; mp_.name = "map"; mp_.scale = (MW, MH, 1)
for v in mp_.data.vertices:                 # 紙張四角微微翹起
    ex = max(0, abs(v.co.x) * 2 - 0.86) / 0.14; ey = max(0, abs(v.co.y) * 2 - 0.8) / 0.2
    v.co.z = 0.012 * (ex ** 2) * (0.4 + ey) / MW
mp_.data.materials.append(paper_tex("map", f"{D}/atlantic_map.png"))
bpy.ops.object.shade_smooth()
def px(u, v):                                # 地圖圖片像素 → 世界座標
    return mathutils.Vector(((u / 1672 - 0.5) * MW, (0.5 - v / 941) * MH, 0.0015))

START = px(1385, 548); END = px(372, 452)    # England 西南外海 → Cape Cod 外
MID = px(880, 600)                           # 航線向南彎一點
def route(p):                                # 二次貝茲曲線
    p = max(0.0, min(1.0, p))
    return (1 - p) ** 2 * START + 2 * (1 - p) * p * MID + p * p * END
def route_dir(p):
    a, b = route(max(0, p - 0.01)), route(min(1, p + 0.01)); return (b - a).normalized()

# ---------- 小道具：墨水瓶、羽毛筆、黃銅羅盤、書 ----------
bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.05, location=(0.5, 0.2, 0.025))
bpy.context.object.data.materials.append(mat("ink", (0.02, 0.03, 0.08), 0.1))
bpy.ops.mesh.primitive_cylinder_add(radius=0.016, depth=0.012, location=(0.5, 0.2, 0.056))
bpy.context.object.data.materials.append(mat("cork", (0.45, 0.3, 0.15), 0.8))
bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.012, location=(-0.52, -0.2, 0.006))
bpy.context.object.data.materials.append(mat("brass", (0.75, 0.52, 0.2), 0.3))
bpy.ops.mesh.primitive_cylinder_add(radius=0.038, depth=0.002, location=(-0.52, -0.2, 0.0125))
bpy.context.object.data.materials.append(mat("dial", (0.92, 0.88, 0.75), 0.6))
box((-0.55, 0.3, 0.015), (0.26, 0.18, 0.03), mat("bk1", (0.08, 0.16, 0.42), 0.6))
box((-0.54, 0.3, 0.045), (0.24, 0.17, 0.03), mat("bk2", (0.55, 0.2, 0.12), 0.6))

# ---------- 紙浪（像舞台的波浪紙片，每 2 格晃一下） ----------
wave_m = mat("wavePaper", (0.18, 0.5, 0.55), 0.85)
wave_rim = mat("waveRim", (0.85, 0.95, 0.95), 0.8)
def wave_mesh(name, width, height, crests):
    bm = bmesh.new(); pts = []
    n = 40
    for i in range(n + 1):
        x = -width / 2 + width * i / n
        ph = i / n * crests * 2 * math.pi
        z = height * (0.62 + 0.38 * math.sin(ph) ** 2 * (1 if math.sin(ph) > 0 else 0.4))
        pts.append((x, z))
    verts_f = [bm.verts.new((x, 0.0012, z)) for x, z in pts] + [bm.verts.new((width / 2, 0.0012, 0)), bm.verts.new((-width / 2, 0.0012, 0))]
    verts_b = [bm.verts.new((x, -0.0012, z)) for x, z in pts] + [bm.verts.new((width / 2, -0.0012, 0)), bm.verts.new((-width / 2, -0.0012, 0))]
    bm.faces.new(verts_f); bm.faces.new(list(reversed(verts_b)))
    k = len(verts_f)
    for i in range(k):
        a, b = verts_f[i], verts_f[(i + 1) % k]; c, d = verts_b[(i + 1) % k], verts_b[i]
        bm.faces.new((a, b, c, d))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    o.data.materials.append(wave_m); o.data.materials.append(wave_rim)
    # 浪頂一圈白邊：側面用白色
    for p in o.data.polygons:
        if p.index >= 2: p.material_index = 1
    return o
waves = []
import random
rng = random.Random(7)
for i in range(46):
    p = rng.uniform(0.04, 0.96); side = rng.choice((-1, 1)) * rng.uniform(0.025, 0.11)
    c = route(p); d = route_dir(p); nrm = mathutils.Vector((-d.y, d.x, 0))
    loc = c + nrm * side
    if not (-0.3 < loc.x < 0.33 and -0.2 < loc.y < 0.2): continue
    o = wave_mesh(f"wave{i}", rng.uniform(0.04, 0.075), rng.uniform(0.012, 0.02), rng.choice((2, 3)))
    o.location = (loc.x, loc.y, 0.0012); o.rotation_euler.z = math.atan2(d.y, d.x) + rng.uniform(-0.25, 0.25)
    waves.append((o, rng.uniform(0, 6.28), o.location.copy()))
# 每 2 格才動一次（定格）
for fr in range(0, sc.frame_end + 2, 2):
    t = fr / FPS
    for o, ph, base in waves:
        o.location = base + mathutils.Vector((0.002 * math.sin(t * 2.2 + ph), 0, 0.0008 * math.sin(t * 3 + ph)))
        o.keyframe_insert("location", frame=fr)

# ---------- 匯入 Tripo 模型 ----------
def place(path, size, loc, rot_z=0, axis="z", ratio=None):
    bpy.ops.import_scene.gltf(filepath=path); objs = list(bpy.context.selected_objects)
    meshes = [o for o in objs if o.type == "MESH"]
    if ratio:
        for o in meshes:
            m = o.modifiers.new("dec", "DECIMATE"); m.ratio = ratio
            with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o], selected_editable_objects=[o]):
                bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.update()
    mn = mathutils.Vector((1e9,) * 3); mx = mathutils.Vector((-1e9,) * 3)
    for o in meshes:
        for v in o.bound_box:
            p = o.matrix_world @ mathutils.Vector(v); mn = mathutils.Vector(map(min, mn, p)); mx = mathutils.Vector(map(max, mx, p))
    dim = mx - mn; ref = {"z": dim.z, "long": max(dim.x, dim.y)}[axis]; s = size / ref
    root = bpy.data.objects.new(os.path.basename(path), None); sc.collection.objects.link(root)
    for o in objs:
        if o.parent is None: o.parent = root
    for o in objs:
        if o.parent == root: o.location -= mathutils.Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    root.scale = (s, s, s); root.location = loc; root.rotation_euler = (0, 0, rot_z)
    print("PLACED", os.path.basename(path), "dim", tuple(round(x, 3) for x in dim), flush=True)
    return root, meshes

SHIP_YAW = float(os.environ.get("SHIP_YAW", "0"))   # 模型船頭朝向校正（度）
ship, _ = place(f"{D}/mayflower.glb", 0.11, START, 0, "long")
holder = bpy.data.objects.new("shipHolder", None); sc.collection.objects.link(holder)
ship.parent = holder; ship.location = (0, 0, -0.0015); ship.rotation_euler.z = math.radians(SHIP_YAW)
# 帆船內一盞暖光（船艙窗）
bpy.ops.object.light_add(type="POINT", location=(0, 0, 0.02)); bl = bpy.context.object
bl.data.energy = 0.25; bl.data.color = (1, 0.75, 0.4); bl.data.shadow_soft_size = 0.01; bl.parent = holder

# 航行進度：r1 從 sailed 開到結尾；r2 整段都在航行（慢速版，鏡頭貼近）
if SHOT == "r1":
    def prog(t): return 0.0 if t < W["sailed"] - 0.3 else min(1.0, ((t - W["sailed"] + 0.3) / (TAKE["dur"] - 0.5 - W["sailed"] + 0.3)) ** 1.0)
else:
    def prog(t): return 0.06 + 0.86 * min(1.0, t / TAKE["dur"])
def ease_io(x): return x * x * (3 - 2 * x)
for fr in range(0, sc.frame_end + 2, 2):        # 每 2 格才動（定格感）
    t = fr / FPS; p = ease_io(prog(t)) if SHOT == "r1" else prog(t)
    c = route(p); d = route_dir(p)
    holder.location = (c.x, c.y, 0.0012 + 0.0012 * math.sin(t * 5.0))
    holder.rotation_euler = (math.radians(3.0 * math.sin(t * 3.1)), math.radians(2.0 * math.sin(t * 2.3)), math.atan2(d.y, d.x))
    holder.keyframe_insert("location", frame=fr); holder.keyframe_insert("rotation_euler", frame=fr)
def constant(o):
    ad = o.animation_data
    if not ad or not ad.action: return
    act = ad.action
    curves = list(act.fcurves) if hasattr(act, "fcurves") else [fc for l in act.layers for s in l.strips for cb in s.channelbags for fc in cb.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
constant(holder)
for o, _, _ in waves: constant(o)

# ---------- 航線虛線（墨水點，船開過就出現） ----------
ink = mat("routeInk", (0.18, 0.09, 0.04), 0.6)
NDASH = 34
for i in range(NDASH):
    p = (i + 0.5) / NDASH; c = route(p); d = route_dir(p)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(c.x, c.y, 0.0016)); o = bpy.context.object
    o.scale = (0.008, 0.0022, 0.0004); o.rotation_euler.z = math.atan2(d.y, d.x); o.data.materials.append(ink)
    # 船尾經過這一點時出現
    t_on = None
    for fr in range(0, sc.frame_end + 2, 2):
        t = fr / FPS; pp = ease_io(prog(t)) if SHOT == "r1" else prog(t)
        if pp >= p + 0.03: t_on = fr; break
    o.hide_render = True; o.keyframe_insert("hide_render", frame=-1)
    if t_on is not None:
        o.hide_render = False; o.keyframe_insert("hide_render", frame=t_on)
    if SHOT == "r2" and p < 0.08:
        o.hide_render = False; o.keyframe_insert("hide_render", frame=0)

# ---------- 牙籤旗子 England / America、木頭數字 1620 ----------
font = bpy.data.fonts.load(f"{FONTS}/ComicRelief-Regular.ttf")
card_m = mat("card", (0.95, 0.9, 0.78), 0.7); txt_m = mat("txtInk", (0.2, 0.09, 0.04), 0.5)
pick_m = mat("pick", (0.85, 0.7, 0.45), 0.6)
def text_obj(s, size, m, extrude=0.0004):
    cu = bpy.data.curves.new(s, "FONT"); cu.body = s; cu.font = font; cu.size = size; cu.extrude = extrude
    cu.align_x = "CENTER"; cu.align_y = "CENTER"
    o = bpy.data.objects.new("txt_" + s, cu); sc.collection.objects.link(o); o.data.materials.append(m); return o
def pop_in(o, t_on, s1=1.0):
    """定格式彈出：0 → 1.15 → 1（每 2 格一階）。"""
    steps = [(-1, 0.001), (f(t_on), 0.001), (f(t_on) + 2, 0.7 * s1), (f(t_on) + 4, 1.15 * s1), (f(t_on) + 6, s1)]
    for fr, s in steps:
        o.scale = (s, s, s); o.keyframe_insert("scale", frame=fr)
    constant(o)
def flag(label, loc, t_on, lean=8):
    root = bpy.data.objects.new("flag_" + label, None); sc.collection.objects.link(root); root.location = loc
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0012, depth=0.09, location=(0, 0, 0.045)); pk = bpy.context.object
    pk.data.materials.append(pick_m); pk.parent = root
    tw = 0.019 * len(label) + 0.02
    card = box((tw / 2 + 0.001, 0, 0.07), (tw, 0.0008, 0.036), card_m, "card_" + label, bevel=0.0004); card.parent = root
    t = text_obj(label, 0.027, txt_m); t.parent = root; t.location = (tw / 2 + 0.001, -0.0009, 0.07); t.rotation_euler = (math.radians(90), 0, 0)
    root.rotation_euler = (0, math.radians(lean), 0)
    pop_in(root, t_on); return root
ENG = px(1440, 300); AMR = px(150, 330)
flag("England", ENG, W["England"])
flag("America", AMR, W["America"], lean=-6)
# 木頭數字 1620（立在海上，航線北側）
n1620 = text_obj("1620", 0.06, wood(), extrude=0.005)
n1620.rotation_euler = (math.radians(90), 0, 0)
nloc = route(0.40 if SHOT == "r1" else 0.46) + mathutils.Vector((0, 0.075 if SHOT == "r1" else 0.05, 0.0))   # 航線北側；r2 鏡頭在南側，船開過時數字在船後方
n1620.location = (nloc.x, nloc.y, 0.03)
pop_in(n1620, W["1620"])

# ---------- 燈光：左上檯燈暖光＋冷色補光＋背光 ----------
bpy.ops.object.light_add(type="SPOT", location=(-0.45, -0.35, 0.75)); L = bpy.context.object
L.data.energy = 55; L.data.color = (1, 0.7, 0.35); L.data.spot_size = math.radians(75); L.data.spot_blend = 0.6
L.data.shadow_soft_size = 0.06; L.rotation_euler = (math.radians(30), math.radians(-28), 0)
bpy.ops.object.light_add(type="AREA", location=(0.6, -0.45, 0.35)); F = bpy.context.object
F.data.energy = 9; F.data.color = (0.5, 0.8, 1); F.data.size = 0.45; F.rotation_euler = (math.radians(55), 0, math.radians(35))
bpy.ops.object.light_add(type="AREA", location=(0.05, 0.65, 0.3)); R = bpy.context.object
R.data.energy = 6; R.data.color = (0.6, 0.7, 1); R.data.size = 0.7; R.rotation_euler = (math.radians(-70), 0, 0)

# ---------- 鏡頭 ----------
def empty(n, loc):
    e = bpy.data.objects.new(n, None); sc.collection.objects.link(e); e.location = loc; return e
def camera(n, lens, fstop, target, focus):
    cd = bpy.data.cameras.new(n); cd.lens = lens; cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop
    cd.dof.focus_object = focus; c = bpy.data.objects.new(n, cd); sc.collection.objects.link(c)
    tr = c.constraints.new("TRACK_TO"); tr.target = target; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
    return c
aim = empty("aim", (0, 0, 0)); foc = empty("focus", (0, 0, 0))
if SHOT == "r1":        # 高角度俯看整張地圖，慢慢推近、跟著船往左
    cam = camera("cam", 38, 5.6, aim, foc)
    for fr in range(0, sc.frame_end + 2, 2):
        t = fr / FPS; u = t / TAKE["dur"]; s = holder.location.copy() if False else None
        pp = ease_io(prog(t)); c = route(pp)
        cam.location = (0.10 - 0.16 * u + 0.25 * (c.x - 0.0) * 0.4, -0.62 + 0.08 * u, 0.66 - 0.1 * u)
        aim.location = (0.04 + 0.35 * (c.x - 0.04) * 0.6, 0.0, 0.0)
        foc.location = (c.x, c.y, 0.02)
        for o in (cam, aim, foc): o.keyframe_insert("location", frame=fr)
else:                   # 低角度微距，貼著船側跟拍
    cam = camera("cam", 50, 2.8, aim, foc)
    for fr in range(0, sc.frame_end + 2, 2):
        t = fr / FPS; p = prog(t); c = route(p); d = route_dir(p); nrm = mathutils.Vector((-d.y, d.x, 0))
        side = c + nrm * 0.26 - d * 0.02            # 船的南側（船往西開時 nrm 指向南）
        cam.location = (side.x, side.y, 0.06 + 0.008 * math.sin(t * 0.7))
        aim.location = (c.x + d.x * 0.012, c.y + d.y * 0.012, 0.04)
        foc.location = (c.x, c.y, 0.035)
        for o in (cam, aim, foc): o.keyframe_insert("location", frame=fr)
for o in (cam, aim, foc): constant(o)
sc.camera = cam

# ---------- 輸出 ----------
def setup(engine, samples, scale):
    sc.render.engine = engine
    sc.render.resolution_percentage = int(scale)
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

if MODE == "save":
    bpy.ops.wm.save_as_mainfile(filepath=A[4])
elif MODE in ("sheet", "range"):
    out = A[4]; os.makedirs(out, exist_ok=True)
    if MODE == "sheet": frames = [int(x) for x in A[5].split(",")]; engine, samples, scale = A[6], A[7], A[8]
    else: frames = list(range(int(A[5]), int(A[6]) + 1, int(A[7]))); engine, samples, scale = A[8], A[9], A[10]
    setup(engine, samples, scale)
    for fr in frames:
        p = os.path.join(out, f"f{fr:04d}.png")
        if MODE == "range" and os.path.exists(p): continue
        sc.frame_set(fr); sc.render.filepath = p; t0 = time.time()
        bpy.ops.render.render(write_still=True); print(f"FRAME {fr} {time.time() - t0:.1f}s", flush=True)
