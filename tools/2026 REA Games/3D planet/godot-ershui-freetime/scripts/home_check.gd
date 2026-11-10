extends Node3D
## Ken 的家：室內＋六個室內休閒動作截圖，存 test_home/*.png
## 執行：Godot --path . res://scenes/home_check.tscn   （ONLY=watch_tv 只拍一張）
## 會印出量到的坐姿高度（屁股最低點、膝蓋、手的位置）和家具高度對照。

const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")
const Home := preload("res://scripts/home_interior.gd")
const Pose := preload("res://scripts/procedural_pose.gd")

var ken: Node3D
var sk: Skeleton3D
var home: Node3D
var hb: Home
var cam: Camera3D
var props: Array[Node] = []
var extra_views := []
const INDOOR_OUTLINE := 0.15   # 室內近距離鏡頭的描邊（戶外遠景維持 0.3）
const MODEL := "ken_openhand"   # 右手張開版（tools/make_ken_openhand.py 做的；原模型 ken_rigged 右手是拳頭）

func _ready() -> void:
	var w := World.new()
	w._materials()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.93, 0.96, 0.99)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1.0, 0.95, 0.88)
	e.ambient_light_energy = 0.75
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()   # 柔和主光，不投影
	add_child(sun)
	sun.look_at_from_position(Vector3(1, 6, 7), Vector3(0.5, 0, 1.5), Vector3.UP)
	sun.light_energy = 0.55
	sun.light_color = Color(1.0, 0.97, 0.92)
	for p in [Vector3(2.5, 2.0, 2.0), Vector3(-1.75, 2.0, 1.5)]:   # 天花板燈（客廳、書房）
		var o := OmniLight3D.new()
		o.position = p
		o.omni_range = 5.5
		o.omni_attenuation = 0.6
		o.light_energy = 0.9
		o.light_color = Color(1.0, 0.9, 0.75)
		add_child(o)
	hb = Home.new()
	home = hb.build_ken_home()
	add_child(home)
	ken = w.fit_model(MODEL, 1.3, true, INDOOR_OUTLINE)   # 室內近景描邊更細（老師 11/10：0.3 太粗）
	add_child(ken)
	var ap: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	if ap:
		ap.stop()
		ap.active = false
	sk = Retarget.find_type(ken, "Skeleton3D")
	if Pose.right_is_fist(sk) and OS.get_environment("KEEP_GADGET") == "":   # 舊模型右手握著黃色小道具；新模型已經沒有
		print("GADGET 藏起頂點數 ", Pose.hide_hand_gadget(ken))
	if OS.get_environment("THICK_HANDS") == "":   # 手的描邊變細（約 3 mm），才不會蓋住手上的東西
		print("手描邊變細，頂點數 ", Pose.thin_hand_outline(ken, 0.25))
	cam = Camera3D.new()
	cam.fov = 45
	add_child(cam)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://test_home"))
	await get_tree().process_frame
	_print_furniture()
	if OS.get_environment("SWEEP") != "":
		_sweep(OS.get_environment("SWEEP"))
		get_tree().quit()
		return
	if OS.get_environment("HANDZOOM") != "":
		await _handzoom()
		get_tree().quit()
		return
	if OS.get_environment("HANDVIEW") != "":
		await _handview()
		get_tree().quit()
		return
	if OS.get_environment("HANDTRIS") != "":
		_handtris()
		get_tree().quit()
		return
	if OS.get_environment("HANDINFO") != "":
		_handinfo()
		get_tree().quit()
		return
	if OS.get_environment("DIAG") != "":
		_diag()
		get_tree().quit()
		return
	var only := OS.get_environment("ONLY")
	for shot in ["overview", "watch_tv", "listen_music", "study_english", "surf_internet", "recorder"]:
		if only != "" and shot != only:
			continue
		extra_views.clear()
		await call("_shot_" + shot)
		await _save(shot)
		for v in extra_views:   # 手部特寫：[檔名尾, 鏡頭位置, 看哪裡, fov]
			_look(v[1], v[2], v[3])
			await _save(shot + "_" + v[0])
		_clear_props()
	get_tree().quit()

func A(nm: String) -> Node3D:
	return home.get_node(nm)

func _print_furniture() -> void:
	print("FURNITURE sofa_seat_top=%.3f chair_seat_top=%.3f desk_top=%.3f desk_underside=%.3f" % [Home.SOFA_SEAT_TOP, Home.CHAIR_SEAT_TOP, Home.DESK_TOP, Home.DESK_TOP - 0.03])

# ───────── 共用 ─────────
func _bind(anim: String) -> Retarget:
	ken.global_transform = Transform3D.IDENTITY
	sk.reset_bone_poses()
	var rt := Retarget.new()
	rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_%s.fbx" % anim), self)
	rt.bind(sk)
	return rt

