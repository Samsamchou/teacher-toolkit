extends RefCounted
## iPad 自動跑版（2026-11-09 教師 RDQ：Super Mario Run 式「自動往右跑、點一下跳、按住跳更高」）。
## 每關是一條往 +X 的路線，Ken 只在 z = 0 這條線上跑；方塊深度 4 m，裝飾放在後面（z < -2.5）。
## 版面格式和 levels.gd 相同（boxes、slimes、flags、decos、signs、spawn…），另外有：
##   "run": true、"stars": [Vector3]（Ken 的 x 跑過星星就出題，星星不會漏掉）、"goal": x 座標。
## 地面上緣 y = 0；Ken 跑速約 7.5 m/s，一關約 340 m ≈ 45 秒（不含答題）。
## 第一階段只做第 1 關（station），教師 iPad 試手感確認後再改其他 12 關。

const DEPTH := 4.0

static func has(id: String) -> bool:
	return id in ["station"]

static func layout(id: String) -> Dictionary:
	match id:
		"station":
			return _station()
	return {}

## 地面：x0 到 x1，上緣在 top，往下到 -6
static func _ground(d: Dictionary, x0: float, x1: float, top := 0.0, kind := "ground") -> void:
	var h := top + 6.0
	d["boxes"].append([Vector3((x0 + x1) / 2.0, top - h / 2.0, 0.0), Vector3(x1 - x0, h, DEPTH), kind])

## 小方塊（台階、障礙）：底在 base，上緣 base + h
static func _block(d: Dictionary, x: float, w: float, h: float, base := 0.0, kind := "tall") -> void:
	d["boxes"].append([Vector3(x, base + h / 2.0, 0.0), Vector3(w, h, DEPTH), kind])

static func _decos(d: Dictionary, models: Array, x0: float, x1: float, seed_n: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_n
	var x := x0
	while x < x1:
		var z := -rng.randf_range(5.0, 9.0)   # 離路線遠一點，樹冠不會擋到 Ken（2026-11-10 鏡頭拉近後發現）
		d["decos"].append([models[rng.randi() % models.size()], Vector3(x, 0.0, z), rng.randf() * TAU, rng.randf_range(2.0, 2.8)])
		x += rng.randf_range(5.0, 9.0)

## 金幣：一排（地面上方 1.2 m）
static func _coin_row(d: Dictionary, x0: float, x1: float, top := 0.0, step := 2.0) -> void:
	var x := x0
	while x <= x1:
		d["coins"].append(Vector3(x, top + 1.2, 0))
		x += step

## 金幣：跳過缺口的弧線（點一下或按住都吃得到大部分）
static func _coin_arc(d: Dictionary, x0: float, x1: float, top := 0.0, h := 2.2, n := 5) -> void:
	for i in n:
		var k := float(i) / float(n - 1)
		d["coins"].append(Vector3(lerpf(x0, x1, k), top + 1.2 + h * sin(PI * k), 0))

static func _slime_trio(d: Dictionary, x: float, top := 0.0, gap := 6.5) -> void:
	for i in 3:
		d["slimes"].append([Vector3(x + gap * i, top, 0), Vector3.RIGHT, 0.0])

static func _new(theme: String) -> Dictionary:
	return {"run": true, "theme": theme, "boxes": [], "slimes": [], "flags": [], "movers": [], "decos": [],
		"signs": [], "stars": [], "coins": [], "spawn": Vector3(2, 0.2, 0), "spawn_yaw": PI / 2.0, "goal": 0.0, "route": [], "star_box": []}

## 第 1 關 火車站島（教學關）：小跳 → 自動跨過矮台階與史萊姆 → 高台要按住 → 星星（第 1 題）→ 長的缺口 → 跳石 → 樓梯 → 終點
static func _station() -> Dictionary:
	var d := _new("meadow")
	d["place"] = ["二水火車站", "Ershui Train Station"]
	d["gate"] = "ticket"                 # 終點：剪票口
	d["landmark"] = {"x": 22.0, "z": -15.0, "h": 13.0, "yaw": 0.0}   # 火車站建築（jump3d/landmarks/station.glb）
	_ground(d, -10, 40)
	_coin_row(d, 12, 24)
	_coin_arc(d, 37, 46)
	_coin_row(d, 100, 132, 2.2, 3.0)
	_coin_arc(d, 174, 183)
	_coin_arc(d, 210, 217, 0.0, 2.0, 4)
	_coin_arc(d, 219, 226, 0.0, 2.0, 4)
	_coin_arc(d, 228, 235, 0.0, 2.0, 4)
	_coin_row(d, 272, 298, 4.2, 3.0)
	d["signs"].append([Vector3(8, 0, -2.2), "點一下螢幕就跳\nTap to jump!"])
	_ground(d, 43, 78)                 # 3 m 缺口：點一下
	_block(d, 52, 2.0, 0.8)            # 矮台階：Ken 會自動跨過去
	# 史萊姆 3 隻一組、相隔 6.5 m、不移動（4–5 m 會被彈過頭漏踩，機器人測過）：撞到就踩扁，連續踩出 Nice → Great → Excellent!（2026-11-11 RDQ 3A）
	_slime_trio(d, 57)
	_ground(d, 82, 112)                # 4 m 缺口
	d["signs"].append([Vector3(88, 0, -2.2), "按久一點跳更高\nHold to jump higher!"])
	_ground(d, 96, 140, 2.2, "tall")   # 高台 2.2 m：要按住跳
	d["flags"].append(Vector3(120, 2.2, 0))
	_ground(d, 140, 176)
	# 第 1–10 關各 3 題（排字 1＋聽力 2）：3 顆星星都在路上，Ken 跑過去一定會碰到
	d["stars"].append(Vector3(28, 1.4, 0))
	d["stars"].append(Vector3(158, 1.4, 0))
	d["stars"].append(Vector3(286, 5.6, 0))
	_ground(d, 180, 212)               # 4 m 缺口：按住跳
	d["flags"].append(Vector3(190, 0, 0))
	# 跳石：6 m 寬、間隔 3 m。點一下（約 5 m）或按住（約 8 m）都會落在石頭上
	# （3 m 寬太窄：按住跳會飛過頭掉進下一個缺口，2026-11-09 機器人測試發現）
	for i in 3:
		_block(d, 218.0 + i * 9.0, 6.0, 6.0, -6.0, "ground")
	_ground(d, 242, 340)
	for i in 3:                        # 樓梯：每階 1.4 m（自動跨不過，要點）
		_block(d, 258.0 + i * 4.0, 4.0, 1.4 * (i + 1), 0.0, "tall")
	_ground(d, 268, 300, 4.2, "tall")
	_slime_trio(d, 308)
	d["goal"] = 332.0
	d["flags"].append(Vector3(332, 0, 0))
	_decos(d, ["tree", "tree-pine", "flowers", "flowers-tall", "mushrooms", "rocks", "grass", "plant"], -6, 340, 1)
	return d
