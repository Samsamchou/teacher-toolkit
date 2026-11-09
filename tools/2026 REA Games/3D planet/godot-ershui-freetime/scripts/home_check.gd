extends Node3D
## Ken 的家：室內＋六個室內休閒動作截圖，存 test_home/*.png
## 執行：Godot --path . res://scenes/home_check.tscn   （ONLY=watch_tv 只拍一張）
## 會印出量到的坐姿高度（屁股最低點、膝蓋、手的位置）和家具高度對照。

const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")
const Home := preload("res://scripts/home_interior.gd")
const Pose := preload("res://scripts/procedural_pose.gd")

var ken: Node3D
var sk: Skeleton3D
var home: Node3D
var hb: Home
var cam: Camera3D
var props: Array[Node] = []

func _ready() -> void:
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
	var sun := DirectionalLight3D.new()   # 柔和主光，不投影
	add_child(sun)
	sun.look_at_from_position(Vector3(1, 6, 7), Vector3(0.5, 0, 1.5), Vector3.UP)
	sun.light_energy = 0.55
	sun.light_color = Color(1.0, 0.97, 0.92)
	for p in [Vector3(2.5, 2.0, 2.0), Vector3(-1.75, 2.0, 1.5)]:   # 天花板燈（客廳、書房）
		var o := OmniLight3D.new()
		o.position = p
		o.omni_range = 5.5
		o.omni_attenuation = 0.6
		o.light_energy = 0.9
		o.light_color = Color(1.0, 0.9, 0.75)
		add_child(o)
	hb = Home.new()
	home = hb.build_ken_home()
	add_child(home)
	ken = w.fit_model("ken_rigged", 1.3, true, 0.3)   # 細描邊
	add_child(ken)
	var ap: AnimationPlayer = Retarget.find_type(ken, "AnimationPlayer")
	if ap:
		ap.stop()
		ap.active = false
	sk = Retarget.find_type(ken, "Skeleton3D")
	cam = Camera3D.new()
	cam.fov = 45
	add_child(cam)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://test_home"))
	await get_tree().process_frame
	_print_furniture()
	if OS.get_environment("DIAG") != "":
		_diag()
		get_tree().quit()
		return
	var only := OS.get_environment("ONLY")
	for shot in ["overview", "watch_tv", "listen_music", "study_english", "surf_internet", "recorder"]:
		if only != "" and shot != only:
			continue
		await call("_shot_" + shot)
		await _save(shot)
		_clear_props()
	get_tree().quit()

func A(nm: String) -> Node3D:
	return home.get_node(nm)

func _print_furniture() -> void:
	print("FURNITURE sofa_seat_top=%.3f chair_seat_top=%.3f desk_top=%.3f desk_underside=%.3f" % [Home.SOFA_SEAT_TOP, Home.CHAIR_SEAT_TOP, Home.DESK_TOP, Home.DESK_TOP - 0.03])

# ───────── 共用 ─────────
func _bind(anim: String) -> Retarget:
	ken.global_transform = Transform3D.IDENTITY
	sk.reset_bone_poses()
	var rt := Retarget.new()
	rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_%s.fbx" % anim), self)
	rt.bind(sk)
	return rt

## 坐下：套動作 → 量屁股最低點與臀部前後位置 → 讓臀部落在錨點（坐墊面）上
func _sit(anim: String, anchor: String, sink := 0.008) -> Dictionary:
	var rt := _bind(anim)
	var t: float = Home.SIT[anim]["t"]
	rt.apply_at(rt.length() * t)
	var m := measure()
	print("MEASURE %s@%.2f %s" % [anim, t, m])
	var anc := A(anchor)
	ken.global_transform = anc.global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3(m["hips_x"], -m["seat"] - sink, m["hips_z"]))
	rt.src_root.queue_free()
	await get_tree().process_frame
	var floor_gap: float = anc.global_position.y - m["seat"] - sink + m["minY"]
	print("  -> Ken 原點 y=%.3f，腳底最低點 y=%.3f（0＝剛好踩地）" % [ken.global_position.y, floor_gap])
	return m

func _look(pos: Vector3, at: Vector3, fov := 45.0) -> void:
	cam.fov = fov
	cam.look_at_from_position(pos, at, Vector3.UP)

func _bone_global(bn: String) -> Transform3D:
	return sk.global_transform * sk.get_bone_global_pose(Retarget._idx(sk, bn))

func _bpos(bn: String) -> Vector3:
	return _bone_global(bn).origin

## 把 node 以世界 Transform want 掛到骨頭上（BoneAttachment3D）
func _attach(bn: String, node: Node3D, want: Transform3D) -> void:
	var ba := BoneAttachment3D.new()
	ba.bone_name = sk.get_bone_name(Retarget._idx(sk, bn))
	sk.add_child(ba)
	ba.add_child(node)
	node.transform = _bone_global(bn).affine_inverse() * want
	props.append(ba)

