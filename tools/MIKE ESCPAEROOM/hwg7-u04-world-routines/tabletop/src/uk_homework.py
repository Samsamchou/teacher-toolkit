# World Routines Trip - UK station "I do my homework at four thirty." (tabletop style H)
# blender -b --factory-startup --python uk_homework.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: K1 wide: the traveller asks; the boy, standing beside his desk, points at the 4:30 wall clock with the clock-side hand
#         K2 he sits behind the desk (facing the camera) and opens the cover of his exercise book: "This is my homework."
#         K3 he writes with a pencil (tripod grip), the other hand holds the book flat: "I read and write."
#         K4 pencil down, tea cup taken by its handle, a sip beside his face, cup back: "I do my homework at four thirty. Then I have tea."
#   Check cameras (same action, another camera; the first two letters pick the action):
#         K2C/K3C/K4C close front-right, K2S/K3S/K4S his right side,
#         sharp hand cameras, no depth of field: K2H K2H2 (cover) / K3H K3H2 K3H3 (pencil) / K4HP (pencil down) K4HC K4HC2 (handle) K4HS K4HS2 (sip)
# Models: uk_boy (rigged), traveler_girl, uk_desk (desk with the chair tucked in BEHIND it), uk_teaset (round side table, teapot, biscuits, no cup).
# Made here: the room, a sash window with a red pillar box and brick terraced houses outside, Union Jack bunting, the 4:30 wall clock,
#   the exercise book (separate hinged cover), the pencil, the tea cup with a handle and its saucer.
# Hand helpers (PALM_SIGN, hand_frame, curl, orient_hand, ik_arm, key_hand, ...) are copied from taiwan_breakfast.py:
#   colab_run.py uploads only this file and engine.py, so the file is self-contained.
# Props held in a hand are rigid to the hand bone: prop = hand_matrix @ C, C measured once ("calibration") with the grip curled.
#   The wanted prop pose gives the wanted hand pose (hand = prop @ C^-1): wrist -> two-bone arm IK, hand turned, fingers curled;
#   the prop is then drawn from the hand that was actually reached, so a short arm shows up in the CONTACT lines, never as a floating prop.
# Measurement lines (kept by colab_run.py): DESK (furniture, fit, body, reach), CONTACT (pencil tip to paper, cup rim to lips, grip to cover edge).
# Numbers marked GUESS are first guesses: check them in the first check frames (all can be set with environment variables locally,
# but colab_run.py does not pass environment variables, so change the default in this file).
# ASCII only: colab exec reads files with cp950 on Windows.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
from hands import *            # shared hand helpers (tabletop/src/hands.py)
import hands as H

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with uk_compose.py
DUR = {"K1": 5.6, "K2": 3.8, "K3": 3.0, "K4": 7.6}
VOICE = {"q": 0.4, "a": 2.6, "hw": 0.5, "rw": 0.4, "tea": 0.5}
CAMSUB = SHOT[2:] or "main"      # "" main / C close / S side / H.. sharp hand cameras
SHOT = SHOT[:2]
E.init(PROPS, FONTS, DUR[SHOT])
sc = E.sc
T = DUR[SHOT]


def env(k, d):
    return float(os.environ.get(k, d))


FLOOR = 0.012
KID = 0.070                      # pupil height (m)
GIRL = KID * 1.06                # the traveller: her sun hat adds a little height
PUPIL = KID * 1.04
TX, TY = 0.02, 0.055             # desk position (the boy sits on its +y side, facing the camera at -y)
WALL_Y = 0.246                   # back wall centre (front face at 0.240)
# --- body / furniture fit (GUESS: check DESK FIT / DESK SIT / DESK FEET lines) ---
SEAT_HIP = env("SEAT_HIP", "0.0075")       # hips bone above the chair seat when sitting (0.0075 worked for taiwan_girl)
ELBOW_DROP = env("ELBOW_DROP", "0.0005")   # desk top this much below the hanging elbow
DESK_K = env("DESK_K", "1.0")              # extra scale on the fitted desk
GAP = env("GAP", "0.0012")                 # tummy to desk back edge
LEAN = tuple(float(v) for v in os.environ.get("LEAN", "0,0,-7").split(","))   # lean forward over the desk (Spine1 twist)
TEA_K = env("TEA_K", "0.92")               # side-table top / desk top
# --- small props (sized to the chibi hand: arms are only ~14 mm) ---
BOOK_W, BOOK_D = env("BOOK_W", "0.0080"), env("BOOK_D", "0.0110")    # one page: across (x) and away from him (y)
COVER_T, PAGE_H = 0.00025, 0.0006
BLOCK_H = COVER_T + PAGE_H
BOOK_SHIFT = env("BOOK_SHIFT", "0.002")    # spine this far to his left of his centre: right page in front of the right shoulder
PEN_L, PEN_R = env("PEN_L", "0.0090"), 0.00035
PEN_GRIP = env("PEN_GRIP", "0.0022")       # GUESS: tripod centre to pencil tip
PEN_EL = math.radians(env("PEN_EL", "50"))  # pencil slope from the paper (memory rule: about 50 deg, pointing to the right shoulder)
PEN_X = env("PEN_X", "-0.0070")            # pencil rest line, from his centre (right of the book)
CUP_R, CUP_H, HANDLE_R, SAUCER_T = 0.0024, 0.0034, 0.0011, 0.0003
CUP_X, CUP_DY = env("CUP_X", "-0.0115"), env("CUP_DY", "0.0036")    # cup home: right of the pencil, near his edge
SIP_D = Vector((env("SIP_DX", "-0.0008"), env("SIP_DY", "-0.0003"), env("SIP_DZ", "-0.0004")))   # rim contact from the lips centre (to his right, a bit low)
SIP_TILT = math.radians(env("SIP_TILT", "25"))
HEAD_SIP = Vector((0, -6, 0))      # (roll, yaw, pitch): yaw < 0 turns to his right, towards the cup
CLOCK_Z = env("CLOCK_Z", "0.106")


# ---------- generic helpers (from taiwan_breakfast.py) ----------
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


# ---------- the room ----------
def brick():
    if "brickWall" in E._M: return E._M["brickWall"]
    m = bpy.data.materials.new("brickWall"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.9
    geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    nt.links.new(sep.outputs["X"], comb.inputs["X"]); nt.links.new(sep.outputs["Z"], comb.inputs["Y"])      # house fronts face -y: bricks in x-z
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 45.0; br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Brick Width"].default_value = 0.5; br.inputs["Row Height"].default_value = 0.16
    br.inputs["Color1"].default_value = (0.42, 0.12, 0.08, 1); br.inputs["Color2"].default_value = (0.56, 0.21, 0.12, 1)
    br.inputs["Mortar"].default_value = (0.72, 0.66, 0.58, 1)
    nt.links.new(comb.outputs[0], br.inputs["Vector"]); nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    E._M["brickWall"] = m; return m


def union_jack():
    """Material with a Union Jack drawn into a small image (no files needed)."""
    if "unionJack" in E._M: return E._M["unionJack"]
    w, h = 120, 60
    img = bpy.data.images.new("unionJackImg", w, h)
    blue, red, white = (0.0, 0.14, 0.49, 1.0), (0.78, 0.07, 0.17, 1.0), (1.0, 1.0, 1.0, 1.0)
    px = []
    for j in range(h):
        Y = (j + 0.5) / h * 30.0
        for i in range(w):
            X = (i + 0.5) / w * 60.0
            d = min(abs(Y - X / 2), abs(Y - (30 - X / 2))) / 1.118
            c = blue
            if d < 3.0: c = white
            if d < 1.0: c = red
            if abs(X - 30) < 5 or abs(Y - 15) < 5: c = white
            if abs(X - 30) < 3 or abs(Y - 15) < 3: c = red
            px.extend(c)
    img.pixels = px
    try: img.pack()
    except Exception: pass
    m = bpy.data.materials.new("unionJack"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.9
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    E._M["unionJack"] = m; return m


def tri(name, pts, uvs, m):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(p) for p in pts], [], [tuple(range(len(pts)))])
    uv = me.uv_layers.new(name="UVMap")
    for loop in me.loops: uv.data[loop.index].uv = uvs[loop.vertex_index]
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    return ob


