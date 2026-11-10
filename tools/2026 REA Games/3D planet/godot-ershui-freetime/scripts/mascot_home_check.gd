extends "res://scripts/home_check.gd"
## 水鈴、圳寶的家：室內＋六個室內休閒動作截圖（和 Ken 一樣的六張），存 test_home_<who>/*.png
## 執行：WHO=shuiling|zunbo  Godot --path . res://scenes/mascot_home_check.tscn   （ONLY=watch_tv 只拍一張；PROBE=1 只量身體）
## 沿用 home_check.gd 的量測工具（_sit、measure、skinned_points…）；變數 ken＝目前的角色。

var who := "zunbo"
var D := {}   # 這個家的家具尺寸（home_interior 的 dims）
var out_dir := ""

const CHARS := {
	"shuiling": {"model": "shuiling_softhand", "h": 1.2},   # 軟手版（tools/make_softhand.py）；OLDHAND=1 用原模型對照
	"zunbo": {"model": "zunbo_openhand", "h": 1.15},
}

func _ready() -> void:
	who = OS.get_environment("WHO") if OS.get_environment("WHO") != "" else "zunbo"
	var w := World.new()
	w._materials()
	_lights()
	hb = Home.new()
	home = hb.call("build_%s_home" % who)
	add_child(home)
	D = home.get_meta("dims")
	var mname: String = CHARS[who]["model"]
	if OS.get_environment("OLDHAND") != "" and who == "shuiling":
		mname = "shuiling_rigged"
	ken = w.fit_model(mname, CHARS[who]["h"], true, 0.3)
	add_child(ken)
	var ap: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	if ap:
		ap.stop()
		ap.active = false
	sk = Retarget.find_type(ken, "Skeleton3D")
	print("手描邊變細，頂點數 ", Pose.thin_hand_outline(ken, 0.15 if mname.ends_with("softhand") else 0.25))
	cam = Camera3D.new()
	cam.fov = 45
	cam.near = 0.02
	add_child(cam)
	out_dir = "res://test_home_%s%s" % [who, "_oldhand" if mname == "shuiling_rigged" else ""]
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_dir))
	await get_tree().process_frame
	print("FURNITURE ", who, " ", D)
	if who == "shuiling":
		_make_skirt_mask()
	if OS.get_environment("PROBE") != "":
		_probe()
		if OS.get_environment("PROBE") == "face":
			home.visible = false
			var rt := _bind("sitting_idle")
			Pose.pose_stand(sk, rt.corr)
			rt.src_root.queue_free()
			var hd := _bpos("head")
			cam.projection = Camera3D.PROJECTION_ORTHOGONAL
			cam.size = 0.8
			cam.look_at_from_position(hd + Vector3(0, 0.2, 2.0), hd + Vector3(0, 0.2, 0), Vector3.UP)
			print("FACECAM 頭骨 ", hd, " 畫面中心 y ", hd.y + 0.2, " size 0.8（高 720 px）")
			_face_profile()
			await _save("face_front")
			cam.look_at_from_position(hd + Vector3(2.0, 0.2, 0), hd + Vector3(0, 0.2, 0), Vector3.UP)
			await _save("face_side")
		if OS.get_environment("PROBE") == "shots":
			await _probe_shots()
		get_tree().quit()
		return
	var only := OS.get_environment("ONLY")
	for shot in ["overview", "watch_tv", "listen_music", "study_english", "surf_internet", "recorder", "skirt_sofa", "skirt_chair"]:
		if (only == "" and shot.begins_with("skirt")) or (only != "" and shot != only):
			continue
		extra_views.clear()
		print("── ", shot)
		await call("_m_" + shot)
		await _save(shot)
		for v in extra_views:
			_look(v[1], v[2], v[3])
			await _save(shot + "_" + v[0])
		if not front_view.is_empty():   # 直笛正前方：譜架藏起來拍
			(home.get_node("Study/MusicStand") as Node3D).visible = false
			_look(front_view[0], front_view[1], front_view[2])
			await _save(shot + "_front")
			(home.get_node("Study/MusicStand") as Node3D).visible = true
			front_view = []
		_clear_props()
		home.visible = true
	get_tree().quit()

func _lights() -> void:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.93, 0.96, 0.99)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1.0, 0.95, 0.88)
	e.ambient_light_energy = 0.75
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(1, 6, 7), Vector3(0.5, 0, 1.5), Vector3.UP)
	sun.light_energy = 0.55
	sun.light_color = Color(1.0, 0.97, 0.92)
	for p in [Vector3(2.5, 2.0, 2.0), Vector3(-1.75, 2.0, 1.5)]:
		var o := OmniLight3D.new()
		o.position = p
		o.omni_range = 5.5
		o.omni_attenuation = 0.6
		o.light_energy = 0.9
		o.light_color = Color(1.0, 0.9, 0.75)
		add_child(o)

func _save(nm: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [out_dir, nm])
	print("saved ", nm)

# ───────── 量身體（PROBE） ─────────
func _probe() -> void:
	sk.reset_bone_poses()
	ken.global_transform = Transform3D.IDENTITY
	if OS.get_environment("DUMP") != "":
		_dump_lower()
	if OS.get_environment("PROBE") == "hand":
		var names := []
		for i in sk.get_bone_count():
			names.append(Retarget.norm(sk.get_bone_name(i)))
		print("BONES ", names)
		_handinfo()
		return
	var P := skinned_points(1)
	var mn := Vector3(9, 9, 9)
	var mx := -mn
	for p in P:
		mn = mn.min(p)
		mx = mx.max(p)
	print("REST bbox ", mn, " ~ ", mx)
	for b in ["hips", "spine", "neck", "head", "headtop_end", "leftarm", "leftforearm", "lefthand", "lefthandmiddle1", "leftupleg", "leftleg", "leftfoot", "lefttoebase"]:
		print("  bone ", b, " ", _bpos(b) if Retarget._idx(sk, b) >= 0 else "none")
	if OS.get_environment("PROBE") == "zdesk":   # 圳寶寫字：前傾 lean、抬頭 pitch 時，下巴、肩、手伸得到多遠（相對屁股最低點；z 相對臀部）
		for thk in [[90.0, 30.0], [90.0, 60.0], [90.0, 90.0], [70.0, 30.0], [70.0, 60.0], [70.0, 90.0], [55.0, 30.0], [55.0, 60.0], [55.0, 90.0]]:
			var th: float = thk[0]
			var kn: float = thk[1]
			for lean in [0.0]:
				for pitch in [0.0]:
					var rl := _bind("sitting_idle")
					Pose.pose_sit_simple(sk, rl.corr, th, kn, 6.0, lean)
					var w := Pose.pose_world(sk)
					if pitch != 0.0:
						Pose._rot_chain(sk, w, Retarget._idx(sk, "neck"), Basis(Quaternion(Pose._left(sk), -deg_to_rad(pitch))))
						Pose.apply_world(sk, w)
					rl.src_root.queue_free()
					var q := measure_m()
					var I := _pts_info(2)
					var chin := 9.0
					var kneef := -9.0
					var thigh := -9.0
					for i in I["p"].size():
						var bn: String = I["b"][i]
						var pp: Vector3 = I["p"][i]
						if bn.begins_with("head"):
							chin = minf(chin, pp.y)
						if (bn.contains("leg") or bn.contains("foot") or bn.contains("toe")) and pp.z > _bpos("hips").z + 0.19:
							kneef = maxf(kneef, pp.z)
							thigh = maxf(thigh, pp.y)
					var sh := _bpos("leftarm")
					var L: float = q["l1"] + q["l2"]
					var line := "ZDESK 大腿%d 膝%d 前傾%d 抬頭%d：下巴 %.3f 桌邊外的腿最高 %.3f 膝最前 z %.3f 肩 y %.3f z %.3f 臂長 %.3f ｜" % [th, kn, lean, pitch, chin - q["seat"], thigh - q["seat"], kneef - q["hips_z"], sh.y - q["seat"], sh.z - q["hips_z"], L]
					for dh in [0.18, 0.20, 0.22]:
						var desk: float = chin - dh
						var drop: float = sh.y - desk - 0.03
						var reach: float = sqrt(maxf(L * L - drop * drop, 0.0)) + sh.z - q["hips_z"]
						line += " 桌=下巴-%.2f(座上%.3f) 腕可到 z %.3f" % [dh, desk - q["seat"], reach]
					print(line)
		return
	if OS.get_environment("PROBE") == "rec":   # 圳寶吹直笛：往後仰 lean、低頭 neck、笛子角度 down、兩手位置 → IK 誤差
		for shf in [0.0, 10.0, 20.0]:
			for lean in [0.0, 8.0, 15.0]:
				for dn in [55.0, 65.0, 75.0]:
					for L in [0.18, 0.22]:
						for gp in [[0.35, 0.75], [0.5, 0.85]]:
							var rr := _bind("sitting_idle")
							Pose.pose_stand(sk, rr.corr)
							Pose.pose_recorder(sk, rr.corr, Vector3(0.0, 0.028, 0.226), L, dn, L * gp[0], L * gp[1], 0.03, 95.0, 0.12, 0.03, 0.0, false, lean, 0.0185, shf)
							rr.src_root.queue_free()
							var rp: Dictionary = Pose.last_report
							var e: float = rp["right"].get("err", 0.0) + rp["left"].get("err", 0.0)
							if e < 0.012:
								print("REC 收肩%d 前傾%d 角%d 長%.2f 握%s：右 IK %.1f mm、左 IK %.1f mm；腕彎 右%.0f 左%.0f" % [shf, lean, dn, L, gp, rp["right"].get("err", 0.0) * 1000.0, rp["left"].get("err", 0.0) * 1000.0, rp["right"].get("bend", 0.0), rp["left"].get("bend", 0.0)])
		return
	if OS.get_environment("PROBE") == "back":   # 坐姿背面輪廓：每 2 cm 高度，身體最後面（不含手臂；含肩膀）離臀部多遠
		var rb := _bind("sitting_idle")
		Pose.pose_sit_simple(sk, rb.corr, D["thigh"], D["knee"], 6.0, 0.0)
		rb.src_root.queue_free()
		var q := measure_m()
		var prof := {}
		var I := _pts_info(1)
		for i in I["p"].size():
			var bn: String = I["b"][i]
			if bn.contains("hand") or bn.contains("forearm"):
				continue
			var pp: Vector3 = I["p"][i]
			var k := int(floor((pp.y - q["seat"]) / 0.02))
			var key := "%d" % k
			if not prof.has(key) or pp.z < prof[key][0]:
				prof[key] = [pp.z, bn]
		var ks := prof.keys()
		ks.sort_custom(func(a, b): return int(a) < int(b))
		for k in ks:
			print("BACK 座上 %.2f：最後面 z %.3f（%s）" % [int(k) * 0.02, prof[k][0] - q["hips_z"], prof[k][1]])
		return
	if OS.get_environment("PROBE") == "legs":
		for th in [90.0, 80.0, 70.0]:
			for kn in [90.0, 60.0, 45.0, 30.0]:
				var rl := _bind("sitting_idle")
				Pose.pose_sit_simple(sk, rl.corr, th, kn, 6.0, 0.0)
				rl.src_root.queue_free()
				var q := measure_m()
				print("LEGS 大腿%d 膝%d：腳底 %.3f 小腿最後 z %.3f 腳 z %.3f~%.3f 膝前 z %.3f 大腿頂 %.3f" % [th, kn, q["minY"] - q["seat"], q["shin_back_z"] - q["hips_z"], q["foot_lo"].z - q["hips_z"], q["foot_hi"].z - q["hips_z"], q["knee_front_z"] - q["hips_z"], q["thigh_top"] - q["seat"]])
		return
	for th in [80.0, 90.0]:
		var rt0 := _bind("sitting_idle")
		Pose.pose_sit_simple(sk, rt0.corr, th, th, 6.0, 0.0)
		rt0.src_root.queue_free()
		var mm := measure_m()
		print("SIT%d %s" % [th, mm])
		print("   相對屁股底：臀骨 %.3f 腳底 %.3f 大腿頂 %.3f 肩 %.3f 下巴 %.3f 眼 %.3f 頭頂 %.3f；膝前 z %.3f 肚子前 z %.3f 頭最前 z %.3f 肩 z %.3f 上臂 %.3f 前臂 %.3f 背 z %.3f 裙背 z %.3f 半寬 %.3f" % [mm["hips_y"] - mm["seat"], mm["minY"] - mm["seat"], mm["thigh_top"] - mm["seat"], mm["shoulder"].y - mm["seat"], mm["chin"] - mm["seat"], mm["eye"].y - mm["seat"], mm["top"] - mm["seat"], mm["knee_front_z"] - mm["hips_z"], mm["belly_z"] - mm["hips_z"], mm["head_front_z"] - mm["hips_z"], mm["shoulder"].z - mm["hips_z"], mm["l1"], mm["l2"], mm["back_z"] - mm["hips_z"], mm["back_skirt_z"] - mm["hips_z"], mm["half_w"]])
	for anim in []:
		var rt := _bind(anim)
		var t: float = Home.SIT[anim]["t"]
		rt.apply_at(rt.length() * t)
		var m := measure()
		print("PROBE %s %s" % [anim, m])
		print("   head ", _bpos("head"), " shoulderL ", _bpos("leftarm"), " knee ", _bpos("leftleg"), " foot ", _bpos("leftfoot"), " toe ", _bpos("lefttoebase"))
		# 每 2 cm 一層：這層的頂點 z 範圍（看大腿、屁股、裙子）
		var prof := {}
		for p in skinned_points(2):
			var k := int(floor(p.y / 0.02))
			if not prof.has(k):
				prof[k] = [9.0, -9.0, 0]
			prof[k][0] = minf(prof[k][0], p.z)
			prof[k][1] = maxf(prof[k][1], p.z)
			prof[k][2] += 1
		var ks := prof.keys()
		ks.sort()
		var s := "   層 y: z範圍"
		for k in ks:
			if k * 0.02 < 0.7:
				s += " | %.2f: %.2f~%.2f" % [k * 0.02, prof[k][0], prof[k][1]]
		print(s)
		var hips := _bpos("hips")
		var low := {}
		for it in Pose._hp_skinned(sk, "", ["hips", "leftupleg", "rightupleg", "spine", "leftleg", "rightleg"]):
			var names: Array = it[0]
			var Q: PackedVector3Array = it[1]
			for j in Q.size():
				var q := Q[j]
				if q.z > hips.z - 0.2 and q.z < hips.z + 0.08 and absf(q.x - hips.x) < 0.2 and q.y < hips.y:
					low[names[j]] = minf(low.get(names[j], 9.0), q.y)
		print("   臀部下方各骨最低 y：", low)
		rt.src_root.queue_free()

