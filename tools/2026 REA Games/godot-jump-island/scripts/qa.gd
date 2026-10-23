extends Node
## 自動測試（godot --headless --path . -- --test --bank=<題庫>）。用真的物理與真的題目流程：
## 1. 跳躍手感數值：單跳／短跳／二段跳／三段跳高度、跑步單跳與跳遠距離
## 2. 第 1 關障礙：每個障礙「該用的跳法過得去、比較簡單的跳法過不去」
## 3. 答題：碰星星出題、答錯有提示、中途離開星星還在、答對收星、集滿過關
## 4. 魔王戰：衝擊波、答對暈倒、踩頭扣血、沒踩到放金色暈眩星、打倒過關
## 5. 題目分配：13 關共 51 題、每題只出現一次、做好的關卡星星數＝題數
## 最後印 QA DONE failures=N；有失敗就以代碼 1 結束。

const Levels := preload("res://scripts/levels.gd")

var game                      # game.gd
var fails := 0

func check(cond: bool, msg: String) -> void:
	print(("PASS  " if cond else "FAIL  ") + msg)
	if not cond:
		fails += 1

func run() -> void:
	game.test_drive = true
	if game.args.has("only"):        # 只跑一段：-- --test --only=boss13
		var o := String(game.args["only"])
		if o == "host":
			await _host_check()
		elif o == "bosses":
			await _boss(12)
			await _boss(13)
		elif o.begins_with("boss"):
			await _boss(int(o.substr(4)))
		print("QA DONE failures=%d" % fails)
		get_tree().quit(1 if fails > 0 else 0)
		return
	_plan_check()
	_touch_check()
	await _movement()
	_geometry_check()
	await _level1_obstacles()
	await _routes()
	await _level1_quiz()
	await _all_levels_quiz()
	await _boss(12)
	await _boss(13)
	await _host_check()
	# 測試不留紀錄：清掉電腦上的作答與通關存檔
	game.quiz.reset_results()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(game.SAVE_CLEARED))
	print("QA DONE failures=%d" % fails)
	get_tree().quit(1 if fails > 0 else 0)

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

var p:
	get:
		return game.player

func place(pos: Vector3, yaw: float) -> void:
	p.reset_motion()
	p.move = Vector3.ZERO
	p.jump_held = true
	p.global_position = pos
	p.set_facing(yaw)
	await frames(12)

## 等到落地（或逾時），回傳期間最高點與落地位置
func until_land(max_frames := 240) -> Dictionary:
	var top: float = p.global_position.y
	var left_floor := false
	for i in max_frames:
		await get_tree().physics_frame
		top = maxf(top, p.global_position.y)
		if not p.is_on_floor():
			left_floor = true
		elif left_floor and p.kind == "":
			break
	return {"top": top, "pos": p.global_position}

func _plan_check() -> void:
	var plan: Dictionary = game.quiz.plan
	var seen := {}
	var dup := 0
	var total := 0
	for Lv in Levels.LEVELS:
		var ids: Array = plan.get(Lv["id"], [])
		check(ids.size() > 0, "第 %d 關 %s 有題目（%d 題）" % [Lv["n"], Lv["id"], ids.size()])
		total += ids.size()
		for q in ids:
			if seen.has(q):
				dup += 1
			seen[q] = true
		if not Lv["boss"]:
			var spots: Array = Levels.layout(String(Lv["layout"]))["stars"]
			check(spots.size() == ids.size(), "第 %d 關星星 %d 顆＝題數 %d" % [Lv["n"], spots.size(), ids.size()])
	check(total == 51 and dup == 0, "13 關共 %d 題、重複 %d（應為 51、0）" % [total, dup])
	check(seen.size() == game.bank.data["items"].size(), "每一題都分配到關卡（%d / %d）" % [seen.size(), game.bank.data["items"].size()])

