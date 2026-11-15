# Ershui tabletop town (style H miniature) for "Where's the ___? It's on ___ Road/Street." (Blender 5.2, Colab Cycles). ASCII only.
# blender -b --factory-startup --python town.py -- <props_dir> <out_dir> <shot> <mode> <samples> <scale%>
# mode "sample": 3 stills -> overview (all 8 coloured roads + signs), figures (Ken/Shuiling/Zun-Bo at Red Road), roadstreet (Road vs Street signs)
import bpy, math, os, sys
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, OUT, SHOT, MODE, SAMPLES, SCALE = A[0], A[1], A[2], A[3], int(A[4]), int(A[5])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "Standard"
try: sc.view_settings.look = "Medium High Contrast"
except Exception: pass

COL = {"red": (0.80, 0.12, 0.12), "blue": (0.10, 0.36, 0.78), "green": (0.16, 0.55, 0.22), "yellow": (0.98, 0.72, 0.05),
       "white": (0.93, 0.93, 0.92), "orange": (0.98, 0.45, 0.08), "purple": (0.42, 0.25, 0.85), "brown": (0.50, 0.30, 0.15)}
# board 0.96 x 0.64 m centred at 0. Roads (wide 0.055) and Streets (narrow 0.028): (colour, kind, x0, y0, x1, y1)
ROADS = [("red", "Road", -0.46, -0.14, 0.46, -0.14), ("green", "Road", -0.46, 0.15, 0.46, 0.15),
         ("white", "Road", -0.27, -0.31, -0.27, 0.31), ("purple", "Road", 0.25, -0.31, 0.25, 0.31),
         ("blue", "Street", 0.0, -0.14, 0.0, 0.15), ("orange", "Street", -0.27, 0.0, 0.0, 0.0),
         ("yellow", "Street", 0.0, 0.035, 0.25, 0.035), ("brown", "Street", 0.37, 0.15, 0.37, 0.31)]
# building: (glb, place, footprint size m, x, y, facing deg -> towards its road)
BLD = [("bld_station", "train station", 0.15, -0.10, -0.235, 90), ("bld_post", "post office", 0.085, 0.065, -0.07, 0),
       ("bld_school_gate", "school", 0.12, -0.10, 0.235, -90), ("bld_library", "library", 0.09, 0.13, 0.095, -90),
       ("bld_health", "hospital", 0.09, -0.36, 0.05, -90), ("bld_bookstore", "bookstore", 0.07, -0.14, 0.06, -90),
       ("bld_pxmart", "supermarket", 0.10, 0.34, -0.06, -90), ("bld_museum", "museum", 0.08, 0.425, 0.25, 90)]


def mat(n, c, r=0.6):
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r; return m


