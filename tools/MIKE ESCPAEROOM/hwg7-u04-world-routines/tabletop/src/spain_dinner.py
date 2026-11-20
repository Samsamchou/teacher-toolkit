# World Routines Trip - Spain station "I have dinner at nine fifteen." (tabletop style H)
# blender -b --factory-startup --python spain_dinner.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: SP1 (5.6 s) wide, night dining room: the traveller asks; the girl stands behind the table beside her chair and points at
#             the 9:15 wall clock (top right) with her LEFT hand; mum already sits at the right end of the table, hands flat.
#         SP2 (5.0 s) seated close shot (legs hang down, feet on the floor, mum on the right): her RIGHT hand picks up the fork
#             (European grip, tines down), spears the cut bite of tortilla, brings it to her RIGHT mouth corner from the right side,
#             the bite goes when it touches the lips, two chewing nods; "with my family": she looks at mum, mum nods.
#         SP3 (3.0 s) same camera: fork back on the table right of the plate (released on the table), right hand takes the glass of
#             water by its side (palm towards her middle, thumb on the chest side), a sip at the lower lip, glass back (released on the table).
#         SP4 (7.6 s) she waves to the traveller with her right hand, face to the camera; mum smiles; clock top right.
#   Check cameras (same action, another camera; the first three letters pick the action):
#         SP2C SP3C close front-right, SP2S SP3S her right side
#         sharp hand cameras (no depth of field, long lens):
#           SP2HF SP2HS   fork: front-3/4 and her right side, aimed between the plate and the mouth
#           SP3HF SP3HS   glass: front-3/4 and her right side, aimed between the glass and the mouth
#           SP2HL SP2HL2  her flat left hand: front-left and her left side (mum hidden)
#           SP2MF SP2MS   mum's flat hands: from the front above and low from the camera side
# Models: spain_girl (rigged), spain_mum (rigged, adult), traveler_girl, spain_dining_set (table + chair behind it + chair at the
#   right end, one model), spain_dinner_set (tray: tortilla with one slice missing, bread basket, salad; still), spain_balcony.
# Made here: the room (white plaster, azulejo tile dado, terracotta floor, French window), the night city outside, pendant lamp,
#   9:15 clock, her plate + tortilla slice + the cut bite, fork, glass of water, mum's empty plate.
# Hands: shared helpers from hands.py (PALM_SIGN right -1 / left +1, hand_frame, curl, ik_arm, key_hand, lerp_keys).
#   Props held in a hand are rigid to the hand bone (method of uk_homework.py): prop = hand_matrix @ C, C measured once with the
#   grip curled; the wanted prop pose gives the wanted hand pose (two-bone IK for the wrist, hand turned, fingers curled); the prop is
#   drawn from the hand that was actually reached, so a short arm shows in the CONTACT lines, never as a floating prop.
#   Props move only after the hand touches them and stay in the hand until they touch the table again.
# Measurement lines (kept by colab_run.py): DESK (furniture probe, fit, body, reach, view), CONTACT (fork, bite, glass, release).
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
# shot lengths and voice start times (seconds): keep in step with spain_compose.py
DUR = {"SP1": 5.6, "SP2": 5.0, "SP3": 3.0, "SP4": 7.6}
VOICE = {"q": 0.4, "a": 2.6, "eat": 0.5, "late": 0.5}
# word times inside the lines (audio/spain_words.json): eat "tortilla" 0.70-1.51, "salad" 1.78-2.37, "with my family" 2.38-3.43;
#   a "nine fifteen" 1.39-2.58; late "It's late" 3.57-4.35
FAMILY0, FAMILY1 = VOICE["eat"] + 2.38, VOICE["eat"] + 3.43
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
FORK_L = env("FORK_L", "0.0105")
FORK_OUT = env("FORK_OUT", "0.0038")       # GUESS: fork tip this far beyond the index fingertip
GLASS_R, GLASS_H = 0.0021, 0.0040
WEDGE_T = 0.0015
BITE_D = Vector((env("BITE_DX", "-0.0010"), env("BITE_DY", "-0.0004"), env("BITE_DZ", "-0.0003")))   # right mouth corner from the lips centre
SIP_D = Vector((env("SIP_DX", "-0.0004"), env("SIP_DY", "-0.0003"), env("SIP_DZ", "-0.0006")))      # glass rim on the lower lip
SIP_TILT = math.radians(env("SIP_TILT", "28"))
TRAY_MAX = env("TRAY_MAX", "0.030")
HEAD0 = (0, 0, -4)
HEAD_BITE = (0, -6, -8)          # (roll, yaw, pitch): yaw < 0 turns to her right (towards the fork), pitch < 0 bows
HEAD_SIP = (0, -5, 3)
Z_SPEAR = Vector((-0.35, 0.55, 0.75)).normalized()     # fork axis tip -> handle while spearing: handle up, back and to her right
Z_MOUTH = Vector((-0.85, -0.20, -0.45)).normalized()   # at the mouth: handle out to her right, a little forward and down
Z_HOLD = Vector((-0.30, 0.60, 0.60)).normalized()


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
    q = M0.to_3x3().normalized().to_quaternion().slerp(M1.to_3x3().normalized().to_quaternion(), u)
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
    E.box((0, 0.68, 0.25), (1.6, 0.004, 0.7), E.emission("nightSky", (0.05, 0.08, 0.22), 1.0), "sky", bevel=0)
    for i in range(14):
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


