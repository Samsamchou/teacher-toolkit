# World Routines Trip - Egypt station "I have breakfast at six thirty-five." (tabletop style H)
# blender -b --factory-startup --python egypt_breakfast.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: EG1 (5.6 s) wide, early-morning kitchen: the traveller asks; the boy stands at the right of the table and points at the
#             6:35 wall clock (top right) with his LEFT hand; window with a wooden lattice, palms and the pyramids outside; copper ful pot.
#         EG2 (4.5 s) seated close shot (legs hang down, feet on the floor): his RIGHT hand takes the half-round pocket bread with
#             ta'ameya from his plate (fingers touch it first) and holds it up in front of his chest ("ta'ameya"); the ful bowl on the
#             breakfast tray is in the picture at "ful".
#         EG3 (3.0 s) same camera: right hand brings the bread from the RIGHT side of his face to the right mouth corner, the top corner
#             touches the lips and only then the bread changes to the bitten one, two chewing nods; left hand flat on the table.
#         EG4 (7.6 s) bread back on the plate (released only on the plate), face to the camera, eyes and head a little to the
#             traveller, right hand waves; clock top right, pyramids in the window, ful pot on the counter.
#   Check cameras (same action, another camera; the first three letters pick the action):
#         EG2C EG3C close front-right, EG2S EG3S his right side
#         sharp hand cameras (no depth of field, long lens):
#           EG2HF EG2HS   bread grip and hold: front-3/4 and his right side, aimed between the plate and the chest hold
#           EG3HF EG3HS   bread to the mouth: front-3/4 and his right side, aimed between the chest hold and the mouth
#           EG3HL EG3HL2  his flat left hand: front-left and his left side
#           EG2L EG2L2    his legs on the seat: side at seat height / low front-left (never through the seat)
# Models: egypt_boy (rigged), traveler_girl, egypt_table_only (11/21: table with apron, no chair; levelled, top fitted to his seated
#   elbow; his chair is made in code with hands.build_code_chair), egypt_breakfast_set (round tray: ful bowl, flat breads, pickles; still), egypt_ful_pot (copper pot).
# Made here: the kitchen (sand plaster, lattice window, tiled floor, counter), outside (sand, date palms, pyramids, morning sky),
#   6:35 clock, his plate, the pocket bread with ta'ameya (whole and bitten).
# Hands: shared helpers from hands.py (PALM_SIGN right -1 / left +1, hand_frame, curl, ik_arm, key_hand, lerp_keys).
#   Props held in a hand are rigid to the hand bone (method of uk_homework.py): prop = hand_matrix @ C, C measured once with the
#   grip curled; the wanted prop pose gives the wanted hand pose; the prop is drawn from the hand that was actually reached.
#   The bread moves only after the hand touches it and stays in the hand until it touches the plate again.
# Measurement lines (kept by colab_run.py): DESK (furniture probe, fit, body, grip, reach, view), CONTACT (grab, bite, release).
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
# shot lengths and voice start times (seconds): keep in step with egypt_compose.py
DUR = {"EG1": 5.6, "EG2": 4.5, "EG3": 3.0, "EG4": 7.6}
VOICE = {"q": 0.4, "a": 2.6, "eat": 0.5, "a4": 1.2}
# word times inside the lines (audio/egypt_words.json): eat "ful" 0.60-1.02, "ta'ameya" 1.17-2.00; a "six thirty-five" 1.27-2.58
TAAMEYA0 = VOICE["eat"] + 1.17
CAMSUB = SHOT[3:] or "main"      # "" main / C close / S side / H.. sharp hand cameras
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
TX, TY = 0.0, 0.055              # table position (the boy sits on its +y side, facing the camera at -y)
WALL_Y = 0.246                   # back wall centre (front face at 0.240)
# --- body / furniture fit (GUESS: check DESK FIT / DESK SIT lines) ---
SEAT_HIP = env("SEAT_HIP", "0.0075")       # hips bone above the chair seat when sitting
ELBOW_DROP = env("ELBOW_DROP", "0.0005")   # table top this much below the hanging elbow
DESK_K = env("DESK_K", "1.0")              # extra scale on the fitted table
GAP = env("GAP", "0.0012")                 # tummy to table edge
LEAN = tuple(float(v) for v in os.environ.get("LEAN", "0,0,-8").split(","))   # lean forward over the table (Spine1 twist)
CLOCK_Z = env("CLOCK_Z", "0.122")
# --- small props (sized to the chibi hand: arms are only ~14 mm) ---
PLATE_R, PLATE_T = env("PLATE_R", "0.0050"), 0.0005
PLATE_DX = env("PLATE_DX", "-0.0010")      # plate centre from his centre (-x = his right: the bread hand side)
BREAD_R = env("BREAD_R", "0.0042")      # half-round pocket bread: radius (= its height)
BREAD_T = BREAD_R * 0.25                 # its thickness ~1/4 of its height (11/21: a flat pita pocket, not a bowl)
BITE_D = Vector((env("BITE_DX", "-0.0010"), env("BITE_DY", "-0.0004"), env("BITE_DZ", "-0.0002")))   # right mouth corner from the lips centre
TRAY_MAX = env("TRAY_MAX", "0.028")
NEED_W, NEED_D = env("NEED_W", "0.034"), env("NEED_D", "0.030")     # table footprint the props need (x, y); widened if smaller
KNEE_ROOM = env("KNEE_ROOM", "0.0012")     # table underside / apron above the top of his knees (teacher 11/21: >= 1 mm)
EYE_UP, EYE_SIDE = env("EYE_UP", "0.0045"), env("EYE_SIDE", "0.0018")   # GUESS: eyes above the lips centre / apart (face check only)
POT_H = env("POT_H", "0.030")
HEAD0 = (0, 0, -3)
HEAD_BITE = (0, -6, -6)          # (roll, yaw, pitch): yaw < 0 turns to his right (towards the bread), pitch < 0 bows
X_MOUTH = Vector((0.80, 0.0, 0.60)).normalized()      # bread's top edge at the mouth: rising from his right hand to the corner at the lips
Z_MOUTH = Vector((-0.60, 0.12, 0.80)).normalized()


# ---------- generic helpers (from uk_homework.py / spain_dinner.py) ----------
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


def blend_M(M0, M1, u):
    u = E.ease(u)
    q0 = M0.to_3x3().normalized().to_quaternion(); q1 = M1.to_3x3().normalized().to_quaternion()
    if q0.dot(q1) < 0: q1.negate()                 # 11/21: always the short way round (no extra half / full turn of the wrist)
    q = q0.slerp(q1, u)
    M = q.to_matrix().to_4x4(); M.translation = M0.translation.lerp(M1.translation, u); return M


def key_M(keys, t):
    """keys: [(time, matrix), ...] -> eased blend of the two keys around t."""
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


def set_M(ob, M, fr):
    ob.matrix_world = M; ob.scale = (1, 1, 1); key_obj(ob, fr, rot=True)


def hide(objs):
    for o in objs:
        for c in [o] + list(o.children_recursive): c.hide_render = True


def view_report(tag, pts):
    """Where things land in the camera frame at frame 0 (x 0 left .. 1 right, y 0 bottom .. 1 top)."""
    from bpy_extras.object_utils import world_to_camera_view as w2c
    sc.frame_set(0); bpy.context.view_layer.update()
    for name, p in pts:
        v = w2c(sc, sc.camera, Vector(p() if callable(p) else p))
        print("DESK VIEW %s %s x %.3f y %.3f depth %.3f" % (tag, name, v.x, v.y, v.z), flush=True)


def prism(name, pts, z0, z1, m):
    """Flat solid from a 2D outline (x, y) between heights z0 and z1 (local coordinates)."""
    n = len(pts)
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); me.materials.append(m)
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    bv = ob.modifiers.new("bv", "BEVEL"); bv.width = 0.00015; bv.segments = 2; bv.limit_method = "ANGLE"
    return ob


