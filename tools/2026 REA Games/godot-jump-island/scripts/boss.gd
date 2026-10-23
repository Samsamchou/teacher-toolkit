extends Node3D
## 原創魔王（第 12 關「泡泡國王」）。
## 流程：追 Ken → 每隔幾秒蹲下（預警）→ 跳高 → 壓地放出一圈衝擊波（Ken 跳起來就閃過）。
## 答對一題 → stun()：魔王扁扁暈 5 秒，頭上轉星星；這時踩它的頭 → 扣 1 滴血、跳回中央。
## 沒踩到就醒來，game.gd 會放一顆不用答題的金色「暈眩星」讓 Ken 再試一次。
## 碰撞判斷（踩頭、被撞、衝擊波）在 game.gd，這裡負責動作與外觀。

signal slammed
signal recovered_unhit

const R := 2.2
const H := 4.4
const STUN_TIME := 5.0

var hp := 7
var max_hp := 7
var state := "idle"            # idle chase windup rise fall recover stunned hurt dead
var st := 0.0                  # 目前狀態經過時間
var slam_cd := 4.0
var target: Node3D             # Ken
var home := Vector3.ZERO
var frozen := false
## 衝擊波可以同時有好幾圈（雷雲大王會連放兩圈）：每圈 {"r", "center", "mesh"}
var waves: Array = []
var wave_on: bool:
	get:
		return not waves.is_empty()
var speed_mul := 1.0
var double_slam := false
var _second_wave_t := -1.0
var body: MeshInstance3D
var crown: MeshInstance3D
var dizzy: Node3D
var mat: StandardMaterial3D
var color := Color(0.62, 0.42, 0.9)

func setup(p: Vector3, c: Color, p_hp: int, p_speed := 1.0, p_double := false) -> void:
	speed_mul = p_speed
	double_slam = p_double
	home = p
	position = p
	color = c
	hp = p_hp
	max_hp = maxi(1, p_hp)
	body = MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.radius = R
	cap.height = H
	body.mesh = cap
	mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.3
	body.material_override = mat
	body.position.y = H * 0.5
	add_child(body)
	for sx in [-1.0, 1.0]:
		var eye := _sphere(0.42, Color.WHITE)
		eye.position = Vector3(0.75 * sx, 0.9, 1.8)
		body.add_child(eye)
		var pupil := _sphere(0.2, Color(0.08, 0.08, 0.12))
		pupil.position = Vector3(0, 0, 0.3)
		eye.add_child(pupil)
		var brow := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.7, 0.14, 0.14)
		brow.mesh = bm
		brow.material_override = _mat(Color(0.2, 0.1, 0.3))
		brow.position = Vector3(0.75 * sx, 1.45, 1.85)
		brow.rotation.z = -0.35 * sx
		body.add_child(brow)
	crown = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 1.1
	cm.bottom_radius = 0.9
	cm.height = 0.8
	cm.radial_segments = 8
	crown.mesh = cm
	crown.material_override = _mat(Color(1.0, 0.82, 0.2))
	crown.position.y = H * 0.5 + 0.2
	body.add_child(crown)
	dizzy = Node3D.new()
	dizzy.position.y = H + 0.8
	dizzy.visible = false
	add_child(dizzy)
	for i in 4:
		var s := _sphere(0.25, Color(1, 0.95, 0.3), true)
		var a := TAU * i / 4.0
		s.position = Vector3(cos(a) * 1.4, 0, sin(a) * 1.4)
		dizzy.add_child(s)

func _spawn_wave() -> void:
	var m := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.92
	tm.outer_radius = 1.0
	tm.rings = 48
	m.mesh = tm
	m.material_override = _mat(Color(1.0, 0.55, 0.2), true)
	m.top_level = true
	add_child(m)
	waves.append({"r": R, "center": global_position, "mesh": m})

func _clear_waves() -> void:
	for w in waves:
		(w["mesh"] as Node).queue_free()
	waves.clear()
	_second_wave_t = -1.0

func _sphere(r: float, c: Color, glow := false) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	m.mesh = s
	m.material_override = _mat(c, glow)
	return m

