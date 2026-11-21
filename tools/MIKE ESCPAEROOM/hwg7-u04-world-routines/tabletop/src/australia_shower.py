# World Routines Trip - Australia station "I take a shower at seven fifteen." (tabletop style H)
# blender -b --factory-startup --python australia_shower.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: AU1 wide hallway at dusk: the traveller asks; the boy (sports uniform, a little mud on the knees, a football at his feet)
#             stands beside the bathroom door (door on HIS LEFT = screen right) and points at the 7:15 clock with his LEFT hand
#         AU2 half body: low wooden stool on HIS RIGHT (top at his waist); right hand takes one end of the folded towel (pinch:
#             thumb on top, fingers under), lifts it and lays it over his RIGHT shoulder (let go when it lies on the shoulder; from
#             then on it moves with the shoulder): "I play soccer after school."
#         AU3 right hand holds the four-minute shower hourglass round its middle, lifts it, turns the forearm half a turn (the
#             hourglass turns upside down), puts it back (let go on the stool), the sand starts to run: "It's a four-minute shower!"
#         AU4 he side-steps to HIS LEFT to the bathroom door (face always to the camera, feet step, no sliding), his LEFT hand takes
#             the shampoo bottle from the small caddy there (cap up, below the chest), his RIGHT hand waves (round 4, 11/21: was
#             right hand shampoo / left hand wave), head sways while humming "La la la" (no drawn mouth):
#             "I take a shower at seven fifteen." / "I sing a song!" / "La la la..."
#   Check cameras (SHOT + suffix), sharp, no depth of field:
#         AU2HF / AU2HS  towel pinch at the stool (front-right / from above-left) ; AU2HT / AU2HT2 towel on the shoulder (front / his right side)
#         AU3HF / AU3HS  hourglass grip (front-right / his right side)         ; AU4HF / AU4HS shampoo grip (front-LEFT / his LEFT side)
#         AU4L           feet, low front (side steps: planted foot must not slide) ; AU1C close front (face light)
# Models: australia_boy (rigged), traveler_girl, australia_bathroom_wall (wall + slightly open door), australia_backyard
#   (rotary clothesline + eucalyptus, outside the window).
# Made here: hallway walls + window + dusk sky, floorboards, the 7:15 clock, hook + navy sun hat, the stool, towel (8 linked felt
#   pieces), hourglass with sand, shampoo bottle on a small round caddy, football, mud on the knees.
# Hand helpers: from hands import * (tabletop/src/hands.py). New grips (towel pinch, round-object wrap) live here first.
# Props held in a hand are rigid to the hand bone (prop = hand_matrix @ C); the towel's held end follows the real pinch point.
# Measurement lines: DESK (layout, body, grips, reach), CONTACT (grab jumps, towel on the shoulder, hourglass on the stool,
#   feet slipping while stepping), plus the engine's CHK / GND. Numbers marked GUESS: check them in the first check frames.
# colab_run.py does not pass environment variables: change the defaults in this file.
# ASCII only: colab exec reads files with cp950 on Windows.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
from hands import *            # shared hand helpers (tabletop/src/hands.py)
import hands as H
# 11/21 shared rule: tight grips (wrap round the hourglass / bottle, pinch, pointing hand) bend past 90 deg, where curl() turns the
# next segment back (AU4 check: claw-like fingers). curl_hinge() bends each finger about ONE hinge axis.
curl = H.curl_hinge

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with australia_compose.py
DUR = {"AU1": 5.6, "AU2": 3.8, "AU3": 3.0, "AU4": 7.6}
VOICE = {"q": 0.4, "a": 2.6, "soccer": 0.5, "four": 0.4, "a4": 0.4, "sing": 3.3, "la": 4.95}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
sc = E.sc
T = DUR[SHOT]


def env(k, d):
    return float(os.environ.get(k, d))


def lin(c):
    """sRGB colour -> linear (Blender material colours are linear)."""
    return tuple(max(0.0, v) ** 2.2 for v in c)


FLOOR = 0.012
KID = 0.070
GIRL = KID * 1.06
PUPIL = KID * 1.04
WALL_Y = 0.246
BX0 = env("BX0", "0.000")                 # his hips x in AU1-AU3 (AU4 ends 2 * STEP to his left, +x)
WALLM_H = env("WALLM_H", "0.118")         # GUESS: height of the Tripo wall + door piece (door about 1.3 x his height)
ROT_WALL = math.radians(env("ROT_WALL", "0"))
DOOR_DX = env("DOOR_DX", "0.040")         # door centre this far to his left of where he stops in AU4 (door ~6 cm wide: he stops beside it)
DOOR_REL = env("DOOR_REL", "0.002")       # door centre in the wall piece (model centre = 0) when the probe finds no opening (door closed)
FRONT_GAP = env("FRONT_GAP", "0.022")     # he stands this far in front of the wall piece
STEP = env("STEP", "0.0060")              # one side step (two steps in AU4)
LIFT_F = 0.0012                           # foot lift in a step
STOOL_K = env("STOOL_K", "0.45")          # stool top above his hip joints, part of hips -> shoulders (11/21: 0.22 -> items out of reach)
# 11/21 round 4 layout (simulated frame by frame without Blender, scratch au_run.py / au_left.py): the stool stands beside his
# right hip but a little FORWARD (back edge 0 mm, front edge 12 mm in front of his standing line), so his elbow (which hangs at
# stool height) always stays behind the seat. Only two things on it: the towel strip on the back row (AU2) and the hourglass on the
# front row (AU3). The shampoo is NOT on the stool any more: it stands on a small round caddy in front of where he stops in AU4,
# for his LEFT hand (the right hand never reaches across the stool again).
STOOL_W, STOOL_D = 0.022, 0.012
CADDY_R, CADDY_T = 0.0030, 0.0015         # caddy top (round) radius / thickness; its top is level with the stool top (v5: 1.8 -> 3.0)
POLE_REST = Vector((-0.2, 1.0, -1.0))     # elbows back and down (an elbow out to his right would hang over the stool)
POLE_AU2 = Vector((-0.6, 0.6, -0.8))
POLE_AU3 = Vector((-0.3, 1.0, -0.6))
RAISE = Vector((0.0, -0.0015, 0.0055))    # resting hand -> first up (and a little forward), then out over the stool
TOWEL_N, TOWEL_L, TOWEL_W, TOWEL_T = 8, 0.014, 0.0050, 0.0008
SH_PAD = env("SH_PAD", "0.0018")          # GUESS: top of the shoulder above the RightArm joint
HG_H, HG_R, HG_POST = 0.0064, 0.0014, 0.0017
BOT_H, BOT_R = 0.0042, 0.0013
CLOCK_Z = env("CLOCK_Z", "0.090")
CLOCK_S = 0.8                             # clock a little smaller than in the other films (the wall piece is lower)
SEAT_HIP = 0.0                            # (Body's seated branch is not used in this film: he always stands)


# ---------- generic helpers (uk_homework.py / egypt_breakfast.py) ----------
def hand_box(cx, cy, cz, ang, length, width, mat, name):
    E.box((cx + length / 2 * math.sin(ang), cy, cz + length / 2 * math.cos(ang)), (width, 0.001, length), mat, name, bevel=0, rot=(0, ang, 0))


def drop(root):
    for o in [root] + list(root.children_recursive): bpy.data.objects.remove(o, do_unlink=True)


def local_dir(ch_loc, face_deg, target, from_z):
    v = Vector(target) - Vector((ch_loc[0], ch_loc[1], from_z)); a = -math.radians(face_deg)
    return (v.x * math.cos(a) - v.y * math.sin(a), v.x * math.sin(a) + v.y * math.cos(a), v.z)


def key_obj(ob, fr, rot=False):
    ob.keyframe_insert("location", frame=fr)
    if rot: ob.keyframe_insert("rotation_euler", frame=fr)


def cam_move(lens, c0, a0, c1, a1, focus=None):
    c, a, fo = E.camera("cam", lens, 8)

    def path(t):
        u = E.ease(t / T)
        return E.vlerp(c0, c1, u), E.vlerp(a0, a1, u), (Vector(focus) if focus else E.vlerp(a0, a1, u))
    E.key_cam(c, a, fo, path)
    return c


def frame_M(o, z, xhint):
    z = Vector(z).normalized(); x = Vector(xhint); x = (x - x.dot(z) * z).normalized(); y = z.cross(x)
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = Vector(o); return M


def blend_M(M0, M1, u):
    u = E.ease(u)
    q = M0.to_3x3().normalized().to_quaternion().slerp(M1.to_3x3().normalized().to_quaternion(), u)
    M = q.to_matrix().to_4x4(); M.translation = M0.translation.lerp(M1.translation, u); return M


def key_M(keys, t):
    if t <= keys[0][0]: return keys[0][1]
    for (t0, a), (t1, b) in zip(keys, keys[1:]):
        if t <= t1: return blend_M(a, b, (t - t0) / max(1e-6, t1 - t0))
    return keys[-1][1]


def Tr(x, y, z):
    return Matrix.Translation((x, y, z))


def rotM(M):
    R = M.to_3x3().normalized().to_4x4(); return R


def mesh_hit(meshes, o, d):
    dg = bpy.context.evaluated_depsgraph_get(); best = None
    for ob in meshes:
        Mi = ob.matrix_world.inverted()
        ok, loc, n, idx = ob.ray_cast(Mi @ o, (Mi.to_3x3() @ d).normalized(), depsgraph=dg)
        if ok:
            p = ob.matrix_world @ loc; dist = (p - o).length
            if best is None or dist < best[0]: best = (dist, p)
    return best[1] if best else None


def set_M(ob, M, fr):
    ob.matrix_world = M; ob.scale = (1, 1, 1); key_obj(ob, fr, rot=True)


def hide(objs):
    for o in objs:
        for c in [o] + list(o.children_recursive): c.hide_render = True


def view_report(tag, pts):
    from bpy_extras.object_utils import world_to_camera_view as w2c
    sc.frame_set(0); bpy.context.view_layer.update()
    for name, p in pts:
        v = w2c(sc, sc.camera, Vector(p() if callable(p) else p))
        print("DESK VIEW %s %s x %.3f y %.3f depth %.3f" % (tag, name, v.x, v.y, v.z), flush=True)


def tri_obj(name, verts, faces, m):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); me.materials.append(m)
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob


# ---------- furniture probing (rays straight down; several hits per column) ----------
def probe(path, H0=0.1, n=56):
    root = E.place(path, H0, (5, 5, 0)); bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(root)
    dg = bpy.context.evaluated_depsgraph_get(); cols = []
    for i in range(n + 1):
        for j in range(n + 1):
            x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * j / n; z = top + 0.05; hs = []
            for _ in range(10):
                ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((x, y, z)), Vector((0, 0, -1)), distance=1.0)
                if not ok: break
                hs.append((loc.z, nrm.z)); z = loc.z - 1e-5
            cols.append((x - 5, y - 5, hs))
    drop(root)
    return cols, top, (x0 - 5, x1 - 5, y0 - 5, y1 - 5)


def level(pts, top, lo, hi):
    pts = [p for p in pts if lo * top < p[2] < hi * top]
    if not pts: return None, []
    bins = {}
    for p in pts: bins.setdefault(int(p[2] / (0.01 * top)), []).append(p)
    best = max(bins, key=lambda b: len(bins.get(b - 1, [])) + len(bins[b]) + len(bins.get(b + 1, [])))
    g = bins.get(best - 1, []) + bins[best] + bins.get(best + 1, [])
    zs = sorted(p[2] for p in g); z = zs[int(len(zs) * 0.9)]
    return z, [p for p in g if abs(p[2] - z) < 0.012 * top]


def bbox2(g):
    return (min(p[0] for p in g), max(p[0] for p in g), min(p[1] for p in g), max(p[1] for p in g))


def rot2(p, a):
    c, s = math.cos(a), math.sin(a); return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)


def rbox(b, a):
    pts = [rot2((x, y), a) for x in b[:2] for y in b[2:]]
    return (min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts))


# ---------- characters ----------
_MOUTH_REF = H._MOUTH_REF


def fwd_of(ch):
    return ch.root.matrix_world.to_3x3().normalized() @ Vector((0, -1, 0))


