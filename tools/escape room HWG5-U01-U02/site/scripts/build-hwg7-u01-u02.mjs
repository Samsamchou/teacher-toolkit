// HWG7 U01+U02 "Ken and the World Map Mix-Up": build web derivatives from the HWG7 project masters.
//   node scripts/build-hwg7-u01-u02.mjs
// Same pipeline as build-assets.mjs (HWG5), kept separate so the HWG5 build never changes.
// - PNG masters -> WebP via ffmpeg (libwebp); atlas quadrants cropped into single icons
// - narration + Tick MP3 + Comic Relief fonts copied
// - public/hwg7-u01-u02/data.js generated from the HWG7 content/question-bank.v0.1.json
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hwg5 = path.resolve(site, "..");
const project = path.resolve(hwg5, "..", "escape room HWG7-U01-U02");
const pub = path.join(site, "public", "hwg7-u01-u02");
const img = path.join(project, "assets", "imagegen");
const FONT_SRC = path.resolve(hwg5, "..", "escape room", "site", "public", "assets", "fonts");
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const outputs = [];
function webp(src, out, { width, height, crop, alpha = false, quality = 80 }) {
  const target = path.join(pub, out);
  mkdirSync(path.dirname(target), { recursive: true });
  const scale = width && (height ? `scale=${width}:${height}:flags=lanczos` : `scale=${width}:-2:flags=lanczos`);
  const filters = [crop && `crop=${crop}`, scale].filter(Boolean).join(",");
  const args = ["-y", "-v", "error", "-i", src, ...(filters ? ["-vf", filters] : []), "-c:v", "libwebp",
    "-quality", String(quality), ...(alpha ? ["-pix_fmt", "yuva420p"] : []), target];
  execFileSync(FFMPEG, args, { stdio: "inherit" });
  outputs.push(out);
}
const q = (n) => { const h = 627; return { TL: `${h}:${h}:0:0`, TR: `${h}:${h}:${h}:0`, BL: `${h}:${h}:0:${h}`, BR: `${h}:${h}:${h}:${h}` }[n]; };

// story + question illustrations (opaque, 1536x1024 masters)
const STORY = ["prologue", "welcome", "mapwall", "routes", "echomap", "ending", "home"];
STORY.forEach((name, i) => {
  const id = `STORY-${String(i + 1).padStart(2, "0")}`;
  webp(path.join(img, "story", `${id}-${name}.png`), `assets/images/story/${id}.webp`, { width: 1280 });
});
const bankPath = path.join(project, "content", "question-bank.v0.1.json");
const bank = JSON.parse(readFileSync(bankPath, "utf8"));
for (const id of [...new Set(bank.items.map(i => path.basename(i.image, ".png")))])
  webp(path.join(img, "questions", `${id}.png`), `assets/images/questions/${id}.webp`, { width: 1280 });
// Tick feedback + boss
for (const [file, out] of [["MASCOT-01-Tick", "tick"], ["MASCOT-02-Tick-hint", "tick-hint"], ["MASCOT-03-Tick-correct", "tick-correct"],
  ["MASCOT-04-Tick-tryagain", "tick-tryagain"], ["BOSS-02-MapGobbler", "map-gobbler"]]) {
  webp(path.join(img, "mascots", `${file}.png`), `assets/images/mascots/${out}.webp`, { width: 320, alpha: true, quality: 85 });
}
// Ken full-body portrait for the result page (CHAR-01, reused from HWG5)
webp(path.join(img, "characters", "CHAR-01-Ken.png"), "assets/images/characters/ken.webp", { width: 420, alpha: true, quality: 85 });
// flag pins + echo piece: the pin frames differ by 4-5 px, so every icon is forced to the same 192x192 box
for (const f of ["ICON-01-pin-australia", "ICON-02-pin-japan", "ICON-03-pin-spain", "ICON-04-pin-taiwan", "ICON-05-pin-singapore",
  "ICON-06-pin-uk", "ICON-07-pin-usa", "ICON-08-pin-blank", "ICON-09-echo-piece"]) {
  webp(path.join(img, "icons", `${f}.png`), `assets/images/icons/${f.slice(0, 7)}.webp`, { width: 192, height: 192, alpha: true, quality: 85 });
}
// reward items (GAME-06 / GAME-07 quadrants), arenas
const quads = {
  "GAME-06-items-a": { TL: "boomerang", TR: "paper-fan", BL: "bubble-tea", BR: "merlion-splash" },
  "GAME-07-items-b": { TL: "running-shoes", TR: "bus-pass-shield", BL: "rain-umbrella", BR: "metro-map" },
};
for (const [atlas, map] of Object.entries(quads))
  for (const [pos, name] of Object.entries(map))
    webp(path.join(img, "game", `${atlas}.png`), `assets/images/items/${name}.webp`, { crop: q(pos), width: 192, alpha: true, quality: 85 });
let a = 1;
for (const atlas of ["GAME-11-arenas-a", "GAME-12-arenas-b", "GAME-13-arenas-c"]) for (const p of ["TL", "TR", "BL", "BR"]) {
  webp(path.join(img, "game", `${atlas}.png`), `assets/images/arenas/ARENA-${String(a).padStart(2, "0")}.webp`, { crop: q(p), width: 627 });
  a++;
}

