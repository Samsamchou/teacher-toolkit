extends "res://scripts/mascot_home_check.gd"
## 動作合邏輯檢查（2026-11-10，RDQ-spec-freetime-motion-logic-fix-20261110）：
## 三個角色 × 11 個活動，每個活動拍 4 個關鍵畫面（prepare／contact／mid／end），並量網格接觸點。
## 執行：WHO=ken|shuiling|zunbo  MODE=outdoor|indoor|move  [ONLY=bike]
##   Godot --path . --resolution 960x720 res://scenes/motion_check.tscn
## 輸出：test_motion/<who>/<act>_<k>.png ＋ test_motion/<who>/metrics_<mode>.json（tools/motion_sheet.py 排成檢查圖）
## 戶外活動用和遊戲同一份 scripts/act_motion.gd（道具跟著接觸事件走）。

const ActMotion := preload("res://scripts/act_motion.gd")
const MODELS := {"ken": ["ken_openhand", 1.3], "shuiling": ["shuiling_softhand", 1.2], "zunbo": ["zunbo_openhand", 1.15]}
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
	who = OS.get_environment("WHO") if OS.get_environment("WHO") != "" else "ken"
	mode = OS.get_environment("MODE") if OS.get_environment("MODE") != "" else "outdoor"
	wobj = World.new()
	wobj._materials()
	out_dir = "res://test_motion/%s" % who
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_dir))
	cam = Camera3D.new()
	cam.fov = 45
	cam.near = 0.02
	add_child(cam)
	if mode == "indoor":
		await _indoor()
	elif mode == "calib":
		await _calib()
	elif mode == "ratecal":
		await _ratecal()
	elif mode == "move":
		await _move()
	else:
		await _outdoor()
	var mp := "%s/metrics_%s.json" % [out_dir, mode]
	if OS.get_environment("ONLY") != "" and FileAccess.file_exists(mp):   # 只重拍一項：其他項的數字保留
		var old = JSON.parse_string(FileAccess.get_file_as_string(mp))
		if old is Dictionary:
			old.merge(metrics, true)
			metrics = old
	var f := FileAccess.open(mp, FileAccess.WRITE)
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
	print("ANIMS ", ap.get_animation_list())
	am = ActMotion.new()
	am.setup(sk, ken, frame, propn, ap, wobj.outline_shader, func(_p: Vector2) -> float: return 0.0)
	if who == "ken" and FileAccess.file_exists("res://data/interior/anim_rate.json"):
		rate_fix = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/anim_rate.json"))

func _look_at(pos: Vector3, at: Vector3, fov := 40.0) -> void:
	cam.fov = fov
	cam.look_at_from_position(pos, at, Vector3.UP)

func _shot(act: String, k: int, label: String, m: Dictionary) -> void:
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
		if only != "" and not (act in only.split(",")):
			continue
		print("── ", act)
		await call("_o_" + act)
		await _clear_out()

func _o_bike() -> void:
	_set_base(0.0)
	am.set_bike(true)
	var C: Vector3 = am.B["C"]
	var names := ["prepare: right pedal top", "contact: right pedal front (push)", "mid: right pedal bottom", "end: right pedal back"]
	for k in 4:
		am.crank_th = k * PI / 2.0
		am.update_bike(0.0, 0.0)
		await get_tree().process_frame
		_look_at(Vector3(2.3, 0.75, C.z + 0.1), Vector3(0, 0.55, C.z + 0.1), 38)
		var m := am.measure_bike(true)
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
	am.start_baseball(xf)
	var tc: float = am.bb["t_c"]
	var L: float = am.bb["len"]
	var wants := [tc - 0.25, tc, tc + 0.22, -1.0]
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
				_look_at(Vector3(1.15, 1.05, 2.0), Vector3(-0.25, 0.85, 0.35), 46)
			else:
				_look_at(Vector3(1.8, 1.6, 3.6), (bp + Vector3(0, 0.6, 0)).lerp(Vector3(0, 0.4, 0), 0.5), 50)
			var m := am.measure_baseball()
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
	await _gait("jogging", "ft/jogging", 2.0)