## 坐下：套動作 → 量屁股最低點與臀部前後位置 → 讓臀部落在錨點（坐墊面）上
## fix(rt, to_ken)：擺到位置之前的修正（頭、手）；to_ken 把世界座標換成 Ken 自己的座標
## legs_from：腿改用另一個動作的姿勢（例如看電視用 sitting_idle 的腿，兩腳都踩地）
func _sit(anim: String, anchor: String, sink := 0.008, fix := Callable(), legs_from := "") -> Dictionary:
	var legs := {}
	if legs_from != "":
		var rl := _bind(legs_from)
		rl.apply_at(rl.length() * float(Home.SIT[legs_from]["t"]))
		for i in sk.get_bone_count():
			var nm := Retarget.norm(sk.get_bone_name(i))
			if nm.contains("upleg") or nm.ends_with("leg") or nm.contains("foot") or nm.contains("toe"):
				legs[i] = sk.get_bone_pose_rotation(i)
		rl.src_root.queue_free()
	var rt := _bind(anim)
	var t: float = Home.SIT[anim]["t"]
	rt.apply_at(rt.length() * t)
	for i in legs:
		sk.set_bone_pose_rotation(i, legs[i])
	var m := measure()
	print("MEASURE %s@%.2f %s" % [anim, t, m])
	var anc := A(anchor)
	var M := anc.global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3(m["hips_x"], -m["seat"] - sink, m["hips_z"]))
	if fix.is_valid():
		fix.call(rt, M.affine_inverse())
	# 腳底穿進地板 → 小腿往前伸一點（屁股不動）
	var floor_gap: float = anc.global_position.y - m["seat"] - sink + m["minY"]
	for it in 3:
		if floor_gap >= 0.0:
			break
		Pose.lift_feet(sk, 0.006 - floor_gap)
		var m2 := measure()
		var g2: float = anc.global_position.y - m["seat"] - sink + m2["minY"]
		print("  腳底修正：%.3f → %.3f" % [floor_gap, g2])
		floor_gap = g2
	ken.global_transform = M
	rt.src_root.queue_free()
	await get_tree().process_frame
	print("  -> Ken 原點 y=%.3f，腳底最低點 y=%.3f（0＝剛好踩地）" % [ken.global_position.y, floor_gap])
	return m

func _look(pos: Vector3, at: Vector3, fov := 45.0) -> void:
	cam.fov = fov
	cam.look_at_from_position(pos, at, Vector3.UP)

func _bone_global(bn: String) -> Transform3D:
	return sk.global_transform * sk.get_bone_global_pose(Retarget._idx(sk, bn))

func _bpos(bn: String) -> Vector3:
	return _bone_global(bn).origin

## 把 node 以世界 Transform want 掛到骨頭上（BoneAttachment3D）
func _attach(bn: String, node: Node3D, want: Transform3D) -> void:
	var ba := BoneAttachment3D.new()
	ba.bone_name = sk.get_bone_name(Retarget._idx(sk, bn))
	sk.add_child(ba)
	ba.add_child(node)
	node.transform = _bone_global(bn).affine_inverse() * want
	props.append(ba)

func _clear_props() -> void:
	for p in props:
		p.queue_free()
	props.clear()
	for n in ["headphones/HeadphonesProp", "book/Pencil", "Study/RecorderProp"]:
		(home.get_node(n) as Node3D).visible = true

# ───────── 六張圖 ─────────
func _shot_overview() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	# 站在門前 0.35 公尺（不要貼著門板）
	ken.global_transform = A("door").global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3(0, 0, -0.35))
	_look(Vector3(0.75, 5.3, 7.1), Vector3(0.75, 0.25, 1.85), 47)

func _shot_watch_tv() -> void:
	# 上半身用 sitting_laughing（笑），腿用 sitting_idle（兩腳踩地）；臉轉向電視
	await _sit("sitting_laughing", "sofa_seat", 0.008, func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * A("tv_screen").global_position, 0.45, 60.0)
		_hands_on_thighs(rt), "sitting_idle")
	_look(WATCH_CAM, WATCH_AT, 58)
	var hc := (_bpos("lefthand") + _bpos("righthand")) * 0.5
	extra_views.append(["hands", hc + Vector3(0.45, 0.3, 0.3), hc, 30])
	extra_views.append(["hands_b", hc + Vector3(0.45, 0.25, -0.3), hc, 30])

func _shot_listen_music() -> void:
	# 臉稍微抬起、轉向鏡頭那邊（開心聽音樂）
	var campos := Vector3(3.35, 1.15, 3.35)
	await _sit("sitting_idle", "sofa_seat", 0.008, func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * campos.lerp(A("tv_screen").global_position, 0.5), 0.4, 35.0, 4.0)
		_hands_on_thighs(rt))
	(home.get_node("headphones/HeadphonesProp") as Node3D).visible = false
	_put_headphones()
	_look(campos, Vector3(2.0, 0.55, 1.95), 42)
	var hc := (_bpos("lefthand") + _bpos("righthand")) * 0.5
	extra_views.append(["hands", hc + Vector3(0.45, 0.3, 0.3), hc, 30])
	extra_views.append(["hands_b", hc + Vector3(0.45, 0.25, -0.3), hc, 30])