## 吉祥物的 measure：屁股最低點的搜尋高度改成相對臀部（腿短）
func measure() -> Dictionary:
	var P := skinned_points()
	var hips := _bpos("hips")
	var knee := (_bpos("leftleg") + _bpos("rightleg")) * 0.5
	var seat := 9.0
	var back := 9.0
	var knee_front := -9.0
	var minY := 9.0
	for p in P:
		minY = minf(minY, p.y)
		if p.y < hips.y and p.y > hips.y - SEAT_SEARCH and p.z > hips.z - 0.2 and p.z < hips.z + 0.08 and absf(p.x - hips.x) < 0.2:
			seat = minf(seat, p.y)
		if p.y < hips.y + 0.2:
			back = minf(back, p.z)
		if p.y > knee.y - 0.08 and p.y < knee.y + 0.08:
			knee_front = maxf(knee_front, p.z)
	return {"hips_x": hips.x, "hips_y": hips.y, "hips_z": hips.z, "seat": seat, "back_z": back, "knee_y": knee.y, "knee_z": knee.z,
		"knee_front_z": knee_front, "minY": minY, "handL": _bpos("lefthandmiddle1"), "handR": _bpos("righthandmiddle1")}

var SEAT_SEARCH := 0.12

func _probe_shots() -> void:
	home.visible = false
	for anim in ["sitting_idle", "writing", "typing", "stand"]:
		var rt := _bind("sitting_idle" if anim == "stand" else anim)
		if anim == "stand":
			Pose.pose_stand(sk, rt.corr)
		else:
			rt.apply_at(rt.length() * float(Home.SIT[anim]["t"]))
		rt.src_root.queue_free()
		ken.global_transform = Transform3D(Basis.IDENTITY, Vector3(0, 0.3, 0))
		for k in 3:
			var d: Vector3 = [Vector3(0, 0.1, 1.6), Vector3(1.6, 0.1, 0.1), Vector3(-0.9, -0.6, 1.0)][k]
			_look(Vector3(0, 0.75, 0) + d * 1.6, Vector3(0, 0.62, 0.05), 30)
			await _save("probe_%s_%d" % [anim, k])

## 診斷：靜止姿勢下半身頂點（主骨、位置、貼圖顏色）寫到 DUMP
func _dump_lower() -> void:
	var mis := []
	_collect(ken, mis)
	var dump := ""
	for mi: MeshInstance3D in mis:
		var skin := mi.skin
		var mesh := mi.mesh
		var bidx := []
		var bm := []
		for i in skin.get_bind_count():
			var bi := skin.get_bind_bone(i)
			if bi < 0:
				bi = sk.find_bone(skin.get_bind_name(i))
			bidx.append(bi)
			bm.append(sk.get_bone_global_pose(bi) * skin.get_bind_pose(i))
		for su in mesh.get_surface_count():
			var a := mesh.surface_get_arrays(su)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var UV: PackedVector2Array = a[Mesh.ARRAY_TEX_UV]
			var img: Image = (mesh.surface_get_material(su) as StandardMaterial3D).albedo_texture.get_image()
			if img.is_compressed():
				img.decompress()
			var nb: int = B.size() / V.size()
			for vi in V.size():
				var p := Vector3.ZERO
				var ws := ""
				for k in nb:
					var wt: float = W[vi * nb + k]
					if wt > 0.0:
						p += (bm[B[vi * nb + k]] * V[vi]) * wt
						ws += "%s:%.2f," % [Retarget.norm(sk.get_bone_name(bidx[B[vi * nb + k]])), wt]
				p = sk.global_transform * p
				if p.y > 0.55:
					continue
				var uv: Vector2 = UV[vi]
				var c := img.get_pixel(clampi(int(uv.x * img.get_width()), 0, img.get_width() - 1), clampi(int(uv.y * img.get_height()), 0, img.get_height() - 1))
				dump += "%d %f %f %f %s %s
" % [vi, p.x, p.y, p.z, c.to_html(false), ws]
	var fa := FileAccess.open(OS.get_environment("DUMP"), FileAccess.WRITE)
	fa.store_string(dump)
	fa.close()

# ───────── 裙子（水鈴）：靜止姿勢下離腿骨軸 > 7.5 cm 的下半身頂點＝裙子 ─────────
var skirt := {}   # MeshInstance3D id → PackedByteArray（1＝裙子）

func _make_skirt_mask() -> void:   # 裙子遮罩：procedural_pose.gd skirt_info（遊戲坐下時 settle_skirt 用同一份）
	sk.reset_bone_poses()
	ken.global_transform = Transform3D.IDENTITY
	var n := 0
	for mi: MeshInstance3D in Pose.skirt_info(ken):
		var m: PackedByteArray = mi.get_meta("skirt")["mask"]
		skirt[mi.get_instance_id()] = m
		n += m.count(1)
	print("裙子頂點數 ", n)

## 全身蒙皮頂點（世界）＋主骨名＋是不是裙子：{"p": [...], "b": [...], "s": [...]}
var _bn_cache := {}
func _pts_info(step := 1) -> Dictionary:
	var P := PackedVector3Array()
	var Bn := []
	var S := PackedByteArray()
	var mis := []
	_collect(ken, mis)
	for mi: MeshInstance3D in mis:
		var mask: PackedByteArray = skirt.get(mi.get_instance_id(), PackedByteArray())
		var skin := mi.skin
		var bm := []
		var bnm := []
		for i in skin.get_bind_count():
			var bi := skin.get_bind_bone(i)
			if bi < 0:
				bi = sk.find_bone(skin.get_bind_name(i))
			bm.append(sk.get_bone_global_pose(bi) * skin.get_bind_pose(i))
			bnm.append(Retarget.norm(sk.get_bone_name(bi)))
		var base := 0
		for s in mi.mesh.get_surface_count():
			var a := mi.mesh.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			var nb: int = B.size() / V.size()
			for vi in range(0, V.size(), step):
				var p := Vector3.ZERO
				var bw := 0.0
				var best := ""
				for k in nb:
					var wt: float = W[vi * nb + k]
					if wt > 0.0:
						p += (bm[B[vi * nb + k]] * V[vi]) * wt
					if wt > bw:
						bw = wt
						best = bnm[B[vi * nb + k]]
				P.append(sk.global_transform * p)
				Bn.append(best)
				S.append(1 if mask.size() > 0 and mask[base + vi] == 1 else 0)
			base += V.size()
	return {"p": P, "b": Bn, "s": S}

func _pts(which := -1, step := 1) -> PackedVector3Array:
	var I := _pts_info(step)
	var out := PackedVector3Array()
	for i in I["p"].size():
		if which < 0 or I["s"][i] == which:
			out.append(I["p"][i])
	return out

