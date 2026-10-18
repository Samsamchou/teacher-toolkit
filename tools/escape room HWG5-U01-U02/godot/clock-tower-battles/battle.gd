extends Node2D
## Ken and the Frozen Clock Tower — one real Godot battle per run.
## Combat only: the website owns questions, answers and learning scores. The host (web shell) sends
## {id, battle, items{name:quality}, gears, mirror, phase, input{x,y}, skillSeq, reduced, mobile};
## the game reports stats and one final "done" event. Native runs take --battle=N for testing.
const Battles = preload("res://battles.gd")
const FONT = preload("res://fonts/ComicRelief-Regular.ttf")
const KEN = preload("res://assets/GAME-01-ken.png")
const TICK = preload("res://assets/GAME-02-tick-fx.png")
const FOES_A = preload("res://assets/GAME-03-enemies-a.png")
const FOES_B = preload("res://assets/GAME-04-enemies-b.png")
const BOSS = preload("res://assets/GAME-05-boss.png")
const ITEMS_A = preload("res://assets/GAME-06-items-a.png")
const ITEMS_B = preload("res://assets/GAME-07-items-b.png")
const MECH_A = preload("res://assets/GAME-08-mechanisms-a.png")
const MECH_B = preload("res://assets/GAME-09-mechanisms-b.png")
const MECH_C = preload("res://assets/GAME-10-mechanisms-c.png")
const ARENAS = [preload("res://assets/GAME-11-arenas-a.png"), preload("res://assets/GAME-12-arenas-b.png"), preload("res://assets/GAME-13-arenas-c.png")]
const VERSION = "clocktower-battles-v1-20261018"
const ITEM_NAMES = ["Paint Splash", "Music Note Shield", "Ruler Boomerang", "Textbook Guard",
	"Word Bubble", "Science Potion", "Speed Sneakers", "Globe Compass"]
const CENTER = Vector2(480, 340)
const LO = Vector2(120, 120)
const HI = Vector2(840, 560)
const MAX_HP = 9.0
const COOLDOWN = 14.0

var battle = 1
var phase = "paused"      # paused | playing | done
var run_id = ""
var host: Dictionary = {}
var last_skill_seq = 0
var pending_skill = false
var power = {}            # item name -> quality 0..4
var gears = 0
var mirror = false
var reduced = false
var low = false

var hero = Vector2(480, 470)
var hp = MAX_HP
var hurt = 0.0
var slow = 0.0
var time_left = 20.0
var seconds = 0.0
var clock = 0.0
var defeated = 0
var recoveries = 0
var skill_clock = 0.0
var skill_uses = 0
var cast_clock = 0.0
var fire_clock = 0.3
var spawn_clock = 0.8
var paint_clock = 3.0
var heal_clock = 10.0
var mech_clock = 2.5
var bridge_clock = 0.0
var stats_clock = 0.0
var mean_frame = 0.0167
var slow_frames = 0.0

var enemies: Array = []
var shots: Array = []
var hostile: Array = []
var hazards: Array = []
var puddles: Array = []
var rings: Array = []
var balls: Array = []
var winds: Array = []
var pulses: Array = []
var sparks: Array = []

var boss_hp = Battles.BOSS_MAX
var boss_shield = 0.0
var boss_shield_max = 1.0
var boss_phase = 1
var boss_at = Vector2(480, 220)
var boss_attack = 2.4
var boss_cast = 0.0
var boss_down = false
var phase_cleared = false
var result_sent = false
var native = false

# ------------------------------------------------------------------ lifecycle
func _ready() -> void:
	native = not OS.has_feature("web")
	if native:
		var n = 1
		var quality = 3
		for arg in OS.get_cmdline_user_args():
			if arg.begins_with("--battle="): n = int(arg.trim_prefix("--battle="))
			if arg.begins_with("--quality="): quality = int(arg.trim_prefix("--quality="))
		var items = {}
		for name in ITEM_NAMES: items[name] = quality
		start({"id": "native", "battle": n, "items": items, "gears": 7, "mirror": n == 11})
		phase = "playing"
	else:
		emit({"type": "ready", "version": VERSION})
	set_process(true)

