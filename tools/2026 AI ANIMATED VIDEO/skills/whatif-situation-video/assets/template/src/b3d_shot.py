# What if you were Ken in Ershui? - generic 3D arrival shot (Blender 5.2, Colab G4 Cycles). ASCII only.
# Usage: blender -b --factory-startup --python b3d_shot.py -- <props_dir> <out_dir> <shot> <frames|all|hand> <samples> <scale%>
# Ken walks along the building front (left -> right) to the door and turns a little to the camera.
# Camera: front-right 3/4 of Ken, Ken in the LEFT third (karaoke box sits center-right).
# (s01 was made with b3d_arrive.py; this file generalizes it for s02-s11.)
import bpy, math, os, sys, time
from mathutils import Vector, Euler, Quaternion

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, OUT, SHOT, FR, SAMPLES, SCALE = A[0], A[1], A[2], A[3], int(A[4]), int(A[5])
FPS, DUR, KEN_H = 24, 5.8, 1.35

SKY = {   # (horizon, top, world strength, sun energy, sun color, sun elevation deg, door light W)
    "rain":   ((0.66, 0.56, 0.76), (0.28, 0.27, 0.52), 1.0, 1.4, (0.78, 0.78, 1.00), 55, 380),
    "cloudy": ((0.72, 0.66, 0.80), (0.40, 0.40, 0.62), 1.1, 2.0, (0.90, 0.88, 1.00), 50, 200),
    "windy":  ((0.78, 0.80, 0.95), (0.35, 0.48, 0.85), 1.0, 2.4, (1.00, 0.96, 0.90), 40, 120),
    "cold":   ((0.70, 0.78, 0.92), (0.32, 0.40, 0.70), 1.1, 2.4, (0.85, 0.92, 1.00), 25, 220),
    "sunny":  ((0.92, 0.80, 0.78), (0.32, 0.45, 0.85), 1.0, 2.6, (1.00, 0.92, 0.80), 45, 120),
    "hot":    ((1.00, 0.78, 0.62), (0.38, 0.45, 0.82), 1.0, 2.8, (1.00, 0.88, 0.70), 60, 120),
    "sunset": ((1.00, 0.62, 0.48), (0.30, 0.25, 0.60), 1.1, 2.8, (1.00, 0.62, 0.38), 12, 420),
}
SHOTS = {  # model, height (m), sky, prop, rot (deg, turn model so its front faces -Y), door x fraction
    "s02": dict(model="bld_post", h=7.0, sky="cloudy", prop="letter"),
    "s03": dict(model="bld_school_gate", h=4.5, sky="windy", prop="ball"),
    "s04": dict(model="bld_library", h=8.0, sky="rain", prop="umbrella"),
    "s05": dict(model="bld_health", h=7.0, sky="cold", prop=None),
    "s06": dict(model="bld_bookstore", h=7.0, sky="sunny", prop=None),
    "s07": dict(model="bld_dumpling", h=6.0, sky="sunset", prop=None),
    "s08": dict(model="bld_waterpark", h=5.0, sky="sunny", prop="kite", trees=True),
    "s09": dict(model="bld_teatop", h=6.5, sky="hot", prop=None),
    "s10": dict(model="bld_pxmart", h=6.5, sky="sunny", prop=None),
    "s11": dict(model="bld_museum", h=8.0, sky="cloudy", prop=None, rot=90),
    # teacher 11/13: "You run and run" = 3D Ken RUNNING after the ball (length = s03_link + 1.0 s, same as film.js RUN_LAST)
    "s03run": dict(model="bld_school_gate", h=4.5, sky="windy", prop=None, run=True, dur=6.8),
}
# Plain boards over misspelled / brand signs (same numbers as the game's SIGN_PLATE; teacher 10/26 de-branding)
# [center height frac, height frac, width frac, color, stick-out m, cover sides?, English word]
PLATE = {
    "bld_dumpling": [0.465, 0.19, 0.98, (0.79, 0.16, 0.16), 0.3, False, "DUMPLING"],
    "bld_teatop":   [0.295, 0.14, 0.98, (0.75, 0.22, 0.17), 0.25, False, "TEA SHOP"],
    "bld_pxmart":   [0.70, 0.38, 1.03, (0.18, 0.44, 0.45), 0.2, True, "SUPERMARKET"],
}
C = SHOTS[SHOT]
DUR = C.get("dur", DUR)
C["rot"] = float(os.environ.get("ROT", C.get("rot", 0)))
C["door"] = float(os.environ.get("DOORX", C.get("door", 0.0)))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS; sc.frame_start = 0; sc.frame_end = round(DUR * FPS)
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "Standard"
try: sc.view_settings.look = "Medium High Contrast"
except Exception: pass


