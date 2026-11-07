extends Node3D
## Ken's Jump Island：13 關 3D 平台遊戲＋英語題（RDQ：rdq/RDQ-spec-ken-jump-island-20261023.md；
## 2026-11-09 改 iPad 自動跑版＋SF3 R1 題庫：rdq/RDQ-spec-jump-island-run-ipad-20261109.md）。
## 星星＝題目：碰到星星 → 出這關的下一題（沿用二水 3D 闖關的 quiz.gd）→ 答對收下星星；集滿過關。
## 魔王關：答對 → 魔王暈 5 秒 → 踩頭扣血。
##
## 命令列（電腦測試）：
##   -- --bank=<題庫資料夾>        讀哪份題庫（例如 site/public/ershui-3d-quest/bank）
##   -- --level=N                 直接進第 N 關
##   -- --test                    自動測試（跳躍高度／距離、關卡障礙、答題流程、魔王戰），結束印 QA DONE
##   -- --capture=<png> [--shot=秒] 進關後截圖存檔再結束（看畫面用，不能加 --headless）
##   -- --touch                   電腦上也顯示觸控按鈕

const Host := preload("res://scripts/host.gd")
const Levels := preload("res://scripts/levels.gd")
const PlayerScript := preload("res://scripts/player.gd")
const SlimeScript := preload("res://scripts/slime.gd")
const BossScript := preload("res://scripts/boss.gd")
const TouchPad := preload("res://scripts/touch_pad.gd")
const QA := preload("res://scripts/qa.gd")
const BankScript := preload("res://scripts/bank.gd")
const QuizScript := preload("res://scripts/quiz.gd")
const RunLevels := preload("res://scripts/run_levels.gd")

## ---- iPad 自動跑版（2026-11-09 RDQ）：Ken 自己往右跑，點螢幕跳、按住跳更高；掉下去泡泡帶回來 ----
const RUN_SPEED := 7.5           # 自動跑速（m/s），一關約 45 秒
const RUN_GRAV := 0.7            # 自動跑時重力打七折：按住約可跳過 8 m 的缺口
var fall_spots: Array = []       # 泡泡救援的位置；同一處掉 2 次以上，下次到邊緣自動幫忙跳
var run_mode := false
var tap_pressed := false         # 這一格有沒有新的點擊
var tap_held := false            # 手指還按著（按住跳更高）
var auto_hold := 0.0             # 自動跨越矮台階／史萊姆時，假裝按住一下
var safe_hist: Array = []        # 最近站在地上的位置（掉下去時帶回約 1 秒前的位置）
var safe_t := 0.0
var bubble: MeshInstance3D = null
## ---- 華麗動作、金幣、地標（2026-11-10 RDQ：rdq/RDQ-spec-jump-island-moves-landmarks-20261110.md）----
var coins: Array = []            # 金幣節點
var coin_count := 0
var style_count := 0             # 華麗動作次數（過關時顯示，不算分）
# 遊戲分數（2026-11-07 RDQ：只顯示在畫面與過關畫面，不送教師後台、不影響答題成績）
const SAVE_BEST := "user://jump_best.json"
const FRUIT_PTS := {"guava": 50, "pomelo": 100, "melon": 200}
var score := 0
var score_max := 0
var fruits: Array = []            # {"node", "kind"}
var qboxes: Array = []            # {"node", "label", "used", "item", "bottom"}
var snails: Array = []            # {"node", "x0", "y", "t", "dir", "hits"}
var hurt_t := 0.0
var bot_hurts := 0
var red_flash: ColorRect
var stomp_chain := 0             # 空中連續踩幾隻（落地歸零）
## ---- iPad 防過熱（沿用二水 3D 闖關 2026-11-09）----
const FPS_PLAY := 30
const FPS_QUIZ := 15
const FPS_REST := 5
const REST_AFTER_MS := 15 * 60 * 1000
var play_ms := 0
var last_tick_ms := 0
var rest_layer: CanvasLayer = null

## 正式版依序解鎖（過了前一關才開下一關）；電腦測試可加 -- --unlock 全部打開
const PREVIEW := false
const TERRAIN := preload("res://assets/terrain.gdshader")
const KEN_H := 2.2
const DEATH_Y := -14.0
const SAVE_CLEARED := "user://jump_cleared.json"
const SFX := {
	"jump": "run_jump", "triple": "atk_star", "long": "atk_wind", "land": "run_land", "stomp": "run_stomp",
	"knock": "monster_laugh", "star": "unlock", "question": "question", "flag": "arrive", "clear": "victory",
	"boss": "boss_appear", "slam": "atk_fire", "defeat": "defeat", "fall": "wrong", "click": "click",
	"correct": "correct", "wrong": "wrong",
	# 自動跑版華麗動作（2026-11-10；Kenney 新音效下載後換成專用音效）
	"coin": "run_coin", "flip": "run_flip", "spin": "run_spin", "vault": "run_vault", "wallkick": "run_wallkick", "cheer": "run_cheer",
	# 加分道具與扣分障礙（2026-11-07，Kenney CC0）
	"fruit": "run_fruit", "box": "run_box", "hurt": "run_hurt",
	# 華麗過關畫面（2026-11-07，Kenney Music Jingles／Digital Audio，CC0）
	"fanfare": "run_fanfare", "results": "run_results", "starding": "run_starding", "record": "run_record",
	"tick": "run_tick", "firework": "run_firework",
}

var font: FontFile
var font_bold: FontFile
var theme_ui: Theme
var bank: BankScript = null
var quiz: QuizScript = null
var init := {}
var cleared := {}
var test_mode := false
var is_mobile := false
var args := {}

var ui: CanvasLayer
var hud: Label
var boss_bar: Label
var boss_hp: ProgressBar
var menu_btn: Button
var toast: Label
var toast_tw: Tween
var touch: TouchPad
var menu_layer: CanvasLayer

var world: Node3D
var player: PlayerScript = null
var cam: Camera3D
var shadow: MeshInstance3D
var L := {}
var D := {}
var stars: Array = []          # 每顆：{"node", "done", "cool", "free"}
var slimes: Array = []
var flags: Array = []          # {"node", "pos", "on", "cloth"}
var boss: BossScript = null
var active_star = null
var checkpoint := Vector3.ZERO
var checkpoint_yaw := 0.0
var state := "loading"         # loading menu play quiz clear
var cam_yaw := 0.0
var cam_focus := Vector3.ZERO
var cam_zoom := 0.0           # 過關慶祝時 0 → 1（鏡頭拉近 Ken）
var run_dir := 1.0            # 自動跑方向：魔王關會在場地兩端轉身（+1 往右、-1 往左）
var cam_lead := 1.0
var sb := {}                  # 側面魔王（第 12、13 關）的狀態
var fresh_done := false
var cam_snap := true
var sfx_pool: Array = []
var sfx_streams := {}
var star_spot_i := 0
var mats := {}
var TH := {}                   # 目前關卡的配色主題
var movers: Array = []         # {"body", "a", "b", "period"}
var mover_t := 0.0
var star_mesh: ArrayMesh

func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	test_mode = args.has("test")
	# 預覽頻道（網址有 --）全部關卡直接打開，教師 iPad 試玩不用從第 1 關一路破；正式站不受影響
	if OS.has_feature("web") and int(JavaScriptBridge.eval("(location.hostname.indexOf('--')>0)?1:0", true)) == 1:
		args["unlock"] = "1"
	_detect_mobile()
	_setup_input()
	_setup_fonts()
	_build_audio()
	_build_ui()
	init = Host.initial()
	if not await _load_bank():
		return
	_load_cleared()
	quiz = QuizScript.new()
	ui.add_child(quiz)
	quiz.setup(font, font_bold, test_mode, bank)
	quiz.next_text = "Go! 繼續"
	quiz.turn_done.connect(_on_turn_done)
	quiz.closed.connect(_on_quiz_closed)
	quiz.answered.connect(func(ok): sfx("correct" if ok else "wrong"))
	if test_mode:
		var qa := QA.new()
		qa.game = self
		add_child(qa)
		qa.run()
		return
	if args.has("autoplay") or _web_autoplay():
		# 驗證用自動闖關（網址加 ?autoplay=1）：學生正常進來不會觸發
		if not Host.connected():
			quiz.reset_results()
			cleared = {}
		show_menu()
		var ap = preload("res://scripts/autoplay.gd").new()
		ap.game = self
		add_child(ap)
		ap.run()
		return
	if args.has("level"):
		start_level(int(args["level"]))
		if args.has("capture"):
			await get_tree().create_timer(float(args.get("shot", "3"))).timeout
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png(String(args["capture"]))
			get_tree().quit()
		return
	show_menu()
	if args.has("capture"):
		await get_tree().create_timer(1.0).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(String(args["capture"]))
		get_tree().quit()

# ---------------------------------------------------------------- 準備
func _detect_mobile() -> void:
	is_mobile = OS.has_feature("mobile") or OS.has_feature("web_ios") or OS.has_feature("web_android")
	if OS.has_feature("web") and not is_mobile:
		var r = JavaScriptBridge.eval("(/iPad|iPhone|Android/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform))) ? 1 : 0", true)
		is_mobile = int(r) == 1
	if args.has("touch"):
		is_mobile = true

func _web_autoplay() -> bool:
	if not OS.has_feature("web"):
		return false
	# 只在本機或 Firebase 預覽頻道（網址有 "--"）開放；正式站 hwg5-clock-tower.web.app 一律關閉，學生不能用來自動答題
	var r = JavaScriptBridge.eval("(function(){try{var h=location.hostname;if(!(h==='localhost'||h==='127.0.0.1'||h.indexOf('--')>0))return 0;var a=/[?&]autoplay=1/;return (a.test(location.search)||a.test(window.parent.location.search))?1:0;}catch(e){return 0;}})()", true)
	return int(r) == 1

func _setup_input() -> void:
	var map := {
		"left": [KEY_A, KEY_LEFT], "right": [KEY_D, KEY_RIGHT], "up": [KEY_W, KEY_UP], "down": [KEY_S, KEY_DOWN],
		"jump": [KEY_SPACE, KEY_J], "long": [KEY_SHIFT, KEY_K],
	}
	for action in map:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for k in map[action]:
			var e := InputEventKey.new()
			e.physical_keycode = k
			InputMap.action_add_event(action, e)

func _setup_fonts() -> void:
	var cjk: FontFile = load("res://assets/fonts/NotoSansTC-Regular-subset.ttf")
	var cjk_b: FontFile = load("res://assets/fonts/NotoSansTC-Bold-subset.ttf")
	font = load("res://assets/fonts/ComicRelief-Regular.ttf")
	font_bold = load("res://assets/fonts/ComicRelief-Bold.ttf")
	font.fallbacks = [cjk]
	font_bold.fallbacks = [cjk_b]
	theme_ui = Theme.new()
	theme_ui.default_font = font_bold
	theme_ui.default_font_size = 26

func _build_audio() -> void:
	for nm in SFX.values():
		var p := "res://assets/audio/sfx/%s.ogg" % nm
		if ResourceLoader.exists(p):
			sfx_streams[nm] = load(p)
	music_player = AudioStreamPlayer.new()
	music_player.volume_db = MUSIC_DB
	add_child(music_player)
	for i in 6:
		var ap := AudioStreamPlayer.new()
		ap.volume_db = -6.0
		add_child(ap)
		sfx_pool.append(ap)

# ---------------------------------------------------------------- 背景音樂
## 沿用二水 3D 闖關的 Suno 音樂（../quest3d/music/），不包進遊戲檔：網頁版進關卡後才在背景下載。
## 一般關卡 street、魔王關 boss；答題時音量降低。電腦測試或下載失敗時就安靜，不影響遊戲。
var music_player: AudioStreamPlayer
var music_now := ""
var music_cache := {}
var music_loading := {}
const MUSIC_DB := -14.0

func play_music(mname: String) -> void:
	if test_mode or mname == music_now:
		return
	music_now = mname
	var st: AudioStream = await _music_stream(mname)
	if st == null or music_now != mname:
		return
	music_player.stream = st
	music_player.play()

func _music_stream(mname: String) -> AudioStream:
	if music_cache.has(mname):
		return music_cache[mname]
	if not OS.has_feature("web"):
		return null
	if music_loading.has(mname):
		while music_loading.has(mname):
			await get_tree().process_frame
		return music_cache.get(mname)
	music_loading[mname] = true
	var href := String(JavaScriptBridge.eval("location.href.split('?')[0]", true))
	var url := href.substr(0, href.rfind("/") + 1) + "../quest3d/music/bgm_%s.mp3" % mname
	var st: AudioStream = null
	for attempt in 3:
		var req := HTTPRequest.new()
		add_child(req)
		if req.request(url) == OK:
			var res: Array = await req.request_completed
			if int(res[0]) == HTTPRequest.RESULT_SUCCESS and int(res[1]) == 200:
				var mp3 := AudioStreamMP3.new()
				mp3.data = res[3]
				mp3.loop = true
				st = mp3
		req.queue_free()
		if st != null:
			break
		await get_tree().create_timer(2.0).timeout
	music_loading.erase(mname)
	if st != null:
		music_cache[mname] = st
	return st

func _duck_music(on: bool) -> void:
	if music_player:
		music_player.volume_db = MUSIC_DB - (12.0 if on else 0.0)

func sfx(key: String) -> void:
	var st: AudioStream = sfx_streams.get(SFX.get(key, key))
	if st == null or test_mode:
		return
	for ap in sfx_pool:
		if not ap.playing:
			ap.stream = st
			ap.play()
			return

func _build_ui() -> void:
	ui = CanvasLayer.new()
	ui.layer = 10
	add_child(ui)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = theme_ui
	ui.add_child(root)
	touch = TouchPad.new()
	touch.font = font_bold
	root.add_child(touch)
	touch.visible = false
	hud = _label("", 30)
	hud.position = Vector2(24, 14)
	root.add_child(hud)
	boss_bar = _label("", 30)
	boss_bar.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	boss_bar.position.y = 60
	boss_bar.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	boss_bar.grow_horizontal = Control.GROW_DIRECTION_BOTH
	root.add_child(boss_bar)
	boss_hp = ProgressBar.new()
	boss_hp.show_percentage = false
	boss_hp.anchor_left = 0.5
	boss_hp.anchor_right = 0.5
	boss_hp.offset_left = -210
	boss_hp.offset_right = 210
	boss_hp.offset_top = 104
	boss_hp.offset_bottom = 130
	var fill := StyleBoxFlat.new()
	fill.bg_color = Color(0.95, 0.25, 0.3)
	fill.set_corner_radius_all(10)
	var back := StyleBoxFlat.new()
	back.bg_color = Color(0.1, 0.1, 0.2, 0.6)
	back.set_corner_radius_all(10)
	back.set_border_width_all(3)
	back.border_color = Color.WHITE
	boss_hp.add_theme_stylebox_override("fill", fill)
	boss_hp.add_theme_stylebox_override("background", back)
	boss_hp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(boss_hp)
	menu_btn = Button.new()
	menu_btn.text = "選關 Menu"
	menu_btn.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	menu_btn.position = Vector2(-190, 12)
	menu_btn.size = Vector2(170, 56)
	menu_btn.pressed.connect(func():
		if state == "play":
			sfx("click")
			show_menu())
	root.add_child(menu_btn)
	toast = _label("", 44)
	toast.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast.grow_horizontal = Control.GROW_DIRECTION_BOTH
	toast.grow_vertical = Control.GROW_DIRECTION_BOTH
	toast.position.y -= 150
	toast.modulate.a = 0.0
	root.add_child(toast)
	_set_hud_visible(false)

func _label(t: String, size: int) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_override("font", font_bold)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color.WHITE)
	l.add_theme_color_override("font_outline_color", Color(0.1, 0.12, 0.25))
	l.add_theme_constant_override("outline_size", 10)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func _set_hud_visible(on: bool) -> void:
	hud.visible = on
	menu_btn.visible = on
	boss_bar.visible = on and (boss != null or (not sb.is_empty() and not sb["defeated"]))
	boss_hp.visible = boss_bar.visible
	touch.visible = on and is_mobile and state == "play" and not run_mode
	touch.reset()

func show_toast(t: String, secs := 2.2) -> void:
	toast.text = t
	if toast_tw:
		toast_tw.kill()
	toast_tw = create_tween()
	toast.modulate.a = 1.0
	toast_tw.tween_interval(secs)
	toast_tw.tween_property(toast, "modulate:a", 0.0, 0.5)

