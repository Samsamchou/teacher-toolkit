extends Node3D
## 原創小怪「果凍史萊姆」：在平台上來回走。從上面踩 → 消失；從旁邊碰到 → Ken 被彈開（沒有扣血）。
## 碰撞判斷在 game.gd（_check_enemies），這裡只負責走路與外觀。

const R := 0.8                    # 身體半徑（公尺）
const H := 1.1                    # 身高

var origin := Vector3.ZERO
var axis := Vector3.RIGHT
var span := 3.0
var speed := 1.6
var t := 0.0
var alive := true
var frozen := false
var body: MeshInstance3D

func setup(p: Vector3, a: Vector3, s: float, color := Color(0.45, 0.85, 0.45)) -> void:
	origin = p
	axis = a.normalized()
	span = s
	position = p
	t = randf() * TAU
	body = MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = R
	sm.height = H * 1.2
	sm.radial_segments = 16
	sm.rings = 8
	body.mesh = sm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.35
	body.material_override = mat
	body.position.y = H * 0.5
	add_child(body)
	for sx in [-1.0, 1.0]:
		var eye := MeshInstance3D.new()
		var e := SphereMesh.new()
		e.radius = 0.18
		e.height = 0.36
		eye.mesh = e
		var em := StandardMaterial3D.new()
		em.albedo_color = Color.WHITE
		eye.material_override = em
		eye.position = Vector3(0.28 * sx, 0.25, 0.62)
		body.add_child(eye)
		var pupil := MeshInstance3D.new()
		var p2 := SphereMesh.new()
		p2.radius = 0.09
		p2.height = 0.18
		pupil.mesh = p2
		var pm := StandardMaterial3D.new()
		pm.albedo_color = Color(0.08, 0.08, 0.12)
		pupil.material_override = pm
		pupil.position = Vector3(0, 0, 0.13)
		eye.add_child(pupil)

func _physics_process(dt: float) -> void:
	if not alive or frozen:
		return
	t += dt * speed / maxf(0.5, span)
	var off := sin(t) * span
	var vel := cos(t)
	position = origin + axis * off
	rotation.y = atan2(axis.x * signf(vel), axis.z * signf(vel))
	var squish := 1.0 + 0.08 * sin(t * 8.0)
	body.scale = Vector3(1.0 / squish, squish, 1.0 / squish)

func stomp() -> void:
	alive = false
	var tw := create_tween()
	tw.tween_property(body, "scale", Vector3(1.6, 0.15, 1.6), 0.12)
	tw.tween_interval(0.35)
	tw.tween_property(self, "scale", Vector3(0.01, 0.01, 0.01), 0.2)
	tw.tween_callback(func(): visible = false)