def empty(n, loc=(0, 0, 0)):
    e = bpy.data.objects.new(n, None); sc.collection.objects.link(e); e.location = loc; return e


def mat(n, c, r=0.5):
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r
    return m


def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=path); return list(bpy.context.selected_objects)


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
    root.scale = (s, s, s); root.rotation_euler = (0, 0, rot_z); bpy.context.view_layer.update()
    mn, mx = bbox(objs)
    root.location = (loc[0] - (mn.x + mx.x) / 2, loc[1] - (mn.y + mx.y) / 2, loc[2] - mn.z)
    bpy.context.view_layer.update()
    return root


# ---------- world ----------
hz, top, wstr, sun_e, sun_c, sun_el, door_w = SKY[C["sky"]]
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
nt = w.node_tree; bg = nt.nodes["Background"]
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); ramp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(tc.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bg.inputs[0])
ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (*hz, 1)
ramp.color_ramp.elements[1].position = 0.45; ramp.color_ramp.elements[1].color = (*top, 1)
bg.inputs[1].default_value = wstr

wet = C["sky"] == "rain"
bpy.ops.mesh.primitive_plane_add(size=160, location=(0, 0, 0)); g = bpy.context.object
g.data.materials.append(mat("ground", (0.16, 0.15, 0.28) if wet else (0.26, 0.24, 0.33), r=0.32 if wet else 0.85))

# ---------- building (front faces -Y after ROT) ----------
bo = import_glb(f"{PROPS}/{C['model']}.glb")
fit(bo, C["h"], (0, 0, 0), math.radians(C["rot"]))
mn, mx = bbox(bo); FRONT_Y = mn.y; WIDTH = mx.x - mn.x; DEPTH = mx.y - mn.y; HH = mx.z - mn.z
print("BUILDING", C["model"], "w %.1f d %.1f h %.1f" % (WIDTH, DEPTH, HH), flush=True)