func _load_bank() -> bool:
	bank = BankScript.new()
	add_child(bank)
	bank.resolve_base(init)
	var layer := CanvasLayer.new()
	layer.layer = 50
	add_child(layer)
	var cover := ColorRect.new()
	cover.color = Color(0.36, 0.62, 0.92)
	cover.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.add_child(cover)
	var lab := _label("Loading questions…  讀取題目中…", 36)
	lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lab.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lab.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cover.add_child(lab)
	bank.progress.connect(func(d, t): lab.text = "Loading questions…  讀取題目中…  %d%%" % int(100.0 * d / maxf(1.0, t)))
	var ok: bool = await bank.load_all()
	if not ok:
		lab.text = "題目讀取失敗，請重新整理頁面。\nCould not load the questions. Please reload.\n\n" + bank.error
		push_error(bank.error)
		if test_mode:
			print("QA DONE failures=1 (bank)")
			get_tree().quit(1)
		return false
	# 題庫內附的中文字型當第二備援（遊戲內建子集已涵蓋介面用字與 HWG5 題目）
	if bank.font_regular != null:
		font.fallbacks = font.fallbacks + [bank.font_regular]
	if bank.font_bold != null:
		font_bold.fallbacks = font_bold.fallbacks + [bank.font_bold]
	layer.queue_free()
	return true

func _load_cleared() -> void:
	cleared = {}
	if typeof(init.get("cleared")) == TYPE_ARRAY:
		for id in init["cleared"]:
			cleared[String(id)] = true
	elif not Host.connected() and not test_mode and FileAccess.file_exists(SAVE_CLEARED):
		var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE_CLEARED))
		if typeof(d) == TYPE_ARRAY:
			for id in d:
				cleared[String(id)] = true

func _save_cleared() -> void:
	if Host.connected() or test_mode:
		return
	var f := FileAccess.open(SAVE_CLEARED, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(cleared.keys()))

# ---------------------------------------------------------------- 選關畫面
func level_total(id: String) -> int:
	return quiz.plan.get(id, []).size()

func level_done(id: String) -> int:
	return level_total(id) - quiz.remaining(id)

func is_unlocked(n: int) -> bool:
	var Lv := Levels.by_n(n)
	if (PREVIEW or args.has("unlock")) and String(Lv["layout"]) != "":
		return true
	if n == 1:
		return true
	return cleared.has(String(Levels.by_n(n - 1)["id"]))

func show_menu() -> void:
	_clear_level()
	state = "menu"
	_set_hud_visible(false)
	if menu_layer:
		menu_layer.queue_free()
	menu_layer = CanvasLayer.new()
	menu_layer.layer = 20
	add_child(menu_layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.theme = theme_ui
	menu_layer.add_child(root)
	var bg := ColorRect.new()
	bg.color = Color(0.33, 0.6, 0.9)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(bg)
	var box := VBoxContainer.new()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	box.offset_left = 30
	box.offset_right = -30
	box.offset_top = 16
	box.offset_bottom = -10
	box.add_theme_constant_override("separation", 10)
	root.add_child(box)
	var title := _label("Ken's Jump Island", 54)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	var total_done := 0
	for Lv in Levels.LEVELS:
		total_done += level_done(String(Lv["id"]))
	var sub := _label("%s　★ %d / %d　通關 %d / 13" % [String(bank.data.get("unit", "Ken's Jump Island")), total_done, bank.data["items"].size(), cleared.size()], 28)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(sub)
	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	grid.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(grid)
	for Lv in Levels.LEVELS:
		var n: int = Lv["n"]
		var id: String = Lv["id"]
		var b := Button.new()
		b.custom_minimum_size = Vector2(228, 112)
		b.add_theme_font_size_override("font_size", 22)
		var tag := "魔王 " if Lv["boss"] else ""
		var status := "★ %d / %d" % [level_done(id), level_total(id)]
		if cleared.has(id):
			status += "  ✓"
		var built := String(Lv["layout"]) != ""
		if not built:
			status = "製作中 Coming soon"
		elif not is_unlocked(n):
			status = "未解鎖 Locked"
		b.text = "%d  %s%s\n%s\n%s" % [n, tag, Lv["zh"], Lv["en"], status]
		b.disabled = not built or not is_unlocked(n)
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(0.95, 0.55, 0.45) if Lv["boss"] else Color(1.0, 0.93, 0.7)
		if cleared.has(id):
			sb.bg_color = Color(0.7, 0.92, 0.6)
		sb.set_corner_radius_all(16)
		sb.set_border_width_all(4)
		sb.border_color = Color(0.25, 0.3, 0.5)
		for s in ["normal", "hover", "pressed", "focus"]:
			b.add_theme_stylebox_override(s, sb)
		var sbd: StyleBoxFlat = sb.duplicate()
		sbd.bg_color = Color(0.75, 0.78, 0.85)
		b.add_theme_stylebox_override("disabled", sbd)
		b.add_theme_color_override("font_color", Color(0.15, 0.15, 0.25))
		b.add_theme_color_override("font_hover_color", Color(0.15, 0.15, 0.25))
		b.add_theme_color_override("font_pressed_color", Color(0.15, 0.15, 0.25))
		b.add_theme_color_override("font_disabled_color", Color(0.4, 0.42, 0.5))
		b.pressed.connect(func():
			sfx("click")
			start_level(n))
		grid.add_child(b)
	var help := _label("Ken 自己往前跑：點一下螢幕就跳、按住跳更高、碰到牆再點一下踢牆（電腦按空白鍵或滑鼠）", 20)
	help.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	help.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(help)

# ---------------------------------------------------------------- 建關卡
func _clear_level() -> void:
	if world:
		world.queue_free()
	world = null
	player = null
	boss = null
	stars = []
	slimes = []
	flags = []
	movers = []
	coins = []
	coin_count = 0
	style_count = 0
	fruits = []
	qboxes = []
	snails = []
	score = 0
	score_max = 0
	hurt_t = 0.0
	bot_hurts = 0
	stomp_chain = 0
	mover_t = 0.0
	mats = {}
	active_star = null

func start_level(n: int, custom_layout := {}) -> void:
	_clear_level()
	if args.has("fresh") and not fresh_done:   # 測試用：清掉這台電腦存的答題紀錄
		fresh_done = true
		quiz.reset_results()
	sb = {}
	run_dir = 1.0
	cam_lead = 1.0
	if menu_layer:
		menu_layer.queue_free()
		menu_layer = null
	L = Levels.by_n(n)
	run_mode = custom_layout.is_empty() and RunLevels.has(String(L["id"]))
	if not custom_layout.is_empty():
		D = custom_layout
	elif run_mode:
		D = RunLevels.layout(String(L["id"]))
	else:
		D = Levels.layout(String(L["layout"]))
	safe_hist = []
	fall_spots = []
	tap_pressed = false
	tap_held = false
	world = Node3D.new()
	add_child(world)
	TH = Levels.theme(String(D.get("theme", "meadow")))
	_build_env(TH["sky"], TH["water"])
	if D.has("time"):
		_apply_time(String(D["time"]))
	for b in D["boxes"]:
		_box(b[0], b[1], b[2])
	for m in D.get("movers", []):
		_mover(m)
	for d in D.get("decos", []):
		_deco(d[0], d[1], d[2], d[3])
	for s in D.get("signs", []):
		_sign(s[0], s[1])
	for f in D.get("flags", []):
		_flag(f)
	for s in D.get("slimes", []):
		var sl = SlimeScript.new()
		world.add_child(sl)
		sl.setup(s[0], s[1], s[2])
		slimes.append(sl)
	_spawn_player()
	var id: String = L["id"]
	if L["boss"] and not run_mode:
		var bd: Dictionary = D["boss"]
		boss = BossScript.new()
		world.add_child(boss)
		boss.setup(bd["pos"], bd["color"], quiz.remaining(id), float(bd.get("speed", 1.0)), bool(bd.get("double", false)))
		boss.target = player
		boss.slammed.connect(func(): sfx("slam"))
		boss.recovered_unhit.connect(_on_boss_recovered)
		star_spot_i = randi() % D["star_spots"].size()
	elif not D.has("side_boss"):   # 側面魔王關：星星是踩魔王才掉出來
		var plan: Array = quiz.plan.get(id, [])
		var spots: Array = D["stars"]
		for i in plan.size():
			var pos: Vector3 = spots[i] if i < spots.size() else spots[spots.size() - 1] + Vector3(0, 2.0 * (i - spots.size() + 1), 0)
			var done: bool = bool(quiz.results.get(plan[i], {}).get("finalCorrect", false))
			_add_star(pos, done, false)
	state = "play"
	_set_hud_visible(true)
	_update_hud()
	play_music("boss" if L["boss"] else "street")
	if boss:
		if quiz.remaining(id) == 0:
			boss.visible = false
			_level_clear()
			return
		sfx("boss")
		show_toast("魔王出現！ %s %s" % [D["boss"]["zh"], D["boss"]["en"]], 2.5)
		get_tree().create_timer(0.1 if test_mode else 2.5).timeout.connect(func():
			if boss and state != "clear":
				boss.start_fight()
				_spawn_boss_star(false))
	elif run_mode:
		player.run_cap = RUN_SPEED
		player.grav_mul = RUN_GRAV
		player.wall_kick_on = bool(D.get("wall_kick", false))
		state = "intro"
		_run_intro(n)
	else:
		show_toast("第 %d 關 %s\n%s" % [n, L["zh"], L["en"]], 2.0)

## 自動跑關卡的時間與天空（2026-11-07 RDQ ①：每關不同時間）
var env_psm: ProceduralSkyMaterial
var env_sun: DirectionalLight3D
var env_env: Environment
func _apply_time(t: String) -> void:
	if env_psm == null or env_sun == null:
		return
	var top := env_psm.sky_top_color
	var hor := env_psm.sky_horizon_color
	var sun_rot := Vector3(-58, 35, 0)
	var sun_e := 0.8
	var sun_c := Color.WHITE
	match t:
		"morning":
			top = Color(0.55, 0.75, 0.98)
			hor = Color(1.0, 0.88, 0.72)
			sun_rot = Vector3(-24, -50, 0)
			sun_e = 0.75
			sun_c = Color(1.0, 0.9, 0.75)
		"noon":
			top = Color(0.35, 0.62, 0.98)
			hor = Color(0.8, 0.92, 1.0)
			sun_rot = Vector3(-70, 30, 0)
			sun_e = 0.9
		"cloudy":
			top = Color(0.62, 0.7, 0.8)
			hor = Color(0.88, 0.9, 0.92)
			sun_rot = Vector3(-55, 20, 0)
			sun_e = 0.55
		"after_rain":
			top = Color(0.5, 0.66, 0.85)
			hor = Color(0.9, 0.94, 0.98)
			sun_rot = Vector3(-35, -30, 0)
			sun_e = 0.7
			sun_c = Color(1.0, 0.96, 0.88)
			_rainbow()
		"sunset":
			top = Color(0.5, 0.45, 0.78)
			hor = Color(1.0, 0.66, 0.42)
			sun_rot = Vector3(-14, 60, 0)
			sun_e = 0.7
			sun_c = Color(1.0, 0.72, 0.5)
		"dusk":
			top = Color(0.22, 0.24, 0.5)
			hor = Color(0.95, 0.55, 0.45)
			sun_rot = Vector3(-10, 70, 0)
			sun_e = 0.5
			sun_c = Color(1.0, 0.6, 0.5)
		"storm":
			top = Color(0.3, 0.3, 0.45)
			hor = Color(0.55, 0.55, 0.68)
			sun_rot = Vector3(-50, 10, 0)
			sun_e = 0.45
			sun_c = Color(0.8, 0.82, 1.0)
	env_psm.sky_top_color = top
	env_psm.sky_horizon_color = hor
	env_psm.ground_horizon_color = hor
	env_sun.rotation_degrees = sun_rot
	env_sun.light_energy = sun_e
	env_sun.light_color = sun_c
	env_env.ambient_light_color = hor.lerp(Color.WHITE, 0.4)

## 雨後彩虹：7 個圓環放在遠方，下半部被海面擋住只露出拱形
func _rainbow() -> void:
	var cols := [Color(0.95, 0.3, 0.3), Color(1.0, 0.6, 0.2), Color(1.0, 0.9, 0.3), Color(0.4, 0.85, 0.4),
		Color(0.3, 0.6, 1.0), Color(0.45, 0.4, 0.9), Color(0.7, 0.45, 0.9)]
	for i in cols.size():
		var mi := MeshInstance3D.new()
		var tm := TorusMesh.new()
		var r := 90.0 - i * 2.2
		tm.inner_radius = r - 2.2
		tm.outer_radius = r
		tm.rings = 48
		tm.ring_segments = 6
		mi.mesh = tm
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color = Color(cols[i].r, cols[i].g, cols[i].b, 0.35)
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
		mi.material_override = m
		mi.rotation_degrees = Vector3(90, 0, 0)
		mi.position = Vector3(160, -20, -160)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		world.add_child(mi)

func _build_env(sky_col: Color, water_col: Color) -> void:
	var we := WorldEnvironment.new()
	var env := Environment.new()
	var sky := Sky.new()
	var psm := ProceduralSkyMaterial.new()
	psm.sky_top_color = sky_col.darkened(0.2)
	psm.sky_horizon_color = sky_col.lightened(0.35)
	psm.ground_horizon_color = sky_col.lightened(0.35)
	psm.ground_bottom_color = water_col
	sky.sky_material = psm
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = sky_col.lerp(Color.WHITE, 0.5)
	env.ambient_light_energy = 0.22
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	we.environment = env
	env_psm = psm
	env_env = env
	world.add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-58, 35, 0)
	sun.light_energy = 0.8
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 60.0
	world.add_child(sun)
	env_sun = sun
	var water := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(600, 600)
	water.mesh = pm
	var wm := StandardMaterial3D.new()
	wm.albedo_color = water_col
	wm.roughness = 0.2
	water.material_override = wm
	water.position.y = -9.0
	world.add_child(water)
	cam = Camera3D.new()
	cam.fov = 60
	cam.far = 400
	world.add_child(cam)
	cam.current = true
	cam_snap = true

func _mat(kind: String, half_h: float) -> ShaderMaterial:
	var key := "%s:%.2f" % [kind, half_h]
	if mats.has(key):
		return mats[key]
	var m := ShaderMaterial.new()
	m.shader = TERRAIN
	m.set_shader_parameter("grass", TH["grass"])
	m.set_shader_parameter("grass2", TH["grass2"])
	var side := "stone" if kind == "tall" else "dirt"
	m.set_shader_parameter("dirt", TH[side])
	m.set_shader_parameter("dirt2", TH[side + "2"])
	m.set_shader_parameter("half_h", half_h)
	m.set_shader_parameter("lip", minf(0.45, half_h * 0.6))
	m.set_shader_parameter("wood", 1.0 if kind == "wood" else 0.0)
	mats[key] = m
	return m

## 移動平台：AnimatableBody3D，Ken 站上去會被帶著走
func _mover(m: Dictionary) -> void:
	var body := AnimatableBody3D.new()
	body.sync_to_physics = true
	body.position = m["a"]
	var size: Vector3 = m["size"]
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	body.add_child(cs)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = _mat("wood", size.y / 2.0)
	body.add_child(mi)
	world.add_child(body)
	movers.append({"body": body, "a": m["a"], "b": m["b"], "period": float(m["period"])})

func _move_movers(dt: float) -> void:
	mover_t += dt
	for m in movers:
		var k := 0.5 - 0.5 * cos(TAU * mover_t / float(m["period"]))
		(m["body"] as Node3D).position = (m["a"] as Vector3).lerp(m["b"], k)

## Kenney 裝飾（沒有碰撞，只是好看）
var deco_cache := {}
func _deco(model: String, pos: Vector3, yaw: float, scale: float) -> void:
	var path := "res://assets/kenney/%s.glb" % model
	if not ResourceLoader.exists(path):
		return
	if not deco_cache.has(path):
		deco_cache[path] = load(path)
	var inst: Node3D = (deco_cache[path] as PackedScene).instantiate()
	inst.position = pos
	inst.rotation.y = yaw
	inst.scale = Vector3.ONE * scale
	world.add_child(inst)

func _box(center: Vector3, size: Vector3, kind: String) -> void:
	var body := StaticBody3D.new()
	body.position = center
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	body.add_child(cs)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = _mat(kind, size.y / 2.0)
	body.add_child(mi)
	world.add_child(body)

func _sign(pos: Vector3, text: String) -> void:
	var post := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.08
	cm.bottom_radius = 0.08
	cm.height = 1.6
	post.mesh = cm
	post.position = pos + Vector3(0, 0.8, 0)
	world.add_child(post)
	var l := Label3D.new()
	l.text = text
	l.font = font_bold
	l.font_size = 44
	l.pixel_size = 0.009
	l.outline_size = 14
	l.outline_modulate = Color(0.1, 0.12, 0.25)
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.position = pos + Vector3(0, 2.1, 0)
	world.add_child(l)

func _flag(pos: Vector3) -> void:
	var root := Node3D.new()
	root.position = pos
	world.add_child(root)
	var pole := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.07
	cm.bottom_radius = 0.07
	cm.height = 3.2
	pole.mesh = cm
	pole.position.y = 1.6
	root.add_child(pole)
	var cloth := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(1.2, 0.8, 0.06)
	cloth.mesh = bm
	cloth.position = Vector3(0.62, 2.75, 0)
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.9, 0.3, 0.3)
	cloth.material_override = m
	root.add_child(cloth)
	flags.append({"node": root, "pos": pos, "on": false, "mat": m})

