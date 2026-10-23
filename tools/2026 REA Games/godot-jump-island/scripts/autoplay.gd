extends Node
## 自動闖關（驗證用，學生不會觸發）：從選關畫面開始，依序把 13 關「真的玩完」——
## 不瞬間移動，從出生點用真的物理沿著關卡路線跑跳（等移動平台、跳遠、三段跳），碰星星後在題目畫面填答、
## 按「檢查答案」「聽 Tick 說」「Go! 繼續」；每關第一題故意先答錯一次。魔王關：撿星星、跳過衝擊波、踩暈倒的魔王。
## 啟動：網頁版在外框網址加 ?autoplay=1（遊戲讀 window.parent 的網址）；電腦版 -- --autoplay。
## 進度用 print／console.log 印出「AUTOPLAY …」。

const Levels := preload("res://scripts/levels.gd")
const LEVEL_LIMIT := 600.0       # 每關最多幾秒（逾時就記失敗、停下來）

var game
var wrong_done := {}
var where := ""                 # 目前在做什麼（心跳紀錄用）
var hb := 0
var t_level := 0.0

var p:
	get:
		return game.player

## 心跳：每 5 秒（遊戲時間）印一次 Ken 的狀態，卡住時看得出卡在哪
func _physics_process(_dt: float) -> void:
	hb += 1
	if hb % 300 == 0 and game.player != null:
		say("  ♥ %s state=%s pos=%s fwd=%.1f kind=%s move=%s floor=%s box=%d" % [where, game.state, _v(p.global_position), p.fwd, p.kind, _v(p.move), p.is_on_floor(), _cur_box()])

func say(t: String) -> void:
	var line := "AUTOPLAY " + t
	print(line)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("console.log(%s)" % JSON.stringify(line), true)

func _v(v: Vector3) -> String:
	return "(%.1f,%.1f,%.1f)" % [v.x, v.y, v.z]

## 用遊戲時間（物理格數）計時：瀏覽器視窗被遮住、遊戲暫停時不會算進逾時
func now() -> float:
	return Engine.get_physics_frames() / float(Engine.physics_ticks_per_second)

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func wait(sec: float) -> void:
	await get_tree().create_timer(sec).timeout

func run() -> void:
	game.test_drive = true
	await wait(1.0)
	var t_all := now()
	var only := int(game.args.get("autoplay-level", "0"))
	if OS.has_feature("web"):
		var q = JavaScriptBridge.eval("(function(){try{var m=/[?&]autoplay-level=([0-9]+)/.exec(window.parent.location.search+location.search);return m?m[1]:'0';}catch(e){return '0';}})()", true)
		only = int(str(q))
	for Lv in Levels.LEVELS:
		var n: int = Lv["n"]
		var id: String = Lv["id"]
		if only > 0 and n != only:
			continue
		if game.cleared.has(id):
			say("level %d %s already cleared" % [n, id])
			continue
		var w := 0
		while game.state != "menu" and w < 900:
			await frames(1)
			w += 1
		if not game.is_unlocked(n):
			say("level %d %s LOCKED — stop" % [n, id])
			break
		game.start_level(n)
		await frames(10)
		t_level = now()
		say("level %d %s start (%d stars)" % [n, id, game.level_total(id)])
		if Lv["boss"]:
			await _play_boss()
		else:
			await _play_level()
		await wait(0.5)
		var got: bool = game.cleared.has(id)
		say("level %d %s %s in %.0fs" % [n, id, "CLEARED" if got else "FAILED", now() - t_level])
		if not got:
			break
	say("DONE cleared=%d/13 in %.0fs" % [game.cleared.size(), now() - t_all])
	if game.args.has("autoplay"):
		get_tree().quit(0 if game.cleared.size() == 13 else 1)

# ---------------------------------------------------------------- 幾何小工具
func _top(b: Array) -> float:
	return (b[0] as Vector3).y + (b[1] as Vector3).y / 2.0

func _inside(p3: Vector3, b: Array, margin := 0.0) -> bool:
	var c: Vector3 = b[0]
	var sz: Vector3 = b[1]
	return absf(p3.x - c.x) <= sz.x / 2.0 - margin and absf(p3.z - c.z) <= sz.z / 2.0 - margin

func _rect_exit(p3: Vector3, b: Array, dir: Vector3) -> float:
	var c: Vector3 = b[0]
	var sz: Vector3 = b[1]
	var t := 999.0
	if absf(dir.x) > 0.001:
		t = minf(t, ((c.x + signf(dir.x) * sz.x / 2.0) - p3.x) / dir.x)
	if absf(dir.z) > 0.001:
		t = minf(t, ((c.z + signf(dir.z) * sz.z / 2.0) - p3.z) / dir.z)
	return t

