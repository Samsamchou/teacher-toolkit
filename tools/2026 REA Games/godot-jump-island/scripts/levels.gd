extends RefCounted
## 13 關的資料。關卡代號（id）＝題庫 bank.json 的 locations 代號，題目分配沿用二水 3D 闖關（RDQ 2026-10-23 確認）：
## 第 1–3 關各 4 題、第 4–11 關各 3 題、第 12 關 7 題、第 13 關 8 題，共 51 題；一題＝一顆星星。
## 第 1 關手工設計（灰盒版老師已試玩）；第 2–11 關用 level_builder.gd 的模組組成；12、13 是魔王競技場。
## 方塊 [中心, 大小, 種類]：單位公尺，y 朝上；Ken 身高 2.2 m。

const Builder := preload("res://scripts/level_builder.gd")

const LEVELS := [
	{"n": 1, "id": "station", "zh": "火車站島", "en": "Station Island", "boss": false, "layout": "station"},
	{"n": 2, "id": "inn", "zh": "驛站島", "en": "Inn Island", "boss": false, "layout": "inn"},
	{"n": 3, "id": "seven", "zh": "便利商店島", "en": "Store Island", "boss": false, "layout": "seven"},
	{"n": 4, "id": "school", "zh": "國小島", "en": "School Island", "boss": false, "layout": "school"},
	{"n": 5, "id": "teatop", "zh": "飲料店島", "en": "Tea Shop Island", "boss": false, "layout": "teatop"},
	{"n": 6, "id": "market", "zh": "超市島", "en": "Market Island", "boss": false, "layout": "market"},
	{"n": 7, "id": "post", "zh": "郵局島", "en": "Post Office Island", "boss": false, "layout": "post"},
	{"n": 8, "id": "bookstore", "zh": "書局島", "en": "Bookstore Island", "boss": false, "layout": "bookstore"},
	{"n": 9, "id": "pxmart", "zh": "大賣場島", "en": "Mart Island", "boss": false, "layout": "pxmart"},
	{"n": 10, "id": "library", "zh": "圖書館島", "en": "Library Island", "boss": false, "layout": "library"},
	{"n": 11, "id": "farm", "zh": "農情館島", "en": "Farm Island", "boss": false, "layout": "farm"},
	{"n": 12, "id": "park", "zh": "水公園魔王島", "en": "Park Boss Island", "boss": true, "layout": "park"},
	{"n": 13, "id": "lawn", "zh": "大草原魔王島", "en": "Meadow Boss Island", "boss": true, "layout": "lawn"},
]

