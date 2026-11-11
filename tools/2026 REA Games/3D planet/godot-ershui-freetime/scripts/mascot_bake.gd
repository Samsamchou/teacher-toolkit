extends "res://scripts/mascot_motion_check.gd"
## [routes] 水鈴、圳寶路線用：把 mascot_motion_check.gd 驗收過的姿勢與動作「烤」成遊戲資料（和 pose_bake.gd 對 Ken 做的一樣）。
## 只「呼叫」mascot_motion_check.gd／mascot_home_check.gd，不改它們（那兩支由 [mascot] agent 維護）。
## 執行（要開視窗，不能 --headless；解析度要和遊戲一樣 1280x720，鏡頭的 HUD 安全區才一致）：
##   WHO=shuiling|zunbo PART=indoor|outdoor  Godot --path . --resolution 1280x720 res://scenes/mascot_bake.tscn
## 產出：
##   PART=indoor  → data/interior/<who>_poses.json：5 個室內活動「接觸那一格」（mascot_motion_check _indoor_act 的 k=1）
##                  角色位置、每根骨頭、鏡頭、道具（data/interior/<who>_<shot>_<n>.tscn）、家具差異（椅子位置、藏起來的東西）、
##                  裙子壓平用的方塊（遊戲進門時呼叫同一個 Pose.settle_skirt）、量測數字
##   PART=outdoor → assets/anims/baked/<who>_<動作>.res（Mixamo 重定向＋站姿 idle）、
##                  data/interior/<who>_outdoor.json（每個動作貼地位移、耳機掛在頭上的位置）
## 檢查用截圖在 test_route_bake/<who>/（有 .gdignore，不會被匯入）。

const OUT_DIR := "res://data/interior"
const ANIM_DIR := "res://assets/anims/baked"
const SHOT_KEY := {"english": "study_english", "internet": "surf_internet", "tv": "watch_tv", "games": "online_games", "recorder": "recorder"}

var part := "indoor"
var home_def := {}        # 家裡每個 Node3D 一開始的 [visible, transform]
var out := {}
var skirt_args := []      # 最後一次 _bake_skirt 的 [boxes, gap]
var hp_cap := {}

func _ready() -> void:
	who = OS.get_environment("WHO") if OS.get_environment("WHO") != "" else "shuiling"
	part = OS.get_environment("PART") if OS.get_environment("PART") != "" else "indoor"
	mode = part
	wobj = World.new()
	wobj._materials()
	out_dir = "res://test_route_bake/%s" % who
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_dir))
	var gi := FileAccess.open("res://test_route_bake/.gdignore", FileAccess.WRITE)
	gi.close()
	cam = Camera3D.new()
	cam.fov = 45
	cam.near = 0.02
	add_child(cam)
	if part == "indoor":
		out = {"model": MODELS[who][0], "height": MODELS[who][1], "bones": [], "poses": {}}
		await _indoor()
		for i in sk.get_bone_count():
			out["bones"].append(sk.get_bone_name(i))
		_write("%s/%s_poses.json" % [OUT_DIR, who], out)
	elif part == "baseball":
		await _bake_baseball()
	else:
		await _bake_outdoor()
	print("MASCOT BAKE DONE ", who, " ", part)
	get_tree().quit()

func _write(path: String, d: Dictionary) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(JSON.stringify(d, " "))
	f.close()
	print("WROTE ", path)

# ───────── 室內 ─────────
## _indoor() 蓋好家之後第一件事是 _collect_meshes(home) → 在這裡記下家具一開始的樣子
func _collect_meshes(n: Node) -> void:
	super._collect_meshes(n)
	if n == home and home_def.is_empty():
		_snap(home)

func _snap(n: Node) -> void:
	if n is Node3D and n != home:
		home_def[String(home.get_path_to(n))] = [(n as Node3D).visible, (n as Node3D).transform]
	for c in n.get_children():
		_snap(c)