## 觸控搖桿：推一半半徑就是全速；兩根手指分開記錄
func _touch_check() -> void:
	var tp = game.touch
	tp.size = Vector2(1280, 720)
	tp.visible = true
	var down := InputEventScreenTouch.new()
	down.index = 0
	down.position = Vector2(200, 500)
	down.pressed = true
	tp._input(down)
	var drag := InputEventScreenDrag.new()
	drag.index = 0
	drag.position = Vector2(200, 450)          # 往上推 50 px（圓圈半徑 100 的一半）
	tp._input(drag)
	check(absf(tp.stick.length() - 1.0) < 0.01 and tp.stick.y < 0, "搖桿往上推一半就是全速（%.2f）" % tp.stick.length())
	drag.position = Vector2(200, 475)          # 推 25 px ≈ 半速
	tp._input(drag)
	check(absf(tp.stick.length() - 0.5) < 0.02, "推四分之一圈約半速（%.2f）" % tp.stick.length())
	var jd := InputEventScreenTouch.new()
	jd.index = 1
	jd.position = tp.jump_center()
	jd.pressed = true
	tp._input(jd)
	var ju := jd.duplicate()
	ju.pressed = false
	tp._input(ju)
	check(tp.take_jump() and tp.stick.length() > 0.4, "按 JUMP 再放開，另一根手指的搖桿還在")
	var up := down.duplicate()
	up.pressed = false
	tp._input(up)
	check(tp.stick == Vector2.ZERO, "放開搖桿手指 → 停止")
	tp.reset()
	tp.visible = false

# ---------------------------------------------------------------- 1. 手感數值
func _movement() -> void:
	var flat := {
		"spawn": Vector3(0, 0.2, 0), "spawn_yaw": PI, "sky": Color(0.6, 0.8, 1), "water": Color(0.2, 0.5, 0.8),
		"boxes": [[Vector3(0, -1, -150), Vector3(40, 2, 400), "ground"]], "stars": [Vector3(0, 80, 0)],
	}
	game.quiz.reset_results()
	game.start_level(1, flat)
	await frames(10)
	var y0 := 0.0
	# 單跳（按住）
	await place(Vector3(0, 0.2, 0), PI)
	p.jump_held = true
	p.press_jump()
	var r := await until_land()
	var single := float(r["top"]) - y0
	check(single > 2.7 and single < 3.3, "單跳高度 %.2f m（約 3.0）" % single)
	# 二段跳：落地馬上再跳
	p.press_jump()
	await frames(1)
	var k2: String = p.kind
	r = await until_land()
	var dbl := float(r["top"]) - y0
	check(k2 == "double" and dbl > 4.3 and dbl < 5.0, "原地二段跳 %s %.2f m（約 4.6）" % [k2, dbl])
	# 原地第三下不會變三段跳（三段跳要跑起來）
	p.press_jump()
	await frames(1)
	check(p.kind == "single", "原地連跳第三下是單跳（%s）" % p.kind)
	await until_land()
	# 短跳（點一下就放開）
	await place(Vector3(0, 0.2, 0), PI)
	p.jump_held = false
	p.press_jump()
	r = await until_land()
	var tap := float(r["top"]) - y0
	check(tap < single * 0.8 and tap > 0.8, "點一下的短跳 %.2f m（比按住矮）" % tap)
	# 跑到最高速
	p.jump_held = true
	await place(Vector3(0, 0.2, 0), PI)
	p.move = Vector3(0, 0, -1)
	await frames(100)
	check(p.fwd > 12.5, "跑步最高速 %.1f m/s（約 13.2）" % p.fwd)
	var z0: float = p.global_position.z
	p.press_jump()
	r = await until_land()
	var run_dist := absf(float(r["pos"].z) - z0)
	var run_top := float(r["top"]) - y0
	check(run_dist > 9.0 and run_dist < 13.0, "跑步單跳距離 %.1f m（約 11）、高 %.2f m" % [run_dist, run_top])
	# 跑步三段跳
	p.press_jump()
	await frames(1)
	var kd: String = p.kind
	await until_land()
	p.press_jump()
	await frames(1)
	var kt: String = p.kind
	var yb: float = p.global_position.y
	r = await until_land()
	var tri := float(r["top"]) - y0
	check(kd == "double" and kt == "triple" and tri > 7.6 and tri < 8.8, "跑步連跳：%s → %s，三段跳高度 %.2f m（約 8.2）" % [kd, kt, tri])
	# 跳遠
	await place(Vector3(0, 0.2, 0), PI)
	p.move = Vector3(0, 0, -1)
	await frames(100)
	z0 = p.global_position.z
	p.press_long()
	await frames(1)
	var kl: String = p.kind
	r = await until_land()
	var long_dist := absf(float(r["pos"].z) - z0)
	check(kl == "long" and long_dist > 16.5 and long_dist < 22.0, "跳遠距離 %.1f m（約 19）、高 %.2f m" % [long_dist, float(r["top"]) - y0])
	# 三段跳門檻調低（老師要求）：搖桿推一半左右的中速也能三段跳
	await place(Vector3(0, 0.2, 0), PI)
	p.move = Vector3(0, 0, -0.45)
	await frames(80)
	var mid_speed: float = p.fwd
	p.press_jump()
	await until_land()
	p.press_jump()
	await until_land()
	p.press_jump()
	await frames(1)
	check(p.kind == "triple", "中速 %.1f m/s 連跳三下也能三段跳（%s）" % [mid_speed, p.kind])
	await until_land()
	# 連跳時間放寬：落地 0.3 秒後再按仍算二段跳
	await place(Vector3(0, 0.2, 0), PI)
	p.move = Vector3.ZERO
	p.press_jump()
	await until_land()
	await frames(18)                           # 60 格／秒 × 0.3 秒
	p.press_jump()
	await frames(2)
	check(p.kind == "double", "落地 0.3 秒後再按仍是二段跳（%s）" % p.kind)
	await until_land()
	# 站著按跳遠 → 一般跳
	await place(Vector3(0, 0.2, 0), PI)
	p.press_long()
	await frames(1)
	check(p.kind == "single", "站著按跳遠變成一般跳（%s）" % p.kind)
	await until_land()
	p.move = Vector3.ZERO

