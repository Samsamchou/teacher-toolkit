import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BANK } from "../public/hwg5-u01-u02/data.js";
import * as R from "../public/hwg5-u01-u02/rules.js";
import { createStore, newAttempt } from "../public/hwg5-u01-u02/storage.js";

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "hwg5-u01-u02");
const bankJson = JSON.parse(readFileSync(path.resolve(pub, "..", "..", "..", "content", "question-bank.v0.1.json"), "utf8"));

function memoryBackend() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}
// place the correct tiles for an item
function solve(item, tiles) {
  const pool = tiles.slice();
  const want = item.type === "spell" ? [...item.spell.answer.replaceAll(" ", "")] : item.blanks.map(b => b.answer);
  return want.map(w => { const i = pool.findIndex(t => t.text === w); return pool.splice(i, 1)[0].id; });
}

test("content: 32 items (11 spell, 21 drag) match the generated bank", () => {
  assert.equal(BANK.items.length, 32);
  assert.equal(BANK.items.filter(i => i.type === "spell").length, 11);
  assert.deepEqual(BANK.items.map(i => i.bankId), bankJson.items.map(i => i.bankId));
  for (const i of BANK.items.filter(i => i.type === "drag")) assert.ok(i.distractors.length >= 2, i.id);
});

test("content: every referenced asset exists", () => {
  const paths = [BANK.home.image, ...Object.values(BANK.arenaImages), ...Object.values(BANK.rewardIcons),
    ...Object.values(BANK.story).flatMap(s => [s.image, s.tts.path]), ...BANK.items.map(i => i.image),
    "assets/images/battle/ken.webp", "assets/images/battle/boss-1.webp", "assets/images/battle/boss-2.webp",
    ...["tick-hint", "tick-correct", "tick-tryagain"].map(n => `assets/images/mascots/${n}.webp`),
    "assets/fonts/ComicRelief-Regular.woff2", "assets/fonts/ComicRelief-Bold.woff2"];
  for (const p of paths) assert.ok(existsSync(path.join(pub, p)), p);
});

