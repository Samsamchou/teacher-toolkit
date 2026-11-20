# World Routines Trip - shared hand helpers for the tabletop films (Blender, Mixamo-rigged Tripo pupils).
# Moved unchanged out of taiwan_breakfast.py on 2026-11-20 so every station uses ONE copy (teacher-approved plan, step 2).
#   hand(), mouth()        lips point that turns with the head (first call = reference pose)
#   PALM_SIGN              fwd x (pinky->index) is the BACK of a right hand and the PALM of a left hand -> Right -1, Left +1
#   hand_frame, curl, orient_hand, to_local, to_world, ik_arm, key_hand, rod_between, lerp_keys
# colab_run.py uploads this file next to the scene script. ASCII only (colab exec reads files with cp950).
import os, math
import bpy
from mathutils import Vector, Matrix
import engine as E


def hand(ch, side):
    bpy.context.view_layer.update()
    return ch.arm.matrix_world @ ch.pb[side + "HandMiddle1"].head


_MOUTH_REF = {}


def mouth(ch):
    """Her lips: an offset in front of the head bone that turns with the head (the first call sets the reference pose)."""
    bpy.context.view_layer.update()
    M = ch.arm.matrix_world @ ch.pb["Head"].matrix
    R = M.to_3x3().normalized(); h = M.translation.copy()
    if ch.name not in _MOUTH_REF:
        off = Vector((0, -float(os.environ.get("MOUTH_Y", "0.0082")), float(os.environ.get("MOUTH_Z", "0.0005"))))
        _MOUTH_REF[ch.name] = R.inverted() @ off
    return h + R @ _MOUTH_REF[ch.name]


# ---------- hands (B4): two-bone arm IK, hand orientation, finger curls, chopstick and cup grips ----------
# Chopstick grip (checked on the web, teacher 11/20): the LOWER stick lies still in the thumb-index web and rests on the ring
# fingertip; the UPPER stick is held like a pencil by the thumb, index and middle finger pads and is the only one that moves;
# both parallel, held about 2/3 of the way up. Food goes to the mouth from the front with the sticks nearly level.
FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")
# fwd x (pinky->index) points to the BACK of a right hand and to the PALM of a left hand (teacher 11/20: both hands were reversed with the old guess)
PALM_SIGN = {"Right": float(os.environ.get("PALM_R", "-1")), "Left": float(os.environ.get("PALM_L", "1"))}
G_CHOP = {"Thumb": (10, 18, 12), "Index": (18, 30, 18), "Middle": (28, 38, 24), "Ring": (52, 50, 30), "Pinky": (62, 55, 34)}
G_CUP = {"Thumb": (25, 18, 10), "Index": (40, 50, 32), "Middle": (44, 52, 34), "Ring": (48, 52, 34), "Pinky": (52, 52, 34)}
G_RELAX = {f: (8, 12, 8) for f in FINGERS}
STICK_L = float(os.environ.get("STICK_L", "0.0125"))   # sized to the chibi hand: her arms are only ~60 % of real proportions


def arm_space(ch, v_world, point=False):
    M = ch.arm.matrix_world.inverted()
    return (M @ v_world) if point else (M.to_3x3() @ v_world)


def rot_bone(ch, bone, axis, ang):
    """Turn a pose bone about its own head, around an axis given in armature space."""
    pb = ch.pb[bone]; bpy.context.view_layer.update()
    M = pb.matrix.copy(); h = M.translation.copy()
    N = (Matrix.Rotation(ang, 4, axis.normalized()) @ M); N.translation = h
    pb.matrix = N


def hand_frame(ch, side):
    """Armature-space wrist point, finger direction, across-the-knuckles direction and palm direction of one hand."""
    bpy.context.view_layer.update()
    P = lambda b: ch.pb[b].head.copy()
    w = P(side + "Hand"); fwd = (P(side + "HandMiddle1") - w).normalized()
    acr = P(side + "HandIndex1") - P(side + "HandPinky1"); acr = (acr - acr.dot(fwd) * fwd).normalized()
    palm = fwd.cross(acr).normalized() * PALM_SIGN[side]
    return w, fwd, acr, palm


def curl(ch, side, grip):
    """Bend every finger segment towards the palm (axis = segment direction x palm direction)."""
    palm = hand_frame(ch, side)[3]
    for f in FINGERS:
        for k, a in enumerate(grip[f], 1):
            b = "%sHand%s%d" % (side, f, k)
            if b not in ch.pb: continue
            bpy.context.view_layer.update(); pb = ch.pb[b]
            ax = (pb.tail - pb.head).normalized().cross(palm)
            if ax.length > 1e-6: rot_bone(ch, b, ax, math.radians(a))


def orient_hand(ch, side, a_loc, a_world, b_loc, b_world):
    """Turn the hand so that hand-local vector a_loc points along a_world and b_loc leans towards b_world (both world)."""
    bpy.context.view_layer.update(); pb = ch.pb[side + "Hand"]
    def basis(a, b):
        a = a.normalized(); b = (b - b.dot(a) * a).normalized(); return Matrix((a, b, a.cross(b))).transposed()
    F = basis(Vector(a_loc), Vector(b_loc))
    Tm = basis(arm_space(ch, Vector(a_world)), arm_space(ch, Vector(b_world)))
    N = (Tm @ F.transposed()).to_4x4(); N.translation = pb.matrix.translation.copy()
    pb.matrix = N


