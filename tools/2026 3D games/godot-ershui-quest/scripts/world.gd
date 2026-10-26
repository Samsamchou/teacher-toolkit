extends Node3D

const Host := preload("res://scripts/host.gd")
## 二水市區街道場景：路網、13 個地點、主角沿路行走、到達地點後一邊答題一邊回合制打怪。
## 地圖座標用「簡圖像素」寫（對照 二水街道圖icons.png），w() 轉成世界座標。

const S := 0.06
const CENTER := Vector2(1000, 700)
const ROAD_W := 4.0
const WALK_W := 1.4
const SPEED := 7.6
# 主角與怪物比例（2026-10-23 教師確認 RDQ v5）：Ken 2.2 m（約三分之二層樓）；一般怪物 0.75 倍；魔王不變
const KEN_H := 2.2
const KEN_R := 0.45            # Ken 走路時身體半徑（含手臂）：道具離 Ken 的路線至少要這麼遠
const EYE_H := 2.0             # 打怪第一人稱的眼睛高度
const KEN_ANIM_SPEED := 1.3    # Ken 變矮、步伐變小：走路動畫快一點，腳才不會在地上滑
const MONSTER_SCALE := 0.75
const FOE_DIST := 7.0          # 一般怪物站離門口多遠（原 8.5；怪物變小後拉近一點）
const FOE_GAP := 2.3           # 兩隻怪物左右間隔（原 1.8；避免頭上名字疊在一起）
const CAR_LEN := 3.6           # 學生建議：汽車縮小（原 4.2）

# 路口節點（簡圖像素）
const NODES := {
	"A": Vector2(480, 390), "B": Vector2(680, 390), "C": Vector2(920, 390), "D": Vector2(1450, 390),
	"E": Vector2(1530, 650), "F": Vector2(1530, 1130), "G": Vector2(1530, 1330),
	"H": Vector2(920, 1130), "L": Vector2(920, 1250), "I": Vector2(920, 1330),
	"J": Vector2(470, 1100), "K": Vector2(470, 1250), "N": Vector2(680, 1130), "M": Vector2(1900, 1330),
}
const EDGES := [
	["A", "B"], ["B", "C"], ["C", "D"], ["D", "E"], ["E", "F"], ["F", "G"],
	["C", "H"], ["H", "L"], ["L", "I"], ["H", "F"], ["I", "G"], ["G", "M"],
	["A", "J"], ["J", "K"], ["K", "L"], ["J", "N"], ["N", "H"], ["B", "N"],
]

# id, 中文名, 簡單英文, 模型, 簡圖位置, 門口(路上)位置, 最大邊長, 魔王區
const LOCS := [
	{"id": "station", "zh": "二水火車站", "word": "train station", "model": "bld_station", "pos": Vector2(930, 285), "door": Vector2(920, 390), "size": 19.0},
	{"id": "inn", "zh": "二八水驛站", "word": "restaurant", "model": "bld_inn", "pos": Vector2(1560, 320), "door": Vector2(1480, 390), "size": 9.0},
	{"id": "seven", "zh": "便利商店", "word": "convenience store", "model": "bld_seven", "pos": Vector2(1640, 650), "door": Vector2(1530, 650), "size": 10.0},
	{"id": "school", "zh": "二水國小", "word": "school", "model": "bld_school", "pos": Vector2(1300, 960), "door": Vector2(1300, 1130), "size": 22.0},
	{"id": "teatop", "zh": "飲料店", "word": "tea shop", "model": "bld_teatop", "pos": Vector2(820, 760), "door": Vector2(920, 760), "size": 9.0},
	{"id": "market", "zh": "二水超市", "word": "supermarket", "model": "bld_market", "pos": Vector2(600, 880), "door": Vector2(680, 880), "size": 10.0},
	{"id": "post", "zh": "二水郵局", "word": "post office", "model": "bld_post", "pos": Vector2(830, 1195), "door": Vector2(830, 1130), "size": 9.0},
	{"id": "bookstore", "zh": "書店", "word": "bookstore", "model": "bld_bookstore", "pos": Vector2(720, 1200), "door": Vector2(720, 1130), "size": 8.5},
	{"id": "pxmart", "zh": "超市", "word": "supermarket", "model": "bld_pxmart", "pos": Vector2(565, 1205), "door": Vector2(565, 1130), "size": 12.0},
	{"id": "library", "zh": "二水鄉立圖書館", "word": "library", "model": "bld_library", "pos": Vector2(1230, 1240), "door": Vector2(1230, 1330), "size": 11.0},
	{"id": "farm", "zh": "八堡圳農情館", "word": "coffee shop", "model": "farm_centre", "pos": Vector2(1780, 1250), "door": Vector2(1780, 1330), "size": 12.0},
	{"id": "park", "zh": "二八水水公園", "word": "park", "model": "", "pos": Vector2(560, 520), "door": Vector2(680, 520), "size": 0.0, "boss": true},
	{"id": "lawn", "zh": "水心之初大草原", "word": "park", "model": "", "pos": Vector2(1790, 900), "door": Vector2(1530, 900), "size": 0.0, "boss": true},
]

# 一般怪物 6 種；每個一般地點隨機出 2 隻。魔王區各 1 隻。
const MONSTERS := [
	{"id": "ink_slime", "zh": "墨水史萊姆", "en": "Ink Slime", "size": 3.2},
	{"id": "gear_gremlin", "zh": "齒輪小妖", "en": "Gear Gremlin", "size": 3.4},
	{"id": "boba_monster", "zh": "珍奶怪", "en": "Boba Beast", "size": 3.6},
	{"id": "pencil_imp", "zh": "鉛筆小鬼", "en": "Pencil Imp", "size": 3.8},
	{"id": "chalk_ghost", "zh": "粉筆幽靈", "en": "Chalk Ghost", "size": 3.4},
	{"id": "paddy_frog", "zh": "稻田蛙", "en": "Paddy Frog", "size": 3.2},
]
const BOSSES := {
	"park": {"id": "boss_dragon", "zh": "蒸汽鐵龍", "en": "Steam Dragon", "size": 9.0},
	"lawn": {"id": "boss_serpent", "zh": "水圳龍王", "en": "Canal Serpent King", "size": 9.0},
}

var font: Font
var font_bold: Font
var loc_world := {}      # id -> {door:Vector3, root:Node3D, base:Vector3}
var cleared := {}
var player: Node3D
var player_model: Node3D
var cam: Camera3D
var path: Array = []
var target_id := ""
var ui_layer: CanvasLayer
var ui_status: Label
var ui_bar: Control
var ui_buttons := {}
var banner: Label
var dialog: PanelContainer
var dialog_title: Label
var dialog_body: Label
var quiz: Control
var test_mode := false
var rng := RandomNumberGenerator.new()
var model_cache := {}

# 戰鬥狀態
var battle_loc := ""
var foes: Array = []         # [{node, hp, max, info, label}]
var cam_focus := Vector3.ZERO
var cam_offset := Vector3(0, 40, 36)
var busy := false

# 聲音、視角、連擊
var music_player: AudioStreamPlayer
var sfx_players: Array = []
var sfx_cache := {}
var music_now := ""
var vol_level := 1            # 0 靜音、1 小聲（預設）、2 中、3 大
const VOL_DB := [-80.0, -16.0, -10.0, -5.0]
const VOL_NAME := ["Off 靜音", "Low 小聲", "Mid 中等", "High 大聲"]
var vol_btn: Button
var map_btn: Button
var map_mode := false
var combo: Array = []         # 這個地點每題的星星數（答完才一起攻擊）
var cam_look := Vector3.ZERO
var battle_center := Vector3.ZERO
var occluders: Array = []      # 會擋住第一人稱視線的樹、路燈、建築（戰鬥時暫時隱藏）
var hidden_now: Array = []
var step_timer := 0.0
var music_duck := false        # 答題時背景音樂降到約 10%
const DUCK_DB := -20.0
const FOOT := 0.22             # 路面高度：人物與怪物的腳要踩在路面上，不陷進去
var ken_anim: AnimationPlayer

# 手動攻擊與特效
const ATTACK_WAIT := 20.0
const PARTICLE_CAP := 900      # 同時存在的粒子上限（iPad 效能保護）
var atk_ui: Control
var atk_btn: Button
var all_btn: Button
var atk_pending: Array = []
var atk_timer := 0.0
var atk_running := false
var vfx_level := 2             # 2＝最華麗；iPad 掉幀時自動降成 1
var live_particles := 0
var fps_check := 1.0
var shake := 0.0
var flash_rect: ColorRect
# iPad 卡頓修正：特效材質／網格重複使用、開場先預熱、行動裝置粒子減半但顆粒放大
var glow_cache := {}
var particle_mesh: SphereMesh
var is_mobile := false
var vfx_scale := 1.0           # 粒子數量倍率（行動裝置 0.5）
var vfx_size := 1.0            # 粒子大小倍率（行動裝置 1.4，看起來一樣華麗）
var frame_max := 0.0           # 測試用：攻擊期間最長的一格（秒）
var prewarm_cover: ColorRect
# 物件池：特效物件開場就建好，攻擊時只重複使用，不在攻擊途中新增／刪除節點（避免 iPad 每隔幾擊頓一下）
var pool_big: Array = []       # 大爆炸粒子
var pool_small: Array = []     # 小爆炸粒子
var pool_trail: Array = []     # 拖尾粒子
var pool_ring: Array = []      # 衝擊波光環
var pool_text: Array = []      # 命中大字
var trail_follow := {}         # 拖尾 → 跟隨的投射物
var pool_i := {"big": 0, "small": 0, "trail": 0, "ring": 0, "text": 0}
var bank: Node                 # scripts/bank.gd：任務題庫（題目、圖片、語音、字型都從任務資料夾讀）

func w(p: Vector2) -> Vector3:
	return Vector3((p.x - CENTER.x) * S, 0.0, (p.y - CENTER.y) * S)

func _ready() -> void:
	rng.randomize()
	# 英文用 Comic Relief；中文用打包進遊戲的 Noto Sans TC 子集（網頁版不能依賴系統字型）。
	# 新增中文字時要重跑 tools/build_cjk_font.py。
	var cjk: FontFile = load("res://assets/fonts/NotoSansTC-Regular-subset.ttf")
	var cjk_bold: FontFile = load("res://assets/fonts/NotoSansTC-Bold-subset.ttf")
	var reg: FontFile = load("res://assets/fonts/ComicRelief-Regular.ttf")
	var bold: FontFile = load("res://assets/fonts/ComicRelief-Bold.ttf")
	reg.fallbacks = [cjk]
	bold.fallbacks = [cjk_bold]
	font = reg
	font_bold = bold
	test_mode = "--test" in OS.get_cmdline_user_args()
	_build_environment()
	_build_ground_and_roads()
	_build_locations()
	var before := get_child_count()
	_build_props()
	_overlap_report()
	for i in range(before, get_child_count()):
		occluders.append(get_child(i))
	_build_player()
	# 讀任務題庫（同一份遊戲給不同任務共用）
	var init := Host.initial()
	if not await _load_bank(init, cjk, cjk_bold):
		return
	_build_ui()
	_build_audio()
	play_music("street")
	_preload_music()
	# 網頁外框給的進度（換 iPad 也能接續）
	if typeof(init.get("cleared")) == TYPE_ARRAY:
		for c in init["cleared"]:
			cleared[String(c)] = true
	_refresh_ui()
	_detect_mobile()
	await _prewarm()
	if "--perf" in OS.get_cmdline_user_args():
		_run_perf()
	elif "--shots" in OS.get_cmdline_user_args():
		_run_shots()
	elif test_mode:
		_run_test()

# ---------- 共用 ----------
func _mat(c: Color, rough := 0.9) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	return m

