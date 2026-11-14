# What if you were Ken in Ershui? (Free Time) - 3D "doing the activity" shots (Blender 5.2, Colab G4 Cycles). ASCII only.
# Usage: blender -b --factory-startup --python b3d_act.py -- <props_dir> <out_dir> <shot> <frames|all|hand|pose> <samples> <scale%>
# Ken (ken_openhand.glb) plays a Mixamo clip (X Bot, "Without Skin" FBX). Retarget = per-bone DIRECTION matching in world space
# (Ken's rest pose is not a T-pose, so copying local rotations would be wrong): each Ken bone's Y axis points where the X Bot
# bone points, and a side reference axis (world front, or up for bones that point forward) keeps the roll.
import bpy, math, os, sys, time
from mathutils import Vector, Matrix, Quaternion, Euler

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, OUT, SHOT, FR, SAMPLES, SCALE = A[0], A[1], A[2], A[3], int(A[4]), int(A[5])
# Shuiling's Free Time: same scenes/motions as the Ken film, Shuiling (shuiling_softhand.glb, 1.28 m) instead of Ken.
# ALIAS maps the Shuiling shot number -> the Ken-film shot whose set/clip/props it reuses.
CHAR = os.environ.get("CHAR", "shuiling")
ALIAS = {"s01": "s03", "s02": "s05", "s03": "s01", "s04": "s02", "s05": "s04", "s06": "s07", "s07": "s06",
         "s08": "s09", "s09": "s08", "s10": "s11", "s11": "s10"} if CHAR == "shuiling" else {}
SK = ALIAS.get(SHOT, SHOT)
FPS, KEN_H = 24, (1.28 if CHAR == "shuiling" else 1.35)
MODEL = "shuiling_softhand.glb" if CHAR == "shuiling" else "ken_openhand.glb"
SHOTS = {
    # set: room / living / library / street / lawn. clip: Mixamo FBX or "ken:idle" (Ken's own idle). sit: chair/sofa under the hips.
    # cam: camera offset from the look point (char coords x right=-, y front=-, z up), look: look-point height above the hips
    "s01": dict(set="room", clip="mx_writing.fbx", dur=5.8, sit="chair", desk=True, prop="pencil", book=True, night=False, rain=True, lift=24,
                cam=(-0.95, -1.30, 0.40), look=0.30, lens=42),
    "s02": dict(set="living", clip="mx_sitting_laughing.fbx", dur=5.8, sit="sofa", prop=None, night=True, rain=True,
                grip=(("Right", 40, 20), ("Left", 25, 10)), cam=(-2.6, -0.9, 0.55), look=0.22, look_off=(0.0, -0.8), lens=35, tv=True, feet_floor=True),
    "s05": dict(set="room", clip="ken:idle", dur=5.8, prop="recorder", night=True, lamp=True, cam=(-1.15, -1.55, 0.45), look=0.55),
    "s06": dict(set="room", clip="mx_typing.fbx", dur=5.8, sit="chair", desk=True, prop="keyboard", screen="game", headset=True, night=True, lift=18,
                grip=(("Right", 22, 10), ("Left", 22, 10)), cam=(-1.85, -0.45, 0.40), look=0.32),
    "s07": dict(set="room", clip="mx_typing.fbx", dur=5.8, sit="chair", desk=True, prop="keyboard", screen="photo", night=False, rain=True, lift=18,
                grip=(("Right", 22, 10), ("Left", 22, 10)), clip_offset=6.0, cam=(-1.85, -0.45, 0.40), look=0.32),
    "s04": dict(set="library", clip="mx_sitting_idle.fbx", dur=5.8, sit="chair", headphones=True, nod=True, prop=None,
                grip=(("Right", 25, 10), ("Left", 25, 10)), cam=(-1.25, -1.6, 0.35), look=0.32),
    "s03": dict(set="street", clip="mx_jogging.fbx", dur=5.8, prop=None, move=1.55, sky="morning",
                grip=(("Right", 32, 15), ("Left", 32, 15)), track=(0.9, -4.0, 0.25)),
    "s08": dict(set="street", clip="mx_driving.fbx", dur=5.8, prop="bike", move=2.6, sky="windy",
                grip=(("Right", 80, 28), ("Left", 80, 28)), track=(0.9, -3.3, 0.25)),
    "s09": dict(set="lawn", clip="mx_dribble.fbx", dur=5.8, prop="basketball", hoop=True, sky="sunny", ball_off=(-0.14, -0.20),
                grip=(("Right", 15, 8), ("Left", 25, 10)), cam=(-1.7, -2.4, 0.15), look=0.15),
    "s10": dict(set="lawn", clip="mx_kneeling_idle.fbx", dur=5.8, prop="camp", sky="night", night=True,
                grip=(("Right", 25, 10), ("Left", 25, 10)), cam=(-1.5, -2.1, 0.25), look=0.1),
    "s11": dict(set="lawn", clip="mx_baseball_hit.fbx", dur=5.8, prop="bat", sky="sunny", hold_pre=1.2,
                grip=(("Right", 70, 35), ("Left", 70, 35)), lens=34, hand_fr=20, clip_end=1.75),
}
C = dict(SHOTS[SK]); DUR = C["dur"]
if CHAR == "shuiling" and C["clip"] == "ken:idle": C["clip"] = "ken:walk@0"
# Shuiling's big water-drop hair hides her face from Ken's camera spots -> lower, more frontal cameras (test v1, 11/14)
CAM_OV = {"s01": dict(track=(0.9, -2.7, 0.15)), "s02": dict(cam=(-1.55, -2.05, 0.30), look=0.45),
          "s03": dict(cam=(-0.85, -1.65, 0.02), look=0.32), "s06": dict(cam=(-1.25, -1.55, 0.08), look=0.30),
          "s07": dict(cam=(-1.25, -1.55, 0.08), look=0.30), "s10": dict(cam=(-1.10, -2.60, 0.20), look=0.15, lens=35)}
if CHAR == "shuiling": C.update(CAM_OV.get(SHOT, {}))   # Shuiling's glb has only 'walk' -> hold its first frame (standing)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS; sc.frame_start = 0; sc.frame_end = round(DUR * FPS)   # 5.8 s -> f0000..f0139 like the Ken film
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "Standard"
try: sc.view_settings.look = "Medium High Contrast"
except Exception: pass
nfr = sc.frame_end + 1


def empty(n, loc=(0, 0, 0)):
    e = bpy.data.objects.new(n, None); sc.collection.objects.link(e); e.location = loc; return e


def mat(n, c, r=0.6, emit=0.0):
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r
    if emit:
        b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = emit
    return m