# ---------------------------------------------------------------- 2. 第 1 關障礙
func _level1_obstacles() -> void:
	game.quiz.reset_results()
	game.start_level(1)
	await frames(10)
	# 只測地形：先把史萊姆和星星拿掉，免得撞到或跳出題目
	for sl in game.slimes:
		sl.alive = false
		sl.visible = false
	for s in game.stars:
		s["done"] = true
	# 二段跳高台（頂 6.6，在 x 8.5..13.5）：在 C 平台上從附近起跳
	var ok_double := false
	var ok_single := false
	for start_x in [5.5, 4.0, 2.0, 0.0, -2.0]:
		await place(Vector3(start_x, 3.2, -30), PI / 2.0)
		p.move = Vector3(1, 0, 0)
		p.press_jump()
		await until_land()
		p.press_jump()
		await until_land(200)
		if p.global_position.y > 6.4 and p.is_on_floor():
			ok_double = true
			break
	for start_x in [4.0, 5.0, 6.0]:
		await place(Vector3(start_x, 3.2, -30), PI / 2.0)
		p.move = Vector3(1, 0, 0)
		p.press_jump()
		await until_land(200)
		if p.global_position.y > 6.4:
			ok_single = true
	p.move = Vector3.ZERO
	check(ok_double, "二段跳上得了高台（星 2）")
	check(not ok_single, "站著單跳上不了高台（要用二段跳）")
	# 跳遠缺口 C → D（C 邊緣 z=-37，D 從 z=-51 開始）
	await place(Vector3(0, 3.2, -24), PI)
	p.move = Vector3(0, 0, -1)
	await _run_until_z(-36.3)
	p.press_long()
	await until_land(200)
	var pz: float = p.global_position.z
	check(p.global_position.y > 2.8 and pz < -50.5 and pz > -63.0, "跳遠越過 14 m 缺口落在 D 平台（z=%.1f, y=%.1f）" % [pz, p.global_position.y])
	await place(Vector3(0, 3.2, -24), PI)
	p.move = Vector3(0, 0, -1)
	await _run_until_z(-36.3)
	p.press_jump()
	var fell := false
	for i in 200:
		await get_tree().physics_frame
		if p.global_position.y < 1.0:
			fell = true
			break
	check(fell, "跑步單跳過不了 14 m 缺口（要用跳遠）")
	p.move = Vector3.ZERO
	for i in 150:
		await get_tree().physics_frame
		if p.global_position.y > -1.0 and p.is_on_floor():
			break
	check(p.global_position.y > -1.0, "掉下去會回到旗子（y=%.1f）" % p.global_position.y)
	# 三段跳高柱（頂 7，在 (-14, 10)）：從起點草地右邊往左跑，找一組起跳點
	var ok_triple := false
	var info := ""
	for mag in [1.0, 0.85, 0.7]:
		for jx in [20.0, 18.0, 16.0, 14.0, 12.0, 10.0, 8.0, 6.0, 4.0]:
			await place(Vector3(25, 0.2, 10), -PI / 2.0)
			p.move = Vector3(-mag, 0, 0)
			await _run_until_x(-jx, -1)
			p.press_jump()
			await until_land()
			p.press_jump()
			await until_land()
			p.press_jump()
			await frames(1)
			var kk: String = p.kind
			await until_land(200)
			p.move = Vector3.ZERO
			await frames(5)
			if kk == "triple" and p.global_position.y > 6.8:
				ok_triple = true
				info = "推桿 %.2f、x=%.0f 起跳" % [mag, jx]
				break
		if ok_triple:
			break
	check(ok_triple, "三段跳上得了高柱（星 4）%s" % info)
	var ok_dbl_pillar := false
	for jx in [-10.0, -9.0, -8.0, -7.0]:
		await place(Vector3(5, 0.2, 10), -PI / 2.0)
		p.move = Vector3(-1, 0, 0)
		await _run_until_x(-jx, -1)
		p.press_jump()
		await until_land()
		p.press_jump()
		await until_land(200)
		if p.global_position.y > 6.8:
			ok_dbl_pillar = true
	p.move = Vector3.ZERO
	check(not ok_dbl_pillar, "跑步二段跳上不了高柱（要用三段跳）")