# ---------- furniture probing (rays straight down; several hits per column so a seat under the table top is found) ----------
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
    return cols, top


def level(pts, top, lo, hi):
    """The flat level with the most upward hits between lo*top and hi*top. Returns (z, points on it)."""
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


def two_groups(pts):
    """Split seat points into two chairs (2-means in x, y, started from the two points furthest apart)."""
    a = max(pts, key=lambda p: p[0] + p[1]); b = max(pts, key=lambda p: (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
    ca, cb = (a[0], a[1]), (b[0], b[1]); ga, gb = pts, []
    for _ in range(12):
        ga = [p for p in pts if (p[0] - ca[0]) ** 2 + (p[1] - ca[1]) ** 2 <= (p[0] - cb[0]) ** 2 + (p[1] - cb[1]) ** 2]
        gb = [p for p in pts if p not in ga]
        if not ga or not gb: break
        ca = (sum(p[0] for p in ga) / len(ga), sum(p[1] for p in ga) / len(ga)); cb = (sum(p[0] for p in gb) / len(gb), sum(p[1] for p in gb) / len(gb))
    return ga, gb


def rot2(v, a):
    c, s = math.cos(a), math.sin(a); return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)


def probe_set():
    """Table top level and box; the two chair seats (the one behind the table for the girl, the one at an end for mum);
    the turn (and mirror) that puts the girl's chair at +y and mum's chair at +x; the way mum's chair faces."""
    cols, top = probe(f"{PROPS}/spain_dining_set.glb")
    first = [(x, y, hs[0][0]) for x, y, hs in cols if hs and hs[0][1] > 0.7]
    allup = [(x, y, z) for x, y, hs in cols for z, nz in hs if nz > 0.7]
    dz, dp = level(first, top, 0.45, 1.001)
    sz, sp = level([p for p in allup if p[2] < dz - 0.08 * top], top, 0.12, 0.9)
    db = bbox2(dp); dc = ((db[0] + db[1]) / 2, (db[2] + db[3]) / 2)
    ga, gb = two_groups(sp) if len(sp) > 10 else (sp, [])
    if len(ga) < 5 or len(gb) < 5:
        print("DESK WARN found %d + %d seat points: guessing the two chairs" % (len(ga), len(gb)), flush=True)
        w, d = db[1] - db[0], db[3] - db[2]
        ga = [(dc[0] - 0.12 * w, db[3], sz), (dc[0] + 0.12 * w, db[3] + 0.3 * d, sz)]
        gb = [(db[1] + 0.05 * w, dc[1] - 0.15 * d, sz), (db[1] + 0.3 * w, dc[1] + 0.15 * d, sz)]
    long_x = (db[1] - db[0]) >= (db[3] - db[2])
    cen = lambda g: (sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g))
    along = lambda g: abs(cen(g)[0] - dc[0]) if long_x else abs(cen(g)[1] - dc[1])
    end_g, back_g = (ga, gb) if along(ga) > along(gb) else (gb, ga)
    ob = (cen(back_g)[0] - dc[0], cen(back_g)[1] - dc[1]); oe = (cen(end_g)[0] - dc[0], cen(end_g)[1] - dc[1])
    rot = max((k * math.pi / 2 for k in range(4)), key=lambda a: rot2(ob, a)[1] - 0.5 * abs(rot2(ob, a)[0]))
    mirror = rot2(oe, rot)[0] < 0                 # mum's chair would be on the left: mirror the model in x
    if mirror: rot = -rot                         # world = MirrorX @ R(rot) = R(-rot) @ MirrorX (Blender applies scale before rotation)
    # mum's chair: the way it faces = from its back (high parts outside the table box) to its seat centre
    eb = bbox2(end_g); ec = cen(end_g); grow = 0.6 * max(eb[1] - eb[0], eb[3] - eb[2])
    backs = [p for p in first if eb[0] - grow < p[0] < eb[1] + grow and eb[2] - grow < p[1] < eb[3] + grow and p[2] > sz + 0.3 * (dz - sz)
             and not (db[0] - 0.002 < p[0] < db[1] + 0.002 and db[2] - 0.002 < p[1] < db[3] + 0.002)]
    if len(backs) >= 3:
        bc = cen(backs); fv = Vector((ec[0] - bc[0], ec[1] - bc[1], 0))
    else:
        print("DESK WARN no back found for mum's chair: she faces the table centre", flush=True)
        fv = Vector((dc[0] - ec[0], dc[1] - ec[1], 0))
    fv = fv.normalized() if fv.length > 1e-6 else Vector((-1, 0, 0))
    info = dict(H0=0.1, top=top, desk_z=dz, desk_box=db, seat_z=sz, back_box=bbox2(back_g), end_box=eb, end_face=fv, rot=rot, mirror=mirror)
    print("DESK PROBE desk_z %.4f seat_z %.4f (model height %.3f) desk_box %s back_seat %s end_seat %s end_face %s turn %d mirror %s back_pts %d" % (
        dz, sz, top, tuple(round(v, 4) for v in db), tuple(round(v, 4) for v in info["back_box"]), tuple(round(v, 4) for v in eb),
        tuple(round(v, 3) for v in fv), round(math.degrees(rot)), mirror, len(backs)), flush=True)
    return info


