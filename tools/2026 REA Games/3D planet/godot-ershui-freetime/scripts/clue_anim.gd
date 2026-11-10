extends Control
## 線索「程式動畫」：Godot 畫的無字小動畫（約 6 秒一輪、無聲），黑白剪影風格跟 3 icons 一樣。
## 只給「周邊」提示，不直接畫出答案物品（例：籃球＝球在地上彈＋籃框外框；露營＝帳篷三角＋營火閃）。
## 用法：var c := ClueAnim.new(); c.act = "basketball"; add_child(c)
##
## 動作合邏輯（老師 2026-11-10，RDQ-spec-freetime-motion-logic-fix-20261110）：
## - 東西只有「碰到」東西（手、地板、球棒、籃框）才改變方向；彈跳一次比一次低（或回到手上）。
## - 道具由接觸事件驅動、不用計時器：球棒碰到球球才飛；腳離開才留下腳印；按了遙控器訊號到電視才換台。
## - 輪子轉的量＝走的距離（地面退的速度＝輪緣速度）、輪子貼地；踏板跟著鏈條、輪子一起轉，腳踩在踏板上。
## - 音符從耳機／笛子出來，不憑空出現；火只在原地閃。
## - 東西不互穿；不會無緣無故出現或消失（從畫面外進來、或整個畫面在一輪的頭尾淡入淡出）。
## 檢查：scripts/clue_check.gd（輸出 test_clues/，印每段的接觸量測）。

const INK := Color("#1f1a24")
const PAPER := Color("#ffffff")
const GREY := Color("#9a94a0")
const SKIN := Color("#c9c4cf")    # 手、腿（淺灰，和道具區分）
const NIGHT := Color("#24203a")
const LOOP := 6.0
const FADE_IN := 0.25             # 每輪開頭淡入（秒）
const FADE_OUT := 0.35            # 每輪結尾淡出（秒）

var act := "jogging"
var t := 0.0
var playing := true

func _process(delta: float) -> void:
	if playing:
		t += delta
	queue_redraw()

func restart() -> void:
	t = 0.0

## 400×300 的畫布座標 → 實際大小（置中、等比）
var k := 1.0
var o := Vector2.ZERO
func P(x: float, y: float) -> Vector2:
	return o + Vector2(x, y) * k

func PV(v: Vector2) -> Vector2:
	return o + v * k

func _draw() -> void:
	k = minf(size.x / 400.0, size.y / 300.0)
	o = (size - Vector2(400, 300) * k) * 0.5
	draw_rect(Rect2(Vector2.ZERO, size), PAPER)
	var tl := fmod(t, LOOP)
	var u := tl / LOOP   # 0..1 一輪
	call("_a_" + act, u)
	# 一輪的頭尾整個畫面淡入淡出：重新開始時東西不會「突然消失／出現」
	if act != "_sound":
		var a := maxf(1.0 - tl / FADE_IN, smoothstep(LOOP - FADE_OUT, LOOP, tl))
		if a > 0.0:
			draw_rect(Rect2(Vector2.ZERO, size), Color(PAPER, a))

func circ(c: Vector2, r: float, col := INK, filled := true, w := 4.0) -> void:
	if filled:
		draw_circle(c, r * k, col)
	else:
		draw_arc(c, r * k, 0, TAU, 48, col, w * k, true)

func line(a: Vector2, b: Vector2, w := 5.0, col := INK) -> void:
	draw_line(a, b, col, w * k, true)

func poly(pts: Array, col := INK) -> void:
	var pa := PackedVector2Array()
	for p in pts:
		pa.append(p)
	draw_colored_polygon(pa, col)

func note(c: Vector2, s: float, col := INK) -> void:
	# 八分音符（實心橢圓＋符桿＋符尾）
	draw_set_transform(c, -0.35, Vector2(1.25, 0.9))
	draw_circle(Vector2.ZERO, 9.0 * s * k, col)
	draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
	var top := c + Vector2(8, -42) * s * k
	draw_line(c + Vector2(9, -3) * s * k, top, col, 3.5 * s * k, true)
	draw_line(top, top + Vector2(12, 14) * s * k, col, 3.5 * s * k, true)

## 兩段骨（髖→膝→腳）的膝蓋位置；bend=+1 膝蓋往右（前）
static func ik_knee(hip: Vector2, foot: Vector2, l1: float, l2: float, bend := 1.0) -> Vector2:
	var d := clampf(hip.distance_to(foot), absf(l1 - l2) + 0.01, l1 + l2 - 0.01)
	var a := acos(clampf((l1 * l1 + d * d - l2 * l2) / (2.0 * l1 * d), -1.0, 1.0))
	var dir := (foot - hip).normalized()
	return hip + dir.rotated(-a * bend) * l1

## 點到線段的距離
static func seg_dist(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var f := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 0.0001), 0.0, 1.0)
	return p.distance_to(a + ab * f)

# ═════════════════════════════════════════════════════════════════════
# go jogging：兩隻跑鞋（俯視）沿小路一步一步跑過去；鞋子「離地」那一刻才露出底下的腳印＋碼錶指針轉
# 合邏輯：腳印只在鞋子踩過的地方出現；鞋子從畫面外跑進來、跑出畫面外。
# ═════════════════════════════════════════════════════════════════════
const JG_DU := 0.066      # 每一步的時間（一輪的幾成）
const JG_U0 := 0.02
func _jg_path(s: float) -> Vector2:
	return Vector2(-80.0 + 560.0 * s, 225.0 - 55.0 * sin(s * PI * 1.6))

func _jg_u(i: int) -> float:
	return JG_U0 + i * JG_DU

## 第 i 步的落腳點與方向（i 可以是負的＝畫面外）
func _jg_step(i: int) -> Array:
	var s := (i - 1.5) / 11.0
	var p := _jg_path(s)
	var d := (_jg_path(s + 0.01) - p).normalized()
	var side := Vector2(-d.y, d.x) * (11.0 if posmod(i, 2) == 0 else -11.0)
	return [p + side, d.angle()]

## 某一隻腳（0／1）在 u 時的位置、角度、離地程度（0＝踩著）
func _jg_foot(u: float, sd: int) -> Array:
	var i := int(floor((u - JG_U0) / JG_DU))
	if posmod(i, 2) != sd:
		i -= 1
	# 第 i 步：u_i ≤ u；u_{i+1} 前都踩著；之後擺到第 i+2 步
	var a: Array = _jg_step(i)
	if u < _jg_u(i + 1):
		return [a[0], a[1], 0.0]
	var b: Array = _jg_step(i + 2)
	var f := clampf((u - _jg_u(i + 1)) / (_jg_u(i + 2) - _jg_u(i + 1)), 0.0, 1.0)
	var e := f * f * (3.0 - 2.0 * f)
	return [(a[0] as Vector2).lerp(b[0], e), lerp_angle(a[1], b[1], e), sin(f * PI)]

func _sole(p: Vector2, ang: float, col: Color, sc := 1.0) -> void:
	draw_set_transform(PV(p), ang, Vector2(1.6, 1.0) * sc)
	draw_circle(Vector2.ZERO, 7 * k, col)
	draw_circle(Vector2(9, 0) * k, 3.2 * k, col)
	draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)

