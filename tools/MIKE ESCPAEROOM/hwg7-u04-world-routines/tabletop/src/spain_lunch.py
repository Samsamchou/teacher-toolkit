# World Routines Trip, he/she version - Spain station "She has lunch at two o'clock." (tabletop style H), built by spain_lunch_build.py
# from the accepted I-version spain_dinner.py (read its header for the hand and chair rules).
#   SP1 (7.4 s) daytime dining room: Lucia stands behind the table and points at the 2:00 clock with her LEFT hand; mum sits at the end.
#       "This is Lucia. What time does she have lunch?" / "She has lunch at two o'clock."
#   SP2 (7.2 s) seated: fork, one bite of grilled fish (her RIGHT hand), mum nods on "with her family"; soup bowls and a fruit bowl
#       on the table. "Lunch is her big meal. She eats soup, fish and fruit with her family."
#   SP4 (4.0 s) after lunch she rests: sits back, hands down, head tilted, a slow breath. "Then she rests for a while."
# No traveller in the he/she films (anchor and reporter are voices only).
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
from hands import *            # shared hand helpers (tabletop/src/hands.py)
import hands as H

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with spain_compose.py
DUR = {"SP1": 7.4, "SP2": 7.2, "SP3": 3.0, "SP4": 4.0}
VOICE = {"q": 0.4, "a": 4.4, "eat": 0.4, "rest": 0.3}
# word times inside the lines (audio/spain_words.json): eat "tortilla" 0.70-1.51, "salad" 1.78-2.37, "with my family" 2.38-3.43;
#   a "nine fifteen" 1.39-2.58; late "It's late" 3.57-4.35
FAM_AT = (5.41, 6.51)      # "with her family" inside the eat line (audio/hs_spain_words.json)
FAMILY0, FAMILY1 = VOICE["eat"] + FAM_AT[0], VOICE["eat"] + FAM_AT[1]
CAMSUB = SHOT[3:] or "main"      # "" main / C close / S side / H.. M.. sharp hand cameras
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
MUM_H = KID * env("MUM_K", "1.22")         # adult proportions, a little taller than the pupil (storyboard); she is not scaled to the table
TX, TY = 0.0, 0.055              # table position (the girl sits on its +y side, facing the camera at -y; mum at the +x end)
WALL_Y = 0.246                   # back wall centre (front face at 0.240)
# --- body / furniture fit (GUESS: check DESK FIT / DESK SIT / DESK MUM lines) ---
SEAT_HIP = env("SEAT_HIP", "0.0075")       # hips bone above the chair seat when sitting
ELBOW_DROP = env("ELBOW_DROP", "0.0005")   # table top this much below the hanging elbow
DESK_K = env("DESK_K", "1.0")              # extra scale on the fitted table
GAP = env("GAP", "0.0012")                 # tummy to table edge
LEAN = tuple(float(v) for v in os.environ.get("LEAN", "0,0,-8").split(","))   # lean forward over the table (Spine1 twist)
MUM_LEAN = (0, 0, -4)
MUM_TURN = env("MUM_TURN", "20")           # mum's body turned this much from her chair towards the camera
CLOCK_Z = env("CLOCK_Z", "0.112")
# --- small props (sized to the chibi hand: arms are only ~14 mm) ---
PLATE_R, PLATE_T = env("PLATE_R", "0.0050"), 0.0005
PLATE_DX = env("PLATE_DX", "0.0005")       # plate centre from her centre (+x = her left)
FORK_L = env("FORK_L", "0.0092")       # 11/21 check 3: 10.5 mm lifted the hand to her mouth while spearing
FORK_OUT = env("FORK_OUT", "0.0038")       # GUESS: fork tip this far beyond the index fingertip
GLASS_R, GLASS_H = 0.0021, 0.0040
WEDGE_T = 0.0015
BITE_D = Vector((env("BITE_DX", "-0.0010"), env("BITE_DY", "-0.0004"), env("BITE_DZ", "-0.0003")))   # right mouth corner from the lips centre
SIP_D = Vector((env("SIP_DX", "-0.0004"), env("SIP_DY", "-0.0003"), env("SIP_DZ", "-0.0006")))      # glass rim on the lower lip
SIP_TILT = math.radians(env("SIP_TILT", "28"))
TRAY_MAX = env("TRAY_MAX", "0.030")
NEED_W, NEED_D = env("NEED_W", "0.056"), env("NEED_D", "0.034")     # table footprint the props need (x, y); widened if smaller
KNEE_ROOM = env("KNEE_ROOM", "0.0012")     # table underside above the top of her knees (teacher 11/21: >= 1 mm)
LAP_AT = env("LAP_AT", "0.6")              # mum's palms rest this far from hip to knee along her thigh
HEAD0 = (0, 0, -4)
HEAD_BITE = (0, -6, -8)          # (roll, yaw, pitch): yaw < 0 turns to her right (towards the fork), pitch < 0 bows
HEAD_SIP = (0, -5, 3)
Z_SPEAR = Vector((-0.70, 0.55, 0.36)).normalized()     # fork axis tip -> handle while spearing: handle out to her right, back, ~20 deg up
# 11/21 check 3 (qa/1121-105845 SP2HF f0036/74/84): the old (-0.35, 0.55, 0.75) stood the fork ~48 deg up, so the hand at the top
# of the handle was at her mouth and the sleeve covered her cheek (table top only 3.5 mm under the shoulder after the knee-room raise)
Z_MOUTH = Vector((-0.85, -0.20, -0.45)).normalized()   # at the mouth: handle out to her right, a little forward and down


# ---------- generic helpers (from uk_homework.py) ----------
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


# ---------- materials ----------
def steel():
    m = E.mat("forkSteel", (0.80, 0.80, 0.83), 0.22)
    b = m.node_tree.nodes["Principled BSDF"]
    if "Metallic" in b.inputs: b.inputs["Metallic"].default_value = 0.9
    return m


def glass_mat(n, c, rough):
    m = E.mat(n, c, rough); b = m.node_tree.nodes["Principled BSDF"]
    for k in ("Transmission Weight", "Transmission"):
        if k in b.inputs:
            b.inputs[k].default_value = 1.0; break
    if "IOR" in b.inputs: b.inputs["IOR"].default_value = 1.45
    return m


def azulejo():
    """Blue and white Spanish tile pattern drawn into a small image, repeated every 12 mm along the wall (x) and up (z)."""
    if "azulejo" in E._M: return E._M["azulejo"]
    n = 32; img = bpy.data.images.new("azulejoImg", n, n)
    blue, white = (0.06, 0.20, 0.58, 1.0), (0.95, 0.95, 0.92, 1.0)
    px = []
    for j in range(n):
        v = (j + 0.5) / n * 2 - 1
        for i in range(n):
            u = (i + 0.5) / n * 2 - 1
            d = abs(u) + abs(v); c = white
            if 0.52 < d < 0.72 or max(abs(u), abs(v)) > 0.9 or u * u + v * v < 0.06: c = blue
            if (abs(u) - 1) ** 2 + (abs(v) - 1) ** 2 < 0.10: c = blue
            px.extend(c)
    img.pixels = px
    try: img.pack()
    except Exception: pass
    m = bpy.data.materials.new("azulejo"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.25
    geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); comb = nt.nodes.new("ShaderNodeCombineXYZ")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / 0.012, 1 / 0.012, 1.0)
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img; tx.interpolation = "Closest"
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    nt.links.new(sep.outputs["X"], comb.inputs["X"]); nt.links.new(sep.outputs["Z"], comb.inputs["Y"])
    nt.links.new(comb.outputs[0], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], tx.inputs["Vector"])
    nt.links.new(tx.outputs["Color"], b.inputs["Base Color"])
    E._M["azulejo"] = m; return m


