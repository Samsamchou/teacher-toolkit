# Safari Count - Japan station, Fuji Safari Park (tabletop style H, Blender on Colab only). Spec: rdq/RDQ-spec-safari-count-animations-20261125.md
#   JP1 (6.5 s) "There are five lions." Three lionesses lie resting on the grass (static model), two lions walk slowly
#       across the front from right to left; the zebra-striped jungle bus drives in from the right and stops behind them.
#   JP2 (7.0 s) "There are six horses." Six ponies trot round a small paddock fence (walk clip played faster); Haruto
#       watches from outside the fence; the jungle bus waits far away (they got off the bus and went to the farm).
#   Last 1 s of each: everything holds still, all animals in the picture and apart (counting).
#   Check cameras: <SHOT>S low side (legs).
# Models: japan_lion_walk2 (Tripo image-to-3D + quadruped rig + Walk), japan_lion_lying (static), japan_whitehorse_walk (gallery
#   white horse + quadruped rig + Walk), japan_jungle_bus (static), japan_boy (World Routines Haruto).
# Tripo AI Animation only works on humanoid rigs (11/25): quadrupeds only have Walk -> trot = Walk played ~1.7x.
# Numbers marked GUESS: check frames. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"JP1": 6.5, "JP2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
LION_H = 0.046                # GUESS: standing lion, whole height
LYING_H = 0.030               # check 1: 0.026 looked tiny
PONY_H = 0.036                # GUESS: miniature horse
BUS_L = 0.20                  # GUESS: bus length
KID_H = 0.068
ROAD_T = 0.003                # bus road thickness (the bus stands ON it)


def rock(x, y, s, name="rock", col=(0.52, 0.47, 0.40)):
    r = E.ball((x, y, FLOOR + s * 0.30), s, E.felt(name, col), name)
    r.scale = (1.0, 0.8, 0.5); return r


def ground(grass=(0.52, 0.56, 0.26)):
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.42, 0.64, 0.90), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("grass", grass), "yard", thick=FLOOR)


def fuji():
    """Mount Fuji behind the park (felt cone with a snow cap) + green hills."""
    # check 1: the top (snow) was above the picture -> lower and smaller
    # check 2: its flat base stuck out in front of the hills -> further back
    E.cone((0.05, 0.64, FLOOR + 0.07), 0.22, 0.014, 0.14, E.felt("fuji", (0.36, 0.44, 0.62)), verts=48, name="fuji")
    E.cone((0.05, 0.64, FLOOR + 0.122), 0.062, 0.014, 0.04, E.felt("snow", (0.96, 0.96, 0.98)), verts=48, name="fujiSnow")
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.36, FLOOR + 0.02), 0.07, E.felt("hill", (0.30, 0.46, 0.22)), "hill").scale = (1.0, 0.5, 0.8)


def tree(x, y, h):
    E.cyl((x, y, FLOOR + h * 0.35), 0.003, h * 0.7, E.felt("trunk", (0.42, 0.30, 0.20)), verts=10, name="trunk")
    E.ball((x, y, FLOOR + h * 0.85), h * 0.32, E.felt("leaves", (0.24, 0.42, 0.18)), "crown").scale = (1.3, 1.1, 0.7)


def bus(t_keys, y, rot_z=0.0):
    """Jungle bus keyed along x: t_keys = [(t, x), ...]; holds the last x."""
    # teacher 11/25: the wheels sank into the road (road top = FLOOR + 0.003) -> stand the bus on the road surface
    b = E.place(f"{PROPS}/japan_jungle_bus.glb", BUS_L, (t_keys[0][1], y, FLOOR + ROAD_T), rot_z=rot_z, axis="long")
    for t, x in t_keys:
        b.location.x = x; b.keyframe_insert("location", frame=E.f(t))
    return b


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


ground() if SHOT == "JP1" else ground((0.40, 0.58, 0.26))
fuji()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.85); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

if SHOT == "JP1":
    # bus road behind the lions
    E.box((0, 0.16, FLOOR + ROAD_T / 2), (0.70, 0.10, ROAD_T), E.felt("road", (0.62, 0.55, 0.44)), "busRoad", bevel=0)   # wide enough for all 4 wheels
    for x, y in ((-0.28, 0.24), (0.30, 0.25), (-0.30, -0.12)): tree(x, y, 0.09)
    for x, y, s in ((-0.22, 0.02, 0.014), (0.26, -0.10, 0.012)): rock(x, y, s)
    # three resting lionesses (static), well apart
    # check 2: the walking lions ended in front of the resting ones -> resting at x -0.19 / -0.04 / 0.16, walkers end between
    for i, (x, y, rz) in enumerate(((-0.15, 0.08, 25), (-0.02, 0.10, -15), (0.14, 0.08, 160))):
        E.place(f"{PROPS}/japan_lion_lying.glb", LYING_H * (1.0 - 0.04 * i), (x, y, FLOOR), rot_z=math.radians(rz))
    # two lions walk right -> left in front, apart from the start
    # check 1: lion 2 started off the picture and the foot fit gave 0 m/s (rig v1 missed a hind leg) -> re-rigged model,
    # clip speed from the bear (same Walk preset: 0.44 body heights per second), both lions inside the picture
    path = A.Path([(0.22, -0.04), (0.10, -0.035), (0.0, -0.03), (-0.12, -0.03), (-0.25, -0.04)])
    l1 = A.Animal("japan_lion_walk2", LION_H, fwd_fix=None, label="lion1", clip_speed_h=0.44)
    l2 = A.Animal("japan_lion_walk2", LION_H * 0.96, fwd_fix=None, label="lion2", clip_speed_h=0.44)
    l1.walk("walk", path, 0.0, T - HOLD, None, start_d=0.19, phase=0.0)       # ends near x -0.09
    l2.walk("walk", path, 0.0, T - HOLD, None, start_d=0.045, side=0.010, phase=0.45)   # ends near x 0.06
    l1.finish(); l2.finish()
    A.report([l1, l2], 0.0, T - HOLD)
    bus([(0.0, 0.50), (2.6, 0.05)], y=0.16, rot_z=math.radians(-90))   # check 4: drove sideways, front to the camera
    #                       # check 2: stopped half out of the picture
    aim = Vector((0.0, 0.04, FLOOR + 0.02))
    if CAMSUB == "S":
        cam_move(55, aim + Vector((0.0, -0.32, 0.0)), aim, aim + Vector((0.0, -0.32, 0.0)), aim)
    else:
        cam_move(30, aim + Vector((0.02, -0.38, 0.21)), aim, aim + Vector((0.0, -0.33, 0.18)), aim, t_end=T - HOLD)   # check 3: lens 40 cut the lions off
    print("DESK CAM JP1 %s" % CAMSUB, flush=True)

