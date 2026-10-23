extends Button
## 可點擊、可拖曳的字磚（拼字的字母、拖放題的單字／句子）。

var tile_id := ""
var quiz: Control = null

func _get_drag_data(_at: Vector2) -> Variant:
	if disabled or quiz == null or not quiz.can_edit():
		return null
	var prev := Button.new()
	prev.text = text
	prev.add_theme_font_override("font", get_theme_font("font"))
	prev.add_theme_font_size_override("font_size", get_theme_font_size("font_size"))
	prev.custom_minimum_size = size
	set_drag_preview(prev)
	return {"tile_id": tile_id}
