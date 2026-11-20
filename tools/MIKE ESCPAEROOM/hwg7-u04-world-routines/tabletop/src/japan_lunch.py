# World Routines Trip - Japan station "I have lunch at twelve fifteen." (tabletop style H)
# blender -b --factory-startup --python japan_lunch.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: L1 question + "I have lunch at twelve fifteen." (clock) / L2 serving / L3 itadakimasu / L4 eating
# Story: ONE Japanese boy. In L2 he wears the white lunch-duty smock (japan_boy_lunch is the same boy), so the two models never share a shot.
# Uses the shared engine from the Thanksgiving classroom-tabletop project (engine.py, uploaded next to this file).
# ASCII only: colab exec reads files with cp950 on Windows.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with japan_compose.py
DUR = {"L1": 5.6, "L2": 3.8, "L3": 3.0, "L4": 7.6}
VOICE = {"q": 0.4, "a": 2.6, "serve": 0.5, "itadaki": 1.0, "eat": 0.5}
E.init(PROPS, FONTS, DUR[SHOT])
sc = E.sc
FLOOR = 0.012
KID = 0.070                      # pupil height (m); desk and cart are scaled to match a 135 cm child
DESK_H = KID * 0.48              # whole desk+chair model height (chair back is the highest point)
CART_H = KID * 0.66


# ---------- room ----------
def room():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.60, 0.44), E.felt("floor", (0.62, 0.45, 0.27)), "classFloor", thick=FLOOR)
    for i in range(1, 12):       # floor plank lines
        E.box((-0.30 + i * 0.05, 0.03, FLOOR + 0.0002), (0.0012, 0.44, 0.0004), E.mat("plankLine", (0.4, 0.27, 0.15), 0.9), "plank", bevel=0)
    E.box((0, 0.246, FLOOR + 0.12), (0.60, 0.012, 0.24), E.felt("classWall", (0.93, 0.88, 0.74)), "classWall")
    E.box((0, 0.2395, FLOOR + 0.03), (0.60, 0.002, 0.06), E.felt("wainscot", (0.55, 0.72, 0.62)), "wainscot", bevel=0)
    E.box((-0.07, 0.238, FLOOR + 0.135), (0.30, 0.006, 0.115), E.wood(), "bbFrame")
    E.box((-0.07, 0.2345, FLOOR + 0.135), (0.285, 0.002, 0.10), E.felt("blackboard", (0.07, 0.22, 0.16)), "blackboard", bevel=0)
    E.box((-0.07, 0.232, FLOOR + 0.082), (0.285, 0.008, 0.004), E.wood(), "chalkTray", bevel=0.001)
    for k, x in enumerate((-0.15, -0.135, -0.02)):
        E.box((x, 0.231, FLOOR + 0.0855), (0.010, 0.003, 0.003), E.mat("chalk%d" % k, [(0.97, 0.97, 0.95), (1, 0.75, 0.8), (1, 0.93, 0.6)][k], 0.9), "chalk", bevel=0.0008)
    # wall clock showing 12:15
    cx, cz, cy = 0.16, FLOOR + 0.165, 0.238
    E.cyl((cx, cy, cz), 0.030, 0.006, E.mat("clockRim", (0.75, 0.16, 0.14), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0025, cz), 0.026, 0.004, E.mat("clockFace", (0.98, 0.97, 0.93), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.08, 0.08, 0.12), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.022 * math.sin(a), cy - 0.005, cz + 0.022 * math.cos(a)), 0.0018 if big else 0.001, ink, "tick")
    ah = math.radians(7.5)       # hour hand just past 12
    E.box((cx + 0.006 * math.sin(ah), cy - 0.0052, cz + 0.006 * math.cos(ah)), (0.0028, 0.001, 0.013), ink, "hourHand", bevel=0, rot=(0, ah, 0))
    E.box((cx + 0.0095, cy - 0.0058, cz), (0.019, 0.001, 0.0018), ink, "minuteHand", bevel=0)      # pointing at 3
    E.ball((cx, cy - 0.006, cz), 0.002, E.mat("clockPin", (0.75, 0.16, 0.14), 0.4), "clockPin")
    # window with cherry blossom colour behind it
    wx = 0.245
    E.box((wx, 0.2385, FLOOR + 0.125), (0.085, 0.004, 0.105), E.emission("sky", (0.62, 0.82, 1.0), 1.6), "windowSky", bevel=0)
    for k, (dx, dz, r) in enumerate(((-0.02, 0.02, 0.016), (0.012, 0.03, 0.02), (0.02, -0.005, 0.014), (-0.008, -0.02, 0.013))):
        E.ball((wx + dx, 0.2375, FLOOR + 0.125 + dz), r * 0.6, E.felt("sakura%d" % (k % 2), [(1.0, 0.72, 0.8), (1.0, 0.82, 0.88)][k % 2]), "sakura").scale = (1, 0.15, 1)
    for (x, z, sx, sz) in ((wx, FLOOR + 0.179, 0.095, 0.006), (wx, FLOOR + 0.071, 0.095, 0.006), (wx - 0.045, FLOOR + 0.125, 0.006, 0.112),
                           (wx + 0.045, FLOOR + 0.125, 0.006, 0.112), (wx, FLOOR + 0.125, 0.004, 0.105), (wx, FLOOR + 0.125, 0.09, 0.004)):
        E.box((x, 0.2355, z), (sx, 0.005, sz), E.wood(), "windowFrame", bevel=0.001)


