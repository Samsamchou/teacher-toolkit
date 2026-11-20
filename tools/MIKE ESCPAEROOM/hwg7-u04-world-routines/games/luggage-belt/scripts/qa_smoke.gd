extends SceneTree
## Headless logic smoke test:  godot --headless --path . --script res://scripts/qa_smoke.gd -- [country=australia] [bad|idle]
## A bot plays one full run through the real press / drag / release handlers.
##   good (default): packs the good things (releasing anywhere below the belt), drags the right suitcase to the trolley.
##   bad:  packs only bad things and drags wrong suitcases -> must lose all hearts.
##   idle: never touches anything -> every clock round times out, no heart is lost.
## Prints QA_SMOKE_OK ... and exits 0, or QA_SMOKE_FAIL and exits 1.

var main: Node
var frames := 0
var mode := "good"
var started := false
var saw_clock := 0
var saw_fever := false
var next_act := 0.0
var answer_at := -1.0
var packed_good := 0
var packed_bad := 0

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if "bad" in args:
		mode = "bad"
	elif "idle" in args:
		mode = "idle"
	elif "child" in args:
		mode = "child"     # a careful but slow pupil: one drag per 1.5 s, lets 20% of chances go, gets one clock wrong
	Engine.time_scale = 6.0
	main = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(main)

func _drag(from: Vector2, to: Vector2) -> void:
	main._on_press(from)
	main._on_motion(from.lerp(to, 0.5))
	main._on_motion(to)
	main._on_release(to)

func _process(_delta: float) -> bool:
	frames += 1
	if frames == 5:
		main._start_run()
		started = true
	if not started:
		return false
	var st: int = main.state
	var now: float = main.anim_t
	if st == 3:   # CLOCK
		saw_clock = maxi(saw_clock, main.clock_idx + 1)
		if main.clock_resolved:
			answer_at = -1.0
		elif mode != "idle" and main.clock_t >= main.CLOCK_ROLL:
			if answer_at < 0.0:
				answer_at = main.clock_t + randf_range(0.8, 3.0)      # a pupil listens first
			elif main.clock_t >= answer_at:
				var want_ok: bool = mode == "good" or (mode == "child" and main.clock_idx != 2)
				for c: Dictionary in main.clocks:
					if bool(c["ok"]) == want_ok:
						_drag(c["pos"], main.trolley_slot.get_center())
						break
	elif (st == 1 or st == 2) and mode != "idle" and now >= next_act:
		# one drag at most every 0.8 s, the most urgent (right-most) thing first
		var best: Dictionary = {}
		for it: Dictionary in main.items:
			if int(it["mode"]) != 0 or bool(it["bad"]) != (mode == "bad"):
				continue
			var x: float = (it["n"] as Node2D).position.x
			if x < main.hatch_rect.end.x or x > main.W - 40.0:
				continue
			if best.is_empty() or x > (best["n"] as Node2D).position.x:
				best = it
		if mode == "child" and not best.is_empty() and randf() < 0.2:
			best = {}
			next_act = now + 1.5
		if not best.is_empty():
			var p: Vector2 = (best["n"] as Node2D).position + Vector2(randf_range(-20, 20), randf_range(-20, 20))
			# release somewhere below the belt (not necessarily on the suitcase)
			_drag(p, Vector2(randf_range(main.W * 0.35, main.W * 0.9), randf_range(main.drop_y + 20.0, main.H - 30.0)))
			if mode == "bad":
				packed_bad += 1
			else:
				packed_good += 1
			next_act = now + (1.5 if mode == "child" else 0.8)
	if main.fever_t > 0.0:
		saw_fever = true
	if st == 4:   # END
		var n_rounds: int = main.rounds_run.size()
		var first_ok: bool = n_rounds > 0 and str(main.rounds_run[0]["time"]) == str(main.cfg.get("target_time", ""))
		var ok: bool = main.stars >= 1 and main.stars <= 3 and first_ok
		if mode == "good":
			ok = ok and saw_clock == n_rounds and n_rounds == 4 and saw_fever and main.clocks_correct == n_rounds
		elif mode == "child":
			ok = ok and main.clocks_correct == n_rounds - 1      # only reports the score; no star target
		elif mode == "bad":
			ok = ok and main.hearts == 0 and main.clocks_correct == 0
		else:
			ok = ok and saw_clock == n_rounds and main.clocks_correct == 0 and main.hearts == 3 and main.clock_results.size() == n_rounds
		print("%s country=%s mode=%s score=%d stars=%d clocks=%d hearts=%d best_combo=%d packed=%d play_t=%.1f frames=%d rounds=%s" % [
			"QA_SMOKE_OK" if ok else "QA_SMOKE_FAIL", main.country, mode, main.score, main.stars,
			main.clocks_correct, main.hearts, main.best_combo, packed_good + packed_bad, main.play_t, frames,
			str(main.rounds_run.map(func(r): return r["time"]))])
		quit(0 if ok else 1)
		return true
	if frames > 600000:
		print("QA_SMOKE_FAIL timeout state=%d" % st)
		quit(1)
		return true
	return false
