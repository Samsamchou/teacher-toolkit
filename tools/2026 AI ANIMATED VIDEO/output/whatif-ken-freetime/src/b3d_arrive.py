# What if you were Ken in Ershui? - 3D arrival shot (Blender 5.2, Colab G4 Cycles). ASCII only.
# Usage: blender -b --factory-startup --python b3d_arrive.py -- <props_dir> <out_dir> <shot> <frames|all|hand> <samples> <scale%>
#   frames: "0,48,96" or "all"; "hand" = close-up of the umbrella hand (grip check)
# Style I: rainy morning lavender sky, warm door light, orange rim light on Ken, navy Freestyle outline.
import bpy, math, os, sys, time
from mathutils import Vector, Euler, Quaternion, Matrix

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, OUT, SHOT, FR, SAMPLES, SCALE = A[0], A[1], A[2], A[3], int(A[4]), int(A[5])
FPS = 24
DUR = {"s01": 5.8}[SHOT]
KEN_H = 1.35            # Ken height (m)
STATION_H = 8.0         # station building height (m)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS; sc.frame_start = 0; sc.frame_end = round(DUR * FPS)
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "Standard"
try: sc.view_settings.look = "Medium High Contrast"
except Exception: pass


def empty(n, loc=(0, 0, 0)):
    e = bpy.data.objects.new(n, None); sc.collection.objects.link(e); e.location = loc; return e


def mat(n, c, r=0.5, em=None, ems=0.0):
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r
    if em:
        b.inputs["Emission Color"].default_value = (*em, 1); b.inputs["Emission Strength"].default_value = ems
    return m


def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=path)
    return list(bpy.context.selected_objects)


def bbox(objs):
    bpy.context.view_layer.update()
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for o in objs:
        if o.type != "MESH": continue
        for v in o.bound_box:
            p = o.matrix_world @ Vector(v); mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    return mn, mx


def fit(objs, height, loc, rot_z=0.0):
    mn, mx = bbox(objs); s = height / (mx.z - mn.z)
    root = empty("root_" + objs[0].name)
    for o in objs:
        if o.parent is None: o.parent = root
    root.scale = (s, s, s)
    root.location = (loc[0] - (mn.x + mx.x) / 2 * s, loc[1] - (mn.y + mx.y) / 2 * s, loc[2] - mn.z * s)
    root.rotation_euler = (0, 0, rot_z)
    bpy.context.view_layer.update()
    return root, s


# ---------- world: rainy morning sky (lavender -> gray-blue) ----------
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
nt = w.node_tree; bg = nt.nodes["Background"]
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); ramp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(tc.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bg.inputs[0])
ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.66, 0.56, 0.76, 1)
ramp.color_ramp.elements[1].position = 0.45; ramp.color_ramp.elements[1].color = (0.28, 0.27, 0.52, 1)
bg.inputs[1].default_value = 1.0

# ---------- ground: wet plaza ----------
bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 0)); g = bpy.context.object
g.data.materials.append(mat("wet", (0.16, 0.15, 0.28), r=0.32))

# ---------- station (front faces -Y) ----------
st = import_glb(f"{PROPS}/bld_station.glb")
st_root, _ = fit(st, STATION_H, (0, 0, 0))
mn, mx = bbox(st)
FRONT_Y = mn.y                     # front wall plane
print("STATION bbox", tuple(round(v, 2) for v in mn), tuple(round(v, 2) for v in mx), flush=True)
# long axis should be X (facade). If the model is rotated, turn it.
if (mx.y - mn.y) > (mx.x - mn.x) * 1.15:
    st_root.rotation_euler.z = math.radians(90); bpy.context.view_layer.update(); mn, mx = bbox(st); FRONT_Y = mn.y
    print("STATION rotated 90", flush=True)
# warm light from the doors
for x in (-0.25, 0.0, 0.25):
    bpy.ops.object.light_add(type="AREA", location=(x * (mx.x - mn.x), FRONT_Y - 0.6, 1.6))
    L = bpy.context.object; L.data.energy = 380; L.data.size = 2.5; L.data.color = (1.0, 0.72, 0.4)
    L.rotation_euler = (math.radians(-90), 0, 0); L.visible_glossy = False

# ---------- lights ----------
bpy.ops.object.light_add(type="SUN", location=(0, 0, 20)); sun = bpy.context.object
sun.data.energy = 1.4; sun.data.color = (0.78, 0.78, 1.0); sun.data.angle = math.radians(25)
sun.rotation_euler = Euler((math.radians(55), 0, math.radians(-35)))

# ---------- Ken ----------
kobjs = import_glb(f"{PROPS}/ken_openhand.glb")
arm = next(o for o in kobjs if o.type == "ARMATURE")
kmesh = [o for o in kobjs if o.type == "MESH"]
# measure rest height with no action
if arm.animation_data: arm.animation_data.action = None
kroot, ks = fit(kobjs, KEN_H, (0, 0, 0))
PB = {b.name.split(":")[-1]: b for b in arm.pose.bones}
for b in PB.values(): b.rotation_mode = "QUATERNION"

