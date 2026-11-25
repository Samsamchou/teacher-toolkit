# Safari Count - Singapore station (tabletop style H, Blender on Colab only). Action table rows 9-10.
#   SG1 (7.0 s) "There are four elephants." Night Safari: three adult Asian elephants and one calf walk slowly in a
#       line (the calf right behind its mother); the open-air night tram drives slowly along the back road the same
#       way. Moonlight + warm lanterns. Last 1 s: all four stop, apart, in view.
#   SG2 (7.0 s) "There are nine turtles." River Wonders: six turtles sun themselves on rocks by the river (still);
#       three crawl slowly down the bank into the shallow water (still visible). A wooden boardwalk in front.
#   Check cameras: <SHOT>S low side.
# Models: singapore_elephant_walk, singapore_turtle_walk (Codex side-view refs -> Tripo Image to Model + quadruped rig
#   + Walk; gltf_fk + walk_dir_check), singapore_night_tram (static). Calf = the elephant model at half size.
# Numbers marked GUESS: check frames. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"SG1": 7.0, "SG2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
ELE_H = 0.066                 # adult elephant height (GUESS)
CALF_K = 0.50                 # calf size / adult
TURT_H = 0.022                # turtle height (check 1: 0.016 too small to count)
TRAM_L = 0.24                 # tractor + 2 carriages, nose to tail (GUESS)
TRAM_YAW = 180.0              # mesh: long axis x, tractor at -x (ref drawn facing left) -> 180 drives +x
SPEED_H = 0.44
LEGFIX = {"singapore_turtle_walk": [("0_Right_Limb_3", "0_Left_Limb_4")]}   # gltf_fk: far front leg raised (ref pose)
REVERSE = {}                  # after walk_dir_check.py


def kw(model):
    return dict(clip_speed_h=SPEED_H, fix_legs=LEGFIX.get(model, ()), reverse_clip=REVERSE.get(model, False))


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")

