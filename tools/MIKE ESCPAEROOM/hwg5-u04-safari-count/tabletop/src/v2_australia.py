# Safari Count VERSION 2 - Australia station, Werribee Open Range Zoo (tabletop style H, Blender on Colab only).
# Spec: rdq/RDQ-spec-safari-count-v2-20261127.md, allocation table v2/ (teacher-approved 11/27).
#   AV1 (7.0 s) "There are eight zebras." Open savannah: eight zebras walk across the grass in two loose rows,
#       left -> right; the safari bus is parked on the track behind. Last 1 s: all eight still, apart, in view.
#   AV2 (7.0 s) "There are five horses." Five Przewalski's horses walk a little, then stop to graze; the safari bus
#       is parked behind. Last 1 s: all five still, apart, in view.
#   Check cameras: <SHOT>S low side.
# Models: kenya_zebra_walk (reverse_clip: the rig is back to front), australia_przewalski_walk (11/27: the v1 white horse
#   tinted dun with make_recolor.py, same rig: front-leg fix as JP2), australia_safari_bus. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"AV1": 7.0, "AV2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
ZEBRA_H = 0.046               # from KE1
HORSE_H = 0.040               # Przewalski's horse: stocky, a bit bigger than the v1 ponies (0.036)
BUS_L = 0.17                  # from AU2
SPEED_H = 0.44
HORSE_FIX = [("bone_17", "0_Left_Limb_4")]                 # JP2: one front leg never moves in the gallery rig


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.84); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)
E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.50, 0.70, 0.92), 0.9), "sky")
E.board((0, 0.03), (0.70, 0.46), E.felt("range", (0.58, 0.54, 0.30)), "yard", thick=FLOOR)
for k in range(-6, 7):
    E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.38, 0.46, 0.26)), "hill").scale = (1.0, 0.5, 0.75)
for x, y, h in ((-0.27, 0.27, 0.12), (0.28, 0.28, 0.11)):
    E.cyl((x, y, FLOOR + h / 2), 0.006, h, E.felt("bark", (0.60, 0.58, 0.52)), verts=12, name="trunk")
    E.ball((x, y, FLOOR + h), 0.05, E.felt("leaves", (0.32, 0.44, 0.30)), "canopy").scale = (1.0, 0.7, 0.8)
E.box((0.0, 0.19, FLOOR + ROAD_T / 2), (0.70, 0.07, ROAD_T), E.felt("road", (0.56, 0.44, 0.30)), "road", bevel=0)
E.place(f"{PROPS}/australia_safari_bus.glb", BUS_L, (0.14 if SHOT == "AV1" else -0.14, 0.19, FLOOR + ROAD_T),
        rot_z=0.0 if SHOT == "AV1" else math.pi, axis="long")

if SHOT == "AV1":
    ends = [-0.18, -0.13, -0.07, -0.02, 0.03, 0.08, 0.13, 0.19]
    zs = []
    for i, xe in enumerate(ends):
        z = A.Animal("kenya_zebra_walk", ZEBRA_H * (1.0 - 0.03 * (i % 3)), fwd_fix=None, label="zebra%d" % (i + 1),
                     clip_speed_h=SPEED_H, reverse_clip=True)
        v = z.cycle("walk")[1]; y = 0.07 if i % 2 else 0.0; t0 = (0.0, 0.3, 0.15, 0.45, 0.1, 0.35, 0.2, 0.5)[i]
        travel = v * (T - HOLD - t0)
        z.walk("walk", A.Path([(xe - travel - 0.05, y), (xe + 0.05, y)]), t0, T - HOLD, None, start_d=0.0, phase=(i * 0.618) % 1.0)
        z.finish(); zs.append(z)
    A.report(zs, 0.0, T - HOLD)
    aim = Vector((0.0, 0.04, FLOOR + 0.02))
    if CAMSUB == "S":
        cam_move(45, aim + Vector((0.0, -0.34, 0.0)), aim, aim + Vector((0.0, -0.34, 0.0)), aim)
    else:
        cam_move(28, aim + Vector((0.02, -0.40, 0.21)), aim, aim + Vector((0.0, -0.35, 0.18)), aim, t_end=T - HOLD)
    print("DESK CAM AV1 %s" % CAMSUB, flush=True)

else:
    for x, y in ((-0.05, 0.03), (0.0, 0.06), (0.09, 0.0), (0.14, 0.05), (-0.13, -0.02), (0.05, -0.04)):   # grass tufts
        for k in range(5):
            a = k * 1.26
            E.cyl((x + 0.004 * math.cos(a), y + 0.004 * math.sin(a), FLOOR + 0.004), 0.0008, 0.008, E.felt("tuft", (0.36, 0.48, 0.16)),
                  verts=6, name="tuft")
    hs = []
    for i, (pts, t0, t_stop) in enumerate(((((-0.22, 0.00), (-0.13, -0.02)), 0.0, 3.4),
                                           (((-0.12, 0.07), (-0.02, 0.06)), 0.2, 3.0),
                                           (((-0.04, -0.06), (0.05, -0.04)), 0.4, 3.8),
                                           (((0.03, 0.08), (0.12, 0.05)), 0.1, 2.8),
                                           (((0.10, -0.01), (0.17, 0.00)), 0.5, 3.2))):
        h = A.Animal("australia_przewalski_walk", HORSE_H * (1.0 - 0.03 * (i % 3)), fwd_fix=None, label="horse%d" % (i + 1),
                     clip_speed_h=SPEED_H, fix_legs=HORSE_FIX)
        path = A.Path(list(pts))
        h.walk("walk", path, t0, t_stop, None, start_d=0.0, phase=(i * 0.37) % 1.0)
        h.graze(t_stop + 0.05, T + 1.0, down_deg=60.0)
        v = h.cycle("walk")[1]; p, hd = path.at(v * (t_stop - t0))
        h.ch.at(t_stop, loc=(p[0], p[1]), face_deg=A.heading_deg(hd) + h.facing_fix())
        h.finish(); hs.append(h)
    A.report(hs, 0.0, 3.8)
    aim = Vector((-0.02, 0.02, FLOOR + 0.02))
    if CAMSUB == "S":
        cam_move(45, aim + Vector((0.0, -0.34, 0.0)), aim, aim + Vector((0.0, -0.34, 0.0)), aim)
    else:
        cam_move(30, aim + Vector((0.02, -0.40, 0.19)), aim, aim + Vector((0.0, -0.35, 0.16)), aim, t_end=T - HOLD)
    print("DESK CAM AV2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