def box(loc, size, m, name="box", rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = name; o.scale = size
    o.data.materials.append(m); return o


def cyl(loc, r, d, m, name="cyl", rot=(0, 0, 0), v=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot); o = bpy.context.object; o.name = name
    o.data.materials.append(m); return o


def bbox(objs):
    bpy.context.view_layer.update(); mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for o in objs:
        if o.type != "MESH": continue
        for v in o.bound_box:
            p = o.matrix_world @ Vector(v); mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    return mn, mx


def place_glb(path, size, loc, rot_deg, by="xy"):
    bpy.ops.import_scene.gltf(filepath=path); objs = list(bpy.context.selected_objects)
    root = bpy.data.objects.new("r_" + os.path.basename(path), None); sc.collection.objects.link(root)
    for o in objs:
        if o.parent is None: o.parent = root
    mn, mx = bbox(objs); d = mx - mn; s = size / (max(d.x, d.y) if by == "xy" else d.z)
    root.scale = (s, s, s); root.rotation_euler = (0, 0, math.radians(rot_deg)); bpy.context.view_layer.update()
    mn, mx = bbox(objs); root.location = (loc[0] - (mn.x + mx.x) / 2, loc[1] - (mn.y + mx.y) / 2, loc[2] - mn.z); bpy.context.view_layer.update()
    for o in objs:
        if o.type == "ARMATURE" and o.animation_data: o.animation_data.action = None
    return root, objs


FONT = bpy.data.fonts.load(f"{PROPS}/ComicRelief-Bold.ttf")


def text(s, size, m, loc, rot):
    cu = bpy.data.curves.new("t", "FONT"); cu.body = s; cu.font = FONT; cu.align_x = "CENTER"; cu.align_y = "CENTER"; cu.extrude = 0.0003; cu.size = size
    o = bpy.data.objects.new("txt", cu); sc.collection.objects.link(o); o.data.materials.append(m); o.location = loc; o.rotation_euler = rot; return o


# ---------- desk, board, roads ----------
wood = mat("wood", (0.42, 0.25, 0.13), 0.45)
box((0, 0, -0.012), (2.2, 1.4, 0.024), wood, "desk")
box((0, 0, 0.004), (0.98, 0.66, 0.008), mat("felt", (0.30, 0.52, 0.26), 0.95), "board")      # green felt grass
for x, y in ((-0.40, 0.27), (0.12, -0.26), (-0.40, -0.27), (0.12, 0.27), (0.44, -0.26)):     # little paper trees
    cyl((x, y, 0.02), 0.004, 0.03, mat("trunk", (0.4, 0.25, 0.12))); bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.022, depth=0.05, location=(x, y, 0.055))
    bpy.context.object.data.materials.append(mat("leaf", (0.25, 0.55, 0.28), 0.9))
white = mat("paint", (0.97, 0.97, 0.95), 0.7)
SIGN_AT = {}
ROADOBJ = {}
SIGNOBJ = {}
for c, kind, x0, y0, x1, y1 in ROADS:
    w = 0.055 if kind == "Road" else 0.028; L = math.hypot(x1 - x0, y1 - y0); horiz = abs(y1 - y0) < 1e-6
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; z = 0.0095 if kind == "Road" else 0.0100
    ROADOBJ[c] = box((cx, cy, z), (L, w, 0.002) if horiz else (w, L, 0.002), mat(f"road_{c}", COL[c], 0.55), f"road_{c}")
    if kind == "Road":   # white centre dashes on wide roads
        n = int(L / 0.04)
        for i in range(n):
            u = (i + 0.5) / n; px, py = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
            box((px, py, z + 0.0012), (0.018, 0.003, 0.0004) if horiz else (0.003, 0.018, 0.0004), white, "dash")
    u_ = 0.22 if kind == "Road" else 0.5   # wide roads: 1/4 along (the middle is often a crossing)
    sx_, sy_ = x0 + (x1 - x0) * u_, y0 + (y1 - y0) * u_
    SIGN_AT[c] = (sx_ + (0 if horiz else w / 2 + 0.012), sy_ + (w / 2 + 0.012 if horiz else 0), horiz)

