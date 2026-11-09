extends RefCounted
## Ken 的家（室內，全用程式方塊／圓柱做，娃娃屋剖面：沒天花板、靠鏡頭的兩面牆不做）
## 地板 y=0。客廳 x 0~5、z 0~4；書房 x -3.5~0、z 0~3（中間隔牆有開口，沒有門板）。鏡頭在 +Z 那一側往裡看。
## 錨點（Marker3D，-Z＝面向）：
##   door           入口（客廳後牆的門，面向室內）
##   sofa_seat      沙發中間座位，坐墊面上、臀部位置；-Z 朝電視
##   tv_screen      電視螢幕位置；子節點 MeshInstance3D「TVScreen」（自己的材質，之後可貼影片貼圖）
##   desk_seat      書桌椅（電腦那一半）坐墊面上；-Z 朝書桌
##   desk_seat_book 書桌椅移到課本那一半時的位置（寫功課用）
##   computer_screen 螢幕；子節點「PCScreen」（自己的材質）
##   recorder_spot  站著吹直笛的位置，-Z 朝譜架
##   headphones     沙發邊桌上的耳機；子節點「HeadphonesProp」（戴到頭上時可隱藏）
##   book           書桌上的英文課本
## 坐姿高度是用 retarget 套動作後量 Ken 蒙皮頂點得到的（見 home_check.gd 印出的數字）。

const SOFA_SEAT_TOP := 0.31    # 坐墊面（sitting_laughing／sitting_idle 屁股最低點 0.309～0.315）
const CHAIR_SEAT_TOP := 0.33   # 書桌椅面（typing 0.312、writing 0.353 取中間，Ken 再各自微調）
const DESK_TOP := 0.53         # 桌面（typing 手 0.54～0.55；膝蓋頂約 0.47 要在桌面下方）
const WALL_H := 2.1

## 坐下時 Ken 的位移（Ken 自己座標：hips_z＝臀部在腳底原點前方多少，seat＝屁股最低點高度）
const SIT := {
	"sitting_laughing": {"t": 0.25, "hips_z": -0.066, "hips_x": -0.009, "seat": 0.309},
	"sitting_idle": {"t": 0.5, "hips_z": -0.021, "hips_x": -0.004, "seat": 0.315},
	"writing": {"t": 0.5, "hips_z": 0.083, "hips_x": 0.028, "seat": 0.353},
	"typing": {"t": 0.3, "hips_z": -0.023, "hips_x": 0.001, "seat": 0.312},
}

var root: Node3D
var mats := {}

func _m(col: Variant, emit := 0.0) -> StandardMaterial3D:
	var key := str(col) + str(emit)
	if mats.has(key):
		return mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(col) if col is String else col
	m.roughness = 0.9
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = m.albedo_color
		m.emission_energy_multiplier = emit
	mats[key] = m
	return m

func box(parent: Node3D, size: Vector3, pos: Vector3, col: Variant, rot_y := 0.0, nm := "") -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = _m(col)
	mi.position = pos
	mi.rotation.y = rot_y
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if nm != "":
		mi.name = nm
	parent.add_child(mi)
	return mi

func cyl(parent: Node3D, r_top: float, r_bot: float, h: float, pos: Vector3, col: Variant, seg := 16) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = r_top
	cm.bottom_radius = r_bot
	cm.height = h
	cm.radial_segments = seg
	cm.rings = 1
	mi.mesh = cm
	mi.material_override = _m(col)
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

func marker(nm: String, pos: Vector3, rot_y_deg: float) -> Marker3D:
	var mk := Marker3D.new()
	mk.name = nm
	mk.position = pos
	mk.rotation.y = deg_to_rad(rot_y_deg)
	root.add_child(mk)
	return mk