def box(loc, size, m, name="box"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name
    o.scale = size; o.data.materials.append(m); return o


# sidewalk strip in front of the buildings (lighter), road beyond stays darker
box((0, FRONT_Y - 1.6, 0.04), (60, 3.4, 0.08), mat("walk", (0.32, 0.30, 0.38) if not wet else (0.22, 0.21, 0.32), 0.8 if not wet else 0.3), "sidewalk")
if C["model"] in PLATE:
    c0, ch, cw, col, out, sides, word = PLATE[C["model"]]
    pm = mat("plate", col, 0.9)
    box((0, FRONT_Y - out / 2, HH * c0), (WIDTH * cw, out + 0.05, HH * ch), pm, "plate")
    if sides:
        for sx in (-1, 1): box((sx * (WIDTH / 2 + out / 2), (mn.y + mx.y) / 2, HH * c0), (out, DEPTH * 1.02, HH * ch), pm, "plate_side")
    fnt = bpy.data.fonts.load(f"{PROPS}/ComicRelief-Bold.ttf")
    cu = bpy.data.curves.new("sign", "FONT"); cu.body = word; cu.font = fnt; cu.align_x = "CENTER"; cu.align_y = "CENTER"; cu.extrude = 0.01
    to = bpy.data.objects.new("sign", cu); sc.collection.objects.link(to)
    to.data.materials.append(mat("signtext", (1, 1, 1), 0.6))
    bpy.context.view_layer.update(); tw = max(0.01, to.dimensions.x); th = max(0.01, to.dimensions.y)
    k = min(WIDTH * cw * 0.86 / tw, HH * ch * 0.62 / th); to.scale = (k, k, k)
    to.rotation_euler = (math.radians(90), 0, 0); to.location = (0, FRONT_Y - out - 0.04, HH * c0)
# narrow shop: add simple neighbor shop houses on both sides (no text) so it looks like a street
if WIDTH < 6:
    cols = [(0.78, 0.70, 0.86), (0.95, 0.80, 0.68), (0.72, 0.86, 0.78), (0.93, 0.89, 0.78), (0.80, 0.74, 0.92), (0.96, 0.76, 0.74)]
    winm = mat("win", (0.10, 0.09, 0.18), 0.9); trim = mat("trim", (0.96, 0.94, 0.90), 0.8)
    for side in (-1, 1):
        x = side * WIDTH / 2
        for i in range(3):
            w_ = 3.2 + ((i * 7 + (side + 1)) % 3) * 0.6; h_ = 6.0 + ((i * 5 + side) % 3) * 1.2; d_ = DEPTH
            cx = x + side * (w_ / 2 + 0.05); x = x + side * (w_ + 0.1)
            box((cx, FRONT_Y + d_ / 2, h_ / 2), (w_, d_, h_), mat(f"house{side}{i}", cols[(i * 2 + (side > 0)) % len(cols)], 0.85), "house")
            box((cx, FRONT_Y - 0.06, 3.0), (w_ * 0.98, 0.14, 0.18), trim, "ledge")
            for fl in (3.8, 5.4) if h_ > 6.5 else (3.8,):
                for wx in (-0.25, 0.25):
                    box((cx + wx * w_, FRONT_Y - 0.03, fl + 0.4), (w_ * 0.28, 0.08, 0.9), winm, "window")
            box((cx, FRONT_Y - 0.03, 1.15), (w_ * 0.8, 0.08, 2.2), winm, "shopfront")
for x in (-0.25, 0.0, 0.25):
    bpy.ops.object.light_add(type="AREA", location=(x * WIDTH, FRONT_Y - 0.6, 1.6))
    L = bpy.context.object; L.data.energy = door_w; L.data.size = 2.0; L.data.color = (1.0, 0.72, 0.4)
    L.rotation_euler = (math.radians(-90), 0, 0); L.visible_glossy = False
if C.get("trees"):
    for i, (tx, ty) in enumerate(((-9, -2), (8, -1), (-14, 3), (13, 4), (-5, -14), (11, -15))):
        tobj = import_glb(f"{PROPS}/tree.glb"); fit(tobj, 5.5 + (i % 3) * 0.8, (tx, FRONT_Y + ty, 0), math.radians(i * 47))

bpy.ops.object.light_add(type="SUN", location=(0, 0, 20)); sun = bpy.context.object
sun.data.energy = sun_e; sun.data.color = sun_c; sun.data.angle = math.radians(20)
sun.rotation_euler = Euler((math.radians(90 - sun_el), 0, math.radians(-35)))

# ---------- Ken ----------
kobjs = import_glb(f"{PROPS}/ken_openhand.glb")
arm = next(o for o in kobjs if o.type == "ARMATURE")
if arm.animation_data: arm.animation_data.action = None
kroot = fit(kobjs, KEN_H, (0, 0, 0))
PB = {b.name.split(":")[-1]: b for b in arm.pose.bones}
for b in PB.values(): b.rotation_mode = "QUATERNION"

DOOR = Vector((C["door"] * WIDTH, FRONT_Y - 1.8, 0))
START = DOOR + Vector((-3.6, -0.9, 0))
T_WALK = 4.4
def ken_pos(t):
    k = min(1.0, t / T_WALK)
    k = k if k < 0.8 else 0.8 + (1 - (1 - (k - 0.8) / 0.2) ** 2) * 0.2
    return START.lerp(DOOR, k)
dv = (DOOR - START).normalized(); heading = math.atan2(dv.x, -dv.y); END_TURN = math.radians(-40)
CURL_AXIS = (0, 0, 1)


def to_arm(d_char):
    wv = kroot.matrix_world.to_3x3().normalized() @ Vector(d_char).normalized()
    return (arm.matrix_world.to_3x3().inverted() @ wv).normalized()


def aim(bone, d_char, n_char=None):
    """point the bone's Y axis along d_char; if n_char is given, also roll the bone so its palm normal points along n_char"""
    pb = PB[bone]; bpy.context.view_layer.update()
    M = pb.matrix.copy(); y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    d = to_arm(d_char)
    R = y.rotation_difference(d).to_matrix() @ M.to_3x3()
    if n_char is not None:
        n = (R @ NLOC[bone]).normalized(); want = to_arm(n_char); want = (want - d * want.dot(d)).normalized()
        ang = math.atan2(d.dot(n.cross(want)), n.dot(want))
        R = Quaternion(d, ang).to_matrix() @ R
    N = R.to_4x4(); N.translation = M.translation; pb.matrix = N


def lean(bone, deg):
    pb = PB[bone]; bpy.context.view_layer.update(); M = pb.matrix.copy()
    R = Quaternion(to_arm((1, 0, 0)), math.radians(deg)).to_matrix() @ M.to_3x3()
    N = R.to_4x4(); N.translation = M.translation; pb.matrix = N


def curl(side, deg, thumb=None):
    for f in ("Index", "Middle", "Ring", "Pinky"):
        for i in (1, 2, 3):
            b = PB.get(f"{side}Hand{f}{i}")
            if b: b.rotation_quaternion = b.rotation_quaternion @ Quaternion(CURL_AXIS, math.radians(deg))
    for i in (2, 3):
        b = PB.get(f"{side}HandThumb{i}")
        if b: b.rotation_quaternion = b.rotation_quaternion @ Quaternion((0, 0, 1), math.radians((deg * 0.5) if thumb is None else thumb))


# palm normal of each hand in its own bone space (right hand: Y x (pinky - index) points out of the palm)
bpy.context.view_layer.update()
NLOC = {}
for sd in ("Right", "Left"):
    hb = PB[f"{sd}Hand"]; M3 = hb.matrix.to_3x3()
    yv = (M3 @ Vector((0, 1, 0))).normalized(); across = PB[f"{sd}HandPinky1"].head - PB[f"{sd}HandIndex1"].head
    nv = yv.cross(across) * (1 if sd == "Right" else -1)
    NLOC[f"{sd}Hand"] = (M3.inverted() @ nv).normalized()


def hand_frame(sd="Right"):
    """world-space palm frame: (palm center, finger dir Y, palm normal N, across A = index->pinky)"""
    hb = PB[f"{sd}Hand"]; W3 = arm.matrix_world.to_3x3()
    yv = (W3 @ (hb.matrix.to_3x3() @ Vector((0, 1, 0)))).normalized()
    nv = (W3 @ (hb.matrix.to_3x3() @ NLOC[f"{sd}Hand"])).normalized()
    av = nv.cross(yv).normalized()          # index -> pinky
    i1 = arm.matrix_world @ PB[f"{sd}HandIndex1"].head; p1 = arm.matrix_world @ PB[f"{sd}HandPinky1"].head
    wrist = arm.matrix_world @ hb.head
    center = wrist.lerp((i1 + p1) / 2, 0.6)
    return center, yv, nv, av, wrist, i1


# teacher 11/13: props must really be HELD (no prop stuck inside the hand)
#   right-arm pose per prop: (upper arm dir, forearm dir, hand finger dir, palm normal dir), finger curl, thumb curl   (char coords: -X his right, -Y front, +Z up)
ARM = {
    "umbrella": ((-0.30, -0.40, -0.86), (-0.08, -0.72, 0.69), (0.0, -0.25, 0.97), None, 70, None),
    # letter: hand at the waist in front, palm toward the body, thumb on top pinches one corner; the letter sticks out of the hand
    "letter":   ((-0.20, -0.30, -0.93), (0.05, -0.90, -0.42), (0.10, -0.94, -0.33), (1.0, 0.0, 0.0), 30, 25),
    # ball: waiter pose, ONE hand palm up beside the shoulder, the ball sits on the palm
    "ball":     ((-0.80, 0.05, -0.60), (-0.10, -0.20, 0.97), (-0.55, 0.55, 0.05), (0.0, 0.0, 1.0), 12, 5),
    # kite: forearm forward, hand open (handshake), thumb + fingers pinch the kite's bottom stick; kite stands up beside him
    "kite":     ((-0.50, -0.10, -0.86), (-0.30, -0.93, -0.20), (-0.15, -0.98, 0.10), (1.0, 0.0, 0.0), 18, 10),
}


def sample_action(act, frame):
    arm.animation_data.action = act; f0 = int(math.floor(frame)); sc.frame_set(f0, subframe=frame - f0); bpy.context.view_layer.update()
    return {n: (b.rotation_quaternion.copy(), b.location.copy()) for n, b in PB.items()}


def amp(q, k):
    ax, an = q.to_axis_angle(); return Quaternion(ax, an * k)


nfr = sc.frame_end + 1
arm.animation_data_create()
walk = bpy.data.actions.get("walk"); idle = bpy.data.actions.get("idle")
w0, w1 = int(walk.frame_range[0]), int(walk.frame_range[1]); cyc = w1 - w0
i0, i1 = int(idle.frame_range[0]), int(idle.frame_range[1])
DRIFT = sample_action(walk, w1)["Hips"][1] - sample_action(walk, w0)["Hips"][1]
RUN = bool(C.get("run"))

if RUN:
    # ---------- run gait built from bone aims (the model has no run clip; amplified walk looked like kicking) ----------
    # phase ph in [0,1): right thigh swings forward/back, knee folds high while the leg swings forward,
    # arms pump opposite to the legs with elbows bent 90 deg, body leans forward; the lowest foot stays on the ground.
    arm.animation_data.action = None
    for b in PB.values(): b.rotation_quaternion = Quaternion(); b.location = Vector()
    bpy.context.view_layer.update()
    hipz = (arm.matrix_world @ PB["RightUpLeg"].head).z; ankz = (arm.matrix_world @ PB["RightFoot"].head).z
    LEGL = hipz - ankz; T_CYC = 0.66; SW = math.radians(32)
    SPEED = 2 * LEGL * math.sin(SW) / (T_CYC / 2) * 0.95
    print("WALK leg %.2f m -> run %.2f m/s" % (LEGL, SPEED), flush=True)
    PATH_Y = FRONT_Y - 2.2; X0 = -SPEED * DUR / 2 - 0.8
    def ken_pos(t): return Vector((X0 + SPEED * t, PATH_Y, 0))
    heading = math.radians(90)
    def leg(sd, ph):
        a = SW * math.sin(2 * math.pi * ph) + math.radians(6)              # thigh angle, + = forward
        f = math.radians(22 + 85 * max(0.0, math.cos(2 * math.pi * ph)))   # knee fold, big while the leg swings forward
        th = Vector((0, -math.sin(a), -math.cos(a))); sh = Vector((0, -math.sin(a - f), -math.cos(a - f)))
        aim(f"{sd}UpLeg", th); aim(f"{sd}Leg", sh); aim(f"{sd}Foot", (0, -0.55, -0.83))
    def arm_pump(sd, ph):
        lat = -0.12 if sd == "Right" else 0.12
        bb = -math.radians(38) * math.sin(2 * math.pi * ph)                 # opposite to the same-side leg
        aim(f"{sd}Arm", (lat, -math.sin(bb), -math.cos(bb)))
        fa = Vector((lat * 0.5, -math.sin(bb + math.radians(95)), -math.cos(bb + math.radians(95))))
        aim(f"{sd}ForeArm", fa); aim(f"{sd}Hand", fa); curl(sd, 55)
    for fr in range(nfr):
        t = fr / FPS; p = ken_pos(t); ph = (t / T_CYC) % 1.0
        kroot.location = (p.x, p.y, 0); kroot.rotation_euler = (0, 0, heading)
        for b in PB.values(): b.rotation_quaternion = Quaternion(); b.location = Vector()
        bpy.context.view_layer.update()
        lean("Spine", 7); lean("Spine1", 7)
        leg("Right", ph); leg("Left", (ph + 0.5) % 1.0)
        arm_pump("Right", ph); arm_pump("Left", (ph + 0.5) % 1.0)
        bpy.context.view_layer.update()
        low = min(min((arm.matrix_world @ PB[f"{sd}Foot"].head).z - ankz * 0.8, (arm.matrix_world @ PB[f"{sd}ToeBase"].head).z - 0.02) for sd in ("Right", "Left"))
        kroot.location = (p.x, p.y, kroot.location.z - low + 0.03 * max(0.0, math.sin(4 * math.pi * ph)))
        kroot.keyframe_insert("location", frame=fr); kroot.keyframe_insert("rotation_euler", frame=fr)
        for b in PB.values():
            b.keyframe_insert("rotation_quaternion", frame=fr); b.keyframe_insert("location", frame=fr)
    # the ball rolls and bounces ahead of Ken; he never quite catches it
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, segments=32, ring_count=16); ball = bpy.context.object
    ball.data.materials.append(mat("ball", (0.95, 0.45, 0.12), 0.6)); bpy.ops.object.shade_smooth()
    seam = mat("seam", (0.10, 0.06, 0.10), 0.6)
    for rx, ry in ((0, 0), (math.radians(90), 0), (0, math.radians(90))):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.121, minor_radius=0.005, rotation=(rx, ry, 0)); o = bpy.context.object
        o.data.materials.append(seam); o.parent = ball
    for fr in range(nfr):
        t = fr / FPS; p = ken_pos(t); gap = 1.7 - 0.5 * (t / DUR)
        bx = p.x + gap; h = 0.55 * (1 - 0.6 * t / DUR) * abs(math.sin(t * math.pi * 1.5))
        ball.location = (bx, PATH_Y + 0.1, 0.12 + h); ball.rotation_euler = (0, bx / 0.12, 0)
        ball.keyframe_insert("location", frame=fr); ball.keyframe_insert("rotation_euler", frame=fr)