def metrics(ch):
    """Rest-pose body numbers (lengths, heights above the floor, tummy depth) and the lips offset from the head bone."""
    bpy.context.view_layer.update()
    Aw = ch.arm.matrix_world
    P = lambda b, tail=False: Aw @ (ch.pb[b].tail if tail else ch.pb[b].head)
    ground = ch.root.matrix_world.translation.z - ch.base_z
    fwd = fwd_of(ch); up = Vector((0, 0, 1)); side = fwd.cross(up).normalized()
    hips = P("Hips"); shR, shL = P("RightArm"), P("LeftArm")
    m = dict(hips=hips, root=ch.root.matrix_world.translation.copy(), hip_h=hips.z - ground,
             knee_h=(P("RightLeg").z + P("LeftLeg").z) / 2 - ground, ankle_h=(P("RightFoot").z + P("LeftFoot").z) / 2 - ground,
             thigh=(P("RightLeg") - P("RightUpLeg")).length, upleg_dz=P("RightUpLeg").z - hips.z,
             sh_hips=(shR.z + shL.z) / 2 - hips.z, sh_half=(shR - shL).length / 2,
             upper=(P("RightForeArm") - P("RightArm")).length, fore=(P("RightHand") - P("RightForeArm")).length,
             hand=(P("RightHandMiddle1") - P("RightHand")).length)
    best = 0.0
    for k in range(7):
        z = hips.z + 0.002 + (m["sh_hips"] - 0.002) * k / 6
        for dx in (-0.003, 0.0, 0.003):
            c = Vector((hips.x, hips.y, z)) + side * dx
            p = mesh_hit(ch.meshes, c + fwd * 0.06, -fwd)
            if p is not None: best = max(best, (p - c).dot(fwd))
    m["front"] = best if best > 0.002 else 0.006
    head = P("Head"); mz = env("MOUTH_Z", "0.0005")
    p = mesh_hit(ch.meshes, head + up * mz + fwd * 0.06, -fwd)
    lips = (p - head - up * mz).dot(fwd) if p is not None else None
    my = os.environ.get("MOUTH_Y")
    m["mouth_y"] = float(my) if my else (lips - 0.0002 if lips is not None and 0.004 < lips < 0.016 else 0.0082)
    R = (Aw @ ch.pb["Head"].matrix).to_3x3().normalized()
    _MOUTH_REF[ch.name] = R.inverted() @ (fwd * m["mouth_y"] + up * mz)
    print("DESK BODY %s hip_h %.4f knee_h %.4f ankle_h %.4f thigh %.4f sh_above_hips %.4f sh_half %.4f upper %.4f fore %.4f hand %.4f front %.4f lips_probe %s mouth_y %.4f" % (
        ch.name, m["hip_h"], m["knee_h"], m["ankle_h"], m["thigh"], m["sh_hips"], m["sh_half"], m["upper"], m["fore"], m["hand"], m["front"],
        "%.4f" % lips if lips is not None else "none", m["mouth_y"]), flush=True)
    return m


def animate(ch, fn, after=None):
    for fr in E.frames():
        t = fr / E.FPS; arms, head = fn(t)
        ch.pose(t, arms, twist={"Head": head})
        if after: after(t, fr)
    ch.finish(); return ch


def stand(name, loc, face, fn, after=None, height=KID):
    return animate(E.Char(name, loc, face, height=height), fn, after)


P_LAP = {"RightArm": (-0.3, -0.35, -0.9), "RightForeArm": (0.15, -0.9, -0.35), "LeftArm": (0.3, -0.35, -0.9), "LeftForeArm": (-0.15, -0.9, -0.35)}

# ---------- grips: degrees per finger segment (1, 2, 3), bent towards the palm ----------
G_FLAT = {"Thumb": (5, 6, 4), "Index": (3, 5, 3), "Middle": (3, 5, 3), "Ring": (4, 6, 4), "Pinky": (5, 7, 4)}
G_POINT = {"Thumb": (25, 25, 15), "Index": (0, 0, 0), "Middle": (70, 80, 50), "Ring": (75, 80, 50), "Pinky": (75, 80, 50)}
G_WAVE = {f: (2, 3, 2) for f in FINGERS}
HL = {}


def hand_q(ch, side, fwd_w, palm_w):
    def basis(a, b):
        a = Vector(a).normalized(); b = Vector(b); b = (b - b.dot(a) * a).normalized(); return Matrix((a, b, a.cross(b))).transposed()
    a_l, b_l = HL[(ch.name, side)]
    return (basis(fwd_w, palm_w) @ basis(a_l, b_l).transposed()).to_quaternion()


def set_hand_rot(ch, side, q):
    bpy.context.view_layer.update(); pb = ch.pb[side + "Hand"]
    Ar = ch.arm.matrix_world.to_3x3().normalized()
    N = (Ar.inverted() @ q.to_matrix()).to_4x4(); N.translation = pb.matrix.translation.copy()
    pb.matrix = N


def _hand_twist(ch, side, q):
    """Angle (rad) by which the wanted hand rotation q (world) turns about the FOREARM's own axis, relative to the rest pose."""
    bpy.context.view_layer.update()
    pf, ph = ch.pb[side + "ForeArm"], ch.pb[side + "Hand"]
    R0 = ch.arm.data.bones[pf.name].matrix_local.to_3x3().inverted() @ ch.arm.data.bones[ph.name].matrix_local.to_3x3()
    Rh = ch.arm.matrix_world.to_3x3().normalized().inverted() @ q.to_matrix()
    Rf = pf.matrix.to_3x3().normalized()
    D = (Rf.inverted() @ Rh @ R0.inverted()).to_quaternion()
    tw = 2 * math.atan2(D.y, D.w)
    return (tw + math.pi) % (2 * math.pi) - math.pi, Rf


def untwist(ch, side, q, fr, share=0.8):
    """11/21 SG2 check: a palm-down grab twisted the wrist like a sweet wrapper (the forearm bone kept its rest roll and the hand
    alone turned). Roll the forearm about its own axis by `share` of the hand's turn, so the wrist only takes the rest.
    Call after the arm directions are set and before set_hand_rot(). Returns the hand's total turn in degrees."""
    total = 0.0
    for _ in range(2):                         # twist is measured on the current forearm: two passes converge
        tw, Rf = _hand_twist(ch, side, q)
        if abs(tw) < 1e-4: break
        rot_bone(ch, side + "ForeArm", Rf @ Vector((0, 1, 0)), tw); total += tw
    back = -(1.0 - share) * total
    if abs(back) > 1e-4:
        Rf = _hand_twist(ch, side, q)[1]; rot_bone(ch, side + "ForeArm", Rf @ Vector((0, 1, 0)), back)
    ch.pb[side + "ForeArm"].keyframe_insert("rotation_quaternion", frame=fr)
    return math.degrees(total)


def hand_M(ch, side):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ ch.pb[side + "Hand"].matrix


def wpt(ch, bone, tail=False):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ (ch.pb[bone].tail if tail else ch.pb[bone].head)


def world_vec(ch, v):
    return (ch.arm.matrix_world.to_3x3().normalized() @ v).normalized()


def tblend(a, b, u):
    u = E.ease(u)
    return (a[0].slerp(b[0], u), a[1].lerp(b[1], u), {f: tuple(x + (y - x) * u for x, y in zip(a[2][f], b[2][f])) for f in FINGERS}, a[3].lerp(b[3], u))


def blend_dirs(a, b, u):
    u = E.ease(u)
    return {k: tuple(Vector(a[k]).normalized().lerp(Vector(b[k]).normalized(), u).normalized()) for k in b}


# ---- 11/21 v8: keyed pose == the pose the frame loop built ----
# pb.matrix assignments (rot_bone, set_hand_rot, untwist, curl_hinge, the grip calibrations) also write pose-bone LOCATION / SCALE,
# which were never keyed: every rendered frame then used the leftovers of the last assignment (AU4 keyed check, qa/1121-193525:
# left middle-finger vertices 5 cm above his head). Now every frame starts from location 0 / scale 1 and keys rotation (unit,
# same hemisphere as the previous key), location and scale of every bone.
_QPREV = {}


def reset_ls(ch):
    for b in ch.pb.values(): b.location = (0, 0, 0); b.scale = (1, 1, 1)


def key_all(ch, fr):
    for b in ch.pb.values():
        q = b.rotation_quaternion.normalized(); k = (ch.name, b.name); p = _QPREV.get(k)
        if p is not None and q.dot(p) < 0: q.negate()
        b.rotation_quaternion = q; _QPREV[k] = q.copy()
        b.keyframe_insert("rotation_quaternion", frame=fr); b.keyframe_insert("location", frame=fr); b.keyframe_insert("scale", frame=fr)


def key_hand(ch, side, fr):          # replaces hands.key_hand in this file: key the whole body (see above)
    key_all(ch, fr)



class Body:
    """Seated (hips on the seat, thighs forward, shins straight down) or standing (legs in rest pose); spine lean, head twist;
    arms by two-bone IK, hands turned and fingers curled. Same scheme as egypt_breakfast.py Sit."""

    def __init__(self, ch, M, hips_xy, seat_z=None, lean=(0, 0, 0)):
        self.ch, self.M, self.lean = ch, M, lean
        off = M["hips"] - M["root"]
        if seat_z is not None:
            ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y, seat_z + SEAT_HIP - M["hip_h"]))
            hipj = seat_z + SEAT_HIP + M["upleg_dz"]; dz = (FLOOR + M["knee_h"]) - hipj
            dz = max(-0.95 * M["thigh"], min(0.7 * M["thigh"], dz)); hz = math.sqrt(max(1e-12, M["thigh"] ** 2 - dz * dz))
            self.legs = {"RightUpLeg": (-0.12 * M["thigh"], -hz, dz), "LeftUpLeg": (0.12 * M["thigh"], -hz, dz), "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)}
        else:
            ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y))
            self.legs = {}
        self.pole = {"Right": Vector((-0.7, 0.4, -1.0)), "Left": Vector((0.7, 0.4, -1.0))}

    def body(self, t, arm_dirs, head):
        ch = self.ch
        reset_ls(ch)
        ch.pose(t, dict(self.legs), twist={"Spine1": self.lean, "Head": tuple(head)})
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            if b in arm_dirs: ch._aim(b, arm_dirs[b])
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            ch.pb[b].keyframe_insert("rotation_quaternion", frame=E.f(t))

    def learn_hands(self, head):
        self.body(0, P_LAP, head)
        for s_ in ("Right", "Left"):
            w_, f_, a_, p_ = hand_frame(self.ch, s_)
            HL[(self.ch.name, s_)] = (to_local(self.ch, s_, f_, point=False).normalized(), to_local(self.ch, s_, p_, point=False).normalized())

    def rest(self, side, P, fwd, palm=(0, 0, -1), grip=None):
        f = Vector(fwd).normalized()
        return (hand_q(self.ch, side, f, Vector(palm)), Vector(P) - f * (self.M["hand"] * 0.55) + Vector((0, 0, 0.0014)), grip or G_FLAT, self.pole[side].copy())

    def from_prop(self, side, Md, C, grip, pole=None):
        Mh = Md @ C.inverted()
        return (Mh.to_3x3().normalized().to_quaternion(), Mh.translation.copy(), grip, (pole if pole is not None else self.pole[side]).copy())

    def calibrate(self, side, q, grip, head):
        self.body(0, P_LAP, head); set_hand_rot(self.ch, side, q); curl(self.ch, side, grip)
        return hand_M(self.ch, side)

    def solve(self, t, fr, head, tr, tl, extra=None):
        ch = self.ch
        self.body(t, P_LAP, head)
        arms = {}
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            arms.update(ik_arm(ch, side, g[1], g[3]))
            nd, ar = ik_arm.last
            if fr % 12 == 0 or nd > 0.9 * ar:
                print("DESK REACH %s %s t=%.2f need %.4f arm %.4f (%.0f %%)%s" % (ch.name, side, t, nd, ar, 100 * nd / ar,
                      " WARN over 90 %" if nd > 0.9 * ar else ""), flush=True)
        if extra: arms.update(extra)
        self.body(t, arms, head)
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            tw = untwist(ch, side, g[0], fr)
            if fr % 12 == 0: print("DESK TWIST %s t=%.2f hand turns %.0f deg about the forearm (80 %% taken by the forearm)" % (side, t, tw), flush=True)
            set_hand_rot(ch, side, g[0]); curl(ch, side, g[2]); key_hand(ch, side, fr)
        key_all(ch, fr)


def wave_dirs(t, right=True):
    side = "Right" if right else "Left"
    return {b: v for b, v in E.P_wave(int(t * 3) % 2, right=right).items() if b.startswith(side)}


def stand_dirs(side):
    return {b: v for b, v in E.P_stand().items() if b.startswith(side)}




# ---------- Australia: extra grips and the standing / stepping body ----------
G_PINCH = {"Thumb": (18, 22, 12), "Index": (28, 30, 20), "Middle": (40, 42, 28), "Ring": (55, 55, 35), "Pinky": (60, 55, 35)}
G_PINCH_OPEN = {"Thumb": (8, 10, 5), "Index": (12, 14, 8), "Middle": (18, 20, 12), "Ring": (30, 30, 20), "Pinky": (34, 30, 20)}
# round objects (hourglass frame, shampoo bottle): fingers wrap the front (camera side), thumb round the back (chest side)
G_WRAP = {"Thumb": (30, 25, 12), "Index": (42, 52, 34), "Middle": (45, 55, 36), "Ring": (48, 55, 36), "Pinky": (50, 55, 36)}
G_WRAP_OPEN = {"Thumb": (12, 10, 5), "Index": (15, 18, 12), "Middle": (16, 18, 12), "Ring": (18, 20, 12), "Pinky": (20, 20, 12)}


