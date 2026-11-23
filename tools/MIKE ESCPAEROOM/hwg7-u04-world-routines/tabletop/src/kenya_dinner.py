# World Routines Trip, he/she version - Kenya station "She has dinner at seven thirty." (tabletop style H), built by
# kenya_dinner_build.py from the accepted I-version kenya_morning.py (read its header for the hand rules).
#   KE1 (7.4 s) evening, lamp on: Amani sits on her bed and points at the 7:30 clock with her LEFT hand.
#       "This is Amani. What time does she have dinner?" / "She has dinner at seven thirty."
#   KE4 (9.0 s) the window table set for the family (three plates, three cups): a sip of tea, then one piece of ugali to the mouth.
#       "Her family eats dinner together." (0.3) / "She eats ugali and sukuma wiki." (on the bite)
#   KE4UG camera: close-up of her plate (ugali mound + sukuma wiki) and the flour bag. "Ugali is made from white corn flour."
# No traveller (anchor and reporter are voices only).
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
from hands import *            # shared hand helpers (tabletop/src/hands.py)
import hands as H

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with kenya_compose.py (SHOTS)
DUR = {"KE1": 7.4, "KE2": 3.8, "KE3": 3.0, "KE4": 9.0}
VOICE = {"q": 0.4, "a": 4.4, "dark": 2.3, "gm": 1.5, "a4": 0.3, "tea1": 2.7, "tea2": 6.3}
# planned contact times (seconds in the shot) used by kenya_compose.py for the little sounds; the CONTACT lines print the real ones
EVENTS = {"click": 1.0, "sip": 2.9, "cup_down": 4.95, "bite": 6.9, "plate": 8.25}
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
WALL_Y = 0.246                   # back wall centre (front face at 0.240)
WIN_X = env("WIN_X", "0.045")    # window (and the table under it)
CLOCK_Z = env("CLOCK_Z", "0.095")
CLOCK_R = 0.020
BED_X = env("BED_X", "-0.050")
BED_L = PUPIL * env("BED_K", "1.25")        # bed length incl. posts (footprint follows the model)
SINK = 0.0010                    # she sits 1 mm into the soft mattress (UK 11/20 side check)
KNEE_OUT = 0.0025                # knees this far in front of the bed's front face (seat front edge behind the knees)
TABLE_K = env("TABLE_K", "0.30")            # GUESS table top = hips + TABLE_K * (shoulders - hips): between waist and chest (chibi arms)
TABLE_BACK_Y = env("TABLE_BACK_Y", "0.205")  # table edge on her side
GAP = env("GAP", "0.0010")                 # tummy to the table edge
LEAN = (0, 0, env("LEAN", "-5"))           # leans a little over the table in KE4 (Spine1 twist)
# --- small props, sized to the chibi hand (arms only ~14 mm) ---
CUP_R, CUP_H, HANDLE_R, HANDLE_T = 0.0026, 0.0040, env("HANDLE_R", "0.0016"), 0.0003   # handle loop big enough for two fingers
CUP_DY = env("CUP_DY", "0.0030")           # cup centre from the table edge on her side
CUP_GAP = env("CUP_GAP", "0.0035")         # plate rim to cup body
SIP_D = Vector((env("SIP_DX", "-0.0008"), env("SIP_DY", "-0.0003"), env("SIP_DZ", "-0.0005")))   # rim contact from the lips centre (her right, lower lip)
SIP_TILT = math.radians(env("SIP_TILT", "25"))
MZ_S, MZ_T, MZ_IN = env("MZ_S", "0.0044"), env("MZ_T", "0.0015"), 0.0012   # mandazi side, thickness (KE4 sets it from the pinch gap), pinch inset (check 1: 0.7 -> 1.2 mm)
BITE_D = Vector((env("BITE_DX", "-0.0011"), env("BITE_DY", "-0.0004"), env("BITE_DZ", "-0.0002")))   # right mouth corner from the lips centre
EYE_DZ = env("EYE_DZ", "0.0050")           # GUESS eyes this far above the lips (check: things stay under the eyes)
HEAD0 = (0, 0, -2)
HEAD_SIP = (0, -6, 4)            # (roll, yaw, pitch): yaw < 0 turns to her right (the cup side), pitch > 0 = head a little back
HEAD_BITE = (0, -6, -3)
NIGHT_LAMP = env("NIGHT_LAMP", "0.10")      # warm spot before the lamp is on (moonlit room, face must stay readable)
ON_LAMP = env("ON_LAMP", "0.32")          # check 1 (11/21): 0.75 washed her dark-brown skin out to pale peach
FACE_FILL_NIGHT, FACE_FILL_ON = 1.6, env("FACE_FILL_ON", "0.6")   # the warm camera face fill (engine default 1.6), lowered once the lamp is on


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


def probe_bed():
    """Bed at its final footprint (long axis x, headboard at -x), measured far away: mattress top, the free stretch of mattress along
    the front edge (no pillow, no blanket), front face, depth. Values relative to the bed centre and the floor."""
    root = E.place(f"{PROPS}/kenya_bed.glb", BED_L, (5, 5, 0), axis="long")
    cols, (x0, x1, y0, y1, top) = grid_hits(root)
    first = [(x - 5, y - 5, hs[0][0]) for x, y, hs in cols if hs and hs[0][1] > 0.7]
    mz, mp = level(first, top, 0.3, 0.85)
    xs = sorted({round(p[0], 6) for p in first})
    yf0, yf1 = y0 - 5 + 0.12 * (y1 - y0), y0 - 5 + 0.45 * (y1 - y0)       # front band of the mattress (where she sits)
    plain = []
    for x in xs:
        zz = [p[2] for p in first if abs(p[0] - x) < 1e-6 and yf0 < p[1] < yf1]
        plain.append(bool(zz) and all(abs(z - mz) < 0.03 * top for z in zz))
    best, run = (0, 0), None
    for i, ok in enumerate(plain + [False]):
        if ok and run is None: run = i
        if not ok and run is not None:
            if i - run > best[1] - best[0]: best = (run, i)
            run = None
    fx0, fx1 = xs[best[0]], xs[max(best[0], best[1] - 1)]
    info = dict(top=top, mat=mz, x0=x0 - 5, x1=x1 - 5, y0=y0 - 5, y1=y1 - 5, free=(fx0, fx1),
                head_end=-1 if sum(p[2] for p in first if p[0] < (x0 - 5) * 0.8) > sum(p[2] for p in first if p[0] > (x1 - 5) * 0.8) else 1)
    print("DESK BEDPROBE length %.4f depth %.4f top %.4f mattress %.4f (%.2f of top) free x %.4f..%.4f headboard at %s" % (
        x1 - x0, y1 - y0, top, mz, mz / top, fx0, fx1, "-x" if info["head_end"] < 0 else "+x"), flush=True)
    drop(root)
    return info


def plane_fit(pts):
    """Least-squares plane z = a + b x + c y."""
    n = len(pts); sx = sum(p[0] for p in pts); sy = sum(p[1] for p in pts); sz = sum(p[2] for p in pts)
    sxx = sum(p[0] * p[0] for p in pts); syy = sum(p[1] * p[1] for p in pts); sxy = sum(p[0] * p[1] for p in pts)
    sxz = sum(p[0] * p[2] for p in pts); syz = sum(p[1] * p[2] for p in pts)
    Mm = Matrix(((n, sx, sy), (sx, sxx, sxy), (sy, sxy, syy)))
    try: a, b, c = Mm.inverted() @ Vector((sz, sxz, syz))
    except ValueError: a, b, c = sz / n, 0.0, 0.0
    return a, b, c


def probe_table():
    """Table model height 0.1, measured far away: the (slightly tilted) top as a plane, its extent, the plate cluster
    (hits clearly above the plane) with centre and radius, the top of the mandazi pile. Picks the quarter turn that brings the
    plate to her side of the table (+y) and a little to her left, so the cup fits to the right of it."""
    root = E.place(f"{PROPS}/kenya_window_table.glb", 0.1, (5, 5, 0))
    cols, (x0, x1, y0, y1, top) = grid_hits(root)
    first = [(x - 5, y - 5, hs[0][0]) for x, y, hs in cols if hs and hs[0][1] > 0.6 and hs[0][0] > 0.6 * top]
    zs = sorted(p[2] for p in first); med = zs[int(len(zs) * 0.4)]
    flat = [p for p in first if abs(p[2] - med) < 0.04 * top]
    a, b, c = plane_fit(flat)
    res = lambda p: p[2] - (a + b * p[0] + c * p[1])
    flat = [p for p in first if abs(res(p)) < 0.012 * top]; a, b, c = plane_fit(flat)
    plate = [p for p in first if res(p) > 0.012 * top]
    tb = (min(p[0] for p in flat), max(p[0] for p in flat), min(p[1] for p in flat), max(p[1] for p in flat))
    tc = ((tb[0] + tb[1]) / 2, (tb[2] + tb[3]) / 2)
    if plate:
        pc = (sum(p[0] for p in plate) / len(plate), sum(p[1] for p in plate) / len(plate))
        cell = ((x1 - x0) / 56) * ((y1 - y0) / 56)
        pr = math.sqrt(len(plate) * cell / math.pi); pile = max(p[2] for p in plate)
    else:
        print("DESK WARN no plate found on the table top", flush=True); pc, pr, pile = tc, 0.012, a
    best = None
    for k in range(4):
        r = k * math.pi / 2; dx, dy = pc[0] - tc[0], pc[1] - tc[1]
        xr, yr = dx * math.cos(r) - dy * math.sin(r), dx * math.sin(r) + dy * math.cos(r)
        s = yr + 0.5 * xr
        if best is None or s > best[0]: best = (s, r)
    info = dict(H0=0.1, top=top, plane=(a, b, c), box=tb, c=tc, plate=pc, plate_r=pr, pile=pile, rot=best[1])
    print("DESK TABLEPROBE top_at_centre %.4f slope x %.3f y %.3f (model height %.3f) box %s plate %s r %.4f pile_top %.4f turn %d deg" % (
        a + b * tc[0] + c * tc[1], b, c, top, tuple(round(v, 4) for v in tb), tuple(round(v, 4) for v in pc), pr, pile, round(math.degrees(best[1]))), flush=True)
    drop(root)
    return info


def xf(info, Hh, p, at):
    k = Hh / info["H0"]; c, s = math.cos(info["rot"]), math.sin(info["rot"])
    return (at[0] + k * (p[0] * c - p[1] * s), at[1] + k * (p[0] * s + p[1] * c))


