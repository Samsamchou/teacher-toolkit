extends RefCounted
## [routes] 圳寶路線：媽媽騎機車載圳寶（圳寶坐後座、戴安全帽）。
##
## 模型（Tripo，2026-11-11）：assets/models/scooter_A.glb（機車，一整塊網格、輪子沒分開、龍頭是歪的、中柱放下）、
## assets/models/zunbo_mom_rigged.glb（圳寶媽媽，65 根 mixamorig 骨頭、A-pose、兩手張開、沒有內建動作）。
## 換模型只要改 build_scooter_rig() 這一個函式，回傳同樣欄位的 Dictionary；
## 坐上去、輪子轉、貼地、安全帽、停車、量測都只讀那個 Dictionary。
##
## 機車網格在載入時用程式處理（不改 GLB 檔）：
##   1. 龍頭轉正（模型的龍頭向左轉了約 23°，直線前進時不合理）：把車頭上半部繞轉向軸轉回來，交界處平滑過渡
##   2. 兩個輪子的三角形挖掉 → 同位置放程式做的輪子（深色輪胎＋銀色輪框＋輻條），照前進距離轉、輪底貼路面
##   3. 中柱（停車架）的三角形挖掉：騎車時中柱是收起來的
## 騎乘姿勢（媽媽、圳寶、安全帽）由 scripts/scooter_bake.gd 算好存在 data/scooter_ride.json，遊戲直接套（不用帶 FBX、iPad 不用即時 IK）。
##
## 座標：frame（角色節點）＝ +Z 前進方向、+X 角色左邊、+Y 上；rig 自己的 y=0 是兩輪最低點那個平面。
## 規則（老師 11/10）：輪子貼路面、照前進距離轉；騎士坐著（屁股接觸坐墊，用網格量）；安全帽照圳寶的頭量出來、0 穿模。

const Retarget := preload("res://scripts/retarget.gd")
const Pose := preload("res://scripts/procedural_pose.gd")
const RIDE_JSON := "res://data/scooter_ride.json"
static var SCALE := 1.45      # 機車模型單位 → 公尺：軸距 0.707 → 1.20 m、輪徑 0.425 m、全長 1.67 m、把手高 1.04 m（100–125cc 速克達）
static var MOM_H := 1.65
const ZUNBO_MODEL := "zunbo_openhand"
# 機車模型座標（單位：模型自己的）：+X 車尾、-X 車頭、+Y 上；輪心 x、半徑（用輪底那段弧擬合：前 (-0.3623, 0.1249) r 0.120、後 (0.3449, 0.1274) r 0.122 → 取 0.125 讓輪底在 y=0）
const WHEEL_X := [-0.3623, 0.3449]
const WHEEL_R := 0.125
const TYRE_HALF_W := 0.046
const STAND_BOX := [0.0, 0.13, 0.105]   # 中柱：x 0.0～0.13、y < 0.105
const HEAD_Y0 := 0.49                    # 這個高度以上的車頭（x < 0.02）是轉向的部分
const HEAD_Y1 := 0.55

var am                      # mascot_motion.gd（圳寶）
var world                   # world.gd（fit_model、描邊）
var R := {}                 # build_scooter_rig() 的結果
var root: Node3D
var dist := 0.0
var phi := 0.0
var seated := Transform3D.IDENTITY   # 圳寶模型在 rig 座標裡的位置
var seat_pose: Array = []
var helmet: Node3D
var helmet_mesh: MeshInstance3D
var helmet_ba: BoneAttachment3D
var rep := {}
var ride := {}              # data/scooter_ride.json