## 往 x 方向跑直到 x 超過 target（dir=1 往 +x；dir=-1 往 -x，target 填 -x 值）
func _run_until_x(target: float, dir: int) -> void:
	for i in 300:
		await get_tree().physics_frame
		if dir > 0 and p.global_position.x >= target:
			return
		if dir < 0 and -p.global_position.x >= target:
			return

func _run_until_z(target: float) -> void:
	for i in 300:
		await get_tree().physics_frame
		if p.global_position.z <= target:
			return

# ---------------------------------------------------------------- 3. 答題
func _touch(s: Dictionary) -> void:
	p.reset_motion()
	p.global_position = (s["node"] as Node3D).global_position - Vector3(0, 1.1, 0)
	for i in 30:
		await get_tree().physics_frame
		if game.quiz.visible:
			return

func _answer(correct: bool) -> void:
	game.quiz.debug_fill(correct)
	game.quiz.debug_check()
	await frames(2)

func _level1_quiz() -> void:
	game.quiz.reset_results()
	game.start_level(1)
	await frames(10)
	var id: String = game.L["id"]
	check(game.stars.size() == 4, "第 1 關有 4 顆星星（%d）" % game.stars.size())
	# 第 1 顆：先中途離開
	var s0: Dictionary = game.stars[0]
	await _touch(s0)
	check(game.quiz.visible and game.state == "quiz", "碰星星會出題（%s）" % game.quiz.item.get("id", "?"))
	check(p.frozen, "答題時 Ken 停住")
	game.quiz._on_close()
	await frames(2)
	check(game.state == "play" and not s0["done"], "中途離開：星星還在、可以繼續玩")
	await frames(5)
	check(not game.quiz.visible, "離開後站在星星上不會馬上又跳出題目")
	p.global_position += Vector3(0, 0, 4)
	await frames(5)
	# 再碰：先答錯一次再答對
	await _touch(s0)
	var q1: String = game.quiz.item.get("id", "")
	await _answer(false)
	check(game.quiz.visible and String(game.quiz.hint_label.text).begins_with("提示"), "答錯會出現提示、留在同一題（%s）" % q1)
	await _answer(true)
	game.quiz.debug_next()
	await frames(3)
	check(s0["done"] and game.level_done(id) == 1, "答對收下星星（1 / 4）")
	var r1: Dictionary = game.quiz.results.get(q1, {})
	check(int(r1.get("attempts", 0)) == 2 and not r1.get("firstTry", true), "成績記錄：%s 作答 2 次、非一次答對" % q1)
	for i in range(1, 4):
		var s: Dictionary = game.stars[i]
		await _touch(s)
		await _answer(true)
		game.quiz.debug_next()
		await frames(3)
	check(game.level_done(id) == 4, "4 題都答完（%d / 4）" % game.level_done(id))
	await frames(5)
	check(game.state == "clear" and game.cleared.has("station"), "集滿 4 顆星星過關")