func _a_jogging(u: float) -> void:
	var pts := PackedVector2Array()
	for i in 41:
		pts.append(PV(_jg_path(i / 40.0)))
	draw_polyline(pts, Color(GREY, 0.3), 40 * k, true)   # 小路
	# 腳印：第 i 步的鞋子離地（u ≥ u_{i+1}）後才看得到
	for i in range(-2, 16):
		if u >= _jg_u(i + 1):
			var st: Array = _jg_step(i)
			_sole(st[0], st[1], GREY)
	# 兩隻鞋：離地的那隻放大一點＋地上影子
	for sd in 2:
		var f: Array = _jg_foot(u, sd)
		var lift: float = f[2]
		if lift > 0.0:
			_sole(f[0], f[1], Color(INK, 0.15), 1.0)
		_sole(f[0] + Vector2(0, -6.0 * lift), f[1], INK, 1.12 + 0.12 * lift)
	# 碼錶（右上）：指針一直轉
	var c := P(320, 70)
	circ(c, 40, INK, false, 6)
	draw_rect(Rect2(c + Vector2(-8, -58) * k, Vector2(16, 10) * k), INK)
	var a := u * TAU * 3.0 - PI / 2
	line(c, c + Vector2(cos(a), sin(a)) * 32 * k, 5)
	circ(c, 5)

## 檢查：每個腳印的位置＝那一步鞋子踩的位置（px）
func jogging_gaps() -> Array:
	var worst := 0.0
	for i in range(0, 13):
		var sd := posmod(i, 2)
		var f: Array = _jg_foot(_jg_u(i) + 0.001, sd)
		worst = maxf(worst, (f[0] as Vector2).distance_to(_jg_step(i)[0]))
	return [worst]

# ═════════════════════════════════════════════════════════════════════
# listen to music：耳罩耳機＋線接到手機；手機螢幕的音量條跳、耳罩跟著拍子震，音符「從耳罩」一個個飄出去
# ═════════════════════════════════════════════════════════════════════
const MU_BEAT := 0.5                        # 一拍 0.5 秒
const MU_CUPS := [Vector2(128, 150), Vector2(272, 150)]
const MU_CUP := Vector2(30, 56)            # 耳罩寬高
const MU_LIFE := 1.8
func _mu_beat(tl: float) -> float:
	var ph := fmod(tl, MU_BEAT) / MU_BEAT
	return exp(-ph * 6.0)   # 每拍一開始最大

## 第 n 拍發出的音符：從哪個耳罩外側、往哪裡飄
func _mu_note(n: int, age: float) -> Vector2:
	var side := n % 2
	var cup: Vector2 = MU_CUPS[side]
	var out := Vector2(-1.0 if side == 0 else 1.0, 0.0)
	var start := cup + out * (MU_CUP.x * 0.5 + 8.0) + Vector2(0, -6)
	return start + out * age * 45.0 + Vector2(sin(age * 4.0 + n) * 6.0 - sin(float(n)) * 6.0, -age * 55.0)

func _a_music(u: float) -> void:
	var tl := u * LOOP
	var beat := _mu_beat(tl)
	# 頭帶
	draw_arc(P(200, 150), 72 * k, PI * 1.02, PI * 1.98, 32, INK, 9 * k, true)
	# 耳罩（拍子一來就微微震）
	for i in 2:
		var c: Vector2 = MU_CUPS[i]
		var sc := 1.0 + 0.06 * beat
		var r := Rect2(PV(c - MU_CUP * 0.5 * sc), MU_CUP * sc * k)
		draw_rect(r, INK)
		draw_rect(r.grow(-6 * k), GREY)
	# 線：右耳罩 → 手機
	draw_polyline(PackedVector2Array([P(272, 178), P(282, 215), P(300, 238), P(322, 236)]), INK, 3 * k, true)
	# 手機（螢幕上的音量條＝音樂的來源）
	var phone := Rect2(P(322, 205), Vector2(46, 82) * k)
	draw_rect(phone, INK)
	var scr := phone.grow(-5 * k)
	draw_rect(scr, PAPER)
	for i in 5:
		var h := (8.0 + 40.0 * absf(sin(tl * 5.0 + i * 1.3)) * (0.6 + 0.4 * beat))
		draw_rect(Rect2(scr.position + Vector2(3 + i * 7.2, 0) * k + Vector2(0, scr.size.y - h * k), Vector2(5, h) * k), GREY)
	# 音符：第 n 拍從耳罩外側發出，往外往上飄、慢慢變淡（聲音散開）
	var nmax := int(floor(tl / MU_BEAT))
	for n in range(maxi(0, nmax - 4), nmax + 1):
		var age := tl - n * MU_BEAT
		if age < 0.0 or age > MU_LIFE:
			continue
		var col := Color(INK, 1.0 - smoothstep(MU_LIFE * 0.5, MU_LIFE, age))
		note(PV(_mu_note(n, age)), 0.85 + 0.15 * float(n % 3), col)

## 檢查：音符剛發出時到耳罩外側邊緣的距離（px，扣掉固定的 8 px 間隔）
func music_gaps() -> Array:
	var worst := 0.0
	for n in 4:
		var p := _mu_note(n, 0.0)
		var cup: Vector2 = MU_CUPS[n % 2]
		worst = maxf(worst, absf(absf(p.x - cup.x) - MU_CUP.x * 0.5 - 8.0))
	return [worst]

# ═════════════════════════════════════════════════════════════════════
# play baseball：球從畫面外飛來 → 手握的灰色球棒往上揮、正好在球的下緣碰到球（「碰」）→ 球才沿拋物線飛出畫面
# 合邏輯（老師 11/10）：球只有在碰到東西（球棒）時才改變方向；碰到的那一格球棒剛好貼著球；揮完棒子不會穿過球。
# ═════════════════════════════════════════════════════════════════════
const BB_C := Vector2(100, 230)     # 碰撞那一格的球心
const BB_R := 11.0                  # 球半徑
const BB_PIV := Vector2(40, 245)    # 球棒轉軸（握把）
const BB_LEN := 82.0
const BB_HALF := 4.0                # 球棒半粗
const BB_HIT := 0.15                # 碰到的時間（一輪的幾成）
const BB_X0 := 500.0                # 球從畫面外（右邊）飛進來
const BB_V := Vector2(270, -330)    # 被打到後的速度（px/s）：比球棒揮的速度快，不會被棒子追上
const BB_G := 260.0                 # 重力（px/s²）
func _bb_angle(u: float) -> float:
	# 往上揮（螢幕上角度變小＝逆時針）：2.2（左下）→ 0（水平朝右，正好碰球）→ -1.3（右上，揮完）
	if u < 0.07:
		return 2.2
	if u < BB_HIT:
		var f := (u - 0.07) / (BB_HIT - 0.07)
		return lerpf(2.2, 0.0, f * f)   # 越揮越快
	return lerpf(0.0, -1.3, clampf((u - BB_HIT) / 0.08, 0.0, 1.0))

func _bb_ball(u: float) -> Vector2:
	if u < BB_HIT:
		return Vector2(lerpf(BB_X0, BB_C.x, u / BB_HIT), BB_C.y)
	var tau := (u - BB_HIT) * LOOP
	return BB_C + BB_V * tau + Vector2(0, 0.5 * BB_G * tau * tau)

func _bb_bat(u: float) -> Array:
	var a := _bb_angle(u)
	return [BB_PIV, BB_PIV + Vector2(cos(a), sin(a)) * BB_LEN]