class Stand(Body):
    """Standing body that can move (side steps): root placed per frame, legs by two-bone IK to planted feet,
    optional forearm roll (hourglass flip: the forearm turns with the hand, so the wrist is not twisted)."""

    def __init__(self, ch, M, hips_xy):
        Body.__init__(self, ch, M, hips_xy, None, (0, 0, 0))
        self.off = M["hips"] - M["root"]

    def place(self, t, hx, hy, drop=0.0):
        self.ch.at(t, loc=(hx - self.off.x, hy - self.off.y, FLOOR - drop))

    def solve2(self, t, fr, head, tr, tl, extra=None, roll=None, legs_fn=None):
        ch = self.ch
        self.legs = {}
        self.body(t, P_LAP, head)
        legs = legs_fn() if legs_fn else {}
        arms = {}
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            arms.update(ik_arm(ch, side, g[1], g[3]))
            nd, ar = ik_arm.last
            if fr % 12 == 0 or nd > 0.9 * ar:
                print("DESK REACH %s %s t=%.2f need %.4f arm %.4f (%.0f %%)%s" % (ch.name, side, t, nd, ar, 100 * nd / ar,
                      " WARN over 90 %" if nd > 0.9 * ar else ""), flush=True)
        if extra: arms.update(extra)
        self.legs = legs
        self.body(t, arms, head)
        self.legs = {}
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            if roll and abs(roll.get(side, 0.0)) > 1e-4:
                bpy.context.view_layer.update(); pb = ch.pb[side + "ForeArm"]
                rot_bone(ch, side + "ForeArm", (pb.tail - pb.head), roll[side])
                pb.keyframe_insert("rotation_quaternion", frame=fr)
            tw = untwist(ch, side, g[0], fr)            # whatever twist is left (none in the flip: the roll took it)
            # 11/21 round 3: the shards round the hand (AU4HF / AU4HS f0010-f0014) came with a 103 deg twist -> WARN over 90
            if fr % 12 == 0 or abs(tw) > 90:
                print("DESK TWIST %s t=%.2f hand turns %.0f deg about the forearm (80 %% taken by the forearm)%s" % (
                    side, t, tw, " WARN over 90 deg (skin shards)" if abs(tw) > 90 else ""), flush=True)
            set_hand_rot(ch, side, g[0]); curl(ch, side, g[2]); key_hand(ch, side, fr)
        key_all(ch, fr)


def leg_ik(ch, side, target, pole=Vector((0, -1, 0.2))):
    """Two-bone leg IK (thigh + shin) that puts the ankle on target (world); knee bends forward (to the camera)."""
    bpy.context.view_layer.update(); mw = ch.arm.matrix_world
    S = mw @ ch.pb[side + "UpLeg"].head; Kb = mw @ ch.pb[side + "Leg"].head; W = mw @ ch.pb[side + "Foot"].head
    a, b = (Kb - S).length, (W - Kb).length
    d = Vector(target) - S; L = max(1e-6, min(d.length, (a + b) * 0.999)); u = d.normalized()
    v = Vector(pole) - Vector(pole).dot(u) * u; v.normalize()
    ca = max(-1.0, min(1.0, (a * a + L * L - b * b) / (2 * a * L)))
    K2 = S + a * (ca * u + math.sqrt(1 - ca * ca) * v); W2 = S + u * L
    Ri = ch.root.matrix_world.to_3x3().normalized().inverted()
    return {side + "UpLeg": tuple(Ri @ (K2 - S).normalized()), side + "Leg": tuple(Ri @ (W2 - K2).normalized())}


def glass_mat():
    if "hgGlass" in E._M: return E._M["hgGlass"]
    m = bpy.data.materials.new("hgGlass"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.95, 0.98, 1.0, 1); b.inputs["Roughness"].default_value = 0.05
    for nm in ("Transmission Weight", "Transmission"):
        if nm in b.inputs: b.inputs[nm].default_value = 1.0; break
    E._M["hgGlass"] = m; return m


def surface_y(x, z):
    """y of the first wall surface seen from the camera side at (x, z) (for things hung on the wall)."""
    dg = bpy.context.evaluated_depsgraph_get()
    ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((x, -0.5, z)), Vector((0, 1, 0)), distance=2.0)
    return loc.y if ok else WALL_Y - 0.006