## 坐姿量測（角色在原點、面向 +Z）：屁股最低點（不含裙子）、腳底、大腿頂、肩、下巴、頭…
func measure_m() -> Dictionary:
	var hips := _bpos("hips")
	var knee := (_bpos("leftleg") + _bpos("rightleg")) * 0.5
	var head := _bpos("head")
	var seat := 9.0
	var minY := 9.0
	var thigh_top := -9.0
	var knee_front := -9.0
	var belly := -9.0
	var top := -9.0
	var head_front := -9.0
	var chin := 9.0
	var I := _pts_info(1)   # 每個頂點都量（屁股最低點不能漏）
	for i in I["p"].size():
		var p: Vector3 = I["p"][i]
		var bn: String = I["b"][i]
		var isk: bool = I["s"][i] == 1
		var thigh := bn == "hips" or bn.ends_with("upleg")
		if not isk:
			minY = minf(minY, p.y)
			if thigh and p.y < hips.y:
				seat = minf(seat, p.y)
		top = maxf(top, p.y)
		if (thigh or bn.ends_with("leg")) and p.z > hips.z + 0.02:
			thigh_top = maxf(thigh_top, p.y)
			knee_front = maxf(knee_front, p.z)
		if bn.begins_with("spine") or bn == "hips":
			belly = maxf(belly, p.z)
		if bn.begins_with("head") or bn == "neck":
			head_front = maxf(head_front, p.z)
			if p.z > head.z + 0.03 and absf(p.x - head.x) < 0.08:
				chin = minf(chin, p.y)
	var back := 9.0
	var back_sk := 9.0
	var halfw := 0.0
	for i in I["p"].size():
		var p: Vector3 = I["p"][i]
		var bn: String = I["b"][i]
		if p.y > seat and p.y < seat + 0.3 and not bn.begins_with("head") and not bn.contains("hand") and not bn.contains("arm"):
			if I["s"][i] == 1:
				back_sk = minf(back_sk, p.z)
			else:
				back = minf(back, p.z)
			if p.y < seat + 0.15:
				halfw = maxf(halfw, absf(p.x - hips.x))
	var shin_back := 9.0
	var foot_lo := Vector3(9, 9, 9)
	var foot_hi := -foot_lo
	for i in I["p"].size():
		var bn: String = I["b"][i]
		var p: Vector3 = I["p"][i]
		if I["s"][i] == 0 and (bn.ends_with("leg") and not bn.ends_with("upleg") or bn.contains("foot") or bn.contains("toe")) and p.y < seat:
			shin_back = minf(shin_back, p.z)
			if p.y < minY + 0.03:
				foot_lo = foot_lo.min(p)
				foot_hi = foot_hi.max(p)
	var sh := _bpos("leftarm")
	return {"shin_back_z": shin_back, "foot_lo": foot_lo, "foot_hi": foot_hi, "back_z": back, "back_skirt_z": back_sk, "half_w": halfw, "hips_x": hips.x, "hips_y": hips.y, "hips_z": hips.z, "seat": seat, "minY": minY, "thigh_top": thigh_top, "knee_front_z": knee_front,
		"belly_z": belly, "top": top, "head_front_z": head_front, "chin": chin, "shoulder": sh, "eye": head,
		"l1": sh.distance_to(_bpos("leftforearm")), "l2": _bpos("leftforearm").distance_to(_bpos("lefthand"))}

# ═════════ 六張圖 ═════════
const CF := {
	"shuiling": {"curl": 0.0, "spread": 0.0, "hp_scale": 1.0, "ear": 0.3},
	"zunbo": {"curl": 50.0, "spread": 7.0, "hp_scale": 1.45, "ear": 0.42},
}
const CF_PH := {"shuiling": ["#f6c453", "#ffffff"], "zunbo": ["#f28c28", "#2a7f78"]}
var baked := []   # [原本的 MeshInstance3D, 烤好的 MeshInstance3D]
var baked_skirt := PackedVector3Array()   # 壓平之後的裙子頂點（世界）

func _clear_props() -> void:
	super._clear_props()
	for b in baked:
		(b[0] as MeshInstance3D).visible = true
		(b[1] as Node).queue_free()
	baked.clear()
	baked_skirt.clear()
	A("Study/DeskChair").position.z = A("desk_seat").position.z
	A("Study/DeskChair").position.x = A("desk_seat").position.x

## 坐下：程式坐姿 → 量屁股最低點（不含裙子）→ 屁股落在錨點；腳底踩地板或腳踏（foot_h）
func _sit_m(anchor: String, fix := Callable(), sink := 0.006, foot_h := 0.0, thigh := -1.0, knee := -1.0, lean := 0.0) -> Dictionary:
	if thigh < 0.0:
		thigh = D["thigh"]
	if knee < 0.0:
		knee = D["knee"]
	var rt := _bind("sitting_idle")
	last_corr = rt.corr
	Pose.pose_sit_simple(sk, rt.corr, thigh, knee, 6.0, lean)
	var m := measure_m()
	var anc := A(anchor)
	var shift := 0.0
	if anchor.begins_with("desk_seat"):   # 書桌：量肚子／胸口（桌面高度那一段）最前面，離桌邊至少 4 mm，不夠就把椅子往後挪
		var lift: float = anc.global_position.y - m["seat"] - sink
		var y0: float = D["desk_top"] - D["desk_t"] - 0.02 - lift
		var y1: float = D["desk_top"] + 0.08 - lift
		var front := -9.0
		var knee_top := -9.0
		var I := _pts_info(2)
		for i in I["p"].size():
			var bn: String = I["b"][i]
			var q: Vector3 = I["p"][i]
			if bn.contains("hand") or bn.contains("arm") or bn.contains("shoulder"):
				continue
			if bn.contains("leg") or bn.contains("foot") or bn.contains("toe"):
				knee_top = maxf(knee_top, q.y + lift)
				continue
			if q.y > y0 and q.y < y1:
				front = maxf(front, q.z)
		var need: float = front - m["hips_z"] + 0.004
		shift = maxf(0.0, need - D["edge_off"])
		print("  書桌：身體在桌面高度最前面離臀部 %.3f；桌邊離臀部 %.3f → 椅子往後挪 %.1f mm；腿最高 y=%.3f（桌板下緣 %.3f）" % [front - m["hips_z"], D["edge_off"], shift * 1000.0, knee_top, D["desk_top"] - D["desk_t"]])
		var ch := A("Study/DeskChair")
		ch.position.x = A(anchor).position.x + shift
	var M := anc.global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3(m["hips_x"], -m["seat"] - sink, m["hips_z"] + shift))
	if fix.is_valid():
		fix.call(rt, M.affine_inverse())
	var gap: float = anc.global_position.y - m["seat"] - sink + m["minY"] - foot_h
	for it in 3:
		if gap >= 0.0:
			break
		Pose.lift_feet(sk, 0.004 - gap)
		var m2 := measure_m()
		var g2: float = anc.global_position.y - m["seat"] - sink + m2["minY"] - foot_h
		print("  腳底修正：%.3f → %.3f" % [gap, g2])
		gap = g2
	ken.global_transform = M
	rt.src_root.queue_free()
	await get_tree().process_frame
	print("  小腿／腳最後面 z %.3f（相對臀部；坐墊前緣要在這後面）腳底範圍 %s ~ %s" % [m["shin_back_z"] - m["hips_z"], m["foot_lo"] - Vector3(m["hips_x"], 0, m["hips_z"]), m["foot_hi"] - Vector3(m["hips_x"], 0, m["hips_z"])])
	print("  -> 坐 %s：坐墊面 %.3f、屁股最低點（不含裙子）沉進 %.1f mm；腳底離%s %.1f mm（0＝剛好踩著；正＝懸空）" % [anchor, anc.global_position.y, sink * 1000.0, "腳踏" if foot_h > 0.0 else "地板", gap * 1000.0])
	m["floor_gap"] = gap
	return m

## 兩手放在大腿（或裙子）上；水鈴手指不彎
var last_corr := {}
func _hands_on_lap(rt: Retarget, along := -1.0, top_override := Callable()) -> void:
	if along < 0.0:
		along = 0.6 if who == "shuiling" else 0.3   # 圳寶大腿只有 9 cm、手很大：手掌放在大腿根，手指才不會掉到小腿上
	var corr: Dictionary = rt.corr if rt != null else last_corr
	var top: Callable = top_override if top_override.is_valid() else (Pose.lap_top_map(ken) if who == "shuiling" else Pose.height_map(sk, ["leftupleg", "rightupleg", "leftleg", "rightleg", "hips"]))
	for sd in ["left", "right"]:
		var sgn := 1.0 if sd == "left" else -1.0
		var hip := _bpos(sd + "upleg")
		var knee := _bpos(sd + "leg")
		var dir := (knee - hip).normalized() + Vector3(-sgn * (0.25 if who == "shuiling" else 0.05), 0, 0)
		# 水鈴：手很短、裙子膨膨的 → 沿著大腿試幾個位置，挑手最貼著裙子（2～5 mm）的那個
		var cands := [along] if who != "shuiling" else [0.35, 0.45, 0.55, 0.65, 0.75, 0.85]
		var w0 := Pose.pose_world(sk)
		var best_a: float = cands[0]
		var best_s := 1e9
		if cands.size() > 1:
			for al: float in cands:
				Pose.apply_world(sk, w0, true)
				var r0 := Pose.rest_hand_on(sk, corr, sd, hip.lerp(knee, al), top, dir, Vector3(sgn * 1.0, -0.15, -0.8), 0.003, 0.002, false, CF[who]["curl"], CF[who]["spread"], Vector3(0.74, -0.22, 0.64), true)
				r0 = _lift_hand(sd, top, 0.002, Vector3(sgn * 1.0, -0.15, -0.8), r0)
				var sc: float = absf(float(r0["_min"]) - 0.003)
				if sc < best_s:
					best_s = sc
					best_a = al
			Pose.apply_world(sk, w0, true)
		var rep := Pose.rest_hand_on(sk, corr, sd, hip.lerp(knee, best_a), top, dir, Vector3(sgn * 1.0, -0.15, -0.8), 0.003, 0.002, false, CF[who]["curl"], CF[who]["spread"], Vector3(0.74, -0.22, 0.64), who == "shuiling")
		rep = _lift_hand(sd, top, 0.002, Vector3(sgn * 1.0, -0.15, -0.8), rep)
		_print_gap("%s 手離大腿（沿大腿 %.2f）" % [sd, best_a], sd, rep)

