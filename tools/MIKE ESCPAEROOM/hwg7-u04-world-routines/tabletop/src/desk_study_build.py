# Builds the two he/she "sitting at a desk" films from kenya_morning.py (helpers + hand rig reused):
#   tabletop/src/singapore_study.py  "She studies English at four o'clock."  (Ling, tuition classroom)
#   tabletop/src/australia_homework.py "He does his homework at four forty-five." (Jack, kitchen table; plus the backyard football shot)
#   python tabletop/src/desk_study_build.py
# Shots (same names in both): D1 sits at the desk and points at the clock with the clock-side hand (question + answer);
#   D2 reads: the open book on the desk, both hands flat on its pages, head nods along the lines;
#   D3 writes: pencil in the RIGHT hand (tripod grip copied from the accepted uk_homework.py), left hand flat on the notebook,
#      the tip touches the paper and makes small strokes (the strokes are drawn as marks only where the tip touched);
#   D4 clock close-up, minute hand runs (Singapore 4:00 -> 6:00 "She goes home at six o'clock."; Australia 4:45 -> 5:05 "twenty minutes").
#   Australia also has D0: the backyard, he kicks the football (the ball moves only after his foot touches it).
from pathlib import Path

HERE = Path(__file__).resolve().parent
src = (HERE / "kenya_morning.py").read_text(encoding="utf-8").split("\n")
start = next(i for i, l in enumerate(src) if l.startswith("import sys, os, math"))
stop = next(i for i, l in enumerate(src) if l.startswith("# ================= build"))
BASE = "\n".join(src[start:stop])
OLD = '''DUR = {"KE1": 5.6, "KE2": 3.8, "KE3": 3.0, "KE4": 9.0}
VOICE = {"q": 0.5, "a": 2.6, "dark": 2.3, "gm": 1.5, "a4": 0.3, "tea1": 2.7, "tea2": 6.3}
# planned contact times (seconds in the shot) used by kenya_compose.py for the little sounds; the CONTACT lines print the real ones
EVENTS = {"click": 1.0, "sip": 2.9, "cup_down": 4.95, "bite": 6.9, "plate": 8.25}'''
assert OLD in BASE

STATIONS = {
    "singapore_study": dict(
        model="singapore_girl_school", height="KID * 1.04", hh=4, mm=0, end=(6, 0), wall=(0.92, 0.94, 0.86), floor=(0.62, 0.66, 0.70),
        desk=(0.85, 0.85, 0.82), chair=((0.20, 0.35, 0.65), (0.10, 0.20, 0.40)), book=(0.95, 0.55, 0.20), note=(0.30, 0.60, 0.90),
        dur='{"D1": 7.8, "D2": 4.0, "D3": 4.4, "D4": 3.6}', voice='{"q": 0.4, "a": 4.5}',
        head="Singapore station \"She studies English at four o'clock.\" - Ling (singapore_girl_school = singapore_girl_pyjamas recoloured) at an English class after school",
        extra="whiteboard"),
    "australia_homework": dict(
        model="australia_boy", height="KID * 1.04", hh=4, mm=45, end=(5, 5), wall=(0.96, 0.92, 0.80), floor=(0.70, 0.55, 0.38),
        desk=(0.80, 0.62, 0.42), chair=((0.70, 0.32, 0.12), (0.013, 0.033, 0.040)), book=(0.20, 0.55, 0.85), note=(0.95, 0.80, 0.25),
        dur='{"D0": 4.2, "D1": 8.0, "D2": 4.0, "D3": 4.4, "D4": 3.6}', voice='{"q": 0.4, "a": 4.6}',
        head="Australia station \"He does his homework at four forty-five.\" - Jack (australia_boy) at the kitchen table, after football in the backyard",
        extra="kitchen"),
}

