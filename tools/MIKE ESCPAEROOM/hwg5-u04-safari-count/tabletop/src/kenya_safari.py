# Safari Count - Kenya station, Maasai Mara by jeep (tabletop style H, Blender on Colab only). Spec: rdq/RDQ-spec-safari-count-animations-20261125.md
#   KE1 (7.0 s) "There are eight zebras." Eight zebras walk in single file across the dirt road from left to right;
#       the safari jeep has stopped on the road and waits. Last 1 s: all stop, all eight in the picture, apart (counting).
#   KE2 (7.0 s) "There's one rhino." One black rhino walks slowly, stops to graze (head down) twice; the jeep is far away.
#   Check cameras: <SHOT>S low side (legs / wheels on the road).
# Models: kenya_zebra_walk, kenya_rhino_walk (Tripo image-to-3D + quadruped rig + Walk; checked with gltf_fk.py),
#   kenya_jeep (gallery, static). Lessons from Japan (11/25): vehicles stand ON the road surface (FLOOR + ROAD_T), inside
#   the board, away from the hills; clip speed from the bear (0.44 body heights / s) when the foot fit is unreliable.
# Numbers marked GUESS: check frames. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"KE1": 7.0, "KE2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
ZEBRA_H = 0.046               # check 1: 0.036 looked tiny
RHINO_H = 0.050               # check 1: small
JEEP_L = 0.10                 # jeep length (a toy next to the animals)
SPEED_H = 0.44                # Walk preset ground speed in body heights per second (bear fit)
LEGFIX = {}                   # filled after gltf_fk.py: {"model": [("broken_leaf", "good_leaf")]}


def ground():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.46, 0.66, 0.90), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("savanna", (0.64, 0.56, 0.30)), "yard", thick=FLOOR)   # dry golden grass
    for k in range(-6, 7):                                                                         # low hills far away
        E.ball((k * 0.065, 0.38, FLOOR + 0.015), 0.07, E.felt("hill", (0.42, 0.46, 0.24)), "hill").scale = (1.0, 0.5, 0.6)


def acacia(x, y, h):
    """Flat-topped acacia tree (the savanna look)."""
    E.cyl((x, y, FLOOR + h * 0.4), 0.0025, h * 0.8, E.felt("trunk", (0.38, 0.28, 0.20)), verts=10, name="trunk")
    top = E.cyl((x, y, FLOOR + h * 0.85), 1.0, h * 0.12, E.felt("acacia", (0.30, 0.42, 0.18)), verts=24, name="crown")
    top.scale = (h * 0.55, h * 0.40, 1.0)


def bush(x, y, s):
    E.ball((x, y, FLOOR + s * 0.4), s, E.felt("bush", (0.42, 0.48, 0.22)), "bush").scale = (1.0, 0.8, 0.6)


def jeep(loc, rot_z):
    return E.place(f"{PROPS}/kenya_jeep.glb", JEEP_L, (loc[0], loc[1], FLOOR + ROAD_T), rot_z=rot_z, axis="long")


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


ground()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.8; sun.data.color = (1.0, 0.93, 0.80); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