func screen(parent: Node3D, nm: String, size: Vector2, col: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = nm
	var q := QuadMesh.new()
	q.size = size
	mi.mesh = q
	var m := StandardMaterial3D.new()   # 自己的材質，之後可換 albedo_texture
	m.albedo_color = col
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

func build_ken_home() -> Node3D:
	root = Node3D.new()
	root.name = "KenHome"
	_shell()
	_living()
	_study()
	return root

# ───────── 地板、牆 ─────────
func _shell() -> void:
	var fl := Node3D.new()
	fl.name = "Floor"
	root.add_child(fl)
	var woods := ["#e3bf8f", "#d9b27f"]
	var i := 0
	var x := -3.5
	while x < 5.0 - 0.01:   # 木地板條（沿 z 方向）
		var zlen := 4.0 if x >= 0.0 else 3.0
		box(fl, Vector3(0.25, 0.04, zlen), Vector3(x + 0.125, -0.02, zlen / 2.0), woods[i % 2])
		x += 0.25
		i += 1
	var wall := "#f6ecd6"
	var trim := "#e2d2b0"
	var wl := Node3D.new()
	wl.name = "Walls"
	root.add_child(wl)
	# 後牆（客廳：門的位置 x 3.85~4.75 挖開）
	box(wl, Vector3(3.85, WALL_H, 0.1), Vector3(1.925, WALL_H / 2, -0.05), wall)
	box(wl, Vector3(0.25, WALL_H, 0.1), Vector3(4.875, WALL_H / 2, -0.05), wall)
	box(wl, Vector3(0.9, WALL_H - 1.55, 0.1), Vector3(4.3, 1.55 + (WALL_H - 1.55) / 2, -0.05), wall)
	box(wl, Vector3(3.5, WALL_H, 0.1), Vector3(-1.75, WALL_H / 2, -0.05), "#e8f0dc")   # 書房牆淡綠
	# 側牆
	box(wl, Vector3(0.1, WALL_H, 4.0), Vector3(5.05, WALL_H / 2, 2.0), wall)
	box(wl, Vector3(0.1, WALL_H, 3.0), Vector3(-3.55, WALL_H / 2, 1.5), "#e8f0dc")
	# 隔牆 x=0：z 0~1.3 與 2.3~3.0，中間開口（上方有門楣）
	box(wl, Vector3(0.1, WALL_H, 1.3), Vector3(0, WALL_H / 2, 0.65), wall)
	box(wl, Vector3(0.1, WALL_H, 0.7), Vector3(0, WALL_H / 2, 2.65), wall)
	box(wl, Vector3(0.1, WALL_H - 1.6, 1.0), Vector3(0, 1.6 + (WALL_H - 1.6) / 2, 1.8), wall)
	# 踢腳板
	box(wl, Vector3(8.5, 0.08, 0.02), Vector3(0.75, 0.04, 0.005), trim)
	box(wl, Vector3(0.02, 0.08, 4.0), Vector3(4.995, 0.04, 2.0), trim)
	box(wl, Vector3(0.02, 0.08, 3.0), Vector3(-3.495, 0.04, 1.5), trim)
	# 門（客廳後牆）
	box(wl, Vector3(0.8, 1.5, 0.04), Vector3(4.3, 0.75, -0.01), "#b9773f")
	cyl(wl, 0.03, 0.03, 0.03, Vector3(4.6, 0.75, 0.02), "#f2c14e").rotation.x = PI / 2
	marker("door", Vector3(4.3, 0, 0.45), 180)   # 面向 +Z（進客廳）

# ───────── 客廳 ─────────
func _living() -> void:
	var lv := Node3D.new()
	lv.name = "LivingRoom"
	root.add_child(lv)
	# 地毯
	box(lv, Vector3(2.0, 0.012, 2.2), Vector3(3.0, 0.006, 2.0), "#f3a6a0")
	box(lv, Vector3(1.7, 0.014, 1.9), Vector3(3.0, 0.007, 2.0), "#fbd3c4")
	# 沙發：面向 +X，坐墊面 SOFA_SEAT_TOP；臀部錨點 x=1.9
	var sx := 1.9
	var sofa := Node3D.new()
	sofa.name = "Sofa"
	lv.add_child(sofa)
	var navy := "#2f4a7a"
	var navy2 := "#3d5c94"
	var back_front := sx - 0.17    # 靠背前緣（Ken 背後約 0.13，靠墊再凸 0.03）
	var seat_front := sx + 0.21    # 坐墊前緣（小腿從膝蓋往後收，坐墊不能太深）
	var base_front := sx + 0.06    # 底座往內縮，讓腳可以收在坐墊下
	var base_h := SOFA_SEAT_TOP - 0.11
	var bb := back_front - 0.16
	box(sofa, Vector3(base_front - bb, base_h - 0.07, 1.8), Vector3((base_front + bb) / 2, 0.07 + (base_h - 0.07) / 2, 2.0), navy)
	box(sofa, Vector3(seat_front - bb, 0.05, 1.8), Vector3((seat_front + bb) / 2, base_h - 0.025, 2.0), navy)   # 坐墊下的板
	for lx in [bb + 0.05, base_front - 0.04]:
		for lz in [1.2, 2.8]:
			cyl(sofa, 0.025, 0.02, 0.07, Vector3(lx, 0.035, lz), "#6b4a2f", 8)
	for k in 3:   # 三個坐墊
		var cz := 2.0 + (k - 1) * 0.5
		box(sofa, Vector3(seat_front - back_front, 0.11, 0.48), Vector3((seat_front + back_front) / 2, base_h + 0.055, cz), navy2)
	box(sofa, Vector3(0.16, 0.66, 1.8), Vector3(back_front - 0.08, 0.33, 2.0), navy)   # 靠背
	for k in 3:   # 靠背軟墊
		box(sofa, Vector3(0.06, 0.3, 0.46), Vector3(back_front + 0.0, base_h + 0.11 + 0.17, 2.0 + (k - 1) * 0.5), navy2)
	for side in [-1, 1]:   # 扶手
		box(sofa, Vector3(seat_front - bb, 0.39, 0.15), Vector3((seat_front + bb) / 2, 0.265, 2.0 + side * 0.825), navy)
	for p in [Vector3(back_front + 0.07, base_h + 0.11 + 0.14, 1.32), Vector3(back_front + 0.07, base_h + 0.11 + 0.14, 2.68)]:   # 橘色抱枕
		var pil := box(sofa, Vector3(0.1, 0.26, 0.26), p, "#f28c28")
		pil.rotation.x = deg_to_rad(8)
	marker("sofa_seat", Vector3(sx, SOFA_SEAT_TOP, 2.0), -90)   # -Z 朝 +X（電視）
	# 咖啡桌
	box(lv, Vector3(0.5, 0.04, 0.9), Vector3(3.05, 0.28, 2.0), "#c98b52")
	for dx in [-0.2, 0.2]:
		for dz in [-0.4, 0.4]:
			box(lv, Vector3(0.05, 0.26, 0.05), Vector3(3.05 + dx, 0.13, 2.0 + dz), "#a86d3c")
	cyl(lv, 0.05, 0.04, 0.08, Vector3(3.0, 0.34, 1.8), "#ffffff")   # 杯子
	box(lv, Vector3(0.14, 0.02, 0.2), Vector3(3.1, 0.31, 2.2), "#4a4a58")   # 遙控器
	# 電視櫃＋電視（右牆 x=5）
	box(lv, Vector3(0.4, 0.38, 1.6), Vector3(4.78, 0.19, 2.0), "#f4f1ea")
	box(lv, Vector3(0.41, 0.02, 1.62), Vector3(4.78, 0.385, 2.0), "#c98b52")
	for dz in [-0.4, 0.4]:
		box(lv, Vector3(0.01, 0.26, 0.7), Vector3(4.575, 0.19, 2.0 + dz), "#e6e1d6")
	box(lv, Vector3(0.18, 0.03, 0.3), Vector3(4.8, 0.405, 2.0), "#33333b")   # 腳座
	box(lv, Vector3(0.04, 0.12, 0.06), Vector3(4.8, 0.47, 2.0), "#33333b")
	box(lv, Vector3(0.05, 0.66, 1.14), Vector3(4.8, 0.86, 2.0), "#22222a")   # 電視外框
	var tvm := marker("tv_screen", Vector3(4.77, 0.86, 2.0), 90)   # -Z 朝沙發（-X）
	var tvs := screen(tvm, "TVScreen", Vector2(1.06, 0.58), Color("#7fd3f7"))
	tvs.rotation.y = PI   # Quad 正面 +Z → 轉向沙發（-X）
	# 電視畫面裡的簡單卡通（太陽、草地），之後換貼圖時可刪
	var cart := Node3D.new()
	cart.name = "TVCartoon"
	tvm.add_child(cart)
	var g := box(cart, Vector3(1.06, 0.16, 0.002), Vector3(0, -0.21, -0.004), "#7ccf6a")
	g.material_override = _m("#7ccf6a", 0.6)
	var sun := cyl(cart, 0.08, 0.08, 0.002, Vector3(0.3, 0.13, -0.004), "#ffd84a")
	sun.rotation.x = PI / 2
	sun.material_override = _m("#ffd84a", 0.6)
	tvm.set_meta("cartoon", cart)
	# 邊桌＋耳機（沙發靠鏡頭那端）
	box(lv, Vector3(0.36, 0.03, 0.36), Vector3(1.95, 0.42, 3.15), "#c98b52")
	cyl(lv, 0.03, 0.03, 0.41, Vector3(1.95, 0.205, 3.15), "#a86d3c")
	cyl(lv, 0.14, 0.14, 0.02, Vector3(1.95, 0.01, 3.15), "#a86d3c")
	var hpm := marker("headphones", Vector3(1.95, 0.435, 3.15), -90)
	var hp := make_headphones(0.17)
	hp.name = "HeadphonesProp"
	hp.rotation.x = deg_to_rad(-90)   # 平放在桌上
	hp.position.y = 0.035
	hpm.add_child(hp)
	# 窗戶＋窗簾（後牆）
	box(lv, Vector3(1.2, 0.85, 0.02), Vector3(2.1, 1.2, 0.01), "#bfe6fb")
	for f in [[Vector3(1.28, 0.06, 0.05), Vector3(2.1, 1.65, 0.025)], [Vector3(1.28, 0.06, 0.05), Vector3(2.1, 0.75, 0.025)], [Vector3(0.05, 0.9, 0.05), Vector3(1.475, 1.2, 0.025)], [Vector3(0.05, 0.9, 0.05), Vector3(2.725, 1.2, 0.025)], [Vector3(0.04, 0.85, 0.04), Vector3(2.1, 1.2, 0.025)]]:
		box(lv, f[0], f[1], "#ffffff")
	box(lv, Vector3(1.9, 0.03, 0.03), Vector3(2.1, 1.82, 0.08), "#a86d3c")   # 窗簾桿
	for cx in [1.3, 2.9]:
		box(lv, Vector3(0.35, 1.25, 0.05), Vector3(cx, 1.17, 0.09), "#f6c453")
	# 掛鐘（後牆，窗戶右上）
	var clk := Node3D.new()
	clk.position = Vector3(3.45, 1.6, 0.0)
	lv.add_child(clk)
	var face := cyl(clk, 0.16, 0.16, 0.03, Vector3(0, 0, 0.02), "#ffffff", 24)
	face.rotation.x = PI / 2
	var rim := cyl(clk, 0.18, 0.18, 0.02, Vector3(0, 0, 0.01), "#e85d4a", 24)
	rim.rotation.x = PI / 2
	box(clk, Vector3(0.015, 0.1, 0.01), Vector3(0, 0.045, 0.04), "#33333b")
	var mh := box(clk, Vector3(0.015, 0.13, 0.01), Vector3(0.05, -0.03, 0.045), "#33333b")
	mh.rotation.z = deg_to_rad(120)
	for k in 12:
		var a := TAU * k / 12.0
		box(clk, Vector3(0.012, 0.025, 0.01), Vector3(sin(a) * 0.13, cos(a) * 0.13, 0.04), "#7a7a86").rotation.z = -a
	# 全家福相框（後牆）
	box(lv, Vector3(0.5, 0.38, 0.03), Vector3(0.75, 1.3, 0.02), "#a86d3c")
	box(lv, Vector3(0.42, 0.3, 0.01), Vector3(0.75, 1.3, 0.04), "#bfe6fb")
	box(lv, Vector3(0.42, 0.1, 0.012), Vector3(0.75, 1.2, 0.042), "#9ad07a")
	for fp in [[0.62, 0.11, "#e85d4a"], [0.75, 0.13, "#2f4a7a"], [0.87, 0.09, "#f28c28"]]:   # 三個小人頭身
		box(lv, Vector3(0.07, fp[1], 0.013), Vector3(fp[0], 1.2 + fp[1] / 2, 0.045), fp[2])
		cyl(lv, 0.03, 0.03, 0.014, Vector3(fp[0], 1.23 + fp[1], 0.045), "#f3c9a1").rotation.x = PI / 2
	# 立燈（沙發後方角落）
	cyl(lv, 0.15, 0.15, 0.03, Vector3(0.5, 0.015, 0.45), "#4a4a58")
	cyl(lv, 0.02, 0.02, 1.35, Vector3(0.5, 0.69, 0.45), "#4a4a58")
	var shade := cyl(lv, 0.13, 0.2, 0.25, Vector3(0.5, 1.45, 0.45), "#fff1c9")
	shade.material_override = _m("#fff1c9", 0.5)
	# 盆栽（電視旁角落）
	_plant(lv, Vector3(4.65, 0, 3.55), 1.0)

func _plant(parent: Node3D, p: Vector3, s: float) -> void:
	cyl(parent, 0.17 * s, 0.13 * s, 0.32 * s, p + Vector3(0, 0.16 * s, 0), "#d9774a")
	cyl(parent, 0.15 * s, 0.15 * s, 0.02 * s, p + Vector3(0, 0.32 * s, 0), "#6b4a2f")
	var leaf := "#4caf50"
	for k in 7:
		var a := TAU * k / 7.0
		var l := box(parent, Vector3(0.09, 0.42, 0.03) * s, p + Vector3(sin(a) * 0.08, 0.55, cos(a) * 0.08) * s, leaf if k % 2 == 0 else "#66c26a")
		l.rotation = Vector3(cos(a) * 0.45, a, -sin(a) * 0.45)

# ───────── 書房 ─────────
func _study() -> void:
	var st := Node3D.new()
	st.name = "Study"
	root.add_child(st)
	box(st, Vector3(1.4, 0.012, 1.2), Vector3(-1.6, 0.006, 2.1), "#a9d6e5")   # 小地毯
	# 書桌靠左牆（x=-3.5），Ken 面向 -X
	var dx0 := -3.5
	var depth := 0.55
	var dfront := dx0 + depth      # 桌子前緣 x=-2.95
	var z0 := 0.45
	var z1 := 1.95
	var wood := "#e9c48f"
	box(st, Vector3(depth, 0.03, z1 - z0), Vector3(dx0 + depth / 2, DESK_TOP - 0.015, (z0 + z1) / 2), wood)
	for zz in [z0 + 0.04, z1 - 0.04]:   # 側板（不擋膝蓋：只在兩端）
		box(st, Vector3(depth, DESK_TOP - 0.03, 0.03), Vector3(dx0 + depth / 2, (DESK_TOP - 0.03) / 2, zz), "#d4ab72")
	box(st, Vector3(0.03, 0.2, z1 - z0 - 0.1), Vector3(dx0 + 0.03, DESK_TOP - 0.13, (z0 + z1) / 2), "#d4ab72")   # 背板
	# 電腦那一半（z 0.6~1.2）
	var pcz := 0.88
	box(st, Vector3(0.16, 0.012, 0.22), Vector3(dx0 + 0.13, DESK_TOP + 0.006, pcz), "#4a4a58")   # 螢幕底座
	box(st, Vector3(0.03, 0.14, 0.04), Vector3(dx0 + 0.12, DESK_TOP + 0.08, pcz), "#4a4a58")
	box(st, Vector3(0.03, 0.3, 0.48), Vector3(dx0 + 0.12, DESK_TOP + 0.3, pcz), "#2a2a33")
	var pcm := marker("computer_screen", Vector3(dx0 + 0.14, DESK_TOP + 0.3, pcz), -90)
	var pcs := screen(pcm, "PCScreen", Vector2(0.44, 0.26), Color("#9fe0ff"))
	pcs.rotation.y = PI
	# 螢幕上的網頁示意（彩色方塊）
	for wb in [[Vector2(0, 0.09), Vector2(0.42, 0.05), "#3d7be0"], [Vector2(-0.1, -0.02), Vector2(0.18, 0.12), "#ffd84a"], [Vector2(0.1, -0.01), Vector2(0.16, 0.03), "#ffffff"], [Vector2(0.1, -0.06), Vector2(0.16, 0.03), "#ffffff"]]:
		var b := box(pcm, Vector3(wb[1].x, wb[1].y, 0.002), Vector3(-wb[0].x, wb[0].y, -0.004), wb[2])
		b.material_override = _m(wb[2], 0.5)
	box(st, Vector3(0.14, 0.018, 0.36), Vector3(dx0 + 0.36, DESK_TOP + 0.009, pcz), "#f4f4f4")   # 鍵盤
	for r in 3:
		box(st, Vector3(0.025, 0.006, 0.32), Vector3(dx0 + 0.31 + r * 0.035, DESK_TOP + 0.02, pcz), "#c9cbd3")
	var mouse := box(st, Vector3(0.07, 0.025, 0.045), Vector3(dx0 + 0.37, DESK_TOP + 0.012, pcz - 0.27), "#f4f4f4")
	mouse.name = "Mouse"
	box(st, Vector3(0.2, 0.004, 0.18), Vector3(dx0 + 0.37, DESK_TOP + 0.002, pcz - 0.27), "#3d7be0")   # 滑鼠墊
	box(st, Vector3(0.36, 0.34, 0.16), Vector3(dx0 + 0.25, 0.17, z0 + 0.15), "#4a4a58")   # 主機（桌下）
	marker("desk_seat", Vector3(dfront + 0.2, CHAIR_SEAT_TOP, pcz), 90)   # -Z 朝 -X（書桌）
	# 課本那一半（z 1.3~1.9）
	var bkz := 1.55
	var bk := marker("book", Vector3(dx0 + 0.36, DESK_TOP, bkz), 90)
	_open_book(bk)
	var pen := cyl(bk, 0.006, 0.006, 0.16, Vector3(0.05, 0.012, 0.0), "#f6c453", 6)
	pen.name = "Pencil"
	pen.rotation = Vector3(0, deg_to_rad(30), PI / 2)
	marker("desk_seat_book", Vector3(dfront + 0.2, CHAIR_SEAT_TOP, bkz), 90)
	cyl(st, 0.04, 0.035, 0.1, Vector3(dx0 + 0.1, DESK_TOP + 0.05, 1.85), "#e85d4a")   # 筆筒
	for k in 3:
		cyl(st, 0.005, 0.005, 0.14, Vector3(dx0 + 0.09 + k * 0.012, DESK_TOP + 0.13, 1.85 + (k - 1) * 0.01), ["#3d7be0", "#4caf50", "#f6c453"][k], 6)
	# 書桌椅（電腦位置）
	var chair := make_chair()
	chair.name = "DeskChair"
	chair.position = Vector3(dfront + 0.2, 0, pcz)
	chair.rotation.y = deg_to_rad(90)
	st.add_child(chair)
	# 窗（左牆，書桌上方）
	box(st, Vector3(0.02, 0.6, 0.8), Vector3(-3.49, 1.25, 1.2), "#bfe6fb")
	for f in [[Vector3(0.05, 0.05, 0.88), Vector3(-3.47, 1.575, 1.2)], [Vector3(0.05, 0.05, 0.88), Vector3(-3.47, 0.925, 1.2)], [Vector3(0.05, 0.65, 0.05), Vector3(-3.47, 1.25, 0.785)], [Vector3(0.05, 0.65, 0.05), Vector3(-3.47, 1.25, 1.615)], [Vector3(0.04, 0.6, 0.03), Vector3(-3.47, 1.25, 1.2)]]:
		box(st, f[0], f[1], "#ffffff")
	# 書櫃（後牆）
	var shx := -1.1
	box(st, Vector3(0.9, 1.4, 0.02), Vector3(shx, 0.7, 0.02), "#f0e2c4")   # 背板
	for sx2 in [-0.44, 0.44]:
		box(st, Vector3(0.025, 1.42, 0.3), Vector3(shx + sx2, 0.71, 0.16), "#d4ab72")
	var cols := ["#e85d4a", "#3d7be0", "#4caf50", "#f6c453", "#9b6ad6", "#f28c28", "#2fb3a6", "#ef7fa8"]
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for row in 4:
		var y0 := 0.05 + row * 0.33
		box(st, Vector3(0.86, 0.025, 0.28), Vector3(shx, y0, 0.18), "#d4ab72")
		if row == 3:
			break
		var bx := shx - 0.4
		while bx < shx + 0.38:
			var w := rng.randf_range(0.035, 0.06)
			var hh := rng.randf_range(0.2, 0.28)
			box(st, Vector3(w, hh, 0.2), Vector3(bx + w / 2, y0 + 0.0125 + hh / 2, 0.15), cols[rng.randi() % cols.size()])
			bx += w + 0.004
	box(st, Vector3(0.86, 0.025, 0.28), Vector3(shx, 1.39, 0.18), "#d4ab72")
	cyl(st, 0.07, 0.07, 0.06, Vector3(shx + 0.25, 1.43, 0.17), "#a9d6e5")   # 書櫃上的小地球儀座
	var globe := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.09
	sm.height = 0.18
	globe.mesh = sm
	globe.material_override = _m("#5aa9e6")
	globe.position = Vector3(shx + 0.25, 1.55, 0.17)
	st.add_child(globe)
	# 海報（後牆，沒有字）
	box(st, Vector3(0.6, 0.8, 0.01), Vector3(-2.55, 1.35, 0.01), "#ffffff")
	box(st, Vector3(0.52, 0.5, 0.012), Vector3(-2.55, 1.45, 0.012), "#7fc8f8")
	cyl(st, 0.1, 0.1, 0.014, Vector3(-2.45, 1.55, 0.015), "#ffd84a").rotation.x = PI / 2
	box(st, Vector3(0.52, 0.14, 0.014), Vector3(-2.55, 1.27, 0.014), "#4caf50")
	for k in 3:
		box(st, Vector3(0.4 - k * 0.1, 0.03, 0.014), Vector3(-2.55, 1.1 - k * 0.06, 0.014), "#c9cbd3")
	# 譜架＋直笛（Ken 站在 recorder_spot 面向 -X 看譜）
	var ms := Vector3(-2.35, 0, 2.5)
	cyl(st, 0.0, 0.2, 0.04, ms + Vector3(0, 0.02, 0), "#33333b", 3)
	cyl(st, 0.012, 0.012, 0.85, ms + Vector3(0, 0.44, 0), "#33333b")
	var desk := box(st, Vector3(0.02, 0.3, 0.46), ms + Vector3(0.03, 0.95, 0), "#33333b")
	desk.rotation.z = deg_to_rad(-20)
	var sheet := box(st, Vector3(0.006, 0.26, 0.4), ms + Vector3(0.05, 0.96, 0), "#ffffff")
	sheet.rotation.z = deg_to_rad(-20)
	for k in 4:   # 五線譜示意
		var ln := box(st, Vector3(0.004, 0.006, 0.36), ms + Vector3(0.056 - k * 0.0, 1.04 - k * 0.05, 0) + Vector3(sin(deg_to_rad(20)) * (1.04 - k * 0.05 - 0.96), 0, 0), "#7a7a86")
		ln.rotation.z = deg_to_rad(-20)
	var rec := make_recorder()
	rec.name = "RecorderProp"   # 放在譜架旁的小凳上
	cyl(st, 0.12, 0.12, 0.03, ms + Vector3(0.0, 0.42, 0.42), "#e9c48f")
	cyl(st, 0.02, 0.02, 0.41, ms + Vector3(0.0, 0.205, 0.42), "#d4ab72")
	rec.position = ms + Vector3(0.0, 0.45, 0.42) + Vector3(0, 0, 0.12)
	rec.rotation = Vector3(-PI / 2, 0, 0)
	st.add_child(rec)
	marker("recorder_spot", Vector3(-1.7, 0, 2.5), 90)   # -Z 朝 -X（譜架）
	_plant(st, Vector3(-3.2, 0, 2.7), 0.8)

func _open_book(parent: Node3D) -> void:
	# 打開的課本：兩頁略成 V 字，封面藍色
	for side in [-1, 1]:
		var pg := box(parent, Vector3(0.22, 0.012, 0.15), Vector3(0, 0.008, side * 0.075), "#2f6fd0")
		pg.rotation.x = deg_to_rad(side * 4)
		var paper := box(parent, Vector3(0.21, 0.01, 0.14), Vector3(0, 0.016, side * 0.073), "#ffffff")
		paper.rotation.x = deg_to_rad(side * 4)
		for k in 5:
			box(parent, Vector3(0.008, 0.002, 0.1), Vector3(-0.07 + k * 0.035, 0.022, side * 0.075), "#9aa4b8").rotation.x = deg_to_rad(side * 4)
	box(parent, Vector3(0.05, 0.003, 0.05), Vector3(0.07, 0.023, -0.075), "#f28c28")   # 頁面插圖

## 書桌椅（原點＝地面中心，Ken 面向 -Z 坐）
func make_chair() -> Node3D:
	var c := Node3D.new()
	var col := "#3d7be0"
	box(c, Vector3(0.38, 0.05, 0.36), Vector3(0, CHAIR_SEAT_TOP - 0.025, 0), col)
	box(c, Vector3(0.36, 0.34, 0.04), Vector3(0, CHAIR_SEAT_TOP + 0.27, 0.2), col)   # 靠背
	box(c, Vector3(0.03, 0.12, 0.03), Vector3(0, CHAIR_SEAT_TOP + 0.06, 0.2), "#4a4a58")
	cyl(c, 0.025, 0.025, CHAIR_SEAT_TOP - 0.1, Vector3(0, (CHAIR_SEAT_TOP - 0.1) / 2 + 0.06, 0), "#4a4a58")
	for k in 5:
		var a := TAU * k / 5.0
		var leg := box(c, Vector3(0.03, 0.025, 0.22), Vector3(sin(a) * 0.1, 0.05, cos(a) * 0.1), "#4a4a58")
		leg.rotation.y = a
		cyl(c, 0.022, 0.022, 0.04, Vector3(sin(a) * 0.2, 0.02, cos(a) * 0.2), "#33333b")
	return c

## 耳機（原點＝兩耳罩中間；w＝耳罩到中心距離、hb＝頭帶高；+Y 朝頭頂）
static func make_headphones(w := 0.17, hb := -1.0) -> Node3D:
	if hb < 0.0:
		hb = w
	var n := Node3D.new()
	var band := StandardMaterial3D.new()
	band.albedo_color = Color("#e85d4a")
	var cup := StandardMaterial3D.new()
	cup.albedo_color = Color("#33333b")
	var seg := 10
	var r := w + 0.015
	for k in seg + 1:   # 頭帶：半圓
		var a := PI * k / seg
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(PI * r / seg + 0.01, 0.022, 0.05)
		mi.mesh = bm
		mi.material_override = band
		mi.position = Vector3(cos(a) * r, sin(a) * hb, 0)
		mi.rotation.z = atan2(cos(a) * hb, -sin(a) * r)
		n.add_child(mi)
	for s in [-1, 1]:
		var c := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.055
		cm.bottom_radius = 0.055
		cm.height = 0.045
		c.mesh = cm
		c.material_override = cup
		c.rotation.z = PI / 2
		c.position = Vector3(s * (w + 0.01), 0, 0)
		n.add_child(c)
		var pad := MeshInstance3D.new()
		var pm := CylinderMesh.new()
		pm.top_radius = 0.045
		pm.bottom_radius = 0.045
		pm.height = 0.02
		pad.mesh = pm
		pad.material_override = band
		pad.rotation.z = PI / 2
		pad.position = Vector3(s * (w + 0.04), 0, 0)
		n.add_child(pad)
	return n

## 直笛（原點＝吹口，沿 +Y 往笛尾，長 0.25）
static func make_recorder(L := 0.25) -> Node3D:
	var n := Node3D.new()
	var body := StandardMaterial3D.new()
	body.albedo_color = Color("#f3ead8")
	var tip := StandardMaterial3D.new()
	tip.albedo_color = Color("#c98b52")
	var parts := [[0.0, 0.05, 0.011, 0.014, tip], [0.05, L - 0.04, 0.013, 0.012, body], [L - 0.04, L, 0.012, 0.017, tip]]
	for p in parts:
		var mi := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = p[2]
		cm.bottom_radius = p[3]
		cm.height = p[1] - p[0]
		cm.radial_segments = 12
		mi.mesh = cm
		mi.material_override = p[4]
		mi.position = Vector3(0, (p[0] + p[1]) / 2, 0)
		n.add_child(mi)
	for k in 6:   # 按孔
		var h := MeshInstance3D.new()
		var sm := CylinderMesh.new()
		sm.top_radius = 0.004
		sm.bottom_radius = 0.004
		sm.height = 0.004
		h.mesh = sm
		var hm := StandardMaterial3D.new()
		hm.albedo_color = Color("#5a4a3a")
		h.material_override = hm
		h.rotation.x = PI / 2
		h.position = Vector3(0, 0.08 + k * 0.022, 0.013)
		n.add_child(h)
	return n