# ---------- the kitchen ----------
def room(win_x):
    """Early-morning kitchen corner, cut open like a doll's house: sand plaster, tiled floor, a window with a wooden lattice."""
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("floorTiles", (0.80, 0.72, 0.58)), "floor", thick=FLOOR)
    grout = E.mat("grout", (0.55, 0.46, 0.34), 0.9); dot = E.mat("tileDot", (0.30, 0.42, 0.55), 0.6)
    for i in range(1, 22):
        E.box((-0.32 + i * 0.029, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), grout, "tileX", bevel=0)
    for j in range(1, 15):
        E.box((0, -0.19 + j * 0.029, FLOOR + 0.0002), (0.64, 0.0008, 0.0004), grout, "tileY", bevel=0)
    for i in range(1, 22):
        for j in range(1, 15):
            if (i + j) % 2 == 0:
                d = E.box((-0.32 + i * 0.029, -0.19 + j * 0.029, FLOOR + 0.0002), (0.006, 0.006, 0.0004), dot, "tileDiamond", bevel=0)
                d.rotation_euler = (0, 0, math.radians(45))
    wall = E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("sandPlaster", (0.86, 0.74, 0.55)), "backWall")
    wz0, wz1, ww = FLOOR + 0.050, FLOOR + 0.150, 0.085
    cut = E.box((win_x, WALL_Y, (wz0 + wz1) / 2), (ww, 0.05, wz1 - wz0), E.mat("cutter", (0, 0, 0), 0.5), "winCut", bevel=0)
    mod = wall.modifiers.new("win", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut
    cut.hide_render = True; cut.display_type = "WIRE"
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", (0.84, 0.72, 0.54)), "sideWall")
    E.box((0, 0.2385, FLOOR + 0.006), (0.64, 0.003, 0.012), E.felt("skirting", (0.55, 0.36, 0.22)), "skirting", bevel=0)
    # mashrabiya-style wooden lattice in the window: frame, a grid of thin bars with little turned beads at the crossings
    wood = E.mat("lattice", (0.36, 0.20, 0.10), 0.55)
    zc = (wz0 + wz1) / 2; hh = wz1 - wz0
    for (x, z, sx, sz) in ((win_x - ww / 2 + 0.003, zc, 0.006, hh), (win_x + ww / 2 - 0.003, zc, 0.006, hh),
                           (win_x, wz1 - 0.003, ww, 0.006), (win_x, wz0 + 0.003, ww, 0.006)):
        E.box((x, 0.243, z), (sx, 0.012, sz), wood, "winFrame", bevel=0.0005)
    n = 7
    for k in range(1, n):
        E.box((win_x - ww / 2 + k * ww / n, 0.2455, zc), (0.0012, 0.002, hh - 0.01), wood, "latticeV", bevel=0)
        E.box((win_x, 0.2455, wz0 + k * hh / n), (ww - 0.01, 0.002, 0.0012), wood, "latticeH", bevel=0)
        for j in range(1, n):
            E.ball((win_x - ww / 2 + k * ww / n, 0.2448, wz0 + j * hh / n), 0.0014, wood, "latticeBead")
    E.box((win_x, 0.236, wz0 - 0.002), (ww + 0.014, 0.012, 0.004), E.felt("sill", (0.92, 0.86, 0.72)), "winSill", bevel=0.0005)


def palm_tree(x, y, h, seed):
    trunk_m = E.felt("palmTrunk", (0.45, 0.32, 0.20)); leaf_m = E.felt("palmLeaf", (0.20, 0.42, 0.16))
    for k in range(8):           # a ringed trunk, a little bent
        E.cyl((x + 0.002 * math.sin(k * 0.5 + seed), y, FLOOR + h * (k + 0.5) / 8), 0.0032 - 0.0001 * k, h / 8 * 0.95, trunk_m, verts=10, name="palmTrunk")
    top = Vector((x + 0.002 * math.sin(4 + seed), y, FLOOR + h))
    for j in range(9):           # fronds: thin flat boxes drooping out from the top
        a = math.radians(j * 40 + seed * 17)
        d = Vector((math.cos(a), math.sin(a) * 0.6, -0.35)).normalized()
        L = 0.034
        lf = E.box(top + d * L / 2, (0.006, 0.0008, L), leaf_m, "palmLeaf", bevel=0)
        lf.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
    for j in range(4):
        E.ball(top + Vector((0.002 * math.cos(j * 1.6), 0.002 * math.sin(j * 1.6), -0.004)), 0.0018, E.felt("dates", (0.50, 0.22, 0.08)), "dates")


def pyramid(x, y, size):
    p = E.cone((x, y, FLOOR + size * 0.32), size * 0.71, 0.0, size * 0.64, E.felt("pyramidStone", (0.86, 0.68, 0.42)), verts=4, name="pyramid")
    p.rotation_euler = (0, 0, math.radians(45))
    return p


def outside(win_x):
    # everything stays in front of the engine's dark backdrop wall (y 0.84 .. 0.86)
    E.box((0, 0.54, FLOOR - 0.004), (1.4, 0.58, 0.008), E.felt("sand", (0.88, 0.72, 0.48)), "sand", bevel=0)
    palm_tree(win_x - 0.03, 0.33, 0.085, 1); palm_tree(win_x + 0.035, 0.37, 0.075, 2); palm_tree(win_x - 0.075, 0.40, 0.07, 3)
    pyramid(win_x + 0.02, 0.68, 0.13); pyramid(win_x - 0.09, 0.72, 0.10); pyramid(win_x + 0.13, 0.74, 0.07)
    E.box((0, 0.830, 0.07), (1.6, 0.004, 0.14), E.emission("dawnLow", (1.0, 0.62, 0.34), 1.6), "skyLow", bevel=0)
    E.box((0, 0.834, 0.30), (1.6, 0.004, 0.36), E.emission("dawnHigh", (0.98, 0.80, 0.62), 1.3), "skyHigh", bevel=0)
    E.ball((win_x + 0.06, 0.815, FLOOR + 0.05), 0.012, E.emission("sunDisc", (1.0, 0.85, 0.55), 6.0), "sunDisc")


def counter(cx):
    """Kitchen counter against the back wall under the clock, with the copper ful pot on it."""
    ch_ = 0.042
    E.box((cx, 0.222, FLOOR + ch_ / 2), (0.075, 0.034, ch_), E.felt("counterFront", (0.82, 0.88, 0.90)), "counter", bevel=0.0008)
    E.box((cx, 0.221, FLOOR + ch_ + 0.0018), (0.079, 0.037, 0.0036), E.wood(), "counterTop", bevel=0.0005)
    for k in (-1, 1):
        E.box((cx + k * 0.018, 0.2045, FLOOR + ch_ * 0.5), (0.030, 0.0012, ch_ * 0.75), E.felt("cupboard", (0.20, 0.42, 0.55)), "cupboard", bevel=0.0004)
    top = FLOOR + ch_ + 0.0036
    if os.path.exists(f"{PROPS}/egypt_ful_pot.glb"):
        p = E.place(f"{PROPS}/egypt_ful_pot.glb", POT_H, (cx + 0.010, 0.222, top))
        bpy.context.view_layer.update()
        print("DESK FULPOT bbox %s" % (tuple(round(v, 4) for v in E._bbox(p)),), flush=True)
    E.cyl((cx - 0.020, 0.222, top + 0.003), 0.004, 0.006, E.mat("jarBlue", (0.15, 0.32, 0.62), 0.4), verts=20, name="spiceJar")
    return top


def clock(cx, cy, cz, hh, mm):
    """Round wall clock (ticks only, no numbers): hour hand (hh + mm/60) * 30 deg, minute hand mm * 6 deg. Brass rim."""
    E.cyl((cx, cy, cz), 0.026, 0.006, E.mat("clockRim", (0.72, 0.50, 0.16), 0.3), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0025, cz), 0.0225, 0.004, E.mat("clockFace", (0.98, 0.97, 0.93), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.08, 0.08, 0.12), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.019 * math.sin(a), cy - 0.005, cz + 0.019 * math.cos(a)), 0.0016 if big else 0.0009, ink, "tick")
    hand_box(cx, cy - 0.0052, cz, math.radians(((hh % 12) + mm / 60) * 30), 0.011, 0.0026, ink, "hourHand")
    hand_box(cx, cy - 0.0058, cz, math.radians(mm * 6), 0.0165, 0.0017, ink, "minuteHand")
    E.ball((cx, cy - 0.006, cz), 0.0018, E.mat("clockPin", (0.75, 0.16, 0.14), 0.4), "clockPin")