def probe_desk():
    """Import one desk far away, find desk-top height and chair-seat centre by casting rays down. Returns values relative to the model root."""
    root = E.place(f"{PROPS}/school_desk.glb", DESK_H, (5, 5, 0))
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    x0, x1, y0, y1, top = E._bbox(root)
    hits = []
    for i in range(61):
        y = y0 + (y1 - y0) * i / 60; zs = []
        for x in (5 - 0.004, 5, 5 + 0.004):
            ok, loc, n, idx, ob, mx = sc.ray_cast(dg, Vector((x, y, 1.0)), Vector((0, 0, -1)), distance=2.0)
            if ok: zs.append(loc.z)
        hits.append((y - 5, max(zs) if zs else 0.0))
    seat = [(y, z) for y, z in hits if 0.38 * top < z < 0.66 * top]
    desk = [(y, z) for y, z in hits if 0.70 * top < z < 0.93 * top]
    info = dict(seat_y=sum(y for y, z in seat) / len(seat), seat_z=sum(z for y, z in seat) / len(seat),
                desk_y=sum(y for y, z in desk) / len(desk), desk_z=max(z for y, z in desk), top=top, depth=y1 - y0, width=x1 - x0)
    print("DESK", {k: round(v, 4) for k, v in info.items()}, flush=True)
    for o in [root] + list(root.children_recursive): bpy.data.objects.remove(o, do_unlink=True)
    return info


DI = None
def desk(x, y):
    """Place a desk so the pupil sits at +y and faces the camera (-y). Returns (seat_xy, seat_z, desk_xy, desk_top_z) in world coordinates."""
    flip = DI["seat_y"] < DI["desk_y"]           # chair is on the -y side of the model -> turn it round
    r = E.place(f"{PROPS}/school_desk.glb", DESK_H, (x, y, FLOOR), rot_z=math.pi if flip else 0.0)
    E.obstacle(r); s = -1 if flip else 1
    return (x, y + s * DI["seat_y"]), FLOOR + DI["seat_z"], (x, y + s * DI["desk_y"]), FLOOR + DI["desk_z"]


def tray_on(desk_xy, desk_z):
    return E.place(f"{PROPS}/lunch_tray.glb", 0.0235, (desk_xy[0], desk_xy[1] - 0.001, desk_z + 0.0003), axis="long")


def hand(ch, side):
    bpy.context.view_layer.update()
    return ch.arm.matrix_world @ ch.pb[side + "HandMiddle1"].head


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