# ---------- toothpick road signs: Road = rectangle card, Street = smaller card with a pointed end ----------
pick = mat("pick", (0.85, 0.72, 0.5), 0.7); txtw = mat("txtw", (1, 1, 1), 0.5); txtd = mat("txtd", (0.12, 0.08, 0.2), 0.5)
for c, kind, x0, y0, x1, y1 in ROADS:
    sx, sy, horiz = SIGN_AT[c]; ang = 0 if horiz else math.radians(90)
    H = 0.095 if kind == "Road" else 0.08   # v3: signs x1.5 (teacher: too small/blurry from above)
    sroot = bpy.data.objects.new(f"sign_{c}", None); sc.collection.objects.link(sroot); sroot.location = (sx, sy, 0.008); SIGNOBJ[c] = sroot
    _before = set(bpy.data.objects)
    cyl((sx, sy, 0.008 + H / 2), 0.0018, H, pick, "toothpick")
    card_w, card_h = (0.11, 0.036) if kind == "Road" else (0.09, 0.029)
    cm = mat(f"card_{c}", COL[c], 0.6)
    cz = 0.008 + H - card_h / 2
    box((sx, sy, cz), (card_w, 0.0025, card_h), cm, "card", rot=(0, 0, ang))
    if kind == "Street":   # pointed end (little arrow) so a Street sign looks different
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=card_h * 0.62, depth=0.0025, location=(0, 0, 0), rotation=(math.radians(90), 0, 0))
        tip = bpy.context.object; tip.data.materials.append(cm)
        off = Vector((card_w / 2 + card_h * 0.25, 0, 0)); R = __import__("mathutils").Matrix.Rotation(ang, 3, "Z")
        tip.location = Vector((sx, sy, cz)) + R @ off; tip.rotation_euler = (math.radians(90), math.radians(90), ang)
    tm = txtd if c in ("white", "yellow") else txtw
    for side in (1, -1):   # text on both faces
        nrm = __import__("mathutils").Matrix.Rotation(ang, 3, "Z") @ Vector((0, side * 0.0016, 0))
        text(f"{c.capitalize()} {kind}", card_h * 0.55, tm, Vector((sx, sy, cz)) + nrm, (math.radians(90), 0, ang + (0 if side < 0 else math.pi)))
    for o in set(bpy.data.objects) - _before:
        if o is not sroot and o.parent is None: o.parent = sroot; o.matrix_parent_inverse = sroot.matrix_world.inverted()

