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
## 路太長：走 WALK_CAP 秒（真實時間）後淡出，跳到剩 WALK_TAIL 秒的地方（畫面寫 A few minutes later…）
const TRAVEL_SPEED := {"walk": 1.4, "jog": 2.0, "bike": 4.5}
## [perf] 11/11：舊的 SKIP_AFTER 5.0／SKIP_END 4.5（遊戲時間）改成 WALK_CAP／WALK_TAIL／WALK_HARD（真實時間），見下面 [perf] 區
const INDOOR_OUTLINE := 0.15   # 室內近距離鏡頭描邊（戶外遠景維持 0.3）；手再乘 0.25
## [routes] 四條路線（規格 rdq/RDQ-spec-freetime-routes-BCD-20261111.md）：選完玩法再選路線；兩種玩法都能選。
const ROUTES := [
	{"id": "ken_a", "who": "ken", "label": "Ken A", "zh": "Ken A 路線", "sub": "I ___ in my free time.", "col": "#ffd166"},
	{"id": "ken_b", "who": "ken", "label": "Ken B", "zh": "Ken B 路線", "sub": "I ___ in my free time.", "col": "#ffc078"},
	{"id": "shuiling", "who": "shuiling", "label": "Shuiling", "zh": "水鈴路線", "sub": "She ___ in her free time.", "col": "#a5d8ff"},
	{"id": "zunbo", "who": "zunbo", "label": "Zun-Bo", "zh": "圳寶路線", "sub": "He ___ in his free time.", "col": "#b2f2bb"},
]
const CHARS := {
	"ken": {"model": "ken_openhand", "h": 1.3, "home": "ken_home", "name": "Ken", "mascot": false},
	"shuiling": {"model": "shuiling_softhand", "h": 1.2, "home": "shuiling_home", "name": "Shuiling", "mascot": true},
	"zunbo": {"model": "zunbo_openhand", "h": 1.15, "home": "zunbo_home", "name": "Zun-Bo", "mascot": true},
}
## 吉祥物揮棒 v6 的關鍵姿勢（抄自 mascot_motion_check.gd PB6_REL，老師 11/11 定案）
const MASCOT_PB6 := {
	"shuiling": [[-0.40, Vector3(0.03, -0.8, 0.6), Vector3(0.1, 0.3, 0.95)], [0.0, Vector3(0.035, -0.8, 0.0), Vector3(1.0, 0.0, -0.05)], [0.35, Vector3(0.03, -0.8, -0.6), Vector3(0.15, 0.2, -0.95)]],
	"zunbo": [[-0.40, Vector3(0.06, -0.2, 1.15), Vector3(0.25, 0.05, 1.0)], [0.0, Vector3(0.06, -0.2, 1.0), Vector3(1.0, 0.0, -0.05)], [0.35, Vector3(0.06, -0.2, 0.85), Vector3(0.45, 0.05, -0.9)]],
}
const BB_STEP := 1.0 / 120.0
var bb_acc := 0.0
var frame_lift := 0.0           # 角色座標架離星球表面多高（吉祥物打棒球時＝路面高度，其他時候 0）
var bb_hold := false            # 檢查圖：停在球碰到球棒那一格
const SCOOTER_SPEED := 5.0
const MASCOT_BIKE_SPEED := 2.4   # 童車輪子小（r 0.12）：2.4 m/s ≈ 每秒踩 1.4 圈

var route_id := "ken_a"
var routes_data := {}
var who := ""
var chars := {}                 # who → W（每個角色自己的模型、動作、ActMotion、室內）
var mascot := false
var home_id := "ken_home"
var mm                          # 和 am 同一個物件（不指定型別：吉祥物專用函式 run_setup／apply_run／sit_ground）
var speeds := {}                # 這個角色的移動速度（m/s）
var proc_gait := ""             # 吉祥物程式走路／跑步中："walk"／"jog"
var run_clock := 0.0
var gait_off := 0.0
var model_locked := false       # 模型位置由姿勢函式決定（圳寶坐地露營）
var camp_pose: Array = []
var scooter                     # scripts/scooter_rig.gd（圳寶媽媽騎機車；目前是替代模型）
var scooter_holder: Node3D
var scooter_place := ""
var skirt_rep := {}
var interior_def := {}
var route_ui: Control
var route_next := "groups"
var title_sub: Label
var go_btn: Button
var sheet_freeze := false

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
var roam_high := false
var roam_back := Vector2.ZERO
var hud_col: VBoxContainer
var bb_cut := false

# ---------- [perf] iPad 揭曉卡頓（規格 rdq/RDQ-spec-freetime-ipad-perf-20261111.md） ----------
## 走路上限用「真實時間」（Time.get_ticks_msec）：幀數低的時候遊戲時間會變慢，不能只看 travel_t
const WALK_CAP := 2.5      # 每段路最多先走 2.5 秒（看得出往哪走）→ 淡出 → 跳到快到的地方
const WALK_TAIL := 1.2     # 跳過之後還剩幾秒的路（看得到走到門口／活動地點）
const WALK_HARD := 7.0     # 很慢的裝置：出發後超過 7 秒（真實時間）還沒到 → 直接跳到終點
const RUN_CAP := 3.0       # 演出中的移動（跑壘）最多 3 秒（真實時間）
var BASE_RUN_OLD := false
const BASE_RUN_K := 1.5    # 跑壘＝慢跑動作 ×1.5 倍播放、同比例的速度（跑步，不是走路）
var walk_ms0 := 0
var walk_skipped := false
var walk_hard_done := false
var pt := {}               # 這一題的真實時間點（ms）：answer、arrive、act、heard、seg_end
var pt_printed := false
var act_seg := {}          # 棒球分段（真實時間 ms）：swing、run、base
var last_bb_phase := ""
var debug_on := false
var debug_lbl: Label
var dbg_t := 0.0
var low_q := false         # 低畫質（iPad／iPhone 一律；其他裝置前 3 秒平均 < 24 fps）
var q_decided := false
var q_frames := 0
var q_ms0 := 0
var far_cull := false
var perf_acc := {}         # 各段每格花多少 µs（測試／debug 印）
var perf_n := 0
var slow_ms := 0           # 測試：每格多等幾 ms（模擬很慢的裝置）
var last_frame_us := 0
var old_walk := false
var perf_test := false     # 測試 FPS15=1：×1 正常速度＋每秒 15 格（模擬 iPad），量每題「答對 → 演完」
var save_path := SAVE_PATH # 測試 OUTTAG=xxx：每個同時跑的測試各用自己的存檔和截圖資料夾
var shots_dir := "res://test_shots"      # 測試：OLDWALK=1 重現舊的走路跳過＋每格 delta 上限 8/60 秒

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
var clue_vsfx: AudioStreamPlayer   # [1112sfx] 默劇影片的關鍵音效（影片本身無聲；跟著影片位置播）
var vsfx_log := []                   # [1112sfx] 測試用：每次開始／校正的紀錄
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
	for Rt in ROUTES:
		routes_data[Rt["id"]] = JSON.parse_string(FileAccess.get_file_as_string("res://data/freetime_%s.json" % Rt["id"]))
	ft = routes_data["ken_a"]
	items = ft["items"]
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
	act_root = Node3D.new()
	act_root.name = "ActProps"
	add_child(act_root)
	_use_char("ken")
	_build_fly_route()
	_load_icons()
	_build_audio()
	var hi := _host_initial()
	if String(hi.get("mode", "")) == "pair" and hi.has("studentId"):
		pair = true
		pair_ids = hi.get("pair", [hi["studentId"]])
		group_count = 1
	_build_ui()
	if pair:   # 接續上次：外框記著這一輪的路線
		var run0 := _host_run(hi)
		if run0.has("route") and routes_data.has(String(run0["route"])) and int(run0.get("answered", 0)) > 0:
			_set_route(String(run0["route"]))
	if OS.get_environment("ROUTE") != "" and routes_data.has(OS.get_environment("ROUTE")):
		_set_route(OS.get_environment("ROUTE"))   # 測試用：ROUTE=ken_b|shuiling|zunbo
	if OS.has_feature("web"):
		# 網頁自動測試（只在 localhost／127.0.0.1，外框網址加 ?autotest=1）：自動按 開始／作答／聽句子／Next，讓 Playwright 在外框作答
		var at = JavaScriptBridge.eval("(function(){try{var t=window.top;var ok=(t.location.hostname==='localhost'||t.location.hostname==='127.0.0.1')&&t.location.search.indexOf('autotest')>=0;return ok?'yes':'no';}catch(e){return 'no';}})()", true)
		web_autotest = typeof(at) == TYPE_STRING and String(at) == "yes"
		print("web autotest=", web_autotest)
	_init_quality()
	if test_mode and OS.get_environment("OLDWALK") != "":
		old_walk = true
		Engine.max_physics_steps_per_frame = 8
		BASE_RUN_OLD = true
	if test_mode and OS.get_environment("SLOWMS") != "":
		slow_ms = int(OS.get_environment("SLOWMS"))
	if test_mode and OS.get_environment("OUTTAG") != "":
		save_path = "user://ershui_freetime_save_%s.json" % OS.get_environment("OUTTAG")
		shots_dir = "res://test_shots/%s" % OS.get_environment("OUTTAG")
	if test_mode and OS.get_environment("FPS15") != "":
		perf_test = true
		Engine.max_fps = 0 if OS.get_environment("FPS15") == "nocap" else 15   # FPS15=nocap：一樣 ×1 計時，但不限幀數（正常電腦）
		print("FPS15 test mode: Engine.max_fps = %d, Fast ×1 everywhere" % Engine.max_fps)
	_show_title()
	if web_autotest and pair:
		fast = not perf_test   # [perf] FPS15 測試一律 ×1
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
			test_host["cleared"] = ["mode:pair", "set:0", "seed:%d" % payload["seed"], "route:%s" % payload.get("route", "ken_a")]
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
	if routes_data.has(String(run.get("route", "ken_a"))):
		_set_route(String(run.get("route", "ken_a")))
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
	_host_send("ask", {"type": "ask", "id": It["id"], "n": qi + 1, "activity": It["act"], "route": route_id})

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
			say(_vk("pattern"))
		"clue":   # [1112] 口說說錯活動：外框「再看一次線索」
			if state == St.ANSWER and clue_done:
				_play_clue(items[qi]["act"], clue_order[qi])
		"mute":
			_host_mute()
		"unmute":
			AudioServer.set_bus_mute(0, false)
		"answer":
			AudioServer.set_bus_mute(0, false)
			ask_poll = false
			pair_correct = bool(m.get("correct", false))
			_on_start()
var test_answer_wait := 0.0

func _host_mute() -> void:
	# 學生錄音中：遊戲的音樂、語音、音效（含默劇影片的音效）全部靜音，免得被錄進去影響 AI 評分
	voice.stop()
	clue_audio.stop()
	if clue_vsfx:
		clue_vsfx.stop()
	if clue_video:
		clue_video.paused = true
	AudioServer.set_bus_mute(0, true)
## 老師 11/10：每題一步一步解鎖 —— ① 自己按 Play 聽完情境 → ② 線索（兩人一組）→ ③ 作答 → ④ Ken 演出
var scene_heard := false
var scene_playing := false
var first_q := false
var play_btn: Button
var lock_hint: Label
var clue_start_btn: Button
var web_autotest := false

# ---------- 角色（Ken／水鈴／圳寶） ----------
## 語音檔名：Ken A 用原本的 ft_*；Ken B 的答案句和句型示範和 Ken A 一樣（I … in my free time.）；水鈴、圳寶各有一套
func _vk(kind: String, arg := "") -> String:
	var pre := "ft_" if route_id == "ken_a" else "ft_%s_" % route_id
	match kind:
		"intro":
			return pre + "intro"
		"scene":
			return pre + "scene_" + arg
		"ans":
			return ("ft_ans_" if who == "ken" else pre + "ans_") + arg
		"pattern":
			return "ft_pattern" if who == "ken" else pre + "pattern"
	return ""

func _route_info() -> Dictionary:
	for Rt in ROUTES:
		if Rt["id"] == route_id:
			return Rt
	return ROUTES[0]

func _char_name() -> String:
	return String(CHARS[who]["name"])

func _set_route(rid: String) -> void:
	route_id = rid
	ft = routes_data[rid]
	items = ft["items"]
	_use_char(String(_route_info()["who"]))
	if q_ask:
		q_ask.text = ft.get("question", "What do you do in your free time?")
	if title_sub:
		title_sub.text = "%s  %s" % [ft.get("question", "What do you do in your free time?"), _route_info()["sub"]]
	if go_btn:
		go_btn.text = "  Go! 出發（%s・%d 題）  " % [_route_info()["label"], items.size()]
	print("ROUTE ", rid, " who=", who)

func _use_char(w: String) -> void:
	if who == w and not W.is_empty():
		return
	if not W.is_empty():
		_exit_home()
		_clear_act()
		_set_bike(false)
		_remove_parked()
		_scooter_clear()
		(W["node"] as Node3D).visible = false
	who = w
	mascot = bool(CHARS[w]["mascot"])
	home_id = String(CHARS[w]["home"])
	if not chars.has(w):
		W = {}
		chars[w] = _build_char(w)
	W = chars[w]
	am = W["am"]
	mm = am
	poses = W["poses"]
	anim_ground = W["anim_ground"]
	anim_rate_fix = W["anim_rate_fix"]
	speeds = W["speeds"]
	interior = W.get("interior")
	interior_ken = W.get("interior_ken")
	interior_sk = W.get("interior_sk")
	interior_def = W.get("interior_def", {})
	proc_gait = ""
	model_locked = false
	cur_anim = ""
	cur_want = ""
	(W["node"] as Node3D).visible = true
	_place_ken(0.0)
	_ken_anim("idle")
	(W["anim"] as AnimationPlayer).advance(0.0)
	if not mascot:
		am.gait_setup()

func _build_char(w: String) -> Dictionary:
	var C: Dictionary = CHARS[w]
	var node := Node3D.new()
	node.name = String(C["name"])
	add_child(node)
	var km: Node3D = world.fit_model(C["model"], float(C["h"]), true, 0.3)   # 描邊太粗會認不出角色
	km.position.y = FOOT
	node.add_child(km)
	var anim := _find(km, "AnimationPlayer") as AnimationPlayer
	var sk := _find(km, "Skeleton3D") as Skeleton3D
	if anim == null:
		anim = AnimationPlayer.new()
		km.add_child(anim)
	# Mixamo 動作（Ken：pose_bake.gd；水鈴、圳寶：mascot_bake.gd 烤好的，重定向到各自的骨架）
	var lib := AnimationLibrary.new()
	for nm in ["jogging", "dribble", "baseball_hit", "kneeling_idle", "plant_a_plant", "driving", "cheering", "sitting_idle"]:
		var p := "res://assets/anims/baked/%s_%s.res" % [w, nm]
		if ResourceLoader.exists(p):
			lib.add_animation(nm, load(p))
	anim.add_animation_library("ft", lib)
	anim.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL   # 每格先更新動作、再算道具（同一格）
	var d := {"node": node, "model": km, "anim": anim, "sk": sk, "pos": _spot("school_east"), "fwd": Vector2(0, 1), "path": [], "travel": "walk", "name": C["name"],
		"anim_ground": {}, "anim_rate_fix": {}, "speeds": TRAVEL_SPEED.duplicate(), "outdoor": {}}
	var a: ActMotion
	if bool(C["mascot"]):
		# 吉祥物沒有 idle：用烤好的站姿（mascot_motion_check _make_idle）
		var lib0: AnimationLibrary
		if anim.has_animation_library(""):
			lib0 = anim.get_animation_library("")
		else:
			lib0 = AnimationLibrary.new()
			anim.add_animation_library("", lib0)
		if not lib0.has_animation("idle"):
			lib0.add_animation("idle", load("res://assets/anims/baked/%s_idle.res" % w))
		Pose.thin_hand_outline(km, 0.15 if String(C["model"]).ends_with("softhand") else 0.25)
		d["outdoor"] = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/%s_outdoor.json" % w))
		d["anim_ground"] = d["outdoor"]["anim_ground"]
		d["poses"] = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/%s_poses.json" % w))
		d["speeds"] = {"walk": 0.6, "jog": 1.0, "bike": MASCOT_BIKE_SPEED, "scooter": SCOOTER_SPEED}
		a = (load("res://scripts/mascot_motion.gd") as GDScript).new()   # 水鈴、圳寶的戶外動作（[mascot] agent 維護，這裡只呼叫）
	else:
		d["poses"] = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/poses.json"))
		if FileAccess.file_exists("res://data/interior/anim_ground.json"):
			d["anim_ground"] = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/anim_ground.json"))
		if FileAccess.file_exists("res://data/interior/anim_rate.json"):
			d["anim_rate_fix"] = JSON.parse_string(FileAccess.get_file_as_string("res://data/interior/anim_rate.json"))
		a = ActMotion.new()
	a.setup(sk, km, node, act_root, anim, world.outline_shader, _ground_local)
	a.bike_parent = node
	a.GRIP_DIRS = 1
	if bool(C["mascot"]):
		a.sole_frac = 1.0
		if OS.get_environment("BIKEBAKE") == "":
			a.bike_bake_path = "res://data/interior/%s_bike.json" % w
	a.prewarm.call_deferred()   # [perf] 每格量腳底用的頂點快取：載入時就建好（不要在答對後走路的第一格才建）
	d["am"] = a
	return d

## 吉祥物走路／慢跑：mascot_motion 的程式步態（腳底踩住不滑、靴底用網格貼地）。走路＝步幅小、抬腳低、週期長的同一套步態。
func _mascot_gait(kind: String) -> void:
	_place_ken(0.0)
	var m: Node3D = W["model"]
	var gh := _ground_h(W["pos"])
	am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, gh + float(anim_ground.get("idle", 0.0)), 0))
	m.transform = am.model_base
	if kind == "walk":
		mm.run_setup(0.66, 0.62, 0.2, 0.08)
	else:
		mm.run_setup()
	gait_off = am.model_base.origin.y - gh
	speeds[kind] = float(mm.run_speed())
	proc_gait = kind
	run_clock = 0.0
	cur_anim = "proc_" + kind
	cur_want = "idle"

# ---------- 圳寶：媽媽騎機車載（替代模型，見 scripts/scooter_rig.gd） ----------
func _scooter_get():
	if scooter == null:
		scooter = (load("res://scripts/scooter_rig.gd") as GDScript).new()
		scooter.setup(chars["zunbo"]["am"], world)
		scooter_holder = Node3D.new()
		scooter_holder.name = "ScooterHolder"
		add_child(scooter_holder)
	return scooter

## 出題時：媽媽騎車停在圳寶左邊等他
## [1112] 老師 11/12 iPad：圳寶 Q2 媽媽的機車停在明德附近的圳溝（藍色水道）上 —— 舊做法＝角色左邊 1.3 m 固定位置，不管那裡是不是馬路。
## 新做法：從想要的位置（角色座標 lx 左、lz 前）往外找最近的「整台車（兩輪＋車身寬）都在柏油上」的點，車頭順著那條路；
## 不擋在鏡頭和角色中間、不壓到角色和演出道具。avoid＝[[平面點, 半徑], …]
func _scooter_wait(place: String, lx := 1.3, lz := -0.2, phase := "wait", avoid: Array = []) -> void:
	var sc = _scooter_get()
	var p: Vector2 = W["pos"]
	var f: Vector2 = W["fwd"]
	var pref := p + f * lz + Vector2(f.y, -f.x) * lx
	var cam2: Vector2 = face_cam[0] if not face_cam.is_empty() and (phase == "wait" or cam_mode in ["face", "act"]) else Vector2.INF
	var sp := _scooter_road_spot(pref, f, [[p, 0.85]] + avoid, cam2, p)
	var c: Vector2 = sp.get("pos", pref)
	var d: Vector2 = sp.get("dir", f)
	scooter_holder.transform = world.frame_at(c, d, 0.0)
	sc.park(scooter_holder, Transform3D(Basis.IDENTITY, Vector3(0, _ground_h(c), 0)), sc.helmet != null)
	scooter_place = place
	scooter_spot = {"pos": c, "dir": d}
	_scooter_log(phase, c, d)

## [1112] 機車停車點檢查用：車子在地上的範圍（前後輪外緣 × 左右 0.32 m，7×3 個點）
const SC_HALF_W := 0.32
var scooter_spot := {}       # 現在等著的機車：{pos, dir}（上車時圳寶走到這裡）
var scooter_log: Array = []  # 測試／檢查圖：[{q, phase, pos, dir, ok, bad, min_h, water}]
func _scooter_foot(c: Vector2, d: Vector2) -> Array:
	var sc = _scooter_get()
	var wz: Array = sc.R["wheel_z"]
	var r: float = sc.R["wheel_r"]
	var z0: float = minf(float(wz[0]), float(wz[1])) - r
	var z1: float = maxf(float(wz[0]), float(wz[1])) + r
	var left := Vector2(d.y, -d.x)
	var pts := []
	for i in 7:
		var z := lerpf(z0, z1, i / 6.0)
		for x in [-SC_HALF_W, 0.0, SC_HALF_W]:
			pts.append(c + d * z + left * x)
	return pts

## 圳溝（map.json water：中線＋寬，含水泥渠岸 0.4 m）
func _in_water(p: Vector2) -> bool:
	for wv in data.get("water", []):
		var pts: Array = wv["pts"]
		var hw := float(wv["w"]) * 0.5 + 0.4
		for i in range(pts.size() - 1):
			if world._seg_dist(p, world.v2(pts[i]), world.v2(pts[i + 1])) <= hw:
				return true
	return false

## 整台車都在柏油上（路面高度 ≥ 0.1：柏油、標線、路口；人行道 0.05、門口 0.07、草地 0.03、圳溝 0 都不算）
func _scooter_road_eval(c: Vector2, d: Vector2) -> Dictionary:
	var bad := 0
	var mh := 1.0
	var wat := 0
	for q: Vector2 in _scooter_foot(c, d):
		var h := _ground_h(q)
		mh = minf(mh, h)
		if h < 0.099:
			bad += 1
		if _in_water(q):
			wat += 1
	return {"ok": bad == 0, "bad": bad, "min_h": mh, "water": wat}

