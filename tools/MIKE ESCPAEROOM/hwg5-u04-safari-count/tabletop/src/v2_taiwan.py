# Safari Count VERSION 2 - Taiwan station, Taipei Zoo (tabletop style H, Blender on Colab only).
# Spec: rdq/RDQ-spec-safari-count-v2-20261127.md, allocation table v2/ (teacher-approved 11/27).
#   TV1 (7.0 s) "There is one koala." Koala House: one koala climbs slowly up a pale eucalyptus trunk (stop-motion
#       pose A <-> B like Australia v1); the zoo train rolls by far behind. Last 1 s: it holds on (counting).
#   TV2 (7.0 s) "There are three elephants." Three Asian elephants walk in a line left -> right in front of the rocks;
#       the zoo train waits on its track behind. Last 1 s: all three stop, apart, in view.
#   Check cameras: <SHOT>S low side.
# Models (all from v1): australia_koala_a / _b (static), singapore_elephant_walk, toy_train. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"TV1": 7.0, "TV2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
KOALA_A_H = 0.064             # from AU1 (checked there)
KOALA_B_H = 0.045
KOALA_GAP = 0.021
KOALA_GAP_B = 0.015
ELE_H = 0.066                 # from SG1
SPEED_H = 0.44


def objs_of(root):
    return [root] + [c for c in root.children_recursive]


def vis_keys(root, keys):
    for o in objs_of(root):
        o.hide_render = not keys[0][1]; o.keyframe_insert("hide_render", frame=-1)
        for t, on in keys:
            o.hide_render = not on; o.keyframe_insert("hide_render", frame=E.f(t))


def loc_keys(root, keys):
    for t, p in keys:
        root.location = p; root.keyframe_insert("location", frame=E.f(t))
    E.constant(root)


def rock(x, y, s, name="rock", sq=0.55):
    r = E.ball((x, y, FLOOR + s * 0.35), s, E.felt("rock", (0.40, 0.38, 0.34)), name)
    r.scale = (1.0, 0.8, sq); return r


def zoo_ground():
    """Taipei Zoo (same look as the v1 Taiwan films): grass board, green Muzha hills, visitor path and a low fence."""
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.30, 0.56, 0.86), 0.9), "sky")
    E.board((0, 0.03), (0.64, 0.44), E.felt("grass", (0.30, 0.46, 0.20)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.06, 0.40, FLOOR + 0.02), 0.07, E.felt("hill", (0.20, 0.38, 0.18)), "hill").scale = (1.0, 0.5, 0.9)
    E.box((0, -0.14, FLOOR + 0.002), (0.64, 0.05, 0.004), E.felt("path", (0.66, 0.58, 0.46)), "visitorPath", bevel=0)
    wood = E.felt("fence", (0.45, 0.30, 0.18))
    for i in range(-16, 17):
        E.cyl((i * 0.02, -0.105, FLOOR + 0.008), 0.0012, 0.016, wood, verts=8, name="post")
    E.box((0, -0.105, FLOOR + 0.014), (0.64, 0.0016, 0.002), wood, "rail", bevel=0)


def train(t_keys, y, rot_z=0.0):
    tr = E.place(f"{PROPS}/toy_train.glb", 0.16, (t_keys[0][1], y, FLOOR + 0.004), rot_z=rot_z, axis="long")
    for t, x in t_keys:
        tr.location.x = x; tr.keyframe_insert("location", frame=E.f(t))
    return tr


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


zoo_ground()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.85); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

