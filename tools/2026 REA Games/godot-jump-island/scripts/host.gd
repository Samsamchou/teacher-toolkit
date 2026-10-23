extends RefCounted
## 與網頁外框（hwg5-clock-tower.web.app/<任務>/ 的 shared/quest3d-app.mjs）溝通。
## 網頁外框負責學號、存檔、上傳教師後台；遊戲只透過 window.parent.ershuiHost 讀初始進度、回報作答。
## 不在網頁裡執行（電腦上直接開 Godot）時，所有函式都安全地什麼也不做。
## 自動測試可以設 fake（假的外框），檢查遊戲讀進度、回報作答的格式（qa.gd 的 _host_check）。

static var fake = null                 # 測試用：{"studentId", "results", "cleared"}
static var fake_reports: Array = []

static func on_web() -> bool:
	return OS.has_feature("web")

static func connected() -> bool:
	return fake != null or on_web()

## 取得網頁外框給的初始進度：{"studentId", "results": {題號: {...}}, "cleared": [地點], "bankBase"}；沒有外框時回傳 {}。
static func initial() -> Dictionary:
	if fake != null:
		return fake
	if not on_web():
		return {}
	var raw = JavaScriptBridge.eval("(function(){try{var h=window.parent&&window.parent.ershuiHost;return h?JSON.stringify(h.getInitial()):'';}catch(e){return '';}})()", true)
	if typeof(raw) != TYPE_STRING or raw == "":
		return {}
	var d = JSON.parse_string(raw)
	return d if typeof(d) == TYPE_DICTIONARY else {}

## 回報一件事給網頁外框：{"type": "item" | "cleared" | "complete", ...}
static func report(payload: Dictionary) -> void:
	if fake != null:
		fake_reports.append(payload.duplicate(true))
		return
	if not on_web():
		return
	var arg := JSON.stringify(JSON.stringify(payload))
	JavaScriptBridge.eval("(function(){try{var h=window.parent&&window.parent.ershuiHost;if(h)h.report(%s);}catch(e){console.warn(e);}})()" % arg, true)
