# World Routines Trip - India station "I go home at two forty." (tabletop style H)
# blender -b --factory-startup --python india_home.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: IN1 (5.6 s) wide, bright afternoon at the school gate (cream pillars, open black iron gate, a neem tree, coloured houses
#             far behind), round 2:40 clock on the RIGHT pillar (top right). A drive lane runs in front of the gate; the children wait on
#             the pavement in front of it. The traveller (left) asks; the boy, standing in front of the right pillar, holds his round
#             steel tiffin box at his right side (right palm up under it, thumb on its outer side) and points at the clock with his
#             LEFT hand (clock side), outside the shoulder, not over the head.
#         IN2 (3.8 s) half-body: the right hand brings the box up to his chest (under the chin); the left hand takes the lid by its rim
#             (palm down, thumb on the chest side, fingers on the camera side; the lid moves only after the fingers touch it), lifts
#             it off and holds it at his left (picture right) at chest height; the box tips a little towards the camera: it is
#             empty. "My tiffin box is empty!"
#         IN3 (3.0 s) the lid goes back on (let go only when it sits on the box), the box back to his side; the yellow-green
#             auto-rickshaw drives in from the right (front first, nose to the left = the way it goes, wheels on the road) and stops
#             behind him with its open passenger side to the camera; he waves with the LEFT hand. "Here it comes!"
#             Teacher 11/20 late night: NO driver -> the camera looks from the front-RIGHT, so the cab (and its empty driver seat)
#             stays behind the closed cab side, the passenger area and the boy; DESK VIEW prints whether the seat can be seen.
#         IN4 (7.6 s) cut: he already stands on the rickshaw's entry step facing the camera, left hand on the entry grab pole,
#             right hand holding the box; lets go of the pole and waves; the picture fades out (in kenya/india_compose.py).
#             "I go home at two forty." 0.5, "I go home by auto-rickshaw." 2.75.
#   Check cameras (same action, another camera; the first three letters pick the action):
#         IN1HF IN1HS      right hand under the tiffin box at his side: front-right / his right side
#         IN2HF IN2HS      left hand on the lid rim (grab and lift): front-left / his left side
#         IN2HF2 IN2HS2    right hand under the box at the chest, box tipped: front-right / his right side
#         IN3HF IN3HS      lid pressed back on: front-left / his left side
#         IN4HF IN4HS      left hand on the grab pole: front-left / from above-left (the rickshaw is on his left side)
#         IN4L IN4L2       feet on the step: low front-right / low front-left
#         (hand cameras: no depth of field, long lens; the traveller is never in a check camera)
# Models: india_boy (rigged), traveler_girl, india_auto_rickshaw (still; moved as a whole, wheels not turning), india_school_gate.
# Made here: ground, drive lane and kerb, neem tree, far houses, sky, the 2:40 clock, the steel tiffin box and its separate lid,
#   the chrome grab pole at the rickshaw entry (fixed to the rickshaw), all without any writing.
# Rickshaw size: big enough that the boy standing on its step fits under the roof (printed: DESK RICK).
# Hands: shared helpers from hands.py (PALM_SIGN right -1 / left +1, hand_frame, curl, ik_arm, key_hand, lerp_keys).
#   Props held in a hand are rigid to the hand bone (uk_homework.py / egypt_breakfast.py method): prop = hand_matrix @ C.
# Measurement lines (kept by colab_run.py): DESK (probe, fit, grips, reach, view), CONTACT (grab, lid off / on, step, pole).
# Numbers marked GUESS are first guesses: check them in the first check frames. colab_run.py does not pass environment variables,
#   so change the default in this file. ASCII only: colab exec reads files with cp950 on Windows.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
from hands import *            # shared hand helpers (tabletop/src/hands.py)
import hands as H

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with india_compose.py (SHOTS)
DUR = {"IN1": 5.6, "IN2": 3.8, "IN3": 3.0, "IN4": 7.6}
VOICE = {"q": 0.5, "a": 2.6, "empty": 1.7, "comes": 1.0, "a4": 0.5, "by": 2.75}
# planned event times (seconds in the shot) used by india_compose.py for the little sounds; CONTACT lines print the real ones
EVENTS = {"lid_off": 1.25, "lid_on": 0.65, "rick_in": 0.15, "rick_stop": 1.7, "brake": 1.4, "fade": 6.8}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
sc = E.sc
T = DUR[SHOT]


def env(k, d):
    return float(os.environ.get(k, d))


FLOOR = 0.012
KID = 0.070                      # pupil height (m)
GIRL = KID * 1.06                # the traveller: her sun hat adds a little height
PUPIL = KID * 1.04
GATE_K = env("GATE_K", "2.0")    # gate height / pupil height (the clock must show above the rickshaw roof in IN4)
GATE_FRONT = 0.205               # front of the gate pillars
ROAD_Y0, ROAD_Y1 = 0.085, 0.196  # drive lane in front of the gate (kerb at ROAD_Y0)
ROAD_T = 0.0004
RICK_MIN_K = env("RICK_MIN_K", "1.30")      # rickshaw at least this many pupil heights tall
RICK_MAX_K = env("RICK_MAX_K", "1.85")      # ... and never more (check 1: a bad roof probe made it 4.16 x)
CLOCK_R = 0.017
# --- small props, sized to the chibi hand (arms only ~14 mm) ---
BOX_R, BOX_H, LID_R, LID_T, LID_SKIRT = 0.0043, 0.0035, 0.00445, 0.0004, 0.0007   # check 2: a real tiffin (radius ~1.1 x his hand, height 0.8 x radius)
KNOB_R, KNOB_NECK = 0.00055, 0.0003      # round knob on the lid (check 2): the lid is lifted by pinching it (radius set from the pinch, 0.4-0.7 mm)
BOX_TILT = math.radians(env("BOX_TILT", "25"))
POLE_R = 0.0006
BOX_WAIST = Vector((env("BW_X", "-0.0046"), env("BW_Y", "-0.0060"), env("BW_Z", "-0.0130")))     # box bottom centre from the right shoulder (his frame): at his right hip, clear of the body (check 3: x -0.0035 -> -0.0046, box_to_body was -0.0005)
BOX_CHEST = Vector((env("BC_X", "0.0040"), 0.0, env("BC_Z", "-0.0075")))      # from the right shoulder: in front of the chest, under the chin (y set from his tummy depth in the build)
LID_SIDE = Vector((env("LS_X", "0.0060"), 0.0, env("LS_Z", "-0.0040")))       # lid held from the left shoulder (his left, chest height; y set in the build)
HEAD0 = (0, 0, -2)
SEAT_HIP = 0.0075                # (Rig seated branch only; nobody sits in this film)


# ---------- generic helpers (uk_homework.py / egypt_breakfast.py) ----------
def hand_box(cx, cy, cz, ang, length, width, mat, name):
    """A clock hand from the centre, pointing ang (radians, clockwise from 12)."""
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


def frame_M(o, z, xhint):
    """Rigid matrix: origin o, local z along z, local x towards xhint (made perpendicular)."""
    z = Vector(z).normalized(); x = Vector(xhint); x = (x - x.dot(z) * z).normalized(); y = z.cross(x)
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = Vector(o); return M


def frame_XY(o, x, y):
    """Rigid matrix: origin o, local x along x, local y towards y (made perpendicular), z = x cross y."""
    x = Vector(x).normalized(); y = Vector(y); y = (y - y.dot(x) * x).normalized(); z = x.cross(y)
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


def mesh_hit(meshes, o, d):
    """First hit of a ray (world o, d) on these meshes only (evaluated, so a posed character counts)."""
    dg = bpy.context.evaluated_depsgraph_get(); best = None
    for ob in meshes:
        Mi = ob.matrix_world.inverted()
        ok, loc, n, idx = ob.ray_cast(Mi @ o, (Mi.to_3x3() @ d).normalized(), depsgraph=dg)
        if ok:
            p = ob.matrix_world @ loc; dist = (p - o).length
            if best is None or dist < best[0]: best = (dist, p)
    return best[1] if best else None


def rays_down(x, y, z_from):
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    ok, loc, n, idx, ob, mx = sc.ray_cast(dg, Vector((x, y, z_from)), Vector((0, 0, -1)), distance=2.0)
    return loc.z if ok else None