// narration + Tick audio, celebration sound (HWG5, Kenney CC0) and fonts
for (const s of Object.values(bank.story)) {
  const target = path.join(pub, "assets", s.tts.path);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(project, "assets", s.tts.path), target);
  outputs.push(`assets/${s.tts.path}`);
}
for (const it of bank.items) {
  const target = path.join(pub, "assets", it.feedbackTts.path);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(project, "assets", it.feedbackTts.path), target);
  outputs.push(`assets/${it.feedbackTts.path}`);
}
mkdirSync(path.join(pub, "assets", "audio", "sfx"), { recursive: true });
for (const f of ["celebrate.mp3", "Kenney-Music-Jingles-License.txt"]) {
  copyFileSync(path.join(hwg5, "assets", "audio", "sfx", f), path.join(pub, "assets", "audio", "sfx", f));
  outputs.push(`assets/audio/sfx/${f}`);
}
mkdirSync(path.join(pub, "assets", "fonts"), { recursive: true });
for (const f of ["ComicRelief-Regular.woff2", "ComicRelief-Bold.woff2", "OFL-ComicRelief.txt"]) {
  copyFileSync(path.join(FONT_SRC, f), path.join(pub, "assets", "fonts", f));
  outputs.push(`assets/fonts/${f}`);
}

// data.js — bank with web paths
const webImage = p => p.startsWith("story/") ? `assets/images/story/${p.slice(6, 14)}.webp` : `assets/images/questions/${path.basename(p, ".png")}.webp`;
const data = structuredClone(bank);
for (const s of Object.values(data.story)) {
  const t = JSON.parse(readFileSync(path.join(project, "assets", s.tts.path.replace(/\.mp3$/u, ".timing.json")), "utf8"));
  const expect = s.lines.flatMap((l, li) => l.split(/\s+/u).map(w => `${li}:${w}`));
  const got = t.words.map(w => `${w.line}:${w.w}`);
  if (JSON.stringify(expect) !== JSON.stringify(got)) throw new Error(`${s.id} timing words do not match the narration text`);
  if (t.interpolated) throw new Error(`${s.id} timing has ${t.interpolated} interpolated words (TTS dropped words?)`);
  s.tts.words = t.words.map(w => [w.s, w.e]);
  s.tts.timingMethod = t.method;
  s.image = webImage(s.image);
  s.tts.path = `assets/${s.tts.path}`;
}
for (const it of data.items) { it.image = webImage(it.image); it.feedbackTts.path = `assets/${it.feedbackTts.path}`; }
data.home = { image: "assets/images/story/STORY-07.webp" };
data.arenaImages = Object.fromEntries(data.battles.map((b, i) => [b.id, `assets/images/arenas/ARENA-${String(i + 1).padStart(2, "0")}.webp`]));
data.arenaImages.VICTORY = "assets/images/arenas/ARENA-11.webp";
const icon = n => `assets/images/icons/ICON-${n}.webp`, item = n => `assets/images/items/${n}.webp`;
data.pinOrder = ["Australia Pin", "Japan Pin", "Spain Pin", "Taiwan Pin", "Singapore Pin", "UK Pin", "USA Pin"];
data.itemOrder = ["Boomerang", "Paper Fan", "Bubble Tea", "Merlion Splash", "Running Shoes", "Bus Pass Shield",
  "Rain Umbrella", "Metro Map", "Echo Map Piece"];
data.rewardIcons = {
  "Australia Pin": icon("01"), "Japan Pin": icon("02"), "Spain Pin": icon("03"), "Taiwan Pin": icon("04"),
  "Singapore Pin": icon("05"), "UK Pin": icon("06"), "USA Pin": icon("07"), "Blank Pin": icon("08"),
  "Boomerang": item("boomerang"), "Paper Fan": item("paper-fan"), "Bubble Tea": item("bubble-tea"),
  "Merlion Splash": item("merlion-splash"), "Running Shoes": item("running-shoes"), "Bus Pass Shield": item("bus-pass-shield"),
  "Rain Umbrella": item("rain-umbrella"), "Metro Map": item("metro-map"),
  "Echo Map Piece": icon("09"), "World Map Restored": "assets/images/mascots/tick-correct.webp",
};
for (const b of data.battles) for (const r of b.rewards) if (!data.rewardIcons[r]) throw new Error(`no icon for reward ${r}`);
data.sourceBankSha256 = createHash("sha256").update(readFileSync(bankPath)).digest("hex");
writeFileSync(path.join(pub, "data.js"),
  "// Generated by scripts/build-hwg7-u01-u02.mjs from escape room HWG7-U01-U02/content/question-bank.v0.1.json — do not edit by hand.\n" +
  `export const BANK = ${JSON.stringify(data, null, 1)};\n`, "utf8");

// manifest
const files = outputs.map(o => ({ path: o, bytes: statSync(path.join(pub, o)).size }));
writeFileSync(path.join(pub, "assets", "asset-manifest.json"), JSON.stringify({ count: files.length, files }, null, 1) + "\n");
const missing = files.filter(f => !existsSync(path.join(pub, f.path)));
console.log(`built ${files.length} assets, ${(files.reduce((n, f) => n + f.bytes, 0) / 1048576).toFixed(1)} MB; missing ${missing.length}`);