def xbox(info, Hh, b, at):
    pts = [xf(info, Hh, (x, y), at) for x in b[:2] for y in b[2:]]
    return (min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts))


# ---------- the room (doll's house: back wall cut open by a window, the night outside) ----------
def emit_mat(n, c, s):
    m = E.emission(n, c, s); return m, m.node_tree.nodes["Emission"].inputs[1]


def room():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.02, 0.02, 0.05), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("earthFloor", (0.27, 0.13, 0.06)), "floor", thick=FLOOR)
    wallm = E.felt("ochreWall", (0.34, 0.095, 0.038))        # red-earth plaster (linear colour); check 1: darker, less orange bounce on her skin
    wall = E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), wallm, "backWall")
    wz0, wz1, ww = FLOOR + 0.050, FLOOR + 0.140, 0.075
    cut = E.box((WIN_X, WALL_Y, (wz0 + wz1) / 2), (ww, 0.05, wz1 - wz0), E.mat("cutter", (0, 0, 0), 0.5), "winCut", bevel=0)
    mod = wall.modifiers.new("win", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut
    cut.hide_render = True; cut.display_type = "WIRE"
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", (0.42, 0.12, 0.05)), "sideWall")
    E.box((0, 0.2385, FLOOR + 0.006), (0.64, 0.003, 0.012), E.felt("wallBase", (0.20, 0.07, 0.03)), "wallBase", bevel=0)
    fr = E.mat("winWood", (0.20, 0.09, 0.03), 0.6)
    zc = (wz0 + wz1) / 2; hh = wz1 - wz0
    for (x, z, sx, sz) in ((WIN_X - ww / 2 + 0.002, zc, 0.005, hh), (WIN_X + ww / 2 - 0.002, zc, 0.005, hh),
                           (WIN_X, wz1 - 0.002, ww, 0.005), (WIN_X, zc, 0.003, hh), (WIN_X, zc, ww, 0.003)):
        E.box((x, 0.242, z), (sx, 0.012, sz), fr, "winFrame", bevel=0)
    E.box((WIN_X, 0.236, wz0 - 0.001), (ww + 0.010, 0.012, 0.004), fr, "winSill", bevel=0.0005)
    for s in (-1, 1):                                          # two wooden shutters opened against the wall
        E.box((WIN_X + s * (ww / 2 + 0.018), 0.2375, zc), (0.033, 0.003, hh), E.mat("shutter", (0.12, 0.20, 0.10), 0.7), "shutter", bevel=0.0006)
    # a woven mat on the floor in front of the bed
    E.box((BED_X, 0.150, FLOOR + 0.0004), (0.11, 0.045, 0.0008), E.felt("mat", (0.55, 0.32, 0.10)), "floorMat", bevel=0)
    for k in range(5):
        E.box((BED_X, 0.132 + k * 0.009, FLOOR + 0.0009), (0.108, 0.002, 0.0004), E.felt("matStripe", (0.45, 0.05, 0.03)), "matStripe", bevel=0)


def outside():
    """Seen through the window: dark savanna ground, a flat-topped acacia, stars, a thin orange line on the horizon."""
    E.box((0, 0.42, FLOOR - 0.006), (1.0, 0.36, 0.01), E.mat("savanna", (0.015, 0.012, 0.010), 0.9), "savanna", bevel=0)
    E.box((0, 0.62, 0.30), (1.4, 0.004, 0.70), E.emission("nightSky", (0.010, 0.025, 0.11), 1.0), "sky", bevel=0)
    hmat, hstr = emit_mat("horizon", (1.0, 0.36, 0.06), 0.5)
    E.box((0, 0.615, FLOOR + 0.012), (1.4, 0.003, 0.018), hmat, "horizon", bevel=0)
    dark = E.mat("silhouette", (0.004, 0.004, 0.006), 0.9)
    ax, ay = WIN_X - 0.03, 0.46
    E.cyl((ax, ay, FLOOR + 0.03), 0.0025, 0.06, dark, verts=8, name="acaciaTrunk")
    for dx, dz, r in ((0.0, 0.065, 0.040), (0.03, 0.060, 0.024), (-0.03, 0.061, 0.026)):
        b = E.ball((ax + dx, ay, FLOOR + dz), r, dark, "acaciaTop"); b.scale = (1.0, 0.45, 0.22)
    star = E.emission("star", (1.0, 0.97, 0.85), 6.0)
    import random
    rng = random.Random(7)
    for k in range(16):
        E.ball((WIN_X + rng.uniform(-0.09, 0.09), 0.61, FLOOR + rng.uniform(0.10, 0.22)), rng.uniform(0.0008, 0.0016), star, "star")
    return hstr


def kiondo(x, z):
    """A woven kiondo basket hanging on the wall: sisal body with coloured rings, leather strap on a nail."""
    sisal = E.felt("sisal", (0.62, 0.45, 0.22)); y = 0.2335
    body = E.cone((x, y, z), 0.0068, 0.0092, 0.016, sisal, verts=24, name="kiondo"); body.scale = (1, 0.55, 1)
    for k, (dz, col) in enumerate(((-0.004, (0.55, 0.04, 0.03)), (0.0, (0.75, 0.50, 0.04)), (0.004, (0.06, 0.25, 0.08)))):
        r = E.cyl((x, y, z + dz), 0.0081 + 0.0006 * k, 0.0018, E.felt("kiondoRing%d" % k, col), verts=24, name="kiondoRing"); r.scale = (1, 0.56, 1)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.008, minor_radius=0.0006, major_segments=24, minor_segments=6,
                                     location=(x, y + 0.002, z + 0.010), rotation=(math.pi / 2, 0, 0))
    st = bpy.context.object; st.name = "kiondoStrap"; st.data.materials.append(E.mat("leather", (0.18, 0.07, 0.03), 0.6)); st.scale = (1, 1, 1.3)
    E.ball((x, 0.2385, z + 0.0205), 0.0009, E.mat("nail", (0.3, 0.3, 0.3), 0.4), "nail")


def clock(cx, cy, cz, hh, mm):
    """Round wall clock (ticks only, no numbers): hour hand between hh and hh+1, minute hand on mm."""
    r = CLOCK_R
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.10, 0.05, 0.02), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.98, 0.95, 0.86), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.06, 0.05, 0.05), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0013 if big else 0.0008), ink, "tick")
    hand_box(cx, cy - 0.0047, cz, math.radians((hh + mm / 60.0) * 30), 0.42 * r, 0.0021, ink, "hourHand")
    hand_box(cx, cy - 0.0053, cz, math.radians(mm * 6), 0.64 * r, 0.0014, ink, "minuteHand")
    E.ball((cx, cy - 0.0055, cz), 0.0015, E.mat("clockPin", (0.70, 0.10, 0.06), 0.4), "clockPin")


def stool(x, y, top_z):
    """A little wooden stool (round seat, three legs): her bedside table."""
    wd = E.mat("stoolWood", (0.30, 0.12, 0.04), 0.5); r = 0.0060
    E.cyl((x, y, top_z - 0.0006), r, 0.0012, wd, verts=32, name="stoolSeat")
    for k in range(3):
        a = math.radians(90 + k * 120)
        leg = E.cyl((x + 0.7 * r * math.cos(a), y + 0.7 * r * math.sin(a), (FLOOR + top_z - 0.0012) / 2), 0.0008, top_z - 0.0012 - FLOOR, wd, verts=8, name="stoolLeg")
        leg.rotation_euler = (math.radians(-6) * math.sin(a), math.radians(6) * math.cos(a), 0)


LAMP_R, LAMP_H, BULB_R, BTN_R, BTN_H = 0.0036, 0.0016, 0.0014, 0.00065, 0.0004   # check 1: wider base, smaller bulb, button clear of the bulb


def solar_lamp(x, y, z, to_her):
    """Small solar lamp: dark base with a solar tile on the front, frosted bulb dome on top, yellow push button on the top
    rim on her side. Returns (bulb emission socket, button object, button top point, point light)."""
    E.cyl((x, y, z + LAMP_H / 2), LAMP_R, LAMP_H, E.mat("lampBase", (0.03, 0.06, 0.05), 0.5), verts=32, name="lampBase")
    E.box((x, y - LAMP_R + 0.0002, z + LAMP_H * 0.5), (0.0028, 0.0004, 0.0011), E.mat("solarTile", (0.01, 0.02, 0.10), 0.2), "solarTile", bevel=0)
    bm, bstr = emit_mat("bulbGlow", (1.0, 0.78, 0.40), 0.0)
    dome = E.ball((x, y, z + LAMP_H), BULB_R, bm, "lampBulb"); dome.scale = (1, 1, 0.9)
    shell = E.ball((x, y, z + LAMP_H), BULB_R * 1.04, E.mat("bulbShell", (0.85, 0.85, 0.80), 0.3), "lampShell"); shell.scale = (1, 1, 0.9)
    shell.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.35
    d = Vector((to_her[0], to_her[1], 0)).normalized() * (LAMP_R - BTN_R - 0.0002)
    btn = E.cyl((x + d.x, y + d.y, z + LAMP_H + BTN_H / 2), BTN_R, BTN_H, E.mat("lampButton", (0.85, 0.55, 0.02), 0.4), verts=16, name="lampButton")
    bpy.ops.object.light_add(type="POINT", location=(x, y, z + LAMP_H + BULB_R * 0.6)); pl = bpy.context.object
    pl.data.energy = 0.0; pl.data.color = (1, 0.75, 0.42); pl.data.shadow_soft_size = 0.002
    return bstr, btn, Vector((x + d.x, y + d.y, z + LAMP_H + BTN_H)), pl


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
# button: palm faces down, index bent down at the knuckle so its tip presses the button, the other fingers tucked, thumb on the middle finger
G_PRESS = {"Thumb": (25, 25, 15), "Index": (68, 14, 8), "Middle": (70, 80, 50), "Ring": (75, 80, 50), "Pinky": (75, 80, 50)}
G_PRESS_OPEN = {"Thumb": (15, 15, 8), "Index": (30, 8, 4), "Middle": (40, 45, 30), "Ring": (45, 50, 30), "Pinky": (45, 50, 30)}
# enamel cup (storyboard 2B): index + middle finger THROUGH the handle loop, thumb pad on top of the handle, ring + little finger
# bent against the lower cup body; palm towards her middle (+x), back of the hand to her right (picture left)
G_MUG = {"Thumb": (12, 16, 8), "Index": (48, 55, 40), "Middle": (52, 58, 42), "Ring": (68, 70, 50), "Pinky": (72, 70, 50)}
G_MUG_OPEN = {"Thumb": (6, 8, 4), "Index": (18, 22, 14), "Middle": (24, 28, 18), "Ring": (40, 42, 28), "Pinky": (45, 42, 28)}
# mandazi pinch next to one corner: thumb pad on one face, index + middle pads on the other face
G_PINCH = {"Thumb": (18, 22, 12), "Index": (28, 30, 20), "Middle": (40, 42, 28), "Ring": (55, 55, 35), "Pinky": (60, 55, 35)}
G_PINCH_OPEN = {"Thumb": (8, 10, 5), "Index": (12, 14, 8), "Middle": (18, 20, 12), "Ring": (30, 30, 20), "Pinky": (34, 30, 20)}
G_SPREAD = {f: (0, 0, 0) for f in FINGERS}        # stretching: fingers open
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



