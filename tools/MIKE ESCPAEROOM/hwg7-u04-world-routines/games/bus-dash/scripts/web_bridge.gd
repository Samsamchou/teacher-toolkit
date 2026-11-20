class_name WebBridge
## All browser / iframe talk goes through here. Every call is a no-op outside the Web export.

const CHANNEL := "world-routines"
const GAME := "bus-dash"

static func is_web() -> bool:
	return OS.has_feature("web")

static func query(key: String) -> String:
	if not is_web():
		return ""
	var v: Variant = JavaScriptBridge.eval("(new URLSearchParams(window.location.search).get('%s') || '')" % key, true)
	return str(v) if v != null else ""

static func is_touch() -> bool:
	if not is_web():
		return DisplayServer.is_touchscreen_available()
	var v: Variant = JavaScriptBridge.eval("(navigator.maxTouchPoints > 0 || 'ontouchstart' in window) ? 1 : 0", true)
	return int(v) == 1 if v != null else false

## Sends {channel, game, type, ...payload} to the parent page (same origin only).
## Never throws: does nothing when the game is not embedded.
static func post(type: String, payload: Dictionary = {}) -> void:
	if not is_web():
		return
	var msg: Dictionary = {"channel": CHANNEL, "type": type, "game": GAME}
	msg.merge(payload)
	var js := "(function(){try{if(window.parent&&window.parent!==window){window.parent.postMessage(%s,window.location.origin);}}catch(e){}})()" % JSON.stringify(msg)
	JavaScriptBridge.eval(js, true)

## Small read-only status object for QA scripts: window.__bento
static func publish(status: Dictionary) -> void:
	if not is_web():
		return
	JavaScriptBridge.eval("window.__bento=%s;" % JSON.stringify(status), true)