func _box(size: Vector3, c: Color, pos: Vector3, parent: Node = self) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = _mat(c)
	mi.position = pos
	parent.add_child(mi)
	return mi

func _has_model(mname: String) -> bool:
	return ResourceLoader.exists("res://assets/models/%s.glb" % mname)

func _collect_aabb(node: Node, acc: Array) -> void:
	if node is MeshInstance3D:
		var mi := node as MeshInstance3D
		var t := Transform3D.IDENTITY
		var n: Node = mi
		while n != null:
			if n is Node3D:
				t = (n as Node3D).transform * t
			n = n.get_parent()
		acc.append(t * mi.get_aabb())
	for c in node.get_children():
		_collect_aabb(c, acc)

## 載入 GLB，置中、貼地、等比縮放到最大邊長 max_dim；沒有檔案時用紫色方塊代替。
func _fit_model(mname: String, max_dim: float) -> Node3D:
	var holder := Node3D.new()
	if not _has_model(mname):
		_box(Vector3(max_dim * 0.6, max_dim * 0.6, max_dim * 0.6), Color(0.8, 0.4, 0.8), Vector3(0, max_dim * 0.3, 0), holder)
		holder.set_meta("height", max_dim * 0.6)
		holder.set_meta("width", max_dim * 0.6)
		holder.set_meta("depth", max_dim * 0.6)
		return holder
	var scene: PackedScene = load("res://assets/models/%s.glb" % mname)
	var inst: Node3D = scene.instantiate()
	if not model_cache.has(mname):
		var boxes := []
		_collect_aabb(inst, boxes)
		var bb: AABB = boxes[0]
		for i in range(1, boxes.size()):
			bb = bb.merge(boxes[i])
		model_cache[mname] = bb
	var b: AABB = model_cache[mname]
	var s := max_dim / maxf(b.size.x, maxf(b.size.y, b.size.z))
	inst.position = Vector3(-(b.position.x + b.size.x / 2.0), -b.position.y, -(b.position.z + b.size.z / 2.0))
	holder.add_child(inst)
	holder.scale = Vector3.ONE * s
	holder.set_meta("height", b.size.y * s)
	holder.set_meta("width", b.size.x * s)
	holder.set_meta("depth", b.size.z * s)
	return holder

func _label3d(text: String, pos: Vector3, size := 64, parent: Node = self) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = font_bold
	l.font_size = size
	l.pixel_size = 0.02
	l.outline_size = 16
	l.outline_modulate = Color(0.1, 0.1, 0.15)
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.position = pos
	parent.add_child(l)
	return l

# ---------- 環境 ----------
func _build_environment() -> void:
	var we := WorldEnvironment.new()
	var e := Environment.new()
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = Color(0.36, 0.62, 0.92)
	sm.sky_horizon_color = Color(0.82, 0.9, 0.97)
	sm.ground_horizon_color = Color(0.82, 0.9, 0.97)
	sm.ground_bottom_color = Color(0.45, 0.55, 0.45)
	sky.sky_material = sm
	e.background_mode = Environment.BG_SKY
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	e.ambient_light_energy = 0.22
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.tonemap_white = 1.0
	e.tonemap_exposure = 0.78
	e.fog_enabled = true
	e.fog_light_color = Color(0.8, 0.88, 0.96)
	e.fog_density = 0.0012
	e.glow_enabled = false
	e.glow_intensity = 0.35
	e.glow_bloom = 0.05
	e.adjustment_enabled = true
	e.adjustment_saturation = 1.12
	e.adjustment_contrast = 1.05
	we.environment = e
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -35, 0)
	sun.light_color = Color(1.0, 0.95, 0.85)
	sun.light_energy = 0.75
	sun.shadow_enabled = true
	sun.shadow_blur = 1.5
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_max_distance = 120.0
	add_child(sun)
	cam = Camera3D.new()
	cam.fov = 40
	cam.far = 600
	add_child(cam)

func _grass_material() -> StandardMaterial3D:
	var noise := FastNoiseLite.new()
	noise.frequency = 0.02
	var tex := NoiseTexture2D.new()
	tex.width = 256
	tex.height = 256
	tex.seamless = true
	tex.noise = noise
	var g := Gradient.new()
	g.set_color(0, Color(0.33, 0.55, 0.27))
	g.set_color(1, Color(0.47, 0.68, 0.33))
	tex.color_ramp = g
	var m := StandardMaterial3D.new()
	m.albedo_texture = tex
	m.uv1_scale = Vector3(14, 14, 14)
	m.roughness = 1.0
	return m

func _build_ground_and_roads() -> void:
	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(320, 240)
	ground.mesh = pm
	ground.material_override = _grass_material()
	ground.position = Vector3(0, -0.02, 0)
	add_child(ground)
	# 遠山
	var hill_mat := _mat(Color(0.3, 0.48, 0.32))
	for h in [[Vector3(-90, 0, -95), 38.0], [Vector3(-30, 0, -110), 46.0], [Vector3(45, 0, -105), 40.0], [Vector3(110, 0, -80), 44.0], [Vector3(140, 0, 10), 36.0]]:
		var mi := MeshInstance3D.new()
		var sp := SphereMesh.new()
		sp.radius = h[1]
		sp.height = h[1] * 1.1
		sp.radial_segments = 10
		sp.rings = 6
		mi.mesh = sp
		mi.material_override = hill_mat
		mi.position = h[0]
		add_child(mi)
	var asphalt := Color(0.36, 0.37, 0.4)
	var walk := Color(0.7, 0.66, 0.6)
	for e in EDGES:
		var a: Vector3 = w(NODES[e[0]])
		var b: Vector3 = w(NODES[e[1]])
		var length := a.distance_to(b)
		var mid := (a + b) / 2.0
		var road := Node3D.new()
		road.position = mid
		road.rotation.y = atan2(b.x - a.x, b.z - a.z)
		add_child(road)
		_box(Vector3(ROAD_W + WALK_W * 2.0, 0.18, length + ROAD_W), walk, Vector3(0, 0.0, 0), road)
		_box(Vector3(ROAD_W, 0.2, length + ROAD_W), asphalt, Vector3(0, 0.02, 0), road)
		# 中央虛線
		var z := -length / 2.0 + 2.5
		while z < length / 2.0 - 2.5:
			_box(Vector3(0.18, 0.21, 1.4), Color(0.95, 0.93, 0.85), Vector3(0, 0.03, z), road)
			z += 3.2
	for k in NODES:
		var p: Vector3 = w(NODES[k])
		_box(Vector3(ROAD_W + 0.6, 0.205, ROAD_W + 0.6), asphalt, p + Vector3(0, 0.022, 0))
		# 路口四邊的斑馬線
		for d in [Vector3(1, 0, 0), Vector3(-1, 0, 0), Vector3(0, 0, 1), Vector3(0, 0, -1)]:
			var c: Vector3 = p + d * (ROAD_W * 0.5 + 0.9)
			for i in range(-2, 3):
				var sz := Vector3(0.45, 0.215, 1.2)
				var off := Vector3(i * 0.75, 0, 0)
				if d.x != 0:
					sz = Vector3(1.2, 0.215, 0.45)
					off = Vector3(0, 0, i * 0.75)
				_box(sz, Color(0.95, 0.95, 0.93), c + off + Vector3(0, 0.023, 0))
	# 鐵路：碎石路基、枕木、雙軌、月台
	var rz := w(Vector2(0, 190)).z
	_box(Vector3(130, 0.25, 4.0), Color(0.55, 0.52, 0.48), Vector3(5, 0.05, rz))
	var x := -58.0
	while x < 68.0:
		_box(Vector3(0.5, 0.2, 2.8), Color(0.38, 0.27, 0.2), Vector3(x, 0.22, rz))
		x += 1.2
	for off in [-0.75, 0.75]:
		_box(Vector3(130, 0.16, 0.14), Color(0.6, 0.6, 0.62), Vector3(5, 0.36, rz + off))
	_box(Vector3(26, 0.6, 2.2), Color(0.75, 0.72, 0.66), Vector3(w(Vector2(930, 0)).x, 0.3, rz + 2.9))

# ---------- 地點 ----------
func _build_locations() -> void:
	for L in LOCS:
		var root := Node3D.new()
		root.name = L["id"]
		add_child(root)
		var base: Vector3 = w(L["pos"])
		var door: Vector3 = w(L["door"])
		var h := 6.0
		var wd := 8.0
		var dp := 8.0
		if L["model"] != "":
			var m := _fit_model(L["model"], L["size"])
			root.add_child(m)
			h = m.get_meta("height")
			wd = m.get_meta("width")
			dp = m.get_meta("depth")
			# 模型正面朝 +Z，轉向門口
			var d := door - base
			root.rotation.y = atan2(d.x, d.z)
			# 模型上的品牌招牌用一般字樣的看板蓋住
			if L.has("cover"):
				_sign_cover(root, L["cover"], wd, h, dp)
			# 老師 10/26：中文通用招牌；有品牌字樣的模型先蓋素色看板
			_place_sign(root, L["id"], wd, h, dp)
			# 建築前的小廣場地磚
			_box(Vector3(wd + 2.0, 0.12, dp + 2.5), Color(0.86, 0.82, 0.74), Vector3(0, -0.02, 0.6), root)
		root.position = base
		if L["id"] == "park":
			_build_park(root)
			h = 7.0
			wd = 18.0
			dp = 14.0
		elif L["id"] == "lawn":
			_build_lawn(root)
			h = 5.0
			wd = 22.0
			dp = 14.0
		var body := StaticBody3D.new()
		body.collision_layer = 2
		body.set_meta("loc_id", L["id"])
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = Vector3(maxf(wd, 6.0), maxf(h, 4.0), maxf(dp, 6.0))
		cs.shape = bs
		cs.position = Vector3(0, bs.size.y / 2.0, 0)
		body.add_child(cs)
		root.add_child(body)
		var lab := _label3d("%s\n%s" % [L["zh"], L["word"]], base + Vector3(0, h + 2.4, 0), 56)
		lab.modulate = Color(1, 0.96, 0.75) if L.get("boss", false) else Color.WHITE
		loc_world[L["id"]] = {"door": door, "root": root, "base": base, "half": Vector2(wd / 2.0, dp / 2.0)}

const BLD_SIGN := {
	"station": "二水車站", "school": "二水國民小學", "library": "二水鄉立圖書館", "post": "郵局", "market": "二水超市",
	"pxmart": "超市", "bookstore": "書店", "teatop": "飲料店", "seven": "便利商店", "inn": "二八水驛站",
}
const SIGN_Y := {"station": 0.78, "school": 0.55, "library": 0.6, "post": 0.42, "market": 0.6, "pxmart": 0.72,
	"bookstore": 0.72, "teatop": 0.3, "inn": 0.4}
## [中心高度比例, 高度比例, 寬度比例, 顏色, 往前凸出 m]
const SIGN_PLATE := {
	"pxmart": [0.8, 0.42, 1.04, "#2f6f73", 0.12, true],   # 闖關鏡頭較高較近：看板往上、蓋到屋頂邊
	"seven": [0.78, 0.22, 1.02, "#4a5f8a", 0.15, true],
	"teatop": [0.31, 0.09, 1.0, "#c0392b", 0.25],
}