func start(config: Dictionary) -> void:
	host = config
	run_id = str(config.get("id", ""))
	battle = Battles.valid(int(config.get("battle", 1)))
	power = {}
	var items: Dictionary = config.get("items", {})
	for name in ITEM_NAMES: power[name] = clampf(float(items.get(name, 0)), 0, 4)
	gears = clampi(int(config.get("gears", 0)), 0, 7)
	mirror = bool(config.get("mirror", false))
	reduced = bool(config.get("reduced", false))
	hero = Vector2(480, 470); hp = MAX_HP; hurt = 1.5; slow = 0
	time_left = Battles.seconds(battle); seconds = 0; defeated = 0; recoveries = 0
	skill_clock = 0; skill_uses = 0; cast_clock = 0; fire_clock = 0.3; spawn_clock = 0.8
	paint_clock = 3; heal_clock = 10; mech_clock = 2.5
	for list in [enemies, shots, hostile, hazards, puddles, rings, balls, winds, pulses, sparks]: list.clear()
	boss_down = false; phase_cleared = false; result_sent = false; boss_attack = 2.4; boss_cast = 0
	boss_at = Vector2(480, 220)
	if battle == 10:
		boss_phase = 1; boss_hp = Battles.BOSS_MAX
		boss_shield_max = maxf(6.0, 24.0 - 2.0 * gears)
	elif battle == 11:
		boss_phase = 2; boss_hp = Battles.BOSS_MAX / 2
		boss_shield_max = 0.0 if mirror else 12.0
	boss_shield = boss_shield_max if Battles.is_boss(battle) else 0.0
	last_skill_seq = int(config.get("skillSeq", 0))
	queue_redraw()

func emit(data: Dictionary) -> void:
	if native:
		if data.get("type", "") == "done": print("BATTLE_DONE ", JSON.stringify(data))
		return
	data["runId"] = run_id
	JavaScriptBridge.eval("window.emitBattleEvent&&window.emitBattleEvent(" + JSON.stringify(data) + ")")

func sound(kind: String) -> void:
	emit({"type": "sound", "kind": kind})

func read_host() -> void:
	if native: return
	var data = JSON.parse_string(str(JavaScriptBridge.eval("JSON.stringify(window.BattleHost||{})")))
	if not data is Dictionary or str(data.get("id", "")) == "": return
	if str(data.get("id", "")) != run_id: start(data)
	host = data
	var next_phase = str(data.get("phase", "paused"))
	if phase != "done": phase = next_phase
	reduced = bool(data.get("reduced", false))
	low = bool(data.get("mobile", false)) or slow_frames > 3
	var seq = int(data.get("skillSeq", 0))
	if seq != last_skill_seq:
		last_skill_seq = seq
		if phase == "playing": pending_skill = true

func _unhandled_key_input(event: InputEvent) -> void:
	if native and event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode in [KEY_SPACE, KEY_E]: pending_skill = true

func _process(dt: float) -> void:
	clock += dt
	bridge_clock += dt
	if bridge_clock >= 0.08: read_host(); bridge_clock = 0
	if phase == "playing":
		mean_frame = lerpf(mean_frame, dt, 0.03)
		if mean_frame > 0.029: slow_frames += minf(dt, 0.1)
		advance(dt)
		queue_redraw()
	Engine.max_fps = (30 if low else 60) if phase == "playing" else 10
	stats_clock += dt
	if stats_clock >= 0.3 and not native:
		stats_clock = 0
		emit({"type": "stats", "game": snapshot()})

func snapshot() -> Dictionary:
	return {"battle": battle, "x": roundf(hero.x), "y": roundf(hero.y), "hp": hp, "maxHp": MAX_HP, "timeLeft": time_left, "seconds": seconds,
		"defeated": defeated, "recoveries": recoveries, "skillUses": skill_uses, "skillCooldown": skill_clock,
		"bossHp": boss_hp, "bossShield": boss_shield, "bossPhase": boss_phase, "bossDefeated": boss_down,
		"phaseCleared": phase_cleared}

# ------------------------------------------------------------------ simulation
func p(name: String) -> float:
	return power.get(name, 0.0)

