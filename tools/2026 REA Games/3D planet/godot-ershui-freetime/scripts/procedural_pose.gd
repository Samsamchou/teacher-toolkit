extends RefCounted
## 程式擺姿勢（Mixamo 沒有的動作）：吹直笛
## 用法：rt.bind(sk) 之後呼叫 pose_recorder(sk, rt.corr)；回傳直笛應該擺的世界座標 Transform3D（+Y＝笛身由笛頭往笛尾）
## 做法：從 retarget 的 corr（已對齊 T-pose）出發，手臂用兩節 IK 算手肘位置，再用「最短弧」把每根骨頭轉到要的方向。

const Retarget := preload("res://scripts/retarget.gd")

## 嘴巴相對 Head 骨的位置（世界單位，Ken 身高 1.3 時量得；y 往上、z 往前）
const MOUTH_OFS := Vector3(0.0, -0.008, 0.11)   # home_check 的 FACE 輪廓：下巴 -0.04、鼻 +0.02、護目鏡 +0.08
const RECORDER_LEN := 0.28

static func _order(sk: Skeleton3D) -> Array[int]:
	var o: Array[int] = []
	var st: Array = Array(sk.get_parentless_bones())
	while not st.is_empty():
		var b: int = st.pop_front()
		o.append(b)
		for c in sk.get_bone_children(b):
			st.append(c)
	return o

static func bone_pos(sk: Skeleton3D, b: int) -> Vector3:
	return sk.global_transform * sk.get_bone_global_pose(b).origin

## world：骨 idx → 世界旋轉；沒給的骨頭沿用父骨＋靜止姿勢
static func apply_world(sk: Skeleton3D, world: Dictionary) -> void:
	var tw := sk.global_transform.basis.orthonormalized()
	var done := {}
	for b in _order(sk):
		var p := sk.get_bone_parent(b)
		var pw: Basis = tw if p < 0 else done[p]
		var wb: Basis = world[b] if world.has(b) else (pw * sk.get_bone_rest(b).basis.orthonormalized())
		done[b] = wb
		sk.set_bone_pose_rotation(b, (pw.inverse() * wb).orthonormalized().get_rotation_quaternion())
	var h := Retarget._idx(sk, "hips")
	if h >= 0:
		sk.set_bone_pose_position(h, sk.get_bone_rest(h).origin)

## 由兩腿根位置算 Ken 的左手方向（水平）
static func _left(sk: Skeleton3D) -> Vector3:
	var v := bone_pos(sk, Retarget._idx(sk, "leftupleg")) - bone_pos(sk, Retarget._idx(sk, "rightupleg"))
	v.y = 0
	return v.normalized()

static func _arc(from: Vector3, to: Vector3) -> Basis:
	from = from.normalized()
	to = to.normalized()
	var ax := from.cross(to)
	if ax.length() < 1e-6:
		return Basis.IDENTITY
	return Basis(Quaternion(ax.normalized(), from.angle_to(to)))

## 兩節 IK：肩 S、目標腕 H、上臂長 l1、前臂長 l2、手肘往 pole 方向彎
static func _elbow(S: Vector3, H: Vector3, l1: float, l2: float, pole: Vector3) -> Vector3:
	var v := H - S
	var d := clampf(v.length(), 0.01, l1 + l2 - 0.002)
	var u := v.normalized()
	var a := (l1 * l1 - l2 * l2 + d * d) / (2.0 * d)
	var hh := sqrt(maxf(l1 * l1 - a * a, 0.0))
	var p := (pole - u * pole.dot(u)).normalized()
	return S + u * a + p * hh

## 把骨頭 b（及其整串子骨）整體轉 R（世界）
static func _rot_chain(sk: Skeleton3D, world: Dictionary, b: int, R: Basis) -> void:
	world[b] = (R * world[b]).orthonormalized()
	for c in sk.get_bone_children(b):
		_rot_chain(sk, world, c, R)

static func _point_bone(sk: Skeleton3D, world: Dictionary, b: int, child: int, dir: Vector3) -> void:
	var cur: Vector3 = (world[b] as Basis) * sk.get_bone_rest(child).origin
	_rot_chain(sk, world, b, _arc(cur, dir))

