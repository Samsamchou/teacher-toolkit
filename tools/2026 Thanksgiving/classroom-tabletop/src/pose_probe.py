# 試骨架方向：同一個人物擺 8 種旋轉，各渲一張，拼成總表看哪個軸是什麼動作
# blender -b --factory-startup --python pose_probe.py -- <props_dir> <out_dir>
import bpy, sys, math, mathutils, os
A = sys.argv[sys.argv.index("--") + 1:]; D, OUT = A[0], A[1]; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 480, 600; sc.render.engine = "BLENDER_EEVEE"
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.4, 0.4, 0.42, 1)
bpy.ops.import_scene.gltf(filepath=f"{D}/pilgrim_man.glb")
arm = next(o for o in bpy.context.selected_objects if o.type == "ARMATURE")
bpy.ops.object.light_add(type="SUN"); bpy.context.object.data.energy = 3; bpy.context.object.rotation_euler = (math.radians(40), 0, math.radians(20))
cd = bpy.data.cameras.new("c"); cd.lens = 120; c = bpy.data.objects.new("c", cd); sc.collection.objects.link(c)
c.location = (0, -3.2, 0.5); c.rotation_euler = (math.radians(90), 0, 0); sc.camera = c
pb = {b.name.split(":")[-1]: b for b in arm.pose.bones}
for b in pb.values(): b.rotation_mode = "XYZ"
TESTS = {
 "a_LArm_z+60": {"LeftArm": (0, 0, 60)}, "b_LArm_z-60": {"LeftArm": (0, 0, -60)}, "c_LArm_x+60": {"LeftArm": (60, 0, 0)},
 "d_RArm_z-110": {"RightArm": (0, 0, -110)}, "e_wave_Fz-50": {"RightArm": (0, 0, -110), "RightForeArm": (0, 0, -50)},
 "f_wave_Fz+50": {"RightArm": (0, 0, -110), "RightForeArm": (0, 0, 50)}, "g_Head_z+20": {"Head": (0, 0, 20)},
 "h_RUpLeg_x-30": {"RightUpLeg": (-30, 0, 0)}, "i_down_R+45_L-45": {"RightArm": (0, 0, 45), "LeftArm": (0, 0, -45)},
 "j_down_R+45_L+45": {"RightArm": (0, 0, 45), "LeftArm": (0, 0, 45)}, "k_Spine_z+20": {"Spine": (0, 0, 20)},
 "l_chest": {"RightArm": (70, 0, 30), "RightForeArm": (60, 0, 0)},
}
for name, rots in TESTS.items():
    for b in pb.values(): b.rotation_euler = (0, 0, 0)
    for bn, (x, y, z) in rots.items(): pb[bn].rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
    bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)
