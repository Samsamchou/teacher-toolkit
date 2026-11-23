# Builds tabletop/src/usa_lunch.py from kenya_morning.py (helpers + hand rig reused; header, shots and build section new).
#   python tabletop/src/usa_lunch_build.py
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
new = '''DUR = {"US1": 7.4, "US2": 4.4, "US3": 4.6, "US4": 4.0}
VOICE = {"q": 0.4, "a": 4.5, "cafe": 0.3, "food": 0.3, "min": 0.3}
EVENTS = {"bite": 2.6}'''
assert old in body; body = body.replace(old, new)

HEAD = '''# World Routines Trip, he/she version - USA station "She has lunch at eleven thirty." (tabletop style H)
# Spec: MIKE ESCPAEROOM/rdq/RDQ-spec-world-routines-he-she-20261123.md; 9-station storyboard he-she/ (2026-11-23).
# Anchor and reporter are voices only; Emma does not speak.
#   SHOT: US1 (7.4 s) the school cafeteria: a long table and bench, Emma (usa_girl) sits behind the table facing the camera, a lunch
#             tray in front of her (sandwich, apple, milk carton); the 11:30 wall clock on her LEFT, she points at it with her LEFT hand.
#             "This is Emma. What time does she have lunch?" / "She has lunch at eleven thirty."
#         US2 (4.4 s) closer: she lifts the half sandwich with her RIGHT hand (palm towards her middle, fingers round the bread),
#             brings it in from the side to the right corner of her mouth, one bite (the bitten piece is shown from the bite on),
#             two chewing nods. "She eats lunch in the school cafeteria."
#         US3 (4.6 s) the camera glides over the tray: the other sandwich half, the red apple, the small milk carton; she holds the
#             bitten half beside her plate. "She has a sandwich, an apple and milk."
#         US4 (4.0 s) the wall clock close-up: the minute hand runs from 11:30 to 11:55. "Lunch is only twenty-five minutes!"
# The backpack is part of the usa_girl model: seated and seen from the front it stays behind her.
# Models: usa_girl. Everything else is made here.
# ASCII only: colab exec reads files with cp950 on Windows.'''