func _a_baseball(u: float) -> void:
	# 遠處的鑽石形內野線（灰）
	poly([P(200, 200), P(260, 245), P(200, 290), P(140, 245)], Color(GREY, 0.35))
	# 球棒（灰色細長，握把在左下）
	var a := _bb_angle(u)
	var d := Vector2(cos(a), sin(a))
	var n := Vector2(-d.y, d.x)
	var tip := BB_PIV + d * BB_LEN
	poly([P(BB_PIV.x + n.x * 2.5, BB_PIV.y + n.y * 2.5), P(tip.x + n.x * BB_HALF, tip.y + n.y * BB_HALF), P(tip.x - n.x * BB_HALF, tip.y - n.y * BB_HALF), P(BB_PIV.x - n.x * 2.5, BB_PIV.y - n.y * 2.5)], GREY)
	circ(P(BB_PIV.x, BB_PIV.y), 5, GREY)
	# 握棒的手（淺灰）：兩個拳頭握在握把上，手臂從畫面左下伸進來（不蓋住球棒）
	var g1 := BB_PIV + d * 6.0
	var g2 := BB_PIV + d * 18.0
	line(PV(g1), P(-30, 330), 16, SKIN)
	line(PV(g2), P(-10, 330), 14, SKIN)
	circ(PV(g1), 8, SKIN)
	circ(PV(g2), 8, SKIN)
	# 碰到之後才有的弧線軌跡（球經過的地方）
	if u >= BB_HIT:
		var tau := (u - BB_HIT) * LOOP
		for i in 14:
			var q := tau * i / 13.0
			var tp := BB_C + BB_V * q + Vector2(0, 0.5 * BB_G * q * q)
			circ(PV(tp), 2.5, GREY)
	var p := _bb_ball(u)
	if p.x < 520 and p.y > -30:
		var pp := PV(p)
		circ(pp, BB_R)
		draw_arc(pp, 7 * k, -0.6, 0.6, 8, PAPER, 2 * k)
		draw_arc(pp, 7 * k, PI - 0.6, PI + 0.6, 8, PAPER, 2 * k)
	if u >= BB_HIT and u < BB_HIT + 0.08:   # 碰到的「碰」：放射線（在碰撞點）
		for j in 8:
			var an := j * TAU / 8
			line(P(BB_C.x, BB_C.y) + Vector2(cos(an), sin(an)) * 18 * k, P(BB_C.x, BB_C.y) + Vector2(cos(an), sin(an)) * 32 * k, 4)

## 給檢查用：碰撞那一格球心到球棒的距離 − 球半徑 − 棒半粗（0＝剛好碰到）
static func baseball_contact_gap() -> float:
	var a := 0.0
	var d := Vector2(cos(a), sin(a))
	var v := BB_C - BB_PIV
	var along := clampf(v.dot(d), 0.0, BB_LEN)
	return (v - d * along).length() - BB_R - BB_HALF

## 檢查：[碰撞那格的間隙, 碰之前／之後球和球棒最近的間隙（<0＝穿過）, 球飛出畫面的 u]
func baseball_gaps() -> Array:
	var worst := 999.0
	var exit_u := -1.0
	for i in 600:
		var u := i / 600.0
		if absf(u - BB_HIT) < 0.0005:
			continue
		var b: Array = _bb_bat(u)
		var p := _bb_ball(u)
		worst = minf(worst, seg_dist(p, b[0], b[1]) - BB_R - BB_HALF)
		if u > BB_HIT and exit_u < 0.0 and (p.x > 466.0 + BB_R or p.y < -BB_R):
			exit_u = u
	return [baseball_contact_gap(), worst, exit_u]

# ═════════════════════════════════════════════════════════════════════
# play basketball：手（灰色手掌）往下推球 → 放手 → 球受重力落地、反彈 → 剛好在最高點回到手心；右邊只有籃框外框
# 合邏輯（老師 11/10）：球只在碰到手或地板時改變方向；中間是拋物線（不是 |sin|）。
# ═════════════════════════════════════════════════════════════════════
const BK_TOP := 128.0       # 接球時球心高度（手心在球上緣）
const BK_REL := 168.0       # 放手時球心高度
const BK_FLOOR := 254.0     # 球心碰地（地線 270、半徑 16）
const BK_R := 16.0
const BK_PUSH := 0.2        # 一次運球裡，手推球的時間比例
var _bk := {}
func _bk_solve() -> Dictionary:
	# 單位：px、「一次運球」＝1。放手速度＝手推的速度；往上那段到頂速度 0（剛好被手接住）
	if not _bk.is_empty():
		return _bk
	var v0 := (BK_REL - BK_TOP) / BK_PUSH
	var lo := 10.0
	var hi := 20000.0
	var g := 1000.0
	var td := 0.0
	var tu := 0.0
	for it in 60:
		g = (lo + hi) * 0.5
		td = (-v0 + sqrt(v0 * v0 + 2.0 * g * (BK_FLOOR - BK_REL))) / g
		tu = sqrt(2.0 * (BK_FLOOR - BK_TOP) / g)
		if td + tu > 1.0 - BK_PUSH:
			lo = g
		else:
			hi = g
	_bk = {"g": g, "td": td, "tu": tu, "v0": v0}
	return _bk

## 一次運球裡的時間 ph（0..1）→ [球心 y, 手心 y, 球有沒有在手上]
func _bk_state(ph: float) -> Array:
	var S := _bk_solve()
	if ph < BK_PUSH:
		var y := lerpf(BK_TOP, BK_REL, ph / BK_PUSH)
		return [y, y - BK_R, true]
	var tt := ph - BK_PUSH
	var g: float = S["g"]
	var td: float = S["td"]
	var y: float
	if tt <= td:
		y = BK_REL + float(S["v0"]) * tt + 0.5 * g * tt * tt
	else:
		var tu := tt - td
		y = BK_FLOOR - (g * float(S["tu"])) * tu + 0.5 * g * tu * tu
	# 手：放手後往上回到最高點等球（比球早一點到）
	var hk := clampf(tt / (1.0 - BK_PUSH - 0.05), 0.0, 1.0)
	var hy := lerpf(BK_REL - BK_R, BK_TOP - BK_R, hk * hk * (3.0 - 2.0 * hk))
	return [y, hy, false]

func _a_basketball(u: float) -> void:
	line(P(20, 270), P(380, 270), 3, GREY)
	# 籃框外框（細線）
	draw_rect(Rect2(P(300, 40), Vector2(70, 50) * k), INK, false, 4 * k)
	line(P(318, 100), P(352, 100), 5)
	for j in 4:
		line(P(320 + j * 10, 100), P(325 + j * 6, 128), 2, GREY)
	line(P(370, 65), P(392, 65), 5)
	line(P(392, 65), P(392, 270), 6)
	var ph := fmod(u * 4.0, 1.0)
	var st := _bk_state(ph)
	var x := 120.0
	var y: float = st[0]
	var sq := 1.0 + (0.18 if y > BK_FLOOR - 3.0 else 0.0)
	draw_set_transform(P(x, y + (BK_R * (1.0 - 1.0 / sq) if sq > 1.0 else 0.0)), 0, Vector2(sq, 1.0 / sq))
	draw_circle(Vector2.ZERO, BK_R * k, INK)
	draw_arc(Vector2.ZERO, BK_R * k, 0, TAU, 32, PAPER, 1.5 * k)
	draw_line(Vector2(-BK_R, 0) * k, Vector2(BK_R, 0) * k, PAPER, 1.5 * k)
	draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
	# 手（灰色手掌，手心在 hy；推球時正好貼著球上緣）
	var hy: float = st[1]
	var hand := [P(x - 20, hy - 2), P(x + 20, hy - 2), P(x + 18, hy - 22), P(x + 8, hy - 30), P(x - 12, hy - 28), P(x - 22, hy - 14)]
	poly(hand, GREY)
	line(P(x + 6, hy - 30), P(x + 2, hy - 70), 16, GREY)   # 手臂