## 配色主題：草地、泥土、高柱側面（石頭）、天空、水，以及可以擺的 Kenney 裝飾
const THEMES := {
	"meadow": {"grass": Color(0.42, 0.8, 0.42), "grass2": Color(0.36, 0.72, 0.38), "dirt": Color(0.86, 0.52, 0.32), "dirt2": Color(0.74, 0.42, 0.26),
		"stone": Color(0.98, 0.78, 0.48), "stone2": Color(0.9, 0.66, 0.4), "sky": Color(0.55, 0.78, 0.98), "water": Color(0.25, 0.55, 0.85),
		"deco": ["tree", "tree-pine", "flowers", "flowers-tall", "mushrooms", "rocks", "grass", "plant"]},
	"autumn": {"grass": Color(0.95, 0.72, 0.3), "grass2": Color(0.9, 0.62, 0.25), "dirt": Color(0.7, 0.42, 0.28), "dirt2": Color(0.58, 0.34, 0.22),
		"stone": Color(0.85, 0.8, 0.72), "stone2": Color(0.74, 0.7, 0.62), "sky": Color(0.98, 0.82, 0.6), "water": Color(0.3, 0.5, 0.75),
		"deco": ["tree", "tree-pine-small", "mushrooms", "barrel", "crate", "rocks"]},
	"mint": {"grass": Color(0.55, 0.9, 0.78), "grass2": Color(0.48, 0.82, 0.7), "dirt": Color(0.95, 0.85, 0.6), "dirt2": Color(0.86, 0.74, 0.5),
		"stone": Color(0.7, 0.85, 1.0), "stone2": Color(0.6, 0.76, 0.92), "sky": Color(0.65, 0.88, 0.98), "water": Color(0.3, 0.65, 0.85),
		"deco": ["crate", "barrel", "plant", "flowers", "tree"]},
	"candy": {"grass": Color(1.0, 0.7, 0.82), "grass2": Color(0.95, 0.62, 0.76), "dirt": Color(0.98, 0.9, 0.75), "dirt2": Color(0.9, 0.8, 0.62),
		"stone": Color(0.75, 0.6, 0.95), "stone2": Color(0.66, 0.52, 0.88), "sky": Color(0.95, 0.8, 0.95), "water": Color(0.5, 0.55, 0.9),
		"deco": ["flowers", "flowers-tall", "mushrooms", "plant"]},
	"desert": {"grass": Color(0.98, 0.86, 0.5), "grass2": Color(0.94, 0.8, 0.44), "dirt": Color(0.88, 0.58, 0.34), "dirt2": Color(0.78, 0.48, 0.28),
		"stone": Color(0.9, 0.7, 0.55), "stone2": Color(0.82, 0.6, 0.46), "sky": Color(0.7, 0.85, 1.0), "water": Color(0.2, 0.6, 0.8),
		"deco": ["crate", "barrel", "rocks", "stones", "plant"]},
	"dusk": {"grass": Color(0.45, 0.75, 0.5), "grass2": Color(0.38, 0.68, 0.44), "dirt": Color(0.75, 0.45, 0.38), "dirt2": Color(0.62, 0.36, 0.32),
		"stone": Color(0.95, 0.6, 0.5), "stone2": Color(0.85, 0.5, 0.42), "sky": Color(0.98, 0.65, 0.5), "water": Color(0.35, 0.4, 0.75),
		"deco": ["tree-pine", "tree", "rocks", "mushrooms", "flowers"]},
	"purple": {"grass": Color(0.72, 0.6, 0.95), "grass2": Color(0.64, 0.52, 0.88), "dirt": Color(0.95, 0.75, 0.55), "dirt2": Color(0.85, 0.64, 0.46),
		"stone": Color(0.98, 0.9, 0.6), "stone2": Color(0.9, 0.8, 0.5), "sky": Color(0.75, 0.72, 0.98), "water": Color(0.4, 0.4, 0.85),
		"deco": ["crate", "chest", "plant", "flowers-tall", "mushrooms"]},
	"teal": {"grass": Color(0.4, 0.82, 0.8), "grass2": Color(0.34, 0.74, 0.72), "dirt": Color(0.92, 0.62, 0.38), "dirt2": Color(0.8, 0.52, 0.3),
		"stone": Color(0.95, 0.85, 0.5), "stone2": Color(0.86, 0.75, 0.42), "sky": Color(0.6, 0.85, 0.95), "water": Color(0.2, 0.5, 0.75),
		"deco": ["crate", "barrel", "chest", "plant", "tree-pine-small"]},
	"snow": {"grass": Color(0.95, 0.97, 1.0), "grass2": Color(0.86, 0.9, 0.98), "dirt": Color(0.75, 0.55, 0.42), "dirt2": Color(0.64, 0.46, 0.36),
		"stone": Color(0.72, 0.82, 0.95), "stone2": Color(0.62, 0.72, 0.88), "sky": Color(0.75, 0.85, 0.98), "water": Color(0.35, 0.55, 0.8),
		"deco": ["tree-snow", "tree-pine-snow", "rocks", "stones"]},
	"farm": {"grass": Color(0.5, 0.85, 0.35), "grass2": Color(0.44, 0.78, 0.3), "dirt": Color(0.72, 0.46, 0.28), "dirt2": Color(0.6, 0.38, 0.22),
		"stone": Color(0.95, 0.8, 0.45), "stone2": Color(0.86, 0.7, 0.38), "sky": Color(0.6, 0.82, 1.0), "water": Color(0.25, 0.55, 0.8),
		"deco": ["tree", "flowers", "plant", "barrel", "mushrooms", "grass"]},
	"sunset": {"grass": Color(0.6, 0.85, 0.4), "grass2": Color(0.52, 0.78, 0.36), "dirt": Color(0.88, 0.55, 0.35), "dirt2": Color(0.76, 0.45, 0.3),
		"stone": Color(0.95, 0.75, 0.6), "stone2": Color(0.86, 0.65, 0.52), "sky": Color(0.98, 0.78, 0.62), "water": Color(0.35, 0.45, 0.8),
		"deco": ["tree", "flowers", "rocks"]},
	"storm": {"grass": Color(0.45, 0.7, 0.55), "grass2": Color(0.38, 0.62, 0.48), "dirt": Color(0.5, 0.45, 0.6), "dirt2": Color(0.42, 0.38, 0.52),
		"stone": Color(0.6, 0.65, 0.85), "stone2": Color(0.52, 0.56, 0.76), "sky": Color(0.45, 0.5, 0.75), "water": Color(0.2, 0.3, 0.6),
		"deco": ["tree-pine", "rocks", "stones"]},
}

