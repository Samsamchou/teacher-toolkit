extends Control
## 地點答題畫面：拼字題（字母磚）＋拖放題（單字／句子磚）。
## 規則沿用 HWG5 站台 rules.js：答對品質 = max(1, 5 - 嘗試次數)；答錯一次出提示 1、兩次以上出提示 2；
## 答對後要聽過 Tick 的語音回饋才能按「下一題」。

signal finished(loc_id: String, summary: Dictionary)
signal closed
signal turn_done(is_last: bool)
signal answered(correct: bool)

const QuizTile := preload("res://scripts/quiz_tile.gd")
const QuizSlot := preload("res://scripts/quiz_slot.gd")
const QuizBank := preload("res://scripts/quiz_bank.gd")
const ClockOverlay := preload("res://scripts/clock_overlay.gd")
const SAVE_PATH := "user://hwg5_results.json"
const Host := preload("res://scripts/host.gd")
const INK := Color("2a2a3c")

var font: Font
var font_bold: Font
var hud := ""
var items_by_id := {}
var week_order: Array = []
var week_labels := {}
var plan := {}
var results := {}
var test_mode := false

var loc_id := ""
var loc_zh := ""
var queue: Array = []
var qi := 0
var item := {}
var tiles: Array = []          # [{id, text}]
var slots: Array = []          # slot index -> tile id or ""
var slot_buttons: Array = []
var tile_buttons := {}         # tile id -> QuizTile
var attempts := 0
var wrong := 0
var hint_used := false
var heard := false
var solved := false

var panel: PanelContainer
var dim: ColorRect
var header_label: Label
var body: VBoxContainer
var footer: VBoxContainer
var audio: AudioStreamPlayer

var bank: Node = null          # scripts/bank.gd：題目與素材都從任務資料夾讀進來

func setup(f: Font, fb: Font, p_test: bool, p_bank: Node) -> void:
	bank = p_bank
	font = f
	font_bold = fb
	test_mode = p_test
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	visible = false
	var q: Dictionary = bank.data
	for it in q["items"]:
		items_by_id[it["id"]] = it
	week_order = q.get("weekStripOrder", ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
	week_labels = q.get("weekStripLabels", {})
	plan = q["locations"]
	_load_results()
	dim = ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	panel = PanelContainer.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.offset_left = 36
	panel.offset_right = -36
	panel.offset_top = 10
	panel.offset_bottom = -80
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("fff6e5")
	sb.set_corner_radius_all(20)
	sb.set_content_margin_all(18)
	panel.add_theme_stylebox_override("panel", sb)
	add_child(panel)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 8)
	panel.add_child(outer)
	var head := HBoxContainer.new()
	outer.add_child(head)
	header_label = _label("", 28, true)
	header_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(header_label)
	var close := _button("離開", 22)
	close.pressed.connect(_on_close)
	head.add_child(close)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	outer.add_child(scroll)
	body = VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 12)
	scroll.add_child(body)
	footer = VBoxContainer.new()
	footer.add_theme_constant_override("separation", 8)
	outer.add_child(footer)
	audio = AudioStreamPlayer.new()
	audio.finished.connect(_on_audio_finished)
	add_child(audio)

# ---------- 小工具 ----------
func _label(t: String, size: int, bold := false) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_override("font", font_bold if bold else font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", INK)
	return l

func _button(t: String, size: int) -> Button:
	var b := Button.new()
	b.text = t
	b.add_theme_font_override("font", font)
	b.add_theme_font_size_override("font_size", size)
	return b

func _style(bg: Color, border: Color, radius := 12) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(3)
	s.set_corner_radius_all(radius)
	s.set_content_margin_all(8)
	return s

func _skin(b: Button, bg: Color, border: Color, font_color := INK) -> void:
	for st in ["normal", "hover", "pressed", "disabled", "focus"]:
		b.add_theme_stylebox_override(st, _style(bg, border))
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_disabled_color", "font_focus_color"]:
		b.add_theme_color_override(c, font_color)

# ---------- 存檔 ----------
func _load_results() -> void:
	if Host.on_web():
		var init := Host.initial()
		if typeof(init.get("results")) == TYPE_DICTIONARY:
			results = init["results"]
		return
	if FileAccess.file_exists(SAVE_PATH):
		var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
		if typeof(d) == TYPE_DICTIONARY:
			results = d

func _save_results() -> void:
	if Host.on_web():
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(results))

