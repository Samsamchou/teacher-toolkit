extends Node3D
## 二水小行星・逛街版：老師選 5–7 組 → 各組押答案 → Start → 角色走到正確地點 → 猜對 +2 → 約 12 題後看結果。
## 規格：3D planet/rdq/RDQ-spec-ershui-planet-stroll-20261025.md（2026-10-25 老師確認）

const World := preload("res://scripts/world.gd")
const SPEED := 11.0
const POINTS := 2
const KEN_H := 1.3
const YUYU_H := 1.2
const ZUNBO_H := 1.15
const FOOT := 0.1
const LETTERS := ["A", "B", "C", "D"]
const GROUP_COLORS := [Color("#ff6b6b"), Color("#ffa94d"), Color("#ffd43b"), Color("#69db7c"), Color("#4dabf7"), Color("#9775fa"), Color("#f783ac")]
const ICON_COUNT := 12
const VOL_DB := [-80.0, -18.0, -11.0, -5.0]
const VOL_NAME := ["Sound Off", "Sound 1", "Sound 2", "Sound 3"]

var world: Node3D
var cam: Camera3D
var font: Font
var font_bold: Font
var data: Dictionary
var sets: Dictionary
var rng := RandomNumberGenerator.new()
var test_mode := false

# 角色
var walkers := {}               # "ken"/"yuyu" -> {node, model, anim, pos:Vector2, fwd:Vector2, path:Array, bob}
var active := "ken"
var fast := false

# 遊戲狀態
enum St { TITLE, SETUP, QUESTION, WALKING, REVEAL, RESULT }
var state := St.TITLE
var group_count := 6
var group_icons: Array = []     # 每組的圖示編號
var scores: Array = []
var set_idx := 0
var rounds: Array = []          # [{target, who, pattern, question, options:[word], correct:int}]
var qi := 0
var bets := {}                  # 組 → 選項
var cam_mode := "fly"           # fly / follow / map / arrive
var fly_t := 0.0
var fly_route: Array = []
var cam_pos := Vector3.ZERO
var cam_look := Vector3.ZERO
var cam_up := Vector3.UP

# UI
var ui: CanvasLayer
var title_ui: Control
var setup_ui: Control
var hud: Control
var chips_box: HBoxContainer
var chip_nodes: Array = []
var qpanel: PanelContainer
var q_label: Label
var q_sub: Label
var opt_buttons: Array = []
var opt_grid: GridContainer
var bet_box: GridContainer
var bet_buttons: Array = []     # [group][option] Button
var start_btn: Button
var next_btn: Button
var listen_btn: Button
var listened := false
var continue_btn: Button
var walk_from := Vector2.ZERO
var toast: Label
const SAVE_PATH := "user://ershui_planet_save.json"
var walk_caption: Label
var result_ui: Control
var vol_btn: Button
var fast_btn: Button
var map_btn: Button
var icons: Array = []           # Texture2D 或 null
var music: AudioStreamPlayer
var voice: AudioStreamPlayer
var sfx_p: AudioStreamPlayer
var vol_level := 1
var sfx_pool: Array = []
var sfx_i := 0
var sfx_cache := {}
var step_timer := 0.0
var setup_sel_group := 0
var setup_group_btns: Array = []
var setup_set_btns: Array = []
var setup_mode_btns: Array = []
var go_btn: Button
var arrive_id := ""
var setup_count_btns: Array = []

func _ready() -> void:
	rng.randomize()
	test_mode = "--test" in OS.get_cmdline_user_args()
	var cjk: FontFile = load("res://assets/fonts/NotoSansTC-Regular-subset.ttf")
	var cjk_b: FontFile = load("res://assets/fonts/NotoSansTC-Bold-subset.ttf")
	var reg: FontFile = load("res://assets/fonts/ComicRelief-Regular.ttf")
	var bold: FontFile = load("res://assets/fonts/ComicRelief-Bold.ttf")
	reg.fallbacks = [cjk]
	bold.fallbacks = [cjk_b]
	font = reg
	font_bold = bold
	data = JSON.parse_string(FileAccess.get_file_as_string("res://data/map.json"))
	sets = JSON.parse_string(FileAccess.get_file_as_string("res://data/sets.json"))
	world = World.new()
	world.name = "World"
	add_child(world)
	world.build(data, font, font_bold)
	cam = Camera3D.new()
	cam.fov = 50
	cam.near = 0.3
	cam.far = 2500
	add_child(cam)
	_build_walkers()
	_build_fly_route()
	_load_icons()
	_build_audio()
	_build_ui()
	_show_title()
	if test_mode:
		_run_test()

# ---------- 角色 ----------
func _build_walkers() -> void:
	var start: Vector2 = world.places["station"]["door2"]
	var ken := Node3D.new()
	ken.name = "Ken"
	add_child(ken)
	var km: Node3D = world.fit_model("ken_rigged", KEN_H, true, 0.3)   # 描邊太粗會認不出 Ken
	km.position.y = FOOT
	ken.add_child(km)
	var anim := _find_anim(km)
	walkers["ken"] = {"node": ken, "model": km, "anim": anim, "pos": start + Vector2(-0.9, 0.0), "fwd": Vector2(0, -1), "path": [], "bob": 0.0, "h": KEN_H, "name": "Ken"}
	# 兩位吉祥物（老師 2026-10-25 核准 Tripo 綁骨＋走路動畫）：水鈴 Shuiling、圳寶 Zun-Bo；沒有模型時水鈴用程式拼的暫代版
	_add_walker("yuyu", "shuiling_rigged", YUYU_H, start + Vector2(0.9, 0.0), "Shuiling")
	_add_walker("zunbo", "zunbo_rigged", ZUNBO_H, start + Vector2(0.0, 1.3), "Zun-Bo")
	for k in walkers:
		_place_walker(k, 0.0)
		_walker_anim(k, false)

## 女性吉祥物「水鈴 Shuiling」暫代模型（老師 2026-10-25 選定方案 B；程式組成，Tripo 綁骨模型做好後換掉）
## 水滴形藍髮＋翹起的浪花呆毛、兩側金色稻穗髮飾、白上衣、梯田綠短裙、腰間金色火車鈴
func _build_yuyu() -> Node3D:
	var root := Node3D.new()
	root.name = "Shuiling"
	var body := Node3D.new()
	root.add_child(body)
	var skin := Color("#fbe9df")
	var hair := Color("#5bc0eb")
	var white := Color("#f7f7f2")
	var green := Color("#7cc36a")
	var gold := Color("#f2c14e")
	_prim(body, "capsule", Vector3(0.5, 0.75, 0.48), Vector3(0, 0.78, 0), white)     # 白上衣
	_prim(body, "cone", Vector3(0.9, 0.42, 0.9), Vector3(0, 0.42, 0), green)        # 梯田短裙（三層）
	_prim(body, "cone", Vector3(0.76, 0.3, 0.76), Vector3(0, 0.56, 0), green.lightened(0.15))
	_prim(body, "cone", Vector3(0.62, 0.22, 0.62), Vector3(0, 0.68, 0), green.lightened(0.3))
	_prim(body, "sphere", Vector3(0.16, 0.16, 0.16), Vector3(0.0, 0.58, 0.36), gold)  # 火車鈴
	for side in [-1.0, 1.0]:
		var hip := Node3D.new()
		hip.name = "LegL" if side < 0 else "LegR"
		hip.position = Vector3(0.14 * side, 0.36, 0)
		body.add_child(hip)
		_prim(hip, "capsule", Vector3(0.15, 0.2, 0.15), Vector3(0, -0.16, 0), skin)
		_prim(hip, "sphere", Vector3(0.22, 0.16, 0.28), Vector3(0, -0.3, 0.03), green.darkened(0.2))   # 綠靴子
		var sh := Node3D.new()
		sh.name = "ArmL" if side < 0 else "ArmR"
		sh.position = Vector3(0.3 * side, 1.02, 0.02)
		body.add_child(sh)
		_prim(sh, "sphere", Vector3(0.24, 0.22, 0.24), Vector3(0.03 * side, -0.05, 0), white)          # 泡泡袖
		_prim(sh, "capsule", Vector3(0.12, 0.18, 0.12), Vector3(0.04 * side, -0.2, 0), skin)
	_prim(body, "sphere", Vector3(0.78, 0.74, 0.74), Vector3(0, 1.48, 0.02), skin)     # 大頭（臉）
	_prim(body, "sphere", Vector3(0.92, 0.86, 0.86), Vector3(0, 1.58, -0.08), hair)    # 頭髮
	_prim(body, "cone", Vector3(0.5, 0.62, 0.5), Vector3(0, 1.98, -0.12), hair)        # 水滴尖頂
	_prim(body, "torus", Vector3(0.16, 0.16, 0.16), Vector3(0.06, 2.28, -0.12), hair, 90.0)   # 浪花呆毛
	_prim(body, "sphere", Vector3(0.36, 0.44, 0.3), Vector3(-0.36, 1.32, -0.1), hair)  # 兩側髮尾
	_prim(body, "sphere", Vector3(0.36, 0.44, 0.3), Vector3(0.36, 1.32, -0.1), hair)
	for side in [-1.0, 1.0]:
		_prim(body, "capsule", Vector3(0.12, 0.3, 0.12), Vector3(0.46 * side, 1.78, 0.0), gold, -35.0 * side)   # 稻穗髮飾
	_prim(body, "sphere", Vector3(0.12, 0.15, 0.06), Vector3(-0.14, 1.46, 0.37), Color("#3a2a2a"))   # 眼睛
	_prim(body, "sphere", Vector3(0.12, 0.15, 0.06), Vector3(0.14, 1.46, 0.37), Color("#3a2a2a"))
	_prim(body, "sphere", Vector3(0.1, 0.06, 0.03), Vector3(-0.22, 1.36, 0.36), Color("#f4a7a7"))   # 臉頰
	_prim(body, "sphere", Vector3(0.1, 0.06, 0.03), Vector3(0.22, 1.36, 0.36), Color("#f4a7a7"))
	body.scale = Vector3.ONE * (YUYU_H / 2.3)
	body.position.y = FOOT
	return root