def gradient_sky(name, c_lo, c_hi, z0, z1, strength):
    """Emission plane with a vertical colour gradient (dusk: orange at the horizon, purple above)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs[1].default_value = strength
    geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = z0; mr.inputs["From Max"].default_value = z1
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (*c_lo, 1); cr.color_ramp.elements[1].color = (*c_hi, 1)
    nt.links.new(geo.outputs["Position"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], cr.inputs["Fac"]); nt.links.new(cr.outputs["Color"], em.inputs[0])
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs[0])
    return m


def probe_wall():
    """Place the wall piece at its film size, find its outline and the door opening (rays from the front at 40 % height:
    the opening is where the rays go deep or through). Returns positions relative to the model centre."""
    root = E.place(f"{PROPS}/australia_bathroom_wall.glb", WALLM_H, (5, 5, 0), rot_z=ROT_WALL); bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(root)
    dg = bpy.context.evaluated_depsgraph_get(); xs, ys = [], []
    for i in range(121):
        x = x0 + (x1 - x0) * i / 120
        ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((x, y0 - 0.05, 0.40 * WALLM_H)), Vector((0, 1, 0)), distance=1.0)
        xs.append(x); ys.append(loc.y if ok else y1 + 0.02)
    srt = sorted(ys); med = srt[len(srt) // 2]
    deep = [y > med + max(0.003, 0.3 * (y1 - y0)) for y in ys]
    runs, cur = [], []
    for x, d_ in zip(xs, deep):
        if d_: cur.append(x)
        elif cur: runs.append(cur); cur = []
    if cur: runs.append(cur)
    drop(root)
    r = max(runs, key=len) if runs else None
    if r is not None and r[-1] - r[0] >= 0.004:
        door_x, door_w = (r[0] + r[-1]) / 2 - 5, r[-1] - r[0]
    else:
        door_x, door_w = DOOR_REL, 0.0
        print("DESK WALL no door opening seen from the front (door closed): door centre DOOR_REL %.4f from the 11/21 check image" % DOOR_REL, flush=True)
    info = dict(box=(x0 - 5, x1 - 5, y0 - 5, y1 - 5), top=top, door_x=door_x, door_w=door_w, front_med=med - 5)
    print("DESK WALL PROBE size %.4f x %.4f x %.4f door centre %.4f (width %.4f) front face y %.4f (model centre 0)" % (
        x1 - x0, y1 - y0, top, door_x, door_w, med - 5), flush=True)
    return info


def hallway(win_x, wall_left, wall_right):
    """Pale yellow board wall (code) left and right of the Tripo wall piece, window with the backyard outside, floorboards."""
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("floorboards", lin((0.70, 0.50, 0.32))), "floor", thick=FLOOR)
    gap = E.mat("boardGap", lin((0.42, 0.28, 0.17)), 0.9)
    for i in range(1, 22):
        E.box((-0.32 + i * 0.029, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), gap, "boardLine", bevel=0)
    yellow = E.felt("boardWall", lin((0.96, 0.88, 0.62)))
    wall = E.box((0, WALL_Y, FLOOR + 0.10), (0.64, 0.012, 0.20), yellow, "backWall")
    line = E.mat("boardWallLine", lin((0.85, 0.75, 0.48)), 0.9)
    for i in range(1, 32):
        x = -0.32 + i * 0.02
        if not (wall_left - 0.002 < x < wall_right + 0.002):
            E.box((x, WALL_Y - 0.0062, FLOOR + 0.10), (0.0006, 0.0006, 0.20), line, "boardWallLine", bevel=0)
    wz0, wz1, ww = FLOOR + 0.042, FLOOR + 0.100, 0.072
    cut = E.box((win_x, WALL_Y, (wz0 + wz1) / 2), (ww, 0.05, wz1 - wz0), E.mat("cutter", (0, 0, 0), 0.5), "winCut", bevel=0)
    mod = wall.modifiers.new("win", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut
    cut.hide_render = True; cut.display_type = "WIRE"
    white = E.mat("paintWhite", lin((0.96, 0.95, 0.92)), 0.5)
    E.box((0, 0.2385, FLOOR + 0.005), (0.64, 0.003, 0.01), white, "skirting", bevel=0)
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.10), (0.012, 0.44, 0.20), E.felt("sideWall", lin((0.94, 0.85, 0.58))), "sideWall")
    zc = (wz0 + wz1) / 2; hh = wz1 - wz0
    for (x, z, sx, sz) in ((win_x - ww / 2 + 0.002, zc, 0.004, hh), (win_x + ww / 2 - 0.002, zc, 0.004, hh), (win_x, wz1 - 0.002, ww, 0.004),
                           (win_x, wz0 + 0.002, ww, 0.004), (win_x, zc, 0.003, hh)):
        E.box((x, 0.243, z), (sx, 0.010, sz), white, "winFrame", bevel=0)
    E.box((win_x, 0.236, wz0 - 0.001), (ww + 0.012, 0.012, 0.004), white, "winSill", bevel=0.0005)
    if win_x + ww / 2 > wall_left - 0.002: print("DESK WARN window runs behind the wall piece (window right %.4f, piece left %.4f)" % (win_x + ww / 2, wall_left), flush=True)


def backyard(win_x):
    E.box((0, 0.62, 0.25), (1.6, 0.004, 0.8), gradient_sky("duskSky", lin((1.0, 0.62, 0.32)), lin((0.42, 0.28, 0.62)), FLOOR + 0.02, FLOOR + 0.20, 1.4), "sky", bevel=0)
    E.box((0, 0.42, FLOOR - 0.004), (1.0, 0.36, 0.008), E.felt("grass", lin((0.42, 0.58, 0.26))), "grass", bevel=0)
    if os.path.exists(f"{PROPS}/australia_backyard.glb"):
        yard = E.place(f"{PROPS}/australia_backyard.glb", env("YARD_H", "0.17"), (win_x + 0.005, WALL_Y + 0.12, FLOOR - 0.004))
        print("DESK YARD backyard model at x %.4f y %.4f height %.4f" % (win_x + 0.005, WALL_Y + 0.12, env("YARD_H", "0.17")), flush=True)
    E.ball((win_x - 0.03, 0.60, FLOOR + 0.06), 0.012, E.emission("sunset", lin((1.0, 0.70, 0.35)), 4.0), "sunsetSun")


def clock(cx, cy, cz, hh, mm, s=1.0):
    """Round wall clock, ticks only (no numbers): hour hand (hh + mm/60) * 30 deg, minute hand mm * 6 deg."""
    E.cyl((cx, cy, cz), 0.026 * s, 0.006, E.mat("clockRim", lin((0.15, 0.45, 0.30)), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0025, cz), 0.0225 * s, 0.004, E.mat("clockFace", (0.98, 0.97, 0.93), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.08, 0.08, 0.12), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.019 * s * math.sin(a), cy - 0.005, cz + 0.019 * s * math.cos(a)), (0.0016 if big else 0.0009) * s, ink, "tick")
    hand_box(cx, cy - 0.0052, cz, math.radians(((hh % 12) + mm / 60) * 30), 0.011 * s, 0.0026 * s, ink, "hourHand")
    hand_box(cx, cy - 0.0058, cz, math.radians(mm * 6), 0.0165 * s, 0.0017 * s, ink, "minuteHand")
    E.ball((cx, cy - 0.006, cz), 0.0018 * s, E.mat("clockPin", lin((0.95, 0.75, 0.15)), 0.4), "clockPin")


def sun_hat(x, z):
    """A hook on the wall and the navy wide-brim school sun hat hanging on it (brim towards the camera)."""
    y = surface_y(x, z)
    E.cyl((x, y - 0.002, z + 0.004), 0.0006, 0.004, E.mat("hook", lin((0.55, 0.40, 0.25)), 0.5), rot=(math.radians(90), 0, 0), verts=10, name="hatHook")
    navy = E.felt("sunHat", lin((0.10, 0.15, 0.35)))
    E.cyl((x, y - 0.0028, z), 0.012, 0.0006, navy, rot=(math.radians(84), 0, 0), verts=40, name="hatBrim")
    E.cyl((x, y - 0.0050, z + 0.0006), 0.0065, 0.0045, navy, rot=(math.radians(84), 0, 0), verts=32, name="hatCrown")
    E.cyl((x, y - 0.0052, z + 0.0006), 0.0067, 0.0012, E.felt("hatBand", lin((0.95, 0.80, 0.20))), rot=(math.radians(84), 0, 0), verts=32, name="hatBand")


def stool(cx, cy, top):
    """Low wooden stool made in code: seat (top at `top`), four splayed legs."""
    wood = E.mat("stoolWood", lin((0.78, 0.56, 0.34)), 0.5); t = 0.0018
    seat = E.box((cx, cy, top - t / 2), (STOOL_W, STOOL_D, t), wood, "stoolSeat", bevel=0.0005)
    for sx in (-1, 1):
        for sy in (-1, 1):
            E.box((cx + sx * (STOOL_W / 2 - 0.0022), cy + sy * (STOOL_D / 2 - 0.0022), (FLOOR + top - t) / 2), (0.0016, 0.0016, top - t - FLOOR), wood, "stoolLeg", bevel=0.0003)
    E.box((cx, cy, FLOOR + (top - FLOOR) * 0.35), (STOOL_W - 0.004, 0.0010, 0.0012), wood, "stoolRail", bevel=0.0002)
    E.obstacle(seat)
    return seat


def football(x, y):
    r = 0.0042
    E.ball((x, y, FLOOR + r), r, E.felt("ballWhite", lin((0.96, 0.96, 0.94))), "football")
    blk = E.felt("ballBlack", lin((0.08, 0.08, 0.09)))
    for (a, b) in ((0, 0.9), (72, 0.3), (144, 0.3), (216, 0.3), (288, 0.3), (36, -0.4), (180, -0.4), (300, -0.5)):
        th, ph = math.radians(a), math.asin(b)
        p = Vector((x + r * math.cos(ph) * math.cos(th), y + r * math.cos(ph) * math.sin(th), FLOOR + r + r * math.sin(ph)))
        d = E.ball(tuple(p), 0.0013, blk, "ballPatch"); d.scale = (1, 1, 0.35)
        d.rotation_mode = "QUATERNION"; d.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((p - Vector((x, y, FLOOR + r))).normalized())


def stick_to_bone(ob, ch, bone):
    """Parent ob to a bone keeping where it is now (it then moves with that bone)."""
    bpy.context.view_layer.update()
    Mw = ob.matrix_world.copy()
    ob.parent = ch.arm; ob.parent_type = "BONE"; ob.parent_bone = ch.pb[bone].name
    bpy.context.view_layer.update()
    ob.matrix_world = Mw


def mud(ch):
    """A little dried mud on the front of both knees (stuck to the shin bones)."""
    mudm = E.felt("mud", lin((0.40, 0.28, 0.16)))
    fwd = fwd_of(ch)
    for side in ("Right", "Left"):
        k = wpt(ch, side + "Leg")
        p = mesh_hit(ch.meshes, k + fwd * 0.05 + Vector((0, 0, -0.001)), -fwd)
        if p is None: p = k + fwd * 0.003
        for j, (dx, dz, r) in enumerate(((0.0, -0.0006, 0.0011), (0.0009, 0.0004, 0.0007), (-0.0008, 0.0006, 0.0006))):
            b = E.ball(tuple(p + Vector((dx, 0, dz)) - fwd * 0.0001), r, mudm, "mud"); b.scale = (1, 0.35, 0.8)
            stick_to_bone(b, ch, side + "Leg")


def make_towel():
    m = E.felt("towel", lin((0.20, 0.66, 0.70))); stripe = E.felt("towelStripe", lin((0.98, 0.85, 0.25)))
    segs = []
    for i in range(TOWEL_N):
        # an empty per piece: set_M() resets scale to 1, and E.box keeps its size in the object scale
        e = E.empty("towelSeg%d" % i); e.rotation_mode = "XYZ"
        o = E.box((0, 0, 0), (TOWEL_W, TOWEL_T, TOWEL_L / TOWEL_N * 1.15), stripe if i in (0, TOWEL_N - 1) else m, "towel%d" % i, bevel=0.00025)
        o.parent = e; segs.append(e)
    return segs


def resample(pts, n, length):
    """n + 1 points spaced length / n along the polyline pts (keeps going along the last piece if it is short)."""
    seg = length / n; out = [pts[0].copy()]; i = 0; pos = pts[0].copy(); left = seg
    while len(out) < n + 1:
        if i >= len(pts) - 1:
            d = (pts[-1] - pts[-2]).normalized() if len(pts) > 1 else Vector((-1, 0, 0))
            pos = pos + d * left; out.append(pos.copy()); left = seg; continue
        a, b = pos, pts[i + 1]; L = (b - a).length
        if L >= left:
            pos = a + (b - a).normalized() * left; out.append(pos.copy()); left = seg
        else:
            left -= L; pos = b.copy(); i += 1
    return out


def put_towel(segs, pts, fr):
    for i, o in enumerate(segs):
        a, b = pts[i], pts[i + 1]; z = (b - a)
        if z.length < 1e-7: z = Vector((-1, 0, 0))
        z.normalize(); v = abs(z.z)
        n = (Vector((0, 0, 1)) * (1 - v) + Vector((0, -1, 0)) * v); n = (n - n.dot(z) * z)
        if n.length < 1e-6: n = Vector((0, -1, 0))
        n.normalize()
        set_M(o, frame_M((a + b) / 2, z, n.cross(z)), fr)


def make_hourglass():
    """Four-minute shower hourglass. Empty at the waist centre, local z = its axis. Two sets of sand: 'before' (all in bulb B at -z)
    and 'after the flip' (B is up: sand above the neck, a thin stream, a small pile in A)."""
    emp = E.empty("hourglass"); emp.rotation_mode = "XYZ"
    wood = E.mat("hgWood", lin((0.55, 0.35, 0.18)), 0.5); glass = glass_mat(); sand = E.felt("sand", lin((0.95, 0.75, 0.40)))
    parts = []
    for s in (-1, 1):
        parts.append(E.cyl((0, 0, s * (HG_H / 2 - 0.00025)), 0.0019, 0.0005, wood, verts=24, name="hgCap"))
        b = E.ball((0, 0, s * 0.0016), HG_R, glass, "hgBulb"); b.scale = (1, 1, 1.05); parts.append(b)
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.5
        parts.append(E.cyl((HG_POST * math.cos(a), HG_POST * math.sin(a), 0), 0.00018, HG_H - 0.0004, wood, verts=8, name="hgPost"))
    parts.append(E.cyl((0, 0, 0), 0.00022, 0.0008, glass, verts=12, name="hgNeck"))
    before = E.cone((0, 0, -0.0022), 0.0012, 0.0003, 0.0016, sand, verts=20, name="sandBefore")
    top_s = E.cone((0, 0, -0.0011), 0.0012, 0.0004, 0.0014, sand, verts=20, name="sandTop")
    stream = E.cyl((0, 0, 0.0012), 0.00008, 0.0030, sand, verts=6, name="sandStream")
    pile = E.cone((0, 0, 0.0026), 0.0002, 0.0010, 0.0006, sand, verts=20, name="sandPile")
    for o in parts + [before, top_s, stream, pile]: o.parent = emp
    return emp, before, (top_s, stream, pile)


def make_bottle():
    """Shampoo bottle: empty at the bottom centre, cap up (local +z)."""
    emp = E.empty("shampoo"); emp.rotation_mode = "XYZ"
    body = E.mat("bottleBody", lin((0.95, 0.55, 0.70)), 0.3); cap = E.mat("bottleCap", lin((0.98, 0.98, 0.98)), 0.3)
    lab = E.felt("bottleLabel", lin((0.98, 0.92, 0.55)))
    parts = [E.cyl((0, 0, BOT_H / 2), BOT_R, BOT_H, body, verts=24, name="bottleBody"),
             E.cyl((0, 0, BOT_H * 0.45), BOT_R * 1.01, BOT_H * 0.35, lab, verts=24, name="bottleLabel"),
             E.cyl((0, 0, BOT_H + 0.0004), BOT_R * 0.55, 0.0008, cap, verts=16, name="bottleCap"),
             E.cyl((0, 0, BOT_H + 0.0009), BOT_R * 0.5, 0.0003, cap, verts=16, name="bottleCapTop")]
    for o in parts: o.parent = emp
    return emp


def caddy(cx, cy, top):
    """Small round wooden pedestal stand for the shampoo (made in code; 11/21 checks: a post / thin legs read as a lamp post from
    the wide camera): round top 6 mm across with a rim, a THICK turned column (4 mm at the foot, 3 mm under the top), a round foot.
    Same wood as the stool."""
    wood = E.mat("stoolWood", lin((0.78, 0.56, 0.34)), 0.5); dark = E.mat("caddyRim", lin((0.62, 0.42, 0.24)), 0.5)
    disc = E.cyl((cx, cy, top - CADDY_T / 2), CADDY_R, CADDY_T, wood, verts=40, name="caddyTop")
    E.cyl((cx, cy, top - CADDY_T - 0.0004), CADDY_R * 0.85, 0.0008, dark, verts=40, name="caddyApron")
    z0, z1 = FLOOR + 0.0016, top - CADDY_T - 0.0008
    E.cone((cx, cy, (z0 + z1) / 2), 0.0020, 0.0015, z1 - z0, wood, verts=32, name="caddyColumn")
    E.cyl((cx, cy, z0 + (z1 - z0) * 0.30), 0.0023, 0.0012, dark, verts=32, name="caddyRing")
    E.cyl((cx, cy, FLOOR + 0.0008), 0.0030, 0.0016, wood, verts=40, name="caddyFoot")
    E.obstacle(disc)
    return disc


# ================= build =================
ch = E.Char("australia_boy", (0.30, -0.15), 0, height=PUPIL)


def skin_audit(ch, fix=True):
    """11/21 v6 check: long skin-coloured shards from the LEFT hand towards the right hand (AU4 f0082 / f0102). Check the skin:
    vertex groups with no bone of that name (such vertices do not follow the pose), vertices with little weight on real bones,
    and Left* / Right* weights on vertices on the wrong side of the body (x = 0). With fix=True the wrong-side weights are removed
    and the rest renormalised. (Offline check of australia_boy.glb 11/21: no cross-hand weights, all weight sums 1.000, so this
    is expected to find nothing; it proves it inside Blender too.)"""
    bones = set(ch.arm.data.bones.keys())
    for ob in ch.meshes:
        vg = ob.vertex_groups; names = {g.index: g.name for g in vg}
        missing = [n for n in names.values() if n not in bones]
        vs = ob.data.vertices
        lx = [v.co.x for v in vs for g in v.groups if "LeftHand" in names[g.group] and g.weight > 0.5]
        sL = 1.0 if (sum(lx) / max(1, len(lx))) > 0 else -1.0
        zs = [v.co.z for v in vs]; ys = [v.co.y for v in vs]; Hh = max(max(zs) - min(zs), max(ys) - min(ys))
        T = 0.03 * Hh
        low, wrong, fixed = 0, [], 0
        for v in vs:
            tot = sum(g.weight for g in v.groups if names[g.group] in bones)
            if tot < 0.5: low += 1
            bad = [g for g in v.groups if g.weight > 0.01 and (("Left" in names[g.group] and v.co.x * sL < -T) or ("Right" in names[g.group] and v.co.x * sL > T))]
            if bad: wrong.append((v.index, [(names[g.group], round(g.weight, 3)) for g in bad]))
            if bad and fix:
                keep = [(names[g.group], g.weight) for g in v.groups if g not in bad and names[g.group] in bones]
                for g in bad: vg[g.group].remove([v.index])
                sk = sum(w for n, w in keep)
                if sk > 1e-6:
                    for n, w in keep: vg[n].add([v.index], w / sk, "REPLACE")
                fixed += 1
        print("DESK SKIN %s: %d verts, %d groups, groups without a bone %s, verts with < 0.5 weight on real bones %d, wrong-side Left/Right weights %d (fixed %d)%s" % (
            ob.name, len(vs), len(names), missing[:8] or "none", low, len(wrong), fixed, (" e.g. %s" % wrong[:5]) if wrong else ""), flush=True)


skin_audit(ch)
M_ = metrics(ch)
mud(ch)
WI = probe_wall()
HEAD0 = Vector((0, 0, -1))
X_END = BX0 + 2 * STEP
DOOR_X = X_END + DOOR_DX
WX = DOOR_X - WI["door_x"]
WY = (WALL_Y - 0.006) - WI["box"][3]
wall_root = E.place(f"{PROPS}/australia_bathroom_wall.glb", WALLM_H, (WX, WY, FLOOR), rot_z=ROT_WALL)
E.obstacle(wall_root)
W_LEFT, W_RIGHT = WX + WI["box"][0], WX + WI["box"][1]
BY = WY + WI["front_med"] - FRONT_GAP
print("DESK WALL placed centre (%.4f, %.4f) x %.4f..%.4f door x %.4f; he stands at y %.4f (AU1-3 x %.4f, AU4 ends x %.4f)" % (
    WX, WY, W_LEFT, W_RIGHT, DOOR_X, BY, BX0, X_END), flush=True)
WIN_X = min(BX0 - 0.045, W_LEFT - 0.040)
hallway(WIN_X, W_LEFT, W_RIGHT); backyard(WIN_X)
CLOCK_X = DOOR_X + 0.045
cy_ = surface_y(CLOCK_X, FLOOR + CLOCK_Z) - 0.0035
CLOCK = (CLOCK_X, cy_, FLOOR + CLOCK_Z)
clock(CLOCK[0], CLOCK[1], CLOCK[2], 7, 15, CLOCK_S)
HAT_X = W_LEFT + 0.014 if W_LEFT + 0.014 < DOOR_X - 0.040 else BX0 - 0.030
if abs(HAT_X - WIN_X) < 0.050: HAT_X = WIN_X + 0.052
sun_hat(HAT_X, FLOOR + 0.095)
E.box((BX0 + 0.012, BY - 0.004, FLOOR + 0.0004), (0.070, 0.030, 0.0008), E.felt("runner", lin((0.75, 0.30, 0.20))), "runner", bevel=0)

S = Stand(ch, M_, (BX0, BY))
S.learn_hands(HEAD0)
# his right arm rests a little forward, in front of the thigh (11/21: hanging straight down it went under the stool seat)
# 11/21 second check: a straight resting arm sat at 97-99 % reach (stiff) -> elbow bent about 55 deg, hand in front of the hip
# 11/21 third check: still 91 % -> forearm almost level (reach 83 %), hand in front of the right thigh, a little inwards
P_REST = dict(E.P_stand()); P_REST.update({"RightArm": (-0.12, -0.10, -1), "RightForeArm": (0.15, -0.94, -0.30)})
# AU4 only: the left arm bent the same way (its hand then takes the shampoo from the caddy)
P_REST_L = {"LeftArm": (0.12, -0.10, -1), "LeftForeArm": (-0.15, -0.94, -0.30)}
S.body(0, P_REST, HEAD0)
mouth0 = mouth(ch)
SHR, SHL = wpt(ch, "RightArm"), wpt(ch, "LeftArm")
HIPS0 = wpt(ch, "Hips")
ANK_L0, ANK_R0 = wpt(ch, "LeftFoot"), wpt(ch, "RightFoot")
HIPJ_L0, HIPJ_R0 = wpt(ch, "LeftUpLeg"), wpt(ch, "RightUpLeg")
LEG_L = ((wpt(ch, "LeftLeg") - HIPJ_L0).length + (ANK_L0 - wpt(ch, "LeftLeg")).length) * 0.998
hand_out = min(wpt(ch, b, tl).x for b, tl in (("RightHand", False), ("RightHandMiddle1", False), ("RightHandThumb3", True), ("RightHandPinky3", True)))
STOOL_TOP = HIPS0.z + STOOL_K * M_["sh_hips"]
# 11/21 first check: towel / hourglass / shampoo were 105-109 % of his arm away. The stool now stands right beside his right hip
# (near edge 5 mm outside the shoulder joint), the three things in one row along that edge, beside him (not in front).
STOOL_X1 = SHR.x - env("STOOL_IN", "0.0052")
STOOL_CX, STOOL_CY = STOOL_X1 - STOOL_W / 2, BY - 0.006       # round 4: back edge on his standing line, front edge 12 mm forward
if hand_out < STOOL_X1 + 0.0004: print("DESK WARN his resting right hand reaches x %.4f, over the stool edge %.4f" % (hand_out, STOOL_X1), flush=True)
seat = stool(STOOL_CX, STOOL_CY, STOOL_TOP)
print("DESK STAND hips %s shR %s mouth %s hanging right hand reaches x %.4f -> stool x %.4f..%.4f top %.4f (hips %.4f, shoulder %.4f)" % (
    tuple(round(v, 4) for v in HIPS0), tuple(round(v, 4) for v in SHR), tuple(round(v, 4) for v in mouth0), hand_out,
    STOOL_X1 - STOOL_W, STOOL_X1, STOOL_TOP, HIPS0.z, SHR.z), flush=True)
# things on the stool (round 4): towel strip on the back row (its end 1.2 mm over the near edge), hourglass on the front row
TY = BY - 0.0030
P0_LIE = Vector((STOOL_X1 + 0.0012, TY, STOOL_TOP + TOWEL_T / 2))
LIE_PTS = [P0_LIE + Vector((-TOWEL_L * i / TOWEL_N, 0, 0)) for i in range(TOWEL_N + 1)]
HG_HOME = Vector((STOOL_X1 - 0.0021, BY - 0.0080, STOOL_TOP + HG_H / 2))
# shampoo on the caddy: in front of where he stops in AU4, 6.7 mm outside his LEFT shoulder (mirror of the hourglass reach)
CADDY_X, CADDY_Y = SHL.x + (X_END - BX0) + 0.0067, BY - 0.0080
caddy(CADDY_X, CADDY_Y, STOOL_TOP)
BOT_HOME = Vector((CADDY_X, CADDY_Y, STOOL_TOP))
print("DESK LAYOUT stool x %.4f..%.4f y %.4f..%.4f | towel end %s | hourglass %s | shampoo on the caddy %s (left shoulder at the AU4 stop x %.4f)" % (
    STOOL_X1 - STOOL_W, STOOL_X1, STOOL_CY - STOOL_D / 2, STOOL_CY + STOOL_D / 2, tuple(round(v, 4) for v in P0_LIE),
    tuple(round(v, 4) for v in HG_HOME), tuple(round(v, 4) for v in BOT_HOME), SHL.x + (X_END - BX0)), flush=True)
football(BX0 + 0.019, BY - 0.031)                  # on the floor in front of him, to his left (11/21: looked as if between his feet)
towel = make_towel()
hg, sand_before, sand_after = make_hourglass()
bottle = make_bottle()
# the towel over his right shoulder, defined on the clavicle bone (it moves with the shoulder once it lies there)
CLAV = "RightShoulder" if "RightShoulder" in ch.pb else "Spine2"


def bone_M(name):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ ch.pb[name].matrix


chest = mesh_hit(ch.meshes, Vector((SHR.x + 0.002, SHR.y - 0.05, SHR.z - 0.004)), Vector((0, 1, 0)))
chest_y = chest.y if chest is not None else SHR.y - 0.005
ox = SHR.x - 0.0015
DRAPE = resample([Vector((ox, chest_y - 0.0012, SHR.z - 0.0065)), Vector((ox, chest_y - 0.0008, SHR.z + SH_PAD * 0.5)),
                  Vector((ox, SHR.y, SHR.z + SH_PAD)), Vector((ox, SHR.y + 0.0030, SHR.z + SH_PAD * 0.5)),
                  Vector((ox, SHR.y + 0.0045, SHR.z - 0.009))], TOWEL_N, TOWEL_L)
B0 = bone_M(CLAV); DRAPE_LOC = [B0.inverted() @ p for p in DRAPE]
print("DESK TOWEL drape over the right shoulder: front end %s top %s back end %s (shoulder joint %s, chest front y %.4f, bone %s)" % (
    tuple(round(v, 4) for v in DRAPE[0]), tuple(round(v, 4) for v in DRAPE[TOWEL_N // 2]), tuple(round(v, 4) for v in DRAPE[-1]),
    tuple(round(v, 4) for v in SHR), chest_y, CLAV), flush=True)


def drape_now():
    B = bone_M(CLAV); return [B @ p for p in DRAPE_LOC]


L0_TOWEL = Vector((STOOL_X1, TY, STOOL_TOP + TOWEL_T / 2))     # where the lifted towel leaves the stool's near edge


def hang(p0, free=False):
    """Towel held by one end at p0: a straight piece from the hand to where it leaves the stool's near edge, the rest still lying
    on the stool; once all of it has been lifted (free) it hangs straight down (on the stool top or the floor if it reaches them)."""
    L0 = L0_TOWEL
    d = (p0 - L0).length
    if not free and d < TOWEL_L - 1e-4:
        rest = TOWEL_L - d
        return resample([p0, L0, L0 + Vector((-rest - 0.001, 0, 0))], TOWEL_N, TOWEL_L)
    pts = [p0.copy()]; p = p0.copy()
    for i in range(TOWEL_N):
        on_stool = (STOOL_X1 - STOOL_W - 0.001 < p.x < STOOL_X1 + 0.0005) and abs(p.y - STOOL_CY) < STOOL_D / 2
        sup = (STOOL_TOP if on_stool else FLOOR) + TOWEL_T / 2
        q = p + Vector((0, 0, -TOWEL_L / TOWEL_N))
        if q.z < sup: q = Vector((p.x - TOWEL_L / TOWEL_N, p.y, sup))
        pts.append(q); p = q
    return pts


def mix_pts(a, b, u):
    u = E.ease(u); return resample([p.lerp(q, u) for p, q in zip(a, b)], TOWEL_N, TOWEL_L)


def place_sand(fr, flipped, k):
    """k = 0..1 how far the 4-minute sand has run (only a little during the film)."""
    sand_before.hide_render = flipped; sand_before.keyframe_insert("hide_render", frame=fr)
    for o in sand_after:
        o.hide_render = not flipped; o.keyframe_insert("hide_render", frame=fr)
    top_s, stream, pile = sand_after
    s1 = 1.0 - 0.18 * k; top_s.scale = (s1, s1, s1); top_s.keyframe_insert("scale", frame=fr)
    s2 = 0.55 + 0.6 * k; pile.scale = (s2, s2, s2); pile.keyframe_insert("scale", frame=fr)


HG_UP = frame_M(HG_HOME, Vector((0, 0, 1)), Vector((1, 0, 0)))
BOT_M = frame_M(BOT_HOME, Vector((0, 0, 1)), Vector((1, 0, 0)))

# --- calibrate grips (hand-local frames of the props) ---
#   towel end: right hand from above-right of the end, thumb ON the towel, fingers under it (pinch point = thumb / index tips)
Q_PT = hand_q(ch, "Right", Vector((-0.75, -0.25, -0.60)), Vector((-0.55, 0.0, -0.83)))
Mh = S.calibrate("Right", Q_PT, G_PINCH, HEAD0)
C_PT = Mh.inverted() @ Matrix.Translation((wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex3", True)) / 2)
HSCALE = Mh.to_3x3().col[0].length            # world size of one hand-local unit (the rig's armature scale)
#   round objects (hourglass frame r 1.9 mm, bottle r 1.3 mm): hand on the OUTER side, palm towards his middle and a little up,
#   fingers forward round the camera side, thumb round the chest side (right hand: outer = -x; left hand: outer = +x)


def wrap_C(radius, side="Right"):
    sx = 1.0 if side == "Right" else -1.0
    Mh = S.calibrate(side, hand_q(ch, side, Vector((0.12 * sx, -1.0, -0.10)), Vector((0.85 * sx, 0.10, 0.45))), G_WRAP, HEAD0)
    _w, _f, _a, _p = hand_frame(ch, side); palm_w = world_vec(ch, _p)
    pc = (wpt(ch, side + "Hand") + wpt(ch, side + "HandMiddle1")) / 2
    gc = pc + palm_w * (0.0007 + radius)
    th = wpt(ch, side + "HandThumb3", True); fi = wpt(ch, side + "HandMiddle3", True)
    print("DESK GRIP %s wrap r %.4f palm %s thumb_y %+.4f fingers_y %+.4f from the axis (thumb > 0 = chest side, fingers < 0 = camera side)" % (
        side, radius, tuple(round(v, 2) for v in palm_w), th.y - gc.y, fi.y - gc.y), flush=True)
    return Mh.inverted() @ frame_M(gc, Vector((0, 0, 1)), Vector((1, 0, 0)))


C_HG = wrap_C(HG_POST + 0.0002)
# shampoo: LEFT hand, held at 3/4 of its height (11/21 dry run with the 6 mm caddy top: wrist / forearm stay >= 0.9 mm clear)
C_BOT = wrap_C(BOT_R, "Left") @ Tr(0, 0, -BOT_H * 0.75)     # v5: higher grip over the wider caddy top


def fit_wrap(side, radius, grip, pad=0.00035):
    """11/21 v5 check (AU4HS f0082): skin shards round the left hand on the thin shampoo bottle. G_WRAP was set up on the
    hourglass (r 1.9 mm); on the bottle (r 1.3 mm) the same bends drive the finger tips through it. Per finger, scale its bends
    down until every finger joint / tip stays `pad` (finger skin) outside the bottle surface, and cap each joint at 90 deg.
    Measured in the calibration pose (the grip is hand-local, so it holds for every frame). Prints the bends and the depths."""
    sx = 1.0 if side == "Right" else -1.0
    q = hand_q(ch, side, Vector((0.12 * sx, -1.0, -0.10)), Vector((0.85 * sx, 0.10, 0.45)))

    def depth(g, f):
        S.calibrate(side, q, g, HEAD0)
        _w, _f, _a, _p = hand_frame(ch, side); palm_w = world_vec(ch, _p)
        gc = (wpt(ch, side + "Hand") + wpt(ch, side + "HandMiddle1")) / 2 + palm_w * (0.0007 + radius)
        pts = [wpt(ch, "%sHand%s%d" % (side, f, k)) for k in (2, 3)] + [wpt(ch, "%sHand%s3" % (side, f), True)]
        if "%sHand%s4" % (side, f) in ch.pb: pts.append(wpt(ch, "%sHand%s4" % (side, f), True))     # tip bone, if the rig has one
        return max(radius + pad - math.hypot(p_.x - gc.x, p_.y - gc.y) for p_ in pts)
    out = {}
    for f in FINGERS:
        base = tuple(min(90.0, a) for a in grip[f]); lo, hi = 0.25, 1.0
        g = dict(grip); g[f] = base
        if depth(g, f) <= 0.0: out[f] = base; continue
        for _ in range(8):
            mid = (lo + hi) / 2; g[f] = tuple(a * mid for a in base)
            if depth(g, f) <= 0.0: lo = mid
            else: hi = mid
        out[f] = tuple(round(a * lo, 1) for a in base)
    for f in FINGERS:
        d_ = depth(out, f)
        print("DESK GRIP FIT %s r %.4f %-6s bends %s (max joint %.0f deg, total %.0f deg) skin depth into the bottle %.4f%s" % (
            side, radius, f, out[f], max(out[f]), sum(out[f]), d_ + pad, " WARN over 0.3 mm" if d_ + pad > 0.0003 else ""), flush=True)
    return out


G_BOT = fit_wrap("Left", BOT_R, G_WRAP)
G_BOT_OPEN = {f: tuple(min(a, b) for a, b in zip(G_WRAP_OPEN[f], G_BOT[f])) for f in FINGERS}
S.body(0, {**P_REST, **P_REST_L}, HEAD0)
REST_L = (hand_M(ch, "Left").to_3x3().normalized().to_quaternion(), hand_M(ch, "Left").translation.copy(), G_RELAX, Vector((0.2, 1.0, -1.0)))
S.body(0, P_REST, HEAD0)
REST_R = (hand_M(ch, "Right").to_3x3().normalized().to_quaternion(), hand_M(ch, "Right").translation.copy(), G_RELAX, POLE_REST.copy())
RAISE_R = (REST_R[0], REST_R[1] + RAISE, G_RELAX, POLE_REST.copy())
RAISE_L = (REST_L[0], REST_L[1] + Vector((-RAISE.x, RAISE.y, RAISE.z)), G_RELAX, REST_L[3].copy())


def nat_q(side, W, pole, fwd):
    """Hand turn with NO twist about the forearm (only a wrist bend) that points the fingers along fwd, the wrist at W.
    11/21 round 3: the shards round the hand came with a 100-120 deg twist; a pinch can be made with any palm turn, so the
    towel pinches use the arm's own (untwisted) turn."""
    S.body(0, P_REST, HEAD0); d = ik_arm(ch, side, W, pole); S.body(0, {**P_REST, **d}, HEAD0)
    bpy.context.view_layer.update()
    bf, bh = ch.pb[side + "ForeArm"].bone, ch.pb[side + "Hand"].bone   # ch.pb maps the short names (the armature bones carry a prefix; 11/21 KeyError)
    R0 = bf.matrix_local.to_3x3().inverted() @ bh.matrix_local.to_3x3()
    Qn = ch.arm.matrix_world.to_3x3().normalized() @ ch.pb[side + "ForeArm"].matrix.to_3x3().normalized() @ R0
    cur = (Qn @ HL[(ch.name, side)][0]).normalized()
    q = (cur.rotation_difference(Vector(fwd).normalized()).to_matrix() @ Qn).to_quaternion()
    S.body(0, P_REST, HEAD0)
    return q


