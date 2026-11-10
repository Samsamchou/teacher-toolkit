extends "res://scripts/mascot_home_check.gd"
## [mascot] 水鈴、圳寶的動作合邏輯檢查（2026-11-10）。從 motion_check.gd 複製（11 個活動 × 4 格、網格量測），
## 戶外活動改用 scripts/mascot_motion.gd（吉祥物尺寸道具＋修正），輸出到 test_motion_mascots/<who>/。
## （不 extends motion_check.gd：那份由 Ken agent 維護、可能改到一半；這份獨立才不會互相弄壞）
## 執行：WHO=shuiling|zunbo MODE=outdoor|indoor [ONLY=bike]
##   Godot --path . --resolution 960x720 res://scenes/mascot_motion_check.tscn
## 檢查圖：python -I tools/mascot_motion_sheet.py shuiling|zunbo
const ActMotion := preload("res://scripts/mascot_motion.gd")
const MODELS := {"shuiling": ["shuiling_softhand", 1.2], "zunbo": ["zunbo_openhand", 1.15]}
const OUT_ANIMS := ["jogging", "dribble", "baseball_hit", "kneeling_idle", "driving", "sitting_idle", "cheering"]

var mode := "outdoor"
var frame: Node3D
var propn: Node3D
var ap: AnimationPlayer
var am: ActMotion
var metrics := {}
var wobj: World
var ground_mesh: MeshInstance3D

func _ready() -> void:
	who = OS.get_environment("WHO") if OS.get_environment("WHO") != "" else "shuiling"
	mode = OS.get_environment("MODE") if OS.get_environment("MODE") != "" else "outdoor"
	wobj = World.new()
	wobj._materials()
	out_dir = "res://test_motion_mascots/%s" % who
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_dir))
	cam = Camera3D.new()
	cam.fov = 45
	cam.near = 0.02
	add_child(cam)
	if mode == "indoor":
		await _indoor()
	elif mode == "calib":
		await _calib()
	elif mode == "probe":
		await _probe_m()
	else:
		await _outdoor()
	var f := FileAccess.open("%s/metrics_%s.json" % [out_dir, mode], FileAccess.WRITE)
	f.store_string(JSON.stringify(metrics, " "))
	f.close()
	print("MOTION CHECK DONE ", who, " ", mode)
	get_tree().quit()

# ───────── 戶外：平地＋角色＋烤好的動作 ─────────
func _outdoor_scene() -> void:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.72, 0.85, 0.96)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1.0, 0.97, 0.92)
	e.ambient_light_energy = 0.8
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(3, 8, 6), Vector3.ZERO, Vector3.UP)
	sun.light_energy = 0.7
	ground_mesh = MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(60, 60)
	ground_mesh.mesh = pm
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.55, 0.56, 0.6)
	ground_mesh.material_override = gm
	add_child(ground_mesh)
	# 每 0.5 m 一條淡線（看腳有沒有滑）
	for i in range(-40, 41):
		for ax in 2:
			var l := MeshInstance3D.new()
			var bm := BoxMesh.new()
			bm.size = Vector3(0.012, 0.002, 40.0) if ax == 0 else Vector3(40.0, 0.002, 0.012)
			l.mesh = bm
			var lm := StandardMaterial3D.new()
			lm.albedo_color = Color(0.68, 0.69, 0.72)
			l.material_override = lm
			l.position = Vector3(i * 0.5, 0.0005, 0) if ax == 0 else Vector3(0, 0.0005, i * 0.5)
			add_child(l)
	frame = Node3D.new()
	frame.name = "Frame"
	add_child(frame)
	propn = Node3D.new()
	propn.name = "Props"
	add_child(propn)
	var M: Array = MODELS[who]
	ken = wobj.fit_model(M[0], M[1], true, 0.3)
	frame.add_child(ken)
	sk = Retarget.find_type(ken, "Skeleton3D")
	Pose.thin_hand_outline(ken, 0.15 if String(M[0]).ends_with("softhand") else 0.25)
	ap = Retarget.find_type(ken, "AnimationPlayer")
	if ap == null:
		ap = AnimationPlayer.new()
		ken.add_child(ap)
	ap.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	await get_tree().process_frame
	var lib := AnimationLibrary.new()
	var aroot: Node = ap.get_node(ap.root_node)
	var spath := String(aroot.get_path_to(sk))
	for nm in OUT_ANIMS:
		var p := "res://assets/anims/baked/ken_%s.res" % nm
		if who == "ken" and ResourceLoader.exists(p):
			lib.add_animation(nm, load(p))
		else:
			var rt := _bind(nm)
			var a := rt.bake(spath, 30.0, nm != "baseball_hit")
			rt.src_root.queue_free()
			lib.add_animation(nm, a)
	ap.add_animation_library("ft", lib)
	_make_idle(spath)
	print("ANIMS ", ap.get_animation_list())
	am = ActMotion.new()
	am.setup(sk, ken, frame, propn, ap, wobj.outline_shader, func(_p: Vector2) -> float: return 0.0)

func _look_at(pos: Vector3, at: Vector3, fov := 40.0) -> void:
	cam.fov = fov
	cam.look_at_from_position(pos, at, Vector3.UP)

func _shot(act: String, k: int, label: String, m: Dictionary) -> void:
	await get_tree().process_frame
	_cur_k = k
	_safe_cam(act)
	var hs := _hud_check(act)
	m["hud_safe"] = hs[0]
	if hs[1] != "":
		m["hud_note"] = hs[1]
	await _save("%s_%d" % [act, k])
	if not metrics.has(act):
		metrics[act] = []
	m["label"] = label
	(metrics[act] as Array).append(m)
	print("METRIC %s %d %s %s" % [act, k, label, JSON.stringify(m)])

func _clear_out() -> void:
	for c in propn.get_children():
		c.queue_free()
	await get_tree().process_frame
	am.model_base = Transform3D(am.model_base.basis, Vector3.ZERO)
	ken.transform = am.model_base
	am.ball = null

func _outdoor() -> void:
	await _outdoor_scene()
	var only := OS.get_environment("ONLY")
	for act in ["bike", "basketball", "baseball", "jogging", "music", "camping"]:
		if only != "" and act != only:
			continue
		print("── ", act)
		await call("_o_" + act)
		await _clear_out()

