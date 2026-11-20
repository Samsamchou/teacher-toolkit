# World Routines Trip - Taiwan station "I have breakfast at six forty-five." (tabletop style H)
# blender -b --factory-startup --python taiwan_breakfast.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: B1 question + answer in front of the breakfast shop (clock 6:45) / B2 picking up the tray at the counter /
#         B3 sitting at the little table, "Zao an! Good morning!" / B4 eating dan bing, then a sip of soy milk
# Characters: taiwan_girl (school uniform) and traveler_girl. Props: breakfast_shop, breakfast_table (table + two stools), breakfast_tray.
# The soy-milk cup, straw, chopsticks, clock, steam and the street set are made here.
# Uses the shared engine from the Thanksgiving classroom-tabletop project (engine.py, uploaded next to this file).
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
# shot lengths and voice start times (seconds): keep in step with taiwan_compose.py
DUR = {"B1": 5.6, "B2": 3.8, "B3": 3.0, "B4": 8.2}
CAMSUB = {"B4C": "close", "B4S": "side", "B4HP": "hp", "B4HP2": "hp2", "B4HM": "hm", "B4HM2": "hm2", "B4HL": "hl", "B4HL2": "hl2", "B4HS": "hs"}.get(SHOT, "main")
SHOT = "B4" if SHOT.startswith("B4") else SHOT       # B4 / B4C / B4S = the same action seen from the main / close / side camera
VOICE = {"q": 0.4, "a": 2.6, "zaoan": 0.9, "eat": 0.5}
E.init(PROPS, FONTS, DUR[SHOT])
sc = E.sc
FLOOR = 0.012
KID = 0.070                      # pupil height (m)
GIRL = KID * 1.06                # the traveller: her sun hat adds a little height
PUPIL = KID * 1.04
SHOP_H = KID * float(os.environ.get("SHOP_K", "1.62"))
TABLE_TOP = KID * 0.54           # the table top is the highest point of the table + stools model
SX, SY = -0.17, 0.135            # shop position (it faces the camera, -y)
TX, TY = 0.13, 0.02              # table position
CLOCK = (TX + 0.066, 0.238, FLOOR + 0.108)
ROT_SHOP = math.radians(float(os.environ.get("ROT_SHOP", "0")))
T = DUR[SHOT]
YAW = float(os.environ.get("YAW", "30"))


# ---------- street set ----------
def hand_box(cx, cy, cz, ang, length, width, mat, name):
    """A clock hand from the centre, pointing ang (radians, clockwise from 12)."""
    E.box((cx + length / 2 * math.sin(ang), cy, cz + length / 2 * math.cos(ang)), (width, 0.001, length), mat, name, bevel=0, rot=(0, ang, 0))


def street():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("pavement", (0.66, 0.50, 0.46)), "pavement", thick=FLOOR)
    line = E.mat("tileLine", (0.50, 0.36, 0.34), 0.9)
    for i in range(1, 16):       # pavement tiles
        E.box((-0.32 + i * 0.04, 0.03, FLOOR + 0.0002), (0.001, 0.44, 0.0004), line, "tileX", bevel=0)
    for j in range(1, 11):
        E.box((0, -0.19 + j * 0.04, FLOOR + 0.0002), (0.64, 0.001, 0.0004), line, "tileY", bevel=0)
    # the house wall behind the shop (cream, with a brick-red base) and two side walls
    E.box((0, 0.246, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("houseWall", (0.86, 0.72, 0.46)), "houseWall")
    E.box((0, 0.2395, FLOOR + 0.025), (0.64, 0.002, 0.05), E.felt("brickBase", (0.55, 0.22, 0.16)), "brickBase", bevel=0)
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", (0.82, 0.68, 0.44)), "sideWall")
    # wall clock showing 6:45
    cx, cy, cz = CLOCK
    E.cyl((cx, cy, cz), 0.030, 0.006, E.mat("clockRim", (0.75, 0.16, 0.14), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0025, cz), 0.026, 0.004, E.mat("clockFace", (0.98, 0.97, 0.93), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.08, 0.08, 0.12), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.022 * math.sin(a), cy - 0.005, cz + 0.022 * math.cos(a)), 0.0018 if big else 0.001, ink, "tick")
    hand_box(cx, cy - 0.0052, cz, math.radians((6 + 45 / 60) * 30), 0.013, 0.0028, ink, "hourHand")       # three quarters of the way from 6 to 7
    hand_box(cx, cy - 0.0058, cz, math.radians(270), 0.019, 0.0018, ink, "minuteHand")                      # pointing at 9
    E.ball((cx, cy - 0.006, cz), 0.002, E.mat("clockPin", (0.75, 0.16, 0.14), 0.4), "clockPin")
    # a window with the sunrise sky behind it
    wx = -0.02
    E.box((wx, 0.2385, FLOOR + 0.14), (0.085, 0.004, 0.085), E.emission("sky", (1.0, 0.78, 0.62), 1.5), "windowSky", bevel=0)
    for (x, z, sx, sz) in ((wx, FLOOR + 0.184, 0.095, 0.006), (wx, FLOOR + 0.096, 0.095, 0.006), (wx - 0.045, FLOOR + 0.14, 0.006, 0.092),
                           (wx + 0.045, FLOOR + 0.14, 0.006, 0.092), (wx, FLOOR + 0.14, 0.004, 0.085), (wx, FLOOR + 0.14, 0.09, 0.004)):
        E.box((x, 0.2355, z), (sx, 0.005, sz), E.wood(), "windowFrame", bevel=0.001)