def prism(name, pts, z0, z1, m):
    """Flat solid from a 2D outline (x, y) between heights z0 and z1 (local coordinates)."""
    n = len(pts)
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); me.materials.append(m)
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    bv = ob.modifiers.new("bv", "BEVEL"); bv.width = 0.00015; bv.segments = 2; bv.limit_method = "ANGLE"
    return ob


# ---------- the room ----------
def room(win_x):
    """Night dining-room corner, cut open like a doll's house: white plaster, azulejo dado, terracotta floor, a French window."""
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("terracotta", (0.62, 0.30, 0.17)), "floor", thick=FLOOR)
    grout = E.mat("grout", (0.42, 0.22, 0.14), 0.9)
    for i in range(1, 22):
        E.box((-0.32 + i * 0.029, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), grout, "tileX", bevel=0)
    for j in range(1, 15):
        E.box((0, -0.19 + j * 0.029, FLOOR + 0.0002), (0.64, 0.0008, 0.0004), grout, "tileY", bevel=0)
    wall = E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("plaster", (0.93, 0.91, 0.86)), "backWall")
    wz0, wz1, ww = FLOOR + 0.003, FLOOR + 0.165, 0.078
    cut = E.box((win_x, WALL_Y, (wz0 + wz1) / 2), (ww, 0.05, wz1 - wz0), E.mat("cutter", (0, 0, 0), 0.5), "winCut", bevel=0)
    mod = wall.modifiers.new("win", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut
    cut.hide_render = True; cut.display_type = "WIRE"
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", (0.90, 0.88, 0.82)), "sideWall")
    # azulejo dado on both sides of the French window, with a white rail on top
    tile = azulejo(); white = E.mat("paintWhite", (0.95, 0.94, 0.9), 0.5)
    for (a, b) in ((-0.32, win_x - ww / 2 - 0.006), (win_x + ww / 2 + 0.006, 0.32)):
        E.box(((a + b) / 2, 0.2395, FLOOR + 0.017), (b - a, 0.002, 0.034), tile, "azulejo", bevel=0)
        E.box(((a + b) / 2, 0.2385, FLOOR + 0.0345), (b - a, 0.003, 0.0022), white, "dadoRail", bevel=0)
    # French window: frame, two leaves with glazing bars, a step
    green = E.mat("shutterGreen", (0.10, 0.30, 0.22), 0.5)
    zc = (wz0 + wz1) / 2; hh = wz1 - wz0
    for (x, z, sx, sz) in ((win_x - ww / 2 + 0.002, zc, 0.004, hh), (win_x + ww / 2 - 0.002, zc, 0.004, hh), (win_x, wz1 - 0.002, ww, 0.004),
                           (win_x, zc, 0.003, hh), (win_x, wz0 + 0.004, ww, 0.006)):
        E.box((x, 0.243, z), (sx, 0.012, sz), white, "winFrame", bevel=0)
    for k in range(1, 4):
        E.box((win_x, 0.244, wz0 + 0.006 + k * (hh - 0.01) / 4), (ww - 0.006, 0.003, 0.0012), white, "glazingBar", bevel=0)
    for s in (-1, 1):            # two shutters folded back against the wall
        E.box((win_x + s * (ww / 2 + 0.011), 0.2375, zc), (0.02, 0.003, hh - 0.01), green, "shutter", bevel=0.0006)
        for k in range(10):
            E.box((win_x + s * (ww / 2 + 0.011), 0.2357, wz0 + 0.012 + k * 0.0145), (0.017, 0.0008, 0.0014), green, "louvre", bevel=0)


def apartment(x, y, w, h, k):
    """One block of flats across the street at night: dark front, lit and unlit windows, little balconies."""
    front = E.box((x, y, FLOOR + h / 2), (w, 0.03, h), E.felt("flat%d" % (k % 3), [(0.30, 0.24, 0.22), (0.26, 0.24, 0.30), (0.34, 0.28, 0.22)][k % 3]), "flat", bevel=0.0008)
    lit = E.emission("winLit", (1.0, 0.72, 0.36), 3.0); dark = E.mat("winDark", (0.05, 0.06, 0.10), 0.3)
    iron = E.mat("ironRail", (0.04, 0.04, 0.05), 0.5)
    rows, cols = int(h / 0.032), max(2, int(w / 0.026))
    for r in range(rows):
        for c in range(cols):
            wx = x - w / 2 + (c + 0.5) * w / cols; wz = FLOOR + 0.02 + r * 0.032
            on = (r * 7 + c * 3 + k) % 5 < 3
            E.box((wx, y - 0.016, wz), (0.010, 0.002, 0.016), lit if on else dark, "flatWin", bevel=0)
            E.box((wx, y - 0.020, wz - 0.009), (0.016, 0.006, 0.0012), iron, "flatBalcony", bevel=0)
    return front


def outside(win_x):
    E.box((win_x, 0.29, FLOOR - 0.002), (0.18, 0.08, 0.006), E.felt("balconyFloor", (0.58, 0.48, 0.40)), "balconyFloor", bevel=0.0005)
    if os.path.exists(f"{PROPS}/spain_balcony.glb"):
        b = E.place(f"{PROPS}/spain_balcony.glb", env("BALC_H", "0.048"), (win_x, 0.288, FLOOR + 0.001))
        bpy.context.view_layer.update()
        print("DESK BALCONY bbox %s" % (tuple(round(v, 4) for v in E._bbox(b)),), flush=True)
    E.box((0, 0.42, FLOOR - 0.006), (1.2, 0.20, 0.008), E.felt("street", (0.16, 0.16, 0.18)), "street", bevel=0)
    for k, (dx, w, h) in enumerate(((-0.24, 0.09, 0.20), (-0.14, 0.08, 0.17), (-0.05, 0.09, 0.22), (0.05, 0.08, 0.19), (0.15, 0.09, 0.21), (0.25, 0.08, 0.18))):
        apartment(win_x + dx, 0.50, w, h, k)
    # a church bell tower far away (no clock on it, so the only clock is the 9:15 one)
    stone = E.felt("towerStone", (0.42, 0.36, 0.30)); tx = win_x + 0.075
    E.box((tx, 0.60, FLOOR + 0.15), (0.032, 0.03, 0.30), stone, "tower", bevel=0.0008)
    E.box((tx, 0.584, FLOOR + 0.262), (0.014, 0.002, 0.022), E.emission("bellArch", (1.0, 0.78, 0.45), 2.0), "bellArch", bevel=0)
    roof = E.cone((tx, 0.60, FLOOR + 0.318), 0.026, 0.0, 0.036, E.mat("towerRoof", (0.35, 0.16, 0.10), 0.6), verts=4, name="towerRoof")
    roof.rotation_euler = (0, 0, math.radians(45))
    E.box((0, 0.68, 0.25), (1.6, 0.004, 0.7), E.emission("daySky", (0.55, 0.78, 1.0), 1.6), "sky", bevel=0)
    for i in range(0):
        E.ball((win_x - 0.3 + (i * 0.173) % 0.6, 0.675, 0.24 + ((i * 37) % 9) * 0.02), 0.0012, E.emission("star", (1, 1, 0.9), 6.0), "star")


def clock(cx, cy, cz, hh, mm):
    """Round wall clock (ticks only, no numbers): hour hand (hh + mm/60) * 30 deg, minute hand mm * 6 deg."""
    E.cyl((cx, cy, cz), 0.026, 0.006, E.mat("clockRim", (0.08, 0.22, 0.56), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0025, cz), 0.0225, 0.004, E.mat("clockFace", (0.98, 0.97, 0.93), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.08, 0.08, 0.12), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.019 * math.sin(a), cy - 0.005, cz + 0.019 * math.cos(a)), 0.0016 if big else 0.0009, ink, "tick")
    hand_box(cx, cy - 0.0052, cz, math.radians(((hh % 12) + mm / 60) * 30), 0.011, 0.0026, ink, "hourHand")
    hand_box(cx, cy - 0.0058, cz, math.radians(mm * 6), 0.0165, 0.0017, ink, "minuteHand")
    E.ball((cx, cy - 0.006, cz), 0.0018, E.mat("clockPin", (0.75, 0.16, 0.14), 0.4), "clockPin")