## 給檢查用：推球時手心到球上緣的距離（0＝貼著）、最低點球到地板的距離、回到最高點時球到手的距離、
## 球離手後手心到球上緣的最小值（<0＝手穿進球）
func basketball_gaps() -> Array:
	var worst_hand := 0.0
	for i in 20:
		var st := _bk_state(BK_PUSH * i / 20.0)
		worst_hand = maxf(worst_hand, absf((float(st[0]) - BK_R) - float(st[1])))
	var low := 0.0
	var clear := 999.0
	for i in 400:
		var st2 := _bk_state(BK_PUSH + (1.0 - BK_PUSH) * i / 400.0)
		low = maxf(low, float(st2[0]))
		clear = minf(clear, (float(st2[0]) - BK_R) - float(st2[1]))
	var top := _bk_state(0.999)
	return [worst_hand, BK_FLOOR - low, absf(float(top[0]) - BK_TOP), clear]

# ═════════════════════════════════════════════════════════════════════
# ride a bike：側面的腳踏車（灰色車架）停在畫面中、地面往後退（像鏡頭跟著車）。
# 合邏輯：輪胎外緣貼著地線（0 px）；地面退的速度＝輪胎外緣速度（不打滑）；
# 腳（淺灰）踩著踏板 → 曲柄、齒盤轉 → 鏈條 → 後輪轉（齒盤 16：飛輪 7），踏板一直保持水平。
# ═════════════════════════════════════════════════════════════════════
const BIKE_W := 4.0                 # 輪子角速度（rad/s）
const BIKE_R := 60.0                # 輪框中心線半徑
const BIKE_TIRE := 7.0              # 輪胎粗
const BIKE_GROUND := 262.0          # 地線中心（粗 3 → 上緣 260.5）
const BIKE_GROUND_W := 3.0
const BIKE_CY := BIKE_GROUND - BIKE_GROUND_W * 0.5 - (BIKE_R + BIKE_TIRE * 0.5)   # 輪心 y＝197
const BIKE_REAR := Vector2(110, BIKE_CY)
const BIKE_FRONT := Vector2(290, BIKE_CY)
const BIKE_BB := Vector2(190, 214)  # 五通（曲柄軸）
const BIKE_SEAT := Vector2(168, 126)
const BIKE_HEAD := Vector2(262, 132)
const BIKE_HIP := Vector2(166, 108)
const BIKE_CRANK := 22.0
const BIKE_RING := 16.0             # 齒盤半徑
const BIKE_COG := 7.0               # 後飛輪半徑
const BIKE_LEG := 66.0              # 大腿＝小腿
const BIKE_PEDAL := Vector2(18, 5)
const BIKE_SHOE_H := 8.0
func _bike_wheel_angle(tl: float) -> float:
	return tl * BIKE_W

func _bike_crank_angle(tl: float) -> float:
	return _bike_wheel_angle(tl) * BIKE_COG / BIKE_RING   # 鏈條線速度相同：ω_齒盤·R_盤＝ω_輪·R_飛輪

func _bike_pedal(tl: float, far: bool) -> Vector2:
	var a := _bike_crank_angle(tl) + (PI if far else 0.0)
	return BIKE_BB + Vector2(cos(a), sin(a)) * BIKE_CRANK

## 鞋子中心：鞋底剛好貼著踏板上緣
func _bike_foot(tl: float, far: bool) -> Vector2:
	return _bike_pedal(tl, far) + Vector2(0, -BIKE_PEDAL.y * 0.5 - BIKE_SHOE_H * 0.5)

func _bike_leg(tl: float, far: bool, col: Color, w: float) -> void:
	var foot := _bike_foot(tl, far)
	var knee := ik_knee(BIKE_HIP, foot, BIKE_LEG, BIKE_LEG, 1.0)
	line(PV(BIKE_HIP), PV(knee), w, col)
	line(PV(knee), PV(foot), w * 0.85, col)
	draw_rect(Rect2(PV(foot + Vector2(-12, -BIKE_SHOE_H * 0.5)), Vector2(24, BIKE_SHOE_H) * k), col)

func _a_bike(u: float) -> void:
	var tl := u * LOOP
	var gy := BIKE_GROUND
	line(P(-70, gy), P(470, gy), BIKE_GROUND_W, GREY)
	var v := BIKE_W * (BIKE_R + BIKE_TIRE * 0.5)   # 地面往後退的速度（px/s）＝輪胎外緣速度
	for j in 11:   # 地上的短線（跟著地面往左退）
		var x := 470.0 - fmod(tl * v + j * 50.0, 550.0)
		line(P(x, gy + 12), P(x + 22.0, gy + 12), 3, GREY)
	# 遠側的腳（在車架後面，淡一點）
	_bike_leg(tl, true, Color(SKIN, 0.55), 15)
	# 輪子
	var wa := _bike_wheel_angle(tl)
	for c0 in [BIKE_REAR, BIKE_FRONT]:
		var c := PV(c0)
		circ(c, BIKE_R, INK, false, BIKE_TIRE)
		for j in 8:
			var a := j * TAU / 8 + wa
			line(c, c + Vector2(cos(a), sin(a)) * (BIKE_R - 4) * k, 2)
		circ(c, 6)
	# 車架（灰）
	for seg in [[BIKE_REAR, BIKE_BB], [BIKE_BB, BIKE_SEAT], [BIKE_SEAT, BIKE_HEAD], [BIKE_HEAD, BIKE_BB], [BIKE_SEAT, BIKE_REAR], [BIKE_HEAD, BIKE_FRONT]]:
		line(PV(seg[0]), PV(seg[1]), 6, GREY)
	line(PV(BIKE_HEAD), P(254, 112), 6, GREY)
	line(P(254, 112), P(278, 110), 6, GREY)
	draw_rect(Rect2(P(152, 119), Vector2(32, 8) * k), INK)   # 座墊
	# 鏈條（上下兩段）＋鏈節點（上段往右走、速度＝齒盤邊緣速度）
	var ca := _bike_crank_angle(tl)
	var top_a := BIKE_REAR + Vector2(0, -BIKE_COG)
	var top_b := BIKE_BB + Vector2(0, -BIKE_RING)
	line(PV(top_b), PV(top_a), 2, INK)
	line(PV(BIKE_BB + Vector2(0, BIKE_RING)), PV(BIKE_REAR + Vector2(0, BIKE_COG)), 2, INK)
	var top_len := top_a.distance_to(top_b)
	for j in 6:
		var s := fmod(ca * BIKE_RING + j * top_len / 6.0, top_len) / top_len
		circ(PV(top_a.lerp(top_b, s)), 2.2)
	circ(PV(BIKE_REAR), BIKE_COG, INK, false, 2.5)
	circ(PV(BIKE_BB), BIKE_RING, INK, false, 3)
	for j in 5:   # 齒盤的輻（看得出在轉）
		var a2 := ca + j * TAU / 5
		line(PV(BIKE_BB), PV(BIKE_BB + Vector2(cos(a2), sin(a2)) * BIKE_RING), 2)
	# 曲柄＋踏板（踏板保持水平）
	for far in [true, false]:
		var pd := _bike_pedal(tl, far)
		var col := Color(INK, 0.5) if far else INK
		line(PV(BIKE_BB), PV(pd), 5, col)
		draw_rect(Rect2(PV(pd - BIKE_PEDAL * 0.5), BIKE_PEDAL * k), col)
	circ(PV(BIKE_BB), 4)
	# 近側的腳（在最前面）
	_bike_leg(tl, false, SKIN, 17)
	# 速度線（空氣，和地面同速）
	for j in 3:
		var yy := 60.0 + j * 30
		var off := fmod(tl * v + j * 130, 540.0)
		line(P(470 - off, yy), P(470 - off + 40, yy), 3, Color(GREY, 0.6))