def rays_down(x, y, z_from):
    dg = bpy.context.evaluated_depsgraph_get()
    ok, loc, n, idx, ob, mx = sc.ray_cast(dg, Vector((x, y, z_from)), Vector((0, 0, -1)), distance=2.0)
    return loc.z if ok else None


def drop(root):
    for o in [root] + list(root.children_recursive): bpy.data.objects.remove(o, do_unlink=True)


def probe_table(rot):
    """Table-top height and the two stool seats, relative to the model root, for a given rotation."""
    root = E.place(f"{PROPS}/breakfast_table.glb", TABLE_TOP, (5, 5, 0), rot_z=rot)
    bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(root)
    pts = []
    for i in range(57):
        for j in range(57):
            x, y = x0 + (x1 - x0) * i / 56, y0 + (y1 - y0) * j / 56
            z = rays_down(x, y, 1.0)
            if z is not None: pts.append((x - 5, y - 5, z))
    table = [p for p in pts if p[2] > 0.92 * top]
    tx, ty = sum(p[0] for p in table) / len(table), sum(p[1] for p in table) / len(table)
    low = [p for p in pts if 0.42 * top < p[2] < 0.85 * top]
    spread_x = max(p[0] for p in low) - min(p[0] for p in low); spread_y = max(p[1] for p in low) - min(p[1] for p in low)
    ax = 0 if spread_x > spread_y else 1
    stools = []
    for sign in (-1, 1):
        g = [p for p in low if (p[ax] - (tx, ty)[ax]) * sign > 0]
        zs = sorted(p[2] for p in g); zt = zs[int(len(zs) * 0.9)]
        g = [p for p in g if p[2] > zt - 0.002]
        stools.append((sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g), zt))
    info = dict(top=top, table=(tx, ty), stools=stools, axis=ax)
    print("DESK TABLE rot", round(math.degrees(rot)), {"top": round(top, 4), "table": (round(tx, 4), round(ty, 4)),
          "stools": [tuple(round(v, 4) for v in s) for s in stools], "axis": ax}, flush=True)
    drop(root)
    return info


def table_set():
    """Place the table so one stool is behind it (+y, the pupil sits there facing the camera). Returns (table_xy, top_z, back_stool, front_stool)."""
    rot = 0.0; info = probe_table(rot)
    if info["axis"] == 0: rot = math.pi / 2; info = probe_table(rot)
    r = E.place(f"{PROPS}/breakfast_table.glb", TABLE_TOP, (TX, TY, FLOOR), rot_z=rot); E.obstacle(r)
    st = sorted(info["stools"], key=lambda s: s[1])
    w = lambda s: (TX + s[0], TY + s[1], FLOOR + s[2])
    return (TX + info["table"][0], TY + info["table"][1]), FLOOR + info["top"], w(st[1]), w(st[0])


def shop():
    """Place the shop and find its serving counter. Returns (root, bbox, counter_front_y, counter_z)."""
    if not os.path.exists(f"{PROPS}/breakfast_shop.glb"):      # model not ready yet: stand-in numbers so the other shots can be checked
        return None, (SX - 0.05, SX + 0.05, SY - 0.04, SY + 0.04, FLOOR + SHOP_H), SY - 0.03, FLOOR + 0.05
    r = E.place(f"{PROPS}/breakfast_shop.glb", SHOP_H, (SX, SY, FLOOR), rot_z=ROT_SHOP); E.obstacle(r)
    bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(r)
    h = top - FLOOR; cx = (x0 + x1) / 2
    front, cz = None, None
    for i in range(60):          # walk in from the front, starting below the awning, until something solid at counter height is found
        y = y0 + (y1 - y0) * 0.6 * i / 59
        zs = [z for z in (rays_down(cx + dx, y, FLOOR + 0.62 * h) for dx in (-0.012, 0, 0.012)) if z is not None]
        if zs and FLOOR + 0.25 * h < max(zs) < FLOOR + 0.6 * h:
            front, cz = y, max(zs); break
    if front is None: front, cz = y0 + 0.2 * (y1 - y0), FLOOR + 0.42 * h
    for k in range(1, 8):        # the counter top a little further in (the front edge may be a rim)
        z = rays_down(cx, front + 0.002 * k, FLOOR + 0.62 * h)
        if z is not None and FLOOR + 0.25 * h < z < FLOOR + 0.6 * h: cz = max(cz, z)
    print("DESK SHOP", {"bbox": [round(v, 4) for v in (x0, x1, y0, y1, top)], "counter_front_y": round(front, 4), "counter_z": round(cz, 4)}, flush=True)
    return r, (x0, x1, y0, y1, top), front, cz