# path: Ken walks along the facade (right -> left), stops near the right-hand door, faces the camera side.
DOOR = Vector((0.12 * (mx.x - mn.x), FRONT_Y - 1.8, 0))
START = DOOR + Vector((-3.6, -0.9, 0))
T_WALK = 4.4                                            # seconds walking, then idle
def ken_pos(t):
    k = min(1.0, t / T_WALK)
    k = k if k < 0.8 else 0.8 + (1 - (1 - (k - 0.8) / 0.2) ** 2) * 0.2   # ease out at the end
    return START.lerp(DOOR, k)
dv = (DOOR - START).normalized()
heading = math.atan2(dv.x, -dv.y)                       # model faces -Y (glTF +Z)
FACE_OFF = float(os.environ.get("FACE_OFF", "0"))      # degrees, fix if the model faces another way
END_TURN = math.radians(-40)                            # at the end turn a bit toward the camera


def aim(bone, d_char):
    pb = PB[bone]; bpy.context.view_layer.update()
    M = pb.matrix.copy(); y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    wv = kroot.matrix_world.to_3x3().normalized() @ Vector(d_char).normalized()
    d = (arm.matrix_world.to_3x3().inverted() @ wv).normalized()
    R = y.rotation_difference(d).to_matrix() @ M.to_3x3()
    N = R.to_4x4(); N.translation = M.translation; pb.matrix = N


CURL_AXIS = tuple(float(x) for x in os.environ.get("CURL_AXIS", "0,0,1").split(","))
def curl_fingers(side, deg):
    for f in ("Index", "Middle", "Ring", "Pinky"):
        for i in (1, 2, 3):
            b = PB.get(f"{side}Hand{f}{i}")
            if b: b.rotation_quaternion = b.rotation_quaternion @ Quaternion(CURL_AXIS, math.radians(deg))
    for i in (2, 3):
        b = PB.get(f"{side}HandThumb{i}")
        if b: b.rotation_quaternion = b.rotation_quaternion @ Quaternion((0, 0, 1), math.radians(deg * 0.5))


def sample_action(act, frame):
    arm.animation_data.action = act
    sc.frame_set(int(frame)); bpy.context.view_layer.update()
    return {n: (b.rotation_quaternion.copy(), b.location.copy()) for n, b in PB.items()}


nfr = sc.frame_end + 1
arm.animation_data_create()
walk = bpy.data.actions.get("walk"); idle = bpy.data.actions.get("idle")
w0, w1 = int(walk.frame_range[0]), int(walk.frame_range[1]); cyc = w1 - w0
i0, i1 = int(idle.frame_range[0]), int(idle.frame_range[1])
a = sample_action(walk, w0)["Hips"][1]; b_ = sample_action(walk, w1)["Hips"][1]
DRIFT = b_ - a
print("WALK cycle", cyc, "frames; hips drift", tuple(round(v, 3) for v in DRIFT), flush=True)
samples = []
for fr in range(nfr):
    sw = sample_action(walk, w0 + fr % cyc)
    ph = (fr % cyc) / cyc
    q, l = sw["Hips"]; sw["Hips"] = (q, l - DRIFT * ph)          # remove root drift (root moves by path)
    si = sample_action(idle, i0 + fr % max(1, i1 - i0))
    t = fr / FPS; wgt = max(0.0, min(1.0, (t - (T_WALK - 0.3)) / 0.5)); wgt = wgt * wgt * (3 - 2 * wgt)
    mix = {}
    for n in PB:
        qa, la = sw[n]; qb, lb = si[n]
        mix[n] = (qa.slerp(qb, wgt), la.lerp(lb, wgt))
    samples.append(mix)
arm.animation_data.action = None
for fr in range(nfr):
    t = fr / FPS
    p = ken_pos(t)
    kroot.location = (p.x, p.y, kroot.location.z)
    turn = END_TURN * max(0.0, min(1.0, (t - T_WALK + 0.2) / 0.8))
    kroot.rotation_euler = (0, 0, heading + turn + math.radians(FACE_OFF))
    kroot.keyframe_insert("location", frame=fr); kroot.keyframe_insert("rotation_euler", frame=fr)
    for n, b in PB.items():
        q, l = samples[fr][n]; b.rotation_quaternion = q; b.location = l
    bpy.context.view_layer.update()
    # umbrella arm: upper arm out-front-down, forearm up, hand up (char coords: -X his right, -Y front, +Z up)
    aim("RightArm", (-0.30, -0.40, -0.86)); aim("RightForeArm", (-0.08, -0.72, 0.69)); aim("RightHand", (0.0, -0.25, 0.97))
    curl_fingers("Right", 70)
    for b in PB.values():
        b.keyframe_insert("rotation_quaternion", frame=fr); b.keyframe_insert("location", frame=fr)