def set_M(ob, M, fr):
    ob.matrix_world = M; ob.scale = (1, 1, 1); key_obj(ob, fr, rot=True)


def hide(objs):
    for o in objs:
        for c in [o] + list(o.children_recursive): c.hide_render = True


def const_anim(idb):
    """Constant keys on any animated datablock (lights, materials), like E.constant for objects."""
    ad = getattr(idb, "animation_data", None)
    if not ad or not ad.action: return
    act = ad.action
    curves = list(act.fcurves) if hasattr(act, "fcurves") and len(act.fcurves) else \
        [fc for l in getattr(act, "layers", []) for s in l.strips for cb in s.channelbags for fc in cb.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"


def view_report(tag, pts):
    """Where things land in the camera frame at frame 0 (x 0 left .. 1 right, y 0 bottom .. 1 top)."""
    from bpy_extras.object_utils import world_to_camera_view as w2c
    sc.frame_set(0); bpy.context.view_layer.update()
    for name, p in pts:
        v = w2c(sc, sc.camera, Vector(p() if callable(p) else p))
        print("DESK VIEW %s %s x %.3f y %.3f depth %.3f%s" % (tag, name, v.x, v.y, v.z, "" if 0 < v.x < 1 and 0 < v.y < 1 else " OUT"), flush=True)


# ---------- probing Tripo furniture (rays straight down; models placed far away, measured, removed) ----------
def grid_hits(root, n=56, depth=6):
    bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(root)
    dg = bpy.context.evaluated_depsgraph_get(); cols = []
    for i in range(n + 1):
        for j in range(n + 1):
            x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * j / n; z = top + 0.05; hs = []
            for _ in range(depth):
                ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((x, y, z)), Vector((0, 0, -1)), distance=1.0)
                if not ok: break
                hs.append((loc.z, nrm.z)); z = loc.z - 1e-5
            cols.append((x, y, hs))
    return cols, (x0, x1, y0, y1, top)


def level(pts, top, lo, hi):
    """The flat level with the most upward hits between lo*top and hi*top. Returns (z, points on it)."""
    pts = [p for p in pts if lo * top < p[2] < hi * top]
    if not pts: return None, []
    bins = {}
    for p in pts: bins.setdefault(int(p[2] / (0.01 * top)), []).append(p)
    best = max(bins, key=lambda b: len(bins.get(b - 1, [])) + len(bins[b]) + len(bins.get(b + 1, [])))
    g = bins.get(best - 1, []) + bins[best] + bins.get(best + 1, [])
    zs = sorted(p[2] for p in g); z = zs[int(len(zs) * 0.5)]
    return z, [p for p in g if abs(p[2] - z) < 0.015 * top]


def squash(root, kd):
    """Scale the HEIGHTS of a placed model about the floor by kd (footprint unchanged): bmesh on world coordinates."""
    import bmesh
    bpy.context.view_layer.update()          # matrix_world must be the placed, scaled model (11/20 lesson)
    n = 0
    for o in [o for o in [root] + list(root.children_recursive) if o.type == "MESH"]:
        Mw = o.matrix_world; Mi = Mw.inverted()
        bm = bmesh.new(); bm.from_mesh(o.data)
        for v in bm.verts:
            w = Mw @ v.co; v.co = Mi @ Vector((w.x, w.y, FLOOR + (w.z - FLOOR) * kd)); n += 1
        bm.to_mesh(o.data); bm.free(); o.data.update()
    bpy.context.view_layer.update()
    return n


def xf(info, Hh, p, at):
    k = Hh / info["H0"]; c, s = math.cos(info["rot"]), math.sin(info["rot"])
    return (at[0] + k * (p[0] * c - p[1] * s), at[1] + k * (p[0] * s + p[1] * c))


def xbox(info, Hh, b, at):
    pts = [xf(info, Hh, (x, y), at) for x in b[:2] for y in b[2:]]
    return (min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts))



def probe_gate(Hh):
    """Gate model at height Hh measured far away: extent and the RIGHT pillar (highest hits at +x): centre x, front face y, top."""
    root = E.place(f"{PROPS}/india_school_gate.glb", Hh, (5, 5, 0))
    cols, (x0, x1, y0, y1, top) = grid_hits(root, n=64)
    first = [(x - 5, y - 5, hs[0][0]) for x, y, hs in cols if hs]
    hi = [p for p in first if p[2] > 0.93 * top and p[0] > 0]
    if not hi:
        print("DESK WARN no right pillar found on the gate", flush=True); hi = [((x1 - 5) * 0.6, (y0 - 5) * 0.5, top)]
    px = (min(p[0] for p in hi) + max(p[0] for p in hi)) / 2; pf = min(p[1] for p in hi); pw = max(p[0] for p in hi) - min(p[0] for p in hi)
    info = dict(x0=x0 - 5, x1=x1 - 5, y0=y0 - 5, y1=y1 - 5, top=top, px=px, pf=pf, pw=pw)
    print("DESK GATEPROBE size %.4f x %.4f x %.4f right pillar x %.4f width %.4f front y %.4f" % (x1 - x0, y1 - y0, top, px, pw, pf), flush=True)
    drop(root)
    return info


def side_profile(root, y_from, dy, z_fracs, n=72):
    """Horizontal rays at a few heights from one side (y_from, direction dy = +1 / -1) along x: how deep each ray goes."""
    bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(root); depth = y1 - y0
    dg = bpy.context.evaluated_depsgraph_get(); prof = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n; deep = 0
        for zf in z_fracs:
            ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((x, y_from, zf * top)), Vector((0, dy, 0)), distance=1.0)
            d = abs(loc.y - (y0 if dy > 0 else y1)) if ok else depth
            if d > 0.3 * depth: deep += 1
        prof.append((x, deep >= max(1, len(z_fracs) - 1)))
    best, run = (0, 0), None
    for i, (x, op) in enumerate(prof + [(0, False)]):
        if op and run is None: run = i
        if not op and run is not None:
            if i - run > best[1] - best[0]: best = (run, i)
            run = None
    return (prof[best[0]][0], prof[max(best[0], best[1] - 1)][0]) if best[1] > best[0] else None


