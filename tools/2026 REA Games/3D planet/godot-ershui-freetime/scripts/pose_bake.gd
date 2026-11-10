extends "res://scripts/home_check.gd"
## Free Time 遊戲用：把 home_check.gd 已驗收的室內姿勢「烤」成資料，遊戲直接套（不用在 iPad 上重算、也不用帶 FBX）。
## 執行：Godot --path . res://scenes/pose_bake.tscn
## 產出：
##   data/interior/poses.json   每個室內活動：Ken 的位置、每根骨頭的姿勢、道具（掛在哪根骨頭）、鏡頭、要藏的家具道具
##   data/interior/<活動>_<n>.tscn  道具（耳機、鉛筆、直笛）
##   assets/anims/baked/ken_<動作>.res  Mixamo 動作重定向到 Ken（戶外活動、慶祝）
## home_check.gd 本身不改，所以老師看過的 6 張檢查圖不會變。

const OUT_DIR := "res://data/interior"
const ANIM_DIR := "res://assets/anims/baked"
const BAKE_ANIMS := ["jogging", "dribble", "baseball_hit", "kneeling_idle", "plant_a_plant", "driving", "cheering", "sitting_idle"]

func _ready() -> void:
	# 和 home_check.gd _ready 相同的場景設定（燈、家、Ken）
	var w := World.new()
	w._materials()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.93, 0.96, 0.99)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1.0, 0.95, 0.88)
	e.ambient_light_energy = 0.75
	env.environment = e
	add_child(env)
	hb = Home.new()
	home = hb.build_ken_home()
	add_child(home)
	ken = w.fit_model(MODEL, 1.3, true, 0.3)
	add_child(ken)
	var ap: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	if ap:
		ap.stop()
		ap.active = false
	sk = Retarget.find_type(ken, "Skeleton3D")
	if Pose.right_is_fist(sk):
		Pose.hide_hand_gadget(ken)
	Pose.thin_hand_outline(ken, 0.25)
	cam = Camera3D.new()
	cam.fov = 45
	add_child(cam)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT_DIR))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(ANIM_DIR))
	await get_tree().process_frame
	var out := {"model": MODEL, "bones": [], "poses": {}}
	for i in sk.get_bone_count():
		out["bones"].append(sk.get_bone_name(i))
	for shot in ["watch_tv", "study_english", "surf_internet", "online_games", "recorder", "listen_music"]:
		extra_views.clear()
		if shot == "online_games":
			await _shot_surf_internet()
			(home.get_node("headphones/HeadphonesProp") as Node3D).visible = false
			_put_headphones()
		else:
			await call("_shot_" + shot)
		await get_tree().process_frame
		out["poses"][shot] = _capture(shot)
		print("BAKED ", shot)
		_clear_props()
	# 站姿（Ken 停下時用；GLB 沒有 idle，靜止姿勢是右手舉高）
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	out["stand"] = _bones()
	# 耳機掛在頭上的相對位置（戶外聽音樂也用同一副）
	_put_headphones()
	var hp: BoneAttachment3D = props[-1]
	_save_prop(hp.get_child(0), "stand_headphones")
	out["stand_headphones"] = {"bone": hp.bone_name, "scene": "%s/stand_headphones.tscn" % OUT_DIR, "xf": _xf(hp.get_child(0).transform)}
	_clear_props()
	var f := FileAccess.open(OUT_DIR + "/poses.json", FileAccess.WRITE)
	f.store_string(JSON.stringify(out, " "))
	f.close()
	# Mixamo 動作 → Ken（路徑相對遊戲裡 Ken 的 AnimationPlayer root）
	var ap2: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	var aroot: Node = ap2.get_node(ap2.root_node)
	var spath := String(aroot.get_path_to(sk))
	for nm in BAKE_ANIMS:
		var r := _bind(nm)
		var a := r.bake(spath, 30.0, nm != "baseball_hit")
		r.src_root.queue_free()
		ResourceSaver.save(a, "%s/ken_%s.res" % [ANIM_DIR, nm])
		print("ANIM ", nm, " len=", a.length, " tracks=", a.get_track_count())
	print("BAKE DONE skel_path=", spath)
	get_tree().quit()

func _bones() -> Array:
	var arr := []
	for i in sk.get_bone_count():
		var p := sk.get_bone_pose_position(i)
		var q := sk.get_bone_pose_rotation(i)
		var s := sk.get_bone_pose_scale(i)
		arr.append([p.x, p.y, p.z, q.x, q.y, q.z, q.w, s.x, s.y, s.z])
	return arr

func _xf(t: Transform3D) -> Array:
	var b := t.basis
	return [b.x.x, b.x.y, b.x.z, b.y.x, b.y.y, b.y.z, b.z.x, b.z.y, b.z.z, t.origin.x, t.origin.y, t.origin.z]

func _own(n: Node, owner_node: Node) -> void:
	for c in n.get_children():
		c.owner = owner_node
		_own(c, owner_node)

func _save_prop(node: Node, nm: String) -> void:
	var dup := node.duplicate()
	_own(dup, dup)
	var ps := PackedScene.new()
	ps.pack(dup)
	ResourceSaver.save(ps, "%s/%s.tscn" % [OUT_DIR, nm])
	dup.free()

func _capture(shot: String) -> Dictionary:
	var d := {"ken": _xf(ken.global_transform), "bones": _bones(), "cam": _xf(cam.global_transform), "fov": cam.fov, "props": [], "hide": [], "chair_z": A("Study/DeskChair").position.z}
	for n in ["headphones/HeadphonesProp", "book/Pencil", "Study/RecorderProp"]:
		if not (home.get_node(n) as Node3D).visible:
			d["hide"].append(n)
	var i := 0
	for p in props:
		var ba := p as BoneAttachment3D
		var child: Node3D = ba.get_child(0)
		var nm := "%s_%d" % [shot, i]
		_save_prop(child, nm)
		d["props"].append({"bone": ba.bone_name, "scene": "%s/%s.tscn" % [OUT_DIR, nm], "xf": _xf(child.transform)})
		i += 1
	return d