# ═════════ ★ 換模型只改這裡 ★ ═════════
## 回傳：
##   root         Node3D，原點在兩輪最低點平面、車身中心線上，+Z＝車頭
##   wheels       [前輪, 後輪] Node3D（繞自己的 X 軸轉）
##   wheel_r      輪半徑（m）；wheel_z＝[前輪 z, 後輪 z]
##   body_pts     車身網格頂點（rig 座標；量坐墊、腳踏板高度用）
##   grips        {"left": Vector3, "right": Vector3} 握把中心；grip_r＝握把半徑；grip_axis＝握把軸方向
##   seat_z_front／seat_z_back  坐墊前後範圍；seat_half_w 坐墊半寬
##   mom／mom_sk  前座騎士模型與骨架
##   placeholder  是不是替代模型
static func build_scooter_rig(mk, w) -> Dictionary:
	var root := Node3D.new()
	root.name = "ScooterRig"
	var body: Node3D = w.fit_model("scooter_A", 0.97995 * SCALE, true, 0.3)
	body.name = "ScooterBody"
	body.transform = Transform3D(Basis(Vector3.UP, PI / 2.0), Vector3.ZERO)   # 模型 -X（車頭）→ rig +Z
	root.add_child(body)
	var mi: MeshInstance3D = Retarget.find_type(body, "MeshInstance3D")
	var info := _prep_mesh(mi)
	# 模型座標 → rig 座標
	var M2R := Transform3D.IDENTITY
	var n: Node = mi
	while n != root:
		M2R = (n as Node3D).transform * M2R
		n = n.get_parent()
	var pts := PackedVector3Array()
	for v: Vector3 in info["verts"]:
		pts.append(M2R * v)
	var r := WHEEL_R * SCALE
	var wheels := []
	var wz := []
	for k in 2:
		var c: Vector3 = M2R * Vector3(WHEEL_X[k], WHEEL_R, 0.0)
		var wn := Node3D.new()
		wn.name = "Wheel%d" % k
		wn.position = Vector3(0, r, c.z)
		root.add_child(wn)
		var tw := TYRE_HALF_W * 2.0 * SCALE
		var tire: MeshInstance3D = mk.prim(wn, mk.cyl(r, r, tw * 0.72), Vector3.ZERO, "#26262c", Vector3(0, 0, PI / 2), 0.006)
		tire.name = "Tyre"
		var to := TorusMesh.new()   # 胎肩圓角
		to.inner_radius = r - tw * 0.5
		to.outer_radius = r
		mk.prim(wn, to, Vector3.ZERO, "#26262c", Vector3(0, 0, PI / 2), 0.0)
		mk.prim(wn, mk.cyl(r * 0.6, r * 0.6, tw * 0.78), Vector3.ZERO, "#ced4da", Vector3(0, 0, PI / 2), 0.0)   # 銀色輪框
		mk.prim(wn, mk.cyl(r * 0.2, r * 0.2, tw * 0.86), Vector3.ZERO, "#868e96", Vector3(0, 0, PI / 2), 0.0)   # 輪軸
		for j in 5:   # 五條輻條：看得出輪子在轉
			var sp: MeshInstance3D = mk.prim(wn, _box(Vector3(tw * 0.8, r * 0.56, r * 0.1)), Vector3.ZERO, "#adb5bd", Vector3.ZERO, 0.0)
			sp.transform = Transform3D(Basis(Vector3.RIGHT, j * TAU / 5.0), Vector3.ZERO) * Transform3D(Basis.IDENTITY, Vector3(0, r * 0.3, 0))
		wheels.append(wn)
		wz.append(c.z)
	# 握把（龍頭轉正後）：把手高度那一段、左右最外面 18% 的頂點
	var gl := Vector3.ZERO
	var gr := Vector3.ZERO
	var nl := 0
	var nr := 0
	var xm := 0.0
	for p in pts:
		if p.y > 0.57 * SCALE and p.y < 0.66 * SCALE and p.z > 0.0:
			xm = maxf(xm, absf(p.x))
	var gpl := PackedVector3Array()
	var gpr := PackedVector3Array()
	for p in pts:
		if p.y > 0.57 * SCALE and p.y < 0.66 * SCALE and p.z > 0.0 and absf(p.x) > xm * 0.76:
			if p.x > 0.0:
				gl += p
				nl += 1
				gpl.append(p)
			else:
				gr += p
				nr += 1
				gpr.append(p)
	gl /= maxf(nl, 1)
	gr /= maxf(nr, 1)
	var grr := 0.0   # 握把半徑＝頂點離軸（左右握把中心連線方向）的平均距離
	var ax := (gl - gr).normalized()
	for sd in ["left", "right"]:
		var c2: Vector3 = gl if sd == "left" else gr
		for p: Vector3 in (gpl if sd == "left" else gpr):
			var d := p - c2
			grr += (d - ax * d.dot(ax)).length()
	grr /= maxf(nl + nr, 1)
	# 握把那一段還有煞車拉桿、把手尾端 → 只取離軸比平均近的頂點再平均一次＝握把本身的半徑
	var g2 := 0.0
	var n2 := 0
	for sd in ["left", "right"]:
		var c3: Vector3 = gl if sd == "left" else gr
		for p: Vector3 in (gpl if sd == "left" else gpr):
			var d2 := p - c3
			var rr := (d2 - ax * d2.dot(ax)).length()
			if rr < grr:
				g2 += rr
				n2 += 1
	if n2 > 0:
		grr = g2 / n2
	# 後扶手（坐墊後面那圈黑色的桿子）：坐墊頂面以上、坐墊後 1/4 以後的車身頂點
	var seat_back_z: float = (M2R * Vector3(0.40, 0, 0)).z
	var seat_front_z: float = (M2R * Vector3(-0.02, 0, 0)).z
	var rail_z := -9.0
	var rail_top := 0.0
	var rail_pts := PackedVector3Array()
	for p in pts:
		if p.y > 0.515 * SCALE and p.z < lerpf(seat_front_z, seat_back_z, 0.75):
			rail_z = maxf(rail_z, p.z)
			rail_top = maxf(rail_top, p.y)
			rail_pts.append(p)
	# 媽媽
	var mom: Node3D = w.fit_model("zunbo_mom_rigged", MOM_H, true, 0.3)
	mom.name = "Mom"
	root.add_child(mom)
	var msk: Skeleton3D = Retarget.find_type(mom, "Skeleton3D")
	var map: AnimationPlayer = Retarget.find_type(mom, "AnimationPlayer")
	if map:
		map.stop()
		map.active = false
	Pose.thin_hand_outline(mom, 0.25)
	return {"root": root, "wheels": wheels, "wheel_r": r, "wheel_z": wz, "body_pts": pts, "grips": {"left": gl, "right": gr}, "grip_r": grr, "grip_axis": ax,
		"seat_z_front": (M2R * Vector3(-0.02, 0, 0)).z, "seat_z_back": (M2R * Vector3(0.40, 0, 0)).z, "seat_half_w": 0.105 * SCALE, "rail_front_z": rail_z, "rail_top_y": rail_top, "rail_pts": rail_pts,
		"mom": mom, "mom_sk": msk, "body": body, "mesh_info": info, "placeholder": false}

