extends Node3D
## 新 Tripo 模型快速檢查（圳寶媽媽綁骨、機車）：骨架名稱、手指權重、機車網格分塊；輸出截圖
## 執行：Godot --path . res://scenes/new_models_check.tscn -- <out_dir>
## 用 GLTFDocument 直接讀檔（不需先匯入）。

const MOM := "res://assets/models/zunbo_mom_rigged.glb"
const SCOOTER := "res://assets/models/scooter_A.glb"
var out_dir := "user://"

func _load(path: String) -> Node3D:
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	var err := doc.append_from_file(ProjectSettings.globalize_path(path), st)
	if err != OK:
		print("LOAD FAIL ", path, " err=", err)
		return null
	return doc.generate_scene(st) as Node3D

func _find(n: Node, cls: String) -> Node:
	if n.is_class(cls):
		return n
	for c in n.get_children():
		var r := _find(c, cls)
		if r:
			return r
	return null

func _aabb(n: Node3D) -> AABB:
	var bb := AABB()
	var first := true
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		var b: AABB = m.global_transform * m.get_aabb()
		bb = b if first else bb.merge(b)
		first = false
	return bb

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		out_dir = args[0]
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.86, 0.9, 0.95)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.95, 0.95, 1.0)
	e.ambient_light_energy = 1.0
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(2, 6, 6), Vector3.ZERO, Vector3.UP)
	var cam := Camera3D.new()
	cam.fov = 30
	cam.near = 0.005
	add_child(cam)
	await _check_mom(cam)
	await _check_scooter(cam)
	get_tree().quit()

func _check_mom(cam: Camera3D) -> void:
	var h := _load(MOM)
	if h == null:
		return
	add_child(h)
	var ap: AnimationPlayer = _find(h, "AnimationPlayer")
	if ap:
		print("MOM animations: ", ap.get_animation_list())
		ap.stop()
		ap.active = false
	var sk: Skeleton3D = _find(h, "Skeleton3D")
	if sk == null:
		print("MOM: NO Skeleton3D")
		h.queue_free()
		return
	sk.reset_bone_poses()
	var names := []
	var nmix := 0
	for b in sk.get_bone_count():
		names.append(sk.get_bone_name(b))
		if sk.get_bone_name(b).begins_with("mixamorig"):
			nmix += 1
	print("MOM Skeleton3D bones=", sk.get_bone_count(), " mixamorig*=", nmix)
	print("MOM bone names: ", ", ".join(names))
	# 每根骨頭綁到的頂點數（權重 > 0.3）
	var cnt := {}
	var nmesh := 0
	for mi in h.find_children("*", "MeshInstance3D", true, false):
		nmesh += 1
		var mesh: Mesh = (mi as MeshInstance3D).mesh
		var skin: Skin = (mi as MeshInstance3D).skin
		for si in mesh.get_surface_count():
			var arr := mesh.surface_get_arrays(si)
			var bones: PackedInt32Array = arr[Mesh.ARRAY_BONES]
			var wts: PackedFloat32Array = arr[Mesh.ARRAY_WEIGHTS]
			if bones.is_empty():
				continue
			for i in bones.size():
				if wts[i] > 0.3:
					var bi := bones[i]
					var bn: String
					if skin:
						bn = String(skin.get_bind_name(bi)) if skin.get_bind_name(bi) != &"" else sk.get_bone_name(skin.get_bind_bone(bi))
					else:
						bn = sk.get_bone_name(bi)
					cnt[bn] = cnt.get(bn, 0) + 1
	print("MOM meshes=", nmesh)
	for side in ["Left", "Right"]:
		var tot := 0
		var parts := []
		for b in sk.get_bone_count():
			var nm := sk.get_bone_name(b)
			if nm.contains(side + "Hand") and not nm.ends_with(side + "Hand"):
				tot += int(cnt.get(nm, 0))
				parts.append("%s=%d" % [nm.replace("mixamorig_", "").replace("mixamorig:", "").replace("mixamorig", ""), cnt.get(nm, 0)])
		var hand_nm := ""
		for b in sk.get_bone_count():
			if sk.get_bone_name(b).ends_with(side + "Hand"):
				hand_nm = sk.get_bone_name(b)
		print("MOM %s finger-weighted verts=%d  hand=%d" % [side, tot, cnt.get(hand_nm, 0)])
		print("   ", " ".join(parts))
	var bb := _aabb(h)
	print("MOM aabb=", bb)
	var c := bb.get_center()
	var d := maxf(bb.size.y, bb.size.x) * 2.3
	cam.look_at_from_position(c + Vector3(0, 0, d), c, Vector3.UP)
	await _shot("mom_front")
	cam.look_at_from_position(c + Vector3(d * 0.7, 0, d * 0.7), c, Vector3.UP)
	await _shot("mom_side")
	for side in ["Left", "Right"]:
		var hb := _bone(sk, side + "Hand")
		var mb := _bone(sk, side + "HandMiddle1")
		for mode in ["rest", "curl"]:
			sk.reset_bone_poses()
			if mode == "curl":
				for b in sk.get_bone_count():
					var nm := sk.get_bone_name(b)
					if nm.contains(side + "Hand") and b != hb and not nm.contains("Thumb"):
						sk.set_bone_pose_rotation(b, sk.get_bone_pose_rotation(b) * Quaternion(Vector3(1, 0, 0), deg_to_rad(60)))
			await get_tree().process_frame
			var p: Vector3 = (sk.global_transform * sk.get_bone_global_pose(mb if mb >= 0 else hb)).origin
			var out := Vector3(1 if side == "Left" else -1, 0.25, 0.9).normalized()
			cam.look_at_from_position(p + out * bb.size.y * 0.3, p, Vector3.UP)
			await _shot("mom_%s_%s" % [side[0], mode])
	h.queue_free()
	await get_tree().process_frame

func _check_scooter(cam: Camera3D) -> void:
	var h := _load(SCOOTER)
	if h == null:
		return
	add_child(h)
	var meshes := h.find_children("*", "MeshInstance3D", true, false)
	print("SCOOTER MeshInstance3D count=", meshes.size())
	for mi in meshes:
		var m := mi as MeshInstance3D
		var nv := 0
		for si in m.mesh.get_surface_count():
			nv += (m.mesh.surface_get_arrays(si)[Mesh.ARRAY_VERTEX] as PackedVector3Array).size()
		print("  mesh '", m.name, "' surfaces=", m.mesh.get_surface_count(), " verts=", nv, " aabb=", m.global_transform * m.get_aabb())
	var bb := _aabb(h)
	print("SCOOTER aabb=", bb)
	var c := bb.get_center()
	var d := maxf(bb.size.x, maxf(bb.size.y, bb.size.z)) * 2.2
	for v in [["scooter_side", Vector3(1, 0.15, 0)], ["scooter_34", Vector3(0.7, 0.3, 0.7)], ["scooter_front", Vector3(0, 0.15, 1)]]:
		cam.look_at_from_position(c + (v[1] as Vector3).normalized() * d, c, Vector3.UP)
		await _shot(v[0])
	h.queue_free()

func _bone(sk: Skeleton3D, key: String) -> int:
	for b in sk.get_bone_count():
		if sk.get_bone_name(b).ends_with(key):
			return b
	return -1

func _shot(nm: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out_dir.path_join(nm + ".png"))
