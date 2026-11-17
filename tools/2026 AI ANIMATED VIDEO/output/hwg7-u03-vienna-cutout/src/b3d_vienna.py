# A Day in Vienna - six procedural 3D support shots, style J look (toon 2-step + dark-brown Freestyle outline). Blender 5.2, Colab Cycles. ASCII only.
# blender -b --factory-startup --python b3d_vienna.py -- <props_dir> <out_dir> <shot> <frames: 0,60,119 | all> <samples> <scale%>
# shots: s0 garden fly-in, s1 tram arrives, s2 time tunnel, s3 opera house crane-up, s4 dusk garden pull-back, s5 inside the piano
import bpy, math, os, sys, random
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
PROPS, OUT, SHOT, FRAMES, SAMPLES, SCALE = A[0], A[1], A[2], A[3], int(A[4]), int(A[5])
NF = {"s0": 120, "s1": 120, "s2": 120, "s3": 90, "s4": 120, "s5": 90}[SHOT]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = "Standard"
LINE = (0.169, 0.110, 0.090)
MATS = {}


def hx(h): return tuple(pow(int(h[i:i + 2], 16) / 255, 2.2) for i in (0, 2, 4))


def mat(h, emit=0.0, flat=False):
    key = (h, emit, flat)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new("m_" + h); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); c = (*hx(h), 1)
    if emit > 0 or flat:
        e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = c; e.inputs["Strength"].default_value = emit if emit > 0 else 1.0
        nt.links.new(e.outputs[0], out.inputs["Surface"])
    else:
        t = nt.nodes.new("ShaderNodeBsdfToon"); t.inputs["Color"].default_value = c; t.inputs["Size"].default_value = 0.62; t.inputs["Smooth"].default_value = 0.03
        nt.links.new(t.outputs[0], out.inputs["Surface"])
    MATS[key] = m; return m


def _fin(o, m, name, smooth=False):
    o.name = name; o.data.materials.append(m if not isinstance(m, str) else mat(m))
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o


def box(loc, size, m, name="box", rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    if bevel > 0:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        b = o.modifiers.new("bv", "BEVEL"); b.width = bevel; b.segments = 4
    return _fin(o, m, name, bevel > 0)


def cyl(loc, r, d, m, name="cyl", rot=(0, 0, 0), v=24, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot); return _fin(bpy.context.object, m, name, smooth)


def cone(loc, r1, r2, d, m, name="cone", rot=(0, 0, 0), v=24):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r1, radius2=r2, depth=d, location=loc, rotation=rot); return _fin(bpy.context.object, m, name, v > 8)