def room(win_x):
    """Afternoon living-room corner, cut open like a doll's house. A sash window in the back wall (boolean hole)."""
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("floorboards", (0.56, 0.37, 0.21)), "floor", thick=FLOOR)
    gap = E.mat("boardGap", (0.32, 0.2, 0.11), 0.9)
    for i in range(1, 22):       # floorboards
        E.box((-0.32 + i * 0.029, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), gap, "boardLine", bevel=0)
    E.box((TX, TY - 0.005, FLOOR + 0.0004), (0.17, 0.12, 0.0008), E.felt("rug", (0.62, 0.12, 0.14)), "rug", bevel=0)
    E.box((TX, TY - 0.005, FLOOR + 0.0006), (0.15, 0.10, 0.0008), E.felt("rugIn", (0.12, 0.2, 0.42)), "rugIn", bevel=0)
    wall = E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("wallpaper", (0.86, 0.80, 0.62)), "backWall")
    wz0, wz1, ww = FLOOR + 0.05, FLOOR + 0.185, 0.09
    cut = E.box((win_x, WALL_Y, (wz0 + wz1) / 2), (ww, 0.05, wz1 - wz0), E.mat("cutter", (0, 0, 0), 0.5), "winCut", bevel=0)
    mod = wall.modifiers.new("win", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut
    cut.hide_render = True; cut.display_type = "WIRE"
    white = E.mat("paintWhite", (0.95, 0.94, 0.9), 0.5)
    sage = E.felt("dado", (0.50, 0.62, 0.50))
    E.box((0, 0.2395, FLOOR + 0.022), (0.64, 0.002, 0.044), sage, "dadoPanel", bevel=0)
    E.box((0, 0.2385, FLOOR + 0.045), (0.64, 0.003, 0.0025), white, "dadoRail", bevel=0)
    E.box((0, 0.2385, FLOOR + 0.005), (0.64, 0.003, 0.01), white, "skirting", bevel=0)
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", (0.84, 0.78, 0.60)), "sideWall")
    # sash window: frame, two sashes (six panes each), meeting rail, sill
    zc = (wz0 + wz1) / 2; hh = wz1 - wz0
    for (x, z, sx, sz) in ((win_x - ww / 2 + 0.002, zc, 0.004, hh), (win_x + ww / 2 - 0.002, zc, 0.004, hh), (win_x, wz1 - 0.002, ww, 0.004)):
        E.box((x, 0.243, z), (sx, 0.012, sz), white, "winFrame", bevel=0)
    E.box((win_x, 0.236, wz0 - 0.001), (ww + 0.012, 0.012, 0.004), white, "winSill", bevel=0.0005)
    for k, (z0, z1, y) in enumerate(((wz0, zc + 0.0015, 0.2425), (zc - 0.0015, wz1 - 0.004, 0.2455))):
        zm = (z0 + z1) / 2; hz = z1 - z0; iw = ww - 0.008
        for (x, z, sx, sz) in ((win_x - iw / 2 + 0.0015, zm, 0.003, hz), (win_x + iw / 2 - 0.0015, zm, 0.003, hz),
                               (win_x, z0 + 0.0015, iw, 0.003), (win_x, z1 - 0.0015, iw, 0.003),
                               (win_x - iw / 6, zm, 0.0012, hz), (win_x + iw / 6, zm, 0.0012, hz), (win_x, zm, iw, 0.0012)):
            E.box((x, y, z), (sx, 0.0025, sz), white, "sash%d" % k, bevel=0)
    curtain = E.felt("curtain", (0.70, 0.18, 0.20))
    for s in (-1, 1):
        E.box((win_x + s * (ww / 2 + 0.008), 0.236, (wz0 + wz1) / 2 + 0.008), (0.013, 0.004, wz1 - wz0 + 0.03), curtain, "curtain", bevel=0.001)
    E.cyl((win_x, 0.235, wz1 + 0.014), 0.0012, ww + 0.05, E.mat("rail", (0.45, 0.3, 0.12), 0.4), rot=(0, math.radians(90), 0), verts=10, name="curtainRail")


def house(x, k):
    """One brick terraced house front across the street (slate roof, chimney pots, white sash windows, a coloured door)."""
    y, w, h, d = 0.43, 0.088, 0.165, 0.03
    white = E.mat("paintWhite", (0.95, 0.94, 0.9), 0.5); glass = E.mat("houseGlass", (0.10, 0.14, 0.2), 0.12)
    slate = E.mat("slate", (0.20, 0.22, 0.27), 0.6); pot = E.mat("chimneyPot", (0.72, 0.38, 0.22), 0.7)
    doors = [(0.55, 0.06, 0.08), (0.05, 0.16, 0.42), (0.06, 0.30, 0.18), (0.06, 0.06, 0.07), (0.60, 0.42, 0.08)]
    E.box((x, y, FLOOR + h / 2), (w, d, h), brick(), "house", bevel=0.0008)
    front = y - d / 2 - 0.0008
    dx = -w * 0.28 if k % 2 == 0 else w * 0.28
    E.box((x + dx, front, FLOOR + 0.022), (0.018, 0.002, 0.044), white, "doorFrame", bevel=0)
    E.box((x + dx, front - 0.0007, FLOOR + 0.021), (0.015, 0.0015, 0.04), E.mat("door%d" % k, doors[k % 5], 0.35), "door", bevel=0.0004)
    for (wx, wz, wwid, wh) in ((x - dx, FLOOR + 0.032, 0.026, 0.034), (x - w * 0.25, FLOOR + 0.108, 0.02, 0.032), (x + w * 0.25, FLOOR + 0.108, 0.02, 0.032)):
        E.box((wx, front, wz), (wwid + 0.003, 0.0015, wh + 0.003), white, "houseWinFrame", bevel=0)
        E.box((wx, front - 0.0008, wz), (wwid, 0.0012, wh), glass, "houseWin", bevel=0)
        E.box((wx, front - 0.0015, wz), (wwid, 0.0012, 0.0012), white, "houseSash", bevel=0)
        E.box((wx, front - 0.0015, wz), (0.0012, 0.0012, wh), white, "houseBar", bevel=0)
        E.box((wx, front - 0.0015, wz - wh / 2 - 0.002), (wwid + 0.005, 0.004, 0.0025), white, "houseSill", bevel=0)
    E.box((x, front + 0.0163, FLOOR + h + 0.0115), (w + 0.002, 0.04, 0.003), slate, "roof", bevel=0, rot=(math.radians(35), 0, 0))
    cx = x + w / 2
    E.box((cx, y + 0.006, FLOOR + h + 0.022), (0.014, 0.01, 0.034), brick(), "chimney", bevel=0.0005)
    for j in (-1, 1):
        E.cyl((cx + j * 0.0035, y + 0.006, FLOOR + h + 0.042), 0.0016, 0.007, pot, verts=12, name="chimneyPot")


def post_box(x, y):
    """A red pillar box on the pavement (black base, domed cap, letter slot, white plate)."""
    red = E.mat("postRed", (0.72, 0.03, 0.03), 0.35); black = E.mat("postBlack", (0.03, 0.03, 0.03), 0.5)
    h, r = 0.062, 0.011
    E.cyl((x, y, FLOOR + 0.004), r * 1.08, 0.008, black, verts=32, name="postBase")
    E.cyl((x, y, FLOOR + 0.008 + h / 2), r, h, red, verts=32, name="postBody")
    E.cyl((x, y, FLOOR + 0.008 + h - 0.001), r * 1.13, 0.003, red, verts=32, name="postRim")
    cap = E.ball((x, y, FLOOR + 0.008 + h), r * 1.1, red, "postCap"); cap.scale = (1, 1, 0.55)
    E.box((x, y - r - 0.0002, FLOOR + 0.008 + h * 0.80), (0.011, 0.0016, 0.0016), black, "postSlot", bevel=0)
    E.box((x, y - r - 0.0002, FLOOR + 0.008 + h * 0.56), (0.008, 0.001, 0.007), E.mat("postPlate", (0.95, 0.95, 0.9), 0.5), "postPlate", bevel=0)


def outside(win_x):
    E.box((0, 0.345, FLOOR - 0.004), (0.9, 0.19, 0.008), E.felt("pavement", (0.62, 0.62, 0.60)), "pavement", bevel=0)
    for i in range(1, 30):
        E.box((-0.45 + i * 0.03, 0.345, FLOOR + 0.0001), (0.0006, 0.19, 0.0003), E.mat("slab", (0.45, 0.45, 0.44), 0.9), "slabLine", bevel=0)
    E.box((0, 0.52, 0.25), (1.4, 0.004, 0.7), E.emission("ukSky", (0.62, 0.78, 0.95), 1.3), "sky", bevel=0)
    for k, x in enumerate((-0.30, -0.21, -0.12, -0.03, 0.06, 0.15)):
        house(x + win_x + 0.075, k)
    post_box(win_x + 0.014, 0.285)


def bunting():
    """Two swags of Union Jack pennants across the back wall."""
    m = union_jack(); cord = E.mat("cord", (0.92, 0.9, 0.84), 0.8); y = 0.2372
    for (x0, x1) in ((-0.30, -0.006), (0.006, 0.30)):
        z0, sag = FLOOR + 0.212, 0.018
        zc = lambda x: z0 - sag * (1 - (2 * (x - x0) / (x1 - x0) - 1) ** 2)
        pts = [Vector((x0 + (x1 - x0) * k / 24, y, zc(x0 + (x1 - x0) * k / 24))) for k in range(25)]
        for a, b in zip(pts, pts[1:]):
            c = E.cyl((0, 0, 0), 0.0004, 1.0, cord, verts=6, name="cord"); c["len"] = 1.0; rod_between(c, a, b)
        x = x0 + 0.013
        while x < x1 - 0.008:
            tri("pennant", [(x - 0.0075, y - 0.0004, zc(x - 0.0075)), (x + 0.0075, y - 0.0004, zc(x + 0.0075)), (x, y - 0.0004, zc(x) - 0.017)],
                [(0.0, 1.0), (1.0, 1.0), (0.5, 0.0)], m)
            x += 0.024


def clock(cx, cy, cz):
    """Round wall clock at exactly 4:30: hour hand half way between 4 and 5, minute hand on 6 (ticks only, no numbers)."""
    E.cyl((cx, cy, cz), 0.026, 0.006, E.mat("clockRim", (0.10, 0.16, 0.36), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0025, cz), 0.0225, 0.004, E.mat("clockFace", (0.98, 0.97, 0.93), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.08, 0.08, 0.12), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.019 * math.sin(a), cy - 0.005, cz + 0.019 * math.cos(a)), 0.0016 if big else 0.0009, ink, "tick")
    hand_box(cx, cy - 0.0052, cz, math.radians((4 + 30 / 60) * 30), 0.011, 0.0026, ink, "hourHand")     # 135 deg: half way 4 -> 5
    hand_box(cx, cy - 0.0058, cz, math.radians(180), 0.0165, 0.0017, ink, "minuteHand")               # straight down to 6
    E.ball((cx, cy - 0.006, cz), 0.0018, E.mat("clockPin", (0.75, 0.16, 0.14), 0.4), "clockPin")