func _star_mesh() -> ArrayMesh:
	if star_mesh:
		return star_mesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array = []
	for i in 10:
		var r := 0.95 if i % 2 == 0 else 0.42
		var a := PI / 2.0 + TAU * i / 10.0
		pts.append(Vector2(cos(a) * r, sin(a) * r))
	var th := 0.22
	for i in 10:
		var p0: Vector2 = pts[i]
		var p1: Vector2 = pts[(i + 1) % 10]
		var f0 := Vector3(p0.x, p0.y, th)
		var f1 := Vector3(p1.x, p1.y, th)
		var b0 := Vector3(p0.x, p0.y, -th)
		var b1 := Vector3(p1.x, p1.y, -th)
		for tri in [[Vector3(0, 0, th * 1.6), f0, f1], [Vector3(0, 0, -th * 1.6), b1, b0], [f0, b0, b1], [f0, b1, f1]]:
			for v in tri:
				st.add_vertex(v)
	st.generate_normals()
	star_mesh = st.commit()
	return star_mesh

func _add_star(pos: Vector3, done: bool, free: bool) -> Dictionary:
	var node := Node3D.new()
	node.position = pos
	world.add_child(node)
	var mi := MeshInstance3D.new()
	mi.mesh = _star_mesh()
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.6, 0.15) if free else Color(1.0, 0.88, 0.2)
	m.emission_enabled = true
	m.emission = m.albedo_color * 0.6
	m.roughness = 0.3
	if done:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color.a = 0.25
		m.emission_enabled = false
	mi.material_override = m
	node.add_child(mi)
	var s := {"node": node, "done": done, "cool": false, "free": free, "base_y": pos.y}
	stars.append(s)
	return s

func _spawn_player() -> void:
	player = PlayerScript.new()
	world.add_child(player)
	var vis := Node3D.new()
	player.add_child(vis)
	player.visual = vis
	var model := _fit_model("res://assets/models/ken_rigged.glb", KEN_H)
	vis.add_child(model)
	player.anim = _find_anim(model)
	checkpoint = D["spawn"]
	checkpoint_yaw = D["spawn_yaw"]
	player.global_position = checkpoint
	player.set_facing(checkpoint_yaw)
	cam_yaw = checkpoint_yaw + PI
	player.jumped.connect(func(k):
		sfx("triple" if k == "triple" else "jump")
		if run_mode:
			_squash())
	player.landed.connect(func(k):
		if run_mode:
			_run_landed(k)
		elif k != "fall":
			sfx("land"))
	player.style.connect(_on_style)
	shadow = MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.6
	cyl.bottom_radius = 0.6
	cyl.height = 0.02
	shadow.mesh = cyl
	var sm := StandardMaterial3D.new()
	sm.albedo_color = Color(0, 0, 0, 0.45)
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	shadow.material_override = sm
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	world.add_child(shadow)

func _fit_model(path: String, height: float) -> Node3D:
	var holder := Node3D.new()
	if not ResourceLoader.exists(path):
		var mi := MeshInstance3D.new()
		var cap := CapsuleMesh.new()
		cap.radius = 0.45
		cap.height = height
		mi.mesh = cap
		mi.position.y = height / 2.0
		holder.add_child(mi)
		return holder
	var inst: Node3D = (load(path) as PackedScene).instantiate()
	var boxes: Array = []
	_collect_aabb(inst, Transform3D.IDENTITY, boxes)
	if boxes.is_empty():
		holder.add_child(inst)
		return holder
	var bb: AABB = boxes[0]
	for i in range(1, boxes.size()):
		bb = bb.merge(boxes[i])
	var s := height / maxf(0.01, bb.size.y)
	inst.position = Vector3(-(bb.position.x + bb.size.x / 2.0), -bb.position.y, -(bb.position.z + bb.size.z / 2.0))
	holder.add_child(inst)
	holder.scale = Vector3.ONE * s
	return holder

func _collect_aabb(n: Node, xf: Transform3D, out: Array) -> void:
	var t := xf
	if n is Node3D:
		t = xf * (n as Node3D).transform
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
		out.append(t * (n as MeshInstance3D).mesh.get_aabb())
	for c in n.get_children():
		_collect_aabb(c, t, out)

