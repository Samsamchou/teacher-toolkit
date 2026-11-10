extends RefCounted
## 程式擺姿勢（Mixamo 沒有的動作）：吹直笛、站好；以及套動作後的修正：抬頭/轉頭（aim_head）、手臂 IK（ik_arm）、
## 手掌方向（aim_hand）、手指彎曲（curl_fingers）、腳底不穿地板（lift_feet）、藏起右手小道具（hide_hand_gadget）
## 用法：rt.bind(sk) 之後呼叫 pose_recorder(sk, rt.corr)；回傳直笛應該擺的世界座標 Transform3D（+Y＝笛身由笛頭往笛尾）
## 做法：從 retarget 的 corr（已對齊 T-pose）出發，手臂用兩節 IK 算手肘位置，再用「最短弧」把每根骨頭轉到要的方向。

const Retarget := preload("res://scripts/retarget.gd")

## 嘴巴相對 Head 骨的位置（世界單位，Ken 身高 1.3 時量得；y 往上、z 往前）
## 頭骨座標：x 左、y 頭頂方向、z 臉的方向（用 corr 推出，頭轉動也跟著走）
## FACE 輪廓（頭骨相對 y：最前 z）：-0.05 下巴 0.096、-0.03 嘴 0.101、-0.01 人中 0.110、+0.01 鼻尖 0.122、+0.08 護目鏡
const MOUTH_OFS := Vector3(0.0, -0.032, 0.098)
const RECORDER_LEN := 0.33
const RECORDER_DOWN := 50.0   # 笛身往下的角度（度）
const RECORDER_LEFT_AT := 0.10    # 左手搭在離吹口多遠
const RECORDER_RIGHT_AT := 0.24   # 右手（拳頭中心）離吹口多遠

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
static func apply_world(sk: Skeleton3D, world: Dictionary, keep_pos := false) -> void:
	var tw := sk.global_transform.basis.orthonormalized()
	var done := {}
	for b in _order(sk):
		var p := sk.get_bone_parent(b)
		var pw: Basis = tw if p < 0 else done[p]
		var wb: Basis = world[b] if world.has(b) else (pw * sk.get_bone_rest(b).basis.orthonormalized())
		done[b] = wb
		sk.set_bone_pose_rotation(b, (pw.inverse() * wb).orthonormalized().get_rotation_quaternion())
	if keep_pos:   # 套動作後的修正：保留 Hips 的位移（坐姿高度）
		return
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
## 笛身在身體正中線、往前下方 RECORDER_DOWN 度；左手在上、右手在下，兩手都是張開的手：
## 四指搭在笛身正面（指尖在按孔那面）、拇指在背面。兩手之間、右手下面都露出一段笛身。
## （舊模型 ken_rigged 的右手是拳頭：笛身卡在拇指和食指之間）
## 量到的間隙存在 last_report（home_check 會印）
static var last_report := {}

## 吉祥物用參數（預設＝Ken）：L 笛長、down 往下角度、left_at/right_at 兩手離吹口、insert 吹口含進嘴多深、
## curl_max 手指最多彎幾度（水鈴 0＝不彎）、ax_x/pad 管子橫過手的位置與手心厚度（手的大小不同）、neck_deg 低頭
static func pose_recorder(sk: Skeleton3D, corr: Dictionary, mouth_ofs := MOUTH_OFS, L := RECORDER_LEN, down_deg := RECORDER_DOWN, left_at := RECORDER_LEFT_AT, right_at := RECORDER_RIGHT_AT, insert := 0.012, curl_max := 95.0, ax_x := 0.108, pad := 0.011, neck_deg := 5.0, behind := false, lean_deg := 0.0, r_tube := RECORDER_R, shoulder_fwd_deg := 0.0) -> Transform3D:
	## behind＝true（圳寶：臉在肩膀前 30 cm，手伸不到笛子前面）：手從笛子後面握住，手心朝前
	var world := corr.duplicate()
	apply_world(sk, world)   # 先回到對齊後的 T-pose
	var kleft := _left(sk)                     # Ken 的左手邊
	var kfwd := kleft.cross(Vector3.UP).normalized()   # Ken 面向
	if lean_deg != 0.0:   # 上半身往前傾（圳寶手短，傾一點肩膀才靠近笛子）
		_rot_chain(sk, world, Retarget._idx(sk, "spine"), Basis(Quaternion(kleft, deg_to_rad(lean_deg))))
		apply_world(sk, world)
	if shoulder_fwd_deg != 0.0:   # 肩膀往前收（圳寶臉在肩膀前 30 cm，手才搆得到笛子）
		for sd in ["left", "right"]:
			var sh := Retarget._idx(sk, sd + "shoulder")
			if sh >= 0:
				var sg := -1.0 if sd == "left" else 1.0
				_rot_chain(sk, world, sh, Basis(Quaternion(Vector3.UP, sg * deg_to_rad(shoulder_fwd_deg))))
		apply_world(sk, world)
	# 頭稍微低一點看譜（先做，嘴巴位置才準）
	var neck := Retarget._idx(sk, "neck")
	if neck >= 0:
		_rot_chain(sk, world, neck, Basis(Quaternion(kleft, deg_to_rad(neck_deg))))
		apply_world(sk, world)
	var mouth := head_point(sk, corr, world, mouth_ofs)
	var down := deg_to_rad(down_deg)
	var A := (kfwd * cos(down) - Vector3.UP * sin(down)).normalized()    # 笛身方向（吹口 → 笛尾）
	var Tn := (kfwd * sin(down) + Vector3.UP * cos(down)).normalized()   # 笛身「正面」（按孔那面，朝前上方）
	var top := mouth - A * insert   # 吹口含進嘴唇（Ken 約 1 公分）
	var bot := top + A * L
	var rep := {}
	# 右手在下：ken_openhand（右手張開）和左手一樣搭在笛身上；舊模型 ken_rigged（右手是拳頭）用拳頭凹槽靠著
	var Gr := top + A * right_at
	var pole_r := -kleft * 0.6 - Vector3.UP * 1.0 - kfwd * 0.2
	if not right_is_fist(sk):
		rep["right"] = hand_on_tube(sk, world, corr, "right", Gr, A, -Tn if behind else Tn, -kleft, r_tube, pole_r, top, bot, -1.0, -99.0, curl_max, ax_x, pad)
	else:
		var best := {}
		var best_w := {}
		for flip in [1.0, -1.0]:
			var w2 := world.duplicate()
			var D: Vector3 = A * flip
			var g := fist_grip(sk, w2, "right", Gr + D * 0.042, D, FIST_TUBE_C, FIST_TUBE_D, pole_r, -Tn * 1.0 - kleft * 0.5)
			g["flip"] = flip
			var sc: float = -g["bend"] / 60.0 - g["err"] * 80.0 + g["side"] * 0.6
			if best.is_empty() or sc > best["score"]:
				g["score"] = sc
				best = g
				best_w = w2
		world = best_w
		rep["right"] = best
	# 左手（張開）在上
	var Gl := top + A * left_at
	var pole_l := kleft * 0.6 - Vector3.UP * 1.0 - kfwd * 0.2
	rep["left"] = hand_on_tube(sk, world, corr, "left", Gl, A, -Tn if behind else Tn, kleft, r_tube, pole_l, top, bot, -1.0, -99.0, curl_max, ax_x, pad)
	apply_world(sk, world)
	rep["right_clear"] = hand_line_clearance(sk, "right", top, bot)
	rep["left_clear"] = hand_line_clearance(sk, "left", top, bot)
	rep["top"] = top
	rep["bot"] = bot
	last_report = rep
	return Transform3D(Basis(-kleft, A, Tn).orthonormalized(), top)   # +Z＝正面（按孔）

## 張開的手搭在管子上：四指橫過管子正面、指尖彎下來貼著管子，拇指在背面，手掌不碰管子（全部用量的）
## G＝管軸上手要搭的位置，A＝管軸方向，Tn＝管子正面法線，out＝手掌在哪一側；r＝管子半徑；seg_a/seg_b＝管子兩端
## 回傳量到的數字
static func hand_on_tube(sk: Skeleton3D, world: Dictionary, corr: Dictionary, side: String, G: Vector3, A: Vector3, Tn: Vector3, out: Vector3, r: float, pole: Vector3, seg_a: Vector3, seg_b: Vector3, wrap_deg := -1.0, slant_deg := -99.0, curl_max := 95.0, ax_x := 0.108, pad := 0.011) -> Dictionary:
	## ax_x＝管子橫過手的位置（手座標 a，Ken 指根 0.108）；pad＝那裡手心側的厚度（手座標 n）
	var fore := Retarget._idx(sk, side + "forearm")
	var hand := Retarget._idx(sk, side + "hand")
	var wrap_axis := out.cross(-Tn).normalized()
	# 1) 找手腕最不彎的包覆角（wrap）與斜角（slant）
	var cand_w := [wrap_deg] if wrap_deg >= 0.0 else [10.0, 25.0, 40.0, 55.0, 70.0]
	var cand_s := [slant_deg] if slant_deg > -90.0 else [-20.0, -10.0, 0.0, 10.0, 20.0, 30.0]
	var best := {}
	for wd in cand_w:
		for sd in cand_s:
			var Rw := Basis(Quaternion(wrap_axis, deg_to_rad(wd)))
			var a1: Vector3 = Rw * (-out * cos(deg_to_rad(sd)) + A * sin(deg_to_rad(sd))).normalized()
			var n1: Vector3 = Rw * (-Tn)
			var W1: Vector3 = G - n1 * (r + 0.004) - a1 * ax_x - n1 * pad
			var w2 := world.duplicate()
			ik_arm(sk, w2, side, W1, pole)
			apply_world(sk, w2, true)
			var E := bone_pos(sk, fore)
			var Hp := bone_pos(sk, hand)
			var bend := rad_to_deg((Hp - E).normalized().angle_to(a1))
			var sc := -bend / 60.0 - Hp.distance_to(W1) * 80.0
			if best.is_empty() or sc > best["score"]:
				best = {"score": sc, "wrap": wd, "slant": sd, "a": a1, "n": n1, "bend": bend}
	var a: Vector3 = best["a"]
	var n: Vector3 = best["n"]
	# 2) 手掌、手指（不彎時）離管子至少 r＋1.5 mm：不夠就把手往外推
	var m := 0.004
	for it in 8:
		var W: Vector3 = G - n * (r + m) - a * ax_x - n * pad
		ik_arm(sk, world, side, W, pole)
		aim_hand(sk, world, side, a, n)
		reset_fingers(sk, world, corr, side)
		aim_thumb(sk, world, side, Vector3(0.8, 0.0, 0.6))   # 拇指先張開、離開管子
		apply_world(sk, world, true)
		var c := hand_line_clearance(sk, side, seg_a, seg_b)
		best["err"] = bone_pos(sk, hand).distance_to(W)
		if c["_min"] >= r + 0.0015:
			break
		m += r + 0.002 - c["_min"]
	best["push"] = m
	# 3) 每根手指各自彎到指尖貼著管子（二分法，量那根手指的頂點）
	var curls := {}
	for f in (["index", "middle", "ring", "pinky"] if curl_max > 0.0 else []):
		var lo := 0.0
		var hi := curl_max
		for it in 7:
			var mid := (lo + hi) * 0.5
			var w2 := world.duplicate()
			curl_finger(sk, w2, side, f, [mid * 0.55, mid, mid * 0.7])
			apply_world(sk, w2, true)
			if _finger_clear(sk, side, f, seg_a, seg_b) >= r + 0.001:
				lo = mid
			else:
				hi = mid
		curls[f] = lo
		curl_finger(sk, world, side, f, [lo * 0.55, lo, lo * 0.7])
	best["curl"] = curls
	# 4) 拇指：掃描方向，挑「不碰管子、指尖最靠近管子背面」的（離原本方向最多 75 度）
	apply_world(sk, world, true)
	var ax0 := hand_axes(sk, world, side)
	var rest_dir: Vector3 = ((ax0[0] as Vector3) * 0.8 + (ax0[2] as Vector3) * 0.6).normalized()
	var tip_b := Retarget._idx(sk, side + "handthumb3")
	var bt := {}
	for ia in 7:
		for ib in 12:
			var ang := deg_to_rad(12.5 * ia)
			var perp := rest_dir.cross(ax0[1]).normalized()
			var dir := Basis(Quaternion(rest_dir, TAU * ib / 12.0)) * (Basis(Quaternion(perp, ang)) * rest_dir)
			var w2 := world.duplicate()
			_aim_thumb_world(sk, w2, side, dir)
			apply_world(sk, w2, true)
			var cl := _finger_clear(sk, side, "thumb", seg_a, seg_b)
			if cl < r + 0.001:
				continue
			var tp := bone_pos(sk, tip_b)
			var q := seg_a + A * (tp - seg_a).dot(A)
			var sc := -(tp - q).normalized().dot(Tn) * 1.0 - (cl - r) * 40.0 - ang * 0.15
			if bt.is_empty() or sc > bt["score"]:
				bt = {"score": sc, "dir": dir, "clear": cl, "behind": -(tp - q).normalized().dot(Tn)}
			if ia == 0:
				break
	if not bt.is_empty():
		_aim_thumb_world(sk, world, side, bt["dir"])
		best["thumb_behind"] = bt["behind"]
	apply_world(sk, world, true)
	best.erase("a")
	best.erase("n")
	return best