## 裙子（水鈴）坐下後會穿進坐墊 → 把穿進去的裙子頂點壓平到坐墊面上（像布被屁股壓住），烤成靜態網格只用在這張圖
## boxes：[[AABB, 推出方向 Vector3.UP / ±X / ±Z], …]
var skirt_rep := {}
func _bake_skirt(boxes: Array, gap := 0.003) -> void:   # 用遊戲也會用的 Pose.settle_skirt
	if skirt.is_empty():
		return
	skirt_rep = Pose.settle_skirt(ken, boxes, gap, 0.02)
	for pr in skirt_rep["nodes"]:
		baked.append(pr)
	baked_skirt = skirt_rep["skirt_pts"]
	print("  裙子旁邊一起放鬆的腿／腰頂點 %d 個，最多移 %.1f mm" % [skirt_rep.get("seam_moved", 0), skirt_rep.get("seam_move_max", 0.0) * 1000.0])
	# 手和「最後的裙子」：手（密取樣）到裙子三角形、裙子頂點到手三角形，兩個方向的最短距離（貼著＝2～5 mm；0 附近＝相交）
	var tris: Array = skirt_rep["skirt_tris"]
	for sd in ["left", "right"]:
		var hp := Pose.hand_points(sk, sd, false, true)
		var hb := AABB(_bpos(sd + "hand"), Vector3.ZERO)
		for k in hp:
			for q: Vector3 in hp[k]:
				hb = hb.expand(q)
		hb = hb.grow(0.03)
		var near := []
		for t in tris:
			if hb.has_point(t[0]) or hb.has_point(t[1]) or hb.has_point(t[2]):
				near.append(t)
		var d1 := 9.0
		for k in hp:
			for q: Vector3 in hp[k]:
				for t in near:
					d1 = minf(d1, q.distance_to(_closest_on_tri(q, t[0], t[1], t[2])))
		var d2 := 9.0
		var htri := []
		for t in Pose.hand_tris(sk, sd):
			if not (t[0] as String).ends_with("forearm"):
				htri.append(t)
		for q in baked_skirt:
			if hb.has_point(q):
				for t in htri:
					d2 = minf(d2, q.distance_to(_closest_on_tri(q, t[1], t[2], t[3])))
		if d1 < 1.0:
			print("  [裙子上的手] %s 手到最後的裙子最近 %.1f mm（手→裙）／%.1f mm（裙→手）" % [sd, d1 * 1000.0, d2 * 1000.0])
	print("  裙子（Pose.settle_skirt）：%d 個頂點平滑推到椅面／椅背外（最多移 %.1f mm）；推完還在椅子裡的裙子頂點 %d；裙子本身的邊（%d 條）最多拉長 %.2f 倍、超過 2 倍 %d 條；裙子和裡面腿相連的邊最多 %.2f 倍、超過 2 倍 %d 條；大腿頂點高過裙子（戳出來）%d 個" % [skirt_rep["moved"], skirt_rep["deepest"] * 1000.0, skirt_rep["below"], skirt_rep.get("edges", 0), skirt_rep["stretch_max"], skirt_rep["stretch_over2"], skirt_rep.get("stretch_max_seam", 0.0), skirt_rep.get("stretch_over2_seam", 0), skirt_rep.get("poke", 0)])

## 身體頂點（水鈴的裙子用壓平後的）在方塊裡面幾個
func _report_box(nm: String, bx: AABB) -> void:
	var cnt := 0
	var deep := 0.0
	var I := _pts_info(1)
	var P: PackedVector3Array = I["p"]
	var by := {}
	for i in P.size():
		if not baked_skirt.is_empty() and I["s"][i] == 1:
			continue
		if bx.has_point(P[i]):
			cnt += 1
			deep = maxf(deep, bx.end.y - P[i].y)
			var k: String = I["b"][i] + ("(裙)" if I["s"][i] == 1 else "")
			by[k] = by.get(k, 0) + 1
	for p in baked_skirt:
		if bx.has_point(p):
			cnt += 1
			deep = maxf(deep, bx.end.y - p.y)
	print("  [穿模檢查] %s：%d 個頂點在裡面，最深 %.1f mm %s" % [nm, cnt, deep * 1000.0, by if cnt > 0 else ""])

func _sofa_boxes() -> Array:
	var b := [[D["sofa_seat_box"], Vector3.UP], [D["sofa_back_box"], Vector3(1, 0, 0)]]
	if D.has("sofa_cushion_box"):
		b.append([D["sofa_cushion_box"], Vector3(1, 0, 0)])
	return b

## 背靠到靠背了嗎：靠背前面（+X）身體最靠近的點離靠背面多遠（不算手臂；裙子用壓平後的）
func _back_gap(bx: AABB, with_skirt := true) -> Array:
	var best := 9.0
	var who_b := ""
	var I := _pts_info(1)
	for i in I["p"].size():
		var bn: String = I["b"][i]
		if bn.contains("arm") or bn.contains("hand"):   # 手臂不算（肩膀算：圳寶的肩甲是背上最凸的地方）
			continue
		if not baked_skirt.is_empty() and I["s"][i] == 1:
			continue
		var p: Vector3 = I["p"][i]
		if p.y < bx.position.y or p.y > bx.end.y or p.z < bx.position.z or p.z > bx.end.z:
			continue
		var d := p.x - bx.end.x
		if d < best:
			best = d
			who_b = bn
	for p in (baked_skirt if with_skirt else PackedVector3Array()):
		if p.y >= bx.position.y and p.y <= bx.end.y and p.z >= bx.position.z and p.z <= bx.end.z and p.x - bx.end.x < best:
			best = p.x - bx.end.x
			who_b = "裙子"
	return [best, who_b]

func _report_sofa() -> void:
	var bg := _back_gap(D["sofa_back_box"])
	print("  [靠背] 背離沙發靠背 %.1f mm（最近的是 %s）" % [bg[0] * 1000.0, bg[1]])
	if not baked_skirt.is_empty():
		var bt := _back_gap(D["sofa_back_box"], false)
		print("  [靠背] 不算裙子：身體離沙發靠背 %.1f mm（最近的是 %s）" % [bt[0] * 1000.0, bt[1]])
	if D.has("sofa_cushion_box"):
		var cg := _back_gap(D["sofa_cushion_box"])
		print("  [靠背] 背離腰墊 %.1f mm（最近的是 %s）" % [cg[0] * 1000.0, cg[1]])
		if not baked_skirt.is_empty():
			var ct := _back_gap(D["sofa_cushion_box"], false)
			print("  [靠背] 不算裙子：身體離腰墊 %.1f mm（最近的是 %s）" % [ct[0] * 1000.0, ct[1]])
		_report_box("腰墊", D["sofa_cushion_box"])
	_report_box("沙發坐墊", D["sofa_seat_box"])
	_report_box("沙發靠背", D["sofa_back_box"])
	if D.has("sofa_foot_box"):
		_report_box("腳踏", D["sofa_foot_box"])
	_report_box("地板", AABB(Vector3(-4, -0.5, -1), Vector3(10, 0.5, 6)))

func _m_overview() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	ken.global_transform = A("door").global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3(0, 0, -0.35))
	_look(Vector3(0.75, 5.3, 7.1), Vector3(0.75, 0.25, 1.85), 47)

## 沙發上的水鈴：裙子放好（Pose.settle_skirt）並量手到最後的裙子距離
func _settle_lap(boxes: Array) -> void:
	_bake_skirt(boxes)

func _m_watch_tv() -> void:
	await _sit_m("sofa_seat", func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * A("tv_screen").global_position, 0.45, 60.0)
		_hands_on_lap(rt), -0.0005, D["foot"])
	_settle_lap(_sofa_boxes())
	_report_sofa()
	_look(Vector3(2.95, 0.9, 3.35), Vector3(2.5, 0.5, 2.0), 55)
	_check_views("sofa_seat")
	extra_views.append(["cam_wide", Vector3(3.35, 1.25, 4.5), Vector3(3.35, 0.5, 2.0), 55])

func _m_listen_music() -> void:
	var campos := Vector3(2.95, 0.95, 2.95)
	await _sit_m("sofa_seat", func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * campos.lerp(A("tv_screen").global_position, 0.5), 0.4, 35.0, 4.0)
		_hands_on_lap(rt), -0.0005, D["foot"])
	_settle_lap(_sofa_boxes())
	_report_sofa()
	(home.get_node("headphones/HeadphonesProp") as Node3D).visible = false
	await _put_headphones_m()
	var hd := _bpos("head")
	_look(campos, Vector3(1.95, hd.y - 0.1, 1.98), 40)
	_check_views("sofa_seat")

## 耳機：量頭（頭骨權重的頂點）在耳朵那一圈的寬度、過頭頂那個切面的形狀；頭帶畫成橢圓、比切面大一點（不穿進頭髮）
func _put_headphones_m() -> void:
	var head := _bpos("head")
	var up := (_bpos("headtop_end") - head).normalized()
	var left := (_bpos("leftupleg") - _bpos("rightupleg"))
	left = (left - up * left.dot(up)).normalized()
	var fwd := left.cross(up).normalized()
	var I := _pts_info(1)
	var hp := []
	var mn := Vector3(9, 9, 9)
	var mx := -mn
	for i in I["p"].size():
		var bn: String = I["b"][i]
		if bn.begins_with("head") or bn == "neck":
			var d: Vector3 = I["p"][i] - head
			var v := Vector3(d.dot(left), d.dot(up), d.dot(fwd))
			hp.append(v)
			mn = mn.min(v)
			mx = mx.max(v)
	var ear_y: float = mn.y + (mx.y - mn.y) * CF[who]["ear"]
	var cz := (mn.z + mx.z) * 0.5
	var cx := (mn.x + mx.x) * 0.5
	var side := 0.0   # 耳朵那一圈的半寬
	for v: Vector3 in hp:
		if absf(v.y - ear_y) < 0.03 and absf(v.z - cz) < 0.06:
			side = maxf(side, absf(v.x - cx))
	# 頭帶平面（|z-cz|<2.5 cm）的切面要整個在橢圓裡面
	var a := side + 0.02
	var b := mx.y - ear_y
	var E := 0.0
	for v: Vector3 in hp:
		if absf(v.z - cz) < 0.025 and v.y > ear_y:
			E = maxf(E, sqrt(pow((v.x - cx) / a, 2) + pow((v.y - ear_y) / b, 2)))
	var s: float = CF[who]["hp_scale"]
	var w := side + 0.003   # 耳墊內面離頭 3 mm
	var band_r := maxf(w + 0.065 * s, a * E + 0.012)
	var band_h := b * E + 0.012
	print("  頭的範圍（左右/上下/前後）：", mn, " ~ ", mx, "；耳朵高 %.3f 半寬 %.3f；頭帶 %.3f×%.3f（切面最大比例 %.2f）" % [ear_y, side, band_r, band_h, E])
	var hpn := _headphones(w, band_r, band_h, s)
	var o := head + left * cx + up * ear_y + fwd * cz
	_attach("head", hpn, Transform3D(Basis(left, up, fwd).orthonormalized(), o))
	await get_tree().process_frame
	print("  耳機中心 ", hpn.global_position, " 縮放 ", hpn.global_transform.basis.get_scale(), " 頭骨 ", head)