func _bake_skirt(boxes: Array, gap := 0.003) -> void:
	skirt_args = [boxes.duplicate(true), gap]
	super._bake_skirt(boxes, gap)

func _shot(act: String, k: int, label: String, m: Dictionary) -> void:
	await super._shot(act, k, label, m)
	if part == "indoor" and k == 1:
		# 遊戲用的鏡頭：吉祥物頭很大、身體很矮，檢查圖那個「從上往下」的鏡頭在遊戲裡只看到頭 → 另外找一個
		# 「前側方、低、遠」的鏡頭：臉、手、道具／螢幕都在畫面安全區，而且不被自己的頭或家具擋住。
		var rc := _route_cam(act)
		m["route_cam"] = rc.get("found", false)
		for kk in rc:
			if kk != "found":
				m["cam_" + kk] = rc[kk]
		await _save("%s_route" % act)
		out["poses"][SHOT_KEY[act]] = _capture(SHOT_KEY[act], m)
		print("BAKED ", who, " ", SHOT_KEY[act], " route_cam=", rc)
	if part == "outdoor" and act == "music" and k == 1 and not props.is_empty():
		var ba := props[-1] as BoneAttachment3D
		var child: Node3D = ba.get_child(0)
		_save_prop(child, "%s_stand_headphones" % who)
		hp_cap = {"bone": ba.bone_name, "scene": "%s/%s_stand_headphones.tscn" % [OUT_DIR, who], "xf": _xfa(child.transform),
			"ear_pad_gap_cm": m.get("ear_pad_gap_cm", -1.0), "ear_pad_in_head": m.get("ear_pad_in_head", -1)}

# ───────── 遊戲用的室內鏡頭 ─────────
static func _seg_pt(a: Vector3, b: Vector3, c: Vector3) -> float:
	var ab := b - a
	var t := clampf((c - a).dot(ab) / maxf(ab.length_squared(), 1e-9), 0.0, 1.0)
	return c.distance_to(a + ab * t)

## 頭：中心、半徑（頭骨權重頂點離中心距離的第 80 百分位）、臉朝哪
func _head_info() -> Dictionary:
	var hd0 := _bpos("head")
	var upv := (_bpos("headtop_end") - hd0).normalized()
	var lv := _bpos("leftupleg") - _bpos("rightupleg")
	lv = (lv - upv * lv.dot(upv)).normalized()
	var face := lv.cross(upv).normalized()
	var pts := _pts_of(["head"])
	var c := Vector3.ZERO
	for q in pts:
		c += q
	c /= maxf(pts.size(), 1)
	var ds := []
	for q in pts:
		ds.append(q.distance_to(c))
	ds.sort()
	var r: float = ds[int(ds.size() * 0.8)] if ds.size() > 0 else 0.2
	return {"c": c, "r": r, "face": face, "up": upv}

