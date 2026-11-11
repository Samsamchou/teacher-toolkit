extends Node3D
## [routes] 圳寶媽媽騎機車載圳寶：把騎乘姿勢算好存成 data/scooter_ride.json（遊戲直接套），並拍近看檢查圖的畫面。
## 執行（要開視窗；需要 assets/anims/mx_sitting_idle.fbx 做重定向的 T-pose 校正）：
##   Godot --path . --resolution 1280x720 res://scenes/scooter_bake.tscn
## 產出：data/scooter_ride.json、test_route_sheet/scooter_ride/*.png＋metrics.json（.gdignore，不匯入）
## 檢查圖：python -I tools/scooter_ride_sheet.py
##
## 媽媽：程式坐姿（Pose.pose_sit_simple，用 retarget.gd 的 corr 把 A-pose 轉成 T-pose 基準）→ 屁股用網格貼到坐墊前半 →
##       兩腳 IK 到腳踏板（鞋底最低點用網格量）→ 兩手 IK 到握把、手指彎起來包住（手到握把用網格量，≤ 2 cm）。
## 圳寶：mascot_motion.sit_ground()（屁股、靴底用網格貼到「地面」＝坐墊頂面）坐在後半；兩手 IK 去扶媽媽的腰；安全帽照頭量。

const World := preload("res://scripts/world.gd")
const Retarget := preload("res://scripts/retarget.gd")
const Pose := preload("res://scripts/procedural_pose.gd")
const Rig := preload("res://scripts/scooter_rig.gd")
const OUT := "res://test_route_sheet/scooter_ride"

var w: World
var cam: Camera3D
var frame: Node3D
var zunbo: Node3D
var am
var rig: Rig
var metrics := {}

func _find(n: Node, cls: String) -> Node:
	return Retarget.find_type(n, cls)

