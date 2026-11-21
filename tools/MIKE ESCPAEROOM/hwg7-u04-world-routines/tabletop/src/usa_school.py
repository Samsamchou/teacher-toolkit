# World Routines Trip - USA station "I go to school at seven thirty-five." (tabletop style H)
# blender -b --factory-startup --python usa_school.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: US1 wide at the bus stop: the traveller asks; the USA girl points at the 7:35 clock on the bus-stop pole (clock-side hand)
#         US2 her front porch: she takes her lunchbox by its handle from the little porch table (hand touches the handle first)
#         US3 the yellow school bus drives in from the LEFT and stops; she carries the lunchbox and waves: "Good morning! Here comes the bus!"
#         US4 (cut, rule 1.8/1.10: no back-to-camera boarding) she stands on the bus's lower step, left hand on the door grab rail,
#             says the answer again, lets go and waves: "I go to school by school bus. The bus is yellow."
#   Check cameras (same action, another camera; the first three letters pick the action), all sharp (DOF off, 190 mm):
#         US1HF US1HS (pointing hand) / US2HF US2HS (lunchbox handle, hook grip) / US3HF US3HS (carrying) /
#         US4HF US4HS (door grab rail) / US4L US4L2 (feet on the bus step: side at step height, low front; 115 mm)
# Teacher 11/20: the USA pupil is a GIRL (usa_girl.glb, 65 bones); the storyboard draft said boy.
# Models: usa_girl (rigged), traveler_girl. Everything else is made here (no Tripo points): the street, the porch house, the bus stop
#   pole with the 7:35 clock, the school bus (wheels, folding doors, two steps, grab rails), the lunchbox, fences, trees, hydrant, mailbox.
# Bus direction (rule 1.10): Americans drive on the right, so the lane next to the near kerb runs from the screen LEFT to the RIGHT and the
#   bus door (right side of the bus) faces the pavement and the camera. The bus nose points +x, the way it drives.
# Hand helpers: from hands import * (tabletop/src/hands.py). PALM_SIGN right -1, left +1 lives there.
# Props held in a hand are rigid to the hand bone: prop = hand_matrix @ C, C measured once with the grip curled ("calibration").
#   Wanted prop pose -> wanted hand pose (hand = prop @ C^-1) -> two-bone arm IK + hand turn + finger curls; the prop is then drawn
#   from the hand that was actually reached, so a short arm shows up in the CONTACT lines, never as a floating prop.
# GRIP TABLE (rule 1.1, write before posing):
#   lunchbox handle, RIGHT hand, hook grip: palm faces her midline (+x of her body), fingers point down and a little forward, the four
#     fingers bend round UNDER the handle bar (bar lies across the middle finger segments), thumb points forward and rests along the bar;
#     the box hangs upright under the hand. Like carrying a bag at your side.
#   door grab rail, LEFT hand, "handshake" power grip of a vertical bar in front of her left shoulder: palm faces her midline and a
#     little forward, thumb UP over the top of the fist, the four fingers wrap round the far side of the bar.
#   pointing (US1): index straight, the other fingers curled, thumb tucked; arm outside the shoulder, never across the face.
#   waving (US3, US4): raise the upper arm out to the side, then small forearm swings, then lower it again (rule 1.15).
# Measurement lines (kept by colab_run.py): DESK (body, porch, table, bus, door, reach), CONTACT (grip, box lift / clearance, wheels to
#   road, soles to floor / step). Numbers marked GUESS are first guesses: check them in the first light check.
# ASCII only: colab exec reads files with cp950 on Windows. colab_run.py does not pass environment variables: change defaults here.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix, Quaternion
import engine as E
from hands import *            # shared hand helpers (tabletop/src/hands.py)
import hands as H

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with usa_compose.py (SHOTS)
DUR = {"US1": 5.6, "US2": 3.8, "US3": 4.2, "US4": 8.8}
VOICE = {"q": 0.4, "a": 2.45, "gm": 0.3, "a2": 0.4, "bus": 3.6}
VLEN = {"q": 1.74, "a": 2.82, "gm": 3.45, "a2": 2.82, "bus": 4.72}      # spoken length (usa_words.json, last word end)
CAMSUB = SHOT[3:] or "main"      # "" main / HF HS sharp hand cameras / L L2 feet-on-step cameras
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
sc = E.sc
T = DUR[SHOT]


def env(k, d):
    return float(os.environ.get(k, d))


FLOOR = 0.012                    # pavement / lawn top
ROAD_Z = FLOOR - 0.003           # road top: the kerb is 3 mm high
KID = 0.070
GIRL = KID * 1.06                # the traveller (sun hat)
PUPIL = KID * 1.04
# street plan along y (camera at -y): near lawn | pavement | kerb | road | far pavement | far lawn + houses
SW_Y0, SW_Y1, KERB_Y1, ROAD_Y1, FAR_Y1, BACK_Y = -0.060, 0.012, 0.016, 0.170, 0.190, 0.250
BUS_SIDE_Y = KERB_Y1 + 0.004     # the bus's door side stops 4 mm from the kerb
PX = 0.020                       # where she stands in front of / on the bus door (US3, US4)
POLE = (PX + 0.078, 0.003)       # bus-stop pole on the pavement, near the kerb
CLOCK_R = 0.016
CLOCK_Z = FLOOR + 0.094
HX, HF = -0.200, -0.120          # her house (near side, front faces the street +y): centre x, front wall y
PORCH_D, PORCH_H = 0.042, 0.007
LEAN_REACH = (0, 0, env("LEAN_REACH", "-14"))    # bend forward to reach down to the lunchbox (Spine1 twist; 11/21 -9 left only 0.8 mm lift)
HEAD0 = (0, 0, -2)
# lunchbox (made here): long side along her forward axis, handle bar on top along the same axis
LB_L, LB_W, LB_H = 0.0100, 0.0042, 0.0062
HANDLE_UP = 0.0018
HANDLE_PT = Vector((0, 0, LB_H + HANDLE_UP))        # bar centre (box local, origin = bottom centre)
CARRY_DIR = (-0.36, -0.20, -1.0)                     # carrying arm: down, out (her right = local -x) and a little forward
#   11/21 check 1: (-0.22, -0.18) at 0.93 put the box against her thigh (box_clear_of_body 0.0000) -> more out, elbow a bit bent
CARRY_K = env("CARRY_K", "0.80")                     # wrist distance from the shoulder / (upper arm + forearm); bent elbow = room to lift
HOME_OFF = (-0.0005, -0.0015, 0.0)                   # porch-table box: this much further out / forward than the carry pose (her axes);
                                                     # its height is solved from her reach (US2), so the lift is as big as her arm allows
LIFT_MIN = 0.002                                     # the lift must be visible (coordinator 11/21)
REACH_K = 0.94                                       # grab wrist within this part of the arm length (11/21: need 0.0241 > arm 0.0173)
BAR_R, RAIL_R = 0.00035, 0.0007                      # lunchbox handle bar and door grab rail radius


# ---------- generic helpers (from uk_homework.py / taiwan_breakfast.py) ----------
def hand_box(cx, cy, cz, ang, length, width, mat, name):
    """A clock hand from the centre, pointing ang (radians, clockwise from 12), on a face looking at -y."""
    E.box((cx + length / 2 * math.sin(ang), cy, cz + length / 2 * math.cos(ang)), (width, 0.0008, length), mat, name, bevel=0, rot=(0, ang, 0))


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


def vslerp(d0, d1, u):
    """Turn direction d0 towards d1 (no zero-length midpoints when they point nearly opposite)."""
    d0 = Vector(d0).normalized(); d1 = Vector(d1).normalized()
    q = Quaternion((1, 0, 0, 0)).slerp(d0.rotation_difference(d1), max(0.0, min(1.0, u)))
    return tuple(q @ d0)


def hk(keys, t):
    return tuple(lerp_keys([(a, Vector(b)) for a, b in keys], t))


def ground_rect(x0, x1, y0, y1, z):
    """Register a surface people stand on (engine GND check and Char placement use it)."""
    E.GROUNDS.append((x0, x1, y0, y1, z))


def sole_z(ch):
    """Lowest point of her posed mesh (the soles when she stands)."""
    dg = bpy.context.evaluated_depsgraph_get(); lo = None
    for o in ch.meshes:
        oe = o.evaluated_get(dg); me = oe.to_mesh(); Mw = oe.matrix_world
        for v in me.vertices:
            z = (Mw @ v.co).z
            if lo is None or z < lo: lo = z
        oe.to_mesh_clear()
    return lo


# ---------- the street ----------
def lin(c):
    """sRGB 0..1 -> linear (Blender material colours are linear; shared rule 4.2)."""
    return tuple(v ** 2.2 for v in c)


def street():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    grass = E.felt("grass", lin((0.45, 0.66, 0.30))); conc = E.felt("concrete", lin((0.80, 0.78, 0.74)))
    kerb = E.felt("kerb", lin((0.88, 0.87, 0.84))); asph = E.felt("asphalt", lin((0.30, 0.30, 0.33)))
    E.board((0, (-0.19 + SW_Y0) / 2), (0.64, SW_Y0 + 0.19), grass, "lawnNear", thick=FLOOR)
    E.board((0, (SW_Y0 + SW_Y1) / 2), (0.64, SW_Y1 - SW_Y0), conc, "pavement", thick=FLOOR)
    E.box((0, (SW_Y1 + KERB_Y1) / 2, FLOOR / 2), (0.64, KERB_Y1 - SW_Y1, FLOOR), kerb, "kerb", bevel=0.0008)   # thin: a board bevel (3 mm) would eat it
    ground_rect(-0.32, 0.32, SW_Y1, KERB_Y1, FLOOR)
    E.board((0, (KERB_Y1 + ROAD_Y1) / 2), (0.64, ROAD_Y1 - KERB_Y1), asph, "road", thick=ROAD_Z)
    E.board((0, (ROAD_Y1 + FAR_Y1) / 2), (0.64, FAR_Y1 - ROAD_Y1), conc, "farPavement", thick=FLOOR)
    E.board((0, (FAR_Y1 + BACK_Y) / 2), (0.64, BACK_Y - FAR_Y1), grass, "lawnFar", thick=FLOOR)
    joint = E.mat("slabJoint", lin((0.55, 0.54, 0.52)), 0.9)
    for i in range(1, 21):
        E.box((-0.32 + i * 0.03, (SW_Y0 + SW_Y1) / 2, FLOOR + 0.0001), (0.0006, SW_Y1 - SW_Y0 - 0.004, 0.0003), joint, "slabJoint", bevel=0)
    ym = (KERB_Y1 + ROAD_Y1) / 2
    yellow = E.mat("roadYellow", lin((0.95, 0.78, 0.15)), 0.6); white = E.mat("roadWhite", lin((0.95, 0.95, 0.93)), 0.6)
    for i in range(11):
        E.box((-0.30 + i * 0.06, ym - 0.0012, ROAD_Z + 0.0001), (0.030, 0.0012, 0.0003), yellow, "centreLine", bevel=0)
        E.box((-0.30 + i * 0.06, ym + 0.0012, ROAD_Z + 0.0001), (0.030, 0.0012, 0.0003), yellow, "centreLine", bevel=0)
    for y in (KERB_Y1 + 0.003, ROAD_Y1 - 0.003):
        E.box((0, y, ROAD_Z + 0.0001), (0.64, 0.0010, 0.0003), white, "edgeLine", bevel=0)
    E.box((0, 0.27, 0.22), (1.2, 0.004, 0.5), E.emission("usaSky", (0.58, 0.76, 0.97), 1.2), "sky", bevel=0)