## 用電腦（上網、線上遊戲）：螢幕正面朝著角色，從前側方拍只看得到螢幕背面 → 從角色側後方、靠近一點拍：
## 螢幕正面朝鏡頭（夾角 ≤ 55°）、整塊螢幕在安全區、四個角不被頭擋住，螢幕在畫面上越大越好；頭、兩手也在畫面裡。
func _route_cam_pc(act: String) -> Dictionary:
	var H := _head_info()
	var hc: Vector3 = H["c"]
	var hr: float = H["r"]
	var face: Vector3 = H["face"]
	var vs := get_viewport().get_visible_rect().size
	var safe := Rect2(50.0, 50.0, vs.x - 50.0 - 240.0, vs.y * 0.64 - 50.0)
	var screen: MeshInstance3D = home.find_child("PCScreen", true, false)
	var szq: Vector2 = (screen.mesh as QuadMesh).size
	var sn := screen.global_transform.basis.z.normalized()
	if sn.dot(hc - screen.global_position) < 0.0:
		sn = -sn
	var sc0 := screen.global_position
	var corners := []
	for cx in [-0.5, 0.5]:
		for cy in [-0.5, 0.5]:
			corners.append(screen.global_transform * Vector3(szq.x * cx, szq.y * cy, 0))
	var hands := [_bpos("lefthand"), _bpos("righthand")]
	var look := sc0.lerp(hc, 0.4)
	var boxes := _room_boxes()
	var best := {}
	var best_sc := -1e9
	for d: float in [0.75, 0.9, 1.05, 1.25, 1.5, 1.8, 2.2]:
		for el in [6.0, 12.0, 20.0, 28.0, 36.0]:
			for azi in 36:
				var az := deg_to_rad(azi * 10.0)
				var dir := Vector3(cos(az) * cos(deg_to_rad(el)), sin(deg_to_rad(el)), sin(az) * cos(deg_to_rad(el)))
				var pos := look + dir * d
				if pos.y < 0.25 or pos.y > 1.9:
					continue
				var sd: float = (pos - sc0).normalized().dot(sn)
				if sd < 0.57:
					continue
				var bad := false
				for bx: AABB in boxes:
					if bx.grow(0.05).has_point(pos):
						bad = true
						break
				if bad:
					continue
				_look(pos, look, 45.0)
				if pos.distance_to(hc) < hr + 0.3:   # 鏡頭不能貼著頭
					continue
				for q: Vector3 in corners:
					if cam.is_position_behind(q) or not safe.has_point(cam.unproject_position(q)):
						bad = true
						break
				if bad:
					continue
				var hsp := cam.unproject_position(hc)
				if cam.is_position_behind(hc) or hsp.x < -120.0 or hsp.x > vs.x - 120.0 or hsp.y < -120.0 or hsp.y > vs.y * 0.75:   # 頭至少有一部分在畫面裡
					continue
				var hand_ok := false   # 至少一隻手（在鍵盤上）看得到
				for q: Vector3 in hands:
					if not cam.is_position_behind(q) and safe.grow(40.0).has_point(cam.unproject_position(q)):
						hand_ok = true
				if not hand_ok:
					continue
				for q: Vector3 in corners:
					if _seg_pt(pos, q, hc) < hr * 0.95 and pos.distance_to(hc) < pos.distance_to(q):
						bad = true
						break
				if bad:
					continue
				for bx: AABB in boxes:   # 螢幕中心到鏡頭之間不能有家具
					if bx.grow(0.03).has_point(sc0):
						continue
					if _seg_box(pos, sc0 + (pos - sc0).normalized() * 0.03, bx):
						bad = true
						break
				if bad:
					continue
				var wpx: float = cam.unproject_position(screen.global_transform * Vector3(-szq.x * 0.5, 0, 0)).distance_to(cam.unproject_position(screen.global_transform * Vector3(szq.x * 0.5, 0, 0)))
				var fd: float = (pos - (hc + face * hr * 0.8)).normalized().dot(face)
				var score: float = wpx + 120.0 * fd
				if score > best_sc:
					best_sc = score
					best = {"pos": pos, "fd": fd, "sd": sd, "dist": d, "el": el, "wpx": wpx}
	if best.is_empty():
		print("ROUTECAM %s %s: no over-the-shoulder camera found" % [who, act])
		return {"found": false}
	_look(best["pos"], look, 45.0)
	print("ROUTECAM %s %s (computer): dist %.2f el %.0f screen facing %.2f, %.0f px wide (%.0f%% of frame), face %.2f" % [who, act, best["dist"], best["el"], best["sd"], best["wpx"], 100.0 * float(best["wpx"]) / vs.x, best["fd"]])
	return {"found": true, "face_dot": best["fd"], "screen_dot": best["sd"], "dist_m": best["dist"], "elev_deg": best["el"], "screen_px": best["wpx"]}