else:
    # paddock: dirt oval with a white fence, the ponies trot round inside it
    RX, RY, CY = 0.15, 0.075, 0.06
    E.cyl((0.0, CY, FLOOR + 0.0006), 1.0, 0.0012, E.felt("dirt", (0.66, 0.54, 0.38)), verts=64, name="paddock").scale = (RX + 0.02, RY + 0.02, 1)
    white = E.felt("fence", (0.95, 0.94, 0.90))
    for k in range(40):
        a = 2 * math.pi * k / 40
        E.cyl(((RX + 0.03) * math.cos(a), CY + (RY + 0.03) * math.sin(a), FLOOR + 0.008), 0.0012, 0.016, white, verts=8, name="post")
    ring = E.cyl((0.0, CY, FLOOR + 0.013), 1.0, 0.0018, white, verts=96, name="rail")
    ring.scale = (RX + 0.03, RY + 0.03, 1)
    inner = E.cyl((0.0, CY, FLOOR + 0.013), 1.0, 0.003, E.felt("dirt", (0.66, 0.54, 0.38)), verts=96, name="railHole")
    inner.scale = (RX + 0.028, RY + 0.028, 1)
    mod = ring.modifiers.new("hole", "BOOLEAN"); mod.object = inner; mod.operation = "DIFFERENCE"; inner.hide_render = True
    # small red barn and the bus far away
    E.box((-0.24, 0.24, FLOOR + 0.03), (0.08, 0.06, 0.06), E.felt("barn", (0.66, 0.18, 0.14)), "barn")
    E.box((-0.24, 0.24, FLOOR + 0.065), (0.09, 0.07, 0.012), E.felt("roof", (0.30, 0.22, 0.18)), "barnRoof")
    # teacher 11/25: at y 0.27 it hung over the edge of the grass board (front wheels in the air) and its nose hit the hills
    E.place(f"{PROPS}/japan_jungle_bus.glb", BUS_L * 0.7, (0.27, 0.20, FLOOR), rot_z=math.radians(195), axis="long")
    for x, y in ((0.30, 0.10), (-0.31, 0.05)): tree(x, y, 0.08)
    # six ponies round the loop, spread evenly, phases spread, a little speed difference
    loop = A.Path([(RX * math.cos(2 * math.pi * k / 16), CY + RY * math.sin(2 * math.pi * k / 16)) for k in range(16)], closed=True)
    ponies = []
    for i in range(6):
        # check 1: the gallery bay horse rig moved only 2 legs (speed 0). Three rigs tried; the white gallery horse has
        # 3 good legs + one front leg (bone_17) the Walk never moves -> fix_leg mirrors the other front leg onto it
        p = A.Animal("japan_whitehorse_walk", PONY_H * (1.0 - 0.03 * (i % 3)), fwd_fix=None, label="pony%d" % (i + 1),
                     clip_speed_h=0.44, fix_legs=[("bone_17", "0_Left_Limb_4")])
        v = p.cycle("walk")[1]
        p.walk("walk", loop, 0.0, T - HOLD, v * 1.7, start_d=loop.length * i / 6, phase=(i * 0.618) % 1.0)   # trot = walk x1.7
        p.finish(); ponies.append(p)
    A.report(ponies, 0.0, T - HOLD)
    kid = E.Char("japan_boy", (0.12, 0.19), -60, height=KID_H)        # check 5: still outside -> behind the fence (back right), facing the ponies and us
    #     # check 3: in front he hid a pony -> right of the fence, facing in
    kid.pose(0.0, E.P_stand()); kid.finish()
    if kid in E.CHARS: E.CHARS.remove(kid)
    aim = Vector((0.0, CY, FLOOR + 0.015))
    if CAMSUB == "S":
        cam_move(55, aim + Vector((0.0, -0.34, 0.0)), aim, aim + Vector((0.0, -0.34, 0.0)), aim)
    else:
        cam_move(36, aim + Vector((-0.03, -0.42, 0.21)), aim, aim + Vector((0.0, -0.37, 0.18)), aim, t_end=T - HOLD)   # check 3: 40 cut a pony
    print("DESK CAM JP2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
