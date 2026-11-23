# Builds tabletop/src/taiwan_getup.py from kenya_morning.py (the helpers, the bed fit and the hand rig are reused unchanged;
# the header, the shot list and the whole build section are new). Run after kenya_morning.py changes:
#   python tabletop/src/taiwan_getup_build.py
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
new = '''DUR = {"TW1": 7.0, "TW2": 4.6, "TW3": 4.4, "TW4": 3.0}
VOICE = {"q": 0.4, "a": 4.3, "ring": 0.3, "brush": 0.6, "uniform": 0.2}
# planned contact times (seconds in the shot) used by taiwan_getup_compose.py for the little sounds
EVENTS = {"ring_off": 3.6}'''
assert old in body; body = body.replace(old, new)
body = body.replace('CAMSUB = SHOT[3:] or "main"\nSHOT = SHOT[:3]', 'CAMSUB = SHOT[3:] or "main"\nSHOT = SHOT[:3]')

HEAD = '''# World Routines Trip, he/she version - Taiwan station "She gets up at six thirty." (tabletop style H)
# Spec: MIKE ESCPAEROOM/rdq/RDQ-spec-world-routines-he-she-20261123.md (confirmed). Reporter style: an anchor (voice only) asks,
# a reporter (voice only) answers; the traveller is NOT in the picture.
# blender -b --factory-startup --python taiwan_getup.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: TW1 (7.0 s) wide, Taiwan bedroom at sunrise (pale blue walls, window with dawn sky and roofs, 6:30 wall clock top right).
#             Mei (pink pyjamas: taiwan_girl_pyjamas = taiwan_girl with the uniform texture recoloured, make_pyjamas.py) SITS on
#             the front edge of her bed; the alarm clock on the stool beside her is still. Anchor: "This is Mei. What time does she
#             get up?" (0.4); she points at the wall clock with her LEFT hand (clock side) while the reporter says
#             "She gets up at six thirty." (4.3).
#         TW2 (4.6 s) cut: she stands in front of the bed; the alarm clock on the stool RINGS (shakes) - "Her alarm clock rings at
#             six thirty." - and stops only when her right index fingertip presses the button on top (kenya KE3 press).
#         TW3 (4.4 s) the little sink corner at the right of the room: she brushes her teeth, toothbrush in the RIGHT fist (handle
#             across the palm, thumb along the handle towards the head), brush level, coming from her right side, head at the
#             right mouth corner, small in-out strokes; white foam dots at the mouth corner. "She brushes her teeth"
#         TW4 (3.0 s) cut: the same girl in her school uniform (taiwan_girl) in front of the bed, arms open: "and puts on her
#             school uniform." (the breakfast that follows reuses the I-version breakfast shot, no new render)
#   Check cameras: TW1L TW1L2 (seated legs), TW1HF TW1HS (pointing hand), TW2HF TW2HS (button), TW3HF TW3HS (brush at the mouth).
# Models: taiwan_girl_pyjamas, taiwan_girl, kenya_bed (re-used, heights fitted to her). Everything else is made here.
# ASCII only: colab exec reads files with cp950 on Windows.'''