def pinch_at(q, P, grip, pole):
    """Right-hand target with turn q whose pinch point (thumb / index tips) is at P."""
    return (q, P - HSCALE * (q.to_matrix() @ C_PT.translation), grip, pole.copy())


def pinch_nat(P, fwd, pole):
    q = Q_PT
    for _ in range(3): q = nat_q("Right", pinch_at(q, P, G_PINCH, pole)[1], pole, fwd)
    return q


def forearm_dir_at(Mprop, C, pole):
    """His horizontal forearm direction when the right hand holds a prop at Mprop (scratch pose on frame 0)."""
    g = S.from_prop("Right", Mprop, C, G_WRAP, pole)
    S.body(0, P_REST, HEAD0); d = ik_arm(ch, "Right", g[1], g[3]); S.body(0, {**P_REST, **d}, HEAD0)
    fa = wpt(ch, "RightHand") - wpt(ch, "RightForeArm"); fa.z = 0
    S.body(0, P_REST, HEAD0)
    return fa.normalized() if fa.length > 1e-6 else Vector((0, -1, 0))


# ---- AU3 flip (round 4): the hand stays where it is and turns about his own forearm (half a turn, over the top); the hourglass,
# held on the palm side, swings round the forearm and lands ~6 mm further out, on the place where the towel lay. His hand ends
# on the INNER side of it, so letting go and pulling back never crosses the hourglass (11/21: fist on top / arm through it).
HG_LIFT_Z = 0.0028
FLIP_AXIS = forearm_dir_at(HG_UP, C_HG, POLE_AU3)
HG_LIFT = Tr(0, 0, HG_LIFT_Z) @ HG_UP
W_FLIP = S.from_prop("Right", HG_LIFT, C_HG, G_WRAP, POLE_AU3)[1]          # his wrist while it turns