func _o_bike() -> void:
	_set_base(0.0)
	am.set_bike(true)
	var C: Vector3 = am.B["C"]
	# v3：整圈 24 格都量（不只 4 格）：腳到踏板、坐墊（屁股＋大腿）、只有屁股、大腿穿坐墊、手到握把
	var cyc := {"foot_max": -9.0, "foot_min": 9.0, "seat_max": -9.0, "seat_min": 9.0, "bottom_max": -9.0, "bottom_min": 9.0, "thigh_in_max": 0, "grip_max": -9.0, "grip_min": 9.0}
	for k in 24:
		am.crank_th = k * TAU / 24.0
		am.update_bike(0.0, 0.0)
		var mm := am.measure_bike(true)
		for sd in ["left", "right"]:
			var fg := float(mm["foot_%s_pedal_gap_cm" % sd])
			cyc["foot_max"] = maxf(cyc["foot_max"], fg)
			cyc["foot_min"] = minf(cyc["foot_min"], fg)
			var hg := float(mm["hand_%s_grip_gap_cm" % sd])
			cyc["grip_max"] = maxf(cyc["grip_max"], hg)
			cyc["grip_min"] = minf(cyc["grip_min"], hg)
		cyc["seat_max"] = maxf(cyc["seat_max"], float(mm["seat_gap_cm"]))
		cyc["seat_min"] = minf(cyc["seat_min"], float(mm["seat_gap_cm"]))
		var bg: float = am.bottom_gap() * 100.0
		cyc["bottom_max"] = maxf(cyc["bottom_max"], bg)
		cyc["bottom_min"] = minf(cyc["bottom_min"], bg)
		cyc["thigh_in_max"] = maxi(int(cyc["thigh_in_max"]), int(mm["thigh_in_saddle"]))
	metrics["bike_cycle24"] = cyc
	print("MASCOT bike cycle24 ", cyc)
	var cyc_ok: bool = float(cyc["foot_max"]) <= 2.0 and float(cyc["foot_min"]) >= -0.5 and float(cyc["seat_max"]) <= 2.0 and float(cyc["seat_min"]) >= -0.5 and int(cyc["thigh_in_max"]) == 0 and float(cyc["grip_max"]) <= 2.0 and float(cyc["grip_min"]) >= -0.5
	var cyc_txt := "24-step worst: seat %.1f..%.1f, foot %.1f..%.1f, grip %.1f..%.1f, thigh-in %d" % [cyc["seat_min"], cyc["seat_max"], cyc["foot_min"], cyc["foot_max"], cyc["grip_min"], cyc["grip_max"], cyc["thigh_in_max"]]
	var names := ["prepare: right pedal top", "contact: right pedal front (push)", "mid: right pedal bottom", "end: right pedal back"]
	for k in 4:
		am.crank_th = k * PI / 2.0
		am.update_bike(0.0, 0.0)
		await get_tree().process_frame
		_look_at(Vector3(2.3, 0.75, C.z + 0.1), Vector3(0, 0.55, C.z + 0.1), 38)
		var m := am.measure_bike(true)
		m["bottom_gap_cm"] = am.bottom_gap() * 100.0
		m["cycle"] = cyc_txt
		m["cycle_ok"] = cyc_ok
		await _shot("bike", k, names[k], m)
	# 前進時：曲柄、輪子都照速度轉（量轉角比）
	var th0 := am.crank_th
	var ph0 := am.wheel_phi
	am.update_bike(0.5, 3.0)
	print("BIKE ratio: 0.5 s @3 m/s crank %.3f rad, wheel %.3f rad, wheel*r=%.3f m（應＝1.5）" % [am.crank_th - th0, am.wheel_phi - ph0, (am.wheel_phi - ph0) * float(am.B["r"])])
	am.set_bike(false)

func _o_basketball() -> void:
	_set_base(am.ground_offset("ft/dribble"))
	am.build_hoop(2.8)
	am.start_dribble()
	var tab := am.dribble_tab
	var n := tab.size()
	# 找：放手前（推球中）、放手、落地、接球
	var rel := -1
	for i in n:
		if bool(tab[i][2]) and not bool(tab[(i + 1) % n][2]):
			rel = i
			break
	var bounce := rel
	var lo := 9.0
	var i2 := (rel + 1) % n
	while not bool(tab[i2][2]):
		var y: float = (tab[i2][1] as Vector3).y
		if y < lo:
			lo = y
			bounce = i2
		i2 = (i2 + 1) % n
	var catch_i := i2
	var picks := [(rel - 6 + n) % n, rel, bounce, catch_i]
	var tb: float = am.dribble_bounces[0] if not am.dribble_bounces.is_empty() else -1.0
	var names := ["prepare: palm pushes ball down", "contact: last frame in hand (release)", "mid: ball bounces on floor", "end: ball meets palm again"]
	for k in 4:
		var t: float = tab[picks[k]][0]
		if k == 2 and tb >= 0.0:
			t = tb
		am.pose_at(am.dribble_an, t)
		am.update_dribble()
		await get_tree().process_frame
		var b := am.ball.position
		_look_at(Vector3(-1.9, 0.75, b.z + 0.15), Vector3(0, 0.5, b.z + 0.15), 40)
		var m := am.measure_dribble()
		m["t"] = t
		await _shot("basketball", k, names[k], m)

func _o_baseball() -> void:
	_set_base(am.ground_offset("ft/baseball_hit"))
	var xf := Transform3D(Basis(Vector3(1, 0, 0), -PI / 2), Vector3(0.0, 0.07, 0.03))
	am.left_on_bat = false
	am.pbat = OS.get_environment("NOPBAT") == ""
	am.pb_reach = 0.98   # v2：程式球棒路徑＋兩手 IK
	am.start_baseball(xf)
	var tc: float = am.bb["t_c"]
	var L: float = am.bb["len"]
	if OS.get_environment("BATDBG") != "":
		am._corr_off = OS.get_environment("BATDBG") == "raw"
		for tt in [0.3, 0.57, 0.9, 1.13, 1.3, 1.47, 1.7, 2.0]:
			am.pose_at(am.bb["an"], tt)
			am.bat.transform = am.bat_xf * am._corr_now()
			if am.pbat:
				am.bat.global_transform = frame.global_transform * am.bat_frame_xf()
			var hd := _bpos("head")
			for v in [["f", Vector3(0, 0.1, 1.6)], ["s", Vector3(1.6, 0.1, 0)], ["b", Vector3(0, 0.3, -1.6)]]:
				_look_at(hd + (v[1] as Vector3) * 1.4, hd - Vector3(0, 0.35, 0), 45)
				await _save("batdbg_%s_%.2f" % [v[0], tt])
			var X := am.bat_frame_xf()
			print("BATDBG t=%.2f hits=%s gapR %.1f gapL %.1f" % [tt, am.bat_body_hits(), am._hand_bat_gap("right", X) * 100.0, am._hand_bat_gap("left", X) * 100.0])
		return
	var wants := [tc - 0.1, tc, tc + 0.22, -1.0]   # [mascot] 來球 0.1 秒前（球還在 1 m 內，看得到）
	await _bat_sweep()
	var names := ["prepare: pitched ball flies in", "contact: ball on bat face", "mid: ball flies off, swing follows through", "end: bat dropped, runs to base"]
	var k := 0
	var dt := 1.0 / 120.0
	am.restart_baseball()
	var t := 0.0
	var dropped_at := -1.0
	while k < 4 and t < L + 8.0:
		var done := am.update_baseball(dt)
		t = am.bb_t
		if dropped_at < 0.0 and not am.bb_drop.is_empty():
			dropped_at = t
		var hit := false
		if k < 3 and t >= float(wants[k]) - 0.0001:
			hit = true
		if k == 3 and am.bb_phase == "base" and t > L + 0.8:
			hit = true
		if hit:
			await get_tree().process_frame
			var bp := am.base_node.position
			if k < 3:
				var cc: Vector3 = am.bb["center"]
				var nn: Vector3 = am.bb["nrm"]
				nn = Vector3(nn.x, 0, nn.z).normalized()
				var sd := nn.cross(Vector3.UP).normalized()
				if sd.dot(Vector3(0, 0, 1)) < 0.0:
					sd = -sd
				_look_at(cc + sd * 2.0 + nn * 0.5 + Vector3(0, 0.35, 0), cc + nn * 0.4 + Vector3(0, -0.1, 0), 45)
			else:
				_look_at(Vector3(1.8, 1.6, 3.6), (bp + Vector3(0, 0.6, 0)).lerp(Vector3(0, 0.4, 0), 0.5), 50)
			var m := am.measure_baseball()
			m["cycle"] = bb_cycle
			m["cycle_ok"] = bb_cycle_ok
			if k == 3:
				var hj := am.fpos("hips")
				m["hips_to_base_cm"] = Vector2(hj.x - bp.x, hj.z - bp.z).length() * 100.0
				m["bat_dropped_t"] = dropped_at
			await _shot("baseball", k, names[k], m)
			k += 1
		if done:
			break

## 慢跑：角色往 +Z 前進，動作照「腳底不滑」的速度播；量踩地那隻腳在地上滑了多少、腳有沒有陷進地面
func _o_jogging() -> void:
	await _gait("jogging", JOG_ANIM.get(who, "ft/jogging"), MASCOT_JOG)   # [mascot] 腿長 0.28 m：2.0 m/s 要 2.9 倍速播（腳亂轉），改 1.0 m/s