def xf(info, Hh, p, at):
    k = Hh / info["H0"]; m = -1.0 if info["mirror"] else 1.0
    c, s = math.cos(info["rot"]), math.sin(info["rot"]); px, py = m * p[0] * k, p[1] * k
    return (at[0] + px * c - py * s, at[1] + px * s + py * c)


def xdir(info, v):
    m = -1.0 if info["mirror"] else 1.0; r = rot2((m * v[0], v[1]), info["rot"])
    return Vector((r[0], r[1], 0)).normalized()


def xbox(info, Hh, b, at):
    pts = [xf(info, Hh, (x, y), at) for x in b[:2] for y in b[2:]]
    return (min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts))


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
            set_hand_rot(ch, side, g[0]); curl(ch, side, g[2]); key_hand(ch, side, fr)


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
    egg = E.felt("tortilla", (0.98, 0.76, 0.30)); crust = E.felt("tortillaCrust", (0.80, 0.50, 0.16))
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
DI = probe_set()
# fit the table: top at her elbow when seated (the smaller of the two rules wins in uk_homework.py; here the elbow rule, like UK)
rd, rs = DI["desk_z"] / DI["H0"], DI["seat_z"] / DI["H0"]
e_el = SEAT_HIP + M_["sh_hips"] - M_["upper"] - ELBOW_DROP
seat_feet = M_["knee_h"] - SEAT_HIP - M_["upleg_dz"]
H_el, H_ft = e_el / max(1e-4, rd - rs), seat_feet / max(1e-4, rs)
DESK_H = H_el * DESK_K
desk_root = E.place(f"{PROPS}/spain_dining_set.glb", DESK_H, (TX, TY, FLOOR), rot_z=DI["rot"])
if DI["mirror"]:
    desk_root.scale = (-desk_root.scale[0], desk_root.scale[1], desk_root.scale[2])
bpy.context.view_layer.update()
TOP = FLOOR + rd * DESK_H; SEAT_Z = FLOOR + rs * DESK_H
DBOX = xbox(DI, DESK_H, DI["desk_box"], (TX, TY)); SBOX = xbox(DI, DESK_H, DI["back_box"], (TX, TY)); EBOX = xbox(DI, DESK_H, DI["end_box"], (TX, TY))