## 擺吹直笛姿勢；回傳直笛的世界 Transform（原點＝笛頭吹口，+Y 朝笛尾）
static func pose_recorder(sk: Skeleton3D, corr: Dictionary, mouth_ofs := MOUTH_OFS) -> Transform3D:
	var world := corr.duplicate()
	apply_world(sk, world)   # 先回到對齊後的 T-pose
	var kleft := _left(sk)                     # Ken 的左手邊
	var kfwd := kleft.cross(Vector3.UP).normalized()   # Ken 面向
	# 頭稍微低一點看譜（先做，嘴巴位置才準）
	var neck := Retarget._idx(sk, "neck")
	if neck >= 0:
		_rot_chain(sk, world, neck, Basis(Quaternion(kleft, deg_to_rad(6.0))))
		apply_world(sk, world)
	var head := Retarget._idx(sk, "head")
	var hp := bone_pos(sk, head)
	var mouth := hp + Vector3.UP * mouth_ofs.y + kfwd * mouth_ofs.z + kleft * mouth_ofs.x
	# 直笛：從嘴巴往前下方 50° 左右
	var rdir := (kfwd * 0.53 - Vector3.UP * 0.85).normalized()
	var top := mouth + kfwd * 0.005
	# 左手在上、右手在下；手腕在握點稍微外側、靠身體
	var grips := {"left": top + rdir * 0.115, "right": top + rdir * 0.195}
	for side in ["left", "right"]:
		var sgn := 1.0 if side == "left" else -1.0
		var arm := Retarget._idx(sk, side + "arm")
		var fore := Retarget._idx(sk, side + "forearm")
		var hand := Retarget._idx(sk, side + "hand")
		var mid := Retarget._idx(sk, side + "handmiddle1")
		var S := bone_pos(sk, arm)
		var l1 := S.distance_to(bone_pos(sk, fore))
		var l2 := bone_pos(sk, fore).distance_to(bone_pos(sk, hand))
		var g: Vector3 = grips[side]
		var H := g + kleft * sgn * 0.04 - kfwd * 0.03 - rdir * 0.02
		var pole := kleft * sgn * 0.45 - Vector3.UP * 1.0 - kfwd * 0.1
		var E := _elbow(S, H, l1, l2, pole)
		_point_bone(sk, world, arm, fore, E - S)
		_point_bone(sk, world, fore, hand, H - E)
		# 手掌朝笛身包住：手指方向＝往握點、再稍往內
		_point_bone(sk, world, hand, mid, (g - H).normalized() * 0.8 + rdir * 0.2)
		# 手指彎曲（不含拇指）：每節繞手掌側軸轉 35°
		var hdir: Vector3 = ((world[hand] as Basis) * sk.get_bone_rest(mid).origin).normalized()
		var curl_ax := hdir.cross(Vector3.UP).normalized()
		if curl_ax.dot(kfwd.cross(Vector3.UP)) * sgn > 0:
			curl_ax = -curl_ax
		for c in sk.get_bone_children(hand):
			var nm := Retarget.norm(sk.get_bone_name(c))
			if nm.contains("thumb"):
				continue
			var f := c
			while f >= 0:
				var R := Basis(Quaternion(curl_ax, deg_to_rad(35.0)))
				_rot_chain(sk, world, f, R)
				var kids := sk.get_bone_children(f)
				f = kids[0] if kids.size() > 0 else -1
	apply_world(sk, world)
	var x := kleft
	var yv := rdir
	var z := x.cross(yv).normalized()
	return Transform3D(Basis(x, yv, z).orthonormalized(), top)

## 站好：從 T-pose 把兩手放下（上臂往下稍外張、前臂微彎往前）
static func pose_stand(sk: Skeleton3D, corr: Dictionary) -> void:
	var world := corr.duplicate()
	apply_world(sk, world)
	var kleft := _left(sk)                     # Ken 的左手邊
	var kfwd := kleft.cross(Vector3.UP).normalized()   # Ken 面向
	for side in ["left", "right"]:
		var sgn := 1.0 if side == "left" else -1.0
		var arm := Retarget._idx(sk, side + "arm")
		var fore := Retarget._idx(sk, side + "forearm")
		var hand := Retarget._idx(sk, side + "hand")
		var mid := Retarget._idx(sk, side + "handmiddle1")
		_point_bone(sk, world, arm, fore, -Vector3.UP + kleft * sgn * 0.22 + kfwd * 0.03)
		_point_bone(sk, world, fore, hand, -Vector3.UP + kleft * sgn * 0.1 + kfwd * 0.25)
		_point_bone(sk, world, hand, mid, -Vector3.UP + kfwd * 0.2)
	apply_world(sk, world)