func _gait(act: String, an: String, v: float) -> void:
	am.flatten_feet = false   # 試過圳寶腳掌放平：步速 0.65 → 0.19 m/s（要 5.4 倍速），更糟，不用
	var proc := an == "proc"
	if proc:   # 程式跑步：速度＝步幅÷支撐時間（自己算），模型基準＝站姿貼地
		_set_base(am.ground_offset("idle"))
		am.run_setup()
		v = am.run_speed()
		an = "idle"
	var ss := v if proc else am.stride_speed(an)
	var off := am.model_base.origin.y if proc else am.ground_offset(an, true)
	_set_base(off)
	print("GAIT %s stride speed %.3f m/s → 播放倍率 %.2f（前進 %.2f m/s）貼地 %.1f cm" % [an, ss, v / ss, v, off * 100.0])
	ap.play(an, 0.0)
	ap.seek(0.0, true)
	ap.advance(0.0)
	ken.transform = am.model_base
	var dt := 1.0 / 60.0
	var L := ap.get_animation(an).length
	var steps := int(L / (v / ss) / dt) + 2
	if proc:
		steps = int(3.0 * float(am.run["T"]) / dt) + 2
	var frames := []   # 每格：[左腳頂點, 右腳頂點]
	am.gait_setup()
	var gfix := OS.get_environment("NOGAITFIX") == ""
	for i in steps:
		ken.position.z += v * dt
		if proc:
			am.apply_run((i + 1) * dt)
		else:
			ap.advance(dt * v / ss)
			if gfix:
				am.gait_fix(dt)
		frames.append([am.mesh_pts(["leftfoot", "lefttoe"]), am.mesh_pts(["rightfoot", "righttoe"])])
	# 腳底滑動：著地（最低點 < 0.6 cm）時，「最低的那個頂點」到下一格在地上移動多少（同一個頂點）
	var slip_max := 0.0
	var slip_sum := 0.0
	var slip_n := 0
	var sink := 9.0
	var lows := []
	for i in steps:
		var row := []
		for s2 in 2:
			var P: PackedVector3Array = frames[i][s2]
			var low := 9.0
			var j := 0
			for k in P.size():
				if P[k].y < low:
					low = P[k].y
					j = k
			row.append([low, j])
			sink = minf(sink, low)
			if i + 1 < steps and low < 0.006:
				var Q: PackedVector3Array = frames[i + 1][s2]
				var d := Vector2(Q[j].x - P[j].x, Q[j].z - P[j].z).length()
				slip_max = maxf(slip_max, d)
				slip_sum += d
				slip_n += 1
		lows.append(row)
	if OS.get_environment("GAITDIAG") != "":
		for i in steps:
			var row2 := ""
			for s3 in 2:
				var P3: PackedVector3Array = frames[i][s3]
				var vi3: int = lows[i][s3][1]
				row2 += " %s y=%.2f x=%.2f z=%.2f |" % [["L", "R"][s3], float(lows[i][s3][0]) * 100.0, P3[vi3].x * 100.0, P3[vi3].z * 100.0]
			print("GD %3d%s" % [i, row2])
	# 踩地那一段（連續 ≥ 4 格著地）：中間那一格最低的頂點，在這一段中間 60% 的時間裡在地上移動多少 → 「踩穩時滑了幾公分」
	var drift_max := 0.0
	var skim := 9.0   # 腳在動（> 0.35 m/s）時腳底最低點
	for i in range(1, steps):
		for s2 in 2:
			var P: PackedVector3Array = frames[i][s2]
			var Q: PackedVector3Array = frames[i - 1][s2]
			var vi: int = lows[i][s2][1]
			if Vector2(P[vi].x - Q[vi].x, P[vi].z - Q[vi].z).length() / dt > 0.35:
				skim = minf(skim, float(lows[i][s2][0]))
	for s2 in 2:
		var i := 0
		while i < steps:
			if float(lows[i][s2][0]) < 0.006:
				var j := i
				while j + 1 < steps and float(lows[j + 1][s2][0]) < 0.006:
					j += 1
				if j - i >= 3 and i > 0 and j < steps - 1:
					var mid := (i + j) / 2
					var vi: int = lows[mid][s2][1]
					var a0 := i + int((j - i) * 0.2)
					var a1 := i + int(ceil((j - i) * 0.8))
					var P0: Vector3 = (frames[a0][s2] as PackedVector3Array)[vi]
					for f in range(a0, a1 + 1):
						var Pf: Vector3 = (frames[f][s2] as PackedVector3Array)[vi]
						drift_max = maxf(drift_max, Vector2(Pf.x - P0.x, Pf.z - P0.z).length())
				i = j + 1
			else:
				i += 1
	var summary := {"stride_speed_mps": ss, "play_rate": v / ss, "ground_speed_mps": v, "ground_offset_cm": off * 100.0,
		"planted_slide_cm": drift_max * 100.0, "moving_foot_lowest_cm": skim * 100.0, "lowest_foot_cm": sink * 100.0}
	print("GAIT ", act, " ", summary)
	var on := func(i: int, s2: int) -> bool: return float(lows[i][s2][0]) < (0.012 if proc else 0.006)
	var first := func(cond: Callable, from := 1) -> int:
		for i in range(from, steps):
			if cond.call(i):
				return i
		return mini(from, steps - 1)
	var r_strike: int = first.call(func(i: int) -> bool: return on.call(i, 1) and not on.call(i - 1, 1))
	var r_mid: int = first.call(func(i: int) -> bool: return on.call(i, 1) and not on.call(i, 0), r_strike)
	var lift: int = first.call(func(i: int) -> bool: return not on.call(i, 1), r_mid)
	var l_strike: int = first.call(func(i: int) -> bool: return on.call(i, 0) and not on.call(i - 1, 0), r_strike + 1)
	var picks := [r_strike, mini(r_mid + 4, lift), lift, l_strike]
	var names := ["prepare: right foot lands", "contact: right foot planted (no slide)", "mid: right foot pushes off", "end: left foot lands"]
	for k in 4:
		ken.transform = am.model_base
		ken.position.z = v * dt * (picks[k] + 1)
		ap.seek(0.0, true)
		ap.advance(0.0)
		am.gait_setup()
		ken.position.z = 0.0
		for i in picks[k] + 1:
			ken.position.z += v * dt
			if proc:
				am.apply_run((i + 1) * dt)
			else:
				ap.advance(dt * v / ss)
				if gfix:
					am.gait_fix(dt)
		await get_tree().process_frame
		var z := ken.position.z
		_look_at(Vector3(2.4, 0.8, z + 0.2), Vector3(0, 0.55, z + 0.2), 38)
		var m := summary.duplicate()
		m["left_foot_cm"] = float(lows[picks[k]][0][0]) * 100.0
		m["right_foot_cm"] = float(lows[picks[k]][1][0]) * 100.0
		await _shot(act, k, names[k], m)

## 動作貼地：模型往上移 off（腳／膝蓋剛好碰地）
func _set_base(off: float) -> void:
	am.model_base = Transform3D(am.model_base.basis, Vector3(0, off, 0))
	ken.transform = am.model_base

func _unused(_a, _b) -> void:
	pass