else:
    samples = []
    for fr in range(nfr):
        sw = sample_action(walk, w0 + fr % cyc); ph = (fr % cyc) / cyc
        q, l = sw["Hips"]; sw["Hips"] = (q, l - DRIFT * ph)
        si = sample_action(idle, i0 + fr % max(1, i1 - i0))
        t = fr / FPS; wg = max(0.0, min(1.0, (t - (T_WALK - 0.3)) / 0.5)); wg = wg * wg * (3 - 2 * wg)
        samples.append({n: (sw[n][0].slerp(si[n][0], wg), sw[n][1].lerp(si[n][1], wg)) for n in PB})
    arm.animation_data.action = None
    for fr in range(nfr):
        t = fr / FPS; p = ken_pos(t)
        kroot.location = (p.x, p.y, kroot.location.z)
        turn = END_TURN * max(0.0, min(1.0, (t - T_WALK + 0.2) / 0.8))
        kroot.rotation_euler = (0, 0, heading + turn)
        kroot.keyframe_insert("location", frame=fr); kroot.keyframe_insert("rotation_euler", frame=fr)
        for n, b in PB.items():
            b.rotation_quaternion, b.location = samples[fr][n]
        bpy.context.view_layer.update()
        if C["prop"]:
            ua, fa, hy, hn, c, th = ARM[C["prop"]]
            aim("RightArm", ua); aim("RightForeArm", fa); aim("RightHand", hy, hn); curl("Right", c, th)
        for b in PB.values():
            b.keyframe_insert("rotation_quaternion", frame=fr); b.keyframe_insert("location", frame=fr)

