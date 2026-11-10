extends Node3D
## 臨時量測：各動作的手、腳、臀軌跡（Ken 烤好的動作）
const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")

func _ready() -> void:
	var w := World.new()
	w._materials()
	var ken: Node3D = w.fit_model("ken_openhand", 1.3, true, 0.3)
	add_child(ken)
	var ap: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	var sk: Skeleton3D = Retarget.find_type(ken, "Skeleton3D")
	print("GLB anims ", ap.get_animation_list(), " skscale ", sk.global_transform.basis.get_scale())
	var lib := AnimationLibrary.new()
	for nm in ["jogging", "dribble", "baseball_hit", "kneeling_idle", "driving", "cheering", "sitting_idle"]:
		lib.add_animation(nm, load("res://assets/anims/baked/ken_%s.res" % nm))
	ap.add_animation_library("ft", lib)
	ap.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	var walk := ""
	for x in ap.get_animation_list():
		if "walk" in String(x).to_lower() and not String(x).begins_with("ft/"):
			walk = x
	var which := OS.get_environment("ANIMS").split(",") if OS.get_environment("ANIMS") != "" else PackedStringArray([walk, "ft/jogging", "ft/dribble", "ft/baseball_hit", "ft/driving"])
	for an in which:
		var A := ap.get_animation(an)
		print("ANIM ", an, " len=", A.length, " loop=", A.loop_mode)
		ap.play(an)
		var n := int(A.length / 0.05)
		for i in n + 1:
			ap.seek(i * 0.05, true)
			ap.advance(0)
			var s := "  t=%.2f" % (i * 0.05)
			for b in ["hips", "righthand", "lefthand", "rightfoot", "leftfoot", "righttoebase", "lefttoebase"]:
				var p := (sk.global_transform * sk.get_bone_global_pose(Retarget._idx(sk, b))).origin
				s += " %s(%.3f,%.3f,%.3f)" % [b.substr(0, 6), p.x, p.y, p.z]
			print(s)
	get_tree().quit()