# ---------- table-only Tripo model (11/21): the old table+chair models were fused (backrest through the top, Egypt tilted 4.3 deg);
#            the chairs are now made in code. Level the table, measure its top / legs / underside, fit the top to the seated elbow. ----------
def bbox2(g):
    return (min(p[0] for p in g), max(p[0] for p in g), min(p[1] for p in g), max(p[1] for p in g))


def measure_table(root, n=48, label="table"):
    """Rays straight down -> the table-top level and its box (the biggest flat level in the upper 40 % of the model);
    low vertices -> the four legs (x0, x1, y0, y1 each); vertices just under the top along the back (+y) edge and the +x end
    -> the underside or apron bottom there (room for knees)."""
    bpy.context.view_layer.update()
    vs = H._mesh_world_verts(root)
    zmin = min(w.z for w in vs); x0, x1, y0, y1, zmax = E._bbox(root); h = zmax - zmin
    dg = bpy.context.evaluated_depsgraph_get(); hits = []
    for i in range(n + 1):
        for j in range(n + 1):
            x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * j / n
            ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((x, y, zmax + 0.05)), Vector((0, 0, -1)), distance=1.0)
            if ok and nrm.z > 0.7 and loc.z > zmin + 0.6 * h: hits.append((x, y, loc.z))
    if not hits:
        print("DESK WARN %s: no table top found by the rays, using the bounding box" % label, flush=True)
        hits = [(x0, y0, zmax), (x1, y1, zmax)]
    bins = {}
    for p in hits: bins.setdefault(int((p[2] - zmin) / (0.01 * h)), []).append(p)
    best = max(bins, key=lambda b: len(bins.get(b - 1, [])) + len(bins[b]) + len(bins.get(b + 1, [])))
    g = bins.get(best - 1, []) + bins[best] + bins.get(best + 1, [])
    zs = sorted(p[2] for p in g); top = zs[int(len(zs) * 0.9)]
    box = bbox2([p for p in g if abs(p[2] - top) < 0.012 * h] or g)
    cx, cy = (box[0] + box[1]) / 2, (box[2] + box[3]) / 2; w, d = box[1] - box[0], box[3] - box[2]
    low = [v for v in vs if v.z < zmin + 0.25 * h]; legs = []
    for sy in (-1, 1):
        for sx in (-1, 1):
            q = [v for v in low if (v.x - cx) * sx > 0 and (v.y - cy) * sy > 0]
            if q: legs.append((min(v.x for v in q), max(v.x for v in q), min(v.y for v in q), max(v.y for v in q)))
    mid = [v for v in vs if zmin + 0.4 * h < v.z < top - 0.004 * h]          # under the top surface, above mid-leg
    ub = [v.z for v in mid if v.y > box[3] - 0.15 * d and abs(v.x - cx) < 0.3 * w]
    ue = [v.z for v in mid if v.x > box[1] - 0.15 * w and abs(v.y - cy) < 0.3 * d]
    info = dict(top=top, zmin=zmin, h=h, box=box, legs=legs, under_back=min(ub) if ub else top - 0.1 * h, under_end=min(ue) if ue else top - 0.1 * h)
    print("DESK TABLE %s top %.4f base %.4f top_box %s legs %s underside at the back edge %.4f at the +x end %.4f" % (
        label, top, zmin, tuple(round(v, 4) for v in box), [tuple(round(v, 4) for v in l) for l in legs], info["under_back"], info["under_end"]), flush=True)
    return info


def probe_table(path, H0=0.1):
    """Place the model at height H0 away from the set, level it, measure: top-height ratio and footprint; turn it so its long side is along x."""
    root = E.place(path, H0, (5, 5, 0)); bpy.context.view_layer.update()
    zt = E._bbox(root)[4]
    level_model(root, 0.7 * zt, zt + 0.01, 0.0, name=os.path.basename(path) + " probe")
    m = measure_table(root, label="probe")
    b = m["box"]; long_x = (b[1] - b[0]) >= (b[3] - b[2]) * 0.98
    info = dict(H0=H0, rd=(m["top"] - m["zmin"]) / H0, w=b[1] - b[0], d=b[3] - b[2], rot=0.0 if long_x else math.pi / 2)
    if not long_x: info["w"], info["d"] = info["d"], info["w"]
    drop(root)
    return info


def fit_table(path, info, top_z, need_w, need_d, label):
    """Table top exactly at top_z (the seated pupil's elbow): uniform scale from the measured top ratio; if the footprint is then too
    small for the props, widen x and y only (height kept). Then level it, stand it on the floor and measure it."""
    S = (top_z - FLOOR) / info["rd"]; k = S / info["H0"]
    w, d = info["w"] * k, info["d"] * k
    f = max(1.0, need_w / max(1e-6, w), need_d / max(1e-6, d))
    root = E.place(path, S, (TX, TY, FLOOR), rot_z=info["rot"])
    if f > 1.0001:
        root.scale = (root.scale[0] * f, root.scale[1] * f, root.scale[2])
    print("DESK TABLE %s %s: model height %.4f, footprint %.4f x %.4f (props need %.4f x %.4f), turn %d deg" % (
        label, "uniform scale" if f <= 1.0001 else "footprint widened x%.2f, height kept for the elbow" % f, S, w * f, d * f, need_w, need_d,
        round(math.degrees(info["rot"]))), flush=True)
    bpy.context.view_layer.update()
    zt = E._bbox(root)[4]
    level_model(root, FLOOR + 0.7 * (zt - FLOOR), zt + 0.01, FLOOR, name=label)
    m = measure_table(root, label=label)
    if abs(m["top"] - top_z) > 0.0006: print("DESK WARN %s top %.4f but wanted %.4f (seated elbow)" % (label, m["top"], top_z), flush=True)
    return root, m


def pupil_chair(x_c, hy, M, seat_z, TM, name, **cols):
    """Code chair behind the table for a pupil facing the camera (-y): seat top = seat_z, front edge 2.5 mm behind the knees,
    backrest at +y; narrowed to pass between the table's back legs when its front reaches under the table. Returns (front, back, width)."""
    front = hy - M["thigh"] + 0.0025; depth = max(0.016, M["thigh"] + 0.007)
    width = min(0.028, max(0.020, 2 * M["sh_half"] + 0.008))
    cy = (TM["box"][2] + TM["box"][3]) / 2
    back_legs = sorted([l for l in TM["legs"] if (l[2] + l[3]) / 2 > cy], key=lambda l: l[0])
    if len(back_legs) == 2 and front < max(l[3] for l in back_legs) + 0.0005:
        gap = back_legs[1][0] - back_legs[0][1]
        if width > gap - 0.002:
            print("DESK WARN %s narrowed from %.4f to %.4f to pass between the table's back legs" % (name, width, max(0.012, gap - 0.002)), flush=True)
            width = max(0.012, gap - 0.002)
    f, b = build_code_chair(x_c, front, seat_z, width, FLOOR, depth=depth, name=name, **cols)
    return f, b, width


def leg_top_under(ch, y_max, x_c, half):
    """Highest point of the posed thigh / knee skin (vertices weighted mostly to the leg bones) in front of y_max (= under the table)."""
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); best = None
    for o in ch.meshes:
        legs = {g.index for g in o.vertex_groups if "UpLeg" in g.name or g.name.split(":")[-1] in ("RightLeg", "LeftLeg")}
        if not legs: continue
        src = o.data.vertices; oe = o.evaluated_get(dg); me = oe.to_mesh(); Mw = oe.matrix_world
        if len(me.vertices) == len(src):
            for v in me.vertices:
                if sum(g.weight for g in src[v.index].groups if g.group in legs) < 0.5: continue
                w = Mw @ v.co
                if w.y < y_max and abs(w.x - x_c) < half: best = w.z if best is None else max(best, w.z)
        oe.to_mesh_clear()
    return best


def knee_room(label, knee_top, under_z):
    room = under_z - knee_top
    print("DESK LEGS %s knee top ~%.4f, table underside / apron above the knees %.4f, room %.4f %s" % (
        label, knee_top, under_z, room, "" if room > 0.0005 else "WARN knees may touch the table"), flush=True)
    return room