# ---------- furniture probing (rays straight down; several hits per column so a seat under the desk top is found) ----------
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


def probe_desk():
    """Desk top level and extent, chair seat level and extent (model-relative, model height H0) and the turn that puts the chair at +y."""
    cols, top = probe(f"{PROPS}/uk_desk.glb")
    first = [(x, y, hs[0][0]) for x, y, hs in cols if hs and hs[0][1] > 0.7]
    allup = [(x, y, z) for x, y, hs in cols for z, nz in hs if nz > 0.7]
    dz, dp = level(first, top, 0.45, 1.001)
    sz, sp = level([p for p in allup if p[2] < dz - 0.08 * top], top, 0.2, 0.9)
    db = bbox2(dp)
    if not sp:                   # no seat found: assume a seat half the desk height just behind the desk (+y)
        print("DESK WARN no chair seat found under/behind the desk top", flush=True)
        sz = 0.55 * dz; sp = [(db[0] + 0.3 * (db[1] - db[0]), db[3], sz), (db[1] - 0.3 * (db[1] - db[0]), db[3] + 0.3 * (db[3] - db[2]), sz)]
    sb = bbox2(sp)
    dc = ((db[0] + db[1]) / 2, (db[2] + db[3]) / 2); scn = ((sb[0] + sb[1]) / 2, (sb[2] + sb[3]) / 2)
    rot = math.atan2(scn[0] - dc[0], scn[1] - dc[1]); rot = round(rot / (math.pi / 2)) * (math.pi / 2)
    info = dict(H0=0.1, top=top, desk_z=dz, desk_box=db, seat_z=sz, seat_box=sb, rot=rot)
    print("DESK PROBE desk_z %.4f seat_z %.4f (model height %.3f) desk_box %s seat_box %s seat-desk offset (%.4f, %.4f) turn %d deg" % (
        dz, sz, top, tuple(round(v, 4) for v in db), tuple(round(v, 4) for v in sb), scn[0] - dc[0], scn[1] - dc[1], round(math.degrees(rot))), flush=True)
    return info


def probe_tea():
    cols, top = probe(f"{PROPS}/uk_teaset.glb")
    first = [(x, y, hs[0][0]) for x, y, hs in cols if hs and hs[0][1] > 0.7]
    tz, tp = level(first, top, 0.3, 1.001)
    info = dict(H0=0.1, top=top, table_z=tz, box=bbox2(tp))
    print("DESK TEA table_z %.4f of model height %.3f box %s" % (tz, top, tuple(round(v, 4) for v in info["box"])), flush=True)
    return info


def xf(info, H, p, at):
    k = H / info["H0"]; c, s = math.cos(info["rot"]), math.sin(info["rot"])
    return (at[0] + k * (p[0] * c - p[1] * s), at[1] + k * (p[0] * s + p[1] * c))


def xbox(info, H, b, at):
    pts = [xf(info, H, (x, y), at) for x in b[:2] for y in b[2:]]
    return (min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts))


# ---------- characters ----------
_MOUTH_REF = H._MOUTH_REF      # metrics() measures his lips into the shared dict; hands.mouth() then uses it


def fwd_of(ch):
    return ch.root.matrix_world.to_3x3().normalized() @ Vector((0, -1, 0))