func _prim(parent: Node3D, kind: String, size: Vector3, pos: Vector3, col: Color, rot_z := 0.0) -> void:
	var mi := MeshInstance3D.new()
	match kind:
		"sphere":
			var m := SphereMesh.new()
			m.radius = 0.5
			m.height = 1.0
			mi.mesh = m
		"hemi":
			var m := SphereMesh.new()
			m.radius = 0.5
			m.height = 0.5
			m.is_hemisphere = true
			mi.mesh = m
		"capsule":
			var m := CapsuleMesh.new()
			m.radius = 0.5
			m.height = 1.4
			mi.mesh = m
		"cone":
			var m := CylinderMesh.new()
			m.top_radius = 0.0
			m.bottom_radius = 0.5
			m.height = 1.0
			mi.mesh = m
		"torus":
			var m := TorusMesh.new()
			m.inner_radius = 0.6
			m.outer_radius = 1.0
			mi.mesh = m
		_:
			var m := BoxMesh.new()
			mi.mesh = m
	mi.scale = size
	mi.position = pos
	mi.rotation_degrees.z = rot_z
	var mat := StandardMaterial3D.new()
	mat.albedo_color = col
	mat.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	mi.material_override = mat
	var ol := ShaderMaterial.new()
	ol.shader = world.outline_shader
	ol.set_shader_parameter("width", 0.035 / maxf(0.05, minf(size.x, size.y)))
	mi.material_overlay = ol
	parent.add_child(mi)