## 檢查：[輪胎底到地線上緣（px，0＝貼地）, 鞋底到踏板上緣／小腿長度誤差（px）, 鏈條兩端線速度差]
func bike_gaps() -> Array:
	var tire_bottom := BIKE_CY + BIKE_R + BIKE_TIRE * 0.5
	var ground_top := BIKE_GROUND - BIKE_GROUND_W * 0.5
	var worst_foot := 0.0
	for i in 24:
		var tl := i * 0.25
		for far in [false, true]:
			var pd := _bike_pedal(tl, far)
			var foot := _bike_foot(tl, far)
			var knee := ik_knee(BIKE_HIP, foot, BIKE_LEG, BIKE_LEG, 1.0)
			worst_foot = maxf(worst_foot, absf(knee.distance_to(foot) - BIKE_LEG))   # 腳有沒有被拉離踏板
			worst_foot = maxf(worst_foot, absf((foot.y + BIKE_SHOE_H * 0.5) - (pd.y - BIKE_PEDAL.y * 0.5)))
	var chain := absf(BIKE_W * BIKE_COG - (BIKE_W * BIKE_COG / BIKE_RING) * BIKE_RING)
	return [tire_bottom - ground_top, worst_foot, chain]

# ═════════════════════════════════════════════════════════════════════
# study English：手握的鉛筆從畫面外進來，把 A、B、C 一筆一筆寫出來；
# 合邏輯：只有筆尖貼著紙時才有線；換一筆時筆抬起來、在空中移過去（不瞬移）；寫完筆離開畫面。
# ═════════════════════════════════════════════════════════════════════
const EN_STROKES := [
	[[60, 230], [90, 110]], [[90, 110], [120, 230]], [[72, 185], [108, 185]],
	[[160, 230], [160, 110]], [[160, 110], [195, 120], [200, 150], [160, 168]], [[160, 168], [205, 180], [205, 220], [160, 230]],
	[[320, 125], [295, 110], [262, 118], [250, 170], [262, 222], [295, 230], [320, 215]]]
const EN_DIR := Vector2(0.55, -0.83)
const EN_AIR_SPEED := 2.5           # 空中移動比寫字快幾倍
var _en_plan: Array = []
## 動作清單：每段 [起點, 終點, 有沒有寫（筆尖貼紙）]
func _en_segments() -> Array:
	if not _en_plan.is_empty():
		return _en_plan
	var segs: Array = []
	var pos := Vector2(470, 150)   # 從畫面外（右邊）進來
	for st in EN_STROKES:
		segs.append([pos, Vector2(st[0][0], st[0][1]), false])
		for i in st.size() - 1:
			segs.append([Vector2(st[i][0], st[i][1]), Vector2(st[i + 1][0], st[i + 1][1]), true])
		pos = Vector2(st[st.size() - 1][0], st[st.size() - 1][1])
	segs.append([pos, Vector2(500, 40), false])   # 寫完離開
	_en_plan = segs
	return segs

func _en_cost(sg: Array) -> float:
	return (sg[0] as Vector2).distance_to(sg[1]) / (1.0 if sg[2] else EN_AIR_SPEED)

## u → [筆尖位置, 筆尖有沒有貼紙, 已經寫好的線段]
func _en_state(u: float) -> Array:
	var segs := _en_segments()
	var total := 0.0
	for sg in segs:
		total += _en_cost(sg)
	var budget := clampf((u - 0.04) / 0.86, 0.0, 1.0) * total
	var tip: Vector2 = segs[0][0]
	var on := false
	var ink: Array = []
	for sg in segs:
		if budget <= 0.0:
			break
		var c := _en_cost(sg)
		var f := minf(1.0, budget / maxf(c, 0.0001))
		tip = (sg[0] as Vector2).lerp(sg[1], f)
		on = sg[2]
		if sg[2]:
			ink.append([sg[0], tip])
		budget -= c
	if budget > 0.0:
		on = false   # 全部做完（筆已經離開）
	return [tip, on, ink]

func _a_english(u: float) -> void:
	line(P(-60, 230), P(460, 230), 2, GREY)
	line(P(-60, 110), P(460, 110), 2, GREY)
	line(P(-60, 170), P(460, 170), 1, Color(GREY, 0.6))
	var st := _en_state(u)
	for sg in st[2]:
		line(PV(sg[0]), PV(sg[1]), 7)
		circ(PV(sg[0]), 3.5)
		circ(PV(sg[1]), 3.5)
	var on: bool = st[1]
	# 筆抬起來時：筆往右上提，紙上有淡淡的影子點
	var lift := Vector2.ZERO if on else Vector2(6, -8)
	var tip := PV(st[0] + lift)
	if not on:
		circ(PV(st[0]), 3, Color(INK, 0.15))
	var dir := EN_DIR
	var nrm := Vector2(-dir.y, dir.x) * 6 * k
	poly([tip, tip + dir * 18 * k + nrm, tip + dir * 18 * k - nrm])
	poly([tip + dir * 18 * k + nrm, tip + dir * 95 * k + nrm, tip + dir * 95 * k - nrm, tip + dir * 18 * k - nrm], GREY)
	# 握筆的手（淺灰）＋手臂從右上方伸出畫面
	var hand := tip + dir * 52 * k
	line(hand, hand + Vector2(0.8, -0.6) * 260 * k, 24, SKIN)
	circ(hand, 15, SKIN)

## 檢查：[寫字時筆尖到最新墨線端點的距離（px，0＝墨水從筆尖出來）, 相鄰 1/600 輪筆尖最大位移（px，大＝瞬移）]
func english_gaps() -> Array:
	var worst := 0.0
	var jump := 0.0
	var prev: Vector2 = _en_state(0.0)[0]
	for i in 601:
		var u := i / 600.0
		var st := _en_state(u)
		var tip: Vector2 = st[0]
		jump = maxf(jump, tip.distance_to(prev))
		prev = tip
		var ink: Array = st[2]
		if st[1] and not ink.is_empty():
			var last: Array = ink[ink.size() - 1]
			worst = maxf(worst, tip.distance_to(last[1]))
	return [worst, jump]

