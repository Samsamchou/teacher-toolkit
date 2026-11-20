extends Node2D
## Clock Ninja — things are tossed up from the bottom; tap (or swipe through) the right ones, leave the red-glow ones.
## English "Clock Rounds": listen, then tap the right one of three big clocks. Built from Bus Dash (same HUD,
## score / combo / Fever / hearts / stars, Finish button, rules.json, postMessage format, window.__bento).
## Country skin comes from res://data/<country>.json (?country=uk|spain in the page URL).

enum S { TITLE, READY, PLAY, CLOCK, END }

# Round length comes from res://data/rules.json (shared by all four World Routines games); these are the fallbacks.
const DEF_RUN_TIME := 60.0      # seconds of play (the timer pauses during clock rounds)
const DEF_CLOCK_EVERY := 10.0   # a clock round every 10 s of play time
const CLOCK_IN := 0.9           # seconds for the three clocks to pop in
const CLOCK_ANSWER := 7.0       # seconds to answer once the clocks are in; no answer = not correct, no heart lost
const CLOCK_RESULT := 2.4
const FEVER_TIME := 6.0
const CLOCK_BONUS := 100
const MAX_HEARTS := 3
const ITEM_SIZE := 112.0        # longest side of a flying thing on the 720-high screen
const HIT_PAD := 30.0           # good things can be hit this far outside the picture
const BAD_HIT := 0.8            # bad things only count when the finger is really on them (x half size)
const AIR_TIME := Vector2(2.35, 2.7)   # seconds from leaving the bottom edge to falling back below it
const CATCH_FLY := 0.4          # seconds for a caught thing to fly into the bag / onto the plate
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
var country := "uk"
var lite := false
var qa := false
var rng := RandomNumberGenerator.new()

var state: int = S.TITLE
var state_t := 0.0
var W := 1280.0
var H := 720.0

# layers
var world: Node2D
var scene_layer: Node2D
var under: Node2D
var items_layer: Node2D
var clock_layer: Node2D
var player: Sprite2D
var fx: Node2D
var hud: Control

# art
var bg_tex: Texture2D
var holder_tex: Texture2D
var holder_w := 270.0
var holder_bottom := 1.04
var holder_mouth := 0.3
var holder_pile := false
var holder_bounce := 0.0
var pile: Array = []            # textures resting on the plate (Spain)
var fx_tex: Dictionary = {}

# hero (stands still at the bottom-left and only reacts)
var poses: Dictionary = {}      # name -> {tex, w, h, ax}
var player_h := 210.0
var player_k := 0.5
var player_x := 110.0
var idle_pose := "run_3"
var pose := "idle"
var pose_lock := ""
var pose_lock_t := 0.0
var anim_t := 0.0
var hop := 0.0

# pointer
var pointer_down := false
var last_ptr := Vector2.ZERO
var trail: Array = []           # finger trail points {p, t}

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
var fever_t := 0.0
var shake := 0.0
var heart_pulse := 0.0
var items: Array = []
var good_tex: Array = []
var bad_tex: Array = []
var particles: Array = []
var popups: Array = []
var sprites_fx: Array = []      # slash / sparkle / burst stamps
var caught_n := 0
var missed_n := 0
var bad_hits := 0

# clock rounds
var clock_idx := 0
var clocks_correct := 0
var clock_results: Array = []
var clocks: Array = []
var clock_t := 0.0
var clock_resolved := false
var clock_timeout := false
var clock_voice_done := false
var clock_r := 112.0
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
	_hook_visibility()
	WebBridge.post("game-ready", {"country": country})
	_publish()


func _pick_country() -> String:
	var c := WebBridge.query("country").to_lower()
	for a in OS.get_cmdline_user_args():   # headless tests: -- country=spain
		if a.begins_with("country="):
			c = a.substr(8).to_lower()
	var ok := c != ""
	for ch in c:
		if not (ch in "abcdefghijklmnopqrstuvwxyz0123456789_-"):
			ok = false
	if ok and FileAccess.file_exists("res://data/%s.json" % c):
		return c
	return "uk"


