extends HFlowContainer
## 字磚區：把答案格裡的字磚拖回來可以退回。

var quiz: Control = null

func _can_drop_data(_at: Vector2, data: Variant) -> bool:
	return quiz != null and quiz.can_edit() and typeof(data) == TYPE_DICTIONARY and data.has("from_slot")

func _drop_data(_at: Vector2, data: Variant) -> void:
	quiz.return_to_bank(data["from_slot"])