def metrics(ch):
    """Rest-pose body numbers of the pupil (lengths, heights above his floor, tummy depth) and the lips offset from the head bone."""
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
    best = 0.0                                                   # how far the tummy / chest sticks out in front of the hips bone
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
    print("DESK BODY hip_h %.4f knee_h %.4f ankle_h %.4f thigh %.4f sh_above_hips %.4f sh_half %.4f upper %.4f fore %.4f hand %.4f front %.4f lips_probe %s mouth_y %.4f" % (
        m["hip_h"], m["knee_h"], m["ankle_h"], m["thigh"], m["sh_hips"], m["sh_half"], m["upper"], m["fore"], m["hand"], m["front"],
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


# ---------- hands: two-bone arm IK, hand orientation, finger curls (taiwan_breakfast.py B4 set) ----------
# fwd x (pinky->index) points to the BACK of a right hand and to the PALM of a left hand (teacher 11/20: both hands were reversed with the old guess)
# grips: degrees per finger segment (1, 2, 3), bent towards the palm
G_FLAT = {"Thumb": (5, 6, 4), "Index": (3, 5, 3), "Middle": (3, 5, 3), "Ring": (4, 6, 4), "Pinky": (5, 7, 4)}
# pencil, dynamic tripod (memory rule 11/14): thumb + index pads pinch it, middle finger supports it from below, ring + little finger tucked
G_PEN = {"Thumb": (20, 25, 15), "Index": (30, 28, 18), "Middle": (42, 38, 22), "Ring": (62, 60, 40), "Pinky": (68, 62, 42)}
# cover edge: thumb pad on top of the cover, index (and middle) under the edge
G_PINCH = {"Thumb": (18, 22, 12), "Index": (28, 30, 20), "Middle": (40, 42, 28), "Ring": (55, 55, 35), "Pinky": (60, 55, 35)}
G_PINCH_OPEN = {"Thumb": (8, 10, 5), "Index": (12, 14, 8), "Middle": (18, 20, 12), "Ring": (30, 30, 20), "Pinky": (34, 30, 20)}
# cup handle: thumb pad on top of the handle, index bent through the loop, middle under it, ring + little finger tucked
G_HANDLE = {"Thumb": (12, 16, 8), "Index": (55, 62, 45), "Middle": (62, 66, 48), "Ring": (72, 72, 52), "Pinky": (76, 72, 52)}
G_HANDLE_OPEN = {"Thumb": (6, 8, 4), "Index": (20, 25, 15), "Middle": (30, 32, 20), "Ring": (45, 45, 30), "Pinky": (50, 45, 30)}
# pointing at the clock: index straight, the others curled
G_POINT = {"Thumb": (25, 25, 15), "Index": (0, 0, 0), "Middle": (70, 80, 50), "Ring": (75, 80, 50), "Pinky": (75, 80, 50)}
POLE = {"Right": Vector((-0.7, 0.4, -1.0)), "Left": Vector((0.7, 0.4, -1.0))}       # elbows out, back and down


HL = {}      # hand-local finger direction and palm direction, per side (from the rest hand)


def hand_q(side, fwd_w, palm_w):
    """World rotation of the hand bone that points its fingers along fwd_w with the palm towards palm_w."""
    def basis(a, b):
        a = Vector(a).normalized(); b = Vector(b); b = (b - b.dot(a) * a).normalized(); return Matrix((a, b, a.cross(b))).transposed()
    a_l, b_l = HL[side]
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


def tblend(a, b, u):
    """Blend two hand targets (q, wrist, grip, pole)."""
    u = E.ease(u)
    return (a[0].slerp(b[0], u), a[1].lerp(b[1], u), {f: tuple(x + (y - x) * u for x, y in zip(a[2][f], b[2][f])) for f in FINGERS}, a[3].lerp(b[3], u))


# ---------- props made in code ----------
def make_book(L):
    """Exercise book, spine on his LEFT (+x), read the right way up by him. The front cover is a separate object on a hinge empty at the spine."""
    blue = E.mat("bookBlue", (0.08, 0.22, 0.62), 0.6); white = E.mat("paper", (0.97, 0.96, 0.92), 0.85)
    line = E.mat("ruled", (0.35, 0.55, 0.85), 0.8); margin = E.mat("margin", (0.85, 0.25, 0.3), 0.8)
    W, D, x_h, by, top = BOOK_W, BOOK_D, L["x_h"], L["by"], L["top"]
    E.box((x_h - W / 2, by, top + COVER_T / 2), (W, D, COVER_T), blue, "backCover", bevel=0)
    E.box((x_h - W / 2, by, top + COVER_T + PAGE_H / 2), (W - 0.0003, D - 0.0004, PAGE_H), white, "pages", bevel=0)
    zt = L["block_top"]
    for y in L["rows"]:
        E.box((x_h - W / 2, y, zt + 0.00001), (W - 0.0008, 0.00006, 0.00002), line, "ruled", bevel=0)
    E.box((x_h - 0.0010, by, zt + 0.000012), (0.00006, D - 0.0006, 0.00002), margin, "margin", bevel=0)
    hinge = E.empty("coverHinge", (x_h, by, zt)); hinge.rotation_mode = "XYZ"
    parts = [E.box((-W / 2, 0, COVER_T / 2), (W, D, COVER_T), blue, "cover", bevel=0),
             E.box((-W / 2, 0, -0.00001), (W - 0.0003, D - 0.0003, 0.00002), white, "coverLining", bevel=0),
             E.box((-W / 2, -D * 0.18, COVER_T + 0.00001), (W * 0.62, D * 0.22, 0.00002), white, "coverLabel", bevel=0)]
    for o in parts: o.parent = hinge
    return hinge


def hinge_M(L, th):
    M = Matrix.Rotation(th, 4, "Y"); M.translation = Vector((L["x_h"], L["by"], L["block_top"])); return M


def make_pencil():
    """Yellow hexagonal pencil; its empty sits at the graphite tip and its local +z runs tip -> eraser."""
    emp = E.empty("pencil"); emp.rotation_mode = "XYZ"
    yellow = E.mat("pencilYellow", (0.95, 0.72, 0.08), 0.45); woodm = E.mat("pencilWood", (0.85, 0.66, 0.42), 0.7)
    lead = E.mat("graphite", (0.08, 0.08, 0.09), 0.35); ferr = E.mat("ferrule", (0.75, 0.75, 0.72), 0.25); pink = E.mat("eraser", (0.95, 0.5, 0.55), 0.8)
    Lp, r = PEN_L, PEN_R
    parts = [E.cone((0, 0, 0.0003), 0.0, 0.00012, 0.0006, lead, verts=12, name="penLead"),
             E.cone((0, 0, 0.0011), 0.00012, r, 0.001, woodm, verts=12, name="penWood"),
             E.cyl((0, 0, (0.0016 + Lp - 0.0012) / 2), r, Lp - 0.0028, yellow, verts=6, name="penBody"),
             E.cyl((0, 0, Lp - 0.0009), r * 1.04, 0.0006, ferr, verts=12, name="penFerrule"),
             E.cyl((0, 0, Lp - 0.0003), r * 0.98, 0.0006, pink, verts=12, name="penEraser")]
    for o in parts: o.parent = emp
    return emp


def make_cup(L):
    """China tea cup (blue band, tea inside) with a loop handle on its -x side (his right hand side), on a saucer."""
    china = E.mat("china", (0.96, 0.95, 0.92), 0.3); band = E.mat("chinaBlue", (0.15, 0.3, 0.75), 0.3); tea = E.mat("tea", (0.45, 0.22, 0.08), 0.15)
    home = L["cup_home"]
    E.cyl((home.x, home.y, L["top"] + SAUCER_T / 2), CUP_R * 1.45, SAUCER_T, china, verts=32, name="saucer")
    E.cyl((home.x, home.y, L["top"] + SAUCER_T * 0.8), CUP_R * 1.47, SAUCER_T * 0.4, band, verts=32, name="saucerBand")
    emp = E.empty("teaCup"); emp.rotation_mode = "XYZ"
    r, h = CUP_R, CUP_H
    parts = [E.cyl((0, 0, h / 2), r, h, china, verts=32, name="cupBody"),
             E.cyl((0, 0, h * 0.72), r * 1.015, h * 0.12, band, verts=32, name="cupBand"),
             E.cyl((0, 0, h + 0.00001), r * 0.86, 0.00004, tea, verts=32, name="cupTea")]
    bpy.ops.mesh.primitive_torus_add(major_radius=HANDLE_R, minor_radius=0.00028, major_segments=24, minor_segments=8,
                                     location=(-(r + HANDLE_R * 0.55), 0, h * 0.55), rotation=(math.pi / 2, 0, 0))
    hd = bpy.context.object; hd.name = "cupHandle"; hd.data.materials.append(china); parts.append(hd)
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.94, minor_radius=0.00012, major_segments=32, minor_segments=6, location=(0, 0, h))
    rim = bpy.context.object; rim.name = "cupRim"; rim.data.materials.append(china); parts.append(rim)
    for o in parts: o.parent = emp
    emp.location = home
    return emp


HANDLE_PT = Vector((-(CUP_R + HANDLE_R * 0.55), 0, CUP_H * 0.55 + HANDLE_R * 0.7))     # where thumb and index pinch the handle (cup local)
RIM = Vector((CUP_R, 0, CUP_H))                                                       # the rim point that goes to his lips (cup local, +x side)


def cup_M(base, tilt):
    M = Matrix.Rotation(tilt, 4, "Y"); M.translation = Vector(base); return M     # tilt > 0 lowers the +x rim (towards the lips)


def set_M(ob, M, fr):
    ob.matrix_world = M; ob.scale = (1, 1, 1); key_obj(ob, fr, rot=True)


# ================= build =================
seated = SHOT != "K1"
BOY_F = 0 if seated else -25
ch = E.Char("uk_boy", (0.30, -0.15), BOY_F, height=PUPIL)          # placed properly below, after the desk is fitted to him
M_ = metrics(ch)
# thighs ON the seat, not through it (teacher 11/20): measured on the deformed mesh, overrides the old fixed guess
SEAT_UNDER = seat_under(ch, M_["thigh"]) - 0.0010   # sits 1 mm into the soft cushion (11/20 side check: +0.3 mm left a 1 mm gap)
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
DI = probe_desk(); TI = probe_tea()
# fit the desk: desk top at his elbow when seated AND seat low enough for his feet to reach the floor (the smaller model wins)
rd, rs = DI["desk_z"] / DI["H0"], DI["seat_z"] / DI["H0"]
e_el = SEAT_HIP + M_["sh_hips"] - M_["upper"] - ELBOW_DROP
seat_feet = M_["knee_h"] - SEAT_HIP - M_["upleg_dz"]
H_el, H_ft = e_el / max(1e-4, rd - rs), seat_feet / max(1e-4, rs)
DESK_H = H_el * DESK_K          # teacher-visible rule first: desk top at his elbow; feet may hang a little above the floor (seated legs hang down)
desk_root = E.place(f"{PROPS}/uk_desk.glb", DESK_H, (TX, TY, FLOOR), rot_z=DI["rot"])
TOP = FLOOR + rd * DESK_H; SEAT_Z = FLOOR + rs * DESK_H
DBOX = xbox(DI, DESK_H, DI["desk_box"], (TX, TY)); SBOX = xbox(DI, DESK_H, DI["seat_box"], (TX, TY))


def strip_chair(root, kd, top_band):
    """Teacher 11/20 (four checks): the Tripo chair is FUSED to the desk top at desk height (its backrest runs through the
    top's back edge), so every cut left backrest flaps on the desk or tore the desk top. Remove the model's chair completely
    instead: every face between the desk legs that is below the desk-top slab, above it, or behind the top's back edge.
    Backrest bits inside the slab stay hidden inside it. Then squash the desk heights by kd (top at his elbow)."""
    import bmesh
    bpy.context.view_layer.update()          # matrix_world must be the placed, scaled desk (11/20 root cause of the 310-face cut)
    x0, x1 = max(SBOX[0] - 0.010, DBOX[0] + 0.006), min(SBOX[1] + 0.010, DBOX[1] - 0.006)
    z_lo, z_hi = top_band
    n = 0
    for o in [o for o in [root] + list(root.children_recursive) if o.type == "MESH"]:
        Mw = o.matrix_world; Mi = Mw.inverted()
        bm = bmesh.new(); bm.from_mesh(o.data)

        def chair(f):
            ws = [Mw @ v.co for v in f.verts]
            if not all(x0 < w.x < x1 for w in ws): return False
            if all(w.z < z_lo for w in ws) or all(w.z > z_hi for w in ws): return True
            # at desk-top height only what is clearly behind the top (11/20: +0.8 mm chipped the top's back edge at the posts)
            return all(w.y > DBOX[3] + 0.0025 for w in ws)
        kill = [f for f in bm.faces if chair(f)]
        n += len(kill)
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        loose = [v for v in bm.verts if not v.link_faces]
        if loose: bmesh.ops.delete(bm, geom=loose, context="VERTS")
        for v in bm.verts:
            w = Mw @ v.co
            v.co = Mi @ Vector((w.x, w.y, FLOOR + (w.z - FLOOR) * kd))
        bm.to_mesh(o.data); bm.free(); o.data.update()
    print("DESK CHAIR removed %d faces of the model's chair (x %.4f..%.4f; desk-top band %.4f..%.4f kept); desk heights x%.3f" % (n, x0, x1, z_lo, z_hi, kd), flush=True)


def build_chair(x_c, front_y, seat_z, width, depth=0.020, back_h=0.021):
    """A simple wooden chair made in code (the Tripo one could not be separated from the desk): seat board with a dark cushion
    whose top is exactly seat_z, four legs, two back posts with two slats. Front edge at front_y (just behind his knees)."""
    # linear colours (Blender): sRGB (0.86, 0.60, 0.38) warm wood like the desk, sRGB (0.12, 0.20, 0.22) dark cushion (11/20: sRGB values looked white)
    wood = E.mat("chairWood", (0.70, 0.32, 0.12), 0.45); cush = E.mat("chairCushion", (0.013, 0.033, 0.040), 0.8)
    t_c, t_b, lg = 0.0012, 0.0013, 0.0017
    yb = front_y + depth; zb = seat_z - t_c                    # board top
    parts = [E.box((x_c, front_y + depth / 2, zb - t_b / 2), (width, depth, t_b), wood, "chairSeat", bevel=0.0003),
             E.box((x_c, front_y + depth / 2 + 0.0004, seat_z - t_c / 2), (width - 0.0012, depth - 0.0016, t_c), cush, "chairCushion", bevel=0.0004)]
    for sx in (-1, 1):
        xl = x_c + sx * (width / 2 - lg / 2 - 0.0003)
        parts.append(E.box((xl, front_y + lg / 2 + 0.0004, (FLOOR + zb - t_b) / 2), (lg, lg, zb - t_b - FLOOR), wood, "chairLegF", bevel=0.0002))
        parts.append(E.box((xl, yb - lg / 2, (FLOOR + seat_z + back_h) / 2), (lg, lg, seat_z + back_h - FLOOR), wood, "chairPost", bevel=0.0003))
    for zz in (seat_z + back_h * 0.55, seat_z + back_h * 0.9):
        parts.append(E.box((x_c, yb - lg / 2, zz), (width - lg, lg * 0.7, 0.0028), wood, "chairSlat", bevel=0.0003))
    parts.append(E.box((x_c, front_y + 0.0012, FLOOR + (zb - FLOOR) * 0.35), (width - lg, 0.0010, 0.0012), wood, "chairRail", bevel=0.0002))
    for o in parts: E.obstacle(o)
    print("DESK CHAIR built: seat top %.4f front %.4f back %.4f width %.4f backrest to %.4f" % (seat_z, front_y, yb, width, seat_z + back_h), flush=True)
    return front_y, yb


# seat at his knee height minus the thigh thickness (thighs flat ON the seat), desk top at his elbow above that seat
TOP_BAND = (FLOOR + 0.585 * DESK_H, FLOOR + 0.715 * DESK_H)      # desk-top slab in the fitted model (vertex profile 11/20)
SEAT_NEW = FLOOR + seat_feet * float(os.environ.get("SEAT_K", "1.0"))
TOP_NEW = SEAT_NEW + e_el
KD = (TOP_NEW - FLOOR) / (TOP - FLOOR)
SEAT_Z, TOP = SEAT_NEW, TOP_NEW
# his hips: tummy at the desk back edge (leaning a little); the seat front goes just behind his knees
_lean = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
HY = DBOX[3] + M_["front"] + GAP + _lean
strip_chair(desk_root, KD, TOP_BAND)
x_c0 = (SBOX[0] + SBOX[1]) / 2
SEAT_FRONT, SEAT_BACK = build_chair(x_c0, HY - M_["thigh"] + 0.0025, SEAT_Z, min(0.030, (DBOX[1] - DBOX[0]) - 0.016))
SBOX = (x_c0 - 0.012, x_c0 + 0.012, SEAT_FRONT, SEAT_BACK)
if HY + 0.004 > SEAT_BACK: print("DESK WARN his bottom may touch the chair back: hips %.4f seat back %.4f" % (HY, SEAT_BACK), flush=True)
print("DESK LOWERED seat %.4f desk_top %.4f above floor (knee %.4f, elbow above seat %.4f)" % (SEAT_Z - FLOOR, TOP - FLOOR, M_["knee_h"], e_el), flush=True)
E.obstacle(desk_root)
print("DESK FIT elbow_above_seat %.4f seat_for_feet %.4f H_elbow %.4f H_feet %.4f -> model height %.4f desk_top %.4f seat %.4f (above floor) desk %s seat %s" % (
    e_el, seat_feet, H_el, H_ft, DESK_H, TOP - FLOOR, SEAT_Z - FLOOR, tuple(round(v, 4) for v in DBOX), tuple(round(v, 4) for v in SBOX)), flush=True)
# the tea set on a round side table to the boy's right (-x), its top a little below the desk top
TEA_H = TEA_K * (TOP - FLOOR) / (TI["table_z"] / TI["top"])
tw =(TI["box"][1] - TI["box"][0]) * TEA_H / TI["H0"]
TEA_AT = (DBOX[0] - tw / 2 - 0.006, (DBOX[2] + DBOX[3]) / 2 + 0.008)
tea_root = E.place(f"{PROPS}/uk_teaset.glb", TEA_H, (TEA_AT[0], TEA_AT[1], FLOOR)); E.obstacle(tea_root)
print("DESK TEASET height %.4f table_top %.4f at %s" % (TEA_H, TEA_K * (TOP - FLOOR), tuple(round(v, 4) for v in TEA_AT)), flush=True)

# layout of the things on the desk, from his seated centre and the desk back edge (his side)
x_c = (SBOX[0] + SBOX[1]) / 2; DB = DBOX[3]
LAY = dict(top=TOP, db=DB, x_c=x_c, x_h=x_c + BOOK_SHIFT, by=DB - BOOK_D / 2 - 0.0004, block_top=TOP + BLOCK_H)
LAY["rows"] = [LAY["by"] - BOOK_D / 2 + 0.0012 + k * 0.00078 for k in range(13) if LAY["by"] - BOOK_D / 2 + 0.0012 + k * 0.00078 < LAY["by"] + BOOK_D / 2 - 0.0006]
LAY["row_y"] = min(LAY["rows"], key=lambda y: abs(y - (DB - 0.0032)))     # the ruled line he writes on (near his edge, within reach)
LAY["pen_rest"] = Vector((x_c + PEN_X, DB - 0.007, TOP + PEN_R))
LAY["cup_home"] = Vector((x_c + CUP_X, DB - CUP_DY, TOP + SAUCER_T))
PHI = math.asin(max(0.0, min(0.3, (BLOCK_H - COVER_T) / BOOK_W)))       # the open cover lies sloping down to the desk
if DBOX[0] > x_c + CUP_X - CUP_R * 1.5 or DBOX[1] < LAY["x_h"] + BOOK_W + 0.003:
    print("DESK WARN desk too narrow for cup / open book: desk x %.4f..%.4f need %.4f..%.4f" % (DBOX[0], DBOX[1], x_c + CUP_X - CUP_R * 1.5, LAY["x_h"] + BOOK_W + 0.003), flush=True)
WIN_X = x_c - 0.095
CLOCK = (min(x_c + 0.065, DBOX[1] + 0.045), 0.238, FLOOR + CLOCK_Z)

room(WIN_X); outside(WIN_X); bunting(); clock(*CLOCK)
L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.6"))
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); topl = bpy.context.object      # soft afternoon light into the room
topl.data.energy = 2.6; topl.data.color = (1, 0.93, 0.84); topl.data.size = 0.5; topl.rotation_euler = (math.radians(25), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.30, 0.30)); outl = bpy.context.object      # lights the house fronts across the street
outl.data.energy = 3.0; outl.data.color = (1, 0.88, 0.70); outl.data.size = 0.35; outl.rotation_euler = (math.radians(60), 0, 0)
bpy.ops.object.light_add(type="SUN", location=(0, 0.5, 0.6)); sun = bpy.context.object                # low warm 4:30 sun through the window
sun.data.energy = env("SUN", "1.0"); sun.data.color = (1, 0.85, 0.62); sun.data.angle = math.radians(3); sun.rotation_euler = (math.radians(-40), math.radians(-12), 0)

