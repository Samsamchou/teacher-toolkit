extends Node2D
## Luggage Belt — data-driven baggage-belt packing game with English "Clock Rounds" (built from Bus Dash / Bento Catch).
## Country skin comes from res://data/<country>.json (?country=singapore in the page URL).
## The HUD, score / combo / fever / hearts / stars, Finish button, rules.json and postMessage format are the same as
## in the other World Routines games; only the gameplay (belt, drag into the suitcase, suitcase clock rounds) is new.

enum S { TITLE, READY, PLAY, CLOCK, END }

# Round length comes from res://data/rules.json (shared by all four World Routines games); these are the fallbacks.
const DEF_RUN_TIME := 60.0      # seconds of packing (the timer pauses during clock rounds)
const DEF_CLOCK_EVERY := 10.0   # a clock round every 10 s of play time
const CLOCK_ROLL := 1.2         # seconds for the three suitcases to roll in
const CLOCK_ANSWER := 8.0       # seconds to answer; no answer = not correct, but no heart is lost
const CLOCK_RESULT := 2.4
const FEVER_TIME := 6.0
const CLOCK_BONUS := 100
const MAX_HEARTS := 3
const ITEM_SIZE := 128.0        # longest side of a belt item in a 720-high screen
const GRAB_PAD := 34.0          # the grab area is this much bigger than the sprite on every side
const BELT_SPEED := Vector2(84.0, 120.0)    # px/s at the start and at the end of the run (720-high screen)
const BELT_GAP := Vector2(250.0, 310.0)     # distance between two things on the belt
const FLY_TIME := 0.28
const NAVY := Color(0.13, 0.15, 0.3)
const CREAM := Color(1, 0.98, 0.9)
const YELLOW := Color(1, 0.84, 0.2)
const ONES := ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
	"eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
