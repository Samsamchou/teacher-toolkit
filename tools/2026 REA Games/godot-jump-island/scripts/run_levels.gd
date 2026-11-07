extends RefCounted
## iPad 自動跑版（2026-11-09 教師 RDQ：Super Mario Run 式「自動往右跑、點一下跳、按住跳更高」）。
## 每關是一條往 +X 的路線，Ken 只在 z = 0 這條線上跑；方塊深度 4 m，裝飾放在後面（z < -2.5）。
## 版面格式和 levels.gd 相同（boxes、slimes、flags、decos、signs、spawn…），另外有：
##   "run": true、"stars": [Vector3]（Ken 的 x 跑過星星就出題，星星不會漏掉）、"goal": x 座標。
## 地面上緣 y = 0；Ken 跑速約 7.5 m/s，一關約 340 m ≈ 45 秒（不含答題）。
## 第一階段只做第 1 關（station），教師 iPad 試手感確認後再改其他 12 關。

const DEPTH := 4.0
const Levels := preload("res://scripts/levels.gd")

static func has(id: String) -> bool:
	return id in ["station", "inn", "seven", "school", "teatop", "market", "post", "bookstore", "pxmart", "library", "farm", "park", "lawn"]

static func layout(id: String) -> Dictionary:
	match id:
		"station":
			return _station()
		"inn":
			return _inn()
		"seven":
			return _seven()
		"school":
			return _school()
		"teatop":
			return _teatop()
		"market":
			return _market()
		"post":
			return _post()
		"bookstore":
			return _bookstore()
		"pxmart":
			return _pxmart()
		"library":
			return _library()
		"farm":
			return _farm()
		"park":
			return _park()
		"lawn":
			return _lawn()
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
		"signs": [], "stars": [], "coins": [], "fruits": [], "qboxes": [], "snails": [], "spawn": Vector3(2, 0.2, 0), "spawn_yaw": PI / 2.0, "goal": 0.0, "route": [], "star_box": []}

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
	# 加分道具（2026-11-07）：寶箱 3 個、水果 3 個；第 1 關不放蝸牛
	d["qboxes"].append([Vector3(18, 3.2, 0), "coins"])
	d["qboxes"].append([Vector3(148, 3.2, 0), "guava"])
	d["qboxes"].append([Vector3(248, 3.2, 0), "coins"])
	d["fruits"].append([Vector3(122, 2.2 + 4.9, 0), "pomelo"])
	d["fruits"].append([Vector3(196, 3.0, 0), "guava"])
	d["fruits"].append([Vector3(280, 4.2 + 4.9, 0), "melon"])
	_decos(d, ["tree", "tree-pine", "flowers", "flowers-tall", "mushrooms", "rocks", "grass", "plant"], -6, 340, 1)
	return d

# ---------------------------------------------------------------- 路線積木（2026-11-07 第 2–13 關）
# 每關用一串積木從左往右接起來：d["_x"] 是目前做到哪、d["_y"] 是目前地面高度。
# 跳躍能力（RUN_GRAV 0.7）：點一下約 2.4 m 高、5–6 m 遠；按住約 5.3 m 高、8 m 遠。
# 所以：台階 ≤ 2.8 m 用點的、≤ 4.5 m 要按住；踢牆的牆 7 m（按住跳不上去，貼牆再點一下才上得去）。

static func _start(d: Dictionary, x0 := -10.0) -> void:
	d["_x"] = x0
	d["_y"] = 0.0

## 平地 L 公尺（可選金幣一排）
static func c_flat(d: Dictionary, L: float, coins := false) -> void:
	var x: float = d["_x"]
	_ground(d, x, x + L, d["_y"], "ground" if float(d["_y"]) <= 0.01 else "tall")
	if coins:
		_coin_row(d, x + 3.0, x + L - 3.0, d["_y"], 2.5)
	d["_x"] = x + L