func _find_anim(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var a := _find_anim(c)
		if a != null:
			return a
	return null

# ---------------------------------------------------------------- 每格
func _physics_process(dt: float) -> void:
	if player == null or state == "menu":
		return
	if run_mode and args.has("runbot"):
		_runbot(dt)
	_read_input()
	if state == "play":
		_move_movers(dt)
		_check_stars()
		_check_flags()
		_check_enemies()
		if run_mode:
			_run_tick(dt)
		if player.global_position.y < DEATH_Y:
			if run_mode:
				_bubble_rescue()
			else:
				_respawn()

func _process(dt: float) -> void:
	if run_mode and state == "play" and play_t0 > 0 and Time.get_ticks_msec() - play_t0 < 4000:
		max_dt_ms = maxf(max_dt_ms, dt * 1000.0)
	_update_fps_cap()
	_tick_rest_timer()
	if player == null:
		return
	var t := Time.get_ticks_msec() / 1000.0
	for s in stars:
		var n: Node3D = s["node"]
		if is_instance_valid(n):
			n.rotation.y = t * 2.0
			n.position.y = float(s["base_y"]) + sin(t * 2.5) * 0.15
	_update_shadow()
	_update_cam(dt)

func _read_input() -> void:
	if run_mode and state == "play" and not test_drive:
		player.move = Vector3(run_dir, 0, 0)
		player.jump_held = Input.is_action_pressed("jump") or tap_held or auto_hold > 0.0
		if Input.is_action_just_pressed("jump") or tap_pressed:
			player.press_jump()
		tap_pressed = false
		return
	if state != "play" or test_drive:
		if not test_drive:
			player.move = Vector3.ZERO
			player.jump_held = false
		return
	var iv := Vector2(Input.get_axis("left", "right"), Input.get_axis("up", "down"))
	if touch.visible and touch.stick != Vector2.ZERO:
		iv = touch.stick
	if iv.length() > 1.0:
		iv = iv.normalized()
	var fv := Vector3(-sin(cam_yaw), 0, -cos(cam_yaw))
	var rv := Vector3(cos(cam_yaw), 0, -sin(cam_yaw))
	player.move = rv * iv.x + fv * (-iv.y)
	player.jump_held = Input.is_action_pressed("jump") or (touch.visible and touch.jump_held)
	if Input.is_action_just_pressed("jump") or touch.take_jump():
		player.press_jump()
	if Input.is_action_just_pressed("long") or touch.take_long():
		player.press_long()

## 自動測試時由 qa.gd 直接操作 player.move／press_jump，這時不讀鍵盤
var test_drive := false

func _update_cam(dt: float) -> void:
	if cam == null:
		return
	if args.has("overview"):
		# 截圖用：從斜上方看整個關卡
		var bb := AABB(D["boxes"][0][0], Vector3.ZERO)
		for b in D["boxes"]:
			bb = bb.expand(b[0])
		var ctr := bb.get_center()
		var r := maxf(bb.size.x, bb.size.z)
		cam.global_position = ctr + Vector3(r * 0.55, r * 0.75 + 15.0, r * 0.55 + 10.0)
		cam.look_at(ctr, Vector3.UP)
		return
	if run_mode and boss == null:
		# 側面鏡頭：Ken 在畫面左邊三分之一，前面留空間看路；高度慢慢跟
		var rp := player.global_position
		var fy2: float = rp.y + 1.4 if cam_snap else lerpf(cam_focus.y, rp.y + 1.4, minf(1.0, dt * 3.0))
		cam_lead = lerpf(cam_lead, run_dir, minf(1.0, dt * 2.5))
		cam_focus = Vector3(rp.x + 4.5 * cam_lead, fy2, 0.0)
		cam.fov = 50
		if cam_zoom > 0.0:   # 過關慶祝：鏡頭拉近 Ken
			cam_focus = cam_focus.lerp(Vector3(rp.x + 0.5, rp.y + 1.6, 0.0), cam_zoom)
		cam.global_position = cam_focus + Vector3(0, lerpf(1.8, 2.6, cam_zoom), lerpf(13.0, 6.5, cam_zoom))   # 2026-11-10 拉近：Ken 大一點，看得清楚跳躍動作
		cam.look_at(cam_focus, Vector3.UP)
		cam_snap = false
		return
	var p := player.global_position
	var spd := clampf(player.fwd / PlayerScript.RUN_MAX, 0.0, 1.0)
	var behind := player.facing + PI
	if state == "play" and player.move.length() > 0.1 and absf(angle_difference(cam_yaw, behind)) < deg_to_rad(110):
		cam_yaw = rotate_toward(cam_yaw, behind, dt * 1.6 * spd)
	var k := 8.0 if player.is_on_floor() else 2.5
	var fy: float = p.y + 1.6 if cam_snap else lerpf(cam_focus.y, p.y + 1.6, minf(1.0, dt * k))
	cam_focus = Vector3(p.x, fy, p.z)
	var dist := 9.0
	var want := cam_focus + Vector3(sin(cam_yaw) * dist, 3.6, cos(cam_yaw) * dist)
	var q := PhysicsRayQueryParameters3D.create(cam_focus, want)
	q.exclude = [player.get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	if not hit.is_empty():
		want = hit["position"] + (cam_focus - hit["position"]).normalized() * 0.4
	cam.global_position = want if cam_snap else cam.global_position.lerp(want, minf(1.0, dt * 10.0))
	cam_snap = false
	cam.look_at(cam_focus, Vector3.UP)

func _update_shadow() -> void:
	var from := player.global_position + Vector3(0, 0.5, 0)
	var q := PhysicsRayQueryParameters3D.create(from, from + Vector3(0, -40, 0))
	q.exclude = [player.get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	shadow.visible = not hit.is_empty()
	if shadow.visible:
		shadow.global_position = hit["position"] + Vector3(0, 0.03, 0)
		var h := player.global_position.y - float(hit["position"].y)
		var s := clampf(1.0 - h / 14.0, 0.35, 1.0)
		shadow.scale = Vector3(s, 1, s)

# ---------------------------------------------------------------- 星星與題目
func _check_stars() -> void:
	if run_mode and boss == null:
		# 自動跑：Ken 的 x 跑過星星就出題（不管跳多高），所以星星不會漏掉
		for s in stars:
			if s["cool"] and not sb.is_empty() and absf(player.global_position.x - (s["node"] as Node3D).global_position.x) > 3.0:
				s["cool"] = false
			if s["done"] or s["cool"]:
				continue
			var sx: float = (s["node"] as Node3D).global_position.x
			if not sb.is_empty():
				# 魔王關：Ken 來回跑，碰到星星（前後 1 m 內、高度差 3 m 內）就出題
				if absf(player.global_position.x - sx) < 1.0 and absf(player.global_position.y + 1.0 - (s["node"] as Node3D).global_position.y) < 3.0:
					_touch_star(s)
					return
				continue
			if player.global_position.x >= sx - 0.6:
				_touch_star(s)
				return
		return
	var pc := player.global_position + Vector3(0, 1.1, 0)
	for s in stars:
		if s["done"]:
			continue
		var d := pc.distance_to((s["node"] as Node3D).global_position)
		if s["cool"]:
			if d > 2.8:
				s["cool"] = false
			continue
		if d < 1.6:
			_touch_star(s)
			return

func _touch_star(s: Dictionary) -> void:
	if s["free"]:
		_collect_star(s)
		if boss:
			boss.stun()
			show_toast("魔王又暈了！快跳到它頭上！\nJump on its head!", 2.0)
		return
	if quiz.remaining(String(L["id"])) == 0:
		_collect_star(s)
		return
	active_star = s
	state = "quiz"
	_freeze(true)
	sfx("question")
	quiz.start(String(L["id"]), "第 %d 關 %s" % [L["n"], L["zh"]])

func _on_turn_done(_is_last: bool) -> void:
	if active_star == null:
		return
	var s: Dictionary = active_star
	active_star = null
	_collect_star(s)
	state = "play"
	_freeze(false)
	_update_hud()
	if not sb.is_empty():
		_sb_after_answer()
	elif boss:
		boss.stun()
		show_toast("答對了！魔王暈倒了！\n快跳到它頭上！ Jump on its head!", 2.4)
	elif quiz.remaining(String(L["id"])) == 0 and run_mode:
		# 自動跑：題目答完還要跑到終點門才過關（不然後面的史萊姆、寶箱、終點門都看不到）
		show_toast("題目都答完了！衝向終點！
Run to the goal!", 1.8)
	elif quiz.remaining(String(L["id"])) == 0:
		_level_clear()
	else:
		show_toast("★ %d / %d" % [level_done(String(L["id"])), level_total(String(L["id"]))], 1.4)

func _on_quiz_closed() -> void:
	if active_star != null:
		active_star["cool"] = true
	active_star = null
	if state == "quiz":
		state = "play"
		_freeze(false)

func _collect_star(s: Dictionary) -> void:
	s["done"] = true
	sfx("star")
	var n: Node3D = s["node"]
	if boss or s["free"]:
		stars.erase(s)
		var tw := create_tween()
		tw.tween_property(n, "scale", Vector3(0.01, 0.01, 0.01), 0.3)
		tw.tween_callback(n.queue_free)
	else:
		var mi: MeshInstance3D = n.get_child(0)
		var m: StandardMaterial3D = mi.material_override
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color.a = 0.25
		m.emission_enabled = false
		var tw2 := create_tween()
		tw2.tween_property(n, "scale", Vector3(1.8, 1.8, 1.8), 0.15)
		tw2.tween_property(n, "scale", Vector3.ONE, 0.2)

func _freeze(on: bool) -> void:
	player.frozen = on
	for sl in slimes:
		sl.frozen = on
	if boss:
		boss.frozen = on
	touch.visible = not on and is_mobile and state == "play" and not run_mode
	touch.reset()
	menu_btn.disabled = on
	_duck_music(on and state == "quiz")

func _update_hud() -> void:
	var id: String = L["id"]
	hud.text = "第 %d 關 %s　★ %d / %d" % [L["n"], L["zh"], level_done(id), level_total(id)]
	if run_mode:
		hud.text += "　金幣 %d　分數 %d" % [coin_count, score]
	if not sb.is_empty():
		var alive: bool = not sb["defeated"]
		boss_bar.visible = alive
		boss_hp.visible = alive
		boss_bar.text = "%s %s　HP %d / %d" % [sb["zh"], sb["en"], sb["hp"], sb["max"]]
		boss_hp.max_value = sb["max"]
		boss_hp.value = sb["hp"]
	if boss:
		boss_bar.visible = true
		boss_bar.text = "%s %s　HP %d / %d" % [D["boss"]["zh"], D["boss"]["en"], boss.hp, boss.max_hp]
		boss_hp.visible = true
		boss_hp.max_value = boss.max_hp
		boss_hp.value = boss.hp

# ---------------------------------------------------------------- 魔王
func _spawn_boss_star(free: bool) -> void:
	if boss == null or state == "clear" or world == null:
		return
	var spots: Array = D["star_spots"]
	var pos: Vector3 = spots[star_spot_i % spots.size()]
	for i in spots.size():
		var cand: Vector3 = spots[(star_spot_i + i) % spots.size()]
		if Vector2(cand.x - boss.global_position.x, cand.z - boss.global_position.z).length() > 6.0:
			pos = cand
			star_spot_i = (star_spot_i + i + 3) % spots.size()
			break
	_add_star(pos, false, free)

func _on_boss_recovered() -> void:
	show_toast("魔王醒來了！撿金色星星再讓它暈倒", 2.2)
	for s in stars:
		if s["free"]:
			return
	_spawn_boss_star(true)

func _check_enemies() -> void:
	var pp := player.global_position
	for sl in slimes:
		if not sl.alive:
			continue
		var d: Vector3 = pp - sl.global_position
		var hd := Vector2(d.x, d.z).length()
		if hd < SlimeScript.R + 0.45 and d.y > -1.5 and d.y < SlimeScript.H + 0.2:
			if player.velocity.y < -0.5 and d.y > SlimeScript.H * 0.4:
				sl.stomp()
				player.bounce()
				if run_mode:
					_run_stomp()
				else:
					sfx("stomp")
			elif run_mode:
				# 自動跑：從旁邊碰到也不會被彈開，直接把史萊姆踩扁、Ken 彈起來繼續跑（不扣分）
				sl.stomp()
				player.bounce()
				_run_stomp()
			elif player.invuln <= 0.0:
				player.knock(sl.global_position)
				sfx("knock")
	if boss == null or not boss.visible or boss.state == "dead":
		return
	var bd: Vector3 = pp - boss.global_position
	var bh := Vector2(bd.x, bd.z).length()
	var top: float = BossScript.H * boss.body.scale.y
	if bh < BossScript.R + 0.6 and bd.y < top + 0.3 and bd.y > -1.5:
		if player.velocity.y < -0.5 and bd.y > top - 1.0:
			player.bounce()
			if boss.is_stunned():
				sfx("stomp")
				var left: int = boss.hurt()
				_update_hud()
				if left == 0:
					sfx("defeat")
					show_toast("打敗魔王了！ You did it!", 2.5)
					get_tree().create_timer(0.3 if test_mode else 1.8).timeout.connect(_level_clear)
				else:
					show_toast("Nice! 再 %d 下！" % left, 1.6)
					get_tree().create_timer(0.3 if test_mode else 1.4).timeout.connect(func(): _spawn_boss_star(false))
		elif player.invuln <= 0.0:
			player.knock(boss.global_position, 4.0 if boss.is_stunned() else 11.0)
			sfx("knock")
	if player.is_on_floor() and player.invuln <= 0.0:
		for w in boss.waves:
			var wc: Vector3 = w["center"]
			var wd := Vector2(pp.x - wc.x, pp.z - wc.z).length()
			if absf(wd - float(w["r"])) < 0.8 and pp.y < boss.home.y + 1.0:
				player.knock(wc, 9.0)
				sfx("knock")
				break

# ---------------------------------------------------------------- 地標、招牌、終點門、金幣、華麗動作（2026-11-10）
## 自動跑關卡的額外布置：地點建築（網站下載）、起點大招牌、終點門、金幣
func _build_run_extras() -> void:
	var place: Array = D.get("place", [String(L["zh"]), String(L["en"])])
	_big_sign(Vector3(16, 0, -4.5), place[0], place[1])
	var gate := String(D.get("gate", ""))
	if gate != "":
		_goal_gate(gate, float(D["goal"]))
	for c in D.get("coins", []):
		_add_coin(c)
	score_max = D.get("coins", []).size() * 10 + D.get("slimes", []).size() / 3 * 600
	if D.has("side_boss"):
		score_max += level_total(String(L["id"])) * 300
	for f in D.get("fruits", []):
		_add_fruit(f[0], String(f[1]))
		score_max += int(FRUIT_PTS[String(f[1])])
	for b in D.get("qboxes", []):
		_add_qbox(b[0], String(b[1]))
		score_max += 50 if String(b[1]) == "coins" else int(FRUIT_PTS[String(b[1])])
	if D.has("side_boss"):
		_sb_build()
	for sn in D.get("snails", []):
		if sn is Vector3:
			_add_snail(sn, "purple")
		else:
			_add_snail(sn[0], String(sn[1]))
	_update_hud()

## 進自動跑關卡（2026-11-11 教師 iPad：進關會卡一下）：
## 先蓋「載入中…」畫面＋進度條，把地點建築下載、解析好，並在畫面後面先把粒子、彈出字
## 各畫一次（第一次畫才會編譯著色器，iPad 會停頓），全部好了再 3、2、1、GO! 倒數才開始跑。
var intro_t0 := 0
var play_t0 := 0
var max_dt_ms := 0.0
func _run_intro(n: int) -> void:
	intro_t0 = Time.get_ticks_msec()
	var id := String(L["id"])
	var lay := CanvasLayer.new()
	lay.layer = 30
	add_child(lay)
	var bg := ColorRect.new()
	bg.color = Color(0.1, 0.16, 0.3)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	lay.add_child(bg)
	var title := _label("第 %d 關 %s\n%s\n\n載入中… Loading" % [n, L["zh"], L["en"]], 44)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	title.grow_horizontal = Control.GROW_DIRECTION_BOTH
	title.grow_vertical = Control.GROW_DIRECTION_BOTH
	bg.add_child(title)
	var bar := ProgressBar.new()
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(520, 28)
	bar.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	bar.grow_horizontal = Control.GROW_DIRECTION_BOTH
	bar.position.y -= 140
	bar.value = 15
	bg.add_child(bar)
	await get_tree().process_frame
	if not _intro_ok(id, lay):
		return
	_build_run_extras()
	bar.value = 35
	await get_tree().process_frame
	var lm: Dictionary = D.get("landmark", {})
	if not lm.is_empty():
		await _load_landmark(id, lm)
	if not _intro_ok(id, lay):
		return
	bar.value = 70
	# 在 Ken 旁邊先畫一次特效（被載入畫面蓋住，學生看不到）
	_burst(player.global_position + Vector3(2, 1, 0), Color(1.0, 0.9, 0.3), 4)
	_pop_text("Nice!", Color(0.5, 1.0, 0.5), true)
	for i in 6:
		await get_tree().process_frame
		bar.value = 70 + i * 5
	if not _intro_ok(id, lay):
		return
	bar.value = 100
	print("RUNBOT load_ms=%d" % (Time.get_ticks_msec() - intro_t0))
	bg.queue_free()
	var big := _label("", 150)
	big.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	big.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	big.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	big.add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
	big.add_theme_color_override("font_outline_color", Color(0.08, 0.08, 0.25))
	big.add_theme_constant_override("outline_size", 26)
	big.mouse_filter = Control.MOUSE_FILTER_IGNORE
	lay.add_child(big)
	for w in ["3", "2", "1", "GO!"]:
		big.text = w
		big.pivot_offset = big.size / 2.0
		big.scale = Vector2.ONE * 1.6
		var tw := create_tween()
		tw.tween_property(big, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		sfx_pitch("coin", 1.5 if w == "GO!" else 1.0)
		await get_tree().create_timer(0.2 if args.has("runbot") else 0.6).timeout
		if not _intro_ok(id, lay):
			return
	lay.queue_free()
	state = "play"
	play_t0 = Time.get_ticks_msec()
	if args.has("atx"):   # 截圖用：直接放到 x
		player.global_position = Vector3(float(args["atx"]), float(player.global_position.y) + 0.5, 0)
		cam_snap = true
	if args.has("goalview"):   # 截圖用：直接放到終點前面（看終點門）
		player.global_position = Vector3(float(D["goal"]) - float(args["goalview"]), float(player.global_position.y) + 0.5, 0)
		cam_snap = true
	max_dt_ms = 0.0
	if not sb.is_empty() and sb["defeated"]:
		show_toast("魔王已經打倒了！跑過彩虹門！
Run through the rainbow!", 2.4)
	elif not sb.is_empty():
		sfx("boss")
		show_toast("魔王出現！ %s %s" % [sb["zh"], sb["en"]], 2.4)
	elif int(L["n"]) == 1:   # 只有教學關提示；其他關這行字會擋住地名招牌
		show_toast("點一下螢幕就跳 Tap to jump!", 2.0)

func _intro_ok(id: String, lay: CanvasLayer) -> bool:
	if state == "intro" and world != null and String(L.get("id", "")) == id:
		return true
	lay.queue_free()
	return false

## 起點的大地名招牌（面向鏡頭，不跟著轉）
func _big_sign(pos: Vector3, zh: String, en: String) -> void:
	var root := Node3D.new()
	root.position = pos
	world.add_child(root)
	for sx in [-3.8, 3.8]:
		var post := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.15
		cm.bottom_radius = 0.15
		cm.height = 3.0
		post.mesh = cm
		post.position = Vector3(sx, 1.5, 0)
		root.add_child(post)
	var board := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(9.0, 2.6, 0.25)
	board.mesh = bm
	board.position = Vector3(0, 3.6, 0)
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.16, 0.34, 0.66)
	board.material_override = m
	root.add_child(board)
	var t := Label3D.new()
	t.text = "%s\n%s" % [zh, en]
	t.font = font_bold
	t.font_size = 96
	t.pixel_size = 0.0085
	t.outline_size = 16
	t.outline_modulate = Color(0.05, 0.1, 0.25)
	t.position = Vector3(0, 3.6, 0.2)
	root.add_child(t)

## 終點門。station＝剪票口：一排剪票機＋上方「出口 EXIT」看板；其他關先用彩色拱門
func _goal_gate(style: String, x: float) -> void:
	var root := Node3D.new()
	root.position = Vector3(x, 0, 0)
	world.add_child(root)
	var mat := func(c: Color) -> StandardMaterial3D:
		var mm := StandardMaterial3D.new()
		mm.albedo_color = c
		mm.roughness = 0.5
		return mm
	if style == "ticket":
		for z in [-2.6, -1.3, 1.3, 2.6]:
			var body := MeshInstance3D.new()
			var b := BoxMesh.new()
			b.size = Vector3(1.6, 1.1, 0.5)
			body.mesh = b
			body.material_override = mat.call(Color(0.82, 0.84, 0.88))
			body.position = Vector3(0, 0.55, z)
			root.add_child(body)
			var flap := MeshInstance3D.new()
			var fb := BoxMesh.new()
			fb.size = Vector3(0.12, 0.5, 0.5)
			flap.mesh = fb
			flap.material_override = mat.call(Color(1.0, 0.82, 0.2))
			flap.position = Vector3(0.6, 0.9, z + (0.45 if z < 0 else -0.45))
			root.add_child(flap)
		var beam := MeshInstance3D.new()
		var bb := BoxMesh.new()
		bb.size = Vector3(0.6, 1.2, 7.0)
		beam.mesh = bb
		beam.material_override = mat.call(Color(0.12, 0.3, 0.62))
		beam.position = Vector3(0, 4.6, 0)
		root.add_child(beam)
		for z in [-3.3, 3.3]:
			var pole := MeshInstance3D.new()
			var pb := BoxMesh.new()
			pb.size = Vector3(0.4, 4.6, 0.4)
			pole.mesh = pb
			pole.material_override = mat.call(Color(0.7, 0.72, 0.78))
			pole.position = Vector3(0, 2.3, z)
			root.add_child(pole)
		# 看板放在剪票口後面、面向鏡頭（側面鏡頭看得到）
		var board := MeshInstance3D.new()
		var bd := BoxMesh.new()
		bd.size = Vector3(6.5, 1.8, 0.2)
		board.mesh = bd
		board.material_override = mat.call(Color(0.12, 0.3, 0.62))
		board.position = Vector3(0, 6.6, -3.3)
		root.add_child(board)
		var sign := Label3D.new()
		sign.text = "剪票口 出口
EXIT  GOAL!"
		sign.font = font_bold
		sign.font_size = 72
		sign.pixel_size = 0.009
		sign.outline_size = 14
		sign.outline_modulate = Color(0.05, 0.1, 0.25)
		sign.position = Vector3(0, 6.6, -3.15)
		root.add_child(sign)
	else:
		# 側面鏡頭：門轉 90 度正對鏡頭（像 2D 遊戲的拱門），放在 Ken 跑的線後面一點，Ken 從門前跑過
		root.rotation.y = PI / 2.0
		root.position.z = -1.4
		_gate_custom(root, style)

## 各關專屬終點門（2026-11-07 RDQ ⑤：全部用程式方塊組成，不花 Tripo 點數）。
## 共同骨架：左右兩根柱子（z = ±3.3，Ken 從中間跑過）＋上面橫樑＋後面面向鏡頭的大看板。
func _gbox(root: Node3D, size: Vector3, pos: Vector3, col: Color, rough := 0.6) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	mi.mesh = b
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	if col.a < 0.99:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mi.material_override = m
	mi.position = pos
	root.add_child(mi)
	return mi

func _gmesh(root: Node3D, mesh: Mesh, pos: Vector3, col: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.4
	if col.a < 0.99:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mi.material_override = m
	mi.position = pos
	root.add_child(mi)
	return mi

func _gate_board(root: Node3D, text: String, board_col: Color, y := 5.7) -> void:
	_gbox(root, Vector3(0.2, 1.8, 6.5), Vector3(0.5, y, 0), board_col)
	var sign := Label3D.new()
	sign.rotation.y = -PI / 2.0
	sign.text = text
	sign.font = font_bold
	sign.font_size = 72
	sign.pixel_size = 0.009
	sign.outline_size = 14
	sign.outline_modulate = board_col.darkened(0.6)
	sign.position = Vector3(0.35, y, 0)
	root.add_child(sign)

func _gate_custom(root: Node3D, style: String) -> void:
	match style:
		"inn":
			# 二八水驛站：木牌坊＋紅色匾額＋小屋頂
			var wood := Color(0.55, 0.34, 0.18)
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(0.6, 4.8, 0.6), Vector3(0, 2.4, z), wood)
			_gbox(root, Vector3(0.7, 0.5, 8.4), Vector3(0, 4.1, 0), wood)
			_gbox(root, Vector3(1.6, 0.4, 9.6), Vector3(0, 5.0, 0), Color(0.3, 0.3, 0.32))
			_gbox(root, Vector3(0.3, 0.8, 3.0), Vector3(0.4, 4.55, 0), Color(0.75, 0.15, 0.12))
			for z in [-2.4, 2.4]:
				var lan := SphereMesh.new()
				lan.radius = 0.35
				lan.height = 0.8
				_gmesh(root, lan, Vector3(0.3, 3.7, z), Color(1.0, 0.35, 0.2))
			_gate_board(root, "二八水驛站\nGOAL!", Color(0.75, 0.15, 0.12), 6.2)
		"store":
			# 便利商店：玻璃自動門（往兩邊打開）＋白框＋藍色條紋
			var white := Color(0.95, 0.96, 0.98)
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(0.8, 4.6, 0.5), Vector3(0, 2.3, z), white)
			_gbox(root, Vector3(0.9, 1.0, 7.1), Vector3(0, 4.9, 0), white)
			_gbox(root, Vector3(0.95, 0.3, 7.1), Vector3(0, 4.7, 0), Color(0.2, 0.5, 0.95))
			_gbox(root, Vector3(0.95, 0.2, 7.1), Vector3(0, 5.15, 0), Color(0.3, 0.8, 0.5))
			for z in [-2.4, 2.4]:
				_gbox(root, Vector3(0.12, 4.2, 1.6), Vector3(0.2, 2.1, z), Color(0.7, 0.88, 1.0, 0.45), 0.1)
			_gate_board(root, "便利商店 自動門\nGOAL!", Color(0.2, 0.5, 0.95))
		"school":
			# 二水國小：紅磚門柱＋鐵拱門＋三角旗
			var brick := Color(0.72, 0.32, 0.24)
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(1.2, 3.6, 1.2), Vector3(0, 1.8, z), brick)
				_gbox(root, Vector3(1.4, 0.3, 1.4), Vector3(0, 3.75, z), Color(0.85, 0.85, 0.8))
			for i in 9:
				var k := float(i) / 8.0
				var z := lerpf(-3.3, 3.3, k)
				_gbox(root, Vector3(0.25, 0.25, 0.9), Vector3(0, 3.9 + sin(PI * k) * 0.7, z), Color(0.2, 0.28, 0.4))
			var cols := [Color(1, 0.3, 0.3), Color(1, 0.85, 0.2), Color(0.3, 0.75, 1), Color(0.4, 0.85, 0.4)]
			for i in 7:
				var flag := PrismMesh.new()
				flag.size = Vector3(0.1, 0.6, 0.5)
				var f := _gmesh(root, flag, Vector3(0, 3.4 + sin(PI * (i + 1) / 8.0) * 0.6, lerpf(-2.6, 2.6, i / 6.0)), cols[i % 4])
				f.rotation_degrees = Vector3(180, 0, 0)
			_gate_board(root, "二水國小 校門\nGOAL!", Color(0.15, 0.45, 0.25), 6.0)
		"tea":
			# 飲料店：兩杯大珍奶當柱子（透明杯＋奶茶＋珍珠＋吸管）＋橫幅
			for z in [-3.3, 3.3]:
				var cup := CylinderMesh.new()
				cup.top_radius = 0.85
				cup.bottom_radius = 0.65
				cup.height = 4.0
				_gmesh(root, cup, Vector3(0, 2.0, z), Color(0.9, 0.95, 1.0, 0.35))
				var tea := CylinderMesh.new()
				tea.top_radius = 0.78
				tea.bottom_radius = 0.6
				tea.height = 3.3
				_gmesh(root, tea, Vector3(0, 1.7, z), Color(0.82, 0.62, 0.42))
				for i in 8:
					var pearl := SphereMesh.new()
					pearl.radius = 0.18
					pearl.height = 0.36
					_gmesh(root, pearl, Vector3(cos(i * 0.8) * 0.4, 0.3 + (i % 2) * 0.3, z + sin(i * 0.8) * 0.4), Color(0.18, 0.1, 0.06))
				var lid := CylinderMesh.new()
				lid.top_radius = 0.9
				lid.bottom_radius = 0.9
				lid.height = 0.15
				_gmesh(root, lid, Vector3(0, 4.05, z), Color(1, 1, 1, 0.6))
				var straw := CylinderMesh.new()
				straw.top_radius = 0.12
				straw.bottom_radius = 0.12
				straw.height = 2.0
				var st := _gmesh(root, straw, Vector3(0, 4.8, z + 0.2), Color(0.95, 0.35, 0.5))
				st.rotation_degrees = Vector3(12, 0, 0)
			_gbox(root, Vector3(0.4, 0.8, 6.0), Vector3(0, 4.5, 0), Color(0.98, 0.85, 0.55))
			_gate_board(root, "飲料店\nGOAL!", Color(0.6, 0.38, 0.22), 5.8)
		"market":
			# 二水超市：攤位紅白遮雨棚＋水果箱
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(0.3, 4.6, 0.3), Vector3(-1.2, 2.3, z), Color(0.5, 0.5, 0.55))
				_gbox(root, Vector3(0.3, 4.0, 0.3), Vector3(1.2, 2.0, z), Color(0.5, 0.5, 0.55))
			for i in 8:
				var stripe := _gbox(root, Vector3(3.0, 0.15, 0.85), Vector3(0, 4.3, -2.98 + i * 0.85), Color(0.9, 0.2, 0.2) if i % 2 == 0 else Color(1, 1, 1))
				stripe.rotation_degrees = Vector3(0, 0, -11)
			var fruit := [Color(1.0, 0.55, 0.1), Color(0.9, 0.15, 0.15), Color(0.95, 0.85, 0.2), Color(0.45, 0.8, 0.3)]
			for z in [-4.5, 4.5]:
				_gbox(root, Vector3(1.6, 0.8, 1.2), Vector3(0, 0.4, z), Color(0.7, 0.5, 0.3))
				for i in 6:
					var ball := SphereMesh.new()
					ball.radius = 0.25
					ball.height = 0.5
					_gmesh(root, ball, Vector3(-0.5 + (i % 3) * 0.5, 0.95, z - 0.25 + (i / 3) * 0.5), fruit[(i + int(z)) % 4])
			_gate_board(root, "二水超市\nGOAL!", Color(0.85, 0.2, 0.2))
		"post":
			# 二水郵局：左綠右紅兩個大郵筒當柱子（有投信口）＋綠色橫樑
			for z in [-3.3, 3.3]:
				var col := Color(0.1, 0.55, 0.3) if z < 0 else Color(0.85, 0.15, 0.15)
				_gbox(root, Vector3(1.4, 3.2, 1.4), Vector3(0, 1.6, z), col)
				var cap := CylinderMesh.new()
				cap.top_radius = 0.72
				cap.bottom_radius = 0.72
				cap.height = 1.4
				var cm := _gmesh(root, cap, Vector3(0, 3.2, z), col)
				cm.rotation_degrees = Vector3(90, 0, 0)
				_gbox(root, Vector3(0.2, 0.18, 0.9), Vector3(-0.72, 2.6, z), Color(0.1, 0.1, 0.1))
			_gbox(root, Vector3(0.6, 0.7, 6.0), Vector3(0, 4.3, 0), Color(0.1, 0.55, 0.3))
			_gate_board(root, "二水郵局" + "%s" % "\n" + "GOAL!", Color(0.1, 0.55, 0.3), 5.6)
		"books":
			# 書店：兩本站著的大書當柱子＋上面一本打開的書
			var covers := [Color(0.2, 0.45, 0.9), Color(0.95, 0.55, 0.15)]
			for i in 2:
				var z: float = -3.3 if i == 0 else 3.3
				_gbox(root, Vector3(1.6, 4.4, 0.7), Vector3(0, 2.2, z), covers[i])
				_gbox(root, Vector3(1.4, 4.2, 0.72), Vector3(0.12, 2.2, z), Color(0.98, 0.96, 0.9))
			for k in [-1, 1]:
				var pg := _gbox(root, Vector3(0.25, 0.25, 3.6), Vector3(0, 4.9, k * 1.7), Color(0.98, 0.96, 0.9))
				pg.rotation_degrees = Vector3(k * -14, 0, 0)
				var cv := _gbox(root, Vector3(0.3, 0.12, 3.7), Vector3(0.05, 4.75, k * 1.7), Color(0.75, 0.2, 0.25))
				cv.rotation_degrees = Vector3(k * -14, 0, 0)
			_gate_board(root, "書店" + "%s" % "\n" + "GOAL!", Color(0.75, 0.2, 0.25), 6.3)
		"checkout":
			# 大賣場：結帳櫃台＋收銀機＋購物推車
			_gbox(root, Vector3(1.4, 1.1, 2.2), Vector3(0, 0.55, -3.2), Color(0.85, 0.85, 0.88))
			_gbox(root, Vector3(1.2, 0.08, 2.0), Vector3(0, 1.12, -3.2), Color(0.15, 0.15, 0.18))
			_gbox(root, Vector3(0.8, 0.6, 0.7), Vector3(0, 1.45, -3.9), Color(0.25, 0.25, 0.3))
			_gbox(root, Vector3(0.1, 0.4, 0.6), Vector3(-0.35, 1.8, -3.9), Color(0.3, 0.9, 0.5))
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(0.3, 4.6, 0.3), Vector3(0.4, 2.3, z), Color(0.6, 0.6, 0.65))
			_gbox(root, Vector3(0.4, 0.6, 7.0), Vector3(0.4, 4.4, 0), Color(0.95, 0.75, 0.1))
			_gbox(root, Vector3(1.0, 0.7, 1.4), Vector3(0, 0.75, 3.6), Color(0.7, 0.75, 0.8, 0.8))
			for zz in [3.1, 4.1]:
				var wh := SphereMesh.new()
				wh.radius = 0.15
				wh.height = 0.3
				_gmesh(root, wh, Vector3(0, 0.15, zz), Color(0.1, 0.1, 0.1))
			_gate_board(root, "收銀台" + "%s" % "\n" + "GOAL!", Color(0.95, 0.6, 0.1), 5.6)
		"shelf":
			# 圖書館：兩座書架當柱子（一層層彩色書）＋木頭橫樑
			var wood := Color(0.55, 0.36, 0.2)
			var bcols := [Color(0.9, 0.3, 0.3), Color(0.3, 0.6, 0.95), Color(0.95, 0.8, 0.25), Color(0.35, 0.75, 0.4), Color(0.7, 0.45, 0.85)]
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(0.9, 4.6, 1.8), Vector3(0.2, 2.3, z), wood)
				for row in 4:
					for k in 5:
						_gbox(root, Vector3(0.2, 0.75, 0.28), Vector3(-0.3, 0.6 + row * 1.05, z - 0.68 + k * 0.34), bcols[(row + k) % 5])
			_gbox(root, Vector3(0.9, 0.6, 8.4), Vector3(0.2, 4.9, 0), wood)
			_gate_board(root, "圖書館" + "%s" % "\n" + "GOAL!", Color(0.45, 0.28, 0.15), 6.1)
		"farm":
			# 八堡圳農情館：木柵欄拱門＋蔬菜（紅蘿蔔、高麗菜）＋稻草
			var wood2 := Color(0.62, 0.42, 0.24)
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(0.5, 4.4, 0.5), Vector3(0, 2.2, z), wood2)
			for y in [1.0, 2.0]:
				for z0 in [-4.8, 4.8]:
					_gbox(root, Vector3(0.15, 0.2, 2.8), Vector3(0, y, z0), wood2)
			_gbox(root, Vector3(0.5, 0.5, 7.4), Vector3(0, 4.1, 0), wood2)
			for k in 4:
				var car := CylinderMesh.new()
				car.top_radius = 0.16
				car.bottom_radius = 0.0
				car.height = 0.7
				var c := _gmesh(root, car, Vector3(-0.6, 0.35, -2.2 + k * 0.3), Color(1.0, 0.5, 0.1))
				c.rotation_degrees = Vector3(0, 0, 180)
				_sphere(root, 0.32, Vector3(-0.6, 0.3, 2.0 + k * 0.4), Color(0.55, 0.85, 0.4))
			_gbox(root, Vector3(1.0, 0.8, 1.2), Vector3(0.3, 0.4, -4.6), Color(0.95, 0.85, 0.45))
			_gate_board(root, "八堡圳農情館" + "%s" % "\n" + "GOAL!", Color(0.4, 0.6, 0.2), 5.4)
		_:
			for z in [-3.3, 3.3]:
				_gbox(root, Vector3(0.5, 4.6, 0.5), Vector3(0, 2.3, z), Color(0.9, 0.9, 0.9))
			_gbox(root, Vector3(0.6, 0.8, 7.2), Vector3(0, 4.8, 0), Color(0.2, 0.5, 0.9))
			_gate_board(root, "GOAL!", Color(0.2, 0.5, 0.9))

