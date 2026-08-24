import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../public/app.js"), "utf8");

for (const requiredClass of [
  "hud-energy",
  "energy-meter",
  "energy-fill",
  "energy-value",
  "station-route",
  "inventory-tray",
  "inventory-slot",
  "mission-comms",
  "context-en",
  "context-zh",
  "mission-goal",
  "evidence-scanner",
  "game-answer-card",
  "character-dialogue",
  "reward-burst",
]) {
  assert.ok(source.includes(requiredClass), `${requiredClass} rendering hook exists`);
}

assert.match(source, /Math\.max\(0, Math\.min\(100, energyValue\)\)/, "Energy fill is capped at 100");
assert.match(source, /energyValue >= 90/, "Energy charge glow starts at 90");
assert.match(source, /energy-delta/, "Energy HUD renders a short score-change animation hook");
assert.match(source, /contextEn \?\? node\.context/, "new English context field keeps legacy fallback");
assert.match(source, /node\.contextZh/, "Chinese context is rendered");
assert.match(source, /node\.missionGoalZh/, "Chinese mission goal is rendered");
assert.match(source, /class="mission-goal">\$\{escapeHtml\(missionGoalZh\)\}/, "mission goal text is rendered once");
assert.doesNotMatch(source, /<strong>任務目標：<\/strong>\$\{escapeHtml\(missionGoalZh\)\}/, "mission goal prefix is not duplicated by the renderer");
assert.doesNotMatch(source, /escapeHtml\(node\.id\).*節點/, "student question heading does not render internal IDs");
assert.doesNotMatch(source, /🔊/, "audio control uses SVG rather than emoji");
assert.doesNotMatch(source, /<b>Mission \$\{mission\.id\}/, "station route does not show Mission numbers");
assert.match(source, /const letters = \["A", "B", "C"\]/, "A/B/C option labels remain");

assert.match(source, /MASCOT-01\.webp/, "mission communications include the guide mascot");
assert.match(source, /srcset="\$\{mission\.scene\} 1x, \$\{retinaAsset\(mission\.scene\)\} 2x"/, "mission scenes use Retina srcset");
assert.match(source, /srcset="\$\{ASSETS\.openGate\} 1x, \$\{retinaAsset\(ASSETS\.openGate\)\} 2x"/, "finale uses Retina srcset");

console.log("app-rendering-contract=PASS");