func reset_results() -> void:
	results = {}
	_save_results()

func has_plan(id: String) -> bool:
	return plan.has(id)

func remaining(id: String) -> int:
	var n := 0
	for q in plan.get(id, []):
		if not results.get(q, {}).get("finalCorrect", false):
			n += 1
	return n

# ---------- 流程 ----------
func start(id: String, zh: String) -> void:
	loc_id = id
	loc_zh = zh
	queue = plan[id]
	qi = 0
	for i in queue.size():
		if not results.get(queue[i], {}).get("finalCorrect", false):
			qi = i
			break
		qi = queue.size()
	visible = true
	if qi >= queue.size():
		_show_summary()
	else:
		_show_item()

func _on_close() -> void:
	audio.stop()
	visible = false
	closed.emit()

func can_edit() -> bool:
	return visible and not solved

func slot_tile(i: int) -> String:
	return slots[i] if i < slots.size() else ""

func _clear_body() -> void:
	for c in body.get_children():
		body.remove_child(c)
		c.queue_free()
	for c in footer.get_children():
		footer.remove_child(c)
		c.queue_free()

func _show_item() -> void:
	audio.stop()
	_clear_body()
	item = items_by_id[queue[qi]]
	attempts = 0
	wrong = 0
	hint_used = false
	heard = false
	solved = false
	_update_header()
	if item["type"] == "listen":
		tiles = []
		slots = []
		slot_buttons = []
		tile_buttons = {}
		listen_choice = -1
		_build_listen_body()
		_build_footer()
		_play_item_audio()
		return
	if item["weekStrip"] != null:
		body.add_child(_week_strip(item["weekStrip"]))
	body.add_child(_picture())
	# 字磚
	var texts: Array = []
	if item["type"] == "spell":
		for ch in String(item["spell"]["answer"]).replace(" ", ""):
			texts.append(ch)
		for ch in String(item["spell"]["distractorLetters"]):
			texts.append(ch)
	else:
		for b in item["blanks"]:
			texts.append(b["answer"])
		for d in item["distractors"]:
			texts.append(d)
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(item["id"])
	for i in range(texts.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = texts[i]
		texts[i] = texts[j]
		texts[j] = tmp
	tiles = []
	for i in texts.size():
		tiles.append({"id": "t%d" % i, "text": texts[i]})
	slot_buttons = []
	tile_buttons = {}
	var n_slots := _slot_count()
	slots = []
	for i in n_slots:
		slots.append("")
	# 題目句子
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	body.add_child(box)
	for line in item["lines"]:
		box.add_child(_line_row(line["speaker"], line["text"]))
	if item["type"] == "spell":
		box.add_child(_spell_row())
	# 字磚區
	var bank := QuizBank.new()
	bank.quiz = self
	bank.alignment = FlowContainer.ALIGNMENT_CENTER
	bank.add_theme_constant_override("h_separation", 10)
	bank.add_theme_constant_override("v_separation", 10)
	bank.custom_minimum_size = Vector2(0, 70)
	body.add_child(bank)
	for t in tiles:
		var tb := QuizTile.new()
		tb.quiz = self
		tb.tile_id = t["id"]
		tb.text = t["text"]
		tb.add_theme_font_override("font", font)
		tb.add_theme_font_size_override("font_size", 30 if item["type"] == "spell" else 26)
		_skin(tb, Color("ffd86b"), Color("c99a1a"))
		tb.custom_minimum_size = Vector2(60 if item["type"] == "spell" else 90, 60)
		tb.pressed.connect(_on_tile_pressed.bind(t["id"]))
		bank.add_child(tb)
		tile_buttons[t["id"]] = tb
	_build_footer()

## 提示、檢查答案、重來、答對回饋（拼字、拖放、聽力共用）。
func _build_footer() -> void:
	hint_label = _label("", 24)
	hint_label.add_theme_color_override("font_color", Color("c0561a"))
	hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	footer.add_child(hint_label)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	footer.add_child(row)
	check_btn = _button("檢查答案", 26)
	_skin(check_btn, Color("6fc276"), Color("3d8b44"), Color.WHITE)
	check_btn.disabled = true
	check_btn.pressed.connect(_on_check)
	row.add_child(check_btn)
	reset_btn = _button("重來", 22)
	reset_btn.pressed.connect(_on_reset)
	row.add_child(reset_btn)
	feedback_box = VBoxContainer.new()
	feedback_box.visible = false
	footer.add_child(feedback_box)
	_refresh()

var hint_label: Label
var check_btn: Button
var reset_btn: Button
var feedback_box: VBoxContainer
var next_btn: Button
var play_btn: Button
var listen_choice := -1
var option_buttons: Array = []

## 聽力題：上方播放鍵，下方 3 個選項（圖片或文字），點選後按「檢查答案」。
func _build_listen_body() -> void:
	var top := HBoxContainer.new()
	top.alignment = BoxContainer.ALIGNMENT_CENTER
	top.add_theme_constant_override("separation", 18)
	body.add_child(top)
	top.add_child(_label("Listen and choose.  聽音檔，選出正確答案。", 28, true))
	var pb := _button("▶ Listen 播放", 28)
	_skin(pb, Color("cfe3ff"), Color("2f6fd6"))
	pb.custom_minimum_size = Vector2(230, 66)
	pb.pressed.connect(_play_item_audio)
	top.add_child(pb)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 20)
	body.add_child(row)
	option_buttons = []
	for i in item["options"].size():
		var opt: Dictionary = item["options"][i]
		var b := Button.new()
		b.add_theme_font_override("font", font)
		b.add_theme_font_size_override("font_size", 30)
		if opt.has("image"):
			b.icon = bank.tex(opt["image"])
			b.expand_icon = true
			b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
			b.custom_minimum_size = Vector2(240, 240)
		else:
			b.text = opt["text"]
			b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			b.custom_minimum_size = Vector2(270, 120)
		b.pressed.connect(_on_option.bind(i))
		row.add_child(b)
		option_buttons.append(b)

