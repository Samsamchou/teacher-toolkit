extends Node3D
## 二水小行星 Free Time 版（HWG7 U03，Ken A 路線 11 題）
## 規格：3D planet/rdq/RDQ-spec-freetime-planet-hwg7u03-20261109.md（rev 1–3）
## 兩種玩法：
##  A. 全班分組猜猜看（投影、不登入）：聽情境 → 3 個句子選項 → 各組押選項＋押分 1–3 → Ken 走去做那件事 → 加減分 → 11 題後排名＋慶祝。不出現線索。
##  B. 兩人一組線索挑戰（iPad，外框 ../ershui-3d-quest-freetime/ 兩人學號連打）：情境 → 一種線索（音效／3 icons／無聲影片／程式動畫）
##     → 外框出題（選擇 3、拖放 3、AI 口說 5）→ Ken 演出答案。
## 舊的「猜地點」題組（sets.json、listen.json、六種人物模式）已移除；街道、學校、空拍、聲音、存檔、教師後台外框都保留。

const World := preload("res://scripts/world.gd")
const Home := preload("res://scripts/home_interior.gd")
const Pose := preload("res://scripts/procedural_pose.gd")
const ClueAnim := preload("res://scripts/clue_anim.gd")
const ActMotion := preload("res://scripts/act_motion.gd")
const KEN_H := 1.3
const FOOT := 0.1
const LETTERS := ["A", "B", "C"]
const GROUP_COLORS := [Color("#ff6b6b"), Color("#ffa94d"), Color("#ffd43b"), Color("#69db7c"), Color("#4dabf7"), Color("#9775fa"), Color("#f783ac"), Color("#38d9a9")]
const ICON_COUNT := 12
const VOL_DB := [-80.0, -18.0, -11.0, -5.0]
const VOL_NAME := ["Sound Off", "Sound 1", "Sound 2", "Sound 3"]
## 押注規則（分組）：每組開始 10 分；每題選 A/B/C 並押 1、2 或 3 分；答對 ＋押的分數，答錯 -押的分數（最低 0 分）。
const START_POINTS := 10
const WAGERS := [1, 2, 3]
const PAIR_POINTS := 10
const PAIR_URL := "../ershui-3d-quest-freetime/"
const SAVE_PATH := "user://ershui_freetime_save.json"
const CLUE_KINDS := ["sfx", "icons", "video", "anim"]
const CLUE_NAME := {"sfx": "Listen! 聽聲音", "icons": "3 pictures 看 3 張圖", "video": "Watch! 看影片", "anim": "Watch! 看動畫"}
## 真的速度（m/s）：動作播放速度＝速度 ÷ 動作原地踩地速度 → 腳不滑（老師 11/10：所有動作合現實）
## 路太長：走 SKIP_AFTER 秒後淡出，跳到剩 SKIP_END 秒的地方（畫面寫 A few minutes later…）
const TRAVEL_SPEED := {"walk": 1.4, "jog": 2.0, "bike": 4.5}
const SKIP_AFTER := 5.0
const SKIP_END := 4.5
const INDOOR_OUTLINE := 0.15   # 室內近距離鏡頭描邊（戶外遠景維持 0.3）；手再乘 0.25

var world: Node3D
var cam: Camera3D
var font: Font
var font_bold: Font
var data: Dictionary
var ft: Dictionary
var items: Array = []
var poses: Dictionary = {}
var rng := RandomNumberGenerator.new()
var test_mode := false

# Ken
var W := {}          # {node, model, anim, sk, pos, fwd, path, travel}
var fast := false
var bike: Node3D
var bike_wheels: Array = []
var act_root: Node3D        # 戶外活動道具（籃框、球、帳篷、營火、球棒…）
var act_kind := ""
var act_t := 0.0
var ball: Node3D
var hp_attach: BoneAttachment3D   # 戶外聽音樂的耳機
var am: ActMotion                  # 動作與道具同步（腳踏車、運球、棒球、貼地）
var anim_rate := 1.0               # 動作播放倍率（手動更新 AnimationPlayer）
var anim_ground := {}
var anim_rate_fix := {}            # 播放倍率微調（data/interior/anim_rate.json：踩穩的腳滑最少的倍率）              # 每個動作模型要上移多少才貼地（data/interior/anim_ground.json，motion_check 量的）
var travel_t := 0.0
var skipping := false
var parked: Node3D                 # 停好的腳踏車（下車後留在原地）
var roam := false                  # 演出時繼續慢跑／騎車（沿路來回）
var roam_cam2 := Vector2.INF
var roam_side := 1.0
var roam_t := 0.0
var hud_col: VBoxContainer
var bb_cut := false

# 遊戲狀態
enum St { TITLE, SETUP, QUESTION, CLUE, ANSWER, WALKING, REVEAL, RESULT }
var state := St.TITLE
var pair := false
var pair_ids: Array = []
var group_count := 6
var group_icons: Array = []
var scores: Array = []
var qi := 0
var bets := {}       # 組 → 選項
var wagers := {}     # 組 → 押的分數
var last_delta := {} # 組 → 這題加減
var pair_correct := false
var run_seed := 0
var clue_order: Array = []
var cam_mode := "fly"
var fly_t := 0.0
var intro_t := 0.0
var fixed_cam: Array = []
const INTRO_SPIN := 6.5
const INTRO_END := 10.5
var fly_route: Array = []
var cam_pos := Vector3.ZERO
var cam_look := Vector3.ZERO
var cam_up := Vector3.UP
var face_cam: Array = []
var listened := false
var follow_t := 0.0
var follow_pick: Array = []
var follow_cam2 := Vector2.INF
var follow_h := 4.2

# UI
var ui: CanvasLayer
var title_ui: Control
var setup_ui: Control
var hud: Control
var result_ui: Control
var chips_box: HBoxContainer
var chip_nodes: Array = []
var qpanel: PanelContainer
var q_sub: Label
var q_scene: Label
var q_ask: Label
var opt_box: VBoxContainer
var opt_buttons: Array = []
var bet_box: GridContainer
var bet_buttons: Array = []     # [group] -> {opt:[Button], wager:[Button]}
var start_btn: Button
var next_btn: Button
var listen_btn: Button
var answer_lbl: Label
var walk_caption: Label
var toast: Label
var vol_btn: Button
var fast_btn: Button
var map_btn: Button
var save_btn: Button
var icons: Array = []
var group_btns_row: HBoxContainer
var pair_row: HBoxContainer
var sid_label: Label
var continue_btn: Button
var setup_count_btns: Array = []
var setup_sel_group := 0
var fade_rect: ColorRect
var clue_card: PanelContainer
var clue_body: Control
var clue_title: Label
var clue_btn: Button
var clue_replay_btn: Button
var clue_video: VideoStreamPlayer
var clue_done := false
var confetti: Control

# 聲音
var music: AudioStreamPlayer
var voice: AudioStreamPlayer
var clue_audio: AudioStreamPlayer
var sfx_pool: Array = []
var sfx_i := 0
var sfx_cache := {}
var vol_level := 1
var step_timer := 0.0

# 外框
var ask_poll := false
var ask_t := 0.0
var test_host := {}

# 室內
var interior: Node3D
var interior_ken: Node3D
var interior_sk: Skeleton3D
var interior_props: Array = []
var interior_env: Environment
var world_env: WorldEnvironment
var world_env_saved: Environment
var in_home := false
var interior_shot := ""
var interior_cam: Transform3D
var interior_fov := 45.0
var screen_t := 0.0

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
	ft = JSON.parse_string(FileAccess.get_file_as_string("res://data/freetime_ken_a.json"))
	items = ft["items"]
	poses = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/poses.json"))
	world = World.new()
	world.name = "World"
	add_child(world)
	world.build(data, font, font_bold)
	for c in world.get_children():
		if c is WorldEnvironment:
			world_env = c
	cam = Camera3D.new()
	cam.fov = 50
	cam.near = 0.05
	cam.far = 2500
	add_child(cam)
	_build_ken()
	_build_fly_route()
	_load_icons()
	_build_audio()
	var hi := _host_initial()
	if String(hi.get("mode", "")) == "pair" and hi.has("studentId"):
		pair = true
		pair_ids = hi.get("pair", [hi["studentId"]])
		group_count = 1
	_build_ui()
	if OS.has_feature("web"):
		# 網頁自動測試（只在 localhost／127.0.0.1，外框網址加 ?autotest=1）：自動按 開始／作答／聽句子／Next，讓 Playwright 在外框作答
		var at = JavaScriptBridge.eval("(function(){try{var t=window.top;var ok=(t.location.hostname==='localhost'||t.location.hostname==='127.0.0.1')&&t.location.search.indexOf('autotest')>=0;return ok?'yes':'no';}catch(e){return 'no';}})()", true)
		web_autotest = typeof(at) == TYPE_STRING and String(at) == "yes"
		print("web autotest=", web_autotest)
	_show_title()
	if web_autotest and pair:
		fast = true
		get_tree().create_timer(4.0).timeout.connect(func(): if state == St.TITLE: _start_game())
	if test_mode:
		_run_test()

# ---------- 網頁外框（兩人一組：學號＋教師後台） ----------
func _host_initial() -> Dictionary:
	if OS.get_environment("PAIR") != "":
		if test_host.is_empty():
			test_host = {"studentId": "99901", "pair": ["99901", "99902"], "results": {}, "cleared": [], "mode": "pair"}
		return test_host
	if not OS.has_feature("web"):
		return {}
	var raw = JavaScriptBridge.eval("(function(){try{var h=window.parent&&window.parent!==window&&window.parent.ershuiHost;return h?JSON.stringify(h.getInitial()):'';}catch(e){return '';}})()", true)
	if typeof(raw) != TYPE_STRING or raw == "":
		return {}
	var d = JSON.parse_string(raw)
	return d if typeof(d) == TYPE_DICTIONARY else {}

func _host_send(fn: String, payload: Dictionary) -> void:
	if not pair:
		return
	if OS.get_environment("PAIR") != "":
		print("HOST ", fn, " ", JSON.stringify(payload))
		if fn == "report" and payload["type"] == "start":
			test_host["results"] = {}
			test_host["cleared"] = ["mode:pair", "set:0", "seed:%d" % payload["seed"]]
		return
	if not OS.has_feature("web"):
		return
	var arg := JSON.stringify(JSON.stringify(payload))
	JavaScriptBridge.eval("(function(){try{var h=window.parent&&window.parent.ershuiHost;if(h&&h.%s)h.%s(%s);}catch(e){console.warn(e);}})()" % [fn, fn, arg], true)

## 外框存的這一輪：cleared 裡有 "seed:123456"；results 是 q01..q11 的對錯
func _host_run(d: Dictionary) -> Dictionary:
	var run := {}
	for c in d.get("cleared", []):
		var s := String(c)
		var i := s.find(":")
		if i > 0:
			run[s.substr(0, i)] = s.substr(i + 1)
	if not run.has("seed"):
		return {}
	var res: Dictionary = d.get("results", {})
	var n := 0
	var ok := 0
	for k in items.size():
		var r = res.get("q%02d" % (k + 1))
		if typeof(r) != TYPE_DICTIONARY:
			break
		n += 1
		if r.get("finalCorrect", false):
			ok += 1
	run["answered"] = n
	run["correct"] = ok
	return run

func _go_pair() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.top.location.href = new URL('%s', location.href).href" % PAIR_URL, true)
	else:
		_toast("Pair mode opens on the website 兩人一組請從網站進入")

func _resume_pair() -> void:
	var run := _host_run(_host_initial())
	if run.is_empty():
		_start_game()
		return
	run_seed = int(run["seed"])
	_make_clue_order()
	qi = mini(int(run["answered"]), items.size())
	scores = [int(run["correct"]) * PAIR_POINTS]
	_enter_play()
	if qi >= items.size():
		_show_result()
	else:
		_show_question()
		_toast("Welcome back! 接著玩 Q%d" % (qi + 1))

## 外框出題：ask → 外框顯示題目；遊戲每 0.25 秒 poll() 拿回 {type:"answer"|"replay"|"pattern"|"mute"|"unmute"}
func _host_ask() -> void:
	ask_poll = true
	ask_t = 0.0
	var It: Dictionary = items[qi]
	_host_send("ask", {"type": "ask", "id": It["id"], "n": qi + 1, "activity": It["act"]})