## 吉祥物耳機：耳罩在 ±w（內面朝頭）、頭帶是半橢圓（水平半徑 r、高 h）；s＝耳罩大小倍數
func _headphones(w: float, r: float, h: float, s: float) -> Node3D:
	var n := Node3D.new()
	var band := StandardMaterial3D.new()
	band.albedo_color = Color(CF_PH[who][0])
	var cup := StandardMaterial3D.new()
	cup.albedo_color = Color(CF_PH[who][1])
	var seg := 14
	for k in seg + 1:
		var a0 := PI * k / seg
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(PI * maxf(r, h) / seg + 0.012, 0.016 * s, 0.035 * s)
		mi.mesh = bm
		mi.material_override = band
		mi.position = Vector3(cos(a0) * r, sin(a0) * h, 0)
		mi.rotation.z = atan2(cos(a0) * h, -sin(a0) * r)
		n.add_child(mi)
	for sd in [-1, 1]:
		for it in [[0.055, 0.045, w + 0.0425 * s, cup], [0.045, 0.02, w + 0.01 * s, band]]:
			var c := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = it[0] * s
			cm.bottom_radius = it[0] * s
			cm.height = it[1] * s
			c.mesh = cm
			c.material_override = it[3]
			c.rotation.z = PI / 2
			c.position = Vector3(sd * it[2], 0, 0)
			n.add_child(c)
		var st := MeshInstance3D.new()   # 耳罩到頭帶的小桿
		var sb := BoxMesh.new()
		sb.size = Vector3(0.012 * s, 0.05 * s, 0.02 * s)
		st.mesh = sb
		st.material_override = band
		st.position = Vector3(sd * (w + 0.06 * s), 0.04 * s, 0)
		n.add_child(st)
	return n

## 檢查用的鏡頭：正前、斜前、左側、正前低（看手）；角色面向＝錨點 -Z
func _check_views(anchor: String) -> void:
	var f: Vector3 = -A(anchor).global_transform.basis.z.normalized()
	var l := Vector3.UP.cross(f).normalized()   # 角色的左手邊
	var hd := _bpos("head")
	var hips := _bpos("hips")
	var mid := hips.lerp(hd, 0.45)
	var hc := (_bpos("lefthand") + _bpos("righthand")) * 0.5
	extra_views.append(["v_front", mid + f * 1.5 + Vector3.UP * 0.25, mid, 40])
	extra_views.append(["v_left", mid + l * 1.5 + f * 0.3 + Vector3.UP * 0.15, mid, 40])
	extra_views.append(["v_right", mid - l * 1.5 + f * 0.3 + Vector3.UP * 0.15, mid, 40])
	extra_views.append(["v_hands", hc + f * 0.6 + l * 0.25 - Vector3.UP * 0.05, hc, 35])

# ───────── 書桌：寫功課、上網 ─────────
# 每個角色的書桌姿勢參數（量了再調；距離單位公尺，「相對課本中心／鍵盤中心」，+X＝靠角色那邊、+Z＝角色左手邊）
const DESK := {
	"shuiling": {"lean": 0.0, "left": Vector3(-0.035, 0, 0.055), "right": Vector3(-0.035, 0, -0.05), "pen_len": 0.12,
		"kb_in": 0.035, "kb_z": 0.055, "look_up": 0.22},
	"zunbo": {"lean": 10.0, "left": Vector3(-0.04, 0, 0.075), "tip": Vector3(-0.075, 0, -0.01), "pen_len": 0.15,
		"kb_in": 0.04, "kb_z": 0.075, "look_up": 0.3,
		"tq": Vector3(0.128, 0.05, 0.045), "tw": Vector3(0.065, 0.005, 0.08), "pen_dir": Vector3(-0.2, 0.85, -0.45)},   # 寫字的手在胸口前、課本上方（下巴離桌面約 18 cm，手在下巴下面）
}
## 上面 left/right/tip 的 x 是「離桌邊」（負＝桌子裡面），z 是相對課本中心
const PEN_DIR := Vector3(-0.42, 0.8, -0.3)   # 筆桿方向（角色座標：筆尖 → 橡皮擦，往右後上方）

func _chair_boxes(anchor: String) -> Array:
	var c: Vector3 = A(anchor).global_position
	var S: float = D["chair_seat"]
	var bo: float = -D["back_off"]
	var fr: float = D["chair_front"]
	var out := [[AABB(Vector3(c.x - fr, S - 0.04, c.z - 0.15), Vector3(fr + bo, 0.04, 0.3)), Vector3.UP],
		[AABB(Vector3(c.x + bo, S, c.z - 0.14), Vector3(0.035, 0.27, 0.28)), Vector3(-1, 0, 0)]]
	return out

func _report_desk(anchor: String) -> void:
	_report_box("桌板", D["desk_box"])
	var cb := _chair_boxes(anchor)
	_report_box("椅面", cb[0][0])
	_report_box("椅背", cb[1][0])
	if D.has("desk_foot_local"):   # 腳踏（椅子本地 → 世界）
		var ch := A("Study/DeskChair") as Node3D
		var lb: AABB = D["desk_foot_local"]
		var c0: Vector3 = ch.global_transform * lb.position
		var c1: Vector3 = ch.global_transform * lb.end
		var wb := AABB(c0.min(c1), (c1 - c0).abs())
		_report_box("腳踏", wb)
	_report_box("地板", AABB(Vector3(-4, -0.5, -1), Vector3(10, 0.5, 6)))

func _m_study_english() -> void:
	A("Study/DeskChair").position.z = A("desk_seat_book").position.z
	var book := A("book").global_position
	var page_y: float = D["book_top"]
	var P: Dictionary = DESK[who]
	var rep := {}
	var cfg: Dictionary = CF[who]
	await _sit_m("desk_seat_book", func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * (book + Vector3(0.0, P["look_up"], 0)), 0.45, 60.0)
		var kb := to_ken.basis
		var top_k: float = (to_ken * Vector3(book.x, page_y, book.z)).y
		var Mi := to_ken.affine_inverse()
		var dfr: float = D["dfront"]
		var flat := func(p: Vector3) -> float:   # 只有桌子上面才有表面（桌子外面的袖子不算）
			return top_k if (Mi * p).x < dfr else -1e9
		var lc: Vector3 = to_ken * (Vector3(D["dfront"], 0, book.z) + P["left"])
		rep["left"] = Pose.rest_hand_on(sk, rt.corr, "left", lc, flat, kb * Vector3(-1, 0, -0.22), Vector3(1.0, 0.25, -0.4), 0.003, 0.003, false, cfg["curl"], cfg["spread"], Vector3(0.74, -0.22, 0.64), who == "shuiling")
		rep["left"] = _lift_hand("left", flat, 0.0025, Vector3(1.0, 0.25, -0.4), rep["left"])
		if who == "zunbo":   # 張開的手三指握筆（手指會彎）
			var tip: Vector3 = to_ken * (Vector3(D["dfront"], 0, book.z) + P["tip"])
			tip.y = top_k
			rep["right"] = Pose.hold_pencil_open(sk, rt.corr, "right", tip, P["pen_dir"], Vector3(-0.9, -0.5, -0.3), Vector3(-0.6, -0.15, -0.6), 0.003, P["pen_len"], 0.06, P["tq"], P["tw"], 0.12, Pose.PENCIL_R + 0.0008, false)
		else:   # 水鈴：手指不能彎 → 右手平放在右頁，鉛筆夾在拇指和手掌之間（虎口）
			var rc: Vector3 = to_ken * (Vector3(D["dfront"], 0, book.z) + P["right"])
			rep["right"] = Pose.rest_hand_on(sk, rt.corr, "right", rc, flat, kb * Vector3(-1, 0, 0.22), Vector3(-1.0, 0.25, -0.4), 0.003, 0.003, false, 0.0, 0.0, Vector3(0.8, -0.1, 0.6), true)
			rep["right"] = _lift_hand("right", flat, 0.0025, Vector3(-1.0, 0.25, -0.4), rep["right"])
			rep["tuck"] = _tuck_pencil(top_k, P["pen_len"]), -0.0005, D.get("desk_foot", D["foot"]), -1.0, D.get("desk_knee", -1.0), P["lean"])
	print("  課本紙面 y=%.4f（桌面 %.3f）" % [page_y, D["desk_top"]])
	var chin := 9.0
	var hand_top := -9.0
	var Ic := _pts_info(1)
	for i in Ic["p"].size():
		var bn: String = Ic["b"][i]
		if bn.begins_with("head"):
			chin = minf(chin, Ic["p"][i].y)
		if bn.begins_with("righthand"):
			hand_top = maxf(hand_top, Ic["p"][i].y)
	print("  [下巴] 下巴（頭最低點）離桌面 %.1f mm；寫字的手最高點比下巴%s %.1f mm" % [(chin - D["desk_top"]) * 1000.0, "低" if hand_top < chin else "高", absf(chin - hand_top) * 1000.0])
	_print_gap("左手離紙面", "left", rep["left"])
	var xf: Transform3D
	if who == "zunbo":
		var rr: Dictionary = rep["right"]
		print("  右手（三指握筆）最低點離紙面 %.1f mm；握點離筆尖 %.0f mm；手到筆桿軸心最近 %.1f mm（鉛筆半徑 %.1f）；手腕彎 %.0f°、IK 誤差 %.1f mm；食指/中指彎 %s" % [rr["low"] * 1000.0, rr["grip"] * 1000.0, rr["clear"] * 1000.0, Pose.PENCIL_R * 1000.0, rr["bend"], rr["wrist_err"] * 1000.0, rr["curl"]])
		xf = _nudge_pencil(rr["xf"], P["pen_len"])
	else:
		_print_gap("右手離紙面", "right", rep["right"])
		var tk: Dictionary = rep["tuck"]
		print("  鉛筆夾在虎口：筆尖在紙上；筆桿到拇指 %.1f mm、到食指／手掌 %.1f mm、到整隻手最近 %.1f mm（要 ≥ 半徑 %.1f）、到袖子表面 %.1f mm" % [tk["thumb"] * 1000.0, tk["palm"] * 1000.0, tk["min"] * 1000.0, Pose.PENCIL_R * 1000.0, tk["sleeve"] * 1000.0])
		xf = tk["xf"]
	_pencil_m(ken.global_transform * xf, P["pen_len"])
	_bake_skirt(_chair_boxes("desk_seat_book"))
	for sd in ["left", "right"]:
		var low := Pose.hand_low(sk, sd, false)
		print("  [世界] %s 手（不含前臂／袖子）最低點 y=%.4f → 離紙面 %.1f mm" % [sd, low["_min"], (low["_min"] - page_y) * 1000.0])
	_report_box("課本", D["book_box"])
	_report_desk("desk_seat_book")
	var hd := _bpos("head")
	var hc := (_bpos("lefthand") + _bpos("righthand")) * 0.5
	if who == "zunbo":   # 正面偏斜 3/4：兩眼、課本、拿筆的手都要看得到（量的，見 _pick_cam）
		var f3: Vector3 = -A("desk_seat_book").global_transform.basis.z.normalized()
		var l3 := Vector3.UP.cross(f3).normalized()
		var pen_hand := _bpos("righthandmiddle1")
		var cands := []
		for az in [20.0, -20.0, 25.0, -25.0, 30.0, -30.0, 35.0, -35.0, 40.0, -40.0, 50.0, -50.0]:
			for dist in [0.66, 0.6]:
				var dirc := (f3 * cos(deg_to_rad(az)) + l3 * sin(deg_to_rad(az))).normalized()
				var cp: Vector3 = hd + dirc * dist + Vector3.UP * 0.1
				if cp.x < -3.42 or cp.z < 0.1:   # 鏡頭要在房間裡（牆前面）
					continue
				cands.append([cp, hd.lerp(hc, 0.45) + Vector3.UP * 0.02, "正前方往%s %d°、距離 %.2f" % ["左" if az > 0 else "右", absi(int(az)), dist]])
		var pen_top: Vector3 = vis_rods[0][1]
		var pick := _pick_cam(cands, [pen_top], "寫字", [pen_hand, book, pen_top], 64.0)
		_look(pick[0], pick[1], 64)
		_report_vis(pick[0], [pen_top], ["鉛筆上端"])
		print("  課本、拿筆的手都在畫面裡：%s" % (cam.is_position_in_frustum(book) and cam.is_position_in_frustum(pen_hand)))
	else:
		_look(hd + Vector3(-0.55, 0.3, 0.75), hd.lerp(hc, 0.55), 42)
	extra_views.append(["hands", hc + Vector3(-0.25, 0.3, 0.38), hc, 30])
	extra_views.append(["hands_low", hc + Vector3(-0.45, 0.06, 0.25), hc, 30])
	extra_views.append(["hands_right", hc + Vector3(-0.3, 0.12, -0.42), hc, 30])
	_check_views("desk_seat_book")