def point_arm(d, right):
    """Elbow bent: upper arm out to the side (a little below the shoulder line), forearm raised, leaning towards the target."""
    d = Vector(d).normalized(); side = "Right" if right else "Left"; sg = -1 if right else 1
    up = Vector((sg * 0.95, 0.05, -0.30)).normalized()
    fo = (d * 0.55 + Vector((0, 0, 0.80))).normalized()
    return {side + "Arm": tuple(up), side + "ForeArm": tuple(fo)}


def point_hand(ch, side, target):
    """Hand palm up, wrist tipped back, index finger towards the world point target."""
    if (ch.name, side) not in HL:
        w_, f_, a_, p_ = hand_frame(ch, side)
        HL[(ch.name, side)] = (to_local(ch, side, f_, point=False).normalized(), to_local(ch, side, p_, point=False).normalized())
    wr = wpt(ch, side + "Hand"); f = (Vector(target) - wr).normalized()
    f.y *= 0.30; f.normalize(); f.z = max(f.z, 0.72); f.normalize()   # finger UP, leaning a little to the clock; not into the screen (reads as a fist)
    set_hand_rot(ch, side, hand_q(ch, side, f, Vector((0, 0.25, 1))))
    ch.pb[side + "Hand"].location = (0, 0, 0); ch.pb[side + "Hand"].scale = (1, 1, 1)      # set_hand_rot writes pb.matrix: an unkeyed location = a long skin spike


_TUCK = {}
def tuck_thumb(ch, side):
    """Fold the thumb onto the curled middle finger (a pointing hand, not an 'L' or a 'V'): small search once, then reused."""
    b1, b3 = side + "HandThumb1", side + "HandThumb3"
    if b1 not in ch.pb or b3 not in ch.pb: return
    def pose(opp, abd, bends):
        for k in (1, 2, 3):
            if "%sHandThumb%d" % (side, k) in ch.pb: ch.pb["%sHandThumb%d" % (side, k)].rotation_quaternion = (1, 0, 0, 0)
        if opp: rot_bone(ch, b1, hand_frame(ch, side)[1], math.radians(opp))
        if abd: rot_bone(ch, b1, hand_frame(ch, side)[3], math.radians(abd))
        curl_hinge(ch, side, {"Thumb": bends}, fingers=("Thumb",))
    key = (ch.name, side)
    if key not in _TUCK:
        tgt = (wpt(ch, side + "HandMiddle2") + wpt(ch, side + "HandIndex2")) / 2
        best = None
        for opp in range(-100, 101, 20):
            for abd in range(-60, 61, 20):
                for bends in ((0, 0, 0), (30, 40, 0), (30, 40, 40), (45, 60, 60)):
                    pose(opp, abd, bends); dd = (wpt(ch, b3, True) - tgt).length
                    if best is None or dd < best[0]: best = (dd, opp, abd, bends)
        _TUCK[key] = best
        print("DESK TUCK %s %s opp %d abd %d bends %s dist %.4f" % (ch.name, side, best[1], best[2], best[3], best[0]), flush=True)
    pose(*_TUCK[key][1:])
    for k in (1, 2, 3):
        pbk = ch.pb.get("%sHandThumb%d" % (side, k))
        if pbk: pbk.location = (0, 0, 0); pbk.scale = (1, 1, 1)


_fin0p = E.Char.finish
def _finp(self):            # rot_bone / set_hand_rot write pb.matrix: clear the unkeyed location and scale (long skin spikes)
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    return _fin0p(self)
E.Char.finish = _finp


def rest_hand(ch, side):
    """Back to the model's rest hand (before the point starts), so no pointing key leaks into earlier frames."""
    for b in [side + "Hand"] + ["%sHand%s%d" % (side, fg, k) for fg in ("Thumb", "Index", "Middle", "Ring", "Pinky") for k in (1, 2, 3, 4)]:
        if b in ch.pb: ch.pb[b].rotation_quaternion = (1, 0, 0, 0)


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
    return (a[0].slerp(b[0], u), a[1].lerp(b[1], u), {f: tuple(x + (y - x) * u for x, y in zip(a[2][f], b[2][f])) for f in FINGERS}, a[3].lerp(b[3], u))


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
        self.body(0, {}, head); set_hand_rot(self.ch, side, q); curl(self.ch, side, grip)
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
            set_hand_rot(ch, side, g[0]); curl(ch, side, g[2]); key_hand(ch, side, fr)


# ---------- the cup and the mandazi (made here) ----------
def make_cup():
    """White enamel mug with a blue rim and milk tea; handle loop on its -x side (her right), hole along y (fingers go through
    from behind). Its empty sits at the bottom centre."""
    enamel = E.mat("enamel", (0.90, 0.90, 0.87), 0.25); blue = E.mat("enamelBlue", (0.03, 0.10, 0.55), 0.3)
    tea = E.mat("milkTea", (0.50, 0.26, 0.10), 0.15)
    emp = E.empty("teaCup"); emp.rotation_mode = "XYZ"
    r, h = CUP_R, CUP_H
    parts = [E.cyl((0, 0, h / 2), r, h, enamel, verts=32, name="cupBody"),
             E.cyl((0, 0, h - 0.0003), r * 0.88, 0.00004, tea, verts=32, name="cupTea")]
    for z, name in ((h, "cupRim"), (0.0002, "cupFoot")):
        bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.98, minor_radius=0.00018, major_segments=32, minor_segments=6, location=(0, 0, z))
        o = bpy.context.object; o.name = name; o.data.materials.append(blue); parts.append(o)
    bpy.ops.mesh.primitive_torus_add(major_radius=HANDLE_R, minor_radius=HANDLE_T, major_segments=24, minor_segments=8,
                                     location=(-(r + HANDLE_R * 0.6), 0, h * 0.5), rotation=(math.pi / 2, 0, 0))
    hd = bpy.context.object; hd.name = "cupHandle"; hd.data.materials.append(enamel); hd.scale = (0.85, 1, 1.0); parts.append(hd)
    for o in parts: o.parent = emp
    return emp


HANDLE_PT = Vector((-(CUP_R + HANDLE_R * 0.6), 0, CUP_H * 0.5 + HANDLE_R * 0.75))   # thumb on top of the loop, fingers under (cup local)
RIM = Vector((CUP_R, 0, CUP_H))                                                            # the rim point that goes to her lips (+x side)


def cup_M(base, tilt):
    M = Matrix.Rotation(tilt, 4, "Y"); M.translation = Vector(base); return M     # tilt > 0 lowers the +x rim (towards the lips)


def tri_outline(s, bitten, bite_sign):
    """Rounded triangle in its own x-z plane: held corner at x = -MZ_IN (z = 0), the far edge at x = h - MZ_IN from z = -s/2 to +s/2.
    The bitten one has a round bite out of the corner at z = bite_sign * s/2."""
    h = s * math.sqrt(3) / 2; rc = 0.0007
    cs = [Vector((-MZ_IN, 0)), Vector((h - MZ_IN, -s / 2)), Vector((h - MZ_IN, s / 2))]
    pts = []
    for i, c in enumerate(cs):                      # corner arcs (rounded puffy corners)
        a, b = cs[i - 1], cs[(i + 1) % 3]
        da, db = (a - c).normalized(), (b - c).normalized()
        half = math.acos(max(-1.0, min(1.0, da.dot(db)))) / 2
        d = rc / math.sin(half); bis = (da + db).normalized(); ctr = c + bis * d
        p0 = c + da * (d * math.cos(half)); p1 = c + db * (d * math.cos(half))
        t0 = math.atan2(p0.y - ctr.y, p0.x - ctr.x); t1 = math.atan2(p1.y - ctr.y, p1.x - ctr.x)
        while t1 > t0: t1 -= 2 * math.pi
        if t0 - t1 > math.pi: t1 += 2 * math.pi
        for k in range(7): u = t0 + (t1 - t0) * k / 6; pts.append((ctr.x + rc * math.cos(u), ctr.y + rc * math.sin(u)))
    if not bitten: return pts
    c, rb = (h - MZ_IN - 0.0004, bite_sign * (s / 2 - 0.0003)), 0.0016
    inside = [math.hypot(p[0] - c[0], p[1] - c[1]) < rb for p in pts]
    if not any(inside): return pts
    k0 = inside.index(True); k1 = len(inside) - 1 - inside[::-1].index(True)
    if k1 - k0 + 1 != sum(inside):                 # the bite wraps around the list start: rotate the list first
        sh = inside.index(False, k0); pts = pts[sh:] + pts[:sh]; inside = inside[sh:] + inside[:sh]
        k0 = inside.index(True); k1 = len(inside) - 1 - inside[::-1].index(True)
    pa, pb = pts[k0 - 1], pts[(k1 + 1) % len(pts)]
    ta = math.atan2(pa[1] - c[1], pa[0] - c[0]); tb = math.atan2(pb[1] - c[1], pb[0] - c[0])
    if tb > ta: tb -= 2 * math.pi
    notch = [(c[0] + rb * math.cos(ta + (tb - ta) * k / 10), c[1] + rb * math.sin(ta + (tb - ta) * k / 10)) for k in range(1, 10)]
    return pts[:k0] + notch + pts[k1 + 1:]


def make_mandazi(bitten, bite_sign):
    """Puffy triangle of fried dough (felt look). Empty at the pinch point; local x into the piece, local y through it, local z
    along the far edge."""
    name = "mandaziBitten" if bitten else "mandazi"
    emp = E.empty(name); emp.rotation_mode = "XYZ"
    crust = E.felt("ugaliPiece", (0.96, 0.94, 0.86))      # he/she: a piece of ugali
    pts = tri_outline(MZ_S, bitten, bite_sign)
    n = len(pts); y0, y1 = -MZ_T / 2, MZ_T / 2
    verts = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
    me = bpy.data.meshes.new(name + "Mesh"); me.from_pydata(verts, [], faces); me.update(); me.materials.append(crust)
    body = bpy.data.objects.new(name + "Body", me); sc.collection.objects.link(body)
    bv = body.modifiers.new("bv", "BEVEL"); bv.width = 0.0005; bv.segments = 3; bv.limit_method = "ANGLE"
    body.parent = emp
    return emp