## 這個點所在那條路的方向（最近的、點在柏油寬度內的路段）
func _road_dir_at(q: Vector2) -> Vector2:
	if gh_grid.is_empty():
		_gh_build()
	var cell = gh_grid.get(Vector2i(floori(q.x / GH_CELL), floori(q.y / GH_CELL)))
	var best := Vector2.ZERO
	var bd := 1e9
	if cell != null:
		for i: int in cell[0]:
			var e: Array = world.edges[i]
			var a: Vector2 = world.nodes[e[0]]
			var b: Vector2 = world.nodes[e[1]]
			if a.distance_squared_to(b) < 0.01:
				continue
			var dd: float = world._seg_dist(q, a, b) - float(e[2]) * 0.5
			if dd < bd:
				bd = dd
				best = (b - a).normalized()
	return best

func _scooter_road_spot(pref: Vector2, pref_dir: Vector2, avoid: Array, cam2 := Vector2.INF, tgt2 := Vector2.INF, rmax := 8.0) -> Dictionary:
	var cands := []
	var n := int(rmax / 0.25)
	for ix in range(-n, n + 1):
		for iy in range(-n, n + 1):
			var off := Vector2(ix, iy) * 0.25
			if off.length() <= rmax:
				cands.append(off)
	cands.sort_custom(func(a: Vector2, b: Vector2) -> bool: return a.length_squared() < b.length_squared())
	for pass_i in 2:   # 第 1 輪：車子底下連圳溝的範圍都不要碰到（柏油蓋在圳溝上的地方也不要）；找不到才放寬
		var r := _scooter_road_spot_pass(cands, pref, pref_dir, avoid, cam2, tgt2, pass_i == 0)
		if not r.is_empty():
			return r
	push_warning("scooter: no road spot within %.0f m of %s" % [rmax, pref])
	return {}

func _scooter_road_spot_pass(cands: Array, pref: Vector2, pref_dir: Vector2, avoid: Array, cam2: Vector2, tgt2: Vector2, no_water: bool) -> Dictionary:
	for off: Vector2 in cands:
		var q: Vector2 = pref + off
		if _ground_h(q) < 0.099:
			continue
		var rd := _road_dir_at(q)
		if rd == Vector2.ZERO:
			continue
		var dirs: Array = [rd, -rd] if rd.dot(pref_dir) >= 0.0 else [-rd, rd]
		for d: Vector2 in dirs:
			var ok := true
			var pts := _scooter_foot(q, d)
			for pt: Vector2 in pts:
				for A in avoid:
					if pt.distance_to(A[0]) < float(A[1]):
						ok = false
						break
				if ok and cam2 != Vector2.INF and world._seg_dist(pt, tgt2, cam2) < 0.6:
					ok = false   # 不擋在鏡頭和角色中間
				if not ok:
					break
			if ok:
				var ev := _scooter_road_eval(q, d)
				if ev["ok"] and (not no_water or int(ev["water"]) == 0):
					return {"pos": q, "dir": d, "moved": off.length()}
	return {}

func _scooter_log(phase: String, c: Vector2, d: Vector2) -> void:
	var ev := _scooter_road_eval(c, d)
	ev["q"] = qi + 1
	ev["phase"] = phase
	ev["pos"] = c
	ev["dir"] = d
	ev["route"] = route_id
	scooter_log.append(ev)
	if test_mode:
		print("SCOOTER_PARK q%d %s pos=(%.2f,%.2f) dir=(%.2f,%.2f) on_road=%s off_road_pts=%d min_h=%.3f water_pts=%d" % [qi + 1, phase, c.x, c.y, d.x, d.y, ev["ok"], ev["bad"], ev["min_h"], ev["water"]])

func _scooter_mount() -> void:
	var sc = _scooter_get()
	proc_gait = ""
	_place_ken(0.0)
	sc.mount(W["node"])
	_scooter_log("mount", W["pos"], W["fwd"])
	cur_anim = "scooter"
	if test_mode and not perf_test:   # [perf] measure() 量安全帽、媽媽、圳寶的網格：電腦要 15 秒 → 只在一般測試量（舊：每次上車都量，iPad 卡很久）
		print("SCOOTER mount ", JSON.stringify(sc.measure()))
		walk_ms0 = Time.get_ticks_msec()   # [1112] 量測要 15–30 秒（同時跑好幾個測試時更久）：不要算進走路的真實時間上限（不然一出發就 WALK_HARD 跳到終點）

## 到了（戶外）：圳寶下車，媽媽和機車停在旁邊，安全帽放在後座
func _scooter_park(place: String, lx: float, lz: float, avoid: Array = []) -> void:
	if scooter == null or not scooter.is_riding():
		return
	_scooter_log("arrive", W["pos"], W["fwd"])   # 騎到的地方（停車前）
	_scooter_wait(place, lx, lz, "park", avoid)
	am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, _ground_h(W["pos"]) + float(anim_ground.get("idle", 0.0)), 0))
	(W["model"] as Node3D).transform = am.model_base

func _scooter_clear() -> void:
	if scooter:
		var was: bool = scooter.is_riding()
		scooter.hide()
		if was and not W.is_empty() and who == "zunbo":
			(W["model"] as Node3D).transform = Transform3D(Basis.IDENTITY, Vector3(0, _ground_h(W["pos"]) + float(anim_ground.get("idle", 0.0)), 0))
	scooter_place = ""
	scooter_spot = {}

func _riding_scooter() -> bool:
	return scooter != null and scooter.is_riding()

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
	proc_gait = ""
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
	if not mascot and (nm == "walk" or nm == "ft/jogging"):
		var v: float = TRAVEL_SPEED["walk" if nm == "walk" else "jog"]
		anim_rate = v / maxf(am.stride_speed_cached(want), 0.2) * float(anim_rate_fix.get(want, 1.0))
	a.speed_scale = 1.0
	cur_want = want
	if a.current_animation == want and a.is_playing():
		return
	a.play(want, 0.0 if mascot else blend)   # 吉祥物的姿勢常被程式步態／坐姿改掉 → 直接換，不混合

## 動作貼地：模型往上（或下）移多少，腳／膝蓋剛好碰到這裡的路面
func _model_y() -> float:
	return _ground_h(W["pos"]) + float(anim_ground.get(cur_want, 0.0))

## 路面高度（world.gd 蓋路的高度）：柏油 0.1 m、標線 0.115～0.12、路口 0.105、人行道 0.05～0.06、門口小廣場 0.07、其他 0
var node_w := {}
## [perf] 格子索引（6 m 一格）：每個點只查會影響它的路段／路口／門口（舊：每次查全部路段，
## 走路貼地每格要查幾百個腳底頂點 → 電腦每格 600 ms）。範圍取得比影響範圍大，結果和逐一查完全一樣。
const GH_CELL := 6.0
var gh_grid := {}
func _gh_add(r: Rect2, kind: int, idx) -> void:
	for gx in range(floori(r.position.x / GH_CELL), floori(r.end.x / GH_CELL) + 1):
		for gy in range(floori(r.position.y / GH_CELL), floori(r.end.y / GH_CELL) + 1):
			var k := Vector2i(gx, gy)
			if not gh_grid.has(k):
				gh_grid[k] = [[], [], []]
			(gh_grid[k][kind] as Array).append(idx)

func _gh_build() -> void:
	for e in world.edges:
		node_w[e[0]] = maxf(node_w.get(e[0], 0.0), float(e[2]))
		node_w[e[1]] = maxf(node_w.get(e[1], 0.0), float(e[2]))
	for i in world.edges.size():
		var e: Array = world.edges[i]
		var a: Vector2 = world.nodes[e[0]]
		var b: Vector2 = world.nodes[e[1]]
		_gh_add(Rect2(a, Vector2.ZERO).expand(b).grow(float(e[2]) * 0.5 + World.WALK_W + 0.2), 0, i)
	for k in node_w:
		var c: Vector2 = world.nodes[k]
		_gh_add(Rect2(c, Vector2.ZERO).grow(float(node_w[k]) * 0.5 + World.WALK_W + 0.2), 1, k)
	for i in world.place_list.size():
		var P: Dictionary = world.place_list[i]
		if P.has("pos2") and P.has("door2"):
			var a2: Vector2 = (P["pos2"] as Vector2).lerp(P["door2"], 0.5)
			_gh_add(Rect2(a2, Vector2.ZERO).expand(P["door2"]).grow(1.3), 2, i)

func _ground_h(p: Vector2) -> float:
	if gh_grid.is_empty():
		_gh_build()
	var h := 0.0
	var cell = gh_grid.get(Vector2i(floori(p.x / GH_CELL), floori(p.y / GH_CELL)))
	if cell != null:
		for i: int in cell[0]:
			var e: Array = world.edges[i]
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
		for k in cell[1]:
			var c: Vector2 = world.nodes[k]
			var dd := p.distance_to(c)
			var wm: float = node_w[k]
			if dd <= wm * 0.5 + 0.1:
				h = maxf(h, 0.105)
			elif dd <= wm * 0.5 + World.WALK_W:
				h = maxf(h, 0.06)
		for i: int in cell[2]:
			var P: Dictionary = world.place_list[i]
			var a2: Vector2 = (P["pos2"] as Vector2).lerp(P["door2"], 0.5)
			var b2: Vector2 = P["door2"]
			var ab2 := b2 - a2
			if ab2.length_squared() > 0.01:
				var t2 := clampf((p - a2).dot(ab2) / ab2.length_squared(), 0.0, 1.0)
				if p.distance_to(a2 + ab2 * t2) <= 1.1:
					h = maxf(h, 0.07)
	if h == 0.0 and _in_green(p):
		h = 0.03   # 公園綠地（world._build_green_and_water 的草皮在 0.03）
	return h

## 舊版（逐一查全部路段）：只給測試比對用
func _ground_h_slow(p: Vector2) -> float:
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
	if h == 0.0 and _in_green(p):
		h = 0.03
	return h

## [routes] 公園綠地（data/map.json 的 green，kind=park）：露營要在草地上，不能在馬路上（老師 11/11）
var green_polys: Array = []
var green_ready := false
func _in_green(p: Vector2) -> bool:
	if not green_ready:
		green_ready = true
		for g in data.get("green", []):
			if String(g.get("kind", "")) == "farmland":
				continue
			var poly: PackedVector2Array = world.norm_poly(g["poly"])
			if poly.size() >= 3:
				var r := Rect2(poly[0], Vector2.ZERO)
				for q in poly:
					r = r.expand(q)
				green_polys.append([r, poly])
	for G in green_polys:
		if (G[0] as Rect2).has_point(p) and Geometry2D.is_point_in_polygon(p, G[1]):
			return true
	return false

## 這個平面點上面有沒有地點模型（從 4 m 高往下到地面的直線穿過模型的包圍盒）
func _under_model(q: Vector2) -> bool:
	return _occ3(world.bend2(q, 4.0), world.bend2(q, 0.02)) > 0

## 露營用的草地候選點：地點附近 45 m 內的公園綠地，每 2 m 一格；人、營火、帳篷四個角都在草地上、不在路上、不在模型裡。離門口站點近的排前面
func _grass_spots(place_id: String) -> Array:
	var base := _spot(place_id)
	var ppos: Vector2 = world.places[place_id]["pos2"] if world.places[place_id].has("pos2") else base
	var out := []
	_in_green(base)
	for G in green_polys:
		var r: Rect2 = G[0]
		if r.grow(5.0).has_point(ppos) or r.get_center().distance_to(ppos) < 45.0:
			var x := r.position.x
			while x <= r.end.x:
				var y := r.position.y
				while y <= r.end.y:
					var q := Vector2(x, y)
					if q.distance_to(ppos) < 45.0 and Geometry2D.is_point_in_polygon(q, G[1]):
						out.append(q)
					y += 2.0
				x += 2.0
	out.sort_custom(func(a: Vector2, b: Vector2) -> bool: return a.distance_to(base) < b.distance_to(base))
	return out

func _camp_fits(p: Vector2, f: Vector2) -> bool:
	var left := Vector2(f.y, -f.x)
	var tc := p - left * 1.6 - f * 1.2   # 帳篷中心（ActMotion.build_camp：角色座標 x=-1.6、z=-1.2）
	for q: Vector2 in [p, p + f * 0.9, p + f * 0.45, tc, tc + f * 1.1, tc - f * 1.1, tc + left * 1.0, tc - left * 1.0, p - f * 0.5]:
		if _ground_h(q) != 0.03 or _under_model(q):
			return false
	for k in 8:   # 周圍 3 m 內不要有地點模型（不要緊貼著公園的大模型）、也不要有馬路
		var o := Vector2(3.0, 0).rotated(k * PI / 4.0)
		if _under_model(p + o) or _under_model(tc + o) or _ground_h(p + o) > 0.04:
			return false
	return true

## ActMotion 用：Ken 座標（+X 左、+Z 前）→ 路面高度
func _ground_local(v: Vector2) -> float:
	var f: Vector2 = W["fwd"]
	var p: Vector2 = W["pos"]
	return _ground_h(p + f * v.y + Vector2(f.y, -f.x) * v.x) - frame_lift

func _place_ken(_delta: float) -> void:
	var node: Node3D = W["node"]
	node.transform = world.frame_at(W["pos"], W["fwd"], frame_lift)
	if not am.riding and act_kind != "baseball" and proc_gait == "" and not model_locked and not _riding_scooter():   # 騎車、打棒球、程式步態、坐機車時模型位置由 ActMotion 管
		var m: Node3D = W["model"]
		m.position = Vector3(0, _model_y(), 0)

## 站點：school_east＝二水國小東側門（Ken 家走過來的那個門），其他用地點門口
func _spot(id: String) -> Vector2:
	if spot_cache.has(id):
		return spot_cache[id]
	var p: Vector2
	if id.ends_with("_home"):
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
	if test_mode:   # 測試時每 30 秒印一次現在在哪一步（卡住的時候看得出卡在哪）
		_beat_t += delta
		if _beat_t >= 30.0:
			_beat_t = 0.0
			print("HEARTBEAT route=%s q%d state=%d cam=%s in_home=%s fade=%.2f can_draw=%s" % [route_id, qi + 1, state, cam_mode, in_home, fade_rect.color.a if fade_rect else -1.0, DisplayServer.window_can_draw()])
	if test_mode or debug_on:   # [perf] 整格（含畫面）花太久：印出來（第一次載入模型、編譯著色器、建室內…）
		var fnow := Time.get_ticks_usec()
		if last_frame_us > 0 and fnow - last_frame_us > 400000 and state != St.TITLE:
			print("LONGFRAME q%d %.0f ms state=%d cam=%s in_home=%s anim=%s" % [qi + 1, (fnow - last_frame_us) / 1000.0, state, cam_mode, in_home, cur_anim])
		last_frame_us = fnow
	if slow_ms > 0:
		OS.delay_msec(slow_ms)
	_quality_probe()
	if debug_on:
		_update_debug(delta)
	if sheet_freeze:   # 檢查圖：量測和截圖要同一格
		_update_camera(0.0)
		return
	var prof := test_mode or debug_on
	var u0 := Time.get_ticks_usec() if prof else 0
	_poll_host(delta)
	_step_ken(delta)
	var u1 := Time.get_ticks_usec() if prof else 0
	_place_ken(delta)
	_advance_anim(delta)
	var u2 := Time.get_ticks_usec() if prof else 0
	_update_act(delta)
	var u3 := Time.get_ticks_usec() if prof else 0
	_update_camera(delta)
	var u4 := Time.get_ticks_usec() if prof else 0
	if in_home:
		_animate_screens(delta)
	if test_mode and perf_n % 15 == 7 and (state == St.WALKING or roam) and not in_home and not _riding_scooter() and not am.riding:
		# [perf] 檢查：只量靴底那一層頂點的最低點，和整隻腳的最低點一樣（差多少 mm）
		for sd in ["left", "right"]:
			var lo_a := 9.0
			for q in am.mesh_pts([sd + "foot", sd + "toe"]):
				lo_a = minf(lo_a, q.y)
			var lo_s := 9.0
			for q in am.sole_pts(sd):
				lo_s = minf(lo_s, q.y)
			perf_acc["sole_err_mm"] = maxf(float(perf_acc.get("sole_err_mm", 0.0)), (lo_s - lo_a) * 1000.0)
	if prof and u4 - u0 > 80000:
		print("SLOWFRAME q%d state=%d cam=%s anim=%s act=%s step=%.0f anim=%.0f act=%.0f cam=%.0f ms" % [qi + 1, state, cam_mode, cur_anim, act_kind, (u1 - u0) / 1000.0, (u2 - u1) / 1000.0, (u3 - u2) / 1000.0, (u4 - u3) / 1000.0])
	if prof:
		perf_n += 1
		for kv in [["step", u1 - u0], ["anim", u2 - u1], ["act", u3 - u2], ["cam", u4 - u3]]:
			perf_acc[kv[0]] = int(perf_acc.get(kv[0], 0)) + int(kv[1])
			perf_acc[kv[0] + "_max"] = maxi(int(perf_acc.get(kv[0] + "_max", 0)), int(kv[1]))

func _moving_mul() -> float:
	return 3.0 if fast else 1.0

## 每格先更新動作（手動模式），再修腳（擺動的腳不擦地）；騎車時腿由腳踏車 IK 決定
func _advance_anim(delta: float) -> void:
	var a: AnimationPlayer = W["anim"]
	if a == null or am.riding or act_kind == "baseball" or _riding_scooter():
		return
	if proc_gait != "":   # 吉祥物程式步態：身體高度跟著路面，兩腳 IK 到路面
		if not (W["path"] as Array).is_empty() and not skipping:
			run_clock += delta * _moving_mul()
		am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, _ground_h(W["pos"]) + gait_off, 0))
		mm.apply_run(run_clock)
		return
	if model_locked:
		return
	var moving: bool = not (W["path"] as Array).is_empty() and not skipping
	var mul := _moving_mul() if moving else 1.0
	a.advance(delta * anim_rate * mul)
	if moving and (cur_anim == "walk" or cur_anim == "ft/jogging"):
		var v: float = speeds.get(W["travel"], 1.4)
		am.gait_fix(delta, v * delta * mul, 0.012, 0.35, false, true)   # 擺動的腳不擦地＋著地的腳不陷地

func _step_ken(delta: float) -> void:
	var path: Array = W["path"]
	if path.is_empty() or skipping:
		return
	var v: float = speeds.get(W["travel"], 1.4)
	var mul := _moving_mul()
	var move := v * delta * mul
	var want_move := move
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
	elif W["travel"] == "scooter":
		_place_ken(0.0)
		scooter.update(want_move - move)   # 輪子照「真的前進的距離」轉
	else:
		step_timer -= delta * mul * anim_rate
		if step_timer <= 0.0:
			step_timer = 0.55 if W["travel"] == "walk" else 0.4
			sfx("footstep_1" if randi() % 2 == 0 else "footstep_2", randf_range(0.92, 1.08))
	# [perf] 路太長：用「真實時間」判斷（iPad 幀數低時遊戲時間變慢，舊的 travel_t > 5 秒在 iPad 上要等很久）
	# 先走 WALK_CAP 秒 → 淡出跳到只剩 WALK_TAIL 秒的路；很慢的裝置出發後 WALK_HARD 秒還沒到 → 直接跳到門口／活動地點
	if old_walk and state == St.WALKING and travel_t > 5.0 and not path.is_empty():   # 測試 OLDWALK=1：重現 11/11 以前的做法（遊戲時間 5 秒、剩 4.5 秒）
		var rest0 := pos.distance_to(path[0])
		for i in range(path.size() - 1):
			rest0 += (path[i] as Vector2).distance_to(path[i + 1])
		if rest0 > v * 4.5 + 3.0:
			_skip_ahead(rest0 - v * 4.5)
			return
	if not old_walk and state == St.WALKING and not path.is_empty():
		var real := (Time.get_ticks_msec() - walk_ms0) / 1000.0
		var rest := pos.distance_to(path[0])
		for i in range(path.size() - 1):
			rest += (path[i] as Vector2).distance_to(path[i + 1])
		if not walk_skipped and real > WALK_CAP and rest > v * WALK_TAIL + 1.0:
			walk_skipped = true
			_skip_ahead(rest - v * WALK_TAIL)
			return
		if not walk_hard_done and real > WALK_HARD and rest > 0.4:
			walk_hard_done = true
			print("WALK_HARD q%d still %.1f m to go after %.1f s (real time) → jump to the end" % [qi + 1, rest, real])
			_skip_ahead(rest - 0.3)
			return
	if path.is_empty():
		if roam:
			_roam_next()
		else:
			_on_arrive()