## 機車網格：龍頭轉正、挖掉輪子和中柱（回傳處理後的頂點＋做了什麼）
static func _prep_mesh(mi: MeshInstance3D) -> Dictionary:
	var mesh := mi.mesh
	var arr := mesh.surface_get_arrays(0)
	var V: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var N: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
	var I: PackedInt32Array = arr[Mesh.ARRAY_INDEX]
	# 1. 龍頭方向（把手高度那一段頂點在水平面上的主軸）
	var c := Vector2.ZERO
	var cnt := 0
	for v in V:
		if v.x < 0.05 and v.y > 0.57 and v.y < 0.70:
			c += Vector2(v.x, v.z)
			cnt += 1
	c /= maxf(cnt, 1)
	var sxx := 0.0
	var szz := 0.0
	var sxz := 0.0
	for v in V:
		if v.x < 0.05 and v.y > 0.57 and v.y < 0.70:
			var d := Vector2(v.x, v.z) - c
			sxx += d.x * d.x
			szz += d.y * d.y
			sxz += d.x * d.y
	var ang := 0.5 * atan2(2.0 * sxz, sxx - szz)        # 主軸和 +X 的夾角
	var dir := Vector2(cos(ang), sin(ang))
	if dir.y < 0.0:
		dir = -dir
	var th := atan2(-dir.x, dir.y)                       # 繞 Y 轉 th 之後主軸＝ +Z（左右方向）
	var twisted := 0
	for i in V.size():
		var v := V[i]
		if v.x < 0.02 and v.y > HEAD_Y0:
			var wgt := smoothstep(HEAD_Y0, HEAD_Y1, v.y)
			var a := th * wgt
			var dx := v.x - c.x
			var dz := v.z - c.y
			V[i] = Vector3(c.x + dx * cos(a) + dz * sin(a), v.y, c.y - dx * sin(a) + dz * cos(a) - c.y * wgt)   # 順便把龍頭中心移回中線
			if i < N.size():
				var nn := N[i]
				N[i] = Vector3(nn.x * cos(a) + nn.z * sin(a), nn.y, -nn.x * sin(a) + nn.z * cos(a))
			twisted += 1
	# 2、3. 挖掉輪子、中柱的三角形（三個頂點都在範圍裡才挖）
	var keep := PackedInt32Array()
	var cut_w := 0
	var cut_s := 0
	var t := 0
	while t + 2 < I.size():
		var in_w := true
		var in_s := true
		for k in 3:
			var v: Vector3 = V[I[t + k]]
			var w_ok := false
			for wi in 2:
				if Vector2(v.x - float(WHEEL_X[wi]), v.y - WHEEL_R).length() < WHEEL_R * 1.045 and absf(v.z) < TYRE_HALF_W + 0.008:
					w_ok = true
			in_w = in_w and w_ok
			in_s = in_s and (v.x > float(STAND_BOX[0]) and v.x < float(STAND_BOX[1]) and v.y < float(STAND_BOX[2]))
		if in_w:
			cut_w += 1
		elif in_s:
			cut_s += 1
		else:
			keep.append(I[t])
			keep.append(I[t + 1])
			keep.append(I[t + 2])
		t += 3
	arr[Mesh.ARRAY_VERTEX] = V
	arr[Mesh.ARRAY_NORMAL] = N
	arr[Mesh.ARRAY_INDEX] = keep
	var nm := ArrayMesh.new()
	nm.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	nm.surface_set_material(0, mesh.surface_get_material(0))
	mi.mesh = nm
	return {"verts": V, "handlebar_turn_deg": rad_to_deg(th), "head_verts_turned": twisted, "wheel_tris_cut": cut_w, "stand_tris_cut": cut_s, "tris_kept": keep.size() / 3}