func _find_anim(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var a := _find_anim(c)
		if a != null:
			return a
	return null

func _add_walker(key: String, mname: String, h: float, pos: Vector2, nm: String) -> void:
	var node := Node3D.new()
	node.name = nm
	add_child(node)
	var model: Node3D
	var anim: AnimationPlayer = null
	if ResourceLoader.exists("res://assets/models/%s.glb" % mname):
		model = world.fit_model(mname, h, true, 0.3)   # 吉祥物細節多：描邊細一點，避免黑線穿過頭髮、裙子
		model.position.y = FOOT
		anim = _find_anim(model)
	elif key == "yuyu":
		model = _build_yuyu().get_child(0)
		model.get_parent().remove_child(model)
	else:
		return
	node.add_child(model)
	walkers[key] = {"node": node, "model": model, "anim": anim, "pos": pos, "fwd": Vector2(0, -1), "path": [], "bob": 0.0, "h": h, "name": nm}

func _find_skeleton(n: Node) -> Skeleton3D:
	if n is Skeleton3D:
		return n
	for c in n.get_children():
		var s := _find_skeleton(c)
		if s != null:
			return s
	return null

func _walker_anim(k: String, walking: bool) -> void:
	if not walkers.has(k):
		return
	var a: AnimationPlayer = walkers[k]["anim"]
	if a == null:
		return
	# Tripo 匯出的吉祥物只有 walk 動畫：停下時回到綁骨時的站姿
	if not walking and not Array(a.get_animation_list()).any(func(x): return "idle" in String(x).to_lower()):
		a.stop()
		var sk := _find_skeleton(walkers[k]["model"])
		if sk != null:
			sk.reset_bone_poses()
		return
	var want := ""
	for nm in a.get_animation_list():
		var low := String(nm).to_lower()
		if walking and "walk" in low:
			want = nm
		elif not walking and "idle" in low:
			want = nm
	if want != "" and a.current_animation != want:
		a.get_animation(want).loop_mode = Animation.LOOP_LINEAR
		a.speed_scale = 1.3 * (2.0 if fast and walking else 1.0)
		a.play(want, 0.25)

func _place_walker(k: String, delta: float) -> void:
	var W: Dictionary = walkers[k]
	var node: Node3D = W["node"]
	node.transform = world.frame_at(W["pos"], W["fwd"], 0.0)
	if W["anim"] == null and (node.get_child(0) as Node3D).has_node("LegL"):
		var body: Node3D = node.get_child(0)
		var walking: bool = W["path"].size() > 0
		W["bob"] = W["bob"] + delta * (9.0 if walking else 3.0) * (3.0 if fast and walking else 1.0)
		var s: float = sin(W["bob"])
		body.position.y = FOOT + (absf(s) * 0.12 if walking else s * 0.02)
		body.rotation.z = s * (0.06 if walking else 0.0)
		var swing := s * 0.7 if walking else 0.0
		for nm in ["LegL", "LegR", "ArmL", "ArmR"]:
			var j: Node3D = body.get_node(nm)
			var sgn := 1.0 if nm in ["LegL", "ArmR"] else -1.0
			j.rotation.x = lerp_angle(j.rotation.x, swing * sgn, minf(1.0, delta * 12.0))

func _process(delta: float) -> void:
	for k in walkers:
		_step_walker(k, delta)
		_place_walker(k, delta)
	_update_camera(delta)

func _step_walker(k: String, delta: float) -> void:
	var W: Dictionary = walkers[k]
	var path: Array = W["path"]
	if path.is_empty():
		_follow(k, delta)
		return
	var move := SPEED * delta * (3.0 if fast else 1.0)
	var pos: Vector2 = W["pos"]
	while move > 0.0 and not path.is_empty():
		var tgt: Vector2 = path[0]
		var d := pos.distance_to(tgt)
		if d <= move:
			pos = tgt
			move -= d
			path.pop_front()
		else:
			var dir := (tgt - pos) / d
			pos += dir * move
			move = 0.0
			W["fwd"] = (W["fwd"] as Vector2).lerp(dir, minf(1.0, delta * 10.0)).normalized()
	W["pos"] = pos
	if k == active:
		step_timer -= delta * (3.0 if fast else 1.0)
		if step_timer <= 0.0:
			step_timer = 0.32
			sfx("footstep_1" if randi() % 2 == 0 else "footstep_2", randf_range(0.92, 1.08))
	if path.is_empty():
		_walker_anim(k, false)
		_on_arrive(k)

## 三人一起走：跟在帶頭的人後面左右兩側
func _follow(k: String, delta: float) -> void:
	var W: Dictionary = walkers[k]
	var lead: String = W.get("follow", "")
	if lead == "":
		return
	var L: Dictionary = walkers[lead]
	var lf: Vector2 = L["fwd"]
	var side := Vector2(-lf.y, lf.x)
	var goal: Vector2 = (L["pos"] as Vector2) - lf * 0.9 + side * float(W.get("off", 0.8))
	var pos: Vector2 = W["pos"]
	var d := pos.distance_to(goal)
	var moving := d > 0.15
	if moving:
		var step := minf(d, SPEED * 1.25 * delta * (3.0 if fast else 1.0))
		var dir := (goal - pos) / d
		W["pos"] = pos + dir * step
		if d > 0.4:
			W["fwd"] = (W["fwd"] as Vector2).lerp(dir, minf(1.0, delta * 10.0)).normalized()
	if moving != bool(W.get("moving", false)):
		W["moving"] = moving
		_walker_anim(k, moving)

## 抵達鏡頭：距離依建築大小，在建築四周找最不被擋住的角度（world.arrive_view）
func _arrive_view(id: String) -> Array:
	var P: Dictionary = world.places[id]
	var h: float = P.get("height", 5.0)
	var d := _arrive_dist(P)
	return world.arrive_view(id, d, h * 0.45 + d * 0.42, h * 0.38)

func arrive_cam_point(id: String) -> Vector2:
	return _arrive_view(id)[0]

func _arrive_dist(P: Dictionary) -> float:
	return clampf(float(P.get("extent", 12.0)) * 0.75 + float(P.get("height", 5.0)) * 0.9, 8.0, 24.0)
# ---------- 鏡頭 ----------
func _build_fly_route() -> void:
	# 首頁空拍：沿真實街道低空飛一圈（車站 → 第一味 → 超市 → 郵局 → 圖書館 → 便利商店 → 驛站 → 車站）
	var loop := ["station", "teatop", "market", "post", "library", "seven", "inn", "station"]
	for i in loop.size() - 1:
		var seg: Array = world.route(world.places[loop[i]]["door2"], world.places[loop[i + 1]]["door2"])
		for p in seg:
			if fly_route.is_empty() or (fly_route[-1] as Vector2).distance_to(p) > 0.5:
				fly_route.append(p)
func _fly_point(t: float) -> Vector2:
	var total := 0.0
	var segs := []
	for i in fly_route.size():
		var a: Vector2 = fly_route[i]
		var b: Vector2 = fly_route[(i + 1) % fly_route.size()]
		var L := a.distance_to(b)
		segs.append([a, b, L])
		total += L
	var s := fposmod(t, total)
	for sg in segs:
		if s <= sg[2]:
			return (sg[0] as Vector2).lerp(sg[1], s / maxf(sg[2], 0.001))
		s -= sg[2]
	return fly_route[0]

func _update_camera(delta: float) -> void:
	var want_pos := cam_pos
	var want_look := cam_look
	var want_up := cam_up
	var k := 1.0 - exp(-delta * 3.0)
	match cam_mode:
		"fly":
			fly_t += delta * 8.0
			var p := _fly_point(fly_t)
			var ahead := _fly_point(fly_t + 22.0)
			var back := _fly_point(fly_t - 6.0)
			var fwd := (ahead - back).normalized()
			want_pos = world.bend2(p - fwd * 4.0, 19.0)
			want_look = world.bend2(ahead, 1.0)
			want_up = world.bend2(p).normalized()
			k = 1.0 - exp(-delta * 1.2)
		"follow":
			var W: Dictionary = walkers[active]
			var p: Vector2 = W["pos"]
			var f: Vector2 = W["fwd"]
			want_pos = world.bend2(p - f * 6.5, 4.2)
			want_look = world.bend2(p + f * 2.0, 0.9)
			want_up = world.bend2(p).normalized()
		"face":
			var W: Dictionary = walkers[active]
			var p: Vector2 = W["pos"]
			var f: Vector2 = W["fwd"]
			var side := Vector2(-f.y, f.x)
			# 鏡頭往下看一點，角色就會在畫面上半部（下半部是題目面板）
			want_pos = world.bend2(p + f * 4.6 + side * 1.1, 1.9)
			want_look = world.bend2(p - f * 0.6, -0.75)
			want_up = world.bend2(p).normalized()
		"arrive":
			# 同時看到整棟建築和站在門口的角色；中間擋住的房子已經變半透明
			var P: Dictionary = world.places[arrive_id]
			var door: Vector2 = P["door2"]
			var pos2: Vector2 = P["pos2"]
			var h: float = P.get("height", 5.0)
			var view := _arrive_view(arrive_id)
			want_pos = world.bend2(view[0], view[1])
			want_look = world.bend2(pos2.lerp(door, 0.4), h * 0.38)
			want_up = world.bend2(door).normalized()
		"map":
			# 從正在走的角色頭頂上方往下看（東南街區在星球側面，也看得到）
			var mp: Vector2 = walkers[active]["pos"]
			var up_d: Vector3 = world.bend2(mp).normalized()
			var north: Vector3 = (world.bend2(mp + Vector2(0, -6)) - world.bend2(mp)).normalized()
			want_pos = up_d * (world.R + 300.0) - north * 120.0
			want_look = up_d * world.R
			want_up = north
	if cam_pos == Vector3.ZERO:
		cam_pos = want_pos
		cam_look = want_look
	cam_pos = cam_pos.lerp(want_pos, k)
	cam_look = cam_look.lerp(want_look, k)
	cam_up = cam_up.lerp(want_up, k).normalized()
	if cam_pos.distance_to(cam_look) > 0.01:
		cam.look_at_from_position(cam_pos, cam_look, cam_up)

# ---------- 聲音 ----------
func _build_audio() -> void:
	music = AudioStreamPlayer.new()
	add_child(music)
	voice = AudioStreamPlayer.new()
	add_child(voice)
	sfx_p = AudioStreamPlayer.new()
	add_child(sfx_p)
	for i in 6:
		var p := AudioStreamPlayer.new()
		add_child(p)
		sfx_pool.append(p)
	var s: AudioStream = load("res://assets/audio/music/bgm_street.mp3")
	if s is AudioStreamMP3:
		(s as AudioStreamMP3).loop = true
	music.stream = s
	_apply_volume()
	if not test_mode:
		music.play()

func _apply_volume() -> void:
	music.volume_db = VOL_DB[vol_level] - 6.0
	voice.volume_db = 0.0 if vol_level > 0 else -80.0
	sfx_p.volume_db = VOL_DB[vol_level]
	if vol_btn:
		vol_btn.text = VOL_NAME[vol_level]

func say(key: String) -> void:
	var path := "res://assets/audio/voice/%s.mp3" % key
	if not ResourceLoader.exists(path):
		return
	voice.stream = load(path)
	voice.play()
	music.volume_db = VOL_DB[vol_level] - 16.0
	await voice.finished
	music.volume_db = VOL_DB[vol_level] - 6.0

## 音效（Kenney CC0）：用 6 個播放器輪流播，連續按鈕、腳步聲才不會互相切掉
func sfx(key: String, pitch := 1.0) -> void:
	var path := "res://assets/audio/sfx/%s.ogg" % key
	if vol_level == 0 or not ResourceLoader.exists(path):
		return
	if not sfx_cache.has(key):
		sfx_cache[key] = load(path)
	var p: AudioStreamPlayer = sfx_pool[sfx_i]
	sfx_i = (sfx_i + 1) % sfx_pool.size()
	p.stream = sfx_cache[key]
	p.pitch_scale = pitch
	p.volume_db = VOL_DB[vol_level] + (-8.0 if key.begins_with("footstep") else 0.0)
	p.play()

func voice_key(word: String) -> String:
	return word.replace(" ", "_")

# ---------- 題組：六種人物模式（老師 2026-10-25 v2 規格） ----------
## ken：Where are you going? I'm going…｜zunbo：Where is he going? He's going…｜yuyu：Where is she going? She's going…
## mix：三人輪流、各用自己的句型｜we：三人一起走 Where are you going? We're going…
## where：三人一起走 Where's the __? It's on __ Road.／It's __ Street.（顏色路名，同一條路整場同色）
const MODES := [
	["ken", "Ken", "I'm going to the __."],
	["zunbo", "Zun-Bo 圳寶", "He's going to the __."],
	["yuyu", "Shuiling 水鈴", "She's going to the __."],
	["mix", "All three 三人綜合", "I'm / He's / She's"],
	["we", "Together 一起走", "We're going to the __."],
	["where", "Where's the __? 問路", "It's on Red Road."],
]
const COLORS := ["red", "yellow", "green", "blue", "black", "white", "purple", "pink", "orange", "brown"]
const COLOR_HEX := {"red": "#e03131", "yellow": "#fcc419", "green": "#2f9e44", "blue": "#1971c2", "black": "#212529",
	"white": "#f8f9fa", "purple": "#7048e8", "pink": "#f783ac", "orange": "#fd7e14", "brown": "#8b5a2b"}
const OWN_PATTERN := {"ken": "you", "zunbo": "he", "yuyu": "she"}
var mode := "mix"

func _group_mode() -> bool:
	return mode == "we" or mode == "where"

func _make_rounds() -> void:
	rounds.clear()
	var S: Dictionary = sets["sets"][set_idx]
	var targets: Array = S["targets"].duplicate()
	targets.shuffle()
	var first_opts: Array = sets["first_options"]
	# 第一題固定從 tea shop / post office / library / supermarket 中出（問路模式除外）
	if mode != "where":
		for i in targets.size():
			if world.places[targets[i]]["word"] in first_opts:
				targets.push_front(targets.pop_at(i))
				break
	var where := {"ken": "station", "yuyu": "station", "zunbo": "station"}
	var guard := 0
	while not targets.is_empty():
		var t: String = targets.pop_front()
		var who := mode
		if mode == "mix":
			who = ["ken", "zunbo", "yuyu"][rng.randi() % 3]
			if rounds.is_empty():
				who = "ken"
		elif _group_mode():
			who = "ken"         # 三人一起走：Ken 帶頭，另外兩位跟著
		if not walkers.has(who):
			who = "ken"
		if where[who] == t and guard < 20:
			guard += 1
			targets.append(t)
			continue
		var pattern: String = OWN_PATTERN.get(who, "you")
		if mode == "we":
			pattern = "we"
		elif mode == "where":
			pattern = "where"
		var fixed: Array = first_opts.duplicate() if rounds.is_empty() and mode != "where" else []
		rounds.append(_round(t, who, pattern, fixed))
		if _group_mode():
			for k in where:
				where[k] = t
		else:
			where[who] = t

func _round(target: String, who: String, pattern: String, fixed: Array) -> Dictionary:
	var word: String = world.places[target]["word"]
	var R := {"target": target, "who": "all" if _group_mode() else who, "lead": who, "pattern": pattern, "word": word}
	var opts: Array = fixed
	var answer := word
	if pattern == "where":
		var road: Dictionary = world.road_of(target)
		answer = road["color"]
		R["kind"] = road["kind"]
		R["road"] = road["group"]
		var pool: Array = COLORS.duplicate()
		pool.erase(answer)
		pool.shuffle()
		opts = [answer, pool[0], pool[1], pool[2]]
		opts.shuffle()
	elif opts.is_empty():
		var pool: Array = data["words"].duplicate()
		pool.erase(word)
		pool.shuffle()
		opts = [word, pool[0], pool[1], pool[2]]
		opts.shuffle()
	var q := ""
	var qkey := ""
	match pattern:
		"you":
			if rng.randf() < 0.5:
				q = "Ken, where are you going?"
				qkey = "q_you_1"
			else:
				q = "Where are you going, Ken?"
				qkey = "q_you_2"
		"we":
			q = "Where are you going?"
			qkey = "q_we"
		"where":
			q = "Where's the %s?" % word
			qkey = "q_where_%s" % voice_key(word)
		"he":
			q = "Where is he going?"
			qkey = "q_he"
		_:
			q = "Where is she going?"
			qkey = "q_she"
	R.merge({"question": q, "qkey": qkey, "options": opts, "correct": opts.find(answer), "answer": answer})
	return R

## 選項句子：x 是單字（或問路模式的顏色）
func sentence(Rd: Dictionary, x: String) -> String:
	match Rd["pattern"]:
		"you":
			return "I'm going to the %s." % x
		"we":
			return "We're going to the %s." % x
		"he":
			return "He's going to the %s." % x
		"where":
			return ("It's on %s Road." if Rd.get("kind", "Road") == "Road" else "It's %s Street.") % x.capitalize()
		_:
			return "She's going to the %s." % x

func answer_key(Rd: Dictionary, x: String) -> String:
	match Rd["pattern"]:
		"you":
			return "a_i_%s" % voice_key(x)
		"where":
			return "a_%s_%s" % ["road" if Rd.get("kind", "Road") == "Road" else "street", x]
		_:
			return "a_%s_%s" % [Rd["pattern"], voice_key(x)]

var color_tex := {}
func _color_icon(c: String) -> Texture2D:
	if not color_tex.has(c):
		var img := Image.create(40, 40, false, Image.FORMAT_RGBA8)
		img.fill(Color("#3a2a40"))
		img.fill_rect(Rect2i(3, 3, 34, 34), Color(COLOR_HEX[c]))
		color_tex[c] = ImageTexture.create_from_image(img)
	return color_tex[c]

## iPad 點按後按鈕會停在 hover／pressed 樣式：四種狀態都要換，選到的才看得出來
func _paint(b: Button, col: Color) -> void:
	for s in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(s, _style(col if s != "hover" else col.lightened(0.08)))

# ---------- UI 共用 ----------
func _style(bg: Color, border := Color(0.15, 0.12, 0.2), radius := 18, bw := 4) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(bw)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	sb.shadow_color = Color(0, 0, 0, 0.25)
	sb.shadow_size = 4
	return sb

func _btn(text: String, size := 26, bg := Color("#fff8e7")) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_override("font", font_bold)
	b.add_theme_font_size_override("font_size", size)
	b.add_theme_color_override("font_color", Color(0.15, 0.12, 0.2))
	b.add_theme_color_override("font_hover_color", Color(0.15, 0.12, 0.2))
	b.add_theme_color_override("font_pressed_color", Color(0.15, 0.12, 0.2))
	b.add_theme_color_override("font_disabled_color", Color(0.5, 0.5, 0.55))
	b.add_theme_stylebox_override("normal", _style(bg))
	b.add_theme_stylebox_override("hover", _style(bg.lightened(0.15)))
	b.add_theme_stylebox_override("pressed", _style(bg.darkened(0.12)))
	b.add_theme_stylebox_override("disabled", _style(bg.darkened(0.2), Color(0.4, 0.4, 0.45)))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	b.focus_mode = Control.FOCUS_NONE
	b.pressed.connect(func(): sfx("click"))
	return b

func _label(text: String, size := 28, col := Color(0.15, 0.12, 0.2), bold := true) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font_bold if bold else font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	return l

func _load_icons() -> void:
	for i in ICON_COUNT:
		var p := "res://assets/ui/emoji_%02d.png" % (i + 1)
		icons.append(load(p) if ResourceLoader.exists(p) else null)

## 組別圖示：有生成的科幻動漫風 emoji 就用圖，沒有就用彩色圓牌＋組號
func _icon(g: int, size: int) -> Control:
	var idx: int = group_icons[g] if g < group_icons.size() else g
	var tex: Texture2D = icons[idx % ICON_COUNT]
	if tex != null:
		var tr := TextureRect.new()
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(size, size)
		return tr
	var pc := PanelContainer.new()
	pc.custom_minimum_size = Vector2(size, size)
	pc.add_theme_stylebox_override("panel", _style(GROUP_COLORS[g % GROUP_COLORS.size()], Color(0.15, 0.12, 0.2), size / 2, 3))
	var l := _label(str(g + 1), int(size * 0.5))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	pc.add_child(l)
	return pc

func _icon_by_index(idx: int, size: int) -> Control:
	var tex: Texture2D = icons[idx % ICON_COUNT]
	if tex != null:
		var tr := TextureRect.new()
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(size, size)
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		return tr
	var pc := PanelContainer.new()
	pc.custom_minimum_size = Vector2(size, size)
	pc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pc.add_theme_stylebox_override("panel", _style(Color.from_hsv(float(idx) / ICON_COUNT, 0.55, 0.95), Color(0.15, 0.12, 0.2), size / 2, 3))
	return pc

func _build_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	_build_title()
	_build_setup()
	_build_hud()
	_build_result()

# ---------- 首頁 ----------
func _build_title() -> void:
	title_ui = Control.new()
	title_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	title_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(title_ui)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_CENTER)
	v.grow_horizontal = Control.GROW_DIRECTION_BOTH
	v.grow_vertical = Control.GROW_DIRECTION_BOTH
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 10)
	title_ui.add_child(v)
	var t := _label("Ershui Planet", 96, Color("#fff4c2"))
	t.add_theme_color_override("font_outline_color", Color("#3a2a40"))
	t.add_theme_constant_override("outline_size", 26)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var st := _label("二水小行星・逛街去！", 46, Color.WHITE)
	st.add_theme_color_override("font_outline_color", Color("#3a2a40"))
	st.add_theme_constant_override("outline_size", 18)
	st.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(st)
	var sub := _label("Where are you going?  I'm going to the ___.", 30, Color.WHITE)
	sub.add_theme_color_override("font_outline_color", Color("#3a2a40"))
	sub.add_theme_constant_override("outline_size", 14)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(sub)
	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 30)
	v.add_child(gap)
	var b := _btn("  Start 開始  ", 42, Color("#ffd166"))
	b.custom_minimum_size = Vector2(360, 86)
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	b.pressed.connect(_show_setup)
	v.add_child(b)
	continue_btn = _btn("  Continue 繼續上次  ", 30, Color("#cfe8ff"))
	continue_btn.custom_minimum_size = Vector2(360, 64)
	continue_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	continue_btn.pressed.connect(load_progress)
	v.add_child(continue_btn)

