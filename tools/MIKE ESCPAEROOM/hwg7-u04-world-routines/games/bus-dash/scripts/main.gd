extends Node2D
## Bus Dash — data-driven three-lane runner with English "Clock Rounds" (built from Bento Catch).
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
const ITEM_SIZE := 96.0
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
var target_y := 360.0
var lane := 1                 # the lane the pupil is heading for (0 = top)
var player_y := 360.0         # centre of the lane band the pupil is in
var road_top := 216.0
var lane_h := 160.0
var scroll := 0.0
var speed := 0.0
var last_lane := -1
var bad_t: Array = [-9.0, -9.0, -9.0]
var scene_layer: Node2D
var scenery_tex: Texture2D
var bus_tex: Texture2D
var dust_tex: Array = []
var speed_tex: Texture2D
var dusts: Array = []           # running dust puffs behind the feet
var run_frame := 1
const RUN_FRAMES := 6
const RUN_STEP := 0.085         # seconds per running frame
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
	WebBridge.post("game-ready", {"country": country})
	_publish()


func _pick_country() -> String:
	var c := WebBridge.query("country").to_lower()
	for a in OS.get_cmdline_user_args():   # headless tests: -- country=usa
		if a.begins_with("country="):
			c = a.substr(8).to_lower()
	var ok := c != ""
	for ch in c:
		if not (ch in "abcdefghijklmnopqrstuvwxyz0123456789_-"):
			ok = false
	if ok and FileAccess.file_exists("res://data/%s.json" % c):
		return c
	return "taiwan"


func _load_json(path: String) -> Dictionary:
	var txt := FileAccess.get_file_as_string(path)
	var d: Variant = JSON.parse_string(txt)
	if d is Dictionary:
		return d
	push_error("Bad config: " + path)
	return {}


func _setup_input() -> void:
	var map := {"move_up": [KEY_UP, KEY_W], "move_down": [KEY_DOWN, KEY_S]}
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
	scene_layer = Node2D.new()
	scene_layer.draw.connect(_draw_scene)
	world.add_child(scene_layer)
	under = Node2D.new()
	under.draw.connect(_draw_under)
	world.add_child(under)
	items_layer = Node2D.new()
	world.add_child(items_layer)
	player = Sprite2D.new()
	player.centered = false
	world.add_child(player)
	clock_layer = Node2D.new()
	clock_layer.z_index = 8
	clock_layer.draw.connect(_draw_clocks)
	world.add_child(clock_layer)
	fx = Node2D.new()
	fx.z_index = 9
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
	scenery_tex = load(str(cfg.get("scenery", "")))
	bus_tex = load(str(cfg.get("bus", "")))
	var p: Dictionary = cfg.get("player", {})
	player_h = float(p.get("height", 176))
	var all: Dictionary = p.get("poses", {})      # hero name -> path prefix, e.g. res://art/taiwan/girl_
	var who := WebBridge.query("hero").to_lower()      # ?hero=girl|boy from the station page
	if not all.has(who):
		who = str(p.get("default", "girl"))
	var meta: Dictionary = _load_json(str(p.get("meta", ""))).get(who, {})
	var names: Array = ["happy", "sad"]
	for i in RUN_FRAMES:
		names.append("run_%d" % (i + 1))
	for name: String in names:
		var path := "%s%s.png" % [str(all.get(who, "")), name]
		if not ResourceLoader.exists(path):
			push_warning("Missing pose: " + path)
			continue
		var tex: Texture2D = load(path)
		poses[name] = {"tex": tex, "w": float(tex.get_width()), "h": float(tex.get_height()),
			"ax": float((meta.get(name, {}) as Dictionary).get("ax", 0.5))}
	var fxc: Dictionary = cfg.get("fx", {})
	for d: Variant in fxc.get("dust", []):
		dust_tex.append(load(str(d)))
	if fxc.has("speed"):
		speed_tex = load(str(fxc["speed"]))
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
	Input.action_release("move_up")
	Input.action_release("move_down")