## Ken 現在站在哪個方塊上（-1 = 在空中或在移動平台上）
func _cur_box() -> int:
	if not p.is_on_floor():
		return -1
	var boxes: Array = game.D["boxes"]
	var best := -1
	for i in boxes.size():
		var b: Array = boxes[i]
		if _inside(p.global_position, b, -0.35) and absf(p.global_position.y - _top(b)) < 0.45:
			if best == -1 or _top(b) > _top(boxes[best]):
				best = i
	return best

func _on(i: int) -> bool:
	return _cur_box() == i

## 每格往 target 跑；途中遇到題目就答、魔王衝擊波就跳
func _steer(target: Vector3, mag: float, cond: Callable, max_f := 600) -> bool:
	for i in max_f:
		if game.state == "quiz":
			p.move = Vector3.ZERO
			await _answer_quiz()
		if game.state != "play":
			p.move = Vector3.ZERO
			return false
		var d: Vector3 = target - p.global_position
		d.y = 0
		p.move = _unstick(d.normalized() * mag) if d.length() > 0.25 else Vector3.ZERO
		_dodge()
		await get_tree().physics_frame
		if cond.call():
			return true
	return false

## 卡住偵測：推著搖桿卻 0.5 秒沒動 → 往旁邊繞 0.4 秒（像真人遇到牆會往旁邊走）
var _last_pos := Vector3.ZERO
var _still := 0
var _side := 0
func _unstick(m: Vector3) -> Vector3:
	if m.length() < 0.1:
		_still = 0
		return m
	if p.global_position.distance_to(_last_pos) < 0.02 and p.is_on_floor():
		_still += 1
	else:
		_still = 0
	_last_pos = p.global_position
	if _still > 30:
		_side = 24
		_still = 0
	if _side > 0:
		_side -= 1
		return Vector3(-m.z, 0, m.x).normalized() * maxf(m.length(), 0.5)
	return m

func _dodge() -> void:
	if game.boss == null or not p.is_on_floor():
		return
	for w in game.boss.waves:
		var wc: Vector3 = w["center"]
		var d := Vector2(p.global_position.x - wc.x, p.global_position.z - wc.z).length()
		var r: float = w["r"]
		if d > r and d - r < 1.8:
			p.jump_held = true
			p.press_jump()
			return

## 空中一直往目標平台中心帶，落地就停
func _air_to(target: Vector3, max_f := 240) -> void:
	var left := false
	for i in max_f:
		# 想要的水平速度：越接近平台中心越慢；推搖桿去修正目前速度（空中也能煞車）
		var d := Vector3(target.x - p.global_position.x, 0, target.z - p.global_position.z)
		var want := d.normalized() * minf(d.length() * 2.2, 13.0)
		var hv := Vector3(p.velocity.x, 0, p.velocity.z)
		var fix := want - hv
		p.move = fix.normalized() * clampf(fix.length() / 3.0, 0.0, 1.0) if fix.length() > 0.2 else Vector3.ZERO
		await get_tree().physics_frame
		if not p.is_on_floor():
			left = true
		elif left and p.kind == "":
			break
	p.move = Vector3.ZERO

func _land(max_f := 240) -> void:
	var left := false
	for i in max_f:
		await get_tree().physics_frame
		if not p.is_on_floor():
			left = true
		elif left and p.kind == "":
			return

## 落地後像真人一樣放開搖桿，等 Ken 停下來（不會越跑越快衝出平台）
func _settle() -> void:
	p.move = Vector3.ZERO
	for i in 90:
		if p.fwd < 0.5 or game.state != "play":
			break
		await get_tree().physics_frame

## 走到平台上的起跳點：遠的時候小跑、快到了放慢，不會走出平台
func _goto(target: Vector3, box: Array) -> bool:
	var c: Vector3 = box[0]
	var sz: Vector3 = box[1]
	var t := Vector3(clampf(target.x, c.x - sz.x / 2.0 + 1.0, c.x + sz.x / 2.0 - 1.0), target.y, clampf(target.z, c.z - sz.z / 2.0 + 1.0, c.z + sz.z / 2.0 - 1.0))
	for i in 600:
		if game.state == "quiz":
			p.move = Vector3.ZERO
			await _answer_quiz()
		if game.state != "play":
			break
		var d := Vector3(t.x - p.global_position.x, 0, t.z - p.global_position.z)
		if d.length() < 0.4 or not _inside(p.global_position, box, -0.3):
			break
		p.move = _unstick(d.normalized() * (0.35 if d.length() > 2.0 else 0.15))
		_dodge()
		await get_tree().physics_frame
	p.move = Vector3.ZERO
	for i in 30:
		if p.fwd < 0.5:
			break
		await get_tree().physics_frame
	return _inside(p.global_position, box, -0.3)