def hg_flip(ph):
    return Matrix.Translation(W_FLIP) @ Matrix.Rotation(ph, 4, FLIP_AXIS) @ Matrix.Translation(-W_FLIP) @ HG_LIFT


HG_FLIPPED = hg_flip(math.pi)


def hg_turned(lift=0.0):
    """The hourglass upside down where it lands (lift above the stool, m)."""
    return Tr(0, 0, HG_HOME.z + lift - HG_FLIPPED.translation.z) @ HG_FLIPPED


HG_END = hg_turned(0.0)
_e = HG_END.translation
if not (STOOL_X1 - STOOL_W + 0.0019 < _e.x < STOOL_X1 - 0.0019 and abs(_e.y - STOOL_CY) < STOOL_D / 2 - 0.0019):
    print("DESK WARN the turned hourglass lands off the stool at %s" % (tuple(round(v, 4) for v in _e),), flush=True)
_low = min((hg_flip(math.pi * k / 12) @ Vector((sx * HG_POST, 0, sz * HG_H / 2))).z for k in range(13) for sx in (-1, 1) for sz in (-1, 1))
print("DESK FLIP axis (his forearm at the grab) %s, wrist %s, hourglass lands at %s (%.4f from where it stood), lowest corner while turning %.4f above the stool" % (
    tuple(round(v, 3) for v in FLIP_AXIS), tuple(round(v, 4) for v in W_FLIP), tuple(round(v, 4) for v in _e),
    (_e - HG_HOME).length, _low - STOOL_TOP), flush=True)

# ---- AU2 towel pinch turns (no forearm twist) at the keys of the path ----
FT, FD = Vector((-0.75, -0.25, -0.60)), Vector((-0.20, -0.85, -0.45))
AU2_LIFT = Vector((-0.0015, 0.0025, 0.0090))              # lift the end up and a little back (11/21: outwards went by the hourglass)
AU2_PRE = Vector((0.0008, 0.0, 0.0035))
D0 = DRAPE[0]
Q_GRAB = pinch_nat(P0_LIE, FT, POLE_AU2)
Q_PRE = pinch_nat(P0_LIE + AU2_PRE, FT, POLE_AU2)
Q_LIFT = pinch_nat(P0_LIE + AU2_LIFT, FT, POLE_AU2)
Q_CHEST = pinch_nat(D0, FD, POLE_AU2)
Q_CHEST0 = pinch_nat(D0 + Vector((0, -0.0015, -0.0015)), FD, POLE_AU2)

# ---- clearance of his arms / hands from the props he is NOT holding (11/21: AU4 forearm went through the hourglass) ----


def limb_points(side="Right", hand=True):
    LIMB = ((side + "Arm", side + "ForeArm", 0.0013), (side + "ForeArm", side + "Hand", 0.0011), (side + "Hand", side + "HandMiddle1", 0.0009))
    pts = []
    for a, b, r in LIMB[:3 if hand else 2]:
        A, B = wpt(ch, a), wpt(ch, b)
        pts += [(A.lerp(B, k / 5), r) for k in range(6)]
    if hand:
        for f in ("Thumb", "Index", "Middle", "Pinky"):
            pts.append((wpt(ch, "%sHand%s3" % (side, f), True), 0.0004))
    return pts


def cyl_gap(pts, c, r, z0, z1):
    """Smallest gap between the limb (spheres) and an upright cylinder (centre c, radius r, z0..z1); < 0 = inside."""
    best = 9.0
    for q, rr in pts:
        dxy = math.hypot(q.x - c.x, q.y - c.y) - r; dz = max(z0 - q.z, q.z - z1)
        d = math.hypot(max(dxy, 0.0), max(dz, 0.0)) if (dxy > 0 or dz > 0) else max(dxy, dz)
        best = min(best, d - rr)
    return best


def stool_gap(pts):
    """Smallest gap between the limb spheres and the stool seat (a slab); < 0 = inside."""
    best = 9.0
    for q, rr in pts:
        dx = max(STOOL_X1 - STOOL_W - q.x, q.x - STOOL_X1, 0.0); dy = max(abs(q.y - STOOL_CY) - STOOL_D / 2, 0.0)
        dz = max(STOOL_TOP - 0.0018 - q.z, q.z - STOOL_TOP, 0.0)
        d = math.sqrt(dx * dx + dy * dy + dz * dz)
        best = min(best, (d if d > 0 else -0.0001) - rr)
    return best


def check_clear(tag, t, fr, props, side="Right", hand_on=None):
    """props: [(name, centre, radius, z0, z1)]. WARN when an arm / hand comes within 0.5 mm of one, or of the stool seat / caddy top.
    hand_on: 'stool' or 'caddy' while that hand holds a thing standing on it (then only the upper arm and forearm count there)."""
    pts = limb_points(side); arm = limb_points(side, hand=False); out = []
    for name, c, r, z0, z1 in props:
        g = cyl_gap(pts, c, r, z0, z1); out.append("%s %.4f" % (name, g))
        if g < 0.0005: print("CONTACT %s WARN %s arm within 0.5 mm of the %s t=%.2f gap %.4f" % (tag, side, name, t, g), flush=True)
    g = stool_gap(arm if hand_on == "stool" else pts); out.append("stool_seat %.4f" % g)
    if g < 0.0005: print("CONTACT %s WARN %s arm within 0.5 mm of the stool seat t=%.2f gap %.4f" % (tag, side, t, g), flush=True)
    g = cyl_gap(arm if hand_on == "caddy" else pts, Vector((CADDY_X, CADDY_Y, 0)), CADDY_R, STOOL_TOP - CADDY_T, STOOL_TOP)
    out.append("caddy_top %.4f" % g)
    if g < 0.0005: print("CONTACT %s WARN %s arm within 0.5 mm of the caddy top t=%.2f gap %.4f" % (tag, side, t, g), flush=True)
    if fr % 4 == 0: print("CONTACT %s t=%.2f %s arm_gap %s" % (tag, t, side, " ".join(out)), flush=True)


P_HG_HOME = ("hourglass", HG_HOME, HG_POST + 0.0002, HG_HOME.z - HG_H / 2, HG_HOME.z + HG_H / 2)
P_HG_END = ("hourglass", HG_END.translation, HG_POST + 0.0002, STOOL_TOP, STOOL_TOP + HG_H)
P_BOTTLE = ("shampoo", BOT_HOME, BOT_R, BOT_HOME.z, BOT_HOME.z + BOT_H + 0.0011)


def object_report(tag, t):
    """Every mesh object whose world bounding box is longer than 15 mm on one side and comes within 10 mm of either hand
    (name, parent / bone, world scale, box size, distance, materials). DESK OBJ lines. 11/21 v7: centimetre-long rods at the
    left hand that are not the boy's skin."""
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    hands = {s_: wpt(ch, s_ + "Hand") for s_ in ("Left", "Right")}
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH" or ob.hide_render: continue
        ev = ob.evaluated_get(dg); Mw = ev.matrix_world
        cs = [Mw @ Vector(c) for c in ev.bound_box]
        lo = Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs))); hi = Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
        size = hi - lo
        if max(size) < 0.015: continue
        def dist(h):
            d = Vector((max(lo.x - h.x, 0, h.x - hi.x), max(lo.y - h.y, 0, h.y - hi.y), max(lo.z - h.z, 0, h.z - hi.z))); return d.length
        dmin = min(dist(h) for h in hands.values())
        if dmin > 0.010: continue
        n += 1
        par = ob.parent.name if ob.parent else "-"
        if ob.parent and ob.parent_type == "BONE": par += ":" + ob.parent_bone
        print("DESK OBJ %s t=%.2f %s (%s) parent %s scale %s world box %s from %s to %s, %.4f from a hand, materials %s" % (
            tag, t, ob.name, ob.type, par, tuple(round(x, 3) for x in Mw.to_scale()), tuple(round(x, 4) for x in size),
            tuple(round(x, 4) for x in lo), tuple(round(x, 4) for x in hi), dmin, [m.name for m in ob.data.materials if m]), flush=True)
    print("DESK OBJ %s t=%.2f %d long objects within 10 mm of a hand (hands L %s R %s)" % (
        tag, t, n, tuple(round(x, 4) for x in hands["Left"]), tuple(round(x, 4) for x in hands["Right"])), flush=True)


def finger_check(tag, t):
    """Keyed pose sanity (11/21 v8): every hand / finger bone's length vs its rest length (scale) and the gap between its head and
    its parent's tail vs the rest gap (location), plus the boy mesh box. WARN when a bone is > 1.2 x / < 0.8 x its rest length
    or its head moved > 20 % of the parent's length off the parent's tail."""
    bpy.context.view_layer.update(); worst_l, worst_g, bad = 1.0, 0.0, []
    for pb in ch.pb.values():
        if "Hand" not in pb.name: continue
        b = pb.bone; r = (pb.tail - pb.head).length / max(1e-9, b.length)
        if abs(r - 1) > abs(worst_l - 1): worst_l = r
        if pb.parent is not None:
            pr = pb.parent.bone
            g0 = (b.head_local - pr.tail_local).length; g1 = (pb.head - pb.parent.tail).length
            gd = abs(g1 - g0) / max(1e-9, pr.length); worst_g = max(worst_g, gd)
            if gd > 0.2: bad.append("%s head off its parent by %.0f %% of the parent" % (pb.name.split(":")[-1], 100 * gd))
        if r > 1.2 or r < 0.8: bad.append("%s %.2f x its rest length" % (pb.name.split(":")[-1], r))
    dg = bpy.context.evaluated_depsgraph_get(); boxes = []
    for ob in ch.meshes:
        ev = ob.evaluated_get(dg); cs = [ev.matrix_world @ Vector(c) for c in ev.bound_box]
        boxes.append(tuple(round(max(c[i] for c in cs) - min(c[i] for c in cs), 4) for i in range(3)))
    print("DESK FINGERS %s t=%.2f hand/finger bones: length ratio worst %.3f, head-to-parent-tail change worst %.0f %% of the parent; boy box %s%s" % (
        tag, t, worst_l, 100 * worst_g, boxes, (" WARN " + "; ".join(bad[:8])) if bad else ""), flush=True)