## 第 1 關（灰盒版已由老師 iPad 試玩通過）
const STATION := {
	"spawn": Vector3(0, 0.2, 14), "spawn_yaw": PI,
	"boxes": [
		[Vector3(0, -1, 0), Vector3(52, 2, 40), "ground"],          # 0 起點大草地（頂面 y=0，x -26..26）
		[Vector3(0, 0.75, -12), Vector3(8, 1.5, 4), "plat"],         # 1 台階 1（頂 1.5）
		[Vector3(0, 1.5, -17), Vector3(8, 3, 6), "plat"],            # 2 台階 2（頂 3）→ 星 1
		[Vector3(-14, 3.5, 10), Vector3(5, 7, 5), "tall"],           # 3 三段跳高柱（頂 7）→ 星 4
		[Vector3(0, 1.5, -30), Vector3(14, 3, 14), "plat"],          # 4 C 平台（頂 3，缺口 3 m）
		[Vector3(11, 3.3, -30), Vector3(5, 6.6, 5), "tall"],         # 5 二段跳高台（頂 6.6）→ 星 2
		[Vector3(0, 1.5, -57), Vector3(14, 3, 12), "plat"],          # 6 D 平台（缺口 14 m，要跳遠）→ 星 3
		[Vector3(0, 3.6, -62.2), Vector3(6, 1.2, 1.6), "plat"],      # 7 D 尾端小矮牆
	],
	"stars": [Vector3(0, 4.4, -17), Vector3(11, 8.0, -30), Vector3(0, 4.4, -58), Vector3(-14, 8.4, 10)],
	"star_box": [2, 5, 6, 3],
	"route": [{"from": 0, "to": 1, "kind": "jump"}, {"from": 1, "to": 2, "kind": "jump"}, {"from": 2, "to": 4, "kind": "jump"},
		{"from": 4, "to": 5, "kind": "double"}, {"from": 4, "to": 6, "kind": "long"}, {"from": 0, "to": 3, "kind": "triple"}],
	"slimes": [[Vector3(10, 0, -4), Vector3(1, 0, 0), 4.0], [Vector3(-2, 3, -30), Vector3(0, 0, 1), 4.0], [Vector3(3, 3, -56), Vector3(1, 0, 0), 4.0]],
	"flags": [Vector3(-4, 3, -26), Vector3(-5, 3, -53)],
	"signs": [
		[Vector3(4, 0, 8), "Run 跑步：搖桿推到底"],
		[Vector3(4, 0, -8), "Jump 跳：按 JUMP"],
		[Vector3(6, 3, -25), "Double jump 二段跳：落地馬上再跳"],
		[Vector3(4, 3, -35), "Long jump 跳遠：跑步時按 LONG"],
		[Vector3(12, 0, 13), "Triple jump 三段跳：跑步連跳三下"],
	],
}