## 地點建築：網頁版從 jump3d/landmarks/<代號>.glb 下載（tools/make_landmarks.py 做的輕量版）；
## 電腦測試用 --landmarks=<資料夾>。載入失敗就略過（不影響玩）。
func _load_landmark(id: String, lm: Dictionary) -> void:
	var bytes := PackedByteArray()
	if OS.has_feature("web"):
		var href = JavaScriptBridge.eval("location.href", true)
		var base := String(href)
		base = base.substr(0, base.rfind("/") + 1)
		var req := HTTPRequest.new()
		add_child(req)
		if req.request(base + "landmarks/%s.glb" % id) != OK:
			req.queue_free()
			return
		var res: Array = await req.request_completed
		req.queue_free()
		if int(res[0]) != HTTPRequest.RESULT_SUCCESS or int(res[1]) != 200:
			return
		bytes = res[3]
	elif args.has("landmarks"):
		var path := String(args["landmarks"]).path_join("%s.glb" % id)
		if FileAccess.file_exists(path):
			bytes = FileAccess.get_file_as_bytes(path)
	if bytes.is_empty() or world == null or String(L.get("id", "")) != id:
		return
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_buffer(bytes, "", st) != OK:
		return
	var scene: Node3D = doc.generate_scene(st)
	if scene == null:
		return
	var boxes: Array = []
	_collect_aabb(scene, Transform3D.IDENTITY, boxes)
	if boxes.is_empty():
		return
	var bb: AABB = boxes[0]
	for i in range(1, boxes.size()):
		bb = bb.merge(boxes[i])
	var holder := Node3D.new()
	var k := float(lm.get("h", 12.0)) / maxf(0.01, bb.size.y)
	scene.position = Vector3(-(bb.position.x + bb.size.x / 2.0), -bb.position.y, -(bb.position.z + bb.size.z / 2.0))
	holder.add_child(scene)
	holder.scale = Vector3.ONE * k
	holder.position = Vector3(float(lm.get("x", 20.0)), float(lm.get("y", 0.0)), float(lm.get("z", -12.0)))
	holder.rotation.y = float(lm.get("yaw", 0.0))
	world.add_child(holder)

## 金幣：轉圈、吃到叮一聲（不算分）
func _add_coin(pos: Vector3) -> void:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.42
	cm.bottom_radius = 0.42
	cm.height = 0.1
	cm.radial_segments = 16
	mi.mesh = cm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.82, 0.15)
	m.metallic = 0.6
	m.roughness = 0.25
	m.emission_enabled = true
	m.emission = Color(1.0, 0.7, 0.1) * 0.35
	mi.material_override = m
	mi.position = pos
	mi.rotation.x = PI / 2.0
	world.add_child(mi)
	coins.append(mi)

## ---------- 加分道具與扣分障礙（2026-11-07）

