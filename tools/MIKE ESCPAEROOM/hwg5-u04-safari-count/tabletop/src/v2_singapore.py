# Safari Count VERSION 2 - Singapore station, Mandai (tabletop style H, Blender on Colab only).
# Spec: rdq/RDQ-spec-safari-count-v2-20261127.md, allocation table v2/ (teacher-approved 11/27).
#   SV1 (7.0 s) "There are two pandas." River Wonders, Giant Panda Forest (day): two giant pandas sit among the bamboo
#       eating (static models, slow camera push-in); the Mandai tram rolls by behind. Last 1 s: still (counting).
#   SV2 (7.0 s) "There are four tigers." Night Safari: four Malayan tigers walk slowly along the trail under the
#       lanterns, one stops and looks around; the night tram waits on the road behind. Last 1 s: all four still, apart.
#   Check cameras: <SHOT>S low side.
# Models (v1): taiwan_panda (static), india_tiger_walk, singapore_night_tram. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"SV1": 7.0, "SV2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
PANDA_H = 0.048               # from TW1
TIGER_H = 0.052               # from IN1
TRAM_L = 0.24                 # from SG1
TRAM_YAW = 180.0
SPEED_H = 0.44


def bamboo(x, y, h, n=3):
    green = E.felt("bamboo", (0.36, 0.60, 0.22)); leaf = E.felt("bambooLeaf", (0.22, 0.48, 0.16))
    for i in range(n):
        dx = (i - (n - 1) / 2) * 0.006
        E.cyl((x + dx, y, FLOOR + h / 2), 0.0014, h, green, verts=8, name="bambooStalk")
        for k in range(4):
            a = math.radians(i * 70 + k * 90)
            E.box((x + dx + 0.004 * math.cos(a), y + 0.004 * math.sin(a), FLOOR + h * (0.6 + 0.1 * k)), (0.008, 0.002, 0.0006),
                  leaf, "bambooLeaf", bevel=0, rot=(0, math.radians(-30), a))


def rock(x, y, s):
    r = E.ball((x, y, FLOOR + s * 0.35), s, E.felt("rock", (0.36, 0.34, 0.30)), "rock")
    r.scale = (1.0, 0.8, 0.55); return r


def tram(t_keys, y):
    """check 1: E.constant on 2-3 keys made the tram stand still and then jump (the panda shot never showed it) ->
    one key every 1/12 s (stop-motion steps), linear between the given (t, x) points."""
    tr = E.place(f"{PROPS}/singapore_night_tram.glb", TRAM_L, (t_keys[0][1], y, FLOOR + ROAD_T), rot_z=math.radians(TRAM_YAW), axis="long")
    for k in range(int(T * 12) + 1):
        t = k / 12.0
        for (ta, xa), (tb, xb) in zip(t_keys, t_keys[1:]):
            if ta <= t <= tb: x = xa + (xb - xa) * (t - ta) / max(1e-6, tb - ta); break
        else: x = t_keys[-1][1]
        tr.location.x = x; tr.keyframe_insert("location", frame=E.f(t))
    E.constant(tr); return tr


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")

if SHOT == "SV1":
    # ---------- day, Giant Panda Forest ----------
    L_, Fl, R_ = E.lights(lamp=0.30)
    bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
    sun.data.energy = 1.5; sun.data.color = (1.0, 0.96, 0.88); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.50, 0.70, 0.86), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("forest_floor", (0.30, 0.42, 0.22)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.20, 0.36, 0.20)), "hill").scale = (1.0, 0.5, 0.8)
    E.box((0.0, 0.22, FLOOR + ROAD_T / 2), (0.70, 0.05, ROAD_T), E.felt("road", (0.40, 0.38, 0.34)), "road", bevel=0)
    tram([(0.0, -0.40), (T - HOLD, 0.40), (T, 0.40)], 0.22)
    E.cyl((-0.06, 0.06, FLOOR + 0.005), 0.05, 0.010, E.felt("platform", (0.50, 0.46, 0.40)), verts=40, name="platform1")
    E.cyl((0.07, 0.05, FLOOR + 0.005), 0.045, 0.010, E.felt("platform", (0.50, 0.46, 0.40)), verts=40, name="platform2")
    for x, y, s in ((-0.15, 0.10, 0.02), (0.15, 0.11, 0.018), (0.0, 0.13, 0.014)): rock(x, y, s)
    for x, y, h in ((-0.18, 0.15, 0.11), (-0.11, 0.17, 0.10), (0.11, 0.17, 0.12), (0.19, 0.12, 0.09), (0.0, 0.18, 0.10)): bamboo(x, y, h)
    E.place(f"{PROPS}/taiwan_panda.glb", PANDA_H, (-0.06, 0.06, FLOOR + 0.010), rot_z=math.radians(-25))
    E.place(f"{PROPS}/taiwan_panda.glb", PANDA_H * 0.94, (0.07, 0.05, FLOOR + 0.010), rot_z=math.radians(20))
    aim = Vector((0.0, 0.06, FLOOR + 0.03))
    if CAMSUB == "S":
        cam_move(45, aim + Vector((0.0, -0.30, 0.0)), aim, aim + Vector((0.0, -0.30, 0.0)), aim)
    else:
        cam_move(36, aim + Vector((0.02, -0.40, 0.11)), aim, aim + Vector((0.01, -0.29, 0.07)), aim, t_end=T - HOLD)
    print("DESK CAM SV1 %s" % CAMSUB, flush=True)