func _load_json(path: String) -> Dictionary:
	var txt := FileAccess.get_file_as_string(path)
	var d: Variant = JSON.parse_string(txt)
	if d is Dictionary:
		return d
	push_error("Bad config: " + path)
	return {}


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
	player = Sprite2D.new()
	player.centered = false
	world.add_child(player)
	items_layer = Node2D.new()
	items_layer.draw.connect(_draw_items)
	world.add_child(items_layer)
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
	bg_tex = load(str(cfg.get("background", "")))
	var hc: Dictionary = cfg.get("holder", {})
	holder_tex = load(str(hc.get("art", "")))
	holder_w = float(hc.get("width", 270))
	holder_bottom = float(hc.get("bottom", 1.0))
	holder_mouth = float(hc.get("mouth", 0.3))
	holder_pile = bool(hc.get("pile", false))
	var p: Dictionary = cfg.get("player", {})
	player_h = float(p.get("height", 210))
	idle_pose = str(p.get("idle", "run_3"))
	var all: Dictionary = p.get("poses", {})      # hero name -> path prefix, e.g. res://art/hero/girl_
	var who := WebBridge.query("hero").to_lower()      # ?hero=girl|boy from the station page
	if not all.has(who):
		who = str(p.get("default", "girl"))
	var meta: Dictionary = _load_json(str(p.get("meta", ""))).get(who, {})
	for name: String in [idle_pose, "happy", "sad"]:
		var path := "%s%s.png" % [str(all.get(who, "")), name]
		if not ResourceLoader.exists(path):
			push_warning("Missing pose: " + path)
			continue
		var tex: Texture2D = load(path)
		poses[name] = {"tex": tex, "w": float(tex.get_width()), "h": float(tex.get_height()),
			"ax": float((meta.get(name, {}) as Dictionary).get("ax", 0.5))}
	var fxc: Dictionary = cfg.get("fx", {})
	for k: String in fxc:
		fx_tex[k] = load(str(fxc[k]))
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


func _layout() -> void:
	var sz := get_viewport_rect().size
	W = sz.x
	H = sz.y
	player_x = W * 0.085
	if poses.has(idle_pose):
		player_k = player_h / float(poses[idle_pose]["h"])
	clock_r = minf(minf(H * 0.165, W * 0.095), 118.0)
	finish_rect = Rect2(W - 16 - 236, 134, 236, 66)     # set here (not only when drawn) so the QA status is right at once


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


func _stamp(name: String, pos: Vector2, rot: float, s0: float, s1: float, life: float) -> void:
	if fx_tex.has(name):
		sprites_fx.append({"tex": fx_tex[name], "p": pos, "rot": rot, "s0": s0, "s1": s1, "t": 0.0, "life": life})


func _combo_tier() -> int:
	return 1 + mini(combo / 6, 2)


func _holder_rect() -> Rect2:
	if holder_tex == null:
		return Rect2(W * 0.5, H, 0, 0)
	var k := 1.0 + 0.08 * holder_bounce
	var w := holder_w * (2.0 - k)
	var h := holder_w * holder_tex.get_height() / holder_tex.get_width() * k
	return Rect2(W * 0.5 - w * 0.5, H * holder_bottom - h, w, h)


func _holder_mouth() -> Vector2:
	var r := _holder_rect()
	return Vector2(r.get_center().x, r.position.y + r.size.y * holder_mouth)


func _clock_pos(i: int) -> Vector2:
	var gap := minf(W * 0.27, clock_r * 2.95)
	return Vector2(W * 0.5 + (i - 1) * gap, H * 0.47 + sin(anim_t * 2.2 + i * 2.1) * 7.0)


# ---------------------------------------------------------------- flow

func _start_run() -> void:
	items.clear()
	clocks.clear()
	particles.clear()
	popups.clear()
	sprites_fx.clear()
	pile.clear()
	score = 0
	shown_score = 0.0
	hearts = MAX_HEARTS
	combo = 0
	best_combo = 0
	play_t = 0.0
	spawn_t = 0.4
	fever_t = 0.0
	clock_idx = 0
	clocks_correct = 0
	clock_results.clear()
	caught_n = 0
	missed_n = 0
	bad_hits = 0
	_build_rounds()
	stars = 0
	stars_shown = 0
	sent_done = false
	items_layer.modulate = Color.WHITE
	pointer_down = false
	trail.clear()
	pose_lock = ""
	_set_state(S.READY)
	_sfx("start")
	if not music.playing:
		music.play()
	music.pitch_scale = 1.0
	music.volume_db = -15.0


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
	var rd: Dictionary = rounds_run[clock_idx]
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
	var rims: Array = [Color(1, 0.45, 0.4), Color(0.35, 0.7, 1), Color(1, 0.8, 0.25)]   # red, blue, yellow
	clocks.clear()
	for slot in 3:
		var k: int = order[slot]
		var v := ClockDraw.parse(str(times[k]))
		clocks.append({"time": str(times[k]), "h": v.x, "m": v.y, "slot": slot, "ok": k == 0, "mark": 0, "rim": rims[slot]})
	clock_t = 0.0
	clock_resolved = false
	clock_timeout = false
	clock_voice_done = false
	pointer_down = false
	trail.clear()
	_sfx("clock_in")
	_set_state(S.CLOCK)