func advance(dt: float) -> void:
	if phase != "playing": return
	var step = minf(dt, 0.05)
	seconds += dt; time_left = maxf(0, time_left - dt)
	hurt = maxf(0, hurt - dt); skill_clock = maxf(0, skill_clock - dt); cast_clock = maxf(0, cast_clock - dt)
	if pending_skill: pending_skill = false; activate_skill()
	var speed = 165.0 + 7.0 * sqrt(p("Speed Sneakers"))
	if slow > 0: speed *= 0.55; slow = maxf(0, slow - dt)
	hero = (hero + move_direction() * speed * step).clamp(LO, HI)
	spawn_clock -= dt; fire_clock -= dt; paint_clock -= dt; heal_clock -= dt; mech_clock -= dt
	var cap = mini(10 if low else 14, 6 + battle)
	if spawn_clock <= 0 and enemies.size() < cap:
		var a = randf() * TAU
		var kinds: Array = Battles.FOES[battle - 1]
		enemies.append({"pos": CENTER + Vector2(cos(a) * 380, sin(a) * 240), "hp": Battles.enemy_hp(battle),
			"kind": kinds[randi() % kinds.size()], "seed": randf() * 10, "slow": 0.0})
		spawn_clock = Battles.spawn_seconds(battle)
	if fire_clock <= 0: auto_fire()
	for e in enemies:
		e.slow = maxf(0, e.slow - dt)
		var sp = Battles.enemy_speed(battle) * (0.5 if e.slow > 0 else 1.0)
		e.pos += (hero - e.pos).normalized() * sp * step
		if hero.distance_to(e.pos) < 27 and e.hp > 0: injure(1.0); e.pos += (e.pos - hero).normalized() * 22
	if Battles.is_boss(battle): update_boss(dt, step)
	else: update_mechanisms(dt, step)
	update_shots(step)
	update_items(dt)
	update_effects(step)
	enemies = enemies.filter(func(e): return e.hp > 0)
	if hp <= 0: recover()
	if not result_sent and (time_left <= 0 or (battle == 10 and phase_cleared) or (battle == 11 and boss_down)):
		finish()

func finish() -> void:
	result_sent = true; phase = "done"
	hostile.clear(); hazards.clear(); rings.clear(); balls.clear()
	var won = (battle == 10 and phase_cleared) or (battle == 11 and boss_down) or not Battles.is_boss(battle)
	sound("victory" if won else "end")
	emit({"type": "done", "game": snapshot()})
	queue_redraw()

func recover() -> void:
	recoveries += 1; hp = MAX_HP; hurt = 3.0; hero = Vector2(480, 470)
	hostile.clear(); hazards.clear()
	for e in enemies: if e.pos.distance_to(hero) < 160: e.pos += (e.pos - hero).normalized() * 120
	pulse(hero, 140, Color(0.6, 1, 0.75)); sound("heal")

var bot_input = null  # QA only: tools/qa_battles.gd steers Ken without keyboard

func move_direction() -> Vector2:
	if bot_input != null: return bot_input
	if native:
		return Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT)) - float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),
			float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN)) - float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP))).limit_length()
	var c: Dictionary = host.get("input", {})  # web: the shell is the only input authority
	return Vector2(float(c.get("x", 0)), float(c.get("y", 0))).limit_length()

func damage_mult() -> float:
	return 1.0 + 0.04 * gears

func auto_fire() -> void:
	var target = Vector2.ZERO
	var best = 999999.0
	for e in enemies:
		var d = hero.distance_squared_to(e.pos)
		if e.hp > 0 and d < best: best = d; target = e.pos
	# boss battles: aim at Time Muncher unless a minion is already close to Ken
	if Battles.is_boss(battle) and not boss_down and best > 130.0 * 130.0: target = boss_at
	if target == Vector2.ZERO: fire_clock = 0.1; return
	var aim = (target - hero).normalized()
	shots.append({"pos": hero + Vector2(0, -18), "vel": aim * 470, "life": 1.8, "damage": 1.3 * damage_mult()})
	fire_clock = 0.55
	sound("shot")

func activate_skill() -> bool:
	if phase != "playing" or skill_clock > 0: return false
	skill_clock = COOLDOWN; cast_clock = 0.8; skill_uses += 1
	pulse(hero, 215, Color(1, 0.84, 0.35)); burst(hero, Color(1, 0.86, 0.4), 24)
	for e in enemies:
		if hero.distance_to(e.pos) < 215: damage_enemy(e, 7.0 * damage_mult()); e.pos += (e.pos - hero).normalized() * 50
	hostile.clear()
	if Battles.is_boss(battle) and hero.distance_to(boss_at) < 330: damage_boss(18.0 * damage_mult())
	sound("skill")
	emit({"type": "skill"})
	return true

