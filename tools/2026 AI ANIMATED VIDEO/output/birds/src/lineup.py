import bpy, sys, math, mathutils
a = sys.argv[sys.argv.index("--") + 1:]; D, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE"; sc.eevee.taa_render_samples = 8
sc.render.resolution_x, sc.render.resolution_y = 2400, 700
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.9, 0.92, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
names = ["M1","M2","M3","D7A","D7B","D7C","D7D","D13A","D13B","D13C","D13D","A30","C1","WINGS","BIRD"]
H = {"M1":1.7,"M2":1.7,"M3":1.2,"D7A":1.2,"D7B":1.2,"D7C":1.2,"D7D":0.7,"D13A":1.55,"D13B":1.3,"D13C":1.1,"D13D":1.55,"A30":1.65,"C1":1.0,"WINGS":1.0,"BIRD":0.8}
x = 0
for n in names:
    bpy.ops.import_scene.gltf(filepath=f"{D}/{n}.glb"); objs = list(bpy.context.selected_objects); bpy.context.view_layer.update()
    mn = mathutils.Vector((1e9,)*3); mx = mathutils.Vector((-1e9,)*3)
    for o in objs:
        if o.type == "MESH":
            for v in o.bound_box:
                p = o.matrix_world @ mathutils.Vector(v); mn = mathutils.Vector(map(min, mn, p)); mx = mathutils.Vector(map(max, mx, p))
    s = H[n] / max(1e-6, mx.z - mn.z); r = bpy.data.objects.new(n, None); sc.collection.objects.link(r)
    for o in objs:
        if o.parent is None: o.parent = r
    for o in objs:
        if o.parent == r: o.location -= mathutils.Vector(((mn.x+mx.x)/2, (mn.y+mx.y)/2, mn.z))
    r.scale = (s, s, s); wdt = (mx.x - mn.x) * s; r.location = (x + wdt/2, 0, 0); x += wdt + 0.25
    bpy.ops.object.text_add(location=(x - wdt/2 - 0.25, -0.3, -0.25)); t = bpy.context.object; t.data.body = n; t.data.size = 0.18; t.data.align_x = "CENTER"; t.rotation_euler = (math.radians(90), 0, 0)
bpy.ops.object.light_add(type="SUN", location=(0, -5, 5)); bpy.context.object.data.energy = 3; bpy.context.object.rotation_euler = (math.radians(50), 0, math.radians(-10))
bpy.ops.object.camera_add(location=(x/2, -9, 0.8)); cam = bpy.context.object; sc.camera = cam; cam.rotation_euler = (math.radians(88), 0, 0)
cam.data.type = "ORTHO"; cam.data.ortho_scale = x + 0.4
sc.render.resolution_y = int(2400 * 2.3 / (x + 0.4)); sc.render.filepath = out; bpy.ops.render.render(write_still=True); print("DONE")