# umbrella (mustard yellow), shaft through the right palm, kept vertical
um = empty("umbrella")
bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.85, location=(0, 0, 0.36)); sh = bpy.context.object
sh.data.materials.append(mat("shaft", (0.12, 0.10, 0.18), r=0.4)); sh.parent = um
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.62, radius2=0.0, depth=0.30, end_fill_type="NOTHING", location=(0, 0, 0.66)); ca = bpy.context.object
ca.data.materials.append(mat("canopy", (0.95, 0.66, 0.12), r=0.5)); ca.parent = um
bpy.ops.object.modifier_add(type="SOLIDIFY"); ca.modifiers[-1].thickness = 0.01
for fr in range(nfr):
    sc.frame_set(fr)
    hb = PB["RightHand"]; Mw = arm.matrix_world
    palm = Mw @ (hb.head + (hb.tail - hb.head) * 0.55)
    um.location = palm + Vector((0, 0, 0.02)); um.rotation_euler = (math.radians(-6), 0, 0)
    um.keyframe_insert("location", frame=fr); um.keyframe_insert("rotation_euler", frame=fr)

# orange rim light that follows Ken (behind-left)
bpy.ops.object.light_add(type="AREA", location=(0, 0, 0)); rim = bpy.context.object
rim.data.energy = 260; rim.data.size = 1.2; rim.data.color = (1.0, 0.55, 0.22)
rc = rim.constraints.new("TRACK_TO"); rc.target = kroot; rc.track_axis = "TRACK_NEGATIVE_Z"; rc.up_axis = "UP_Y"

# ---------- camera: low angle, keeps Ken in the right third, slow dolly ----------
cd = bpy.data.cameras.new("cam"); cd.lens = 28; cd.dof.use_dof = True; cd.dof.aperture_fstop = 5.6
cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam
aimE = empty("aim"); cc = cam.constraints.new("TRACK_TO"); cc.target = aimE; cc.track_axis = "TRACK_NEGATIVE_Z"; cc.up_axis = "UP_Y"
foc = empty("foc"); cd.dof.focus_object = foc
bpy.ops.object.light_add(type="AREA", location=(0, 0, 0)); fill = bpy.context.object
fill.data.energy = 60; fill.data.size = 1.5; fill.data.color = (0.85, 0.82, 1.0); fill.parent = cam; fill.location = (0.4, 0.2, 0)
for fr in range(nfr):
    t = fr / FPS; p = ken_pos(t); k = t / DUR; ke = k * k * (3 - 2 * k)
    kc = Vector((p.x, p.y, 0.95))
    cam.location = kc + Vector((4.0 - 1.1 * ke, -4.7 - 0.3 * ke, 0.25))
    v = (kc - cam.location); v.z = 0; v.normalize(); right = Vector((v.y, -v.x, 0))
    aimE.location = kc + right * 2.1 + Vector((0, 0, 0.05))    # look right of Ken -> Ken in the left third, door ahead on the right
    foc.location = kc; rim.location = kc - v * -1.8 + Vector((0, 0, 1.6))
    for o in (cam, aimE, foc, rim): o.keyframe_insert("location", frame=fr)

# ---------- matte look: no metal, soft roughness (closer to the flat 2D style) ----------
for m in bpy.data.materials:
    if not m.use_nodes or not m.name.startswith("tripo"): continue
    bs = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bs: continue
    for k in ("Metallic", "Roughness"):
        for l in list(bs.inputs[k].links): m.node_tree.links.remove(l)
    bs.inputs["Metallic"].default_value = 0.0; bs.inputs["Roughness"].default_value = 0.7

# ---------- render ----------
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
pr = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try: pr.compute_device_type = kind; pr.get_devices(); break
    except Exception: pass
for d in pr.devices: d.use = d.type != "CPU"
sc.render.resolution_percentage = SCALE; sc.render.image_settings.file_format = "PNG"
sc.render.film_transparent = False
for o in (kroot, um, cam, aimE, foc, rim):
    if o.animation_data and o.animation_data.action:
        pass
os.makedirs(OUT, exist_ok=True)

if FR == "hand":     # grip check: close-up camera on the right hand at mid-walk
    fr = 48; sc.frame_set(fr)
    hb = PB["RightHand"]; palm = arm.matrix_world @ hb.head
    cam.constraints.clear(); cam.location = palm + Vector((-0.55, -0.55, 0.15)); cam.animation_data_clear()
    d = (palm - cam.location); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cd.lens = 50; cd.dof.use_dof = False
    sc.render.filepath = f"{OUT}/hand.png"; bpy.ops.render.render(write_still=True); print("FRAME hand", flush=True)
    sys.exit(0)

frs = range(nfr) if FR == "all" else [int(x) for x in FR.split(",")]
for fr in frs:
    p = f"{OUT}/f{fr:04d}.png"
    if FR == "all" and os.path.exists(p): continue
    sc.frame_set(fr); sc.render.filepath = p; t0 = time.time()
    bpy.ops.render.render(write_still=True); print(f"FRAME {fr} {time.time() - t0:.1f}s", flush=True)
