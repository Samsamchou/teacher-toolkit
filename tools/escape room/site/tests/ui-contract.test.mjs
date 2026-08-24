import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(here, "../public");
const css = readFileSync(resolve(publicRoot, "styles.css"), "utf8");
const html = readFileSync(resolve(publicRoot, "index.html"), "utf8");
const app = readFileSync(resolve(publicRoot, "app.js"), "utf8");

assert.equal((css.match(/@font-face\s*\{/g) ?? []).length, 2, "regular and bold Comic Relief faces are declared");
assert.doesNotMatch(css, /Trebuchet MS/i, "legacy English font is removed");
assert.match(css, /body,button,input,select,textarea\{font-family:"Comic Relief"/, "mixed-language controls use Comic Relief first");
assert.match(css, /prefers-reduced-motion:reduce/, "reduced motion is supported");
assert.match(css, /100dvh/, "dynamic viewport height is supported");
assert.match(css, /safe-area-inset-top/, "iPad safe area is supported");
assert.match(css, /image-options--full/, "image questions have a full-width layout");

for (const name of ["ComicRelief-Regular.woff2", "ComicRelief-Bold.woff2"]) {
  const path = resolve(publicRoot, "assets/fonts", name);
  assert.ok(existsSync(path), `${name} exists`);
  assert.equal(readFileSync(path).subarray(0, 4).toString("ascii"), "wOF2", `${name} has a WOFF2 header`);
  assert.match(html, new RegExp(`preload[^>]+${name.replace(".", "\\.")}`), `${name} is preloaded`);
}
assert.match(readFileSync(resolve(publicRoot, "assets/fonts/OFL-ComicRelief.txt"), "utf8"), /SIL OPEN FONT LICENSE Version 1\.1/, "font license is bundled");

const manifest = JSON.parse(readFileSync(resolve(publicRoot, "assets/asset-manifest.json"), "utf8"));
assert.equal(manifest.length, 67, "67 website image derivatives are recorded");
assert.equal(manifest.filter((item) => /characters\/CHAR-\d{2}\.webp$/.test(item.output)).length, 8, "eight canonical student derivatives exist");
assert.equal(manifest.filter((item) => /scenes\/SCENE-\d{2}@2x\.webp$/.test(item.output)).length, 6, "six Retina mission scenes exist");
assert.equal(manifest.filter((item) => /finale\/FINALE-\d{2}@2x\.webp$/.test(item.output)).length, 2, "two Retina finale images exist");
for (const item of manifest) assert.ok(existsSync(resolve(publicRoot, item.output)), `${item.output} exists`);

assert.doesNotMatch(app, /escapeHtml\(node\.id\)/, "student rendering does not expose internal question IDs");
assert.doesNotMatch(app, /currentNodeIndex\s*\+\s*1\}\s*\/\s*21/, "student rendering does not expose node counts");
assert.match(app, /class="comms-guide"/, "the mission dialogue includes the canonical mascot guide");
assert.equal((app.match(/srcset="/g) ?? []).length, 2, "mission and finale art declare Retina srcset");
assert.ok((app.match(/retinaAsset\(/g) ?? []).length >= 3, "Retina helper is used by both render paths");
assert.doesNotMatch(app, /<strong>任務目標：<\/strong>\$\{escapeHtml\(missionGoalZh\)\}/, "mission goal prefix is not duplicated");

console.log("ui-contract=PASS");