func _place_sign(root: Node3D, id: String, wd: float, h: float, dp: float) -> void:
	var txt: String = BLD_SIGN.get(id, "")
	if txt == "":
		return
	var l := Label3D.new()
	l.text = txt
	l.font = font_bold
	l.font_size = 64
	var want_w := minf(wd * 0.45, 2.4 + txt.length() * 0.45)
	l.pixel_size = want_w / maxf(1.0, txt.length() * 64.0)
	l.modulate = Color.WHITE
	l.outline_size = 14
	l.outline_modulate = Color(0.12, 0.1, 0.16)
	l.double_sided = false   # 從背面看不到（不會出現反字）
	l.position = Vector3(0, h * float(SIGN_Y.get(id, 0.55)), dp / 2.0 + 0.12)
	if SIGN_PLATE.has(id):
		var c: Array = SIGN_PLATE[id]
		var plate := _box(Vector3(wd * float(c[2]), h * float(c[1]), 0.2), Color(c[3]), Vector3(0, h * float(c[0]), dp / 2.0 + float(c[4])), root)
		plate.name = "SignCover"
		if c.size() > 5 and c[5]:
			for sx in [-1.0, 1.0]:
				_box(Vector3(0.2, h * float(c[1]), dp * 1.02), Color(c[3]), Vector3(sx * (wd / 2.0 + float(c[4])), h * float(c[0]), 0), root)
		l.position = Vector3(0, h * float(c[0]), dp / 2.0 + float(c[4]) + 0.14)
		l.pixel_size = minf(l.pixel_size, h * float(c[1]) * 0.75 / 64.0)
	root.add_child(l)

func _sign_cover(root: Node3D, c: Dictionary, wd: float, h: float, dp: float) -> void:
	var plate := _box(Vector3(wd * 0.98, h * c["h"], 0.25), c["color"], Vector3(0, h * c["y"], dp / 2.0 + 0.12), root)
	plate.name = "SignCover"
	var l := Label3D.new()
	l.text = c["text"]
	l.font = font_bold
	l.font_size = 96
	l.pixel_size = minf(0.022, h * c["h"] * 0.006)
	l.outline_size = 0
	l.modulate = Color(1, 1, 0.95)
	l.position = Vector3(0, h * c["y"], dp / 2.0 + 0.26)
	root.add_child(l)

func _build_park(root: Node3D) -> void:
	_box(Vector3(18, 0.15, 14), Color(0.42, 0.66, 0.36), Vector3(0, 0.0, 0), root)
	var loco := _fit_model("bld_waterpark", 8.0)
	loco.position = Vector3(-3.0, 0.1, -2.5)
	loco.rotation.y = deg_to_rad(90)
	root.add_child(loco)
	var jet := _fit_model("fighter_jet", 7.0)
	jet.position = Vector3(1.5, 0.1, 4.0)
	jet.rotation.y = deg_to_rad(-60)
	root.add_child(jet)
	var pg := _fit_model("playground", 6.0)
	pg.position = Vector3(-4.0, 0.1, 3.8)
	root.add_child(pg)

func _build_lawn(root: Node3D) -> void:
	_box(Vector3(22, 0.15, 14), Color(0.4, 0.68, 0.32), Vector3(0, 0.0, 0), root)
	_box(Vector3(14, 0.8, 2.4), Color(0.94, 0.94, 0.94), Vector3(0, 0.4, 0), root)
	var tm := TextMesh.new()
	tm.text = "水心之初"
	tm.font = font_bold
	tm.font_size = 96
	tm.pixel_size = 0.012
	tm.depth = 0.5
	var mi := MeshInstance3D.new()
	mi.mesh = tm
	mi.material_override = _mat(Color(0.97, 0.97, 0.97), 0.4)
	mi.position = Vector3(0, 2.4, 0.2)
	mi.rotation.y = deg_to_rad(-90)
	root.add_child(mi)
	# 小行星復刻的草原地景，放在戰場後方邊緣當背景（戰鬥區在中間）
	var land := _fit_model("bld_lawn", 9.0)
	land.position = Vector3(8.0, 0.08, -4.5)
	land.rotation.y = deg_to_rad(-90)
	root.add_child(land)

# ---------- 重疊檢查：道具不擋 Ken 的路、不插進建築、不站在戰鬥區 ----------
var prop_marks: Array = []     # 已擺好的機車與汽車 [{name, pts, r}]
var prop_skipped: Array = []   # 找不到合適位置、沒有擺的道具

func _seg_dist_xz(p: Vector3, a: Vector3, b: Vector3) -> float:
	var ab := Vector2(b.x - a.x, b.z - a.z)
	var ap := Vector2(p.x - a.x, p.z - a.z)
	var t := clampf(ap.dot(ab) / maxf(ab.length_squared(), 0.0001), 0.0, 1.0)
	return (ap - ab * t).length()

## 打怪時 Ken 站的位置到怪物站的位置（和 _start_battle 算法相同）：這段路上不能擺道具
func _battle_zone(id: String) -> Array:
	var door: Vector3 = loc_world[id]["door"]
	var e: Array = EDGES[_project(door)["edge"]]
	var t: Vector3 = (w(NODES[e[1]]) - w(NODES[e[0]])).normalized()
	if t.z > 0.01 or (absf(t.z) <= 0.01 and t.x < 0):
		t = -t
	var boss := BOSSES.has(id)
	var center := door + t * (18.0 if boss else FOE_DIST)
	return [door - t * 2.5, center, 5.5 if boss else 3.4]

## 回傳問題說明；沒問題回傳 ""
func _prop_problem(pts: Array, r: float, check_props := false) -> String:
	for pt in pts:
		for e in EDGES:
			if _seg_dist_xz(pt, w(NODES[e[0]]), w(NODES[e[1]])) < r + KEN_R:
				return "擋到 Ken 的路線 %s-%s" % [e[0], e[1]]
		for id in loc_world:
			var info: Dictionary = loc_world[id]
			var half: Vector2 = info["half"]
			var root: Node3D = info["root"]
			var lp: Vector3 = root.global_transform.affine_inverse() * pt
			if absf(lp.x) < half.x + r and absf(lp.z) < half.y + r:
				return "插進建築 %s" % id
			var z: Array = _battle_zone(id)
			if _seg_dist_xz(pt, z[0], z[1]) < z[2] + r:
				return "在 %s 的戰鬥區" % id
		if check_props:
			for m in prop_marks:
				for q in m["pts"]:
					if Vector2(pt.x - q.x, pt.z - q.z).length() < r + m["r"] + 0.15:
						return "和 %s 重疊" % m["name"]
	return ""

func _place_ok(pname: String, pts: Array, r: float, check_props := false) -> bool:
	return _prop_problem(pts, r, check_props) == ""

func _mark_prop(pname: String, pts: Array, r: float) -> void:
	prop_marks.append({"name": pname, "pts": pts, "r": r})

## 擺完後再檢查一次全部機車與汽車（自動重疊檢查）；結果印在主控台，測試時看這一行
func _overlap_report() -> int:
	var problems := 0
	for m in prop_marks:
		var why := _prop_problem(m["pts"], m["r"])
		if why != "":
			problems += 1
			print("OVERLAP ", m["name"], ": ", why)
	var cars := prop_marks.filter(func(x): return String(x["name"]).begins_with("汽車")).size()
	var scooters := prop_marks.filter(func(x): return String(x["name"]).begins_with("機車")).size()
	print("OVERLAP CHECK: %d problems (cars %d, scooters %d)" % [problems, cars, scooters])
	return problems

# ---------- 街道擺設（樹、路燈、機車、汽車、矮樹叢） ----------
func _near_building(p: Vector3) -> bool:
	for id in loc_world:
		var info: Dictionary = loc_world[id]
		if p.distance_to(info["base"]) < 9.5 or p.distance_to(info["door"]) < 4.5:
			return true
	return false

func _build_props() -> void:
	var tree_ok := _has_model("tree")
	var lamp_ok := _has_model("street_lamp")
	var rail_z := w(Vector2(0, 190)).z
	var i := 0
	for e in EDGES:
		var a: Vector3 = w(NODES[e[0]])
		var b: Vector3 = w(NODES[e[1]])
		var dir := (b - a).normalized()
		var side := Vector3(dir.z, 0, -dir.x)
		var length := a.distance_to(b)
		var t := 5.0
		while t < length - 5.0:
			var sgn := 1.0 if i % 2 == 0 else -1.0
			var p := a + dir * t + side * sgn * (ROAD_W * 0.5 + WALK_W + 1.6)
			if not _near_building(p) and absf(p.z - rail_z) > 4.0:
				if i % 3 == 2 and lamp_ok:
					var lp := a + dir * t + side * sgn * (ROAD_W * 0.5 + WALK_W * 0.5)
					if _place_ok("路燈", [lp], 0.3):
						var lamp := _fit_model("street_lamp", 4.2)
						lamp.position = lp
						lamp.rotation.y = atan2(-side.x * sgn, -side.z * sgn)
						add_child(lamp)
				elif tree_ok:
					if _place_ok("樹", [p], 0.9):
						var tr := _fit_model("tree", rng.randf_range(3.8, 5.0))
						tr.position = p
						tr.rotation.y = rng.randf() * TAU
						add_child(tr)
				else:
					_bush(p, 1.4)
			t += 9.0
			i += 1
	# 店家門口的機車與汽車
	var scooter_ok := _has_model("scooter")
	var car_ok := _has_model("car")
	var k := 0
	for L in LOCS:
		if L.get("boss", false):
			continue
		var info: Dictionary = loc_world[L["id"]]
		var door: Vector3 = info["door"]
		var to_b: Vector3 = (info["base"] - door).normalized()
		var along := Vector3(to_b.z, 0, -to_b.x)
		# 機車：停在店門旁的人行道靠馬路側，車頭朝建築；每個位置先檢查不擋路、不插進建築、不在戰鬥區
		if scooter_ok:
			var placed := 0
			for a_off in [3.0, 4.1, -3.0, -4.1, 6.0, 7.1, -6.0, -7.1, 9.0, 10.1, -9.0, -10.1, 12.0, -12.0]:
				if placed >= 2:
					break
				for lat in [ROAD_W * 0.5 + WALK_W * 0.5, ROAD_W * 0.5 + 0.5]:
					var sp: Vector3 = door + to_b * lat + along * a_off
					if _place_ok("機車 %s" % L["id"], [sp - to_b * 0.55, sp + to_b * 0.55], 0.4, true):
						var sc := _fit_model("scooter", 1.9)
						sc.position = sp
						sc.rotation.y = atan2(to_b.x, to_b.z)
						add_child(sc)
						_mark_prop("機車 %s" % L["id"], [sp - to_b * 0.55, sp + to_b * 0.55], 0.4)
						placed += 1
						break
		# 汽車：縮小到 CAR_LEN，停在路邊（車身一部分壓上路緣），離 Ken 走的路中線至少 KEN_R
		if car_ok and k % 3 == 0:
			var car := _fit_model("car", CAR_LEN)
			var cw := minf(car.get_meta("width"), car.get_meta("depth")) / 2.0
			var lat_c := KEN_R + cw + 0.2
			var ok_pos := Vector3.INF
			for a_off in [-5.5, 5.5, -8.0, 8.0, -11.0, 11.0, -14.0, 14.0, -17.0, 17.0, -20.0, 20.0]:
				var cp: Vector3 = door + along * a_off + to_b * lat_c
				var pts := [cp - along * (CAR_LEN / 2.0 - cw), cp, cp + along * (CAR_LEN / 2.0 - cw)]
				if _place_ok("汽車 %s" % L["id"], pts, cw, true):
					ok_pos = cp
					_mark_prop("汽車 %s" % L["id"], pts, cw)
					break
			if ok_pos != Vector3.INF:
				car.position = ok_pos + Vector3(0, FOOT, 0)
				car.rotation.y = atan2(along.x, along.z)
				add_child(car)
			else:
				car.queue_free()
		var bp: Vector3 = door + to_b * (ROAD_W * 0.5 + WALK_W + 0.9) + along * -2.6
		if _place_ok("矮樹叢 %s" % L["id"], [bp], 0.5):
			_bush(bp, 0.9)
		k += 1
	# 公園多種幾棵樹
	if tree_ok:
		for id in ["park", "lawn"]:
			var base: Vector3 = loc_world[id]["base"]
			for j in 5:
				var tr2 := _fit_model("tree", rng.randf_range(4.3, 6.0))
				var ang := j * TAU / 5.0 + 0.3
				tr2.position = base + Vector3(cos(ang) * 11.5, 0, sin(ang) * 9.0)
				add_child(tr2)