func _mat_simple(c: Color, emis := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.45
	if emis > 0.0:
		m.emission_enabled = true
		m.emission = c * emis
	return m

func _sphere(parent: Node3D, r: float, pos: Vector3, c: Color, scl := Vector3.ONE, emis := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2.0
	sm.radial_segments = 16
	sm.rings = 8
	mi.mesh = sm
	mi.material_override = _mat_simple(c, emis)
	mi.position = pos
	mi.scale = scl
	parent.add_child(mi)
	return mi

## 二水水果（原創簡單造型）：芭樂（淺綠）、柚子（黃綠、梨形）、西瓜（深綠＋條紋）
func _fruit_node(kind: String) -> Node3D:
	var n := Node3D.new()
	match kind:
		"guava":
			_sphere(n, 0.42, Vector3.ZERO, Color(0.6, 0.85, 0.35), Vector3(1, 0.95, 1), 0.15)
			_sphere(n, 0.12, Vector3(0, 0.42, 0), Color(0.35, 0.25, 0.15))
		"pomelo":
			_sphere(n, 0.5, Vector3.ZERO, Color(0.9, 0.92, 0.35), Vector3(1, 1.15, 1), 0.15)
			_sphere(n, 0.28, Vector3(0, 0.55, 0), Color(0.88, 0.9, 0.35), Vector3.ONE, 0.15)
		"melon":
			_sphere(n, 0.62, Vector3.ZERO, Color(0.15, 0.5, 0.2), Vector3(1.2, 1, 1), 0.1)
			for k in 4:
				var st := _sphere(n, 0.63, Vector3.ZERO, Color(0.08, 0.3, 0.1), Vector3(1.21 * 0.18, 1.01, 1.01))
				st.rotation.y = k * PI / 4.0
	var leaf := MeshInstance3D.new()
	var pm := PrismMesh.new()
	pm.size = Vector3(0.35, 0.12, 0.2)
	leaf.mesh = pm
	leaf.material_override = _mat_simple(Color(0.2, 0.7, 0.25))
	leaf.position = Vector3(0.15, 0.62 if kind == "melon" else 0.55, 0)
	n.add_child(leaf)
	return n

func _add_fruit(pos: Vector3, kind: String) -> void:
	var n := _fruit_node(kind)
	n.position = pos
	world.add_child(n)
	fruits.append({"node": n, "kind": kind, "base_y": pos.y})

## 「？」寶箱磚：從下面頂 → 跳出金幣（5 枚 +50）或水果
func _add_qbox(pos: Vector3, item: String) -> void:
	var body := StaticBody3D.new()
	body.position = pos + Vector3(0, 0.6, 0)
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(1.2, 1.2, 1.2)
	cs.shape = bs
	body.add_child(cs)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(1.2, 1.2, 1.2)
	mi.mesh = bm
	mi.material_override = _mat_simple(Color(0.98, 0.62, 0.15), 0.25)
	body.add_child(mi)
	var lb := Label3D.new()
	lb.text = "?"
	lb.font = font_bold
	lb.font_size = 120
	lb.pixel_size = 0.008
	lb.outline_size = 16
	lb.outline_modulate = Color(0.45, 0.2, 0.05)
	lb.position = Vector3(0, 0, 0.62)
	body.add_child(lb)
	world.add_child(body)
	qboxes.append({"node": body, "mesh": mi, "label": lb, "used": false, "item": item, "bottom": pos.y})

## 原創「刺殼蝸牛」：淺色身體＋紫色殼上有一圈尖刺＋兩根觸角；慢慢來回爬
func _add_snail(pos: Vector3, kind := "purple") -> void:
	var n := Node3D.new()
	n.position = pos
	_sphere(n, 0.42, Vector3(-0.15, 0.28, 0), Color(0.85, 0.82, 0.6), Vector3(1.9, 0.6, 0.9))
	# 紅殼蝸牛（第 7 關起）爬得比較快、範圍比較大
	var shell_col := Color(0.85, 0.2, 0.18) if kind == "red" else Color(0.55, 0.3, 0.7)
	var shell := _sphere(n, 0.5, Vector3(0.15, 0.72, 0), shell_col, Vector3(1, 1, 0.85))
	shell.name = "shell"
	for k in 7:
		var a := PI * 0.12 + k * PI * 0.76 / 6.0
		var sp := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.0
		cm.bottom_radius = 0.12
		cm.height = 0.38
		cm.radial_segments = 8
		sp.mesh = cm
		sp.material_override = _mat_simple(Color(0.95, 0.95, 0.9))
		sp.position = Vector3(0.15 + cos(a) * 0.55, 0.72 + sin(a) * 0.55, 0)
		sp.rotation.z = a - PI / 2.0
		n.add_child(sp)
	for z in [-0.12, 0.12]:
		var st := MeshInstance3D.new()
		var cm2 := CylinderMesh.new()
		cm2.top_radius = 0.035
		cm2.bottom_radius = 0.035
		cm2.height = 0.45
		st.mesh = cm2
		st.material_override = _mat_simple(Color(0.85, 0.82, 0.6))
		st.position = Vector3(-0.85, 0.65, z)
		st.rotation.z = 0.35
		n.add_child(st)
		_sphere(n, 0.08, Vector3(-0.93, 0.88, z), Color(0.1, 0.1, 0.1))
	world.add_child(n)
	snails.append({"node": n, "x0": pos.x, "y": pos.y, "t": randf() * TAU, "hits": 0,
		"speed": 0.8 if kind == "red" else 0.35, "range": 2.2 if kind == "red" else 1.5})

func _check_items(dt: float, p: Vector3) -> void:
	var t := Time.get_ticks_msec() / 1000.0
	var c := p + Vector3(0, 1.1, 0)
	# 水果：飄著轉，碰到就吃
	for i in range(fruits.size() - 1, -1, -1):
		var f: Dictionary = fruits[i]
		var n: Node3D = f["node"]
		n.rotation.y = t * 2.0
		n.position.y = float(f["base_y"]) + sin(t * 3.0 + n.position.x) * 0.15
		if n.position.distance_to(c) < 1.4:
			fruits.remove_at(i)
			_gain(FRUIT_PTS[f["kind"]], n.position, f["kind"])
			var tw := create_tween()
			tw.tween_property(n, "scale", Vector3.ONE * 1.6, 0.12)
			tw.tween_property(n, "scale", Vector3.ONE * 0.05, 0.18)
			tw.tween_callback(n.queue_free)
	# 寶箱：頭頂到（正在往上、頭碰到箱子底）
	if player.velocity.y > -0.5 or player.is_on_ceiling():
		for b in qboxes:
			if b["used"]:
				continue
			var bn: Node3D = b["node"]
			if absf(bn.position.x - p.x) < 1.0 and absf(float(b["bottom"]) - (p.y + 1.75)) < 0.45:
				_open_qbox(b)
	# 蝸牛：慢慢來回爬（±1.5 m）；碰到扣 50 分
	hurt_t = maxf(0.0, hurt_t - dt)
	for sn in snails:
		var n2: Node3D = sn["node"]
		sn["t"] = float(sn["t"]) + dt * float(sn["speed"])
		var off := sin(float(sn["t"])) * float(sn["range"])
		n2.position.x = float(sn["x0"]) + off
		n2.rotation.y = 0.0 if cos(float(sn["t"])) < 0.0 else PI
		var dx := absf(n2.position.x - p.x)
		var dy := p.y - float(sn["y"])
		if dx < 0.95 and dy < 1.05 and dy > -1.0 and hurt_t <= 0.0:
			sn["hits"] = int(sn["hits"]) + 1
			_hurt(n2.position)
			if args.has("runbot"):
				print("RUNBOT hurt x=%.1f score=%d" % [p.x, score])
		# 同一隻撞到 2 次以上：下次接近時自動幫忙跳
		var adx := n2.position.x - p.x
		if int(sn["hits"]) >= 2 and adx > 1.8 and adx < 2.6 and player.is_on_floor() and absf(dy) < 1.0:
			player.press_jump()

func _open_qbox(b: Dictionary) -> void:
	b["used"] = true
	sfx("box")
	var bn: Node3D = b["node"]
	(b["mesh"] as MeshInstance3D).material_override = _mat_simple(Color(0.55, 0.38, 0.22))
	(b["label"] as Label3D).visible = false
	var tw := create_tween()
	tw.tween_property(bn, "position:y", bn.position.y + 0.35, 0.08)
	tw.tween_property(bn, "position:y", bn.position.y, 0.1)
	var top := bn.position + Vector3(0, 0.8, 0)
	if String(b["item"]) == "coins":
		for k in 5:
			var cm := MeshInstance3D.new()
			var cy := CylinderMesh.new()
			cy.top_radius = 0.38
			cy.bottom_radius = 0.38
			cy.height = 0.1
			cm.mesh = cy
			cm.material_override = _mat_simple(Color(1.0, 0.82, 0.15), 0.35)
			cm.rotation.x = PI / 2.0
			cm.position = top
			world.add_child(cm)
			var t2 := create_tween()
			t2.tween_interval(k * 0.09)
			t2.tween_property(cm, "position", top + Vector3((k - 2) * 0.5, 2.2, 0), 0.3).set_ease(Tween.EASE_OUT)
			t2.tween_callback(func(): sfx("coin"))
			t2.tween_property(cm, "scale", Vector3.ONE * 0.05, 0.2)
			t2.tween_callback(cm.queue_free)
		coin_count += 5
		_gain(50, top, "")
	else:
		var f := _fruit_node(String(b["item"]))
		f.position = top
		world.add_child(f)
		var t3 := create_tween()
		t3.tween_property(f, "position:y", top.y + 1.6, 0.3).set_ease(Tween.EASE_OUT)
		t3.tween_property(f, "scale", Vector3.ONE * 0.05, 0.25)
		t3.tween_callback(f.queue_free)
		_gain(FRUIT_PTS[String(b["item"])], top, String(b["item"]))

func _gain(pts: int, at: Vector3, kind: String) -> void:
	score += pts
	if kind != "":
		sfx("fruit")
	_score_pop(at, "+%d" % pts, Color(1.0, 0.9, 0.3))
	_update_hud()

func _hurt(at: Vector3) -> void:
	hurt_t = 1.5
	bot_hurts += 1
	score = maxi(0, score - 50)
	sfx("hurt")
	player.velocity.y = maxf(player.velocity.y, 7.0)
	_score_pop(at + Vector3(0, 1.4, 0), "−50", Color(1.0, 0.35, 0.3))
	if red_flash == null or not is_instance_valid(red_flash):
		red_flash = ColorRect.new()
		red_flash.color = Color(1, 0, 0, 0)
		red_flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		red_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hud.get_parent().add_child(red_flash)
	red_flash.color.a = 0.35
	var tw := create_tween()
	tw.tween_property(red_flash, "color:a", 0.0, 0.45)
	# Ken 閃爍（1.5 秒內不會再被扣）
	var vis: Node3D = player.visual
	if vis:
		var tb := create_tween()
		for k in 6:
			tb.tween_property(vis, "visible", false, 0.12)
			tb.tween_property(vis, "visible", true, 0.12)
	_update_hud()

## 在場景裡跳出分數字（+50、−50），往上飄
func _score_pop(at: Vector3, text: String, col: Color) -> void:
	var l := Label3D.new()
	l.text = text
	l.font = font_bold
	l.font_size = 80
	l.pixel_size = 0.011
	l.outline_size = 16
	l.outline_modulate = Color(0.1, 0.08, 0.2)
	l.modulate = col
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.position = at + Vector3(0, 0.8, 0)
	world.add_child(l)
	var tw := create_tween()
	tw.tween_property(l, "position:y", l.position.y + 1.4, 0.7)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 0.7).set_delay(0.3)
	tw.tween_callback(l.queue_free)

## ---------- 側面魔王（2026-11-07 第三批：第 12、13 關）
const SB_R := 1.6
func _sb_build() -> void:
	var cfg: Dictionary = D["side_boss"]
	var n := Node3D.new()
	n.position = Vector3(float(cfg["x"]), 0, 0)
	world.add_child(n)
	var col: Color = cfg["color"]
	var body := _sphere(n, SB_R, Vector3(0, SB_R, 0), col, Vector3(1.1, 1.0, 1.0), 0.15)
	_sphere(n, SB_R * 0.7, Vector3(0, SB_R * 0.8, 0.75), col.lightened(0.45), Vector3(1.0, 0.9, 0.5))
	for x in [-0.55, 0.55]:
		_sphere(n, 0.42, Vector3(x, SB_R * 1.35, SB_R * 0.8), Color.WHITE)
		_sphere(n, 0.2, Vector3(x, SB_R * 1.35, SB_R * 0.8 + 0.32), Color(0.08, 0.08, 0.12))
		_sphere(n, 0.12, Vector3(x * 0.9, SB_R * 1.75, SB_R * 0.7), col.darkened(0.5), Vector3(3.0, 0.8, 1.0))
	for x in [-1.6, 1.6]:
		_sphere(n, 0.5, Vector3(x, SB_R * 0.7, 0.2), col.darkened(0.15))
	if String(cfg["hat"]) == "crown":
		var cr := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.9
		cm.bottom_radius = 0.7
		cm.height = 0.7
		cr.mesh = cm
		cr.material_override = _mat_simple(Color(1.0, 0.82, 0.2), 0.4)
		cr.position = Vector3(0, SB_R * 2.0 + 0.2, 0)
		n.add_child(cr)
		for k in 5:
			var a := k * TAU / 5.0
			_sphere(n, 0.16, Vector3(cos(a) * 0.85, SB_R * 2.0 + 0.62, sin(a) * 0.85), Color(1.0, 0.35, 0.4), Vector3.ONE, 0.5)
	else:
		for k in 5:
			_sphere(n, 0.55, Vector3(-1.1 + k * 0.55, SB_R * 2.0 + 0.3 + (0.25 if k % 2 == 1 else 0.0), 0), Color(0.55, 0.58, 0.68))
		var bolt := MeshInstance3D.new()
		var pm := PrismMesh.new()
		pm.size = Vector3(0.5, 1.1, 0.2)
		bolt.mesh = pm
		bolt.material_override = _mat_simple(Color(1.0, 0.9, 0.2), 0.6)
		bolt.position = Vector3(0.9, SB_R * 2.0 + 1.2, 0)
		bolt.rotation.z = 0.4
		n.add_child(bolt)
	var hp: int = quiz.remaining(String(L["id"]))
	sb = {"node": n, "body": body, "zh": cfg["zh"], "en": cfg["en"], "hp": hp, "max": maxi(1, level_total(String(L["id"]))),
		"speed": float(cfg["speed"]), "double": bool(cfg["double"]), "dir": -1.0, "hop_t": 3.5, "hopping": false,
		"vulnerable": true, "waves": [], "defeated": false, "side_hits": 0, "say_t": 0.0, "gate_x": 0.0}
	if hp <= 0 or args.has("bossdown"):   # --bossdown：截圖用，直接看彩虹門
		sb["defeated"] = true
		n.visible = false
		_sb_gate()

func _sb_tick(dt: float, p: Vector3) -> void:
	var n: Node3D = sb["node"]
	sb["say_t"] = maxf(0.0, float(sb["say_t"]) - dt)
	if sb["defeated"]:
		if float(sb["gate_x"]) != 0.0 and absf(p.x - float(sb["gate_x"])) < 0.8 and state == "play":
			_level_clear()
		return
	var ar: Array = D["arena"]
	# 走來走去（不靠近牆）；Ken 靠近 6 m 內就停下來（起跳時機比較好抓）
	var near := absf(p.x - n.position.x) < 6.0
	if not sb["hopping"] and not near:
		n.position.x += float(sb["dir"]) * float(sb["speed"]) * dt
		if n.position.x < float(ar[0]) + 10.0:
			sb["dir"] = 1.0
		elif n.position.x > float(ar[1]) - 8.0:
			sb["dir"] = -1.0
		n.rotation.y = lerp_angle(n.rotation.y, 0.35 * float(sb["dir"]), dt * 4.0)
	if not sb["hopping"]:
		var t := Time.get_ticks_msec() / 1000.0
		(sb["body"] as Node3D).scale = Vector3(1.1 + sin(t * 6.0) * 0.04, 1.0 - sin(t * 6.0) * 0.04, 1.0)
	# 跳起來壓地 → 往左右各放一道衝擊波（雷雲大王連放兩次）
	sb["hop_t"] = float(sb["hop_t"]) - dt
	if float(sb["hop_t"]) <= 0.0 and not sb["hopping"] and not near:
		sb["hop_t"] = 4.2 if not sb["double"] else 3.6
		sb["hopping"] = true
		var tw := create_tween()
		tw.tween_property(n, "position:y", 2.6, 0.35).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
		tw.tween_property(n, "position:y", 0.0, 0.25).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_QUAD)
		tw.tween_callback(func():
			if sb.is_empty() or sb["defeated"]:
				return
			sb["hopping"] = false
			_sb_waves()
			if sb["double"]:
				get_tree().create_timer(0.55).timeout.connect(func():
					if not sb.is_empty() and not sb["defeated"]:
						_sb_waves()))
	# 衝擊波
	for i in range(sb["waves"].size() - 1, -1, -1):
		var w: Dictionary = sb["waves"][i]
		w["x"] = float(w["x"]) + float(w["dir"]) * 6.0 * dt   # 比 Ken 慢，不會從背後追上
		(w["node"] as Node3D).position.x = w["x"]
		if float(w["x"]) < float(ar[0]) or float(w["x"]) > float(ar[1]):
			(w["node"] as Node3D).queue_free()
			sb["waves"].remove_at(i)
			continue
		if absf(p.x - float(w["x"])) < 0.45 and p.y < 0.5 and hurt_t <= 0.0:
			if args.has("runbot"):
				print("RUNBOT hurt wave x=%.1f dir=%.0f run=%.0f floor=%s" % [p.x, float(w["dir"]), run_dir, player.is_on_floor()])
			_hurt(Vector3(p.x, 0, 0))
	# 踩頭／撞到
	var top := n.position.y + SB_R * 2.0
	var dx := absf(p.x - n.position.x)
	if dx < SB_R + 0.5:
		if player.velocity.y < 0.0 and p.y > top - 1.6:
			_sb_stomp(p)
		elif dx < SB_R and p.y < top - 1.6 and hurt_t <= 0.0:
			sb["side_hits"] = int(sb["side_hits"]) + 1
			if args.has("runbot"):
				print("RUNBOT hurt boss x=%.1f bx=%.1f py=%.1f vy=%.1f vul=%s" % [p.x, n.position.x, p.y, player.velocity.y, sb["vulnerable"]])
			_hurt(n.position + Vector3(0, SB_R, 0))
			run_dir = -1.0 if p.x < n.position.x else 1.0
	# 撞到 2 次以上：靠近時自動幫忙按住跳
	var ahead := (n.position.x - p.x) * run_dir
	if int(sb["side_hits"]) >= 2 and ahead > 2.8 and ahead < 4.0 and player.is_on_floor():
		auto_hold = 0.7
		player.press_jump()

func _sb_waves() -> void:
	var n: Node3D = sb["node"]
	sfx("slam")
	for dir in [-1.0, 1.0]:
		var w := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.5, 0.7, 3.4)
		w.mesh = bm
		var m := _mat_simple(Color(1.0, 0.55, 0.2) if not sb["double"] else Color(0.6, 0.85, 1.0), 0.9)
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color.a = 0.75
		w.material_override = m
		w.position = Vector3(n.position.x + dir * SB_R, 0.35, 0)
		world.add_child(w)
		sb["waves"].append({"node": w, "x": w.position.x, "dir": dir})
	_burst(n.position + Vector3(0, 0.2, 0), Color(0.9, 0.85, 0.7), 14, 0.5)

func _sb_stomp(p: Vector3) -> void:
	player.bounce()
	player.velocity.y = maxf(player.velocity.y, 16.0)
	if not sb["vulnerable"]:
		if float(sb["say_t"]) <= 0.0:
			show_toast("先去拿星星回答問題！\nGet the star first!", 1.6)
			sb["say_t"] = 2.0
		return
	sb["vulnerable"] = false
	sb["hp"] = maxi(0, int(sb["hp"]) - 1)
	sfx("stomp")
	score += 300
	_score_pop(p, "+300", Color(1.0, 0.9, 0.3))
	_pop_text("Great!", Color(0.4, 0.8, 1.0))
	var body: MeshInstance3D = sb["body"]
	var tw := create_tween()
	tw.tween_property(body, "scale", Vector3(1.4, 0.6, 1.2), 0.08)
	tw.tween_property(body, "scale", Vector3(1.1, 1.0, 1.0), 0.25).set_trans(Tween.TRANS_ELASTIC)
	# 掉一顆星星在 Ken 前面（跑過去就出題）
	var ar: Array = D["arena"]
	var sx := clampf(p.x + run_dir * 9.0, float(ar[0]) + 4.0, float(ar[1]) - 4.0)
	if absf(sx - (sb["node"] as Node3D).position.x) < 3.0:
		sx = clampf(p.x - run_dir * 9.0, float(ar[0]) + 4.0, float(ar[1]) - 4.0)
	_add_star(Vector3(sx, 1.4, 0), false, false)
	show_toast("踩到了！去拿星星回答問題！\nGet the star!", 1.8)
	_update_hud()

func _sb_after_answer() -> void:
	_update_hud()
	if int(sb["hp"]) <= 0 or quiz.remaining(String(L["id"])) == 0:
		_sb_defeat()
	else:
		sb["vulnerable"] = true
		show_toast("答對了！再踩一次魔王！\nJump on its head again!", 2.0)

func _sb_defeat() -> void:
	sb["defeated"] = true
	sb["hp"] = 0
	_update_hud()
	var n: Node3D = sb["node"]
	for w in sb["waves"]:
		(w["node"] as Node3D).queue_free()
	sb["waves"] = []
	sfx("defeat")
	var cols := [Color(1, 0.35, 0.35), Color(1, 0.85, 0.2), Color(0.35, 0.8, 1), Color(0.6, 1, 0.45)]
	for k in 4:
		get_tree().create_timer(k * 0.2).timeout.connect(func():
			if world != null:
				_firework(n.position + Vector3(randf_range(-2, 2), randf_range(2.5, 5.0), 0), cols[k]))
	var tw := create_tween()
	tw.tween_property(n, "rotation:y", TAU * 3.0, 1.0)
	tw.parallel().tween_property(n, "scale", Vector3.ONE * 0.05, 1.0).set_ease(Tween.EASE_IN)
	tw.tween_callback(func(): n.visible = false)
	show_toast("打倒魔王了！跑過彩虹門！\nRun through the rainbow!", 2.6)
	get_tree().create_timer(1.0).timeout.connect(func():
		if world != null and not sb.is_empty():
			_sb_gate())

