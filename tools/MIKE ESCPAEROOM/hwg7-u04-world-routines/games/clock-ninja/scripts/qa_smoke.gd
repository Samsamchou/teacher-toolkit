extends SceneTree
## Headless logic smoke test:  godot --headless --path . --script res://scripts/qa_smoke.gd -- country=uk [bad|child]
## good  (default): taps every good thing (after 0.5 s in the air, at most one tap per 0.22 s) and the right clock,
##        then presses Finish at 50 s (the run must end there).
## child: a careful but slow child - waits 0.8 s, one tap per 0.45 s, taps a little off-centre, lets 10 % go by,
##        answers after 3.5 s and gets the 3rd clock wrong.  (Not a pass/fail test: it shows what score is realistic.)
## slow : like child but slower still - waits 1 s, one tap per 0.8 s, lets 25 % go by.
## bad  : taps the red-glow things and the wrong clocks; must lose all hearts.
## Prints QA_SMOKE_OK ... and exits 0, or QA_SMOKE_FAIL and exits 1.

var main: Node
var frames := 0
var mode := "good"
var started := false
var saw_clock := 0
var saw_fever := false
var next_tap := 0.0
var pressed_finish := false
var skipped := {}
var rng := RandomNumberGenerator.new()

func _initialize() -> void:
	rng.randomize()
	var args := OS.get_cmdline_user_args()
	if "bad" in args:
		mode = "bad"
	elif "child" in args:
		mode = "child"
	elif "slow" in args:
		mode = "slow"
	Engine.time_scale = 6.0
	main = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(main)

func _tap(p: Vector2) -> void:
	main._on_press(p)
	main._on_release()

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
		var wait := 3.5 if mode in ["child", "slow"] else 1.6
		if not main.clock_resolved and main.clock_t > wait:
			var want_ok := mode != "bad"
			if mode in ["child", "slow"] and main.clock_idx == 2:
				want_ok = false
			for c: Dictionary in main.clocks:
				if bool(c["ok"]) == want_ok:
					_tap(main._clock_pos(int(c["slot"])))
					break
	elif st == 2:   # PLAY
		var t: float = main.play_t
		if mode == "good" and main._can_finish() and t > 50.0:
			pressed_finish = true
			_tap(main.finish_rect.get_center())      # the Finish button must end the run at once
			return false
		if t >= next_tap:
			var react: float = {"child": 0.8, "slow": 1.0}.get(mode, 0.5)
			var best: Dictionary = {}
			for it: Dictionary in main.items:
				if int(it["st"]) != 0 or float(it["wait"]) > 0.0 or float(it["t"]) < react:
					continue
				var p: Vector2 = it["p"]
				if p.y > main.H * 0.85 or p.y < 60.0:
					continue
				if bool(it["bad"]) != (mode == "bad"):
					continue
				if mode in ["child", "slow"] and skipped.has(_key(it)):
					continue
				if best.is_empty() or float(it["t"]) > float(best["t"]):
					best = it
			if not best.is_empty():
				if mode in ["child", "slow"] and rng.randf() < (0.25 if mode == "slow" else 0.1):
					skipped[_key(best)] = true
				else:
					var p: Vector2 = best["p"]
					if mode in ["child", "slow"]:
						p += Vector2(rng.randf_range(-40, 40), rng.randf_range(-40, 40))
					_tap(p)
				next_tap = t + float({"child": 0.45, "slow": 0.8, "bad": 0.3}.get(mode, 0.22))
	if main.fever_t > 0.0:
		saw_fever = true
	if st == 4:   # END
		var n_rounds: int = main.rounds_run.size()
		var first_ok: bool = n_rounds > 0 and str(main.rounds_run[0]["time"]) == str(main.cfg.get("target_time", ""))
		var ok: bool = main.stars >= 1 and main.stars <= 3 and first_ok
		if mode == "good":
			ok = ok and saw_clock == n_rounds and saw_fever and main.clocks_correct == n_rounds and n_rounds == 4 and pressed_finish and main.play_t < 55.0
		elif mode == "bad":
			ok = ok and main.hearts == 0 and main.clocks_correct == 0
		print("%s country=%s mode=%s score=%d stars=%d clocks=%d hearts=%d best_combo=%d caught=%d missed=%d bad_hits=%d fever=%s play_t=%.1f rounds=%s" % [
			"QA_SMOKE_OK" if ok else "QA_SMOKE_FAIL", main.country, mode, main.score, main.stars,
			main.clocks_correct, main.hearts, main.best_combo, main.caught_n, main.missed_n, main.bad_hits, str(saw_fever),
			main.play_t, str(main.rounds_run.map(func(r): return r["time"]))])
		quit(0 if ok else 1)
		return true
	if frames > 400000:
		print("QA_SMOKE_FAIL timeout state=%d" % st)
		quit(1)
		return true
	return false

func _key(it: Dictionary) -> int:
	# items are plain dictionaries; their launch gravity + spin make a good-enough id
	return hash([it["g"], it["spin"]])