def shard_report(tag, t):
    """Evaluate the posed mesh and list stretched edges near the hands (> 3 x the median edge): the 10 longest, each end's
    vertex groups / weights and where those bones' heads are now. Print lines: DESK SHARD ..."""
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    hands = {s_: wpt(ch, s_ + "Hand") for s_ in ("Left", "Right")}
    bones = {b.name: b for b in ch.pb.values()} if hasattr(ch.pb, "values") else {}
    for ob in ch.meshes:
        ev = ob.evaluated_get(dg); me = ev.to_mesh(); M = ob.matrix_world
        co = [M @ v.co for v in me.vertices]
        Ls = sorted((co[e.vertices[0]] - co[e.vertices[1]]).length for e in me.edges); med = Ls[len(Ls) // 2]
        rows = []
        for e in me.edges:
            a, b = e.vertices; l_ = (co[a] - co[b]).length
            if l_ > 3 * med:
                near = min(min((co[a] - h).length, (co[b] - h).length) for h in hands.values())
                if near < 0.010: rows.append((l_, a, b, near))
        rows.sort(reverse=True)
        names = {g.index: g.name for g in ob.vertex_groups}
        print("DESK SHARD %s t=%.2f %s: median edge %.5f, %d edges > 3x median within 10 mm of a hand (hands at L %s R %s)" % (
            tag, t, ob.name, med, len(rows), tuple(round(x, 4) for x in hands["Left"]), tuple(round(x, 4) for x in hands["Right"])), flush=True)
        for l_, a, b, near in rows[:10]:
            for v in (a, b):
                gr = sorted(((names[g.group], g.weight) for g in ob.data.vertices[v].groups), key=lambda x: -x[1])[:4]
                heads = []
                for n, w in gr:
                    pb = bones.get(n)
                    if pb is not None: heads.append("%s@%s" % (n.split(":")[-1], tuple(round(x, 4) for x in (ch.arm.matrix_world @ pb.head))))
                print("DESK SHARD   edge %.5f (%.1f x median) vert %d at %s groups %s bone heads %s" % (
                    l_, l_ / med, v, tuple(round(x, 4) for x in co[v]), [(n.split(":")[-1], round(w, 3)) for n, w in gr], heads), flush=True)
        ev.to_mesh_clear()


if SHOT == "AU1":
    # the traveller asks; the boy points at the clock (top right, on HIS LEFT) with his LEFT hand
    put_towel(towel, LIE_PTS, 0); set_M(hg, HG_UP, 0); set_M(bottle, BOT_M, 0); place_sand(0, False, 0.0)
    GL, GF = (BX0 - 0.060, BY - 0.040), 35
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.85, VOICE["a"], VOICE["a"] + 2.55
    pt = Vector(local_dir((BX0, BY), 0, CLOCK, FLOOR + PUPIL * 0.62)).normalized()
    if pt.x < 0: print("DESK WARN the clock is on his right: storyboard wants the LEFT hand", flush=True)
    pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    print("DESK AU1 clock %s boy (%.4f, %.4f) point_dir %s hand Left" % (tuple(round(v, 4) for v in CLOCK), BX0, BY, tuple(round(v, 3) for v in pt)), flush=True)
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            kk = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms, hd = E.P_point((pt.x, pt.y, pt.z + 0.06 * kk), right=False), (0, 6 if t < ans1 else 0, 6 if t < ans1 else 2)
            arms.update({b: P_REST[b] for b in ("RightArm", "RightForeArm")})
        else:
            arms, hd = dict(P_REST), (0, -14, 0)
        reset_ls(ch); ch.pose(t, arms, twist={"Head": hd})
        if t >= ans0 - 0.15:
            curl(ch, "Left", G_POINT)
        key_all(ch, fr)
    ch.finish()

    def trav(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)
        return E.P_stand(), (0, 14, 0)
    stand("traveler_girl", GL, GF, trav, height=GIRL)

elif SHOT == "AU2":
    # towel: pinch one end on the stool, lift, lay it over the right shoulder, let go when it lies there
    set_M(hg, HG_UP, 0); set_M(bottle, BOT_M, 0); place_sand(0, False, 0.0)
    GRAB, LIFT, CHEST, TOSS0, TOSS1, REL = 0.70, 1.10, 1.55, 1.60, 1.90, 1.95
    # round 4: the end goes up and a little BACK (not outwards past the hourglass) until the towel is off the stool, then to his chest
    PK = [(GRAB, P0_LIE), (GRAB + 0.1, P0_LIE), (LIFT, P0_LIE + AU2_LIFT), (CHEST, D0 + Vector((0, -0.0015, -0.0015))), (TOSS1, D0)]
    QK = [(GRAB, Q_GRAB), (GRAB + 0.1, Q_GRAB), (LIFT, Q_LIFT), (CHEST, Q_CHEST0), (TOSS1, Q_CHEST)]
    R_PRE = pinch_at(Q_PRE, P0_LIE + AU2_PRE, G_PINCH_OPEN, POLE_AU2)
    R_GRAB = pinch_at(Q_GRAB, P0_LIE, G_PINCH, POLE_AU2)
    R_OFF = pinch_at(Q_CHEST, D0 + Vector((-0.0010, -0.0020, -0.0015)), G_RELAX, POLE_REST)

    def q_keys(keys, t):
        if t <= keys[0][0]: return keys[0][1]
        for (t0, q0), (t1, q1) in zip(keys, keys[1:]):
            if t <= t1: return q0.slerp(q1, E.ease((t - t0) / max(1e-6, t1 - t0)))
        return keys[-1][1]

    def pinch_target(t):
        return lerp_keys(PK, t)

    def right(t):
        if t < 0.15: return REST_R
        if t < 0.35: return tblend(REST_R, RAISE_R, (t - 0.15) / 0.20)          # up first (the hand rests below the stool top)
        if t < 0.55: return tblend(RAISE_R, R_PRE, (t - 0.35) / 0.20)
        if t < GRAB: return tblend(R_PRE, R_GRAB, (t - 0.55) / (GRAB - 0.55))
        if t <= REL: return pinch_at(q_keys(QK, t), pinch_target(t), G_PINCH, POLE_AU2)
        if t < REL + 0.25: return tblend(pinch_at(Q_CHEST, D0, G_PINCH, POLE_AU2), R_OFF, (t - REL) / 0.25)
        return tblend(R_OFF, REST_R, (t - REL - 0.25) / 0.45)

    def head(t):
        if 0.3 < t < 1.2: return (0, -8, -8)          # looks at the towel on the stool
        return (0, 0, -1)
    grabbed, free = False, False
    for fr in E.frames():
        t = fr / E.FPS
        S.solve2(t, fr, head(t), right(t), None, extra=stand_dirs("Left"))
        # the pinching fingers sit on the towel (0.4 mm above the seat) until the end has been lifted a little (0.95 s)
        check_clear("AU2", t, fr, [P_HG_HOME], hand_on="stool" if 0.55 <= t <= GRAB + 0.25 else None)
        pinch = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex3", True)) / 2
        if t >= GRAB and (pinch - L0_TOWEL).length >= TOWEL_L - 1e-4:
            if not free: print("CONTACT AU2 towel fully off the stool t=%.2f" % t, flush=True)
            free = True
        if t < GRAB: pts = LIE_PTS
        elif t < TOSS0: pts = hang(pinch, free)
        elif t < TOSS1: pts = mix_pts(hang(pinch, True), [pinch] + drape_now()[1:], (t - TOSS0) / (TOSS1 - TOSS0))
        elif t <= REL: pts = [pinch] + drape_now()[1:]
        else: pts = drape_now()
        if t >= GRAB and not grabbed:
            grabbed = True; e_ = (pinch - P0_LIE).length
            print("CONTACT AU2 grab t=%.2f pinch_to_towel_end %.4f %s" % (t, e_, "" if e_ < 0.0007 else "WARN fingers did not reach the towel"), flush=True)
        put_towel(towel, pts, fr)
        if fr % 4 == 0:
            top = drape_now()[TOWEL_N // 2]
            hit = mesh_hit(ch.meshes, top + Vector((0, 0, 0.004)), Vector((0, 0, -1)))
            print("CONTACT AU2 t=%.2f pinch_to_target %.4f towel_end_to_pinch %.4f drape_top_above_shoulder_surface %s towel_low_z %.4f (stool %.4f)" % (
                t, (pinch - pinch_target(t)).length if GRAB <= t <= REL else 0.0, (pts[0] - pinch).length if GRAB <= t <= REL else 0.0,
                ("%.4f" % (top.z - hit.z)) if hit is not None else "none", min(p.z for p in pts), STOOL_TOP), flush=True)
    ch.finish()
    for o in towel: E.constant(o)

elif SHOT == "AU3":
    # hourglass: grip round the middle, lift, forearm half a turn (upside down, swinging over the top round his forearm),
    # down on the stool where it lands (the towel's old place), let go, the sand runs
    set_M(bottle, BOT_M, 0)
    GRAB, LIFT1, FLIP0, FLIP1, DOWN, REL = 0.70, 0.95, 0.95, 1.75, 2.00, 2.00

    def hg_target(t):
        if t <= GRAB + 0.1: return HG_UP
        if t < LIFT1: return blend_M(HG_UP, HG_LIFT, (t - GRAB - 0.1) / (LIFT1 - GRAB - 0.1))
        if t < FLIP1: return hg_flip(math.pi * E.ease((t - FLIP0) / (FLIP1 - FLIP0)))
        return blend_M(HG_FLIPPED, HG_END, (t - FLIP1) / (DOWN - FLIP1))

    R_PRE = S.from_prop("Right", Tr(-0.0012, 0, 0.0008) @ HG_UP, C_HG, G_WRAP_OPEN, POLE_AU3)
    R_GRAB = S.from_prop("Right", HG_UP, C_HG, G_WRAP, POLE_AU3)
    R_END = S.from_prop("Right", HG_END, C_HG, G_WRAP, POLE_AU3)
    palm_end = (R_END[0].to_matrix() @ HL[(ch.name, "Right")][1]).normalized()      # after the turn the palm faces the hourglass
    R_OUT = (R_END[0], R_END[1] - palm_end * 0.0026 + Vector((0, 0, 0.0015)), G_WRAP_OPEN, POLE_AU3)   # open, slide away from it
    R_UP = (R_END[0], R_OUT[1] + Vector((0, 0, 0.0050)), G_RELAX, POLE_AU3)

    def right(t):
        if t < 0.15: return REST_R
        if t < 0.35: return tblend(REST_R, RAISE_R, (t - 0.15) / 0.20)
        if t < 0.55: return tblend(RAISE_R, R_PRE, (t - 0.35) / 0.20)
        if t < GRAB: return tblend(R_PRE, R_GRAB, (t - 0.55) / (GRAB - 0.55))
        if t <= REL: return S.from_prop("Right", hg_target(t), C_HG, G_WRAP, POLE_AU3)
        if t < REL + 0.25: return tblend(R_END, R_OUT, (t - REL) / 0.25)
        # 11/21 v4 check: the hand kept its upside-down turn while the forearm unrolled -> 120-126 deg twist (WARN) at 2.42-2.50.
        # Now the hand turns back about the same forearm axis, in step with the unrolling forearm (the flip played backwards).
        if t < REL + 0.70:
            g = tblend(R_OUT, R_UP, (t - REL - 0.25) / 0.20) if t < REL + 0.45 else tblend(R_UP, RAISE_R, (t - REL - 0.45) / 0.25)
            return (q_unturn(t),) + tuple(g[1:])
        return tblend((Q_BACK,) + tuple(RAISE_R[1:]), REST_R, (t - REL - 0.70) / 0.25)

    def unturn(t):
        return E.ease((t - REL - 0.25) / 0.45)

    def q_unturn(t):
        return Matrix.Rotation(-math.pi * unturn(t), 3, FLIP_AXIS).to_quaternion() @ R_END[0]
    Q_BACK = Matrix.Rotation(-math.pi, 3, FLIP_AXIS).to_quaternion() @ R_END[0]

    def roll(t):
        """Forearm roll (70 % of the half turn; the last 30 % stays in the wrist), unwound together with the hand's turn."""
        if t < FLIP0: return 0.0
        if t < FLIP1: return 0.7 * math.pi * E.ease((t - FLIP0) / (FLIP1 - FLIP0))
        if t < REL + 0.25: return 0.7 * math.pi
        return 0.7 * math.pi * (1.0 - unturn(t))

    def head(t):
        if 0.3 < t < 2.1: return (0, -6, -8)
        return (0, 0, -1)
    grabbed, last = False, None
    for fr in E.frames():
        t = fr / E.FPS
        S.solve2(t, fr, head(t), right(t), None, extra=stand_dirs("Left"), roll={"Right": roll(t)})
        on_stool = (0.55 <= t <= GRAB + 0.15) or (FLIP1 <= t <= REL + 0.10)
        check_clear("AU3", t, fr, [P_HG_END] if t >= REL + 0.25 else [], hand_on="stool" if on_stool else None)
        if GRAB <= t <= REL:
            Mg = hand_M(ch, "Right") @ C_HG; last = Mg
            if not grabbed:
                grabbed = True; e_ = (Mg.translation - HG_UP.translation).length
                print("CONTACT AU3 grab t=%.2f hourglass_jump %.4f %s" % (t, e_, "" if e_ < 0.0006 else "WARN hand did not reach the hourglass"), flush=True)
        else:
            Mg = hg_target(t) if t < GRAB else HG_END
        set_M(hg, Mg, fr)
        place_sand(fr, t >= FLIP1, max(0.0, (t - DOWN) / 30.0))
        put_towel(towel, drape_now(), fr)
        if fr % 4 == 0:
            bottom = min((Mg @ Vector((sx * HG_POST, 0, s * HG_H / 2))).z for s in (-1, 1) for sx in (-1, 1))
            print("CONTACT AU3 t=%.2f hourglass_off_target %.4f lowest_corner_above_stool %.4f roll %.0f deg" % (
                t, (Mg.translation - hg_target(t).translation).length if GRAB <= t <= REL else 0.0, bottom - STOOL_TOP, math.degrees(roll(t))), flush=True)
    ch.finish(); E.constant(hg)
    for o in towel: E.constant(o)
    for o in [sand_before] + list(sand_after): E.constant(o)

else:
    # AU4 (round 4): two side steps to his left first (face to the camera), then his LEFT hand takes the shampoo from the caddy
    # (cap up, below the chest) and holds it in front of his left hip; his RIGHT hand waves (to the traveller, who stands on his
    # right); head sways while humming. The right arm never goes near the stool any more (11/21: arm in the stool seat, shards).
    set_M(hg, HG_END, 0)
    W0, SD = 0.50, 0.60                                   # steps 0.50 - 2.90
    T_REACH, GRAB = 2.90, 3.40
    CARRY_OFF = Vector((0.0050, -(M_["front"] + 0.0028), 0.0040))     # bottle bottom from his hips: in front of the LEFT hip
    WAVE0, HUM0, HUM1 = 4.55, VOICE["la"] + 0.1, VOICE["la"] + 2.5
    Q_WAVE_R = hand_q(ch, "Right", Vector((-0.1, -0.1, 1)), Vector((0.05, -1, 0.1)))
    REST_DIRS_R = {b: P_REST[b] for b in ("RightArm", "RightForeArm")}
    POLE_L = Vector((0.6, 0.6, -0.8))

    def foot_dx(t, lead):
        n, lift = 0.0, 0.0
        for k in range(2):
            t0 = W0 + (2 * k + (0 if lead else 1)) * SD
            if t >= t0 + SD: n += 1
            elif t > t0: n += E.ease((t - t0) / SD); lift = math.sin(math.pi * (t - t0) / SD)
        return n * STEP, lift * LIFT_F

    def need_drop(tgt, hipj):
        d = tgt - hipj; h2 = d.x * d.x + d.y * d.y
        return max(0.0, -d.z - math.sqrt(max(0.0, LEG_L * LEG_L - h2)))

    L_PRE = S.from_prop("Left", Tr(0.0012, 0, 0.0015) @ BOT_M, C_BOT, G_BOT_OPEN, POLE_L)
    L_GRAB = S.from_prop("Left", BOT_M, C_BOT, G_BOT, POLE_L)

    def head(t):
        if 2.7 < t < 3.7: return (0, -6, 8)               # looks at the shampoo on the caddy (his left)
        if HUM0 <= t <= HUM1:
            u = t - HUM0
            return (7 * math.sin(2 * math.pi * 1.6 * u), 4 * math.sin(2 * math.pi * 0.8 * u), 0)
        return (0, 0, -1)
    grabbed, last_feet = False, None
    for fr in E.frames():
        t = fr / E.FPS
        dxL, lfL = foot_dx(t, True); dxR, lfR = foot_dx(t, False); hs = (dxL + dxR) / 2
        tL = ANK_L0 + Vector((dxL, 0, lfL)); tR = ANK_R0 + Vector((dxR, 0, lfR))
        drop_ = max(need_drop(tL, HIPJ_L0 + Vector((hs, 0, 0))), need_drop(tR, HIPJ_R0 + Vector((hs, 0, 0))))
        S.place(t, BX0 + hs, BY, drop_)
        hips_now = HIPS0 + Vector((hs, 0, -drop_))
        mv = Vector((hs, 0, -drop_))                      # the resting left hand moves with him while he steps
        rest_l = (REST_L[0], REST_L[1] + mv, REST_L[2], REST_L[3]); raise_l = (RAISE_L[0], RAISE_L[1] + mv, RAISE_L[2], RAISE_L[3])
        B_CARRY = frame_M(hips_now + CARRY_OFF, Vector((0, 0, 1)), Vector((1, 0, 0)))
        if t < T_REACH: tl = rest_l
        elif t < T_REACH + 0.20: tl = tblend(rest_l, raise_l, (t - T_REACH) / 0.20)
        elif t < T_REACH + 0.40: tl = tblend(raise_l, L_PRE, (t - T_REACH - 0.20) / 0.20)
        elif t < GRAB: tl = tblend(L_PRE, L_GRAB, (t - T_REACH - 0.40) / (GRAB - T_REACH - 0.40))
        else:
            m_ = (BOT_M.translation + B_CARRY.translation) / 2; m_.z = max(BOT_M.translation.z + 0.0025, B_CARRY.translation.z) + 0.0005
            mid = Matrix.Translation(m_) @ BOT_M.to_3x3().to_4x4()
            tl = S.from_prop("Left", key_M([(GRAB, BOT_M), (GRAB + 0.1, BOT_M), (GRAB + 0.3, Tr(0, 0, 0.0025) @ BOT_M), (GRAB + 0.55, mid), (GRAB + 0.85, B_CARRY)], t), C_BOT, G_BOT, POLE_L)
        if t < WAVE0: extra = dict(REST_DIRS_R)
        elif t < WAVE0 + 0.3: extra = blend_dirs(REST_DIRS_R, wave_dirs(WAVE0 + 0.3, right=True), (t - WAVE0) / 0.3)
        else: extra = wave_dirs(t, right=True)
        S.solve2(t, fr, head(t), None, tl, extra=extra, legs_fn=lambda: {**leg_ik(ch, "Left", tL), **leg_ik(ch, "Right", tR)})
        if t >= WAVE0 + 0.15:
            untwist(ch, "Right", Q_WAVE_R, fr); set_hand_rot(ch, "Right", Q_WAVE_R); curl(ch, "Right", G_WAVE); key_hand(ch, "Right", fr)
        check_clear("AU4", t, fr, [P_HG_END], side="Right")
        check_clear("AU4", t, fr, [P_HG_END], side="Left", hand_on="caddy" if T_REACH + 0.40 <= t <= GRAB + 0.15 else None)
        Mb = BOT_M if t < GRAB else hand_M(ch, "Left") @ C_BOT
        if fr in (82, 102): shard_report("AU4", t); object_report("AU4", t)     # 11/21 v6/v7: shards round the left hand
        if t >= GRAB and not grabbed:
            grabbed = True; e_ = (Mb.translation - BOT_M.translation).length
            print("CONTACT AU4 grab t=%.2f bottle_jump %.4f %s" % (t, e_, "" if e_ < 0.0006 else "WARN hand did not reach the bottle"), flush=True)
        set_M(bottle, Mb, fr)
        place_sand(fr, True, (5.0 + t) / 30.0)
        put_towel(towel, drape_now(), fr)
        fL, fR = wpt(ch, "LeftFoot"), wpt(ch, "RightFoot")
        if fr % 2 == 0:
            slipL = (fL.x - tL.x) if lfL < 1e-4 else 0.0; slipR = (fR.x - tR.x) if lfR < 1e-4 else 0.0
            if fr % 4 == 0 or abs(slipL) > 0.0003 or abs(slipR) > 0.0003:
                print("CONTACT AU4 t=%.2f feet L %+.4f/%+.4f R %+.4f/%+.4f (x error / height above rest) planted_slip %.4f hips_drop %.4f bottle_cap_up %.2f bottle_below_chin %.4f" % (
                    t, fL.x - tL.x, fL.z - ANK_L0.z, fR.x - tR.x, fR.z - ANK_R0.z, max(abs(slipL), abs(slipR)), drop_,
                    (Mb.to_3x3() @ Vector((0, 0, 1))).z, (mouth(ch).z - 0.003) - (Mb @ Vector((0, 0, BOT_H))).z), flush=True)
    ch.finish(); E.constant(bottle)
    for o in towel: E.constant(o)
    for o in [sand_before] + list(sand_after): E.constant(o)
    # 11/21 v7: the same checks again from the KEYFRAMES (what is rendered), not the pose the loop left behind
    for fr_ in (82, 102):
        sc.frame_set(fr_); shard_report("AU4 keyed", fr_ / E.FPS); object_report("AU4 keyed", fr_ / E.FPS); finger_check("AU4 keyed", fr_ / E.FPS)
    sc.frame_set(0)
    if CAMSUB == "main":
        def trav(t):
            if t >= WAVE0 + 0.3: return E.P_wave(int((t - WAVE0) * 3) % 2), (0, -14, 0)
            return E.P_stand(), (0, -14, 0)
        stand("traveler_girl", (BX0 - 0.062, BY - 0.035), 40, trav, height=GIRL)

# ---------- lights: warm hallway light, dusk through the window ----------
L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.45"))
bpy.ops.object.light_add(type="AREA", location=(BX0, -0.25, 0.40)); frontl = bpy.context.object
frontl.data.energy = env("FRONT", "2.0"); frontl.data.color = (1, 0.88, 0.72); frontl.data.size = 0.5; frontl.rotation_euler = (math.radians(25), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.40, 0.22)); outl = bpy.context.object
outl.data.energy = env("OUT", "2.5"); outl.data.color = (1, 0.72, 0.50); outl.data.size = 0.4; outl.rotation_euler = (math.radians(70), 0, 0)
bpy.ops.object.light_add(type="SUN", location=(0, 0.5, 0.6)); sun = bpy.context.object
sun.data.energy = env("SUN", "0.6"); sun.data.color = (1, 0.65, 0.40); sun.data.angle = math.radians(3); sun.rotation_euler = (math.radians(-28), math.radians(-15), 0)

# ---------- cameras ----------
if SHOT in ("AU1", "AU2", "AU3", "AU4"):
    shoulder_pt = DRAPE[TOWEL_N // 2]
    HANDCAM = {   # aim, camera offset, lens. His right hand is on the -x side; DOF off.
        "HF": ({"AU2": P0_LIE, "AU3": HG_HOME, "AU4": BOT_HOME + Vector((0, 0, BOT_H / 2))}.get(SHOT, HG_HOME),
               Vector((0.06, -0.13, 0.04)) if SHOT == "AU4" else Vector((-0.06, -0.13, 0.04)), 190),
        "HS": ({"AU2": P0_LIE, "AU3": HG_HOME, "AU4": BOT_HOME + Vector((0, 0, BOT_H / 2))}.get(SHOT, HG_HOME),
               {"AU2": Vector((0.05, -0.07, 0.13)), "AU4": Vector((0.15, -0.01, 0.02))}.get(SHOT, Vector((-0.15, -0.01, 0.02))), 190),
        "HT": (shoulder_pt + Vector((0, -0.002, -0.002)), Vector((-0.03, -0.15, 0.02)), 170),
        "HT2": (shoulder_pt + Vector((0, 0, -0.002)), Vector((-0.16, 0.0, 0.015)), 170),
        "L": (Vector((BX0 + STEP, BY - 0.002, FLOOR + 0.004)), Vector((0.0, -0.17, 0.004)), 120)}
    if CAMSUB in HANDCAM:
        aim, off, lens = HANDCAM[CAMSUB]
        cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    elif CAMSUB == "C":
        aim = mouth0 + Vector((0, 0, -0.005))
        cam_move(115, aim + Vector((-0.03, -0.16, 0.01)), aim, aim + Vector((-0.03, -0.16, 0.01)), aim)
    elif SHOT == "AU1":
        aim0 = Vector((BX0 + 0.012, BY - 0.012, FLOOR + 0.062))
        cam_move(40, aim0 + Vector((-0.02, -0.48, 0.065)), aim0, aim0 + Vector((-0.01, -0.43, 0.058)), aim0 + Vector((0, 0, 0.002)),
                 focus=(BX0, BY, FLOOR + 0.05))
    elif SHOT in ("AU2", "AU3"):     # half body: the boy from the knees up, the stool with towel / hourglass / shampoo on the left
        aim = Vector((BX0 - 0.007, BY - 0.004, HIPS0.z + 0.010))
        cam_move(60, aim + Vector((-0.030, -0.21, 0.030)), aim, aim + Vector((-0.027, -0.20, 0.027)), aim, focus=(BX0 - 0.004, BY - 0.004, HIPS0.z + 0.012))
    else:                            # AU4: door, clock top right, the traveller on the left, the stool with the turned hourglass
        aim = Vector((BX0 + 0.014, BY - 0.008, FLOOR + 0.060))
        cam_move(42, aim + Vector((-0.012, -0.42, 0.040)), aim, aim + Vector((-0.004, -0.42, 0.038)), aim, focus=(BX0 + STEP, BY, FLOOR + 0.05))
    print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
    if CAMSUB == "main":
        view_report(SHOT, [("clock", CLOCK), ("boy_mouth", lambda: mouth(ch)), ("left_shoe", lambda: wpt(ch, "LeftFoot")),
                           ("door", (DOOR_X, WY + WI["front_med"], FLOOR + 0.05)), ("window", (WIN_X, 0.24, FLOOR + 0.07)),
                           ("stool", (STOOL_CX, STOOL_CY, STOOL_TOP)), ("hat", (HAT_X, 0.235, FLOOR + 0.095))])

for ob in list(bpy.context.scene.objects):       # 11/21 v8: a 2 m "Icosphere" without material sat at the origin
    if ob.type == "MESH" and ob.name.startswith("Icosphere") and not [m for m in ob.data.materials if m] and max(ob.dimensions) > 0.5:
        ob.hide_render = True; ob.hide_viewport = True
        print("DESK HIDE %s (%s, %s across, no material, parent %s): not rendered" % (ob.name, ob.type, tuple(round(x, 2) for x in ob.dimensions),
              ob.parent.name if ob.parent else "-"), flush=True)
E.run(A[3:])