## 路太長：淡出 → 沿路往前跳 dist 公尺 → 淡入（中間的路不演，但 Ken 還是照路走、方向對）
func _skip_ahead(dist: float) -> void:
	skipping = true
	print("WALK_SKIP q%d at %.1f s (real) jump %.1f m" % [qi + 1, (Time.get_ticks_msec() - walk_ms0) / 1000.0, dist])
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
	if not mascot:
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
	if act_plan.has("f") and act_plan.has("side"):   # _plan_act 選好的來回方向和鏡頭那一側
		W["fwd"] = act_plan["f"]
		roam_side = float(act_plan["side"])
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
	elif mascot:
		_mascot_gait("jog")
	else:
		_ken_anim("ft/jogging")
		am.gait_setup()
	roam_cam2 = Vector2.INF
	roam_back = Vector2.ZERO
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
		proc_gait = ""
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
	if not mascot:
		am.bb = {}   # 吉祥物的揮棒表（程式球棒路徑）建一次要好幾秒 → 留著重用
	act_kind = ""
	roam = false
	bb_cut = false
	model_locked = false
	camp_pose = []
	frame_lift = 0.0
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
			if who == "zunbo":   # 圳寶腿太短跪不下去 → 屁股坐地（mascot_motion.sit_ground，屁股、靴底用網格貼地）
				_ken_anim("idle", 0.0)
				am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, _model_y(), 0))
				(W["model"] as Node3D).transform = am.model_base
				am.build_camp()
				(W["anim"] as AnimationPlayer).stop()
				var sr: Dictionary = mm.sit_ground()
				camp_pose = am.save_pose()
				model_locked = true
				print("ZUNBO camp sit ", sr)
			else:
				_ken_anim("ft/kneeling_idle", 0.0)
				am.build_camp()
		"baseball":
			if mascot:   # 和 mascot_motion_check _o_baseball 同設定（v6，老師 11/11 定案：3 個關鍵姿勢＋平滑曲線；圳寶單手 36 cm 短棒）
				mm.left_on_bat = false
				mm.pbat = true
				mm.pb_reach = 0.98
				mm.pb_local = true
				if who == "zunbo":
					mm.pb_keys = mm.PB_KEYS_ZUNBO
					mm.pb_hands = ["right"]
					mm.bat_len = 0.36
					mm.bat_hand_off = 0.045
					mm.bat_handle = 0.11
					mm.bat_taper = 0.09
					mm.pb_stretch = 0.90
				else:
					mm.pb_keys = mm.PB_KEYS_SHUILING
					mm.pb_stretch = 0.93
				mm.pb6_rel = MASCOT_PB6[who]
				mm.pb6_bend = 0.93 if who == "zunbo" else 0.96
				mm.pb_open_stretched = 0.0
				mm.pb_curl = 0.75 if who == "zunbo" else 1.0
				bb_acc = 0.0
				# 揮棒表格現算要 3–4 分鐘 → 讀烤好的（mascot_bake.gd PART=baseball）；烤的時候地面在 y=0，所以這一段把角色的座標架抬到路面高度
				var bpath := "res://data/interior/%s_baseball.json" % who
				if (mm.bb as Dictionary).is_empty() and FileAccess.file_exists(bpath):
					var bj = JSON.parse_string(FileAccess.get_file_as_string(bpath))
					var bv = str_to_var(String(bj["vars"])) if bj is Dictionary else null
					if bv is Dictionary:
						for k in bv:
							if k != "model_base_y":
								mm.set(k, bv[k])
						print("BASEBALL table loaded for %s: %d rows, t_c %.3f" % [who, (mm.pb_tab as Array).size(), float(mm.bb["t_c"])])
				frame_lift = _ground_h(p)
				_place_ken(0.0)
				act_root.transform = world.frame_at(p, f, frame_lift)
			_ken_anim("ft/baseball_hit", 0.0)
			am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, _ground_h(p) - frame_lift + float(anim_ground.get("ft/baseball_hit", 0.0)), 0))
			(W["model"] as Node3D).transform = am.model_base
			am.start_baseball(Transform3D(Basis(Vector3(1, 0, 0), -PI / 2), Vector3(0.0, 0.07, 0.03)))
			# [perf] 老師 11/11：跑壘看起來像在走（舊 run_v 1.3 m/s＝走路速度，慢跑動作被放慢播）→ 用跑步的速度；
			# 動作播放倍率＝速度 ÷ 動作原地踩地速度（act_motion.update_baseball）→ 腳不滑
			am.run_v = 1.3 if BASE_RUN_OLD else maxf(1.3, float(am.stride_speed_cached(am.run_anim)) * BASE_RUN_K)   # 吉祥物腿短：原本 1.3 m/s 已經是慢跑動作 ×1.9 → 不要變慢
			print("BASE RUN %s stride %.2f m/s → run_v %.2f m/s (anim ×%.2f), %.1f m" % [who, am.stride_speed_cached(am.run_anim), am.run_v, BASE_RUN_K, am.run_dist])

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
	var H: Dictionary = W["outdoor"]["stand_headphones"] if mascot else poses["stand_headphones"]
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
			if model_locked and not camp_pose.is_empty():
				am.load_pose(camp_pose)
				am.music_sway(act_t * 0.3, 2.0)
			am.update_camp(act_t)
		"baseball":
			if bb_cut:
				return
			var bb_done := false
			var btc: float = am.bb["t_c"]
			if mascot:   # 吉祥物的球棒表格不內插：時間永遠是 1/120 秒的整數倍（每一格都是量過的那一格）
				# [perf] 舊：一格最多算 12 小步（每小步都重算整個姿勢）→ iPad 幀數低時又慢又卡。
				# 新：這一格要走幾小步就一次走完（姿勢只算一次；表格用 _pb_snap 對齊格子，結果一樣）
				bb_acc += delta
				var n := floori(bb_acc / BB_STEP + 1e-6)
				if bb_hold and am.bb_t >= btc - 0.0005 and am.bb_t < btc + 0.3:
					sheet_freeze = true
					bb_hold = false
					n = 0
				elif bb_hold and am.bb_t < btc - 0.0005:
					n = mini(n, maxi(1, ceili((btc - 0.0005 - am.bb_t) / BB_STEP - 1e-6)))   # 檢查圖：剛好停在接觸那一格
				if n > 0:
					bb_acc -= n * BB_STEP
					bb_done = am.update_baseball(n * BB_STEP)
			else:
				var bd := delta
				var stop := bb_hold and am.bb_t < btc and am.bb_t + bd >= btc
				if stop:
					bd = btc - am.bb_t
				bb_done = am.update_baseball(bd)
				if stop:
					sheet_freeze = true
					bb_hold = false
			_track_bb()
			if bb_done:   # 來球 → 揮棒碰到 → 球飛出 → 丟棒 → 跑到壘包；一輪完淡出重來
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
	interior = hb.call("build_%s_home" % who)
	interior.position = Vector3.ZERO
	add_child(interior)
	# 燈和背景跟 home_check.gd／mascot_home_check.gd 一樣
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
	if interior_env == null:
		interior_env = Environment.new()
		interior_env.background_mode = Environment.BG_COLOR
		interior_env.background_color = Color(0.93, 0.96, 0.99)
		interior_env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
		interior_env.ambient_light_color = Color(1.0, 0.95, 0.88)
		interior_env.ambient_light_energy = 0.75
	interior_ken = world.fit_model(poses["model"], float(CHARS[who]["h"]), true, INDOOR_OUTLINE)   # 室內近景描邊細一點（老師 11/10）
	interior.add_child(interior_ken)
	var ap := _find(interior_ken, "AnimationPlayer") as AnimationPlayer
	if ap:
		ap.stop()
		ap.active = false
	interior_sk = _find(interior_ken, "Skeleton3D") as Skeleton3D
	interior_def = {}
	if mascot:
		Pose.thin_hand_outline(interior_ken, 0.15 if String(poses["model"]).ends_with("softhand") else 0.25)
		if who == "shuiling":   # 裙子遮罩要在原始姿勢量（坐下時 Pose.settle_skirt 用）
			interior_sk.reset_bone_poses()
			interior_ken.global_transform = Transform3D.IDENTITY
			Pose.skirt_info(interior_ken)
		# 每個姿勢會動到的家具（椅子位置、藏起來的道具）：記下原本的樣子，換姿勢前先還原
		for shot in poses["poses"]:
			for path in poses["poses"][shot].get("nodes", {}):
				var n := interior.get_node_or_null(path) as Node3D
				if n and not interior_def.has(path):
					interior_def[path] = [n.visible, n.transform]
	else:
		if Pose.right_is_fist(interior_sk):
			Pose.hide_hand_gadget(interior_ken)
		Pose.thin_hand_outline(interior_ken, 0.25)
	interior.visible = false
	W["interior"] = interior
	W["interior_ken"] = interior_ken
	W["interior_sk"] = interior_sk
	W["interior_def"] = interior_def

func _enter_home(shot: String) -> void:
	_build_interior()
	interior_shot = shot
	var D: Dictionary = poses["poses"][shot]
	for p in interior_props:
		p.queue_free()
	interior_props.clear()
	if not skirt_rep.is_empty():
		Pose.unsettle_skirt(skirt_rep)
		skirt_rep = {}
	if mascot:
		for path in interior_def:
			var n0 := interior.get_node(path) as Node3D
			n0.visible = interior_def[path][0]
			n0.transform = interior_def[path][1]
		for path in D.get("nodes", {}):
			var n1 := interior.get_node_or_null(path) as Node3D
			if n1:
				n1.visible = bool(D["nodes"][path]["visible"])
				n1.transform = _xf(D["nodes"][path]["xf"])
	else:
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
	if mascot and not (D.get("skirt", []) as Array).is_empty():   # 水鈴坐下：裙子攤在椅面上（和檢查圖同一個 Pose.settle_skirt）
		var boxes := []
		for bx in D["skirt"]:
			boxes.append([AABB(Vector3(bx[0], bx[1], bx[2]), Vector3(bx[3], bx[4], bx[5])), Vector3(bx[6], bx[7], bx[8])])
		interior_sk.force_update_all_bone_transforms()
		skirt_rep = Pose.settle_skirt(interior_ken, boxes, float(D.get("skirt_gap", 0.003)), 0.02)
	interior_cam = _xf(D["cam"])
	interior_fov = float(D["fov"])
	if mascot:
		_pc_content(shot)
		_show_pc_inset(shot)
	# 換到室內：藏星球、換背景
	world.visible = false
	(W["node"] as Node3D).visible = false
	act_root.visible = false
	if scooter_holder:
		scooter_holder.visible = false
	if world_env:
		world_env_saved = world_env.environment
		world_env.environment = interior_env
	interior.visible = true
	in_home = true
	screen_t = 0.0
	cam_mode = "interior"

## [routes] 水鈴、圳寶家的電腦螢幕內容：上網＝瀏覽器頁面（白底、藍色網址列、圖片、幾行字）；線上遊戲＝遊戲畫面（深色背景、草地、角色、分數條）
## → 兩題的畫面一看就不一樣（老師 11/11）
func _pc_content(shot: String) -> void:
	var pc := interior.find_child("PCScreen", true, false) as MeshInstance3D
	if pc == null or not (pc.mesh is QuadMesh):
		return
	var old := pc.get_node_or_null("Content")
	if old:
		pc.remove_child(old)
		old.queue_free()
	if not (shot in ["surf_internet", "online_games"]):
		return
	var sz: Vector2 = (pc.mesh as QuadMesh).size
	var c := Node3D.new()
	c.name = "Content"
	pc.add_child(c)
	var rows := _pc_rows(shot)
	for r in rows:
		var mi := MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(float(r[2]) * sz.x, float(r[3]) * sz.y)
		mi.mesh = q
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(String(r[4]))
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mi.material_override = m
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.position = Vector3(float(r[0]) * sz.x, float(r[1]) * sz.y, 0.0008 * float(r[5]))
		c.add_child(mi)
	# 字：瀏覽器的網址列寫 www.…；遊戲畫面寫 SCORE
	var l := Label3D.new()
	l.font = font_bold
	l.font_size = 48
	l.outline_size = 0
	l.pixel_size = 0.085 * sz.y / 48.0
	l.shaded = false
	l.double_sided = false
	if shot == "surf_internet":
		l.text = "www.ershui.tw"
		l.modulate = Color("#1c3d6e")
		l.position = Vector3(-0.1 * sz.x, 0.42 * sz.y, 0.004)
	else:
		l.text = "SCORE 350"
		l.modulate = Color("#ffffff")
		l.position = Vector3(0.0, 0.27 * sz.y, 0.004)
	c.add_child(l)

## 螢幕上的色塊：[中心 x, 中心 y（-0.5～0.5，y 往上）, 寬, 高, 顏色, 第幾層]
func _pc_rows(shot: String) -> Array:
	if shot == "surf_internet":   # 瀏覽器：白底、藍色網址列（白色輸入框）、左邊一張圖、右邊幾行字、下面一顆綠色按鈕
		return [[0.0, 0.0, 1.0, 1.0, "#ffffff", 1], [0.0, 0.42, 1.0, 0.16, "#4dabf7", 2], [-0.1, 0.42, 0.62, 0.08, "#ffffff", 3], [-0.25, 0.02, 0.4, 0.5, "#ffd43b", 2],
			[0.22, 0.2, 0.42, 0.06, "#868e96", 2], [0.22, 0.08, 0.42, 0.06, "#adb5bd", 2], [0.22, -0.04, 0.42, 0.06, "#adb5bd", 2], [0.18, -0.16, 0.34, 0.06, "#adb5bd", 2], [-0.25, -0.38, 0.4, 0.09, "#69db7c", 2]]
	# 遊戲：深藍背景、草地、紅色主角、紫色敵人、金幣、血條和分數條
	return [[0.0, 0.0, 1.0, 1.0, "#1c2541", 1], [0.0, -0.38, 1.0, 0.24, "#2f9e44", 2], [-0.25, -0.16, 0.12, 0.2, "#ff6b6b", 3], [0.2, -0.18, 0.14, 0.16, "#845ef7", 3],
		[0.05, 0.12, 0.08, 0.1, "#ffd43b", 3], [-0.3, 0.4, 0.3, 0.07, "#51cf66", 3], [0.3, 0.4, 0.25, 0.07, "#fcc419", 3], [0.38, 0.05, 0.06, 0.08, "#ffd43b", 3]]

## 螢幕特寫（畫面左上角的小框）：水鈴、圳寶頭很大、電腦很小，3D 畫面裡螢幕只有一點點大 → 把螢幕內容放大顯示，
## 學生一眼分得出「上網」（瀏覽器、www）和「玩線上遊戲」（遊戲畫面、SCORE）。內容和 3D 螢幕上畫的是同一份（_pc_rows）。
var pc_inset: PanelContainer
func _show_pc_inset(shot: String) -> void:
	if pc_inset == null:
		pc_inset = PanelContainer.new()
		pc_inset.add_theme_stylebox_override("panel", _style(Color(1, 1, 1, 0.97), Color(0.15, 0.12, 0.2), 16, 4))
		pc_inset.position = Vector2(14, 92)
		pc_inset.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ui.add_child(pc_inset)
		ui.move_child(pc_inset, 0)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 4)
		pc_inset.add_child(v)
		var t := _label("On the screen 螢幕特寫", 18, Color("#7b5ea7"))
		t.name = "Title"
		v.add_child(t)
		var cv := Control.new()
		cv.name = "Canvas"
		cv.custom_minimum_size = Vector2(272, 153)
		cv.clip_contents = true
		v.add_child(cv)
	var canvas: Control = pc_inset.find_child("Canvas", true, false)
	for ch in canvas.get_children():
		canvas.remove_child(ch)
		ch.queue_free()
	if not (shot in ["surf_internet", "online_games"]):
		pc_inset.visible = false
		return
	var Wd := 272.0
	var Ht := 153.0
	var rows := _pc_rows(shot)
	rows.sort_custom(func(a, b): return int(a[5]) < int(b[5]))
	for r in rows:
		var cr := ColorRect.new()
		cr.color = Color(String(r[4]))
		cr.size = Vector2(float(r[2]) * Wd, float(r[3]) * Ht)
		cr.position = Vector2((float(r[0]) + 0.5) * Wd, (0.5 - float(r[1])) * Ht) - cr.size * 0.5
		cr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		canvas.add_child(cr)
	var l := _label("www.ershui.tw" if shot == "surf_internet" else "SCORE 350", 15, Color("#1c3d6e") if shot == "surf_internet" else Color.WHITE)
	l.position = Vector2(0.11 * Wd, 0.015 * Ht) if shot == "surf_internet" else Vector2(0.34 * Wd, 0.14 * Ht)
	canvas.add_child(l)
	pc_inset.visible = true

## [routes] 室內演出的鏡頭檢查（吉祥物頭很大）：道具／螢幕不能被自己的頭擋住、臉要看得到（看電視那題不用臉）
func _indoor_visible() -> Dictionary:
	var pts := PackedVector3Array()
	for it in Pose._hp_skinned(interior_sk, "", ["head"]):
		pts.append_array(it[1])
	var hc := Vector3.ZERO
	for q in pts:
		hc += q
	hc /= maxf(pts.size(), 1)
	var ds := []
	for q in pts:
		ds.append(q.distance_to(hc))
	ds.sort()
	var hr: float = ds[int(ds.size() * 0.8)] if ds.size() > 0 else 0.2
	var S := interior_sk.global_transform
	var hd: Vector3 = S * interior_sk.get_bone_global_pose(interior_sk.find_bone(_bone_name_in(interior_sk, "head"))).origin
	var top: Vector3 = S * interior_sk.get_bone_global_pose(interior_sk.find_bone(_bone_name_in(interior_sk, "headtopend"))).origin
	var lu: Vector3 = S * interior_sk.get_bone_global_pose(interior_sk.find_bone(_bone_name_in(interior_sk, "leftupleg"))).origin
	var ru: Vector3 = S * interior_sk.get_bone_global_pose(interior_sk.find_bone(_bone_name_in(interior_sk, "rightupleg"))).origin
	var upv := (top - hd).normalized()
	var lv := lu - ru
	lv = (lv - upv * lv.dot(upv)).normalized()
	var face := lv.cross(upv).normalized()
	var fp := hc + face * hr * 0.8
	var cp := cam.global_position
	var vs := get_viewport().get_visible_rect().size
	var col := hud_col.get_global_rect().grow(8)
	var pan := qpanel.get_global_rect().grow(8) if qpanel.visible else Rect2()
	var ok := true
	var note := ""
	var kp := _key_points()
	kp.erase("ken_head")
	for k in kp:
		var q: Vector3 = kp[k]
		var d := cp.distance_to(q)
		var ab := q - cp
		var t := clampf((hc - cp).dot(ab) / maxf(ab.length_squared(), 1e-9), 0.0, 1.0)
		if hc.distance_to(cp + ab * t) < hr * 0.92 and cp.distance_to(hc) < d:
			ok = false
			note += "%s behind own head; " % k
	if interior_shot in ["surf_internet", "online_games"]:
		# 用電腦：螢幕要看得清楚（正面朝鏡頭、在畫面上夠大、四個角不被頭擋住）；螢幕朝著角色，所以這兩題從角色側後方拍，不要求正臉
		var pc := interior.find_child("PCScreen", true, false) as MeshInstance3D
		var szq: Vector2 = (pc.mesh as QuadMesh).size
		var sn := pc.global_transform.basis.z.normalized()
		if sn.dot(hc - pc.global_position) < 0.0:
			sn = -sn
		var sd := (cp - pc.global_position).normalized().dot(sn)
		var pl := cam.unproject_position(pc.global_transform * Vector3(-szq.x * 0.5, 0, 0))
		var prr := cam.unproject_position(pc.global_transform * Vector3(szq.x * 0.5, 0, 0))
		var wpx := pl.distance_to(prr)
		# 3D 螢幕：正面要朝鏡頭這一側（看得到畫面在亮）；內容由左上角的「螢幕特寫」放大顯示，所以這裡不要求螢幕很大
		if sd < 0.3 or pc_inset == null or not pc_inset.visible:
			ok = false
			note += "screen not visible (facing %.2f, %.0f px wide, close-up inset %s); " % [sd, wpx, "on" if pc_inset and pc_inset.visible else "off"]
		else:
			var ir := pc_inset.get_global_rect()
			for kk in ["head", "lefthand", "righthand"]:   # 特寫框不能蓋到頭和手
				var bq: Vector3 = S * interior_sk.get_bone_global_pose(interior_sk.find_bone(_bone_name_in(interior_sk, kk))).origin
				if ir.has_point(cam.unproject_position(bq)):
					ok = false
					note += "close-up inset covers %s; " % kk
			if ir.has_point(cam.unproject_position(pc.global_position)):
				ok = false
				note += "close-up inset covers the 3D screen; "
		for cx in [-0.5, 0.5]:
			for cy in [-0.5, 0.5]:
				var q2: Vector3 = pc.global_transform * Vector3(szq.x * cx, szq.y * cy, 0)
				var ab2 := q2 - cp
				var t2 := clampf((hc - cp).dot(ab2) / maxf(ab2.length_squared(), 1e-9), 0.0, 1.0)
				var sp2 := cam.unproject_position(q2)
				if (hc.distance_to(cp + ab2 * t2) < hr * 0.92 and cp.distance_to(hc) < cp.distance_to(q2)) or col.has_point(sp2) or pan.has_point(sp2) or sp2.x < 0 or sp2.y < 0 or sp2.x > vs.x or sp2.y > vs.y:
					ok = false
					note += "screen corner hidden; "
		var hsp := cam.unproject_position(hc)
		if cam.is_position_behind(hc) or hsp.x < 0 or hsp.y < 0 or hsp.x > vs.x or hsp.y > vs.y:
			ok = false
			note += "character not on screen; "
	elif interior_shot != "watch_tv":
		var fd := (cp - fp).normalized().dot(face)
		var sp := cam.unproject_position(fp)
		var hid := cam.is_position_behind(fp) or col.has_point(sp) or pan.has_point(sp) or sp.x < 0 or sp.y < 0 or sp.x > vs.x or sp.y > vs.y
		var fmin := -0.4 if interior_shot in ["surf_internet", "online_games"] else 0.0   # 用電腦：螢幕朝著角色，要同時看到螢幕只能拍側臉
		if fd < fmin or hid:
			ok = false
			note += "face not visible (dot %.2f, screen %s); " % [fd, sp]
	return {"ok": ok, "note": note}

func _exit_home() -> void:
	if not in_home:
		return
	in_home = false
	if pc_inset:
		pc_inset.visible = false
	if not skirt_rep.is_empty():
		Pose.unsettle_skirt(skirt_rep)
		skirt_rep = {}
	interior.visible = false
	world.visible = true
	(W["node"] as Node3D).visible = true
	act_root.visible = true
	if scooter_holder:
		scooter_holder.visible = true
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

## [routes] 地點的大模型（水公園、八堡圳公園…）不在 world.blockers 裡：鏡頭或視線進到模型範圍就算被擋（大草原是平的，不算）
func _in_model(c: Vector2, margin := 0.6) -> bool:
	for P in world.place_list:
		if String(P.get("id", "")) == "lawn" or not P.has("pos") or String(P.get("id", "")).ends_with("_home"):
			continue
		var rad: float = float(P.get("extent", P.get("size", 8.0))) * 0.5 + margin
		if String(P.get("kind", "")) == "waterpark":
			rad = float(P.get("extent", 18.0)) * 0.75 + 1.0   # 水公園是 18×14 的長方形，裡面有火車頭、戰鬥機、遊樂器材：用到角落的距離
		if c.distance_to(world.v2(P["pos"])) < rad:
			return true
	return false

## 視線被擋的程度（0＝完全沒擋）：街屋擋住的取樣數＋進到地點模型範圍的取樣數
## 街屋擋住可以變半透明（world.fade_between），地點的大模型（火車頭、戰鬥機…）不行 → 模型擋住算得重很多
func _view_block_score(c: Vector2, ch: float, p: Vector2) -> int:
	var n: int = world._blocked_count(c, ch, p, 1.0, "-none-")
	for i in 7:
		if _in_model(c.lerp(p, i / 8.0)):
			n += 40 if i == 0 else 8
	return n

func _view_blocked(c: Vector2, ch: float, p: Vector2) -> bool:
	if world._blocked_count(c, ch, p, 1.0, "-none-") > 0:
		return true
	for i in 6:
		if _in_model(c.lerp(p, i / 8.0)):
			return true
	return false