static func _finger_clear(sk: Skeleton3D, side: String, finger: String, a: Vector3, b: Vector3) -> float:
	var c := hand_line_clearance(sk, side, a, b)
	var m := 9.0
	for k in c:
		if (k as String).contains(finger):
			m = minf(m, c[k])
	return m

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

## 藏起 Ken 右手握的黃橘色小道具（它是網格的一部分、沒有自己的骨頭）
## 辨識：權重固定是 中指1≈0.52、中指2≈0.16、食指1≈0.16、無名指1≈0.15~0.16，而且貼圖是亮黃色
## 做法：把這些頂點全部縮到手掌裡同一點（三角形退化＝看不見），只改這個 MeshInstance 的網格，別的角色不受影響
## 回傳藏了幾個頂點
static func hide_hand_gadget(root: Node) -> int:
	var sk: Skeleton3D = Retarget.find_type(root, "Skeleton3D")
	var mis := []
	_collect_skinned(root, mis)
	var total := 0
	for mi: MeshInstance3D in mis:
		var skin := mi.skin
		var src: Mesh = mi.mesh
		var names := []
		var mid1 := -1
		var hand := -1
		for i in skin.get_bind_count():
			var nm := ""
			var bi := skin.get_bind_bone(i)
			if bi >= 0 and sk:
				nm = Retarget.norm(sk.get_bone_name(bi))
			else:
				nm = Retarget.norm(String(skin.get_bind_name(i)))
			names.append(nm)
			if nm == "righthandmiddle1":
				mid1 = i
			elif nm == "righthand":
				hand = i
		if mid1 < 0 or hand < 0:
			continue
		# 收合點：手掌中間（手腕骨與中指根之間）
		var p_mid := skin.get_bind_pose(mid1).affine_inverse().origin
		var p_hand := skin.get_bind_pose(hand).affine_inverse().origin
		var sink := p_hand.lerp(p_mid, 0.6)
		var nm2 := ArrayMesh.new()
		var changed := false
		for s in src.get_surface_count():
			var a := src.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var UV = a[Mesh.ARRAY_TEX_UV]
			var mat := src.surface_get_material(s)
			var img: Image = null
			if mat is StandardMaterial3D and (mat as StandardMaterial3D).albedo_texture:
				img = (mat as StandardMaterial3D).albedo_texture.get_image()
				if img and img.is_compressed():
					img.decompress()
			if B != null and B.size() > 0 and img != null:
				var nb: int = B.size() / V.size()
				for vi in V.size():
					var w := {}
					for k in nb:
						var wt: float = W[vi * nb + k]
						if wt > 0.0:
							w[names[B[vi * nb + k]]] = wt
					if absf(w.get("righthandmiddle1", 0.0) - 0.52) > 0.012:
						continue
					if absf(w.get("righthandmiddle2", 0.0) - 0.16) > 0.008 or absf(w.get("righthandindex1", 0.0) - 0.16) > 0.008:
						continue
					if absf(w.get("righthandring1", 0.0) - 0.155) > 0.012:
						continue
					var uv: Vector2 = UV[vi]
					var c := img.get_pixel(clampi(int(uv.x * img.get_width()), 0, img.get_width() - 1), clampi(int(uv.y * img.get_height()), 0, img.get_height() - 1))
					if c.r < 0.75 or c.g < 0.5:   # 只收亮黃／橘黃
						continue
					V[vi] = sink
					total += 1
					changed = true
				a[Mesh.ARRAY_VERTEX] = V
			var flags := 0
			if B != null and B.size() > 0 and B.size() / V.size() == 8:
				flags = Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS
			nm2.add_surface_from_arrays(src.surface_get_primitive_type(s), a, [], {}, flags)
			nm2.surface_set_material(s, mat)
		if changed:
			mi.mesh = nm2
	return total

static func _collect_skinned(n: Node, arr: Array) -> void:
	if n is MeshInstance3D and n.skin != null and n.mesh != null:
		arr.append(n)
	for c in n.get_children():
		_collect_skinned(c, arr)


# ───────── 套動作之後的修正工具（Ken 要在原點、面向 +Z 時呼叫；目標點用 Ken 自己的座標） ─────────

## 讀出目前姿勢每根骨頭的世界旋轉（之後可用 _rot_chain 修改，再 apply_world(sk, w, true)）
static func pose_world(sk: Skeleton3D) -> Dictionary:
	var tw := sk.global_transform.basis.orthonormalized()
	var w := {}
	for b in _order(sk):
		var p := sk.get_bone_parent(b)
		var pw: Basis = tw if p < 0 else w[p]
		w[b] = (pw * Basis(sk.get_bone_pose_rotation(b))).orthonormalized()
	return w

## 頭骨的「臉朝向」與「頭頂方向」（世界）：corr 是 T-pose（臉朝 +Z、頭頂朝 +Y）
static func head_axes(sk: Skeleton3D, corr: Dictionary, world: Dictionary) -> Array:
	var hd := Retarget._idx(sk, "head")
	var cb: Basis = corr[hd]
	var hb: Basis = world[hd]
	var f := (hb * (cb.inverse() * Vector3(0, 0, 1))).normalized()
	var u := (hb * (cb.inverse() * Vector3.UP)).normalized()
	return [f, u, u.cross(f).normalized()]   # 臉、頭頂、左

## 頭骨座標的一點 → 世界（ofs：x 左、y 頭頂、z 臉）
static func head_point(sk: Skeleton3D, corr: Dictionary, world: Dictionary, ofs: Vector3) -> Vector3:
	var ax := head_axes(sk, corr, world)
	return bone_pos(sk, Retarget._idx(sk, "head")) + ax[0] * ofs.z + ax[1] * ofs.y + ax[2] * ofs.x

## 讓臉朝向 target：先左右（繞垂直軸）、再上下（繞頭的左右軸），不會歪頭；脖子分 neck_share
## extra_pitch：再多抬頭（正）或低頭（負）幾度
static func aim_head(sk: Skeleton3D, corr: Dictionary, target: Vector3, neck_share := 0.4, max_deg := 55.0, extra_pitch := 0.0) -> void:
	var world := pose_world(sk)
	var nk := Retarget._idx(sk, "neck")
	var hd := Retarget._idx(sk, "head")
	var ax := head_axes(sk, corr, world)
	var f: Vector3 = ax[0]
	var eye := head_point(sk, corr, world, Vector3(0, 0.045, 0.08))
	var want := (target - eye).normalized()
	var fh := Vector3(f.x, 0, f.z).normalized()
	var wh := Vector3(want.x, 0, want.z).normalized()
	var yaw := clampf(fh.signed_angle_to(wh, Vector3.UP), -deg_to_rad(max_deg), deg_to_rad(max_deg))
	var pitch := asin(clampf(want.y, -1, 1)) - asin(clampf(f.y, -1, 1)) + deg_to_rad(extra_pitch)
	pitch = clampf(pitch, -deg_to_rad(max_deg), deg_to_rad(max_deg))
	var R1 := Basis(Vector3.UP, yaw)
	var side := (R1 * fh).cross(Vector3.UP).normalized()   # 臉的右手邊；繞它轉正角＝抬頭
	var R := Basis(Quaternion(side, pitch)) * R1
	var q := R.get_rotation_quaternion()
	_rot_chain(sk, world, nk, Basis(Quaternion.IDENTITY.slerp(q, neck_share)))
	_rot_chain(sk, world, hd, Basis(Quaternion.IDENTITY.slerp(q, 1.0 - neck_share)))
	apply_world(sk, world, true)

## 手臂兩節 IK：手腕到 H，手肘往 pole 方向（world 會被改，呼叫者最後 apply_world）
static func ik_arm(sk: Skeleton3D, world: Dictionary, side: String, H: Vector3, pole: Vector3) -> void:
	apply_world(sk, world, true)
	var arm := Retarget._idx(sk, side + "arm")
	var fore := Retarget._idx(sk, side + "forearm")
	var hand := Retarget._idx(sk, side + "hand")
	var S := bone_pos(sk, arm)
	var l1 := S.distance_to(bone_pos(sk, fore))
	var l2 := bone_pos(sk, fore).distance_to(bone_pos(sk, hand))
	var E := _elbow(S, H, l1, l2, pole)
	_point_bone(sk, world, arm, fore, E - S)
	_point_bone(sk, world, fore, hand, H - E)

## 手掌：手指指向 fdir，手心朝 palm（世界方向）
static func aim_hand(sk: Skeleton3D, world: Dictionary, side: String, fdir: Vector3, palm: Vector3) -> void:
	var hand := Retarget._idx(sk, side + "hand")
	var mid := Retarget._idx(sk, side + "handmiddle1")
	_point_bone(sk, world, hand, mid, fdir)
	var a: Vector3 = ((world[hand] as Basis) * sk.get_bone_rest(mid).origin).normalized()
	var n := _palm_normal(sk, world, side)
	var pp := palm - a * palm.dot(a)
	if pp.length() < 0.05:
		return
	_rot_chain(sk, world, hand, Basis(Quaternion(a, n.signed_angle_to(pp.normalized(), a))))