if SHOT == "SG1":
    # ---------- night ----------
    E.sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.006, 0.02, 1)
    E.sc.view_settings.exposure = -0.8                       # check 1: looked like daytime
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("nightsky", (0.05, 0.07, 0.18), 0.9), "sky")
    E.ball((0.30, 0.84, 0.32), 0.035, E.emission("moon", (1.0, 0.97, 0.85), 6.0), "moon")
    E.board((0, 0.03), (0.70, 0.46), E.felt("night_grass", (0.16, 0.22, 0.15)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.16, 0.24, 0.16)), "hill").scale = (1.0, 0.5, 0.75)
    for x, y, h in ((-0.27, 0.30, 0.13), (0.22, 0.31, 0.12), (0.02, 0.33, 0.14)):          # rainforest trees far back
        E.cyl((x, y, FLOOR + h / 2), 0.006, h, E.felt("bark", (0.30, 0.24, 0.18)), verts=12, name="trunk")
        E.ball((x, y, FLOOR + h), 0.055, E.felt("leaves", (0.18, 0.32, 0.18)), "canopy").scale = (1.0, 0.7, 0.8)
    # moonlight (cool key) + dim fill; warm lanterns on posts along the tram road
    bpy.ops.object.light_add(type="AREA", location=(0.25, -0.20, 0.55)); moon = bpy.context.object
    moon.data.energy = 1.6; moon.data.color = (0.62, 0.72, 1.0); moon.data.size = 0.6; moon.rotation_euler = (math.radians(25), math.radians(15), 0)
    bpy.ops.object.light_add(type="AREA", location=(-0.4, -0.5, 0.3)); fill = bpy.context.object
    fill.data.energy = 0.4; fill.data.color = (0.5, 0.6, 1.0); fill.data.size = 0.6; fill.rotation_euler = (math.radians(60), 0, math.radians(-35))
    for x in (-0.24, -0.08, 0.08, 0.24):
        E.cyl((x, 0.245, FLOOR + 0.035), 0.0018, 0.07, E.mat("post", (0.12, 0.10, 0.08), 0.6), verts=8, name="post")
        E.ball((x, 0.245, FLOOR + 0.072), 0.006, E.emission("lantern", (1.0, 0.72, 0.35), 8.0), "lantern")
        bpy.ops.object.light_add(type="POINT", location=(x, 0.235, FLOOR + 0.072)); pl = bpy.context.object
        pl.data.energy = 0.35; pl.data.color = (1.0, 0.75, 0.45); pl.data.shadow_soft_size = 0.01
    # the tram road (back) and the elephants' trail (front)
    E.box((0.0, 0.20, FLOOR + ROAD_T / 2), (0.70, 0.06, ROAD_T), E.felt("road", (0.26, 0.24, 0.22)), "road", bevel=0)
    tram = E.place(f"{PROPS}/singapore_night_tram.glb", TRAM_L, (0, 0.20, FLOOR + ROAD_T), rot_z=math.radians(TRAM_YAW), axis="long")
    for t, x in ((0.0, -0.30), (T - HOLD, 0.02), (T, 0.02)):
        tram.location.x = x; tram.keyframe_insert("location", frame=E.f(t))
    E.constant(tram)
    # three adults + calf in a line, left -> right, slowly (0.7 x the clip's own pace)
    ad = A.Animal("singapore_elephant_walk", ELE_H, fwd_fix=None, label="elephant1", **kw("singapore_elephant_walk"))
    v_ad = ad.cycle("walk")[1]; body = 0.7 * v_ad
    path = A.Path([(-0.60, 0.03), (0.60, 0.03)])
    travel = body * (T - HOLD)
    ends = [0.14, 0.03, -0.08]                               # nose positions at the end (check 1: the leader was cut at the right edge)
    herd = [ad] + [A.Animal("singapore_elephant_walk", ELE_H * k, fwd_fix=None, label="elephant%d" % (i + 2), **kw("singapore_elephant_walk"))
                   for i, k in enumerate((0.95, 0.92))]
    for i, (e, xe) in enumerate(zip(herd, ends)):
        e.walk("walk", path, 0.0, T - HOLD, body, start_d=0.60 + xe - travel, phase=(i * 0.37) % 1.0)
    calf = A.Animal("singapore_elephant_walk", ELE_H * CALF_K, fwd_fix=None, label="calf", **kw("singapore_elephant_walk"))
    calf.walk("walk", path, 0.0, T - HOLD, body, start_d=0.60 + ends[2] - 0.075 - travel, phase=0.6)   # right behind mum
    for e in herd + [calf]: e.finish()
    A.report(herd + [calf], 0.0, T - HOLD)
    aim = Vector((0.0, 0.08, FLOOR + 0.035))
    if CAMSUB == "S":
        cam_move(45, aim + Vector((0.0, -0.40, 0.0)), aim, aim + Vector((0.0, -0.40, 0.0)), aim)
    else:
        cam_move(30, aim + Vector((-0.02, -0.42, 0.15)), aim, aim + Vector((0.0, -0.37, 0.12)), aim, t_end=T - HOLD)
    print("DESK CAM SG1 %s" % CAMSUB, flush=True)