func _poll_host(delta: float) -> void:
	if not ask_poll:
		return
	ask_t += delta
	if ask_t < 0.25:
		return
	ask_t = 0.0
	var raw = ""
	if OS.get_environment("PAIR") != "":
		if test_answer_wait > 0.0:
			test_answer_wait -= 0.25
			return
		raw = JSON.stringify({"type": "answer", "correct": rng.randf() < 0.75, "pick": "test"})   # 假外框：自動作答
	elif OS.has_feature("web"):
		raw = JavaScriptBridge.eval("(function(){try{var h=window.parent&&window.parent.ershuiHost;return h&&h.poll?(h.poll()||''):'';}catch(e){return '';}})()", true)
	if typeof(raw) != TYPE_STRING or raw == "":
		return
	var m = JSON.parse_string(raw)
	if typeof(m) != TYPE_DICTIONARY:
		return
	match String(m.get("type", "")):
		"replay":
			_replay_scene_and_clue()
		"pattern":
			say("ft_pattern")
		"mute":
			# 學生錄音中：遊戲的音樂、語音、音效全部靜音，免得被錄進去影響 AI 評分
			voice.stop()
			clue_audio.stop()
			if clue_video:
				clue_video.paused = true
			AudioServer.set_bus_mute(0, true)
		"unmute":
			AudioServer.set_bus_mute(0, false)
		"answer":
			AudioServer.set_bus_mute(0, false)
			ask_poll = false
			pair_correct = bool(m.get("correct", false))
			_on_start()
var test_answer_wait := 0.0
## 老師 11/10：每題一步一步解鎖 —— ① 自己按 Play 聽完情境 → ② 線索（兩人一組）→ ③ 作答 → ④ Ken 演出
var scene_heard := false
var scene_playing := false
var first_q := false
var play_btn: Button
var lock_hint: Label
var clue_start_btn: Button
var web_autotest := false

# ---------- Ken ----------
func _build_ken() -> void:
	var node := Node3D.new()
	node.name = "Ken"
	add_child(node)
	var km: Node3D = world.fit_model("ken_openhand", KEN_H, true, 0.3)   # 描邊太粗會認不出 Ken
	km.position.y = FOOT
	node.add_child(km)
	var anim := _find(km, "AnimationPlayer") as AnimationPlayer
	var sk := _find(km, "Skeleton3D") as Skeleton3D
	# Mixamo 動作（pose_bake.gd 烤好的，重定向到 Ken）
	var lib := AnimationLibrary.new()
	for nm in ["jogging", "dribble", "baseball_hit", "kneeling_idle", "plant_a_plant", "driving", "cheering", "sitting_idle"]:
		var p := "res://assets/anims/baked/ken_%s.res" % nm
		if ResourceLoader.exists(p):
			lib.add_animation(nm, load(p))
	if anim:
		anim.add_animation_library("ft", lib)
		anim.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL   # 每格先更新動作、再算道具（同一格）
	var start := _spot("school_east")
	W = {"node": node, "model": km, "anim": anim, "sk": sk, "pos": start, "fwd": Vector2(0, 1), "path": [], "travel": "walk", "name": "Ken"}
	act_root = Node3D.new()
	act_root.name = "ActProps"
	add_child(act_root)
	if FileAccess.file_exists("res://data/interior/anim_ground.json"):
		anim_ground = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/anim_ground.json"))
	if FileAccess.file_exists("res://data/interior/anim_rate.json"):
		anim_rate_fix = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/anim_rate.json"))
	am = ActMotion.new()
	am.setup(sk, km, node, act_root, anim, world.outline_shader, _ground_local)
	am.bike_parent = node
	am.GRIP_DIRS = 1
	_place_ken(0.0)
	_ken_anim("idle")
	anim.advance(0.0)
	am.gait_setup()

func _find(n: Node, cls: String) -> Node:
	if n.is_class(cls):
		return n
	for c in n.get_children():
		var r := _find(c, cls)
		if r != null:
			return r
	return null

var cur_anim := ""
var cur_want := ""
func _ken_anim(nm: String, blend := 0.25) -> void:
	var a: AnimationPlayer = W["anim"]
	if a == null:
		return
	var want := ""
	if nm.begins_with("ft/"):
		want = nm
	else:
		for x in a.get_animation_list():
			if nm in String(x).to_lower() and not String(x).begins_with("ft/"):
				want = x
	if want == "" or not a.has_animation(want):
		return
	cur_anim = nm
	var an := a.get_animation(want)
	if want != "ft/baseball_hit":
		an.loop_mode = Animation.LOOP_LINEAR
	# 走路／慢跑：播放倍率＝地面速度 ÷ 動作原地踩地速度（腳底不滑）
	anim_rate = 1.0
	if nm == "walk" or nm == "ft/jogging":
		var v: float = TRAVEL_SPEED["walk" if nm == "walk" else "jog"]
		anim_rate = v / maxf(am.stride_speed_cached(want), 0.2) * float(anim_rate_fix.get(want, 1.0))
	a.speed_scale = 1.0
	cur_want = want
	if a.current_animation == want:
		return
	a.play(want, blend)

## 動作貼地：模型往上（或下）移多少，腳／膝蓋剛好碰到這裡的路面
func _model_y() -> float:
	return _ground_h(W["pos"]) + float(anim_ground.get(cur_want, 0.0))

## 路面高度（world.gd 蓋路的高度）：柏油 0.1 m、標線 0.115～0.12、路口 0.105、人行道 0.05～0.06、門口小廣場 0.07、其他 0
var node_w := {}
func _ground_h(p: Vector2) -> float:
	if node_w.is_empty():
		for e in world.edges:
			node_w[e[0]] = maxf(node_w.get(e[0], 0.0), float(e[2]))
			node_w[e[1]] = maxf(node_w.get(e[1], 0.0), float(e[2]))
	var h := 0.0
	for e in world.edges:
		var a: Vector2 = world.nodes[e[0]]
		var b: Vector2 = world.nodes[e[1]]
		var ab := b - a
		var L2 := ab.length_squared()
		if L2 < 0.0025:
			continue
		var wd: float = e[2]
		var t := clampf((p - a).dot(ab) / L2, 0.0, 1.0)
		var d := p.distance_to(a + ab * t)
		if d > wd * 0.5 + World.WALK_W:
			continue
		if d > wd * 0.5:
			h = maxf(h, 0.05)
			continue
		h = maxf(h, 0.1)
		if wd >= 4.2:
			var L := sqrt(L2)
			var sa := t * L
			if d < 0.07 and sa >= 2.5 and sa <= L - 2.5 and fmod(sa - 2.5, 2.8) <= 1.2:
				h = maxf(h, 0.12)
			if absf(d - (wd * 0.5 - 0.12)) < 0.05:
				h = maxf(h, 0.115)
	for k in node_w:
		var c: Vector2 = world.nodes[k]
		var dd := p.distance_to(c)
		var wm: float = node_w[k]
		if dd <= wm * 0.5 + 0.1:
			h = maxf(h, 0.105)
		elif dd <= wm * 0.5 + World.WALK_W:
			h = maxf(h, 0.06)
	for P in world.place_list:
		if P.has("pos2") and P.has("door2"):
			var a2: Vector2 = (P["pos2"] as Vector2).lerp(P["door2"], 0.5)
			var b2: Vector2 = P["door2"]
			var ab2 := b2 - a2
			if ab2.length_squared() > 0.01:
				var t2 := clampf((p - a2).dot(ab2) / ab2.length_squared(), 0.0, 1.0)
				if p.distance_to(a2 + ab2 * t2) <= 1.1:
					h = maxf(h, 0.07)
	return h

## ActMotion 用：Ken 座標（+X 左、+Z 前）→ 路面高度
func _ground_local(v: Vector2) -> float:
	var f: Vector2 = W["fwd"]
	var p: Vector2 = W["pos"]
	return _ground_h(p + f * v.y + Vector2(f.y, -f.x) * v.x)

func _place_ken(_delta: float) -> void:
	var node: Node3D = W["node"]
	node.transform = world.frame_at(W["pos"], W["fwd"], 0.0)
	if not am.riding and act_kind != "baseball":   # 騎車、打棒球時模型位置由 ActMotion 管
		var m: Node3D = W["model"]
		m.position = Vector3(0, _model_y(), 0)

## 站點：school_east＝二水國小東側門（Ken 家走過來的那個門），其他用地點門口
func _spot(id: String) -> Vector2:
	if spot_cache.has(id):
		return spot_cache[id]
	var p: Vector2
	if id == "ken_home":
		p = world.places[id]["door2"]
	else:
		var src: Vector2
		if id == "school_east":
			for g in data["campus"]["gates"]:
				if g["kind"] == "east":
					src = world.v2(g["p"])
		else:
			src = world.places[id]["door2"]
		# 站到最近的路上（門口常在樹下或建築模型裡，鏡頭會被擋）；路中線往門那邊靠 1 m
		var pr: Dictionary = world.project(src)
		p = pr["q"] if pr.has("q") else src
		if p.distance_to(src) > 1.0:
			p += (src - p).normalized() * 1.0
	spot_cache[id] = p
	return p
var spot_cache := {}

func _process(delta: float) -> void:
	_poll_host(delta)
	_step_ken(delta)
	_place_ken(delta)
	_advance_anim(delta)
	_update_act(delta)
	_update_camera(delta)
	if in_home:
		_animate_screens(delta)

func _moving_mul() -> float:
	return 3.0 if fast else 1.0

## 每格先更新動作（手動模式），再修腳（擺動的腳不擦地）；騎車時腿由腳踏車 IK 決定
func _advance_anim(delta: float) -> void:
	var a: AnimationPlayer = W["anim"]
	if a == null or am.riding or act_kind == "baseball":
		return
	var moving: bool = not (W["path"] as Array).is_empty() and not skipping
	var mul := _moving_mul() if moving else 1.0
	a.advance(delta * anim_rate * mul)
	if moving and (cur_anim == "walk" or cur_anim == "ft/jogging"):
		var v: float = TRAVEL_SPEED.get(W["travel"], 1.4)
		am.gait_fix(delta, v * delta * mul, 0.012, 0.35, false, true)   # 擺動的腳不擦地＋著地的腳不陷地

func _step_ken(delta: float) -> void:
	var path: Array = W["path"]
	if path.is_empty() or skipping:
		return
	var v: float = TRAVEL_SPEED.get(W["travel"], 1.4)
	var mul := _moving_mul()
	var move := v * delta * mul
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
			W["fwd"] = (W["fwd"] as Vector2).lerp(dir, minf(1.0, delta * 8.0)).normalized()
	W["pos"] = pos
	travel_t += delta * mul
	if W["travel"] == "bike":
		am.update_bike(delta * mul, v)
	else:
		step_timer -= delta * mul * anim_rate
		if step_timer <= 0.0:
			step_timer = 0.55 if W["travel"] == "walk" else 0.4
			sfx("footstep_1" if randi() % 2 == 0 else "footstep_2", randf_range(0.92, 1.08))
	if state == St.WALKING and travel_t > SKIP_AFTER and not path.is_empty():
		var rest := pos.distance_to(path[0])
		for i in range(path.size() - 1):
			rest += (path[i] as Vector2).distance_to(path[i + 1])
		if rest > v * SKIP_END + 3.0:
			_skip_ahead(rest - v * SKIP_END)
			return
	if path.is_empty():
		if roam:
			_roam_next()
		else:
			_on_arrive()

## 路太長：淡出 → 沿路往前跳 dist 公尺 → 淡入（中間的路不演，但 Ken 還是照路走、方向對）
func _skip_ahead(dist: float) -> void:
	skipping = true
	var keep := walk_caption.text
	await _fade(true, 0.3)
	var path: Array = W["path"]
	var pos: Vector2 = W["pos"]
	while dist > 0.0 and not path.is_empty():
		var tgt: Vector2 = path[0]
		var d := pos.distance_to(tgt)
		if d <= dist:
			pos = tgt
			dist -= d
			path.pop_front()
		else:
			W["fwd"] = (tgt - pos).normalized()
			pos += (tgt - pos) / d * dist
			dist = 0.0
	W["pos"] = pos
	if not path.is_empty():
		W["fwd"] = ((path[0] as Vector2) - pos).normalized()
	follow_cam2 = Vector2.INF
	follow_pick = []
	cam_pos = Vector3.ZERO
	am.gait_setup()
	walk_caption.text = "A few minutes later…"
	await _fade(false, 0.3)
	skipping = false
	await get_tree().create_timer(1.6).timeout
	if walk_caption.text == "A few minutes later…":
		walk_caption.text = keep

## 演出時繼續慢跑／騎車：沿路往前約 18 m 再回來，一直來回（停在原地慢跑＝腳在地上滑，不合理）
var roam_a := Vector2.ZERO
var roam_b := Vector2.ZERO
var roam_to_b := true
func _start_roam(travel: String) -> void:
	roam = true
	W["travel"] = travel
	roam_a = W["pos"]
	var f: Vector2 = W["fwd"]
	var pr: Dictionary = world.project(roam_a + f * 18.0)
	roam_b = pr["q"] if pr.has("q") else roam_a + f * 18.0
	roam_to_b = true
	W["path"] = world.route(roam_a, roam_b)
	if (W["path"] as Array).is_empty():
		W["path"] = [roam_b]
	travel_t = 0.0
	if travel == "bike":
		am.unpark_bike()
		am.set_bike(true)
	else:
		_ken_anim("ft/jogging")
		am.gait_setup()
	roam_cam2 = Vector2.INF
	cam_mode = "roam"

func _roam_next() -> void:
	roam_to_b = not roam_to_b
	var to: Vector2 = roam_b if roam_to_b else roam_a
	W["path"] = world.route(W["pos"], to)
	if (W["path"] as Array).is_empty():
		W["path"] = [to]