# ---------------------------------------------------------------- 4. 魔王
func _boss(n: int) -> void:
	game.quiz.reset_results()
	game.start_level(n)
	await frames(20)
	var boss = game.boss
	var want: int = game.level_total(String(game.L["id"]))
	check(boss != null and boss.hp == want and boss.state == "chase", "第 %d 關魔王出現、%d 滴血（%s）" % [n, want, (str(boss.hp) if boss else "沒有魔王")])
	# 衝擊波：Ken 站在 9 m 外不動。先把星星暫時關掉，免得 Ken 剛好站在星星上打開題目、整個遊戲暫停
	for st in game.stars:
		st["done"] = true
	await place(boss.global_position + Vector3(0, 0.2, 9.0), PI)
	boss.slam_cd = 0.0
	var hit_by_wave := false
	for i in 240:
		await get_tree().physics_frame
		if boss.wave_on and p.kind == "knock":
			hit_by_wave = true
			break
	if not hit_by_wave:
		print("  debug: boss state=%s pos=%s waves=%d player=%s invuln=%.2f kind=%s" % [boss.state, boss.global_position, boss.waves.size(), p.global_position, p.invuln, p.kind])
	check(hit_by_wave, "魔王壓地的衝擊波會把站著的 Ken 彈開")
	if n == 13:
		var two := false
		boss.slam_cd = 0.0
		p.global_position = boss.global_position + Vector3(0, 0.2, 14.0)
		for i in 300:
			await get_tree().physics_frame
			if boss.waves.size() >= 2:
				two = true
				break
		check(two, "雷雲大王會連放兩圈衝擊波")
	for st in game.stars:
		st["done"] = false
		st["cool"] = true
	await frames(60)
	var missed_once := false
	var guard := 0
	while boss.hp > 0 and guard < 14:
		guard += 1
		var qs = null
		for i in 120:
			for s in game.stars:
				if not s["done"]:
					qs = s
			if qs != null:
				break
			await get_tree().physics_frame
		if qs == null:
			check(false, "魔王戰應該要有星星")
			break
		var free: bool = qs["free"]
		await _touch(qs)
		if not free:
			check(game.quiz.visible, "魔王關碰星星出題（%s）" % game.quiz.item.get("id", "?"))
			await _answer(true)
			game.quiz.debug_next()
		await frames(3)
		check(boss.is_stunned(), "%s → 魔王暈倒" % ("金色暈眩星" if free else "答對"))
		if not missed_once:
			# 故意不踩：5 秒後醒來，應該放出金色暈眩星
			missed_once = true
			p.global_position = boss.global_position + Vector3(0, 0.2, 10)
			await get_tree().create_timer(5.6).timeout
			var has_free := false
			for s in game.stars:
				if s["free"]:
					has_free = true
			check(not boss.is_stunned() and has_free, "沒踩到：魔王醒來，出現金色暈眩星（不用答題）")
			continue
		var before: int = boss.hp
		p.reset_motion()
		p.global_position = boss.global_position + Vector3(0, BossScriptH() + 2.0, 0)
		for i in 90:
			await get_tree().physics_frame
			if boss.hp < before:
				break
		check(boss.hp == before - 1, "踩魔王的頭扣 1 滴血（剩 %d）" % boss.hp)
		p.global_position = boss.home + Vector3(0, 0.2, 12)
		await frames(40)
	await get_tree().create_timer(0.8).timeout
	var bid: String = game.L["id"]
	check(boss.hp == 0 and game.state == "clear" and game.cleared.has(bid), "第 %d 關打倒魔王過關（hp=%d, state=%s）" % [n, boss.hp, game.state])
	check(game.level_done(bid) == want, "魔王關 %d 題全部作答（%d / %d）" % [want, game.level_done(bid), want])

func BossScriptH() -> float:
	return preload("res://scripts/boss.gd").H


# ---------------------------------------------------------------- 關卡幾何
func _top(b: Array) -> float:
	return (b[0] as Vector3).y + (b[1] as Vector3).y / 2.0