book = make_book(LAY); pencil = make_pencil(); cup = make_cup(LAY)
PALM_WRITE = Vector((0.75, 0, -0.66))       # writing hand: palm faces down and in (towards his left), pinky side on the paper
M_PEN_FLAT = frame_M(LAY["pen_rest"], Vector((0, 1, 0)), PALM_WRITE)     # pencil lying on the desk right of the book, tip away from him
REST_TIP_DOWN = LAY["pen_rest"] + Vector((0, 0, 0.00005 - PEN_R))


def write_path(t):
    """K3: two small words on the ruled line near his edge, written from his left to his right (-x). Returns (tip point, touching)."""
    words = ((0.25, 1.05, 0.0), (1.3, 2.05, 0.0029))
    x0, y0, z = LAY["x_h"] - 0.0014, LAY["row_y"], LAY["block_top"] + 0.00003
    ends = [Vector((x0 - dx - 0.0024, y0, z)) for (a, b, dx) in words]
    starts = [Vector((x0 - dx, y0, z)) for (a, b, dx) in words]
    if t < words[0][0]: return starts[0], True
    for i, (a, b, dx) in enumerate(words):
        if a <= t <= b:
            u = (t - a) / (b - a)
            return Vector((x0 - dx - 0.0024 * u, y0 - 0.00045 * abs(math.sin(u * math.pi * 5.2)), z)), True
    if t < words[1][0]:
        u = E.ease((t - words[0][1]) / (words[1][0] - words[0][1]))
        return ends[0].lerp(starts[1], u) + Vector((0, 0, 0.0004 * math.sin(math.pi * u))), False
    return ends[1], True


