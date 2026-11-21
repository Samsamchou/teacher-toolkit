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


def curl_hinge(ch, side, grip, fingers=("Thumb", "Index", "Middle", "Ring", "Pinky")):
    """Use this for TIGHT grips (fist, pointing hand, hook grip, pinch) - 11/21 USA film.
    curl() takes a NEW axis for every segment (segment x palm); once a finger has bent past ~90 deg that axis flips and the
    next segment bends BACK (G_POINT middle 85/100/70 came out only 22 deg bent -> a 'peace sign'). Here all segments of a
    finger turn about ONE hinge axis taken from its first segment before bending. curl() is kept unchanged because the
    accepted Taiwan v3 / UK v2 films were rendered with it."""
    palm = hand_frame(ch, side)[3]
    for f in fingers:
        if f not in grip: continue
        b1 = "%sHand%s1" % (side, f)
        if b1 not in ch.pb: continue
        bpy.context.view_layer.update(); pb = ch.pb[b1]
        ax = (pb.tail - pb.head).normalized().cross(palm)
        if ax.length < 1e-6: continue
        ax.normalize()
        for k, a in enumerate(grip[f], 1):
            b = "%sHand%s%d" % (side, f, k)
            if b in ch.pb and a: rot_bone(ch, b, ax, math.radians(a))


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


# ---------- Tripo furniture helpers (11/21, from the UK v2 fixes; teacher rejected "standing behind the chair" and "legs through the seat") ----------
def _mesh_world_verts(root):
    bpy.context.view_layer.update()
    out = []
    for o in [root] + list(root.children_recursive):
        if o.type != "MESH": continue
        Mw = o.matrix_world
        out += [Mw @ v.co for v in o.data.vertices]
    return out


def level_model(root, z_lo, z_hi, floor, cell=0.002, name="model"):
    """Some Tripo furniture comes out tilted a few degrees (egypt_table_chair ~4 deg: top AND legs lean). Fit a plane to the
    table-top cells (highest vertex in [z_lo, z_hi], skipping cells that also have geometry above z_hi, e.g. backrest posts),
    rotate the model about that plane's centre until it is level, then put its lowest point back on the floor.
    Returns the new top height (median of the cell tops)."""
    import statistics
    def cells_of(vs):
        top, hi = {}, set()
        for w in vs:
            k = (round(w.x / cell), round(w.y / cell))
            if w.z > z_hi: hi.add(k)
            elif w.z > z_lo: top[k] = max(top.get(k, -9), w.z)
        return [(k[0] * cell, k[1] * cell, z) for k, z in top.items() if k not in hi]
    pts = cells_of(_mesh_world_verts(root))
    n = len(pts); sx = sum(p[0] for p in pts) / n; sy = sum(p[1] for p in pts) / n; sz = sum(p[2] for p in pts) / n
    cxx = sum((p[0] - sx) ** 2 for p in pts); cyy = sum((p[1] - sy) ** 2 for p in pts); cxy = sum((p[0] - sx) * (p[1] - sy) for p in pts)
    cxz = sum((p[0] - sx) * (p[2] - sz) for p in pts); cyz = sum((p[1] - sy) * (p[2] - sz) for p in pts)
    det = cxx * cyy - cxy * cxy
    a = (cxz * cyy - cyz * cxy) / det; b = (cyz * cxx - cxz * cxy) / det          # z = a x + b y + c
    R = Matrix.Rotation(-math.atan(b), 4, "X") @ Matrix.Rotation(math.atan(a), 4, "Y")
    piv = Vector((sx, sy, sz))
    root.matrix_world = Matrix.Translation(piv) @ R @ Matrix.Translation(-piv) @ root.matrix_world
    vs = _mesh_world_verts(root)
    dz = floor - min(w.z for w in vs)
    root.matrix_world = Matrix.Translation((0, 0, dz)) @ root.matrix_world
    pts2 = cells_of(_mesh_world_verts(root))
    top = statistics.median(p[2] for p in pts2)
    print("DESK LEVEL %s tilt was x %.2f deg y %.2f deg -> levelled, lifted %.4f, top %.4f (%d cells)" % (
        name, math.degrees(math.atan(b)), math.degrees(math.atan(a)), dz, top, n), flush=True)
    return top