## 第 12 關魔王：圓形競技場，泡泡國王。星星一次出現一顆；答對 → 魔王暈 5 秒 → 踩頭扣 1 血。
const PARK := {
	"spawn": Vector3(0, 0.2, 13), "spawn_yaw": PI, "theme": "sunset",
	"boxes": [
		[Vector3(0, -2, 0), Vector3(34, 4, 34), "ground"],
		[Vector3(-12, 1.25, -12), Vector3(4, 2.5, 4), "tall"],
		[Vector3(12, 1.25, -12), Vector3(4, 2.5, 4), "tall"],
		[Vector3(-12, 1.25, 12), Vector3(4, 2.5, 4), "tall"],
		[Vector3(12, 1.25, 12), Vector3(4, 2.5, 4), "tall"],
	],
	"star_spots": [Vector3(-12, 3.8, -12), Vector3(12, 3.8, -12), Vector3(-12, 3.8, 12), Vector3(12, 3.8, 12),
		Vector3(0, 1.3, -13), Vector3(-13, 1.3, 0), Vector3(13, 1.3, 0), Vector3(0, 1.3, 13)],
	"boss": {"zh": "泡泡國王", "en": "Bubble King", "pos": Vector3(0, 0, -4), "color": Color(0.62, 0.42, 0.9), "speed": 1.0, "double": false},
	"flags": [], "slimes": [], "movers": [], "decos": [],
	"signs": [[Vector3(9, 0, 15), "答對 → 魔王暈倒 → 跳到它頭上！"]],
}

## 第 13 關魔王（最後一關）：雷雲大王，走得比較快、壓地會連放兩圈衝擊波。8 題＝8 滴血。
const LAWN := {
	"spawn": Vector3(0, 0.2, 15), "spawn_yaw": PI, "theme": "storm",
	"boxes": [
		[Vector3(0, -2, 0), Vector3(38, 4, 38), "ground"],
		[Vector3(-14, 1.5, -14), Vector3(4, 3, 4), "tall"],
		[Vector3(14, 1.5, -14), Vector3(4, 3, 4), "tall"],
		[Vector3(-14, 1.5, 14), Vector3(4, 3, 4), "tall"],
		[Vector3(14, 1.5, 14), Vector3(4, 3, 4), "tall"],
		[Vector3(0, 0.75, -16), Vector3(8, 1.5, 3), "plat"],
		[Vector3(-16, 0.75, 0), Vector3(3, 1.5, 8), "plat"],
		[Vector3(16, 0.75, 0), Vector3(3, 1.5, 8), "plat"],
	],
	"star_spots": [Vector3(-14, 4.4, -14), Vector3(14, 4.4, -14), Vector3(-14, 4.4, 14), Vector3(14, 4.4, 14),
		Vector3(0, 2.9, -16), Vector3(-16, 2.9, 0), Vector3(16, 2.9, 0), Vector3(0, 1.3, 14)],
	"boss": {"zh": "雷雲大王", "en": "Storm King", "pos": Vector3(0, 0, -4), "color": Color(0.38, 0.58, 0.95), "speed": 1.3, "double": true},
	"flags": [], "slimes": [], "movers": [], "decos": [],
	"signs": [],
}

static func by_n(n: int) -> Dictionary:
	for L in LEVELS:
		if L["n"] == n:
			return L
	return {}

static func theme(name: String) -> Dictionary:
	return THEMES.get(name, THEMES["meadow"])