func _on_option(i: int) -> void:
	if solved:
		return
	listen_choice = i
	_refresh()

func _play_item_audio() -> void:
	var stream = bank.stream(item.get("audio", ""))
	if stream != null:
		audio.stream = stream
		audio.play()

func _slot_count() -> int:
	if item["type"] == "spell":
		return String(item["spell"]["answer"]).replace(" ", "").length()
	return item["blanks"].size()

func _week_strip(ws: Dictionary) -> Control:
	var hb := HBoxContainer.new()
	hb.alignment = BoxContainer.ALIGNMENT_CENTER
	hb.add_theme_constant_override("separation", 8)
	for d in week_order:
		var on: bool = d == ws["highlight"]
		var zh = ws.get("zhLabel")
		var l := _label(String(zh) if (on and zh != null and String(zh) != "") else String(week_labels[d]), 22, on)
		l.custom_minimum_size = Vector2(86, 38)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		var pc := PanelContainer.new()
		var s := _style(Color("ffd447") if on else Color("f1e7d2"), Color("c99a1a") if on else Color("d8c9a5"), 10)
		s.set_content_margin_all(4)
		pc.add_theme_stylebox_override("panel", s)
		pc.add_child(l)
		hb.add_child(pc)
	return hb

func _picture() -> Control:
	var holder := Control.new()
	holder.custom_minimum_size = Vector2(0, 78)
	holder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var tex: Texture2D = bank.tex(item.get("image", ""))
	if tex == null:
		holder.custom_minimum_size = Vector2(0, 0)
		return holder
	var tr := TextureRect.new()
	tr.texture = tex
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tr.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	holder.add_child(tr)
	if item["clock"] != null:
		var co := ClockOverlay.new()
		co.clock = item["clock"]
		co.image_size = tex.get_size()
		co.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		holder.add_child(co)
	return holder