def box(loc, size, m, name="box", rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = name
    o.scale = size; o.data.materials.append(m); return o


def cyl(loc, r, d, m, name="cyl", rot=(0, 0, 0), v=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot); o = bpy.context.object; o.name = name
    o.data.materials.append(m); return o


def bbox(objs):
    bpy.context.view_layer.update(); mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for o in objs:
        if o.type != "MESH": continue
        for v in o.bound_box:
            p = o.matrix_world @ Vector(v); mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    return mn, mx


# ---------- Ken ----------
bpy.ops.import_scene.gltf(filepath=f"{PROPS}/{MODEL}"); kobjs = list(bpy.context.selected_objects)
arm = next(o for o in kobjs if o.type == "ARMATURE")
if arm.animation_data: arm.animation_data.action = None
mn, mx = bbox(kobjs); s = KEN_H / (mx.z - mn.z)
kroot = empty("kroot")
for o in kobjs:
    if o.parent is None: o.parent = kroot
kroot.scale = (s, s, s); bpy.context.view_layer.update()
mn, mx = bbox(kobjs); kroot.location = (-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z); bpy.context.view_layer.update()
PB = {b.name.split(":")[-1]: b for b in arm.pose.bones}
for b in PB.values(): b.rotation_mode = "QUATERNION"

bpy.context.view_layer.update()
_hb = PB["RightHand"]; _M3 = _hb.matrix.to_3x3()
_y = (_M3 @ Vector((0, 1, 0))).normalized(); _ac = PB["RightHandPinky1"].head - PB["RightHandIndex1"].head
NLOC_R = (_M3.inverted() @ _y.cross(_ac)).normalized()      # right hand: Y x (pinky - index) = out of the palm
_hl = PB["LeftHand"]; _L3 = _hl.matrix.to_3x3(); _yl = (_L3 @ Vector((0, 1, 0))).normalized()
NLOC_L = (_L3.inverted() @ -_yl.cross(PB["LeftHandPinky1"].head - PB["LeftHandIndex1"].head)).normalized()


def _rest_dir(n):
    b = [x for x in arm.data.bones if x.name.split(":")[-1] == n][0]
    return (arm.matrix_world.to_3x3() @ (b.tail_local - b.head_local)).normalized()


REST_DIR = {f"{sd}{p}": _rest_dir(f"{sd}{p}") for sd in ("Left", "Right") for p in ("Foot", "ToeBase")}


def set_hand(bone, d_char, n_char, nloc):
    """override a hand: fingers (bone Y) along d_char, palm normal along n_char (char coords: right=-X, front=-Y, up=+Z)"""
    pb = PB[bone]; bpy.context.view_layer.update(); M = pb.matrix.copy()
    KR = kroot.matrix_world.to_3x3().normalized(); A3i = arm.matrix_world.to_3x3().normalized().inverted()
    d = (A3i @ (KR @ Vector(d_char))).normalized(); n = (A3i @ (KR @ Vector(n_char))); n = (n - d * n.dot(d)).normalized()
    Bw = Matrix((d, n, d.cross(n))).transposed()
    nl = (nloc - Vector((0, 1, 0)) * nloc.y).normalized(); Bl = Matrix((Vector((0, 1, 0)), nl, Vector((0, 1, 0)).cross(nl))).transposed()
    N = (Bw @ Bl.transposed()).to_4x4(); N.translation = M.translation; pb.matrix = N; bpy.context.view_layer.update()


# ---------- Mixamo clip (X Bot armature, no skin) ----------
CLIP_KEN = C["clip"].startswith("ken:")
KPOSES = []
if CLIP_KEN:   # sample Ken's own action before anything else is keyed
    _cn = C["clip"][4:].split("@")[0]; _hold = "@" in C["clip"]
    _ka = bpy.data.actions.get(_cn) or next((a for a in bpy.data.actions if _cn in a.name.lower()), None); _k0, _k1 = int(_ka.frame_range[0]), int(_ka.frame_range[1]); arm.animation_data_create()
    for _fr in range(nfr):
        arm.animation_data.action = _ka; sc.frame_set(_k0 if _hold else _k0 + _fr % max(1, _k1 - _k0)); bpy.context.view_layer.update()
        KPOSES.append({n: (b.rotation_quaternion.copy(), b.location.copy()) for n, b in PB.items()})
    arm.animation_data.action = None
bpy.ops.import_scene.fbx(filepath=f"{PROPS}/{'mx_sitting_idle.fbx' if CLIP_KEN else C['clip']}", automatic_bone_orientation=False)
src = next(o for o in bpy.context.selected_objects if o.type == "ARMATURE")
for o in bpy.context.selected_objects:
    if o.type == "MESH": o.hide_render = True
SPB = {b.name.split(":")[-1]: b for b in src.pose.bones}
act = src.animation_data.action; c0, c1 = act.frame_range; CLIP_FPS = 30.0
print("CLIP", C["clip"], "frames", c0, c1, "bones", len(SPB), flush=True)

ORDER = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"]
for sd in ("Left", "Right"):
    ORDER += [f"{sd}Shoulder", f"{sd}Arm", f"{sd}ForeArm", f"{sd}Hand"]
    # fingers are NOT copied from X Bot (they twist on Ken's cartoon hands) -> fixed grip below
for sd in ("Left", "Right"):
    ORDER += [f"{sd}UpLeg", f"{sd}Leg", f"{sd}Foot", f"{sd}ToeBase"]
ORDER = [n for n in ORDER if n in PB and n in SPB]
FRONT, UP = Vector((0, -1, 0)), Vector((0, 0, 1))


def rest_ref(armobj, n):
    """bone rest Y dir (world) and a side reference expressed in the bone's local frame"""
    R = (armobj.matrix_world @ armobj.data.bones[[b.name for b in armobj.data.bones if b.name.split(":")[-1] == n][0]].matrix_local).to_3x3().normalized()
    y = (R @ Vector((0, 1, 0))).normalized()
    ref = UP if abs(y.dot(FRONT)) > 0.7 else FRONT
    ref = (ref - y * ref.dot(y)).normalized()
    return R.inverted() @ ref


REF_S = {n: rest_ref(src, n) for n in ORDER}
REF_K = {n: rest_ref(arm, n) for n in ORDER}
# hips height ratio (rest) for the root translation
def rest_head_w(armobj, n):
    b = [x for x in armobj.data.bones if x.name.split(":")[-1] == n][0]; return armobj.matrix_world @ b.head_local
smin = min((src.matrix_world @ b.head_local).z for b in src.data.bones)
HIP_S0 = rest_head_w(src, "Hips"); HIP_K0 = rest_head_w(arm, "Hips")
RATIO = (HIP_K0.z - 0.0) / max(1e-4, HIP_S0.z - smin)
print("RATIO", round(RATIO, 3), "ken hip", round(HIP_K0.z, 3), flush=True)


def basis(y, r):
    y = y.normalized(); r = (r - y * r.dot(y)).normalized(); z = y.cross(r)
    return Matrix((y, r, z)).transposed()   # columns: y, r, z


AW3 = arm.matrix_world.to_3x3().normalized(); AW3i = AW3.inverted()
LOCAL_B = {n: basis(Vector((0, 1, 0)), REF_K[n]) for n in ORDER}


def pose_frame(sf):
    sc.frame_set(int(math.floor(sf)), subframe=sf - math.floor(sf)); bpy.context.view_layer.update()
    SW = {}
    for n in ORDER:
        M3 = (src.matrix_world @ SPB[n].matrix).to_3x3().normalized()
        SW[n] = (M3 @ Vector((0, 1, 0)), M3 @ REF_S[n])
    hip = src.matrix_world @ SPB["Hips"].head
    for b in PB.values(): b.rotation_quaternion = Quaternion(); b.location = Vector(); b.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    for n in ORDER:
        pb = PB[n]; Mcur = pb.matrix.copy()
        Rw = basis(*SW[n]) @ LOCAL_B[n].transposed()
        N = (AW3i @ Rw).to_4x4()
        if n == "Hips":
            want = HIP_K0 + (hip - HIP_S0) * RATIO
            N.translation = arm.matrix_world.inverted() @ want
        else:
            N.translation = Mcur.translation
        pb.matrix = N; bpy.context.view_layer.update()


def wp(n, tail=False):
    return arm.matrix_world @ (PB[n].tail if tail else PB[n].head)


def rot_world(n, q):
    """rotate pose bone n about its head by world quaternion q"""
    pb = PB[n]; M = pb.matrix.copy(); A3 = arm.matrix_world.to_3x3().normalized()
    R = (A3.inverted() @ q.to_matrix() @ A3) @ M.to_3x3(); N = R.to_4x4(); N.translation = M.translation; pb.matrix = N
    bpy.context.view_layer.update()


def ccd(chain, target, iters=8, maxdeg=25):
    """cyclic coordinate descent: bend the finger chain so its tip reaches target (world)"""
    for _ in range(iters):
        for n in reversed(chain):
            h = wp(n); tip = wp(chain[-1], True)
            a, c = tip - h, target - h
            if a.length < 1e-5 or c.length < 1e-5: continue
            q = a.rotation_difference(c); ang = min(q.angle, math.radians(maxdeg))
            if ang < 1e-4: continue
            rot_world(n, Quaternion(q.axis, ang))
        if (wp(chain[-1], True) - target).length < 0.003: break


def curl_hand(sd, deg, th):
    for f in ("Index", "Middle", "Ring", "Pinky"):
        for i in (1, 2, 3):
            bb = PB.get(f"{sd}Hand{f}{i}")
            if bb: bb.rotation_quaternion = bb.rotation_quaternion @ Quaternion((0, 0, 1), math.radians(deg[f] if isinstance(deg, dict) else deg))
    for i in (2, 3):
        bb = PB.get(f"{sd}HandThumb{i}")
        if bb: bb.rotation_quaternion = bb.rotation_quaternion @ Quaternion((0, 0, 1), math.radians(th))
    bpy.context.view_layer.update()


def head_frame():
    """world centre, up, front, side(his left) and radius of Ken's head"""
    h0 = wp("Head"); top = wp("HeadTop_End") if "HeadTop_End" in PB else wp("Head", True)
    A3 = arm.matrix_world.to_3x3().normalized(); H3 = A3 @ PB["Head"].matrix.to_3x3()
    up = (top - h0).normalized(); KR = kroot.matrix_world.to_3x3().normalized()
    fr_ = KR @ Vector((0, -1, 0))
    fr_ = (fr_ - up * fr_.dot(up)).normalized(); side = fr_.cross(up).normalized()   # side = his RIGHT
    L = (top - h0).length
    return h0 + up * L * 0.55, up, fr_, side, L * 0.95   # Ken's cartoon head is big: centre ~55% up, radius ~ head height


def recorder_geom():
    """recorder from the lips, pointing down-forward (teacher: both hands on it, fingers on the holes)"""
    c, up, fw, side, r = head_frame(); h0 = wp("Head"); L = r / 0.95
    mouth = h0 + up * L * 0.18 + fw * L * 0.80
    ax = (fw * 0.70 - up * 0.71).normalized()   # ~45 deg forward-down like a real player
    return mouth, ax, fw, side


def aimw(n, d_world):
    """point bone n's Y axis along d_world (minimal rotation about its head)"""
    bpy.context.view_layer.update(); y = (wp(n, True) - wp(n)).normalized()
    if y.length < 1e-6 or d_world.length < 1e-6: return
    rot_world(n, y.rotation_difference(d_world.normalized()))


def two_bone(upper, fore, wrist, pole):
    """analytic 2-bone IK: shoulder->elbow->wrist reaches `wrist`, elbow bends toward `pole` (world direction)"""
    S = wp(upper); l1 = (wp(upper, True) - S).length; l2 = (wp(fore, True) - wp(fore)).length
    d = wrist - S; L = max(1e-4, min(d.length, (l1 + l2) * 0.999)); dn = d.normalized()
    a = (l1 * l1 + L * L - l2 * l2) / (2 * L)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    pv = (pole - dn * pole.dot(dn)).normalized()
    E = S + dn * a + pv * h
    aimw(upper, E - S); aimw(fore, (S + dn * L) - wp(fore))


# soprano recorder (kid scale): distances from the lip along the body (m)
REC_HOLES = {"Left": [0.118, 0.143, 0.168], "Right": [0.203, 0.228, 0.253, 0.278]}
REC_THUMB = {"Left": 0.118, "Right": 0.215}


def recorder_frame():
    """mouthpiece at the lips; body ~45 deg to the body (down-forward); fn = the front face with the holes (away from Ken)"""
    mouth, ax, fw, side = recorder_geom()
    up = Vector((0, 0, 1)); fn = (up - ax * up.dot(ax)).normalized()
    return mouth, ax, fn, side


def recorder_pose():
    """correct recorder hold (method books / recorder teachers):
    LEFT hand on top: left thumb on the back thumb hole, index/middle/ring pads on front holes 1-3;
    RIGHT hand below: index..little pads on holes 4-7, right thumb behind between holes 4 and 5 supporting it;
    from the front you see the backs of both hands, fingers lying across the front of the recorder; palms face Ken;
    recorder ~45 deg to the body; shoulders relaxed, elbows hang down and a little out."""
    mouth, ax, fn, side = recorder_frame(); left = -side
    KRi = kroot.matrix_world.to_3x3().normalized().inverted(); tc = lambda v: tuple(KRi @ v)
    for sd, outw in (("Left", left), ("Right", side)):
        holes = REC_HOLES[sd]; mid = mouth + ax * (sum(holes) / len(holes))
        # fingers lie ACROSS the front of the recorder, gently curved (not a fist): the knuckles sit one finger-length
        # outside the holes, the wrist a palm-length further out; the forearm comes up from the relaxed elbow
        HL = (wp(f"{sd}HandMiddle1") - wp(f"{sd}Hand")).length
        FL = sum((wp(f"{sd}HandMiddle{i}", True) - wp(f"{sd}HandMiddle{i}")).length for i in (1, 2, 3))
        fdir = (-outw * 0.96 - fn * 0.16 + ax * 0.10).normalized()
        knuck = mid + fn * 0.020 - fdir * (FL * 0.86)
        wrist = knuck - fdir * HL
        two_bone(f"{sd}Arm", f"{sd}ForeArm", wrist, Vector((0, 0, -1)) + outw * 0.30 - fn * 0.30)   # elbows hang down, a little out
        set_hand(f"{sd}Hand", tc(fdir), tc(-fn), NLOC_L if sd == "Left" else NLOC_R)
        fingers = ("Index", "Middle", "Ring") if sd == "Left" else ("Index", "Middle", "Ring", "Pinky")
        for k, f in enumerate(fingers):   # finger PADS on the holes (front surface)
            ccd([f"{sd}Hand{f}1", f"{sd}Hand{f}2", f"{sd}Hand{f}3"], mouth + ax * holes[k] + fn * 0.010 + outw * 0.004, iters=10, maxdeg=18)
        ccd([f"{sd}HandThumb1", f"{sd}HandThumb2", f"{sd}HandThumb3"], mouth + ax * REC_THUMB[sd] - fn * 0.012, iters=10, maxdeg=18)
        if sd == "Left": curl_hand("Left", {"Index": 0, "Middle": 0, "Ring": 0, "Pinky": 35}, 0)   # left little finger rests, no hole


def KRv(v):
    """char coords (right=-X, front=-Y, up=+Z) -> world direction"""
    return kroot.matrix_world.to_3x3().normalized() @ Vector(v)


def tcw(v):
    """world direction -> char coords tuple (for set_hand)"""
    return tuple(kroot.matrix_world.to_3x3().normalized().inverted() @ Vector(v))


def tripod_geom():
    """teacher 11/14: real dynamic tripod, built from the hand frame only (stable, independent of the finger IK):
    the shaft rests in the WEB SPACE on the radial (thumb) side of the index knuckle, OUTSIDE the hand, and runs from there
    forward/palm-ward beside the index finger down to the paper; above the web it rises back over the wrist side,
    i.e. toward the writer's right shoulder (never toward the face, never through the hand).
    returns pinch point P (about 2 cm above the tip), pencil direction u (tip -> top), pn, ac, fd"""
    A3 = arm.matrix_world.to_3x3().normalized(); H3 = A3 @ PB["RightHand"].matrix.to_3x3()
    fd = (H3 @ Vector((0, 1, 0))).normalized(); pn = (H3 @ NLOC_R).normalized()
    ac = (wp("RightHandPinky1") - wp("RightHandIndex1")); ac = (ac - fd * ac.dot(fd) - pn * ac.dot(pn)).normalized()
    u = (-fd * 0.72 - pn * 0.66 - ac * 0.10).normalized()                 # up and back along the hand, a little radial
    W = wp("RightHandIndex1") - ac * 0.019 - pn * 0.006                   # web space: beside the index knuckle, on the skin
    P = W - u * 0.038
    d_ = P - wp("RightHandThumb1"); reach = 0.076                     # Ken's thumb is short: slide the pencil toward the web until the thumb pad reaches it
    if d_.length > reach:
        sh_ = -d_.normalized() * (d_.length - reach) - pn * 0.004       # ... and keep it on the back (dorsal) side of the web
        P = P + sh_; W = W + sh_
    return P, u, pn, ac, fd


PENDBG = []


def tripod():
    P, u, pn, ac, fd = tripod_geom()
    ccd(["RightHandIndex1", "RightHandIndex2", "RightHandIndex3"], P + ac * 0.009 - pn * 0.004 + u * 0.004, iters=12, maxdeg=20)   # index pad on top (ulnar-dorsal side)
    ccd(["RightHandThumb1", "RightHandThumb2", "RightHandThumb3"], P - ac * 0.008 + pn * 0.004 + u * 0.004, iters=24, maxdeg=35)   # thumb pad on the radial side
    ccd(["RightHandMiddle1", "RightHandMiddle2", "RightHandMiddle3"], P + ac * 0.007 + pn * 0.011 - u * 0.008, iters=12, maxdeg=20)  # pencil rests on the middle finger
    if not PENDBG:
        PENDBG.append(1); axd = lambda q: ((q - P) - u * (q - P).dot(u)).length
        print("PENCIL dist to axis: thumb %.3f index %.3f middle %.3f | thumb chain %.3f, base->P %.3f" % (
            axd(wp("RightHandThumb3", True)), axd(wp("RightHandIndex3", True)), axd(wp("RightHandMiddle3", True)),
            sum((wp(f"RightHandThumb{i}", True) - wp(f"RightHandThumb{i}")).length for i in (1, 2, 3)), (P - wp("RightHandThumb1")).length), flush=True)


SIT = {}


def sit_feet_floor():
    """teacher 11/14: sit on the sofa with both feet hanging down, flat on the floor (ankles fixed in space)"""
    if not SIT:
        for sd, sx in (("Left", 1), ("Right", -1)):
            aimw(f"{sd}UpLeg", KRv((sx * 0.12, -1.0, -0.05)))      # thighs forward, a little apart
            aimw(f"{sd}Leg", KRv((sx * 0.02, -0.04, -1.0)))        # shins straight down
            bpy.context.view_layer.update(); SIT[sd] = wp(f"{sd}Foot").copy()
    for sd, sx in (("Left", 1), ("Right", -1)):
        two_bone(f"{sd}UpLeg", f"{sd}Leg", SIT[sd], KRv((sx * 0.1, -1.0, 0.7)))
        aimw(f"{sd}Foot", REST_DIR[f"{sd}Foot"]); aimw(f"{sd}ToeBase", REST_DIR[f"{sd}ToeBase"])


BIKE = {}
BIKE_W = 2 * math.pi * 1.05          # crank speed (rad/s)


def bike_setup():
    """design the bike from Ken's own measurements (called once, after the lean). World coords before the rig; Ken faces -Y.
    Real layout: saddle under the hips, bottom bracket below and IN FRONT of the saddle (feet pedal forward),
    head tube + fork to the front wheel, stem and swept-back handlebar joined to the head tube."""
    H = wp("Hips").copy(); hipj = (wp("LeftUpLeg") + wp("RightUpLeg")) / 2
    LEG = (wp("LeftUpLeg", True) - wp("LeftUpLeg")).length + (wp("LeftLeg", True) - wp("LeftLeg")).length
    AL = (wp("LeftArm", True) - wp("LeftArm")).length + (wp("LeftForeArm", True) - wp("LeftForeArm")).length
    CR, r = 0.085, 0.24
    bby = hipj.y - 0.15                                             # bottom bracket 15 cm in front of the hip joints
    dz = -math.sqrt(max(0.01, (0.93 * LEG) ** 2 - 0.12 ** 2))      # leg almost straight at the bottom of the stroke
    bb = Vector((H.x, bby, hipj.z + dz + CR - 0.055))
    ground = bb.z - 0.26
    S_ = (wp("LeftArm") + wp("RightArm")) / 2; sw = abs(wp("LeftArm").x - H.x)
    WOFF = Vector((0, 0.04, 0.045)); gz = H.z + 0.13
    tz = gz + WOFF.z - S_.z; tx = 0.17 - sw
    gy = S_.y - math.sqrt(max(0.01, (0.88 * AL) ** 2 - tz * tz - tx * tx)) - WOFF.y
    head_top = Vector((H.x, gy - 0.16, gz - 0.10)); dh = Vector((0, -0.342, -0.940))
    front = head_top + dh * ((head_top.z - (ground + r)) / 0.940)
    BIKE.update(H=H, hipj=hipj, bb=bb, ground=ground, r=r, CR=CR, WOFF=WOFF,
                gripL=Vector((H.x + 0.17, gy, gz)), gripR=Vector((H.x - 0.17, gy, gz)),
                head_top=head_top, head_bot=head_top + dh * 0.13, front=front,
                rear=Vector((H.x, bb.y + 0.40, ground + r)), saddle=Vector((H.x, hipj.y + 0.03, hipj.z - 0.085)))
    print("BIKE leg %.3f arm %.3f bb %s front %s grip %s" % (LEG, AL, tuple(round(v, 2) for v in bb), tuple(round(v, 2) for v in front), tuple(round(v, 2) for v in BIKE["gripL"])), flush=True)


def bike_pedal(sd, t):
    a = BIKE_W * t + (0.0 if sd == "Left" else math.pi)            # a grows: forward -> down -> back -> up = pedalling FORWARD
    dx = 0.085 if sd == "Left" else -0.085
    return BIKE["bb"] + Vector((dx, -math.cos(a) * BIKE["CR"], -math.sin(a) * BIKE["CR"]))


def bike_pose(t):
    lat_ = KRv((1, 0, 0))
    rot_world("Spine", Quaternion(lat_, math.radians(15))); rot_world("Spine1", Quaternion(lat_, math.radians(12)))   # lean to the bar
    rot_world("Neck", Quaternion(lat_, math.radians(8)))                                                               # eyes on the road
    if not BIKE: bike_setup()
    for sd, grip, outw in (("Left", BIKE["gripL"], Vector((1, 0, 0))), ("Right", BIKE["gripR"], Vector((-1, 0, 0)))):
        two_bone(f"{sd}Arm", f"{sd}ForeArm", grip + BIKE["WOFF"], Vector((0, 0.2, -1.0)) + outw * 0.5)
        set_hand(f"{sd}Hand", (0, -0.90, -0.43), (0, -0.43, -0.90), NLOC_L if sd == "Left" else NLOC_R)   # palm on top of the grip
    for sd, sx in (("Left", 1), ("Right", -1)):
        ped = bike_pedal(sd, t)
        two_bone(f"{sd}UpLeg", f"{sd}Leg", ped + Vector((0, 0.03, 0.055)), Vector((sx * 0.12, -1.0, 0.5)))   # knees forward
        aimw(f"{sd}Foot", REST_DIR[f"{sd}Foot"]); aimw(f"{sd}ToeBase", REST_DIR[f"{sd}ToeBase"])


DRIB = dict(T=0.72, R=0.105)


def dribble_state(t, sh, floor):
    """ball centre height and whether the palm is on the ball. One cycle: palm pushes the ball down (contact) ->
    ball falls to the floor -> bounces back up -> palm meets it and rides up with it (contact)."""
    R = DRIB["R"]; ph = (t / DRIB["T"]) % 1.0
    hi = sh.z - 0.10 - R; lo = sh.z - 0.21 - R; fl = floor + R
    if ph < 0.28:
        k = ph / 0.28; return hi + (lo - hi) * (k * k * (3 - 2 * k)), True
    if ph < 0.50:
        k = (ph - 0.28) / 0.22; return lo + (fl - lo) * k * k, False
    if ph < 0.72:
        k = (ph - 0.50) / 0.22; return fl + (lo - fl) * (1 - (1 - k) * (1 - k)), False
    k = (ph - 0.72) / 0.28; return lo + (hi - lo) * (k * k * (3 - 2 * k)), True


def dribble_ball(t, floor):
    sh = wp("RightArm")
    if "xy" not in DRIB:
        kn = wp("RightLeg"); ft = wp("RightFoot"); hp_ = wp("RightUpLeg")
        print("DRIB sh %s hip %s knee %s foot %s" % tuple(tuple(round(v, 2) for v in q) for q in (sh, hp_, kn, ft)), flush=True)
        dx_, dy_ = C.get("ball_off", (-0.05, -0.18)); DRIB["xy"] = (sh.x + dx_, sh.y + dy_)
    z, on = dribble_state(t, sh, floor)
    return Vector((DRIB["xy"][0], DRIB["xy"][1], z)), on, sh


def dribble_pose(t):
    """teacher 11/14: the right palm must really be ON the ball while it pushes it down and when the ball comes back"""
    if "floor" not in DRIB:
        DRIB["floor"] = min(wp(f"{sd}{p}").z for sd in ("Left", "Right") for p in ("Foot", "ToeBase")) - 0.03
    c, on, sh = dribble_ball(t, DRIB["floor"]); R = DRIB["R"]
    palm = c + Vector((0, 0, R + 0.004)) if on else Vector((c.x, c.y, sh.z - 0.21 + 0.004))   # waits where the ball will return
    fdw = KRv((0.12, -0.95, -0.28)).normalized()
    HLc = (wp("RightHandMiddle1") - wp("RightHand")).length * 0.6
    two_bone("RightArm", "RightForeArm", palm - fdw * HLc + Vector((0, 0, 0.012)), KRv((-0.6, 0.7, 0.2)))
    set_hand("RightHand", (0.12, -0.95, -0.28), (0.0, -0.10, -1.0), NLOC_R)      # palm faces down onto the ball
    curl_hand("Right", 14, 6)


def bat_geom():
    """the bat lies across the bottom (left) palm, from the little-finger side out through the thumb side"""
    A3 = arm.matrix_world.to_3x3().normalized(); H3 = A3 @ PB["LeftHand"].matrix.to_3x3()
    pnL = (H3 @ NLOC_L).normalized()
    a = (wp("LeftHandIndex1") - wp("LeftHandPinky1")); a = (a - pnL * a.dot(pnL)).normalized()
    Lc = wp("LeftHand") * 0.4 + wp("LeftHandMiddle1") * 0.6
    return Lc + pnL * 0.022, a, pnL


def bat_pose():
    """teacher 11/14: BOTH hands hold the bat. The top (right) hand grips one fist above the left hand; it wraps the handle
    from the side its forearm comes from, so the wrist stays straight."""
    axis0, a, pnL = bat_geom()
    bp = axis0 + a * 0.085
    HLc = (wp("RightHandMiddle1") - wp("RightHand")).length * 0.6
    f = (bp - wp("RightArm")).normalized()
    for _ in range(3):
        fdR = (f - a * f.dot(a)).normalized(); pnR = a.cross(fdR)
        two_bone("RightArm", "RightForeArm", bp - pnR * 0.022 - fdR * HLc, Vector((0, 0, -1)) + KRv((-0.4, 0, 0)))
        f = (wp("RightForeArm", True) - wp("RightForeArm")).normalized()
    set_hand("RightHand", tcw(fdR), tcw(pnR), NLOC_R)


def shot_edits(fr, t):
    if C.get("lift"):   # Ken's arms are shorter than X Bot's -> hands end at lap height; swing the upper arms forward/up
        lat = kroot.matrix_world.to_3x3().normalized() @ Vector((1, 0, 0))
        rot_world("RightArm", Quaternion(lat, -math.radians(C["lift"])))
        rot_world("LeftArm", Quaternion(lat, -math.radians(C["lift"] * (0.55 if C.get("book") else 1.0))))
    if C.get("book"): set_hand("LeftHand", (-0.35, -0.90, -0.25), (0.0, 0.05, -1.0), NLOC_L)   # left palm flat on the book
    if C.get("prop") == "pencil":
        set_hand("RightHand", (0.30, -0.88, -0.36), (0.72, 0.12, -0.68), NLOC_R)   # ~45 deg pronated: rests on the little-finger edge
        curl_hand("Right", {"Index": 34, "Middle": 44, "Ring": 84, "Pinky": 88}, 10); curl_hand("Left", 8, 5)
        tripod()
    elif C.get("prop") == "keyboard":   # typing: palms down over the keys, fingers gently curved
        set_hand("RightHand", (0.10, -0.95, -0.30), (0.0, 0.0, -1.0), NLOC_R); set_hand("LeftHand", (-0.10, -0.95, -0.30), (0.0, 0.0, -1.0), NLOC_L)
        for sd, deg, th in C.get("grip", ()): curl_hand(sd, deg, th)
    elif C.get("prop") == "recorder":
        if fr == 0: print("SCALE pre", [tuple(round(v, 2) for v in PB[n].matrix.to_scale()) for n in ("LeftArm", "LeftForeArm", "LeftHand")], [round(v, 3) for v in KPOSES[0]["LeftArm"][1]], flush=True)
        recorder_pose()
        if fr % 10 == 0:
            for _n, _b in PB.items():
                _m = [v for row in _b.matrix for v in row]
                if any(v != v or abs(v) > 50 for v in _m): print("BADBONE", fr, _n, [round(v, 2) for v in _b.rotation_quaternion], flush=True)
        if fr == 0: print("SCALE post", [tuple(round(v, 2) for v in PB[n].matrix.to_scale()) for n in ("LeftArm", "LeftForeArm", "LeftHand")], [tuple(round(v, 3) for v in PB[n].scale) for n in ("LeftArm", "LeftHand")], flush=True)
    else:
        for sd, deg, th in C.get("grip", (("Right", 15, 8), ("Left", 15, 8))): curl_hand(sd, deg, th)
    if C.get("prop") == "bike": bike_pose(t)
    if C.get("feet_floor"): sit_feet_floor()
    if C.get("prop") == "basketball": dribble_pose(t)
    if C.get("prop") == "bat": bat_pose()
    if C.get("nod"):   # listening to music: gentle head nod
        lat = kroot.matrix_world.to_3x3().normalized() @ Vector((1, 0, 0))
        rot_world("Head", Quaternion(lat, math.radians(6) * math.sin(t * 2 * math.pi * 1.6)))


arm.animation_data_create()
src_len = (c1 - c0) / CLIP_FPS
for fr in range(nfr):
    t = fr / FPS
    if CLIP_KEN:
        for n, b in PB.items(): b.rotation_quaternion, b.location = KPOSES[fr][n]; b.scale = (1, 1, 1)   # Ken's idle clip carries scale keys -> reset
        bpy.context.view_layer.update()
        if fr % 10 == 0:
            for _n, _b in PB.items():
                _m = [v for row in _b.matrix for v in row]
                if any(v != v or abs(v) > 50 for v in _m): print("BADKP", fr, _n, [round(v, 2) for v in _b.rotation_quaternion], [round(v, 2) for v in _b.location], flush=True)
    else:
        if C.get("hold_pre") is not None: tclip = min(max(t - C["hold_pre"], 0.0), C.get("clip_end", src_len - 2.0 / CLIP_FPS))
        else: tclip = (t + C.get("clip_offset", 0.0)) % src_len
        sf = c0 + tclip * CLIP_FPS
        pose_frame(sf)
    shot_edits(fr, t)
    for b in PB.values():
        b.keyframe_insert("rotation_quaternion", frame=fr); b.keyframe_insert("location", frame=fr); b.keyframe_insert("scale", frame=fr)
src.animation_data.action = None
print("RETARGET done", nfr, flush=True)

# ---------- place Ken so his feet touch the floor (frame 0) ----------
sc.frame_set(0); bpy.context.view_layer.update()
if C.get("prop") == "bike":
    low = BIKE["ground"]                 # wheels on the road, feet on the pedals
else:
    feet = [arm.matrix_world @ PB[f"{sd}{p}"].head for sd in ("Left", "Right") for p in ("Foot", "ToeBase")]
    low = min(p.z for p in feet) - 0.03
kroot.location.z -= low; bpy.context.view_layer.update()
for _k, _v in list(BIKE.items()):
    if isinstance(_v, Vector) and _k != "WOFF": BIKE[_k] = _v - Vector((0, 0, low))
if BIKE: BIKE["ground"] = 0.0
RIG = empty("rig"); kroot.parent = RIG; kroot.matrix_parent_inverse = RIG.matrix_world.inverted(); bpy.context.view_layer.update()
hips = arm.matrix_world @ PB["Hips"].head
hands = [arm.matrix_world @ PB[f"{sd}Hand"].head for sd in ("Left", "Right")]
upl = [arm.matrix_world @ PB[f"{sd}UpLeg"].head for sd in ("Left", "Right")]
print("HIPS", tuple(round(v, 2) for v in hips), "HANDS", [tuple(round(v, 2) for v in h) for h in hands], flush=True)



PAPER = {}


def pencil_axis():
    """pencil tip = where the pencil line meets the paper (so the tip always touches it), direction tip -> top"""
    P, u, pn, ac, fd = tripod_geom()
    zp = PAPER.get("z", P.z - 0.02)
    d_ = max(0.012, min(0.04, (P.z - zp) / max(0.3, u.z)))
    return P - u * d_, u


# ---------- sets ----------
wood = mat("wood", (0.55, 0.36, 0.22), 0.55); wall = mat("wall", (0.62, 0.56, 0.80), 0.9); trim = mat("trim", (0.95, 0.93, 0.90), 0.8)
floor = mat("floor", (0.45, 0.30, 0.22), 0.5)
NIGHT = C.get("night", False); SET = C["set"]


def window(x, y, z, w_, h_, emit):
    box((x, y, z), (w_, 0.02, h_), mat("glass", (0.36, 0.46, 0.78) if not NIGHT else (0.10, 0.12, 0.30), 0.2, emit=emit), "window")
    for dx in (-w_ / 2, w_ / 2): box((x + dx, y - 0.02, z), (0.06, 0.06, h_ + 0.1), trim, "frame")
    box((x, y - 0.02, z - h_ / 2), (w_ + 0.1, 0.08, 0.06), trim, "sill"); box((x, y - 0.02, z + h_ / 2), (w_ + 0.1, 0.06, 0.06), trim, "frame_t")
    box((x, y - 0.02, z), (0.04, 0.04, h_), trim, "mullion")
    bpy.ops.object.light_add(type="AREA", location=(x, y - 0.35, z)); wl = bpy.context.object
    wl.data.energy = 35 if not NIGHT else 6; wl.data.size = w_; wl.data.color = (0.6, 0.7, 1.0); wl.rotation_euler = (math.radians(90), 0, 0)


if SET in ("room", "living"):
    beige = mat("wall2", (0.70, 0.62, 0.52), 0.9)
    box((0, 0, -0.01), (6, 6, 0.02), floor, "floor")
    box((0, 1.6, 1.4), (6, 0.1, 2.8), beige if SET == "living" else wall, "backwall")
    box((2.2, 0, 1.4), (0.1, 6, 2.8), beige if SET == "living" else wall, "sidewall")
    window(-0.6, 1.54, 1.55, 1.3, 1.0, 0.35 if not NIGHT else 0.15)
if SET == "room":
    box((1.6, 0.6, 0.25), (1.1, 1.9, 0.5), mat("bed", (0.32, 0.30, 0.62), 0.9), "bed")
    box((1.6, 0.6, 0.55), (1.0, 1.8, 0.12), mat("blanket", (0.55, 0.50, 0.85), 0.95), "blanket")
    box((1.2, 1.5, 1.7), (0.9, 0.2, 0.04), wood, "shelf")
    for i, c in enumerate([(0.9, 0.5, 0.2), (0.3, 0.5, 0.8), (0.95, 0.75, 0.3), (0.4, 0.7, 0.5)]):
        box((0.9 + i * 0.12, 1.5, 1.82), (0.08, 0.16, 0.22), mat(f"bk{i}", c, 0.8), "book")
if SET == "living":   # cosy living room at night: plant, floor lamp, picture; the TV is in front of Ken (off screen)
    cyl((1.7, 1.2, 0.2), 0.18, 0.4, mat("pot", (0.85, 0.45, 0.25), 0.7), "pot")
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.38, location=(1.7, 1.2, 0.75)); bpy.context.object.data.materials.append(mat("leaf", (0.25, 0.55, 0.30), 0.8))
    cyl((-1.8, 1.1, 0.75), 0.015, 1.5, mat("lamppole", (0.2, 0.18, 0.25), 0.5), "lamppole")
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.22, radius2=0.12, depth=0.25, location=(-1.8, 1.1, 1.55)); bpy.context.object.data.materials.append(mat("lshade", (1.0, 0.85, 0.6), 0.6, emit=1.5))
    bpy.ops.object.light_add(type="POINT", location=(-1.8, 1.0, 1.45)); fl = bpy.context.object; fl.data.energy = 40; fl.data.color = (1.0, 0.7, 0.4)
    box((0.6, 1.53, 1.6), (0.8, 0.03, 0.55), mat("frame", (0.95, 0.75, 0.35), 0.6), "picture")

