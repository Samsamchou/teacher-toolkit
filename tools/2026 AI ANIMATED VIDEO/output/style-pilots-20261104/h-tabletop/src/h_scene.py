# 畫風 H 桌上微縮定格試片 "I go to school by bus."
# 用法：blender -b --factory-startup --python h_scene.py -- <props_dir> <mode> <out> [args]
#   mode = sheet  <out_dir> <frames 逗號分隔> <engine> <samples> <scale%>
#   mode = range  <out_dir> <start> <end> <engine> <samples> <scale%>
#   mode = save   <out.blend>
# 每一格只由時間決定（關鍵影格），可平行、可續跑。
import bpy, sys, math, mathutils, os, time

A = sys.argv[sys.argv.index("--") + 1:]
D, MODE = A[0], A[1]
FPS = 24
def f(t): return round(t * FPS)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 0, 239
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "AgX"
try: sc.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass

# ---------- 材質 / materials ----------
def mat(n, c, r=0.5, spec=0.5):
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

w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.008, 0.01, 0.028, 1)

# ---------- 書桌與小道具 / desk set ----------
def box(loc, scl, m, name="box"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name
    o.scale = scl; o.data.materials.append(m)
    bv = o.modifiers.new("bv", "BEVEL"); bv.width = 0.002; bv.segments = 2
    return o
box((0, 0.15, -0.02), (2.0, 1.1, 0.04), wood(), "desk")
# 牆＋窗外城市散景 / back wall + window bokeh
box((0, 0.75, 0.4), (3.0, 0.02, 1.2), mat("wall", (0.03, 0.03, 0.06), 0.9), "wall")
box((0.05, 0.735, 0.38), (1.1, 0.01, 0.55), mat("win", (0.01, 0.015, 0.04), 0.2), "window")
city = [emission("cityW", (1, 0.75, 0.4), 5), emission("cityB", (0.5, 0.75, 1), 4)]
for i in range(26):
    x = -0.48 + (i * 0.37) % 1.0; z = 0.15 + ((i * 53) % 11) * 0.04
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.006 + (i % 3) * 0.003, location=(x, 0.72, z))
    bpy.context.object.data.materials.append(city[i % 4 == 0])
# 紙條馬路 / paper-strip road
paper = mat("paper", (0.17, 0.16, 0.19), 0.85)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.15, 0, 0.0006)); r = bpy.context.object
r.scale = (1.5, 0.07, 1); r.data.materials.append(paper)
dash = mat("dash", (0.92, 0.88, 0.75), 0.8)
for i in range(18):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.85 + i * 0.08, 0, 0.0012)); s = bpy.context.object
    s.scale = (0.035, 0.005, 1); s.rotation_euler.z = math.radians((i * 7) % 3 - 1); s.data.materials.append(dash)
# 書、鉛筆 / books and a pencil
box((-0.42, 0.28, 0.012), (0.24, 0.17, 0.024), mat("bk1", (0.08, 0.16, 0.42), 0.6))
box((-0.41, 0.28, 0.036), (0.22, 0.16, 0.024), mat("bk2", (0.62, 0.48, 0.16), 0.6))
bpy.ops.mesh.primitive_cylinder_add(radius=0.004, depth=0.17, location=(-0.3, -0.2, 0.004), rotation=(0, math.radians(90), math.radians(-25)))
bpy.context.object.data.materials.append(mat("pencil", (0.95, 0.75, 0.15), 0.5))

# ---------- 匯入 Tripo 模型 / import Tripo GLBs ----------
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
    return root, meshes

def show_only(meshes, windows):
    """定格切換：只在 windows=[(t_on, t_off),...] 內可見（整格切換）。"""
    for o in meshes:
        o.hide_render = True; o.keyframe_insert("hide_render", frame=-1)
        o.hide_viewport = True; o.keyframe_insert("hide_viewport", frame=-1)
        for t0, t1 in windows:
            for val, t in ((False, t0), (True, t1)):
                o.hide_render = val; o.keyframe_insert("hide_render", frame=f(t))
                o.hide_viewport = val; o.keyframe_insert("hide_viewport", frame=f(t))

STOP = (0.0, -0.065, 0)
NOVA_STOP = (0.07, -0.085, 0)
SCHOOL = (0.47, 0.09, 0)
NOVA_SCHOOL = (0.41, -0.07, 0)
place(f"{D}/stop.glb", 0.12, STOP)
place(f"{D}/school.glb", 0.15, SCHOOL, math.radians(-18), "long")
poses = [("P01", [(0, 1.0)], NOVA_STOP, -12), ("P06", [(1.0, 2.4)], NOVA_STOP, -12),
         ("P04", [(2.4, 4.9)], NOVA_STOP, -20), ("P10", [(4.9, 5.8)], NOVA_STOP, -12),
         ("P02", [(5.8, 6.5)], NOVA_STOP, -25), ("P07", [(8.9, 10.5)], NOVA_SCHOOL, -10)]
for name, win, loc, rz in poses:
    _, ms = place(f"{D}/nova-{name}.glb", 0.12, loc, math.radians(rz), "z", ratio=0.2)
    show_only(ms, win)

# 公車：開進來→停→回彈→開往學校 / the bus
bus, bms = place(f"{D}/bus.glb", 0.15, (-0.9, 0.0, 0), 0, "long", ratio=0.25)
def kx(t, x, interp="BEZIER", ease="AUTO"):
    bus.location.x = x; bus.keyframe_insert("location", index=0, frame=f(t))