# ---------- props (placed from the real palm frame every frame) ----------
from mathutils import Matrix
pr = None
if C["prop"] == "umbrella":
    pr = empty("umbrella")
    bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.85, location=(0, 0, 0.36)); o = bpy.context.object
    o.data.materials.append(mat("shaft", (0.12, 0.10, 0.18), 0.4)); o.parent = pr
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.62, radius2=0.0, depth=0.30, end_fill_type="NOTHING", location=(0, 0, 0.66)); o = bpy.context.object
    o.data.materials.append(mat("canopy", (0.95, 0.66, 0.12), 0.5)); o.parent = pr
    bpy.ops.object.modifier_add(type="SOLIDIFY"); o.modifiers[-1].thickness = 0.01
elif C["prop"] == "letter":
    # envelope lies in the palm plane: local X = along the fingers, local Z = across the hand, local Y = palm normal
    pr = empty("letter")
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.055, 0, -0.035)); o = bpy.context.object
    o.scale = (0.12, 0.004, 0.08); o.data.materials.append(mat("envelope", (0.97, 0.95, 0.88), 0.7)); o.parent = pr
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.085, -0.004, -0.015)); o = bpy.context.object
    o.scale = (0.025, 0.002, 0.02); o.data.materials.append(mat("stamp", (0.9, 0.3, 0.25), 0.6)); o.parent = pr
