# Safari Count VERSION 2 - Japan station, Fuji Safari Park (tabletop style H, Blender on Colab only).
# Spec: rdq/RDQ-spec-safari-count-v2-20261127.md, allocation table v2/ (teacher-approved 11/27).
#   JV1 (7.0 s) "There are two rhinos." Herbivore zone: two white rhinos walk slowly, then stop to graze; the jungle bus
#       drives in from the right and stops on the road behind them. Last 1 s: both still, apart, in view.
#   JV2 (7.0 s) "There is one tiger." Tiger zone: one tiger walks out from behind a rock, stops on the grass and looks
#       around; the jungle bus waits on the road behind. Last 1 s: it holds still.
#   Check cameras: <SHOT>S low side.
# Models (all from v1): kenya_rhino_walk, india_tiger_walk, japan_jungle_bus. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"JV1": 7.0, "JV2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
RHINO_H = 0.050               # from KE2
TIGER_H = 0.052               # from IN1
BUS_L = 0.20                  # from JP1
SPEED_H = 0.44


def rock(x, y, s, name="rock", col=(0.52, 0.47, 0.40)):
    r = E.ball((x, y, FLOOR + s * 0.30), s, E.felt(name, col), name)
    r.scale = (1.0, 0.8, 0.5); return r


def ground(grass):
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.42, 0.64, 0.90), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("grass", grass), "yard", thick=FLOOR)


def fuji():
    E.cone((0.05, 0.64, FLOOR + 0.07), 0.22, 0.014, 0.14, E.felt("fuji", (0.36, 0.44, 0.62)), verts=48, name="fuji")
    E.cone((0.05, 0.64, FLOOR + 0.122), 0.062, 0.014, 0.04, E.felt("snow", (0.96, 0.96, 0.98)), verts=48, name="fujiSnow")
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.36, FLOOR + 0.02), 0.07, E.felt("hill", (0.30, 0.46, 0.22)), "hill").scale = (1.0, 0.5, 0.8)


def tree(x, y, h):
    E.cyl((x, y, FLOOR + h * 0.35), 0.003, h * 0.7, E.felt("trunk", (0.42, 0.30, 0.20)), verts=10, name="trunk")
    E.ball((x, y, FLOOR + h * 0.85), h * 0.32, E.felt("leaves", (0.24, 0.42, 0.18)), "crown").scale = (1.3, 1.1, 0.7)


def bus(t_keys, y, rot_z=0.0):
    b = E.place(f"{PROPS}/japan_jungle_bus.glb", BUS_L, (t_keys[0][1], y, FLOOR + ROAD_T), rot_z=rot_z, axis="long")
    for t, x in t_keys:
        b.location.x = x; b.keyframe_insert("location", frame=E.f(t))
    return b


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


ground((0.50, 0.56, 0.28) if SHOT == "JV1" else (0.46, 0.54, 0.26))
fuji()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.85); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)
E.box((0, 0.16, FLOOR + ROAD_T / 2), (0.70, 0.10, ROAD_T), E.felt("road", (0.62, 0.55, 0.44)), "busRoad", bevel=0)

if SHOT == "JV1":
    for x, y in ((-0.28, 0.24), (0.30, 0.25), (-0.30, -0.12)): tree(x, y, 0.09)
    for x, y, s in ((-0.24, 0.0, 0.013), (0.27, -0.09, 0.012)): rock(x, y, s)
    for x, y in ((-0.06, 0.03), (-0.03, 0.045), (0.10, -0.01), (0.13, 0.005)):        # grass tufts where they graze
        for k in range(5):
            a = k * 1.26
            E.cyl((x + 0.004 * math.cos(a), y + 0.004 * math.sin(a), FLOOR + 0.004), 0.0008, 0.008, E.felt("tuft", (0.36, 0.48, 0.16)),
                  verts=6, name="tuft")
    rh = []
    # check 1: rhino 1 started at x -0.24 and ended cut at the left edge -> starts at -0.17
    for i, (pts, d0, t_stop) in enumerate((([(-0.17, 0.05), (-0.08, 0.04), (-0.02, 0.035)], 0.0, 3.6),
                                            ([(-0.02, -0.03), (0.06, -0.015), (0.12, -0.005)], 0.0, 3.0))):
        r = A.Animal("kenya_rhino_walk", RHINO_H * (1.0 - 0.05 * i), fwd_fix=None, label="rhino%d" % (i + 1), clip_speed_h=SPEED_H)
        path = A.Path(pts)
        r.walk("walk", path, 0.2 * i, t_stop, None, start_d=d0, phase=0.45 * i)
        r.graze(t_stop + 0.05, T + 1.0, down_deg=75.0)                     # grazing lasts into the counting hold
        v = r.cycle("walk")[1]; p, h = path.at(d0 + v * (t_stop - 0.2 * i))
        r.ch.at(t_stop, loc=(p[0], p[1]), face_deg=A.heading_deg(h) + r.facing_fix())
        r.finish(); rh.append(r)
    A.report(rh, 0.0, 3.6)
    bus([(0.0, 0.50), (2.8, 0.06)], y=0.16, rot_z=math.radians(-90))        # JP1: drives in, stops behind
    aim = Vector((0.0, 0.03, FLOOR + 0.022))
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.32, 0.0)), aim, aim + Vector((0.0, -0.32, 0.0)), aim)
    else:
        cam_move(34, aim + Vector((0.02, -0.38, 0.18)), aim, aim + Vector((0.0, -0.32, 0.15)), aim, t_end=T - HOLD)
    print("DESK CAM JV1 %s" % CAMSUB, flush=True)

else:
    # Tiger zone: big rocks, the tiger walks out from behind the left rock, stops and looks around
    for x, y, s in ((-0.23, 0.08, 0.035), (0.20, 0.08, 0.030), (0.05, 0.13, 0.026)): rock(x, y, s)   # check 2: the tiger started inside the left rock
    for x, y in ((-0.29, 0.24), (0.29, 0.22)): tree(x, y, 0.10)
    E.place(f"{PROPS}/japan_jungle_bus.glb", BUS_L, (0.18, 0.17, FLOOR + ROAD_T), rot_z=math.radians(-90), axis="long")
    tg = A.Animal("india_tiger_walk", TIGER_H, fwd_fix=None, label="tiger", clip_speed_h=SPEED_H)
    path = A.Path([(-0.15, 0.03), (-0.06, 0.005), (0.02, -0.01), (0.08, -0.02)])   # check 1: from -0.24 it ended outside the picture
    STOP = 3.4
    tg.walk("walk", path, 0.0, STOP, None, start_d=0.0, phase=0.0)
    tg.look([(STOP + 0.1, 0.0), (STOP + 0.7, -50.0), (STOP + 1.4, -50.0), (STOP + 2.1, 40.0), (STOP + 2.6, 40.0), (STOP + 3.2, 0.0)])
    tg.finish()
    A.report([tg], 0.0, STOP)
    aim = Vector((-0.07, 0.02, FLOOR + 0.025))   # check 1: the tiger stops near x -0.08
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.32, 0.0)), aim, aim + Vector((0.0, -0.32, 0.0)), aim)
    else:
        cam_move(36, aim + Vector((0.03, -0.36, 0.14)), aim, aim + Vector((0.02, -0.29, 0.11)), aim, t_end=T - HOLD)
    print("DESK CAM JV2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