func _show_title() -> void:
	state = St.TITLE
	cam_mode = "fly"
	_hide_all()
	title_ui.visible = true
	var sv := _read_save()
	continue_btn.visible = not sv.is_empty()
	if not sv.is_empty():
		continue_btn.text = "  Continue 繼續上次（Q%d/%d）  " % [int(sv["qi"]) + 1, (sv["rounds"] as Array).size()]

func _hide_all() -> void:
	for c in [title_ui, setup_ui, hud, result_ui]:
		if c:
			c.visible = false

# ---------- 選組與題組 ----------
func _build_setup() -> void:
	setup_ui = Control.new()
	setup_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui.add_child(setup_ui)
	var dim := ColorRect.new()
	dim.color = Color(0.1, 0.1, 0.2, 0.35)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	setup_ui.add_child(dim)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _style(Color("#fffaf0"), Color(0.15, 0.12, 0.2), 28, 5))
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.offset_left = 60
	panel.offset_right = -60
	panel.offset_top = 10
	panel.offset_bottom = -10
	setup_ui.add_child(panel)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	panel.add_child(scroll)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 8)
	scroll.add_child(v)
	v.add_child(_label("1. How many groups?  幾組？", 30))
	var hc := HBoxContainer.new()
	hc.add_theme_constant_override("separation", 12)
	v.add_child(hc)
	for n in [5, 6, 7]:
		var b := _btn(" %d groups " % n, 26)
		b.pressed.connect(func(): _set_group_count(n))
		hc.add_child(b)
		setup_count_btns.append(b)
	v.add_child(_label("2. Pick an emoji for each group  點組別，再點圖示", 30))
	var gr := HBoxContainer.new()
	gr.name = "Groups"
	gr.add_theme_constant_override("separation", 10)
	v.add_child(gr)
	var ig := GridContainer.new()
	ig.name = "Icons"
	ig.columns = 12
	ig.add_theme_constant_override("h_separation", 8)
	v.add_child(ig)
	for i in ICON_COUNT:
		var b := Button.new()
		b.custom_minimum_size = Vector2(70, 70)
		b.add_theme_stylebox_override("normal", _style(Color("#ffffff"), Color(0.75, 0.72, 0.8), 14, 2))
		b.add_theme_stylebox_override("hover", _style(Color("#fff3c4"), Color(0.75, 0.72, 0.8), 14, 2))
		b.add_theme_stylebox_override("pressed", _style(Color("#ffe08a"), Color(0.75, 0.72, 0.8), 14, 2))
		b.focus_mode = Control.FOCUS_NONE
		var ic := _icon_by_index(i, 58)
		ic.position = Vector2(6, 6)
		ic.size = Vector2(58, 58)
		b.add_child(ic)
		b.pressed.connect(func(): _assign_icon(i))
		ig.add_child(b)
	v.add_child(_label("3. Who walks?  選人物與句型", 30))
	var mg := GridContainer.new()
	mg.columns = 3
	mg.add_theme_constant_override("h_separation", 10)
	mg.add_theme_constant_override("v_separation", 8)
	v.add_child(mg)
	for i in MODES.size():
		var mb := _btn("%s\n%s" % [MODES[i][1], MODES[i][2]], 19)
		mb.custom_minimum_size = Vector2(300, 64)
		mb.pressed.connect(func(): _set_mode(i))
		mg.add_child(mb)
		setup_mode_btns.append(mb)
	v.add_child(_label("4. Choose a route  選路線（每次順序都不同）", 30))
	var sg := GridContainer.new()
	sg.columns = 3
	sg.add_theme_constant_override("h_separation", 10)
	sg.add_theme_constant_override("v_separation", 8)
	v.add_child(sg)
	for i in sets["sets"].size():
		var b := _btn(sets["sets"][i]["name"], 22)
		b.custom_minimum_size = Vector2(300, 52)
		b.pressed.connect(func(): _set_set(i))
		sg.add_child(b)
		setup_set_btns.append(b)
	var go := _btn("  Go! 出發  ", 30, Color("#ffd166"))
	go_btn = go
	go.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	go.custom_minimum_size = Vector2(300, 72)
	go.pressed.connect(_start_game)
	v.add_child(go)