else:
    # ---------- day, river bank ----------
    L_, Fl, R_ = E.lights(lamp=0.30)
    bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
    E.sc.view_settings.exposure = -0.4                       # check 2: still pale
    sun.data.energy = 1.3; sun.data.color = (1.0, 0.95, 0.84); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.50, 0.70, 0.92), 0.9), "sky")
    WX = 0.10                                                # the river starts at x = WX
    E.board((0, 0.03), (0.70, 0.46), E.felt("bank", (0.36, 0.26, 0.15)), "bank", thick=FLOOR)
    # shallow river: a thin glossy layer ON the board (turtles keep walking on the board, 4 mm of them under water)
    E.box((0.225, 0.03, FLOOR + 0.002), (0.25, 0.46, 0.004), E.mat("water", (0.06, 0.24, 0.30), 0.08), "water", bevel=0)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.28, 0.44, 0.24)), "hill").scale = (1.0, 0.5, 0.75)
    rockm = E.felt("rock", (0.25, 0.24, 0.23))                # check 1-2: banks / rocks looked white
    ROCKS = [(-0.13, 0.03, 0.068, 0.30), (-0.02, 0.12, 0.052, 0.30), (-0.06, -0.08, 0.042, 0.30)]   # x, y, r, flat (bigger turtles)
    for x, y, r, fl in ROCKS:
        E.ball((x, y, FLOOR), r, rockm, "rock").scale = (1.0, 0.8, fl)
    def top(i, x, y):
        """Height of rock i's surface at (x, y) (ellipsoid scaled 1 : 0.8 : flat): turtles sit ON it, not floating."""
        rx, ry, r, fl = ROCKS[i]
        q = 1.0 - ((x - rx) / r) ** 2 - ((y - ry) / (0.8 * r)) ** 2
        return FLOOR + fl * r * math.sqrt(max(0.0, q))
    for x, y, h in ((-0.30, 0.22, 0.10), (-0.20, 0.27, 0.12)):
        E.cyl((x, y, FLOOR + h / 2), 0.006, h, E.felt("bark", (0.36, 0.27, 0.20)), verts=12, name="trunk")
        E.ball((x, y, FLOOR + h), 0.05, E.felt("leaves", (0.24, 0.46, 0.22)), "canopy").scale = (1.0, 0.7, 0.8)
    # boardwalk with a railing in front (River Wonders)
    plank = E.felt("plank", (0.55, 0.38, 0.24))
    E.box((0.0, -0.19, FLOOR + 0.004), (0.70, 0.05, 0.008), plank, "boardwalk")
    for x in [i * 0.07 - 0.35 for i in range(11)]:
        E.cyl((x, -0.167, FLOOR + 0.02), 0.0016, 0.025, plank, verts=8, name="rail_post")
    E.cyl((0.0, -0.167, FLOOR + 0.032), 0.0016, 0.70, plank, rot=(0, math.radians(90), 0), verts=8, name="rail")
    M = "singapore_turtle_walk"
    sun_on = []                                              # six still turtles on the rocks (x, y, rock, face)
    for x, y, ri, face in ((-0.165, 0.025, 0, 200), (-0.115, 0.06, 0, 150), (-0.10, -0.005, 0, 240),
                           (-0.04, 0.12, 1, 170), (0.005, 0.125, 1, 210), (-0.06, -0.08, 2, 190)):
        tt = A.Animal(M, TURT_H, fwd_fix=None, label="sun%d" % (len(sun_on) + 1), **kw(M))
        tt.cycle("walk")                                      # learns its facing
        tt.ch.at(0.0, loc=(x, y, top(ri, x, y) - 0.002), face_deg=face + tt.facing_fix())   # 2 mm into the rock
        tt.finish(); sun_on.append(tt)
    crawl = []                                               # three crawl down the bank into the shallow river
    for i, (y, x0, x1, t0) in enumerate(((-0.05, 0.02, 0.125, 0.0), (0.05, 0.035, 0.135, 0.6), (0.16, 0.015, 0.115, 1.2))):
        tt = A.Animal(M, TURT_H, fwd_fix=None, label="crawl%d" % (i + 1), **kw(M))
        v = tt.cycle("walk")[1]
        tt.walk("walk", A.Path([(x0, y), (x1, y)]), t0, T - HOLD, (x1 - x0) / (T - HOLD - t0), start_d=0.0, phase=i * 0.3)
        tt.finish(); crawl.append(tt)
    A.report(sun_on + crawl, 0.0, T - HOLD)
    aim = Vector((0.0, 0.03, FLOOR + 0.012))
    if CAMSUB == "S":
        cam_move(40, aim + Vector((0.0, -0.18, 0.01)), aim, aim + Vector((0.0, -0.18, 0.01)), aim)   # check 1: behind the railing
    else:
        cam_move(32, aim + Vector((-0.03, -0.38, 0.21)), aim, aim + Vector((-0.01, -0.34, 0.19)), aim, t_end=T - HOLD)   # check 2: edge turtles cut
    print("DESK CAM SG2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