## 水鈴的鉛筆：筆尖在紙上，筆桿往右後上方斜，靠在拇指和手掌（食指根）之間的虎口；用量的找「兩邊都貼近但不穿過」的位置
## （角色在原點、面向 +Z；回傳鉛筆 Transform：原點＝筆尖、+Y 朝橡皮擦）
func _tuck_pencil(top_y: float, L: float) -> Dictionary:
	var r: float = Pose.PENCIL_R
	var hp := Pose.hand_points(sk, "right", true, true)   # 含前臂（大泡泡袖）：筆不能穿進袖子
	var th := []
	var pa := []
	var fa := []
	for k in hp:
		if (k as String).contains("thumb"):
			th.append_array(hp[k])
		elif (k as String).ends_with("forearm"):
			fa.append_array(hp[k])
		else:
			pa.append_array(hp[k])
	var web: Vector3 = (_bpos("righthandthumb2") + _bpos("righthandindex1")) * 0.5
	var best := {}
	for ia in 13:
		for ie in 6:
			var az := deg_to_rad(-60.0 + ia * 10.0)
			var el := deg_to_rad(25.0 + ie * 8.0)
			var D0 := Vector3(-0.42, 0, -0.3).normalized().rotated(Vector3.UP, az)
			var Dd := (D0 * cos(el) + Vector3.UP * sin(el)).normalized()
			for ih in 12:
				var C := web + Vector3.UP * (0.035 - ih * 0.004)
				if C.y <= top_y + 0.004:
					continue
				var tip := C - Dd * ((C.y - top_y) / Dd.y)
				var end := tip + Dd * L
				var dt := 9.0
				for q: Vector3 in th:
					dt = minf(dt, Pose.seg_dist(q, tip, end))
				var dp := 9.0
				for q: Vector3 in pa:
					dp = minf(dp, Pose.seg_dist(q, tip, end))
				if dt < r + 0.0008 or dp < r + 0.0008:
					continue
				var df := 9.0
				for q: Vector3 in fa:
					df = minf(df, Pose.seg_dist(q, tip, end))
				if df < r + 0.008:   # 離袖子至少 8 mm（看得到筆、不穿進袖子）
					continue
				var sc := -(dt - r) - (dp - r) - absf((tip - web).length() - 0.03) * 0.2
				if best.is_empty() or sc > best["score"]:
					best = {"score": sc, "tip": tip, "D": Dd, "thumb": dt - r, "palm": dp - r, "min": minf(dt, dp), "sleeve": df - r}
	var Dd: Vector3 = best["D"]
	var x := Dd.cross(Vector3.FORWARD).normalized()
	best["xf"] = Transform3D(Basis(x, Dd, x.cross(Dd)).orthonormalized(), best["tip"])
	return best

func _pencil_m(want: Transform3D, L: float) -> void:
	(home.get_node("book/Pencil") as Node3D).visible = false
	vis_rods = [[want.origin, want.origin + want.basis.y.normalized() * L, Pose.PENCIL_R * 1.5]]
	var r: float = Pose.PENCIL_R
	var pen := Node3D.new()
	var parts := [[0.0, 0.008, 0.0006, 0.002, "#3a3a44"], [0.008, 0.02, 0.002, r, "#f3d9a8"], [0.02, L - 0.02, r, r, "#ffcc00"], [L - 0.02, L - 0.013, r * 1.04, r * 1.04, "#c9cbd3"], [L - 0.013, L, r, r, "#ef7fa8"]]
	for pp in parts:
		var mi := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.bottom_radius = pp[2]
		cm.top_radius = pp[3]
		cm.height = pp[1] - pp[0]
		cm.radial_segments = 8
		mi.mesh = cm
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(pp[4])
		mi.material_override = m
		mi.position = Vector3(0, (pp[0] + pp[1]) * 0.5, 0)
		pen.add_child(mi)
	_attach("righthand", pen, want)

func _m_surf_internet() -> void:
	A("Study/DeskChair").position.z = A("desk_seat").position.z
	var P: Dictionary = DESK[who]
	var cfg: Dictionary = CF[who]
	var KB: AABB = D["kb_box"]
	var dfront: float = D["dfront"]
	var surf := {}
	await _sit_m("desk_seat", func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * (A("computer_screen").global_position + Vector3.UP * 0.18), 0.35, 45.0)   # 頭很大：看螢幕時臉抬高一點才看得到
		var M := to_ken.affine_inverse()
		var top := func(p: Vector3) -> float:
			var w := M * p
			if KB.has_point(Vector3(w.x, KB.position.y + 0.001, w.z)):
				return (to_ken * Vector3(w.x, KB.end.y, w.z)).y
			if w.x < dfront:
				return (to_ken * Vector3(w.x, D["desk_top"], w.z)).y
			return -1e9
		var kz := KB.get_center().z
		var kb := to_ken.basis
		var cx: float = dfront - P["kb_in"]
		surf["left"] = Pose.rest_hand_on(sk, rt.corr, "left", to_ken * Vector3(cx, 0, kz + P["kb_z"]), top, kb * Vector3(-1, 0, -0.15), Vector3(1.0, -0.2, -0.5), 0.003, 0.003, false, cfg["curl"], cfg["spread"], Vector3(0.74, -0.22, 0.64), who == "shuiling")
		surf["right"] = Pose.rest_hand_on(sk, rt.corr, "right", to_ken * Vector3(cx, 0, kz - P["kb_z"]), top, kb * Vector3(-1, 0, 0.15), Vector3(-1.0, -0.2, -0.5), 0.003, 0.003, false, cfg["curl"], cfg["spread"], Vector3(0.74, -0.22, 0.64), who == "shuiling")
		surf["left"] = _lift_hand("left", top, 0.0025, Vector3(1.0, -0.2, -0.5), surf["left"])
		surf["right"] = _lift_hand("right", top, 0.0025, Vector3(-1.0, -0.2, -0.5), surf["right"]), -0.0005, D.get("desk_foot", D["foot"]), -1.0, D.get("desk_knee", -1.0), P["lean"])
	_bake_skirt(_chair_boxes("desk_seat"))
	_print_gap("左手離鍵盤／桌面", "left", surf["left"])
	_print_gap("右手離鍵盤／桌面", "right", surf["right"])
	for sd in ["left", "right"]:
		var low := Pose.hand_low(sk, sd, true)
		print("  [世界] %s 手最低點 y=%.4f（鍵盤頂 %.4f、桌面 %.3f）" % [sd, low["_min"], KB.end.y, D["desk_top"]])
	_report_box("鍵盤", KB)
	_report_desk("desk_seat")
	var hd := _bpos("head")
	var hc := (_bpos("lefthand") + _bpos("righthand")) * 0.5
	_look(hd + Vector3(-0.5, -0.02, 0.62), hd.lerp(hc, 0.4) + Vector3(-0.08, 0, -0.04), 50)   # 從角色左前方看：臉、雙手、螢幕都看得到
	extra_views.append(["cam_back", hd + Vector3(-0.45, 0.35, -0.85), hd.lerp(hc, 0.5) + Vector3(-0.1, 0, 0), 45])
	extra_views.append(["hands", hc + Vector3(-0.25, 0.3, -0.4), hc, 30])
	extra_views.append(["hands_low", hc + Vector3(-0.1, 0.05, -0.5), hc, 30])
	_check_views("desk_seat")

# ───────── 直笛 ─────────
const REC := {
	"shuiling": {"mouth": Vector3(0.0, -0.006, 0.12), "L": 0.26, "down": 55.0, "left": 0.08, "right": 0.15, "insert": 0.004, "curl": 0.0, "ax": 0.075, "pad": 0.008, "neck": 5.0, "behind": false, "lean": 0.0, "r": 0.0165, "r_draw": 0.0125, "shoulder": 0.0},
	# 圳寶：嘴（臉的表面，用三角形量）在頭骨前 22.6 cm；吉祥物尺寸短直笛（20 cm、半徑 16 mm）往前下 65°，兩手在中下段，肩膀不用收
	"zunbo": {"mouth": Vector3(0.0, 0.028, 0.226), "L": 0.22, "down": 72.0, "left": 0.12, "right": 0.175, "insert": 0.03, "curl": 95.0, "ax": 0.12, "pad": 0.03, "neck": 0.0, "behind": false, "lean": 0.0, "r": 0.0185, "r_draw": 0.016, "shoulder": 0.0},
}

