# Safari Count - Australia station (tabletop style H, Blender on Colab only). Action table rows 11-12.
#   AU1 (7.0 s) "There are three koalas." Moonlit Sanctuary at night: three koalas climb slowly up three pale
#       eucalyptus trunks (staggered), lanterns along the boardwalk. Last 1 s: all three hold on, apart, in view.
#   AU2 (7.0 s) "There's one lion." A male lion lies on a big rock and yawns (2.0-4.2 s); the safari bus is parked
#       beside the rock.
#   Check cameras: <SHOT>S low side.
# Tripo AI Animation is humanoid-only, so both moves are STOP-MOTION REPLACEMENT (fits the 12 fps tabletop look):
#   koala: pose A (arms reaching up) <-> pose B (pulled up), the body rises one step at each A -> B swap;
#   lion: rest (mouth closed) -> yawn (mouth wide open) -> rest.
# Models (static, Tripo H3.1 from Codex refs; B / yawn made by editing A / rest so the pairs match):
#   australia_koala_a, australia_koala_b, australia_lion_rest, australia_lion_yawn, australia_safari_bus.
# All refs face LEFT in the picture -> the models face -x. Numbers marked GUESS: check frames. ASCII only.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E

ARGS = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = ARGS[0], ARGS[1], ARGS[2]
DUR = {"AU1": 7.0, "AU2": 7.0}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
T = DUR[SHOT]
HOLD = 1.0
FLOOR = 0.012
ROAD_T = 0.003
KOALA_A_H = 0.050             # pose A height, hands up -> feet (GUESS)
KOALA_B_H = 0.035             # pose B is compact: 0.70 x pose A in the refs
KOALA_GAP = 0.019             # half the koala width (A 0.55, B 0.66 of its height) + trunk radius 0.009
STEP = 0.015                  # body rise per climbing step (hands stay, feet come up)
LION_L = 0.11                 # lying lion, nose -> tail tip (GUESS)
BUS_L = 0.17                  # safari bus length (GUESS)


def objs_of(root):
    return [root] + [c for c in root.children_recursive]


def vis_keys(root, keys):
    """Show / hide a placed model at times keys = [(t, shown), ...] (whole frames, stop-motion swaps)."""
    for o in objs_of(root):
        o.hide_render = not keys[0][1]; o.keyframe_insert("hide_render", frame=-1)
        for t, on in keys:
            o.hide_render = not on; o.keyframe_insert("hide_render", frame=E.f(t))


def loc_keys(root, keys):
    for t, p in keys:
        root.location = p; root.keyframe_insert("location", frame=E.f(t))
    E.constant(root)


def cam_move(lens, c0, a0, c1, a1, t_end=None):
    te = t_end or T
    c, a, fo = E.camera("cam", lens, 8)
    E.key_cam(c, a, fo, lambda t: (E.vlerp(c0, c1, E.ease(min(1.0, t / te))), E.vlerp(a0, a1, E.ease(min(1.0, t / te))),
                                   E.vlerp(a0, a1, E.ease(min(1.0, t / te)))))


E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")