# ---------- outdoor / library sets ----------
SKY = {"morning": ((0.95, 0.80, 0.70), (0.45, 0.62, 0.95), 0.55, 1.3, (1.0, 0.90, 0.78), 25),
       "sunny":   ((0.90, 0.85, 0.78), (0.35, 0.55, 0.95), 0.7, 1.8, (1.0, 0.95, 0.85), 50),
       "windy":   ((0.85, 0.88, 0.95), (0.35, 0.50, 0.90), 0.55, 1.3, (1.0, 0.95, 0.88), 40),
       "night":   ((0.10, 0.10, 0.25), (0.02, 0.02, 0.08), 0.6, 0.0, (1, 1, 1), 40)}


def sky_world(kind):
    hz, top, ws, sun_e, sun_c, el = SKY[kind]
    w_ = bpy.data.worlds.new("SKYW"); sc.world = w_; w_.use_nodes = True; nt = w_.node_tree; bg = nt.nodes["Background"]
    tc_ = nt.nodes.new("ShaderNodeTexCoord"); sp = nt.nodes.new("ShaderNodeSeparateXYZ"); rp = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(tc_.outputs["Generated"], sp.inputs[0]); nt.links.new(sp.outputs["Z"], rp.inputs[0]); nt.links.new(rp.outputs[0], bg.inputs[0])
    rp.color_ramp.elements[0].position = 0.0; rp.color_ramp.elements[0].color = (*hz, 1)
    rp.color_ramp.elements[1].position = 0.45; rp.color_ramp.elements[1].color = (*top, 1); bg.inputs[1].default_value = ws
    if sun_e:
        bpy.ops.object.light_add(type="SUN", location=(0, 0, 20)); sn = bpy.context.object
        sn.data.energy = sun_e; sn.data.color = sun_c; sn.data.angle = math.radians(15)
        sn.rotation_euler = Euler((math.radians(90 - el), 0, math.radians(-35)))


