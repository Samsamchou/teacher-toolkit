"""b3d_cassia.py — 3D-B「二水花旗木鐵道」程式小模型（Colab G4 Blender 5.2，Cycles＋Freestyle 細描邊）。

依彰化旅遊資訊網〈二水花旗木〉2025 照片的配置（由北到南／畫面上到下）：
  集集線（一條，S 型彎）→ 綠色鐵欄杆 → 二水自行車道（比軌道略高）→ 一排花旗木（約 60 株，源泉車站往東到源泉派出所約 500 m）
  → 152 縣道。西端源泉車站（月臺＋小候車室），東端源泉派出所。長度依比例壓縮、寬度放大（教學示意）。
用法：blender -b --factory-startup --python b3d_cassia.py -- <outdir> <shot A|B|check> <samples> <pct>
  shot=check：只渲 4 張檢查圖（A 首、A 尾、B 中、B 尾）。輸出 <outdir>/<shot>_f####.png 與 labels_<shot>.json（標籤 2D 位置）。
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index("--") + 1:]
OUT, SHOT, SAMPLES, PCT = argv[0], argv[1], int(argv[2]), int(argv[3])
os.makedirs(OUT, exist_ok=True)
FA, FB = 252, 236          # 第 19 句、第 20 句鏡頭格數（30 fps）

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, PCT
sc.render.fps = 30
pr = bpy.context.preferences.addons["cycles"].preferences
for typ in ("OPTIX", "CUDA"):
    try:
        pr.compute_device_type = typ; pr.get_devices()
        gpus = [d for d in pr.devices if d.type == typ]
        if not gpus: continue
        if typ == "OPTIX" and not any(k in d.name for k in ("RTX", "Blackwell", "PRO", "L4", "T4")): continue   # A100/H100 沒有 RT 核心 → 用 CUDA
        for d in pr.devices: d.use = d.type == typ
        sc.cycles.device = "GPU"; print("DEVICE", typ, [d.name for d in gpus], flush=True); break
    except Exception as e:
        print("GPU setup failed", typ, e)
sc.cycles.denoiser = "OPENIMAGEDENOISE"; sc.cycles.max_bounces = 4; sc.cycles.transparent_max_bounces = 2
sc.render.use_freestyle = False
sc.view_settings.view_transform = "Standard"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.68, 1.0, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.8


def mat(name, rgb, rough=.8):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF"); b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    return m


def obj_from_bm(name, bm, m):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.data.materials.append(m); return o


# ---- S 型中心線（x：西→東） ----
N = 160
def cx(t): return lerp(-110, 110, t)
def lerp(a, b, k): return a + (b - a) * k
def cy(t): return 18 * math.sin((t - .1) * math.pi * 1.6)
P = [Vector((cx(i / N), cy(i / N), 0)) for i in range(N + 1)]
def nrm(i):
    a, b = P[max(0, i - 1)], P[min(N, i + 1)]; d = (b - a).normalized(); return Vector((-d.y, d.x, 0))   # 左手邊＝北


def strip(name, off, width, z, m, t0=0, t1=1, thick=0):
    bm = bmesh.new(); vs = []
    for i in range(int(t0 * N), int(t1 * N) + 1):
        n = nrm(i); c = P[i] + n * off
        vs.append((bm.verts.new(c + n * width / 2 + Vector((0, 0, z))), bm.verts.new(c - n * width / 2 + Vector((0, 0, z)))))
    for (a, b), (c, d) in zip(vs, vs[1:]): bm.faces.new((a, b, d, c))
    o = obj_from_bm(name, bm, m)
    if thick:
        s = o.modifiers.new("s", "SOLIDIFY"); s.thickness = thick
    return o


G = mat("ground", (.20, .42, .12)); FIELD = mat("field", (.18, .55, .10))
bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, -.05)); g = bpy.context.object; g.data.materials.append(G)
# 北側稻田（幾塊亮綠）
for k in range(6):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-100 + k * 40, 52, 0)); f = bpy.context.object; f.scale = (34, 22, 1); f.data.materials.append(FIELD)
# 道床、軌道（一條）、枕木
strip("ballast", 0, 6, .05, mat("ballast", (.42, .39, .36)), thick=.3)
for side in (-.9, .9): strip("rail%d" % (side > 0), side, .25, .45, mat("rail", (.45, .32, .22), .4), thick=.2)
SL = mat("sleeper", (.35, .25, .18))
for i in range(0, N + 1, 1):
    n = nrm(i); c = P[i]
    bpy.ops.mesh.primitive_cube_add(size=1, location=(c.x, c.y, .3)); s = bpy.context.object
    s.scale = (.5, 3.0, .15); s.rotation_euler.z = math.atan2(-n.x, n.y); s.data.materials.append(SL)
# 欄杆（深綠，柱＋兩條橫桿）
RG = mat("railing", (.08, .30, .16), .5)
for zz in (1.1, 1.7): strip("rail_bar%.1f" % zz, -5.0, .18, zz, RG, thick=.18)
for i in range(0, N + 1, 3):
    c = P[i] + nrm(i) * -5.0; bpy.ops.mesh.primitive_cube_add(size=1, location=(c.x, c.y, .95)); p = bpy.context.object; p.scale = (.25, .25, 1.9); p.data.materials.append(RG)
# 自行車道（比軌道高一點）、路緣
strip("bikepath", -8.5, 6, .6, mat("path", (.40, .40, .43)), thick=.6)
# 152 縣道（黃線）
strip("road", -20, 10, .1, mat("road", (.22, .22, .24)), thick=.1)
strip("roadline", -20, .4, .22, mat("yellow", (.95, .78, .1)))
# 花旗木：源泉車站往東到派出所（t=.22～.80），一排約 30 株（示意）
TRK = mat("trunk", (.38, .26, .17)); PK1 = mat("pink1", (.95, .38, .58)); PK2 = mat("pink2", (.98, .62, .76)); LF = mat("leaf", (.22, .45, .12))
LAMP = mat("lamp", (.95, .95, .95), .3)
trees = []
for k in range(30):
    t = .22 + k * (.58 / 29); i = int(t * N); c = P[i] + nrm(i) * -14.8
    bpy.ops.mesh.primitive_cylinder_add(radius=.32, depth=4.6, location=(c.x, c.y, 2.3)); bpy.context.object.data.materials.append(TRK)
    for j, (dx, dy, dz, r, m) in enumerate([(0, 0, 5.8, 2.3, PK1), (1.3, 1.0, 5.3, 1.7, PK2), (-1.2, .8, 5.5, 1.8, PK2), (.2, -1.3, 5.1, 1.6, PK1), (.5, 1.8, 6.2, 1.3, LF)]):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(c.x + dx, c.y + dy, dz)); o = bpy.context.object; o.data.materials.append(m)
        o.scale.z = .8
    trees.append(c.copy())
    if k % 4 == 2:
        l = P[i] + nrm(i) * -12.0; bpy.ops.mesh.primitive_cylinder_add(radius=.15, depth=6, location=(l.x, l.y, 3.6)); bpy.context.object.data.materials.append(LAMP)
# 源泉車站（西端）：月臺＋小候車室（洗石子灰牆、紅磚底、灰瓦四坡頂）
i0 = int(.13 * N); st = P[i0] + nrm(i0) * 4.5
bpy.ops.mesh.primitive_cube_add(size=1, location=(st.x, st.y, .55)); pf = bpy.context.object; pf.scale = (26, 3.6, 1.1); pf.data.materials.append(mat("platform", (.78, .77, .74)))
bpy.ops.mesh.primitive_cube_add(size=1, location=(st.x - 3, st.y + .3, 2.6)); hut = bpy.context.object; hut.scale = (4.6, 3.0, 3.0); hut.data.materials.append(mat("washstone", (.72, .71, .69)))
bpy.ops.mesh.primitive_cube_add(size=1, location=(st.x - 3, st.y + .3, 1.5)); b = bpy.context.object; b.scale = (4.7, 3.1, .9); b.data.materials.append(mat("brick", (.62, .25, .18)))
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=4.4, radius2=.3, depth=2.0, location=(st.x - 3, st.y + .3, 5.1)); r = bpy.context.object; r.rotation_euler.z = math.pi / 4; r.scale = (1.15, .8, 1); r.data.materials.append(mat("rooftile", (.35, .37, .40)))
# 源泉派出所（東端，縣道旁）
i1 = int(.84 * N); po = P[i1] + nrm(i1) * -27
bpy.ops.mesh.primitive_cube_add(size=1, location=(po.x, po.y, 3)); pb = bpy.context.object; pb.scale = (10, 7, 6); pb.data.materials.append(mat("police", (.93, .93, .95)))
bpy.ops.mesh.primitive_cube_add(size=1, location=(po.x, po.y - 3.55, 4.6)); bb = bpy.context.object; bb.scale = (8, .2, 1.1); bb.data.materials.append(mat("policeblue", (.15, .32, .70)))
# 遠山（北方岩壁的示意）
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=60, location=(20, 210, -10)); h = bpy.context.object; h.scale = (2.6, 1, .9); h.data.materials.append(mat("hill", (.25, .45, .22)))
# 光
bpy.ops.object.light_add(type="SUN", rotation=(math.radians(40), math.radians(10), math.radians(35))); bpy.context.object.data.energy = 4.0; bpy.context.object.data.angle = math.radians(3)

# ---- 鏡頭 ----
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 30; cam.data.clip_end = 2000
bpy.ops.object.empty_add(location=(0, 0, 0)); tgt = bpy.context.object
tc = cam.constraints.new("TRACK_TO"); tc.target = tgt; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
pA0, pA1 = Vector((-15, -95, 190)), Vector((10, -120, 150))     # A：高空俯看整段，慢慢推近
lA0, lA1 = Vector((0, -2, 0)), Vector((5, -4, 0))
s0 = P[int(.22 * N)] + nrm(int(.22 * N)) * -8.5
s1 = P[int(.42 * N)] + nrm(int(.42 * N)) * -8.5
s0 = P[int(.22 * N)] + nrm(int(.22 * N)) * -7.0; s1 = P[int(.42 * N)] + nrm(int(.42 * N)) * -8.0
pB0, pB2 = Vector((-40, -110, 90)), s0 + Vector((0, 0, 3.2))   # B：從空中降到自行車道高度
def ease(k): return k * k * (3 - 2 * k)
def cam_at(f):
    if SHOT == "A" or (SHOT == "check" and f <= FA):
        k = ease((f - 1) / (FA - 1)); return pA0.lerp(pA1, k), lA0.lerp(lA1, k)
    f = f - FA; k = (f - 1) / (FB - 1)
    if k < .55:
        e = ease(k / .55); pos = pB0.lerp(pB2, e); look = Vector((0, 0, 0)).lerp(s1 + Vector((0, 0, 2.5)), e)
    else:
        e = ease((k - .55) / .45); pos = pB2.lerp(s0.lerp(s1, .35) + Vector((0, 0, 3.2)), e); look = s1 + Vector((0, 0, 2.5))
    return pos, look

LBL = {"源泉車站": st + Vector((-3, 0, 7)), "源泉派出所": po + Vector((0, 0, 8)), "集集線": P[int(.5 * N)] + Vector((0, 0, 1)),
       "自行車道": P[int(.36 * N)] + nrm(int(.36 * N)) * -8.5 + Vector((0, 0, 1)), "花旗木": trees[15] + Vector((0, 0, 8)),
       "欄杆": P[int(.3 * N)] + nrm(int(.3 * N)) * -5 + Vector((0, 0, 2))}
frames = {"A": range(1, FA + 1), "B": range(FA + 1, FA + FB + 1), "check": [1, FA, FA + int(FB * .55), FA + FB]}[SHOT]
labels = {}
for f in frames:
    pos, look = cam_at(f); cam.location = pos; tgt.location = look
    bpy.context.view_layer.update()
    labels[f] = {k: [round(v.x, 4), round(1 - v.y, 4), round(v.z, 2)] for k, v0 in LBL.items() for v in [world_to_camera_view(sc, cam, v0)]}
    sc.render.filepath = os.path.join(OUT, "%s_f%04d.png" % (SHOT, f))
    bpy.ops.render.render(write_still=True); print("FRAME", f, flush=True)
json.dump(labels, open(os.path.join(OUT, "labels_%s.json" % SHOT), "w"), ensure_ascii=False)
print("DONE", SHOT)