func injure(amount: float) -> void:
	if hurt > 0 or phase != "playing": return
	var absorbed = minf(0.5, 0.09 * sqrt(p("Music Note Shield")))
	hp = maxf(0, hp - amount * (1.0 - absorbed)); hurt = 1.1
	burst(hero, Color(1, 0.6, 0.4), 8); sound("hurt")

func damage_enemy(e: Dictionary, amount: float) -> void:
	if e.hp <= 0: return
	e.hp -= amount; burst(e.pos, Color(1, 0.9, 0.5), 3)
	if e.hp <= 0: defeated += 1; sound("defeat")

func damage_boss(amount: float) -> void:
	if boss_down or result_sent: return
	if boss_shield > 0:
		boss_shield = maxf(0, boss_shield - amount)
		if boss_shield == 0: sound("shield-break"); pulse(boss_at, 140, Color(0.4, 0.9, 1))
		return
	boss_hp = maxf(0, boss_hp - amount); burst(boss_at, Color(0.85, 0.7, 1), 3)
	if battle == 10 and boss_hp <= Battles.BOSS_MAX / 2:
		boss_hp = Battles.BOSS_MAX / 2; phase_cleared = true; boss_phase = 2
		pulse(boss_at, 240, Color(0.9, 0.6, 1)); sound("boss-phase")
	if battle == 11 and boss_hp <= 0:
		boss_down = true; defeated += 12; pulse(boss_at, 280, Color(1, 0.85, 0.3)); burst(boss_at, Color(1, 0.85, 0.3), 40)

func update_shots(step: float) -> void:
	for s in shots:
		s.pos += s.vel * step; s.life -= step
		if Battles.is_boss(battle) and not boss_down and s.pos.distance_to(boss_at) < 62:
			damage_boss(s.damage * 1.25); s.life = 0; continue
		for e in enemies:
			if e.hp > 0 and s.pos.distance_to(e.pos) < 26:
				damage_enemy(e, s.damage); s.life = 0
				var chain = p("Word Bubble")
				if chain > 0:
					for o in enemies:
						if o != e and o.hp > 0 and o.pos.distance_to(e.pos) < 150:
							damage_enemy(o, 0.5 + 0.12 * sqrt(chain)); pulse(o.pos, 30, Color(0.7, 0.9, 1)); break
				break
	shots = shots.filter(func(s): return s.life > 0)
	for s in hostile:
		s.life -= step; s.delay = maxf(0, s.delay - step)
		if s.delay > 0: continue
		s.pos += s.vel * step
		if guard_blocks(s.pos): s.life = 0; continue
		if hero.distance_to(s.pos) < 19: injure(1.0); s.life = 0
	hostile = hostile.filter(func(s): return s.life > 0)

func orbit_points(name: String, radius: float, spin: float) -> Array:
	var q = p(name)
	if q <= 0: return []
	var n = mini(3, ceili(sqrt(q)))
	var out = []
	for i in range(n): out.append(hero + Vector2.from_angle(seconds * spin + i * TAU / n) * radius)
	return out

func guard_blocks(at: Vector2) -> bool:
	for point in orbit_points("Textbook Guard", 52, -2.6):
		if point.distance_to(at) < 26: sound("block"); return true
	return false

func update_items(dt: float) -> void:
	for point in orbit_points("Ruler Boomerang", 74, 2.4):
		for e in enemies:
			if e.hp > 0 and point.distance_to(e.pos) < 30: damage_enemy(e, (0.6 + 0.1 * sqrt(p("Ruler Boomerang"))) * dt * 4)
		if Battles.is_boss(battle) and point.distance_to(boss_at) < 70: damage_boss(0.5 * dt * 4)
	if p("Paint Splash") > 0 and paint_clock <= 0:
		paint_clock = 3.2
		var target = null
		for e in enemies: if target == null or hero.distance_to(e.pos) < hero.distance_to(target.pos): target = e
		if target != null:
			pulse(target.pos, 85, Color(1, 0.45, 0.8))
			for e in enemies:
				if e.pos.distance_to(target.pos) < 85: e.slow = 2.5; damage_enemy(e, 0.8 + 0.25 * sqrt(p("Paint Splash")))
	if p("Science Potion") > 0 and heal_clock <= 0:
		heal_clock = 10.0
		if hp < MAX_HP: hp = minf(MAX_HP, hp + 0.6 + 0.2 * sqrt(p("Science Potion"))); sound("heal"); pulse(hero, 60, Color(0.5, 1, 0.7))

