extends Node
## 任務題庫：遊戲本身不帶題目。開場時從「任務資料夾/bank/」讀 bank.json，
## 再把題目圖片、語音、聽力音檔、中文字型下載下來。同一份遊戲檔可以給不同年級的任務共用。
##
## 題庫位置：
## - 網頁版：網頁外框 window.parent.ershuiHost.getInitial().bankBase（完整網址，結尾有 /）
## - 電腦測試：命令列 --bank=<資料夾>（例如 site/public/ershui-3d-quest/bank）
## bank.json 格式見 tools/BANK-FORMAT.md。

signal progress(done: int, total: int)

var base := ""                # 網址或本機資料夾，結尾有 /
var web := false
var data := {}                # bank.json 內容
var textures := {}            # 相對路徑 → Texture2D
var streams := {}             # 相對路徑 → AudioStream
var font_regular: FontFile = null
var font_bold: FontFile = null
var error := ""
const PARALLEL := 6

func _ready() -> void:
	pass

## 決定題庫位置：網頁版由外框提供；電腦上用 --bank=
func resolve_base(host_init: Dictionary) -> void:
	web = OS.has_feature("web")
	if web:
		base = String(host_init.get("bankBase", ""))
	else:
		for a in OS.get_cmdline_user_args():
			if a.begins_with("--bank="):
				base = a.substr(7)
		if base != "" and not base.ends_with("/"):
			base += "/"

## 讀 bank.json 與所有素材。成功回傳 true；失敗時 error 有原因。
func load_all() -> bool:
	if base == "":
		error = "找不到題庫位置（bankBase）。"
		return false
	var raw := await _get_bytes("bank.json")
	if raw.is_empty():
		error = "讀不到題庫 bank.json：%s" % (base + "bank.json")
		return false
	var parsed = JSON.parse_string(raw.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("items") or not parsed.has("locations"):
		error = "題庫 bank.json 格式不正確。"
		return false
	data = parsed
	var tex_paths: Array = []
	var snd_paths: Array = []
	for it in data["items"]:
		if String(it.get("image", "")) != "":
			tex_paths.append(it["image"])
		if String(it.get("audio", "")) != "":
			snd_paths.append(it["audio"])
		for o in it.get("options", []):
			if o.has("image"):
				tex_paths.append(o["image"])
	var jobs: Array = []
	for p in _unique(tex_paths):
		jobs.append(["tex", p])
	for p in _unique(snd_paths):
		jobs.append(["snd", p])
	var fonts: Dictionary = data.get("fonts", {})
	if fonts.has("regular"):
		jobs.append(["font_r", fonts["regular"]])
	if fonts.has("bold"):
		jobs.append(["font_b", fonts["bold"]])
	var total := jobs.size()
	var done := 0
	var failed: Array = []
	var i := 0
	while i < jobs.size():
		var batch := jobs.slice(i, i + PARALLEL)
		var results: Array = []
		results.resize(batch.size())
		var pending := [batch.size()]
		for k in batch.size():
			_fetch_job(batch[k], results, k, pending)
		while pending[0] > 0:
			await get_tree().process_frame
		for k in batch.size():
			if not results[k]:
				failed.append(batch[k][1])
		done += batch.size()
		progress.emit(done, total)
		i += PARALLEL
	if not failed.is_empty():
		error = "有 %d 個檔案讀不到，例如：%s" % [failed.size(), failed[0]]
		return false
	return true

func _fetch_job(job: Array, results: Array, k: int, pending: Array) -> void:
	var kind: String = job[0]
	var path: String = job[1]
	var bytes := await _get_bytes(path)
	var ok := not bytes.is_empty()
	if ok:
		match kind:
			"tex":
				var t := _to_texture(path, bytes)
				ok = t != null
				if ok:
					textures[path] = t
			"snd":
				var s := _to_stream(path, bytes)
				ok = s != null
				if ok:
					streams[path] = s
			"font_r":
				font_regular = FontFile.new()
				font_regular.data = bytes
			"font_b":
				font_bold = FontFile.new()
				font_bold.data = bytes
	results[k] = ok
	pending[0] -= 1

func _get_bytes(path: String) -> PackedByteArray:
	if not web:
		var full := base + path
		if not FileAccess.file_exists(full):
			return PackedByteArray()
		return FileAccess.get_file_as_bytes(full)
	var req := HTTPRequest.new()
	add_child(req)
	var err := req.request(base + path)
	if err != OK:
		req.queue_free()
		return PackedByteArray()
	var res: Array = await req.request_completed
	req.queue_free()
	if int(res[0]) != HTTPRequest.RESULT_SUCCESS or int(res[1]) != 200:
		return PackedByteArray()
	return res[3]

func _to_texture(path: String, bytes: PackedByteArray) -> Texture2D:
	var img := Image.new()
	var low := path.to_lower()
	var err := ERR_FILE_UNRECOGNIZED
	if low.ends_with(".webp"):
		err = img.load_webp_from_buffer(bytes)
	elif low.ends_with(".png"):
		err = img.load_png_from_buffer(bytes)
	elif low.ends_with(".jpg") or low.ends_with(".jpeg"):
		err = img.load_jpg_from_buffer(bytes)
	if err != OK:
		return null
	return ImageTexture.create_from_image(img)

func _to_stream(path: String, bytes: PackedByteArray) -> AudioStream:
	var low := path.to_lower()
	if low.ends_with(".mp3"):
		var s := AudioStreamMP3.new()
		s.data = bytes
		return s
	if low.ends_with(".ogg"):
		return AudioStreamOggVorbis.load_from_buffer(bytes)
	return null

func _unique(arr: Array) -> Array:
	var seen := {}
	var out: Array = []
	for a in arr:
		if not seen.has(a):
			seen[a] = true
			out.append(a)
	return out

func tex(path: String) -> Texture2D:
	return textures.get(path)

func stream(path: String) -> AudioStream:
	return streams.get(path)