def pendant(x, y):
    """Warm pendant lamp over the table (cord goes up out of the picture)."""
    z = FLOOR + env("LAMP_Z", "0.128")
    shade = E.cone((x, y, z), 0.016, 0.004, 0.012, E.mat("lampShade", (0.85, 0.55, 0.20), 0.5), verts=32, name="lampShade")
    E.ball((x, y, z - 0.004), 0.004, E.emission("bulb", (1.0, 0.80, 0.50), 8.0), "bulb")
    E.cyl((x, y, z + 0.2), 0.0005, 0.4, E.mat("cord", (0.05, 0.05, 0.05), 0.6), verts=8, name="lampCord")
    bpy.ops.object.light_add(type="POINT", location=(x, y, z - 0.008)); L = bpy.context.object; L.name = "pendantLight"
    L.data.energy = env("PEND", "0.15"); L.data.color = (1.0, 0.82, 0.58); L.data.shadow_soft_size = 0.008
    return shade


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
# fork, European grip (checked 11/20, storyboard): tines down, palm DOWN; index straight along the back of the handle;
# thumb on the handle's inner side (towards her middle), pinching it with the middle finger; ring + little finger curled under it
G_FORK = {"Thumb": (14, 16, 8), "Index": (4, 8, 6), "Middle": (30, 36, 22), "Ring": (52, 52, 34), "Pinky": (58, 55, 36)}
G_FORK_OPEN = {"Thumb": (6, 8, 4), "Index": (3, 5, 3), "Middle": (12, 15, 10), "Ring": (24, 26, 16), "Pinky": (28, 28, 18)}
# glass: hand on the glass's right side, palm towards her middle; four fingers round the camera side, thumb on the chest side
G_GLASS = G_CUP
G_GLASS_OPEN = {"Thumb": (10, 8, 4), "Index": (16, 20, 12), "Middle": (18, 22, 14), "Ring": (20, 22, 14), "Pinky": (22, 22, 14)}

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
        sh = M.get("seat_hip", SEAT_HIP)
        ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y, seat_z + sh - M["hip_h"]))
        hipj = seat_z + sh + M["upleg_dz"]; dz = (FLOOR + M["knee_h"]) - hipj
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
        # 11/21 check 3: hands / sleeves in front of the face. Elbow and wrist height against the shoulder; WARN when the elbow is
        # above the shoulder or the wrist more than 2 mm above it (the chibi mouth is only ~4 mm above the shoulder)
        if fr % 6 == 0:
            for side, g in (("Right", tr), ("Left", tl)):
                if g is None: continue
                sz = wpt(ch, side + "Arm").z; ez = wpt(ch, side + "ForeArm").z - sz; wz = wpt(ch, side + "Hand").z - sz
                print("DESK ARMZ %s %s fr %d elbow %+.4f wrist %+.4f (from the shoulder)%s" % (ch.name, side, fr, ez, wz,
                      "  WARN arm up in front of the face" if (ez > 0 or wz > 0.002) else ""), flush=True)
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


# ---------- props made in code ----------
def make_plate(c, r, name):
    china = E.mat("china", (0.96, 0.95, 0.92), 0.3)
    E.cyl((c.x, c.y, c.z + PLATE_T / 2), r, PLATE_T, china, verts=40, name=name)
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.93, minor_radius=0.00022, major_segments=40, minor_segments=6, location=(c.x, c.y, c.z + PLATE_T))
    rim = bpy.context.object; rim.name = name + "Rim"; rim.data.materials.append(china)
    E.cyl((c.x, c.y, c.z + PLATE_T + 0.00002), r * 0.6, 0.00003, E.mat("plateBand", (0.10, 0.30, 0.65), 0.35), verts=40, name=name + "Band")


def make_tortilla(origin):
    """Her triangular slice of tortilla, point towards her, with the point already cut off by the fork side (the bite sits in the gap)."""
    egg = E.felt("fish", (0.97, 0.90, 0.82)); crust = E.felt("fishSkin", (0.62, 0.48, 0.36))
    wedge = prism("tortillaSlice", [(-0.0028, -0.0022), (0.0028, -0.0022), (0.0008, 0.0016), (-0.0008, 0.0016)], 0, WEDGE_T, egg)
    wedge.location = origin
    E.box((origin.x, origin.y - 0.0022, origin.z + WEDGE_T / 2), (0.0056, 0.0003, WEDGE_T), crust, "tortillaEdge", bevel=0)
    piece = prism("tortillaBite", [(-0.0008, -0.0005), (0.0008, -0.0005), (0.0, 0.0009)], -WEDGE_T / 2, WEDGE_T / 2, egg)
    piece.rotation_mode = "XYZ"
    pc = origin + Vector((0, 0.0021, WEDGE_T / 2))
    piece.location = pc
    return piece, pc


def make_fork():
    """Steel table fork; its empty sits at the tine tips and its local +z runs tips -> handle end; local x across the tines."""
    emp = E.empty("fork"); emp.rotation_mode = "XYZ"; m = steel()
    parts = [E.box((0, 0, 0.0035 + (FORK_L - 0.0035) / 2 + 0.0008), (0.0009, 0.00030, FORK_L - 0.0051), m, "forkHandle", bevel=0.0001),
             E.box((0, 0, 0.0037), (0.0006, 0.00028, 0.0010), m, "forkNeck", bevel=0),
             E.box((0, 0, 0.0027), (0.0013, 0.00026, 0.0012), m, "forkHead", bevel=0.00005)]
    for dx in (-0.00045, 0.0, 0.00045):
        parts.append(E.box((dx, 0, 0.0011), (0.00022, 0.00022, 0.0022), m, "forkTine", bevel=0))
    for o in parts: o.parent = emp
    return emp


def make_glass():
    """Short drinking glass with water; its empty sits at the centre of the bottom, local +z up the glass."""
    emp = E.empty("glass"); emp.rotation_mode = "XYZ"
    gm = glass_mat("glassClear", (0.90, 0.96, 1.0), 0.04); wm = glass_mat("water", (0.80, 0.92, 1.0), 0.02)
    parts = [E.cyl((0, 0, GLASS_H / 2), GLASS_R, GLASS_H, gm, verts=32, name="glassBody"),
             E.cyl((0, 0, GLASS_H * 0.32), GLASS_R * 0.86, GLASS_H * 0.56, wm, verts=32, name="glassWater"),
             E.cyl((0, 0, 0.00025), GLASS_R * 1.02, 0.0005, gm, verts=32, name="glassFoot")]
    bpy.ops.mesh.primitive_torus_add(major_radius=GLASS_R * 0.97, minor_radius=0.00010, major_segments=32, minor_segments=6, location=(0, 0, GLASS_H))
    rim = bpy.context.object; rim.name = "glassRim"; rim.data.materials.append(gm); parts.append(rim)
    for o in parts: o.parent = emp
    return emp


RIM = Vector((0, GLASS_R, GLASS_H))      # the rim point that goes to her lower lip (glass local, her side +y)


def glass_M(base, tilt):
    M = Matrix.Rotation(-tilt, 4, "X"); M.translation = Vector(base); return M     # tilt > 0 tips the top towards her (+y)


def base_for(p, tl):
    return Vector(p) - Matrix.Rotation(-tl, 3, "X") @ RIM


