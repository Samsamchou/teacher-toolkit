# Builds tabletop/src/japan_bath.py from kenya_morning.py (helpers + hand rig reused unchanged; header, shots and the build section
# are new), like taiwan_getup_build.py.   python tabletop/src/japan_bath_build.py
from pathlib import Path

HERE = Path(__file__).resolve().parent
src = (HERE / "kenya_morning.py").read_text(encoding="utf-8").split("\n")
start = next(i for i, l in enumerate(src) if l.startswith("import sys, os, math"))
stop = next(i for i, l in enumerate(src) if l.startswith("# ================= build"))
body = "\n".join(src[start:stop])
old = '''DUR = {"KE1": 5.6, "KE2": 3.8, "KE3": 3.0, "KE4": 9.0}
VOICE = {"q": 0.5, "a": 2.6, "dark": 2.3, "gm": 1.5, "a4": 0.3, "tea1": 2.7, "tea2": 6.3}
# planned contact times (seconds in the shot) used by kenya_compose.py for the little sounds; the CONTACT lines print the real ones
EVENTS = {"click": 1.0, "sip": 2.9, "cup_down": 4.95, "bite": 6.9, "plate": 8.25}'''
new = '''DUR = {"JP1": 7.6, "JP2": 3.6, "JP3": 5.6, "JP4": 4.2}
VOICE = {"q": 0.4, "a": 4.6, "wash": 0.4, "bath": 0.4, "bed": 0.4}
EVENTS = {}'''
assert old in body; body = body.replace(old, new)

HEAD = '''# World Routines Trip, he/she version - Japan station "He takes a shower at eight twenty." (tabletop style H)
# Spec: MIKE ESCPAEROOM/rdq/RDQ-spec-world-routines-he-she-20261123.md; storyboard he-she/ (9-station storyboard, 2026-11-23) (teacher 11/23:
# the shower is only a shape behind frosted glass, in the bath only his head shows). Anchor and reporter are voices only.
#   SHOT: JP1 (7.6 s) the changing room of a Japanese home bathroom: a frosted-glass sliding door (lit from behind), steam puffs
#             over its top, Haruto's shape behind the glass under the shower; wall clock 8:20 on the left; a basket on a shelf with his
#             folded pyjamas and a towel. "This is Haruto. What time does he take a shower?" / "He takes a shower at eight twenty."
#         JP2 (3.6 s) closer on the frosted door: his shape washes his hair (both hands on the head, small rubs), water falling.
#             "First, he washes in the shower."
#         JP3 (5.6 s) inside: a square hinoki-wood bathtub full of hot water (opaque, milky blue), steam; only his head shows above the
#             water, a small folded white towel on his head; wooden stool and bucket beside the tub. "Then he sits in the hot bath.
#             It's called ofuro."
#         JP4 (4.2 s) his tatami room: a futon laid on the floor, clock 9:00; he sits on the futon in his pyjamas, a towel round his
#             neck, the quilt over his legs, waves good night; the light dims at the end. "He goes to bed at nine o'clock."
# Models: japan_boy_pyjamas (Tripo 11/23). Everything else is made here.
# ASCII only: colab exec reads files with cp950 on Windows.'''