# ---------- characters ----------
_MOUTH_REF = H._MOUTH_REF      # metrics() measures the lips into the shared dict; hands.mouth() then uses it


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
# pocket bread, held like half a sandwich (storyboard 11/20): hand on the bread's right edge, palm towards his middle and a little up;
# four fingers on the camera side holding it from below, thumb on the chest side; opening on top
G_BREAD = {"Thumb": (22, 16, 8), "Index": (30, 38, 24), "Middle": (32, 40, 26), "Ring": (36, 42, 26), "Pinky": (40, 42, 26)}
G_BREAD_OPEN = {"Thumb": (10, 8, 4), "Index": (12, 15, 10), "Middle": (14, 16, 10), "Ring": (16, 18, 12), "Pinky": (18, 18, 12)}

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


def wpt(ch, bone, tail=False):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ (ch.pb[bone].tail if tail else ch.pb[bone].head)


def world_vec(ch, v):
    return (ch.arm.matrix_world.to_3x3().normalized() @ v).normalized()


def tblend(a, b, u):
    """Blend two hand targets (q, wrist, grip, pole)."""
    u = E.ease(u)
    return (a[0].slerp(b[0], u), a[1].lerp(b[1], u), {f: tuple(x + (y - x) * u for x, y in zip(a[2][f], b[2][f])) for f in FINGERS}, a[3].lerp(b[3], u))


class Sit:
    """A seated character: hips on the seat, thighs forward, shins straight down to the floor, spine lean, head twist;
    arms by two-bone IK, hands turned and fingers curled."""

    def __init__(self, ch, M, hips_xy, seat_z, lean, face_deg):
        self.ch, self.M, self.lean = ch, M, lean
        off = M["hips"] - M["root"]
        ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y, seat_z + SEAT_HIP - M["hip_h"]))
        hipj = seat_z + SEAT_HIP + M["upleg_dz"]; dz = (FLOOR + M["knee_h"]) - hipj
        dz = max(-0.95 * M["thigh"], min(0.7 * M["thigh"], dz)); hz = math.sqrt(max(1e-12, M["thigh"] ** 2 - dz * dz))
        self.legs = {"RightUpLeg": (-0.12 * M["thigh"], -hz, dz), "LeftUpLeg": (0.12 * M["thigh"], -hz, dz), "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)}
        a = math.radians(face_deg); c, s = math.cos(a), math.sin(a)
        self.rz = lambda v: Vector((v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]))
        self.pole = {"Right": self.rz((-0.7, 0.4, -1.0)), "Left": self.rz((0.7, 0.4, -1.0))}       # elbows out, back and down
        self.hips_xy = hips_xy

    def body(self, t, arm_dirs, head):
        """Legs + spine lean + head first, then the arms (so arm IK sees the leaning shoulders)."""
        ch = self.ch
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
        """A hand lying flat (palm down) with its palm centre on world point P."""
        f = Vector(fwd).normalized()
        return (hand_q(self.ch, side, f, Vector(palm)), Vector(P) - f * (self.M["hand"] * 0.55) + Vector((0, 0, 0.0014)), grip or G_FLAT, self.pole[side].copy())

    def from_prop(self, side, Md, C, grip):
        Mh = Md @ C.inverted()
        return (Mh.to_3x3().normalized().to_quaternion(), Mh.translation.copy(), grip, self.pole[side].copy())

    def calibrate(self, side, q, grip, head):
        """Pose a hand (rotation q, fingers curled) on a scratch pose; returns its world matrix."""
        self.body(0, P_LAP, head); set_hand_rot(self.ch, side, q); curl(self.ch, side, grip)
        return hand_M(self.ch, side)

    def solve(self, t, fr, head, tr, tl, extra=None):
        """tr / tl: hand targets (q, wrist, grip, pole) or None when extra gives that arm's directions."""
        ch = self.ch
        self.body(t, P_LAP, head)
        arms = {}
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            arms.update(ik_arm(ch, side, g[1], g[3]))
            if fr % 12 == 0: print("DESK REACH %s %s t=%.2f need %.4f arm %.4f" % ((ch.name, side, t) + ik_arm.last), flush=True)
        if extra: arms.update(extra)
        self.body(t, arms, head)
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            turn_hand(ch, side, g[0], fr); curl(ch, side, g[2]); key_hand(ch, side, fr)


TWIST_MAX = math.radians(env("TWIST_MAX", "110"))      # forearm roll limit (pronation / supination)


def turn_hand(ch, side, q, fr):
    """11/21 (SP2 f0074 corkscrew wrist): the IK aims the forearm with the shortest swing only, so its roll is arbitrary and the whole
    hand roll ended up in the wrist skin. Split the hand target into swing + twist about the forearm axis, give the twist to the forearm
    (pronation / supination: turning about its own axis does not move the wrist), then set the hand. Call right after the arms are aimed
    (hand bones still at rest). Prints DESK TWIST; WARN when the forearm roll or what is left in the wrist is large."""
    bpy.context.view_layer.update()
    Ar = ch.arm.matrix_world.to_3x3().normalized()
    pf = ch.pb[side + "ForeArm"]
    axis_w = (Ar @ pf.matrix.to_3x3().col[1]).normalized()
    Hc = (Ar @ ch.pb[side + "Hand"].matrix.to_3x3()).normalized()
    D = (q.to_matrix() @ Hc.inverted()).to_quaternion()
    if D.w < 0: D.negate()
    th = 2.0 * math.atan2(Vector((D.x, D.y, D.z)).dot(axis_w), D.w)   # mathutils Quaternion has no .vector (11/21 crash)
    th = (th + math.pi) % (2 * math.pi) - math.pi
    use = max(-TWIST_MAX, min(TWIST_MAX, th))
    if abs(use) > 1e-4:
        rot_bone(ch, side + "ForeArm", (Ar.inverted() @ axis_w).normalized(), use)
        pf.keyframe_insert("rotation_quaternion", frame=fr)
    set_hand_rot(ch, side, q)
    left = math.degrees(th - use)
    if fr % 12 == 0 or abs(math.degrees(use)) > 100 or abs(left) > 45:
        print("DESK TWIST %s %s fr %d forearm_roll %.0f deg wrist_left %.0f deg %s" % (
            ch.name, side, fr, math.degrees(use), left, "WARN" if abs(math.degrees(use)) > 100 or abs(left) > 45 else ""), flush=True)


def wave_dirs(t):
    """Right arm waving (upper arm out to the right, forearm up), two positions, 3 per second."""
    return {b: v for b, v in E.P_wave(int(t * 3) % 2).items() if b.startswith("Right")}


def blend_dirs(a, b, u):
    u = E.ease(u)
    return {k: tuple(Vector(a[k]).normalized().lerp(Vector(b[k]).normalized(), u).normalized()) for k in b}


def make_plate(c, r, name):
    china = E.mat("china", (0.96, 0.95, 0.92), 0.3)
    E.cyl((c.x, c.y, c.z + PLATE_T / 2), r, PLATE_T, china, verts=40, name=name)
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.93, minor_radius=0.00022, major_segments=40, minor_segments=6, location=(c.x, c.y, c.z + PLATE_T))
    rim = bpy.context.object; rim.name = name + "Rim"; rim.data.materials.append(china)
    E.cyl((c.x, c.y, c.z + PLATE_T + 0.00002), r * 0.6, 0.00003, E.mat("plateBand", (0.10, 0.30, 0.65), 0.35), verts=40, name=name + "Band")


def bread_outline(bitten):
    """Half-round pocket bread in its own x-z plane: straight opening edge on top (z = 0) from -R to +R, round bottom.
    The bitten one has a round bite out of the +x top corner (the corner that goes to his lips)."""
    r = BREAD_R
    top = [(-r + 2 * r * k / 16, 0.0) for k in range(17)]
    arc = [(r * math.cos(math.pi * k / 40), -r * math.sin(math.pi * k / 40)) for k in range(1, 40)]
    pts = top + arc
    if not bitten: return pts
    c, rb = (0.95 * r, -0.0003), 0.0017
    inside = [math.hypot(p[0] - c[0], p[1] - c[1]) < rb for p in pts]
    if not any(inside): return pts
    i0 = inside.index(True); i1 = len(inside) - 1 - inside[::-1].index(True)
    pa, pb = pts[i0 - 1], pts[(i1 + 1) % len(pts)]
    ta = math.atan2(pa[1] - c[1], pa[0] - c[0]); tb = math.atan2(pb[1] - c[1], pb[0] - c[0])
    if tb < ta: tb += 2 * math.pi
    notch = [(c[0] + rb * math.cos(ta + (tb - ta) * k / 10), c[1] + rb * math.sin(ta + (tb - ta) * k / 10)) for k in range(1, 10)]
    return pts[:i0] + notch + pts[i1 + 1:]