def to_local(ch, side, v_arm, point=True):
    bpy.context.view_layer.update(); M = ch.pb[side + "Hand"].matrix
    return (M.inverted() @ v_arm) if point else (M.to_3x3().inverted() @ v_arm)


def to_world(ch, side, v_loc, point=True):
    bpy.context.view_layer.update(); M = ch.arm.matrix_world @ ch.pb[side + "Hand"].matrix
    return (M @ Vector(v_loc)) if point else (M.to_3x3() @ Vector(v_loc))


def ik_arm(ch, side, target, pole):
    """Two-bone IK: directions (character axes) for the upper arm and forearm that put the wrist on target (world)."""
    bpy.context.view_layer.update(); mw = ch.arm.matrix_world
    S = mw @ ch.pb[side + "Arm"].head; Eb = mw @ ch.pb[side + "ForeArm"].head; W = mw @ ch.pb[side + "Hand"].head
    a, b = (Eb - S).length, (W - Eb).length
    d = Vector(target) - S; L = max(1e-6, min(d.length, (a + b) * 0.999)); u = d.normalized()
    v = Vector(pole) - Vector(pole).dot(u) * u; v = v.normalized()
    ca = max(-1.0, min(1.0, (a * a + L * L - b * b) / (2 * a * L)))
    E2 = S + a * (ca * u + math.sqrt(1 - ca * ca) * v); W2 = S + u * L
    ik_arm.last = (d.length, a + b)
    Ri = ch.root.matrix_world.to_3x3().normalized().inverted()
    return {side + "Arm": tuple(Ri @ (E2 - S).normalized()), side + "ForeArm": tuple(Ri @ (W2 - E2).normalized())}


def key_hand(ch, side, fr):
    for b in [side + "Hand"] + ["%sHand%s%d" % (side, f, k) for f in FINGERS for k in (1, 2, 3, 4)]:
        if b in ch.pb: ch.pb[b].keyframe_insert("rotation_quaternion", frame=fr)


def rod_between(ob, a, b):
    ob.location = (a + b) / 2; ob.rotation_euler = Vector((0, 0, 1)).rotation_difference((b - a).normalized()).to_euler()
    ob.scale = (1, 1, (b - a).length / ob["len"])


def lerp_keys(keys, t):
    """keys: [(time, value), ...] with Vector / float values; eased between keys."""
    if t <= keys[0][0]: return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            u = E.ease((t - t0) / max(1e-6, t1 - t0))
            return v0.lerp(v1, u) if isinstance(v0, Vector) else v0 + (v1 - v0) * u
    return keys[-1][1]


# ---------- seated legs: how far the thigh / seat mesh reaches below the hip joints (teacher 11/20) ----------
# Chibi pupils have very thick thighs. Placing the hip JOINT a few mm above the seat put the leg mesh 3-5 mm INTO the
# cushion ("the legs go through the seat"). Pose the legs as when sitting (thighs flat forward, shins down), read the
# deformed mesh and return the depth from the hip joints down to the lowest thigh / bottom vertex. Then:
#   hip joints at seat + under  ->  SEAT_HIP = under - upleg_dz  and  seat height for flat feet = knee_h - under.
def seat_under(ch, thigh, spread=0.12):
    bpy.context.view_layer.update()
    ch.pose(0, {"RightUpLeg": (-spread * thigh, -thigh, 0.0), "LeftUpLeg": (spread * thigh, -thigh, 0.0),
                "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)})
    bpy.context.view_layer.update()
    W = lambda b: ch.arm.matrix_world @ ch.pb[b].head
    up_r, up_l, kn = W("RightUpLeg"), W("LeftUpLeg"), W("RightLeg")
    xc, half = (up_r.x + up_l.x) / 2, abs(up_r.x - up_l.x) / 2 + 0.006
    # the hip-side half of the thighs and the bottom behind the hip joints; NOT the knees / the backs of the shins
    # (11/20 first try took the shins too and said 13.7 mm -> the chair shrank to 5 mm and he floated above it)
    fwd = 1.0 if kn.y > up_r.y else -1.0
    ya, yb = up_r.y - fwd * 0.006, up_r.y + fwd * 0.5 * thigh
    y_front, y_back = min(ya, yb), max(ya, yb)
    z_top = up_r.z + 0.002
    dg = bpy.context.evaluated_depsgraph_get(); lo = None
    for o in ch.meshes:
        oe = o.evaluated_get(dg); me = oe.to_mesh(); Mw = oe.matrix_world
        for v in me.vertices:
            w = Mw @ v.co
            if abs(w.x - xc) < half and y_front < w.y < y_back and up_r.z - 0.02 < w.z < z_top:
                lo = w.z if lo is None else min(lo, w.z)
        oe.to_mesh_clear()
    under = (up_r.z - lo) if lo is not None else 0.004
    print("DESK SEAT_UNDER thigh mesh reaches %.4f below the hip joints (x %.4f +- %.4f, y %.4f..%.4f)" % (under, xc, half, y_front, y_back), flush=True)
    return under