func _shot_study_english() -> void:
	A("Study/DeskChair").position.z = A("desk_seat_book").position.z
	var book := A("book").global_position
	var page_y: float = Home.BOOK_TOP
	var rep := {}
	# 寫字動作頭低到碰書 → 抬頭；兩隻手重新擺：左手平放在左頁上、右手三指握鉛筆（筆尖碰紙、手的小指側輕靠紙面；都用量的）
	await _sit("writing", "desk_seat_book", 0.008, func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * (book + Vector3(0.05, STUDY_LOOK_UP, 0)), 0.45, 60.0)
		var kb := to_ken.basis   # 世界方向 → Ken 座標
		var top_k: float = (to_ken * Vector3(book.x, page_y, book.z)).y
		var lc := to_ken * (book + STUDY_LEFT_HAND)
		rep["left"] = Pose.rest_hand_flat(sk, rt.corr, "left", lc, top_k, kb * Vector3(-1, 0, -0.22), Vector3(1.0, 0.25, -0.4), 0.004)
		var tip := to_ken * (book + STUDY_PEN_TIP)
		tip.y = top_k
		rep["right"] = Pose.hold_pencil_open(sk, rt.corr, "right", tip, STUDY_PEN_DIR, Vector3(-0.9, -0.5, -0.3), Vector3(-0.6, -0.15, -0.6), 0.002))
	_pencil_in_hand(ken.global_transform * (rep["right"]["xf"] as Transform3D))
	_look(STUDY_CAM, STUDY_AT, STUDY_FOV)
	# ── 量測報告 ──
	print("  課本紙面 y=%.4f（桌面 %.3f）" % [page_y, Home.DESK_TOP])
	_print_gap("左手離紙面", "left", rep["left"])
	var rr: Dictionary = rep["right"]
	print("  右手（三指握筆）最低點離紙面 %.1f mm；握點離筆尖 %.0f mm；手到筆桿軸心最近 %.1f mm（鉛筆半徑 %.1f）；手腕彎 %.0f°、IK 誤差 %.1f mm；食指/中指彎 %s" % [rr["low"] * 1000.0, rr["grip"] * 1000.0, rr["clear"] * 1000.0, Pose.PENCIL_R * 1000.0, rr["bend"], rr["wrist_err"] * 1000.0, rr["curl"]])
	var ca: Dictionary = rr["clear_all"]
	var cks := ca.keys()
	cks.sort()
	var cline := "  右手各部位到筆桿軸心 mm（要 ≥ %.1f）：" % (Pose.PENCIL_R * 1000.0)
	for k in cks:
		cline += " %s=%.1f" % [(k as String).replace("righthand", "").replace("right", ""), ca[k] * 1000.0]
	print(cline)
	# 世界座標再驗一次：兩手（含前臂）頂點對課本、桌面
	for sd in ["left", "right"]:
		var low := Pose.hand_low(sk, sd, true)
		print("  [世界] %s 手最低點 y=%.4f → 離紙面 %.1f mm" % [sd, low["_min"], (low["_min"] - page_y) * 1000.0])
	_report_box("課本", AABB(Vector3(book.x - 0.115, Home.DESK_TOP, book.z - 0.155), Vector3(0.23, 0.0215, 0.31)))
	_report_box("桌板", AABB(Vector3(-3.5, Home.DESK_TOP - 0.03, 0.45), Vector3(0.55, 0.03, 1.5)))
	var hc := (_bpos("lefthand") + _bpos("righthand")) * 0.5
	extra_views.append(["hands", hc + Vector3(-0.3, 0.3, 0.42), hc + Vector3(-0.05, -0.02, 0), 30])
	extra_views.append(["hands_low", hc + Vector3(-0.42, 0.06, 0.3), hc + Vector3(-0.05, -0.02, 0), 30])
	extra_views.append(["hands_top", hc + Vector3(-0.1, 0.6, 0.02), hc + Vector3(-0.08, 0, 0), 30])
	extra_views.append(["hands_right", hc + Vector3(-0.3, 0.12, -0.45), hc + Vector3(-0.05, -0.02, 0), 30])
	# 右手握筆特寫（Ken 面向 -X、左手邊是 +Z）：左前上、正前低、右邊、正上方
	var rc := _bpos("righthandindex1")
	extra_views.append(["rh_a", rc + Vector3(-0.22, 0.2, 0.22), rc, 26])
	extra_views.append(["rh_b", rc + Vector3(-0.36, 0.06, 0.02), rc, 26])
	extra_views.append(["rh_c", rc + Vector3(-0.08, 0.1, -0.36), rc, 26])
	extra_views.append(["rh_d", rc + Vector3(-0.02, 0.4, 0.0), rc, 26])

const STUDY_LEFT_HAND := Vector3(0.0, 0, 0.078)    # 左手掌中心（相對課本中心；+Z＝Ken 的左邊）
const STUDY_PEN_TIP := Vector3(0.0, 0, -0.07)      # 筆尖（相對課本中心；右頁）
const STUDY_PEN_DIR := Vector3(-0.42, 0.8, -0.3)   # 筆桿方向（Ken 座標：筆尖 → 橡皮擦；往右後方斜）

## 印 rest_hand_on 的量測：各部位離表面幾 mm
func _print_gap(title: String, side: String, rep: Dictionary) -> void:
	var line := "  %s mm：" % title
	var ks := rep.keys()
	ks.sort()
	for k in ks:
		if k == "wrist_err" or k == "pitch_deg" or k == "curl":
			continue
		line += " %s=%.1f" % [(k as String).replace(side + "hand", "").replace(side, ""), rep[k] * 1000.0]
	print(line, "；手腕 IK 誤差 %.1f mm、前傾 %.1f°" % [rep["wrist_err"] * 1000.0, rep["pitch_deg"]])

## 兩手放在大腿上（坐沙發）：兩手張開、放鬆貼著大腿；高度用大腿網格的高度圖量
## 在 _sit 的 fix 裡呼叫（Ken 在原點、面向 +Z）。along＝手掌中心在「髖 → 膝」的幾成
func _hands_on_thighs(rt: Retarget, along := 0.78) -> void:
	var top := Pose.height_map(sk, ["leftupleg", "rightupleg", "leftleg", "rightleg"])   # 只放腿（身體是直的，放進高度圖會把手頂到胸口）
	for sd in ["left", "right"]:
		var sgn := 1.0 if sd == "left" else -1.0
		var hip := _bpos(sd + "upleg")
		var knee := _bpos(sd + "leg")
		var c := hip.lerp(knee, along) + Vector3(sgn * 0.005, 0, 0)
		var dir := (knee - hip).normalized() + Vector3(-sgn * 0.08, 0, 0)   # 手指朝膝蓋、稍微往內
		var rep := Pose.rest_hand_on(sk, rt.corr, sd, c, top, dir, Vector3(sgn * 1.0, -0.15, -0.8), 0.004, 0.001)   # 手肘往外往後；袖口可以輕靠大腿
		_print_gap("%s 手離大腿" % sd, sd, rep)