elif C["prop"] == "ball":
    pr = empty("ball")
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, segments=32, ring_count=16); o = bpy.context.object
    o.data.materials.append(mat("ball", (0.95, 0.45, 0.12), 0.6)); o.parent = pr
    bpy.ops.object.shade_smooth()
elif C["prop"] == "kite":
    # kite stands up: local Z = up (the stick), local X = sail width; the hand grips the stick 0.06 m above its bottom end
    pr = empty("kite")
    import bmesh
    me = bpy.data.meshes.new("kite"); bm = bmesh.new()
    vs = [bm.verts.new(v) for v in ((0, 0, 0.78), (0.26, 0, 0.48), (0, 0, 0.06), (-0.26, 0, 0.48))]
    bm.faces.new(vs); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("kite", me); sc.collection.objects.link(o); o.parent = pr
    o.data.materials.append(mat("kite", (0.95, 0.30, 0.35), 0.6))
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_add(type="SOLIDIFY"); o.modifiers[-1].thickness = 0.008
    stick = mat("stick", (0.55, 0.38, 0.20), 0.7)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.86, location=(0, 0.01, 0.37)); o = bpy.context.object; o.data.materials.append(stick); o.parent = pr
    bpy.ops.mesh.primitive_cylinder_add(radius=0.006, depth=0.52, location=(0, 0.01, 0.48), rotation=(0, math.radians(90), 0)); o = bpy.context.object; o.data.materials.append(stick); o.parent = pr