BUILD = r'''

# ================= build (Japan he/she) =================
# check (11/23): a bone matrix set by the hand helpers can leave a location / scale on a bone that is not keyed -> a long skin
# spike in every frame. Clear them before the character is finalised.
_fin0 = E.Char.finish
def _fin(self):
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    _fin0(self)
E.Char.finish = _fin

def wall_clock(cx, cy, cz, hh, mm, r=0.018):
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.85, 0.85, 0.82), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.99, 0.98, 0.94), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.06, 0.05, 0.05), 0.5)
    for k in range(12):
        a = math.radians(k * 30)
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0012 if k % 3 == 0 else 0.0007), ink, "tick")
    hand_box(cx, cy - 0.0047, cz, math.radians((hh + mm / 60.0) * 30), 0.42 * r, 0.0020, ink, "hourHand")
    hand_box(cx, cy - 0.0053, cz, math.radians(mm * 6), 0.64 * r, 0.0013, ink, "minuteHand")
    E.ball((cx, cy - 0.0055, cz), 0.0013, E.mat("clockPin", (0.70, 0.10, 0.06), 0.4), "clockPin")


def base_room(wall_col, floor_col, floor_lines=True):
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("floor", floor_col), "floor", thick=FLOOR)
    if floor_lines:
        line = E.mat("floorLine", tuple(c * 0.8 for c in floor_col), 0.9)
        for i in range(1, 16): E.box((-0.32 + i * 0.04, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), line, "floorLine", bevel=0)
    E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("backWall", wall_col), "backWall")
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", tuple(c * 0.92 for c in wall_col)), "sideWall")


def steam_puffs(x, y, z0, z1, n=7, spread=0.010, r=0.0030):
    cotton = E.felt("steam", (0.97, 0.97, 0.97))
    for k in range(n):
        b = E.ball((x, y, z0), r, cotton, "steam")
        for fr in E.frames():
            u = ((fr / E.FPS) * 0.35 + k / n) % 1.0
            b.location = (x + spread * math.sin(k * 2.1 + u * 4.0), y + 0.003 * math.cos(k * 1.3), z0 + (z1 - z0) * u)
            s = 0.5 + 1.0 * u if u < 0.8 else (1.5 - (u - 0.8) * 7.0)
            b.scale = (max(0.02, s),) * 3
            b.keyframe_insert("location", frame=fr); b.keyframe_insert("scale", frame=fr)
        E.constant(b)


def frosted_mat(n):
    m = bpy.data.materials.new(n); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.92, 0.95, 0.97, 1)
    for key, v in (("Transmission Weight", 1.0), ("Transmission", 1.0), ("Roughness", 0.30), ("IOR", 1.45)):
        if key in p.inputs: p.inputs[key].default_value = v
    return m


def water_drops(x, y, z_top, z_bot, n=14):
    """Shower water: thin falling streaks (stop-motion)."""
    wm = E.mat("waterDrop", (0.75, 0.88, 1.0), 0.05)
    import random
    rng = random.Random(3)
    for k in range(n):
        dx, dy, ph = rng.uniform(-0.006, 0.006), rng.uniform(-0.004, 0.004), rng.random()
        d = E.cyl((x + dx, y + dy, z_top), 0.00025, 0.004, wm, verts=6, name="drop")
        for fr in E.frames():
            u = ((fr / E.FPS) * 1.6 + ph) % 1.0
            d.location = (x + dx, y + dy, z_top + (z_bot - z_top) * u); d.keyframe_insert("location", frame=fr)
        E.constant(d)


ch = E.Char("japan_boy_pyjamas", (0.30, -0.15), 0, height=KID * 1.04)
M_ = metrics(ch)
SEAT_UNDER = seat_under(ch, M_["thigh"]) - SINK
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]

if SHOT in ("JP1", "JP2"):
    # ---------- the changing room and the frosted bathroom door ----------
    base_room((0.80, 0.70, 0.55), (0.55, 0.42, 0.30))     # check 1: white walls + strong light washed the picture out
    DOOR_X, DOOR_Y, DOOR_W, DOOR_H = 0.03, 0.150, 0.080, 0.105       # the glass door between the changing room (front) and the bathroom (behind)
    for x in (-0.3, 0.3):       # the dividing wall left and right of the door
        pass
    E.box((-0.17 + DOOR_X / 2 - DOOR_W / 4, DOOR_Y, FLOOR + 0.12), (0.30 - DOOR_W / 2, 0.008, 0.24), E.felt("divWall", (0.80, 0.70, 0.55)), "divWallL")
    E.box((0.17 + DOOR_X / 2 + DOOR_W / 4, DOOR_Y, FLOOR + 0.12), (0.30 - DOOR_W / 2, 0.008, 0.24), E.felt("divWall2", (0.80, 0.70, 0.55)), "divWallR")
    E.box((DOOR_X, DOOR_Y, FLOOR + DOOR_H + (0.24 - DOOR_H) / 2 + 0.006), (DOOR_W, 0.008, 0.24 - DOOR_H - 0.012), E.felt("divTop", (0.80, 0.70, 0.55)), "divTop")
    glass = E.box((DOOR_X, DOOR_Y, FLOOR + DOOR_H / 2), (DOOR_W - 0.004, 0.0015, DOOR_H - 0.002), frosted_mat("frosted"), "frostedGlass", bevel=0)
    alu = E.mat("doorFrame", (0.80, 0.82, 0.85), 0.25)
    for (x, z, sx, sz) in ((DOOR_X - DOOR_W / 2, FLOOR + DOOR_H / 2, 0.003, DOOR_H), (DOOR_X + DOOR_W / 2, FLOOR + DOOR_H / 2, 0.003, DOOR_H),
                           (DOOR_X, FLOOR + DOOR_H, DOOR_W + 0.003, 0.003), (DOOR_X, FLOOR + 0.0015, DOOR_W + 0.003, 0.003), (DOOR_X, FLOOR + DOOR_H / 2, 0.002, DOOR_H)):
        E.box((x, DOOR_Y - 0.001, z), (sx, 0.006, sz), alu, "doorFrame", bevel=0)
    # the bathroom behind the glass: tiled, brightly lit, shower head on its back wall
    E.box((DOOR_X, 0.215, FLOOR + 0.12), (0.20, 0.004, 0.24), E.felt("bathTiles", (0.80, 0.90, 0.95)), "bathBackWall")
    bpy.ops.object.light_add(type="AREA", location=(DOOR_X, 0.212, FLOOR + 0.06)); bl = bpy.context.object      # behind him, facing the glass
    bl.data.energy = 2.2; bl.data.color = (1.0, 0.95, 0.85); bl.data.size = 0.09; bl.rotation_euler = (math.radians(90), 0, 0)
    E.cyl((DOOR_X + 0.012, 0.205, FLOOR + 0.100), 0.0035, 0.002, E.mat("showerHead", (0.85, 0.85, 0.88), 0.2), rot=(math.radians(60), 0, 0), verts=16, name="showerHead")
    water_drops(DOOR_X + 0.012, 0.200, FLOOR + 0.095, FLOOR + 0.002)
    steam_puffs(DOOR_X, DOOR_Y - 0.004, FLOOR + DOOR_H + 0.002, FLOOR + DOOR_H + 0.045)
    CLOCK = (-0.085, DOOR_Y - 0.0045, FLOOR + 0.112)
    wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 8, 20)
    # a low shelf with a basket: folded pyjamas (light blue stripes) and a white towel
    SH_X = 0.12
    E.box((SH_X, DOOR_Y - 0.016, FLOOR + 0.018), (0.050, 0.022, 0.036), E.felt("shelf", (0.62, 0.45, 0.28)), "shelf")
    E.box((SH_X, DOOR_Y - 0.016, FLOOR + 0.0415), (0.036, 0.018, 0.011), E.felt("basket", (0.78, 0.62, 0.38)), "basket")
    E.box((SH_X - 0.007, DOOR_Y - 0.016, FLOOR + 0.0485), (0.016, 0.012, 0.004), E.felt("pyjamaFold", (0.62, 0.78, 0.95)), "pyjamas")
    E.box((SH_X + 0.009, DOOR_Y - 0.016, FLOOR + 0.0490), (0.014, 0.012, 0.005), E.felt("towelFold", (0.98, 0.98, 0.98)), "towel")
    L_, Fl, R_ = E.lights(lamp=0.22)
    # Haruto behind the glass (only his shape shows through the frosted glass)
    rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(DOOR_X - 0.004, 0.163))     # check 2: closer to the glass, his shape reads darker
    WASH = {"RightArm": (-0.75, -0.30, 0.45), "RightForeArm": (0.55, -0.20, 0.80), "LeftArm": (0.75, -0.30, 0.45), "LeftForeArm": (-0.55, -0.20, 0.80)}
    for fr in E.frames():
        t = fr / E.FPS
        k = int(t / 0.25) % 2
        if SHOT == "JP2" or t > 1.0:
            w = dict(WASH); w["RightForeArm"] = (0.55, -0.20 + 0.2 * k, 0.80); w["LeftForeArm"] = (-0.55, -0.20 + 0.2 * (1 - k), 0.80)
            rig.body(t, w, (0, 0, -4 + 3 * k))
        else:
            rig.body(t, {}, (0, 0, -6))
    ch.finish()
    shade = E.mat("bodyShadow", (0.05, 0.06, 0.08), 0.9)       # check 3: behind the glass he is only a dark shape (no clothes colours)
    for o in ch.meshes:
        o.data.materials.clear(); o.data.materials.append(shade)
    if SHOT == "JP1":
        aim = Vector((0.0, DOOR_Y - 0.02, FLOOR + 0.065))
        cam_move(42, aim + Vector((-0.01, -0.40, 0.04)), aim, aim + Vector((-0.006, -0.36, 0.036)), aim, focus=(DOOR_X, DOOR_Y, FLOOR + 0.06))
    else:
        aim = Vector((DOOR_X, DOOR_Y, FLOOR + 0.060))
        cam_move(55, aim + Vector((0.0, -0.30, 0.010)), aim, aim + Vector((0.0, -0.28, 0.008)), aim, focus=(DOOR_X, DOOR_Y, FLOOR + 0.06))
    for cd in bpy.data.cameras: cd.dof.use_dof = False
    view_report(SHOT, [("clock", CLOCK), ("door", (DOOR_X, DOOR_Y, FLOOR + 0.05)), ("head", lambda: wpt(ch, "Head"))])

elif SHOT == "JP3":
    # ---------- the ofuro: only his head above the hot water, a folded towel on his head ----------
    base_room((0.80, 0.90, 0.95), (0.60, 0.70, 0.75), floor_lines=False)
    tile = E.mat("tileLine", (0.70, 0.80, 0.86), 0.9)
    for i in range(1, 32): E.box((-0.32 + i * 0.02, WALL_Y - 0.0065, FLOOR + 0.12), (0.0006, 0.001, 0.24), tile, "tileV", bevel=0)
    for j in range(1, 12): E.box((0, WALL_Y - 0.0065, FLOOR + j * 0.02), (0.64, 0.001, 0.0006), tile, "tileH", bevel=0)
    TX, TY, TW, TD = 0.0, 0.180, 0.060, 0.050
    head_h = M_["hip_h"] + M_["sh_hips"]                          # shoulders above the floor (standing)
    WATER = FLOOR + head_h + 0.004                                 # water a little above his shoulders: only the head shows
    TUB_H = WATER - FLOOR + 0.006
    hinoki = E.felt("hinoki", (0.86, 0.70, 0.46)); band = E.mat("tubBand", (0.45, 0.30, 0.16), 0.5)
    wt = 0.004
    for (x, y, sx, sy) in ((TX, TY - TD / 2, TW, wt), (TX, TY + TD / 2, TW, wt), (TX - TW / 2, TY, wt, TD), (TX + TW / 2, TY, wt, TD)):
        E.box((x, y, FLOOR + TUB_H / 2), (sx, sy, TUB_H), hinoki, "tubWall", bevel=0.0008)
    for z in (FLOOR + 0.25 * TUB_H, FLOOR + 0.75 * TUB_H):
        E.box((TX, TY - TD / 2 - wt / 2 - 0.0003, z), (TW + 0.001, 0.0008, 0.004), band, "tubBand", bevel=0)
    water = E.box((TX, TY, WATER), (TW - 2 * wt + 0.001, TD - 2 * wt + 0.001, 0.0012), E.mat("hotWater", (0.62, 0.82, 0.92), 0.08), "water", bevel=0)
    E.box((TX + TW / 2 + 0.024, TY - 0.012, FLOOR + 0.006), (0.016, 0.012, 0.012), hinoki, "bathStool", bevel=0.0008)
    E.cyl((TX + TW / 2 + 0.024, TY - 0.012, FLOOR + 0.017), 0.006, 0.010, hinoki, verts=24, name="bucket")
    steam_puffs(TX - 0.014, TY - 0.012, WATER + 0.002, WATER + 0.04, n=4, spread=0.008, r=0.0022)
    steam_puffs(TX + 0.018, TY + 0.006, WATER + 0.002, WATER + 0.04, n=3, spread=0.008, r=0.0022)
    CLOCK = None
    L_, Fl, R_ = E.lights(lamp=0.32)
    rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(TX, TY - 0.004))
    for fr in E.frames():
        t = fr / E.FPS
        rig.body(t, {"RightArm": (-0.2, -0.3, -1), "LeftArm": (0.2, -0.3, -1)}, (0, 4 * math.sin(t * 1.2), 3 if t > 1.5 else 0))
    ch.finish()
    hd = wpt(ch, "Head")
    # a small folded white towel on top of his head
    towel = E.box((0, 0, 0), (0.012, 0.010, 0.0024), E.felt("headTowel", (0.99, 0.99, 0.99)), "headTowel", bevel=0.0005)
    top = None
    for k in range(60):                      # find the top of his hair right above the head bone
        z = hd.z + 0.03 - k * 0.0006
        p = mesh_hit(ch.meshes, Vector((hd.x, hd.y, hd.z + 0.05)), Vector((0, 0, -1)))
        top = p.z if p is not None else hd.z + 0.015; break
    towel.location = (hd.x, hd.y, top + 0.0002)      # check 2: it floated above the hair
    print("DESK JP3 water %.4f above floor, tub height %.4f, head bone %.4f, hair top %.4f" % (WATER - FLOOR, TUB_H, hd.z - FLOOR, top - FLOOR), flush=True)
    aim = Vector((TX, TY, WATER + 0.012))
    cam_move(55, aim + Vector((-0.04, -0.24, 0.06)), aim, aim + Vector((-0.036, -0.22, 0.055)), aim, focus=hd)
    view_report("JP3", [("head", lambda: wpt(ch, "Head")), ("water", (TX, TY, WATER))])

else:
    # ---------- JP4: tatami room, futon, he sits on it with the quilt over his legs and waves good night; light dims ----------
    base_room((0.92, 0.88, 0.76), (0.72, 0.74, 0.46), floor_lines=False)
    edge = E.mat("tatamiEdge", (0.10, 0.18, 0.12), 0.8)
    for i in range(-3, 4): E.box((i * 0.09, 0.03, FLOOR + 0.0002), (0.0025, 0.44, 0.0005), edge, "tatamiEdge", bevel=0)
    E.box((0.10, WALL_Y - 0.0065, FLOOR + 0.12), (0.12, 0.001, 0.13), E.felt("shoji", (0.98, 0.96, 0.90)), "shoji", bevel=0)
    for k in range(1, 6): E.box((0.10 - 0.06 + k * 0.02, WALL_Y - 0.0075, FLOOR + 0.12), (0.0012, 0.001, 0.13), E.felt("shojiBar", (0.55, 0.40, 0.25)), "shojiBar", bevel=0)
    CLOCK = (-0.050, WALL_Y - 0.0045, FLOOR + 0.072)     # check 3: was outside the picture
    wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 9, 0)
    FX, FY = -0.01, 0.150
    E.box((FX, FY, FLOOR + 0.0035), (0.050, 0.095, 0.007), E.felt("futon", (0.97, 0.97, 0.95)), "futon", bevel=0.0015)
    E.box((FX, FY + 0.040, FLOOR + 0.0095), (0.028, 0.012, 0.006), E.felt("pillow", (0.95, 0.80, 0.55)), "pillow", bevel=0.0015)
    SEAT_Z = FLOOR + 0.0075
    hy = FY - 0.010
    rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(FX, hy))
    rig.legs = {"RightUpLeg": (-0.10, -1, -0.04), "LeftUpLeg": (0.10, -1, -0.04), "RightLeg": (0, -1, -0.02), "LeftLeg": (0, -1, -0.02), "RightFoot": (0, -1, -0.05), "LeftFoot": (0, -1, -0.05)}   # check 3: toes forward, flat under the quilt   # check 1: hanging shins went through the floor
    for fr in E.frames():
        t = fr / E.FPS
        if 1.0 <= t < 3.0:
            arms = {k: v for k, v in E.P_wave(int((t - 1.0) * 3) % 2).items() if k.startswith("Right")}
            rig.body(t, arms, (0, 0, 2))
        else:
            rig.body(t, {}, (0, 0, -2))
    ch.finish()
    hip = wpt(ch, "Hips"); footR, footL = wpt(ch, "RightFoot"), wpt(ch, "LeftFoot")
    q_len = abs(min(footR.y, footL.y) - hip.y) + 0.026; q_top = max(wpt(ch, "RightLeg").z, wpt(ch, "LeftLeg").z) + 0.0050   # check 2: the slippers poked out
    E.box(((footR.x + footL.x) / 2, hip.y - q_len / 2 + 0.002, (q_top + FLOOR + 0.007) / 2), (0.048, q_len, q_top - FLOOR - 0.007), E.felt("quilt", (0.45, 0.60, 0.85)), "quilt", bevel=0.003)
    print("DESK JP4 hips %.4f knee %.4f foot %.4f quilt top %.4f length %.4f" % (hip.z - FLOOR, wpt(ch, "RightLeg").z - FLOOR, footR.z - FLOOR, q_top - FLOOR, q_len), flush=True)
    # a towel round his neck
    nk = wpt(ch, "Neck")
    bpy.ops.mesh.primitive_torus_add(major_radius=0.0058, minor_radius=0.0012, major_segments=24, minor_segments=8, location=(nk.x, nk.y, nk.z - 0.001))
    tw = bpy.context.object; tw.name = "neckTowel"; tw.data.materials.append(E.felt("neckTowelM", (0.99, 0.99, 0.99))); tw.scale = (1.15, 1.0, 0.6)
    L_, Fl, R_ = E.lights(lamp=0.5)
    for fr, e in ((0, 55 * 0.5), (E.f(3.0), 55 * 0.5), (E.f(4.0), 55 * 0.15)):
        L_.data.energy = e; L_.data.keyframe_insert("energy", frame=fr)
    aim = Vector((FX + 0.02, FY - 0.01, FLOOR + 0.035))
    cam_move(50, aim + Vector((-0.01, -0.30, 0.05)), aim, aim + Vector((-0.008, -0.28, 0.046)), aim, focus=wpt(ch, "Head"))
    view_report("JP4", [("clock", CLOCK), ("head", lambda: wpt(ch, "Head")), ("futon", (FX, FY, FLOOR))])

print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
'''
out = HEAD + "\n" + body + BUILD
out.encode("ascii")
(HERE / "japan_bath.py").write_text(out, encoding="utf-8", newline="\n")
print("wrote japan_bath.py", len(out.splitlines()), "lines")