static func layout(name: String) -> Dictionary:
	var b = Builder.new()
	match name:
		"station":
			for k in ["boxes", "stars", "star_box", "route", "slimes", "flags"]:
				b.set(k, STATION[k].duplicate(true))
			b.spawn = STATION["spawn"]
			b.spawn_yaw = STATION["spawn_yaw"]
			b.decorate(THEMES["meadow"]["deco"], 1)
			return b.result("meadow", {"signs": STATION["signs"]})
		"inn":            # 第 2 關：踩石頭 → 平台（二段跳高台）→ 第一次坐移動平台；起點有三段跳高柱
			b.start(24, 24).pillar(7.0, 4.0, -1.0)
			b.stones(3, 2.5, 0.8)
			b.plat(16, 16, 3.5, 0.0, 0.0, "jump", {"slimes": 2, "flag": true}).ledge(1.0)
			b.mover(16, 10, 10, 0.5, 7.0, {"star": true})
			b.decorate(THEMES["autumn"]["deco"], 2)
			return b.result("autumn")
		"seven":          # 第 3 關：往上爬的小方塊塔、長平台三段跳、跳遠到最後的島
			b.start(20, 20)
			b.plat(10, 10, 3.0, 1.5).tower(4, -1.0)
			b.plat(14, 24, 3.0, 0.0, 0.0, "jump", {"slimes": 1, "flag": true}).pillar(7.0, 4.0, 1.0)
			b.plat(12, 14, 12.0, 0.0, 0.0, "long", {"star": true}).ledge(1.0)
			b.decorate(THEMES["mint"]["deco"], 3)
			return b.result("mint")
		"school":         # 第 4 關：一路往上的台階石 → 大操場（史萊姆多）有高柱與高台
			b.start(22, 22)
			b.stones(4, 2.0, 1.2, 5.0)
			b.plat(20, 26, 3.0, -1.0, 0.0, "jump", {"slimes": 3, "flag": true}).pillar(7.0, 4.0, 1.0).ledge(-1.0)
			b.decorate(THEMES["meadow"]["deco"], 4)
			return b.result("meadow")
		"teatop":         # 第 5 關：移動平台 → 石頭 → 第二座移動平台 → 高台與小塔
			b.start(18, 18)
			b.mover(14, 10, 10, 0.5, 6.5)
			b.stones(3, 3.0, 1.0)
			b.mover(15, 14, 14, 0.0, 7.0, {"slimes": 1, "flag": true}).ledge(1.0).tower(3, -1.0)
			b.decorate(THEMES["candy"]["deco"], 5)
			return b.result("candy")
		"market":         # 第 6 關：連續三次跳遠
			b.start(16, 24)
			b.plat(12, 22, 12.0, 0.0, 0.0, "long", {"star": true})
			b.plat(12, 22, 13.0, 0.0, 0.0, "long", {"slimes": 1, "flag": true}).ledge(1.0)
			b.plat(12, 22, 12.0, 0.0, 0.0, "long", {"star": true})
			b.decorate(THEMES["desert"]["deco"], 6)
			return b.result("desert")
		"post":           # 第 7 關：三段移動平台，中間轉彎
			b.start(18, 18)
			b.mover(15, 8, 8, 0.0, 7.0, {"star": true})
			b.turn(1)
			b.mover(15, 12, 12, 1.0, 7.0, {"slimes": 1, "flag": true}).tower(3, 1.0)
			b.turn(-1)
			b.mover(16, 10, 10, 0.0, 7.5, {"star": true})
			b.decorate(THEMES["dusk"]["deco"], 7)
			return b.result("dusk")
		"bookstore":      # 第 8 關：一疊疊越來越高的書（石頭）→ 大平台有高柱與小塔
			b.start(20, 20)
			b.stones(4, 2.0, 1.5, 4.0)
			b.plat(16, 24, 3.0, -2.0, 0.0, "jump", {"slimes": 2, "flag": true}).pillar(7.0, 4.0, 1.0).tower(4, -1.0)
			b.decorate(THEMES["purple"]["deco"], 8)
			return b.result("purple")
		"pxmart":         # 第 9 關：史萊姆很多的大平台，要一路踩過去
			b.start(20, 20).plat(18, 18, 3.0, 0.0, 0.0, "jump", {"slimes": 3, "star": true})
			b.plat(18, 18, 4.0, 1.0, 0.0, "jump", {"slimes": 3, "flag": true}).ledge(1.0)
			b.plat(18, 22, 12.0, 0.0, 0.0, "long", {"slimes": 3, "star": true})
			b.decorate(THEMES["teal"]["deco"], 9)
			return b.result("teal")
		"library":        # 第 10 關（雪地）：高高的小方塊塔 → 移動平台 → 高台 → 石頭
			b.start(20, 20).tower(5, 1.0)
			b.plat(14, 14, 3.0, 1.0)
			b.mover(15, 14, 14, 0.0, 7.0, {"slimes": 1, "flag": true}).ledge(-1.0)
			b.stones(3, 3.0, 1.0)
			b.decorate(THEMES["snow"]["deco"], 10)
			return b.result("snow")
		"farm":           # 第 11 關：全部動作的總複習（三段跳、跳遠、移動平台、二段跳、石頭）
			b.start(22, 26).pillar(7.0, 4.0, 1.0)
			b.plat(12, 22, 12.0, 0.0, 0.0, "long")
			b.mover(15, 14, 14, 1.0, 7.0, {"slimes": 2, "flag": true}).ledge(1.0)
			b.stones(4, 3.0, 1.2)
			b.decorate(THEMES["farm"]["deco"], 11)
			return b.result("farm")
		"park":
			return PARK.duplicate(true)
		"lawn":
			return LAWN.duplicate(true)
	return {}
