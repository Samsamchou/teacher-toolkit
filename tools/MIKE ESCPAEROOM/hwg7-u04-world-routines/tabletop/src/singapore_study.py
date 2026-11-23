# World Routines Trip, he/she version - Singapore station "She studies English at four o'clock." - Ling (singapore_girl_school = singapore_girl_pyjamas recoloured) at an English class after school
# Built by desk_study_build.py (read its header for the shots). ASCII only.
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
DUR = {"D1": 7.8, "D2": 4.0, "D3": 4.4, "D4": 3.6}
VOICE = {"q": 0.4, "a": 4.5}
EVENTS = {}
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
    crust = E.felt("mandaziCrust", (0.62, 0.27, 0.05))
    pts = tri_outline(MZ_S, bitten, bite_sign)
    n = len(pts); y0, y1 = -MZ_T / 2, MZ_T / 2
    verts = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
    me = bpy.data.meshes.new(name + "Mesh"); me.from_pydata(verts, [], faces); me.update(); me.materials.append(crust)
    body = bpy.data.objects.new(name + "Body", me); sc.collection.objects.link(body)
    bv = body.modifiers.new("bv", "BEVEL"); bv.width = 0.0005; bv.segments = 3; bv.limit_method = "ANGLE"
    body.parent = emp
    return emp


MODEL = "singapore_girl_school"; HEIGHT_K = KID * 1.04; HH, MM, END = 4, 0, (6, 0)
WALL_C, FLOOR_C, DESK_C = (0.92, 0.94, 0.86), (0.62, 0.66, 0.7), (0.85, 0.85, 0.82)
CHAIR_C, BOOK_C, NOTE_C = ((0.2, 0.35, 0.65), (0.1, 0.2, 0.4)), (0.95, 0.55, 0.2), (0.3, 0.6, 0.9)
EXTRA = "whiteboard"


# ================= build (desk study, he/she) =================
# check (11/23): a bone matrix set by the hand helpers can leave a location / scale on a bone that is not keyed -> a long skin
# spike in every frame. Clear them before the character is finalised.
_fin0 = E.Char.finish
def _fin(self):
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    _fin0(self)
E.Char.finish = _fin

G_FLAT = {"Thumb": (5, 6, 4), "Index": (3, 5, 3), "Middle": (3, 5, 3), "Ring": (4, 6, 4), "Pinky": (5, 7, 4)}
G_PEN = {"Thumb": (20, 25, 15), "Index": (30, 28, 18), "Middle": (42, 38, 22), "Ring": (62, 60, 40), "Pinky": (68, 62, 42)}
PEN_L, PEN_R, PEN_GRIP, PEN_EL = 0.0090, 0.00035, 0.0022, math.radians(50)
PALM_WRITE = Vector((0.75, 0, -0.66))


def wall_clock(cx, cy, cz, hh, mm, r=0.020, minute_keys=None):
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.10, 0.10, 0.12), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.99, 0.99, 0.97), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.05, 0.05, 0.06), 0.5)
    for k in range(12):
        a = math.radians(k * 30)
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0012 if k % 3 == 0 else 0.0007), ink, "tick")
    hp = E.empty("hourPivot"); hp.location = (cx, cy - 0.0047, cz); hp.rotation_mode = "XYZ"
    mp = E.empty("minPivot"); mp.location = (cx, cy - 0.0053, cz); mp.rotation_mode = "XYZ"
    E.box((0, 0, 0.21 * r), (0.0020, 0.001, 0.42 * r), ink, "hourHand", bevel=0).parent = hp
    E.box((0, 0, 0.32 * r), (0.0013, 0.001, 0.64 * r), ink, "minuteHand", bevel=0).parent = mp
    E.ball((cx, cy - 0.0058, cz), 0.0013, E.mat("clockPin", (0.80, 0.10, 0.08), 0.4), "clockPin")
    keys = minute_keys or [(0.0, hh * 60 + mm), (99.0, hh * 60 + mm)]
    for fr in E.frames():
        t = fr / E.FPS; m = keys[-1][1]
        for (t0, m0), (t1, m1) in zip(keys, keys[1:]):
            if t <= t0: m = m0; break
            if t0 <= t <= t1: m = m0 + (m1 - m0) * E.ease((t - t0) / max(1e-6, t1 - t0)); break
        mp.rotation_euler = (0, math.radians((m % 60) * 6), 0); hp.rotation_euler = (0, math.radians(((m / 60.0) % 12) * 30), 0)
        mp.keyframe_insert("rotation_euler", frame=fr); hp.keyframe_insert("rotation_euler", frame=fr)
    E.constant(mp); E.constant(hp)


