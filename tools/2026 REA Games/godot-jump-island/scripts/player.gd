extends CharacterBody3D
## Ken 的移動：走、跑、單跳、二段跳、三段跳、跳遠、踩敵人彈跳、被撞彈開。
##
## 手感數值參考公開文件記載的 Super Mario 64 移動參數（單位：遊戲單位／每格，30 格／秒），
## 依 Ken 身高 2.2 m 換算成公尺（1 單位 ≈ 0.0137 m）。程式是自己寫的，沒有使用任天堂的程式碼或素材。
##   跑步最高速 32 → 13.2 m/s；重力 4 → 49 m/s²（跳遠 2）；最大落速 75
##   單跳 42＋速度×0.25、二段跳 52＋速度×0.25、三段跳 69；跳遠 30、前進速度×1.5（上限 48）
## 小朋友用 iPad（2026-10-23 老師要求）：三段跳跑速門檻 20 → 12、連跳時間窗 0.35 秒、搖桿推一半就全速；
## 另有提前按（0.12 秒）與離地後仍可跳（0.1 秒）的寬限。
## 老師試玩後要調手感，改下面的常數即可。

signal jumped(kind: String)
signal landed(kind: String)

const U := 0.0137                  # 1 遊戲單位 = 0.0137 m
const V := U * 30.0                # 單位/格 → m/s
const A := U * 30.0 * 30.0         # 單位/格² → m/s²

const RUN_MAX := 32.0 * V
const ACCEL := 1.6 * A             # 起跑加速度
const DECEL := 2.6 * A             # 放開搖桿時的減速（比原作快停，小朋友比較好控制）
const SKID_DECEL := 3.5 * A        # 急轉身時的煞車
const TURN_RATE := 6.0             # 地面轉向速度（弧度／秒）
const GRAV := 4.0 * A
const GRAV_LONG := 2.0 * A
const TERMINAL := 75.0 * V
const JUMP1 := 42.0 * V
const JUMP2 := 52.0 * V
const JUMP3 := 69.0 * V
const JUMP_SPEED_BONUS := 0.25
const LONG_VY := 30.0 * V
const LONG_MUL := 1.5
const LONG_MAX := 48.0 * V
const LONG_MIN_SPEED := 3.0        # 跑速低於這個（m/s）按跳遠就變一般跳
const TRIPLE_MIN := 12.0 * V        # 三段跳需要的跑速（原作 20 → 調低成 12，約 4.9 m/s）
const COMBO_WINDOW := 0.35          # 落地後幾秒內再按算連跳（原作約 0.17 → 放寬）
const JUMP_BUFFER := 0.12
const COYOTE := 0.1
const JUMP_CUT := 0.5              # 上升中放開跳躍鍵 → 上升速度剩一半（短跳）
const CUT_AFTER := 0.08            # 起跳 0.08 秒後才算放開（點一下也有約 1.7 m）
const AIR_ACCEL := 1.5 * A
const AIR_ACCEL_LONG := 0.5 * A
const STOMP_VY := 35.0 * V

## 每格由 game.gd 寫入的輸入
var move := Vector3.ZERO           # 世界座標的移動方向（長度 0–1）
var jump_held := false
var frozen := false

var facing := 0.0                  # 面向（弧度，0 = +Z）
var fwd := 0.0                     # 地面前進速度
var kind := ""                     # 目前的跳法：""、"single"、"double"、"triple"、"long"、"bounce"、"knock"
var last_land_kind := ""
var since_land := 99.0
var since_floor := 0.0
var buf_jump := 0.0
var buf_long := 0.0
var cut_done := false
var air_t := 0.0
var ctrl_lock := 0.0
var invuln := 0.0
var was_floor := true

var visual: Node3D                 # 角色外觀（Ken 模型），只轉這個，不轉碰撞體
var anim: AnimationPlayer
var flip_t := -1.0                 # 三段跳翻滾進度