## 手心方向（世界）：由食指根、小指根、中指根算
static func _palm_normal(sk: Skeleton3D, world: Dictionary, side: String) -> Vector3:
	var hand := Retarget._idx(sk, side + "hand")
	var hb: Basis = world[hand]
	var a := (hb * sk.get_bone_rest(Retarget._idx(sk, side + "handmiddle1")).origin).normalized()
	var s := hb * (sk.get_bone_rest(Retarget._idx(sk, side + "handindex1")).origin - sk.get_bone_rest(Retarget._idx(sk, side + "handpinky1")).origin)
	var n := a.cross(s).normalized()
	return n if side == "left" else -n

## 手指往手心彎：degs＝第 1、2、3 節角度；thumb＝拇指每節角度（0＝不動）
static func curl_fingers(sk: Skeleton3D, world: Dictionary, side: String, degs: Array, thumb := 0.0) -> void:
	var hand := Retarget._idx(sk, side + "hand")
	var n := _palm_normal(sk, world, side)
	for c in sk.get_bone_children(hand):
		var nm := Retarget.norm(sk.get_bone_name(c))
		var is_thumb := nm.contains("thumb")
		var f := c
		var k := 0
		while f >= 0 and k < 3:
			var kids := sk.get_bone_children(f)
			if kids.is_empty():
				break
			var d: Vector3 = ((world[f] as Basis) * sk.get_bone_rest(kids[0]).origin).normalized()
			var ax := d.cross(n).normalized()
			var deg: float = thumb if is_thumb else float(degs[k])
			if deg != 0.0 and ax.length() > 0.5:
				_rot_chain(sk, world, f, Basis(Quaternion(ax, deg_to_rad(deg))))
			f = kids[0]
			k += 1

## 腳穿進地板時：小腿往前伸一點，讓腳底抬高 lift（世界單位）；屁股不動
static func lift_feet(sk: Skeleton3D, lift: float) -> void:
	if lift <= 0.002:
		return
	var world := pose_world(sk)
	var kleft := _left(sk)
	var kfwd := kleft.cross(Vector3.UP).normalized()
	for side in ["left", "right"]:
		var leg := Retarget._idx(sk, side + "leg")
		var foot := Retarget._idx(sk, side + "foot")
		var K := bone_pos(sk, leg)
		var F := bone_pos(sk, foot)
		var shin := (F - K).normalized()
		var h := K.y - F.y + 0.05   # 膝蓋到腳底（腳踝下約 5 公分）
		var a0 := acos(clampf((K.y - F.y) / K.distance_to(F), -1, 1))   # 小腿目前離垂直多少
		var a1 := acos(clampf((h - lift - 0.05) / K.distance_to(F), -1, 1))
		var ang := maxf(a1 - a0, 0.0)
		var ax := shin.cross(kfwd).normalized()
		_rot_chain(sk, world, leg, Basis(Quaternion(ax, ang)))
		_rot_chain(sk, world, foot, Basis(Quaternion(ax, -ang)))   # 腳掌轉回原本角度（不踮腳）
	apply_world(sk, world, true)


# ───────── 量測：手的蒙皮頂點（擺手用「量的」，不用猜的） ─────────

static var _hp_cache := {}

static func _skinned_meshes(sk: Skeleton3D) -> Array:
	var arr := []
	_collect_skinned(sk, arr)
	if arr.is_empty() and sk.get_parent():
		_collect_skinned(sk.get_parent(), arr)
	return arr

## 手（含前臂）的蒙皮頂點，世界座標，依「權重最大的骨頭」分組：{骨名: Array[Vector3]}
## 骨名例：lefthand（手掌）、lefthandindex1~3、leftforearm；forearm=false 時不含前臂
## dense=true：每個三角形再加重心與三邊中點（頂點之間的面也量得到）
static func hand_points(sk: Skeleton3D, side: String, forearm := false, dense := false) -> Dictionary:
	var out := {}
	for it in _hp_skinned(sk, side):
		var names: Array = it[0]
		var Q: PackedVector3Array = it[1]
		var T: PackedInt32Array = it[2]
		for j in Q.size():
			var nm: String = names[j]
			if not forearm and nm.ends_with("forearm"):
				continue
			if not out.has(nm):
				out[nm] = []
			out[nm].append(Q[j])
		if dense:
			for ti in range(0, T.size(), 3):
				var nm: String = names[T[ti]]
				if not forearm and nm.ends_with("forearm"):
					continue
				var a := Q[T[ti]]
				var b := Q[T[ti + 1]]
				var c := Q[T[ti + 2]]
				out[nm].append((a + b + c) / 3.0)
				out[nm].append((a + b) * 0.5)
				out[nm].append((b + c) * 0.5)
				out[nm].append((c + a) * 0.5)
	return out

## 手的三角形（世界座標）：[[主骨名, a, b, c], …]
static func hand_tris(sk: Skeleton3D, side: String) -> Array:
	var out := []
	for it in _hp_skinned(sk, side):
		var names: Array = it[0]
		var Q: PackedVector3Array = it[1]
		var T: PackedInt32Array = it[2]
		for ti in range(0, T.size(), 3):
			out.append([names[T[ti]], Q[T[ti]], Q[T[ti + 1]], Q[T[ti + 2]]])
	return out

static func _hp_skinned(sk: Skeleton3D, side: String, keys := []) -> Array:
	if keys.is_empty():
		keys = [side + "hand", side + "forearm"]
	var res := []
	for mi: MeshInstance3D in _skinned_meshes(sk):
		var key := "%d_%d_%s" % [mi.get_instance_id(), mi.mesh.get_rid().get_id(), ",".join(keys)]
		if not _hp_cache.has(key):
			_hp_cache[key] = _hp_build(sk, mi, keys)
		var c: Dictionary = _hp_cache[key]
		var skin := mi.skin
		var bm := []
		for i in skin.get_bind_count():
			var bi := skin.get_bind_bone(i)
			if bi < 0:
				bi = sk.find_bone(skin.get_bind_name(i))
			bm.append(sk.global_transform * sk.get_bone_global_pose(bi) * skin.get_bind_pose(i))
		var P: PackedVector3Array = c["pos"]
		var B: PackedInt32Array = c["bones"]
		var W: PackedFloat32Array = c["wts"]
		var nb: int = c["nb"]
		var Q := PackedVector3Array()
		Q.resize(P.size())
		for j in P.size():
			var p := Vector3.ZERO
			for k in nb:
				var wt := W[j * nb + k]
				if wt > 0.0:
					p += ((bm[B[j * nb + k]] as Transform3D) * P[j]) * wt
			Q[j] = p
		res.append([c["names"], Q, c["tris"]])
	return res

static func _hp_build(sk: Skeleton3D, mi: MeshInstance3D, keys: Array) -> Dictionary:
	var skin := mi.skin
	var bn := []
	for i in skin.get_bind_count():
		var bi := skin.get_bind_bone(i)
		if bi < 0:
			bi = sk.find_bone(skin.get_bind_name(i))
		bn.append(Retarget.norm(sk.get_bone_name(bi)))
	var names := []
	var pos := PackedVector3Array()
	var bones := PackedInt32Array()
	var wts := PackedFloat32Array()
	var tris := PackedInt32Array()
	var nb := 4
	for s in mi.mesh.get_surface_count():
		var a := mi.mesh.surface_get_arrays(s)
		var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
		var B = a[Mesh.ARRAY_BONES]
		var W = a[Mesh.ARRAY_WEIGHTS]
		if B == null or B.size() == 0:
			continue
		nb = B.size() / V.size()
		var remap := {}
		for vi in V.size():
			var best := ""
			var bw := 0.0
			for k in nb:
				var wt: float = W[vi * nb + k]
				if wt > bw:
					bw = wt
					best = bn[B[vi * nb + k]]
			var hit := false
			for kk in keys:
				if best.begins_with(kk):
					hit = true
					break
			if not hit:
				continue
			remap[vi] = names.size()
			names.append(best)
			pos.append(V[vi])
			for k in nb:
				bones.append(B[vi * nb + k])
				wts.append(W[vi * nb + k])
		var I = a[Mesh.ARRAY_INDEX]
		if I != null:
			for ti in range(0, I.size(), 3):
				if remap.has(I[ti]) and remap.has(I[ti + 1]) and remap.has(I[ti + 2]):
					tris.append(remap[I[ti]])
					tris.append(remap[I[ti + 1]])
					tris.append(remap[I[ti + 2]])
	return {"names": names, "pos": pos, "bones": bones, "wts": wts, "nb": nb, "tris": tris}

## 手的座標軸（世界）：[a 手指方向（腕→中指根）, n 手心方向, t 拇指那一側]
static func hand_axes(sk: Skeleton3D, world: Dictionary, side: String) -> Array:
	var hand := Retarget._idx(sk, side + "hand")
	var a := ((world[hand] as Basis) * sk.get_bone_rest(Retarget._idx(sk, side + "handmiddle1")).origin).normalized()
	var n := _palm_normal(sk, world, side)
	var t := n.cross(a) if side == "left" else a.cross(n)
	return [a, n, t.normalized()]

## 手的描邊變細：整隻 Ken 的描邊是「把網格沿法線撐大」畫出來的（world.gd，約 12 mm），手指只有 12 mm 粗，
## 撐大的黑殼會蓋住手上拿的東西、穿進桌面。這裡把手（手掌＋手指）的描邊寬度乘 ratio，身體不變。
## 做法：把「手骨權重總和」寫進頂點顏色 R，換成讀頂點顏色的描邊材質（只改這個 MeshInstance）。回傳處理的頂點數
const HAND_OUTLINE_SHADER := """
shader_type spatial;
render_mode unshaded, cull_front;
uniform float width = 0.03;
uniform float hand_ratio = 0.25;
uniform vec4 ink : source_color = vec4(0.16, 0.13, 0.15, 1.0);
void vertex() { VERTEX += NORMAL * width * mix(1.0, hand_ratio, COLOR.r); }
void fragment() { ALBEDO = ink.rgb; }
"""

static func thin_hand_outline(root: Node, ratio := 0.25) -> int:
	var sk: Skeleton3D = Retarget.find_type(root, "Skeleton3D")
	var mis := []
	_collect_skinned(root, mis)
	var total := 0
	for mi: MeshInstance3D in mis:
		var ov := mi.material_overlay as ShaderMaterial
		if ov == null:
			continue
		var skin := mi.skin
		var is_hand := []
		for i in skin.get_bind_count():
			var bi := skin.get_bind_bone(i)
			var nm := Retarget.norm(sk.get_bone_name(bi)) if bi >= 0 else Retarget.norm(String(skin.get_bind_name(i)))
			is_hand.append(nm.begins_with("lefthand") or nm.begins_with("righthand"))
		var src: Mesh = mi.mesh
		var nm2 := ArrayMesh.new()
		for s in src.get_surface_count():
			var a := src.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var C := PackedColorArray()
			C.resize(V.size())
			var flags := 0
			if B != null and B.size() > 0:
				var nb: int = B.size() / V.size()
				if nb == 8:
					flags = Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS
				for vi in V.size():
					var hw := 0.0
					for k in nb:
						if is_hand[B[vi * nb + k]]:
							hw += W[vi * nb + k]
					C[vi] = Color(clampf(hw, 0.0, 1.0), 0, 0, 1)
					if hw > 0.5:
						total += 1
			else:
				C.fill(Color(0, 0, 0, 1))
			a[Mesh.ARRAY_COLOR] = C
			nm2.add_surface_from_arrays(src.surface_get_primitive_type(s), a, [], {}, flags)
			nm2.surface_set_material(s, src.surface_get_material(s))
		mi.mesh = nm2
		var m := ShaderMaterial.new()
		var sh := Shader.new()
		sh.code = HAND_OUTLINE_SHADER
		m.shader = sh
		m.set_shader_parameter("width", ov.get_shader_parameter("width"))
		m.set_shader_parameter("hand_ratio", ratio)
		mi.material_overlay = m
	return total


