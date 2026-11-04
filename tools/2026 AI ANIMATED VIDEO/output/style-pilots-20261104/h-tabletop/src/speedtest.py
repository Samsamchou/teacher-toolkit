# Blender 速度測試：書桌＋檯燈＋Nova（Tripo GLB）＋淺景深，1080p EEVEE 一格
import bpy, sys, time, math
argv = sys.argv[sys.argv.index("--") + 1:]
glb, out, engine, samples = argv[0], argv[1], argv[2], int(argv[3])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = engine
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
if engine == "BLENDER_EEVEE":
    sc.eevee.taa_render_samples = samples
else:
    sc.cycles.samples = samples; sc.cycles.device = "GPU"
    pr = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            pr.compute_device_type = kind; pr.get_devices(); break
        except Exception: pass
    for d in pr.devices: d.use = d.type != "CPU"
    print("CYCLES_DEVICES", pr.compute_device_type, [(d.name, d.use) for d in pr.devices])
sc.view_settings.view_transform = "AgX"
# 世界：深藍夜色 / world
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.01, 0.012, 0.03, 1)
def mat(name, col, rough=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough
    return m
# 書桌 / desk
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.02)); d = bpy.context.object; d.scale = (1.6, 0.8, 0.04)
d.data.materials.append(mat("wood", (0.25, 0.11, 0.05), 0.35))
# 書 / books
for i, (x, c) in enumerate([(-0.25, (0.1, 0.2, 0.5)), (-0.23, (0.6, 0.5, 0.2))]):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0.1, 0.012 + i * 0.024)); b = bpy.context.object; b.scale = (0.2, 0.14, 0.022); b.data.materials.append(mat(f"b{i}", c))
# 紅色玩具公車（暫代）/ placeholder red bus
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.12, 0.02, 0.03)); bus = bpy.context.object; bus.scale = (0.16, 0.06, 0.06)
bpy.ops.object.modifier_add(type="BEVEL"); bus.modifiers[0].width = 0.008; bus.modifiers[0].segments = 3
bus.data.materials.append(mat("red", (0.8, 0.06, 0.04), 0.3))
# Nova
bpy.ops.import_scene.gltf(filepath=glb)
objs = [o for o in bpy.context.selected_objects]
import mathutils
mn = mathutils.Vector((1e9,) * 3); mx = mathutils.Vector((-1e9,) * 3)
bpy.context.view_layer.update()
for o in objs:
    if o.type == "MESH":
        for v in o.bound_box:
            p = o.matrix_world @ mathutils.Vector(v); mn = mathutils.Vector(map(min, mn, p)); mx = mathutils.Vector(map(max, mx, p))
h = mx.z - mn.z; s = 0.12 / h
root = bpy.data.objects.new("NovaRoot", None); sc.collection.objects.link(root)
for o in objs:
    if o.parent is None: o.parent = root
root.scale = (s, s, s); root.location = (-0.05 - (mn.x + mx.x) / 2 * s, 0.0 - (mn.y + mx.y) / 2 * s, -mn.z * s)
# 檯燈（暖色聚光）＋窗外散景 / desk lamp + window bokeh
bpy.ops.object.light_add(type="SPOT", location=(-0.25, -0.15, 0.45)); L = bpy.context.object; L.data.energy = 40; L.data.color = (1, 0.7, 0.35); L.data.spot_size = math.radians(70)
L.rotation_euler = (math.radians(25), math.radians(-25), 0)
bpy.ops.object.light_add(type="AREA", location=(0.3, -0.2, 0.25)); F = bpy.context.object; F.data.energy = 4; F.data.color = (0.5, 0.8, 1); F.data.size = 0.2
F.rotation_euler = (math.radians(60), 0, math.radians(30))
em = bpy.data.materials.new("em"); em.use_nodes = True; nt = em.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"])
e = nt.nodes.new("ShaderNodeEmission"); e.inputs[1].default_value = 6; e.inputs[0].default_value = (1, 0.75, 0.4, 1)
nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs[0])
for i in range(14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=(-0.6 + i * 0.09, 0.9, 0.12 + (i * 37 % 7) * 0.035)); bpy.context.object.data.materials.append(em)
# 相機：微距淺景深 / macro camera with shallow DOF
bpy.ops.object.camera_add(location=(0.05, -0.55, 0.11)); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 85; cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 2.8
tgt = bpy.data.objects.new("T", None); sc.collection.objects.link(tgt); tgt.location = (-0.03, 0, 0.06)
c = cam.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"; cam.data.dof.focus_object = tgt
sc.render.filepath = out
for k in range(3):
    t0 = time.time(); bpy.ops.render.render(write_still=True); print(f"RENDER_SECONDS {engine} {samples} frame{k} {time.time() - t0:.1f}")
