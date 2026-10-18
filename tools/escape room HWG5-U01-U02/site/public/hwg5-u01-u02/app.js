import { BANK } from "./data.js";
import * as R from "./rules.js";
import { createStore, newAttempt } from "./storage.js";
import { uploadAttempt, onCloudStatus, cloudStatus } from "../shared/quest-cloud.mjs";

const MISSION = "hwg5-u01-u02";

const STEPS = R.buildSteps(BANK);
const ITEM = Object.fromEntries(BANK.items.map(i => [i.seq, i]));
const store = createStore();
const app = document.getElementById("app");
const audio = new Audio();
audio.preload = "auto";

let state = null;
let savedOk = store.available;
let ui = {}; // per-screen transient state (selection, audio failures)
let karaokeStop = null; // stops the highlight loop when the screen changes

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const GEAR_ORDER = ["Monday Gear", "Tuesday Gear", "Wednesday Gear", "Thursday Gear", "Friday Gear", "Weekend Gears"];
const ITEM_ORDER = ["Paint Splash", "Music Note Shield", "Ruler Boomerang", "Textbook Guard", "Word Bubble",
  "Science Potion", "Speed Sneakers", "Globe Compass", "Mirror Shard"];

// Taiwan calendar day (YYYY-MM-DD); the teacher dashboard groups attempts by the days they were worked on
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

function persist() {
  const d = today();
  state.activeDays ||= [];
  if (!state.activeDays.includes(d)) state.activeDays.push(d);
  savedOk = store.save(state);
  uploadAttempt(cloudRecord(state));
}

// What the teacher dashboard receives: per-question tries (first-try-correct items stay in the
// record but the dashboard only lists the ones that needed retries), battle results and the summary.
function cloudRecord(s) {
  const sm = R.summary(BANK, s);
  return {
    mission: MISSION, studentId: s.studentId, attemptId: s.attemptId, startedAt: s.startedAt,
    updatedAt: new Date().toISOString(), completedAt: s.completedAt || null,
    stepIndex: s.stepIndex, stepCount: STEPS.length, version: 2,
    activeDays: (s.activeDays || [today()]).slice(-60),
    items: BANK.items.filter(i => s.items[i.seq]?.attempts).map(i => {
      const r = s.items[i.seq];
      return { seq: i.seq, id: i.bankId, type: i.type, attempts: r.attempts, wrong: r.wrong || 0,
        firstTryCorrect: !!r.firstTryCorrect, hintUsed: !!r.hintUsed, finalCorrect: !!r.finalCorrect };
    }),
    battles: Object.fromEntries(Object.entries(s.battles).map(([k, v]) => [k, {
      status: v.status, quality: v.quality ?? null, defeated: v.result?.defeated ?? null,
      phaseCleared: v.result?.phaseCleared ?? null, bossDefeated: v.result?.bossDefeated ?? null }])),
    summary: { ...sm, bossDefeated: !!s.battles.B11?.result?.bossDefeated },
    inventory: s.inventory.slice(0, 40),
  };
}
function stopAudio() {
  battleCleanup?.();
  audio.pause();
  karaokeStop?.();
  karaokeStop = null;
  audio.onended = audio.onerror = audio.onplaying = null;
}
function go(index) {
  stopAudio();
  state.stepIndex = index;
  persist();
  render();
}
function next() { go(state.stepIndex + 1); }