func _ready() -> void:
	floor_max_angle = deg_to_rad(46)
	floor_snap_length = 0.6
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.45
	cap.height = 2.1
	cs.shape = cap
	cs.position.y = 1.05
	add_child(cs)

func press_jump() -> void:
	buf_jump = JUMP_BUFFER

func press_long() -> void:
	buf_long = JUMP_BUFFER

func set_facing(y: float) -> void:
	facing = y
	if visual:
		visual.rotation.y = y

func forward() -> Vector3:
	return Vector3(sin(facing), 0, cos(facing))

## 踩到敵人或魔王頭：彈起來
func bounce() -> void:
	velocity.y = STOMP_VY
	kind = "bounce"
	cut_done = true

## 被敵人撞到或衝擊波打到：往外彈開，短暫不能操作、閃爍
func knock(from: Vector3, power := 8.0) -> void:
	if invuln > 0.0:
		return
	var d := global_position - from
	d.y = 0
	d = d.normalized() if d.length() > 0.01 else -forward()
	velocity = d * power + Vector3.UP * 9.0
	fwd = 0.0
	kind = "knock"
	ctrl_lock = 0.6
	invuln = 1.4

func reset_motion() -> void:
	velocity = Vector3.ZERO
	fwd = 0.0
	kind = ""
	ctrl_lock = 0.0
	buf_jump = 0.0
	buf_long = 0.0

func _physics_process(dt: float) -> void:
	if frozen:
		return
	buf_jump = maxf(0.0, buf_jump - dt)
	buf_long = maxf(0.0, buf_long - dt)
	ctrl_lock = maxf(0.0, ctrl_lock - dt)
	invuln = maxf(0.0, invuln - dt)
	var on_floor := is_on_floor()
	if on_floor:
		since_floor = 0.0
	else:
		since_floor += dt
	since_land += dt
	var input := move if ctrl_lock <= 0.0 else Vector3.ZERO
	var mag := clampf(input.length(), 0.0, 1.0)

	if on_floor and kind != "" and velocity.y <= 0.0:
		_on_landed()
	if on_floor or (since_floor < COYOTE and kind == ""):
		_ground(dt, input, mag)
		if buf_long > 0.0 and ctrl_lock <= 0.0:
			_start_jump(true)
		elif buf_jump > 0.0 and ctrl_lock <= 0.0:
			_start_jump(false)
	if not (on_floor and kind == ""):
		_air(dt, input, mag)
	was_floor = on_floor
	move_and_slide()
	# 撞牆：前進速度不超過實際速度太多（不會卡著累積速度），但保留餘裕讓 Ken 能沿著牆滑開，
	# 不會斜斜頂著牆就整個停住（2026-10-23 自動闖關在網頁版發現：頂著高柱 0.5 m/s 卡死）
	if is_on_floor() and kind == "" and is_on_wall():
		var real := get_real_velocity()
		real.y = 0
		fwd = minf(fwd, real.length() + 3.0)
	_visual(dt)

func _ground(dt: float, input: Vector3, mag: float) -> void:
	if mag > 0.05:
		var want := atan2(input.x, input.z)
		var diff := absf(angle_difference(facing, want))
		if fwd > 8.0 and diff > deg_to_rad(120):
			fwd = maxf(0.0, fwd - SKID_DECEL * dt)    # 急轉身：先煞車
			if fwd < 2.0:
				set_facing(want)
		else:
			var rate := TURN_RATE if fwd > 3.0 else 30.0
			set_facing(rotate_toward(facing, want, rate * dt))
			var target := RUN_MAX * mag
			if fwd < target:
				fwd = minf(target, fwd + ACCEL * dt * (1.0 - 0.45 * fwd / RUN_MAX))
			else:
				fwd = maxf(target, fwd - DECEL * dt)
	else:
		fwd = maxf(0.0, fwd - DECEL * dt)
	var f := forward()
	velocity.x = f.x * fwd
	velocity.z = f.z * fwd
	if kind == "" and is_on_floor():
		velocity.y = -2.0