# ================= build =================
ch = E.Char("kenya_girl_home", (0.30, -0.15), 0, height=PUPIL)     # placed properly below
M_ = metrics(ch)
SEAT_UNDER = seat_under(ch, M_["thigh"]) - SINK
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
SEAT_Z = FLOOR + M_["knee_h"] - SEAT_UNDER          # thighs flat on the mattress, shins straight down, feet flat on the floor

# --- the bed: footprint sized to her, heights squashed so the mattress top is her seat height ---
BI = probe_bed()
BED_Y = WALL_Y - 0.006 - 0.002 - (BI["y1"] - BI["y0"]) / 2
bed_root = E.place(f"{PROPS}/kenya_bed.glb", BED_L, (BED_X, BED_Y, FLOOR), axis="long")
KD = (SEAT_Z - FLOOR) / max(1e-4, BI["mat"])
if not 0.3 <= KD <= 1.8: print("DESK WARN bed height scale %.3f clamped" % KD, flush=True)
KD = max(0.3, min(1.8, KD))
nv = squash(bed_root, KD)
E.obstacle(bed_root)
BED_FRONT = BED_Y + BI["y0"]; BED_MINX, BED_MAXX = BED_X + BI["x0"], BED_X + BI["x1"]
SIT_X = BED_X + (BI["free"][0] + BI["free"][1]) / 2
print("DESK BED fit: knee_h %.4f thigh_under %.4f -> seat %.4f above floor; mattress was %.4f -> heights x%.3f (%d verts); front y %.4f x %.4f..%.4f sit x %.4f" % (
    M_["knee_h"], SEAT_UNDER + SINK, SEAT_Z - FLOOR, BI["mat"], KD, nv, BED_FRONT, BED_MINX, BED_MAXX, SIT_X), flush=True)
_chk = rays_down(SIT_X, BED_FRONT + 0.25 * (BI["y1"] - BI["y0"]), 0.5)
print("DESK BED check: mattress top under her seat %.4f (want %.4f)" % ((_chk or 0) - FLOOR, SEAT_Z - FLOOR), flush=True)

# --- the window table: top between her waist and chest, under the window, plate to her side ---
TI = probe_table()
a_, b_, c_ = TI["plane"]
top_rel = a_ + b_ * TI["c"][0] + c_ * TI["c"][1]
TOP_TARGET = M_["hip_h"] + TABLE_K * M_["sh_hips"]
TABLE_H = TI["H0"] * TOP_TARGET / max(1e-4, top_rel)
rb_ = xbox(TI, TABLE_H, TI["box"], (0.0, 0.0))
TX, TY = WIN_X, TABLE_BACK_Y - rb_[3]
table_root = E.place(f"{PROPS}/kenya_window_table.glb", TABLE_H, (TX, TY, FLOOR), rot_z=TI["rot"])
E.obstacle(table_root)
DBOX = xbox(TI, TABLE_H, TI["box"], (TX, TY)); DB = DBOX[3]
PLC = xf(TI, TABLE_H, TI["plate"], (TX, TY)); PL_R = TI["plate_r"] * TABLE_H / TI["H0"]
print("DESK TABLE height %.4f top_target %.4f (hips %.4f + %.2f x shoulders above hips) box %s plate centre %s r %.4f" % (
    TABLE_H, TOP_TARGET, M_["hip_h"], TABLE_K, tuple(round(v, 4) for v in DBOX), tuple(round(v, 4) for v in PLC), PL_R), flush=True)

# --- where things stand ---
X_KE4 = PLC[0] - env("PLATE_LEFT", "0.006")          # she stands so the plate is a little to her left, the cup in front of her right hand
HY4 = DB + M_["front"] + GAP
CUP_HOME_XY = (PLC[0] - PL_R - CUP_GAP - CUP_R, DB - CUP_DY)
if CUP_HOME_XY[0] - CUP_R - 2 * HANDLE_R - 0.0008 < DBOX[0]:
    print("DESK WARN cup handle hangs over the table edge: cup x %.4f table x0 %.4f" % (CUP_HOME_XY[0], DBOX[0]), flush=True)
TOP_AT = lambda x, y: (rays_down(x, y, FLOOR + TOP_TARGET + 0.009) or (FLOOR + TOP_TARGET))   # from below her chin (her big head overhangs the table edge)
CUP_Z = TOP_AT(CUP_HOME_XY[0], CUP_HOME_XY[1])
SX2, SY2 = BED_MINX + 0.022, BED_FRONT - 0.013                     # KE2/KE3: standing in front of the head end of the bed
STOOL_XY = (SX2 - M_["sh_half"] - 0.004, SY2 - 0.013)
STOOL_TOP = FLOOR + M_["hip_h"] - LAMP_H - BTN_H + 0.0010
CLOCK = (WIN_X + 0.072, 0.2395, FLOOR + CLOCK_Z)
print("DESK LAYOUT stand2 (%.4f, %.4f) stool %s top %.4f | KE4 hips (%.4f, %.4f) cup home %s z %.4f | clock %s" % (
    SX2, SY2, tuple(round(v, 4) for v in STOOL_XY), STOOL_TOP - FLOOR, X_KE4, HY4, tuple(round(v, 4) for v in CUP_HOME_XY), CUP_Z, tuple(round(v, 4) for v in CLOCK)), flush=True)

# --- the mandazi piece she picks (lying on the pile, the held corner sticking out over the near rim) ---
_dir = Vector((X_KE4 - M_["sh_half"] - PLC[0], HY4 - PLC[1], 0)).normalized()   # from the plate centre towards her right shoulder
PICK = Vector((PLC[0], PLC[1], 0)) + _dir * (PL_R - 0.0004)
X_PLATE = Vector((-_dir.x, -_dir.y, -0.08)).normalized()                         # held corner -> into the plate

room(); horizon = outside(); kiondo(BED_X + 0.030, FLOOR + 0.112); clock(CLOCK[0], CLOCK[1], CLOCK[2], 7, 30)
stool(STOOL_XY[0], STOOL_XY[1], STOOL_TOP)
_to_her = (SX2 - STOOL_XY[0], SY2 - STOOL_XY[1])
bulb, button, BTN_TOP, lamp_light = solar_lamp(STOOL_XY[0], STOOL_XY[1], STOOL_TOP, _to_her)
cup = make_cup()
plate_m = E.mat("famPlate", (0.95, 0.95, 0.92), 0.35); ugali_m = E.felt("ugali", (0.97, 0.95, 0.88)); sukuma_m = E.felt("sukuma", (0.18, 0.45, 0.15))
# teacher 11/23: the orange mandazi (breakfast, part of the Tripo table mesh) showed beside the ugali, and the greens were one dot.
# The Tripo plate and its mandazi pile are CUT OUT of the table mesh; a flat enamel plate, the ugali mound and a heap of
# sukuma wiki take their place. (A dish tall enough to cover the pile looked like a cake tin and hid her body.)
import bmesh
def cut_plate(root, cx, cy, r, zmin):
    n = 0
    for ob in [root] + list(root.children_recursive):
        if ob.type != "MESH": continue
        bpy.context.view_layer.update(); Mw = ob.matrix_world.copy()
        bm = bmesh.new(); bm.from_mesh(ob.data)
        dead = [v for v in bm.verts if ((Mw @ v.co).x - cx) ** 2 + ((Mw @ v.co).y - cy) ** 2 < r * r and (Mw @ v.co).z > zmin]
        n += len(dead); bmesh.ops.delete(bm, geom=dead, context="VERTS"); bm.to_mesh(ob.data); bm.free(); ob.data.update()
    return n
print("DESK CUTPLATE removed %d vertices of the Tripo plate + mandazi" % cut_plate(table_root, PLC[0], PLC[1], PL_R + 0.0034, CUP_Z + 0.0006), flush=True)
DISH_H = 0.0016
E.cyl((PLC[0], PLC[1], CUP_Z + 0.0003), PL_R + 0.0044, 0.0018, E.mat("dishEnamel", (0.95, 0.95, 0.92), 0.30), verts=48, name="dinnerPlate")
E.cyl((PLC[0], PLC[1], CUP_Z + 0.0012), PL_R + 0.0046, 0.0004, E.mat("dishRim", (0.10, 0.20, 0.55), 0.35), verts=48, name="dinnerPlateRim")
E.cyl((PLC[0], PLC[1], CUP_Z + 0.0014), PL_R + 0.0036, 0.0004, E.mat("dishEnamel", (0.95, 0.95, 0.92), 0.30), verts=48, name="dinnerPlateBed")
E.ball((PLC[0] - 0.0040, PLC[1] + 0.0025, CUP_Z + DISH_H), 0.0068, ugali_m, "ugaliMound").scale = (1, 1, 0.55)
sukuma_d = E.felt("sukumaDark", (0.08, 0.30, 0.10))
for k in range(46):                                   # a heap of chopped greens beside the ugali (deterministic scatter)
    a_ = k * 2.399963; r_ = 0.0042 * math.sqrt((k + 0.5) / 46.0)
    lf = E.ball((PLC[0] + 0.0058 + r_ * math.cos(a_), PLC[1] - 0.0042 + r_ * math.sin(a_), CUP_Z + DISH_H + 0.0009 + 0.0016 * (1 - r_ / 0.0042) + 0.0003 * (k % 3)),
                0.0013, sukuma_m if k % 3 else sukuma_d, "sukuma")
    lf.scale = (1.5, 0.8, 0.35); lf.rotation_euler = (0.3 * math.sin(k), 0.3 * math.cos(k * 1.7), a_)
for k, dx in enumerate((-0.030, 0.030)):          # two more places for the family
    E.cyl((PLC[0] + dx, PLC[1] + 0.006, CUP_Z + 0.0004), 0.0050, 0.0008, plate_m, verts=32, name="famPlate%d" % k)
    E.ball((PLC[0] + dx, PLC[1] + 0.006, CUP_Z + 0.0018), 0.0028, ugali_m, "famUgali%d" % k).scale = (1, 1, 0.6)
    E.cyl((PLC[0] + dx + 0.008, PLC[1] + 0.002, CUP_Z + 0.0020), 0.0024, 0.0040, E.mat("enamelF", (0.90, 0.90, 0.87), 0.25), verts=24, name="famCup%d" % k)
