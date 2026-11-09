"""在 Colab 用 Blender 把超過 15 萬面的 GLB 一次簡化到約 12 萬面，另存 <name>.glb（2026-11-09：每格重算 Decimate 太慢）。
  blender -b --factory-startup --python predecimate.py -- in.glb out.glb"""
import bpy, sys
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
tot0 = tot1 = 0
for o in list(bpy.data.objects):
    if o.type != "MESH": continue
    n = len(o.data.polygons); tot0 += n
    if n > 150000:
        bpy.context.view_layer.objects.active = o
        d = o.modifiers.new("dec", "DECIMATE"); d.ratio = 120000 / n
        bpy.ops.object.modifier_apply(modifier="dec")
    tot1 += len(o.data.polygons)
bpy.ops.export_scene.gltf(filepath=a[1], export_format="GLB")
print("DEC", a[0], tot0, "->", tot1, flush=True)