def ball(loc, r, m, name="ball", scale=(1, 1, 1), seg=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(8, seg // 2), radius=r, location=loc); o = bpy.context.object; o.scale = scale
    return _fin(o, m, name, True)


def torus(loc, R, r, m, name="torus", rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=40, minor_segments=10, location=loc, rotation=rot); return _fin(bpy.context.object, m, name, True)


def prism(pts2d, depth, loc, m, name="prism", rot=(0, 0, 0)):
    """extrude a 2D outline (x,z) along y by depth, centred."""
    n = len(pts2d); vs = [(x, -depth / 2, z) for x, z in pts2d] + [(x, depth / 2, z) for x, z in pts2d]
    fs = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = rot; o.data.materials.append(mat(m) if isinstance(m, str) else m); return o


def group(name, objs):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e)
    for o in objs: o.parent = e
    return e


def world(top, mid, bot, strength=1.0):
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld"); mix = nt.nodes.new("ShaderNodeMixShader"); lp = nt.nodes.new("ShaderNodeLightPath")
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp; cr.elements[0].position = 0.0; cr.elements[0].color = (*hx(bot), 1); cr.elements[1].position = 1.0; cr.elements[1].color = (*hx(top), 1)
    e = cr.elements.new(0.5); e.color = (*hx(mid), 1)
    bg = nt.nodes.new("ShaderNodeBackground"); amb = nt.nodes.new("ShaderNodeBackground"); amb.inputs["Color"].default_value = (1, 1, 1, 1); amb.inputs["Strength"].default_value = strength
    nt.links.new(tc.outputs["Window"], sep.inputs[0]); nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"]); nt.links.new(amb.outputs[0], mix.inputs[1]); nt.links.new(bg.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs["Surface"])


def sun(rot_deg, strength=3.0, color=(1, 1, 1)):
    d = bpy.data.lights.new("sun", "SUN"); d.energy = strength; d.angle = 0.01; d.color = color
    o = bpy.data.objects.new("sun", d); sc.collection.objects.link(o); o.rotation_euler = [math.radians(v) for v in rot_deg]; return o


cd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam; cd.clip_end = 2000


def look(loc, at, lens=35, roll=0.0):
    cam.location = loc; q = (Vector(at) - Vector(loc)).to_track_quat("-Z", "Y"); e = q.to_euler(); cam.rotation_euler = e
    if roll: cam.rotation_euler.rotate_axis("Z", roll)
    cd.lens = lens


def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t
def vl(a, b, t): return tuple(lerp(x, y, t) for x, y in zip(a, b))


# ============================ garden (s0 day / s4 dusk) ============================
CLEF = [(0.0, -3.2), (-0.7, -3.0), (-0.9, -2.4), (-0.4, -2.0), (0.2, -2.3), (0.3, -1.4), (0.2, 0.0), (0.0, 1.6), (-0.2, 3.0), (0.2, 4.0), (0.8, 4.4), (1.0, 3.6),
        (0.6, 2.6), (-0.4, 1.6), (-1.3, 0.6), (-1.6, -0.4), (-1.2, -1.3), (-0.3, -1.7), (0.7, -1.4), (1.2, -0.6), (1.0, 0.2), (0.3, 0.6), (-0.4, 0.3), (-0.6, -0.4), (-0.2, -0.9)]


def clef_points(step=0.42):
    pts = []
    for (x0, y0), (x1, y1) in zip(CLEF, CLEF[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
        for i in range(n): pts.append((lerp(x0, x1, i / n), lerp(y0, y1, i / n)))
    return pts


def tree(x, y, s=1.0, col="4f8f46"):
    cyl((x, y, 1.2 * s), 0.28 * s, 2.4 * s, "7a4a2c", "trunk", v=10)
    ball((x, y, 3.4 * s), 1.7 * s, col, "crown", (1, 1, 1.1), 14)


def palace(y0=42.0):
    W = "f4efe4"; W2 = "e9e0cd"; WIN = "8fb8d6"; ROOF = "8a9aa6"
    box((0, y0, 5), (70, 10, 10), W, "wing"); box((0, y0, 10.4), (71, 10.6, 0.8), W2, "cornice"); box((0, y0, 11.6), (68, 8, 1.6), ROOF, "roof")
    box((0, y0 - 2, 7.5), (20, 12, 15), W, "centre"); box((0, y0 - 2, 15.4), (21, 12.6, 0.8), W2, "cornice2")
    prism([(-10.5, 0), (10.5, 0), (0, 4.2)], 12.4, (0, y0 - 2, 15.8), "ead9b4", "pediment")
    ball((0, y0 - 1, 18.6), 4.2, "7fae9a", "dome", (1, 1, 0.9), 24); cyl((0, y0 - 1, 22.8), 0.25, 2.2, "d9b44a", "spire", v=8)
    for s in (-1, 1):
        box((s * 33, y0 - 1, 6), (9, 12, 12), W, "pav"); box((s * 33, y0 - 1, 12.4), (9.6, 12.6, 0.8), W2, "pavc"); cone((s * 33, y0 - 1, 14.6), 6.2, 0.6, 3.6, ROOF, "pavroof", v=4, rot=(0, 0, math.radians(45)))
    for i in range(-13, 14):
        if abs(i) <= 3 or abs(i) >= 11: continue
        for z in (3.0, 7.2): box((i * 2.45, y0 - 5.05, z), (1.2, 0.3, 2.2), WIN, "win")
    for i in range(-3, 4):
        for z, hh in ((9.6, 3.0), (4.6, 3.2)):
            if z < 6 and i == 0: continue
            box((i * 2.6, y0 - 8.05, z), (1.3, 0.3, hh), WIN, "winc")
    box((0, y0 - 8.1, 2.4), (2.6, 0.4, 4.8), "6a4a2c", "door")
    for i in (-3.5, -1.5, 1.5, 3.5): cyl((i * 1.3 * 2, y0 - 8.6, 6), 0.42, 12, W2, "col", v=12)
    box((0, y0 - 10.5, 0.3), (24, 5, 0.6), W2, "steps")


def garden(dusk=False):
    G = "74b556" if not dusk else "5a6a5a"; G2 = "63a348" if not dusk else "4c5c4e"; HG = "4f8f46" if not dusk else "3a4a3c"
    box((0, 30, -0.5), (600, 600, 1), G, "ground")
    box((0, 2, 0.02), (9, 70, 0.06), "e6d3a8", "path"); box((0, 25, 0.02), (90, 6, 0.06), "e6d3a8", "path2")
    for s in (-1, 1):                                   # parterre lawns + far hills so the ground is not one flat colour
        for k in range(3): box((s * 34, -22 + k * 19, 0.03), (22, 15, 0.06), G2, "parterre"); box((s * 34, -22 + k * 19, 0.3), (23, 0.9, 0.6), HG, "pt_hedge"); box((s * 34, -22 + k * 19 + 7.6, 0.3), (23, 0.9, 0.6), HG, "pt_hedge2")
        ball((s * 150, 300, -30), 120, "5f9f58" if not dusk else "3f4f48", "hill", (1.4, 1, 0.6), 24)
        for k in range(9): tree(s * (48 + k * 9), 60 + (k % 3) * 6, 2.0 + 0.3 * (k % 2), "4a8a44" if not dusk else "34443a")
    ball((0, 320, -40), 130, "6aa862" if not dusk else "46564e", "hill_c", (2.2, 1, 0.5), 24)
    cyl((0, 0, 0.06), 12.6, 0.12, "e6d3a8", "ring", v=64); cyl((0, 0, 0.12), 11.2, 0.14, "5a9a40" if not dusk else "4f5f50", "lawn", v=64)
    cols = ["e8413c", "f2a0b8", "f6c84a", "e8413c", "ffffff"]
    K = 2.05
    for i, (x, y) in enumerate(clef_points(0.2)):
        ball((x * K, y * K - 1.2, 0.34), 0.36, mat("ffffff" if not dusk else "e8e0d0"), "flower_w", (1.25, 1.25, 0.6), 8)
    for i, (x, y) in enumerate(clef_points(0.2)):
        ball((x * K, y * K - 1.2, 0.46), 0.27, mat("e8413c"), "flower", seg=8)
    for i in range(72):
        a = i * math.tau / 72
        ball((11.9 * math.cos(a), 11.9 * math.sin(a), 0.3), 0.34, mat(cols[i % 5]), "edge", seg=8)
    # Mozart statue
    sy = 19
    box((0, sy, 1.0), (2.6, 2.6, 2.0), "efe8da", "ped"); box((0, sy, 2.2), (3.0, 3.0, 0.4), "e2d8c4", "pedc")
    cyl((0, sy, 3.6), 0.5, 2.4, "b9bcc0", "st_body", v=12); cone((0, sy, 3.0), 0.9, 0.5, 1.4, "b9bcc0", "st_coat", v=12); ball((0, sy, 5.1), 0.48, "b9bcc0", "st_head", seg=12)
    box((0.55, sy - 0.2, 4.2), (0.9, 0.2, 0.2), "b9bcc0", "st_arm", rot=(0, math.radians(-25), 0))
    for s in (-1, 1):
        for k in range(9): box((s * 16, -18 + k * 5.2, 0.9), (2.0, 4.4, 1.8), HG, "hedge", bevel=0.5)
        for k in range(6): tree(s * (21.5 + (k % 2) * 4), -14 + k * 8, 1.2 + 0.2 * (k % 3), "4f8f46" if not dusk else "34443a")
        for k in range(3): cyl((s * 13.8, -9 + k * 9, 1.6), 0.09, 3.2, "3a3a40", "lamp", v=8); ball((s * 13.8, -9 + k * 9, 3.3), 0.3, mat("fff0b0", 2.5 if dusk else 0.0, not dusk), "bulb", seg=10)
    palace()


def shot_s0():
    world("6fa8de", "a9d0ef", "dcecf6", 0.55); sun((52, 0, 28), 3.2); garden()
    def st(f):
        t = ease(f / (NF - 1))
        look(vl((14, -84, 50), (4.5, -27, 12.5), t), vl((0, 20, 4), (0, 6, 2.0), t), lerp(30, 32, t))
    return st


def shot_s4():
    world("3d2a5c", "c4566a", "f6a65a", 0.30); sun((80, 0, 180), 2.4, (1.0, 0.62, 0.36)); garden(dusk=True)
    ball((6, 190, 14), 26, mat("ffe2a0", 3.0), "bigsun", seg=40); ball((6, 189, 14), 40, mat("ff9a50", 0.5), "halo", seg=32)
    def st(f):
        t = ease(f / (NF - 1))
        look(vl((0, -24, 4.2), (0, -66, 32), t), vl((0, 30, 9), (0, 26, 9), t), lerp(38, 30, t))
    return st


# ============================ tram (s1) ============================
def building(x, y, w, d, h, col, floors, side):
    box((x, y, h / 2), (w, d, h), col, "bld"); box((x, y, h + 0.3), (w + 0.5, d + 0.5, 0.6), "d8cfc0", "bcorn")
    box((x, y, h + 1.2), (w - 0.6, d - 0.6, 1.4), "7a5548", "broof")
    fx = x - side * (w / 2 + 0.03)
    n = max(2, int(d // 2.6))
    for k in range(n):
        yy = y - d / 2 + (k + 0.5) * d / n
        for fl in range(1, floors):
            box((fx, yy, 1.6 + fl * 3.3), (0.12, 1.1, 1.8), "9fc4dc", "bwin"); box((fx - side * 0.05, yy, 0.55 + fl * 3.3), (0.2, 1.4, 0.16), "efe6d6", "bsill")
        box((fx, yy, 1.7), (0.12, 1.7, 2.6), "3f4f5c" if k % 2 else "7a4a2c", "shop")
        box((fx - side * 0.5, yy, 3.3), (1.0, 2.0, 0.14), ("c0303a", "f2c53d", "3f7a52")[k % 3], "awning", rot=(0, side * 0.25, 0))


def tram():
    R, WH, DK = "c8282e", "f4f1ea", "2a2f3a"
    parts = []
    L, Wd = 14.0, 2.4
    parts.append(box((0, 0, 1.25), (Wd, L, 1.5), R, "t_low", bevel=0.25)); parts.append(box((0, 0, 2.55), (Wd - 0.06, L - 0.1, 1.3), WH, "t_up", bevel=0.25))
    parts.append(box((0, 0, 3.32), (Wd - 0.3, L - 0.8, 0.3), "b9bec4", "t_roof", bevel=0.12)); parts.append(box((0, 0, 0.42), (Wd - 0.3, L - 0.6, 0.5), DK, "t_skirt"))
    parts.append(box((0, 0, 1.98), (Wd + 0.02, L - 0.3, 0.1), WH, "t_stripe"))
    for s in (-1, 1):
        for k in range(6):
            parts.append(box((s * (Wd / 2 - 0.01), -5.4 + k * 2.15, 2.6), (0.08, 1.7, 0.95), "5a7f9a", "t_win", bevel=0.03))
    for s in (-1, 1):                                  # passenger silhouettes behind the side windows
        for k in (0, 1, 3, 4):
            parts.append(ball((s * (Wd / 2 + 0.035), -5.4 + k * 2.15 + 0.2, 2.62), 0.27, mat("35546c", flat=True), "t_pax", (0.06, 1, 1), 12))
            parts.append(box((s * (Wd / 2 + 0.035), -5.4 + k * 2.15 + 0.2, 2.24), (0.03, 0.8, 0.26), mat("35546c", flat=True), "t_pax_b"))
    parts.append(box((0, -L / 2 + 0.02, 2.62), (1.9, 0.1, 1.0), "5a7f9a", "t_front", bevel=0.04))     # windshield (front = -Y, facing camera)
    parts.append(box((0, -L / 2 + 0.01, 3.28), (1.2, 0.1, 0.3), "f2c53d", "t_sign"))
    for s in (-1, 1): parts.append(cyl((s * 0.78, -L / 2 - 0.02, 1.15), 0.17, 0.1, mat("fff3b8", 3.0), "t_lamp", rot=(math.pi / 2, 0, 0), v=16))
    parts.append(box((0, -L / 2 - 0.05, 0.75), (2.0, 0.25, 0.3), DK, "t_bumper", bevel=0.08))
    for yy in (-4.2, 4.2):
        for s in (-1, 1): parts.append(cyl((s * 0.72, yy, 0.36), 0.36, 0.2, "1c1c22", "t_wheel", rot=(0, math.pi / 2, 0), v=20))
    for a, b in (((0, 0.6, 3.45), (0, 1.5, 4.25)), ((0, 2.4, 3.45), (0, 1.5, 4.25))):     # pantograph
        mid = [(a[i] + b[i]) / 2 for i in range(3)]; ln = math.dist(a, b); ang = math.atan2(b[2] - a[2], b[1] - a[1])
        parts.append(box(mid, (0.08, ln, 0.08), DK, "t_panto", rot=(ang, 0, 0)))
    parts.append(box((0, 1.5, 4.27), (1.3, 0.1, 0.06), DK, "t_shoe"))
    doors = []
    for k, yy in enumerate((-3.2, 3.2)):
        for h in (-1, 1):
            dpan = box((-(Wd / 2 + 0.02), yy + h * 0.36, 1.75), (0.08, 0.68, 2.3), "a81e24", "t_door", bevel=0.03); dpan["h"] = h; dpan["y0"] = yy + h * 0.36; doors.append(dpan)
    g = group("tram", parts + doors); return g, doors


def shot_s1():
    world("6fa8de", "a9d0ef", "e6f2f8", 0.55); sun((55, 0, -35), 3.2)
    box((0, 60, -0.5), (300, 500, 1), "8a8a90", "road"); box((0, 60, 0.01), (3.4, 500, 0.03), "77777e", "trackbed")
    for s in (-1, 1):
        box((s * 0.72, 60, 0.05), (0.09, 500, 0.08), "3a3a40", "rail")
        box((s * 9.5, 60, 0.12), (7, 500, 0.24), "d9d2c4", "sidewalk")
    for k in range(-2, 40):
        box((2.9, k * 6.0, 0.02), (0.16, 2.6, 0.03), "f4f1ea", "lane")
        if k % 3 == 0 and k >= 3:
            for s in (-1, 1):
                cyl((s * 5.4, k * 6.0, 3.4), 0.1, 6.8, "3a4a40", "pole", v=8); box((s * 2.7, k * 6.0, 6.3), (5.4, 0.06, 0.06), "3a4a40", "span")
    box((0, 60, 5.6), (0.04, 500, 0.04), "2a2a2e", "wire")
    cols = ["f2e2b8", "e9c9a0", "d9e2c8", "f0d0c0", "e6dcc8", "cfd9e6"]
    yb = -12
    for k in range(10):
        d = 13 + (k * 5) % 7; h = 13 + (k * 7) % 6
        building(-17, yb + d / 2, 8, d, h, cols[k % 6], 4, -1); building(17, yb + d / 2, 8, d, h + (k % 2) * 3, cols[(k + 3) % 6], 4, 1); yb += d + 0.4
    # tram stop: sign pole + shelter on the left sidewalk (camera side)
    cyl((-6.4, 2.5, 1.5), 0.07, 3.0, "3a4a40", "stop_pole", v=8); cyl((-6.4, 2.5, 3.1), 0.42, 0.08, "f2c53d", "stop_sign", rot=(math.pi / 2, 0, 0), v=24)
    cyl((-6.4, 2.46, 3.1), 0.30, 0.08, "3f7a52", "stop_sign2", rot=(math.pi / 2, 0, 0), v=24)
    box((-7.6, 8, 2.5), (1.8, 4.4, 0.12), "3f7a52", "shelter");
    for yy in (6, 10): cyl((-8.3, yy, 1.25), 0.06, 2.5, "3a4a40", "sh_pole", v=8)
    box((-8.35, 8, 1.4), (0.05, 4.2, 1.8), "bfdcea", "sh_glass"); box((-7.9, 8, 0.5), (0.5, 3.0, 0.1), "7a4a2c", "bench")
    for k in range(5): tree(-11.6, 14 + k * 17, 0.95); tree(11.6, 6 + k * 17, 0.95)
    g, doors = tram()
    def st(f):
        t = f / (NF - 1)
        y = lerp(120, 9.2, 1 - (1 - min(1.0, t / 0.78)) ** 2.4)          # fast then brakes, stopped by 78%
        g.location = (0, y, 0)
        op = ease((t - 0.84) / 0.14)
        for d in doors: d.location.y = d["y0"] + d["h"] * 0.62 * op
        look((-4.6, lerp(-7.5, -6.5, t), 1.75), (-0.4, lerp(26, 9, ease(t)), 2.0), 30)
    return st


# ============================ time tunnel (s2) ============================
def note(loc, s, col, rot):
    h = ball((0, 0, 0), 0.5, mat(col, 1.6), "n_head", (1.25, 0.5, 0.9), 12); stem = box((0.55, 0, 1.3), (0.14, 0.14, 2.6), mat(col, 1.6), "n_stem")
    flag = box((0.95, 0, 2.3), (0.8, 0.14, 0.34), mat(col, 1.6), "n_flag", rot=(0, 0.5, 0))
    g = group("note", [h, stem, flag]); g.location = loc; g.scale = (s, s, s); g.rotation_euler = rot; return g


def gear(loc, r, col, rot):
    ps = [cyl((0, 0, 0), r, 0.3, col, "g_disc", rot=(math.pi / 2, 0, 0), v=28), cyl((0, -0.02, 0), r * 0.35, 0.36, "3a2a52", "g_hub", rot=(math.pi / 2, 0, 0), v=16)]
    for i in range(10):
        a = i * math.tau / 10; ps.append(box((math.cos(a) * r * 1.08, 0, math.sin(a) * r * 1.08), (r * 0.3, 0.3, r * 0.3), col, "g_tooth", rot=(0, -a, 0)))
    g = group("gear", ps); g.location = loc; g.rotation_euler = rot; return g


def clock(loc, r, rot):
    ps = [cyl((0, 0, 0), r, 0.25, "fbf6e8", "c_face", rot=(math.pi / 2, 0, 0), v=32), torus((0, 0, 0), r, r * 0.09, "d9b44a", "c_rim", rot=(math.pi / 2, 0, 0))]
    for i in range(12):
        a = i * math.tau / 12; ps.append(box((math.sin(a) * r * 0.8, -0.14, math.cos(a) * r * 0.8), (r * 0.05, 0.04, r * 0.14), "2b1c17", "c_tick", rot=(0, a, 0)))
    hh = box((0, -0.16, r * 0.22), (r * 0.08, 0.05, r * 0.5), "2b1c17", "c_hour"); mm = box((0, -0.18, r * 0.34), (r * 0.05, 0.05, r * 0.72), "c0303a", "c_min")
    hp = group("hpiv", [hh]); mp = group("mpiv", [mm]); g = group("clock", ps + [hp, mp]); g.location = loc; g.rotation_euler = rot; g["hp"] = hp.name; g["mp"] = mp.name; return g


def shot_s2():
    world("120a2e", "1a1040", "241458", 0.5); sun((20, 0, 0), 2.2)
    rings = []; cols = ["7a4ae0", "3a8af0", "f2c53d", "e85aa0", "4ad0d8"]
    for k in range(46):
        rings.append(torus((0, k * 4.0, 0), 6.5 + 0.6 * math.sin(k * 0.9), 0.22, mat(cols[k % 5], 2.4), "ring", rot=(math.pi / 2, 0, 0)))
        for j in range(3):
            a = k * 0.5 + j * math.tau / 3
            box((7.2 * math.cos(a), k * 4.0 + 2, 7.2 * math.sin(a)), (0.25, 3.4, 0.25), mat(cols[(k + j) % 5], 1.4), "streak")
    ball((0, 215, 0), 9, mat("ffffff", 6.0), "light", seg=24); ball((0, 214, 0), 16, mat("bfe6ff", 1.2), "halo", seg=24)
    rnd = random.Random(8); things = []
    for k in range(34):
        a = rnd.uniform(0, math.tau); r = rnd.uniform(2.6, 4.6); y = 10 + k * 5.2; loc = (r * math.cos(a), y, r * math.sin(a)); rot = (rnd.uniform(-0.5, 0.5), rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6))
        kind = k % 3
        if kind == 0: o = note(loc, rnd.uniform(0.5, 0.8), ("fff0a0", "ffffff", "ffc0e0")[k % 3], rot)
        elif kind == 1: o = gear(loc, rnd.uniform(0.9, 1.4), ("d9b44a", "c98a3a")[k % 2], rot)
        else: o = clock(loc, rnd.uniform(1.0, 1.5), rot)
        o["spin"] = rnd.uniform(-2.5, 2.5); o["r0"] = tuple(rot); things.append(o)
    def st(f):
        t = f / (NF - 1); y = lerp(-4, 150, t * t * 0.55 + t * 0.45)
        look((0.6 * math.sin(t * 5), y, 0.5 * math.cos(t * 4)), (0, y + 30, 0), 20, roll=t * 1.3)
        for o in things:
            r0 = o["r0"]
            if o.name.startswith("clock"):
                bpy.data.objects[o["hp"]].rotation_euler = (0, t * 14, 0); bpy.data.objects[o["mp"]].rotation_euler = (0, t * 60, 0)      # hands run backwards
            elif o.name.startswith("gear"): o.rotation_euler = (r0[0], r0[1] + t * o["spin"] * 3, r0[2])
            else: o.rotation_euler = (r0[0], r0[1], r0[2] + t * o["spin"])
    return st


# ============================ opera house (s3) ============================
def arch(x, y, z, w, h, col, depth=0.5):
    box((x, y, z + (h - w / 2) / 2), (w, depth, h - w / 2), col, "arch_b"); cyl((x, y, z + h - w / 2), w / 2, depth, col, "arch_t", rot=(math.pi / 2, 0, 0), v=24)


def shot_s3():
    world("5f9fe0", "a9d0ef", "f0e6d0", 0.55); sun((58, 0, 32), 3.2, (1, 0.97, 0.9))
    ST, ST2, DKW, CU = "ead9b8", "d9c49c", "5a4a40", "6fae9a"
    box((0, 40, -0.5), (400, 400, 1), "b9b4aa", "plaza"); box((0, -6, 0.02), (400, 7, 0.05), "8a8a90", "street")
    for s in (-1, 1): box((s * 0.72 + 0, -6, 0.06), (400, 0.09, 0.08), "3a3a40", "rail")
    y0 = 22.0
    box((0, y0 + 14, 9), (58, 34, 18), ST, "body"); box((0, y0 + 14, 18.4), (59, 35, 0.8), ST2, "cornice")
    cyl((0, y0 + 16, 19.0), 16, 50, CU, "roof", rot=(0, math.pi / 2, 0), v=40); box((0, y0 + 16, 12.0), (50.5, 31.6, 14), ST, "roofcut")     # barrel roof (lower half hidden in the body)
    box((0, y0 - 6, 7), (36, 8, 14), ST, "loggia"); box((0, y0 - 6, 14.4), (37, 8.8, 0.8), ST2, "logc"); box((0, y0 - 6, 15.4), (34, 7, 1.2), CU, "logroof")
    for i in range(-2, 3):
        arch(i * 6.6, y0 - 10.05, 0.6, 4.2, 6.2, mat(DKW, flat=True)); arch(i * 6.6, y0 - 10.05, 8.0, 4.2, 5.6, mat("8fb8d6", flat=True))
        box((i * 6.6, y0 - 10.3, 7.4), (5.6, 0.6, 0.5), ST2, "balc")
    for i in range(-3, 3): box((i * 6.6 + 3.3, y0 - 10.2, 7), (0.9, 0.7, 13.6), ST2, "pier")
    for s in (-1, 1):
        box((s * 24, y0 - 1, 6), (12, 10, 12), ST, "wing"); box((s * 24, y0 - 1, 12.4), (12.8, 10.8, 0.8), ST2, "wingc"); cone((s * 24, y0 - 1, 14.4), 8.6, 1.2, 3.2, CU, "wingroof", v=4, rot=(0, 0, math.radians(45)))
        for k in (-1, 0, 1):
            arch(s * 24 + k * 3.6, y0 - 6.05, 0.6, 2.2, 4.6, mat(DKW, flat=True), 0.4); arch(s * 24 + k * 3.6, y0 - 6.05, 7.0, 2.2, 3.8, mat("8fb8d6", flat=True), 0.4)
        # bronze horse statues (simple) on the loggia corners
        box((s * 15, y0 - 8, 16.6), (1.8, 0.7, 1.0), "6a8a7a", "horse", bevel=0.2); ball((s * 15 + 0.9, y0 - 8, 17.5), 0.45, "6a8a7a", "hhead", seg=10); cyl((s * 15, y0 - 8, 17.5), 0.3, 1.2, "6a8a7a", "rider", v=10)
        for k in range(4): box((s * (15 - 0.6 + (k % 2) * 1.2), y0 - 8 + (k // 2) * 0.4 - 0.2, 15.9), (0.18, 0.18, 0.7), "6a8a7a", "leg")
    box((0, y0 - 12, 0.3), (40, 4, 0.6), ST2, "steps"); box((0, y0 - 13.5, 0.15), (42, 2, 0.3), ST2, "steps2")
    for i in range(-3, 4):
        x = i * 9.0
        cyl((x, y0 - 16, 2.4), 0.12, 4.8, "2e2e36", "lamp", v=8); ball((x, y0 - 16, 5.0), 0.5, mat("fff0b0", 1.5), "bulb", seg=12)
    for s in (-1, 1):
        cyl((s * 12, y0 - 14.2, 5.0), 0.1, 10, "d8d8d8", "flagpole", v=8); box((s * 12 + 1.1, y0 - 14.2, 8.6), (2.2, 0.05, 1.5), "c0303a", "flag"); box((s * 12 + 1.1, y0 - 14.2, 8.6), (2.24, 0.06, 0.5), "ffffff", "flagw")
        for k in range(3): tree(s * (36 + k * 7), y0 - 12 - k * 2, 1.3)
    def st(f):
        t = ease(f / (NF - 1))
        look(vl((-13, -30, 1.8), (0, -30, 13), t), vl((0, y0 - 6, 7), (0, y0 - 2, 9.5), t), lerp(26, 30, t))
    return st


# ============================ inside the piano (s5) ============================
SEQ = [9, 8, 9, 8, 9, 6, 8, 7, 5, 0, 2, 5]     # Fur Elise opening (E D# E D# E B D C A | C E A) on white keys C4..B5, one note per 7 frames; hammer touches the string 2 frames after the key goes down


def shot_s5():
    """Stylised cutaway: keys in front, big felt hammers swing UP and hit the strings from below."""
    world("2a1c1a", "3a2620", "5a3a28", 0.6); sun((40, 0, 25), 3.4, (1, 0.92, 0.8))
    SZ = 2.5                                               # string height
    box((0, 8, -0.2), (17, 20, 0.4), "c99a4a", "soundboard"); box((0, 8, -0.5), (18, 21, 0.2), "1c1618", "base")
    box((-8.8, 8, 1.6), (0.5, 21, 4.0), "3a2620", "rimL"); box((8.8, 8, 1.6), (0.5, 21, 4.0), "3a2620", "rimR"); box((0, 18.3, 1.6), (18, 0.5, 4.0), "3a2620", "rimB")
    box((0, 15.5, SZ - 0.3), (16, 0.5, 0.5), "8a5a2c", "bridge"); box((0, 2.0, 0.55), (16.6, 0.6, 1.1), "5a3a28", "keyframe")
    NK = 14; kw = 1.1; x0 = -(NK - 1) * kw / 2
    keys, hammers = [], []
    for k in range(NK):
        x = x0 + k * kw
        ky = box((x, -1.2, 1.2), (kw - 0.1, 5.0, 0.5), "fbf8f0", "key", bevel=0.05); keys.append(ky)
        if k % 7 not in (2, 6) and k < NK - 1: box((x + kw / 2, 0.0, 1.62), (0.6, 2.8, 0.5), mat("201a1c", flat=True), "bkey")
        for dx in (-0.16, 0.16): cyl((x + dx, 9.6, SZ), 0.035, 14.0, mat("f0cc50", 1.0), "string", rot=(math.pi / 2, 0, 0), v=6, smooth=False)
        box((x, 16.2, SZ + 0.25), (0.6, 0.7, 0.36), "c0303a", "damper", bevel=0.06)
        sh = box((0, -1.6, 0), (0.16, 3.2, 0.16), "c98a4a", "h_shank"); core = box((0, -3.1, 0.25), (0.42, 0.5, 0.7), "a8562c", "h_core")
        hd = box((0, -3.1, 0.72), (0.72, 0.8, 0.62), "fbf6ea", "h_felt", bevel=0.22)
        piv = group("hammer", [sh, core, hd]); piv.location = (x, 8.2, 0.75); hammers.append(piv)
    box((0, 8.4, 0.5), (16.6, 0.5, 0.9), "8a5a2c", "h_rail")
    def st(f):
        i = f // 7; ph = (f % 7) / 7.0
        for k in range(NK):
            on = i < len(SEQ) and SEQ[i] == k
            dn = (1.0 if ph < 0.6 else 1.0 - (ph - 0.6) / 0.4) if on else 0.0
            keys[k].location.z = 1.2 - 0.24 * dn; keys[k].rotation_euler = (-0.05 * dn, 0, 0)
            hit = math.sin(min(1.0, ph / 0.6) * math.pi) if on and ph < 0.6 else 0.0
            hammers[k].rotation_euler = (-0.30 * hit, 0, 0)        # felt top 1.78 -> touches the strings at 2.5
        t = ease(f / (NF - 1))
        look(vl((-6.5, -9.5, 6.6), (5.0, -9.0, 6.0), t), vl((-1.0, 5.0, 1.4), (1.0, 5.0, 1.4), t), 30)
    return st


# ============================ render ============================
STATE = {"s0": shot_s0, "s1": shot_s1, "s2": shot_s2, "s3": shot_s3, "s4": shot_s4, "s5": shot_s5}[SHOT]()
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"; sc.render.use_persistent_data = True
cp = bpy.context.preferences.addons["cycles"].preferences
for kind in ("OPTIX", "CUDA"):
    try: cp.compute_device_type = kind; cp.get_devices(); break
    except Exception: pass
for d in cp.devices: d.use = d.type != "CPU"
sc.render.resolution_percentage = SCALE; sc.render.image_settings.file_format = "PNG"; sc.render.film_transparent = False
sc.render.use_freestyle = True; sc.render.line_thickness_mode = "ABSOLUTE"; sc.render.line_thickness = max(1.0, 3.2 * SCALE / 100)
vlay = sc.view_layers[0]; vlay.use_freestyle = True; fs = vlay.freestyle_settings; fs.crease_angle = math.radians(120)
ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new("ls")
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("lsty")
ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
LW = (1.4 if SHOT == "s2" else 3.2) * SCALE / 100      # s2: thin lines, far rings must not clog the bright tunnel end
sc.render.line_thickness = max(1.0, LW); ls.linestyle.color = LINE; ls.linestyle.thickness = max(1.0, LW)
os.makedirs(OUT, exist_ok=True)
frames = range(NF) if FRAMES == "all" else [int(v) for v in FRAMES.split(",")]
print("OBJS", len(bpy.data.objects), flush=True)
for f in frames:
    p = f"{OUT}/{SHOT}_f{f:04d}.png"
    if os.path.exists(p): continue
    STATE(f); sc.frame_set(1); sc.render.filepath = p; bpy.ops.render.render(write_still=True); print("FRAME", f, flush=True)