# ---------- 腳踏車：scripts/act_motion.gd（依 Ken 量坐墊、把手、曲柄；腳 IK 踩踏板、輪子照齒比轉、兩輪貼地） ----------
const SEAT_H := 0.62
func _bone_local(nm: String) -> Vector3:
	var sk: Skeleton3D = W["sk"]
	var bn := _bone_name(nm)
	if bn == "":
		return Vector3.ZERO
	var node: Node3D = W["node"]
	return (node.global_transform.affine_inverse() * sk.global_transform * sk.get_bone_global_pose(sk.find_bone(bn))).origin

func _mat(col: String) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(col)
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	return m

func _set_bike(on: bool) -> void:
	if on:
		_remove_parked()
		am.unpark_bike()
		am.model_base = Transform3D.IDENTITY
		am.set_bike(true)
	elif am.riding or (am.bike and am.bike.visible and am.bike.get_parent() == W["node"]):
		am.set_bike(false)
		if am.bike:
			am.bike.visible = false
		_ken_anim(cur_anim if cur_anim != "" else "idle", 0.0)

## 下車：腳踏車停在 Ken 的左邊（側柱撐著），之後的演出、同一個地方的下一題都還在
func _park_bike() -> void:
	if not am.riding:
		return
	_remove_parked()
	parked = Node3D.new()
	parked.name = "ParkedBike"
	add_child(parked)
	parked.transform = world.frame_at(W["pos"], W["fwd"], 0.0)
	var gy := _ground_local(Vector2(1.3, -0.5))
	am.model_base = Transform3D.IDENTITY
	am.park_bike(parked, Transform3D(Basis.IDENTITY, Vector3(1.3, gy - _ground_local(Vector2.ZERO), -0.5)))

func _remove_parked() -> void:
	if parked:
		if am.bike and am.bike.get_parent() == parked:
			parked.remove_child(am.bike)
			(W["node"] as Node3D).add_child(am.bike)
			am.bike.transform = Transform3D.IDENTITY
			am.bike.visible = false
		parked.queue_free()
		parked = null

# ---------- 戶外活動道具 ----------
func _clear_act() -> void:
	for c in act_root.get_children():
		c.queue_free()
	ball = null
	am.ball = null
	am.bb_ball = null
	am.base_node = null
	if am.bat:
		if am.bat.get_parent():
			am.bat.get_parent().remove_child(am.bat)
		am.bat.queue_free()
		am.bat = null
	if am.bat_ba:
		am.bat_ba.queue_free()
		am.bat_ba = null
	am.bb = {}
	act_kind = ""
	roam = false
	bb_cut = false
	if hp_attach:
		hp_attach.queue_free()
		hp_attach = null
	(W["model"] as Node3D).transform = Transform3D(Basis.IDENTITY, Vector3(0, _model_y(), 0))

func _prim(parent: Node3D, mesh: Mesh, pos: Vector3, col: String, rot := Vector3.ZERO, emit := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	var m := _mat(col)
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = Color(col)
		m.emission_energy_multiplier = emit
	mi.material_override = m
	mi.position = pos
	mi.rotation = rot
	parent.add_child(mi)
	var ol := ShaderMaterial.new()
	ol.shader = world.outline_shader
	ol.set_shader_parameter("width", 0.012)
	mi.material_overlay = ol
	return mi

func _box(s: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = s
	return b

func _cyl(r1: float, r2: float, h: float) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = r1
	c.bottom_radius = r2
	c.height = h
	return c

func _sph(r: float) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	return s

## 戶外活動：Ken 站在 p、面向 fwd；道具放在 Ken 的平面座標（+Z＝Ken 前面、+X＝Ken 左邊）
## 道具都由 ActMotion 依動作的接觸事件驅動（球貼手、棒子碰到球才飛、腳踩踏板帶輪子）
func _start_act(kind: String) -> void:
	_clear_act()
	act_kind = kind
	act_t = 0.0
	var p: Vector2 = W["pos"]
	var f: Vector2 = W["fwd"]
	act_root.transform = world.frame_at(p, f, 0.0)
	match kind:
		"jogging":
			_start_roam("jog")
		"bike":
			_start_roam("bike")
		"music":
			_ken_anim("idle")
			_put_headphones_outdoor()
			for i in 5:
				var n := _note3d()
				n.position = Vector3(0.0, 1.2, 0.0)
				n.set_meta("ph", i / 5.0)
				act_root.add_child(n)
		"basketball":
			_ken_anim("ft/dribble", 0.0)
			am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, _model_y(), 0))
			(W["model"] as Node3D).transform = am.model_base
			am.build_hoop(2.8)
			am.start_dribble()
		"camping":
			_ken_anim("ft/kneeling_idle", 0.0)
			am.build_camp()
		"baseball":
			_ken_anim("ft/baseball_hit", 0.0)
			am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, _ground_h(p) + float(anim_ground.get("ft/baseball_hit", 0.0)), 0))
			(W["model"] as Node3D).transform = am.model_base
			am.start_baseball(Transform3D(Basis(Vector3(1, 0, 0), -PI / 2), Vector3(0.0, 0.07, 0.03)))

func _note3d() -> Node3D:
	var n := Node3D.new()
	_prim(n, _sph(0.06), Vector3.ZERO, "#3a2a40")
	_prim(n, _cyl(0.008, 0.008, 0.22), Vector3(0.05, 0.11, 0), "#3a2a40")
	_prim(n, _box(Vector3(0.08, 0.02, 0.016)), Vector3(0.09, 0.21, 0), "#3a2a40", Vector3(0, 0, -0.5))
	n.scale = Vector3.ONE * 0.9
	return n

func _attach_bone(sk: Skeleton3D, bone: String, node: Node3D, xf: Transform3D) -> BoneAttachment3D:
	var ba := BoneAttachment3D.new()
	ba.bone_name = bone
	sk.add_child(ba)
	ba.add_child(node)
	node.transform = xf
	return ba

func _put_headphones_outdoor() -> void:
	var H: Dictionary = poses["stand_headphones"]
	var hpn: Node3D = (load(H["scene"]) as PackedScene).instantiate()
	hp_attach = _attach_bone(W["sk"], H["bone"], hpn, _xf(H["xf"]))

func _bone_name(key: String) -> String:
	var sk: Skeleton3D = W["sk"]
	for i in sk.get_bone_count():
		if sk.get_bone_name(i).to_lower().replace("mixamorig", "").replace(":", "").replace("_", "") == key:
			return sk.get_bone_name(i)
	return ""

func _update_act(delta: float) -> void:
	if act_kind == "":
		return
	act_t += delta
	match act_kind:
		"music":
			am.music_sway(act_t)   # 上半身跟著節拍搖（腳不動）
			for n in act_root.get_children():
				var ph := fmod(act_t * 0.35 + float(n.get_meta("ph", 0.0)), 1.0)
				(n as Node3D).position = Vector3(sin(ph * TAU + n.get_index()) * 0.35, 1.3 + ph * 1.1, 0.1)
				(n as Node3D).scale = Vector3.ONE * 0.9 * (1.0 - smoothstep(0.7, 1.0, ph))
		"basketball":
			am.update_dribble()   # 球＝動作時間的函數：推球時貼手心、放手後落地反彈、回到手心
		"camping":
			am.update_camp(act_t)
		"baseball":
			if bb_cut:
				return
			if am.update_baseball(delta):   # 來球 → 揮棒碰到 → 球飛出 → 丟棒 → 跑到壘包；一輪完淡出重來
				bb_cut = true
				await _fade(true, 0.3)
				if act_kind == "baseball":
					am.restart_baseball()
				await _fade(false, 0.3)
				bb_cut = false

# ---------- 室內（進門才載入）：姿勢＝home_check 驗收過的 6 張（pose_bake.gd 烤成資料） ----------
func _xf(a: Array) -> Transform3D:
	return Transform3D(Basis(Vector3(a[0], a[1], a[2]), Vector3(a[3], a[4], a[5]), Vector3(a[6], a[7], a[8])), Vector3(a[9], a[10], a[11]))

func _build_interior() -> void:
	if interior != null:
		return
	var hb := Home.new()
	interior = hb.build_ken_home()
	interior.position = Vector3.ZERO
	add_child(interior)
	# 燈和背景跟 home_check.gd 一樣
	var sun := DirectionalLight3D.new()
	interior.add_child(sun)
	sun.look_at_from_position(Vector3(1, 6, 7), Vector3(0.5, 0, 1.5), Vector3.UP)
	sun.light_energy = 0.55
	sun.light_color = Color(1.0, 0.97, 0.92)
	for p in [Vector3(2.5, 2.0, 2.0), Vector3(-1.75, 2.0, 1.5)]:
		var o := OmniLight3D.new()
		o.position = p
		o.omni_range = 5.5
		o.omni_attenuation = 0.6
		o.light_energy = 0.9
		o.light_color = Color(1.0, 0.9, 0.75)
		interior.add_child(o)
	interior_env = Environment.new()
	interior_env.background_mode = Environment.BG_COLOR
	interior_env.background_color = Color(0.93, 0.96, 0.99)
	interior_env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	interior_env.ambient_light_color = Color(1.0, 0.95, 0.88)
	interior_env.ambient_light_energy = 0.75
	interior_ken = world.fit_model(poses["model"], KEN_H, true, INDOOR_OUTLINE)   # 室內近景描邊細一點（老師 11/10）
	interior.add_child(interior_ken)
	var ap := _find(interior_ken, "AnimationPlayer") as AnimationPlayer
	if ap:
		ap.stop()
		ap.active = false
	interior_sk = _find(interior_ken, "Skeleton3D") as Skeleton3D
	if Pose.right_is_fist(interior_sk):
		Pose.hide_hand_gadget(interior_ken)
	Pose.thin_hand_outline(interior_ken, 0.25)
	interior.visible = false

func _enter_home(shot: String) -> void:
	_build_interior()
	interior_shot = shot
	var D: Dictionary = poses["poses"][shot]
	for p in interior_props:
		p.queue_free()
	interior_props.clear()
	for n in ["headphones/HeadphonesProp", "book/Pencil", "Study/RecorderProp"]:
		(interior.get_node(n) as Node3D).visible = not (n in D["hide"])
	(interior.get_node("Study/DeskChair") as Node3D).position.z = float(D["chair_z"])
	var bones: Array = D["bones"]
	for i in bones.size():
		var b: Array = bones[i]
		interior_sk.set_bone_pose_position(i, Vector3(b[0], b[1], b[2]))
		interior_sk.set_bone_pose_rotation(i, Quaternion(b[3], b[4], b[5], b[6]))
		interior_sk.set_bone_pose_scale(i, Vector3(b[7], b[8], b[9]))
	interior_ken.global_transform = _xf(D["ken"])
	for pr in D["props"]:
		var node: Node3D = (load(pr["scene"]) as PackedScene).instantiate()
		interior_props.append(_attach_bone(interior_sk, pr["bone"], node, _xf(pr["xf"])))
	interior_cam = _xf(D["cam"])
	interior_fov = float(D["fov"])
	# 換到室內：藏星球、換背景
	world.visible = false
	(W["node"] as Node3D).visible = false
	act_root.visible = false
	if world_env:
		world_env_saved = world_env.environment
		world_env.environment = interior_env
	interior.visible = true
	in_home = true
	screen_t = 0.0
	cam_mode = "interior"

func _exit_home() -> void:
	if not in_home:
		return
	in_home = false
	interior.visible = false
	world.visible = true
	(W["node"] as Node3D).visible = true
	act_root.visible = true
	if world_env and world_env_saved:
		world_env.environment = world_env_saved
	cam.fov = 50
	cam_pos = Vector3.ZERO

## 電視、電腦螢幕會動（看電視＝換台的顏色；玩線上遊戲＝彩色閃；上網＝白底藍條捲動）
func _animate_screens(delta: float) -> void:
	screen_t += delta
	var tv := interior.find_child("TVScreen", true, false) as MeshInstance3D
	var pc := interior.find_child("PCScreen", true, false) as MeshInstance3D
	if tv and interior_shot == "watch_tv":
		var ch := int(screen_t / 1.6)
		(tv.material_override as StandardMaterial3D).albedo_color = Color.from_hsv(fmod(ch * 0.37, 1.0), 0.45, 0.95).lerp(Color.WHITE, 0.1 * sin(screen_t * 20.0))
	if pc:
		var m := pc.material_override as StandardMaterial3D
		if interior_shot == "online_games":
			m.albedo_color = Color.from_hsv(fmod(screen_t * 0.5, 1.0), 0.6, 1.0)
		elif interior_shot == "surf_internet":
			m.albedo_color = Color("#e7f5ff").lerp(Color("#74c0fc"), 0.5 + 0.5 * sin(screen_t * 2.0))
		else:
			m.albedo_color = Color("#9fe0ff")

func _fade(on: bool, sec := 0.35) -> void:
	var tw := create_tween()
	tw.tween_property(fade_rect, "color:a", 1.0 if on else 0.0, sec)
	await tw.finished

