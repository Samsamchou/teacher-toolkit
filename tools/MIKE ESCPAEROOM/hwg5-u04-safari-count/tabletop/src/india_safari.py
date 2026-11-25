# Safari Count - India station (tabletop style H, Blender on Colab only). Action table row 7-8 (12段動作表_v1_20261124.md).
#   IN1 (7.0 s) "There are two tigers." Two Bengal tigers walk out of the tall grass toward the camera (diagonal);
#       one stops and looks around (head left / right). An open safari jeep waits on the side road. Last 1 s: both in view.
#   IN2 (7.0 s) "There are seven monkeys." Gray langurs on two trees: 4 sit on branches the whole time, 3 jump across the
#       gap from one tree to the other at different times (sit -> leap -> sit). The jeep is parked under the trees.
#       Last 3 s: all seven sit apart on the branches (counting).
#   Check cameras: <SHOT>S low side.
# Models: india_tiger_walk (Codex side-view ref -> Tripo Image to Model + quadruped rig + Walk; gltf_fk + walk_dir_check),
#   india_langur_sit, india_langur_leap (static Tripo models, no rig: Tripo AI Animation is humanoid-only),
#   kenya_jeep (gallery, reused). Numbers marked GUESS: check frames. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"IN1": 7.0, "IN2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
TIGER_H = 0.052               # GUESS
SIT_H = 0.065                 # sitting langur incl. the hanging tail (body ~43 % = 2.8 cm)
SIT_SEAT = 0.57               # seat height / model height (mesh: the body starts at 0.55-0.60 of the height)
SIT_YAW = 60.0                # mesh: the face points -x (3/4 view) -> turn toward the camera (GUESS)
LEAP_L = 0.085                # leaping langur hands -> tail (long axis)
LEAP_YAW = 180.0              # mesh: the hands / head point -x, the tail curls up at +x -> 180 faces +x
JEEP_L = 0.10
SPEED_H = 0.44
LEGFIX = {}                   # {"india_tiger_walk": [("broken_leaf", "good_leaf")]} after gltf_fk.py
REVERSE = {}                  # {"india_tiger_walk": True} if walk_dir_check.py says BACKWARDS


def ground():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.55, 0.70, 0.88), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("forest_floor", (0.52, 0.50, 0.30)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.30, 0.42, 0.22)), "hill").scale = (1.0, 0.5, 0.75)


def jeep(loc, rot_z):
    return E.place(f"{PROPS}/kenya_jeep.glb", JEEP_L, (loc[0], loc[1], FLOOR + ROAD_T), rot_z=rot_z, axis="long")


def tall_grass(x0, x1, y0, y1, h, n, seed=3):
    """Tall grass band: thin leaning cones (the tigers come out of it)."""
    import random
    rnd = random.Random(seed)
    mats = [E.felt("grass_a", (0.62, 0.58, 0.28)), E.felt("grass_b", (0.48, 0.52, 0.22)), E.felt("grass_c", (0.70, 0.62, 0.34))]
    for i in range(n):
        x = rnd.uniform(x0, x1); y = rnd.uniform(y0, y1); hh = h * rnd.uniform(0.7, 1.15)
        c = E.cone((x, y, FLOOR + hh / 2), 0.0016, 0.0002, hh, mats[i % 3], verts=5, name="grass")
        c.rotation_euler = (rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), 0)