# ---------------------------------------------------------------- 題目
func _answer_quiz() -> void:
	var q = game.quiz
	await wait(0.6)
	var lid: String = game.L["id"]
	var qid: String = q.item.get("id", "?")
	if not wrong_done.has(lid):
		wrong_done[lid] = true
		q.debug_fill(false)
		await wait(0.3)
		q.check_btn.pressed.emit()
		await wait(0.8)
		say("  %s answered wrong once → hint: %s" % [qid, String(q.hint_label.text).left(40)])
	q.debug_fill(true)
	await wait(0.3)
	q.check_btn.pressed.emit()
	await wait(0.5)
	if q.play_btn != null and is_instance_valid(q.play_btn) and not q.play_btn.disabled and String(q.item.get("type", "")) != "listen":
		q.play_btn.pressed.emit()
	var w := 0.0
	while q.next_btn != null and is_instance_valid(q.next_btn) and q.next_btn.disabled and w < 25.0:
		await wait(0.25)
		w += 0.25
	q.next_btn.pressed.emit()
	await frames(5)
	say("  star %s done (%d/%d)" % [qid, game.level_done(lid), game.level_total(lid)])

# ---------------------------------------------------------------- 一般關卡
func _play_level() -> bool:
	var D: Dictionary = game.D
	var adj := {}
	for e in D["route"]:
		adj[e["from"]] = adj.get(e["from"], []) + [[e["to"], e, true]]
		adj[e["to"]] = adj.get(e["to"], []) + [[e["from"], e, false]]
	var tries := {}
	while (game.state == "play" or game.state == "quiz") and now() - t_level < LEVEL_LIMIT:
		if game.state == "quiz":
			p.move = Vector3.ZERO
			await _answer_quiz()
			continue
		var cur := _cur_box()
		if cur == -1:
			await frames(10)
			continue
		# 找最近一顆還沒拿的星星（依路線步數）
		var dist := _bfs(adj, cur)
		var best := -1
		for i in game.stars.size():
			if game.stars[i]["done"]:
				continue
			var sb: int = D["star_box"][i]
			if dist.has(sb) and (best == -1 or dist[sb][0] < dist[D["star_box"][best]][0]):
				best = i
		if best == -1:
			await frames(10)
			continue
		var sbox: int = D["star_box"][best]
		if sbox == cur:
			var sp: Vector3 = game.stars[best]["node"].global_position
			await _steer(sp, 0.5, func(): return game.state != "play" or game.stars[best]["done"], 420)
			if game.state == "quiz":
				await _answer_quiz()
			continue
		# 走路線上的下一步
		var step: Array = _first_step(dist, cur, sbox)
		var key := "%d>%d" % [step[0], step[1]]
		tries[key] = tries.get(key, 0) + 1
		say("  step %d→%d %s%s (try %d) pos=%s" % [step[0], step[1], step[2]["kind"], "" if step[3] else " back", tries[key], _v(p.global_position)])
		await _do_edge(step[0], step[1], step[2], step[3])
		say("    → now on box %d" % _cur_box())
	return game.state == "clear"

## BFS：{方塊: [步數, 從哪來, 用哪條邊, 是否正向]}
func _bfs(adj: Dictionary, start: int) -> Dictionary:
	var dist := {start: [0, -1, null, true]}
	var q := [start]
	while not q.is_empty():
		var u: int = q.pop_front()
		for nb in adj.get(u, []):
			if not dist.has(nb[0]):
				dist[nb[0]] = [dist[u][0] + 1, u, nb[1], nb[2]]
				q.append(nb[0])
	return dist

func _first_step(dist: Dictionary, cur: int, target: int) -> Array:
	var v := target
	while dist[v][1] != cur:
		v = dist[v][1]
	return [cur, v, dist[v][2], dist[v][3]]

func _do_edge(from: int, to: int, e: Dictionary, fwd: bool) -> void:
	await _settle()
	await _edge_moves(from, to, e, fwd)
	await _settle()