def steam(x, y, z0, z1, n=6):
    """Cotton-wool steam puffs rising from the steamer (stop-motion: one position every 2 frames)."""
    cotton = E.felt("steam", (0.97, 0.97, 0.95))
    for k in range(n):
        b = E.ball((x, y, z0), 0.0026, cotton, "steam")
        for fr in E.frames():
            u = ((fr / E.FPS) * 0.45 + k / n) % 1.0
            b.location = (x + 0.006 * math.sin(k * 2.1 + u * 5.0), y + 0.003 * math.cos(k * 1.3), z0 + (z1 - z0) * u)
            s = 0.6 + 0.9 * u if u < 0.8 else (1.5 - (u - 0.8) * 7.0)
            b.scale = (max(0.02, s),) * 3
            b.keyframe_insert("location", frame=fr); b.keyframe_insert("scale", frame=fr)
        E.constant(b)


def hips_height(ch):
    bpy.context.view_layer.update()
    return (ch.arm.matrix_world @ ch.pb["Hips"].head).z - (ch.root.matrix_world.translation.z - ch.base_z)


def animate(ch, fn, after=None):
    """fn(t) -> (arms, head twist). One pose every 2 frames (stop-motion). after(t, frame) runs once the pose is set (props that follow hands)."""
    for fr in E.frames():
        t = fr / E.FPS; arms, head = fn(t)
        ch.pose(t, arms, twist={"Head": head})
        if after: after(t, fr)
    ch.finish(); return ch


def stand(name, loc, face, fn, after=None, height=KID):
    return animate(E.Char(name, loc, face, height=height), fn, after)


def seat(name, stool, height=KID):
    """Put a pupil on a stool, facing -y (hips on the seat). Pose the legs with LEGS: thighs forward, lower legs hanging down."""
    ch = E.Char(name, (stool[0], stool[1]), 0, height=height)
    ch.at(0, loc=(stool[0], stool[1] + 0.002, stool[2] + 0.0075 - hips_height(ch)))
    return ch


def local_dir(ch_loc, face_deg, target, from_z):
    v = Vector(target) - Vector((ch_loc[0], ch_loc[1], from_z)); a = -math.radians(face_deg)
    return (v.x * math.cos(a) - v.y * math.sin(a), v.x * math.sin(a) + v.y * math.cos(a), v.z)


def key_obj(ob, fr, rot=False):
    ob.keyframe_insert("location", frame=fr)
    if rot: ob.keyframe_insert("rotation_euler", frame=fr)


def aim_rod(ob, a, b, fr):
    """Put a thin rod (a cylinder along its own z) between two points and keyframe it."""
    v = (b - a)
    ob.location = (a + b) / 2; ob.rotation_euler = Vector((0, 0, 1)).rotation_difference(v.normalized()).to_euler()
    key_obj(ob, fr, rot=True)