# ═════════════════════════════════════════════════════════════════════
# surf the Internet：游標移到一個網頁方塊 → 「點一下」（游標壓下＋圈圈）→ 那一頁才亮起、內容一行行載入；
# Wi-Fi 波紋從中間的路由器天線發出
# ═════════════════════════════════════════════════════════════════════
const IN_BOXES := [Rect2(40, 40, 140, 90), Rect2(220, 40, 140, 90), Rect2(220, 170, 140, 90), Rect2(40, 170, 140, 90)]
func _in_cursor(u: float) -> Array:
	var seg := int(u * 4.0) % 4
	var f := fmod(u * 4.0, 1.0)
	var a: Rect2 = IN_BOXES[seg]
	var b: Rect2 = IN_BOXES[(seg + 1) % 4]
	var m := smoothstep(0.55, 1.0, f)
	var p := (a.get_center() + Vector2(30, 20)).lerp(b.get_center() + Vector2(30, 20), m)
	return [p, seg, f]

func _a_internet(u: float) -> void:
	var cs := _in_cursor(u)
	var cur: int = cs[1]
	var f: float = cs[2]
	for i in IN_BOXES.size():
		var r: Rect2 = IN_BOXES[i]
		var active := i == cur
		if active:
			draw_rect(Rect2(P(r.position.x, r.position.y), r.size * k), INK)
		else:
			draw_rect(Rect2(P(r.position.x, r.position.y), r.size * k), GREY, false, 4 * k)
		if active:
			for j in 3:   # 點下去之後內容才一行行出現
				var lf := clampf((f - 0.08 - j * 0.1) / 0.1, 0.0, 1.0)
				if lf > 0.0:
					draw_rect(Rect2(P(r.position.x + 14, r.position.y + 18 + j * 22), Vector2((r.size.x - 28 - j * 20) * lf, 8) * k), PAPER)
	# 游標：點擊（f<0.1）時往下壓一點＋圈圈擴散
	var cp: Vector2 = cs[0]
	var press := 2.0 if f < 0.1 else 0.0
	if f < 0.25:
		draw_arc(PV(cp), (6.0 + f * 80.0) * k, 0, TAU, 24, Color(PAPER, 1.0 - f * 4.0), 3 * k, true)
	var c := PV(cp + Vector2(press, press))
	var sh := [c, c + Vector2(0, 30) * k, c + Vector2(8, 23) * k, c + Vector2(15, 36) * k, c + Vector2(21, 33) * k, c + Vector2(14, 21) * k, c + Vector2(24, 20) * k]
	poly(sh, INK)
	var outl := PackedVector2Array(sh)
	outl.append(c)
	draw_polyline(outl, PAPER, 2 * k)
	# 路由器（中間的小盒子＋天線），Wi-Fi 波紋從天線發出
	var w := P(200, 146)
	draw_rect(Rect2(P(186, 154), Vector2(28, 10) * k), INK)
	line(w, P(200, 154), 3)
	for j in 3:
		var on := fmod(u * LOOP * 2.0, 3.0) >= j
		draw_arc(w, (10 + j * 9) * k, -PI * 0.75, -PI * 0.25, 12, INK if on else Color(GREY, 0.4), 3.5 * k, true)
	circ(w, 3.5)

# ═════════════════════════════════════════════════════════════════════
# watch TV：大拇指按遙控器 → 紅外線波從遙控器頭飛到電視右下角的接收點 → 訊號到了電視才閃一下換台
# ═════════════════════════════════════════════════════════════════════
const TV_CH := 6                         # 一輪 6 台
const TV_PRESS := Vector2(0.50, 0.64)    # 每台的時間裡，大拇指按下的區間
const TV_IR := Vector2(0.58, 1.0)        # 紅外線從遙控器飛到電視的區間（1.0＝到了→下一台）
const TV_SCREEN := Rect2(40, 50, 240, 168)
const TV_RX := Vector2(284, 222)         # 電視右下角的接收點
const TV_REMOTE := Vector2(388, 250)     # 遙控器中心
func _tv_dir() -> Vector2:
	return (TV_RX - TV_REMOTE).normalized()

func _tv_remote_tip() -> Vector2:
	return TV_REMOTE + _tv_dir() * 34.0

func _a_tv(u: float) -> void:
	var tl := u * LOOP
	var r := Rect2(PV(TV_SCREEN.position), TV_SCREEN.size * k)
	draw_rect(r.grow(10 * k), INK)
	line(P(110, 40), P(85, 5), 4)
	line(P(210, 40), P(235, 5), 4)
	line(P(110, 228), P(92, 262), 6)
	line(P(210, 228), P(228, 262), 6)
	var ch := int(u * TV_CH)
	var f := fmod(u * TV_CH, 1.0)
	draw_rect(r, PAPER)
	match ch % 4:
		0:
			var rr := RandomNumberGenerator.new()
			rr.seed = int(tl * 20.0)
			for i in 260:
				var p := r.position + Vector2(rr.randf() * (r.size.x - 6 * k), rr.randf() * (r.size.y - 4 * k))
				draw_rect(Rect2(p, Vector2(6, 4) * k), INK if rr.randf() < 0.5 else GREY)
		1:
			for i in 7:
				draw_rect(Rect2(r.position + Vector2(r.size.x * i / 7.0, 0), Vector2(r.size.x / 7.0, r.size.y)), Color.from_hsv(0, 0, i / 7.0))
		2:
			circ(r.get_center() + Vector2(sin(tl * 3.0) * 60, 0) * k, 30)
		3:
			poly([r.position + Vector2(0, r.size.y), r.position + Vector2(r.size.x * 0.35, r.size.y * 0.3), r.position + Vector2(r.size.x * 0.6, r.size.y * 0.7), r.position + Vector2(r.size.x * 0.8, r.size.y * 0.45), r.end], GREY)
	# 訊號到了才換台：新的一台開頭閃一下（第 0 台是一輪開頭，電視本來就開著）
	if ch > 0 and f < 0.05:
		draw_rect(r, INK)
	circ(PV(TV_RX), 4, PAPER)   # 接收點（亮點）
	circ(PV(TV_RX), 4, GREY, false, 2)
	# 紅外線：從遙控器頭往電視接收點飛（三道弧，前進方向朝電視）
	var tip := _tv_remote_tip()
	var dir := _tv_dir()
	if f >= TV_IR.x:
		var q := (f - TV_IR.x) / (TV_IR.y - TV_IR.x)
		for j in 3:
			var qq := q - j * 0.15
			if qq < 0.0 or qq > 1.0:
				continue
			draw_arc(PV(tip.lerp(TV_RX, qq)), 12 * k, dir.angle() - 0.8, dir.angle() + 0.8, 10, INK, 3.5 * k, true)
	# 握遙控器的手（淺灰手掌在下面、手臂往右下伸出畫面）
	var rd := dir
	var rn := Vector2(-rd.y, rd.x)
	var c0 := TV_REMOTE
	var palm := c0 - rd * 14 + rn * 10
	line(PV(palm), P(480, 330), 30, SKIN)
	circ(PV(palm), 20, SKIN)
	# 遙控器（黑色長條，頭朝電視）
	poly([PV(c0 + rd * 34 + rn * 9), PV(c0 + rd * 34 - rn * 9), PV(c0 - rd * 40 - rn * 9), PV(c0 - rd * 40 + rn * 9)])
	var btn := c0 + rd * 8
	var pressing := f >= TV_PRESS.x and f < TV_PRESS.y
	circ(PV(btn), 5, GREY if pressing else PAPER)
	# 大拇指：平常停在按鈕旁（抬起），按的時候壓在按鈕上
	var thumb := btn + (Vector2.ZERO if pressing else -rd * 14 - rn * 12)
	line(PV(palm), PV(thumb), 14, SKIN)
	circ(PV(thumb), 8, SKIN)