# ================= build =================
seated = SHOT != "SP1"
GIRL_F = 0 if seated else -15
ch = E.Char("spain_girl", (0.30, -0.15), GIRL_F, height=PUPIL)          # placed properly below, after the table is fitted to her
M_ = metrics(ch)
# thighs ON the seat, not through it (UK 11/20): each sitter gets the depth measured on their own deformed mesh
SEAT_UNDER = seat_under(ch, M_["thigh"]) - 0.0010
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
M_["seat_hip"] = SEAT_HIP
e_el = SEAT_HIP + M_["sh_hips"] - M_["upper"] - ELBOW_DROP          # her elbow above the seat when sitting
seat_feet = M_["knee_h"] - SEAT_HIP - M_["upleg_dz"]                 # = knee height - thigh depth: feet flat on the floor
SEAT_Z = FLOOR + seat_feet
TOP_WANT = SEAT_Z + e_el * DESK_K
# 11/21: table-only Tripo model; its top at her seated elbow (teacher check: with the top at the chest the plate sat under the chin
# and the reaching hand covered the face - hands must never cover the face)
TI = probe_table(f"{PROPS}/spain_table_only.glb")
desk_root, TM = fit_table(f"{PROPS}/spain_table_only.glb", TI, TOP_WANT, NEED_W, NEED_D, "spain_table")
# 11/21 check (qa/1121-095448): with the top at her elbow the thighs went 3.8 mm into the table. Feet on the floor fix the knee joint
# at floor + shin length, and the chibi thigh is thicker than the elbow-to-seat gap, so a table at the elbow can never clear the knees.
# Trade-off chosen: raise the table JUST enough that the underside clears the top of the knees by KNEE_ROOM (about 4-5 mm above the
# elbow, still under her shoulders). The other way - sitting back until the knees are in front of the table edge - needs ~12 mm,
# and then the wrist cannot reach the plate (need ~0.022-0.026 m, arm 0.016 m).
KNEE_TOP = FLOOR + M_["knee_h"] + SEAT_UNDER + 0.001                  # knee joint + thigh depth (same mesh depth as under the hip)
_room = TM["under_back"] - KNEE_TOP
if _room < KNEE_ROOM:
    _slab = (TM["top"] - TM["under_back"]) / max(1e-6, TM["top"] - FLOOR)        # top thickness, as a share of the table height
    top2 = (KNEE_TOP + KNEE_ROOM - _slab * FLOOR) / (1.0 - _slab) + 0.0002
    print("DESK FIT table raised from the elbow %.4f to %.4f (above floor) so the knees fit under it (room was %.4f, want %.4f)" % (
        TM["top"] - FLOOR, top2 - FLOOR, _room, KNEE_ROOM), flush=True)
    drop(desk_root)
    desk_root, TM = fit_table(f"{PROPS}/spain_table_only.glb", TI, top2, NEED_W, NEED_D, "spain_table")
E.obstacle(desk_root)
TOP = TM["top"]; DBOX = TM["box"]; DB = DBOX[3]
x_c = (DBOX[0] + DBOX[1]) / 2 + env("GIRL_DX", "0.0")
_lean = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
HY = DB + M_["front"] + GAP + _lean                                     # her hips: tummy just behind the table's back edge
SEAT_FRONT, SEAT_BACK, CH_W = pupil_chair(x_c, HY, M_, SEAT_Z, TM, "herChair", wood_lin=(0.62, 0.20, 0.08), cushion_lin=(0.30, 0.02, 0.02))
SBOX = (x_c - CH_W / 2, x_c + CH_W / 2, SEAT_FRONT, SEAT_BACK)
if HY + 0.004 > SEAT_BACK: print("DESK WARN her bottom may touch the chair back: hips %.4f seat back %.4f" % (HY, SEAT_BACK), flush=True)
print("DESK FIT elbow_above_seat %.4f seat_for_feet %.4f -> seat %.4f table top wanted %.4f got %.4f (above floor) table %s her_seat %s hips_y %.4f" % (
    e_el, seat_feet, SEAT_Z - FLOOR, TOP_WANT - FLOOR, TOP - FLOOR, tuple(round(v, 4) for v in DBOX), tuple(round(v, 4) for v in SBOX), HY), flush=True)
knee_room("girl", KNEE_TOP, TM["under_back"])

# ---------- mum: on a code chair at the right (+x) end, body turned a little to the camera; adult size, not scaled ----------
MUM_F = -90.0 + MUM_TURN                                             # faces the table end (-x), turned MUM_TURN deg towards the camera
chm = E.Char("spain_mum", (0.30, -0.32), MUM_F, height=MUM_H)
MM = metrics(chm)
MUM_UNDER = seat_under(chm, MM["thigh"]) - 0.0010                   # adult thighs: her own depth
MM["seat_hip"] = MUM_UNDER - MM["upleg_dz"]
MUM_SEAT_Z = FLOOR + MM["knee_h"] - MUM_UNDER                       # her own knee height - her own thigh depth
Fm = Vector((math.sin(math.radians(MUM_F)), -math.cos(math.radians(MUM_F)), 0)); Rm = Vector((Fm.y, -Fm.x, 0))     # her forward / her right
_hipj = MUM_SEAT_Z + MM["seat_hip"] + MM["upleg_dz"]
_kdz = max(-0.95 * MM["thigh"], min(0.7 * MM["thigh"], (FLOOR + MM["knee_h"]) - _hipj)); _khz = math.sqrt(max(1e-12, MM["thigh"] ** 2 - _kdz ** 2))
MUM_KNEE_TOP = _hipj + _kdz + MUM_UNDER + 0.001
x_tummy = DBOX[1] + MM["front"] * abs(Fm.x) + GAP
x_knees = DBOX[1] + 0.0015 + _khz * abs(Fm.x)                        # knees just outside the table end
knees_out = MUM_KNEE_TOP > TM["under_end"] - 0.0005                  # her knees would hit the underside: she sits back from the end
hm = Vector((max(x_tummy, x_knees) if knees_out else x_tummy, (DBOX[2] + DBOX[3]) / 2 + env("MUM_DY", "-0.002"), 0))
PM = Sit(chm, MM, (hm.x, hm.y), MUM_SEAT_Z, MUM_LEAN, MUM_F)
_md = max(0.016, MM["thigh"] + 0.007); _mw = min(0.032, max(0.022, 2 * MM["sh_half"] + 0.008))
_cc = hm - Fm * (_md / 2 - MM["thigh"] + 0.0025)                      # chair centre: front edge 2.5 mm behind her knees
build_code_chair(_cc.x, _cc.y - _md / 2, MUM_SEAT_Z, _mw, FLOOR, depth=_md, wood_lin=(0.62, 0.20, 0.08), cushion_lin=(0.30, 0.02, 0.02),
                 name="mumChair", yaw_deg=MUM_F)
MC = Vector((DBOX[1] - (0.0035 if knees_out else 0.0045), max(DBOX[2] + 0.008, min(DB - 0.008, hm.y + Fm.y * 0.01)), TOP))     # on the table end in front of her
MUM_PLATE = MC + Fm * 0.0025
print("DESK MUM face %.1f hips %s seat %.4f knees %s (knee top ~%.4f, underside at the end %.4f; tummy x %.4f, knees-out x %.4f) plate %s" % (
    MUM_F, tuple(round(v, 4) for v in hm[:2]), MUM_SEAT_Z - FLOOR, "outside the table end" if knees_out else "under the table",
    MUM_KNEE_TOP, TM["under_end"], x_tummy, x_knees, tuple(round(v, 4) for v in MUM_PLATE)), flush=True)
if not knees_out: knee_room("mum", MUM_KNEE_TOP, TM["under_end"])