func _m_recorder() -> void:
	var R: Dictionary = REC[who]
	var rd: float = R["r_draw"]
	var ins: float = R["insert"]
	var rtf: Transform3D
	var mouth_gap := 0.0
	var prev := [0.0, 0.0]
	for it in 10:   # 吹口碰到嘴唇：量吹口到臉的間隙，用割線法調 insert 到約 1.5 mm
		var rt := _bind("sitting_idle")
		Pose.pose_stand(sk, rt.corr)
		rtf = Pose.pose_recorder(sk, rt.corr, R["mouth"], R["L"], R["down"], R["left"], R["right"], ins, R["curl"], R["ax"], R["pad"], R["neck"], R["behind"], R["lean"], R["r"], R["shoulder"])
		rt.src_root.queue_free()
		mouth_gap = _mouth_gap(Pose.last_report["top"], Pose.last_report["bot"], R["L"], rd)
		print("    吹口試 %d：含進 %.1f mm → 間隙 %.1f mm" % [it, ins * 1000.0, mouth_gap * 1000.0])
		if absf(mouth_gap - 0.0015) < 0.0006 or mouth_gap > 1.0:
			break
		var step := mouth_gap - 0.0015
		if it > 0 and absf(mouth_gap - prev[1]) > 1e-5:
			step = (mouth_gap - 0.0015) * (ins - prev[0]) / (prev[1] - mouth_gap)
		prev = [ins, mouth_gap]
		ins += clampf(step, -0.03, 0.03)
	print("  吹口到嘴唇（臉）的間隙 %.1f mm（含進 %.1f mm）" % [mouth_gap * 1000.0, ins * 1000.0])
	for sd in ["left", "right"]:   # 手離笛身太遠（> 2.5 mm）就整隻手（姿勢不變）往笛身靠，剩 1.5 mm
		_approach_tube(sd, Pose.last_report["top"], Pose.last_report["bot"], R["L"], rd, 0.0015)
	(home.get_node("Study/RecorderProp") as Node3D).visible = false
	var rec := Home.make_recorder(R["L"], rd)
	_attach("righthand", rec, rtf)
	var spot := A("recorder_spot")
	ken.global_transform = spot.global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3.ZERO)
	await get_tree().process_frame
	var rp: Dictionary = Pose.last_report
	print("  直笛：嘴＝頭骨＋%s；長 %.0f mm、往下 %.0f°；手：%s" % [R["mouth"], R["L"] * 1000.0, R["down"], "從後面握（手心朝前）" if R["behind"] else "搭在前面"])
	for sd in ["right", "left"]:
		var q: Dictionary = rp[sd]
		print("  %s 手：IK 誤差 %.1f mm、手腕彎 %.0f°、手指彎 %s" % [sd, q.get("err", 0.0) * 1000.0, q.get("bend", 0.0), q.get("curl", {})])
	var gt: Transform3D = ken.global_transform
	var t0: Vector3 = gt * (rp["top"] as Vector3)
	var t1: Vector3 = gt * (rp["bot"] as Vector3)
	var axd := (t1 - t0).normalized()
	for sd in ["left", "right"]:
		var hp := Pose.hand_points(sk, sd, true, true)
		var worst := 9.0
		var smin := 9.0
		var smax := -9.0
		for k in hp:
			for q: Vector3 in hp[k]:
				var sa := (q - t0).dot(axd)
				var d := (q - t0 - axd * sa).length()
				var rr := Home.recorder_radius(sa, R["L"], rd)
				if rr > 0.0:
					worst = minf(worst, d - rr)
				if d < 0.03 and not (k as String).ends_with("forearm"):
					smin = minf(smin, sa)
					smax = maxf(smax, sa)
		print("  [世界] %s 手到笛身表面最小間隙 %.1f mm；手貼著笛身的範圍：離吹口 %.0f～%.0f mm" % [sd, worst * 1000.0, smin * 1000.0, smax * 1000.0])
	# 吹口和臉：頭的頂點到笛身表面（吹口那端可以碰到嘴）
	var I := _pts_info(1)
	var face_gap := 9.0
	var body_gap := 9.0
	for i in I["p"].size():
		var bn: String = I["b"][i]
		if bn.contains("hand") or bn.contains("forearm"):
			continue
		var q: Vector3 = I["p"][i]
		var sa := (q - t0).dot(axd)
		var rr := Home.recorder_radius(sa, R["L"], rd)
		if rr <= 0.0:
			continue
		var d := (q - t0 - axd * sa).length() - rr
		if bn.begins_with("head"):
			if sa > 0.03:
				face_gap = minf(face_gap, d)
		else:
			body_gap = minf(body_gap, d)
	print("  [世界] 笛身（吹口 3 cm 以外）到頭／臉最近 %.1f mm；到身體最近 %.1f mm（負＝穿進去）" % [face_gap * 1000.0, body_gap * 1000.0])
	var hand_top := -9.0
	for sd in ["left", "right"]:
		var hp2 := Pose.hand_points(sk, sd, false, false)
		for k in hp2:
			for q: Vector3 in hp2[k]:
				hand_top = maxf(hand_top, q.y)
	print("  [嘴] 兩手最高點比吹口%s %.1f mm（要在嘴下面，不擋嘴）" % ["低" if hand_top < t0.y else "高", absf(t0.y - hand_top) * 1000.0])
	var kb := ken.global_transform.basis
	var kf := kb.z.normalized()
	var kl := kb.x.normalized()
	var mid := t0.lerp(t1, 0.4)
	var hd := _bpos("head")
	vis_rods = [[t0, t1, rd * 1.4]]
	var mtip := t0 + axd * 0.004
	var cands := []
	for az in [0.0, -15.0, 15.0, -30.0, 30.0, -45.0, 45.0, -60.0, 60.0]:
		var dirc := (kf * cos(deg_to_rad(az)) - kl * sin(deg_to_rad(az))).normalized()
		cands.append([mid + dirc * 1.05 + Vector3.UP * 0.12, hd.lerp(mid, 0.55), "從正前方往%s %d°" % ["右" if az < 0 else "左", absi(int(az))]])
	var pick := _pick_cam(cands, [mtip], "直笛")
	_look(pick[0], pick[1], 42)
	_report_vis(pick[0], [mtip], ["吹口"])
	if who == "zunbo":   # 正前方（譜架先藏起來）給老師看姿勢
		(home.get_node("Study/MusicStand") as Node3D).visible = false
		var fpos := mid + kf * 1.1 + Vector3.UP * 0.1
		print("  正前方（譜架藏起來）：")
		_report_vis(fpos, [mtip], ["吹口"])
		(home.get_node("Study/MusicStand") as Node3D).visible = true
		front_view = [fpos, hd.lerp(mid, 0.5), 40.0]
	extra_views.append(["hands", mid + kf * 0.42 + kl * 0.3 + Vector3.UP * 0.12, mid, 32])
	extra_views.append(["hands_r", mid + kf * 0.42 - kl * 0.3 + Vector3.UP * 0.12, mid, 32])
	extra_views.append(["hands_side", mid + kl * 0.6 + Vector3.UP * 0.05, mid, 32])
	extra_views.append(["v_front", hd.lerp(mid, 0.5) + kf * 1.4 + Vector3.UP * 0.1, hd.lerp(mid, 0.5), 40])

## rest_hand_on 最後一步是調前後傾、沒有再量一次高度 → 有手指低於表面時，整隻手（含手指姿勢）往上抬到剛好 gap
func _lift_hand(sd: String, top: Callable, gap: float, pole: Vector3, rep: Dictionary) -> Dictionary:
	for it in 4:
		var g := Pose.hand_gap(sk, sd, top)
		var need: float = gap - g["_min"]
		if need <= 0.0002:
			break
		var world := Pose.pose_world(sk)
		var hand := Retarget._idx(sk, sd + "hand")
		var keep := {}
		var st := [hand]
		while not st.is_empty():
			var b: int = st.pop_back()
			keep[b] = world[b]
			for c in sk.get_bone_children(b):
				st.append(c)
		Pose.ik_arm(sk, world, sd, Pose.bone_pos(sk, hand) + Vector3.UP * need, pole)
		for b in keep:
			world[b] = keep[b]
		Pose.apply_world(sk, world, true)
	var g2 := Pose.hand_gap(sk, sd, top)
	for k in g2:
		rep[k] = g2[k]
	return rep

## 鉛筆離手太近（< 半徑＋0.5 mm）→ 整枝筆水平往旁邊移開一點（筆尖還在紙上）；角色在原點時呼叫無妨（用世界座標的手）
func _nudge_pencil(xf: Transform3D, L: float) -> Transform3D:
	var r: float = Pose.PENCIL_R
	var gt := ken.global_transform
	for it in 6:
		var a: Vector3 = gt * xf.origin
		var b: Vector3 = gt * (xf.origin + xf.basis.y.normalized() * L)
		var hp := Pose.hand_points(sk, "right", false, true)
		var best := 9.0
		var bq := Vector3.ZERO
		for k in hp:
			for q: Vector3 in hp[k]:
				var d := Pose.seg_dist(q, a, b)
				if d < best:
					best = d
					bq = q
		if best >= r + 0.0005:
			break
		var ab := (b - a).normalized()
		var foot := a + ab * clampf((bq - a).dot(ab), 0.0, (b - a).length())
		var away := foot - bq
		away.y = 0
		away = away.normalized() * (r + 0.0008 - best)
		xf.origin += gt.basis.inverse() * away
	var a2: Vector3 = gt * xf.origin
	var b2: Vector3 = gt * (xf.origin + xf.basis.y.normalized() * L)
	var m := 9.0
	var hp2 := Pose.hand_points(sk, "right", false, true)
	for k in hp2:
		for q: Vector3 in hp2[k]:
			m = minf(m, Pose.seg_dist(q, a2, b2))
	print("  鉛筆微調後：手到筆桿軸心最近 %.1f mm（半徑 %.1f）" % [m * 1000.0, r * 1000.0])
	return xf

## 吹口到臉：用頭的三角形（圳寶的臉是一大片平面，頂點很少，量頂點會量錯）。
## 回傳吹口端面中心到臉表面的有號距離（正＝在臉外面）；另外存 face_tris 給笛身檢查用
var face_tris := []
func _head_tris() -> Array:
	var out := []
	for it in Pose._hp_skinned(sk, "", ["head", "neck"]):
		var Q: PackedVector3Array = it[1]
		var T: PackedInt32Array = it[2]
		for ti in range(0, T.size(), 3):
			out.append([Q[T[ti]], Q[T[ti + 1]], Q[T[ti + 2]]])
	return out

static func _closest_on_tri(p: Vector3, a: Vector3, b: Vector3, c: Vector3) -> Vector3:
	var ab := b - a
	var ac := c - a
	var ap := p - a
	var d1 := ab.dot(ap)
	var d2 := ac.dot(ap)
	if d1 <= 0.0 and d2 <= 0.0:
		return a
	var bp := p - b
	var d3 := ab.dot(bp)
	var d4 := ac.dot(bp)
	if d3 >= 0.0 and d4 <= d3:
		return b
	var vc := d1 * d4 - d3 * d2
	if vc <= 0.0 and d1 >= 0.0 and d3 <= 0.0:
		return a + ab * (d1 / (d1 - d3))
	var cp := p - c
	var d5 := ab.dot(cp)
	var d6 := ac.dot(cp)
	if d6 >= 0.0 and d5 <= d6:
		return c
	var vb := d5 * d2 - d1 * d6
	if vb <= 0.0 and d2 >= 0.0 and d6 <= 0.0:
		return a + ac * (d2 / (d2 - d6))
	var va := d3 * d6 - d5 * d4
	if va <= 0.0 and (d4 - d3) >= 0.0 and (d5 - d6) >= 0.0:
		return b + (c - b) * ((d4 - d3) / ((d4 - d3) + (d5 - d6)))
	var den := 1.0 / (va + vb + vc)
	return a + ab * (vb * den) + ac * (vc * den)