func _ready() -> void:
	w = World.new()
	w._materials()
	if OS.get_environment("SCALE") != "":
		Rig.SCALE = float(OS.get_environment("SCALE"))
	if OS.get_environment("MOMH") != "":
		Rig.MOM_H = float(OS.get_environment("MOMH"))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	FileAccess.open("res://test_route_sheet/.gdignore", FileAccess.WRITE).close()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.72, 0.85, 0.96)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1.0, 0.97, 0.92)
	e.ambient_light_energy = 0.8
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	add_child(sun)
	sun.look_at_from_position(Vector3(3, 8, 6), Vector3.ZERO, Vector3.UP)
	sun.light_energy = 0.7
	var gm := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(40, 40)
	gm.mesh = pm
	var gmat := StandardMaterial3D.new()
	gmat.albedo_color = Color(0.55, 0.56, 0.6)
	gm.material_override = gmat
	add_child(gm)
	cam = Camera3D.new()
	cam.fov = 40
	cam.near = 0.02
	add_child(cam)
	# 圳寶（和遊戲一樣的建法）
	frame = Node3D.new()
	add_child(frame)
	var props := Node3D.new()
	add_child(props)
	zunbo = w.fit_model("zunbo_openhand", 1.15, true, 0.3)
	frame.add_child(zunbo)
	var sk: Skeleton3D = _find(zunbo, "Skeleton3D")
	var ap: AnimationPlayer = _find(zunbo, "AnimationPlayer")
	if ap == null:
		ap = AnimationPlayer.new()
		zunbo.add_child(ap)
	var lib0: AnimationLibrary
	if ap.has_animation_library(""):
		lib0 = ap.get_animation_library("")
	else:
		lib0 = AnimationLibrary.new()
		ap.add_animation_library("", lib0)
	if not lib0.has_animation("idle"):
		lib0.add_animation("idle", load("res://assets/anims/baked/zunbo_idle.res"))
	ap.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	Pose.thin_hand_outline(zunbo, 0.25)
	am = (load("res://scripts/mascot_motion.gd") as GDScript).new()
	am.setup(sk, zunbo, frame, props, ap, w.outline_shader, func(_p: Vector2) -> float: return 0.0)
	await get_tree().process_frame
	rig = Rig.new()
	rig.ride = {}
	rig.am = am
	rig.world = w
	rig.R = Rig.build_scooter_rig(am, w)
	rig.root = rig.R["root"]
	frame.add_child(rig.root)
	await get_tree().process_frame
	metrics["mesh"] = _nums(rig.R["mesh_info"])
	metrics["mesh"]["grip_left"] = str(rig.R["grips"]["left"])
	metrics["mesh"]["grip_right"] = str(rig.R["grips"]["right"])
	metrics["mesh"]["scale"] = Rig.SCALE
	metrics["mesh"]["mom_h"] = Rig.MOM_H
	metrics["mesh"]["grip_r_cm"] = float(rig.R["grip_r"]) * 100.0
	metrics["mesh"]["wheel_r_cm"] = float(rig.R["wheel_r"]) * 100.0
	metrics["mesh"]["wheelbase_m"] = float(rig.R["wheel_z"][0]) - float(rig.R["wheel_z"][1])
	print("MESH ", metrics["mesh"])
	# 檢查清單 §1：媽媽靜止姿勢＋遊戲描邊（fit_model 0.3）
	zunbo.visible = false
	var mom: Node3D = rig.R["mom"]
	mom.position = Vector3(1.4, 0, 0)
	_look(Vector3(1.4, 0.8, 3.6), Vector3(1.4, 0.75, 0), 36)
	await _save("checklist_mom_rest_outline03")
	mom.position = Vector3.ZERO
	zunbo.visible = true
	_look(Vector3(3.2, 1.1, 0.2), Vector3(0, 0.6, 0.0), 36)
	mom.visible = false
	zunbo.visible = false
	await _save("scooter_only_side")
	_look(Vector3(0.0, 3.4, 0.6), Vector3(0, 0.6, 0.1), 36)
	await _save("scooter_only_top")
	mom.visible = true
	zunbo.visible = true
	await _pose_mom()
	await _pose_zunbo()
	var hm: Dictionary = rig.fit_helmet()
	await get_tree().process_frame
	# 兩個人面向哪裡：臉的方向＝左右（兩腿）× 頭頂方向；和車頭（+Z）的夾角
	var zl: Vector3 = am.fpos("leftupleg") - am.fpos("rightupleg")
	var zu: Vector3 = (am.fpos("headtop_end") - am.fpos("head")).normalized()
	var zface: Vector3 = (zl - zu * zl.dot(zu)).normalized().cross(zu).normalized()
	var ml := _mb("leftupleg") - _mb("rightupleg")
	var mu := (_mb("headtop_end") - _mb("head")).normalized()
	var mface := (ml - mu * ml.dot(mu)).normalized().cross(mu).normalized()
	metrics["facing"] = {"zunbo_face_dot_forward": zface.z, "mom_face_dot_forward": mface.z, "zunbo_left_is_plus_x": zl.x > 0.0,
		"zunbo_face_angle_from_forward_deg": rad_to_deg(acos(clampf(zface.z, -1.0, 1.0))), "mom_face_angle_from_forward_deg": rad_to_deg(acos(clampf(mface.z, -1.0, 1.0)))}
	print("FACING ", metrics["facing"])
	# 存
	var d := {"note": "scooter_bake.gd 產生：媽媽騎乘姿勢、圳寶後座姿勢、安全帽（頭骨座標）。座標＝rig（+Z 車頭、y=0 輪底平面）。",
		"scale": Rig.SCALE, "mom_h": Rig.MOM_H,
		"mom": {"xf": Rig.xfa(mom.transform), "bones": Rig.bones_of(rig.R["mom_sk"])},
		"zunbo": {"xf": Rig.xfa(rig.root.transform.affine_inverse() * zunbo.transform), "bones": Rig.bones_of(am.sk)},
		"helmet": hm}
	rig.seat_pose = am.save_pose()
	rig.seated = rig.root.transform.affine_inverse() * zunbo.transform
	var m := rig.measure()
	metrics["ride"] = _nums(m)
	d["metrics"] = metrics
	var f := FileAccess.open(Rig.RIDE_JSON, FileAccess.WRITE)
	f.store_string(JSON.stringify(d, " "))
	f.close()
	print("RIDE ", JSON.stringify(metrics["ride"]))
	# 近看畫面
	var hd: Vector3 = am.fpos("head")
	_look(Vector3(4.0, 1.25, 0.0), Vector3(0, 0.85, -0.05), 36)
	await _save("ride_side_left")
	_look(Vector3(-4.0, 1.25, 0.0), Vector3(0, 0.85, -0.05), 36)
	await _save("ride_side_right")
	_look(Vector3(2.6, 1.7, 3.2), Vector3(0, 0.85, -0.1), 36)
	await _save("ride_front34")
	_look(Vector3(0.9, 1.75, 3.6), Vector3(0, 1.0, -0.2), 30)
	await _save("ride_front_faces")
	_look(hd + Vector3(0.9, 0.15, 1.5), hd + Vector3(0, 0.1, 0), 34)
	await _save("close_helmet_front")
	_look(hd + Vector3(1.9, 0.1, 0.0), hd + Vector3(0, 0.1, 0), 34)
	await _save("close_helmet_side")
	_look(Vector3(-2.4, 1.9, -3.2), Vector3(0, 0.85, -0.1), 36)
	await _save("ride_back34")
	var gl: Vector3 = rig.R["grips"]["left"]
	var gr: Vector3 = rig.R["grips"]["right"]
	_look(gl + Vector3(0.55, 0.35, 0.55), gl, 30)
	await _save("close_hand_left")
	_look(gr + Vector3(-0.55, 0.35, 0.55), gr, 30)
	await _save("close_hand_right")
	_look((gl + gr) * 0.5 + Vector3(0, 0.75, -0.2), (gl + gr) * 0.5, 50)
	await _save("close_hands_top")
	var msk: Skeleton3D = rig.R["mom_sk"]
	var lf: Vector3 = msk.global_transform * msk.get_bone_global_pose(Retarget._idx(msk, "leftfoot")).origin
	_look(lf + Vector3(1.1, 0.25, 0.5), lf + Vector3(-0.1, 0.0, 0), 30)
	await _save("close_feet_left")
	var rf: Vector3 = msk.global_transform * msk.get_bone_global_pose(Retarget._idx(msk, "rightfoot")).origin
	_look(rf + Vector3(-1.1, 0.25, 0.5), rf + Vector3(0.1, 0.0, 0), 30)
	await _save("close_feet_right")
	_look(hd + Vector3(1.6, 0.35, 1.0), hd + Vector3(0, 0.12, 0), 36)
	await _save("close_helmet")
	_look(hd + Vector3(0.0, 0.2, -2.2), hd + Vector3(0, 0.05, 0), 36)
	await _save("close_helmet_back")
	var zh: Vector3 = am.fpos("lefthand")
	_look(zh + Vector3(1.2, 0.5, 0.2), zh, 30)
	await _save("close_zunbo_hand_left")
	var zh2: Vector3 = am.fpos("righthand")
	_look(zh2 + Vector3(-1.2, 0.5, 0.2), zh2, 30)
	await _save("close_zunbo_hand_right")
	# 輪子：前進 0.5 m 再拍一次（輪子有轉）
	rig.update(0.0)
	_look(Vector3(3.0, 0.6, 0.0), Vector3(0, 0.45, 0.0), 34)
	await _save("wheels_0m")
	rig.update(0.2)
	await get_tree().process_frame
	_look(Vector3(3.0, 0.6, 0.0), Vector3(0, 0.45, 0.0), 34)
	await _save("wheels_0p2m")
	metrics["wheel_turn_deg_per_0p2m"] = rad_to_deg(0.2 / float(rig.R["wheel_r"]))
	var mf := FileAccess.open(OUT + "/metrics.json", FileAccess.WRITE)
	mf.store_string(JSON.stringify(metrics, " "))
	mf.close()
	print("SCOOTER BAKE DONE")
	get_tree().quit()