# ---------- [routes] 戶外演出：鏡頭和角色之間不能有東西（老師 11/11：畫面要看得出在做什麼） ----------
## 擋住視線的東西＝①地點的模型（火車頭、戰鬥機、遊樂器材、圳的模型…：world.fit_model 放進來的每個網格，用它自己座標裡的包圍盒）②街屋（world.blockers）
var occ_models: Array = []
var occ_ready := false
var act_plan := {}
var plan_cache := {}

func _collect_occ(n: Node, inside: bool) -> void:
	var ins := inside or (n is Node3D and n.has_meta("height") and n.has_meta("width"))
	if ins and n is MeshInstance3D:
		occ_models.append(n)
	for c in n.get_children():
		_collect_occ(c, ins)

static func _seg_aabb(a: Vector3, b: Vector3, bx: AABB) -> bool:
	var d := b - a
	var t0 := 0.0
	var t1 := 1.0
	for i in 3:
		if absf(d[i]) < 1e-9:
			if a[i] < bx.position[i] or a[i] > bx.end[i]:
				return false
		else:
			var u0: float = (bx.position[i] - a[i]) / d[i]
			var u1: float = (bx.end[i] - a[i]) / d[i]
			if u0 > u1:
				var tmp := u0
				u0 = u1
				u1 = tmp
			t0 = maxf(t0, u0)
			t1 = minf(t1, u1)
			if t0 > t1:
				return false
	return true

## 3D 線段 A→B 穿過幾個地點模型的包圍盒
func _occ3(A: Vector3, B: Vector3) -> int:
	if not occ_ready:
		occ_ready = true
		_collect_occ(world, false)
		print("OCCLUDERS place-model meshes: ", occ_models.size())
	var n := 0
	var mid := (A + B) * 0.5
	var L := A.distance_to(B)
	for mi: MeshInstance3D in occ_models:
		if not is_instance_valid(mi) or not mi.is_visible_in_tree():
			continue
		var bx := mi.get_aabb()
		var gs := mi.global_transform.basis.get_scale()
		var rad := (bx.size * gs).length() * 0.5
		if (mi.global_transform * bx.get_center()).distance_to(mid) > rad + L * 0.5 + 0.5:
			continue
		var inv := mi.global_transform.affine_inverse()
		if _seg_aabb(inv * A, inv * B, bx.grow(-minf(bx.size.x, minf(bx.size.y, bx.size.z)) * 0.04)):
			n += 1
	return n

## 地圖平面版：鏡頭在 c2、高 ch；目標在 t2、高 th。回傳擋住的東西數（地點模型＋街屋）
func _occ_map(c2: Vector2, ch: float, t2: Vector2, th: float) -> int:
	var n := _occ3(world.bend2(c2, ch), world.bend2(t2, th))
	if world._blocked_count(c2, ch, t2, th, "-none-") > 0:
		n += 1
	return n

## 寬鏡頭（籃球、棒球、露營）：回傳 face_cam＝[鏡頭平面位置, 鏡頭高, 方向, 看哪裡, 看的高度]
func _wide_cam(kind: String, p: Vector2, f: Vector2) -> Array:
	var right := Vector2(-f.y, f.x)
	match kind:
		"basketball":   # 角色右後方：角色在左、籃框在中間偏右上
			var kb := 0.9 if mascot else 1.0   # 吉祥物比較矮：鏡頭近 10%（角色至少佔畫面高 20%）
			var lb: Vector2 = p + f * 1.2 + right * 0.3
			return [lb + (p + right * 4.6 - f * 1.6 - lb) * kb, 0.6 + 1.0 * kb, right, lb, 0.6]
		"baseball":     # 角色前方偏右：看得到臉、球棒、飛來的球和右邊的壘包
			var ks := 0.78 if mascot else 0.97   # 吉祥物：鏡頭近 22%（[perf] 原 0.82：丟棒那一格 19%，×1 抽樣才抓到）（揮棒蹲低、跑向壘包離鏡頭變遠時也 ≥ 20%）；Ken 近 3%（[perf] ×1 每 0.5 秒檢查時跑壘中 19.x%，以前 ×3 抽樣沒抽到）
			var ls: Vector2 = p + right * 1.3
			return [ls + (p + f * 5.2 + right * 0.9 - ls) * ks, 0.5 + 1.5 * ks, right, ls, 0.5]
		_:              # 露營：角色前方偏左，角色跪／坐著看營火，後面是帳篷。吉祥物比較小 → 鏡頭近一點（角色至少佔畫面高 20%）
			if mascot:   # 側前方：營火在左、角色在中間、帳篷在右後（上下不疊在一起 → 整頂帳篷、營火、角色都放得進安全區）
				return [p + f * 1.8 - right * 3.6, 1.5, -right, p - f * 0.3 + right * 0.45, 0.45]
			return [p + f * 3.6 - right * 1.8, 1.75, -right, p + f * 0.4 + right * 0.6, 0.1]   # Ken：距離 4.0 m（跪著的 Ken 佔畫面高 ≥ 20%）；看的點放低，營火不會被兩行情境句的面板蓋住

## 這個位置、這個活動的各種鏡頭擺法：每種回傳擋住的東西數（0＝乾淨）
func _cam_plans(kind: String, p: Vector2, rd: Vector2) -> Array:
	var out := []
	match kind:
		"jogging", "bike":
			for f: Vector2 in [rd, -rd]:
				var prb: Dictionary = world.project(p + f * 18.0)
				var b: Vector2 = prb["q"] if prb.has("q") else p + f * 18.0
				if b.distance_to(p) < 8.0:
					continue
				var axis := (b - p).normalized()
				var perp := Vector2(-axis.y, axis.x)
				for sd in [1.0, -1.0]:
					var sc := 0
					for t in [0.0, 0.25, 0.5, 0.75, 1.0]:
						var q: Vector2 = p.lerp(b, t)
						var c2: Vector2 = q + perp * sd * 3.8
						sc += _occ_map(c2, 1.35, q, 1.0) + _occ_map(c2, 1.35, q, 0.15)
					out.append({"f": f, "side": sd, "score": sc})
		"music":   # 站著聽音樂：鏡頭在角色正前方 3.2 m（角色面向鏡頭）
			for k in 8:
				var dm: Vector2 = rd.rotated(k * PI / 4.0)
				var cm: Vector2 = p + dm * 3.2 + Vector2(-dm.y, dm.x) * 0.6
				out.append({"f": dm, "cam": cm, "score": _occ_map(cm, 1.7, p, 1.0) + _occ_map(cm, 1.7, p, 0.15) + _occ_map(cm, 1.7, p, 1.5)})
		"basketball", "camping", "baseball":
			for k in 8:
				var f: Vector2 = rd.rotated(k * PI / 4.0)
				var left := Vector2(f.y, -f.x)
				var fc := _wide_cam(kind, p, f)
				var tg := [[p, 1.0], [p, 0.15]]
				if kind == "basketball":
					tg.append_array([[p + f * 2.6, 2.15], [p + f * 2.9, 2.75], [p + f * 0.4, 0.5]])
				elif kind == "camping":
					tg.append_array([[p + f * 0.9, 0.3], [p - left * 1.6 - f * 1.2, 0.9], [p - left * 1.6 - f * 1.2, 0.2]])
				else:
					tg.append_array([[p - left * 1.3, 0.3], [p + f * 1.0, 0.6]])
				var sc := 0
				for t2 in tg:
					sc += _occ_map(fc[0], float(fc[1]), t2[0], float(t2[1]))
				out.append({"f": f, "score": sc})
	return out

## 這一題的戶外演出要在哪裡做、面向哪：先試地點門口那個站點；鏡頭被擋 → 沿著旁邊的街道每 6 m 試一個點（最多 37 m），
## 取第一個「鏡頭到角色／道具之間 0 個東西」的；都不行就取擋最少的。只算一次（同一個角色、地點、活動）。
func _plan_act(It: Dictionary) -> Dictionary:
	var kind: String = String(It["perform"]).substr(4)
	if not (kind in ["jogging", "bike", "basketball", "camping", "baseball", "music"]):
		return {}
	var key := "%s|%s|%s" % [who, It["to"], kind]
	if plan_cache.has(key):
		return plan_cache[key]
	var base := _spot(It["to"])
	var cands: Array = [base]
	var anchors: Array = []
	if It["from"] != It["to"]:
		anchors.append(_spot(It["from"]))
	anchors.append(_spot("school"))
	anchors.append(world.places["station"]["door2"])
	for an: Vector2 in anchors:
		var rt: Array = world.route(base, an)
		var prev := base
		var acc := 0.0
		var next_d := 7.0
		for q: Vector2 in rt:
			var seg := prev.distance_to(q)
			while acc + seg >= next_d and next_d <= 37.0:
				cands.append(prev.lerp(q, (next_d - acc) / maxf(seg, 0.001)))
				next_d += 6.0
			acc += seg
			prev = q
			if acc > 40.0:
				break
	var best := {"pos": base, "score": 99999}
	if kind == "camping":   # 露營：先找公園草地上的空位（不在路上、不在模型裡、鏡頭不被擋）
		var ppos: Vector2 = world.places[It["to"]]["pos2"] if world.places[It["to"]].has("pos2") else base
		var tried := 0
		for p: Vector2 in _grass_spots(It["to"]):
			var away := (p - ppos).normalized() if p.distance_to(ppos) > 0.5 else Vector2(0, 1)
			for k in 8:
				var f: Vector2 = away.rotated(k * PI / 4.0)   # 先試「背對公園模型」：鏡頭在角色前面，公園在背景
				if not _camp_fits(p, f):
					continue
				tried += 1
				var fc := _wide_cam(kind, p, f)
				var left := Vector2(f.y, -f.x)
				var sc := 0
				for t2 in [[p, 1.0], [p, 0.15], [p + f * 0.9, 0.3], [p - left * 1.6 - f * 1.2, 0.9], [p - left * 1.6 - f * 1.2, 0.2], [p - left * 2.4 - f * 1.2, 0.3], [p - left * 0.8 - f * 1.2, 0.3]]:
					sc += _occ_map(fc[0], float(fc[1]), t2[0], float(t2[1]))
				if sc < int(best["score"]):
					best = {"pos": p, "f": f, "score": sc, "grass": true}
				if sc == 0:
					break
			if int(best["score"]) == 0 or tried > 400:
				break
		if best.has("grass"):
			plan_cache[key] = best
			print("ACTPLAN camping at %s: on the park grass %.1f m from the door spot, occluders %d (%d layouts tried)" % [It["to"], (best["pos"] as Vector2).distance_to(base), int(best["score"]), tried])
			return best
		print("ACTPLAN camping at %s: no park grass near this place in the map data -> keeps the door-side spot" % It["to"])
	for p: Vector2 in cands:
		var pr: Dictionary = world.project(p)
		var rd := Vector2(0, 1)
		if pr.has("edge"):
			var e: Array = world.edges[int(pr["edge"])]
			rd = ((world.nodes[e[1]] as Vector2) - (world.nodes[e[0]] as Vector2)).normalized()
		for pl: Dictionary in _cam_plans(kind, p, rd):
			if int(pl["score"]) < int(best["score"]):
				best = pl
				best["pos"] = p
		if int(best["score"]) == 0:
			break
	plan_cache[key] = best
	print("ACTPLAN %s at %s: %.1f m from the door spot, occluders %d (of %d candidate spots)" % [kind, It["to"], (best["pos"] as Vector2).distance_to(base), int(best["score"]), cands.size()])
	return best

## 測試用：現在這個畫面，鏡頭到角色（頭、兩手、兩腳）和重點道具之間有幾個東西；角色在畫面上有多高
func _outdoor_visible() -> Dictionary:
	var sk: Skeleton3D = W["sk"]
	var S := sk.global_transform
	var bp := func(key: String) -> Vector3:
		var bn := _bone_name(key)
		return S * sk.get_bone_global_pose(sk.find_bone(bn)).origin if bn != "" else (W["node"] as Node3D).global_position
	var tg := {"head": bp.call("head"), "left hand": bp.call("lefthand"), "right hand": bp.call("righthand"), "left foot": bp.call("leftfoot"), "right foot": bp.call("rightfoot")}
	var kp := _key_points()
	for k in kp:
		if not String(k).begins_with("ken_"):
			tg[k] = kp[k]
	var cp := cam.global_position
	var occ := 0
	var note := ""
	for k in tg:
		var q: Vector3 = tg[k]
		var n := _occ3(cp, q + (cp - q).normalized() * 0.05)
		if n > 0:
			occ += n
			note += "%s behind %d model(s); " % [k, n]
	var c2 := Vector2.INF
	var ch := 1.35
	if cam_mode == "roam":
		c2 = roam_cam2
		ch = 3.0 if roam_high else 1.35
	elif not face_cam.is_empty():
		c2 = face_cam[0]
		ch = float(face_cam[1])
	if c2 != Vector2.INF and world._blocked_count(c2, ch, W["pos"], 1.0, "-none-") > 0:
		occ += 1
		note += "a street house between camera and character; "
	var vs := get_viewport().get_visible_rect().size
	var y0 := 1e9
	var y1 := -1e9
	# 角色在畫面上的高度：用整個網格的頂點投影（吉祥物頭很大，頭頂骨頭在頭的中間，用骨頭量會少很多）
	var FT: Transform3D = (W["node"] as Node3D).global_transform
	var ysv := []
	for q in am.mesh_pts(["hips", "spine", "neck", "head", "left", "right"]):
		ysv.append(cam.unproject_position(FT * (q as Vector3)).y)
	ysv.sort()
	if ysv.size() > 10:   # 去掉最外面 2%（零星的頂點）
		y0 = ysv[int(ysv.size() * 0.02)]
		y1 = ysv[int(ysv.size() * 0.98)]
	var ratio := (y1 - y0) / vs.y
	if cam_mode == "roam" and roam_high:
		note += "fallback high camera; "
	return {"ok": occ == 0 and ratio >= 0.2, "occluders": occ, "height_ratio": ratio, "note": "%sheight %.0f%% of screen" % [note, ratio * 100.0]}

## 角色面向鏡頭：繞一圈找不被擋的方向，中間的房子半透明
func _setup_face_cam(dist := 4.6, ch := 1.9, turn := true) -> void:
	var p: Vector2 = W["pos"]
	var pref: Vector2 = -(W["fwd"] as Vector2)
	if pref.length() < 0.1:
		pref = Vector2(0, 1)
	face_cam = world.face_view(p, pref.normalized(), dist, ch)
	# Ken 站在路上時：鏡頭也放在同一條路上（順著路往前／往後看），不會跑進建築模型裡（模型不在 blockers 清單）
	var pr: Dictionary = world.project(p)
	if pr.has("edge") and float(pr["d"]) < 2.5 and p.distance_to(world.places[home_id]["door2"]) > 3.0:
		var e: Array = world.edges[int(pr["edge"])]
		var rd: Vector2 = ((world.nodes[e[1]] as Vector2) - (world.nodes[e[0]] as Vector2)).normalized()
		var best := []
		var best_s := 1e9
		for dir: Vector2 in [rd, -rd]:
			var c2: Vector2 = p + dir * dist + Vector2(-dir.y, dir.x) * 0.6
			var sc: float = world._blocked_count(c2, ch, p, 1.1, "") * 10.0 + (0.0 if dir.dot(pref) > 0.0 else 1.0) + (50.0 if _view_blocked(c2, ch, p) else 0.0)
			if sc < best_s:
				best_s = sc
				best = [c2, ch, dir]
		face_cam = best
	if turn:
		W["fwd"] = face_cam[2]
	world.fade_between(face_cam[0], p, "", 0.0)

# ---------- [1112] 作答畫面：吉祥物整個身體在「沒有框、面板」的地方 ----------
## 老師 11/12 iPad：圳寶 Q10（兩人一組）左邊的線索框（鎖住時半透明）蓋住圳寶左半身。
## 做法：問題／線索／作答這段（St.QUESTION、CLUE、ANSWER），算出畫面上所有會出現的框（分數牌、右上按鈕欄、題目面板、
## 線索框、兩人一組外框的題目面板）的聯集 → 找最大的空白長方形 → 鏡頭位置不動（不會換到被房子擋的地方），
## 只轉方向（＋必要時把視角拉寬）讓吉祥物待機姿勢的包圍盒整個落在空白區中間。同一題的框聯集只會變大 → 鏡頭不會跳來跳去。
## 只做水鈴、圳寶（Ken 不用，規格 11/12）。
var answer_frame := {}       # {pos, look, up, fov, zone, box}
var ans_union := {}          # 這一題出現過的框（名稱 → Rect2，可見範圍座標）
var body_box := {}           # who → AABB（模型座標：待機姿勢整個網格＋3 cm）

func _body_box() -> AABB:
	if body_box.has(who):
		return body_box[who]
	var path := "res://data/interior/%s_idle_box.json" % who
	var bx := AABB()
	if FileAccess.file_exists(path) and OS.get_environment("BOXBAKE") == "":
		var d = JSON.parse_string(FileAccess.get_file_as_string(path))
		var a := Vector3(d["min"][0], d["min"][1], d["min"][2])
		var b := Vector3(d["max"][0], d["max"][1], d["max"][2])
		bx = AABB(a, b - a)
	else:
		bx = _measure_body_box()
	body_box[who] = bx
	return bx

## 現在姿勢的整個網格（蒙皮後所有頂點），模型座標的包圍盒＋3 cm（BOXBAKE=1 時量好存檔，遊戲直接讀）
func _measure_body_box() -> AABB:
	var m: Node3D = W["model"]
	var inv := m.transform.affine_inverse()
	var bx := AABB()
	var first := true
	for q: Vector3 in am.mesh_pts([""]):
		var v := inv * q
		if first:
			bx = AABB(v, Vector3.ZERO)
			first = false
		else:
			bx = bx.expand(v)
	return bx.grow(0.03)

## 鏡頭到身體（頭頂、腰、腳）之間穿過幾個地點模型（含家的模型；模型不會變半透明）
func _body_occ(cam3: Vector3, corners: Array) -> int:
	var lo := Vector3.ZERO
	var hi := Vector3.ZERO
	for i in 8:
		if i & 2 == 0:   # AABB.get_endpoint：第 2 位元＝y
			lo += corners[i] / 4.0
		else:
			hi += corners[i] / 4.0
	var n := 0
	for q: Vector3 in [lo, (lo + hi) * 0.5, hi]:
		n += _occ3_exact(cam3, q + (cam3 - q).normalized() * 0.3)
	return n

## _occ3 用包圍盒（大模型像水公園整個園區一個網格，包圍盒會把站在門口的角色包進去 → 永遠算擋住）。
## 包圍盒有碰到的模型，再用它真正的三角形量一次（第一次用到才建碰撞形狀：create_trimesh_collision，放在第 20 層，只給這個檢查用）
const OCC_LAYER := 1 << 19
var occ_trimesh := {}
var occ_static: Array = []   # 街屋（Tile_*/B）、地點建築（Places）：也用三角形量（街屋的方塊清單和畫出來的網格不完全一樣）
func _occ3_exact(A: Vector3, B: Vector3) -> int:
	if not occ_ready:
		_occ3(A, B)
	if occ_static.is_empty():
		for c in world.get_children():
			if c is MeshInstance3D and String(c.name) == "Places":
				occ_static.append(c)
			elif String(c.name).begins_with("Tile_") and c.get_node_or_null("B") is MeshInstance3D:
				occ_static.append(c.get_node("B"))
	var n := 0
	var mid := (A + B) * 0.5
	var L := A.distance_to(B)
	var space := get_world_3d().direct_space_state
	for mi: MeshInstance3D in occ_models + occ_static:
		if not is_instance_valid(mi) or not mi.is_visible_in_tree():
			continue
		var bx := mi.get_aabb()
		var gs := mi.global_transform.basis.get_scale()
		if (mi.global_transform * bx.get_center()).distance_to(mid) > (bx.size * gs).length() * 0.5 + L * 0.5 + 0.5:
			continue
		var inv := mi.global_transform.affine_inverse()
		if not _seg_aabb(inv * A, inv * B, bx):
			continue
		var id := mi.get_instance_id()
		if not occ_trimesh.has(id):
			var before := mi.get_child_count()
			mi.create_trimesh_collision()
			var sb: StaticBody3D = null
			for i in range(before, mi.get_child_count()):
				if mi.get_child(i) is StaticBody3D:
					sb = mi.get_child(i)
			if sb:
				sb.collision_layer = OCC_LAYER
				sb.collision_mask = 0
			occ_trimesh[id] = sb
		var sb2: StaticBody3D = occ_trimesh[id]
		if sb2 == null:
			n += 1
			continue
		var qp := PhysicsRayQueryParameters3D.create(A, B, OCC_LAYER)
		qp.hit_back_faces = true
		var hit := space.intersect_ray(qp)
		if not hit.is_empty() and hit["collider"] == sb2:
			n += 1
		elif not hit.is_empty():
			# 先打到別的模型：從那裡往後再查一次這個模型
			var qp2 := PhysicsRayQueryParameters3D.create(A, B, OCC_LAYER, [hit["rid"]])
			qp2.hit_back_faces = true
			var h2 := space.intersect_ray(qp2)
			if not h2.is_empty() and h2["collider"] == sb2:
				n += 1
	return n

func _body_corners() -> Array:
	var bx := _body_box()
	var X: Transform3D = (W["node"] as Node3D).global_transform * (W["model"] as Node3D).transform
	var out := []
	for i in 8:
		out.append(X * bx.get_endpoint(i))
	return out

## 鏡頭在 pos、看 fwd 方向、上方 up、焦距 f（像素）時，這些點在畫面上的範圍（和 Camera3D 一樣：垂直視角、畫面中心）
func _proj_box(pts: Array, pos: Vector3, fwd: Vector3, up: Vector3, f: float, vs: Vector2) -> Rect2:
	var right := fwd.cross(up).normalized()
	var cu := right.cross(fwd).normalized()
	var x0 := 1e9
	var y0 := 1e9
	var x1 := -1e9
	var y1 := -1e9
	for c: Vector3 in pts:
		var d := c - pos
		var z := maxf(d.dot(fwd), 0.01)
		var sx := vs.x * 0.5 + f * d.dot(right) / z
		var sy := vs.y * 0.5 - f * d.dot(cu) / z
		x0 = minf(x0, sx)
		x1 = maxf(x1, sx)
		y0 = minf(y0, sy)
		y1 = maxf(y1, sy)
	return Rect2(x0, y0, x1 - x0, y1 - y0)