# ---------- layout on the table (from her seated centre and the table edge on her side) ----------
PL = Vector((x_c + PLATE_DX, DB - PLATE_R - 0.0007, TOP))
FORK_X = PL.x - PLATE_R - 0.0012
GLASS_HOME = Vector((FORK_X - 0.0045, max(DBOX[2] + GLASS_R + 0.002, DB - GLASS_R - env("GLASS_BACK", "0.0055")), TOP))
# 11/21 check 4 (qa/1121-115737 SP2HF f0048): with the fork handle now out to her right the hand and handle went THROUGH the
# glass at the table's near edge -> the glass stands 5.5 mm further forward (away from her), out of the fork hand's path
L_PT = Vector((PL.x + PLATE_R + 0.0030, DB - 0.0026, TOP))
F_REST = frame_M(Vector((FORK_X, DB - 0.0010 - FORK_L, TOP + 0.00025)), Vector((0, 1, 0)), Vector((1, 0, 0)))   # lying flat, tines away from her
G_HOME = glass_M(GLASS_HOME, 0.0)
if DBOX[0] > GLASS_HOME.x - GLASS_R - 0.001 or DBOX[1] < L_PT.x + 0.004:
    print("DESK WARN table too narrow for glass / left hand: table x %.4f..%.4f need %.4f..%.4f" % (DBOX[0], DBOX[1], GLASS_HOME.x - GLASS_R - 0.001, L_PT.x + 0.004), flush=True)
# the dinner set (tortilla with one slice gone, bread, salad) in the middle of the table, clear of her plate and mum's place
ax0, ax1 = DBOX[0] + 0.003, MUM_PLATE.x - 0.0045 - 0.002
ay0, ay1 = DBOX[2] + 0.002, PL.y - PLATE_R - 0.0015
TRAY_D = max(0.012, min(TRAY_MAX, ax1 - ax0, ay1 - ay0))
TRAY_AT = ((ax0 + ax1) / 2, (ay0 + ay1) / 2)
tray_root = None
if False:
    tray_root = E.place(f"{PROPS}/spain_dinner_set.glb", TRAY_D, (TRAY_AT[0], TRAY_AT[1], TOP + 0.0002), axis="long")
print("DESK DINNERSET size %.4f at %s (free x %.4f..%.4f y %.4f..%.4f)" % (TRAY_D, tuple(round(v, 4) for v in TRAY_AT), ax0, ax1, ay0, ay1), flush=True)
WIN_X = x_c - 0.050
# soup: two small bowls (hers left of her plate area, mum's in front of her place); fruit bowl in the middle
soup_m = E.felt("soup", (0.90, 0.55, 0.20)); bowl_m = E.mat("bowl", (0.96, 0.95, 0.90), 0.35)
for k, (bx, by) in enumerate(((TRAY_AT[0] - 0.006, TRAY_AT[1]), (TRAY_AT[0] + 0.009, TRAY_AT[1] + 0.002))):
    E.cyl((bx, by, TOP + 0.0018), 0.0034, 0.0034, bowl_m, verts=24, name="soupBowl%d" % k)
    E.cyl((bx, by, TOP + 0.0034), 0.0029, 0.0004, soup_m, verts=24, name="soupTop%d" % k)
fx, fy = TRAY_AT[0] + 0.001, TRAY_AT[1] - 0.007
E.cyl((fx, fy, TOP + 0.0012), 0.0045, 0.0022, E.felt("fruitBowl", (0.30, 0.55, 0.80)), verts=24, name="fruitBowl")
for k, (dx, dy, c) in enumerate(((-0.0015, 0.0, (1.0, 0.55, 0.05)), (0.0016, 0.0006, (1.0, 0.55, 0.05)), (0.0, -0.0016, (0.55, 0.15, 0.45)), (0.0004, 0.0014, (0.85, 0.85, 0.15)))):
    E.ball((fx + dx, fy + dy, TOP + 0.0034), 0.0014, E.felt("fruit%d" % k, c), "fruit")
CLOCK = (DBOX[1] + 0.014, 0.238, FLOOR + CLOCK_Z)

room(WIN_X); outside(WIN_X); clock(CLOCK[0], CLOCK[1], CLOCK[2], 2, 0)
pendant((DBOX[0] + DBOX[1]) / 2, (DBOX[2] + DBOX[3]) / 2)
L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.5"))
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); frontl = bpy.context.object      # soft warm room light from the front
frontl.data.energy = env("FRONT", "1.8"); frontl.data.color = (1, 0.88, 0.72); frontl.data.size = 0.5; frontl.rotation_euler = (math.radians(25), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.40, 0.30)); moon = bpy.context.object        # cool night light on the balcony and the street
moon.data.energy = 3.0; moon.data.color = (1.0, 0.95, 0.85)      # afternoon sun through the window; moon.data.size = 0.35; moon.rotation_euler = (math.radians(-55), 0, 0)

make_plate(PL, PLATE_R, "herPlate"); make_plate(MUM_PLATE, 0.0040, "mumPlate")
piece, PIECE_C = make_tortilla(PL + Vector((0, -0.0004, PLATE_T)))
fork = make_fork(); glass = make_glass()
set_M(fork, F_REST, 0); set_M(glass, G_HOME, 0)


def mum_targets():
    """11/21 check: her hands could not reach the table from the chair her knees need (need 0.026, arm 0.021). Her hands now rest
    palms down on her thighs (lap), fingers towards the knees and a little inward; she still nods at 'with my family'."""
    out = []
    for side, inward in (("Right", -1.0), ("Left", 1.0)):
        hip, knee = wpt(chm, side + "UpLeg"), wpt(chm, side + "Leg")
        along = Vector((knee.x - hip.x, knee.y - hip.y, 0)).normalized()
        P = hip.lerp(knee, LAP_AT) + Vector((0, 0, MUM_UNDER + 0.0003))         # on top of the thigh (same depth as under it)
        out.append(PM.rest(side, P, (along + Rm * (0.25 * inward)).normalized()))
    return out[0], out[1]


def mum_head(t):
    """Smiles towards the camera side (yaw > 0 = her left); in SP2 she nods to the girl at 'with my family'."""
    base = (0, 18, -3)
    if SHOT == "SP1": return base if t < VOICE["a"] - 0.2 else (0, 4, -2)          # looks at her daughter while she answers
    if SHOT == "SP2" and FAMILY0 - 0.1 <= t < FAMILY1 + 0.3:
        u = (t - FAMILY0 + 0.1) / (FAMILY1 - FAMILY0 + 0.4)
        return (0, -8, -3 - 10 * math.sin(math.pi * min(1.0, u * 1.6)))          # turns to the girl and nods once
    return base


PM.learn_hands((0, 18, -3))
MR, ML = mum_targets()
PM.body(0, P_LAP, (0, 18, -3))
for _s, _g in (("Right", MR), ("Left", ML)):     # hands on her lap: always within reach, printed as a check
    ik_arm(chm, _s, _g[1], _g[3]); _need, _arm = ik_arm.last
    print("DESK REACH mum setup %s (hand on her lap) need %.4f arm %.4f %s" % (_s, _need, _arm, "" if _need < 0.98 * _arm else "WARN her hand cannot reach her lap"), flush=True)
MUM_LAP = (MR[1] + ML[1]) / 2


def mum_frame(t, fr):
    PM.solve(t, fr, mum_head(t), MR, ML)