LEGS = {"RightUpLeg": (-0.12, -1, -0.12), "LeftUpLeg": (0.12, -1, -0.12), "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)}
P_CARRY = {"RightArm": (-0.28, -0.45, -0.85), "RightForeArm": (-0.08, -1, 0.05), "LeftArm": (0.28, -0.45, -0.85), "LeftForeArm": (0.08, -1, 0.05)}
# reaching up to the counter (it is at a child's shoulder height): upper arms forward, forearms forward and a little up
P_REACH = {"RightArm": (-0.22, -1, -0.05), "RightForeArm": (-0.06, -1, 0.3), "LeftArm": (0.22, -1, -0.05), "LeftForeArm": (0.06, -1, 0.3)}
P_LAP = {"RightArm": (-0.3, -0.35, -0.9), "RightForeArm": (0.15, -0.9, -0.35), "LeftArm": (0.3, -0.35, -0.9), "LeftForeArm": (-0.15, -0.9, -0.35)}
# eating: the right hand goes between the plate and the chin (never in front of the face); the left hand rests beside the plate
R_EAT = [{"RightArm": (-0.36, -0.55, -0.76), "RightForeArm": (0.42, -0.5, u)} for u in (0.2, 0.62)]
L_REST = {"LeftArm": (0.32, -0.6, -0.74), "LeftForeArm": (-0.2, -1, 0.12)}
L_DRINK = {"LeftArm": (0.36, -0.55, -0.76), "LeftForeArm": (-0.42, -0.5, 0.62)}       # cup held below the chin, straw up to the mouth


def cam_move(lens, c0, a0, c1, a1, focus=None):
    c, a, fo = E.camera("cam", lens, 8)

    def path(t):
        u = E.ease(t / T)
        return E.vlerp(c0, c1, u), E.vlerp(a0, a1, u), (Vector(focus) if focus else E.vlerp(a0, a1, u))
    E.key_cam(c, a, fo, path)


def tray_at(x, y, z):
    return E.place(f"{PROPS}/breakfast_tray.glb", 0.024, (x, y, z), axis="long")


def drop_tray_sticks(root):
    """Delete the chopsticks that come with the tray model (they lie along its +x edge, above the tray floor), so only one pair exists."""
    import bmesh
    n = 0
    for o in [root] + list(root.children_recursive):
        if o.type != "MESH": continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        kill = [f for f in bm.faces if all(0.262 < v.co.x < 0.40 and -0.38 < v.co.y < 0.41 and v.co.z > float(os.environ.get("STICK_Z", "0.023")) for v in f.verts)]
        n += len(kill)
        bmesh.ops.delete(bm, geom=kill, context="FACES"); bm.to_mesh(o.data); bm.free(); o.data.update()
    print("DESK TRAY removed %d faces of the tray chopsticks" % n, flush=True)


def cup_parts():
    cup = E.cyl((0, 0, 0), 0.0030, 0.0085, E.mat("cup", (0.97, 0.94, 0.86), 0.5), verts=24, name="soyCup")
    lid = E.cyl((0, 0, 0), 0.0032, 0.001, E.mat("cupLid", (0.92, 0.3, 0.26), 0.45), verts=24, name="soyLid")
    straw = E.cyl((0, 0, 0), 0.00045, 0.011, E.mat("straw", (0.9, 0.2, 0.2), 0.4), verts=8, name="straw")
    return cup, lid, straw



street()
L, Fl, R = E.lights(lamp=float(os.environ.get("LAMP", "0.7")))
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); sun = bpy.context.object      # soft, warm early-morning light
sun.data.energy = 1.6; sun.data.color = (1, 0.92, 0.8); sun.data.size = 0.5; sun.rotation_euler = (math.radians(25), 0, 0)
shop_root, SB, CFRONT, CZ = shop()
steam(SB[0] + 0.3 * (SB[1] - SB[0]), CFRONT + 0.25 * (SB[3] - CFRONT), CZ + 0.028, CZ + 0.043)
if SHOT != "B2":
    TABLE_XY, TOP_Z, BACK, FRONT = table_set()

if SHOT == "B1":
    # the traveller asks; the pupil points at the clock: six forty-five
    tray_at((SB[0] + SB[1]) / 2 + 0.01, CFRONT + 0.013, CZ + 0.0003)      # her breakfast is waiting on the counter
    PL, PF = (-0.045, -0.03), 18; GL, GF = (0.04, -0.035), -22
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.9, VOICE["a"], VOICE["a"] + 2.4
    point = local_dir(PL, PF, CLOCK, FLOOR + KID * 0.6)

    def pupil(t):
        if t >= ans0 - 0.15:                                      # points at the clock with her left arm (the clock is on her left)
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            return E.P_point((point[0], point[1], point[2] + 0.06 * k), right=False), (0, 14 if t < ans1 else 0, 4)
        return E.P_stand(), (0, 14, 0)                            # listening: head turned to the traveller

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, -14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)      # looks up at the clock
        return E.P_stand(), (0, -14, 0)
    stand("taiwan_girl", PL, PF, pupil, height=PUPIL)
    stand("traveler_girl", GL, GF, girl, height=GIRL)
    cam_move(42, (-0.03, -0.47, 0.15), (-0.03, 0.04, 0.078), (-0.01, -0.40, 0.138), (-0.01, 0.04, 0.08), focus=(0.0, -0.03, 0.06))

elif SHOT == "B2":
    # at the counter: she lifts her tray (dan bing) with both hands; seen from the side so her face shows
    px = (SB[0] + SB[1]) / 2 + 0.012
    ch = E.Char("taiwan_girl", (px, CFRONT - 0.013), 180, height=PUPIL)
    tray = tray_at(px, CFRONT + 0.012, CZ + 0.0003)
    LIFT = 1.3

    def arms(t):
        back = 0.018 * E.ease((t - LIFT - 0.15) / 0.5)             # half a step back once the tray is in her hands
        ch.at(t, loc=(px, CFRONT - 0.013 - back))                 # set here (before the pose) so the tray follows the hands at the right place
        if t < LIFT: return P_REACH, (0, 0, -14)                  # hands on both sides of the tray, looking at it
        return P_CARRY, ((0, -2 * YAW, 0) if t > LIFT + 0.7 else (0, 0, -8))      # lifts it, then turns her head to the camera

    def hold(t, fr):                                              # the tray rests on the counter until her hands take its weight
        hr, hl = hand(ch, "Right"), hand(ch, "Left"); mid = (hr + hl) / 2
        tz = max(hr.z, hl.z) + 0.0012
        if t < LIFT or mid.y + 0.004 > CFRONT - 0.011: tz = max(tz, CZ + 0.0003) if t >= LIFT else CZ + 0.0003      # still over the counter: it slides on the counter top, never through it
        tray.location = (mid.x, mid.y + 0.004, tz); key_obj(tray, fr)
        if fr in (0, 26, 34): print("CONTACT B2 t=%.2f hand_z=%.4f counter_z=%.4f hand_y=%.4f counter_front=%.4f" % (t, max(hr.z, hl.z), CZ, mid.y, CFRONT), flush=True)
    animate(ch, arms, hold)
    E.constant(tray)
    aim = (px - 0.03, CFRONT + 0.005, FLOOR + 0.056)
    cam_move(50, (px + 0.25, CFRONT - 0.15, 0.115), aim, (px + 0.215, CFRONT - 0.13, 0.108), aim)