def probe_rick(Hh, mirror):
    """Auto-rickshaw at height Hh (optionally mirrored in x) far away: where is its nose (-x or +x), the passenger opening on its
    -y side, the step under it, the cabin floor and the roof underside. Values relative to the bbox centre / floor."""
    root = E.place(f"{PROPS}/india_auto_rickshaw.glb", Hh, (5, 5, 0))
    if mirror: root.scale.x = -root.scale.x
    bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(root); L, D = x1 - x0, y1 - y0
    cols, _bb = grid_hits(root, n=48, depth=3)
    first = [(x, y, hs[0][0]) for x, y, hs in cols if hs]
    endl = max((p[2] for p in first if p[0] < x0 + 0.12 * L), default=top)
    endr = max((p[2] for p in first if p[0] > x1 - 0.12 * L), default=top)
    nose = -1 if endl < endr else 1
    opn = side_profile(root, y0 - 0.05, 1, (0.42, 0.52, 0.62))
    opp = side_profile(root, y1 + 0.05, -1, (0.42, 0.52, 0.62))
    info = dict(L=L, D=D, top=top, nose=nose, open_minus=opn, open_plus=opp, x0=x0 - 5, x1=x1 - 5, y0=y0 - 5, y1=y1 - 5)
    if opn:
        ox0, ox1 = opn; xm = (ox0 + ox1) / 2
        steps = []
        for k in range(10):
            for xx in (ox0 + 0.2 * (ox1 - ox0), xm, ox1 - 0.2 * (ox1 - ox0)):
                z = rays_down(xx, y0 + 0.0005 + k * 0.012 * D, 0.55 * top)
                if z is not None and 0.04 * top < z < 0.45 * top: steps.append((y0 + 0.0005 + k * 0.012 * D, z))
        if steps:
            sz = sorted(s[1] for s in steps)[len(steps) // 2]; sy = [s[0] for s in steps if abs(s[1] - sz) < 0.02 * top]
            info["step_z"], info["step_y"] = sz, (min(sy) - 5, max(sy) - 5)
        else:
            info["step_z"], info["step_y"] = 0.15 * top, (y0 - 5, y0 - 5 + 0.08 * D)
        # roof underside: rays DOWN from above the roof over the entry; the first downward-facing surface below the roof top
        # (check 1: an upward ray from the step hit the cabin floor, roof 0.23 of the height, rickshaw 4.16 x the pupil)
        dg = bpy.context.evaluated_depsgraph_get(); unders = []
        for xx in (ox0 + 0.3 * (ox1 - ox0), xm, ox1 - 0.3 * (ox1 - ox0)):
            for fy in (0.10, 0.25, 0.40):
                z = top + 0.05
                for _ in range(8):
                    ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((xx, y0 + fy * D, z)), Vector((0, 0, -1)), distance=1.0)
                    if not ok: break
                    if nrm.z < -0.3 and loc.z > 0.5 * top: unders.append(loc.z); break
                    z = loc.z - 1e-5
        info["roof_z"] = sorted(unders)[len(unders) // 2] if unders else 0.85 * top
        info["open"] = (ox0 - 5, ox1 - 5)
    print("DESK RICKPROBE H %.4f mirror %s L %.4f D %.4f nose at %s opening -y %s +y %s step %s roof_under %s" % (
        Hh, mirror, L, D, "-x" if nose < 0 else "+x", opn and tuple(round(v - 5, 4) for v in opn), opp and tuple(round(v - 5, 4) for v in opp),
        info.get("step_z") and round(info["step_z"], 4), info.get("roof_z") and round(info["roof_z"], 4)), flush=True)
    drop(root)
    return info


# ---------- the set ----------
def ground():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.board((0, 0.08), (0.70, 0.56), E.felt("pavement", (0.62, 0.46, 0.30)), "pavement", thick=FLOOR)
    line = E.mat("tileLine", (0.45, 0.32, 0.20), 0.9)
    for i in range(1, 18):
        E.box((-0.35 + i * 0.04, (ROAD_Y0 - 0.20) / 2, FLOOR + 0.0002), (0.0008, ROAD_Y0 + 0.20, 0.0004), line, "tileX", bevel=0)
    E.box((0, (ROAD_Y0 + ROAD_Y1) / 2, FLOOR + ROAD_T / 2), (0.70, ROAD_Y1 - ROAD_Y0, ROAD_T), E.felt("lane", (0.30, 0.27, 0.24)), "lane", bevel=0)
    E.box((0, ROAD_Y0, FLOOR + 0.00075), (0.70, 0.004, 0.0015), E.felt("kerb", (0.80, 0.76, 0.68)), "kerb", bevel=0)
    for i in range(0, 18, 2):                     # painted kerb stripes (black / yellow, common at Indian school gates)
        E.box((-0.35 + i * 0.04 + 0.02, ROAD_Y0 - 0.0021, FLOOR + 0.00075), (0.04, 0.0003, 0.0015), E.felt("kerbBlack", (0.03, 0.03, 0.03)), "kerbStripe", bevel=0)
    E.box((0, 0.46, FLOOR - 0.002), (1.2, 0.24, 0.004), E.felt("farGround", (0.55, 0.40, 0.24)), "farGround", bevel=0)
    E.box((0, 0.62, 0.30), (1.6, 0.004, 0.70), E.emission("daySky", (0.42, 0.64, 1.0), 0.9), "sky", bevel=0)


def neem(x, y, h):
    bark = E.felt("bark", (0.22, 0.13, 0.07)); leaf = E.felt("neemLeaf", (0.12, 0.36, 0.07)); leaf2 = E.felt("neemLeaf2", (0.18, 0.45, 0.09))
    E.cyl((x, y, FLOOR + h * 0.35), 0.006, h * 0.7, bark, verts=12, name="neemTrunk")
    import random
    rng = random.Random(3)
    for k in range(9):
        a = k * 0.7; r = rng.uniform(0.028, 0.042)
        E.ball((x + 0.045 * math.cos(a) * rng.uniform(0.4, 1.0), y + 0.02 * math.sin(a), FLOOR + h * rng.uniform(0.72, 0.98)), r, leaf if k % 2 else leaf2, "neemTop")


def houses():
    cols = [(0.85, 0.40, 0.45), (0.95, 0.75, 0.25), (0.40, 0.65, 0.85), (0.55, 0.80, 0.60), (0.95, 0.55, 0.25), (0.75, 0.55, 0.85)]
    win = E.mat("houseWin", (0.06, 0.08, 0.12), 0.3)
    for k, x in enumerate((-0.30, -0.18, -0.06, 0.06, 0.18, 0.30)):
        h = 0.12 + 0.03 * ((k * 7) % 3); w = 0.10
        E.box((x, 0.44, FLOOR + h / 2), (w, 0.04, h), E.felt("house%d" % k, cols[k]), "house", bevel=0.001)
        for (wx, wz) in ((-0.025, 0.4), (0.025, 0.4), (-0.025, 0.75), (0.025, 0.75)):
            E.box((x + wx, 0.4195, FLOOR + h * wz), (0.016, 0.002, 0.02), win, "houseWin", bevel=0)
        E.box((x, 0.44, FLOOR + h + 0.002), (w + 0.006, 0.046, 0.004), E.felt("roofEdge", (0.85, 0.82, 0.75)), "roofEdge", bevel=0)


def clock(cx, cy, cz, hh, mm):
    """Round clock on the pillar (ticks only, no numbers): hour hand between hh and hh+1, minute hand on mm."""
    r = CLOCK_R
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.05, 0.12, 0.35), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.98, 0.97, 0.92), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.06, 0.05, 0.05), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0012 if big else 0.0007), ink, "tick")
    hand_box(cx, cy - 0.0047, cz, math.radians(((hh % 12) + mm / 60.0) * 30), 0.42 * r, 0.0019, ink, "hourHand")
    hand_box(cx, cy - 0.0053, cz, math.radians(mm * 6), 0.64 * r, 0.0013, ink, "minuteHand")
    E.ball((cx, cy - 0.0055, cz), 0.0013, E.mat("clockPin", (0.75, 0.16, 0.14), 0.4), "clockPin")


def steel(name="steelOpaque", col=(0.62, 0.63, 0.66), rough=0.40):
    """Opaque brushed steel (check 2: it read as clear glass): metallic 1, roughness 0.40, no transmission, no coat."""
    if name in E._M: return E._M[name]
    m = E.mat(name, col, rough)
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Metallic"].default_value = 1.0
    for k in ("Transmission Weight", "Transmission", "Coat Weight", "Clearcoat"):
        if k in b.inputs: b.inputs[k].default_value = 0.0
    if "Alpha" in b.inputs: b.inputs["Alpha"].default_value = 1.0
    nz = m.node_tree.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 900.0
    bm = m.node_tree.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = 0.08      # fine brushed grain, so it never looks like glass
    m.node_tree.links.new(nz.outputs["Fac"], bm.inputs["Height"]); m.node_tree.links.new(bm.outputs["Normal"], b.inputs["Normal"])
    return m


def steel_dark():
    return steel("steelLine", (0.22, 0.22, 0.24), 0.5)


def make_box():
    """Round steel tiffin box (dabba), no handle. Empty at the bottom centre; inside looks empty from above."""
    emp = E.empty("tiffinBox"); emp.rotation_mode = "XYZ"
    st = steel(); inside = steel("steelIn", (0.45, 0.46, 0.48), 0.45)
    parts = [E.cyl((0, 0, BOX_H / 2), BOX_R, BOX_H, st, verts=48, name="boxBody"),
             E.cyl((0, 0, BOX_H - 0.00012), BOX_R * 0.92, 0.00004, inside, verts=48, name="boxInside")]
    for z, m_ in ((BOX_H, st), (BOX_H * 0.55, steel_dark()), (0.0002, steel_dark())):      # rolled rim + two darker pressed lines
        bpy.ops.mesh.primitive_torus_add(major_radius=BOX_R, minor_radius=0.00013, major_segments=48, minor_segments=6, location=(0, 0, z))
        o = bpy.context.object; o.name = "boxRing"; o.data.materials.append(m_); parts.append(o)
    for o in parts: o.parent = emp
    return emp