if SHOT == "SP1":
    # the traveller asks; the girl, standing behind the table beside her chair, points at the clock (nine fifteen) with the clock-side hand
    GS = (SBOX[0] - 0.011, max((SBOX[2] + SBOX[3]) / 2, DB + M_["front"] + 0.003))
    ch.at(0, loc=GS)
    GL, GF = (DBOX[0] - 0.035, DBOX[2] - 0.028), 35
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.6, VOICE["a"], VOICE["a"] + 2.6
    pt = Vector(local_dir(GS, GIRL_F, CLOCK, FLOOR + PUPIL * 0.62)).normalized()
    use_right = pt.x < 0                      # -x is her right: pick the hand on the clock side (the left one here)
    sg = -1 if use_right else 1
    pt.x = sg * max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    side = "Right" if use_right else "Left"
    print("DESK SP1 clock %s girl %s point_dir %s hand %s" % (tuple(round(v, 4) for v in CLOCK), tuple(round(v, 4) for v in GS), tuple(round(v, 3) for v in pt), side), flush=True)
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms, head = dict(E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=use_right), **point_arm((pt.x, pt.y, pt.z + 0.06 * k), use_right)), (0, (6 * sg) if t < ans1 else 0, 6 if t < ans1 else 2)
        else:
            arms, head = E.P_stand(), (0, 0, -4)              # he/she: no traveller; she looks at the table
        ch.pose(t, arms, twist={"Head": head})
        rest_hand(ch, side)
        if t < ans0 - 0.15: key_hand(ch, side, fr)
        if t >= ans0 - 0.15:
            point_hand(ch, side, CLOCK); curl(ch, side, G_POINT); tuck_thumb(ch, side); key_hand(ch, side, fr)
    ch.finish()
    for fr in E.frames(): mum_frame(fr / E.FPS, fr)
    chm.finish()

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)      # looks up at the clock
        return E.P_stand(), (0, 14, 0)
    pass                                                   # he/she: no traveller in the picture
    aim0 = Vector(((DBOX[0] + DBOX[1]) / 2 + 0.012, 0.05, 0.075))
    cam_move(42, aim0 + Vector((-0.02, -0.52, 0.075)), aim0, aim0 + Vector((-0.01, -0.45, 0.065)), aim0 + Vector((0, 0, 0.002)),
             focus=((DBOX[0] + DBOX[1]) / 2, DBOX[2] - 0.01, 0.06))
    for o in (fork, glass, piece): E.constant(o)
    view_report("SP1", [("clock", CLOCK), ("girl_head", lambda: wpt(ch, "Head")), ("mum_head", lambda: wpt(chm, "Head")),
                        ("table_front", ((DBOX[0] + DBOX[1]) / 2, DBOX[2], TOP))])

