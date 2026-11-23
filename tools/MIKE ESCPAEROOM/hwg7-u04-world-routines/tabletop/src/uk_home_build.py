# Builds tabletop/src/uk_home.py (he/she UK: "He goes home at three fifteen.") from kenya_morning.py (helpers + hand rig reused).
#   python tabletop/src/uk_home_build.py
# The snack and the homework that follow re-use the accepted I-version uk_homework.py frames (K4 tea, K3 writing): no new render.
from pathlib import Path

HERE = Path(__file__).resolve().parent
src = (HERE / "kenya_morning.py").read_text(encoding="utf-8").split("\n")
start = next(i for i, l in enumerate(src) if l.startswith("import sys, os, math"))
stop = next(i for i, l in enumerate(src) if l.startswith("# ================= build"))
body = "\n".join(src[start:stop])
old = '''DUR = {"KE1": 5.6, "KE2": 3.8, "KE3": 3.0, "KE4": 9.0}
VOICE = {"q": 0.4, "a": 2.6, "dark": 2.3, "gm": 1.5, "a4": 0.3, "tea1": 2.7, "tea2": 6.3}'''
old = '''DUR = {"KE1": 5.6, "KE2": 3.8, "KE3": 3.0, "KE4": 9.0}
VOICE = {"q": 0.5, "a": 2.6, "dark": 2.3, "gm": 1.5, "a4": 0.3, "tea1": 2.7, "tea2": 6.3}
# planned contact times (seconds in the shot) used by kenya_compose.py for the little sounds; the CONTACT lines print the real ones
EVENTS = {"click": 1.0, "sip": 2.9, "cup_down": 4.95, "bite": 6.9, "plate": 8.25}'''
new = '''DUR = {"UK1": 7.4, "UK2": 3.4, "UK3": 4.0}
VOICE = {"q": 0.4, "a": 4.4, "ends": 0.3, "dad": 0.3}
EVENTS = {}'''
assert old in body; body = body.replace(old, new)

HEAD = '''# World Routines Trip, he/she version - UK station "He goes home at three fifteen." (tabletop style H)
# Spec: MIKE ESCPAEROOM/rdq/RDQ-spec-world-routines-he-she-20261123.md; teacher 11/23: dad is a new Tripo model (uk_dad).
#   SHOT: UK1 (7.4 s) outside the primary school gate (brick pillars, black railings, red-brick school with a 3:15 clock); Oliver
#             (uk_boy) stands at the gate and points at the clock with the clock-side hand; his dad waits beside him.
#             "This is Oliver. What time does he go home?" / "He goes home at three fifteen."
#         UK2 (3.4 s) the school clock close-up at 3:15 (a bell rings in the sound). "School ends at three fifteen."
#         UK3 (4.0 s) dad and Oliver walk along the pavement towards the front right, holding hands (dad's LEFT hand and
#             Oliver's RIGHT hand meet; both arms reach the same point every frame). "His dad walks him home."
#   then the I-version K4 (tea and a biscuit) and K3 (writing) frames: "He has a snack, and then he does his homework."
# Models: uk_boy, uk_dad (Tripo 11/23). Everything else is made here.
# ASCII only: colab exec reads files with cp950 on Windows.'''