# ───────── 手和物品的接觸（課本、鉛筆、直笛）：全部用量到的手部網格算，不穿過物品 ─────────
# ken_openhand：兩隻手都是張開的手（右手＝左手的鏡射），手指可以彎 → 握筆用 hold_pencil_open、搭直笛用 hand_on_tube。
# 舊模型 ken_rigged：右手的網格是握拳（手指張不開），右手拿東西＝「拳頭靠著一根桿子」（fist_grip／hold_pencil）：
# 桿子卡在拇指和食指之間的凹槽（凹槽位置是量拳頭表面找到的）。

## 右手是不是舊的拳頭網格：看右手食指根離手腕多遠（拳頭的骨頭縮在一起；張開的手和左手一樣長）
static func right_is_fist(sk: Skeleton3D) -> bool:
	var r := sk.get_bone_rest(Retarget._idx(sk, "righthandindex1")).origin.length()
	var l := sk.get_bone_rest(Retarget._idx(sk, "lefthandindex1")).origin.length()
	return r < l * 0.85

## 右拳凹槽（右手座標 a,n,t；T-pose 量得）：C＝軸線上離手腕最近的點，D＝軸線方向（朝拇指側／手腕那端）
## 鉛筆（半徑 5 mm，量得離拳頭表面 ≥5.8 mm）；直笛（半徑 12.5 mm，量得 ≥13.3 mm）
const FIST_PENCIL_C := Vector3(0.0681, 0.0334, 0.0333)
const FIST_PENCIL_D := Vector3(-0.556, 0.413, 0.721)
const FIST_TUBE_C := Vector3(0.0473, 0.0421, 0.0368)
const FIST_TUBE_D := Vector3(-0.734, 0.286, 0.616)
const FIST_CENTER := Vector3(0.045, 0.0, 0.0)   # 拳頭中心（右手座標）
const PENCIL_R := 0.005
const RECORDER_R := 0.0125

## 手指回到「相對手掌的原始姿勢」（Mixamo 動作會動手指 → 右拳會變形、左手會亂彎）
static func reset_fingers(sk: Skeleton3D, world: Dictionary, corr: Dictionary, side: String) -> void:
	var hand := Retarget._idx(sk, side + "hand")
	var R: Basis = (world[hand] as Basis) * (corr[hand] as Basis).inverse()
	for c in sk.get_bone_children(hand):
		_reset_chain(sk, world, corr, c, R)

static func _reset_chain(sk: Skeleton3D, world: Dictionary, corr: Dictionary, b: int, R: Basis) -> void:
	world[b] = (R * (corr[b] as Basis)).orthonormalized()
	for c in sk.get_bone_children(b):
		_reset_chain(sk, world, corr, c, R)

## 單一手指（index/middle/ring/pinky/thumb）往手心彎：degs＝第 1、2、3 節角度
static func curl_finger(sk: Skeleton3D, world: Dictionary, side: String, finger: String, degs: Array) -> void:
	var n := _palm_normal(sk, world, side)
	var f := Retarget._idx(sk, "%shand%s1" % [side, finger])
	var k := 0
	while f >= 0 and k < 3:
		var kids := sk.get_bone_children(f)
		if kids.is_empty():
			break
		var d: Vector3 = ((world[f] as Basis) * sk.get_bone_rest(kids[0]).origin).normalized()
		var ax := d.cross(n)
		if float(degs[k]) != 0.0 and ax.length() > 0.3:
			_rot_chain(sk, world, f, Basis(Quaternion(ax.normalized(), deg_to_rad(float(degs[k])))))
		f = kids[0]
		k += 1

## 手指張開一點（食指往拇指側、無名指小指往外），deg＝食指角度
static func spread_fingers(sk: Skeleton3D, world: Dictionary, side: String, deg: float) -> void:
	var ax := hand_axes(sk, world, side)
	var axis: Vector3 = (ax[0] as Vector3).cross(ax[2]).normalized()   # 繞它轉正角＝a 往 t（拇指側）
	for it in [["index", 1.0], ["ring", -0.6], ["pinky", -1.3]]:
		var f := Retarget._idx(sk, "%shand%s1" % [side, it[0]])
		if f >= 0:
			_rot_chain(sk, world, f, Basis(Quaternion(axis, deg_to_rad(deg * float(it[1])))))

## 拇指指向（手座標 a,n,t 的方向）：整根拇指轉過去（最短弧）
static func aim_thumb(sk: Skeleton3D, world: Dictionary, side: String, dir_hand: Vector3) -> void:
	var ax := hand_axes(sk, world, side)
	_aim_thumb_world(sk, world, side, ax[0] * dir_hand.x + ax[1] * dir_hand.y + ax[2] * dir_hand.z)

static func _aim_thumb_world(sk: Skeleton3D, world: Dictionary, side: String, want: Vector3) -> void:
	var t1 := Retarget._idx(sk, side + "handthumb1")
	var chain := [t1]
	while not sk.get_bone_children(chain[-1]).is_empty():
		chain.append(sk.get_bone_children(chain[-1])[0])
	var cur := Vector3.ZERO   # 目前拇指方向：各節累加
	for i in range(chain.size() - 1):
		cur += (world[chain[i]] as Basis) * sk.get_bone_rest(chain[i + 1]).origin
	_rot_chain(sk, world, t1, _arc(cur, want))

## 點到線段的距離
static func seg_dist(p: Vector3, a: Vector3, b: Vector3) -> float:
	var ab := b - a
	var t := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
	return p.distance_to(a + ab * t)

## 量：手每一組（骨頭）頂點到線段 a–b 的最近距離 {骨名: 距離}，另有 "_min"
static func hand_line_clearance(sk: Skeleton3D, side: String, a: Vector3, b: Vector3) -> Dictionary:
	var hp := hand_points(sk, side, true, true)
	var out := {"_min": 9.0}
	for k in hp:
		var m := 9.0
		for p: Vector3 in hp[k]:
			m = minf(m, seg_dist(p, a, b))
		out[k] = m
		out["_min"] = minf(out["_min"], m)
	return out

## 量：手每一組頂點的最低高度 {骨名: y}，另有 "_min"
static func hand_low(sk: Skeleton3D, side: String, forearm := true) -> Dictionary:
	var hp := hand_points(sk, side, forearm, true)
	var out := {"_min": 9.0}
	for k in hp:
		var m := 9.0
		for p: Vector3 in hp[k]:
			m = minf(m, p.y)
		out[k] = m
		out["_min"] = minf(out["_min"], m)
	return out

## 右拳靠桿子：世界上的軸線過 P0、方向 D；拳頭凹槽軸線（手座標）hc、hd；繞桿子轉 roll
## 回傳手腕位置與手的方向 {"wrist","a","n","center"}
static func fist_frame(P0: Vector3, D: Vector3, hc: Vector3, hd: Vector3, roll: float) -> Dictionary:
	var Rr := Basis(D.normalized(), roll) * _arc(hd, D)
	return {"wrist": P0 - Rr * hc, "a": Rr * Vector3(1, 0, 0), "n": Rr * Vector3(0, 1, 0), "center": P0 + Rr * (FIST_CENTER - hc)}

## 找最自然的 roll：手腕彎最少、手腕到得了、拳頭在 prefer 那一側；套用到 world 並回傳 {"roll","bend","err","wrist","a","n"}
static func fist_grip(sk: Skeleton3D, world: Dictionary, side: String, P0: Vector3, D: Vector3, hc: Vector3, hd: Vector3, pole: Vector3, prefer: Vector3, prefer_w := 0.6, steps := 72) -> Dictionary:
	var best := {}
	var best_s := -1e9
	var fore := Retarget._idx(sk, side + "forearm")
	var hand := Retarget._idx(sk, side + "hand")
	for k in steps:
		var roll := TAU * k / steps
		var f := fist_frame(P0, D, hc, hd, roll)
		var w2 := world.duplicate()
		ik_arm(sk, w2, side, f["wrist"], pole)
		apply_world(sk, w2, true)
		var E := bone_pos(sk, fore)
		var Hp := bone_pos(sk, hand)
		var bend := rad_to_deg((Hp - E).normalized().angle_to(f["a"]))
		var err: float = Hp.distance_to(f["wrist"])
		var sd: float = ((f["center"] as Vector3) - P0).normalized().dot(prefer.normalized())
		var s := -bend / 60.0 - err * 80.0 + sd * prefer_w
		if s > best_s:
			best_s = s
			best = {"roll": roll, "bend": bend, "err": err, "wrist": f["wrist"], "a": f["a"], "n": f["n"], "side": sd}
	ik_arm(sk, world, side, best["wrist"], pole)
	aim_hand(sk, world, side, best["a"], best["n"])
	apply_world(sk, world, true)
	return best


## 身體某些部位的「高度圖」：骨名開頭是 keys 之一的頂點（含三角形中點），分成 cell 大小的格子記最高 y。
## 回傳 Callable(p) -> p 附近（3×3 格）表面最高 y；沒有東西回傳 -1e9。例：兩條大腿 ["leftupleg","rightupleg","leftleg","rightleg"]
static func height_map(sk: Skeleton3D, keys: Array, cell := 0.008) -> Callable:
	var grid := {}
	for it in _hp_skinned(sk, "", keys):
		var Q: PackedVector3Array = it[1]
		var T: PackedInt32Array = it[2]
		var pts := Array(Q)
		for ti in range(0, T.size(), 3):
			var a := Q[T[ti]]
			var b := Q[T[ti + 1]]
			var c := Q[T[ti + 2]]
			pts.append((a + b + c) / 3.0)
			pts.append((a + b) * 0.5)
			pts.append((b + c) * 0.5)
			pts.append((c + a) * 0.5)
		for q: Vector3 in pts:
			var k := Vector2i(floori(q.x / cell), floori(q.z / cell))
			if not grid.has(k) or grid[k] < q.y:
				grid[k] = q.y
	return func(p: Vector3) -> float:
		var k0 := Vector2i(floori(p.x / cell), floori(p.z / cell))
		var m := -1e9
		for dx in [-1, 0, 1]:
			for dz in [-1, 0, 1]:
				m = maxf(m, grid.get(k0 + Vector2i(dx, dz), -1e9))
		return m

