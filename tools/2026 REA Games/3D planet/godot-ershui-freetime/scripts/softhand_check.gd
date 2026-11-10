extends Node3D
## 水鈴原手 vs 軟手（make_softhand.py）對照特寫 → test_hands/softhand_<模型>_<角度>.png
## 執行：Godot --path . res://scenes/softhand_check.tscn

const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")
const Pose := preload("res://scripts/procedural_pose.gd")

func _ready() -> void:
	var w := World.new()
	w._materials()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.93, 0.96, 0.99)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1.0, 0.95, 0.88)
	e.ambient_light_energy = 0.75
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(1, 6, 7), Vector3.ZERO, Vector3.UP)
	sun.light_energy = 0.8
	var cam := Camera3D.new()
	cam.near = 0.01
	add_child(cam)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://test_hands"))
	for mname in ["shuiling_rigged", "shuiling_softhand"]:
		var h: Node3D = w.fit_model(mname, 1.2, true, 0.3)
		add_child(h)
		var ap: AnimationPlayer = Retarget.find_type(h, "AnimationPlayer")
		if ap:
			ap.stop()
			ap.active = false
		var sk: Skeleton3D = Retarget.find_type(h, "Skeleton3D")
		Pose.thin_hand_outline(h, 0.15 if mname.ends_with("softhand") else 0.25)
		var rt := Retarget.new()
		rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_sitting_idle.fbx"), self)
		rt.bind(sk)
		Pose.pose_stand(sk, rt.corr)
		rt.src_root.queue_free()
		await get_tree().process_frame
		var rh: Vector3 = (sk.global_transform * sk.get_bone_global_pose(Retarget._idx(sk, "righthandmiddle1"))).origin
		var views := [["front", Vector3(0, 0.0, 0.28)], ["side", Vector3(-0.28, 0.02, 0.05)], ["back", Vector3(0.0, 0.05, -0.28)]]
		for v in views:
			cam.fov = 30
			cam.look_at_from_position(rh + v[1], rh + Vector3(0, -0.02, 0), Vector3.UP)
			await get_tree().process_frame
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png("res://test_hands/softhand_%s_%s.png" % [mname, v[0]])
		h.queue_free()
		await get_tree().process_frame
	get_tree().quit()
