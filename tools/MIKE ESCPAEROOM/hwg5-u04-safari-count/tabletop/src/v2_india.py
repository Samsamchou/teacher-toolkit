# Safari Count VERSION 2 - India station, Ranthambore (tabletop style H, Blender on Colab only).
# Spec: rdq/RDQ-spec-safari-count-v2-20261127.md, allocation table v2/ (teacher-approved 11/27).
#   IV1 (7.0 s) "There are seven turtles." Padam Talao lake: four soft-shell turtles bask on the rocks by the water,
#       three crawl down the bank into the shallow lake; the jeep waits on the track. Last 1 s: all seven still, apart.
#   IV2 (7.0 s) "There is one bear." A sloth bear walks out between the dry bushes, stops and sniffs left and right;
#       the jeep waits further back. Last 1 s: it holds still.
#   Check cameras: <SHOT>S low side.
# Models (v1): singapore_turtle_walk (LEGFIX from SG2), taiwan_blackbear_v (black bear with the painted white V: sloth
#   bears have the same chest mark), kenya_jeep. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"IV1": 7.0, "IV2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
TURT_H = 0.022                # from SG2
BEAR_H = 0.050                # from TW2
JEEP_L = 0.10
SPEED_H = 0.44
LEGFIX = {"singapore_turtle_walk": [("0_Right_Limb_3", "0_Left_Limb_4")]}   # from SG2 (v1 model, no longer used here)
# 11/28 teacher: the v1 turtle legs looked odd (body faster than the steps, legs splayed) -> new model, legs under the shell,
# crawling at its own step speed. walk_dir_check says BACKWARDS only because the shell is the highest point: the head end
# (-x, raised) is the walking end -> no reverse_clip (check the close-up).
TURTLE = "india_turtle_walk"


def ground(col):
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.55, 0.70, 0.88), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("forest_floor", col), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.30, 0.42, 0.22)), "hill").scale = (1.0, 0.5, 0.75)


def jeep(loc, rot_z):
    return E.place(f"{PROPS}/kenya_jeep.glb", JEEP_L, (loc[0], loc[1], FLOOR + ROAD_T), rot_z=rot_z, axis="long")


def tree(x, y, h):
    E.cyl((x, y, FLOOR + h / 2), 0.006, h, E.felt("bark", (0.36, 0.27, 0.20)), verts=12, name="trunk")
    E.ball((x, y, FLOOR + h), 0.05, E.felt("leaves", (0.30, 0.44, 0.20)), "canopy").scale = (1.0, 0.7, 0.8)


def tall_grass(x0, x1, y0, y1, h, n, seed=3):
    """Dry tall grass (thin leaning cones), from v1 IN1. check 1: round bushes looked like eggs."""
    import random
    rnd = random.Random(seed)
    mats = [E.felt("grass_a", (0.55, 0.47, 0.20)), E.felt("grass_b", (0.42, 0.44, 0.17)), E.felt("grass_c", (0.62, 0.50, 0.24))]   # 11/28 darker
    for i in range(n):
        x = rnd.uniform(x0, x1); y = rnd.uniform(y0, y1); hh = h * rnd.uniform(0.7, 1.15)
        c = E.cone((x, y, FLOOR + hh / 2), 0.0016, 0.0002, hh, mats[i % 3], verts=5, name="grass")
        c.rotation_euler = (rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), 0)


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.84); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