## 缺口 w 公尺（上面放一排弧形金幣）
static func c_gap(d: Dictionary, w: float) -> void:
	var x: float = d["_x"]
	_coin_arc(d, x - 2.0, x + w + 2.0, d["_y"], 2.0 + w * 0.15)
	d["_x"] = x + w

## 往上一階（h 公尺）再走 L 公尺
static func c_up(d: Dictionary, h: float, L: float, coins := true) -> void:
	d["_y"] = float(d["_y"]) + h
	c_flat(d, L, coins)

## 往下一階
static func c_down(d: Dictionary, h: float, L: float, coins := false) -> void:
	d["_y"] = maxf(0.0, float(d["_y"]) - h)
	c_flat(d, L, coins)

## 跳石：n 塊 6 m 寬、間隔 3 m（點一下或按住都落得到）
static func c_stones(d: Dictionary, n: int, gap := 3.0) -> void:
	for i in n:
		c_gap(d, gap)
		var x: float = d["_x"]
		_block(d, x + 3.0, 6.0, float(d["_y"]) + 6.0, -6.0, "ground")
		d["_x"] = x + 6.0
	c_gap(d, gap)

## 史萊姆 3 隻一組（連踩 Nice → Great → Excellent!）
static func c_slimes(d: Dictionary) -> void:
	var x: float = d["_x"]
	c_flat(d, 26)
	_slime_trio(d, x + 5.0, d["_y"])

## 星星（一題），放在一段平地中間
static func c_star(d: Dictionary, L := 14.0) -> void:
	var x: float = d["_x"]
	c_flat(d, L)
	d["stars"].append(Vector3(x + L * 0.5, float(d["_y"]) + 1.4, 0))

## 矮台階（Ken 自動跨過去）
static func c_hop(d: Dictionary, L := 14.0) -> void:
	var x: float = d["_x"]
	c_flat(d, L)
	_block(d, x + L * 0.5, 2.0, 0.8, d["_y"])

## 路邊提示牌
static func c_sign(d: Dictionary, text: String, dx := 4.0) -> void:
	d["signs"].append([Vector3(float(d["_x"]) + dx, d["_y"], -2.2), text])

## 踢牆：7 m 高的牆，上面走 L 公尺；先放提示牌（第一次出現）
static func c_wall(d: Dictionary, L: float, first := false, h := 7.0) -> void:
	if first:
		c_sign(d, "碰到牆再點一下\nWall kick!", -6.0)
	d["walls"].append(float(d["_x"]))
	c_up(d, h, L, true)

## 移動平台：n 塊 5 m 寬、間隔 3 m，上下慢慢移動 ±amp（第 6 關起）
static func c_movers(d: Dictionary, n: int, amp := 1.0, period := 2.6, first := false) -> void:
	if first:
		c_sign(d, "會動的平台\nMoving platforms!", -6.0)
	var y: float = d["_y"]
	for i in n:
		c_gap(d, 3.0)
		var x: float = d["_x"]
		var ph := amp if i % 2 == 0 else -amp
		d["movers"].append({"a": Vector3(x + 2.5, y - 0.5 - ph, 0), "b": Vector3(x + 2.5, y - 0.5 + ph, 0),
			"size": Vector3(5.0, 1.0, DEPTH), "period": period})
		_coin_row(d, x + 1.0, x + 4.0, y + ph * 0.0, 1.5)
		d["_x"] = x + 5.0
	c_gap(d, 3.0)

## 終點：平地＋終點門
static func c_goal(d: Dictionary, L := 30.0) -> void:
	var x: float = d["_x"]
	c_flat(d, L)
	d["goal"] = x + L - 12.0   # 終點門就是終點（不放旗子，過關慶祝時旗桿會擋住 Ken）

static func _finish(d: Dictionary, theme: String, seed_n: int) -> void:
	_fill_items(d, seed_n, float(d["_x"]))      # seed_n 就是第幾關
	var models: Array = Levels.THEMES[theme]["deco"]
	_decos(d, models, -6.0, float(d["_x"]), seed_n)
	d.erase("_x")
	d.erase("_y")