# ---------- buildings ----------
ICON = {"train station": "station", "post office": "post", "school": "school", "library": "library", "hospital": "hospital", "bookstore": "bookstore", "supermarket": "supermarket", "museum": "museum"}
PINS = []
ring_m = mat("pinring", (1.0, 0.70, 0.28), 0.5); disc_m = mat("pindisc", (1, 1, 1), 0.6)
for glb, name, size, x, y, rot in BLD:
    _r, _objs = place_glb(f"{PROPS}/{glb}.glb", size, (x, y, 0.008), rot)
    print("BUILDING", name, flush=True)
    top = bbox(_objs)[1].z
    # teacher 11/15: a clear picture above every place -> round white badge with the game icon, always facing the camera
    pin = bpy.data.objects.new("pin_" + name, None); sc.collection.objects.link(pin); pin.location = (x, y, top + 0.045)
    R_ = 0.030
    cyl((0, 0, 0), R_, 0.003, disc_m, "pindisc", rot=(math.radians(90), 0, 0), v=40).parent = pin
    bpy.ops.mesh.primitive_torus_add(major_radius=R_, minor_radius=0.0028, rotation=(math.radians(90), 0, 0)); tr = bpy.context.object; tr.data.materials.append(ring_m); tr.parent = pin
    bpy.ops.mesh.primitive_plane_add(size=R_ * 1.36, location=(0, -0.0018, 0), rotation=(math.radians(90), 0, 0)); pl = bpy.context.object; pl.parent = pin
    im_ = mat("icon_" + name, (1, 1, 1), 0.7); nt = im_.node_tree; tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = bpy.data.images.load(f"{PROPS}/{ICON[name]}_2.png"); nt.links.new(tx.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"]); pl.data.materials.append(im_)
    cyl((0, 0, -0.03), 0.0012, 0.05, pick, "pinstick").parent = pin
    PINS.append(pin)
# supermarket brand sign -> plain board "SUPERMARKET" (teacher's de-branding rule)
box((0.34 - 0.052, -0.06, 0.05), (0.004, 0.10, 0.018), mat("plate", (0.18, 0.44, 0.45), 0.9), "plate")
text("SUPERMARKET", 0.011, txtw, Vector((0.34 - 0.0545, -0.06, 0.05)), (math.radians(90), 0, math.radians(-90)))

# ---------- figurines (5-6 cm, on little round bases) ----------
FIGS = [("ken_openhand", 0.060, (-0.36, -0.185)), ("shuiling_softhand", 0.056, (-0.315, -0.20)), ("zunbo_openhand", 0.058, (-0.40, -0.205))]
base_m = mat("base", (0.95, 0.93, 0.88), 0.5)
for glb, h, (x, y) in FIGS:
    cyl((x, y, 0.0105), 0.017, 0.003, base_m, "figbase", v=24)
    r, objs = place_glb(f"{PROPS}/{glb}.glb", h, (x, y, 0.012), -20, by="z")
    for m in bpy.data.materials:
        bs = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.use_nodes else None
        if bs and bs.inputs["Metallic"].links:
            for l in list(bs.inputs["Metallic"].links): m.node_tree.links.remove(l)
            bs.inputs["Metallic"].default_value = 0.0

# ---------- lights: warm desk lamp + soft window ----------
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.30, 0.42, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.12
for loc, e, sz, c in (((-0.6, -0.5, 0.9), 14, 0.6, (1.0, 0.85, 0.65)), ((0.9, 0.6, 1.1), 7, 1.5, (0.75, 0.82, 1.0)), ((0.0, 0.8, 0.5), 4, 1.0, (1.0, 0.6, 0.3))):   # small scene: low energies (v1 was all white)
    bpy.ops.object.light_add(type="AREA", location=loc); L = bpy.context.object; L.data.energy = e; L.data.size = sz; L.data.color = c
    L.rotation_euler = (Vector((0, 0, 0)) - L.location).to_track_quat("-Z", "Y").to_euler()

cd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam
cd.dof.use_dof = True
for pin in PINS:
    c_ = pin.constraints.new("TRACK_TO"); c_.target = cam; c_.track_axis = "TRACK_NEGATIVE_Y"; c_.up_axis = "UP_Z"


def shoot(name, loc, look, lens, fstop):
    cd.dof.use_dof = fstop > 0
    cam.location = loc; cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cd.lens = lens; cd.dof.aperture_fstop = fstop; cd.dof.focus_distance = (Vector(look) - Vector(loc)).length
    sc.render.filepath = f"{OUT}/{SHOT}_{name}.png"; bpy.ops.render.render(write_still=True); print("FRAME", name, flush=True)



# ---------- trial animation (MODE all): opening + question 1 (train station, Red Road). Times from the voice lengths ----------
if MODE == "all":
    FPS = 24; sc.render.fps = FPS
    T_END = float(os.environ.get("T_END", "37.5")); T_FIG, T_MAP, T_ANS, T_FLY0, T_FLY1 = 15.6, 20.3, 26.9, 28.8, 30.8
    nfr = int(round(T_END * FPS)); sc.frame_start = 0; sc.frame_end = nfr - 1
    OV_LOOK = Vector((0.0, -0.02, 0.0)); FIG = ((-0.27, -0.42, 0.10), (-0.34, -0.19, 0.04)); MAP = ((0.0, -0.68, 0.88), (0.0, -0.01, 0.0))   # v3: a bit higher so the school badge is not cut
    ST = ((-0.02, -0.03, 0.085), (-0.10, -0.23, 0.035))
    def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
    def cam_at(t):
        if t < T_FIG:   # slow orbit over the whole town
            a = math.radians(-112 + 24 * t / T_FIG); r = 0.92
            return (OV_LOOK + Vector((math.cos(a) * r, math.sin(a) * r, 0.70)), OV_LOOK, 30)
        if t < T_MAP: k = (t - T_FIG) / (T_MAP - T_FIG); return (Vector(FIG[0]) + Vector((0.01 * k, 0.01 * k, 0)), Vector(FIG[1]), 50)
        if t < T_FLY0: return (Vector(MAP[0]), Vector(MAP[1]), 32)
        if t < T_FLY1:
            k = ease((t - T_FLY0) / (T_FLY1 - T_FLY0)); return (Vector(MAP[0]).lerp(Vector(ST[0]), k), Vector(MAP[1]).lerp(Vector(ST[1]), k), 32 + 10 * k)
        k = (t - T_FLY1) / max(0.1, T_END - T_FLY1); return (Vector(ST[0]) + Vector((0.006 * k, 0.012 * k, 0)), Vector(ST[1]), 42)
    rm = ROADOBJ["red"].data.materials[0]; bs = rm.node_tree.nodes["Principled BSDF"]
    bs.inputs["Emission Color"].default_value = (1.0, 0.25, 0.2, 1)
    sg = SIGNOBJ["red"]
    for fr in range(0, nfr, 2):   # stop-motion feel: a new pose every 2 frames
        t = fr / FPS; loc, look, lens = cam_at(t)
        cam.location = loc; cam.rotation_euler = (look - loc).to_track_quat("-Z", "Y").to_euler(); cd.lens = lens
        cd.dof.use_dof = lens >= 40; cd.dof.aperture_fstop = 22; cd.dof.focus_distance = (look - loc).length   # v3: map shots no DOF at all
        g = 0.0 if t < T_ANS else min(1.0, (t - T_ANS) / 0.5) * (0.75 + 0.25 * math.sin((t - T_ANS) * 6))
        bs.inputs["Emission Strength"].default_value = 1.6 * g
        s_ = 1.0 + 0.6 * (min(1.0, max(0.0, (t - T_ANS) / 0.4)) if t < T_FLY0 else max(0.0, 1 - (t - T_FLY0) / 0.6))
        sg.scale = (s_, s_, s_)
        for o, path in ((cam, "location"), (cam, "rotation_euler")): o.keyframe_insert(path, frame=fr)
        ps_ = 1.0 if lens < 36 else max(0.0, 1.0 - (lens - 36) / 4.0)   # v3: badges shrink away in close-ups (they blocked the station)
        for pin in PINS: pin.scale = (max(ps_, 0.001),) * 3; pin.keyframe_insert("scale", frame=fr)
        cd.keyframe_insert("lens", frame=fr); cd.dof.keyframe_insert("use_dof", frame=fr); bs.inputs["Emission Strength"].keyframe_insert("default_value", frame=fr); sg.keyframe_insert("scale", frame=fr)
    sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
    cp = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try: cp.compute_device_type = kind; cp.get_devices(); break
        except Exception: pass
    for d in cp.devices: d.use = d.type != "CPU"
    sc.render.resolution_percentage = SCALE; sc.render.image_settings.file_format = "PNG"; os.makedirs(OUT, exist_ok=True)
    a_, b_ = (int(v) for v in os.environ.get("FR_RANGE", f"0-{nfr}").split("-"))   # batch of frames (each Colab job < 25 min)
    for fr in range(a_ - a_ % 2, min(nfr, b_ + 1), 2):
        p_ = f"{OUT}/f{fr:04d}.png"
        if os.path.exists(p_): continue
        sc.frame_set(fr); sc.render.filepath = p_; bpy.ops.render.render(write_still=True); print("FRAME", fr, flush=True)
    sys.exit(0)
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
cp = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try: cp.compute_device_type = kind; cp.get_devices(); break
    except Exception: pass
for d in cp.devices: d.use = d.type != "CPU"
sc.render.resolution_percentage = SCALE; sc.render.image_settings.file_format = "PNG"
os.makedirs(OUT, exist_ok=True)
shoot("overview", (0.0, -0.62, 0.78), (0.0, -0.03, 0.0), 32, 0)
shoot("station", (-0.02, -0.03, 0.085), (-0.10, -0.23, 0.035), 42, 22)
shoot("figures", (-0.27, -0.42, 0.10), (-0.34, -0.19, 0.04), 50, 5.6)
shoot("roadstreet", (0.10, -0.38, 0.22), (0.02, -0.08, 0.03), 40, 8)