## 量：Ken 全身頂點有沒有跑進方塊裡（穿模）；印出個數與最深幾 mm
func _report_box(nm: String, bx: AABB) -> void:
	var cnt := 0
	var deep := 0.0
	for p in skinned_points(1):
		if bx.has_point(p):
			cnt += 1
			deep = maxf(deep, bx.position.y + bx.size.y - p.y)
	print("  [穿模檢查] %s：%d 個頂點在裡面，最深 %.1f mm" % [nm, cnt, deep * 1000.0])

const STUDY_LOOK_UP := 0.3
const STUDY_CAM := Vector3(-3.55, 1.12, 2.22)   # 從書桌左前上方看：臉、兩隻手、課本都看得到（11/10 拉遠一點：課本不能被下方題目面板蓋住）
const STUDY_FOV := 50.0
const STUDY_AT := Vector3(-2.93, 0.53, 1.56)
const WATCH_CAM := Vector3(0.85, 1.12, 3.0)   # 從 Ken 右後方看：Ken 在左、電視在中間（右邊有按鈕、下面有題目面板，不能放東西）
const WATCH_AT := Vector3(3.4, 0.5, 1.85)
const SURF_CAM := Vector3(-2.95, 1.3, 0.12)
const SURF_AT := Vector3(-3.0, 0.72, 0.95)

const KEYBOARD_BOX := AABB(Vector3(-3.5 + 0.29, 0.53, 0.88 - 0.18), Vector3(0.14, 0.023, 0.36))   # 鍵盤（含按鍵，頂 y=0.553）
var surf_rep := {}

func _shot_surf_internet() -> void:
	A("Study/DeskChair").position.z = A("desk_seat").position.z
	# 打字動作的頭在看手 → 抬頭看螢幕
	await _sit("typing", "desk_seat", 0.008, func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * A("computer_screen").global_position, 0.35, 45.0)
		# 兩手重新擺在鍵盤上（原動作的手沉進鍵盤和桌子 2～3 公分）：高度＝鍵盤按鍵頂，鍵盤外面＝桌面
		var M := to_ken.affine_inverse()
		var top := func(p: Vector3) -> float:
			var w := M * p
			if KEYBOARD_BOX.has_point(Vector3(w.x, KEYBOARD_BOX.position.y + 0.001, w.z)):
				return (to_ken * Vector3(w.x, KEYBOARD_BOX.end.y, w.z)).y
			if w.x < -2.95:
				return (to_ken * Vector3(w.x, Home.DESK_TOP, w.z)).y
			return -1e9
		var kc := KEYBOARD_BOX.get_center()
		var kb := to_ken.basis
		surf_rep["left"] = Pose.rest_hand_on(sk, rt.corr, "left", to_ken * (kc + Vector3(0.0, 0, 0.085)), top, kb * Vector3(-1, 0, -0.15), Vector3(1.0, -0.2, -0.5), 0.004, 0.008)
		surf_rep["right"] = Pose.rest_hand_on(sk, rt.corr, "right", to_ken * (kc + Vector3(0.0, 0, -0.085)), top, kb * Vector3(-1, 0, 0.15), Vector3(-1.0, -0.2, -0.5), 0.004, 0.008))
	_print_gap("左手離鍵盤／桌面", "left", surf_rep["left"])
	_print_gap("右手離鍵盤／桌面", "right", surf_rep["right"])
	_look(SURF_CAM, SURF_AT, 58)   # 從書桌靠後牆那側看，看得到臉和螢幕
	print("  手／鍵盤：右手 y=%.3f 左手 y=%.3f；鍵盤面 y=%.3f" % [_bpos("righthandmiddle1").y, _bpos("lefthandmiddle1").y, Home.DESK_TOP + 0.02])
	for sd in ["left", "right"]:
		var low := Pose.hand_low(sk, sd, true)
		print("  [世界] %s 手最低點 y=%.4f（鍵盤按鍵頂 %.4f、桌面 %.3f）" % [sd, low["_min"], Home.DESK_TOP + 0.023, Home.DESK_TOP])
	_report_box("鍵盤", KEYBOARD_BOX)
	_report_box("桌板", AABB(Vector3(-3.5, Home.DESK_TOP - 0.03, 0.45), Vector3(0.55, 0.03, 1.5)))
	var hc := (_bpos("lefthand") + _bpos("righthand")) * 0.5
	extra_views.append(["hands", hc + Vector3(-0.25, 0.3, -0.4), hc + Vector3(-0.05, -0.02, 0), 30])
	extra_views.append(["hands_low", hc + Vector3(-0.1, 0.05, -0.5), hc + Vector3(-0.05, 0, 0), 30])