func _show_setup() -> void:
	state = St.SETUP
	_hide_all()
	setup_ui.visible = true
	if group_icons.is_empty():
		for i in 7:
			group_icons.append(i)
	_set_group_count(group_count)
	_set_mode(MODES.map(func(m): return m[0]).find(mode))
	_set_set(set_idx)

func _set_group_count(n: int) -> void:
	group_count = n
	setup_sel_group = mini(setup_sel_group, n - 1)
	for i in setup_count_btns.size():
		_paint(setup_count_btns[i], Color("#ffd166") if [5, 6, 7][i] == n else Color("#fff8e7"))
	_refresh_setup_groups()

func _refresh_setup_groups() -> void:
	var gr: HBoxContainer = setup_ui.find_child("Groups", true, false)
	for c in gr.get_children():
		c.queue_free()
	setup_group_btns.clear()
	for g in group_count:
		var b := Button.new()
		b.custom_minimum_size = Vector2(118, 96)
		var sel := g == setup_sel_group
		b.add_theme_stylebox_override("normal", _style(GROUP_COLORS[g].lightened(0.55), Color("#3a2a40") if sel else Color(0.7, 0.7, 0.75), 16, 5 if sel else 2))
		b.add_theme_stylebox_override("hover", _style(GROUP_COLORS[g].lightened(0.4), Color("#3a2a40"), 16, 4))
		b.focus_mode = Control.FOCUS_NONE
		var hb := VBoxContainer.new()
		hb.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hb.alignment = BoxContainer.ALIGNMENT_CENTER
		hb.set_anchors_preset(Control.PRESET_FULL_RECT)
		var ic := _icon_by_index(group_icons[g], 56)
		ic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		hb.add_child(ic)
		var l := _label("Group %d" % (g + 1), 18)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hb.add_child(l)
		b.add_child(hb)
		b.pressed.connect(func(): setup_sel_group = g; _refresh_setup_groups())
		gr.add_child(b)
		setup_group_btns.append(b)

func _assign_icon(i: int) -> void:
	# 同一個圖示只給一組：別組已經用了就互換
	var other := group_icons.find(i)
	if other != -1 and other != setup_sel_group:
		group_icons[other] = group_icons[setup_sel_group]
	group_icons[setup_sel_group] = i
	setup_sel_group = (setup_sel_group + 1) % group_count
	_refresh_setup_groups()

func _set_mode(i: int) -> void:
	mode = MODES[i][0]
	for k in setup_mode_btns.size():
		_paint(setup_mode_btns[k], Color("#a5d8ff") if k == i else Color("#fff8e7"))
	_refresh_go()