static func _level(theme: String, time: String, place: Array, gate: String, lm_h: float) -> Dictionary:
	var d := _new(theme)
	d["time"] = time
	d["place"] = place
	d["gate"] = gate
	d["landmark"] = {"x": 24.0, "z": -15.0, "h": lm_h, "yaw": 0.0}
	d["walls"] = []
	_start(d)
	return d

# ---------------------------------------------------------------- 加分道具與扣分障礙（2026-11-07 RDQ score-items-hazards）
# 水果：芭樂 guava +50（點一下吃得到）、柚子 pomelo +100（要按住跳）、西瓜 melon +200（要按住跳或踢牆上去）
# 「？」寶箱：底在地面上 3.2 m，點一下跳就頂得到；裡面是金幣（5 枚 +50）或水果
# 刺殼蝸牛：碰到扣 50 分，只能跳過去（第 2 關起）

const FRUIT_DY := {"guava": 3.0, "pomelo": 4.9, "melon": 4.9}

## 在剛做好的路段上方放水果（dx 從目前 x 往回算）
static func c_fruit(d: Dictionary, kind: String, dx := -6.0) -> void:
	d["fruits"].append([Vector3(float(d["_x"]) + dx, float(d["_y"]) + float(FRUIT_DY[kind]), 0), kind])

## 一段平地，中間上方有「？」寶箱
static func c_qbox(d: Dictionary, item := "coins", L := 16.0) -> void:
	var x: float = d["_x"]
	c_flat(d, L)
	d["qboxes"].append([Vector3(x + L * 0.5, float(d["_y"]) + 3.2, 0), item])

## 一段平地，中間有刺殼蝸牛（第一次出現放提示牌）
static func c_snail(d: Dictionary, first := false, L := 18.0) -> void:
	if first:
		c_sign(d, "跳過蝸牛！\nJump over!", 2.0)
	var x: float = d["_x"]
	c_flat(d, L)
	d["snails"].append(Vector3(x + L * 0.6, d["_y"], 0))

# ---------------------------------------------------------------- 第 2–6 關（第一批）

## 第 2 關 驛站島（早上）：和第 1 關差不多難，多一段上坡；第一次出現蝸牛
static func _inn() -> Dictionary:
	var d := _level("autumn", "morning", ["二八水驛站", "Ershui Inn"], "inn", 10.0)
	c_flat(d, 34, true)
	c_star(d)
	c_qbox(d, "coins")
	c_gap(d, 3.0)
	c_hop(d)
	c_slimes(d)
	c_snail(d, true)
	c_gap(d, 4.0)
	c_flat(d, 10)
	c_up(d, 2.2, 30)
	c_fruit(d, "pomelo", -12)
	c_star(d)
	c_down(d, 2.2, 14)
	c_gap(d, 4.0)
	c_qbox(d, "guava")
	c_stones(d, 3)
	c_flat(d, 10)
	c_up(d, 1.4, 6, false)
	c_up(d, 1.4, 22)
	c_fruit(d, "melon", -10)
	c_star(d)
	c_down(d, 2.8, 8)
	c_snail(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "autumn", 2)
	return d

## 第 3 關 便利商店島（中午）：缺口多一點、高台一樣
static func _seven() -> Dictionary:
	var d := _level("mint", "noon", ["便利商店", "Convenience Store"], "store", 10.0)
	c_flat(d, 34, true)
	c_star(d)
	c_qbox(d, "coins")
	c_gap(d, 3.5)
	c_flat(d, 14, true)
	c_fruit(d, "guava", -7)
	c_gap(d, 4.0)
	c_slimes(d)
	c_snail(d)
	c_up(d, 2.4, 24)
	c_fruit(d, "pomelo", -10)
	c_gap(d, 3.5)
	c_flat(d, 16)
	c_star(d)
	c_down(d, 2.4, 10)
	c_stones(d, 4)
	c_qbox(d, "pomelo")
	c_hop(d)
	c_up(d, 1.4, 6, false)
	c_up(d, 1.4, 6, false)
	c_up(d, 1.4, 20)
	c_fruit(d, "melon", -8)
	c_star(d)
	c_down(d, 4.2, 10)
	c_snail(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "mint", 3)
	return d

