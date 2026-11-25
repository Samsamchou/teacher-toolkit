# Safari Count - Taiwan station, Taipei Zoo (tabletop style H, Blender on Colab only). Spec: rdq/RDQ-spec-safari-count-animations-20261125.md
#   TW1 (6.0 s) "There's one panda." One realistic giant panda sits on a rock platform holding bamboo (static model, slow camera push-in);
#       the zoo train rolls by behind the fence. Last 1 s: everything holds still (counting).
#   TW2 (7.0 s) "There are two bears." Two Formosan black bears walk one behind the other along the rocks (NOT into the pool),
#       clearly apart from the start; the zoo train waits at the front. Last 1 s: they stop (counting).
#   Check cameras: TW2S low side (legs), TW2F front 3/4 (the white V on the chest).
# Models: taiwan_panda (Tripo image-to-3D 11/25, static), taiwan_blackbear_walk (gallery bear, quadruped rig, Walk, black),
#   toy_train (World Routines). The V decal is rigid to the nearest spine/head bone. Numbers marked GUESS: check frames. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"TW1": 6.0, "TW2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0                    # last second: everything still, so the animals can be counted
FLOOR = 0.012
BEAR_H = 0.050                # GUESS: whole bear height (pupils are 0.070)
PANDA_H = 0.048               # GUESS: sitting panda height


def rock(x, y, s, name="rock", sq=0.55):
    r = E.ball((x, y, FLOOR + s * 0.35), s, E.felt("rock", (0.40, 0.38, 0.34)), name)
    r.scale = (1.0, 0.8, sq); return r


def zoo_ground():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.30, 0.56, 0.86), 0.9), "sky")
    E.board((0, 0.03), (0.64, 0.44), E.felt("grass", (0.30, 0.46, 0.20)), "yard", thick=FLOOR)
    for k in range(-6, 7):                                               # green hills / trees behind (Muzha)
        E.ball((k * 0.06, 0.40, FLOOR + 0.02), 0.07, E.felt("hill", (0.20, 0.38, 0.18)), "hill").scale = (1.0, 0.5, 0.9)
    E.box((0, -0.14, FLOOR + 0.002), (0.64, 0.05, 0.004), E.felt("path", (0.66, 0.58, 0.46)), "visitorPath", bevel=0)
    # low fence between the visitors' path / train road and the enclosure
    wood = E.felt("fence", (0.45, 0.30, 0.18))
    for i in range(-16, 17):
        E.cyl((i * 0.02, -0.105, FLOOR + 0.008), 0.0012, 0.016, wood, verts=8, name="post")
    E.box((0, -0.105, FLOOR + 0.014), (0.64, 0.0016, 0.002), wood, "rail", bevel=0)


def bamboo(x, y, h, n=3):
    green = E.felt("bamboo", (0.36, 0.60, 0.22)); leaf = E.felt("bambooLeaf", (0.22, 0.48, 0.16))
    for i in range(n):
        dx = (i - (n - 1) / 2) * 0.006
        E.cyl((x + dx, y, FLOOR + h / 2), 0.0014, h, green, verts=8, name="bambooStalk")
        for k in range(4):
            a = math.radians(i * 70 + k * 90)
            E.box((x + dx + 0.004 * math.cos(a), y + 0.004 * math.sin(a), FLOOR + h * (0.6 + 0.1 * k)), (0.008, 0.002, 0.0006),
                  leaf, "bambooLeaf", bevel=0, rot=(0, math.radians(-30), a))


def train(t_keys, y=-0.18, rot_z=0.0):
    """The zoo train (World Routines toy train), keyed along x: t_keys = [(t, x), ...]."""
    tr = E.place(f"{PROPS}/toy_train.glb", 0.16, (t_keys[0][1], y, FLOOR + 0.004), rot_z=rot_z, axis="long")
    for t, x in t_keys:
        tr.location.x = x; tr.keyframe_insert("location", frame=E.f(t))
    return tr


def chest_v(bear):
    """A small white V on the chest, rigid to the bone nearest the chest (ray from in front of the bear)."""
    bpy.context.view_layer.update()
    fwd = bear.forward_world(); up = Vector((0, 0, 1)); side = fwd.cross(up).normalized()
    base = bear.root.matrix_world.translation.copy(); base.z = FLOOR; best = None   # check 2: the root is not at the feet
    dg = bpy.context.evaluated_depsgraph_get()
    hits = []
    for k in range(6):                       # check 1: the forward-most hit was the HEAD -> only chest heights, middle hit
        o = base + up * (BEAR_H * (0.36 + 0.025 * k)) + fwd * 0.2; hit = None
        for ob in bear.ch.meshes:
            Mi = ob.matrix_world.inverted()
            ok, loc, n, i = ob.ray_cast(Mi @ o, (Mi.to_3x3() @ -fwd).normalized(), depsgraph=dg)
            if ok:
                p = ob.matrix_world @ loc
                if hit is None or (p - o).length < (hit - o).length: hit = p
        if hit is not None: hits.append(hit)
    best = hits[len(hits) // 2] if hits else None
    if best is None: print("DESK V no chest hit", flush=True); return
    white = E.felt("bearV", (0.95, 0.93, 0.86)); L = BEAR_H * 0.18; W = BEAR_H * 0.04; parts = []
    for sg in (-1, 1):
        d = (side * sg * 0.55 + up * 0.85).normalized()
        c = best + fwd * 0.0007 + d * (L / 2)
        b = E.box(tuple(c), (W, 0.0008, L), white, "bearV", bevel=0.0002)
        rot = Matrix((side, fwd, up)).transposed(); tilt = Matrix.Rotation(-sg * math.radians(33), 3, fwd)
        b.matrix_world = Matrix.Translation(c) @ (tilt @ rot).to_4x4(); parts.append(b)
    names = [n for n in bear.ch.pb if "Spine" in n]
    pbn = min(names, key=lambda n: (bear.arm.matrix_world @ bear.ch.pb[n].head - best).length)
    pb = bear.ch.pb[pbn]; bpy.context.view_layer.update()
    Mp = bear.arm.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.length, 0))
    for p in parts:
        Mw = p.matrix_world.copy(); p.parent = bear.arm; p.parent_type = "BONE"; p.parent_bone = pb.name
        p.matrix_parent_inverse = Mp.inverted(); p.matrix_world = Mw
    print("DESK V chest %s bone %s" % (tuple(round(v, 4) for v in best), pbn), flush=True)


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