# ---------- 鏡頭 ----------
func _build_fly_route() -> void:
	var loop := ["station", "asia_inn", "dental", "decheng", "teatop", "shoes", "ensheng", "dumpling", "post", "farmers", "ande", "library", "school", "seven", "inn", "station"]
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

## 角色面向鏡頭：繞一圈找不被擋的方向，中間的房子半透明
func _setup_face_cam(dist := 4.6, ch := 1.9, turn := true) -> void:
	var p: Vector2 = W["pos"]
	var pref: Vector2 = -(W["fwd"] as Vector2)
	if pref.length() < 0.1:
		pref = Vector2(0, 1)
	face_cam = world.face_view(p, pref.normalized(), dist, ch)
	# Ken 站在路上時：鏡頭也放在同一條路上（順著路往前／往後看），不會跑進建築模型裡（模型不在 blockers 清單）
	var pr: Dictionary = world.project(p)
	if pr.has("edge") and float(pr["d"]) < 2.5 and p.distance_to(world.places["ken_home"]["door2"]) > 3.0:
		var e: Array = world.edges[int(pr["edge"])]
		var rd: Vector2 = ((world.nodes[e[1]] as Vector2) - (world.nodes[e[0]] as Vector2)).normalized()
		var best := []
		var best_s := 1e9
		for dir: Vector2 in [rd, -rd]:
			var c2: Vector2 = p + dir * dist + Vector2(-dir.y, dir.x) * 0.6
			var sc: float = world._blocked_count(c2, ch, p, 1.1, "") * 10.0 + (0.0 if dir.dot(pref) > 0.0 else 1.0)
			if sc < best_s:
				best_s = sc
				best = [c2, ch, dir]
		face_cam = best
	if turn:
		W["fwd"] = face_cam[2]
	world.fade_between(face_cam[0], p, "", 0.0)

func _update_camera(delta: float) -> void:
	var want_pos := cam_pos
	var want_look := cam_look
	var want_up := cam_up
	var k := 1.0 - exp(-delta * 3.0)
	match cam_mode:
		"fly" when intro_t < INTRO_END:
			intro_t += delta
			var sp: Vector3 = (world.bend2(world.places["station"]["door2"]) as Vector3).normalized()
			var north: Vector3 = (world.bend2((world.places["station"]["door2"] as Vector2) + Vector2(0, -6)) - world.bend2(world.places["station"]["door2"])).normalized()
			var axis := Vector3(1.0, 0.25, 0.35).normalized()
			var far_d: float = world.R * 2.7
			var p0 := _fly_point(0.0)
			var a0 := _fly_point(22.0)
			var fwd0 := (a0 - _fly_point(-6.0)).normalized()
			var end_pos: Vector3 = world.bend2(p0 - fwd0 * 4.0, 19.0)
			var end_look: Vector3 = world.bend2(a0, 1.0)
			if intro_t < INTRO_SPIN:
				var ang := (intro_t - INTRO_SPIN) * 0.5
				want_pos = sp.rotated(axis, ang) * far_d
				want_look = Vector3.ZERO
				want_up = north.rotated(axis, ang)
				world.set_space(1.0)
			else:
				var s := smoothstep(INTRO_SPIN, INTRO_END, intro_t)
				var e := s * s * (3.0 - 2.0 * s)
				var dir: Vector3 = sp.slerp(end_pos.normalized(), e)
				want_pos = dir * lerpf(far_d, end_pos.length(), e)
				want_look = Vector3.ZERO.lerp(end_look, e)
				want_up = north.slerp(world.bend2(p0).normalized(), e)
				world.set_space(clampf(1.0 - e * 1.6, 0.0, 1.0))
			k = 1.0
			fly_t = 0.0
		"fixed":
			want_pos = fixed_cam[0]
			want_look = fixed_cam[1]
			want_up = fixed_cam[2]
			k = 1.0
		"interior":
			cam.fov = interior_fov
			cam.global_transform = interior_cam
			return
		"fly":
			world.set_space(0.0)
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
			var p: Vector2 = W["pos"]
			var f: Vector2 = W["fwd"]
			# 鏡頭在 Ken 背後：先試 6.5 m／高 4.2 m，被房子（含 Ken 家的模型，模型不會變半透明）擋住就拉近、拉高。
			# 平滑在「地圖平面」上做，才能檢查鏡頭真正的位置；轉彎時鏡頭掃進房子裡 → 直接跳到目標位置
			follow_t -= delta
			var hp: Dictionary = world.places.get("ken_home", {})
			if follow_t <= 0.0 or follow_pick.is_empty():
				follow_t = 0.2
				var cands := [[6.5, 4.2], [5.0, 6.0], [3.5, 8.5], [2.5, 12.0]]
				follow_pick = cands[-1]
				for c in cands:
					var c2: Vector2 = p - f * float(c[0])
					if not hp.is_empty() and c2.distance_to(world.v2(hp["pos"])) < float(hp.get("size", 7.6)) * 0.8:
						continue
					if world._blocked_count(c2, float(c[1]), p, 1.0, "-none-") > 0:   # self_id "" 會跳過所有街屋（街屋 id 也是 ""）
						continue
					follow_pick = c
					break
			var tgt: Vector2 = p - f * float(follow_pick[0])
			if follow_cam2 == Vector2.INF:
				follow_cam2 = tgt
				follow_h = float(follow_pick[1])
			follow_cam2 = follow_cam2.lerp(tgt, 1.0 - exp(-delta * 4.0))
			follow_h = lerpf(follow_h, float(follow_pick[1]), 1.0 - exp(-delta * 4.0))
			var inside_home: bool = not hp.is_empty() and follow_cam2.distance_to(world.v2(hp["pos"])) < float(hp.get("size", 7.6)) * 0.8
			if inside_home or world._blocked_count(follow_cam2, follow_h, p, 1.0, "-none-") >= 30:
				follow_cam2 = tgt
				follow_h = float(follow_pick[1])
			if follow_t >= 0.199:
				world.fade_between(follow_cam2, p, "", 6.0)
			want_pos = world.bend2(follow_cam2, follow_h)
			want_look = world.bend2(p + f * 2.0, 0.9)
			want_up = world.bend2(p).normalized()
			k = 1.0
		"face", "act":
			var p: Vector2 = W["pos"]
			if face_cam.is_empty():
				_setup_face_cam()
			var fd: Vector2 = face_cam[2]
			var fh: float = face_cam[1]
			want_pos = world.bend2(face_cam[0], fh)
			if cam_mode == "face":
				want_look = world.bend2(p - fd * 0.6, -0.3 - (fh - 1.9) * 0.55)
			else:
				var lp: Vector2 = face_cam[3] if face_cam.size() > 3 else p
				want_look = world.bend2(lp, float(face_cam[4]) if face_cam.size() > 4 else 0.75)
			want_up = world.bend2(p).normalized()
		"roam":
			# 演出時慢跑／騎車：鏡頭在「來回那條路」的側面（固定一邊，Ken 迴轉時鏡頭不會掃過他），被房子擋到就換邊或拉到後上方
			var p: Vector2 = W["pos"]
			var f: Vector2 = W["fwd"]
			var axis := (roam_b - roam_a)
			axis = axis.normalized() if axis.length() > 0.5 else f
			var perp := Vector2(-axis.y, axis.x)
			var mid := (roam_a + roam_b) * 0.5
			roam_t -= delta
			if roam_t <= 0.0 or roam_cam2 == Vector2.INF:
				roam_t = 0.5
				for sd in [roam_side, -roam_side]:
					if world._blocked_count(p + perp * sd * 3.8, 1.35, p, 1.0, "-none-") == 0:
						roam_side = sd
						break
			var tgt := p + perp * roam_side * 3.8 + (mid - p).normalized() * 0.0
			if roam_cam2 == Vector2.INF or roam_cam2.distance_to(p) < 2.8:
				roam_cam2 = tgt
			roam_cam2 = roam_cam2.lerp(tgt, 1.0 - exp(-delta * 3.0))
			want_pos = world.bend2(roam_cam2, 1.35)
			want_look = world.bend2(p, 0.6)
			want_up = world.bend2(p).normalized()
			k = 1.0
		"map":
			var mp: Vector2 = W["pos"]
			var up_d: Vector3 = world.bend2(mp).normalized()
			var north: Vector3 = (world.bend2(mp + Vector2(0, -6)) - world.bend2(mp)).normalized()
			want_pos = up_d * (world.R + 300.0) - north * 120.0
			want_look = up_d * world.R
			want_up = north
	if cam_mode != "fly":
		world.set_space(0.0)
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
	clue_audio = AudioStreamPlayer.new()
	add_child(clue_audio)
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
	clue_audio.volume_db = (VOL_DB[vol_level] + 6.0) if vol_level > 0 else -80.0
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

func _sentence(act: String) -> String:
	return "I %s in my free time." % ft["phrases"][act]

# ---------- UI 共用 ----------
func _paint(b: Button, col: Color) -> void:
	for s in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(s, _style(col if s != "hover" else col.lightened(0.08)))

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
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(c, Color(0.15, 0.12, 0.2))
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

func _outlined(l: Label, w := 14) -> Label:
	l.add_theme_color_override("font_outline_color", Color("#3a2a40"))
	l.add_theme_constant_override("outline_size", w)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l

func _load_icons() -> void:
	for i in ICON_COUNT:
		var p := "res://assets/ui/emoji_%02d.png" % (i + 1)
		icons.append(load(p) if ResourceLoader.exists(p) else null)

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

func _icon(g: int, size: int) -> Control:
	return _icon_by_index(group_icons[g] if g < group_icons.size() else g, size)

func _build_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	_build_title()
	_build_setup()
	_build_hud()
	_build_clue_card()
	_build_result()
	fade_rect = ColorRect.new()
	fade_rect.color = Color(0, 0, 0, 0)
	fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(fade_rect)

# ---------- 首頁 ----------
func _build_title() -> void:
	title_ui = Control.new()
	title_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	title_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(title_ui)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 10)
	title_ui.add_child(v)
	var t := _outlined(_label("Ershui Planet · Free Time", 80, Color("#fff4c2")), 24)
	v.add_child(t)
	v.add_child(_outlined(_label("二水小行星・Ken 的休閒時間", 42, Color.WHITE), 18))
	v.add_child(_outlined(_label("What do you do in your free time?  I ___ in my free time.", 28, Color.WHITE)))
	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 26)
	v.add_child(gap)
	group_btns_row = HBoxContainer.new()
	group_btns_row.alignment = BoxContainer.ALIGNMENT_CENTER
	group_btns_row.add_theme_constant_override("separation", 24)
	v.add_child(group_btns_row)
	var b := _btn("全班分組猜猜看\nClass Groups · 投影押注", 30, Color("#ffd166"))
	b.custom_minimum_size = Vector2(400, 110)
	b.pressed.connect(_show_setup)
	group_btns_row.add_child(b)
	var pb := _btn("兩人一組線索挑戰\nPair Clue Challenge · iPad 學號", 30, Color("#a5d8ff"))
	pb.custom_minimum_size = Vector2(400, 110)
	pb.pressed.connect(_go_pair)
	group_btns_row.add_child(pb)
	sid_label = _outlined(_label("", 30, Color.WHITE))
	v.add_child(sid_label)
	pair_row = HBoxContainer.new()
	pair_row.alignment = BoxContainer.ALIGNMENT_CENTER
	pair_row.add_theme_constant_override("separation", 24)
	v.add_child(pair_row)
	var nb := _btn("  New game 新的一輪  ", 34, Color("#ffd166"))
	nb.custom_minimum_size = Vector2(340, 86)
	nb.pressed.connect(_start_game)
	pair_row.add_child(nb)
	continue_btn = _btn("  Continue 繼續上次  ", 30, Color("#cfe8ff"))
	continue_btn.custom_minimum_size = Vector2(360, 64)
	continue_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	continue_btn.pressed.connect(func(): _resume_pair() if pair else load_progress())
	v.add_child(continue_btn)

func _input(ev: InputEvent) -> void:
	if cam_mode == "fly" and intro_t < INTRO_END and ((ev is InputEventMouseButton and ev.pressed) or (ev is InputEventScreenTouch and ev.pressed)):
		intro_t = INTRO_END
		cam_pos = Vector3.ZERO

func _show_title() -> void:
	state = St.TITLE
	_exit_home()
	_clear_act()
	_set_bike(false)
	_hide_clue()
	cam_mode = "fly"
	intro_t = 0.0
	fly_t = 0.0
	_hide_all()
	title_ui.visible = true
	group_btns_row.visible = not pair
	pair_row.visible = pair
	sid_label.visible = pair
	if pair:
		sid_label.text = "Pair Clue Challenge 兩人一組線索挑戰\n學號 %s" % " ＋ ".join(PackedStringArray(pair_ids.map(func(x): return String(x))))
		var run := _host_run(_host_initial())
		continue_btn.visible = not run.is_empty() and int(run["answered"]) < items.size() and int(run["answered"]) > 0
		if continue_btn.visible:
			continue_btn.text = "  Continue 繼續上次（Q%d/%d）  " % [int(run["answered"]) + 1, items.size()]
		return
	var sv := _read_save()
	continue_btn.visible = not sv.is_empty()
	if not sv.is_empty():
		continue_btn.text = "  Continue 繼續上次（Q%d/%d）  " % [int(sv["qi"]) + 1, items.size()]