## 兩人一組：外框（網頁）的題目面板在遊戲畫面上的位置。照 freetime.css 的 .quiz：
##   橫放 right 12px、top 296px、bottom 12px、width min(41vw, 460px)；直放 left/right 12px、bottom 12px、高 58vh。
## 網頁上：讀外框的視窗大小＋iframe 位置（題目面板開著時再和它真正的位置取聯集）；電腦測試：視窗大小＝CSS px。
## ★ 改 freetime.css 的 .quiz 位置時，這裡要一起改。
func _frame_quiz_rect() -> Rect2:
	var vs := get_viewport().get_visible_rect().size
	var iw := float(DisplayServer.window_get_size().x)
	var ih := float(DisplayServer.window_get_size().y)
	var pw := iw
	var ph := ih
	var fx := 0.0
	var fy := 0.0
	var real := Rect2()
	if OS.has_feature("web"):
		var raw = JavaScriptBridge.eval("(function(){try{var w=window.parent||window;var f=window.frameElement?window.frameElement.getBoundingClientRect():{left:0,top:0};var q=w.document.getElementById('quiz');var r=(q&&!q.hidden)?q.getBoundingClientRect():null;return JSON.stringify({iw:window.innerWidth,ih:window.innerHeight,pw:w.innerWidth,ph:w.innerHeight,fx:f.left,fy:f.top,q:r?[r.left,r.top,r.width,r.height]:null});}catch(e){return '';}})()", true)
		var d = JSON.parse_string(raw) if typeof(raw) == TYPE_STRING and raw != "" else null
		if typeof(d) == TYPE_DICTIONARY:
			iw = float(d["iw"])
			ih = float(d["ih"])
			pw = float(d["pw"])
			ph = float(d["ph"])
			fx = float(d["fx"])
			fy = float(d["fy"])
			if typeof(d.get("q")) == TYPE_ARRAY:
				var qa: Array = d["q"]
				real = Rect2(float(qa[0]) - fx, float(qa[1]) - fy, float(qa[2]), float(qa[3]))
	if iw < 10.0:
		return Rect2()
	var r: Rect2
	if ph > pw:
		var h := 0.58 * ph
		r = Rect2(12.0, ph - 12.0 - h, pw - 24.0, h)
	else:
		var w := minf(0.41 * pw, 460.0)
		r = Rect2(pw - 12.0 - w, 296.0, w, ph - 12.0 - 296.0)
	r.position -= Vector2(fx, fy)
	if real.size != Vector2.ZERO:
		r = r.merge(real)
	var k := vs.x / iw   # CSS px → 遊戲畫面座標（stretch expand：兩個方向同一個比例）
	return Rect2(r.position * k, r.size * k)

## 現在畫面上的框（可見範圍座標）；with_quiz＝兩人一組外框的題目面板也算
func _ui_rects(with_quiz: bool) -> Dictionary:
	var out := {}
	if hud and hud.is_visible_in_tree():
		if chips_box.get_child_count() > 0:
			var cr := chips_box.get_global_rect()
			if not pair:   # 分組：押注後每個分數牌會多一個「A×1」（約 41 px）→ 先把位置留起來，鏡頭才不會押注後又轉
				var empty := 0
				for cn in chip_nodes:
					if String((cn["bet"] as Label).text) == "":
						empty += 1
				cr.size.x += empty * 42.0
			out["score chips"] = cr
		if hud_col.is_visible_in_tree():
			out["buttons"] = hud_col.get_global_rect()
		if qpanel.is_visible_in_tree():
			out["panel"] = qpanel.get_global_rect()
	if clue_card and clue_card.visible:
		out["clue"] = Rect2(clue_card.global_position, clue_card.size.max(clue_card.get_combined_minimum_size()))
	if pair and with_quiz:
		var qr := _frame_quiz_rect()
		if qr.size != Vector2.ZERO:
			out["frame quiz"] = qr
	if debug_on and debug_lbl and debug_lbl.visible:
		out["debug"] = debug_lbl.get_global_rect()
	return out

## 空白長方形（離框和畫面邊 ≥ margin）裡選一個放身體：
##   s＝身體要縮小到原本（視角 50°）的幾倍才放得下（最多 1＝不放大）；s 小於 s_min（視角要超過 80°）的不要；
##   分數＝s（越大越好）－ 和原本位置 c0 的距離（鏡頭少轉一點、不要跑到角落）
func _free_rects(rects: Array, vs: Vector2, body: Vector2, s_min: float, c0: Vector2, margin := 12.0) -> Array:
	var G := []
	var xs := [margin, vs.x - margin]
	var ys := [margin, vs.y - margin]
	for r: Rect2 in rects:
		var g := r.grow(margin)
		G.append(g)
		xs.append(clampf(g.position.x, margin, vs.x - margin))
		xs.append(clampf(g.end.x, margin, vs.x - margin))
		ys.append(clampf(g.position.y, margin, vs.y - margin))
		ys.append(clampf(g.end.y, margin, vs.y - margin))
	xs.sort()
	ys.sort()
	var cands := []
	for i in xs.size():
		for j in range(i + 1, xs.size()):
			var x0: float = xs[i]
			var x1: float = xs[j]
			if x1 - x0 < 30.0:
				continue
			for k in ys.size():
				for l in range(k + 1, ys.size()):
					var y0: float = ys[k]
					var y1: float = ys[l]
					if y1 - y0 < 60.0:
						continue
					var R := Rect2(x0, y0, x1 - x0, y1 - y0)
					var free := true
					for g: Rect2 in G:
						if g.intersects(R):
							free = false
							break
					if not free:
						continue
					var sfit := minf(1.0, minf((R.size.y - 12.0) / body.y, (R.size.x - 12.0) / body.x))
					if sfit < s_min:
						continue
					cands.append([sfit * 1000.0 - R.get_center().distance_to(c0) * 0.3, R])
	cands.sort_custom(func(a: Array, b: Array) -> bool: return a[0] > b[0])
	var out := []
	for cnd in cands:
		var R: Rect2 = cnd[1]
		var dup := false
		for o: Rect2 in out:
			if o.encloses(R) or R.encloses(o):
				dup = true
				break
		if not dup:
			out.append(R)
		if out.size() >= 12:
			break
	return out

## 鏡頭位置不動：轉方向＋（必要時）拉寬視角，讓身體包圍盒在 inner 中間、高度不超過 inner
func _aim_into(corners: Array, pos: Vector3, fwd0: Vector3, up: Vector3, inner: Rect2, f50: float, f_min: float, vs: Vector2) -> Dictionary:
	var fwd := fwd0
	var f := f50
	for it in 40:
		var b := _proj_box(corners, pos, fwd, up, f, vs)
		f = clampf(f * minf(inner.size.y * 0.94 / maxf(b.size.y, 1.0), inner.size.x * 0.94 / maxf(b.size.x, 1.0)), f_min, f50)   # 只拉寬視角（身體變小）、不放大
		b = _proj_box(corners, pos, fwd, up, f, vs)
		var dv := b.get_center() - inner.get_center()
		if dv.length() < 0.3:
			break
		var right := fwd.cross(up).normalized()
		var cu := right.cross(fwd).normalized()
		fwd = fwd.rotated(cu, -clampf(atan(dv.x / f), -0.15, 0.15)).normalized()   # 一次最多轉 8.6°（不會轉過頭、角色跑到鏡頭後面）
		right = fwd.cross(up).normalized()
		fwd = fwd.rotated(right, -clampf(atan(dv.y / f), -0.15, 0.15)).normalized()
	return {"fwd": fwd, "f": f, "box": _proj_box(corners, pos, fwd, up, f, vs)}

func _frame_answer() -> void:
	if not mascot or W.is_empty() or in_home or face_cam.is_empty() or cam_mode != "face" or not (state in [St.QUESTION, St.CLUE, St.ANSWER]):
		return
	var vs := get_viewport().get_visible_rect().size
	var rr := _ui_rects(true)
	var grew := answer_frame.is_empty()
	for k in rr:
		var r0: Rect2 = rr[k]
		if not ans_union.has(k):
			ans_union[k] = r0
			grew = true
		elif not (ans_union[k] as Rect2).encloses(r0):
			ans_union[k] = (ans_union[k] as Rect2).merge(r0)
			grew = true
	if not grew and answer_frame.get("vs", Vector2.ZERO) == vs:
		return
	var first := answer_frame.is_empty()
	var res := _frame_try(vs)
	if (res.is_empty() or not res["clear"]) and first:
		# 站的地方看不到全身（例如水公園門口：園區模型的牆擋在角色前面）→ 角色往路中間／順著路挪一點再找（只在這一題第一次構圖時挪）
		var p0: Vector2 = W["pos"]
		var f0: Vector2 = W["fwd"]
		var fc0 := face_cam
		var pr: Dictionary = world.project(p0)
		var q0: Vector2 = pr.get("q", p0)
		var rd := _road_dir_at(q0)
		var tries := [q0]
		if rd != Vector2.ZERO:
			for dd in [1.5, -1.5, 3.0, -3.0, 4.5, -4.5]:
				tries.append(q0 + rd * dd)
		var fid: String = items[qi]["from"]
		if world.places.has(fid) and world.places[fid].has("pos") and not fid.ends_with("_home"):
			var away: Vector2 = (p0 - world.v2(world.places[fid]["pos"])).normalized()   # 離開地點模型（往外走到路上）
			for dd in [2.0, 4.0, 6.0, 8.0, 10.0]:
				var t2: Vector2 = p0 + away * dd
				if _ground_h(t2) >= 0.05:
					tries.append(t2)
		var got := false
		for t: Vector2 in tries:
			if t.distance_to(p0) < 0.2:
				continue
			W["pos"] = t
			_setup_face_cam(4.4, 1.8)
			_place_ken(0.0)
			var r2 := _frame_try(vs)
			if not r2.is_empty() and r2["clear"]:
				res = r2
				got = true
				print("ANSWER_FRAME q%d moved %s from %s to %s (%.1f m) so the whole body is visible" % [qi + 1, who, p0, t, p0.distance_to(t)])
				if items[qi]["travel"] == "scooter":
					_scooter_wait(items[qi]["from"])   # 機車重新找停車點（離角色新位置）
				break
		if not got:
			W["pos"] = p0
			W["fwd"] = f0
			face_cam = fc0
			_place_ken(0.0)
	if not res.is_empty() and (res["cam"][0] as Vector2) != (face_cam[0] as Vector2):
		# 換了鏡頭：角色轉向新的鏡頭（像出題時一樣面對鏡頭），再用新鏡頭構圖一次
		var nc: Vector2 = res["cam"][0]
		var pp: Vector2 = W["pos"]
		face_cam = [nc, float(res["cam"][1]), (nc - pp).normalized()]
		W["fwd"] = face_cam[2]
		var r3 := _frame_try(vs)
		if not r3.is_empty() and r3["clear"]:
			res = r3
		if items[qi]["travel"] == "scooter" and who == "zunbo":
			_scooter_wait(items[qi]["from"])   # 機車重新找停車點：不要擋在新鏡頭和角色中間
	if res.is_empty():
		push_warning("answer frame: no free area on screen fits %s" % who)
		if test_mode:
			print("ANSWER_FRAME q%d NO ZONE rects=%s" % [qi + 1, ans_union])
		return
	var p: Vector2 = W["pos"]
	var cam_used: Array = res["cam"]
	world.fade_between(cam_used[0], p, "", 0.0)
	var f: float = res["f"]
	var fov := rad_to_deg(2.0 * atan(vs.y * 0.5 / f))
	answer_frame = {"cam2": cam_used[0], "ch": cam_used[1], "pos": res["pos"], "look": (res["pos"] as Vector3) + (res["fwd"] as Vector3) * 4.0, "up": world.bend2(p).normalized(), "fov": fov, "zone": res["zone"], "box": res["box"], "vs": vs}
	if first:
		cam_pos = Vector3.ZERO   # 第一次：直接切到這個構圖（之後框變大才慢慢轉）
		cam.fov = fov
	if test_mode:
		print("ANSWER_FRAME q%d state=%d zone=%s box=%s fov=%.1f cam_back=%.1fx clear=%s rects=%s" % [qi + 1, state, res["zone"], res["box"], fov, (cam_used[0] as Vector2).distance_to(p) / maxf((face_cam[0] as Vector2).distance_to(p), 0.01), res["clear"], ans_union.keys()])

## 角色現在的位置：找鏡頭（原本的 face_cam 優先；放不下或看不到全身才退後／繞圈）＋空白區＋轉向。
## 回傳 {} 或 {pos, fwd, f, box, zone, cam, clear}；clear＝鏡頭到身體之間沒有地點模型
func _frame_try(vs: Vector2) -> Dictionary:
	_place_ken(0.0)   # 角色節點先搬到這一題的位置（_process 還沒跑到；不然量到上一題的位置）
	var corners := _body_corners()
	var p: Vector2 = W["pos"]
	var up: Vector3 = world.bend2(p).normalized()
	var ctr := Vector3.ZERO
	for c: Vector3 in corners:
		ctr += c
	ctr /= corners.size()
	var f50 := vs.y * 0.5 / tan(deg_to_rad(25.0))
	var f_min := vs.y * 0.5 / tan(deg_to_rad(40.0))   # 視角最寬 80°
	# 鏡頭位置：先用原本的；空白區太小放不下（例如分組 Q1 開場白讓題目面板很高）或看不到全身，才往後、往上退或繞著角色換方向
	var c2: Vector2 = face_cam[0]
	var ch: float = face_cam[1]
	var cams := []
	# 原本的鏡頭也要檢查：家門口的出題鏡頭（world.face_view 用 self_id "" 會略過所有街屋）可能在對面街屋裡面 → 畫面一片黑、看不到角色（老師 11/12 前就有）
	var orig_clear: bool = world._blocked_count(c2, ch, p, 1.0, "-none-") == 0 and _body_occ(world.bend2(c2, ch), corners) == 0
	if orig_clear:
		cams.append([c2, ch, true])
	var dir0: Vector2 = (c2 - p).normalized() if c2.distance_to(p) > 0.1 else Vector2(0, 1)
	var d0: float = maxf(c2.distance_to(p), 2.0)
	for kk in [1.0, 1.3, 1.6, 2.0, 2.5]:
		var got := 0
		for deg in [0, 25, -25, 50, -50, 80, -80, 110, -110, 145, -145, 180]:
			for hk in [1.0, 1.6, 2.4]:
				if got >= 2 or (kk == 1.0 and deg == 0 and hk == 1.0):
					continue
				var c2b: Vector2 = p + dir0.rotated(deg_to_rad(deg)) * d0 * kk
				var chb: float = ch * (1.0 + (kk - 1.0) * 0.6) * hk
				# 中間的街屋會變半透明（fade_between），可以；鏡頭不能在房子裡；鏡頭到頭頂／腰／腳的視線不能穿過地點模型的三角形
				# （模型不會變透明；鏡頭在模型裡面時，射線會打到模型的背面，也算擋住）
				if world._blocked_count(c2b, chb, p, 1.0, "-none-") == 0 and _body_occ(world.bend2(c2b, chb), corners) == 0:
					cams.append([c2b, chb, true])
					got += 1
	if not orig_clear:
		cams.append([c2, ch, false])   # 都不行才用原本的（測試會 FAIL）
	for cc in cams:
		var pos: Vector3 = world.bend2(cc[0], float(cc[1]))
		var fwd: Vector3 = (ctr - pos).normalized()
		var b0 := _proj_box(corners, pos, fwd, up, f50, vs)
		# 候選空白區（分數高的先試）：真的轉過去、量包圍盒有整個在區內才用（畫面邊緣透視會把盒子拉寬）
		for z: Rect2 in _free_rects(ans_union.values(), vs, b0.size * 1.08, f_min / f50, vs * 0.5):
			var tr := _aim_into(corners, pos, fwd, up, z.grow(-6.0), f50, f_min, vs)
			if z.grow(-2.0).encloses(tr["box"]):
				return {"pos": pos, "fwd": tr["fwd"], "f": tr["f"], "box": tr["box"], "zone": z, "cam": cc, "clear": cc[2]}
	return {}

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
			var hp: Dictionary = world.places.get(home_id, {})
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
			if cam_mode == "face" and not answer_frame.is_empty():
				want_pos = answer_frame["pos"]
				want_look = answer_frame["look"]
				cam.fov = lerpf(cam.fov, float(answer_frame["fov"]), k)
			elif cam_mode == "face":
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
				# 兩側各算「被擋的程度」：選擋比較少的那一側（街屋擋住會變半透明）；兩側都被地點模型擋住才改用後上方
				var s_keep := _view_block_score(p + perp * roam_side * 3.8, 1.35, p)
				var s_flip := _view_block_score(p - perp * roam_side * 3.8, 1.35, p)
				if s_flip + 4 < s_keep:
					roam_side = -roam_side
					s_keep = s_flip
				roam_high = s_keep >= 30
				if not roam_high:
					world.fade_between(p + perp * roam_side * 3.8, p, "", 6.0)
				else:   # [perf] 後上方用哪一頭：跟著 0.5 秒一次算（舊：每一格算兩次 _view_block_score）
					roam_back = -axis if _view_block_score(p - axis * 4.5, 3.0, p) <= _view_block_score(p + axis * 4.5, 3.0, p) else axis
			var tgt := p + perp * roam_side * 3.8 + (mid - p).normalized() * 0.0
			if roam_high:   # 兩邊都被擋（一邊房子、一邊公園模型）：鏡頭放在這條路上、角色後面（離地點模型遠的那一頭）上方
				if roam_back == Vector2.ZERO:
					roam_back = -axis if _view_block_score(p - axis * 4.5, 3.0, p) <= _view_block_score(p + axis * 4.5, 3.0, p) else axis
				tgt = p + roam_back * 4.5 + perp * 0.6
			if roam_cam2 == Vector2.INF or roam_cam2.distance_to(p) < 2.8:
				roam_cam2 = tgt
			roam_cam2 = roam_cam2.lerp(tgt, 1.0 - exp(-delta * 6.0))   # 跟緊一點：騎車 4.5 m/s 時鏡頭落後太多，角色會變小（< 畫面高 20%）
			want_pos = world.bend2(roam_cam2, 3.0 if roam_high else 1.35)
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
	if cam_mode != "interior" and (cam_mode != "face" or answer_frame.is_empty()) and cam.fov != 50.0:
		cam.fov = 50.0
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
	clue_vsfx = AudioStreamPlayer.new()
	add_child(clue_vsfx)
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
	if clue_vsfx:
		clue_vsfx.volume_db = (VOL_DB[vol_level] + 4.0) if vol_level > 0 else -80.0   # [1112sfx] 比「聽聲音」線索小聲（檔案 -20 LUFS、再 -2 dB）
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
	return "%s %s in %s free time." % [ft.get("subject", "I"), (ft.get("phrases3", ft["phrases"]) as Dictionary)[act], ft.get("possessive", "my")]

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
	_build_route_ui()
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
	v.add_child(_outlined(_label("二水小行星・休閒時間（Ken／水鈴／圳寶）", 42, Color.WHITE), 18))
	title_sub = _outlined(_label("What do you do in your free time?  I ___ in my free time.", 28, Color.WHITE))
	v.add_child(title_sub)
	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 26)
	v.add_child(gap)
	group_btns_row = HBoxContainer.new()
	group_btns_row.alignment = BoxContainer.ALIGNMENT_CENTER
	group_btns_row.add_theme_constant_override("separation", 24)
	v.add_child(group_btns_row)
	var b := _btn("全班分組猜猜看\nClass Groups · 投影押注", 30, Color("#ffd166"))
	b.custom_minimum_size = Vector2(400, 110)
	b.pressed.connect(func(): _show_routes("groups"))
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
	nb.pressed.connect(func(): _show_routes("pair"))
	pair_row.add_child(nb)
	continue_btn = _btn("  Continue 繼續上次  ", 30, Color("#cfe8ff"))
	continue_btn.custom_minimum_size = Vector2(360, 64)
	continue_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	continue_btn.pressed.connect(func(): _resume_pair() if pair else load_progress())
	v.add_child(continue_btn)

## 路線選擇（選完玩法之後）：Ken A／Ken B／水鈴／圳寶。分組 → 接著設定組別；兩人一組 → 直接開始
func _build_route_ui() -> void:
	route_ui = Control.new()
	route_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui.add_child(route_ui)
	var dim := ColorRect.new()
	dim.color = Color(0.1, 0.1, 0.2, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	route_ui.add_child(dim)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 22)
	route_ui.add_child(v)
	v.add_child(_outlined(_label("Choose a route  選一條路線", 56, Color("#fff4c2")), 20))
	var sub := _outlined(_label("", 28, Color.WHITE))
	sub.name = "Sub"
	v.add_child(sub)
	var h := HBoxContainer.new()
	h.name = "Routes"
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	h.add_theme_constant_override("separation", 14)
	v.add_child(h)
	for Rt in ROUTES:
		var rid: String = Rt["id"]
		var b := _btn("%s\n%s\n%s" % [Rt["label"], Rt["zh"], Rt["sub"]], 21, Color(Rt["col"]))   # 四顆要並排放進 1280 寬
		b.name = "Route_" + rid
		b.custom_minimum_size = Vector2(292, 160)
		b.pressed.connect(func(): _pick_route(rid))
		h.add_child(b)
	var back := _btn("  ← Back 回上一頁  ", 24)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	back.pressed.connect(_show_title)
	v.add_child(back)
	route_ui.visible = false

func _show_routes(next: String) -> void:
	route_next = next
	_hide_all()
	title_ui.visible = false
	route_ui.visible = true
	(route_ui.find_child("Sub", true, false) as Label).text = "全班分組猜猜看 Class Groups" if next == "groups" else "兩人一組線索挑戰 Pair Clue Challenge"
	for Rt in ROUTES:
		_paint(route_ui.find_child("Route_" + String(Rt["id"]), true, false) as Button, Color(Rt["col"]))

func _pick_route(rid: String) -> void:
	_set_route(rid)
	if route_next == "pair":
		_start_game()
	else:
		_show_setup()

func _input(ev: InputEvent) -> void:
	if cam_mode == "fly" and intro_t < INTRO_END and ((ev is InputEventMouseButton and ev.pressed) or (ev is InputEventScreenTouch and ev.pressed)):
		intro_t = INTRO_END
		cam_pos = Vector3.ZERO

func _show_title() -> void:
	state = St.TITLE
	_exit_home()
	_clear_act()
	_set_bike(false)
	_remove_parked()
	_scooter_clear()
	_ken_anim("idle")
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
		continue_btn.text = "  Continue 繼續上次（%s Q%d/%d）  " % [String(sv.get("route", "ken_a")).capitalize(), int(sv["qi"]) + 1, items.size()]