def pull_chair(root, dy, kc=1.0, z_cut=None):
    """(uk_homework.py) Her chair is tucked under the table top in the one Tripo model: cut it out by position - seat, legs and back
    between the seat's x edges, below the table-top underside or behind the table's back edge - and slide it dy along +y (her side)."""
    import bmesh
    x0, x1 = SBOX[0] - 0.004, SBOX[1] + 0.004
    z_cut = SEAT_Z + 0.6 * (TOP - SEAT_Z) if z_cut is None else z_cut
    n = 0
    for o in [root] + list(root.children_recursive):
        if o.type != "MESH": continue
        Mw = o.matrix_world; d_loc = Mw.inverted().to_3x3() @ Vector((0, dy, 0))
        bm = bmesh.new(); bm.from_mesh(o.data)

        def chair(f):
            for v in f.verts:
                w = Mw @ v.co
                if not (x0 < w.x < x1 and (w.z < z_cut or w.y > DBOX[3] + 0.0008)): return False
            return True
        faces = [f for f in bm.faces if chair(f)]
        n += len(faces)
        if faces:
            dup = bmesh.ops.duplicate(bm, geom=faces)
            Mi = Mw.inverted()
            for v in [g for g in dup["geom"] if isinstance(g, bmesh.types.BMVert)]:
                w = Mw @ v.co               # slide to her side, and lower her chair (heights x kc about the floor; mum's chair and the table keep theirs)
                v.co = Mi @ Vector((w.x, w.y + dy, FLOOR + (w.z - FLOOR) * kc))
            bmesh.ops.delete(bm, geom=faces, context="FACES")
        bm.to_mesh(o.data); bm.free(); o.data.update()
    print("DESK CHAIR pulled %d faces out by %.4f (x %.4f..%.4f, below z %.4f or behind y %.4f), heights x%.3f" % (n, dy, x0, x1, z_cut, DBOX[3] + 0.0008, kc), flush=True)


# 11/20 teacher (UK film): a seat above the knee makes the thighs hang down and the pupil looks like she stands behind the chair.
# Her seat goes down to her knee height (thighs flat, shins down, feet on the floor); the table stays (top at her chest, like Taiwan).
Z_CUT = SEAT_Z + 0.6 * (TOP - SEAT_Z)
SEAT_NEW = FLOOR + min(SEAT_Z - FLOOR, seat_feet)
MUM_SEAT_Z = SEAT_Z                       # mum's chair (same model height) is not lowered
KC = (SEAT_NEW - FLOOR) / (SEAT_Z - FLOOR); SEAT_Z = SEAT_NEW
_lean = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
CHAIR_DY = max(0.0, DBOX[3] + M_["front"] + GAP + _lean - (SBOX[2] + SBOX[3]) / 2) + env("CHAIR_EXTRA", "0.0")
if CHAIR_DY > 0.0005 or KC < 0.999:
    pull_chair(desk_root, CHAIR_DY, KC, Z_CUT)
    SBOX = (SBOX[0], SBOX[1], SBOX[2] + CHAIR_DY, SBOX[3] + CHAIR_DY)
E.obstacle(desk_root)
print("DESK FIT elbow_above_seat %.4f seat_for_feet %.4f H_elbow %.4f H_feet %.4f -> model height %.4f table_top %.4f seat %.4f (above floor) table %s her_seat %s mum_seat %s" % (
    e_el, seat_feet, H_el, H_ft, DESK_H, TOP - FLOOR, SEAT_Z - FLOOR, tuple(round(v, 4) for v in DBOX), tuple(round(v, 4) for v in SBOX),
    tuple(round(v, 4) for v in EBOX)), flush=True)
x_c = (SBOX[0] + SBOX[1]) / 2; DB = DBOX[3]

# ---------- mum: on the chair at the right end, body turned a little to the camera; adult size, not scaled ----------
FE = xdir(DI, DI["end_face"])
th = math.degrees(math.atan2(FE.x, -FE.y))                 # Char faces (sin th, -cos th)
MUM_F = th + MUM_TURN if th < 0 else th - MUM_TURN
if not (-115 <= MUM_F <= -25): print("DESK WARN mum's chair faces %.0f deg (expected about -90): clamped" % th, flush=True)
MUM_F = max(-115.0, min(-25.0, MUM_F))
chm = E.Char("spain_mum", (0.30, -0.32), MUM_F, height=MUM_H)
MM = metrics(chm)
Fm = Vector((math.sin(math.radians(MUM_F)), -math.cos(math.radians(MUM_F)), 0)); Rm = Vector((Fm.y, -Fm.x, 0))     # her forward / her right
hm = Vector(((EBOX[0] + EBOX[1]) / 2, (EBOX[2] + EBOX[3]) / 2, 0))
need = DBOX[1] + MM["front"] * abs(Fm.x) + GAP - hm.x                   # her tummy must stay clear of the table end
lim = 0.35 * min(EBOX[1] - EBOX[0], EBOX[3] - EBOX[2])
if need > 0:
    s_ = need / max(0.2, abs(Fm.x))
    if s_ > lim: print("DESK WARN mum's tummy %.4f into the table end even at the back of her seat (chair would need pulling)" % (s_ - lim), flush=True)
    hm = hm - Fm * min(s_, lim)