## 第 4 關 國小島（雨後）：第一次出現踢牆跳
static func _school() -> Dictionary:
	var d := _level("meadow", "after_rain", ["二水國小", "Ershui Elementary School"], "school", 15.0)
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_star(d)
	c_qbox(d, "coins")
	c_gap(d, 3.5)
	c_slimes(d)
	c_flat(d, 14)
	c_wall(d, 26, true)
	c_fruit(d, "melon", -8)
	c_down(d, 7.0, 12)
	c_star(d)
	c_snail(d)
	c_gap(d, 4.0)
	c_stones(d, 3)
	c_qbox(d, "guava")
	c_wall(d, 20)
	c_gap(d, 4.0)
	c_flat(d, 14, true)
	c_down(d, 7.0, 10)
	c_star(d)
	c_snail(d)
	c_fruit(d, "pomelo", -6)
	c_slimes(d)
	c_goal(d)
	_finish(d, "meadow", 4)
	return d

## 第 5 關 飲料店島（黃昏）：踢牆＋高台組合
static func _teatop() -> Dictionary:
	var d := _level("sunset", "sunset", ["飲料店", "Tea Shop"], "tea", 10.0)
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_star(d)
	c_snail(d)
	c_gap(d, 4.0)
	c_up(d, 2.4, 18)
	c_fruit(d, "pomelo", -8)
	c_gap(d, 3.5)
	c_flat(d, 12)
	c_down(d, 2.4, 10)
	c_slimes(d)
	c_wall(d, 22)
	c_fruit(d, "melon", -14)
	c_star(d)
	c_down(d, 7.0, 10)
	c_stones(d, 4)
	c_qbox(d, "coins")
	c_wall(d, 16)
	c_down(d, 3.0, 14)
	c_star(d)
	c_down(d, 4.0, 10)
	c_qbox(d, "guava")
	c_snail(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "sunset", 5)
	return d

## 第 6 關 超市島（陰天中午）：第一次出現移動平台
static func _market() -> Dictionary:
	var d := _level("teal", "cloudy", ["二水超市", "Ershui Supermarket"], "market", 11.0)
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_star(d)
	c_qbox(d, "coins")
	c_gap(d, 3.5)
	c_slimes(d)
	c_snail(d)
	c_flat(d, 10)
	c_movers(d, 3, 1.0, 2.6, true)
	c_flat(d, 14)
	c_fruit(d, "pomelo", -7)
	c_star(d)
	c_wall(d, 18)
	c_fruit(d, "melon", -9)
	c_down(d, 7.0, 10)
	c_stones(d, 3)
	c_qbox(d, "guava")
	c_movers(d, 4, 1.2, 2.4)
	c_flat(d, 10)
	c_star(d)
	c_snail(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "teal", 6)
	return d

# ---------------------------------------------------------------- 蝸牛、寶箱逐關增加（2026-11-07 RDQ 3B：每兩關加一）
#              第 1  2  3  4  5  6  7  8  9 10 11 關
const SNAILS := [0, 0, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]
const QBOXES := [0, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8]

## 某個 x 上最上面那層地面的高度（沒有地面回傳 -INF）
static func _top_at(d: Dictionary, x: float) -> float:
	var top := -INF
	for b in d["boxes"]:
		var c: Vector3 = b[0]
		var s: Vector3 = b[1]
		if x >= c.x - s.x * 0.5 and x <= c.x + s.x * 0.5:
			top = maxf(top, c.y + s.y * 0.5)
	return top