func _start_jump(long_btn: bool) -> void:
	buf_jump = 0.0
	buf_long = 0.0
	cut_done = false
	air_t = 0.0
	var bonus := fwd * JUMP_SPEED_BONUS
	if long_btn and fwd >= LONG_MIN_SPEED:
		kind = "long"
		velocity.y = LONG_VY
		fwd = minf(fwd * LONG_MUL, LONG_MAX)
	elif since_land <= COMBO_WINDOW and last_land_kind == "double" and fwd >= TRIPLE_MIN:
		kind = "triple"
		velocity.y = JUMP3
		flip_t = 0.0
	elif since_land <= COMBO_WINDOW and last_land_kind == "single":
		kind = "double"
		velocity.y = JUMP2 + bonus
	else:
		kind = "single"
		velocity.y = JUMP1 + bonus
	var f := forward()
	velocity.x = f.x * fwd
	velocity.z = f.z * fwd
	since_floor = COYOTE
	jumped.emit(kind)

func _air(dt: float, input: Vector3, mag: float) -> void:
	var g := GRAV_LONG if kind == "long" else GRAV
	if kind == "" and since_floor >= COYOTE:
		kind = "fall"
	if (kind == "single" or kind == "double") and not jump_held and not cut_done and air_t >= CUT_AFTER and velocity.y > 20.0 * V:
		velocity.y *= JUMP_CUT
		cut_done = true
	air_t += dt
	velocity.y = maxf(-TERMINAL, velocity.y - g * dt)
	var hv := Vector3(velocity.x, 0, velocity.z)
	var cap := maxf(hv.length(), RUN_MAX * 0.75)
	if mag > 0.05:
		var acc := AIR_ACCEL_LONG if kind == "long" else AIR_ACCEL
		hv += input * acc * dt
		if hv.length() > cap:
			hv = hv.normalized() * cap
		if kind != "long" and kind != "knock":
			set_facing(rotate_toward(facing, atan2(input.x, input.z), 2.5 * dt))
	velocity.x = hv.x
	velocity.z = hv.z
	fwd = hv.length()

func _on_landed() -> void:
	var k := kind
	if k == "single" or k == "double":
		last_land_kind = k
	else:
		last_land_kind = ""          # 三段跳、跳遠、彈跳、被撞之後重新數
	since_land = 0.0
	kind = ""
	flip_t = -1.0
	if visual:
		visual.rotation.x = 0.0
	# 落地時保留朝面向的速度
	var hv := Vector3(velocity.x, 0, velocity.z)
	fwd = hv.dot(forward()) if hv.length() > 0.1 else 0.0
	fwd = clampf(fwd, 0.0, RUN_MAX)
	landed.emit(k)

func _visual(dt: float) -> void:
	if visual == null:
		return
	visual.visible = invuln <= 0.0 or int(invuln * 12.0) % 2 == 0
	# 三段跳：上升時往前翻一圈
	if kind == "triple" and flip_t >= 0.0:
		flip_t += dt
		visual.rotation.x = minf(1.0, flip_t / 0.55) * TAU
	elif kind == "long":
		visual.rotation.x = lerpf(visual.rotation.x, 0.45, minf(1.0, dt * 10.0))
	elif kind == "":
		visual.rotation.x = 0.0
	if anim:
		var moving := is_on_floor() and fwd > 0.6
		_play(moving)
		anim.speed_scale = clampf(fwd / 4.0, 0.9, 2.6) if moving else 1.0

func _play(walking: bool) -> void:
	var want := ""
	for nm in anim.get_animation_list():
		var low := String(nm).to_lower()
		if walking and "walk" in low:
			want = nm
		elif not walking and "idle" in low:
			want = nm
	if want != "" and anim.current_animation != want:
		anim.get_animation(want).loop_mode = Animation.LOOP_LINEAR
		anim.play(want, 0.2)