## 量：手每一組頂點離表面多高（p.y − top(p)）{骨名: 間隙}，另有 "_min"（不含前臂）與 "_fore"（前臂）
static func hand_gap(sk: Skeleton3D, side: String, top: Callable) -> Dictionary:
	var hp := hand_points(sk, side, true, true)
	var out := {"_min": 9.0, "_fore": 9.0}
	for k in hp:
		var m := 9.0
		for p: Vector3 in hp[k]:
			m = minf(m, p.y - (top.call(p) as float))
		out[k] = m
		if (k as String).ends_with("forearm"):
			out["_fore"] = m
		else:
			out["_min"] = minf(out["_min"], m)
	return out

## 手放在某個表面上（課本、鍵盤、大腿）：center＝手掌中心要放的位置（只看水平），top＝Callable(p)->表面高度，
## fdir＝手指方向（水平；可帶一點上下當起始傾斜）。gap＝手最低點離表面多高；forearm_gap＝前臂（袖口）至少多高。
## 張開的手（fist=false）：擺平、拇指放平、手指微張 → 量整隻手把手腕升降到剛好 → 調前後傾讓掌根和指尖一樣低 →
##   每根手指各自彎到貼著表面。拳頭（fist=true，右手）：只升降，不動手指。
## 回傳量到的間隙（各部位離表面多高）
static func rest_hand_on(sk: Skeleton3D, corr: Dictionary, side: String, center: Vector3, top: Callable, fdir: Vector3, pole: Vector3, gap := 0.004, forearm_gap := 0.008, fist := false, curl_max := 50.0, spread := 7.0, thumb_dir := Vector3(0.74, -0.22, 0.64), drape := false) -> Dictionary:
	## drape＝true（水鈴：大泡泡袖）：袖子先靠在表面上，手再往下垂到手指／手掌剛好碰到（手腕往下彎，不彎手指）
	var world := pose_world(sk)
	var pitch := asin(clampf(-fdir.normalized().y, -0.7, 0.7))
	fdir.y = 0
	fdir = fdir.normalized()
	var hand := Retarget._idx(sk, side + "hand")
	var mid1 := Retarget._idx(sk, side + "handmiddle1")
	var palm_len := bone_pos(sk, mid1).distance_to(bone_pos(sk, hand))
	var wy: float = (top.call(center) as float) + 0.04
	var rep := {}
	for it in (24 if drape else 10):
		var a := (fdir * cos(pitch) - Vector3.UP * sin(pitch)).normalized()
		var H := center - fdir * palm_len * 0.75
		H.y = wy
		ik_arm(sk, world, side, H, pole)
		aim_hand(sk, world, side, a, Vector3.DOWN)
		reset_fingers(sk, world, corr, side)
		if not fist:
			aim_thumb(sk, world, side, thumb_dir)   # 拇指放平（原本往手心翹 4 公分）
			if spread != 0.0:
				spread_fingers(sk, world, side, spread)
		apply_world(sk, world, true)
		var g := hand_gap(sk, side, top)
		var palm_g: float = g.get(side + "hand", 9.0)
		var tip_g := 9.0
		for k in g:
			if (k as String).ends_with("3") and not (k as String).contains("thumb"):
				tip_g = minf(tip_g, g[k])
		rep = {"wrist_err": bone_pos(sk, hand).distance_to(H), "pitch_deg": rad_to_deg(pitch)}
		if it % 2 == 0 or fist:
			wy += maxf(gap - g["_min"], forearm_gap - g["_fore"])   # 手剛好貼著；袖口至少高 forearm_gap
		elif drape:
			pitch = clampf(pitch + atan((g["_min"] - gap) / (palm_len * 1.6)) * 0.8, deg_to_rad(-25.0), deg_to_rad(80.0))
		else:
			pitch = clampf(pitch + atan((tip_g - palm_g) / 0.1), deg_to_rad(-25.0), deg_to_rad(35.0))
	var curls := {}
	if not fist and curl_max > 0.0:   # 每根手指各自往下彎到貼著表面（二分法）；水鈴的手不能彎（curl_max=0）
		for f in ["index", "middle", "ring", "pinky"]:
			var lo := 0.0
			var hi := curl_max
			for it in 6:
				var mid := (lo + hi) * 0.5
				var w2 := world.duplicate()
				curl_finger(sk, w2, side, f, [mid, mid * 0.45, mid * 0.3])
				apply_world(sk, w2, true)
				var fl := 9.0
				var g2 := hand_gap(sk, side, top)
				for k in g2:
					if (k as String).contains(f):
						fl = minf(fl, g2[k])
				if fl >= gap:
					lo = mid
				else:
					hi = mid
			if lo > curl_max - 2.0:   # 彎到底都碰不到（手指下面沒有東西，例如伸出大腿邊緣）→ 只自然微彎
				lo = 12.0
			curls[f] = lo
			curl_finger(sk, world, side, f, [lo, lo * 0.45, lo * 0.3])
	apply_world(sk, world, true)
	var g3 := hand_gap(sk, side, top)
	for k in g3:
		rep[k] = g3[k]
	rep["curl"] = curls
	return rep

## 平面版（課本）：top_y＝平面高度
static func rest_hand_flat(sk: Skeleton3D, corr: Dictionary, side: String, center: Vector3, top_y: float, fdir: Vector3, pole: Vector3, gap := 0.004, forearm_gap := 0.008) -> Dictionary:
	return rest_hand_on(sk, corr, side, center, func(_p: Vector3) -> float: return top_y, fdir, pole, gap, forearm_gap)

## 右手（拳頭）握鉛筆寫字：tip＝筆尖碰紙的點，up_dir＝筆桿方向（筆尖 → 橡皮擦），lift＝拳頭最低點至少離紙面多高
## 鉛筆卡在拇指和食指之間的凹槽；握的位置沿筆桿往上移，直到拳頭夠高。
## 回傳 {"xf": 鉛筆 Transform（原點＝筆尖、+Y 朝橡皮擦）, "grip": 握點離筆尖, "low": 手最低點離紙面, "clear": 手到筆桿軸心最近距離, …}
static func hold_pencil(sk: Skeleton3D, corr: Dictionary, side: String, tip: Vector3, up_dir: Vector3, pole: Vector3, prefer: Vector3, lift := 0.008, pencil_len := 0.16) -> Dictionary:
	var world := pose_world(sk)
	reset_fingers(sk, world, corr, side)
	var D := up_dir.normalized()
	var s_grip := 0.085
	var rep := {}
	for it in 6:
		var g := fist_grip(sk, world, side, tip + D * s_grip, D, FIST_PENCIL_C, FIST_PENCIL_D, pole, prefer)
		var low: float = hand_low(sk, side, true)["_min"]
		rep = {"grip": s_grip, "low": low - tip.y, "bend": g["bend"], "wrist_err": g["err"], "roll": rad_to_deg(g["roll"])}
		var need := tip.y + lift - low
		if absf(need) < 0.0008 or (need < 0.0 and s_grip <= 0.081):
			break
		s_grip = clampf(s_grip + need / maxf(D.y, 0.3), 0.08, pencil_len - 0.02)
	var cl := hand_line_clearance(sk, side, tip, tip + D * pencil_len)
	rep["clear"] = cl["_min"]
	rep["clear_all"] = cl
	var x := D.cross(Vector3.FORWARD).normalized()
	rep["xf"] = Transform3D(Basis(x, D, x.cross(D)).orthonormalized(), tip)
	return rep

## 張開的右手握鉛筆寫字（三指握筆）：鉛筆從虎口斜斜穿到食指指腹下面；食指從上面壓著、中指在下面托著、拇指從旁邊夾住，
## 無名指和小指彎起來，手的小指側輕靠在紙上。握點、虎口位置是手座標（a 手指方向、n 手心方向、t 拇指側；T-pose 量得）。
const TRIPOD_Q := Vector3(0.135, 0.032, 0.022)    # 握點：食指指腹下面
const TRIPOD_W := Vector3(0.085, -0.002, 0.044)   # 虎口：筆桿靠在食指根旁邊
const TRIPOD_MIDDLE_CURL := [35.0, 50.0, 35.0]    # 中指三節彎的角度

## tip＝筆尖碰紙的點，up_dir＝筆桿方向（筆尖 → 橡皮擦），lift＝手最低點至少離紙面多高（很小＝輕靠在紙上）
## 回傳 {"xf": 鉛筆 Transform（原點＝筆尖、+Y 朝橡皮擦）, "grip": 握點離筆尖, "low": 手最低點離紙面, "clear": 手到筆桿軸心最近距離, …}
static func hold_pencil_open(sk: Skeleton3D, corr: Dictionary, side: String, tip: Vector3, up_dir: Vector3, pole: Vector3, prefer: Vector3, lift := 0.002, pencil_len := 0.16, grip0 := 0.05, tq := TRIPOD_Q, tw := TRIPOD_W, grip_max := 0.085, r_pen := PENCIL_R, lift_forearm := true) -> Dictionary:
	## tq／tw：握點、虎口（手座標；圳寶的手比較大，另外量）；grip_max：握點離筆尖最遠
	var world := pose_world(sk)
	reset_fingers(sk, world, corr, side)
	var D := up_dir.normalized()
	var hd := (tw - tq).normalized()
	var s_grip := grip0
	var end := tip + D * pencil_len
	var r := r_pen
	fist_grip(sk, world, side, tip + D * s_grip, D, tq, hd, pole, prefer)
	# 手指：無名指、小指彎起來收好；拇指先張開；食指、中指各自彎到剛好碰到筆桿（二分法，用量的）
	curl_finger(sk, world, side, "ring", [58.0, 72.0, 45.0])
	curl_finger(sk, world, side, "pinky", [62.0, 75.0, 45.0])
	aim_thumb(sk, world, side, Vector3(0.8, 0.0, 0.6))
	var curls := {}
	# 中指：彎一半，再往拇指側靠，直到側面托住筆桿（二分法）
	curl_finger(sk, world, side, "middle", TRIPOD_MIDDLE_CURL)
	var m1 := Retarget._idx(sk, side + "handmiddle1")
	var axm := hand_axes(sk, world, side)
	var sp_axis: Vector3 = (axm[0] as Vector3).cross(axm[2]).normalized()
	var slo := 0.0
	var shi := 22.0
	for j in 7:
		var smid := (slo + shi) * 0.5
		var w2 := world.duplicate()
		_rot_chain(sk, w2, m1, Basis(Quaternion(sp_axis, deg_to_rad(smid))))
		apply_world(sk, w2, true)
		if _finger_clear(sk, side, "middle", tip, end) >= r + 0.0006:
			slo = smid
		else:
			shi = smid
	_rot_chain(sk, world, m1, Basis(Quaternion(sp_axis, deg_to_rad(slo))))
	curls["middle_side"] = slo
	for it in [["index", 62.0, [0.75, 1.0, 0.7]]]:
		var f: String = it[0]
		var k: Array = it[2]
		var lo := 0.0
		var hi: float = it[1]
		var w_hi := world.duplicate()
		curl_finger(sk, w_hi, side, f, [hi * k[0], hi * k[1], hi * k[2]])
		apply_world(sk, w_hi, true)
		if _finger_clear(sk, side, f, tip, end) >= r + 0.0006:
			lo = hi   # 彎到底都不會碰到 → 就彎到底
		else:
			for j in 7:
				var mid := (lo + hi) * 0.5
				var w2 := world.duplicate()
				curl_finger(sk, w2, side, f, [mid * k[0], mid * k[1], mid * k[2]])
				apply_world(sk, w2, true)
				if _finger_clear(sk, side, f, tip, end) >= r + 0.0006:
					lo = mid
				else:
					hi = mid
		curls[f] = lo
		curl_finger(sk, world, side, f, [lo * k[0], lo * k[1], lo * k[2]])
	# 拇指：掃描方向，挑「不碰筆桿、指尖最靠近握點」的
	apply_world(sk, world, true)
	var ax0 := hand_axes(sk, world, side)
	var rest_dir: Vector3 = ((ax0[0] as Vector3) * 0.8 + (ax0[2] as Vector3) * 0.6).normalized()
	var perp := rest_dir.cross(ax0[1]).normalized()
	var tip_b := Retarget._idx(sk, side + "handthumb4")
	var P0 := tip + D * s_grip
	var bt := {}
	for ia in 8:
		for ib in 16:
			var ang := deg_to_rad(10.0 * ia)
			var dir := Basis(Quaternion(rest_dir, TAU * ib / 16.0)) * (Basis(Quaternion(perp, ang)) * rest_dir)
			var w2 := world.duplicate()
			_aim_thumb_world(sk, w2, side, dir)
			apply_world(sk, w2, true)
			var cl := _finger_clear(sk, side, "thumb", tip, end)
			if cl < r + 0.0006:
				continue
			var sc := -bone_pos(sk, tip_b).distance_to(P0 + D * 0.012) - (cl - r) * 2.0
			if bt.is_empty() or sc > bt["score"]:
				bt = {"score": sc, "dir": dir, "clear": cl}
			if ia == 0:
				break
	if not bt.is_empty():
		_aim_thumb_world(sk, world, side, bt["dir"])
	apply_world(sk, world, true)
	# 手的高度：最低點離紙面 lift（太低就握高一點、太高就握低一點）
	var rep := {}
	for it in 6:
		var g := fist_grip(sk, world, side, tip + D * s_grip, D, tq, hd, pole, prefer)
		var low: float = hand_low(sk, side, lift_forearm)["_min"]   # 圳寶前臂很粗、伸到桌子外面：只看手
		rep = {"grip": s_grip, "low": low - tip.y, "bend": g["bend"], "wrist_err": g["err"], "roll": rad_to_deg(g["roll"])}
		var need := tip.y + lift - low
		if absf(need) < 0.0008:
			break
		var s2 := clampf(s_grip + need / maxf(D.y, 0.3), 0.035, grip_max)
		if absf(s2 - s_grip) < 0.0003:
			break
		s_grip = s2
	var cl2 := hand_line_clearance(sk, side, tip, end)
	rep["clear"] = cl2["_min"]
	rep["clear_all"] = cl2
	rep["curl"] = curls
	rep["thumb_gap"] = (bt.get("clear", 9.0) as float) - r
	var x := D.cross(Vector3.FORWARD).normalized()
	rep["xf"] = Transform3D(Basis(x, D, x.cross(D)).orthonormalized(), tip)
	return rep