def fence(x0, x1, y, h=0.014):
    """White picket fence along x (pickets with pointed tops, two rails)."""
    white = E.mat("paintWhite", lin((0.96, 0.96, 0.94)), 0.5)
    n = int((x1 - x0) / 0.0045)
    for i in range(n + 1):
        x = x0 + i * (x1 - x0) / max(1, n)
        E.box((x, y, FLOOR + h / 2), (0.0024, 0.0012, h), white, "picket", bevel=0)
        E.box((x, y, FLOOR + h), (0.0017, 0.0012, 0.0017), white, "picketTop", bevel=0, rot=(0, math.radians(45), 0))
    for z in (FLOOR + h * 0.3, FLOOR + h * 0.75):
        E.box(((x0 + x1) / 2, y + 0.0012, z), (x1 - x0, 0.0010, 0.0018), white, "fenceRail", bevel=0)


def maple(x, y, h, k=0):
    trunk = E.felt("bark", lin((0.42, 0.30, 0.20)))
    leaves = [E.felt("mapleRed", lin((0.82, 0.25, 0.10))), E.felt("mapleOrange", lin((0.92, 0.50, 0.12))), E.felt("mapleGold", lin((0.90, 0.68, 0.20)))]
    E.cyl((x, y, FLOOR + h * 0.3), 0.004, h * 0.6, trunk, verts=12, name="trunk")
    for j, (dx, dy, dz, r) in enumerate(((0, 0, 0.62, 0.30), (-0.22, 0.05, 0.52, 0.22), (0.22, -0.03, 0.55, 0.22),
                                          (0.05, 0.10, 0.80, 0.22), (-0.10, -0.10, 0.75, 0.2), (0.14, 0.08, 0.40, 0.17))):
        E.ball((x + dx * h, y + dy * h, FLOOR + dz * h), r * h, leaves[(j + k) % 3], "mapleLeaves")


def gable(x, w, front_y, depth, top, rise, m, facing=-1, name="roof"):
    """Side-gabled roof: the slope that faces the camera (facing -1: towards -y, +1: towards +y), plus the back slope."""
    yc = front_y - facing * depth / 2
    run = depth / 2 + 0.004
    L = math.hypot(run, rise); a = math.atan2(rise, run)
    for s in (1, -1):              # s = 1 front slope, -1 back slope
        yy = yc + facing * s * run / 2
        E.box((x, yy, top + rise / 2), (w + 0.006, L, 0.0025), m, name, bevel=0, rot=(-facing * s * a, 0, 0))


def far_house(x, w, h, wall, door, k):
    """A wooden house across the road (front faces the camera, -y): porch, door, windows, side-gabled roof, picket fence."""
    y0, d = 0.205, 0.036
    white = E.mat("paintWhite", lin((0.96, 0.96, 0.94)), 0.5); glass = E.mat("houseGlass", (0.06, 0.09, 0.14), 0.12)
    E.box((x, y0 + d / 2, FLOOR + h / 2), (w, d, h), E.felt("siding%d" % k, lin(wall)), "farHouse", bevel=0.0006)
    for z in range(1, int(h / 0.004)):
        E.box((x, y0 - 0.0002, FLOOR + z * 0.004), (w, 0.0004, 0.0004), E.mat("sidingLine%d" % k, lin(tuple(c * 0.82 for c in wall)), 0.8), "sidingLine", bevel=0)
    E.box((x - w * 0.18, y0 - 0.0008, FLOOR + 0.018), (0.013, 0.0012, 0.030), E.mat("door%d" % k, lin(door), 0.35), "farDoor", bevel=0)
    for (wx, wz) in ((x + w * 0.22, FLOOR + 0.022), (x - w * 0.22, FLOOR + 0.058), (x + w * 0.22, FLOOR + 0.058)):
        E.box((wx, y0 - 0.0008, wz), (0.018, 0.0010, 0.020), white, "farWinFrame", bevel=0)
        E.box((wx, y0 - 0.0014, wz), (0.015, 0.0008, 0.017), glass, "farWin", bevel=0)
        E.box((wx, y0 - 0.0019, wz), (0.0010, 0.0004, 0.017), white, "farWinBar", bevel=0)
    E.box((x - w * 0.18, y0 - 0.010, FLOOR + 0.002), (0.040, 0.020, 0.004), E.wood(), "farPorch", bevel=0.0005)
    for s in (-1, 1):
        E.box((x - w * 0.18 + s * 0.018, y0 - 0.018, FLOOR + 0.022), (0.002, 0.002, 0.040), white, "farPost", bevel=0)
    E.box((x - w * 0.18, y0 - 0.010, FLOOR + 0.043), (0.044, 0.022, 0.002), white, "farPorchRoof", bevel=0)
    gable(x, w, y0, d, FLOOR + h, 0.026, E.felt("shingle%d" % k, lin((0.35, 0.28, 0.25) if k % 2 else (0.30, 0.33, 0.40))), facing=-1)
    fence(x - w / 2, x - w * 0.18 - 0.012, 0.193)
    fence(x - w * 0.18 + 0.012, x + w / 2, 0.193)


def her_house():
    """Her porch house on the near side (front faces the street, +y): blue siding, white trim, red door, porch with posts and roof,
    one step down to the lawn, a little porch table (placed in US2), mailbox at the pavement."""
    w, d, h = 0.120, 0.060, 0.100
    blue = E.felt("blueSiding", lin((0.55, 0.70, 0.84))); white = E.mat("paintWhite", lin((0.96, 0.96, 0.94)), 0.5)
    glass = E.mat("houseGlass", (0.06, 0.09, 0.14), 0.12)
    E.box((HX, HF - d / 2, FLOOR + h / 2), (w, d, h), blue, "herHouse", bevel=0.0006)
    for z in range(1, int(h / 0.004)):
        E.box((HX, HF + 0.0002, FLOOR + z * 0.004), (w, 0.0004, 0.0004), E.mat("blueLine", lin((0.45, 0.58, 0.72)), 0.8), "sidingLine", bevel=0)
    E.box((HX - 0.004, HF + 0.0008, FLOOR + PORCH_H + 0.021), (0.016, 0.0012, 0.040), E.mat("redDoor", lin((0.72, 0.13, 0.12)), 0.35), "herDoor", bevel=0)
    E.box((HX - 0.004, HF + 0.0004, FLOOR + PORCH_H + 0.021), (0.019, 0.0008, 0.043), white, "herDoorFrame", bevel=0)
    E.ball((HX + 0.0015, HF + 0.0018, FLOOR + PORCH_H + 0.020), 0.0008, E.mat("brass", lin((0.85, 0.68, 0.25)), 0.3), "doorKnob")
    for wx in (HX - 0.040, HX + 0.034):
        E.box((wx, HF + 0.0008, FLOOR + PORCH_H + 0.030), (0.022, 0.0010, 0.024), white, "herWinFrame", bevel=0)
        E.box((wx, HF + 0.0014, FLOOR + PORCH_H + 0.030), (0.019, 0.0008, 0.021), glass, "herWin", bevel=0)
        E.box((wx, HF + 0.0019, FLOOR + PORCH_H + 0.030), (0.019, 0.0004, 0.0010), white, "herWinBar", bevel=0)
        for s in (-1, 1):
            E.box((wx + s * 0.0145, HF + 0.0010, FLOOR + PORCH_H + 0.030), (0.006, 0.0010, 0.024), E.mat("shutter", lin((0.20, 0.30, 0.45)), 0.5), "shutter", bevel=0)
    gable(HX, w, HF, d, FLOOR + h, 0.032, E.felt("herShingle", lin((0.32, 0.30, 0.33))), facing=1)
    # porch floor (people stand on it: registered as ground), posts, roof, one step down to the lawn
    pz = FLOOR + PORCH_H
    E.box((HX, HF + PORCH_D / 2, FLOOR + PORCH_H / 2), (w - 0.004, PORCH_D, PORCH_H), E.wood(), "porchFloor", bevel=0.0005)
    ground_rect(HX - (w - 0.004) / 2, HX + (w - 0.004) / 2, HF, HF + PORCH_D, pz)
    step_x = HX - 0.034
    E.box((step_x, HF + PORCH_D + 0.004, FLOOR + PORCH_H / 4), (0.024, 0.008, PORCH_H / 2), E.wood(), "porchStep", bevel=0.0004)
    posts = []
    for s in (-1, 1):
        posts.append(E.box((HX + s * (w / 2 - 0.006), HF + PORCH_D - 0.0025, pz + 0.041), (0.003, 0.003, 0.082), white, "porchPost", bevel=0.0003))
    roof = E.box((HX, HF + PORCH_D / 2 + 0.002, pz + 0.083), (w + 0.002, PORCH_D + 0.006, 0.0025), white, "porchRoof", bevel=0.0003)
    # side railing on the far (-x) end only (keeps the +x end, where she reaches, open for the hand cameras)
    E.box((HX - w / 2 + 0.003, HF + PORCH_D / 2, pz + 0.012), (0.0015, PORCH_D - 0.004, 0.0015), white, "porchRail", bevel=0)
    E.box((HX - w / 2 + 0.003, HF + PORCH_D / 2, pz + 0.006), (0.0010, PORCH_D - 0.004, 0.012), white, "porchRailFill", bevel=0)
    for z, c in ((0, (0.85, 0.30, 0.45)), (1, (0.95, 0.80, 0.25))):      # flower pots
        E.cyl((HX - 0.048 + z * 0.006, HF + 0.006, pz + 0.003), 0.0022, 0.006, E.felt("pot", lin((0.70, 0.38, 0.25))), verts=16, name="pot")
        E.ball((HX - 0.048 + z * 0.006, HF + 0.006, pz + 0.0075), 0.0028, E.felt("flowers%d" % z, lin(c)), "flowers")
    # path to the pavement, mailbox, fence along the near lawn edge
    E.box((step_x, (HF + PORCH_D + 0.008 + SW_Y0) / 2, FLOOR + 0.0002), (0.018, SW_Y0 - (HF + PORCH_D + 0.008), 0.0004), E.felt("path", lin((0.75, 0.72, 0.68))), "path", bevel=0)
    mx, my = HX + 0.050, SW_Y0 + 0.004          # on the pavement edge, clear of the fence
    E.box((mx, my, FLOOR + 0.010), (0.0018, 0.0018, 0.020), E.wood(), "mailPost", bevel=0)
    E.box((mx, my, FLOOR + 0.022), (0.006, 0.011, 0.005), E.mat("mailbox", lin((0.20, 0.22, 0.25)), 0.4), "mailbox", bevel=0.001)
    E.box((mx + 0.0035, my + 0.002, FLOOR + 0.026), (0.0006, 0.0015, 0.005), E.mat("mailFlag", lin((0.85, 0.12, 0.10)), 0.5), "mailFlag", bevel=0)
    fence(-0.31, step_x - 0.012, SW_Y0 - 0.004)
    fence(step_x + 0.012, -0.12, SW_Y0 - 0.004)
    return posts + [roof]