else:
    # ---------- seated behind the table, facing the camera ----------
    lean_shift = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
    hy = HY                     # tummy at the table edge; the code chair was placed for this
    P = Sit(ch, M_, (x_c, hy), SEAT_Z, LEAN, 0)
    P.learn_hands(HEAD0)
    mouth0 = mouth(ch)
    P.body(0, P_LAP, HEAD_BITE); mouth_bite = mouth(ch)
    P.body(0, P_LAP, HEAD_SIP); mouth_sip = mouth(ch)
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
    if _lt is None: print("DESK LEGS girl mesh: no leg skin under the table edge", flush=True)
    else: knee_room("girl mesh (legs posed)", _lt, TM["under_back"])
    L_FLAT = P.rest("Left", L_PT, (-0.25, -1, 0))          # left hand flat beside the plate, thumb towards her middle

    # --- FORK, right hand (European grip): palm down, index along the back of the handle, thumb on the inner (+x) side ---
    Mh = P.calibrate("Right", hand_q(ch, "Right", Vector((0.15, -1, -0.35)), Vector((0, 0.1, -1))), G_FORK, HEAD0)
    it, ib = wpt(ch, "RightHandIndex3", True), wpt(ch, "RightHandIndex1")
    d_ = (it - ib).normalized()
    _w, _f, _a, _p = hand_frame(ch, "Right"); palm_w = world_vec(ch, _p); acr_w = world_vec(ch, _a)
    tip0 = it + d_ * FORK_OUT + palm_w * 0.0004
    C_FORK = Mh.inverted() @ frame_M(tip0, -d_, acr_w)
    thumb_side = (wpt(ch, "RightHandThumb3", True) - ib).dot(acr_w)
    print("DESK GRIP fork index_len %.4f palm %s thumb_side %+.4f (> 0: thumb on the index / inner side) fingers_vs_fork %.0f deg" % (
        (it - ib).length, tuple(round(v, 2) for v in palm_w), thumb_side, math.degrees(d_.angle((wpt(ch, "RightHandMiddle1") - wpt(ch, "RightHand")).normalized()))), flush=True)
    # --- GLASS, right hand: palm towards her middle (+x), fingers round the camera side, thumb on the chest side ---
    Mh = P.calibrate("Right", hand_q(ch, "Right", Vector((0.15, -1, 0.05)), Vector((1, 0.1, 0))), G_GLASS, HEAD0)
    _w, _f, _a, _p = hand_frame(ch, "Right"); palm_g = world_vec(ch, _p)
    pc = (wpt(ch, "RightHand") + wpt(ch, "RightHandMiddle1")) / 2
    gc = pc + palm_g * (GLASS_R + 0.0007)
    C_GLASS = Mh.inverted() @ frame_M(Vector((gc.x, gc.y, gc.z - GLASS_H * 0.40)), Vector((0, 0, 1)), Vector((1, 0, 0)))
    print("DESK GRIP glass palm %s thumb_y_from_glass %+.4f (> 0: thumb on her chest side)" % (
        tuple(round(v, 2) for v in palm_g), (wpt(ch, "RightHandThumb3", True) - gc).y), flush=True)
    P.body(0, P_LAP, HEAD0)

    # after the bite the fork waits over the plate in the spear pose (11/20: natural), 11/21: 3 mm further out and only 2 mm up -
    # the old hold (spear pose + 3 mm up) put the wrist 4 mm from her shoulder (DESK REACH need 0.0044) and the forearm corkscrewed
    HOLD_M = Tr(0, -env("HOLD_DY", "0.0030"), env("HOLD_DZ", "0.0008")) @ frame_M(PIECE_C, Z_SPEAR, Vector((1, 0, 0)))

    def fork_now():
        return hand_M(ch, "Right") @ C_FORK

    def glass_now():
        return hand_M(ch, "Right") @ C_GLASS

    def chew(t, t0, base):
        """Two small chewing nods after the bite (the model's mouth is not drawn)."""
        if t0 <= t < t0 + 0.68: return (base[0], base[1], base[2] + (5 if int((t - t0) / 0.17) % 2 else 0))
        return base

    if SHOT == "SP2":
        GRAB, SPEAR, MOUTH_T = 0.9, 1.45, 2.45
        F_SPEAR = frame_M(PIECE_C, Z_SPEAR, Vector((1, 0, 0)))
        F_MOUTH = frame_M(mouth_bite + BITE_D, Z_MOUTH, Vector((0, 1, 0)))
        F_HOLD = HOLD_M
        FK = [(GRAB, F_REST), (GRAB + 0.12, Tr(0, 0, 0.0018) @ F_REST), (1.25, Tr(0, 0, 0.0025) @ F_SPEAR), (SPEAR, F_SPEAR),
              (1.65, Tr(0, 0, 0.0022) @ F_SPEAR), (2.2, Tr(-0.0045, -0.0030, -0.0035) @ F_MOUTH), (MOUTH_T, F_MOUTH), (2.65, F_MOUTH),
              (3.05, F_HOLD), (9.0, F_HOLD)]
        R_START = P.from_prop("Right", Tr(0.0004, 0.0008, 0.0024) @ F_REST, C_FORK, G_RELAX)     # open hand just above the fork handle
        R_PRE = P.from_prop("Right", Tr(0, 0, 0.0012) @ F_REST, C_FORK, G_FORK_OPEN)

        def right(t):
            if t < 0.35: return R_START
            if t < 0.75: return tblend(R_START, R_PRE, (t - 0.35) / 0.4)
            if t < GRAB: return tblend(R_PRE, P.from_prop("Right", F_REST, C_FORK, G_FORK), (t - 0.75) / (GRAB - 0.75))
            return P.from_prop("Right", key_M(FK, t), C_FORK, G_FORK)

        def head(t):
            if t < 0.3: return HEAD0
            if t < 1.75: return (0, -2, -12)                                   # looks down at the plate
            if t < MOUTH_T + 0.25: return HEAD_BITE
            if t < MOUTH_T + 0.3: return HEAD0
            if t < FAMILY0 - 0.05: return chew(t, MOUTH_T + 0.3, HEAD0)
            if t < FAMILY1 + 0.35: return (0, 14, -2)                          # eyes and head a little to mum (her left), face still to the camera
            return HEAD0
        piece_on, piece_C, eaten, grabbed = None, None, None, False
        for fr in E.frames():
            t = fr / E.FPS
            P.solve(t, fr, head(t), right(t), L_FLAT)
            Mf = F_REST if t < GRAB else fork_now()
            if t >= GRAB and not grabbed:          # the fork moves from here on: the hand must really be on it
                grabbed = True; e_ = (Mf.translation - F_REST.translation).length
                print("CONTACT SP2 grab t=%.2f fork_jump %.4f %s" % (t, e_, "" if e_ < 0.0006 else "WARN hand did not reach the fork"), flush=True)
            set_M(fork, Mf, fr)
            tip = Mf.translation; m_ = mouth(ch)
            # the bite: still on the plate until the tines reach it, then rigid on the fork, gone once it touches her lips
            if piece_on is None and t >= SPEAR - 0.1 and ((tip - PIECE_C).length < 0.0012 or t >= SPEAR + 0.12):
                piece_on = t; piece_C = Mf.inverted() @ Matrix.Translation(PIECE_C)
                print("CONTACT SP2 spear t=%.2f tip_to_bite %.4f %s" % (t, (tip - PIECE_C).length, "" if (tip - PIECE_C).length < 0.0012 else "WARN forced"), flush=True)
            if piece_on is None:
                pm = Matrix.Translation(PIECE_C)
            else:
                pm = Mf @ piece_C
                if eaten is None and t >= MOUTH_T - 0.15 and ((pm.translation - m_).length < 0.0018 or t >= MOUTH_T + 0.15):
                    eaten = t
                    print("CONTACT SP2 bite t=%.2f bite_to_lips %.4f %s" % (t, (pm.translation - m_).length, "" if (pm.translation - m_).length < 0.0018 else "WARN forced"), flush=True)
            if eaten is not None: pm = Matrix.Translation((0, 0, -1))
            set_M(piece, pm, fr)
            set_M(glass, G_HOME, fr)
            if fr % 4 == 0:
                print("CONTACT SP2 t=%.2f fork_tip_to_target %.4f tip_to_mouth %.4f tip_to_table %.4f" % (
                    t, (tip - key_M(FK, t).translation).length if t >= GRAB else 0.0, (tip - m_).length, tip.z - TOP), flush=True)
                # hand and fork handle must stay out of the glass (11/21 check 4)
                gc_ = G_HOME.translation; pts = [wpt(ch, "RightHand%s" % b, True) for b in ("Index3", "Middle3", "Ring3", "Pinky3", "Thumb3")]
                pts += [wpt(ch, "RightHand"), wpt(ch, "RightHandMiddle1")]
                ax_ = Mf.to_3x3().normalized().col[2]
                pts += [Mf.translation + ax_ * (FORK_L * k / 6.0) for k in range(7)]
                gap = min(((Vector((p_.x, p_.y, 0)) - Vector((gc_.x, gc_.y, 0))).length - GLASS_R) if p_.z < gc_.z + GLASS_H + 0.0005 else 9.0 for p_ in pts)
                print("CONTACT SP2 t=%.2f hand_fork_to_glass %.4f%s" % (t, gap, "  WARN hand or fork in the glass" if gap < 0.0003 else ""), flush=True)
            mum_frame(t, fr)
        ch.finish(); chm.finish()
        for o in (fork, piece, glass): E.constant(o)

    elif SHOT == "SP3":
        REL_FORK, GRAB_G, LET_G = 0.5, 1.2, 2.8
        F_HOLD = HOLD_M
        FK3 = [(0.0, F_HOLD), (0.28, Tr(0, 0, 0.0018) @ F_REST), (0.48, F_REST)]
        lips = mouth_sip + SIP_D; r10 = math.radians(10); up = Vector((0, 0, 0.0018))
        side_off = Vector((-0.0035, -0.0020, -0.0030))         # comes up beside her right cheek, then to the lips: never from below the face
        GK = [(0.0, GLASS_HOME), (GRAB_G, GLASS_HOME), (1.38, GLASS_HOME + up), (1.72, base_for(lips + side_off, r10)), (1.88, base_for(lips, r10)),
              (2.0, base_for(lips, SIP_TILT)), (2.3, base_for(lips, SIP_TILT)), (2.42, base_for(lips, r10)), (2.55, base_for(lips + side_off, r10)),
              (2.7, GLASS_HOME + up), (2.78, GLASS_HOME), (9.0, GLASS_HOME)]
        TK = [(0.0, 0.0), (1.38, 0.0), (1.72, r10), (1.88, r10), (2.0, SIP_TILT), (2.3, SIP_TILT), (2.42, r10), (2.55, r10), (2.7, 0.0), (9.0, 0.0)]
        glass_target = lambda t: glass_M(lerp_keys(GK, t), lerp_keys(TK, t))
        FORK_OFF = P.from_prop("Right", Tr(-0.0008, 0.0004, 0.0018) @ F_REST, C_FORK, G_RELAX)
        GLASS_PRE = P.from_prop("Right", Tr(-0.0012, 0.0004, 0.0006) @ G_HOME, C_GLASS, G_GLASS_OPEN)
        GLASS_GRAB = P.from_prop("Right", G_HOME, C_GLASS, G_GLASS)
        GLASS_OFF = P.from_prop("Right", Tr(-0.0014, 0.0005, 0.0010) @ G_HOME, C_GLASS, G_RELAX)

        def right(t):
            if t < REL_FORK: return P.from_prop("Right", key_M(FK3, t), C_FORK, G_FORK)
            if t < REL_FORK + 0.2: return tblend(P.from_prop("Right", F_REST, C_FORK, G_FORK), FORK_OFF, (t - REL_FORK) / 0.2)
            if t < 1.05: return tblend(FORK_OFF, GLASS_PRE, (t - REL_FORK - 0.2) / (1.05 - REL_FORK - 0.2))
            if t < GRAB_G: return tblend(GLASS_PRE, GLASS_GRAB, (t - 1.05) / (GRAB_G - 1.05))
            if t <= LET_G: return P.from_prop("Right", glass_target(t), C_GLASS, G_GLASS)
            return tblend(GLASS_GRAB, GLASS_OFF, (t - LET_G) / 0.2)

        def head(t):
            if t < 1.2: return (0, -3, -10)                       # watches her hand put the fork down and take the glass
            if t < 1.65: return HEAD0
            if t < 2.45: return HEAD_SIP
            return HEAD0
        last_f, last_g, said = None, None, set()
        for fr in E.frames():
            t = fr / E.FPS
            P.solve(t, fr, head(t), right(t), L_FLAT)
            if t < REL_FORK:
                Mf = fork_now(); last_f = Mf
            else:                                              # let go on the table: it settles flat in its place
                if "rel" not in said and last_f is not None:
                    said.add("rel"); print("CONTACT SP3 fork_release t=%.2f tip_above_table %.4f off_rest %.4f" % (
                        t, last_f.translation.z - TOP, (last_f.translation - F_REST.translation).length), flush=True)
                u = min(1.0, (t - REL_FORK) / 0.12); Mf = blend_M(last_f, F_REST, u) if last_f is not None else F_REST
            set_M(fork, Mf, fr)
            if t >= GRAB_G and "grab" not in said:
                said.add("grab"); e_ = (glass_now().translation - GLASS_HOME).length
                print("CONTACT SP3 glass_grab t=%.2f glass_jump %.4f %s" % (t, e_, "" if e_ < 0.0006 else "WARN hand did not reach the glass"), flush=True)
            if t > LET_G and "let" not in said and last_g is not None:
                said.add("let"); print("CONTACT SP3 glass_release t=%.2f bottom_above_table %.4f off_home %.4f" % (
                    t, last_g.translation.z - TOP, (last_g.translation - GLASS_HOME).length), flush=True)
            if GRAB_G <= t <= LET_G:
                Mg = glass_now(); last_g = Mg
            elif t > LET_G:
                u = min(1.0, (t - LET_G) / 0.12); Mg = blend_M(last_g, G_HOME, u) if last_g is not None else G_HOME
            else:
                Mg = G_HOME
            set_M(glass, Mg, fr)
            set_M(piece, Matrix.Translation((0, 0, -1)), fr)
            if fr % 4 == 0:
                m_ = mouth(ch); rim = Mg @ RIM
                print("CONTACT SP3 t=%.2f fork_tip_to_table %.4f fork_off_rest %.4f glass_rim_to_lips %.4f rim_below_mouth %.4f glass_bottom_to_table %.4f glass_off_target %.4f" % (
                    t, Mf.translation.z - TOP, (Mf.translation - F_REST.translation).length, (rim - m_).length, m_.z - rim.z,
                    Mg.translation.z - TOP, (Mg.translation - glass_target(t).translation).length), flush=True)
            mum_frame(t, fr)
        ch.finish(); chm.finish()
        for o in (fork, piece, glass): E.constant(o)

    else:
        # SP4: waves to the traveller with her right hand (palm to the front, thumb towards her face), left hand flat; mum smiles
        W0 = 0.3
        R_OFF = P.from_prop("Right", Tr(-0.0014, 0.0005, 0.0010) @ G_HOME, C_GLASS, G_RELAX)
        Q_WAVE = hand_q(ch, "Right", Vector((-0.1, -0.1, 1)), Vector((0.05, -1, 0.1)))
        HEAD_W = (8, 0, 6)           # he/she SP4: resting after lunch, head tilted, a little back
        for fr in E.frames():
            t = fr / E.FPS
            P.body(t, P_LAP, HEAD_W)
            left = ik_arm(ch, "Left", L_FLAT[1], L_FLAT[3])
            r_ik = ik_arm(ch, "Right", R_OFF[1], R_OFF[3])
            if True: rdirs = r_ik      # he/she: no wave, both hands resting
            elif t < W0 + 0.3: rdirs = blend_dirs(r_ik, wave_dirs(W0 + 0.3), (t - W0) / 0.3)
            else: rdirs = wave_dirs(t)
            P.body(t, {**rdirs, **left}, HEAD_W)
            turn_hand(ch, "Left", L_FLAT[0], fr); curl(ch, "Left", G_FLAT)
            if True:
                turn_hand(ch, "Right", R_OFF[0], fr); curl(ch, "Right", G_RELAX)
            else:
                turn_hand(ch, "Right", Q_WAVE, fr); curl(ch, "Right", G_WAVE)
            key_hand(ch, "Left", fr); key_hand(ch, "Right", fr)
            set_M(fork, F_REST, fr); set_M(glass, G_HOME, fr); set_M(piece, Matrix.Translation((0, 0, -1)), fr)
            if fr % 12 == 0:
                hr = wpt(ch, "RightHandMiddle1"); hd = wpt(ch, "Head")
                print("CONTACT SP4 t=%.2f wave_hand_outside_face_x %.4f hand_above_shoulder %.4f" % (t, hd.x - hr.x, hr.z - SHR.z), flush=True)
            mum_frame(t, fr)
        ch.finish(); chm.finish()
        for o in (fork, piece, glass): E.constant(o)

    # ---------- cameras ----------
    if False:
        GLT = (DBOX[0] - 0.030, DBOX[2] + 0.006)

        def trav(t):
            if t >= 1.0: return E.P_wave(int((t - 1.0) * 3) % 2), (0, -16, 0)       # waves back
            return E.P_stand(), (0, -16, 0)
        stand("traveler_girl", GLT, 55, trav, height=GIRL)
    if CAMSUB not in ("main", "C", "S") and tray_root is not None:
        hide([tray_root])        # the dinner set would stand between a hand camera and the hand
    if CAMSUB in ("HL", "HL2"):
        hide([chm.root])         # mum would stand between the left-side camera and the girl's left hand
    pick = (PIECE_C + mouth0) / 2; sip = (GLASS_HOME + Vector((0, 0, GLASS_H)) + mouth0) / 2
    mumh = MUM_LAP + Vector((0, 0, 0.001))              # 11/21: her hands are on her lap now
    HANDCAM = {   # aim, camera offset, lens. Her right hand is on the -x side; DOF off.
        "HF": ((pick if SHOT == "SP2" else sip), Vector((-0.07, -0.12, 0.04)), 150),     # front-3/4 from her right front
        "HS": ((pick if SHOT == "SP2" else sip), Vector((-0.14, -0.01, 0.02)), 150),     # her right side
        "HL": (L_PT + Vector((0, 0, 0.001)), Vector((0.07, -0.12, 0.05)), 190),          # left hand, front-left
        "HL2": (L_PT + Vector((0, 0, 0.001)), Vector((0.14, -0.01, 0.03)), 190),         # left hand, her left side
        "MF": (mumh, Vector((0.02, -0.12, 0.07)), 170),                                   # mum's hands on her lap from the front, above
        "MS": (mumh, Vector((0.03, -0.14, 0.012)), 170),                                  # mum's hands on her lap, low from the camera side
        # legs ON the seat, never through it (UK 11/20): side at seat height + low front-left
        "L": (Vector((x_c, HY - 0.004, SEAT_Z + 0.005)), Vector((-0.17, 0.0, 0.004)), 190),
        "L2": (Vector((x_c, SBOX[2], SEAT_Z + 0.003)), Vector((0.06, -0.13, 0.0)), 190)}
    if CAMSUB in HANDCAM:
        aim, off, lens = HANDCAM[CAMSUB]
        cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    elif CAMSUB in ("C", "S"):
        hand_pt = pick if SHOT != "SP3" else sip
        aim = Vector((hand_pt.x, hand_pt.y + 0.001, hand_pt.z))
        off = Vector((-0.085, -0.11, 0.022)) if CAMSUB == "C" else Vector((-0.14, -0.018, 0.012))
        cam_move(115, aim + off, aim, aim + off, aim)
    elif SHOT in ("SP2", "SP3"):     # table from the front: the whole seated girl (legs, shoes on the floor), mum on the right, dinner set
        aim = Vector(((x_c + hm.x) / 2 - 0.004, DB - 0.004, (FLOOR + mouth0.z + 0.012) / 2))
        cam_move(52, aim + Vector((-0.02, -0.30, 0.062)), aim, aim + Vector((-0.018, -0.285, 0.058)), aim, focus=(x_c, DB - 0.004, TOP))
    else:                            # SP4: girl, mum, the traveller at the left, the whole dinner set; clock top right
        aim = Vector((x_c + 0.012, DB - 0.006, (mouth0.z + TOP) / 2 + 0.014))
        cam_move(44, aim + Vector((0.02, -0.33, 0.012)), aim, aim + Vector((0.02, -0.33, 0.012)), aim, focus=mouth0)
    print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
    if CAMSUB == "main":
        view_report(SHOT, [("clock", CLOCK), ("girl_mouth", lambda: mouth(ch)), ("mum_head", lambda: wpt(chm, "Head")), ("left_shoe", lambda: wpt(ch, "LeftFoot")),
                           ("dinner_set", (TRAY_AT[0], TRAY_AT[1], TOP))])

E.run(A[3:])