func _edge_moves(from: int, to: int, e: Dictionary, fwd: bool) -> void:
	var D: Dictionary = game.D
	var A: Array = D["boxes"][from]
	var B: Array = D["boxes"][to]
	var ac: Vector3 = A[0]
	var bc: Vector3 = B[0]
	var dir := Vector3(bc.x - ac.x, 0, bc.z - ac.z).normalized()
	var ta := _top(A)
	var bt := Vector3(bc.x, _top(B), bc.z)
	var kind := String(e["kind"])
	if not fwd:
		kind = "mover" if kind == "mover" else ("long" if kind == "long" else "jump")
	p.jump_held = true
	where = "%s %d→%d" % [kind, from, to]
	if kind == "double":
		# 二段跳上高台：在邊緣內側原地跳一下，落地馬上第二跳並往高台推
		for inset in [1.2, 0.8, 1.8, 2.5]:
			var s0: Vector3 = ac + dir * (_rect_exit(ac, A, dir) - float(inset))
			await _goto(Vector3(s0.x, ta, s0.z), A)
			if not _on(from):
				return
			p.jump_held = true
			p.move = Vector3.ZERO
			p.press_jump()
			await _land(200)
			p.press_jump()
			await frames(1)
			var k2: String = p.kind
			await _air_to(bt)
			await _settle()
			say("    double(inset %.1f) kind=%s → %s box=%d" % [inset, k2, _v(p.global_position), _cur_box()])
			if not _on(from):
				return
		return
	if kind == "jump":
		# 依距離決定要跑多快（像真人一樣：短距離輕輕跳、遠的才全速）
		var edge := ac + dir * _rect_exit(ac, A, dir)
		var land_d := maxf(1.0, (bc - edge).dot(dir))
		var depth_a := _rect_exit(ac, A, dir) + _rect_exit(ac, A, -dir)
		for f in [1.0, 0.8, 1.25, 0.65, 1.5, 0.5]:
			var v := clampf(land_d / 0.8 * f, 3.0, 13.0)
			var mag := clampf(v / 13.15, 0.25, 1.0)
			var back := clampf(v * v / 28.0 + 0.6, 0.6, depth_a - 1.0)
			var s := ac + dir * (_rect_exit(ac, A, dir) - back)
			await _goto(Vector3(s.x, ta, s.z), A)
			if not _on(from):
				return
			await _steer(bt, mag, func(): return _rect_exit(p.global_position, A, dir) < 0.45 or _on(to), 300)
			if _on(to):
				return
			var t0p: Vector3 = p.global_position
			var t0f: float = p.fwd
			p.press_jump()
			await frames(2)
			var k0: String = p.kind
			await _air_to(bt)
			say("    jump(f=%.2f mag=%.2f) from %s fwd=%.1f kind=%s → land %s box=%d" % [f, mag, _v(t0p), t0f, k0, _v(p.global_position), _cur_box()])
			await _settle()
			if _on(to) or (not _on(from) and _cur_box() != -1):
				return
			if _on(from) and kind == "double":
				p.press_jump()      # 二段跳
				await _air_to(bt)
				await _settle()
				if not _on(from):
					return
			if not _on(from):
				return
		return
	if kind == "long":
		for back in [11.0, 8.0, 14.0, 18.0]:
			var s2 := ac + dir * maxf(-_rect_exit(ac, A, -dir) + 0.8, _rect_exit(ac, A, dir) - back)
			await _goto(Vector3(s2.x, ta, s2.z), A)
			if not _on(from):
				return
			await _steer(bt, 1.0, func(): return _rect_exit(p.global_position, A, dir) < 0.6, 400)
			p.press_long()
			await _land(240)
			p.move = Vector3.ZERO
			if not _on(from):
				return
		return
	where = "triple %d→%d" % [from, to]
	if kind == "triple":
		var far := ac - dir * (_rect_exit(ac, A, -dir) - 0.8)
		for mag in [1.0, 0.75, 0.55]:
			for lead in [21.0, 18.0, 24.0, 16.0, 14.0, 12.0, 10.0]:
				# 起跑點：離高柱 lead＋6 m（不必每次走回平台最遠的角落）
				var st: Vector3 = bt - dir * (float(lead) + 6.0)
				if not _inside(st, A, 0.8):
					st = far
				await _goto(Vector3(st.x, ta, st.z), A)
				if not _on(from):
					return
				await _steer(bt, mag, func(): return Vector2(bt.x - p.global_position.x, bt.z - p.global_position.z).length() < lead, 400)
				for k in 3:
					p.press_jump()
					await frames(1)
					var stp := 0
					while stp < 240:
						var d: Vector3 = bt - p.global_position
						d.y = 0
						p.move = d.normalized() * mag if d.length() > 0.3 else Vector3.ZERO
						await get_tree().physics_frame
						stp += 1
						if p.is_on_floor() and p.kind == "":
							break
					if _on(to):
						p.move = Vector3.ZERO
						return
				p.move = Vector3.ZERO
				if not _on(from):
					return
		return
	if kind == "mover":
		var mv: Dictionary = game.movers[int(e["mover"])]
		var body: Node3D = mv["body"]
		var ma: Vector3 = mv["a"] if fwd else mv["b"]
		var mb: Vector3 = mv["b"] if fwd else mv["a"]
		for attempt in 4:
			var edge_pt := ac + dir * (_rect_exit(ac, A, dir) - 1.0)
			await _goto(Vector3(edge_pt.x, ta, edge_pt.z), A)
			if not _on(from):
				return
			p.move = Vector3.ZERO
			var w := 0
			while body.position.distance_to(ma) > 0.4 and w < 1200:
				await get_tree().physics_frame
				w += 1
			p.move = dir
			p.press_jump()
			await frames(10)
			p.move = Vector3.ZERO
			await _land(200)
			if absf(p.global_position.y - (ma.y + 0.4)) > 0.5 or not p.is_on_floor():
				if not _on(from):
					return
				continue
			w = 0
			while body.position.distance_to(mb) > 0.4 and w < 1200:
				await get_tree().physics_frame
				w += 1
			p.move = dir
			p.press_jump()
			await frames(12)
			await _land(200)
			p.move = Vector3.ZERO
			return