elif SHOT in ("B3", "B4"):
    TRAY_DY = float(os.environ.get("TRAY_DY", "0.010"))
    SEAT_DY = float(os.environ.get("SEAT_DY", "0.003"))          # she sits on the front of the stool, close to the table
    tray = tray_at(TABLE_XY[0] - 0.004, TABLE_XY[1] - 0.001 + TRAY_DY, TOP_Z + 0.0003)
    cup, lid, straw = cup_parts()
    CUP0 = Vector((TABLE_XY[0] + 0.0125, TABLE_XY[1] + 0.0125, TOP_Z + 0.0043))       # the cup stands to the right of the tray (her left hand side)

    def cup_frame(fr, base=None, to=None):
        c = base if base is not None else CUP0
        cup.location = c; lid.location = c + Vector((0, 0, 0.0047)); key_obj(cup, fr); key_obj(lid, fr)
        a = c + Vector((0, 0, 0.0045))
        aim_rod(straw, a - Vector((0, 0, 0.003)), to if to is not None else a + Vector((0.0015, -0.0015, 0.007)), fr)
    if SHOT == "B3":
        say = VOICE["zaoan"]

        def pupil(t):                                             # sits down to her breakfast, then waves: "Zao an! Good morning!"
            if say - 0.1 <= t < say + 1.7:
                return {**LEGS, **L_REST, **{k: v for k, v in E.P_wave(int((t - say) * 3) % 2).items() if k.startswith("Right")}}, (0, 18, 2)
            return {**LEGS, **P_LAP}, (0, 0, -6)
        animate(seat("taiwan_girl", (BACK[0], BACK[1] - SEAT_DY, BACK[2]), height=PUPIL), pupil, lambda t, fr: cup_frame(fr))
        GL = (TABLE_XY[0] - 0.082, TABLE_XY[1] - 0.03)

        def girl(t):                                              # the traveller waves back
            if t >= say + 0.5: return E.P_wave(int((t - say) * 3) % 2), (0, -16, 0)
            return E.P_stand(), (0, -16, 0)
        stand("traveler_girl", GL, 55, girl, height=GIRL)
        cam_move(50, (TX - 0.02, TY - 0.30, 0.12), (TX - 0.02, TY, 0.062), (TX - 0.02, TY - 0.27, 0.114), (TX - 0.02, TY, 0.062))
    else:
        # One bite of dan bing with a real chopstick grip, chopsticks laid on the tray, then one sip of soy milk with the cup in her left hand.
        # Timed to the words: "I eat egg pancakes" 0.6-2.2 / "and drink soy milk" 2.2-3.8 / "I have breakfast at six forty-five" 4.8-7.6
        cam_sub = CAMSUB
        drop_tray_sticks(tray)
        stick_m = E.mat("chopstick", (0.42, 0.22, 0.10), 0.45); tipm = E.mat("chopTip", (0.55, 0.16, 0.12), 0.5)
        lower = E.cyl((0, 0, 0), 0.0004, STICK_L, stick_m, verts=10, name="stickLower"); lower["len"] = STICK_L
        upper = E.cyl((0, 0, 0), 0.0004, STICK_L, stick_m, verts=10, name="stickUpper"); upper["len"] = STICK_L
        roll_m = E.felt("danbing", (0.98, 0.82, 0.32)); egg_m = E.felt("danbingEgg", (1.0, 0.68, 0.12))
        piece = E.cyl((0, 0, 0), 0.0020, 0.0028, roll_m, verts=20, name="danbingPiece")
        yolk = E.cyl((0, 0, 0), 0.0012, 0.0029, egg_m, verts=16, name="danbingEgg")
        ch = seat("taiwan_girl", (BACK[0], BACK[1] - SEAT_DY, BACK[2]), height=PUPIL)
        LEAN = tuple(float(v) for v in os.environ.get("LEAN", "0,0,-6").split(","))   # lean forward over the table (Spine twist)

        def body(t, arm_dirs, head):
            """Legs + spine lean + head first, then the arms (so arm IK sees the leaning shoulders)."""
            ch.pose(t, dict(LEGS), twist={"Spine1": LEAN, "Head": head})
            for side in ("Right", "Left"):
                for b in (side + "Arm", side + "ForeArm"):
                    if b in arm_dirs: ch._aim(b, arm_dirs[b])
            for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
                ch.pb[b].keyframe_insert("rotation_quaternion", frame=E.f(t))
        mw = lambda b, tail=False: ch.arm.matrix_world @ (ch.pb[b].tail if tail else ch.pb[b].head)

        # --- calibrate the chopstick grip once (hand-local, so it moves with the hand) ---
        body(0, P_LAP, (0, 0, -6)); curl(ch, "Right", G_CHOP); bpy.context.view_layer.update()
        web = (ch.pb["RightHandThumb2"].head + ch.pb["RightHandIndex1"].head) / 2
        ring = ch.pb["RightHandRing3"].tail.copy()
        pinch = (ch.pb["RightHandThumb3"].tail + ch.pb["RightHandIndex3"].tail) / 2
        web_l, ring_l, pinch_l = (to_local(ch, "Right", v) for v in (web, ring, pinch))
        dir_l = (ring_l - web_l).normalized()
        k = (pinch_l - web_l).dot(dir_l); side_l = (pinch_l - (web_l + dir_l * k)); side_l = side_l.normalized()
        palm_l = to_local(ch, "Right", hand_frame(ch, "Right")[3], point=False).normalized()
        print("DESK GRIP web-ring %.5f pinch-off %.5f" % ((ring_l - web_l).length, (pinch_l - (web_l + dir_l * k)).length), flush=True)
        # cup grip (left hand): fingers wrap the cup, the cup sits against the palm
        body(0, P_LAP, (0, 0, -6)); curl(ch, "Left", G_CUP); bpy.context.view_layer.update()
        wL, fwdL, acrL, palmL = hand_frame(ch, "Left")
        palmc = (wL + ch.pb["LeftHandMiddle1"].head) / 2
        cup_off_l = to_local(ch, "Left", palmc + palmL * (0.0034 / ch.arm.matrix_world.to_scale()[0]))
        fwdL_l = to_local(ch, "Left", fwdL, point=False).normalized(); palmL_l = to_local(ch, "Left", palmL, point=False).normalized()

        bpy.context.view_layer.update(); _w = ch.arm.matrix_world
        print("DESK GEO shR %s shL %s mouth %s hips %s table %s top %.4f" % (tuple(round(v, 4) for v in _w @ ch.pb["RightArm"].head), tuple(round(v, 4) for v in _w @ ch.pb["LeftArm"].head),
              tuple(round(v, 4) for v in mouth(ch)), tuple(round(v, 4) for v in _w @ ch.pb["Hips"].head), tuple(round(v, 4) for v in TABLE_XY), TOP_Z), flush=True)
        BOW = float(os.environ.get("BOW", "-16"))
        body(0, P_LAP, (0, 0, BOW)); mouth_bite = mouth(ch)
        body(0, P_LAP, (0, 0, -6))
        mouth0 = mouth(ch); plate = Vector((TABLE_XY[0] - 0.007, TABLE_XY[1] - 0.002 + TRAY_DY, TOP_Z + 0.0045))
        pick = plate + Vector((0.0, 0.0035, 0))
        rest_tip = plate + Vector((0.0045, 0.0062, -0.001))       # laid across the near rim of the plate
        # her hand can only reach the plane of her mouth from the side, so the sticks reach the mouth level from her right (reference panel 3)
        D_PICK = Vector((0.35, -0.75, -0.55)); D_MOUTH = Vector((0.9, -0.15, 0.45)); D_REST = Vector((1.0, 0.0, 0.0))
        P_PICK = Vector((0.3, 0.0, -1.0)); P_MOUTH = Vector((0.0, -0.35, -1.0))
        LIFT = [(0.0, pick + Vector((0, 0, 0.0035))), (0.55, pick + Vector((0, 0, 0.0035))), (1.0, pick), (1.35, pick),
                (1.55, pick + Vector((0, -0.002, 0.004))), (1.8, mouth_bite + Vector((-0.0065, -0.0015, -0.0035))), (2.05, mouth_bite + Vector((0, -0.0012, 0))), (2.35, mouth_bite + Vector((0, -0.0012, 0))),
                (2.75, mouth_bite + Vector((-0.004, -0.008, -0.006))), (3.15, rest_tip + Vector((0, 0, 0.004))), (3.35, rest_tip), (9.0, rest_tip)]
        DIRS = [(0.0, D_PICK), (1.55, D_PICK), (1.8, D_MOUTH), (2.0, D_MOUTH), (2.4, D_MOUTH), (3.0, D_REST), (9.0, D_REST)]
        PALMS = [(0.0, P_PICK), (1.55, P_PICK), (1.8, P_MOUTH), (2.0, P_MOUTH), (2.4, P_MOUTH), (3.0, P_PICK), (9.0, P_PICK)]
        OPEN = [(0.0, 9.0), (0.95, 9.0), (1.3, 0.0), (3.35, 0.0), (3.5, 6.0), (9.0, 6.0)]        # degrees between the sticks
        RELEASE, BITE = 3.45, 2.2
        cup_home = CUP0 + Vector((0, 0, -0.0002))
        CUPK = [(0.0, cup_home), (3.0, cup_home), (3.45, cup_home), (3.95, mouth0 + Vector((0.0008, -0.0035, -0.0095))),
                (5.15, mouth0 + Vector((0.0008, -0.0035, -0.0095))), (5.75, cup_home), (9.0, cup_home)]
        REACH0, GRAB, LET_GO = 2.75, 3.3, 5.85
        stick_rest = {}

        def frame_pose(t, fr):
            # arms: right hand from IK on the chopstick tip, left hand from IK on the cup (or resting)
            d = lerp_keys(DIRS, t).normalized(); pm = lerp_keys(PALMS, t).normalized()
            Ra = to_world(ch, "Right", dir_l, point=False)
            # where the wrist must be so that the stick tips reach the target: rotate the hand first on a scratch pose
            body(t, P_LAP, (0, 0, -6))
            orient_hand(ch, "Right", dir_l, d, palm_l, pm)
            tipw = lerp_keys(LIFT, t)
            web_w = to_world(ch, "Right", web_l); dir_w = to_world(ch, "Right", dir_l, point=False).normalized()
            wrist_w = mw("RightHand")
            wrist_t = tipw - (web_w - wrist_w) - dir_w * (STICK_L * 2 / 3)
            if t > RELEASE + 0.2:        # chopsticks laid down: her right hand goes back to rest on the near edge of the table
                restR = Vector((mw("RightArm").x + 0.001, TABLE_XY[1] + 0.0165, TOP_Z + 0.0014))
                wrist_t = wrist_t.lerp(restR, E.ease((t - RELEASE - 0.2) / 0.45))
            arms = ik_arm(ch, "Right", wrist_t, Vector((-0.7, 0.4, -1.0)))
            if fr in (0, 12, 24, 48): print("DESK REACH t=%.2f need %.4f arm %.4f" % ((t,) + ik_arm.last), flush=True)
            if t < REACH0 or t > 6.2:
                body(t, P_LAP, (0, 0, -6))
                orient_hand(ch, "Left", fwdL_l, Vector((0.1, -1, 0)), palmL_l, Vector((0, 0, -1)))
                restL = Vector((TABLE_XY[0] + 0.006, TABLE_XY[1] + 0.0165, TOP_Z + 0.0014))
                left = ik_arm(ch, "Left", restL, Vector((0.7, 0.4, -1.0)))
            else:
                body(t, P_LAP, (0, 0, -6))
                orient_hand(ch, "Left", fwdL_l, Vector((0.1, -1, 0.05)), palmL_l, Vector((-1, 0.1, 0)))
                cupc = cup_home + Vector((0.004, 0.0, 0.002)) if (t < GRAB - 0.15 or t > LET_GO + 0.1) else lerp_keys(CUPK, t)
                wl = cupc - (to_world(ch, "Left", cup_off_l) - mw("LeftHand"))
                left = ik_arm(ch, "Left", wl, Vector((0.7, 0.4, -1.0)))
            chew = BITE + 0.2 <= t < BITE + 1.4
            head = (0, 0, BOW) if 1.75 <= t < BITE + 0.15 else (0, 0, (BOW - 6) / 2) if 1.55 <= t < 1.75 else ((0, 0, -2 if int((t - BITE) / 0.17) % 2 else -7) if chew else ((0, 0, -3) if 3.9 <= t < 5.2 else (0, 0, -6)))
            body(t, {**arms, **left}, head)
            orient_hand(ch, "Right", dir_l, d, palm_l, pm)
            curl(ch, "Right", G_CHOP if t < RELEASE else G_RELAX)
            if REACH0 <= t <= 6.2:
                orient_hand(ch, "Left", fwdL_l, Vector((0.1, -1, 0.05)), palmL_l, Vector((-1, 0.1, 0)))
                curl(ch, "Left", G_CUP if GRAB <= t <= LET_GO else G_RELAX)
            else:
                orient_hand(ch, "Left", fwdL_l, Vector((0.1, -1, 0)), palmL_l, Vector((0, 0, -1)))
                curl(ch, "Left", G_RELAX)
            key_hand(ch, "Right", fr); key_hand(ch, "Left", fr)
            # chopsticks: lower from the web through the ring finger, upper opens about the grip point
            if t < RELEASE:
                web_w = to_world(ch, "Right", web_l); dir_w = to_world(ch, "Right", dir_l, point=False).normalized()
                side_w = to_world(ch, "Right", side_l, point=False); side_w = (side_w - side_w.dot(dir_w) * dir_w).normalized()
                lo0 = web_w - dir_w * (STICK_L / 3); lo1 = web_w + dir_w * (STICK_L * 2 / 3)
                op = math.radians(lerp_keys(OPEN, t))
                up_dir = (dir_w * math.cos(op) + side_w * math.sin(op)).normalized()
                g = web_w + side_w * 0.0011
                up0 = g - up_dir * (STICK_L / 3); up1 = g + up_dir * (STICK_L * 2 / 3) - side_w * 0.0008
                stick_rest["v"] = (lo0, lo1, up0, up1)
            lo0, lo1, up0, up1 = stick_rest["v"]
            rod_between(lower, lo0, lo1); rod_between(upper, up0, up1)
            for ob in (lower, upper): key_obj(ob, fr, rot=True); ob.keyframe_insert("scale", frame=fr)
            # the dan bing piece: on the plate, then between the tips, gone once it touches her lips
            mid = (lo1 + up1) / 2
            if t < 1.3: pc = pick + Vector((0, 0, -0.0019))
            elif t < BITE: pc = mid
            else: pc = Vector((0, 0, -1))
            ax = (lo1 - lo0).normalized().cross(Vector((0, 0, 1))).normalized() if t >= 1.3 else Vector((1, 0, 0))
            for ob in (piece, yolk):
                ob.location = pc; ob.rotation_euler = Vector((0, 0, 1)).rotation_difference(ax).to_euler(); key_obj(ob, fr, rot=True)
            if fr in (0, 12, 16, 26, 40, 48, 60, 74):
                print("CONTACT B4 t=%.2f tip_to_target %.4f tip_to_mouth %.4f open %.1f cup_to_mouth %.4f" % (
                    t, (mid - lerp_keys(LIFT, t)).length, (mid - mouth(ch)).length, math.degrees(op) if t < RELEASE else -1,
                    (lerp_keys(CUPK, t) - mouth(ch)).length), flush=True)
            # cup in the left hand while held
            if GRAB <= t <= LET_GO:
                c = to_world(ch, "Left", cup_off_l)
                cup_frame(fr, base=c, to=mouth(ch) + Vector((0, -0.0004, 0)) if 3.8 <= t < 5.2 else None)
            else:
                cup_frame(fr)

        for fr in E.frames():
            frame_pose(fr / E.FPS, fr)
        ch.finish()
        for ob in (lower, upper, piece, yolk): E.constant(ob)
        if cam_sub == "main":           # the check cameras leave her out (she would stand between the camera and the hand)
            stand("traveler_girl", (TABLE_XY[0] - 0.062, TABLE_XY[1] + 0.004), 62, lambda t: (E.P_stand(), (0, -18, -4)), height=GIRL)
        HANDCAM = {   # sharp hand checks (no depth of field): aim, camera offset. Her right hand is on the -x side.
            "hp": (pick + Vector((-0.003, 0.003, 0.006)), Vector((-0.06, -0.12, 0.05))),        # right hand at the plate, front-right
            "hp2": (pick + Vector((-0.003, 0.003, 0.006)), Vector((-0.14, -0.01, 0.03))),       # right hand at the plate, her right side
            "hm": (mouth0 + Vector((-0.006, 0.0, -0.003)), Vector((-0.07, -0.12, 0.02))),        # right hand at the mouth, front-right
            "hm2": (mouth0 + Vector((-0.006, 0.0, -0.003)), Vector((-0.14, 0.0, 0.01))),        # right hand at the mouth, her right side
            "hl": (cup_home + Vector((0.003, 0.0, 0.002)), Vector((0.07, -0.12, 0.03))),         # left hand on the cup on the table, front-left
            "hl2": (cup_home + Vector((0.003, 0.0, 0.002)), Vector((0.14, -0.01, 0.02))),       # same, her left side
            "hs": (mouth0 + Vector((0.0008, -0.003, -0.006)), Vector((0.06, -0.13, 0.012)))}      # sipping, front-left
        if cam_sub in HANDCAM:
            aim, off = HANDCAM[cam_sub]
            cam_move(190, aim + off, aim, aim + off, aim, focus=aim)
            for cd in bpy.data.cameras: cd.dof.use_dof = False
        elif cam_sub == "close":           # hand close-up from her front-right
            aim = Vector((mouth0.x - 0.004, mouth0.y + 0.001, (mouth0.z + TOP_Z) / 2 + 0.002))
            cam_move(115, aim + Vector((-0.085, -0.11, 0.022)), aim, aim + Vector((-0.085, -0.11, 0.022)), aim)
        elif cam_sub == "side":          # from her right side
            aim = Vector((mouth0.x - 0.004, mouth0.y + 0.002, (mouth0.z + TOP_Z) / 2 + 0.003))
            cam_move(115, aim + Vector((-0.14, -0.018, 0.012)), aim, aim + Vector((-0.14, -0.018, 0.012)), aim)
        else:                            # the shot itself: three-quarter view from her front-right, clock in the frame
            aim = Vector((mouth0.x + 0.022, mouth0.y + 0.03, mouth0.z + 0.010))      # still camera: the hands are the action
            cam_move(56, aim + Vector((-0.115, -0.19, -0.006)), aim, aim + Vector((-0.115, -0.19, -0.006)), aim, focus=mouth0)
    for ob in (cup, lid, straw): E.constant(ob)

E.run(A[3:])