func _inside(p3: Vector3, b: Array, margin := 0.0) -> bool:
	var c: Vector3 = b[0]
	var sz: Vector3 = b[1]
	return absf(p3.x - c.x) <= sz.x / 2.0 - margin and absf(p3.z - c.z) <= sz.z / 2.0 - margin

func _geometry_check() -> void:
	for Lv in Levels.LEVELS:
		if Lv["boss"]:
			continue
		var D := Levels.layout(String(Lv["layout"]))
		var boxes: Array = D["boxes"]
		var bad := []
		for i in D["stars"].size():
			var sp: Vector3 = D["stars"][i]
			var b: Array = boxes[D["star_box"][i]]
			var h := sp.y - _top(b)
			if not (_inside(sp, b) and h > 1.1 and h < 1.7):
				bad.append("星%d" % (i + 1))
		# 方塊不能互相插進去（只允許貼著）
		for i in boxes.size():
			for j in range(i + 1, boxes.size()):
				var a: Array = boxes[i]
				var b2: Array = boxes[j]
				var ov := Vector3.ZERO
				for ax in 3:
					var ca: float = (a[0] as Vector3)[ax]
					var cb: float = (b2[0] as Vector3)[ax]
					ov[ax] = ((a[1] as Vector3)[ax] + (b2[1] as Vector3)[ax]) / 2.0 - absf(ca - cb)
				if ov.x > 0.05 and ov.y > 0.05 and ov.z > 0.05:
					bad.append("方塊%d與%d重疊" % [i, j])
		var reach := {0: true}
		for k in 20:
			for r in D["route"]:
				if reach.has(r["from"]):
					reach[r["to"]] = true
		for i in D["star_box"].size():
			if not reach.has(D["star_box"][i]):
				bad.append("星%d不在路線上" % (i + 1))
		check(bad.is_empty(), "第 %d 關幾何：星星在平台上方、方塊不重疊、每顆星都有路線 %s" % [Lv["n"], ", ".join(bad)])
		check(D["decos"].size() > 0, "第 %d 關有裝飾（%d 個）" % [Lv["n"], D["decos"].size()])

# ---------------------------------------------------------------- 每段路線用真的物理跑一次
func _routes() -> void:
	for Lv in Levels.LEVELS:
		if Lv["boss"]:
			continue
		game.quiz.reset_results()
		game.start_level(int(Lv["n"]))
		await frames(5)
		for sl in game.slimes:
			sl.alive = false
			sl.visible = false
		for st in game.stars:
			st["done"] = true
		var D: Dictionary = game.D
		var fails_here := []
		for r in D["route"]:
			var ok: bool = await _edge(D, r)
			if not ok:
				fails_here.append("%d→%d %s" % [r["from"], r["to"], r["kind"]])
		var msg := "" if fails_here.is_empty() else " 失敗：" + ", ".join(fails_here)
		check(fails_here.is_empty(), "第 %d 關每段路線都過得去（%d 段）%s" % [Lv["n"], D["route"].size(), msg])

func _rect_exit(p3: Vector3, b: Array, dir: Vector3) -> float:
	var c: Vector3 = b[0]
	var sz: Vector3 = b[1]
	var t := 999.0
	if absf(dir.x) > 0.001:
		t = minf(t, ((c.x + signf(dir.x) * sz.x / 2.0) - p3.x) / dir.x)
	if absf(dir.z) > 0.001:
		t = minf(t, ((c.z + signf(dir.z) * sz.z / 2.0) - p3.z) / dir.z)
	return t

func _on_box(b: Array) -> bool:
	return p.is_on_floor() and absf(p.global_position.y - _top(b)) < 0.35 and _inside(p.global_position, b, -0.3)

## 往 target 跑（每格修正方向），直到 cond 成立或逾時
func _steer(target: Vector3, mag: float, cond: Callable, max_f := 400) -> bool:
	for i in max_f:
		var d: Vector3 = target - p.global_position
		d.y = 0
		p.move = d.normalized() * mag if d.length() > 0.2 else Vector3.ZERO
		await get_tree().physics_frame
		if cond.call():
			return true
	return false