## 彩虹門：魔王倒下後出現在 Ken 前面
func _sb_gate() -> void:
	var ar: Array = D["arena"]
	var p := player.global_position
	var gx := clampf(p.x + run_dir * 12.0, float(ar[0]) + 5.0, float(ar[1]) - 5.0)
	if absf(gx - p.x) < 6.0:
		gx = clampf(p.x - run_dir * 12.0, float(ar[0]) + 5.0, float(ar[1]) - 5.0)
	sb["gate_x"] = gx
	var root := Node3D.new()
	root.position = Vector3(gx, 0, -1.4)
	world.add_child(root)
	var cols := [Color(0.95, 0.3, 0.3), Color(1.0, 0.6, 0.2), Color(1.0, 0.9, 0.3), Color(0.4, 0.85, 0.4),
		Color(0.3, 0.6, 1.0), Color(0.45, 0.4, 0.9), Color(0.7, 0.45, 0.9)]
	for i in cols.size():
		var mi := MeshInstance3D.new()
		var tm := TorusMesh.new()
		var r := 4.6 - i * 0.32
		tm.inner_radius = r - 0.32
		tm.outer_radius = r
		tm.rings = 40
		tm.ring_segments = 8
		mi.mesh = tm
		mi.material_override = _mat_simple(cols[i], 0.5)
		mi.rotation_degrees = Vector3(90, 0, 0)
		root.add_child(mi)
	var lb := Label3D.new()
	lb.text = "GOAL!"
	lb.font = font_bold
	lb.font_size = 110
	lb.pixel_size = 0.01
	lb.outline_size = 18
	lb.modulate = Color(1.0, 0.9, 0.3)
	lb.outline_modulate = Color(0.3, 0.15, 0.4)
	lb.position = Vector3(0, 5.3, 0.3)
	root.add_child(lb)
	root.scale = Vector3.ONE * 0.05
	create_tween().tween_property(root, "scale", Vector3.ONE, 0.6).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	sfx("record")

## ---------- 華麗過關（2026-11-07 RDQ 1C）：場景煙火＋鏡頭拉近 Ken 勝利動作 → 全螢幕成績
func _firework(at: Vector3, col: Color) -> void:
	var p := CPUParticles3D.new()
	p.one_shot = true
	p.amount = 60
	p.lifetime = 1.4
	p.explosiveness = 1.0
	var sm := SphereMesh.new()
	sm.radius = 0.16
	sm.height = 0.32
	sm.radial_segments = 6
	sm.rings = 3
	p.mesh = sm
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = col
	p.material_override = m
	p.direction = Vector3.UP
	p.spread = 180.0
	p.initial_velocity_min = 5.0
	p.initial_velocity_max = 8.0
	p.gravity = Vector3(0, -3.5, 0)
	p.damping_min = 1.5
	p.damping_max = 2.5
	p.position = at
	world.add_child(p)
	p.emitting = true
	sfx_pitch("firework", randf_range(0.85, 1.2))
	get_tree().create_timer(2.0).timeout.connect(p.queue_free)

func _celebrate(id: String) -> void:
	var lid := id
	music_player.stop()
	music_now = ""
	sfx("fanfare")
	var prev_best := _get_best(lid)
	var best := _save_best(lid, score)
	var rp := player.global_position
	# 1) 場景：煙火＋鏡頭拉近＋Ken 跳兩下轉一圈
	var zt := create_tween()
	zt.tween_property(self, "cam_zoom", 1.0, 0.8).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	var vis: Node3D = player.visual
	if vis:
		vis.visible = true
		var y0 := vis.position.y
		var r0 := vis.rotation.y
		var vt := create_tween()
		vt.tween_property(vis, "rotation:y", 0.0, 0.25)
		for k in 2:
			vt.tween_property(vis, "position:y", y0 + 0.9, 0.22).set_ease(Tween.EASE_OUT)
			vt.parallel().tween_property(vis, "rotation:y", TAU * (k + 1), 0.44)
			vt.tween_property(vis, "position:y", y0, 0.22).set_ease(Tween.EASE_IN)
		vt.tween_callback(func(): vis.rotation.y = r0)
	var cols := [Color(1, 0.35, 0.35), Color(1, 0.85, 0.2), Color(0.35, 0.8, 1), Color(0.6, 1, 0.45), Color(0.95, 0.5, 1)]
	for k in 6:
		get_tree().create_timer(0.15 + k * 0.28).timeout.connect(func():
			if world != null:
				_firework(rp + Vector3(randf_range(-5, 6), randf_range(5.5, 8.5), randf_range(-6, -3)), cols[k % cols.size()]))
	await get_tree().create_timer(2.2).timeout
	if state != "clear":
		return
	_results_screen(lid, best, score > prev_best and score > 0)

func _skin_btn(b: Button, col: Color) -> void:
	for st in ["normal", "hover", "pressed", "disabled", "focus"]:
		var sb := StyleBoxFlat.new()
		sb.bg_color = col.darkened(0.2) if st == "pressed" else (col.lightened(0.1) if st == "hover" else col)
		if st == "focus":
			sb.draw_center = false
		sb.set_corner_radius_all(20)
		sb.content_margin_left = 20
		sb.content_margin_right = 20
		b.add_theme_stylebox_override(st, sb)
	b.add_theme_color_override("font_color", Color.WHITE)
	b.add_theme_color_override("font_disabled_color", Color(1, 1, 1, 0.7))
	b.add_theme_font_override("font", font_bold)

func _get_best(id: String) -> int:
	if FileAccess.file_exists(SAVE_BEST):
		var v = JSON.parse_string(FileAccess.get_file_as_string(SAVE_BEST))
		if v is Dictionary:
			return int(v.get(id, 0))
	return 0