func _bush(p: Vector3, r: float) -> void:
	var mi := MeshInstance3D.new()
	var sp := SphereMesh.new()
	sp.radius = r
	sp.height = r * 1.4
	sp.radial_segments = 8
	sp.rings = 4
	mi.mesh = sp
	mi.material_override = _mat(Color(0.25, 0.5, 0.24).lerp(Color(0.4, 0.62, 0.3), rng.randf()))
	mi.position = p + Vector3(0, r * 0.5, 0)
	add_child(mi)

# ---------- 主角 ----------
func _build_player() -> void:
	player = Node3D.new()
	add_child(player)
	player.position = w(NODES["C"])
	player.rotation.y = PI   # 一開始面向火車站，鏡頭在馬路這一側
	var ken_file := "ken_rigged" if _has_model("ken_rigged") else "ken"
	player_model = _fit_model(ken_file, KEN_H)
	player.add_child(player_model)
	ken_anim = _find_anim(player_model)
	if ken_anim != null:
		ken_anim.speed_scale = KEN_ANIM_SPEED
	player_model.position.y = FOOT
	cam_focus = player.position
	_update_camera(true, 0.0)

## Ken 綁骨後的 GLB 會帶 AnimationPlayer：走路時播走路動畫，停下時回到站姿。
func _find_anim(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var a := _find_anim(c)
		if a != null:
			return a
	return null

func _ken_play(walking: bool) -> void:
	if ken_anim == null:
		return
	var want := ""
	for nm in ken_anim.get_animation_list():
		var low := String(nm).to_lower()
		if walking and "walk" in low:
			want = nm
		elif not walking and "idle" in low:
			want = nm
	if want == "":
		return
	if ken_anim.current_animation != want:
		ken_anim.get_animation(want).loop_mode = Animation.LOOP_LINEAR
		ken_anim.play(want, 0.25)

# ---------- 聲音 ----------
func _build_audio() -> void:
	music_player = AudioStreamPlayer.new()
	add_child(music_player)
	for i in 6:
		var p := AudioStreamPlayer.new()
		add_child(p)
		sfx_players.append(p)
	_apply_volume()

func _apply_volume() -> void:
	music_player.volume_db = VOL_DB[vol_level] - 4.0 + (DUCK_DB if music_duck else 0.0)
	for p in sfx_players:
		p.volume_db = VOL_DB[vol_level] + 4.0
	if vol_btn != null:
		vol_btn.text = VOL_NAME[vol_level]

## 背景音樂不包進遊戲檔（讓第一次下載變小）：網頁版進遊戲後才從 quest3d/music/ 下載，
## 下載好才開始播；電腦測試直接讀專案裡的檔案。
var music_cache := {}
var music_loading := {}

func play_music(mname: String) -> void:
	if mname == music_now:
		return
	music_now = mname
	var st: AudioStream = await _music_stream(mname)
	if st == null or music_now != mname:
		return
	music_player.stream = st
	music_player.play()

func _music_stream(mname: String) -> AudioStream:
	if music_cache.has(mname):
		return music_cache[mname]
	var res_path := "res://assets/audio/music/bgm_%s.mp3" % mname
	var st: AudioStream = null
	if ResourceLoader.exists(res_path):
		st = load(res_path)
	elif OS.has_feature("web"):
		if music_loading.has(mname):
			while music_loading.has(mname):
				await get_tree().process_frame
			return music_cache.get(mname)
		music_loading[mname] = true
		var href := String(JavaScriptBridge.eval("location.href", true))
		var url := href.substr(0, href.rfind("/") + 1) + "music/bgm_%s.mp3" % mname
		for attempt in 3:
			var req := HTTPRequest.new()
			add_child(req)
			if req.request(url) == OK:
				var res: Array = await req.request_completed
				if int(res[0]) == HTTPRequest.RESULT_SUCCESS and int(res[1]) == 200:
					var mp3 := AudioStreamMP3.new()
					mp3.data = res[3]
					st = mp3
			req.queue_free()
			if st != null:
				break
			await get_tree().create_timer(2.0).timeout
		music_loading.erase(mname)
	if st == null:
		return null
	st.set("loop", true)
	music_cache[mname] = st
	return st

## 開場後在背景先把三首音樂都下載好，之後切換場景就不用等
func _preload_music() -> void:
	for mname in ["street", "battle", "boss"]:
		await _music_stream(mname)

func sfx(sname: String, pitch := 1.0) -> void:
	if not sfx_cache.has(sname):
		sfx_cache[sname] = load("res://assets/audio/sfx/%s.ogg" % sname)
	var st = sfx_cache[sname]
	if st == null or sfx_players.is_empty():
		return
	for p in sfx_players:
		if not p.playing:
			p.stream = st
			p.pitch_scale = pitch
			p.play()
			return
	sfx_players[0].stream = st
	sfx_players[0].pitch_scale = pitch
	sfx_players[0].play()

func set_music_duck(on: bool) -> void:
	if music_duck == on:
		return
	music_duck = on
	if music_player == null:
		return
	var tw := create_tween()
	tw.tween_property(music_player, "volume_db", VOL_DB[vol_level] - 4.0 + (DUCK_DB if on else 0.0), 0.4)

func _on_volume_pressed() -> void:
	vol_level = (vol_level + 1) % VOL_DB.size()
	_apply_volume()
	sfx("click")

func _on_map_pressed() -> void:
	map_mode = not map_mode
	map_btn.text = "Back 返回" if map_mode else "Map 地圖"
	sfx("click")

# ---------- UI ----------
func _skin_btn(b: Button, bg: Color, border: Color) -> void:
	for st in ["normal", "hover", "pressed", "disabled", "focus"]:
		var sb := StyleBoxFlat.new()
		sb.bg_color = bg.darkened(0.15) if st == "pressed" else (bg.darkened(0.35) if st == "disabled" else bg)
		sb.border_color = border
		sb.set_border_width_all(4)
		sb.set_corner_radius_all(22)
		b.add_theme_stylebox_override(st, sb)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_disabled_color", "font_focus_color"]:
		b.add_theme_color_override(c, Color.WHITE)
	b.add_theme_color_override("font_outline_color", border.darkened(0.3))
	b.add_theme_constant_override("outline_size", 6)

func _make_button(text: String, size: int) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_override("font", font)
	b.add_theme_font_size_override("font_size", size)
	return b

func _build_ui() -> void:
	ui_layer = CanvasLayer.new()
	add_child(ui_layer)
	ui_status = Label.new()
	ui_status.add_theme_font_override("font", font_bold)
	ui_status.add_theme_font_size_override("font_size", 24)
	ui_status.add_theme_color_override("font_outline_color", Color(0.1, 0.1, 0.15))
	ui_status.add_theme_constant_override("outline_size", 8)
	ui_status.position = Vector2(20, 12)
	ui_layer.add_child(ui_status)
	var tr := HBoxContainer.new()
	tr.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	tr.offset_left = -330
	tr.offset_right = -10
	tr.offset_top = 8
	tr.alignment = BoxContainer.ALIGNMENT_END
	tr.add_theme_constant_override("separation", 8)
	ui_layer.add_child(tr)
	map_btn = _make_button("Map 地圖", 20)
	map_btn.custom_minimum_size = Vector2(130, 52)
	map_btn.pressed.connect(_on_map_pressed)
	tr.add_child(map_btn)
	vol_btn = _make_button(VOL_NAME[vol_level], 20)
	vol_btn.custom_minimum_size = Vector2(150, 52)
	vol_btn.pressed.connect(_on_volume_pressed)
	tr.add_child(vol_btn)
	var bar := ScrollContainer.new()
	bar.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bar.offset_top = -78
	bar.offset_bottom = -6
	bar.offset_left = 8
	bar.offset_right = -8
	ui_layer.add_child(bar)
	ui_bar = bar
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 6)
	bar.add_child(hb)
	for L in LOCS:
		var b := _make_button("", 18)
		b.custom_minimum_size = Vector2(0, 62)
		b.pressed.connect(go_to.bind(L["id"]))
		hb.add_child(b)
		ui_buttons[L["id"]] = b
	flash_rect = ColorRect.new()
	flash_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	flash_rect.visible = false
	ui_layer.add_child(flash_rect)
	atk_ui = HBoxContainer.new()
	atk_ui.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	atk_ui.grow_horizontal = Control.GROW_DIRECTION_BOTH
	atk_ui.grow_vertical = Control.GROW_DIRECTION_BEGIN
	atk_ui.offset_bottom = -28
	atk_ui.alignment = BoxContainer.ALIGNMENT_CENTER
	atk_ui.add_theme_constant_override("separation", 16)
	atk_ui.visible = false
	ui_layer.add_child(atk_ui)
	atk_btn = _make_button("Attack! 攻擊", 34)
	atk_btn.custom_minimum_size = Vector2(440, 96)
	_skin_btn(atk_btn, Color(0.95, 0.35, 0.25), Color(0.6, 0.15, 0.1))
	atk_btn.pressed.connect(_on_attack_pressed)
	atk_ui.add_child(atk_btn)
	all_btn = _make_button("全部發動 All", 26)
	all_btn.custom_minimum_size = Vector2(200, 96)
	_skin_btn(all_btn, Color(0.98, 0.75, 0.2), Color(0.65, 0.45, 0.05))
	all_btn.pressed.connect(_on_attack_all_pressed)
	atk_ui.add_child(all_btn)
	banner = Label.new()
	banner.add_theme_font_override("font", font_bold)
	banner.add_theme_font_size_override("font_size", 64)
	banner.add_theme_color_override("font_color", Color(1, 0.92, 0.4))
	banner.add_theme_color_override("font_outline_color", Color(0.25, 0.1, 0.05))
	banner.add_theme_constant_override("outline_size", 14)
	banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	banner.offset_top = 70
	banner.grow_horizontal = Control.GROW_DIRECTION_BOTH
	banner.visible = false
	ui_layer.add_child(banner)
	dialog = PanelContainer.new()
	dialog.visible = false
	dialog.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	dialog.custom_minimum_size = Vector2(620, 0)
	dialog.grow_horizontal = Control.GROW_DIRECTION_BOTH
	dialog.grow_vertical = Control.GROW_DIRECTION_BEGIN
	dialog.offset_bottom = -90
	ui_layer.add_child(dialog)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 14)
	dialog.add_child(vb)
	dialog_title = Label.new()
	dialog_title.add_theme_font_override("font", font_bold)
	dialog_title.add_theme_font_size_override("font_size", 30)
	vb.add_child(dialog_title)
	dialog_body = Label.new()
	dialog_body.add_theme_font_override("font", font)
	dialog_body.add_theme_font_size_override("font_size", 22)
	dialog_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialog_body.custom_minimum_size = Vector2(580, 0)
	vb.add_child(dialog_body)
	var back := _make_button("OK", 22)
	back.pressed.connect(func(): dialog.visible = false)
	vb.add_child(back)
	quiz = preload("res://scripts/quiz.gd").new()
	ui_layer.add_child(quiz)
	quiz.setup(font, font_bold, test_mode, bank)
	quiz.finished.connect(_on_quiz_finished)
	quiz.turn_done.connect(_on_turn_done)
	quiz.closed.connect(_on_quiz_closed)
	quiz.answered.connect(_on_answered)

func _normal_total() -> int:
	var n := 0
	for L in LOCS:
		if not L.get("boss", false):
			n += 1
	return n

func _normal_cleared() -> int:
	var n := 0
	for L in LOCS:
		if not L.get("boss", false) and cleared.has(L["id"]):
			n += 1
	return n

func _boss_unlocked() -> bool:
	return _normal_cleared() >= _normal_total()

