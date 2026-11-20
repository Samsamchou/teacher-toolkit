# World Routines Trip - transparent PNG figures for the website (tabletop 3D look).
# blender -b --factory-startup --python portraits.py -- <props> <fonts> <SHOT> sheet <out> 0 CYCLES <samples> <scale>
#   SHOT: hero_girl / hero_boy      the traveller asking a question (stands on the left of the page, turned to the right)
#         char_<id>                 a local pupil answering (stands on the right, turned to the left); model from CHARS below
#         ride_<girl|boy>_<plane|ship|train>   the traveller riding the toy vehicle, heading right (the page mirrors it when going left)
# ASCII only: colab exec reads files with cp950 on Windows.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import engine as E

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
E.init(PROPS, FONTS, 0.1)
sc = E.sc
sc.render.film_transparent = True
sc.render.image_settings.color_mode = "RGBA"
KID = 0.070
HERO = {"girl": ("traveler_girl", KID * 1.06), "boy": ("traveler_boy", KID * 1.06)}
CHARS = {"japan": ("japan_boy", KID), "taiwan": ("taiwan_girl", KID * 1.04)}
# rotation (degrees) that makes each toy vehicle head towards +x, and where the rider sits along it (0 = middle, in vehicle lengths)
VEH = {"plane": ("toy_plane", float(os.environ.get("ROT_PLANE", "90")), 0.0), "ship": ("toy_ship", float(os.environ.get("ROT_SHIP", "0")), 0.3),
       "train": ("toy_train", float(os.environ.get("ROT_TRAIN", "180")), 0.22)}

E.lights()
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.3, 0.35)); key = bpy.context.object
key.data.energy = 9; key.data.color = (1, 0.97, 0.92); key.data.size = 0.5; key.rotation_euler = (math.radians(40), 0, 0)
sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.27, 0.32, 1)      # soft ambient so the shadow side is not black


def figure(name, loc, face, arms, head, height):
    ch = E.Char(name, loc, face, height=height)
    for fr in E.frames(): ch.pose(fr / E.FPS, arms, twist={"Head": head})
    ch.finish(); return ch


def cam(lens, c, a, res):
    sc.render.resolution_x, sc.render.resolution_y = res
    co, aim, fo = E.camera("cam", lens, 8)
    E.key_cam(co, aim, fo, lambda t: (c, a, a))


LEGS = {"RightUpLeg": (-0.35, -1, -0.25), "LeftUpLeg": (0.35, -1, -0.25), "RightLeg": (-0.1, -0.2, -1), "LeftLeg": (0.1, -0.2, -1)}
if SHOT.startswith("hero_"):
    name, h = HERO[SHOT[5:]]
    # asking: left hand open towards the pupil on her right-hand side of the page, right hand relaxed; head tipped a little
    arms = {"LeftArm": (0.75, -0.3, -0.5), "LeftForeArm": (0.6, -0.6, 0.25), "RightArm": (-0.3, 0.05, -1), "RightForeArm": (-0.2, -0.1, -1)}
    figure(name, (0, 0, 0), 28, arms, (0, -10, 2), h)
    cam(70, (0.0, -0.215, 0.05), (0.0, 0.0, 0.039), (800, 1200))
elif SHOT.startswith("char_"):
    name, h = CHARS[SHOT[5:]]
    figure(name, (0, 0, 0), -28, E.P_wave(1), (0, 10, 2), h)        # waves with the right hand, turned towards the traveller
    cam(70, (0.0, -0.215, 0.05), (0.0, 0.0, 0.039), (800, 1200))
else:
    _, who, veh = SHOT.split("_")
    vname, rot, along = VEH[veh]
    v = E.place(f"{PROPS}/{vname}.glb", 0.105, (0, 0, 0), rot_z=math.radians(rot), axis="long")
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    x0, x1, y0, y1, top = E._bbox(v)
    sx = (x0 + x1) / 2 + along * (x1 - x0)
    zs = []
    for dx in (-0.006, 0, 0.006):
        ok, loc, n, idx, ob, mx = sc.ray_cast(dg, Vector((sx + dx, (y0 + y1) / 2, 1.0)), Vector((0, 0, -1)), distance=2.0)
        if ok: zs.append(loc.z)
    seat = max(zs) if zs else top
    name, h = HERO[who]
    ch = E.Char(name, (sx, (y0 + y1) / 2), 90, height=h)                # faces +x, the way the vehicle is going
    bpy.context.view_layer.update()
    hips = (ch.arm.matrix_world @ ch.pb["Hips"].head).z - (ch.root.matrix_world.translation.z - ch.base_z)
    ch.at(0, loc=(sx, (y0 + y1) / 2, seat + 0.006 - hips))
    arms = {"LeftArm": (0.75, -0.1, 0.65), "LeftForeArm": (0.35, -0.1, 1), "RightArm": (-0.3, -0.5, -0.8), "RightForeArm": (-0.1, -1, -0.2)}   # the far hand waves, so no hand covers the face
    for fr in E.frames(): ch.pose(fr / E.FPS, {**LEGS, **arms}, twist={"Head": (0, -58, 0)})
    ch.finish()
    print("RIDE", SHOT, "seat_z", round(seat, 4), "top", round(top, 4), "len", round(x1 - x0, 4), flush=True)
    mid = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (seat + h * 0.75) / 2))
    cam(60, mid + Vector((0.025, -0.33, 0.07)), mid, (1000, 760))

E.run(A[3:])