BUILD = r'''

# ================= build (desk study, he/she) =================
# check (11/23): a bone matrix set by the hand helpers can leave a location / scale on a bone that is not keyed -> a long skin
# spike in every frame. Clear them before the character is finalised.
_fin0 = E.Char.finish
def _fin(self):
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    _fin0(self)
E.Char.finish = _fin

G_FLAT = {"Thumb": (5, 6, 4), "Index": (3, 5, 3), "Middle": (3, 5, 3), "Ring": (4, 6, 4), "Pinky": (5, 7, 4)}
G_PEN = {"Thumb": (20, 25, 15), "Index": (30, 28, 18), "Middle": (42, 38, 22), "Ring": (62, 60, 40), "Pinky": (68, 62, 42)}
PEN_L, PEN_R, PEN_GRIP, PEN_EL = 0.0090, 0.00035, 0.0022, math.radians(50)
PALM_WRITE = Vector((0.75, 0, -0.66))


def wall_clock(cx, cy, cz, hh, mm, r=0.020, minute_keys=None):
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.10, 0.10, 0.12), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.99, 0.99, 0.97), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.05, 0.05, 0.06), 0.5)
    for k in range(12):
        a = math.radians(k * 30)
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0012 if k % 3 == 0 else 0.0007), ink, "tick")
    hp = E.empty("hourPivot"); hp.location = (cx, cy - 0.0047, cz); hp.rotation_mode = "XYZ"
    mp = E.empty("minPivot"); mp.location = (cx, cy - 0.0053, cz); mp.rotation_mode = "XYZ"
    E.box((0, 0, 0.21 * r), (0.0020, 0.001, 0.42 * r), ink, "hourHand", bevel=0).parent = hp
    E.box((0, 0, 0.32 * r), (0.0013, 0.001, 0.64 * r), ink, "minuteHand", bevel=0).parent = mp
    E.ball((cx, cy - 0.0058, cz), 0.0013, E.mat("clockPin", (0.80, 0.10, 0.08), 0.4), "clockPin")
    keys = minute_keys or [(0.0, hh * 60 + mm), (99.0, hh * 60 + mm)]
    for fr in E.frames():
        t = fr / E.FPS; m = keys[-1][1]
        for (t0, m0), (t1, m1) in zip(keys, keys[1:]):
            if t <= t0: m = m0; break
            if t0 <= t <= t1: m = m0 + (m1 - m0) * E.ease((t - t0) / max(1e-6, t1 - t0)); break
        mp.rotation_euler = (0, math.radians((m % 60) * 6), 0); hp.rotation_euler = (0, math.radians(((m / 60.0) % 12) * 30), 0)
        mp.keyframe_insert("rotation_euler", frame=fr); hp.keyframe_insert("rotation_euler", frame=fr)
    E.constant(mp); E.constant(hp)


def room():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk0")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("floor", FLOOR_C), "floor", thick=FLOOR)
    E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("backWall", WALL_C), "backWall")
    for x in (-0.326, 0.326): E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", tuple(c * 0.92 for c in WALL_C)), "sideWall")
    if EXTRA == "whiteboard":
        E.box((-0.05, WALL_Y - 0.0068, FLOOR + 0.120), (0.12, 0.002, 0.060), E.felt("whiteboard", (0.98, 0.98, 0.98)), "whiteboard", bevel=0.0006)
        E.box((-0.05, WALL_Y - 0.0060, FLOOR + 0.120), (0.124, 0.002, 0.064), E.mat("wbFrame", (0.6, 0.6, 0.62), 0.3), "wbFrame", bevel=0)
        for k, col in enumerate(((0.9, 0.2, 0.2), (0.2, 0.4, 0.9), (0.2, 0.6, 0.3))):   # coloured doodles, no letters
            E.ball((-0.09 + 0.035 * k, WALL_Y - 0.0080, FLOOR + 0.125), 0.006, E.felt("doodle%d" % k, col), "doodle").scale = (1.4, 0.1, 0.5)
    else:
        E.box((-0.10, WALL_Y - 0.012, FLOOR + 0.020), (0.16, 0.022, 0.040), E.felt("kitchenBench", (0.95, 0.95, 0.92)), "kitchenBench", bevel=0.001)
        E.box((-0.10, WALL_Y - 0.012, FLOOR + 0.041), (0.165, 0.024, 0.003), E.felt("benchTop", (0.40, 0.40, 0.42)), "benchTop", bevel=0.0006)
        E.box((-0.10, WALL_Y - 0.0068, FLOOR + 0.100), (0.10, 0.002, 0.040), E.felt("splash", (0.70, 0.85, 0.90)), "splashback", bevel=0)


ch = E.Char(MODEL, (0.30, -0.15), 0, height=HEIGHT_K)
M_ = metrics(ch)
SEAT_UNDER = seat_under(ch, M_["thigh"]) - SINK
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
SEAT_Z = FLOOR + M_["knee_h"] - SEAT_UNDER
BX, BY = 0.040, 0.170
hips_z = SEAT_Z + SEAT_HIP
TOP_Z = hips_z + 0.40 * M_["sh_hips"]
DESK_BACK = BY - M_["front"] - 0.0012
DESK_D = 0.040
room()
CLOCK = (BX + 0.060, WALL_Y - 0.0045, FLOOR + 0.105)
mk = [(0.0, HH * 60 + MM), (0.6, HH * 60 + MM), (3.0, END[0] * 60 + END[1]), (9.0, END[0] * 60 + END[1])] if SHOT == "D4" else None
wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], HH, MM, minute_keys=mk)
E.box((BX, DESK_BACK - DESK_D / 2, TOP_Z - 0.0015), (0.075, DESK_D, 0.003), E.felt("deskTop", DESK_C), "deskTop", bevel=0.0008)
for sx in (-1, 1):
    for sy in (-1, 1):
        E.box((BX + sx * 0.034, DESK_BACK - DESK_D / 2 + sy * 0.016, (FLOOR + TOP_Z) / 2), (0.0025, 0.0025, TOP_Z - FLOOR - 0.003), E.felt("deskLeg", tuple(c * 0.8 for c in DESK_C)), "deskLeg", bevel=0)
build_code_chair(BX, BY - 0.010, SEAT_Z, 0.030, FLOOR, depth=0.022, wood_lin=CHAIR_C[0], cushion_lin=CHAIR_C[1], name="chair")
# the open book (D2) and the notebook (D3) lie in front of her / him; both always there
BOOK = Vector((BX + 0.0050, DESK_BACK - 0.010, TOP_Z))      # teacher 11/23: book on his LEFT, notebook on his RIGHT
for k, (dx, c) in enumerate(((-0.0055, (0.98, 0.97, 0.93)), (0.0055, (0.98, 0.97, 0.93)))):
    E.box((BOOK.x + dx, BOOK.y, BOOK.z + 0.0005), (0.0105, 0.0140, 0.0010), E.felt("page%d" % k, c), "bookPage", bevel=0.0002)
E.box((BOOK.x, BOOK.y, BOOK.z + 0.0002), (0.0225, 0.0150, 0.0004), E.felt("bookCover", BOOK_C), "bookCover", bevel=0.0002)
for j in range(5):
    for dx in (-0.0055, 0.0055):
        E.box((BOOK.x + dx, BOOK.y + 0.005 - j * 0.0025, BOOK.z + 0.00105), (0.008, 0.0004, 0.00005), E.mat("printLine", (0.25, 0.25, 0.3), 0.8), "printLine", bevel=0)
NOTE = Vector((BX - 0.0135, DESK_BACK - 0.008, TOP_Z))      # under the writing (right) hand: reaching across the chest put the upper arm inside the body      # check 1: the pencil tip did not reach the paper (7 mm)
E.box((NOTE.x, NOTE.y, NOTE.z + 0.0004), (0.0110, 0.0140, 0.0008), E.felt("notebook", NOTE_C), "notebook", bevel=0.0002)
E.box((NOTE.x, NOTE.y, NOTE.z + 0.00085), (0.0100, 0.0130, 0.0001), E.felt("notePaper", (0.99, 0.99, 0.97)), "notePaper", bevel=0)
L_, Fl, R_ = E.lights(lamp=0.40)


def make_pencil():
    emp = E.empty("pencil"); emp.rotation_mode = "XYZ"
    yellow = E.mat("pencilYellow", (0.95, 0.72, 0.08), 0.45); woodm = E.mat("pencilWood", (0.85, 0.66, 0.42), 0.7)
    lead = E.mat("graphite", (0.08, 0.08, 0.09), 0.35); pink = E.mat("eraser", (0.95, 0.5, 0.55), 0.8)
    parts = [E.cone((0, 0, 0.0003), 0.0, 0.00012, 0.0006, lead, verts=12, name="penLead"),
             E.cone((0, 0, 0.0011), 0.00012, PEN_R, 0.001, woodm, verts=12, name="penWood"),
             E.cyl((0, 0, (0.0016 + PEN_L - 0.0012) / 2), PEN_R, PEN_L - 0.0028, yellow, verts=6, name="penBody"),
             E.cyl((0, 0, PEN_L - 0.0003), PEN_R * 0.98, 0.0006, pink, verts=12, name="penEraser")]
    for o in parts: o.parent = emp
    return emp


pencil = make_pencil()
PEN_REST = frame_M(Vector((NOTE.x - 0.0075, NOTE.y, TOP_Z + PEN_R)), Vector((0, 1, 0)), Vector((1, 0, 0)))
set_M(pencil, PEN_REST, 0)

if SHOT == "D0":
    # the backyard: he kicks the football with his RIGHT foot; the ball rolls only after the foot touches it
    for o in list(bpy.data.objects):
        if o.name.startswith(("deskTop", "deskLeg", "chair", "bookPage", "bookCover", "printLine", "notebook", "notePaper", "pen", "clock", "tick", "hourHand", "minuteHand", "hourPivot", "minPivot", "kitchen", "benchTop", "splash", "backWall")):
            o.hide_render = True
    E.board((0, 0.03), (0.64, 0.44), E.felt("grass", (0.30, 0.55, 0.20)), "grass", thick=FLOOR + 0.0005)
    if os.path.exists(f"{PROPS}/australia_backyard.glb"):
        E.place(f"{PROPS}/australia_backyard.glb", 0.14, (0.10, 0.22, FLOOR))
    E.box((0, 0.62, 0.30), (1.4, 0.004, 0.70), E.emission("daySky", (0.55, 0.78, 1.0), 1.4), "sky", bevel=0)
    E.box((0, 0.30, FLOOR + 0.03), (0.64, 0.004, 0.06), E.felt("fence", (0.70, 0.55, 0.35)), "fence", bevel=0)
    rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(-0.02, 0.14))
    foot0 = None
    ball_r = 0.0035
    ball = E.ball((0, 0, 0), ball_r, E.felt("football", (0.97, 0.97, 0.97)), "football")
    for k in range(5): E.ball((0, 0, 0), ball_r * 0.33, E.felt("footballPatch", (0.08, 0.08, 0.08)), "patch%d" % k).parent = ball
    for k, p in enumerate(bpy.data.objects[n] for n in [o.name for o in ball.children]):
        a = k * 1.256; p.location = (ball_r * 0.92 * math.cos(a), ball_r * 0.92 * math.sin(a) * 0.5, ball_r * 0.92 * (0.4 if k % 2 else -0.3))
    kicked = None
    for fr in E.frames():
        t = fr / E.FPS
        u = 0.0 if t < 0.8 else (E.ease((t - 0.8) / 0.4) if t < 1.2 else max(0.0, 1.0 - E.ease((t - 1.5) / 0.5)))
        back = 0.0 if t < 0.5 else (E.ease((t - 0.5) / 0.3) if t < 0.8 else 0.0)
        rig.legs = {"RightUpLeg": (-0.12, -0.9 * u + 0.5 * back, -1), "RightLeg": (0, -0.6 * u + 0.4 * back, -1)}
        rig.body(t, {"LeftArm": (0.75, -0.2, -0.45), "RightArm": (-0.75, 0.2, -0.45)}, (0, 0, -6 if t < 1.3 else 2))
        toe = wpt(ch, "RightToeBase") if "RightToeBase" in ch.pb else wpt(ch, "RightFoot")
        if foot0 is None: foot0 = Vector((toe.x, toe.y - 0.004, FLOOR + ball_r))
        if kicked is None and (toe - foot0).length < ball_r + 0.0012 and t > 0.8:
            kicked = t; print("CONTACT D0 kick t=%.2f toe_to_ball %.4f" % (t, (toe - foot0).length), flush=True)
        if kicked is None: bl = foot0
        else:
            d = t - kicked; bl = foot0 + Vector((0.02 * d, -0.06 * d, 0.012 * math.sin(min(math.pi, d * 3.0))))
        ball.location = bl; ball.rotation_euler = (-(0 if kicked is None else (t - kicked) * 12), 0, 0)
        ball.keyframe_insert("location", frame=fr); ball.keyframe_insert("rotation_euler", frame=fr)
    ch.finish(); E.constant(ball)
    if kicked is None: print("CONTACT D0 WARN the foot never touched the ball", flush=True)
    aim = Vector((-0.01, 0.12, FLOOR + 0.040))
    cam_move(45, aim + Vector((0.03, -0.32, 0.03)), aim, aim + Vector((0.035, -0.30, 0.028)), aim, focus=wpt(ch, "Head"))

else:
    hy = BY
    rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(BX, hy))
    rig.learn_hands(HEAD0)
    mouth0 = mouth(ch)
    if SHOT == "D1":
        ans0, ans1 = VOICE["a"], VOICE["a"] + 2.2
        pt = Vector(local_dir((BX, hy), 0, CLOCK, wpt(ch, "LeftArm").z)).normalized()
        pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
        lap_r = {k: v for k, v in P_LAP.items() if k.startswith("Right")}
        for fr in E.frames():
            t = fr / E.FPS
            if t >= ans0 - 0.15:
                k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
                arms = dict(lap_r); arms.update({b: v for b, v in E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=False).items() if b.startswith("Left")})
                head = (0, 6, 6) if t < ans1 else (0, 0, 2)
            else:
                arms, head = {}, (0, 0, -8)
            rig.body(t, arms, head)
            if t >= ans0 - 0.15: curl_hinge(ch, "Left", G_POINT, fingers=("Index", "Middle", "Ring", "Pinky")); key_hand(ch, "Left", fr)
        ch.finish()
        aim = Vector((BX + 0.020, BY - 0.02, FLOOR + 0.058))
        cam_move(46, aim + Vector((-0.01, -0.36, 0.05)), aim, aim + Vector((-0.006, -0.33, 0.045)), aim, focus=mouth0)
    elif SHOT == "D2":
        # reading: both hands flat on the pages, head nods down the lines
        RR = rig.rest("Right", (BOOK.x - 0.0055, BOOK.y - 0.004, BOOK.z + 0.0011), (0.25, -1, -0.05))
        RL = rig.rest("Left", (BOOK.x + 0.0055, BOOK.y - 0.004, BOOK.z + 0.0011), (-0.25, -1, -0.05))
        for fr in E.frames():
            t = fr / E.FPS
            rig.solve(t, fr, (0, 3 * math.sin(t * 2.0), -16 + 2 * math.sin(t * 3.0)), RR, RL)
        ch.finish()
        aim = Vector((BX - 0.002, BY - 0.012, FLOOR + 0.050))
        cam_move(60, aim + Vector((-0.03, -0.24, 0.06)), aim, aim + Vector((-0.028, -0.23, 0.056)), aim, focus=mouth0)
    elif SHOT == "D3":
        SHR = wpt(ch, "RightArm")
        q_w = hand_q(ch, "Right", Vector((0.2, -1, -0.4)), PALM_WRITE)
        Mh = rig.calibrate("Right", q_w, G_PEN)
        tri_c = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex3", True) + wpt(ch, "RightHandMiddle3", True)) / 3
        web = (wpt(ch, "RightHandThumb2") + wpt(ch, "RightHandIndex1")) / 2
        palm_w = ch.arm.matrix_world.to_3x3().normalized() @ hand_frame(ch, "Right")[3]
        # teacher 11/23: the pencil ran through the web between thumb and index. The shaft must REST ON the web: move the
        # web end of the shaft out of the skin (towards the back of the hand) until no skin vertex is closer than PEN_R.
        SKIN = [v_ for v_ in near_verts(ch, web, 0.0035)]
        def shaft_clear(w_end):
            d_ = (w_end - tri_c).normalized(); worst = 9.0
            for v_ in SKIN:
                u_ = (v_ - tri_c).dot(d_)
                if (w_end - tri_c).length - 0.0015 < u_ < (w_end - tri_c).length + 0.0025: worst = min(worst, ((v_ - tri_c) - d_ * u_).length)      # only the web part of the shaft (the finger pads SHOULD touch)
            return worst
        web0 = web.copy()
        # push towards the THUMB SIDE of the index knuckle (the crook of the web), a little to the back of the hand:
        # a real tripod grip rests the pencil there; pushing straight to the back of the hand put the shaft out through it
        acr_w = (wpt(ch, "RightHandIndex1") - wpt(ch, "RightHandPinky1")).normalized()
        PUSH = (acr_w - palm_w * 0.35).normalized()
        for k_ in range(40):
            if shaft_clear(web) >= PEN_R + 0.00012: break
            web = web + PUSH * 0.0001
        print("DESK PENWEB lifted %.4f off the web skin, shaft-to-skin %.4f (pencil radius %.4f)" % ((web - web0).length, shaft_clear(web), PEN_R), flush=True)
        d_end = (web - tri_c).normalized()
        C_PEN = Mh.inverted() @ frame_M(tri_c - d_end * PEN_GRIP, d_end, palm_w)
        def pen_M(tip):
            h = SHR - tip; h.z = 0; h.normalize()
            return frame_M(tip, h * math.cos(PEN_EL) + Vector((0, 0, math.sin(PEN_EL))), PALM_WRITE)
        RL = rig.rest("Left", (BOOK.x - 0.0050, BOOK.y - 0.004, BOOK.z + 0.0011), (-0.25, -1, -0.05))      # left hand rests on the book (its own side)
        paper_z = NOTE.z + 0.0009
        def tip_at(t):
            if t < 0.6: return Vector((NOTE.x - 0.003, NOTE.y + 0.003, paper_z + 0.0015)), False
            u = t - 0.6; line = int(u / 1.3) % 2; x = NOTE.x - 0.0030 + (u % 1.3) / 1.3 * 0.0042      # check 2: smaller strokes, two lines (reach)
            y = NOTE.y + 0.0015 - line * 0.0016; wig = 0.0004 * math.sin(u * 22)
            lift = 0.0006 if (u % 1.3) > 1.15 else 0.0
            return Vector((x, y + wig, paper_z + 0.00003 + lift)), lift == 0.0
        marks = []
        for fr in E.frames():
            t = fr / E.FPS
            tip, touch = tip_at(t)
            rig.solve(t, fr, (0, 0, -18), rig.from_prop("Right", pen_M(tip), C_PEN, G_PEN), RL)
            Mp = hand_M(ch, "Right") @ C_PEN; set_M(pencil, Mp, fr); a = Mp.translation
            if touch and abs(a.z - paper_z) < 0.0005: marks.append((t, Vector((a.x, a.y, paper_z + 0.00002))))
            if fr % 6 == 0: print("CONTACT D3 t=%.2f tip_to_paper %.4f tip_err %.4f" % (t, a.z - paper_z, (a - tip).length), flush=True)
        ch.finish(); E.constant(pencil)
        ink = E.mat("pencilMark", (0.15, 0.15, 0.18), 0.8)
        for (t, p) in marks[::1]:
            m = E.ball(p, 0.00017, ink, "mark"); m.scale = (1, 1, 0.2); E.show_between([m], t_on=t)
        aim = NOTE + Vector((0.004, 0.004, 0.012))
        cam_move(70, aim + Vector((0.05, -0.17, 0.08)), aim, aim + Vector((0.048, -0.165, 0.078)), aim, focus=NOTE)
    else:
        for fr in E.frames(): rig.body(fr / E.FPS, {}, (0, 0, -8))
        ch.finish()
        aim = Vector(CLOCK)
        cam_move(80, aim + Vector((-0.01, -0.16, 0.0)), aim, aim + Vector((-0.008, -0.15, 0.0)), aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False

view_report(SHOT, [("clock", CLOCK), ("head", lambda: wpt(ch, "Head"))])
print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
'''

for name, c in STATIONS.items():
    body = BASE.replace(OLD, "DUR = %s\nVOICE = %s\nEVENTS = {}" % (c["dur"], c["voice"]))
    consts = ('\nMODEL = "%s"; HEIGHT_K = %s; HH, MM, END = %d, %d, %s\nWALL_C, FLOOR_C, DESK_C = %s, %s, %s\nCHAIR_C, BOOK_C, NOTE_C = %s, %s, %s\nEXTRA = "%s"\n'
              % (c["model"], c["height"], c["hh"], c["mm"], c["end"], c["wall"], c["floor"], c["desk"], c["chair"], c["book"], c["note"], c["extra"]))
    head = "# World Routines Trip, he/she version - " + c["head"] + "\n# Built by desk_study_build.py (read its header for the shots). ASCII only.\n"
    out = head + body + consts + BUILD
    out.encode("ascii")
    (HERE / f"{name}.py").write_text(out, encoding="utf-8", newline="\n")
    print("wrote", name)