func _refresh_ui() -> void:
	for L in LOCS:
		var b: Button = ui_buttons[L["id"]]
		var t: String = "%s\n%s" % [L["zh"], L["word"]]
		if L.get("boss", false):
			t = ("BOSS " if _boss_unlocked() else "LOCKED ") + t
		if cleared.has(L["id"]):
			t = "✓ " + t
		b.text = t
	var tip := "Boss areas are open!  魔王區已開放！" if _boss_unlocked() else "Clear all 11 places to open the boss areas.  通關 11 個地點後解鎖魔王區"
	ui_status.text = "%d / %d   %s" % [_normal_cleared(), _normal_total(), tip]

func _loc(id: String) -> Dictionary:
	for L in LOCS:
		if L["id"] == id:
			return L
	return {}

func _show_dialog(title: String, body: String) -> void:
	dialog_title.text = title
	dialog_body.text = body
	dialog.visible = true

# ---------- 路徑 ----------
func _project(p: Vector3) -> Dictionary:
	var best := {"d": 1e9}
	for i in EDGES.size():
		var a: Vector3 = w(NODES[EDGES[i][0]])
		var b: Vector3 = w(NODES[EDGES[i][1]])
		var ab := b - a
		var t := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		var q := a + ab * t
		var d := q.distance_to(p)
		if d < best["d"]:
			best = {"d": d, "q": q, "edge": i}
	return best

func _route(from_p: Vector3, to_p: Vector3) -> Array:
	var ps := _project(from_p)
	var pt := _project(to_p)
	var pos := {}
	var adj := {}
	for k in NODES:
		pos[k] = w(NODES[k])
		adj[k] = {}
	for e in EDGES:
		var dd: float = pos[e[0]].distance_to(pos[e[1]])
		adj[e[0]][e[1]] = dd
		adj[e[1]][e[0]] = dd
	pos["S"] = ps["q"]
	adj["S"] = {}
	pos["T"] = pt["q"]
	adj["T"] = {}
	for pair in [["S", ps], ["T", pt]]:
		var vid: String = pair[0]
		var e: Array = EDGES[pair[1]["edge"]]
		for end in e:
			var dd: float = pos[vid].distance_to(pos[end])
			adj[vid][end] = dd
			adj[end][vid] = dd
	if ps["edge"] == pt["edge"]:
		var d2: float = pos["S"].distance_to(pos["T"])
		adj["S"]["T"] = d2
		adj["T"]["S"] = d2
	var dist := {}
	var prev := {}
	var open := ["S"]
	for k in pos:
		dist[k] = 1e9
	dist["S"] = 0.0
	while open.size() > 0:
		open.sort_custom(func(a, b): return dist[a] < dist[b])
		var u: String = open.pop_front()
		if u == "T":
			break
		for v in adj[u]:
			var nd: float = dist[u] + adj[u][v]
			if nd < dist[v]:
				dist[v] = nd
				prev[v] = u
				if not open.has(v):
					open.append(v)
	var out := []
	var cur := "T"
	while cur != "S":
		out.push_front(pos[cur])
		cur = prev[cur]
	out.push_front(pos["S"])
	return out

func go_to(id: String) -> void:
	if busy or quiz.visible:
		return
	var L := _loc(id)
	if L.get("boss", false) and not _boss_unlocked():
		sfx("wrong")
		_show_dialog("LOCKED  魔王區還沒開放", "Clear all 11 places first (%d / %d).\n先通關 11 個一般地點，再來挑戰魔王！" % [_normal_cleared(), _normal_total()])
		return
	dialog.visible = false
	map_mode = false
	map_btn.text = "Map 地圖"
	sfx("click")
	target_id = id
	var door: Vector3 = loc_world[id]["door"]
	path = _route(player.position, door)
	path.push_front(player.position)

func _arrive() -> void:
	var L := _loc(target_id)
	var id := target_id
	target_id = ""
	if not quiz.has_plan(id):
		_show_dialog(L["zh"], "No questions here yet.")
		return
	sfx("arrive")
	var left: int = quiz.remaining(id)
	combo.clear()
	if left > 0:
		_start_battle(id, left)
		if BOSSES.has(id):
			play_music("boss")
			sfx("boss_appear")
			await _show_banner("BOSS！ %s" % BOSSES[id]["en"], 1.4)
		else:
			play_music("battle")
	quiz.start(id, "%s %s" % [L["zh"], L["word"]])
	set_music_duck(true)
	sfx("question")
	_update_hud()

func _on_quiz_finished(id: String, _summary: Dictionary) -> void:
	var newly := not cleared.has(id)
	cleared[id] = true
	if newly and not BOSSES.has(id) and _boss_unlocked():
		sfx("unlock")
	_end_battle()
	_refresh_ui()
	Host.report({"type": "cleared", "loc": id, "cleared": cleared.keys()})
	if cleared.size() >= LOCS.size():
		await _show_banner("任務完成！ Mission Complete!", 2.0)
		Host.report({"type": "complete"})

func _on_quiz_closed() -> void:
	_end_battle()

# ---------- 戰鬥 ----------
func _start_battle(id: String, n: int) -> void:
	_end_battle()
	battle_loc = id
	var door: Vector3 = loc_world[id]["door"]
	var pr := _project(door)
	var e: Array = EDGES[pr["edge"]]
	var t: Vector3 = (w(NODES[e[1]]) - w(NODES[e[0]])).normalized()
	# 怪物站在畫面「上方」（遠離鏡頭的 -Z 方向），才不會被鏡頭和題目擋住
	if t.z > 0.01 or (absf(t.z) <= 0.01 and t.x < 0):
		t = -t
	var side := Vector3(t.z, 0, -t.x)
	var infos: Array = []
	var hps: Array = []
	if BOSSES.has(id):
		infos = [BOSSES[id]]
		hps = [n]
	else:
		var pool := MONSTERS.duplicate()
		pool.shuffle()
		var first := int(ceil(n / 2.0))
		if n - first > 0:
			infos = [pool[0], pool[1]]
			hps = [first, n - first]
		else:
			infos = [pool[0]]
			hps = [n]
	player.position = door - t * 2.5
	player.rotation.y = atan2(t.x, t.z)
	path.clear()
	var center := door + t * (18.0 if BOSSES.has(id) else FOE_DIST)
	for i in infos.size():
		var info: Dictionary = infos[i]
		var m := _fit_model(info["id"], info["size"] * (1.0 if BOSSES.has(id) else MONSTER_SCALE))
		var off := 0.0 if infos.size() == 1 else (-FOE_GAP if i == 0 else FOE_GAP)
		m.position = center + side * off + t * (1.2 * i) + Vector3(0, FOOT, 0)
		m.rotation.y = atan2(-t.x, -t.z)
		add_child(m)
		var h: float = m.get_meta("height")
		var lab := _label3d("", Vector3.ZERO, 26, m)
		lab.scale = Vector3.ONE / m.scale.x
		lab.position = Vector3(0, (h + 0.9) / m.scale.x, 0)
		var foe := {"node": m, "hp": hps[i], "max": hps[i], "info": info, "label": lab}
		foes.append(foe)
		_update_foe_label(foe)
		# 答題時怪物在前方左右搖擺（挑釁但不攻擊）
		var base_rot := m.rotation.y
		var tw := create_tween().set_loops()
		tw.tween_property(m, "rotation:y", base_rot + 0.25, 0.7 + 0.1 * i).set_trans(Tween.TRANS_SINE)
		tw.parallel().tween_property(m, "position:y", FOOT + 0.3, 0.7 + 0.1 * i).set_trans(Tween.TRANS_SINE)
		tw.tween_property(m, "rotation:y", base_rot - 0.25, 0.7 + 0.1 * i).set_trans(Tween.TRANS_SINE)
		tw.parallel().tween_property(m, "position:y", FOOT, 0.7 + 0.1 * i).set_trans(Tween.TRANS_SINE)
		foe["tween"] = tw
	battle_center = center
	_hide_occluders()
	ui_status.visible = false
	ui_bar.visible = false
	map_btn.visible = false
	player_model.visible = false
	quiz.set_battle_layout(true)

func _update_foe_label(foe: Dictionary) -> void:
	var info: Dictionary = foe["info"]
	var hearts := ""
	for k in foe["max"]:
		hearts += "♥" if k < foe["hp"] else "♡"
	foe["label"].text = "%s\n%s  %s" % [info["zh"], info["en"], hearts]

func _update_hud() -> void:
	var parts: Array = []
	for f in foes:
		if f["hp"] > 0:
			parts.append("%s HP %d/%d" % [f["info"]["en"], f["hp"], f["max"]])
	quiz.set_hud("   ".join(parts))

func _alive_foe() -> Dictionary:
	for f in foes:
		if f["hp"] > 0:
			return f
	return {}

func _make_burst_node(n: int) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.one_shot = true
	p.amount = maxi(4, n)
	p.lifetime = 0.8
	p.explosiveness = 1.0
	p.mesh = particle_mesh
	p.direction = Vector3(0, 1, 0)
	p.spread = 180.0
	p.initial_velocity_min = 4.0
	p.initial_velocity_max = 10.0
	p.gravity = Vector3(0, -7, 0)
	p.scale_amount_min = 0.6 * vfx_size
	p.scale_amount_max = 1.6 * vfx_size
	p.emitting = false
	p.position = Vector3(0, -50, 0)
	add_child(p)
	return p

func _pool_next(kind: String, arr: Array):
	var i: int = pool_i[kind]
	pool_i[kind] = (i + 1) % arr.size()
	return arr[i]

func _burst(at: Vector3, color: Color, amount := 26, life := 0.8) -> void:
	if pool_big.is_empty():
		return
	var big := amount >= 24
	var p: CPUParticles3D = _pool_next("big" if big else "small", pool_big if big else pool_small)
	p.material_override = _glow(color)
	p.lifetime = life
	p.position = at
	p.restart()

func _float_text(text: String, at: Vector3, color: Color, bounce := false) -> void:
	if pool_text.is_empty():
		return
	var l: Label3D = _pool_next("text", pool_text)
	if l.has_meta("tw"):
		var old: Tween = l.get_meta("tw")
		if old != null and old.is_valid():
			old.kill()
	l.text = text
	l.position = at
	l.modulate = color
	l.scale = Vector3.ONE
	l.visible = true
	var tw := create_tween()
	l.set_meta("tw", tw)
	if bounce:
		l.scale = Vector3.ONE * 0.3
		tw.tween_property(l, "scale", Vector3.ONE * 1.5, 0.16).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.tween_property(l, "scale", Vector3.ONE, 0.14)
	tw.tween_property(l, "position:y", at.y + 2.5, 0.8)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 0.8).set_delay(0.3)
	tw.tween_callback(func(): l.visible = false)

func _show_banner(text: String, secs: float) -> void:
	banner.text = text
	banner.visible = true
	await get_tree().create_timer(secs).timeout
	banner.visible = false

## 答對一題 → Ken 發出一次「非暴力」攻擊（泡泡、光束、棒球、籃球、星星）→ 怪物少 1 顆愛心；
## 最後一題是最後一擊。怪物被打倒時化成星光飄走，不出現任何刀、槍等武器。
const ATTACKS := [
	{"kind": "bubble", "word": "POP!", "zh": "泡泡"},
	{"kind": "beam", "word": "Zap!", "zh": "光束"},
	{"kind": "baseball", "word": "Strike!", "zh": "棒球"},
	{"kind": "basketball", "word": "Swish!", "zh": "籃球"},
	{"kind": "star", "word": "Twinkle!", "zh": "星星"},
	{"kind": "water", "word": "Splash!", "zh": "水柱"},
	{"kind": "fire", "word": "Fwoosh!", "zh": "火焰"},
	{"kind": "wind", "word": "Whoosh!", "zh": "強風"},
]
var attack_index := 0