def room():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk0")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("floor", FLOOR_C), "floor", thick=FLOOR)
    E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("backWall", WALL_C), "backWall")
    for x in (-0.326, 0.326): E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", tuple(c * 0.92 for c in WALL_C)), "sideWall")
    if EXTRA == "whiteboard":
        E.box((-0.05, WALL_Y - 0.0068, FLOOR + 0.120), (0.12, 0.002, 0.060), E.felt("whiteboard", (0.98, 0.98, 0.98)), "whiteboard", bevel=0.0006)
        E.box((-0.05, WALL_Y - 0.0060, FLOOR + 0.120), (0.124, 0.002, 0.064), E.mat("wbFrame", (0.6, 0.6, 0.62), 0.3), "wbFrame", bevel=0)
        for k, col in enumerate(((0.9, 0.2, 0.2), (0.2, 0.4, 0.9), (0.2, 0.6, 0.3))):   # coloured doodles, no letters
            E.ball((-0.09 + 0.035 * k, WALL_Y - 0.0080, FLOOR + 0.125), 0.006, E.felt("doodle%d" % k, col), "doodle").scale = (1.4, 0.1, 0.5)
    else:
        E.box((-0.10, WALL_Y - 0.012, FLOOR + 0.020), (0.16, 0.022, 0.040), E.felt("kitchenBench", (0.95, 0.95, 0.92)), "kitchenBench", bevel=0.001)
        E.box((-0.10, WALL_Y - 0.012, FLOOR + 0.041), (0.165, 0.024, 0.003), E.felt("benchTop", (0.40, 0.40, 0.42)), "benchTop", bevel=0.0006)
        E.box((-0.10, WALL_Y - 0.0068, FLOOR + 0.100), (0.10, 0.002, 0.040), E.felt("splash", (0.70, 0.85, 0.90)), "splashback", bevel=0)


ch = E.Char(MODEL, (0.30, -0.15), 0, height=HEIGHT_K)
M_ = metrics(ch)
SEAT_UNDER = seat_under(ch, M_["thigh"]) - SINK
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
SEAT_Z = FLOOR + M_["knee_h"] - SEAT_UNDER
BX, BY = 0.040, 0.170
hips_z = SEAT_Z + SEAT_HIP
TOP_Z = hips_z + 0.40 * M_["sh_hips"]
DESK_BACK = BY - M_["front"] - 0.0012
DESK_D = 0.040
room()
CLOCK = (BX + 0.060, WALL_Y - 0.0045, FLOOR + 0.105)
mk = [(0.0, HH * 60 + MM), (0.6, HH * 60 + MM), (3.0, END[0] * 60 + END[1]), (9.0, END[0] * 60 + END[1])] if SHOT == "D4" else None
wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], HH, MM, minute_keys=mk)
E.box((BX, DESK_BACK - DESK_D / 2, TOP_Z - 0.0015), (0.075, DESK_D, 0.003), E.felt("deskTop", DESK_C), "deskTop", bevel=0.0008)
for sx in (-1, 1):
    for sy in (-1, 1):
        E.box((BX + sx * 0.034, DESK_BACK - DESK_D / 2 + sy * 0.016, (FLOOR + TOP_Z) / 2), (0.0025, 0.0025, TOP_Z - FLOOR - 0.003), E.felt("deskLeg", tuple(c * 0.8 for c in DESK_C)), "deskLeg", bevel=0)
build_code_chair(BX, BY - 0.010, SEAT_Z, 0.030, FLOOR, depth=0.022, wood_lin=CHAIR_C[0], cushion_lin=CHAIR_C[1], name="chair")
# the open book (D2) and the notebook (D3) lie in front of her / him; both always there
BOOK = Vector((BX + 0.0050, DESK_BACK - 0.010, TOP_Z))      # teacher 11/23: book on his LEFT, notebook on his RIGHT
for k, (dx, c) in enumerate(((-0.0055, (0.98, 0.97, 0.93)), (0.0055, (0.98, 0.97, 0.93)))):
    E.box((BOOK.x + dx, BOOK.y, BOOK.z + 0.0005), (0.0105, 0.0140, 0.0010), E.felt("page%d" % k, c), "bookPage", bevel=0.0002)
E.box((BOOK.x, BOOK.y, BOOK.z + 0.0002), (0.0225, 0.0150, 0.0004), E.felt("bookCover", BOOK_C), "bookCover", bevel=0.0002)
for j in range(5):
    for dx in (-0.0055, 0.0055):
        E.box((BOOK.x + dx, BOOK.y + 0.005 - j * 0.0025, BOOK.z + 0.00105), (0.008, 0.0004, 0.00005), E.mat("printLine", (0.25, 0.25, 0.3), 0.8), "printLine", bevel=0)