if SHOT == "KE1":
    # red-brown dirt road running away from the camera (along y); the zebras cross it along x
    E.box((0.06, 0.03, FLOOR + ROAD_T / 2), (0.09, 0.46, ROAD_T), E.felt("road", (0.62, 0.40, 0.26)), "road", bevel=0)
    for x, y, h in ((-0.27, 0.22, 0.10), (0.25, 0.24, 0.09)): acacia(x, y, h)
    for x, y, s in ((-0.22, -0.10, 0.012), (0.24, -0.06, 0.010), (-0.05, 0.22, 0.012)): bush(x, y, s)
    jeep((0.06, -0.05), math.radians(180))                     # check 1: cut off at the bottom -> nearer the zebras; nose to them, waiting
    # single file left -> right at y 0.07; spacing 0.048 between noses; travel ~ 0.016 m/s * 6 s
    path = A.Path([(-0.40, 0.07), (-0.10, 0.072), (0.10, 0.070), (0.40, 0.068)])
    zs = []
    for i in range(8):
        z = A.Animal("kenya_zebra_walk", ZEBRA_H * (1.0 - 0.03 * (i % 3)), fwd_fix=None, label="zebra%d" % (i + 1),
                     clip_speed_h=SPEED_H, fix_legs=LEGFIX.get("kenya_zebra_walk", ()),
                     reverse_clip=True)   # 11/25 teacher: the zebras walked backwards (rig back to front)
        # check 1: bigger zebras -> 0.064 apart; the line ends from x -0.22 (last) to 0.23 (first), all in the picture
        z.walk("walk", path, 0.0, T - HOLD, None, start_d=0.051 + (7 - i) * 0.064, phase=(i * 0.618) % 1.0)
        z.finish(); zs.append(z)
    A.report(zs, 0.0, T - HOLD)
    aim = Vector((0.0, 0.04, FLOOR + 0.02))
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.32, 0.0)), aim, aim + Vector((0.0, -0.32, 0.0)), aim)
    else:
        cam_move(26, aim + Vector((0.02, -0.38, 0.20)), aim, aim + Vector((0.01, -0.33, 0.17)), aim, t_end=T - HOLD)   # check 3: an end zebra touched the edge
    print("DESK CAM KE1 %s" % CAMSUB, flush=True)

else:
    E.box((-0.05, 0.20, FLOOR + ROAD_T / 2), (0.70, 0.06, ROAD_T), E.felt("road", (0.62, 0.40, 0.26)), "road", bevel=0)
    jeep((0.10, 0.20), math.radians(-90))                     # far away on the back road (check 1: 0.20 was out of the picture)
    for x, y, h in ((-0.24, 0.12, 0.10), (0.27, 0.10, 0.09)): acacia(x, y, h)
    for x, y, s in ((-0.15, -0.08, 0.011), (0.12, -0.10, 0.012), (0.02, 0.10, 0.010)): bush(x, y, s)
    # a few grass tufts where it grazes
    for x, y in ((-0.03, 0.0), (0.005, 0.012), (0.03, -0.01)):        # where its head is when it grazes
        for k in range(5):
            a = k * 1.26
            E.cyl((x + 0.004 * math.cos(a), y + 0.004 * math.sin(a), FLOOR + 0.004), 0.0008, 0.008, E.felt("tuft", (0.36, 0.48, 0.16)),
                  verts=6, name="tuft")
    path = A.Path([(-0.10, 0.0), (-0.03, 0.01), (0.04, 0.01), (0.12, 0.0)])   # check 1: started cut off at the left edge
    r = A.Animal("kenya_rhino_walk", RHINO_H, fwd_fix=None, label="rhino", clip_speed_h=SPEED_H, fix_legs=LEGFIX.get("kenya_rhino_walk", ()))
    v = r.cycle("walk")[1]
    d = 0.0
    for t0, t1, kind in ((0.0, 1.6, "walk"), (1.6, 3.0, "graze"), (3.0, 4.6, "walk"), (4.6, T, "graze")):
        if kind == "walk":
            r.walk("walk", path, t0, t1, None, start_d=d); d += v * (t1 - t0)
        else:
            r.graze(t0 + 0.05, t1 if t1 < T else T + 1.0, down_deg=75.0)   # check 3: 38 deg lowered the nose only 1 cm          # the second graze lasts into the counting hold
            p, h = path.at(d)
            r.ch.at(t0, loc=(p[0], p[1]), face_deg=A.heading_deg(h) + r.facing_fix())
    r.finish()
    A.report([r], 0.0, 4.6)
    aim = Vector((-0.04, 0.02, FLOOR + 0.022))
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.30, 0.0)), aim, aim + Vector((0.0, -0.30, 0.0)), aim)
    else:
        cam_move(42, aim + Vector((0.03, -0.32, 0.13)), aim, aim + Vector((0.01, -0.27, 0.11)), aim, t_end=T - HOLD)
    print("DESK CAM KE2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