func _glow(c: Color, alpha := 1.0) -> StandardMaterial3D:
	var key := "%s|%.2f" % [c.to_html(), alpha]
	if not glow_cache.has(key):
		glow_cache[key] = _glow_mat(c, alpha)
	return glow_cache[key]

func _glow_mat(c: Color, alpha := 1.0) -> StandardMaterial3D:
	var m := _mat(Color(c.r, c.g, c.b, alpha), 0.3)
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = 0.6
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return m

func _make_projectile(kind: String) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sp := SphereMesh.new()
	match kind:
		"bubble":
			sp.radius = 0.7
			sp.height = 1.4
			mi.material_override = _glow(Color(0.55, 0.85, 1.0), 0.45)
		"baseball":
			sp.radius = 0.35
			sp.height = 0.7
			mi.material_override = _mat(Color(0.97, 0.96, 0.92), 0.6)
		"basketball":
			sp.radius = 0.55
			sp.height = 1.1
			mi.material_override = _mat(Color(0.95, 0.5, 0.15), 0.7)
		"fire":
			sp.radius = 0.55
			sp.height = 1.1
			mi.material_override = _glow(Color(1.0, 0.45, 0.1), 0.9)
		_:
			sp.radius = 0.45
			sp.height = 0.9
			sp.radial_segments = 5
			sp.rings = 2
			mi.material_override = _glow(Color(1.0, 0.9, 0.3))
	mi.mesh = sp
	return mi

## 答對一題只記下星星數；這個地點的題目全部答完，才出現「Attack! 攻擊」按鈕，由學生手動一擊一擊發動。
## 20 秒沒按就自動把剩下的攻擊發完；剩 2 擊以上可以按「全部發動」。
func _on_turn_done(is_last: bool) -> void:
	var qid: String = quiz.item.get("id", "")
	combo.append(int(quiz.results.get(qid, {}).get("quality", 1)))
	if not is_last or foes.is_empty():
		quiz.resume()
		if not is_last:
			sfx("question")
		return
	busy = true
	set_music_duck(false)
	await _show_banner("Combo x%d!  %d 連擊！" % [combo.size(), combo.size()], 1.1)
	atk_pending = combo.duplicate()
	combo.clear()
	atk_timer = ATTACK_WAIT
	atk_running = false
	_refresh_attack_ui()
	atk_ui.visible = true

func _refresh_attack_ui() -> void:
	var n := atk_pending.size()
	atk_btn.text = "Attack! 攻擊   剩 %d 擊   %d" % [n, int(ceil(atk_timer))]
	atk_btn.disabled = atk_running or n == 0
	all_btn.visible = n >= 2
	all_btn.disabled = atk_running

func _on_attack_pressed() -> void:
	if atk_running or atk_pending.is_empty():
		return
	atk_running = true
	var foe := _alive_foe()
	if not foe.is_empty():
		var q: int = atk_pending.pop_front()
		_refresh_attack_ui()
		await _attack_once(foe, q, atk_pending.is_empty())
	else:
		atk_pending.clear()
	atk_running = false
	atk_timer = ATTACK_WAIT
	if atk_pending.is_empty() or _alive_foe().is_empty():
		await _finish_attacks()
	else:
		_refresh_attack_ui()

func _on_attack_all_pressed() -> void:
	if atk_running:
		return
	while not atk_pending.is_empty() and not _alive_foe().is_empty():
		await _on_attack_pressed()
		if not atk_ui.visible:
			return

func _finish_attacks() -> void:
	atk_ui.visible = false
	atk_pending.clear()
	sfx("victory")
	_burst(cam.position + _fwd() * 6.0 + Vector3(0, 1.5, 0), Color(1, 1, 0.5), 60)
	await _show_banner("勝利！ Victory!", 1.6)
	_update_hud()
	busy = false
	quiz.resume()
	set_music_duck(true)

func _attack_tick(delta: float) -> void:
	_update_trails()
	if atk_running or (atk_ui != null and atk_ui.visible):
		frame_max = maxf(frame_max, delta)
	# 震動慢慢停下
	if shake > 0.0:
		shake = maxf(0.0, shake - delta * 1.6)
		cam.h_offset = randf_range(-shake, shake) * 0.5
		cam.v_offset = randf_range(-shake, shake) * 0.5
	elif cam.h_offset != 0.0 or cam.v_offset != 0.0:
		cam.h_offset = 0.0
		cam.v_offset = 0.0
	# iPad 跑不動時自動降一級特效
	fps_check -= delta
	if fps_check <= 0.0:
		fps_check = 1.0
		if vfx_level == 2 and Engine.get_frames_per_second() < 24 and atk_running:
			vfx_level = 1
	if atk_ui == null or not atk_ui.visible or atk_running:
		return
	atk_timer -= delta
	if atk_timer <= 0.0:
		atk_timer = 0.0
		_on_attack_all_pressed()
	else:
		_refresh_attack_ui()

## 答題時的怪物反應：答錯 → 怪物跳起來做鬼臉、發出可愛笑聲（不會攻擊 Ken）。
func _on_answered(correct: bool) -> void:
	if correct:
		sfx("correct")
		return
	sfx("wrong")
	var foe := _alive_foe()
	if foe.is_empty():
		return
	var m: Node3D = foe["node"]
	sfx("monster_laugh", 1.3)
	_float_text("Hee-hee!", m.position + Vector3(0, m.get_meta("height") + 0.6, 0), Color(1, 0.7, 0.9))
	var jump := create_tween()
	jump.tween_property(m, "position:y", FOOT + 1.2, 0.15).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	jump.tween_property(m, "position:y", FOOT, 0.2).set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)

## 第一人稱時，把擋在「玩家眼睛 → 怪物（頭、身體、腳）」之間的樹、路燈、建築暫時藏起來。
## 用每個物件的實際外框（AABB）判斷，不只看中心點，所以大型建築的邊角也會被處理。
func _global_aabb(n: Node) -> AABB:
	var acc: Array = []
	_collect_global_aabb(n, acc)
	if acc.is_empty():
		return AABB()
	var bb: AABB = acc[0]
	for i in range(1, acc.size()):
		bb = bb.merge(acc[i])
	return bb

func _collect_global_aabb(n: Node, acc: Array) -> void:
	if n is MeshInstance3D:
		var mi := n as MeshInstance3D
		acc.append(mi.global_transform * mi.get_aabb())
	for c in n.get_children():
		_collect_global_aabb(c, acc)

func _hide_occluders() -> void:
	var cands: Array = occluders.duplicate()
	for id in loc_world:
		for c in loc_world[id]["root"].get_children():
			if c is Node3D and not (c is StaticBody3D):
				cands.append(c)
	var eye := player.position + Vector3(0, EYE_H, 0)
	var targets: Array = []
	for f in foes:
		var m: Node3D = f["node"]
		var h: float = m.get_meta("height")
		var wd: float = m.get_meta("width") * 0.5
		for y in [0.15, 0.5, 0.95]:
			for x in [-wd, 0.0, wd]:
				targets.append(m.position + Vector3(x, h * y, 0))
	for n in cands:
		if not (n is Node3D) or not n.visible:
			continue
		var bb := _global_aabb(n)
		if bb.size == Vector3.ZERO:
			continue
		bb = bb.grow(0.3)
		for tp in targets:
			if bb.intersects_segment(eye, tp):
				n.visible = false
				hidden_now.append(n)
				break

func _fwd() -> Vector3:
	return Vector3(sin(player.rotation.y), 0, cos(player.rotation.y))

