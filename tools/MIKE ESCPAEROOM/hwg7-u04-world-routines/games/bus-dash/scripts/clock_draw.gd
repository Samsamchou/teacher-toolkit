class_name ClockDraw
## Procedural analog alarm clock. The hour hand moves proportionally with the minutes,
## so any time can be shown without images.

const OUT := Color(0.13, 0.15, 0.3)

static func parse(t: String) -> Vector2i:
	var p: PackedStringArray = t.split(":")
	return Vector2i(int(p[0]), int(p[1]))

static func _hand(ci: CanvasItem, c: Vector2, ang: float, length: float, width: float, col: Color) -> void:
	var d := Vector2(sin(ang), -cos(ang))
	var a := c - d * length * 0.16
	var b := c + d * length
	ci.draw_line(a, b, col, width, true)
	ci.draw_circle(a, width * 0.5, col)
	ci.draw_circle(b, width * 0.5, col)

static func draw(ci: CanvasItem, c: Vector2, r: float, hour: int, minute: int, rim: Color, font: Font, mark: int = 0) -> void:
	# bells and feet
	for sx: float in [-1.0, 1.0]:
		ci.draw_line(c + Vector2(sx * r * 0.5, r * 0.75), c + Vector2(sx * r * 0.78, r * 1.06), OUT, r * 0.16, true)
		ci.draw_circle(c + Vector2(sx * r * 0.78, r * 1.06), r * 0.08, OUT)
		ci.draw_circle(c + Vector2(sx * r * 0.6, -r * 0.84), r * 0.27, OUT)
		ci.draw_circle(c + Vector2(sx * r * 0.6, -r * 0.84), r * 0.21, rim.lightened(0.25))
	ci.draw_circle(c + Vector2(0, -r * 1.06), r * 0.1, OUT)
	# body
	ci.draw_circle(c, r, OUT)
	ci.draw_circle(c, r * 0.95, rim)
	ci.draw_circle(c, r * 0.845, OUT)
	ci.draw_circle(c, r * 0.815, Color(1, 1, 0.98))
	# minute ticks
	for i in 60:
		var ang := TAU * i / 60.0
		var d := Vector2(sin(ang), -cos(ang))
		if i % 5 == 0:
			ci.draw_line(c + d * r * 0.735, c + d * r * 0.8, OUT, r * 0.03, true)
		else:
			ci.draw_line(c + d * r * 0.765, c + d * r * 0.8, Color(0.5, 0.52, 0.62), r * 0.014, true)
	# numbers 1-12
	var fs := int(r * 0.2)
	for n in range(1, 13):
		var ang := TAU * n / 12.0
		var p := c + Vector2(sin(ang), -cos(ang)) * r * 0.6
		var s := str(n)
		var sz := font.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs)
		var base := Vector2(p.x - sz.x * 0.5, p.y + (font.get_ascent(fs) - font.get_descent(fs)) * 0.5)
		ci.draw_string(font, base, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, OUT)
	# hands
	var m_ang := TAU * minute / 60.0
	var h_ang := TAU * (float(hour % 12) + minute / 60.0) / 12.0
	_hand(ci, c, h_ang, r * 0.36, r * 0.085, OUT)
	_hand(ci, c, m_ang, r * 0.56, r * 0.05, Color(0.9, 0.16, 0.2))
	ci.draw_circle(c, r * 0.07, OUT)
	ci.draw_circle(c, r * 0.035, Color(1, 0.85, 0.2))
	# result mark
	if mark == 1:
		ci.draw_arc(c, r * 1.08, 0, TAU, 64, Color(0.15, 0.8, 0.3), r * 0.12, true)
	elif mark == 2:
		ci.draw_arc(c, r * 1.08, 0, TAU, 64, Color(0.92, 0.2, 0.2), r * 0.12, true)