if SHOT == "IV1":
    E.sc.view_settings.exposure = -0.4                       # SG2 check 2: river banks looked pale
    ground((0.40, 0.32, 0.20))
    # Padam Talao: shallow lake on the right (thin glossy layer on the board), rocks on the bank, jeep on the track behind
    E.box((0.225, 0.03, FLOOR + 0.002), (0.25, 0.46, 0.004), E.mat("lake", (0.10, 0.26, 0.24), 0.08), "lake", bevel=0)
    E.box((-0.10, 0.22, FLOOR + ROAD_T / 2), (0.50, 0.05, ROAD_T), E.felt("track", (0.60, 0.46, 0.32)), "track", bevel=0)
    jeep((-0.18, 0.22), math.radians(0))
    for x, y in ((-0.30, 0.30), (0.02, 0.31)): tree(x, y, 0.12)
    rockm = E.felt("rock", (0.30, 0.27, 0.24))
    ROCKS = [(-0.13, 0.04, 0.065, 0.30), (-0.03, 0.11, 0.050, 0.30), (-0.08, -0.08, 0.042, 0.30)]
    for x, y, r, fl in ROCKS:
        E.ball((x, y, FLOOR), r, rockm, "rock").scale = (1.0, 0.8, fl)
    def top(i, x, y):
        rx, ry, r, fl = ROCKS[i]
        q = 1.0 - ((x - rx) / r) ** 2 - ((y - ry) / (0.8 * r)) ** 2
        return FLOOR + fl * r * math.sqrt(max(0.0, q))
    M = TURTLE; kw = dict(clip_speed_h=SPEED_H)
    bask = []                                                # four still turtles on the rocks (x, y, rock, face)
    for x, y, ri, face in ((-0.155, 0.03, 0, 200), (-0.105, 0.055, 0, 150), (-0.03, 0.115, 1, 190), (-0.08, -0.08, 2, 210)):
        tt = A.Animal(M, TURT_H, fwd_fix=None, label="bask%d" % (len(bask) + 1), **kw)
        tt.cycle("walk")
        tt.ch.at(0.0, loc=(x, y, top(ri, x, y) - 0.002), face_deg=face + tt.facing_fix())
        tt.finish(); bask.append(tt)
    crawl = []                                               # three crawl down the bank into the lake
    for i, (y, x1, t0) in enumerate(((-0.04, 0.125, 0.0), (0.04, 0.135, 0.6), (0.13, 0.115, 1.2))):
        tt = A.Animal(M, TURT_H, fwd_fix=None, label="crawl%d" % (i + 1), **kw)
        v = tt.cycle("walk")[1]                                 # 11/28: the clip's own speed, so the feet do not slide
        x0 = x1 - v * (T - HOLD - t0)
        tt.walk("walk", A.Path([(x0 - 0.01, y), (x1 + 0.01, y)]), t0, T - HOLD, None, start_d=0.01, phase=i * 0.3)
        tt.finish(); crawl.append(tt)
    A.report(bask + crawl, 0.0, T - HOLD)
    aim = Vector((0.0, 0.03, FLOOR + 0.012))
    if CAMSUB == "S":
        cam_move(40, aim + Vector((0.0, -0.20, 0.01)), aim, aim + Vector((0.0, -0.20, 0.01)), aim)
    elif CAMSUB == "C":                                      # close-up of a crawling turtle's legs (11/28)
        c = Vector((0.10, -0.04, FLOOR + 0.008))
        cam_move(60, c + Vector((0.0, -0.14, 0.03)), c, c + Vector((0.0, -0.14, 0.03)), c)
    else:
        cam_move(32, aim + Vector((-0.03, -0.38, 0.21)), aim, aim + Vector((-0.01, -0.34, 0.19)), aim, t_end=T - HOLD)
    print("DESK CAM IV1 %s" % CAMSUB, flush=True)

else:
    E.sc.view_settings.exposure = -0.7                       # check 2 / 11/28: -0.5 was only 10 % darker, still white
    ground((0.42, 0.37, 0.22))
    E.box((0.18, 0.10, FLOOR + ROAD_T / 2), (0.08, 0.40, ROAD_T), E.felt("road", (0.60, 0.46, 0.32)), "road", bevel=0)
    jeep((0.18, 0.18), math.radians(180))
    for x, y in ((-0.26, 0.26), (0.02, 0.30)): tree(x, y, 0.12)
    tall_grass(-0.32, 0.10, 0.10, 0.24, 0.040, 380)         # the bear comes out of the grass
    tall_grass(-0.32, -0.20, -0.14, 0.06, 0.032, 70, seed=7)
    tall_grass(0.06, 0.13, -0.14, -0.04, 0.030, 50, seed=9)
    b = A.Animal("taiwan_blackbear_v", BEAR_H, fwd_fix=None, label="bear")
    path = A.Path([(-0.14, 0.12), (-0.10, 0.06), (-0.05, 0.02), (0.02, 0.0)])   # out of the tall grass toward the front
    STOP = 3.6
    b.walk("walk", path, 0.0, STOP, None, start_d=0.0, phase=0.0)
    b.look([(STOP + 0.1, 0.0), (STOP + 0.7, 45.0), (STOP + 1.4, 45.0), (STOP + 2.1, -40.0), (STOP + 2.6, -40.0), (STOP + 3.2, 0.0)])
    b.finish()
    A.report([b], 0.0, STOP)
    aim = Vector((-0.05, 0.03, FLOOR + 0.025))
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.32, 0.0)), aim, aim + Vector((0.0, -0.32, 0.0)), aim)
    else:
        cam_move(36, aim + Vector((0.03, -0.36, 0.14)), aim, aim + Vector((0.02, -0.29, 0.11)), aim, t_end=T - HOLD)
    print("DESK CAM IV2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