FLOUR = (PLC[0] + 0.016, PLC[1] + 0.012, CUP_Z)
E.box((FLOUR[0], FLOUR[1], FLOUR[2] + 0.0050), (0.0060, 0.0040, 0.0100), E.felt("flourBag", (0.92, 0.90, 0.80)), "flourBag", bevel=0.0008)
E.box((FLOUR[0], FLOUR[1] - 0.0021, FLOUR[2] + 0.0055), (0.0040, 0.0003, 0.0035), E.felt("flourLabel", (0.95, 0.75, 0.15)), "flourLabel", bevel=0)
E.ball((FLOUR[0], FLOUR[1] - 0.0024, FLOUR[2] + 0.0055), 0.0009, E.felt("cornIcon", (0.98, 0.85, 0.20)), "cornIcon").scale = (0.6, 0.3, 1.2)
L_, Fl, R_ = E.lights(lamp=NIGHT_LAMP)
bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.40, 0.20)); moon = bpy.context.object        # moonlight through the window
moon.data.energy = 2.5; moon.data.color = (0.55, 0.68, 1.0); moon.data.size = 0.25; moon.rotation_euler = (math.radians(-65), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); front = bpy.context.object       # soft front light: blue at night, warm with the lamp on
front.data.energy = 1.4; front.data.color = (0.62, 0.72, 1.0); front.data.size = 0.5; front.rotation_euler = (math.radians(25), 0, 0)


def lights_state(fr, on):
    """Night (lamp off) or warm (lamp on): keyed at frame fr."""
    L_.data.energy = 55 * (ON_LAMP if on else NIGHT_LAMP); front.data.energy = 1.0 if on else 1.4      # check 1: on 2.0 -> 1.0
    front.data.color = (1.0, 0.91, 0.80) if on else (0.62, 0.72, 1.0)                                  # check 1: less orange (was 1, 0.86, 0.62)
    Fl.data.energy = 4.0 if on else 9.0; moon.data.energy = 1.2 if on else 2.5
    bulb.default_value = 9.0 if on else 0.0; lamp_light.data.energy = 0.18 if on else 0.0             # check 1: 0.35 -> 0.18
    for d in (L_.data, Fl.data, moon.data, lamp_light.data): d.keyframe_insert("energy", frame=fr)
    front.data.keyframe_insert("energy", frame=fr); front.data.keyframe_insert("color", frame=fr)
    bulb.keyframe_insert("default_value", frame=fr)


def face_fill(t_on):
    """The engine's warm face fill follows the camera; once the lamp is on it is lowered (check 1: skin must stay dark brown).
    t_on None = lamp off all shot, 0 = on all shot, > 0 = switched on at that second."""
    ff = bpy.data.objects.get("cam_faceFill")
    if ff is None: return
    ff.data.energy = FACE_FILL_ON if t_on == 0 else FACE_FILL_NIGHT; ff.data.keyframe_insert("energy", frame=-1)
    if t_on is not None and t_on > 0:
        ff.data.energy = FACE_FILL_ON; ff.data.keyframe_insert("energy", frame=E.f(t_on))
    const_anim(ff.data)
    print("DESK LIGHT lamp-on: spot %.1f front 1.0 lamp 0.18 face_fill %.2f (before check 1: 41.3 / 2.0 / 0.35 / 1.6); wall and floor about 25 %% darker" % (
        55 * ON_LAMP, FACE_FILL_ON), flush=True)


def face_px(tag, frames_):
    """Pixel position (1080p) of her LEFT cheek (never covered) in the picture, to sample the rendered skin colour."""
    from bpy_extras.object_utils import world_to_camera_view as w2c
    for fr in frames_:
        sc.frame_set(fr); bpy.context.view_layer.update()
        v = w2c(sc, sc.camera, mouth(ch) + Vector((0.0045, -0.0006, 0.0022)))
        print("DESK FACEPX %s f%04d x %d y %d (1080p; light renders are half size)" % (tag, fr, round(v.x * 1920), round((1 - v.y) * 1080)), flush=True)


def finish_lights():
    for d in (L_.data, Fl.data, moon.data, lamp_light.data, front.data): const_anim(d)
    const_anim(bulb.id_data)


GIRL_HEAD_ASK = (0, 14, 0)
trav = None

if SHOT == "KE1":
    lights_state(-1, True); finish_lights()      # he/she: evening, the lamp is on
    hy = BED_FRONT - KNEE_OUT + M_["thigh"]                        # knees just in front of the bed, thighs on the mattress
    rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(SIT_X, hy))
    hy = BED_FRONT - KNEE_OUT + rig.hz
    rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(SIT_X, hy))
    rig.body(0, {}, HEAD0)
    print("DESK SIT hips (%.4f, %.4f) seat_z %.4f bed front %.4f thighs %.4f over the mattress | hips %s knee %s foot %s foot_above_floor %.4f" % (
        SIT_X, hy, SEAT_Z, BED_FRONT, hy - BED_FRONT, tuple(round(v, 4) for v in wpt(ch, "Hips")), tuple(round(v, 4) for v in wpt(ch, "RightLeg")),
        tuple(round(v, 4) for v in wpt(ch, "RightFoot")), (wpt(ch, "RightFoot").z - FLOOR) - M_["ankle_h"]), flush=True)
    print("DESK LEGS seat_z %.4f seat_front %.4f | hips %s upleg %s knee %s foot %s" % (SEAT_Z, BED_FRONT, tuple(round(v, 4) for v in wpt(ch, "Hips")),
          tuple(round(v, 4) for v in wpt(ch, "RightUpLeg")), tuple(round(v, 4) for v in wpt(ch, "RightLeg")), tuple(round(v, 4) for v in wpt(ch, "RightFoot"))), flush=True)
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.4, VOICE["a"], VOICE["a"] + 2.0
    sh_z = wpt(ch, "LeftArm").z
    pt = Vector(local_dir((SIT_X, hy), 0, CLOCK, sh_z)).normalized()
    pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()   # LEFT hand (clock side), outside the shoulder
    print("DESK KE1 clock %s point_dir %s hand Left" % (tuple(round(v, 4) for v in CLOCK), tuple(round(v, 3) for v in pt)), flush=True)
    lap_r = {k: v for k, v in P_LAP.items() if k.startswith("Right")}

    def finger_bend(side, f):
        """Total bend of one finger in degrees: knuckle + two joints (metacarpal -> 3 segments)."""
        ds = [wpt(ch, "%sHand%s1" % (side, f)) - wpt(ch, side + "Hand")]
        ds += [wpt(ch, "%sHand%s%d" % (side, f, k), True) - wpt(ch, "%sHand%s%d" % (side, f, k)) for k in (1, 2, 3)]
        return sum(math.degrees(a.angle(b)) for a, b in zip(ds, ds[1:]) if a.length > 1e-9 and b.length > 1e-9)
    POINT_HAND = None
    # thumb (check 3, like usa_school.py THUMB_OPP): the thumb stood straight up ("finger gun" from the side). Reset it, swing
    # Thumb1 ACROSS the palm about the finger direction (opposition), then bend its three joints; search once for the tip
    # resting on the back of the curled middle finger (finger curls are hand-relative, so the same angles hold every frame).
    PAD = {}
    G_ZERO = {f: (0, 0, 0) for f in FINGERS}

    def seg_pad(side, f):
        b1, b2 = "%sHand%s1" % (side, f), "%sHand%s2" % (side, f)
        d1 = (wpt(ch, b1, True) - wpt(ch, b1)).normalized(); d2 = (wpt(ch, b2, True) - wpt(ch, b2)).normalized()
        a = d1.cross(d2)
        n = (ch.arm.matrix_world.to_3x3().normalized() @ hand_frame(ch, side)[3]).normalized() if a.length < 0.05 else a.normalized().cross(d2).normalized()
        return (wpt(ch, b2) + wpt(ch, b2, True)) / 2, n

    def finger_pad(side):
        if side not in PAD:
            ds = []
            for f in ("Index", "Middle", "Ring"):
                c, n = seg_pad(side, f); q = mesh_hit(ch.meshes, c, n)
                if q is not None and (q - c).length < 0.002: ds.append((q - c).length)
            PAD[side] = sum(ds) / len(ds) if ds else 0.0004
        return PAD[side]

    def thumb_pose(side, opp, bends, abd=0):
        """Reset the thumb; swing Thumb1 about the finger direction (opposition, across the palm) and about the palm normal
        (abduction); then bend its three joints."""
        for k in (1, 2, 3): ch.pb["%sHandThumb%d" % (side, k)].rotation_quaternion = (1, 0, 0, 0)
        if opp: rot_bone(ch, "%sHandThumb1" % side, hand_frame(ch, side)[1], math.radians(opp))
        if abd: rot_bone(ch, "%sHandThumb1" % side, hand_frame(ch, side)[3], math.radians(abd))
        curl(ch, side, dict(G_ZERO, Thumb=bends))

    def fist_target(side):
        c, n = seg_pad(side, "Middle"); return c - n * (finger_pad(side) + 0.00045)
    FOUR = ("Index", "Middle", "Ring", "Pinky")
    rig.body(0, {**lap_r, **point_arm(tuple(pt), False)}, (0, 6, 6))
    point_hand(ch, "Left", CLOCK); curl_hinge(ch, "Left", G_POINT, fingers=FOUR)
    tgt = fist_target("Left")
    # check 4: opposition alone ran into the end of its range (70 deg, no bends, 1.5 mm off). Now two swings - opposition about
    # the finger direction -110..110 and abduction about the palm normal -60..60 - and bends up to (45, 60, 60);
    # coarse grid first, then a fine grid around the best one.
    def tdist(opp, abd, b):
        thumb_pose("Left", opp, b, abd); return (wpt(ch, "LeftHandThumb3", True) - tgt).length
    best = None
    for opp in range(-110, 111, 10):
        for abd in range(-60, 61, 20):
            for b in ((0, 0, 0), (30, 0, 0), (0, 40, 0), (0, 0, 40), (30, 40, 0), (30, 40, 40), (45, 60, 60), (0, 40, 40)):
                dd = tdist(opp, abd, b)
                if best is None or dd < best[0]: best = (dd, opp, abd, b)
    _d0, o0, ab0, _b0 = best
    for opp in range(o0 - 10, o0 + 11, 5):
        for abd in range(ab0 - 20, ab0 + 21, 10):
            for a1 in (0, 15, 30, 45):
                for a2 in (0, 20, 40, 60):
                    for a3 in (0, 20, 40, 60):
                        dd = tdist(opp, abd, (a1, a2, a3))
                        if dd < best[0]: best = (dd, opp, abd, (a1, a2, a3))
    THUMB_OPP, THUMB_ABD, THUMB_B = best[1], best[2], best[3]
    print("DESK POINT KE1 thumb opposition %d (about the finger direction) abduction %d (about the palm normal) bends %s: thumb tip %.4f from the back of the curled middle finger%s" % (
        THUMB_OPP, THUMB_ABD, THUMB_B, best[0], "" if best[0] <= 0.0012 else
        "  WARN thumb not on the fist (> 0.0012): bone LeftHandThumb1, axes = hand_frame fwd (wrist->middle knuckle) and palm normal, remaining %.4f" % best[0]), flush=True)
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms = dict(lap_r); arms.update(point_arm((pt.x, pt.y, pt.z + 0.06 * k), False))
            head = (0, 6, 6) if t < ans1 else (0, 0, 2)
        else:
            arms, head = {}, (0, 0, -4)              # he/she: no traveller
        rig.body(t, arms, head)
        rest_hand(ch, "Left")
        if t < ans0 - 0.15: key_hand(ch, "Left", fr)
        if t >= ans0 - 0.15:
            point_hand(ch, "Left", CLOCK); curl_hinge(ch, "Left", G_POINT, fingers=FOUR)                 # check 2 (11/21): hinge curls, curl() bent back past 90 deg ('peace sign')
            thumb_pose("Left", THUMB_OPP, THUMB_B, THUMB_ABD); key_hand(ch, "Left", fr)  # check 3: thumb across the palm onto the curled middle finger
            if fr == 72: POINT_HAND = (wpt(ch, "LeftHand") + wpt(ch, "LeftHandIndex3", True)) / 2
            if fr % 12 == 0 and ans0 <= t < ans1:
                bd = {f: finger_bend("Left", f) for f in ("Index", "Middle", "Ring", "Pinky")}
                bad = [f for f in ("Middle", "Ring", "Pinky") if bd[f] < 150] + (["Index"] if bd["Index"] > 25 else [])
                th = (wpt(ch, "LeftHandThumb3", True) - fist_target("Left")).length
                if th > 0.0012: bad.append("Thumb")
                print("DESK POINT KE1 t=%.2f total bend index %.0f middle %.0f ring %.0f pinky %.0f (want index <= 25, the others >= 150) thumb_tip_to_middle %.4f (<= 0.0012) %s" % (
                    t, bd["Index"], bd["Middle"], bd["Ring"], bd["Pinky"], th, ("WARN " + " ".join(bad)) if bad else ""), flush=True)
    ch.finish()
    GL, GF = (BED_MINX - 0.030, BED_FRONT - 0.045), 35

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), GIRL_HEAD_ASK
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)      # looks up at the clock
        return E.P_stand(), GIRL_HEAD_ASK
    if False:                                    # he/she: no traveller
        trav = stand("traveler_girl", GL, GF, girl, height=GIRL)
    knee = wpt(ch, "RightLeg")
    LEGCAM = {"L": (Vector((SIT_X, hy - 0.004, SEAT_Z + 0.004)), Vector((0.16, -0.03, 0.03)), 160),     # her LEFT side, a little above the seat (the foot end is low)
              "L2": (Vector((SIT_X, BED_FRONT, SEAT_Z - 0.002)), Vector((-0.06, -0.13, -0.002)), 160)}  # low, front-right
    if POINT_HAND is not None:      # pointing hand close-ups (no depth of field): from her front-left / her left side
        LEGCAM["HF"] = (POINT_HAND, Vector((0.07, -0.12, 0.02)), 160)
        LEGCAM["HS"] = (POINT_HAND, Vector((0.14, -0.01, 0.0)), 160)
    if CAMSUB in LEGCAM:
        aim, off, lens = LEGCAM[CAMSUB]
        cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    else:
        aim0 = Vector((0.026, 0.12, FLOOR + 0.066))
        cam_move(56, aim0 + Vector((-0.015, -0.53, 0.07)), aim0, aim0 + Vector((-0.008, -0.47, 0.062)), aim0 + Vector((0, 0, 0.002)),
                 focus=(SIT_X, BED_FRONT - 0.01, FLOOR + 0.05))
    view_report("KE1", [("clock", CLOCK), ("pupil_head", lambda: wpt(ch, "Head")), ("left_slipper", lambda: wpt(ch, "LeftFoot")),
                        ("window", (WIN_X, 0.24, FLOOR + 0.095)), ("lamp", BTN_TOP)])

