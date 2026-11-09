extends Node3D
## Mixamo 動作套 Ken 檢查：每個動作抽 3 格（25%、50%、75%）存 test_anim/<動作>_<n>.png
## 執行：Godot --path . res://scenes/anim_check.tscn   （ONLY=jogging 只跑一個；CHAR=shuiling_rigged 換角色）

const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")

const ANIMS := ["jogging", "sitting_laughing", "writing", "typing", "dribble", "baseball_hit",
	"kneeling_idle", "plant_a_plant", "driving", "sitting_idle", "cheering"]

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
	sun.light_energy = 1.3
	var floor := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(10, 10)
	floor.mesh = pm
	add_child(floor)
	var ch := OS.get_environment("CHAR")
	if ch == "":
		ch = "ken_rigged"
	var h: Node3D = w.fit_model(ch, 1.3, OS.get_environment("NOOUT") == "", 0.3)   # 和遊戲一樣細描邊（太粗會認不出 Ken）
	h.rotation.y = deg_to_rad(30)
	add_child(h)
	var ap: AnimationPlayer = Retarget.find_type(h, "AnimationPlayer")
	if ap:
		ap.stop()
		ap.active = false
	var sk: Skeleton3D = Retarget.find_type(h, "Skeleton3D")
	var cam := Camera3D.new()
	cam.fov = 35
	add_child(cam)
	cam.look_at_from_position(Vector3(0, 1.0, 2.8), Vector3(0, 0.6, 0), Vector3.UP)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://test_anim"))
	var only := OS.get_environment("ONLY")
	if only == "rest":
		sk.reset_bone_poses()
		await _shot("rest")
		for b in sk.get_bone_count():
			var nm2 := sk.get_bone_name(b)
			if "Right" in nm2 and ("Arm" in nm2 or "Shoulder" in nm2 or "Hand" == nm2.right(4)):
				print(nm2, " rest_rot=", sk.get_bone_rest(b).basis.get_euler() * 57.3, " glob=", sk.get_bone_global_rest(b).origin)
		get_tree().quit()
		return
	for nm in ANIMS:
		if only != "" and nm != only:
			continue
		var rt := Retarget.new()
		if not rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_%s.fbx" % nm), self):
			print(nm, " LOAD FAIL")
			continue
		var n := rt.bind(sk)
		print(nm, " mapped=", n, "/", sk.get_bone_count(), " len=", rt.length(), " hip_ratio=", rt.hip_ratio)
		for i in 3:
			rt.apply_at(rt.length() * (0.25 + 0.25 * i))
			await _shot("%s_%d" % [nm, i])
		rt.src_root.queue_free()
		sk.reset_bone_poses()
	get_tree().quit()

func _shot(nm: String) -> void:
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test_anim/%s.png" % nm)