# ───────── 吉祥物（水鈴、圳寶）坐姿：程式擺，不用 Mixamo 的腿 ─────────
# 吉祥物腿很短、Tripo 腳趾骨頭方向和 Mixamo 不同 → Mixamo 坐姿的腳會轉歪、踮腳。
# 這裡腿從「綁骨時的站姿」出發：大腿往前抬 thigh_deg、小腿往回 knee_deg（90/90＝大腿水平、小腿垂直、腳掌和站著時一樣平）。
# 上半身：corr（T-pose）＋兩手放下（pose_stand 的做法），之後再用 ik_arm／rest_hand_on 擺手。

static func _is_leg(nm: String) -> bool:
	return nm.contains("upleg") or nm.ends_with("leg") or nm.contains("foot") or nm.contains("toe")

## 回傳 world（骨頭世界旋轉）；已套用到 sk（不保留 Hips 位移：臀部在站姿高度，呼叫者自己搬整個角色）
static func pose_sit_simple(sk: Skeleton3D, corr: Dictionary, thigh_deg := 90.0, knee_deg := 90.0, spread_deg := 6.0, lean_deg := 0.0) -> Dictionary:
	sk.reset_bone_poses()
	var rest := pose_world(sk)
	pose_stand(sk, corr)
	var world := pose_world(sk)
	for b in world:
		if _is_leg(Retarget.norm(sk.get_bone_name(b))):
			world[b] = rest[b]
	apply_world(sk, world)
	var kleft := _left(sk)
	for side in ["left", "right"]:
		var sgn := 1.0 if side == "left" else -1.0
		var up := Retarget._idx(sk, side + "upleg")
		var lg := Retarget._idx(sk, side + "leg")
		_rot_chain(sk, world, up, Basis(Quaternion(kleft, -deg_to_rad(thigh_deg))))
		_rot_chain(sk, world, up, Basis(Quaternion(Vector3.UP, sgn * deg_to_rad(spread_deg))))   # 膝蓋稍微分開
		_rot_chain(sk, world, lg, Basis(Quaternion(kleft, deg_to_rad(knee_deg))))
		var ft := Retarget._idx(sk, side + "foot")   # 腳掌轉回和站姿一樣（腳尖朝前、腳底平）
		_rot_chain(sk, world, ft, Basis(Quaternion(kleft, deg_to_rad(thigh_deg - knee_deg))))
		_rot_chain(sk, world, ft, Basis(Quaternion(Vector3.UP, -sgn * deg_to_rad(spread_deg))))
	if lean_deg != 0.0:   # 上半身往前傾（正）／往後靠（負）
		var sp := Retarget._idx(sk, "spine")
		_rot_chain(sk, world, sp, Basis(Quaternion(kleft, deg_to_rad(lean_deg))))
	apply_world(sk, world)
	return world



# ───────── 坐下時的裙子（水鈴）：遊戲裡她每次坐下都呼叫 settle_skirt ─────────
# 問題：Tripo 把裙子綁在大腿骨上，大腿往前抬 90° 時，腰前面的裙子會翻起來立在肚子前、後面的裙子轉到屁股下面穿進椅子。
# 做法（全部用蒙皮後的實際頂點，烤成一個靜態網格蓋在原本的模型上；站起來時 unsettle_skirt 換回來）：
#  1. 裙子頂點＝靜止姿勢下「主骨是 臀／大腿／小腿」、高度在 0.17～0.5、離腿骨軸 > 7.5 cm 的頂點（模型高 1.2 時的數字，依模型高度縮放）。
#  2. 前面、側面的裙子：從大腿頂那條摺線往前「攤」在大腿上；腿外面沒有腿撐著的布慢慢往下垂（連續的權重，沒有硬切口）。
#     後面的裙子照站姿垂下。前後用 smoothstep 混合。
#  3. 穿進椅面／椅背的布用平滑的「軟地板」函數推出去：表面上方 band 以內也一起慢慢抬（沒有折角），頂點順序不變。
#  4. 臀部、腿、裙子的描邊改成手的粗細（壓扁的布內外層很近，粗描邊會透出黑塊）。

const SKIRT_REF_H := 1.2   # 上面的公尺數是在這個身高量的

static func _skin_data(sk: Skeleton3D, mi: MeshInstance3D, rest := false) -> Array:
	var skin := mi.skin
	var bm := []
	var nm := []
	for i in skin.get_bind_count():
		var bi := skin.get_bind_bone(i)
		if bi < 0:
			bi = sk.find_bone(skin.get_bind_name(i))
		var g: Transform3D = sk.get_bone_global_rest(bi) if rest else sk.get_bone_global_pose(bi)
		bm.append(sk.global_transform * g * skin.get_bind_pose(i))
		nm.append(Retarget.norm(sk.get_bone_name(bi)))
	return [bm, nm]

## 裙子遮罩（第一次呼叫時算好，存在 MeshInstance3D 的 meta "skirt"）：{mask, f（跟大腿轉幾成）, lower（臀腿頂點）}
static func skirt_info(model: Node3D, height := SKIRT_REF_H) -> Array:
	var sk: Skeleton3D = Retarget.find_type(model, "Skeleton3D")
	var k := height / SKIRT_REF_H
	var out := []
	# 用模型自己的座標（fit_model：腳底在原點、不管角色現在站哪裡、轉向哪裡）
	var gi := model.global_transform.affine_inverse() * sk.global_transform
	var ax := []
	for sd in ["left", "right"]:
		ax.append([gi * sk.get_bone_global_rest(Retarget._idx(sk, sd + "upleg")).origin, gi * sk.get_bone_global_rest(Retarget._idx(sk, sd + "leg")).origin])
	var hip_y: float = (ax[0][0] as Vector3).y
	var to_local := model.global_transform.affine_inverse()
	for mi: MeshInstance3D in _skinned_meshes(sk):
		if mi.has_meta("skirt"):
			out.append(mi)
			continue
		var sd := _skin_data(sk, mi, true)
		var bm: Array = sd[0]
		var bn: Array = sd[1]
		var mask := PackedByteArray()
		var ff := PackedFloat32Array()
		var lw := PackedByteArray()
		for s in mi.mesh.get_surface_count():
			var a := mi.mesh.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var nb: int = B.size() / V.size()
			for vi in V.size():
				var p := Vector3.ZERO
				var best := ""
				var bw := 0.0
				for j in nb:
					var wt: float = W[vi * nb + j]
					if wt > 0.0:
						p += ((bm[B[vi * nb + j]] as Transform3D) * V[vi]) * wt
					if wt > bw:
						bw = wt
						best = bn[B[vi * nb + j]]
				p = to_local * p
				var y := p.y
				var d := 9.0
				for q in ax:
					d = minf(d, seg_dist(p, q[0], q[1]))
				var isk := (best == "hips" or best.ends_with("upleg") or best.ends_with("leg")) and y > 0.17 * k and y < 0.5 * k and d > 0.075 * k
				mask.append(1 if isk else 0)
				ff.append(smoothstep(hip_y + 0.02 * k, hip_y - 0.1 * k, y))
				lw.append(1 if (best == "hips" or best.ends_with("upleg")) else 0)
		mi.set_meta("skirt", {"mask": mask, "f": ff, "lower": lw, "k": k})
		out.append(mi)
	return out

## 腿（不含裙子）表面高度圖（世界）：沒有腿的地方 -1e9
static func _leg_top_map(sk: Skeleton3D, meshes: Array, cell := 0.01) -> Callable:
	var grid := {}
	for mi: MeshInstance3D in meshes:
		var info: Dictionary = mi.get_meta("skirt")
		var mask: PackedByteArray = info["mask"]
		var sd := _skin_data(sk, mi)
		var bm: Array = sd[0]
		var bn: Array = sd[1]
		var base := 0
		for s in mi.mesh.get_surface_count():
			var a := mi.mesh.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var nb: int = B.size() / V.size()
			for vi in V.size():
				if mask[base + vi] == 1:
					continue
				var p := Vector3.ZERO
				var best := ""
				var bw := 0.0
				for j in nb:
					var wt: float = W[vi * nb + j]
					if wt > 0.0:
						p += ((bm[B[vi * nb + j]] as Transform3D) * V[vi]) * wt
					if wt > bw:
						bw = wt
						best = bn[B[vi * nb + j]]
				if best == "hips" or best.contains("leg"):
					var key := Vector2i(floori(p.x / cell), floori(p.z / cell))
					if not grid.has(key) or grid[key] < p.y:
						grid[key] = p.y
			base += V.size()
	return func(p: Vector3) -> float:
		var k0 := Vector2i(floori(p.x / cell), floori(p.z / cell))
		var m := -1e9
		for dx in [-1, 0, 1]:
			for dz in [-1, 0, 1]:
				m = maxf(m, grid.get(k0 + Vector2i(dx, dz), -1e9))
		return m