const GROUND_CLAMP := true   # 腳跟著地不陷地（v3）
var rate_fix := {}   # 動作播放倍率的微調（data/interior/anim_rate.json，MODE=ratecal 量的：踩穩的腳滑最少）
func _gait(act: String, an: String, v: float, mul := -1.0, dry := false) -> float:
	if mul < 0.0:
		mul = float(rate_fix.get(an, 1.0))
	var ss := am.stride_speed(an) / mul
	var off := am.ground_offset(an, true)
	_set_base(off)
	print("GAIT %s stride speed %.3f m/s → 播放倍率 %.2f（前進 %.2f m/s）貼地 %.1f cm" % [an, ss, v / ss, v, off * 100.0])
	ap.play(an, 0.0)
	ap.seek(0.0, true)
	ap.advance(0.0)
	ken.transform = am.model_base
	var dt := 1.0 / 60.0
	var L := ap.get_animation(an).length
	var steps := int(L / (v / ss) / dt) + 2
	var frames := []   # 每格：[左腳頂點, 右腳頂點]
	am.gait_setup()
	var gfix := OS.get_environment("NOGAITFIX") == ""
	for i in steps:
		ken.position.z += v * dt
		ap.advance(dt * v / ss)
		if gfix:
			am.gait_fix(dt, 0.0, 0.012, 0.35, false, GROUND_CLAMP)
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
	if dry:
		return drift_max
	var summary := {"stride_speed_mps": ss * mul, "rate_fix": mul, "play_rate": v / ss, "ground_speed_mps": v, "ground_offset_cm": off * 100.0,
		"planted_slide_cm": drift_max * 100.0, "moving_foot_lowest_cm": skim * 100.0, "lowest_foot_cm": sink * 100.0}
	print("GAIT ", act, " ", summary)
	var on := func(i: int, s2: int) -> bool: return float(lows[i][s2][0]) < 0.006
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
			ap.advance(dt * v / ss)
			if gfix:
				am.gait_fix(dt, 0.0, 0.012, 0.35, false, GROUND_CLAMP)
		await get_tree().process_frame
		var z := ken.position.z
		_look_at(Vector3(2.4, 0.8, z + 0.2), Vector3(0, 0.55, z + 0.2), 38)
		var m := summary.duplicate()
		m["left_foot_cm"] = float(lows[picks[k]][0][0]) * 100.0
		m["right_foot_cm"] = float(lows[picks[k]][1][0]) * 100.0
		await _shot(act, k, names[k], m)

	return drift_max

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
		var hg := headphone_gap((props[-1] as Node).get_child(0))   # 頭帶＋耳罩到頭（含頭髮）
		m["headphone_gap_cm"] = float(hg["gap"]) * 100.0
		m["headphone_in_hair"] = hg["inside"]
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
		if only != "" and not (act in only.split(",")):
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
		var low := 9.0
		var inside := 0
		for q in _pts_of(["hips", "leftupleg", "rightupleg"]):
			if Vector2(q.x - an.x, q.z - an.z).length() < 0.16:
				low = minf(low, q.y - an.y)
				if q.y < an.y - 0.01:
					inside += 1
		m["seat_gap_cm"] = low * 100.0
		m["body_in_furniture"] = inside
	var lowf := 9.0
	for q in _pts_of(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		lowf = minf(lowf, q.y)
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
	# 準備：站在座位旁（書桌＝椅子旁邊；沙發＝前面；直笛＝譜架前、手放下）
	var side := 0.42 if anchor.begins_with("desk") else 0.0
	var fwd := 0.05 if anchor.begins_with("desk") else (0.0 if act == "recorder" else 0.5)
	await _stand_at(anchor, side, fwd)
	await get_tree().process_frame
	var hd := _bpos("head")
	var at: Transform3D = A(anchor).global_transform
	var F: Vector3 = -at.basis.z.normalized()
	var X := Vector3.UP.cross(F).normalized()
	_look_at(hd + (F * 1.6 + X * 0.9 if not anchor.begins_with("desk") else -F * 1.7 + X * 0.7) + Vector3.UP * 0.15, hd - Vector3.UP * 0.35, 50)   # 書桌靠牆：從背後看
	var m0 := _stand_metrics(anchor)
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
	var m1 := _sit_metrics(act, anchor)
	await _shot(act, 1, "contact: sits / holds (approved pose)", m1)
	# 近看：手和東西
	if not extra_views.is_empty():
		var v: Array = extra_views[0]
		_look(v[1], v[2], v[3])
	await _shot(act, 2, "mid: close-up of hands on the object", m1.duplicate())
	# 結束：站起來、轉身（離開座位，不穿過家具）
	_clear_props()
	await _stand_at(anchor, side, fwd - (0.4 if act == "recorder" else 0.0), PI * 0.6)   # 直笛：先從譜架退一步再轉身
	await get_tree().process_frame
	hd = _bpos("head")
	_look_at(hd + (F * 1.6 + X * 0.9 if not anchor.begins_with("desk") else -F * 1.7 + X * 0.7) + Vector3.UP * 0.15, hd - Vector3.UP * 0.35, 50)   # 書桌靠牆：從背後看
	await _shot(act, 3, "end: stands up and turns to leave", _stand_metrics(anchor))

# ───────── 移動（走路）：之後補 ─────────
func _ratecal() -> void:
	await _outdoor_scene()
	var out := {}
	for it in [["walk", 1.4], ["ft/jogging", 2.0]]:
		var best := [9.0, 1.0]
		var f := 0.84
		while f <= 1.161:
			var d := await _gait("cal", it[0], it[1], f, true)
			print("RATECAL %s x%.3f planted slide %.2f cm" % [it[0], f, d * 100.0])
			if d < best[0]:
				best = [d, f]
			f += 0.02
		out[it[0]] = best[1]
		print("RATECAL BEST %s x%.3f → %.2f cm" % [it[0], best[1], best[0] * 100.0])
	var fl := FileAccess.open("res://data/interior/anim_rate.json", FileAccess.WRITE)
	fl.store_string(JSON.stringify(out, " "))
	fl.close()
	metrics["rate_fix"] = out

func _move() -> void:
	await _outdoor_scene()
	await _gait("walk", "walk", 1.4)   # 遊戲的走路速度（game.gd TRAVEL_SPEED）
	await _clear_out()
	await _gait("jogging", "ft/jogging", 2.0)
