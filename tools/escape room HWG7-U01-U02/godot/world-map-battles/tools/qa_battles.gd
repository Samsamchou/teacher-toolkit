extends SceneTree
## Headless QA (HWG7, 10 battles): every battle runs to its end with a simple dodging bot, under a strong loadout
## (all items quality 4, 7 gears, mirror) and a weak one (no items, no gears). Exit code != 0 on failure.
const ITEMS = ["Paper Fan", "Bus Pass Shield", "Boomerang", "Rain Umbrella", "Merlion Splash", "Bubble Tea", "Running Shoes", "Metro Map"]
var failures = []

func check(ok: bool, msg: String) -> void:
	if not ok: failures.append(msg); print("FAIL ", msg)

func bot(g) -> Vector2:
	var push = (g.CENTER + Vector2(0, 90) - g.hero) * 0.004
	for e in g.enemies: push += (g.hero - e.pos).normalized() * 70.0 / maxf(30.0, g.hero.distance_to(e.pos))
	for h in g.hazards: if g.hero.distance_to(h.pos) < h.radius + 40: push += (g.hero - h.pos).normalized() * 2.0
	for b in g.balls: push += (g.hero - b.pos).normalized() * 60.0 / maxf(30.0, g.hero.distance_to(b.pos))
	for s in g.hostile: if s.delay <= 0 and g.hero.distance_to(s.pos) < 90: push += (g.hero - s.pos).normalized() * 1.2
	if g.Battles.is_boss(g.battle): push += (g.boss_at + Vector2(0, 230) - g.hero) * 0.004
	return push.limit_length()

func run(n: int, strong: bool) -> Dictionary:
	var g = load("res://battle.gd").new()
	g.native = true
	var items = {}
	for name in ITEMS: items[name] = 4 if strong else 0
	g.start({"id": "qa", "battle": n, "items": items, "gears": 7 if strong else 0, "mirror": strong})
	g.phase = "playing"
	var dt = 1.0 / 30.0
	var t = 0.0
	var saw = {"hazard": false, "ring": false, "ball": false, "wind": false, "puddle": false, "hostile": false, "blocked": false}
	var hostile_before = 0
	while not g.result_sent and t < 120.0:
		g.bot_input = bot(g)
		if g.skill_clock <= 0: g.pending_skill = true
		hostile_before = g.hostile.size()
		g.advance(dt)
		t += dt
		if not g.hazards.is_empty(): saw.hazard = true
		if not g.rings.is_empty(): saw.ring = true
		if not g.balls.is_empty(): saw.ball = true
		if not g.winds.is_empty(): saw.wind = true
		if not g.puddles.is_empty(): saw.puddle = true
		if not g.hostile.is_empty(): saw.hostile = true
	var r = g.snapshot()
	r["t"] = snappedf(t, 0.1); r["saw"] = saw; r["sent"] = g.result_sent
	g.free()
	return r

func _init() -> void:
	var B = load("res://battles.gd")
	var expect_mech = {1: "", 2: "puddle", 3: "ring", 4: "hazard", 5: "", 6: "wind", 7: "hazard", 8: "ball", 9: "wind", 10: "hazard", 11: "hazard"}
	for strong in [true, false]:
		for n in range(1, B.SECONDS.size() + 1):
			var r = run(n, strong)
			var tag = ("strong" if strong else "weak") + " B%02d" % n
			print("%s t=%.1fs defeated=%d recoveries=%d bossHp=%.0f phaseCleared=%s bossDown=%s skill=%d" % [tag, r.t, r.defeated, r.recoveries, r.bossHp, r.phaseCleared, r.bossDefeated, r.skillUses])
			check(r.sent, tag + " did not finish")
			if not B.is_boss(n): check(absf(r.t - load("res://battles.gd").seconds(n)) < 0.2, tag + " wrong length %.1f" % r.t)
			else: check(absf(r.t - load("res://battles.gd").seconds(n)) < 0.2 or r.phaseCleared or r.bossDefeated, tag + " boss battle length wrong %.1f" % r.t)
			if expect_mech[B.kind(n)] != "": check(r.saw[expect_mech[B.kind(n)]], tag + " mechanism never appeared: " + expect_mech[B.kind(n)])
			check(r.defeated > 0, tag + " defeated nothing")
			if strong and n == B.BOSS1: check(r.phaseCleared, tag + " strong loadout could not clear phase 1")
			if strong and n == B.BOSS2: check(r.bossDefeated, tag + " strong loadout could not defeat the boss")
	print("QA_BATTLES ", "PASS" if failures.is_empty() else "FAIL %d" % failures.size())
	quit(0 if failures.is_empty() else 1)