func _hide_all() -> void:
	for c in [title_ui, setup_ui, hud, result_ui, route_ui]:
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
	go_btn = go
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
	qpanel.minimum_size_changed.connect(_layout_panel)   # [ipad] 內容一變就重新量、重新縮放
	get_viewport().size_changed.connect(_layout_panel)
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
	qh.add_child(q_sub)   # [ipad] 有押注列時 _layout_panel_now 會把它移到最上面一行（_place_q_sub）
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
## [ipad] 11/11：面板一定整塊在畫面裡（左右 ≥ 12 px）、不蓋到右上的按鈕欄。
## stretch＝canvas_items＋expand：比 16:9 窄的螢幕（iPad 4:3～1.44）可見寬度永遠是 1280，只有高度變高；
## 所以面板比 1280 寬時，任何視窗大小都會被切掉（原本 1384 寬，左右各被切 52 px）。
## 做法：用面板「最小尺寸」算位置；放不下就等比例縮小（不小於 0.8），兩種擺法取比較大的縮放：
##   ① 全寬（分組置中／兩人一組靠左），面板頂要在按鈕欄下面；② 放在按鈕欄左邊（高度可以比按鈕欄高）。
## 面板內容一變（解鎖、換題、揭曉）或視窗大小一變就重排（minimum_size_changed／size_changed）。
const PANEL_MARGIN := 12.0
const PANEL_MIN_SCALE := 0.8
var _panel_layout_queued := false
var panel_fit_scale := 1.0

func _layout_panel() -> void:
	if _panel_layout_queued:
		return
	_panel_layout_queued = true
	call_deferred("_layout_panel_now")

func _layout_panel_now() -> void:
	_panel_layout_queued = false
	if qpanel == null:
		return
	q_scene.custom_minimum_size = Vector2(460 if pair else 360, 0)
	_place_q_sub(bet_box.visible)
	var vs := get_viewport().get_visible_rect().size
	var ms := qpanel.get_combined_minimum_size()
	var M := PANEL_MARGIN
	var col := hud_col.get_global_rect() if hud_col and hud_col.is_visible_in_tree() else Rect2(vs.x, 0, 0, 0)
	var col_left := col.position.x - 8.0
	var col_bottom := col.end.y + 8.0
	# ① 全寬：寬度 vs.x − 24；面板右邊若伸到按鈕欄下方，頂端要低於按鈕欄
	var s_full := minf(1.0, (vs.x - 2.0 * M) / ms.x)
	var x_full := M if pair else (vs.x - ms.x * s_full) * 0.5
	if x_full + ms.x * s_full > col_left:
		s_full = minf(s_full, (vs.y - M - col_bottom) / ms.y)
		x_full = M if pair else (vs.x - ms.x * s_full) * 0.5
	s_full = minf(s_full, (vs.y - 2.0 * M) / ms.y)
	# ② 按鈕欄左邊：寬度 col_left − 12
	var s_side := minf(1.0, minf((col_left - M) / ms.x, (vs.y - 2.0 * M) / ms.y))
	var s := s_full
	var x := x_full
	if s_side > s_full + 0.001:
		s = s_side
		x = M if pair else M + (col_left - M - ms.x * s) * 0.5
	if s < PANEL_MIN_SCALE:
		push_warning("qpanel needs scale %.2f (< %.2f) to fit %s" % [s, PANEL_MIN_SCALE, vs])
	panel_fit_scale = s
	qpanel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	qpanel.pivot_offset = Vector2.ZERO
	qpanel.scale = Vector2(s, s)
	qpanel.size = ms
	qpanel.position = Vector2(roundf(x), roundf(vs.y - M - ms.y * s))
	_frame_answer.call_deferred()   # [1112] 框變了：吉祥物要在空白的地方

## [ipad] 路線＋題號：有押注列（分組作答中）時放在左欄最上面一行，面板才不會比 1280 寬（原本並排時 1384）；
## 沒有押注列（揭曉、兩人一組）時放回 Play 左邊，面板矮一行、不擋到演出（圳寶 q11 營火）。
func _place_q_sub(top_row: bool) -> void:
	var qh := play_btn.get_parent()
	var lv := qh.get_parent()
	var want: Node = lv if top_row else qh
	if q_sub.get_parent() == want:
		return
	q_sub.get_parent().remove_child(q_sub)
	want.add_child(q_sub)
	want.move_child(q_sub, 0)

func _start_game() -> void:
	if pair:
		group_count = 1
	scores.clear()
	for g in group_count:
		scores.append(0 if pair else START_POINTS)
	run_seed = randi() % 900000 + 100000
	_make_clue_order()
	_host_send("report", {"type": "start", "seed": run_seed, "route": route_id})
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
	if force == "" and web_autotest and OS.has_feature("web"):   # [1112sfx] 網頁測試（只限 localhost＋autotest）：?clues=video,... 同上
		var qc = JavaScriptBridge.eval("(function(){try{return new URLSearchParams(window.top.location.search).get('clues')||'';}catch(e){return '';}})()", true)
		if typeof(qc) == TYPE_STRING:
			force = String(qc)
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
	_frame_answer.call_deferred()   # [1112] 分數牌押注後變寬：吉祥物要在空白的地方

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
	if It["from"] == home_id:
		W["fwd"] = world.v2(world.places[home_id]["face"])
	_ken_anim("idle")
	world.clear_fade()
	_setup_face_cam(4.4, 1.8)
	answer_frame = {}
	ans_union = {}
	if It["travel"] == "scooter":
		_scooter_wait(It["from"])          # 媽媽騎機車在旁邊等
	else:
		_scooter_clear()                   # 下一題開始：媽媽已經騎車走了（機車、安全帽不留到下一題；老師 11/11：棒球場上不能有安全帽）
	cam_mode = "face"
	cam_pos = Vector3.ZERO
	bets.clear()
	wagers.clear()
	last_delta.clear()
	q_sub.text = "%s  Q%d/%d" % [_route_info()["label"], qi + 1, items.size()]
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
		await say(_vk("intro"))   # 第一題：先念開場引導語（say 裡 voice.play() 在按鈕這一下就開始）
		if qi != my_qi:
			return
	await say(_vk("scene", It["id"]))
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
	say(_vk("ans", It["opt_acts"][i]))

func _repeat_voice() -> void:
	if state == St.TITLE or state == St.SETUP or state == St.RESULT:
		return
	var It: Dictionary = items[qi]
	if state == St.REVEAL:
		say(_vk("ans", It["act"]))
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
	if clue_vsfx:
		clue_vsfx.stop()

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
	_layout_panel()

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
	if clue_vsfx:
		clue_vsfx.stop()
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
			await _video_sfx_sync(vp, act)
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

## [1112sfx] 默劇影片的音效：影片第一格出來才開始播（不是按下去那一下），之後每格用真實時間估聲音的位置，
## 和影片的 stream_position 差 > 0.15 秒就 seek（iPad 15 fps 或影片卡一下也不會越差越多）。
## 影片暫停（錄音中 mute）、被換掉、離開畫面 → 聲音停；整段最多 9 秒（真實時間）。
func _video_sfx_sync(vp: VideoStreamPlayer, act: String) -> void:
	var path := "res://assets/clues/video_sfx/%s.ogg" % act
	var has_sfx := ResourceLoader.exists(path)   # 沒有音效檔（music：老師 11/12 維持無聲默劇）→ 只等影片播完，不播任何聲音
	if has_sfx:
		clue_vsfx.stream = load(path)
	var t0 := Time.get_ticks_msec()
	var started := false
	var a_pos0 := 0.0
	var a_us0 := 0
	var fixes := 0
	var over := 0
	var max_drift := 0.0
	while is_instance_valid(vp) and vp.is_playing() and Time.get_ticks_msec() - t0 < 9000:
		await get_tree().process_frame
		if not has_sfx or not is_instance_valid(vp):
			continue
		if vp.paused or not vp.is_visible_in_tree() or clue_video != vp:
			if started:
				clue_vsfx.stop()
				started = false
			continue
		var vpos := vp.stream_position
		if vpos <= 0.0 or vp.get_video_texture() == null:
			continue   # 第一格還沒出來
		if not started:
			clue_vsfx.play(vpos)
			a_pos0 = vpos
			a_us0 = Time.get_ticks_usec()
			started = true
			vsfx_log.append({"act": act, "ev": "start", "vpos": snappedf(vpos, 0.001), "ms": Time.get_ticks_msec() - t0})
			print("VSFX start %s at video %.3f s (%d ms after play) playing=%s vol=%.1f dB bus_mute=%s" % [act, vpos, Time.get_ticks_msec() - t0, clue_vsfx.playing, clue_vsfx.volume_db, AudioServer.is_bus_mute(0)])
			continue
		if test_mode and OS.get_environment("VSFXMUTE") != "" and vpos > 1.0 and not vsfx_log.any(func(e): return e.get("ev") == "mute"):
			# 測試：錄音中（外框送 mute）→ 影片暫停、音效停、整個聲音匯流排靜音；之後 unmute＋繼續播 → 音效從影片位置接著播
			_host_mute()
			vsfx_log.append({"act": act, "ev": "mute", "vpos": snappedf(vpos, 0.001)})
			await get_tree().process_frame
			await get_tree().process_frame
			_check(not clue_vsfx.playing and AudioServer.is_bus_mute(0) and vp.paused, "vsfx mute: video paused + sfx stopped + bus muted (%s)" % act)
			AudioServer.set_bus_mute(0, false)
			vp.paused = false
			started = false   # 下一格從影片位置重新開始播
			continue
		var apos := a_pos0 + float(Time.get_ticks_usec() - a_us0) / 1000000.0
		# 卡了一格時：這一格影片還沒補上 delta（process_frame 在影片 _process 前），下一格才補 → 連續 2 格都差 > 0.15 秒才算真的不同步
		over = over + 1 if absf(apos - vpos) > 0.15 else 0
		if over == 0:
			max_drift = maxf(max_drift, absf(apos - vpos))   # 不算卡住那一格的假差距
		if over >= 2 and vpos < clue_vsfx.stream.get_length() - 0.1:
			over = 0
			clue_vsfx.play(vpos)   # 影片慢了（或快了）：聲音跟回影片
			a_pos0 = vpos
			a_us0 = Time.get_ticks_usec()
			fixes += 1
			vsfx_log.append({"act": act, "ev": "seek", "vpos": snappedf(vpos, 0.001), "drift": snappedf(apos - vpos, 0.001)})
			print("VSFX resync %s drift %.3f s at video %.3f s" % [act, apos - vpos, vpos])
	if has_sfx and is_instance_valid(vp) and clue_video == vp:
		print("VSFX end %s video_pos=%.3f fixes=%d max_drift=%.3f s real=%d ms" % [act, vp.stream_position, fixes, max_drift, Time.get_ticks_msec() - t0])
		if test_mode:
			_check(vsfx_log.any(func(e): return e.get("act") == act and e.get("ev") == "start"), "vsfx started with the first video frame (%s)" % act)
			_check(fixes <= 3, "vsfx stays in sync with the video, resyncs=%d (%s)" % [fixes, act])
	elif test_mode and not has_sfx:
		print("VSFX none %s (silent mime, teacher 11/12)" % act)

func _clue_to_answer() -> void:
	if state != St.CLUE or not clue_done:
		return
	state = St.ANSWER
	clue_btn.visible = false
	q_ask.text = "%s  ▶ 作答 Answer →" % items[qi]["question"]
	_host_ask()
	_layout_panel()

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
	answer_frame = {}
	var now0 := Time.get_ticks_msec()
	pt = {"answer": now0, "walk0": now0}
	pt_printed = false
	act_seg = {}
	last_bb_phase = ""
	walk_ms0 = now0
	walk_skipped = false
	walk_hard_done = false
	_hide_clue()
	world.clear_fade()
	var It: Dictionary = items[qi]
	var travel: String = It["travel"]
	W["travel"] = "walk" if travel == "none" else travel
	if travel == "scooter" and not scooter_spot.is_empty():
		# [1112] 上車：圳寶走到媽媽停在路上的機車那裡（鏡頭下面直接切到背後，看不到瞬移）
		W["pos"] = scooter_spot["pos"]
		W["fwd"] = scooter_spot["dir"]
		_place_ken(0.0)
	var dest := _spot(It["to"])
	act_plan = {}
	if String(It["perform"]).begins_with("out:"):
		act_plan = _plan_act(It)   # 戶外演出：鏡頭不被擋的位置（可能在地點旁邊的街上）
		if act_plan.has("pos"):
			dest = act_plan["pos"]
	var path: Array = []
	if It["from"] != It["to"] or dest.distance_to(W["pos"]) > 1.0:
		path = world.route(W["pos"], dest)
		if travel != "scooter" and travel != "bike" and (path.is_empty() or (path[-1] as Vector2).distance_to(dest) > 0.3):
			path.append(dest)   # 走路：最後一段從路邊走到草地上；機車、腳踏車停在路邊（下面 _on_arrive 再走過去）
		if travel == "bike" and bool(act_plan.get("grass", false)):
			while path.size() > 1 and _ground_h(path[-1]) < 0.045:   # 腳踏車不騎上草地：路線停在最後一個在路上的點
				path.pop_back()
		if travel == "scooter":
			# [1112] 機車只停在柏油上：路線最後幾點（門口、草地、球場）不騎上去 —— 停在最後一個「整台車都在柏油上」的路點
			while path.size() > 2 and not _scooter_road_eval(path[-1], ((path[-1] as Vector2) - (path[-2] as Vector2)).normalized())["ok"]:
				path.pop_back()
	if It["to"] == home_id and travel == "scooter":
		pass   # 機車停在家門前的路上（不騎到門口），淡出＝進門
	elif It["to"] == home_id:
		# 走到門口前（離門約 1 m，不穿過牆或門），面向門，之後淡出＝進門
		path.append(dest)
		if travel != "scooter":
			path.append(dest - world.v2(world.places[home_id]["face"]) * 0.35)
	if path.is_empty():
		path.append((W["pos"] as Vector2) + (W["fwd"] as Vector2) * 0.6)
	W["path"] = path
	travel_t = 0.0
	var plen := (W["pos"] as Vector2).distance_to(path[0])
	for i in range(path.size() - 1):
		plen += (path[i] as Vector2).distance_to(path[i + 1])
	print("WALK_START q%d %s %.1f m at %.1f m/s (%.1f s without skipping)" % [qi + 1, W["travel"], plen, float(speeds.get(W["travel"], 1.4)), plen / maxf(float(speeds.get(W["travel"], 1.4)), 0.1)])
	if W["travel"] != "bike":
		_remove_parked()
	# 出發前先轉向第一個路點：跟拍鏡頭一開始就在 Ken 背後的路上，不會卡進家裡／街屋模型（畫面一片黑）
	var first_d: Vector2 = (path[0] as Vector2) - (W["pos"] as Vector2)
	if first_d.length() > 0.1:
		W["fwd"] = first_d.normalized()
	match W["travel"]:
		"jog":
			if mascot:
				_mascot_gait("jog")
			else:
				_ken_anim("ft/jogging")
		"bike":
			_set_bike(true)
			if test_mode and mascot and (OS.get_environment("BIKEBAKE") != "" or OS.get_environment("BIKECHECK") != ""):   # [perf] 烤好的腳踏車和現量的一樣嗎：印同一組量測（BIKEBAKE=1 現量並存檔）
				if OS.get_environment("BIKEBAKE") != "":
					mm.save_bike_bake("res://data/interior/%s_bike.json" % who)
				var keep_th: float = am.crank_th
				var bl := []
				for k in 4:
					am.crank_th = k * TAU / 4.0
					am.update_bike(0.0, 0.0)
					var mb: Dictionary = am.measure_bike(true)
					bl.append("k%d seat %.2f pedalL %.2f pedalR %.2f" % [k, float(mb.get("seat_gap_cm", -1)), float(mb.get("foot_left_pedal_gap_cm", -1)), float(mb.get("foot_right_pedal_gap_cm", -1))])
				am.crank_th = keep_th
				am.update_bike(0.0, 0.0)
				print("BIKE_CHECK %s %s: %s" % [who, "baked" if OS.get_environment("BIKEBAKE") == "" else "measured", " | ".join(bl)])
		"scooter":
			_scooter_mount()
		_:
			if mascot:
				_mascot_gait("walk")
			else:
				_ken_anim("walk")
	if not mascot:
		am.gait_setup()
	sfx("unlock")
	cam_mode = "follow"
	follow_pick = []
	follow_cam2 = Vector2.INF
	cam_pos = Vector3.ZERO   # 直接切到 Ken 背後（不要從正面慢慢掃過去，會穿過房子）
	qpanel.visible = false
	walk_caption.text = ("%s, what do you do in your free time…?" % _char_name()) if who == "ken" else ("%s…" % String(ft["question"]).trim_suffix("?"))

func _on_arrive() -> void:
	if state != St.WALKING:
		return
	state = St.REVEAL
	pt["arrive"] = Time.get_ticks_msec()
	var It: Dictionary = items[qi]
	walk_caption.text = ""
	sfx("arrive")
	var perf: String = It["perform"]
	if perf.begins_with("indoor:"):
		if not _riding_scooter():
			_ken_anim("idle")
		if It["to"] == home_id and not _riding_scooter():
			W["fwd"] = -world.v2(world.places[home_id]["face"])   # 面向家門
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
		if _riding_scooter():
			_scooter_log("arrive", W["pos"], W["fwd"])   # [1112] 停在家門前的路上
		await _fade(true)
		_set_bike(false)
		_scooter_clear()
		_ken_anim("idle")
		_enter_home(perf.substr(7))
		await _fade(false)
	else:
		var kind := perf.substr(4)
		if kind != "bike":
			if am.riding:
				_park_bike()   # 騎車來的：下車，車停在旁邊（不是憑空消失）
			_ken_anim("idle", 0.0)
		var was_scooter := _riding_scooter()
		if act_plan.has("pos") and (act_plan["pos"] as Vector2).distance_to(W["pos"]) > 1.2:
			# 車停在路邊，人到草地上：機車／腳踏車留在停的地方，畫面淡出、角色到露營的位置
			if was_scooter:
				_scooter_park(It["to"], -1.2, 0.0)
				was_scooter = false
				_ken_anim("idle", 0.0)
			await _fade(true, 0.25)
			_scooter_clear()   # 媽媽把機車騎去停好（畫面淡出的時候）；草地上不留機車和安全帽
			W["pos"] = act_plan["pos"]
			_place_ken(0.0)
			cam_pos = Vector3.ZERO
			_fade(false, 0.25)
		var wide := kind in ["basketball", "camping", "baseball"]
		_setup_face_cam(6.0 if wide else 3.2, 2.1 if wide else 1.7)
		var p: Vector2 = W["pos"]
		if act_plan.has("cam"):   # 聽音樂：_plan_act 選好的「鏡頭到角色之間沒有東西」的方向，角色面向鏡頭
			W["fwd"] = act_plan["f"]
			face_cam = [act_plan["cam"], 1.7, act_plan["f"]]
			world.clear_fade()
		# 演出鏡頭：重要的東西（Ken、籃框、球、帳篷、營火、壘包）都在畫面左邊或中間——右邊有按鈕、下面有題目面板（老師 11/10）
		# face_cam = [鏡頭平面位置, 鏡頭高, 方向, 看哪裡, 看的高度]
		if kind == "basketball" or kind == "baseball" or kind == "camping":
			# 面向哪：_plan_act 已經選好「鏡頭到角色、道具之間沒有東西」的方向
			var fwd0: Vector2 = act_plan["f"] if act_plan.has("f") else -(face_cam[2] as Vector2)
			W["fwd"] = fwd0
			face_cam = _wide_cam(kind, p, fwd0)
			print("ACTCAM %s plan score %s cam %s" % [kind, act_plan.get("score", "-"), face_cam[0]])
			world.fade_between(face_cam[0], p, "", 0.0)
		if was_scooter:   # 坐機車來的：下車，媽媽和機車停在旁邊（鏡頭的另一側、後面），安全帽放後座
			var ff: Vector2 = W["fwd"]
			var cl: float = ((face_cam[0] as Vector2) - p).dot(Vector2(ff.y, -ff.x))
			_scooter_park(It["to"], -2.4 if cl > 0.0 else 2.4, -2.6, [[p + ff * 2.7, 1.8], [p + ff * 1.2, 1.0]])   # 不壓到籃框、球、營火
			_ken_anim("idle", 0.0)
		_start_act(kind)
		if not roam:
			cam_mode = "act"
		cam_pos = Vector3.ZERO
	_reveal_panel()

func _reveal_panel() -> void:
	var It: Dictionary = items[qi]
	pt["act"] = Time.get_ticks_msec()
	if act_kind != "baseball":
		pt["seg_end"] = pt["act"]   # 只有棒球有「打到球 → 跑到壘包」這一段要等
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
		q_sub.text = "%s  Q%d/%d" % [_route_info()["label"], qi + 1, items.size()]
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
	await say(_vk("ans", items[qi]["act"]))
	if not pt.has("heard"):
		pt["heard"] = Time.get_ticks_msec()
		_reveal_report()
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
		"group_icons": group_icons, "scores": scores, "qi": next_q, "route": route_id}
	var f := FileAccess.open(save_path, FileAccess.WRITE)
	if f == null:
		if not silent:
			_toast("Save failed 儲存失敗")
		return
	f.store_string(JSON.stringify(d))
	f.close()
	if not silent:
		_toast("Saved ✓ 已保留（Q%d/%d）" % [mini(next_q + 1, items.size()), items.size()])

func _read_save() -> Dictionary:
	if not FileAccess.file_exists(save_path):
		return {}
	var d = JSON.parse_string(FileAccess.get_file_as_string(save_path))
	if typeof(d) != TYPE_DICTIONARY or int(d.get("version", 0)) != 2:
		return {}
	return d

func _delete_save() -> void:
	if FileAccess.file_exists(save_path):
		DirAccess.remove_absolute(save_path)

func load_progress() -> void:
	var d := _read_save()
	if d.is_empty():
		return
	if routes_data.has(String(d.get("route", "ken_a"))):
		_set_route(String(d.get("route", "ken_a")))
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
	_remove_parked()
	_scooter_clear()
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
	v.add_child(_label("%s's free time ・ Route %s ・ %d questions" % [_char_name(), _route_info()["label"], items.size()], 22, Color("#7b5ea7")))
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
	_fit_result_panel.call_deferred()