# Blender 預設新關鍵影格就是 Bezier＋Auto Clamped，停車前會自然減速
kx(0, -0.9); kx(3.0, -0.9); kx(5.0, -0.06); kx(7.0, -0.06); kx(8.8, 0.19); kx(10, 0.19)
# 回彈（壓扁再彈起）/ squash bounce at each stop
base = bus.scale.copy()
def sq(t, zf, xf):
    bus.scale = (base.x * xf, base.y, base.z * zf); bus.keyframe_insert("scale", frame=f(t))
for t0 in (5.0, 8.8):
    sq(t0 - 0.05, 1.0, 1.0); sq(t0 + 0.08, 0.93, 1.04); sq(t0 + 0.2, 1.04, 0.98); sq(t0 + 0.34, 1.0, 1.0)
# 公車發光窗 / a warm glow inside the bus (point light rides with it)
bpy.ops.object.light_add(type="POINT", location=(0, 0, 0.04)); bl = bpy.context.object
bl.data.energy = 0.6; bl.data.color = (1, 0.8, 0.45); bl.data.shadow_soft_size = 0.02; bl.parent = bus
bl.location = (0, 0, 0.5)

# ---------- 燈光 / lights ----------
bpy.ops.object.light_add(type="SPOT", location=(-0.35, -0.3, 0.55)); L = bpy.context.object
L.data.energy = 70; L.data.color = (1, 0.7, 0.35); L.data.spot_size = math.radians(85); L.data.spot_blend = 0.6
L.data.shadow_soft_size = 0.05; L.rotation_euler = (math.radians(32), math.radians(-28), 0)
bpy.ops.object.light_add(type="AREA", location=(0.5, -0.35, 0.3)); F = bpy.context.object
F.data.energy = 7; F.data.color = (0.5, 0.8, 1); F.data.size = 0.35; F.rotation_euler = (math.radians(55), 0, math.radians(35))
bpy.ops.object.light_add(type="AREA", location=(0.05, 0.6, 0.25)); R = bpy.context.object
R.data.energy = 5; R.data.color = (0.6, 0.7, 1); R.data.size = 0.6; R.rotation_euler = (math.radians(-70), 0, 0)

# ---------- 鏡頭 / cameras ----------
def empty(n, loc):
    e = bpy.data.objects.new(n, None); sc.collection.objects.link(e); e.location = loc; return e
def camera(n, lens, fstop, target, focus):
    cd = bpy.data.cameras.new(n); cd.lens = lens; cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop
    cd.dof.focus_object = focus; c = bpy.data.objects.new(n, cd); sc.collection.objects.link(c)
    tr = c.constraints.new("TRACK_TO"); tr.target = target; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
    return c
# 鏡 1：慢推 / shot 1 slow push
t1 = empty("aim1", (0.0, 0, 0.055)); fo1 = empty("focus1", NOVA_STOP)
fo1.location.z = 0.07
c1 = camera("cam1", 55, 2.8, t1, fo1)
for t, loc, aim in ((0, (-0.22, -0.68, 0.14), (-0.04, 0, 0.06)), (6.5, (0.0, -0.6, 0.12), (0.0, 0, 0.06))):
    c1.location = loc; c1.keyframe_insert("location", frame=f(t)); t1.location = aim; t1.keyframe_insert("location", frame=f(t))
# 鏡 2：較高較廣，跟著公車 / shot 2 wider, follows the bus
t2 = empty("aim2", (0.1, 0.02, 0.03)); fo2 = empty("focus2", (0.15, 0, 0.05))
c2 = camera("cam2", 50, 4.0, t2, fo2)
for t, loc, aim, fx in ((6.5, (-0.04, -0.6, 0.2), (0.06, 0.02, 0.04), (0.0, 0, 0.05)),
                        (10, (0.2, -0.56, 0.18), (0.33, 0.03, 0.05), (0.41, -0.07, 0.06))):
    c2.location = loc; c2.keyframe_insert("location", frame=f(t)); t2.location = aim; t2.keyframe_insert("location", frame=f(t))
    fo2.location = fx; fo2.keyframe_insert("location", frame=f(t))
sc.camera = c1
m1 = sc.timeline_markers.new("cam1", frame=0); m1.camera = c1
m2 = sc.timeline_markers.new("cam2", frame=f(6.5)); m2.camera = c2

# ---------- 輸出 / output ----------
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
    bpy.ops.wm.save_as_mainfile(filepath=A[2])
elif MODE in ("sheet", "range"):
    out = A[2]; os.makedirs(out, exist_ok=True)
    if MODE == "sheet": frames = [int(x) for x in A[3].split(",")]; engine, samples, scale = A[4], A[5], A[6]
    else: frames = list(range(int(A[3]), int(A[4]) + 1)); engine, samples, scale = A[5], A[6], A[7]
    setup(engine, samples, scale)
    for fr in frames:
        p = os.path.join(out, f"f{fr:04d}.png")
        if MODE == "range" and os.path.exists(p): continue
        sc.frame_set(fr); sc.render.filepath = p; t0 = time.time()
        bpy.ops.render.render(write_still=True); print(f"FRAME {fr} {time.time() - t0:.1f}s", flush=True)