// ------------------------------------------------------------------ shared pieces
function hud() {
  const inv = state.inventory;
  const gearsLit = GEAR_ORDER.reduce((n, g) => n + (inv.includes(g) ? (g === "Weekend Gears" ? 2 : 1) : 0), 0);
  const gears = Array.from({ length: 7 }, (_, i) =>
    `<img class="gear ${i < gearsLit ? "lit" : ""}" src="${BANK.rewardIcons["Monday Gear"]}" alt="">`).join("");
  const items = ITEM_ORDER.map(name =>
    `<img class="slot ${inv.includes(name) ? "lit" : ""}" src="${BANK.rewardIcons[name]}" alt="${inv.includes(name) ? esc(name) : ""}" title="${inv.includes(name) ? esc(name) : ""}">`).join("");
  const pct = Math.round((state.stepIndex / (STEPS.length - 1)) * 100);
  return `<header class="hud">
    <button class="btn ghost home-btn" data-act="home" aria-label="Home">⌂ Home</button>
    <div class="gears" aria-label="Day gears ${gearsLit} of 7">${gears}</div>
    <div class="items" aria-label="Items">${items}</div>
    <div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
    <span class="saved ${savedOk ? "" : "bad"}">${savedOk ? "✓ Saved" : "Not saved"}<span class="cloud" data-cloud="${cloudStatus()}" title="Teacher record"></span></span>
  </header>`;
}

function weekStrip(ws) {
  if (!ws) return "";
  return `<ol class="week" aria-label="Week">${BANK.weekStripOrder.map(d => {
    const on = d === ws.highlight;
    const label = on && ws.zhLabel ? ws.zhLabel : BANK.weekStripLabels[d];
    return `<li class="${on ? "on" : ""} ${on && ws.zhLabel ? "zh" : ""}">${esc(label)}</li>`;
  }).join("")}</ol>`;
}

function clockSvg(c) {
  if (!c) return "";
  const a = R.clockAngles(c.time);
  const hand = (deg, len) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [c.cx + Math.cos(rad) * len, c.cy + Math.sin(rad) * len].map(v => v.toFixed(1));
  };
  // short thick dark hour hand + long thin blue minute hand: at 9:50 they sit only 5° apart
  const [hx, hy] = hand(a.hour, c.r * 0.46), [mx, my] = hand(a.minute, c.r * 0.84);
  return `<svg class="clock" viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden="true">
    <line x1="${c.cx}" y1="${c.cy}" x2="${mx}" y2="${my}" stroke="#2f6fd6" stroke-width="9" stroke-linecap="round"/>
    <line x1="${c.cx}" y1="${c.cy}" x2="${hx}" y2="${hy}" stroke="#1f2440" stroke-width="24" stroke-linecap="round"/>
    <circle cx="${c.cx}" cy="${c.cy}" r="13" fill="#c0392b"/></svg>`;
}

// ------------------------------------------------------------------ home
function renderHome(message = "") {
  stopAudio();
  state = null;
  app.innerHTML = `<main class="home" style="--hero:url('${BANK.home.image}')">
    <div class="home-card">
      <a class="back-link" href="../">← 所有任務 All missions</a>
      <h1>Ken and the<br>Frozen Clock Tower</h1>
      <p class="sub">HWG5 Unit 1 + Unit 2</p>
      <label class="id-label" for="sid">學號 Student ID</label>
      <input id="sid" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="60101">
      <div class="home-actions" id="homeActions"></div>
      <p class="msg" role="status">${esc(message)}</p>
      ${store.available ? "" : `<p class="msg bad">This browser cannot save. Progress will be lost if you leave.</p>`}
    </div></main>`;
  const input = app.querySelector("#sid");
  const actions = app.querySelector("#homeActions");
  const refresh = () => {
    const id = input.value.trim();
    const valid = R.STUDENT_ID.test(id);
    const existing = valid ? store.load(id) : null;
    actions.innerHTML = existing
      ? `<button class="btn primary" data-act="continue">▶ Continue</button>
         <button class="btn ghost" data-act="restart">↺ Start over</button>`
      : `<button class="btn primary" data-act="start" ${valid ? "" : "disabled"}>▶ Start</button>`;
  };
  input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, ""); refresh(); });
  actions.addEventListener("click", e => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    const id = input.value.trim();
    if (!act || !R.STUDENT_ID.test(id)) return;
    if (act === "continue") state = store.load(id);
    else {
      if (act === "restart" && !confirm("Start over? Your current progress will be replaced.")) return;
      state = newAttempt(id);
      persist();
    }
    render();
  });
  refresh();
  input.focus();
}

