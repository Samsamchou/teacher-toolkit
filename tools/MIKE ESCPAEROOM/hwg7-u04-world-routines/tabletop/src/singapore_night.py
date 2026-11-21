# World Routines Trip - Singapore station "I go to bed at nine forty-five." (tabletop style H)
# blender -b --factory-startup --python singapore_night.py -- <props> <fonts> <SHOT> <mode> ...
#   SHOT: SG1 wide bedroom (HDB flat, night): the traveller asks; the girl in pyjamas, standing in front of her bed, points at the
#             9:45 wall clock (top right) with her LEFT hand
#         SG2 bathroom corner (made here): she stands behind a pedestal sink (sink between her and the camera, top at her waist),
#             left hand flat on the sink, right hand picks up the toothbrush lying on its side, brings it level from her RIGHT side
#             into the RIGHT mouth corner (head at most 2 mm in), three small strokes, out to the right, back on the sink: "I brush my teeth"
#         SG3 she sits on the bed edge (thighs ON the mattress, shins hanging, slippers on the floor), bedside cabinet on her RIGHT:
#             right hand takes the closed story book, brings it below her chin, the front cover swings open to her left,
#             the left hand takes the other corner, head a little down: "...and read a book."
#         SG4 the book closes (left hand), right hand puts it back on the cabinet (let go when it lies on the top), waves: "Good night!"
#         SG5 right index fingertip presses the button on the lamp base: the lamp goes out (blue moonlight + city lights, face
#             still lit), she smiles: "I go to bed at nine forty-five."
#   Check cameras (SHOT + suffix; the first three letters pick the action), sharp, no depth of field:
#         SG2HG / SG2HG2  toothbrush pick-up grip on the sink (front-right / her right side)
#         SG2HF / SG2HS   brushing: front close-up (is the whole face visible?) / her right side (head into the right corner, from the side)
#         SG3HF / SG3HS   book pick-up grip at the cabinet (front-right / from above-left)
#         SG3HR / SG3HR2  both hands on the open book (front / from above: thumbs on the pages)
#         SG4HF / SG4HS   book back on the cabinet (release) ; SG5HF / SG5HS lamp button press
#         SG3L / SG3L2    legs: front-left at seat height (thighs ON the mattress) / low front (shins hang, feet on the floor)
#         SG1C / SG5C     close front of the girl (face light check; SG5C before and after the lamp goes out)
# Models: singapore_girl_pyjamas (rigged), traveler_girl, singapore_bed, singapore_bedside (cabinet + lamp).
# Made here: room, window with HDB blocks + Marina Bay Sands at night, orchid, ceiling fan, 9:45 clock, the bathroom corner
#   (tiles, pedestal sink, tap), the toothbrush, the story book (back block + hinged front cover), the lamp button.
# Hand helpers: from hands import * (tabletop/src/hands.py). New grips (toothbrush, book corner, button press) live here first.
# Props held in a hand are rigid to the hand bone: prop = hand_matrix @ C (C measured once with the grip curled); wanted prop
#   pose -> hand pose -> arm IK; the prop is drawn from the hand that was really reached (short arm -> CONTACT numbers, no float).
# Measurement lines: DESK (furniture, body, fit, reach, grips), CONTACT (brush tip in the corner, hand outside the cheek, book on the
#   cabinet, fingertip on the button), plus the engine's CHK / GND. Numbers marked GUESS: check them in the first check frames.
# colab_run.py does not pass environment variables: change the defaults in this file.
# ASCII only: colab exec reads files with cp950 on Windows.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import engine as E
from hands import *            # shared hand helpers (tabletop/src/hands.py)
import hands as H
# 11/21 shared rule: tight grips (toothbrush fist, pointing / pressing hand, pinch) bend past 90 deg, where curl() turns the next
# segment back. curl_hinge() bends each finger about ONE hinge axis; for small bends it gives the same result as curl().
curl = H.curl_hinge

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, FONTS, SHOT = A[0], A[1], A[2]
# shot lengths and voice start times (seconds): keep in step with singapore_compose.py
DUR = {"SG1": 5.6, "SG2": 4.0, "SG3": 3.8, "SG4": 3.0, "SG5": 7.6}
VOICE = {"q": 0.4, "a": 2.6, "teeth": 1.1, "book": 0.4, "gn": 1.6, "a5": 1.6}
CAMSUB = SHOT[3:] or "main"
SHOT = SHOT[:3]
E.init(PROPS, FONTS, DUR[SHOT])
sc = E.sc
T = DUR[SHOT]


def env(k, d):
    return float(os.environ.get(k, d))


def lin(c):
    """sRGB colour -> linear (Blender material colours are linear; 11/20 the code chair came out white)."""
    return tuple(max(0.0, v) ** 2.2 for v in c)


FLOOR = 0.012
KID = 0.070
GIRL = KID * 1.06                # the traveller (sun hat)
PUPIL = KID * 1.04
WALL_Y = 0.246                   # back wall centre (front face 0.240)
# --- bedroom layout (GUESS: check DESK BED / DESK CAB / DESK SIT lines) ---
HX = env("HX", "-0.020")                  # her hips x when she sits on the bed edge
BED_L = env("BED_L", "0.090")             # bed length (long side along the back wall)
HIP_HALF = env("HIP_HALF", "0.0060")      # half the width of her bottom
CAB_DZ = env("CAB_DZ", "0.0050")          # cabinet top this much above her seated hip joints (waist; 11/21 3 -> 5 mm: book grab was 101-105 % reach)
CAB_MIN = env("CAB_MIN", "0.017")         # smallest cabinet footprint (long side); else the height is squashed instead
CAB_MAX = env("CAB_MAX", "0.026")         # largest footprint (11/21: uniform scale gave 28 mm, the lamp button was out of reach)
CAB_DY = env("CAB_DY", "0.0")             # (unused since 11/21: the lamp is put at LAMP_DY)
LAMP_DY = env("LAMP_DY", "-0.004")        # lamp centre y from her hips y (a little in front of her shoulder)
CAB_GAP = env("CAB_GAP", "0.0040")        # her hip side to the cabinet side (room for her wrist beside the thigh)
LEAN = (0, 0, -10)                        # leans a little forward over the book (11/21: -6 still left the reading hand at 95 % reach)
CLOCK_Z = env("CLOCK_Z", "0.112")
WIN_DX = env("WIN_DX", "0.030")
# --- book (sized to the chibi hand) ---
BOOK_H, BOOK_W = env("BOOK_H", "0.0074"), env("BOOK_W", "0.0056")   # spine length, page width
BOOK_T, COVER_T = 0.0012, 0.00025          # back cover + page block thickness, cover board
FRONT_T = 0.0004                            # front cover + a few pages (the hinged part)
OPEN = math.radians(-140)                   # front cover angle when open (V of 140 deg towards her)
PSI = math.radians(-20)                     # the back block turned 20 deg towards her (the V is symmetric)
OVERHANG = env("OVERHANG", "0.0018")        # the book's bottom edge sticks out over the cabinet edge (fingers go under it)
READ_GAP = env("READ_GAP", "0.0004")        # book to her chest (11/21: 1.2 mm -> 0.4 mm, closer = less reach)
CHIN_DZ = env("CHIN_DZ", "0.0028")          # GUESS: chin below the lips centre
# --- toothbrush ---
BRUSH_YAW = math.radians(env("BRUSH_YAW", "12"))    # handle angle from the x axis (11/21: 25 deg put the hand in front of the chin)
BRUSH_RISE = math.radians(env("BRUSH_RISE", "10"))  # handle rises from the hand (chin height) to the corner
DEPTH_MAX = 0.0018                          # brush head at most 2 mm into the mouth corner (teacher 11/20)
HAND_CLEAR = env("HAND_CLEAR", "0.0015")    # inner edge of the hand this far outside the head outline seen from the front (hair included)
CORNER_DX, CORNER_DY, CORNER_DZ = env("CORNER_DX", "0.0018"), env("CORNER_DY", "0.0006"), env("CORNER_DZ", "-0.0001")
BR_R = 0.00035                              # handle radius
LAMP_W = env("LAMP_W", "0.06")              # GUESS: point light in the lamp shade (W)


# ---------- generic helpers (uk_homework.py / egypt_breakfast.py) ----------
def hand_box(cx, cy, cz, ang, length, width, mat, name):
    E.box((cx + length / 2 * math.sin(ang), cy, cz + length / 2 * math.cos(ang)), (width, 0.001, length), mat, name, bevel=0, rot=(0, ang, 0))


def drop(root):
    for o in [root] + list(root.children_recursive): bpy.data.objects.remove(o, do_unlink=True)


def local_dir(ch_loc, face_deg, target, from_z):
    v = Vector(target) - Vector((ch_loc[0], ch_loc[1], from_z)); a = -math.radians(face_deg)
    return (v.x * math.cos(a) - v.y * math.sin(a), v.x * math.sin(a) + v.y * math.cos(a), v.z)


def key_obj(ob, fr, rot=False):
    ob.keyframe_insert("location", frame=fr)
    if rot: ob.keyframe_insert("rotation_euler", frame=fr)


def cam_move(lens, c0, a0, c1, a1, focus=None):
    c, a, fo = E.camera("cam", lens, 8)

    def path(t):
        u = E.ease(t / T)
        return E.vlerp(c0, c1, u), E.vlerp(a0, a1, u), (Vector(focus) if focus else E.vlerp(a0, a1, u))
    E.key_cam(c, a, fo, path)
    return c


def frame_M(o, z, xhint):
    z = Vector(z).normalized(); x = Vector(xhint); x = (x - x.dot(z) * z).normalized(); y = z.cross(x)
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = Vector(o); return M


def blend_M(M0, M1, u):
    u = E.ease(u)
    q = M0.to_3x3().normalized().to_quaternion().slerp(M1.to_3x3().normalized().to_quaternion(), u)
    M = q.to_matrix().to_4x4(); M.translation = M0.translation.lerp(M1.translation, u); return M


def key_M(keys, t):
    if t <= keys[0][0]: return keys[0][1]
    for (t0, a), (t1, b) in zip(keys, keys[1:]):
        if t <= t1: return blend_M(a, b, (t - t0) / max(1e-6, t1 - t0))
    return keys[-1][1]


def Tr(x, y, z):
    return Matrix.Translation((x, y, z))


def rotM(M):
    R = M.to_3x3().normalized().to_4x4(); return R


def mesh_hit(meshes, o, d):
    dg = bpy.context.evaluated_depsgraph_get(); best = None
    for ob in meshes:
        Mi = ob.matrix_world.inverted()
        ok, loc, n, idx = ob.ray_cast(Mi @ o, (Mi.to_3x3() @ d).normalized(), depsgraph=dg)
        if ok:
            p = ob.matrix_world @ loc; dist = (p - o).length
            if best is None or dist < best[0]: best = (dist, p)
    return best[1] if best else None


def set_M(ob, M, fr):
    ob.matrix_world = M; ob.scale = (1, 1, 1); key_obj(ob, fr, rot=True)


def hide(objs):
    for o in objs:
        for c in [o] + list(o.children_recursive): c.hide_render = True


def view_report(tag, pts):
    from bpy_extras.object_utils import world_to_camera_view as w2c
    sc.frame_set(0); bpy.context.view_layer.update()
    for name, p in pts:
        v = w2c(sc, sc.camera, Vector(p() if callable(p) else p))
        print("DESK VIEW %s %s x %.3f y %.3f depth %.3f" % (tag, name, v.x, v.y, v.z), flush=True)


def tri_obj(name, verts, faces, m):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); me.materials.append(m)
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob


def clock(cx, cy, cz, hh, mm):
    """Round wall clock, ticks only (no numbers): hour hand (hh + mm/60) * 30 deg, minute hand mm * 6 deg."""
    E.cyl((cx, cy, cz), 0.026, 0.006, E.mat("clockRim", lin((0.95, 0.95, 0.97)), 0.35), rot=(math.radians(90), 0, 0), verts=48, name="clockRim")
    E.cyl((cx, cy - 0.0025, cz), 0.0225, 0.004, E.mat("clockFace", (0.98, 0.97, 0.93), 0.6), rot=(math.radians(90), 0, 0), verts=48, name="clockFace")
    ink = E.mat("clockInk", (0.08, 0.08, 0.12), 0.5)
    for k in range(12):
        a = math.radians(k * 30); big = k % 3 == 0
        E.ball((cx + 0.019 * math.sin(a), cy - 0.005, cz + 0.019 * math.cos(a)), 0.0016 if big else 0.0009, ink, "tick")
    hand_box(cx, cy - 0.0052, cz, math.radians(((hh % 12) + mm / 60) * 30), 0.011, 0.0026, ink, "hourHand")
    hand_box(cx, cy - 0.0058, cz, math.radians(mm * 6), 0.0165, 0.0017, ink, "minuteHand")
    E.ball((cx, cy - 0.006, cz), 0.0018, E.mat("clockPin", lin((0.85, 0.30, 0.55)), 0.4), "clockPin")