func _edge(D: Dictionary, r: Dictionary) -> bool:
	var A: Array = D["boxes"][r["from"]]
	var B: Array = D["boxes"][r["to"]]
	var ac: Vector3 = A[0]
	var bc: Vector3 = B[0]
	var dir := Vector3(bc.x - ac.x, 0, bc.z - ac.z).normalized()
	var ta := _top(A)
	var tb := _top(B)
	var bt := Vector3(bc.x, tb, bc.z)
	var kind := String(r["kind"])
	if kind == "jump" or kind == "double":
		for back in [1.0, 2.5, 4.0, 6.0, 9.0]:
			for mag in [1.0, 0.6]:
				var start := ac + dir * maxf(0.0, _rect_exit(ac, A, dir) - back)
				start = Vector3(start.x, ta + 0.2, start.z)
				await place(start, atan2(dir.x, dir.z))
				p.jump_held = true
				var ok := await _steer(bt, mag, func(): return _rect_exit(p.global_position, A, dir) < 0.5 or _on_box(B), 300)
				if not ok:
					continue
				if _on_box(B):
					p.move = Vector3.ZERO
					return true
				p.press_jump()
				await until_land(200)
				if _on_box(B):
					p.move = Vector3.ZERO
					return true
				if kind == "double" and p.global_position.y > ta - 0.5:
					p.press_jump()
					await until_land(200)
					if _on_box(B):
						p.move = Vector3.ZERO
						return true
		p.move = Vector3.ZERO
		return false
	if kind == "long":
		for back in [8.0, 11.0, 14.0, 18.0]:
			var start := ac + dir * maxf(-_rect_exit(ac, A, -dir) + 0.8, _rect_exit(ac, A, dir) - back)
			start = Vector3(start.x, ta + 0.2, start.z)
			await place(start, atan2(dir.x, dir.z))
			var ok := await _steer(bt, 1.0, func(): return _rect_exit(p.global_position, A, dir) < 0.6, 400)
			if not ok:
				continue
			p.press_long()
			await until_land(240)
			var got := _on_box(B)
			p.move = Vector3.ZERO
			if got:
				return true
		return false
	if kind == "triple":
		var far := ac - dir * (_rect_exit(ac, A, -dir) - 0.8)
		for mag in [1.0, 0.75, 0.55]:
			for lead in [24.0, 21.0, 18.0, 16.0, 14.0, 12.0, 10.0, 8.0]:
				await place(Vector3(far.x, ta + 0.2, far.z), atan2(dir.x, dir.z))
				var ok := await _steer(bt, mag, func(): return Vector2(bt.x - p.global_position.x, bt.z - p.global_position.z).length() < lead, 400)
				if not ok:
					continue
				for k in 3:
					p.press_jump()
					await frames(1)
					var step := 0
					while step < 240:
						var d: Vector3 = bt - p.global_position
						d.y = 0
						p.move = d.normalized() * mag if d.length() > 0.3 else Vector3.ZERO
						await get_tree().physics_frame
						step += 1
						if p.is_on_floor() and p.kind == "":
							break
					if _on_box(B):
						p.move = Vector3.ZERO
						return true
		p.move = Vector3.ZERO
		return false
	if kind == "mover":
		var mv: Dictionary = game.movers[int(r["mover"])]
		var body: Node3D = mv["body"]
		var a: Vector3 = mv["a"]
		var b: Vector3 = mv["b"]
		var mtop: float = a.y + 0.4
		for attempt in 3:
			var edge_pt := ac + dir * (_rect_exit(ac, A, dir) - 1.0)
			await place(Vector3(edge_pt.x, ta + 0.2, edge_pt.z), atan2(dir.x, dir.z))
			var waited := 0
			while body.position.distance_to(a) > 0.4 and waited < 900:
				await get_tree().physics_frame
				waited += 1
			p.move = dir
			p.press_jump()
			await frames(10)
			p.move = Vector3.ZERO
			await until_land(200)
			var on_m: bool = p.is_on_floor() and absf(p.global_position.y - mtop) < 0.4
			if not on_m:
				continue
			waited = 0
			while body.position.distance_to(b) > 0.4 and waited < 900:
				await get_tree().physics_frame
				waited += 1
			p.move = dir
			p.press_jump()
			await frames(12)
			await until_land(200)
			p.move = Vector3.ZERO
			if _on_box(B):
				return true
		return false
	return false