def tree(x, y, h, branches, side):
    """Trunk at x; branches = [(z, length)], pointing toward `side` (+1 right, -1 left). Returns branch tops [(z_top, x0, x1)]."""
    bark = E.felt("bark", (0.36, 0.27, 0.20))
    E.cyl((x, y, FLOOR + h / 2), 0.009, h, bark, verts=14, name="trunk")
    tops = []
    for z, ln in branches:
        r = 0.0045
        E.cyl((x + side * ln / 2, y, FLOOR + z), r, ln, bark, rot=(0, math.radians(90), 0), verts=10, name="branch")
        tops.append((FLOOR + z + r, x, x + side * ln))
    leaf = E.felt("leaves", (0.26, 0.44, 0.20))
    for z, ln in branches:                                    # check 1: looked like a shelf -> leaves BEHIND the branches
        for k in range(3):
            u = 0.35 + 0.3 * k
            E.ball((x + side * ln * u, y + 0.028, FLOOR + z + 0.012), 0.016, leaf, "leafclump").scale = (1.3, 0.6, 0.8)
    for k, (dx, dz, rr) in enumerate(((0.0, 0.0, 0.055), (side * 0.04, -0.01, 0.045), (-side * 0.035, -0.005, 0.04))):
        E.ball((x + dx, y + 0.03, FLOOR + h + dz), rr, leaf, "canopy").scale = (1.0, 0.6, 0.7)
    return tops


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


ground()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.8; sun.data.color = (1.0, 0.95, 0.84); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

if SHOT == "IN1":
    E.box((0.17, 0.03, FLOOR + ROAD_T / 2), (0.08, 0.46, ROAD_T), E.felt("road", (0.60, 0.46, 0.32)), "road", bevel=0)
    jeep((0.17, 0.02), math.radians(180))                    # nose toward the grass, waiting (check 1: out of the picture)
    tall_grass(-0.32, 0.12, 0.12, 0.25, 0.045, 480)
    tall_grass(-0.32, -0.16, -0.12, 0.12, 0.035, 60, seed=5)   # a few clumps at the sides (not on the tigers' way)
    for x, y in ((-0.22, 0.30), (0.10, 0.31)):
        E.cyl((x, y, FLOOR + 0.06), 0.006, 0.12, E.felt("bark", (0.36, 0.27, 0.20)), verts=12, name="trunk")
        E.ball((x, y, FLOOR + 0.13), 0.05, E.felt("leaves", (0.26, 0.44, 0.20)), "canopy").scale = (1.0, 0.7, 0.8)
    kw = dict(clip_speed_h=SPEED_H, fix_legs=LEGFIX.get("india_tiger_walk", ()), reverse_clip=REVERSE.get("india_tiger_walk", False))
    t1 = A.Animal("india_tiger_walk", TIGER_H, fwd_fix=None, label="tiger1", **kw)
    t2 = A.Animal("india_tiger_walk", TIGER_H * 0.95, fwd_fix=None, label="tiger2", **kw)
    p1 = A.Path([(-0.12, 0.21), (-0.07, 0.12), (-0.03, 0.02)])
    p2 = A.Path([(0.05, 0.22), (0.07, 0.15), (0.09, 0.08)])
    t1.walk("walk", p1, 0.0, T - HOLD, None, start_d=0.0, phase=0.0)
    v2 = t2.cycle("walk")[1]
    STOP = 3.2                                                 # tiger 2 stops and looks around
    t2.walk("walk", p2, 0.4, STOP, None, start_d=0.0, phase=0.45)
    t2.look([(STOP + 0.1, 0.0), (STOP + 0.7, 55.0), (STOP + 1.5, 55.0), (STOP + 2.3, -55.0), (STOP + 3.0, -55.0), (STOP + 3.6, 0.0)])
    t1.finish(); t2.finish()
    A.report([t1, t2], 0.0, T - HOLD)
    aim = Vector((0.0, 0.10, FLOOR + 0.025))
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.36, 0.0)), aim, aim + Vector((0.0, -0.36, 0.0)), aim)
    else:
        cam_move(36, aim + Vector((0.03, -0.40, 0.15)), aim + Vector((0.02, 0, 0)), aim + Vector((0.02, -0.33, 0.12)), aim + Vector((0.02, -0.03, 0)), t_end=T - HOLD)   # check 1: tigers small, jeep cut off
    print("DESK CAM IN1 %s" % CAMSUB, flush=True)

