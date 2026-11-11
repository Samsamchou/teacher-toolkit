extends "res://scripts/act_motion.gd"
## [mascot] 水鈴、圳寶（大頭、短手短腳，身高 1.15–1.2 m、腿長約 0.28 m）的戶外活動。
## 沿用 act_motion.gd（接觸事件驅動、網格量測），只覆寫需要「吉祥物尺寸」的部分：
##   腳踏車：輪子下限 0.18 → bike_r_min、握把長度＝手寬（原本 ±5 cm 會穿過整隻小手）
##   運球：球半徑 0.12 → 0.09（3 號兒童球）＋ 身體穿進球的量測
##   棒球：兒童短球棒（長 0.46、握把段等粗 → 手不會被變粗的棒身吃進去）、丟棒躺平照新尺寸
##   pose_at：同一個動作也強制重播（吉祥物沒有 idle，跑壘到壘包後用 0.2 秒混合播 jogging，之後的 seek 會失效 → stride_speed＝0）
## 檢查場景：scripts/mascot_motion_check.gd（test_motion_mascots/<who>/）。

var bike_r_min := 0.08   # 輪半徑＝0.42×腿長，最小 8 cm（圳寶腿長 0.16 m → 幼兒車；水鈴 0.28 m → 12 cm）
var grip_half := 0.03
var bar_scale := 0.8

## 動作一定重播再跳到 t（不信任 current_animation：混合中／已停止時 seek 不會套到骨架）
func pose_at(an: String, t: float, replay := false) -> void:
	if replay or anim.current_animation != an or not anim.is_playing():
		anim.play(an, 0.0)
	if _pb_active(an, t):
		t = _pb_snap(t)   # v5：身體動作也對齊到球棒表的格子
	anim.seek(t, true)
	anim.advance(0.0)
	if flatten_feet and (an == "ft/jogging" or an == "walk"):
		_flatten_feet()
	if _pb_active(an, t):
		if not _pb_building:
			_hands_on_bat(t)
		return
	if not _arm_off_dis and not arm_mag.is_empty() and not bb.is_empty() and an == String(bb["an"]):
		_apply_arm_off(_arm_at(t))
	if left_on_bat and bat_ba and not bb.is_empty() and an == String(bb["an"]) and t < float(bb.get("t_drop", 9.0)) - 0.25:
		_left_hand_to_bat()

# ═════════ 腳踏車（吉祥物尺寸）═════════
func build_bike(drive_anim := "ft/driving", drive_t := 1.2, lean_deg := 20.0, r_grip := 0.012, r_min := 0.08, p_grip_half := 0.03, grip_step := 1) -> void:
	if bike:
		return
	if bike_bake_path != "" and FileAccess.file_exists(bike_bake_path) and _load_bike_bake():
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
	var r := clampf(0.42 * l, bike_r_min, 0.32)   # [mascot] 輪子下限 0.18 → bike_r_min（吉祥物腿長 0.28 m → 童車約 12 吋）
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
		grips[sd] = _relax_grip(sd, fit_grip(sd, r_grip), r_grip)   # [mascot] fit_grip 只看一半頂點 → 用全部頂點把握把推出手外
	var keep_pose := save_pose()
	B = {"m0": m0, "r_grip_want": r_grip, "r": r, "Rc": Rc, "C": C, "lift": lift, "seat_y": seat_y + lift, "seat_z": seat_z, "legs": legs, "l": l, "grips": grips}
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
	print("MASCOT BIKE leg=%.3f r=%.3f crank=%.3f lift=%.3f seat_y=%.3f grips L=%s R=%s" % [l, r, Rc, lift, seat_y + lift, grips["left"], grips["right"]])

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
		tube(bike_rig, bar_c, c - d * (grip_half - 0.005), 0.011 * bar_scale, "#444450")
		tube(bike_rig, c - d * grip_half, c + d * grip_half, rg, "#222228", 0.004)   # [mascot] 握把長度＝手寬
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
				if absf(ax) > grip_half:
					continue
				var rr := (v - d * ax).length() - float(B["r_grip"])
				m = minf(m, rr)
				if rr < -0.002:
					inside += 1
			out["hand_%s_grip_gap_cm" % sd] = m * 100.0
			out["hand_%s_in_grip" % sd] = inside
	return out

# ═════════ 運球（3 號兒童球）═════════
var mascot_ball_r := 0.09

func start_dribble() -> void:
	if dribble_tab.is_empty():
		build_dribble("ft/dribble", "right", mascot_ball_r, 1.0 / 240.0)   # 1/60 秒取樣：落地那一格內插後球離地 2.7 cm（球速 2 m/s × 1/60 s）
	super.start_dribble()

## 多量：身體（運球的右手以外）穿進球的頂點數、身體表面到球最近
func measure_dribble() -> Dictionary:
	var out := super.measure_dribble()
	var c := ball.position
	var inside := 0
	var m := 9.0
	for p in mesh_pts(["hips", "spine", "neck", "head", "leftupleg", "rightupleg", "leftleg", "rightleg", "leftfoot", "rightfoot", "lefttoe", "righttoe", "leftarm", "leftforearm", "lefthand"]):
		var d := p.distance_to(c) - ball_r
		m = minf(m, d)
		if d < -0.003:
			inside += 1
	out["body_in_ball"] = inside
	out["body_ball_gap_cm"] = m * 100.0
	out["ball_r_cm"] = ball_r * 100.0
	return out

# ═════════ 棒球（兒童短球棒）═════════
## 棒子座標：+Y＝棒頭方向，原點＝右手往下 bat_hand_off；握把尾端（knob）在 -bat_knob
var bat_len := 0.46        # 全長（knob 到棒頭）
var bat_knob := 0.03       # 原點到握把尾端
var bat_handle := 0.13     # 原點以上這一段是等粗握把（兩隻小手都握在這段）
var bat_taper := 0.11      # 之後漸粗到棒身
var bat_r0 := 0.0105       # 握把半徑（直徑 2.1 cm）
var bat_r1 := 0.024        # 棒身半徑
var bat_hand_off := 0.075  # 右手在原點以上 7.5 cm（左手在它下面、knob 上面）

func _bat_top() -> float:
	return bat_len - bat_knob

func _bat_sweet() -> float:
	return _bat_top() - 0.09

func bat_radius(s: float) -> float:
	if s <= bat_handle:
		return bat_r0
	return lerpf(bat_r0, bat_r1, clampf((s - bat_handle) / bat_taper, 0.0, 1.0))

func attach_bat(xf_hand: Transform3D) -> void:
	bat = Node3D.new()
	var top := _bat_top()
	var s1 := bat_handle + bat_taper
	prim(bat, cyl(bat_r0, bat_r0, bat_handle + bat_knob), Vector3(0, (bat_handle - bat_knob) * 0.5, 0), "#c08a4a", Vector3.ZERO, 0.004)
	prim(bat, cyl(bat_r1, bat_r0, bat_taper), Vector3(0, bat_handle + bat_taper * 0.5, 0), "#c08a4a", Vector3.ZERO, 0.005)
	prim(bat, cyl(bat_r1, bat_r1, top - s1), Vector3(0, (s1 + top) * 0.5, 0), "#c08a4a", Vector3.ZERO, 0.006)
	prim(bat, sph(bat_r1), Vector3(0, top, 0), "#c08a4a", Vector3.ZERO, 0.0).scale = Vector3(1, 0.35, 1)
	prim(bat, cyl(bat_r0 + 0.004, bat_r0 + 0.004, 0.012), Vector3(0, -bat_knob, 0), "#222228", Vector3.ZERO, 0.003)   # 握把尾端的圓頭
	bat_ba = BoneAttachment3D.new()
	bat_ba.bone_name = sk.get_bone_name(bi(_hand_key()))
	sk.add_child(bat_ba)
	bat_ba.add_child(bat)
	var inv := 1.0 / sk.global_transform.basis.get_scale().x
	bat_xf = Transform3D(xf_hand.basis.scaled(Vector3.ONE * inv), xf_hand.origin * inv)
	bat.transform = bat_xf

## 同 act_motion.build_baseball，只是甜蜜點＝短球棒的棒頭往下 9 cm、來球距離與出球速度依小朋友縮小
func build_baseball(an := "ft/baseball_hit") -> void:
	var keep_model := model.transform
	model.transform = model_base
	var L := anim.get_animation(an).length
	var dt := 1.0 / 120.0
	var best := {"v": -1.0}
	var prev := Vector3.INF
	var tt := 1.0
	var sw := _bat_sweet()
	var t_end := minf(1.9, L)
	if pbat and not pb6_keys.is_empty():   # v6：接觸＝接觸關鍵姿勢那一格（棒面朝前、往前揮），不是最快那一格
		tt = _pb_snap(pb_tc)
		t_end = tt + 0.5 * dt
		pose_at(an, tt - dt)
		prev = bat_frame_xf() * Vector3(0, sw, 0)
	elif pbat and not pb_tab.is_empty():   # v5：程式球棒 → 只在「接觸」關鍵姿勢前後找最快的那一格
		tt = _pb_snap(pb_tc - 0.10)
		t_end = pb_tc + 0.08
	while tt < t_end:
		pose_at(an, tt)
		var x := bat_frame_xf()
		var s := x * Vector3(0, sw, 0)
		if prev != Vector3.INF:
			var v := (s - prev) / dt
			if v.length() > float(best["v"]):
				best = {"v": v.length(), "t": tt, "s": s, "vel": v, "axis": x.basis.y.normalized()}
		prev = s
		tt += dt
	var ax: Vector3 = best["axis"]
	var vel: Vector3 = best["vel"]
	var nrm := (vel - ax * vel.dot(ax)).normalized()
	var center: Vector3 = (best["s"] as Vector3) + nrm * (bat_radius(sw) + BALL_R + 0.003)
	var outd := Vector3(nrm.x, 0, nrm.z).normalized()
	var out_v := (outd * cos(deg_to_rad(22.0)) + Vector3.UP * sin(deg_to_rad(22.0))) * 12.0
	var pitch_from := center + Vector3(nrm.x, 0, nrm.z).normalized() * 7.0 + Vector3(0, 0.25, 0)
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
	pose_at(an, L - 0.15)
	var h0 := fpos("hips")
	pose_at(an, L)
	var h1 := fpos("hips")
	var rd := Vector3(h1.x - h0.x, 0, h1.z - h0.z).normalized()
	bb = {"an": an, "len": L, "t_c": best["t"], "center": center, "nrm": nrm, "out_v": out_v, "pitch_from": pitch_from,
		"pitch_T": 0.65, "t_drop": t_drop, "hips_end": h1, "run_dir": rd}
	model.transform = keep_model
	print("MASCOT BASEBALL contact t=%.3f sweet=%s nrm=%s drop t=%.2f run_dir=%s" % [best["t"], best["s"], nrm, t_drop, rd])

## 握把軸線＝接觸那一格右手的手洞；原點＝右手往下 bat_hand_off
func fit_bat_to_hands(dir_from_fingers := true) -> void:
	var keep_model := model.transform
	model.transform = model_base
	pose_at(bb["an"], float(bb["t_c"]))
	var old := bat_frame_xf()
	var gfit := fit_grip("right", bat_r0 + 0.001)
	var d: Vector3 = gfit["d"]
	# [mascot] 棒頭從食指／拇指那一側出去、握把尾端在小指那一側（不能用原本棒子的方向判斷：
	# 手洞軸線轉了 62°，用舊方向選到反的 → 球棒朝下穿過裙子和腿）
	var idx := fpos("righthandindex1") - fpos("righthandpinky1")
	if d.dot(idx) < 0.0:
		d = -d
	var x := d.cross(old.basis.z).normalized()
	if x.length() < 0.1:
		x = d.cross(Vector3.UP).normalized()
	var z := x.cross(d).normalized()
	var origin: Vector3 = (gfit["c"] as Vector3) - d * bat_hand_off
	var want := Transform3D(Basis(x, d, z), origin)
	bat_xf = (sk2f() * gp(_hand_key())).affine_inverse() * want
	bat.transform = bat_xf
	model.transform = keep_model
	print("MASCOT BAT fit: hollow r=%.1f mm wrap=%d axis turned %.1f deg" % [float(gfit["free"]) * 1000.0, int(gfit.get("wrap", 0)), rad_to_deg(old.basis.y.angle_to(d))])

## 丟棒那一格：act_motion 用 0.62 m 球棒算躺平位置 → 換成短球棒的躺平位置
func update_baseball(delta: float) -> bool:
	var had := not bb_drop.is_empty()
	var done := super.update_baseball(delta)
	if bat.get_parent() == bat_ba:
		bat.transform = bat_xf * _corr_now()   # 手腕修正（球棒不穿過頭）
		if pbat and _pb_active(String(bb["an"]), bb_t):
			# v5：不用 global_transform（BoneAttachment 要到下一個畫面才更新 → 球棒畫在「上一次更新時手的位置」；
			# 檢查場景連續更新很多步才畫一張，球棒整支畫歪）。改用現在的骨頭姿勢直接算區域座標
			var bone_w := sk.global_transform * sk.get_bone_global_pose(bi(_hand_key()))
			bat.transform = bone_w.affine_inverse() * (frame.global_transform * _pb_xf(bb_t))
	if not had and not bb_drop.is_empty():
		var a: Transform3D = bb_drop["xf0"]
		var axh := Vector3(a.basis.y.x, 0, a.basis.y.z).normalized()
		if axh.length() < 0.1:
			axh = Vector3.FORWARD
		var mid := a * Vector3(0, _bat_top() * 0.5, 0)
		var ang := asin((bat_r1 - (bat_r0 + 0.004)) / bat_len)   # 棒身和握把圓頭都貼地
		var by := (axh * cos(ang) + Vector3.UP * sin(ang)).normalized()
		var bx := by.cross(Vector3.UP).normalized()
		var lie := Basis(bx, by, bx.cross(by).normalized())
		var gm := g(mid)
		var lie_o := Vector3(mid.x, 0, mid.z) - lie * Vector3(0, _bat_top() * 0.5, 0)
		var knob := lie_o + lie * Vector3(0, -bat_knob, 0)
		lie_o.y += gm + bat_r0 + 0.004 - knob.y
		var fall_h := maxf(mid.y - gm, 0.05)
		bb_drop["xf1"] = Transform3D(lie, lie_o)
		bb_drop["T"] = sqrt(2.0 * fall_h / 9.8)
		bat.transform = a
	return done