def hydrant(x, y):
    red = E.mat("hydrantRed", lin((0.85, 0.12, 0.10)), 0.35)
    E.cyl((x, y, FLOOR + 0.0075), 0.0030, 0.015, red, verts=20, name="hydrant")
    E.ball((x, y, FLOOR + 0.015), 0.0031, red, "hydrantCap")
    E.cyl((x, y, FLOOR + 0.0012), 0.0040, 0.0024, red, verts=20, name="hydrantBase")
    for s in (-1, 1):
        E.cyl((x + s * 0.0035, y, FLOOR + 0.010), 0.0012, 0.0030, red, rot=(0, math.radians(90), 0), verts=12, name="hydrantNozzle")


def clock(cx, cy, cz, R):
    """Round clock at exactly 7:35, face towards -y: hour hand 7/12 of the way from 7 to 8, minute hand on 7 (ticks only, no numbers)."""
    E.cyl((cx, cy, cz), R * 1.13, 0.004, E.mat("clockRim", lin((0.10, 0.25, 0.55)), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0016, cz), R, 0.003, E.mat("clockFace", lin((0.98, 0.97, 0.93)), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.02, 0.02, 0.03), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.84 * R * math.sin(a), cy - 0.0032, cz + 0.84 * R * math.cos(a)), (0.075 if big else 0.042) * R, ink, "tick")
    hand_box(cx, cy - 0.0034, cz, math.radians((7 + 35 / 60) * 30), 0.50 * R, 0.12 * R, ink, "hourHand")      # 227.5 deg
    hand_box(cx, cy - 0.0040, cz, math.radians(35 * 6), 0.74 * R, 0.075 * R, ink, "minuteHand")             # 210 deg = the 7
    E.ball((cx, cy - 0.0042, cz), 0.08 * R, E.mat("clockPin", lin((0.85, 0.20, 0.15)), 0.4), "clockPin")


def bus_stop():
    """Bus-stop pole on the pavement: blank sign plate on top (no text), the 7:35 clock below it, facing the camera."""
    grey = E.mat("poleGrey", lin((0.55, 0.56, 0.58)), 0.4)
    x, y = POLE
    E.cyl((x, y, FLOOR + 0.0635), 0.0012, 0.127, grey, verts=16, name="stopPole")
    E.box((x, y - 0.0016, FLOOR + 0.118), (0.024, 0.0012, 0.016), E.mat("signYellow", lin((0.98, 0.80, 0.10)), 0.45), "stopSignBorder", bevel=0)
    E.box((x, y - 0.0024, FLOOR + 0.118), (0.021, 0.0008, 0.013), E.mat("signWhite", lin((0.97, 0.97, 0.95)), 0.5), "stopSign", bevel=0)
    E.box((x, y - 0.0012, CLOCK_Z), (0.003, 0.0024, 0.004), grey, "clockBracket", bevel=0)
    clock(x, y - 0.0040, CLOCK_Z, CLOCK_R)
    return (x, y - 0.0060, CLOCK_Z)


def lunchbox():
    """Blue lunchbox with a lid line, a yellow latch and an arched handle on top (bar along the box's long side, local y)."""
    emp = E.empty("lunchbox"); emp.rotation_mode = "XYZ"
    blue = E.mat("lunchBlue", lin((0.20, 0.45, 0.85)), 0.4); dark = E.mat("lunchDark", lin((0.10, 0.22, 0.45)), 0.4)
    latch = E.mat("lunchLatch", lin((0.98, 0.80, 0.15)), 0.4)
    parts = [E.box((0, 0, LB_H * 0.42), (LB_W, LB_L, LB_H * 0.84), blue, "lunchBody", bevel=0.0004),
             E.box((0, 0, LB_H * 0.92), (LB_W * 1.03, LB_L * 1.02, LB_H * 0.16), dark, "lunchLid", bevel=0.0003),
             E.box((LB_W / 2 + 0.0002, 0, LB_H * 0.80), (0.0004, 0.0024, 0.0016), latch, "lunchLatch", bevel=0),
             E.box((-LB_W / 2 - 0.0002, 0, LB_H * 0.80), (0.0004, 0.0024, 0.0016), latch, "lunchLatch2", bevel=0)]
    for s in (-1, 1):
        parts.append(E.cyl((0, s * 0.0029, LB_H + HANDLE_UP / 2), 0.00030, HANDLE_UP + 0.0004, dark, verts=8, name="handlePost"))
    parts.append(E.cyl((0, 0, LB_H + HANDLE_UP), 0.00035, 0.0062, dark, rot=(math.radians(90), 0, 0), verts=10, name="handleBar"))
    for o in parts: o.parent = emp
    return emp


# ---------- the school bus (made here; teacher: no Tripo points for it) ----------
BW, BX0, BX1 = 0.084, -0.155, 0.100        # body width, rear and front wall (bus local x; +x = nose, the way it drives)
ZB, ZR = 0.013, 0.105                       # body bottom and roof above the road
HOOD_X1, HOOD_Z = 0.148, 0.052
WR, TIRE_W = 0.0145, 0.007
AX_F, AX_R = 0.124, -0.098
BUS_CY = BUS_SIDE_Y + BW / 2                # bus centre line (world y)


