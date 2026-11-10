extends Node3D
## Ken 張開右手版（ken_openhand.glb）檢查：存 test_openhand/*.png
## 執行：Godot --path . res://scenes/openhand_check.tscn   （ONLY=curl 只拍一組；CHAR=ken_rigged 換模型對照；
##       圳寶：CHAR=zunbo_openhand CAMDIST=1.4）
## 各組：rest 原始姿勢、stand 站好、hand 右手特寫、curl 手指彎曲、pair 兩手並排、anim Mixamo 動作、walk 檔案內 walk 動畫
## DUMP_CORR=檔案路徑：只輸出原模型（ken_rigged）對齊 T-pose 後每根骨頭的世界旋轉（給 tools/make_ken_openhand.py 算鏡射用）

const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")
const Pose := preload("res://scripts/procedural_pose.gd")

var ken: Node3D
var sk: Skeleton3D
var cam: Camera3D
var cd := 1.0   # 特寫鏡頭距離倍數（CAMDIST=1.4：圳寶的手和前臂比較粗大）

func _ready() -> void:
	var w := World.new()
	w._materials()
	var dump := OS.get_environment("DUMP_CORR")
	var ch := OS.get_environment("CHAR")
	if ch == "":
		ch = "ken_rigged" if dump != "" else "ken_openhand"
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.86, 0.9, 0.95)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.95, 0.95, 1.0)
	e.ambient_light_energy = 1.2
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(2, 6, 6), Vector3.ZERO, Vector3.UP)
	sun.light_energy = 1.3
	ken = w.fit_model(ch, 1.3, OS.get_environment("NOOUT") == "", 0.3)
	add_child(ken)
	var ap: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	if ap:
		ap.stop()
		ap.active = false
	sk = Retarget.find_type(ken, "Skeleton3D")
	await get_tree().process_frame
	if dump != "":
		_dump_corr(dump)
		get_tree().quit()
		return
	if OS.get_environment("THICK_HANDS") == "":
		Pose.thin_hand_outline(ken, 0.25)
	cam = Camera3D.new()
	add_child(cam)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://test_openhand"))
	var only := OS.get_environment("ONLY")
	if OS.get_environment("CAMDIST") != "":
		cd = float(OS.get_environment("CAMDIST"))
	for part in ["rest", "stand", "hand", "curl", "pair", "anim", "walk", "cut"]:
		if only == "" or only == part:
			await call("_part_" + part)
	get_tree().quit()

func _look(pos: Vector3, at: Vector3, fov := 35.0, up := Vector3.UP) -> void:
	cam.fov = fov
	cam.look_at_from_position(pos, at, up)

