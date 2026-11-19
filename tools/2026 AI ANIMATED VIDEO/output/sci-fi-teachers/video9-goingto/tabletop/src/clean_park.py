"""clean_park.py — 2026-11-19 老師：公園的戰鬥機和火車頭藏起來。bld_waterpark.glb 是單一網格，
依俯視圖量出的範圍（匯入後的世界座標，-0.49～0.49）刪掉高於廣場／碎石台的面，另存 bld_waterpark_clean.glb。
  blender -b --factory-startup --python clean_park.py -- in.glb out.glb"""
import bpy, bmesh, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
Z = 0.066   # 廣場約 0.04、碎石台約 0.062；火車頭、戰鬥機、支架都在這之上
BOXES = [(-0.42, -0.16, -0.40, 0.35, "locomotive"),     # 左邊大火車頭
         (-0.18, 0.42, 0.10, 0.50, "jet"),              # 右上戰鬥機（含支架）
         (-0.01, 0.15, -0.31, -0.04, "small train")]    # 中間小火車頭
KEEP = [(0.29, 0.40, 0.39, 0.48)]                       # 右上角花台（在戰鬥機範圍裡，要留）
n_del = 0
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    M = o.matrix_world; bm = bmesh.new(); bm.from_mesh(o.data); kill = []
    for f in bm.faces:
        c = M @ f.calc_center_median()
        if c.z <= Z: continue
        if any(k[0] <= c.x <= k[1] and k[2] <= c.y <= k[3] for k in KEEP): continue
        if any(b[0] <= c.x <= b[1] and b[2] <= c.y <= b[3] for b in BOXES): kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES"); bm.to_mesh(o.data); bm.free(); n_del += len(kill)
bpy.ops.export_scene.gltf(filepath=a[1], export_format="GLB")
print("CLEAN deleted", n_del, "faces", flush=True)