else:
    # ---------- night, Night Safari (as v1 SG1) ----------
    E.sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.006, 0.02, 1)
    E.sc.view_settings.exposure = -0.8
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("nightsky", (0.05, 0.07, 0.18), 0.9), "sky")
    E.ball((0.30, 0.84, 0.32), 0.035, E.emission("moon", (1.0, 0.97, 0.85), 6.0), "moon")
    E.board((0, 0.03), (0.70, 0.46), E.felt("night_grass", (0.16, 0.22, 0.15)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.16, 0.24, 0.16)), "hill").scale = (1.0, 0.5, 0.75)
    for x, y, h in ((-0.27, 0.30, 0.13), (0.22, 0.31, 0.12), (0.02, 0.33, 0.14)):
        E.cyl((x, y, FLOOR + h / 2), 0.006, h, E.felt("bark", (0.30, 0.24, 0.18)), verts=12, name="trunk")
        E.ball((x, y, FLOOR + h), 0.055, E.felt("leaves", (0.18, 0.32, 0.18)), "canopy").scale = (1.0, 0.7, 0.8)
    bpy.ops.object.light_add(type="AREA", location=(0.25, -0.20, 0.55)); moon = bpy.context.object
    moon.data.energy = 1.8; moon.data.color = (0.62, 0.72, 1.0); moon.data.size = 0.6; moon.rotation_euler = (math.radians(25), math.radians(15), 0)
    bpy.ops.object.light_add(type="AREA", location=(-0.4, -0.5, 0.3)); fill = bpy.context.object
    fill.data.energy = 0.5; fill.data.color = (0.5, 0.6, 1.0); fill.data.size = 0.6; fill.rotation_euler = (math.radians(60), 0, math.radians(-35))
    for x in (-0.24, -0.08, 0.08, 0.24):
        E.cyl((x, 0.245, FLOOR + 0.035), 0.0018, 0.07, E.mat("post", (0.12, 0.10, 0.08), 0.6), verts=8, name="post")
        E.ball((x, 0.245, FLOOR + 0.072), 0.006, E.emission("lantern", (1.0, 0.72, 0.35), 8.0), "lantern")
        bpy.ops.object.light_add(type="POINT", location=(x, 0.235, FLOOR + 0.072)); pl = bpy.context.object
        pl.data.energy = 0.35; pl.data.color = (1.0, 0.75, 0.45); pl.data.shadow_soft_size = 0.01
    E.box((0.0, 0.20, FLOOR + ROAD_T / 2), (0.70, 0.06, ROAD_T), E.felt("road", (0.26, 0.24, 0.22)), "road", bevel=0)
    tram([(0.0, -0.30), (T - HOLD, 0.05), (T, 0.05)], 0.20)
    # four tigers: two rows, left -> right, ending apart; tiger 3 stops early and looks around (check 1: the last one ended at the left edge)
    tigers = []
    for i, (xe, y, t0) in enumerate(((0.17, 0.0, 0.0), (0.07, 0.05, 0.3), (-0.03, -0.01, 0.1), (-0.12, 0.06, 0.5))):
        tg = A.Animal("india_tiger_walk", TIGER_H * (1.0 - 0.03 * (i % 3)), fwd_fix=None, label="tiger%d" % (i + 1), clip_speed_h=SPEED_H)
        v = 0.8 * tg.cycle("walk")[1]
        t1 = 3.6 if i == 2 else T - HOLD
        travel = v * (t1 - t0)
        tg.walk("walk", A.Path([(xe - travel - 0.05, y), (xe + 0.05, y)]), t0, t1, v, start_d=0.0, phase=(i * 0.37) % 1.0)
        if i == 2:
            tg.look([(t1 + 0.1, 0.0), (t1 + 0.7, 50.0), (t1 + 1.4, 50.0), (t1 + 2.0, -45.0), (t1 + 2.6, -45.0), (t1 + 3.2, 0.0)])
        tg.finish(); tigers.append(tg)
    A.report(tigers, 0.0, T - HOLD)
    aim = Vector((0.0, 0.05, FLOOR + 0.03))
    if CAMSUB == "S":
        cam_move(45, aim + Vector((0.0, -0.40, 0.0)), aim, aim + Vector((0.0, -0.40, 0.0)), aim)
    else:
        cam_move(30, aim + Vector((-0.02, -0.42, 0.15)), aim, aim + Vector((0.0, -0.37, 0.12)), aim, t_end=T - HOLD)
    print("DESK CAM SV2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