func warn_time(base: float) -> float:
	return base * (1.0 + 0.12 * sqrt(p("Globe Compass")))

# ------------------------------------------------------------------ arena mechanisms (battles 1-9)
func hand_tip(i: int) -> Vector2:
	var dir = 1.0 if i == 0 else -1.0
	return CENTER + Vector2.from_angle(seconds * 0.55 * dir + i * PI) * 300

func near_segment(a: Vector2, b: Vector2, at: Vector2, width: float) -> bool:
	var ab = b - a
	var t = clampf((at - a).dot(ab) / ab.length_squared(), 0, 1)
	return at.distance_to(a + ab * t) < width

func update_mechanisms(dt: float, step: float) -> void:
	if battle in [1, 5]:
		for i in range(1 if battle == 1 else 2):
			if seconds > 2.0 and near_segment(CENTER, hand_tip(i), hero, 16): injure(1.0)
	if mech_clock <= 0:
		match battle:
			2: puddles.append({"pos": hero, "timer": warn_time(1.2), "life": 5.0}); sound("warning")
			3:
				for spk in [Vector2(170, 170), Vector2(790, 520)]: rings.append({"pos": spk, "r": 0.0, "delay": warn_time(0.8)})
				sound("warning")
			4, 7:
				for i in range(3 if battle == 4 else 2):
					hazards.append({"pos": (hero + Vector2((i - 1) * 120, -30 * i)).clamp(LO, HI), "timer": warn_time(1.4), "radius": 52.0 if battle == 4 else 60.0,
						"fired": false, "life": warn_time(1.4) + (0.4 if battle == 4 else 3.0), "pool": battle == 7, "tick": 0.0})
				sound("warning")
			6, 9:
				winds.append({"y": clampf(hero.y, 170, 520), "dir": 1.0 if int(seconds / 5) % 2 == 0 else -1.0, "timer": warn_time(1.2), "life": 3.6,
					"push": 80.0 if battle == 9 else 60.0})
				if battle == 6: puddles.append({"pos": hero + Vector2(randf_range(-90, 90), randf_range(-60, 60)), "timer": warn_time(1.2), "life": 4.0, "ink": true})
				sound("warning")
			8:
				var a = randf_range(0.3, 1.2) + (PI if randi() % 2 else 0.0)
				balls.append({"pos": Vector2(480, 150), "vel": Vector2.from_angle(a) * 165, "life": 7.0})
				sound("warning")
		mech_clock = 4.0 if battle in [2, 4, 7, 8] else (4.5 if battle in [3, 6] else 5.0)
	for d in puddles:
		d.timer -= dt; d.life -= dt
		if d.timer <= 0 and hero.distance_to(d.pos) < 62: slow = 0.25
	puddles = puddles.filter(func(d): return d.life > 0)
	for r in rings:
		r.delay -= dt
		if r.delay > 0: continue
		var before = r.r
		r.r += 150 * step
		var dist = hero.distance_to(r.pos)
		if dist >= before - 10 and dist <= r.r + 10: injure(1.0)
	rings = rings.filter(func(r): return r.r < 900)
	for h in hazards:
		h.timer -= dt; h.life -= dt
		if h.timer <= 0 and not h.fired:
			h.fired = true; pulse(h.pos, h.radius, Color(1, 0.55, 0.35)); sound("impact")
			if not h.pool and hero.distance_to(h.pos) < h.radius: injure(1.0)
		if h.pool and h.fired:
			h.tick -= dt
			if h.tick <= 0 and hero.distance_to(h.pos) < h.radius: injure(0.7); h.tick = 1.0
	hazards = hazards.filter(func(h): return h.life > 0)
	for b in balls:
		b.life -= dt; b.pos += b.vel * step
		if b.pos.x < LO.x or b.pos.x > HI.x: b.vel.x *= -1
		if b.pos.y < LO.y or b.pos.y > HI.y: b.vel.y *= -1
		b.pos = b.pos.clamp(LO, HI)
		if hero.distance_to(b.pos) < 30: injure(1.0)
	balls = balls.filter(func(b): return b.life > 0)
	for w in winds:
		w.timer -= dt; w.life -= dt
		if w.timer <= 0 and absf(hero.y - w.y) < 38:
			hero.x = clampf(hero.x + w.dir * step * w.push / (1 + 0.1 * sqrt(p("Speed Sneakers"))), LO.x, HI.x)
	winds = winds.filter(func(w): return w.life > 0)

