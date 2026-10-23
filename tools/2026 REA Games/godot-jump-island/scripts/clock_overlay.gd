extends Control
## 在題目圖片上畫時鐘指針（對應 HWG5 網站的 clockSvg：座標在 1536x1024 的空間）。

var clock := {}
var image_size := Vector2(1536, 1024)

func _draw() -> void:
	if clock.is_empty():
		return
	var box := size
	var scale_f := minf(box.x / image_size.x, box.y / image_size.y)
	var shown := image_size * scale_f
	var off := (box - shown) / 2.0
	var kx := shown.x / 1536.0
	var ky := shown.y / 1024.0
	var parts: PackedStringArray = String(clock["time"]).split(":")
	var h := float(parts[0])
	var m := float(parts[1])
	var hour_deg := (fmod(h, 12.0) + m / 60.0) * 30.0
	var min_deg := m * 6.0
	var c := Vector2(float(clock["cx"]) * kx, float(clock["cy"]) * ky) + off
	var r := float(clock["r"])
	var hand := func(deg: float, length: float) -> Vector2:
		var rad := deg_to_rad(deg - 90.0)
		return Vector2(float(clock["cx"]) + cos(rad) * length, float(clock["cy"]) + sin(rad) * length) * Vector2(kx, ky) + off
	draw_line(c, hand.call(min_deg, r * 0.84), Color("2f6fd6"), 9.0 * (kx + ky) / 2.0, true)
	draw_line(c, hand.call(hour_deg, r * 0.46), Color("1f2440"), 24.0 * (kx + ky) / 2.0, true)
	draw_circle(c, 13.0 * (kx + ky) / 2.0, Color("c0392b"))