if SHOT == "TV1":
    # Koala House yard: one tall climbing trunk in the middle, two shorter gum trees, a feeding post with leaves
    bark = E.felt("gum_bark", (0.70, 0.68, 0.62)); leaves = E.felt("gum_leaves", (0.30, 0.42, 0.34))
    TX, TY = 0.0, 0.06
    E.cyl((TX, TY, FLOOR + 0.13), 0.009, 0.26, bark, verts=16, name="gum_trunk")
    for dx, dz, rr in ((0.0, 0.27, 0.05), (0.04, 0.25, 0.035), (-0.035, 0.255, 0.035)):
        E.ball((TX + dx, TY + 0.01, FLOOR + dz), rr, leaves, "gum_crown").scale = (1.0, 0.7, 0.6)
    for x, y, h in ((-0.16, 0.12, 0.17), (0.17, 0.13, 0.15)):
        E.cyl((x, y, FLOOR + h / 2), 0.007, h, bark, verts=14, name="gum_trunk2")
        E.ball((x, y + 0.01, FLOOR + h), 0.045, leaves, "gum_crown2").scale = (1.0, 0.7, 0.6)
    for x, y, s in ((-0.08, 0.02, 0.014), (0.09, 0.03, 0.012)): rock(x, y, s)
    train([(0.0, -0.45), (T - HOLD, 0.45)], y=0.27, rot_z=math.pi)     # behind the yard, like v1 TW1
    # the koala climbs: A (reach) / B (pulled up) swap every half second, the body rises one step at each swap
    x = TX + KOALA_GAP; xb = TX + KOALA_GAP_B; z0 = 0.030
    a = E.place(f"{PROPS}/australia_koala_a.glb", KOALA_A_H, (x, TY, FLOOR + z0), rot_z=0.0); a.name = "koala_a"
    b = E.place(f"{PROPS}/australia_koala_b.glb", KOALA_B_H, (xb, TY, FLOOR + z0), rot_z=0.0); b.name = "koala_b"
    va, vb, la, lb = [(0.0, True)], [(0.0, False)], [], []
    z, t, k = FLOOR + z0, 0.3, 0
    la.append((0.0, (x, TY, z)))
    while t + 1.0 <= T - HOLD + 1e-6:
        zb = z + (KOALA_A_H - KOALA_B_H)
        va.append((t + 0.5, False)); vb.append((t + 0.5, True)); lb.append((t + 0.5, (xb, TY, zb)))
        z = zb
        va.append((t + 1.0, True)); vb.append((t + 1.0, False)); la.append((t + 1.0, (x, TY, z)))
        t += 1.0; k += 1
    if not lb: lb.append((0.0, (xb, TY, z)))
    vis_keys(a, va); vis_keys(b, vb); loc_keys(a, la); loc_keys(b, lb)
    print("DESK KOALA start z %.3f end z %.3f steps %d" % (FLOOR + z0, z, k), flush=True)
    aim = Vector((TX, TY, FLOOR + 0.10))
    if CAMSUB == "S":
        cam_move(40, aim + Vector((0.0, -0.24, -0.02)), aim, aim + Vector((0.0, -0.24, -0.02)), aim)
    else:
        cam_move(32, aim + Vector((0.03, -0.32, 0.04)), aim, aim + Vector((0.01, -0.28, 0.05)), aim + Vector((0, 0, 0.035)), t_end=T - HOLD)   # check 1: the crown was cut at the end
    print("DESK CAM TV1 %s" % CAMSUB, flush=True)

else:
    # elephant yard: rocks and a pool behind, the zoo train waiting on its track at the back
    for x in (-0.26, -0.16, -0.05, 0.07, 0.18, 0.27): rock(x, 0.17, 0.024)
    E.cyl((-0.18, 0.10, FLOOR + 0.0005), 0.045, 0.001, E.mat("pool", (0.20, 0.42, 0.60), 0.1), verts=48, name="pool")
    train([(0.0, 0.10), (T, 0.10)], y=0.27, rot_z=math.pi)
    kw = dict(clip_speed_h=SPEED_H)
    ad = A.Animal("singapore_elephant_walk", ELE_H, fwd_fix=None, label="elephant1", **kw)
    body = 0.7 * ad.cycle("walk")[1]
    path = A.Path([(-0.60, 0.02), (0.60, 0.02)])
    travel = body * (T - HOLD)
    ends = [0.15, 0.02, -0.11]                    # nose positions at the end, apart (SG1 used 0.11 apart with a calf)
    herd = [ad] + [A.Animal("singapore_elephant_walk", ELE_H * k, fwd_fix=None, label="elephant%d" % (i + 2), **kw)
                   for i, k in enumerate((0.95, 0.91))]
    for i, (e, xe) in enumerate(zip(herd, ends)):
        e.walk("walk", path, 0.0, T - HOLD, body, start_d=0.60 + xe - travel, phase=(i * 0.37) % 1.0)
    for e in herd: e.finish()
    A.report(herd, 0.0, T - HOLD)
    aim = Vector((0.0, 0.05, FLOOR + 0.035))
    if CAMSUB == "S":
        cam_move(45, aim + Vector((0.0, -0.40, 0.0)), aim, aim + Vector((0.0, -0.40, 0.0)), aim)
    else:
        cam_move(30, aim + Vector((-0.02, -0.42, 0.15)), aim, aim + Vector((0.0, -0.37, 0.12)), aim, t_end=T - HOLD)
    print("DESK CAM TV2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