func _save(nm: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test_openhand/%s.png" % nm)
	print("saved ", nm)

func _bpos(bn: String) -> Vector3:
	return Pose.bone_pos(sk, Retarget._idx(sk, bn))

func _bind() -> Retarget:
	sk.reset_bone_poses()
	var rt := Retarget.new()
	rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_sitting_idle.fbx"), self)
	rt.bind(sk)
	return rt

## (a) 模型原始姿勢：正面、右側、右手近照
func _part_rest() -> void:
	sk.reset_bone_poses()
	_look(Vector3(0, 0.75, 2.6), Vector3(0, 0.65, 0))
	await _save("rest_front")
	_look(Vector3(-2.0, 0.9, 1.6), Vector3(0, 0.7, 0))
	await _save("rest_right")
	var h := _bpos("righthand")
	_look(h + Vector3(-0.1, 0.05, 0.5), h + Vector3(0, 0.05, 0), 30)
	await _save("rest_hand")

## (b) 站好（兩手放下）：正面、右側、左側；印出兩手拇指方向（要朝前）
func _part_stand() -> void:
	var rt := _bind()
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	await get_tree().process_frame
	var kleft := Pose._left(sk)
	var kfwd := kleft.cross(Vector3.UP).normalized()
	var pw := Pose.pose_world(sk)
	for sd in ["left", "right"]:
		var th := (_bpos(sd + "handthumb4") - _bpos(sd + "hand"))
		var pk := (_bpos(sd + "handpinky1") - _bpos(sd + "handindex1")).normalized()
		var pn := Pose._palm_normal(sk, pw, sd)
		print("STAND %s：拇指尖相對手腕 前 %.3f 左 %.3f 上 %.3f；食指根→小指根 前 %.2f；手心方向 左 %.2f 前 %.2f" % [sd, th.dot(kfwd), th.dot(kleft), th.y, pk.dot(kfwd), pn.dot(kleft), pn.dot(kfwd)])
	_look(Vector3(0, 0.75, 2.6), Vector3(0, 0.65, 0))
	await _save("stand_front")
	_look(Vector3(-2.4, 0.75, 0.6), Vector3(0, 0.65, 0))
	await _save("stand_right")
	_look(Vector3(2.4, 0.75, 0.6), Vector3(0, 0.65, 0))
	await _save("stand_left")
	for sd in ["right", "left"]:
		var sgn := 1.0 if sd == "left" else -1.0
		var h := _bpos(sd + "hand") + Vector3(0, -0.05, 0.02)
		_look(h + Vector3(sgn * 0.5, 0.05, 0.25) * cd, h, 30)
		await _save("stand_hand_%s" % sd)
		_look(h + Vector3(sgn * 0.1, 0.0, 0.55) * cd, h, 30)
		await _save("stand_hand_%s_front" % sd)

## T-pose、手指伸直；回傳 world 字典
func _tpose(rt: Retarget) -> Dictionary:
	var w: Dictionary = rt.corr.duplicate()
	Pose.apply_world(sk, w)
	return w

## 手部特寫四個方向：0 手心、1 拇指側、2 手背、3 指尖
func _hand_views(w: Dictionary, side: String, tag: String, dist := 0.42) -> void:
	var ax := Pose.hand_axes(sk, w, side)
	var c: Vector3 = _bpos(side + "hand") + ax[0] * 0.06
	var dirs := [ax[1], ax[2], -ax[1], ax[0]]
	for k in 4:
		var up: Vector3 = ax[0] if k != 3 else ax[2]
		_look(c + dirs[k] * dist * cd, c, 26, up)
		await _save("%s_%s_%d" % [tag, side, k])

## (c) 右手特寫（手指伸直）＋左手同角度對照；印左右對稱誤差
func _part_hand() -> void:
	var rt := _bind()
	var w := _tpose(rt)
	rt.src_root.queue_free()
	ken.global_position = Vector3(0, 2.0, 0)   # 抬高，四周沒有東西擋
	await get_tree().process_frame
	_symmetry_report()
	for sd in ["right", "left"]:
		await _hand_views(w, sd, "hand")
	ken.global_position = Vector3.ZERO

## T-pose 時：左手頂點鏡射（x → -x，各自相對手腕）和右手頂點的最近距離
func _symmetry_report() -> void:
	var L := Pose.hand_points(sk, "left")
	var R := Pose.hand_points(sk, "right")
	var ol := _bpos("lefthand")
	var or_ := _bpos("righthand")
	var rp: Array = []
	for k in R:
		for p: Vector3 in R[k]:
			rp.append(p - or_)
	var worst := 0.0
	var n := 0
	for k in L:
		for p: Vector3 in L[k]:
			var q: Vector3 = p - ol
			q.x = -q.x
			var best := 9.0
			for r: Vector3 in rp:
				best = minf(best, q.distance_to(r))
			worst = maxf(worst, best)
			n += 1
	print("SYMMETRY 左手 %d 點鏡射後離右手最近點：最大 %.3f mm（右手 %d 點）" % [n, worst * 1000.0, rp.size()])
	var wl := 0.0
	for f in ["thumb", "index", "middle", "ring", "pinky"]:
		for i in range(1, 5):
			var a := _bpos("lefthand%s%d" % [f, i]) - ol
			a.x = -a.x
			wl = maxf(wl, a.distance_to(_bpos("righthand%s%d" % [f, i]) - or_))
	print("SYMMETRY 20 個手指關節鏡射誤差最大 %.3f mm；手腕高度 左 %.4f 右 %.4f" % [wl * 1000.0, ol.y, or_.y])

## (d) 右手手指彎 45、80 度（四指三節都彎；拇指彎一點），左手一起彎當對照
func _part_curl() -> void:
	ken.global_position = Vector3(0, 2.0, 0)
	for deg in [45.0, 80.0]:
		var rt := _bind()
		var w := _tpose(rt)
		rt.src_root.queue_free()
		for sd in ["left", "right"]:
			Pose.curl_fingers(sk, w, sd, [deg, deg, deg * 0.8], deg * 0.4)
		Pose.apply_world(sk, w)
		await get_tree().process_frame
		for sd in ["right", "left"]:
			await _hand_views(w, sd, "curl%d" % int(deg))
	ken.global_position = Vector3.ZERO

## (e) 兩手並排：手臂往前伸、手心朝下，從上面看手背；再手心朝上，看手心
func _part_pair() -> void:
	for mode in ["back", "palm"]:
		var rt := _bind()
		var w := _tpose(rt)
		rt.src_root.queue_free()
		var kleft := Pose._left(sk)
		var kfwd := kleft.cross(Vector3.UP).normalized()
		var mid := (_bpos("leftarm") + _bpos("rightarm")) * 0.5
		var palm := Vector3.DOWN if mode == "back" else Vector3.UP
		for sd in ["left", "right"]:
			var sgn := 1.0 if sd == "left" else -1.0
			var H := mid + kfwd * 0.25 + kleft * sgn * 0.06 + Vector3.UP * -0.05
			Pose.ik_arm(sk, w, sd, H, kleft * sgn - Vector3.UP * 0.6)
			Pose.aim_hand(sk, w, sd, kfwd, palm)
		Pose.apply_world(sk, w, true)
		await get_tree().process_frame
		var c := (_bpos("lefthand") + _bpos("righthand")) * 0.5 + kfwd * 0.06
		_look(c + Vector3.UP * 0.55 + kfwd * 0.02, c, 30, -kfwd)
		await _save("pair_%s" % mode)
		_look(c + kfwd * 0.5 + Vector3.UP * 0.25, c, 30)
		await _save("pair_%s_front" % mode)

## (f) Mixamo 動作：cheering、dribble、typing 各 3 格（全身＋右手腕特寫）
func _part_anim() -> void:
	ken.rotation.y = deg_to_rad(-25)   # 稍微轉向，看得到右手
	for nm in ["cheering", "dribble", "typing"]:
		sk.reset_bone_poses()
		var rt := Retarget.new()
		rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_%s.fbx" % nm), self)
		rt.bind(sk)
		for i in 3:
			rt.apply_at(rt.length() * (0.25 + 0.25 * i))
			await get_tree().process_frame
			_look(Vector3(0, 1.0, 2.8), Vector3(0, 0.6, 0))
			await _save("anim_%s_%d" % [nm, i])
			var h := _bpos("righthand")
			var e := _bpos("rightforearm")
			var side := (h - e).normalized().cross(Vector3.UP).normalized()
			if side.z < 0:
				side = -side
			_look(h + (side * 0.45 + Vector3(0, 0.12, 0.2)) * cd, h, 30)
			await _save("anim_%s_%d_wrist" % [nm, i])
		rt.src_root.queue_free()
	ken.rotation.y = 0

## (g) 檔案內的 walk 動畫（遊戲裡走路用這個）：3 格全身＋兩手特寫
func _part_walk() -> void:
	var ap: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	if ap == null or not ap.has_animation("walk"):
		return
	ap.active = true
	var L := ap.get_animation("walk").length
	for i in 3:
		ap.play("walk")
		ap.seek(L * (0.15 + 0.3 * i), true)
		ap.pause()
		await get_tree().process_frame
		_look(Vector3(-0.9, 0.8, 2.4), Vector3(0, 0.6, 0))
		await _save("walk_%d" % i)
		for sd in ["right", "left"]:
			var sgn := 1.0 if sd == "left" else -1.0
			var h := _bpos(sd + "hand")
			_look(h + Vector3(sgn * 0.35, 0.08, 0.35) * cd, h, 30)
			await _save("walk_%d_%s" % [i, sd])
	ap.stop()
	ap.active = false
	sk.reset_bone_poses()

## (h) 原始姿勢的前臂切口（新舊網格接合處）：兩手各從四個方向看
func _part_cut() -> void:
	sk.reset_bone_poses()
	for sd in ["right", "left"]:
		var h := _bpos(sd + "hand")
		var e := _bpos(sd + "forearm")
		var ax := (h - e).normalized()
		var c: Vector3 = h - ax * 0.08 * (ken.get_child(0) as Node3D).scale.x
		var s1 := ax.cross(Vector3.UP).normalized()
		var s2 := ax.cross(s1).normalized()
		var dirs: Array[Vector3] = [s1, s2, -s1, -s2]
		for k in 4:
			_look(c + dirs[k] * 0.7, c, 30, ax if absf(ax.dot(dirs[k])) < 0.9 else Vector3.UP)
			await _save("cut_%s_%d" % [sd, k])

## 輸出 corr（T-pose 對齊後的世界旋轉）與來源骨頭方向
func _dump_corr(path: String) -> void:
	var rt := Retarget.new()
	rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_sitting_idle.fbx"), self)
	rt.bind(sk)
	var out := {"skeleton_basis": _b(sk.global_transform.basis.orthonormalized()), "left_dir": _v(Pose._left(sk)), "corr": {}, "src_dir": {}}
	var sw := rt.src_sk.global_transform.basis.orthonormalized()
	for b in sk.get_bone_count():
		var nm := Retarget.norm(sk.get_bone_name(b))
		out["corr"][nm] = _b(rt.corr[b])
		var c := Retarget._main_child(sk, b)
		if rt.map.has(b) and c >= 0 and rt.map.has(c):
			var s: int = rt.map[b]
			var sw2 := (sw * rt.src_sk.get_bone_global_rest(s).basis.orthonormalized()).orthonormalized()
			out["src_dir"][nm] = _v((sw2 * rt.src_sk.get_bone_rest(rt.map[c]).origin).normalized())
	var fa := FileAccess.open(path, FileAccess.WRITE)
	fa.store_string(JSON.stringify(out, "  "))
	fa.close()
	print("DUMP_CORR done ", path)

static func _v(v: Vector3) -> Array:
	return [v.x, v.y, v.z]

## Basis → 3 欄（x、y、z 軸）
static func _b(b: Basis) -> Array:
	return [_v(b.x), _v(b.y), _v(b.z)]
