extends Node
## 11 段程式動畫線索的「動作合邏輯」檢查（2026-11-10，clue+docs）。
## 每段拍 4 格（start／contact／mid／end，時間見 FRAMES），存 test_clues/<act>_<k>.png，
## 量測（clue_anim.gd 的 gaps()）存 test_clues/metrics.json。和遊戲一樣的大小 560×315。
## 執行：Godot --path . res://scenes/clue_check.tscn   （要開視窗；不要 --headless）

const ClueAnim := preload("res://scripts/clue_anim.gd")
const SIZE := Vector2i(560, 315)
const ACTS := ["jogging", "music", "baseball", "basketball", "bike", "english", "internet", "tv", "camping", "games", "recorder"]
## 每段 4 格的秒數（一輪 6 秒）
const FRAMES := {
	"jogging": [0.95, 1.95, 3.3, 5.5],
	"music": [0.3, 1.02, 2.6, 5.5],
	"baseball": [0.45, 0.9, 1.35, 4.5],
	"basketball": [0.27, -1.0, 1.0, 5.5],   # -1＝自動找球碰地的那一格
	"bike": [0.3, 1.6, 3.0, 5.5],
	"english": [0.5, 1.6, 3.3, 5.55],
	"internet": [0.4, 1.52, 2.4, 5.5],
	"tv": [0.55, 0.97, 1.2, 5.5],
	"camping": [0.3, 1.2, 3.0, 5.5],
	"games": [0.2, 1.02, 1.65, 5.5],
	"recorder": [0.2, 0.32, 1.6, 5.5],
}

func _ready() -> void:
	var out := "res://test_clues"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out))
	var vp := SubViewport.new()
	vp.size = SIZE
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	var metrics := {}
	for act in ACTS:
		var ca := ClueAnim.new()
		ca.act = act
		ca.size = Vector2(SIZE)
		ca.playing = false
		vp.add_child(ca)
		var times: Array = (FRAMES[act] as Array).duplicate()
		if act == "basketball":
			# 球最低（碰地）的那一格
			var best := 0.0
			var low := -1.0
			for i in 300:
				var ph := i / 300.0
				var y: float = ca._bk_state(ph)[0]
				if y > low:
					low = y
					best = ph
			times[1] = best * ClueAnim.LOOP / 4.0
		var used: Array = []
		for kk in 4:
			ca.t = float(times[kk])
			ca.queue_redraw()
			await RenderingServer.frame_post_draw
			await RenderingServer.frame_post_draw
			var img := vp.get_texture().get_image()
			img.save_png("%s/%s_%d.png" % [out, act, kk])
			used.append(snappedf(float(times[kk]), 0.001))
		var g: Dictionary = ca.gaps()
		g["times_s"] = used
		metrics[act] = g
		print("CLUECHECK ", act, " ", JSON.stringify(g))
		ca.queue_free()
		await get_tree().process_frame
	var f := FileAccess.open(out + "/metrics.json", FileAccess.WRITE)
	f.store_string(JSON.stringify(metrics, "  "))
	f.close()
	print("CLUECHECK DONE")
	get_tree().quit()
