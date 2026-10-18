// Build web derivatives from the canonical masters (masters are never modified).
//   node scripts/build-assets.mjs
// - PNG masters -> WebP via ffmpeg (libwebp); atlas quadrants cropped into single icons
// - narration MP3 + Comic Relief fonts copied
// - public/data.js generated from content/question-bank.v0.1.json
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.resolve(site, "..");
// each mission lives in its own folder under public/; the portal is public/index.html
const pub = path.join(site, "public", "hwg5-u01-u02");
const img = path.join(project, "assets", "imagegen");
const FONT_SRC = path.resolve(project, "..", "escape room", "site", "public", "assets", "fonts");
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const outputs = [];
function webp(src, out, { width, crop, alpha = false, quality = 80 }) {
  const target = path.join(pub, out);
  mkdirSync(path.dirname(target), { recursive: true });
  const filters = [crop && `crop=${crop}`, width && `scale=${width}:-2:flags=lanczos`].filter(Boolean).join(",");
  const args = ["-y", "-v", "error", "-i", src, ...(filters ? ["-vf", filters] : []), "-c:v", "libwebp",
    "-quality", String(quality), ...(alpha ? ["-pix_fmt", "yuva420p"] : []), target];
  execFileSync(FFMPEG, args, { stdio: "inherit" });
  outputs.push(out);
}
const q = (n) => { const h = 627; return { TL: `${h}:${h}:0:0`, TR: `${h}:${h}:${h}:0`, BL: `${h}:${h}:0:${h}`, BR: `${h}:${h}:${h}:${h}` }[n]; };

// story + question illustrations (opaque, 1536x1024 masters)
for (let i = 1; i <= 10; i++) {
  const name = ["", "prologue", "monday", "tuesday", "wednesday", "thursday", "friday", "weekend", "clockcore", "ending", "home"][i];
  webp(path.join(img, "story", `STORY-${String(i).padStart(2, "0")}-${name}.png`), `assets/images/story/STORY-${String(i).padStart(2, "0")}.webp`, { width: 1280 });
}
for (const n of [...Array(26).keys()].map(i => i + 1).concat([31, 32])) {
  const id = `Q${String(n).padStart(2, "0")}`;
  webp(path.join(img, "questions", `${id}.png`), `assets/images/questions/${id}.webp`, { width: 1280 });
}
// Tick feedback + boss
for (const [file, out] of [["MASCOT-01-Tick", "tick"], ["MASCOT-02-Tick-hint", "tick-hint"], ["MASCOT-03-Tick-correct", "tick-correct"],
  ["MASCOT-04-Tick-tryagain", "tick-tryagain"], ["BOSS-01-TimeMuncher", "time-muncher"]]) {
  webp(path.join(img, "mascots", `${file}.png`), `assets/images/mascots/${out}.webp`, { width: 320, alpha: true, quality: 85 });
}
// Ken full-body portrait for the result page (approved CHAR-01 anchor)
webp(path.join(img, "characters", "CHAR-01-Ken.png"), "assets/images/characters/ken.webp", { width: 420, alpha: true, quality: 85 });
// subject / gear / shard icons
for (const f of ["ICON-01-art", "ICON-02-music", "ICON-03-math", "ICON-04-chinese", "ICON-05-english", "ICON-06-science",
  "ICON-07-pe", "ICON-08-socialstudies", "ICON-09-daygear", "ICON-10-mirrorshard"]) {
  webp(path.join(img, "icons", `${f}.png`), `assets/images/icons/${f.slice(0, 7)}.webp`, { width: 192, alpha: true, quality: 85 });
}
// reward items (GAME-06 / GAME-07 quadrants), Ken + boss sprites, arenas
const quads = {
  "GAME-06-items-a": { TL: "paint-splash", TR: "music-note-shield", BL: "ruler-boomerang", BR: "textbook-guard" },
  "GAME-07-items-b": { TL: "word-bubble", TR: "science-potion", BL: "speed-sneakers", BR: "globe-compass" },
};
for (const [atlas, map] of Object.entries(quads))
  for (const [pos, name] of Object.entries(map))
    webp(path.join(img, "game", `${atlas}.png`), `assets/images/items/${name}.webp`, { crop: q(pos), width: 192, alpha: true, quality: 85 });
webp(path.join(img, "game", "GAME-01-ken.png"), "assets/images/battle/ken.webp", { crop: q("TL"), width: 256, alpha: true, quality: 85 });
webp(path.join(img, "game", "GAME-05-boss.png"), "assets/images/battle/boss-1.webp", { crop: q("TL"), width: 320, alpha: true, quality: 85 });
webp(path.join(img, "game", "GAME-05-boss.png"), "assets/images/battle/boss-2.webp", { crop: q("TR"), width: 320, alpha: true, quality: 85 });
const arenas = [["GAME-11-arenas-a", ["TL", "TR", "BL", "BR"]], ["GAME-12-arenas-b", ["TL", "TR", "BL", "BR"]], ["GAME-13-arenas-c", ["TL", "TR", "BL", "BR"]]];
let a = 1;
for (const [atlas, ps] of arenas) for (const p of ps) {
  webp(path.join(img, "game", `${atlas}.png`), `assets/images/arenas/ARENA-${String(a).padStart(2, "0")}.webp`, { crop: q(p), width: 627 });
  a++;
}