def make_bread(bitten):
    """Flat half-moon pita pocket (11/21: the old one read as a white bowl): golden-tan crust (LINEAR colours), a few darker toasted
    spots on both faces, rim thickness ~1/4 of its height with a slight puff in the middle; the straight cut edge faces up with a dark
    opening, ta'ameya and greens peeking out. Empty at the middle of the top edge; local x along the top edge (towards the corner he
    bites), local z up (the opening), local y through the bread (+y = his chest side). The bitten one has the same look, minus a corner."""
    name = "breadBitten" if bitten else "bread"
    emp = E.empty(name); emp.rotation_mode = "XYZ"
    crust = E.mat("pitaCrust", (0.72, 0.37, 0.11), 0.85); toast = E.mat("pitaToast", (0.26, 0.09, 0.017), 0.9)
    hole = E.mat("pitaOpening", (0.05, 0.022, 0.008), 0.9); fal = E.mat("taameyaLin", (0.15, 0.11, 0.017), 0.8)
    green = E.mat("greensLin", (0.10, 0.34, 0.033), 0.7); tomato = E.mat("tomatoLin", (0.60, 0.03, 0.02), 0.5)
    pts = bread_outline(bitten)
    n = len(pts); hr, hc = 0.40 * BREAD_T, 0.65 * BREAD_T             # half thickness at the rim / at the puffed middle
    cx, cz = 0.0, -0.42 * BREAD_R
    verts = [(x, -hr, z) for x, z in pts] + [(x, hr, z) for x, z in pts] + [(cx, -hc, cz), (cx, hc, cz)]
    cf, cb = 2 * n, 2 * n + 1
    faces = [(cf, (i + 1) % n, i) for i in range(n)] + [(cb, n + i, n + (i + 1) % n) for i in range(n)] + \
            [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me = bpy.data.meshes.new(name + "Mesh"); me.from_pydata(verts, [], faces); me.update(); me.materials.append(crust)
    for poly in me.polygons: poly.use_smooth = True
    body = bpy.data.objects.new(name + "Body", me); sc.collection.objects.link(body)
    bv = body.modifiers.new("bv", "BEVEL"); bv.width = 0.00018; bv.segments = 2; bv.limit_method = "ANGLE"
    parts = [body,
             E.box(((-0.19 * BREAD_R if bitten else 0), 0, 0.00002), (2 * BREAD_R * (0.64 if bitten else 0.84), 1.1 * hr, 0.00030), hole, name + "Opening", bevel=0),   # stops short of the bite
             E.ball((-0.0013, 0, 0.00028), 0.00062, fal, name + "Taameya1"),
             E.box(((-0.0004 if bitten else -0.0001), 0, 0.00030), (2 * BREAD_R * 0.55, 0.8 * hr, 0.00055), green, name + "Greens", bevel=0.0001),
             E.ball((0.0004, 0.0001, 0.00034), 0.00028, tomato, name + "Tomato")]
    if not bitten: parts.append(E.ball((0.0012, 0, 0.00026), 0.00060, fal, name + "Taameya2"))
    ym = (hr + hc) / 2 + 0.00002
    for k, (sx, sz) in enumerate(((-0.0022, -0.0012), (-0.0006, -0.0026), (0.0012, -0.0015), (-0.0016, -0.0030), (0.0019, -0.0027))):
        for s in (-1, 1):
            sp = E.ball((sx + 0.0003 * s * (k % 2), s * ym, sz + 0.0002 * s), 0.00034, toast, name + "Toast")
            sp.scale = (1.0, 0.18, 0.7)
            parts.append(sp)
    for o in parts: o.parent = emp
    return emp


# ================= build =================
seated = SHOT != "EG1"
BOY_F = 0 if seated else -25
ch = E.Char("egypt_boy", (0.30, -0.15), BOY_F, height=PUPIL)          # placed properly below, after the table is fitted to him
M_ = metrics(ch)
# thighs ON the seat, not through it (UK 11/20): measured on the deformed mesh, overrides the fixed SEAT_HIP guess
SEAT_UNDER = seat_under(ch, M_["thigh"]) - 0.0010
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
e_el = SEAT_HIP + M_["sh_hips"] - M_["upper"] - ELBOW_DROP          # his elbow above the seat when sitting
seat_feet = M_["knee_h"] - SEAT_HIP - M_["upleg_dz"]                 # = knee height - thigh depth: feet flat on the floor
SEAT_Z = FLOOR + seat_feet
TOP_WANT = SEAT_Z + e_el * DESK_K
# 11/21: table-only Tripo model (the old egypt_table_chair was tilted 4.3 deg with the chair fused into the top); its top at his
# seated elbow (teacher check EG2HF/HS f0018: with the top at the chest the reaching hand covered his mouth)
TI = probe_table(f"{PROPS}/egypt_table_only.glb")
desk_root, TM = fit_table(f"{PROPS}/egypt_table_only.glb", TI, TOP_WANT, NEED_W, NEED_D, "egypt_table")
# 11/21 (same as spain_dinner.py, teacher agreed): feet on the floor fix the knee joint at floor + shin length and the chibi thigh is
# thicker than the elbow-to-seat gap, so a table at the elbow cannot clear the knees (Spain: room -3.8 mm). Raise the table JUST enough
# that the underside / apron clears the top of the knees by KNEE_ROOM. Sitting back instead would put the plate out of reach.
KNEE_TOP = FLOOR + M_["knee_h"] + SEAT_UNDER + 0.001                  # knee joint + thigh depth (same mesh depth as under the hip)
_room = TM["under_back"] - KNEE_TOP
if _room < KNEE_ROOM:
    _slab = (TM["top"] - TM["under_back"]) / max(1e-6, TM["top"] - FLOOR)        # top + apron depth, as a share of the table height
    top2 = (KNEE_TOP + KNEE_ROOM - _slab * FLOOR) / (1.0 - _slab) + 0.0002
    print("DESK FIT table raised from the elbow %.4f to %.4f (above floor) so the knees fit under it (room was %.4f, want %.4f)" % (
        TM["top"] - FLOOR, top2 - FLOOR, _room, KNEE_ROOM), flush=True)
    drop(desk_root)
    desk_root, TM = fit_table(f"{PROPS}/egypt_table_only.glb", TI, top2, NEED_W, NEED_D, "egypt_table")
E.obstacle(desk_root)
TOP = TM["top"]; DBOX = TM["box"]; DB = DBOX[3]
x_c = (DBOX[0] + DBOX[1]) / 2
_lean = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
HY = DB + M_["front"] + GAP + _lean                                     # his hips: tummy just behind the table's back edge
SEAT_FRONT, SEAT_BACK, CH_W = pupil_chair(x_c, HY, M_, SEAT_Z, TM, "hisChair")
SBOX = (x_c - CH_W / 2, x_c + CH_W / 2, SEAT_FRONT, SEAT_BACK)
if HY + 0.004 > SEAT_BACK: print("DESK WARN his bottom may touch the chair back: hips %.4f seat back %.4f" % (HY, SEAT_BACK), flush=True)
print("DESK FIT elbow_above_seat %.4f seat_for_feet %.4f -> seat %.4f table top wanted %.4f got %.4f (above floor) table %s seat %s hips_y %.4f" % (
    e_el, seat_feet, SEAT_Z - FLOOR, TOP_WANT - FLOOR, TOP - FLOOR, tuple(round(v, 4) for v in DBOX), tuple(round(v, 4) for v in SBOX), HY), flush=True)
knee_room("boy", KNEE_TOP, TM["under_back"])     # the apron edge over his knees

# ---------- layout on the table (from his seated centre and the table edge on his side) ----------
PL = Vector((x_c + PLATE_DX, DB - PLATE_R - 0.0007, TOP))
L_PT = Vector((PL.x + PLATE_R + 0.0030, DB - 0.0026, TOP))
ZB = Vector((0, 0.17, 1)).normalized()                  # the bread leans back a little on the plate (opening up)
B_PLATE = frame_M(PL + Vector((0, 0.0004, PLATE_T + BREAD_R * ZB.z + BREAD_T / 2 * ZB.y + 0.00005)), ZB, Vector((1, 0, 0)))
if DBOX[0] > PL.x - PLATE_R - 0.007 or DBOX[1] < L_PT.x + 0.004:
    print("DESK WARN table too narrow for bread hand / left hand: table x %.4f..%.4f need %.4f..%.4f" % (DBOX[0], DBOX[1], PL.x - PLATE_R - 0.007, L_PT.x + 0.004), flush=True)
# the breakfast tray (ful, flat breads, pickles) in front of his plate, as big as the table allows
ax0, ax1 = DBOX[0] + 0.002, DBOX[1] - 0.002
ay0, ay1 = DBOX[2] + 0.002, PL.y - PLATE_R - 0.0015
TRAY_D = max(0.012, min(TRAY_MAX, ax1 - ax0, ay1 - ay0))
TRAY_AT = ((ax0 + ax1) / 2, (ay0 + ay1) / 2)
tray_root = None
if os.path.exists(f"{PROPS}/egypt_breakfast_set.glb"):
    tray_root = E.place(f"{PROPS}/egypt_breakfast_set.glb", TRAY_D, (TRAY_AT[0], TRAY_AT[1], TOP + 0.0002), axis="long")
print("DESK BREAKFASTSET size %.4f at %s (free x %.4f..%.4f y %.4f..%.4f)" % (TRAY_D, tuple(round(v, 4) for v in TRAY_AT), ax0, ax1, ay0, ay1), flush=True)
WIN_X = x_c - 0.045
CLOCK = (x_c + 0.072, 0.238, FLOOR + CLOCK_Z)

room(WIN_X); outside(WIN_X); clock(CLOCK[0], CLOCK[1], CLOCK[2], 6, 35)
COUNTER_X = x_c + 0.088
counter(COUNTER_X)
L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.6"))
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); frontl = bpy.context.object      # soft morning light from the front
frontl.data.energy = env("FRONT", "2.2"); frontl.data.color = (1, 0.92, 0.80); frontl.data.size = 0.5; frontl.rotation_euler = (math.radians(25), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.42, 0.25)); outl = bpy.context.object        # lights the palms and the pyramids
outl.data.energy = env("OUT", "3.0"); outl.data.color = (1, 0.82, 0.62); outl.data.size = 0.4; outl.rotation_euler = (math.radians(70), 0, 0)
bpy.ops.object.light_add(type="SUN", location=(0, 0.5, 0.6)); sun = bpy.context.object                # low warm 6:35 sun through the window
sun.data.energy = env("SUN", "1.0"); sun.data.color = (1, 0.80, 0.55); sun.data.angle = math.radians(3); sun.rotation_euler = (math.radians(-35), math.radians(10), 0)