func _layout() -> void:
	var sz := get_viewport_rect().size
	W = sz.x
	H = sz.y
	road_top = H * 0.30
	lane_h = (H * 0.97 - road_top) / 3.0
	player_x = W * 0.2
	var tallest := 0.0
	for name: String in poses:
		if name.begins_with("run_"):
			tallest = maxf(tallest, float(poses[name]["h"]))
	if tallest > 0.0:
		player_k = player_h / tallest
	clock_r = minf(lane_h * 0.47, 96.0)
	player_y = _lane_y(lane)


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


func _lane_y(i: int) -> float:
	return road_top + lane_h * (i + 0.5)


func _lane_at(y: float) -> int:
	return clampi(int(floor((y - road_top) / lane_h)), 0, 2)


func _nearest_lane() -> int:
	return _lane_at(player_y)


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
	lane = 1
	player_y = _lane_y(1)
	target_y = player_y
	last_lane = -1
	bad_t = [-9.0, -9.0, -9.0]
	dusts.clear()
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
			"x": W + clock_r * 1.6, "mark": 0, "rim": rims[lane]})
	clock_t = 0.0
	clock_resolved = false
	clock_voice_done = false
	_sfx("clock_in")
	_set_state(S.CLOCK)


func _resolve_clock_round() -> void:
	clock_resolved = true
	clock_t = 0.0
	var ln := _nearest_lane()
	var chosen: Dictionary = clocks[ln]
	var right := bool(chosen["ok"])
	for c: Dictionary in clocks:
		if bool(c["ok"]):
			c["mark"] = 1
	var pos := Vector2(float(chosen["x"]), _lane_y(ln))
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
	pose_lock = "happy" if hearts > 0 else "sad"
	pose_lock_t = 9999.0
	pointer_down = false
	_set_state(S.END)
	if not sent_done:
		sent_done = true
		WebBridge.post("game-done", {"country": country, "score": score, "stars": stars, "clocksCorrect": clocks_correct})


func _publish() -> void:
	var d := {"state": S.keys()[state], "score": score, "hearts": hearts, "stars": stars,
		"clocksCorrect": clocks_correct, "clockIdx": clock_idx, "country": country, "w": W, "h": H,
		"playT": snappedf(play_t, 0.1), "lane": lane}
	if qa:
		d["fever"] = fever_t > 0.0
		d["againRect"] = [again_rect.position.x, again_rect.position.y, again_rect.size.x, again_rect.size.y]
		d["replay"] = [replay_center.x, replay_center.y]
		d["rounds"] = rounds_run.size()
		if _can_finish():
			d["finish"] = [finish_rect.get_center().x, finish_rect.get_center().y]
		for c: Dictionary in clocks:
			if bool(c["ok"]):
				d["okLane"] = int(c["lane"])
		d["laneY"] = [_lane_y(0), _lane_y(1), _lane_y(2)]
		var bad_ahead: Array = [false, false, false]
		for it: Dictionary in items:
			if bool(it["live"]) and bool(it["bad"]):
				var dx: float = (it["n"] as Node2D).position.x - player_x
				if dx > -80.0 and dx < 340.0:
					bad_ahead[int(it["lane"])] = true
		d["badAhead"] = bad_ahead
	WebBridge.publish(d)


# ---------------------------------------------------------------- input

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_on_press(event.position)
		else:
			pointer_down = false
	elif event is InputEventMouseMotion and pointer_down:
		target_y = event.position.y
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
			target_y = pos.y
		_:
			if _can_finish() and finish_rect.grow(10).has_point(pos):
				_finish()
				return
			pointer_down = true
			target_y = pos.y