def make_bus(M_):
    """Toy yellow school bus. Door on its right (-y) side just behind the hood; two steps; folding glass doors; grab rails.
    Door width and step height come from HER body (rule: measured, not guessed). Returns a dict with the parts and numbers."""
    yel = E.mat("busYellow", lin((1.0, 0.74, 0.02)), 0.45); blk = E.mat("busBlack", (0.012, 0.012, 0.012), 0.5)
    glass = E.mat("busGlass", (0.03, 0.05, 0.07), 0.1); chrome = E.mat("busChrome", lin((0.80, 0.80, 0.82)), 0.25)
    tread = E.mat("stepTread", (0.03, 0.03, 0.03), 0.85); seatm = E.felt("busSeat", lin((0.25, 0.42, 0.30)))
    floorm = E.felt("busFloor", lin((0.45, 0.42, 0.38)))
    amber, redl = E.mat("busAmber", lin((1.0, 0.60, 0.05)), 0.3), E.mat("busRed", lin((0.90, 0.10, 0.08)), 0.3)
    root = E.empty("schoolBus")
    G = {"front": [], "rear": []}

    def add(o, group=None):
        o.parent = root
        if group: G[group].append(o)
        return o
    step = max(0.0035, min(0.007, 0.38 * M_["knee_h"]))
    t1 = FLOOR + step - ROAD_Z                       # lower step top (bus local z)
    fl = FLOOR + 2 * step - ROAD_Z                   # cabin floor = upper step top
    rail_lat = M_["sh_half"] + 0.004                 # grab rail: this far to her side of her centre
    dw = 2 * (rail_lat + 0.0045)                     # door width: room for the rail and the waving arm
    dx1 = BX1 - 0.005; dx0 = dx1 - dw
    dtop = t1 + PUPIL * 1.14
    ys = -BW / 2; wt = 0.003
    # -y side wall around the door, the far side, rear, front wall above the hood, roof
    add(E.box(((BX0 + dx0) / 2, ys + wt / 2, (ZB + ZR) / 2), (dx0 - BX0, wt, ZR - ZB), yel, "busSideRear", bevel=0.0006), "rear")
    add(E.box(((dx1 + BX1) / 2, ys + wt / 2, (ZB + ZR) / 2), (BX1 - dx1, wt, ZR - ZB), yel, "busPostFront", bevel=0.0006), "front")
    add(E.box(((dx0 + dx1) / 2, ys + wt / 2, (dtop + ZR) / 2), (dw, wt, ZR - dtop), yel, "busAboveDoor", bevel=0.0006))
    add(E.box(((BX0 + BX1) / 2, -ys - wt / 2, (ZB + ZR) / 2), (BX1 - BX0, wt, ZR - ZB), yel, "busSideFar", bevel=0.0006))
    add(E.box((BX0 + wt / 2, 0, (ZB + ZR) / 2), (wt, BW, ZR - ZB), yel, "busRear", bevel=0.0006))
    add(E.box((BX1 - wt / 2, 0, (ZB + ZR) / 2), (wt, BW, ZR - ZB), yel, "busFrontWall", bevel=0.0006), "front")
    add(E.box(((BX0 + BX1) / 2, 0, ZR + 0.002), (BX1 - BX0 + 0.004, BW + 0.004, 0.004), yel, "busRoof", bevel=0.0015))
    add(E.box(((BX0 + BX1) / 2, 0, (ZB + 0.008) / 2 + 0.002), (BX1 - BX0 - 0.02, BW - 0.012, ZB - 0.006), blk, "busChassis", bevel=0))
    # steps: the lower step hangs below the body line (like a real step well), the upper step is the cabin floor
    add(E.box(((dx0 + dx1) / 2, ys + 0.007, t1 - 0.002), (dw - 0.0008, 0.018, 0.004), tread, "busStep1", bevel=0.0002))
    add(E.box(((dx0 + dx1) / 2, ys + 0.025, (fl + t1 - 0.004) / 2), (dw - 0.0008, 0.018, fl - t1 + 0.004), tread, "busStep2", bevel=0.0002))
    add(E.box(((BX0 + BX1) / 2 - 0.002, 0.008, fl - 0.0015), (BX1 - BX0 - 0.01, BW - 0.016 - 0.006, 0.003), floorm, "busFloor", bevel=0))
    # windows (dark glass on the outside), rub rails, windscreen, blank front sign (rule: no text on models), warning lights
    x = BX0 + 0.010
    while x + 0.022 < dx0 - 0.004:
        add(E.box((x + 0.011, ys - 0.0002, 0.072), (0.022, 0.0008, 0.024), glass, "busWindow", bevel=0), "rear")
        add(E.box((x + 0.011, -ys + 0.0002, 0.072), (0.022, 0.0008, 0.024), glass, "busWindowFar", bevel=0))
        x += 0.027
    for z in (0.032, 0.047):
        add(E.box(((BX0 + dx0) / 2, ys - 0.0003, z), (dx0 - BX0, 0.0008, 0.0016), blk, "rubRail", bevel=0), "rear")
        add(E.box(((dx1 + BX1) / 2, ys - 0.0003, z), (BX1 - dx1, 0.0008, 0.0016), blk, "rubRailFront", bevel=0), "front")
        add(E.box(((BX0 + BX1) / 2, -ys + 0.0003, z), (BX1 - BX0, 0.0008, 0.0016), blk, "rubRailFar", bevel=0))
    add(E.box((BX1 + 0.0002, 0, 0.074), (0.0008, BW - 0.014, 0.030), glass, "windscreen", bevel=0), "front")
    add(E.box((BX1 + 0.0004, 0, ZR - 0.007), (0.0008, 0.050, 0.010), blk, "frontSign", bevel=0), "front")
    for s in (-1, 1):
        add(E.ball((BX1 + 0.0006, s * 0.031, ZR - 0.007), 0.0024, amber if s < 0 else redl, "warnLight"), "front")
        add(E.ball((BX0 - 0.0006, s * 0.031, ZR - 0.007), 0.0024, redl, "warnLightRear"))
    # hood, grille, headlights, bumpers
    add(E.box(((BX1 + HOOD_X1) / 2, 0, (ZB + HOOD_Z) / 2), (HOOD_X1 - BX1, BW - 0.012, HOOD_Z - ZB), yel, "busHood", bevel=0.004), "front")
    add(E.box((HOOD_X1 + 0.0002, 0, (ZB + HOOD_Z) / 2 + 0.002), (0.0012, 0.040, 0.022), blk, "grille", bevel=0), "front")
    for s in (-1, 1):
        add(E.ball((HOOD_X1 + 0.0004, s * 0.028, 0.036), 0.0036, E.mat("headlight", lin((0.98, 0.96, 0.85)), 0.2), "headlight"), "front")
    add(E.box((HOOD_X1 + 0.0025, 0, ZB + 0.002), (0.004, BW, 0.007), blk, "bumperFront", bevel=0.0006), "front")
    add(E.box((BX0 - 0.0025, 0, ZB + 0.002), (0.004, BW, 0.007), blk, "bumperRear", bevel=0.0006))
    # wheels outside the body sides (toy look; no wheel arches cut into the body); a hub empty per wheel turns as it rolls
    hubs = []
    for ax in (AX_F, AX_R):
        for sy in (-1, 1):
            hub = E.empty("busWheel"); hub.rotation_mode = "XYZ"; hub.location = (ax, sy * (BW / 2 + TIRE_W / 2 + 0.0004), WR)
            parts = [E.cyl((0, 0, 0), WR, TIRE_W, blk, rot=(math.radians(90), 0, 0), verts=32, name="tyre"),
                     E.cyl((0, sy * (TIRE_W / 2 + 0.0002), 0), WR * 0.55, 0.0006, chrome, rot=(math.radians(90), 0, 0), verts=24, name="hubCap")]
            for k in range(4):
                a = k * math.pi / 2
                parts.append(E.box((WR * 0.32 * math.cos(a), sy * (TIRE_W / 2 + 0.0006), WR * 0.32 * math.sin(a)), (0.0014, 0.0006, 0.0014), blk, "lug", bevel=0))
            for o in parts: o.parent = hub
            hub.parent = root; hubs.append(hub)
            if ax == AX_F: G["front"].extend([hub] + parts)
    # folding glass doors: two leaves on hinges at the door edges; open = turned into the bus (+y)
    hinges = []
    for (hx, sgn, grp) in ((dx0, 1, "rear"), (dx1, -1, "front")):
        hg = E.empty("doorHinge"); hg.rotation_mode = "XYZ"; hg.location = (hx, ys - 0.0006, t1)
        lw, lh = dw / 2 - 0.0004, dtop - t1
        parts = [E.box((sgn * lw / 2, 0, lh / 2), (lw, 0.0012, lh), yel, "doorLeaf", bevel=0)]
        for zc in (lh * 0.30, lh * 0.72):
            parts.append(E.box((sgn * lw / 2, -0.0007, zc), (lw - 0.003, 0.0004, lh * 0.36), glass, "doorGlass", bevel=0))
        for o in parts: o.parent = hg
        hg.parent = root; hinges.append(hg); G[grp].extend([hg] + parts)
    # grab rails just inside the door edges; she holds the +x (front) one with her left hand
    rz0, rz1 = t1 + 0.004, dtop - 0.006
    rails = []
    for (rx, grp) in ((dx1 - 0.0045, None), (dx0 + 0.0045, "rear")):
        r = add(E.cyl((rx, ys + 0.0015, (rz0 + rz1) / 2), 0.0007, rz1 - rz0, chrome, verts=12, name="grabRail"), grp)
        for zz in (rz0, rz1):
            add(E.box((rx, ys + 0.0008, zz), (0.0012, 0.0016, 0.0012), chrome, "railBracket", bevel=0), grp)
        rails.append(r)
    # inside: rows of green seats behind the door, the driver's seat and wheel by the windscreen on the far side
    x = BX0 + 0.012
    while x < dx0 - 0.016:
        for s in (-1, 1):
            add(E.box((x, s * (BW / 2 - 0.016), fl + 0.008), (0.012, 0.022, 0.003), seatm, "seat", bevel=0.0006), "rear" if s < 0 else None)
            add(E.box((x - 0.006, s * (BW / 2 - 0.016), fl + 0.017), (0.003, 0.022, 0.018), seatm, "seatBack", bevel=0.0006), "rear" if s < 0 else None)
        x += 0.024
    add(E.box((BX1 - 0.016, 0.020, fl + 0.009), (0.012, 0.016, 0.003), seatm, "driverSeat", bevel=0.0006))
    add(E.cyl((BX1 - 0.010, 0.020, fl + 0.026), 0.0055, 0.0012, blk, rot=(0, math.radians(60), 0), verts=24, name="steeringWheel"))
    info = dict(root=root, hubs=hubs, hinges=hinges, G=G, step=step, t1=t1, fl=fl, dw=dw, dx0=dx0, dx1=dx1, dtop=dtop,
                rail_lat=rail_lat, doorc=(dx0 + dx1) / 2, rail_x=dx1 - 0.0045, rail_y=ys + 0.0015, rails=rails)
    print("DESK BUS step %.4f lower_step_top %.4f floor %.4f (above the road) door x %.4f..%.4f width %.4f top %.4f rail_lat %.4f knee %.4f sh_half %.4f nose +x" % (
        step, t1, fl, dx0, dx1, dw, dtop, rail_lat, M_["knee_h"], M_["sh_half"]), flush=True)
    return info


def bus_place(B, x, wheel_ang=0.0, door=0.0, fr=None):
    """Bus centre at world x on its lane; wheels turned by wheel_ang (rolling +x); doors open by door (0..1)."""
    B["root"].location = (x, BUS_CY, ROAD_Z)
    for h in B["hubs"]: h.rotation_euler = (0, wheel_ang, 0)
    a = math.radians(85) * door
    B["hinges"][0].rotation_euler = (0, 0, a); B["hinges"][1].rotation_euler = (0, 0, -a)
    if fr is not None:
        key_obj(B["root"], fr)
        for h in B["hubs"] + B["hinges"]: h.keyframe_insert("rotation_euler", frame=fr)


# ---------- characters ----------
def metrics(ch):
    """Rest-pose body numbers (lengths, heights above her floor, half shoulder width, tummy depth)."""
    bpy.context.view_layer.update()
    Aw = ch.arm.matrix_world
    P = lambda b: Aw @ ch.pb[b].head
    ground = ch.root.matrix_world.translation.z - ch.base_z
    fwd = ch.root.matrix_world.to_3x3().normalized() @ Vector((0, -1, 0)); up = Vector((0, 0, 1)); side = fwd.cross(up).normalized()
    hips = P("Hips"); shR, shL = P("RightArm"), P("LeftArm")
    m = dict(hip_h=hips.z - ground, knee_h=(P("RightLeg").z + P("LeftLeg").z) / 2 - ground,
             ankle_h=(P("RightFoot").z + P("LeftFoot").z) / 2 - ground, sh_h=(shR.z + shL.z) / 2 - ground,
             sh_half=(shR - shL).length / 2, upper=(P("RightForeArm") - P("RightArm")).length,
             fore=(P("RightHand") - P("RightForeArm")).length, hand=(P("RightHandMiddle1") - P("RightHand")).length)
    best = 0.0
    for k in range(6):
        z = hips.z + 0.002 + (m["sh_h"] - m["hip_h"] - 0.002) * k / 5
        for dx in (-0.003, 0.0, 0.003):
            c = Vector((hips.x, hips.y, z)) + side * dx
            p = mesh_hit(ch.meshes, c + fwd * 0.06, -fwd)
            if p is not None: best = max(best, (p - c).dot(fwd))
    m["front"] = best if best > 0.002 else 0.006
    print("DESK BODY %s height %.4f hip_h %.4f knee_h %.4f ankle_h %.4f sh_h %.4f sh_half %.4f upper %.4f fore %.4f hand %.4f front %.4f" % (
        ch.name, ch.h, m["hip_h"], m["knee_h"], m["ankle_h"], m["sh_h"], m["sh_half"], m["upper"], m["fore"], m["hand"], m["front"]), flush=True)
    return m