NOTE = Vector((BX - 0.0135, DESK_BACK - 0.008, TOP_Z))      # under the writing (right) hand: reaching across the chest put the upper arm inside the body      # check 1: the pencil tip did not reach the paper (7 mm)
E.box((NOTE.x, NOTE.y, NOTE.z + 0.0004), (0.0110, 0.0140, 0.0008), E.felt("notebook", NOTE_C), "notebook", bevel=0.0002)
E.box((NOTE.x, NOTE.y, NOTE.z + 0.00085), (0.0100, 0.0130, 0.0001), E.felt("notePaper", (0.99, 0.99, 0.97)), "notePaper", bevel=0)
L_, Fl, R_ = E.lights(lamp=0.40)


def make_pencil():
    emp = E.empty("pencil"); emp.rotation_mode = "XYZ"
    yellow = E.mat("pencilYellow", (0.95, 0.72, 0.08), 0.45); woodm = E.mat("pencilWood", (0.85, 0.66, 0.42), 0.7)
    lead = E.mat("graphite", (0.08, 0.08, 0.09), 0.35); pink = E.mat("eraser", (0.95, 0.5, 0.55), 0.8)
    parts = [E.cone((0, 0, 0.0003), 0.0, 0.00012, 0.0006, lead, verts=12, name="penLead"),
             E.cone((0, 0, 0.0011), 0.00012, PEN_R, 0.001, woodm, verts=12, name="penWood"),
             E.cyl((0, 0, (0.0016 + PEN_L - 0.0012) / 2), PEN_R, PEN_L - 0.0028, yellow, verts=6, name="penBody"),
             E.cyl((0, 0, PEN_L - 0.0003), PEN_R * 0.98, 0.0006, pink, verts=12, name="penEraser")]
    for o in parts: o.parent = emp
    return emp


pencil = make_pencil()
PEN_REST = frame_M(Vector((NOTE.x - 0.0075, NOTE.y, TOP_Z + PEN_R)), Vector((0, 1, 0)), Vector((1, 0, 0)))
set_M(pencil, PEN_REST, 0)

if SHOT == "D0":
    # the backyard: he kicks the football with his RIGHT foot; the ball rolls only after the foot touches it
    for o in list(bpy.data.objects):
        if o.name.startswith(("deskTop", "deskLeg", "chair", "bookPage", "bookCover", "printLine", "notebook", "notePaper", "pen", "clock", "tick", "hourHand", "minuteHand", "hourPivot", "minPivot", "kitchen", "benchTop", "splash", "backWall")):
            o.hide_render = True
    E.board((0, 0.03), (0.64, 0.44), E.felt("grass", (0.30, 0.55, 0.20)), "grass", thick=FLOOR + 0.0005)
    if os.path.exists(f"{PROPS}/australia_backyard.glb"):
        E.place(f"{PROPS}/australia_backyard.glb", 0.14, (0.10, 0.22, FLOOR))
    E.box((0, 0.62, 0.30), (1.4, 0.004, 0.70), E.emission("daySky", (0.55, 0.78, 1.0), 1.4), "sky", bevel=0)
    E.box((0, 0.30, FLOOR + 0.03), (0.64, 0.004, 0.06), E.felt("fence", (0.70, 0.55, 0.35)), "fence", bevel=0)
    rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(-0.02, 0.14))
    foot0 = None
    ball_r = 0.0035
    ball = E.ball((0, 0, 0), ball_r, E.felt("football", (0.97, 0.97, 0.97)), "football")
    for k in range(5): E.ball((0, 0, 0), ball_r * 0.33, E.felt("footballPatch", (0.08, 0.08, 0.08)), "patch%d" % k).parent = ball
    for k, p in enumerate(bpy.data.objects[n] for n in [o.name for o in ball.children]):
        a = k * 1.256; p.location = (ball_r * 0.92 * math.cos(a), ball_r * 0.92 * math.sin(a) * 0.5, ball_r * 0.92 * (0.4 if k % 2 else -0.3))
    kicked = None
    for fr in E.frames():
        t = fr / E.FPS
        u = 0.0 if t < 0.8 else (E.ease((t - 0.8) / 0.4) if t < 1.2 else max(0.0, 1.0 - E.ease((t - 1.5) / 0.5)))
        back = 0.0 if t < 0.5 else (E.ease((t - 0.5) / 0.3) if t < 0.8 else 0.0)
        rig.legs = {"RightUpLeg": (-0.12, -0.9 * u + 0.5 * back, -1), "RightLeg": (0, -0.6 * u + 0.4 * back, -1)}
        rig.body(t, {"LeftArm": (0.75, -0.2, -0.45), "RightArm": (-0.75, 0.2, -0.45)}, (0, 0, -6 if t < 1.3 else 2))
        toe = wpt(ch, "RightToeBase") if "RightToeBase" in ch.pb else wpt(ch, "RightFoot")
        if foot0 is None: foot0 = Vector((toe.x, toe.y - 0.004, FLOOR + ball_r))
        if kicked is None and (toe - foot0).length < ball_r + 0.0012 and t > 0.8:
            kicked = t; print("CONTACT D0 kick t=%.2f toe_to_ball %.4f" % (t, (toe - foot0).length), flush=True)
        if kicked is None: bl = foot0
        else:
            d = t - kicked; bl = foot0 + Vector((0.02 * d, -0.06 * d, 0.012 * math.sin(min(math.pi, d * 3.0))))
        ball.location = bl; ball.rotation_euler = (-(0 if kicked is None else (t - kicked) * 12), 0, 0)
        ball.keyframe_insert("location", frame=fr); ball.keyframe_insert("rotation_euler", frame=fr)
    ch.finish(); E.constant(ball)
    if kicked is None: print("CONTACT D0 WARN the foot never touched the ball", flush=True)
    aim = Vector((-0.01, 0.12, FLOOR + 0.040))
    cam_move(45, aim + Vector((0.03, -0.32, 0.03)), aim, aim + Vector((0.035, -0.30, 0.028)), aim, focus=wpt(ch, "Head"))