if pr:
    pr.rotation_mode = "QUATERNION"
    for fr in range(nfr):
        sc.frame_set(fr); bpy.context.view_layer.update()
        center, yv, nv, av, wrist, i1 = hand_frame("Right")
        if C["prop"] == "umbrella":
            hb = PB["RightHand"]; pos = arm.matrix_world @ (hb.head + (hb.tail - hb.head) * 0.55) + Vector((0, 0, 0.02))
            rot = Euler((math.radians(-6), 0, 0)).to_quaternion()
        elif C["prop"] == "letter":
            # pinch point = between the thumb and the index knuckle, a little in front of the palm
            pos = i1 + yv * 0.035 + nv * 0.012
            rot = Matrix((yv, -nv, av)).transposed().to_quaternion()
        elif C["prop"] == "ball":
            pos = center + nv * 0.135
            rot = Quaternion()
        elif C["prop"] == "kite":
            up = Vector((0, 0, 1)); fw = (yv - up * yv.dot(up)).normalized()
            pos = center + yv * 0.02 + nv * 0.03          # grip point = kite local z 0 (stick bottom 6 cm below, sail starts 6 cm above)
            rot = Matrix((fw, fw.cross(up) * -1, up)).transposed().to_quaternion()
        pr.location = pos; pr.rotation_quaternion = rot
        pr.keyframe_insert("location", frame=fr); pr.keyframe_insert("rotation_quaternion", frame=fr)