BUILD = r'''

# ================= build (Taiwan he/she) =================
def room():
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("woodFloor", (0.55, 0.36, 0.20)), "floor", thick=FLOOR)
    line = E.mat("boardLine", (0.40, 0.25, 0.13), 0.9)
    for i in range(1, 16):
        E.box((-0.32 + i * 0.04, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), line, "floorLine", bevel=0)
    wallm = E.felt("blueWall", (0.55, 0.70, 0.80))
    wall = E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), wallm, "backWall")
    wz0, wz1, ww = FLOOR + 0.050, FLOOR + 0.140, 0.075
    cut = E.box((WIN_X, WALL_Y, (wz0 + wz1) / 2), (ww, 0.05, wz1 - wz0), E.mat("cutter", (0, 0, 0), 0.5), "winCut", bevel=0)
    mod = wall.modifiers.new("win", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut
    cut.hide_render = True; cut.display_type = "WIRE"
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", (0.50, 0.64, 0.74)), "sideWall")
    E.box((0, 0.2385, FLOOR + 0.006), (0.64, 0.003, 0.012), E.felt("wallBase", (0.95, 0.95, 0.92)), "wallBase", bevel=0)
    fr = E.mat("winFrameWhite", (0.92, 0.92, 0.90), 0.5)
    zc = (wz0 + wz1) / 2; hh = wz1 - wz0
    for (x, z, sx, sz) in ((WIN_X - ww / 2 + 0.002, zc, 0.005, hh), (WIN_X + ww / 2 - 0.002, zc, 0.005, hh),
                           (WIN_X, wz1 - 0.002, ww, 0.005), (WIN_X, zc, 0.003, hh), (WIN_X, zc, ww, 0.003)):
        E.box((x, 0.242, z), (sx, 0.012, sz), fr, "winFrame", bevel=0)
    E.box((WIN_X, 0.236, wz0 - 0.001), (ww + 0.010, 0.012, 0.004), fr, "winSill", bevel=0.0005)
    for s in (-1, 1):                                          # light curtains pulled open
        E.box((WIN_X + s * (ww / 2 + 0.012), 0.2355, zc + 0.004), (0.020, 0.003, hh + 0.016), E.felt("curtain", (0.98, 0.90, 0.62)), "curtain", bevel=0.0008)
    E.box((BED_X, 0.150, FLOOR + 0.0004), (0.11, 0.045, 0.0008), E.felt("rug", (0.95, 0.80, 0.55)), "floorRug", bevel=0)
    # a school bag hanging on a hook and a small poster (colour only, no words)
    E.box((BED_X + 0.075, 0.2375, FLOOR + 0.118), (0.030, 0.002, 0.040), E.felt("poster", (0.98, 0.86, 0.40)), "poster", bevel=0)
    E.ball((BED_X + 0.075, 0.2365, FLOOR + 0.118), 0.008, E.felt("posterSun", (0.95, 0.45, 0.20)), "posterSun").scale = (1, 0.15, 1)


def outside():
    """Seen through the window: dawn sky (pale blue to warm orange at the bottom) and a few roof tops."""
    E.box((0, 0.62, 0.30), (1.4, 0.004, 0.70), E.emission("dawnSky", (0.55, 0.75, 1.0), 1.4), "sky", bevel=0)
    hmat, hstr = emit_mat("horizon", (1.0, 0.62, 0.30), 1.6)
    E.box((0, 0.615, FLOOR + 0.030), (1.4, 0.003, 0.050), hmat, "horizon", bevel=0)
    roof = E.mat("roofs", (0.20, 0.22, 0.30), 0.9)
    for k, (dx, h, w) in enumerate(((-0.05, 0.050, 0.040), (-0.01, 0.070, 0.030), (0.03, 0.045, 0.045), (0.07, 0.065, 0.030), (0.11, 0.040, 0.050))):
        E.box((WIN_X + dx, 0.50, FLOOR + h / 2), (w, 0.02, h), roof, "building", bevel=0)
    return hstr


BELL_R = 0.0016
def alarm_clock(x, y, z, to_her):
    """Twin-bell alarm clock (red body, white face showing 6:30, two silver bells, a button on top on her side).
    Returns (root empty, button object, button top point)."""
    root = E.empty("alarmClock"); root.location = (x, y, z); root.rotation_mode = "XYZ"
    red = E.mat("alarmRed", (0.80, 0.08, 0.06), 0.35); silver = E.mat("alarmSilver", (0.78, 0.78, 0.80), 0.25)
    ink = E.mat("alarmInk", (0.05, 0.05, 0.06), 0.5)
    R_, D_ = 0.0034, 0.0026
    parts = []
    parts.append(E.cyl((0, 0, R_ + 0.0007), R_, D_, red, rot=(math.radians(90), 0, 0), verts=32, name="alarmBody"))
    parts.append(E.cyl((0, -D_ / 2 - 0.0001, R_ + 0.0007), R_ * 0.82, 0.0003, E.mat("alarmFace", (0.98, 0.97, 0.92), 0.6), rot=(math.radians(90), 0, 0), verts=32, name="alarmFace"))
    cz = R_ + 0.0007; fy = -D_ / 2 - 0.0003
    for k in range(12):
        a = math.radians(k * 30)
        parts.append(E.ball((0.70 * R_ * math.sin(a), fy, cz + 0.70 * R_ * math.cos(a)), 0.00022 if k % 3 == 0 else 0.00013, ink, "alarmTick"))
    hb = E.box((0, fy - 0.0001, cz - 0.0011), (0.00045, 0.0002, 0.0022), ink, "alarmMin", bevel=0)                  # 30: straight down
    a = math.radians(6.5 * 30)
    hh = E.box((0.0007 * math.sin(a), fy - 0.0002, cz + 0.0007 * math.cos(a)), (0.0005, 0.0002, 0.0014), ink, "alarmHour", bevel=0); hh.rotation_euler = (0, a, 0)
    parts += [hb, hh]
    for s in (-1, 1):
        b = E.ball((s * 0.0021, 0, 2 * R_ + 0.0010), BELL_R, silver, "alarmBell"); b.scale = (1, 1, 0.75); parts.append(b)
        leg = E.cyl((s * 0.0024, 0, 0.0004), 0.00035, 0.0008, silver, verts=8, name="alarmLeg"); parts.append(leg)
    d = Vector((to_her[0], to_her[1], 0)).normalized() * 0.0010
    btn = E.cyl((d.x, d.y, 2 * R_ + 0.0007 + BTN_H / 2), BTN_R, BTN_H, E.mat("alarmButton", (0.95, 0.80, 0.10), 0.4), verts=16, name="alarmButton")
    parts.append(btn)
    for o in parts: o.parent = root
    return root, btn, Vector((x + d.x, y + d.y, z + 2 * R_ + 0.0007 + BTN_H))


def sink_corner(x, y_back, top_z):
    """White wash basin on a cabinet against the back wall, a tap, a mirror and a cup with a spare toothbrush."""
    white = E.mat("basinWhite", (0.95, 0.95, 0.94), 0.25)
    E.box((x, y_back - 0.012, (FLOOR + top_z) / 2), (0.034, 0.024, top_z - FLOOR), E.felt("cabinet", (0.40, 0.62, 0.55)), "sinkCabinet")
    E.box((x, y_back - 0.012, top_z + 0.0012), (0.036, 0.026, 0.0024), white, "basinTop")
    bowl = E.cyl((x, y_back - 0.013, top_z + 0.0020), 0.0085, 0.0012, E.mat("basinBowl", (0.80, 0.84, 0.88), 0.2), verts=32, name="basinBowl"); bowl.scale = (1, 0.7, 1)
    tap = E.cyl((x, y_back - 0.0025, top_z + 0.0045), 0.0009, 0.0055, E.mat("chrome", (0.85, 0.85, 0.88), 0.15), verts=12, name="tap")
    E.box((x, y_back - 0.0055, top_z + 0.0070), (0.0016, 0.0060, 0.0012), E.mat("chrome2", (0.85, 0.85, 0.88), 0.15), "tapSpout", bevel=0.0003)
    E.box((x, 0.2385, top_z + 0.034), (0.026, 0.002, 0.032), E.mat("mirror", (0.85, 0.92, 0.96), 0.05), "mirror", bevel=0.0006)
    E.box((x, 0.2375, top_z + 0.034), (0.029, 0.0015, 0.035), E.felt("mirrorFrame", (0.98, 0.98, 0.96)), "mirrorFrame", bevel=0.0005)
    cupx = x + 0.012
    E.cyl((cupx, y_back - 0.006, top_z + 0.0047), 0.0022, 0.0046, E.mat("cupBlue", (0.25, 0.55, 0.90), 0.4), verts=24, name="brushCup")


BR_L, BR_HEAD, BR_R = 0.0105, 0.0060, 0.00045      # toothbrush length, grip-to-head distance, handle radius (chibi hand)
def toothbrush():
    """Empty at the grip point; local x from the handle end to the head, bristles towards local +y."""
    emp = E.empty("toothbrush"); emp.rotation_mode = "XYZ"
    hnd = E.mat("brushHandle", (0.20, 0.70, 0.55), 0.35)
    x0 = BR_HEAD - BR_L
    h = E.cyl((0, 0, 0), BR_R, BR_L - 0.0012, hnd, verts=12, name="brushStick")
    h.rotation_euler = (0, math.radians(90), 0); h.location = ((x0 + BR_HEAD - 0.0012) / 2 + 0.0002, 0, 0)
    head = E.box((BR_HEAD - 0.0004, 0.00005, 0), (0.0022, 0.0006, 0.0010), hnd, "brushHead", bevel=0.0002)
    bris = E.box((BR_HEAD - 0.0004, 0.00055, 0), (0.0020, 0.0007, 0.0009), E.felt("bristles", (0.97, 0.97, 0.99)), "bristles", bevel=0.0001)
    for o in (h, head, bris): o.parent = emp
    return emp


G_BRUSH = {"Thumb": (10, 14, 8), "Index": (62, 66, 46), "Middle": (66, 70, 48), "Ring": (70, 72, 50), "Pinky": (74, 72, 50)}
G_BRUSH_OPEN = {f: tuple(a * 0.45 for a in v) for f, v in G_BRUSH.items()}

# --- the girl: pyjamas for TW1-TW3, school uniform for TW4 (same mesh and rig, so the same body numbers) ---
MODEL = "taiwan_girl" if SHOT == "TW4" else "taiwan_girl_pyjamas"
ch = E.Char(MODEL, (0.30, -0.15), 0, height=PUPIL)
M_ = metrics(ch)
SEAT_UNDER = seat_under(ch, M_["thigh"]) - SINK
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
SEAT_Z = FLOOR + M_["knee_h"] - SEAT_UNDER

BI = probe_bed()
BED_Y = WALL_Y - 0.006 - 0.002 - (BI["y1"] - BI["y0"]) / 2
bed_root = E.place(f"{PROPS}/kenya_bed.glb", BED_L, (BED_X, BED_Y, FLOOR), axis="long")
KD = max(0.3, min(1.8, (SEAT_Z - FLOOR) / max(1e-4, BI["mat"])))
nv = squash(bed_root, KD)
E.obstacle(bed_root)
BED_FRONT = BED_Y + BI["y0"]; BED_MINX, BED_MAXX = BED_X + BI["x0"], BED_X + BI["x1"]
SIT_X = BED_X + (BI["free"][0] + BI["free"][1]) / 2
print("DESK BED fit: seat %.4f above floor, heights x%.3f, front y %.4f, x %.4f..%.4f, sit x %.4f" % (SEAT_Z - FLOOR, KD, BED_FRONT, BED_MINX, BED_MAXX, SIT_X), flush=True)

SX2, SY2 = BED_MINX + 0.022, BED_FRONT - 0.013                    # TW2 / TW4: standing in front of the head end of the bed
STOOL_XY = (SX2 - M_["sh_half"] - 0.004, SY2 - 0.013)
STOOL_TOP = FLOOR + M_["hip_h"] - (2 * 0.0034 + 0.0007) - BTN_H + 0.0012    # button about hip height (KE3 reach)
CLOCK = (WIN_X + 0.072, 0.2395, FLOOR + CLOCK_Z)
SINK_X = env("SINK_X", "0.175")
SINK_TOP = FLOOR + M_["hip_h"] + 0.20 * M_["sh_hips"]               # GUESS basin top a little above her hips
SX3, SY3 = SINK_X - 0.030, 0.205                                   # TW3: she stands to the right of the basin (basin on her left)
print("DESK LAYOUT stand2 (%.4f, %.4f) stool %s top %.4f | sink x %.4f top %.4f | TW3 at (%.4f, %.4f) | clock %s" % (
    SX2, SY2, tuple(round(v, 4) for v in STOOL_XY), STOOL_TOP - FLOOR, SINK_X, SINK_TOP - FLOOR, SX3, SY3, tuple(round(v, 4) for v in CLOCK)), flush=True)

room(); horizon = outside(); clock(CLOCK[0], CLOCK[1], CLOCK[2], 6, 30)
stool(STOOL_XY[0], STOOL_XY[1], STOOL_TOP)
_to_her = (SX2 - STOOL_XY[0], SY2 - STOOL_XY[1])
alarm, button, BTN_TOP = alarm_clock(STOOL_XY[0], STOOL_XY[1], STOOL_TOP, _to_her)
sink_corner(SINK_X, WALL_Y - 0.006, SINK_TOP)
L_, Fl, R_ = E.lights(lamp=0.35)
bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.40, 0.22)); sunwin = bpy.context.object      # morning sun through the window
sunwin.data.energy = 4.0; sunwin.data.color = (1.0, 0.86, 0.66); sunwin.data.size = 0.25; sunwin.rotation_euler = (math.radians(-65), 0, 0)
bpy.ops.object.light_add(type="AREA", location=(0.0, -0.25, 0.42)); front = bpy.context.object
front.data.energy = 1.3; front.data.color = (1.0, 0.95, 0.88); front.data.size = 0.5; front.rotation_euler = (math.radians(25), 0, 0)


def face_px(tag, frames_):
    from bpy_extras.object_utils import world_to_camera_view as w2c
    for fr in frames_:
        sc.frame_set(fr); bpy.context.view_layer.update()
        v = w2c(sc, sc.camera, mouth(ch) + Vector((0.0045, -0.0006, 0.0022)))
        print("DESK FACEPX %s f%04d x %d y %d" % (tag, fr, round(v.x * 1920), round((1 - v.y) * 1080)), flush=True)


def still_cam(aim, off, lens, focus=None):
    cam_move(lens, aim + off, aim, aim + off, aim, focus=focus if focus is not None else aim)


if SHOT == "TW1":
    hy = BED_FRONT - KNEE_OUT + M_["thigh"]
    rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(SIT_X, hy))
    hy = BED_FRONT - KNEE_OUT + rig.hz
    rig = Rig(ch, M_, 0, (0, 0, 0), seat_z=SEAT_Z, hips_xy=(SIT_X, hy))
    rig.body(0, {}, HEAD0)
    ans0, ans1 = VOICE["a"], VOICE["a"] + 2.0
    sh_z = wpt(ch, "LeftArm").z
    pt = Vector(local_dir((SIT_X, hy), 0, CLOCK, sh_z)).normalized()
    pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
    print("DESK TW1 clock %s point_dir %s hand Left" % (tuple(round(v, 4) for v in CLOCK), tuple(round(v, 3) for v in pt)), flush=True)
    lap_r = {k: v for k, v in P_LAP.items() if k.startswith("Right")}
    G_ZERO = {f: (0, 0, 0) for f in FINGERS}
    FOUR = ("Index", "Middle", "Ring", "Pinky")
    # thumb across the palm onto the curled middle finger: the search found these for the same rig in kenya KE1 (check 4)
    def thumb_pose(side, opp, bends, abd=0):
        for k in (1, 2, 3):          # check 1 (11/23): rot_bone sets the bone matrix; a left-over location / scale made a long skin spike
            b_ = ch.pb["%sHandThumb%d" % (side, k)]; b_.rotation_quaternion = (1, 0, 0, 0); b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
        if opp: rot_bone(ch, "%sHandThumb1" % side, hand_frame(ch, side)[1], math.radians(opp))
        if abd: rot_bone(ch, "%sHandThumb1" % side, hand_frame(ch, side)[3], math.radians(abd))
        curl(ch, side, dict(G_ZERO, Thumb=bends))
    def seg_pad(side, f):
        b1, b2 = "%sHand%s1" % (side, f), "%sHand%s2" % (side, f)
        d1 = (wpt(ch, b1, True) - wpt(ch, b1)).normalized(); d2 = (wpt(ch, b2, True) - wpt(ch, b2)).normalized()
        a = d1.cross(d2)
        n = (ch.arm.matrix_world.to_3x3().normalized() @ hand_frame(ch, side)[3]).normalized() if a.length < 0.05 else a.normalized().cross(d2).normalized()
        return (wpt(ch, b2) + wpt(ch, b2, True)) / 2, n
    def fist_target(side):
        c, n = seg_pad(side, "Middle"); return c - n * 0.00085
    rig.body(0, {**lap_r, **{b: v for b, v in E.P_point(tuple(pt), right=False).items() if b.startswith("Left")}}, (0, 6, 6))
    curl_hinge(ch, "Left", G_POINT, fingers=FOUR)
    tgt = fist_target("Left"); best = None
    for opp in range(-110, 111, 10):
        for abd in range(-60, 61, 20):
            for b in ((0, 0, 0), (30, 0, 0), (0, 40, 0), (0, 0, 40), (30, 40, 0), (30, 40, 40), (45, 60, 60), (0, 40, 40)):
                thumb_pose("Left", opp, b, abd); dd = (wpt(ch, "LeftHandThumb3", True) - tgt).length
                if best is None or dd < best[0]: best = (dd, opp, abd, b)
    THUMB = best
    for b_ in ch.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    print("DESK POINT TW1 thumb opp %d abd %d bends %s tip %.4f from the fist" % (best[1], best[2], best[3], best[0]), flush=True)
    POINT_HAND = None
    for fr in E.frames():
        t = fr / E.FPS
        if t >= ans0 - 0.15:
            k = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
            arms = dict(lap_r); arms.update({b: v for b, v in E.P_point((pt.x, pt.y, pt.z + 0.06 * k), right=False).items() if b.startswith("Left")})
            head = (0, 6, 6) if t < ans1 else (0, 0, 2)
        else:
            arms, head = {}, ((0, 0, -8) if int(t / 0.9) % 2 == 0 else (0, 4, -5))     # sleepy: head low, a slow nod
        rig.body(t, arms, head)
        if t >= ans0 - 0.15:
            curl_hinge(ch, "Left", G_POINT, fingers=FOUR)
            thumb_pose("Left", THUMB[1], THUMB[3], THUMB[2]); key_hand(ch, "Left", fr)
            if fr == 120: POINT_HAND = (wpt(ch, "LeftHand") + wpt(ch, "LeftHandIndex3", True)) / 2
    ch.finish()
    for fr in (0, E.f(T)): alarm.keyframe_insert("rotation_euler", frame=fr)       # the alarm clock stands still here
    CAMS = {"L": (Vector((SIT_X, hy - 0.004, SEAT_Z + 0.004)), Vector((0.16, -0.03, 0.03)), 160),
            "L2": (Vector((SIT_X, BED_FRONT, SEAT_Z - 0.002)), Vector((-0.06, -0.13, -0.002)), 160)}
    if POINT_HAND is not None:
        CAMS["HF"] = (POINT_HAND, Vector((0.07, -0.12, 0.02)), 160); CAMS["HS"] = (POINT_HAND, Vector((0.14, -0.01, 0.0)), 160)
    if CAMSUB in CAMS:
        aim, off, lens = CAMS[CAMSUB]; still_cam(aim, off, lens)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    else:
        # check 1: the Kenya framing (made for two people) left half the picture empty -> closer: bed, window and the clock
        aim0 = Vector((0.000, 0.17, FLOOR + 0.056))
        cam_move(58, aim0 + Vector((-0.010, -0.43, 0.045)), aim0, aim0 + Vector((-0.006, -0.40, 0.040)), aim0 + Vector((0, 0, 0.002)),
                 focus=(SIT_X, BED_FRONT - 0.01, FLOOR + 0.05))
    view_report("TW1", [("clock", CLOCK), ("pupil_head", lambda: wpt(ch, "Head")), ("left_foot", lambda: wpt(ch, "LeftFoot")),
                        ("window", (WIN_X, 0.24, FLOOR + 0.095)), ("alarm", BTN_TOP)])

elif SHOT in ("TW2", "TW4"):
    rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(SX2, SY2))
    rig.learn_hands()
    hang_R = rig.hanging("Right")
    if SHOT == "TW2":
        d_l = Vector((STOOL_XY[0] - SX2, STOOL_XY[1] - SY2, 0)).normalized()
        q_press = hand_q(ch, "Right", d_l + Vector((0, 0, -0.25)), Vector((0, 0, -1)))
        Mh = rig.calibrate("Right", q_press, G_PRESS)
        tipb = wpt(ch, "RightHandIndex3", True)
        pad = min(near_verts(ch, tipb, 0.0016) or [tipb], key=lambda v: v.z)
        PAD_L = Mh.inverted() @ pad; C_TIP = Mh.inverted() @ Matrix.Translation(pad)
        HOVER = rig.from_prop("Right", Matrix.Translation(BTN_TOP + Vector((0, 0, 0.0018))), C_TIP, G_PRESS_OPEN)
        PRESS = rig.from_prop("Right", Matrix.Translation(BTN_TOP + Vector((0, 0, -0.00025))), C_TIP, G_PRESS)
        TAP = rig.from_prop("Right", Matrix.Translation(BTN_TOP + Vector((0, 0, 0.0006))), C_TIP, G_PRESS)
        P0 = EVENTS["ring_off"] - 0.95          # the hand starts after the sentence is mostly said

        def right(t):
            u = t - P0
            if u < 0.0: return hang_R
            if u < 0.5: return tblend(hang_R, HOVER, u / 0.5)
            if u < 0.6: return tblend(HOVER, TAP, (u - 0.5) / 0.1)
            if u < 0.75: return tblend(TAP, PRESS, (u - 0.6) / 0.15)
            if u < 1.0: return PRESS
            if u < 1.2: return tblend(PRESS, HOVER, (u - 1.0) / 0.2)
            return tblend(HOVER, hang_R, (u - 1.2) / 0.6)

        def head(t):
            if t < P0 - 0.3: return (0, -6, -4)            # turns to the ringing clock
            if t < P0 + 1.2: return (0, -12, -14)          # looks down at it
            return (0, 0, 3)
        t_off = None; btn_z0 = button.location.z
        for fr in E.frames():
            t = fr / E.FPS
            rig.solve(t, fr, head(t), right(t), None)
            tp = hand_M(ch, "Right") @ PAD_L; d = tp.z - BTN_TOP.z; dxy = (tp.xy - BTN_TOP.xy).length
            touching = d < 0.0003 and dxy < BTN_R * 1.4
            if touching and t_off is None:
                t_off = t; print("CONTACT TW2 alarm OFF t=%.2f fingertip_to_button %.4f off_centre %.4f" % (t, d, dxy), flush=True)
            button.location.z = btn_z0 - (0.00022 if touching else 0.0); button.keyframe_insert("location", frame=fr)
            ringing = t_off is None
            alarm.rotation_euler = (0, math.radians(5 if (fr // 2) % 2 else -5) if ringing else 0, math.radians(4 if (fr // 4) % 2 else -4) if ringing else 0)
            alarm.keyframe_insert("rotation_euler", frame=fr)
            if fr % 4 == 0: print("CONTACT TW2 t=%.2f fingertip_to_button %.4f off_centre %.4f ringing %s" % (t, d, dxy, ringing), flush=True)
        ch.finish(); E.constant(button); E.constant(alarm)
        if t_off is None: print("CONTACT TW2 WARN the fingertip never touched the button", flush=True)
        CAMS = {"HF": (BTN_TOP + Vector((0, 0, 0.003)), Vector((-0.06, -0.12, 0.05)), 170),
                "HS": (BTN_TOP + Vector((0, 0, 0.003)), Vector((-0.14, -0.01, 0.03)), 170)}
    else:
        # TW4: in her school uniform, a little "ta-da": arms open, head tilted, back to standing
        OPEN = {k: v for k, v in E.P_open().items()}
        for fr in E.frames():
            t = fr / E.FPS
            u = E.ease((t - 0.4) / 0.5) * (1 - E.ease((t - 2.2) / 0.5))
            rig.body(t, blend_dirs(E.P_stand(), OPEN, u), (6 * u, 0, 3))
            for side in ("Right", "Left"): curl(ch, side, G_RELAX); key_hand(ch, side, fr)
        ch.finish()
        for fr in (0, E.f(T)): alarm.keyframe_insert("rotation_euler", frame=fr)
        CAMS = {}
    if CAMSUB in CAMS:
        aim, off, lens = CAMS[CAMSUB]; still_cam(aim, off, lens)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    else:
        aim = Vector((SX2 - 0.004, SY2, FLOOR + 0.040))
        cam_move(55, aim + Vector((-0.02, -0.30, 0.03)), aim, aim + Vector((-0.016, -0.28, 0.028)), aim, focus=(SX2, SY2 - 0.006, FLOOR + 0.05))
    view_report(SHOT, [("pupil_head", lambda: wpt(ch, "Head")), ("alarm", BTN_TOP), ("left_foot", lambda: wpt(ch, "LeftFoot")), ("clock", CLOCK)])

else:
    # ---------- TW3: brushing her teeth at the basin (basin on her left) ----------
    for fr in (0, E.f(T)): alarm.keyframe_insert("rotation_euler", frame=fr)
    rig = Rig(ch, M_, 0, (0, 0, 0), hips_xy=(SX3, SY3))
    rig.learn_hands()
    HEAD_B = (0, -4, -2)
    rig.body(0, {}, HEAD_B); mouth0 = mouth(ch)
    hang_R = rig.hanging("Right", HEAD_B)
    # grip: fist round the handle, fingers pointing forward before they curl, palm down; the handle runs across the palm
    q_g = hand_q(ch, "Right", Vector((0, -1, 0)), Vector((0, 0, -1)))
    Mh = rig.calibrate("Right", q_g, G_BRUSH, HEAD_B)
    w_, fwd_, acr_, palm_ = hand_frame(ch, "Right")
    acr_w = world_vec(ch, acr_); palm_w = world_vec(ch, palm_)
    gp = (wpt(ch, "RightHandMiddle1") + wpt(ch, "RightHandMiddle2") + wpt(ch, "RightHandIndex2") + wpt(ch, "RightHandRing2")) / 4
    C_BR = Mh.inverted() @ frame_XY(gp, acr_w, Vector((0, 1, 0)))
    print("DESK GRIP brush across-palm dir %s palm %s grip point %s" % (tuple(round(v, 2) for v in acr_w), tuple(round(v, 2) for v in palm_w),
          tuple(round(v, 4) for v in gp)), flush=True)
    brush = toothbrush()
    # at the mouth: brush level, pointing from her right (-x) towards her middle, bristles into the mouth (+y), head at the right corner
    D_IN = Vector((1.0, -0.12, 0.05)).normalized()
    HEAD_AT = mouth0 + Vector((env("BR_DX", "-0.0010"), env("BR_DY", "-0.0009"), env("BR_DZ", "-0.0003")))
    def brush_at(s):
        M = frame_XY(HEAD_AT - D_IN * (BR_HEAD - 0.0004) + D_IN * s, D_IN, Vector((0, 1, 0))); return M
    B_HOME = frame_XY(Vector((SINK_X + 0.006, WALL_Y - 0.006 - 0.006, SINK_TOP + 0.0060)), Vector((-0.2, -1, 0.9)), Vector((1, 0, 0)))
    B_CHEST = brush_at(-0.0040); B_CHEST.translation += Vector((-0.002, -0.004, -0.006))
    ST0, ST1 = 0.6, 3.6                                   # strokes from / to
    def brush_target(t):
        if t < 0.4: return B_CHEST
        if t < ST0: return blend_M(B_CHEST, brush_at(0.0), (t - 0.4) / (ST0 - 0.4))
        if t < ST1: return brush_at(0.0008 * math.sin(2 * math.pi * 3.0 * (t - ST0)))
        return blend_M(brush_at(0.0), B_CHEST, (t - ST1) / 0.5)
    for fr in E.frames():
        t = fr / E.FPS
        tgt = rig.from_prop("Right", brush_target(t), C_BR, G_BRUSH)
        head = HEAD_B if ST0 - 0.1 <= t < ST1 else (0, 0, -2)
        rig.solve(t, fr, head, tgt, None)
        Mb = hand_M(ch, "Right") @ C_BR; set_M(brush, Mb, fr)
        if fr % 6 == 0:
            hw = wpt(ch, "RightHand"); hd = wpt(ch, "Head")
            print("CONTACT TW3 t=%.2f brush_head_to_right_mouth_corner %.4f wrist_to_head_bone %.4f wrist_below_mouth %.4f" % (
                t, ((Mb @ Vector((BR_HEAD - 0.0004, 0.0006, 0))) - (mouth(ch) + Vector((-0.0010, 0, -0.0003)))).length, (hw - hd).length, mouth(ch).z - hw.z), flush=True)
    ch.finish(); E.constant(brush)
    foam = E.felt("foam", (0.99, 0.99, 1.0))
    for k, off in enumerate((Vector((-0.0012, -0.0012, -0.0004)), Vector((-0.0006, -0.0013, -0.0008)), Vector((-0.0016, -0.0010, -0.0009)))):
        fb = E.ball(mouth0 + off, 0.00035 + 0.0001 * k, foam, "foam"); E.show_between([fb], t_on=ST0 + 0.6 + 0.4 * k, t_off=ST1 + 0.2)
    CAMS = {"HF": (mouth0 + Vector((-0.003, -0.001, -0.002)), Vector((-0.07, -0.12, 0.012)), 150),
            "HS": (mouth0 + Vector((-0.003, -0.001, -0.002)), Vector((-0.14, -0.01, 0.01)), 150)}
    if CAMSUB in CAMS:
        aim, off, lens = CAMS[CAMSUB]; still_cam(aim, off, lens)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    else:            # from the front a little to her left: the basin, the mirror and her face; the brush on her right cheek side
        aim = Vector((SX3 + 0.012, SY3 - 0.004, FLOOR + 0.046))
        cam_move(50, aim + Vector((0.035, -0.30, 0.012)), aim, aim + Vector((0.032, -0.285, 0.010)), aim, focus=mouth0)
    view_report("TW3", [("pupil_mouth", lambda: mouth(ch)), ("basin", (SINK_X, WALL_Y - 0.019, SINK_TOP)), ("mirror", (SINK_X, 0.238, SINK_TOP + 0.034))])

face_px(SHOT + ("" if CAMSUB == "main" else CAMSUB), {"TW1": [120], "TW2": [72], "TW3": [48], "TW4": [36]}[SHOT])
print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
E.run(A[3:])
'''
out = HEAD + "\n" + body + BUILD
out.encode("ascii")              # colab exec reads cp950: must be ASCII
(HERE / "taiwan_getup.py").write_text(out, encoding="utf-8", newline="\n")
print("wrote taiwan_getup.py", len(out.splitlines()), "lines")