def make_lid():
    """Separate press-on lid: flat top with a ring groove and a short skirt. Empty at the underside of the top (sits on the box rim)."""
    emp = E.empty("tiffinLid"); emp.rotation_mode = "XYZ"
    st = steel()
    parts = [E.cyl((0, 0, LID_T / 2), LID_R, LID_T, st, verts=48, name="lidTop"),
             E.cyl((0, 0, -LID_SKIRT / 2), LID_R, LID_SKIRT, st, verts=48, name="lidSkirt"),
             E.cyl((0, 0, LID_T + KNOB_NECK / 2), KNOB_R * 0.6, KNOB_NECK, st, verts=16, name="lidKnobNeck"),
             E.ball((0, 0, KNOB_Z), KNOB_R, st, "lidKnob")]
    bpy.ops.mesh.primitive_torus_add(major_radius=LID_R * 0.62, minor_radius=0.00009, major_segments=48, minor_segments=6, location=(0, 0, LID_T))
    o = bpy.context.object; o.name = "lidGroove"; o.data.materials.append(steel_dark()); parts.append(o)
    bpy.ops.mesh.primitive_torus_add(major_radius=LID_R, minor_radius=0.00012, major_segments=48, minor_segments=6, location=(0, 0, -LID_SKIRT))
    o = bpy.context.object; o.name = "lidRimLine"; o.data.materials.append(steel_dark()); parts.append(o)      # darker line where lid meets box
    for o in parts: o.parent = emp
    return emp


# ---------- characters ----------
_MOUTH_REF = H._MOUTH_REF      # metrics() measures her lips into the shared dict; hands.mouth() then uses it


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
# tiffin box on the palm (storyboard): palm up under the bottom, four fingers a little cupped under it, thumb up on its outer side
G_TRAY = {"Thumb": (8, 6, 4), "Index": (10, 12, 8), "Middle": (10, 12, 8), "Ring": (10, 12, 8), "Pinky": (12, 12, 8)}
# lid rim: palm down over the lid, thumb pad on the rim on the chest side, index + middle (+ ring) pads on the rim on the camera side
# lid rim (hinge curls): the IN-film grip is searched between these two (see "LID" in the build) so the pads sit on opposite rims
G_LID_OPEN0 = {"Thumb": (5, 4, 2), "Index": (10, 10, 6), "Middle": (10, 10, 6), "Ring": (14, 12, 8), "Pinky": (16, 12, 8)}
G_LID_SHUT = {"Thumb": (35, 30, 20), "Index": (60, 55, 35), "Middle": (62, 58, 36), "Ring": (66, 60, 38), "Pinky": (70, 60, 38)}
# grab pole: fingers wrapped round the pole, thumb over them
G_WRAP = {"Thumb": (30, 22, 12), "Index": (55, 60, 40), "Middle": (58, 62, 42), "Ring": (60, 62, 42), "Pinky": (62, 62, 42), "_hinge": True}   # past 90 deg: hinge curls
HL = {}      # (character name, side) -> hand-local finger direction and palm direction (from the rest hand)


def hand_q(ch, side, fwd_w, palm_w):
    """World rotation of the hand bone that points its fingers along fwd_w with the palm towards palm_w."""
    def basis(a, b):
        a = Vector(a).normalized(); b = Vector(b); b = (b - b.dot(a) * a).normalized(); return Matrix((a, b, a.cross(b))).transposed()
    a_l, b_l = HL[(ch.name, side)]
    return (basis(fwd_w, palm_w) @ basis(a_l, b_l).transposed()).to_quaternion()


def set_hand_rot(ch, side, q):
    """Turn the hand bone to world rotation q (the wrist stays where the forearm puts it)."""
    bpy.context.view_layer.update(); pb = ch.pb[side + "Hand"]
    Ar = ch.arm.matrix_world.to_3x3().normalized()
    N = (Ar.inverted() @ q.to_matrix()).to_4x4(); N.translation = pb.matrix.translation.copy()
    pb.matrix = N


def hand_M(ch, side):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ ch.pb[side + "Hand"].matrix


def hand_rot_w(ch, side):
    return hand_M(ch, side).to_3x3().normalized().to_quaternion()


def wpt(ch, bone, tail=False):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ (ch.pb[bone].tail if tail else ch.pb[bone].head)


def near_verts(ch, p, r):
    """Skin vertices of the posed (deformed) character within r of world point p."""
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); out = []
    for o in ch.meshes:
        oe = o.evaluated_get(dg); me = oe.to_mesh(); Mw = oe.matrix_world
        for v in me.vertices:
            w = Mw @ v.co
            if (w - p).length < r: out.append(w)
        oe.to_mesh_clear()
    return out


def world_vec(ch, v):
    return (ch.arm.matrix_world.to_3x3().normalized() @ v).normalized()


def tblend(a, b, u):
    """Blend two hand targets (q, wrist, grip, pole)."""
    u = E.ease(u)
    g = {f: tuple(x + (y - x) * u for x, y in zip(a[2][f], b[2][f])) for f in FINGERS}
    if a[2].get("_hinge") or b[2].get("_hinge"): g["_hinge"] = True     # hinge curls also on the way in / out (same look at both ends)
    return (a[0].slerp(b[0], u), a[1].lerp(b[1], u), g, a[3].lerp(b[3], u))


def blend_dirs(a, b, u):
    u = E.ease(u)
    return {k: tuple(Vector(a[k]).normalized().lerp(Vector(b[k]).normalized(), u).normalized()) for k in b}


class Rig:
    """A posed character: legs (seated: thighs flat forward, shins straight down; standing: rest legs), spine lean, head twist,
    a base arm pose, arms by two-bone IK, hands turned and fingers curled (egypt_breakfast.py Sit, extended to standing)."""

    def __init__(self, ch, M, face_deg=0.0, lean=(0, 0, 0), seat_z=None, hips_xy=None, base=None):
        self.ch, self.M, self.lean = ch, M, lean
        a = math.radians(face_deg); c, s = math.cos(a), math.sin(a)
        self.rz = lambda v: Vector((v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]))
        self.pole = {"Right": self.rz((-0.7, 0.4, -1.0)), "Left": self.rz((0.7, 0.4, -1.0))}       # elbows out, back and down
        off = M["hips"] - M["root"]
        if seat_z is not None:
            self.seat_hip = SEAT_HIP
            ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y, seat_z + SEAT_HIP - M["hip_h"]))
            hipj = seat_z + SEAT_HIP + M["upleg_dz"]; dz = (FLOOR + M["knee_h"]) - hipj
            dz = max(-0.95 * M["thigh"], min(0.7 * M["thigh"], dz)); hz = math.sqrt(max(1e-12, M["thigh"] ** 2 - dz * dz))
            self.hz = hz
            self.legs = {"RightUpLeg": (-0.12 * M["thigh"], -hz, dz), "LeftUpLeg": (0.12 * M["thigh"], -hz, dz), "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)}
            self.base = dict(base or P_LAP)
        else:
            if hips_xy is not None: ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y))
            self.legs = {}; self.base = dict(base or E.P_stand())

    def body(self, t, arm_dirs, head, spine=None):
        """Legs + spine + head first, then the arms (so arm IK sees the leaning shoulders)."""
        ch = self.ch; dirs = dict(self.base); dirs.update(arm_dirs)
        ch.pose(t, dict(self.legs), twist={"Spine1": tuple(spine or self.lean), "Head": tuple(head)})
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            if b in dirs: ch._aim(b, dirs[b])
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            ch.pb[b].keyframe_insert("rotation_quaternion", frame=E.f(t))

    def learn_hands(self, head=HEAD0):
        self.body(0, {}, head)
        for s_ in ("Right", "Left"):
            w_, f_, a_, p_ = hand_frame(self.ch, s_)
            HL[(self.ch.name, s_)] = (to_local(self.ch, s_, f_, point=False).normalized(), to_local(self.ch, s_, p_, point=False).normalized())

    def rest(self, side, P, fwd, palm=(0, 0, -1), grip=None):
        """A hand lying flat (palm down) with its palm centre on world point P."""
        f = Vector(fwd).normalized()
        return (hand_q(self.ch, side, f, Vector(palm)), Vector(P) - f * (self.M["hand"] * 0.55) + Vector((0, 0, 0.0014)), grip or G_FLAT, self.pole[side].copy())

    def hanging(self, side, head=HEAD0):
        """The hand target of the base pose (arm hanging): blend from / to this one."""
        self.body(0, {}, head)
        return (hand_rot_w(self.ch, side), wpt(self.ch, side + "Hand"), G_RELAX, self.pole[side].copy())

    def from_prop(self, side, Md, C, grip):
        Mh = Md @ C.inverted()
        return (Mh.to_3x3().normalized().to_quaternion(), Mh.translation.copy(), grip, self.pole[side].copy())

    def calibrate(self, side, q, grip, head=HEAD0):
        """Pose a hand (rotation q, fingers curled) on a scratch pose; returns its world matrix."""
        self.body(0, {}, head); set_hand_rot(self.ch, side, q); (curl_hinge if grip.get("_hinge") else curl)(self.ch, side, grip)
        return hand_M(self.ch, side)

    def solve(self, t, fr, head, tr, tl, extra=None, spine=None):
        """tr / tl: hand targets (q, wrist, grip, pole) or None (that arm keeps the base pose or the directions in extra)."""
        ch = self.ch
        self.body(t, {}, head, spine)
        arms = {}
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            arms.update(ik_arm(ch, side, g[1], g[3]))
            if fr % 12 == 0: print("DESK REACH %s %s t=%.2f need %.4f arm %.4f" % ((ch.name, side, t) + ik_arm.last), flush=True)
        if extra: arms.update(extra)
        self.body(t, arms, head, spine)
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            set_hand_rot(ch, side, g[0]); (curl_hinge if g[2].get("_hinge") else curl)(ch, side, g[2]); key_hand(ch, side, fr)



