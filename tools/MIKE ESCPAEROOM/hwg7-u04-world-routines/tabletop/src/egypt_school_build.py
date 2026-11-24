# Builds tabletop/src/egypt_school.py (he/she Egypt: "He goes to school at seven ten.") from kenya_morning.py (helpers + hand rig
# reused), the same way uk_home_build.py does.   python tabletop/src/egypt_school_build.py
# Sister: models/egypt_girl.glb = the Tripo gallery girl (teacher 11/24 chose it; Recraft + Auto Rig, 65 bones).
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
new = '''DUR = {"EG1": 7.4, "EG2": 4.0, "EG3": 3.4, "EG4": 3.8}
VOICE = {"q": 0.4, "a": 4.4, "walk": 0.3, "starts": 0.3, "bag": 0.3}
EVENTS = {}'''
assert old in body; body = body.replace(old, new)

HEAD = '''# World Routines Trip, he/she version - Egypt station "He goes to school at seven ten." (tabletop style H)
# Storyboard: he-she/<rest 9 stations>_20261123.md row 6; teacher 11/24: the sister is the Tripo gallery girl (egypt_girl).
#   SHOT: EG1 (7.4 s) morning street outside his home (sand plaster, wooden arched door, lattice window, palms, pyramids far away);
#             Omar (egypt_boy) wears his school bag and points at the 7:10 clock on the house wall; his big sister waits beside him.
#             "This is Omar. What time does he go to school?" / "He goes to school at seven ten."
#         EG2 (4.0 s) Omar and his sister walk along the street towards the front right, holding hands (his RIGHT hand, her LEFT).
#             "He walks to school with his big sister."
#         EG3 (3.4 s) the school clock close-up at 7:30 over the school gate. "School starts at seven thirty."
#         EG4 (3.8 s) at the school gate, seen from behind / his right: the bag on his back, both hands pull the straps down twice.
#             "He carries his school bag on his back."
# Models: egypt_boy, egypt_girl (Tripo gallery 11/24). The school bag (rigid to Spine2) and everything else is made here.
# Numbers marked GUESS are first guesses: check them in the first check frames.
# ASCII only: colab exec reads files with cp950 on Windows.'''