# ---------------------------------------------------------------- update

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	state_t += delta
	anim_t += delta
	combo_pulse = maxf(0.0, combo_pulse - delta * 4.0)
	heart_pulse = maxf(0.0, heart_pulse - delta * 2.5)
	replay_pulse = maxf(0.0, replay_pulse - delta * 2.0)
	shown_score = move_toward(shown_score, float(score), maxf(120.0, absf(score - shown_score) * 6.0) * delta)
	var want_speed := 0.0
	match state:
		S.PLAY, S.READY:
			want_speed = lerpf(320.0, 490.0, clampf(play_t / run_time, 0.0, 1.0))
		S.CLOCK:
			want_speed = 150.0
		S.TITLE:
			want_speed = 110.0
	speed = move_toward(speed, want_speed, 900.0 * delta)
	scroll += speed * delta

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
		publish_t = 0.08 if qa else 0.25
		_publish()
	scene_layer.queue_redraw()
	under.queue_redraw()
	clock_layer.queue_redraw()
	fx.queue_redraw()
	hud.queue_redraw()


func _move_player(delta: float) -> void:
	if Input.is_action_just_pressed("move_up"):
		pointer_down = false
		lane = maxi(0, lane - 1)
	elif Input.is_action_just_pressed("move_down"):
		pointer_down = false
		lane = mini(2, lane + 1)
	elif pointer_down:
		lane = _lane_at(target_y)
	player_y = move_toward(player_y, _lane_y(lane), 1150.0 * delta)


func _update_play(delta: float) -> void:
	play_t += delta
	var prog := clampf(play_t / run_time, 0.0, 1.0)
	spawn_t -= delta
	if spawn_t <= 0.0 and play_t < run_time - 1.0:
		_spawn_item(prog)
		spawn_t = lerpf(0.8, 0.55, prog) * rng.randf_range(0.8, 1.2)
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
	var ln := rng.randi_range(0, 2)
	if ln == last_lane and rng.randf() < 0.6:
		ln = (ln + rng.randi_range(1, 2)) % 3
	last_lane = ln
	var bad := rng.randf() < lerpf(0.22, 0.3, prog) and fever_t <= 0.0 or (fever_t > 0.0 and rng.randf() < 0.12)
	if bad:
		# never block all three lanes at once
		var blocked := 0
		for o in 3:
			if o != ln and play_t - float(bad_t[o]) < 0.75:
				blocked += 1
		if blocked >= 2:
			bad = false
		else:
			bad_t[ln] = play_t
	var src: Dictionary = bad_tex.pick_random() if bad else good_tex.pick_random()
	var spr := Sprite2D.new()
	var tex: Texture2D = src["tex"]
	spr.texture = tex
	var sc: float = ITEM_SIZE / maxf(tex.get_width(), tex.get_height())
	spr.scale = Vector2(sc, sc)
	spr.position = Vector2(W + ITEM_SIZE, _lane_y(ln) + (lane_h * 0.16 if bad else -lane_h * 0.04))
	spr.z_index = ln * 2
	items_layer.add_child(spr)
	items.append({"n": spr, "bad": bad, "points": int(src.get("points", 0)), "live": true, "dead_t": 0.0,
		"vy": 0.0, "vx": 0.0, "rot": 0.0, "half": ITEM_SIZE * 0.5, "lane": ln, "base_y": spr.position.y, "ph": rng.randf() * TAU})


func _update_items(delta: float, active: bool, collide: bool = true) -> void:
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
		n.position.x -= speed * delta
		if not bool(it["bad"]):
			n.position.y = float(it["base_y"]) + sin(anim_t * 5.0 + float(it["ph"])) * 6.0
		var half: float = it["half"]
		if collide and absf(n.position.x - player_x) < half * 0.5 + 30.0 and absf(player_y - _lane_y(int(it["lane"]))) < lane_h * 0.4:
			_catch_item(it)
			continue
		if n.position.x < -ITEM_SIZE:
			n.queue_free()
			items.remove_at(i)