# ---------------------------------------------------------------- 每一關答完題都會過關
func _all_levels_quiz() -> void:
	game.quiz.reset_results()
	game.cleared = {}
	for Lv in Levels.LEVELS:
		if Lv["boss"]:
			continue
		game.start_level(int(Lv["n"]))
		await frames(5)
		for sl in game.slimes:
			sl.alive = false
		for st in game.stars.duplicate():
			await _touch(st)
			if not game.quiz.visible:
				continue
			await _answer(true)
			game.quiz.debug_next()
			await frames(3)
		await frames(3)
		check(game.state == "clear" and game.cleared.has(String(Lv["id"])), "第 %d 關答完 %d 題過關" % [Lv["n"], game.level_total(String(Lv["id"]))])

# ---------------------------------------------------------------- 6. 網頁外框（學號登入）的進度與回報
## 用假的外框模擬「學生換一台 iPad 繼續玩」：外框給 Q01 答對、第 1 關已過；檢查解鎖、星星、回報格式。
func _host_check() -> void:
	var Host = preload("res://scripts/host.gd")
	Host.fake = {"studentId": "99901", "results": {"Q01": {"attempts": 1, "wrong": 0, "firstTry": true, "hintUsed": false, "quality": 4, "finalCorrect": true}}, "cleared": ["station"]}
	Host.fake_reports = []
	game.init = Host.initial()
	game._load_cleared()
	game.quiz._load_results()
	check(game.is_unlocked(1) and game.is_unlocked(2) and not game.is_unlocked(3) and not game.is_unlocked(12), "依序解鎖：過了第 1 關只開到第 2 關")
	check(game.level_done("station") == 1, "從外框還原進度：第 1 關已有 1 顆星（%d）" % game.level_done("station"))
	game.start_level(1)
	await frames(5)
	var ghosts := 0
	for st in game.stars:
		if st["done"]:
			ghosts += 1
	check(ghosts == 1, "答過的題目星星顯示成已收集（%d 顆）" % ghosts)
	game.start_level(2)
	await frames(5)
	for sl in game.slimes:
		sl.alive = false
	var first: Dictionary = game.stars[0]
	await _touch(first)
	var qid: String = game.quiz.item.get("id", "")
	await _answer(false)
	await _answer(true)
	game.quiz.debug_next()
	await frames(3)
	var items: Array = Host.fake_reports.filter(func(r): return r.get("type") == "item" and r.get("id") == qid)
	var last: Dictionary = items[items.size() - 1].get("result", {}) if not items.is_empty() else {}
	check(items.size() == 2 and int(last.get("attempts", 0)) == 2 and last.get("finalCorrect", false) and int(last.get("quality", 0)) == 3,
		"每次作答都回報外框（%s：%d 筆，最後 attempts=%s quality=%s）" % [qid, items.size(), last.get("attempts"), last.get("quality")])
	for st in game.stars.duplicate():
		if st["done"]:
			continue
		await _touch(st)
		await _answer(true)
		game.quiz.debug_next()
		await frames(3)
	await frames(3)
	var cl: Array = Host.fake_reports.filter(func(r): return r.get("type") == "cleared")
	var cl_last: Array = cl[cl.size() - 1].get("cleared", []) if not cl.is_empty() else []
	check(cl_last.has("station") and cl_last.has("inn") and cl_last.size() == 2, "過關回報外框：cleared = %s" % [cl_last])
	check(not Host.fake_reports.any(func(r): return r.get("type") == "complete"), "還沒打完 13 關不會回報 complete")
	# 13 關都過了才回報 complete（外框收到後顯示成績頁）
	for Lv in Levels.LEVELS:
		game.cleared[String(Lv["id"])] = true
	game.cleared.erase("lawn")
	game.start_level(13)
	await frames(15)
	game.boss.hp = 1
	game.boss.stun()
	p.reset_motion()
	p.global_position = game.boss.global_position + Vector3(0, 6.5, 0)
	for i in 120:
		await get_tree().physics_frame
		if game.state == "clear":
			break
	await frames(30)
	check(Host.fake_reports.any(func(r): return r.get("type") == "complete"), "13 關全部過關 → 回報 complete")
	Host.fake = null
	Host.fake_reports = []
	game.init = {}