## 坐下時某個 MeshInstance 所有頂點的位置、法線（世界）；裙子頂點用「攤在腿上／垂下」的形狀
static func skirt_sit_mesh(sk: Skeleton3D, mi: MeshInstance3D, legtop: Callable) -> Array:
	var info: Dictionary = mi.get_meta("skirt")
	var mask: PackedByteArray = info["mask"]
	var ff: PackedFloat32Array = info["f"]
	var k: float = info["k"]
	var sd := _skin_data(sk, mi)
	var bm: Array = sd[0]
	var bn: Array = sd[1]
	var ba := []   # 腿用靜止姿勢（＝沒抬腿時裙子的樣子）
	var sr := _skin_data(sk, mi, true)
	for i in bm.size():
		var nm: String = bn[i]
		var leg := nm.contains("upleg") or nm.ends_with("leg") or nm.contains("foot") or nm.contains("toe")
		ba.append(sr[0][i] if leg else bm[i])
	var JL := bone_pos(sk, Retarget._idx(sk, "leftupleg"))
	var JR := bone_pos(sk, Retarget._idx(sk, "rightupleg"))
	var J := (JL + JR) * 0.5
	var kl := JL - JR
	kl.y = 0
	var half := kl.length() * 0.5   # 大腿中心離中線多遠
	kl = kl.normalized()
	var kf := kl.cross(Vector3.UP).normalized()   # 角色前方
	var Rn := Basis(Quaternion(kl, -PI / 2))
	var P := PackedVector3Array()
	var N := PackedVector3Array()
	var H := PackedVector3Array()   # 沒攤開前（垂下）的位置
	var WF := PackedFloat32Array()  # 攤開的程度（前面 1、後面 0）
	var base := 0
	for s in mi.mesh.get_surface_count():
		var a := mi.mesh.surface_get_arrays(s)
		var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
		var NN: PackedVector3Array = a[Mesh.ARRAY_NORMAL]
		var B = a[Mesh.ARRAY_BONES]
		var W = a[Mesh.ARRAY_WEIGHTS]
		var nb: int = B.size() / V.size()
		for vi in V.size():
			var isk := mask[base + vi] == 1
			var p := Vector3.ZERO
			var n := Vector3.ZERO
			for j in nb:
				var wt: float = W[vi * nb + j]
				if wt > 0.0:
					var tf: Transform3D = (ba if isk else bm)[B[vi * nb + j]]
					p += (tf * V[vi]) * wt
					n += (tf.basis * NN[vi]) * wt
			H.append(p)
			WF.append(0.0)
			if isk:
				var rel := p - J
				var fz := rel.dot(kf)                  # 前後（角色座標）
				var lx := rel.dot(kl)                  # 左右
				var wf := smoothstep(-0.12 * k, 0.04 * k, fz)   # 前面、側面＝1；後面＝0（垂下）；過渡帶寬，布才不會撕開
				WF[WF.size() - 1] = wf
				var ty: float = legtop.call(p)
				var Yp := maxf(ty, J.y) + 0.004
				if p.y < Yp and wf > 0.0:
					var dd := Yp - p.y
					var q := p + kf * dd
					# 腿撐著的程度：離最近那條大腿的中心越遠越少（連續，沒有硬切口）
					var support := 1.0 - smoothstep(0.045 * k, 0.11 * k, absf(absf(lx) - half))
					var droop := lerpf(0.75, 0.15, support)
					var t2: float = legtop.call(q)
					var bend := Vector3(q.x, maxf(Yp - dd * droop, t2 + 0.004), q.z)
					p = p.lerp(bend, wf)
					n = n.lerp(Rn * n, wf)
			P.append(p)
			N.append(n.normalized())
		base += V.size()
	return [P, N, H, WF]

## 把布推出方塊（椅面往上、椅背往前）：表面外 band 以內也一起平滑抬起（軟地板），沒有折角
static func _soft_push(p: Vector3, ab: AABB, dir: Vector3, gap: float, band: float) -> Vector3:
	var grown := ab.grow(gap + band)
	if not grown.has_point(p):
		return p
	if dir == Vector3.UP:
		# 椅面外面 band 以內也慢慢跟著抬：布從椅邊垂下去，沒有硬切口
		var ox := maxf(maxf(ab.position.x - gap - p.x, p.x - ab.end.x - gap), 0.0)
		var oz := maxf(maxf(ab.position.z - gap - p.z, p.z - ab.end.z - gap), 0.0)
		var w := 1.0 - smoothstep(0.0, band, sqrt(ox * ox + oz * oz))
		if w <= 0.0:
			return p
		var u := p.y - (ab.end.y + gap)
		if u < band:
			p.y = lerpf(p.y, ab.end.y + gap + band * log(1.0 + exp(4.0 * u / band)) / 4.0, w)
		return p
	var axis := 0 if absf(dir.x) > 0.5 else 2
	var sgn := signf(dir[axis])
	var face: float = (ab.end[axis] if sgn > 0 else ab.position[axis]) + sgn * gap
	if p.y > ab.end.y + gap or p.y < ab.position.y:
		return p
	var other := 2 if axis == 0 else 0
	if p[other] < ab.position[other] - gap or p[other] > ab.end[other] + gap:
		return p
	var u2 := (p[axis] - face) * sgn
	if u2 < band:
		p[axis] = face + sgn * band * log(1.0 + exp(4.0 * u2 / band)) / 4.0
	return p

const SKIRT_SMOOTH := 30   # 位移場平滑輪數
const RELAX_ITERS := 100    # 邊長放鬆輪數
const RELAX_HOPS := 4       # 裙子外面一起動的腿頂點：幾圈
const RELAX_MAX := 1.8      # 邊最多拉長幾倍（量的目標是 ≤ 2 倍）

## 靜止姿勢（綁骨時）每個頂點的世界位置
static func _rest_positions(sk: Skeleton3D, mi: MeshInstance3D) -> PackedVector3Array:
	var rest := _skin_data(sk, mi, true)
	var out := PackedVector3Array()
	for s in mi.mesh.get_surface_count():
		var a := mi.mesh.surface_get_arrays(s)
		var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
		var B = a[Mesh.ARRAY_BONES]
		var W = a[Mesh.ARRAY_WEIGHTS]
		var nb: int = B.size() / V.size()
		for vi in V.size():
			var q := Vector3.ZERO
			for j in nb:
				var wt: float = W[vi * nb + j]
				if wt > 0.0:
					q += ((rest[0][B[vi * nb + j]] as Transform3D) * V[vi]) * wt
			out.append(q)
	return out

## 同位置頂點（貼圖接縫）焊成一組，回傳 [每個頂點的組號, 每組的鄰居組號]；存在 meta 只算一次
static func _weld_adjacency(mi: MeshInstance3D) -> Array:
	if mi.has_meta("weld_adj"):
		return mi.get_meta("weld_adj")
	var key := {}
	var grp := PackedInt32Array()
	var nb := []
	var base := 0
	for s in mi.mesh.get_surface_count():
		var a := mi.mesh.surface_get_arrays(s)
		var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
		for vi in V.size():
			var kk := Vector3i(roundi(V[vi].x * 1e5), roundi(V[vi].y * 1e5), roundi(V[vi].z * 1e5))
			if not key.has(kk):
				key[kk] = nb.size()
				nb.append({})
			grp.append(key[kk])
		var I = a[Mesh.ARRAY_INDEX]
		if I != null:
			for ti in range(0, I.size(), 3):
				for e in 3:
					var g0: int = grp[base + I[ti + e]]
					var g1: int = grp[base + I[ti + (e + 1) % 3]]
					if g0 != g1:
						nb[g0][g1] = true
						nb[g1][g0] = true
		base += V.size()
	var nbr := []
	for d in nb:
		nbr.append(PackedInt32Array(d.keys()))
	var res := [grp, nbr]
	mi.set_meta("weld_adj", res)
	return res