func measure_baseball() -> Dictionary:
	var out := {"phase": bb_phase, "t": bb_t}
	var top := _bat_top()
	if bat.get_parent() == bat_ba:
		var x := bat_frame_xf()
		var a := x * Vector3(0, -bat_knob, 0)
		var b := x * Vector3(0, top, 0)
		var c := bb_ball.position
		var ab := b - a
		var s := clampf((c - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		var q := a + ab * s
		out["ball_bat_gap_cm"] = (c.distance_to(q) - bat_radius(s * bat_len - bat_knob) - BALL_R) * 100.0
		out["ball_visible"] = bb_ball.visible
		for sd in ["left", "right"]:
			if pbat and not pb_hands.has(sd):
				out["hand_%s_free" % sd] = true   # v5：這隻手沒握棒（單手揮棒）
				continue
			var m := 9.0
			var inside := 0
			for p in mesh_pts([sd + "hand"]):
				var ss := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
				var d := p.distance_to(a + ab * ss) - bat_radius(ss * bat_len - bat_knob)
				m = minf(m, d)
				if d < -0.003:
					inside += 1
			out["hand_%s_bat_gap_cm" % sd] = m * 100.0
			out["hand_%s_in_bat" % sd] = inside
		var hh := bat_body_hits()
		out["body_in_bat"] = int(hh[0])
		out["bat_in_head_pts"] = int(hh[1])
		out["bat_in_hand"] = true
	else:
		out["bat_in_hand"] = false
		var x := bat.transform
		var lo := minf((x * Vector3(0, -bat_knob, 0)).y - bat_r0 - 0.004, (x * Vector3(0, top, 0)).y - bat_r1)
		out["bat_ground_gap_cm"] = (lo - g(x.origin)) * 100.0
	out["bat_len_cm"] = bat_len * 100.0
	return out

## 握把推出手外：所有手的頂點（fit_grip 每兩個才取一個）離握把軸 < r＋1 mm 的，沿徑向把軸推開
func _relax_grip(sd: String, gd: Dictionary, r: float) -> Dictionary:
	var c: Vector3 = gd["c"]
	var d: Vector3 = (gd["d"] as Vector3).normalized()
	var pts := mesh_pts([sd + "hand"])
	var c0 := c
	for it in 40:
		var push := Vector3.ZERO
		var n := 0
		var worst := 0.0
		for p in pts:
			var v := p - c
			var ax := v.dot(d)
			if absf(ax) > grip_half:
				continue
			var rad := v - d * ax
			var depth := r + 0.001 - rad.length()
			if depth > 0.0:
				push -= rad.normalized() * depth
				n += 1
				worst = maxf(worst, depth)
		if n == 0:
			break
		c += push / n * 1.2
	gd["c"] = c
	print("MASCOT grip %s relaxed %.1f mm" % [sd, c.distance_to(c0) * 1000.0])
	return gd

# ═════════ 走路／跑步：擺動腳不擦地（吉祥物版門檻）═════════
## 吉祥物腿短、慢跑 1.0 m/s：擺動腳剛離地／快落地時腳速 < 0.35 m/s，act_motion 的門檻抬不到 → 腳貼地拖行。
## 這裡用：比「踩住那隻腳」快 gait_min_speed 就算在擺動
var gait_min_speed := 0.12
func gait_fix(dt: float, move := 0.0, clear := 0.012, min_speed := 0.12, mesh_height := true, ground_clamp := false) -> void:
	if gait.is_empty() or dt <= 0.0:
		return
	if flatten_feet:
		_flatten_feet()
	var F2S := sk2f().affine_inverse()
	for sd in ["left", "right"]:
		var G: Dictionary = gait[sd]
		var F := fpos(sd + "foot")
		var T := fpos(sd + "toebase")
		var prev: Vector3 = G["prev"]
		G["prev"] = T
		if prev == Vector3.INF:
			continue
		var sp := Vector2(T.x - prev.x, T.z - prev.z + move).length() / dt
		if sp < gait_min_speed:
			continue
		# [mascot] 腳底高度用網格最低點（骨頭到腳底的固定差在腳尖往下時會高估 → 腳刷地沒被抬）
		var h := 9.0
		for p in sole_pts(sd):   # [perf] 只量靴底那一層頂點（act_motion.sole_pts）
			h = minf(h, p.y - g(p))
		if h >= clear:
			continue
		var lift := clear - h
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

# ═════════ 棒球：球棒不穿過大頭（手腕微轉）═════════
## 吉祥物頭很大：Mixamo 揮棒準備（球棒扛在肩後）時，球棒會穿過頭髮／頭。
## 每 1/30 秒找「繞兩手中間轉最少角度、身體頂點全部在棒外 ≥ 3 mm」的手腕修正，平滑後套在球棒上（手還是握著握把段）。
var bat_corr := []          # [[t, Vector3 旋轉向量（棒子座標）], ...]
var _corr_off := false
const CORR_DT := 1.0 / 30.0

func _pivot() -> Vector3:
	return Vector3(0, bat_hand_off * 0.5, 0)

func _corr_at(t: float) -> Transform3D:
	if _corr_off or bat_corr.is_empty():
		return Transform3D.IDENTITY
	var f := clampf(t / CORR_DT, 0.0, bat_corr.size() - 1.001)
	var i := int(f)
	var rv: Vector3 = (bat_corr[i] as Vector3).lerp(bat_corr[i + 1] as Vector3, f - i)
	if rv.length() < 1e-5:
		return Transform3D.IDENTITY
	var b := Basis(rv.normalized(), rv.length())
	var p := _pivot()
	return Transform3D(b, p - b * p)

func _corr_now() -> Transform3D:
	if bb.is_empty() or anim.current_animation != String(bb["an"]):
		return Transform3D.IDENTITY
	return _corr_at(anim.current_animation_position)

func bat_frame_xf() -> Transform3D:
	if pbat and not bb.is_empty() and anim.current_animation == String(bb["an"]) and _pb_active(String(bb["an"]), anim.current_animation_position):
		return _pb_xf(anim.current_animation_position)
	var t := sk2f() * gp(_hand_key()) * bat_xf * _corr_now()
	return t.orthonormalized()

## 頭（含頭髮）是一大團封閉的網格：球棒整支埋在頭髮裡時，碰不到任何頂點 → 只量頂點會說「沒穿」。
## 所以頭用「星形深度圖」：從頭的中心往每個方向（36×18 格），頭的表面有多遠；棒子軸上的點比表面近＝在頭裡面。
const STAR_U := 36
const STAR_V := 18
func head_star() -> Dictionary:
	var hp := mesh_pts(["head", "neck"])
	var c := Vector3.ZERO
	for q in hp:
		c += q
	c /= maxf(hp.size(), 1)
	var mp := PackedFloat32Array()
	mp.resize(STAR_U * STAR_V)
	mp.fill(0.0)
	for q in hp:
		var d := q - c
		var k := _star_bin(d)
		mp[k] = maxf(mp[k], d.length())
	# 空格用鄰格補（取周圍最大值）
	var out := mp.duplicate()
	for v in STAR_V:
		for u in STAR_U:
			if mp[v * STAR_U + u] == 0.0:
				var m := 0.0
				for dv in range(-1, 2):
					for du in range(-1, 2):
						var vv := clampi(v + dv, 0, STAR_V - 1)
						m = maxf(m, mp[vv * STAR_U + (u + du + STAR_U) % STAR_U])
				out[v * STAR_U + u] = m
	return {"c": c, "m": out}

func _star_bin(d: Vector3) -> int:
	var r := maxf(d.length(), 1e-6)
	var u := int(floor((atan2(d.z, d.x) + PI) / TAU * STAR_U)) % STAR_U
	var v := clampi(int(floor((asin(clampf(d.y / r, -1.0, 1.0)) + PI * 0.5) / PI * STAR_V)), 0, STAR_V - 1)
	return v * STAR_U + u

func _in_star(S: Dictionary, p: Vector3, margin := 0.0) -> bool:
	var d := p - (S["c"] as Vector3)
	return d.length() + margin < (S["m"] as PackedFloat32Array)[_star_bin(d)]

## 球棒碰身體：[身體頂點在棒裡的數量, 棒子軸上在頭裡面的點數（每 2 cm 一點）]
func _bat_hits2(X: Transform3D, pts: PackedVector3Array, S: Dictionary, margin := 0.003) -> Array:
	var inv := X.affine_inverse()
	var n := 0
	var top := _bat_top()
	for p in pts:
		var q := inv * p
		if q.y < -bat_knob - 0.01 or q.y > top + 0.01:
			continue
		if Vector2(q.x, q.z).length() < bat_radius(clampf(q.y, -bat_knob, top)) + margin:
			n += 1
	var hn := 0
	var y := -bat_knob
	while y <= top:
		if _in_star(S, X * Vector3(0, y, 0), -bat_radius(y) - margin):
			hn += 1
		y += 0.02
	return [n, hn]

const BODY_NO_HEAD := ["hips", "spine", "leftupleg", "rightupleg", "leftarm", "rightarm", "leftforearm", "rightforearm"]   # v5：前臂也算
## 現在這一格（給量測用）
func bat_body_hits() -> Array:
	return _bat_hits2(bat_frame_xf(), mesh_pts(BODY_NO_HEAD), head_star(), 0.0)

## 手腕修正：整段只用「一個轉軸方向」（棒子往頭外面倒），每一格只變角度 θ(t)；
## θ(t)＝那一格不碰身體的最小角度 → 取 ±6 格最大值 → ±3 格平均（只會更大，不會又碰到；不會一格一格抖）
func build_bat_corr() -> void:
	var keep_model := model.transform
	model.transform = model_base
	_corr_off = true
	var an: String = bb["an"]
	var L := anim.get_animation(an).length
	var n := int(ceil(L / CORR_DT)) + 1
	var cache := []
	var p0 := _pivot()
	var worst0 := 0
	for i in n:
		var t := minf(i * CORR_DT, L)
		pose_at(an, t)
		var base := (sk2f() * gp(_hand_key()) * bat_xf).orthonormalized()
		var all := mesh_pts(BODY_NO_HEAD)
		var c := base * Vector3(0, _bat_top() * 0.5, 0)
		var pts := PackedVector3Array()
		for k in range(0, all.size(), 2):
			if all[k].distance_to(c) < _bat_top() * 0.5 + 0.08:
				pts.append(all[k])
		var S := head_star()
		var h0: Array = _bat_hits2(base, pts, S)
		var sc0 := int(h0[0]) + 10 * int(h0[1])
		worst0 = maxi(worst0, sc0)
		cache.append([base, pts, S, sc0])
	var best_ph := 0.0
	var best_cost := 1e9
	var best_th := []
	for ph in range(0, 360, 15):
		var ax := Vector3(cos(deg_to_rad(ph)), 0, sin(deg_to_rad(ph)))
		var ths := []
		var cost := 0.0
		var mx := 0.0
		for i in n:
			var th := 0.0
			if int(cache[i][3]) > 0:
				th = 999.0
				for d in range(5, 65, 5):
					var b := Basis(ax, deg_to_rad(d))
					var hh: Array = _bat_hits2((cache[i][0] as Transform3D) * Transform3D(b, p0 - b * p0), cache[i][1], cache[i][2])
					if int(hh[0]) + 10 * int(hh[1]) == 0:
						th = d
						break
			ths.append(th)
			mx = maxf(mx, th)
			cost += th
		cost += mx * 5.0
		if cost < best_cost:
			best_cost = cost
			best_ph = ph
			best_th = ths
	var dbg := ""
	for i in n:
		dbg += "%.2f:%d/%d " % [i * CORR_DT, int(cache[i][3]), int(best_th[i])]
	print("MASCOT bat raw hits/theta ", dbg)
	var ax0 := Vector3(cos(deg_to_rad(best_ph)), 0, sin(deg_to_rad(best_ph)))
	var env := []
	for i in n:
		var m := 0.0
		for j in range(maxi(0, i - 6), mini(n, i + 7)):
			m = maxf(m, minf(float(best_th[j]), 60.0))
		env.append(m)
	bat_corr.clear()
	for i in n:
		var sm := 0.0
		var cnt := 0
		for j in range(maxi(0, i - 3), mini(n, i + 4)):
			sm += env[j]
			cnt += 1
		bat_corr.append(ax0 * deg_to_rad(sm / cnt))
	_corr_off = false
	var worst1 := 0
	var wt := 0.0
	var maxdeg := 0.0
	for i in n:
		var t := minf(i * CORR_DT, L)
		var X: Transform3D = (cache[i][0] as Transform3D) * _corr_at(t)
		var hh: Array = _bat_hits2(X, cache[i][1], cache[i][2], 0.0)
		var sc := int(hh[0]) + 10 * int(hh[1])
		if sc > worst1:
			worst1 = sc
			wt = t
		maxdeg = maxf(maxdeg, rad_to_deg((bat_corr[i] as Vector3).length()))
	model.transform = keep_model
	bb["corr_report"] = {"before_max": worst0, "after_max": worst1, "after_at_t": wt, "max_wrist_turn_deg": maxdeg, "axis_deg": best_ph}
	print("MASCOT bat corr: axis %d deg, body hits (verts + 10x axis pts in head) max %d -> %d (t=%.2f), wrist turn max %.0f deg" % [best_ph, worst0, worst1, wt, maxdeg])

func start_baseball(xf_hand: Transform3D) -> void:
	if bat == null:
		attach_bat(xf_hand)
	if bb.is_empty() and pbat:
		build_baseball()
		pb_tc = float(bb["t_c"])
		if pb6_keys.is_empty() and pb6_rel.is_empty():
			build_pbat()
		else:
			build_pbat6()   # v6：3 個關鍵姿勢＋平滑曲線
		var rep0: Dictionary = bb["corr_report"]
		var td0: float = bb["t_drop"]
		build_baseball()   # 接觸那一格＝程式球棒路徑上甜蜜點最快的那一格（v6：接觸關鍵姿勢那一格）
		bb["corr_report"] = rep0
		if not pb6_keys.is_empty():
			bb["t_drop"] = td0   # v6：丟棒時間用第一次量的（球棒表只建到那裡）
	if bb.is_empty():
		build_baseball()
		fit_bat_to_hands()
		build_baseball()
		build_arm_off()
		var rep: Dictionary = bb["corr_report"]
		build_bat_corr()    # 兩手移開後還碰到的格子：再加一點手腕轉
		rep["wrist"] = bb["corr_report"]
		build_baseball()    # 修正後重新找接觸那一格（球心跟著修正後的棒面）
		bb["corr_report"] = rep
	bb_ball = prim(props, sph(BALL_R), Vector3(0, -50, 0), "#f8f9fa", Vector3.ZERO, 0.006)
	base_node = Node3D.new()
	props.add_child(base_node)
	var plate := prim(base_node, cyl(0.19, 0.19, 0.02), Vector3(0, 0.01, 0), "#f8f9fa", Vector3.ZERO, 0.006)
	plate.name = "Base"
	restart_baseball()

# ═════════ 棒球：兩手一起往外移（球棒不穿過大頭）═════════
## 吉祥物頭很大、手很短：Mixamo 預備姿勢兩手在耳朵旁、球棒豎在頭後 → 整支埋進頭髮。
## 只轉手腕要轉 90° 以上（不像握棒）；改成「兩隻手一起往同一個方向移開」（手臂 IK，手掌方向不變 → 球棒和手的關係不變、兩手都還握著）。
## 整段用同一個方向，每格只變距離 m(t)＝那一格不碰的最小距離 → ±6 格最大 → ±3 格平均。
var arm_dir := Vector3.ZERO
var arm_mag := []
var _arm_off_dis := false

func _arm_at(t: float) -> Vector3:
	if arm_mag.is_empty():
		return Vector3.ZERO
	var f := clampf(t / CORR_DT, 0.0, arm_mag.size() - 1.001)
	var i := int(f)
	return arm_dir * lerpf(float(arm_mag[i]), float(arm_mag[i + 1]), f - i)

func _apply_arm_off(o: Vector3) -> void:
	if o.length() < 1e-4:
		return
	var tw := sk.global_transform
	var ow := frame.global_transform.basis * o
	var tgt := {}
	for sd in ["right", "left"]:
		var H0 := tw * gp(sd + "hand").origin
		var E := tw * gp(sd + "forearm").origin
		var S := tw * gp(sd + "arm").origin
		tgt[sd] = [H0 + ow, E - (S + H0) * 0.5]
	var world := Pose.pose_world(sk)
	for sd in ["right", "left"]:
		var hb := bi(sd + "hand")
		var orig: Basis = world[hb]
		Pose.ik_arm(sk, world, sd, tgt[sd][0], tgt[sd][1])
		Pose._rot_chain(sk, world, hb, orig * (world[hb] as Basis).inverse())
		Pose.apply_world(sk, world, true)
		world = Pose.pose_world(sk)

func build_arm_off() -> void:
	var keep_model := model.transform
	model.transform = model_base
	_arm_off_dis = true
	var an: String = bb["an"]
	var L := anim.get_animation(an).length
	var n := int(ceil(L / CORR_DT)) + 1
	var cache := []
	var worst0 := 0
	for i in n:
		var t := minf(i * CORR_DT, L)
		pose_at(an, t)
		var base := bat_frame_xf()
		var all := mesh_pts(["hips", "spine", "leftupleg", "rightupleg"])
		var c := base * Vector3(0, _bat_top() * 0.5, 0)
		var pts := PackedVector3Array()
		for k in range(0, all.size(), 2):
			if all[k].distance_to(c) < _bat_top() * 0.5 + 0.25:
				pts.append(all[k])
		var S := head_star()
		var h0: Array = _bat_hits2(base, pts, S)
		var sc0 := int(h0[0]) + 10 * int(h0[1])
		worst0 = maxi(worst0, sc0)
		cache.append([base, pts, S, sc0])
	var dirs := []
	for x in [-1, 0, 1]:
		for y in [-1, 0, 1]:
			for z in [-1, 0, 1]:
				if Vector3(x, y, z) != Vector3.ZERO and y <= 0:
					dirs.append(Vector3(x, y, z).normalized())
	var best_cost := 1e9
	var best_m := []
	var best_d := Vector3.ZERO
	for d: Vector3 in dirs:
		var ms := []
		var cost := 0.0
		var mx := 0.0
		for i in n:
			var m := 0.0
			if int(cache[i][3]) > 0:
				m = 9.0
				var k := 1
				while k <= 22:
					var X := Transform3D(Basis.IDENTITY, d * (k * 0.01)) * (cache[i][0] as Transform3D)
					var hh: Array = _bat_hits2(X, cache[i][1], cache[i][2])
					if int(hh[0]) + 10 * int(hh[1]) == 0:
						m = k * 0.01
						break
					k += 1
			ms.append(m)
			mx = maxf(mx, m)
			cost += minf(m, 0.3)
		cost += mx * 20.0
		if cost < best_cost:
			best_cost = cost
			best_m = ms
			best_d = d
	arm_dir = best_d
	var env := []
	for i in n:
		var m := 0.0
		for j in range(maxi(0, i - 6), mini(n, i + 7)):
			m = maxf(m, minf(float(best_m[j]), 0.22))
		env.append(m)
	arm_mag.clear()
	for i in n:
		var sm := 0.0
		var cnt := 0
		for j in range(maxi(0, i - 3), mini(n, i + 4)):
			sm += env[j]
			cnt += 1
		arm_mag.append(sm / cnt)
	_arm_off_dis = false
	# 驗證（真的做手臂 IK 之後量：球棒碰身體／頭、兩手離球棒）
	var worst1 := 0
	var wt := 0.0
	var mmax := 0.0
	var hand_worst := 0.0
	for i in n:
		var t := minf(i * CORR_DT, L)
		pose_at(an, t)
		var hh := bat_body_hits()
		var sc := int(hh[0]) + 10 * int(hh[1])
		if sc > worst1:
			worst1 = sc
			wt = t
		mmax = maxf(mmax, float(arm_mag[i]))
	model.transform = keep_model
	bb["corr_report"] = {"before_max": worst0, "after_max": worst1, "after_at_t": wt, "max_hands_shift_cm": mmax * 100.0, "dir": [arm_dir.x, arm_dir.y, arm_dir.z]}
	print("MASCOT arm shift: dir %s, body hits (verts + 10x axis pts in head) max %d -> %d (t=%.2f), hands shift max %.1f cm" % [arm_dir, worst0, worst1, wt, mmax * 100.0])

# ═════════ 貼地：走路／跑步只看腳 ═════════
## act_motion.ground_offset(gait=true) 用 ["left","right"] 開頭的骨頭 → 連手臂、手也算進去。
## 圳寶手長到膝蓋、慢跑時手比腳低 14 cm → 整個人被抬高 14 cm 浮在空中。吉祥物版只用腳。
func ground_offset(an: String, gait := false, samples := 36, feet_only := true) -> float:
	if not gait:
		return super.ground_offset(an, gait, samples)
	var keep := save_pose()
	var keep_x := model.transform
	model.transform = model_base
	var L := anim.get_animation(an).length
	var lows := []
	for i in samples:
		pose_at(an, L * i / samples)
		var low := 9.0
		for p in mesh_pts(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
			low = minf(low, p.y)
		lows.append(low - model_base.origin.y)
	model.transform = keep_x
	load_pose(keep)
	lows.sort()
	return -float(lows[lows.size() / 2])

# ═════════ 圳寶：腳掌放平 ═════════
## 圳寶的靴子很大（腳趾骨在腳底下 6 cm）：Mixamo 慢跑腳尖往下壓時，整隻靴子插進地面 14 cm → 貼地校正把人抬高浮在空中。
## flatten_feet：腳掌保持站姿的角度（只跟著腿轉方向），靴底一直是平的
var flatten_feet := false
var _flat := {}
func _flatten_feet() -> void:
	if _flat.is_empty():
		if not anim.has_animation("idle"):
			return
		var keep := save_pose()
		anim.play("idle", 0.0)
		anim.seek(0.0, true)
		anim.advance(0.0)
		for sd in ["left", "right"]:
			_flat[sd] = gp(sd + "foot").basis.orthonormalized()
		load_pose(keep)
	for sd in ["left", "right"]:
		var b := bi(sd + "foot")
		var pb := sk.get_bone_global_pose(sk.get_bone_parent(b)).basis.orthonormalized()
		sk.set_bone_pose_rotation(b, (pb.inverse() * (_flat[sd] as Basis)).get_rotation_quaternion())

# ═════════ 棒球：左手也握在握把上（圳寶）═════════
## 圳寶手臂短、身體寬：Mixamo 的左手整段離球棒 25–28 cm（單手揮棒）。left_on_bat＝左手 IK 到右手下方的握把上
## （手掌方向不動、只移手腕位置；丟棒前 0.25 秒放開＝跟進動作單手收棒）。
var left_on_bat := false
func _left_hand_to_bat() -> void:
	var X := bat_frame_xf()
	var tw := frame.global_transform
	var hand_c := Vector3.ZERO
	var pts := mesh_pts(["lefthand"])
	for q in pts:
		hand_c += q
	hand_c /= maxf(pts.size(), 1)
	var hb := fpos("lefthand")
	var want := X * Vector3(0, bat_hand_off - 0.05, 0)
	var ax := X.basis.y.normalized()
	var off := hand_c - hb
	var rad := (hand_c - want) - ax * (hand_c - want).dot(ax)
	var tgt := want + (rad.normalized() * (bat_r0 + 0.012) if rad.length() > 1e-4 else Vector3.ZERO) - off
	var world := Pose.pose_world(sk)
	var hbi := bi("lefthand")
	var orig: Basis = world[hbi]
	var E := tw * fpos("leftforearm")
	var S := tw * fpos("leftarm")
	Pose.ik_arm(sk, world, "left", tw * tgt, E - (S + tw * hb) * 0.5)
	Pose._rot_chain(sk, world, hbi, orig * (world[hbi] as Basis).inverse())
	Pose.apply_world(sk, world, true)

# ═════════ [perf] 腳踏車量測結果烤成檔案（data/interior/<who>_bike.json）═════════
## 上車第一次要量：手洞握把、坐墊、腳底踩點、骨盆表（24 格 × 31 種下沉 × 量網格）→ 電腦 4–6 秒、iPad 更久，
## 而且剛好發生在答對後出發的那一格。烤好的檔案＝同一個角色、同一個地方第一次上車量到的全部結果（測試 BIKEBAKE=1 產生）。
var bike_bake_path := ""
func save_bike_bake(path: String) -> void:
	var seats := []
	var ch := bike_rig.get_children()
	for i in ch.size():
		if ch[i] is MeshInstance3D and (ch[i] as MeshInstance3D).mesh is BoxMesh:
			seats.append([i, (ch[i] as Node3D).position.y])
	var v := {"B": B, "base_pose": bike_base_pose, "pelvis_tab": pelvis_tab, "pelvis_roll": pelvis_roll, "seat_boxes": seats}
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(JSON.stringify({"note": "mascot_motion.save_bike_bake（[perf] 11/11）：第一次上車量好的腳踏車幾何＋骨盆表；遊戲上車時直接讀，不重量。", "vars": var_to_str(v)}, " "))
	f.close()
	print("BIKE baked → ", path)

func _load_bike_bake() -> bool:
	var j = JSON.parse_string(FileAccess.get_file_as_string(bike_bake_path))
	if not (j is Dictionary) or not j.has("vars"):
		return false
	var v = str_to_var(String(j["vars"]))
	if not (v is Dictionary):
		return false
	B = v["B"]
	bike_base_pose = v["base_pose"]
	pelvis_tab = v["pelvis_tab"]
	pelvis_roll = float(v["pelvis_roll"])
	_build_bike_mesh()
	var ch := bike_rig.get_children()
	for sb in v["seat_boxes"]:
		if int(sb[0]) < ch.size():
			(ch[int(sb[0])] as Node3D).position.y = float(sb[1])
	_sole_fixed = true
	crank_th = 0.0
	print("MASCOT BIKE loaded baked ", bike_bake_path)
	return true

# ═════════ 腳踏車：腳底踩點用網格校正 ═════════
## build_bike 的腳底踩點只看「腳趾骨附近 ±3.75 cm」的頂點；圳寶的靴子很大（腳趾骨在靴底下面），
## 骨頭說踩到了（pin 0 mm）但網格量靴底離踏板 3.7 cm。→ 上車後轉一圈量網格，把踩點往下補（兩次）。
var _sole_fixed := false
func set_bike(on: bool) -> void:
	super.set_bike(on)
	if on and bike and not _sole_fixed:
		_sole_fixed = true
		var th0 := crank_th
		for it in 2:
			var acc := {"left": 0.0, "right": 0.0}
			for k in 8:
				crank_th = k * TAU / 8.0
				update_bike(0.0, 0.0)
				var m := measure_bike(true)
				for sd in ["left", "right"]:
					acc[sd] += float(m["foot_%s_pedal_gap_cm" % sd]) / 100.0 / 8.0
			for sd in ["left", "right"]:
				var L: Dictionary = B["legs"][sd]
				var gap: float = acc[sd] - 0.002   # 目標：靴底在踏板上 2 mm
				L["sole_local"] = (L["sole_local"] as Vector3) + (L["Bflat"] as Basis).inverse() * Vector3(0, gap, 0)
			print("MASCOT sole fix %d: mean gap L %.1f mm R %.1f mm" % [it, acc["left"] * 1000.0, acc["right"] * 1000.0])
		# 腳底校正之後大腿高度變了 → 坐墊頂面重新貼到「一整圈裡屁股／大腿最低點」下面 2 mm
		var mg := 9.0
		for k in 8:
			crank_th = k * TAU / 8.0
			update_bike(0.0, 0.0)
			mg = minf(mg, float(measure_bike(true)["seat_gap_cm"]) / 100.0)
		if mg < 8.0 and absf(mg - 0.002) > 0.001:
			var dy := mg - 0.002
			B["seat_y"] = float(B["seat_y"]) + dy
			for c in bike_rig.get_children():
				if c is MeshInstance3D and (c as MeshInstance3D).mesh is BoxMesh and absf((c as Node3D).position.z - float(B["seat_z"])) < 0.12:
					(c as Node3D).position.y += dy
			print("MASCOT saddle moved %.1f mm after sole fix" % (dy * 1000.0))
		build_pelvis_table()
		crank_th = th0
		update_bike(0.0, 0.0)

# ═════════ 程式慢跑（吉祥物短腿＋大靴子）═════════
## Mixamo jogging 重定向到圳寶（腿長 0.16 m、靴子大）會縮腿、靴底插地。改成程式跑步：
## 從站姿開始，每一格依步態相位 φ 直接擺：臀部（下沉＋上下彈）、兩腳（腳底踩點用網格量，IK 到目標；腳掌保持站姿的平）、
## 手臂和對側腿反向擺。支撐期腳往後退的速度＝前進速度 → 踩住的腳在地上不動；擺動期靴底抬 run_lift。
var run := {}
var run_t := 0.0
func run_setup(period := 0.5, stride_k := 0.85, lift_k := 0.28, drop_k := 0.15) -> void:
	var keep := model.transform
	model.transform = model_base
	anim.play("idle", 0.0)
	anim.seek(0.0, true)
	anim.advance(0.0)
	anim.stop()
	var stand := save_pose()
	# 站姿貼地：兩隻靴子最低點＝地面（不靠 ground_offset，那個會受前一個活動影響）
	var fl := 9.0
	for q in mesh_pts(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		fl = minf(fl, q.y - g(q))
	model_base.origin.y -= fl
	model.transform = model_base
	var S2 := sk2f()
	var feet := {}
	var l := 0.0
	for sd in ["left", "right"]:
		var fx := S2 * gp(sd + "foot")
		var pts := mesh_pts([sd + "foot", sd + "toe"])
		var low := 9.0
		for q in pts:
			low = minf(low, q.y)
		var c := Vector3.ZERO
		var n := 0
		for q in pts:
			if q.y < low + 0.01:
				c += q
				n += 1
		c /= maxi(n, 1)
		var sole_f := Vector3(c.x, low, c.z)
		feet[sd] = {"sole_local": fx.affine_inverse() * sole_f, "B": fx.basis.orthonormalized(), "x": sole_f.x, "z": sole_f.z, "ground": low}
		l += (S2 * gp(sd + "upleg").origin).distance_to(S2 * gp(sd + "leg").origin) + (S2 * gp(sd + "leg").origin).distance_to(S2 * gp(sd + "foot").origin)
	l *= 0.5
	var S := stride_k * l
	run = {"stand": stand, "feet": feet, "l": l, "T": period, "S": S, "H": lift_k * l, "drop": drop_k * l, "bob": 0.025 * l / 0.16 * 0.16, "v": S / (period * 0.5)}
	model.transform = keep
	print("MASCOT run: leg %.3f m stride %.3f m period %.2f s → %.2f m/s, lift %.1f cm" % [l, S, period, run["v"], float(run["H"]) * 100.0])

func run_speed() -> float:
	return float(run["v"])

## 套第 t 秒的跑步姿勢（模型自己的 x、z 不動，只改 y）
func apply_run(t: float) -> void:
	var T: float = run["T"]
	var S: float = run["S"]
	var H: float = run["H"]
	var ph := fposmod(t / T, 1.0)
	load_pose(run["stand"])
	var p := model.transform.origin
	model.transform.origin = Vector3(p.x, model_base.origin.y - float(run["drop"]) - float(run["bob"]) * 0.5 * (1.0 + cos(4.0 * PI * ph)), p.z)
	# 上半身稍微往前傾
	var FB := frame.global_transform.basis.orthonormalized()
	var world := Pose.pose_world(sk)
	var lat := FB * Vector3.RIGHT
	Pose._rot_chain(sk, world, bi("spine"), Basis(lat, deg_to_rad(6.0)))
	# 手臂：和對側腿一起擺（右腿往前＝左手往前）
	var arm_a := deg_to_rad(28.0) * sin(TAU * ph)
	Pose._rot_chain(sk, world, bi("leftarm"), Basis(lat, -arm_a))
	Pose._rot_chain(sk, world, bi("rightarm"), Basis(lat, arm_a))
	Pose.apply_world(sk, world, true)
	var mz := model.transform.origin.z
	var mx := model.transform.origin.x
	for sd in ["left", "right"]:
		var F: Dictionary = run["feet"][sd]
		var u := fposmod(ph + (0.0 if sd == "right" else 0.5), 1.0)
		var dz := 0.0
		var y := 0.0
		if u < 0.5:
			dz = S * 0.5 - S * (u / 0.5)
		else:
			var w := (u - 0.5) / 0.5
			dz = -S * 0.5 + S * (w * w * (3.0 - 2.0 * w))
			y = H * sin(PI * w)
		var contact := Vector3(mx + float(F["x"]), 0.0, mz + float(F["z"]) - model_base.origin.z + dz)
		contact.y = g(contact) + y
		var ank: Vector3 = contact - (F["B"] as Basis) * (F["sole_local"] as Vector3)
		_leg_to(sd, ank, F["B"], Vector3(0, 0.3, 1.0))
		# 用網格校正：支撐期靴底最低點＝地面；擺動期最低點 ≥ 抬腳高度的一半
		for it in 4:
			var low := 9.0
			for q in sole_pts(sd):   # [perf] 靴底那一層頂點
				low = minf(low, q.y - g(q))
			var want := 0.001 if u < 0.5 else maxf(y * 0.5, 0.01)
			if u >= 0.5 and low >= want:
				break
			if absf(low - want) < 0.001:
				break
			ank.y += want - low
			_leg_to(sd, ank, F["B"], Vector3(0, 0.3, 1.0))

## 一條腿兩節 IK：腳踝到 ank_f（frame），腳掌朝向 foot_B（frame），膝蓋朝 pole
func _leg_to(sd: String, ank_f: Vector3, foot_B: Basis, pole_f: Vector3) -> void:
	var F2S := sk2f().affine_inverse()
	var T := F2S * ank_f
	var up := gp(sd + "upleg")
	var lg := gp(sd + "leg")
	var ft := gp(sd + "foot")
	var H := up.origin
	var l1 := H.distance_to(lg.origin)
	var l2 := lg.origin.distance_to(ft.origin)
	var E := Pose._elbow(H, T, l1, l2, F2S.basis * pole_f)
	var Bu := up.basis.orthonormalized()
	var Bu2 := (Pose._arc(lg.origin - H, E - H) * Bu).orthonormalized()
	_set_local(sd + "upleg", Bu2)
	var Bl := (Bu2 * Basis(sk.get_bone_pose_rotation(bi(sd + "leg")))).orthonormalized()
	var cur := Bl * sk.get_bone_pose_position(bi(sd + "foot"))
	var Bl2 := (Pose._arc(cur, T - E) * Bl).orthonormalized()
	sk.set_bone_pose_rotation(bi(sd + "leg"), (Bu2.inverse() * Bl2).get_rotation_quaternion())
	var Bf := (F2S.basis * foot_B).orthonormalized()
	sk.set_bone_pose_rotation(bi(sd + "foot"), (Bl2.inverse() * Bf).get_rotation_quaternion())

# ═════════ v2 棒球：程式球棒路徑＋兩手 IK 握住（吉祥物）═════════
## v1 的「Mixamo 手拿棒子＋事後推開」解不乾淨（頭太大、手太短：水鈴還剩 52 頂點碰棒、圳寶左手離棒 25 cm）。
## v2：身體（腳、臀、脊椎、頭）照 Mixamo 揮棒；球棒的位置和方向用「胸口座標」的 5 個關鍵姿勢內插
## （預備：右肩前上方、棒子往後上斜 → 拉弓 → 接觸：肚子前、棒子水平朝前 → 跟進：左肩上），
## 每一格再檢查棒子不碰身體／頭（頭用星形深度圖），碰到就繞兩手中點轉開；最後兩隻手都 IK 到握把上（右手上、左手下），
## 手掌對著握把、手指彎起來。手到握把的距離每一格用網格量、存表（遊戲時不用再量）。
var pbat := false
var pb_reach := 0.98   # 握把離肩膀最遠＝手臂長的幾成（水鈴 0.90：0.98 時揮棒中有幾格手差 2.4 cm 搆不到）
var pb_tab := []      # 每 PB_DT：[origin(frame), D(frame), extra_r, extra_l]
## v4：表格 1/30 → 1/60 秒（1/30 的表在兩格中間：手穿進握把 0.5 cm、棒軸進頭 1–2 點）
const PB_DT := 1.0 / 120.0   # v5：＝遊戲更新步長；查表不內插，時間對齊到格子（_pb_snap）→ 畫面上每一格都是量過的那一格
## v4：手掌離棒軸的修正量限制在 −3～+6 cm（手指彎起來包住握把，最近的頂點是指尖不是手掌，正常範圍約 −2～+6）。v3 沒限制：手臂伸直搆不到時，retune 一直把它往負的推（−31 cm＝手的目標在棒子另一邊），
## 相鄰兩格一格 −31、一格 +6 → 中間內插的那一格手會穿進握把。搆不到改由 _pb_close 把球棒往肩膀拉近（縮小揮棒半徑）。
const PB_EX_MIN := -0.03
const PB_EX_MAX := 0.06
func _pb_snap(t: float) -> float:
	return roundf(t / PB_DT) * PB_DT

func _pb_row(t: float) -> int:
	return clampi(int(roundf(t / PB_DT)), 0, pb_tab.size() - 1)

## v5：每個角色自己的揮棒設定
var pb_keys: Array = PB_KEYS      # 關鍵姿勢表（格式同 PB_KEYS）
var pb_jit := {}
var pb_local := false             # true＝鍵值的「前」用握把那個高度（±6 cm）的身體表面、「右」用肩寬的一半（緊湊揮棒：棒子貼近胸口）
var pb_hands: Array = ["right", "left"]   # 握棒的手；圳寶＝只有右手（兩肩相距 44 cm、手臂 26 cm、胸口比肩線凸 17 cm → 兩手在身體前面碰不到一起）

func _pb_set_extra(i: int, j: int, v: float) -> void:
	pb_tab[i][j] = clampf(v, PB_EX_MIN, PB_EX_MAX)
var pb_tc := 1.45
var palm_off := {}    # 手骨 → 手掌網格中心（手骨世界基底座標）
var _pb_building := false
var pb_stretch := 0.95   # v4：肩到手腕超過手臂長的這個比例＝伸直（搆不到）
var pb_curl := 1.0
var pb_open_stretched := 0.0   # v4：手臂伸直時手指少彎的比例（0＝不變；圳寶用）   # v4：手指彎的倍率（圳寶的大手彎 70/85/60° 時手洞比握把細 → 指尖從另一邊穿進握把）
const PB_KEYS := [   # [相對 t_c 的秒數, Hc（x＝身體前面那層表面再往前幾公尺、y＝上（肩寬倍數）、z＝右（身體半寬的倍數，負＝左）), D（棒頭方向：f 前、u 上、r 右）]
	# 吉祥物版：棒子一直在頭的高度以下、身體前面／側面（大頭、大背包：往肩後扛一定穿過去）——小朋友的平揮
	[-9.0, Vector3(0.04, -0.35, 0.6), Vector3(0.2, 0.15, 1.0)],     # 預備：右腰前，棒子平平朝右
	[-0.45, Vector3(0.04, -0.35, 0.6), Vector3(0.2, 0.15, 1.0)],
	[-0.18, Vector3(0.03, -0.3, 0.85), Vector3(-0.45, 0.2, 0.9)],   # 拉弓：往右後方帶
	[0.0, Vector3(0.06, -0.5, 0.0), Vector3(1.0, -0.05, -0.05)],    # 接觸：肚子前、棒子水平朝前
	[0.25, Vector3(0.04, -0.4, -0.7), Vector3(0.2, 0.1, -1.0)],     # 跟進：平揮到左邊
	[9.0, Vector3(0.04, -0.5, -0.6), Vector3(0.4, -0.5, -0.7)],     # 收棒：往左下
]

## 胸口座標：O＝兩肩中點，l＝左、u＝上、f＝前（frame）
func _chest() -> Array:
	var L := fpos("leftarm")
	var R := fpos("rightarm")
	var O := (L + R) * 0.5
	var l := (L - R).normalized()
	var u := (fpos("neck") - fpos("hips"))
	u = (u - l * u.dot(l)).normalized()
	var f := l.cross(u).normalized()
	return [O, f, -l, u, L.distance_to(R)]

func _pb_key(rel: float) -> Array:
	var a: Array = pb_keys[0]
	var b: Array = pb_keys[-1]
	for i in pb_keys.size() - 1:
		if rel >= float(pb_keys[i][0]) and rel <= float(pb_keys[i + 1][0]):
			a = pb_keys[i]
			b = pb_keys[i + 1]
			break
	var k := clampf((rel - float(a[0])) / maxf(float(b[0]) - float(a[0]), 1e-4), 0.0, 1.0)
	k = k * k * (3.0 - 2.0 * k)
	var Da := (a[2] as Vector3).normalized()
	var Db := (b[2] as Vector3).normalized()
	var D := Da.slerp(Db, k) if Da.dot(Db) > -0.99 else Da.lerp(Db, k).normalized()
	return [(a[1] as Vector3).lerp(b[1] as Vector3, k), D]

## 第 t 秒的「原始」球棒（還沒避開身體）：回傳 Transform3D（frame，+Y＝棒頭）
func _pb_raw(t: float) -> Transform3D:
	var C := _chest()
	var O: Vector3 = C[0]
	var f: Vector3 = C[1]
	var r: Vector3 = C[2]
	var u: Vector3 = C[3]
	var w: float = C[4]
	var kv := _pb_key(t - pb_tc)
	var hl: Vector3 = kv[0]
	var dl: Vector3 = kv[1]
	# 身體前面那層表面（肚子、背包、頭在胸口高度附近的最前面）和身體半寬
	var front := 0.0
	var side := 0.0
	var bp := mesh_pts(["hips", "spine", "neck", "head"])
	for k in range(0, bp.size(), 5):
		var d: Vector3 = bp[k] - O
		if (absf(d.dot(u) - hl.y * w) < 0.06) if pb_local else (absf(d.dot(u)) < 1.2 * w):
			front = maxf(front, d.dot(f))
			side = maxf(side, absf(d.dot(r)))
	if pb_local:
		side = w * 0.5
	var Hc := O + f * (front + hl.x) + u * (hl.y * w) + r * (hl.z * side)
	var D := (f * dl.x + u * dl.y + r * dl.z).normalized()
	# 兩手搆得到：握把兩點離各自的肩膀 ≤ 0.92×手臂長，不然整支往胸口拉近
	for it in 12:
		var worst := 0.0
		var pull := Vector3.ZERO
		for sd in pb_hands:
			var s := _grip_s(sd) - _grip_mid()
			var G := Hc + D * s
			var S := fpos(sd + "arm")
			var la := S.distance_to(fpos(sd + "forearm")) + fpos(sd + "forearm").distance_to(fpos(sd + "hand"))
			var over := G.distance_to(S) - pb_reach * la
			if over > worst:
				worst = over
				pull = (S - G).normalized() * over
		if worst <= 0.0:
			break
		Hc += pull
	var x := D.cross(f)
	if x.length() < 0.1:
		x = D.cross(u)
	x = x.normalized()
	var B := Basis(x, D, x.cross(D).normalized())
	return Transform3D(B, Hc - D * _grip_mid())

func _grip_s(sd: String) -> float:   # 握把上的位置（棒子原點往棒頭）：右手在上
	return bat_hand_off if sd == "right" else bat_hand_off - 0.048

func _grip_mid() -> float:
	if pb_hands.size() == 1:
		return _grip_s(pb_hands[0])
	return (_grip_s("right") + _grip_s("left")) * 0.5

func _pb_xf(t: float) -> Transform3D:
	if pb_tab.is_empty():
		return _pb6_xf(t) if not pb6_keys.is_empty() else _pb_raw(t)
	var a: Array = pb_tab[_pb_row(t)]
	var D: Vector3 = (a[1] as Vector3).normalized()
	var o: Vector3 = a[0]
	var f0 := Vector3(0, 0, 1)
	var x := D.cross(f0)
	if x.length() < 0.1:
		x = D.cross(Vector3.UP)
	x = x.normalized()
	return Transform3D(Basis(x, D, x.cross(D).normalized()), o)

func _pb_extra(t: float, sd: String) -> float:
	if pb_tab.is_empty():
		return 0.012
	return float(pb_tab[_pb_row(t)][2 if sd == "right" else 3])

func _pb_active(an: String, t: float) -> bool:
	return pbat and not bb.is_empty() and an == String(bb["an"]) and t < float(bb.get("t_drop", 9.0)) + 0.05

## 手掌網格中心在手骨（世界基底）裡的位置：站姿量一次
func _palm_setup() -> void:
	var keep := save_pose()
	anim.play("idle", 0.0)
	anim.seek(0.0, true)
	anim.advance(0.0)
	var tw := frame.global_transform
	var world := Pose.pose_world(sk)
	for sd in ["left", "right"]:
		var pts := mesh_pts([sd + "hand"])
		var c := Vector3.ZERO
		for q in pts:
			c += q
		c /= maxf(pts.size(), 1)
		var hb := sk.global_transform * gp(sd + "hand").origin
		palm_off[sd] = (world[bi(sd + "hand")] as Basis).inverse() * (tw * c - hb)
	load_pose(keep)

## 一隻手握到球棒 X 的 s 處：手掌對著棒軸（手在靠身體那一側），手指彎起來，手臂 IK
func _hand_on_bat(sd: String, X: Transform3D, extra: float) -> void:
	var tw := frame.global_transform
	var D := X.basis.y.normalized()
	var Gp := X * Vector3(0, _grip_s(sd), 0)
	var C := _chest()
	var rv: Vector3 = (C[0] as Vector3) - Gp
	if pb_hands.size() == 1:
		rv = fpos(sd + "arm") - Gp   # 單手：手掌在「自己肩膀」那一側
	rv -= D * rv.dot(D)
	if rv.length() < 1e-4:
		rv = -(C[1] as Vector3)
	var rdir := rv.normalized()
	var sg := 1.0 if sd == "right" else -1.0
	var world := Pose.pose_world(sk)
	var hbi := bi(sd + "hand")
	Pose.aim_hand(sk, world, sd, (tw.basis * (D.cross(rdir) * sg)).normalized(), (tw.basis * -rdir).normalized())
	var Bh: Basis = world[hbi]
	var palm_w := tw * (Gp + rdir * (bat_r0 + extra))
	var bone_w: Vector3 = palm_w - Bh * (palm_off[sd] as Vector3)
	var E := sk.global_transform * gp(sd + "forearm").origin
	var S := sk.global_transform * gp(sd + "arm").origin
	var Hh := sk.global_transform * gp(sd + "hand").origin
	Pose.ik_arm(sk, world, sd, bone_w, E - (S + Hh) * 0.5 + tw.basis * Vector3(0, -0.05, 0))
	Pose._rot_chain(sk, world, hbi, Bh * (world[hbi] as Basis).inverse())
	Pose.apply_world(sk, world, true)
	# v4：手指最後才彎；手臂伸直（搆不到）時手指少彎一點——圳寶的長手指在搆不到時會從握把另一邊插進去
	var Sa := fpos(sd + "arm")
	var la := Sa.distance_to(fpos(sd + "forearm")) + fpos(sd + "forearm").distance_to(fpos(sd + "hand"))
	var ratio := Sa.distance_to(fpos(sd + "hand")) / la
	var c := pb_curl * (1.0 - pb_open_stretched * clampf((ratio - 0.93) / 0.05, 0.0, 1.0))
	world = Pose.pose_world(sk)
	Pose.curl_fingers(sk, world, sd, [70.0 * c, 85.0 * c, 60.0 * c], 30.0 * c)
	Pose.apply_world(sk, world, true)

func _hands_on_bat(t: float) -> void:
	var X := _pb_xf(t)
	for sd in pb_hands:
		_hand_on_bat(sd, X, _pb_extra(t, sd))
	for sd in ["left", "right"]:
		if not pb_hands.has(sd):
			_free_arm(sd)

## v5：沒握棒的那隻手：放在身體旁邊偏前下方（平衡用），手肘彎著；位置跟著胸口轉
func _free_arm(sd: String) -> void:
	var C := _chest()
	var sg := 1.0 if sd == "right" else -1.0
	var w: float = C[4]
	var tgt: Vector3 = (C[0] as Vector3) + (C[2] as Vector3) * sg * (w * 0.5 + 0.07) - (C[3] as Vector3) * 0.19 + (C[1] as Vector3) * 0.07
	var tw := frame.global_transform
	var world := Pose.pose_world(sk)
	Pose.ik_arm(sk, world, sd, tw * tgt, tw.basis * ((C[2] as Vector3) * sg - (C[1] as Vector3) * 0.5 - (C[3] as Vector3) * 0.3))
	Pose.apply_world(sk, world, true)

## 手到握把（網格，扣掉握把半徑）
func _hand_bat_gap(sd: String, X: Transform3D) -> float:
	var a := X * Vector3(0, -bat_knob, 0)
	var b := X * Vector3(0, _bat_top(), 0)
	var ab := b - a
	var m := 9.0
	for p in mesh_pts([sd + "hand"]):
		var ss := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		m = minf(m, p.distance_to(a + ab * ss) - bat_radius(ss * bat_len - bat_knob))
	return m

func build_pbat() -> void:
	var keep_model := model.transform
	model.transform = model_base
	_pb_building = true
	_palm_setup()
	var an: String = bb["an"]
	var td: float = bb["t_drop"]
	var n := int(ceil(td / PB_DT)) + 2
	pb_tab.clear()
	var prev := Vector3.ZERO
	var worst0 := 0
	var worst1 := 0
	var gaps := {"right": 0.0, "left": 0.0}
	var maxturn := 0.0
	for i in n:
		var t := i * PB_DT
		pose_at(an, t)
		var X := _pb_raw(t)
		var all := mesh_pts(BODY_NO_HEAD + ["leftleg", "rightleg"])
		var pts := PackedVector3Array()
		for k in range(0, all.size(), 2):
			pts.append(all[k])
		var S := head_star()
		var h0: Array = _bat_hits2(X, pts, S, 0.006)
		var sc0 := int(h0[0]) + 10 * int(h0[1])
		worst0 = maxi(worst0, sc0)
		var best := X
		if sc0 > 0:
			var found := false
			var bsc := sc0
			var piv := X * Vector3(0, _grip_mid(), 0)
			for th in range(5, 95, 5):
				var cands := []
				for ph in range(0, 360, 20):
					var ax := (X.basis.x * cos(deg_to_rad(ph)) + X.basis.z * sin(deg_to_rad(ph))).normalized()
					var R := Basis(ax, deg_to_rad(th))
					var X2 := Transform3D(R * X.basis, piv + R * (X.origin - piv))
					var hh: Array = _bat_hits2(X2, pts, S, 0.006)
					var sc := int(hh[0]) + 10 * int(hh[1])
					if sc == 0:
						cands.append([X2, ax * th])
					elif sc < bsc:
						bsc = sc
						best = X2
				if not cands.is_empty():
					var c0: Array = cands[0]
					for c in cands:
						if (c[1] as Vector3).distance_to(prev) < (c0[1] as Vector3).distance_to(prev):
							c0 = c
					best = c0[0]
					prev = c0[1]
					maxturn = maxf(maxturn, th)
					found = true
					break
		else:
			prev = Vector3.ZERO
		pb_tab.append([best.origin, best.basis.y.normalized(), 0.012, 0.012])
	# 平滑方向（±2 格），再量每一格：棒子碰身體、手到握把；手的距離用網格調兩次
	var sm := []
	for i in n:
		var D := Vector3.ZERO
		var o := Vector3.ZERO
		var c := 0
		for j in range(maxi(0, i - 8), mini(n, i + 9)):   # ±8 格（1/120 秒）＝v3 的 ±2 格（1/30 秒）
			D += pb_tab[j][1]
			o += pb_tab[j][0]
			c += 1
		sm.append([o / c, D.normalized()])
	for i in n:
		pb_tab[i][0] = sm[i][0]
		pb_tab[i][1] = sm[i][1]
	for rnd in 2:
		_pb_retune(an, n)
		_pb_refine(an, n)
	_pb_retune(an, n)
	_pb_close(an, n)
	_pb_refine(an, n)   # v4：close 之後手臂位置又變了 → 再檢查一次碰身體
	_pb_retune(an, n)
	for rnd in 2:
		_pb_fix_hits(an, n)
	for rnd in 6:
		_pb_smooth(an, n)
	_pb_grid_tune(an, n)
	_pb_jitter(n)
	var wt := 0.0
	for i in n:
		var t := i * PB_DT
		pose_at(an, t)
		_hands_on_bat(t)
		var X := _pb_xf(t)
		var hh: Array = _bat_hits2(X, mesh_pts(BODY_NO_HEAD + ["leftleg", "rightleg"]), head_star(), 0.0)
		var sc := int(hh[0]) + 10 * int(hh[1])
		if sc > worst1:
			worst1 = sc
			wt = t
		for sd in pb_hands:
			gaps[sd] = maxf(float(gaps[sd]), absf(_hand_bat_gap(sd, X)))
	_pb_building = false
	model.transform = keep_model
	bb["corr_report"] = {"pbat": true, "before_max": worst0, "after_max": worst1, "after_at_t": wt, "max_turn_deg": maxturn,
		"hand_gap_max_cm": {"right": float(gaps["right"]) * 100.0, "left": float(gaps["left"]) * 100.0}}
	print("MASCOT pbat: body hits %d -> %d (t=%.2f), turn max %.0f deg, |hand-bat| max R %.1f L %.1f cm" % [worst0, worst1, wt, maxturn, float(gaps["right"]) * 100.0, float(gaps["left"]) * 100.0])

## 現在這一格（手已經握上去）：球棒碰身體（含手臂、腿）的頂點數、棒軸在頭裡的點數
func _pb_hits_now(t: float) -> Array:
	return _bat_hits2(_pb_xf(t), mesh_pts(BODY_NO_HEAD + ["leftleg", "rightleg"]), head_star(), 0.002)

## 手到握把：每一格用網格量，調手掌離棒軸的距離（目標 2 mm），三次
func _pb_retune(an: String, n: int) -> void:
	for i in n:
		var t := i * PB_DT
		for it in 6:
			pose_at(an, t)
			var X := _pb_xf(t)
			_hands_on_bat(t)
			var done_ := true
			for sd in pb_hands:
				var gq := _hand_bat_gap(sd, X)
				if absf(gq - 0.002) > 0.002:
					done_ = false
			if done_:
				break
			for sd in pb_hands:
				var gp_ := _hand_bat_gap(sd, X)
				var j := 2 if sd == "right" else 3
				_pb_set_extra(i, j, float(pb_tab[i][j]) - (gp_ - 0.002))

func _pb_refine(an: String, n: int) -> void:
	# 手握上去之後（手臂位置變了）再檢查一次：還碰到的格子，試「整支往前推 2–8 cm」或「繞兩手中點轉 5–40°」，
	# 每個候選都真的做兩手 IK 再量（手臂也算）
	var fixed := 0
	_pb_building = false
	for i in n:
		var t := i * PB_DT
		pose_at(an, t)
		var h1: Array = _pb_hits_now(t)
		if int(h1[0]) + 10 * int(h1[1]) == 0:
			continue
		var keep_row: Array = (pb_tab[i] as Array).duplicate()
		var C := _chest()
		var fw: Vector3 = C[1]
		var X0 := _pb_xf(t)
		var piv := X0 * Vector3(0, _grip_mid(), 0)
		var cands := []
		for d in [0.02, 0.04, 0.06, 0.08]:
			cands.append(Transform3D(X0.basis, X0.origin + fw * d))
		for th in range(5, 45, 5):
			for ph in range(0, 360, 30):
				var ax := (X0.basis.x * cos(deg_to_rad(ph)) + X0.basis.z * sin(deg_to_rad(ph))).normalized()
				var R := Basis(ax, deg_to_rad(th))
				cands.append(Transform3D(R * X0.basis, piv + R * (X0.origin - piv)))
		var best_sc := int(h1[0]) + 10 * int(h1[1])
		var best_row := keep_row
		for X2: Transform3D in cands:
			pb_tab[i] = [X2.origin, X2.basis.y.normalized(), keep_row[2], keep_row[3]]
			pose_at(an, t)
			var hh: Array = _pb_hits_now(t)
			var sc := int(hh[0]) + 10 * int(hh[1])
			if sc < best_sc:
				best_sc = sc
				best_row = (pb_tab[i] as Array).duplicate()
			if sc == 0:
				break
		pb_tab[i] = best_row
		fixed += 1
	_pb_building = true
	print("MASCOT pbat refine: %d frames re-placed after hand IK" % fixed)

# ═════════ 露營：屁股坐在地上（圳寶）═════════
## 圳寶腿長 0.16 m、靴子大：Mixamo 跪姿是靴尖先碰地，膝蓋還離地 8.9 cm（不是真的跪）。
## 改成「坐在營火旁的地上」：站姿 → 整個人往下放到屁股（hips 頂點）碰地 → 兩腳往前伸、靴底平踩地（腿 IK，膝蓋朝上）→ 兩手放在膝蓋上。
func sit_ground() -> Dictionary:
	if run.is_empty():
		run_setup()
	model.transform = model_base
	var rep := {}
	for it in 7:
		load_pose(run["stand"])
		var hp := fpos("hips")
		var l: float = run["l"]
		for sd in ["left", "right"]:
			var F: Dictionary = run["feet"][sd]
			var contact := Vector3(float(F["x"]) * 1.15, 0.0, hp.z + 0.78 * l)
			contact.y = g(contact)
			_leg_to(sd, contact - (F["B"] as Basis) * (F["sole_local"] as Vector3), F["B"], Vector3(0, 1.0, 0.4))
		if it == 6:
			# 最後一次：屁股已經在地上，腿用最後的高度重新 IK；靴底用網格量，陷進地面就把腳踝抬起來
			for sd in ["left", "right"]:
				var F: Dictionary = run["feet"][sd]
				var contact := Vector3(float(F["x"]) * 1.15, 0.0, hp.z + 0.78 * l)
				contact.y = g(contact)
				var ank: Vector3 = contact - (F["B"] as Basis) * (F["sole_local"] as Vector3)
				for k in 3:
					var lowf := 9.0
					for q in mesh_pts([sd + "foot", sd + "toe"]):
						lowf = minf(lowf, q.y - g(q))
					if lowf >= 0.0 and lowf < 0.004:
						break
					ank.y += 0.002 - lowf
					_leg_to(sd, ank, F["B"], Vector3(0, 1.0, 0.4))
			break
		var low := 9.0
		for q in mesh_pts(["hips"]):
			low = minf(low, q.y - g(q))
		model.transform.origin.y -= low - 0.002
	# 腿、屁股（不含靴子）有頂點在地面下 → 整個人抬一點，靴子再貼回地面
	var lowb := 9.0
	for q in mesh_pts(["hips", "leftupleg", "rightupleg", "leftleg", "rightleg"]):
		lowb = minf(lowb, q.y - g(q))
	if lowb < 0.0:
		model.transform.origin.y += 0.001 - lowb
		for sd in ["left", "right"]:
			var F: Dictionary = run["feet"][sd]
			var hp3 := fpos("hips")
			var contact := Vector3(float(F["x"]) * 1.15, 0.0, hp3.z + 0.78 * float(run["l"]))
			contact.y = g(contact)
			var ank: Vector3 = contact - (F["B"] as Basis) * (F["sole_local"] as Vector3)
			for k in 4:
				_leg_to(sd, ank, F["B"], Vector3(0, 1.0, 0.4))
				var lowf := 9.0
				for q in mesh_pts([sd + "foot", sd + "toe"]):
					lowf = minf(lowf, q.y - g(q))
				if lowf >= 0.0 and lowf < 0.004:
					break
				ank.y += 0.002 - lowf
	# 兩手放在膝蓋上（手掌朝下）
	var tw := frame.global_transform
	for sd in ["left", "right"]:
		var kp := fpos(sd + "leg")
		var top := -9.0
		for q in mesh_pts([sd + "leg"]):
			if q.distance_to(kp) < 0.06:
				top = maxf(top, q.y)
		var world := Pose.pose_world(sk)
		var hand_c := Vector3.ZERO
		var hp2 := mesh_pts([sd + "hand"])
		for q in hp2:
			hand_c += q
		hand_c /= maxf(hp2.size(), 1)
		var off := hand_c - fpos(sd + "hand")
		var tgt := Vector3(kp.x, top + 0.02, kp.z) - off
		var E := tw * fpos(sd + "forearm")
		var S := tw * fpos(sd + "arm")
		Pose.ik_arm(sk, world, sd, tw * tgt, E - (S + tw * fpos(sd + "hand")) * 0.5)
		Pose.apply_world(sk, world, true)
	var butt := 9.0
	for q in mesh_pts(["hips"]):
		butt = minf(butt, q.y - g(q))
	var feet := 9.0
	for q in mesh_pts(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		feet = minf(feet, q.y - g(q))
	rep["butt_cm"] = butt * 100.0
	rep["boot_sole_cm"] = feet * 100.0
	return rep

# 每一格：靴底用網格貼到踏板上（build 時平均校正後，各角度還差 ±1 cm）
func update_bike(delta: float, speed: float) -> void:
	super.update_bike(delta, speed)
	if bike == null or B.is_empty() or not riding:
		return
	# v3 骨盆跟著踩踏：往下沉 d（屁股留在坐墊上）＋左右滾 roll；上半身（脊椎以上）世界位置不動 → 手還在握把上
	var pd := _pelvis_at(crank_th)
	if absf(pd.x) > 1e-5 or absf(pd.y) > 1e-5:
		_apply_pelvis(pd.x, pd.y)
		_leg_ik()
	var rigx := bike_rig.transform
	for sd in ["left", "right"]:
		var L: Dictionary = B["legs"][sd]
		var pc := pedal_center(sd, crank_th)
		var contact_f: Vector3 = rigx * (pc + Vector3(0, 0.012, 0))
		var Bflat_f: Basis = rigx.basis * (L["Bflat"] as Basis)
		var ank: Vector3 = contact_f - Bflat_f * (L["sole_local"] as Vector3)
		for it in 3:
			var low := 9.0
			var inv := rigx.affine_inverse()
			for p in sole_pts(sd):   # [perf] 靴底那一層頂點（量踏板接觸）
				var q := inv * p - pc
				if absf(q.x) < 0.0375 and absf(q.z) < 0.0325:
					low = minf(low, q.y - 0.012)
			if low > 8.0 or (low >= 0.0 and low < 0.004):
				break
			ank += rigx.basis * Vector3(0, 0.002 - low, 0)
			_leg_to(sd, ank, Bflat_f, rigx.basis * Vector3(0, 0.25, 1.0))

# ═════════ v3 腳踏車：骨盆跟著曲柄擺（圳寶腿 0.16 m，膝蓋抬起時大腿把量到的屁股高度帶離坐墊 2.5 cm）═════════
## 每個曲柄角（24 格）：骨盆往下沉 d（讓坐墊範圍裡屁股＋大腿最低點離坐墊 4 mm）、往踩下去那隻腳那邊滾 roll；
## 脊椎的世界姿勢保持不變（上半身、手不動），腿再 IK 到踏板。表格存起來，遊戲時內插（不用每格量網格）。
const PELVIS_N := 24
var pelvis_tab := []      # [[d, roll_rad], ...]
var pelvis_roll := 0.0    # 最大滾動角（rad），build 時試正負選好的
func _pelvis_at(th: float) -> Vector2:
	if pelvis_tab.is_empty():
		return Vector2.ZERO
	var f := fposmod(th, TAU) / TAU * PELVIS_N
	var i := int(floor(f)) % PELVIS_N
	var j := (i + 1) % PELVIS_N
	var a: Vector2 = pelvis_tab[i]
	var b: Vector2 = pelvis_tab[j]
	return a.lerp(b, f - floor(f))

func _apply_pelvis(d: float, roll: float) -> void:
	var hb := bi("hips")
	var sp := bi("spine")
	var hips_g := sk.get_bone_global_pose(hb)
	var sp_g := sk.get_bone_global_pose(sp)
	var S2F := sk2f()
	var sc := S2F.basis.get_scale().x
	var rb := bike_rig.transform.basis
	var up_sk := (S2F.basis.inverse() * (rb * Vector3.UP)).normalized()
	var fw_sk := (S2F.basis.inverse() * (rb * Vector3(0, 0, 1))).normalized()
	var new_g := Transform3D(Basis(fw_sk, roll) * hips_g.basis, hips_g.origin - up_sk * (d / sc))
	var par := sk.get_bone_parent(hb)
	var pg := sk.get_bone_global_pose(par) if par >= 0 else Transform3D.IDENTITY
	var loc := pg.affine_inverse() * new_g
	sk.set_bone_pose_position(hb, loc.origin)
	sk.set_bone_pose_rotation(hb, loc.basis.get_rotation_quaternion())
	var sl := new_g.affine_inverse() * sp_g
	sk.set_bone_pose_position(sp, sl.origin)
	sk.set_bone_pose_rotation(sp, sl.basis.orthonormalized().get_rotation_quaternion())

func build_pelvis_table() -> void:
	var best := []
	var best_cost := 1e9
	var best_roll := 0.0
	for rsign in [0.0, -1.0]:
		var roll_max: float = deg_to_rad(6.0) * float(rsign)
		pelvis_tab.clear()
		for k in PELVIS_N:
			pelvis_tab.append(Vector2(0.0, roll_max * cos(k * TAU / PELVIS_N)))
		for k in PELVIS_N:
			# 1D 格點搜尋（迭代會因為腿 IK 翻轉而來回跳）：d＝−10～+50 mm、每 2 mm；
			# 選「大腿離坐墊 ≥ 2 mm（不穿）」裡面，屁股離坐墊最接近 5 mm 的那個
			var e0: Vector2 = pelvis_tab[k]
			var bestd := 0.0
			var bestsc := 1e9
			for di in range(-5, 26):
				var dd := di * 0.002
				pelvis_tab[k] = Vector2(dd, e0.y)
				crank_th = k * TAU / PELVIS_N
				update_bike(0.0, 0.0)
				var mmb := measure_bike(true)
				var g := float(mmb["seat_gap_cm"]) / 100.0
				var bgap := bottom_gap()
				var sc := absf(bgap - 0.005) + (1.0 if g < 0.002 or int(mmb["thigh_in_saddle"]) > 0 else 0.0)
				if sc < bestsc:
					bestsc = sc
					bestd = dd
			pelvis_tab[k] = Vector2(bestd, e0.y)
		var cost := 0.0
		for e: Vector2 in pelvis_tab:
			cost = maxf(cost, absf(e.x))
		print("MASCOT pelvis roll %+.0f deg: max sink %.1f mm" % [rad_to_deg(roll_max), cost * 1000.0])
		if cost < best_cost - 0.001:
			best_cost = cost
			best = pelvis_tab.duplicate()
			best_roll = roll_max
	pelvis_tab = best
	pelvis_roll = best_roll
	var dbg := ""
	for k in PELVIS_N:
		crank_th = k * TAU / PELVIS_N
		update_bike(0.0, 0.0)
		dbg += "%d:d%.1f s%.1f b%.1f | " % [k, (pelvis_tab[k] as Vector2).x * 1000.0, float(measure_bike(true)["seat_gap_cm"]) * 10.0, bottom_gap() * 1000.0]
	print("MASCOT pelvis per-step (mm) ", dbg)
	print("MASCOT pelvis table: roll %.0f deg, max sink %.1f mm" % [rad_to_deg(best_roll), best_cost * 1000.0])

## 屁股（只算 hips 權重的頂點、坐墊範圍）到坐墊頂面
func bottom_gap() -> float:
	var rigx := bike_rig.transform
	var inv := rigx.affine_inverse()
	var st: float = B["seat_y"]
	var sz: float = B["seat_z"]
	var low := 9.0
	for p in mesh_pts(["hips"]):
		var q := inv * p
		if absf(q.x) < 0.06 and q.z > sz - 0.085 and q.z < sz + 0.025:
			low = minf(low, q.y - st)
	return low

## v3：手還搆不到握把（> 1.2 cm，手臂已伸直）的格子 → 把球棒往那隻手移過去（另一隻手跟著 IK），再調手掌距離
## v4：搆不到的那隻手 → 整支球棒往「那隻手的肩膀」拉近（縮小揮棒半徑，手臂不用再伸直），
## 拉近之後棒子碰到身體／頭就退回上一步；每一步之後手掌距離再調一次（限制在 −0.5～+3 cm）。
func _pb_close(an: String, n: int) -> void:
	var moved := 0
	var blocked := 0
	for i in n:
		var t := i * PB_DT
		var did := false
		for it in 14:
			_pb_tune_row(an, i, t, 3)
			_pose_hands(an, t)
			var X := _pb_xf(t)
			var worst := 0.0
			var wsd := ""
			for sd in pb_hands:
				var g2 := _hand_bat_gap(sd, X)
				# 手臂已經伸直（肩到手腕 ≥ 0.95×手臂長）：不管量到的距離（圳寶的長手指會從另一邊插進握把，量到負的），一樣算搆不到
				var Sa := fpos(sd + "arm")
				var la := Sa.distance_to(fpos(sd + "forearm")) + fpos(sd + "forearm").distance_to(fpos(sd + "hand"))
				var over := Sa.distance_to(fpos(sd + "hand")) - pb_stretch * la
				var need := maxf(g2 - 0.004, over + 0.004 if over > 0.0 else 0.0)
				if need > worst:
					worst = need
					wsd = sd
			if worst <= 0.006:
				break
			var G := X * Vector3(0, _grip_s(wsd), 0)
			var S := fpos(wsd + "arm")
			var C := _chest()
			var keep: Array = (pb_tab[i] as Array).duplicate()
			# 候選方向：往那隻手的肩膀、往兩肩中點、往肩膀再偏上；步長全步／半步。第一個不碰身體的就用
			var ok := false
			for dirv: Vector3 in [(S - G).normalized(), ((C[0] as Vector3) - G).normalized(), ((S - G).normalized() + (C[3] as Vector3) * 0.5).normalized()]:
				for k in [1.0, 0.5, 0.25]:
					pb_tab[i] = keep.duplicate()
					pb_tab[i][0] = (keep[0] as Vector3) + dirv * worst * k
					_pose_hands(an, t)
					var hh: Array = _pb_hits_now(t)
					if int(hh[0]) + 10 * int(hh[1]) == 0:
						ok = true
						break
				if ok:
					break
			if not ok:
				pb_tab[i] = keep
				blocked += 1
				break
			did = true
		if did:
			moved += 1
		_pb_tune_row(an, i, t, 4)
	print("MASCOT pbat close v4: %d frames pulled toward the shoulder, %d stopped by body" % [moved, blocked])

## 一格：手掌離棒軸的距離調到 0–4 mm（最多 k 次）
func _pb_tune_row(an: String, i: int, t: float, k: int) -> void:
	for it in k:
		_pose_hands(an, t)
		var X2 := _pb_xf(t)
		var ok := true
		for sd in pb_hands:
			var g2 := _hand_bat_gap(sd, X2)
			if g2 < 0.0 or g2 > 0.004:
				ok = false
				var j := 2 if sd == "right" else 3
				_pb_set_extra(i, j, float(pb_tab[i][j]) - (g2 - 0.002))
		if ok:
			return

## 擺第 t 秒的身體＋兩手握棒（建表中 pose_at 不會自己握）
func _pose_hands(an: String, t: float) -> void:
	pose_at(an, t)
	if _pb_building:
		_hands_on_bat(t)

## v4：最後還碰身體的格子（多半是單獨一格：手 IK 之後上臂／手腕邊緣碰到棒）→ 候選：前後兩格的平均、
## 沿胸口前／上／下／左／右平移 1–6 cm、繞兩手中點轉 5–45°；每個候選都真的握上去、調手掌距離，再量
## （碰身體＝0 而且兩手 0–2 cm 才收；選離原本最近的）
func _pb_fix_hits(an: String, n: int) -> void:
	var fixed := 0
	var left := 0
	for i in n:
		var t := i * PB_DT
		_pose_hands(an, t)
		var h0: Array = _pb_hits_now(t)
		if int(h0[0]) + 10 * int(h0[1]) == 0:
			continue
		var keep: Array = (pb_tab[i] as Array).duplicate()
		var C := _chest()
		var X0 := _pb_xf(t)
		var piv := X0 * Vector3(0, _grip_mid(), 0)
		var cands := []
		if i > 0 and i < n - 1:
			var o: Vector3 = ((pb_tab[i - 1][0] as Vector3) + (pb_tab[i + 1][0] as Vector3)) * 0.5
			var D: Vector3 = ((pb_tab[i - 1][1] as Vector3) + (pb_tab[i + 1][1] as Vector3)).normalized()
			cands.append([o, D])
		for d in [0.01, 0.02, 0.04, 0.06]:
			for ax in [C[1], C[3], -(C[3] as Vector3), C[2], -(C[2] as Vector3), -(C[1] as Vector3)]:
				cands.append([X0.origin + (ax as Vector3) * d, X0.basis.y.normalized()])
		for th in range(5, 50, 5):
			for ph in range(0, 360, 30):
				var rax := (X0.basis.x * cos(deg_to_rad(ph)) + X0.basis.z * sin(deg_to_rad(ph))).normalized()
				var R := Basis(rax, deg_to_rad(th))
				var X2 := Transform3D(R * X0.basis, piv + R * (X0.origin - piv))
				cands.append([X2.origin, X2.basis.y.normalized()])
		var best_row := []
		var best_bad := 1e9
		for c in cands:
			pb_tab[i] = [c[0], c[1], keep[2], keep[3]]
			_pb_tune_row(an, i, t, 4)
			_pose_hands(an, t)
			var hh: Array = _pb_hits_now(t)
			if int(hh[0]) + 10 * int(hh[1]) > 0:
				continue
			var X := _pb_xf(t)
			var bad := 0.0   # 手到握把超出 0–2 cm 的量
			for sd in pb_hands:
				var g2 := _hand_bat_gap(sd, X)
				bad += maxf(-g2, 0.0) + maxf(g2 - 0.02, 0.0)
			if bad < best_bad:
				best_bad = bad
				best_row = (pb_tab[i] as Array).duplicate()
			if bad <= 0.0:
				break
		if not best_row.is_empty():
			pb_tab[i] = best_row
			fixed += 1
		else:
			pb_tab[i] = keep
			left += 1
	print("MASCOT pbat fix-hits v4: %d frames fixed, %d still touching" % [fixed, left])

## v5 緊湊揮棒（pb_local＝true）：Hc＝(握把高度那層身體表面再往前幾公尺, 上（肩寬倍數）, 右（肩寬一半的倍數）)
## 沒有往右後拉弓；棒子一直在身體正前方、頭的下面；接觸＝肚子／胸口前水平朝前；跟進很短
const PB_KEYS_SHUILING := [
	[-9.0, Vector3(0.03, -0.8, 0.6), Vector3(0.1, 0.3, 0.95)],      # 預備：胸口右前，棒子朝右微微朝上
	[-0.40, Vector3(0.03, -0.8, 0.6), Vector3(0.1, 0.3, 0.95)],
	[-0.16, Vector3(0.03, -0.8, 0.7), Vector3(-0.12, 0.3, 0.95)],   # 蓄力：棒頭稍微往後帶（手不往後）
	[0.0, Vector3(0.035, -0.8, 0.0), Vector3(1.0, 0.0, -0.05)],     # 接觸：胸口正前、棒子水平朝前
	[0.22, Vector3(0.03, -0.8, -0.6), Vector3(0.15, 0.2, -0.95)],   # 跟進：平揮到左前就停
	[9.0, Vector3(0.03, -0.9, -0.6), Vector3(0.2, -0.1, -0.95)],
]
const PB_KEYS_ZUNBO := [   # 單手（右手）：手一直在右肩前面，靠手肘／手腕把棒子從右前掃到左前；棒頭不往後（往後會碰右手臂）
	[-9.0, Vector3(0.06, -0.2, 1.15), Vector3(0.25, 0.05, 1.0)],     # 預備：右胸前，棒子平平朝右前
	[-0.40, Vector3(0.06, -0.2, 1.15), Vector3(0.25, 0.05, 1.0)],
	[-0.16, Vector3(0.06, -0.2, 1.2), Vector3(0.12, 0.08, 1.0)],     # 蓄力：棒頭稍微往右帶
	[0.0, Vector3(0.06, -0.2, 1.0), Vector3(1.0, 0.0, -0.05)],       # 接觸：右胸前、棒子水平朝前
	[0.22, Vector3(0.06, -0.2, 0.85), Vector3(0.45, 0.05, -0.9)],    # 跟進：平揮到身體前面朝左前就停
	[9.0, Vector3(0.06, -0.25, 0.85), Vector3(0.4, -0.1, -0.9)],
]

## v5：最後的時間平滑。前面每一格各自修（拉近、轉開），相鄰兩格可能差幾公分 → 球棒抖。
## 每一格試「前後各 3 格的平均」：握上去、調手掌距離後，還是不碰身體、手 0–1.2 cm、手臂沒變更直，才換；不行就留原樣。
func _pb_row_ok(an: String, i: int, t: float) -> Array:
	_pb_tune_row(an, i, t, 4)
	_pose_hands(an, t)
	var hh: Array = _pb_hits_now(t)
	var bad := float(int(hh[0]) + 10 * int(hh[1]))
	var X := _pb_xf(t)
	var st := 0.0
	for sd in pb_hands:
		var g2 := _hand_bat_gap(sd, X)
		bad += maxf(-g2, 0.0) * 100.0 + maxf(g2 - 0.012, 0.0) * 100.0
		var Sa := fpos(sd + "arm")
		var la := Sa.distance_to(fpos(sd + "forearm")) + fpos(sd + "forearm").distance_to(fpos(sd + "hand"))
		st = maxf(st, Sa.distance_to(fpos(sd + "hand")) / la)
	return [bad, st]

func _pb_smooth(an: String, n: int) -> void:
	var done := 0
	var kept := 0
	for i in range(1, n - 1):
		var t := i * PB_DT
		var o := Vector3.ZERO
		var D := Vector3.ZERO
		var c := 0
		for j in range(maxi(0, i - 3), mini(n, i + 4)):
			o += pb_tab[j][0]
			D += pb_tab[j][1]
			c += 1
		o /= c
		D = D.normalized()
		if o.distance_to(pb_tab[i][0]) < 0.0005 and D.angle_to(pb_tab[i][1]) < deg_to_rad(0.2):
			continue
		var r0: Array = _pb_row_ok(an, i, t)
		var keep2: Array = (pb_tab[i] as Array).duplicate()
		pb_tab[i] = [o, D, keep2[2], keep2[3]]
		var r1: Array = _pb_row_ok(an, i, t)
		if float(r1[0]) <= maxf(float(r0[0]), 0.0) and float(r1[1]) <= maxf(float(r0[1]), pb_stretch):
			done += 1
		else:
			pb_tab[i] = keep2
			kept += 1
	print("MASCOT pbat smooth v5: %d frames smoothed, %d kept as-is" % [done, kept])

## 相鄰兩格（1/120 秒）球棒甜蜜點最多移動多少、握把最多移動多少（看有沒有抖）
func _pb_jitter(n: int) -> void:
	var ms := 0.0
	var mg := 0.0
	var ts := 0.0
	var tg := 0.0
	for i in range(1, n):
		var a := _pb_xf((i - 1) * PB_DT)
		var b := _pb_xf(i * PB_DT)
		var ds := (a * Vector3(0, _bat_sweet(), 0)).distance_to(b * Vector3(0, _bat_sweet(), 0))
		var dg := (a * Vector3(0, _grip_mid(), 0)).distance_to(b * Vector3(0, _grip_mid(), 0))
		if ds > ms:
			ms = ds
			ts = i * PB_DT
		if dg > mg:
			mg = dg
			tg = i * PB_DT
	pb_jit = {"sweet_step_max_cm": ms * 100.0, "sweet_at_t": ts, "grip_step_max_cm": mg * 100.0, "grip_at_t": tg}
	print("MASCOT pbat step per 1/120 s: sweet spot max %.2f cm (t=%.3f), grip max %.2f cm (t=%.3f)" % [ms * 100.0, ts, mg * 100.0, tg])

## v5：手掌距離的最後一次調整改用格點搜尋。「量到的距離 − 目標」一步一步修（_pb_tune_row）假設距離越大手離棒越遠，
## 但圳寶的大手不是：太近＝手掌陷進握把，太遠＝彎起來的指尖從外面戳進握把，中間才是握把在手洞裡。
## 一步一步修會從「陷進去」一路推到上限 +6 cm（指尖戳進去 0.55 cm）停住。→ 每 3 mm 試一次，選「不陷進去而且最貼」的。
func _pb_grid_tune(an: String, n: int) -> void:
	var fixed := 0
	var bad := 0
	for i in n:
		var t := i * PB_DT
		_pose_hands(an, t)
		var X := _pb_xf(t)
		for sd in pb_hands:
			var g0 := _hand_bat_gap(sd, X)
			if g0 >= 0.0 and g0 <= 0.004:
				continue
			var j := 2 if sd == "right" else 3
			var best_e := float(pb_tab[i][j])
			var best_sc := 1e9
			var e := PB_EX_MIN
			while e <= PB_EX_MAX + 1e-6:
				pb_tab[i][j] = e
				_pose_hands(an, t)
				var gq := _hand_bat_gap(sd, X)
				var sc := (gq - 0.0005) if gq >= 0.0005 else (1.0 - gq)
				if sc < best_sc:
					best_sc = sc
					best_e = e
				e += 0.003
			pb_tab[i][j] = best_e
			if best_sc < 0.02:
				fixed += 1
			else:
				bad += 1
	print("MASCOT pbat grid tune v5: %d hand-frames re-seated, %d with no clean seat" % [fixed, bad])

# ═════════ v6 棒球：3 個關鍵姿勢＋平滑曲線（不逐格修）═════════
## 關鍵姿勢＝[相對接觸的秒數, 握把中點（胸口座標：前 f、上 u、右 r，公尺，以兩肩中點為原點）, 棒頭方向（同座標）]
## 三個：預備、接觸、跟進。中間用 Hermite 曲線：預備、跟進速度 0，接觸時速度＝（跟進−預備）÷時間 → 揮到球的時候最快、不停頓。
## 檢查整條曲線（搜尋用 1/30 秒、驗證用 1/120 秒）；碰到身體／頭、手搆不到、手臂伸直 → 只調關鍵姿勢，不調單格。
## 手掌離棒軸的距離（extra）每格選，但優先跟上一格一樣（手不抖）。
var pb6_keys := []          # 角色設定（檢查場景／遊戲給，用 _pb6_from_rel 從相對鍵值換算）
var pb6_bend := 0.93        # 手臂最直＝肩到手腕 ÷ 手臂長 ≤ 這個
var pb6_report := {}
var _pb6_star := {}

func _pb6_eval(rel: float) -> Array:
	var K := pb6_keys
	var a: float = K[0][0]
	var b: float = K[2][0]
	if rel <= a:
		return [K[0][1], K[0][2]]
	if rel >= b:
		return [K[2][1], K[2][2]]
	var m: Array = [((K[2][1] as Vector3) - (K[0][1] as Vector3)) / (b - a), ((K[2][2] as Vector3) - (K[0][2] as Vector3)) / (b - a)]
	var i0 := 0 if rel < 0.0 else 1
	var t0: float = K[i0][0]
	var t1: float = K[i0 + 1][0]
	var dt := t1 - t0
	var x := (rel - t0) / dt
	var h00 := 2 * x * x * x - 3 * x * x + 1
	var h10 := x * x * x - 2 * x * x + x
	var h01 := -2 * x * x * x + 3 * x * x
	var h11 := x * x * x - x * x
	var out := []
	for c in 2:
		var p0: Vector3 = K[i0][1 + c]
		var p1: Vector3 = K[i0 + 1][1 + c]
		var m0: Vector3 = Vector3.ZERO if i0 == 0 else m[c]
		var m1: Vector3 = m[c] if i0 == 0 else Vector3.ZERO
		out.append(p0 * h00 + m0 * (h10 * dt) + p1 * h01 + m1 * (h11 * dt))
	return out

## 球棒的座標框：原點＝兩肩中點；方向＝「預備那一格的胸口方向」和「現在胸口方向」各一半（pb6_follow）。
## 全跟胸口：Mixamo 揮棒時上半身扭得很快，棒子跟著甩 → 一格跳 6.6 cm；全不跟：身體轉進棒子裡。
var pb6_follow := 1.0   # 試過 0.5：Mixamo 揮棒上半身轉超過 180°，四元數內插在 t≈2.02 翻面 → 球棒一格跳 60–85 cm。改回全跟胸口
var _pb6_B0 := Basis.IDENTITY
func _pb6_frame_basis() -> Array:
	var C := _chest()
	var Bc := Basis(-(C[2] as Vector3), C[3], C[1]).orthonormalized()   # 左、上、前（右手系；用「右」會是左手系，四元數錯）
	var B := Basis(_pb6_B0.get_rotation_quaternion().slerp(Bc.get_rotation_quaternion(), pb6_follow))
	return [C[0], B]

func _pb6_xf(t: float) -> Transform3D:
	var FB := _pb6_frame_basis()
	var O: Vector3 = FB[0]
	var Bb: Basis = FB[1]
	if pb6_follow >= 1.0:
		var C := _chest()
		Bb = Basis(-(C[2] as Vector3), C[3], C[1]).orthonormalized()
	var e := _pb6_eval(t - pb_tc)
	var hl: Vector3 = e[0]
	var dl: Vector3 = e[1]
	var Hc := O + Bb * Vector3(-hl.z, hl.y, hl.x)
	var D := (Bb * Vector3(-dl.z, dl.y, dl.x)).normalized()
	var x := D.cross(Vector3(0, 0, 1))
	if x.length() < 0.1:
		x = D.cross(Vector3.UP)
	x = x.normalized()
	return Transform3D(Basis(x, D, x.cross(D).normalized()), Hc - D * _grip_mid())

## 一格：[碰身體分數（頂點＋10×頭內點）, 手搆不到（> 1.5 cm）的量, 手臂超過 pb6_bend 的量, 最近的手距離, 手臂最直]
func _pb6_frame(an: String, t: float) -> Array:
	_pose_hands(an, t)
	var X := _pb_xf(t)
	var key := int(roundf(t * 120.0))
	if not _pb6_star.has(key):
		_pb6_star[key] = head_star()
	var hh: Array = _bat_hits2(X, mesh_pts(BODY_NO_HEAD + ["leftleg", "rightleg"]), _pb6_star[key], 0.002)
	var reach := 0.0
	var st := 0.0
	var gmin := 9.0
	for sd in pb_hands:
		var g2 := _hand_bat_gap(sd, X)
		gmin = minf(gmin, g2)
		reach = maxf(reach, g2 - 0.015)
		var Sa := fpos(sd + "arm")
		var la := Sa.distance_to(fpos(sd + "forearm")) + fpos(sd + "forearm").distance_to(fpos(sd + "hand"))
		st = maxf(st, Sa.distance_to(fpos(sd + "hand")) / la)
	return [int(hh[0]) + 10 * int(hh[1]), reach, maxf(st - pb6_bend, 0.0), gmin, st]

func _pb6_cost(an: String, step: float) -> Array:
	var td: float = bb["t_drop"]
	var tot := 0.0
	var per := [0.0, 0.0, 0.0]   # 每個關鍵姿勢附近的毛病（搜尋先調毛病最多的）
	var t := 0.0
	var worst := {"hits": 0, "reach_cm": 0.0, "stretch": 0.0}
	while t < td:
		var fr := _pb6_frame(an, t)
		var c := float(fr[0]) + float(fr[1]) * 100.0 + float(fr[2]) * 100.0
		tot += c
		var rel := t - pb_tc
		var k := 0 if rel < float(pb6_keys[0][0]) * 0.5 else (1 if rel < float(pb6_keys[2][0]) * 0.5 else 2)
		per[k] += c
		worst["hits"] = maxi(int(worst["hits"]), int(fr[0]))
		worst["reach_cm"] = maxf(float(worst["reach_cm"]), float(fr[1]) * 100.0)
		worst["stretch"] = maxf(float(worst["stretch"]), float(fr[4]))
		t += step
	return [tot, per, worst]

## 相對身體表面的鍵值（v5 格式：前＝那個高度身體表面再往前幾公尺、上＝肩寬倍數、右＝半肩寬倍數）→ 絕對胸口座標
func pb6_from_rel(keys_rel: Array) -> void:
	var an: String = bb["an"]
	var keep_model := model.transform
	model.transform = model_base
	pb6_keys = []
	for kr in keys_rel:
		var rel: float = kr[0]
		pose_at(an, clampf(pb_tc + rel, 0.0, float(bb["len"])))
		var C := _chest()
		var O: Vector3 = C[0]
		var w: float = C[4]
		var hl: Vector3 = kr[1]
		var front := 0.0
		for q in mesh_pts(["hips", "spine", "neck", "head"]):
			var d: Vector3 = q - O
			if absf(d.dot(C[3]) - hl.y * w) < 0.06:
				front = maxf(front, d.dot(C[1]))
		var P: Vector3 = O + (C[1] as Vector3) * (front + hl.x) + (C[3] as Vector3) * (hl.y * w) + (C[2] as Vector3) * (hl.z * w * 0.5)
		var dl: Vector3 = kr[2]
		var Dw: Vector3 = ((C[1] as Vector3) * dl.x + (C[3] as Vector3) * dl.y + (C[2] as Vector3) * dl.z).normalized()
		var Bb: Basis = Basis(-(C[2] as Vector3), C[3], C[1]).orthonormalized() if pb6_follow >= 1.0 else _pb6_frame_basis()[1]
		var pl := Bb.inverse() * (P - O)
		var dlo := Bb.inverse() * Dw
		pb6_keys.append([rel, Vector3(pl.z, pl.y, -pl.x), Vector3(dlo.z, dlo.y, -dlo.x).normalized()])
	model.transform = keep_model

var pb6_rel := []   # 給 build_pbat6 的相對鍵值（pb6_keys 空的時候用它換算）

func build_pbat6() -> void:
	var keep_model := model.transform
	model.transform = model_base
	_pb_building = true
	_palm_setup()
	pose_at(String(bb["an"]), clampf(pb_tc + float(pb6_rel[0][0]) if not pb6_rel.is_empty() else pb_tc - 0.3, 0.0, 9.0))
	var C0 := _chest()
	_pb6_B0 = Basis(-(C0[2] as Vector3), C0[3], C0[1]).orthonormalized()
	if not pb6_rel.is_empty():
		pb6_from_rel(pb6_rel)
		model.transform = model_base
	var an: String = bb["an"]
	pb_tab.clear()
	_pb6_star.clear()
	var step := 1.0 / 30.0
	var res := _pb6_cost(an, step)
	print("MASCOT pbat6 start cost %.2f worst %s" % [float(res[0]), res[2]])
	var dpos := 0.03
	var dang := 12.0
	var evals := 0
	var init := pb6_keys.duplicate(true)   # 搜尋範圍：位置 ±7 cm、棒頭方向 ±35°（不然會找到「接觸時棒子朝左」這種不是揮棒的姿勢）
	var rounds := int(OS.get_environment("PB6ROUNDS")) if OS.get_environment("PB6ROUNDS") != "" else 6
	for rnd in rounds:
		if float(res[0]) <= 0.0:
			break
		var improved := false
		var order := [0, 1, 2]
		var per: Array = res[1]
		order.sort_custom(func(x, y): return float(per[x]) > float(per[y]))
		for k in order:
			var base: Array = (pb6_keys[k] as Array).duplicate()
			var cands := []
			for ax in [Vector3(1, 0, 0), Vector3(0, 1, 0), Vector3(0, 0, 1)]:
				cands.append([(base[1] as Vector3) + ax * dpos, base[2]])
				cands.append([(base[1] as Vector3) - ax * dpos, base[2]])
			for ax in [Vector3(0, 1, 0), Vector3(0, 0, 1), Vector3(1, 0, 0)]:
				for sg in [1.0, -1.0]:
					cands.append([base[1], (base[2] as Vector3).rotated(ax, deg_to_rad(dang * sg))])
			for cnd in cands:
				if (cnd[0] as Vector3).distance_to(init[k][1]) > 0.07 or (cnd[1] as Vector3).angle_to(init[k][2]) > deg_to_rad(35.0):
					continue
				pb6_keys[k] = [base[0], cnd[0], cnd[1]]
				var r2 := _pb6_cost(an, step)
				evals += 1
				if float(r2[0]) < float(res[0]) - 1e-4:
					res = r2
					base = (pb6_keys[k] as Array).duplicate()
					improved = true
			pb6_keys[k] = base
			if float(res[0]) <= 0.0:
				break
		print("MASCOT pbat6 round %d: cost %.2f worst %s (step %.1f cm / %.0f deg)" % [rnd, float(res[0]), res[2], dpos * 100.0, dang])
		if not improved:
			dpos *= 0.5
			dang *= 0.5
	# 手掌距離：每格（1/120）選 extra（兩手 0–2 cm、靠近 0.3 cm、優先跟上一格一樣）
	var td: float = bb["t_drop"]
	var n := int(ceil((td + 0.1) / PB_DT)) + 2
	var prev := {"right": 0.012, "left": 0.012}
	var bad := 0
	for i in n:
		var X := _pb6_xf_at(an, i * PB_DT)
		pb_tab.append([X.origin, X.basis.y.normalized(), 0.012, 0.012])
	var star := {}
	var hit_frames := 0
	for i in n:
		var t := i * PB_DT
		for sd in pb_hands:
			var j := 2 if sd == "right" else 3
			var cl := []
			var e := PB_EX_MIN
			while e <= PB_EX_MAX + 1e-6:
				pb_tab[i][j] = e
				_pose_hands(an, t)
				var gq := _hand_bat_gap(sd, _pb_xf(t))
				var sc := absf(gq - 0.003) + 0.3 * absf(e - float(prev[sd]))
				if gq < 0.0 or gq > 0.02:
					sc += 10.0 + absf(gq)
				cl.append([sc, e])
				e += 0.003
			cl.sort_custom(func(x, y): return float(x[0]) < float(y[0]))
			var pick: float = cl[0][1]
			var pick_sc: float = cl[0][0]
			# 前 6 個候選：手臂不伸直、棒子不碰身體（含前臂）才收
			for c in cl.slice(0, 6):
				pb_tab[i][j] = c[1]
				var fr := _pb6_frame(an, t)
				if int(fr[0]) == 0 and float(fr[4]) <= pb6_bend + 0.02:
					pick = c[1]
					pick_sc = c[0]
					break
			pb_tab[i][j] = pick
			prev[sd] = pick
			if pick_sc >= 10.0:
				bad += 1
		if int(_pb6_frame(an, t)[0]) > 0:
			hit_frames += 1
	print("MASCOT pbat6 palm: %d frames still touching after palm choice" % hit_frames)
	_pb_building = false
	_pb_jitter(n)
	model.transform = keep_model
	pb6_report = {"curve_checks": evals, "search_cost": res[0], "worst_1_30": res[2], "palm_frames_no_seat": bad}
	bb["corr_report"] = pb6_report
	print("MASCOT pbat6 done: %d curve checks, cost %.2f, worst %s, palm frames with no 0-2 cm seat %d" % [evals, float(res[0]), res[2], bad])
	for k in 3:
		print("MASCOT pbat6 key %d: t%+.2f grip(f,u,r)=%s dir=%s" % [k, float(pb6_keys[k][0]), pb6_keys[k][1], pb6_keys[k][2]])

func _pb6_xf_at(an: String, t: float) -> Transform3D:
	pose_at(an, t)
	return _pb6_xf(t)