// narration audio + fonts
const bankPath = path.join(project, "content", "question-bank.v0.1.json");
const bank = JSON.parse(readFileSync(bankPath, "utf8"));
for (const s of Object.values(bank.story)) {
  const target = path.join(pub, "assets", s.tts.path);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(project, "assets", s.tts.path), target);
  outputs.push(path.join("assets", s.tts.path).replaceAll("\\", "/"));
}
for (const it of bank.items) {
  const target = path.join(pub, "assets", it.feedbackTts.path);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(project, "assets", it.feedbackTts.path), target);
  outputs.push(`assets/${it.feedbackTts.path}`);
}
// result-page celebration (Kenney Music Jingles STEEL02, CC0) + its license
mkdirSync(path.join(pub, "assets", "audio", "sfx"), { recursive: true });
for (const f of ["celebrate.mp3", "Kenney-Music-Jingles-License.txt"]) {
  copyFileSync(path.join(project, "assets", "audio", "sfx", f), path.join(pub, "assets", "audio", "sfx", f));
  outputs.push(`assets/audio/sfx/${f}`);
}
mkdirSync(path.join(pub, "assets", "fonts"), { recursive: true });
for (const f of ["ComicRelief-Regular.woff2", "ComicRelief-Bold.woff2", "OFL-ComicRelief.txt"]) {
  copyFileSync(path.join(FONT_SRC, f), path.join(pub, "assets", "fonts", f));
  outputs.push(`assets/fonts/${f}`);
}

// portal (public/index.html) gets its own copy of the fonts so it does not depend on one mission folder
mkdirSync(path.join(site, "public", "assets", "fonts"), { recursive: true });
for (const f of ["ComicRelief-Regular.woff2", "ComicRelief-Bold.woff2", "OFL-ComicRelief.txt"])
  copyFileSync(path.join(FONT_SRC, f), path.join(site, "public", "assets", "fonts", f));

// data.js — bank with web paths
const webImage = p => p.startsWith("story/") ? `assets/images/story/${p.slice(6, 14)}.webp` : `assets/images/questions/${path.basename(p, ".png")}.webp`;
const data = structuredClone(bank);
for (const s of Object.values(data.story)) {
  // word timings (content/align_narration.py) drive the karaoke highlight; segments without one just play
  const timingFile = path.join(project, "assets", s.tts.path.replace(/\.mp3$/u, ".timing.json"));
  if (existsSync(timingFile)) {
    const t = JSON.parse(readFileSync(timingFile, "utf8"));
    const expect = s.lines.flatMap((l, li) => l.split(/\s+/u).map(w => `${li}:${w}`));
    const got = t.words.map(w => `${w.line}:${w.w}`);
    if (JSON.stringify(expect) !== JSON.stringify(got)) throw new Error(`${s.id} timing words do not match the narration text`);
    s.tts.words = t.words.map(w => [w.s, w.e]);
    s.tts.timingMethod = t.method;
  }
  s.image = webImage(s.image);
  s.tts.path = `assets/${s.tts.path}`;
}
for (const it of data.items) { it.image = webImage(it.image); it.feedbackTts.path = `assets/${it.feedbackTts.path}`; }
data.home = { image: "assets/images/story/STORY-10.webp" };
data.arenaImages = Object.fromEntries(data.battles.map((b, i) => [b.id, `assets/images/arenas/ARENA-${String(i + 1).padStart(2, "0")}.webp`]));
data.arenaImages.VICTORY = "assets/images/arenas/ARENA-12.webp";
const gear = "assets/images/icons/ICON-09.webp";
data.rewardIcons = {
  "Monday Gear": gear, "Tuesday Gear": gear, "Wednesday Gear": gear, "Thursday Gear": gear, "Friday Gear": gear, "Weekend Gears": gear,
  "Paint Splash": "assets/images/items/paint-splash.webp", "Music Note Shield": "assets/images/items/music-note-shield.webp",
  "Ruler Boomerang": "assets/images/items/ruler-boomerang.webp", "Textbook Guard": "assets/images/items/textbook-guard.webp",
  "Word Bubble": "assets/images/items/word-bubble.webp", "Science Potion": "assets/images/items/science-potion.webp",
  "Speed Sneakers": "assets/images/items/speed-sneakers.webp", "Globe Compass": "assets/images/items/globe-compass.webp",
  "Mirror Shard": "assets/images/icons/ICON-10.webp", "Clock Restarted": "assets/images/mascots/tick-correct.webp",
};
data.sourceBankSha256 = createHash("sha256").update(readFileSync(bankPath)).digest("hex");
writeFileSync(path.join(pub, "data.js"),
  "// Generated by scripts/build-assets.mjs from content/question-bank.v0.1.json — do not edit by hand.\n" +
  `export const BANK = ${JSON.stringify(data, null, 1)};\n`, "utf8");

// manifest
const files = outputs.map(o => ({ path: o, bytes: statSync(path.join(pub, o)).size }));
writeFileSync(path.join(pub, "assets", "asset-manifest.json"), JSON.stringify({ count: files.length, files }, null, 1) + "\n");
const missing = files.filter(f => !existsSync(path.join(pub, f.path)));
console.log(`built ${files.length} assets, ${(files.reduce((n, f) => n + f.bytes, 0) / 1048576).toFixed(1)} MB; missing ${missing.length}`);