OUTDOOR = SET in ("street", "lawn")
if OUTDOOR:
    sky_world(C.get("sky", "sunny"))
if SET == "street":   # a long Ershui street: road, sidewalk, two-floor shop houses, the school gate ahead
    G0 = 0.0
    box((0, 1.0, G0 - 0.01), (60, 20, 0.02), mat("road", (0.30, 0.29, 0.36), 0.85), "road")
    box((0, 3.2, G0 + 0.06), (60, 2.6, 0.12), mat("walk", (0.62, 0.58, 0.66), 0.85), "sidewalk")
    cols = [(0.86, 0.72, 0.62), (0.78, 0.70, 0.86), (0.95, 0.85, 0.66), (0.72, 0.84, 0.78), (0.93, 0.76, 0.74), (0.80, 0.80, 0.92)]
    winm = mat("win", (0.15, 0.14, 0.26), 0.6); trimm = mat("trim2", (0.97, 0.95, 0.92), 0.8); awn = mat("awn", (0.85, 0.45, 0.25), 0.8)
    x = -26.0; i = 0
    while x < 26:
        w_ = 3.4 + (i * 7 % 3) * 0.6; h_ = 5.6 + (i * 5 % 3) * 0.9; cx_ = x + w_ / 2
        box((cx_, 6.2, G0 + h_ / 2), (w_ - 0.08, 3.4, h_), mat(f"house{i}", cols[i % len(cols)], 0.85), "house")
        box((cx_, 4.48, G0 + 2.9), (w_ * 0.98, 0.2, 0.16), trimm, "ledge")
        box((cx_, 4.2, G0 + 2.55), (w_ * 0.9, 0.9, 0.06), awn, "awning")
        for wx in (-0.25, 0.25): box((cx_ + wx * w_, 4.49, G0 + 4.1), (w_ * 0.26, 0.05, 1.0), winm, "window")
        box((cx_, 4.49, G0 + 1.2), (w_ * 0.7, 0.05, 2.2), winm, "shopfront")
        x += w_; i += 1
    for k in range(-6, 7):   # lane markings
        box((k * 4.0, -0.5, G0 + 0.001), (1.8, 0.12, 0.002), mat("lane", (0.95, 0.92, 0.80), 0.7), "lane")
    try:   # Ershui Elementary gate model at the far end of the run (planet asset)
        bpy.ops.import_scene.gltf(filepath=f"{PROPS}/bld_school_gate.glb"); go = list(bpy.context.selected_objects)
        mn_, mx_ = bbox(go); sg = 4.5 / (mx_.z - mn_.z); rt_ = empty("gate_root")
        for o in go:
            if o.parent is None: o.parent = rt_
        rt_.scale = (sg,) * 3; bpy.context.view_layer.update(); mn_, mx_ = bbox(go)
        rt_.location = (7.5 - (mn_.x + mx_.x) / 2, 5.6 - (mn_.y + mx_.y) / 2, G0 - mn_.z)
    except Exception as e:
        print("GATE skip", e, flush=True)