## [ipad] 結果表：8 組時面板高 724 > 1280×720 畫面，下面的按鈕被切掉 → 太高就等比例縮小（左上角為準）
func _fit_result_panel() -> void:
	await get_tree().process_frame   # 舊的那一輪結果列 queue_free 之後才量
	var panel: PanelContainer = result_ui.get_node("Panel")
	panel.size = Vector2.ZERO
	var ms := panel.get_combined_minimum_size()
	var vs := get_viewport().get_visible_rect().size
	var s := minf(1.0, minf((vs.y - 48.0) / ms.y, (vs.x - 48.0) / ms.x))
	panel.pivot_offset = Vector2.ZERO
	panel.scale = Vector2(s, s)

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

# ---------- [perf] 計時、效能小框（?debug=1）、自動低畫質 ----------
func _sec(a: String, b: String) -> float:
	if not pt.has(a) or not pt.has(b):
		return -1.0
	return (int(pt[b]) - int(pt[a])) / 1000.0

## 答對 → 演完＝「活動畫面出來＋答案句播完」（棒球再加「打到球、跑到壘包」）都到的時間（真實時間）
func _reveal_report() -> void:
	if pt_printed or not pt.has("heard") or not pt.has("seg_end") or not pt.has("answer"):
		return
	pt_printed = true
	var end_ms := maxi(int(pt["heard"]), int(pt["seg_end"]))
	var total := (end_ms - int(pt["answer"])) / 1000.0
	pt["total"] = total
	print("REVEAL_TIME q%d total=%.1fs walk=%.1fs arrive_to_act=%.1fs act_to_heard=%.1fs act_seg=%.1fs act=%s fps=%d low=%s %s" % [qi + 1, total,
		_sec("walk0", "arrive"), _sec("arrive", "act"), _sec("act", "heard"), _sec("act", "seg_end"), items[qi]["act"],
		Engine.get_frames_per_second(), low_q, "FAIL>25s" if total > 25.0 else "ok"])
	if perf_n > 0:
		var s := "PERF q%d frames=%d" % [qi + 1, perf_n]
		for k in ["step", "anim", "act", "cam"]:
			s += " %s=%.2fms(max %.1f)" % [k, float(perf_acc.get(k, 0)) / perf_n / 1000.0, float(perf_acc.get(k + "_max", 0)) / 1000.0]
		if perf_acc.has("sole_err_mm"):
			s += " sole_vs_full_foot_lowest=%.2fmm" % float(perf_acc["sole_err_mm"])
		print(s)
	perf_acc = {}
	perf_n = 0

## 棒球分段（真實時間）：揮棒（含來球）→ 跑壘 → 到壘包；跑壘超過 RUN_CAP 秒直接到壘包
func _track_bb() -> void:
	var ph: String = am.bb_phase
	var now := Time.get_ticks_msec()
	if ph != last_bb_phase:
		act_seg[ph] = now
		last_bb_phase = ph
		if ph == "base" and not pt.has("seg_end") and pt.has("act"):
			pt["seg_end"] = now
			var rs: int = int(act_seg.get("run", now))
			pt["run_s"] = (now - rs) / 1000.0
			print("ACT_SEG q%d baseball %s swing=%.2fs run=%.2fs run_v=%.2fm/s run_dist=%.2fm stride=%.2fm/s %s" % [qi + 1, who,
				(rs - int(pt["act"])) / 1000.0, (now - rs) / 1000.0, float(am.run_v), float(am.run_dist), float(am.stride_speed_cached(am.run_anim)),
				"FAIL run>%.0fs" % (RUN_CAP + 0.5) if (now - rs) / 1000.0 > RUN_CAP + 0.5 else "ok"])
			_reveal_report()
	elif ph == "run" and now - int(act_seg.get("run", now)) > int(RUN_CAP * 1000.0):
		am.finish_run()
		print("RUN_CAP q%d base run took > %.1f s (real time) → snapped to the base" % [qi + 1, RUN_CAP])

func _init_quality() -> void:
	var force := OS.get_environment("QUALITY")
	var ios := false
	debug_on = OS.get_environment("DEBUG") != ""
	if OS.has_feature("web"):
		var raw = JavaScriptBridge.eval("(function(){try{var s=location.search;try{if(window.top&&window.top!==window)s+='&'+window.top.location.search.substring(1);}catch(e){}var q=new URLSearchParams(s);var u=navigator.userAgent||'';var mt=navigator.maxTouchPoints||0;var ios=/iPad|iPhone|iPod/.test(u)||((navigator.platform==='MacIntel'||/Macintosh/.test(u))&&mt>1);return JSON.stringify({debug:q.get('debug')||'',quality:q.get('quality')||'',ios:ios,ua:u.substring(0,80),mt:mt});}catch(e){return '{}';}})()", true)
		var d = JSON.parse_string(String(raw)) if typeof(raw) == TYPE_STRING else null
		if d is Dictionary:
			debug_on = debug_on or String(d.get("debug", "")) == "1"
			if force == "":
				force = String(d.get("quality", ""))
			ios = bool(d.get("ios", false))
			print("QUALITY probe ios=%s touch=%s ua=%s" % [ios, d.get("mt", 0), d.get("ua", "")])
	if force == "low" or force == "high":
		_set_low_quality(force == "low", "forced ?quality=" + force)
		q_decided = true
	elif ios:
		_set_low_quality(true, "iPad/iPhone")
		q_decided = true
	elif test_mode:
		q_decided = true   # 電腦自動測試：維持原畫質（要測低畫質用 QUALITY=low）
	if debug_on:
		_build_debug()

## 其他裝置：3D 畫面開始後量 3 秒平均 fps，< 24 就降畫質（只降一次，不再升回去）
func _quality_probe() -> void:
	var want := low_q and cam_mode != "fly" and cam_mode != "map"
	if want != far_cull:
		far_cull = want
		world.set_far_cull(want)
	if q_decided:
		return
	var now := Time.get_ticks_msec()
	if q_ms0 == 0:
		if Engine.get_process_frames() > 30:
			q_ms0 = now
			q_frames = 0
		return
	q_frames += 1
	if now - q_ms0 >= 3000:
		q_decided = true
		var fps := q_frames * 1000.0 / float(now - q_ms0)
		print("QUALITY probe avg fps %.1f over 3 s" % fps)
		if fps < 24.0:
			_set_low_quality(true, "avg %.1f fps < 24" % fps)

func _set_low_quality(on: bool, why: String) -> void:
	low_q = on
	var vp := get_viewport()
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	vp.scaling_3d_scale = 0.7 if on else 1.0
	vp.msaa_3d = Viewport.MSAA_DISABLED if on else Viewport.MSAA_2X
	vp.mesh_lod_threshold = 4.0 if on else 1.0
	world.set_low_quality(on)
	print("QUALITY %s (%s) render_scale=%.2f msaa=%d" % ["LOW" if on else "high", why, vp.scaling_3d_scale, vp.msaa_3d])

func _build_debug() -> void:
	debug_lbl = Label.new()
	debug_lbl.name = "PerfDebug"
	debug_lbl.add_theme_font_size_override("font_size", 13)
	debug_lbl.add_theme_color_override("font_color", Color.WHITE)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0, 0, 0, 0.6)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 6
	sb.content_margin_right = 6
	sb.content_margin_top = 3
	sb.content_margin_bottom = 3
	debug_lbl.add_theme_stylebox_override("normal", sb)
	debug_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(debug_lbl)

## 小框放在右上按鈕欄下面、題目面板上面（右側本來就不放重要的東西）
func _update_debug(delta: float) -> void:
	if debug_lbl == null:
		return
	dbg_t -= delta
	if dbg_t > 0.0:
		return
	dbg_t = 0.5
	var fps := Engine.get_frames_per_second()
	var t := "%d fps  %.0f ms\n%s  scale %.2f" % [fps, 1000.0 / maxf(fps, 1.0), "LOW" if low_q else "high", get_viewport().scaling_3d_scale]
	if not pt.is_empty():
		t += "\nQ%d answer→walk %.1f\nwalk %.1f  act %.1f" % [qi + 1, _sec("answer", "walk0"), _sec("walk0", "arrive"), _sec("arrive", "act")]
		if pt.has("total"):
			t += "\ntotal %.1f s" % float(pt["total"])
		elif pt.has("answer"):
			t += "\n… %.1f s" % ((Time.get_ticks_msec() - int(pt["answer"])) / 1000.0)
	debug_lbl.text = t
	debug_lbl.size = Vector2.ZERO
	var vs := get_viewport().get_visible_rect().size
	var col := hud_col.get_global_rect() if hud_col and hud_col.is_visible_in_tree() else Rect2(vs.x - 16, 8, 0, 0)
	var ms := debug_lbl.get_combined_minimum_size()
	var x := vs.x - ms.x - 12.0
	var y := col.end.y + 8.0
	if qpanel and qpanel.is_visible_in_tree():
		y = minf(y, qpanel.get_global_rect().position.y - ms.y - 6.0)
	debug_lbl.position = Vector2(x, maxf(y, 8.0))

# ---------- 自動測試（--test） ----------
## MODEA=1（預設）：分組 6 組整回合 11 題、每一步截圖 test_ft_A*.png
## PAIR=1：假外框兩人一組整回合、四種線索、自動作答，截圖 test_ft_B*.png
## INTRO=1：首頁空拍
## 等畫面真的畫出一格再截圖。視窗被縮到最小／藏起來時引擎不畫圖（frame_post_draw 不會來）→ 最多等 6 秒就繼續，
## 並印 SHOT WARN（11/11 15:07 Ken B 兩人一組整回合就是卡在這裡 25 分鐘：遊戲本身還在跑，只是測試在等一格永遠不會畫的畫面）。
var _drawn := false
func _on_frame_drawn() -> void:
	_drawn = true

func _wait_drawn(what: String) -> bool:
	_drawn = false
	if not RenderingServer.frame_post_draw.is_connected(_on_frame_drawn):
		RenderingServer.frame_post_draw.connect(_on_frame_drawn)
	var t0 := Time.get_ticks_msec()
	while not _drawn and Time.get_ticks_msec() - t0 < 6000:
		await get_tree().process_frame
	if not _drawn:
		print("SHOT WARN no frame was drawn for 6 s (game window minimized or hidden?) at %s — window mode %d, can_draw %s" % [what, DisplayServer.window_get_mode(), DisplayServer.window_can_draw()])
		test_draw_stalls += 1
	return _drawn

var test_draw_stalls := 0
var _beat_t := 0.0
func _shot(name: String) -> void:
	await _wait_drawn(name)
	var img := get_viewport().get_texture().get_image()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(shots_dir))
	img.save_png("%s/%s.png" % [shots_dir, name])
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
				for sx in ([] if mascot else [-0.5, 0.5]):
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
			out["tent"] = act_root.global_transform * Vector3(-1.6, 0.6, -1.2)   # 帳篷中間（尖頂可以稍微出畫面）
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

# ---------- [1112] 作答畫面遮擋檢查：吉祥物網格（全部頂點、不去掉任何點）投影的長方形 vs 每個看得到的框，重疊面積要 = 0 ----------
## 頭頂、手、腳都在網格裡；兩人一組外框的題目面板只在作答（St.ANSWER）時算（那時才出現）
func _wait_cam(limit := 3.0) -> void:
	var g := 0.0
	var last := cam.global_transform
	var lf := cam.fov
	await _wait(0.25)
	while g < limit:
		await _wait(0.15)
		g += 0.15
		var moved: float = cam.global_transform.origin.distance_to(last.origin) + (cam.global_transform.basis.z - last.basis.z).length() + absf(cam.fov - lf) * 0.01
		last = cam.global_transform
		lf = cam.fov
		if moved < 0.0015:
			break

var az_rows: Array = []
func _answer_zone(phase: String) -> Dictionary:
	var vs := get_viewport().get_visible_rect().size
	var FT: Transform3D = (W["node"] as Node3D).global_transform
	var x0 := 1e9
	var y0 := 1e9
	var x1 := -1e9
	var y1 := -1e9
	var behind := 0
	for q: Vector3 in am.mesh_pts([""]):
		var w := FT * q
		if cam.is_position_behind(w):
			behind += 1
			continue
		var sp := cam.unproject_position(w)
		x0 = minf(x0, sp.x)
		x1 = maxf(x1, sp.x)
		y0 = minf(y0, sp.y)
		y1 = maxf(y1, sp.y)
	var box := Rect2(x0, y0, x1 - x0, y1 - y0) if x1 >= x0 else Rect2()
	var rects := _ui_rects(state == St.ANSWER)
	var ov := 0.0
	var note := ""
	var rj := {}
	for k in rects:
		var r: Rect2 = rects[k]
		rj[k] = [r.position.x, r.position.y, r.size.x, r.size.y]
		var it := box.intersection(r)
		if it.has_area():
			ov += it.get_area()
			note += "%s %dx%d; " % [k, it.size.x, it.size.y]
	var on_screen := x0 >= 0.0 and y0 >= 0.0 and x1 <= vs.x and y1 <= vs.y
	var hr := box.size.y / vs.y
	var occ := _body_occ(cam.global_position, _body_corners())
	if occ > 0:
		note += "behind %d place model(s) (mesh ray); " % occ
	if not answer_frame.is_empty():   # 街屋：鏡頭不能在街屋裡、鏡頭和角色中間不能有街屋
		var hb: int = world._blocked_count(answer_frame["cam2"], float(answer_frame["ch"]), W["pos"], 1.0, "-none-")
		if hb > 0:
			note += "street house between camera and body (%d); " % hb
			occ += hb
	else:
		note += "no answer frame; "
		occ += 1
	var ok := ov == 0.0 and on_screen and behind == 0 and hr >= 0.09 and occ == 0
	var row := {"route": route_id, "mode": "B" if pair else "A", "q": qi + 1, "act": items[qi]["act"], "phase": phase, "ok": ok,
		"overlap": ov, "box": [box.position.x, box.position.y, box.size.x, box.size.y], "rects": rj, "vs": [vs.x, vs.y], "height_pct": hr * 100.0,
		"fov": cam.fov, "note": note}
	print("ANSWERZONE %s q%d %s %s overlap=%d px2 height=%.0f%% box=%s %s" % [row["mode"], qi + 1, phase, "ok" if ok else "FAIL", ov, hr * 100.0, box, note])
	if OS.get_environment("AZDEBUG") != "":
		var nd: Node3D = W["node"]
		print("AZDEBUG node_visible=%s model_visible=%s node_pos=%s cam=%s in_home=%s interior_vis=%s" % [nd.is_visible_in_tree(), (W["model"] as Node3D).is_visible_in_tree(), nd.global_position, cam.global_position, in_home, interior.visible if interior else "-"])
		var cc := _body_corners()
		var mid3: Vector3 = (cc[0] + cc[7]) * 0.5
		var names := []
		for mi: MeshInstance3D in occ_models:
			if is_instance_valid(mi) and mi.is_visible_in_tree() and _seg_aabb(mi.global_transform.affine_inverse() * cam.global_position, mi.global_transform.affine_inverse() * mid3, mi.get_aabb()):
				names.append(String(mi.get_path()).right(60))
		print("AZDEBUG occ3=%d exact=%d aabb_hits=%s occ_models=%d" % [_occ3(cam.global_position, mid3), _occ3_exact(cam.global_position, mid3), names, occ_models.size()])
		var hits := []
		for mi in world.find_children("*", "MeshInstance3D", true, false):
			var m3 := mi as MeshInstance3D
			if m3.is_visible_in_tree() and m3.mesh and _seg_aabb(m3.global_transform.affine_inverse() * cam.global_position, m3.global_transform.affine_inverse() * mid3, m3.get_aabb()):
				hits.append("%s(%d tris)" % [String(m3.get_path()).right(50), m3.mesh.get_faces().size() / 3])
		print("AZDEBUG all-mesh aabb hits: ", hits.slice(0, 12), " cam2=", answer_frame.get("cam2"), " p=", W["pos"])
		var keep := hud.visible
		hud.visible = false
		clue_card.visible = false
		await _shot("AZDBG_q%02d_%s" % [qi + 1, phase])
		hud.visible = keep
		clue_card.visible = pair
	return row

func _az_check(phase: String, shot := false) -> void:
	if not mascot:
		return
	await _wait_cam()
	var row: Dictionary = await _answer_zone(phase)
	_check(row["ok"], "%s q%d answer zone (%s): %s body not under any frame/panel, overlap %d px2, on screen, height %.0f%% %s" % [row["mode"], qi + 1, phase, who, row["overlap"], row["height_pct"], row["note"]])
	if shot:
		var nm := "AZ_%s_%s_q%02d_%s" % [route_id, row["mode"], qi + 1, phase]
		await _shot(nm)
		row["shot"] = nm
	az_rows.append(row)

func _az_save() -> void:
	if az_rows.is_empty():
		return
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(shots_dir))
	var f := FileAccess.open("%s/answerzone_%s_%s.json" % [shots_dir, route_id, "B" if pair else "A"], FileAccess.WRITE)
	f.store_string(JSON.stringify(az_rows, " "))
	f.close()

## [1112] 機車停車點：這一題記下來的每個點（等人、上車、騎到、停好）整台車都在柏油上
func _scooter_q_check(tag: String) -> void:
	if who != "zunbo" or items[qi]["travel"] != "scooter":
		return
	var phases := []
	for ev in scooter_log:
		if int(ev["q"]) == qi + 1:
			phases.append(ev["phase"])
			_check(ev["ok"], "%s q%d scooter %s on road: off-road points %d/21, min ground h %.3f m (asphalt >= 0.1), water %d" % [tag, qi + 1, ev["phase"], ev["bad"], ev["min_h"], ev["water"]])
	_check("wait" in phases and "mount" in phases and "arrive" in phases, "%s q%d scooter wait/mount/arrive all checked %s" % [tag, qi + 1, phases])
	if true:   # 檢查圖用：每題一行 JSON（shots_dir/scooter_park_A|B.jsonl）
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(shots_dir))
		var fp := "%s/scooter_park_%s.jsonl" % [shots_dir, "B" if pair else "A"]
		var f := FileAccess.open(fp, FileAccess.READ_WRITE if FileAccess.file_exists(fp) else FileAccess.WRITE)
		if f:
			f.seek_end()
			var rows := []
			for ev in scooter_log:
				if int(ev["q"]) == qi + 1:
					rows.append({"q": ev["q"], "phase": ev["phase"], "ok": ev["ok"], "bad": ev["bad"], "min_h": ev["min_h"], "water": ev["water"], "pos": [ev["pos"].x, ev["pos"].y], "dir": [ev["dir"].x, ev["dir"].y],
						"foot": _scooter_foot(ev["pos"], ev["dir"]).map(func(v: Vector2) -> Array: return [snappedf(v.x, 0.01), snappedf(v.y, 0.01)])})
			f.store_line(JSON.stringify(rows))
			f.close()

## 檢查圖：機車上方往下看（車在中間、車頭朝上），印車子四個角在畫面上的位置
func _scooter_top_shot(name: String) -> void:
	if scooter_spot.is_empty():
		return
	var c: Vector2 = scooter_spot["pos"]
	var d: Vector2 = scooter_spot["dir"]
	var keep := cam_mode
	var keep_fov := cam.fov
	var keep_af := answer_frame
	answer_frame = {}
	fixed_cam = [world.bend2(c - d * 0.01, 9.0), world.bend2(c, 0.0), world.bend2(c + d, 0.0) - world.bend2(c, 0.0)]
	cam_mode = "fixed"
	cam_pos = Vector3.ZERO
	var keep_hud := hud.visible
	var keep_clue := clue_card.visible
	hud.visible = false
	clue_card.visible = false
	await _wait(0.4)
	var corners := []
	for pt: Vector2 in _scooter_foot(c, d):
		var sp := cam.unproject_position(world.bend2(pt, _ground_h(pt)))
		corners.append([sp.x, sp.y])
	print("SCOOTER_TOP %s foot=%s" % [name, JSON.stringify(corners)])
	await _shot(name)
	hud.visible = keep_hud
	clue_card.visible = keep_clue
	var f := FileAccess.open("%s/%s.json" % [shots_dir, name], FileAccess.WRITE)
	f.store_string(JSON.stringify({"foot": corners, "eval": _scooter_road_eval(c, d)}))
	f.close()
	cam_mode = keep
	cam.fov = keep_fov
	answer_frame = keep_af
	cam_pos = Vector3.ZERO

## [1112] 快速檢查（ANSWERZONE=1 --test，ROUTE=shuiling|zunbo，PAIR=1 可選）：11 題只跑「出題 → 解鎖 → 線索 → 作答」畫面，不演出
func _test_answer_zone() -> void:
	await _wait(2.5)
	intro_t = INTRO_END
	await _wait(1.0)
	if not pair:
		_show_setup()
		_set_group_count(6)
	_start_game()
	if OS.get_environment("BOXBAKE") != "" and mascot:
		# 待機動作一個循環內取 10 個時間點的網格包圍盒聯集，存 data/interior/<who>_idle_box.json
		var a: AnimationPlayer = W["anim"]
		var bx := AABB()
		for k in 10:
			await _wait(0.3)
			var b1 := _measure_body_box()
			bx = b1 if k == 0 else bx.merge(b1)
		var fo := FileAccess.open("res://data/interior/%s_idle_box.json" % who, FileAccess.WRITE)
		fo.store_string(JSON.stringify({"note": "[1112] %s 待機姿勢整個網格的包圍盒（模型座標，+3 cm）；BOXBAKE=1 ANSWERZONE=1 --test 產生" % who, "min": [bx.position.x, bx.position.y, bx.position.z], "max": [bx.end.x, bx.end.y, bx.end.z]}))
		fo.close()
		print("BOXBAKE %s %s (anim %s)" % [who, bx, a.current_animation])
		body_box.erase(who)
	for n in items.size():
		if n > 0:
			qi = n
			_show_question()
		var It: Dictionary = items[qi]
		await _wait(0.8)
		await _az_check("locked", false)
		if It["travel"] == "scooter" and who == "zunbo":
			for ev in scooter_log:
				if int(ev["q"]) == qi + 1 and ev["phase"] == "wait":
					_check(ev["ok"], "%s q%d scooter wait on road (off-road %d/21, water %d)" % ["B" if pair else "A", qi + 1, ev["bad"], ev["water"]])
			if OS.get_environment("SHEET") != "":
				await _scooter_top_shot("SC_%s_q%02d_wait" % ["B" if pair else "A", qi + 1])
				await _wait_cam()
		scene_heard = true
		_set_locked(false)
		if pair:
			_unlock_clue()
			await _az_check("clue", false)
			clue_done = true
			test_answer_wait = 1e9
			_clue_to_answer()
			await _az_check("answer", true)
			ask_poll = false
			test_answer_wait = 0.0
		else:
			for g in group_count:
				_bet(g, rng.randi() % 3)
				_wager(g, WAGERS[rng.randi() % 3])
			_layout_panel()
			await _az_check("bets", true)
	_az_save()

