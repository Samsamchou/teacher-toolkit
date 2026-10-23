extends RefCounted
## 用「模組」組關卡：每個模組都記下「要用哪種跳法過去」（route），讓 qa.gd 用真的物理一段一段測。
##
## 數字依 player.gd 實測（2026-10-23）：站著單跳腳底 2.9 m、站著二段跳 4.5 m、三段跳 7.9 m、
## 跑步單跳 11 m 遠、跳遠 19.9 m 遠。關卡給小朋友用，每段都比極限留餘裕：
##   一般跳：缺口 ≤ 4 m、升高 ≤ 1.6 m；二段跳高台：升高 3.2 m（站著單跳上不去）；
##   三段跳高柱：升高 7 m（跑步二段跳最高約 6.2 m 上不去）；跳遠：缺口 ≤ 13 m、同高度。

const THICK := 4.0            # 浮空島厚度
const MOVER := 4.0            # 移動平台邊長

var boxes: Array = []         # [中心, 大小, 種類]
var stars: Array = []
var star_box: Array = []      # 每顆星星站在哪個方塊上
var slimes: Array = []        # [位置, 方向, 半程]
var flags: Array = []
var movers: Array = []        # {"a", "b", "size", "period"}（中心點）
var route: Array = []         # {"from", "to", "kind", "mover"}
var decos: Array = []         # [模型名, 位置, 轉向, 縮放]
var f := Vector3(0, 0, -1)    # 目前前進方向
var cur := -1                 # 目前所在方塊
var c := Vector3.ZERO         # 目前方塊頂面中心
var cw := 0.0                 # 目前方塊橫向寬
var cd := 0.0                 # 目前方塊前後長
var spawn := Vector3.ZERO
var spawn_yaw := PI

func right() -> Vector3:
	return Vector3(-f.z, 0, f.x)

func _size(w: float, d: float, h: float) -> Vector3:
	return Vector3(w, h, d) if absf(f.z) > 0.5 else Vector3(d, h, w)

func _add_box(top_center: Vector3, w: float, d: float, h: float, kind: String) -> int:
	boxes.append([top_center - Vector3(0, h / 2.0, 0), _size(w, d, h), kind])
	return boxes.size() - 1

func _star(pos: Vector3, box: int) -> void:
	stars.append(pos)
	star_box.append(box)

## 起點島
func start(w: float, d: float) -> RefCounted:
	cur = _add_box(Vector3.ZERO, w, d, THICK, "ground")
	c = Vector3.ZERO
	cw = w
	cd = d
	spawn = c - f * (d / 2.0 - 3.0) + Vector3(0, 0.2, 0)
	spawn_yaw = atan2(f.x, f.z)
	return self

## 往前接一個平台。edge：jump（一般跳）／long（跳遠）
## opts：star（星星放在平台前段）、slimes（史萊姆隻數）、flag（存檔旗子）
func plat(w: float, d: float, gap: float, rise := 0.0, side := 0.0, edge := "jump", opts := {}) -> RefCounted:
	var nc := c + f * (cd / 2.0 + gap + d / 2.0) + right() * side + Vector3(0, rise, 0)
	var i := _add_box(nc, w, d, THICK, "plat")
	route.append({"from": cur, "to": i, "kind": edge})
	cur = i
	c = nc
	cw = w
	cd = d
	_opts(opts)
	return self

func _opts(o: Dictionary) -> void:
	if o.get("star", false):
		_star(c + f * (cd * 0.25) + Vector3(0, 1.4, 0), cur)
	var n := int(o.get("slimes", 0))
	for k in n:
		var off := -cd / 2.0 + cd * 0.5 * (k + 0.5) / n    # 放在平台後半段，不擋星星
		slimes.append([c + f * off, right(), maxf(1.0, cw / 2.0 - 1.5)])
	if o.get("flag", false):
		flags.append(c - f * (cd / 2.0 - 2.0) - right() * (cw / 2.0 - 2.0))

## 一串小石頭（一般跳），左右交錯
func stones(n: int, gap: float, rise: float, size := 4.0, star_last := true) -> RefCounted:
	for i in n:
		var side := 1.5 if i % 2 == 0 else -1.5
		plat(size, size, gap, rise, side, "jump", {"star": star_last and i == n - 1})
	if star_last:
		stars[stars.size() - 1] = c + Vector3(0, 1.4, 0)
	return self

## 目前平台旁邊的二段跳高台（星星在上面）；不改變目前位置
func ledge(side_sign: float, rise := 3.2, size := 5.0) -> RefCounted:
	var top := c + right() * side_sign * (cw / 2.0 + 1.0 + size / 2.0) + Vector3(0, rise, 0)
	var i := _add_box(top, size, size, rise + THICK, "tall")
	route.append({"from": cur, "to": i, "kind": "double"})
	_star(top + Vector3(0, 1.4, 0), i)
	return self

## 目前平台前方角落的三段跳高柱（星星在上面）；從平台後段跑過來連跳三下
func pillar(rise := 7.0, size := 4.0, side_sign := 1.0) -> RefCounted:
	var top := c + f * (cd / 2.0 - size / 2.0 - 1.0) + right() * side_sign * (cw / 2.0 - size / 2.0 - 1.0) + Vector3(0, rise, 0)
	var i := _add_box(top, size, size, rise, "tall")
	route.append({"from": cur, "to": i, "kind": "triple"})
	_star(top + Vector3(0, 1.4, 0), i)
	return self