if SHOT == "AU1":
    # ---------- night, Moonlit Sanctuary ----------
    E.sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.006, 0.02, 1)
    E.sc.view_settings.exposure = -0.6
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("nightsky", (0.05, 0.07, 0.18), 0.9), "sky")
    E.ball((-0.30, 0.84, 0.34), 0.035, E.emission("moon", (1.0, 0.97, 0.85), 6.0), "moon")
    E.board((0, 0.03), (0.70, 0.46), E.felt("night_ground", (0.20, 0.20, 0.15)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.14, 0.20, 0.15)), "hill").scale = (1.0, 0.5, 0.75)
    bpy.ops.object.light_add(type="AREA", location=(-0.15, -0.25, 0.50)); moon = bpy.context.object
    moon.data.energy = 2.0; moon.data.color = (0.66, 0.75, 1.0); moon.data.size = 0.6; moon.rotation_euler = (math.radians(28), math.radians(-12), 0)
    bpy.ops.object.light_add(type="AREA", location=(0.4, -0.5, 0.3)); fill = bpy.context.object
    fill.data.energy = 0.5; fill.data.color = (0.5, 0.6, 1.0); fill.data.size = 0.6; fill.rotation_euler = (math.radians(60), 0, math.radians(35))
    # boardwalk with lanterns in front of the trees
    plank = E.felt("plank", (0.40, 0.29, 0.20))
    E.box((0.0, -0.13, FLOOR + 0.004), (0.70, 0.06, 0.008), plank, "boardwalk")
    for x in (-0.24, -0.08, 0.08, 0.24):
        E.cyl((x, -0.10, FLOOR + 0.03), 0.0018, 0.05, E.mat("post", (0.12, 0.10, 0.08), 0.6), verts=8, name="post")
        E.ball((x, -0.10, FLOOR + 0.058), 0.006, E.emission("lantern", (1.0, 0.72, 0.35), 8.0), "lantern")
        bpy.ops.object.light_add(type="POINT", location=(x, -0.09, FLOOR + 0.06)); pl = bpy.context.object
        pl.data.energy = 0.5; pl.data.color = (1.0, 0.75, 0.45); pl.data.shadow_soft_size = 0.01
    # three pale eucalyptus trunks; leaves only near the top (above the koalas)
    bark = E.felt("gum_bark", (0.70, 0.68, 0.62)); leaves = E.felt("gum_leaves", (0.30, 0.42, 0.34))
    TREES = [(-0.13, 0.06), (0.0, 0.08), (0.13, 0.06)]
    for tx, ty in TREES:
        E.cyl((tx, ty, FLOOR + 0.13), 0.009, 0.26, bark, verts=16, name="gum_trunk")
        for dx, dz, rr in ((0.0, 0.27, 0.05), (0.04, 0.25, 0.035), (-0.035, 0.255, 0.035)):
            E.ball((tx + dx, ty + 0.01, FLOOR + dz), rr, leaves, "gum_crown").scale = (1.0, 0.7, 0.6)
    # koalas: staggered climbing, A (reach) / B (pulled up) swaps every half second
    for i, ((tx, ty), z0, t0) in enumerate(zip(TREES, (0.035, 0.075, 0.050), (0.0, 0.4, 0.8))):
        x = tx + KOALA_GAP
        a = E.place(f"{PROPS}/australia_koala_a.glb", KOALA_A_H, (x, ty, FLOOR + z0), rot_z=0.0); a.name = "koala%d_a" % (i + 1)
        b = E.place(f"{PROPS}/australia_koala_b.glb", KOALA_B_H, (x, ty, FLOOR + z0), rot_z=0.0); b.name = "koala%d_b" % (i + 1)
        va, vb, la, lb = [(0.0, True)], [(0.0, False)], [], []
        z, t, k = FLOOR + z0, t0, 0
        la.append((0.0, (x, ty, z)))
        while t + 1.0 <= T - HOLD + 1e-6:
            # pose B: hands stay where pose A's were, the feet come up
            zb = z + (KOALA_A_H - KOALA_B_H)
            va.append((t + 0.5, False)); vb.append((t + 0.5, True)); lb.append((t + 0.5, (x, ty, zb)))
            # next pose A: feet stay where pose B's were, the arms reach up again
            z = zb
            va.append((t + 1.0, True)); vb.append((t + 1.0, False)); la.append((t + 1.0, (x, ty, z)))
            t += 1.0; k += 1
        if not lb: lb.append((0.0, (x, ty, z)))
        vis_keys(a, va); vis_keys(b, vb); loc_keys(a, la); loc_keys(b, lb)
        print("DESK KOALA %d trunk %.2f start z %.3f end z %.3f steps %d" % (i + 1, tx, FLOOR + z0, z, k), flush=True)
    aim = Vector((0.0, 0.06, FLOOR + 0.10))
    if CAMSUB == "S":
        cam_move(40, aim + Vector((0.0, -0.30, -0.02)), aim, aim + Vector((0.0, -0.30, -0.02)), aim)
    else:
        cam_move(30, aim + Vector((0.02, -0.44, 0.04)), aim, aim + Vector((0.01, -0.40, 0.03)), aim, t_end=T - HOLD)
    print("DESK CAM AU1 %s" % CAMSUB, flush=True)