def strip_fused_chair(root, x0, x1, back_y, top_band, floor, kd=1.0, name="chair", below_z=None, post_cols=False, table_y=None):
    """The Tripo chair is fused to the table top (its backrest runs through the top's back edge): cutting it out leaves flaps or
    tears the top (UK 11/20). Delete it instead: every face between x0..x1 (inside the table legs) that is below the table-top
    slab, above it, or (at slab height) clearly behind the top's back edge back_y. Then scale remaining heights by kd about the floor.
    Call view_layer.update() first (done here) - otherwise matrix_world is the unplaced model."""
    import bmesh
    bpy.context.view_layer.update()
    z_lo, z_hi = top_band
    zb = z_lo if below_z is None else below_z       # 11/21 egypt: a table APRON sits just under the top -> only delete below it
    cols = []
    if post_cols:                                   # backrest post columns = x of chair geometry sticking up above the table top
        # 11/21: on egypt_table_chair the chair is tucked in from the CAMERA side, so look on both sides of the table
        up = [w for w in _mesh_world_verts(root) if w.z > z_hi + 0.002 and x0 < w.x < x1]
        if up:
            mid = (x0 + x1) / 2
            for side in ([w for w in up if w.x < mid], [w for w in up if w.x >= mid]):
                if side: cols.append((min(w.x for w in side) - 0.0008, max(w.x for w in side) + 0.0008,
                                      min(w.y for w in side) - 0.0008, max(w.y for w in side) + 0.0008))
        if table_y == "auto":       # the table's real front/back edges, measured on its top OUTSIDE the chair's width (corners)
            tv = [w for w in _mesh_world_verts(root) if w.z > z_hi - 0.004 and w.z < z_hi + 0.001 and (w.x < x0 or w.x > x1)]
            table_y = (min(w.y for w in tv), max(w.y for w in tv)) if tv else None
        print("DESK CHAIR post columns (x0, x1, y0, y1) %s, table y %s" % ([tuple(round(c, 4) for c in cc) for cc in cols],
              tuple(round(v, 4) for v in table_y) if table_y else None), flush=True)
    n = 0
    for o in [o for o in [root] + list(root.children_recursive) if o.type == "MESH"]:
        Mw = o.matrix_world; Mi = Mw.inverted()
        bm = bmesh.new(); bm.from_mesh(o.data)

        def chair(f):
            ws = [Mw @ v.co for v in f.verts]
            if not all(x0 < w.x < x1 for w in ws): return False
            if all(w.z < zb for w in ws) or all(w.z > z_hi for w in ws): return True
            if all(w.y > back_y for w in ws): return True
            if post_cols:              # post pieces under the slab (they hung down as flaps) or behind it; inside the slab they stay hidden
                for c0, c1, d0, d1 in cols:
                    if all(c0 < w.x < c1 and d0 < w.y < d1 for w in ws):
                        outside = table_y is not None and all(w.y < table_y[0] - 0.0003 or w.y > table_y[1] + 0.0003 for w in ws)
                        if outside or all(w.z < z_hi - 0.0042 for w in ws) or all(w.y > back_y - 0.005 for w in ws):   # 11/21: -3.0 mm left 1 mm nubs under the front edge
                            return True
            return False
        kill = [f for f in bm.faces if chair(f)]
        n += len(kill)
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        loose = [v for v in bm.verts if not v.link_faces]
        if loose: bmesh.ops.delete(bm, geom=loose, context="VERTS")
        if abs(kd - 1.0) > 1e-6:
            for v in bm.verts:
                w = Mw @ v.co
                v.co = Mi @ Vector((w.x, w.y, floor + (w.z - floor) * kd))
        bm.to_mesh(o.data); bm.free(); o.data.update()
    print("DESK CHAIR removed %d faces of the model's %s (x %.4f..%.4f; top band %.4f..%.4f kept); heights x%.3f" % (n, name, x0, x1, z_lo, z_hi, kd), flush=True)


def build_code_chair(x_c, front_y, seat_z, width, floor, depth=0.020, back_h=0.021,
                     wood_lin=(0.70, 0.32, 0.12), cushion_lin=(0.013, 0.033, 0.040), name="chair", yaw_deg=0.0):
    """Simple wooden chair made in code: seat board + cushion whose top is exactly seat_z, front edge at front_y, backrest at the
    far (+y) side. Colours are LINEAR (Blender); defaults = sRGB warm wood (0.86,0.60,0.38) and dark cushion. Returns (front, back).
    yaw_deg (11/21, Spain mum): turn the whole chair about its own centre (x_c, front_y + depth / 2), same sense as a Char's
    face_deg, so a sitter facing face_deg sits on a chair built with yaw_deg = face_deg. 0 = unchanged behaviour."""
    wood = E.mat(name + "Wood", wood_lin, 0.45); cush = E.mat(name + "Cushion", cushion_lin, 0.8)
    t_c, t_b, lg = 0.0012, 0.0013, 0.0017
    yb = front_y + depth; zb = seat_z - t_c
    parts = [E.box((x_c, front_y + depth / 2, zb - t_b / 2), (width, depth, t_b), wood, name + "Seat", bevel=0.0003),
             E.box((x_c, front_y + depth / 2 + 0.0004, seat_z - t_c / 2), (width - 0.0012, depth - 0.0016, t_c), cush, name + "Cushion", bevel=0.0004)]
    for sx in (-1, 1):
        xl = x_c + sx * (width / 2 - lg / 2 - 0.0003)
        parts.append(E.box((xl, front_y + lg / 2 + 0.0004, (floor + zb - t_b) / 2), (lg, lg, zb - t_b - floor), wood, name + "LegF", bevel=0.0002))
        parts.append(E.box((xl, yb - lg / 2, (floor + seat_z + back_h) / 2), (lg, lg, seat_z + back_h - floor), wood, name + "Post", bevel=0.0003))
    for zz in (seat_z + back_h * 0.55, seat_z + back_h * 0.9):
        parts.append(E.box((x_c, yb - lg / 2, zz), (width - lg, lg * 0.7, 0.0028), wood, name + "Slat", bevel=0.0003))
    parts.append(E.box((x_c, front_y + 0.0012, floor + (zb - floor) * 0.35), (width - lg, 0.0010, 0.0012), wood, name + "Rail", bevel=0.0002))
    if abs(yaw_deg) > 1e-9:
        piv = Vector((x_c, front_y + depth / 2, 0)); Rz = Matrix.Rotation(math.radians(yaw_deg), 3, "Z")
        for o in parts:
            o.location = piv + Rz @ (o.location - piv); o.rotation_euler.z += math.radians(yaw_deg)
        print("DESK CHAIR %s turned %.1f deg about (%.4f, %.4f)" % (name, yaw_deg, piv.x, piv.y), flush=True)
    for o in parts: E.obstacle(o)
    print("DESK CHAIR built %s: seat top %.4f front %.4f back %.4f width %.4f backrest to %.4f" % (name, seat_z, front_y, yb, width, seat_z + back_h), flush=True)
    return front_y, yb
