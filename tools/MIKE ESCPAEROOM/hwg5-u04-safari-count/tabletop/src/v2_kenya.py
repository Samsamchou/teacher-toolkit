# Safari Count VERSION 2 - Kenya station, Nairobi National Park (tabletop style H, Blender on Colab only).
# Spec: rdq/RDQ-spec-safari-count-v2-20261127.md, allocation table v2/ (teacher-approved 11/27).
#   KV1 (7.0 s) "There are six lions." A pride: three lionesses rest under the acacias, three lions walk slowly across
#       the front, left -> right; the jeep waits on the road. Last 1 s: all six still, apart, in view.
#   KV2 (7.0 s) "There are nine monkeys." A troop of nine olive baboons walks across the red dirt road in two loose rows,
#       left -> right; the jeep has stopped. Last 1 s: all nine still, apart, in view.
#   Check cameras: <SHOT>S low side.
# Models: japan_lion_walk2, japan_lion_lying (v1), kenya_baboon_walk (new 11/27: Codex side view -> Tripo H3.1 + Rig Other
#   + Walk; gltf_fk 4 feet move, walk_dir ok), kenya_jeep. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"KV1": 7.0, "KV2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
LION_H = 0.046                # from JP1
LYING_H = 0.030               # from JP1
BABOON_H = 0.040              # check 1: 0.034 looked tiny
JEEP_L = 0.10
SPEED_H = 0.44


def ground():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.46, 0.66, 0.90), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("savanna", (0.64, 0.56, 0.30)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.015), 0.07, E.felt("hill", (0.42, 0.46, 0.24)), "hill").scale = (1.0, 0.5, 0.6)


def acacia(x, y, h):
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


def line_walk(model, h, ends, y_of, t0s, label):
    """Each animal walks straight left -> right and stops with its nose at ends[i] (x) on row y_of(i)."""
    out = []
    for i, xe in enumerate(ends):
        a = A.Animal(model, h * (1.0 - 0.04 * (i % 3)), fwd_fix=None, label="%s%d" % (label, i + 1), clip_speed_h=SPEED_H)
        v = a.cycle("walk")[1]; y = y_of(i)
        t0 = t0s[i] if t0s else 0.0
        travel = v * (T - HOLD - t0)
        a.walk("walk", A.Path([(xe - travel - 0.05, y), (xe + 0.05, y)]), t0, T - HOLD, None, start_d=0.0, phase=(i * 0.618) % 1.0)
        a.finish(); out.append(a)
    return out


ground()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.8; sun.data.color = (1.0, 0.93, 0.80); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

if SHOT == "KV1":
    E.box((0.0, 0.20, FLOOR + ROAD_T / 2), (0.70, 0.06, ROAD_T), E.felt("road", (0.62, 0.40, 0.26)), "road", bevel=0)
    jeep((0.20, 0.20), math.radians(-90))
    for x, y, h in ((-0.20, 0.13, 0.11), (0.06, 0.15, 0.10)): acacia(x, y, h)
    for x, y, s in ((-0.27, -0.10, 0.012), (0.26, -0.08, 0.011)): bush(x, y, s)
    # three lionesses resting in the shade, well apart (behind the walkers' line)
    for i, (x, y, rz) in enumerate(((-0.17, 0.09, 25), (-0.03, 0.11, -20), (0.10, 0.09, 160))):
        E.place(f"{PROPS}/japan_lion_lying.glb", LYING_H * (1.0 - 0.04 * i), (x, y, FLOOR), rot_z=math.radians(rz))
    walkers = line_walk("japan_lion_walk2", LION_H, [-0.10, 0.04, 0.18], lambda i: -0.04 + 0.012 * (i % 2), [0.0, 0.3, 0.6], "lion")
    A.report(walkers, 0.0, T - HOLD)
    aim = Vector((0.0, 0.04, FLOOR + 0.02))
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.32, 0.0)), aim, aim + Vector((0.0, -0.32, 0.0)), aim)
    else:
        cam_move(28, aim + Vector((0.02, -0.40, 0.21)), aim, aim + Vector((0.0, -0.35, 0.18)), aim, t_end=T - HOLD)
    print("DESK CAM KV1 %s" % CAMSUB, flush=True)

else:
    # red-brown dirt road running away from the camera; the troop crosses it along x
    E.box((0.04, 0.03, FLOOR + ROAD_T / 2), (0.10, 0.46, ROAD_T), E.felt("road", (0.62, 0.40, 0.26)), "road", bevel=0)
    for x, y, h in ((-0.27, 0.22, 0.10), (0.25, 0.24, 0.09)): acacia(x, y, h)
    for x, y, s in ((-0.24, -0.11, 0.012), (0.25, -0.08, 0.010)): bush(x, y, s)
    jeep((0.04, 0.19), math.radians(0))                      # check 1: big in the foreground -> waits behind the troop
    ends = [-0.14, -0.10, -0.06, -0.02, 0.02, 0.06, 0.10, 0.14, 0.18]   # check 1-2: the first one ended at the left edge
    troop = line_walk("kenya_baboon_walk", BABOON_H, ends, lambda i: 0.06 if i % 2 else 0.015, [0.0, 0.2, 0.1, 0.4, 0.3, 0.5, 0.2, 0.6, 0.4], "baboon")
    A.report(troop, 0.0, T - HOLD)
    aim = Vector((0.015, 0.035, FLOOR + 0.015))
    if CAMSUB == "S":
        cam_move(45, aim + Vector((0.0, -0.32, 0.0)), aim, aim + Vector((0.0, -0.32, 0.0)), aim)
    else:
        cam_move(30, aim + Vector((0.02, -0.38, 0.20)), aim, aim + Vector((0.01, -0.33, 0.17)), aim, t_end=T - HOLD)
    print("DESK CAM KV2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