func _nums(m: Dictionary) -> Dictionary:
	var o := {}
	for k in m:
		if typeof(m[k]) in [TYPE_FLOAT, TYPE_INT, TYPE_BOOL, TYPE_STRING]:
			o[k] = m[k]
	return o

func _look(pos: Vector3, at: Vector3, fov := 40.0) -> void:
	cam.fov = fov
	cam.look_at_from_position(pos, at, Vector3.UP)

func _save(nm: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [OUT, nm])
	print("saved ", nm)

func _mpts(keys: Array) -> PackedVector3Array:
	return rig.pts_of(rig.R["mom_sk"], keys)

func _mb(bn: String) -> Vector3:
	var msk: Skeleton3D = rig.R["mom_sk"]
	return msk.global_transform * msk.get_bone_global_pose(Retarget._idx(msk, bn)).origin

# ───────── 媽媽 ─────────
func _pose_mom() -> void:
	var mom: Node3D = rig.R["mom"]
	var msk: Skeleton3D = rig.R["mom_sk"]
	mom.global_transform = Transform3D.IDENTITY
	msk.reset_bone_poses()
	var rt := Retarget.new()
	rt.load_source(ProjectSettings.globalize_path("res://assets/anims/mx_sitting_idle.fbx"), self)
	rt.bind(msk)
	var corr: Dictionary = rt.corr
	# 手心方向的正負號：這個模型靜止姿勢（A-pose）手心朝前（+Z）；Pose._palm_normal 算出來如果朝後，aim／curl 都要反過來
	msk.reset_bone_poses()
	var pn := Pose._palm_normal(msk, Pose.pose_world(msk), "left")
	var pf := -1.0 if pn.z < 0.0 else 1.0
	print("MOM rest palm normal (left) %s → sign %+.0f" % [pn, pf])
	metrics["mom_palm_sign"] = pf
	var zf: float = rig.R["seat_z_front"]
	var zb: float = rig.R["seat_z_back"]
	var best := {}
	# 身體前傾幾度、坐多前面：試到兩手都搆得到握把（手臂伸到 96% 以內）
	for lean in [10.0, 14.0, 18.0, 22.0, 26.0, 30.0]:
		for fz in [0.24, 0.18, 0.12]:   # 臀部在坐墊前後的位置（0＝最前面、1＝最後面）
			mom.global_transform = Transform3D.IDENTITY
			Pose.pose_sit_simple(msk, corr, 78.0, 72.0, 9.0, lean)
			await get_tree().process_frame
			# 屁股（臀＋大腿，臀關節前後 ±12 cm）最低點貼到坐墊
			var hz := lerpf(zf, zb, fz)
			var hip := _mb("hips")
			mom.global_position += Vector3(0, 0, hz - hip.z)
			var low := 9.0
			for p in _mpts(["hips", "leftupleg", "rightupleg"]):
				if absf(p.z - hz) < 0.12 and absf(p.x) < 0.16:
					low = minf(low, p.y - rig.seat_top(p.z))
			mom.global_position.y -= low - 0.002
			await get_tree().process_frame
			var reach := 0.0
			for sd in ["left", "right"]:
				var S := _mb(sd + "arm")
				var la := S.distance_to(_mb(sd + "forearm")) + _mb(sd + "forearm").distance_to(_mb(sd + "hand"))
				var G: Vector3 = rig.R["grips"][sd]
				reach = maxf(reach, S.distance_to(G + Vector3(0, 0.03, -0.07)) / la)
			print("MOM try lean %.0f fz %.2f → reach %.2f (arm %.2f m, shoulder %s)" % [lean, fz, reach, _mb("leftarm").distance_to(_mb("leftforearm")) + _mb("leftforearm").distance_to(_mb("lefthand")), _mb("leftarm")])
			best = {"lean": lean, "fz": fz, "reach": reach}
			if reach <= 0.955:
				break
		if float(best["reach"]) <= 0.955:
			break
	metrics["mom_pose"] = best
	var ax: Vector3 = rig.R["grip_axis"]
	var grr: float = rig.R["grip_r"]
	for pass_i in 2:
		# 屁股再量一次（前面擺手腳之後可能差一點）→ 整個人上下移到離坐墊 2 mm
		await get_tree().process_frame
		var sg0: float = float(rig.measure_mom()["mom_seat_gap_cm"]) / 100.0
		if sg0 > -0.9:
			mom.global_position.y -= sg0 - 0.002
		await get_tree().process_frame
		print("MOM pass %d seat gap %.1f mm → %.1f mm" % [pass_i, sg0 * 1000.0, float(rig.measure_mom()["mom_seat_gap_cm"]) * 10.0])
		# 兩腳：鞋底最低點貼到腳踏板頂面（腳踝 IK，腳掌方向不變）
		for sd in ["left", "right"]:
			for it in 6:
				var low := 9.0
				for p in _mpts([sd + "foot", sd + "toe"]):
					var bt := rig.board_top(p.x, p.z)
					if bt > 0.0:
						low = minf(low, p.y - bt)
				if low > 8.0:
					low = 0.05
				print("MOM %s foot it %d sole-board %.1f mm" % [sd, it, low * 1000.0])
				if low >= 0.0 and low < 0.004:
					break
				Rig.leg_to(msk, sd, _mb(sd + "foot") + Vector3(0, 0.002 - low, 0))
				await get_tree().process_frame
		# 兩手：①手指伸直，手掌放到握把上（手腕 IK；手的網格到握把軸 − 握把半徑＝1–4 mm）
		#       ②手指一點一點彎起來包住握把，彎到再彎就會穿進握把為止
		for sd in ["left", "right"]:
			var sg := 1.0 if sd == "left" else -1.0
			var G: Vector3 = rig.R["grips"][sd]
			var W := G + Vector3(0, grr + 0.03, -0.06)
			var curl := 0.0
			var last_ok := 0.0
			var phase := 0
			for it in 20:
				var world := Pose.pose_world(msk)
				Pose.ik_arm(msk, world, sd, W, Vector3(sg * 0.7, -0.5, -0.4))
				Pose.apply_world(msk, world, true)
				world = Pose.pose_world(msk)
				Pose.aim_hand(msk, world, sd, Vector3(0.0, -0.06, 1.0).normalized(), Vector3(0, -1.0, 0.0) * pf)
				Pose.apply_world(msk, world, true)
				world = Pose.pose_world(msk)
				Pose.reset_fingers(msk, world, corr, sd)
				Pose.apply_world(msk, world, true)
				if curl > 0.0:
					world = Pose.pose_world(msk)
					Pose.curl_fingers(msk, world, sd, [60.0 * curl * pf, 75.0 * curl * pf, 50.0 * curl * pf], 25.0 * curl * pf)
					Pose.apply_world(msk, world, true)
				await get_tree().process_frame
				var m := 9.0        # 手的網格到握把表面（離軸 − 半徑）最近
				var over := 9.0     # 握把正上方的手（手掌）最低點離握把頂多高
				for p in _mpts([sd + "hand"]):
					var d := p - G
					var along := clampf(d.dot(ax), -0.07, 0.07)
					var cpt := G + ax * along
					m = minf(m, (p - cpt).length() - grr)
					if absf(p.z - cpt.z) < grr * 0.6 and absf(d.dot(ax)) < 0.07:
						over = minf(over, p.y - (cpt.y + grr))
				print("MOM %s hand it %d phase %d curl %.2f: hand-grip %.1f mm, palm over grip %.1f mm, wrist err %.1f cm" % [sd, it, phase, curl, m * 1000.0, over * 1000.0, _mb(sd + "hand").distance_to(W) * 100.0])
				if phase == 0:   # ①手掌平放到握把頂上 2 mm
					if over < 8.0 and absf(over - 0.002) < 0.0012:
						phase = 1
						curl = 0.12
					elif over < 8.0:
						W.y -= over - 0.002
					else:
						W.z += 0.01
					if it >= 8:
						phase = 1
						curl = 0.12
				else:            # ②手指一點一點彎，彎到穿進握把就退回上一格
					if m < -0.0005:
						curl = last_ok
						world = Pose.pose_world(msk)
						Pose.reset_fingers(msk, world, corr, sd)
						Pose.apply_world(msk, world, true)
						if curl > 0.0:
							world = Pose.pose_world(msk)
							Pose.curl_fingers(msk, world, sd, [60.0 * curl * pf, 75.0 * curl * pf, 50.0 * curl * pf], 25.0 * curl * pf)
							Pose.apply_world(msk, world, true)
						break
					last_ok = curl
					if curl >= 1.0:
						break
					curl = minf(1.0, curl + 0.11)
			metrics["mom_%s_finger_curl" % sd] = curl
	rt.src_root.queue_free()
	await get_tree().process_frame

