extends Node3D
## 吉祥物走路檢查：空白場景、三隻角色並排，抽 4 個走路影格存 test_mascot_*.png
## 執行：Godot --path . res://scenes/mascot_check.tscn

const World := preload("res://scripts/world.gd")

func _ready() -> void:
	var w := World.new()
	w._materials()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.86, 0.9, 0.95)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.8, 0.8, 0.85)
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(3, 6, 5), Vector3.ZERO, Vector3.UP)
	var floor := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(10, 10)
	floor.mesh = pm
	add_child(floor)
	var anims := []
	var x := -1.6
	for m in [["ken_rigged", 1.3], ["shuiling_rigged", 1.2], ["zunbo_rigged", 1.15]]:
		var h: Node3D = w.fit_model(m[0], m[1], OS.get_environment("NOOUT") == "", 1.0 if m[0] == "ken_rigged" else 0.3)
		h.position = Vector3(x, 0, 0)
		h.rotation.y = deg_to_rad(35)
		add_child(h)
		var ap := _find(h)
		print(m[0], " size=", h.get_meta("width"), "x", h.get_meta("height"), "x", h.get_meta("depth"), " anims=", ap.get_animation_list() if ap else "none")
		anims.append(ap)
		x += 1.6
	var cam := Camera3D.new()
	cam.fov = 35
	add_child(cam)
	cam.look_at_from_position(Vector3(0, 1.3, 5.2), Vector3(0, 0.6, 0), Vector3.UP)
	await get_tree().process_frame
	await _shot("stand")
	for ap in anims:
		if ap:
			var nm: String = ap.get_animation_list()[0]
			ap.get_animation(nm).loop_mode = Animation.LOOP_LINEAR
			ap.play(nm)
	for i in 4:
		await get_tree().create_timer(0.22).timeout
		await _shot("walk_%d" % i)
	get_tree().quit()

func _find(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var a := _find(c)
		if a:
			return a
	return null

func _shot(nm: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test_mascot_%s.png" % nm)