def marks(points, show):
    """Graphite strokes left on the page between successive touching tip points (each appears when the tip has passed)."""
    lead = E.mat("graphiteMark", (0.12, 0.12, 0.14), 0.6)
    for (t0, a), (t1, b) in zip(points, points[1:]):
        if (b - a).length < 1e-5 or (b - a).length > 0.0012: continue
        s = E.cyl((0, 0, 0), 0.00006, 0.001, lead, verts=6, name="stroke"); s["len"] = 0.001; rod_between(s, a, b)
        if show: E.show_between([s], t_on=t1)


if SHOT == "K1":
    # the traveller asks; the boy, standing beside his desk, points at the clock (four thirty) with the clock-side hand, arm outside the shoulder
    book.rotation_euler = (0, 0, 0)                    # book still closed, pencil and cup in their places
    set_M(pencil, M_PEN_FLAT, 0)
    BOY = (DBOX[1] + 0.016, (DBOX[2] + DBOX[3]) / 2 - 0.004)
    ch.at(0, loc=BOY)
    GL, GF = (DBOX[0] - 0.035, DBOX[2] - 0.028), 35
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.9, VOICE["a"], VOICE["a"] + 2.25
    pt = Vector(local_dir(BOY, BOY_F, CLOCK, FLOOR + PUPIL * 0.62)).normalized()
    use_right = pt.x < 0                      # -x is his right: pick the hand on the clock side
    sg = -1 if use_right else 1
    pt.x = sg * max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    side = "Right" if use_right else "Left"
    print("DESK K1 clock %s boy %s point_dir %s hand %s" % (tuple(round(v, 4) for v in CLOCK), tuple(round(v, 4) for v in BOY), tuple(round(v, 3) for v in pt), side), flush=True)
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

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)      # looks up at the clock
        return E.P_stand(), (0, 14, 0)
    ch.finish()
    stand("traveler_girl", GL, GF, girl, height=GIRL)
    aim0 = Vector(((DBOX[0] + DBOX[1]) / 2 + 0.005, 0.05, 0.075))
    cam_move(42, aim0 + Vector((-0.02, -0.52, 0.075)), aim0, aim0 + Vector((-0.01, -0.45, 0.065)), aim0 + Vector((0, 0, 0.002)),
             focus=((DBOX[0] + DBOX[1]) / 2, DBOX[2] - 0.01, 0.06))

