# Builds tabletop/src/india_cricket.py (he/she India: "He plays cricket at five o'clock.") from kenya_morning.py (helpers + rig).
#   python tabletop/src/india_cricket_build.py
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
assert old in body
body = body.replace(old, '''DUR = {"IN1": 7.4, "IN2": 4.4, "IN3": 3.4, "IN4": 3.6}
VOICE = {"q": 0.4, "a": 4.5}
EVENTS = {"hit": 1.55}''')
HEAD = '''# World Routines Trip, he/she version - India station "He plays cricket at five o'clock." (tabletop style H)
#   IN1 (7.4 s) a lane between houses in the late afternoon, a 5:00 clock on a shop wall; Arjun (india_boy) holds a cricket bat in his
#       RIGHT hand (bat down beside his leg) and points at the clock with the clock-side hand. "This is Arjun. What time does he play cricket?"
#   IN2 (4.4 s) batting: the bat goes back, a tennis ball comes in from the right (thrown by a friend off screen), the bat meets it,
#       the ball flies back out to the right. "He plays cricket with his friends in the street."
#   IN3 (3.4 s) close-up behind him: his school bag stands upright as the wicket. "A school bag is the wicket!"
#   IN4 (3.6 s) the shop clock runs from 5:00 to 6:30. "He goes home at six thirty."
# Models: india_boy. Everything else is made here. ASCII only.'''
BUILD = r'''

# ================= build (India he/she) =================
# check (11/23): a bone matrix set by the hand helpers can leave a location / scale on a bone that is not keyed -> a long skin
# spike in every frame. Clear them before the character is finalised.
_fin0 = E.Char.finish
def _fin(self):
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    _fin0(self)
E.Char.finish = _fin

def wall_clock(cx, cy, cz, hh, mm, r=0.018, minute_keys=None):
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.75, 0.55, 0.10), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.99, 0.98, 0.94), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.05, 0.05, 0.06), 0.5)
    for k in range(12):
        a = math.radians(k * 30)
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0011 if k % 3 == 0 else 0.0007), ink, "tick")
    hp = E.empty("hourPivot"); hp.location = (cx, cy - 0.0047, cz); hp.rotation_mode = "XYZ"
    mp = E.empty("minPivot"); mp.location = (cx, cy - 0.0053, cz); mp.rotation_mode = "XYZ"
    E.box((0, 0, 0.21 * r), (0.0020, 0.001, 0.42 * r), ink, "hourHand", bevel=0).parent = hp
    E.box((0, 0, 0.32 * r), (0.0013, 0.001, 0.64 * r), ink, "minuteHand", bevel=0).parent = mp
    keys = minute_keys or [(0.0, hh * 60 + mm), (99.0, hh * 60 + mm)]
    for fr in E.frames():
        t = fr / E.FPS; m = keys[-1][1]
        for (t0, m0), (t1, m1) in zip(keys, keys[1:]):
            if t <= t0: m = m0; break
            if t0 <= t <= t1: m = m0 + (m1 - m0) * E.ease((t - t0) / max(1e-6, t1 - t0)); break
        mp.rotation_euler = (0, math.radians((m % 60) * 6), 0); hp.rotation_euler = (0, math.radians(((m / 60.0) % 12) * 30), 0)
        mp.keyframe_insert("rotation_euler", frame=fr); hp.keyframe_insert("rotation_euler", frame=fr)
    E.constant(mp); E.constant(hp)


def lane():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("dust", (0.72, 0.58, 0.42)), "lane", thick=FLOOR)
    cols = ((0.95, 0.80, 0.45), (0.55, 0.78, 0.80), (0.92, 0.60, 0.55), (0.80, 0.85, 0.55))
    for k, c in enumerate(cols):
        x = -0.24 + k * 0.16
        E.box((x, WALL_Y, FLOOR + 0.11), (0.155, 0.012, 0.22), E.felt("house%d" % k, c), "house", bevel=0.001)
        E.box((x - 0.03, WALL_Y - 0.0068, FLOOR + 0.040), (0.026, 0.002, 0.050), E.felt("door%d" % k, (0.35, 0.22, 0.12)), "door", bevel=0)
        E.box((x + 0.035, WALL_Y - 0.0068, FLOOR + 0.130), (0.030, 0.002, 0.030), E.felt("win%d" % k, (0.30, 0.40, 0.55)), "window", bevel=0)
    E.box((0.03, WALL_Y - 0.012, FLOOR + 0.095), (0.06, 0.012, 0.003), E.felt("awning", (0.85, 0.20, 0.15)), "shopAwning", bevel=0)
    E.box((0, 0.62, 0.30), (1.4, 0.004, 0.70), E.emission("eveSky", (1.0, 0.80, 0.55), 1.3), "sky", bevel=0)


ch = E.Char("india_boy", (0.30, -0.15), 0, height=KID * 1.04)
M_ = metrics(ch)
lane()
CLOCK = (0.06, WALL_Y - 0.0045, FLOOR + 0.125)
mk = [(0.0, 300), (0.5, 300), (3.0, 390), (9.0, 390)] if SHOT == "IN4" else None
wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 5, 0, minute_keys=mk)
L_, Fl, R_ = E.lights(lamp=0.40)
bpy.ops.object.light_add(type="AREA", location=(0.25, -0.15, 0.30)); sun = bpy.context.object
sun.data.energy = 2.4; sun.data.color = (1.0, 0.85, 0.65); sun.data.size = 0.4; sun.rotation_euler = (math.radians(40), math.radians(35), 0)
HX, HY = -0.01, 0.140
rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(HX, HY))
rig.learn_hands(HEAD0)
# the bat: willow blade + taped handle, empty at the grip, local -z down the blade (blade face towards local -y)
bat = E.empty("bat"); bat.rotation_mode = "XYZ"
BL, BW = 0.0180, 0.0042
E.box((0, 0, -0.0045 - BL / 2), (BW, 0.0014, BL), E.felt("willow", (0.78, 0.58, 0.32)), "batBlade", bevel=0.0004).parent = bat
E.cyl((0, 0, 0.0012), 0.00055, 0.0115, E.felt("batGrip", (0.15, 0.15, 0.55)), verts=10, name="batGrip").parent = bat      # longer handle: two fists
# school bag standing upright behind him (the wicket)
BAG = Vector((HX + 0.004, HY + 0.018, FLOOR))
E.box((BAG.x, BAG.y, FLOOR + 0.0085), (0.010, 0.006, 0.017), E.felt("schoolBag", (0.15, 0.30, 0.65)), "schoolBag", bevel=0.0012)
E.box((BAG.x, BAG.y - 0.0031, FLOOR + 0.0080), (0.007, 0.0008, 0.007), E.felt("bagPocket", (0.12, 0.24, 0.55)), "bagPocket", bevel=0.0005)
ball = E.ball((0, 0, 0), 0.0016, E.felt("tennisBall", (0.85, 0.95, 0.20)), "tennisBall")

q_g = hand_q(ch, "Right", Vector((0.0, 1, -0.2)), Vector((1, 0, 0)))      # teacher 11/23: the bottom (right) hand turned half a turn ABOUT THE HANDLE: palm and inner wrist towards the ball (+x), thumb still up
G_BAT = {"Thumb": (30, 30, 20), "Index": (62, 72, 45), "Middle": (64, 74, 46), "Ring": (66, 74, 46), "Pinky": (68, 74, 46)}
def bat_fist(side="Right"):          # tight grip: hinge curls (curl() flips past 90 deg)
    for b_ in ["%sHand%s%d" % (side, f_, k_) for f_ in ("Thumb", "Index", "Middle", "Ring", "Pinky") for k_ in (1, 2, 3)]:
        if b_ in ch.pb: ch.pb[b_].rotation_quaternion = (1, 0, 0, 0)
    curl_hinge(ch, side, G_BAT)
rig.body(0, {}, HEAD0); set_hand_rot(ch, "Right", q_g); bat_fist(); Mh = hand_M(ch, "Right")
# the handle sits INSIDE the curled fingers: centre of the loop knuckle -> fingertip, over index / middle / ring
gp = sum(((wpt(ch, "RightHand%s1" % f_) + wpt(ch, "RightHand%s3" % f_, True)) / 2 for f_ in ("Index", "Middle", "Ring")), Vector()) / 3
print("DESK BATGRIP loop centre %s, knuckle-to-tip gap %.4f (handle diameter 0.0011)" % (tuple(round(v, 4) for v in gp), (wpt(ch, "RightHandMiddle1") - wpt(ch, "RightHandMiddle3", True)).length), flush=True)
acr = world_vec(ch, hand_frame(ch, "Right")[2])
zb = -acr if (-acr).z > 0 else acr                                         # handle always runs UP out of the fist (blade below)
print("DESK BATHAND right palm %s fwd %s (palm must face +x = the ball)" % (tuple(round(v, 2) for v in world_vec(ch, hand_frame(ch, "Right")[3])), tuple(round(v, 2) for v in world_vec(ch, hand_frame(ch, "Right")[1]))), flush=True)
C_BAT = Mh.inverted() @ frame_M(gp, zb, Vector((0, -1, 0)))           # handle runs across the fist, blade below the little finger
SHR = wpt(ch, "RightArm")
# teacher 11/23: cricket is batted with TWO hands. Right hand = bottom hand (at the bat origin), left hand = top hand, one fist higher.
HAND_GAP = 0.0036
q_gl = hand_q(ch, "Left", Vector((0.0, -1, -0.2)), Vector((-1, 0, 0)))
rig.body(0, {}, HEAD0); set_hand_rot(ch, "Left", q_gl); bat_fist("Left"); MhL = hand_M(ch, "Left")
gpl = sum(((wpt(ch, "LeftHand%s1" % f_) + wpt(ch, "LeftHand%s3" % f_, True)) / 2 for f_ in ("Index", "Middle", "Ring")), Vector()) / 3
acrl = world_vec(ch, hand_frame(ch, "Left")[2])
C_BAT_L = MhL.inverted() @ (frame_M(gpl, -acrl, Vector((0, -1, 0))) @ Matrix.Translation((0, 0, -HAND_GAP)))
def two_hands(Mb): return rig.from_prop("Right", Mb, C_BAT, G_CUP), rig.from_prop("Left", Mb, C_BAT_L, G_CUP)
def fists(fr, both=True):
    bat_fist("Right"); key_hand(ch, "Right", fr)
    if both: bat_fist("Left"); key_hand(ch, "Left", fr)


def bat_M(pitch_deg, yaw_deg=0.0, lift=0.0, dx=0.0):
    """Bat held in front of his right thigh, blade down. pitch swings it across the picture: - = backlift (blade up towards
    his right, screen left), + = follow-through towards the ball side (his left, screen right)."""
    M = Matrix.Translation(Vector(((SHR.x + 0.002) if SHOT == "IN1" else (HX - 0.0015 + dx), HY - (0.009 if SHOT == "IN1" else 0.0118), SHR.z - (0.016 if SHOT == "IN1" else 0.0110) + lift))) @ Matrix.Rotation(math.radians(yaw_deg), 4, "Z") @ Matrix.Rotation(math.radians(-pitch_deg), 4, "Y")
    return M


if SHOT == "IN1":
    ans0, ans1 = VOICE["a"], VOICE["a"] + 2.2
    pt = Vector(local_dir((HX, HY), 0, CLOCK, wpt(ch, "LeftArm").z)).normalized()
    pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    for fr in E.frames():
        t = fr / E.FPS
        tr = rig.from_prop("Right", bat_M(0), C_BAT, G_CUP)
        extra = {b: v for b, v in E.P_point((pt.x, pt.y, pt.z + 0.06 * (int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0)), right=False).items() if b.startswith("Left")} if t >= ans0 - 0.15 else None
        rig.solve(t, fr, (0, 6, 6) if ans0 <= t < ans1 else (0, 0, -2), tr, None, extra=extra)
        if t >= ans0 - 0.15: curl_hinge(ch, "Left", G_POINT, fingers=("Index", "Middle", "Ring", "Pinky")); key_hand(ch, "Left", fr)
        bat_fist(); key_hand(ch, "Right", fr); set_M(bat, hand_M(ch, "Right") @ C_BAT, fr)
        ball.location = (0, 0, -1); ball.keyframe_insert("location", frame=fr)
    ch.finish(); E.constant(bat); E.constant(ball)
    aim = Vector((0.02, 0.13, FLOOR + 0.060))
    cam_move(44, aim + Vector((-0.01, -0.38, 0.04)), aim, aim + Vector((-0.006, -0.35, 0.036)), aim, focus=wpt(ch, "Head"))
elif SHOT == "IN2":
    HIT = EVENTS["hit"]
    SW = [(0.0, -8.0), (0.6, -78.0), (1.2, -78.0), (HIT, 8.0), (1.9, 48.0), (2.6, 28.0), (9.0, 0.0)]
    pitch = lambda t: lerp_keys([(a, Vector((b, 0, 0))) for a, b in SW], t).x
    contact = None
    for fr in E.frames():
        t = fr / E.FPS
        Mb_want = bat_M(pitch(t), yaw_deg=20, lift=0.004 * min(1.0, max(0.0, -pitch(t) / 78.0)) + 0.0030 * min(1.0, max(0.0, pitch(t) / 48.0)), dx=0.0050 * min(1.0, max(0.0, pitch(t) / 48.0)))      # the backlift also raises the hands
        rig.solve(t, fr, (0, 22, -2), *two_hands(Mb_want)); fists(fr)
        Mb = hand_M(ch, "Right") @ C_BAT; set_M(bat, Mb, fr)
        face = Mb @ Vector((0, -0.0006, -0.0045 - BL * 0.55))               # the sweet spot on the blade face
        if contact is None: contact = face.copy() if t >= HIT else None
        if t < HIT:                                                           # thrown from the right, low bounce, arriving at the sweet spot
            u = t / HIT; start = Vector((face.x - 0.12, face.y - 0.03, FLOOR + 0.03))
            start = Vector((HX + 0.16, HY - 0.012, FLOOR + 0.022))
            tgt = bat_M(8.0, yaw_deg=20, lift=0.0030 * 8 / 48, dx=0.0050 * 8 / 48) @ Vector((0, -0.0006, -0.0045 - BL * 0.55))
            p = start.lerp(tgt, u); p.z += 0.010 * math.sin(math.pi * u)
        else:
            d = t - HIT; p = contact + Vector((0.10 * d, -0.03 * d, 0.05 * d - 0.03 * d * d))
        ball.location = p; ball.keyframe_insert("location", frame=fr)
        if abs(t - HIT) < 0.05: print("CONTACT IN2 t=%.2f ball_to_blade %.4f" % (t, (p - face).length), flush=True)
    ch.finish(); E.constant(bat); E.constant(ball)
    aim = Vector((HX - 0.02, HY - 0.01, FLOOR + 0.040))
    cam_move(60, aim + Vector((0.05, -0.24, 0.03)), aim, aim + Vector((0.048, -0.23, 0.028)), aim, focus=wpt(ch, "Head"))      # check 1: closer, the bat reads
elif SHOT == "IN3":
    for fr in E.frames():
        t = fr / E.FPS
        rig.solve(t, fr, (0, 0, 0), *two_hands(bat_M(0)))
        fists(fr); set_M(bat, hand_M(ch, "Right") @ C_BAT, fr); ball.location = (0, 0, -1); ball.keyframe_insert("location", frame=fr)
    ch.finish(); E.constant(bat); E.constant(ball)
    aim = BAG + Vector((0, 0, 0.012))
    cam_move(70, aim + Vector((0.08, -0.12, 0.03)), aim, aim + Vector((0.07, -0.11, 0.028)), aim, focus=aim)
    for cd in bpy.data.cameras: cd.dof.use_dof = False
else:
    for fr in E.frames():
        t = fr / E.FPS; rig.solve(t, fr, (0, 0, 0), *two_hands(bat_M(0)))
        fists(fr); set_M(bat, hand_M(ch, "Right") @ C_BAT, fr); ball.location = (0, 0, -1); ball.keyframe_insert("location", frame=fr)
    ch.finish(); E.constant(bat); E.constant(ball)
    aim = Vector(CLOCK)
    cam_move(80, aim + Vector((-0.01, -0.16, 0.0)), aim, aim + Vector((-0.008, -0.15, 0.0)), aim, focus=aim)
    for cd in bpy.data.cameras: cd.dof.use_dof = False
view_report(SHOT, [("clock", CLOCK), ("head", lambda: wpt(ch, "Head")), ("bag", BAG)])
print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
'''
out = HEAD + "\n" + body + BUILD
out.encode("ascii")
(HERE / "india_cricket.py").write_text(out, encoding="utf-8", newline="\n")
print("wrote india_cricket.py")