func _answer_clock(slot: int) -> void:
	# slot -1 = the 7 seconds ran out: counts as not correct, but no heart is lost
	clock_resolved = true
	clock_timeout = slot < 0
	clock_t = 0.0
	var right := false
	for c: Dictionary in clocks:
		if bool(c["ok"]):
			c["mark"] = 1
	if slot >= 0:
		var chosen: Dictionary = clocks[slot]
		right = bool(chosen["ok"])
		var pos := _clock_pos(slot)
		_stamp("slash", pos, rng.randf_range(-0.5, 0.2), 0.75, 0.95, 0.3)
		if right:
			clocks_correct += 1
			score += CLOCK_BONUS
			fever_t = FEVER_TIME
			_sfx("clock_ok")
			_burst(pos, YELLOW, 40, 520.0, true)
			_stamp("sparkle", pos + Vector2(clock_r * 0.8, -clock_r * 0.8), 0.0, 0.2, 0.45, 0.5)
			_popup("+%d" % CLOCK_BONUS, pos + Vector2(0, -clock_r - 30), Color(0.2, 0.85, 0.35), 64)
			pose_lock = "happy"
			pose_lock_t = CLOCK_RESULT
		else:
			chosen["mark"] = 2
			_lose_heart()
			_sfx("clock_bad")
			pose_lock = "sad"
			pose_lock_t = CLOCK_RESULT
	else:
		_sfx("miss", 0.8, -6.0)
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
		"playT": snappedf(play_t, 0.1)}
	if qa:
		d["fever"] = fever_t > 0.0
		d["againRect"] = [again_rect.position.x, again_rect.position.y, again_rect.size.x, again_rect.size.y]
		d["replay"] = [replay_center.x, replay_center.y]
		d["rounds"] = rounds_run.size()
		d["caught"] = caught_n
		if _can_finish():
			d["finish"] = [finish_rect.get_center().x, finish_rect.get_center().y]
		if state == S.CLOCK and not clock_resolved and clock_t > CLOCK_IN:
			var cl: Array = []
			for c: Dictionary in clocks:
				var p := _clock_pos(int(c["slot"]))
				cl.append([p.x, p.y, bool(c["ok"])])
			d["clocks"] = cl
		var good: Array = []
		var badp: Array = []
		for it: Dictionary in items:
			var p: Vector2 = it["p"]
			if int(it["st"]) == 0 and float(it["wait"]) <= 0.0 and p.y < H * 0.85 and p.y > 60.0:
				(badp if bool(it["bad"]) else good).append([p.x, p.y, (it["v"] as Vector2).x, (it["v"] as Vector2).y])
		d["good"] = good
		d["bad"] = badp
	WebBridge.publish(d)


# ---------------------------------------------------------------- input

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_on_press(event.position)
		else:
			_on_release()
	elif event is InputEventMouseMotion and pointer_down:
		_on_drag(event.position)
	elif event is InputEventKey and event.pressed and not event.echo:
		var k: int = event.physical_keycode
		if k == KEY_SPACE or k == KEY_ENTER or k == KEY_KP_ENTER:
			if state == S.TITLE or (state == S.END and state_t > 1.5):
				_start_run()
			elif state == S.CLOCK and not clock_resolved:
				_say()
		elif k == KEY_R and state == S.CLOCK and not clock_resolved:
			_say()
		elif (k == KEY_1 or k == KEY_2 or k == KEY_3) and state == S.CLOCK and not clock_resolved and clock_t > CLOCK_IN * 0.6:
			_answer_clock(k - KEY_1)
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
			if clock_resolved:
				return
			if pos.distance_to(replay_center) < replay_r + 18.0:
				_say()
				return
			if clock_t < CLOCK_IN * 0.6:
				return
			for c: Dictionary in clocks:
				if pos.distance_to(_clock_pos(int(c["slot"]))) < clock_r * 1.18:
					_answer_clock(int(c["slot"]))
					return
		_:
			if _can_finish() and finish_rect.grow(10).has_point(pos):
				_finish()
				return
			pointer_down = true
			last_ptr = pos
			trail.clear()
			trail.append({"p": pos, "t": anim_t})
			var hit := _item_at(pos)
			if hit >= 0:
				_hit_item(items[hit], Vector2.ZERO)
			else:
				_stamp("slash", pos, rng.randf_range(-0.6, 0.3), 0.32, 0.4, 0.18)


