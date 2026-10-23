extends Node
## 任務題庫：遊戲本身不帶題目。開場時從「任務資料夾/bank/」讀 bank.json，
## 再下載 bank.pak（所有插圖、語音、聽力音檔、中文字型合成的一個檔）。
## 同一份遊戲檔可以給不同年級的任務共用。
##
## 題庫位置：
## - 網頁版：網頁外框 window.parent.ershuiHost.getInitial().bankBase（完整網址，結尾有 /）
## - 電腦測試：命令列 --bank=<資料夾>（例如 site/public/ershui-3d-quest/bank）
## bank.json／bank.pak 格式見 tools/BANK-FORMAT.md。

signal progress(done: int, total: int)   # 0–100（下載佔 0–90，解開素材佔 90–100）

var base := ""                # 網址或本機資料夾，結尾有 /
var web := false
var data := {}                # bank.json 內容
var textures := {}            # 相對路徑 → Texture2D
var streams := {}             # 相對路徑 → AudioStream
var font_regular: FontFile = null
var font_bold: FontFile = null
var error := ""
const RETRIES := 3            # 每個檔最多下載幾次
const DECODE_PER_FRAME := 6   # 每一格解開幾個素材，讓畫面不會凍住

## 決定題庫位置：網頁版由外框提供；電腦上用 --bank=
func resolve_base(host_init: Dictionary) -> void:
	web = OS.has_feature("web")
	if web:
		base = String(host_init.get("bankBase", ""))
		if base == "":
			# 沒有網頁外框（灰盒試玩頁直接開遊戲）：從網址 ?bank=相對路徑 讀題庫位置
			var u = JavaScriptBridge.eval("(function(){var b=new URLSearchParams(location.search).get('bank');return b?new URL(b.replace(/\\/?$/,'/'),location.href).href:'';})()", true)
			base = String(u) if typeof(u) == TYPE_STRING else ""
	else:
		for a in OS.get_cmdline_user_args():
			if a.begins_with("--bank="):
				base = a.substr(7)
		if base != "" and not base.ends_with("/"):
			base += "/"

## 讀 bank.json 與 bank.pak。成功回傳 true；失敗時 error 有原因。
func load_all() -> bool:
	if base == "":
		error = "找不到題庫位置（bankBase）。"
		return false
	var raw := await _get_with_retry("bank.json", 0, 2)
	if raw.is_empty():
		error = "讀不到題庫 bank.json：%s" % (base + "bank.json")
		return false
	var parsed = JSON.parse_string(raw.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("items") or not parsed.has("locations"):
		error = "題庫 bank.json 格式不正確。"
		return false
	data = parsed
	progress.emit(2, 100)
	var pak_name := String(data.get("pak", ""))
	if pak_name == "":
		error = "題庫沒有 bank.pak，請用新版 build_mission.py 重新產生。"
		return false
	var pak := await _get_with_retry(pak_name, 2, 90)
	if pak.is_empty():
		error = "讀不到 %s（網路太慢或中斷）。" % pak_name
		return false
	var files := _read_pak(pak)
	if files.is_empty():
		error = "%s 格式不正確。" % pak_name
		return false
	return await _decode_all(files)

## 把 bank.pak 拆回 {相對路徑: 位元組}
func _read_pak(pak: PackedByteArray) -> Dictionary:
	if pak.size() < 8 or pak.slice(0, 4).get_string_from_ascii() != "QB01":
		return {}
	var head_len := pak.decode_u32(4)
	var head = JSON.parse_string(pak.slice(8, 8 + head_len).get_string_from_utf8())
	if typeof(head) != TYPE_DICTIONARY or not head.has("files"):
		return {}
	var start := 8 + head_len
	var out := {}
	for f in head["files"]:
		var o := start + int(f["offset"])
		out[String(f["path"])] = pak.slice(o, o + int(f["size"]))
	return out

## 依 bank.json 需要的素材逐一解開成圖片、聲音、字型
func _decode_all(files: Dictionary) -> bool:
	var jobs: Array = []
	var seen := {}
	var add := func(kind: String, path: String) -> void:
		if path != "" and not seen.has(kind + path):
			seen[kind + path] = true
			jobs.append([kind, path])
	for it in data["items"]:
		add.call("tex", String(it.get("image", "")))
		add.call("snd", String(it.get("audio", "")))
		for o in it.get("options", []):
			add.call("tex", String(o.get("image", "")))
	var fonts: Dictionary = data.get("fonts", {})
	add.call("font_r", String(fonts.get("regular", "")))
	add.call("font_b", String(fonts.get("bold", "")))
	var failed: Array = []
	var n := 0
	for job in jobs:
		var path: String = job[1]
		var bytes: PackedByteArray = files.get(path, PackedByteArray())
		var ok := not bytes.is_empty()
		if ok:
			match job[0]:
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
		if not ok:
			failed.append(path)
		n += 1
		if n % DECODE_PER_FRAME == 0:
			progress.emit(90 + int(10.0 * n / jobs.size()), 100)
			await get_tree().process_frame
	progress.emit(100, 100)
	if not failed.is_empty():
		error = "有 %d 個素材打不開，例如：%s" % [failed.size(), failed[0]]
		return false
	return true

## 下載一個檔，失敗就再試（最多 RETRIES 次）；下載進度換算成 p_from–p_to
func _get_with_retry(path: String, p_from: int, p_to: int) -> PackedByteArray:
	for attempt in RETRIES:
		var bytes := await _get_bytes(path, p_from, p_to)
		if not bytes.is_empty():
			return bytes
		push_warning("download failed (%d/%d): %s" % [attempt + 1, RETRIES, path])
		await get_tree().create_timer(1.0 + attempt).timeout
	return PackedByteArray()

func _get_bytes(path: String, p_from: int, p_to: int) -> PackedByteArray:
	if not web:
		var full := base + path
		if not FileAccess.file_exists(full):
			return PackedByteArray()
		progress.emit(p_to, 100)
		return FileAccess.get_file_as_bytes(full)
	var req := HTTPRequest.new()
	req.timeout = 180.0
	add_child(req)
	var err := req.request(base + path)
	if err != OK:
		req.queue_free()
		return PackedByteArray()
	var result := []
	req.request_completed.connect(func(r, code, _h, body): result.append_array([r, code, body]), CONNECT_ONE_SHOT)
	while result.is_empty():
		var total := req.get_body_size()
		if total > 0:
			progress.emit(p_from + int((p_to - p_from) * float(req.get_downloaded_bytes()) / total), 100)
		await get_tree().process_frame
	req.queue_free()
	if int(result[0]) != HTTPRequest.RESULT_SUCCESS or int(result[1]) != 200:
		return PackedByteArray()
	progress.emit(p_to, 100)
	return result[2]

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

func tex(path: String) -> Texture2D:
	return textures.get(path)

func stream(path: String) -> AudioStream:
	return streams.get(path)