func _clear_props() -> void:
	for p in props:
		p.queue_free()
	props.clear()
	for n in ["headphones/HeadphonesProp", "book/Pencil", "Study/RecorderProp"]:
		(home.get_node(n) as Node3D).visible = true

# ───────── 六張圖 ─────────
func _shot_overview() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
	ken.global_transform = A("door").global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3.ZERO)
	_look(Vector3(0.75, 5.3, 7.1), Vector3(0.75, 0.25, 1.85), 47)

func _shot_watch_tv() -> void:
	await _sit("sitting_laughing", "sofa_seat")
	_look(Vector3(3.6, 1.45, 4.6), Vector3(3.2, 0.5, 1.9), 55)

func _shot_listen_music() -> void:
	await _sit("sitting_idle", "sofa_seat")
	(home.get_node("headphones/HeadphonesProp") as Node3D).visible = false
	_put_headphones()
	_look(Vector3(3.35, 1.15, 3.35), Vector3(2.0, 0.5, 1.95), 42)

func _shot_study_english() -> void:
	A("Study/DeskChair").position.z = A("desk_seat_book").position.z
	await _sit("writing", "desk_seat_book")
	_pencil_in_hand()
	_look(Vector3(-3.3, 1.2, 2.55), Vector3(-2.85, 0.6, 1.5), 45)
	print("  手／課本：右手 y=%.3f 左手 y=%.3f；課本頁面 y=%.3f" % [_bpos("righthandmiddle1").y, _bpos("lefthandmiddle1").y, Home.DESK_TOP + 0.02])

func _shot_surf_internet() -> void:
	A("Study/DeskChair").position.z = A("desk_seat").position.z
	await _sit("typing", "desk_seat")
	_look(Vector3(-2.75, 1.35, 2.25), Vector3(-3.0, 0.6, 0.9), 44)
	print("  手／鍵盤：右手 y=%.3f 左手 y=%.3f；鍵盤面 y=%.3f" % [_bpos("righthandmiddle1").y, _bpos("lefthandmiddle1").y, Home.DESK_TOP + 0.02])

func _shot_recorder() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	_face_profile()   # 手放下時量臉（量嘴巴位置用）
	var rtf := Pose.pose_recorder(sk, rt.corr)
	rt.src_root.queue_free()
	(home.get_node("Study/RecorderProp") as Node3D).visible = false
	var rec := Home.make_recorder(Pose.RECORDER_LEN)
	_attach("righthand", rec, rtf)
	# 擺好後再移到譜架前（骨頭姿勢是本地的，搬動整個 Ken 不影響）
	var spot := A("recorder_spot")
	ken.global_transform = spot.global_transform * Transform3D(Basis(Vector3.UP, PI), Vector3.ZERO)
	await get_tree().process_frame
	print("  直笛：嘴（推估）＝頭骨＋", Pose.MOUTH_OFS, "；左手腕 ", _bpos("lefthand"), " 右手腕 ", _bpos("righthand"))
	_look(Vector3(-2.7, 1.25, 3.7), Vector3(-1.9, 0.82, 2.45), 44)

## 印臉的側面輪廓（頭骨座標：每 2 cm 高度，正中線最前面的點）→ 找嘴巴位置
func _face_profile() -> void:
	var head := _bpos("head")
	var P := skinned_points()
	var prof := {}
	for p in P:
		var d := p - head
		if absf(p.x - head.x) < 0.025 and d.y > -0.12 and d.y < 0.12:
			var k := int(floor(d.y / 0.02))
			prof[k] = maxf(prof.get(k, -9.0), d.z)
	var ks := prof.keys()
	ks.sort()
	var s := "FACE 頭骨相對（y: 最前 z）"
	for k in ks:
		s += " %.2f:%.3f" % [k * 0.02, prof[k]]
	print(s)

func _put_headphones() -> void:
	# 頭的大小用蒙皮頂點量：頭骨以上的點
	var head := _bpos("head")
	var up := (_bpos("headtop_end") - head).normalized()
	var P := skinned_points()
	var left := (_bpos("leftupleg") - _bpos("rightupleg"))
	left = (left - up * left.dot(up)).normalized()
	var fwd := left.cross(up).normalized()
	var mn := Vector3(9, 9, 9)
	var mx := -mn
	for p in P:
		var d := p - head
		var v := Vector3(d.dot(left), d.dot(up), d.dot(fwd))
		if v.y > -0.01 and absf(v.x) < 0.3 and absf(v.z) < 0.3:
			mn = mn.min(v)
			mx = mx.max(v)
	var w := maxf(absf(mn.x), absf(mx.x))
	var ear_y := mn.y + (mx.y - mn.y) * 0.38
	var cz := (mn.z + mx.z) * 0.5 - 0.01
	print("  頭的範圍（左右/上下/前後）：", mn, " ~ ", mx)
	var hp := Home.make_headphones(w * 0.92, (mx.y - ear_y) * 0.92)
	var o := head + left * ((mn.x + mx.x) * 0.5) + up * ear_y + fwd * cz
	_attach("head", hp, Transform3D(Basis(left, up, fwd).orthonormalized(), o))