func _hide_all() -> void:
	for c in [title_ui, setup_ui, hud, result_ui]:
		if c:
			c.visible = false
	if confetti:
		confetti.visible = false

# ---------- 分組設定（幾組＋每組圖示） ----------
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
	panel.offset_top = 20
	panel.offset_bottom = -20
	setup_ui.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	panel.add_child(v)
	v.add_child(_label("全班分組猜猜看  Class Groups", 36, Color("#7b5ea7")))
	v.add_child(_label("1. How many groups?  幾組？", 28))
	var hc := HBoxContainer.new()
	hc.add_theme_constant_override("separation", 12)
	v.add_child(hc)
	for n in [4, 5, 6, 7, 8]:
		var b := _btn(" %d groups " % n, 24)
		b.pressed.connect(func(): _set_group_count(n))
		hc.add_child(b)
		setup_count_btns.append(b)
	v.add_child(_label("2. Pick an emoji for each group  點組別，再點圖示", 28))
	var gr := HBoxContainer.new()
	gr.name = "Groups"
	gr.add_theme_constant_override("separation", 10)
	v.add_child(gr)
	var ig := GridContainer.new()
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
	var rule := _label("押注 Betting：每組先有 %d 分。每題選 A／B／C，再押 1、2 或 3 分。\n答對 ＋押的分數；答錯 -押的分數（最低 0 分）。Each group starts with %d points. Bet 1–3 each question." % [START_POINTS, START_POINTS], 20, Color("#5c4a6e"), false)
	rule.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(rule)
	var go := _btn("  Go! 出發（Ken A・11 題）  ", 30, Color("#ffd166"))
	go.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	go.custom_minimum_size = Vector2(360, 72)
	go.pressed.connect(_start_game)
	v.add_child(go)

func _show_setup() -> void:
	state = St.SETUP
	_hide_all()
	setup_ui.visible = true
	if group_icons.is_empty():
		for i in 8:
			group_icons.append(i)
	_set_group_count(group_count)

func _set_group_count(n: int) -> void:
	group_count = n
	setup_sel_group = mini(setup_sel_group, n - 1)
	for i in setup_count_btns.size():
		_paint(setup_count_btns[i], Color("#ffd166") if [4, 5, 6, 7, 8][i] == n else Color("#fff8e7"))
	_refresh_setup_groups()

func _refresh_setup_groups() -> void:
	var gr: HBoxContainer = setup_ui.find_child("Groups", true, false)
	for c in gr.get_children():
		c.queue_free()
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

func _assign_icon(i: int) -> void:
	var other := group_icons.find(i)
	if other != -1 and other != setup_sel_group:
		group_icons[other] = group_icons[setup_sel_group]
	group_icons[setup_sel_group] = i
	setup_sel_group = (setup_sel_group + 1) % group_count
	_refresh_setup_groups()

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
	var tr := VBoxContainer.new()
	hud_col = tr
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
	save_btn = _btn("Save 保留", 20, Color("#cfe8ff"))
	save_btn.pressed.connect(save_progress)
	tr.add_child(save_btn)
	var home := _btn("Home 首頁", 20)
	home.pressed.connect(_go_home)
	tr.add_child(home)
	# 題目面板（下方）：左＝情境＋三個句子；右＝各組押注
	qpanel = PanelContainer.new()
	qpanel.add_theme_stylebox_override("panel", _style(Color(1, 0.98, 0.93, 0.96), Color(0.15, 0.12, 0.2), 26, 5))
	hud.add_child(qpanel)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 18)
	qpanel.add_child(hb)
	var lv := VBoxContainer.new()
	lv.add_theme_constant_override("separation", 6)
	hb.add_child(lv)
	var qh := HBoxContainer.new()
	qh.add_theme_constant_override("separation", 12)
	lv.add_child(qh)
	q_sub = _label("Q1/11", 24, Color("#7b5ea7"))
	qh.add_child(q_sub)
	play_btn = _btn("▶ Play
聽情境", 24, Color("#ffd166"))
	play_btn.custom_minimum_size = Vector2(104, 70)
	play_btn.pressed.connect(_on_play_scene)
	qh.add_child(play_btn)
	q_scene = _label("", 24)
	q_scene.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	q_scene.custom_minimum_size = Vector2(360, 0)
	qh.add_child(q_scene)
	q_ask = _label("What do you do in your free time?", 24, Color("#c2255c"))
	lv.add_child(q_ask)
	answer_lbl = _label("", 30, Color("#2b8a3e"))
	lv.add_child(answer_lbl)
	lock_hint = _label("Listen first 先按 ▶ Play 聽情境（聽完才能選）", 20, Color("#868e96"))
	lock_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lock_hint.custom_minimum_size = Vector2(440, 0)
	lv.add_child(lock_hint)
	opt_box = VBoxContainer.new()
	opt_box.add_theme_constant_override("separation", 6)
	lv.add_child(opt_box)
	for i in 3:
		var b := _btn("A  I watch TV in my free time.", 20)
		b.custom_minimum_size = Vector2(440, 42)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.pressed.connect(func(): _speak_option(i))
		opt_box.add_child(b)
		opt_buttons.append(b)
	var rv := VBoxContainer.new()
	rv.add_theme_constant_override("separation", 8)
	hb.add_child(rv)
	bet_box = GridContainer.new()
	bet_box.columns = 2
	bet_box.add_theme_constant_override("h_separation", 8)
	bet_box.add_theme_constant_override("v_separation", 6)
	rv.add_child(bet_box)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 14)
	rv.add_child(row)
	start_btn = _btn("  Start ▶  ", 30, Color("#ffd166"))
	start_btn.custom_minimum_size = Vector2(220, 56)
	start_btn.pressed.connect(_on_start)
	row.add_child(start_btn)
	listen_btn = _btn("  ♪ Listen 聽句子  ", 28, Color("#ffd166"))
	listen_btn.custom_minimum_size = Vector2(260, 56)
	listen_btn.pressed.connect(_on_listen)
	row.add_child(listen_btn)
	next_btn = _btn("  Next ▶  ", 30, Color("#9be7c4"))
	next_btn.custom_minimum_size = Vector2(200, 56)
	next_btn.pressed.connect(_on_next)
	row.add_child(next_btn)
	walk_caption = _outlined(_label("", 38, Color.WHITE), 16)
	walk_caption.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	walk_caption.grow_horizontal = Control.GROW_DIRECTION_BOTH
	walk_caption.grow_vertical = Control.GROW_DIRECTION_BEGIN
	walk_caption.position.y = -40
	hud.add_child(walk_caption)

## 面板位置：分組＝下方置中全寬；兩人一組＝左下（右邊留給外框的題目面板）
func _layout_panel() -> void:
	call_deferred("_layout_panel_now")

func _layout_panel_now() -> void:
	qpanel.size = Vector2.ZERO
	if pair:
		qpanel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT, Control.PRESET_MODE_MINSIZE, 14)
		qpanel.grow_horizontal = Control.GROW_DIRECTION_END
	else:
		qpanel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_MINSIZE, 12)
		qpanel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	qpanel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	q_scene.custom_minimum_size = Vector2(460 if pair else 360, 0)

func _start_game() -> void:
	if pair:
		group_count = 1
	scores.clear()
	for g in group_count:
		scores.append(0 if pair else START_POINTS)
	run_seed = randi() % 900000 + 100000
	_make_clue_order()
	_host_send("report", {"type": "start", "seed": run_seed})
	qi = 0
	_enter_play()
	_show_question(true)

func _make_clue_order() -> void:
	# 線索每題隨機一種（11 題：音效 3、圖 3、影片 3、程式動畫 2，四種都會出現）；用 seed 洗牌，換裝置接續也一樣
	rng.seed = run_seed
	clue_order = ["sfx", "sfx", "sfx", "icons", "icons", "icons", "video", "video", "video", "anim", "anim"]
	for i in range(clue_order.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = clue_order[i]
		clue_order[i] = clue_order[j]
		clue_order[j] = tmp
	var force := OS.get_environment("CLUES")   # 測試用：CLUES=icons,video,anim,sfx 指定前幾題
	if force != "":
		var fs := force.split(",")
		for i in fs.size():
			clue_order[i] = fs[i]
	rng.randomize()

func _enter_play() -> void:
	_hide_all()
	hud.visible = true
	save_btn.visible = not pair
	_layout_panel()
	_build_chips()
	cam_pos = Vector3.ZERO

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
		if not pair:
			h.add_child(_icon(g, 40))
		var vb := VBoxContainer.new()
		vb.add_theme_constant_override("separation", -6)
		h.add_child(vb)
		vb.add_child(_label(" ＋ ".join(PackedStringArray(pair_ids.map(func(x): return String(x)))) if pair else "G%d" % (g + 1), 16))
		var sl := _label("0", 28)
		vb.add_child(sl)
		var bl := _label("", 22, Color("#7b5ea7"))
		h.add_child(bl)
		chips_box.add_child(pc)
		chip_nodes.append({"panel": pc, "score": sl, "bet": bl})
	_refresh_chips()

func _refresh_chips() -> void:
	for g in chip_nodes.size():
		chip_nodes[g]["score"].text = ("%d / %d" % [scores[g], items.size() * PAIR_POINTS]) if pair else str(scores[g])
		var t := ""
		if not pair and bets.has(g):
			t = "%s×%d" % [LETTERS[bets[g]], wagers.get(g, 1)]
		if last_delta.has(g):
			t = ("+%d" if last_delta[g] >= 0 else "%d") % last_delta[g]
		chip_nodes[g]["bet"].text = t

## 每題開始：Ken 站在這題的出發地點；第一題先念開場引導語
func _show_question(first := false) -> void:
	state = St.QUESTION
	_exit_home()
	_clear_act()
	_set_bike(false)
	_hide_clue()
	var It: Dictionary = items[qi]
	var my_qi := qi
	W["path"] = []
	W["pos"] = _spot(It["from"])
	if It["from"] == "ken_home":
		W["fwd"] = world.v2(world.places["ken_home"]["face"])
	_ken_anim("idle")
	world.clear_fade()
	_setup_face_cam(4.4, 1.8)
	cam_mode = "face"
	cam_pos = Vector3.ZERO
	bets.clear()
	wagers.clear()
	last_delta.clear()
	q_sub.text = "Q%d/%d" % [qi + 1, items.size()]
	q_scene.text = It["context"]
	q_ask.text = It["question"]
	answer_lbl.visible = false
	for i in 3:
		var b: Button = opt_buttons[i]
		b.text = "%s  %s" % [LETTERS[i], It["options"][i]]
		_paint(b, Color("#fff8e7"))
		b.disabled = false
	qpanel.visible = true
	opt_box.visible = not pair
	_build_bet_row()
	bet_box.visible = not pair
	start_btn.visible = not pair
	start_btn.disabled = true
	next_btn.visible = false
	listen_btn.visible = false
	walk_caption.text = ""
	for g in chip_nodes.size():
		chip_nodes[g]["panel"].add_theme_stylebox_override("panel", _style(GROUP_COLORS[g].lightened(0.6), Color(0.15, 0.12, 0.2), 16, 3))
	_refresh_chips()
	_layout_panel()
	sfx("question")
	scene_heard = false
	scene_playing = false
	first_q = first
	play_btn.visible = true
	play_btn.disabled = false
	play_btn.text = "▶ Play
聽情境"
	if first and not pair:
		q_scene.text = "%s
%s" % [ft["intro"], It["context"]]
	_set_locked(true)
	if pair:
		_show_clue_locked()
	_layout_panel()
	if web_autotest:
		await _wait(1.0)
		if qi == my_qi and state == St.QUESTION and not scene_playing:
			_on_play_scene()

## ① 情境：一定要學生／老師自己按 Play（iPad Safari 聲音要從按下去那一下開始）；聽完一次才解鎖下一步，之後可以一直重聽
func _on_play_scene() -> void:
	if scene_playing or not (state in [St.QUESTION, St.CLUE, St.ANSWER]):
		return
	var It: Dictionary = items[qi]
	var my_qi := qi
	scene_playing = true
	play_btn.disabled = true
	play_btn.text = "♪ …"
	if first_q and not scene_heard:
		await say("ft_intro")   # 第一題：先念開場引導語（say 裡 voice.play() 在按鈕這一下就開始）
		if qi != my_qi:
			return
	await say("ft_scene_%s" % It["id"])
	if qi != my_qi:
		return
	scene_playing = false
	play_btn.disabled = false
	play_btn.text = "▶ Play
再聽"
	if not scene_heard:
		scene_heard = true
		print("UNLOCK scene q%d" % (qi + 1))
		_set_locked(false)
		if pair:
			_unlock_clue()

## 鎖住／打開下一步：變灰＋提示字
func _set_locked(locked: bool) -> void:
	var a := 0.35 if locked else 1.0
	opt_box.modulate.a = a
	bet_box.modulate.a = a
	for b in opt_buttons:
		(b as Button).disabled = locked
	for row in bet_buttons:
		for b in row["opt"] + row["wager"]:
			(b as Button).disabled = locked
	lock_hint.visible = locked
	lock_hint.text = "Listen first 先按 ▶ Play 聽情境，聽完才會出現線索" if pair else "Listen first 先按 ▶ Play 聽情境（聽完才能選、押注）"

func _build_bet_row() -> void:
	for c in bet_box.get_children():
		bet_box.remove_child(c)
		c.queue_free()
	bet_buttons.clear()
	bet_box.columns = 2 if group_count <= 6 else 2
	for g in group_count:
		var pc := PanelContainer.new()
		var sb := _style(GROUP_COLORS[g].lightened(0.6), Color(0.15, 0.12, 0.2), 14, 2)
		sb.content_margin_top = 3
		sb.content_margin_bottom = 3
		sb.content_margin_left = 6
		sb.content_margin_right = 6
		pc.add_theme_stylebox_override("panel", sb)
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 3)
		pc.add_child(h)
		h.add_child(_icon(g, 32))
		var row := {"opt": [], "wager": []}
		for i in 3:
			var b := _btn(LETTERS[i], 20)
			b.custom_minimum_size = Vector2(42, 38)
			b.pressed.connect(func(): _bet(g, i))
			h.add_child(b)
			row["opt"].append(b)
		var x := _label("×", 20)
		h.add_child(x)
		for wi in WAGERS.size():
			var b := _btn(str(WAGERS[wi]), 20, Color("#e7f5ff"))
			b.custom_minimum_size = Vector2(38, 38)
			b.pressed.connect(func(): _wager(g, WAGERS[wi]))
			h.add_child(b)
			row["wager"].append(b)
		bet_buttons.append(row)
		bet_box.add_child(pc)
		_paint_bet(g)