zoo_ground()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.85); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

if SHOT == "TW1":
    # panda house: rock platform, bamboo around, the panda sitting in the middle
    E.cyl((0.0, 0.08, FLOOR + 0.006), 0.07, 0.012, E.felt("platform", (0.50, 0.46, 0.40)), verts=40, name="platform")
    for x, y, s in ((-0.09, 0.12, 0.02), (0.09, 0.12, 0.018), (-0.06, 0.03, 0.012)): rock(x, y, s)
    for x, y, h in ((-0.08, 0.15, 0.10), (0.08, 0.16, 0.11), (0.12, 0.07, 0.08), (-0.12, 0.08, 0.09)): bamboo(x, y, h)
    panda = E.place(f"{PROPS}/taiwan_panda.glb", PANDA_H, (0.0, 0.08, FLOOR + 0.012), rot_z=math.radians(-15))
    # check 1: y=-0.20 was out of the picture; teacher 11/25: the nose faced left while it drove right -> turn it 180 deg
    train([(0.0, -0.45), (T - HOLD, 0.45)], y=0.27, rot_z=math.pi)
    aim = Vector((0.0, 0.08, FLOOR + 0.035))
    cam_move(40, aim + Vector((0.02, -0.40, 0.10)), aim, aim + Vector((0.01, -0.26, 0.06)), aim, t_end=T - HOLD)
    print("DESK CAM TW1 %s" % CAMSUB, flush=True)

else:
    for x in (-0.25, -0.18, -0.08, 0.05, 0.16, 0.26): rock(x, 0.20, 0.022)
    E.cyl((0.18, 0.13, FLOOR + 0.0005), 0.040, 0.001, E.mat("pool", (0.20, 0.42, 0.60), 0.1), verts=48, name="pool")
    for x, y in ((0.14, 0.10), (0.22, 0.10), (0.21, 0.17)): rock(x, y, 0.010, "poolRock")
    # check 4: the path ran into the pool and the bears overlapped -> path in front of the pool, bears 6 cm apart from the start
    path = A.Path([(-0.22, 0.06), (-0.10, 0.05), (0.02, 0.04), (0.12, 0.03), (0.30, 0.03)])
    b1 = A.Animal("taiwan_blackbear_v", BEAR_H, fwd_fix=None, label="bear1")
    b2 = A.Animal("taiwan_blackbear_v", BEAR_H * 0.92, fwd_fix=None, label="bear2")
    b1.walk("walk", path, 0.0, T - HOLD, None, start_d=0.08, phase=0.0)
    b2.walk("walk", path, 0.0, T - HOLD, None, start_d=0.0, side=0.008, phase=0.5)
    E.sc.frame_set(0)
    # the white V is painted in the texture (paint_chest_v.py, check 3: the decal on a bone was never visible)
    b1.finish(); b2.finish()
    A.report([b1, b2], 0.0, T - HOLD)
    def bear_pt(b, t):
        E.sc.frame_set(E.f(t)); return b.root.matrix_world.translation + Vector((0, 0, BEAR_H * 0.5))
    mid = (bear_pt(b1, T / 2) + bear_pt(b2, T / 2)) / 2; mid.z = FLOOR + 0.025
    if CAMSUB == "S":
        cam_move(55, mid + Vector((0.0, -0.30, 0.0)), mid, mid + Vector((0.0, -0.30, 0.0)), mid)
    elif CAMSUB == "F":
        p = bear_pt(b1, T - HOLD); f = b1.forward_world()
        cam_move(60, p + f * 0.16 + Vector((0.03, -0.02, 0.01)), p, p + f * 0.16 + Vector((0.03, -0.02, 0.01)), p)
    else:
        cam_move(38, mid + Vector((0.03, -0.42, 0.13)), mid, mid + Vector((0.05, -0.40, 0.12)), mid + Vector((0.02, 0, 0)))
    E.sc.frame_set(0)
    print("DESK CAM TW2 %s" % CAMSUB, flush=True)
E.run(ARGS[3:])