func _line_row(speaker: String, text: String) -> Control:
	var fl := HFlowContainer.new()
	fl.add_theme_constant_override("h_separation", 8)
	fl.add_theme_constant_override("v_separation", 8)
	var sp := _label(speaker + ":", 28, true)
	sp.add_theme_color_override("font_color", Color("2f6fd6") if speaker == "Tick" else Color("c0561a"))
	fl.add_child(sp)
	var rx := RegEx.new()
	rx.compile("\\{(\\d)\\}")
	var pos := 0
	for m in rx.search_all(text):
		_add_words(fl, text.substr(pos, m.get_start() - pos))
		fl.add_child(_make_slot(int(m.get_string(1)) - 1))
		pos = m.get_end()
	_add_words(fl, text.substr(pos))
	return fl

func _add_words(fl: Control, t: String) -> void:
	for w in t.strip_edges().split(" ", false):
		fl.add_child(_label(w, 30))

func _slot_width() -> float:
	var longest := 1
	for t in tiles:
		longest = maxi(longest, String(t["text"]).length())
	return maxf(100.0, longest * 17.0 + 36.0)

func _make_slot(idx: int) -> Button:
	var b := QuizSlot.new()
	b.quiz = self
	b.slot_index = idx
	b.add_theme_font_override("font", font)
	b.add_theme_font_size_override("font_size", 28)
	b.custom_minimum_size = Vector2(_slot_width() if item["type"] == "drag" else 56, 58)
	b.pressed.connect(_on_slot_pressed.bind(idx))
	while slot_buttons.size() <= idx:
		slot_buttons.append(null)
	slot_buttons[idx] = b
	return b

func _spell_row() -> Control:
	var groups: Array = item["spell"].get("groups", [slots.size()])
	var fl := HFlowContainer.new()
	fl.alignment = FlowContainer.ALIGNMENT_CENTER
	fl.add_theme_constant_override("h_separation", 26)
	fl.add_theme_constant_override("v_separation", 10)
	var idx := 0
	for g in groups:
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 6)
		for k in int(g):
			hb.add_child(_make_slot(idx))
			idx += 1
		fl.add_child(hb)
	return fl

# ---------- 互動 ----------
func _tile_text(tid: String) -> String:
	for t in tiles:
		if t["id"] == tid:
			return t["text"]
	return ""

func _on_tile_pressed(tid: String) -> void:
	if solved or slots.has(tid):
		return
	var i := slots.find("")
	if i >= 0:
		slots[i] = tid
		_refresh()

func _on_slot_pressed(idx: int) -> void:
	if solved:
		return
	if slots[idx] != "":
		slots[idx] = ""
		_refresh()

func drop_on_slot(idx: int, data: Dictionary) -> void:
	var tid: String = data["tile_id"]
	var prev: String = slots[idx]
	if data.has("from_slot"):
		var from: int = data["from_slot"]
		slots[from] = prev        # 交換
		slots[idx] = tid
	else:
		for i in slots.size():
			if slots[i] == tid:
				slots[i] = ""
		slots[idx] = tid
	_refresh()

func return_to_bank(from_slot: int) -> void:
	slots[from_slot] = ""
	_refresh()

func _on_reset() -> void:
	if solved:
		return
	for i in slots.size():
		slots[i] = ""
	listen_choice = -1
	_refresh()

