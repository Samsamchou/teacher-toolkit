extends SceneTree
## Headless logic smoke test:  godot --headless --path . --script res://scripts/qa_smoke.gd [-- bad]
## A bot plays one full run (default: plays well; with "bad": stays in one lane and picks wrong clocks).
## Prints QA_SMOKE_OK ... and exits 0, or QA_SMOKE_FAIL and exits 1.

var main: Node
var frames := 0
var bad := false
var started := false
var saw_clock := 0
var saw_fever := false

func _initialize() -> void:
	bad = "bad" in OS.get_cmdline_user_args()
	Engine.time_scale = 6.0
	main = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(main)

func _bad_near(ln: int, lo: float, hi: float) -> bool:
	for it: Dictionary in main.items:
		if bool(it["live"]) and bool(it["bad"]) and int(it["lane"]) == ln:
			var dx: float = (it["n"] as Node2D).position.x - main.player_x
			if dx > lo and dx < hi:
				return true
	return false

func _go(ln: int) -> void:
	main.pointer_down = false
	main.lane = ln

func _process(_delta: float) -> bool:
	frames += 1
	if frames == 5:
		main._start_run()
		started = true
	if not started:
		return false
	var st: int = main.state
	if st == 3:   # CLOCK
		saw_clock = maxi(saw_clock, main.clock_idx + 1)
		for c: Dictionary in main.clocks:
			if bool(c["ok"]) != bad:
				_go(int(c["lane"]))
	elif st == 2 and not bad:   # PLAY: look at the nearest thing ahead in every lane
		var near: Array = [null, null, null]
		for it: Dictionary in main.items:
			if not bool(it["live"]):
				continue
			var n: Node2D = it["n"]
			var dx: float = n.position.x - main.player_x
			if dx < -70.0 or dx > 330.0:
				continue
			var ln: int = it["lane"]
			if near[ln] == null or dx < float(near[ln]["dx"]):
				near[ln] = {"dx": dx, "bad": bool(it["bad"])}
		var best := -1
		var best_dx := 1e9
		for ln in 3:
			if near[ln] != null and not bool(near[ln]["bad"]) and float(near[ln]["dx"]) < best_dx:
				best_dx = float(near[ln]["dx"])
				best = ln
		var cur: int = main.lane
		var danger: bool = near[cur] != null and bool(near[cur]["bad"]) and float(near[cur]["dx"]) < 210.0
		if danger or (best >= 0 and best != cur and not (near[cur] != null and not bool(near[cur]["bad"]) and float(near[cur]["dx"]) < best_dx)):
			var pick := best
			if pick < 0 or (near[pick] != null and bool(near[pick]["bad"])):
				for ln in 3:
					if near[ln] == null or not bool(near[ln]["bad"]):
						pick = ln
			# jumping two lanes runs through the middle lane: wait while a bad thing is there
			# (2026-11-20: this was the cause of the good bot's lost hearts in every country)
			if pick >= 0 and absi(pick - cur) == 2 and _bad_near(1, -70.0, 280.0):
				pick = -1
			if pick >= 0 and not (danger and pick == cur):
				# a bad thing close ahead in the target lane? then wait
				_go(pick)
	if main.fever_t > 0.0:
		saw_fever = true
	if st == 4:   # END
		var n_rounds: int = main.rounds_run.size()
		var ok: bool = main.stars >= 1 and main.stars <= 3 and (bad or (saw_clock == n_rounds and saw_fever and main.clocks_correct == n_rounds and n_rounds == 4 and str(main.rounds_run[0]["time"]) == str(main.cfg.get("target_time", ""))))
		if bad:
			ok = ok and main.hearts == 0 and main.clocks_correct == 0
		print("%s mode=%s score=%d stars=%d clocks=%d hearts=%d best_combo=%d play_t=%.1f frames=%d rounds=%s" % [
			"QA_SMOKE_OK" if ok else "QA_SMOKE_FAIL", "bad" if bad else "good", main.score, main.stars,
			main.clocks_correct, main.hearts, main.best_combo, main.play_t, frames, str(main.rounds_run.map(func(r): return r["time"]))])
		quit(0 if ok else 1)
		return true
	if frames > 400000:
		print("QA_SMOKE_FAIL timeout state=%d" % st)
		quit(1)
		return true
	return false
