# Shuiling 3D model check (Blender 5.2, Colab G4 Cycles). ASCII only.
# blender -b --factory-startup --python b3d_check.py -- <props_dir> <out_dir> <shot> <mode> <samples> <scale%>
# Renders: front, 3/4, right hand, left hand, sitting (mx_sitting_idle), running (mx_jogging) -> check skirt clipping and open hands.
import bpy, math, os, sys
from mathutils import Vector, Matrix, Quaternion

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, OUT, SHOT, FR, SAMPLES, SCALE = A[0], A[1], A[2], A[3], int(A[4]), int(A[5])
H = 1.28   # Shuiling height (Ken is 1.35)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "Standard"


def empty(n, loc=(0, 0, 0)):
    e = bpy.data.objects.new(n, None); sc.collection.objects.link(e); e.location = loc; return e


def mat(n, c, r=0.7):
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r; return m


def bbox(objs):
    bpy.context.view_layer.update(); mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for o in objs:
        if o.type != "MESH": continue
        for v in o.bound_box:
            p = o.matrix_world @ Vector(v); mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    return mn, mx


bpy.ops.import_scene.gltf(filepath=f"{PROPS}/shuiling_softhand.glb"); objs = list(bpy.context.selected_objects)
arm = next(o for o in objs if o.type == "ARMATURE")
if arm.animation_data: arm.animation_data.action = None
mn, mx = bbox(objs); s = H / (mx.z - mn.z)
root = empty("root")
for o in objs:
    if o.parent is None: o.parent = root
root.scale = (s, s, s); bpy.context.view_layer.update()
mn, mx = bbox(objs); root.location = (-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z); bpy.context.view_layer.update()
BASEZ = root.location.z
PB = {b.name.split(":")[-1]: b for b in arm.pose.bones}
for b in PB.values(): b.rotation_mode = "QUATERNION"
print("MODEL size", tuple(round(v, 2) for v in (mx - mn)), "bones", len(PB), flush=True)
for m in bpy.data.materials:
    bs = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.use_nodes else None
    if bs:
        for l in list(bs.inputs["Metallic"].links): m.node_tree.links.remove(l)
        bs.inputs["Metallic"].default_value = 0.0

# studio
bpy.ops.mesh.primitive_plane_add(size=20); bpy.context.object.data.materials.append(mat("floor", (0.55, 0.45, 0.42), 0.8))
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 3, 5), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(mat("wall", (0.55, 0.5, 0.75), 0.9))
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.28, 0.4, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.4
for loc, e, c in (((-1.6, -2.4, 2.4), 120, (1, 0.92, 0.85)), ((1.8, -1.8, 1.6), 50, (0.85, 0.85, 1.0)), ((0.6, 1.6, 2.0), 70, (1.0, 0.6, 0.3))):
    bpy.ops.object.light_add(type="AREA", location=loc); L = bpy.context.object; L.data.energy = e; L.data.size = 2.0; L.data.color = c
    L.rotation_euler = (Vector((0, 0, 0.7)) - L.location).to_track_quat("-Z", "Y").to_euler()
cd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam


def shoot(name, loc, look, lens=40):
    cam.location = loc; cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); cd.lens = lens
    sc.render.filepath = f"{OUT}/{SHOT}_check_{name}.png"; bpy.ops.render.render(write_still=True); print("FRAME", name, flush=True)


def wpos(n): return arm.matrix_world @ PB[n].head


# ----- retarget a Mixamo frame (direction matching, same idea as b3d_act.py) -----
FRONT, UP = Vector((0, -1, 0)), Vector((0, 0, 1))
def rest_ref(armobj, n):
    b = [x for x in armobj.data.bones if x.name.split(":")[-1] == n][0]
    R = (armobj.matrix_world @ b.matrix_local).to_3x3().normalized(); y = (R @ Vector((0, 1, 0))).normalized()
    ref = UP if abs(y.dot(FRONT)) > 0.7 else FRONT; ref = (ref - y * ref.dot(y)).normalized(); return R.inverted() @ ref
def basis(y, r):
    y = y.normalized(); r = (r - y * r.dot(y)).normalized(); return Matrix((y, r, y.cross(r))).transposed()