func _route_cam(act: String) -> Dictionary:
	if act == "internet" or act == "games":
		# 側後方近拍只有在螢幕夠大（≥ 畫面寬 16%）時才用；水鈴的筆電只有 27 cm、頭又很大，拍不到那麼大 →
		# 改用一般的側面鏡頭（看得到側臉、手、鍵盤、螢幕），螢幕內容另外用畫面左上角的「螢幕特寫」顯示（game.gd _show_pc_inset）
		var rpc := _route_cam_pc(act)
		if rpc.get("found", false) and float(rpc.get("screen_px", 0.0)) >= get_viewport().get_visible_rect().size.x * 0.16:
			return rpc
	var H := _head_info()
	var hc: Vector3 = H["c"]
	var hr: float = H["r"]
	var face: Vector3 = H["face"]
	var fp := hc + face * hr * 0.8          # 臉上的一點（眼睛附近）
	var vs := get_viewport().get_visible_rect().size
	var safe := Rect2(60.0, 60.0, vs.x - 60.0 - 250.0, vs.y * 0.62 - 60.0)   # 右邊按鈕、下面題目面板以外，再往內縮
	var kp := _key_pts(act)
	kp.erase("head")
	var hands := [_bpos("lefthand"), _bpos("righthand")]
	var need_face := act != "tv"
	var screen: Node3D = null
	if act == "tv":
		screen = home.find_child("TVScreen", true, false)
	elif act == "internet" or act == "games":
		screen = home.find_child("PCScreen", true, false)
	var sn := Vector3.ZERO
	if screen:
		sn = screen.global_transform.basis.z.normalized()   # QuadMesh 正面朝自己的 +Z
		if sn.dot(hc - screen.global_position) < 0.0:
			sn = -sn
	var targets := []          # 一定要在安全區、不被擋的點
	for k in kp:
		targets.append(kp[k])
	if need_face:
		targets.append(fp)
	var frame_pts := targets + hands + [hc]   # 要在安全區裡（手、頭可以被道具擋到一點）
	var c := Vector3.ZERO
	for q: Vector3 in frame_pts:
		c += q
	c /= maxf(frame_pts.size(), 1)
	var boxes := _room_boxes()
	var best := {}
	var best_sc := -1e9
	var rej := {"y": 0, "inbox": 0, "face": 0, "screen": 0, "frame": 0, "head": 0, "box": 0, "ok": 0}
	var rej_box := {}
	var rej_frame := {}
	var fov := 52.0 if act == "tv" else 45.0
	for d: float in ([2.2, 2.8, 3.4, 4.0, 4.8] if act == "tv" else [1.3, 1.6, 2.0, 2.5, 3.1, 3.8]):
		for el in [8.0, 14.0, 20.0, 27.0]:
			for azi in 24:
				var az := deg_to_rad(azi * 15.0)
				var dir := Vector3(cos(az) * cos(deg_to_rad(el)), sin(deg_to_rad(el)), sin(az) * cos(deg_to_rad(el)))
				var pos := c + dir * d
				if pos.y < 0.2 or pos.y > 1.9:
					rej["y"] += 1
					continue
				var bad := false
				for bx: AABB in boxes:
					if bx.grow(0.06).has_point(pos):
						bad = true
						break
				if bad:
					rej["inbox"] += 1
					continue
				var fd: float = (pos - fp).normalized().dot(face)
				if need_face and fd < (-0.36 if screen else (0.02 if act == "english" else 0.2)):   # 用電腦：螢幕正面朝著角色，鏡頭要同時看到螢幕和臉 → 只能從側面（側臉）
					rej["face"] += 1
					continue
				var sd := 1.0
				if screen:
					sd = (pos - screen.global_position).normalized().dot(sn)
					if sd < (0.34 if need_face else 0.3):
						rej["screen"] += 1
						continue
				_look(pos, c, fov)
				for q: Vector3 in frame_pts:
					if cam.is_position_behind(q) or not safe.has_point(cam.unproject_position(q)):
						bad = true
						break
				if bad:
					rej["frame"] += 1
					continue
				for q: Vector3 in targets:
					# 不能被自己的頭擋住（臉那一點本來就在頭上，不算）
					if q != fp and _seg_pt(pos, q, hc) < hr * 0.92 and pos.distance_to(hc) < pos.distance_to(q):
						bad = true
						break
					for bx: AABB in boxes:
						if bx.grow(0.03).has_point(q):
							continue
						if _seg_box(pos, q + (pos - q).normalized() * 0.02, bx):
							bad = true
							var bk := "%s %s" % [bx.position.snapped(Vector3.ONE * 0.01), bx.size.snapped(Vector3.ONE * 0.01)]
							rej_box[bk] = int(rej_box.get(bk, 0)) + 1
							break
					if bad:
						break
				if bad:
					rej["box"] += 1
					continue
				rej["ok"] += 1
				var sc: float = (fd if need_face else 0.5) + 0.6 * sd - 0.12 * absf(d - (3.0 if act == "tv" else 1.9)) - 0.006 * el
				if sc > best_sc:
					best_sc = sc
					best = {"pos": pos, "fd": fd, "sd": sd, "dist": d, "el": el}
	print("ROUTECAM rej ", rej, " boxes ", rej_box)
	if best.is_empty():
		print("ROUTECAM %s %s: none found, keeping the check-sheet camera" % [who, act])
		return {"found": false}
	_look(best["pos"], c, fov)
	print("ROUTECAM %s %s: dist %.1f el %.0f face %.2f screen %.2f" % [who, act, best["dist"], best["el"], best["fd"], best["sd"]])
	return {"found": true, "face_dot": best["fd"], "screen_dot": best["sd"], "dist_m": best["dist"], "elev_deg": best["el"]}