if SET == "lawn":   # the big lawn (Shuixin): grass, trees around, soft hills
    grass = mat("grass", (0.36, 0.62, 0.30) if not NIGHT else (0.10, 0.20, 0.12), 0.9)
    box((0, 0, -0.01), (80, 80, 0.02), grass, "grass")
    hill = mat("hill", (0.42, 0.62, 0.45) if not NIGHT else (0.08, 0.12, 0.14), 0.9)
    for hx, hy, hr in ((-18, 22, 9), (6, 28, 12), (24, 20, 8)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=hr, location=(hx, hy, -hr * 0.55)); bpy.context.object.data.materials.append(hill)
        bpy.context.object.scale = (1.6, 1.0, 0.6)
    try:
        for k, (tx, ty) in enumerate(((-6, 6), (5, 8), (-11, 2), (10, 3), (-3, 12), (13, 12))):
            bpy.ops.import_scene.gltf(filepath=f"{PROPS}/tree.glb"); to = list(bpy.context.selected_objects)
            mn_, mx_ = bbox(to); sg = (4.5 + (k % 3) * 0.8) / (mx_.z - mn_.z); rt_ = empty(f"tree_root{k}")
            for o in to:
                if o.parent is None: o.parent = rt_
            rt_.scale = (sg,) * 3; rt_.rotation_euler = (0, 0, k * 0.8); bpy.context.view_layer.update(); mn_, mx_ = bbox(to)
            rt_.location = (tx - (mn_.x + mx_.x) / 2, ty - (mn_.y + mx_.y) / 2, -mn_.z)
    except Exception as e:
        print("TREE skip", e, flush=True)
    if NIGHT:   # stars + a moon glow
        star = mat("star", (1, 1, 0.9), 0.5, emit=6.0); import random; rnd = random.Random(7)
        for k in range(260):
            th = rnd.uniform(0.04, 1.1); ph = rnd.uniform(-1.4, 1.4) + math.pi / 2
            p_ = Vector((math.cos(th) * math.cos(ph), math.cos(th) * math.sin(ph), math.sin(th))) * 45
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.06 + rnd.random() * 0.08, location=p_); bpy.context.object.data.materials.append(star)
        bpy.ops.object.light_add(type="SUN", location=(0, 0, 20)); mo = bpy.context.object
        mo.data.energy = 0.25; mo.data.color = (0.6, 0.7, 1.0); mo.rotation_euler = Euler((math.radians(40), 0, math.radians(20)))
if SET == "library":   # bright public library: tall shelves full of books, big sunny windows, reading tables
    box((0, 0, -0.01), (9, 9, 0.02), mat("lfloor", (0.62, 0.48, 0.36), 0.5), "floor")
    lwall = mat("lwall", (0.88, 0.86, 0.94), 0.9)
    box((0, 2.2, 1.6), (9, 0.1, 3.2), lwall, "backwall"); box((2.6, 0, 1.6), (0.1, 9, 3.2), lwall, "sidewall")
    shelf = mat("lshelf", (0.50, 0.33, 0.22), 0.6); import random; rnd = random.Random(3)
    bcols = [(0.85, 0.35, 0.30), (0.30, 0.50, 0.85), (0.95, 0.75, 0.30), (0.40, 0.70, 0.45), (0.75, 0.45, 0.85), (0.95, 0.55, 0.25)]
    for sx0, sy0, along_x in ((-2.2, 2.0, True), (0.4, 2.0, True), (2.4, -0.6, False), (2.4, 1.2, False)):
        for lvl in range(5):
            z_ = 0.25 + lvl * 0.45
            box((sx0, sy0, z_ - 0.02) if along_x else (sx0, sy0, z_ - 0.02), (1.7, 0.36, 0.03) if along_x else (0.36, 1.6, 0.03), shelf, "board")
            n_ = 14; for_len = 1.6
            for b_ in range(n_):
                hh = 0.24 + rnd.random() * 0.12; ww = 0.07 + rnd.random() * 0.04
                off = -for_len / 2 + (b_ + 0.5) * for_len / n_
                loc = (sx0 + off, sy0, z_ + hh / 2) if along_x else (sx0, sy0 + off, z_ + hh / 2)
                box(loc, (ww, 0.26, hh) if along_x else (0.26, ww, hh), mat(f"lb{lvl}_{b_}", bcols[rnd.randrange(6)], 0.8), "lbook")
    for wx_ in (-3.6,):
        box((wx_, 2.14, 1.7), (1.6, 0.02, 1.8), mat("lglass", (0.75, 0.88, 1.0), 0.2, emit=1.2), "bigwindow")
    bpy.ops.object.light_add(type="AREA", location=(-1.0, 0.0, 3.0)); cl = bpy.context.object
    cl.data.energy = 160; cl.data.size = 4.0; cl.data.color = (1.0, 0.97, 0.92)
    box((hips.x + 0.85, hips.y - 0.2, 0.36), (0.9, 0.6, 0.04), wood, "rtable")
    for dx in (-0.4, 0.4):
        for dy in (-0.25, 0.25): box((hips.x + 0.85 + dx, hips.y - 0.2 + dy, 0.17), (0.04, 0.04, 0.34), wood, "rtleg")
    box((hips.x + 0.8, hips.y - 0.2, 0.39), (0.24, 0.18, 0.03), mat("lbookopen", (0.95, 0.93, 0.85), 0.8), "openbook")

# chair / sofa under the hips
seat_z = min(p.z for p in upl) - 0.07
cx, cy = hips.x, hips.y + 0.05
if C.get("sit") == "chair":
    box((cx, cy, seat_z - 0.02), (0.42, 0.42, 0.04), wood, "seat")
    box((cx, cy + 0.22, seat_z + 0.25), (0.42, 0.04, 0.5), wood, "chairback")
    for dx in (-0.18, 0.18):
        for dy in (-0.18, 0.18): box((cx + dx, cy + dy, (seat_z - 0.04) / 2), (0.035, 0.035, seat_z - 0.04), wood, "chairleg")
elif C.get("sit") == "sofa":
    sofa = mat("sofa", (0.42, 0.40, 0.68), 0.95); cush = mat("cush", (0.95, 0.55, 0.25), 0.95)
    # teacher 11/14: his leg went THROUGH the sofa base -> the seat's front edge must stay behind both knees in every frame
    knee_back = -1e9
    for fr in range(0, nfr, 3):
        sc.frame_set(fr); bpy.context.view_layer.update()
        knee_back = max(knee_back, max(max(wp(f"{sd}Leg").y, wp(f"{sd}Foot").y) for sd in ("Left", "Right")))
    sc.frame_set(0); bpy.context.view_layer.update()
    s_front = knee_back + 0.075; s_back = max(cy + 0.43, s_front + 0.35); s_mid = (s_front + s_back) / 2; s_dep = s_back - s_front
    print("SOFA front %.3f back %.3f knee %.3f" % (s_front, s_back, knee_back), flush=True)
    box((cx + 0.35, s_mid, seat_z / 2), (1.9, s_dep, seat_z), sofa, "sofabase")
    box((cx + 0.35, s_back - 0.09, seat_z + 0.32), (1.9, 0.18, 0.7), sofa, "sofaback")
    for dx in (1.32,): box((cx + dx, s_mid, seat_z + 0.12), (0.18, s_dep, 0.36), sofa, "arm")   # no arm on the camera side
    box((cx + 0.9, s_back - 0.22, seat_z + 0.2), (0.38, 0.14, 0.34), cush, "cushion", rot=(math.radians(-12), 0, 0))
    box((cx + 0.35, cy - 1.05, 0.22), (0.9, 0.5, 0.06), wood, "coffeetable")
    for dx in (-0.4, 0.4): box((cx + 0.35 + dx, cy - 1.05, 0.1), (0.05, 0.4, 0.2), wood, "ctleg")
    # TV glow from in front of Ken (the TV itself is off screen): coloured area light that flickers a little
    bpy.ops.object.light_add(type="AREA", location=(cx, cy - 2.2, 1.0)); tvl = bpy.context.object
    tvl.data.size = 0.9; tvl.data.color = (0.55, 0.75, 1.0); tvl.rotation_euler = (math.radians(-90), 0, 0)
    for fr in range(0, nfr, 3):
        tvl.data.energy = 70 + 25 * math.sin(fr * 0.9) * math.sin(fr * 0.37); tvl.data.keyframe_insert("energy", frame=fr)
    if C.get("tv"):   # the TV itself: on a low cabinet in front of Ken, turned ~35 deg toward the camera (his right)
        tvx, tvy = cx - 0.15, cy - 1.55; _before = set(bpy.data.objects.keys())
        box((tvx, tvy, 0.22), (1.3, 0.4, 0.44), wood, "tvcabinet")
        box((tvx, tvy, 0.83), (1.12, 0.05, 0.68), mat("tvbezel", (0.10, 0.10, 0.14), 0.5), "tv")
        tvm = bpy.data.materials.new("tvscreen"); tvm.use_nodes = True; nt = tvm.node_tree; bs = nt.nodes["Principled BSDF"]
        tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(f"{PROPS}/screen_tv.png")
        bs.inputs["Base Color"].default_value = (0, 0, 0, 1); nt.links.new(tx.outputs["Color"], bs.inputs["Emission Color"]); bs.inputs["Emission Strength"].default_value = 0.9
        bpy.ops.mesh.primitive_plane_add(size=1, location=(tvx, tvy + 0.027, 0.83), rotation=(math.radians(90), 0, math.radians(180)))
        so = bpy.context.object; so.scale = (1.04, 0.60, 1); so.data.materials.append(tvm)
        piv = empty("tvpivot", (tvx, tvy, 0)); bpy.context.view_layer.update()
        for _n in set(bpy.data.objects.keys()) - _before - {"tvpivot"}:
            _o = bpy.data.objects[_n]; _o.parent = piv; _o.matrix_parent_inverse = piv.matrix_world.inverted()
        piv.rotation_euler = (0, 0, math.radians(38)); bpy.context.view_layer.update()   # screen faces Ken and the camera side

