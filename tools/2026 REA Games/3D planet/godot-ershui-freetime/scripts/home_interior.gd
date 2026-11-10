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
##   recorder_spot  站著吹直笛的位置，-Z 朝譜架（Study/MusicStand）
##   headphones     沙發邊桌上的耳機；子節點「HeadphonesProp」（戴到頭上時可隱藏）
##   book           書桌上的英文課本
## 坐姿高度是用 retarget 套動作後量 Ken 蒙皮頂點得到的（見 home_check.gd 印出的數字）。

const SOFA_SEAT_TOP := 0.31    # 坐墊面（sitting_laughing／sitting_idle 屁股最低點 0.309～0.315）
const CHAIR_SEAT_TOP := 0.33   # 書桌椅面（typing 0.312、writing 0.353 取中間，Ken 再各自微調）
const DESK_TOP := 0.53         # 桌面（typing 手 0.54～0.55；膝蓋頂約 0.47 要在桌面下方）
const BOOK_TOP := DESK_TOP + 0.022   # 課本紙面最高點（含印刷線條）；手要在這上面
const WALL_H := 2.1

## 坐下時 Ken 的位移（Ken 自己座標：hips_z＝臀部在腳底原點前方多少，seat＝屁股最低點高度）
const SIT := {
	"sitting_laughing": {"t": 0.15, "hips_z": -0.066, "hips_x": -0.009, "seat": 0.309},   # 0.15：手放腿上、頭沒有往後仰
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
	var pen := cyl(bk, 0.005, 0.005, 0.16, Vector3(0.2, 0.005, 0.02), "#ffcc00", 6)   # 沒在寫字時，鉛筆放在課本右邊桌面
	pen.name = "Pencil"
	pen.rotation = Vector3(PI / 2, deg_to_rad(12), 0)
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
	# 譜架＋直笛：Ken 站在 recorder_spot，面向左前方（-X 往鏡頭轉 30°），譜架在他面前 0.45 公尺
	var spot := Vector3(-1.7, 0, 2.5)
	var face := Vector3(-cos(deg_to_rad(30)), 0, sin(deg_to_rad(30)))   # Ken 面向
	var ms := spot + face * 0.45
	var stand := Node3D.new()
	stand.name = "MusicStand"   # 本地 +Z＝譜面朝 Ken
	stand.position = ms
	stand.rotation.y = atan2(-face.x, -face.z)
	st.add_child(stand)
	var grey := "#9aa0aa"
	for k in 3:   # 三腳架
		var a := TAU * k / 3.0
		var lg := box(stand, Vector3(0.025, 0.02, 0.24), Vector3(sin(a) * 0.1, 0.03, cos(a) * 0.1), grey)
		lg.rotation = Vector3(0.0, a, 0.0)
	cyl(stand, 0.012, 0.012, 0.84, Vector3(0, 0.44, 0), grey)
	var plate := Node3D.new()   # 譜面：往後仰 20°（上緣離 Ken 遠一點）
	plate.position = Vector3(0, 0.98, 0)
	plate.rotation.x = deg_to_rad(-20)
	stand.add_child(plate)
	for f in [[Vector3(0.4, 0.02, 0.02), Vector3(0, 0.14, 0)], [Vector3(0.4, 0.02, 0.02), Vector3(0, -0.14, 0)], [Vector3(0.02, 0.3, 0.02), Vector3(-0.19, 0, 0)], [Vector3(0.02, 0.3, 0.02), Vector3(0.19, 0, 0)], [Vector3(0.42, 0.02, 0.05), Vector3(0, -0.15, 0.025)]]:
		box(plate, f[0], f[1], grey)   # 細框＋下方托架（譜架背面不再是一大片黑板）
	for xx in [-0.09, 0.0, 0.09]:
		box(plate, Vector3(0.012, 0.28, 0.012), Vector3(xx, 0, -0.004), grey)
	box(plate, Vector3(0.34, 0.25, 0.004), Vector3(0, 0.0, 0.012), "#ffffff")   # 樂譜
	for side in [1, -1]:   # 五線譜＋音符（正反兩面都畫，從背面看也像樂譜）
		var zz: float = 0.012 + side * 0.0035
		for row in 2:
			for k in 5:
				box(plate, Vector3(0.3, 0.003, 0.002), Vector3(0, 0.08 - row * 0.12 - k * 0.012, zz), "#5a5a66")
			for k in 6:
				var nt := box(plate, Vector3(0.014, 0.011, 0.003), Vector3(-0.12 + k * 0.048, 0.08 - row * 0.12 - ((k * 3) % 5) * 0.012, zz + side * 0.001), "#2a2a33")
				nt.rotation.z = deg_to_rad(20)
	# 小凳＋直笛（Ken 右手邊）
	var stool := spot + Vector3(face.z, 0, -face.x) * -0.55   # Ken 的右邊
	cyl(st, 0.12, 0.12, 0.03, stool + Vector3(0.0, 0.42, 0.0), "#e9c48f")
	cyl(st, 0.02, 0.02, 0.41, stool + Vector3(0.0, 0.205, 0.0), "#d4ab72")
	var rec := make_recorder()
	rec.name = "RecorderProp"
	rec.position = stool + Vector3(-0.12, 0.45, 0.0)
	rec.rotation = Vector3(0, 0, -PI / 2)
	st.add_child(rec)
	marker("recorder_spot", spot, 120)   # -Z＝Ken 面向（朝譜架）
	_plant(st, Vector3(-3.2, 0, 2.7), 0.8)

func _open_book(parent: Node3D) -> void:
	# 打開的課本，平放：書背朝 Ken 的前後方向，左右各一頁（本地 x＝左右、z＝前後）；紙面 y=0.021，線條到 0.0215
	for side in [-1, 1]:
		box(parent, Vector3(0.155, 0.012, 0.23), Vector3(side * 0.0775, 0.006, 0), "#2f6fd0")   # 封面
		box(parent, Vector3(0.146, 0.01, 0.214), Vector3(side * 0.0745, 0.016, 0), "#ffffff")   # 紙
		for k in 6:
			if side == 1 and k < 2:
				continue   # 這頁上方放插圖
			box(parent, Vector3(0.11, 0.001, 0.007), Vector3(side * 0.075, 0.021, -0.08 + k * 0.032), "#9aa4b8")
	box(parent, Vector3(0.003, 0.0105, 0.214), Vector3(0, 0.016, 0), "#c9cbd3")   # 中間書溝
	box(parent, Vector3(0.09, 0.001, 0.05), Vector3(0.075, 0.021, -0.067), "#f28c28")   # 頁面插圖

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
## band_r：頭帶水平半徑（-1＝w+0.015；Ken 11/10 依頭髮量出來）；seg：頭帶分幾段
static func make_headphones(w := 0.17, hb := -1.0, band_col := "#e85d4a", cup_col := "#33333b", band_r := -1.0, seg := 10) -> Node3D:
	if hb < 0.0:
		hb = w
	var n := Node3D.new()
	var band := StandardMaterial3D.new()
	band.albedo_color = Color(band_col)
	var cup := StandardMaterial3D.new()
	cup.albedo_color = Color(cup_col)
	var r := w + 0.015 if band_r < 0.0 else band_r
	for k in seg + 1:   # 頭帶：半橢圓
		var a := PI * k / seg
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(PI * r / seg + 0.01, 0.016, 0.04)   # 細一點的頭帶
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

## 直笛半徑剖面：[起, 迄, 起端半徑, 迄端半徑, 顏色]（沿笛身，原點＝吹口）
static func recorder_profile(L := 0.33, r := 0.0125) -> Array:
	return [[0.0, 0.03, r * 0.62, r * 0.95, "#fbf3df"], [0.03, 0.05, r * 0.95, r, "#fbf3df"], [0.05, 0.058, r * 1.03, r * 1.03, "#d9c9a3"],
		[0.058, L - 0.045, r, r * 0.96, "#fbf3df"], [L - 0.045, L - 0.038, r * 1.03, r * 1.03, "#d9c9a3"], [L - 0.038, L - 0.01, r * 0.96, r * 1.3, "#fbf3df"], [L - 0.01, L, r * 1.4, r * 1.4, "#d9c9a3"]]

## 笛身在 s（離吹口距離）的半徑；超出範圍回傳 0
static func recorder_radius(s: float, L := 0.33, r := 0.0125) -> float:
	for p in recorder_profile(L, r):
		if s >= p[0] and s <= p[1]:
			return lerpf(p[2], p[3], (s - p[0]) / (p[1] - p[0]))
	return 0.0

## 直笛（原點＝吹口，沿 +Y 往笛尾）：米白色笛身，吹口、笛身、喇叭口三段，正面（+Z）有深色按孔
static func make_recorder(L := 0.33, r := 0.0125) -> Node3D:
	var n := Node3D.new()
	var hole := StandardMaterial3D.new()
	hole.albedo_color = Color("#4a3a2c")
	for p in recorder_profile(L, r):
		var mi := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.bottom_radius = p[2]   # 圓柱 -Y 端＝靠吹口那端
		cm.top_radius = p[3]
		cm.height = p[1] - p[0]
		cm.radial_segments = 14
		mi.mesh = cm
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(p[4])
		m.roughness = 0.8
		mi.material_override = m
		mi.position = Vector3(0, (p[0] + p[1]) / 2, 0)
		n.add_child(mi)
	var wnd := MeshInstance3D.new()   # 笛頭的氣窗
	var wb := BoxMesh.new()
	wb.size = Vector3(0.008, 0.011, 0.004)
	wnd.mesh = wb
	wnd.material_override = hole
	wnd.position = Vector3(0, 0.04, r - 0.0012)
	n.add_child(wnd)
	var y := 0.075
	while y < L - 0.05:   # 按孔
		var h := MeshInstance3D.new()
		var sm := CylinderMesh.new()
		sm.top_radius = 0.0038
		sm.bottom_radius = 0.0038
		sm.height = 0.003
		sm.radial_segments = 10
		h.mesh = sm
		h.material_override = hole
		h.rotation.x = PI / 2
		h.position = Vector3(0, y, r - 0.0012)
		n.add_child(h)
		y += 0.024
	return n


# ═════════ 水鈴、圳寶的家（和 Ken 同樣的兩個房間、同樣的錨點；家具依各自量到的身體尺寸） ═════════
# 量法：mascot_home_check.gd（PROBE=1）用程式坐姿（大腿水平、小腿垂直、腳掌平）量蒙皮頂點，數字相對「屁股最低點」：
#   水鈴：腳底 -0.143、大腿頂（含裙子）+0.217、肩 +0.333、眼 +0.40、肚子前 z +0.149、頭最前 z +0.218、背 z -0.103、裙背 -0.127；手臂 0.21
#   圳寶：腳底 -0.080、大腿頂 +0.232、肩 +0.343、眼 +0.437、肚子前 z +0.191（膝前 0.187）、頭最前 z +0.331、背 z -0.204；手臂 0.27
# 所以：水鈴坐墊 0.143（腳剛好踩地）；圳寶腿太短 → 坐墊 0.155／椅面 0.158＋腳踏 0.091。
#   圳寶寫字：下巴只比自己的大腿頂高 12 cm → 書桌要比大腿低才有空間：膝蓋彎 60°（小腿＋靴子在桌邊外只到座上 13.6 cm），
#   桌面 0.335（座上 17.7 cm），下巴離桌面約 18 cm；書桌腳踏 0.081；椅面前緣在臀部後 3.5 cm（小腿往後收）。手臂很短 → 桌子邊緣貼著肚子、鍵盤／課本放在桌邊。
#   圳寶的小腿＋大靴子很短（膝蓋只在臀部前 9 cm）：膝蓋彎 90° 時靴子會跑到屁股下面 → 膝蓋只彎 30°（小腿往前斜），
#   靴子在臀部前 2～10 cm、腳底在屁股下 6.3 cm → 坐墊前緣只能在臀部前 1 cm，腳踏 0.091 貼著坐墊前緣。
const MASCOT_DIMS := {
	"shuiling": {"sofa_seat": 0.143, "back_off": -0.132, "back_cushion": [0.027, 0.24], "front_off": 0.045, "chair_front": 0.04, "chair_seat": 0.143, "desk_top": 0.44, "desk_t": 0.02,
		"edge_off": 0.155, "foot": 0.0, "thigh": 90.0, "knee": 90.0, "tv_y": 0.74, "plate_y": 0.62, "stand_d": 0.55, "book_scale": 0.75, "sofa_back_h": 0.42, "rec_len": 0.26},
	"zunbo": {"sofa_seat": 0.155, "back_off": -0.202, "back_cushion": [0.032, 0.16], "front_off": 0.01, "chair_front": -0.035, "chair_seat": 0.158, "desk_top": 0.335, "desk_t": 0.025, "desk_knee": 60.0, "desk_foot": 0.081,
		"edge_off": 0.198, "foot": 0.091, "thigh": 90.0, "knee": 30.0, "tv_y": 0.76, "plate_y": 0.72, "stand_d": 0.72, "stand_az": 25.0, "book_scale": 0.85, "sofa_back_h": 0.52, "rec_len": 0.3},
}

const SHUILING_THEME := {
	"wood": ["#f3e2c7", "#ead5b4"], "wall": "#fbfdff", "wall2": "#dff1fb", "trim": "#bfe3f5", "frame": "#7cc4ea", "glass": "#d9f2ff",
	"door": "#7cc4ea", "sofa": "#8fd0f0", "sofa2": "#a9dcf5", "pillow": "#ffffff", "rug": ["#cdeee0", "#f3e6fb"], "table": "#ffffff", "table2": "#e7eef3",
	"tv_cab": "#ffffff", "desk": "#ffffff", "desk2": "#e9eef2", "chair": "#a9dcf5", "accent": "#f6c453", "shelf": "#ffffff", "curtain": "#cfeafc",
	"phones": ["#f6c453", "#ffffff"],
}
const ZUNBO_THEME := {
	"wood": ["#d9a066", "#cf955a"], "wall": "#f7efd9", "wall2": "#d6efe9", "trim": "#e7d3a8", "frame": "#f28c28", "glass": "#d6f0f7",
	"door": "#f28c28", "sofa": "#2fa39a", "sofa2": "#3cb6ac", "pillow": "#f28c28", "rug": ["#f6b26b", "#fde3c3"], "table": "#b97a45", "table2": "#9c6436",
	"tv_cab": "#b97a45", "desk": "#c98b52", "desk2": "#a86d3c", "chair": "#2fa39a", "accent": "#f28c28", "shelf": "#b97a45", "curtain": "#9fd9cf",
	"phones": ["#f28c28", "#2a7f78"],
}

var T := {}    # 目前的主題顏色
var DM := {}   # 目前的尺寸（量測用的方塊也存在這裡）
var who := ""

func build_shuiling_home() -> Node3D:
	return _mascot_home("shuiling", SHUILING_THEME)

func build_zunbo_home() -> Node3D:
	return _mascot_home("zunbo", ZUNBO_THEME)

func _mascot_home(w: String, theme: Dictionary) -> Node3D:
	who = w
	T = theme
	DM = MASCOT_DIMS[w].duplicate()
	DM["book_top"] = DM["desk_top"] + 0.0215 * DM["book_scale"]
	root = Node3D.new()
	root.name = "ShuilingHome" if w == "shuiling" else "ZunboHome"
	_m_shell()
	_m_living()
	_m_study()
	root.set_meta("dims", DM)
	return root

func sphere(parent: Node3D, r: float, pos: Vector3, col: Variant, sc := Vector3.ONE, hemi := false) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * (1.0 if hemi else 2.0)
	sm.is_hemisphere = hemi
	sm.radial_segments = 16
	sm.rings = 8
	mi.mesh = sm
	mi.material_override = _m(col)
	mi.position = pos
	mi.scale = sc
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

func torus(parent: Node3D, r_in: float, r_out: float, pos: Vector3, col: Variant) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = r_in
	tm.outer_radius = r_out
	tm.rings = 20
	tm.ring_segments = 8
	mi.mesh = tm
	mi.material_override = _m(col)
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

func _glass(col: String, a: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(col, a)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m

# ───────── 地板、牆、門 ─────────
func _m_shell() -> void:
	var fl := Node3D.new()
	fl.name = "Floor"
	root.add_child(fl)
	var i := 0
	var x := -3.5
	while x < 5.0 - 0.01:
		var zlen := 4.0 if x >= 0.0 else 3.0
		box(fl, Vector3(0.25, 0.04, zlen), Vector3(x + 0.125, -0.02, zlen / 2.0), T["wood"][i % 2])
		x += 0.25
		i += 1
	var wall: String = T["wall"]
	var wall2: String = T["wall2"]
	var wl := Node3D.new()
	wl.name = "Walls"
	root.add_child(wl)
	box(wl, Vector3(3.85, WALL_H, 0.1), Vector3(1.925, WALL_H / 2, -0.05), wall)
	box(wl, Vector3(0.25, WALL_H, 0.1), Vector3(4.875, WALL_H / 2, -0.05), wall)
	box(wl, Vector3(0.9, WALL_H - 1.55, 0.1), Vector3(4.3, 1.55 + (WALL_H - 1.55) / 2, -0.05), wall)
	box(wl, Vector3(3.5, WALL_H, 0.1), Vector3(-1.75, WALL_H / 2, -0.05), wall2)
	box(wl, Vector3(0.1, WALL_H, 4.0), Vector3(5.05, WALL_H / 2, 2.0), wall)
	box(wl, Vector3(0.1, WALL_H, 3.0), Vector3(-3.55, WALL_H / 2, 1.5), wall2)
	box(wl, Vector3(0.1, WALL_H, 1.3), Vector3(0, WALL_H / 2, 0.65), wall)
	box(wl, Vector3(0.1, WALL_H, 0.7), Vector3(0, WALL_H / 2, 2.65), wall)
	box(wl, Vector3(0.1, WALL_H - 1.6, 1.0), Vector3(0, 1.6 + (WALL_H - 1.6) / 2, 1.8), wall)
	if who == "shuiling":   # 天藍細腰線
		box(wl, Vector3(3.85, 0.04, 0.012), Vector3(1.925, 0.9, 0.006), T["trim"])
		box(wl, Vector3(0.012, 0.04, 4.0), Vector3(4.994, 0.9, 2.0), T["trim"])
	else:   # 青綠腰板＋橘色線
		box(wl, Vector3(3.85, 0.6, 0.012), Vector3(1.925, 0.3, 0.006), "#bfe3dc")
		box(wl, Vector3(0.012, 0.6, 4.0), Vector3(4.994, 0.3, 2.0), "#bfe3dc")
		box(wl, Vector3(3.85, 0.04, 0.02), Vector3(1.925, 0.6, 0.01), T["accent"])
		box(wl, Vector3(0.02, 0.04, 4.0), Vector3(4.99, 0.6, 2.0), T["accent"])
	box(wl, Vector3(8.5, 0.08, 0.02), Vector3(0.75, 0.04, 0.005), T["trim"])
	box(wl, Vector3(0.02, 0.08, 4.0), Vector3(4.995, 0.04, 2.0), T["trim"])
	box(wl, Vector3(0.02, 0.08, 3.0), Vector3(-3.495, 0.04, 1.5), T["trim"])
	box(wl, Vector3(0.8, 1.5, 0.04), Vector3(4.3, 0.75, -0.01), T["door"])
	if who == "shuiling":   # 門上的小圓窗
		var pw := cyl(wl, 0.12, 0.12, 0.01, Vector3(4.3, 1.15, 0.015), T["glass"], 20)
		pw.rotation.x = PI / 2
		torus(wl, 0.12, 0.15, Vector3(4.3, 1.15, 0.015), "#ffffff").rotation.x = PI / 2
	else:   # 鐵捲門風格橫條
		for k in 9:
			box(wl, Vector3(0.78, 0.015, 0.01), Vector3(4.3, 0.12 + k * 0.15, 0.015), "#d9711c")
	cyl(wl, 0.03, 0.03, 0.03, Vector3(4.6, 0.75, 0.02), "#f2c14e").rotation.x = PI / 2
	marker("door", Vector3(4.3, 0, 0.45), 180)

# ───────── 客廳 ─────────
func _m_living() -> void:
	var lv := Node3D.new()
	lv.name = "LivingRoom"
	root.add_child(lv)
	var S: float = DM["sofa_seat"]
	cyl(lv, 1.15, 1.15, 0.012, Vector3(3.0, 0.006, 2.0), T["rug"][0], 32)   # 圓地毯
	cyl(lv, 0.95, 0.95, 0.014, Vector3(3.0, 0.007, 2.0), T["rug"][1], 32)
	# 沙發：面向 +X；臀部錨點 x=1.9
	var sx := 1.9
	var sofa := Node3D.new()
	sofa.name = "Sofa"
	lv.add_child(sofa)
	var back_front: float = sx + DM["back_off"]
	var seat_front: float = sx + DM["front_off"]
	var bb := back_front - 0.14
	var base_h := S - 0.07
	var c1: String = T["sofa"]
	var c2: String = T["sofa2"]
	box(sofa, Vector3(seat_front - 0.03 - bb, base_h - 0.03, 1.5), Vector3((seat_front - 0.03 + bb) / 2, 0.03 + (base_h - 0.03) / 2, 2.0), c1)
	for k in 3:   # 三個坐墊，前緣用圓柱滾邊（看起來軟）
		var cz := 2.0 + (k - 1) * 0.42
		box(sofa, Vector3(seat_front - back_front - 0.035, 0.07, 0.4), Vector3((seat_front - 0.035 + back_front) / 2, base_h + 0.035, cz), c2)
		var roll := cyl(sofa, 0.035, 0.035, 0.4, Vector3(seat_front - 0.035, base_h + 0.035, cz), c2, 12)
		roll.rotation.x = PI / 2
	var bh: float = DM["sofa_back_h"]
	box(sofa, Vector3(0.14, bh - 0.07, 1.5), Vector3(back_front - 0.07, (bh - 0.07) / 2, 2.0), c1)   # 靠背
	var top := cyl(sofa, 0.07, 0.07, 1.5, Vector3(back_front - 0.07, bh - 0.07, 2.0), c1, 14)
	top.rotation.x = PI / 2
	for side in [-1, 1]:   # 扶手：圓滾筒
		var az: float = 2.0 + side * 0.82
		box(sofa, Vector3(seat_front - bb, S + 0.04, 0.14), Vector3((seat_front + bb) / 2, (S + 0.04) / 2, az), c1)
		var arm := cyl(sofa, 0.07, 0.07, seat_front - bb, Vector3((seat_front + bb) / 2, S + 0.04, az), c1, 14)
		arm.rotation.z = PI / 2
	for lz in [1.36, 2.64]:   # 抱枕
		var pil := box(sofa, Vector3(0.09, 0.2, 0.2), Vector3(back_front + 0.05, S + 0.12, lz), T["pillow"])
		pil.rotation.z = deg_to_rad(-10)
		if who == "shuiling":
			sphere(sofa, 0.03, Vector3(back_front + 0.105, S + 0.13, lz), "#7cc4ea", Vector3(0.5, 1.3, 1))
		else:
			var gear := torus(sofa, 0.025, 0.045, Vector3(back_front + 0.098, S + 0.13, lz), "#2a7f78")
			gear.rotation.z = PI / 2
	DM["sofa_seat_box"] = AABB(Vector3(back_front, base_h, 1.25), Vector3(seat_front - back_front, 0.07, 1.5))
	if DM.has("back_cushion"):   # 圳寶：肩膀、頭比屁股後面多 4.5 cm → 靠背碰肩膀，下面加一塊厚腰墊碰屁股／腰
		var bc: Array = DM["back_cushion"]
		var cth: float = bc[0]
		var chh: float = bc[1]
		var cb := box(sofa, Vector3(cth, chh, 1.2), Vector3(back_front + cth / 2, S + chh / 2, 2.0), T["pillow"], 0.0, "BackCushion")
		var cr := cyl(sofa, cth / 2, cth / 2, 1.2, Vector3(back_front + cth / 2, S + chh, 2.0), T["pillow"], 12)
		cr.rotation.x = PI / 2
		DM["sofa_cushion_box"] = AABB(Vector3(back_front, S, 1.4), Vector3(cth, chh + cth / 2, 1.2))
	DM["sofa_back_box"] = AABB(Vector3(back_front - 0.14, 0, 1.25), Vector3(0.14, bh, 1.5))
	marker("sofa_seat", Vector3(sx, S, 2.0), -90)
	if DM["foot"] > 0.0:   # 腳踏（圳寶腿短，腳放在這上面）：貼著坐墊前緣的長方腳凳
		var f0 := seat_front + 0.005
		var fh: float = DM["foot"]
		box(lv, Vector3(0.17, fh - 0.015, 0.5), Vector3(f0 + 0.085, (fh - 0.015) / 2, 2.0), T["accent"])
		box(lv, Vector3(0.17, 0.015, 0.5), Vector3(f0 + 0.085, fh - 0.0075, 2.0), "#fbd38a")
		DM["sofa_foot_box"] = AABB(Vector3(f0, 0, 1.75), Vector3(0.17, fh, 0.5))
	# 小圓茶几
	var tx := 3.15
	cyl(lv, 0.28, 0.28, 0.03, Vector3(tx, 0.27, 2.0), T["table"], 24)
	cyl(lv, 0.04, 0.04, 0.26, Vector3(tx, 0.13, 2.0), T["table2"], 10)
	cyl(lv, 0.16, 0.16, 0.02, Vector3(tx, 0.01, 2.0), T["table2"], 16)
	cyl(lv, 0.04, 0.035, 0.07, Vector3(tx - 0.08, 0.32, 1.9), "#ffffff")
	box(lv, Vector3(0.12, 0.02, 0.18), Vector3(tx + 0.08, 0.295, 2.1), "#4a4a58")
	# 電視櫃＋電視（右牆）
	var tvy: float = DM["tv_y"]
	box(lv, Vector3(0.4, 0.3, 1.5), Vector3(4.78, 0.15, 2.0), T["tv_cab"])
	box(lv, Vector3(0.41, 0.02, 1.52), Vector3(4.78, 0.305, 2.0), T["accent"] if who == "zunbo" else "#a9dcf5")
	for dz in [-0.38, 0.38]:
		box(lv, Vector3(0.01, 0.2, 0.66), Vector3(4.575, 0.15, 2.0 + dz), T["table2"] if who == "zunbo" else "#e7f4fb")
	box(lv, Vector3(0.18, 0.03, 0.3), Vector3(4.8, 0.33, 2.0), "#33333b")
	var nh := tvy - 0.3 - 0.33
	box(lv, Vector3(0.04, nh, 0.06), Vector3(4.8, 0.33 + nh / 2, 2.0), "#33333b")
	box(lv, Vector3(0.05, 0.6, 1.04), Vector3(4.8, tvy, 2.0), "#22222a" if who == "zunbo" else "#f4f8fb")
	var tvm := marker("tv_screen", Vector3(4.77, tvy, 2.0), 90)
	var tvs := screen(tvm, "TVScreen", Vector2(0.96, 0.52), Color("#7fd3f7"))
	tvs.rotation.y = PI
	var cart := Node3D.new()
	cart.name = "TVCartoon"
	tvm.add_child(cart)
	var g := box(cart, Vector3(0.96, 0.15, 0.002), Vector3(0, -0.185, -0.004), "#7ccf6a")
	g.material_override = _m("#7ccf6a", 0.6)
	var sun := cyl(cart, 0.07, 0.07, 0.002, Vector3(0.28, 0.12, -0.004), "#ffd84a")
	sun.rotation.x = PI / 2
	sun.material_override = _m("#ffd84a", 0.6)
	tvm.set_meta("cartoon", cart)
	# 邊桌＋耳機（沙發靠鏡頭那端）
	var sty := S + 0.17
	cyl(lv, 0.17, 0.17, 0.03, Vector3(1.95, sty, 3.12), T["table"], 20)
	cyl(lv, 0.025, 0.025, sty, Vector3(1.95, sty / 2, 3.12), T["table2"], 8)
	cyl(lv, 0.12, 0.12, 0.02, Vector3(1.95, 0.01, 3.12), T["table2"], 16)
	var hpm := marker("headphones", Vector3(1.95, sty + 0.015, 3.12), -90)
	var hp := make_headphones(0.14, -1.0, T["phones"][0], T["phones"][1])
	hp.name = "HeadphonesProp"
	hp.rotation.x = deg_to_rad(-90)
	hp.position.y = 0.035
	hpm.add_child(hp)
	# 窗戶（後牆）
	box(lv, Vector3(1.2, 0.85, 0.02), Vector3(2.1, 1.2, 0.01), T["glass"])
	var fr: String = T["frame"]
	for f in [[Vector3(1.28, 0.06, 0.05), Vector3(2.1, 1.65, 0.025)], [Vector3(1.28, 0.06, 0.05), Vector3(2.1, 0.75, 0.025)], [Vector3(0.05, 0.9, 0.05), Vector3(1.475, 1.2, 0.025)], [Vector3(0.05, 0.9, 0.05), Vector3(2.725, 1.2, 0.025)], [Vector3(0.04, 0.85, 0.04), Vector3(2.1, 1.2, 0.025)]]:
		box(lv, f[0], f[1], fr)
	box(lv, Vector3(1.5, 0.04, 0.16), Vector3(2.1, 0.72, 0.08), fr)   # 窗台
	if who == "shuiling":
		box(lv, Vector3(1.9, 0.03, 0.03), Vector3(2.1, 1.82, 0.08), "#ffffff")
		for cx in [1.3, 2.9]:
			box(lv, Vector3(0.32, 1.2, 0.04), Vector3(cx, 1.2, 0.09), T["curtain"])
		for k in 3:   # 窗台上的水生植物
			_water_plant(lv, Vector3(1.75 + k * 0.35, 0.74, 0.09), 0.55 + 0.1 * (k % 2))
	else:   # 綠白條紋遮陽篷（呼應外觀）
		for k in 8:
			var aw := box(lv, Vector3(0.17, 0.03, 0.3), Vector3(1.505 + k * 0.17, 1.78, 0.15), "#4caf50" if k % 2 == 0 else "#ffffff")
			aw.rotation.x = deg_to_rad(25)
		_plant(lv, Vector3(1.75, 0.74, 0.09), 0.45)
		_robot_model(lv, Vector3(2.45, 0.74, 0.09), 0.6)
	# 掛鐘
	var clk := Node3D.new()
	clk.position = Vector3(3.45, 1.62, 0.0)
	lv.add_child(clk)
	cyl(clk, 0.16, 0.16, 0.03, Vector3(0, 0, 0.02), "#ffffff", 24).rotation.x = PI / 2
	cyl(clk, 0.18, 0.18, 0.02, Vector3(0, 0, 0.01), T["frame"], 24).rotation.x = PI / 2
	box(clk, Vector3(0.015, 0.1, 0.01), Vector3(0, 0.045, 0.04), "#33333b")
	box(clk, Vector3(0.015, 0.13, 0.01), Vector3(0.05, -0.03, 0.045), "#33333b").rotation.z = deg_to_rad(120)
	for k in 12:
		var a := TAU * k / 12.0
		box(clk, Vector3(0.012, 0.025, 0.01), Vector3(sin(a) * 0.13, cos(a) * 0.13, 0.04), "#7a7a86").rotation.z = -a
	if who == "shuiling":
		_shuiling_living_extras(lv)
	else:
		_zunbo_living_extras(lv)

func _water_plant(parent: Node3D, p: Vector3, s: float) -> void:
	cyl(parent, 0.07 * s, 0.055 * s, 0.13 * s, p + Vector3(0, 0.065 * s, 0), "#ffffff", 14)
	cyl(parent, 0.063 * s, 0.063 * s, 0.01, p + Vector3(0, 0.125 * s, 0), "#7fd3f7", 14)
	for k in 6:   # 細長水草葉
		var a := TAU * k / 6.0
		var l := box(parent, Vector3(0.018, 0.34, 0.008) * s, p + Vector3(sin(a) * 0.025, 0.28, cos(a) * 0.025) * s, "#5cbf6a" if k % 2 == 0 else "#3fa45a")
		l.rotation = Vector3(cos(a) * 0.25, a, -sin(a) * 0.25)

func _rice_ears(parent: Node3D, p: Vector3) -> void:
	cyl(parent, 0.045, 0.035, 0.12, p + Vector3(0, 0.06, 0), "#7cc4ea", 14)   # 小花瓶
	for k in 5:
		var a := (k - 2) * 0.22
		var stem := cyl(parent, 0.003, 0.003, 0.22, p + Vector3(sin(a) * 0.05, 0.22, 0), "#c9a227", 5)
		stem.rotation.z = -a
		for j in 4:   # 稻穗顆粒
			var q := p + Vector3(sin(a) * (0.09 + j * 0.018), 0.31 + j * 0.018 * cos(a), 0)
			sphere(parent, 0.011, q, "#f2c14e", Vector3(1, 1.5, 1))

func _shuiling_living_extras(lv: Node3D) -> void:
	# 小魚缸（後牆、門左邊的白櫃上）
	var ax := 3.45
	box(lv, Vector3(0.7, 0.36, 0.34), Vector3(ax, 0.18, 0.22), "#ffffff")
	box(lv, Vector3(0.72, 0.02, 0.36), Vector3(ax, 0.37, 0.22), "#a9dcf5")
	var tank := Node3D.new()
	tank.name = "Aquarium"
	tank.position = Vector3(ax, 0.38, 0.22)
	lv.add_child(tank)
	var water := MeshInstance3D.new()
	var wm := BoxMesh.new()
	wm.size = Vector3(0.6, 0.3, 0.26)
	water.mesh = wm
	water.material_override = _glass("#7fd3f7", 0.4)
	water.position = Vector3(0, 0.15, 0)
	water.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tank.add_child(water)
	box(tank, Vector3(0.62, 0.015, 0.28), Vector3(0, 0.0075, 0), "#7cc4ea")
	box(tank, Vector3(0.62, 0.015, 0.28), Vector3(0, 0.31, 0), "#7cc4ea")
	box(tank, Vector3(0.58, 0.03, 0.24), Vector3(0, 0.03, 0), "#e8d9b0")   # 沙
	for k in 4:   # 水草
		var l := box(tank, Vector3(0.02, 0.18 + 0.04 * (k % 2), 0.01), Vector3(-0.22 + k * 0.13, 0.13, -0.05 + 0.03 * (k % 2)), "#3fa45a")
		l.rotation.z = deg_to_rad(-8 + 6 * k)
	for f in [[Vector3(-0.1, 0.17, 0.05), "#f28c28", 1], [Vector3(0.12, 0.22, 0.0), "#ff9f43", -1], [Vector3(0.0, 0.1, -0.06), "#ef7fa8", 1]]:   # 小魚
		var fp: Vector3 = f[0]
		var dir: float = f[2]
		sphere(tank, 0.025, fp, f[1], Vector3(1.6, 1.0, 0.6))
		var tail := box(tank, Vector3(0.002, 0.03, 0.02), fp + Vector3(-0.045 * dir, 0, 0), f[1])
		tail.rotation.y = PI / 2
		sphere(tank, 0.005, fp + Vector3(0.025 * dir, 0.008, 0.013), "#22222a")
	# 牆上層架：故事書＋稻穗
	var shx := 0.85
	box(lv, Vector3(0.9, 0.025, 0.2), Vector3(shx, 1.25, 0.1), "#ffffff")
	box(lv, Vector3(0.9, 0.025, 0.2), Vector3(shx, 0.85, 0.1), "#ffffff")
	var cols := ["#7cc4ea", "#f6c453", "#9ad07a", "#ef7fa8", "#b9a6e8", "#ffffff"]
	for row in 2:
		var bx := shx - 0.4
		var k := 0
		while bx < shx + (0.05 if row == 0 else 0.4):
			var wdt := 0.04 + 0.01 * (k % 3)
			var hh := 0.17 + 0.03 * ((k * 7) % 3)
			box(lv, Vector3(wdt, hh, 0.15), Vector3(bx + wdt / 2, (1.2625 if row == 0 else 0.8625) + hh / 2, 0.1), cols[k % cols.size()])
			bx += wdt + 0.006
			k += 1
	_rice_ears(lv, Vector3(shx + 0.25, 1.2625, 0.1))
	# 雨鞋一雙（門口右邊）
	for k in 2:
		var bxz := Vector3(4.85 - k * 0.11, 0, 0.42)
		box(lv, Vector3(0.16, 0.035, 0.08), bxz + Vector3(-0.03, 0.0175, 0), "#f6c453")
		cyl(lv, 0.04, 0.04, 0.16, bxz + Vector3(0, 0.08, 0.0), "#f6c453", 12)
		cyl(lv, 0.042, 0.042, 0.02, bxz + Vector3(0, 0.15, 0.0), "#ffffff", 12)
	# 落地燈（圓燈罩）
	cyl(lv, 0.13, 0.13, 0.03, Vector3(0.5, 0.015, 0.45), "#ffffff")
	cyl(lv, 0.018, 0.018, 1.2, Vector3(0.5, 0.62, 0.45), "#bfe3f5")
	var shade := sphere(lv, 0.15, Vector3(0.5, 1.3, 0.45), "#ffffff", Vector3(1, 1.2, 1))
	shade.material_override = _m("#fff8e0", 0.5)
	# 陶水缸（浮葉）
	cyl(lv, 0.2, 0.16, 0.36, Vector3(4.6, 0.18, 3.55), "#5b8fb0", 18)
	cyl(lv, 0.19, 0.19, 0.01, Vector3(4.6, 0.355, 3.55), "#7fd3f7", 18)
	cyl(lv, 0.05, 0.05, 0.006, Vector3(4.55, 0.362, 3.5), "#5cbf6a", 10)
	cyl(lv, 0.04, 0.04, 0.006, Vector3(4.67, 0.362, 3.6), "#5cbf6a", 10)

func _robot_model(parent: Node3D, p: Vector3, s: float) -> void:
	box(parent, Vector3(0.16, 0.13, 0.12) * s, p + Vector3(0, 0.25, 0) * s, "#2fa39a")   # 頭
	box(parent, Vector3(0.12, 0.08, 0.005) * s, p + Vector3(0, 0.25, 0.061) * s, "#fdf6e3")   # 螢幕臉
	for e in [-0.03, 0.03]:
		sphere(parent, 0.012 * s, p + Vector3(e, 0.26, 0.064) * s, "#22222a")
	box(parent, Vector3(0.1, 0.1, 0.08) * s, p + Vector3(0, 0.13, 0) * s, "#fdf6e3")   # 身體
	torus(parent, 0.015 * s, 0.03 * s, p + Vector3(0, 0.13, 0.042) * s, "#f28c28").rotation.x = PI / 2
	for e in [-0.035, 0.035]:
		box(parent, Vector3(0.035, 0.08, 0.05) * s, p + Vector3(e, 0.04, 0) * s, "#2fa39a")
	cyl(parent, 0.02 * s, 0.02 * s, 0.03 * s, p + Vector3(0, 0.33, 0) * s, "#f28c28")

func _gear(parent: Node3D, p: Vector3, r: float, col: String) -> Node3D:
	var gn := Node3D.new()
	gn.position = p
	parent.add_child(gn)
	cyl(gn, r, r, 0.025, Vector3.ZERO, col, 16).rotation.x = PI / 2
	for k in 8:
		var a := TAU * k / 8.0
		var t := box(gn, Vector3(r * 0.35, r * 0.3, 0.025), Vector3(sin(a) * r, cos(a) * r, 0), col)
		t.rotation.z = -a
	cyl(gn, r * 0.3, r * 0.3, 0.03, Vector3.ZERO, "#4a4a58", 10).rotation.x = PI / 2
	return gn

func _zunbo_living_extras(lv: Node3D) -> void:
	# 工具洞洞板（後牆，窗戶左邊）
	var px := 0.8
	box(lv, Vector3(0.9, 0.6, 0.02), Vector3(px, 1.25, 0.01), "#e8c99a")
	for ix in 8:
		for iy in 5:
			box(lv, Vector3(0.012, 0.012, 0.004), Vector3(px - 0.385 + ix * 0.11, 1.03 + iy * 0.11, 0.022), "#b08a58")
	var ink := "#3a3a44"
	var wr := box(lv, Vector3(0.03, 0.26, 0.012), Vector3(px - 0.3, 1.25, 0.03), ink)   # 板手
	wr.rotation.z = deg_to_rad(10)
	cyl(lv, 0.04, 0.04, 0.012, Vector3(px - 0.322, 1.38, 0.03), ink).rotation.x = PI / 2
	box(lv, Vector3(0.025, 0.3, 0.012), Vector3(px - 0.12, 1.22, 0.03), "#b97a45")   # 鐵鎚
	box(lv, Vector3(0.13, 0.05, 0.016), Vector3(px - 0.12, 1.37, 0.03), ink)
	box(lv, Vector3(0.03, 0.12, 0.016), Vector3(px + 0.06, 1.33, 0.03), T["accent"])   # 螺絲起子
	box(lv, Vector3(0.01, 0.14, 0.012), Vector3(px + 0.06, 1.2, 0.03), ink)
	for sgn in [-1, 1]:   # 鉗子
		var pl := box(lv, Vector3(0.018, 0.22, 0.012), Vector3(px + 0.25 + sgn * 0.02, 1.24, 0.03), ink)
		pl.rotation.z = deg_to_rad(sgn * 8)
	# 水車／方向盤裝飾（和他胸口一樣）
	var wh := Node3D.new()
	wh.name = "WheelDecor"
	wh.position = Vector3(3.45, 1.15, 0.03)
	lv.add_child(wh)
	torus(wh, 0.13, 0.17, Vector3.ZERO, T["accent"]).rotation.x = PI / 2
	for k in 3:
		var a := TAU * k / 3.0 + PI / 2
		box(wh, Vector3(0.025, 0.14, 0.02), Vector3(cos(a) * 0.07, sin(a) * 0.07, 0), T["accent"]).rotation.z = a - PI / 2
	cyl(wh, 0.04, 0.04, 0.03, Vector3.ZERO, "#f6c453", 14).rotation.x = PI / 2
	# 安全帽（門邊掛鉤）
	box(lv, Vector3(0.03, 0.03, 0.1), Vector3(4.82, 1.32, 0.05), "#4a4a58")
	sphere(lv, 0.13, Vector3(4.82, 1.18, 0.13), "#9fe2c8", Vector3(1, 1, 1), true)
	box(lv, Vector3(0.2, 0.05, 0.01), Vector3(4.82, 1.24, 0.262), "#4a4a58")   # 護目鏡
	cyl(lv, 0.135, 0.135, 0.012, Vector3(4.82, 1.18, 0.13), "#7fcfb2", 18)
	# 齒輪櫃（門左邊）
	box(lv, Vector3(0.6, 0.55, 0.3), Vector3(3.45, 0.275, 0.2), T["shelf"])
	box(lv, Vector3(0.56, 0.02, 0.28), Vector3(3.45, 0.28, 0.21), T["table2"])
	_gear(lv, Vector3(3.3, 0.42, 0.3), 0.07, "#f28c28")
	_gear(lv, Vector3(3.44, 0.38, 0.3), 0.045, "#2fa39a")
	box(lv, Vector3(0.14, 0.1, 0.12), Vector3(3.6, 0.34, 0.2), "#4a4a58")   # 小工具箱
	box(lv, Vector3(0.06, 0.015, 0.02), Vector3(3.6, 0.395, 0.2), T["accent"])
	_gear(lv, Vector3(3.35, 0.13, 0.36), 0.05, "#f6c453")
	_robot_model(lv, Vector3(3.5, 0.55, 0.2), 0.8)
	# 立燈、盆栽
	cyl(lv, 0.13, 0.13, 0.03, Vector3(0.5, 0.015, 0.45), "#4a4a58")
	cyl(lv, 0.02, 0.02, 1.2, Vector3(0.5, 0.62, 0.45), "#4a4a58")
	var shade := cyl(lv, 0.11, 0.18, 0.22, Vector3(0.5, 1.3, 0.45), "#fde3c3")
	shade.material_override = _m("#fff1c9", 0.5)
	_plant(lv, Vector3(4.65, 0, 3.55), 0.9)

# ───────── 書房 ─────────
func _m_study() -> void:
	var st := Node3D.new()
	st.name = "Study"
	root.add_child(st)
	var DT: float = DM["desk_top"]
	var dt: float = DM["desk_t"]
	cyl(st, 0.7, 0.7, 0.012, Vector3(-1.6, 0.006, 2.1), "#cdeee0" if who == "shuiling" else "#fde3c3", 28)
	var dx0 := -3.5
	var depth := 0.55
	var dfront := dx0 + depth
	var z0 := 0.45
	var z1 := 1.95
	var c: String = T["desk"]
	var c2: String = T["desk2"]
	box(st, Vector3(depth, dt, z1 - z0), Vector3(dx0 + depth / 2, DT - dt / 2, (z0 + z1) / 2), c, 0.0, "DeskTop")
	if who == "zunbo":   # 工作台：粗木腳、下層板、前緣橘色條
		for zz in [z0 + 0.04, z1 - 0.04]:
			for xx in [dx0 + 0.05, dfront - 0.05]:
				box(st, Vector3(0.05, DT - dt, 0.05), Vector3(xx, (DT - dt) / 2, zz), c2)
		box(st, Vector3(depth - 0.2, 0.02, z1 - z0 - 0.1), Vector3(dx0 + (depth - 0.2) / 2 + 0.02, 0.1, (z0 + z1) / 2), c2)
		box(st, Vector3(0.012, dt, z1 - z0), Vector3(dfront + 0.006, DT - dt / 2, (z0 + z1) / 2), T["accent"])
		for k in 3:   # 下層零件箱
			box(st, Vector3(0.14, 0.08, 0.16), Vector3(dx0 + 0.1, 0.15, z0 + 0.55 + k * 0.2), ["#f28c28", "#2fa39a", "#f6c453"][k])
	else:   # 白書桌：兩側面板
		for zz in [z0 + 0.02, z1 - 0.02]:
			box(st, Vector3(depth, DT - dt, 0.03), Vector3(dx0 + depth / 2, (DT - dt) / 2, zz), c2)
		box(st, Vector3(0.02, 0.12, z1 - z0 - 0.06), Vector3(dx0 + 0.03, DT - dt - 0.06, (z0 + z1) / 2), c2)
	# 電腦（z 0.88）：水鈴＝筆電，圳寶＝桌上型
	var pcz := 0.88
	if who == "shuiling":
		var bx := dfront - 0.115   # 筆電底座中心（前緣離桌邊 1 cm）
		box(st, Vector3(0.21, 0.012, 0.3), Vector3(bx, DT + 0.006, pcz), "#e9eef2", 0.0, "LaptopBase")
		var kx := bx + 0.025
		box(st, Vector3(0.11, 0.003, 0.26), Vector3(kx, DT + 0.0135, pcz), "#c9d3dc")
		for r in 3:
			box(st, Vector3(0.022, 0.003, 0.24), Vector3(kx - 0.035 + r * 0.035, DT + 0.0165, pcz), "#ffffff")
		var lid := Node3D.new()   # 螢幕往後仰 15°
		lid.name = "LaptopLid"
		lid.position = Vector3(bx - 0.105, DT + 0.012, pcz)
		lid.rotation.z = deg_to_rad(15)
		st.add_child(lid)
		box(lid, Vector3(0.012, 0.2, 0.3), Vector3(-0.006, 0.1, 0), "#e9eef2")
		var pcm := marker("computer_screen", Vector3.ZERO, -90)   # 錨點在 root，位置＝筆電螢幕中心（跟著螢幕仰角）
		pcm.transform = lid.transform * Transform3D(Basis(Vector3.UP, deg_to_rad(-90)), Vector3(0.001, 0.105, 0))
		var pcs := screen(pcm, "PCScreen", Vector2(0.27, 0.17), Color("#9fe0ff"))
		pcs.rotation.y = PI
		_web_blocks(pcm, 0.6)
		DM["kb_top"] = DT + 0.018
		DM["kb_box"] = AABB(Vector3(bx - 0.105, DT, pcz - 0.15), Vector3(0.21, 0.018, 0.3))
	else:
		var mx := dx0 + 0.13
		var mon_y: float = DT + 0.24
		box(st, Vector3(0.16, 0.012, 0.22), Vector3(mx, DT + 0.006, pcz), "#4a4a58")
		box(st, Vector3(0.03, 0.12, 0.04), Vector3(mx, DT + 0.06, pcz), "#4a4a58")
		box(st, Vector3(0.03, 0.27, 0.44), Vector3(mx, mon_y, pcz), "#2a7f78")
		var pcm := marker("computer_screen", Vector3(mx + 0.016, mon_y, pcz), -90)
		var pcs := screen(pcm, "PCScreen", Vector2(0.4, 0.23), Color("#9fe0ff"))
		pcs.rotation.y = PI
		_web_blocks(pcm, 0.9)
		var kx := dfront - 0.07
		box(st, Vector3(0.12, 0.016, 0.3), Vector3(kx, DT + 0.008, pcz), "#f4f4f4", 0.0, "Keyboard")
		for r in 3:
			box(st, Vector3(0.022, 0.006, 0.27), Vector3(kx - 0.035 + r * 0.035, DT + 0.019, pcz), "#c9cbd3")
		DM["kb_top"] = DT + 0.022
		DM["kb_box"] = AABB(Vector3(kx - 0.06, DT, pcz - 0.15), Vector3(0.12, 0.022, 0.3))
		box(st, Vector3(0.3, 0.3, 0.16), Vector3(dx0 + 0.17, 0.26, z0 + 0.12), "#4a4a58")   # 主機（下層板上）
		box(st, Vector3(0.005, 0.03, 0.03), Vector3(dx0 + 0.32, 0.36, z0 + 0.12), "#7fd3f7")
	var mouse := box(st, Vector3(0.06, 0.022, 0.04), Vector3(dfront - 0.07, DT + 0.011, pcz - 0.26), "#f4f4f4")
	mouse.name = "Mouse"
	box(st, Vector3(0.16, 0.004, 0.14), Vector3(dfront - 0.07, DT + 0.002, pcz - 0.26), T["frame"])
	var es: float = DM["edge_off"]
	marker("desk_seat", Vector3(dfront + es, DM["chair_seat"], pcz), 90)
	# 課本（z 1.55）：前緣離桌邊 1 公分
	var bkz := 1.55
	var bs: float = DM["book_scale"]
	var bk := marker("book", Vector3(dfront - 0.115 * bs - 0.002, DT, bkz), 90)   # 手臂短：課本前緣貼著桌邊
	_open_book_s(bk, bs)
	var pen := cyl(bk, 0.0045, 0.0045, 0.13, Vector3(0.2 * bs, 0.0045, 0.02), "#ffcc00", 6)
	pen.name = "Pencil"
	pen.rotation = Vector3(PI / 2, deg_to_rad(12), 0)
	marker("desk_seat_book", Vector3(dfront + es, DM["chair_seat"], bkz), 90)
	DM["book_box"] = AABB(Vector3(bk.position.x - 0.115 * bs, DT, bkz - 0.155 * bs), Vector3(0.23 * bs, 0.0215 * bs, 0.31 * bs))
	DM["desk_box"] = AABB(Vector3(dx0, DT - dt, z0), Vector3(depth, dt, z1 - z0))
	DM["dfront"] = dfront
	cyl(st, 0.035, 0.03, 0.09, Vector3(dx0 + 0.1, DT + 0.045, 1.85), T["accent"])   # 筆筒
	for k in 3:
		cyl(st, 0.0045, 0.0045, 0.12, Vector3(dx0 + 0.09 + k * 0.012, DT + 0.11, 1.85 + (k - 1) * 0.01), ["#3d7be0", "#4caf50", "#f6c453"][k], 6)
	# 椅子（電腦位置；寫功課時 home_check 把它移到課本那邊）
	var chair := _mascot_chair()
	chair.name = "DeskChair"
	chair.position = Vector3(dfront + es, 0, pcz)
	chair.rotation.y = deg_to_rad(90)
	st.add_child(chair)
	if DM["foot"] > 0.0:   # 書桌下的腳踏板（跟著椅子移；椅子本地 -Z＝前方）：靴子在臀部前 0～15 cm
		var fh: float = DM.get("desk_foot", DM["foot"])
		box(chair, Vector3(0.44, fh - 0.01, 0.17), Vector3(0, (fh - 0.01) / 2, -0.075), "#2a7f78", 0.0, "Footrest")
		box(chair, Vector3(0.44, 0.01, 0.17), Vector3(0, fh - 0.005, -0.075), "#8fd9cf")
		DM["desk_foot_local"] = AABB(Vector3(-0.22, 0, -0.16), Vector3(0.44, fh, 0.17))
	# 窗（左牆）
	box(st, Vector3(0.02, 0.6, 0.8), Vector3(-3.49, 1.25, 1.2), T["glass"])
	for f in [[Vector3(0.05, 0.05, 0.88), Vector3(-3.47, 1.575, 1.2)], [Vector3(0.05, 0.05, 0.88), Vector3(-3.47, 0.925, 1.2)], [Vector3(0.05, 0.65, 0.05), Vector3(-3.47, 1.25, 0.785)], [Vector3(0.05, 0.65, 0.05), Vector3(-3.47, 1.25, 1.615)], [Vector3(0.04, 0.6, 0.03), Vector3(-3.47, 1.25, 1.2)]]:
		box(st, f[0], f[1], T["frame"])
	# 書櫃（後牆）
	var shx := -1.1
	var sc: String = T["shelf"]
	box(st, Vector3(0.9, 1.2, 0.02), Vector3(shx, 0.6, 0.02), "#eef6fb" if who == "shuiling" else "#e8c99a")
	for sx2 in [-0.44, 0.44]:
		box(st, Vector3(0.025, 1.22, 0.3), Vector3(shx + sx2, 0.61, 0.16), sc)
	var cols := ["#7cc4ea", "#f6c453", "#9ad07a", "#ef7fa8", "#b9a6e8", "#ffffff"] if who == "shuiling" else ["#f28c28", "#2fa39a", "#f6c453", "#4a4a58", "#e85d4a", "#7fd3f7"]
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	for row in 4:
		var y0 := 0.05 + row * 0.38
		box(st, Vector3(0.86, 0.025, 0.28), Vector3(shx, minf(y0, 1.2), 0.18), sc)
		if row >= 3:
			break
		if who == "zunbo" and row == 1:   # 零件盒一排
			for k in 4:
				box(st, Vector3(0.18, 0.12, 0.22), Vector3(shx - 0.3 + k * 0.2, y0 + 0.0725, 0.17), cols[k])
				box(st, Vector3(0.06, 0.02, 0.005), Vector3(shx - 0.3 + k * 0.2, y0 + 0.09, 0.282), "#ffffff")
			continue
		var bx2 := shx - 0.4
		while bx2 < shx + 0.38:
			var wdt := rng.randf_range(0.035, 0.06)
			var hh := rng.randf_range(0.2, 0.3)
			box(st, Vector3(wdt, hh, 0.2), Vector3(bx2 + wdt / 2, y0 + 0.0125 + hh / 2, 0.15), cols[rng.randi() % cols.size()])
			bx2 += wdt + 0.004
	if who == "shuiling":
		_rice_ears(st, Vector3(shx + 0.25, 1.2125, 0.17))
		box(st, Vector3(0.6, 0.8, 0.01), Vector3(-2.55, 1.35, 0.01), "#ffffff")   # 海報：彩虹＋雨滴
		box(st, Vector3(0.52, 0.7, 0.012), Vector3(-2.55, 1.35, 0.012), "#bfe6fb")
		for k in 3:
			torus(st, 0.17 - k * 0.04, 0.2 - k * 0.04, Vector3(-2.55, 1.2, 0.012), ["#f6c453", "#9ad07a", "#7cc4ea"][k]).rotation.x = PI / 2
		box(st, Vector3(0.52, 0.2, 0.03), Vector3(-2.55, 1.1, 0.02), "#bfe6fb")
		for k in 3:
			sphere(st, 0.03, Vector3(-2.7 + k * 0.15, 1.58 - 0.04 * (k % 2), 0.02), "#7cc4ea", Vector3(1, 1.4, 0.4))
	else:
		_gear(st, Vector3(shx - 0.2, 1.3, 0.17), 0.06, "#f28c28")
		_robot_model(st, Vector3(shx + 0.2, 1.2125, 0.17), 0.7)
		box(st, Vector3(0.6, 0.8, 0.01), Vector3(-2.55, 1.35, 0.01), "#ffffff")   # 海報：機器人藍圖
		box(st, Vector3(0.52, 0.7, 0.012), Vector3(-2.55, 1.35, 0.012), "#3d7be0")
		box(st, Vector3(0.18, 0.15, 0.014), Vector3(-2.55, 1.47, 0.014), "#ffffff")
		box(st, Vector3(0.14, 0.11, 0.016), Vector3(-2.55, 1.47, 0.016), "#3d7be0")
		box(st, Vector3(0.12, 0.14, 0.014), Vector3(-2.55, 1.29, 0.014), "#ffffff")
		torus(st, 0.02, 0.035, Vector3(-2.55, 1.29, 0.02), "#3d7be0").rotation.x = PI / 2
		for e in [-0.1, 0.1]:
			box(st, Vector3(0.05, 0.12, 0.014), Vector3(-2.55 + e, 1.3, 0.014), "#ffffff")
	_music_stand(st)
	if who == "shuiling":
		_water_plant(st, Vector3(-3.2, 0, 2.7), 1.6)
	else:
		_plant(st, Vector3(-3.2, 0, 2.7), 0.75)

func _web_blocks(pcm: Node3D, s: float) -> void:
	for wb in [[Vector2(0, 0.09), Vector2(0.42, 0.05), "#3d7be0"], [Vector2(-0.1, -0.02), Vector2(0.18, 0.12), "#ffd84a"], [Vector2(0.1, -0.01), Vector2(0.16, 0.03), "#ffffff"], [Vector2(0.1, -0.06), Vector2(0.16, 0.03), "#ffffff"]]:
		var b := box(pcm, Vector3(wb[1].x * s, wb[1].y * s, 0.002), Vector3(-wb[0].x * s, wb[0].y * s, -0.004), wb[2])
		b.material_override = _m(wb[2], 0.5)

func _open_book_s(parent: Node3D, s: float) -> void:
	var holder := Node3D.new()
	holder.name = "BookMesh"
	holder.scale = Vector3.ONE * s
	parent.add_child(holder)
	_open_book(holder)

## 吉祥物的書桌椅（原點＝地面、臀部正下方；角色面向 -Z 坐）
func _mascot_chair() -> Node3D:
	var c := Node3D.new()
	var S: float = DM["chair_seat"]
	var col: String = T["chair"]
	var bo: float = -DM["back_off"]   # 背到臀部的距離
	var front: float = DM["chair_front"]   # 椅面前緣在臀部前方（要在小腿後面）
	if who == "shuiling":   # 淺藍軟椅：圓滾邊椅面＋低靠背
		box(c, Vector3(0.3, 0.04, bo + front - 0.02), Vector3(0, S - 0.02, (bo - front + 0.02) * 0.5), col)
		var rr := cyl(c, 0.02, 0.02, 0.3, Vector3(0, S - 0.02, -front + 0.02), col, 10)
		rr.rotation.z = PI / 2
		box(c, Vector3(0.28, 0.22, 0.03), Vector3(0, S + 0.13, bo + 0.015), col)
		var tp := cyl(c, 0.025, 0.025, 0.28, Vector3(0, S + 0.24, bo + 0.015), col, 10)
		tp.rotation.z = PI / 2
		for lx in [-0.12, 0.12]:
			for lz in [-0.05, bo]:
				cyl(c, 0.014, 0.012, S - 0.04, Vector3(lx, (S - 0.04) / 2, lz), "#ffffff", 8)
	else:   # 青綠色圓凳＋矮靠背
		var rr := (bo + front) * 0.5
		var cz := (bo - front) * 0.5
		cyl(c, rr, rr, 0.04, Vector3(0, S - 0.02, cz), col, 20)
		torus(c, rr - 0.015, rr + 0.005, Vector3(0, S - 0.02, cz), "#2a7f78")
		box(c, Vector3(0.26, 0.12, 0.03), Vector3(0, S + 0.11, bo + 0.02), col)
		box(c, Vector3(0.03, 0.1, 0.03), Vector3(0, S + 0.02, bo + 0.02), "#4a4a58")
		cyl(c, 0.025, 0.025, S - 0.06, Vector3(0, (S - 0.06) / 2 + 0.02, cz), "#4a4a58", 10)
		cyl(c, 0.13, 0.13, 0.02, Vector3(0, 0.01, cz), "#4a4a58", 16)
	return c

func _music_stand(st: Node3D) -> void:
	var spot := Vector3(-1.7, 0, 2.5)
	var face := Vector3(-cos(deg_to_rad(30)), 0, sin(deg_to_rad(30)))
	var sface := face.rotated(Vector3.UP, deg_to_rad(DM.get("stand_az", 0.0)))   # 圳寶：譜架放在左前方 25°，從右前方拍得到臉
	var ms: Vector3 = spot + sface * DM["stand_d"]   # 吉祥物頭很大、臉在身體前面：譜架放遠一點
	var stand := Node3D.new()
	stand.name = "MusicStand"
	stand.position = ms
	stand.rotation.y = atan2(-sface.x, -sface.z)
	st.add_child(stand)
	var grey := "#9aa0aa" if who == "zunbo" else "#ffffff"
	var py: float = DM["plate_y"]
	for k in 3:
		var a := TAU * k / 3.0
		var lg := box(stand, Vector3(0.025, 0.02, 0.22), Vector3(sin(a) * 0.09, 0.03, cos(a) * 0.09), grey)
		lg.rotation = Vector3(0.0, a, 0.0)
	cyl(stand, 0.012, 0.012, py - 0.12, Vector3(0, (py - 0.12) / 2, 0), grey)
	var plate := Node3D.new()
	plate.position = Vector3(0, py, 0)
	plate.rotation.x = deg_to_rad(-25)
	stand.add_child(plate)
	var pc := "#7cc4ea" if who == "shuiling" else "#f28c28"
	for f in [[Vector3(0.34, 0.02, 0.02), Vector3(0, 0.12, 0)], [Vector3(0.34, 0.02, 0.02), Vector3(0, -0.12, 0)], [Vector3(0.02, 0.26, 0.02), Vector3(-0.16, 0, 0)], [Vector3(0.02, 0.26, 0.02), Vector3(0.16, 0, 0)], [Vector3(0.36, 0.02, 0.05), Vector3(0, -0.13, 0.025)]]:
		box(plate, f[0], f[1], pc)
	for xx in [-0.08, 0.0, 0.08]:
		box(plate, Vector3(0.012, 0.24, 0.012), Vector3(xx, 0, -0.004), pc)
	box(plate, Vector3(0.29, 0.21, 0.004), Vector3(0, 0.0, 0.012), "#ffffff")
	for side in [1, -1]:   # 五線譜＋音符（正反兩面）
		var zz: float = 0.012 + side * 0.0035
		for row in 2:
			for k in 5:
				box(plate, Vector3(0.26, 0.003, 0.002), Vector3(0, 0.07 - row * 0.1 - k * 0.01, zz), "#5a5a66")
			for k in 5:
				var nt := box(plate, Vector3(0.013, 0.01, 0.003), Vector3(-0.1 + k * 0.05, 0.07 - row * 0.1 - ((k * 3) % 5) * 0.01, zz + side * 0.001), "#2a2a33")
				nt.rotation.z = deg_to_rad(20)
	# 小凳＋直笛（角色右手邊）
	var stool := spot + Vector3(face.z, 0, -face.x) * -0.5
	var sh := 0.3
	cyl(st, 0.1, 0.1, 0.03, stool + Vector3(0.0, sh, 0.0), T["accent"] if who == "zunbo" else "#a9dcf5")
	cyl(st, 0.018, 0.018, sh - 0.015, stool + Vector3(0.0, (sh - 0.015) / 2, 0.0), "#ffffff" if who == "shuiling" else "#4a4a58")
	var rec := make_recorder(DM["rec_len"])
	rec.name = "RecorderProp"
	rec.position = stool + Vector3(-0.1, sh + 0.03, 0.0)
	rec.rotation = Vector3(0, 0, -PI / 2)
	st.add_child(rec)
	marker("recorder_spot", spot, 120)
	DM["stand_pos"] = ms