# ───────── 圳寶 ─────────
func _pose_zunbo() -> void:
	var zb: float = rig.R["seat_z_back"]
	var zf: float = rig.R["seat_z_front"]
	var mom_back := 9.0
	for p in _mpts(["hips", "spine", "neck", "head", "left", "right"]):
		if p.y > rig.seat_top(p.z) + 0.02 or rig.seat_top(p.z) < 0.0:
			mom_back = minf(mom_back, p.z)
	var keep_g: Callable = am.ground_at
	am.anim.stop()
	var z: float = lerpf(zf, zb, 0.72)
	var gap := 0.0
	var r := {}
	for it in 7:
		var sy := rig.seat_top(z) if rig.seat_top(z) > 0.0 else rig.seat_top(zb + 0.05)
		am.ground_at = func(_v: Vector2) -> float: return sy
		am.model_base = Transform3D(Basis.IDENTITY, Vector3(0, sy, z))
		r = am.sit_ground()
		var front := -9.0
		for q in am.mesh_pts(["hips", "spine", "neck", "head", "left", "right"]):
			front = maxf(front, q.z)
		gap = mom_back - front
		print("ZUNBO seat it %d z %.3f seat_y %.3f front %.3f mom_back %.3f gap %.1f cm butt %.2f boots %.2f" % [it, z, sy, front, mom_back, gap * 100.0, r.get("butt_cm", -1.0), r.get("boot_sole_cm", -1.0)])
		if gap >= 0.02 or z <= zb - 0.25:
			break
		z -= (0.03 - gap)
	am.ground_at = keep_g
	# 屁股、腿、靴子每個頂點量到它正下方的坐墊／後扶手頂面 → 整個人上下移到最低的那一點離 2 mm
	for it in 3:
		await get_tree().process_frame
		rig.seat_pose = am.save_pose()
		var sg1: float = float(rig.measure_zunbo()["seat_bottom_gap_cm"]) / 100.0
		print("ZUNBO seat contact it %d: lowest point %.1f mm above seat/rail" % [it, sg1 * 1000.0])
		if sg1 < -0.9 or absf(sg1 - 0.002) < 0.0008:
			break
		zunbo.position.y -= sg1 - 0.002
	rig.seat_pose = []
	metrics["zunbo_seat"] = {"hips_z": z, "seat_back_z": zb, "behind_seat_end_cm": maxf(0.0, (zb - z) * 100.0), "gap_to_mom_cm": gap * 100.0}
	# 上半身往前傾一點（手短，要靠近才扶得到）；頭、肚子離媽媽至少 1 cm
	var lean_used := 0.0
	var base_pose: Array = am.save_pose()
	for lean in [12.0, 9.0, 6.0, 3.0, 0.0]:
		am.load_pose(base_pose)
		if lean > 0.0:
			var wl := Pose.pose_world(am.sk)
			Pose._rot_chain(am.sk, wl, am.bi("spine"), Basis(frame.global_transform.basis.orthonormalized() * Vector3.RIGHT, deg_to_rad(lean)))
			Pose.apply_world(am.sk, wl, true)
		await get_tree().process_frame
		var front2 := -9.0
		for q in am.mesh_pts(["hips", "spine", "neck", "head", "left", "right"]):
			front2 = maxf(front2, (q as Vector3).z)
		print("ZUNBO lean %.0f → gap to mom %.1f cm" % [lean, (mom_back - front2) * 100.0])
		if mom_back - front2 >= 0.01:
			lean_used = lean
			break
	metrics["zunbo_seat"]["lean_deg"] = lean_used
	# 兩手：扶媽媽（臀、腰、背離肩膀最近的表面點）；搆不到（手臂 0.27 m）就抓身體旁邊的後扶手
	var sy2 := rig.seat_top(lerpf(zf, zb, 0.25))
	var mom_w := _mpts(["hips", "spine"])
	var rail: PackedVector3Array = rig.R["rail_pts"]
	print("RAIL front z %.3f top y %.3f pts %d" % [rig.R["rail_front_z"], rig.R["rail_top_y"], rail.size()])
	for sd in ["left", "right"]:
		var sg := 1.0 if sd == "left" else -1.0
		var S: Vector3 = am.fpos(sd + "arm")
		var la: float = S.distance_to(am.fpos(sd + "forearm")) + am.fpos(sd + "forearm").distance_to(am.fpos(sd + "hand"))
		var best := Vector3.INF
		var bd := 9.0
		for p in mom_w:
			if p.y > sy2 + 0.08 and p.x * sg > 0.02:
				var dd := S.distance_to(p)
				if dd < bd:
					bd = dd
					best = p
		var rbest := Vector3.INF
		var rd := 9.0
		for p in rail:
			if p.x * sg > 0.03:
				var dd2 := S.distance_to(p)
				if dd2 < rd:
					rd = dd2
					rbest = p
		print("ZUNBO %s arm len %.2f: mom %.2f m away, rear rail %.2f m away" % [sd, la, bd, rd])
		metrics["zunbo_%s_arm_len_cm" % sd] = la * 100.0
		metrics["zunbo_%s_mom_dist_cm" % sd] = bd * 100.0
		metrics["zunbo_%s_rail_dist_cm" % sd] = rd * 100.0
		var targets: PackedVector3Array = mom_w
		var tgt := best
		if bd > la * 1.05 and rd < bd:
			targets = rail
			tgt = rbest
		if tgt == Vector3.INF:
			continue
		for it in 6:
			var world := Pose.pose_world(am.sk)
			Pose.ik_arm(am.sk, world, sd, frame.global_transform * tgt, Vector3(sg * 0.8, -0.5, -0.2))
			Pose.apply_world(am.sk, world, true)
			await get_tree().process_frame
			var m := 9.0
			var q0 := Vector3.ZERO
			var c0 := Vector3.ZERO
			for q in am.mesh_pts([sd + "hand"]):
				for p in targets:
					var d: float = (q as Vector3).distance_to(p)
					if d < m:
						m = d
						q0 = q
						c0 = p
			print("ZUNBO %s hand it %d hand-hold %.1f mm" % [sd, it, m * 1000.0])
			if m <= 0.008 and m >= 0.001:
				break
			tgt += (c0 - q0).normalized() * (m - 0.004)