def animate(ch, fn, after=None):
    for fr in E.frames():
        t = fr / E.FPS; arms, head = fn(t)
        ch.pose(t, arms, twist={"Head": head})
        if after: after(t, fr)
    ch.finish(); return ch


# grips: degrees per finger segment (1, 2, 3), bent towards the palm
G_HOOK = {"Thumb": (14, 18, 10), "Index": (32, 72, 45), "Middle": (34, 74, 48), "Ring": (36, 74, 48), "Pinky": (38, 72, 45)}
G_HOOK_OPEN = {"Thumb": (6, 8, 4), "Index": (12, 22, 12), "Middle": (14, 24, 14), "Ring": (16, 24, 14), "Pinky": (18, 24, 14)}
G_RAIL = {"Thumb": (32, 34, 22), "Index": (46, 70, 50), "Middle": (48, 72, 52), "Ring": (50, 72, 52), "Pinky": (52, 70, 50)}
G_RAIL_OPEN = {"Thumb": (10, 10, 6), "Index": (14, 18, 10), "Middle": (16, 20, 12), "Ring": (18, 20, 12), "Pinky": (20, 20, 12)}
# pointing (teacher 11/21: index AND middle looked extended, a peace sign): middle, ring, little finger fully into the palm; the thumb
# angles are searched at run time so its tip rests on the back of the curled middle finger (point_at_clock)
G_POINT = {"Thumb": (30, 30, 20), "Index": (0, 0, 0), "Middle": (75, 85, 55), "Ring": (78, 85, 55), "Pinky": (80, 85, 55)}
# 11/21 check 2: 85/100/70 measured 276 deg and crumpled the mesh into a dark hole; 75/85/55 (~215 deg) still reads as a fist
G_ZERO = {f: (0, 0, 0) for f in FINGERS}
G_OPEN = {f: (3, 4, 2) for f in FINGERS}
POLE_L = {"Right": Vector((-0.7, 0.4, -1.0)), "Left": Vector((0.7, 0.4, -1.0))}      # elbows out, back and down (her own axes)
HL = {}        # hand-local finger direction and palm direction, per side


def Wd(ch, v):
    """Her own axes (-y forward, -x her right, +z up) -> world direction."""
    return ch.root.matrix_world.to_3x3().normalized() @ Vector(v)


def hand_q(side, fwd_w, palm_w):
    """World rotation of the hand bone that points its fingers along fwd_w with the palm towards palm_w."""
    def basis(a, b):
        a = Vector(a).normalized(); b = Vector(b); b = (b - b.dot(a) * a).normalized(); return Matrix((a, b, a.cross(b))).transposed()
    a_l, b_l = HL[side]
    return (basis(fwd_w, palm_w) @ basis(a_l, b_l).transposed()).to_quaternion()


def set_hand_rot(ch, side, q):
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


def from_prop(Md, C, grip, side):
    Mh = Md @ C.inverted()
    return (Mh.to_3x3().normalized().to_quaternion(), Mh.translation.copy(), grip, POLE_L[side].copy())


def body(ch, t, arm_dirs, head, lean=(0, 0, 0)):
    """Spine lean + head first, then the arms (so arm IK sees the leaning shoulders). Standing: legs stay in the rest pose."""
    ch.pose(t, None, twist={"Spine1": tuple(lean), "Head": tuple(head)})
    for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
        if b in arm_dirs: ch._aim(b, arm_dirs[b])
    for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
        ch.pb[b].keyframe_insert("rotation_quaternion", frame=E.f(t))


def solve(ch, t, fr, head, lean, base, targets, curls):
    """targets: {side: (q, wrist, grip, pole_local)} solved with arm IK; base: FK arm directions for the other arm; curls: {side: grip}."""
    body(ch, t, base, head, lean)
    arms = {}
    for side, g in targets.items():
        arms.update(ik_arm(ch, side, g[1], Wd(ch, g[3])))
        if fr % 12 == 0: print("DESK REACH %s t=%.2f need %.4f arm %.4f" % ((side, t) + ik_arm.last), flush=True)
    body(ch, t, dict(base, **arms), head, lean)
    for side, g in targets.items():
        set_hand_rot(ch, side, g[0]); curl(ch, side, g[2]); key_hand(ch, side, fr)
    for side, grip in curls.items():
        curl(ch, side, grip); key_hand(ch, side, fr)
    return arms


def seg_pad(ch, side, f):
    """Centre of a finger's middle segment and its pad direction (towards the centre of the curl; the palm for a straight finger)."""
    b1, b2 = "%sHand%s1" % (side, f), "%sHand%s2" % (side, f)
    d1 = (wpt(ch, b1, True) - wpt(ch, b1)).normalized(); d2 = (wpt(ch, b2, True) - wpt(ch, b2)).normalized()
    a = d1.cross(d2)
    if a.length < 0.05:
        n = (ch.arm.matrix_world.to_3x3().normalized() @ hand_frame(ch, side)[3]).normalized()
    else:
        n = a.normalized().cross(d2).normalized()
    return (wpt(ch, b2) + wpt(ch, b2, True)) / 2, n


PAD = {}


def finger_pad(ch, side):
    """Skin thickness on the pad side of the middle segments (ray from the bone line out to the skin), measured once per hand."""
    if side not in PAD:
        ds = []
        for f in ("Index", "Middle", "Ring"):
            c, n = seg_pad(ch, side, f); p = mesh_hit(ch.meshes, c, n)
            if p is not None and (p - c).length < 0.002: ds.append((p - c).length)
        PAD[side] = sum(ds) / len(ds) if ds else 0.0004
        print("DESK PAD %s finger skin on the pad side %.4f (%d of 3 rays)" % (side, PAD[side], len(ds)), flush=True)
    return PAD[side]


def grip_point(ch, side, bar_r):
    """Where the centre of a bar of radius bar_r sits when the PADS of the curled index, middle and ring fingers touch it
    (11/21 check 1: the old point was only 0.6 mm off the bone line, so the bar floated / the hand floated above the handle)."""
    pad = finger_pad(ch, side); pts = []
    for f in ("Index", "Middle", "Ring"):
        c, n = seg_pad(ch, side, f); pts.append(c + n * (pad + bar_r))
    return sum(pts, Vector()) / len(pts)


def bar_to_skin(ch, side, bar_c, bar_r):
    """Smallest gap between the bar surface and the index / middle / ring finger skin (rays from the bar centre). ~0 = touching."""
    gaps = []
    for f in ("Index", "Middle", "Ring"):
        c, n = seg_pad(ch, side, f); d = c - bar_c
        if d.length < 1e-6: continue
        p = mesh_hit(ch.meshes, bar_c, d.normalized())
        if p is not None: gaps.append((p - bar_c).length - bar_r)
    return min(gaps) if gaps else None


def joint_deg(ch, side, f):
    """Bend at the knuckle, middle and end joint of one finger (degrees, each 0..180) and their sum (0 = straight, ~250 = fist).
    Knuckle = hand direction (wrist -> middle knuckle) vs segment 1; then segment 1 vs 2 and 2 vs 3."""
    fw = wpt(ch, side + "HandMiddle1") - wpt(ch, side + "Hand")
    ds = [wpt(ch, "%sHand%s%d" % (side, f, k), True) - wpt(ch, "%sHand%s%d" % (side, f, k)) for k in (1, 2, 3)]
    js = [math.degrees(a.angle(b)) for a, b in ((fw, ds[0]), (ds[0], ds[1]), (ds[1], ds[2]))]
    return js, sum(js)


def curl_fixed(ch, side, grip, fingers=("Index", "Middle", "Ring", "Pinky")):
    """Strong finger curls (fist). hands.curl() takes a NEW axis for every segment (segment x palm); once a finger has bent past
    90 deg that axis flips and the next segment bends BACK (11/21: G_POINT 85/100/70 gave only 22 deg at the middle finger, so it
    looked straight = a peace sign). Here every segment of a finger turns about ONE hinge axis, taken from its first segment
    before bending (a hinge axis does not move when the finger bends about it)."""
    palm = hand_frame(ch, side)[3]
    for f in fingers:
        b1 = "%sHand%s1" % (side, f)
        if b1 not in ch.pb: continue
        bpy.context.view_layer.update(); pb = ch.pb[b1]
        ax = (pb.tail - pb.head).normalized().cross(palm)
        if ax.length < 1e-6: continue
        ax.normalize()
        for k, a in enumerate(grip[f], 1):
            b = "%sHand%s%d" % (side, f, k)
            if b in ch.pb and a: rot_bone(ch, b, ax, math.radians(a))


def calibrate(ch, side, q, grip, base):
    """Pose a hand (rotation q, fingers curled) on a scratch pose; returns its world matrix."""
    body(ch, 0, base, HEAD0); set_hand_rot(ch, side, q); curl(ch, side, grip)
    return hand_M(ch, side)


def hand_local_dirs(ch):
    body(ch, 0, E.P_stand(), HEAD0)
    for s_ in ("Right", "Left"):
        w_, f_, a_, p_ = hand_frame(ch, s_)
        HL[s_] = (to_local(ch, s_, f_, point=False).normalized(), to_local(ch, s_, p_, point=False).normalized())