## 這個 x 前後 r 公尺內地面高度都一樣（沒有缺口、台階、牆）
static func _flat_around(d: Dictionary, x: float, r: float) -> bool:
	var y := _top_at(d, x)
	if y == -INF:
		return false
	var k := -r
	while k <= r:
		if absf(_top_at(d, x + k) - y) > 0.01:
			return false
		k += 1.0
	return true

## 補足這關的蝸牛與寶箱數量：在平坦、遠離缺口／星星／史萊姆／其他道具的地方平均放
static func _fill_items(d: Dictionary, n: int, x_end: float) -> void:
	var want_s: int = SNAILS[n] if n < SNAILS.size() else 0
	var want_b: int = QBOXES[n] if n < QBOXES.size() else 0
	var taken: Array = []           # 已經有東西的 x
	for s in d["stars"]:
		taken.append((s as Vector3).x)
	for s in d["slimes"]:
		taken.append((s[0] as Vector3).x)
	for s in d["snails"]:
		taken.append((s as Vector3).x if s is Vector3 else (s[0] as Vector3).x)
	for b in d["qboxes"]:
		taken.append((b[0] as Vector3).x)
	for f in d["fruits"]:
		taken.append((f[0] as Vector3).x)
	for w in d.get("walls", []):
		taken.append(float(w))
	for m in d["movers"]:
		taken.append((m["a"] as Vector3).x)
	for sg in d["signs"]:
		taken.append((sg[0] as Vector3).x)
	var goal: float = d["goal"]
	for kind in ["snail", "qbox"]:
		var need: int = (want_s - d["snails"].size()) if kind == "snail" else (want_b - d["qboxes"].size())
		var gap_min := 14.0
		while need > 0 and gap_min >= 6.0:
			var x := 40.0
			while x < goal - 16.0 and need > 0:
				var ok := _flat_around(d, x, 7.0 if kind == "snail" else 6.0)
				if ok:
					for t in taken:
						if absf(float(t) - x) < gap_min:
							ok = false
							break
				# 蝸牛、寶箱不要放在史萊姆組前面 12 m 內（跳過蝸牛會順便飛過史萊姆，連踩就斷掉）
				if ok:
					for sl in d["slimes"]:
						var sx: float = (sl[0] as Vector3).x
						if sx - x > -4.0 and sx - x < 14.0:
							ok = false
							break
				if ok:
					var y := _top_at(d, x)
					if kind == "snail":
						d["snails"].append(Vector3(x, y, 0))
					else:
						d["qboxes"].append([Vector3(x, y + 3.2, 0), "coins" if need % 2 == 1 else "guava"])
					taken.append(x)
					need -= 1
				x += 2.0
			gap_min -= 3.0
	# 第 7 關起：一半的蝸牛換成爬比較快的紅殼蝸牛
	var out: Array = []
	for i in d["snails"].size():
		var s = d["snails"][i]
		var p: Vector3 = s if s is Vector3 else s[0]
		out.append([p, "red" if n >= 7 and i % 2 == 1 else "purple"])
	d["snails"] = out

# ---------------------------------------------------------------- 第 7–11 關（第二批）

## 第 7 關 郵局島（早上）：移動平台＋踢牆
static func _post() -> Dictionary:
	var d := _level("purple", "morning", ["二水郵局", "Ershui Post Office"], "post", 10.0)
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_star(d)
	c_gap(d, 4.0)
	c_slimes(d)
	c_movers(d, 3, 1.0, 2.6)
	c_flat(d, 16)
	c_fruit(d, "pomelo", -8)
	c_wall(d, 20)
	c_fruit(d, "melon", -10)
	c_down(d, 7.0, 14)
	c_star(d)
	c_stones(d, 4)
	c_flat(d, 30)
	c_up(d, 2.4, 20)
	c_gap(d, 4.0)
	c_flat(d, 14)
	c_down(d, 2.4, 30)
	c_star(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "purple", 7)
	return d