## 檢查：[換台那一刻紅外線到接收點的距離（px）, 按鈕按下早於紅外線出發, 紅外線到了才換台]
func tv_gaps() -> Array:
	var tip := _tv_remote_tip()
	return [tip.lerp(TV_RX, (TV_IR.y - TV_IR.x) / (TV_IR.y - TV_IR.x)).distance_to(TV_RX), TV_PRESS.x <= TV_IR.x, TV_IR.y <= 1.0]

# ═════════════════════════════════════════════════════════════════════
# go camping：星空下已經搭好的帳篷＋營火原地閃動；火星從火裡往上飄、慢慢熄掉
# 合邏輯：帳篷不會自己長出來；火焰只在原地變高變矮；火星都從火堆出來。
# ═════════════════════════════════════════════════════════════════════
const CP_FIRE := Vector2(300, 248)
func _a_camping(u: float) -> void:
	var tl := u * LOOP
	draw_rect(Rect2(Vector2.ZERO, size), NIGHT)
	var rr := RandomNumberGenerator.new()
	rr.seed = 7
	for i in 30:
		var p := P(-60 + rr.randf() * 520, rr.randf() * 140)
		var tw := 0.5 + 0.5 * sin(tl * 3.0 + i)
		draw_circle(p, (1.2 + tw * 1.6) * k, Color(1, 1, 1, 0.5 + tw * 0.5))
	draw_rect(Rect2(P(-80, 250), Vector2(560, 60) * k), PAPER)
	# 帳篷（一開始就搭好）＋門簾隨風微微動
	var top := P(120, 120)
	poly([P(40, 250), top, P(200, 250)], PAPER)
	var flap := 3.0 * sin(tl * 1.7)
	poly([P(108 - flap, 250), top, P(132 + flap, 250)], NIGHT)
	line(top, P(14, 250), 2, Color(1, 1, 1, 0.7))    # 營繩（帳篷頂 → 地上的營釘）
	line(top, P(226, 250), 2, Color(1, 1, 1, 0.7))
	# 營火
	var fl := 1.0 + 0.25 * sin(tl * 13.0) + 0.15 * sin(tl * 7.0)
	var c := PV(CP_FIRE)
	line(c + Vector2(-26, 0) * k, c + Vector2(26, -8) * k, 7, GREY)
	line(c + Vector2(-26, -8) * k, c + Vector2(26, 0) * k, 7, GREY)
	draw_circle(c + Vector2(0, -25) * k, 70 * k * fl, Color(1, 1, 1, 0.06))
	poly([c + Vector2(-20, -6) * k, c + Vector2(-6, -60 * fl) * k, c + Vector2(4, -30) * k, c + Vector2(12, -52 * fl) * k, c + Vector2(20, -6) * k], PAPER)
	poly([c + Vector2(-8, -8) * k, c + Vector2(0, -30 * fl) * k, c + Vector2(8, -8) * k], NIGHT)
	# 火星：從火焰頂端冒出、往上飄、變小變淡
	var life := 1.4
	for i in 7:
		var age := fmod(tl + i * 0.37, life)
		if tl - age < 0.0:
			continue
		var sp := CP_FIRE + Vector2(sin(i * 2.1) * 8.0 + sin(age * 5.0 + i) * 6.0, -40.0 - age * 70.0)
		draw_circle(PV(sp), (2.6 - age * 1.4) * k, Color(1, 1, 1, 1.0 - age / life))

# ═════════════════════════════════════════════════════════════════════
# play online games：像素小人站在平台上 → 起跳（拋物線）→ 落在下一個平台（腳底剛好在平台上緣）→ 落地那一刻閃星星、分數多一格
# 合邏輯：分數是「落地」這個事件加的，不是照時間加；跳的路線不穿過平台。
# ═════════════════════════════════════════════════════════════════════
const GM_PX := 12.0
const GM_PLATS := [[30.0, 240.0, 6], [140.0, 200.0, 5], [240.0, 160.0, 6]]
const GM_STAND := [50.0, 160.0, 260.0]
const GM_JUMPS := 6            # 一輪跳 6 次（0→1→2→0→1→2→0）
const GM_HOLD := 0.3           # 每次先站一下
func _gm_pos(u: float) -> Array:
	var seg := int(u * GM_JUMPS)
	var f := fmod(u * GM_JUMPS, 1.0)
	var a := seg % 3
	var b := (seg + 1) % 3
	var ya: float = GM_PLATS[a][1]
	var yb: float = GM_PLATS[b][1]
	if f < GM_HOLD:
		return [float(GM_STAND[a]), ya, seg, f, true]
	var q := (f - GM_HOLD) / (1.0 - GM_HOLD)
	var h := 50.0 if yb < ya else 40.0
	var x := lerpf(GM_STAND[a], GM_STAND[b], q)
	var y := lerpf(ya, yb, q) - 4.0 * h * q * (1.0 - q)
	return [x, y, seg, f, false]

func _a_games(u: float) -> void:
	var px := GM_PX
	for pl in GM_PLATS:
		for i in int(pl[2]):
			draw_rect(Rect2(P(pl[0] + i * px * 1.3, pl[1]), Vector2(px * 1.2, px * 1.2) * k), INK)
	var st := _gm_pos(u)
	var x: float = st[0]
	var feet: float = st[1]
	var seg: int = st[2]
	var f: float = st[3]
	var y := feet - px * 3.2   # 小人高 4 格（每格 0.8 px）→ 腳底＝feet
	# 像素小人（3×4 格），站著時腳張開，在空中時腳併起
	var body := [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]
	if st[4]:
		body += [[0, 3], [2, 3]]
	else:
		body += [[1, 3]]
	for cc in body:
		draw_rect(Rect2(P(x + cc[0] * px * 0.8, y + cc[1] * px * 0.8), Vector2(px * 0.8, px * 0.8) * k), INK)
	# 分數方塊（右上）：每次落地加一格
	for i in seg:
		draw_rect(Rect2(P(360, 120 - i * 10), Vector2(24, 8) * k), INK if i % 2 == 0 else GREY)
	# 星星：落地那一刻（新的一段剛開始）在腳下閃
	if seg > 0 and f < 0.12:
		var c := P(x + px * 1.2, feet)
		for j in 6:
			var an := -PI + j * PI / 5
			line(c + Vector2(cos(an), sin(an)) * 12 * k, c + Vector2(cos(an), sin(an)) * 22 * k, 3)