# orange rim light following Ken
bpy.ops.object.light_add(type="AREA", location=(0, 0, 0)); rim = bpy.context.object
rim.data.energy = 260; rim.data.size = 1.2; rim.data.color = (1.0, 0.55, 0.22)
rc = rim.constraints.new("TRACK_TO"); rc.target = kroot; rc.track_axis = "TRACK_NEGATIVE_Z"; rc.up_axis = "UP_Y"

# ---------- camera ----------
cd = bpy.data.cameras.new("cam"); cd.lens = 28; cd.dof.use_dof = True; cd.dof.aperture_fstop = 5.6
cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam
aimE = empty("aim"); cc = cam.constraints.new("TRACK_TO"); cc.target = aimE; cc.track_axis = "TRACK_NEGATIVE_Z"; cc.up_axis = "UP_Y"
foc = empty("foc"); cd.dof.focus_object = foc
bpy.ops.object.light_add(type="AREA", location=(0, 0, 0)); fill = bpy.context.object
fill.data.energy = 60; fill.data.size = 1.5; fill.data.color = (0.85, 0.82, 1.0); fill.parent = cam; fill.location = (0.4, 0.2, 0)
for fr in range(nfr):
    t = fr / FPS; p = ken_pos(t); k = t / DUR; ke = k * k * (3 - 2 * k)
    kc = Vector((p.x, p.y, 0.95))
    if RUN:   # tracking side shot from the front-right; Ken left of center, the ball ahead on the right
        cam.location = kc + Vector((2.2, -5.0, 0.15))
        aimE.location = kc + Vector((1.0, 0, -0.1)); foc.location = kc + Vector((0.4, 0, 0))
        rim.location = kc + Vector((-1.2, 1.6, 1.6))
    else:
        cam.location = kc + Vector((4.0 - 1.1 * ke, -4.7 - 0.3 * ke, 0.25))
        v = (kc - cam.location); v.z = 0; v.normalize(); right = Vector((v.y, -v.x, 0))
        aimE.location = kc + right * 2.1 + Vector((0, 0, 0.05))
        foc.location = kc; rim.location = kc + v * 1.8 + Vector((0, 0, 1.6))
    for o in (cam, aimE, foc, rim): o.keyframe_insert("location", frame=fr)

# ---------- matte look ----------
for m in bpy.data.materials:
    if not m.use_nodes or not m.name.startswith("tripo"): continue
    bs = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bs: continue
    for key in ("Metallic", "Roughness"):
        for l in list(bs.inputs[key].links): m.node_tree.links.remove(l)
    bs.inputs["Metallic"].default_value = 0.0; bs.inputs["Roughness"].default_value = 0.7

# ---------- render ----------
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
cp = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try: cp.compute_device_type = kind; cp.get_devices(); break
    except Exception: pass
for d in cp.devices: d.use = d.type != "CPU"
sc.render.resolution_percentage = SCALE; sc.render.image_settings.file_format = "PNG"
os.makedirs(OUT, exist_ok=True)
if FR == "hand":
    sc.frame_set(48); hb = PB["RightHand"]; palm = arm.matrix_world @ hb.head
    cam.constraints.clear(); cam.animation_data_clear(); cam.location = palm + Vector((0.55, -0.55, 0.15))
    cam.rotation_euler = (palm - cam.location).to_track_quat("-Z", "Y").to_euler(); cd.lens = 50; cd.dof.use_dof = False
    sc.render.filepath = f"{OUT}/{SHOT}_hand.png"; bpy.ops.render.render(write_still=True); print("FRAME hand", flush=True); sys.exit(0)
frs = range(nfr) if FR == "all" else [int(x) for x in FR.split(",")]
for fr in frs:
    p = f"{OUT}/f{fr:04d}.png" if FR == "all" else f"{OUT}/{SHOT}_f{fr:04d}.png"
    if FR == "all" and os.path.exists(p): continue
    sc.frame_set(fr); sc.render.filepath = p; t0 = time.time()
    bpy.ops.render.render(write_still=True); print(f"FRAME {fr} {time.time() - t0:.1f}s", flush=True)