# ================= build =================
ch = E.Char("india_boy", (0.30, -0.15), 0, height=PUPIL)     # placed properly below
M_ = metrics(ch)

# --- the school gate (clock on its right pillar, high enough to show over the rickshaw roof) ---
GATE_H = PUPIL * GATE_K
GI = probe_gate(GATE_H)
GATE_X = env("GATE_X", "0.0")
GATE_Y = GATE_FRONT - GI["y0"]
# --- the auto-rickshaw: nose to -x (it drives in from the right, nose first), open passenger side to the camera (-y),
#     tall enough for the boy standing on its step (head under the roof) ---
RICK_MIRROR = False
RI = probe_rick(PUPIL * RICK_MIN_K, False)
if RI["nose"] > 0:
    RICK_MIRROR = True; RI = probe_rick(PUPIL * RICK_MIN_K, True)
if RI.get("open") is None:
    print("DESK WARN no passenger opening found on the camera side of the rickshaw (check the model / side_profile heights)", flush=True)
    RI["open"] = (RI["x0"] + 0.45 * RI["L"], RI["x0"] + 0.75 * RI["L"]); RI["step_z"] = 0.15 * RI["top"]; RI["roof_z"] = 0.85 * RI["top"]
    RI["step_y"] = (RI["y0"], RI["y0"] + 0.08 * RI["D"])
fs, fr_ = RI["step_z"] / RI["top"], RI["roof_z"] / RI["top"]
RICK_H = max(PUPIL * RICK_MIN_K, (PUPIL + 0.003) / max(0.25, fr_ - fs))
if RICK_H > PUPIL * RICK_MAX_K:
    print("DESK WARN rickshaw would be %.2f x the pupil to give head room on the step: capped at %.2f (check roof_under)" % (RICK_H / PUPIL, RICK_MAX_K), flush=True)
    RICK_H = PUPIL * RICK_MAX_K
if RICK_H > PUPIL * RICK_MIN_K * 1.01: RI = probe_rick(RICK_H, RICK_MIRROR)
print("DESK RICK height %.4f (%.2f x pupil): step %.4f roof underside %.4f -> head room on the step %.4f" % (
    RICK_H, RICK_H / PUPIL, RI["step_z"], RI["roof_z"], RI["roof_z"] - RI["step_z"] - PUPIL), flush=True)

ground(); neem(-0.21, 0.30, 0.17); houses()
gate_root = E.place(f"{PROPS}/india_school_gate.glb", GATE_H, (GATE_X, GATE_Y, FLOOR)); E.obstacle(gate_root)
PILLAR_X, PILLAR_FRONT = GATE_X + GI["px"], GATE_Y + GI["pf"]
CLOCK = (PILLAR_X, PILLAR_FRONT - 0.0026, FLOOR + GI["top"] - CLOCK_R - 0.006)
clock(CLOCK[0], CLOCK[1], CLOCK[2], 2, 40)
L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.35"))
bpy.ops.object.light_add(type="SUN", location=(0, 0, 0.6)); sun = bpy.context.object             # bright afternoon sun from the front-left
sun.data.energy = env("SUN", "1.5"); sun.data.color = (1, 0.92, 0.78); sun.data.angle = math.radians(3)
sun.rotation_euler = (math.radians(50), 0, math.radians(-25))
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); frontl = bpy.context.object
frontl.data.energy = env("FRONT", "1.8"); frontl.data.color = (1, 0.94, 0.84); frontl.data.size = 0.5; frontl.rotation_euler = (math.radians(25), 0, 0)

OPEN_C = (RI["open"][0] + RI["open"][1]) / 2
RX = PILLAR_X - env("OPEN_LEFT", "0.050") - OPEN_C           # rickshaw stop: its entry a little left of the right pillar
RY = ROAD_Y0 + 0.004 - RI["y0"]
RZ = FLOOR + ROAD_T
STEP_W = RZ + RI["step_z"]; ROOF_W = RZ + RI["roof_z"]
POLE_X, POLE_Y = RX + RI["open"][1] - 0.0018, RY + RI["y0"] + 0.0025
STEP_Y = RY + (RI["step_y"][0] + RI["step_y"][1]) / 2
SEAT_PT = Vector((RX + RI["x0"] + 0.30 * RI["L"], RY + 0.5 * (RI["y0"] + RI["y1"]), RZ + 0.45 * RI["top"]))   # the (empty) driver seat
B1 = (PILLAR_X - 0.030, ROAD_Y0 - 0.022)
B3 = (RX + OPEN_C - 0.045, ROAD_Y0 - 0.022)
print("DESK LAYOUT gate (%.4f, %.4f) h %.4f right pillar x %.4f front %.4f clock %s | rickshaw stop (%.4f, %.4f) mirror %s entry x %.4f..%.4f step %.4f pole (%.4f, %.4f) | boy IN1 %s IN3 %s" % (
    GATE_X, GATE_Y, GATE_H, PILLAR_X, PILLAR_FRONT, tuple(round(v, 4) for v in CLOCK), RX, RY, RICK_MIRROR, RX + RI["open"][0], RX + RI["open"][1],
    STEP_W - FLOOR, POLE_X, POLE_Y, tuple(round(v, 4) for v in B1), tuple(round(v, 4) for v in B3)), flush=True)

rick = pole = None
if SHOT in ("IN3", "IN4"):
    rick = E.place(f"{PROPS}/india_auto_rickshaw.glb", RICK_H, (RX, RY, RZ))
    if RICK_MIRROR: rick.scale.x = -rick.scale.x
    E.obstacle(rick)
    pole = E.cyl((POLE_X, POLE_Y, (STEP_W + ROOF_W) / 2), POLE_R, ROOF_W - STEP_W, E.mat("chrome", (0.85, 0.85, 0.88), 0.2), verts=12, name="grabPole")
    pole.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.8
    bpy.context.view_layer.update()
    pole.parent = rick; pole.matrix_parent_inverse = rick.matrix_world.inverted()

GL = (B1[0] - 0.11, B1[1] - 0.012)


def cam_yaw(cam_xy, at_xy):
    """face_deg that turns a character standing at at_xy towards a camera at cam_xy."""
    return math.degrees(math.atan2(cam_xy[0] - at_xy[0], -(cam_xy[1] - at_xy[1])))


def seat_report(tag, frames_):
    """Is the (empty) driver seat inside the picture and not hidden behind the rickshaw body / the boy? (teacher: no driver)"""
    from bpy_extras.object_utils import world_to_camera_view as w2c
    for fr in frames_:
        sc.frame_set(fr); bpy.context.view_layer.update()
        cam = sc.camera.matrix_world.translation.copy()
        p = rick.matrix_world @ SEAT_LOCAL
        v = w2c(sc, sc.camera, p); inside = 0 < v.x < 1 and 0 < v.y < 1 and v.z > 0
        dg = bpy.context.evaluated_depsgraph_get(); d = p - cam
        ok, loc, n, idx, ob, mx = sc.ray_cast(dg, cam, d.normalized(), distance=d.length - 0.015)   # an occluder at least 1.5 cm in front of the seat point
        print("DESK VIEW %s driver_seat t=%.2f in_picture %d hidden_by %s %s" % (tag, fr / E.FPS, int(inside), ob.name if ok else "-",
              "" if (not inside or ok) else "WARN the empty driver seat can be seen"), flush=True)


