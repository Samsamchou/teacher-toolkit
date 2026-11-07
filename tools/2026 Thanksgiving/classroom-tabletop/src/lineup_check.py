# 檢查第一批模型：骨架、尺寸，並排一張合照；右邊一組試擺姿勢（揮手）確認骨架能用
# blender -b --factory-startup --python lineup_check.py -- <props_dir> <out.png>
import bpy, sys, math, mathutils, os
A = sys.argv[sys.argv.index("--") + 1:]; D, OUT = A[0], A[1]
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 1920, 820; sc.render.engine = "BLENDER_EEVEE"
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.33, 0.32, 1)
NAMES = ["pilgrim_man", "pilgrim_woman", "pilgrim_child", "wampanoag_man", "wampanoag_woman", "wampanoag_child"]
H = {"man": 0.09, "woman": 0.085, "child": 0.065}

def load(n, x, wave=False):
    bpy.ops.import_scene.gltf(filepath=f"{D}/{n}.glb"); objs = list(bpy.context.selected_objects)
    arm = next((o for o in objs if o.type == "ARMATURE"), None)
    meshes = [o for o in objs if o.type == "MESH"]
    bpy.context.view_layer.update()
    zs = [(o.matrix_world @ mathutils.Vector(v)).z for o in meshes for v in o.bound_box]
    h = max(zs) - min(zs); s = H[n.split("_")[1]] / h
    root = bpy.data.objects.new("root_" + n, None); sc.collection.objects.link(root)
    for o in objs:
        if o.parent is None: o.parent = root
    root.scale = (s, s, s); root.location = (x, 0, -min(zs) * s)
    bones = [b.name for b in arm.data.bones] if arm else []
    print("MODEL", n, "armature" if arm else "NO-ARMATURE", len(bones), "bones; height", round(h, 3), "; sample", bones[:6], flush=True)
    if wave and arm:
        pb = arm.pose.bones
        def rot(name, x=0, y=0, z=0):
            for b in pb:
                if b.name.endswith(name):
                    b.rotation_mode = "XYZ"; b.rotation_euler = (math.radians(x), math.radians(y), math.radians(z)); return b.name
        print("POSE", rot("RightArm", 0, 0, 0), rot("RightArm", -10, 0, 75), rot("RightForeArm", 0, 0, 60), flush=True)
    return root

xs = [-0.33, -0.22, -0.12, 0.0, 0.11, 0.21]
for n, x in zip(NAMES, xs): load(n, x)
load("pilgrim_man", 0.33, wave=True)
bpy.ops.import_scene.gltf(filepath=f"{D}/wetu.glb"); wo = [o for o in bpy.context.selected_objects]
r = bpy.data.objects.new("wetu", None); sc.collection.objects.link(r)
for o in wo:
    if o.parent is None: o.parent = r
bpy.context.view_layer.update()
xs_ = [(o.matrix_world @ mathutils.Vector(v)) for o in wo if o.type == "MESH" for v in o.bound_box]
wd = max(p.x for p in xs_) - min(p.x for p in xs_); s = 0.13 / wd; r.scale = (s, s, s); r.location = (0.48, 0.05, -min(p.z for p in xs_) * s)
bpy.ops.mesh.primitive_plane_add(size=3); bpy.context.object.location.z = 0
bpy.ops.object.light_add(type="SUN"); bpy.context.object.data.energy = 3; bpy.context.object.rotation_euler = (math.radians(50), 0, math.radians(30))
cd = bpy.data.cameras.new("c"); cd.lens = 35; c = bpy.data.objects.new("c", cd); sc.collection.objects.link(c)
c.location = (0.08, -0.85, 0.12); c.rotation_euler = (math.radians(85), 0, 0); sc.camera = c
sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)