## 檢查：[落地時腳底到平台上緣（px）, 跳的時候小人和平台最近的距離（px，<0＝穿過）]
func games_gaps() -> Array:
	var land := 0.0
	for s in range(1, GM_JUMPS):
		var st := _gm_pos(float(s) / GM_JUMPS + 0.0001)
		land = maxf(land, absf(float(st[1]) - float(GM_PLATS[s % 3][1])))
	var clear := 999.0
	for i in 1200:
		var st2 := _gm_pos(i / 1200.0)
		if st2[4]:
			continue
		var fx: float = st2[0]
		var fy: float = st2[1]
		for pl in GM_PLATS:
			var x0: float = pl[0]
			var x1: float = x0 + (int(pl[2]) - 1) * GM_PX * 1.3 + GM_PX * 1.2
			if fx + GM_PX * 2.4 > x0 and fx < x1:
				clear = minf(clear, float(pl[1]) - fy)   # 平台上緣 − 腳底（<0＝腳陷進平台）
	return [land, clear]

# ═════════════════════════════════════════════════════════════════════
# play the recorder：直笛（灰色、直立）上方 3 個孔由手指（淺灰）按住或放開；
# 每吹一個音，手指換好按法 → 音符才從笛子下面的喇叭口出來、往右上飄、慢慢變淡（曲調像 Hot Cross Buns：B A G）
# ═════════════════════════════════════════════════════════════════════
const RC_X := 110.0
const RC_TOP := 28.0
const RC_BELL := 284.0
const RC_HOLES := 7
const RC_BEAT := 0.36
## [音名, 按住上面幾個孔, 拍數]
const RC_TUNE := [["B", 1, 1.0], ["A", 2, 1.0], ["G", 3, 2.0], ["B", 1, 1.0], ["A", 2, 1.0], ["G", 3, 2.0],
	["G", 3, 0.5], ["G", 3, 0.5], ["G", 3, 0.5], ["G", 3, 0.5], ["A", 2, 0.5], ["A", 2, 0.5], ["A", 2, 0.5], ["A", 2, 0.5]]
const RC_PITCH := {"B": 0.0, "A": 22.0, "G": 44.0}
const RC_LIFE := 1.2
func _rc_hole(j: int) -> Vector2:
	return Vector2(RC_X, 74 + j * 27)

func _rc_onsets() -> Array:
	var out: Array = []
	var tt := 0.3
	for n in RC_TUNE:
		out.append([tt, n[0], int(n[1])])
		tt += float(n[2]) * RC_BEAT
	return out

func _rc_note_pos(pitch: String, age: float) -> Vector2:
	var start := Vector2(RC_X + 14, RC_BELL + 2)
	var target_y := 120.0 + float(RC_PITCH[pitch])
	var e := 1.0 - exp(-age * 2.2)
	return Vector2(start.x + age * 150.0, lerpf(start.y, target_y, e))

func _a_recorder(u: float) -> void:
	var tl := u * LOOP
	var ons := _rc_onsets()
	var cur := -1
	for i in ons.size():
		if tl >= float(ons[i][0]):
			cur = i
	var covered := 0 if cur < 0 else int(ons[cur][2])
	if cur >= 0 and tl > float(ons[ons.size() - 1][0]) + RC_BEAT * 0.5:
		covered = 0   # 吹完，手指放開
	# 直笛身體（灰）：吹嘴在上、喇叭口在下
	poly([P(RC_X - 9, RC_TOP), P(RC_X + 9, RC_TOP), P(RC_X + 12, RC_BELL - 16), P(RC_X + 18, RC_BELL), P(RC_X - 18, RC_BELL), P(RC_X - 12, RC_BELL - 16)], GREY)
	draw_rect(Rect2(P(RC_X - 6, RC_TOP + 18), Vector2(12, 6) * k), INK)   # 吹口窗
	for j in RC_HOLES:
		circ(PV(_rc_hole(j)), 6, INK, false, 3)
	# 上面 3 根手指：按住＝蓋在孔上；放開＝抬到孔的左上（淡一點）
	for j in 3:
		var hp := _rc_hole(j)
		if j < covered:
			line(PV(hp), PV(hp + Vector2(-60, 6)), 18, SKIN)
			circ(PV(hp), 11, SKIN)
		else:
			var lp := hp + Vector2(-16, -8)
			line(PV(lp), PV(lp + Vector2(-56, 6)), 18, Color(SKIN, 0.8))
			circ(PV(lp), 10, Color(SKIN, 0.8))
	# 音符：每個音一開始就從喇叭口出來，往右上飄、變淡（高音飄得比較高）
	for i in ons.size():
		var age := tl - float(ons[i][0])
		if age < 0.0 or age > RC_LIFE:
			continue
		var col := Color(INK, 1.0 - smoothstep(RC_LIFE * 0.45, RC_LIFE, age))
		note(PV(_rc_note_pos(ons[i][1], age)), 0.85, col)

## 檢查：[音符剛出來時到喇叭口的距離（px）, 最後一個音符淡完的秒數（要 < 一輪）]
func recorder_gaps() -> Array:
	var p := _rc_note_pos("B", 0.0)
	var ons := _rc_onsets()
	return [p.distance_to(Vector2(RC_X + 14, RC_BELL + 2)), float(ons[ons.size() - 1][0]) + RC_LIFE]

# ── 音效線索的畫面：只有喇叭＋聲波（不洩漏答案） ──
func _a__sound(_u: float) -> void:
	var c := P(150, 150)
	poly([c + Vector2(-50, -28) * k, c + Vector2(-20, -28) * k, c + Vector2(20, -65) * k, c + Vector2(20, 65) * k, c + Vector2(-20, 28) * k, c + Vector2(-50, 28) * k])
	for j in 4:
		var ph := fmod(t * 1.2 + j * 0.25, 1.0) if playing else 0.0
		var r := 50.0 + j * 32.0 + ph * 10.0
		draw_arc(c + Vector2(20, 0) * k, r * k, -0.75, 0.75, 20, Color(INK, (1.0 - ph * 0.7) if playing else 0.35), 7 * k, true)

## 檢查場景用：每段的量測（px；0＝剛好碰到）
func gaps() -> Dictionary:
	match act:
		"jogging":
			return {"print_vs_shoe_px": jogging_gaps()[0]}
		"music":
			return {"note_spawn_vs_cup_px": music_gaps()[0]}
		"baseball":
			var g := baseball_gaps()
			return {"ball_bat_at_contact_px": g[0], "min_ball_bat_clearance_px": g[1], "ball_leaves_frame_u": g[2]}
		"basketball":
			var g2 := basketball_gaps()
			return {"hand_ball_push_px": g2[0], "ball_floor_lowest_px": g2[1], "ball_hand_top_px": g2[2], "hand_above_ball_min_px": g2[3]}
		"bike":
			var g3 := bike_gaps()
			return {"tire_ground_px": g3[0], "foot_pedal_px": g3[1], "chain_speed_diff": g3[2]}
		"english":
			var g4 := english_gaps()
			return {"tip_vs_ink_px": g4[0], "max_step_px": g4[1]}
		"tv":
			var g5 := tv_gaps()
			return {"ir_arrive_vs_receiver_px": g5[0], "press_before_ir": g5[1], "change_after_ir": g5[2]}
		"games":
			var g6 := games_gaps()
			return {"feet_platform_at_landing_px": g6[0], "jump_min_above_platform_px": g6[1]}
		"recorder":
			var g7 := recorder_gaps()
			return {"note_spawn_vs_bell_px": g7[0], "last_note_gone_s": g7[1]}
		"camping":
			return {"note": "tent static, flame flickers in place, sparks born at fire"}
		"internet":
			return {"note": "page lights only after click; waves from router"}
	return {}
