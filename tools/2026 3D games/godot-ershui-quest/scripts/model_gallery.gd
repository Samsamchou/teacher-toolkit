extends Node3D
## 模型檢查場景：把所有 Tripo GLB 排成一列，印出尺寸，存一張截圖後離開。

const MODELS := [
	"bld_station", "bld_teatop", "bld_post", "bld_library", "bld_market", "bld_pxmart",
	"bld_school", "bld_seven", "bld_bookstore", "farm_centre", "bld_inn",
	"bld_waterpark", "bld_lawn", "fighter_jet", "playground",
]

func _collect_aabb(node: Node, acc: Array) -> void:
	if node is MeshInstance3D:
		var mi := node as MeshInstance3D
		acc.append(mi.global_transform * mi.get_aabb())
	for c in node.get_children():
		_collect_aabb(c, acc)

func _ready() -> void:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.78, 0.86, 0.95)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1, 1, 1)
	e.ambient_light_energy = 0.7
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, -35, 0)
	add_child(sun)

	var x := 0.0
	var report := []
	for n in MODELS:
		var scene: PackedScene = load("res://assets/models/%s.glb" % n)
		if scene == null:
			push_error("load failed: " + n)
			continue
		var inst: Node3D = scene.instantiate()
		add_child(inst)
		var boxes := []
		_collect_aabb(inst, boxes)
		var bb: AABB = boxes[0]
		for i in range(1, boxes.size()):
			bb = bb.merge(boxes[i])
		inst.position = Vector3(x - bb.position.x - bb.size.x / 2.0, -bb.position.y, 0)
		var label := Label3D.new()
		label.text = n
		label.pixel_size = 0.01
		label.position = Vector3(x, -0.5, bb.size.z)
		add_child(label)
		report.append("%s size=(%.2f, %.2f, %.2f)" % [n, bb.size.x, bb.size.y, bb.size.z])
		x += bb.size.x + 1.5
	for r in report:
		print(r)
	var cam := Camera3D.new()
	cam.position = Vector3(x / 2.0, 1.6, 14.0)
	cam.rotation_degrees = Vector3(-4, 0, 0)
	cam.fov = 60
	add_child(cam)
	await get_tree().create_timer(1.5).timeout
	var img := get_viewport().get_texture().get_image()
	img.save_png(ProjectSettings.globalize_path("res://gallery.png"))
	print("saved gallery.png")
	get_tree().quit()