elif SHOT in ("KE2", "KE3"):
    rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(SX2, SY2))
    rig.learn_hands()
    hang_R = rig.hanging("Right")
    if SHOT == "KE2":
        lights_state(-1, False); finish_lights()
        OUT = {"RightArm": (-1, -0.25, 0.12), "RightForeArm": (-1, -0.30, 0.20), "LeftArm": (1, -0.25, 0.12), "LeftForeArm": (1, -0.30, 0.20)}
        DOWN = {k: E.P_stand()[k] for k in OUT}
        U0, U1, D0, D1 = 0.3, 1.0, 2.0, 2.6
        for fr in E.frames():
            t = fr / E.FPS
            u = 0.0 if t < U0 else (E.ease((t - U0) / (U1 - U0)) if t < U1 else (1.0 if t < D0 else 1.0 - E.ease((t - D0) / (D1 - D0))))
            dirs = blend_dirs(DOWN, OUT, u)
            back = 14 * E.ease(min(1.0, max(0.0, (t - 1.0) / 0.3))) * (1.0 - E.ease(min(1.0, max(0.0, (t - 1.8) / 0.3))))
            head = (0, 0, back); spine = (0, 0, 0.35 * back)            # head and chest a little back (the yawn), never over the head
            rig.body(t, dirs, head, spine)
            for side, sg in (("Right", -1), ("Left", 1)):
                q_now = hand_rot_w(ch, side)
                q_out = hand_q(ch, side, Vector((sg * 1.0, -0.30, 0.20)), Vector((0, -1, 0.05)))      # palms forward, fingers spread
                set_hand_rot(ch, side, q_now.slerp(q_out, u)); curl(ch, side, G_SPREAD if u > 0.5 else G_RELAX); key_hand(ch, side, fr)
            if fr % 12 == 0:
                hr = wpt(ch, "RightHandMiddle1"); hd = wpt(ch, "Head")
                print("CONTACT KE2 t=%.2f arms_out %.2f right_hand_below_head_top %.4f hand_outside_head_x %.4f" % (t, u, (hd.z + 0.02) - hr.z, hd.x - hr.x), flush=True)
        ch.finish()
    else:
        # KE3: the lamp goes on only when the fingertip touches the button
        # check 1: the fingers pointed forward over the lamp and lay on the BULB. Now the hand comes from her side (fingers
        # pointing from her to the lamp, palm down), the index bends down at the knuckle and its fingertip PAD (lowest skin point
        # of the fingertip, read from the mesh) presses the button on the base rim on her side; the bulb stays beyond the fingertip.
        d_l = Vector((STOOL_XY[0] - SX2, STOOL_XY[1] - SY2, 0)).normalized()
        q_press = hand_q(ch, "Right", d_l + Vector((0, 0, -0.25)), Vector((0, 0, -1)))
        Mh = rig.calibrate("Right", q_press, G_PRESS)
        tipb = wpt(ch, "RightHandIndex3", True)
        pad = min(near_verts(ch, tipb, 0.0016) or [tipb], key=lambda v: v.z)
        PAD_L = Mh.inverted() @ pad
        C_TIP = Mh.inverted() @ Matrix.Translation(pad)
        print("DESK GRIP button: fingertip pad %.4f below the bone tip, %.4f below the palm; bulb edge to button edge %.4f" % (
            tipb.z - pad.z, wpt(ch, "RightHand").z - pad.z, LAMP_R - 2 * BTN_R - 0.0002 - BULB_R), flush=True)
        HOVER = rig.from_prop("Right", Matrix.Translation(BTN_TOP + Vector((0, 0, 0.0018))), C_TIP, G_PRESS_OPEN)
        PRESS = rig.from_prop("Right", Matrix.Translation(BTN_TOP + Vector((0, 0, -0.00025))), C_TIP, G_PRESS)
        TAP = rig.from_prop("Right", Matrix.Translation(BTN_TOP + Vector((0, 0, 0.0006))), C_TIP, G_PRESS)

        def right(t):
            if t < 0.3: return hang_R
            if t < 0.8: return tblend(hang_R, HOVER, (t - 0.3) / 0.5)
            if t < 0.9: return tblend(HOVER, TAP, (t - 0.8) / 0.1)
            if t < 1.05: return tblend(TAP, PRESS, (t - 0.9) / 0.15)
            if t < 1.3: return PRESS
            if t < 1.5: return tblend(PRESS, HOVER, (t - 1.3) / 0.2)
            return tblend(HOVER, hang_R, (t - 1.5) / 0.6)

        def head(t):
            if t < 0.3: return HEAD0
            if t < 1.4: return (0, -12, -14)                   # looks down at the lamp on her right
            return (0, 0, 3)                                    # "Good morning!" to the camera
        t_on = None; btn_z0 = button.location.z
        for fr in E.frames():
            t = fr / E.FPS
            rig.solve(t, fr, head(t), right(t), None)
            tp = hand_M(ch, "Right") @ PAD_L; d = tp.z - BTN_TOP.z; dxy = (tp.xy - BTN_TOP.xy).length
            touching = d < 0.0003 and dxy < BTN_R * 1.2
            if touching and t_on is None:
                t_on = t; print("CONTACT KE3 lamp ON t=%.2f fingertip_to_button %.4f fingertip_off_button_centre %.4f" % (t, d, dxy), flush=True)
            button.location.z = btn_z0 - (0.00022 if touching else 0.0); button.keyframe_insert("location", frame=fr)
            if fr % 4 == 0 or touching: print("CONTACT KE3 t=%.2f fingertip_to_button %.4f fingertip_off_button_centre %.4f fingertip_clear_of_bulb %.4f" % (
                t, d, dxy, (tp.xy - Vector(STOOL_XY)).length - BULB_R), flush=True)
        ch.finish(); E.constant(button)
        if t_on is None:
            t_on = 1.0; print("CONTACT KE3 WARN the fingertip never touched the button: lamp forced on at 1.00", flush=True)
        lights_state(-1, False); lights_state(E.f(t_on), True); finish_lights()
        LAMP_T = t_on
    CAMS = {   # aim, camera offset, lens (hand cameras: no depth of field)
        "HF": (BTN_TOP + Vector((0, 0, 0.003)), Vector((-0.06, -0.12, 0.05)), 170),
        "HS": (BTN_TOP + Vector((0, 0, 0.003)), Vector((-0.14, -0.01, 0.03)), 170)}
    if CAMSUB in CAMS:
        aim, off, lens = CAMS[CAMSUB]
        cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    else:            # standing full body, the lamp on the stool beside her, the bed behind
        aim = Vector((SX2 - 0.004, SY2, FLOOR + 0.040))
        cam_move(55, aim + Vector((-0.02, -0.30, 0.03)), aim, aim + Vector((-0.016, -0.28, 0.028)), aim, focus=(SX2, SY2 - 0.006, FLOOR + 0.05))
    view_report(SHOT, [("pupil_head", lambda: wpt(ch, "Head")), ("lamp", BTN_TOP), ("left_slipper", lambda: wpt(ch, "LeftFoot")), ("clock", CLOCK)])