func _on_drag(pos: Vector2) -> void:
	if state != S.PLAY and state != S.READY:
		pointer_down = false
		return
	var a := last_ptr
	last_ptr = pos
	trail.append({"p": pos, "t": anim_t})
	if trail.size() > 24:
		trail.pop_front()
	if a.distance_to(pos) < 2.0:
		return
	# a swipe hits everything it passes through (good things with the big hit area, bad things only dead-on)
	for it: Dictionary in items:
		if int(it["st"]) != 0 or float(it["wait"]) > 0.0:
			continue
		var p: Vector2 = it["p"]
		var near := Geometry2D.get_closest_point_to_segment(p, a, pos)
		var lim: float = float(it["half"]) * BAD_HIT * 0.85 if bool(it["bad"]) else float(it["half"]) + HIT_PAD * 0.6
		if p.distance_to(near) < lim:
			_hit_item(it, (pos - a).normalized())


func _on_release() -> void:
	pointer_down = false


func _item_at(pos: Vector2) -> int:
	# a tap: the nearest good thing inside its (large) hit circle wins; a bad thing only when the tap is right on it
	var best := -1
	var best_d := 1e9
	for pass_bad in [false, true]:
		for i in items.size():
			var it: Dictionary = items[i]
			if int(it["st"]) != 0 or float(it["wait"]) > 0.0 or bool(it["bad"]) != pass_bad:
				continue
			var p: Vector2 = it["p"]
			if p.y > H + 10.0:
				continue
			var d := pos.distance_to(p)
			var lim: float = float(it["half"]) * BAD_HIT if pass_bad else float(it["half"]) + HIT_PAD
			if d < lim and d < best_d:
				best = i
				best_d = d
		if best >= 0:
			return best
	return -1


# ---------------------------------------------------------------- update

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	state_t += delta
	anim_t += delta
	combo_pulse = maxf(0.0, combo_pulse - delta * 4.0)
	heart_pulse = maxf(0.0, heart_pulse - delta * 2.5)
	replay_pulse = maxf(0.0, replay_pulse - delta * 2.0)
	holder_bounce = maxf(0.0, holder_bounce - delta * 5.0)
	shown_score = move_toward(shown_score, float(score), maxf(120.0, absf(score - shown_score) * 6.0) * delta)

	match state:
		S.READY:
			_update_items(delta, false)
			if state_t > 1.5:
				_set_state(S.PLAY)
		S.PLAY:
			_update_play(delta)
		S.CLOCK:
			_update_items(delta, true)      # the things in the air stay frozen; only caught ones finish flying
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
	items_layer.modulate.a = move_toward(items_layer.modulate.a, 0.3 if state == S.CLOCK else 1.0, delta * 3.0)

	publish_t -= delta
	if publish_t <= 0.0:
		publish_t = 0.08 if qa else 0.25
		_publish()
	scene_layer.queue_redraw()
	under.queue_redraw()
	items_layer.queue_redraw()
	clock_layer.queue_redraw()
	fx.queue_redraw()
	hud.queue_redraw()


func _update_play(delta: float) -> void:
	play_t += delta
	var prog := clampf(play_t / run_time, 0.0, 1.0)
	spawn_t -= delta
	if spawn_t <= 0.0 and play_t < run_time - 2.0:
		_spawn_wave(prog)
		spawn_t = lerpf(1.7, 1.25, prog) * rng.randf_range(0.85, 1.15)
		if fever_t > 0.0:
			spawn_t *= 0.8
	_update_items(delta, false)
	if hearts <= 0:
		_finish()
		return
	if clock_idx < rounds_run.size() and play_t >= clock_every * (clock_idx + 1):
		_begin_clock_round()
		return
	if play_t >= run_time and items.is_empty():
		_finish()
	elif play_t >= run_time + 4.0:
		_finish()


func _spawn_wave(prog: float) -> void:
	# 1-3 things, spread across the screen so they never start on top of each other
	var n := 1
	var r := rng.randf()
	if prog < 0.2:
		n = 1 if r < 0.55 else 2
	else:
		n = 1 if r < 0.25 else (2 if r < 0.75 else 3)
	var x_lo := W * 0.2
	var x_hi := W * 0.88
	var seg := (x_hi - x_lo) / n
	var bad_left := 1             # at most one bad thing per wave
	for i in n:
		var bad := bad_left > 0 and rng.randf() < (0.12 if fever_t > 0.0 else lerpf(0.22, 0.3, prog))
		if bad:
			bad_left -= 1
		var src: Dictionary = bad_tex.pick_random() if bad else good_tex.pick_random()
		var tex: Texture2D = src["tex"]
		var x0 := x_lo + seg * (i + rng.randf_range(0.15, 0.85))
		var x1 := clampf(x0 + rng.randf_range(-220.0, 220.0), W * 0.16, W * 0.92)
		var T := rng.randf_range(AIR_TIME.x, AIR_TIME.y)
		var y0 := H + ITEM_SIZE * 0.6
		var peak := rng.randf_range(H * 0.24, H * 0.5)
		var h := y0 - peak
		var sc: float = ITEM_SIZE / maxf(tex.get_width(), tex.get_height())
		items.append({"tex": tex, "bad": bad, "points": int(src.get("points", 10)), "st": 0, "t": 0.0,
			"wait": i * rng.randf_range(0.12, 0.3), "p": Vector2(x0, y0), "v": Vector2((x1 - x0) / T, -4.0 * h / T),
			"g": 8.0 * h / (T * T), "rot": rng.randf_range(-0.4, 0.4), "spin": rng.randf_range(-1.1, 1.1),
			"sc": sc, "half": ITEM_SIZE * 0.5, "a": 1.0, "from": Vector2.ZERO, "ctrl": Vector2.ZERO, "tr": []})


