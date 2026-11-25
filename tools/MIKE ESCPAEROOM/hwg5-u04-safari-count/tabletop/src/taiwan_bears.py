# Safari Count - Taiwan clip #2 "There are two bears." (tabletop style H, Blender on Colab only)
#   TW2 (6.0 s) Taipei Zoo Formosan black bear yard: two black bears walk slowly (one behind the other, the second half a step later)
#       along the rocks past a small pool; the zoo train waits at the front edge. Check cameras: TW2S (low side), TW2C (close, chest V).
# Model: taiwan_blackbear_walk (Tripo gallery brown bear, quadruped Auto Rig, Preset Walk in place, fur recoloured black 11/25).
# The white V on the chest is a small decal made here, rigid to the neck bone (it walks with the bear).
# Numbers marked GUESS are first guesses: check them in the first check frames. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
import animals as A

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"TW2": 6.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
FLOOR = 0.012
BEAR_H = 0.050          # GUESS: whole bear height in the scene (pupils are 0.070)
FWD_FIX = None          # measured from the walk clip (check 1: a guessed 90 deg made the bears walk sideways)
SPEED = None            # None = the walk clip's own ground speed (no foot sliding by construction)


def rock(x, y, s, name="rock"):
    r = E.ball((x, y, FLOOR + s * 0.35), s, E.felt("rock", (0.42, 0.40, 0.37)), name)
    r.scale = (1.0, 0.8, 0.55); return r


def yard():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.45, 0.68, 0.90), 0.9), "sky")
    E.board((0, 0.03), (0.64, 0.44), E.felt("grass", (0.36, 0.52, 0.26)), "yard", thick=FLOOR)
    E.box((0, 0.22, FLOOR + 0.06), (0.64, 0.02, 0.12), E.felt("rockWall", (0.50, 0.47, 0.42)), "rockWall")
    for x in (-0.25, -0.18, -0.08, 0.05, 0.16, 0.26):
        rock(x, 0.20, 0.022)
    E.cyl((0.10, 0.11, FLOOR + 0.0005), 0.045, 0.001, E.mat("pool", (0.20, 0.42, 0.60), 0.1), verts=48, name="pool")
    for x, y in ((0.06, 0.07), (0.15, 0.08), (0.14, 0.15)): rock(x, y, 0.010, "poolRock")
    E.box((0, -0.12, FLOOR + 0.002), (0.64, 0.05, 0.004), E.felt("path", (0.70, 0.62, 0.48)), "visitorPath", bevel=0)


def chest_v(bear):
    """A small white V on the chest, rigid to the bone nearest the chest (found by a ray from in front of the bear)."""
    bpy.context.view_layer.update()
    fwd = bear.forward_world(); up = Vector((0, 0, 1)); side = fwd.cross(up).normalized()
    base = bear.root.matrix_world.translation
    best = None
    for k in range(12):
        c = base + up * (BEAR_H * (0.30 + 0.03 * k))
        o = c + fwd * 0.2; hit = None
        dg = bpy.context.evaluated_depsgraph_get()
        for ob in bear.ch.meshes:
            Mi = ob.matrix_world.inverted()
            ok, loc, n, i = ob.ray_cast(Mi @ o, (Mi.to_3x3() @ -fwd).normalized(), depsgraph=dg)
            if ok:
                p = ob.matrix_world @ loc
                if hit is None or (p - o).length < (hit - o).length: hit = p
        if hit is not None and (best is None or (hit - base).dot(fwd) > (best - base).dot(fwd)): best = hit
    if best is None: print("DESK V no chest hit", flush=True); return
    white = E.felt("bearV", (0.95, 0.93, 0.86)); L = BEAR_H * 0.16; W = BEAR_H * 0.035
    parts = []
    for sg in (-1, 1):
        d = (side * sg * 0.55 + up * 0.85).normalized()                  # the two arms of the V go up and out
        c = best + fwd * 0.0007 + d * (L / 2)
        b = E.box(tuple(c), (W, 0.0008, L), white, "bearV", bevel=0.0002)
        rot = Matrix((side, fwd, up)).transposed()                        # box axes: x=side, y=fwd, z=up
        tilt = Matrix.Rotation(-sg * math.radians(33), 3, fwd)
        b.matrix_world = Matrix.Translation(c) @ (tilt @ rot).to_4x4()
        parts.append(b)
    names = [n for n in bear.ch.pb if "Spine" in n or "Head" in n]
    pbn = min(names, key=lambda n: (bear.arm.matrix_world @ bear.ch.pb[n].head - best).length)
    pb = bear.ch.pb[pbn]; bpy.context.view_layer.update()
    Mp = bear.arm.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.length, 0))
    for p in parts:
        Mw = p.matrix_world.copy(); p.parent = bear.arm; p.parent_type = "BONE"; p.parent_bone = pb.name
        p.matrix_parent_inverse = Mp.inverted(); p.matrix_world = Mw
    print("DESK V chest %s bone %s" % (tuple(round(v, 4) for v in best), pbn), flush=True)


yard()
L_, Fl, R_ = E.lights(lamp=0.30)
bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.85); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)

path = A.Path([(-0.16, 0.11), (-0.06, 0.09), (0.04, 0.06), (0.14, 0.05), (0.30, 0.07)])   # check 3: started off screen
b1 = A.Animal("taiwan_blackbear_walk", BEAR_H, fwd_fix=FWD_FIX, label="bear1")
b2 = A.Animal("taiwan_blackbear_walk", BEAR_H * 0.92, fwd_fix=FWD_FIX, label="bear2")
r1 = b1.walk("walk", path, 0.0, DUR[SHOT], SPEED, start_d=0.07, phase=0.0)
r2 = b2.walk("walk", path, 0.0, DUR[SHOT], SPEED, start_d=0.0, side=0.012, phase=0.5)
E.sc.frame_set(0)
chest_v(b1); chest_v(b2)
b1.finish(); b2.finish()
A.report([b1, b2], 0.0, DUR[SHOT])

mid = Vector((0.0, 0.07, FLOOR + 0.025))
T = DUR[SHOT]


def cam_move(lens, c0, a0, c1, a1, focus=None):
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(t / T)), E.vlerp(a0, a1, E.ease(t / T)),
                                   (focus(t) if callable(focus) else E.vlerp(a0, a1, E.ease(t / T)))))


def bear_pt(b, t):
    E.sc.frame_set(E.f(t)); return b.root.matrix_world.translation + Vector((0, 0, BEAR_H * 0.5))


if CAMSUB == "S":            # low side view: legs and feet on the ground
    s0 = bear_pt(b1, 0.0); s1 = bear_pt(b1, T); sm = (s0 + s1) / 2; sm.z = FLOOR + 0.02
    cam_move(55, sm + Vector((0.0, -0.30, 0.0)), sm, sm + Vector((0.0, -0.30, 0.0)), sm)
elif CAMSUB == "C":          # close on bear 1: the chest V and the face
    t0 = bear_pt(b1, 0.5); t1 = bear_pt(b1, T - 0.5)
    cam_move(70, t0 + Vector((0.04, -0.15, 0.02)), t0, t1 + Vector((0.04, -0.15, 0.02)), t1)
else:                        # main: the yard from the visitors' path
    cam_move(38, mid + Vector((0.03, -0.42, 0.13)), mid, mid + Vector((0.05, -0.40, 0.12)), mid + Vector((0.02, 0, 0)))
E.sc.frame_set(0)
print("DESK CAM %s %s rates %.2f %.2f" % (SHOT, CAMSUB, r1, r2), flush=True)
E.run(ARGS[3:])