make_plate(PL, PLATE_R, "hisPlate")
bread = make_bread(False); bitten = make_bread(True)
set_M(bread, B_PLATE, 0); set_M(bitten, B_PLATE, 0)
CORNER = Vector((BREAD_R * 0.95, 0, -0.0002))           # the top corner that touches his right mouth corner (bread local)


def show_bread(t_bite):
    """Whole bread until the bite (frame of the lips contact), bitten bread from then on (or for the whole shot)."""
    if t_bite is None: E.show_between([bitten], t_on=99.0)
    elif t_bite <= 0: E.show_between([bread], t_on=99.0)
    else:
        E.show_between([bread], t_off=t_bite); E.show_between([bitten], t_on=t_bite)


if SHOT == "EG1":
    # the traveller asks; the boy, standing at the right of the table, points at the clock (six thirty-five) with the clock-side hand
    BOY = (DBOX[1] + 0.016, (DBOX[2] + DBOX[3]) / 2 - 0.004)
    ch.at(0, loc=BOY)
    GL, GF = (DBOX[0] - 0.035, DBOX[2] - 0.028), 35
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.9, VOICE["a"], VOICE["a"] + 2.6
    pt = Vector(local_dir(BOY, BOY_F, CLOCK, FLOOR + PUPIL * 0.62)).normalized()
    use_right = pt.x < 0                      # -x is his right: pick the hand on the clock side (the left one here)
    sg = -1 if use_right else 1
    pt.x = sg * max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    side = "Right" if use_right else "Left"
    print("DESK EG1 clock %s boy %s point_dir %s hand %s" % (tuple(round(v, 4) for v in CLOCK), tuple(round(v, 4) for v in BOY), tuple(round(v, 3) for v in pt), side), flush=True)
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms, head = E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=use_right), (0, (6 * sg) if t < ans1 else 0, 6 if t < ans1 else 2)
        else:
            arms, head = E.P_stand(), (0, -14, 0)            # listening: head turned to the traveller (on his right, -x)
        ch.pose(t, arms, twist={"Head": head})
        if t >= ans0 - 0.15:
            curl(ch, side, G_POINT); key_hand(ch, side, fr)
    ch.finish()

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)      # looks up at the clock
        return E.P_stand(), (0, 14, 0)
    stand("traveler_girl", GL, GF, girl, height=GIRL)
    show_bread(None)
    aim0 = Vector(((DBOX[0] + DBOX[1]) / 2 + 0.018, 0.05, 0.078))
    cam_move(42, aim0 + Vector((-0.02, -0.52, 0.075)), aim0, aim0 + Vector((-0.01, -0.45, 0.065)), aim0 + Vector((0, 0, 0.002)),
             focus=((DBOX[0] + DBOX[1]) / 2, DBOX[2] - 0.01, 0.06))
    view_report("EG1", [("clock", CLOCK), ("boy_head", lambda: wpt(ch, "Head")), ("ful_pot", (COUNTER_X + 0.010, 0.222, FLOOR + 0.06)),
                        ("window", (WIN_X, 0.24, FLOOR + 0.10)), ("table_front", ((DBOX[0] + DBOX[1]) / 2, DBOX[2], TOP))])