BUILD = r'''

# ================= build (USA he/she) =================
# check (11/23): a bone matrix set by the hand helpers can leave a location / scale on a bone that is not keyed -> a long skin
# spike in every frame. Clear them before the character is finalised.
_fin0 = E.Char.finish
def _fin(self):
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    _fin0(self)
E.Char.finish = _fin

def wall_clock(cx, cy, cz, hh, mm, r=0.020, minute_keys=None):
    E.cyl((cx, cy, cz), r, 0.005, E.mat("clockRim", (0.12, 0.12, 0.14), 0.4), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0022, cz), r * 0.86, 0.004, E.mat("clockFace", (0.99, 0.99, 0.97), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.05, 0.05, 0.06), 0.5)
    for k in range(12):
        a = math.radians(k * 30)
        E.ball((cx + 0.73 * r * math.sin(a), cy - 0.0045, cz + 0.73 * r * math.cos(a)), (0.0012 if k % 3 == 0 else 0.0007), ink, "tick")
    hp = E.empty("hourPivot"); hp.location = (cx, cy - 0.0047, cz); hp.rotation_mode = "XYZ"
    mp = E.empty("minPivot"); mp.location = (cx, cy - 0.0053, cz); mp.rotation_mode = "XYZ"
    hb = E.box((0, 0, 0.21 * r), (0.0020, 0.001, 0.42 * r), ink, "hourHand", bevel=0); hb.parent = hp
    mb = E.box((0, 0, 0.32 * r), (0.0013, 0.001, 0.64 * r), ink, "minuteHand", bevel=0); mb.parent = mp
    E.ball((cx, cy - 0.0058, cz), 0.0013, E.mat("clockPin", (0.80, 0.10, 0.08), 0.4), "clockPin")
    keys = minute_keys or [(0.0, hh * 60 + mm), (99.0, hh * 60 + mm)]
    for fr in E.frames():
        t = fr / E.FPS
        m = keys[0][1]
        for (t0, m0), (t1, m1) in zip(keys, keys[1:]):
            if t0 <= t <= t1: m = m0 + (m1 - m0) * E.ease((t - t0) / max(1e-6, t1 - t0)); break
            if t > t1: m = m1
        mp.rotation_euler = (0, math.radians((m % 60) * 6), 0); hp.rotation_euler = (0, math.radians((m / 60.0) * 30), 0)
        mp.keyframe_insert("rotation_euler", frame=fr); hp.keyframe_insert("rotation_euler", frame=fr)
    E.constant(mp); E.constant(hp)


def cafeteria():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("cafeFloor", (0.72, 0.72, 0.68)), "floor", thick=FLOOR)
    for i in range(-8, 9):
        for j in range(-5, 6):
            if (i + j) % 2 == 0: E.box((i * 0.04, 0.03 + j * 0.04, FLOOR + 0.0002), (0.04, 0.04, 0.0004), E.felt("floorTile", (0.55, 0.58, 0.60)), "floorTile", bevel=0)
    E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), E.felt("cafeWall", (0.95, 0.88, 0.62)), "backWall")
    E.box((0, WALL_Y - 0.0065, FLOOR + 0.020), (0.64, 0.002, 0.040), E.felt("wainscot", (0.30, 0.55, 0.75)), "wainscot", bevel=0)
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", (0.90, 0.83, 0.58)), "sideWall")
    for k, col in enumerate(((0.90, 0.30, 0.25), (0.30, 0.65, 0.35), (0.25, 0.45, 0.85))):       # three colour pennants (no words)
        E.box((-0.06 + k * 0.05, WALL_Y - 0.0075, FLOOR + 0.165), (0.026, 0.001, 0.020), E.felt("pennant%d" % k, col), "pennant", bevel=0)


ch = E.Char("usa_girl", (0.30, -0.15), 0, height=KID * 1.04)
M_ = metrics(ch)
SEAT_UNDER = seat_under(ch, M_["thigh"]) - SINK
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
SEAT_Z = FLOOR + M_["knee_h"] - SEAT_UNDER                # bench top: thighs flat, shins down, feet on the floor
BX, BY = 0.0, 0.175                                        # where she sits (hips)
hips_z = SEAT_Z + SEAT_HIP
TOP_Z = hips_z + 0.40 * M_["sh_hips"]                      # table top between her waist and chest (chibi arms)
TABLE_BACK = BY - M_["front"] - 0.0012                     # table edge on her side, just in front of her tummy
TABLE_D = 0.050
print("DESK USA seat %.4f table top %.4f (hips %.4f, shoulders above hips %.4f) table edge y %.4f" % (SEAT_Z - FLOOR, TOP_Z - FLOOR, hips_z - FLOOR, M_["sh_hips"], TABLE_BACK), flush=True)

cafeteria()
CLOCK = (BX + 0.062, WALL_Y - 0.0045, FLOOR + 0.105)        # on her LEFT (+x)
mk = [(0.0, 11 * 60 + 30), (0.6, 11 * 60 + 30), (3.2, 11 * 60 + 55), (9.0, 11 * 60 + 55)] if SHOT == "US4" else None
wall_clock(CLOCK[0], CLOCK[1], CLOCK[2], 11, 30, minute_keys=mk)
tabm = E.felt("tableTop", (0.92, 0.92, 0.90)); legm = E.mat("tableLeg", (0.35, 0.35, 0.38), 0.3)
E.box((BX, TABLE_BACK - TABLE_D / 2, TOP_Z - 0.0015), (0.16, TABLE_D, 0.003), tabm, "tableTop", bevel=0.0008)
for sx in (-1, 1):
    E.box((BX + sx * 0.070, TABLE_BACK - TABLE_D / 2, (FLOOR + TOP_Z) / 2), (0.003, TABLE_D * 0.8, TOP_Z - FLOOR - 0.003), legm, "tableLeg", bevel=0)
E.box((BX, BY + 0.002, SEAT_Z - 0.0015), (0.15, 0.016, 0.003), E.felt("bench", (0.25, 0.45, 0.70)), "benchTop", bevel=0.0008)
for sx in (-1, 1):
    E.box((BX + sx * 0.065, BY + 0.002, (FLOOR + SEAT_Z) / 2), (0.003, 0.012, SEAT_Z - FLOOR - 0.003), legm, "benchLeg", bevel=0)
# the tray and the food (sized to her chibi hands)
TRAY = Vector((BX, TABLE_BACK - 0.014, TOP_Z))
E.box((TRAY.x, TRAY.y, TRAY.z + 0.0005), (0.030, 0.020, 0.001), E.felt("tray", (0.85, 0.45, 0.20)), "tray", bevel=0.0006)
bread = E.felt("bread", (0.95, 0.82, 0.55)); filling = E.felt("filling", (0.40, 0.70, 0.30)); ham = E.felt("ham", (0.95, 0.60, 0.60))


def half_sandwich(name, bitten=False):
    """A triangle half sandwich standing on its long edge: empty at the held corner; local x towards the far corner (the bite end),
    local z up. Bread / ham / lettuce layers along local y."""
    emp = E.empty(name); emp.rotation_mode = "XYZ"
    s = 0.0060; th = 0.0022
    pts = [(0, 0), (s, 0), (s * 0.5, s * 0.75)]
    if bitten: pts = [(0, 0), (s * 0.70, 0), (s * 0.80, s * 0.18), (s * 0.66, s * 0.30), (s * 0.5, s * 0.75)]
    for k, (y0, y1, m) in enumerate(((-th / 2, -th / 6, bread), (-th / 6, 0, ham), (0, th / 6, filling), (th / 6, th / 2, bread))):
        n = len(pts)
        verts = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
        faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
        me = bpy.data.meshes.new(name + "M%d" % k); me.from_pydata(verts, [], faces); me.update(); me.materials.append(m)
        o = bpy.data.objects.new(name + "L%d" % k, me); sc.collection.objects.link(o); o.parent = emp
    return emp


sw_whole = half_sandwich("sandwich"); sw_bit = half_sandwich("sandwichBitten", True)
other = half_sandwich("sandwich2"); other.location = (TRAY.x - 0.002, TRAY.y - 0.004, TRAY.z + 0.001); other.rotation_euler = (0, 0, math.radians(180))
apple = E.ball((TRAY.x + 0.010, TRAY.y + 0.002, TRAY.z + 0.0035), 0.0026, E.mat("apple", (0.80, 0.08, 0.06), 0.3), "apple")
E.cyl((TRAY.x + 0.010, TRAY.y + 0.002, TRAY.z + 0.0063), 0.0003, 0.0012, E.mat("stem", (0.35, 0.22, 0.08), 0.6), verts=6, name="stem")
milk = E.box((TRAY.x + 0.010, TRAY.y - 0.006, TRAY.z + 0.0040), (0.0034, 0.0034, 0.0060), E.felt("milkCarton", (0.97, 0.97, 0.97)), "milk", bevel=0.0003)
E.box((TRAY.x + 0.010, TRAY.y - 0.006 - 0.0018, TRAY.z + 0.0040), (0.0030, 0.0002, 0.0030), E.felt("milkLabel", (0.20, 0.45, 0.90)), "milkLabel", bevel=0)
E.cyl((TRAY.x + 0.010, TRAY.y - 0.006, TRAY.z + 0.0078), 0.0019, 0.0016, E.felt("cartonTop", (0.97, 0.97, 0.97)), rot=(math.radians(90), 0, 0), verts=3, name="cartonTop")
SW_HOME = Matrix.Translation((TRAY.x - 0.004, TRAY.y + 0.006, TRAY.z + 0.0012)) @ Matrix.Rotation(math.radians(-15), 4, "Z")
L_, Fl, R_ = E.lights(lamp=0.40)

hy = BY
rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(BX, hy))
hy = BY + 0.0
rig.learn_hands(HEAD0)
mouth0 = mouth(ch)

if SHOT == "US1":
    set_M(sw_whole, SW_HOME, 0); set_M(sw_bit, Matrix.Translation((0, 0, -1)), 0)
    ans0, ans1 = VOICE["a"], VOICE["a"] + 2.2
    sh_z = wpt(ch, "LeftArm").z
    pt = Vector(local_dir((BX, hy), 0, CLOCK, sh_z)).normalized()
    pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    lap_r = {k: v for k, v in P_LAP.items() if k.startswith("Right")}
    FOUR = ("Index", "Middle", "Ring", "Pinky")
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms = dict(lap_r); arms.update({b: v for b, v in E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=False).items() if b.startswith("Left")})
            head = (0, 6, 6) if t < ans1 else (0, 0, 2)
        else:
            arms, head = {}, (0, 0, -6 if int(t / 1.2) % 2 == 0 else -2)        # looking at her lunch
        rig.body(t, arms, head)
        if t >= ans0 - 0.15:
            curl_hinge(ch, "Left", G_POINT, fingers=FOUR); key_hand(ch, "Left", fr)
    ch.finish()
    aim = Vector((BX + 0.020, BY - 0.02, FLOOR + 0.060))
    cam_move(48, aim + Vector((-0.01, -0.36, 0.05)), aim, aim + Vector((-0.006, -0.33, 0.045)), aim, focus=mouth0)
    view_report("US1", [("clock", CLOCK), ("head", lambda: wpt(ch, "Head")), ("tray", TRAY)])

elif SHOT in ("US2", "US3"):
    # sandwich grip: right hand, palm towards her middle (+x), fingers forward round the bread, thumb on top
    q_g = hand_q(ch, "Right", Vector((0.15, -1, 0.1)), Vector((1, 0, 0)))
    Mh = rig.calibrate("Right", q_g, G_CUP)
    gp = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex2") + wpt(ch, "RightHandMiddle2")) / 3
    # the sandwich in the hand: held corner at the grip point, far corner pointing to her middle (+x), standing up (+z)
    C_SW = Mh.inverted() @ frame_XY(gp, Vector((1, -0.2, 0)), Vector((0, 1, 0)))
    def sw_at_mouth(back=0.0):
        far = mouth0 + Vector((-0.0012, -0.0008 - back, -0.0006))         # far corner at the right corner of the mouth
        d = Vector((1, -0.15, 0.05)).normalized()
        return frame_XY(far - d * 0.0058, d, Vector((0, 1, 0)))
    def sw_low():
        M = sw_at_mouth(); M.translation += Vector((-0.002, -0.006, -0.010)); return M
    SWK = [(0.0, SW_HOME), (0.8, SW_HOME), (1.6, sw_low()), (2.3, sw_at_mouth(0.0012)), (2.6, sw_at_mouth()), (2.9, sw_at_mouth()), (3.4, sw_low()), (9.0, sw_low())]
    pre = rig.from_prop("Right", Matrix.Translation((0, 0, 0.0015)) @ SW_HOME, C_SW, G_RELAX)
    hang = rig.hanging("Right")
    BITE_T = EVENTS["bite"]
    for fr in E.frames():
        t = fr / E.FPS
        if SHOT == "US3": t_ = 9.0
        else: t_ = t
        if t_ < 0.4: tgt = hang
        elif t_ < 0.8: tgt = tblend(hang, pre, (t_ - 0.4) / 0.4)
        else: tgt = rig.from_prop("Right", key_M(SWK, t_), C_SW, G_CUP)
        head = (0, -4, -4) if 2.0 <= t_ < 3.2 else ((0, 0, -2 if int((t_ - 3.0) / 0.17) % 2 else -7) if 3.0 <= t_ < 3.7 else (0, 0, -6))
        rig.solve(t, fr, head, tgt, None)
        Ms = hand_M(ch, "Right") @ C_SW if t_ >= 0.8 else SW_HOME
        bitten = t_ >= BITE_T
        set_M(sw_whole, Ms if not bitten else Matrix.Translation((0, 0, -1)), fr); set_M(sw_bit, Ms if bitten else Matrix.Translation((0, 0, -1)), fr)
        if fr % 6 == 0 and SHOT == "US2":
            print("CONTACT US2 t=%.2f far_corner_to_mouth %.4f" % (t, ((Ms @ Vector((0.0060, 0, 0.0015))) - mouth(ch)).length), flush=True)
    ch.finish(); E.constant(sw_whole); E.constant(sw_bit)
    if CAMSUB in ("HF", "HS"):
        aim = mouth0 + Vector((-0.004, -0.002, -0.003)); off = Vector((-0.07, -0.12, 0.012)) if CAMSUB == "HF" else Vector((-0.14, -0.01, 0.01))
        cam_move(150, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    elif SHOT == "US2":
        aim = Vector((BX, BY - 0.006, FLOOR + 0.052))
        cam_move(55, aim + Vector((0.02, -0.26, 0.02)), aim, aim + Vector((0.018, -0.24, 0.018)), aim, focus=mouth0)
    else:            # US3: glide over the tray from the sandwich to the milk
        a0 = TRAY + Vector((-0.004, 0.0, 0.004)); a1 = TRAY + Vector((0.010, -0.004, 0.004))
        cam_move(70, a0 + Vector((-0.02, -0.14, 0.07)), a0, a1 + Vector((-0.01, -0.14, 0.07)), a1, focus=TRAY)
    view_report(SHOT, [("head", lambda: wpt(ch, "Head")), ("tray", TRAY), ("milk", milk.location)])

else:
    # US4: the clock close-up (the minute hand runs 11:30 -> 11:55)
    for fr in E.frames(): rig.body(fr / E.FPS, {}, (0, 0, -4))
    ch.finish()
    aim = Vector(CLOCK) + Vector((0, 0, 0))
    cam_move(80, aim + Vector((-0.01, -0.16, 0.0)), aim, aim + Vector((-0.008, -0.15, 0.0)), aim, focus=aim)
    for cd in bpy.data.cameras: cd.dof.use_dof = False
    view_report("US4", [("clock", CLOCK)])

print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
'''
out = HEAD + "\n" + body + BUILD
out.encode("ascii")
(HERE / "usa_lunch.py").write_text(out, encoding="utf-8", newline="\n")
print("wrote usa_lunch.py", len(out.splitlines()), "lines")