func _update_items(delta: float, frozen: bool) -> void:
	for i in range(items.size() - 1, -1, -1):
		var it: Dictionary = items[i]
		var st: int = it["st"]
		if st == 0:
			if frozen:
				continue
			if float(it["wait"]) > 0.0:
				it["wait"] = float(it["wait"]) - delta
				continue
			var v: Vector2 = it["v"]
			v.y += float(it["g"]) * delta
			it["v"] = v
			it["p"] = (it["p"] as Vector2) + v * delta
			it["rot"] = float(it["rot"]) + float(it["spin"]) * delta
			it["t"] = float(it["t"]) + delta
			if v.y > 0.0 and (it["p"] as Vector2).y > H + ITEM_SIZE * 0.7:
				if not bool(it["bad"]) and state == S.PLAY:
					# a good thing fell back down: no heart lost, the combo just starts again
					missed_n += 1
					if combo >= 3:
						_popup("Miss", Vector2((it["p"] as Vector2).x, H - 60.0), Color(0.75, 0.78, 0.9), 30)
					combo = 0
					_sfx("miss", 1.0, -14.0)
				items.remove_at(i)
		elif st == 1:
			# caught: fly along a curve into the bag / onto the plate, leaving a short slash trail
			it["t"] = float(it["t"]) + delta
			var k := clampf(float(it["t"]) / CATCH_FLY, 0.0, 1.0)
			var e := k * k * (3.0 - 2.0 * k)
			var a: Vector2 = it["from"]
			var c: Vector2 = it["ctrl"]
			var b := _holder_mouth()
			if holder_pile:
				b += Vector2(0, -6)
			it["p"] = a.lerp(c, e).lerp(c.lerp(b, e), e)
			it["rot"] = float(it["rot"]) + 9.0 * delta * (1.0 - k)
			var tr: Array = it["tr"]
			tr.append(it["p"])
			if tr.size() > 9:
				tr.pop_front()
			if k >= 1.0:
				holder_bounce = 1.0
				_sfx("catch2", 1.0 + rng.randf_range(-0.05, 0.1), -9.0)
				_stamp("sparkles", b + Vector2(rng.randf_range(-40, 40), -20), 0.0, 0.25, 0.4, 0.4)
				if holder_pile:
					pile.append({"tex": it["tex"], "dx": rng.randf_range(-0.28, 0.28), "dy": rng.randf_range(-0.06, 0.06), "rot": rng.randf_range(-0.5, 0.5)})
					if pile.size() > 7:
						pile.pop_front()
				items.remove_at(i)
		else:
			# knocked bad thing: tumbles down and fades
			it["t"] = float(it["t"]) + delta
			var v: Vector2 = it["v"]
			v.y += 1500.0 * delta
			it["v"] = v
			it["p"] = (it["p"] as Vector2) + v * delta
			it["rot"] = float(it["rot"]) + 7.0 * delta
			it["a"] = maxf(0.0, 1.0 - float(it["t"]) / 0.7)
			if float(it["t"]) > 0.7:
				items.remove_at(i)


