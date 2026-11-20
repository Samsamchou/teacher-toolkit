extends Node2D
## Bento Catch — data-driven catching game with English "Clock Rounds".
## Country skin comes from res://data/<country>.json (?country=japan in the page URL).

enum S { TITLE, READY, PLAY, CLOCK, END }

# Round length comes from res://data/rules.json (shared by all four World Routines games); these are the fallbacks.
const DEF_RUN_TIME := 60.0      # seconds of catching (the timer pauses during clock rounds)
const DEF_CLOCK_EVERY := 10.0   # a clock round every 10 s of play time
const CLOCK_FALL := 7.2         # seconds until the clocks reach the tray
const CLOCK_RESULT := 2.4
const FEVER_TIME := 6.0
const CLOCK_BONUS := 100
const MAX_HEARTS := 3
const ITEM_SIZE := 104.0
const NAVY := Color(0.13, 0.15, 0.3)
const CREAM := Color(1, 0.98, 0.9)
const YELLOW := Color(1, 0.84, 0.2)
const ONES := ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
	"eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
const TENS := {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty"}
const SFX := ["catch", "catch2", "bad", "miss", "combo", "clock_in", "clock_ok", "clock_bad", "start", "tick", "win", "star", "lose"]

var font_b: Font = preload("res://fonts/ComicRelief-Bold.ttf")
var font_r: Font = preload("res://fonts/ComicRelief-Regular.ttf")

var cfg: Dictionary = {}
var country := "japan"
var lite := false
var qa := false
var rng := RandomNumberGenerator.new()

var state: int = S.TITLE
var state_t := 0.0
var W := 1280.0
var H := 720.0
var floor_y := 648.0
var tray_y := 480.0
var catch_hw := 62.0

# layers
var world: Node2D
var bg: Sprite2D
var under: Node2D
var items_layer: Node2D
var clock_layer: Node2D
var player: Sprite2D
var fx: Node2D
var hud: Control

# player
var poses: Dictionary = {}      # name -> {tex, w, h, cx, ty}
var player_h := 300.0
var player_k := 0.5
var player_x := 640.0
var player_vx := 0.0
var facing := 1.0
var pointer_down := false
var target_x := 640.0
var pose := "idle"
var pose_lock := ""
var pose_lock_t := 0.0
var anim_t := 0.0
var hop := 0.0

# run
var score := 0
var shown_score := 0.0
var hearts := MAX_HEARTS
var combo := 0
var best_combo := 0
var combo_pulse := 0.0
var play_t := 0.0
var run_time := DEF_RUN_TIME
var clock_every := DEF_CLOCK_EVERY
var rules: Dictionary = {}
var rounds_run: Array = []      # this run's clock rounds: the station's own time first, then earlier stations
var finish_rect := Rect2()
var spawn_t := 0.0
var last_spawn_x := -999.0
var fever_t := 0.0
var shake := 0.0
var heart_pulse := 0.0
var items: Array = []
var good_tex: Array = []
var bad_tex: Array = []
var particles: Array = []
var popups: Array = []

# clock rounds
var clock_idx := 0
var clocks_correct := 0
var clock_results: Array = []
var clocks: Array = []
var clock_t := 0.0
var clock_resolved := false
var clock_voice_done := false
var clock_r := 96.0
var clock_time := ""
var replay_center := Vector2.ZERO
var replay_r := 34.0
var replay_pulse := 0.0

# end
var stars := 0
var stars_shown := 0
var again_rect := Rect2()
var sent_done := false

# audio
var music: AudioStreamPlayer
var voice: AudioStreamPlayer
var sfx_players: Array = []
var sfx_i := 0
var sfx_streams: Dictionary = {}
var voice_streams: Dictionary = {}
var publish_t := 0.0
var _vis_cb: Variant = null

var sb_panel := StyleBoxFlat.new()
var sb_card := StyleBoxFlat.new()
var sb_btn := StyleBoxFlat.new()
var sb_dim := StyleBoxFlat.new()


func _ready() -> void:
	rng.randomize()
	_setup_input()
	country = _pick_country()
	cfg = _load_json("res://data/%s.json" % country)
	rules = _load_json("res://data/rules.json")
	run_time = float(rules.get("run_time", DEF_RUN_TIME))
	clock_every = float(rules.get("clock_every", DEF_CLOCK_EVERY))
	lite = WebBridge.is_touch()
	qa = WebBridge.query("qa") == "1"
	var sp := WebBridge.query("qa_speed")
	if sp.is_valid_float():
		Engine.time_scale = clampf(sp.to_float(), 0.5, 8.0)
	_build_styles()
	_build_nodes()
	_load_assets()
	_build_audio()
	get_viewport().size_changed.connect(_layout)
	_layout()
	player_x = W * 0.13
	_hook_visibility()
	_set_tab_title.call_deferred()      # deferred: the engine sets the project name as the title after _ready
	WebBridge.post("game-ready", {"country": country})
	_publish()


func _pick_country() -> String:
	var c := WebBridge.query("country").to_lower()
	for a in OS.get_cmdline_user_args():   # headless tests: -- country=egypt
		if a.begins_with("country="):
			c = a.substr(8).to_lower()
	var ok := c != ""
	for ch in c:
		if not (ch in "abcdefghijklmnopqrstuvwxyz0123456789_-"):
			ok = false
	if ok and FileAccess.file_exists("res://data/%s.json" % c):
		return c
	return "japan"


func _load_json(path: String) -> Dictionary:
	var txt := FileAccess.get_file_as_string(path)
	var d: Variant = JSON.parse_string(txt)
	if d is Dictionary:
		return d
	push_error("Bad config: " + path)
	return {}


func _setup_input() -> void:
	var map := {"move_left": [KEY_LEFT, KEY_A], "move_right": [KEY_RIGHT, KEY_D]}
	for action: String in map:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for k: int in map[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = k
			InputMap.action_add_event(action, ev)


func _build_styles() -> void:
	for sb: StyleBoxFlat in [sb_panel, sb_card, sb_btn, sb_dim]:
		sb.set_corner_radius_all(22)
		sb.set_border_width_all(4)
		sb.border_color = NAVY
		sb.anti_aliasing = true
	sb_panel.bg_color = Color(1, 1, 1, 0.9)
	sb_card.bg_color = CREAM
	sb_card.set_corner_radius_all(28)
	sb_card.set_border_width_all(5)
	sb_btn.bg_color = YELLOW
	sb_btn.set_corner_radius_all(40)
	sb_btn.set_border_width_all(6)
	sb_btn.shadow_color = Color(0, 0, 0, 0.25)
	sb_btn.shadow_size = 6
	sb_btn.shadow_offset = Vector2(0, 5)
	sb_dim.bg_color = Color(0.1, 0.12, 0.3, 0.45)
	sb_dim.set_corner_radius_all(0)
	sb_dim.set_border_width_all(0)


func _build_nodes() -> void:
	world = Node2D.new()
	add_child(world)
	bg = Sprite2D.new()
	bg.centered = false
	world.add_child(bg)
	under = Node2D.new()
	under.draw.connect(_draw_under)
	world.add_child(under)
	player = Sprite2D.new()
	player.centered = false
	world.add_child(player)
	items_layer = Node2D.new()
	world.add_child(items_layer)
	clock_layer = Node2D.new()
	clock_layer.draw.connect(_draw_clocks)
	world.add_child(clock_layer)
	fx = Node2D.new()
	fx.draw.connect(_draw_fx)
	world.add_child(fx)
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Control.new()
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.draw.connect(_draw_hud)
	layer.add_child(hud)


func _load_assets() -> void:
	bg.texture = load(str(cfg.get("background", "")))
	var p: Dictionary = cfg.get("player", {})
	player_h = float(p.get("height", 300))
	catch_hw = float(p.get("catch_half_width", 62))
	var meta: Dictionary = _load_json(str(p.get("meta", "")))
	var pp: Dictionary = p.get("poses", {})
	for name: String in pp:
		var tex: Texture2D = load(str(pp[name]))
		var m: Dictionary = meta.get(name, {})
		poses[name] = {"tex": tex, "w": float(tex.get_width()), "h": float(tex.get_height()),
			"cx": float(m.get("tray_cx", 0.5)), "ty": float(m.get("tray_y", 0.47))}
	for it: Dictionary in cfg.get("good_items", []):
		good_tex.append({"tex": load(str(it["art"])), "points": int(it.get("points", 10))})
	for it: Dictionary in cfg.get("bad_items", []):
		bad_tex.append({"tex": load(str(it["art"]))})


func _build_audio() -> void:
	music = AudioStreamPlayer.new()
	var ms: AudioStream = load("res://audio/music_loop.ogg")
	if ms is AudioStreamOggVorbis:
		(ms as AudioStreamOggVorbis).loop = true
	music.stream = ms
	music.volume_db = -15.0
	add_child(music)
	voice = AudioStreamPlayer.new()
	voice.volume_db = 3.0
	add_child(voice)
	for i in 6:
		var a := AudioStreamPlayer.new()
		add_child(a)
		sfx_players.append(a)
	for n: String in SFX:
		sfx_streams[n] = load("res://audio/sfx/%s.wav" % n)
	var vdir := str(cfg.get("voice_dir", "res://audio/times"))
	var vtimes: Array = (cfg.get("review_times", []) as Array).duplicate()
	for r: Dictionary in cfg.get("clock_rounds", []):
		vtimes.append(r["time"])
	for vt: Variant in vtimes:
		var key := _time_key(str(vt))
		if voice_streams.has(key):
			continue
		var path := "%s/%s.mp3" % [vdir, key]
		if ResourceLoader.exists(path):
			voice_streams[key] = load(path)
		else:
			push_warning("Missing voice file: " + path)


func _hook_visibility() -> void:
	if not WebBridge.is_web():
		return
	_vis_cb = JavaScriptBridge.create_callback(_on_js_visibility)
	var doc: JavaScriptObject = JavaScriptBridge.get_interface("document")
	if doc != null:
		doc.addEventListener("visibilitychange", _vis_cb)


func _on_js_visibility(_args: Array) -> void:
	var hidden: Variant = JavaScriptBridge.eval("document.hidden ? 1 : 0", true)
	AudioServer.set_bus_mute(0, hidden != null and int(hidden) == 1)
	_release_inputs()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		_release_inputs()


func _release_inputs() -> void:
	pointer_down = false
	Input.action_release("move_left")
	Input.action_release("move_right")


func _layout() -> void:
	var sz := get_viewport_rect().size
	W = sz.x
	H = sz.y
	if bg.texture != null:
		var ts := bg.texture.get_size()
		var s: float = maxf(W / ts.x, H / ts.y)
		bg.scale = Vector2(s, s)
		bg.position = Vector2((W - ts.x * s) * 0.5, H - ts.y * s)
		floor_y = H - ts.y * s * (1.0 - float(cfg.get("floor_y", 0.9)))
	var idle: Dictionary = poses.get("idle", {})
	if not idle.is_empty():
		player_k = player_h / float(idle["h"])
		tray_y = floor_y - player_h * (1.0 - float(idle["ty"]))
	clock_r = minf(minf(125.0, W * 0.1), (tray_y - 110.0) / 3.77)
	player_x = clampf(player_x, 60.0, W - 60.0)


# ---------------------------------------------------------------- helpers

func _time_key(t: String) -> String:
	var v := ClockDraw.parse(t)
	return "%02d%02d" % [v.x, v.y]


func _time_words(t: String) -> String:
	var v := ClockDraw.parse(t)
	var hw: String = ONES[v.x]
	if v.y == 0:
		return hw + " o'clock"
	if v.y < 10:
		return hw + " oh " + ONES[v.y]
	if v.y < 20:
		return hw + " " + ONES[v.y]
	var s: String = hw + " " + TENS[v.y / 10]
	if v.y % 10 != 0:
		s += "-" + ONES[v.y % 10]
	return s


func _sfx(n: String, pitch: float = 1.0, vol: float = -4.0) -> void:
	var a: AudioStreamPlayer = sfx_players[sfx_i]
	sfx_i = (sfx_i + 1) % sfx_players.size()
	a.stream = sfx_streams.get(n)
	a.pitch_scale = pitch
	a.volume_db = vol
	a.play()


func _say() -> void:
	var st: AudioStream = voice_streams.get(_time_key(clock_time))
	if st != null:
		voice.stream = st
		voice.play()
	replay_pulse = 1.0


func _burst(pos: Vector2, col: Color, n: int, speed: float = 320.0, star: bool = false) -> void:
	if lite:
		n = int(ceil(n * 0.5))
	for i in n:
		if particles.size() > 220:
			return
		var a := rng.randf() * TAU
		var v := Vector2(cos(a), sin(a)) * speed * rng.randf_range(0.35, 1.0)
		v.y -= speed * 0.4
		var c := col.lightened(rng.randf_range(0.0, 0.5))
		particles.append({"p": pos, "v": v, "t": 0.0, "life": rng.randf_range(0.4, 0.8), "c": c,
			"s": rng.randf_range(5.0, 11.0), "star": star or rng.randf() < 0.3, "g": 900.0})


func _popup(text: String, pos: Vector2, col: Color, size: int = 40) -> void:
	popups.append({"text": text, "p": pos, "t": 0.0, "c": col, "s": size})


func _lane_x(i: int) -> float:
	return W * (2.0 * i + 1.0) / 6.0


func _nearest_lane() -> int:
	return clampi(int(floor(player_x / (W / 3.0))), 0, 2)


func _combo_tier() -> int:
	return 1 + mini(combo / 6, 2)


# ---------------------------------------------------------------- flow

func _start_run() -> void:
	for it: Dictionary in items:
		(it["n"] as Node).queue_free()
	items.clear()
	clocks.clear()
	particles.clear()
	popups.clear()
	score = 0
	shown_score = 0.0
	hearts = MAX_HEARTS
	combo = 0
	best_combo = 0
	play_t = 0.0
	spawn_t = 0.6
	fever_t = 0.0
	clock_idx = 0
	clocks_correct = 0
	clock_results.clear()
	_build_rounds()
	stars = 0
	stars_shown = 0
	sent_done = false
	items_layer.modulate = Color.WHITE
	player_x = W * 0.5
	target_x = player_x
	pointer_down = false
	pose_lock = ""
	_set_state(S.READY)
	_sfx("start")
	if not music.playing:
		music.play()
	music.pitch_scale = 1.0


func _set_state(s: int) -> void:
	state = s
	state_t = 0.0
	_publish()


func _auto_distractors(t: String) -> Array:
	var v := ClockDraw.parse(t)
	return ["%d:%02d" % [v.x, (v.y + 30) % 60], "%d:%02d" % [v.x % 12 + 1, v.y]]


func _set_tab_title() -> void:
	WebBridge.set_title(str(cfg.get("title", "Bento Catch")))


func _build_rounds() -> void:
	# round 1 = this station's time; then the times of the stations already visited; then this station's other rounds
	rounds_run.clear()
	var base: Array = cfg.get("clock_rounds", [])
	if base.is_empty():
		return
	var want := clampi(int(rules.get("clock_rounds", 4)), 1, 8)
	var pool: Array = []
	var used := {str((base[0] as Dictionary)["time"]): true}
	var review: Array = (cfg.get("review_times", []) as Array).duplicate()
	review.shuffle()
	for t: Variant in review:
		if not used.has(str(t)) and voice_streams.has(_time_key(str(t))):
			used[str(t)] = true
			pool.append({"time": str(t), "distractors": _auto_distractors(str(t))})
	var rest: Array = base.slice(1)
	rest.shuffle()
	for r: Dictionary in rest:
		if not used.has(str(r["time"])):
			used[str(r["time"])] = true
			pool.append(r)
	pool = pool.slice(0, want - 1)
	pool.shuffle()
	rounds_run.append(base[0])
	rounds_run.append_array(pool)


func _can_finish() -> bool:
	return state == S.PLAY and not rounds_run.is_empty() and clock_idx >= rounds_run.size() and play_t < run_time


func _begin_clock_round() -> void:
	var rounds: Array = rounds_run
	var rd: Dictionary = rounds[clock_idx]
	clock_time = str(rd["time"])
	var times: Array = [clock_time]
	for d: Variant in rd.get("distractors", []):
		times.append(str(d))
	var order: Array = [0, 1, 2]
	for i in range(2, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp: int = order[i]
		order[i] = order[j]
		order[j] = tmp
	var rims: Array = [Color(1, 0.45, 0.4), Color(0.35, 0.7, 1), Color(1, 0.8, 0.25)]
	clocks.clear()
	for lane in 3:
		var k: int = order[lane]
		var v := ClockDraw.parse(str(times[k]))
		clocks.append({"time": str(times[k]), "h": v.x, "m": v.y, "lane": lane, "ok": k == 0,
			"y": -clock_r * 1.3, "mark": 0, "rim": rims[lane]})
	clock_t = 0.0
	clock_resolved = false
	clock_voice_done = false
	_sfx("clock_in")
	_set_state(S.CLOCK)


func _resolve_clock_round() -> void:
	clock_resolved = true
	clock_t = 0.0
	var lane := _nearest_lane()
	var chosen: Dictionary = clocks[lane]
	var right := bool(chosen["ok"])
	for c: Dictionary in clocks:
		if bool(c["ok"]):
			c["mark"] = 1
	var pos := Vector2(_lane_x(lane), float(chosen["y"]))
	if right:
		clocks_correct += 1
		score += CLOCK_BONUS
		fever_t = FEVER_TIME
		_sfx("clock_ok")
		_burst(pos, YELLOW, 40, 520.0, true)
		_popup("+%d" % CLOCK_BONUS, pos + Vector2(0, -clock_r - 20), Color(0.2, 0.85, 0.35), 64)
		pose_lock = "happy"
		pose_lock_t = CLOCK_RESULT
	else:
		chosen["mark"] = 2
		_lose_heart()
		_sfx("clock_bad")
		pose_lock = "sad"
		pose_lock_t = CLOCK_RESULT
	clock_results.append(right)
	_publish()


func _end_clock_round() -> void:
	clocks.clear()
	clock_idx += 1
	if hearts <= 0:
		_finish()
		return
	if fever_t > 0.0:
		fever_t = FEVER_TIME
		music.pitch_scale = 1.18
	_set_state(S.PLAY)


func _lose_heart() -> void:
	hearts = maxi(0, hearts - 1)
	combo = 0
	shake = 14.0
	heart_pulse = 1.0


func _finish() -> void:
	fever_t = 0.0
	music.pitch_scale = 1.0
	music.volume_db = -22.0
	stars = 1
	var s2: Dictionary = rules.get("star2", {})
	var s3: Dictionary = rules.get("star3", {})
	if score >= int(s2.get("score", 550)) and clocks_correct >= int(s2.get("clocks", 2)):
		stars = 2
	if score >= int(s3.get("score", 1250)) and clocks_correct >= int(s3.get("clocks", 3)):
		stars = 3
	if hearts <= 0:
		stars = mini(stars, 2)
	_sfx("win" if hearts > 0 else "lose")
	pose_lock = "happy" if stars >= 2 else "idle"
	pose_lock_t = 9999.0
	player_x = W * 0.13
	pointer_down = false
	_set_state(S.END)
	if not sent_done:
		sent_done = true
		WebBridge.post("game-done", {"country": country, "score": score, "stars": stars, "clocksCorrect": clocks_correct})


func _publish() -> void:
	var d := {"state": S.keys()[state], "score": score, "hearts": hearts, "stars": stars,
		"clocksCorrect": clocks_correct, "clockIdx": clock_idx, "country": country, "w": W, "h": H,
		"playT": snappedf(play_t, 0.1), "playerX": snappedf(player_x, 1.0)}
	if qa:
		d["fever"] = fever_t > 0.0
		d["againRect"] = [again_rect.position.x, again_rect.position.y, again_rect.size.x, again_rect.size.y]
		d["replay"] = [replay_center.x, replay_center.y]
		d["rounds"] = rounds_run.size()
		if _can_finish():
			d["finish"] = [finish_rect.get_center().x, finish_rect.get_center().y]
		for c: Dictionary in clocks:
			if bool(c["ok"]):
				d["okLaneX"] = _lane_x(int(c["lane"]))
		# for the browser test bot: bad items about to reach the tray, and the lowest good item
		var bad_x: Array = []
		var good := Vector2(-1, -1e9)
		for it: Dictionary in items:
			var n: Node2D = it["n"]
			if not bool(it["live"]) or n.position.y > tray_y:
				continue
			if bool(it["bad"]):
				if n.position.y > tray_y - 320.0:
					bad_x.append(snappedf(n.position.x, 1.0))
			elif n.position.y > good.y:
				good = n.position
		d["badX"] = bad_x
		d["catchHW"] = catch_hw + ITEM_SIZE * 0.5 * 0.55
		if good.x >= 0.0:
			d["goodX"] = snappedf(good.x, 1.0)
	WebBridge.publish(d)


# ---------------------------------------------------------------- input

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_on_press(event.position)
		else:
			pointer_down = false
	elif event is InputEventMouseMotion and pointer_down:
		target_x = event.position.x
	elif event is InputEventKey and event.pressed and not event.echo:
		var k: int = event.physical_keycode
		if k == KEY_SPACE or k == KEY_ENTER or k == KEY_KP_ENTER:
			if state == S.TITLE or (state == S.END and state_t > 1.5):
				_start_run()
			elif state == S.CLOCK and not clock_resolved:
				_say()
		elif k == KEY_R and state == S.CLOCK and not clock_resolved:
			_say()
		elif k == KEY_F and _can_finish():
			_finish()


func _on_press(pos: Vector2) -> void:
	match state:
		S.TITLE:
			_start_run()
		S.END:
			if state_t > 1.5 and again_rect.grow(12).has_point(pos):
				_start_run()
		S.CLOCK:
			if not clock_resolved and pos.distance_to(replay_center) < replay_r + 18.0:
				_say()
				return
			pointer_down = true
			target_x = pos.x
		_:
			if _can_finish() and finish_rect.grow(10).has_point(pos):
				_finish()
				return
			pointer_down = true
			target_x = pos.x


# ---------------------------------------------------------------- update

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	state_t += delta
	anim_t += delta
	combo_pulse = maxf(0.0, combo_pulse - delta * 4.0)
	heart_pulse = maxf(0.0, heart_pulse - delta * 2.5)
	replay_pulse = maxf(0.0, replay_pulse - delta * 2.0)
	shown_score = move_toward(shown_score, float(score), maxf(120.0, absf(score - shown_score) * 6.0) * delta)

	match state:
		S.READY:
			_move_player(delta)
			if state_t > 1.5:
				_set_state(S.PLAY)
		S.PLAY:
			_move_player(delta)
			_update_play(delta)
		S.CLOCK:
			_move_player(delta)
			_update_clock(delta)
		S.END:
			_update_items(delta, false)
			var want := clampi(int((state_t - 0.5) / 0.45) + 1, 0, stars) if state_t > 0.5 else 0
			if want > stars_shown:
				stars_shown = want
				_sfx("star", 0.9 + 0.12 * stars_shown)
				_burst(Vector2(W * 0.5 + (stars_shown - 2) * 110.0, H * 0.5 - 95.0), YELLOW, 16, 300.0, true)

	if fever_t > 0.0 and state == S.PLAY:
		fever_t -= delta
		if rng.randf() < (0.25 if lite else 0.5):
			particles.append({"p": Vector2(rng.randf() * W, -10.0), "v": Vector2(rng.randf_range(-30, 30), rng.randf_range(160, 320)),
				"t": 0.0, "life": 1.6, "c": Color.from_hsv(rng.randf(), 0.6, 1.0), "s": rng.randf_range(6, 12), "star": true, "g": 0.0})
		if fever_t <= 0.0:
			music.pitch_scale = 1.0

	_update_fx(delta)
	_update_player_sprite(delta)
	shake = maxf(0.0, shake - delta * 40.0)
	world.position = Vector2(rng.randf_range(-shake, shake), rng.randf_range(-shake, shake)) if shake > 0.1 else Vector2.ZERO
	items_layer.modulate.a = move_toward(items_layer.modulate.a, 0.28 if state == S.CLOCK else 1.0, delta * 3.0)

	publish_t -= delta
	if publish_t <= 0.0:
		publish_t = 0.1 if qa else 0.25
		_publish()
	under.queue_redraw()
	clock_layer.queue_redraw()
	fx.queue_redraw()
	hud.queue_redraw()


func _move_player(delta: float) -> void:
	var before := player_x
	var kb := Input.get_axis("move_left", "move_right")
	if kb != 0.0:
		pointer_down = false
		player_x += kb * 720.0 * delta
	elif pointer_down:
		player_x = move_toward(player_x, target_x, 1900.0 * delta)
	player_x = clampf(player_x, 60.0, W - 60.0)
	player_vx = (player_x - before) / maxf(delta, 0.001)
	if absf(player_vx) > 30.0:
		facing = signf(player_vx)


func _update_play(delta: float) -> void:
	play_t += delta
	var prog := clampf(play_t / run_time, 0.0, 1.0)
	spawn_t -= delta
	if spawn_t <= 0.0 and play_t < run_time - 1.0:
		_spawn_item(prog)
		spawn_t = lerpf(0.95, 0.42, prog) * rng.randf_range(0.8, 1.2)
		if fever_t > 0.0:
			spawn_t *= 0.75
	_update_items(delta, true)
	if hearts <= 0:
		_finish()
		return
	var rounds: Array = rounds_run
	if clock_idx < rounds.size() and play_t >= clock_every * (clock_idx + 1):
		_begin_clock_round()
		return
	if play_t >= run_time and items.is_empty():
		_finish()
	elif play_t >= run_time + 4.0:
		_finish()


func _spawn_item(prog: float) -> void:
	var bad := rng.randf() < lerpf(0.22, 0.36, prog) and fever_t <= 0.0 or (fever_t > 0.0 and rng.randf() < 0.12)
	var src: Dictionary = bad_tex.pick_random() if bad else good_tex.pick_random()
	var x := rng.randf_range(70.0, W - 70.0)
	for i in 6:
		if absf(x - last_spawn_x) > 170.0:
			break
		x = rng.randf_range(70.0, W - 70.0)
	last_spawn_x = x
	var spr := Sprite2D.new()
	var tex: Texture2D = src["tex"]
	spr.texture = tex
	var sc: float = ITEM_SIZE / maxf(tex.get_width(), tex.get_height())
	spr.scale = Vector2(sc, sc)
	spr.position = Vector2(x, -ITEM_SIZE * 0.6)
	spr.rotation = rng.randf_range(-0.3, 0.3)
	items_layer.add_child(spr)
	items.append({"n": spr, "bad": bad, "points": int(src.get("points", 0)), "live": true, "dead_t": 0.0,
		"vy": lerpf(250.0, 500.0, prog) * rng.randf_range(0.9, 1.15), "vx": 0.0,
		"rot": rng.randf_range(-1.2, 1.2), "half": ITEM_SIZE * 0.5})


func _update_items(delta: float, active: bool) -> void:
	for i in range(items.size() - 1, -1, -1):
		var it: Dictionary = items[i]
		var n: Sprite2D = it["n"]
		if not bool(it["live"]):
			it["dead_t"] = float(it["dead_t"]) + delta
			n.position += Vector2(float(it["vx"]), float(it["vy"])) * delta
			it["vy"] = float(it["vy"]) + 1400.0 * delta
			n.rotation += float(it["rot"]) * 4.0 * delta
			n.modulate.a = maxf(0.0, 1.0 - float(it["dead_t"]) / 0.45)
			if float(it["dead_t"]) > 0.45:
				n.queue_free()
				items.remove_at(i)
			continue
		if not active:
			it["live"] = false
			it["vy"] = -200.0
			continue
		var half: float = it["half"]
		var y0: float = n.position.y + half * 0.3
		n.position.y += float(it["vy"]) * delta
		n.rotation += float(it["rot"]) * delta
		var y1: float = n.position.y + half * 0.3
		if y0 < tray_y and y1 >= tray_y and absf(n.position.x - player_x) < catch_hw + half * 0.55:
			_catch_item(it)
			continue
		if n.position.y > floor_y - half * 0.4:
			it["live"] = false
			it["vy"] = -260.0
			it["vx"] = rng.randf_range(-160.0, 160.0)
			if not bool(it["bad"]):
				combo = 0
				shake = maxf(shake, 5.0)
				_sfx("miss", 1.0, -9.0)
				_burst(Vector2(n.position.x, floor_y), Color(0.8, 0.7, 0.55), 6, 160.0)


func _catch_item(it: Dictionary) -> void:
	var n: Sprite2D = it["n"]
	var pos := Vector2(n.position.x, tray_y)
	it["live"] = false
	if bool(it["bad"]):
		it["vy"] = -520.0
		it["vx"] = rng.randf_range(-260.0, 260.0)
		_lose_heart()
		_sfx("bad")
		_popup("Oops!", pos + Vector2(0, -player_h * 0.56), Color(0.95, 0.25, 0.25), 44)
		_burst(pos, Color(0.5, 0.5, 0.55), 10, 260.0)
		pose_lock = "sad"
		pose_lock_t = 0.7
		return
	it["vy"] = 0.0
	it["dead_t"] = 0.25
	var tw := n.create_tween()
	tw.tween_property(n, "scale", n.scale * 0.5, 0.18)
	tw.parallel().tween_property(n, "position", Vector2(player_x, tray_y - 10.0), 0.18)
	combo += 1
	best_combo = maxi(best_combo, combo)
	combo_pulse = 1.0
	var gain := int(it["points"]) * _combo_tier() * (2 if fever_t > 0.0 else 1)
	score += gain
	_sfx("catch", minf(1.0 + combo * 0.04, 1.8), -5.0)
	if combo % 6 == 0:
		_sfx("combo")
		_popup("Combo x%d!" % combo, pos + Vector2(0, -player_h * 0.56 - 60), Color(1, 0.55, 0.1), 50)
		pose_lock = "happy"
		pose_lock_t = 0.6
	_popup("+%d" % gain, pos + Vector2(rng.randf_range(-20, 20), -player_h * 0.56), YELLOW if fever_t <= 0.0 else Color(1, 0.5, 0.9), 38 + mini(gain / 4, 22))
	_burst(pos, YELLOW if fever_t <= 0.0 else Color.from_hsv(rng.randf(), 0.6, 1.0), 9 + _combo_tier() * 3, 300.0)


func _update_clock(delta: float) -> void:
	clock_t += delta
	_update_items(0.0, true)
	if clock_resolved:
		# lift the clocks back up so the answer is shown clear of the pupil
		for c: Dictionary in clocks:
			c["y"] = lerpf(float(c["y"]), 104.0 + clock_r * 1.2, minf(1.0, delta * 9.0))
		if clock_t >= CLOCK_RESULT:
			_end_clock_round()
		return
	if not clock_voice_done and clock_t >= 0.75:
		clock_voice_done = true
		_say()
	var y_start := 104.0 + clock_r * 1.2
	var y_end := tray_y - clock_r * 1.25
	for c: Dictionary in clocks:
		if clock_t < 0.9:
			var e := clampf((clock_t - 0.15 * int(c["lane"])) / 0.6, 0.0, 1.0)
			c["y"] = lerpf(-clock_r * 1.3, y_start, 1.0 - pow(1.0 - e, 3.0))
		else:
			c["y"] = lerpf(y_start, y_end, clampf((clock_t - 0.9) / (CLOCK_FALL - 0.9), 0.0, 1.0))
	if clock_t >= CLOCK_FALL:
		_resolve_clock_round()


func _update_fx(delta: float) -> void:
	for i in range(particles.size() - 1, -1, -1):
		var p: Dictionary = particles[i]
		p["t"] = float(p["t"]) + delta
		var v: Vector2 = p["v"]
		v.y += float(p["g"]) * delta
		p["v"] = v
		p["p"] = (p["p"] as Vector2) + v * delta
		if float(p["t"]) >= float(p["life"]):
			particles.remove_at(i)
	for i in range(popups.size() - 1, -1, -1):
		var q: Dictionary = popups[i]
		q["t"] = float(q["t"]) + delta
		q["p"] = (q["p"] as Vector2) + Vector2(0, -70.0 * delta)
		if float(q["t"]) > 0.9:
			popups.remove_at(i)


func _update_player_sprite(delta: float) -> void:
	if pose_lock != "":
		pose_lock_t -= delta
		if pose_lock_t <= 0.0:
			pose_lock = ""
	var moving := absf(player_vx) > 60.0 and (state == S.PLAY or state == S.CLOCK or state == S.READY)
	pose = pose_lock if pose_lock != "" else ("run" if moving else "idle")
	if fever_t > 0.0 and pose == "idle":
		pose = "happy"
	if not poses.has(pose):
		pose = "idle"
	var d: Dictionary = poses[pose]
	var flip := pose == "run" and (facing < 0.0) == bool((cfg.get("player", {}) as Dictionary).get("run_faces_right", true))
	var w: float = float(d["w"]) * player_k
	var h: float = float(d["h"]) * player_k
	var cx: float = float(d["cx"])
	if flip:
		cx = 1.0 - cx
	hop = 0.0
	if pose == "run":
		hop = absf(sin(anim_t * 16.0)) * 7.0
	elif pose == "happy":
		hop = absf(sin(anim_t * 9.0)) * 16.0
	player.texture = d["tex"]
	player.flip_h = flip
	player.scale = Vector2(player_k, player_k)
	# keep the tray centred on player_x and at tray_y in every pose; feet stay on the floor
	var top := floor_y - h
	if pose == "run":
		top = tray_y - float(d["ty"]) * h
		top = minf(top, floor_y - h)
	player.position = Vector2(player_x - cx * w, top - hop)


# ---------------------------------------------------------------- drawing

func _ctext(ci: CanvasItem, font: Font, text: String, center: Vector2, size: int, col: Color, outline: int = 0, ocol: Color = NAVY) -> void:
	var sz := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size)
	var base := Vector2(center.x - sz.x * 0.5, center.y + (font.get_ascent(size) - font.get_descent(size)) * 0.5)
	if outline > 0:
		ci.draw_string_outline(font, base, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline, ocol)
	ci.draw_string(font, base, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)


func _ltext(ci: CanvasItem, font: Font, text: String, left_mid: Vector2, size: int, col: Color, outline: int = 0, ocol: Color = NAVY) -> void:
	var base := Vector2(left_mid.x, left_mid.y + (font.get_ascent(size) - font.get_descent(size)) * 0.5)
	if outline > 0:
		ci.draw_string_outline(font, base, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline, ocol)
	ci.draw_string(font, base, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)


func _star_pts(c: Vector2, r: float, rot: float = 0.0) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in 10:
		var a := rot - PI / 2.0 + TAU * i / 10.0
		pts.append(c + Vector2(cos(a), sin(a)) * (r if i % 2 == 0 else r * 0.46))
	return pts


func _draw_star(ci: CanvasItem, c: Vector2, r: float, col: Color, outline: float = 0.0, rot: float = 0.0) -> void:
	var pts := _star_pts(c, r, rot)
	ci.draw_colored_polygon(pts, col)
	if outline > 0.0:
		pts.append(pts[0])
		ci.draw_polyline(pts, NAVY, outline, true)


func _draw_heart(ci: CanvasItem, c: Vector2, r: float, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in 28:
		var t := TAU * i / 28.0
		var x := 16.0 * pow(sin(t), 3.0)
		var y := -(13.0 * cos(t) - 5.0 * cos(2 * t) - 2.0 * cos(3 * t) - cos(4 * t))
		pts.append(c + Vector2(x, y) * r / 17.0)
	ci.draw_colored_polygon(pts, col)
	pts.append(pts[0])
	ci.draw_polyline(pts, NAVY, 4.0, true)


func _draw_speaker(ci: CanvasItem, c: Vector2, r: float, col: Color) -> void:
	var s := r * 0.5
	var pts := PackedVector2Array([c + Vector2(-s * 1.1, -s * 0.4), c + Vector2(-s * 0.5, -s * 0.4), c + Vector2(s * 0.1, -s),
		c + Vector2(s * 0.1, s), c + Vector2(-s * 0.5, s * 0.4), c + Vector2(-s * 1.1, s * 0.4)])
	ci.draw_colored_polygon(pts, col)
	ci.draw_arc(c + Vector2(s * 0.15, 0), s * 0.6, -0.9, 0.9, 12, col, r * 0.1, true)
	ci.draw_arc(c + Vector2(s * 0.15, 0), s * 1.05, -0.9, 0.9, 16, col, r * 0.1, true)


func _draw_under() -> void:
	# lane highlight during a clock round
	if state == S.CLOCK and not clock_resolved and clock_t > 0.9:
		var lane := _nearest_lane()
		var x0 := W / 3.0 * lane
		under.draw_rect(Rect2(x0 + 6, 100, W / 3.0 - 12, floor_y - 100), Color(1, 1, 1, 0.16 + 0.05 * sin(anim_t * 6.0)))
		under.draw_rect(Rect2(x0 + 6, 100, W / 3.0 - 12, floor_y - 100), Color(1, 0.84, 0.2, 0.7), false, 5.0)
	# player shadow (shrinks while hopping)
	var sh := 1.0 - minf(hop, 20.0) / 50.0
	var pts := PackedVector2Array()
	for i in 20:
		var a := TAU * i / 20.0
		pts.append(Vector2(player_x + cos(a) * 62.0 * sh, floor_y + 2.0 + sin(a) * 11.0 * sh))
	under.draw_colored_polygon(pts, Color(0.2, 0.12, 0.05, 0.25))


func _draw_clocks() -> void:
	if clocks.is_empty():
		return
	var lane := _nearest_lane()
	for c: Dictionary in clocks:
		var pos := Vector2(_lane_x(int(c["lane"])), float(c["y"]))
		var r := clock_r
		if not clock_resolved and int(c["lane"]) == lane and clock_t > 0.9:
			r *= 1.0 + 0.04 * sin(anim_t * 8.0)
			clock_layer.draw_arc(pos, r * 1.12, 0, TAU, 48, Color(1, 1, 1, 0.85), 6.0, true)
		if clock_resolved and int(c["mark"]) == 0:
			clock_layer.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		ClockDraw.draw(clock_layer, pos, r, int(c["h"]), int(c["m"]), c["rim"], font_b, int(c["mark"]) if clock_resolved else 0)
		if clock_resolved and int(c["mark"]) == 1:
			# after answering, show the digital time under the correct clock as feedback
			var rect := Rect2(pos.x - 86, pos.y + r * 1.2, 172, 54)
			clock_layer.draw_style_box(sb_panel, rect)
			_ctext(clock_layer, font_b, str(c["time"]), rect.get_center(), 38, Color(0.1, 0.6, 0.25))
		elif clock_resolved and int(c["mark"]) == 2:
			var s := r * 0.5
			clock_layer.draw_line(pos + Vector2(-s, -s), pos + Vector2(s, s), Color(0.92, 0.2, 0.2), 16.0, true)
			clock_layer.draw_line(pos + Vector2(-s, s), pos + Vector2(s, -s), Color(0.92, 0.2, 0.2), 16.0, true)


func _draw_fx() -> void:
	for p: Dictionary in particles:
		var k := 1.0 - float(p["t"]) / float(p["life"])
		var col: Color = p["c"]
		col.a = clampf(k * 1.5, 0.0, 1.0)
		if bool(p["star"]):
			_draw_star(fx, p["p"], float(p["s"]) * (0.6 + k * 0.6), col, 0.0, float(p["t"]) * 5.0)
		else:
			fx.draw_circle(p["p"], float(p["s"]) * k * 0.6, col)
	for q: Dictionary in popups:
		var t: float = q["t"]
		var sc := 1.0 + 0.5 * maxf(0.0, 1.0 - t * 6.0)
		var col: Color = q["c"]
		var a := clampf((0.9 - t) * 4.0, 0.0, 1.0)
		col.a = a
		_ctext(fx, font_b, str(q["text"]), q["p"], int(float(q["s"]) * sc), col, 10, Color(NAVY, a))


func _draw_hud() -> void:
	match state:
		S.TITLE:
			_draw_title()
			return
		S.END:
			_draw_stats()
			_draw_end()
			return
	_draw_stats()
	if _can_finish():
		# all clock rounds answered: the pupil may stop here and collect the stamp
		finish_rect = Rect2(W - 16 - 236, 134, 236, 66)
		var fk := 1.0 + 0.03 * sin(anim_t * 5.0)
		var fr := Rect2(finish_rect.get_center() - finish_rect.size * fk * 0.5, finish_rect.size * fk)
		hud.draw_style_box(sb_btn, fr)
		_ctext(hud, font_b, "Finish", fr.get_center() + Vector2(-22, 0), 34, Color.WHITE, 8)
		var cc := fr.get_center() + Vector2(74, 0)
		hud.draw_polyline(PackedVector2Array([cc + Vector2(-14, 0), cc + Vector2(-4, 11), cc + Vector2(15, -12)]), NAVY, 7.0, true)
	if state == S.READY:
		var txt := "Ready?" if state_t < 0.9 else "Go!"
		var k := (state_t if state_t < 0.9 else state_t - 0.9)
		var size := int(110.0 * (1.0 + 0.4 * maxf(0.0, 1.0 - k * 5.0)))
		_ctext(hud, font_b, txt, Vector2(W * 0.5, H * 0.36), size, YELLOW, 22)
	elif state == S.CLOCK:
		_draw_clock_banner()
	elif fever_t > 0.0:
		var col := Color.from_hsv(fmod(anim_t * 0.9, 1.0), 0.75, 1.0)
		_ctext(hud, font_b, "FEVER  x2!", Vector2(W * 0.5, 44), 50 + int(4.0 * sin(anim_t * 10.0)), col, 14)
		var bw := 260.0
		hud.draw_rect(Rect2(W * 0.5 - bw * 0.5, 78, bw, 12), NAVY)
		hud.draw_rect(Rect2(W * 0.5 - bw * 0.5 + 3, 81, (bw - 6) * fever_t / FEVER_TIME, 6), col)
		# glowing frame
		hud.draw_rect(Rect2(4, 4, W - 8, H - 8), Color(col, 0.75), false, 8.0)


func _draw_stats() -> void:
	# score (top-left)
	hud.draw_style_box(sb_panel, Rect2(16, 12, 236, 78))
	_ltext(hud, font_b, "SCORE", Vector2(34, 32), 20, Color(0.4, 0.42, 0.55))
	_ltext(hud, font_b, str(int(round(shown_score))), Vector2(34, 64), 40, NAVY)
	if combo >= 2 and state != S.END:
		var sz := int(34.0 * (1.0 + 0.35 * combo_pulse))
		_ltext(hud, font_b, "Combo x%d" % combo, Vector2(26, 118), sz, Color(1, 0.6, 0.1), 10)
		if _combo_tier() > 1:
			_ltext(hud, font_b, "Points x%d" % _combo_tier(), Vector2(26, 154), 24, Color(1, 0.9, 0.4), 8)
	# hearts + timer (top-right)
	var px := W - 16 - 236
	hud.draw_style_box(sb_panel, Rect2(px, 12, 236, 78))
	for i in MAX_HEARTS:
		var c := Vector2(px + 42 + i * 50, 38)
		var r := 19.0
		if i == hearts and heart_pulse > 0.0:
			r *= 1.0 + heart_pulse * 0.6
		_draw_heart(hud, c, r, Color(0.95, 0.22, 0.3) if i < hearts else Color(0.8, 0.8, 0.85))
	var left := clampf(1.0 - play_t / run_time, 0.0, 1.0)
	hud.draw_rect(Rect2(px + 20, 66, 150, 12), NAVY)
	hud.draw_rect(Rect2(px + 23, 69, 144 * left, 6), Color(0.3, 0.8, 0.4) if left > 0.25 else Color(0.95, 0.3, 0.25))
	_ltext(hud, font_b, "%d" % int(ceil(maxf(0.0, run_time - play_t))), Vector2(px + 180, 71), 24, NAVY)
	# clock round pips
	var total: int = rounds_run.size() if not rounds_run.is_empty() else mini(int(rules.get("clock_rounds", 4)), (cfg.get("clock_rounds", []) as Array).size())
	for i in total:
		var c := Vector2(W - 30 - (total - 1 - i) * 34, 112)
		var col := Color(1, 1, 1, 0.85)
		if i < clock_results.size():
			col = Color(0.25, 0.8, 0.35) if bool(clock_results[i]) else Color(0.92, 0.3, 0.3)
		hud.draw_circle(c, 14, NAVY)
		hud.draw_circle(c, 10.5, col)
		hud.draw_line(c, c + Vector2(0, -7), NAVY, 2.5, true)
		hud.draw_line(c, c + Vector2(5, 2), NAVY, 2.5, true)


func _draw_clock_banner() -> void:
	var bw := minf(600.0, W - 2 * 268.0)
	var slide := clampf(state_t / 0.3, 0.0, 1.0)
	var rect := Rect2(W * 0.5 - bw * 0.5, lerpf(-100.0, 10.0, slide), bw, 86)
	hud.draw_style_box(sb_card, rect)
	replay_center = Vector2(rect.position.x + 54, rect.get_center().y)
	var pr := replay_r * (1.0 + 0.18 * replay_pulse + (0.04 * sin(anim_t * 6.0) if not clock_resolved else 0.0))
	hud.draw_circle(replay_center, pr + 4, NAVY)
	hud.draw_circle(replay_center, pr, Color(0.25, 0.65, 1.0))
	_draw_speaker(hud, replay_center + Vector2(-2, 0), pr, Color.WHITE)
	var tc := Vector2(rect.position.x + 96 + (bw - 106) * 0.5, rect.get_center().y)
	if not clock_resolved:
		_ctext(hud, font_b, "Listen! Catch the clock!", tc + Vector2(0, -10), 31, NAVY)
		# time-left bar (no digits, the spoken time is never printed before answering)
		var k := clampf(1.0 - clock_t / CLOCK_FALL, 0.0, 1.0)
		hud.draw_rect(Rect2(tc.x - 150, tc.y + 20, 300, 10), NAVY)
		hud.draw_rect(Rect2(tc.x - 148, tc.y + 22, 296 * k, 6), Color(0.25, 0.65, 1.0))
	else:
		var okk := bool(clock_results[clock_results.size() - 1])
		_ctext(hud, font_b, "Great!" if okk else "Oops!", tc + Vector2(0, -18), 28, Color(0.1, 0.6, 0.25) if okk else Color(0.9, 0.2, 0.2))
		_ctext(hud, font_b, "It's %s." % _time_words(clock_time), tc + Vector2(0, 16), 30, NAVY)


func _draw_icon(tex: Texture2D, center: Vector2, size: float) -> void:
	var sc: float = size / maxf(tex.get_width(), tex.get_height())
	var sz := Vector2(tex.get_width(), tex.get_height()) * sc
	hud.draw_texture_rect(tex, Rect2(center - sz * 0.5, sz), false)


func _draw_title() -> void:
	hud.draw_style_box(sb_dim, Rect2(0, 0, W, H))
	_ctext(hud, font_b, str(cfg.get("title", "Bento Catch")), Vector2(W * 0.5, H * 0.13), 104, YELLOW, 26)
	_ctext(hud, font_b, str(cfg.get("subtitle", "")), Vector2(W * 0.5, H * 0.26), 36, Color.WHITE, 12)
	# three how-to cards
	var x0 := W * 0.25
	var gap := 18.0
	var cw := (W * 0.97 - x0 - gap * 2) / 3.0
	var top := H * 0.34
	var ch := H * 0.36
	var heads := [str(cfg.get("howto_good", "Catch the lunch!")), "Dodge these!", "Listen & catch"]
	var heads2 := ["", "", "the right clock!"]
	for i in 3:
		var r := Rect2(x0 + i * (cw + gap), top, cw, ch)
		hud.draw_style_box(sb_card, r)
		var cx := r.get_center().x
		var two: bool = heads2[i] != ""
		_ctext(hud, font_b, heads[i], Vector2(cx, r.position.y + (30 if two else 40)), 27, NAVY)
		if two:
			_ctext(hud, font_b, heads2[i], Vector2(cx, r.position.y + 62), 27, NAVY)
		var mid := Vector2(cx, r.position.y + ch * 0.62)
		if i == 0:
			var n := mini(good_tex.size(), 6)
			for j in n:
				_draw_icon(good_tex[j]["tex"], mid + Vector2((j % 3 - 1) * cw * 0.29, (j / 3) * ch * 0.3 - ch * 0.15), minf(cw * 0.27, ch * 0.28))
		elif i == 1:
			var n := mini(bad_tex.size(), 4)
			for j in n:
				var p := mid + Vector2((j % 2 - 0.5) * cw * 0.4, (j / 2) * ch * 0.3 - ch * 0.15)
				_draw_icon(bad_tex[j]["tex"], p, minf(cw * 0.3, ch * 0.28))
		else:
			var v := ClockDraw.parse(str(cfg.get("target_time", "12:15")))
			ClockDraw.draw(hud, mid + Vector2(cw * 0.14, 12), minf(ch * 0.26, cw * 0.24), v.x, v.y, Color(1, 0.45, 0.4), font_b)
			var sc := Vector2(cx - cw * 0.3, mid.y + 6)
			hud.draw_circle(sc, 34, NAVY)
			hud.draw_circle(sc, 30, Color(0.25, 0.65, 1.0))
			_draw_speaker(hud, sc + Vector2(-2, 0), 30, Color.WHITE)
	# start button
	var pul := 1.0 + 0.05 * sin(anim_t * 5.0)
	var bsz := Vector2(420, 92) * pul
	var bc := Vector2(x0 + (W * 0.97 - x0) * 0.5, H * 0.84)
	hud.draw_style_box(sb_btn, Rect2(bc - bsz * 0.5, bsz))
	_ctext(hud, font_b, "Tap to start", bc, int(50 * pul), NAVY)


func _draw_end() -> void:
	hud.draw_style_box(sb_dim, Rect2(0, 0, W, H))
	var pw := 620.0
	var ph := 500.0
	var r := Rect2(W * 0.5 - pw * 0.5, H * 0.5 - ph * 0.5 + 20, pw, ph)
	hud.draw_style_box(sb_card, r)
	var titles: Array = cfg.get("end_titles", ["Good try!", "Nice work!", "Great job!"])
	var cx := W * 0.5
	_ctext(hud, font_b, str(titles[clampi(stars - 1, 0, titles.size() - 1)]), Vector2(cx, r.position.y + 54), 52, NAVY)
	for i in 3:
		var c := Vector2(cx + (i - 1) * 110.0, r.position.y + 150 - (16.0 if i == 1 else 0.0))
		_draw_star(hud, c, 50, Color(0.85, 0.85, 0.9), 5.0)
		if i < stars_shown:
			_draw_star(hud, c, 50, YELLOW, 5.0)
	_ctext(hud, font_b, "Score", Vector2(cx, r.position.y + 226), 26, Color(0.4, 0.42, 0.55))
	_ctext(hud, font_b, str(score), Vector2(cx, r.position.y + 274), 64, Color(0.95, 0.45, 0.1))
	var total: int = rounds_run.size() if not rounds_run.is_empty() else mini(int(rules.get("clock_rounds", 4)), (cfg.get("clock_rounds", []) as Array).size())
	var cy := r.position.y + 344
	var tv := ClockDraw.parse(str(cfg.get("target_time", "12:15")))
	ClockDraw.draw(hud, Vector2(cx - 220, cy), 22, tv.x, tv.y, Color(1, 0.45, 0.4), font_b)
	_ltext(hud, font_b, "Clocks  %d / %d" % [clocks_correct, total], Vector2(cx - 186, cy), 30, NAVY)
	_ltext(hud, font_b, "Best combo  x%d" % best_combo, Vector2(cx + 30, cy), 30, NAVY)
	var pul := 1.0 + (0.04 * sin(anim_t * 5.0) if state_t > 1.5 else 0.0)
	var bsz := Vector2(340, 84) * pul
	var bc := Vector2(cx, r.end.y - 66)
	again_rect = Rect2(bc - bsz * 0.5, bsz)
	hud.draw_style_box(sb_btn, again_rect)
	_ctext(hud, font_b, "Play again", bc, int(44 * pul), NAVY)