def wave_arms(side, t, t0, t1, base):
    """Waving (rule 1.15): raise the upper arm out to the side (0.3 s), small forearm swings, lower it again (0.3 s)."""
    s = -1 if side == "Right" else 1
    a, f = side + "Arm", side + "ForeArm"
    if t <= t0 or t >= t1 + 0.3: return {a: base[a], f: base[f]}
    u = E.ease((t - t0) / 0.3) if t < t0 + 0.3 else (1 - E.ease((t - t1) / 0.3) if t > t1 else 1.0)
    k = 0.5 + 0.5 * math.sin((t - t0) * 2 * math.pi * 1.6)
    up = (s * 0.75, -0.15, 0.55); fa = (s * (0.12 + 0.32 * k), -0.18, 1.0)
    return {a: vslerp(base[a], up, u), f: vslerp(base[f], fa, u)}


def carry_setup(ch):
    """Hook grip on the lunchbox handle, right hand: C_BOX (hand -> box) and the carrying hand target. Call after hand_local_dirs."""
    q = hand_q("Right", Wd(ch, (-0.10, -0.15, -1.0)), Wd(ch, (1, 0, 0)))      # fingers down, palm to her midline -> thumb forward
    Mh = calibrate(ch, "Right", q, G_HOOK, E.P_stand())
    gp = grip_point(ch, "Right", BAR_R)
    Rb = ch.root.matrix_world.to_3x3().normalized()
    Mbox = Matrix.Translation(gp - Rb @ HANDLE_PT) @ Rb.to_4x4()
    C = Mh.inverted() @ Mbox
    sh = wpt(ch, "RightArm")
    wrist = sh + Wd(ch, CARRY_DIR).normalized() * CARRY_K * (M_["upper"] + M_["fore"])
    carry = (q, wrist, G_HOOK, POLE_L["Right"].copy())
    print("DESK GRIP lunchbox hook: grip point %.4f from the wrist, carry wrist %.4f below the shoulder" % ((gp - Mh.translation).length, sh.z - wrist.z), flush=True)
    return C, carry


def carry_box_M(ch, C, carry, head=HEAD0):
    """Box matrix when the right hand is at the carrying target (scratch pose at frame 0)."""
    solve(ch, 0, 1, head, (0, 0, 0), E.P_stand(), {"Right": carry}, {})
    return hand_M(ch, "Right") @ C


def box_clearance(ch, Mb):
    """Gap between the lunchbox's inner side and her body (ray from the box centre towards her hips, sideways)."""
    c = Mb @ Vector((0, 0, LB_H / 2)); hp = wpt(ch, "Hips"); d = Vector((hp.x - c.x, hp.y - c.y, 0))
    if d.length < 1e-6: return None
    p = mesh_hit(ch.meshes, c, d.normalized())
    return ((p - c).length - LB_W / 2) if p is not None else None


THUMB_OPP = {}


def thumb_pose(ch, side, opp, bends):
    """Reset the thumb, swing Thumb1 across the palm by `opp` deg (about the finger direction), then bend its three joints."""
    for k in (1, 2, 3): ch.pb["%sHandThumb%d" % (side, k)].rotation_quaternion = (1, 0, 0, 0)
    if opp: rot_bone(ch, "%sHandThumb1" % side, hand_frame(ch, side)[1], math.radians(opp))
    curl(ch, side, dict(G_ZERO, Thumb=bends))


def point_at_clock(ch, loc, face, clock_pt, ans0, ans1, listen_yaw):
    """US1 pupil: listens (head to the traveller), then points at the clock with the clock-side hand (arm outside the shoulder)."""
    pt = Vector(local_dir(loc, face, clock_pt, FLOOR + PUPIL * 0.62)).normalized()
    use_right = pt.x < 0
    sg = -1 if use_right else 1
    pt.x = sg * max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    side = "Right" if use_right else "Left"
    print("DESK US1 clock %s pupil %s point_dir %s hand %s" % (tuple(round(v, 4) for v in clock_pt), tuple(round(v, 4) for v in loc), tuple(round(v, 3) for v in pt), side), flush=True)
    # thumb: search its three bends once so the tip rests on the back of the curled middle finger (finger curls are hand-relative,
    # so the same angles hold in every frame)
    ch.pose(0, E.P_point(tuple(pt), right=use_right)); curl_fixed(ch, side, G_POINT)
    c, n = seg_pad(ch, side, "Middle"); target = c - n * (finger_pad(ch, side) + 0.00045)
    # 11/21 check 2: bending alone left the thumb standing up beside the index (side view = a "V"); the thumb must also swing
    # ACROSS the palm (opposition: Thumb1 about the finger direction) before it bends onto the middle finger
    best = None
    for opp in (-70, -50, -30, -10, 0, 10, 30, 50, 70):
        for a1 in (0, 15, 30, 45):
            for a2 in (0, 20, 40, 60):
                for a3 in (0, 20, 40):
                    thumb_pose(ch, side, opp, (a1, a2, a3))
                    d = (wpt(ch, "%sHandThumb3" % side, True) - target).length
                    if best is None or d < best[0]: best = (d, (a1, a2, a3), opp)
    grip = dict(G_POINT, Thumb=best[1]); THUMB_OPP[side] = best[2]
    print("DESK US1 thumb opposition %d bends %s: thumb tip %.4f from the back of the curled middle finger%s" % (
        best[2], best[1], best[0], "  WARN thumb not on the fist (> 0.0012)" if best[0] > 0.0012 else ""), flush=True)
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms, head = E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=use_right), (0, (8 * sg) if t < ans1 else 0, 6 if t < ans1 else 1)
        else:
            arms, head = E.P_stand(), (0, listen_yaw, 0)
        ch.pose(t, arms, twist={"Head": head})
        if t >= ans0 - 0.15:
            # after the arm pose of THIS frame (pose() reset every bone): fist with curl_fixed, thumb with hands.curl, then key them
            curl_fixed(ch, side, grip); thumb_pose(ch, side, THUMB_OPP[side], grip["Thumb"]); key_hand(ch, side, fr)
            if fr == E.f(ans0 + 0.8):
                palm = (ch.arm.matrix_world.to_3x3().normalized() @ hand_frame(ch, side)[3]).normalized()
                into = (wpt(ch, "%sHandMiddle3" % side, True) - wpt(ch, "%sHandMiddle1" % side)).dot(palm)
                cm, nm = seg_pad(ch, side, "Middle"); J = {f: joint_deg(ch, side, f) for f in ("Index", "Middle", "Ring", "Pinky")}
                print("CONTACT US1 point t=%.2f total_bend_deg index %.0f middle %.0f ring %.0f pinky %.0f | joints middle %s | middle_tip_into_palm %.4f (must be > 0) thumb_tip_to_middle %.4f" % (
                    t, J["Index"][1], J["Middle"][1], J["Ring"][1], J["Pinky"][1], tuple(round(v) for v in J["Middle"][0]), into,
                    (wpt(ch, "%sHandThumb3" % side, True) - (cm - nm * (finger_pad(ch, side) + 0.00045))).length), flush=True)
                low = [f for f in ("Middle", "Ring", "Pinky") if J[f][1] < 120]
                if low or J["Index"][1] > 40 or into <= 0:
                    print("CONTACT WARN US1 pointing fist not closed: %s bent < 120 deg, index %.0f deg (want < 40), middle_tip_into_palm %.4f" % (
                        ",".join(low) or "-", J["Index"][1], into), flush=True)
    ch.finish()
    return side


def hand_cam(aim, off, lens=190):
    cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
    for cd in bpy.data.cameras: cd.dof.use_dof = False


def lights():
    E.lights(lamp=env("LAMP", "0.55"))
    bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); top = bpy.context.object      # soft morning light from the front
    top.data.energy = 2.2; top.data.color = (1, 0.95, 0.88); top.data.size = 0.5; top.rotation_euler = (math.radians(25), 0, 0)
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 0.6)); sun = bpy.context.object                 # low 7:35 sun from front-left
    sun.data.energy = env("SUN", "1.4"); sun.data.color = (1, 0.90, 0.74); sun.data.angle = math.radians(3)
    sun.rotation_euler = (math.radians(40), 0, math.radians(-35))


# ================= build =================
street(); maple(0.215, -0.125, 0.085, 0); maple(-0.05, 0.246, 0.095, 1); maple(0.17, 0.246, 0.090, 2)     # far trees peek over the roofs
hydrant(-0.085, SW_Y0 + 0.010)
PORCH_FRONT = her_house()
for (x, w, h, wall, door, k) in ((-0.205, 0.105, 0.088, (0.93, 0.88, 0.72), (0.20, 0.35, 0.60), 0), (-0.085, 0.100, 0.096, (0.70, 0.82, 0.72), (0.70, 0.15, 0.12), 1),
                                 (0.040, 0.110, 0.090, (0.94, 0.80, 0.70), (0.15, 0.35, 0.25), 2), (0.165, 0.100, 0.098, (0.80, 0.84, 0.92), (0.55, 0.20, 0.45), 3),
                                 (0.270, 0.080, 0.086, (0.95, 0.92, 0.85), (0.20, 0.20, 0.22), 4)):
    far_house(x, w, h, wall, door, k)
CLOCK = bus_stop()
lights()
box = lunchbox()

face = {"US1": -18, "US2": 180, "US3": -8, "US4": 0}[SHOT]
ch = E.Char("usa_girl", (0.30, -0.16), face, height=PUPIL)      # placed properly below (ch.at), after the body is measured
M_ = metrics(ch)

if SHOT == "US1":
    # wide at the bus stop: the traveller asks, the pupil (right, by the pole) points at the clock with the clock-side hand
    for o in [box] + list(box.children_recursive): o.hide_render = True          # her lunchbox is still on the porch
    PU = (PX + 0.012, -0.018); ch.at(0, loc=PU)
    GL, GF = (PX - 0.058, -0.026), 20
    ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + VLEN["q"] + 0.15, VOICE["a"], VOICE["a"] + VLEN["a"]
    side = point_at_clock(ch, PU, face, CLOCK, ans0, ans1, -14)

    def girl(t):
        if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
        if t >= ans0 + 0.5: return E.P_stand(), (0, 14, 10)      # looks up at the clock
        return E.P_stand(), (0, 14, 0)
    if CAMSUB == "main":
        animate(E.Char("traveler_girl", GL, GF, height=GIRL), girl)
    sc.frame_set(E.f(ans0 + 0.8))
    print("CONTACT US1 sole_to_pavement %.4f" % (sole_z(ch) - FLOOR), flush=True)
    if CAMSUB == "main":
        aim = Vector((PX + 0.008, 0.012, 0.064))
        cam_move(46, aim + Vector((-0.012, -0.50, 0.070)), aim, aim + Vector((-0.006, -0.44, 0.060)), aim + Vector((0, 0, 0.002)), focus=(PX - 0.01, -0.02, 0.05))
    else:
        hp = hand(ch, side); out = Wd(ch, (-1, 0, 0) if side == "Right" else (1, 0, 0)); front = Wd(ch, (0, -1, 0))
        off = {"HF": out * 0.05 + front * 0.12 + Vector((0, 0, 0.03)), "HS": out * 0.14 + front * 0.01 + Vector((0, 0, 0.02))}[CAMSUB]
        hand_cam(hp, off)

