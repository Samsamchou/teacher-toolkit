# 道具檢查：書桌上放 Nova＋三個 Tripo 道具＋紙條馬路，渲一張看比例與質感
import bpy, sys, math, mathutils
a = sys.argv[sys.argv.index("--") + 1:]
D, out, engine = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = engine
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
if engine == "BLENDER_EEVEE": sc.eevee.taa_render_samples = 32
sc.view_settings.view_transform = "AgX"
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.01, 0.012, 0.03, 1)
def mat(n, c, r=0.5):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r; return m
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.1, -0.02)); d = bpy.context.object; d.scale = (1.6, 0.9, 0.04); d.data.materials.append(mat("wood", (0.25, 0.11, 0.05), 0.35))
# 紙條馬路 / paper-strip road
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.0006)); r = bpy.context.object; r.scale = (0.9, 0.07, 1); r.data.materials.append(mat("paper", (0.16, 0.15, 0.17), 0.8))
for i in range(12):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.42 + i * 0.075, 0, 0.0012)); s = bpy.context.object; s.scale = (0.035, 0.006, 1); s.data.materials.append(mat(f"dash{i}", (0.9, 0.85, 0.7), 0.8))
def place(path, size, loc, rot_z=0, axis="z"):
    bpy.ops.import_scene.gltf(filepath=path); objs = list(bpy.context.selected_objects); bpy.context.view_layer.update()
    mn = mathutils.Vector((1e9,) * 3); mx = mathutils.Vector((-1e9,) * 3)
    for o in objs:
        if o.type == "MESH":
            for v in o.bound_box:
                p = o.matrix_world @ mathutils.Vector(v); mn = mathutils.Vector(map(min, mn, p)); mx = mathutils.Vector(map(max, mx, p))
    dim = (mx - mn); ref = {"z": dim.z, "long": max(dim.x, dim.y)}[axis]; s = size / ref
    root = bpy.data.objects.new("R", None); sc.collection.objects.link(root)
    for o in objs:
        if o.parent is None: o.parent = root
    for o in objs:
        if o.parent == root: o.location -= mathutils.Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    root.scale = (s, s, s); root.location = loc; root.rotation_euler = (0, 0, rot_z); return root
place(f"{D}/nova.glb", 0.12, (0.06, -0.09, 0), math.radians(-15))
place(f"{D}/stop.glb", 0.12, (0.0, -0.06, 0), 0)
place(f"{D}/bus.glb", 0.15, (-0.2, 0.0, 0), math.radians(0), "long")
place(f"{D}/school.glb", 0.15, (0.36, 0.1, 0), math.radians(-20), "long")
bpy.ops.object.light_add(type="SPOT", location=(-0.3, -0.25, 0.5)); L = bpy.context.object; L.data.energy = 60; L.data.color = (1, 0.7, 0.35); L.data.spot_size = math.radians(80); L.rotation_euler = (math.radians(30), math.radians(-25), 0)
bpy.ops.object.light_add(type="AREA", location=(0.4, -0.3, 0.3)); F = bpy.context.object; F.data.energy = 6; F.data.color = (0.5, 0.8, 1); F.data.size = 0.3; F.rotation_euler = (math.radians(55), 0, math.radians(35))
em = bpy.data.materials.new("em"); em.use_nodes = True; nt = em.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"])
e = nt.nodes.new("ShaderNodeEmission"); e.inputs[1].default_value = 6; e.inputs[0].default_value = (1, 0.75, 0.4, 1); nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs[0])
for i in range(16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=(-0.8 + i * 0.1, 1.0, 0.1 + (i * 37 % 7) * 0.04)); bpy.context.object.data.materials.append(em)
bpy.ops.object.camera_add(location=(0.02, -0.75, 0.2)); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 50; cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 4
t = bpy.data.objects.new("T", None); sc.collection.objects.link(t); t.location = (0.04, 0, 0.05)
c = cam.constraints.new("TRACK_TO"); c.target = t; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"; cam.data.dof.focus_object = t
sc.render.filepath = out; bpy.ops.render.render(write_still=True); print("DONE", out)