PM = Sit(chm, MM, (hm.x, hm.y), MUM_SEAT_Z, MUM_LEAN, MUM_F)
MC = Vector((DBOX[1] - 0.0045, max(DBOX[2] + 0.008, min(DB - 0.008, hm.y + Fm.y * 0.01)), TOP))     # on the table end in front of her
MUM_PLATE = MC + Fm * 0.0025
print("DESK MUM face %.1f hips %s seat %s table_end_x %.4f front %.4f plate %s" % (MUM_F, tuple(round(v, 4) for v in hm[:2]),
      tuple(round(v, 4) for v in EBOX), DBOX[1], MM["front"], tuple(round(v, 4) for v in MUM_PLATE)), flush=True)

# ---------- layout on the table (from her seated centre and the table edge on her side) ----------
PL = Vector((x_c + PLATE_DX, DB - PLATE_R - 0.0007, TOP))
FORK_X = PL.x - PLATE_R - 0.0012
GLASS_HOME = Vector((FORK_X - 0.0045, DB - GLASS_R - 0.0012, TOP))     # clear of the little-finger side of the fork hand
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
if os.path.exists(f"{PROPS}/spain_dinner_set.glb"):
    tray_root = E.place(f"{PROPS}/spain_dinner_set.glb", TRAY_D, (TRAY_AT[0], TRAY_AT[1], TOP + 0.0002), axis="long")
print("DESK DINNERSET size %.4f at %s (free x %.4f..%.4f y %.4f..%.4f)" % (TRAY_D, tuple(round(v, 4) for v in TRAY_AT), ax0, ax1, ay0, ay1), flush=True)
WIN_X = x_c - 0.050
CLOCK = (DBOX[1] + 0.014, 0.238, FLOOR + CLOCK_Z)

room(WIN_X); outside(WIN_X); clock(CLOCK[0], CLOCK[1], CLOCK[2], 9, 15)
pendant((DBOX[0] + DBOX[1]) / 2, (DBOX[2] + DBOX[3]) / 2)
L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.5"))
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); frontl = bpy.context.object      # soft warm room light from the front
frontl.data.energy = env("FRONT", "1.8"); frontl.data.color = (1, 0.88, 0.72); frontl.data.size = 0.5; frontl.rotation_euler = (math.radians(25), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.40, 0.30)); moon = bpy.context.object        # cool night light on the balcony and the street
moon.data.energy = env("MOON", "1.2"); moon.data.color = (0.62, 0.72, 1.0); moon.data.size = 0.35; moon.rotation_euler = (math.radians(-55), 0, 0)

make_plate(PL, PLATE_R, "herPlate"); make_plate(MUM_PLATE, 0.0040, "mumPlate")
piece, PIECE_C = make_tortilla(PL + Vector((0, -0.0004, PLATE_T)))
fork = make_fork(); glass = make_glass()
set_M(fork, F_REST, 0); set_M(glass, G_HOME, 0)


def mum_targets():
    fR, fL = (Fm - Rm * 0.25).normalized(), (Fm + Rm * 0.25).normalized()     # fingers forward, a little towards her middle
    return PM.rest("Right", MC + Rm * 0.0070 - Fm * 0.0005, fR), PM.rest("Left", MC - Rm * 0.0070 - Fm * 0.0005, fL)


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
            arms, head = E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=use_right), (0, (6 * sg) if t < ans1 else 0, 6 if t < ans1 else 2)
        else:
            arms, head = E.P_stand(), (0, -14, 0)            # listening: head turned to the traveller (on her right, -x)
        ch.pose(t, arms, twist={"Head": head})
        if t >= ans0 - 0.15:
            curl(ch, side, G_POINT); key_hand(ch, side, fr)
    ch.finish()
    for fr in E.frames(): mum_frame(fr / E.FPS, fr)
    chm.finish()

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)      # looks up at the clock
        return E.P_stand(), (0, 14, 0)
    stand("traveler_girl", GL, GF, girl, height=GIRL)
    aim0 = Vector(((DBOX[0] + DBOX[1]) / 2 + 0.012, 0.05, 0.075))
    cam_move(42, aim0 + Vector((-0.02, -0.52, 0.075)), aim0, aim0 + Vector((-0.01, -0.45, 0.065)), aim0 + Vector((0, 0, 0.002)),
             focus=((DBOX[0] + DBOX[1]) / 2, DBOX[2] - 0.01, 0.06))
    for o in (fork, glass, piece): E.constant(o)
    view_report("SP1", [("clock", CLOCK), ("girl_head", lambda: wpt(ch, "Head")), ("mum_head", lambda: wpt(chm, "Head")),
                        ("table_front", ((DBOX[0] + DBOX[1]) / 2, DBOX[2], TOP))])