func _hit_item(it: Dictionary, dir: Vector2) -> void:
	var pos: Vector2 = it["p"]
	it["t"] = 0.0
	if bool(it["bad"]):
		it["st"] = 2
		it["v"] = Vector2(rng.randf_range(-160.0, 160.0), -380.0)
		bad_hits += 1
		_lose_heart()
		_sfx("bad")
		_stamp("burst", pos, rng.randf() * TAU, 0.5, 0.8, 0.35)
		_popup("Oops!", pos + Vector2(0, -70), Color(0.95, 0.25, 0.25), 46)
		_burst(pos, Color(0.95, 0.3, 0.3), 10, 260.0)
		pose_lock = "sad"
		pose_lock_t = 0.8
		return
	it["st"] = 1
	it["from"] = pos
	var b := _holder_mouth()
	it["ctrl"] = Vector2(lerpf(pos.x, b.x, 0.5), minf(pos.y, b.y) - 120.0)
	var sdir := dir if dir != Vector2.ZERO else (b - pos).normalized().rotated(-0.6)
	_stamp("slash", pos, sdir.angle(), 0.42, 0.55, 0.26)
	caught_n += 1
	combo += 1
	best_combo = maxi(best_combo, combo)
	combo_pulse = 1.0
	var gain := int(it["points"]) * _combo_tier() * (2 if fever_t > 0.0 else 1)
	score += gain
	_sfx("catch", minf(1.0 + combo * 0.04, 1.8), -5.0)
	if combo % 6 == 0:
		_sfx("combo")
		_popup("Combo x%d!" % combo, pos + Vector2(0, -110), Color(1, 0.55, 0.1), 50)
		pose_lock = "happy"
		pose_lock_t = 0.7
	_popup("+%d" % gain, pos + Vector2(rng.randf_range(-20, 20), -60), YELLOW if fever_t <= 0.0 else Color(1, 0.5, 0.9), 38 + mini(gain / 4, 22))
	_burst(pos, YELLOW if fever_t <= 0.0 else Color.from_hsv(rng.randf(), 0.6, 1.0), 7 + _combo_tier() * 3, 280.0)


func _update_clock(delta: float) -> void:
	clock_t += delta
	if clock_resolved:
		if clock_t >= CLOCK_RESULT:
			_end_clock_round()
		return
	if not clock_voice_done and clock_t >= 0.75:
		clock_voice_done = true
		_say()
	if clock_t >= CLOCK_IN + CLOCK_ANSWER:
		_answer_clock(-1)


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
	for i in range(sprites_fx.size() - 1, -1, -1):
		var s: Dictionary = sprites_fx[i]
		s["t"] = float(s["t"]) + delta
		if float(s["t"]) >= float(s["life"]):
			sprites_fx.remove_at(i)
	while not trail.is_empty() and anim_t - float(trail[0]["t"]) > 0.16:
		trail.pop_front()


func _update_player_sprite(delta: float) -> void:
	if pose_lock != "":
		pose_lock_t -= delta
		if pose_lock_t <= 0.0:
			pose_lock = ""
	pose = pose_lock if pose_lock != "" else idle_pose
	if not poses.has(pose):
		pose = idle_pose
	if not poses.has(pose):
		return
	var d: Dictionary = poses[pose]
	var w: float = float(d["w"]) * player_k
	var h: float = float(d["h"]) * player_k
	hop = 0.0
	if pose == "happy":
		hop = absf(sin(anim_t * 9.0)) * 16.0
	var breathe := 1.0 + (0.012 * sin(anim_t * 3.0) if pose == idle_pose else 0.0)
	player.texture = d["tex"]
	player.flip_h = false
	player.scale = Vector2(player_k, player_k * breathe)
	player.z_index = 1
	var feet := H * 0.985
	# the head stays at player_x in every pose
	player.position = Vector2(player_x - float(d["ax"]) * w, feet - h * breathe - hop)


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


func _draw_red_glow(ci: CanvasItem, c: Vector2, r: float, pulse: float) -> void:
	# the "don't tap" mark: a soft red halo with a ring around the bad thing
	for k in 4:
		ci.draw_circle(c, r * (1.18 - k * 0.1), Color(1, 0.2, 0.25, 0.1 + 0.03 * k))
	ci.draw_arc(c, r * (1.02 + 0.04 * pulse), 0, TAU, 40, Color(0.95, 0.15, 0.2, 0.85), 5.0, true)


func _draw_scene() -> void:
	scene_layer.draw_rect(Rect2(0, 0, W, H), Color(0.85, 0.78, 0.9))
	if bg_tex != null:
		# cover the screen, keep the desk / table at the bottom
		var ts := bg_tex.get_size()
		var k := maxf(W / ts.x, H / ts.y)
		var sz := ts * k
		scene_layer.draw_texture_rect(bg_tex, Rect2((W - sz.x) * 0.5, H - sz.y, sz.x, sz.y), false)