static func _box(s: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = s
	return b

static func _dome() -> SphereMesh:   # 半徑 1 的半球（y 0..1），用 scale 變成橢球殼
	var s := SphereMesh.new()
	s.radius = 1.0
	s.height = 1.0
	s.is_hemisphere = true
	s.radial_segments = 32
	s.rings = 12
	return s

static func xfa(t: Transform3D) -> Array:
	var b := t.basis
	return [b.x.x, b.x.y, b.x.z, b.y.x, b.y.y, b.y.z, b.z.x, b.z.y, b.z.z, t.origin.x, t.origin.y, t.origin.z]

static func axf(a: Array) -> Transform3D:
	return Transform3D(Basis(Vector3(a[0], a[1], a[2]), Vector3(a[3], a[4], a[5]), Vector3(a[6], a[7], a[8])), Vector3(a[9], a[10], a[11]))

static func bones_of(sk: Skeleton3D) -> Array:
	var arr := []
	for i in sk.get_bone_count():
		var p := sk.get_bone_pose_position(i)
		var q := sk.get_bone_pose_rotation(i)
		arr.append([p.x, p.y, p.z, q.x, q.y, q.z, q.w])
	return arr

static func set_bones(sk: Skeleton3D, arr: Array) -> void:
	for i in mini(arr.size(), sk.get_bone_count()):
		var b: Array = arr[i]
		sk.set_bone_pose_position(i, Vector3(b[0], b[1], b[2]))
		sk.set_bone_pose_rotation(i, Quaternion(b[3], b[4], b[5], b[6]))

func setup(p_am, p_world) -> void:
	am = p_am
	world = p_world
	if FileAccess.file_exists(RIDE_JSON):
		var d = JSON.parse_string(FileAccess.get_file_as_string(RIDE_JSON))
		if d is Dictionary:
			ride = d
			SCALE = float(d.get("scale", SCALE))
			MOM_H = float(d.get("mom_h", MOM_H))
	R = build_scooter_rig(am, world)
	root = R["root"]
	pose_mom_baked()

func pose_mom_baked() -> void:
	if not ride.has("mom"):
		return
	var mom: Node3D = R["mom"]
	set_bones(R["mom_sk"], ride["mom"]["bones"])
	mom.transform = axf(ride["mom"]["xf"])

func _detach(n: Node) -> void:
	if n and n.get_parent():
		n.get_parent().remove_child(n)

# ───────── 車身表面高度（坐墊、腳踏板）：(x, z) 附近、y 在 [y0, y1] 的車身頂點最高點 ─────────
func surface_top(x: float, z: float, y0: float, y1: float, rad := 0.045) -> float:
	var top := -1.0
	for p: Vector3 in R["body_pts"]:
		if p.y >= y0 and p.y <= y1 and absf(p.x - x) < rad and absf(p.z - z) < rad:
			top = maxf(top, p.y)
	return top

func seat_top(z: float) -> float:
	return surface_top(0.0, z, 0.40 * SCALE, 0.56 * SCALE, 0.08)

## 坐墊＋後扶手的頂面高度圖（2 cm 一格）：查 (x, z) 那一格和鄰格的最高點；沒有東西回傳 -1
var _sgrid := {}
func seat_top_at(x: float, z: float) -> float:
	if _sgrid.is_empty():
		for p: Vector3 in R["body_pts"]:
			if p.y >= 0.40 * SCALE and p.y <= 0.56 * SCALE:
				var k := Vector2i(floori(p.x / 0.02), floori(p.z / 0.02))
				_sgrid[k] = maxf(_sgrid.get(k, -1.0), p.y)
	var k0 := Vector2i(floori(x / 0.02), floori(z / 0.02))
	var top := -1.0
	for dx in [-1, 0, 1]:
		for dz in [-1, 0, 1]:
			top = maxf(top, _sgrid.get(k0 + Vector2i(dx, dz), -1.0))
	return top

func board_top(x: float, z: float) -> float:
	return surface_top(x, z, 0.08 * SCALE, 0.24 * SCALE, 0.05)

# ───────── 兩節腿 IK：腳踝到 ank_w（世界），腳掌世界方向不變（和 mascot_motion_check._lift_foot_ik 同一個算法） ─────────
static func leg_to(sk: Skeleton3D, sd: String, ank_w: Vector3) -> void:
	var iu := Retarget._idx(sk, sd + "upleg")
	var il := Retarget._idx(sk, sd + "leg")
	var iff := Retarget._idx(sk, sd + "foot")
	var up := sk.get_bone_global_pose(iu)
	var lg := sk.get_bone_global_pose(il)
	var ft := sk.get_bone_global_pose(iff)
	var H := up.origin
	var K := lg.origin
	var Aa := ft.origin
	var At := sk.global_transform.affine_inverse() * ank_w
	var E := Pose._elbow(H, At, H.distance_to(K), K.distance_to(Aa), K - (H + Aa) * 0.5)
	var Bf := ft.basis.orthonormalized()
	var Bu2 := (Pose._arc(K - H, E - H) * up.basis.orthonormalized()).orthonormalized()
	var pu := sk.get_bone_parent(iu)
	var pb := sk.get_bone_global_pose(pu).basis.orthonormalized() if pu >= 0 else Basis.IDENTITY
	sk.set_bone_pose_rotation(iu, (pb.inverse() * Bu2).get_rotation_quaternion())
	var Bl := (Bu2 * Basis(sk.get_bone_pose_rotation(il))).orthonormalized()
	var cur := Bl * sk.get_bone_pose_position(iff)
	var Bl2 := (Pose._arc(cur, At - E) * Bl).orthonormalized()
	sk.set_bone_pose_rotation(il, (Bu2.inverse() * Bl2).get_rotation_quaternion())
	sk.set_bone_pose_rotation(iff, (Bl2.inverse() * Bf).get_rotation_quaternion())

## 蒙皮頂點（rig 座標）
func pts_of(sk: Skeleton3D, keys: Array) -> PackedVector3Array:
	var inv := root.global_transform.affine_inverse()
	var out := PackedVector3Array()
	for it in Pose._hp_skinned(sk, "", keys):
		for q: Vector3 in (it[1] as PackedVector3Array):
			out.append(inv * q)
	return out

# ───────── 量媽媽（姿勢套好的網格）：手到握把、鞋底到腳踏板、屁股到坐墊 ─────────
func measure_mom() -> Dictionary:
	var out := {}
	var msk: Skeleton3D = R["mom_sk"]
	var ax: Vector3 = R["grip_axis"]
	var gr: float = R["grip_r"]
	for sd in ["left", "right"]:
		var G: Vector3 = R["grips"][sd]
		var m := 9.0
		var inside := 0
		for p in pts_of(msk, [sd + "hand"]):
			var d := p - G
			var along := clampf(d.dot(ax), -0.07, 0.07)
			var rad := (d - ax * along).length() - gr
			m = minf(m, rad)
			if rad < -0.004:
				inside += 1
		out["mom_hand_%s_grip_gap_cm" % sd] = m * 100.0
		out["mom_hand_%s_in_grip" % sd] = inside
		var low := 9.0
		for p in pts_of(msk, [sd + "foot", sd + "toe"]):
			var bt := board_top(p.x, p.z)
			if bt > 0.0:
				low = minf(low, p.y - bt)
		out["mom_foot_%s_board_gap_cm" % sd] = low * 100.0 if low < 8.0 else -99.0
	var sl := 9.0
	var hz: float = (root.global_transform.affine_inverse() * (msk.global_transform * msk.get_bone_global_pose(Retarget._idx(msk, "hips")).origin)).z
	for p in pts_of(msk, ["hips", "leftupleg", "rightupleg"]):   # 臀關節前後 ±12 cm、坐墊寬度內
		if absf(p.x) < 0.16 and absf(p.z - hz) < 0.12:
			var st := seat_top(p.z)
			if st > 0.0:
				sl = minf(sl, p.y - st)
	out["mom_seat_gap_cm"] = sl * 100.0 if sl < 8.0 else -99.0
	return out

## 量圳寶：屁股（含大腿、小腿、靴子）最低點到坐墊、身體到媽媽最近、手到媽媽的腰最近
func measure_zunbo() -> Dictionary:
	var out := {}
	var inv: Transform3D = root.global_transform.affine_inverse() * am.frame.global_transform
	var sl := 9.0   # 下半身每個頂點到它正下方的坐墊／後扶手頂面，取最小（負＝陷進去）
	var below := 0
	for q in am.mesh_pts(["hips", "leftupleg", "rightupleg", "leftleg", "rightleg", "leftfoot", "rightfoot", "lefttoe", "righttoe"]):
		var p: Vector3 = inv * q
		var st := seat_top_at(p.x, p.z)
		if st > 0.0:
			sl = minf(sl, p.y - st)
			if p.y - st < -0.004:
				below += 1
	out["seat_bottom_gap_cm"] = sl * 100.0 if sl < 8.0 else -99.0
	out["zunbo_pts_in_seat_or_rail"] = below
	var mom_pts := pts_of(R["mom_sk"], ["hips", "spine", "neck", "head", "left", "right"])
	var mb := 9.0   # 媽媽最後面（z 最小）的點
	for p in mom_pts:
		mb = minf(mb, p.z)
	var zf := -9.0
	for q in am.mesh_pts(["hips", "spine", "neck", "head", "left", "right"]):
		var p2: Vector3 = inv * q
		if p2.y > seat_top(p2.z) + 0.02:
			zf = maxf(zf, p2.z)
	out["passenger_front_minus_rider_back_cm"] = (zf - mb) * 100.0   # 負＝圳寶整個在媽媽背後、沒有重疊
	for sd in ["left", "right"]:   # 手扶著的東西：媽媽的身體或後扶手，取近的
		var m := 9.0
		var m2 := 9.0
		for q in am.mesh_pts([sd + "hand"]):
			var p3: Vector3 = inv * q
			for mp in mom_pts:
				m = minf(m, p3.distance_to(mp))
			for rp: Vector3 in R["rail_pts"]:
				m2 = minf(m2, p3.distance_to(rp))
		out["zunbo_hand_%s_hold_gap_cm" % sd] = minf(m, m2) * 100.0
		out["zunbo_hand_%s_holds" % sd] = "mom" if m <= m2 else "rear rail"
	return out

# ───────── 上車：rig 掛到角色節點、圳寶坐後座（烤好的姿勢）、戴安全帽 ─────────
func mount(frame_node: Node3D) -> void:
	_detach(root)
	frame_node.add_child(root)
	root.transform = Transform3D.IDENTITY
	root.visible = true
	dist = 0.0
	_ground_rig()
	am.anim.stop()
	if ride.has("zunbo"):
		set_bones(am.sk, ride["zunbo"]["bones"])
		seated = axf(ride["zunbo"]["xf"])
		seat_pose = am.save_pose()
		(am.model as Node3D).transform = root.transform * seated
		_put_helmet(ride["helmet"], axf(ride["helmet"]["xf"]))
	update(0.0)

## 兩輪各自貼地（路面高低不同時車身前後傾一點）
func _ground_rig() -> void:
	var zf: float = R["wheel_z"][0]
	var zr: float = R["wheel_z"][1]
	var gf: float = am.g(Vector3(0, 0, zf))
	var gr: float = am.g(Vector3(0, 0, zr))
	var pitch := atan2(gf - gr, zf - zr)
	root.transform = Transform3D(Basis.IDENTITY, Vector3(0, gr, zr)) * Transform3D(Basis(Vector3.RIGHT, -pitch), Vector3.ZERO) * Transform3D(Basis.IDENTITY, Vector3(0, 0, -zr))

# ───────── 安全帽：照圳寶的頭（頭骨權重的頂點）量，橢球殼把帽緣以上整個包住＋4 mm ─────────
func _clear_helmet() -> void:
	if helmet:
		_detach(helmet)
		helmet.queue_free()
		helmet = null
	if helmet_ba:
		helmet_ba.queue_free()
		helmet_ba = null

# 帽子＝光滑的圓殼：從帽緣中心往每個方向量頭的頂點最遠多遠 → 往外平滑成圓滑的包絡面 → 再加 5 mm。
# 帽緣不是平的：兩側（耳罩那一圈）抬高，耳罩露在外面（不會頂穿帽子）；前面抬高一點露出額頭和眼睛；後面蓋到後腦。
const HU := 48   # 方位角 48 格（7.5°）；0＝角色左邊（+X）、12＝正前方（+Z）
const HT := 10   # 從帽緣（t=0）到頭頂（t=HT）
var helmet_def := {}   # {"grid": [HT+1][HU] 半徑, "elmin": [HU] 帽緣仰角（rad）, "strap": [[左側下巴帶的點…], [右側…]], "xf"}

func _elmin(az: float) -> float:
	var e: Array = helmet_def["elmin"]
	var f: float = fposmod(az, TAU) / TAU * HU
	var u0 := int(floor(f)) % HU
	return lerpf(float(e[u0]), float(e[(u0 + 1) % HU]), f - floor(f))

func _hpos(u: int, t: int, extra := 0.0) -> Vector3:
	var az := TAU * float(u) / HU
	var e0 := float(helmet_def["elmin"][u])
	var el := e0 + (PI / 2.0 - e0) * float(t) / HT
	return Vector3(cos(el) * cos(az), sin(el), cos(el) * sin(az)) * (float(helmet_def["grid"][t][u]) + extra)

## 帽子內面在方向 d 的半徑（格點之間雙線性內插）；這個方向不在帽子範圍（帽緣以下）回傳 0
func helmet_r(d: Vector3) -> float:
	var l := d.length()
	if l < 1e-6 or helmet_def.is_empty():
		return 0.0
	var el := asin(clampf(d.y / l, -1.0, 1.0))
	var az := fposmod(atan2(d.z, d.x), TAU)
	var e0 := _elmin(az)
	if el < e0:
		return 0.0
	var fu: float = az / TAU * HU
	var ft: float = (el - e0) / maxf(PI / 2.0 - e0, 1e-4) * HT
	var u0 := int(floor(fu)) % HU
	var u1 := (u0 + 1) % HU
	var t0 := mini(int(floor(ft)), HT - 1)
	var tu: float = fu - floor(fu)
	var tt: float = clampf(ft - t0, 0.0, 1.0)
	var g: Array = helmet_def["grid"]
	var a := lerpf(float(g[t0][u0]), float(g[t0][u1]), tu)
	var b := lerpf(float(g[t0 + 1][u0]), float(g[t0 + 1][u1]), tu)
	return lerpf(a, b, tt)

func _surf(verts: Array, idx: Array, col: String) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(0)
	for v in verts:
		st.add_vertex(v)
	for i in idx:
		st.add_index(i)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m: StandardMaterial3D = am.mat(col)
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = m
	return mi

func _make_helmet(H: Dictionary) -> Node3D:
	helmet_def = H
	var h := Node3D.new()
	h.name = "ZunboHelmet"
	# 殼（橘色）
	var verts := []
	var idx := []
	for t in HT + 1:
		for u in HU:
			verts.append(_hpos(u, t))
	for t in HT:
		for u in HU:
			var u1 := (u + 1) % HU
			var i00 := t * HU + u
			var i10 := t * HU + u1
			var i01 := (t + 1) * HU + u
			var i11 := (t + 1) * HU + u1
			idx.append_array([i00, i01, i11, i00, i11, i10])
	helmet_mesh = _surf(verts, idx, "#f28c28")
	helmet_mesh.name = "Shell"
	h.add_child(helmet_mesh)
	# 奶油色條紋：從前面帽緣過頭頂到後面帽緣（在殼外 2 mm）
	var sv := []
	var si := []
	var ef := _elmin(PI / 2.0)
	var eb := _elmin(PI * 1.5)
	var n := 24
	for k in n + 1:
		var e := lerpf(ef, PI - eb, float(k) / n)
		var c := Vector3(0, sin(e), cos(e))
		for sgn in [1.0, -1.0]:
			var d := (c + Vector3(sgn * 0.16, 0, 0)).normalized()
			sv.append(d * (helmet_r(d) + 0.002))
	for k in n:
		si.append_array([k * 2, k * 2 + 1, k * 2 + 3, k * 2, k * 2 + 3, k * 2 + 2])
	var stripe := _surf(sv, si, "#fff3d6")
	stripe.name = "Stripe"
	h.add_child(stripe)
	# 帽緣一圈藍綠色滾邊（在殼外）
	for u in HU:
		am.tube(h, _hpos(u, 0, 0.004), _hpos((u + 1) % HU, 0, 0.004), 0.009, "#2a7f78", 0.0)
	# 短帽舌（前面 ±33°，往前伸 5 cm、微微往下）
	var vv := []
	var vi := []
	var cols := 0
	for u in range(HU / 4 - 5, HU / 4 + 6):
		var inner := _hpos(u, 0, 0.004)
		var out := Vector3(inner.x, 0, inner.z).normalized()
		var wdt := 0.05 * (1.0 - pow(absf(float(u - HU / 4)) / 5.5, 2.0))
		vv.append(inner)
		vv.append(inner + out * wdt - Vector3(0, 0.012, 0) * (wdt / 0.05))
		cols += 1
	for k in cols - 1:
		vi.append_array([k * 2, k * 2 + 1, k * 2 + 3, k * 2, k * 2 + 3, k * 2 + 2])
	var visor := _surf(vv, vi, "#2a7f78")
	visor.name = "Visor"
	h.add_child(visor)
	# 下巴帶：兩側帽緣 → 沿著臉頰表面 → 下巴（每個點都在頭的表面外 4 mm）
	for side in H.get("strap", []):
		for k in range((side as Array).size() - 1):
			var a: Array = side[k]
			var b: Array = side[k + 1]
			am.tube(h, Vector3(a[0], a[1], a[2]), Vector3(b[0], b[1], b[2]), 0.007, "#fff3d6", 0.0)
	return h

## local＝安全帽在頭骨座標裡的位置
func _put_helmet(H: Dictionary, local: Transform3D) -> void:
	_clear_helmet()
	helmet = _make_helmet(H)
	helmet_ba = BoneAttachment3D.new()
	helmet_ba.bone_name = am.sk.get_bone_name(am.bi("head"))
	am.sk.add_child(helmet_ba)
	helmet_ba.add_child(helmet)
	helmet.transform = local

static func _blur(g: Array) -> Array:
	var o := []
	for t in HT + 1:
		var row := []
		for u in HU:
			var sm := 0.0
			var wsum := 0.0
			for dt in [-1, 0, 1]:
				var tt := clampi(t + dt, 0, HT)
				for du in [-1, 0, 1]:
					var wgt := 2.0 if (dt == 0 and du == 0) else 1.0
					sm += float(g[tt][(u + du + HU) % HU]) * wgt
					wsum += wgt
			row.append(sm / wsum)
		o.append(row)
	return o

## 量頭、做帽子（scooter_bake.gd 用；姿勢要先擺好）。回傳 helmet_def（含頭骨座標的 xf）
func fit_helmet(cut_frac := 0.5) -> Dictionary:
	var pts: PackedVector3Array = am.mesh_pts(["head"])
	var head: Vector3 = am.fpos("head")
	var up: Vector3 = (am.fpos("headtop_end") - head).normalized()
	var left: Vector3 = am.fpos("leftupleg") - am.fpos("rightupleg")
	left = (left - up * left.dot(up)).normalized()
	var fwd := left.cross(up).normalized()
	var loc := PackedVector3Array()
	var mn := Vector3(9, 9, 9)
	var mx := -mn
	for q in pts:
		var d := q - head
		var v := Vector3(d.dot(left), d.dot(up), d.dot(fwd))
		loc.append(v)
		mn = mn.min(v)
		mx = mx.max(v)
	var cut := mn.y + (mx.y - mn.y) * cut_frac
	var x0 := 9.0
	var x1 := -9.0
	var z0 := 9.0
	var z1 := -9.0
	for v in loc:
		if v.y >= cut:
			x0 = minf(x0, v.x)
			x1 = maxf(x1, v.x)
			z0 = minf(z0, v.z)
			z1 = maxf(z1, v.z)
	var cen := Vector3((x0 + x1) * 0.5, cut, (z0 + z1) * 0.5)
	# 耳罩：左右最外面 12% 的頂點 → 它們最高到仰角幾度；兩側帽緣抬到那上面 6°
	var xm := 0.0
	for v in loc:
		xm = maxf(xm, absf(v.x - cen.x))
	var el_ear := 0.0
	for v in loc:
		var d2 := v - cen
		if absf(d2.x) > xm * 0.88 and d2.length() > 1e-4:
			el_ear = maxf(el_ear, asin(clampf(d2.y / d2.length(), -1.0, 1.0)))
	var el_side := clampf(el_ear + deg_to_rad(6.0), deg_to_rad(12.0), deg_to_rad(58.0))
	var el_front := deg_to_rad(12.0)
	var el_back := deg_to_rad(-6.0)
	var elmin := []
	for u in HU:
		var az := TAU * float(u) / HU
		var ws := pow(absf(cos(az)), 3.0)
		var e := lerpf(el_front if sin(az) > 0.0 else el_back, el_side, ws)
		elmin.append(e)
	for it in 2:   # 帽緣線本身也平滑
		var e2 := []
		for u in HU:
			e2.append((float(elmin[(u + HU - 1) % HU]) + 2.0 * float(elmin[u]) + float(elmin[(u + 1) % HU])) * 0.25)
		elmin = e2
	helmet_def = {"elmin": elmin, "grid": []}
	var raw := []
	for t in HT + 1:
		var row := []
		row.resize(HU)
		row.fill(0.0)
		raw.append(row)
	for v3 in loc:
		var d := v3 - cen
		var l := d.length()
		if l < 1e-5:
			continue
		var el := asin(clampf(d.y / l, -1.0, 1.0))
		var az := fposmod(atan2(d.z, d.x), TAU)
		var e0 := _elmin(az)
		if el < e0 - deg_to_rad(4.0):   # 帽緣以下 4° 以外的不算（耳罩、臉）
			continue
		var fu: float = az / TAU * HU
		var ft: float = clampf((el - e0) / maxf(PI / 2.0 - e0, 1e-4), 0.0, 1.0) * HT
		var u0 := int(floor(fu)) % HU
		var u1 := (u0 + 1) % HU
		var t0 := mini(int(floor(ft)), HT - 1)
		for uv in [[u0, t0], [u1, t0], [u0, t0 + 1], [u1, t0 + 1]]:
			raw[uv[1]][uv[0]] = maxf(float(raw[uv[1]][uv[0]]), l)
	var topr := 0.0
	for u in HU:
		topr = maxf(topr, float(raw[HT][u]))
	for u in HU:
		raw[HT][u] = topr
	for it in 8:   # 沒有頂點的方向用鄰格補
		for t in HT:
			for u in HU:
				if float(raw[t][u]) <= 0.0:
					var sm := 0.0
					var n := 0
					for nb in [[(u + 1) % HU, t], [(u + HU - 1) % HU, t], [u, t + 1], [u, maxi(t - 1, 0)]]:
						if float(raw[nb[1]][nb[0]]) > 0.0:
							sm += float(raw[nb[1]][nb[0]])
							n += 1
					if n > 0:
						raw[t][u] = sm / n
	# 光滑包絡：反覆「平滑 → 不能比原本小」，最後純平滑兩次，再整體加大到全部包住
	var S: Array = raw.duplicate(true)
	for it in 30:
		var Bl := _blur(S)
		for t in HT + 1:
			for u in HU:
				S[t][u] = maxf(float(Bl[t][u]), float(raw[t][u]))
	S = _blur(_blur(S))
	var need := 0.0
	for t in HT + 1:
		for u in HU:
			need = maxf(need, float(raw[t][u]) - float(S[t][u]))
	var tp := 0.0
	for u in HU:
		tp += float(S[HT][u]) / HU
	for t in HT + 1:
		for u in HU:
			S[t][u] = (tp if t == HT else float(S[t][u])) + need + 0.0055
	helmet_def["grid"] = S
	# 下巴帶：從兩側帽緣（左、右）沿臉頰到下巴；每個取樣方向找頭的表面（那個方向 ±10° 內最遠的頂點）＋4 mm
	var chin_dir := Vector3(0, -0.72, 0.69).normalized()
	var straps := []
	for sgn in [1.0, -1.0]:
		var az0 := 0.0 if sgn > 0.0 else PI
		var e0s := _elmin(az0)
		var d0 := Vector3(cos(e0s) * sgn, sin(e0s), 0.0)
		var line := []
		for k in 9:
			var dk := d0.slerp(chin_dir, float(k) / 8.0).normalized()
			var rr := 0.0
			for v4 in loc:
				var dd := v4 - cen
				var ll := dd.length()
				if ll > 1e-4 and dd.dot(dk) / ll > 0.985:
					rr = maxf(rr, ll)
			if k == 0:
				rr = maxf(rr, helmet_r(d0 + Vector3(0, 0.02, 0)))
			if rr > 0.0:
				var pt := dk * (rr + 0.004)
				line.append([pt.x, pt.y, pt.z])
		straps.append(line)
	helmet_def["strap"] = straps
	var T := Transform3D(Basis(left, up, fwd).orthonormalized(), head + left * cen.x + up * cen.y + fwd * cen.z)
	var local: Transform3D = (am.sk2f() * am.gp("head")).affine_inverse() * T
	helmet_def["xf"] = xfa(local)
	_put_helmet(helmet_def, local)
	# 光滑化之後大部分地方離頭比 5 mm 遠 → 量實際最近距離，整個殼等量縮小到「最近的那一點＝5 mm」（還是 0 穿模）
	for it in 3:
		var mg: float = float(measure_helmet().get("helmet_min_gap_mm", 5.0)) / 1000.0
		if mg <= 0.0058:
			break
		for t in HT + 1:
			for u in HU:
				S[t][u] = float(S[t][u]) - (mg - 0.005)
		_put_helmet(helmet_def, local)
	print("HELMET head pts %d; rim: front %.0f deg, sides %.0f deg (ear caps reach %.0f deg), back %.0f deg; radius front %.1f / side %.1f / top %.1f cm; smooth-envelope inflate %.1f mm" % [pts.size(), rad_to_deg(el_front), rad_to_deg(el_side), rad_to_deg(el_ear), rad_to_deg(el_back), float(S[0][HU / 4]) * 100.0, float(S[0][0]) * 100.0, float(S[HT][0]) * 100.0, need * 1000.0])
	return helmet_def

## 量（姿勢已套好的網格）：帽子蓋住的範圍（帽緣線以上）裡，頭的每個頂點離殼內面多遠（負＝穿出去；內插的殼面再扣 0.5% 弦高）；
## 其他身體（手、肩膀）有幾個頂點跑進帽子裡；下巴帶的點離頭的表面多遠。
func measure_helmet() -> Dictionary:
	if helmet == null or helmet_mesh == null or helmet.get_parent() != helmet_ba:
		return {}
	var inv: Transform3D = (am.frame.global_transform.affine_inverse() * helmet.global_transform).affine_inverse()
	var pen := 0
	var gap := 9.0
	var covered := 0
	var hp: PackedVector3Array = am.mesh_pts(["head"])
	for q in hp:
		var u: Vector3 = inv * q
		var r := helmet_r(u)
		if r > 0.0:
			covered += 1
			var gp2 := r * 0.995 - u.length()
			if gp2 < 0.0:
				pen += 1
			gap = minf(gap, gp2)
	var other := 0
	for q in am.mesh_pts(["spine", "leftarm", "leftforearm", "lefthand", "rightarm", "rightforearm", "righthand", "leftshoulder", "rightshoulder"]):
		var u2: Vector3 = inv * q
		var r2 := helmet_r(u2)
		if r2 > 0.0 and u2.length() < r2:
			other += 1
	return {"helmet_penetration_pts": pen, "helmet_min_gap_mm": gap * 1000.0, "helmet_head_pts_covered": covered, "helmet_head_pts_total": hp.size(), "helmet_other_body_pts_inside": other}

# ───────── 每格：move＝這一格前進幾公尺。輪子轉 move÷r、兩輪貼地、圳寶跟著車 ─────────
func update(move: float) -> void:
	if root == null or root.get_parent() == null:
		return
	dist += move
	phi = dist / float(R["wheel_r"])
	_ground_rig()
	for w in R["wheels"]:
		(w as Node3D).basis = Basis(Vector3.RIGHT, phi)
	if not seat_pose.is_empty():
		(am.model as Node3D).transform = root.transform * seated
		am.load_pose(seat_pose)

func measure() -> Dictionary:
	var out := rep.duplicate()
	var inv: Transform3D = am.frame.global_transform.affine_inverse()
	var r: float = R["wheel_r"]
	var names := ["front", "rear"]
	for i in 2:
		var c: Vector3 = inv * ((R["wheels"][i] as Node3D).global_position)
		out["wheel_%s_road_gap_cm" % names[i]] = (c.y - r - float(am.g(c))) * 100.0
	out["distance_m"] = dist
	out["wheel_turn_x_r_m"] = phi * r      # 輪子轉角 × 半徑，要等於前進距離（不打滑）
	out["wheel_slip_cm"] = absf(phi * r - dist) * 100.0
	out.merge(measure_helmet(), true)
	out.merge(measure_mom(), true)
	if is_riding():
		out.merge(measure_zunbo(), true)
	out["placeholder"] = bool(R.get("placeholder", true))
	return out

# ───────── 下車／停車 ─────────
## 停在 holder 節點下（世界裡固定的位置）；安全帽脫下來放在後座上（東西不會憑空消失）
func park(holder: Node3D, xf: Transform3D, helmet_on_seat := true) -> void:
	_detach(root)
	holder.add_child(root)
	root.transform = xf
	root.visible = true
	seat_pose = []
	if helmet:
		_clear_helmet()
		if helmet_on_seat and not helmet_def.is_empty():
			helmet = _make_helmet(helmet_def)
			root.add_child(helmet)
			var z: float = lerpf(R["seat_z_front"], R["seat_z_back"], 0.72)
			helmet.transform = Transform3D(Basis.IDENTITY, Vector3(0, seat_top_at(0.0, z) + 0.002, z))

func hide() -> void:
	_clear_helmet()
	seat_pose = []
	_detach(root)

func is_riding() -> bool:
	return root != null and not seat_pose.is_empty()