## 一擊：從畫面前方（玩家的手）射向怪物。8 種攻擊一律最華麗：發光拖尾、命中衝擊波、大量粒子、
## 字樣放大彈跳、怪物被擊退後彈回。4 星那一擊加「Critical! 會心一擊」金光。
## 魔王關再疊加：畫面震動、全螢幕閃光（≤0.15 秒）、雙倍粒子、追加小爆炸；最後一擊慢動作＋星光煙火。
func _attack_once(foe: Dictionary, quality: int, is_final := false) -> void:
	var m: Node3D = foe["node"]
	var boss := BOSSES.has(battle_loc)
	var atk: Dictionary = ATTACKS[attack_index % ATTACKS.size()]
	attack_index += 1
	var power := 1.6
	var from := cam.position + _fwd() * 1.2 + Vector3(0, -0.7, 0)
	var to := m.position + Vector3(0, m.get_meta("height") * 0.55, 0)
	var col := _attack_color(atk["kind"])
	sfx("atk_" + atk["kind"])
	if atk["kind"] == "wind":
		for r in 4:
			var ring := MeshInstance3D.new()
			var tor := TorusMesh.new()
			tor.inner_radius = 0.55
			tor.outer_radius = 0.85
			ring.mesh = tor
			ring.material_override = _glow(col, 0.6)
			add_child(ring)
			ring.position = from
			ring.look_at_from_position(from, to, Vector3.UP)
			ring.rotate_object_local(Vector3.RIGHT, PI / 2.0)
			ring.scale = Vector3.ONE * power
			_attach_trail(ring, col)
			var rt := create_tween()
			rt.tween_interval(0.07 * r)
			rt.tween_property(ring, "position", to, 0.35)
			rt.parallel().tween_property(ring, "scale", Vector3.ONE * 2.2 * power, 0.35)
			rt.tween_callback(_drop_trail.bind(ring))
			rt.tween_callback(ring.queue_free)
		await get_tree().create_timer(0.55).timeout
	elif atk["kind"] == "beam" or atk["kind"] == "water":
		var beam := MeshInstance3D.new()
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.25 * power
		cyl.bottom_radius = 0.25 * power
		cyl.height = 1.0
		beam.mesh = cyl
		beam.material_override = _glow(col, 0.85)
		add_child(beam)
		beam.position = (from + to) / 2.0
		beam.look_at_from_position(beam.position, to, Vector3.UP)
		beam.rotate_object_local(Vector3.RIGHT, PI / 2.0)
		beam.scale = Vector3(1, from.distance_to(to), 1)
		# 光束外層的光暈
		var glow := MeshInstance3D.new()
		var cyl2 := CylinderMesh.new()
		cyl2.top_radius = 0.6 * power
		cyl2.bottom_radius = 0.6 * power
		cyl2.height = 1.0
		glow.mesh = cyl2
		glow.material_override = _glow(col.lightened(0.4), 0.25)
		beam.add_child(glow)
		for k in 5:
			_burst(from.lerp(to, 0.2 * k), col, 10, 0.4)
		var bt := create_tween()
		bt.tween_property(beam, "scale:x", 2.4, 0.15)
		bt.parallel().tween_property(beam, "scale:z", 2.4, 0.15)
		bt.tween_property(beam, "scale:x", 0.05, 0.3)
		bt.parallel().tween_property(beam, "scale:z", 0.05, 0.3)
		bt.tween_callback(beam.queue_free)
		await get_tree().create_timer(0.22).timeout
	else:
		var proj := _make_projectile(atk["kind"])
		add_child(proj)
		proj.position = from
		proj.scale = Vector3.ONE * power
		_attach_trail(proj, col)
		var mid := (from + to) / 2.0 + Vector3(0, 1.6 if atk["kind"] != "bubble" else 0.6, 0)
		var flight := 0.5 if atk["kind"] == "bubble" else 0.38
		var pt := create_tween()
		pt.tween_method(func(k: float):
			var a := from.lerp(mid, k)
			var b := mid.lerp(to, k)
			proj.position = a.lerp(b, k)
			proj.rotation.x += 0.4
			proj.rotation.y += 0.3, 0.0, 1.0, flight)
		await pt.finished
		_drop_trail(proj)
		proj.queue_free()
	# ---- 命中 ----
	if not is_instance_valid(m) or battle_loc == "":
		return
	foe["hp"] -= 1
	_update_foe_label(foe)
	sfx("hit")
	var mult := 2 if boss else 1
	_burst(to, col, 40 * mult)
	_burst(to, Color(1, 1, 1), 16 * mult, 0.5)
	_shockwave(to, col, 4.5 if boss else 3.2)
	_float_text(atk["word"], to + Vector3(0, 1.2, 0), Color(1, 0.95, 0.5), true)
	if quality >= 4:
		sfx("correct", 1.5)
		_burst(to + Vector3(0, 0.5, 0), Color(1.0, 0.82, 0.2), 36 * mult)
		_shockwave(to, Color(1.0, 0.85, 0.25), 5.5 if boss else 4.2)
		_float_text("Critical! 會心一擊", to + Vector3(0, 2.6, 0), Color(1.0, 0.8, 0.15), true)
	if boss:
		shake = 0.5
		_flash(col.lightened(0.6))
		for k in 3:
			var off := Vector3(randf_range(-1.5, 1.5), randf_range(0.0, 2.0), randf_range(-0.5, 0.5))
			get_tree().create_timer(0.12 * (k + 1)).timeout.connect(func():
				_burst(to + off, col.lightened(0.3), 24)
				_shockwave(to + off, col, 2.0))
	# 怪物被擊退一下再彈回（只動水平方向，不會打斷上下搖擺）
	var away := m.position - cam.position
	away.y = 0
	away = away.normalized() * (1.6 if boss else 1.2)
	var base_scale: Vector3 = m.scale
	var x0 := m.position.x
	var z0 := m.position.z
	var kb := create_tween()
	kb.tween_property(m, "position:x", x0 + away.x, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	kb.parallel().tween_property(m, "position:z", z0 + away.z, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	kb.parallel().tween_property(m, "scale", base_scale * Vector3(1.25, 0.8, 1.25), 0.1)
	kb.tween_property(m, "position:x", x0, 0.35).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	kb.parallel().tween_property(m, "position:z", z0, 0.35).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	kb.parallel().tween_property(m, "scale", base_scale, 0.35).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	await kb.finished
	if not is_instance_valid(m):
		return
	if foe["hp"] <= 0:
		if foe.has("tween"):
			foe["tween"].kill()
		if boss:
			# 最後一擊：慢動作＋滿天星光煙火
			Engine.time_scale = 0.35
			_flash(Color(1, 1, 0.85))
			for k in 10:
				var fp := to + Vector3(randf_range(-5, 5), randf_range(2, 7), randf_range(-2, 2))
				var fc := Color.from_hsv(randf(), 0.6, 1.0)
				get_tree().create_timer(0.06 * k, true, false, true).timeout.connect(func():
					_burst(fp, fc, 40, 0.9)
					_shockwave(fp, fc, 2.5))
			await get_tree().create_timer(1.0, true, false, true).timeout
			Engine.time_scale = 1.0
		sfx("defeat")
		_float_text("Bye-bye!", to + Vector3(0, 2.2, 0), Color(0.85, 0.75, 1.0), true)
		_burst(to, Color(0.95, 0.85, 1.0), 50 * mult)
		var fade := create_tween()
		fade.tween_property(m, "position:y", m.position.y + 3.0, 0.7).set_trans(Tween.TRANS_SINE)
		fade.parallel().tween_property(m, "rotation:y", m.rotation.y + TAU, 0.7)
		fade.parallel().tween_property(m, "scale", base_scale * 0.02, 0.7)
		await fade.finished
		if is_instance_valid(m):
			m.visible = false
	else:
		await get_tree().create_timer(0.1).timeout

## 開場讀題庫，畫面顯示下載進度；失敗時顯示原因並停在這裡。
func _load_bank(init: Dictionary, cjk: FontFile, cjk_bold: FontFile) -> bool:
	bank = preload("res://scripts/bank.gd").new()
	add_child(bank)
	bank.resolve_base(init)
	var layer := CanvasLayer.new()
	layer.layer = 50
	add_child(layer)
	var cover := ColorRect.new()
	cover.color = Color(0.36, 0.62, 0.92)
	cover.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.add_child(cover)
	var lab := Label.new()
	lab.add_theme_font_override("font", font_bold)
	lab.add_theme_font_size_override("font_size", 36)
	lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lab.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	lab.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lab.text = "Loading questions…  讀取題目中…"
	cover.add_child(lab)
	bank.progress.connect(func(d, t): lab.text = "Loading questions…  讀取題目中…  %d%%" % int(100.0 * d / maxf(1.0, t)))
	var ok: bool = await bank.load_all()
	if not ok:
		lab.text = "題目讀取失敗，請重新整理頁面。
Could not load the questions. Please reload.

" + bank.error
		push_error(bank.error)
		return false
	# 任務自己的中文字型放在最前面（涵蓋這個任務的所有中文字），遊戲內建子集當備援
	var rf: Array = [cjk]
	var bf: Array = [cjk_bold]
	if bank.font_regular != null:
		rf.push_front(bank.font_regular)
	if bank.font_bold != null:
		bf.push_front(bank.font_bold)
	(font as FontFile).fallbacks = rf
	(font_bold as FontFile).fallbacks = bf
	layer.queue_free()
	return true

func _detect_mobile() -> void:
	particle_mesh = SphereMesh.new()
	particle_mesh.radius = 0.16
	particle_mesh.height = 0.32
	particle_mesh.radial_segments = 6
	particle_mesh.rings = 3
	is_mobile = OS.has_feature("mobile") or OS.has_feature("web_ios") or OS.has_feature("web_android")
	if OS.has_feature("web") and not is_mobile:
		var r = JavaScriptBridge.eval("(/iPad|iPhone|Android/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform))) ? 1 : 0", true)
		is_mobile = int(r) == 1
	if "--mobile" in OS.get_cmdline_user_args():
		is_mobile = true
	if is_mobile:
		vfx_scale = 0.5
		vfx_size = 1.4

func _build_pools() -> void:
	var big_n := int(48 * vfx_scale)
	var small_n := int(16 * vfx_scale)
	for i in 16:
		pool_big.append(_make_burst_node(big_n))
	for i in 16:
		pool_small.append(_make_burst_node(small_n))
	for i in 8:
		var t := CPUParticles3D.new()
		t.amount = maxi(12, int(36 * vfx_scale))
		t.lifetime = 0.35
		t.local_coords = false
		t.mesh = particle_mesh
		t.gravity = Vector3.ZERO
		t.initial_velocity_min = 0.0
		t.initial_velocity_max = 0.4
		t.scale_amount_min = 0.6 * vfx_size
		t.scale_amount_max = 1.4 * vfx_size
		var curve := Curve.new()
		curve.add_point(Vector2(0, 1))
		curve.add_point(Vector2(1, 0))
		t.scale_amount_curve = curve
		t.emitting = false
		t.position = Vector3(0, -50, 0)
		add_child(t)
		pool_trail.append(t)
	for i in 10:
		var ring := MeshInstance3D.new()
		var tor := TorusMesh.new()
		tor.inner_radius = 0.85
		tor.outer_radius = 1.0
		ring.mesh = tor
		var mat := _glow_mat(Color.WHITE, 0.8)
		mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		ring.material_override = mat
		ring.visible = false
		add_child(ring)
		pool_ring.append(ring)
	for i in 8:
		var l := _label3d("", Vector3(0, -50, 0), 80)
		l.visible = false
		pool_text.append(l)

## 開場預熱：把 8 種攻擊會用到的材質、粒子、光環、大字、音效都先畫／載入一次，
## 網頁版第一次畫某種特效時要編譯著色器、產生字型圖，這就是攻擊時卡一下的原因。
func _prewarm() -> void:
	prewarm_cover = ColorRect.new()
	prewarm_cover.color = Color(0.36, 0.62, 0.92)
	prewarm_cover.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var lab := Label.new()
	lab.text = "Loading…  準備中…"
	lab.add_theme_font_override("font", font_bold)
	lab.add_theme_font_size_override("font_size", 40)
	lab.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	lab.grow_horizontal = Control.GROW_DIRECTION_BOTH
	lab.grow_vertical = Control.GROW_DIRECTION_BOTH
	prewarm_cover.add_child(lab)
	ui_layer.add_child(prewarm_cover)
	_build_pools()
	for nm in ["atk_bubble", "atk_beam", "atk_baseball", "atk_basketball", "atk_star", "atk_water", "atk_fire",
			"atk_wind", "hit", "defeat", "victory", "correct", "wrong", "monster_laugh", "boss_appear", "question", "arrive", "click", "unlock"]:
		if not sfx_cache.has(nm):
			sfx_cache[nm] = load("res://assets/audio/sfx/%s.ogg" % nm)
	var at := cam.global_position + _fwd() * 6.0 + Vector3(0, 0.5, 0)
	var temp: Array = []
	for atk in ATTACKS:
		var kind: String = atk["kind"]
		var col := _attack_color(kind)
		var proj := _make_projectile(kind)
		add_child(proj)
		proj.position = at
		temp.append(proj)
		_attach_trail(proj, col)
		_burst(at, col, 8)
		_shockwave(at, col, 1.0)
		_float_text(atk["word"], at, Color.WHITE)
	for t in ["Critical! 會心一擊", "Bye-bye!", "Hee-hee!", "0123456789"]:
		_float_text(t, at, Color.WHITE)
	var ring := MeshInstance3D.new()
	var tor := TorusMesh.new()
	ring.mesh = tor
	ring.material_override = _glow(Color(0.75, 1.0, 0.85), 0.6)
	ring.position = at
	add_child(ring)
	temp.append(ring)
	var beam := MeshInstance3D.new()
	beam.mesh = CylinderMesh.new()
	beam.material_override = _glow(Color(1.0, 0.95, 0.5), 0.85)
	beam.position = at
	add_child(beam)
	temp.append(beam)
	_flash(Color(1, 1, 1))
	for i in 4:
		await get_tree().process_frame
	for t in temp:
		if is_instance_valid(t):
			t.queue_free()
	prewarm_cover.queue_free()

func _attack_color(kind: String) -> Color:
	match kind:
		"bubble":
			return Color(0.55, 0.85, 1.0)
		"water":
			return Color(0.3, 0.65, 1.0)
		"fire":
			return Color(1.0, 0.45, 0.12)
		"wind":
			return Color(0.75, 1.0, 0.85)
		"beam":
			return Color(1.0, 0.95, 0.5)
		"baseball":
			return Color(1.0, 1.0, 0.95)
		"basketball":
			return Color(1.0, 0.6, 0.2)
		_:
			return Color(1.0, 0.9, 0.3)

## 飛行中的發光拖尾：從池子拿一組粒子，每格跟著投射物移動（粒子留在世界座標，看起來像尾巴）
func _attach_trail(node: Node3D, color: Color) -> void:
	if vfx_level < 2 or pool_trail.is_empty():
		return
	var p: CPUParticles3D = _pool_next("trail", pool_trail)
	p.material_override = _glow(color, 0.7)
	p.global_position = node.global_position
	p.emitting = true
	trail_follow[p] = node

func _drop_trail(node: Node3D) -> void:
	for p in trail_follow.keys():
		if trail_follow[p] == node:
			p.emitting = false
			trail_follow.erase(p)

func _update_trails() -> void:
	for p in trail_follow.keys():
		var n = trail_follow[p]
		if is_instance_valid(n):
			p.global_position = n.global_position
		else:
			p.emitting = false
			trail_follow.erase(p)

## 命中時向外擴散的光環（池子裡每個光環有自己的材質，可以各自淡出）
func _shockwave(at: Vector3, color: Color, size: float) -> void:
	if pool_ring.is_empty():
		return
	var ring: MeshInstance3D = _pool_next("ring", pool_ring)
	if ring.has_meta("tw"):
		var old: Tween = ring.get_meta("tw")
		if old != null and old.is_valid():
			old.kill()
	var mat: StandardMaterial3D = ring.material_override
	mat.albedo_color = Color(color.r, color.g, color.b, 0.8)
	mat.emission = color
	ring.visible = true
	ring.position = at
	ring.look_at_from_position(at, cam.position, Vector3.UP)
	ring.rotate_object_local(Vector3.RIGHT, PI / 2.0)
	ring.scale = Vector3.ONE * 0.2
	var tw := create_tween()
	ring.set_meta("tw", tw)
	tw.tween_property(ring, "scale", Vector3.ONE * size, 0.35).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(mat, "albedo_color:a", 0.0, 0.35)
	tw.tween_callback(func(): ring.visible = false)

## 全螢幕閃光：0.15 秒內淡出、亮度不刺眼
func _flash(color: Color) -> void:
	flash_rect.color = Color(color.r, color.g, color.b, 0.35)
	flash_rect.visible = true
	var tw := create_tween()
	tw.tween_property(flash_rect, "color:a", 0.0, 0.15)
	tw.tween_callback(func(): flash_rect.visible = false)

func _end_battle() -> void:
	for f in foes:
		if f.has("tween"):
			f["tween"].kill()
		if is_instance_valid(f["node"]):
			f["node"].queue_free()
	foes.clear()
	battle_loc = ""
	combo.clear()
	atk_pending.clear()
	if atk_ui != null:
		atk_ui.visible = false
	Engine.time_scale = 1.0
	for n in hidden_now:
		if is_instance_valid(n):
			n.visible = true
	hidden_now.clear()
	if ui_status != null:
		ui_status.visible = true
		ui_bar.visible = true
		map_btn.visible = true
	if player_model != null:
		player_model.visible = true
	if quiz != null:
		quiz.set_hud("")
		quiz.set_battle_layout(false)
	if music_player != null:
		set_music_duck(false)
		play_music("street")

# ---------- 每幀 ----------
func _process(delta: float) -> void:
	if path.size() > 1:
		var nxt: Vector3 = path[1]
		var d := nxt - player.position
		d.y = 0
		var step := SPEED * delta
		if d.length() <= step:
			player.position = nxt
			path.pop_front()
			if path.size() <= 1:
				path.clear()
				if target_id != "":
					_arrive()
		else:
			var dir := d.normalized()
			player.position += dir * step
			var want := atan2(dir.x, dir.z)
			player.rotation.y = lerp_angle(player.rotation.y, want, minf(1.0, delta * 5.0))
			step_timer -= delta
			if step_timer <= 0.0:
				step_timer = 0.34
				sfx("footstep_1" if randi() % 2 == 0 else "footstep_2")
		player_model.position.y = FOOT
		_ken_play(true)
		cam_focus = player.position
	else:
		player_model.position.y = FOOT
		_ken_play(false)
		if battle_loc == "":
			cam_focus = player.position
	_update_camera(false, delta)
	_attack_tick(delta)

## 三種鏡頭：
## - 走路：越肩視角（Ken 背後偏低），平穩跟隨，不晃動。
## - 打怪：第一人稱，從 Ken 的眼睛看向正前方的怪物。
## - 地圖：高空俯視全部地點。
func _update_camera(snap: bool, delta: float) -> void:
	var want_pos: Vector3
	var want_look: Vector3
	var want_fov := 50.0
	if map_mode:
		want_pos = Vector3(0, 78, 64)
		want_look = Vector3(0, 0, 0)
		want_fov = 40.0
	elif battle_loc != "" and not foes.is_empty():
		var eye := player.position + Vector3(0, EYE_H, 0)
		var flat: Vector3 = battle_center - eye
		flat.y = 0
		var d := maxf(flat.length(), 1.0)
		var h := 3.5
		var f0: Dictionary = foes[0]
		if is_instance_valid(f0["node"]):
			h = float(f0["node"].get_meta("height"))
		# 讓怪物頭部落在畫面上方約 1/5 處，題目面板擋住的是怪物下半身
		var head_ang := atan2(h - EYE_H, d)
		# 答題時：怪物頭部在面板上方；連擊攻擊（面板收起）時：怪物移到畫面中間、拉近
		var answering: bool = quiz != null and quiz.visible
		var pitch := head_ang - deg_to_rad((27.0 if BOSSES.has(battle_loc) else 26.0) if answering else 8.0)
		want_pos = eye
		want_look = eye + flat.normalized() * 10.0 + Vector3(0, 10.0 * tan(pitch), 0)
		want_fov = 62.0 if answering else (30.0 if BOSSES.has(battle_loc) else 44.0)
	else:
		var f := _fwd()
		# 越肩鏡頭跟著 Ken 的新身高（2.2 m）拉近、降低，Ken 在畫面上不會變太小
		want_pos = player.position - f * 6.4 + Vector3(0, 3.4, 0)
		want_look = player.position + f * 7.0 + Vector3(0, 1.0, 0)
		want_fov = 55.0
		# 鏡頭和 Ken 之間如果有建築，鏡頭移到建築前面，不會卡在建築裡
		var head := player.position + Vector3(0, KEN_H, 0)
		var q := PhysicsRayQueryParameters3D.create(head, want_pos, 2)
		var hit := get_world_3d().direct_space_state.intersect_ray(q)
		if hit.has("position"):
			want_pos = head.lerp(hit["position"], 0.85)
	var k := 1.0 if snap else minf(1.0, delta * 3.0)
	cam.position = cam.position.lerp(want_pos, k)
	cam_look = cam_look.lerp(want_look, k)
	cam.fov = lerpf(cam.fov, want_fov, k)
	if cam.position.distance_to(cam_look) > 0.01:
		cam.look_at(cam_look, Vector3.UP)

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		var from := cam.project_ray_origin(ev.position)
		var to := from + cam.project_ray_normal(ev.position) * 600.0
		var q := PhysicsRayQueryParameters3D.create(from, to, 2)
		var hit := get_world_3d().direct_space_state.intersect_ray(q)
		if hit.has("collider"):
			var id = hit["collider"].get_meta("loc_id", "")
			if id != "":
				go_to(id)

# ---------- 自動測試（--test）----------
func _shot(shot_name: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	get_viewport().get_texture().get_image().save_png(ProjectSettings.globalize_path("res://test_%s.png" % shot_name))

## --shots：13 個地點逐一進入第一人稱戰鬥，收起題目（＝連擊攻擊時的畫面），各存一張截圖。
func _run_shots() -> void:
	quiz.reset_results()
	await get_tree().create_timer(1.0).timeout
	for L in LOCS:
		if not L.get("boss", false):
			cleared[L["id"]] = true
	_refresh_ui()
	for L in LOCS:
		var id: String = L["id"]
		_end_battle()
		quiz.visible = false
		var door: Vector3 = loc_world[id]["door"]
		var e: Array = EDGES[_project(door)["edge"]]
		var t: Vector3 = (w(NODES[e[1]]) - w(NODES[e[0]])).normalized()
		var to_b: Vector3 = (loc_world[id]["base"] - door).normalized()
		player.position = door - t * 6.0
		var face := (t + to_b * 0.7).normalized()
		player.rotation.y = atan2(face.x, face.z)
		player_model.visible = true
		battle_loc = ""
		foes.clear()
		_update_camera(true, 0.0)
		await get_tree().create_timer(0.8).timeout
		await _shot("walk_%s" % id)
		player.position = door
		var n: int = quiz.plan[id].size()
		_start_battle(id, n)
		battle_loc = id
		set_process(true)
		await get_tree().create_timer(2.2).timeout
		await _shot("loc_%s" % id)
	print("SHOTS DONE ", LOCS.size())
	get_tree().quit()

## --perf：連續 3 個地點，答完題後按 Attack（不截圖），記錄每一擊期間最長的一格。
func _run_perf() -> void:
	quiz.reset_results()
	await get_tree().create_timer(1.5).timeout
	for id in ["station", "inn", "seven"]:
		_end_battle()
		quiz.visible = false
		player.position = loc_world[id]["door"]
		var L := _loc(id)
		target_id = id
		_arrive()
		while not quiz.visible:
			await get_tree().process_frame
		await get_tree().create_timer(1.0).timeout
		while quiz.visible:
			quiz.debug_fill(true)
			quiz.debug_check()
			await get_tree().create_timer(0.15).timeout
			quiz.debug_next()
			await get_tree().create_timer(0.25).timeout
		while not atk_ui.visible:
			await get_tree().process_frame
		var spikes: Array = []
		while not atk_pending.is_empty():
			frame_max = 0.0
			_on_attack_pressed()
			await get_tree().process_frame
			while atk_running:
				await get_tree().process_frame
			# 像學生一樣停 0.8 秒再按下一擊（上一擊的特效物件會在這段時間被回收）
			await get_tree().create_timer(0.8).timeout
			spikes.append(int(frame_max * 1000.0))
		print("PERF ", id, " attack_max_ms=", spikes)
		while busy:
			await get_tree().process_frame
	get_tree().quit()

func _run_test() -> void:
	quiz.reset_results()
	await get_tree().create_timer(1.0).timeout
	go_to("teatop")
	while not quiz.visible:
		await get_tree().process_frame
	await get_tree().create_timer(1.2).timeout
	var n: int = quiz.queue.size()
	for k in n:
		while not quiz.visible:
			await get_tree().process_frame
		quiz.debug_fill(true)
		quiz.debug_check()
		await get_tree().create_timer(0.2).timeout
		quiz.debug_next()
		await get_tree().create_timer(0.3).timeout
	# 答完題：不會自動攻擊，要等 Attack 按鈕
	while not atk_ui.visible:
		await get_tree().process_frame
	await get_tree().create_timer(2.0).timeout
	var still := atk_pending.size()
	await _shot("v4_attack_button")
	print("WAIT CHECK pending_after_2s=", still, " of ", n)
	# 8 種攻擊逐一截圖（命中瞬間）
	atk_pending = [4, 2, 4, 2, 4, 2, 4, 2]
	for f in foes:
		f["hp"] = 5
		f["max"] = 5
	for k in 8:
		_on_attack_pressed()
		var kind: String = ATTACKS[(attack_index - 1) % 8]["kind"]
		await get_tree().create_timer(0.7 if kind == "wind" else 0.6).timeout
		await _shot("v4_atk_%d_%s" % [k, kind])
		while atk_running:
			await get_tree().process_frame
	while busy:
		await get_tree().process_frame
	# 魔王
	_end_battle()
	quiz.visible = false
	for L in LOCS:
		if not L.get("boss", false):
			cleared[L["id"]] = true
	_refresh_ui()
	go_to("park")
	while not quiz.visible:
		await get_tree().process_frame
	await get_tree().create_timer(1.0).timeout
	var bn: int = quiz.queue.size()
	for k in bn:
		while not quiz.visible:
			await get_tree().process_frame
		quiz.debug_fill(true)
		quiz.debug_check()
		await get_tree().create_timer(0.2).timeout
		quiz.debug_next()
		await get_tree().create_timer(0.3).timeout
	while not atk_ui.visible:
		await get_tree().process_frame
	await _shot("v4_boss_button")
	_on_attack_pressed()
	for k in 6:
		await get_tree().create_timer(0.12).timeout
		await _shot("v4_boss_hit_%d" % k)
	while atk_running:
		await get_tree().process_frame
	# 只留最後一擊，看慢動作煙火
	atk_pending = [4]
	for f in foes:
		f["hp"] = 1
	_on_attack_pressed()
	while Engine.time_scale >= 1.0:
		await get_tree().process_frame
	for k in 4:
		await get_tree().create_timer(0.18, true, false, true).timeout
		await _shot("v4_boss_final_%d" % k)
	while not quiz.visible:
		await get_tree().process_frame
	print("TEST DONE combo_n=", n, " boss_n=", bn, " vfx=", vfx_level, " mobile=", is_mobile, " frame_max_ms=", int(frame_max * 1000.0))
	get_tree().quit()