## 移動平台：來回在目前平台前緣與新平台後緣之間
func mover(gap: float, w: float, d: float, rise := 0.0, period := 7.0, opts := {}) -> RefCounted:
	var e1 := c + f * (cd / 2.0 + 0.6 + MOVER / 2.0)
	var nc := c + f * (cd / 2.0 + gap + d / 2.0) + Vector3(0, rise, 0)
	var e2 := Vector3(nc.x, c.y, nc.z) - f * (d / 2.0 + 0.6 + MOVER / 2.0)
	movers.append({"a": e1 - Vector3(0, 0.4, 0), "b": e2 - Vector3(0, 0.4, 0), "size": _size(MOVER, MOVER, 0.8), "period": period})
	var i := _add_box(nc, w, d, THICK, "plat")
	route.append({"from": cur, "to": i, "kind": "mover", "mover": movers.size() - 1})
	cur = i
	c = nc
	cw = w
	cd = d
	_opts(opts)
	return self

## 目前平台旁邊一排越來越高的小方塊（一般跳往上爬），最上面有星星；不改變目前位置
func tower(k: int, side_sign: float, rise := 2.0, size := 3.5, gap := 1.2) -> RefCounted:
	var prev := cur
	for i in k:
		var top := c + right() * side_sign * (cw / 2.0 + gap + size / 2.0 + i * (size + gap)) + Vector3(0, rise * (i + 1), 0)
		var b := _add_box(top, size, size, 2.0, "plat")
		route.append({"from": prev, "to": b, "kind": "jump"})
		prev = b
		if i == k - 1:
			_star(top + Vector3(0, 1.4, 0), b)
	return self

## 轉向（1 = 右轉、-1 = 左轉）
func turn(dir: int) -> RefCounted:
	f = right() if dir > 0 else -right()
	var t := cw
	cw = cd
	cd = t
	return self

## 依主題隨機擺裝飾（沒有碰撞）：只放在大平台角落，避開星星、旗子、出生點、路線、史萊姆、高柱
func decorate(models: Array, seed_n: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_n
	for bi in boxes.size():
		var b: Array = boxes[bi]
		var center: Vector3 = b[0]
		var sz: Vector3 = b[1]
		if String(b[2]) == "tall" or sz.x < 8.0 or sz.z < 8.0:
			continue
		var top := center.y + sz.y / 2.0
		var cands: Array = []
		for sx in [-1.0, 1.0]:
			for sz2 in [-1.0, 1.0]:
				cands.append(Vector3(center.x + sx * (sz.x / 2.0 - 1.4), top, center.z + sz2 * (sz.z / 2.0 - 1.4)))
				cands.append(Vector3(center.x + sx * (sz.x / 2.0 - 1.4), top, center.z + sz2 * (sz.z / 4.0)))
		for p in cands:
			if rng.randf() < 0.35 or not _deco_ok(p, bi):
				continue
			decos.append([models[rng.randi() % models.size()], p, rng.randf() * TAU, rng.randf_range(2.0, 2.8)])

func _deco_ok(p: Vector3, own: int) -> bool:
	for s in stars:
		if _xz(p - s) < 3.2:
			return false
	for fl in flags:
		if _xz(p - fl) < 2.6:
			return false
	if _xz(p - spawn) < 4.0:
		return false
	for sl in slimes:
		var a: Vector3 = sl[0] - sl[1] * sl[2]
		var b2: Vector3 = sl[0] + sl[1] * sl[2]
		if _seg_dist(p, a, b2) < 1.8:
			return false
	for i in boxes.size():
		if i == own:
			continue
		var b: Array = boxes[i]
		var bc: Vector3 = b[0]
		var bs: Vector3 = b[1]
		if absf(p.x - bc.x) < bs.x / 2.0 + 1.0 and absf(p.z - bc.z) < bs.z / 2.0 + 1.0:
			return false
	for r in route:
		if r["from"] == own or r["to"] == own:
			var a2: Vector3 = boxes[r["from"]][0]
			var b3: Vector3 = boxes[r["to"]][0]
			if _seg_dist(p, a2, b3) < 2.4:
				return false
	return true

func _xz(v: Vector3) -> float:
	return Vector2(v.x, v.z).length()

func _seg_dist(p: Vector3, a: Vector3, b: Vector3) -> float:
	var ab := Vector2(b.x - a.x, b.z - a.z)
	var ap := Vector2(p.x - a.x, p.z - a.z)
	var t := clampf(ap.dot(ab) / maxf(0.001, ab.length_squared()), 0.0, 1.0)
	return (ap - ab * t).length()

func result(theme: String, extra := {}) -> Dictionary:
	var d := {
		"spawn": spawn, "spawn_yaw": spawn_yaw, "theme": theme, "boxes": boxes, "stars": stars, "star_box": star_box,
		"slimes": slimes, "flags": flags, "movers": movers, "route": route, "decos": decos, "signs": [],
	}
	d.merge(extra, true)
	return d