## 第 8 關 書店島（傍晚）：兩段踢牆、跳石變多
static func _bookstore() -> Dictionary:
	var d := _level("dusk", "dusk", ["書店", "Bookstore"], "books", 9.0)
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_star(d)
	c_gap(d, 4.0)
	c_flat(d, 30)
	c_slimes(d)
	c_wall(d, 16)
	c_gap(d, 3.5)
	c_flat(d, 12)
	c_fruit(d, "melon", -6)
	c_down(d, 7.0, 30)
	c_star(d)
	c_stones(d, 5)
	c_flat(d, 30)
	c_movers(d, 3, 1.2, 2.4)
	c_flat(d, 30)
	c_wall(d, 18)
	c_fruit(d, "pomelo", -9)
	c_down(d, 7.0, 14)
	c_star(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "dusk", 8)
	return d

## 第 9 關 大賣場島（中午）：缺口變多
static func _pxmart() -> Dictionary:
	var d := _level("desert", "noon", ["大賣場", "Mart"], "checkout", 11.0)
	d["landmark"]["z"] = -30.0   # 大賣場模型很寬，放遠一點才不會擋滿畫面
	d["landmark"]["x"] = 34.0
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_star(d)
	c_gap(d, 4.0)
	c_flat(d, 30)
	c_gap(d, 4.0)
	c_slimes(d)
	c_gap(d, 3.5)
	c_flat(d, 30)
	c_up(d, 2.4, 14)
	c_gap(d, 4.0)
	c_flat(d, 12)
	c_fruit(d, "pomelo", -6)
	c_down(d, 2.4, 30)
	c_star(d)
	c_movers(d, 4, 1.2, 2.4)
	c_flat(d, 30)
	c_wall(d, 16)
	c_fruit(d, "melon", -8)
	c_gap(d, 4.0)
	c_flat(d, 12)
	c_down(d, 7.0, 30)
	c_stones(d, 4)
	c_flat(d, 14)
	c_star(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "desert", 9)
	return d

## 第 10 關 圖書館島（雨後）：移動平台＋踢牆＋缺口
static func _library() -> Dictionary:
	var d := _level("candy", "after_rain", ["二水鄉立圖書館", "Ershui Library"], "shelf", 12.0)
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_star(d)
	c_gap(d, 4.0)
	c_flat(d, 30)
	c_movers(d, 4, 1.2, 2.4)
	c_flat(d, 30)
	c_slimes(d)
	c_wall(d, 14)
	c_gap(d, 4.0)
	c_flat(d, 12)
	c_fruit(d, "melon", -6)
	c_down(d, 7.0, 30)
	c_star(d)
	c_stones(d, 5)
	c_flat(d, 30)
	c_gap(d, 4.0)
	c_flat(d, 30)
	c_up(d, 2.4, 14)
	c_fruit(d, "pomelo", -7)
	c_down(d, 2.4, 14)
	c_star(d)
	c_slimes(d)
	c_goal(d)
	_finish(d, "candy", 10)
	return d

## 第 11 關 農情館島（黃昏）：最難的一般關，只有 1 題
static func _farm() -> Dictionary:
	var d := _level("farm", "sunset", ["八堡圳農情館", "Babao Canal Farm Center"], "farm", 11.0)
	d["landmark"]["z"] = -24.0
	d["landmark"]["x"] = 30.0
	d["wall_kick"] = true
	c_flat(d, 34, true)
	c_gap(d, 4.0)
	c_flat(d, 30)
	c_slimes(d)
	c_movers(d, 4, 1.2, 2.4)
	c_flat(d, 30)
	c_wall(d, 16)
	c_fruit(d, "melon", -8)
	c_gap(d, 4.0)
	c_flat(d, 12)
	c_down(d, 7.0, 30)
	c_star(d)
	c_stones(d, 5)
	c_flat(d, 30)
	c_gap(d, 4.0)
	c_flat(d, 30)
	c_up(d, 2.4, 14)
	c_fruit(d, "pomelo", -7)
	c_gap(d, 4.0)
	c_flat(d, 12)
	c_down(d, 2.4, 30)
	c_slimes(d)
	c_goal(d)
	_finish(d, "farm", 11)
	return d

