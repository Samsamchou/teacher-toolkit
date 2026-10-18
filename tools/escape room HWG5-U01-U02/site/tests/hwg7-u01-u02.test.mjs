// HWG7 U01+U02 "Ken and the World Map Mix-Up" — same checks as site.test.mjs (HWG5), adapted.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BANK } from "../public/hwg7-u01-u02/data.js";
import * as R from "../public/hwg7-u01-u02/rules.js";
import { createStore, newAttempt } from "../public/hwg7-u01-u02/storage.js";
import { MISSIONS } from "../public/shared/missions.mjs";

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "hwg7-u01-u02");
const project = path.resolve(pub, "..", "..", "..", "..", "escape room HWG7-U01-U02");
const bankJson = JSON.parse(readFileSync(path.join(project, "content", "question-bank.v0.1.json"), "utf8"));
const plan = JSON.parse(readFileSync(path.join(project, "content", "battle-plan.json"), "utf8"));

function memoryBackend() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}
function solve(item, tiles) {
  const pool = tiles.slice();
  const want = item.type === "spell" ? [...item.spell.answer.replaceAll(" ", "")] : item.blanks.map(b => b.answer);
  return want.map(w => { const i = pool.findIndex(t => t.text === w); return pool.splice(i, 1)[0].id; });
}

test("content: 28 items (11 spell, 17 drag) match the generated bank", () => {
  assert.equal(BANK.items.length, 28);
  assert.equal(BANK.items.filter(i => i.type === "spell").length, 11);
  assert.deepEqual(BANK.items.map(i => i.bankId), bankJson.items.map(i => i.bankId));
  for (const i of BANK.items.filter(i => i.type === "drag")) assert.ok(i.distractors.length >= 2, i.id);
  assert.ok(BANK.items.some(i => i.type === "spell" && i.spell.answer === "the USA"), "the USA spelled in lower case (teacher decision)");
});

test("content: every referenced asset exists", () => {
  const paths = [BANK.home.image, ...Object.values(BANK.arenaImages), ...Object.values(BANK.rewardIcons),
    ...Object.values(BANK.story).flatMap(s => [s.image, s.tts.path]), ...BANK.items.map(i => i.image),
    ...["tick-hint", "tick-correct", "tick-tryagain"].map(n => `assets/images/mascots/${n}.webp`),
    "assets/images/characters/ken.webp", "assets/fonts/ComicRelief-Regular.woff2", "assets/fonts/ComicRelief-Bold.woff2",
    "game/index.html", "game/engine.pck", "game/engine.wasm", "game/engine.js"];
  for (const p of paths) assert.ok(existsSync(path.join(pub, p)), p);
});

test("content: no week strip or clock in this mission; every reward has an icon", () => {
  for (const i of BANK.items) { assert.equal(i.weekStrip, null, i.id); assert.ok(!i.clock, i.id); }
  for (const b of BANK.battles) for (const r of b.rewards) assert.ok(BANK.rewardIcons[r], r);
  assert.equal(BANK.pinOrder.length, 7);
});

test("content: story segments must be listened to, narration marin 0.8 with matching word timings", () => {
  assert.equal(BANK.narrationTts.speed, 0.8);
  assert.equal(BANK.narrationTts.voice, "marin");
  for (const s of Object.values(BANK.story)) {
    assert.equal(s.requiresListen, true);
    assert.equal(s.tts.text, s.lines.join(" "));
    const n = s.lines.reduce((k, l) => k + l.split(/\s+/u).length, 0);
    assert.equal(s.tts.words?.length, n, `${s.id} word count`);
    for (let i = 1; i < n; i++) assert.ok(s.tts.words[i][0] >= s.tts.words[i - 1][0], `${s.id} word ${i} out of order`);
  }
});

test("rules: flow = 6 stories + 28 items + 10 battles + result, battles where the teacher's plan puts them", () => {
  const steps = R.buildSteps(BANK);
  assert.equal(steps.filter(s => s.kind === "story").length, 6);
  assert.equal(steps.filter(s => s.kind === "item").length, 28);
  assert.equal(steps.filter(s => s.kind === "battle").length, 10);
  assert.equal(steps.at(-1).kind, "result");
  assert.deepEqual(steps.at(-2), { kind: "story", seg: "SEG-06" });
  let done = 0;
  const after = [];
  for (const s of steps) { if (s.kind === "item") done++; if (s.kind === "battle") after.push(done); }
  assert.deepEqual(after, plan.rows.map(r => r.afterQuestion));
  assert.deepEqual(BANK.battles.map(b => b.seconds), plan.rows.map(r => Number(r.seconds)));
});