# ------------------------------------------------------------------ boss (battles 10-11)
func update_boss(dt: float, step: float) -> void:
	if boss_down: return
	boss_at = Vector2(480 + sin(seconds * 0.4) * 140, 215 + cos(seconds * 0.55) * 35)
	boss_cast = maxf(0, boss_cast - dt)
	boss_attack -= dt
	if boss_attack <= 0:
		boss_cast = 1.2; sound("boss-warning")
		var rings_n = 1 if boss_phase == 1 else 2
		for i in range(rings_n):
			var at = hero if i == 0 else (hero + Vector2(150 if hero.x < 480 else -150, -50)).clamp(LO, HI)
			hazards.append({"pos": at, "timer": warn_time(1.15 if boss_phase == 1 else 0.95), "radius": 70.0, "fired": false,
				"life": warn_time(1.15) + 0.4, "pool": false, "tick": 0.0})
		var count = 7 if boss_phase == 1 else 10
		var aim = (hero - boss_at).angle()
		for i in range(count):
			hostile.append({"pos": boss_at + Vector2(0, 14), "vel": Vector2.from_angle(aim + (i - (count - 1) / 2.0) * 0.27) * (90 if boss_phase == 1 else 118), "life": 6.0, "delay": 0.75})
		boss_attack = 3.5 if boss_phase == 1 else 2.6
	for h in hazards:
		h.timer -= dt; h.life -= dt
		if h.timer <= 0 and not h.fired:
			h.fired = true; pulse(h.pos, h.radius, Color(1, 0.5, 0.35))
			if hero.distance_to(h.pos) < h.radius: injure(1.4)
	hazards = hazards.filter(func(h): return h.life > 0)

# ------------------------------------------------------------------ effects
func pulse(at: Vector2, radius: float, color: Color) -> void:
	if pulses.size() < 10: pulses.append({"pos": at, "radius": radius, "color": color, "life": 0.6, "max": 0.6})

func burst(at: Vector2, color: Color, count: int) -> void:
	for i in range(mini(count, 4) if low or reduced else count):
		if sparks.size() >= (40 if low else 100): break
		sparks.append({"pos": at, "vel": Vector2.from_angle(randf() * TAU) * randf_range(25, 100), "life": randf_range(0.3, 0.7), "color": color})

func update_effects(step: float) -> void:
	for s in sparks: s.pos += s.vel * step; s.life -= step
	for q in pulses: q.life -= step
	sparks = sparks.filter(func(s): return s.life > 0)
	pulses = pulses.filter(func(q): return q.life > 0)

# ------------------------------------------------------------------ drawing
func cell(tex: Texture2D, index: int) -> Rect2:
	var size = tex.get_size() / 2
	return Rect2(Vector2(index % 2, floori(index / 2.0)) * size, size)

func sprite(tex: Texture2D, index: int, at: Vector2, size: Vector2, tint: Color = Color.WHITE) -> void:
	draw_texture_rect_region(tex, Rect2(at - size * 0.5, size), cell(tex, index), tint)

