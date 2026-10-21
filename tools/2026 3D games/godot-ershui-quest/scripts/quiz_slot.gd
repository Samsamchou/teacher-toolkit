extends Button
## 答案格：可放入字磚；已放入時可點擊退回，也可拖到別格或字磚區。

var slot_index := 0
var quiz: Control = null

func _can_drop_data(_at: Vector2, data: Variant) -> bool:
	return quiz != null and quiz.can_edit() and typeof(data) == TYPE_DICTIONARY and data.has("tile_id")

func _drop_data(_at: Vector2, data: Variant) -> void:
	quiz.drop_on_slot(slot_index, data)

func _get_drag_data(_at: Vector2) -> Variant:
	if quiz == null or not quiz.can_edit():
		return null
	var tid: String = quiz.slot_tile(slot_index)
	if tid == "":
		return null
	var prev := Button.new()
	prev.text = text
	prev.add_theme_font_override("font", get_theme_font("font"))
	prev.add_theme_font_size_override("font_size", get_theme_font_size("font_size"))
	prev.custom_minimum_size = size
	set_drag_preview(prev)
	return {"tile_id": tid, "from_slot": slot_index}