# ---------------------------------------------------------------- 第 12、13 關魔王（第三批，側面魔王戰）
# 場地：左右兩面高牆，Ken 自動跑到牆邊就轉身（來回跑）。魔王在場地走來走去、會跳起來壓地放衝擊波。
# 跳到魔王頭上踩一下 → 掉一顆星星（一題）→ 答完魔王才又能被踩；3 題答完魔王倒下 → 出現彩虹門 → 跑過去過關。

static func _arena(d: Dictionary, x0: float, x1: float) -> void:
	_start(d, x0 - 4.0)
	c_flat(d, (x1 - x0) + 8.0)
	_block(d, x0 - 2.0, 4.0, 14.0, 0.0, "tall")
	_block(d, x1 + 2.0, 4.0, 14.0, 0.0, "tall")
	d["arena"] = [x0, x1]
	d["goal"] = 1e9

static func _park() -> Dictionary:
	var d := _level("teal", "dusk", ["二八水水公園", "Ershui Water Park"], "", 9.0)
	d["landmark"] = {"x": 30.0, "z": -26.0, "h": 7.0, "yaw": 0.0}   # 公園裡的蒸汽火車頭（整個公園模型很寬，放遠一點）
	_arena(d, -8.0, 62.0)
	d["spawn"] = Vector3(0, 0.2, 0)
	d["side_boss"] = {"zh": "泡泡國王", "en": "Bubble King", "color": Color(0.62, 0.42, 0.9), "speed": 2.2,
		"double": false, "x": 40.0, "hat": "crown"}
	d["qboxes"].append([Vector3(8, 3.2, 0), "coins"])
	d["qboxes"].append([Vector3(28, 3.2, 0), "guava"])
	d["qboxes"].append([Vector3(50, 3.2, 0), "coins"])
	d["fruits"].append([Vector3(18, 4.9, 0), "pomelo"])
	d["fruits"].append([Vector3(40, 4.9, 0), "melon"])
	_coin_row(d, 4, 14, 0.0, 2.5)
	_coin_row(d, 44, 56, 0.0, 2.5)
	d["signs"].append([Vector3(8, 0, -2.2), "按住跳，踩魔王的頭！\nHold and jump on its head!"])
	_decos(d, Levels.THEMES["teal"]["deco"], -8.0, 62.0, 12)
	d.erase("_x")
	d.erase("_y")
	return d

static func _lawn() -> Dictionary:
	var d := _level("storm", "storm", ["水心之初大草原", "Ershui Grassland"], "", 9.0)
	d["landmark"] = {"x": 30.0, "z": -30.0, "h": 5.5, "yaw": 0.0}   # 大草原的景觀雕塑（模型很寬，縮小放遠）
	_arena(d, -8.0, 66.0)
	d["spawn"] = Vector3(0, 0.2, 0)
	d["side_boss"] = {"zh": "雷雲大王", "en": "Storm King", "color": Color(0.38, 0.58, 0.95), "speed": 3.0,
		"double": true, "x": 44.0, "hat": "cloud"}
	d["qboxes"].append([Vector3(8, 3.2, 0), "coins"])
	d["qboxes"].append([Vector3(30, 3.2, 0), "pomelo"])
	d["qboxes"].append([Vector3(54, 3.2, 0), "coins"])
	d["fruits"].append([Vector3(20, 4.9, 0), "melon"])
	d["fruits"].append([Vector3(44, 4.9, 0), "pomelo"])
	_coin_row(d, 4, 14, 0.0, 2.5)
	_coin_row(d, 48, 60, 0.0, 2.5)
	d["signs"].append([Vector3(8, 0, -2.2), "跳過衝擊波，踩魔王的頭！\nJump over the waves!"])
	_decos(d, Levels.THEMES["storm"]["deco"], -8.0, 66.0, 13)
	d.erase("_x")
	d.erase("_y")
	return d