# ---------- furniture probing (rays straight down; several hits per column) ----------
def probe(path, H0=0.1, n=56):
    root = E.place(path, H0, (5, 5, 0)); bpy.context.view_layer.update()
    x0, x1, y0, y1, top = E._bbox(root)
    dg = bpy.context.evaluated_depsgraph_get(); cols = []
    for i in range(n + 1):
        for j in range(n + 1):
            x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * j / n; z = top + 0.05; hs = []
            for _ in range(10):
                ok, loc, nrm, idx, ob, mx = sc.ray_cast(dg, Vector((x, y, z)), Vector((0, 0, -1)), distance=1.0)
                if not ok: break
                hs.append((loc.z, nrm.z)); z = loc.z - 1e-5
            cols.append((x - 5, y - 5, hs))
    drop(root)
    return cols, top, (x0 - 5, x1 - 5, y0 - 5, y1 - 5)


def level(pts, top, lo, hi):
    pts = [p for p in pts if lo * top < p[2] < hi * top]
    if not pts: return None, []
    bins = {}
    for p in pts: bins.setdefault(int(p[2] / (0.01 * top)), []).append(p)
    best = max(bins, key=lambda b: len(bins.get(b - 1, [])) + len(bins[b]) + len(bins.get(b + 1, [])))
    g = bins.get(best - 1, []) + bins[best] + bins.get(best + 1, [])
    zs = sorted(p[2] for p in g); z = zs[int(len(zs) * 0.9)]
    return z, [p for p in g if abs(p[2] - z) < 0.012 * top]


def bbox2(g):
    return (min(p[0] for p in g), max(p[0] for p in g), min(p[1] for p in g), max(p[1] for p in g))


def rot2(p, a):
    c, s = math.cos(a), math.sin(a); return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)


def rbox(b, a):
    pts = [rot2((x, y), a) for x in b[:2] for y in b[2:]]
    return (min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts))


def probe_bed(strip_w, strip_d):
    """Bed top outline, the bed outline, and the quarter turn that puts the long side along x with the LOWER end of the bed top
    at -x (her right, where the cabinet goes). 11/21 first check: the pillow (at one end) and the folded blanket (at the other)
    both cover the whole width, so a 'free' mattress edge was 2 cm into the bed and the cabinet ended up out of her reach.
    Now she sits ON the end itself (the folded blanket, the lower one) right beside the bed end; the seat level is that surface.
    strip_w / strip_d: world size of her bottom + thighs on the front edge (scaled into the probe units here)."""
    cols, top, bb = probe(f"{PROPS}/singapore_bed.glb")
    first = [(x, y, hs[0][0]) for x, y, hs in cols if hs and hs[0][1] > 0.5]
    mz, mp = level(first, top, 0.12, 0.85)
    if mz is None: raise SystemExit("DESK BED no mattress level found")
    k = BED_L / max(bb[1] - bb[0], bb[3] - bb[2])
    topp = [(x, y, z) for x, y, z in first if z > 0.85 * mz]               # mattress + pillow + blanket (not the low frame rails / legs)
    tb = bbox2(topp)
    along_x = (bb[1] - bb[0]) >= (bb[3] - bb[2])
    best = None
    for a in ([0.0, math.pi] if along_x else [math.pi / 2, -math.pi / 2]):
        r = rbox(tb, a)
        seat = sorted(z for x, y, z in topp for p in [rot2((x, y), a)]
                      if r[0] + 0.0008 / k <= p[0] <= r[0] + (strip_w + 0.0008) / k and r[2] <= p[1] <= r[2] + strip_d / k)
        if not seat: continue
        s85 = seat[int(len(seat) * 0.85)]; spread = seat[int(len(seat) * 0.95)] - seat[int(len(seat) * 0.05)]
        print("DESK BED candidate turn %d deg: seat surface at the -x end %.4f (mattress %.4f) bumps %.4f (world before squash)" % (
            round(math.degrees(a)), k * s85, k * mz, k * spread), flush=True)
        if best is None or s85 < best[1]: best = (a, s85, spread)
    a, sz, spread = best
    info = dict(top=top, k=k, rot=a, mz=mz, seat_z=sz, tbox=rbox(tb, a), bbox=rbox(bb, a), spread=spread)
    print("DESK BED PROBE model height %.3f mattress_z %.4f seat surface %.4f (%.0f %% of height) turn %d deg scale %.4f -> seat %.4f before squash, bumps %.4f %s" % (
        top, mz, sz, 100 * sz / top, round(math.degrees(a)), k, k * sz, k * spread,
        "" if k * spread < 0.004 else "WARN uneven seat (thighs may sink into the folded blanket)"), flush=True)
    return info