# ---------------------------------------------------------------- 魔王關
func _play_boss() -> bool:
	var boss = game.boss
	while game.state != "clear" and now() - t_level < LEVEL_LIMIT:
		if game.state == "quiz":
			await _answer_quiz()
			continue
		if boss == null or boss.state == "dead":
			await frames(10)
			continue
		if boss.is_stunned():
			await _stomp(boss)
			continue
		var target = null
		for s in game.stars:
			if not s["done"]:
				target = s
		if target == null:
			p.move = Vector3.ZERO
			_dodge()
			await frames(2)
			continue
		var sp: Vector3 = (target["node"] as Node3D).global_position
		var high: bool = sp.y > 2.5
		await _steer(sp, 1.0, func():
			return game.state != "play" or target["done"] or boss.is_stunned() or (high and Vector2(sp.x - p.global_position.x, sp.z - p.global_position.z).length() < 3.2), 600)
		if high and game.state == "play" and not target["done"] and not boss.is_stunned():
			p.jump_held = true
			p.press_jump()
			await _steer(sp, 0.7, func(): return game.state != "play" or target["done"] or (p.is_on_floor() and p.kind == ""), 200)
			if game.state == "play" and not target["done"] and p.is_on_floor():
				p.press_jump()       # 二段跳上高柱
				await _steer(sp, 0.7, func(): return game.state != "play" or target["done"] or (p.is_on_floor() and p.kind == ""), 200)
			if game.state == "play" and not target["done"]:
				await _steer(sp, 0.5, func(): return game.state != "play" or target["done"], 120)
	return game.state == "clear"

func _stomp(boss) -> void:
	var before: int = boss.hp
	for attempt in 4:
		if not boss.is_stunned():
			return
		var bc: Vector3 = boss.global_position
		await _steer(bc, 1.0, func(): return not boss.is_stunned() or Vector2(bc.x - p.global_position.x, bc.z - p.global_position.z).length() < 4.0, 300)
		p.jump_held = true
		p.press_jump()
		for i in 120:
			var d: Vector3 = bc - p.global_position
			d.y = 0
			p.move = d.normalized() * 0.8 if d.length() > 0.3 else Vector3.ZERO
			await get_tree().physics_frame
			if boss.hp < before:
				p.move = Vector3.ZERO
				say("  stomp! boss hp %d" % boss.hp)
				return
			if p.is_on_floor() and p.kind == "":
				break
		# 單跳不夠高：落地馬上二段跳
		if p.is_on_floor():
			p.press_jump()
			for i in 140:
				var d2: Vector3 = bc - p.global_position
				d2.y = 0
				p.move = d2.normalized() * 0.8 if d2.length() > 0.3 else Vector3.ZERO
				await get_tree().physics_frame
				if boss.hp < before:
					p.move = Vector3.ZERO
					say("  stomp! boss hp %d" % boss.hp)
					return
				if p.is_on_floor() and p.kind == "":
					break
	p.move = Vector3.ZERO