func _paint_bet(g: int) -> void:
	var row: Dictionary = bet_buttons[g]
	for i in 3:
		_paint(row["opt"][i], Color("#ffd166") if bets.get(g, -1) == i else Color("#fff8e7"))
	for wi in WAGERS.size():
		_paint(row["wager"][wi], Color("#74c0fc") if wagers.get(g, 1) == WAGERS[wi] else Color("#e7f5ff"))

func _bet(g: int, i: int) -> void:
	if state != St.QUESTION or pair or not scene_heard:
		return
	bets[g] = i
	if not wagers.has(g):
		wagers[g] = 1
	_paint_bet(g)
	start_btn.disabled = bets.size() < group_count
	_refresh_chips()

func _wager(g: int, w: int) -> void:
	if state != St.QUESTION or pair or not scene_heard:
		return
	wagers[g] = mini(w, maxi(1, scores[g])) if scores[g] > 0 else 1
	_paint_bet(g)
	_refresh_chips()

func _speak_option(i: int) -> void:
	if not scene_heard:
		return
	var It: Dictionary = items[qi]
	say("ft_ans_%s" % It["opt_acts"][i])

func _repeat_voice() -> void:
	if state == St.TITLE or state == St.SETUP or state == St.RESULT:
		return
	var It: Dictionary = items[qi]
	if state == St.REVEAL:
		say("ft_ans_%s" % It["act"])
	else:
		_on_play_scene()

# ---------- 線索（只有兩人一組） ----------
func _build_clue_card() -> void:
	clue_card = PanelContainer.new()
	clue_card.add_theme_stylebox_override("panel", _style(Color(1, 1, 1, 0.98), Color(0.15, 0.12, 0.2), 22, 5))
	clue_card.position = Vector2(14, 96)
	ui.add_child(clue_card)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	clue_card.add_child(v)
	clue_title = _label("Clue 線索", 26, Color("#7b5ea7"))
	v.add_child(clue_title)
	clue_body = Control.new()
	clue_body.custom_minimum_size = Vector2(560, 315)
	clue_body.clip_contents = true
	v.add_child(clue_body)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	v.add_child(row)
	clue_start_btn = _btn("  ▶ Clue 看線索  ", 26, Color("#ffd166"))
	clue_start_btn.pressed.connect(_start_clue)
	row.add_child(clue_start_btn)
	clue_replay_btn = _btn("Again 再一次", 22)
	clue_replay_btn.pressed.connect(func(): if state in [St.CLUE, St.ANSWER] and scene_heard: _play_clue(items[qi]["act"], clue_order[qi]))
	row.add_child(clue_replay_btn)
	clue_btn = _btn("  Answer 作答 ▶  ", 26, Color("#ffd166"))
	clue_btn.pressed.connect(_clue_to_answer)
	row.add_child(clue_btn)
	clue_btn.custom_minimum_size = Vector2(250, 0)
	clue_card.visible = false

func _hide_clue() -> void:
	if clue_card:
		clue_card.visible = false
	if clue_video:
		clue_video.stop()
	if clue_audio:
		clue_audio.stop()

## ② 線索：情境沒聽完 → 卡片變灰鎖著；聽完 → 按 ▶ Clue 才播（聲音、影片從按下去那一下開始）
func _clue_placeholder(text: String) -> void:
	for c in clue_body.get_children():
		clue_body.remove_child(c)
		c.queue_free()
	var l := _label(text, 24, Color("#868e96"))
	l.size = clue_body.custom_minimum_size
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	clue_body.add_child(l)