SEAT_LOCAL = None
if rick is not None:
    bpy.context.view_layer.update(); SEAT_LOCAL = rick.matrix_world.inverted() @ SEAT_PT

# --- the boy ---
if SHOT == "IN1":
    FACE = -20.0; HXY = B1
elif SHOT == "IN2":
    FACE = 0.0; HXY = B1
elif SHOT == "IN3":
    CAM3 = Vector((B3[0] + 0.03, 0.10, FLOOR + 0.05)) + Vector((0.17, -0.30, 0.04))
    FACE = cam_yaw(CAM3.xy, B3); HXY = B3
else:
    HX4 = min(POLE_X - M_["sh_half"] - 0.0065, RX + OPEN_C)
    CAM4 = Vector((HX4 + 0.004, STEP_Y, STEP_W + 0.040)) + Vector((0.10, -0.28, 0.03))
    FACE = cam_yaw(CAM4.xy, (HX4, STEP_Y)); HXY = (HX4, STEP_Y)
ch.at(0, face_deg=FACE)
rig = Rig(ch, M_, FACE, (0, 0, 0), hips_xy=HXY)
if SHOT == "IN4":
    off = M_["hips"] - M_["root"]
    ch.at(0, loc=(HXY[0] - off.x, HXY[1] - off.y, STEP_W))               # feet on the step
rig.learn_hands()
SHR, SHL = wpt(ch, "RightArm"), wpt(ch, "LeftArm")
hang_L = rig.hanging("Left")
mouth0 = mouth(ch)
UPV = Vector((0, 0, 1)); BOXX = rig.rz((0.35, -0.9, 0.0))

# --- LID, left hand (check 2): the lid is lifted by PINCHING ITS KNOB between the thumb pad and the index pad (hinge curls,
# hands.curl_hinge). The hand comes from his left and above, palm down. The grip is searched between open and shut until the
# two pads (skin read from the mesh) are one knob width apart at the same height; the knob radius follows that (0.4-0.7 mm),
# the lid and the box keep their real size.
q_lid = hand_q(ch, "Left", rig.rz((-0.65, -0.35, -0.65)), -UPV)
best = None
for k in range(11):
    u = k / 10.0
    G = {f: tuple(a + (b - a) * u for a, b in zip(G_LID_OPEN0[f], G_LID_SHUT[f])) for f in FINGERS}; G["_hinge"] = True
    Mh = rig.calibrate("Left", q_lid, G)
    _w, _f, _a, _p = hand_frame(ch, "Left"); upl = -world_vec(ch, _p)
    TH = wpt(ch, "LeftHandThumb3", True); IX = wpt(ch, "LeftHandIndex3", True)
    tv = near_verts(ch, TH, 0.0014) or [TH]; iv = near_verts(ch, IX, 0.0014) or [IX]
    padT = min(tv, key=lambda v: (v - IX).length); padF = min(iv, key=lambda v: (v - padT).length)
    d = padF - padT; dz = d.dot(upl); span = (d - dz * upl).length
    score = abs(span - 2 * KNOB_R) + 2 * abs(dz)
    print("DESK GRIP knob step %.1f thumb-index pads %.4f apart, height diff %+.4f" % (u, span, dz), flush=True)
    if best is None or score < best[0]: best = (score, G, padT, padF, span, dz, upl)
_sc, G_LID, padT, padF, span, dz, upl = best
KNOB_R = max(0.0004, min(0.0007, span / 2))
KNOB_Z = LID_T + KNOB_NECK + KNOB_R                       # knob centre above the lid's underside (lid local)
G_LID_OPEN = {f: tuple(a * 0.5 for a in G_LID[f]) for f in FINGERS}; G_LID_OPEN["_hinge"] = True
Mh = rig.calibrate("Left", q_lid, G_LID)
d = padF - padT; mid = (padT + padF) / 2
C_LID = Mh.inverted() @ frame_M(mid - upl * KNOB_Z, upl, d - d.dot(upl) * upl)        # the knob centre between the two pads
gT = (padT - mid).length - KNOB_R; gF = (padF - mid).length - KNOB_R
print("DESK GRIP knob pinch: thumb pad to knob %.4f index pad to knob %.4f (knob radius %.4f, pads height diff %+.4f) %s" % (gT, gF, KNOB_R, dz,
      "" if max(abs(gT), abs(gF)) <= 0.0006 and abs(dz) < 0.0006 else "WARN the pads are not on the knob: adjust G_LID_SHUT / q_lid"), flush=True)
BOX_CHEST.y = -(M_["front"] + BOX_R + 0.0006)               # box wall just in front of his chest
LID_SIDE.y = -(M_["front"] + LID_R + 0.0010)                # lid held flat in front of his left chest, clear of the shirt

# --- TIFFIN BOX, right hand: palm up under the bottom, fingers forward and in; the box is pushed off the palm centre until its
# wall clears the thumb, so the thumb lies along the box's outer (his right) side, never through it (check 1) ---
Mh = rig.calibrate("Right", hand_q(ch, "Right", rig.rz((0.35, -0.9, 0.05)), UPV), G_TRAY)
_w, _f, _a, _p = hand_frame(ch, "Right"); palm_r = world_vec(ch, _p); fwd_r = world_vec(ch, _f)
pc = (wpt(ch, "RightHand") + wpt(ch, "RightHandMiddle1")) / 2
tv = []
for b_ in ("RightHandThumb2", "RightHandThumb3"):
    tv += near_verts(ch, wpt(ch, b_), 0.0012)
tv += near_verts(ch, wpt(ch, "RightHandThumb3", True), 0.0010)
tv = [v for v in tv if (v - pc).dot(palm_r) < BOX_H + 0.0004]         # only the part of the thumb beside the box
bc = pc + palm_r * 0.0004
if tv:
    tm = sum(tv, Vector()) / len(tv); uu = (bc - tm); uu -= uu.dot(palm_r) * palm_r; uu.normalize()
    hd = lambda c: min(((v - c) - (v - c).dot(palm_r) * palm_r).length for v in tv)
    for _ in range(80):
        if hd(bc) >= BOX_R + 0.0001: break
        bc = bc + uu * 0.0001
print("DESK GRIP box palm %s (up when z > 0.8) box centre %.4f from the palm centre, thumb clearance %.4f" % (
    tuple(round(v, 2) for v in palm_r), ((bc - pc) - (bc - pc).dot(palm_r) * palm_r).length, (hd(bc) - BOX_R) if tv else -1), flush=True)
C_BOX = Mh.inverted() @ frame_M(bc, palm_r, fwd_r)
rig.body(0, {}, HEAD0)


def body_clear(Mb):
    """Gap between the box wall and his body, along the line from the box centre to his middle (> 0 = no overlap)."""
    c = Mb @ Vector((0, 0, BOX_H / 2)); hp = wpt(ch, "Hips"); tgt = Vector((hp.x, hp.y, c.z)); dv = tgt - c
    hit = mesh_hit(ch.meshes, c, dv.normalized()) if dv.length > 1e-6 else None
    return ((hit - c).length - BOX_R) if hit is not None else 1.0
box = make_box(); lid = make_lid()

M_WAIST = frame_M(SHR + rig.rz(BOX_WAIST), UPV, BOXX)
M_CHEST = frame_M(SHR + rig.rz(BOX_CHEST), UPV, BOXX)
M_TILT = frame_M(SHR + rig.rz(BOX_CHEST) + Vector((0, 0, 0.0005)), rig.rz((0, -math.sin(BOX_TILT), math.cos(BOX_TILT))), BOXX)
M_LIDSIDE = frame_M(SHL + rig.rz(LID_SIDE), UPV, rig.rz((-0.2, -1, 0)))


def lid_on(Mb):
    up_ = (Mb.to_3x3() @ Vector((0, 0, 1))).normalized()
    return frame_M(Mb @ Vector((0, 0, BOX_H)), up_, rig.rz((0, -1, 0)))


def box_now():
    return hand_M(ch, "Right") @ C_BOX


def lid_now():
    return hand_M(ch, "Left") @ C_LID