func _draw_under() -> void:
	# the bag / plate the good things fly into
	if holder_tex != null:
		var r := _holder_rect()
		var sh := PackedVector2Array()
		for i in 24:
			var a := TAU * i / 24.0
			sh.append(Vector2(r.get_center().x + cos(a) * r.size.x * 0.5, r.end.y - 6 + sin(a) * 9.0))
		under.draw_colored_polygon(sh, Color(0.1, 0.08, 0.12, 0.25))
		under.draw_texture_rect(holder_tex, r, false)
		if holder_pile:
			for q: Dictionary in pile:
				var tex: Texture2D = q["tex"]
				var s := r.size.x * 0.24 / maxf(tex.get_width(), tex.get_height())
				var c := Vector2(r.get_center().x + float(q["dx"]) * r.size.x, r.position.y + r.size.y * (holder_mouth + float(q["dy"])))
				under.draw_set_transform(c, float(q["rot"]), Vector2(s, s))
				under.draw_texture(tex, -tex.get_size() * 0.5)
			under.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# hero shadow (shrinks while hopping)
	var shh := 1.0 - minf(hop, 20.0) / 50.0
	var pts := PackedVector2Array()
	for i in 20:
		var a := TAU * i / 20.0
		pts.append(Vector2(player_x + cos(a) * 46.0 * shh, H * 0.985 + sin(a) * 8.0 * shh))
	under.draw_colored_polygon(pts, Color(0.1, 0.08, 0.12, 0.3))


func _draw_items() -> void:
	var pulse := 0.5 + 0.5 * sin(anim_t * 7.0)
	for it: Dictionary in items:
		if float(it["wait"]) > 0.0 and int(it["st"]) == 0:
			continue
		var p: Vector2 = it["p"]
		var st: int = it["st"]
		var sc: float = it["sc"]
		if st == 1:
			# short slash trail behind a caught thing
			var tr: Array = it["tr"]
			for j in range(1, tr.size()):
				var k := float(j) / tr.size()
				items_layer.draw_line(tr[j - 1], tr[j], Color(1, 0.95, 0.6, 0.75 * k), 4.0 + 14.0 * k, true)
			sc *= lerpf(1.0, 0.35, clampf(float(it["t"]) / CATCH_FLY, 0.0, 1.0))
		if bool(it["bad"]) and st == 0:
			_draw_red_glow(items_layer, p, float(it["half"]) * 1.0, pulse)
		var tex: Texture2D = it["tex"]
		items_layer.draw_set_transform(p, float(it["rot"]), Vector2(sc, sc))
		items_layer.draw_texture(tex, -tex.get_size() * 0.5, Color(1, 1, 1, float(it["a"])))
	items_layer.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_clocks() -> void:
	if clocks.is_empty():
		return
	for c: Dictionary in clocks:
		var i: int = c["slot"]
		var pos := _clock_pos(i)
		# pop in one after another
		var e := 1.0 if clock_resolved else clampf((clock_t - 0.15 * i) / 0.5, 0.0, 1.0)
		var back := 1.0 + 2.2 * pow(e - 1.0, 3.0) + 1.2 * pow(e - 1.0, 2.0)
		var r := clock_r * maxf(0.0, back)
		if r < 12.0:      # too small for the numbers (font size must stay > 0)
			continue
		var rim: Color = c["rim"]
		# soft glow so the clocks stand out from the room
		clock_layer.draw_circle(pos, r * 1.22, Color(1, 1, 1, 0.22))
		ClockDraw.draw(clock_layer, pos, r, int(c["h"]), int(c["m"]), rim, font_b, int(c["mark"]) if clock_resolved else 0)
		if clock_resolved and int(c["mark"]) == 1:
			# after answering, show the digital time under the correct clock as feedback
			var rect := Rect2(pos.x - 86, pos.y + r * 1.22, 172, 60)
			clock_layer.draw_style_box(sb_panel, rect)
			_ctext(clock_layer, font_b, str(c["time"]), rect.get_center(), 40, Color(0.1, 0.6, 0.25))
		elif clock_resolved and int(c["mark"]) == 2:
			var s := r * 0.5
			clock_layer.draw_line(pos + Vector2(-s, -s), pos + Vector2(s, s), Color(0.92, 0.2, 0.2), 16.0, true)
			clock_layer.draw_line(pos + Vector2(-s, s), pos + Vector2(s, -s), Color(0.92, 0.2, 0.2), 16.0, true)