func _catch_item(it: Dictionary) -> void:
	var n: Sprite2D = it["n"]
	var pos := Vector2(player_x + 20.0, player_y - player_h * 0.2)
	it["live"] = false
	if bool(it["bad"]):
		it["vy"] = -520.0
		it["vx"] = rng.randf_range(-260.0, -60.0)
		it["rot"] = rng.randf_range(-1.2, 1.2)
		_lose_heart()
		_sfx("bad")
		_popup("Oops!", pos + Vector2(0, -player_h * 0.5), Color(0.95, 0.25, 0.25), 44)
		_burst(pos, Color(0.5, 0.5, 0.55), 10, 260.0)
		pose_lock = "sad"
		pose_lock_t = 0.7
		return
	it["vy"] = 0.0
	it["dead_t"] = 0.25
	var tw := n.create_tween()
	tw.tween_property(n, "scale", n.scale * 0.5, 0.18)
	tw.parallel().tween_property(n, "position", Vector2(player_x, player_y - player_h * 0.25), 0.18)
	combo += 1
	best_combo = maxi(best_combo, combo)
	combo_pulse = 1.0
	var gain := int(it["points"]) * _combo_tier() * (2 if fever_t > 0.0 else 1)
	score += gain
	_sfx("catch", minf(1.0 + combo * 0.04, 1.8), -5.0)
	if combo % 6 == 0:
		_sfx("combo")
		_popup("Combo x%d!" % combo, pos + Vector2(0, -player_h * 0.5 - 60), Color(1, 0.55, 0.1), 50)
		pose_lock = "happy"
		pose_lock_t = 0.6
	_popup("+%d" % gain, pos + Vector2(rng.randf_range(-20, 20), -player_h * 0.5), YELLOW if fever_t <= 0.0 else Color(1, 0.5, 0.9), 38 + mini(gain / 4, 22))
	_burst(pos, YELLOW if fever_t <= 0.0 else Color.from_hsv(rng.randf(), 0.6, 1.0), 9 + _combo_tier() * 3, 300.0)


func _update_clock(delta: float) -> void:
	clock_t += delta
	_update_items(delta, true, false)      # leftover items roll past harmlessly
	if clock_resolved:
		if clock_t >= CLOCK_RESULT:
			_end_clock_round()
		return
	if not clock_voice_done and clock_t >= 0.75:
		clock_voice_done = true
		_say()
	var x_from := W + clock_r * 1.6
	var x_start := W - clock_r * 1.5
	var x_end := player_x + clock_r * 1.9
	for c: Dictionary in clocks:
		if clock_t < 0.9:
			var e := clampf((clock_t - 0.15 * int(c["lane"])) / 0.6, 0.0, 1.0)
			c["x"] = lerpf(x_from, x_start, 1.0 - pow(1.0 - e, 3.0))
		else:
			c["x"] = lerpf(x_start, x_end, clampf((clock_t - 0.9) / (CLOCK_FALL - 0.9), 0.0, 1.0))
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
	var feet := player_y + lane_h * 0.38
	var frame := int(anim_t / RUN_STEP) % RUN_FRAMES + 1
	if frame != run_frame:
		run_frame = frame
		# a puff of dust every time a foot lands (frames 1 and 4), while really running
		if (frame == 1 or frame == 4) and pose_lock == "" and speed > 200.0 and not dust_tex.is_empty() and dusts.size() < 12:
			dusts.append({"p": Vector2(player_x - 34.0, feet - 6.0), "t": 0.0, "k": rng.randi_range(0, dust_tex.size() - 1)})
	pose = pose_lock if pose_lock != "" else "run_%d" % run_frame
	if not poses.has(pose):
		pose = "run_1"
	if not poses.has(pose):
		return
	var d: Dictionary = poses[pose]
	var w: float = float(d["w"]) * player_k
	var h: float = float(d["h"]) * player_k
	hop = 0.0
	if pose == "happy":
		hop = absf(sin(anim_t * 9.0)) * 16.0
	elif pose == "run_3" or pose == "run_6":
		hop = 5.0          # both feet nearly off the ground in the passing frames
	player.texture = d["tex"]
	player.flip_h = false
	player.scale = Vector2(player_k, player_k)
	player.z_index = _nearest_lane() * 2 + 1
	# the head stays at player_x in every frame, so only the arms and legs seem to move
	player.position = Vector2(player_x - float(d["ax"]) * w, feet - h - hop)
	for i in range(dusts.size() - 1, -1, -1):
		var q: Dictionary = dusts[i]
		q["t"] = float(q["t"]) + delta
		q["p"] = (q["p"] as Vector2) + Vector2(-speed * 0.55 * delta, -14.0 * delta)
		if float(q["t"]) > 0.42:
			dusts.remove_at(i)


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
		var r := Rect2(0, road_top + lane_h * _nearest_lane() + 5, W, lane_h - 10)
		under.draw_rect(r, Color(1, 1, 1, 0.14 + 0.05 * sin(anim_t * 6.0)))
		under.draw_rect(r, Color(1, 0.84, 0.2, 0.75), false, 5.0)
	# player shadow (shrinks while hopping)
	var sh := 1.0 - minf(hop, 20.0) / 50.0
	var pts := PackedVector2Array()
	for i in 20:
		var a := TAU * i / 20.0
		pts.append(Vector2(player_x + cos(a) * 52.0 * sh, player_y + lane_h * 0.38 + sin(a) * 10.0 * sh))
	under.draw_colored_polygon(pts, Color(0.1, 0.08, 0.12, 0.3))
	for q: Dictionary in dusts:
		var k := float(q["t"]) / 0.42
		var tex: Texture2D = dust_tex[int(q["k"])]
		var sz := tex.get_size() * (0.16 + 0.2 * k)
		under.draw_texture_rect(tex, Rect2((q["p"] as Vector2) - Vector2(sz.x * 0.5, sz.y), sz), false, Color(1, 1, 1, 0.85 * (1.0 - k)))
	# speed lines behind the runner when going fast or in fever
	if speed_tex != null and (state == S.PLAY or state == S.READY) and (speed > 400.0 or fever_t > 0.0):
		var ss := speed_tex.get_size() * 0.5
		var jit := fmod(anim_t * 7.0, 1.0)
		under.draw_texture_rect(speed_tex, Rect2(player_x - 70.0 - ss.x - jit * 26.0, player_y - player_h * 0.42, ss.x, ss.y), false, Color(1, 1, 1, 0.75 * (1.0 - jit)))