BUILD = r'''

# ================= build (Egypt he/she) =================
_fin0 = E.Char.finish
def _fin(self):
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    _fin0(self)
E.Char.finish = _fin

def wall_clock(cx, cy, cz, hh, mm, r=0.020):
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.30, 0.20, 0.10), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.99, 0.98, 0.94), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.05, 0.05, 0.06), 0.5)
    for k in range(12):
        a = math.radians(k * 30)
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0012 if k % 3 == 0 else 0.0007), ink, "tick")
    hand_box(cx, cy - 0.0047, cz, math.radians(((hh % 12) + mm / 60.0) * 30), 0.42 * r, 0.0020, ink, "hourHand")
    hand_box(cx, cy - 0.0053, cz, math.radians(mm * 6), 0.64 * r, 0.0013, ink, "minuteHand")
    E.ball((cx, cy - 0.0055, cz), 0.0013, E.mat("clockPin", (0.80, 0.10, 0.08), 0.4), "clockPin")


def ground_and_sky():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("sky", (0.24, 0.50, 0.88), 0.9), "sky")
    E.board((0, 0.03), (0.64, 0.44), E.felt("sandRoad", (0.70, 0.52, 0.32)), "road", thick=FLOOR)
    stone = E.mat("kerb", (0.74, 0.66, 0.52), 0.9)
    E.box((0, 0.200, FLOOR + 0.0015), (0.64, 0.060, 0.003), E.felt("pavement", (0.72, 0.62, 0.48)), "pavement", bevel=0)
    E.box((0, 0.170, FLOOR + 0.0018), (0.64, 0.002, 0.0036), stone, "kerb", bevel=0)
    sand = E.felt("dune", (0.84, 0.64, 0.36))
    for x, h in ((-0.40, 0.205), (0.22, 0.235), (0.50, 0.195)):   # check 1: too small; check 2: 0.32 tips cut by the frame top (visible band z 0.15-0.26 at y 0.7)          # the pyramids far away, over the roofs
        E.cone((x, 0.70, FLOOR + h / 2), h * 0.95, 0.0, h, sand, verts=4, name="pyramid")


def palm(x, y, h):
    E.cyl((x, y, FLOOR + h / 2), 0.0035, h, E.felt("palmTrunk", (0.45, 0.32, 0.18)), verts=8, name="palmTrunk")
    leaf = E.felt("palmLeaf", (0.20, 0.50, 0.18))
    for k in range(7):
        a = math.radians(k * 360 / 7)
        E.box((x + 0.012 * math.cos(a), y + 0.012 * math.sin(a), FLOOR + h - 0.002), (0.026, 0.006, 0.0012), leaf, "palmLeaf",
              bevel=0.0005, rot=(0, math.radians(-25), a))


def house_street():
    ground_and_sky()
    plaster = E.felt("plaster", (0.78, 0.58, 0.36)); trim = E.felt("trim", (0.80, 0.62, 0.40))
    E.box((0, WALL_Y, FLOOR + 0.065), (0.64, 0.012, 0.130), plaster, "houseWall")          # check 1: 0.24 hid the sky; check 2: 0.15 cut the pyramids
    E.box((0, WALL_Y - 0.0065, FLOOR + 0.126), (0.64, 0.003, 0.008), trim, "roofLine", bevel=0)
    door = E.felt("doorWood", (0.42, 0.24, 0.12))
    DX = -0.075
    E.box((DX, WALL_Y - 0.0068, FLOOR + 0.040), (0.040, 0.002, 0.080), door, "door", bevel=0.0006)
    E.cyl((DX, WALL_Y - 0.0068, FLOOR + 0.080), 0.020, 0.002, door, rot=(math.radians(90), 0, 0), verts=32, name="doorArch")
    E.box((DX, WALL_Y - 0.0082, FLOOR + 0.040), (0.0010, 0.001, 0.076), E.felt("doorLine", (0.30, 0.16, 0.08)), "doorLine", bevel=0)
    E.ball((DX + 0.006, WALL_Y - 0.0085, FLOOR + 0.040), 0.0012, E.mat("knob", (0.80, 0.62, 0.20), 0.3), "knob")
    E.box((DX, WALL_Y - 0.0080, FLOOR + 0.106), (0.056, 0.003, 0.004), trim, "doorTop", bevel=0)
    lat = E.felt("lattice", (0.50, 0.30, 0.16))                        # mashrabiya window on the other side
    WX, WZ = 0.150, FLOOR + 0.088
    E.box((WX, WALL_Y - 0.0068, WZ), (0.060, 0.002, 0.070), E.mat("winDark", (0.10, 0.08, 0.06), 0.8), "winBack", bevel=0)
    for i in range(-5, 6):
        E.box((WX + i * 0.0055, WALL_Y - 0.0082, WZ), (0.0012, 0.0012, 0.070), lat, "latV", bevel=0)
    for j in range(-6, 7):
        E.box((WX, WALL_Y - 0.0084, WZ + j * 0.0055), (0.060, 0.0012, 0.0012), lat, "latH", bevel=0)
    E.box((-0.22, WALL_Y - 0.0068, FLOOR + 0.065), (0.10, 0.002, 0.130), E.felt("plaster2", (0.80, 0.60, 0.42)), "house2", bevel=0)
    E.cyl((0.030, 0.215, FLOOR + 0.008), 0.007, 0.016, E.felt("pot", (0.70, 0.36, 0.20)), verts=16, name="plantPot")
    E.ball((0.030, 0.215, FLOOR + 0.020), 0.009, E.felt("plant", (0.25, 0.55, 0.22)), "plant")
    palm(-0.27, 0.215, 0.16); palm(0.27, 0.215, 0.14)


def school_front():
    ground_and_sky()
    wallc = E.felt("schoolPlaster", (0.84, 0.72, 0.54)); green = E.felt("gateGreen", (0.12, 0.40, 0.25))
    E.box((0, WALL_Y, FLOOR + 0.10), (0.64, 0.012, 0.20), wallc, "schoolWall")
    E.box((0, WALL_Y - 0.0065, FLOOR + 0.060), (0.64, 0.003, 0.006), green, "stripe", bevel=0)
    for k in (-2, -1, 1, 2):
        E.box((k * 0.10, WALL_Y - 0.0068, FLOOR + 0.150), (0.046, 0.002, 0.050), E.felt("winFrame", (0.12, 0.40, 0.25)), "schoolWin", bevel=0)
        E.box((k * 0.10, WALL_Y - 0.0080, FLOOR + 0.150), (0.038, 0.002, 0.042), E.mat("winGlass", (0.40, 0.58, 0.70), 0.1), "schoolGlass", bevel=0)
    # the gate: two square posts, a green arch board with the clock above it, open green gate leaves
    GY = 0.150
    for sx in (-1, 1):
        E.box((sx * 0.040, GY, FLOOR + 0.040), (0.014, 0.014, 0.080), wallc, "gatePost", bevel=0.001)
        E.box((sx * 0.040, GY, FLOOR + 0.082), (0.017, 0.017, 0.004), green, "postCap", bevel=0.0008)
        E.box((sx * 0.060, GY - 0.012, FLOOR + 0.028), (0.026, 0.0016, 0.052), green, "gateLeaf", bevel=0.0004, rot=(0, 0, sx * math.radians(55)))
        E.box((sx * 0.20, GY, FLOOR + 0.020), (0.30, 0.008, 0.040), wallc, "fence", bevel=0.001)
    E.box((0, GY, FLOOR + 0.088), (0.094, 0.010, 0.010), green, "gateBeam", bevel=0.001)
    palm(-0.25, 0.200, 0.15); palm(0.24, 0.205, 0.16)


def wear_bag(ch, M):
    """A school bag on his back, rigid to Spine2, with two straps over the shoulders. Returns the two strap points on his chest."""
    bpy.context.view_layer.update()
    fwd = fwd_of(ch); up = Vector((0, 0, 1)); side = fwd.cross(up).normalized()       # side = his left
    hips = wpt(ch, "Hips"); shz = hips.z + M["sh_hips"]
    BW, BH, BD = 1.9 * M["sh_half"], 0.95 * M["sh_hips"], 0.0060            # GUESS sizes against the chibi body
    c = Vector((hips.x, hips.y, hips.z + 0.52 * M["sh_hips"]))
    back = mesh_hit(ch.meshes, c - fwd * 0.06, fwd)
    bd = (c - back).dot(fwd) if back is not None else 0.006
    centre = c - fwd * (bd + BD / 2 - 0.0004)
    red = E.felt("schoolBag", (0.06, 0.14, 0.42)); dark = E.felt("bagStrap", (0.06, 0.14, 0.42))     # check 1-2: red read pink/orange in the sun -> navy
    parts = [E.box(tuple(centre), (BW, BD, BH), red, "schoolBag", bevel=0.0012)]
    parts.append(E.box(tuple(centre - fwd * (BD / 2 + 0.0004) + up * (-0.18 * BH)), (0.7 * BW, 0.0010, 0.40 * BH), E.felt("bagPocket", (0.90, 0.58, 0.08)), "bagPocket", bevel=0.0004))
    a = math.atan2(fwd.y, fwd.x) + math.pi / 2
    for p in parts: p.rotation_euler = (0, 0, a)
    chest = []
    for sg in (-1, 1):                    # -1 his right, +1 his left
        x0 = hips + side * (sg * 0.55 * M["sh_half"])
        top = Vector((x0.x, x0.y, shz + 0.0022))           # GUESS shoulder surface above the arm joint
        fz = shz - 0.45 * M["sh_hips"]
        fr_ = mesh_hit(ch.meshes, Vector((x0.x, x0.y, fz)) + fwd * 0.06, -fwd)
        fr_ = (fr_ + fwd * 0.0006) if fr_ is not None else Vector((x0.x, x0.y, fz)) + fwd * M["front"]
        bk = Vector((top.x, top.y, top.z)) - fwd * (bd + 0.0006)
        for a_, b_ in ((bk, top), (top, fr_)):
            s_ = E.cyl((0, 0, 0), 0.0011, 1.0, dark, verts=8, name="strap"); s_["len"] = 1.0
            rod_between(s_, a_, b_); parts.append(s_)
        chest.append(fr_)
    pb = ch.pb["Spine2"]
    bpy.context.view_layer.update()
    Mp = ch.arm.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.length, 0))
    for p in parts:
        Mw = p.matrix_world.copy(); p.parent = ch.arm; p.parent_type = "BONE"; p.parent_bone = pb.name
        p.matrix_parent_inverse = Mp.inverted(); p.matrix_world = Mw
    print("DESK BAG back_depth %.4f size %.4f %.4f %.4f straps R %s L %s" % (bd, BW, BH, BD, tuple(round(v, 4) for v in chest[0]), tuple(round(v, 4) for v in chest[1])), flush=True)
    return chest


L_, Fl, R_ = E.lights(lamp=0.25)     # check 1: washed out
bpy.ops.object.light_add(type="AREA", location=(0.25, -0.25, 0.42)); sun = bpy.context.object
sun.data.energy = 1.1; sun.data.color = (1.0, 0.93, 0.78); sun.data.size = 0.5; sun.rotation_euler = (math.radians(32), math.radians(22), 0)
SIS_H = KID * 1.30                    # GUESS big sister: a head taller
if SHOT in ("EG1", "EG2"): house_street()
else: school_front()

if SHOT == "EG3":
    CLOCK = (0.0, 0.150 - 0.0075, FLOOR + 0.112)
    wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 7, 30, r=0.016)
    for fr in E.frames(): pass
    aim = Vector(CLOCK)
    cam_move(85, aim + Vector((0.0, -0.17, -0.025)), aim, aim + Vector((0.0, -0.155, -0.022)), aim, focus=aim)
    for cd in bpy.data.cameras: cd.dof.use_dof = False
    view_report("EG3", [("clock", CLOCK)])

elif SHOT == "EG1":
    CLOCK = (0.060, WALL_Y - 0.0065, FLOOR + 0.100)
    wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 7, 10)
    boy = E.Char("egypt_boy", (0.30, -0.15), 0, height=KID * 1.04); M_ = metrics(boy)
    sis = E.Char("egypt_girl", (0.30, -0.30), 0, height=SIS_H); MS = metrics(sis)
    rig_b = Rig(boy, M_, 0, (0, 0, 0), hips_xy=(0.010, 0.120))
    rig_s = Rig(sis, MS, 0, (0, 0, 0), hips_xy=(-0.032, 0.126))
    wear_bag(boy, M_)
    ans0, ans1 = VOICE["a"], VOICE["a"] + 2.2
    bx, by = 0.010, 0.120
    sh_z = wpt(boy, "LeftArm").z
    pt = Vector(local_dir((bx, by), 0, CLOCK, sh_z)).normalized()
    use_right = pt.x < 0; sg = -1 if use_right else 1; side = "Right" if use_right else "Left"
    pt.x = sg * max(abs(pt.x), 0.45); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.6); pt.normalize()
    FOUR = ("Index", "Middle", "Ring", "Pinky")
    rig_b.learn_hands()
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms = point_arm((pt.x, pt.y, pt.z + 0.06 * k), use_right)
            head = (0, 4 * sg, 10) if t < ans1 else (0, 0, 2)
        else:
            arms, head = {}, (0, -10, 4)                    # looks up at his sister
        rig_b.body(t, arms, head)
        if t >= ans0 - 0.15: point_hand(boy, side, CLOCK); curl_hinge(boy, side, G_POINT, fingers=FOUR); tuck_thumb(boy, side)
        else: rest_hand(boy, side)
        key_hand(boy, side, fr)
        rig_s.body(t, {}, (0, 12, -8))                      # she looks down at him
    boy.finish(); sis.finish()
    aim = Vector((0.0, 0.13, FLOOR + 0.075))
    cam_move(42, aim + Vector((-0.02, -0.42, 0.04)), aim, aim + Vector((-0.012, -0.38, 0.036)), aim, focus=wpt(boy, "Head"))
    view_report("EG1", [("clock", CLOCK), ("boy", lambda: wpt(boy, "Head")), ("sister", lambda: wpt(sis, "Head"))])

elif SHOT == "EG2":
    FACE = 35.0; a = math.radians(FACE); fwd = Vector((math.sin(a), -math.cos(a), 0))
    left = Vector((math.cos(a), math.sin(a), 0))                                            # the walkers' own left
    P0 = Vector((-0.07, 0.105, 0)); SPEED = 0.032; STEP = 0.36
    boy = E.Char("egypt_boy", (0.30, -0.15), FACE, height=KID * 1.04); M_ = metrics(boy)
    sis = E.Char("egypt_girl", (0.30, -0.30), FACE, height=SIS_H); MS = metrics(sis)
    rig_b = Rig(boy, M_, 0, (0, 0, 0), hips_xy=(0.010, 0.120)); rig_s = Rig(sis, MS, 0, (0, 0, 0), hips_xy=(-0.030, 0.124))
    wear_bag(boy, M_)
    offB = M_["hips"] - M_["root"]; offS = MS["hips"] - MS["root"]
    for fr in E.frames():
        t = fr / E.FPS
        c = P0 + fwd * (SPEED * t)
        bpos = c + left * 0.010; spos = c - left * 0.012                                  # boy on her left: his RIGHT hand meets her LEFT
        boy.at(t, loc=(bpos.x - offB.x, bpos.y - offB.y), face_deg=FACE); sis.at(t, loc=(spos.x - offS.x, spos.y - offS.y), face_deg=FACE)
        ph = int(t / STEP) % 4
        walk_b = E.P_walk(ph); walk_s = E.P_walk((ph + 2) % 4)
        rig_b.legs = {k: v for k, v in walk_b.items() if "Leg" in k}; rig_s.legs = {k: v for k, v in walk_s.items() if "Leg" in k}
        rig_b.body(t, {}, (0, 8, 2)); rig_s.body(t, {}, (0, -8, -6))
        hb = wpt(boy, "RightHand"); hs = wpt(sis, "LeftHand")
        meet = Vector(((hb.x + hs.x) / 2, (hb.y + hs.y) / 2, wpt(boy, "RightArm").z - 0.006))
        ab = ik_arm(boy, "Right", meet, rig_b.pole["Right"]); as_ = ik_arm(sis, "Left", meet + Vector((0, 0, 0.0015)), rig_s.pole["Left"])
        rig_b.body(t, ab, (0, 8, 2)); rig_s.body(t, as_, (0, -8, -6))
        gap = wpt(boy, "RightHandMiddle1") - wpt(sis, "LeftHandMiddle1")
        as_ = ik_arm(sis, "Left", meet + Vector((0, 0, 0.0015)) + gap, rig_s.pole["Left"])
        swing_b = {k: v for k, v in walk_b.items() if k.startswith("Left") and "Arm" in k}
        swing_s = {k: v for k, v in walk_s.items() if k.startswith("Right") and "Arm" in k}
        rig_b.body(t, {**ab, **swing_b}, (0, 8, 2)); rig_s.body(t, {**as_, **swing_s}, (0, -8, -6))
        curl(boy, "Right", G_CUP); curl(sis, "Left", G_CUP); key_hand(boy, "Right", fr); key_hand(sis, "Left", fr)
        if fr % 12 == 0:
            print("CONTACT EG2 t=%.2f hands_apart %.4f" % (t, (wpt(boy, "RightHandMiddle1") - wpt(sis, "LeftHandMiddle1")).length), flush=True)
    boy.finish(); sis.finish()
    mid = P0 + fwd * (SPEED * 2.0)
    aim = Vector((mid.x, mid.y, FLOOR + 0.050))
    cam_move(40, aim + Vector((0.05, -0.36, 0.05)), aim, aim + Vector((0.07, -0.34, 0.048)), aim + Vector((0.02, -0.02, 0)), focus=aim)
    view_report("EG2", [("boy", lambda: wpt(boy, "Head")), ("sister", lambda: wpt(sis, "Head"))])

else:
    # EG4: at the gate, his back half to the camera; both hands pull the straps down twice
    FACE = 155.0
    CLOCK = (0.0, 0.150 - 0.0075, FLOOR + 0.112)
    wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 7, 30, r=0.016)
    boy = E.Char("egypt_boy", (0.30, -0.15), FACE, height=KID * 1.04); M_ = metrics(boy)
    rig_b = Rig(boy, M_, FACE, (0, 0, 0), hips_xy=(0.010, 0.095))
    chest = wear_bag(boy, M_)
    rig_b.learn_hands()
    for fr in E.frames():
        t = fr / E.FPS
        u = 0.5 - 0.5 * math.cos(2 * math.pi * min(1.0, max(0.0, (t - 0.5) / 1.4)) * 2)     # two pulls
        arms = {}
        for s_, p_ in (("Right", chest[0]), ("Left", chest[1])):
            arms.update(ik_arm(boy, s_, p_ - Vector((0, 0, 0.0020 * u)), rig_b.pole[s_]))
        rig_b.body(t, arms, (0, 0, 6))
        for s_ in ("Right", "Left"): curl(boy, s_, G_CUP); key_hand(boy, s_, fr)
    boy.finish()
    hz = wpt(boy, "Spine2")
    aim = Vector((hz.x, hz.y, FLOOR + 0.055))
    cam_move(45, aim + Vector((-0.08, -0.30, 0.035)), aim, aim + Vector((-0.07, -0.28, 0.032)), aim + Vector((0, 0.01, 0)), focus=hz)
    view_report("EG4", [("bag", lambda: wpt(boy, "Spine2")), ("clock", CLOCK), ("head", lambda: wpt(boy, "Head"))])

print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
'''
from point_snip import SNIP          # 11/23 natural palm-up point (teacher)
BUILD = BUILD.replace("\nL_, Fl, R_ = E.lights(", SNIP + "L_, Fl, R_ = E.lights(", 1); assert "def point_hand" in BUILD
out = HEAD + "\n" + body + BUILD
out.encode("ascii")
(HERE / "egypt_school.py").write_text(out, encoding="utf-8", newline="\n")
print("wrote egypt_school.py", len(out.splitlines()), "lines")