func label(text: String, at: Vector2, size: int = 18, color: Color = Color.WHITE) -> void:
	draw_string(FONT, at + Vector2(1, 2), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(0.02, 0.03, 0.08, 0.85))
	draw_string(FONT, at, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func bar(rect: Rect2, frac: float, color: Color) -> void:
	draw_rect(rect, Color(0.08, 0.1, 0.18, 0.9))
	draw_rect(Rect2(rect.position + Vector2(2, 2), Vector2(maxf(2, (rect.size.x - 4) * clampf(frac, 0, 1)), rect.size.y - 4)), color)

func _draw() -> void:
	var a: Array = Battles.ARENA[battle - 1]
	var tex: Texture2D = ARENAS[a[0]]
	var src = cell(tex, a[1])
	# square arena art shown at 960x960, centred vertically in the 960x640 view
	draw_texture_rect_region(tex, Rect2(0, -160, 960, 960), src)
	draw_mechanisms()
	if Battles.is_boss(battle):
		var frame = 3 if boss_down else (2 if boss_cast > 0 else boss_phase - 1)
		var bob = 0.0 if reduced else sin(clock * 1.7) * 4
		sprite(BOSS, frame, boss_at + Vector2(0, -30 + bob), Vector2(230, 230))
		if boss_shield > 0: draw_arc(boss_at + Vector2(0, -20), 100, -PI / 2, -PI / 2 + TAU * boss_shield / boss_shield_max, 48, Color(0.45, 0.9, 1, 0.85), 5, true)
	var figures = enemies.duplicate()
	figures.append({"pos": hero, "kind": null, "seed": 0.0})
	figures.sort_custom(func(x, y): return x.pos.y < y.pos.y)
	for f in figures:
		var bob = 0.0 if reduced or phase != "playing" else sin(clock * 7 + float(f.seed)) * 2
		if f.kind == null:
			draw_circle(hero + Vector2(0, 26), 22, Color(0, 0, 0, 0.22))
			var moving = move_direction().length() > 0
			var frame = 3 if cast_clock > 0 else (1 + int(clock * 7) % 2 if moving and phase == "playing" else 0)
			var tint = Color(1, 0.7, 0.6, 0.7) if hurt > 0 and int(clock * 9) % 2 else Color.WHITE
			sprite(KEN, frame, hero + Vector2(0, -16 + bob), Vector2(104, 104), tint)
			sprite(TICK, 0, hero + Vector2(-46, -58 + sin(clock * 3) * 4), Vector2(40, 40))
		else:
			var k: Array = f.kind
			var t = Color(0.75, 0.8, 1) if f.slow > 0 else Color.WHITE
			sprite(FOES_A if k[0] == 0 else FOES_B, k[1], f.pos + Vector2(0, -8 + bob), Vector2(66, 66), t)
	for point in orbit_points("Ruler Boomerang", 74, 2.4): sprite(ITEMS_A, 2, point, Vector2(40, 40))
	for point in orbit_points("Textbook Guard", 52, -2.6): sprite(ITEMS_A, 3, point, Vector2(34, 34))
	if p("Music Note Shield") > 0: draw_arc(hero, 40, 0, TAU, 36, Color(0.6, 0.8, 1, 0.3), 3, true)
	for s in shots: sprite(TICK, 3, s.pos, Vector2(22, 22))
	for s in hostile: if s.delay <= 0: draw_circle(s.pos, 9, Color(1, 0.45, 0.75)); draw_circle(s.pos, 5, Color(1, 0.9, 0.95))
	for s in sparks: draw_circle(s.pos, 4 * s.life + 1, Color(s.color, s.life))
	for q in pulses:
		var t = 1 - q.life / q.max
		draw_arc(q.pos, q.radius * (0.35 + 0.65 * t), 0, TAU, 40, Color(q.color, q.life / q.max), 5, true)
	draw_hud()

func draw_mechanisms() -> void:
	for d in puddles:
		var col = Color(0.15, 0.1, 0.35, 0.55) if d.get("ink", false) else Color(1, 0.5, 0.8, 0.45)
		if d.timer > 0: draw_arc(d.pos, 62, 0, TAU, 32, Color(col, 0.9), 3, true)
		else: sprite(MECH_B if d.get("ink", false) else MECH_A, 0 if d.get("ink", false) else 1, d.pos, Vector2(140, 110), Color(1, 1, 1, 0.85))
	if battle in [1, 5]:
		for i in range(1 if battle == 1 else 2):
			var tip = hand_tip(i)
			draw_line(CENTER, tip, Color(1, 0.85, 0.4, 0.35 if seconds < 2.0 else 0.95), 12, true)
			draw_line(CENTER, tip, Color(0.35, 0.22, 0.05), 4, true)
		sprite(MECH_A, 0, CENTER, Vector2(80, 80))
	if battle == 3:
		for spk in [Vector2(170, 170), Vector2(790, 520)]: sprite(MECH_A, 2, spk, Vector2(74, 74))
	for r in rings:
		if r.delay > 0: draw_arc(r.pos, 40, 0, TAU, 24, Color(1, 0.9, 0.4, 0.9), 3, true)
		else: draw_arc(r.pos, r.r, 0, TAU, 72, Color(0.6, 0.85, 1, 0.85), 8, true)
	for h in hazards:
		if h.pool and h.fired: sprite(MECH_B, 2, h.pos, Vector2(h.radius * 2.3, h.radius * 1.6))
		elif not h.fired:
			draw_circle(h.pos, h.radius, Color(1, 0.35, 0.25, 0.2))
			draw_arc(h.pos, h.radius, 0, TAU, 40, Color(1, 0.75, 0.35), 3, true)
			draw_arc(h.pos, h.radius - 7, -PI / 2, -PI / 2 + TAU * clampf(h.timer / 1.4, 0, 1), 36, Color(1, 0.95, 0.6), 3, true)
			if battle == 4: sprite(MECH_A, 3, h.pos + Vector2(0, -h.timer * 160), Vector2(56, 56))
	if p("Globe Compass") > 0 and not hazards.is_empty():
		draw_arc(hero, 30, 0, TAU, 24, Color(0.5, 1, 0.7, 0.6), 2, true)
	for b in balls:
		draw_circle(b.pos, 22, Color(1, 0.55, 0.15)); draw_arc(b.pos, 22, 0, TAU, 24, Color(1, 1, 1, 0.9), 3, true)
	for w in winds:
		draw_rect(Rect2(LO.x, w.y - 38, HI.x - LO.x, 76), Color(0.5, 0.9, 1, 0.1 if w.timer > 0 else 0.22))
		for x in range(170, 800, 90):
			var at = Vector2(x + (0.0 if reduced else sin(clock * 3) * 9), w.y)
			draw_line(at - Vector2(16 * w.dir, 0), at + Vector2(16 * w.dir, 0), Color(0.8, 0.95, 1, 0.85), 3, true)
	if battle == 9:
		for fan in [Vector2(140, 200), Vector2(820, 470)]: sprite(MECH_C, 0, fan, Vector2(80, 80))

func draw_hud() -> void:
	draw_rect(Rect2(0, 0, 960, 70), Color(0.03, 0.05, 0.12, 0.8))
	label("KEN", Vector2(22, 26), 18, Color(1, 0.86, 0.45))
	bar(Rect2(22, 36, 170, 14), hp / MAX_HP, Color(0.35, 0.9, 0.6))
	label("HP %d / %d" % [ceili(hp), int(MAX_HP)], Vector2(24, 64), 12)
	if Battles.is_boss(battle):
		var c = Color(0.95, 0.6, 1) if boss_phase == 2 else Color(0.5, 0.9, 1)
		label("TIME MUNCHER  ·  PHASE %d" % boss_phase, Vector2(300, 26), 18, c)
		bar(Rect2(300, 36, 360, 14), boss_hp / Battles.BOSS_MAX, c)
		label("THE CLOCK MOVES AGAIN!" if boss_down else ("BREAK THE GEAR SHIELD!" if boss_shield > 0 else Battles.HINTS[battle - 1]), Vector2(302, 64), 12)
	else:
		label("%02d  ·  %s" % [battle, Battles.NAMES[battle - 1]], Vector2(300, 30), 20, Color(1, 0.9, 0.6))
		label(Battles.HINTS[battle - 1], Vector2(302, 56), 12)
	label("%d" % ceili(time_left), Vector2(880, 42), 30, Color(1, 0.9, 0.6))
	label("SECONDS", Vector2(868, 62), 10)
	label("DEFEATED %d" % defeated, Vector2(22, 626), 16)
	label("SKILL READY" if skill_clock <= 0 else "SKILL IN %ds" % ceili(skill_clock), Vector2(420, 626), 14, Color(1, 0.85, 0.4))
	if phase == "done":
		draw_rect(Rect2(0, 0, 960, 640), Color(0, 0, 0, 0.35))
		var won = (battle == 10 and phase_cleared) or (battle == 11 and boss_down) or not Battles.is_boss(battle)
		label("BATTLE CLEAR!" if won else "TIME'S UP!", Vector2(360, 330), 40, Color(1, 0.88, 0.45))