else:
    hy = BY
    rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(BX, hy))
    rig.learn_hands(HEAD0)
    mouth0 = mouth(ch)
    if SHOT == "D1":
        ans0, ans1 = VOICE["a"], VOICE["a"] + 2.2
        pt = Vector(local_dir((BX, hy), 0, CLOCK, wpt(ch, "LeftArm").z)).normalized()
        pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
        lap_r = {k: v for k, v in P_LAP.items() if k.startswith("Right")}
        for fr in E.frames():
            t = fr / E.FPS
            if t >= ans0 - 0.15:
                k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
                arms = dict(lap_r); arms.update(point_arm((pt.x, pt.y, pt.z + 0.06 * k), False))
                head = (0, 6, 6) if t < ans1 else (0, 0, 2)
            else:
                arms, head = {}, (0, 0, -8)
            rig.body(t, arms, head)
            rest_hand(ch, "Left")
            if t < ans0 - 0.15: key_hand(ch, "Left", fr)
            if t >= ans0 - 0.15: point_hand(ch, "Left", CLOCK); curl_hinge(ch, "Left", G_POINT, fingers=("Index", "Middle", "Ring", "Pinky")); tuck_thumb(ch, "Left"); key_hand(ch, "Left", fr)
        ch.finish()
        aim = Vector((BX + 0.020, BY - 0.02, FLOOR + 0.058))
        cam_move(46, aim + Vector((-0.01, -0.36, 0.05)), aim, aim + Vector((-0.006, -0.33, 0.045)), aim, focus=mouth0)
    elif SHOT == "D2":
        # reading: both hands flat on the pages, head nods down the lines
        RR = rig.rest("Right", (BOOK.x - 0.0055, BOOK.y - 0.004, BOOK.z + 0.0011), (0.25, -1, -0.05))
        RL = rig.rest("Left", (BOOK.x + 0.0055, BOOK.y - 0.004, BOOK.z + 0.0011), (-0.25, -1, -0.05))
        for fr in E.frames():
            t = fr / E.FPS
            rig.solve(t, fr, (0, 3 * math.sin(t * 2.0), -16 + 2 * math.sin(t * 3.0)), RR, RL)
        ch.finish()
        aim = Vector((BX - 0.002, BY - 0.012, FLOOR + 0.050))
        cam_move(60, aim + Vector((-0.03, -0.24, 0.06)), aim, aim + Vector((-0.028, -0.23, 0.056)), aim, focus=mouth0)
    elif SHOT == "D3":
        SHR = wpt(ch, "RightArm")
        q_w = hand_q(ch, "Right", Vector((0.2, -1, -0.4)), PALM_WRITE)
        Mh = rig.calibrate("Right", q_w, G_PEN)
        tri_c = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex3", True) + wpt(ch, "RightHandMiddle3", True)) / 3
        web = (wpt(ch, "RightHandThumb2") + wpt(ch, "RightHandIndex1")) / 2
        palm_w = ch.arm.matrix_world.to_3x3().normalized() @ hand_frame(ch, "Right")[3]
        # teacher 11/23: the pencil ran through the web between thumb and index. The shaft must REST ON the web: move the
        # web end of the shaft out of the skin (towards the back of the hand) until no skin vertex is closer than PEN_R.
        SKIN = [v_ for v_ in near_verts(ch, web, 0.0035)]
        def shaft_clear(w_end):
            d_ = (w_end - tri_c).normalized(); worst = 9.0
            for v_ in SKIN:
                u_ = (v_ - tri_c).dot(d_)
                if (w_end - tri_c).length - 0.0015 < u_ < (w_end - tri_c).length + 0.0025: worst = min(worst, ((v_ - tri_c) - d_ * u_).length)      # only the web part of the shaft (the finger pads SHOULD touch)
            return worst
        web0 = web.copy()
        # push towards the THUMB SIDE of the index knuckle (the crook of the web), a little to the back of the hand:
        # a real tripod grip rests the pencil there; pushing straight to the back of the hand put the shaft out through it
        acr_w = (wpt(ch, "RightHandIndex1") - wpt(ch, "RightHandPinky1")).normalized()
        PUSH = (acr_w - palm_w * 0.35).normalized()
        for k_ in range(40):
            if shaft_clear(web) >= PEN_R + 0.00012: break
            web = web + PUSH * 0.0001
        print("DESK PENWEB lifted %.4f off the web skin, shaft-to-skin %.4f (pencil radius %.4f)" % ((web - web0).length, shaft_clear(web), PEN_R), flush=True)
        d_end = (web - tri_c).normalized()
        C_PEN = Mh.inverted() @ frame_M(tri_c - d_end * PEN_GRIP, d_end, palm_w)
        def pen_M(tip):
            h = SHR - tip; h.z = 0; h.normalize()
            return frame_M(tip, h * math.cos(PEN_EL) + Vector((0, 0, math.sin(PEN_EL))), PALM_WRITE)
        RL = rig.rest("Left", (BOOK.x - 0.0050, BOOK.y - 0.004, BOOK.z + 0.0011), (-0.25, -1, -0.05))      # left hand rests on the book (its own side)
        paper_z = NOTE.z + 0.0009
        def tip_at(t):
            if t < 0.6: return Vector((NOTE.x - 0.003, NOTE.y + 0.003, paper_z + 0.0015)), False
            u = t - 0.6; line = int(u / 1.3) % 2; x = NOTE.x - 0.0030 + (u % 1.3) / 1.3 * 0.0042      # check 2: smaller strokes, two lines (reach)
            y = NOTE.y + 0.0015 - line * 0.0016; wig = 0.0004 * math.sin(u * 22)
            lift = 0.0006 if (u % 1.3) > 1.15 else 0.0
            return Vector((x, y + wig, paper_z + 0.00003 + lift)), lift == 0.0
        marks = []
        for fr in E.frames():
            t = fr / E.FPS
            tip, touch = tip_at(t)
            rig.solve(t, fr, (0, 0, -18), rig.from_prop("Right", pen_M(tip), C_PEN, G_PEN), RL)
            Mp = hand_M(ch, "Right") @ C_PEN; set_M(pencil, Mp, fr); a = Mp.translation
            if touch and abs(a.z - paper_z) < 0.0005: marks.append((t, Vector((a.x, a.y, paper_z + 0.00002))))
            if fr % 6 == 0: print("CONTACT D3 t=%.2f tip_to_paper %.4f tip_err %.4f" % (t, a.z - paper_z, (a - tip).length), flush=True)
        ch.finish(); E.constant(pencil)
        ink = E.mat("pencilMark", (0.15, 0.15, 0.18), 0.8)
        for (t, p) in marks[::1]:
            m = E.ball(p, 0.00017, ink, "mark"); m.scale = (1, 1, 0.2); E.show_between([m], t_on=t)
        aim = NOTE + Vector((0.004, 0.004, 0.012))
        cam_move(70, aim + Vector((0.05, -0.17, 0.08)), aim, aim + Vector((0.048, -0.165, 0.078)), aim, focus=NOTE)
    else:
        for fr in E.frames(): rig.body(fr / E.FPS, {}, (0, 0, -8))
        ch.finish()
        aim = Vector(CLOCK)
        cam_move(80, aim + Vector((-0.01, -0.16, 0.0)), aim, aim + Vector((-0.008, -0.15, 0.0)), aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False

view_report(SHOT, [("clock", CLOCK), ("head", lambda: wpt(ch, "Head"))])
print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