LEGS = {"RightUpLeg": (-0.12, -1, -0.12), "LeftUpLeg": (0.12, -1, -0.12), "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)}


def seat(name, seat_xy, seat_z, height=KID):
    """Put a pupil on a chair, facing -y (hips on the seat). Pose the legs with LEGS: thighs forward, lower legs hanging down."""
    ch = E.Char(name, (seat_xy[0], seat_xy[1]), 0, height=height)
    ch.at(0, loc=(seat_xy[0], seat_xy[1] + 0.003, seat_z + 0.0075 - hips_height(ch)))
    return ch


def stand(name, loc, face, fn, after=None, height=KID):
    return animate(E.Char(name, loc, face, height=height), fn, after)


def local_dir(ch_loc, face_deg, target, from_z):
    """Direction from a character's shoulder height to a world point, in the character's own axes (for pointing)."""
    v = Vector(target) - Vector((ch_loc[0], ch_loc[1], from_z)); a = -math.radians(face_deg)
    return (v.x * math.cos(a) - v.y * math.sin(a), v.x * math.sin(a) + v.y * math.cos(a), v.z)


P_CARRY = {"RightArm": (-0.28, -0.45, -0.85), "RightForeArm": (-0.08, -1, 0.05), "LeftArm": (0.28, -0.45, -0.85), "LeftForeArm": (0.08, -1, 0.05)}
P_LAP = {"RightArm": (-0.3, -0.35, -0.9), "RightForeArm": (0.15, -0.9, -0.35), "LeftArm": (0.3, -0.35, -0.9), "LeftForeArm": (-0.15, -0.9, -0.35)}
P_PRAY = {"RightArm": (-0.34, -0.6, -0.72), "RightForeArm": (0.66, -0.45, 0.5), "LeftArm": (0.34, -0.6, -0.72), "LeftForeArm": (-0.66, -0.45, 0.5)}
# eating: right hand goes between the bowl and the chin (never in front of the face); left hand rests beside the bowl
P_EAT = [{"RightArm": (-0.36, -0.55, -0.76), "RightForeArm": (0.42, -0.5, u), "LeftArm": (0.32, -0.6, -0.74), "LeftForeArm": (-0.2, -1, 0.12)} for u in (0.2, 0.36)]
# serving with the left hand (the pot and the classmate are on his left): down into the pot, then out towards the tray
P_SERVE = [{"LeftArm": (0.3, -0.75, -0.55), "LeftForeArm": (-0.05, -0.8, -0.6), "RightArm": (-0.3, 0.05, -1), "RightForeArm": (-0.2, -0.1, -1)},
           {"LeftArm": (0.7, -0.5, -0.5), "LeftForeArm": (0.85, -0.45, -0.15), "RightArm": (-0.3, 0.05, -1), "RightForeArm": (-0.2, -0.1, -1)}]
# Head twist is (roll, yaw, pitch) in degrees: pitch < 0 looks down; yaw turns the head sideways.
YAW = float(os.environ.get("YAW", "30"))   # head turn towards the camera for side-on characters
GIRL = KID * 1.06               # her sun hat adds a little height
T = DUR[SHOT]


def cam_move(lens, c0, a0, c1, a1, focus=None):
    c, a, fo = E.camera("cam", lens, 8)

    def path(t):
        u = E.ease(t / T)
        return E.vlerp(c0, c1, u), E.vlerp(a0, a1, u), (Vector(focus) if focus else E.vlerp(a0, a1, u))
    E.key_cam(c, a, fo, path)


room()
L, Fl, R = E.lights()
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); top = bpy.context.object      # soft daylight over the classroom
top.data.energy = 4.5; top.data.color = (1, 0.96, 0.9); top.data.size = 0.5; top.rotation_euler = (math.radians(25), 0, 0)
DI = probe_desk()
ROWS = {}
for row, y in enumerate((0.0, 0.105)):
    for col, x in enumerate((-0.045, 0.045, 0.135)):
        ROWS[(row, col)] = desk(x, y)
BOY_D, GIRL_D = ROWS[(0, 0)], ROWS[(0, 1)]
for key in ((0, 2), (1, 0), (1, 1), (1, 2)):
    if SHOT in ("L3", "L4"): tray_on(ROWS[key][2], ROWS[key][3])

if SHOT == "L1":
    # the visitor asks; the boy points at the classroom clock: twelve fifteen
    cart = E.place(f"{PROPS}/lunch_cart.glb", CART_H, (-0.20, -0.02, FLOOR), rot_z=math.radians(90)); E.obstacle(cart)
    CLOCK = (0.16, 0.238, FLOOR + 0.165); BOY, BF = (-0.005, -0.115), 18; GL, GF = (0.085, -0.11), -22
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.7, VOICE["a"], VOICE["a"] + 2.1
    point = local_dir(BOY, BF, CLOCK, FLOOR + KID * 0.6)

    def boy(t):
        if t >= ans0 - 0.15:                                      # points at the clock with his left arm (the clock is on his left)
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            d = (point[0], point[1], point[2] + 0.06 * k)
            return E.P_point(d, right=False), (0, 14 if t < ans1 else 0, 4)
        return E.P_stand(), (0, 14, 0)                            # listening: head turned to the visitor

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, -14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 10, 10)      # looks up at the clock
        return E.P_stand(), (0, -14, 0)
    stand("japan_boy", BOY, BF, boy)
    stand("traveler_girl", GL, GF, girl, height=GIRL)
    cam_move(42, (0.02, -0.56, 0.165), (0.045, -0.03, 0.078), (0.04, -0.47, 0.152), (0.05, -0.03, 0.08), focus=(0.04, -0.11, 0.06))