if C.get("desk"):
    tips = []   # desk top = lowest fingertip over the whole clip (hands rest ON the paper / keys, never sink in)
    for fr in range(0, nfr, 6):
        sc.frame_set(fr); bpy.context.view_layer.update()
        if C.get("prop") == "pencil":
            tips += [(arm.matrix_world @ PB[f"LeftHand{f}3"].tail).z for f in ("Index", "Middle")]
            tips += [wp(f"RightHand{f}{i}").z - 0.008 for f in ("Ring", "Pinky") for i in (1, 2, 3)] + [wp("RightHandPinky3", True).z - 0.006]
        else:
            tips += [wp(f"{sd}Hand{f}3", True).z for sd in ("Left", "Right") for f in ("Index", "Middle", "Ring")]
    sc.frame_set(0); bpy.context.view_layer.update()
    thigh = max(max(wp(f"{sd}UpLeg").z, wp(f"{sd}Leg").z) for sd in ("Left", "Right")) + 0.075   # top of the thighs (+leg thickness)
    surf = 0.018 if C.get("prop") == "pencil" else 0.03               # paper / keyboard height above the desk top
    top = max(min(tips) - surf, thigh + 0.03)
    print("DESK top %.3f thigh %.3f tips %.3f" % (top, thigh, min(tips)), flush=True)
    PAPER["z"] = top + 0.018
    hy = min(h.y for h in hands)
    dy = hy - 0.18
    box((cx, dy, top - 0.02), (1.15, 0.6, 0.04), wood, "desktop")
    for dx in (-0.53, 0.53):
        for ddy in (-0.25, 0.25): box((cx + dx, dy + ddy, (top - 0.04) / 2), (0.04, 0.04, top - 0.04), wood, "deskleg")
    if C.get("book"):   # open English book under the left hand
        page = mat("page", (0.97, 0.95, 0.88), 0.8)
        lh = hands[0]
        for side, ang in ((-1, 6), (1, -6)):
            box((lh.x * 0.5 + hands[1].x * 0.5 + side * 0.11, hy - 0.02, top + 0.012), (0.2, 0.28, 0.012), page, "page", rot=(0, math.radians(ang), 0))
        box((lh.x * 0.5 + hands[1].x * 0.5, hy - 0.02, top + 0.004), (0.44, 0.3, 0.008), mat("cover", (0.2, 0.35, 0.75), 0.7), "cover")
    if C.get("prop") == "keyboard":   # keyboard under the fingertips, monitor behind it, mouse on the right
        kx = (hands[0].x + hands[1].x) / 2; ky = hy - 0.05
        box((kx, ky, top + 0.011), (0.46, 0.15, 0.022), mat("kb", (0.22, 0.22, 0.28), 0.6), "keyboard")
        keym = mat("key", (0.85, 0.85, 0.9), 0.5)
        for r_ in range(3):
            for c_ in range(10): box((kx - 0.19 + c_ * 0.042, ky - 0.045 + r_ * 0.045, top + 0.024), (0.034, 0.034, 0.008), keym, "key")
        box((kx - 0.33, ky + 0.02, top + 0.012), (0.07, 0.11, 0.024), keym, "mouse")
        mx_, my_ = kx, ky - 0.36
        _before = set(bpy.data.objects.keys())
        box((mx_, my_, top + 0.33), (0.62, 0.04, 0.38), mat("bezel", (0.12, 0.12, 0.16), 0.5), "monitor")
        cyl((mx_, my_ + 0.03, top + 0.07), 0.025, 0.14, mat("stand", (0.15, 0.15, 0.2), 0.5), "stand")
        box((mx_, my_ + 0.03, top + 0.005), (0.22, 0.14, 0.01), mat("standb", (0.15, 0.15, 0.2), 0.5), "standbase")
        scr = bpy.data.materials.new("screen"); scr.use_nodes = True; nt = scr.node_tree; bs = nt.nodes["Principled BSDF"]
        img = bpy.data.images.load(f"{PROPS}/{'screen_photo.png' if C.get('screen') == 'photo' else 'screen_game.png'}")
        tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img
        bs.inputs["Base Color"].default_value = (0, 0, 0, 1); bs.inputs["Roughness"].default_value = 1.0
        nt.links.new(tx.outputs["Color"], bs.inputs["Emission Color"]); bs.inputs["Emission Strength"].default_value = 0.9
        bpy.ops.mesh.primitive_plane_add(size=1, location=(mx_, my_ + 0.021, top + 0.33), rotation=(math.radians(90), 0, math.radians(180)))
        so = bpy.context.object; so.scale = (0.57, 0.33, 1); so.data.materials.append(scr)
        bpy.ops.object.light_add(type="AREA", location=(mx_, my_ + 0.1, top + 0.33)); ml = bpy.context.object
        ml.data.energy = 12; ml.data.size = 0.5; ml.data.color = (0.7, 0.8, 1.0); ml.rotation_euler = (math.radians(-90), 0, 0)
        piv = empty("monpivot", (mx_, my_, top)); bpy.context.view_layer.update()   # turn the monitor ~30 deg toward the camera (his right)
        for _n in set(bpy.data.objects.keys()) - _before - {"monpivot"}:
            _o = bpy.data.objects[_n]; _o.parent = piv; _o.matrix_parent_inverse = piv.matrix_world.inverted()
        piv.rotation_euler = (0, 0, math.radians(C.get("mon_turn", 30))); bpy.context.view_layer.update()
    # desk lamp (warm)
    lx, ly = cx + 0.42, dy + 0.12
    cyl((lx, ly, top + 0.01), 0.07, 0.02, mat("lampbase", (0.95, 0.55, 0.2), 0.5), "lampbase")
    cyl((lx, ly, top + 0.2), 0.012, 0.38, mat("lamparm", (0.95, 0.55, 0.2), 0.5), "lamparm")
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.1, radius2=0.04, depth=0.12, location=(lx - 0.06, ly - 0.02, top + 0.4), rotation=(0, math.radians(-35), 0))
    bpy.context.object.data.materials.append(mat("shade", (0.95, 0.55, 0.2), 0.5))
    bpy.ops.object.light_add(type="POINT", location=(lx - 0.1, ly - 0.05, top + 0.32)); L = bpy.context.object
    L.data.energy = 12; L.data.color = (1.0, 0.75, 0.45); L.data.shadow_soft_size = 0.15
if C.get("lamp"):   # bedroom at night without a desk: warm bedside lamp + a music stand in front of Ken
    bpy.ops.object.light_add(type="POINT", location=(1.0, 0.4, 1.0)); bl = bpy.context.object; bl.data.energy = 45; bl.data.color = (1.0, 0.72, 0.42)
    stx, sty = hips.x + 0.5, hips.y - 0.65   # his front-left, out of the way of the recorder
    cyl((stx, sty, 0.5), 0.012, 1.0, mat("standpole", (0.15, 0.15, 0.2), 0.5), "musicstand")
    box((stx, sty, 1.05), (0.30, 0.02, 0.21), mat("standdesk", (0.15, 0.15, 0.2), 0.5), "standdesk", rot=(math.radians(-20), 0, 0))
    box((stx, sty - 0.015, 1.06), (0.27, 0.005, 0.18), mat("sheet", (0.97, 0.96, 0.9), 0.8), "sheet", rot=(math.radians(-20), 0, 0))


# ---------- props that follow the bones every frame ----------
def keyed_prop(name, build, place):
    pr = empty(name); pr.rotation_mode = "QUATERNION"; build(pr)
    for fr in range(nfr):
        sc.frame_set(fr); bpy.context.view_layer.update()
        loc, q, *rest = place(); pr.location = loc; pr.rotation_quaternion = q
        if rest: pr.scale = (rest[0],) * 3; pr.keyframe_insert("scale", frame=fr)
        pr.keyframe_insert("location", frame=fr); pr.keyframe_insert("rotation_quaternion", frame=fr)
    return pr


if C.get("prop") == "pencil":   # dynamic tripod (teacher 11/14): tip on the paper, shaft leans back to the right shoulder
    def _b(pr):
        o = cyl((0, 0, 0.0), 0.008, 0.13, mat("pencil", (0.98, 0.78, 0.1), 0.5), "pencil_body", v=6); o.parent = pr
        o2 = cyl((0, 0, -0.065), 0.006, 0.018, mat("tip", (0.9, 0.8, 0.6), 0.6), "pencil_tip", v=6); o2.parent = pr
    def _p():
        tip, ax = pencil_axis(); return tip + ax * 0.065, Vector((0, 0, 1)).rotation_difference(ax)
    keyed_prop("pencil", _b, _p)
if C.get("prop") == "recorder":
    def _b(pr):
        rm = mat("recorder", (0.96, 0.92, 0.82), 0.4)
        o = cyl((0, 0, -0.16), 0.011, 0.32, rm, "rec_body"); o.parent = pr
        o2 = cyl((0, 0, -0.012), 0.013, 0.03, rm, "rec_mouth"); o2.parent = pr
        o3 = cyl((0, 0, -0.31), 0.015, 0.03, rm, "rec_bell"); o3.parent = pr
        hm = mat("hole", (0.1, 0.08, 0.06), 0.6)
        for d_ in REC_HOLES["Left"] + REC_HOLES["Right"]:
            h = cyl((0, -0.0105, -d_), 0.0033, 0.004, hm, "hole", rot=(math.radians(90), 0, 0), v=8); h.parent = pr
        h = cyl((0, 0.0105, -REC_THUMB["Left"]), 0.0033, 0.004, hm, "thumbhole", rot=(math.radians(90), 0, 0), v=8); h.parent = pr
    def _p():
        mouth, ax, fn, side = recorder_frame()
        q = Vector((0, 0, -1)).rotation_difference(ax)                       # local -Z = down the recorder
        yw = q @ Vector((0, -1, 0)); q = yw.rotation_difference(fn) @ q      # front holes (local -Y) face fn
        return mouth, q
    keyed_prop("recorder", _b, _p)