elif SHOT == "US2":
    # her porch: she reaches to the little porch table on her right, hooks her fingers under the lunchbox handle, lifts it
    P2 = (HX + 0.006, HF + 0.016); ch.at(0, loc=P2)                 # porch floor is registered ground: she stands on it
    hand_local_dirs(ch)
    C_BOX, CARRY = carry_setup(ch)
    M_CARRY = carry_box_M(ch, C_BOX, CARRY)
    # where the box waits on the porch table (11/21 check 1: out of reach -> fingers 5.7 mm short; check 2: reachable but only
    # 0.8 mm lift). The grab wrist is put as LOW as her arm reaches (REACH_K of the arm from the leaning shoulder), straight under
    # the carry position plus HOME_OFF sideways, so the lift = carry height - grab height is as big as her arm allows.
    # Box and wrist move together (same hand turn q in CARRY and GRAB), so moving the box by the wrist difference is exact.
    HEAD_REACH = (0, -18, -14)
    sh_up = wpt(ch, "RightArm"); cw = CARRY[1]
    body(ch, 0, E.P_stand(), HEAD_REACH, LEAN_REACH); shr = wpt(ch, "RightArm"); ARM = M_["upper"] + M_["fore"]
    h = (cw - sh_up) + Wd(ch, HOME_OFF); h.z = 0
    R = REACH_K * ARM
    if h.length > 0.8 * R: h = h.normalized() * 0.8 * R
    wr = shr + h - Vector((0, 0, math.sqrt(max(0.0, R * R - h.length_squared))))
    M_HOME = Matrix.Translation(wr - cw) @ M_CARRY
    wr = from_prop(M_HOME, C_BOX, G_HOOK, "Right")[1]
    home = M_HOME.translation.copy()
    print("DESK HOME grab wrist %.4f from the (leaning) shoulder = %.2f of the arm %.4f | lift to carry %.4f up, %.4f total" % (
        (wr - shr).length, (wr - shr).length / ARM, ARM, M_CARRY.translation.z - home.z, (M_CARRY.translation - home).length), flush=True)
    if M_CARRY.translation.z - home.z < LIFT_MIN: print("DESK WARN the lift is small (%.4f < %.4f): lower CARRY_K or lean more (LEAN_REACH)" % (M_CARRY.translation.z - home.z, LIFT_MIN), flush=True)
    pz = FLOOR + PORCH_H
    # little porch table under the box: top = box bottom (measured from her carry pose, not guessed)
    tw, td = LB_W + 0.0036, LB_L + 0.0060
    wood = E.wood()
    tparts = [E.box((home.x, home.y, home.z - 0.0008), (tw, td, 0.0016), wood, "porchTableTop", bevel=0.0003)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            hgt = home.z - 0.0016 - pz
            tparts.append(E.box((home.x + sx * (tw / 2 - 0.0008), home.y + sy * (td / 2 - 0.0008), pz + hgt / 2), (0.0012, 0.0012, hgt), wood, "porchTableLeg", bevel=0))
    inner = Vector((home.x, home.y, home.z - 0.002)); hp = wpt(ch, "Hips"); dvec = Vector((hp.x - inner.x, hp.y - inner.y, 0)).normalized()
    hit = mesh_hit(ch.meshes, inner, dvec)
    print("DESK PORCH floor %.4f | TABLE top %.4f above the porch, size %.4f x %.4f, centre %s, inner edge to her body %s" % (
        pz, home.z - pz, tw, td, tuple(round(v, 4) for v in home), ("%.4f" % ((hit - inner).length - tw / 2)) if hit is not None else "none"), flush=True)
    if home.z - pz < 0.004: print("DESK WARN porch table only %.4f high: the box sits too low for her reach (check HOME_OFF)" % (home.z - pz), flush=True)
    # rest hand target (arm hanging as in P_stand)
    body(ch, 0, E.P_stand(), HEAD0)
    REST = (hand_M(ch, "Right").to_3x3().normalized().to_quaternion(), hand_M(ch, "Right").translation.copy(), G_RELAX, POLE_L["Right"].copy())
    PRE = from_prop(Matrix.Translation((0, 0, 0.0016)) @ M_HOME, C_BOX, G_HOOK_OPEN, "Right")
    GRAB = from_prop(M_HOME, C_BOX, G_HOOK, "Right")
    T_PRE0, T_PRE1, T_GRAB, T_LIFT0, T_LIFT1 = 0.45, 1.15, 1.45, 1.55, 2.45

    def right(t):
        if t < T_PRE0: return REST
        if t < T_PRE1: return tblend(REST, PRE, (t - T_PRE0) / (T_PRE1 - T_PRE0))
        if t < T_GRAB: return tblend(PRE, GRAB, (t - T_PRE1) / (T_GRAB - T_PRE1))
        if t < T_LIFT0: return GRAB
        return from_prop(blend_M(M_HOME, M_CARRY, (t - T_LIFT0) / (T_LIFT1 - T_LIFT0)), C_BOX, G_HOOK, "Right")
    LEANK = [(0.0, (0, 0, 0)), (0.4, (0, 0, 0)), (1.0, LEAN_REACH), (1.7, LEAN_REACH), (2.4, (0, 0, 0)), (9, (0, 0, 0))]
    HEADK = [(0.0, (0, 0, -2)), (0.25, HEAD_REACH), (2.2, HEAD_REACH), (2.6, (0, 0, -1)), (9, (0, 0, -1))]
    jump = None
    for fr in E.frames():
        t = fr / E.FPS
        solve(ch, t, fr, hk(HEADK, t), hk(LEANK, t), E.P_stand(), {"Right": right(t)}, {"Left": G_RELAX})
        Mb = hand_M(ch, "Right") @ C_BOX if t >= T_GRAB else M_HOME
        if t >= T_GRAB and jump is None:
            jump = (Mb.translation - M_HOME.translation).length; sk = bar_to_skin(ch, "Right", M_HOME @ HANDLE_PT, BAR_R)
            print("CONTACT US2 GRAB t=%.2f fingers_to_handle %.4f bar_to_finger_skin %s box_jump %.4f (want all < 0.0006 before the box moves)" % (
                t, (grip_point(ch, "Right", BAR_R) - M_HOME @ HANDLE_PT).length, ("%.4f" % sk) if sk is not None else "none", jump), flush=True)
        box.matrix_world = Mb; box.scale = (1, 1, 1); key_obj(box, fr, rot=True)
        if fr % 4 == 0:
            gp_now = grip_point(ch, "Right", BAR_R); c = box_clearance(ch, Mb); sk = bar_to_skin(ch, "Right", Mb @ HANDLE_PT, BAR_R)
            print("CONTACT US2 t=%.2f fingers_to_handle %.4f bar_to_finger_skin %s box_lift %.4f box_clear_of_body %s" % (
                t, (gp_now - Mb @ HANDLE_PT).length, ("%.4f" % sk) if sk is not None else "none", Mb.translation.z - home.z, ("%.4f" % c) if c is not None else "none"), flush=True)
    ch.finish(); E.constant(box)
    print("CONTACT US2 box_jump_at_grab %.4f (box moves with the hand only after the fingers close at t=%.2f)" % (jump or 0.0, T_GRAB), flush=True)
    sc.frame_set(0); print("CONTACT US2 sole_to_porch %.4f" % (sole_z(ch) - pz), flush=True)
    if CAMSUB == "main":
        # from the street side (she faces +y): her face, the reach on her right (screen left), the house front behind her
        aim = Vector((P2[0] + 0.004, P2[1] + 0.002, pz + 0.034))
        cam_move(55, aim + Vector((0.060, 0.255, 0.030)), aim, aim + Vector((0.052, 0.235, 0.026)), aim, focus=(P2[0], P2[1], pz + 0.04))
        bpy.ops.object.light_add(type="AREA", location=(P2[0] + 0.02, P2[1] + 0.13, pz + 0.06)); pl = bpy.context.object   # under the porch roof
        pl.data.energy = env("PORCH_LIGHT", "0.3"); pl.data.size = 0.15; pl.data.color = (1, 0.95, 0.88); pl.rotation_euler = (math.radians(-80), 0, 0)
    else:
        for o in PORCH_FRONT: o.hide_render = True
        aimp = M_HOME @ HANDLE_PT; out = Wd(ch, (-1, 0, 0)); front = Wd(ch, (0, -1, 0))
        off = {"HF": out * 0.05 + front * 0.12 + Vector((0, 0, 0.04)), "HS": out * 0.14 + front * 0.01 + Vector((0, 0, 0.02))}[CAMSUB]
        hand_cam(aimp, off)

else:
    B = make_bus(M_)
    X_STOP = PX - B["doorc"]
    print("DESK BUS stops at x %.4f (door centre at her x %.4f), lane y %.4f..%.4f" % (X_STOP, PX, BUS_SIDE_Y, BUS_SIDE_Y + BW), flush=True)

    if SHOT == "US3":
        # the bus drives in from the left (nose first, wheels rolling on the road), stops by the pole, opens its doors.
        # She carries the lunchbox (right hand) and waves to the traveller with her left hand: "Good morning! Here comes the bus!"
        T_IN0, T_IN1, T_DOOR0, T_DOOR1 = 0.3, 3.4, 3.55, 3.95
        X0 = X_STOP - 0.42

        def bus_x(t):
            u = max(0.0, min(1.0, (t - T_IN0) / (T_IN1 - T_IN0)))
            return X_STOP - (X_STOP - X0) * (1 - u) ** 2          # comes in rolling, slows down, stops (no jerk at the stop)
        for fr in E.frames():
            t = fr / E.FPS; x = bus_x(t)
            bus_place(B, x, (x - X0) / WR, E.ease((t - T_DOOR0) / (T_DOOR1 - T_DOOR0)), fr)
            if fr % 8 == 0:
                bpy.context.view_layer.update()
                wz = min((h.matrix_world.translation.z for h in B["hubs"]))
                print("CONTACT US3 t=%.2f bus_x %.4f wheel_bottom_to_road %.4f door %.2f" % (t, x, wz - WR - ROAD_Z, E.ease((t - T_DOOR0) / (T_DOOR1 - T_DOOR0))), flush=True)
        for o in [B["root"]] + B["hubs"] + B["hinges"]: E.constant(o)
        P3 = (PX, -0.008); ch.at(0, loc=P3)
        hand_local_dirs(ch)
        C_BOX, CARRY = carry_setup(ch)
        ST = E.P_stand()
        HEADK = [(0.0, (0, -16, 0)), (1.7, (0, -16, 0)), (2.1, (0, -32, -2)), (3.5, (0, -32, -2)), (3.85, (0, -6, 0)), (9, (0, -6, 0))]
        W0, W1 = VOICE["gm"] + 0.05, VOICE["gm"] + 1.25            # waves during "Good morning!"
        for fr in E.frames():
            t = fr / E.FPS
            base = dict(ST); base.update(wave_arms("Left", t, W0, W1, ST))
            solve(ch, t, fr, hk(HEADK, t), (0, 0, 0), base, {"Right": CARRY}, {"Left": G_OPEN if W0 < t < W1 + 0.3 else G_RELAX})
            Mb = hand_M(ch, "Right") @ C_BOX
            box.matrix_world = Mb; box.scale = (1, 1, 1); key_obj(box, fr, rot=True)
            if fr % 12 == 0:
                c = box_clearance(ch, Mb); sk = bar_to_skin(ch, "Right", Mb @ HANDLE_PT, BAR_R)
                print("CONTACT US3 t=%.2f fingers_to_handle %.4f bar_to_finger_skin %s box_bottom_above_pavement %.4f box_clear_of_body %s" % (
                    t, (grip_point(ch, "Right", BAR_R) - Mb @ HANDLE_PT).length, ("%.4f" % sk) if sk is not None else "none", Mb.translation.z - FLOOR, ("%.4f" % c) if c is not None else "none"), flush=True)
        ch.finish(); E.constant(box)
        sc.frame_set(24); print("CONTACT US3 sole_to_pavement %.4f" % (sole_z(ch) - FLOOR), flush=True)
        if CAMSUB == "main":
            GL3 = (PX - 0.066, -0.020)

            def girl(t):                                            # waves back (left hand, outside her shoulder), then looks at the bus
                arms = dict(E.P_stand()); arms.update(wave_arms("Left", t, 0.9, 1.9, E.P_stand()))
                return arms, ((0, 16, 0) if t < 2.1 else (0, -28, -1))
            animate(E.Char("traveler_girl", GL3, 24, height=GIRL), girl)
            aim = Vector((PX - 0.022, 0.030, 0.056))
            cam_move(38, aim + Vector((0.012, -0.56, 0.072)), aim, aim + Vector((0.008, -0.52, 0.066)), aim, focus=(PX - 0.03, -0.012, 0.05))
        else:
            sc.frame_set(24); gp = grip_point(ch, "Right", BAR_R); out = Wd(ch, (-1, 0, 0)); front = Wd(ch, (0, -1, 0))
            off = {"HF": out * 0.05 + front * 0.12 + Vector((0, 0, 0.03)), "HS": out * 0.14 + front * 0.01 + Vector((0, 0, 0.015))}[CAMSUB]
            hand_cam(gp, off)

    else:
        # US4 (a cut: she is already on the lower step, rule 1.8 / 1.10): left hand on the front grab rail, lunchbox in the right hand.
        # "I go to school at seven thirty-five." Then she lets go of the rail and waves: "I go to school by school bus. The bus is yellow."
        bus_place(B, X_STOP, 0.0, 1.0)
        tx0, tx1 = X_STOP + B["dx0"] + 0.0004, X_STOP + B["dx1"] - 0.0004
        ty0, ty1 = BUS_SIDE_Y - 0.002, BUS_SIDE_Y + 0.016
        ground_rect(tx0, tx1, ty0, ty1, ROAD_Z + B["t1"])               # the lower step is her floor in this shot
        P4 = (PX, BUS_SIDE_Y + 0.008); ch.at(0, loc=P4)
        bpy.ops.object.light_add(type="AREA", location=(X_STOP + B["doorc"], BUS_SIDE_Y + 0.030, ROAD_Z + B["dtop"] - 0.004)); il = bpy.context.object
        il.data.energy = env("BUS_LIGHT", "0.06"); il.data.size = 0.03; il.data.color = (1, 0.93, 0.82)       # cabin light over the door (GUESS)
        hand_local_dirs(ch)
        C_BOX, CARRY = carry_setup(ch)
        ST = E.P_stand()
        # rail grip: handshake grip, palm to her midline and a little forward, thumb up (see the grip table at the top)
        qr = hand_q("Left", Wd(ch, (0.45, -0.85, -0.15)), Wd(ch, (-0.85, -0.45, 0.0)))
        Mh = calibrate(ch, "Left", qr, G_RAIL, ST)
        C_RAIL = Mh.inverted() @ Matrix.Translation(grip_point(ch, "Left", RAIL_R))
        shL = wpt(ch, "LeftArm")
        RG = Vector((X_STOP + B["rail_x"], BUS_SIDE_Y + 0.0015, shL.z - 0.005))
        RAIL = from_prop(Matrix.Translation(RG), C_RAIL, G_RAIL, "Left")
        RAIL_OFF = from_prop(Matrix.Translation(RG + Vector((-0.0006, -0.0022, 0.0006))), C_RAIL, G_RAIL_OPEN, "Left")
        print("DESK DOOR her x %.4f rail %s (lat %.4f, %.4f in front of her) left shoulder %s tread top %.4f step %.4f" % (
            P4[0], tuple(round(v, 4) for v in RG), RG.x - P4[0], P4[1] - RG.y, tuple(round(v, 4) for v in shL), ROAD_Z + B["t1"], B["step"]), flush=True)
        T_LET0, T_LET1 = VOICE["a2"] + VLEN["a2"] + 0.05, VOICE["a2"] + VLEN["a2"] + 0.35      # lets go after the first sentence
        W0, W1 = T_LET1, VOICE["bus"] + VLEN["bus"] - 0.1
        HEADK = [(0.0, (0, 6, -1)), (9, (0, 6, -1))]
        left_ik = None
        for fr in E.frames():
            t = fr / E.FPS
            base = dict(ST)
            if t < T_LET0:
                tg = {"Right": CARRY, "Left": RAIL}; cu = {}
            elif t < T_LET1:
                tg = {"Right": CARRY, "Left": tblend(RAIL, RAIL_OFF, (t - T_LET0) / (T_LET1 - T_LET0))}; cu = {}
            else:
                # from the released arm (last IK directions) into the wave
                src = left_ik or {"LeftArm": ST["LeftArm"], "LeftForeArm": ST["LeftForeArm"]}
                base.update(wave_arms("Left", t, W0, W1, dict(ST, **src)))
                tg = {"Right": CARRY}; cu = {"Left": G_OPEN if t < W1 + 0.3 else G_RELAX}
            arms = solve(ch, t, fr, hk(HEADK, t), (0, 0, 0), base, tg, cu)
            if t < T_LET1: left_ik = {k: v for k, v in arms.items() if k.startswith("Left")}
            Mb = hand_M(ch, "Right") @ C_BOX
            box.matrix_world = Mb; box.scale = (1, 1, 1); key_obj(box, fr, rot=True)
            if fr % 8 == 0:
                c = box_clearance(ch, Mb)
                rail_gap = (grip_point(ch, "Left", RAIL_R) - RG); rail_gap.z = 0
                rs = bar_to_skin(ch, "Left", RG, RAIL_R) if t < T_LET0 else None; sk = bar_to_skin(ch, "Right", Mb @ HANDLE_PT, BAR_R)
                print("CONTACT US4 t=%.2f rail_grip_to_rail %.4f rail_to_finger_skin %s fingers_to_handle %.4f bar_to_finger_skin %s box_bottom_above_step %.4f box_clear_of_body %s" % (
                    t, rail_gap.length if t < T_LET0 else -1.0, ("%.4f" % rs) if rs is not None else "-", (grip_point(ch, "Right", BAR_R) - Mb @ HANDLE_PT).length,
                    ("%.4f" % sk) if sk is not None else "none", Mb.translation.z - (ROAD_Z + B["t1"]), ("%.4f" % c) if c is not None else "none"), flush=True)
        ch.finish(); E.constant(box)
        sc.frame_set(48); print("CONTACT US4 sole_to_step %.4f (lower step top %.4f)" % (sole_z(ch) - (ROAD_Z + B["t1"]), ROAD_Z + B["t1"]), flush=True)
        tread = ROAD_Z + B["t1"]
        if CAMSUB == "main":
            # 3/4 front: the open door around her, the hood on the right, the 7:35 clock top-right; feet kept above the subtitle band
            aim = Vector((PX + 0.020, BUS_SIDE_Y - 0.004, FLOOR + 0.048))
            cam_move(40, aim + Vector((0.020, -0.262, 0.016)), aim, aim + Vector((0.018, -0.248, 0.015)), aim, focus=(PX, P4[1], tread + 0.045))
        elif CAMSUB in ("HF", "HS"):
            if CAMSUB == "HS":
                for o in B["G"]["front"]: o.hide_render = True                  # look at the rail hand through the (hidden) bus front
            hand_cam(RG, {"HF": Vector((0.05, -0.12, 0.03)), "HS": Vector((0.14, 0.004, 0.02))}[CAMSUB])
        else:
            # feet on the lower step: L = from her right side at step height (bus side wall hidden), L2 = low front through the door
            if CAMSUB == "L":
                for o in B["G"]["rear"]: o.hide_render = True
            aim = Vector((PX, P4[1], tread + 0.006))
            hand_cam(aim, {"L": Vector((-0.15, -0.004, 0.004)), "L2": Vector((0.03, -0.13, 0.0))}[CAMSUB], lens=115)

print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
