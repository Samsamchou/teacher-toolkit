extends Node3D
## Ken's Jump Island：13 關 3D 平台遊戲＋HWG5 英語題（RDQ：rdq/RDQ-spec-ken-jump-island-20261023.md）。
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

## 正式版依序解鎖（過了前一關才開下一關）；電腦測試可加 -- --unlock 全部打開
const PREVIEW := false
const TERRAIN := preload("res://assets/terrain.gdshader")
const KEN_H := 2.2
const DEATH_Y := -14.0
const SAVE_CLEARED := "user://jump_cleared.json"
const SFX := {
	"jump": "atk_wind", "triple": "atk_star", "long": "atk_wind", "land": "footstep_1", "stomp": "hit",
	"knock": "monster_laugh", "star": "unlock", "question": "question", "flag": "arrive", "clear": "victory",
	"boss": "boss_appear", "slam": "atk_fire", "defeat": "defeat", "fall": "wrong", "click": "click",
	"correct": "correct", "wrong": "wrong",
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
	boss_bar.visible = on and boss != null
	boss_hp.visible = boss_bar.visible
	touch.visible = on and is_mobile and state == "play"
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
	var sub := _label("二水英語跳跳島 HWG5　★ %d / %d　通關 %d / 13" % [total_done, bank.data["items"].size(), cleared.size()], 28)
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
	var help := _label("移動：搖桿／WASD　跳：JUMP／Space　跳遠：跑步時按 LONG／Shift　打敗兩個魔王就完成任務！", 20)
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
	mover_t = 0.0
	mats = {}
	active_star = null

func start_level(n: int, custom_layout := {}) -> void:
	_clear_level()
	if menu_layer:
		menu_layer.queue_free()
		menu_layer = null
	L = Levels.by_n(n)
	D = custom_layout if not custom_layout.is_empty() else Levels.layout(String(L["layout"]))
	world = Node3D.new()
	add_child(world)
	TH = Levels.theme(String(D.get("theme", "meadow")))
	_build_env(TH["sky"], TH["water"])
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
	if L["boss"]:
		var bd: Dictionary = D["boss"]
		boss = BossScript.new()
		world.add_child(boss)
		boss.setup(bd["pos"], bd["color"], quiz.remaining(id), float(bd.get("speed", 1.0)), bool(bd.get("double", false)))
		boss.target = player
		boss.slammed.connect(func(): sfx("slam"))
		boss.recovered_unhit.connect(_on_boss_recovered)
		star_spot_i = randi() % D["star_spots"].size()
	else:
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
	else:
		show_toast("第 %d 關 %s\n%s" % [n, L["zh"], L["en"]], 2.0)

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
	world.add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-58, 35, 0)
	sun.light_energy = 0.8
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 60.0
	world.add_child(sun)
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
	player.jumped.connect(func(k): sfx("triple" if k == "triple" else "jump"))
	player.landed.connect(func(k):
		if k != "fall":
			sfx("land"))
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
	_read_input()
	if state == "play":
		_move_movers(dt)
		_check_stars()
		_check_flags()
		_check_enemies()
		if player.global_position.y < DEATH_Y:
			_respawn()

func _process(dt: float) -> void:
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
	if boss:
		boss.stun()
		show_toast("答對了！魔王暈倒了！\n快跳到它頭上！ Jump on its head!", 2.4)
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
	touch.visible = not on and is_mobile and state == "play"
	touch.reset()
	menu_btn.disabled = on
	_duck_music(on and state == "quiz")

func _update_hud() -> void:
	var id: String = L["id"]
	hud.text = "第 %d 關 %s　★ %d / %d" % [L["n"], L["zh"], level_done(id), level_total(id)]
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
				sfx("stomp")
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
	show_toast("過關！ Level Clear!\n%s" % L["zh"], 3.0)
	if not test_mode:
		get_tree().create_timer(3.2).timeout.connect(func():
			if state == "clear":
				show_menu())