if C.get("headset") or C.get("headphones"):   # over-ear headphones / gaming headset (unit size, scaled to the head)
    def _b(pr):
        hm = mat("hp", (0.95, 0.5, 0.15) if C.get("headphones") else (0.15, 0.15, 0.22), 0.5)
        for k in range(11):   # head band = arc over the top of the head, from ear to ear
            a_ = math.radians(10 + k * 16)
            sg_ = cyl((math.cos(a_), 0, math.sin(a_)), 0.06, 0.31, hm, "hp_band", rot=(0, -a_, 0)); sg_.parent = pr
        for sg in (-1, 1):
            c_ = cyl((sg * 1.0, 0, 0), 0.32, 0.18, hm, "hp_cup", rot=(0, math.radians(90), 0)); c_.parent = pr
        if C.get("headset"):
            m_ = cyl((0.98, 0.38, -0.32), 0.03, 0.8, hm, "mic", rot=(math.radians(60), 0, 0)); m_.parent = pr
    def _p():
        c, up, fw, side, r = head_frame()
        R = Matrix((side, fw, up)).transposed()
        return c + up * r * 0.05, R.to_quaternion(), r * 1.05
    keyed_prop("headgear", _b, _p)


# ---------- outdoor props ----------
if C.get("prop") == "bike" and BIKE:   # kid's blue bike: every tube joined (head tube - stem - handlebar), cranks and wheels turn
    B = BIKE; bm = mat("bikeblue", (0.20, 0.42, 0.90), 0.4); tyre = mat("tyre", (0.08, 0.08, 0.1), 0.8); chrome = mat("chrome", (0.75, 0.75, 0.8), 0.3)
    bike_parts = []

    def tube(a, b_, r, m_, parent=None):
        d_ = b_ - a; o = cyl((a + b_) / 2, r, d_.length, m_, "tube"); o.rotation_mode = "QUATERNION"
        o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d_.normalized())
        if parent is None: bike_parts.append(o)
        return o

    X = Vector((1, 0, 0)); seat_top = B["saddle"] + Vector((0, 0, -0.05))
    tube(B["bb"], seat_top, 0.020, bm)                                   # seat tube
    tube(seat_top + Vector((0, -0.02, -0.03)), B["head_top"] + Vector((0, 0.02, -0.03)), 0.019, bm)   # top tube
    tube(B["bb"], B["head_bot"], 0.022, bm)                              # down tube
    tube(B["head_top"] + Vector((0, 0.012, 0.035)), B["head_bot"], 0.026, bm)   # head tube
    for sx in (-1, 1):
        tube(B["bb"] + X * sx * 0.03, B["rear"] + X * sx * 0.05, 0.012, bm)      # chain stays
        tube(seat_top + X * sx * 0.02, B["rear"] + X * sx * 0.05, 0.011, bm)     # seat stays
        tube(B["head_bot"] + X * sx * 0.035, B["front"] + X * sx * 0.05, 0.013, bm)   # fork blades
    tube(B["head_bot"] - X * 0.04, B["head_bot"] + X * 0.04, 0.016, bm)          # fork crown
    tube(seat_top, B["saddle"] + Vector((0, 0, -0.02)), 0.012, chrome)           # seat post
    box(B["saddle"] + Vector((0, 0.02, -0.015)), (0.13, 0.24, 0.045), tyre, "saddle"); bike_parts.append(bpy.context.object)
    # stem + swept-back handlebar, all joined to the head tube
    C0 = B["head_top"] + Vector((0, 0.02, 0.075))
    tube(B["head_top"], C0, 0.015, chrome)
    for sx, grip in ((1, B["gripL"]), (-1, B["gripR"])):
        A1 = Vector((C0.x + sx * 0.085, C0.y + 0.05, grip.z - 0.012)); B1 = Vector((grip.x - sx * 0.05, grip.y, grip.z))
        tube(C0, A1, 0.012, chrome); tube(A1, B1, 0.012, chrome)
        tube(B1, Vector((grip.x + sx * 0.05, grip.y, grip.z)), 0.018, tyre)       # rubber grip under the palm
    for o in bike_parts:
        o.parent = RIG; o.matrix_parent_inverse = RIG.matrix_world.inverted()

    def wheel(name, axle):
        def _b(pr):
            bpy.ops.mesh.primitive_torus_add(major_radius=B["r"] - 0.025, minor_radius=0.028, rotation=(0, math.radians(90), 0)); o = bpy.context.object
            o.data.materials.append(tyre); o.parent = pr
            for k in range(8):
                a_ = k * math.pi / 4; s_ = cyl((0, math.cos(a_) * 0.105, math.sin(a_) * 0.105), 0.004, 0.21, chrome, "spoke", rot=(a_ - math.pi / 2, 0, 0)); s_.parent = pr
            h_ = cyl((0, 0, 0), 0.022, 0.08, chrome, "hub", rot=(0, math.radians(90), 0)); h_.parent = pr
        def _p():
            return axle, Quaternion((1, 0, 0), C.get("move", 0) * (sc.frame_current / FPS) / B["r"])   # rolls forward
        w_ = keyed_prop(name, _b, _p); w_.parent = RIG; w_.matrix_parent_inverse = RIG.matrix_world.inverted()

    wheel("wheel_f", B["front"]); wheel("wheel_r", B["rear"])

    def _bc(pr):
        cr_ = cyl((0, 0, 0), 0.075, 0.012, chrome, "chainring", rot=(0, math.radians(90), 0)); cr_.parent = pr
        ax_ = cyl((0, 0, 0), 0.012, 0.19, chrome, "bbaxle", rot=(0, math.radians(90), 0)); ax_.parent = pr
        for sx, sg in ((0.085, -1), (-0.085, 1)):      # left crank along local -Y (phase 0), right crank opposite
            c_ = box((sx, sg * B["CR"] / 2, 0), (0.014, B["CR"], 0.02), chrome, "crank"); c_.parent = pr
    def _pc():
        return B["bb"], Quaternion((1, 0, 0), BIKE_W * sc.frame_current / FPS)
    cr = keyed_prop("cranks", _bc, _pc); cr.parent = RIG; cr.matrix_parent_inverse = RIG.matrix_world.inverted()
    for sd in ("Left", "Right"):
        def _bp(pr):
            p_ = box((0, 0, 0), (0.08, 0.07, 0.018), tyre, "pedal"); p_.parent = pr
        def _pp(sd=sd):
            return bike_pedal(sd, sc.frame_current / FPS) + Vector((0.03 if sd == "Left" else -0.03, 0, 0)), Quaternion()
        pd = keyed_prop("pedal_" + sd, _bp, _pp); pd.parent = RIG; pd.matrix_parent_inverse = RIG.matrix_world.inverted()
if C.get("prop") == "basketball":
    hoop_x, hoop_y = hips.x + 1.9, hips.y + 2.6
    cyl((hoop_x, hoop_y + 0.4, 1.5), 0.05, 3.0, mat("pole", (0.3, 0.3, 0.38), 0.5), "pole")
    box((hoop_x, hoop_y + 0.33, 2.75), (1.1, 0.04, 0.72), mat("board", (0.97, 0.97, 1.0), 0.4), "backboard")
    box((hoop_x, hoop_y + 0.305, 2.62), (0.42, 0.045, 0.3), mat("boardred", (0.9, 0.3, 0.25), 0.6), "boardsq")
    bpy.ops.mesh.primitive_torus_add(major_radius=0.22, minor_radius=0.015, location=(hoop_x, hoop_y + 0.0, 2.45)); bpy.context.object.data.materials.append(mat("rim", (0.95, 0.45, 0.12), 0.4))
    R_ = DRIB["R"]

    def _b(pr):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=R_, segments=32, ring_count=16); b_ = bpy.context.object
        b_.data.materials.append(mat("bball", (0.95, 0.45, 0.12), 0.6)); bpy.ops.object.shade_smooth(); b_.parent = pr
        for rx, ry in ((0, 0), (math.radians(90), 0), (0, math.radians(90))):
            bpy.ops.mesh.primitive_torus_add(major_radius=R_ + 0.001, minor_radius=0.004, rotation=(rx, ry, 0)); t_ = bpy.context.object
            t_.data.materials.append(mat("seam", (0.1, 0.06, 0.1), 0.6)); t_.parent = pr

    def _p():   # same cycle as dribble_pose (the floor is z = 0 after Ken was placed)
        c, on, sh = dribble_ball(sc.frame_current / FPS, 0.0)
        return c, Quaternion((1, 0, 0), sc.frame_current * 0.22)
    keyed_prop("basketball", _b, _p)
if C.get("prop") == "camp":   # orange tent, lantern and a small campfire beside Ken
    tm = mat("tent", (0.95, 0.55, 0.20), 0.8)
    import bmesh
    me = bpy.data.meshes.new("tent"); bm_ = bmesh.new(); tx, ty = hips.x + 1.3, hips.y + 0.9; W_, D_, H_ = 1.5, 1.8, 1.25
    vs = [bm_.verts.new(v) for v in ((tx - W_ / 2, ty - D_ / 2, 0), (tx + W_ / 2, ty - D_ / 2, 0), (tx, ty - D_ / 2, H_),
                                     (tx - W_ / 2, ty + D_ / 2, 0), (tx + W_ / 2, ty + D_ / 2, 0), (tx, ty + D_ / 2, H_))]
    for f_ in ((0, 1, 2), (3, 5, 4), (0, 2, 5, 3), (1, 4, 5, 2)): bm_.faces.new([vs[i] for i in f_])
    bm_.to_mesh(me); bm_.free(); to = bpy.data.objects.new("tent", me); sc.collection.objects.link(to); to.data.materials.append(tm)
    bpy.ops.object.select_all(action="DESELECT"); to.select_set(True); bpy.context.view_layer.objects.active = to
    bpy.ops.object.modifier_add(type="SOLIDIFY"); to.modifiers[-1].thickness = 0.02
    box((tx, ty - D_ / 2 - 0.005, H_ * 0.33), (0.5, 0.01, H_ * 0.6), mat("tentdoor", (0.35, 0.18, 0.08), 0.8), "tentdoor")
    lx_, ly_ = hips.x - 0.55, hips.y - 0.35
    cyl((lx_, ly_, 0.10), 0.045, 0.13, mat("lantern", (1.0, 0.72, 0.30), 0.3, emit=1.1), "lantern")
    cyl((lx_, ly_, 0.02), 0.055, 0.04, mat("lanternbase", (0.2, 0.3, 0.25), 0.5), "lanternbase"); cyl((lx_, ly_, 0.185), 0.055, 0.04, mat("lanterntop", (0.2, 0.3, 0.25), 0.5), "lanterntop")
    bpy.ops.object.light_add(type="POINT", location=(lx_, ly_, 0.3)); ll = bpy.context.object; ll.data.energy = 12; ll.data.color = (1.0, 0.75, 0.4)
    fx_, fy_ = hips.x + 0.25, hips.y - 0.85
    for k in range(5):
        a_ = k * 2 * math.pi / 5; cyl((fx_ + math.cos(a_) * 0.12, fy_ + math.sin(a_) * 0.12, 0.04), 0.025, 0.28, mat("log", (0.35, 0.2, 0.1), 0.8), "log", rot=(math.radians(80), 0, a_))
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.11, depth=0.30, location=(fx_, fy_, 0.19)); bpy.context.object.data.materials.append(mat("flame", (1.0, 0.38, 0.05), 0.5, emit=1.3))
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.06, depth=0.18, location=(fx_ + 0.01, fy_ - 0.03, 0.14)); bpy.context.object.data.materials.append(mat("flame2", (1.0, 0.80, 0.20), 0.5, emit=1.6))
    bpy.ops.object.light_add(type="POINT", location=(fx_, fy_, 0.35)); fl_ = bpy.context.object; fl_.data.color = (1.0, 0.55, 0.2)
    for fr in range(0, nfr, 2):
        fl_.data.energy = 30 + 8 * math.sin(fr * 1.3) * math.sin(fr * 0.53); fl_.data.keyframe_insert("energy", frame=fr)