else:
    E.box((0.0, -0.03, FLOOR + ROAD_T / 2), (0.70, 0.07, ROAD_T), E.felt("road", (0.60, 0.46, 0.32)), "road", bevel=0)
    jeep((0.02, -0.03), math.radians(-90))                   # parked under the trees (check 1: cut off at the corner)
    TY = 0.10
    Ltops = tree(-0.14, TY, 0.21, [(0.07, 0.12), (0.13, 0.11), (0.19, 0.10)], +1)
    Rtops = tree(0.14, TY, 0.21, [(0.10, 0.12), (0.16, 0.11)], -1)
    L07, L13, L19 = (t[0] for t in Ltops); R10, R16 = (t[0] for t in Rtops)
    S = lambda x, z: (x, TY, z)                              # a seat on a branch

    def sitter(seat, label, t_on=None, t_off=None, yaw=0.0):
        z = seat[2] - SIT_SEAT * SIT_H
        r = E.place(f"{PROPS}/india_langur_sit.glb", SIT_H, (seat[0], seat[1] - 0.002, z), rot_z=math.radians(SIT_YAW + yaw))
        r.name = label
        if t_on is not None or t_off is not None: E.show_between([r], t_on, t_off)
        print("DESK MONKEY %s seat %.3f %.3f %.3f on %s off %s" % (label, seat[0], seat[1], seat[2], t_on, t_off), flush=True)
        return r

    def jumper(a, b, t0, t1, label, apex=0.035):
        """Sit at seat a until t0, leap along an arc (static leap model), sit at seat b from t1."""
        right = b[0] > a[0]
        sitter(a, label + "_a", None, t0, yaw=-25 if right else 25)
        sitter(b, label + "_b", t1, None, yaw=25 if right else -25)
        lp = E.place(f"{PROPS}/india_langur_leap.glb", LEAP_L, a, rot_z=0.0, axis="long"); lp.name = label + "_leap"
        E.show_between([lp], t0, t1)
        fr0, fr1 = E.f(t0), E.f(t1)
        for fr in range(fr0 - 1, fr1 + 2):
            u = min(1.0, max(0.0, (fr - fr0) / max(1, fr1 - fr0)))
            x = a[0] + (b[0] - a[0]) * u
            y = a[1] - 0.012 * math.sin(math.pi * u)
            zb = a[2] + (b[2] - a[2]) * u + apex * 4 * u * (1 - u)
            dz = (b[2] - a[2]) + apex * 4 * (1 - 2 * u)        # slope of the arc
            pitch = math.atan2(dz, abs(b[0] - a[0]))
            lp.location = (x, y, zb - 0.010)                  # the body (not the paws) follows the arc
            lp.rotation_euler = (0.0, 0.6 * pitch, math.radians(LEAP_YAW + (0 if right else 180)))   # +y rot lifts the head (-x end)
            lp.keyframe_insert("location", frame=fr); lp.keyframe_insert("rotation_euler", frame=fr)
        E.constant(lp)
        print("DESK JUMP %s %.1f-%.1f s from %.3f,%.3f to %.3f,%.3f" % (label, t0, t1, a[0], a[2], b[0], b[2]), flush=True)

    # the four that sit all the time
    sitter(S(-0.09, L07), "sit1"); sitter(S(-0.07, L13), "sit2"); sitter(S(0.09, R10), "sit3"); sitter(S(0.06, R16), "sit4")
    # the three that jump across the gap (staggered); their landing seats complete the seven
    jumper(S(0.03, R16), S(-0.04, L07), 0.9, 1.6, "jump1")
    jumper(S(-0.03, L13), S(0.045, R10), 2.1, 2.8, "jump2")
    jumper(S(0.10, R16), S(-0.06, L19), 3.3, 4.0, "jump3", apex=0.045)
    aim = Vector((0.0, TY - 0.02, FLOOR + 0.105))
    if CAMSUB == "S":
        cam_move(40, aim + Vector((0.0, -0.40, -0.04)), aim, aim + Vector((0.0, -0.40, -0.04)), aim)
    else:
        cam_move(30, aim + Vector((0.03, -0.46, 0.02)), aim, aim + Vector((0.0, -0.42, 0.0)), aim, t_end=T - HOLD)
    print("DESK CAM IN2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