BUILD = r'''

# ================= build (UK he/she) =================
# check (11/23): a bone matrix set by the hand helpers can leave a location / scale on a bone that is not keyed -> a long skin
# spike in every frame. Clear them before the character is finalised.
_fin0 = E.Char.finish
def _fin(self):
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    _fin0(self)
E.Char.finish = _fin

def wall_clock(cx, cy, cz, hh, mm, r=0.020):
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.10, 0.10, 0.12), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.99, 0.98, 0.94), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.05, 0.05, 0.06), 0.5)
    for k in range(12):
        a = math.radians(k * 30)
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0012 if k % 3 == 0 else 0.0007), ink, "tick")
    hand_box(cx, cy - 0.0047, cz, math.radians(((hh % 12) + mm / 60.0) * 30), 0.42 * r, 0.0020, ink, "hourHand")
    hand_box(cx, cy - 0.0053, cz, math.radians(mm * 6), 0.64 * r, 0.0013, ink, "minuteHand")
    E.ball((cx, cy - 0.0055, cz), 0.0013, E.mat("clockPin", (0.80, 0.10, 0.08), 0.4), "clockPin")


def school_street():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("pavement", (0.62, 0.62, 0.60)), "pavement", thick=FLOOR)
    line = E.mat("slabLine", (0.50, 0.50, 0.48), 0.9)
    for i in range(1, 16): E.box((-0.32 + i * 0.04, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), line, "slabX", bevel=0)
    for j in range(1, 11): E.box((0, -0.19 + j * 0.04, FLOOR + 0.0002), (0.64, 0.0008, 0.0004), line, "slabY", bevel=0)
    brick = E.felt("brick", (0.62, 0.24, 0.16)); mortar = E.mat("mortar", (0.80, 0.76, 0.70), 0.9)
    E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), brick, "schoolWall")
    for j in range(1, 24): E.box((0, WALL_Y - 0.0065, FLOOR + j * 0.010), (0.64, 0.0008, 0.0006), mortar, "mortar", bevel=0)
    for k in range(-2, 3):                       # white sash windows of the school
        E.box((k * 0.11, WALL_Y - 0.0068, FLOOR + 0.150), (0.050, 0.002, 0.060), E.felt("winWhite", (0.95, 0.95, 0.93)), "schoolWin", bevel=0)
        E.box((k * 0.11, WALL_Y - 0.0080, FLOOR + 0.150), (0.042, 0.002, 0.052), E.mat("winGlass", (0.35, 0.50, 0.62), 0.1), "schoolGlass", bevel=0)
    # railings and the gate in front of the school (open gate leaves)
    GY = 0.150; iron = E.mat("iron", (0.05, 0.05, 0.06), 0.4)
    for x in [i * 0.012 for i in range(-26, 27)]:
        if abs(x) < 0.030: continue
        E.cyl((x, GY, FLOOR + 0.022), 0.0008, 0.044, iron, verts=6, name="rail")
    for z in (FLOOR + 0.008, FLOOR + 0.040):
        for sx in (-1, 1): E.box((sx * 0.17, GY, z), (0.28, 0.0016, 0.0016), iron, "railBar", bevel=0)
    for sx in (-1, 1):
        E.box((sx * 0.036, GY, FLOOR + 0.030), (0.012, 0.012, 0.060), brick, "gatePost", bevel=0.001)
        E.box((sx * 0.036, GY, FLOOR + 0.062), (0.015, 0.015, 0.004), E.felt("postCap", (0.80, 0.78, 0.72)), "postCap", bevel=0.0008)
    E.box((0, 0.05, FLOOR + 0.0004), (0.64, 0.10, 0.0008), E.felt("pathTarmac", (0.30, 0.30, 0.32)), "road", bevel=0)
    E.box((0, -0.06, FLOOR + 0.0004), (0.64, 0.12, 0.0006), E.felt("road2", (0.24, 0.24, 0.26)), "road2", bevel=0)


boy = E.Char("uk_boy", (0.30, -0.15), 0, height=KID * 1.04)
M_ = metrics(boy)
ch = boy
school_street()
CLOCK = (0.060, WALL_Y - 0.0065, FLOOR + 0.100)     # check 1: was above the picture
wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 3, 15)
L_, Fl, R_ = E.lights(lamp=0.40)
bpy.ops.object.light_add(type="AREA", location=(-0.2, -0.2, 0.40)); sun = bpy.context.object
sun.data.energy = 2.0; sun.data.color = (1.0, 0.95, 0.85); sun.data.size = 0.5; sun.rotation_euler = (math.radians(30), math.radians(-20), 0)
DAD_H = KID * 1.55
have_dad = os.path.exists(f"{PROPS}/uk_dad.glb")
dad = E.Char("uk_dad" if have_dad else "uk_boy", (0.30, -0.30), 0, height=DAD_H if have_dad else KID * 1.04)
MD = metrics(dad)
rig_b = Rig(boy, M_, 0, (0, 0, 0), hips_xy=(0.010, 0.120))
rig_d = Rig(dad, MD, 0, (0, 0, 0), hips_xy=(-0.030, 0.124))

if SHOT == "UK1":
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
            arms, head = {}, (0, -10, 4)                    # looks up at dad
        rig_b.body(t, arms, head)
        if t >= ans0 - 0.15: point_hand(boy, side, CLOCK); curl_hinge(boy, side, G_POINT, fingers=FOUR); tuck_thumb(boy, side)
        else: rest_hand(boy, side)
        key_hand(boy, side, fr)
        rig_d.body(t, {}, (0, 12, -10))                     # dad looks down at him
    boy.finish(); dad.finish()
    aim = Vector((0.0, 0.13, FLOOR + 0.075))
    cam_move(42, aim + Vector((-0.02, -0.42, 0.04)), aim, aim + Vector((-0.012, -0.38, 0.036)), aim, focus=wpt(boy, "Head"))
    view_report("UK1", [("clock", CLOCK), ("boy", lambda: wpt(boy, "Head")), ("dad", lambda: wpt(dad, "Head"))])

elif SHOT == "UK2":
    for fr in E.frames():
        t = fr / E.FPS; rig_b.body(t, {}, (0, 0, 2)); rig_d.body(t, {}, (0, 0, 0))
    boy.finish(); dad.finish()
    aim = Vector(CLOCK)
    cam_move(85, aim + Vector((0.0, -0.17, -0.02)), aim, aim + Vector((0.0, -0.16, -0.02)), aim, focus=aim)
    for cd in bpy.data.cameras: cd.dof.use_dof = False
    view_report("UK2", [("clock", CLOCK)])

else:
    # UK3: walking together towards the front right, holding hands
    FACE = 35.0; a = math.radians(FACE); fwd = Vector((math.sin(a), -math.cos(a), 0))     # face_deg rotates -y towards +x
    left = Vector((math.cos(a), math.sin(a), 0))                                            # the walkers' own left (+x when facing -y)
    P0 = Vector((-0.07, 0.105, 0)); SPEED = 0.032        # check 1: they walked behind the railings and hardly moved                                            # metres per second (chibi steps)
    STEP = 0.36                                                                             # seconds per step phase
    boy.at(0, face_deg=FACE); dad.at(0, face_deg=FACE)
    offB = M_["hips"] - M_["root"]; offD = MD["hips"] - MD["root"]
    for fr in E.frames():
        t = fr / E.FPS
        c = P0 + fwd * (SPEED * t)
        bpos = c + left * 0.010; dpos = c - left * 0.013                                  # boy on dad's left: boy's RIGHT hand meets dad's LEFT
        boy.at(t, loc=(bpos.x - offB.x, bpos.y - offB.y), face_deg=FACE); dad.at(t, loc=(dpos.x - offD.x, dpos.y - offD.y), face_deg=FACE)
        ph = int(t / STEP) % 4
        walk_b = E.P_walk(ph); walk_d = E.P_walk((ph + 2) % 4)
        rig_b.legs = {k: v for k, v in walk_b.items() if "Leg" in k}; rig_d.legs = {k: v for k, v in walk_d.items() if "Leg" in k}
        rig_b.body(t, {}, (0, 8, 2)); rig_d.body(t, {}, (0, -8, -8))
        hb = wpt(boy, "RightHand"); hd = wpt(dad, "LeftHand")
        meet = Vector(((hb.x + hd.x) / 2, (hb.y + hd.y) / 2, wpt(boy, "RightArm").z - 0.006))   # a little below the boy's shoulder
        ab = ik_arm(boy, "Right", meet, rig_b.pole["Right"]); ad = ik_arm(dad, "Left", meet + Vector((0, 0, 0.0015)), rig_d.pole["Left"])
        rig_b.body(t, ab, (0, 8, 2)); rig_d.body(t, ad, (0, -8, -8))
        gap = wpt(boy, "RightHandMiddle1") - wpt(dad, "LeftHandMiddle1")          # check 1: wrists met but the hands were 4.6 mm apart
        ad = ik_arm(dad, "Left", meet + Vector((0, 0, 0.0015)) + gap, rig_d.pole["Left"])
        swing_b = {k: v for k, v in walk_b.items() if k.startswith("Left") and "Arm" in k}
        swing_d = {k: v for k, v in walk_d.items() if k.startswith("Right") and "Arm" in k}
        rig_b.body(t, {**ab, **swing_b}, (0, 8, 2)); rig_d.body(t, {**ad, **swing_d}, (0, -8, -8))
        curl(boy, "Right", G_CUP); curl(dad, "Left", G_CUP); key_hand(boy, "Right", fr); key_hand(dad, "Left", fr)
        if fr % 12 == 0:
            print("CONTACT UK3 t=%.2f hands_apart %.4f" % (t, (wpt(boy, "RightHandMiddle1") - wpt(dad, "LeftHandMiddle1")).length), flush=True)
    boy.finish(); dad.finish()
    mid = P0 + fwd * (SPEED * 2.0)
    aim = Vector((mid.x, mid.y, FLOOR + 0.050))
    cam_move(40, aim + Vector((0.05, -0.36, 0.05)), aim, aim + Vector((0.07, -0.34, 0.048)), aim + Vector((0.02, -0.02, 0)), focus=aim)
    view_report("UK3", [("boy", lambda: wpt(boy, "Head")), ("dad", lambda: wpt(dad, "Head"))])

print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
'''
from point_snip import SNIP          # 11/23 natural palm-up point (teacher)
BUILD = BUILD.replace("\nrig_b = Rig(", SNIP + "rig_b = Rig(", 1); assert "def point_hand" in BUILD
out = HEAD + "\n" + body + BUILD
out.encode("ascii")
(HERE / "uk_home.py").write_text(out, encoding="utf-8", newline="\n")
print("wrote uk_home.py", len(out.splitlines()), "lines")