BATCAM = {}
if C.get("prop") == "bat":   # teacher 11/14: both hands on the bat; the pitch comes from the pitcher's side (his front shoulder), is hit in front of the body
    AX = []
    for fr in range(nfr):
        sc.frame_set(fr); bpy.context.view_layer.update(); AX.append(bat_geom()[:2])
    tips = [a0 + a_ * 0.60 for a0, a_ in AX]
    sp_ = [(tips[i + 1] - tips[i]).length for i in range(nfr - 1)]; FC = max(range(len(sp_)), key=lambda i: sp_[i])   # contact frame = fastest bat
    sc.frame_set(0); bpy.context.view_layer.update()
    Ld = wp("LeftArm") - wp("RightArm"); Ld.z = 0; Ld.normalize()        # a right-handed batter's LEFT shoulder points at the pitcher
    UPV = Vector((0, 0, 1)); FW0 = Ld.cross(UPV).normalized()             # his chest faces the plate
    print("BAT contact frame", FC, "pitcher dir", tuple(round(v, 2) for v in Ld), flush=True)

    def _b(pr):
        o = cyl((0, 0, 0.36), 0.030, 0.46, mat("batwood", (0.80, 0.60, 0.35), 0.5), "bat_barrel"); o.parent = pr
        o2 = cyl((0, 0, 0.065), 0.016, 0.15, mat("batgrip", (0.15, 0.12, 0.12), 0.7), "bat_grip"); o2.parent = pr
        o3 = cyl((0, 0, -0.012), 0.024, 0.012, mat("batknob", (0.80, 0.60, 0.35), 0.5), "bat_knob"); o3.parent = pr

    def _p():
        a0, a_ = AX[sc.frame_current]; return a0 - a_ * 0.045, Vector((0, 0, 1)).rotation_difference(a_)
    keyed_prop("bat", _b, _p)
    a0c, ac_ = AX[FC]; cpt = a0c + ac_ * 0.45                             # the sweet spot of the barrel at contact
    F0 = max(0, FC - 30)                                                   # the pitch is in the air for 1.25 s
    start = cpt + Ld * 9.0 + UPV * 0.35; away = (Ld * 0.80 + UPV * 0.50 - FW0 * 0.20).normalized()

    def _bb(pr):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.037, segments=16, ring_count=8); o = bpy.context.object
        o.data.materials.append(mat("baseball", (0.98, 0.97, 0.92), 0.5)); bpy.ops.object.shade_smooth(); o.parent = pr

    def _pb():
        fr = sc.frame_current
        if fr < F0: return start, Quaternion(), 0.001                     # not thrown yet (hidden)
        if fr <= FC:
            u = (fr - F0) / max(1, FC - F0); return start.lerp(cpt, u) + UPV * (math.sin(u * math.pi) * 0.25), Quaternion(), 1.0
        u = (fr - FC) / FPS; return cpt + away * (13.0 * u) + UPV * (-4.9 * u * u), Quaternion(), 1.0
    keyed_prop("baseball", _bb, _pb)
    sc.frame_set(0); bpy.context.view_layer.update()
    kc0 = arm.matrix_world @ PB["Hips"].head
    BATCAM.update(pos=kc0 + FW0 * 2.3 - Ld * 0.4 + UPV * 0.40, look=kc0 + Ld * 0.50 + UPV * 0.18, FC=FC)

# ---------- light, world, camera ----------
if C.get("move"):   # travelling shots: Ken faces +X and moves along the street
    v_ = C["move"]; x0_ = -v_ * DUR / 2
    for fr in range(nfr):
        RIG.location = (x0_ + v_ * fr / FPS, 0, 0); RIG.rotation_euler = (0, 0, math.radians(90))
        RIG.keyframe_insert("location", frame=fr); RIG.keyframe_insert("rotation_euler", frame=fr)
w = bpy.data.worlds.new("W")
if not OUTDOOR: sc.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.22, 0.38, 1) if not NIGHT else (0.10, 0.09, 0.20, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.25 if not NIGHT else 0.15
bpy.ops.object.light_add(type="AREA", location=(-1.5, -2.0, 2.6)); key = bpy.context.object
key.data.energy = (55 if not NIGHT else 42) if not (OUTDOOR and not NIGHT) else 0; key.data.size = 2.5; key.data.color = (1.0, 0.88, 0.78) if not NIGHT else (1.0, 0.78, 0.6)
key.rotation_euler = (Vector((0, 0, 1.0)) - key.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.light_add(type="AREA", location=(0.8, 1.2, 1.9)); rim = bpy.context.object
rim.data.energy = 45 if not C.get("move") else 0; rim.data.size = 1.0; rim.data.color = (1.0, 0.55, 0.22)
rim.rotation_euler = (Vector((hips.x, hips.y, 1.0)) - rim.location).to_track_quat("-Z", "Y").to_euler()

cd = bpy.data.cameras.new("cam"); cd.lens = 38; cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0
cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam
lo_ = C.get("look_off", (0.0, -0.1)); cd.lens = C.get("lens", 38)
look = Vector((hips.x + lo_[0], hips.y + lo_[1], hips.z + C.get("look", 0.25)))
foc = empty("foc", look); cd.dof.focus_object = foc
CAMO = Vector(C.get("cam", (-1.25, -1.75, 0.45)))
for fr in range(nfr):
    k = fr / max(1, nfr - 1); ke = k * k * (3 - 2 * k)
    if C.get("track"):   # side tracking from Ken's right/front while he travels along +X
        sc.frame_set(fr); bpy.context.view_layer.update(); kc = arm.matrix_world @ PB["Hips"].head
        look = kc + Vector(C.get("track_look", (0.6, 0, 0.15))); foc.location = kc; foc.keyframe_insert("location", frame=fr)
        cam.location = kc + Vector(C["track"])
    elif BATCAM:
        cam.location = BATCAM["pos"]; look = BATCAM["look"]
    else:
        cam.location = look + CAMO + Vector((0.15 * ke, 0.2 * ke, 0))   # front-right 3/4 of Ken, slow push in
    cam.rotation_euler = (look - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.keyframe_insert("location", frame=fr); cam.keyframe_insert("rotation_euler", frame=fr)

# matte look for the Tripo/Ken materials
for m in bpy.data.materials:
    if not m.use_nodes: continue
    bs = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bs or m.name in ("glass",): continue
    if bs.inputs["Metallic"].links:
        for l in list(bs.inputs["Metallic"].links): m.node_tree.links.remove(l)
    bs.inputs["Metallic"].default_value = 0.0

# ---------- render ----------
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
cp = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try: cp.compute_device_type = kind; cp.get_devices(); break
    except Exception: pass
for d in cp.devices: d.use = d.type != "CPU"
sc.render.resolution_percentage = SCALE; sc.render.image_settings.file_format = "PNG"
os.makedirs(OUT, exist_ok=True)
if FR == "cu":
    cam.animation_data_clear(); cd.dof.use_dof = False
    mid = lambda *ns: sum((wp(n) for n in ns), Vector()) / len(ns)
    CUS = {
        "s01": [("front", 60, lambda: wp("RightHand"), (-0.30, -0.40, 0.22), 50), ("side", 60, lambda: wp("RightHand"), (-0.45, 0.05, 0.12), 50),
                ("top", 60, lambda: wp("RightHandIndex1"), (0.06, -0.14, 0.42), 50), ("left", 100, lambda: wp("RightHand"), (0.40, -0.30, 0.20), 50)],
        "s02": [("legs_front", 40, lambda: mid("LeftLeg", "RightLeg"), (-0.7, -1.5, 0.15), 40), ("legs_side", 100, lambda: mid("LeftLeg", "RightLeg"), (-1.6, -0.1, 0.1), 40)],
        "s08": [("bar", 30, lambda: mid("LeftHand", "RightHand"), (-0.55, -0.55, 0.35), 45), ("feet", 30, lambda: mid("LeftFoot", "RightFoot"), (-1.0, -0.35, 0.15), 40),
                ("side_a", 30, lambda: wp("Hips"), (-2.3, -0.2, 0.0), 35), ("side_b", 42, lambda: wp("Hips"), (-2.3, -0.2, 0.0), 35), ("front34", 54, lambda: wp("Hips"), (-1.5, -1.9, 0.3), 35)],
        "s09": [("push", 37, lambda: wp("RightHand"), (-0.75, -0.95, 0.10), 40), ("floor", 43, lambda: wp("RightHand"), (-0.75, -0.95, -0.10), 35),
                ("catch", 50, lambda: wp("RightHand"), (-0.75, -0.95, 0.10), 40), ("side", 54, lambda: wp("RightHand"), (-1.2, 0.1, 0.0), 40)],
        "s11": [("stance", 20, lambda: mid("LeftHand", "RightHand"), (-0.45, -0.60, 0.10), 45)],
    }.get(SK, [])
    if BATCAM:
        fc = BATCAM["FC"]; CUS += [("hands_contact", fc, lambda: mid("LeftHand", "RightHand"), (-0.5, -0.7, 0.2), 45)]
    Rz = RIG.matrix_world.to_3x3()
    for tag, f_, tg_fn, off, lens_ in CUS:
        sc.frame_set(f_); bpy.context.view_layer.update(); tg = tg_fn(); Rz = RIG.matrix_world.to_3x3()
        cam.location = tg + Rz @ Vector(off); cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler(); cd.lens = lens_
        sc.render.filepath = f"{OUT}/{SHOT}_cu_{tag}.png"; bpy.ops.render.render(write_still=True); print("FRAME cu", tag, flush=True)
    sys.exit(0)
if FR == "wide":   # debug: whole set from high front-right
    sc.frame_set(60); cam.animation_data_clear(); cam.location = Vector((hips.x - 3.2, hips.y - 3.6, 2.8)); cd.lens = 24; cd.dof.use_dof = False
    cam.rotation_euler = (Vector((hips.x, hips.y, 0.8)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{OUT}/{SHOT}_wide.png"; bpy.ops.render.render(write_still=True); print("FRAME wide", flush=True)
    print("OBJS", sorted(set(o.name.split(".")[0] for o in bpy.data.objects)), flush=True)
    for o in bpy.data.objects:
        if o.type != "MESH": continue
        mn_, mx_ = bbox([o]); d_ = mx_ - mn_
        if max(d_) > 1.2: print("BIG", o.name, tuple(round(v, 2) for v in d_), "parent", o.parent and o.parent.name, flush=True)
    hg = bpy.data.objects.get("headgear"); print("HEADGEAR", hg and tuple(round(v, 3) for v in hg.matrix_world.translation), hg and tuple(round(v, 3) for v in hg.scale), flush=True); sys.exit(0)
if FR in ("hand", "hand2"):   # hand = front-right close-up, hand2 = from his right side
    sc.frame_set(C.get("hand_fr", 60)); bpy.context.view_layer.update(); hb = arm.matrix_world @ PB["RightHand"].head
    cam.animation_data_clear(); cam.location = hb + (Vector((-0.35, -0.45, 0.25)) if FR == "hand" else Vector((-0.55, 0.05, 0.12)))
    cam.rotation_euler = (hb - cam.location).to_track_quat("-Z", "Y").to_euler(); cd.lens = 50; cd.dof.use_dof = False
    sc.render.filepath = f"{OUT}/{SHOT}_{FR}.png"; bpy.ops.render.render(write_still=True); print("FRAME hand", flush=True); sys.exit(0)
frs = range(nfr) if FR == "all" else [int(x) for x in FR.split(",")]
for fr in frs:
    p = f"{OUT}/f{fr:04d}.png" if FR == "all" else f"{OUT}/{SHOT}_f{fr:04d}.png"
    if FR == "all" and os.path.exists(p): continue
    sc.frame_set(fr); sc.render.filepath = p; t0 = time.time()
    bpy.ops.render.render(write_still=True); print(f"FRAME {fr} {time.time() - t0:.1f}s", flush=True)