## 她坐下時呼叫：boxes＝[[AABB, 推出方向（Vector3.UP＝椅面；±X/±Z＝椅背推向的方向）], …]（世界座標）
## 回傳報告；report["nodes"] 留給 unsettle_skirt 換回原模型
static func settle_skirt(model: Node3D, boxes: Array, gap := 0.003, band := 0.02, height := SKIRT_REF_H) -> Dictionary:
	var sk: Skeleton3D = Retarget.find_type(model, "Skeleton3D")
	var meshes := skirt_info(model, height)
	var legtop := _leg_top_map(sk, meshes)
	var rep := {"nodes": [], "moved": 0, "deepest": 0.0, "below": 0, "stretch_max": 0.0, "stretch_over2": 0, "skirt_pts": PackedVector3Array(), "skirt_tris": []}
	for mi: MeshInstance3D in meshes:
		var info: Dictionary = mi.get_meta("skirt")
		var mask: PackedByteArray = info["mask"]
		var lw: PackedByteArray = info["lower"]
		var r := skirt_sit_mesh(sk, mi, legtop)
		var P: PackedVector3Array = r[0]
		var NN: PackedVector3Array = r[1]
		var Hh: PackedVector3Array = r[2]
		var WF: PackedFloat32Array = r[3]
		# 位移場（攤開－垂下）在網格上平滑 SMOOTH 輪：相鄰頂點位移差不多 → 布是連續的、裙襬沒有鋸齒
		var adj := _weld_adjacency(mi)
		var grp: PackedInt32Array = adj[0]
		var nbr: Array = adj[1]
		var ng := nbr.size()
		var Dg := PackedVector3Array()
		Dg.resize(ng)
		var cnt := PackedInt32Array()
		cnt.resize(ng)
		var isk_g := PackedByteArray()
		isk_g.resize(ng)
		var wf_g := PackedFloat32Array()
		wf_g.resize(ng)
		for vi in P.size():
			var gi: int = grp[vi]
			Dg[gi] += P[vi] - Hh[vi]
			cnt[gi] += 1
			if mask[vi] == 1:
				isk_g[gi] = 1
				wf_g[gi] = maxf(wf_g[gi], WF[vi])
		for gi in ng:
			if cnt[gi] > 0:
				Dg[gi] /= float(cnt[gi])
		var Hg := PackedVector3Array()   # 每組的垂下位置
		Hg.resize(ng)
		for vi in P.size():
			Hg[grp[vi]] = Hh[vi]
		for it in SKIRT_SMOOTH:
			var D2 := Dg.duplicate()
			for gi in ng:
				if isk_g[gi] == 0 or (nbr[gi] as PackedInt32Array).is_empty():
					continue
				var avg := Vector3.ZERO
				for nj in nbr[gi]:
					avg += Dg[nj]
				avg /= float((nbr[gi] as PackedInt32Array).size())
				D2[gi] = Dg[gi].lerp(avg, 0.6)
			# 每一輪都套椅子的限制（不穿進椅面、椅背），被推的地方會帶著旁邊的布一起動
			for gi in ng:
				if isk_g[gi] == 0:
					continue
				var q := Hg[gi] + D2[gi]
				for bx in boxes:
					q = _soft_push(q, bx[0], bx[1], gap, band)
				D2[gi] = q - Hg[gi]
			Dg = D2
		var pts := PackedVector3Array()
		for vi in P.size():
			if mask[vi] != 1:
				continue
			var p0 := Hh[vi] + Dg[grp[vi]]
			var wl := smoothstep(0.3, 0.7, wf_g[grp[vi]])   # 攤在腿上的布不能沉進大腿（漸進，沒有硬切口）
			if wl > 0.0:
				var lt: float = legtop.call(p0)
				if lt > -1e8 and p0.y < lt + 0.004:
					p0.y = lerpf(p0.y, lt + 0.004, wl)
			P[vi] = p0
			var p := p0
			for it in 2:   # 兩輪：被椅背推出的點又進了椅面，再推一次
				for bx in boxes:
					p = _soft_push(p, bx[0], bx[1], gap, band)
			if p != p0:
				rep["moved"] += 1
				rep["deepest"] = maxf(rep["deepest"], p.distance_to(p0))
			P[vi] = p
			pts.append(p)
			for bx in boxes:
				if (bx[0] as AABB).has_point(p):
					rep["below"] += 1
		# 邊長放鬆（像布）：裙子和「接在裙子裡面的腿」（離裙子 RELAX_HOPS 圈以內的臀／大腿頂點）一起動，
		# 被拉長超過 RELAX_MAX 倍的邊往回收；每輪都再套椅子、大腿的限制（不穿進去）
		var R0v := _rest_positions(sk, mi)
		var Gp := PackedVector3Array()
		Gp.resize(ng)
		var Gr := PackedVector3Array()
		Gr.resize(ng)
		var low_g := PackedByteArray()
		low_g.resize(ng)
		for vi in P.size():
			Gp[grp[vi]] = P[vi]
			Gr[grp[vi]] = R0v[vi]
			if lw[vi] == 1:
				low_g[grp[vi]] = 1
		var mov := PackedByteArray()
		mov.resize(ng)
		var ring := []
		for gi in ng:
			if isk_g[gi] == 1:
				mov[gi] = 1
				ring.append(gi)
		for hop in RELAX_HOPS:   # 裙子外面再擴幾圈（接在裙子上的腿、腰頂點）
			var nxt := []
			for gi in ring:
				for nj in nbr[gi]:
					if mov[nj] == 0:   # 接在裙子上的頂點（大腿、小腿、腰）都一起動
						mov[nj] = 2
						nxt.append(nj)
			ring = nxt
		var edges := []
		for gi in ng:
			if mov[gi] == 0:
				continue
			for nj in nbr[gi]:
				if mov[nj] != 0 and nj < gi:
					continue
				edges.append([gi, nj, Gr[gi].distance_to(Gr[nj])])
		for it in RELAX_ITERS:
			for e in edges:
				var ia: int = e[0]
				var ib: int = e[1]
				var l0: float = e[2]
				if l0 < 1e-5:
					continue
				var d := Gp[ib] - Gp[ia]
				var l := d.length()
				var lim := RELAX_MAX * l0
				if l <= lim:
					continue
				var corr := d * ((l - lim) / l)
				if mov[ib] != 0:
					Gp[ia] += corr * 0.5
					Gp[ib] -= corr * 0.5
				else:
					Gp[ia] += corr
			for gi in ng:
				if mov[gi] == 0:
					continue
				var q := Gp[gi]
				if isk_g[gi] == 1:
					var wl2 := smoothstep(0.3, 0.7, wf_g[gi])
					if wl2 > 0.0:
						var lt2: float = legtop.call(q)
						if lt2 > -1e8 and q.y < lt2 + 0.004:
							q.y = lerpf(q.y, lt2 + 0.004, wl2)
				for bx in boxes:
					q = _soft_push(q, bx[0], bx[1], gap, band)
				Gp[gi] = q
		pts = PackedVector3Array()
		var below2 := 0
		for vi in P.size():
			if mov[grp[vi]] != 0:
				if mov[grp[vi]] == 2:
					rep["seam_move_max"] = maxf(rep.get("seam_move_max", 0.0), P[vi].distance_to(Gp[grp[vi]]))
				P[vi] = Gp[grp[vi]]
			if mask[vi] == 1:
				pts.append(P[vi])
				for bx in boxes:
					if (bx[0] as AABB).has_point(P[vi]):
						below2 += 1
		rep["below"] = below2
		rep["seam_moved"] = rep.get("seam_moved", 0) + mov.count(2)
		rep["skirt_pts"] = (rep["skirt_pts"] as PackedVector3Array) + pts
		# 腿有沒有從裙子上面戳出來：裙子蓋住的地方（1 cm 格），大腿頂點高過裙子最高點幾個
		var top := {}
		for q in pts:
			var kk := Vector2i(floori(q.x / 0.01), floori(q.z / 0.01))
			top[kk] = maxf(top.get(kk, -1e9), q.y)
		var poke := 0
		var lwm: PackedByteArray = info["lower"]
		for vi in P.size():
			if mask[vi] == 0 and lwm[vi] == 1:
				var kk := Vector2i(floori(P[vi].x / 0.01), floori(P[vi].z / 0.01))
				if top.has(kk) and P[vi].y > top[kk] + 0.001:
					poke += 1
		rep["poke"] = rep.get("poke", 0) + poke
		# 網格連續性：裙子三角形的邊長和站姿比，最多拉長幾倍
		var rest := _skin_data(sk, mi, true)
		var am := ArrayMesh.new()
		var base := 0
		for s in mi.mesh.get_surface_count():
			var a := mi.mesh.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var n: int = V.size()
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var nb: int = B.size() / n
			var I = a[Mesh.ARRAY_INDEX]
			if I != null:
				var R0 := PackedVector3Array()
				R0.resize(n)
				for vi in n:
					var q := Vector3.ZERO
					for j in nb:
						var wt: float = W[vi * nb + j]
						if wt > 0.0:
							q += ((rest[0][B[vi * nb + j]] as Transform3D) * V[vi]) * wt
					R0[vi] = q
				for ti in range(0, I.size(), 3):
					if mask[base + I[ti]] == 1 and mask[base + I[ti + 1]] == 1 and mask[base + I[ti + 2]] == 1:
						(rep["skirt_tris"] as Array).append([P[base + I[ti]], P[base + I[ti + 1]], P[base + I[ti + 2]]])
					for e in 3:
						var i0: int = I[ti + e]
						var i1: int = I[ti + (e + 1) % 3]
						var both := mask[base + i0] == 1 and mask[base + i1] == 1
						if both or mask[base + i0] == 1 or mask[base + i1] == 1:
							var l0 := R0[i0].distance_to(R0[i1])
							if l0 > 1e-5:
								var st := P[base + i0].distance_to(P[base + i1]) / l0
								var kk := "" if both else "_seam"   # _seam＝裙子和裡面的腿／臀相連的邊
								rep["stretch_max" + kk] = maxf(rep.get("stretch_max" + kk, 0.0), st)
								if st > 2.0:
									rep["stretch_over2" + kk] = rep.get("stretch_over2" + kk, 0) + 1
								if both:
									rep["edges"] = rep.get("edges", 0) + 1
			var C = a[Mesh.ARRAY_COLOR]
			if C != null:
				for j in n:
					if mask[base + j] == 1 or lw[base + j] == 1:
						C[j] = Color(1, 0, 0, 1)
				a[Mesh.ARRAY_COLOR] = C
			a[Mesh.ARRAY_VERTEX] = P.slice(base, base + n)
			a[Mesh.ARRAY_NORMAL] = NN.slice(base, base + n)
			a[Mesh.ARRAY_BONES] = null
			a[Mesh.ARRAY_WEIGHTS] = null
			a[Mesh.ARRAY_TANGENT] = null
			am.add_surface_from_arrays(mi.mesh.surface_get_primitive_type(s), a)
			am.surface_set_material(s, mi.mesh.surface_get_material(s))
			base += n
		var nmi := MeshInstance3D.new()
		nmi.mesh = am
		if mi.material_overlay is ShaderMaterial:   # 描邊寬度原本是模型單位 → 乘模型縮放
			var ov := (mi.material_overlay as ShaderMaterial).duplicate() as ShaderMaterial
			ov.set_shader_parameter("width", float(ov.get_shader_parameter("width")) * mi.global_transform.basis.get_scale().x)
			nmi.material_overlay = ov
		model.get_parent().add_child(nmi)
		nmi.global_transform = Transform3D.IDENTITY
		mi.visible = false
		rep["nodes"].append([mi, nmi])
	return rep

## 簡單版：只有一個水平椅面（seat_y），椅面範圍 seat_xz（世界 AABB 的 x/z；空的＝無限大）
static func settle_skirt_on_seat(model: Node3D, seat_y: float, seat_xz := AABB(), height := SKIRT_REF_H) -> Dictionary:
	var ab := seat_xz
	if ab.size == Vector3.ZERO:
		ab = AABB(Vector3(-1e4, 0, -1e4), Vector3(2e4, 0, 2e4))
	ab.position.y = seat_y - 1.0
	ab.size.y = 1.0
	return settle_skirt(model, [[ab, Vector3.UP]], 0.003, 0.02, height)

## 站起來：換回原本會動的模型
static func unsettle_skirt(rep: Dictionary) -> void:
	for pr in rep.get("nodes", []):
		(pr[0] as MeshInstance3D).visible = true
		(pr[1] as Node).queue_free()
	rep["nodes"] = []

## 坐下時腿＋裙子（攤開後）的表面高度圖：手放大腿上用
static func lap_top_map(model: Node3D, cell := 0.008, height := SKIRT_REF_H) -> Callable:
	var sk: Skeleton3D = Retarget.find_type(model, "Skeleton3D")
	var meshes := skirt_info(model, height)
	var legtop := _leg_top_map(sk, meshes)
	var grid := {}
	for mi: MeshInstance3D in meshes:
		var r := skirt_sit_mesh(sk, mi, legtop)
		var mask: PackedByteArray = mi.get_meta("skirt")["mask"]
		var P: PackedVector3Array = r[0]
		for i in P.size():
			if mask[i] == 1:
				var key := Vector2i(floori(P[i].x / cell), floori(P[i].z / cell))
				if not grid.has(key) or grid[key] < P[i].y:
					grid[key] = P[i].y
	return func(p: Vector3) -> float:
		var k0 := Vector2i(floori(p.x / cell), floori(p.z / cell))
		var m: float = legtop.call(p)
		for dx in [-1, 0, 1]:
			for dz in [-1, 0, 1]:
				m = maxf(m, grid.get(k0 + Vector2i(dx, dz), -1e9))
		return m