func _shot_recorder() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	_face_profile()   # 手放下時量臉（量嘴巴位置用）
	var rtf := Pose.pose_recorder(sk, rt.corr)
	rt.src_root.queue_free()
	(home.get_node("Study/RecorderProp") as Node3D).visible = false
	var rec := Home.make_recorder(Pose.RECORDER_LEN)
	_attach("righthand", rec, rtf)
	# 擺好後再移到譜架前（骨頭姿勢是本地的，搬動整個 Ken 不影響）
	var spot := A("recorder_spot")
	ken.global_transform = spot.global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3.ZERO)
	await get_tree().process_frame
	# 站著吹：腳底貼地板（11/10 量到原本陷進地板 1.7 cm）
	var lowf := 9.0
	for it in Pose._hp_skinned(sk, "", ["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		for q: Vector3 in (it[1] as PackedVector3Array):
			lowf = minf(lowf, q.y)
	ken.global_position.y -= lowf
	print("  直笛站姿腳底修正 %.1f mm" % (-lowf * 1000.0))
	await get_tree().process_frame
	print("  直笛：嘴（推估）＝頭骨＋", Pose.MOUTH_OFS, "；左手腕 ", _bpos("lefthand"), " 右手腕 ", _bpos("righthand"))
	var rp: Dictionary = Pose.last_report
	print("  直笛半徑 %.1f mm、長 %.0f mm" % [Pose.RECORDER_R * 1000.0, Pose.RECORDER_LEN * 1000.0])
	print("  右手：", rp["right"])
	print("  左手：", rp["left"])
	for sd in ["left", "right"]:
		var c: Dictionary = rp[sd + "_clear"]
		var ks := c.keys()
		ks.sort()
		var line := "  %s 手各部位到笛身軸心的最近距離 mm（要 ≥ 半徑 %.1f）：" % [sd, Pose.RECORDER_R * 1000.0]
		for k in ks:
			line += " %s=%.1f" % [(k as String).replace(sd + "hand", "").replace(sd, ""), c[k] * 1000.0]
		print(line)
	# 用真正的半徑剖面再量一次（接環、喇叭口比較粗）：手的頂點到笛身表面的最小距離
	var gt: Transform3D = ken.global_transform
	var t0: Vector3 = gt * (rp["top"] as Vector3)
	var t1: Vector3 = gt * (rp["bot"] as Vector3)
	var axd := (t1 - t0).normalized()
	for sd in ["left", "right"]:
		var hp := Pose.hand_points(sk, sd, true, true)
		var worst := 9.0
		var smin := 9.0
		var smax := -9.0
		for k in hp:
			for q: Vector3 in hp[k]:
				var sa := (q - t0).dot(axd)
				var d := (q - t0 - axd * sa).length()
				var rr := Home.recorder_radius(sa, Pose.RECORDER_LEN, Pose.RECORDER_R)
				if rr > 0.0:
					worst = minf(worst, d - rr)
				if d < 0.03 and not (k as String).ends_with("forearm"):
					smin = minf(smin, sa)
					smax = maxf(smax, sa)
		print("  [世界] %s 手到笛身表面最小間隙 %.1f mm；手貼著笛身的範圍：離吹口 %.0f～%.0f mm" % [sd, worst * 1000.0, smin * 1000.0, smax * 1000.0])
	_look(Vector3(-1.88, 1.2, 3.7), Vector3(-1.84, 0.9, 2.6), 42)   # 近一點：看得到直笛、兩隻手、臉和譜架
	# 手部特寫：左前、右前、正前上方
	var kb := ken.global_transform.basis
	var kf := kb.z.normalized()
	var kl := kb.x.normalized()
	var mid: Vector3 = ken.global_transform * (((rp["top"] as Vector3) + (rp["bot"] as Vector3)) * 0.5)
	extra_views.append(["hands", mid + kf * 0.42 + kl * 0.36 + Vector3.UP * 0.2, mid + Vector3.UP * 0.03, 30])
	extra_views.append(["hands_r", mid + kf * 0.42 - kl * 0.36 + Vector3.UP * 0.2, mid + Vector3.UP * 0.03, 30])
	extra_views.append(["hands_top", mid + kf * 0.3 + Vector3.UP * 0.5, mid, 30])
	extra_views.append(["hands_side", mid + kl * 0.6 + Vector3.UP * 0.05, mid, 30])

## 印臉的側面輪廓（頭骨座標：每 2 cm 高度，正中線最前面的點）→ 找嘴巴位置
func _face_profile() -> void:
	var head := _bpos("head")
	var P := skinned_points()
	var prof := {}
	for p in P:
		var d := p - head
		if absf(p.x - head.x) < 0.025 and d.y > -0.12 and d.y < 0.12:
			var k := int(floor(d.y / 0.02))
			prof[k] = maxf(prof.get(k, -9.0), d.z)
	var ks := prof.keys()
	ks.sort()
	var s := "FACE 頭骨相對（y: 最前 z）"
	for k in ks:
		s += " %.2f:%.3f" % [k * 0.02, prof[k]]
	print(s)

## 耳機（11/10 重新量）：頭（含刺刺的頭髮）頂點換到頭的座標（x 左、y 上、z 前）。
## 耳罩內面＝耳朵那一圈頭髮最外面＋2 mm；頭帶內緣（半橢圓、帶子厚 16 mm）＝把頭帶平面裡的頭髮整個包住＋2 mm。
## 量到的間隙存在 hp_fit（耳罩／頭帶到頭髮最近距離、穿進去的頂點數）。
var hp_fit := {}
func _put_headphones() -> void:
	var head := _bpos("head")
	var up := (_bpos("headtop_end") - head).normalized()
	var left := (_bpos("leftupleg") - _bpos("rightupleg"))
	left = (left - up * left.dot(up)).normalized()
	var fwd := left.cross(up).normalized()
	var P := skinned_points(1)
	var pts := []
	var mn := Vector3(9, 9, 9)
	var mx := -mn
	for p in P:
		var d := p - head
		var v := Vector3(d.dot(left), d.dot(up), d.dot(fwd))
		if v.y > -0.04 and absf(v.x) < 0.3 and absf(v.z) < 0.3:
			pts.append(v)
			if v.y > -0.01:
				mn = mn.min(v)
				mx = mx.max(v)
	var ear_y := mn.y + (mx.y - mn.y) * 0.38
	var cz := (mn.z + mx.z) * 0.5 - 0.01
	var cx := (mn.x + mx.x) * 0.5
	var GAP := 0.002
	# 耳罩：圓柱半徑 5.5 cm、厚 4.5 cm，中心在 w+0.01 → 內面在 w-0.0125
	var side := 0.0
	for v: Vector3 in pts:
		if Vector2(v.y - ear_y, v.z - cz).length() < 0.056:
			side = maxf(side, absf(v.x - cx))
	var w := side + GAP + 0.0125
	# 頭帶：帶子中心線是橢圓（水平半徑 r、高 hb），帶厚 16 mm、前後寬 4 cm → 內緣＝橢圓往內 8 mm
	var r := w + 0.015
	for v: Vector3 in pts:
		if absf(v.z - cz) < 0.025 and v.y > ear_y + 0.01:
			r = maxf(r, absf(v.x - cx) + 0.008 + GAP + 0.004)
	var ri := r - 0.008 - GAP
	var hi := 0.02
	for v: Vector3 in pts:
		if absf(v.z - cz) < 0.025 and v.y > ear_y:
			var xr := absf(v.x - cx) / ri
			if xr < 0.999:
				hi = maxf(hi, (v.y - ear_y) / sqrt(1.0 - xr * xr))
	var hb := hi + 0.008 + GAP
	print("  耳機量頭髮：耳朵那圈半寬 %.3f → w %.3f；頭帶 r %.3f hb %.3f" % [side, w, r, hb])
	var hp := Home.make_headphones(w, hb, "#e85d4a", "#33333b", r, 16)
	var o := head + left * cx + up * ear_y + fwd * cz
	_attach("head", hp, Transform3D(Basis(left, up, fwd).orthonormalized(), o))
	await get_tree().process_frame
	hp_fit = headphone_gap(hp)
	print("  [耳機貼合] 到頭髮最近 %.1f mm，穿進頭髮的頂點 %d 個" % [float(hp_fit["gap"]) * 1000.0, hp_fit["inside"]])

## 量：耳機每個零件（盒子＝頭帶段、圓柱＝耳罩／耳墊）到頭（含頭髮）頂點：最近距離（負＝穿進去）、穿進去的頂點數
func headphone_gap(hp: Node3D) -> Dictionary:
	var head := _bpos("head")
	var P := PackedVector3Array()
	for it in Pose._hp_skinned(sk, "", ["head", "neck"]):
		P.append_array(it[1])
	var best := 9.0
	var inside := 0
	for c in hp.get_children():
		if not (c is MeshInstance3D):
			continue
		var mi := c as MeshInstance3D
		var inv := mi.global_transform.affine_inverse()
		var sc := mi.global_transform.basis.get_scale()
		for p in P:
			if p.distance_to(head) > 0.4:
				continue
			var q := inv * p
			var d := 9.0
			if mi.mesh is BoxMesh:
				var e: Vector3 = (mi.mesh as BoxMesh).size * 0.5
				var o := (q.abs() - e)
				if o.x < 0.0 and o.z < 0.0:
					d = o.y * sc.y
				elif o.y < 0.0 and o.z < 0.0:
					d = o.x * sc.x
			elif mi.mesh is CylinderMesh:
				var cm := mi.mesh as CylinderMesh
				var rr := Vector2(q.x, q.z).length()
				if rr < cm.top_radius:
					d = (absf(q.y) - cm.height * 0.5) * sc.y
				elif absf(q.y) < cm.height * 0.5:
					d = (rr - cm.top_radius) * sc.x
			if d < 9.0:
				best = minf(best, d)
				if d < 0.0:
					inside += 1
	return {"gap": best, "inside": inside}

## 鉛筆：黃色筆身＋粉紅橡皮擦＋深色筆尖；want＝世界 Transform（原點＝筆尖、+Y 朝橡皮擦），由 Pose.hold_pencil 算出
func _pencil_in_hand(want: Transform3D) -> void:
	(home.get_node("book/Pencil") as Node3D).visible = false
	var L := 0.16
	var r: float = Pose.PENCIL_R
	var pen := Node3D.new()
	var parts := [[0.0, 0.008, 0.0006, 0.002, "#3a3a44"], [0.008, 0.022, 0.002, r, "#f3d9a8"], [0.022, L - 0.02, r, r, "#ffcc00"], [L - 0.02, L - 0.013, r * 1.04, r * 1.04, "#c9cbd3"], [L - 0.013, L, r, r, "#ef7fa8"]]
	for pp in parts:
		var mi := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.bottom_radius = pp[2]
		cm.top_radius = pp[3]
		cm.height = pp[1] - pp[0]
		cm.radial_segments = 8
		mi.mesh = cm
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(pp[4])
		mi.material_override = m
		mi.position = Vector3(0, (pp[0] + pp[1]) * 0.5, 0)
		pen.add_child(mi)
	_attach("righthand", pen, want)

func _save(nm: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test_home/%s.png" % nm)
	print("saved ", nm)

# ───────── 量測（蒙皮頂點） ─────────
func skinned_points(step := 3) -> PackedVector3Array:
	var out := PackedVector3Array()
	var mis := []
	_collect(ken, mis)
	for mi: MeshInstance3D in mis:
		var skin := mi.skin
		var mesh := mi.mesh
		var bm := []
		for i in skin.get_bind_count():
			var bi := skin.get_bind_bone(i)
			if bi < 0:
				bi = sk.find_bone(skin.get_bind_name(i))
			bm.append(sk.get_bone_global_pose(bi) * skin.get_bind_pose(i))
		for s in mesh.get_surface_count():
			var a := mesh.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			if B == null or B.size() == 0:
				continue
			var nb: int = B.size() / V.size()
			for vi in range(0, V.size(), step):
				var p := Vector3.ZERO
				for k in nb:
					var wt: float = W[vi * nb + k]
					if wt > 0.0:
						var tf: Transform3D = bm[B[vi * nb + k]]
						p += (tf * V[vi]) * wt
				out.append(sk.global_transform * p)
	return out

func _collect(n: Node, arr: Array) -> void:
	if n is MeshInstance3D and n.skin != null and n.mesh != null:
		arr.append(n)
	for c in n.get_children():
		_collect(c, arr)

## Ken 在原點、面向 +Z 時量：hips、屁股最低點（seat）、膝蓋、腳、手
func measure() -> Dictionary:
	var P := skinned_points()
	var hips := _bpos("hips")
	var knee := (_bpos("leftleg") + _bpos("rightleg")) * 0.5
	var seat := 9.0
	var back := 9.0
	var knee_front := -9.0
	var minY := 9.0
	for p in P:
		minY = minf(minY, p.y)
		if p.y < hips.y and p.y > 0.18 and p.z > hips.z - 0.2 and p.z < hips.z + 0.1 and absf(p.x - hips.x) < 0.2:
			seat = minf(seat, p.y)
		if p.y < 0.6:
			back = minf(back, p.z)
		if p.y > 0.2 and p.y < 0.5:
			knee_front = maxf(knee_front, p.z)
	return {"hips_x": hips.x, "hips_y": hips.y, "hips_z": hips.z, "seat": seat, "back_z": back, "knee_y": knee.y, "knee_z": knee.z,
		"knee_front_z": knee_front, "minY": minY, "handL": _bpos("lefthandmiddle1"), "handR": _bpos("righthandmiddle1")}

## 診斷：右手頂點（手骨座標、貼圖顏色、權重）寫到 DIAG_OUT，用來找手上的小道具
func _diag() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	var mis := []
	_collect(ken, mis)
	var dump := ""
	for mi: MeshInstance3D in mis:
		var skin := mi.skin
		var mesh := mi.mesh
		var bidx := []
		var bm := []
		for i in skin.get_bind_count():
			var bi := skin.get_bind_bone(i)
			if bi < 0:
				bi = sk.find_bone(skin.get_bind_name(i))
			bidx.append(bi)
			bm.append(sk.get_bone_global_pose(bi) * skin.get_bind_pose(i))
		for su in mesh.get_surface_count():
			var a := mesh.surface_get_arrays(su)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var UV: PackedVector2Array = a[Mesh.ARRAY_TEX_UV]
			var img: Image = (mesh.surface_get_material(su) as StandardMaterial3D).albedo_texture.get_image()
			if img.is_compressed():
				img.decompress()
			var nb: int = B.size() / V.size()
			var axr := Pose.hand_axes(sk, Pose.pose_world(sk), "right")   # 輸出改用手的座標（a 手指、n 手心、t 拇指側；原點手腕）
			var rh := Transform3D(Basis(axr[0], axr[1], axr[2]), sk.get_bone_global_pose(Retarget._idx(sk, "righthand")).origin).affine_inverse()
			for vi in V.size():
				var best := -1
				var bw := 0.0
				var p := Vector3.ZERO
				var ws := ""
				for k in nb:
					var wt: float = W[vi * nb + k]
					if wt > 0.0:
						p += (bm[B[vi * nb + k]] * V[vi]) * wt
						ws += "%s:%.2f," % [Retarget.norm(sk.get_bone_name(bidx[B[vi * nb + k]])), wt]
					if wt > bw:
						bw = wt
						best = bidx[B[vi * nb + k]]
				var nm := Retarget.norm(sk.get_bone_name(best))
				if nm.begins_with("righthand") or nm.begins_with("lefthand"):
					var rl := rh * p
					var uv: Vector2 = UV[vi]
					var c := img.get_pixel(clampi(int(uv.x * img.get_width()), 0, img.get_width() - 1), clampi(int(uv.y * img.get_height()), 0, img.get_height() - 1))
					dump += "%d %s %f %f %f %s %s
" % [vi, nm, rl.x, rl.y, rl.z, c.to_html(false), ws]
	var fa := FileAccess.open(OS.get_environment("DIAG_OUT"), FileAccess.WRITE)
	fa.store_string(dump)
	fa.close()
	print("DIAG done")

## 診斷：手部特寫（找手上的小道具）
func _handzoom() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	ken.global_transform = Transform3D(Basis.IDENTITY, Vector3(0, 0, 0))
	var names := ""
	for i in sk.get_bone_count():
		names += sk.get_bone_name(i) + ","
	var pw := Pose.pose_world(sk)
	for sd in ["left", "right"]:
		print("PALM ", sd, " 手心=", Pose._palm_normal(sk, pw, sd), " 手腕=", _bpos(sd + "hand"), " 中指根=", _bpos(sd + "handmiddle1"), " 食指根=", _bpos(sd + "handindex1"), " 小指根=", _bpos(sd + "handpinky1"))
	if OS.get_environment("HANDZOOM") == "palm":
		return
	for side in ["right", "left"]:
		var h := _bpos(side + "hand")
		for k in 3:
			var d: Vector3 = [Vector3(0, 0, 0.35), Vector3(0.35 if side == "left" else -0.35, 0, 0.05), Vector3(0, 0, -0.35)][k]
			_look(h + d, h + Vector3(0, -0.05, 0), 35)
			await _save("zoom_%s_%d" % [side, k])

## 診斷：某動作每 5% 一格，印兩手（相對坐墊面）、頭高、腳底
func _sweep(anim: String) -> void:
	var rt := _bind(anim)
	for i in 21:
		var t := i * 0.05
		rt.apply_at(rt.length() * t)
		var m := measure()
		var base: float = Home.CHAIR_SEAT_TOP - m["seat"]
		var hd := _bpos("head")
		print("SWEEP %s t=%.2f handL y=%.3f z=%.3f handR y=%.3f z=%.3f head y=%.3f z=%.3f footL %.3f footR %.3f minY %.3f" % [anim, t, m["handL"].y + base, m["handL"].z, m["handR"].y + base, m["handR"].z, hd.y + base, hd.z, _bpos("lefttoebase").y + base, _bpos("righttoebase").y + base, m["minY"] + base])
	rt.src_root.queue_free()

## 診斷：T-pose 時手的尺寸（手的座標：a 手指方向、n 手心方向、t 拇指側；原點＝手腕）
func _handinfo() -> void:
	var rt := _bind("sitting_idle")
	Pose.apply_world(sk, rt.corr)
	rt.src_root.queue_free()
	var mis := []
	_collect(ken, mis)
	for mi: MeshInstance3D in mis:
		for s in mi.mesh.get_surface_count():
			var a := mi.mesh.surface_get_arrays(s)
			var have := []
			for k in a.size():
				if a[k] != null:
					have.append(k)
			print("MESH ", mi.name, " surf ", s, " verts ", (a[Mesh.ARRAY_VERTEX] as PackedVector3Array).size(), " arrays ", have, " xform ", mi.transform)
	var pw := Pose.pose_world(sk)
	for side in ["left", "right"]:
		var ax := Pose.hand_axes(sk, pw, side)
		var o := _bpos(side + "hand")
		var hp := Pose.hand_points(sk, side, true)
		var ks := hp.keys()
		ks.sort()
		for k in ks:
			var mn := Vector3(9, 9, 9)
			var mx := -mn
			for p: Vector3 in hp[k]:
				var v := Vector3((p - o).dot(ax[0]), (p - o).dot(ax[1]), (p - o).dot(ax[2]))
				mn = mn.min(v)
				mx = mx.max(v)
			var bo: Vector3 = _bpos(k) - o
			print("HAND %s %-18s n=%4d 骨(a,n,t)=(%.3f,%.3f,%.3f) a %.3f~%.3f n %.3f~%.3f t %.3f~%.3f" % [side, k, hp[k].size(), bo.dot(ax[0]), bo.dot(ax[1]), bo.dot(ax[2]), mn.x, mx.x, mn.y, mx.y, mn.z, mx.z])
		for f in ["thumb", "index", "middle", "ring", "pinky"]:
			var e := Retarget._idx(sk, "%shand%s4" % [side, f])
			if e >= 0:
				var bo2: Vector3 = _bpos("%shand%s4" % [side, f]) - o
				print("HAND %s %s4 骨(a,n,t)=(%.3f,%.3f,%.3f)" % [side, f, bo2.dot(ax[0]), bo2.dot(ax[1]), bo2.dot(ax[2])])

## 診斷：T-pose 手部四個方向特寫（手心、拇指側、指尖、手背）；UNCURL=度數 可試手指彎曲（負＝張開）
func _handview() -> void:
	var rt := _bind("sitting_idle")
	var w: Dictionary = rt.corr.duplicate()
	Pose.apply_world(sk, w)
	rt.src_root.queue_free()
	var unc := OS.get_environment("UNCURL")
	if unc != "":
		var d := float(unc)
		for side in ["left", "right"]:
			Pose.curl_fingers(sk, w, side, [d, d, d], 0.0)
		Pose.apply_world(sk, w)
	ken.global_transform = Transform3D(Basis.IDENTITY, Vector3(2.5, 3.0, 2.0))   # 屋子上方空中，四周沒有東西擋
	for side in ["right", "left"]:
		var ax := Pose.hand_axes(sk, w, side)
		var c: Vector3 = _bpos(side + "hand") + ax[0] * 0.07
		var dirs := [ax[1], ax[2], ax[0], -ax[1]]
		for k in 4:
			var up: Vector3 = ax[0] if k != 2 else ax[2]
			cam.fov = 24
			cam.look_at_from_position(c + dirs[k] * 0.4, c, up)
			await _save("hv_%s_%d" % [side, k])

## 診斷：T-pose 兩手的三角形（手的座標 a,n,t）寫到 DIAG_OUT，每行：side 主骨 9 個數字
func _handtris() -> void:
	var rt := _bind("sitting_idle")
	Pose.apply_world(sk, rt.corr)
	rt.src_root.queue_free()
	var pw := Pose.pose_world(sk)
	var dump := ""
	for side in ["left", "right"]:
		var ax := Pose.hand_axes(sk, pw, side)
		var inv := Transform3D(Basis(ax[0], ax[1], ax[2]), _bpos(side + "hand")).affine_inverse()
		for tri in Pose.hand_tris(sk, side):
			var a: Vector3 = inv * tri[1]
			var b: Vector3 = inv * tri[2]
			var c: Vector3 = inv * tri[3]
			dump += "%s %s %f %f %f %f %f %f %f %f %f
" % [side, tri[0], a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z]
	var fa := FileAccess.open(OS.get_environment("DIAG_OUT"), FileAccess.WRITE)
	fa.store_string(dump)
	fa.close()
	print("HANDTRIS done")