// ------------------------------------------------------------------ story
// Karaoke subtitles: every word is a span; while the audio plays, the spoken sentence is lit
// like a subtitle and the spoken word is highlighted. Timings come from content/align_narration.py.
function linesHtml(seg) {
  if (!seg.tts.words) return seg.lines.map(l => `<p>${esc(l)}</p>`).join("");
  let k = 0;
  return seg.lines.map((l, li) => `<p data-line="${li}">${l.split(/\s+/u)
    .map(w => `<span class="w" data-w="${k++}">${esc(w)}</span>`).join(" ")}</p>`).join("");
}

function startKaraoke(seg) {
  const spans = [...app.querySelectorAll(".lines .w")];
  const lines = [...app.querySelectorAll(".lines [data-line]")];
  const times = seg.tts.words;
  let raf = 0, last = -1;
  const paint = i => {
    if (i === last) return;
    last = i;
    spans.forEach((el, k) => { el.classList.toggle("now", k === i); el.classList.toggle("done", k < i); });
    const li = i >= 0 ? Number(spans[i].parentElement.dataset.line) : -1;
    lines.forEach((el, k) => el.classList.toggle("cur", k === li));
    if (li >= 0) lines[li].scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const tick = () => {
    const t = audio.currentTime;
    let i = -1;
    for (let k = 0; k < times.length; k++) if (times[k][0] <= t) i = k; else break;
    paint(i);
    raf = requestAnimationFrame(tick);
  };
  const stop = () => { cancelAnimationFrame(raf); last = -2; paint(-1); };
  return {
    run() { cancelAnimationFrame(raf); last = -2; karaokeStop = () => cancelAnimationFrame(raf); tick(); },
    stop,
  };
}
function renderStory(segId) {
  const seg = BANK.story[segId];
  const done = Boolean(state.listened[segId]);
  ui = { failures: 0 };
  app.innerHTML = `${hud()}<main class="screen story">
    <figure class="pic"><img src="${seg.image}" alt=""></figure>
    <section class="panel">
      <h2>${esc(seg.title)}</h2>
      <div class="lines ${seg.tts.words ? "karaoke" : ""}">${linesHtml(seg)}</div>
      <dl class="gloss">${seg.gloss.map(g => `<div><dt>${esc(g.en)}</dt><dd>${esc(g.zh)}</dd></div>`).join("")}</dl>
      <div class="row">
        <button class="btn listen" data-story="listen">${done ? "↻ Listen again" : "▶ Listen"}</button>
        <button class="btn primary" data-story="next" ${done ? "" : "disabled"}>Next ▶</button>
      </div>
      <p class="msg" role="status" id="audioMsg">${done ? "" : "Listen to the story to go on."}</p>
      <p class="disclosure">${esc(BANK.narrationTts.disclosure)}</p>
    </section></main>`;
  const listenBtn = app.querySelector("[data-story=listen]");
  const nextBtn = app.querySelector("[data-story=next]");
  const msg = app.querySelector("#audioMsg");
  const karaoke = seg.tts.words ? startKaraoke(seg) : null;
  const unlock = how => {
    if (!state.listened[segId]) { state.listened[segId] = how; persist(); }
    nextBtn.disabled = false;
  };
  const fail = () => {
    ui.failures++;
    listenBtn.disabled = false;
    listenBtn.textContent = "↻ Try again";
    if (ui.failures >= 2) {
      unlock("fallback");
      msg.textContent = "The audio did not play. Read the story, then tap Next.";
    } else msg.textContent = "The audio did not load. Tap Try again.";
  };
  listenBtn.addEventListener("click", () => {
    stopAudio();
    audio.src = seg.tts.path;
    audio.playbackRate = 1.0; // speed 0.8 is already in the MP3
    audio.onplaying = () => { listenBtn.disabled = true; listenBtn.textContent = "♪ Playing…"; msg.textContent = ""; karaoke?.run(); };
    audio.onended = () => { listenBtn.disabled = false; listenBtn.textContent = "↻ Listen again"; karaoke?.stop(); unlock("ended"); };
    audio.onerror = () => { karaoke?.stop(); fail(); };
    audio.play().catch(err => { if (err?.name !== "AbortError") fail(); });
  });
  nextBtn.addEventListener("click", next);
}

// ------------------------------------------------------------------ question
function record(seq) {
  return (state.items[seq] ||= { attempts: 0, wrong: 0, firstTryCorrect: false, hintUsed: false, finalCorrect: false, quality: 0, placed: null, feedbackHeard: null });
}

function renderItem(seq) {
  const item = ITEM[seq];
  const rec = record(seq);
  const tiles = R.buildTiles(item, state.attemptId);
  const n = R.slotCount(item);
  if (!Array.isArray(rec.placed) || rec.placed.length !== n) rec.placed = Array(n).fill(null);
  ui = { selected: null, tiles, item, rec };
  draw();
}

function slotHtml(i) {
  const { tiles, rec } = ui;
  const t = tiles.find(x => x.id === rec.placed[i]);
  const locked = rec.finalCorrect ? "disabled" : "";
  return `<button class="slot-btn ${t ? "filled" : ""}" data-slot="${i}" ${locked} aria-label="${t ? esc(t.text) : "empty"}">${t ? esc(t.text) : ""}</button>`;
}

function dialogueHtml() {
  const { item } = ui;
  if (item.type === "spell") {
    let k = 0;
    const groups = item.spell.groups.map(len =>
      `<span class="word">${Array.from({ length: len }, () => slotHtml(k++)).join("")}</span>`).join("");
    return `<p class="say"><b>Tick:</b> Spell the word.</p><div class="spell">${groups}</div>`;
  }
  return item.lines.map(l => `<p class="say"><b>${esc(l.speaker)}:</b> ${esc(l.text).replace(/\{(\d)\}/g, (_, d) => slotHtml(Number(d) - 1))}</p>`).join("");
}

function feedbackHtml() {
  const { item, rec } = ui;
  if (rec.finalCorrect) {
    const playing = ui.fbPlaying;
    return `<div class="fb good"><img src="assets/images/mascots/tick-correct.webp" alt="">
      <p>${esc(item.correctEn)}</p>
      <button class="btn listen speaker ${rec.feedbackHeard ? "" : "pulse"}" data-act="fbplay" ${playing ? "disabled" : ""} aria-label="Listen to Tick">${playing ? "♪" : "🔊"}</button></div>
      ${rec.feedbackHeard ? "" : `<p class="msg">${esc(ui.fbMsg || "Tap 🔊 to hear Tick, then tap Next.")}</p>`}`;
  }
  const hint = R.hintFor(item, rec.wrong);
  if (!hint) return "";
  const pic = rec.wrong === 1 ? "tick-hint" : "tick-tryagain";
  return `<div class="fb try"><img src="assets/images/mascots/${pic}.webp" alt=""><p><b>Try again.</b> ${esc(hint)}</p></div>`;
}

function draw() {
  const { item, tiles, rec } = ui;
  const used = new Set(rec.placed.filter(Boolean));
  const pool = tiles.map(t => used.has(t.id) ? `<span class="tile ghost"></span>`
    : `<button class="tile ${ui.selected === t.id ? "sel" : ""} ${item.type === "spell" ? "letter" : ""}" data-tile="${t.id}" ${rec.finalCorrect ? "disabled" : ""}>${esc(t.text)}</button>`).join("");
  app.innerHTML = `${hud()}<main class="screen item type-${item.type}">
    <section class="left">
      ${weekStrip(item.weekStrip)}
      <figure class="pic ${item.mirrorFrame ? "mirror" : ""}"><img src="${item.image}" alt="">${clockSvg(item.clock)}</figure>
      <p class="context">${esc(item.contextEn)}</p>
    </section>
    <section class="panel">
      <div class="dialogue">${dialogueHtml()}</div>
      <div class="pool" aria-label="Answer cards">${pool}</div>
      <div class="row">
        ${rec.finalCorrect
          ? `<button class="btn primary" data-act="next" ${rec.feedbackHeard ? "" : "disabled"}>Next ▶</button>`
          : `<button class="btn ghost" data-act="clear">Clear</button>
             <button class="btn primary" data-act="check" ${R.isComplete(item, rec.placed) ? "" : "disabled"}>Check ✓</button>`}
      </div>
      <div id="fb" role="status">${feedbackHtml()}</div>
    </section></main>`;
}

function place(tileId, slot) {
  const { rec } = ui;
  const old = rec.placed.indexOf(tileId);
  if (old >= 0) rec.placed[old] = null;
  rec.placed[slot] = tileId;
  ui.selected = null;
  draw();
}

function tapTile(tileId) {
  const { item, rec } = ui;
  if (item.type === "spell") {
    const empty = rec.placed.indexOf(null);
    if (empty >= 0) return place(tileId, empty);
  }
  ui.selected = ui.selected === tileId ? null : tileId;
  draw();
}

function tapSlot(slot) {
  const { rec } = ui;
  if (ui.selected) return place(ui.selected, slot);
  if (rec.placed[slot]) { rec.placed[slot] = null; draw(); }
}

function check() {
  const { item, tiles, rec } = ui;
  if (!R.isComplete(item, rec.placed) || rec.finalCorrect) return;
  rec.attempts++;
  if (R.grade(item, tiles, rec.placed)) {
    rec.finalCorrect = true;
    rec.firstTryCorrect = rec.attempts === 1;
    rec.quality = R.qualityFor(rec.attempts);
  } else {
    rec.wrong++;
    rec.hintUsed = true;
  }
  persist();
  draw();
}

// Tick reads the explanation; Next unlocks only after the clip plays to the end (2 failed loads → unlock)
function playFeedback() {
  const { item, rec } = ui;
  stopAudio();
  ui.fbFailures ||= 0;
  const done = how => { ui.fbPlaying = false; if (!rec.feedbackHeard) { rec.feedbackHeard = how; persist(); } draw(); };
  const fail = () => {
    ui.fbPlaying = false;
    ui.fbFailures++;
    if (ui.fbFailures >= 2) { ui.fbMsg = ""; return done("fallback"); }
    ui.fbMsg = "The audio did not load. Tap 🔊 again.";
    draw();
  };
  audio.src = item.feedbackTts.path;
  audio.playbackRate = 1.0;
  audio.onplaying = () => { ui.fbPlaying = true; ui.fbMsg = ""; draw(); };
  audio.onended = () => done("ended");
  audio.onerror = fail;
  audio.play().catch(err => { if (err?.name !== "AbortError") fail(); });
}

// pointer drag (touch + mouse) with tap fallback
let drag = null;
app.addEventListener("pointerdown", e => {
  const tile = e.target.closest(".tile[data-tile]");
  if (!tile || tile.disabled) return;
  drag = { id: tile.dataset.tile, x: e.clientX, y: e.clientY, ghost: null, src: tile };
});
window.addEventListener("pointermove", e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
    drag.ghost = drag.src.cloneNode(true);
    drag.ghost.classList.add("drag-ghost");
    document.body.append(drag.ghost);
  }
  if (drag.ghost) { drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`; e.preventDefault(); }
}, { passive: false });
window.addEventListener("pointerup", e => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.ghost) return; // a tap: handled by click
  d.ghost.remove();
  ui.suppressClick = true;
  const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-slot]");
  if (slot && !slot.disabled) place(d.id, Number(slot.dataset.slot));
});
window.addEventListener("pointercancel", () => { drag?.ghost?.remove(); drag = null; });

app.addEventListener("click", e => {
  if (ui.suppressClick) { ui.suppressClick = false; return; }
  const el = e.target.closest("[data-tile],[data-slot],[data-act]");
  if (!el || el.disabled) return;
  if (el.dataset.act === "home") return renderHome();
  if (!state) return;
  const step = STEPS[state.stepIndex];
  if (step.kind !== "item") return;
  if (el.dataset.tile) return tapTile(el.dataset.tile);
  if (el.dataset.slot) return tapSlot(Number(el.dataset.slot));
  if (el.dataset.act === "check") return check();
  if (el.dataset.act === "fbplay") return playFeedback();
  if (el.dataset.act === "clear") { ui.rec.placed.fill(null); ui.selected = null; return draw(); }
  if (el.dataset.act === "next") return next();
});

// ------------------------------------------------------------------ battle (Godot placeholder)
// The real Godot battle runs in game/index.html (iframe). The site stays the authority for learning
// scores; the game only reports combat results. Messages are checked for origin, source, channel,
// instance and runId. Rewards for the questions just answered are active in this battle; skipping is
// allowed and recorded as "skipped" (never shown as a win).
const BATTLE_CHANNEL = "clocktower-battle-v1";
let battleCleanup = null;

function battleLoadout(id, quality) {
  const b = BANK.battles.find(x => x.id === id);
  const items = {};
  let gears = 0;
  const add = (r, q) => {
    if (r.endsWith(" Gear")) gears += 1;
    else if (r === "Weekend Gears") gears += 2;
    else if (r !== "Mirror Shard" && r !== "Clock Restarted") items[r] = Math.max(items[r] || 0, q);
  };
  for (const [bid, rec] of Object.entries(state.battles)) if (bid !== id) for (const r of rec.rewards || []) add(r, rec.quality || 1);
  for (const r of b.rewards) add(r, quality);
  return { items, gears: Math.min(7, gears), mirror: state.inventory.includes("Mirror Shard") };
}

const sfx = (() => {
  let ctx = null;
  const last = {};
  const tones = { shot: [880, 0.04, 0.02], defeat: [520, 0.08, 0.05], hurt: [160, 0.18, 0.08], skill: [660, 0.35, 0.08],
    warning: [300, 0.2, 0.04], "boss-warning": [220, 0.3, 0.06], impact: [120, 0.15, 0.06], heal: [740, 0.25, 0.05],
    block: [1000, 0.05, 0.03], "shield-break": [400, 0.4, 0.08], "boss-phase": [250, 0.6, 0.08], victory: [784, 0.7, 0.08], end: [392, 0.5, 0.06] };
  return {
    unlock() { try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch { ctx = null; } },
    play(kind) {
      const t = tones[kind];
      if (!ctx || !t) return;
      const now = ctx.currentTime;
      if (kind === "shot" && now - (last.shot || 0) < 0.12) return;
      last[kind] = now;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kind === "hurt" || kind === "impact" ? "sawtooth" : "triangle";
      o.frequency.setValueAtTime(t[0], now);
      if (kind === "victory" || kind === "skill") o.frequency.exponentialRampToValueAtTime(t[0] * 1.5, now + t[1]);
      g.gain.setValueAtTime(t[2], now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t[1]);
      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + t[1] + 0.02);
    },
  };
})();

function battleSummary(rec) {
  if (rec.status === "skipped") return "Battle skipped. Your rewards are saved.";
  if (rec.status === "placeholder") return "Rewards collected.";
  const g = rec.result || {};
  const boss = g.battle >= 10
    ? (g.battle === 10 ? (g.phaseCleared ? " The gear shield broke!" : " Time Muncher is still strong.")
                       : (g.bossDefeated ? " You beat Time Muncher!" : " Time Muncher got away this time."))
    : "";
  return `${g.battle >= 10 ? "" : "Battle clear! "}Defeated ${g.defeated ?? 0} · Skills ${g.skillUses ?? 0}.${boss}`;
}

function renderBattle(id) {
  battleCleanup?.();
  const b = BANK.battles.find(x => x.id === id);
  const done = state.battles[id];
  const quality = done?.quality ?? R.battleQuality(BANK, id, state.items);
  const stars = q => "★".repeat(q) + "☆".repeat(4 - q);
  const instance = `${state.attemptId}-${id}-${Date.now().toString(36)}`;
  const runId = `${instance}-run`;
  app.innerHTML = `${hud()}<main class="screen battle">
    <div class="stage">
      ${done ? `<div class="arena-still" style="--arena:url('${BANK.arenaImages[id]}')"></div>`
             : `<iframe id="game" title="Clock tower battle" src="game/index.html?instance=${encodeURIComponent(instance)}" allow="autoplay"></iframe>`}
      <div class="card" id="battleCard">
        <p class="kicker">${b.boss ? `Boss battle · Phase ${b.phase}` : "Battle"} · ${esc(b.arena)}</p>
        <h2>${esc(b.intro)}</h2>
        <div class="rewards">${b.rewards.map(r => `<div class="reward"><img src="${BANK.rewardIcons[r]}" alt=""><span>${esc(r)}</span><em aria-label="quality ${quality} of 4">${stars(quality)}</em></div>`).join("")}</div>
        <p class="notice" id="battleMsg">${done ? battleSummary(done) : "Loading the battle… 0%"}</p>
        <div class="row" id="battleRow">
          ${done ? `<button class="btn primary" data-battle="next">Continue ▶</button>`
                 : `<button class="btn primary" data-battle="start" disabled>▶ Start battle</button>
                    <button class="btn ghost" data-battle="skip">Skip battle</button>`}
        </div>
      </div>
    </div></main>`;
  const card = app.querySelector("#battleCard");
  const msg = app.querySelector("#battleMsg");
  const record = (status, result = null) => {
    if (state.battles[id]) return;
    state.battles[id] = { status, quality, rewards: b.rewards, result };
    for (const r of b.rewards) if (!state.inventory.includes(r)) state.inventory.push(r);
    persist();
  };
  app.querySelector("[data-battle=next]")?.addEventListener("click", next);
  if (done) return;

  const frame = app.querySelector("#game");
  const startBtn = app.querySelector("[data-battle=start]");
  let started = false;
  const send = phase => frame.contentWindow?.postMessage({ channel: BATTLE_CHANNEL, instance,
    host: { id: runId, battle: Number(id.slice(1)), ...battleLoadout(id, quality), phase,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, mobile: matchMedia("(pointer: coarse)").matches } }, location.origin);
  const onMessage = e => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    const d = e.data;
    if (d?.channel !== BATTLE_CHANNEL || d.instance !== instance) return;
    const ev = d.event || {};
    if (ev.type === "progress") { if (!started) msg.textContent = `Loading the battle… ${ev.percent}%`; return; }
    if (ev.type === "ready") { startBtn.disabled = false; msg.textContent = "Ready! Use the arrows to move. Tap TICK TOCK for a big burst."; send("paused"); return; }
    if (ev.type === "error") { if (!started) msg.textContent = "The battle could not load. You can skip it and keep going."; return; }
    if (ev.runId !== runId) return;
    if (ev.type === "sound") sfx.play(ev.kind);
    if (ev.type === "done") {
      record("done", ev.game);
      card.hidden = false;
      msg.textContent = battleSummary(state.battles[id]);
      app.querySelector("#battleRow").innerHTML = `<button class="btn primary" data-battle="next">Continue ▶</button>`;
      app.querySelector("[data-battle=next]").addEventListener("click", next);
      app.querySelector(".hud").outerHTML = hud();
    }
  };
  const onKey = e => { if (started && frame.contentWindow?.relayParentKey) frame.contentWindow.relayParentKey(e, e.type === "keydown"); };
  window.addEventListener("message", onMessage);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  battleCleanup = () => {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", onKey);
    battleCleanup = null;
  };
  startBtn.addEventListener("click", () => {
    sfx.unlock();
    started = true;
    card.hidden = true;
    send("playing");
    frame.focus();
  });
  app.querySelector("[data-battle=skip]").addEventListener("click", () => {
    if (!confirm("Skip this battle? You still get the rewards.")) return;
    record("skipped");
    next();
  });
}

// ------------------------------------------------------------------ result
// Result page: big student ID + this run's hero (Ken), both gently swaying, and a celebration sound.
// The sound starts inside the click that opened the page (allowed on iPad) and can be replayed.
const CELEBRATE = "assets/audio/sfx/celebrate.mp3";

function celebrate() {
  stopAudio();
  audio.src = CELEBRATE;
  audio.playbackRate = 1.0;
  audio.play().catch(() => { /* no sound file or blocked: the page still works */ });
}

function renderResult() {
  const s = R.summary(BANK, state);
  const snapshot = state;
  if (!state.completedAt) {
    savedOk = store.finish(state);
    uploadAttempt(cloudRecord(state), { immediate: true });
  }
  const b11 = snapshot.battles.B11;
  const bossLine = !b11 ? "" : b11.status === "skipped" ? "The final battle was skipped."
    : b11.result?.bossDefeated ? "You beat Time Muncher!" : "Time Muncher got away this time.";
  app.innerHTML = `<main class="screen result" style="--arena:url('${BANK.arenaImages.VICTORY}')">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
    <figure class="result-hero sway-slow"><img src="assets/images/characters/ken.webp" alt="Ken"><img class="result-tick" src="assets/images/mascots/tick-correct.webp" alt=""></figure>
    <section class="panel center result-card">
      <h2>Mission Complete!</h2>
      <p class="big-id sway" aria-label="Student ${esc(snapshot.studentId)}">${esc(snapshot.studentId)}</p>
      <p class="hero-name">with <b>Ken</b> and <b>Tick</b></p>
      ${bossLine ? `<p class="boss-line">${esc(bossLine)}</p>` : ""}
      <div class="stats">
        <div><b>${s.finished}/${s.total}</b><span>Questions done</span></div>
        <div><b>${s.firstTry}/${s.total}</b><span>Right on the first try</span></div>
        <div><b>${s.battlesDone}/${BANK.battles.length}</b><span>Battles</span></div>
      </div>
      <div class="items done">${snapshot.inventory.map(r => `<img class="slot lit" src="${BANK.rewardIcons[r]}" alt="${esc(r)}" title="${esc(r)}">`).join("")}</div>
      <p class="msg">${savedOk ? "✓ Saved" : "Not saved"}</p>
      <div class="row">
        <button class="btn listen" id="replayCheer" aria-label="Play the celebration again">🎉 Cheer again</button>
        <button class="btn primary" data-act="home">⌂ Home</button>
      </div>
    </section></main>`;
  app.querySelector("#replayCheer").addEventListener("click", celebrate);
  celebrate();
}

// ------------------------------------------------------------------ router
function render() {
  if (!state) return renderHome();
  const step = STEPS[state.stepIndex] || STEPS.at(-1);
  if (step.kind === "story") return renderStory(step.seg);
  if (step.kind === "item") return renderItem(step.seq);
  if (step.kind === "battle") return renderBattle(step.id);
  return renderResult();
}

window.addEventListener("pagehide", () => { if (state && !state.completedAt) persist(); });
onCloudStatus(st => { for (const el of document.querySelectorAll("[data-cloud]")) el.dataset.cloud = st; });
renderHome();