def apply_clip(fbx, frac):
    root.location.z = BASEZ
    for b in PB.values(): b.rotation_quaternion = Quaternion(); b.location = Vector()
    bpy.context.view_layer.update()
    bpy.ops.import_scene.fbx(filepath=f"{PROPS}/{fbx}", automatic_bone_orientation=False)
    src = next(o for o in bpy.context.selected_objects if o.type == "ARMATURE")
    SPB = {b.name.split(":")[-1]: b for b in src.pose.bones}
    order = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"]
    for sd in ("Left", "Right"): order += [f"{sd}Shoulder", f"{sd}Arm", f"{sd}ForeArm", f"{sd}Hand", f"{sd}UpLeg", f"{sd}Leg", f"{sd}Foot", f"{sd}ToeBase"]
    order = [n for n in order if n in PB and n in SPB]
    RS = {n: rest_ref(src, n) for n in order}; RK = {n: rest_ref(arm, n) for n in order}
    LB = {n: basis(Vector((0, 1, 0)), RK[n]) for n in order}
    hb = [x for x in src.data.bones if x.name.split(":")[-1] == "Hips"][0]; kb = [x for x in arm.data.bones if x.name.split(":")[-1] == "Hips"][0]
    smin = min((src.matrix_world @ b.head_local).z for b in src.data.bones)
    HS0 = src.matrix_world @ hb.head_local; HK0 = arm.matrix_world @ kb.head_local; ratio = HK0.z / max(1e-4, HS0.z - smin)
    c0, c1 = src.animation_data.action.frame_range; sc.frame_set(int(c0 + (c1 - c0) * frac)); bpy.context.view_layer.update()
    SW = {n: ((src.matrix_world @ SPB[n].matrix).to_3x3().normalized() @ Vector((0, 1, 0)), (src.matrix_world @ SPB[n].matrix).to_3x3().normalized() @ RS[n]) for n in order}
    hip = src.matrix_world @ SPB["Hips"].head
    for b in PB.values(): b.rotation_quaternion = Quaternion(); b.location = Vector()
    bpy.context.view_layer.update(); AW = arm.matrix_world.to_3x3().normalized().inverted()
    for n in order:
        pb = PB[n]; cur = pb.matrix.copy(); N = (AW @ (basis(*SW[n]) @ LB[n].transposed())).to_4x4()
        N.translation = (arm.matrix_world.inverted() @ (HK0 + (hip - HS0) * ratio)) if n == "Hips" else cur.translation
        pb.matrix = N; bpy.context.view_layer.update()
    for o in [src] + list(src.children): o.hide_render = True
    lowz = min(wpos(f"{sd}{p}").z for sd in ("Left", "Right") for p in ("Foot", "ToeBase")) - 0.03
    root.location.z -= lowz; bpy.context.view_layer.update()


sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
cp = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try: cp.compute_device_type = kind; cp.get_devices(); break
    except Exception: pass
for d in cp.devices: d.use = d.type != "CPU"
sc.render.resolution_percentage = SCALE; sc.render.image_settings.file_format = "PNG"
os.makedirs(OUT, exist_ok=True)

c = Vector((0, 0, H * 0.5))
shoot("front", (0, -3.4, H * 0.55), c, 40)
shoot("34", (-2.2, -2.6, H * 0.7), c, 40)
def aim(n, d_world):
    pb = PB[n]; bpy.context.view_layer.update(); M = pb.matrix.copy(); y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    d = (arm.matrix_world.to_3x3().normalized().inverted() @ Vector(d_world)).normalized()
    R = (y.rotation_difference(d).to_matrix() @ M.to_3x3()).to_4x4(); R.translation = M.translation; pb.matrix = R; bpy.context.view_layer.update()
# hands are hidden by the skirt in rest pose -> raise both arms forward to check the open hands
for sd, x in (("Right", -1), ("Left", 1)):
    aim(f"{sd}Arm", (x * 0.35, -0.75, -0.55)); aim(f"{sd}ForeArm", (x * 0.15, -0.95, -0.1)); aim(f"{sd}Hand", (x * 0.1, -0.98, -0.1))
for sd in ("Right", "Left"):
    h = wpos(f"{sd}Hand"); side = -1 if sd == "Right" else 1
    shoot(f"hand{sd[0]}", (h.x + side * 0.30, h.y - 0.40, h.z + 0.22), (h.x, h.y - 0.04, h.z), 50)
shoot("handsboth", (0.0, -1.6, H * 0.75), Vector((0, -0.2, H * 0.55)), 45)
apply_clip("mx_sitting_idle.fbx", 0.4)
bpy.ops.mesh.primitive_cube_add(size=1); seat = bpy.context.object
up = [wpos(f"{sd}UpLeg") for sd in ("Left", "Right")]; hp = wpos("Hips")
seat.scale = (0.45, 0.45, 0.04); seat.location = (hp.x, hp.y + 0.05, min(p.z for p in up) - 0.09); seat.data.materials.append(mat("seat", (0.55, 0.36, 0.22)))
c2 = Vector((hp.x, hp.y, hp.z))
shoot("sit34", (hp.x - 1.6, hp.y - 1.9, hp.z + 0.5), c2, 45); shoot("sitfront", (hp.x, hp.y - 2.2, hp.z + 0.25), c2, 45)
seat.hide_render = True
for b in PB.values(): b.rotation_quaternion = Quaternion(); b.location = Vector()
apply_clip("mx_jogging.fbx", 0.3)
hp = wpos("Hips"); shoot("run", (hp.x - 3.4, hp.y - 2.2, hp.z + 0.35), Vector((hp.x, hp.y, hp.z - 0.05)), 35)
