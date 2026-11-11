extends RefCounted
## 戶外活動「合現實邏輯」：道具由動作的接觸事件驅動，不用獨立計時器（2026-11-10 老師 iPad 回報 5 個問題後重寫）。
## game.gd（Ken 遊戲）與 motion_check.gd（Ken／水鈴／圳寶檢查圖）共用同一份。
##
## 座標：frame＝角色所在的座標系（+Z＝角色前面、+X＝角色左邊、+Y＝上），道具放在 props（transform 和 frame 一樣）。
## 地面高度由 ground_at(Vector2(x, z)) 給（遊戲＝路面 0.1 m、人行道 0.05 m…；檢查場景＝0）。
##
## - 腳踏車：坐墊、把手、曲柄是依角色量出來的；曲柄轉 → 兩腳用 IK 踩在踏板上 → 輪子照齒比轉、前進速度＝輪子周長×轉速；
##   兩輪底部各自量地面高度（車身可微微前後傾）。上半身＝driving 動作的一格（雙手握在量出來的把手位置）。
## - 運球：球的位置是「動作時間」的函數（量手的網格算出來的表）：手往下推時球貼在手心下、放開後落地彈起、到最高點時正好回到手心。
## - 棒球：來球 → 揮棒到接觸那一格（球在棒面上）→ 球才沿拋物線飛出 → 丟下球棒（掉到地上躺平）→ 空手跑到壘包。
const Retarget := preload("res://scripts/retarget.gd")
const Pose := preload("res://scripts/procedural_pose.gd")

var sk: Skeleton3D
var model: Node3D          # 角色模型（fit_model 的 holder），frame 的子節點
var frame: Node3D
var props: Node3D
var anim: AnimationPlayer
var outline: Shader
var ground_at: Callable    # Vector2(x, z) in frame → 地面 y
var kind := ""
var bike_parent: Node3D     # 腳踏車掛在哪（遊戲＝Ken 的節點，騎車移動時跟著走；沒給＝props）
var riding := false
var model_base := Transform3D.IDENTITY   # 模型站著時在 frame 裡的 transform（腳底在地面）
var report := {}           # 給檢查圖的量測數字（每次 update 會更新一部分）

func setup(p_sk: Skeleton3D, p_model: Node3D, p_frame: Node3D, p_props: Node3D, p_anim: AnimationPlayer, p_outline: Shader, p_ground: Callable) -> void:
	sk = p_sk
	model = p_model
	frame = p_frame
	props = p_props
	anim = p_anim
	outline = p_outline
	ground_at = p_ground
	model_base = model.transform

# ───────── 共用小工具 ─────────
var _bidx := {}
func bi(key: String) -> int:
	if not _bidx.has(key):
		_bidx[key] = Retarget._idx(sk, key)
	return _bidx[key]

func gp(key: String) -> Transform3D:
	return sk.get_bone_global_pose(bi(key))

## skeleton 座標 → frame 座標
func sk2f() -> Transform3D:
	return frame.global_transform.affine_inverse() * sk.global_transform

func fpos(key: String) -> Vector3:
	return sk2f() * gp(key).origin

func g(p: Vector3) -> float:
	return float(ground_at.call(Vector2(p.x, p.z)))

## 蒙皮頂點（frame 座標）：keys＝骨名開頭（例 ["righthand"]、["leftfoot","lefttoe"]）
func mesh_pts(keys: Array) -> PackedVector3Array:
	var inv := frame.global_transform.affine_inverse()
	var out := PackedVector3Array()
	for it in Pose._hp_skinned(sk, "", keys):
		for q: Vector3 in (it[1] as PackedVector3Array):
			out.append(inv * q)
	return out

## [perf] 每一格要量「腳底最低點」的地方（走路／跑步貼地、騎車踩踏板）只用靴底那一層頂點：
## 綁定姿勢（腳是平的）裡腳＋腳趾頂點最低的 35%（高度方向）＝鞋底和鞋底邊緣；最低點一定在這裡面。
## 舊：每次呼叫 mesh_pts 都把整隻腳（幾千個頂點 × 4 個權重）在 GDScript 裡蒙皮一次，而且先算全身 60 多根骨頭的矩陣
##     → 電腦每格約 20 ms，iPad（網頁 GDScript 慢好幾倍）就一格一格。
const SOLE_FRAC := 0.35
var sole_frac := SOLE_FRAC   # 吉祥物大靴子：1.0（整隻腳都量；腳尖往下時最低點可能不在靴底那層，差到 3 mm）
var _sole := {}
func sole_pts(sd: String) -> PackedVector3Array:
	if not _sole.has(sd):
		_sole[sd] = _sole_build(sd)
	var inv := frame.global_transform.affine_inverse()
	var out := PackedVector3Array()
	var sgx := sk.global_transform
	for e: Dictionary in _sole[sd]:
		var mi: MeshInstance3D = e["mi"]
		var skin := mi.skin
		var bm := {}
		for b: int in (e["binds"] as PackedInt32Array):
			var bix := skin.get_bind_bone(b)
			if bix < 0:
				bix = sk.find_bone(skin.get_bind_name(b))
			bm[b] = inv * sgx * sk.get_bone_global_pose(bix) * skin.get_bind_pose(b)
		var Pv: PackedVector3Array = e["pos"]
		var Bv: PackedInt32Array = e["bones"]
		var Wv: PackedFloat32Array = e["wts"]
		var nb: int = e["nb"]
		var base := out.size()
		out.resize(base + Pv.size())
		for j in Pv.size():
			var p := Vector3.ZERO
			for k in nb:
				var wt := Wv[j * nb + k]
				if wt > 0.0:
					p += ((bm[Bv[j * nb + k]] as Transform3D) * Pv[j]) * wt
			out[base + j] = p
	return out

func _sole_build(sd: String) -> Array:
	var keys := [sd + "foot", sd + "toe"]
	Pose._hp_skinned(sk, "", keys)   # 先讓 procedural_pose 建好這組頂點（同一份快取）
	var res := []
	for mi: MeshInstance3D in Pose._skinned_meshes(sk):
		var key := "%d_%d_%s" % [mi.get_instance_id(), mi.mesh.get_rid().get_id(), ",".join(keys)]
		if not Pose._hp_cache.has(key):
			continue
		var c: Dictionary = Pose._hp_cache[key]
		var Pv: PackedVector3Array = c["pos"]
		if Pv.is_empty():
			continue
		var lo := INF
		var hi := -INF
		for q in Pv:
			lo = minf(lo, q.y)
			hi = maxf(hi, q.y)
		var cut := lo + (hi - lo) * sole_frac
		var nb: int = c["nb"]
		var B: PackedInt32Array = c["bones"]
		var W: PackedFloat32Array = c["wts"]
		var sp := PackedVector3Array()
		var sb := PackedInt32Array()
		var sw := PackedFloat32Array()
		var sbind := PackedInt32Array()
		var used := {}
		for j in Pv.size():
			if Pv[j].y > cut:
				continue
			sp.append(Pv[j])
			for k in nb:
				sb.append(B[j * nb + k])
				sw.append(W[j * nb + k])
				used[B[j * nb + k]] = true   # 權重 0 的骨頭也要有矩陣（索引會查到）
		for b in used:
			sbind.append(int(b))
		var e := {"mi": mi, "pos": sp, "bones": sb, "wts": sw, "nb": nb, "binds": sbind}   # Packed 陣列是值：先填好再放進字典
		print("SOLE %s %s: %d of %d foot+toe vertices (bottom %.0f%%), %d bones" % [sd, mi.name, sp.size(), Pv.size(), sole_frac * 100.0, sbind.size()])
		res.append(e)
	return res

## 載入角色時先把每格會用到的頂點快取建好（不要在揭曉走路的第一格才建：電腦 1.7 秒、iPad 更久）
func prewarm() -> void:
	for sd in ["left", "right"]:
		mesh_pts([sd + "foot"])
		mesh_pts([sd + "toe"])
		mesh_pts([sd + "foot", sd + "toe"])
		sole_pts(sd)

