# check that each GLB loads and report armature bone count / size
import bpy, sys, mathutils
A = sys.argv[sys.argv.index("--") + 1:]
for path in A:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path); objs = list(bpy.context.selected_objects)
    arm = [o for o in objs if o.type == "ARMATURE"]; ms = [o for o in objs if o.type == "MESH"]
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ mathutils.Vector(v) for o in ms for v in o.bound_box]
    dim = [round(max(p[i] for p in pts) - min(p[i] for p in pts), 3) for i in range(3)]
    print("GLB", path.split("/")[-1], "bones", len(arm[0].data.bones) if arm else 0, "dim", dim, flush=True)