func _refresh() -> void:
	if item.get("type", "") == "listen":
		for i in option_buttons.size():
			var ob: Button = option_buttons[i]
			if solved and i == int(item["answer"]):
				_skin(ob, Color("b9eebd"), Color("3d8b44"))
			elif i == listen_choice:
				_skin(ob, Color("cfe3ff"), Color("2f6fd6"))
			else:
				_skin(ob, Color("ffffff"), Color("9aa3b5"))
			ob.disabled = solved
		check_btn.disabled = solved or listen_choice < 0
		return
	for tid in tile_buttons:
		var placed: bool = slots.has(tid)
		var tb: Button = tile_buttons[tid]
		tb.modulate = Color(1, 1, 1, 0.0) if placed else Color.WHITE
		tb.disabled = placed or solved
	for i in slot_buttons.size():
		var b: Button = slot_buttons[i]
		if b == null:
			continue
		var tid: String = slots[i]
		b.text = _tile_text(tid) if tid != "" else ""
		if solved:
			_skin(b, Color("b9eebd"), Color("3d8b44"))
		elif tid != "":
			_skin(b, Color("cfe3ff"), Color("2f6fd6"))
		else:
			_skin(b, Color("ffffff"), Color("9aa3b5"))
	check_btn.disabled = solved or slots.has("")

func _grade() -> bool:
	if item["type"] == "listen":
		return listen_choice == int(item["answer"])
	if item["type"] == "spell":
		var s := ""
		for tid in slots:
			s += _tile_text(tid)
		return s == String(item["spell"]["answer"]).replace(" ", "")
	for i in item["blanks"].size():
		if _tile_text(slots[i]) != item["blanks"][i]["answer"]:
			return false
	return true

func _on_check() -> void:
	if solved or slots.has("") or (item["type"] == "listen" and listen_choice < 0):
		return
	attempts += 1
	var ok := _grade()
	answered.emit(ok)
	if ok:
		_on_correct()
	else:
		wrong += 1
		hint_used = true
		results[item["id"]] = {"attempts": attempts, "wrong": wrong, "firstTry": false,
			"hintUsed": true, "quality": 0, "finalCorrect": false}
		_save_results()
		Host.report({"type": "item", "id": item["id"], "result": results[item["id"]]})
		hint_label.text = "提示：" + (item["hint1En"] if wrong == 1 else item["hint2En"])
		var tw := create_tween()
		var base := panel.position
		for k in 3:
			tw.tween_property(panel, "position", base + Vector2(10, 0), 0.04)
			tw.tween_property(panel, "position", base - Vector2(10, 0), 0.04)
		tw.tween_property(panel, "position", base, 0.04)
		for i in slots.size():
			slots[i] = ""
		listen_choice = -1
		_refresh()

func _on_correct() -> void:
	solved = true
	var quality := maxi(1, 5 - attempts)
	results[item["id"]] = {
		"attempts": attempts, "wrong": wrong, "firstTry": attempts == 1,
		"hintUsed": hint_used, "quality": quality, "finalCorrect": true,
	}
	_save_results()
	Host.report({"type": "item", "id": item["id"], "result": results[item["id"]]})
	hint_label.text = ""
	check_btn.visible = false
	reset_btn.visible = false
	_refresh()
	for c in feedback_box.get_children():
		c.queue_free()
	var stars := "★".repeat(quality) + "☆".repeat(4 - quality)
	feedback_box.add_child(_label("答對了！  %s" % stars, 28, true))
	var fb := _label(item["correctEn"], 30)
	fb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	feedback_box.add_child(fb)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	feedback_box.add_child(row)
	var is_listen: bool = item["type"] == "listen"
	play_btn = _button("再聽一次 Listen again" if is_listen else "聽 Tick 說", 26)
	_skin(play_btn, Color("cfe3ff"), Color("2f6fd6"))
	play_btn.pressed.connect(_play_feedback)
	row.add_child(play_btn)
	next_btn = _button("下一題" if qi + 1 < queue.size() else "完成", 26)
	_skin(next_btn, Color("6fc276"), Color("3d8b44"), Color.WHITE)
	next_btn.disabled = not (test_mode or is_listen)
	next_btn.pressed.connect(_on_next)
	row.add_child(next_btn)
	if not test_mode and not is_listen:
		var tip := _label("按「聽 Tick 說」聽完之後，才能按下一步。", 20)
		feedback_box.add_child(tip)
	feedback_box.visible = true
	if test_mode:
		heard = true

func _play_feedback() -> void:
	var stream = bank.stream(item.get("audio", ""))
	if stream == null:
		heard = true
		next_btn.disabled = false
		return
	audio.stream = stream
	audio.play()
	play_btn.disabled = true