func _draw_scene() -> void:
	scene_layer.draw_rect(Rect2(0, 0, W, road_top), Color(1.0, 0.86, 0.8))
	if scenery_tex != null:
		var ts := scenery_tex.get_size()
		var tw := ts.x * road_top / ts.y
		var x := -fposmod(scroll * 0.35, tw * 2.0)
		var i := 0
		while x < W:
			if i % 2 == 0:
				scene_layer.draw_texture_rect(scenery_tex, Rect2(x, 0, tw + 1.0, road_top), false)
			else:       # every other tile is mirrored so the seams match
				scene_layer.draw_set_transform(Vector2(x + tw, 0), 0.0, Vector2(-1, 1))
				scene_layer.draw_texture_rect(scenery_tex, Rect2(-1.0, 0, tw + 1.0, road_top), false)
				scene_layer.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
			x += tw
			i += 1
	# road
	scene_layer.draw_rect(Rect2(0, road_top, W, H - road_top), Color(0.37, 0.37, 0.44))
	scene_layer.draw_rect(Rect2(0, road_top - 4, W, 9), Color(0.8, 0.8, 0.84))
	scene_layer.draw_rect(Rect2(0, road_top + lane_h * 3.0, W, H), Color(0.95, 0.8, 0.78))
	scene_layer.draw_rect(Rect2(0, road_top + lane_h * 3.0, W, 6), Color(0.8, 0.8, 0.84))
	var off := fposmod(scroll, 130.0)
	for li in [1, 2]:
		var y: float = road_top + lane_h * li
		var dx := -off
		while dx < W:
			scene_layer.draw_rect(Rect2(dx, y - 4, 74, 8), Color(1, 1, 1, 0.9))
			dx += 130.0
	# the school bus: far ahead at first, a little closer all the time
	if bus_tex != null:
		var bs := bus_tex.get_size()
		var bh := lane_h * 0.95
		var bw := bs.x * bh / bs.y
		var bx := lerpf(W - bw * 0.12, W - bw * 0.8, clampf(play_t / run_time, 0.0, 1.0))
		if state == S.TITLE:
			bx = W - bw * 0.5
		elif state == S.END:
			bx = W - bw * 1.02 if hearts > 0 else W + bw
		var bob := sin(anim_t * 9.0) * 2.0 if speed > 1.0 else 0.0
		scene_layer.draw_texture_rect(bus_tex, Rect2(bx, road_top + lane_h * 0.12 - bh + bob, bw, bh), false)