test("rules: tiles are seeded and contain the answers; spelling is case-sensitive", () => {
  for (const item of BANK.items) {
    const a = R.buildTiles(item, "seed-1"), b = R.buildTiles(item, "seed-1");
    assert.deepEqual(a, b);
    assert.ok(R.grade(item, a, solve(item, a)), item.id);
  }
  const s = BANK.items.find(i => i.type === "spell" && i.spell.answer === "the USA");
  const st = R.buildTiles(s, "x");
  const upper = st.map(t => ({ ...t, text: t.text.toUpperCase() }));
  assert.equal(R.grade(s, upper, solve(s, st)), false);
});

test("storage: own key prefix, save, resume, finish", () => {
  const be = memoryBackend();
  const store = createStore(be);
  const s = newAttempt("60101");
  s.stepIndex = 7;
  assert.ok(store.save(s));
  assert.ok([...be.m.keys()].every(k => k.startsWith("hwg7-worldmap:v1:")), "must not share HWG5's saves");
  assert.equal(store.load("60101").stepIndex, 7);
  store.finish(s);
  assert.equal(store.load("60101"), null);
});

test("playthrough: all first try → 28/28, every battle quality 4", () => {
  const state = newAttempt("60101", new Date(0));
  for (const item of BANK.items) state.items[item.seq] = { attempts: 1, firstTryCorrect: true, finalCorrect: true, quality: 4 };
  const s = R.summary(BANK, state);
  assert.equal(s.firstTry, 28);
  for (const b of BANK.battles) assert.equal(R.battleQuality(BANK, b.id, state.items), 4);
});

test("ui source: no Chinese on answering screens, own channel, boss ids from the bank", () => {
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  const itemUi = app.slice(app.indexOf("// ------------------------------------------------------------------ question"), app.indexOf("// ------------------------------------------------------------------ battle"));
  assert.ok(itemUi.length > 1000);
  assert.equal(/[一-鿿]/.test(itemUi), false);
  for (const i of BANK.items)
    for (const t of [i.contextEn, i.hint1En, i.hint2En, i.correctEn, ...i.lines.map(l => l.text), ...(i.distractors || [])])
      assert.equal(/[一-鿿]/.test(t), false, `${i.id}: ${t}`);
  assert.match(app, /const MISSION = "hwg7-u01-u02";/u);
  assert.match(app, /const BATTLE_CHANNEL = "worldmap-battle-v1";/u);
  assert.equal(/B11|Time Muncher|clocktower/u.test(app), false, "no HWG5 leftovers");
  const shell = readFileSync(path.join(pub, "game", "index.html"), "utf8");
  assert.match(shell, /const CHANNEL = "worldmap-battle-v1";/u);
});

test("ui source: story/battle buttons use their own data attributes; Next waits for Tick", () => {
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  const story = app.slice(app.indexOf("function renderStory"), app.indexOf("// ------------------------------------------------------------------ question"));
  const battle = app.slice(app.indexOf("function renderBattle"), app.indexOf("// ------------------------------------------------------------------ result"));
  for (const src of [story, battle]) assert.equal(/data-act="(next|listen|check)"/.test(src), false);
  assert.match(app, /data-act="next" \$\{rec\.feedbackHeard \? "" : "disabled"\}/u);
  for (const i of BANK.items) assert.ok(existsSync(path.join(pub, i.feedbackTts.path)), i.feedbackTts.path);
});

test("teacher dashboard + portal: mission registered, card open, uploads kept", () => {
  assert.ok(MISSIONS.some(m => m.slug === "hwg7-u01-u02"));
  const portal = readFileSync(path.resolve(pub, "..", "index.html"), "utf8");
  assert.match(portal, /<a class="mission open" href="hwg7-u01-u02\/">/u);
  const app = readFileSync(path.join(pub, "app.js"), "utf8");
  assert.match(app, /uploadAttempt\(cloudRecord\(state\)\)/u);
  assert.match(app, /uploadAttempt\(cloudRecord\(state\), \{ immediate: true \}\)/u);
});