def probe_cab():
    """Cabinet top level, the lamp centre, its base top / radius and the shade (all model units, model height 0.1)."""
    cols, top, bb = probe(f"{PROPS}/singapore_bedside.glb")
    first = [(x, y, hs[0][0]) for x, y, hs in cols if hs and hs[0][1] > 0.5]
    cz, cp = level(first, top, 0.25, 0.95)
    if cz is None: raise SystemExit("DESK CAB no cabinet top found")
    lamp = [(x, y, hs[0][0]) for x, y, hs in cols if hs and hs[0][0] > cz + 0.06 * top]
    if lamp:
        lx = sum(p[0] for p in lamp) / len(lamp); ly = sum(p[1] for p in lamp) / len(lamp); ltop = max(p[2] for p in lamp)
        rs = sorted(math.hypot(p[0] - lx, p[1] - ly) for p in lamp); shade_r = rs[int(len(rs) * 0.9)]
    else:
        lx, ly, ltop, shade_r = 0.0, 0.0, cz + 0.5 * top, 0.15 * top
    base = []
    for x, y, hs in cols:
        if math.hypot(x - lx, y - ly) > shade_r * 1.05: continue
        for z, nz in hs:
            if nz > 0.6 and cz + 0.004 * top < z < cz + 0.35 * (ltop - cz): base.append((x, y, z))
    if base:
        zs = sorted(p[2] for p in base); base_z = zs[len(zs) // 2]
        rr = sorted(math.hypot(p[0] - lx, p[1] - ly) for p in base); base_r = min(rr[int(len(rr) * 0.85)], 0.8 * shade_r)
    else:
        base_z, base_r = cz + 0.03 * top, 0.35 * shade_r
    shade_lo = None
    for x, y, hs in cols:          # lowest downward-facing hit under the shade rim = the shade's lower edge
        if 0.6 * shade_r < math.hypot(x - lx, y - ly) < shade_r:
            for z, nz in hs:
                if z > base_z + 0.01 * top and (shade_lo is None or z < shade_lo): shade_lo = z
    info = dict(top=top, cab_z=cz, cab_box=bbox2(cp), bbox=bb, lamp=(lx, ly), lamp_top=ltop, shade_r=shade_r,
                base_z=base_z, base_r=base_r, shade_lo=shade_lo if shade_lo is not None else base_z + 0.5 * (ltop - base_z))
    print("DESK CAB PROBE model height %.3f top_z %.4f lamp (%.4f, %.4f) lamp_top %.4f shade_r %.4f shade_lo %.4f base_z %.4f base_r %.4f (%d base hits)" % (
        top, cz, lx, ly, ltop, shade_r, info["shade_lo"], base_z, base_r, len(base)), flush=True)
    return info


# ---------- characters ----------
_MOUTH_REF = H._MOUTH_REF


def fwd_of(ch):
    return ch.root.matrix_world.to_3x3().normalized() @ Vector((0, -1, 0))


def metrics(ch):
    """Rest-pose body numbers (lengths, heights above the floor, tummy depth) and the lips offset from the head bone."""
    bpy.context.view_layer.update()
    Aw = ch.arm.matrix_world
    P = lambda b, tail=False: Aw @ (ch.pb[b].tail if tail else ch.pb[b].head)
    ground = ch.root.matrix_world.translation.z - ch.base_z
    fwd = fwd_of(ch); up = Vector((0, 0, 1)); side = fwd.cross(up).normalized()
    hips = P("Hips"); shR, shL = P("RightArm"), P("LeftArm")
    m = dict(hips=hips, root=ch.root.matrix_world.translation.copy(), hip_h=hips.z - ground,
             knee_h=(P("RightLeg").z + P("LeftLeg").z) / 2 - ground, ankle_h=(P("RightFoot").z + P("LeftFoot").z) / 2 - ground,
             thigh=(P("RightLeg") - P("RightUpLeg")).length, upleg_dz=P("RightUpLeg").z - hips.z,
             sh_hips=(shR.z + shL.z) / 2 - hips.z, sh_half=(shR - shL).length / 2,
             upper=(P("RightForeArm") - P("RightArm")).length, fore=(P("RightHand") - P("RightForeArm")).length,
             hand=(P("RightHandMiddle1") - P("RightHand")).length)
    best = 0.0
    for k in range(7):
        z = hips.z + 0.002 + (m["sh_hips"] - 0.002) * k / 6
        for dx in (-0.003, 0.0, 0.003):
            c = Vector((hips.x, hips.y, z)) + side * dx
            p = mesh_hit(ch.meshes, c + fwd * 0.06, -fwd)
            if p is not None: best = max(best, (p - c).dot(fwd))
    m["front"] = best if best > 0.002 else 0.006
    head = P("Head"); mz = env("MOUTH_Z", "0.0005")
    p = mesh_hit(ch.meshes, head + up * mz + fwd * 0.06, -fwd)
    lips = (p - head - up * mz).dot(fwd) if p is not None else None
    my = os.environ.get("MOUTH_Y")
    m["mouth_y"] = float(my) if my else (lips - 0.0002 if lips is not None and 0.004 < lips < 0.016 else 0.0082)
    R = (Aw @ ch.pb["Head"].matrix).to_3x3().normalized()
    _MOUTH_REF[ch.name] = R.inverted() @ (fwd * m["mouth_y"] + up * mz)
    print("DESK BODY %s hip_h %.4f knee_h %.4f ankle_h %.4f thigh %.4f sh_above_hips %.4f sh_half %.4f upper %.4f fore %.4f hand %.4f front %.4f lips_probe %s mouth_y %.4f" % (
        ch.name, m["hip_h"], m["knee_h"], m["ankle_h"], m["thigh"], m["sh_hips"], m["sh_half"], m["upper"], m["fore"], m["hand"], m["front"],
        "%.4f" % lips if lips is not None else "none", m["mouth_y"]), flush=True)
    return m


_CORNER_REF = {}


def mouth_corner(ch):
    """Her RIGHT mouth corner (-x side of the lips centre, a little back), turning with the head. First call = reference pose."""
    bpy.context.view_layer.update()
    M = ch.arm.matrix_world @ ch.pb["Head"].matrix; R = M.to_3x3().normalized(); h = M.translation.copy()
    if ch.name not in _CORNER_REF:
        c = mouth(ch) + Vector((-CORNER_DX, CORNER_DY, CORNER_DZ))
        _CORNER_REF[ch.name] = R.inverted() @ (c - h)
    return h + R @ _CORNER_REF[ch.name]


def animate(ch, fn, after=None):
    for fr in E.frames():
        t = fr / E.FPS; arms, head = fn(t)
        ch.pose(t, arms, twist={"Head": head})
        if after: after(t, fr)
    ch.finish(); return ch


def stand(name, loc, face, fn, after=None, height=KID):
    return animate(E.Char(name, loc, face, height=height), fn, after)


P_LAP = {"RightArm": (-0.3, -0.35, -0.9), "RightForeArm": (0.15, -0.9, -0.35), "LeftArm": (0.3, -0.35, -0.9), "LeftForeArm": (-0.15, -0.9, -0.35)}

# ---------- grips: degrees per finger segment (1, 2, 3), bent towards the palm ----------
G_FLAT = {"Thumb": (5, 6, 4), "Index": (3, 5, 3), "Middle": (3, 5, 3), "Ring": (4, 6, 4), "Pinky": (5, 7, 4)}
G_POINT = {"Thumb": (25, 25, 15), "Index": (0, 0, 0), "Middle": (70, 80, 50), "Ring": (75, 80, 50), "Pinky": (75, 80, 50)}
G_WAVE = {f: (2, 3, 2) for f in FINGERS}
# toothbrush (checked 11/20): four fingers round the handle, thumb flat ON the handle pointing to the head
G_BRUSH = {"Thumb": (4, 6, 4), "Index": (52, 58, 40), "Middle": (58, 64, 44), "Ring": (62, 66, 46), "Pinky": (66, 66, 46)}
G_BRUSH_OPEN = {"Thumb": (3, 4, 2), "Index": (18, 20, 12), "Middle": (20, 22, 14), "Ring": (22, 24, 16), "Pinky": (24, 24, 16)}
# book corner: thumb on the page side, the other fingers behind the book (back cover)
G_BOOK = {"Thumb": (18, 14, 8), "Index": (22, 26, 16), "Middle": (24, 28, 18), "Ring": (28, 30, 20), "Pinky": (32, 32, 20)}
G_BOOK_OPEN = {f: (8, 10, 6) for f in FINGERS}
# lamp button: index straight, the others curled, thumb on the middle finger
G_PRESS = {"Thumb": (30, 30, 18), "Index": (4, 6, 4), "Middle": (70, 80, 50), "Ring": (75, 80, 50), "Pinky": (75, 80, 50)}

HL = {}


def hand_q(ch, side, fwd_w, palm_w):
    def basis(a, b):
        a = Vector(a).normalized(); b = Vector(b); b = (b - b.dot(a) * a).normalized(); return Matrix((a, b, a.cross(b))).transposed()
    a_l, b_l = HL[(ch.name, side)]
    return (basis(fwd_w, palm_w) @ basis(a_l, b_l).transposed()).to_quaternion()


def set_hand_rot(ch, side, q):
    bpy.context.view_layer.update(); pb = ch.pb[side + "Hand"]
    Ar = ch.arm.matrix_world.to_3x3().normalized()
    N = (Ar.inverted() @ q.to_matrix()).to_4x4(); N.translation = pb.matrix.translation.copy()
    pb.matrix = N


def _hand_twist(ch, side, q):
    """Angle (rad) by which the wanted hand rotation q (world) turns about the FOREARM's own axis, relative to the rest pose."""
    bpy.context.view_layer.update()
    pf, ph = ch.pb[side + "ForeArm"], ch.pb[side + "Hand"]
    R0 = ch.arm.data.bones[pf.name].matrix_local.to_3x3().inverted() @ ch.arm.data.bones[ph.name].matrix_local.to_3x3()
    Rh = ch.arm.matrix_world.to_3x3().normalized().inverted() @ q.to_matrix()
    Rf = pf.matrix.to_3x3().normalized()
    D = (Rf.inverted() @ Rh @ R0.inverted()).to_quaternion()
    tw = 2 * math.atan2(D.y, D.w)
    return (tw + math.pi) % (2 * math.pi) - math.pi, Rf


def untwist(ch, side, q, fr, share=0.8):
    """11/21 SG2 check: a palm-down grab twisted the wrist like a sweet wrapper (the forearm bone kept its rest roll and the hand
    alone turned). Roll the forearm about its own axis by `share` of the hand's turn, so the wrist only takes the rest.
    Call after the arm directions are set and before set_hand_rot(). Returns the hand's total turn in degrees."""
    total = 0.0
    for _ in range(2):                         # twist is measured on the current forearm: two passes converge
        tw, Rf = _hand_twist(ch, side, q)
        if abs(tw) < 1e-4: break
        rot_bone(ch, side + "ForeArm", Rf @ Vector((0, 1, 0)), tw); total += tw
    back = -(1.0 - share) * total
    if abs(back) > 1e-4:
        Rf = _hand_twist(ch, side, q)[1]; rot_bone(ch, side + "ForeArm", Rf @ Vector((0, 1, 0)), back)
    ch.pb[side + "ForeArm"].keyframe_insert("rotation_quaternion", frame=fr)
    return math.degrees(total)


def hand_M(ch, side):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ ch.pb[side + "Hand"].matrix


def wpt(ch, bone, tail=False):
    bpy.context.view_layer.update(); return ch.arm.matrix_world @ (ch.pb[bone].tail if tail else ch.pb[bone].head)


def world_vec(ch, v):
    return (ch.arm.matrix_world.to_3x3().normalized() @ v).normalized()


def tblend(a, b, u):
    u = E.ease(u)
    return (a[0].slerp(b[0], u), a[1].lerp(b[1], u), {f: tuple(x + (y - x) * u for x, y in zip(a[2][f], b[2][f])) for f in FINGERS}, a[3].lerp(b[3], u))


def blend_dirs(a, b, u):
    u = E.ease(u)
    return {k: tuple(Vector(a[k]).normalized().lerp(Vector(b[k]).normalized(), u).normalized()) for k in b}


class Body:
    """Seated (hips on the seat, thighs forward, shins straight down) or standing (legs in rest pose); spine lean, head twist;
    arms by two-bone IK, hands turned and fingers curled. Same scheme as egypt_breakfast.py Sit."""

    def __init__(self, ch, M, hips_xy, seat_z=None, lean=(0, 0, 0)):
        self.ch, self.M, self.lean = ch, M, lean
        off = M["hips"] - M["root"]
        if seat_z is not None:
            ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y, seat_z + SEAT_HIP - M["hip_h"]))
            hipj = seat_z + SEAT_HIP + M["upleg_dz"]; dz = (FLOOR + M["knee_h"]) - hipj
            dz = max(-0.95 * M["thigh"], min(0.7 * M["thigh"], dz)); hz = math.sqrt(max(1e-12, M["thigh"] ** 2 - dz * dz))
            self.legs = {"RightUpLeg": (-0.12 * M["thigh"], -hz, dz), "LeftUpLeg": (0.12 * M["thigh"], -hz, dz), "RightLeg": (0, -0.08, -1), "LeftLeg": (0, -0.08, -1)}
        else:
            ch.at(0, loc=(hips_xy[0] - off.x, hips_xy[1] - off.y))
            self.legs = {}
        self.pole = {"Right": Vector((-0.7, 0.4, -1.0)), "Left": Vector((0.7, 0.4, -1.0))}

    def body(self, t, arm_dirs, head):
        ch = self.ch
        ch.pose(t, dict(self.legs), twist={"Spine1": self.lean, "Head": tuple(head)})
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            if b in arm_dirs: ch._aim(b, arm_dirs[b])
        for b in ("RightArm", "RightForeArm", "LeftArm", "LeftForeArm"):
            ch.pb[b].keyframe_insert("rotation_quaternion", frame=E.f(t))

    def learn_hands(self, head):
        self.body(0, P_LAP, head)
        for s_ in ("Right", "Left"):
            w_, f_, a_, p_ = hand_frame(self.ch, s_)
            HL[(self.ch.name, s_)] = (to_local(self.ch, s_, f_, point=False).normalized(), to_local(self.ch, s_, p_, point=False).normalized())

    def rest(self, side, P, fwd, palm=(0, 0, -1), grip=None):
        f = Vector(fwd).normalized()
        return (hand_q(self.ch, side, f, Vector(palm)), Vector(P) - f * (self.M["hand"] * 0.55) + Vector((0, 0, 0.0014)), grip or G_FLAT, self.pole[side].copy())

    def from_prop(self, side, Md, C, grip, pole=None):
        Mh = Md @ C.inverted()
        return (Mh.to_3x3().normalized().to_quaternion(), Mh.translation.copy(), grip, (pole if pole is not None else self.pole[side]).copy())

    def calibrate(self, side, q, grip, head):
        self.body(0, P_LAP, head); set_hand_rot(self.ch, side, q); curl(self.ch, side, grip)
        return hand_M(self.ch, side)

    def solve(self, t, fr, head, tr, tl, extra=None):
        ch = self.ch
        self.body(t, P_LAP, head)
        arms = {}
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            arms.update(ik_arm(ch, side, g[1], g[3]))
            nd, ar = ik_arm.last
            if fr % 12 == 0 or nd > 0.9 * ar:
                print("DESK REACH %s %s t=%.2f need %.4f arm %.4f (%.0f %%)%s" % (ch.name, side, t, nd, ar, 100 * nd / ar,
                      " WARN over 90 %" if nd > 0.9 * ar else ""), flush=True)
        if extra: arms.update(extra)
        self.body(t, arms, head)
        for side, g in (("Right", tr), ("Left", tl)):
            if g is None: continue
            tw = untwist(ch, side, g[0], fr)
            if fr % 12 == 0: print("DESK TWIST %s t=%.2f hand turns %.0f deg about the forearm (80 %% taken by the forearm)" % (side, t, tw), flush=True)
            set_hand_rot(ch, side, g[0]); curl(ch, side, g[2]); key_hand(ch, side, fr)


def wave_dirs(t, right=True):
    side = "Right" if right else "Left"
    return {b: v for b, v in E.P_wave(int(t * 3) % 2, right=right).items() if b.startswith(side)}


def stand_dirs(side):
    return {b: v for b, v in E.P_stand().items() if b.startswith(side)}


