extends Node3D
## 檢查水鈴、圳寶（和 Ken）的雙手：靜止姿勢特寫＋手指彎曲 60° 特寫，並統計手指骨頭有沒有綁到網格
## 執行：Godot --path . res://scenes/mascot_hands_check.tscn  → test_hands/<角色>_<L|R>_<rest|curl>.png

const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")

func _ready() -> void:
	var w := World.new()
	w._materials()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.86, 0.9, 0.95)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.95, 0.95, 1.0)
	e.ambient_light_energy = 1.2
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(2, 6, 6), Vector3.ZERO, Vector3.UP)
	var cam := Camera3D.new()
	cam.fov = 30
	cam.near = 0.01
	add_child(cam)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://test_hands"))
	for ch in ["shuiling_rigged", "zunbo_rigged"]:
		var h: Node3D = w.fit_model(ch, 1.3, false)
		add_child(h)
		var ap: AnimationPlayer = Retarget.find_type(h, "AnimationPlayer")
		if ap:
			ap.stop()
			ap.active = false
		var sk: Skeleton3D = Retarget.find_type(h, "Skeleton3D")
		sk.reset_bone_poses()
		# 統計每根骨頭有多少頂點（權重 > 0.3）
		var cnt := {}
		for mi in h.find_children("*", "MeshInstance3D", true, false):
			var mesh: Mesh = (mi as MeshInstance3D).mesh
			var skin: Skin = (mi as MeshInstance3D).skin
			for si in mesh.get_surface_count():
				var arr := mesh.surface_get_arrays(si)
				var bones: PackedInt32Array = arr[Mesh.ARRAY_BONES]
				var wts: PackedFloat32Array = arr[Mesh.ARRAY_WEIGHTS]
				if bones.is_empty():
					continue
				var per := bones.size() / (arr[Mesh.ARRAY_VERTEX] as PackedVector3Array).size()
				for i in bones.size():
					if wts[i] > 0.3:
						var bn := skin.get_bind_name(bones[i]) if skin and skin.get_bind_name(bones[i]) != &"" else StringName(sk.get_bone_name(skin.get_bind_bone(bones[i]) if skin else bones[i]))
						cnt[bn] = cnt.get(bn, 0) + 1
		var fingers := {"L": 0, "R": 0}
		var names := []
		for b in sk.get_bone_count():
			var nm := sk.get_bone_name(b)
			for side in ["Left", "Right"]:
				if nm.contains(side + "Hand") and nm != "mixamorig_%sHand" % side and nm != "mixamorig:%sHand" % side:
					fingers[side[0]] += int(cnt.get(StringName(nm), 0))
					names.append("%s=%d" % [nm.replace("mixamorig_", "").replace("mixamorig:", ""), cnt.get(StringName(nm), 0)])
		print(ch, " bones=", sk.get_bone_count(), " finger-weighted verts L=", fingers["L"], " R=", fingers["R"])
		print("  ", " ".join(names))
		await _shot_full(cam, h, ch + "_full")
		for side in ["Left", "Right"]:
			var hb := _bone(sk, side + "Hand")
			var mb := _bone(sk, side + "HandMiddle1")
			for mode in ["rest", "curl"]:
				sk.reset_bone_poses()
				if mode == "curl":
					for b in sk.get_bone_count():
						var nm := sk.get_bone_name(b)
						if nm.contains(side + "Hand") and b != hb and not nm.contains("Thumb"):
							# 以「手掌法線×骨頭方向」當彎曲軸：先試本地 X 軸
							var q := sk.get_bone_pose_rotation(b) * Quaternion(Vector3(1, 0, 0), deg_to_rad(60))
							sk.set_bone_pose_rotation(b, q)
				await get_tree().process_frame
				var p: Vector3 = (sk.global_transform * sk.get_bone_global_pose(mb if mb >= 0 else hb)).origin
				var out := Vector3(1 if side == "Left" else -1, 0.25, 0.9).normalized()
				cam.look_at_from_position(p + out * 0.55, p, Vector3.UP)
				await _shot("%s_%s_%s" % [ch, side[0], mode])
		h.queue_free()
	get_tree().quit()

func _bone(sk: Skeleton3D, key: String) -> int:
	for b in sk.get_bone_count():
		var nm := sk.get_bone_name(b)
		if nm.ends_with(key):
			return b
	return -1

func _shot_full(cam: Camera3D, h: Node3D, nm: String) -> void:
	cam.look_at_from_position(Vector3(0, 0.75, 3.2), Vector3(0, 0.65, 0), Vector3.UP)
	await _shot(nm)

func _shot(nm: String) -> void:
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test_hands/%s.png" % nm)