def point_dirs(t, ans0, ans1, from_xy):
    pt = Vector(local_dir(from_xy, FACE, CLOCK, SHL.z)).normalized()
    pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()       # LEFT hand: outside the shoulder
    k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
    return {b: v for b, v in E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=False).items() if b.startswith("Left")}, pt


def wave_l(t):
    return {b: v for b, v in E.P_wave(int(t * 3) % 2, right=False).items() if b.startswith("Left")}


Q_WAVE_L = hand_q(ch, "Left", rig.rz((0.1, -0.1, 1)), rig.rz((-0.05, -1, 0.1)))
BASE_L = {k: v for k, v in E.P_stand().items() if k.startswith("Left")}

if SHOT == "IN1":
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.6, VOICE["a"], VOICE["a"] + 1.9
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            ext, pt = point_dirs(t, ans0, ans1, HXY); head = (0, 6, 6) if t < ans1 else (0, 0, 2)
        else:
            ext, head = None, (0, -14, 0)                  # listening: head turned to the traveller (on his right, -x)
        rig.solve(t, fr, head, rig.from_prop("Right", M_WAIST, C_BOX, G_TRAY), None, extra=ext)
        if ext: curl_hinge(ch, "Left", G_POINT); key_hand(ch, "Left", fr)        # past 90 deg: hinge curls (shared rule, 11/21 USA)
        Mb = box_now(); set_M(box, Mb, fr); set_M(lid, lid_on(Mb), fr)
        if fr % 24 == 0: print("CONTACT IN1 t=%.2f box_off_target %.4f box_bottom_above_floor %.4f box_to_body %.4f" % (
            t, (Mb.translation - M_WAIST.translation).length, Mb.translation.z - FLOOR, body_clear(Mb)), flush=True)
    ch.finish()

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)      # looks up at the clock
        return E.P_stand(), (0, 14, 0)
    if CAMSUB == "main": stand("traveler_girl", GL, 35, girl, height=GIRL)

elif SHOT == "IN2":
    BK = [(0.0, M_WAIST), (0.3, M_WAIST), (1.0, M_CHEST), (1.9, M_CHEST), (2.3, M_TILT), (9.0, M_TILT)]
    GRAB = EVENTS["lid_off"]
    LK = [(GRAB, lid_on(M_CHEST)), (GRAB + 0.2, Tr(0, 0, 0.0025) @ lid_on(M_CHEST)), (2.0, M_LIDSIDE), (9.0, M_LIDSIDE)]
    pre = rig.from_prop("Left", Tr(0, 0, 0.0015) @ lid_on(M_CHEST), C_LID, G_LID_OPEN)
    grab = rig.from_prop("Left", lid_on(M_CHEST), C_LID, G_LID)

    def left(t):
        if t < 0.6: return hang_L
        if t < 1.05: return tblend(hang_L, pre, (t - 0.6) / 0.45)
        if t < GRAB: return tblend(pre, grab, (t - 1.05) / (GRAB - 1.05))
        return rig.from_prop("Left", key_M(LK, t), C_LID, G_LID)

    def head(t):
        if t < 0.4: return HEAD0
        if t < 1.7: return (0, 0, -12)                   # looks at the box and the lid
        return (0, 0, -3)                                 # "My tiffin box is empty!" to the camera
    said = False
    for fr in E.frames():
        t = fr / E.FPS
        rig.solve(t, fr, head(t), rig.from_prop("Right", key_M(BK, t), C_BOX, G_TRAY), left(t))
        Mb = box_now(); set_M(box, Mb, fr)
        Ml = lid_on(Mb) if t < GRAB else lid_now()
        if t >= GRAB and not said:
            said = True; j = (lid_now().translation - lid_on(Mb).translation).length
            print("CONTACT IN2 lid grab t=%.2f lid_jump %.4f %s" % (t, j, "" if j < 0.0006 else "WARN the hand did not reach the lid"), flush=True)
        set_M(lid, Ml, fr)
        if fr % 4 == 0:
            print("CONTACT IN2 t=%.2f box_top_below_mouth %.4f box_off_target %.4f lid_above_box %.4f box_to_body %.4f" % (
                t, mouth(ch).z - (Mb @ Vector((0, 0, BOX_H))).z, (Mb.translation - key_M(BK, t).translation).length,
                (Ml.translation - lid_on(Mb).translation).length, body_clear(Mb)), flush=True)
    ch.finish()

elif SHOT == "IN3":
    BK = [(0.0, M_TILT), (0.3, M_CHEST), (0.75, M_CHEST), (1.35, M_WAIST), (9.0, M_WAIST)]
    ON = EVENTS["lid_on"]
    LK = [(0.0, M_LIDSIDE), (0.45, Tr(0, 0, 0.002) @ lid_on(M_CHEST)), (ON, lid_on(M_CHEST))]
    off_ = rig.from_prop("Left", Tr(0, 0, 0.0016) @ Tr(*rig.rz((0.0, 0.0012, 0.0))) @ lid_on(M_CHEST), C_LID, G_LID_OPEN)
    W0 = 1.8

    def head(t):
        if t < 0.75: return (0, 0, -10)
        if t < 1.8: return (0, 12, 0)                    # looks at the rickshaw coming in (his left)
        return (0, 4, 0)
    rel_said = False
    for fr in E.frames():
        t = fr / E.FPS
        tr = rig.from_prop("Right", key_M(BK, t), C_BOX, G_TRAY)
        if t <= ON:
            rig.solve(t, fr, head(t), tr, rig.from_prop("Left", key_M(LK, t), C_LID, G_LID))
        elif t < 1.3:
            g = tblend(rig.from_prop("Left", lid_on(M_CHEST), C_LID, G_LID), off_, (t - ON) / 0.2) if t < ON + 0.2 else tblend(off_, hang_L, (t - ON - 0.2) / (1.3 - ON - 0.2))
            rig.solve(t, fr, head(t), tr, g)
        else:
            u = (t - W0) / 0.3
            ext = None if t < W0 else (blend_dirs(BASE_L, wave_l(t), u) if u < 1 else wave_l(t))
            rig.solve(t, fr, head(t), tr, None, extra=ext)
            if t >= W0:
                set_hand_rot(ch, "Left", hand_rot_w(ch, "Left").slerp(Q_WAVE_L, min(1.0, max(0.0, u)))); curl(ch, "Left", G_WAVE); key_hand(ch, "Left", fr)
        Mb = box_now(); set_M(box, Mb, fr)
        if t <= ON: Ml = lid_now()
        else:
            if not rel_said:
                rel_said = True; Ml0 = lid_now(); j = (Ml0.translation - lid_on(Mb).translation).length
                print("CONTACT IN3 lid on t=%.2f lid_to_box_rim %.4f %s" % (t, j, "" if j < 0.0006 else "WARN let go before the lid sat on the box"), flush=True)
            Ml = lid_on(Mb)
        set_M(lid, Ml, fr)
        u = min(1.0, max(0.0, (t - EVENTS["rick_in"]) / (EVENTS["rick_stop"] - EVENTS["rick_in"])))
        rick.location.x = RX + env("RICK_RUN", "0.30") * (1 - u) ** 3; rick.keyframe_insert("location", frame=fr)
        if fr % 4 == 0:
            print("CONTACT IN3 t=%.2f rickshaw_x %.4f lid_off_box %.4f box_off_target %.4f" % (t, rick.location.x - RX, (Ml.translation - lid_on(Mb).translation).length,
                  (Mb.translation - key_M(BK, t).translation).length), flush=True)
    ch.finish(); E.constant(rick)