func _mat(c: Color, glow := false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	if glow:
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

func top_y() -> float:
	return global_position.y + H * body.scale.y

func is_stunned() -> bool:
	return state == "stunned"

func start_fight() -> void:
	state = "chase"
	st = 0.0
	slam_cd = 3.0

func stun() -> void:
	if state == "dead":
		return
	state = "stunned"
	st = 0.0
	_clear_waves()
	position.y = home.y
	dizzy.visible = true

## 被踩頭：扣血。回傳剩下血量。
func hurt() -> int:
	hp = maxi(0, hp - 1)
	dizzy.visible = false
	state = "dead" if hp == 0 else "hurt"
	st = 0.0
	var tw := create_tween()
	tw.tween_property(body, "scale", Vector3(1.5, 0.35, 1.5), 0.1)
	tw.tween_property(body, "scale", Vector3.ONE, 0.25)
	mat.albedo_color = Color(1, 0.4, 0.4)
	get_tree().create_timer(0.3).timeout.connect(func(): mat.albedo_color = color)
	if hp == 0:
		var t2 := create_tween()
		t2.tween_interval(0.4)
		t2.tween_property(self, "rotation:y", rotation.y + TAU * 2.0, 1.2)
		t2.parallel().tween_property(self, "scale", Vector3(0.02, 0.02, 0.02), 1.2)
		t2.tween_callback(func(): visible = false)
	return hp

func _physics_process(dt: float) -> void:
	if frozen or state == "idle" or state == "dead":
		return
	st += dt
	dizzy.rotation.y += dt * 4.0
	for w in waves.duplicate():
		w["r"] = float(w["r"]) + 11.0 * dt
		var wm: MeshInstance3D = w["mesh"]
		var wc: Vector3 = w["center"]
		wm.global_position = Vector3(wc.x, home.y + 0.35, wc.z)
		wm.scale = Vector3(w["r"], 6.0, w["r"])
		if float(w["r"]) > 18.0:
			wm.queue_free()
			waves.erase(w)
	if _second_wave_t >= 0.0:
		_second_wave_t -= dt
		if _second_wave_t < 0.0:
			_spawn_wave()
			slammed.emit()
	var fast := speed_mul * (1.0 + 0.5 * (1.0 - float(hp) / max_hp))
	match state:
		"chase":
			body.scale = body.scale.lerp(Vector3.ONE, minf(1.0, dt * 8.0))
			if target:
				var to := target.global_position - global_position
				to.y = 0
				if to.length() > 0.5:
					rotation.y = rotate_toward(rotation.y, atan2(to.x, to.z), dt * 2.5)
				if to.length() > R + 0.8:
					position += Vector3(sin(rotation.y), 0, cos(rotation.y)) * 2.6 * fast * dt
				_clamp_arena()
			position.y = home.y + absf(sin(st * 6.0)) * 0.25
			slam_cd -= dt
			if slam_cd <= 0.0:
				state = "windup"
				st = 0.0
		"windup":
			position.y = home.y
			body.scale = Vector3(1.15, 0.75, 1.15)
			mat.albedo_color = color.lerp(Color(1, 0.3, 0.3), 0.5 + 0.5 * sin(st * 30.0))
			if st > 0.9:
				mat.albedo_color = color
				state = "rise"
				st = 0.0
		"rise":
			body.scale = Vector3(0.9, 1.15, 0.9)
			position.y = home.y + 4.5 * minf(1.0, st / 0.45)
			if st > 0.55:
				state = "fall"
				st = 0.0
		"fall":
			position.y = home.y + 4.5 * maxf(0.0, 1.0 - st / 0.2)
			if st >= 0.2:
				position.y = home.y
				body.scale = Vector3(1.3, 0.7, 1.3)
				_spawn_wave()
				if double_slam:
					_second_wave_t = 0.55
				slammed.emit()
				state = "recover"
				st = 0.0
		"recover":
			body.scale = body.scale.lerp(Vector3.ONE, minf(1.0, dt * 6.0))
			if st > 0.8:
				state = "chase"
				st = 0.0
				slam_cd = randf_range(3.5, 5.0) / fast
		"stunned":
			body.scale = body.scale.lerp(Vector3(1.25, 0.6, 1.25), minf(1.0, dt * 8.0))
			if st > STUN_TIME:
				dizzy.visible = false
				state = "chase"
				st = 0.0
				slam_cd = 2.5
				recovered_unhit.emit()
		"hurt":
			# 跳回中央
			var p := position.lerp(home, minf(1.0, dt * 3.0))
			position = Vector3(p.x, home.y + sin(minf(1.0, st / 1.0) * PI) * 3.0, p.z)
			if st > 1.0:
				position.y = home.y
				state = "chase"
				st = 0.0
				slam_cd = 2.5

func _clamp_arena() -> void:
	var off := position - home
	off.y = 0
	if off.length() > 12.0:
		off = off.normalized() * 12.0
		position.x = home.x + off.x
		position.z = home.z + off.z