elif SHOT == "L2":
    # lunch duty: the boy (now in his white smock) serves his classmate from behind the cart
    cart = E.place(f"{PROPS}/lunch_cart.glb", CART_H, (-0.105, -0.105, FLOOR)); E.obstacle(cart)
    bpy.context.view_layer.update(); x0, x1, y0, y1, z1 = E._bbox(cart)

    def helper(t):
        k = int(max(0.0, t - 0.2) / 0.5) % 2                      # scoop ... serve ... scoop ...
        return P_SERVE[k], ((0, 16, -6) if k else (0, 0, -16))
    stand("japan_boy_lunch", ((x0 + x1) / 2 + 0.004, y1 + 0.013), 0, helper)
    girl = E.Char("traveler_girl", (x1 + 0.036, -0.105), -90, height=GIRL)
    tray = E.place(f"{PROPS}/lunch_tray.glb", 0.0235, (0, 0, 0), rot_z=math.radians(90), axis="long")

    def hold(t, fr):                                              # the tray rides on her hands (1.2 mm above the palms)
        hr, hl = hand(girl, "Right"), hand(girl, "Left"); mid = (hr + hl) / 2
        tray.location = (mid.x - 0.005, mid.y, max(hr.z, hl.z) + 0.0012); tray.keyframe_insert("location", frame=fr)
    animate(girl, lambda t: (P_CARRY, ((0, -6, -4) if 0.6 <= t <= 2.9 else (0, YAW, 0))), hold)
    E.constant(tray)
    cam_move(55, (-0.02, -0.34, 0.11), (-0.085, -0.095, 0.058), (-0.03, -0.31, 0.105), (-0.085, -0.095, 0.058))

elif SHOT in ("L3", "L4"):
    for d in (BOY_D, GIRL_D): tray_on(d[2], d[3])
    cart = E.place(f"{PROPS}/lunch_cart.glb", CART_H, (-0.20, 0.04, FLOOR), rot_z=math.radians(90)); E.obstacle(cart)
    if SHOT == "L3":
        say = VOICE["itadaki"]

        def pray(t):                                              # hands together, then a small bow on "itadakimasu"
            if t < say - 0.35: return {**LEGS, **P_LAP}, (0, 0, 0)
            return {**LEGS, **P_PRAY}, (0, 0, -18 if say + 0.25 <= t < say + 1.2 else -4)
        animate(seat("japan_boy", BOY_D[0], BOY_D[1]), pray)
        animate(seat("traveler_girl", GIRL_D[0], GIRL_D[1], height=GIRL), lambda t: pray(t - 0.09))
        cam_move(52, (0.0, -0.275, 0.115), (0.0, 0.0, 0.06), (0.0, -0.25, 0.11), (0.0, 0.0, 0.06))
    else:
        stick_m = E.mat("chopstick", (0.45, 0.25, 0.12), 0.5)

        def eater(who, d, phase, h):
            sticks = [E.cyl((0, 0, 0), 0.00035, 0.011, stick_m, verts=8, name="chopstick") for _ in range(2)]
            bowl = Vector((d[2][0] - 0.004, d[2][1], d[3] + 0.006))
            ch = seat(who, d[0], d[1], height=h)

            def up(t): return int(max(0.0, t - 0.3 + phase) / 0.67) % 2      # 0 = at the bowl, 1 = up at the chin

            def follow(t, fr):                                                # chopsticks stay in the right hand, tips to the bowl or the mouth
                H = hand(ch, "Right")
                tip = (ch.arm.matrix_world @ ch.pb["Head"].head + Vector((0, -0.011, -0.007))) if up(t) else bowl
                v = (tip - H).normalized()
                for st, off in zip(sticks, (-0.0007, 0.0007)):
                    st.location = H + v * 0.004 + Vector((off, 0, 0)); st.rotation_euler = Vector((0, 0, 1)).rotation_difference(v).to_euler()
                    st.keyframe_insert("location", frame=fr); st.keyframe_insert("rotation_euler", frame=fr)
            animate(ch, lambda t: ({**LEGS, **P_EAT[up(t)]}, (0, 0, -2 if up(t) else -10)), follow)
            for st in sticks: E.constant(st)
        eater("japan_boy", BOY_D, 0.0, KID)
        eater("traveler_girl", GIRL_D, 0.34, GIRL)
        cam_move(70, (0.0, -0.285, 0.09), (0.0, 0.0, 0.058), (0.0, -0.25, 0.086), (0.0, 0.0, 0.057))

E.run(A[3:])