func _o_music() -> void:
	var idle := ""
	for x in ap.get_animation_list():
		if String(x).to_lower().contains("idle") and not String(x).begins_with("ft/"):
			idle = x
	if idle == "":
		idle = "ft/sitting_idle"
	_set_base(am.ground_offset(idle))
	props.clear()
	ap.play(idle, 0.0)
	ap.seek(0.5, true)
	ap.advance(0.0)
	if who == "ken":
		var P = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/poses.json"))
		var H: Dictionary = P["stand_headphones"]
		var hpn: Node3D = (load(H["scene"]) as PackedScene).instantiate()
		var ba := BoneAttachment3D.new()
		ba.bone_name = H["bone"]
		sk.add_child(ba)
		var a: Array = H["xf"]
		ba.add_child(hpn)
		hpn.transform = Transform3D(Basis(Vector3(a[0], a[1], a[2]), Vector3(a[3], a[4], a[5]), Vector3(a[6], a[7], a[8])), Vector3(a[9], a[10], a[11]))
		props.append(ba)
	else:
		await _put_headphones_m()
		await _widen_headphones()
	var names := ["prepare: headphones on, music starts", "contact: ear cups on both ears", "mid: upper body sways to the beat", "end: feet stay planted"]
	var L := ap.get_animation(idle).length
	for k in 4:
		ap.seek(fmod(0.5 + k * 0.4, L), true)
		ap.advance(0.0)
		am.music_sway(0.25 * k)
		await get_tree().process_frame
		var hd := _bpos("head")
		_look_at(hd + Vector3(1.3, 0.1, 1.8), Vector3(0, hd.y * 0.62, 0), 38)
		var m := am.measure_ground_body()
		m["ear_pad_gap_cm"] = _ear_gap() * 100.0
		m["ear_pad_in_head"] = _ear_in()
		await _shot("music", k, names[k], m)
	for p in props:
		p.queue_free()
	props.clear()

## 耳罩內面到頭：每個圓柱（耳罩、耳墊）的軸向範圍內，頭的頂點離圓柱端面多遠（負＝穿進去）；回傳最小值
func _ear_gap() -> float:
	if props.is_empty():
		return -1.0
	var head := mesh_head_pts()
	var best := 9.0
	var hp: Node = (props[-1] as Node).get_child(0)
	var cyls := []
	_collect_cyl(hp, cyls)
	for c: MeshInstance3D in cyls:
		var cm := c.mesh as CylinderMesh
		var inv := c.global_transform.affine_inverse()
		var sc := c.global_transform.basis.get_scale()
		for p in head:
			var q := inv * p
			if Vector2(q.x, q.z).length() < cm.top_radius:
				best = minf(best, (absf(q.y) - cm.height * 0.5) * sc.y)
	return best

func _collect_cyl(n: Node, arr: Array) -> void:
	if n is MeshInstance3D and (n as MeshInstance3D).mesh is CylinderMesh:
		arr.append(n)
	for c in n.get_children():
		_collect_cyl(c, arr)

func mesh_head_pts() -> PackedVector3Array:
	var out := PackedVector3Array()
	for it in Pose._hp_skinned(sk, "", ["head"]):
		out.append_array(it[1])
	return out

func _o_camping() -> void:
	if who == "zunbo":
		await _o_camping_sit()
		return
	_set_base(am.ground_offset("ft/kneeling_idle"))
	var fire := am.build_camp()
	ap.play("ft/kneeling_idle", 0.0)
	var L := ap.get_animation("ft/kneeling_idle").length
	var names := ["prepare: kneels by the campfire", "contact: knees + toes on the ground", "mid: warms up (idle)", "end: still kneeling, safe distance"]
	for k in 4:
		ap.seek(L * k / 4.0, true)
		ap.advance(0.0)
		am.update_camp(k * 0.7)
		await get_tree().process_frame
		_look_at(Vector3(2.2, 1.2, 2.6), Vector3(-0.2, 0.35, 0.2), 45)
		var m := am.measure_ground_body(fire.position)
		await _shot("camping", k, names[k], m)

# ───────── 貼地校正：每個動作模型要上移多少（遊戲讀 data/interior/anim_ground.json） ─────────
func _calib() -> void:
	await _outdoor_scene()
	var out := {}
	for an in ap.get_animation_list():
		var gait := String(an) == "walk" or String(an) == "ft/jogging"
		if String(an).begins_with("ft/") or String(an) == "walk" or String(an) == "idle":
			out[an] = am.ground_offset(an, gait)
			print("CALIB %s %.2f cm" % [an, float(out[an]) * 100.0])
	var path := "res://data/interior/anim_ground.json" if who == "ken" else "%s/anim_ground.json" % out_dir
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(JSON.stringify(out, " "))
	f.close()
	metrics["anim_ground_cm"] = out

# ───────── 室內：用已驗收的室內姿勢（home_check.gd／mascot_home_check.gd），拍 準備（站在旁邊）→ 坐好接觸 → 近看 → 站起來 ─────────
const INDOOR := {"english": ["study_english", "desk_seat_book"], "internet": ["surf_internet", "desk_seat"], "tv": ["watch_tv", "sofa_seat"],
	"games": ["surf_internet", "desk_seat"], "recorder": ["recorder", "recorder_spot"]}
var meshes_home := []

func _indoor() -> void:
	_lights()
	hb = Home.new()
	home = hb.call("build_%s_home" % who)
	add_child(home)
	if who != "ken":
		D = home.get_meta("dims")
	var M: Array = MODELS[who]
	ken = wobj.fit_model(M[0], M[1], true, INDOOR_OUTLINE)
	add_child(ken)
	var ap0: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	if ap0:
		ap0.stop()
		ap0.active = false
	sk = Retarget.find_type(ken, "Skeleton3D")
	if who == "ken" and Pose.right_is_fist(sk):
		Pose.hide_hand_gadget(ken)
	Pose.thin_hand_outline(ken, 0.15 if String(M[0]).ends_with("softhand") else 0.25)
	if who == "shuiling":
		_make_skirt_mask()
	await get_tree().process_frame
	_collect_meshes(home)
	var only := OS.get_environment("ONLY")
	for act in ["english", "internet", "tv", "games", "recorder"]:
		if only != "" and act != only:
			continue
		print("── ", act)
		await _indoor_act(act)

func _collect_meshes(n: Node) -> void:
	if n is MeshInstance3D and (n as Node3D).is_visible_in_tree():
		meshes_home.append(n)
	for c in n.get_children():
		_collect_meshes(c)

## 手（或筆尖）下方的家具表面高度：所有家具 AABB 在這個 xz 範圍、頂面在點下方 2 cm 以內的最高者
func _surface_under(p: Vector3) -> float:
	var top := -9.0
	for mi: MeshInstance3D in meshes_home:
		if not mi.is_visible_in_tree():
			continue
		var bx: AABB = mi.global_transform * mi.get_aabb()
		if bx.size.y < 0.003 and bx.position.y < 0.01:
			continue
		if p.x >= bx.position.x - 0.003 and p.x <= bx.end.x + 0.003 and p.z >= bx.position.z - 0.003 and p.z <= bx.end.z + 0.003:
			if bx.end.y <= p.y + 0.02 and bx.end.y > top:
				top = bx.end.y
	return top

func _pts_of(keys: Array) -> PackedVector3Array:
	var out := PackedVector3Array()
	for it in Pose._hp_skinned(sk, "", keys):
		out.append_array(it[1])
	return out