## [perf] FPS15 測試：等答案句播完、REVEAL_TIME 印出來（棒球還要等跑到壘包），檢查「答對 → 演完」≤ 25 秒
func _finish_listen() -> void:
	if not perf_test:
		await _on_listen()
		return
	var g := 0.0
	while (not listened or not pt_printed) and g < 45.0:
		await _wait(0.1)
		g += 0.1
	var tot: float = float(pt.get("total", 999.0))
	_check(pt_printed and tot <= 25.0, "%s q%d REVEAL_TIME answer -> act done %.1f s <= 25 s (15 fps, x1)" % ["B" if pair else "A", qi + 1, tot])
	if act_kind == "baseball":
		var rs: float = float(pt.get("run_s", 99.0))
		_check(rs <= RUN_CAP + 0.5, "%s q%d ACT_SEG baseball run to base %.2f s <= %.1f s (real time)" % ["B" if pair else "A", qi + 1, rs, RUN_CAP + 0.5])

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
	if OS.get_environment("ROUTESHOT") != "":   # 路線選擇畫面截圖（分組、兩人一組各一張）
		await _wait(2.5)
		intro_t = INTRO_END
		await _wait(1.2)
		_show_routes("groups")
		await _wait(0.6)
		await _shot("route_select_groups")
		_show_routes("pair")
		await _wait(0.6)
		await _shot("route_select_pair")
		_check(route_ui.visible and (route_ui.find_child("Routes", true, false) as Node).get_child_count() == 4, "route select shows 4 routes")
		_pick_route("shuiling")
		_check(route_id == "shuiling" and who == "shuiling" and items[0]["options"][1].begins_with("She goes"), "picking Shuiling loads her route (She ...)")
		print("TEST SUMMARY checks=%d failed=%d %s" % [test_checks, test_fail.size(), test_fail])
		get_tree().quit(1 if test_fail.size() > 0 else 0)
		return
	if OS.get_environment("PANELFIT") != "":   # [ipad] 各種視窗大小：面板／畫面都在可見範圍內（--resolution WxH）
		await _test_panel_fit()
		print("TEST SUMMARY checks=%d failed=%d %s" % [test_checks, test_fail.size(), test_fail])
		get_tree().quit(1 if test_fail.size() > 0 else 0)
		return
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
	if OS.get_environment("MINTEST") != "":   # 實驗：視窗縮到最小時，遊戲邏輯照跑、只有截圖等不到畫面（印 SHOT WARN）
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_MINIMIZED)
		print("MINTEST window minimized, can_draw=", DisplayServer.window_can_draw())
	if OS.get_environment("GHCHECK") != "" or perf_test:   # [perf] 路面高度格子索引＝逐一查（隨機 4000 點＋每個地點附近）
		var bad := 0
		var r2 := RandomNumberGenerator.new()
		r2.seed = 7
		var cs: Array = []
		for P in world.place_list:
			if P.has("door2"):
				cs.append(P["door2"])
		for i in 4000:
			var c0: Vector2 = cs[i % cs.size()]
			var q := c0 + Vector2(r2.randf_range(-30, 30), r2.randf_range(-30, 30))
			if absf(_ground_h(q) - _ground_h_slow(q)) > 1e-6:
				bad += 1
		_check(bad == 0, "ground height grid index == full scan at 4000 points (%d differ)" % bad)
	if OS.get_environment("ANSWERZONE") != "":
		await _test_answer_zone()
	elif pair:
		await _test_pair(only)
	else:
		await _test_groups(only)
	_az_save()
	if test_draw_stalls > 0:
		print("TEST NOTE: %d screenshot(s) were taken while the window was not drawing (minimized/hidden) — those pictures are stale" % test_draw_stalls)
	print("TEST SUMMARY checks=%d failed=%d %s" % [test_checks, test_fail.size(), test_fail])
	get_tree().quit(1 if test_fail.size() > 0 else 0)

# ---------- [routes] 檢查圖用：每題演出的關鍵畫面 1 格＋那一格的接觸量測（SHEET=1 --test） ----------
var sheet_metrics := {}
func _num_only(m: Dictionary) -> Dictionary:
	var o := {}
	for k in m:
		if typeof(m[k]) in [TYPE_FLOAT, TYPE_INT, TYPE_BOOL, TYPE_STRING]:
			o[k] = m[k]
	return o

func _sheet_save(key: String, m: Dictionary) -> void:
	var dir := "res://test_route_sheet/%s" % route_id
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	FileAccess.open("res://test_route_sheet/.gdignore", FileAccess.WRITE).close()
	for i in 3:
		await get_tree().process_frame
	await _wait_drawn("sheet " + key)
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [dir, key])
	sheet_metrics[key] = _num_only(m)
	var path := "%s/metrics.json" % dir
	var all := {}
	if FileAccess.file_exists(path):
		var old = JSON.parse_string(FileAccess.get_file_as_string(path))
		if old is Dictionary:
			all = old
	all.merge(sheet_metrics, true)
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(JSON.stringify(all, " "))
	f.close()
	print("SHEET %s %s %s" % [route_id, key, JSON.stringify(sheet_metrics[key])])

func _feet_low_cm() -> float:
	var low := 9.0
	for q in am.mesh_pts(["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
		low = minf(low, q.y - am.g(q))
	return low * 100.0

func _sheet_frame(It: Dictionary) -> void:
	var key := "q%02d" % (qi + 1)
	var m := {}
	var a: AnimationPlayer = W["anim"]
	var keep_fast := fast
	fast = false
	if in_home:
		sheet_freeze = true
		if mascot:
			m = (poses["poses"][interior_shot].get("metrics", {}) as Dictionary).duplicate()
			m["source"] = "baked from mascot_motion_check contact frame"
		else:
			var low := 9.0
			for it in Pose._hp_skinned(interior_sk, "", ["leftfoot", "lefttoe", "rightfoot", "righttoe"]):
				for q: Vector3 in (it[1] as PackedVector3Array):
					low = minf(low, q.y)
			m = {"feet_lowest_y_cm": low * 100.0, "source": "approved home_check pose (pose_bake)"}
		m["skirt_settled"] = not skirt_rep.is_empty()
	else:
		match act_kind:
			"basketball":
				var g0 := 0.0
				while g0 < 5.0 and bool(am.dribble_ball_at(a.current_animation_position)[1]):
					await get_tree().process_frame
					g0 += 0.016
				while g0 < 10.0 and not bool(am.dribble_ball_at(a.current_animation_position)[1]):   # 球回到手心那一格
					await get_tree().process_frame
					g0 += 0.016
				sheet_freeze = true
				m = am.measure_dribble()
			"baseball":
				var tc: float = am.bb["t_c"]
				var g1 := 0.0
				while g1 < 25.0 and (am.bb_t > tc - 0.3 or bb_cut):   # 等下一輪開始
					await get_tree().process_frame
					g1 += 0.016
				bb_hold = true   # _update_act 走到接觸那一格就停（sheet_freeze）
				while g1 < 50.0 and not sheet_freeze:
					await get_tree().process_frame
					g1 += 0.016
				bb_hold = false
				sheet_freeze = true
				m = am.measure_baseball()
				m["bb_t"] = am.bb_t
				m["t_contact"] = tc
			"camping":
				sheet_freeze = true
				m = am.measure_ground_body((act_root.get_node("Fire") as Node3D).position)
			"music":
				sheet_freeze = true
				m = am.measure_ground_body()
				if mascot:
					m["ear_pad_gap_cm"] = W["outdoor"]["stand_headphones"].get("ear_pad_gap_cm", -1.0)
					m["ear_pad_in_head"] = W["outdoor"]["stand_headphones"].get("ear_pad_in_head", -1)
			"bike":
				sheet_freeze = true
				m = am.measure_bike(true)
			"jogging":
				sheet_freeze = true
				m = {"feet_lowest_cm": _feet_low_cm(), "ground_speed_mps": float(speeds.get("jog", 0.0)), "procedural_gait": proc_gait != ""}
	m["act"] = It["act"]
	m["hud_safe"] = _hud_safe()
	await _sheet_save(key, m)
	if OS.get_environment("TOPVIEW") != "" and not in_home:   # 除錯：正上方往下看這一題在哪裡演（草地／馬路）
		var tp: Vector2 = W["pos"]
		var keep_cm := cam_mode
		fixed_cam = [world.bend2(tp, 26.0), world.bend2(tp, 0.0), (world.bend2(tp + Vector2(0, -6), 0.0) - world.bend2(tp, 0.0)).normalized()]
		cam_mode = "fixed"
		hud.visible = false
		for i in 3:
			await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("res://test_route_sheet/%s/%s_top.png" % [route_id, key])
		hud.visible = true
		cam_mode = keep_cm
		cam_pos = Vector3.ZERO
	sheet_freeze = false
	fast = keep_fast

## 圳寶坐機車：移動中那一格量輪子貼地、輪子轉角×半徑＝前進距離、屁股到坐墊、安全帽穿模
func _scooter_check(It: Dictionary) -> void:
	if not _riding_scooter():
		_check(false, "A q%d scooter trip: Zun-Bo is on the scooter" % (qi + 1))
		return
	sheet_freeze = true
	var m: Dictionary = scooter.measure()
	var ok: bool = absf(float(m["wheel_front_road_gap_cm"])) < 0.3 and absf(float(m["wheel_rear_road_gap_cm"])) < 0.3 and float(m["wheel_slip_cm"]) < 0.5 \
		and int(m["helmet_penetration_pts"]) == 0 and float(m["helmet_min_gap_mm"]) > 0.0 and int(m["helmet_head_pts_covered"]) > 50 \
		and absf(float(m["seat_bottom_gap_cm"])) < 1.0 and float(m["distance_m"]) > 1.0
	_check(ok, "A q%d scooter: wheels on road, roll=distance, seated, helmet 0 penetration %s" % [qi + 1, JSON.stringify(_num_only(m))])
	if OS.get_environment("SHEET") != "":
		# 近一點的側面鏡頭（看得到輪子、坐姿、安全帽）
		var p: Vector2 = W["pos"]
		var f: Vector2 = W["fwd"]
		var keep_mode := cam_mode
		for sd in [1.0, -1.0]:
			var c2: Vector2 = p + Vector2(-f.y, f.x) * 3.4 * sd + f * 1.6
			if world._blocked_count(c2, 1.5, p, 1.0, "-none-") == 0 or sd < 0.0:
				fixed_cam = [world.bend2(c2, 1.5), world.bend2(p, 0.85), world.bend2(p).normalized()]
				break
		cam_mode = "fixed"
		m["act"] = "scooter"
		await _sheet_save("scooter_q%02d" % (qi + 1), m)
		cam_mode = keep_mode
		cam_pos = Vector3.ZERO
	sheet_freeze = false

# ---------- [ipad] 面板塞得進畫面嗎（PANELFIT=1 --test --resolution WxH） ----------
## 每種組數 4–8（PANELGROUPS=4,5 可只測幾種）× 11 題的題目面板＋揭曉面板：整塊在可見範圍內、左右 ≥ 12 px、不碰右上按鈕欄；
## 再看首頁、路線選擇、分組設定、結果畫面的按鈕／字有沒有跑出畫面。截圖 test_panelfit/<WxH>_*.png
func _rect_in_view(r: Rect2, margin: float) -> bool:
	var vs := get_viewport().get_visible_rect()
	return r.position.x >= vs.position.x + margin - 0.5 and r.end.x <= vs.end.x - margin + 0.5 and r.position.y >= vs.position.y - 0.5 and r.end.y <= vs.end.y + 0.5

func _screen_fits(root: Control, what: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	var bad := []
	var stack: Array = [root]
	while not stack.is_empty():
		var n = stack.pop_back()
		if n is Control and not (n as Control).is_visible_in_tree():
			continue
		if (n is Button or n is Label or n is PanelContainer) and n != confetti:
			if not _rect_in_view((n as Control).get_global_rect(), 0.0):
				bad.append("%s%s" % [n.name, (n as Control).get_global_rect()])
		stack.append_array(n.get_children())
	print("PANELFIT screen %s view=%s outside=%s" % [what, get_viewport().get_visible_rect().size, bad])
	_check(bad.is_empty(), "panelfit %s: every button/label inside the screen" % what)

func _panel_fit_once(tag: String) -> bool:
	for i in 3:
		await get_tree().process_frame
	var r := qpanel.get_global_rect()
	var col := hud_col.get_global_rect()
	var ok := _rect_in_view(r, 12.0) and not r.intersects(col)
	print("PANELFIT %s view=%s panel=%s scale=%.2f col=%s %s" % [tag, get_viewport().get_visible_rect().size, r, qpanel.scale.x, col, "ok" if ok else "OUT"])
	return ok

func _test_panel_fit() -> void:
	var res := "%dx%d" % [DisplayServer.window_get_size().x, DisplayServer.window_get_size().y]
	var dir := "res://test_panelfit"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	FileAccess.open(dir + "/.gdignore", FileAccess.WRITE).close()
	var snap := func(nm: String):
		await _wait_drawn(nm)
		get_viewport().get_texture().get_image().save_png("%s/%s_%s.png" % [dir, res, nm])
		print("SHOT ", nm)
	await _wait(2.5)
	intro_t = INTRO_END
	await _wait(0.8)
	await _screen_fits(title_ui, "title")
	await snap.call("title")
	if pair:
		_show_routes("pair")
		await _screen_fits(route_ui, "route_select")
		_start_game()
	else:
		_show_routes("groups")
		await _screen_fits(route_ui, "route_select")
		await snap.call("route")
		_show_setup()
		_set_group_count(8)
		await _screen_fits(setup_ui, "setup_8")
	fast = not perf_test   # [perf] FPS15 測試一律 ×1
	var counts := [1] if pair else [4, 5, 6, 7, 8]
	if OS.get_environment("PANELGROUPS") != "" and not pair:
		counts = Array(OS.get_environment("PANELGROUPS").split(",")).map(func(x): return int(x))
	for n in counts:
		if not pair:
			_set_group_count(n)
			_start_game()
		var worst := ""
		for q in items.size():
			qi = q
			_show_question(q == 0)
			if not await _panel_fit_once("%s g%d q%d question" % [res, n, q + 1]):
				worst += " q%d" % (q + 1)
			if q == 0:
				await snap.call("g%d_q1_question" % n)
			if not pair:
				for g in group_count:
					bets[g] = 0
				_paint_bet(0)
			_reveal_panel()
			_layout_panel()
			if not await _panel_fit_once("%s g%d q%d reveal" % [res, n, q + 1]):
				worst += " q%d-reveal" % (q + 1)
		_check(worst == "", "panelfit %s groups=%d: panel inside screen (≥12 px) and clear of the right buttons%s" % [res, n, worst])
	scores.clear()
	for g in (1 if pair else 8):
		scores.append(10 + g)
	group_count = scores.size()
	_show_result()
	await _wait(0.5)
	await _screen_fits(result_ui, "result")
	await snap.call("result")

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
	fast = not perf_test   # [perf] FPS15 測試一律 ×1
	var n0 := qi
	for n in range(n0, items.size() if only == 0 else only):
		var It: Dictionary = items[qi]
		await _wait(1.2)
		var tag := "A%02d_%s" % [qi + 1, It["act"]]
		await _az_check("locked")
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
		await _az_check("bets")
		await _shot(tag + "_2bets")
		_check(not start_btn.disabled, "A q%d start enabled after all groups bet" % (qi + 1))
		var before: Array = scores.duplicate()
		fast = false   # 移動截圖用正常速度（Fast ×3 時鏡頭跟不上，Ken 會跑出畫面）
		_on_start()
		await _wait(2.2 if It["travel"] != "none" else 0.1)
		if It["travel"] != "none":
			await _shot(tag + "_3moving")
			if It["travel"] == "scooter" and not perf_test:   # FPS15 計時測試不量（量一次 15 秒，會算進揭曉時間）；一般整回合測試照量
				await _scooter_check(It)
			var pth: Array = W["path"]
			if not pth.is_empty():
				var dirv: Vector2 = ((pth[0] as Vector2) - (W["pos"] as Vector2))
				var ang := rad_to_deg(absf((W["fwd"] as Vector2).angle_to(dirv))) if dirv.length() > 0.3 else 0.0
				_check(ang < 35.0, "A q%d Ken faces where he walks (%.0f°)" % [qi + 1, ang])
		fast = not perf_test   # [perf] FPS15 測試一律 ×1
		await _wait_state(St.WALKING, 300.0)   # 電腦忙的時候（視窗被擋住、幀數很低）走路會花比較久
		var gw := 0.0
		while not next_btn.visible and gw < 8.0:   # 進門有淡出／淡入，等演出面板出來
			await _wait(0.05 if perf_test else 0.2)
			gw += 0.2
		if perf_test:
			_on_listen()   # [perf] 演出出來就按「聽句子」（不等截圖、檢查）
		await _wait(1.6)
		await _shot(tag + "_4act")
		if OS.get_environment("CARDS") != "":   # 2026-11-14 朗讀影片用（tools/2026 listen read aloud videos）：藏 UI，演出中隔一下各拍一張
			ui.visible = false
			for k in 3:
				await _wait(0.3 if k == 0 else 1.1)
				await _shot("%s_card%d" % [It["act"], k])
			ui.visible = true
		_check(_hud_safe(), "A q%d key objects not under HUD buttons / bottom panel" % (qi + 1))
		if in_home and mascot:
			var iv := _indoor_visible()
			_check(iv["ok"], "A q%d indoor: face + key prop visible, not hidden by own head %s" % [qi + 1, iv["note"]])
		if not in_home:
			var ov := _outdoor_visible()
			_check(ov["ok"], "A q%d outdoor: nothing between camera and character/props, character >= 20%% of screen height (%s)" % [qi + 1, ov["note"]])
		if OS.get_environment("SHEET") != "":
			await _sheet_frame(It)
		if roam or act_kind == "baseball":   # 一直在動的演出：多看幾秒（含迴轉、跑壘）
			var all_ok := true
			for i in 16:
				await _wait(0.5)
				all_ok = _hud_safe() and all_ok
				var ov2 := _outdoor_visible()
				if not ov2["ok"]:
					all_ok = false
					print("OUTVIS fail during moving act: ", ov2["note"], " phase=", am.bb_phase if act_kind == "baseball" else "-", " t=", am.bb_t if act_kind == "baseball" else 0.0)
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
		if not perf_test:   # FPS15 測試演出一出來就聽了答案句（這個鎖在一般整回合測試檢查）
			_on_next()   # 還沒聽答案句：Next 要被擋
			_check(state == St.REVEAL and next_btn.disabled, "A q%d next blocked until answer sentence heard" % (qi + 1))
		_scooter_q_check("A")
		print("ROUND %d %s from=%s to=%s perform=%s scores=%s state=%d" % [qi + 1, It["act"], It["from"], It["to"], It["perform"], scores, state])
		await _finish_listen()
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
	fast = not perf_test   # [perf] FPS15 測試一律 ×1
	var seen := {}
	var n0 := qi
	for n in range(n0, items.size() if only == 0 else only):
		var It: Dictionary = items[qi]
		var kind: String = clue_order[qi]
		var tag := "B%02d_%s" % [qi + 1, It["act"]]
		await _wait(0.8)
		await _az_check("locked")
		if n == n0:
			await _shot(tag + "_1scenario_locked")
		_start_clue()
		_clue_to_answer()
		_check(state == St.QUESTION and clue_start_btn.disabled and clue_btn.disabled and not ask_poll and clue_card.modulate.a < 0.9, "B q%d clue+answer locked before scenario audio" % (qi + 1))
		await _on_play_scene()
		await _wait(0.3)
		_check(state == St.CLUE and not clue_start_btn.disabled and clue_btn.disabled, "B q%d clue unlocked after scenario audio ended" % (qi + 1))
		await _az_check("clue")
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
		test_answer_wait = 6.0 if mascot else 1.0   # [1112] 吉祥物：先等鏡頭轉好、量作答畫面
		if n == n0:
			await _shot(tag + "_2d_answer_unlocked")
		_clue_to_answer()
		_check(state == St.ANSWER and ask_poll, "B q%d question sent to frame" % (qi + 1))
		await _az_check("answer")
		test_answer_wait = minf(test_answer_wait, 0.5)
		await _wait(0.3)
		if n == n0:
			await _shot(tag + "_3asked")
		while state == St.ANSWER:
			await _wait(0.2)
		await _wait_state(St.WALKING, 300.0)   # 電腦忙的時候（視窗被擋住、幀數很低）走路會花比較久
		var gw := 0.0
		while not next_btn.visible and gw < 8.0:   # 進門有淡出／淡入，等演出面板出來
			await _wait(0.05 if perf_test else 0.2)
			gw += 0.2
		if perf_test:
			_on_listen()   # [perf] 演出出來就按「聽句子」（不等截圖、檢查）
		await _wait(1.6)
		await _shot(tag + "_4act")
		_check(state == St.REVEAL, "B q%d Ken acted out the answer" % (qi + 1))
		_check(_hud_safe(), "B q%d key objects not under HUD buttons / bottom panel" % (qi + 1))
		if in_home and mascot:
			var ivb := _indoor_visible()
			_check(ivb["ok"], "B q%d indoor: face + key prop visible, not hidden by own head %s" % [qi + 1, ivb["note"]])
		if not in_home:
			var ovb := _outdoor_visible()
			_check(ovb["ok"], "B q%d outdoor: nothing between camera and character/props, character >= 20%% of screen height (%s)" % [qi + 1, ovb["note"]])
		_scooter_q_check("B")
		print("PAIR %d %s clue=%s correct=%s score=%s" % [qi + 1, It["act"], kind, pair_correct, scores])
		await _finish_listen()
		await _on_next()
		await _wait(0.3)
	if only == 0:
		await _wait(1.8)
		await _shot("B99_result")
		_check(state == St.RESULT and cur_anim == "ft/cheering" and scores[0] % PAIR_POINTS == 0, "B result pair score shown")
	print("PAIR TEST DONE clues=", clue_order, " score=", scores)