func _refresh_go() -> void:
	if go_btn:
		var mi: int = MODES.map(func(m): return m[0]).find(mode)
		go_btn.text = "  Go! 出發：%s ・ %s  " % [MODES[mi][1], sets["sets"][set_idx]["name"]]

func _set_set(i: int) -> void:
	set_idx = i
	for k in setup_set_btns.size():
		_paint(setup_set_btns[k], Color("#9be7c4") if k == i else Color("#fff8e7"))
	_refresh_go()

# ---------- 遊戲畫面 ----------
func _build_hud() -> void:
	hud = Control.new()
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(hud)
	chips_box = HBoxContainer.new()
	chips_box.position = Vector2(12, 12)
	chips_box.add_theme_constant_override("separation", 8)
	hud.add_child(chips_box)
	# 右上角功能鈕：直排，避免和左上角的組別分數重疊
	var tr := VBoxContainer.new()
	tr.anchor_left = 1.0
	tr.anchor_right = 1.0
	tr.offset_right = -12
	tr.offset_left = -12
	tr.offset_top = 12
	tr.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	tr.add_theme_constant_override("separation", 6)
	hud.add_child(tr)
	map_btn = _btn("Map 地圖", 20)
	map_btn.pressed.connect(_toggle_map)
	tr.add_child(map_btn)
	fast_btn = _btn("Fast ×1", 20)
	fast_btn.pressed.connect(_toggle_fast)
	tr.add_child(fast_btn)
	vol_btn = _btn(VOL_NAME[vol_level], 20)
	vol_btn.pressed.connect(func(): vol_level = (vol_level + 1) % 4; _apply_volume())
	tr.add_child(vol_btn)
	var rep := _btn("Repeat 再聽", 20)
	rep.pressed.connect(_repeat_voice)
	tr.add_child(rep)
	var save_btn := _btn("Save 保留", 20, Color("#cfe8ff"))
	save_btn.pressed.connect(save_progress)
	tr.add_child(save_btn)
	var home := _btn("Home 首頁", 20)
	home.pressed.connect(_go_home)
	tr.add_child(home)
	# 題目面板
	qpanel = PanelContainer.new()
	qpanel.add_theme_stylebox_override("panel", _style(Color(1, 0.98, 0.93, 0.96), Color(0.15, 0.12, 0.2), 26, 5))
	qpanel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	qpanel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	qpanel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	qpanel.position.y = -14
	hud.add_child(qpanel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	qpanel.add_child(v)
	var qh := HBoxContainer.new()
	qh.alignment = BoxContainer.ALIGNMENT_CENTER
	qh.add_theme_constant_override("separation", 16)
	v.add_child(qh)
	q_sub = _label("Q1", 26, Color("#7b5ea7"))
	qh.add_child(q_sub)
	q_label = _label("Ken, where are you going?", 44)
	qh.add_child(q_label)
	var og := GridContainer.new()
	opt_grid = og
	og.columns = 2
	og.add_theme_constant_override("h_separation", 10)
	og.add_theme_constant_override("v_separation", 8)
	v.add_child(og)
	for i in 4:
		var b := _btn("A  I'm going to the library.", 26)
		b.custom_minimum_size = Vector2(540, 54)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.pressed.connect(func(): _speak_option(i))
		og.add_child(b)
		opt_buttons.append(b)
	bet_box = GridContainer.new()
	bet_box.add_theme_constant_override("h_separation", 10)
	bet_box.add_theme_constant_override("v_separation", 6)
	bet_box.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(bet_box)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 16)
	v.add_child(row)
	start_btn = _btn("  Start ▶  ", 32, Color("#ffd166"))
	start_btn.custom_minimum_size = Vector2(260, 60)
	start_btn.pressed.connect(_on_start)
	row.add_child(start_btn)
	# 揭曉後要先按「聽句子」聽完正確句子，Next 才能按（老師 2026-10-25 要求）
	listen_btn = _btn("  ♪ Listen 聽句子  ", 32, Color("#ffd166"))
	listen_btn.custom_minimum_size = Vector2(300, 60)
	listen_btn.pressed.connect(_on_listen)
	row.add_child(listen_btn)
	next_btn = _btn("  Next ▶  ", 32, Color("#9be7c4"))
	next_btn.custom_minimum_size = Vector2(260, 60)
	next_btn.pressed.connect(_on_next)
	row.add_child(next_btn)
	walk_caption = _label("", 40, Color.WHITE)
	walk_caption.add_theme_color_override("font_outline_color", Color("#3a2a40"))
	walk_caption.add_theme_constant_override("outline_size", 16)
	walk_caption.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	walk_caption.grow_horizontal = Control.GROW_DIRECTION_BOTH
	walk_caption.grow_vertical = Control.GROW_DIRECTION_BEGIN
	walk_caption.position.y = -40
	walk_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hud.add_child(walk_caption)

func _start_game() -> void:
	scores.clear()
	for g in group_count:
		scores.append(0)
	_make_rounds()
	qi = 0
	var start: Vector2 = world.places["station"]["door2"]
	walkers["ken"]["pos"] = start + Vector2(-0.9, 0.0)
	walkers["yuyu"]["pos"] = start + Vector2(0.9, 0.0)
	if walkers.has("zunbo"):
		walkers["zunbo"]["pos"] = start + Vector2(0.0, 1.3)
	for k in walkers:
		walkers[k]["path"] = []
		walkers[k]["fwd"] = Vector2(0, 1)
	_hide_all()
	hud.visible = true
	_build_chips()
	_show_question()

func _build_chips() -> void:
	for c in chips_box.get_children():
		c.queue_free()
	chip_nodes.clear()
	for g in group_count:
		var pc := PanelContainer.new()
		pc.add_theme_stylebox_override("panel", _style(GROUP_COLORS[g].lightened(0.6), Color(0.15, 0.12, 0.2), 16, 3))
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 6)
		pc.add_child(h)
		h.add_child(_icon(g, 44))
		var vb := VBoxContainer.new()
		vb.add_theme_constant_override("separation", -6)
		h.add_child(vb)
		vb.add_child(_label("G%d" % (g + 1), 16))
		var sl := _label("0", 30)
		vb.add_child(sl)
		var bl := _label("", 26, Color("#7b5ea7"))
		h.add_child(bl)
		chips_box.add_child(pc)
		chip_nodes.append({"panel": pc, "score": sl, "bet": bl})

func _refresh_chips() -> void:
	for g in group_count:
		chip_nodes[g]["score"].text = str(scores[g])
		chip_nodes[g]["bet"].text = LETTERS[bets[g]] if bets.has(g) else ""

func _show_question() -> void:
	state = St.QUESTION
	var Rd: Dictionary = rounds[qi]
	active = Rd["lead"]
	world.clear_fade()
	world.hide_road_color()
	cam_mode = "face"
	bets.clear()
	q_sub.text = "Q%d/%d" % [qi + 1, rounds.size()]
	q_label.text = Rd["question"]
	for i in 4:
		var b: Button = opt_buttons[i]
		b.text = "%s  %s" % [LETTERS[i], sentence(Rd, Rd["options"][i])]
		b.icon = _color_icon(Rd["options"][i]) if Rd["pattern"] == "where" else null
		_paint(b, Color("#fff8e7"))
		b.disabled = false
	_build_bet_row()
	qpanel.visible = true
	opt_grid.visible = true
	bet_box.visible = true
	q_label.add_theme_color_override("font_color", Color(0.15, 0.12, 0.2))
	for g in chip_nodes.size():
		chip_nodes[g]["panel"].add_theme_stylebox_override("panel", _style(GROUP_COLORS[g].lightened(0.6), Color(0.15, 0.12, 0.2), 16, 3))
	start_btn.visible = true
	start_btn.disabled = true
	next_btn.visible = false
	listen_btn.visible = false
	walk_caption.text = ""
	_refresh_chips()
	sfx("question")
	say(Rd["qkey"])