func mat(col: String, emit := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(col)
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = Color(col)
		m.emission_energy_multiplier = emit
	return m

func prim(parent: Node3D, mesh: Mesh, pos: Vector3, col: String, rot := Vector3.ZERO, ol := 0.012) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat(col)
	mi.position = pos
	mi.rotation = rot
	parent.add_child(mi)
	if outline and ol > 0.0:
		var o := ShaderMaterial.new()
		o.shader = outline
		o.set_shader_parameter("width", ol)
		mi.material_overlay = o
	return mi

func tube(parent: Node3D, a: Vector3, b: Vector3, r: float, col: String, ol := 0.006) -> MeshInstance3D:
	var cm := CylinderMesh.new()
	cm.top_radius = r
	cm.bottom_radius = r
	cm.height = maxf(a.distance_to(b), 0.001)
	cm.radial_segments = 10
	var mi := prim(parent, cm, (a + b) * 0.5, col, Vector3.ZERO, ol)
	var y := (b - a).normalized()
	var x := y.cross(Vector3.FORWARD if absf(y.z) < 0.9 else Vector3.RIGHT).normalized()
	mi.basis = Basis(x, y, x.cross(y).normalized())
	return mi

static func sph(r: float) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	return s

static func cyl(r1: float, r2: float, h: float) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = r1
	c.bottom_radius = r2
	c.height = h
	return c

## 姿勢存取（本地骨頭姿勢）
func save_pose() -> Array:
	var a := []
	for i in sk.get_bone_count():
		a.append([sk.get_bone_pose_position(i), sk.get_bone_pose_rotation(i)])
	return a

func load_pose(a: Array) -> void:
	for i in a.size():
		sk.set_bone_pose_position(i, a[i][0])
		sk.set_bone_pose_rotation(i, a[i][1])

## 把動作跳到時間 t（遊戲的 AnimationPlayer 是手動更新模式，這裡立刻套用）
## replay＝true：同一個動作也重播再跳（吉祥物沒有 idle、混合播放後要確保套到 an）
func pose_at(an: String, t: float, replay := false) -> void:
	if replay or anim.current_animation != an or not anim.is_playing():
		anim.play(an, 0.0)
	anim.seek(t, true)
	anim.advance(0.0)

## 動作「腳底不滑」的原地速度：踩地那隻腳在模型座標往後退的平均速度（m/s，frame 單位）
func stride_speed(an: String) -> float:
	var A := anim.get_animation(an)
	var L := A.length
	var keep := save_pose()
	var rows := []
	var n := 120
	for i in n + 1:
		pose_at(an, L * i / n)
		rows.append([fpos("lefttoebase"), fpos("righttoebase")])
	load_pose(keep)
	var ymin := [9.0, 9.0]
	for r in rows:
		for s in 2:
			ymin[s] = minf(ymin[s], (r[s] as Vector3).y)
	var dist := 0.0
	var tt := 0.0
	for i in n:
		for s in 2:
			var a: Vector3 = rows[i][s]
			var b: Vector3 = rows[i + 1][s]
			if a.y < ymin[s] + 0.012 and b.y < ymin[s] + 0.012:
				dist += a.z - b.z
				tt += L / n
	return dist / maxf(tt, 0.001)

# ═════════ 腳踏車 ═════════
var bike: Node3D
var bike_rig: Node3D      # 車身（可前後傾）
var crank: Node3D
var pedals: Array = []    # [left, right] Node3D（踏板保持水平）
var wheels: Array = []    # [rear, front]
var B := {}               # 量出來的幾何
var bike_base_pose: Array = []
var crank_th := 0.0       # 曲柄角（0＝右踏板在最上面，往前轉為正）
var wheel_phi := 0.0
const GEAR := 2.2         # 輪子轉幾圈／曲柄一圈

## 依角色量：坐姿上半身＝driving 的一格＋往前傾、兩手 IK 到橫的把手（手指包住把手）；腿長、腳底踩點、屁股最低點、握把軸線
## r_min：輪子最小半徑（吉祥物用 0.08）；grip_half：握把半長（吉祥物 0.03）；grip_step：量握把用每幾個頂點（1＝全部）
func build_bike(drive_anim := "ft/driving", drive_t := 1.2, lean_deg := 20.0, r_grip := 0.015, r_min := 0.18, grip_half := 0.05, grip_step := 2) -> void:
	if bike:
		return
	var keep_model := model.transform
	var gy := g(Vector3.ZERO)
	model.transform = Transform3D(model_base.basis, Vector3(model_base.origin.x, gy, model_base.origin.z))
	var m0 := model.transform
	pose_at(drive_anim, drive_t)
	var drv := save_pose()
	anim.stop()
	load_pose(drv)
	var FB := frame.global_transform.basis.orthonormalized()
	var FT := frame.global_transform
	# 上半身往前傾、頭抬回來看前面
	var world := Pose.pose_world(sk)
	var left_w := FB * Vector3.RIGHT
	Pose._rot_chain(sk, world, bi("spine"), Basis(left_w, deg_to_rad(lean_deg)))
	Pose._rot_chain(sk, world, bi("neck"), Basis(left_w, deg_to_rad(-lean_deg * 0.8)))
	Pose.apply_world(sk, world, true)
	# 兩手：手腕到肩膀前下方，手掌朝下、手指往前包住橫桿
	for sd in ["left", "right"]:
		var sg := 1.0 if sd == "left" else -1.0
		var S := fpos(sd + "arm")
		var la := S.distance_to(fpos(sd + "forearm")) + fpos(sd + "forearm").distance_to(fpos(sd + "hand"))
		var W := S + Vector3(sg * 0.03, -0.5 * la, 0.7 * la)
		world = Pose.pose_world(sk)
		Pose.ik_arm(sk, world, sd, FT * W, FB * Vector3(sg * 0.7, -0.4, -0.5))
		Pose.apply_world(sk, world, true)
		world = Pose.pose_world(sk)
		Pose.aim_hand(sk, world, sd, FB * Vector3(sg * 0.12, -0.3, 1.0).normalized(), FB * Vector3(0, -1.0, 0.25).normalized())
		Pose.apply_world(sk, world, true)
		world = Pose.pose_world(sk)
		Pose.curl_fingers(sk, world, sd, [62.0, 78.0, 55.0], 25.0)
		Pose.apply_world(sk, world, true)
	# 坐姿：屁股最低點（臀部下方、前後 ±12 cm）
	var hips := fpos("hips")
	var seat_y := 9.0
	var seat_z := 0.0
	var cnt := 0
	var hp_pts := mesh_pts(["hips", "leftupleg", "rightupleg"])
	for p in hp_pts:
		if p.y < hips.y and absf(p.x - hips.x) < 0.06 and p.z > hips.z - 0.14 and p.z < hips.z + 0.04:
			seat_y = minf(seat_y, p.y)
	for p in hp_pts:
		if p.y < seat_y + 0.015 and absf(p.x - hips.x) < 0.06 and p.z > hips.z - 0.14 and p.z < hips.z + 0.04:
			seat_z += p.z
			cnt += 1
	seat_z = seat_z / maxi(cnt, 1)
	# 腿：長度、腳底踩點（腳掌放平後，腳掌前段最低處）在腳骨座標裡的位置
	var legs := {}
	var lsum := 0.0
	var S2 := sk2f()
	for sd in ["left", "right"]:
		var H := gp(sd + "upleg").origin
		var K := gp(sd + "leg").origin
		var A := gp(sd + "foot").origin
		var Tt := gp(sd + "toebase").origin
		var fx := S2 * gp(sd + "foot")
		var toe_f: Vector3 = S2 * Tt
		var heel_dir := toe_f - fx.origin
		var flat_dir := Vector3(heel_dir.x, 0, heel_dir.z).normalized() * heel_dir.length()
		var Bflat := Pose._arc(heel_dir, flat_dir) * fx.basis
		var R := Bflat * fx.basis.inverse()    # 放平的旋轉（繞腳踝）
		var ball := fx.origin + R * (toe_f - fx.origin)   # 放平後的腳趾骨（踩點在它下面）
		var low := 9.0
		for p in mesh_pts([sd + "foot", sd + "toe"]):
			var q := fx.origin + R * (p - fx.origin)
			if absf(q.x - ball.x) < 0.0375 and absf(q.z - ball.z) < 0.0325:
				low = minf(low, q.y)
		var sole_flat := Vector3(ball.x, low, ball.z)        # 放平後的腳底踩點（frame）
		var sole_local := fx.affine_inverse() * (fx.origin + R.inverse() * (sole_flat - fx.origin))
		legs[sd] = {"l1": H.distance_to(K), "l2": K.distance_to(A), "sole_local": sole_local, "Bflat": Bflat, "sole_x": sole_flat.x,
			"hip_f": S2 * H}
		lsum += (S2 * H).distance_to(S2 * K) + (S2 * K).distance_to(S2 * A)
	var l := lsum / 2.0   # 腿長（frame 單位）
	var r := clampf(0.42 * l, r_min, 0.32)
	var Rc := 0.21 * l
	var hipz: float = ((legs["left"]["hip_f"] as Vector3).z + (legs["right"]["hip_f"] as Vector3).z) * 0.5
	var C := Vector3(0, gy + r + 0.05, hipz + 0.30 * l)
	# 坐墊高度：曲柄在最下面時腿伸直約 93%
	var lift := 1e9
	for sd in ["left", "right"]:
		var L: Dictionary = legs[sd]
		var contact := C + Vector3((L["sole_x"] as float), -Rc + 0.012, 0)
		var ank: Vector3 = contact - (L["Bflat"] as Basis) * (L["sole_local"] as Vector3)
		var Hf: Vector3 = L["hip_f"]
		var D := 0.93 * l
		var dxz := Vector2(ank.x - Hf.x, ank.z - Hf.z).length()
		var want_y := ank.y + sqrt(maxf(D * D - dxz * dxz, 0.0))
		lift = minf(lift, want_y - Hf.y)
	# 兩手的握把：在手掌和彎起來的手指圍成的空間裡找最粗的圓棒（量網格）
	var grips := {}
	for sd in ["left", "right"]:
		grips[sd] = fit_grip(sd, r_grip, grip_step)
	var keep_pose := save_pose()
	B = {"grip_half": grip_half, "m0": m0, "r_grip_want": r_grip, "r": r, "Rc": Rc, "C": C, "lift": lift, "seat_y": seat_y + lift, "seat_z": seat_z, "legs": legs, "l": l, "grips": grips}
	bike_base_pose = keep_pose
	model.transform = keep_model
	_build_bike_mesh()
	# 坐墊頂面＝踩一整圈時屁股的最低點（腿轉動時臀部的肉會往下）
	var low := 9.0
	model.transform = Transform3D(m0.basis, m0.origin + Vector3(0, lift, 0))
	for k in 8:
		crank_th = k * TAU / 8.0
		load_pose(bike_base_pose)
		_leg_ik()
		for p in mesh_pts(["hips", "leftupleg", "rightupleg"]):
			if absf(p.x) < 0.06 and p.z > seat_z - 0.085 and p.z < seat_z + 0.025:
				low = minf(low, p.y)
	if low < 8.0:
		B["seat_y"] = low
		for c in bike_rig.get_children():
			if c is MeshInstance3D and (c as MeshInstance3D).mesh is BoxMesh and absf((c as Node3D).position.z - seat_z) < 0.1:
				(c as Node3D).position.y += low - (seat_y + lift)
	crank_th = 0.0
	load_pose(bike_base_pose)
	model.transform = keep_model
	print("BIKE leg=%.3f r=%.3f crank=%.3f lift=%.3f seat_y=%.3f grips L=%s R=%s" % [l, r, Rc, lift, seat_y + lift, grips["left"], grips["right"]])

## 找握把：手掌＋手指頂點，軸線方向試 食指根→小指根 附近 ±25°，中心在手的平面上找「離所有頂點最遠」的位置（手圍起來的洞）
## 回傳 {c, d, free（洞的半徑）}（frame 座標，以 model_base 為準）
var GRIP_DIRS := 2   # 握把方向試 (2n+1)² 個（遊戲裡用 1，比較快）
func fit_grip(sd: String, r_grip: float, step_v := 2) -> Dictionary:
	var S := sk2f()
	var d0 := ((S * gp(sd + "handindex1").origin) - (S * gp(sd + "handpinky1").origin)).normalized()
	var all := mesh_pts([sd + "hand"])
	var c0 := Vector3.ZERO
	for p in all:
		c0 += p
	c0 /= maxf(all.size(), 1)
	var pts := PackedVector3Array()
	for i in range(0, all.size(), step_v):
		if all[i].distance_to(c0) < 0.08:
			pts.append(all[i])
	var best := {"c": c0, "d": d0, "free": -1.0}
	var u0 := d0.cross(Vector3.UP if absf(d0.y) < 0.9 else Vector3.RIGHT).normalized()
	var w0 := d0.cross(u0).normalized()
	for stage in 2:
		var dirs := []
		if stage == 0:
			for ai in range(-GRIP_DIRS, GRIP_DIRS + 1):
				for bj in range(-GRIP_DIRS, GRIP_DIRS + 1):
					dirs.append((Basis(u0, deg_to_rad(ai * 12.0)) * Basis(w0, deg_to_rad(bj * 12.0)) * d0).normalized())
		else:
			dirs.append(best["d"])
		var step := 0.006 if stage == 0 else 0.0015
		var span := 6 if stage == 0 else 5
		var cc: Vector3 = c0 if stage == 0 else best["c"]
		for d: Vector3 in dirs:
			var e1 := d.cross(Vector3.UP if absf(d.y) < 0.9 else Vector3.RIGHT).normalized()
			var e2 := d.cross(e1).normalized()
			for i in range(-span, span + 1):
				for j in range(-span, span + 1):
					var c: Vector3 = cc + e1 * (i * step) + e2 * (j * step)
					var m := 9.0
					var near := 0
					for p in pts:
						var v := p - c
						var ax := v.dot(d)
						if absf(ax) > 0.035:
							continue
						var rr := (v - d * ax).length()
						if rr < m:
							m = rr
						if rr < 0.04:
							near += 1
					# 握把要碰到手（間隙 1～5 mm）、而且被手包住越多越好（離軸 2.5 cm 內的頂點數）
					var wrap := 0
					for p in pts:
						var v2 := p - c
						var ax2 := v2.dot(d)
						if absf(ax2) < 0.035 and (v2 - d * ax2).length() < r_grip + 0.012:
							wrap += 1
					var ok := m >= r_grip + 0.001 and m <= r_grip + 0.005
					var score := float(wrap) + (1000.0 if ok else -absf(m - r_grip - 0.003) * 1000.0)
					if near < 12:
						continue
					if score > float(best.get("score", -1e9)):
						best = {"c": c, "d": d, "free": m, "score": score, "wrap": wrap}
	return best

func _build_bike_mesh() -> void:
	bike = Node3D.new()
	bike.name = "Bike"
	(bike_parent if bike_parent else props).add_child(bike)
	bike_rig = Node3D.new()
	bike.add_child(bike_rig)
	var r: float = B["r"]
	var C: Vector3 = B["C"]
	var Rc: float = B["Rc"]
	var gl: Dictionary = B["grips"]["left"]
	var gr: Dictionary = B["grips"]["right"]
	var lift: float = B["lift"]
	var up := Vector3(0, lift, 0)
	var GL: Vector3 = (gl["c"] as Vector3) + up
	var GR: Vector3 = (gr["c"] as Vector3) + up
	var rg: float = B["r_grip_want"]
	B["r_grip"] = rg
	var seat := Vector3(0, float(B["seat_y"]), float(B["seat_z"]))
	var bar_c := (GL + GR) * 0.5
	var rear := Vector3(0, C.y - 0.05, minf(seat.z - 0.28, C.z - r - 0.08))
	var front := Vector3(0, C.y - 0.05, maxf(bar_c.z + 0.22, C.z + Rc + 0.16 + r))
	B["rear"] = rear
	B["front"] = front
	var col := "#2f6fd0"
	var head_top := Vector3(0, bar_c.y - 0.10, bar_c.z + 0.05)
	var head_bot := head_top.lerp(front, 0.32)
	var seat_tube_top := seat + Vector3(0, -0.07, 0.01)
	tube(bike_rig, seat_tube_top, C, 0.02, col)
	tube(bike_rig, C, rear, 0.016, col)
	tube(bike_rig, seat_tube_top + Vector3(0, -0.02, 0), rear, 0.014, col)
	tube(bike_rig, seat_tube_top + Vector3(0, 0, 0.03), head_top, 0.02, col)
	tube(bike_rig, C, head_bot, 0.022, col)
	tube(bike_rig, head_top, head_bot, 0.024, col)
	tube(bike_rig, head_bot, front, 0.015, col)                       # 前叉
	tube(bike_rig, seat + Vector3(0, -0.02, 0), seat_tube_top, 0.012, "#8a8f99")   # 坐墊桿
	tube(bike_rig, head_top, bar_c, 0.013, "#444450")                 # 把手立管
	# 把手：中間橫桿＋兩邊握把（握把軸線＝量到的手洞方向）
	for gpair in [[gl, GL], [gr, GR]]:
		var gd: Dictionary = gpair[0]
		var c: Vector3 = gpair[1]
		var d: Vector3 = gd["d"]
		if d.x * c.x < 0.0:
			d = -d   # 讓 d 朝外
		var gh: float = B["grip_half"]
		tube(bike_rig, bar_c, c - d * (gh - 0.005), 0.011, "#444450")
		tube(bike_rig, c - d * gh, c + d * gh, rg, "#222228", 0.004)
	for part in [[Vector3(0.12, 0.035, 0.11), Vector3(0, -0.0175, -0.03)], [Vector3(0.05, 0.03, 0.11), Vector3(0, -0.02, 0.075)]]:   # 坐墊（頂面＝屁股最低點；前面是窄的鼻子）
		var sm := MeshInstance3D.new()
		var sb := BoxMesh.new()
		sb.size = part[0]
		sm.mesh = sb
		sm.material_override = mat("#222228")
		sm.position = seat + (part[1] as Vector3)
		bike_rig.add_child(sm)
	wheels.clear()
	for c in [rear, front]:
		var wn := Node3D.new()
		wn.position = c
		bike_rig.add_child(wn)
		var tm := MeshInstance3D.new()
		var tor := TorusMesh.new()
		tor.inner_radius = r - 0.035
		tor.outer_radius = r
		tor.rings = 32
		tm.mesh = tor
		tm.material_override = mat("#26262c")
		tm.rotation.z = PI / 2
		wn.add_child(tm)
		for j in 8:
			tube(wn, Vector3.ZERO, Vector3(0, cos(j * PI / 4), sin(j * PI / 4)) * (r - 0.03), 0.004, "#c9cbd3", 0.0)
		tube(wn, Vector3(-0.03, 0, 0), Vector3(0.03, 0, 0), 0.015, "#8a8f99", 0.0)
		wheels.append(wn)
	# 曲柄（會轉）：中軸、兩支曲柄臂、齒盤；踏板另外放（保持水平）
	crank = Node3D.new()
	crank.position = C
	bike_rig.add_child(crank)
	var lx: float = B["legs"]["left"]["sole_x"]
	var rx: float = B["legs"]["right"]["sole_x"]
	tube(crank, Vector3(rx + 0.02, 0, 0), Vector3(lx - 0.02, 0, 0), 0.012, "#8a8f99", 0.0)
	tube(crank, Vector3(rx + 0.025, 0, 0), Vector3(rx + 0.025, Rc, 0), 0.009, "#8a8f99", 0.0)    # 右臂（往上＝θ0）
	tube(crank, Vector3(lx - 0.025, 0, 0), Vector3(lx - 0.025, -Rc, 0), 0.009, "#8a8f99", 0.0)   # 左臂（往下）
	var ring := MeshInstance3D.new()
	var rc := cyl(Rc * 0.55, Rc * 0.55, 0.006)
	ring.mesh = rc
	ring.material_override = mat("#55595f")
	ring.rotation.z = PI / 2
	ring.position = Vector3(rx + 0.032, 0, 0)
	crank.add_child(ring)
	tube(bike_rig, C + Vector3(rx + 0.032, Rc * 0.55, 0), rear + Vector3(rx + 0.032, 0.03, 0), 0.004, "#3a3a40", 0.0)   # 鏈條（上）
	tube(bike_rig, C + Vector3(rx + 0.032, -Rc * 0.55, 0), rear + Vector3(rx + 0.032, -0.03, 0), 0.004, "#3a3a40", 0.0)
	pedals.clear()
	for sd in ["left", "right"]:
		var pn := Node3D.new()
		bike_rig.add_child(pn)
		var pm := MeshInstance3D.new()
		var pb := BoxMesh.new()
		pb.size = Vector3(0.075, 0.024, 0.065)
		pm.mesh = pb
		pm.material_override = mat("#333338")
		pn.add_child(pm)
		pedals.append(pn)
	bike.visible = false

## 第 side 支踏板中心（bike_rig 座標）
func pedal_center(sd: String, th: float) -> Vector3:
	var a := th if sd == "right" else th + PI
	var x: float = B["legs"][sd]["sole_x"]
	var Rc: float = B["Rc"]
	return (B["C"] as Vector3) + Vector3(x, Rc * cos(a), Rc * sin(a))

func set_bike(on: bool) -> void:
	riding = on
	if on:
		build_bike()
	if bike:
		bike.visible = on
	if on:
		anim.stop()
		update_bike(0.0, 0.0)
	else:
		model.transform = model_base

## 每格：speed＝前進速度（frame 單位/秒；0＝停著）。曲柄照速度轉 → 輪子 GEAR 倍 → 兩腳 IK 到踏板
func update_bike(delta: float, speed: float) -> void:
	if bike == null:
		return
	var r: float = B["r"]
	var w := speed / (GEAR * r)      # 曲柄角速度
	crank_th = fmod(crank_th + w * delta, TAU)
	wheel_phi = fmod(wheel_phi + w * GEAR * delta, TAU)
	# 車身：兩輪底部各自貼地（可前後傾一點）
	var rear: Vector3 = B["rear"]
	var front: Vector3 = B["front"]
	var gr := g(rear)
	var gf := g(front)
	var base_y: float = (B["C"] as Vector3).y - 0.05 - r   # 建模時輪底的高度（＝當時的地面）
	var pitch := atan2(gf - gr, front.z - rear.z)
	var rig := Transform3D(Basis(Vector3.RIGHT, -pitch), Vector3.ZERO)
	rig = Transform3D(Basis.IDENTITY, Vector3(0, gr - base_y, rear.z)) * rig * Transform3D(Basis.IDENTITY, Vector3(0, 0, -rear.z))
	bike_rig.transform = rig
	for i in 2:
		(wheels[i] as Node3D).basis = Basis(Vector3.RIGHT, wheel_phi)
	crank.basis = Basis(Vector3.RIGHT, crank_th)
	for i in 2:
		var sd: String = ["left", "right"][i]
		(pedals[i] as Node3D).position = pedal_center(sd, crank_th)
	# 角色：坐在坐墊上（和車身一起動）
	var m0: Transform3D = B["m0"]
	model.transform = rig * Transform3D(m0.basis, m0.origin + Vector3(0, float(B["lift"]), 0))
	load_pose(bike_base_pose)
	_leg_ik()

## 兩腳：腳底踩點釘在踏板頂面中心（腳掌放平），膝蓋往前
func _leg_ik() -> void:
	var F2S := sk2f().affine_inverse()
	var rigx := bike_rig.transform
	for sd in ["left", "right"]:
		var L: Dictionary = B["legs"][sd]
		var contact_f: Vector3 = rigx * (pedal_center(sd, crank_th) + Vector3(0, 0.012, 0))
		var Bflat_f: Basis = rigx.basis * (L["Bflat"] as Basis)
		var ank_f: Vector3 = contact_f - Bflat_f * (L["sole_local"] as Vector3)
		var T := F2S * ank_f
		var up := gp(sd + "upleg")
		var lg := gp(sd + "leg")
		var ft := gp(sd + "foot")
		var H := up.origin
		var l1 := H.distance_to(lg.origin)
		var l2 := lg.origin.distance_to(ft.origin)
		var sgn := 1.0 if sd == "left" else -1.0
		var pole := F2S.basis * Vector3(sgn * 0.15, 0.25, 1.0)
		var E := Pose._elbow(H, T, l1, l2, pole)
		var Bu := up.basis.orthonormalized()
		var Bu2 := (Pose._arc(lg.origin - H, E - H) * Bu).orthonormalized()
		_set_local(sd + "upleg", Bu2)
		var Bl := (Bu2 * Basis(sk.get_bone_pose_rotation(bi(sd + "leg")))).orthonormalized()
		var cur := Bl * sk.get_bone_pose_position(bi(sd + "foot"))
		var Bl2 := (Pose._arc(cur, T - E) * Bl).orthonormalized()
		sk.set_bone_pose_rotation(bi(sd + "leg"), (Bu2.inverse() * Bl2).get_rotation_quaternion())
		var Bf := (F2S.basis * Bflat_f).orthonormalized()
		sk.set_bone_pose_rotation(bi(sd + "foot"), (Bl2.inverse() * Bf).get_rotation_quaternion())

func _set_local(key: String, Bglob: Basis) -> void:
	var b := bi(key)
	var p := sk.get_bone_parent(b)
	var pb := sk.get_bone_global_pose(p).basis.orthonormalized() if p >= 0 else Basis.IDENTITY
	sk.set_bone_pose_rotation(b, (pb.inverse() * Bglob).get_rotation_quaternion())

## 量（骨頭＋網格）：腳底到踏板、輪子到地面、屁股到坐墊、手到握把
func measure_bike(use_mesh := true) -> Dictionary:
	var out := {}
	var rigx := bike_rig.transform
	var r: float = B["r"]
	var wb := []
	for i in 2:
		var c: Vector3 = rigx * (B["rear"] if i == 0 else B["front"])
		wb.append((c.y - r) - g(c))
	out["wheel_rear_gap_cm"] = wb[0] * 100.0
	out["wheel_front_gap_cm"] = wb[1] * 100.0
	for sd in ["left", "right"]:
		var top: Vector3 = rigx * (pedal_center(sd, crank_th) + Vector3(0, 0.012, 0))
		var L: Dictionary = B["legs"][sd]
		var sole := sk2f() * (gp(sd + "foot") * (L["sole_local"] as Vector3))
		out["foot_%s_pin_cm" % sd] = sole.distance_to(top) * 100.0
		if use_mesh:
			# 網格：腳底在踏板範圍內最低點到踏板頂面；穿進踏板的頂點數
			var low := 9.0
			var inside := 0
			var inv := rigx.affine_inverse()
			var pc := pedal_center(sd, crank_th)
			for p in mesh_pts([sd + "foot", sd + "toe"]):
				var q := inv * p - pc
				if absf(q.x) < 0.0375 and absf(q.z) < 0.0325:
					low = minf(low, q.y - 0.012)
					if q.y < 0.012 and q.y > -0.012:
						inside += 1
			out["foot_%s_pedal_gap_cm" % sd] = low * 100.0 if low < 8.0 else -1.0
			out["foot_%s_in_pedal" % sd] = inside
	if use_mesh:
		var seat_top: float = B["seat_y"]
		var sz: float = B["seat_z"]
		var low := 9.0
		var in_saddle := 0
		for p in mesh_pts(["hips", "leftupleg", "rightupleg"]):
			var q := rigx.affine_inverse() * p
			var wide := absf(q.x) < 0.06 and q.z > sz - 0.085 and q.z < sz + 0.025
			var nose := absf(q.x) < 0.025 and q.z >= sz + 0.025 and q.z < sz + 0.13
			if wide:
				low = minf(low, q.y - seat_top)
			if (wide or nose) and q.y < seat_top - 0.004 and q.y > seat_top - 0.04:
				in_saddle += 1
		out["seat_gap_cm"] = low * 100.0
		out["thigh_in_saddle"] = in_saddle
		for sd in ["left", "right"]:
			var gd: Dictionary = B["grips"][sd]
			var c: Vector3 = rigx * ((gd["c"] as Vector3) + Vector3(0, float(B["lift"]), 0))
			var d: Vector3 = rigx.basis * (gd["d"] as Vector3)
			var m := 9.0
			var inside := 0
			for p in mesh_pts([sd + "hand"]):
				var v := p - c
				var ax := v.dot(d)
				if absf(ax) > float(B["grip_half"]):
					continue
				var rr := (v - d * ax).length() - float(B["r_grip"])
				m = minf(m, rr)
				if rr < -0.002:
					inside += 1
			out["hand_%s_grip_gap_cm" % sd] = m * 100.0
			out["hand_%s_in_grip" % sd] = inside
	return out

# ═════════ 運球 ═════════
var ball: Node3D
var ball_r := 0.12
var dribble_tab := []     # [[t, center(Vector3), contact(bool)], ...]（frame 座標，以 model_base 為準）
var dribble_len := 0.0
var dribble_an := ""
var dribble_side := "right"
var dribble_bounces := []

## 量手的網格：每 dt 秒，球從手心正下方往上頂到碰到手的位置（球心）；再找手的最高點＝接球、下推一半＝放手，中間用拋物線＋地面反彈接起來
func build_dribble(an := "ft/dribble", side := "right", r := 0.12, dt := 1.0 / 60.0) -> void:
	dribble_an = an
	dribble_bounces.clear()
	dribble_side = side
	ball_r = r
	var keep_model := model.transform
	model.transform = model_base
	var L := anim.get_animation(an).length
	dribble_len = L
	var n := int(round(L / dt))
	var hc := []   # 手下方的接觸球心
	for i in n:
		pose_at(an, L * i / n)
		var pts := mesh_pts([side + "hand"])
		var palm := Vector3.ZERO
		for p in pts:
			palm += p
		palm /= maxf(pts.size(), 1)
		var y := 9.0
		for p in pts:
			var dxz := Vector2(p.x - palm.x, p.z - palm.z).length()
			if dxz < r:
				y = minf(y, p.y - sqrt(r * r - dxz * dxz))
		hc.append(Vector3(palm.x, y - 0.003, palm.z))
	model.transform = keep_model
	# 找每次「手最高點」（接球）和之後下降到最低點
	var tops := []
	for i in n:
		var a: float = (hc[(i - 1 + n) % n] as Vector3).y
		var b: float = (hc[i] as Vector3).y
		var c: float = (hc[(i + 1) % n] as Vector3).y
		if b >= a and b > c:
			tops.append(i)
	# 太接近的頂點只留高的
	var tops2 := []
	for i in tops:
		if tops2.is_empty() or (i - int(tops2[-1])) * dt > 0.25:
			tops2.append(i)
		elif (hc[i] as Vector3).y > (hc[int(tops2[-1])] as Vector3).y:
			tops2[-1] = i
	if tops2.size() > 1 and (n - int(tops2[-1]) + int(tops2[0])) * dt < 0.25:
		tops2.pop_back()
	tops = tops2
	dribble_tab.clear()
	for i in n:
		dribble_tab.append([L * i / n, hc[i], true])
	var gy := g(Vector3.ZERO)
	for k in tops.size():
		var t0i: int = tops[k]
		var t1i: int = int(tops[(k + 1) % tops.size()]) + (n if k == tops.size() - 1 else 0)
		# 最低點
		var bot := t0i
		for i in range(t0i, t1i):
			if (hc[i % n] as Vector3).y < (hc[bot % n] as Vector3).y:
				bot = i
		var y_top: float = (hc[t0i % n] as Vector3).y
		var y_bot: float = (hc[bot % n] as Vector3).y
		var rel := t0i
		for i in range(t0i, bot + 1):
			rel = i
			if (hc[i % n] as Vector3).y <= y_top - 0.6 * (y_top - y_bot):
				break
		var p0: Vector3 = hc[rel % n]
		var v0 := ((hc[(rel + 1) % n] as Vector3).y - (hc[(rel - 1 + n) % n] as Vector3).y) / (2.0 * dt)
		v0 = minf(v0, -0.4)
		var p1: Vector3 = hc[t1i % n]
		var T := (t1i - rel) * dt
		var sol := _bounce_fit(p0.y, v0, p1.y, gy + r, T)
		dribble_bounces.append(fmod(L * rel / n + float(sol[1]), L))
		for i in range(rel + 1, t1i):
			var tt := (i - rel) * dt
			var y := _bounce_y(sol, p0.y, float(sol[4]), gy + r, tt)
			var xz := Vector2(p0.x, p0.z).lerp(Vector2(p1.x, p1.z), tt / T)
			dribble_tab[i % n] = [L * (i % n) / n, Vector3(xz.x, y, xz.y), false]
		print("DRIBBLE top t=%.2f release t=%.2f hand v=%.2f ball v=%.2f g=%.1f e=%.2f td=%.2f arrive v=%.2f" % [L * t0i / n, L * rel / n, v0, sol[4], sol[0], sol[2], sol[1], float(sol[3]) - float(sol[0]) * (T - float(sol[1]))])

## 放手（y0, 手的速度 v0）到下一次接球（y1, 時間 T）：真實重力 9.8、反彈係數 0.8；
## 手腕往下一甩讓球離手的速度 v（比手骨快）用二分法找，使球剛好在 T 回到手心。回傳 [g, td, e, vu, v]
func _bounce_fit(y0: float, v0: float, y1: float, yf: float, T: float) -> Array:
	var gg := 9.8
	var e := 0.8
	var lo := -20.0
	var hi := minf(v0, -0.2)
	var res := [gg, T * 0.5, e, 0.0, hi]
	for it in 60:
		var v := (lo + hi) * 0.5
		var a := -0.5 * gg
		var disc := v * v - 4.0 * a * (y0 - yf)
		var td := (-v - sqrt(maxf(disc, 0.0))) / (2.0 * a)
		var vd := v - gg * td
		var vu := -e * vd
		var tu := T - td
		var yT := yf + vu * tu - 0.5 * gg * tu * tu
		res = [gg, td, e, vu, v]
		if tu <= 0.0 or yT > y1:
			lo = v   # 球太快（太早回來或太高）→ 甩慢一點
		else:
			hi = v
	return res

func _bounce_y(sol: Array, y0: float, v0: float, yf: float, t: float) -> float:
	var gg: float = sol[0]
	var td: float = sol[1]
	if t <= td:
		return y0 + v0 * t - 0.5 * gg * t * t
	var tu := t - td
	return yf + float(sol[3]) * tu - 0.5 * gg * tu * tu

## 球的位置＝動作時間的函數（表格內插）
func dribble_ball_at(at: float) -> Array:
	var n := dribble_tab.size()
	var f := fposmod(at, dribble_len) / dribble_len * n
	var i := int(floor(f)) % n
	var j := (i + 1) % n
	var a: Array = dribble_tab[i]
	var b: Array = dribble_tab[j]
	var p := (a[1] as Vector3).lerp(b[1] as Vector3, f - floor(f))
	return [p, bool(a[2]) and bool(b[2])]

func start_dribble() -> void:
	if dribble_tab.is_empty():
		build_dribble()
	ball = prim(props, sph(ball_r), Vector3.ZERO, "#e8590c")
	# 球上的黑線
	tube(ball, Vector3(-ball_r * 1.004, 0, 0), Vector3(ball_r * 1.004, 0, 0), 0.004, "#1f1a24", 0.0)
	anim.play(dribble_an, 0.0)

func update_dribble() -> void:
	if ball == null:
		return
	var r := dribble_ball_at(anim.current_animation_position)
	ball.position = r[0]
	ball.rotation.x = -anim.current_animation_position * 6.0

func measure_dribble() -> Dictionary:
	var out := {}
	var c := ball.position
	var m := 9.0
	var inside := 0
	for p in mesh_pts([dribble_side + "hand"]):
		var d := p.distance_to(c) - ball_r
		m = minf(m, d)
		if d < -0.003:
			inside += 1
	out["hand_ball_gap_cm"] = m * 100.0
	out["hand_in_ball"] = inside
	out["ball_floor_gap_cm"] = (c.y - ball_r - g(c)) * 100.0
	out["contact"] = dribble_ball_at(anim.current_animation_position)[1]
	return out

# ═════════ 棒球 ═════════
var bat: Node3D
var bat_ba: BoneAttachment3D
var bat_xf := Transform3D.IDENTITY   # 棒子在右手骨裡（含模型縮放的倒數）
var base_node: Node3D
const BAT_LEN := 0.62
const BAT_SWEET := 0.45      # 甜蜜點（離握把原點，沿 +Y）
const BALL_R := 0.037
var bb := {}                 # 揮棒量測：t_contact、接觸點、棒面法線、出球速度、t_drop
var bb_t := 0.0              # 這一輪的時間（＝動作時間；動作播完後繼續算跑壘）
var bb_phase := ""
var bb_ball: Node3D
var bb_drop := {}            # 掉下來的棒子 {xf0, xf1, t0, T}
var run_v := 1.3
var run_anim := "ft/jogging"
var run_from := Vector3.ZERO
var run_dir := Vector3.ZERO
var run_dist := 2.6
const BAT_FALL := 0.42

static func make_bat(parent: Node3D, mk: Callable) -> Node3D:
	var b := Node3D.new()
	parent.add_child(b)
	mk.call(b, cyl(0.028, 0.016, BAT_LEN), Vector3(0, 0.26, 0), "#c08a4a")
	mk.call(b, cyl(0.02, 0.02, 0.06), Vector3(0, -0.05, 0), "#222228")
	return b

const BAT_R0 := 0.011      # 握把半徑（兒童球棒，直徑 2.5 cm）
func bat_radius(s: float) -> float:   # 沿棒子 s（從握把原點）處的半徑
	return lerpf(BAT_R0, 0.028, clampf((s + 0.05) / BAT_LEN, 0.0, 1.0))

## 棒子在 frame 的 transform（右手骨 × bat_xf；棒子節點本身有 1/縮放 的 scale → 這裡只取方向與位置）
func bat_frame_xf() -> Transform3D:
	var t := sk2f() * gp(_hand_key()) * bat_xf
	return t.orthonormalized()

func _hand_key() -> String:
	return "righthand"

func attach_bat(xf_hand: Transform3D) -> void:
	bat = Node3D.new()
	prim(bat, cyl(0.028, BAT_R0, BAT_LEN), Vector3(0, 0.26, 0), "#c08a4a", Vector3.ZERO, 0.006)
	prim(bat, cyl(0.018, 0.018, 0.02), Vector3(0, -0.05, 0), "#222228", Vector3.ZERO, 0.004)
	bat_ba = BoneAttachment3D.new()
	bat_ba.bone_name = sk.get_bone_name(bi(_hand_key()))
	sk.add_child(bat_ba)
	bat_ba.add_child(bat)
	var inv := 1.0 / sk.global_transform.basis.get_scale().x
	bat_xf = Transform3D(xf_hand.basis.scaled(Vector3.ONE * inv), xf_hand.origin * inv)
	bat.transform = bat_xf

## 揮棒量測：甜蜜點速度最大的那一格＝接觸；球心＝甜蜜點＋(棒半徑＋球半徑＋3 mm)×揮棒方向；
## 來球從接觸點的前方（揮棒方向）水平飛來；出球＝揮棒方向往上 22°。丟棒＝跟進揮完、手最低的時候。
func build_baseball(an := "ft/baseball_hit") -> void:
	var keep_model := model.transform
	model.transform = model_base
	var L := anim.get_animation(an).length
	var dt := 1.0 / 120.0
	var best := {"v": -1.0}
	var prev := Vector3.INF
	var tt := 1.0
	while tt < minf(1.9, L):
		pose_at(an, tt)
		var x := bat_frame_xf()
		var s := x * Vector3(0, BAT_SWEET, 0)
		if prev != Vector3.INF:
			var v := (s - prev) / dt
			if v.length() > float(best["v"]):
				best = {"v": v.length(), "t": tt, "s": s, "vel": v, "axis": x.basis.y.normalized()}
		prev = s
		tt += dt
	var ax: Vector3 = best["axis"]
	var vel: Vector3 = best["vel"]
	var nrm := (vel - ax * vel.dot(ax)).normalized()
	var center: Vector3 = (best["s"] as Vector3) + nrm * (bat_radius(BAT_SWEET) + BALL_R + 0.003)
	var out := Vector3(nrm.x, 0, nrm.z).normalized()
	var out_v := (out * cos(deg_to_rad(22.0)) + Vector3.UP * sin(deg_to_rad(22.0))) * 16.0
	var pitch_from := center + Vector3(nrm.x, 0, nrm.z).normalized() * 9.0 + Vector3(0, 0.35, 0)
	# 丟棒：揮完之後右手最低那一格（跟進結束、開始跑之前）
	var t_drop := 2.1
	var lowy := 9.0
	tt = float(best["t"]) + 0.35
	while tt < L - 0.4:
		pose_at(an, tt)
		var y := fpos(_hand_key()).y
		if y < lowy:
			lowy = y
			t_drop = tt
		tt += 1.0 / 30.0
	# 動作結束時臀部位置與跑的方向
	pose_at(an, L - 0.15)
	var h0 := fpos("hips")
	pose_at(an, L)
	var h1 := fpos("hips")
	var rd := Vector3(h1.x - h0.x, 0, h1.z - h0.z).normalized()
	bb = {"an": an, "len": L, "t_c": best["t"], "center": center, "nrm": nrm, "out_v": out_v, "pitch_from": pitch_from,
		"pitch_T": 0.65, "t_drop": t_drop, "hips_end": h1, "run_dir": rd}
	model.transform = keep_model
	print("BASEBALL contact t=%.3f sweet=%s nrm=%s drop t=%.2f run_dir=%s" % [best["t"], best["s"], nrm, t_drop, rd])

func start_baseball(xf_hand: Transform3D) -> void:
	if bat == null:
		attach_bat(xf_hand)
	if bb.is_empty():
		build_baseball()
		fit_bat_to_hands()
		build_baseball()
	bb_ball = prim(props, sph(BALL_R), Vector3(0, -50, 0), "#f8f9fa", Vector3.ZERO, 0.006)
	base_node = Node3D.new()
	props.add_child(base_node)
	var plate := prim(base_node, cyl(0.19, 0.19, 0.02), Vector3(0, 0.01, 0), "#f8f9fa", Vector3.ZERO, 0.006)
	plate.name = "Base"
	restart_baseball()

func restart_baseball() -> void:
	bb_t = 0.0
	bb_phase = "pitch"
	bb_drop = {}
	model.transform = model_base
	if bat.get_parent() != bat_ba:
		bat.get_parent().remove_child(bat)
		bat_ba.add_child(bat)
	bat.transform = bat_xf
	bat.visible = true
	var he: Vector3 = bb["hips_end"]
	var rd: Vector3 = bb["run_dir"]
	var bp := Vector3(he.x, 0, he.z) + rd * run_dist
	base_node.position = Vector3(bp.x, g(bp), bp.z)
	pose_at(bb["an"], 0.0)

## 球棒握把軸線＝接觸那一格右手手心和彎起的手指圍成的洞（量網格）；右手在握把上段（離棒尾 13 cm）
## dir_from_fingers：棒頭方向用「食指根→小指根」判斷（吉祥物手洞軸轉很多時，舊棒子方向會選反）
func fit_bat_to_hands(dir_from_fingers := false) -> void:
	var keep_model := model.transform
	model.transform = model_base
	pose_at(bb["an"], float(bb["t_c"]))
	var old := bat_frame_xf()
	var gfit := fit_grip("right", BAT_R0 + 0.001)
	var d: Vector3 = gfit["d"]
	var ref := old.basis.y
	if dir_from_fingers:
		var S2 := sk2f()
		ref = (S2 * gp("righthandindex1").origin) - (S2 * gp("righthandpinky1").origin)
	if d.dot(ref) < 0.0:
		d = -d
	var x := d.cross(old.basis.z).normalized()
	if x.length() < 0.1:
		x = d.cross(Vector3.UP).normalized()
	var z := x.cross(d).normalized()
	var origin: Vector3 = (gfit["c"] as Vector3) - d * 0.13
	var want := Transform3D(Basis(x, d, z), origin)
	bat_xf = (sk2f() * gp(_hand_key())).affine_inverse() * want
	bat.transform = bat_xf
	model.transform = keep_model
	print("BAT fit: hollow r=%.1f mm wrap=%d axis turned %.1f°" % [float(gfit["free"]) * 1000.0, int(gfit.get("wrap", 0)), rad_to_deg(old.basis.y.angle_to(d))])

## 回傳 true＝這一輪結束（遊戲可以淡出再 restart_baseball）
func update_baseball(delta: float) -> bool:
	if bb.is_empty():
		return false
	bb_t += delta
	var L: float = bb["len"]
	var tc: float = bb["t_c"]
	# 球
	var T: float = bb["pitch_T"]
	var c: Vector3 = bb["center"]
	if bb_t < tc - T:
		bb_ball.visible = false
	elif bb_t <= tc:
		bb_ball.visible = true
		var k := (bb_t - (tc - T)) / T
		var p0: Vector3 = bb["pitch_from"]
		var p := p0.lerp(c, k)
		p.y += 0.0   # 直線＋下墜：p0 比 c 高 0.35 m，等速往下（看起來是下墜的直球）
		bb_ball.position = p
	else:
		var tf := bb_t - tc
		var v: Vector3 = bb["out_v"]
		var p := c + v * tf + Vector3(0, -4.9 * tf * tf, 0)
		bb_ball.position = p
		bb_ball.visible = tf < 3.0 and p.y > g(p) + BALL_R - 0.001
	# 角色
	if bb_t <= L:
		bb_phase = "swing" if bb_t < float(bb["t_drop"]) else "drop"
		pose_at(bb["an"], bb_t)
	else:
		if bb_phase != "run" and bb_phase != "base":
			bb_phase = "run"
			var he: Vector3 = bb["hips_end"]
			var rd: Vector3 = bb["run_dir"]
			anim.play(run_anim, 0.0)
			anim.seek(0.0, true)
			anim.advance(0.0)
			# 換成慢跑：面向跑的方向，臀部接在動作最後的位置
			var yaw := atan2(rd.x, rd.z)
			var basis := model_base.basis * Basis(Vector3.UP, yaw)
			model.transform = Transform3D(basis, model_base.origin)
			var hj := fpos("hips")
			model.transform.origin += Vector3(he.x - hj.x, 0, he.z - hj.z)
			run_from = model.transform.origin
			run_dir = rd
			gait_setup()
		if bb_phase == "run":
			var ss := stride_speed_cached(run_anim)
			anim.speed_scale = 1.0
			anim.advance(delta * run_v / ss)
			model.transform.origin += run_dir * run_v * delta
			gait_fix(delta, 0.0, 0.012, 0.35, false, true)   # 跑壘：腳跟著地不陷地
			var bp := base_node.position
			var hj := fpos("hips")
			if Vector2(hj.x - bp.x, hj.z - bp.z).dot(Vector2(run_dir.x, run_dir.z)) >= -0.05:
				bb_phase = "base"
				anim.play("idle" if anim.has_animation("idle") else run_anim, 0.2)
				anim.advance(0.0)
		elif bb_phase == "base":
			anim.advance(delta)
	# 丟棒：手鬆開那一格起，棒子自己掉（重力），落地躺平
	if bb_t >= float(bb["t_drop"]) and bb_drop.is_empty():
		var x0 := bat_frame_xf()
		bat_ba.remove_child(bat)
		props.add_child(bat)
		bat.transform = Transform3D(x0.basis, x0.origin)
		bat.scale = Vector3.ONE
		var axh := Vector3(x0.basis.y.x, 0, x0.basis.y.z).normalized()
		if axh.length() < 0.1:
			axh = Vector3.FORWARD
		var mid := x0 * Vector3(0, 0.26, 0)
		# 躺平：棒頭（半徑 2.8 cm）和握把尾端（2.0 cm）都貼地 → 棒頭那端微微抬高
		var a := asin((0.028 - 0.018) / BAT_LEN)
		var by := (axh * cos(a) + Vector3.UP * sin(a)).normalized()
		var bx := by.cross(Vector3.UP).normalized()
		var lie := Basis(bx, by, bx.cross(by).normalized())
		var gm := g(mid)
		var lie_o := Vector3(mid.x, 0, mid.z) - lie * Vector3(0, 0.26, 0)
		var knob := lie_o + lie * Vector3(0, -0.05, 0)
		lie_o.y += gm + 0.018 - knob.y
		var fall_h := maxf(mid.y - gm, 0.05)
		bb_drop = {"xf0": Transform3D(x0.basis, x0.origin), "xf1": Transform3D(lie, lie_o), "t0": bb_t, "T": sqrt(2.0 * fall_h / 9.8)}
	if not bb_drop.is_empty():
		var k := clampf((bb_t - float(bb_drop["t0"])) / float(bb_drop["T"]), 0.0, 1.0)
		var e := k * k   # 自由落體：位移 ∝ t²
		var a: Transform3D = bb_drop["xf0"]
		var b: Transform3D = bb_drop["xf1"]
		bat.transform = Transform3D(Basis(a.basis.get_rotation_quaternion().slerp(b.basis.get_rotation_quaternion(), e)), a.origin.lerp(b.origin, e))
	return bb_phase == "base" and bb_t > L + 4.5

## [perf] 跑壘時間上限（遊戲用真實時間判斷）：直接放到壘包上，換成站姿
func finish_run() -> void:
	if bb_phase != "run":
		return
	var bp := base_node.position
	var hj := fpos("hips")
	var d := Vector2(bp.x - hj.x, bp.z - hj.z).dot(Vector2(run_dir.x, run_dir.z)) - 0.05
	if d > 0.0:
		model.transform.origin += run_dir * d
	bb_phase = "base"
	anim.play("idle" if anim.has_animation("idle") else run_anim, 0.2)
	anim.advance(0.0)

var _ss_cache := {}
func stride_speed_cached(an: String) -> float:
	if not _ss_cache.has(an):
		var keep := save_pose()
		var keep_t := anim.current_animation_position
		var keep_a := anim.current_animation
		var keep_x := model.transform
		model.transform = model_base
		_ss_cache[an] = stride_speed(an)
		model.transform = keep_x
		if keep_a != "":
			anim.play(keep_a, 0.0)
			anim.seek(keep_t, true)
			anim.advance(0.0)
		load_pose(keep)
	return _ss_cache[an]

func measure_baseball() -> Dictionary:
	var out := {"phase": bb_phase, "t": bb_t}
	if bat.get_parent() == bat_ba:
		var x := bat_frame_xf()
		var a := x * Vector3(0, -0.05, 0)
		var b := x * Vector3(0, 0.57, 0)
		var c := bb_ball.position
		var ab := b - a
		var s := clampf((c - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		var q := a + ab * s
		out["ball_bat_gap_cm"] = (c.distance_to(q) - bat_radius(s * 0.62 - 0.05) - BALL_R) * 100.0
		out["ball_visible"] = bb_ball.visible
		# 兩手到棒子（握把段）
		for sd in ["left", "right"]:
			var m := 9.0
			var inside := 0
			for p in mesh_pts([sd + "hand"]):
				var ss := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
				var d := p.distance_to(a + ab * ss) - bat_radius(ss * 0.62 - 0.05)
				m = minf(m, d)
				if d < -0.003:
					inside += 1
			out["hand_%s_bat_gap_cm" % sd] = m * 100.0
			out["hand_%s_in_bat" % sd] = inside
		out["bat_in_hand"] = true
	else:
		out["bat_in_hand"] = false
		var x := bat.transform
		var lo := minf((x * Vector3(0, -0.05, 0)).y - 0.018, (x * Vector3(0, 0.57, 0)).y - 0.028)
		out["bat_ground_gap_cm"] = (lo - g(x.origin)) * 100.0
	return out

# ═════════ 其他戶外道具（籃框、露營、音符）：遊戲與檢查場景同一份 ═════════
## 籃框在角色前面 dist 公尺（籃板面向角色）
func build_hoop(dist := 2.8) -> Node3D:
	var hoop := Node3D.new()
	hoop.position = Vector3(0.0, g(Vector3(0, 0, dist)), dist)
	props.add_child(hoop)
	prim(hoop, cyl(0.05, 0.06, 2.6), Vector3(0, 1.3, 0.35), "#5a5f6a")
	prim(hoop, BoxMesh.new(), Vector3(0, 2.45, 0.1), "#f8f9fa").scale = Vector3(1.0, 0.65, 0.04)
	prim(hoop, BoxMesh.new(), Vector3(0, 2.36, 0.07), "#e03131").scale = Vector3(0.36, 0.26, 0.05)
	var ring := TorusMesh.new()
	ring.inner_radius = 0.2
	ring.outer_radius = 0.23
	prim(hoop, ring, Vector3(0, 2.15, -0.2), "#fd7e14")
	prim(hoop, BoxMesh.new(), Vector3(0, 2.15, 0.0), "#5a5f6a").scale = Vector3(0.04, 0.03, 0.16)   # 籃框支架
	return hoop

## 露營：帳篷在左後、營火在左前（角色跪著面向營火）
func build_camp() -> Node3D:
	var tent := Node3D.new()
	tent.position = Vector3(-1.6, g(Vector3(-1.6, 0, -1.2)), -1.2)
	tent.rotation.y = 0.6
	props.add_child(tent)
	var pr := PrismMesh.new()
	pr.size = Vector3(1.6, 1.15, 1.9)
	prim(tent, pr, Vector3(0, 0.575, 0), "#2f9e44")
	var dr := PrismMesh.new()
	dr.size = Vector3(0.5, 0.6, 0.02)
	prim(tent, dr, Vector3(0, 0.3, 0.955), "#1b5e2a")
	var fire := Node3D.new()
	fire.position = Vector3(0.0, g(Vector3(0, 0, 0.9)), 0.9)
	fire.name = "Fire"
	props.add_child(fire)
	for j in 3:
		prim(fire, cyl(0.04, 0.04, 0.5), Vector3(0, 0.04, 0), "#7a4a24", Vector3(PI / 2, j * PI / 3, 0))
	for j in 7:   # 石頭圍一圈
		var a := j * TAU / 7
		prim(fire, sph(0.06), Vector3(cos(a) * 0.3, 0.03, sin(a) * 0.3), "#9a9aa0")
	var fl := prim(fire, cyl(0.0, 0.16, 0.42), Vector3(0, 0.29, 0), "#ffb020", Vector3.ZERO, 0.0)
	fl.name = "Flame"
	(fl.material_override as StandardMaterial3D).emission_enabled = true
	(fl.material_override as StandardMaterial3D).emission = Color("#ffb020")
	(fl.material_override as StandardMaterial3D).emission_energy_multiplier = 2.5
	var fl2 := prim(fire, cyl(0.0, 0.09, 0.3), Vector3(0, 0.23, 0), "#fff07a", Vector3.ZERO, 0.0)
	fl2.name = "Flame2"
	(fl2.material_override as StandardMaterial3D).emission_enabled = true
	(fl2.material_override as StandardMaterial3D).emission = Color("#fff07a")
	(fl2.material_override as StandardMaterial3D).emission_energy_multiplier = 3.0
	var li := OmniLight3D.new()
	li.name = "Light"
	li.light_color = Color("#ffb34d")
	li.omni_range = 4.0
	li.light_energy = 1.6
	li.position = Vector3(0, 0.5, 0)
	fire.add_child(li)
	return fire

func update_camp(t: float) -> void:
	var fire := props.get_node_or_null("Fire")
	if fire:
		var s := 1.0 + 0.18 * sin(t * 13.0) + 0.1 * sin(t * 7.3)
		(fire.get_node("Flame") as Node3D).scale = Vector3(1.0, s, 1.0)
		(fire.get_node("Flame2") as Node3D).scale = Vector3(1.0, 2.0 - s, 1.0)
		(fire.get_node("Light") as OmniLight3D).light_energy = 1.3 + 0.5 * s

## 量：身體最低點離地、膝蓋離地、身體到營火中心最近（水平）、穿進帳篷的頂點數
func measure_ground_body(fire_c := Vector3.INF) -> Dictionary:
	var out := {}
	var pts := mesh_pts(["hips", "spine", "neck", "head", "left", "right"])
	var low := 9.0
	var knee := 9.0
	var feet := 9.0
	var below := 0
	var fire_d := 9.0
	for p in pts:
		var gy := g(p)
		low = minf(low, p.y - gy)
		if p.y < gy - 0.005:
			below += 1
		if fire_c != Vector3.INF:
			fire_d = minf(fire_d, Vector2(p.x - fire_c.x, p.z - fire_c.z).length())
	for sd in ["left", "right"]:
		var kp := fpos(sd + "leg")
		for p in mesh_pts([sd + "leg"]):
			if p.distance_to(kp) < 0.07:
				knee = minf(knee, p.y - g(p))
		for p in mesh_pts([sd + "foot", sd + "toe"]):
			feet = minf(feet, p.y - g(p))
	out["lowest_cm"] = low * 100.0
	out["knee_cm"] = knee * 100.0
	out["feet_cm"] = feet * 100.0
	out["below_ground_verts"] = below
	if fire_c != Vector3.INF:
		out["body_to_fire_cm"] = fire_d * 100.0
	return out

# ═════════ 動作貼地：每個動作量一次「身體最低點」→ 模型要上下移多少，腳／膝蓋才剛好碰地 ═════════
const BODY_KEYS := ["hips", "spine", "neck", "head", "left", "right"]
## gait＝走路／跑步：取每一格最低點的中位數（踩地那隻腳貼地，腳跟著地時可以壓一點點）；其他動作取整段最低點
## feet_only：走／跑只算腳（不把手臂算進去）
func ground_offset(an: String, gait := false, samples := 36, feet_only := false) -> float:
	var keep := save_pose()
	var keep_x := model.transform
	model.transform = model_base
	var L := anim.get_animation(an).length
	var lows := []
	for i in samples:
		pose_at(an, L * i / samples)
		var low := 9.0
		var keys: Array = BODY_KEYS if not gait else (["leftfoot", "lefttoe", "rightfoot", "righttoe"] if feet_only else ["left", "right"])
		for p in mesh_pts(keys):
			low = minf(low, p.y)
		lows.append(low - model_base.origin.y)
	model.transform = keep_x
	load_pose(keep)
	lows.sort()
	var v: float = lows[lows.size() / 2] if gait else lows[0]
	return -v

# ═════════ 聽音樂：上半身跟著節拍搖（腳不動） ═════════
## 動作套完之後再呼叫：脊椎左右搖 deg 度、頭跟著點一點
func music_sway(t: float, deg := 4.0) -> void:
	var b := bi("spine")
	var q := sk.get_bone_pose_rotation(b)
	sk.set_bone_pose_rotation(b, q * Quaternion(Vector3(0, 0, 1), deg_to_rad(deg) * sin(t * PI * 2.0)))
	var h := bi("head")
	var qh := sk.get_bone_pose_rotation(h)
	sk.set_bone_pose_rotation(h, qh * Quaternion(Vector3(1, 0, 0), deg_to_rad(5.0) * maxf(0.0, sin(t * PI * 4.0))))

# ═════════ 走路／跑步：擺動中的腳不擦地（Mixamo 落地前腳太低、會刷過地面）═════════
var gait := {}
## 量：腳骨、腳趾骨離各自那段腳底最低點多高（站好時）
func gait_setup() -> void:
	gait = {}
	for sd in ["left", "right"]:
		var fl := 9.0
		for p in mesh_pts([sd + "foot"]):
			fl = minf(fl, p.y)
		var tl := 9.0
		for p in mesh_pts([sd + "toe"]):
			tl = minf(tl, p.y)
		gait[sd] = {"a": fpos(sd + "foot").y - fl, "b": fpos(sd + "toebase").y - tl, "prev": Vector3.INF}

## 動作套完之後每格呼叫：move＝這一格角色在 frame 裡沒算到的前進距離（遊戲裡 frame 跟著走 → 傳 速度×dt；檢查場景模型自己動 → 傳 0）
## 腳在動（> 0.35 m/s）而且腳底低於 clear → 兩節 IK 把腳踝抬起來（膝蓋方向不變）
## min_speed：腳動多快才算「擺動中」；mesh_height：腳高用網格最低點（慢，但準）
## ground_clamp：每格量兩腳腳底網格最低點，低於地面就用 IK 把那隻腳抬到剛好碰地（腳跟著地不陷地，11/10 老師）
func gait_fix(dt: float, move := 0.0, clear := 0.012, min_speed := 0.35, mesh_height := false, ground_clamp := false) -> void:
	if gait.is_empty() or dt <= 0.0:
		return
	for sd in ["left", "right"]:
		var G: Dictionary = gait[sd]
		var F := fpos(sd + "foot")
		var T := fpos(sd + "toebase")
		var h := minf(F.y - float(G["a"]), T.y - float(G["b"])) - g(F)
		if mesh_height:
			h = 9.0
			for q in sole_pts(sd):
				h = minf(h, q.y - g(q))
		var prev: Vector3 = G["prev"]
		G["prev"] = T
		if prev == Vector3.INF:
			continue
		var sp := Vector2(T.x - prev.x, T.z - prev.z + move).length() / dt
		if sp < min_speed or h >= clear:
			continue
		lift_foot(sd, clear - h)
	if ground_clamp:
		for it in 2:
			for sd in ["left", "right"]:
				var low := 9.0
				for q in sole_pts(sd):
					low = minf(low, q.y - g(q))
				if low < 0.0005:
					lift_foot(sd, 0.0015 - low)

## 兩節 IK：把 sd 那隻腳的腳踝往上抬 lift（腳掌方向不變、膝蓋方向不變）
func lift_foot(sd: String, lift: float) -> void:
	var F2S := sk2f().affine_inverse()
	var F := fpos(sd + "foot")
	var up := gp(sd + "upleg")
	var lg := gp(sd + "leg")
	var ft := gp(sd + "foot")
	var H := up.origin
	var K := lg.origin
	var A := ft.origin
	var At := F2S * (F + Vector3(0, lift, 0))
	var l1 := H.distance_to(K)
	var l2 := K.distance_to(A)
	var pole := K - (H + A) * 0.5
	var E := Pose._elbow(H, At, l1, l2, pole)
	var Bf := ft.basis.orthonormalized()
	var Bu2 := (Pose._arc(K - H, E - H) * up.basis.orthonormalized()).orthonormalized()
	_set_local(sd + "upleg", Bu2)
	var Bl := (Bu2 * Basis(sk.get_bone_pose_rotation(bi(sd + "leg")))).orthonormalized()
	var cur := Bl * sk.get_bone_pose_position(bi(sd + "foot"))
	var Bl2 := (Pose._arc(cur, At - E) * Bl).orthonormalized()
	sk.set_bone_pose_rotation(bi(sd + "leg"), (Bu2.inverse() * Bl2).get_rotation_quaternion())
	sk.set_bone_pose_rotation(bi(sd + "foot"), (Bl2.inverse() * Bf).get_rotation_quaternion())

## 下車：腳踏車停在角色左邊（側柱撐著、車身往左斜 8°），之後由呼叫者決定什麼時候收掉
func park_bike(parent: Node3D, xf: Transform3D) -> void:
	if bike == null:
		return
	riding = false
	bike.get_parent().remove_child(bike)
	parent.add_child(bike)
	bike.transform = xf
	update_bike(0.0, 0.0)
	bike_rig.transform = Transform3D(Basis(Vector3(0, 0, 1), deg_to_rad(8.0)), bike_rig.transform.origin)
	bike.visible = true
	model.transform = model_base

func unpark_bike() -> void:
	if bike and bike_parent and bike.get_parent() != bike_parent:
		bike.get_parent().remove_child(bike)
		bike_parent.add_child(bike)
		bike.transform = Transform3D.IDENTITY