func _bones() -> Array:
	var arr := []
	for i in sk.get_bone_count():
		var p := sk.get_bone_pose_position(i)
		var q := sk.get_bone_pose_rotation(i)
		var s := sk.get_bone_pose_scale(i)
		arr.append([p.x, p.y, p.z, q.x, q.y, q.z, q.w, s.x, s.y, s.z])
	return arr

func _xfa(t: Transform3D) -> Array:
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

func _clean(m: Dictionary) -> Dictionary:
	var o := {}
	for k in m:
		var v = m[k]
		if typeof(v) in [TYPE_FLOAT, TYPE_INT, TYPE_BOOL, TYPE_STRING]:
			o[k] = v
	return o

func _capture(shot: String, m: Dictionary) -> Dictionary:
	var d := {"ken": _xfa(ken.global_transform), "bones": _bones(), "cam": _xfa(cam.global_transform), "fov": cam.fov,
		"props": [], "nodes": {}, "skirt": [], "skirt_gap": 0.003, "metrics": _clean(m)}
	for path in home_def:
		var n := home.get_node_or_null(path) as Node3D
		if n == null:
			continue
		var def: Array = home_def[path]
		if n.visible != bool(def[0]) or not n.transform.is_equal_approx(def[1]):
			d["nodes"][path] = {"visible": n.visible, "xf": _xfa(n.transform)}
	var i := 0
	for p in props:
		var ba := p as BoneAttachment3D
		if ba == null or ba.get_child_count() == 0:
			continue
		var child: Node3D = ba.get_child(0)
		var nm := "%s_%s_%d" % [who, shot, i]
		_save_prop(child, nm)
		d["props"].append({"bone": ba.bone_name, "scene": "%s/%s.tscn" % [OUT_DIR, nm], "xf": _xfa(child.transform)})
		i += 1
	if not baked.is_empty() and not skirt_args.is_empty():
		for bx in skirt_args[0]:
			var ab: AABB = bx[0]
			var nn: Vector3 = bx[1]
			d["skirt"].append([ab.position.x, ab.position.y, ab.position.z, ab.size.x, ab.size.y, ab.size.z, nn.x, nn.y, nn.z])
		d["skirt_gap"] = skirt_args[1]
	# 重點物件（遊戲 HUD 檢查用）在這個鏡頭的畫面位置
	var kp := _key_pts(act_of(shot))
	var scr := {}
	for k in kp:
		var sp := cam.unproject_position(kp[k])
		scr[k] = [sp.x, sp.y]
	d["key_screen"] = scr
	return d