func _build_bet_row() -> void:
	for c in bet_box.get_children():
		c.queue_free()
	bet_buttons.clear()
	bet_box.columns = int(ceil(group_count / 2.0))
	for g in group_count:
		var pc := PanelContainer.new()
		pc.add_theme_stylebox_override("panel", _style(GROUP_COLORS[g].lightened(0.6), Color(0.15, 0.12, 0.2), 14, 2))
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 3)
		pc.add_child(h)
		h.add_child(_icon(g, 34))
		var row := []
		for i in 4:
			var b := _btn(LETTERS[i], 20)
			b.custom_minimum_size = Vector2(34, 36)
			b.pressed.connect(func(): _bet(g, i))
			h.add_child(b)
			row.append(b)
		bet_buttons.append(row)
		bet_box.add_child(pc)

func _bet(g: int, i: int) -> void:
	if state != St.QUESTION:
		return
	bets[g] = i
	for k in 4:
		_paint(bet_buttons[g][k], Color("#ffd166") if k == i else Color("#fff8e7"))
	start_btn.disabled = bets.size() < group_count
	_refresh_chips()

func _speak_option(i: int) -> void:
	var Rd: Dictionary = rounds[qi]
	say(answer_key(Rd, Rd["options"][i]))

func _repeat_voice() -> void:
	if rounds.is_empty():
		return
	var Rd: Dictionary = rounds[qi]
	if state == St.REVEAL:
		say(answer_key(Rd, Rd["answer"]))
	else:
		say(Rd["qkey"])

func _on_start() -> void:
	if state != St.QUESTION or bets.size() < group_count:
		return
	state = St.WALKING
	var Rd: Dictionary = rounds[qi]
	var lead: String = Rd["lead"]
	var W: Dictionary = walkers[lead]
	var P: Dictionary = world.places[Rd["target"]]
	walk_from = W["pos"]
	W["path"] = world.route(W["pos"], P["door2"])
	_walker_anim(lead, true)
	for k in walkers:
		walkers[k]["follow"] = ""
	if Rd["who"] == "all":
		var off := {"yuyu": 0.85, "zunbo": -0.85}
		for k in off:
			if walkers.has(k):
				walkers[k]["follow"] = lead
				walkers[k]["off"] = off[k]
	sfx("unlock")
	cam_mode = "follow"
	bet_box.visible = false
	start_btn.visible = false
	qpanel.visible = false
	match Rd["pattern"]:
		"where":
			walk_caption.text = "Let's find the %s!" % Rd["word"]
		"we":
			walk_caption.text = "Ken, Zun-Bo & Shuiling…  Where are they going?"
		_:
			walk_caption.text = "%s  Where is %s going…?" % [W["name"], {"yuyu": "she", "zunbo": "he", "ken": "he"}[lead]]

func _on_arrive(k: String) -> void:
	if state != St.WALKING or k != active:
		return
	state = St.REVEAL
	var Rd: Dictionary = rounds[qi]
	var P: Dictionary = world.places[Rd["target"]]
	var W: Dictionary = walkers[k]
	sfx("arrive")
	W["fwd"] = ((P["pos2"] as Vector2) - (P["door2"] as Vector2)).normalized()
	for f in walkers:
		if walkers[f].get("follow", "") != "":
			walkers[f]["fwd"] = W["fwd"]
	arrive_id = Rd["target"]
	cam_mode = "arrive"
	world.fade_between(arrive_cam_point(arrive_id), P["pos2"], arrive_id)
	if Rd["pattern"] == "where":
		world.show_road_color(Rd["road"], Rd["answer"], P["door2"], sentence(Rd, Rd["answer"]).replace("It's on ", "").replace("It's ", "").trim_suffix("."))
	walk_caption.text = ""
	# 揭曉時面板縮小，只留正確句子，讓大家看到目的地；各組對錯顯示在左上角分數牌
	qpanel.visible = true
	opt_grid.visible = false
	bet_box.visible = false
	q_sub.text = LETTERS[Rd["correct"]]
	q_label.text = sentence(Rd, Rd["answer"])
	q_label.add_theme_color_override("font_color", Color("#2b8a3e"))
	for g in group_count:
		var hit: bool = bets.get(g, -1) == Rd["correct"]
		if hit:
			scores[g] += POINTS
			_pop_points(g)
		chip_nodes[g]["panel"].add_theme_stylebox_override("panel", _style(Color("#b2f2bb") if hit else Color("#e9ecef"), Color("#2b8a3e") if hit else Color("#c92a2a"), 16, 5))
	_refresh_chips()
	sfx("correct" if bets.values().has(Rd["correct"]) else "wrong")
	listened = false
	listen_btn.visible = true
	listen_btn.disabled = false
	next_btn.visible = true
	next_btn.disabled = true
	next_btn.text = "  Next ▶  " if qi < rounds.size() - 1 else "  Results  "

func _on_listen() -> void:
	if state != St.REVEAL:
		return
	var Rd: Dictionary = rounds[qi]
	listen_btn.disabled = true
	await say(answer_key(Rd, Rd["answer"]))
	listened = true
	listen_btn.disabled = false
	next_btn.disabled = false

func _pop_points(g: int) -> void:
	var pc: PanelContainer = chip_nodes[g]["panel"]
	var l := _label("+%d" % POINTS, 40, Color("#2b8a3e"))
	l.add_theme_color_override("font_outline_color", Color.WHITE)
	l.add_theme_constant_override("outline_size", 10)
	hud.add_child(l)
	l.position = pc.global_position + Vector2(pc.size.x * 0.5, pc.size.y)
	var tw := create_tween()
	tw.tween_property(l, "position:y", l.position.y + 40, 0.9)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 0.9).set_delay(0.5)
	tw.tween_callback(l.queue_free)
	var tw2 := create_tween()
	pc.pivot_offset = pc.size / 2.0
	tw2.tween_interval(0.25 + g * 0.12)
	tw2.tween_callback(func(): sfx("correct", 1.4 + g * 0.05))
	tw2.tween_property(pc, "scale", Vector2(1.15, 1.15), 0.15)
	tw2.tween_property(pc, "scale", Vector2.ONE, 0.2)

func _on_next() -> void:
	if state != St.REVEAL or not listened:
		return
	if qi < rounds.size() - 1:
		qi += 1
		_show_question()
	else:
		_show_result()

func _toggle_map() -> void:
	if cam_mode == "map":
		cam_mode = {St.WALKING: "follow", St.REVEAL: "arrive"}.get(state, "face")
		map_btn.text = "Map 地圖"
	else:
		cam_mode = "map"
		map_btn.text = "Back 回來"

func _toggle_fast() -> void:
	fast = not fast
	fast_btn.text = "Fast ×3" if fast else "Fast ×1"
	for k in walkers:
		_walker_anim(k, walkers[k]["path"].size() > 0)

func _go_home() -> void:
	for k in walkers:
		walkers[k]["path"] = []
		_walker_anim(k, false)
	_show_title()

