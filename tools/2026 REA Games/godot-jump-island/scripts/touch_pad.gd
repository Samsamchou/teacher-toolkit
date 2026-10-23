extends Control
## iPad 觸控：左半邊任一處按下＝浮動搖桿；右下大圓＝JUMP（跳）、旁邊小圓＝LONG（跳遠）。
## 每根手指（index）分開記錄：放開其中一根不會清掉另一根（沿用 Forest of Words 觸控修補的教訓）。
## 只有失焦、暫停、開題目時才 reset() 全部清除。

const STICK_R := 100.0
const FULL_AT := 0.5               # 推到圓圈半徑的一半就算推到底（全速跑步）
const JUMP_R := 84.0
const LONG_R := 62.0

var stick := Vector2.ZERO          # -1..1，y 往下為正（往上推 = 前進）
var jump_held := false
var font: Font
var _stick_finger := -1
var _stick_base := Vector2.ZERO
var _stick_knob := Vector2.ZERO
var _jump_finger := -1
var _long_finger := -1
var _jump_pressed := false
var _long_pressed := false

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func jump_center() -> Vector2:
	return Vector2(size.x - 130, size.y - 130)

func long_center() -> Vector2:
	return Vector2(size.x - 300, size.y - 90)

func default_base() -> Vector2:
	return Vector2(170, size.y - 160)

## 取出「剛按下」事件（每格讀一次）
func take_jump() -> bool:
	var p := _jump_pressed
	_jump_pressed = false
	return p

func take_long() -> bool:
	var p := _long_pressed
	_long_pressed = false
	return p

func reset() -> void:
	_stick_finger = -1
	_jump_finger = -1
	_long_finger = -1
	stick = Vector2.ZERO
	jump_held = false
	_jump_pressed = false
	_long_pressed = false
	queue_redraw()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_VISIBILITY_CHANGED:
		reset()

func _input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event is InputEventScreenTouch:
		var p: Vector2 = event.position
		if event.pressed:
			if p.distance_to(jump_center()) < JUMP_R * 1.25 and _jump_finger == -1:
				_jump_finger = event.index
				jump_held = true
				_jump_pressed = true
			elif p.distance_to(long_center()) < LONG_R * 1.3 and _long_finger == -1:
				_long_finger = event.index
				_long_pressed = true
			elif p.x < size.x * 0.5 and p.y > size.y * 0.25 and _stick_finger == -1:
				_stick_finger = event.index
				_stick_base = p
				_stick_knob = p
				stick = Vector2.ZERO
			else:
				return
			get_viewport().set_input_as_handled()
		else:
			_release(event.index)
		queue_redraw()
	elif event is InputEventScreenDrag and event.index == _stick_finger:
		var d: Vector2 = event.position - _stick_base
		if d.length() > STICK_R:
			d = d.normalized() * STICK_R
		_stick_knob = _stick_base + d
		stick = d / (STICK_R * FULL_AT)
		if stick.length() > 1.0:
			stick = stick.normalized()
		if stick.length() < 0.2:
			stick = Vector2.ZERO
		get_viewport().set_input_as_handled()
		queue_redraw()

func _release(idx: int) -> void:
	if idx == _stick_finger:
		_stick_finger = -1
		stick = Vector2.ZERO
	if idx == _jump_finger:
		_jump_finger = -1
		jump_held = false
	if idx == _long_finger:
		_long_finger = -1

func _draw() -> void:
	var base := _stick_base if _stick_finger != -1 else default_base()
	var knob := _stick_knob if _stick_finger != -1 else base
	draw_circle(base, STICK_R, Color(1, 1, 1, 0.18))
	draw_arc(base, STICK_R, 0, TAU, 48, Color(1, 1, 1, 0.55), 4.0)
	draw_arc(base, STICK_R * FULL_AT, 0, TAU, 32, Color(1, 1, 1, 0.3), 2.0)   # 推到這圈＝全速跑
	draw_circle(knob, 46, Color(1, 1, 1, 0.6 if _stick_finger != -1 else 0.4))
	_button(jump_center(), JUMP_R, Color(0.35, 0.75, 1.0), "JUMP", "跳", _jump_finger != -1)
	_button(long_center(), LONG_R, Color(1.0, 0.7, 0.3), "LONG", "跳遠", _long_finger != -1)

func _button(c: Vector2, r: float, col: Color, en: String, zh: String, down: bool) -> void:
	draw_circle(c, r, Color(col.r, col.g, col.b, 0.75 if down else 0.45))
	draw_arc(c, r, 0, TAU, 48, Color(1, 1, 1, 0.8), 4.0)
	if font:
		var fs := 30 if r > 70 else 24
		var w := font.get_string_size(en, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(font, c + Vector2(-w / 2.0, -2), en, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color.WHITE)
		var w2 := font.get_string_size(zh, HORIZONTAL_ALIGNMENT_LEFT, -1, fs - 6).x
		draw_string(font, c + Vector2(-w2 / 2.0, fs - 2), zh, HORIZONTAL_ALIGNMENT_LEFT, -1, fs - 6, Color.WHITE)