else:
    # ---------- seated behind the desk, facing the camera ----------
    lean_shift = max(0.0, (TOP - SEAT_Z - SEAT_HIP)) * math.sin(math.radians(abs(LEAN[2])))
    hy = HY                     # tummy at the desk back edge; the chair was placed for this (pull_chair)
    off = M_["hips"] - M_["root"]
    ch.at(0, loc=(x_c - off.x, hy - off.y, SEAT_Z + SEAT_HIP - M_["hip_h"]))
    # legs: thighs forward from the seat, shins straight down so the feet are flat on the floor
    hipj = SEAT_Z + SEAT_HIP + M_["upleg_dz"]; dz = (FLOOR + M_["knee_h"]) - hipj
    dz = max(-0.95 * M_["thigh"], min(0.7 * M_["thigh"], dz)); hz = math.sqrt(max(1e-12, M_["thigh"] ** 2 - dz * dz))
    LEGS = {"RightUpLeg": (-0.12 * M_["thigh"], -hz, dz), "LeftUpLeg": (0.12 * M_["thigh"], -hz, dz), "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)}

    def body(t, arm_dirs, head):
        """Legs + spine lean + head first, then the arms (so arm IK sees the leaning shoulders)."""
        ch.pose(t, dict(LEGS), twist={"Spine1": LEAN, "Head": tuple(head)})
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            if b in arm_dirs: ch._aim(b, arm_dirs[b])
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            ch.pb[b].keyframe_insert("rotation_quaternion", frame=E.f(t))

    HEAD0 = Vector((0, 0, -2))
    body(0, P_LAP, HEAD0)
    for s_ in ("Right", "Left"):
        w_, f_, a_, p_ = hand_frame(ch, s_)
        HL[s_] = (to_local(ch, s_, f_, point=False).normalized(), to_local(ch, s_, p_, point=False).normalized())
    SHR, SHL = wpt(ch, "RightArm"), wpt(ch, "LeftArm"); mouth0 = mouth(ch)
    chest = mesh_hit(ch.meshes, Vector((x_c, DB - 0.03, TOP + 0.004)), Vector((0, 1, 0)))
    print("DESK SIT hips_y %.4f seat_y %.4f..%.4f desk_back %.4f body_front_at_desk_top %s feet_gap %.4f shR %s shL %s mouth %s top %.4f" % (
        hy, SBOX[2], SBOX[3], DB, ("%.4f" % chest.y) if chest is not None else "none",
        (wpt(ch, "RightFoot").z - FLOOR) - M_["ankle_h"], tuple(round(v, 4) for v in SHR), tuple(round(v, 4) for v in SHL),
        tuple(round(v, 4) for v in mouth0), TOP), flush=True)
    if hy > SBOX[3] - 0.002: print("DESK WARN hips behind the back of the seat (the chair is tucked too far under the desk)", flush=True)
    print("DESK LEGS seat_z %.4f seat_y %.4f..%.4f | hips %s upleg %s knee %s foot %s" % (SEAT_Z, SBOX[2], SBOX[3], tuple(round(v, 4) for v in wpt(ch, "Hips")),
          tuple(round(v, 4) for v in wpt(ch, "RightUpLeg")), tuple(round(v, 4) for v in wpt(ch, "RightLeg")), tuple(round(v, 4) for v in wpt(ch, "RightFoot"))), flush=True)
    HANDLEN = M_["hand"]

    def rest(side, P, fwd, palm=(0, 0, -1), grip=None):
        """A hand lying flat (palm down) with its palm centre on world point P."""
        f = Vector(fwd).normalized()
        return (hand_q(side, f, Vector(palm)), Vector(P) - f * (HANDLEN * 0.55) + Vector((0, 0, 0.0014)), grip or G_FLAT, POLE[side].copy())

    def from_prop(Md, C, grip, side="Right"):
        Mh = Md @ C.inverted()
        return (Mh.to_3x3().normalized().to_quaternion(), Mh.translation.copy(), grip, POLE[side].copy())

    def calibrate(side, q, grip):
        """Pose a hand (rotation q, fingers curled) on a scratch pose; returns its world matrix."""
        body(0, P_LAP, HEAD0); set_hand_rot(ch, side, q); curl(ch, side, grip)
        return hand_M(ch, side)

    def solve(t, fr, head, tr, tl):
        body(t, P_LAP, head)
        arms = {}
        for side, g in (("Right", tr), ("Left", tl)):
            arms.update(ik_arm(ch, side, g[1], g[3]))
            if fr % 12 == 0: print("DESK REACH %s t=%.2f need %.4f arm %.4f" % ((side, t) + ik_arm.last), flush=True)
        body(t, arms, head)
        for side, g in (("Right", tr), ("Left", tl)):
            set_hand_rot(ch, side, g[0]); curl(ch, side, g[2]); key_hand(ch, side, fr)

    # --- PENCIL, right hand, dynamic tripod grip ---
    # Right hand: palm faces DOWN and IN (towards his left, +x), the hand rests on its little-finger side on the paper.
    # Thumb pad on the LEFT/upper side of the pencil (+x side, towards his body), index pad on top, middle finger under it on the right;
    # ring and little finger tucked. The pencil lies in the thumb-index web and points back to his right shoulder at about 50 deg.
    Mh = calibrate("Right", hand_q("Right", Vector((0.2, -1, -0.4)), PALM_WRITE), G_PEN)
    tri_c = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex3", True) + wpt(ch, "RightHandMiddle3", True)) / 3
    web = (wpt(ch, "RightHandThumb2") + wpt(ch, "RightHandIndex1")) / 2
    d_end = (web - tri_c).normalized()
    palm_w = ch.arm.matrix_world.to_3x3().normalized() @ hand_frame(ch, "Right")[3]
    C_PEN = Mh.inverted() @ frame_M(tri_c - d_end * PEN_GRIP, d_end, palm_w)
    print("DESK GRIP pencil tripod-web %.4f pencil-vs-fingers %.0f deg" % ((web - tri_c).length,
          math.degrees(d_end.angle(-(wpt(ch, "RightHandMiddle1") - wpt(ch, "RightHand")).normalized()))), flush=True)

    def pen_write_M(tip):
        h = SHR - tip; h.z = 0; h.normalize()
        return frame_M(tip, h * math.cos(PEN_EL) + Vector((0, 0, math.sin(PEN_EL))), PALM_WRITE)

    # --- CUP HANDLE, right hand ---
    # Right hand comes from behind-right of the cup: palm faces the cup (+x, towards his left), fingers point forward (-y) and a little down,
    # so the thumb is UP: thumb pad on top of the handle, index finger bent through the loop, middle finger under it, ring + little finger tucked.
    Mh = calibrate("Right", hand_q("Right", Vector((0.1, -1, -0.3)), Vector((1, 0, 0))), G_HANDLE)
    gp = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex2", True)) / 2
    C_CUP = Mh.inverted() @ Matrix.Translation(gp - HANDLE_PT)
    # --- COVER EDGE, right hand ---
    # Right hand at the free (right, -x) edge near his corner: palm faces the spine (+x) and a little down, fingers forward-down,
    # thumb UP on the outside of the cover, index (and middle) under the edge. The hand turns with the cover up to about 95 deg, then lets go.
    G_LOCAL = Vector((-BOOK_W + 0.0003, (DB - 0.0025) - LAY["by"], COVER_T / 2))
    Mh = calibrate("Right", hand_q("Right", Vector((0.3, -0.75, -0.55)), Vector((1, 0, 0.25))), G_PINCH)
    pp = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex3", True)) / 2
    C_COV = Mh.inverted() @ Matrix.Translation(pp - G_LOCAL)
    body(0, P_LAP, HEAD_SIP); mouth_sip = mouth(ch)
    body(0, P_LAP, HEAD0)

    # resting hands (palm down, fingers forward and a little towards his middle)
    W_, x_h = BOOK_W, LAY["x_h"]
    R_COVER = rest("Right", (x_h - W_ * 0.55, DB - 0.0022, LAY["block_top"] + COVER_T), (0.25, -1, -0.05))
    R_PAGE = rest("Right", (x_h - W_ * 0.55, DB - 0.0018, LAY["block_top"]), (0.25, -1, -0.05))
    L_DESK = rest("Left", (x_h + W_ + 0.0028, DB - 0.0028, TOP), (-0.25, -1, 0))
    L_PAGE = rest("Left", (x_h + W_ * 0.5, DB - 0.003, LAY["block_top"] - W_ * 0.5 * math.sin(PHI)), (-0.25, -1, 0))
    hk = lambda keys, t: tuple(lerp_keys([(a, Vector(b)) for a, b in keys], t))
    pinch_now = lambda: (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex3", True)) / 2

    if SHOT == "K2":
        # opens the cover: hand on the closed book, to the free edge, lifts it with the edge to ~95 deg, lets go, the cover falls open
        G0, G1, LIFT0, LIFT1 = 0.85, 1.0, 1.1, 2.0
        TH_UP = math.radians(95); TH_END = math.pi + PHI

        def theta(t):
            if t < LIFT0: return 0.0
            if t < LIFT1: return TH_UP * E.ease((t - LIFT0) / (LIFT1 - LIFT0))
            u = min(1.0, (t - LIFT1) / 0.25)
            return TH_UP + (TH_END - TH_UP) * u * u            # past upright it falls open by itself (gravity)
        pre = from_prop(Matrix.Translation((-0.0008, 0.0002, 0.0009)) @ hinge_M(LAY, 0.0), C_COV, G_PINCH_OPEN)
        off_ = from_prop(Matrix.Translation((-0.0006, 0, 0.0016)) @ hinge_M(LAY, TH_UP), C_COV, G_RELAX)

        def right(t):
            if t < 0.35: return R_COVER
            if t < G0: return tblend(R_COVER, pre, (t - 0.35) / (G0 - 0.35))
            if t < LIFT0: return tblend(pre, from_prop(hinge_M(LAY, 0.0), C_COV, G_PINCH), (t - G0) / (G1 - G0))
            if t <= LIFT1: return from_prop(hinge_M(LAY, theta(t)), C_COV, G_PINCH)
            if t < LIFT1 + 0.2: return tblend(from_prop(hinge_M(LAY, TH_UP), C_COV, G_PINCH), off_, (t - LIFT1) / 0.2)
            return tblend(off_, R_PAGE, (t - LIFT1 - 0.2) / 0.6)
        HEADK = [(0.0, (0, 0, -3)), (0.35, (0, 0, -3)), (0.6, (0, -4, -16)), (2.2, (0, -4, -16)), (2.5, (0, 0, -2)), (9, (0, 0, -2))]
        for fr in E.frames():
            t = fr / E.FPS
            solve(t, fr, hk(HEADK, t), right(t), L_DESK)
            book.rotation_euler = (0, theta(t), 0); book.keyframe_insert("rotation_euler", frame=fr)
            if fr % 4 == 0 and G0 <= t <= LIFT1 + 0.1:
                print("CONTACT K2 t=%.2f theta %.0f pinch_to_edge %.4f" % (t, math.degrees(theta(t)), (pinch_now() - hinge_M(LAY, theta(t)) @ G_LOCAL).length), flush=True)
        ch.finish(); E.constant(book)
        set_M(pencil, M_PEN_FLAT, 0)

    else:
        book.rotation_euler = (0, math.pi + PHI, 0)      # already open (K2 opened it)
        path = []

        def pen_hand(Md):
            return from_prop(Md, C_PEN, G_PEN)

        def actual_pen():
            return hand_M(ch, "Right") @ C_PEN

        if SHOT == "K3":
            # writes two little words; the left hand holds the book flat on the open cover; then looks up at the camera
            HEADK = [(0.0, (0, 0, -16)), (2.15, (0, 0, -16)), (2.4, (0, 0, -1)), (9, (0, 0, -1))]
            for fr in E.frames():
                t = fr / E.FPS
                tip, touch = write_path(t)
                solve(t, fr, hk(HEADK, t), pen_hand(pen_write_M(tip)), L_PAGE)
                Mp = actual_pen(); set_M(pencil, Mp, fr); a = Mp.translation
                if touch and abs(a.z - (LAY["block_top"] + 0.00003)) < 0.0005:
                    path.append((t, Vector((a.x, a.y, LAY["block_top"] + 0.00002))))
                if fr % 4 == 0:
                    print("CONTACT K3 t=%.2f tip_to_paper %.4f tip_err %.4f pinky_side_to_paper %.4f" % (
                        t, a.z - LAY["block_top"], (a - tip).length, wpt(ch, "RightHandPinky1").z - LAY["block_top"]), flush=True)
            ch.finish(); E.constant(pencil)
            marks(path, True)
        else:
            # K4: pencil down (released only once it touches the desk), cup by its handle, a sip beside his face, cup back on the saucer
            pts = []
            for fr in range(0, E.f(DUR["K3"]) + 2, 2):
                p, touch = write_path(fr / E.FPS)
                if touch: pts.append((0.0, p + Vector((0, 0, -0.00001))))
            marks(pts, False)                                  # the words he wrote in K3 are already on the page
            END_TIP = write_path(9.0)[0]
            M0 = pen_write_M(END_TIP); M_LIFT = Matrix.Translation((0, 0, 0.0015)) @ M0
            M_DOWN = frame_M(REST_TIP_DOWN, Vector((0, math.cos(math.radians(15)), math.sin(math.radians(15)))), PALM_WRITE)
            M_ABOVE = Matrix.Translation((0, 0, 0.0018)) @ M_DOWN
            REL_PEN = 1.3
            PENK = [(0.0, M0), (0.2, M0), (0.45, M_LIFT), (1.05, M_ABOVE), (REL_PEN, M_DOWN)]

            def pen_target(t):
                for (t0, a), (t1, b) in zip(PENK, PENK[1:]):
                    if t <= t1: return a if t <= t0 else blend_M(a, b, (t - t0) / (t1 - t0))
                return M_DOWN
            home = LAY["cup_home"]; up = Vector((0, 0, 0.0016))
            lips = mouth_sip + SIP_D; r10 = math.radians(10)
            side_off = Vector((-0.0025, -0.0004, -0.0012))     # comes to the lips from his right side, level, not from below
            base_for = lambda p, tl: p - Matrix.Rotation(tl, 3, "Y") @ RIM
            GRAB, LET = 2.45, 6.05
            CKB = [(0.0, home), (3.3, home), (3.45, home + up), (3.8, base_for(lips + side_off, r10)), (4.0, base_for(lips, r10)),
                   (4.25, base_for(lips, SIP_TILT)), (5.1, base_for(lips, SIP_TILT)), (5.3, base_for(lips, r10)),
                   (5.5, base_for(lips + side_off, r10)), (5.85, home + up), (LET - 0.05, home), (9.0, home)]
            CKT = [(0.0, 0.0), (3.45, 0.0), (3.8, r10), (4.0, r10), (4.25, SIP_TILT), (5.1, SIP_TILT), (5.3, r10), (5.5, r10), (5.85, 0.0), (9.0, 0.0)]
            cup_target = lambda t: cup_M(lerp_keys(CKB, t), lerp_keys(CKT, t))
            pen_off = from_prop(Matrix.Translation((0, 0, 0.0015)) @ M_DOWN, C_PEN, G_RELAX)
            cup_pre = from_prop(Matrix.Translation((-0.0012, 0.0006, 0.0010)) @ cup_M(home, 0.0), C_CUP, G_HANDLE_OPEN)
            cup_grab = from_prop(cup_M(home, 0.0), C_CUP, G_HANDLE)
            cup_off = from_prop(Matrix.Translation((-0.0012, 0.0006, 0.0012)) @ cup_M(home, 0.0), C_CUP, G_RELAX)

            def right(t):
                if t < REL_PEN: return pen_hand(pen_target(t))
                if t < REL_PEN + 0.25: return tblend(pen_hand(M_DOWN), pen_off, (t - REL_PEN) / 0.25)
                if t < 2.25: return tblend(pen_off, cup_pre, (t - REL_PEN - 0.25) / (2.25 - REL_PEN - 0.25))
                if t < GRAB: return tblend(cup_pre, cup_grab, (t - 2.25) / (GRAB - 2.25))
                if t <= LET: return from_prop(cup_target(t), C_CUP, G_HANDLE)
                if t < LET + 0.2: return tblend(cup_grab, cup_off, (t - LET) / 0.2)
                return tblend(cup_off, R_PAGE, (t - LET - 0.2) / 0.6)
            HEADK = [(0.0, (0, 0, -2)), (0.3, (0, -6, -10)), (1.3, (0, -6, -10)), (1.6, (0, 0, -2)), (3.3, (0, 0, -2)),
                     (3.7, tuple(HEAD_SIP)), (5.3, tuple(HEAD_SIP)), (5.7, (0, 0, -2)), (9, (0, 0, -2))]
            pen_fall = None
            for fr in E.frames():
                t = fr / E.FPS
                solve(t, fr, hk(HEADK, t), right(t), L_PAGE)
                if t < REL_PEN:
                    Mp = actual_pen(); pen_fall = Mp
                else:                                          # let go with the tip on the desk: the raised end drops flat
                    u = min(1.0, (t - REL_PEN) / 0.15)
                    Mp = blend_M(pen_fall, M_PEN_FLAT, u * u) if pen_fall is not None else M_PEN_FLAT
                set_M(pencil, Mp, fr)
                Mc = hand_M(ch, "Right") @ C_CUP if GRAB <= t <= LET else cup_M(home, 0.0)
                set_M(cup, Mc, fr)
                if fr % 4 == 0:
                    rim = Mc @ RIM; m_ = mouth(ch)
                    gp_now = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex2", True)) / 2
                    print("CONTACT K4 t=%.2f pen_tip_to_desk %.4f cup_rim_to_lips %.4f rim_below_mouth %.4f fingers_to_handle %.4f cup_off_target %.4f cup_above_home %.4f" % (
                        t, Mp.translation.z - TOP, (rim - m_).length, m_.z - rim.z, (gp_now - Mc @ HANDLE_PT).length,
                        (Mc.translation - cup_target(t).translation).length, Mc.translation.z - home.z), flush=True)
            ch.finish(); E.constant(pencil); E.constant(cup)

    # ---------- cameras ----------
    if CAMSUB not in ("main", "C", "S"):
        for o in [tea_root] + list(tea_root.children_recursive): o.hide_render = True     # side table would stand between a hand camera and the hand
    write0 = write_path(0.6)[0]
    HANDCAM = {   # aim, camera offset. His right hand is on the -x side; DOF off, 190 mm.
        "K2H": (hinge_M(LAY, math.radians(45)) @ G_LOCAL, Vector((-0.06, -0.12, 0.05))),
        "K2H2": (hinge_M(LAY, math.radians(45)) @ G_LOCAL, Vector((-0.14, -0.01, 0.03))),
        "K3H": (write0 + Vector((-0.001, 0.002, 0.003)), Vector((-0.06, -0.12, 0.05))),
        "K3H2": (write0 + Vector((-0.001, 0.002, 0.003)), Vector((-0.14, -0.01, 0.025))),
        "K3H3": (write0 + Vector((-0.001, 0.002, 0.003)), Vector((-0.01, -0.04, 0.14))),
        "K4HP": (LAY["pen_rest"] + Vector((0, 0.002, 0.003)), Vector((-0.07, -0.12, 0.05))),
        "K4HC": (LAY["cup_home"] + HANDLE_PT, Vector((-0.07, -0.12, 0.03))),
        "K4HC2": (LAY["cup_home"] + HANDLE_PT, Vector((-0.14, 0.0, 0.02))),
        "K4HS": (mouth0 + Vector((-0.003, -0.001, -0.004)), Vector((0.06, -0.13, 0.012))),
        "K4HS2": (mouth0 + Vector((-0.003, -0.001, -0.004)), Vector((-0.14, -0.01, 0.01))),
        # seat / legs check (teacher 11/20: legs must lie ON the seat, never go through it)
        "K2L": (Vector((x_c, HY - 0.004, SEAT_Z + 0.005)), Vector((-0.17, 0.0, 0.004))),       # straight from his right side, seat height
        "K2L2": (Vector((x_c, SBOX[2], SEAT_Z + 0.003)), Vector((0.06, -0.13, 0.0)))}           # low front-left, under the desk top
    key = SHOT + CAMSUB
    if key in HANDCAM:
        aim, off = HANDCAM[key]
        cam_move(190, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    elif CAMSUB in ("C", "S"):
        hand_pt = {"K2": hinge_M(LAY, math.radians(45)) @ G_LOCAL, "K3": write0, "K4": (LAY["cup_home"] + mouth0) / 2}[SHOT]
        aim = Vector((hand_pt.x, hand_pt.y + 0.001, (hand_pt.z + mouth0.z) / 2 if SHOT != "K4" else hand_pt.z))
        off = Vector((-0.085, -0.11, 0.022)) if CAMSUB == "C" else Vector((-0.14, -0.018, 0.012))
        cam_move(115, aim + off, aim, aim + off, aim)
    elif SHOT == "K2":       # the desk from the front: whole seated boy, legs under the desk, the book in front of him
        aim = Vector((x_c, DB - 0.004, (FLOOR + mouth0.z + 0.012) / 2))
        cam_move(62, aim + Vector((-0.035, -0.31, 0.065)), aim, aim + Vector((-0.03, -0.27, 0.055)), aim, focus=(x_c, DB - 0.004, TOP))
    elif SHOT == "K3":       # a little from above: page, pencil hand and his face
        aim = Vector((LAY["x_h"] - BOOK_W * 0.45, DB - 0.001, TOP + 0.014))
        cam_move(72, aim + Vector((-0.03, -0.165, 0.115)), aim, aim + Vector((-0.028, -0.155, 0.108)), aim, focus=(aim.x, DB - 0.003, TOP + 0.006))
    else:                    # K4: front, a little from his left so the cup at his right cheek stays beside the face; clock in the top corner
        aim = Vector((x_c - 0.001, mouth0.y + 0.006, (mouth0.z + TOP) / 2 + 0.003))
        cam_move(54, aim + Vector((0.05, -0.245, -0.002)), aim, aim + Vector((0.05, -0.245, -0.002)), aim, focus=mouth0)
    print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)

E.run(A[3:])