# ---------- 保留進度（老師 2026-10-25：遊戲中途按「保留」儲存，下次從首頁「繼續上次」接著玩） ----------
## 存在瀏覽器（網頁版是 IndexedDB）；只存組數、圖示、分數、題組與題目順序、目前第幾題、角色位置，不存任何學生資料
func save_progress() -> void:
	if rounds.is_empty() or state == St.RESULT:
		return
	var next_q := qi
	var ken_pos: Vector2 = walkers["ken"]["pos"]
	var yy_pos: Vector2 = walkers["yuyu"]["pos"]
	var zb_pos: Vector2 = walkers["zunbo"]["pos"] if walkers.has("zunbo") else Vector2.ZERO
	if state == St.REVEAL and listened:
		next_q = qi + 1                       # 這題已經揭曉、也聽過句子 → 下次從下一題開始
	elif state == St.WALKING:
		if active == "ken":
			ken_pos = walk_from               # 走到一半 → 回到出發點重新押注
		elif active == "zunbo":
			zb_pos = walk_from
		else:
			yy_pos = walk_from
	elif state == St.REVEAL:
		# 揭曉但還沒聽句子：分數已加，下次從這題的「聽句子」開始太複雜，改成從下一題開始
		next_q = qi + 1
	var d := {
		"version": 1, "saved_at": Time.get_datetime_string_from_system(), "group_count": group_count,
		"group_icons": group_icons, "scores": scores, "set_idx": set_idx, "mode": mode, "rounds": rounds, "qi": next_q,
		"ken": [ken_pos.x, ken_pos.y], "yuyu": [yy_pos.x, yy_pos.y], "zunbo": [zb_pos.x, zb_pos.y],
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		_toast("Save failed 儲存失敗")
		return
	f.store_string(JSON.stringify(d))
	f.close()
	_toast("Saved ✓ 已保留（Q%d/%d）" % [mini(next_q + 1, rounds.size()), rounds.size()])

func _read_save() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(d) != TYPE_DICTIONARY or int(d.get("version", 0)) != 1:
		return {}
	return d

func _delete_save() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(SAVE_PATH)

func load_progress() -> void:
	var d := _read_save()
	if d.is_empty():
		return
	group_count = int(d["group_count"])
	group_icons = []
	for x in d["group_icons"]:
		group_icons.append(int(x))
	scores = []
	for x in d["scores"]:
		scores.append(int(x))
	set_idx = int(d["set_idx"])
	mode = String(d.get("mode", "mix"))
	rounds = []
	for r in d["rounds"]:
		var rr: Dictionary = r
		rr["correct"] = int(rr["correct"])
		rounds.append(rr)
	qi = int(d["qi"])
	walkers["ken"]["pos"] = Vector2(float(d["ken"][0]), float(d["ken"][1]))
	walkers["yuyu"]["pos"] = Vector2(float(d["yuyu"][0]), float(d["yuyu"][1]))
	if walkers.has("zunbo") and d.has("zunbo"):
		walkers["zunbo"]["pos"] = Vector2(float(d["zunbo"][0]), float(d["zunbo"][1]))
	for k in walkers:
		walkers[k]["path"] = []
		_walker_anim(k, false)
	_hide_all()
	hud.visible = true
	_build_chips()
	cam_pos = Vector3.ZERO
	if qi >= rounds.size():
		_show_result()
	else:
		_show_question()
	_toast("Welcome back! 接著玩 Q%d" % (qi + 1))

func _toast(text: String) -> void:
	if toast == null:
		toast = _label("", 30, Color.WHITE)
		toast.add_theme_color_override("font_outline_color", Color("#2b5f8a"))
		toast.add_theme_constant_override("outline_size", 14)
		toast.set_anchors_preset(Control.PRESET_CENTER_TOP)
		toast.grow_horizontal = Control.GROW_DIRECTION_BOTH
		toast.position.y = 96
		toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		ui.add_child(toast)
	toast.text = text
	toast.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(1.6)
	tw.tween_property(toast, "modulate:a", 0.0, 0.6)

# ---------- 結果 ----------
func _build_result() -> void:
	result_ui = Control.new()
	result_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui.add_child(result_ui)
	var dim := ColorRect.new()
	dim.color = Color(0.1, 0.1, 0.2, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	result_ui.add_child(dim)
	var panel := PanelContainer.new()
	panel.name = "Panel"
	panel.add_theme_stylebox_override("panel", _style(Color("#fffaf0"), Color(0.15, 0.12, 0.2), 28, 5))
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	result_ui.add_child(panel)

func _show_result() -> void:
	_delete_save()
	state = St.RESULT
	cam_mode = "map"
	sfx("victory")
	_hide_all()
	result_ui.visible = true
	var panel: PanelContainer = result_ui.get_node("Panel")
	for c in panel.get_children():
		c.queue_free()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	panel.add_child(v)
	var t := _label("Results 結果", 54)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var sub := _label("%s ・ %d questions" % [sets["sets"][set_idx]["name"], rounds.size()], 22, Color("#7b5ea7"))
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(sub)
	var order := range(group_count)
	order.sort_custom(func(a, b): return scores[a] > scores[b])
	var top: int = scores[order[0]]
	for g in order:
		var pc := PanelContainer.new()
		var win: bool = scores[g] == top
		pc.add_theme_stylebox_override("panel", _style(Color("#ffe066") if win else GROUP_COLORS[g].lightened(0.65), Color(0.15, 0.12, 0.2), 16, 3))
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 16)
		pc.add_child(h)
		var rank := _label("🏆" if win else "  ", 30)
		h.add_child(_label("★" if win else "  ", 34, Color("#e8590c")))
		h.add_child(_icon(g, 52))
		var nm := _label("Group %d" % (g + 1), 30)
		nm.custom_minimum_size = Vector2(200, 0)
		h.add_child(nm)
		h.add_child(_label("%d points" % scores[g], 34))
		rank.queue_free()
		v.add_child(pc)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 16)
	v.add_child(row)
	var again := _btn("Play again 再玩一次", 26, Color("#ffd166"))
	again.pressed.connect(_start_game)
	row.add_child(again)
	var setup := _btn("New groups 重新設定", 26)
	setup.pressed.connect(_show_setup)
	row.add_child(setup)

# ---------- 自動測試（--test）：跑完一整套並截圖 ----------
func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://test_%s.png" % name)
	print("SHOT ", name)

func _wait(sec: float) -> void:
	await get_tree().create_timer(sec).timeout

func _run_test() -> void:
	await _wait(2.5)
	await _shot("01_title")
	_show_setup()
	await _wait(0.5)
	_set_group_count(6)
	# 環境變數 MODE=ken/zunbo/yuyu/mix/we/where、SET=0..4；ARRIVALS=1 只拍每站抵達畫面
	var m := OS.get_environment("MODE")
	if m != "":
		_set_mode(MODES.map(func(x): return x[0]).find(m))
	_set_set(int(OS.get_environment("SET")) if OS.get_environment("SET") != "" else 0)
	await _wait(0.3)
	await _shot("02_setup_%s" % mode)
	if OS.get_environment("ARRIVALS") != "":
		await _test_arrivals()
		get_tree().quit()
		return
	_start_game()
	fast = true
	await _wait(1.5)
	await _shot("03_question_%s" % mode)
	var total := rounds.size()
	for n in total:
		if n == 4:
			save_progress()
			var sv := _read_save()
			print("SAVE qi=", sv.get("qi"), " mode=", sv.get("mode"), " scores=", sv.get("scores"))
			load_progress()
			await _wait(0.6)
			print("LOAD qi=", qi, " mode=", mode, " scores=", scores)
		for g in group_count:
			_bet(g, rng.randi() % 4)
		_on_start()
		if n == 1:
			await _wait(1.0)
			await _shot("05_walking_%s" % mode)
		var guard := 0.0
		while state == St.WALKING and guard < 60.0:
			await _wait(0.2)
			guard += 0.2
		var Rd: Dictionary = rounds[qi]
		print("ROUND %d %s -> %s | %s | %s | state=%d" % [n + 1, Rd["who"], Rd["target"], Rd["question"], sentence(Rd, Rd["answer"]), state])
		await _wait(1.2)
		if n < 2:
			await _shot("06_reveal_%s_%02d" % [mode, n + 1])
		await _on_listen()
		_on_next()
		await _wait(0.4)
	await _wait(1.0)
	await _shot("07_result_%s" % mode)
	print("TEST DONE mode=%s scores=%s" % [mode, scores])
	get_tree().quit()

## 每個會去的地點：Ken 站在門口、用抵達鏡頭拍一張（檢查表）
func _test_arrivals() -> void:
	var ids := []
	for S in sets["sets"]:
		for t in S["targets"]:
			if not t in ids:
				ids.append(t)
	hud.visible = false
	setup_ui.visible = false
	var only := OS.get_environment("ONLY")
	if only != "":
		ids = [only]
	for id in ids:
		var P: Dictionary = world.places[id]
		active = "ken"
		var W: Dictionary = walkers["ken"]
		W["pos"] = P["door2"]
		W["fwd"] = ((P["pos2"] as Vector2) - (P["door2"] as Vector2)).normalized()
		walkers["yuyu"]["pos"] = (P["door2"] as Vector2) + Vector2(1.0, 0.6)
		walkers["zunbo"]["pos"] = (P["door2"] as Vector2) + Vector2(-1.0, 0.6)
		arrive_id = id
		cam_mode = "arrive"
		cam_pos = Vector3.ZERO
		world.fade_between(arrive_cam_point(id), P["pos2"], id)
		await _wait(0.6)
		await _shot("arr_%s" % id)
	print("ARRIVALS ", ids.size())