func _draw_clocks() -> void:
	if clocks.is_empty():
		return
	var cur := _nearest_lane()
	for c: Dictionary in clocks:
		var pos := Vector2(float(c["x"]), _lane_y(int(c["lane"])) - lane_h * 0.03)
		var r := clock_r
		var rim: Color = c["rim"]
		# arch legs, so the clock stands on the road like a gate
		for sx: float in [-1.0, 1.0]:
			var lx := pos.x + sx * r * 0.8
			clock_layer.draw_rect(Rect2(lx - r * 0.15, pos.y, r * 0.3, lane_h * 0.45), NAVY)
			clock_layer.draw_rect(Rect2(lx - r * 0.15 + 4, pos.y, r * 0.3 - 8, lane_h * 0.45 - 4), rim)
		if not clock_resolved and int(c["lane"]) == cur and clock_t > 0.9:
			r *= 1.0 + 0.04 * sin(anim_t * 8.0)
			clock_layer.draw_arc(pos, r * 1.12, 0, TAU, 48, Color(1, 1, 1, 0.85), 6.0, true)
		ClockDraw.draw(clock_layer, pos, r, int(c["h"]), int(c["m"]), rim, font_b, int(c["mark"]) if clock_resolved else 0)
		if clock_resolved and int(c["mark"]) == 1:
			# after answering, show the digital time next to the correct clock as feedback
			var rect := Rect2(pos.x + r * 1.25, pos.y - 30, 172, 60)
			clock_layer.draw_style_box(sb_panel, rect)
			_ctext(clock_layer, font_b, str(c["time"]), rect.get_center(), 40, Color(0.1, 0.6, 0.25))
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
		_ctext(hud, font_b, "Listen! Which clock?", tc + Vector2(0, -10), 31, NAVY)
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
	_ctext(hud, font_b, str(cfg.get("title", "Bus Dash")), Vector2(W * 0.5, H * 0.13), 104, YELLOW, 26)
	_ctext(hud, font_b, str(cfg.get("subtitle", "")), Vector2(W * 0.5, H * 0.26), 36, Color.WHITE, 12)
	# three how-to cards
	var x0 := W * 0.25
	var gap := 18.0
	var cw := (W * 0.97 - x0 - gap * 2) / 3.0
	var top := H * 0.34
	var ch := H * 0.36
	var heads := [str(cfg.get("howto_good", "Grab breakfast!")), "Dodge these!", "Listen & run to"]
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
	ClockDraw.draw(hud, Vector2(cx - 220, cy), 22, 12, 15, Color(1, 0.45, 0.4), font_b)
	_ltext(hud, font_b, "Clocks  %d / %d" % [clocks_correct, total], Vector2(cx - 186, cy), 30, NAVY)
	_ltext(hud, font_b, "Best combo  x%d" % best_combo, Vector2(cx + 30, cy), 30, NAVY)
	var pul := 1.0 + (0.04 * sin(anim_t * 5.0) if state_t > 1.5 else 0.0)
	var bsz := Vector2(340, 84) * pul
	var bc := Vector2(cx, r.end.y - 66)
	again_rect = Rect2(bc - bsz * 0.5, bsz)
	hud.draw_style_box(sb_btn, again_rect)
	_ctext(hud, font_b, "Play again", bc, int(44 * pul), NAVY)