else:
    # ---------- seated behind the table, facing the camera ----------
    lean_shift = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
    hy = max((SBOX[2] + SBOX[3]) / 2, DB + M_["front"] + GAP + lean_shift)
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
    if hy > SBOX[3] - 0.002: print("DESK WARN hips behind the back of the seat (the chair is tucked too far under the table)", flush=True)
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
        F_HOLD = Tr(0, 0, 0.0030) @ frame_M(PIECE_C, Z_SPEAR, Vector((1, 0, 0)))   # 11/20 check: the old hold (near her chest, low) twisted the forearm; hover above the plate in the spear pose instead
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
            mum_frame(t, fr)
        ch.finish(); chm.finish()
        for o in (fork, piece, glass): E.constant(o)

    elif SHOT == "SP3":
        REL_FORK, GRAB_G, LET_G = 0.5, 1.2, 2.8
        F_HOLD = Tr(0, 0, 0.0030) @ frame_M(PIECE_C, Z_SPEAR, Vector((1, 0, 0)))   # 11/20 check: the old hold (near her chest, low) twisted the forearm; hover above the plate in the spear pose instead
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
        HEAD_W = (0, -10, -2)        # face to the camera, eyes and head a little to the traveller (her right)
        for fr in E.frames():
            t = fr / E.FPS
            P.body(t, P_LAP, HEAD_W)
            left = ik_arm(ch, "Left", L_FLAT[1], L_FLAT[3])
            r_ik = ik_arm(ch, "Right", R_OFF[1], R_OFF[3])
            if t < W0: rdirs = r_ik
            elif t < W0 + 0.3: rdirs = blend_dirs(r_ik, wave_dirs(W0 + 0.3), (t - W0) / 0.3)
            else: rdirs = wave_dirs(t)
            P.body(t, {**rdirs, **left}, HEAD_W)
            set_hand_rot(ch, "Left", L_FLAT[0]); curl(ch, "Left", G_FLAT)
            if t < W0 + 0.15:
                set_hand_rot(ch, "Right", R_OFF[0]); curl(ch, "Right", G_RELAX)
            else:
                set_hand_rot(ch, "Right", Q_WAVE); curl(ch, "Right", G_WAVE)
            key_hand(ch, "Left", fr); key_hand(ch, "Right", fr)
            set_M(fork, F_REST, fr); set_M(glass, G_HOME, fr); set_M(piece, Matrix.Translation((0, 0, -1)), fr)
            if fr % 12 == 0:
                hr = wpt(ch, "RightHandMiddle1"); hd = wpt(ch, "Head")
                print("CONTACT SP4 t=%.2f wave_hand_outside_face_x %.4f hand_above_shoulder %.4f" % (t, hd.x - hr.x, hr.z - SHR.z), flush=True)
            mum_frame(t, fr)
        ch.finish(); chm.finish()
        for o in (fork, piece, glass): E.constant(o)

    # ---------- cameras ----------
    if CAMSUB == "main" and SHOT == "SP4":
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
    mumh = (MC + Vector((0, 0, 0.001)))
    HANDCAM = {   # aim, camera offset, lens. Her right hand is on the -x side; DOF off.
        "HF": ((pick if SHOT == "SP2" else sip), Vector((-0.07, -0.12, 0.04)), 150),     # front-3/4 from her right front
        "HS": ((pick if SHOT == "SP2" else sip), Vector((-0.14, -0.01, 0.02)), 150),     # her right side
        "HL": (L_PT + Vector((0, 0, 0.001)), Vector((0.07, -0.12, 0.05)), 190),          # left hand, front-left
        "HL2": (L_PT + Vector((0, 0, 0.001)), Vector((0.14, -0.01, 0.03)), 190),         # left hand, her left side
        "MF": (mumh, Vector((-0.02, -0.12, 0.07)), 170),                                  # mum's hands from the front, above
        "MS": (mumh, Vector((0.01, -0.14, 0.016)), 170)}                                  # mum's hands low from the camera side
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