else:
    # IN4: on the step, left hand on the grab pole, then a wave; the box stays in his right hand (lid on)
    Mh = rig.calibrate("Left", hand_q(ch, "Left", Vector((0.1, -0.7, 0.7)), Vector((1, 0, 0))), G_WRAP)
    _w, _f, _a, _p = hand_frame(ch, "Left"); palm_p = world_vec(ch, _p)
    pcl = (wpt(ch, "LeftHand") + wpt(ch, "LeftHandMiddle1")) / 2
    C_POLE = Mh.inverted() @ Matrix.Translation(pcl + palm_p * (POLE_R + 0.0002))
    th_ = wpt(ch, "LeftHandThumb3", True) - (pcl + palm_p * (POLE_R + 0.0002))
    print("DESK GRIP pole palm %s thumb_side_y %+.4f (camera side when < 0)" % (tuple(round(v, 2) for v in palm_p), th_.y), flush=True)
    rig.body(0, {}, HEAD0)
    shl = wpt(ch, "LeftArm")
    GRIP = Vector((POLE_X, POLE_Y, shl.z - 0.006))
    hold = rig.from_prop("Left", Matrix.Translation(GRIP), C_POLE, G_WRAP)
    let = rig.from_prop("Left", Matrix.Translation(GRIP + Vector((-0.0022, -0.0008, 0.0))), C_POLE, G_RELAX)
    REL, W0 = 4.9, 5.15
    feet = (wpt(ch, "LeftFoot").z + wpt(ch, "RightFoot").z) / 2 - M_["ankle_h"]
    print("DESK STEP feet_above_step %.4f head_room %.4f pole_to_shoulder %.4f entry width %.4f shoulders %.4f" % (
        feet - STEP_W, ROOF_W - (feet + PUPIL), (GRIP - shl).length, RI["open"][1] - RI["open"][0], 2 * M_["sh_half"]), flush=True)

    def head(t):
        if t < REL: return (0, 0, 0)
        return (0, -8, 0)                                # waves to the traveller (off the picture, his right)
    for fr in E.frames():
        t = fr / E.FPS
        tr = rig.from_prop("Right", M_WAIST, C_BOX, G_TRAY)
        if t < REL:
            rig.solve(t, fr, head(t), tr, hold)
        elif t < W0:
            rig.solve(t, fr, head(t), tr, tblend(hold, let, (t - REL) / (W0 - REL)))
        elif t < 6.9:
            u = (t - W0) / 0.3
            rig.body(t, {}, head(t)); ik_l = ik_arm(ch, "Left", let[1], let[3])
            ext = blend_dirs(ik_l, wave_l(t), u) if u < 1 else wave_l(t)
            rig.solve(t, fr, head(t), tr, None, extra=ext)
            set_hand_rot(ch, "Left", hand_rot_w(ch, "Left").slerp(Q_WAVE_L, min(1.0, u))); curl(ch, "Left", G_WAVE); key_hand(ch, "Left", fr)
        else:
            u = min(1.0, (t - 6.9) / 0.4)
            rig.solve(t, fr, head(t), tr, None, extra=blend_dirs(wave_l(6.9), BASE_L, u))
        Mb = box_now(); set_M(box, Mb, fr); set_M(lid, lid_on(Mb), fr)
        if fr % 12 == 0:
            gp = (wpt(ch, "LeftHand") + wpt(ch, "LeftHandMiddle1")) / 2
            print("CONTACT IN4 t=%.2f palm_to_pole %.4f feet_above_step %.4f box_off_target %.4f" % (
                t, (Vector((gp.x, gp.y, 0)) - Vector((POLE_X, POLE_Y, 0))).length - POLE_R,
                (wpt(ch, "LeftFoot").z + wpt(ch, "RightFoot").z) / 2 - M_["ankle_h"] - STEP_W, (Mb.translation - M_WAIST.translation).length), flush=True)
    ch.finish()
for o in (box, lid): E.constant(o)

# ---------- cameras ----------
bpy.context.view_layer.update()
box_w = M_WAIST.translation + Vector((0, 0, BOX_H * 0.5)); box_c = M_CHEST.translation + Vector((0, 0, BOX_H * 0.5))
lid_c = lid_on(M_CHEST).translation
HANDCAM = {   # aim, camera offset, lens (DOF off). His right hand is on the -x side, his left hand on the +x side.
    "IN1HF": (box_w, Vector((-0.07, -0.12, 0.04)), 170), "IN1HS": (box_w, Vector((-0.14, -0.01, 0.02)), 170),
    "IN2HF": (lid_c, Vector((0.07, -0.12, 0.05)), 170), "IN2HS": (lid_c, Vector((0.14, -0.01, 0.03)), 170),
    "IN2HF2": (box_c, Vector((-0.07, -0.12, 0.03)), 170), "IN2HS2": (box_c, Vector((-0.14, -0.01, 0.02)), 170),
    "IN3HF": (lid_c, Vector((0.07, -0.12, 0.05)), 170), "IN3HS": (lid_c, Vector((0.14, -0.01, 0.03)), 170)}
if SHOT == "IN4":
    HANDCAM.update({"IN4HF": (GRIP, Vector((0.07, -0.12, 0.03)), 170), "IN4HS": (GRIP, Vector((0.05, -0.09, 0.10)), 170),
                    "IN4L": (Vector((HXY[0], STEP_Y, STEP_W + 0.003)), Vector((-0.08, -0.13, 0.01)), 150),
                    "IN4L2": (Vector((HXY[0], STEP_Y, STEP_W + 0.003)), Vector((0.08, -0.13, 0.005)), 150)})
key = SHOT + ("" if CAMSUB == "main" else CAMSUB)
if key in HANDCAM:
    aim, off, lens = HANDCAM[key]
    cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
    for cd in bpy.data.cameras: cd.dof.use_dof = False
elif SHOT == "IN1":          # wide: the traveller left, the boy in front of the right pillar, the clock top right
    aim0 = Vector(((B1[0] + GL[0]) / 2 + 0.02, 0.10, FLOOR + 0.070))
    cam_move(42, aim0 + Vector((-0.01, -0.56, 0.075)), aim0, aim0 + Vector((-0.005, -0.50, 0.068)), aim0 + Vector((0, 0, 0.002)),
             focus=(B1[0], B1[1], FLOOR + 0.05))
elif SHOT == "IN2":          # half body: chest, box and lid
    aim = Vector((B1[0] + 0.002, B1[1], FLOOR + 0.046))
    cam_move(75, aim + Vector((-0.01, -0.23, 0.012)), aim, aim + Vector((-0.008, -0.215, 0.011)), aim, focus=(B1[0], B1[1] - 0.008, FLOOR + 0.045))
elif SHOT == "IN3":          # from the front-RIGHT: the rickshaw drives in from the right, its cab never faces the camera
    aim = Vector((B3[0] + 0.03, 0.10, FLOOR + 0.05))
    cam_move(45, CAM3, aim, CAM3, aim, focus=(B3[0], B3[1], FLOOR + 0.05))
else:                        # IN4: him on the step, a little from the right; the clock on the pillar top right
    aim = Vector((HXY[0] + 0.004, STEP_Y, STEP_W + 0.040))
    cam_move(50, CAM4, aim, CAM4, aim, focus=(HXY[0], STEP_Y, STEP_W + 0.05))
print("DESK CAM %s %s face %.1f" % (SHOT, CAMSUB, FACE), flush=True)
if SHOT in ("IN1", "IN2"):          # check 2: the hand must never hide the whole box -> rays from the camera to 9 points on the box
    from bpy_extras.object_utils import world_to_camera_view as w2c
    for fr in ([0, 30, 56] if SHOT == "IN2" else [0, 72]):
        sc.frame_set(fr); bpy.context.view_layer.update(); co = sc.camera.matrix_world.translation.copy()
        Mb = box.matrix_world.copy(); seen = 0; tot = 0; dg = bpy.context.evaluated_depsgraph_get()
        for a in range(8):
            for zf in (0.25, 0.75):
                q = Mb @ Vector((BOX_R * 0.98 * math.cos(a * math.pi / 4), BOX_R * 0.98 * math.sin(a * math.pi / 4), BOX_H * zf))
                if (q - co).dot(q - Mb.translation) > 0: continue          # back side of the box
                tot += 1; dv = q - co
                ok, loc, n, idx, ob, mx = sc.ray_cast(dg, co, dv.normalized(), distance=dv.length - 0.0003)
                if not ok or ob.name.startswith(("boxBody", "boxRing", "boxInside", "lid")): seen += 1
        print("DESK VIEW %s%s box_visible f%04d %d of %d front points %s" % (SHOT, "" if CAMSUB == "main" else CAMSUB, fr, seen, tot,
              "" if tot == 0 or seen >= tot / 3 else "WARN the hand hides the box"), flush=True)
if CAMSUB == "main":
    view_report(SHOT, [("clock", CLOCK), ("boy_head", lambda: wpt(ch, "Head")), ("left_shoe", lambda: wpt(ch, "LeftFoot")), ("box", box_w)])
    if rick is not None: seat_report(SHOT, [0, E.f(0.9), E.f(1.3), E.f(T)])

E.run(A[3:])