test("content: week strip rules (Sun..Sat, Chinese label only on spelling-day items)", () => {
  assert.deepEqual(BANK.weekStripOrder, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const dayWords = { Tuesday: "星期二", Wednesday: "星期三", Thursday: "星期四", Friday: "星期五", Saturday: "星期六" };
  for (const i of BANK.items) {
    const zh = i.weekStrip?.zhLabel;
    if (i.type === "spell" && dayWords[i.spell.answer]) assert.equal(zh, dayWords[i.spell.answer], i.id);
    else assert.ok(!zh, `${i.id} must not show Chinese`);
  }
  assert.equal(BANK.items[0].weekStrip, null, "Q01 must not reveal Monday before Q02");
});

test("content: every story segment must be listened to and has narration audio", () => {
  for (const s of Object.values(BANK.story)) {
    assert.equal(s.requiresListen, true);
    assert.equal(s.tts.text, s.lines.join(" "));
  }
  assert.equal(BANK.narrationTts.speed, 0.8);
  assert.equal(BANK.narrationTts.voice, "marin");
});

test("rules: flow = 9 stories + 32 items + 11 battles + result, battle after every 3 items", () => {
  const steps = R.buildSteps(BANK);
  assert.equal(steps.filter(s => s.kind === "story").length, 9);
  assert.equal(steps.filter(s => s.kind === "item").length, 32);
  assert.equal(steps.filter(s => s.kind === "battle").length, 11);
  assert.equal(steps.at(-1).kind, "result");
  let since = 0;
  for (const s of steps) {
    if (s.kind === "item") since++;
    if (s.kind === "battle") { assert.ok(since === 3 || (s.id === "B11" && since === 2), s.id); since = 0; }
  }
  assert.deepEqual(steps.at(-2), { kind: "story", seg: "SEG-09" });
});

test("rules: tiles are seeded (resume keeps order) and contain the answers", () => {
  for (const item of BANK.items) {
    const a = R.buildTiles(item, "seed-1"), b = R.buildTiles(item, "seed-1");
    assert.deepEqual(a, b);
    assert.equal(a.length, R.slotCount(item) + (item.type === "spell" ? item.spell.distractorLetters.length : item.distractors.length));
    assert.ok(R.grade(item, a, solve(item, a)), item.id);
  }
});

test("rules: wrong answers fail, partial answers are not gradable", () => {
  const d = BANK.items.find(i => i.bankId === "D10");
  const tiles = R.buildTiles(d, "x");
  const right = solve(d, tiles);
  const wrong = [tiles.find(t => t.text === "PE").id, right[1]];
  assert.equal(R.grade(d, tiles, wrong), false);
  assert.equal(R.isComplete(d, [right[0], null]), false);
  const s = BANK.items.find(i => i.type === "spell" && i.spell.answer === "Tuesday");
  const st = R.buildTiles(s, "x");
  const lower = st.map(t => ({ ...t, text: t.text.toLowerCase() }));
  assert.equal(R.grade(s, lower, solve(s, st)), false, "spelling is case-sensitive");
});

test("rules: quality 4/3/2/1, hint ladder, clock angles", () => {
  assert.deepEqual([1, 2, 3, 4, 9].map(R.qualityFor), [4, 3, 2, 1, 1]);
  const i = BANK.items[0];
  assert.equal(R.hintFor(i, 0), null);
  assert.equal(R.hintFor(i, 1), i.hint1En);
  assert.equal(R.hintFor(i, 3), i.hint2En);
  assert.deepEqual(R.clockAngles("9:50"), { hour: 295, minute: 300 });
});

test("storage: save, resume, finish moves to history, broken storage is reported", () => {
  const be = memoryBackend();
  const store = createStore(be);
  assert.equal(store.available, true);
  const s = newAttempt("60101");
  s.stepIndex = 7;
  assert.ok(store.save(s));
  assert.equal(store.load("60101").stepIndex, 7);
  assert.equal(store.load("60102"), null);
  store.finish(s);
  assert.equal(store.load("60101"), null);
  assert.equal(store.history("60101").length, 1);
  const broken = createStore({ getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() {} });
  assert.equal(broken.available, false);
  assert.equal(broken.save(newAttempt("60101")), false);
  assert.equal(broken.load("60101"), null);
});

test("playthrough: all items solved on try 1 → 32/32 first try, every battle quality 4", () => {
  const state = newAttempt("60101", new Date(0));
  for (const item of BANK.items) {
    const tiles = R.buildTiles(item, state.attemptId);
    assert.ok(R.grade(item, tiles, solve(item, tiles)));
    state.items[item.seq] = { attempts: 1, firstTryCorrect: true, finalCorrect: true, quality: R.qualityFor(1) };
  }
  for (const b of BANK.battles) state.battles[b.id] = { quality: R.battleQuality(BANK, b.id, state.items) };
  const s = R.summary(BANK, state);
  assert.equal(s.finished, 32);
  assert.equal(s.firstTry, 32);
  assert.ok(Object.values(state.battles).every(b => b.quality === 4));
});

test("ui source: answering screens carry no Chinese except the week-strip label", () => {
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  const itemUi = app.slice(app.indexOf("// ---- question".replace("----", "------------------------------------------------------------------")), app.indexOf("// ------------------------------------------------------------------ battle"));
  assert.ok(itemUi.length > 1000);
  assert.equal(/[一-鿿]/.test(itemUi), false);
  for (const i of BANK.items) {
    const texts = [i.contextEn, i.hint1En, i.hint2En, i.correctEn, ...i.lines.map(l => l.text), ...(i.distractors || [])];
    for (const t of texts) assert.equal(/[一-鿿]/.test(t), false, `${i.id}: ${t}`);
  }
});

test("ui source: story and battle buttons never use the shared data-act click handler (double-advance bug)", () => {
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  const story = app.slice(app.indexOf("function renderStory"), app.indexOf("// ------------------------------------------------------------------ question"));
  const battle = app.slice(app.indexOf("function renderBattle"), app.indexOf("// ------------------------------------------------------------------ result"));
  for (const [name, src] of [["story", story], ["battle", battle]])
    assert.equal(/data-act="(next|listen|check)"/.test(src), false, `${name} must use its own data attribute`);
});

test("content: every narration segment has word timings that match its text and run in order", () => {
  for (const s of Object.values(BANK.story)) {
    const n = s.lines.reduce((k, l) => k + l.split(/\s+/u).length, 0);
    assert.equal(s.tts.words?.length, n, `${s.id} word count`);
    for (let i = 1; i < n; i++) assert.ok(s.tts.words[i][0] >= s.tts.words[i - 1][0], `${s.id} word ${i} out of order`);
  }
});

test("content: every question has Tick's explanation audio and Next waits for it", () => {
  for (const i of BANK.items) {
    assert.equal(i.feedbackTts.text, i.correctEn, i.id);
    assert.equal(i.feedbackTts.requiresListen, true, i.id);
    assert.ok(existsSync(path.join(pub, i.feedbackTts.path)), i.feedbackTts.path);
  }
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  assert.match(app, /data-act="next" \$\{rec\.feedbackHeard \? "" : "disabled"\}/u);
});

test("result page: celebration sound is present with its CC0 license, and big ID + hero sway", () => {
  assert.ok(existsSync(path.join(pub, "assets/audio/sfx/celebrate.mp3")));
  assert.match(readFileSync(path.join(pub, "assets/audio/sfx/Kenney-Music-Jingles-License.txt"), "utf8"), /CC0/u);
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  assert.match(app, /class="big-id sway"/u);
  assert.match(app, /class="result-hero sway-slow"/u);
  assert.match(app, /const CELEBRATE = "assets\/audio\/sfx\/celebrate\.mp3"/u);
});

test("teacher dashboard: portal button, no passcode in code, rules keep english-portal and lock questAttempts", () => {
  const root = path.resolve(pub, "..");
  const portal = readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(portal, /<a class="teacher-link" href="teacher\/">教師後台<\/a>/u);
  const teacher = readFileSync(path.join(root, "teacher", "teacher.js"), "utf8");
  assert.match(teacher, /signInWithEmailAndPassword\(auth, TEACHER_EMAIL, code\)/u);
  assert.equal(/["'`]\d{6}["'`]/u.test(teacher), false, "no 6-digit literal in teacher.js");
  assert.match(teacher, /const retries = r => \(r\.items \|\| \[\]\)\.filter\(i => !i\.firstTryCorrect && i\.attempts > 0\)/u);
  const rules = readFileSync(path.join(root, "..", "firestore.rules.template"), "utf8");
  assert.match(rules, /match \/\{collection\}\/\{document=\*\*\} \{\s*allow read, write: if request\.auth != null && collection != 'questAttempts' && collection != 'questProgress';/u);
  assert.match(rules, /allow get, list: if isTeacher\(\);/u);
  assert.match(rules, /allow delete: if false;/u);
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  assert.match(app, /uploadAttempt\(cloudRecord\(state\)\)/u);
  assert.match(app, /uploadAttempt\(cloudRecord\(state\), \{ immediate: true \}\)/u);
});