## 點到頭表面的有號距離（最近的三角形法線判斷裡外）
func _signed_to_head(p: Vector3, tris: Array) -> float:
	var best := 9.0
	var sgn := 1.0
	for t in tris:
		var q := _closest_on_tri(p, t[0], t[1], t[2])
		var d := p.distance_to(q)
		if d < best:
			best = d
			var n: Vector3 = ((t[1] as Vector3) - t[0]).cross((t[2] as Vector3) - t[0])
			sgn = -1.0 if (p - q).dot(n) >= 0.0 else 1.0   # Tripo 網格的三角形順序是反的（法線朝內）
	return best * sgn

func _mouth_gap(top: Vector3, bot: Vector3, L: float, r: float) -> float:
	face_tris = _head_tris()
	if OS.get_environment("MOUTHDBG") != "":
		var hd := _bpos("head")
		print("    頭三角形 ", face_tris.size(), " 吹口 ", top, " 頭骨 ", hd)
		for zz in [0.2, 0.25, 0.3, 0.35, 0.4]:
			var q := hd + Vector3(0, 0.028, zz)
			print("      頭骨+(0,0.028,%.2f) 有號距離 %.1f mm" % [zz, _signed_to_head(q, face_tris) * 1000.0])
	return _signed_to_head(top, face_tris)

## 手（不含前臂）到笛身表面（真的半徑剖面）的最小間隙與最近點
func _tube_gap(sd: String, t0: Vector3, t1: Vector3, L: float, r: float) -> Array:
	var ax := (t1 - t0).normalized()
	var hp := Pose.hand_points(sk, sd, false, true)
	var best := 9.0
	var bq := Vector3.ZERO
	for k in hp:
		for q: Vector3 in hp[k]:
			var sa := (q - t0).dot(ax)
			var rr := Home.recorder_radius(sa, L, r)
			if rr <= 0.0:
				continue
			var d := (q - t0 - ax * sa).length() - rr
			if d < best:
				best = d
				bq = q
	return [best, bq]

func _approach_tube(sd: String, t0: Vector3, t1: Vector3, L: float, r: float, target: float) -> void:
	var ax := (t1 - t0).normalized()
	var pole := Vector3(1.0 if sd == "left" else -1.0, -1.0, -0.2)
	for it in 6:
		var g := _tube_gap(sd, t0, t1, L, r)
		var gap: float = g[0]
		if gap < target + 0.001 and gap > target - 0.001:
			break
		if gap >= 0.0 and gap <= target + 0.001 and it == 0:
			break   # 已經貼著（0～target）；穿進去（負）就往外推
		var q: Vector3 = g[1]
		var foot := t0 + ax * (q - t0).dot(ax)
		var dir := (foot - q).normalized()
		var world := Pose.pose_world(sk)
		var hand := Retarget._idx(sk, sd + "hand")
		var keep := {}
		var st := [hand]
		while not st.is_empty():
			var b: int = st.pop_back()
			keep[b] = world[b]
			for c in sk.get_bone_children(b):
				st.append(c)
		Pose.ik_arm(sk, world, sd, Pose.bone_pos(sk, hand) + dir * (gap - target), pole)
		for b in keep:
			world[b] = keep[b]
		Pose.apply_world(sk, world, true)

# ───────── 臉看得到嗎：從鏡頭到眼睛／吹口的線段有沒有被手、手臂、道具、家具擋住（量的） ─────────
# 圳寶的眼睛位置：正面正交截圖找深綠色眼珠（PROBE=face），換成頭骨座標（x 左、y 頭頂、z 臉）；z 用頭的三角形找臉的表面
const EYES := {"zunbo": [Vector2(0.098, 0.075), Vector2(-0.178, 0.075)], "shuiling": [Vector2(0.05, 0.03), Vector2(-0.05, 0.03)]}

## 眼睛在臉表面的世界座標（沿臉的方向從前面往回走，碰到頭的三角形為止）
func _eye_points() -> Array:
	var tris := _head_tris()
	var hd := _bpos("head")
	var up := (_bpos("headtop_end") - hd).normalized()
	var left := (_bpos("leftupleg") - _bpos("rightupleg"))
	left = (left - up * left.dot(up)).normalized()
	var fwd := left.cross(up).normalized()
	var out := []
	for e: Vector2 in EYES[who]:
		var p := hd + left * e.x + up * e.y + fwd * 0.45
		for it in 120:
			if _signed_to_head(p, tris) <= 0.002:
				break
			p -= fwd * 0.004
		out.append(p + fwd * 0.003)
	return out

static func _seg_tri(a: Vector3, b: Vector3, t0: Vector3, t1: Vector3, t2: Vector3) -> bool:
	var d := b - a
	var e1 := t1 - t0
	var e2 := t2 - t0
	var h := d.cross(e2)
	var det := e1.dot(h)
	if absf(det) < 1e-12:
		return false
	var f := 1.0 / det
	var s := a - t0
	var u := f * s.dot(h)
	if u < 0.0 or u > 1.0:
		return false
	var q := s.cross(e1)
	var v := f * d.dot(q)
	if v < 0.0 or u + v > 1.0:
		return false
	var t := f * e2.dot(q)
	return t > 0.0 and t < 1.0

static func _seg_box(a: Vector3, b: Vector3, bx: AABB) -> bool:
	var d := b - a
	var t0 := 0.0
	var t1 := 1.0
	for i in 3:
		if absf(d[i]) < 1e-9:
			if a[i] < bx.position[i] or a[i] > bx.end[i]:
				return false
		else:
			var u0 := (bx.position[i] - a[i]) / d[i]
			var u1 := (bx.end[i] - a[i]) / d[i]
			if u0 > u1:
				var tmp := u0
				u0 = u1
				u1 = tmp
			t0 = maxf(t0, u0)
			t1 = minf(t1, u1)
			if t0 > t1:
				return false
	return true

static func _seg_seg_dist(p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3) -> float:
	var best := 9.0
	for k in 21:   # 取樣就夠準（mm 級）
		var p := p1.lerp(q1, k / 20.0)
		best = minf(best, Pose.seg_dist(p, p2, q2))
	for k in 21:
		var p := p2.lerp(q2, k / 20.0)
		best = minf(best, Pose.seg_dist(p, p1, q1))
	return best

var vis_rods := []   # [[a, b, 半徑], …]：直笛、鉛筆
var front_view := []  # 直笛正前方（譜架藏起來）的鏡頭
## 擋住的東西：手、手臂（三角形）、道具（棒子）、家具（每個方塊的世界 AABB）
func _occluders() -> Dictionary:
	var tris := []
	for it in Pose._hp_skinned(sk, "", ["lefthand", "righthand", "leftforearm", "rightforearm", "leftarm", "rightarm"]):
		var Q: PackedVector3Array = it[1]
		var T: PackedInt32Array = it[2]
		for ti in range(0, T.size(), 3):
			tris.append([Q[T[ti]], Q[T[ti + 1]], Q[T[ti + 2]]])
	var boxes := []
	for mi in home.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		if not m.is_visible_in_tree() or m.mesh == null:
			continue
		var bb := m.global_transform * m.get_aabb()
		if bb.size.x > 2.0 or bb.size.z > 2.0:   # 地板、牆不算（鏡頭在房間裡）
			continue
		boxes.append(bb)
	return {"tris": tris, "boxes": boxes}

## 從 C 看 E：被擋住回傳擋住的東西名稱，沒擋回傳 ""
func _blocked(C: Vector3, E: Vector3, occ: Dictionary, skip_rods := false) -> String:
	var b := E + (C - E).normalized() * 0.006   # 停在表面前 6 mm
	for t in occ["tris"]:
		if _seg_tri(C, b, t[0], t[1], t[2]):
			return "手／手臂"
	for r in ([] if skip_rods else vis_rods):
		if _seg_seg_dist(C, b, r[0], r[1]) < float(r[2]):
			return "道具"
	for bx: AABB in occ["boxes"]:
		if _seg_box(C, b, bx):
			return "家具"
	return ""

## 候選鏡頭（由最想要的排到最後）裡挑第一個「兩眼＋targets 都看得到」的；回傳 [位置, 看哪裡]
func _pick_cam(cands: Array, targets: Array, title: String, in_view := [], fov := 45.0) -> Array:
	var occ := _occluders()
	var eyes := _eye_points()
	for c in cands:
		var ok := true
		var why := ""
		_look(c[0], c[1], fov)
		for p: Vector3 in eyes + in_view:   # 眼睛、課本、拿筆的手都要在畫面裡
			if not cam.is_position_in_frustum(p):
				ok = false
				why = "畫面外"
		if not ok:
			print("  [%s 鏡頭] %s → 有東西在畫面外" % [title, c[2]])
			continue
		for ei in (eyes + targets).size():
			var e: Vector3 = (eyes + targets)[ei]
			var bl := _blocked(c[0], e, occ, ei >= eyes.size())   # 目標（吹口、筆）本身就在道具上：不算道具擋
			if bl != "":
				ok = false
				why = bl
				break
		print("  [%s 鏡頭] %s → %s" % [title, c[2], "兩眼和目標都看得到" if ok else "被%s擋住" % why])
		if ok:
			return c
	return cands[-1]

## 量：這個鏡頭看兩眼、目標各有沒有被擋（報告用）
func _report_vis(C: Vector3, targets: Array, names: Array) -> void:
	var occ := _occluders()
	var eyes := _eye_points()
	var line := "  [看得到嗎] "
	for i in eyes.size():
		var bl := _blocked(C, eyes[i], occ)
		line += "%s眼 %s；" % ["左" if i == 0 else "右", "看得到" if bl == "" else "被" + bl + "擋"]
	for i in targets.size():
		var bl := _blocked(C, targets[i], occ, true)
		line += "%s %s；" % [names[i], "看得到" if bl == "" else "被" + bl + "擋"]
	print(line)

# ───────── 裙子轉一圈檢查（ONLY=skirt_sofa／skirt_chair）：家具藏起來，8 個角度＋正前下方 ─────────
func _turntable(anchor: String) -> void:
	var hips := _bpos("hips")
	var f: Vector3 = -A(anchor).global_transform.basis.z.normalized()
	var c := hips + Vector3.UP * 0.08
	for k in 8:
		var a := TAU * k / 8.0
		var d := (f.rotated(Vector3.UP, a)) * 1.25 + Vector3.UP * 0.25
		extra_views.append(["t%d" % (k * 45), c + d, c, 38])
	extra_views.append(["low_front", c + f * 0.9 - Vector3.UP * 0.2, c, 40])
	home.visible = false

func _m_skirt_sofa() -> void:
	await _sit_m("sofa_seat", func(rt: Retarget, to_ken: Transform3D) -> void:
		Pose.aim_head(sk, rt.corr, to_ken * A("tv_screen").global_position, 0.45, 60.0)
		_hands_on_lap(rt), -0.0005, D["foot"])
	_settle_lap(_sofa_boxes())
	_turntable("sofa_seat")
	_look(extra_views[0][1], extra_views[0][2], 38)

func _m_skirt_chair() -> void:
	await _m_study_english()
	extra_views.clear()
	_turntable("desk_seat_book")
	_look(extra_views[0][1], extra_views[0][2], 38)