else:
    # ---------- KE4: at the window table, first the tea, then the mandazi ----------
    lights_state(-1, True); finish_lights()
    hstr = horizon
    for fr in (0, E.f(T)):
        hstr.default_value = 0.0; hstr.keyframe_insert("default_value", frame=fr)   # the horizon gets more orange
    rig = Rig(ch, M_, 0, LEAN, hips_xy=(X_KE4, HY4))
    rig.learn_hands()
    mouth0 = mouth(ch)
    rig.body(0, {}, HEAD_SIP); mouth_sip = mouth(ch)
    rig.body(0, {}, HEAD_BITE); mouth_bite = mouth(ch)
    rig.body(0, {}, HEAD0)
    SHR = wpt(ch, "RightArm")
    print("DESK STAND hips (%.4f, %.4f) table edge %.4f top %.4f shoulder_R %s mouth %s mouth_above_top %.4f" % (
        X_KE4, HY4, DB, TOP_AT(X_KE4, DB - 0.003) - FLOOR, tuple(round(v, 4) for v in SHR), tuple(round(v, 4) for v in mouth0), mouth0.z - TOP_AT(X_KE4, DB - 0.003)), flush=True)
    home = Vector((CUP_HOME_XY[0], CUP_HOME_XY[1], CUP_Z))
    set_M(cup, cup_M(home, 0.0), 0)
    R_REST = rig.rest("Right", (X_KE4 - M_["sh_half"] * 0.6, DB - 0.0025, TOP_AT(X_KE4 - M_["sh_half"] * 0.6, DB - 0.0025)), (0.25, -1, -0.05))

    # --- CUP: right hand from behind-right, palm towards her middle (+x), fingers forward through the loop, thumb on top ---
    q_cup = hand_q(ch, "Right", Vector((0.1, -1, -0.3)), Vector((1, 0, 0)))
    Mh = rig.calibrate("Right", q_cup, G_MUG)
    gp = (wpt(ch, "RightHandThumb3", True) + (wpt(ch, "RightHandIndex2") + wpt(ch, "RightHandMiddle2")) / 2) / 2
    C_CUP = Mh.inverted() @ Matrix.Translation(gp - HANDLE_PT)
    print("DESK GRIP cup thumb_above_fingers %.4f (thumb on top of the handle when > 0)" % (
        wpt(ch, "RightHandThumb3", True).z - (wpt(ch, "RightHandIndex2").z + wpt(ch, "RightHandMiddle2").z) / 2), flush=True)

    # --- MANDAZI: pinch calibration; the piece's plane lies between the thumb pad and the index + middle pads ---
    # check 1: the bone tips were 3.0 mm apart around a 1.5 mm piece (it floated beside the fingers). Now the skin PADS are read
    # from the mesh (thumb pad nearest the fingers, index / middle pad nearest the thumb pad), the pinch closes in small steps
    # until the pads are <= 2.4 mm apart, and the puffy piece is made exactly as thick as that gap, so both faces touch the pads.
    q_mz = hand_q(ch, "Right", Vector((0.3, -1, -0.15)), Vector((1, 0, -0.3)))
    G_MZ = dict(G_PINCH); prev = None
    for it in range(7):
        Mh = rig.calibrate("Right", q_mz, G_MZ)
        TH = wpt(ch, "RightHandThumb3", True); FI = (wpt(ch, "RightHandIndex3", True) + wpt(ch, "RightHandMiddle3", True)) / 2
        tv = near_verts(ch, TH, 0.0015) or [TH]
        fv = (near_verts(ch, wpt(ch, "RightHandIndex3", True), 0.0015) + near_verts(ch, wpt(ch, "RightHandMiddle3", True), 0.0015)) or [FI]
        padT = min(tv, key=lambda v: (v - FI).length); padF = min(fv, key=lambda v: (v - padT).length)
        gap = (padT - padF).length
        print("DESK GRIP mandazi step %d pads %.4f apart (thumb %s index %s middle %s)" % (it, gap, G_MZ["Thumb"], G_MZ["Index"], G_MZ["Middle"]), flush=True)
        if gap < 0.0012 and prev is not None:            # closed too far: go back one step
            G_MZ, Mh, padT, padF, gap = prev; Mh = rig.calibrate("Right", q_mz, G_MZ); break
        if gap <= 0.0024: break
        prev = (dict(G_MZ), Mh, padT, padF, gap)
        G_MZ["Thumb"] = tuple(a + 5 for a in G_MZ["Thumb"]); G_MZ["Index"] = tuple(a + 5 for a in G_MZ["Index"]); G_MZ["Middle"] = tuple(a + 4 for a in G_MZ["Middle"])
    MZ_T = max(0.0012, min(0.0026, gap - 0.00008))
    G_MZ_OPEN = {f: tuple(a * 0.45 for a in G_MZ[f]) for f in FINGERS}
    yl = (padT - padF).normalized(); fw = (wpt(ch, "RightHandMiddle1") - wpt(ch, "RightHand")).normalized()
    Mz = frame_XY((padT + padF) / 2, fw - fw.dot(yl) * yl, yl)
    C_MZ = Mh.inverted() @ Mz
    PADT_L, PADF_L = Mh.inverted() @ padT, Mh.inverted() @ padF
    print("DESK GRIP mandazi pads %.4f apart -> piece thickness %.4f (both faces on the pads) %s" % (gap, MZ_T,
          "" if gap <= 0.0026 else "WARN the pinch did not close enough: raise G_PINCH"), flush=True)
    h_ = MZ_S * math.sqrt(3) / 2
    # --- 4) the bite (check 1: the piece lay flat in front of her right cheek). At the mouth the piece is now EDGE-ON to the
    # camera: it comes in from her lower right, its plane holds the line hand -> mouth corner and the camera's line of sight,
    # so from the front it is only a thin edge; only its far corner touches the right mouth corner; the third corner points
    # towards the camera (never back into the cheek). Thumb on the upper (outer) face, index + middle on the lower face.
    D_BITE = Vector((0.80, 0.08, 0.58)).normalized()                       # held corner -> mouth corner (up and towards her middle)
    N_BITE = D_BITE.cross(Vector((0.0, 1.0, 0.0))).normalized()             # piece normal (thumb side): up and out to her right
    if N_BITE.z < 0: N_BITE = -N_BITE
    H_L = Vector((-MZ_IN, 0, 0))

    def mouth_pose(sign):
        bl = Vector((h_ - MZ_IN - 0.0002, 0, sign * (MZ_S / 2 - 0.0002)))
        b_dir = (bl - H_L).normalized(); yl_ = Vector((0, 1, 0))
        Lb = Matrix((b_dir, yl_, b_dir.cross(yl_))).transposed()
        Wb = Matrix((D_BITE, N_BITE, D_BITE.cross(N_BITE))).transposed()
        Rm = (Wb @ Lb.inverted()).to_4x4()
        M = Rm.copy(); M.translation = mouth_bite + BITE_D - (Rm.to_3x3() @ bl)
        return M, bl, M @ Vector((h_ - MZ_IN, 0, -sign * MZ_S / 2))
    cand = [mouth_pose(sg) for sg in (1.0, -1.0)]
    k_ = 0 if cand[0][2].y <= cand[1][2].y else 1                          # the third corner towards the camera
    B_MOUTH, BITE_L, _oth = cand[k_]; BITE_SIGN = (1.0, -1.0)[k_]
    TOPC_L = Vector((h_ - MZ_IN, 0, -BITE_SIGN * MZ_S / 2))
    print("DESK GRIP mandazi at the mouth: plane normal %s (edge-on to the camera when y ~ 0), third corner %.4f in front of the mouth, %.4f above it" % (
        tuple(round(v, 2) for v in N_BITE), mouth_bite.y - _oth.y, _oth.z - mouth_bite.z), flush=True)
    mz_whole = make_mandazi(False, BITE_SIGN); mz_bit = make_mandazi(True, BITE_SIGN)
    # piece lying on the pile: thumb side up, body into the plate, the held corner over the near rim
    foot = [Vector((0.0, 0, 0)), Vector((h_ * 0.6, 0, 0)), Vector((h_ - MZ_IN, 0, MZ_S / 2)), Vector((h_ - MZ_IN, 0, -MZ_S / 2))]
    M0 = frame_XY(PICK, X_PLATE, Vector((0, 0, 1)))
    zmax = max((TOP_AT((M0 @ p).x, (M0 @ p).y)) for p in foot)
    B_PLATE = frame_XY(Vector((PICK.x, PICK.y, zmax + MZ_T / 2 + 0.0001)), X_PLATE, Vector((0, 0, 1)))
    under = TOP_AT(PICK.x, PICK.y)
    print("DESK MANDAZI on the pile z %.4f (table %.4f) gap under the held corner %.4f" % (zmax, CUP_Z, B_PLATE.translation.z - MZ_T / 2 - under), flush=True)
    B_APP = Tr(*(-0.0030 * D_BITE + Vector((0, -0.0006, 0)))) @ B_MOUTH          # from the side, along the line to the mouth corner
    B_CHEST = B_MOUTH.copy(); B_CHEST.translation = SHR + Vector((0.0010, -0.0085, -0.0040))

    # --- timeline (teacher 1B: "I drink tea" on the sip, "and eat mandazi" on the bite) ---
    GRAB, LET = 1.55, EVENTS["cup_down"]
    GRABM, BITE_T, REL = 5.75, EVENTS["bite"], EVENTS["plate"]
    up = Vector((0, 0, 0.0016)); r10 = math.radians(10)
    lips = mouth_sip + SIP_D; side_off = Vector((-0.0025, -0.0004, -0.0012))
    base_for = lambda p, tl: p - Matrix.Rotation(tl, 3, "Y") @ RIM
    CKB = [(0.0, home), (GRAB, home), (GRAB + 0.2, home + up), (2.45, base_for(lips + side_off, r10)), (2.65, base_for(lips, r10)),
           (2.85, base_for(lips, SIP_TILT)), (3.75, base_for(lips, SIP_TILT)), (3.95, base_for(lips, r10)),
           (4.15, base_for(lips + side_off, r10)), (4.75, home + up), (LET, home), (9.9, home)]
    CKT = [(0.0, 0.0), (GRAB + 0.2, 0.0), (2.45, r10), (2.65, r10), (2.85, SIP_TILT), (3.75, SIP_TILT), (3.95, r10), (4.15, r10), (4.75, 0.0), (9.9, 0.0)]
    cup_target = lambda t: cup_M(lerp_keys(CKB, t), lerp_keys(CKT, t))
    cup_pre = rig.from_prop("Right", Tr(-0.0014, 0.0007, 0.0010) @ cup_M(home, 0.0), C_CUP, G_MUG_OPEN)
    cup_grab = rig.from_prop("Right", cup_M(home, 0.0), C_CUP, G_MUG)
    cup_off = rig.from_prop("Right", Tr(-0.0014, 0.0007, 0.0012) @ cup_M(home, 0.0), C_CUP, G_RELAX)
    BK = [(GRABM, B_PLATE), (GRABM + 0.2, Tr(0, 0, 0.0015) @ B_PLATE), (6.35, B_CHEST), (6.7, B_APP), (BITE_T, B_MOUTH), (7.05, B_MOUTH),
          (7.3, B_APP), (7.8, Tr(0, 0, 0.0020) @ B_PLATE), (REL - 0.05, B_PLATE), (9.9, B_PLATE)]
    mz_pre = rig.from_prop("Right", Tr(0, 0, 0.0012) @ Tr(*(0.0012 * _dir)) @ B_PLATE, C_MZ, G_MZ_OPEN)
    mz_grab = rig.from_prop("Right", B_PLATE, C_MZ, G_MZ)
    mz_off = rig.from_prop("Right", Tr(0, 0, 0.0016) @ Tr(*(0.0014 * _dir)) @ B_PLATE, C_MZ, G_RELAX)

    def right(t):
        if t < 0.5: return R_REST
        if t < 1.3: return tblend(R_REST, cup_pre, (t - 0.5) / 0.8)
        if t < GRAB: return tblend(cup_pre, cup_grab, (t - 1.3) / (GRAB - 1.3))
        if t <= LET: return rig.from_prop("Right", cup_target(t), C_CUP, G_MUG)
        if t < LET + 0.2: return tblend(cup_grab, cup_off, (t - LET) / 0.2)
        if t < 5.55: return tblend(cup_off, mz_pre, (t - LET - 0.2) / (5.55 - LET - 0.2))
        if t < GRABM: return tblend(mz_pre, mz_grab, (t - 5.55) / (GRABM - 5.55))
        if t <= REL: return rig.from_prop("Right", key_M(BK, t), C_MZ, G_MZ)
        if t < REL + 0.25: return tblend(mz_grab, mz_off, (t - REL) / 0.25)
        return tblend(mz_off, R_REST, (t - REL - 0.25) / 0.5)

    def chew(t, t0, base):
        if t0 <= t < t0 + 0.68: return (base[0], base[1], base[2] + (5 if int((t - t0) / 0.17) % 2 else 0))
        return base
    HEADK = [(0.0, HEAD0), (0.6, HEAD0), (1.0, (0, -4, -10)), (1.7, (0, -4, -10)), (2.3, HEAD_SIP), (3.9, HEAD_SIP), (4.3, (0, -2, -8)),
             (5.1, (0, -2, -10)), (6.0, (0, -2, -10)), (6.5, HEAD_BITE), (7.05, HEAD_BITE), (7.4, (0, 0, -2)), (8.6, (0, 0, -6)), (9.9, (0, 0, 2))]
    hk = lambda t: tuple(lerp_keys([(a, Vector(b)) for a, b in HEADK], t))
    t_bite, last_mz, said = None, None, set()
    for fr in E.frames():
        t = fr / E.FPS
        head = hk(t)
        if BITE_T + 0.15 <= t < 7.85: head = chew(t, BITE_T + 0.2, tuple(head))
        rig.solve(t, fr, head, right(t), None)
        Mc = hand_M(ch, "Right") @ C_CUP if GRAB <= t <= LET else cup_M(home, 0.0)
        set_M(cup, Mc, fr)
        if GRAB <= t and "cupgrab" not in said:
            said.add("cupgrab"); print("CONTACT KE4 cup grab t=%.2f cup_jump %.4f" % (t, (Mc.translation - home).length), flush=True)
        if t > LET and "cuplet" not in said:
            said.add("cuplet"); Ml = hand_M(ch, "Right") @ C_CUP
            print("CONTACT KE4 cup down t=%.2f cup_bottom_above_table %.4f off_home %.4f" % (t, Ml.translation.z - home.z, (Ml.translation.xy - home.xy).length), flush=True)
        if GRABM <= t <= REL:
            Mm = hand_M(ch, "Right") @ C_MZ; last_mz = Mm
            if "mzgrab" not in said:
                said.add("mzgrab"); Hm = hand_M(ch, "Right"); Mi = Mm.inverted()
                ft = abs((Mi @ (Hm @ PADT_L)).y) - MZ_T / 2; ff = abs((Mi @ (Hm @ PADF_L)).y) - MZ_T / 2
                jmp = (Mm.translation - B_PLATE.translation).length
                print("CONTACT KE4 mandazi grab t=%.2f piece_jump %.4f thumb_pad_to_face %.4f finger_pad_to_face %.4f %s" % (t, jmp, ft, ff,
                      "" if jmp < 0.0006 and abs(ft) < 0.0003 and abs(ff) < 0.0003 else "WARN pads not on both faces / piece jumped"), flush=True)
        elif t > REL and last_mz is not None:
            if "mzrel" not in said:
                said.add("mzrel"); print("CONTACT KE4 mandazi down t=%.2f above_pile %.4f off_place %.4f" % (
                    t, last_mz.translation.z - B_PLATE.translation.z, (last_mz.translation.xy - B_PLATE.translation.xy).length), flush=True)
            Mm = blend_M(last_mz, B_PLATE, min(1.0, (t - REL) / 0.12))
        else:
            Mm = B_PLATE
        set_M(mz_whole, Mm, fr); set_M(mz_bit, Mm, fr)
        m_ = mouth(ch); bw = Mm @ BITE_L
        if t_bite is None and t >= BITE_T - 0.25 and GRABM < t < REL and ((bw - (m_ + BITE_D)).length < 0.0016 or t >= BITE_T + 0.15):
            t_bite = t
            print("CONTACT KE4 bite t=%.2f corner_to_mouth_corner %.4f %s" % (t, (bw - (m_ + BITE_D)).length, "" if (bw - (m_ + BITE_D)).length < 0.0016 else "WARN forced"), flush=True)
        if fr % 4 == 0:
            rim = Mc @ RIM; gpn = (wpt(ch, "RightHandThumb3", True) + (wpt(ch, "RightHandIndex2") + wpt(ch, "RightHandMiddle2")) / 2) / 2
            print("CONTACT KE4 t=%.2f cup_rim_to_lips %.4f cup_top_below_eyes %.4f fingers_to_handle %.4f mz_corner_to_mouth %.4f mz_top_below_eyes %.4f" % (
                t, (rim - m_).length, (m_.z + EYE_DZ) - (Mc @ Vector((0, 0, CUP_H))).z, (gpn - Mc @ HANDLE_PT).length,
                (bw - (m_ + BITE_D)).length, (m_.z + EYE_DZ) - (Mm @ TOPC_L).z), flush=True)
    ch.finish(); E.constant(cup)
    if t_bite is None: t_bite = BITE_T; print("CONTACT KE4 WARN no bite contact found", flush=True)
    E.show_between([mz_whole], t_off=t_bite); E.show_between([mz_bit], t_on=t_bite)
    for o in (mz_whole, mz_bit): E.constant(o)

    sip_pt = lips + Vector((-0.002, -0.001, -0.002)); bite_pt = mouth_bite + BITE_D + Vector((-0.002, -0.001, -0.002))
    HANDCAM = {   # aim, camera offset, lens. Her right hand is on the -x side; DOF off.
        "HF": (home + HANDLE_PT, Vector((-0.07, -0.12, 0.04)), 170), "HS": (home + HANDLE_PT, Vector((-0.14, 0.0, 0.02)), 170),
        "HF2": (sip_pt, Vector((-0.07, -0.12, 0.012)), 150), "HS2": (sip_pt, Vector((-0.14, -0.01, 0.01)), 150),
        "HF3": (PICK + Vector((0, 0, B_PLATE.translation.z + 0.001)), Vector((-0.07, -0.12, 0.05)), 170),
        "HS3": (PICK + Vector((0, 0, B_PLATE.translation.z + 0.001)), Vector((-0.14, -0.01, 0.03)), 170),
        "HF4": (bite_pt, Vector((-0.07, -0.12, 0.012)), 150), "HS4": (bite_pt, Vector((-0.14, -0.01, 0.01)), 150)}
    HANDCAM["UG"] = (Vector((PLC[0] + 0.006, PLC[1] + 0.004, CUP_Z + 0.0030)), Vector((0.02, -0.11, 0.065)), 105)   # he/she: ugali + flour bag
    if CAMSUB in HANDCAM:
        aim, off, lens = HANDCAM[CAMSUB]
        cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    else:            # front, a little from her left (the cup and the mandazi at her right cheek stay beside the face); clock top right
        aim = Vector((X_KE4 + 0.012, mouth0.y + 0.010, FLOOR + 0.048))
        cam_move(50, aim + Vector((0.04, -0.33, 0.0)), aim, aim + Vector((0.036, -0.31, 0.0)), aim, focus=mouth0)
    view_report("KE4", [("clock", CLOCK), ("pupil_mouth", lambda: mouth(ch)), ("cup", home), ("plate", (PLC[0], PLC[1], CUP_Z)),
                        ("window", (WIN_X, 0.24, FLOOR + 0.10)), ("table_front", (TX, DBOX[2], CUP_Z))])

if SHOT == "KE4": face_fill(0)
elif SHOT == "KE3": face_fill(LAMP_T)
face_px(SHOT + ("" if CAMSUB == "main" else CAMSUB), {"KE1": [72], "KE2": [36], "KE3": [0, 48], "KE4": [0, 72, 166]}[SHOT])
print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
