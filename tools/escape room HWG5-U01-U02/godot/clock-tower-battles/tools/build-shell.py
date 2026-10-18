"""Write site/public/game/index.html around the Godot Web export (run after every export).

The shell is the only movement authority on the web: on-screen arrows (each finger tracked by
pointerId) and keyboard (KeyboardEvent.code) feed window.BattleHost.input; the Godot scene reads it.
Messages to and from the parent page are checked for origin, source, channel and instance.
"""
import json, shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = (root / "../../site/public/hwg5-u01-u02/game").resolve()
pck, wasm = (out / "engine.pck").stat().st_size, (out / "engine.wasm").stat().st_size
shutil.copy(root / "web/movement-input.mjs", out / "movement-input.mjs")
for f in ("GODOT-LICENSE.txt", "GODOT-THIRD-PARTY.json"):
    shutil.copy(root / f, out / f)
config = json.dumps({"args": [], "canvasResizePolicy": 2, "emscriptenPoolSize": 8, "ensureCrossOriginIsolationHeaders": False,
                     "executable": "engine", "experimentalVK": False, "fileSizes": {"engine.pck": pck, "engine.wasm": wasm},
                     "focusCanvas": False, "gdextensionLibs": [], "godotPoolSize": 4}, separators=(",", ":"))
html = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Clock Tower Battle</title><style>
html,body{margin:0;height:100%;background:#0b1030;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
canvas{width:100%;height:100%;display:block;outline:0;touch-action:none}
.pad{position:fixed;left:14px;bottom:14px;display:grid;grid-template-columns:repeat(3,62px);grid-template-rows:repeat(3,62px);gap:4px}
.pad button,.skill{border:0;border-radius:16px;background:rgba(255,255,255,.22);color:#fff;font:700 26px sans-serif;touch-action:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}
.pad button.on,.skill.on{background:rgba(255,215,101,.6)}
.pad [data-dir=w]{grid-column:2;grid-row:1}.pad [data-dir=a]{grid-column:1;grid-row:2}.pad [data-dir=d]{grid-column:3;grid-row:2}.pad [data-dir=s]{grid-column:2;grid-row:3}
.skill{position:fixed;right:18px;bottom:22px;width:104px;height:104px;border-radius:50%;font-size:17px;line-height:1.1}
</style></head><body>
<canvas id="canvas" tabindex="0" aria-label="Clock tower battle"></canvas>
<div class="pad" aria-label="Move"><button data-dir="w" aria-label="Up">▲</button><button data-dir="a" aria-label="Left">◀</button><button data-dir="d" aria-label="Right">▶</button><button data-dir="s" aria-label="Down">▼</button></div>
<button class="skill" aria-label="Skill">TICK<br>TOCK!</button>
<script src="./engine.js"></script>
<script type="module">
import { createMovement, controlKey } from "./movement-input.mjs";
const CHANNEL = "clocktower-battle-v1";
const instance = new URLSearchParams(location.search).get("instance") || "";
const movement = createMovement();
let base = {}, input = { x: 0, y: 0 }, skillSeq = 0, hidden = false;
const publish = () => { window.BattleHost = { ...base, input: hidden ? { x: 0, y: 0 } : input, skillSeq, phase: hidden ? "paused" : base.phase }; };
window.emitBattleEvent = event => parent.postMessage({ channel: CHANNEL, instance, event }, location.origin);
addEventListener("message", e => {
  if (e.origin !== location.origin || e.source !== parent || e.data?.channel !== CHANNEL || e.data?.instance !== instance) return;
  if (e.data.host?.id !== base.id) { input = movement.clear(); skillSeq = 0; }
  base = e.data.host || {}; publish();
});
const set = v => { input = { x: v.x, y: v.y }; publish(); };
for (const b of document.querySelectorAll(".pad button")) {
  b.addEventListener("pointerdown", e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* finger already gone */ } b.classList.add("on"); set(movement.press(e.pointerId, b.dataset.dir)); });
  for (const t of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(t, e => { b.classList.remove("on"); set(movement.release(e.pointerId)); });
}
const skill = document.querySelector(".skill");
const fire = () => { skillSeq++; publish(); skill.classList.add("on"); setTimeout(() => skill.classList.remove("on"), 150); };
skill.addEventListener("pointerdown", e => { e.preventDefault(); fire(); });
const MOVE = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const relay = (e, down) => {
  if (MOVE.has(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); set(movement.key(controlKey(e), down)); }
  else if ((e.code === "Space" || e.code === "KeyE") && down) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) fire(); }
};
addEventListener("keydown", e => relay(e, true), true);
addEventListener("keyup", e => relay(e, false), true);
window.relayParentKey = (e, down) => relay(e, down);
const reset = () => { for (const b of document.querySelectorAll(".pad .on")) b.classList.remove("on"); set(movement.clear()); };
addEventListener("blur", reset);
document.addEventListener("visibilitychange", () => { hidden = document.hidden; if (hidden) reset(); publish(); });
addEventListener("error", e => window.emitBattleEvent({ type: "error", message: String(e.message) }));
const engine = new Engine(CONFIG);
const missing = Engine.getMissingFeatures({ threads: false });
if (missing.length) window.emitBattleEvent({ type: "error", message: "Browser features missing: " + missing.join(", ") });
else engine.startGame({ canvas: document.getElementById("canvas"),
  onProgress: (n, total) => window.emitBattleEvent({ type: "progress", percent: total ? Math.round(n / total * 100) : 0 }),
  onPrint: console.log, onPrintError: (...a) => { console.error(...a); window.emitBattleEvent({ type: "error", message: a.join(" ") }); } })
  .catch(e => window.emitBattleEvent({ type: "error", message: String(e) }));
</script></body></html>'''.replace("CONFIG)", config + ")")
(out / "index.html").write_text(html, encoding="utf-8")
print(json.dumps({"shell": str(out / "index.html"), "pckBytes": pck, "wasmBytes": wasm}))