func act_of(shot: String) -> String:
	for a in SHOT_KEY:
		if SHOT_KEY[a] == shot:
			return a
	return ""

# ───────── 棒球：揮棒表格（mascot_motion build_pbat6 要算 3–4 分鐘）算好存起來，遊戲直接讀 ─────────
## 做法：照 mascot_motion_check._o_baseball() 跑一次（設定、建表、整段量測都是它做的），再把 ActMotion 裡和棒球有關的變數整包存下來。
## 存成 data/interior/<who>_baseball.json（{"vars": var_to_str(...)}；.json 才會被網頁匯出帶進去）。
const BB_VARS := ["bat_len", "bat_knob", "bat_handle", "bat_taper", "bat_r0", "bat_r1", "bat_hand_off", "bat_corr", "arm_dir", "arm_mag", "left_on_bat",
	"pbat", "pb_reach", "pb_tab", "pb_keys", "pb_jit", "pb_local", "pb_hands", "pb_tc", "palm_off", "pb_stretch", "pb_curl", "pb_open_stretched",
	"pb6_keys", "pb6_bend", "pb6_report", "_pb6_star", "pb6_follow", "_pb6_B0", "pb6_rel", "bb", "bat_xf", "run_v", "run_anim", "run_dist"]

func _bake_baseball() -> void:
	await _outdoor_scene()
	mode = "outdoor"
	await _o_baseball()
	var d := {}
	for k in BB_VARS:
		var v = am.get(k)
		if v == null:
			print("BASEBALL var missing: ", k)
			continue
		d[k] = v
	d["model_base_y"] = am.model_base.origin.y
	var txt := var_to_str(d)
	_write("%s/%s_baseball.json" % [OUT_DIR, who], {"note": "mascot_bake.gd PART=baseball：mascot_motion 的揮棒表格（v6）。遊戲 _start_act 讀進來就不用重算。", "who": who,
		"t_contact": am.bb["t_c"], "rows": am.pb_tab.size(), "sweep": metrics.get("baseball_sweep", {}), "vars": txt})
	print("BASEBALL baked rows=%d t_c=%.4f bytes=%d" % [am.pb_tab.size(), float(am.bb["t_c"]), txt.length()])

# ───────── 戶外：動作＋貼地位移＋耳機 ─────────
func _bake_outdoor() -> void:
	await _outdoor_scene()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(ANIM_DIR))
	var o := {"model": MODELS[who][0], "height": MODELS[who][1], "anims": [], "anim_ground": {}}
	for an in ap.get_animation_list():
		var s := String(an)
		if s.begins_with("ft/"):
			ResourceSaver.save(ap.get_animation(an), "%s/%s_%s.res" % [ANIM_DIR, who, s.substr(3)])
			o["anims"].append(s)
		elif s == "idle":
			ResourceSaver.save(ap.get_animation(an), "%s/%s_idle.res" % [ANIM_DIR, who])
			o["anims"].append(s)
		if s.begins_with("ft/") or s == "idle":
			o["anim_ground"][s] = am.ground_offset(s, s == "ft/jogging")
			print("GROUND %s %.2f cm" % [s, float(o["anim_ground"][s]) * 100.0])
	await _clear_out()
	await _o_music()
	o["stand_headphones"] = hp_cap
	_write("%s/%s_outdoor.json" % [OUT_DIR, who], o)