func _show_clue_locked() -> void:
	clue_done = false
	clue_card.visible = true
	clue_card.modulate = Color(1, 1, 1, 0.55)
	clue_title.text = "Clue 線索（鎖住 Locked）"
	_clue_placeholder(("%s

" % ft["intro"] if first_q else "") + "Listen first
先按 ▶ Play 聽完情境
才會出現線索")
	clue_start_btn.visible = true
	clue_start_btn.disabled = true
	clue_replay_btn.visible = false
	clue_btn.visible = true
	clue_btn.disabled = true
	clue_btn.text = "Answer 作答（先看線索）"

func _unlock_clue() -> void:
	state = St.CLUE
	clue_card.modulate = Color.WHITE
	clue_title.text = "Clue 線索：%s" % CLUE_NAME[clue_order[qi]]
	_clue_placeholder("Tap ▶ Clue to see the clue
按 ▶ 看線索")
	clue_start_btn.disabled = false
	print("UNLOCK clue-button q%d" % (qi + 1))
	if web_autotest:
		await _wait(0.6)
		if state == St.CLUE and clue_start_btn.visible:
			_start_clue()

func _start_clue() -> void:
	if state != St.CLUE or not scene_heard:
		return
	clue_start_btn.visible = false
	clue_replay_btn.visible = true
	_play_clue(items[qi]["act"], clue_order[qi])

func _play_clue(act: String, kind: String) -> void:
	for c in clue_body.get_children():
		c.queue_free()
	clue_video = null
	var my_qi := qi
	var sz := clue_body.custom_minimum_size
	match kind:
		"sfx":
			var ca := ClueAnim.new()
			ca.act = "_sound"
			ca.size = sz
			clue_body.add_child(ca)
			clue_audio.stream = load("res://assets/clues/sfx/%s.mp3" % act)
			clue_audio.play()
			music.volume_db = -80.0
			await clue_audio.finished
			music.volume_db = VOL_DB[vol_level] - 6.0
			ca.playing = false
		"icons":
			var hb := HBoxContainer.new()
			hb.add_theme_constant_override("separation", 14)
			hb.size = sz
			hb.alignment = BoxContainer.ALIGNMENT_CENTER
			clue_body.add_child(hb)
			var trs := []
			for k in 3:
				var vb := VBoxContainer.new()
				hb.add_child(vb)
				var pc := PanelContainer.new()
				pc.add_theme_stylebox_override("panel", _style(Color.WHITE, Color(0.6, 0.58, 0.65), 14, 3))
				vb.add_child(pc)
				var tr := TextureRect.new()
				tr.texture = load("res://assets/clues/icons/%s_%d.png" % [act, k + 1])
				tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
				tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
				tr.custom_minimum_size = Vector2(160, 160)
				tr.modulate.a = 0.0
				pc.add_child(tr)
				var l := _label("%d" % (k + 1), 24, Color("#7b5ea7"))
				l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				vb.add_child(l)
				trs.append(tr)
			for k in 3:   # 一次一張：第 1 張最不明顯
				await get_tree().create_timer(0.4 if k == 0 else 2.2).timeout
				if qi != my_qi or not is_instance_valid(trs[k]):
					return
				var tr: TextureRect = trs[k]
				tr.pivot_offset = Vector2(80, 80)
				tr.scale = Vector2(0.6, 0.6)
				var tw := create_tween().set_parallel()
				tw.tween_property(tr, "modulate:a", 1.0, 0.35)
				tw.tween_property(tr, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
				sfx("click", 1.3 + k * 0.15)
			await get_tree().create_timer(0.8).timeout
		"video":
			var vp := VideoStreamPlayer.new()
			var st := VideoStreamTheora.new()
			st.file = "res://assets/clues/video/%s.ogv" % act
			vp.stream = st
			vp.size = sz
			vp.expand = true
			clue_body.add_child(vp)
			clue_video = vp
			vp.play()
			var tt := 0.0
			while is_instance_valid(vp) and vp.is_playing() and tt < 9.0:
				await get_tree().create_timer(0.2).timeout
				tt += 0.2
		"anim":
			var ca := ClueAnim.new()
			ca.act = act
			ca.size = sz
			clue_body.add_child(ca)
			await get_tree().create_timer(ClueAnim.LOOP).timeout
	if qi != my_qi:
		return
	clue_done = true
	clue_btn.disabled = false
	clue_btn.text = "  Answer 作答 ▶  "
	print("UNLOCK answer q%d (clue %s done)" % [qi + 1, kind])
	if web_autotest and state == St.CLUE:
		_clue_to_answer()

func _clue_to_answer() -> void:
	if state != St.CLUE or not clue_done:
		return
	state = St.ANSWER
	clue_btn.visible = false
	q_ask.text = "%s  ▶ 作答 Answer →" % items[qi]["question"]
	_host_ask()

func _replay_scene_and_clue() -> void:
	# 外框的「再聽一次」：重播情境（線索用卡片上的 Again 重播）
	if state == St.CLUE or state == St.ANSWER:
		_on_play_scene()

# ---------- 揭曉：Ken 去正確的地方做那件事 ----------
func _on_start() -> void:
	if pair:
		if state != St.ANSWER:
			return
	elif state != St.QUESTION or bets.size() < group_count:
		return
	state = St.WALKING
	_hide_clue()
	world.clear_fade()
	var It: Dictionary = items[qi]
	var travel: String = It["travel"]
	W["travel"] = "walk" if travel == "none" else travel
	var dest := _spot(It["to"])
	var path: Array = []
	if It["from"] != It["to"]:
		path = world.route(W["pos"], dest)
	if It["to"] == "ken_home":
		# 走到門口前（離門約 1 m，不穿過牆或門），面向門，之後淡出＝進門
		path.append(dest)
		path.append(dest - world.v2(world.places["ken_home"]["face"]) * 0.35)
	if path.is_empty():
		path.append((W["pos"] as Vector2) + (W["fwd"] as Vector2) * 0.6)
	W["path"] = path
	travel_t = 0.0
	if W["travel"] != "bike":
		_remove_parked()
	# 出發前先轉向第一個路點：跟拍鏡頭一開始就在 Ken 背後的路上，不會卡進家裡／街屋模型（畫面一片黑）
	var first_d: Vector2 = (path[0] as Vector2) - (W["pos"] as Vector2)
	if first_d.length() > 0.1:
		W["fwd"] = first_d.normalized()
	match W["travel"]:
		"jog":
			_ken_anim("ft/jogging")
		"bike":
			_set_bike(true)
		_:
			_ken_anim("walk")
	am.gait_setup()
	sfx("unlock")
	cam_mode = "follow"
	follow_pick = []
	follow_cam2 = Vector2.INF
	cam_pos = Vector3.ZERO   # 直接切到 Ken 背後（不要從正面慢慢掃過去，會穿過房子）
	qpanel.visible = false
	walk_caption.text = "Ken, what do you do in your free time…?"

func _on_arrive() -> void:
	if state != St.WALKING:
		return
	state = St.REVEAL
	var It: Dictionary = items[qi]
	walk_caption.text = ""
	sfx("arrive")
	var perf: String = It["perform"]
	if perf.begins_with("indoor:"):
		_ken_anim("idle")
		if It["to"] == "ken_home":
			W["fwd"] = -world.v2(world.places["ken_home"]["face"])   # 面向家門
			# 鏡頭在 Ken 背後斜上方：看得到 Ken 停在門前（不是穿過門）
			var pp: Vector2 = W["pos"]
			var fw: Vector2 = W["fwd"]
			var cp: Vector2 = pp - fw * 3.6 + Vector2(-fw.y, fw.x) * 1.4
			fixed_cam = [world.bend2(cp, 2.2), world.bend2(pp + fw * 1.2, 1.0), world.bend2(pp).normalized()]
			cam_mode = "fixed"
			await _wait(0.6)
		if test_mode:
			await _wait(0.4)
			await _shot("A%02d_%s_3b_door" % [qi + 1, It["act"]] if not pair else "B%02d_%s_3b_door" % [qi + 1, It["act"]])
		await _fade(true)
		_set_bike(false)
		_enter_home(perf.substr(7))
		await _fade(false)
	else:
		var kind := perf.substr(4)
		if kind != "bike":
			if am.riding:
				_park_bike()   # 騎車來的：下車，車停在旁邊（不是憑空消失）
			_ken_anim("idle", 0.0)
		var wide := kind in ["basketball", "camping", "baseball"]
		_setup_face_cam(6.0 if wide else 3.2, 2.1 if wide else 1.7)
		var p: Vector2 = W["pos"]
		# 演出鏡頭：重要的東西（Ken、籃框、球、帳篷、營火、壘包）都在畫面左邊或中間——右邊有按鈕、下面有題目面板（老師 11/10）
		# face_cam = [鏡頭平面位置, 鏡頭高, 方向, 看哪裡, 看的高度]
		if kind == "basketball" or kind == "baseball" or kind == "camping":
			var f: Vector2 = -(face_cam[2] as Vector2)
			W["fwd"] = f
			var right := Vector2(-f.y, f.x)
			match kind:
				"basketball":   # Ken 右後方：Ken 在左、籃框在中間偏右上
					face_cam = [p + right * 4.6 - f * 1.6, 1.6, right, p + f * 1.2 + right * 0.3, 0.6]
				"baseball":     # Ken 前方偏右：看得到臉、球棒、飛來的球和右邊的壘包
					face_cam = [p + f * 5.2 + right * 0.9, 2.0, right, p + right * 1.3, 0.5]
				"camping":      # Ken 前方偏左：Ken 跪著看營火，後面是帳篷
					face_cam = [p + f * 3.4 - right * 1.7, 1.55, -right, p + f * 0.4 + right * 0.6, 0.45]
			world.fade_between(face_cam[0], p, "", 0.0)
		_start_act(kind)
		if not roam:
			cam_mode = "act"
		cam_pos = Vector3.ZERO
	_reveal_panel()

func _reveal_panel() -> void:
	var It: Dictionary = items[qi]
	qpanel.visible = true
	opt_box.visible = false
	bet_box.visible = false
	start_btn.visible = false
	q_scene.text = It["context"]
	q_ask.text = It["question"]
	play_btn.visible = false
	lock_hint.visible = false
	answer_lbl.visible = true
	answer_lbl.text = "%s  %s" % [LETTERS[It["answer"]], It["options"][It["answer"]]]
	var any_hit := false
	if pair:
		any_hit = pair_correct
		last_delta = {0: PAIR_POINTS if pair_correct else 0}
		if pair_correct:
			scores[0] += PAIR_POINTS
			_pop_points(0, PAIR_POINTS)
		q_sub.text = "Great! 答對了" if pair_correct else "Answer 答案"
		chip_nodes[0]["panel"].add_theme_stylebox_override("panel", _style(Color("#b2f2bb") if pair_correct else Color("#e9ecef"), Color("#2b8a3e") if pair_correct else Color("#c92a2a"), 16, 5))
	else:
		for g in group_count:
			var hit: bool = bets.get(g, -1) == It["answer"]
			var w: int = wagers.get(g, 1)
			var d := w if hit else -mini(w, scores[g])
			scores[g] += d
			last_delta[g] = d
			any_hit = any_hit or hit
			if hit:
				_pop_points(g, w)
			chip_nodes[g]["panel"].add_theme_stylebox_override("panel", _style(Color("#b2f2bb") if hit else Color("#e9ecef"), Color("#2b8a3e") if hit else Color("#c92a2a"), 16, 5))
		q_sub.text = "Q%d/%d" % [qi + 1, items.size()]
	_refresh_chips()
	_layout_panel()
	sfx("correct" if any_hit else "wrong")
	listened = false
	listen_btn.visible = true
	listen_btn.disabled = false
	next_btn.visible = true
	next_btn.disabled = true
	next_btn.text = "  Next ▶  " if qi < items.size() - 1 else "  Results  "
	if not pair:
		save_progress(true)
	if web_autotest:
		await _wait(1.5)
		await _on_listen()
		_on_next()

func _on_listen() -> void:
	if state != St.REVEAL:
		return
	listen_btn.disabled = true
	await say("ft_ans_%s" % items[qi]["act"])
	listened = true
	listen_btn.disabled = false
	next_btn.disabled = false

func _pop_points(g: int, pts: int) -> void:
	var pc: PanelContainer = chip_nodes[g]["panel"]
	var l := _label("+%d" % pts, 40, Color("#2b8a3e"))
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
	if in_home:
		await _fade(true)
		_exit_home()
		_fade(false)
	if qi < items.size() - 1:
		qi += 1
		_show_question()
	else:
		_show_result()

func _toggle_map() -> void:
	if in_home:
		return
	if cam_mode == "map":
		cam_mode = {St.WALKING: "follow", St.REVEAL: ("roam" if roam else "act")}.get(state, "face")
		map_btn.text = "Map 地圖"
	else:
		cam_mode = "map"
		map_btn.text = "Back 回來"

func _toggle_fast() -> void:
	fast = not fast
	fast_btn.text = "Fast ×3" if fast else "Fast ×1"
	# 快轉＝移動和動作一起 ×3（腳還是不滑），在 _step_ken／_advance_anim 算

func _go_home() -> void:
	W["path"] = []
	ask_poll = false
	AudioServer.set_bus_mute(0, false)
	_show_title()

# ---------- 保留進度（分組；存在瀏覽器，只存組數、圖示、分數、第幾題） ----------
func save_progress(silent := false) -> void:
	if pair:
		if not silent:
			_toast("Saved ✓ 每一題都自動存好了")
		return
	if state == St.RESULT or state == St.TITLE or state == St.SETUP:
		return
	var next_q := qi + 1 if state == St.REVEAL else qi
	var d := {"version": 2, "saved_at": Time.get_datetime_string_from_system(), "group_count": group_count,
		"group_icons": group_icons, "scores": scores, "qi": next_q}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		if not silent:
			_toast("Save failed 儲存失敗")
		return
	f.store_string(JSON.stringify(d))
	f.close()
	if not silent:
		_toast("Saved ✓ 已保留（Q%d/%d）" % [mini(next_q + 1, items.size()), items.size()])

func _read_save() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(d) != TYPE_DICTIONARY or int(d.get("version", 0)) != 2:
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
	qi = int(d["qi"])
	_enter_play()
	if qi >= items.size():
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

# ---------- 結果：各組分數＋Ken 雙手高舉慶祝 ----------
func _build_result() -> void:
	result_ui = Control.new()
	result_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	result_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(result_ui)
	var panel := PanelContainer.new()
	panel.name = "Panel"
	panel.add_theme_stylebox_override("panel", _style(Color(1, 0.98, 0.94, 0.96), Color(0.15, 0.12, 0.2), 28, 5))
	panel.position = Vector2(24, 24)
	result_ui.add_child(panel)
	confetti = Control.new()
	confetti.set_anchors_preset(Control.PRESET_FULL_RECT)
	confetti.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(confetti)
	confetti.visible = false

func _show_result() -> void:
	_exit_home()
	_clear_act()
	_set_bike(false)
	_hide_clue()
	if pair:
		_host_send("report", {"type": "complete", "score": scores[0] if not scores.is_empty() else 0})
	else:
		_delete_save()
	state = St.RESULT
	sfx("victory")
	_hide_all()
	result_ui.visible = true
	# Ken 在最後一題的地方雙手高舉慶祝（老師核可的 Mixamo Cheering）
	W["path"] = []
	W["pos"] = _spot(items[-1]["to"])
	_ken_anim("ft/cheering")
	_setup_face_cam(4.0, 1.6)
	var p: Vector2 = W["pos"]
	var fd: Vector2 = face_cam[2]
	face_cam[0] = p + fd * 3.6 + Vector2(-fd.y, fd.x) * 1.6   # Ken 在畫面右半邊（左邊是分數表）
	cam_mode = "act"
	cam_pos = Vector3.ZERO
	var panel: PanelContainer = result_ui.get_node("Panel")
	for c in panel.get_children():
		c.queue_free()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	panel.add_child(v)
	var t := _label("Great job! 太棒了！", 46)
	v.add_child(t)
	v.add_child(_label("Ken's free time ・ %d questions" % items.size(), 22, Color("#7b5ea7")))
	var order := range(scores.size())
	order.sort_custom(func(a, b): return scores[a] > scores[b])
	var top: int = scores[order[0]]
	var rank := 0
	var prev := -999
	for i in order.size():
		var g: int = order[i]
		if scores[g] != prev:
			rank = i + 1
			prev = scores[g]
		var pc := PanelContainer.new()
		var win: bool = scores[g] == top
		pc.add_theme_stylebox_override("panel", _style(Color("#ffe066") if win else GROUP_COLORS[g % GROUP_COLORS.size()].lightened(0.65), Color(0.15, 0.12, 0.2), 16, 3))
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 14)
		pc.add_child(h)
		h.add_child(_label("#%d" % rank, 28, Color("#e8590c") if win else Color(0.15, 0.12, 0.2)))
		if not pair:
			h.add_child(_icon(g, 44))
		var nm := _label(" ＋ ".join(PackedStringArray(pair_ids.map(func(x): return String(x)))) if pair else "Group %d" % (g + 1), 26)
		nm.custom_minimum_size = Vector2(170, 0)
		h.add_child(nm)
		h.add_child(_label(("%d / %d" % [scores[g], items.size() * PAIR_POINTS]) if pair else "%d points" % scores[g], 28))
		v.add_child(pc)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	v.add_child(row)
	var again := _btn("Play again 再玩一次", 24, Color("#ffd166"))
	again.pressed.connect(func(): _start_game())
	row.add_child(again)
	if not pair:
		var setup := _btn("New groups 重新設定", 24)
		setup.pressed.connect(_show_setup)
		row.add_child(setup)
	_burst_confetti()

func _burst_confetti() -> void:
	confetti.visible = true
	for c in confetti.get_children():
		c.queue_free()
	var vs := get_viewport().get_visible_rect().size
	for i in 70:
		var r := ColorRect.new()
		r.color = GROUP_COLORS[i % GROUP_COLORS.size()]
		r.size = Vector2(randf_range(8, 16), randf_range(12, 22))
		r.position = Vector2(randf() * vs.x, -30 - randf() * 300)
		r.rotation = randf() * TAU
		r.mouse_filter = Control.MOUSE_FILTER_IGNORE
		confetti.add_child(r)
		var tw := create_tween().set_loops()
		var dur := randf_range(2.6, 4.2)
		tw.tween_property(r, "position:y", vs.y + 40, dur).from(-30.0)
		tw.parallel().tween_property(r, "rotation", r.rotation + TAU * 2, dur)

# ---------- 自動測試（--test） ----------
## MODEA=1（預設）：分組 6 組整回合 11 題、每一步截圖 test_ft_A*.png
## PAIR=1：假外框兩人一組整回合、四種線索、自動作答，截圖 test_ft_B*.png
## INTRO=1：首頁空拍
func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://test_shots"))
	img.save_png("res://test_shots/%s.png" % name)
	print("SHOT ", name)

var test_fail: Array = []
var test_checks := 0
func _check(ok: bool, what: String) -> void:
	test_checks += 1
	if not ok:
		test_fail.append(what)
		push_error("LOCKFAIL " + what)
	print("CHECK %s %s" % ["ok  " if ok else "FAIL", what])

## 演出時重要的東西有沒有被右側按鈕或下方面板蓋住（投影到螢幕檢查；印每個點的位置）
func _key_points() -> Dictionary:
	var out := {}
	if in_home:
		out["ken_head"] = interior_sk.global_transform * interior_sk.get_bone_global_pose(interior_sk.find_bone(_bone_name_in(interior_sk, "head"))).origin
		match interior_shot:
			"watch_tv":
				var tv := interior.find_child("TVScreen", true, false) as Node3D
				out["tv_center"] = tv.global_position
				for sx in [-0.5, 0.5]:
					for sy in [-0.29, 0.29]:
						out["tv_corner_%d_%d" % [int(sx * 2), int(sy * 4)]] = tv.global_transform * Vector3(sx * 1.06, sy, 0)
			"surf_internet", "online_games":
				out["pc_screen"] = (interior.find_child("PCScreen", true, false) as Node3D).global_position
			"study_english":
				out["book"] = (interior.get_node("book") as Node3D).global_position
			"recorder":
				for pr in interior_props:
					out["recorder"] = (pr as Node3D).get_child(0).global_position
		return out
	var sk: Skeleton3D = W["sk"]
	out["ken_head"] = sk.global_transform * sk.get_bone_global_pose(sk.find_bone(_bone_name("head"))).origin
	out["ken_hips"] = sk.global_transform * sk.get_bone_global_pose(sk.find_bone(_bone_name("hips"))).origin
	match act_kind:
		"basketball":
			out["ball"] = am.ball.global_position
			out["hoop_ring"] = act_root.global_transform * Vector3(0, 2.15, 2.6)
			out["backboard_top"] = act_root.global_transform * Vector3(0, 2.75, 2.9)
		"camping":
			out["fire"] = (act_root.get_node("Fire") as Node3D).global_position
			out["tent"] = act_root.global_transform * Vector3(-1.6, 1.0, -1.2)
		"baseball":
			out["base"] = am.base_node.global_position
			out["bat"] = am.bat.global_position
		"bike":
			if am.bike:
				for w in am.wheels:
					out["wheel_%d" % am.wheels.find(w)] = (w as Node3D).global_position
	return out

func _bone_name_in(sk: Skeleton3D, key: String) -> String:
	for i in sk.get_bone_count():
		if sk.get_bone_name(i).to_lower().replace("mixamorig", "").replace(":", "").replace("_", "") == key:
			return sk.get_bone_name(i)
	return ""

func _hud_safe() -> bool:
	var vs := get_viewport().get_visible_rect().size
	var col := hud_col.get_global_rect().grow(8)
	var pan := qpanel.get_global_rect().grow(8) if qpanel.visible else Rect2()
	var ok := true
	var line := "HUDSAFE view=%s col=%s panel=%s" % [vs, col, pan]
	var pts := _key_points()
	for k in pts:
		var w: Vector3 = pts[k]
		if cam.is_position_behind(w):
			line += " %s=BEHIND" % k
			ok = false
			continue
		var sp := cam.unproject_position(w)
		var bad := col.has_point(sp) or pan.has_point(sp) or sp.x < 0 or sp.y < 0 or sp.x > vs.x or sp.y > vs.y
		line += " %s=(%d,%d)%s" % [k, sp.x, sp.y, "!" if bad else ""]
		ok = ok and not bad
	print(line)
	return ok

func _wait(sec: float) -> void:
	await get_tree().create_timer(sec).timeout

func _wait_state(st: int, limit := 60.0) -> void:
	var g := 0.0
	while state == st and g < limit:
		await _wait(0.2)
		g += 0.2

func _run_test() -> void:
	if OS.get_environment("INTRO") != "":
		title_ui.visible = false
		for i in 9:
			await _wait(1.5)
			await _shot("intro_%d" % i)
		get_tree().quit()
		return
	vol_level = 0
	_apply_volume()
	if OS.get_environment("CLUEANIM") != "":
		# 11 個程式動畫線索各拍一張（動畫 3 秒處）
		title_ui.visible = false
		intro_t = INTRO_END
		# 每段 4 格（準備／接觸／中間／結束）；球類印「碰到那一格」的量測（px，0＝剛好碰到）
		var times := {"baseball": [0.3, 0.9, 1.5, 4.5], "basketball": [0.05, 0.3, 0.75, 1.48], "bike": [0.5, 1.5, 3.0, 5.0]}
		for act in ft["phrases"]:
			var tl: Array = times.get(act, [0.6, 2.0, 3.5, 5.4])
			for k in 4:
				for c in clue_body.get_children():
					c.queue_free()
				var ca := ClueAnim.new()
				ca.act = act
				ca.size = clue_body.custom_minimum_size
				ca.t = float(tl[k])
				ca.playing = false
				clue_body.add_child(ca)
				clue_title.text = "Clue 線索：%s" % CLUE_NAME["anim"]
				clue_card.visible = true
				await _wait(0.15)
				await _shot("clueanim_%s_%d" % [act, k])
				if k == 0 and act == "baseball":
					print("CLUEGAP baseball ball-bat at contact %.2f px" % ClueAnim.baseball_contact_gap())
				if k == 0 and act == "basketball":
					print("CLUEGAP basketball gaps (px) ", ca.basketball_gaps())
		get_tree().quit()
		return
	var only := int(OS.get_environment("ONLYQ")) if OS.get_environment("ONLYQ") != "" else 0
	if pair:
		await _test_pair(only)
	else:
		await _test_groups(only)
	print("TEST SUMMARY checks=%d failed=%d %s" % [test_checks, test_fail.size(), test_fail])
	get_tree().quit(1 if test_fail.size() > 0 else 0)

func _test_groups(only: int) -> void:
	await _wait(2.5)
	intro_t = INTRO_END
	await _wait(1.0)
	await _shot("A00_title")
	_show_setup()
	_set_group_count(6)
	await _wait(0.4)
	await _shot("A01_setup")
	_start_game()
	if only > 0:
		qi = only - 1
		_show_question()
	fast = true
	var n0 := qi
	for n in range(n0, items.size() if only == 0 else only):
		var It: Dictionary = items[qi]
		await _wait(1.2)
		var tag := "A%02d_%s" % [qi + 1, It["act"]]
		await _shot(tag + "_1scenario_locked")
		_bet(0, 0)   # 還沒聽情境：押注要被擋下來
		_on_start()   # 還沒押注：Start 要被擋
		_check(bets.size() == 0 and opt_buttons[0].disabled and bet_buttons[0]["opt"][0].disabled and lock_hint.visible and start_btn.disabled and state == St.QUESTION, "A q%d locked before scenario audio" % (qi + 1))
		await _on_play_scene()
		_check(scene_heard and not opt_buttons[0].disabled and not bet_buttons[0]["opt"][0].disabled and not lock_hint.visible, "A q%d options+bets unlocked after scenario audio ended" % (qi + 1))
		_bet(0, 1)
		_on_start()   # 只有 1 組押：Start 還不能按
		_check(state == St.QUESTION and start_btn.disabled, "A q%d start blocked until every group bets" % (qi + 1))
		await _wait(0.3)
		if n == n0 or qi == 1:
			await _shot(tag + "_1b_unlocked")
		for g in group_count:
			_bet(g, rng.randi() % 3)
			_wager(g, WAGERS[rng.randi() % 3])
		await _wait(0.3)
		await _shot(tag + "_2bets")
		_check(not start_btn.disabled, "A q%d start enabled after all groups bet" % (qi + 1))
		var before: Array = scores.duplicate()
		fast = false   # 移動截圖用正常速度（Fast ×3 時鏡頭跟不上，Ken 會跑出畫面）
		_on_start()
		await _wait(2.2 if It["travel"] != "none" else 0.1)
		if It["travel"] != "none":
			await _shot(tag + "_3moving")
			var pth: Array = W["path"]
			if not pth.is_empty():
				var dirv: Vector2 = ((pth[0] as Vector2) - (W["pos"] as Vector2))
				var ang := rad_to_deg(absf((W["fwd"] as Vector2).angle_to(dirv))) if dirv.length() > 0.3 else 0.0
				_check(ang < 35.0, "A q%d Ken faces where he walks (%.0f°)" % [qi + 1, ang])
		fast = true
		await _wait_state(St.WALKING)
		var gw := 0.0
		while not next_btn.visible and gw < 8.0:   # 進門有淡出／淡入，等演出面板出來
			await _wait(0.2)
			gw += 0.2
		await _wait(1.6)
		await _shot(tag + "_4act")
		_check(_hud_safe(), "A q%d key objects not under HUD buttons / bottom panel" % (qi + 1))
		if roam or act_kind == "baseball":   # 一直在動的演出：多看幾秒（含迴轉、跑壘）
			var all_ok := true
			for i in 16:
				await _wait(0.5)
				all_ok = _hud_safe() and all_ok
			_check(all_ok, "A q%d moving act stays clear of HUD for 8 s" % (qi + 1))
		if OS.get_environment("BATAXIS") != "":
			var a: AnimationPlayer = W["anim"]
			for tt in [0.6, 1.1, 1.6]:
				a.seek(tt, true)
				a.pause()
				var p: Vector2 = W["pos"]
				var f: Vector2 = W["fwd"]
				fixed_cam = [world.bend2(p + f * 2.2 + Vector2(-f.y, f.x) * 0.8, 1.2), world.bend2(p, 0.9), world.bend2(p).normalized()]
				cam_mode = "fixed"
				await _wait(0.2)
				await _shot("bat_%s_%.1f" % [OS.get_environment("BATAXIS"), tt])
		var ok_score := true
		for g in group_count:
			var w: int = wagers.get(g, 1)
			var want: int = before[g] + (w if bets[g] == It["answer"] else -mini(w, before[g]))
			ok_score = ok_score and scores[g] == want
		_check(ok_score and state == St.REVEAL, "A q%d scores updated by betting rule" % (qi + 1))
		if String(It["perform"]).begins_with("indoor:"):
			_check(in_home and cam_mode == "interior", "A q%d indoor activity shown inside Ken's home" % (qi + 1))
		_on_next()   # 還沒聽答案句：Next 要被擋
		_check(state == St.REVEAL and next_btn.disabled, "A q%d next blocked until answer sentence heard" % (qi + 1))
		print("ROUND %d %s from=%s to=%s perform=%s scores=%s state=%d" % [qi + 1, It["act"], It["from"], It["to"], It["perform"], scores, state])
		await _on_listen()
		await _on_next()
		await _wait(0.4)
	if only == 0:
		await _wait(1.8)
		await _shot("A99_result")
		await _wait(0.6)
		await _shot("A99_result_b")
	if only == 0:
		_check(state == St.RESULT and result_ui.visible and cur_anim == "ft/cheering", "A result scoreboard + Ken cheering")
	print("GROUP TEST DONE scores=", scores)

func _test_pair(only: int) -> void:
	await _wait(2.5)
	intro_t = INTRO_END
	await _wait(1.0)
	await _shot("B00_title")
	_start_game()
	if only > 0:
		qi = only - 1
		_show_question()
	fast = true
	var seen := {}
	var n0 := qi
	for n in range(n0, items.size() if only == 0 else only):
		var It: Dictionary = items[qi]
		var kind: String = clue_order[qi]
		var tag := "B%02d_%s" % [qi + 1, It["act"]]
		await _wait(0.8)
		if n == n0:
			await _shot(tag + "_1scenario_locked")
		_start_clue()
		_clue_to_answer()
		_check(state == St.QUESTION and clue_start_btn.disabled and clue_btn.disabled and not ask_poll and clue_card.modulate.a < 0.9, "B q%d clue+answer locked before scenario audio" % (qi + 1))
		await _on_play_scene()
		await _wait(0.3)
		_check(state == St.CLUE and not clue_start_btn.disabled and clue_btn.disabled, "B q%d clue unlocked after scenario audio ended" % (qi + 1))
		if n == n0:
			await _shot(tag + "_1b_clue_unlocked")
		_clue_to_answer()   # 線索還沒看：要被擋
		_check(state == St.CLUE and not ask_poll, "B q%d answer refused before clue played" % (qi + 1))
		_start_clue()
		await _wait(0.4)
		_clue_to_answer()   # 線索播到一半：還是要被擋
		_check(state == St.CLUE and not ask_poll and clue_btn.disabled, "B q%d answer refused while clue still playing" % (qi + 1))
		if n == n0:
			await _shot(tag + "_1c_clue_playing_answer_locked")
		if not seen.has(kind):
			await _wait(2.0 if kind == "video" else 1.2)
			await _shot("%s_2clue_%s" % [tag, kind])
			if kind == "icons":
				await _wait(4.5)
				await _shot("%s_2clue_icons_all" % tag)
			seen[kind] = true
		var g2 := 0.0
		while not clue_done and g2 < 20.0:
			await _wait(0.2)
			g2 += 0.2
		_check(clue_done and not clue_btn.disabled, "B q%d answer unlocked after clue fully given" % (qi + 1))
		test_answer_wait = 1.0
		if n == n0:
			await _shot(tag + "_2d_answer_unlocked")
		_clue_to_answer()
		_check(state == St.ANSWER and ask_poll, "B q%d question sent to frame" % (qi + 1))
		await _wait(0.3)
		if n == n0:
			await _shot(tag + "_3asked")
		while state == St.ANSWER:
			await _wait(0.2)
		await _wait_state(St.WALKING)
		var gw := 0.0
		while not next_btn.visible and gw < 8.0:   # 進門有淡出／淡入，等演出面板出來
			await _wait(0.2)
			gw += 0.2
		await _wait(1.6)
		await _shot(tag + "_4act")
		_check(state == St.REVEAL, "B q%d Ken acted out the answer" % (qi + 1))
		_check(_hud_safe(), "B q%d key objects not under HUD buttons / bottom panel" % (qi + 1))
		print("PAIR %d %s clue=%s correct=%s score=%s" % [qi + 1, It["act"], kind, pair_correct, scores])
		await _on_listen()
		await _on_next()
		await _wait(0.3)
	if only == 0:
		await _wait(1.8)
		await _shot("B99_result")
		_check(state == St.RESULT and cur_anim == "ft/cheering" and scores[0] % PAIR_POINTS == 0, "B result pair score shown")
	print("PAIR TEST DONE clues=", clue_order, " score=", scores)