else:
    # ---------- seated behind the table, facing the camera ----------
    lean_shift = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
    hy = HY                     # tummy at the table edge; the code chair was placed for this
    P = Sit(ch, M_, (x_c, hy), SEAT_Z, LEAN, 0)
    P.learn_hands(HEAD0)
    mouth0 = mouth(ch)
    P.body(0, P_LAP, HEAD_BITE); mouth_bite = mouth(ch)
    P.body(0, P_LAP, HEAD0)
    SHR, SHL = wpt(ch, "RightArm"), wpt(ch, "LeftArm")
    chest = mesh_hit(ch.meshes, Vector((x_c, DB - 0.03, TOP + 0.004)), Vector((0, 1, 0)))
    print("DESK SIT hips_y %.4f seat_y %.4f..%.4f table_back %.4f body_front_at_top %s feet_gap %.4f shR %s shL %s mouth %s top %.4f" % (
        hy, SBOX[2], SBOX[3], DB, ("%.4f" % chest.y) if chest is not None else "none",
        (wpt(ch, "RightFoot").z - FLOOR) - M_["ankle_h"], tuple(round(v, 4) for v in SHR), tuple(round(v, 4) for v in SHL),
        tuple(round(v, 4) for v in mouth0), TOP), flush=True)
    print("DESK LEGS seat_z %.4f seat_y %.4f..%.4f | hips %s upleg %s knee %s foot %s" % (SEAT_Z, SBOX[2], SBOX[3], tuple(round(v, 4) for v in wpt(ch, "Hips")),
          tuple(round(v, 4) for v in wpt(ch, "RightUpLeg")), tuple(round(v, 4) for v in wpt(ch, "RightLeg")), tuple(round(v, 4) for v in wpt(ch, "RightFoot"))), flush=True)
    if hy > SBOX[3] - 0.002: print("DESK WARN hips behind the back of the seat (the chair is tucked too far under the table)", flush=True)
    _lt = leg_top_under(ch, DB, x_c, 0.012)
    if _lt is None: print("DESK LEGS boy mesh: no leg skin under the table edge", flush=True)
    else: knee_room("boy mesh (legs posed)", _lt, TM["under_back"])
    # the main camera of this shot (also used for the face check below, so both stay the same)
    if SHOT in ("EG2", "EG3"):
        MAIN_CAM = (Vector((x_c + 0.002, DB - 0.006, (FLOOR + mouth0.z + 0.012) / 2)), Vector((-0.03, -0.30, 0.064)), Vector((-0.026, -0.28, 0.058)), 60)
    else:
        MAIN_CAM = (Vector((x_c + 0.016, DB - 0.006, (mouth0.z + TOP) / 2 + 0.016)), Vector((0.01, -0.34, 0.012)), Vector((0.01, -0.34, 0.012)), 42)
    main_cam_at = lambda t: MAIN_CAM[0] + MAIN_CAM[1].lerp(MAIN_CAM[2], E.ease(t / T))
    BREAD_SAMPLES = [Vector((x, 0, z)) for x, z in bread_outline(False)[::4]] + [Vector((0, 0, -0.4 * BREAD_R))]

    def face_check(tag, t, fr, Mb=None, always=False):
        """11/21 (teacher: hands must never cover the face). From the MAIN camera: how close the hand (and the bread) come to the
        lines of sight to his mouth and to his two eyes (eyes = GUESS offsets from the lips, EYE_UP / EYE_SIDE). WARN when a hand
        point sits on the line to an eye or to the mouth, or the bread on the line to an eye; the bread at his mouth corner is the bite."""
        cam = main_cam_at(t)
        R = (ch.arm.matrix_world @ ch.pb["Head"].matrix).to_3x3().normalized()
        up, sd = R.col[1].normalized(), R.col[0].normalized()
        m_ = mouth(ch); eyes = [m_ + up * EYE_UP + sd * k * EYE_SIDE for k in (-1, 1)]
        hand = [wpt(ch, "RightHand"), wpt(ch, "RightHandMiddle1"), wpt(ch, "RightHandIndex3", True), wpt(ch, "RightHandThumb3", True),
                wpt(ch, "RightHandPinky3", True), wpt(ch, "RightHandMiddle3", True)]
        brd = [Mb @ v for v in BREAD_SAMPLES] if Mb is not None else []

        def clear(target, pts):
            d = target - cam; L = d.length; u = d / L; best = 9.0
            for q in pts:
                s_ = (q - cam).dot(u)
                if 0 < s_ < L - 0.0004: best = min(best, (q - (cam + u * s_)).length)
            return best
        h_m = clear(m_, hand); h_e = min(clear(e, hand) for e in eyes); b_e = min(clear(e, brd) for e in eyes) if brd else 9.0
        b_m = clear(m_, brd) if brd else 9.0
        bad = h_m < 0.0012 or h_e < 0.0012 or b_e < 0.0010
        if always or bad or fr % 4 == 0:
            ht = max(q.z for q in hand); bt = max(q.z for q in brd) if brd else float("nan")
            print("DESK FACE %s t=%.2f hand: x from mouth %+.4f (<0 = his right) top %+.4f below the eyes | bread top %+.4f below the eyes | "
                  "main camera clearance (m): hand-mouth %.4f hand-eyes %.4f bread-eyes %.4f bread-mouth %.4f %s" % (
                      tag, t, sum(q.x for q in hand) / len(hand) - m_.x, eyes[0].z - ht, eyes[0].z - bt, h_m, h_e, b_e, b_m,
                      "WARN hand or bread in front of his face" if bad else ""), flush=True)
    L_FLAT = P.rest("Left", L_PT, (-0.25, -1, 0))          # left hand flat beside the plate, thumb towards his middle

    # --- POCKET BREAD, right hand: on the bread's right edge, palm towards his middle and a little up,
    #     fingers on the camera side (front face), thumb on the chest side (back face); the bread plane sits between them ---
    Mh = P.calibrate("Right", hand_q(ch, "Right", Vector((0.15, -1, 0.2)), Vector((1, 0, 0.35))), G_BREAD, HEAD0)
    _w, _f, _a, _p = hand_frame(ch, "Right"); palm_b = world_vec(ch, _p)
    pc = (wpt(ch, "RightHand") + wpt(ch, "RightHandMiddle1")) / 2
    xb = Vector((palm_b.x, palm_b.y, 0)).normalized()
    ty = wpt(ch, "RightHandThumb3", True).y
    fy = (wpt(ch, "RightHandIndex2").y + wpt(ch, "RightHandMiddle2").y + wpt(ch, "RightHandIndex3", True).y) / 3
    edge = pc + palm_b * 0.0007
    org = edge + xb * (0.95 * BREAD_R) + Vector((0, 0, 0.3 * BREAD_R))
    org.y = (ty + fy) / 2 if ty > fy else edge.y
    C_BREAD = Mh.inverted() @ frame_M(org, Vector((0, 0, 1)), xb)
    print("DESK GRIP bread palm %s thumb_y %+.4f fingers_y %+.4f from the bread plane %s" % (
        tuple(round(v, 2) for v in palm_b), ty - org.y, fy - org.y, "" if ty > fy else "WARN thumb not on the chest side"), flush=True)
    P.body(0, P_LAP, HEAD0)
    B_CHEST = frame_M(Vector((x_c - 0.0010, hy - M_["front"] - 0.0042, SHR.z - 0.0012)), Vector((0, 0.12, 1)), Vector((1, 0, 0)))
    R3 = frame_M(Vector((0, 0, 0)), Z_MOUTH, X_MOUTH)
    B_MOUTH = frame_M(mouth_bite + BITE_D - R3.to_3x3() @ CORNER, Z_MOUTH, X_MOUTH)
    B_APP = Tr(-0.0030, -0.0020, -0.0025) @ B_MOUTH

    def bread_now():
        return hand_M(ch, "Right") @ C_BREAD

    def chew(t, t0, base):
        """Two small chewing nods after the bite (the model's mouth is not drawn)."""
        if t0 <= t < t0 + 0.68: return (base[0], base[1], base[2] + (5 if int((t - t0) / 0.17) % 2 else 0))
        return base

    if SHOT == "EG2":
        GRAB = 0.95
        BK = [(GRAB, B_PLATE), (GRAB + 0.15, Tr(0, 0, 0.0015) @ B_PLATE), (1.55, B_CHEST), (9.0, B_CHEST)]
        R_START = P.from_prop("Right", Tr(-0.0016, 0.0004, 0.0012) @ B_PLATE, C_BREAD, G_RELAX)
        R_PRE = P.from_prop("Right", Tr(-0.0007, 0, 0.0003) @ B_PLATE, C_BREAD, G_BREAD_OPEN)

        def right(t):
            if t < 0.3: return R_START
            if t < 0.75: return tblend(R_START, R_PRE, (t - 0.3) / 0.45)
            if t < GRAB: return tblend(R_PRE, P.from_prop("Right", B_PLATE, C_BREAD, G_BREAD), (t - 0.75) / (GRAB - 0.75))
            return P.from_prop("Right", key_M(BK, t), C_BREAD, G_BREAD)

        def head(t):
            if t < 0.3: return HEAD0
            if t < 1.0: return (0, -4, -12)                           # looks at his hand on the bread
            if t < 1.5: return (0, 0, -10)                            # "ful": the bowl on the tray in front of him
            return (0, 0, -1)                                          # "ta'ameya": face to the camera, bread at his chest
        grabbed = False
        for fr in E.frames():
            t = fr / E.FPS
            P.solve(t, fr, head(t), right(t), L_FLAT)
            Mb = B_PLATE if t < GRAB else bread_now()
            if t >= GRAB and not grabbed:
                grabbed = True; e_ = (Mb.translation - B_PLATE.translation).length
                print("CONTACT EG2 grab t=%.2f bread_jump %.4f %s" % (t, e_, "" if e_ < 0.0006 else "WARN hand did not reach the bread"), flush=True)
            set_M(bread, Mb, fr); set_M(bitten, Mb, fr)
            face_check("EG2", t, fr, Mb)
            if fr % 4 == 0:
                print("CONTACT EG2 t=%.2f bread_off_target %.4f bread_bottom_to_plate %.4f bread_top_below_mouth %.4f" % (
                    t, (Mb.translation - (key_M(BK, t) if t >= GRAB else B_PLATE).translation).length,
                    (Mb @ Vector((0, 0, -BREAD_R))).z - (TOP + PLATE_T), mouth(ch).z - Mb.translation.z), flush=True)
        ch.finish(); show_bread(None)
        for o in (bread, bitten): E.constant(o)

    elif SHOT == "EG3":
        BK = [(0.0, B_CHEST), (0.2, B_CHEST), (0.75, B_APP), (0.95, B_MOUTH), (1.15, B_MOUTH), (1.6, B_CHEST), (9.0, B_CHEST)]

        def head(t):
            if t < 0.55: return (0, 0, -2)
            if t < 1.15: return HEAD_BITE
            return chew(t, 1.2, (0, 0, -2))
        t_bite = None
        for fr in E.frames():
            t = fr / E.FPS
            P.solve(t, fr, head(t), P.from_prop("Right", key_M(BK, t), C_BREAD, G_BREAD), L_FLAT)
            Mb = bread_now()
            set_M(bread, Mb, fr); set_M(bitten, Mb, fr)
            cw = Mb @ CORNER; m_ = mouth(ch)
            if t_bite is None and t >= 0.8 and ((cw - m_).length < 0.0018 or t >= 1.1):
                t_bite = t
                print("CONTACT EG3 bite t=%.2f corner_to_lips %.4f %s" % (t, (cw - m_).length, "" if (cw - m_).length < 0.0018 else "WARN forced"), flush=True)
                face_check("EG3 bite", t, fr, Mb, always=True)
            else:
                face_check("EG3", t, fr, Mb)
            if fr % 4 == 0:
                print("CONTACT EG3 t=%.2f corner_to_mouth %.4f corner_to_target %.4f bread_top_below_eyes %.4f" % (
                    t, (cw - m_).length, (cw - key_M(BK, t) @ CORNER).length, (m_.z + 0.004) - (Mb @ Vector((0, 0, 0.0009))).z), flush=True)
        ch.finish(); show_bread(t_bite)
        for o in (bread, bitten): E.constant(o)

    else:
        # EG4: bitten bread back on the plate (let go only when it stands on the plate), then he waves with his right hand
        REL, W0 = 0.8, 1.25
        BK = [(0.0, B_CHEST), (0.45, Tr(0, 0, 0.0022) @ B_PLATE), (0.75, B_PLATE)]
        B_OFF = P.from_prop("Right", Tr(-0.0016, 0.0003, 0.0012) @ B_PLATE, C_BREAD, G_RELAX)
        Q_WAVE = hand_q(ch, "Right", Vector((-0.1, -0.1, 1)), Vector((0.05, -1, 0.1)))
        HEAD_W = (0, -8, -1)         # face to the camera, eyes and head a little to the traveller (his right)

        def head(t):
            return (0, -3, -10) if t < REL else HEAD_W
        last_b, said = None, set()
        for fr in E.frames():
            t = fr / E.FPS
            hd = head(t)
            if t < REL:
                P.solve(t, fr, hd, P.from_prop("Right", key_M(BK, t), C_BREAD, G_BREAD), L_FLAT)
                Mb = bread_now(); last_b = Mb
            else:
                if "rel" not in said and last_b is not None:
                    said.add("rel"); print("CONTACT EG4 release t=%.2f bread_bottom_above_plate %.4f off_place %.4f" % (
                        t, (last_b @ Vector((0, 0, -BREAD_R))).z - (TOP + PLATE_T), (last_b.translation - B_PLATE.translation).length), flush=True)
                u = min(1.0, (t - REL) / 0.12); Mb = blend_M(last_b, B_PLATE, u) if last_b is not None else B_PLATE
                P.body(t, P_LAP, hd)
                left = ik_arm(ch, "Left", L_FLAT[1], L_FLAT[3])
                off = tblend(P.from_prop("Right", B_PLATE, C_BREAD, G_BREAD), B_OFF, (t - REL) / 0.3)
                r_ik = ik_arm(ch, "Right", off[1], off[3])
                if t < W0: rdirs = r_ik
                elif t < W0 + 0.3: rdirs = blend_dirs(r_ik, wave_dirs(W0 + 0.3), (t - W0) / 0.3)
                else: rdirs = wave_dirs(t)
                P.body(t, {**rdirs, **left}, hd)
                turn_hand(ch, "Left", L_FLAT[0], fr); curl(ch, "Left", G_FLAT)
                if t < W0 + 0.15:
                    turn_hand(ch, "Right", off[0], fr); curl(ch, "Right", off[2])
                else:
                    turn_hand(ch, "Right", Q_WAVE, fr); curl(ch, "Right", G_WAVE)
                key_hand(ch, "Left", fr); key_hand(ch, "Right", fr)
            set_M(bread, Mb, fr); set_M(bitten, Mb, fr)
            if t < REL + 0.4: face_check("EG4", t, fr, Mb)
            if fr % 12 == 0:
                hr = wpt(ch, "RightHandMiddle1"); hdp = wpt(ch, "Head")
                print("CONTACT EG4 t=%.2f bread_off_plate %.4f wave_hand_outside_face_x %.4f hand_above_shoulder %.4f" % (
                    t, (Mb.translation - B_PLATE.translation).length, hdp.x - hr.x, hr.z - SHR.z), flush=True)
        ch.finish(); show_bread(0)
        for o in (bread, bitten): E.constant(o)

    # ---------- cameras ----------
    if CAMSUB == "main" and SHOT == "EG4":
        GLT = (DBOX[0] - 0.030, DBOX[2] + 0.006)

        def trav(t):
            if t >= 1.6: return E.P_wave(int((t - 1.6) * 3) % 2), (0, -16, 0)       # waves back
            return E.P_stand(), (0, -16, 0)
        stand("traveler_girl", GLT, 55, trav, height=GIRL)
    if CAMSUB not in ("main", "C", "S") and tray_root is not None:
        hide([tray_root])        # the breakfast tray would stand between a hand camera and the hand
    hold = B_CHEST @ Vector((-0.5 * BREAD_R, 0, -0.4 * BREAD_R))
    grab_pt = (B_PLATE @ Vector((-0.6 * BREAD_R, 0, -0.4 * BREAD_R)) + hold) / 2
    to_mouth = (hold + mouth0) / 2
    HANDCAM = {   # aim, camera offset, lens. His right hand is on the -x side; DOF off.
        "HF": ((grab_pt if SHOT == "EG2" else to_mouth), Vector((-0.07, -0.12, 0.04)), 150),     # front-3/4 from his right front
        "HS": ((grab_pt if SHOT == "EG2" else to_mouth), Vector((-0.14, -0.01, 0.02)), 150),     # his right side
        "HL": (L_PT + Vector((0, 0, 0.001)), Vector((0.07, -0.12, 0.05)), 190),                  # left hand, front-left
        "HL2": (L_PT + Vector((0, 0, 0.001)), Vector((0.14, -0.01, 0.03)), 190),                # left hand, his left side
        # legs ON the seat, never through it (UK 11/20): side at seat height + low front-left
        "L": (Vector((x_c, HY - 0.004, SEAT_Z + 0.005)), Vector((-0.17, 0.0, 0.004)), 190),
        "L2": (Vector((x_c, SBOX[2], SEAT_Z + 0.003)), Vector((0.06, -0.13, 0.0)), 190)}
    if CAMSUB in HANDCAM:
        aim, off, lens = HANDCAM[CAMSUB]
        cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    elif CAMSUB in ("C", "S"):
        hand_pt = grab_pt if SHOT == "EG2" else to_mouth
        aim = Vector((hand_pt.x, hand_pt.y + 0.001, hand_pt.z))
        off = Vector((-0.085, -0.11, 0.022)) if CAMSUB == "C" else Vector((-0.14, -0.018, 0.012))
        cam_move(115, aim + off, aim, aim + off, aim)
    elif SHOT in ("EG2", "EG3"):     # table from the front: the whole seated boy (legs, shoes on the floor), the tray with the ful bowl
        aim = MAIN_CAM[0]
        cam_move(MAIN_CAM[3], aim + MAIN_CAM[1], aim, aim + MAIN_CAM[2], aim, focus=(x_c, DB - 0.004, TOP))
    else:                            # EG4: boy, the traveller at the left, clock top right, the window with the pyramids, the ful pot
        aim = MAIN_CAM[0]
        cam_move(MAIN_CAM[3], aim + MAIN_CAM[1], aim, aim + MAIN_CAM[2], aim, focus=mouth0)
    print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
    if CAMSUB == "main":
        view_report(SHOT, [("clock", CLOCK), ("boy_mouth", lambda: mouth(ch)), ("left_shoe", lambda: wpt(ch, "LeftFoot")),
                           ("ful_pot", (COUNTER_X + 0.010, 0.222, FLOOR + 0.06)), ("window", (WIN_X, 0.24, FLOOR + 0.10)),
                           ("tray", (TRAY_AT[0], TRAY_AT[1], TOP))])

E.run(A[3:])