func _pencil_in_hand() -> void:
	(home.get_node("book/Pencil") as Node3D).visible = false
	var hand := _bpos("righthandmiddle1")
	var wrist := _bpos("righthand")
	var hd := (hand - wrist).normalized()
	var tip := hand + hd * 0.03
	tip.y = Home.DESK_TOP + 0.025
	var topp := hand + Vector3.UP * 0.07 - hd * 0.02
	var yv := (topp - tip).normalized()
	var xv := yv.cross(Vector3.FORWARD).normalized()
	var pen := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.006
	cm.bottom_radius = 0.006
	cm.height = tip.distance_to(topp)
	cm.radial_segments = 6
	pen.mesh = cm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("#f6c453")
	pen.material_override = m
	_attach("righthand", pen, Transform3D(Basis(xv, yv, xv.cross(yv)).orthonormalized(), (tip + topp) * 0.5))

func _save(nm: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://test_home/%s.png" % nm)
	print("saved ", nm)

# ───────── 量測（蒙皮頂點） ─────────
func skinned_points() -> PackedVector3Array:
	var out := PackedVector3Array()
	var mis := []
	_collect(ken, mis)
	for mi: MeshInstance3D in mis:
		var skin := mi.skin
		var mesh := mi.mesh
		var bm := []
		for i in skin.get_bind_count():
			var bi := skin.get_bind_bone(i)
			if bi < 0:
				bi = sk.find_bone(skin.get_bind_name(i))
			bm.append(sk.get_bone_global_pose(bi) * skin.get_bind_pose(i))
		for s in mesh.get_surface_count():
			var a := mesh.surface_get_arrays(s)
			var V: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
			var B = a[Mesh.ARRAY_BONES]
			var W = a[Mesh.ARRAY_WEIGHTS]
			if B == null or B.size() == 0:
				continue
			var nb: int = B.size() / V.size()
			for vi in range(0, V.size(), 3):
				var p := Vector3.ZERO
				for k in nb:
					var wt: float = W[vi * nb + k]
					if wt > 0.0:
						var tf: Transform3D = bm[B[vi * nb + k]]
						p += (tf * V[vi]) * wt
				out.append(sk.global_transform * p)
	return out

func _collect(n: Node, arr: Array) -> void:
	if n is MeshInstance3D and n.skin != null and n.mesh != null:
		arr.append(n)
	for c in n.get_children():
		_collect(c, arr)

## Ken 在原點、面向 +Z 時量：hips、屁股最低點（seat）、膝蓋、腳、手
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
		if p.y < hips.y and p.y > 0.18 and p.z > hips.z - 0.2 and p.z < hips.z + 0.1 and absf(p.x - hips.x) < 0.2:
			seat = minf(seat, p.y)
		if p.y < 0.6:
			back = minf(back, p.z)
		if p.y > 0.2 and p.y < 0.5:
			knee_front = maxf(knee_front, p.z)
	return {"hips_x": hips.x, "hips_y": hips.y, "hips_z": hips.z, "seat": seat, "back_z": back, "knee_y": knee.y, "knee_z": knee.z,
		"knee_front_z": knee_front, "minY": minY, "handL": _bpos("lefthandmiddle1"), "handR": _bpos("righthandmiddle1")}

## 診斷：右手頂點（手骨座標、貼圖顏色、權重）寫到 DIAG_OUT，用來找手上的小道具
func _diag() -> void:
	var rt := _bind("sitting_idle")
	Pose.pose_stand(sk, rt.corr)
	rt.src_root.queue_free()
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
			var rh := sk.get_bone_global_pose(Retarget._idx(sk, "righthand")).affine_inverse()
			for vi in V.size():
				var best := -1
				var bw := 0.0
				var p := Vector3.ZERO
				var ws := ""
				for k in nb:
					var wt: float = W[vi * nb + k]
					if wt > 0.0:
						p += (bm[B[vi * nb + k]] * V[vi]) * wt
						ws += "%s:%.2f," % [Retarget.norm(sk.get_bone_name(bidx[B[vi * nb + k]])), wt]
					if wt > bw:
						bw = wt
						best = bidx[B[vi * nb + k]]
				var nm := Retarget.norm(sk.get_bone_name(best))
				if nm.begins_with("righthand") or nm.begins_with("lefthand"):
					var rl := rh * p
					var uv: Vector2 = UV[vi]
					var c := img.get_pixel(clampi(int(uv.x * img.get_width()), 0, img.get_width() - 1), clampi(int(uv.y * img.get_height()), 0, img.get_height() - 1))
					dump += "%d %s %f %f %f %s %s
" % [vi, nm, rl.x, rl.y, rl.z, c.to_html(false), ws]
	var fa := FileAccess.open(OS.get_environment("DIAG_OUT"), FileAccess.WRITE)
	fa.store_string(dump)
	fa.close()
	print("DIAG done")