func _draw_fx() -> void:
	# finger trail
	if trail.size() >= 2:
		for j in range(1, trail.size()):
			var age := anim_t - float(trail[j]["t"])
			var k := clampf(1.0 - age / 0.16, 0.0, 1.0) * float(j) / trail.size()
			fx.draw_line(trail[j - 1]["p"], trail[j]["p"], Color(0.6, 0.85, 1.0, 0.5 * k), 18.0 * k + 2.0, true)
			fx.draw_line(trail[j - 1]["p"], trail[j]["p"], Color(1, 1, 0.9, 0.9 * k), 7.0 * k + 1.0, true)
	for s: Dictionary in sprites_fx:
		var k := float(s["t"]) / float(s["life"])
		var tex: Texture2D = s["tex"]
		var sc := lerpf(float(s["s0"]), float(s["s1"]), k)
		fx.draw_set_transform(s["p"], float(s["rot"]), Vector2(sc, sc))
		fx.draw_texture(tex, -tex.get_size() * 0.5, Color(1, 1, 1, clampf((1.0 - k) * 1.6, 0.0, 1.0)))
	fx.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
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
		var k := clampf(1.0 - maxf(0.0, clock_t - CLOCK_IN) / CLOCK_ANSWER, 0.0, 1.0)
		hud.draw_rect(Rect2(tc.x - 150, tc.y + 20, 300, 10), NAVY)
		hud.draw_rect(Rect2(tc.x - 148, tc.y + 22, 296 * k, 6), Color(0.25, 0.65, 1.0) if k > 0.3 else Color(0.95, 0.45, 0.25))
	else:
		var okk := bool(clock_results[clock_results.size() - 1])
		var head := "Great!" if okk else ("Time's up!" if clock_timeout else "Oops!")
		_ctext(hud, font_b, head, tc + Vector2(0, -18), 28, Color(0.1, 0.6, 0.25) if okk else Color(0.9, 0.2, 0.2))
		_ctext(hud, font_b, "It's %s." % _time_words(clock_time), tc + Vector2(0, 16), 30, NAVY)


func _draw_icon(tex: Texture2D, center: Vector2, size: float) -> void:
	var sc: float = size / maxf(tex.get_width(), tex.get_height())
	var sz := Vector2(tex.get_width(), tex.get_height()) * sc
	hud.draw_texture_rect(tex, Rect2(center - sz * 0.5, sz), false)


func _wrap2(text: String, size: int, width: float) -> Array:
	# one line if it fits, otherwise split at the space nearest the middle
	if font_b.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x <= width:
		return [text]
	var best := -1
	for i in text.length():
		if text[i] == " " and (best < 0 or absi(i - text.length() / 2) < absi(best - text.length() / 2)):
			best = i
	if best < 0:
		return [text]
	return [text.substr(0, best), text.substr(best + 1)]


func _draw_title() -> void:
	hud.draw_style_box(sb_dim, Rect2(0, 0, W, H))
	_ctext(hud, font_b, str(cfg.get("title", "Clock Ninja")), Vector2(W * 0.5, H * 0.13), 104, YELLOW, 26)
	_ctext(hud, font_b, str(cfg.get("subtitle", "")), Vector2(W * 0.5, H * 0.26), 36, Color.WHITE, 12)
	# three how-to cards
	var x0 := W * 0.25
	var gap := 18.0
	var cw := (W * 0.97 - x0 - gap * 2) / 3.0
	var top := H * 0.34
	var ch := H * 0.36
	var heads := [str(cfg.get("howto_good", "Tap the good things!")), str(cfg.get("howto_bad", "Don't tap these!")), "Listen & tap the right clock!"]
	for i in 3:
		var r := Rect2(x0 + i * (cw + gap), top, cw, ch)
		hud.draw_style_box(sb_card, r)
		var cx := r.get_center().x
		var lines := _wrap2(heads[i], 27, cw - 24)
		if lines.size() == 1:
			_ctext(hud, font_b, lines[0], Vector2(cx, r.position.y + 40), 27, NAVY)
		else:
			_ctext(hud, font_b, lines[0], Vector2(cx, r.position.y + 30), 27, NAVY)
			_ctext(hud, font_b, lines[1], Vector2(cx, r.position.y + 62), 27, NAVY)
		var mid := Vector2(cx, r.position.y + ch * 0.62)
		if i == 0:
			var n := mini(good_tex.size(), 6)
			for j in n:
				_draw_icon(good_tex[j]["tex"], mid + Vector2((j % 3 - 1) * cw * 0.29, (j / 3) * ch * 0.3 - ch * 0.15), minf(cw * 0.27, ch * 0.28))
		elif i == 1:
			var n := mini(bad_tex.size(), 4)
			for j in n:
				var p := mid + Vector2((j % 2 - 0.5) * cw * 0.4, (j / 2) * ch * 0.3 - ch * 0.15)
				var s := minf(cw * 0.3, ch * 0.28)
				_draw_red_glow(hud, p, s * 0.5, 0.5 + 0.5 * sin(anim_t * 7.0))
				_draw_icon(bad_tex[j]["tex"], p, s)
		else:
			var v := ClockDraw.parse(str(cfg.get("target_time", "12:15")))
			ClockDraw.draw(hud, mid + Vector2(cw * 0.14, 12), minf(ch * 0.26, cw * 0.24), v.x, v.y, Color(0.35, 0.7, 1), font_b)
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