func _stand_at(anchor: String, side := 0.0, fwd := 0.45, turn := 0.0) -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	var at: Transform3D = A(anchor).global_transform
	var F: Vector3 = -at.basis.z.normalized()
	F.y = 0
	F = F.normalized()
	var X := Vector3.UP.cross(F).normalized()
	var pos := at.origin + F * fwd + X * side
	pos.y = 0.0
	var face := F.rotated(Vector3.UP, turn)
	ken.global_transform = Transform3D(Basis.looking_at(-face, Vector3.UP), pos)
	# 站姿貼地：最低的腳底頂點＝地板
	await get_tree().process_frame
	var low := 9.0
	for q in _pts_of(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		low = minf(low, q.y)
	ken.global_position.y -= low

func _stand_metrics(anchor: String) -> Dictionary:
	var m := {}
	var low := 9.0
	for q in _pts_of(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		low = minf(low, q.y)
	m["feet_cm"] = low * 100.0
	# 站著時身體有沒有穿進家具：身體頂點在家具 AABB（座椅、書桌、沙發、譜架）裡面的數量
	var cnt := 0
	var body := _pts_of(["hips", "spine", "left", "right"])
	for mi: MeshInstance3D in meshes_home:
		var nm := String(mi.get_path())
		if not (nm.contains("Sofa") or nm.contains("DeskChair") or nm.contains("MusicStand") or nm.contains("Desk")):
			continue
		var bx: AABB = mi.global_transform * mi.get_aabb()
		if bx.size.y < 0.02:
			continue
		for q in body:
			if bx.grow(-0.005).has_point(q):
				cnt += 1
	m["stand_in_furniture"] = cnt
	return m

func _sit_metrics(act: String, anchor: String) -> Dictionary:
	var m := {}
	var an: Vector3 = A(anchor).global_position
	if act != "recorder":
		# [mascot] 屁股／大腿：不含裙子（水鈴的裙子另外用 settle_skirt 壓好的頂點量），
		# 只算座墊範圍裡、臀部以下的頂點（裙子從座墊前緣垂下去不算穿進椅子）
		var low := 9.0
		var inside := 0
		var I := _pts_info(1)
		var hy := _bpos("hips").y
		for i in I["p"].size():
			var bn: String = I["b"][i]
			if I["s"][i] == 1 or not (bn == "hips" or bn.ends_with("upleg")):
				continue
			var q: Vector3 = I["p"][i]
			if q.y < hy and Vector2(q.x - an.x, q.z - an.z).length() < 0.16:
				low = minf(low, q.y - an.y)
				if q.y < an.y - 0.01:
					inside += 1
		m["seat_gap_cm"] = low * 100.0
		m["body_in_furniture"] = inside
		if who == "shuiling" and not baked_skirt.is_empty():
			var sl := 9.0
			for q in baked_skirt:
				if Vector2(q.x - an.x, q.z - an.z).length() < 0.16:
					sl = minf(sl, q.y - an.y)
			m["skirt_seat_gap_cm"] = sl * 100.0
	# [mascot] 腳底到「腳下面的東西」（地板或腳踏），不是到地板 y=0：圳寶坐著時腳放在腳踏上
	var lowf := 9.0
	for q in _pts_of(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		lowf = minf(lowf, q.y - _surface_below(q))
	m["feet_floor_cm"] = lowf * 100.0
	match act:
		"tv":   # 兩手放在大腿上：手到大腿最近
			var legs := _pts_of(["leftupleg", "rightupleg", "leftleg", "rightleg"])
			var best := 9.0
			for sd in ["left", "right"]:
				var hp := _pts_of([sd + "hand"])
				for i in range(0, hp.size(), 3):
					for j in range(0, legs.size(), 2):
						best = minf(best, hp[i].distance_to(legs[j]))
			m["hand_gap_cm"] = best * 100.0
		"english", "internet", "games":   # 手放在課本／鍵盤上：手最低點到下面的表面
			var best := 9.0
			for sd in ["left", "right"]:
				for q in _pts_of([sd + "hand"]):
					var top := _surface_under(q)
					if top > -1.0:
						best = minf(best, q.y - top)
			m["hand_gap_cm"] = best * 100.0
			if act == "english":
				for pr in props:
					var pen: Node3D = (pr as Node).get_child(0)
					var tip := pen.global_position
					m["tool_gap_cm"] = (tip.y - _surface_under(tip + Vector3.UP * 0.01)) * 100.0
		"recorder":   # 手到笛身表面
			for pr in props:
				var rec: Node3D = (pr as Node).get_child(0)
				var t0 := rec.global_position
				var ax := rec.global_transform.basis.y.normalized()
				var L: float = Pose.RECORDER_LEN if who == "ken" else float(REC[who]["L"])
				var r: float = Pose.RECORDER_R if who == "ken" else float(REC[who]["r_draw"])
				var best := 9.0
				for sd in ["left", "right"]:
					for q in _pts_of([sd + "hand"]):
						var sa := clampf((q - t0).dot(ax), 0.0, L)
						best = minf(best, (q - t0 - ax * sa).length() - r)
				m["hand_gap_cm"] = best * 100.0
	return m

func _indoor_act(act: String) -> void:
	var shot: String = INDOOR[act][0]
	var anchor: String = INDOOR[act][1]
	_clear_props()
	extra_views.clear()
	front_view = []
	# [mascot] 先擺一次已驗收的姿勢，拿它的鏡頭（老師核可的角度、不會在牆裡）和手部特寫鏡頭；準備／結束都用同一個鏡頭
	await call("_m_" + shot)
	await get_tree().process_frame
	var cam_ok := cam.global_transform
	var fov_ok := cam.fov
	var hand_view := []
	for v in extra_views:
		if String(v[0]) == "v_hands":
			hand_view = v
	_clear_props()
	extra_views.clear()
	front_view = []
	# 準備：站在座位旁（書桌＝椅子旁邊；沙發＝前面；直笛＝譜架前、手放下）
	var side := (0.42 if who == "shuiling" else 0.6) if anchor.begins_with("desk") else 0.0   # [mascot] 圳寶身體寬：站 0.42 m 會有 18–25 個頂點在桌椅裡
	var fwd := 0.05 if anchor.begins_with("desk") else (0.0 if act == "recorder" else 0.5)
	var back := await _stand_clear(anchor, side, fwd, 0.0)
	var hd := _bpos("head")
	var key0: Dictionary = _key_pts(act)
	_safe_indoor_cam([hd, _bpos("leftfoot"), _bpos("rightfoot")] + key0.values(), cam_ok.origin, [1.4, 1.8, 2.3, 2.8, 3.4, 4.0], 55.0, true)
	var m0 := _stand_metrics(anchor)
	m0["stepped_back_cm"] = back * 100.0
	await _shot(act, 0, "prepare: walks up and stands beside", m0)
	# 接觸：已驗收的姿勢（和遊戲同一份）
	if who == "ken":
		await call("_shot_" + shot)
	else:
		await call("_m_" + shot)
	if act == "games":
		(home.get_node("headphones/HeadphonesProp") as Node3D).visible = false
		if who == "ken":
			_put_headphones()
		else:
			await _put_headphones_m()
	await get_tree().process_frame
	var lifted := 0.0
	if act == "recorder":   # [mascot] 站著吹直笛：最低的腳底頂點在地板下 → 整個人（連直笛）抬到地板上 2 mm
		for it in 4:   # 抬起來之後腳下面可能換成地毯（1 cm）→ 再量再抬
			var lowr := _feet_gap()
			if lowr >= 0.0:
				break
			lifted += 0.002 - lowr
			ken.global_position.y += 0.002 - lowr
			await get_tree().process_frame
	if act != "recorder":   # [mascot] 坐著：靴底陷進腳踏／地板 → 小腿往前伸一點（屁股不動），最多三次
		for it in 3:
			var fg := _feet_gap()
			if fg >= 0.0:
				break
			for sd in ["left", "right"]:
				_lift_foot_ik(sd, 0.003 - fg)
			await get_tree().process_frame
		var fg2 := _feet_gap()
		if fg2 > 0.015:   # 靴底離腳踏太高（> 1.5 cm）→ 往下放到 0.8 cm
			for sd in ["left", "right"]:
				_lift_foot_ik(sd, 0.008 - fg2)
			await get_tree().process_frame
	var hands := [_bpos("lefthand"), _bpos("righthand")]
	var key1: Dictionary = _key_pts(act)
	if not _safe_indoor_cam([_bpos("head")] + hands + key1.values(), cam_ok.origin, [1.0, 1.3, 1.7, 2.2, 2.8, 3.4], 50.0, true):
		_safe_indoor_cam([_bpos("head")] + hands + key1.values(), cam_ok.origin, [1.0, 1.3, 1.7, 2.2, 2.8, 3.4], 50.0, false)   # 臉和電視不能同時正面 → 和 Ken 一樣從側後方
	var m1 := _sit_metrics(act, anchor)
	if lifted > 0.0:
		m1["lifted_cm"] = lifted * 100.0
	await _shot(act, 1, "contact: sits / holds (approved pose)", m1)
	# 近看：手和東西
	# 手部特寫：從已驗收鏡頭的位置拉近看兩手（mascot_home_check 的 v_hands 鏡頭在書桌／牆裡面）
	var key2 := key1.values().filter(func(p): return p != key1["head"])
	if not _safe_indoor_cam(hands + key2, cam.global_position, [0.55, 0.7, 0.9, 1.15, 1.5, 2.0, 2.6], 45.0, true):
		_safe_indoor_cam(hands, cam.global_position, [0.55, 0.7, 0.9, 1.15, 1.5], 45.0)
	await _shot(act, 2, "mid: close-up of hands on the object", m1.duplicate())
	# 結束：站起來、轉身（離開座位，不穿過家具）
	_clear_props()
	var back3 := await _stand_clear(anchor, side, fwd, PI * 0.6)   # 先離開椅子／書桌，再轉身
	_safe_indoor_cam([_bpos("head"), _bpos("leftfoot"), _bpos("rightfoot")] + key0.values(), cam_ok.origin, [1.4, 1.8, 2.3, 2.8, 3.4, 4.0], 55.0)
	var m3 := _stand_metrics(anchor)
	m3["stepped_back_cm"] = back3 * 100.0
	await _shot(act, 3, "end: steps away from the seat, then turns to leave", m3)

# ───────── 移動（走路）：之後補 ─────────
func _move() -> void:
	await _outdoor_scene()
	await _gait("walk", "walk", MASCOT_WALK)   # 遊戲的走路速度（game.gd TRAVEL_SPEED）
	await _clear_out()
	await _gait("jogging", "ft/jogging", MASCOT_JOG)

# ───────── [mascot] 量動作（PROBE）：骨名、慢跑腳趾高度/前後 ─────────
func _probe_m() -> void:
	await _outdoor_scene()
	var names := []
	for i in sk.get_bone_count():
		names.append(Retarget.norm(sk.get_bone_name(i)))
	print("BONES ", names)
	var an := OS.get_environment("AN") if OS.get_environment("AN") != "" else "ft/jogging"
	var L := ap.get_animation(an).length
	print("ANIM %s len %.2f" % [an, L])
	for nm in ["idle", an]:
		for tt in [0.0, 0.3, 0.6]:
			am.pose_at(nm, tt)
			var row := "%s t=%.1f" % [nm, tt]
			for g in ["leftfoot", "lefttoe", "rightfoot", "righttoe", "leftleg", "rightleg", "lefthand", "righthand", "hips"]:
				var lo := 9.0
				for q in am.mesh_pts([g]):
					lo = minf(lo, q.y)
				row += " %s=%.3f(n%d)" % [g, lo, am.mesh_pts([g]).size()]
			print("LOWS ", row)
	for i in 25:
		am.pose_at(an, L * i / 24.0)
		print("  t=%.2f Ltoe %s Rtoe %s Lfoot %s hips %s" % [L * i / 24.0, am.fpos("lefttoebase"), am.fpos("righttoebase"), am.fpos("leftfoot"), am.fpos("hips")])

# ───────── [mascot] 追加 ─────────
## 圳寶：Mixamo jogging 重定向後腿縮成一團、腳趾骨跑到地面下 6 cm（腿長只有 0.16 m）→ 用模型內建的 walk 快走當慢跑
const JOG_ANIM := {"zunbo": "proc", "shuiling": "proc"}   # v2：兩個都用程式跑步（見 mascot_motion.apply_run）   # 試過圳寶用內建 walk：步速 -0.04 m/s（原地／方向不對）→ 不可用，維持 ft/jogging（見 findings）
const MASCOT_JOG := 1.0    # 吉祥物慢跑速度（m/s）：動作原地步速 0.69 → 播放 1.45 倍
const MASCOT_WALK := 0.8

## 吉祥物沒有 idle 動作 → 烤一個「站好」的靜態動作（Pose.pose_stand），聽音樂、跑到壘包後都用它
func _make_idle(spath: String) -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	ken.transform = Transform3D.IDENTITY
	var a := Animation.new()
	a.length = 2.0
	a.loop_mode = Animation.LOOP_LINEAR
	for i in sk.get_bone_count():
		var tr := a.add_track(Animation.TYPE_ROTATION_3D)
		a.track_set_path(tr, NodePath("%s:%s" % [spath, sk.get_bone_name(i)]))
		a.rotation_track_insert_key(tr, 0.0, sk.get_bone_pose_rotation(i))
		var tp := a.add_track(Animation.TYPE_POSITION_3D)
		a.track_set_path(tp, NodePath("%s:%s" % [spath, sk.get_bone_name(i)]))
		a.position_track_insert_key(tp, 0.0, sk.get_bone_pose_position(i))
	var lib: AnimationLibrary
	if ap.has_animation_library(""):
		lib = ap.get_animation_library("")
	else:
		lib = AnimationLibrary.new()
		ap.add_animation_library("", lib)
	if not lib.has_animation("idle"):
		lib.add_animation("idle", a)
	sk.reset_bone_poses()

## 耳機：耳罩內面穿進頭（頭髮捲在耳朵旁）→ 整副耳機左右撐開，直到所有頭的頂點離耳罩 ≥ 2 mm
func _widen_headphones() -> void:
	var hp: Node3D = (props[-1] as Node).get_child(0)
	var g0 := _ear_gap()
	var it := 0
	while _ear_gap() < 0.002 and it < 80:
		hp.scale.x *= 1.01
		await get_tree().process_frame
		it += 1
	print("MASCOT headphones widened x%.2f: ear gap %.1f -> %.1f mm" % [hp.scale.x, g0 * 1000.0, _ear_gap() * 1000.0])

## 耳罩圓柱裡的頭頂點數
func _ear_in() -> int:
	if props.is_empty():
		return -1
	var hp: Node = (props[-1] as Node).get_child(0)
	var cyls := []
	_collect_cyl(hp, cyls)
	var n := 0
	for p in mesh_head_pts():
		for c: MeshInstance3D in cyls:
			var cm := c.mesh as CylinderMesh
			var q := c.global_transform.affine_inverse() * p
			if Vector2(q.x, q.z).length() < cm.top_radius and absf(q.y) < cm.height * 0.5:
				n += 1
				break
	return n

## 和 game.gd _hud_safe 同一個規則：重點物件（頭＋活動的主要道具）不能在右上按鈕列（右邊 200 px、上半）或下方題目面板（下 1/3）
func _hud_check(act: String) -> Array:
	var vs := get_viewport().get_visible_rect().size
	var col := Rect2(vs.x - 200.0, 0.0, 200.0, vs.y * 0.5)
	var pan := Rect2(0.0, vs.y * 0.667, vs.x, vs.y * 0.333)
	var pts := _key_pts(act)
	var ok := true
	var note := ""
	for k in pts:
		var w: Vector3 = pts[k]
		if cam.is_position_behind(w):
			ok = false
			note += "%s behind " % k
			continue
		var sp := cam.unproject_position(w)
		if col.has_point(sp) or pan.has_point(sp) or sp.x < 0 or sp.y < 0 or sp.x > vs.x or sp.y > vs.y:
			ok = false
			note += "%s(%d,%d) " % [k, sp.x, sp.y]
	return [ok, note.strip_edges()]

func _key_pts(act: String) -> Dictionary:
	var pts := {"head": _bpos("head")}
	if mode == "indoor" and _cur_k == 2:
		pts.erase("head")   # 室內手部特寫：看手和東西（頭不一定在畫面裡）
	match act:
		"basketball":
			if am.ball:
				pts["ball"] = am.ball.global_position
		"baseball":
			if am.bat:
				pts["bat"] = am.bat.global_transform * Vector3(0, am._bat_top() * 0.6, 0)
			if am.bb_ball and am.bb_ball.visible and am.bb_phase != "base":
				pts["ball"] = am.bb_ball.global_position
			if am.base_node and (am.bb_phase == "run" or am.bb_phase == "base"):
				pts["base"] = am.base_node.global_position
		"bike":
			for w in am.wheels:
				pts["wheel_%d" % am.wheels.find(w)] = (w as Node3D).global_position
		"camping":
			var f := propn.get_node_or_null("Fire")
			if f:
				pts["fire"] = (f as Node3D).global_position
		"tv":
			var tv := home.find_child("TVScreen", true, false) if home else null
			if tv:
				pts["tv"] = (tv as Node3D).global_position
		"internet", "games":
			var pc := home.find_child("PCScreen", true, false) if home else null
			if pc:
				pts["pc_screen"] = (pc as Node3D).global_position
		"english":
			var bk := home.get_node_or_null("book") if home else null
			if bk:
				pts["book"] = (bk as Node3D).global_position
		"recorder":
			if not props.is_empty():
				pts["recorder"] = ((props[-1] as Node).get_child(0) as Node3D).global_position
	return pts

## 鏡頭自動避開 HUD（和 game.gd _hud_safe 同規則）：角色整個網格的範圍＋重點物件，放進「左邊、上面 2/3」的安全區中間，
## 填滿約 85%（鏡頭方向不變，只調看的點和距離）。戶外每格都套；室內（已驗收的鏡頭）只有不安全時才套。
func _safe_cam(act: String) -> void:
	var vs := get_viewport().get_visible_rect().size
	var safe := Rect2(24.0, 24.0, vs.x - 24.0 - 224.0, vs.y * 0.64 - 24.0)
	if mode == "indoor":   # 室內：不自動移鏡頭（不知道牆在哪，會退到牆外）；用已驗收的鏡頭，HUD 結果照實記錄
		return
	var pts: Array = _key_pts(act).values()
	var bb := AABB(_bpos("hips"), Vector3.ZERO)
	var body := _pts_of(["hips", "spine", "neck", "head", "left", "right"])
	for i in range(0, body.size(), 7):
		bb = bb.expand(body[i])
		pts.append(body[i])   # 用真正的頂點（AABB 八個角投影出來比角色大很多 → 角色變很小）
	var pos := cam.global_position
	var fwd := -cam.global_transform.basis.z
	var d := pos.distance_to(bb.get_center())
	var at := pos + fwd * d
	for it in 8:
		cam.look_at_from_position(pos, at, Vector3.UP)
		var mn := Vector2(1e9, 1e9)
		var mx := -mn
		var behind := false
		for w: Vector3 in pts:
			if cam.is_position_behind(w):
				behind = true
				continue
			var sp := cam.unproject_position(w)
			mn = mn.min(sp)
			mx = mx.max(sp)
		if behind:
			d *= 1.4
			pos = at - fwd * d
			continue
		var span := mx - mn
		if OS.get_environment("CAMDBG") != "":
			print("CAMDBG %s it%d mn=%s mx=%s d=%.2f" % [act, it, mn, mx, d])
		var sc := clampf(maxf(span.x / (safe.size.x * 0.92), span.y / (safe.size.y * 0.92)), 0.5, 2.0)
		var wpp := 2.0 * d * tan(deg_to_rad(cam.fov) * 0.5) / vs.y
		var delta := (mn + mx) * 0.5 - safe.get_center()
		at += cam.global_transform.basis.x * delta.x * wpp - cam.global_transform.basis.y * delta.y * wpp
		d *= sc
		pos = at - fwd * d
	cam.look_at_from_position(pos, at, Vector3.UP)

## 整段揮棒（0 → 丟棒）每 1/30 秒量球棒穿進身體／頭的頂點數（不只 4 格）
func _bat_sweep() -> void:
	var worst := 0
	var wt := 0.0
	var hand_hi := -9.0
	var hand_lo := 9.0
	var td: float = am.bb["t_drop"]
	var t := 0.0
	while t < td:
		am.pose_at(am.bb["an"], t)
		var m := am.measure_baseball()
		for sd in ["left", "right"]:
			var hg := float(m.get("hand_%s_bat_gap_cm" % sd, 0.0))
			hand_hi = maxf(hand_hi, hg)
			hand_lo = minf(hand_lo, hg)
		if int(m.get("body_in_bat", 0)) + 10 * int(m.get("bat_in_head_pts", 0)) > worst:
			worst = int(m["body_in_bat"]) + 10 * int(m.get("bat_in_head_pts", 0))
			wt = t
		t += 1.0 / 30.0
	metrics["baseball_sweep"] = {"max_body_in_bat": worst, "at_t": wt, "hand_bat_max_cm": hand_hi, "hand_bat_min_cm": hand_lo, "corr": am.bb.get("corr_report", {})}
	bb_cycle = "whole swing: body-in-bat max %d, hand-bat %.1f..%.1f" % [worst, hand_lo, hand_hi]
	bb_cycle_ok = worst == 0 and hand_hi <= 2.0 and hand_lo >= -1.0
	print("MASCOT bat sweep: max body verts in bat %d at t=%.2f" % [worst, wt])
	am.restart_baseball()

var desk_cam := Vector3.INF
var bb_cycle := ""
var bb_cycle_ok := true
var _cur_k := -1
## 室內準備／結束（站著）用的鏡頭：在已驗收鏡頭的同一個位置（不會跑進牆裡）轉過去看頭、fov 放寬。
## 看電視：已驗收的吉祥物鏡頭看不到電視（電視在畫面外 x=3389 px）→ 和 Ken 的修法一樣，從角色右後方看，電視和角色都在畫面左／中。
func _wide_cam(act: String, ok: Transform3D) -> void:
	var hd := _bpos("head")
	if act == "tv":
		var tv: Vector3 = A("tv_screen").global_position
		var hip := _bpos("hips")
		var to_tv := Vector3(tv.x - hip.x, 0, tv.z - hip.z).normalized()
		var right := to_tv.cross(Vector3.UP).normalized()
		var pos := hip - to_tv * 1.25 + right * 0.55 + Vector3.UP * 0.75
		_look(pos, hip.lerp(tv, 0.45) + Vector3.UP * 0.05 + right * 0.25, 52)
		return
	# 上網／打電動的已驗收鏡頭貼在電腦旁、往後退會進牆 → 站著那兩格借用「讀英文」的鏡頭位置（同一張書桌）
	var pos := ok.origin
	if act == "english":
		desk_cam = ok.origin
	elif (act == "internet" or act == "games") and desk_cam != Vector3.INF:
		pos = desk_cam
	_look(pos, hd - Vector3.UP * 0.3, 58 if who == "shuiling" else 78)

## [mascot] v2 圳寶露營：屁股坐地（mascot_motion.sit_ground），火在腳前方，量屁股／靴底／膝蓋離地、身體到火
func _o_camping_sit() -> void:
	_set_base(am.ground_offset("idle"))
	var fire := am.build_camp()
	ap.stop()
	var names := ["prepare: sits down on the ground by the fire", "contact: bottom + boots on the ground", "mid: warms up, hands on knees", "end: still sitting, safe distance"]
	for k in 4:
		var r := am.sit_ground()
		am.music_sway(0.3 * k, 2.0)
		am.update_camp(k * 0.7)
		await get_tree().process_frame
		_look_at(Vector3(2.2, 1.2, 2.6), Vector3(-0.2, 0.35, 0.2), 45)
		var m := am.measure_ground_body(fire.position)
		m.merge(r)
		m.erase("knee_cm")   # 坐姿膝蓋朝上，不是接觸點
		await _shot("camping", k, names[k], m)

## 站在座位旁：身體有頂點在家具裡 → 先往後退（離開書桌／沙發方向）5 cm 一步，直到 0 個
func _stand_clear(anchor: String, side: float, fwd: float, turn: float) -> float:
	var back := 0.0
	while back <= 0.6:
		await _stand_at(anchor, side, fwd - back, turn)
		await get_tree().process_frame
		if int(_stand_metrics(anchor)["stand_in_furniture"]) == 0:
			break
		back += 0.05
	return back

## 室內鏡頭：在目標點（頭、手、課本／螢幕／電視…）四周找一個位置——不在牆或家具裡、看每個目標都沒被家具擋住、
## 而且全部目標都投影在 HUD 安全區（左邊、上面 2/3）。由「已驗收鏡頭那一側」開始找；找到回傳 true。
func _room_boxes() -> Array:
	var out := []
	for mi in home.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		if not m.is_visible_in_tree() or m.mesh == null:
			continue
		var bb := m.global_transform * m.get_aabb()
		if bb.end.y < 0.03 or bb.position.y > 2.2:   # 地板、地毯、天花板
			continue
		out.append(bb)
	return out

func _safe_indoor_cam(targets: Array, prefer: Vector3, dists: Array, fov := 50.0, see_face := false) -> bool:
	var hd0 := _bpos("head")
	# 臉朝向：頭頂方向 × 兩腿左右（和 _eye_points 同一個算法）；用眼睛那一點當臉的位置
	var upv := (_bpos("headtop_end") - hd0).normalized()
	var lv := (_bpos("leftupleg") - _bpos("rightupleg"))
	lv = (lv - upv * lv.dot(upv)).normalized()
	var face := lv.cross(upv).normalized()
	var vs := get_viewport().get_visible_rect().size
	var safe := Rect2(24.0, 24.0, vs.x - 24.0 - 224.0, vs.y * 0.64 - 24.0)
	var c := Vector3.ZERO
	for p: Vector3 in targets:
		c += p
	c /= maxf(targets.size(), 1)
	var pd := Vector3(prefer.x - c.x, 0, prefer.z - c.z).normalized()
	var boxes := _room_boxes()
	var azs := [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 120, -120, 150, -150, 180]
	for fv in [fov, fov + 15.0, fov + 25.0]:
		if _cam_search(targets, c, pd, dists, fv, see_face, hd0, face, boxes, azs, safe):
			return true
	_look(prefer, c, fov)
	print("SAFECAM indoor: no clear camera for ", targets.size(), " targets")
	return false

func _cam_search(targets: Array, c: Vector3, pd: Vector3, dists: Array, fov: float, see_face: bool, hd0: Vector3, face: Vector3, boxes: Array, azs: Array, safe: Rect2) -> bool:
	for d: float in dists:
		for el in [25, 40, 55, 12]:
			for az in azs:
				var dir := pd.rotated(Vector3.UP, deg_to_rad(az)) * cos(deg_to_rad(el)) + Vector3.UP * sin(deg_to_rad(el))
				var pos := c + dir * d
				if pos.y < 0.3 or pos.y > 2.3:
					continue
				if see_face and (pos - hd0).normalized().dot(face) < 0.05:   # 臉要看得到：鏡頭在臉前方
					continue
				var bad := false
				for bx: AABB in boxes:
					if bx.grow(0.06).has_point(pos):
						bad = true
						break
				if bad:
					continue
				for p: Vector3 in targets:
					for bx: AABB in boxes:
						if bx.grow(0.02).has_point(p):
							continue
						if _seg_box(pos, p + (pos - p).normalized() * 0.01, bx):
							bad = true
							break
					if bad:
						break
				if bad:
					continue
				_look(pos, c, fov)
				for p: Vector3 in targets:
					if cam.is_position_behind(p) or not safe.has_point(cam.unproject_position(p)):
						bad = true
						break
				if not bad:
					return true
	return false

## 靴底到「腳下面的東西」（地板、地毯、腳踏）的最小距離（負＝陷進去）
func _feet_gap() -> float:
	var lowf := 9.0
	var lq := Vector3.ZERO
	for q in _pts_of(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		var gq := q.y - _surface_below(q)
		if gq < lowf:
			lowf = gq
			lq = q
	if OS.get_environment("FEETDBG") != "":
		var nm := ""
		for mi: MeshInstance3D in meshes_home:
			var bx: AABB = mi.global_transform * mi.get_aabb()
			if lq.x >= bx.position.x - 0.003 and lq.x <= bx.end.x + 0.003 and lq.z >= bx.position.z - 0.003 and lq.z <= bx.end.z + 0.003 and bx.end.y <= lq.y + 0.035:
				nm += "%s(top %.3f) " % [mi.get_path(), bx.end.y]
		print("FEETDBG gap %.3f at %s under: %s ankleL %s" % [lowf, lq, nm, _bpos("leftfoot")])
	return lowf

## 腳踝往上 dy（世界公尺）：大腿、小腿兩節 IK，腳掌世界方向不變（靴底一樣平）
func _lift_foot_ik(sd: String, dy: float) -> void:
	var iu := Retarget._idx(sk, sd + "upleg")
	var il := Retarget._idx(sk, sd + "leg")
	var iff := Retarget._idx(sk, sd + "foot")
	var up := sk.get_bone_global_pose(iu)
	var lg := sk.get_bone_global_pose(il)
	var ft := sk.get_bone_global_pose(iff)
	var H := up.origin
	var K := lg.origin
	var Aa := ft.origin
	var At := sk.global_transform.affine_inverse() * (sk.global_transform * Aa + Vector3(0, dy, 0))
	var E := Pose._elbow(H, At, H.distance_to(K), K.distance_to(Aa), K - (H + Aa) * 0.5)
	var Bf := ft.basis.orthonormalized()
	var Bu2 := (Pose._arc(K - H, E - H) * up.basis.orthonormalized()).orthonormalized()
	var pu := sk.get_bone_parent(iu)
	var pb := sk.get_bone_global_pose(pu).basis.orthonormalized() if pu >= 0 else Basis.IDENTITY
	sk.set_bone_pose_rotation(iu, (pb.inverse() * Bu2).get_rotation_quaternion())
	var Bl := (Bu2 * Basis(sk.get_bone_pose_rotation(il))).orthonormalized()
	var cur := Bl * sk.get_bone_pose_position(iff)
	var Bl2 := (Pose._arc(cur, At - E) * Bl).orthonormalized()
	sk.set_bone_pose_rotation(il, (Bu2.inverse() * Bl2).get_rotation_quaternion())
	sk.set_bone_pose_rotation(iff, (Bl2.inverse() * Bf).get_rotation_quaternion())

## 頂點下面那個東西的頂面：家具方塊要「底在頂點下面」（桌面在腳趾上方不算）、頂面在頂點上方 3 cm 以內（陷進去的也算）；沒有＝地板 0
func _surface_below(q: Vector3) -> float:
	var top := 0.0
	for mi: MeshInstance3D in meshes_home:
		if not mi.is_visible_in_tree():
			continue
		var bx: AABB = mi.global_transform * mi.get_aabb()
		if q.x >= bx.position.x and q.x <= bx.end.x and q.z >= bx.position.z and q.z <= bx.end.z:
			if bx.position.y < q.y and bx.end.y <= q.y + 0.03 and bx.end.y > top:
				top = bx.end.y
	return top