# ---------- the bedroom (HDB flat at night, cut open like a doll's house) ----------
def bedroom(win_x):
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((0, 0.03), (0.64, 0.44), E.felt("floorLaminate", lin((0.72, 0.56, 0.40))), "floor", thick=FLOOR)
    gap = E.mat("boardGap", lin((0.45, 0.33, 0.22)), 0.9)
    for i in range(1, 22):
        E.box((-0.32 + i * 0.029, 0.03, FLOOR + 0.0002), (0.0008, 0.44, 0.0004), gap, "boardLine", bevel=0)
    mint = E.felt("mintWall", lin((0.72, 0.88, 0.80)))
    wall = E.box((0, WALL_Y, FLOOR + 0.12), (0.64, 0.012, 0.24), mint, "backWall")
    wz0, wz1, ww = FLOOR + 0.060, FLOOR + 0.165, 0.092
    cut = E.box((win_x, WALL_Y, (wz0 + wz1) / 2), (ww, 0.05, wz1 - wz0), E.mat("cutter", (0, 0, 0), 0.5), "winCut", bevel=0)
    mod = wall.modifiers.new("win", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cut
    cut.hide_render = True; cut.display_type = "WIRE"
    white = E.mat("paintWhite", lin((0.96, 0.96, 0.94)), 0.5)
    E.box((0, 0.2385, FLOOR + 0.005), (0.64, 0.003, 0.01), white, "skirting", bevel=0)
    for x in (-0.326, 0.326):
        E.box((x, 0.03, FLOOR + 0.12), (0.012, 0.44, 0.24), E.felt("sideWall", lin((0.68, 0.84, 0.76))), "sideWall")
    # window: white aluminium frame with a middle bar (HDB style), grille, sill
    zc = (wz0 + wz1) / 2; hh = wz1 - wz0
    for (x, z, sx, sz) in ((win_x - ww / 2 + 0.002, zc, 0.004, hh), (win_x + ww / 2 - 0.002, zc, 0.004, hh), (win_x, wz1 - 0.002, ww, 0.004),
                           (win_x, wz0 + 0.002, ww, 0.004), (win_x, zc, 0.003, hh), (win_x, zc + hh * 0.18, ww, 0.0025)):
        E.box((x, 0.243, z), (sx, 0.010, sz), white, "winFrame", bevel=0)
    E.box((win_x, 0.236, wz0 - 0.001), (ww + 0.012, 0.012, 0.004), white, "winSill", bevel=0.0005)
    # orchid (national flower) in a pot on the sill
    pot = E.mat("pot", lin((0.80, 0.45, 0.30)), 0.7); stem = E.mat("orchidStem", lin((0.25, 0.45, 0.20)), 0.6)
    petal = E.felt("orchidPetal", lin((0.62, 0.30, 0.78))); lip = E.felt("orchidLip", lin((0.95, 0.85, 0.30)))
    ox, oy, oz = win_x - 0.028, 0.233, wz0 + 0.001
    E.cyl((ox, oy, oz + 0.004), 0.0045, 0.008, pot, verts=20, name="orchidPot")
    for k, (dx, h) in enumerate(((-0.0015, 0.022), (0.0018, 0.018))):
        s = E.cyl((ox + dx, oy, oz + 0.008 + h / 2), 0.00045, h, stem, verts=8, name="orchidStem")
        for j in range(4):
            cx_ = ox + dx + (0.002 + 0.0022 * j) * (1 if k else -1) * 0.6; cz_ = oz + 0.008 + h - 0.0025 * j
            b = E.ball((cx_, oy - 0.001, cz_), 0.0019, petal, "orchidFlower"); b.scale = (1, 0.45, 1)
            E.ball((cx_, oy - 0.0019, cz_ - 0.0004), 0.0006, lip, "orchidLip")
    for i, (gx, gz) in enumerate(((-0.004, 0.0035), (0.004, 0.003), (0.0, 0.0045))):
        lf = E.ball((ox + gx, oy - 0.001, oz + 0.008 + gz), 0.0032, E.felt("orchidLeaf", lin((0.20, 0.50, 0.22))), "orchidLeaf"); lf.scale = (1, 0.35, 0.45)


def night_city(win_x):
    """Outside the window: navy sky, moon, HDB blocks with lit windows, Marina Bay Sands (three towers + the ship on top)."""
    E.box((0, 0.62, 0.25), (1.6, 0.004, 0.8), E.emission("nightSky", lin((0.10, 0.14, 0.30)), 1.0), "sky", bevel=0)
    E.ball((win_x - 0.032, 0.60, FLOOR + 0.150), 0.007, E.emission("moon", lin((1.0, 0.97, 0.85)), 6.0), "moon")
    E.box((0, 0.40, FLOOR - 0.004), (1.0, 0.36, 0.008), E.mat("ground", lin((0.20, 0.24, 0.22)), 0.9), "ground", bevel=0)
    warm = E.emission("winWarm", lin((1.0, 0.80, 0.50)), 4.0); cool = E.emission("winCool", lin((0.75, 0.88, 1.0)), 3.0)
    block = E.mat("hdb", lin((0.55, 0.52, 0.50)), 0.8)
    for k, (dx, h, y) in enumerate(((-0.075, 0.20, 0.36), (-0.025, 0.24, 0.40), (0.030, 0.19, 0.35), (0.080, 0.22, 0.42))):
        x = win_x + dx; w = 0.040
        E.box((x, y, FLOOR + h / 2), (w, 0.03, h), block, "hdbBlock", bevel=0.0008)
        for r in range(int(h / 0.012)):
            for c in range(4):
                if (r * 7 + c * 3 + k * 5) % 5 in (0, 2): continue
                E.box((x - w / 2 + 0.006 + c * 0.0093, y - 0.0152, FLOOR + 0.008 + r * 0.012), (0.005, 0.0008, 0.005), warm if (r + c + k) % 3 else cool, "hdbWin", bevel=0)
    # Marina Bay Sands, far away
    mx, my = win_x + 0.015, 0.56
    tower = E.mat("mbs", lin((0.70, 0.72, 0.76)), 0.4)
    for j in (-1, 0, 1):
        E.box((mx + j * 0.016, my, FLOOR + 0.06), (0.008, 0.008, 0.12), tower, "mbsTower", bevel=0)
        for r in range(9):
            E.box((mx + j * 0.016, my - 0.0042, FLOOR + 0.012 + r * 0.012), (0.006, 0.0006, 0.0012), cool, "mbsLights", bevel=0)
    E.box((mx + 0.004, my, FLOOR + 0.1215), (0.064, 0.010, 0.003), tower, "mbsShip", bevel=0.0005)
    E.box((mx + 0.004, my - 0.0052, FLOOR + 0.1215), (0.060, 0.0006, 0.0008), warm, "mbsShipLights", bevel=0)


def ceiling_fan(x, y, z):
    """Slowly turning ceiling fan: a rod from above, a hub, four blades (keyed every second frame)."""
    white = E.mat("fanWhite", lin((0.95, 0.95, 0.93)), 0.4); woodm = E.mat("fanBlade", lin((0.75, 0.58, 0.40)), 0.5)
    E.cyl((x, y, z + 0.05), 0.0012, 0.10, white, verts=10, name="fanRod")
    hub = E.empty("fanHub", (x, y, z)); hub.rotation_mode = "XYZ"
    parts = [E.cyl((0, 0, 0), 0.0055, 0.004, white, verts=24, name="fanBody")]
    for k in range(4):
        a = k * math.pi / 2
        parts.append(E.box((0.016 * math.cos(a), 0.016 * math.sin(a), -0.0008), (0.022, 0.006, 0.0008), woodm, "fanBlade", bevel=0.0003, rot=(0.12, 0, a)))
    for o in parts: o.parent = hub
    for fr in E.frames():
        hub.rotation_euler = (0, 0, fr / E.FPS * 2 * math.pi * 0.35); hub.keyframe_insert("rotation_euler", frame=fr)
    E.constant(hub)


# ---------- the bathroom corner (SG2; made in code) ----------
def tiles_mat():
    if "tiles" in E._M: return E._M["tiles"]
    m = bpy.data.materials.new("tiles"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.25
    geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0]); nt.links.new(sep.outputs["X"], comb.inputs["X"]); nt.links.new(sep.outputs["Z"], comb.inputs["Y"])
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 160.0; br.inputs["Mortar Size"].default_value = 0.025
    br.inputs["Brick Width"].default_value = 0.5; br.inputs["Row Height"].default_value = 0.5
    br.offset = 0.0
    br.inputs["Color1"].default_value = (*lin((0.70, 0.88, 0.80)), 1); br.inputs["Color2"].default_value = (*lin((0.97, 0.98, 0.97)), 1)
    br.inputs["Mortar"].default_value = (*lin((0.85, 0.86, 0.84)), 1)
    nt.links.new(comb.outputs[0], br.inputs["Vector"]); nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    E._M["tiles"] = m; return m


def bathroom(sx, wall_y):
    E.box((0, 0.1, -0.02), (2.6, 1.5, 0.04), E.wood(), "desk")
    E.box((0, 0.85, 0.5), (3.2, 0.02, 1.4), E.mat("wall", (0.03, 0.03, 0.06), 0.9), "nightwall")
    E.board((sx, wall_y - 0.15), (0.60, 0.32), E.felt("bathFloor", lin((0.92, 0.93, 0.92))), "floor", thick=FLOOR)
    grout = E.mat("floorGrout", lin((0.70, 0.72, 0.72)), 0.9)
    for i in range(1, 60):
        E.box((sx - 0.30 + i * 0.01, wall_y - 0.15, FLOOR + 0.0002), (0.0005, 0.32, 0.0003), grout, "grout", bevel=0)
    for j in range(1, 32):
        E.box((sx, wall_y - 0.31 + j * 0.01, FLOOR + 0.0002), (0.60, 0.0005, 0.0003), grout, "grout", bevel=0)
    E.box((sx, wall_y + 0.006, FLOOR + 0.09), (0.60, 0.012, 0.18), tiles_mat(), "bathWall", bevel=0)
    E.box((sx - 0.30, wall_y - 0.15, FLOOR + 0.09), (0.012, 0.32, 0.18), tiles_mat(), "bathSide", bevel=0)
    E.box((sx + 0.30, wall_y - 0.15, FLOOR + 0.09), (0.012, 0.32, 0.18), tiles_mat(), "bathSideR", bevel=0)
    # a towel rail with a pink towel on the wall at her left (no mirror: it would show the back of her head)
    chrome = E.mat("chrome", lin((0.80, 0.82, 0.85)), 0.15)
    E.cyl((sx + 0.050, wall_y - 0.004, FLOOR + 0.085), 0.0008, 0.030, chrome, rot=(0, math.radians(90), 0), verts=10, name="towelRail")
    E.box((sx + 0.050, wall_y - 0.005, FLOOR + 0.072), (0.022, 0.0016, 0.026), E.felt("bathTowel", lin((0.95, 0.70, 0.78))), "bathTowel", bevel=0.0006)


def sink(cx, back_y, top_z, w, d, basin_dx):
    """White pedestal sink: slab (top at top_z, her side = back_y), oval basin hint, drain, tap at her side, pedestal."""
    china = E.mat("sinkChina", lin((0.97, 0.97, 0.96)), 0.2); inner = E.mat("sinkBowl", lin((0.88, 0.90, 0.92)), 0.15)
    chrome = E.mat("chrome", lin((0.80, 0.82, 0.85)), 0.15)
    t = 0.004; cy = back_y - d / 2
    slab = E.box((cx, cy, top_z - t / 2), (w, d, t), china, "sinkSlab", bevel=0.0012)
    bx = cx + basin_dx
    bowl = E.cyl((bx, cy - 0.001, top_z + 0.00003), 0.008, 0.00006, inner, verts=40, name="sinkBowl"); bowl.scale = (1.0, 0.72, 1)
    E.cyl((bx, cy - 0.001, top_z + 0.00008), 0.0011, 0.00006, E.mat("drain", lin((0.35, 0.36, 0.38)), 0.3), verts=16, name="drain")
    E.cyl((bx, back_y - 0.0035, top_z + 0.0025), 0.0008, 0.005, chrome, verts=12, name="tapPost")
    E.box((bx, back_y - 0.0055, top_z + 0.0048), (0.0012, 0.0045, 0.0010), chrome, "tapSpout", bevel=0.0003)
    E.cyl((bx + 0.0024, back_y - 0.0030, top_z + 0.0012), 0.0007, 0.0024, chrome, verts=10, name="tapKnob")
    ped = E.cyl((bx, cy + 0.001, (FLOOR + top_z - t) / 2), 0.0032, top_z - t - FLOOR, china, verts=24, name="sinkPedestal")
    E.obstacle(slab); E.obstacle(ped)
    return slab


# ---------- props made in code ----------
def make_brush(L):
    """Toothbrush: empty at the very end of the head (tip); local +z runs tip -> tail; bristles on the local +x side."""
    emp = E.empty("toothbrush"); emp.rotation_mode = "XYZ"
    body = E.mat("brushBody", lin((0.30, 0.62, 0.95)), 0.35); white = E.mat("brushWhite", lin((0.97, 0.97, 0.97)), 0.4)
    bristle = E.felt("bristles", lin((0.65, 0.88, 1.0)))
    hl = 0.0022
    parts = [E.box((0, 0, hl / 2), (0.0006, 0.0009, hl), white, "brushHead", bevel=0.0002),
             E.box((0.00055, 0, hl / 2 + 0.0001), (0.0006, 0.0008, hl - 0.0004), bristle, "brushBristles", bevel=0.0001),
             E.cyl((0, 0, hl + 0.0015), BR_R * 0.7, 0.003, white, verts=10, name="brushNeck"),
             E.cyl((0, 0, (hl + 0.003 + L) / 2), BR_R, L - hl - 0.003, body, verts=12, name="brushHandle")]
    for o in parts: o.parent = emp
    return emp


def make_book():
    """Story book. Root empty = spine bottom; spine along local +z (BOOK_H); the back block (back cover + pages) reaches from the
    spine towards local -x (BOOK_W), thickness y in [-BOOK_T, 0]; the hinged front part ("bookCover", y in [0, FRONT_T]) turns about
    local z: 0 = closed on the block, OPEN = swung over to +x. Moon and stars on both covers (no words)."""
    root = E.empty("book"); root.rotation_mode = "XYZ"
    cover = E.felt("bookCover", lin((0.20, 0.25, 0.62))); paper = E.mat("bookPaper", lin((0.98, 0.96, 0.90)), 0.85)
    gold = E.felt("bookMoon", lin((0.98, 0.82, 0.30))); spine = E.felt("bookSpine", lin((0.85, 0.35, 0.40)))
    W, Hb, Tb = BOOK_W, BOOK_H, BOOK_T
    parts = [E.box((-W / 2, -Tb + COVER_T / 2, Hb / 2), (W, COVER_T, Hb), cover, "backCover", bevel=0),
             E.box((-W / 2 + 0.0001, -Tb / 2 + COVER_T / 2, Hb / 2), (W - 0.0003, Tb - COVER_T, Hb - 0.0004), paper, "pageBlock", bevel=0),
             E.box((0.00008, (FRONT_T - Tb) / 2, Hb / 2), (0.00016, Tb + FRONT_T, Hb), spine, "bookSpine", bevel=0)]
    m1 = E.cyl((-W * 0.55, -Tb - 0.00003, Hb * 0.62), 0.0012, 0.00006, gold, rot=(math.radians(90), 0, 0), verts=24, name="moonBack")
    parts.append(m1)
    for (u, v) in ((0.25, 0.80), (0.78, 0.35), (0.35, 0.25)):
        parts.append(E.ball((-W * u, -Tb - 0.00004, Hb * v), 0.00028, gold, "starBack"))
    for o in parts: o.parent = root
    hinge = E.empty("bookHinge"); hinge.rotation_mode = "XYZ"; hinge.parent = root
    fparts = [E.box((-W / 2, FRONT_T - COVER_T / 2, Hb / 2), (W, COVER_T, Hb), cover, "frontCover", bevel=0),
              E.box((-W / 2 + 0.0001, (FRONT_T - COVER_T) / 2, Hb / 2), (W - 0.0003, FRONT_T - COVER_T, Hb - 0.0004), paper, "frontPages", bevel=0),
              E.cyl((-W * 0.45, FRONT_T + 0.00003, Hb * 0.62), 0.0012, 0.00006, gold, rot=(math.radians(90), 0, 0), verts=24, name="moonFront")]
    for (u, v) in ((0.75, 0.80), (0.22, 0.35), (0.62, 0.25)):
        fparts.append(E.ball((-W * u, FRONT_T + 0.00004, Hb * v), 0.00028, gold, "starFront"))
    # two picture blocks on the open pages (a little bed and a moon, no words)
    fparts.append(E.box((-W * 0.5, -0.00002, Hb * 0.55), (W * 0.6, 0.00002, Hb * 0.35), E.felt("pagePic", lin((0.55, 0.70, 0.95))), "pagePicL", bevel=0))
    parts2 = [E.box((-W * 0.5, 0.00002, Hb * 0.55), (W * 0.6, 0.00002, Hb * 0.35), E.felt("pagePic2", lin((0.95, 0.80, 0.45))), "pagePicR", bevel=0)]
    for o in fparts: o.parent = hinge
    for o in parts2: o.parent = root
    return root, hinge