func _on_audio_finished() -> void:
	heard = true
	if play_btn != null and is_instance_valid(play_btn):
		play_btn.disabled = false
	if next_btn != null and is_instance_valid(next_btn):
		next_btn.disabled = false

## 第一人稱戰鬥時：題目面板只佔畫面下半部，上半部看得到怪物。
func set_battle_layout(on: bool) -> void:
	dim.color = Color(0, 0, 0, 0.0 if on else 0.55)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE if on else Control.MOUSE_FILTER_STOP
	mouse_filter = Control.MOUSE_FILTER_IGNORE if on else Control.MOUSE_FILTER_STOP
	panel.offset_top = 178.0 if on else 10.0
	panel.offset_bottom = -10.0 if on else -80.0
	var sb := panel.get_theme_stylebox("panel") as StyleBoxFlat
	sb.bg_color = Color(1.0, 0.965, 0.9, 0.86 if on else 1.0)

func set_hud(t: String) -> void:
	hud = t
	if visible and not solved:
		_update_header()

func _update_header() -> void:
	header_label.text = "%s　第 %d / %d 題　%s" % [loc_zh, qi + 1, queue.size(), hud]

func _on_next() -> void:
	audio.stop()
	if turn_done.get_connections().size() > 0:
		visible = false
		turn_done.emit(qi + 1 >= queue.size())
	else:
		resume()

## 打怪動畫結束後由 world 呼叫：顯示下一題或完成畫面。
func resume() -> void:
	qi += 1
	visible = true
	if qi < queue.size():
		_show_item()
	else:
		_show_summary()

func _show_summary() -> void:
	audio.stop()
	_clear_body()
	solved = true
	header_label.text = "%s　任務完成" % loc_zh
	var total := 0
	var first := 0
	var sum_q := 0
	for id in queue:
		var r: Dictionary = results.get(id, {})
		total += 1
		if r.get("firstTry", false):
			first += 1
		sum_q += int(r.get("quality", 1))
	var avg := int(round(float(sum_q) / maxf(1.0, total)))
	body.add_child(_label("全部 %d 題都答對了！" % total, 34, true))
	body.add_child(_label("一次就答對：%d 題　　平均星星：%s" % [first, "★".repeat(avg) + "☆".repeat(4 - avg)], 28))
	for id in queue:
		var it: Dictionary = items_by_id[id]
		var r2: Dictionary = results.get(id, {})
		var q := int(r2.get("quality", 1))
		body.add_child(_label("%s　%s　%s" % [id, it["correctEn"], "★".repeat(q) + "☆".repeat(4 - q)], 24))
	body.add_child(_label("怪物全部被打倒了！ All monsters defeated!", 28, true))
	var go := _button("完成這個地點", 28)
	_skin(go, Color("6fc276"), Color("3d8b44"), Color.WHITE)
	go.pressed.connect(func():
		visible = false
		finished.emit(loc_id, {"total": total, "firstTry": first, "avgQuality": avg}))
	body.add_child(go)

# ---------- 自動測試用 ----------
func debug_fill(correct: bool) -> void:
	if item["type"] == "listen":
		var a := int(item["answer"])
		listen_choice = a if correct else (a + 1) % item["options"].size()
		_refresh()
		return
	var answer: Array = []
	if item["type"] == "spell":
		for ch in String(item["spell"]["answer"]).replace(" ", ""):
			answer.append(ch)
	else:
		for b in item["blanks"]:
			answer.append(b["answer"])
	if not correct:
		answer.reverse()
		if answer.size() == 1:
			answer = [String(tiles[0]["text"]) if tiles[0]["text"] != answer[0] else String(tiles[1]["text"])]
	var used := {}
	for i in answer.size():
		for t in tiles:
			if t["text"] == answer[i] and not used.has(t["id"]):
				used[t["id"]] = true
				slots[i] = t["id"]
				break
	_refresh()

func debug_check() -> void:
	_on_check()

func debug_next() -> void:
	_on_next()