var results_layer: CanvasLayer
func _results_screen(id: String, best: int, record: bool) -> void:
	var vp := get_viewport().get_visible_rect().size
	results_layer = CanvasLayer.new()
	results_layer.layer = 25
	add_child(results_layer)
	var bg := ColorRect.new()
	bg.color = Color(0.05, 0.08, 0.2, 0.0)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	results_layer.add_child(bg)
	create_tween().tween_property(bg, "color:a", 0.55, 0.3)
	# 彩帶紙花
	var cf := CPUParticles2D.new()
	cf.amount = 180
	cf.lifetime = 4.0
	cf.preprocess = 0.6
	cf.position = Vector2(vp.x / 2.0, -20)
	cf.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	cf.emission_rect_extents = Vector2(vp.x / 2.0, 10)
	cf.direction = Vector2(0, 1)
	cf.spread = 25.0
	cf.initial_velocity_min = 120.0
	cf.initial_velocity_max = 260.0
	cf.gravity = Vector2(0, 160)
	cf.angular_velocity_min = -300.0
	cf.angular_velocity_max = 300.0
	cf.scale_amount_min = 7.0
	cf.scale_amount_max = 13.0
	var gr := Gradient.new()
	gr.offsets = PackedFloat32Array([0.0, 0.2, 0.4, 0.6, 0.8, 1.0])
	gr.colors = PackedColorArray([Color(1, 0.3, 0.35), Color(1, 0.8, 0.2), Color(0.3, 0.8, 1), Color(0.5, 1, 0.45), Color(0.9, 0.45, 1), Color(1, 1, 1)])
	cf.color_initial_ramp = gr
	results_layer.add_child(cf)
	cf.emitting = true
	# 成績卡
	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(1.0, 0.97, 0.88)
	sb.border_color = Color(1.0, 0.75, 0.15)
	sb.set_border_width_all(8)
	sb.set_corner_radius_all(28)
	sb.content_margin_left = 40
	sb.content_margin_right = 40
	sb.content_margin_top = 20
	sb.content_margin_bottom = 26
	panel.add_theme_stylebox_override("panel", sb)
	panel.custom_minimum_size = Vector2(minf(760, vp.x - 40), 0)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	results_layer.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	panel.add_child(box)
	var mk := func(t: String, size: int, col: Color) -> Label:
		var l := _label(t, size)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.add_theme_color_override("font_color", col)
		box.add_child(l)
		return l
	var title: Label = mk.call("LEVEL CLEAR!", 84, Color(1.0, 0.82, 0.2))
	title.add_theme_constant_override("outline_size", 18)
	mk.call("過關！ 第 %d 關 %s" % [L["n"], L["zh"]], 34, Color(0.2, 0.4, 0.8))
	var sc_l: Label = mk.call("分數 0", 64, Color(0.95, 0.45, 0.1))
	var stars_row := HBoxContainer.new()
	stars_row.alignment = BoxContainer.ALIGNMENT_CENTER
	stars_row.add_theme_constant_override("separation", 18)
	box.add_child(stars_row)
	var star_ls: Array = []
	for k in 3:
		var st := _label("★", 96)
		st.add_theme_color_override("font_color", Color(0.75, 0.75, 0.78))
		st.pivot_offset = Vector2(40, 60)
		stars_row.add_child(st)
		star_ls.append(st)
	var rec_l: Label = mk.call("NEW RECORD! 新紀錄！", 46, Color(1.0, 0.4, 0.35))
	rec_l.modulate.a = 0.0
	var best_l: Label = mk.call("最高分 %d" % best, 32, Color(0.35, 0.3, 0.25))
	best_l.add_theme_constant_override("outline_size", 0)
	var info_l: Label = mk.call("金幣 %d　　華麗動作 %d 次" % [coin_count, style_count], 30, Color(0.35, 0.3, 0.25))
	info_l.add_theme_constant_override("outline_size", 0)
	var btns := HBoxContainer.new()
	btns.alignment = BoxContainer.ALIGNMENT_CENTER
	btns.add_theme_constant_override("separation", 30)
	btns.modulate.a = 0.0
	box.add_child(btns)
	var n: int = L["n"]
	var has_next := n < Levels.LEVELS.size()
	var b_next := Button.new()
	b_next.text = "下一關 Next ▶" if has_next else "回選關 Menu"
	b_next.custom_minimum_size = Vector2(260, 72)
	b_next.add_theme_font_size_override("font_size", 32)
	_skin_btn(b_next, Color(0.2, 0.7, 0.3))
	btns.add_child(b_next)
	var b_menu := Button.new()
	b_menu.text = "選關 Menu"
	b_menu.custom_minimum_size = Vector2(220, 72)
	b_menu.add_theme_font_size_override("font_size", 32)
	_skin_btn(b_menu, Color(0.25, 0.5, 0.9))
	btns.add_child(b_menu)
	if has_next:
		btns.move_child(b_menu, 0)
	b_next.disabled = true
	b_menu.disabled = true
	var close := func(go_next: bool) -> void:
		sfx("click")
		cam_zoom = 0.0
		if results_layer:
			results_layer.queue_free()
			results_layer = null
		if go_next and has_next and is_unlocked(n + 1):
			start_level(n + 1)
		else:
			show_menu()
	b_next.pressed.connect(func(): close.call(has_next))
	b_menu.pressed.connect(func(): close.call(false))
	# 動畫：標題彈跳 → 分數滾動 → 星星一顆顆亮 → 新紀錄 → 按鈕
	sfx("results")
	title.pivot_offset = Vector2(title.get_combined_minimum_size().x / 2.0, 50)
	title.scale = Vector2.ONE * 0.2
	create_tween().tween_property(title, "scale", Vector2.ONE, 0.7).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	await get_tree().create_timer(0.6).timeout
	var steps := 24
	for k in range(1, steps + 1):
		if not is_instance_valid(sc_l):
			return
		sc_l.text = "分數 %d" % int(round(float(score) * k / steps))
		if k % 2 == 0:
			sfx_pitch("tick", 1.0 + 0.6 * k / steps)
		await get_tree().create_timer(0.05).timeout
	var ratio := float(score) / maxf(1.0, float(score_max))
	var n_stars := 3 if ratio >= 0.9 else (2 if ratio >= 0.75 else (1 if ratio >= 0.6 else 0))
	for k in 3:
		await get_tree().create_timer(0.3).timeout
		if not is_instance_valid(sc_l):
			return
		if k < n_stars:
			var st: Label = star_ls[k]
			st.add_theme_color_override("font_color", Color(1.0, 0.8, 0.15))
			st.scale = Vector2.ONE * 1.6
			create_tween().tween_property(st, "scale", Vector2.ONE, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
			sfx_pitch("starding", 1.0 + 0.15 * k)
	if record:
		await get_tree().create_timer(0.3).timeout
		if not is_instance_valid(rec_l):
			return
		sfx("record")
		rec_l.pivot_offset = Vector2(rec_l.get_combined_minimum_size().x / 2.0, 30)
		rec_l.scale = Vector2.ONE * 1.8
		var rt := create_tween()
		rt.tween_property(rec_l, "modulate:a", 1.0, 0.15)
		rt.parallel().tween_property(rec_l, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	await get_tree().create_timer(0.3).timeout
	if not is_instance_valid(btns):
		return
	create_tween().tween_property(btns, "modulate:a", 1.0, 0.25)
	b_next.disabled = false
	b_menu.disabled = false
	if args.has("clearshot"):
		await get_tree().create_timer(0.4).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(String(args["clearshot"]))
		print("RUNBOT clearshot score=%d max=%d stars=%d record=%s" % [score, score_max, n_stars, record])
		get_tree().quit()

## 本機最高分（換 iPad 或清除網站資料就會不見）
func _save_best(id: String, sc: int) -> int:
	var best := {}
	if FileAccess.file_exists(SAVE_BEST):
		var t := FileAccess.get_file_as_string(SAVE_BEST)
		var v = JSON.parse_string(t)
		if v is Dictionary:
			best = v
	var b := maxi(int(best.get(id, 0)), sc)
	best[id] = b
	var f := FileAccess.open(SAVE_BEST, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(best))
	return b

func _check_coins(p: Vector3) -> void:
	var t := Time.get_ticks_msec() / 1000.0
	var c := p + Vector3(0, 1.1, 0)
	for i in range(coins.size() - 1, -1, -1):
		var n: MeshInstance3D = coins[i]
		n.rotation.y = t * 4.0
		if n.position.distance_to(c) < 1.3:
			coins.remove_at(i)
			coin_count += 1
			score += 10
			sfx("coin")
			var tw := create_tween()
			tw.tween_property(n, "position:y", n.position.y + 1.5, 0.25)
			tw.parallel().tween_property(n, "scale", Vector3.ONE * 0.1, 0.25)
			tw.tween_callback(n.queue_free)
			_update_hud()

## 起跳：先蹲再拉長
func _squash() -> void:
	var v := player.visual
	if v == null:
		return
	var tw := create_tween()
	tw.tween_property(v, "scale", Vector3(1.18, 0.82, 1.18), 0.05)
	tw.tween_property(v, "scale", Vector3(0.88, 1.18, 0.88), 0.09)
	tw.tween_property(v, "scale", Vector3.ONE, 0.14)

func _on_style(move: String) -> void:
	style_count += 1
	if args.has("runbot") and move == "wallkick":
		print("RUNBOT wallkick x=%.1f y=%.1f" % [player.global_position.x, player.global_position.y])
	match move:
		"flip":
			sfx("flip")
		"spin":
			sfx("spin")
			_burst(player.global_position + Vector3(0, 1.2, 0), Color(0.6, 0.9, 1.0), 14)
		"vault":
			sfx("vault")
		"wallkick":
			sfx("wallkick")
			_pop_text("Wall Kick!", Color(0.6, 0.9, 1.0))

func _run_landed(k: String) -> void:
	if k == "fall":
		return
	sfx("land")
	var feet := player.global_position + Vector3(0, 0.1, 0)
	_burst(feet, Color(0.85, 0.8, 0.7), 10, 0.45)
	if player.flipped or player.spun:
		_burst(feet + Vector3(0, 0.8, 0), Color(1.0, 0.9, 0.3), 16)

## 連續踩史萊姆：Nice → Great → Excellent!，音調越來越高
var last_stomp_ms := 0
var bot_stomps := 0
var bot_words := {}
func _run_stomp() -> void:
	# 1.5 秒內接著踩就連下去（3 隻一組，中間碰到地也算連續）
	if Time.get_ticks_msec() - last_stomp_ms > 1500:
		stomp_chain = 0
	last_stomp_ms = Time.get_ticks_msec()
	bot_stomps += 1
	stomp_chain += 1
	sfx_pitch("stomp", 1.0 + 0.18 * (stomp_chain - 1))
	var words := ["Nice!", "Great!", "Excellent!"]
	var cols := [Color(0.5, 1.0, 0.5), Color(0.4, 0.8, 1.0), Color(1.0, 0.8, 0.2)]
	var i := mini(stomp_chain, 3) - 1
	score += 100 * (i + 1)
	_update_hud()
	_pop_text(words[i], cols[i])
	bot_words[words[i]] = int(bot_words.get(words[i], 0)) + 1
	if args.has("runbot"):
		print("RUNBOT stomp %s t=%.2f" % [words[i], bot_t])
	if stomp_chain >= 2:
		style_count += 1
		sfx("cheer")

## 華麗動作的字：畫面正上方大字（2026-11-11 教師 RDQ ①：原本放在 Ken 頭上，Ken 一跑就出畫面）
func _pop_text(text: String, col: Color, warm := false) -> void:
	var l := _label(text, 110)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_color_override("font_color", col)
	l.add_theme_color_override("font_outline_color", Color(0.08, 0.08, 0.2))
	l.add_theme_constant_override("outline_size", 22)
	l.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	l.grow_horizontal = Control.GROW_DIRECTION_BOTH
	l.position.y = 70
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.get_parent().add_child(l)
	if warm:
		l.modulate.a = 0.01
		get_tree().create_timer(0.2).timeout.connect(l.queue_free)
		return
	l.pivot_offset = Vector2(l.get_combined_minimum_size().x / 2.0, 60)
	l.scale = Vector2.ONE * 0.4
	var tw := create_tween()
	tw.tween_property(l, "scale", Vector2.ONE * 1.15, 0.15).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(l, "scale", Vector2.ONE, 0.1)
	tw.tween_interval(0.35)
	tw.tween_property(l, "modulate:a", 0.0, 0.3)
	tw.tween_callback(l.queue_free)

## 小粒子爆開（落地煙塵、旋轉、星光）
func _burst(at: Vector3, col: Color, n: int, life := 0.6) -> void:
	var p := CPUParticles3D.new()
	p.one_shot = true
	p.amount = n
	p.lifetime = life
	p.explosiveness = 1.0
	var sm := SphereMesh.new()
	sm.radius = 0.12
	sm.height = 0.24
	sm.radial_segments = 6
	sm.rings = 3
	p.mesh = sm
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.emission_enabled = true
	m.emission = col * 0.5
	p.material_override = m
	p.direction = Vector3.UP
	p.spread = 70.0
	p.initial_velocity_min = 2.0
	p.initial_velocity_max = 5.0
	p.gravity = Vector3(0, -6, 0)
	p.position = at
	world.add_child(p)
	p.emitting = true
	get_tree().create_timer(life + 0.3).timeout.connect(p.queue_free)

func sfx_pitch(key: String, pitch: float) -> void:
	var st: AudioStream = sfx_streams.get(SFX.get(key, key))
	if st == null or test_mode:
		return
	for ap in sfx_pool:
		if not ap.playing:
			ap.stream = st
			ap.pitch_scale = pitch
			ap.play()
			ap.finished.connect(func(): ap.pitch_scale = 1.0, CONNECT_ONE_SHOT)
			return

# ---------------------------------------------------------------- iPad 自動跑版
## 點螢幕＝跳：iPad 只看手指（InputEventScreenTouch），電腦只看滑鼠左鍵（避免觸控模擬滑鼠算兩次）；
## 點在「選關」按鈕上不算跳。空白鍵走 _read_input 的 "jump"。
func _unhandled_input(event: InputEvent) -> void:
	if not run_mode:
		return
	var down := false
	var up := false
	var pos := Vector2.ZERO
	if event is InputEventScreenTouch:
		down = event.pressed
		up = not event.pressed
		pos = event.position
	elif event is InputEventMouseButton and not is_mobile and event.button_index == MOUSE_BUTTON_LEFT:
		down = event.pressed
		up = not event.pressed
		pos = event.position
	else:
		return
	if up:
		tap_held = false
		return
	if down and state == "play":
		if menu_btn.visible and menu_btn.get_global_rect().has_point(pos):
			return
		tap_pressed = true
		tap_held = true

## --runbot：自動測試用「機器人小朋友」：看到前面有缺口或擋路的台階就點（高的就按住），題目自動答對。
## 印 RUNBOT 結果：花幾秒、泡泡救援幾次、有沒有過關。
var bot_hold := 0.0
var bot_t := 0.0
var bot_bubbles := 0
func _runbot(dt: float) -> void:
	bot_t += dt
	if state == "quiz":
		if not quiz.solved:
			quiz.debug_fill(true)
			quiz.debug_check()
		else:
			quiz.debug_next()
		return
	if state != "play":
		return
	bot_hold = maxf(0.0, bot_hold - dt)
	tap_held = bot_hold > 0.0
	if player.on_wall_slide:
		tap_pressed = true
		return
	if not player.is_on_floor():
		return
	var p := player.global_position
	# 機器人也去拿道具、跳過蝸牛（確認每關分數上限拿得到）
	if not sb.is_empty() and not sb["defeated"]:
		var bx: float = (sb["node"] as Node3D).position.x
		var ahead_b := (bx - p.x) * run_dir
		for w in sb["waves"]:
			var wa := (float(w["x"]) - p.x) * run_dir
			if wa > 0.8 and wa < 2.6 and float(w["dir"]) * run_dir < 0.0 or (wa > 0.8 and wa < 1.6):
				tap_pressed = true
				bot_hold = 0.0
				return
		if ahead_b > 2.9 and ahead_b < 3.6 and not sb["hopping"]:
			tap_pressed = true
			bot_hold = 0.7
			return
	for sn in ([] if args.has("hitsnails") else snails):   # --hitsnails：測試扣分（故意不跳）
		var sdx: float = (sn["node"] as Node3D).position.x - p.x
		if sdx > 1.8 and sdx < 2.6 and absf(float(sn["y"]) - p.y) < 1.0:
			tap_pressed = true
			bot_hold = 0.0
			return
	for b in qboxes:
		var bdx: float = (b["node"] as Node3D).position.x - p.x
		if not b["used"] and bdx > 0.6 and bdx < 1.4 and float(b["bottom"]) - p.y < 3.6:
			tap_pressed = true
			bot_hold = 0.0
			return
	for f in fruits:
		var fp: Vector3 = (f["node"] as Node3D).position
		if fp.x - p.x > 2.4 and fp.x - p.x < 3.4 and fp.y - p.y > 1.0 and fp.y - p.y < 6.0:
			tap_pressed = true
			bot_hold = 0.6 if fp.y - p.y > 3.5 else 0.0
			return
	var space := get_world_3d().direct_space_state
	var ahead := 2.2
	# 前面地面還在嗎（缺口）
	var q := PhysicsRayQueryParameters3D.create(p + Vector3(ahead, 1.0, 0), p + Vector3(ahead, -3.0, 0))
	q.exclude = [player.get_rid()]
	var gap := space.intersect_ray(q).is_empty()
	# 前面有沒有比 1 m 高的牆
	var w := PhysicsRayQueryParameters3D.create(p + Vector3(0, 1.3, 0), p + Vector3(1.9, 1.3, 0))
	w.exclude = [player.get_rid()]
	var wall := not space.intersect_ray(w).is_empty()
	if gap or wall:
		if args.has("botlog"):
			print("BOT tap x=%.1f gap=%s wall=%s fwd=%.1f" % [p.x, gap, wall, player.fwd])
		tap_pressed = true
		bot_hold = 0.35 if (wall or gap) else 0.0

var wall_stuck := 0.0
var wall_tries := 0
var wall_help_x := -1e9
func _run_tick(dt: float) -> void:
	auto_hold = maxf(0.0, auto_hold - dt)
	var p := player.global_position
	_wall_help(dt, p)
	# 記錄最近站在地上的位置（每 0.1 秒一筆，留 3 秒）
	safe_t += dt
	if player.is_on_floor() and safe_t >= 0.1:
		safe_t = 0.0
		safe_hist.append(p)
		if safe_hist.size() > 30:
			safe_hist.pop_front()
	_check_coins(p)
	_check_items(dt, p)
	if D.has("arena"):
		var ar: Array = D["arena"]
		if run_dir > 0.0 and p.x > float(ar[1]) - 3.0:
			run_dir = -1.0
		elif run_dir < 0.0 and p.x < float(ar[0]) + 3.0:
			run_dir = 1.0
	if not sb.is_empty():
		_sb_tick(dt, p)
	if boss == null:
		_auto_vault(p)
		# 終點：題目都答完才過關；有星星沒答（中途按離開）就帶回星星前面
		if p.x >= float(D.get("goal", 1e9)):
			var id: String = L["id"]
			if quiz.remaining(id) == 0:
				_level_clear()
			else:
				for s in stars:
					if not s["done"]:
						s["cool"] = false
						show_toast("還有星星沒回答喔！\nAnswer the star question first.", 2.2)
						_bubble_to((s["node"] as Node3D).global_position.x - 10.0)
						return

## 踢牆的牆（第 4 關起）：Ken 在牆前面卡住 → 1.2 秒後提示並幫忙跳一次；
## 同一面牆卡第 2 次 → 之後貼牆時自動幫忙踢（不會永遠卡住）
func _wall_help(dt: float, p: Vector3) -> void:
	if not player.wall_kick_on:
		return
	if p.x > wall_help_x + 3.0 and wall_help_x > -1e8:
		wall_help_x = -1e9
		wall_tries = 0
	if wall_tries >= 2 and player.on_wall_slide:
		player.press_jump()
	if player.is_on_floor() and player.is_on_wall() and player.kind == "":
		wall_stuck += dt
		if wall_stuck > 1.2:
			wall_stuck = 0.0
			wall_tries += 1
			wall_help_x = p.x
			show_toast("按住跳、碰到牆再點一下！\nHold, then tap at the wall!" if wall_tries < 2 else "幫你踢牆！ Wall kick!", 1.6)
			auto_hold = 0.5
			player.press_jump()
	else:
		wall_stuck = 0.0

## 自動跨越：前面有矮台階（低於約 1 m）或史萊姆時自動小跳，像 Super Mario Run 一樣不會被小東西擋住
func _auto_vault(p: Vector3) -> void:
	if not player.is_on_floor() or player.kind != "":
		return
	var space := get_world_3d().direct_space_state
	var low := PhysicsRayQueryParameters3D.create(p + Vector3(0, 0.35, 0), p + Vector3(1.4, 0.35, 0))
	low.exclude = [player.get_rid()]
	var high := PhysicsRayQueryParameters3D.create(p + Vector3(0, 1.15, 0), p + Vector3(1.8, 1.15, 0))
	high.exclude = [player.get_rid()]
	var want := not space.intersect_ray(low).is_empty() and space.intersect_ray(high).is_empty()
	# 史萊姆不再自動跨過去（2026-11-11 教師 RDQ 3A）：撞到就踩扁，才看得到 Nice / Great / Excellent!
	if not want and _needs_help(p.x):
		var q := PhysicsRayQueryParameters3D.create(p + Vector3(0.9, 1.0, 0), p + Vector3(0.9, -3.0, 0))
		q.exclude = [player.get_rid()]
		if space.intersect_ray(q).is_empty():
			auto_hold = 0.4
			player.press_jump()
			show_toast("幫你跳！ Jump!", 0.8)
			return
	if want:
		auto_hold = 0.18
		player.vault()

## 同一個地方（前後 12 m 內）已經掉下去 2 次以上 → 到邊緣時自動幫忙跳
func _needs_help(x: float) -> bool:
	var n := 0
	for fx in fall_spots:
		if fx - x > 0.0 and fx - x < 12.0:
			n += 1
	return n >= 2

## 掉下去：泡泡包住 Ken，飄回大約 1 秒前站過的地方，不扣分
func _bubble_rescue() -> void:
	bot_bubbles += 1
	print("RUNBOT bubble at x=%.1f" % player.global_position.x)
	fall_spots.append(player.global_position.x)
	var target_x := player.global_position.x - 6.0
	if not safe_hist.is_empty():
		var i := maxi(0, safe_hist.size() - 11)
		target_x = (safe_hist[i] as Vector3).x
	sfx("fall")
	_bubble_to(target_x)

func _bubble_to(target_x: float) -> void:
	if state != "play":
		return
	state = "bubble"
	player.frozen = true
	player.reset_motion()
	# 找目標位置的地面高度
	var space := get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(Vector3(target_x, 30, 0), Vector3(target_x, -20, 0))
	q.exclude = [player.get_rid()]
	var hit := space.intersect_ray(q)
	var dest := Vector3(target_x, (hit["position"].y if not hit.is_empty() else 0.0) + 0.3, 0)
	if bubble == null or not is_instance_valid(bubble):
		bubble = MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 1.6
		sm.height = 3.2
		bubble.mesh = sm
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(0.6, 0.85, 1.0, 0.35)
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.emission_enabled = true
		m.emission = Color(0.4, 0.7, 1.0) * 0.4
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
		bubble.material_override = m
		bubble.position.y = 1.1
		player.add_child(bubble)
	bubble.visible = true
	bubble.scale = Vector3.ONE * 0.3
	player.global_position.y = maxf(player.global_position.y, -5.0)
	var tw := create_tween()
	tw.tween_property(bubble, "scale", Vector3.ONE, 0.25)
	tw.tween_property(player, "global_position", dest + Vector3(0, 2.0, 0), 1.1).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(player, "global_position", dest, 0.35)
	tw.tween_callback(func():
		bubble.visible = false
		sfx("land")
		player.frozen = false
		player.reset_motion()
		player.fwd = RUN_SPEED
		safe_hist = [dest]
		if state == "bubble":
			state = "play")
	show_toast("泡泡救援！ Bubble rescue!", 1.2)

## iPad 防過熱：平常每秒 30 張、答題 15 張、休息畫面 5 張（電腦版不限制）；連續玩 15 分鐘提醒休息
func _update_fps_cap() -> void:
	if not is_mobile or args.has("nolimit"):
		return
	var want := FPS_PLAY
	if rest_layer != null and rest_layer.visible:
		want = FPS_REST
	elif state == "quiz":
		want = FPS_QUIZ
	if Engine.max_fps != want:
		Engine.max_fps = want

func _tick_rest_timer() -> void:
	var now := Time.get_ticks_msec()
	if last_tick_ms == 0:
		last_tick_ms = now
	var dt := now - last_tick_ms
	last_tick_ms = now
	if rest_layer != null and rest_layer.visible:
		return
	if (state == "play" or state == "quiz" or state == "bubble") and dt > 0 and dt < 5000:
		play_ms += dt
	# 不在關卡中途打斷：回到選關畫面或剛過關時才跳出
	if play_ms >= REST_AFTER_MS and (state == "menu" or state == "clear"):
		_show_rest()

func _show_rest() -> void:
	if rest_layer == null:
		rest_layer = CanvasLayer.new()
		rest_layer.layer = 60
		add_child(rest_layer)
		var cover := ColorRect.new()
		cover.color = Color(0.1, 0.16, 0.3, 0.88)
		cover.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		cover.mouse_filter = Control.MOUSE_FILTER_STOP
		rest_layer.add_child(cover)
		var box := VBoxContainer.new()
		box.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
		box.alignment = BoxContainer.ALIGNMENT_CENTER
		box.add_theme_constant_override("separation", 24)
		box.grow_horizontal = Control.GROW_DIRECTION_BOTH
		box.grow_vertical = Control.GROW_DIRECTION_BOTH
		cover.add_child(box)
		# 網頁版沒有系統字型，不要放表情符號（會變方框）
		for t in [["休息一下，讓 iPad 降溫", 44], ["你已經玩了 15 分鐘。眼睛看看遠方，iPad 放平休息一下。", 28],
				["Take a short break and let the iPad cool down.", 24], ["進度已經存好，按下面的按鈕就能繼續。", 24]]:
			var l := _label(t[0], t[1])
			l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			box.add_child(l)
		var btn := Button.new()
		btn.text = "▶ 繼續 Continue"
		btn.add_theme_font_override("font", font_bold)
		btn.add_theme_font_size_override("font_size", 34)
		btn.custom_minimum_size = Vector2(320, 80)
		btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color("3fae57")
		sb.set_corner_radius_all(18)
		for st in ["normal", "hover", "pressed"]:
			btn.add_theme_stylebox_override(st, sb)
		btn.add_theme_color_override("font_color", Color.WHITE)
		btn.pressed.connect(func():
			play_ms = 0
			rest_layer.visible = false)
		box.add_child(btn)
	rest_layer.visible = true

# ---------------------------------------------------------------- 旗子、掉落、過關
func _check_flags() -> void:
	for f in flags:
		if f["on"]:
			continue
		var fp: Vector3 = f["pos"]
		if player.global_position.distance_to(fp) < 2.2:
			f["on"] = true
			(f["mat"] as StandardMaterial3D).albedo_color = Color(0.3, 0.85, 0.4)
			checkpoint = fp + Vector3(0, 0.2, 0)
			checkpoint_yaw = player.facing
			sfx("flag")
			show_toast("存檔點 Checkpoint!", 1.2)

func _respawn() -> void:
	sfx("fall")
	player.reset_motion()
	player.global_position = checkpoint
	player.set_facing(checkpoint_yaw)
	cam_yaw = checkpoint_yaw + PI
	cam_snap = true
	show_toast("回到旗子 Try again!", 1.2)

func _level_clear() -> void:
	if state == "clear" or world == null:
		return
	state = "clear"
	_freeze(true)
	var id: String = L["id"]
	cleared[id] = true
	_save_cleared()
	Host.report({"type": "cleared", "loc": id, "cleared": cleared.keys()})
	if cleared.size() >= Levels.LEVELS.size():
		Host.report({"type": "complete"})
	sfx("clear")
	if args.has("runbot"):
		if args.has("clearshot"):
			_celebrate(id)
			return
		print("RUNBOT clear level=%d secs=%.1f bubbles=%d answered=%d stomps=%d words=%s first4s_max_frame_ms=%.0f score=%d max=%d hurts=%d fruits_left=%d boxes_left=%d" % [L["n"], bot_t, bot_bubbles, level_done(id), bot_stomps, bot_words, max_dt_ms, score, score_max, bot_hurts, fruits.size(), qboxes.filter(func(b): return not b["used"]).size()])
		for b in qboxes:
			if not b["used"]:
				print("RUNBOT box_missed x=%.1f y=%.1f" % [(b["node"] as Node3D).position.x, float(b["bottom"])])
		get_tree().quit()
	if run_mode:
		_celebrate(id)
		return
	else:
		show_toast("過關！ Level Clear!\n%s" % L["zh"], 3.0)
	if not test_mode:
		get_tree().create_timer(3.2).timeout.connect(func():
			if state == "clear":
				show_menu())