const TENS := {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty"}
const SFX := ["catch", "catch2", "bad", "miss", "combo", "clock_in", "clock_ok", "clock_bad", "start", "tick", "win", "star", "lose"]
const CASE_NAMES := ["case_red", "case_blue", "case_yellow"]
const CASE_RIMS := [Color(0.92, 0.25, 0.22), Color(0.2, 0.5, 0.95), Color(1, 0.76, 0.1)]

var font_b: Font = preload("res://fonts/ComicRelief-Bold.ttf")
var font_r: Font = preload("res://fonts/ComicRelief-Regular.ttf")

var cfg: Dictionary = {}
var art_meta: Dictionary = {}
var country := "singapore"
var lite := false
var qa := false
var rng := RandomNumberGenerator.new()

var state: int = S.TITLE
var state_t := 0.0
var W := 1280.0
var H := 720.0
var k := 1.0                    # H / 720: everything is laid out for a 720-high screen and scaled by this
var gk := 1.0                   # scale for belt distances (never wider than the screen allows)

# layers
var world: Node2D
var scene_layer: Node2D
var items_layer: Node2D
var front: Node2D
var player: Sprite2D
var clock_layer: Node2D
var hatch_layer: Node2D
var fx: Node2D
var hud: Control

# scene geometry (computed in _layout)
var belt_rect := Rect2()
var belt_rest := 0.0            # y where things stand on the belt
var drop_y := 0.0               # releasing below this line = put it in the suitcase / on the trolley
var hatch_rect := Rect2()
var trolley_rect := Rect2()
var trolley_slot := Rect2()     # where a suitcase stands on the trolley (the dashed outline)
var open_rect := Rect2()
var open_mouth := Vector2.ZERO
var hero_x := 96.0
var hero_feet := 700.0
var case_size := Vector2(176, 259)
var case_slots: Array = []     # centres of the three suitcases on the belt

# art
var bg_tex: Texture2D
var belt_tex: Texture2D
var hatch_tex: Texture2D
var trolley_tex: Texture2D
var open_tex: Texture2D
var case_tex: Array = []
var good_tex: Array = []
var bad_tex: Array = []
var poses: Dictionary = {}      # name -> {tex, w, h, ax}
var player_h := 236.0
var player_k := 0.5
var pose := "happy"
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
var belt_scroll := 0.0
var speed := 0.0
var since_spawn := 0.0
var next_gap := 280.0
var bad_run := 0                # bad things in a row on the belt
var packed := 0                 # good things packed this run (the hint arrow goes away after the first)
var fever_t := 0.0
var shake := 0.0
var heart_pulse := 0.0
var open_pulse := 0.0
var open_shake := 0.0
var items: Array = []
var particles: Array = []
var popups: Array = []

# pointer / dragging
var pointer_pos := Vector2.ZERO
var held_item: Dictionary = {}
var held_case := -1
var held_off := Vector2.ZERO

# clock rounds
var clock_idx := 0
var clocks_correct := 0
var clock_results: Array = []
var clocks: Array = []
var clock_t := 0.0
var res_t := 0.0
var clock_resolved := false
var clock_timeout := false
var clock_voice_done := false
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
	art_meta = _load_json("res://art/shared/meta.json")
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
	for a in OS.get_cmdline_user_args():   # headless tests: -- country=australia
		if a.begins_with("country="):
			c = a.substr(8).to_lower()
	var ok := c != ""
	for ch in c:
		if not (ch in "abcdefghijklmnopqrstuvwxyz0123456789_-"):
			ok = false
	if ok and FileAccess.file_exists("res://data/%s.json" % c):
		return c
	return "singapore"


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
	items_layer = Node2D.new()
	world.add_child(items_layer)
	front = Node2D.new()
	front.z_index = 2
	front.draw.connect(_draw_front)
	world.add_child(front)
	player = Sprite2D.new()
	player.centered = false
	player.z_index = 3
	world.add_child(player)
	clock_layer = Node2D.new()
	clock_layer.z_index = 8
	clock_layer.draw.connect(_draw_clocks)
	world.add_child(clock_layer)
	hatch_layer = Node2D.new()
	hatch_layer.z_index = 9
	hatch_layer.draw.connect(_draw_hatch)
	world.add_child(hatch_layer)
	fx = Node2D.new()
	fx.z_index = 40
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
	belt_tex = load("res://art/shared/belt.png")
	hatch_tex = load("res://art/shared/hatch.png")
	trolley_tex = load("res://art/shared/trolley.png")
	open_tex = load("res://art/shared/case_open.png")
	for n: String in CASE_NAMES:
		case_tex.append(load("res://art/shared/%s.png" % n))
	var p: Dictionary = cfg.get("player", {})
	player_h = float(p.get("height", 236))
	var all: Dictionary = p.get("poses", {})      # hero name -> path prefix, e.g. res://art/hero/girl_
	var who := WebBridge.query("hero").to_lower()      # ?hero=girl|boy from the station page
	if not all.has(who):
		who = str(p.get("default", "girl"))
	var meta: Dictionary = _load_json(str(p.get("meta", ""))).get(who, {})
	for name: String in ["stand", "happy", "sad"]:
		var path := "%s%s.png" % [str(all.get(who, "")), name]
		if not ResourceLoader.exists(path):
			push_warning("Missing pose: " + path)
			continue
		var tex: Texture2D = load(path)
		poses[name] = {"tex": tex, "w": float(tex.get_width()), "h": float(tex.get_height()),
			"ax": float((meta.get(name, {}) as Dictionary).get("ax", 0.5))}
	for it: Dictionary in cfg.get("good_items", []):
		good_tex.append({"tex": load(str(it["art"])), "points": int(it.get("points", 30))})
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
	_cancel_hold()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		_cancel_hold()


func _meta(name: String, key: String, def: float) -> float:
	return float((art_meta.get(name, {}) as Dictionary).get(key, def))


func _layout() -> void:
	var sz := get_viewport_rect().size
	W = sz.x
	H = sz.y
	k = H / 720.0
	gk = minf(k, W / 1280.0)
	# the belt runs across the middle; things stand on its rubber slats
	var bh := 119.0 * k
	belt_rect = Rect2(0, H * 0.5, W, bh)
	belt_rest = belt_rect.position.y + bh * lerpf(_meta("belt", "slats_top", 0.05), _meta("belt", "slats_bottom", 0.58), 0.78)
	drop_y = belt_rect.end.y - bh * 0.2
	# the belt comes out of a hatch at the left edge (only its right half shows)
	var hh := H * 0.3
	var hw := hh * hatch_tex.get_width() / hatch_tex.get_height()
	hatch_rect = Rect2(-hw * 0.45, belt_rect.end.y + 4.0 * k - hh, hw, hh)
	# floor: hero, trolley, open suitcase
	hero_feet = H * 0.975
	hero_x = W * 0.075
	var th := H * 0.3
	var tw := th * trolley_tex.get_width() / trolley_tex.get_height()
	trolley_rect = Rect2(W * 0.14, hero_feet - th, tw, th)
	var plat_y := trolley_rect.position.y + th * _meta("trolley", "top", 0.7)
	var px0 := trolley_rect.position.x + tw * _meta("trolley", "x0", 0.19)
	var px1 := trolley_rect.position.x + tw * _meta("trolley", "x1", 0.98)
	case_size = Vector2(case_tex[0].get_width(), case_tex[0].get_height()) * (H * 0.36 / case_tex[0].get_height())
	var ts := case_size * 0.62
	trolley_slot = Rect2(Vector2((px0 + px1) * 0.5 + 8.0 * k - ts.x * 0.5, plat_y + 4.0 * k - ts.y), ts)
	var oh := H * 0.3
	var ow := oh * open_tex.get_width() / open_tex.get_height()
	open_rect = Rect2(W * 0.8 - ow * 0.5, hero_feet - oh, ow, oh)
	open_mouth = open_rect.position + Vector2(ow * _meta("case_open", "cx", 0.5), oh * _meta("case_open", "cy", 0.64))
	# the three clock suitcases stand on the belt
	case_slots.clear()
	for fx_: float in [0.3, 0.55, 0.8]:
		case_slots.append(Vector2(W * fx_, belt_rest + 6.0 * k - case_size.y * 0.5))
	var tallest := 0.0
	for name: String in poses:
		tallest = maxf(tallest, float(poses[name]["h"]))
	if tallest > 0.0:
		player_k = player_h * k / tallest
	# the hero stands left of the trolley with the stretched-out fist on its handle pole
	if poses.has("stand"):
		var sd: Dictionary = poses["stand"]
		var sw: float = float(sd["w"]) * player_k
		var pole_x := trolley_rect.position.x + tw * 0.2
		hero_x = pole_x - sw * 0.95 + float(sd["ax"]) * sw


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


func _burst(pos: Vector2, col: Color, n: int, spd: float = 320.0, star: bool = false) -> void:
	if lite:
		n = int(ceil(n * 0.5))
	for i in n:
		if particles.size() > 220:
			return
		var a := rng.randf() * TAU
		var v := Vector2(cos(a), sin(a)) * spd * rng.randf_range(0.35, 1.0)
		v.y -= spd * 0.4
		var c := col.lightened(rng.randf_range(0.0, 0.5))
		particles.append({"p": pos, "v": v, "t": 0.0, "life": rng.randf_range(0.4, 0.8), "c": c,
			"s": rng.randf_range(5.0, 11.0), "star": star or rng.randf() < 0.3, "g": 900.0})


func _popup(text: String, pos: Vector2, col: Color, size: int = 40) -> void:
	popups.append({"text": text, "p": pos, "t": 0.0, "c": col, "s": size})


func _combo_tier() -> int:
	return 1 + mini(combo / 6, 2)


func _item_rect(it: Dictionary) -> Rect2:
	var n: Sprite2D = it["n"]
	var he: Vector2 = it["he"]
	return Rect2(n.position - he, he * 2.0)


func _case_rect(c: Dictionary) -> Rect2:
	var s: Vector2 = case_size * float(c["sc"])
	return Rect2((c["pos"] as Vector2) - s * 0.5, s)


func _case_clock(c: Dictionary) -> Array:
	var r := _case_rect(c)
	var n: String = CASE_NAMES[int(c["ci"])]
	var cen := r.position + Vector2(r.size.x * _meta(n, "cx", 0.5), r.size.y * _meta(n, "cy", 0.49))
	return [cen, r.size.x * _meta(n, "r", 0.41)]


# ---------------------------------------------------------------- flow

func _start_run() -> void:
	for it: Dictionary in items:
		(it["n"] as Node).queue_free()
	items.clear()
	clocks.clear()
	particles.clear()
	popups.clear()
	held_item = {}
	held_case = -1
	score = 0
	shown_score = 0.0
	hearts = MAX_HEARTS
	combo = 0
	best_combo = 0
	play_t = 0.0
	fever_t = 0.0
	clock_idx = 0
	clocks_correct = 0
	clock_results.clear()
	_build_rounds()
	stars = 0
	stars_shown = 0
	sent_done = false
	packed = 0
	bad_run = 0
	items_layer.modulate = Color.WHITE
	pose_lock = ""
	# a few things are already on the belt, so the pupil can start right away
	for i in 3:
		_spawn_item(0.0, hatch_rect.end.x + (90.0 + 270.0 * i) * gk, i < 2)
	since_spawn = 0.0
	next_gap = 270.0 * gk
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
	_cancel_hold()
	var rd: Dictionary = rounds_run[clock_idx]
	clock_time = str(rd["time"])
	var times: Array = [clock_time]
	for d: Variant in rd.get("distractors", []):
		times.append(str(d))
	var order: Array = [0, 1, 2]
	order.shuffle()
	clocks.clear()
	for slot in 3:
		var t_i: int = order[slot]
		var v := ClockDraw.parse(str(times[t_i]))
		clocks.append({"time": str(times[t_i]), "h": v.x, "m": v.y, "ok": t_i == 0, "ci": slot, "slot": case_slots[slot],
			"pos": Vector2(-case_size.x, case_slots[slot].y), "mark": 0, "on_trolley": false, "sc": 1.0})
	clock_t = 0.0
	res_t = 0.0
	clock_resolved = false
	clock_timeout = false
	clock_voice_done = false
	_sfx("clock_in")
	_set_state(S.CLOCK)


func _answer(i: int) -> void:
	clock_resolved = true
	res_t = 0.0
	for c: Dictionary in clocks:
		if bool(c["ok"]):
			c["mark"] = 1
	if i < 0:
		# no answer in time: not correct, but no heart is lost
		clock_timeout = true
		clock_results.append(false)
		_sfx("miss", 0.8, -6.0)
		pose_lock = "sad"
		pose_lock_t = 1.2
		_publish()
		return
	var chosen: Dictionary = clocks[i]
	var right := bool(chosen["ok"])
	var pos: Vector2 = trolley_slot.get_center()
	if right:
		clocks_correct += 1
		score += CLOCK_BONUS
		fever_t = FEVER_TIME
		_sfx("clock_ok")
		_burst(pos, YELLOW, 40, 520.0, true)
		_popup("+%d" % CLOCK_BONUS, pos + Vector2(0, -trolley_slot.size.y * 0.6), Color(0.2, 0.85, 0.35), 64)
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
	held_case = -1
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
	_cancel_hold()
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
		d["speed"] = speed
		d["pack"] = [open_mouth.x, open_mouth.y]
		d["dropY"] = drop_y
		d["holding"] = not held_item.is_empty() or held_case >= 0
		if _can_finish():
			d["finish"] = [finish_rect.get_center().x, finish_rect.get_center().y]
		var its: Array = []
		for it: Dictionary in items:
			var n: Node2D = it["n"]
			if int(it["mode"]) == 0 and n.position.x > hatch_rect.end.x and n.position.x < W - 60.0 * k:
				its.append([n.position.x, n.position.y, 1 if bool(it["bad"]) else 0])
		d["items"] = its
		if state == S.CLOCK:
			var cs: Array = []
			for c: Dictionary in clocks:
				cs.append([(c["pos"] as Vector2).x, (c["pos"] as Vector2).y])
				if bool(c["ok"]):
					d["okCase"] = int(c["ci"])
			d["cases"] = cs
			d["trolley"] = [trolley_slot.get_center().x, trolley_slot.get_center().y]
			d["answerable"] = not clock_resolved and clock_t >= CLOCK_ROLL
	WebBridge.publish(d)


# ---------------------------------------------------------------- input

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_on_press(event.position)
		else:
			_on_release(event.position)
	elif event is InputEventMouseMotion:
		_on_motion(event.position)
	elif event is InputEventKey and event.pressed and not event.echo:
		var kc: int = event.physical_keycode
		if kc == KEY_SPACE or kc == KEY_ENTER or kc == KEY_KP_ENTER:
			if state == S.TITLE or (state == S.END and state_t > 1.5):
				_start_run()
			elif state == S.CLOCK and not clock_resolved:
				_say()
		elif kc == KEY_R and state == S.CLOCK and not clock_resolved:
			_say()
		elif kc == KEY_F and _can_finish():
			_finish()


func _on_press(pos: Vector2) -> void:
	pointer_pos = pos
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
			if not clock_resolved and clock_t > 0.5:
				_grab_case(pos)
		S.PLAY, S.READY:
			if _can_finish() and finish_rect.grow(10).has_point(pos):
				_finish()
				return
			_grab_item(pos)


func _on_motion(pos: Vector2) -> void:
	pointer_pos = pos
	if not held_item.is_empty():
		(held_item["n"] as Node2D).position = pos + held_off
	elif held_case >= 0 and held_case < clocks.size():
		clocks[held_case]["pos"] = pos + held_off


func _on_release(pos: Vector2) -> void:
	pointer_pos = pos
	if not held_item.is_empty():
		var it := held_item
		held_item = {}
		if pos.y > drop_y and (state == S.PLAY or state == S.READY):
			_pack(it)
		else:
			_back_to_belt(it)
	elif held_case >= 0:
		var i := held_case
		held_case = -1
		if i < clocks.size() and state == S.CLOCK and not clock_resolved and pos.y > drop_y:
			clocks[i]["on_trolley"] = true
			clocks[i]["sc"] = 0.62
			_answer(i)
		elif i < clocks.size():
			clocks[i]["sc"] = 1.0


func _grab_item(pos: Vector2) -> void:
	var best: Dictionary = {}
	var best_d := 1e9
	for it: Dictionary in items:
		if int(it["mode"]) != 0:
			continue
		var n: Node2D = it["n"]
		if n.position.x < hatch_rect.end.x - 20.0 * k:
			continue        # still inside the hatch
		if _item_rect(it).grow(GRAB_PAD * k).has_point(pos):
			var d := pos.distance_to(n.position)
			if d < best_d:
				best_d = d
				best = it
	if best.is_empty():
		return
	held_item = best
	best["mode"] = 1
	var n: Sprite2D = best["n"]
	held_off = (n.position - pos).limit_length(40.0 * k)      # keep the thing under the finger
	n.position = pos + held_off
	n.z_index = 30
	n.scale = (best["sc"] as Vector2) * 1.12
	_sfx("tick", 1.0, -8.0)


func _grab_case(pos: Vector2) -> void:
	for i in range(clocks.size() - 1, -1, -1):
		var c: Dictionary = clocks[i]
		if _case_rect(c).grow(24.0 * k).has_point(pos):
			held_case = i
			held_off = ((c["pos"] as Vector2) - pos).limit_length(60.0 * k)
			c["sc"] = 1.06
			_sfx("tick", 1.0, -8.0)
			return


func _cancel_hold() -> void:
	if not held_item.is_empty():
		var it := held_item
		held_item = {}
		_back_to_belt(it)
	if held_case >= 0 and held_case < clocks.size():
		clocks[held_case]["sc"] = 1.0
	held_case = -1


func _back_to_belt(it: Dictionary) -> void:
	it["mode"] = 0
	var n: Sprite2D = it["n"]
	n.z_index = 1
	n.scale = it["sc"]


func _pack(it: Dictionary) -> void:
	var n: Sprite2D = it["n"]
	it["mode"] = 2
	it["ft"] = 0.0
	it["p0"] = n.position
	n.z_index = 30
	var pos := open_mouth + Vector2(0, -open_rect.size.y * 0.35)
	if bool(it["bad"]):
		_lose_heart()
		_sfx("bad")
		open_shake = 1.0
		_popup("Oops!", pos, Color(0.95, 0.25, 0.25), 48)
		_burst(open_mouth, Color(0.5, 0.5, 0.55), 10, 260.0)
		pose_lock = "sad"
		pose_lock_t = 0.9
		return
	packed += 1
	combo += 1
	best_combo = maxi(best_combo, combo)
	combo_pulse = 1.0
	open_pulse = 1.0
	var gain := int(it["points"]) * _combo_tier() * (2 if fever_t > 0.0 else 1)
	score += gain
	_sfx("catch", minf(1.0 + combo * 0.04, 1.8), -5.0)
	if combo % 6 == 0:
		_sfx("combo")
		_popup("Combo x%d!" % combo, pos + Vector2(0, -60.0 * k), Color(1, 0.55, 0.1), 50)
		pose_lock = "happy"
		pose_lock_t = 0.7
	_popup("+%d" % gain, pos + Vector2(rng.randf_range(-20, 20), 0), YELLOW if fever_t <= 0.0 else Color(1, 0.5, 0.9), 40 + mini(gain / 6, 22))
	_burst(open_mouth, YELLOW if fever_t <= 0.0 else Color.from_hsv(rng.randf(), 0.6, 1.0), 9 + _combo_tier() * 3, 300.0)


# ---------------------------------------------------------------- update

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	state_t += delta
	anim_t += delta
	combo_pulse = maxf(0.0, combo_pulse - delta * 4.0)
	heart_pulse = maxf(0.0, heart_pulse - delta * 2.5)
	replay_pulse = maxf(0.0, replay_pulse - delta * 2.0)
	open_pulse = maxf(0.0, open_pulse - delta * 4.0)
	open_shake = maxf(0.0, open_shake - delta * 3.0)
	shown_score = move_toward(shown_score, float(score), maxf(120.0, absf(score - shown_score) * 6.0) * delta)
	var want_speed := 0.0
	match state:
		S.PLAY, S.READY:
			want_speed = lerpf(BELT_SPEED.x, BELT_SPEED.y, clampf(play_t / run_time, 0.0, 1.0)) * gk
		S.TITLE:
			want_speed = 50.0 * gk
	speed = move_toward(speed, want_speed, 400.0 * delta)
	belt_scroll += speed * delta

	match state:
		S.READY:
			_update_items(delta)
			if state_t > 1.5:
				_set_state(S.PLAY)
		S.PLAY:
			_update_play(delta)
		S.CLOCK:
			_update_items(delta)
			_update_clock(delta)
		S.END:
			_update_items(delta)
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
	items_layer.modulate.a = move_toward(items_layer.modulate.a, 0.25 if state == S.CLOCK else 1.0, delta * 3.0)

	publish_t -= delta
	if publish_t <= 0.0:
		publish_t = 0.08 if qa else 0.25
		_publish()
	scene_layer.queue_redraw()
	front.queue_redraw()
	clock_layer.queue_redraw()
	hatch_layer.queue_redraw()
	fx.queue_redraw()
	hud.queue_redraw()


func _update_play(delta: float) -> void:
	play_t += delta
	var prog := clampf(play_t / run_time, 0.0, 1.0)
	since_spawn += speed * delta
	if since_spawn >= next_gap and play_t < run_time - 1.5:
		since_spawn = 0.0
		next_gap = rng.randf_range(BELT_GAP.x, BELT_GAP.y) * gk * (0.85 if fever_t > 0.0 else 1.0)
		var bad := rng.randf() < (0.15 if fever_t > 0.0 else lerpf(0.26, 0.34, prog))
		_spawn_item(prog, hatch_rect.position.x + hatch_rect.size.x * 0.55, not bad)
	_update_items(delta)
	if hearts <= 0:
		_finish()
		return
	if clock_idx < rounds_run.size() and play_t >= clock_every * (clock_idx + 1):
		_begin_clock_round()
		return
	if play_t >= run_time:
		_finish()


func _spawn_item(_prog: float, x: float, good: bool) -> void:
	var bad := not good
	if bad and bad_run >= 2:
		bad = false        # never three bad things in a row
	bad_run = bad_run + 1 if bad else 0
	var src: Dictionary = bad_tex.pick_random() if bad else good_tex.pick_random()
	var spr := Sprite2D.new()
	var tex: Texture2D = src["tex"]
	spr.texture = tex
	var s: float = ITEM_SIZE * k / maxf(tex.get_width(), tex.get_height())
	spr.scale = Vector2(s, s)
	var he := Vector2(tex.get_width(), tex.get_height()) * s * 0.5
	spr.position = Vector2(x, belt_rest - he.y)
	spr.z_index = 1
	items_layer.add_child(spr)
	items.append({"n": spr, "bad": bad, "points": int(src.get("points", 0)), "mode": 0, "he": he, "sc": spr.scale,
		"rest_y": belt_rest - he.y, "ph": rng.randf() * TAU, "ft": 0.0, "p0": Vector2.ZERO, "vx": 0.0, "vy": 0.0, "rot": 0.0, "dead_t": 0.0})


func _update_items(delta: float) -> void:
	var moving := state == S.PLAY or state == S.READY
	for i in range(items.size() - 1, -1, -1):
		var it: Dictionary = items[i]
		var n: Sprite2D = it["n"]
		match int(it["mode"]):
			0:      # riding the belt
				if moving:
					n.position.x += speed * delta
				n.position.y = move_toward(n.position.y, float(it["rest_y"]), 900.0 * delta)
				n.rotation = sin(anim_t * 2.2 + float(it["ph"])) * 0.03
				if n.position.x - float((it["he"] as Vector2).x) > W:
					if not bool(it["bad"]) and state != S.END:
						if combo > 0:
							_sfx("miss", 1.0, -10.0)
						combo = 0      # a good thing that rolls away only breaks the combo
					n.queue_free()
					items.remove_at(i)
			2:      # flying into the open suitcase
				it["ft"] = float(it["ft"]) + delta
				var e := clampf(float(it["ft"]) / FLY_TIME, 0.0, 1.0)
				var p0: Vector2 = it["p0"]
				n.position = p0.lerp(open_mouth, e) + Vector2(0, -sin(e * PI) * 70.0 * k)
				n.scale = (it["sc"] as Vector2) * lerpf(1.1, 0.35, e)
				if e >= 1.0:
					if bool(it["bad"]):
						# the suitcase spits the bad thing back out
						it["mode"] = 3
						it["vy"] = -620.0 * k
						it["vx"] = rng.randf_range(-260.0, -120.0) * k
						it["rot"] = rng.randf_range(-1.2, 1.2)
						n.scale = it["sc"]
					else:
						n.queue_free()
						items.remove_at(i)
			3:      # bounced out, falls and fades
				it["dead_t"] = float(it["dead_t"]) + delta
				n.position += Vector2(float(it["vx"]), float(it["vy"])) * delta
				it["vy"] = float(it["vy"]) + 1400.0 * k * delta
				n.rotation += float(it["rot"]) * 4.0 * delta
				n.modulate.a = maxf(0.0, 1.0 - float(it["dead_t"]) / 0.7)
				if float(it["dead_t"]) > 0.7:
					n.queue_free()
					items.remove_at(i)


func _update_clock(delta: float) -> void:
	clock_t += delta
	if clock_resolved:
		res_t += delta
	for i in clocks.size():
		var c: Dictionary = clocks[i]
		if i == held_case:
			continue
		var slot: Vector2 = c["slot"]
		if bool(c["on_trolley"]):
			c["pos"] = (c["pos"] as Vector2).lerp(trolley_slot.get_center(), 1.0 - exp(-14.0 * delta))
		elif clock_resolved and res_t > CLOCK_RESULT - 0.7:
			c["pos"] = (c["pos"] as Vector2) + Vector2(1100.0 * k * delta, 0)      # the others roll away
		elif clock_t < CLOCK_ROLL and (c["pos"] as Vector2).x < slot.x - 1.0 and float(c["sc"]) == 1.0:
			var e := clampf((clock_t - 0.12 * (2 - i)) / 0.95, 0.0, 1.0)
			c["pos"] = Vector2(lerpf(-case_size.x, slot.x, 1.0 - pow(1.0 - e, 3.0)), slot.y)
		else:
			c["pos"] = (c["pos"] as Vector2).lerp(slot, 1.0 - exp(-12.0 * delta))
	if clock_resolved:
		if res_t >= CLOCK_RESULT:
			_end_clock_round()
		return
	if not clock_voice_done and clock_t >= 0.75:
		clock_voice_done = true
		_say()
	var limit := CLOCK_ROLL + CLOCK_ANSWER
	if clock_t >= limit and (held_case < 0 or clock_t >= limit + 1.5):
		_cancel_hold()
		_answer(-1)


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
	# the hero only reacts: stands at the trolley, hops when happy, sad after a mistake
	pose = pose_lock if pose_lock != "" else ("stand" if poses.has("stand") else "happy")
	if not poses.has(pose):
		return
	var d: Dictionary = poses[pose]
	var w: float = float(d["w"]) * player_k
	var h: float = float(d["h"]) * player_k
	hop = absf(sin(anim_t * 9.0)) * 16.0 * k if pose_lock == "happy" else 0.0
	var breathe := 1.0 + (0.012 * sin(anim_t * 3.0) if pose_lock == "" else 0.0)
	player.texture = d["tex"]
	player.flip_h = false
	player.scale = Vector2(player_k, player_k * breathe)
	player.position = Vector2(hero_x - float(d["ax"]) * w, hero_feet - h * breathe - hop)


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


func _draw_tex_fit(ci: CanvasItem, tex: Texture2D, r: Rect2, mod: Color = Color.WHITE) -> void:
	ci.draw_texture_rect(tex, r, false, mod)


func _dashed_curve(ci: CanvasItem, a: Vector2, b: Vector2, bend: float, col: Color, width: float) -> void:
	# dashed quadratic curve with an arrow head at b, moving dashes so it looks alive
	var ctrl := (a + b) * 0.5 + Vector2(-bend, -bend * 0.2)
	var pts: Array = []
	for i in 25:
		var t := i / 24.0
		pts.append(a.lerp(ctrl, t).lerp(ctrl.lerp(b, t), t))
	var ph := fmod(anim_t * 2.0, 1.0)
	for i in 24:
		if (i + int(ph * 2.0)) % 2 == 0:
			ci.draw_line(pts[i], pts[i + 1], col, width, true)
	var dir: Vector2 = ((pts[24] as Vector2) - (pts[21] as Vector2)).normalized()
	var nrm := Vector2(-dir.y, dir.x)
	ci.draw_colored_polygon(PackedVector2Array([b + dir * width * 1.2, b - dir * width * 2.2 + nrm * width * 2.0,
		b - dir * width * 2.2 - nrm * width * 2.0]), col)


func _dashed_rect(ci: CanvasItem, r: Rect2, col: Color, width: float) -> void:
	var dash := 16.0 * k
	ci.draw_dashed_line(r.position, Vector2(r.end.x, r.position.y), col, width, dash, true)
	ci.draw_dashed_line(Vector2(r.end.x, r.position.y), r.end, col, width, dash, true)
	ci.draw_dashed_line(r.end, Vector2(r.position.x, r.end.y), col, width, dash, true)
	ci.draw_dashed_line(Vector2(r.position.x, r.end.y), r.position, col, width, dash, true)


func _draw_scene() -> void:
	scene_layer.draw_rect(Rect2(0, 0, W, H), Color(0.85, 0.85, 0.88))
	if bg_tex != null:
		var ts := bg_tex.get_size()
		var s := maxf(W / ts.x, H / ts.y)
		var sz := ts * s
		scene_layer.draw_texture_rect(bg_tex, Rect2((W - sz.x) * 0.5, (H - sz.y) * 0.5, sz.x, sz.y), false)
	# the belt (a repeating tile that scrolls to the right)
	var bh := belt_rect.size.y
	var tw := belt_tex.get_width() * bh / belt_tex.get_height()
	scene_layer.draw_rect(Rect2(0, belt_rect.end.y - 2, W, 8.0 * k), Color(0, 0, 0, 0.18))
	var x := fposmod(belt_scroll, tw) - tw
	while x < W:
		scene_layer.draw_texture_rect(belt_tex, Rect2(x, belt_rect.position.y, tw + 1.0, bh), false)
		x += tw
	# arrows on the steel skirt show which way the belt runs
	var sy := belt_rect.position.y + bh * lerpf(_meta("belt", "slats_bottom", 0.58), 1.0, 0.5)
	var ax := W * 0.2
	while ax < W:
		var c := Vector2(ax, sy)
		var a := 12.0 * k
		scene_layer.draw_rect(Rect2(c.x - a * 1.6, c.y - a * 0.3, a * 1.6, a * 0.6), Color(1, 1, 1, 0.85))
		scene_layer.draw_colored_polygon(PackedVector2Array([c + Vector2(0, -a * 0.75), c + Vector2(a, 0), c + Vector2(0, a * 0.75)]), Color(1, 1, 1, 0.85))
		ax += W * 0.2


func _draw_front() -> void:
	# trolley
	_draw_tex_fit(front, trolley_tex, trolley_rect)
	if state == S.CLOCK and not clock_resolved:
		var on := held_case >= 0 and pointer_pos.y > drop_y
		var col := Color(1, 0.84, 0.2, 0.75 + 0.25 * sin(anim_t * 6.0))
		if on:
			front.draw_rect(trolley_slot, Color(1, 0.9, 0.3, 0.35))
		_dashed_rect(front, trolley_slot, col, 6.0 * k)
		var hr := Rect2(trolley_slot.get_center().x - trolley_slot.size.x * 0.22, trolley_slot.position.y - 16.0 * k, trolley_slot.size.x * 0.44, 16.0 * k)
		_dashed_rect(front, hr, col, 5.0 * k)
	# open suitcase (bounces when something good goes in, shakes when something bad does)
	var r := open_rect
	var sc := 1.0 + 0.07 * open_pulse
	var off := Vector2(sin(anim_t * 60.0) * 10.0 * open_shake * k, 0)
	r = Rect2(Vector2(r.get_center().x - r.size.x * sc * 0.5, r.end.y - r.size.y * sc) + off, r.size * sc)
	if not held_item.is_empty():
		var glow := 0.35 + 0.25 * sin(anim_t * 8.0) + (0.3 if pointer_pos.y > drop_y else 0.0)
		front.draw_circle(open_mouth, open_rect.size.x * 0.62, Color(1, 0.9, 0.3, glow * 0.6))
	_draw_tex_fit(front, open_tex, r)


func _draw_hatch() -> void:
	_draw_tex_fit(hatch_layer, hatch_tex, hatch_rect)


func _draw_case(ci: CanvasItem, c: Dictionary) -> void:
	var r := _case_rect(c)
	ci.draw_texture_rect(case_tex[int(c["ci"])], r, false)
	var cl: Array = _case_clock(c)
	var mark := int(c["mark"]) if clock_resolved else 0
	ClockDraw.draw(ci, cl[0], cl[1], int(c["h"]), int(c["m"]), CASE_RIMS[int(c["ci"])], font_b, mark, false)
	if clock_resolved and mark == 2:
		var s: float = float(cl[1]) * 0.5
		var p: Vector2 = cl[0]
		ci.draw_line(p + Vector2(-s, -s), p + Vector2(s, s), Color(0.92, 0.2, 0.2), 16.0 * k, true)
		ci.draw_line(p + Vector2(-s, s), p + Vector2(s, -s), Color(0.92, 0.2, 0.2), 16.0 * k, true)


func _draw_clocks() -> void:
	if clocks.is_empty():
		return
	# the one being dragged is drawn last (on top)
	for i in clocks.size():
		if i != held_case:
			_draw_case(clock_layer, clocks[i])
	if held_case >= 0 and held_case < clocks.size():
		_draw_case(clock_layer, clocks[held_case])
	# first round only: a dashed arrow shows "drag a suitcase onto the trolley"
	if clock_idx == 0 and not clock_resolved and held_case < 0 and clock_t > CLOCK_ROLL:
		var a: Vector2 = (clocks[1]["pos"] as Vector2) + Vector2(-case_size.x * 0.3, case_size.y * 0.42)
		_dashed_curve(clock_layer, a, trolley_slot.get_center() + Vector2(trolley_slot.size.x * 0.2, -trolley_slot.size.y * 0.5), 60.0 * k, YELLOW, 6.0 * k)
	if clock_resolved:
		# after answering, show the digital time next to the correct suitcase as feedback
		for c: Dictionary in clocks:
			if int(c["mark"]) != 1:
				continue
			var r := _case_rect(c)
			var cen := Vector2(r.end.x + 100.0 * k, r.get_center().y) if bool(c["on_trolley"]) else Vector2(r.get_center().x, r.end.y + 30.0 * k)
			var rect := Rect2(cen - Vector2(86, 30) * k, Vector2(172, 60) * k)
			clock_layer.draw_style_box(sb_panel, rect)
			_ctext(clock_layer, font_b, str(c["time"]), rect.get_center(), int(40 * k), Color(0.1, 0.6, 0.25))


func _draw_fx() -> void:
	# first seconds of a run: a dashed arrow shows "drag a good thing down into the suitcase"
	if (state == S.PLAY or state == S.READY) and packed == 0 and play_t < 12.0 and held_item.is_empty():
		var best: Dictionary = {}
		for it: Dictionary in items:
			var n: Node2D = it["n"]
			if int(it["mode"]) == 0 and not bool(it["bad"]) and n.position.x > W * 0.25 and n.position.x < W * 0.7:
				best = it
				break
		if not best.is_empty():
			var p: Vector2 = (best["n"] as Node2D).position + Vector2(0, (best["he"] as Vector2).y + 6.0 * k)
			_dashed_curve(fx, p, open_mouth + Vector2(-open_rect.size.x * 0.25, -open_rect.size.y * 0.3), -90.0 * k, YELLOW, 6.0 * k)
	for p: Dictionary in particles:
		var kk := 1.0 - float(p["t"]) / float(p["life"])
		var col: Color = p["c"]
		col.a = clampf(kk * 1.5, 0.0, 1.0)
		if bool(p["star"]):
			_draw_star(fx, p["p"], float(p["s"]) * (0.6 + kk * 0.6), col, 0.0, float(p["t"]) * 5.0)
		else:
			fx.draw_circle(p["p"], float(p["s"]) * kk * 0.6, col)
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
		var kk := (state_t if state_t < 0.9 else state_t - 0.9)
		var size := int(110.0 * (1.0 + 0.4 * maxf(0.0, 1.0 - kk * 5.0)))
		_ctext(hud, font_b, txt, Vector2(W * 0.5, H * 0.3), size, YELLOW, 22)
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
		_ctext(hud, font_b, "Listen! Which suitcase?", tc + Vector2(0, -10), 31, NAVY)
		# time-left bar (no digits, the spoken time is never printed before answering)
		var kk := clampf(1.0 - (clock_t - CLOCK_ROLL) / CLOCK_ANSWER, 0.0, 1.0)
		hud.draw_rect(Rect2(tc.x - 150, tc.y + 20, 300, 10), NAVY)
		hud.draw_rect(Rect2(tc.x - 148, tc.y + 22, 296 * kk, 6), Color(0.25, 0.65, 1.0) if kk > 0.25 else Color(0.95, 0.3, 0.25))
	else:
		var okk := bool(clock_results[clock_results.size() - 1])
		var head := "Great!" if okk else ("Time's up!" if clock_timeout else "Oops!")
		_ctext(hud, font_b, head, tc + Vector2(0, -18), 28, Color(0.1, 0.6, 0.25) if okk else Color(0.9, 0.2, 0.2))
		_ctext(hud, font_b, "It's %s." % _time_words(clock_time), tc + Vector2(0, 16), 30, NAVY)


func _draw_icon(tex: Texture2D, center: Vector2, size: float) -> void:
	var sc: float = size / maxf(tex.get_width(), tex.get_height())
	var sz := Vector2(tex.get_width(), tex.get_height()) * sc
	hud.draw_texture_rect(tex, Rect2(center - sz * 0.5, sz), false)


func _draw_title() -> void:
	hud.draw_style_box(sb_dim, Rect2(0, 0, W, H))
	_ctext(hud, font_b, str(cfg.get("title", "Luggage Belt")), Vector2(W * 0.5, H * 0.13), 104, YELLOW, 26)
	_ctext(hud, font_b, str(cfg.get("subtitle", "")), Vector2(W * 0.5, H * 0.26), 36, Color.WHITE, 12)
	# three how-to cards
	var x0 := W * 0.25
	var gap := 18.0
	var cw := (W * 0.97 - x0 - gap * 2) / 3.0
	var top := H * 0.34
	var ch := H * 0.36
	var heads := [str(cfg.get("howto_good", "Pack these!")), str(cfg.get("howto_bad", "Leave these!")), "Listen & drag the"]
	var heads2 := ["", "", "right suitcase!"]
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
			var tex: Texture2D = case_tex[0]
			var chh := ch * 0.56
			var csz := Vector2(tex.get_width(), tex.get_height()) * (chh / tex.get_height())
			var cr := Rect2(Vector2(cx + cw * 0.14 - csz.x * 0.5, mid.y + 14 - csz.y * 0.5), csz)
			hud.draw_texture_rect(tex, cr, false)
			var v := ClockDraw.parse(str(cfg.get("target_time", "9:45")))
			var cc := cr.position + Vector2(csz.x * _meta("case_red", "cx", 0.5), csz.y * _meta("case_red", "cy", 0.49))
			ClockDraw.draw(hud, cc, csz.x * _meta("case_red", "r", 0.41), v.x, v.y, CASE_RIMS[0], font_b, 0, false)
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