# 11/21 second check: holding the low corners put the wrists 4-5 mm under the book (95-98 % reach) -> hold the outer edges
# a little below their middle (the hands still below the chin, the thumbs on the pages)
GR_LOC = Vector((-BOOK_W + 0.0003, (FRONT_T - BOOK_T) / 2, 0.42 * BOOK_H))     # right hand: fore-edge, middle of the closed book
GL_LOC = Vector((-BOOK_W + 0.0003, FRONT_T / 2, 0.42 * BOOK_H))                # left hand: front cover's outer edge (hinge frame)


def Rz(a):
    return Matrix.Rotation(a, 4, "Z")


# ================= build =================
ch = E.Char("singapore_girl_pyjamas", (0.30, -0.15), 0, height=PUPIL)
M_ = metrics(ch)
SEAT_UNDER = seat_under(ch, M_["thigh"]) - 0.0010          # thighs ON the mattress, 1 mm into it (UK 11/20 rule)
SEAT_HIP = SEAT_UNDER - M_["upleg_dz"]
SEAT_Z = FLOOR + M_["knee_h"] - SEAT_UNDER                  # mattress top: knee height - thigh thickness (feet flat on the floor)
HEAD0 = Vector((0, 0, -2))

if SHOT == "SG2":
    # ================= bathroom: brushing teeth =================
    SX, SY = 0.0, 0.10
    WALL2 = SY + 0.030
    bathroom(SX, WALL2)
    P = Body(ch, M_, (SX, SY), None, (0, 0, 0))
    P.learn_hands(HEAD0)
    P.body(0, P_LAP, HEAD0)
    mouth0 = mouth(ch); corner0 = mouth_corner(ch)
    SHR, SHL = wpt(ch, "RightArm"), wpt(ch, "LeftArm")
    hips = wpt(ch, "Hips")
    CTR_Z = hips.z + env("CTR_K", "0.30") * M_["sh_hips"]       # sink top at her waist
    CTR_BACK = SY - M_["front"] - env("CTR_GAP", "0.0015")       # sink edge on her side, just in front of her tummy
    SINK_W, SINK_D = 0.040, 0.022
    slab = sink(SX + 0.004, CTR_BACK, CTR_Z, SINK_W, SINK_D, 0.009)
    # head outline seen from the FRONT camera (cheek + bob hair) between the mouth and the chin: the hand has to stay outside it.
    # 11/21 first check: a single ray just behind the lips hit the face 2.2 mm from the corner, the brush came out 10 mm long and
    # the hand sat in front of the jaw. Now: the outermost hit over several depths and heights.
    hd_ = wpt(ch, "Head"); xs_ = []
    for dy in (-0.010, -0.007, -0.004, -0.001, 0.002, 0.005):
        for dz in (0.0, -0.0015, -0.003, -0.0045):
            p_ = mesh_hit(ch.meshes, Vector((hd_.x - 0.06, hd_.y + dy, corner0.z + dz)), Vector((1, 0, 0)))
            if p_ is not None and p_.x < hd_.x: xs_.append(p_.x)
    cheek_x = min(xs_) if xs_ else corner0.x - 0.013
    d_in = Vector((math.cos(BRUSH_RISE) * math.cos(BRUSH_YAW), math.cos(BRUSH_RISE) * math.sin(BRUSH_YAW), math.sin(BRUSH_RISE)))
    S_GRIP = (corner0.x - cheek_x + HAND_CLEAR + 0.0016) / d_in.x + 0.0012     # 1.6 mm = half the hand's width
    BRUSH_L = max(0.010, min(0.024, S_GRIP + 0.0022))
    S_GRIP = BRUSH_L - 0.0022
    print("DESK BRUSH corner %s head outline x %.4f (%.4f outside the corner, %d hits) -> grip %.4f from the tip, brush length %.4f %s" % (
        tuple(round(v, 4) for v in corner0), cheek_x, corner0.x - cheek_x, len(xs_), S_GRIP, BRUSH_L,
        "" if BRUSH_L < 0.0239 else "WARN brush at its longest: hand may still overlap the hair"), flush=True)
    brush = make_brush(BRUSH_L)
    XB = Vector((-math.sin(BRUSH_YAW), math.cos(BRUSH_YAW), 0))           # bristles towards her teeth (backwards)

    def brush_M(depth, corner):
        tip = corner + d_in * depth
        return frame_M(tip, -d_in, XB)

    # --- TOOTHBRUSH, right hand: palm down and a little towards her, fingers towards the camera curled under the handle,
    #     thumb flat ON the handle pointing to the head; handle across the palm (little finger -> index = towards the head) ---
    Mh = P.calibrate("Right", hand_q(ch, "Right", Vector((0.0, -1.0, -0.15)), Vector((0.0, 0.25, -1.0))), G_BRUSH, HEAD0)
    _w, _f, _a, _p = hand_frame(ch, "Right")
    fwd_w, acr_w, palm_w = world_vec(ch, _f), world_vec(ch, _a), world_vec(ch, _p)
    gc = (wpt(ch, "RightHandIndex1") + wpt(ch, "RightHandPinky1")) / 2 + palm_w * 0.0015 + fwd_w * 0.0004    # inside the curled fingers
    C_BR = Mh.inverted() @ frame_M(gc + acr_w * S_GRIP, -acr_w, -fwd_w)
    th = wpt(ch, "RightHandThumb3", True)
    print("DESK GRIP brush palm %s thumb_above_handle %+.4f thumb_towards_head %+.4f (both should be > 0)" % (
        tuple(round(v, 2) for v in palm_w), (th - gc).z, (th - gc).dot(acr_w)), flush=True)
    P.body(0, P_LAP, HEAD0)
    # the brush lies on its side on the sink, right of her (her right = -x), head towards her middle, bristles towards her
    G_REST = Vector((SHR.x - 0.0030, CTR_BACK - 0.0035, CTR_Z + BR_R))
    B_LIE = frame_M(G_REST + Vector((S_GRIP, 0, 0)), Vector((-1, 0, 0)), Vector((0, 1, 0)))
    if G_REST.x - 0.0022 < SX + 0.004 - SINK_W / 2 + 0.001: print("DESK WARN toothbrush tail over the sink edge", flush=True)
    set_M(brush, B_LIE, 0)
    L_SINK = P.rest("Left", (SHL.x + 0.0020, CTR_BACK - 0.0025, CTR_Z), (-0.25, -1, 0))
    GRAB, REL = 0.60, 3.55
    B_UP = Tr(0, 0, 0.004) @ B_LIE

    def depth(t):
        if t < 1.25: return -0.0015
        if t < 1.40: return -0.0015 + (0.0012 + 0.0015) * E.ease((t - 1.25) / 0.15)
        if t < 2.80: return min(DEPTH_MAX, 0.0012 + 0.0005 * math.cos(2 * math.pi * (t - 1.40) / (1.40 / 3)))   # three strokes, 0.7..1.7 mm in, never past 1.8
        if t < 3.05: return 0.0012 + (-0.0015 - 0.0012) * E.ease((t - 2.80) / 0.25)
        return -0.0015

    def brush_target(t):
        if t <= GRAB + 0.1: return B_LIE              # 11/21: hold still a moment after the touch (the grab frame is a real contact)
        if t < 0.90: return blend_M(B_LIE, B_UP, (t - GRAB - 0.1) / 0.2)
        if t < 1.25: return blend_M(B_UP, brush_M(-0.0015, mouth_corner(ch)), (t - 0.90) / 0.35)
        if t < 3.05: return brush_M(depth(t), mouth_corner(ch))
        if t < 3.35: return blend_M(brush_M(-0.0015, mouth_corner(ch)), B_UP, (t - 3.05) / 0.30)
        return blend_M(B_UP, B_LIE, (t - 3.35) / 0.20)

    POLE_B = Vector((-1.0, 0.25, -0.25))          # elbow out to her right, at chest height
    R_PRE = P.from_prop("Right", Tr(0, 0, 0.0012) @ B_LIE, C_BR, G_BRUSH_OPEN)
    R_OFF = P.from_prop("Right", Tr(-0.0006, 0, 0.0016) @ B_LIE, C_BR, G_RELAX)
    REST_R = P.from_prop("Right", Tr(-0.0035, 0.002, 0.0020) @ B_LIE, C_BR, G_RELAX)

    def right(t):
        if t < 0.10: return REST_R
        if t < 0.45: return tblend(REST_R, R_PRE, (t - 0.10) / 0.35)
        if t < GRAB: return tblend(R_PRE, P.from_prop("Right", B_LIE, C_BR, G_BRUSH), (t - 0.45) / (GRAB - 0.45))
        if t <= REL:
            w = min(1.0, max(0.0, (t - 0.6) / 0.4)) if t < 3.05 else max(0.0, 1 - (t - 3.05) / 0.3)
            return P.from_prop("Right", brush_target(t), C_BR, G_BRUSH, P.pole["Right"].lerp(POLE_B, E.ease(w)))
        if t < REL + 0.2: return tblend(P.from_prop("Right", B_LIE, C_BR, G_BRUSH), R_OFF, (t - REL) / 0.2)
        return tblend(R_OFF, REST_R, (t - REL - 0.2) / 0.25)

    def head(t):
        if 0.15 < t < 0.85: return (0, -6, -9)            # looks down at the brush on the sink
        return (0, 0, -1)                                 # face to the camera all the time while brushing
    grabbed, last = False, None
    for fr in E.frames():
        t = fr / E.FPS
        P.solve(t, fr, head(t), right(t), L_SINK)
        if GRAB <= t <= REL:
            Mb = hand_M(ch, "Right") @ C_BR; last = Mb
            if not grabbed:
                grabbed = True; e_ = (Mb.translation - B_LIE.translation).length
                print("CONTACT SG2 grab t=%.2f brush_jump %.4f %s" % (t, e_, "" if e_ < 0.0006 else "WARN hand did not reach the brush"), flush=True)
        else:
            if t > REL and last is not None and fr - E.f(REL) < 3:
                print("CONTACT SG2 release t=%.2f brush_above_sink %.4f off_place %.4f" % (
                    t, last.translation.z - B_LIE.translation.z, (last.translation - B_LIE.translation).length), flush=True)
            Mb = B_LIE
        set_M(brush, Mb, fr)
        if fr % 4 == 0:
            cn = mouth_corner(ch); tip = Mb.translation; dn = (tip - cn).dot(d_in)
            hx = max(wpt(ch, b).x for b in ("RightHand", "RightHandIndex1", "RightHandMiddle1", "RightHandPinky1"))     # inner edge of the hand
            hz = wpt(ch, "RightHand").z
            clear = None
            for s in (0.002, 0.004, 0.006, 0.008):          # handle points outside the mouth: distance back to the face (+y)
                pnt = Mb @ Vector((0, 0, s))
                hit = mesh_hit(ch.meshes, pnt + Vector((0, -0.0001, 0)), Vector((0, 1, 0)))
                if hit is not None: clear = (hit - pnt).y if clear is None else min(clear, (hit - pnt).y)
            print("CONTACT SG2 t=%.2f tip_into_corner %.4f tip_to_corner %.4f hand_outside_cheek %.4f hand_below_corner %.4f handle_to_face %s brush_off_target %.4f" % (
                t, dn, (tip - cn).length, cheek_x - hx, cn.z - hz, ("%.4f" % clear) if clear is not None else "none",
                (tip - brush_target(t).translation).length if GRAB <= t <= REL else 0.0), flush=True)
            # 11/21: only meaningful at the mouth (while the brush lies on the sink the tip is far right of the corner and the
            # projection on the in-direction was read as "deeper than 2 mm")
            if (tip - cn).length < 0.004 and dn > 0.0020: print("CONTACT SG2 WARN brush head deeper than 2 mm t=%.2f in %.4f" % (t, dn), flush=True)
    ch.finish(); E.constant(brush)
    # light: white bathroom light from the front-top, soft fill
    L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.35"))
    bpy.ops.object.light_add(type="AREA", location=(SX, SY - 0.20, 0.30)); top = bpy.context.object
    top.data.energy = env("BATH", "3.0"); top.data.color = (0.95, 0.98, 1.0); top.data.size = 0.35; top.rotation_euler = (math.radians(30), 0, 0)

    # ---------- cameras ----------
    HANDCAM = {   # aim, offset, lens (her right hand is on the -x side); DOF off
        "HG": (G_REST + Vector((0, 0, 0.001)), Vector((-0.07, -0.12, 0.05)), 190),
        "HG2": (G_REST + Vector((0, 0, 0.001)), Vector((-0.14, -0.01, 0.03)), 190),
        "HF": (corner0 + Vector((-0.006, 0, -0.002)), Vector((-0.012, -0.16, 0.010)), 150),     # nearly straight front: the whole face must show
        "HS": (corner0 + Vector((-0.006, 0, -0.002)), Vector((-0.16, -0.02, 0.006)), 150)}      # her right side: head goes in from the side
    if CAMSUB in HANDCAM:
        aim, off, lens = HANDCAM[CAMSUB]
        cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
        for cd in bpy.data.cameras: cd.dof.use_dof = False
    else:            # front, a little from her right: whole girl (feet beside the pedestal), the sink, the brush, the tiles
        aim = Vector((SX - 0.002, SY - 0.006, (FLOOR + mouth0.z) / 2 + 0.006))
        cam_move(55, aim + Vector((-0.035, -0.30, 0.050)), aim, aim + Vector((-0.032, -0.28, 0.046)), aim, focus=(SX, SY - 0.004, mouth0.z - 0.01))
        view_report("SG2", [("mouth", mouth0), ("brush_rest", G_REST), ("left_shoe", lambda: wpt(ch, "LeftFoot")), ("right_shoe", lambda: wpt(ch, "RightFoot"))])
    print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)