else:
    # ---------- day, open range ----------
    L_, Fl, R_ = E.lights(lamp=0.30)
    bpy.ops.object.light_add(type="AREA", location=(0.2, -0.25, 0.45)); sun = bpy.context.object
    sun.data.energy = 1.6; sun.data.color = (1.0, 0.95, 0.84); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(18), 0)
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.50, 0.70, 0.92), 0.9), "sky")
    E.board((0, 0.03), (0.70, 0.46), E.felt("range", (0.58, 0.54, 0.30)), "yard", thick=FLOOR)
    for k in range(-6, 7):
        E.ball((k * 0.065, 0.38, FLOOR + 0.02), 0.075, E.felt("hill", (0.38, 0.46, 0.26)), "hill").scale = (1.0, 0.5, 0.75)
    for x, y, h in ((-0.26, 0.26, 0.12), (0.27, 0.27, 0.11)):
        E.cyl((x, y, FLOOR + h / 2), 0.006, h, E.felt("bark", (0.60, 0.58, 0.52)), verts=12, name="trunk")
        E.ball((x, y, FLOOR + h), 0.05, E.felt("leaves", (0.32, 0.44, 0.30)), "canopy").scale = (1.0, 0.7, 0.8)
    # big flat-topped rock; the lion lies on it
    RX, RY, RR, RH = -0.02, 0.04, 0.085, 0.040
    rock = E.ball((RX, RY, FLOOR), RR, E.felt("rock", (0.50, 0.44, 0.38)), "rock"); rock.scale = (1.0, 0.75, RH / RR)
    E.box((RX, RY, FLOOR + RH - 0.004), (RR * 1.1, RR * 0.8, 0.008), E.felt("rock_top", (0.52, 0.46, 0.40)), "rock_top", bevel=0.004)
    top = FLOOR + RH + 0.000
    # dirt track behind, the safari bus parked on it beside the rock
    E.box((0.0, 0.17, FLOOR + ROAD_T / 2), (0.70, 0.07, ROAD_T), E.felt("road", (0.56, 0.44, 0.30)), "road", bevel=0)
    E.place(f"{PROPS}/australia_safari_bus.glb", BUS_L, (0.13, 0.17, FLOOR + ROAD_T), rot_z=0.0, axis="long")
    rest = E.place(f"{PROPS}/australia_lion_rest.glb", LION_L, (RX, RY, top), rot_z=0.0, axis="long")
    yawn = E.place(f"{PROPS}/australia_lion_yawn.glb", LION_L, (RX, RY, top), rot_z=0.0, axis="long")
    Y0, Y1 = 2.0, 4.2                                         # the yawn
    vis_keys(rest, [(0.0, True), (Y0, False), (Y1, True)])
    vis_keys(yawn, [(0.0, False), (Y0, True), (Y1, False)])
    print("DESK LION yawn %.1f-%.1f s on rock top z %.3f" % (Y0, Y1, top), flush=True)
    aim = Vector((RX, RY, top + 0.02))
    if CAMSUB == "S":
        cam_move(50, aim + Vector((0.0, -0.30, 0.0)), aim, aim + Vector((0.0, -0.30, 0.0)), aim)
    else:
        cam_move(40, aim + Vector((-0.04, -0.36, 0.12)), aim + Vector((0.03, 0.03, 0)), aim + Vector((-0.02, -0.28, 0.09)), aim, t_end=Y0)   # push in to the yawn
    print("DESK CAM AU2 %s" % CAMSUB, flush=True)
E.sc.frame_set(0)
E.run(ARGS[3:])
