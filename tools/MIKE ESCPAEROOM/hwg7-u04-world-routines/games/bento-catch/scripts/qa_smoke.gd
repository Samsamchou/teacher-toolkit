extends SceneTree
## Headless logic smoke test:  godot --headless --path . --script res://scripts/qa_smoke.gd [-- country=egypt] [bad]
## A bot plays one full run (default: plays well; with "bad": stands still and picks wrong clocks).
## Prints QA_SMOKE_OK ... and exits 0, or QA_SMOKE_FAIL and exits 1.

var main: Node
var frames := 0
var bad := false
var started := false
var saw_clock := 0
var saw_fever := false
var has_review := false

func _initialize() -> void:
	bad = "bad" in OS.get_cmdline_user_args()
	Engine.time_scale = 6.0
	main = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(main)

## True when no bad item is about to land on a tray standing at x.
func _safe(x: float) -> bool:
	for it: Dictionary in main.items:
		if bool(it["live"]) and bool(it["bad"]):
			var n: Node2D = it["n"]
			if n.position.y > main.tray_y - 170.0 and n.position.y < main.tray_y + 10.0 and absf(n.position.x - x) < main.catch_hw + float(it["half"]) * 0.55 + 12.0:
				return false
	return true

func _process(_delta: float) -> bool:
	frames += 1
	if frames == 5:
		main._start_run()
		started = true
	if not started:
		return false
	var st: int = main.state
	if st == 3:   # CLOCK
		if main.clock_time in (main.cfg.get("review_times", []) as Array):
			has_review = true
		saw_clock = maxi(saw_clock, main.clock_idx + 1)
		for c: Dictionary in main.clocks:
			if bool(c["ok"]) != bad:
				main.player_x = main._lane_x(int(c["lane"]))
	elif st == 2 and not bad:   # PLAY: go under the lowest good item, away from bad ones
		var best_y := -1e9
		for it: Dictionary in main.items:
			if bool(it["live"]) and not bool(it["bad"]):
				var n: Node2D = it["n"]
				if n.position.y > best_y and n.position.y < main.tray_y - 10.0 and _safe(n.position.x):
					best_y = n.position.y
					main.player_x = n.position.x
		if not _safe(main.player_x):   # nothing safe to catch: step out of the way
			for dx: float in [160.0, -160.0, 320.0, -320.0]:
				var x: float = clampf(main.player_x + dx, 60.0, main.W - 60.0)
				if _safe(x):
					main.player_x = x
					break
	if main.fever_t > 0.0:
		saw_fever = true
	if st == 4:   # END
		var ok: bool = main.stars >= 1 and main.stars <= 3 and (bad or (saw_clock == main.rounds_run.size() and saw_fever and main.clocks_correct == main.rounds_run.size() and main.rounds_run.size() == 4 and str(main.rounds_run[0]["time"]) == str(main.cfg.get("target_time", "")) and has_review and main.stars == 3))
		if bad:
			ok = ok and main.hearts == 0 and main.clocks_correct == 0
		print("%s country=%s mode=%s score=%d stars=%d clocks=%d hearts=%d best_combo=%d play_t=%.1f frames=%d rounds=%s" % [
			"QA_SMOKE_OK" if ok else "QA_SMOKE_FAIL", main.country, "bad" if bad else "good", main.score, main.stars,
			main.clocks_correct, main.hearts, main.best_combo, main.play_t, frames, str(main.rounds_run.map(func(r): return r["time"]))])
		quit(0 if ok else 1)
		return true
	if frames > 400000:
		print("QA_SMOKE_FAIL timeout state=%d" % st)
		quit(1)
		return true
	return false