else:
    # ================= bedroom =================
    BI = probe_bed(2 * HIP_HALF, M_["thigh"] + 0.003)
    k_b = BI["k"]; tbx, bb = BI["tbox"], BI["bbox"]
    # she sits ON the -x end of the bed top (the folded blanket), her right hip side 0.8 mm inside the end
    BED_CX = HX - k_b * tbx[0] - HIP_HALF - 0.0008
    BED_CY = (WALL_Y - 0.006 - 0.0008) - k_b * bb[3]
    bed_root = E.place(f"{PROPS}/singapore_bed.glb", BED_L, (BED_CX, BED_CY, FLOOR), rot_z=BI["rot"], axis="long")
    KD_BED = (SEAT_Z - FLOOR) / max(1e-5, k_b * BI["seat_z"])        # the seat surface (not the mattress) at knee - thigh
    bed_root.scale = (bed_root.scale[0], bed_root.scale[1], bed_root.scale[2] * KD_BED)
    bpy.context.view_layer.update()
    BED_FRONT = BED_CY + k_b * tbx[2]; BED_END = BED_CX + k_b * bb[0]
    E.obstacle(bed_root)
    HY = BED_FRONT + M_["thigh"] - 0.0025                       # bed edge 2.5 mm behind her knees
    print("DESK BED placed centre (%.4f, %.4f) turn %d squash x%.3f -> seat (bed top at the -x end) %.4f above floor, mattress %.4f "
          "(knee %.4f, thigh under hips %.4f) front %.4f, bed -x end %.4f, top x %.4f..%.4f y %.4f..%.4f %s" % (
              BED_CX, BED_CY, round(math.degrees(BI["rot"])), KD_BED, SEAT_Z - FLOOR, k_b * BI["mz"] * KD_BED, M_["knee_h"], SEAT_UNDER,
              BED_FRONT, BED_END, BED_CX + k_b * tbx[0], BED_CX + k_b * tbx[1], BED_CY + k_b * tbx[2], BED_CY + k_b * tbx[3],
              "" if 0.35 < KD_BED < 1.6 else "WARN bed squashed a lot (check how it looks)"), flush=True)
    if (BED_CY + k_b * tbx[3]) - BED_FRONT < M_["thigh"] + 0.004: print("DESK WARN bed shallower than her thighs", flush=True)

    # --- bedside cabinet + lamp on her RIGHT (-x), top at her waist, as close as the bed end allows ---
    CI = probe_cab()
    CAB_TOP = SEAT_Z + SEAT_HIP + CAB_DZ
    k_z = (CAB_TOP - FLOOR) / CI["cab_z"]
    long_p = max(CI["bbox"][1] - CI["bbox"][0], CI["bbox"][3] - CI["bbox"][2])
    k_xy = min(max(k_z, CAB_MIN / long_p), CAB_MAX / long_p)
    CAB_EDGE = min(BED_END - 0.0006, HX - HIP_HALF - CAB_GAP)
    CAB_CX = CAB_EDGE - k_xy * CI["bbox"][1]
    # the book's grip corner (its back-right corner) sits beside her right thigh, in front of the hip, where her hand has room;
    # the book lies along the cabinet's +x edge strip, the lamp (model) stays in the middle of the top, a little in front of her
    Y_GRIP = HY - env("BOOK_DY", "0.55") * M_["thigh"]
    OY = Y_GRIP - BOOK_W
    CAB_CY = HY + LAMP_DY - k_xy * CI["lamp"][1]
    cab_root = E.place(f"{PROPS}/singapore_bedside.glb", k_xy * long_p, (CAB_CX, CAB_CY, FLOOR), axis="long")
    cab_root.scale = (cab_root.scale[0], cab_root.scale[1], cab_root.scale[2] * k_z / k_xy)
    bpy.context.view_layer.update()
    E.obstacle(cab_root)
    LAMP_C = Vector((CAB_CX + k_xy * CI["lamp"][0], CAB_CY + k_xy * CI["lamp"][1], FLOOR + k_z * CI["base_z"]))
    BASE_R = k_xy * CI["base_r"]; SHADE_R = k_xy * CI["shade_r"]
    SHADE_LO = FLOOR + k_z * CI["shade_lo"]; LAMP_TOP = FLOOR + k_z * CI["lamp_top"]
    CAB_FRONT = CAB_CY + k_xy * CI["bbox"][2]
    print("DESK CAB placed centre (%.4f, %.4f) footprint x%.4f height x%.4f (%s) top %.4f (her hips %.4f) +x edge %.4f (her hip side %.4f, gap %.4f) "
          "lamp base (%.4f, %.4f, %.4f) r %.4f shade_r %.4f shade bottom %.4f lamp top %.4f" % (
              CAB_CX, CAB_CY, k_xy, k_z, ("lower+wider" if k_xy > k_z * 1.001 else ("taller+narrower" if k_xy < k_z * 0.999 else "uniform")), CAB_TOP, SEAT_Z + SEAT_HIP, CAB_EDGE,
              HX - HIP_HALF, HX - HIP_HALF - CAB_EDGE, LAMP_C.x, LAMP_C.y, LAMP_C.z, BASE_R, SHADE_R, SHADE_LO, LAMP_TOP), flush=True)
    if HX - HIP_HALF - CAB_EDGE > 0.006: print("DESK WARN cabinet far from her hip (bed end in the way): book / button may be out of reach", flush=True)

    # lamp button on the base rim, on the side towards her and the camera; the shade glows (emission keyed) + a light inside it
    bdir = Vector((0.9, -0.45, 0)).normalized()          # on the rim towards her (and a little to the camera): shortest reach
    BTN = LAMP_C + bdir * max(0.0006, BASE_R * 0.70) + Vector((0, 0, 0.00025))
    btn = E.cyl(tuple(BTN), 0.00055, 0.0005, E.mat("lampButton", lin((0.95, 0.40, 0.45)), 0.4), verts=16, name="lampButton")
    print("DESK LAMP button %s shade bottom above it %.4f %s" % (tuple(round(v, 4) for v in BTN), SHADE_LO - BTN.z,
          "" if SHADE_LO - BTN.z > 0.0022 else "WARN little room under the shade for the fingertip"), flush=True)
    # 11/21: a pure emission shader went BLACK when switched off -> cream fabric (Principled) whose emission strength is keyed
    glow = bpy.data.materials.new("lampGlow"); glow.use_nodes = True
    gnt = glow.node_tree; gb = gnt.nodes["Principled BSDF"]
    gb.inputs["Base Color"].default_value = (*lin((0.97, 0.92, 0.80)), 1); gb.inputs["Roughness"].default_value = 0.8
    gb.inputs["Emission Color" if "Emission Color" in gb.inputs else "Emission"].default_value = (*lin((1.0, 0.86, 0.55)), 1)
    GLOW_IN = gb.inputs["Emission Strength"]; GLOW_IN.default_value = 3.0
    import bmesh
    bpy.context.view_layer.update()
    n_glow = 0; z_glow = SHADE_LO + 0.25 * (LAMP_TOP - SHADE_LO)
    for o in [o for o in [cab_root] + list(cab_root.children_recursive) if o.type == "MESH"]:
        Mw = o.matrix_world
        o.data.materials.append(glow); mi = len(o.data.materials) - 1
        bm = bmesh.new(); bm.from_mesh(o.data)
        for f in bm.faces:
            c = Mw @ f.calc_center_median()
            if c.z > z_glow and math.hypot(c.x - LAMP_C.x, c.y - LAMP_C.y) < SHADE_R * 1.15: f.material_index = mi; n_glow += 1
        bm.to_mesh(o.data); bm.free(); o.data.update()
    print("DESK LAMP %d shade faces glow (z > %.4f)" % (n_glow, z_glow), flush=True)
    bpy.ops.object.light_add(type="POINT", location=(LAMP_C.x, LAMP_C.y, (SHADE_LO + LAMP_TOP) / 2)); lampL = bpy.context.object
    lampL.data.energy = LAMP_W; lampL.data.color = (1.0, 0.78, 0.45); lampL.data.shadow_soft_size = 0.002

    # the closed book lies on the cabinet: bottom edge towards her (+x) over the edge, spine at the front, fore-edge behind, cover up
    # Grip corner = the back-right corner (beside her thigh); the book lies along the cabinet's +x edge strip.
    # 11/21 second check: the book hung over the cabinet's front edge (SG4HF 36): keep it fully on the top surface
    top_front = CAB_CY + k_xy * CI["cab_box"][2]; top_back = CAB_CY + k_xy * CI["cab_box"][3]
    oy = min(max(OY, top_front + 0.0008), top_back - 0.0008 - BOOK_W, HY - 0.0025 - BOOK_W)
    print("DESK BOOK spot: top surface y %.4f..%.4f, book y %.4f..%.4f %s" % (top_front, top_back, oy, oy + BOOK_W,
          "" if oy >= top_front + 0.0005 else "WARN book still over the front edge"), flush=True)
    bx0, bx1 = CAB_EDGE + OVERHANG - BOOK_H, CAB_EDGE + OVERHANG
    hit_lamp = LAMP_C.x + BASE_R > bx0 and LAMP_C.x - BASE_R < bx1 and LAMP_C.y + BASE_R > oy and LAMP_C.y - BASE_R < oy + BOOK_W
    if hit_lamp: print("DESK WARN book and lamp base overlap on the cabinet top (raise CAB_MIN or move the book: BOOK_DY)", flush=True)
    if oy < CAB_FRONT - 0.0012: print("DESK WARN book hangs over the cabinet front by %.4f" % (CAB_FRONT - oy), flush=True)
    B_LIE = frame_M(Vector((bx1, oy, CAB_TOP + BOOK_T)), Vector((-1, 0, 0)), Vector((0, -1, 0)))
    book, hinge = make_book()
    print("DESK BOOK on the cabinet: x %.4f..%.4f (overhang %.4f, her hip side %.4f) y %.4f..%.4f top %.4f grip corner y %.4f (hips y %.4f)" % (
        bx0, bx1, OVERHANG, HX - HIP_HALF, oy, oy + BOOK_W, CAB_TOP, oy + BOOK_W, HY), flush=True)

    WIN_X = HX + WIN_DX
    CLOCK = (HX + 0.088, 0.238, FLOOR + CLOCK_Z)
    bedroom(WIN_X); night_city(WIN_X); clock(CLOCK[0], CLOCK[1], CLOCK[2], 9, 45)
    ceiling_fan(HX + 0.020, HY - 0.035, FLOOR + 0.205)
    rug = E.box((HX + 0.018, BED_FRONT - 0.030, FLOOR + 0.0004), (0.075, 0.040, 0.0008), E.felt("rug", lin((0.55, 0.62, 0.85))), "rug", bevel=0)
    # slippers stay on her feet (model); lights: warm lamp, soft cool room light, moonlight from the window
    L_, Fl, R_ = E.lights(lamp=env("LAMP", "0.30"))
    bpy.ops.object.light_add(type="AREA", location=(HX, -0.25, 0.40)); frontl = bpy.context.object
    frontl.data.energy = env("FRONT", "1.6"); frontl.data.color = (1, 0.90, 0.78); frontl.data.size = 0.5; frontl.rotation_euler = (math.radians(25), 0, 0)
    bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.32, 0.20)); moonl = bpy.context.object
    moonl.data.energy = env("MOON", "0.8"); moonl.data.color = (0.55, 0.68, 1.0); moonl.data.size = 0.3; moonl.rotation_euler = (math.radians(-60), 0, 0)
    bpy.ops.object.light_add(type="AREA", location=(WIN_X, 0.48, 0.22)); cityl = bpy.context.object      # lights the blocks outside
    cityl.data.energy = 1.5; cityl.data.color = (0.6, 0.7, 1.0); cityl.data.size = 0.4; cityl.rotation_euler = (math.radians(70), 0, 0)

    T_OFF = []

    def lamp_switch(t_off):
        """Lamp (and the warm room light) out at t_off; the moonlight and a cool front fill come up so her face stays lit.
        (11/21: the change was hard to see -> warm lights lower, moonlight stronger; the camera face fill is dimmed later.)"""
        T_OFF.append(t_off)
        lights = [(lampL.data, LAMP_W, 0.0), (L_.data, L_.data.energy, L_.data.energy * 0.10), (frontl.data, frontl.data.energy, frontl.data.energy * 0.25),
                  (moonl.data, moonl.data.energy, moonl.data.energy * 5.0)]
        for d, a, b in lights:
            d.energy = a; d.keyframe_insert("energy", frame=0)
            d.energy = a; d.keyframe_insert("energy", frame=max(0, E.f(t_off) - 1))
            d.energy = b; d.keyframe_insert("energy", frame=E.f(t_off))
            E.constant(d)
        frontl.data.color = (1, 0.90, 0.78); frontl.data.keyframe_insert("color", frame=max(0, E.f(t_off) - 1))
        frontl.data.color = (0.70, 0.80, 1.0); frontl.data.keyframe_insert("color", frame=E.f(t_off)); E.constant(frontl.data)
        GLOW_IN.default_value = 3.0; GLOW_IN.keyframe_insert("default_value", frame=0)
        GLOW_IN.keyframe_insert("default_value", frame=max(0, E.f(t_off) - 1))
        GLOW_IN.default_value = 0.0; GLOW_IN.keyframe_insert("default_value", frame=E.f(t_off))
        E.constant(gnt)

    def face_fill_switch():
        """After the cameras exist: the camera's warm face fill goes down and turns moon-blue when the lamp goes out."""
        if not T_OFF or T_OFF[0] > T: return
        f0 = E.f(T_OFF[0])
        for o in bpy.data.objects:
            if o.type == "LIGHT" and o.name.endswith("_faceFill"):
                d = o.data; e0 = d.energy
                d.energy = e0; d.keyframe_insert("energy", frame=0); d.keyframe_insert("energy", frame=max(0, f0 - 1))
                d.energy = e0 * 0.45; d.keyframe_insert("energy", frame=f0)
                d.color = (1, 0.85, 0.7); d.keyframe_insert("color", frame=max(0, f0 - 1))
                d.color = (0.65, 0.78, 1.0); d.keyframe_insert("color", frame=f0)
                E.constant(d)

    if SHOT == "SG1":
        # the traveller asks; the girl stands in front of her bed and points at the clock with her LEFT hand (clock on her left)
        set_M(book, B_LIE, 0)
        GIRL_AT = (HX + 0.014, BED_FRONT - 0.009)
        ch.at(0, loc=GIRL_AT)
        GL, GF = (HX - 0.058, BED_FRONT - 0.045), 35
        ask0, ask1, ans0, ans1 = VOICE["q"], VOICE["q"] + 1.6, VOICE["a"], VOICE["a"] + 2.7
        pt = Vector(local_dir(GIRL_AT, 0, CLOCK, FLOOR + PUPIL * 0.62)).normalized()
        if pt.x < 0: print("DESK WARN the clock is on her right: storyboard wants the LEFT hand", flush=True)
        pt.x = max(abs(pt.x), 0.55); pt.y = min(pt.y, 0.3); pt.z = max(pt.z, 0.5); pt.normalize()
        print("DESK SG1 clock %s girl %s point_dir %s hand Left" % (tuple(round(v, 4) for v in CLOCK), tuple(round(v, 4) for v in GIRL_AT), tuple(round(v, 3) for v in pt)), flush=True)
        for fr in E.frames():
            t = fr / E.FPS
            if t >= ans0 - 0.15:
                kk = int((t - ans0) * 2) % 2 if ans0 <= t < ans1 else 0
                arms, hd = E.P_point((pt.x, pt.y, pt.z + 0.06 * kk), right=False), (0, 6 if t < ans1 else 0, 6 if t < ans1 else 2)
            else:
                arms, hd = E.P_stand(), (0, -14, 0)            # listening: head turned to the traveller (on her right, -x)
            ch.pose(t, arms, twist={"Head": hd})
            if t >= ans0 - 0.15:
                curl(ch, "Left", G_POINT); key_hand(ch, "Left", fr)
        ch.finish()

        def trav(t):
            if ask0 <= t < ask1: return (E.P_open() if int((t - ask0) * 3) % 2 == 0 else E.P_chest(right=False)), (0, 14, 0)
            if t >= ans0 + 0.5: return E.P_stand(), (0, 12, 10)
            return E.P_stand(), (0, 14, 0)
        stand("traveler_girl", GL, GF, trav, height=GIRL)
        if CAMSUB == "C":
            aim = wpt(ch, "Head") + Vector((0, 0, -0.004))
            cam_move(115, aim + Vector((-0.03, -0.16, 0.01)), aim, aim + Vector((-0.03, -0.16, 0.01)), aim)
        else:
            aim0 = Vector((HX + 0.028, BED_FRONT - 0.015, FLOOR + 0.072))
            cam_move(40, aim0 + Vector((-0.020, -0.50, 0.070)), aim0, aim0 + Vector((-0.010, -0.44, 0.062)), aim0 + Vector((0, 0, 0.002)),
                     focus=(GIRL_AT[0], GIRL_AT[1], FLOOR + 0.05))
            view_report("SG1", [("clock", CLOCK), ("girl_head", lambda: wpt(ch, "Head")), ("window", (WIN_X, 0.24, FLOOR + 0.11)),
                                ("lamp", (LAMP_C.x, LAMP_C.y, LAMP_TOP)), ("mbs", (WIN_X + 0.015, 0.56, FLOOR + 0.12))])
        print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)

    else:
        # ---------- seated on the bed edge, facing the camera ----------
        P = Body(ch, M_, (HX, HY), SEAT_Z, LEAN)
        P.learn_hands(HEAD0)
        P.body(0, P_LAP, HEAD0)
        mouth0 = mouth(ch)
        SHR, SHL = wpt(ch, "RightArm"), wpt(ch, "LeftArm")
        hipsw = wpt(ch, "Hips")
        print("DESK SIT hips %s seat_z %.4f bed_front %.4f feet_gap %.4f shR %s mouth %s" % (
            tuple(round(v, 4) for v in hipsw), SEAT_Z, BED_FRONT, (wpt(ch, "RightFoot").z - FLOOR) - M_["ankle_h"],
            tuple(round(v, 4) for v in SHR), tuple(round(v, 4) for v in mouth0)), flush=True)
        print("DESK LEGS seat_z %.4f bed_front %.4f | hips %s upleg %s knee %s foot %s" % (SEAT_Z, BED_FRONT, tuple(round(v, 4) for v in hipsw),
              tuple(round(v, 4) for v in wpt(ch, "RightUpLeg")), tuple(round(v, 4) for v in wpt(ch, "RightLeg")), tuple(round(v, 4) for v in wpt(ch, "RightFoot"))), flush=True)
        LAP_Z = SEAT_Z + SEAT_HIP + M_["upleg_dz"] + 0.45 * SEAT_UNDER + 0.0010     # GUESS: top of the thigh
        L_LAP = P.rest("Left", (HX + 0.0030, HY - 0.45 * M_["thigh"], LAP_Z), (-0.2, -1, 0))       # 11/21: 0.6 -> 0.45 (rest at 92-95 % reach)
        R_LAP = P.rest("Right", (HX - 0.0030, HY - 0.45 * M_["thigh"], LAP_Z), (0.2, -1, 0))
        # --- reading pose of the book: spine at her middle, below the chin, a little tilted so the pages face up to her eyes ---
        chest_y = HY - M_["front"]
        chin_z = mouth0.z - CHIN_DZ
        ZR = Vector((0, -0.35, 1)).normalized()
        XR = Vector((math.cos(PSI), math.sin(PSI), 0))
        o_read = Vector((HX + 0.0004, chest_y - 0.34 * BOOK_W - READ_GAP, chin_z - 0.0012 - BOOK_H * ZR.z))
        B_READ = frame_M(o_read, ZR, XR)
        n_page = (rotM(B_READ) @ Vector((0, 1, 0, 0))).to_3d().normalized()
        print("DESK READ book spine bottom %s top %.4f chin %.4f fore-edge y %.4f chest front %.4f" % (
            tuple(round(v, 4) for v in o_read), o_read.z + BOOK_H * ZR.z, chin_z, o_read.y + 0.34 * BOOK_W, chest_y), flush=True)
        # --- BOOK CORNER, right hand (reading grip; the same grip picks it up and puts it back):
        #     palm towards her and up, fingers up behind the book (back cover), thumb round the fore-edge on the page side ---
        Mh = P.calibrate("Right", hand_q(ch, "Right", Vector((0.55, 0.10, 0.83)), Vector((0.10, 0.85, 0.50))), G_BOOK, HEAD0)
        ppR = (wpt(ch, "RightHandThumb3", True) + wpt(ch, "RightHandIndex2")) / 2
        Bcal = Matrix.Translation(ppR) @ rotM(B_READ) @ Matrix.Translation(-GR_LOC)
        C_BR = Mh.inverted() @ Bcal
        thR = wpt(ch, "RightHandThumb3", True); fiR = wpt(ch, "RightHandMiddle2")
        print("DESK GRIP book right: thumb on the page side %+.4f, fingers behind %+.4f (thumb > 0, fingers < 0)" % (
            (thR - ppR).dot(n_page), (fiR - ppR).dot(n_page)), flush=True)
        Mh = P.calibrate("Left", hand_q(ch, "Left", Vector((-0.55, 0.10, 0.83)), Vector((-0.10, 0.85, 0.50))), G_BOOK, HEAD0)
        ppL = (wpt(ch, "LeftHandThumb3", True) + wpt(ch, "LeftHandIndex2")) / 2
        Ccal = Matrix.Translation(ppL) @ (rotM(B_READ) @ Rz(OPEN)) @ Matrix.Translation(-GL_LOC)
        C_BL = Mh.inverted() @ Ccal
        n_cov = (rotM(B_READ) @ Rz(OPEN) @ Vector((0, -1, 0, 0))).to_3d().normalized()     # the open cover's page side
        thL = wpt(ch, "LeftHandThumb3", True); fiL = wpt(ch, "LeftHandMiddle2")
        print("DESK GRIP book left: thumb on the page side %+.4f, fingers behind %+.4f (thumb > 0, fingers < 0)" % (
            (thL - ppL).dot(n_cov), (fiL - ppL).dot(n_cov)), flush=True)
        # --- LAMP BUTTON, right index fingertip: palm down, fingers towards the lamp and down ---
        Mh = P.calibrate("Right", hand_q(ch, "Right", Vector((-0.70, 0.15, -0.70)), Vector((0, 0, -1))), G_PRESS, HEAD0)
        tip_cal = wpt(ch, "RightHandIndex3", True)
        C_TIP = Mh.inverted() @ Matrix.Translation(tip_cal)
        P.body(0, P_LAP, HEAD0)
        POLE_BK = Vector((-1.0, 0.3, -0.6))          # elbow out to her right

        def put_book(Mb, th, fr):
            set_M(book, Mb, fr); hinge.rotation_euler = (0, 0, th); hinge.keyframe_insert("rotation_euler", frame=fr)

        def cover_M(Mb, th):
            return Mb @ Rz(th)

        if SHOT == "SG3":
            GRAB, CARRY, TH0, TH1, LGRAB = 0.85, 1.60, 1.75, 2.35, 2.45
            B_UP = Tr(0.0012, 0, 0.003) @ B_LIE
            BK = [(GRAB, B_LIE), (GRAB + 0.12, B_LIE), (GRAB + 0.32, B_UP), (CARRY, B_READ)]     # held still a moment at the touch
            R_PRE = P.from_prop("Right", Tr(0.0012, 0, -0.0006) @ B_LIE, C_BR, G_BOOK_OPEN, POLE_BK)

            def theta(t):
                return 0.0 if t < TH0 else OPEN * E.ease((t - TH0) / (TH1 - TH0))

            def right(t):
                if t < 0.30: return R_LAP
                if t < 0.70: return tblend(R_LAP, R_PRE, (t - 0.30) / 0.40)
                if t < GRAB: return tblend(R_PRE, P.from_prop("Right", B_LIE, C_BR, G_BOOK, POLE_BK), (t - 0.70) / (GRAB - 0.70))
                return P.from_prop("Right", key_M(BK, t), C_BR, G_BOOK, POLE_BK.lerp(P.pole["Right"], E.ease((t - GRAB - 0.2) / (CARRY - GRAB - 0.2))))

            L_PRE = P.from_prop("Left", Tr(0.0010, -0.0015, -0.0010) @ cover_M(B_READ, OPEN), C_BL, G_BOOK_OPEN)

            def left(t):
                if t < 1.95: return L_LAP
                if t < 2.30: return tblend(L_LAP, L_PRE, (t - 1.95) / 0.35)
                if t < LGRAB: return tblend(L_PRE, P.from_prop("Left", cover_M(B_READ, OPEN), C_BL, G_BOOK), (t - 2.30) / (LGRAB - 2.30))
                return P.from_prop("Left", cover_M(B_READ, OPEN), C_BL, G_BOOK)

            def head(t):
                if t < 0.30: return HEAD0
                if t < 1.30: return (0, -8, -8)            # looks at the book on the cabinet (her right)
                if t < 1.70: return (0, -2, -8)
                return (0, 0, -14)                         # reads: head a little down, face still to the camera
            grabbed = False
            for fr in E.frames():
                t = fr / E.FPS
                P.solve(t, fr, head(t), right(t), left(t))
                Mb = B_LIE if t < GRAB else hand_M(ch, "Right") @ C_BR
                if t >= GRAB and not grabbed:
                    grabbed = True; e_ = (Mb.translation - B_LIE.translation).length
                    print("CONTACT SG3 grab t=%.2f book_jump %.4f %s" % (t, e_, "" if e_ < 0.0006 else "WARN hand did not reach the book"), flush=True)
                put_book(Mb, theta(t), fr)
                if fr % 4 == 0:
                    pinchL = (wpt(ch, "LeftHandThumb3", True) + wpt(ch, "LeftHandIndex2")) / 2
                    cornerL = cover_M(Mb, theta(t)) @ GL_LOC
                    top_ = (Mb @ Vector((0, 0, BOOK_H))).z
                    print("CONTACT SG3 t=%.2f book_off_target %.4f theta %.0f left_pinch_to_cover_corner %.4f book_top_below_chin %.4f book_bottom_above_cab %.4f" % (
                        t, (Mb.translation - key_M(BK, t).translation).length if t >= GRAB else 0.0, math.degrees(theta(t)),
                        (pinchL - cornerL).length, (mouth(ch).z - CHIN_DZ) - top_, (Mb @ Vector((0, -BOOK_T, 0))).z - CAB_TOP), flush=True)
            ch.finish(); E.constant(book); E.constant(hinge)
            lamp_switch(99.0)

        elif SHOT == "SG4":
            CL0, CL1, LREL, PUT, REL = 0.0, 0.45, 0.50, 1.35, 1.35
            B_UP = Tr(0.0012, 0, 0.003) @ B_LIE
            BK = [(0.55, B_READ), (1.05, B_UP), (PUT, B_LIE)]
            R_OFF = P.from_prop("Right", Tr(0.0014, 0, -0.0010) @ B_LIE, C_BR, G_RELAX, POLE_BK)
            Q_WAVE = hand_q(ch, "Right", Vector((-0.1, -0.1, 1)), Vector((0.05, -1, 0.1)))
            W0 = 1.55

            def theta(t):
                return OPEN * (1 - E.ease((t - CL0) / (CL1 - CL0))) if t < CL1 else 0.0

            def left(t):
                if t < LREL: return P.from_prop("Left", cover_M(B_READ, theta(t)), C_BL, G_BOOK)
                return tblend(P.from_prop("Left", cover_M(B_READ, 0.0), C_BL, G_BOOK_OPEN), L_LAP, (t - LREL) / 0.35)

            def head(t):
                if t < 0.5: return (0, 0, -12)
                if t < 1.4: return (0, -8, -8)             # looks at the cabinet while putting the book back
                return (0, -10, -1)                        # face to the camera, a little towards the traveller (her right)
            last_b, said = None, set()
            for fr in E.frames():
                t = fr / E.FPS
                if t <= PUT:
                    Mt = key_M(BK, t) if t >= 0.55 else B_READ
                    P.solve(t, fr, head(t), P.from_prop("Right", Mt, C_BR, G_BOOK, P.pole["Right"].lerp(POLE_BK, E.ease((t - 0.55) / 0.5))), left(t))
                    Mb = hand_M(ch, "Right") @ C_BR; last_b = Mb
                else:
                    if "rel" not in said and last_b is not None:
                        said.add("rel"); print("CONTACT SG4 release t=%.2f book_bottom_above_cab %.4f off_place %.4f" % (
                            t, (last_b @ Vector((0, -BOOK_T, 0))).z - CAB_TOP, (last_b.translation - B_LIE.translation).length), flush=True)
                    u = min(1.0, (t - PUT) / 0.12); Mb = blend_M(last_b, B_LIE, u) if last_b is not None else B_LIE
                    hd = head(t)
                    P.body(t, P_LAP, hd)
                    lft = left(t); ldirs = ik_arm(ch, "Left", lft[1], lft[3])
                    off = tblend(P.from_prop("Right", B_LIE, C_BR, G_BOOK, POLE_BK), R_OFF, (t - PUT) / 0.25)
                    r_ik = ik_arm(ch, "Right", off[1], off[3])
                    if t < W0: rdirs = r_ik
                    elif t < W0 + 0.3: rdirs = blend_dirs(r_ik, wave_dirs(W0 + 0.3), (t - W0) / 0.3)
                    else: rdirs = wave_dirs(t)
                    P.body(t, {**rdirs, **ldirs}, hd)
                    untwist(ch, "Left", lft[0], fr); set_hand_rot(ch, "Left", lft[0]); curl(ch, "Left", lft[2])
                    qr = off[0] if t < W0 + 0.15 else Q_WAVE
                    untwist(ch, "Right", qr, fr); set_hand_rot(ch, "Right", qr); curl(ch, "Right", off[2] if t < W0 + 0.15 else G_WAVE)
                    key_hand(ch, "Left", fr); key_hand(ch, "Right", fr)
                put_book(Mb, theta(t), fr)
                if fr % 4 == 0:
                    hr = wpt(ch, "RightHandMiddle1"); hdp = wpt(ch, "Head")
                    print("CONTACT SG4 t=%.2f theta %.0f book_off_target %.4f wave_hand_outside_face_x %.4f hand_above_shoulder %.4f" % (
                        t, math.degrees(theta(t)), (Mb.translation - (key_M(BK, t) if t >= 0.55 else B_READ).translation).length,
                        hdp.x - hr.x, hr.z - SHR.z), flush=True)
            ch.finish(); E.constant(book); E.constant(hinge)
            lamp_switch(99.0)
            if CAMSUB == "main":
                def trav(t):
                    if t >= 1.9: return E.P_wave(int((t - 1.9) * 3) % 2), (0, -16, 0)
                    return E.P_stand(), (0, -16, 0)
                stand("traveler_girl", (CAB_CX - 0.040, HY - 0.050), 40, trav, height=GIRL)

        else:
            # SG5: right index fingertip on the lamp button (it goes 0.3 mm down), the lamp goes out at the touch, then she smiles
            put_book(B_LIE, 0.0, 0)
            PRE = BTN + Vector((0.0016, -0.0006, 0.0018)); TOP_ = BTN + Vector((0, 0, 0.00025)); DOWN = TOP_ + Vector((0, 0, -0.0003))
            TK = [(0.30, PRE), (0.80, PRE + Vector((-0.0004, 0, -0.0006))), (0.95, TOP_), (1.05, DOWN), (1.15, DOWN), (1.30, TOP_ + Vector((0, 0, 0.0012))), (1.55, PRE)]

            def tip_target(t):
                return lerp_keys([(a, Vector(b)) for a, b in TK], t)

            def right(t):
                if t < 0.30: return tblend(R_LAP, P.from_prop("Right", Matrix.Translation(PRE), C_TIP, G_PRESS, POLE_BK), t / 0.30) if t > 0.05 else R_LAP
                if t < 1.55: return P.from_prop("Right", Matrix.Translation(tip_target(t)), C_TIP, G_PRESS, POLE_BK)
                return tblend(P.from_prop("Right", Matrix.Translation(PRE), C_TIP, G_PRESS, POLE_BK), R_LAP, (t - 1.55) / 0.35)

            def head(t):
                if 0.2 < t < 1.3: return (0, -10, -7)          # looks at the lamp
                return (0, 0, -1) if t < 2.0 else (2, 0, 0)    # face to the camera; a little smiling head tilt
            t_off = None
            for fr in E.frames():
                t = fr / E.FPS
                P.solve(t, fr, head(t), right(t), L_LAP)
                tip = wpt(ch, "RightHandIndex3", True)
                d_ = (tip - TOP_).length
                if t_off is None and t >= 0.85 and (d_ < 0.0004 or t >= 1.05):
                    t_off = t
                    print("CONTACT SG5 lamp off t=%.2f fingertip_to_button %.4f %s" % (t, d_, "" if d_ < 0.0004 else "WARN forced: finger did not reach the button"), flush=True)
                pressed = 0.95 <= t <= 1.20
                btn.location = (BTN.x, BTN.y, BTN.z - (0.0003 if pressed else 0.0)); btn.keyframe_insert("location", frame=fr)
                if fr % 4 == 0:
                    print("CONTACT SG5 t=%.2f fingertip_to_button %.4f fingertip_off_target %.4f tip_below_shade %.4f" % (
                        t, d_, (tip - tip_target(t)).length if 0.3 <= t <= 1.55 else 0.0, SHADE_LO - tip.z), flush=True)
            ch.finish(); E.constant(btn)
            lamp_switch(t_off if t_off is not None else 1.0)

        # ---------- cameras ----------
        lift = Vector((0, 0, 0.001))
        grab_pt = B_LIE @ GR_LOC
        read_pt = B_READ @ Vector((0, 0, 0.35 * BOOK_H))
        HANDCAM = {   # aim, camera offset, lens. Her right hand is on the -x side; DOF off.
            "HF": ((BTN if SHOT == "SG5" else grab_pt) + lift, Vector((-0.06, -0.13, 0.04)), 190),
            "HS": ((BTN if SHOT == "SG5" else grab_pt) + lift, Vector((0.05, -0.07, 0.13)), 190),       # from above-left, past her lap
            "HR": (read_pt, Vector((-0.02, -0.15, 0.02)), 170),                                         # front: both hands on the open book
            "HR2": (read_pt, Vector((0.0, -0.06, 0.15)), 170),                                         # from above: thumbs on the pages
            # legs ON the mattress, never through it (UK 11/20): front-left at seat height + low front
            "L": (Vector((HX, HY - 0.004, SEAT_Z + 0.004)), Vector((0.12, -0.12, 0.003)), 190),
            "L2": (Vector((HX, BED_FRONT, SEAT_Z + 0.002)), Vector((-0.03, -0.15, -0.002)), 190)}
        if CAMSUB in HANDCAM:
            aim, off, lens = HANDCAM[CAMSUB]
            cam_move(lens, aim + off, aim, aim + off, aim, focus=aim)
            for cd in bpy.data.cameras: cd.dof.use_dof = False
        elif CAMSUB == "C":
            aim = mouth0 + Vector((0, 0, -0.006))
            cam_move(115, aim + Vector((-0.03, -0.16, 0.01)), aim, aim + Vector((-0.03, -0.16, 0.01)), aim)
        elif SHOT in ("SG3", "SG4"):      # front: whole seated girl (feet on the floor), the cabinet with book and lamp on the left
            aim = Vector((HX - 0.007, HY - 0.010, (SEAT_Z + mouth0.z) / 2 + 0.004))
            cam_move(56, aim + Vector((-0.030, -0.30, 0.055)), aim, aim + Vector((-0.026, -0.28, 0.050)), aim, focus=(HX, HY - 0.006, mouth0.z - 0.01))
        else:                              # SG5: wider; clock top right, window with Marina Bay Sands, lamp on the left
            aim = Vector((HX + 0.030, HY - 0.010, FLOOR + 0.074))
            cam_move(42, aim + Vector((-0.015, -0.42, 0.050)), aim, aim + Vector((-0.015, -0.42, 0.050)), aim, focus=mouth0)
        print("DESK CAM %s %s" % (SHOT, CAMSUB), flush=True)
        face_fill_switch()
        if CAMSUB == "main":
            view_report(SHOT, [("clock", CLOCK), ("girl_mouth", lambda: mouth(ch)), ("left_shoe", lambda: wpt(ch, "LeftFoot")),
                               ("lamp_top", (LAMP_C.x, LAMP_C.y, LAMP_TOP)), ("book_on_cab", B_LIE.translation), ("window", (WIN_X, 0.24, FLOOR + 0.11))])
    if CAMSUB not in ("main", "C"):
        hide([rug])

E.run(A[3:])
