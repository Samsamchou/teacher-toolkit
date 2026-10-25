// 二水小行星逛街版 — 個人模式的學號外框（老師 2026-10-26 v3：1C 個人／分組、2A 教師後台）。
// 學號（5–8 位數字）→ 遊戲（iframe ../ershui-planet/index.html）→ 結果頁。
// 和 ../shared/quest3d-app.mjs 同一套雲端（quest-cloud.mjs）：
//   - questProgress：用學號讀寫，換一台 iPad 也能接著玩（cleared 存 "mode:ken"、"set:2"、"seed:123456"）
//   - questAttempts：教師後台紀錄（人物模式、路線、第幾題、答對幾題、分數、最後遊玩時間）
// 只存學號與成績，不存姓名。計分：每題答對 +10，滿分 120（12 題），答錯不扣分。
// 共用外框 quest3d-app.mjs 是正式任務在用的，這裡另寫一份，不動它。
import { uploadAttempt, loadProgress, saveProgress } from "../shared/quest-cloud.mjs";

let BANK = null;
let MISSION = "";
const KEY = sid => `quest3d:v1:${MISSION}:${sid}`;
const STUDENT_ID = /^\d{5,8}$/u;
const ITEM_ID = /^q(0[1-9]|1[0-2])$/u;
const app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const clip = (s, n = 80) => String(s ?? "").slice(0, n);
let state = null;

// ------------------------------------------------------------------ storage
const local = {
  load(sid) { try { const r = localStorage.getItem(KEY(sid)); return r ? JSON.parse(r) : null; } catch { return null; } },
  save(s) { try { localStorage.setItem(KEY(s.studentId), JSON.stringify(s)); } catch { /* private mode: cloud still works */ } },
};
function newAttempt(studentId) {
  const now = new Date();
  return { studentId, attemptId: `${studentId}-${now.getTime().toString(36)}`, startedAt: now.toISOString(),
    updatedAt: now.toISOString(), results: {}, cleared: [], activeDays: [] };
}
const newer = (a, b) => (!a ? b : !b ? a : String(a.updatedAt) >= String(b.updatedAt) ? a : b);
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

// ------------------------------------------------------------------ run info + score
function runOf(s) {
  const run = {};
  for (const c of s.cleared || []) {
    const i = String(c).indexOf(":");
    if (i > 0) run[c.slice(0, i)] = c.slice(i + 1);
  }
  return run;
}
const answered = s => BANK.items.filter(i => s.results[i.id]).length;
const correct = s => BANK.items.filter(i => s.results[i.id]?.finalCorrect).length;
const scoreOf = s => correct(s) * BANK.pointsPer;
function runLabel(s) {
  const run = runOf(s);
  const mode = BANK.modes[run.mode] || run.mode || "—";
  const route = BANK.routes[Number(run.set)] || "—";
  return { mode, route };
}
function summaryOf(s) {
  const { mode, route } = runLabel(s);
  const n = answered(s);
  return {
    total: BANK.items.length, finished: n, firstTry: correct(s), correct: correct(s),
    attempts: n, hintsUsed: 0, battlesDone: 0, score: scoreOf(s), maxScore: BANK.maxScore,
    mode: runOf(s).mode || "", route: Number(runOf(s).set ?? -1), modeLabel: mode, routeLabel: route,
    current: s.completedAt ? n : Math.min(n + 1, BANK.items.length),
    note: `${mode}・${route}・${s.completedAt ? "完成" : `第 ${Math.min(n + 1, BANK.items.length)}/${BANK.items.length} 題`}`,
  };
}

// What the teacher dashboard receives (same collection and shape as the other 3D missions).
function cloudRecord(s) {
  return {
    mission: MISSION, studentId: s.studentId, attemptId: s.attemptId, startedAt: s.startedAt,
    updatedAt: s.updatedAt, completedAt: s.completedAt || null,
    stepIndex: answered(s), stepCount: BANK.items.length, version: 1,
    activeDays: s.activeDays.slice(-60),
    items: BANK.items.filter(i => s.results[i.id]).map(i => {
      const r = s.results[i.id];
      return { seq: i.seq, id: i.id, type: i.type, attempts: 1, wrong: r.finalCorrect ? 0 : 1,
        firstTryCorrect: !!r.finalCorrect, hintUsed: false, finalCorrect: !!r.finalCorrect,
        quality: r.finalCorrect ? 4 : 0, q: clip(r.q), a: clip(r.a), pick: clip(r.pick) };
    }),
    battles: {},
    summary: summaryOf(s),
  };
}
function progressRecord(s) {
  return { mission: MISSION, studentId: s.studentId, attemptId: s.attemptId, startedAt: s.startedAt,
    updatedAt: s.updatedAt, completedAt: s.completedAt || null, results: s.results, cleared: s.cleared,
    version: 1, activeDays: s.activeDays.slice(-60) };
}
function persist(immediate = false) {
  state.updatedAt = new Date().toISOString();
  const d = today();
  if (!state.activeDays.includes(d)) state.activeDays.push(d);
  local.save(state);
  saveProgress(progressRecord(state), { immediate });
  uploadAttempt(cloudRecord(state), { immediate });
}

// ------------------------------------------------------------------ bridge used by the Godot game
window.ershuiHost = {
  getInitial() {
    return state ? { studentId: state.studentId, results: state.results, cleared: state.cleared } : {};
  },
  report(json) {
    if (!state) return;
    let m;
    try { m = JSON.parse(json); } catch { return; }
    if (m.type === "start" && typeof m.mode === "string" && Number.isInteger(m.set) && Number.isInteger(m.seed)) {
      // 新的一輪：上一輪已經有作答（或已完成）就開一筆新的紀錄，舊的留在教師後台
      if (Object.keys(state.results).length || state.completedAt) state = newAttempt(state.studentId);
      state.cleared = [`mode:${clip(m.mode, 12)}`, `set:${m.set}`, `seed:${m.seed}`];
      state.results = {};
      state.completedAt = null;
      persist(true);
    } else if (m.type === "item" && ITEM_ID.test(m.id) && m.result) {
      state.results[m.id] = { attempts: 1, wrong: m.result.finalCorrect ? 0 : 1, firstTry: !!m.result.finalCorrect,
        hintUsed: false, quality: m.result.finalCorrect ? 4 : 0, finalCorrect: !!m.result.finalCorrect,
        q: clip(m.q), a: clip(m.a), pick: clip(m.pick) };
      persist();
    } else if (m.type === "complete") {
      state.completedAt = new Date().toISOString();
      persist(true);
      renderResult();
    }
  },
};

// ------------------------------------------------------------------ screens
function renderStart(message = "") {
  state = null;
  app.innerHTML = `<main class="screen"><section class="panel">
    <h1>${esc(BANK.unit)}</h1>
    <p class="en">${esc(BANK.title)}</p>
    <p>跟著 Ken、圳寶和水鈴逛二水，猜猜他們要去哪裡！<br>Where are you going? — I'm going to the ___.</p>
    <form id="startForm">
      <label for="sid">學號 Student ID</label>
      <input id="sid" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="50100" required>
      <p class="msg" id="msg">${esc(message)}</p>
      <button class="btn primary" type="submit">▶ Start</button>
    </form>
    <p class="small">每一輪 ${BANK.items.length} 題・答對一題 +${BANK.pointsPer} 分・iPad 請橫放<br>English audio is AI-generated, not a human recording.<br>Music: Suno · Sound effects: Kenney (CC0) · 3D buildings: Tripo</p>
    <a class="home" href="../ershui-planet/">← 回到二水小行星首頁</a>
  </section></main>`;
  const form = app.querySelector("#startForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const sid = app.querySelector("#sid").value.trim();
    if (!STUDENT_ID.test(sid)) { app.querySelector("#msg").textContent = "請輸入 5–8 位數字的學號。"; return; }
    form.querySelector("button").disabled = true;
    app.querySelector("#msg").textContent = "讀取進度中… Loading your progress…";
    const cloud = await withTimeout(loadProgress(MISSION, sid), 6000);
    const mine = local.load(sid);
    const saved = newer(mine, cloud && cloud.studentId === sid ? cloud : null);
    state = saved ? { activeDays: [], cleared: [], results: {}, ...saved } : newAttempt(sid);
    // 換了一台 iPad：教師紀錄只能由建立它的那台裝置更新，所以這台用新的紀錄編號，帶著全部作答繼續
    if (saved && saved !== mine && mine?.attemptId !== saved.attemptId) {
      state.attemptId = `${sid}-${Date.now().toString(36)}`;
      if (Object.keys(state.results).length && !state.completedAt) persist(true);
    }
    renderGame();
  });
}

function renderGame() {
  app.innerHTML = `<div class="game"><iframe id="game" title="${esc(BANK.unit)}" src="../ershui-planet/index.html" allow="autoplay; fullscreen"></iframe></div>`;
}

function renderResult() {
  const sm = summaryOf(state);
  app.innerHTML = `<main class="screen result">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
    <section class="panel">
      <h1>Great walk!</h1>
      <p class="en">逛完二水了！</p>
      <p class="big-id">${esc(state.studentId)}</p>
      <p class="score">${sm.score}<small> / ${BANK.maxScore}</small></p>
      <div class="stats">
        <div><b>${sm.correct}/${sm.total}</b><span>答對題數</span></div>
        <div><b>${esc(sm.modeLabel)}</b><span>人物模式</span></div>
        <div><b>${esc(sm.routeLabel)}</b><span>路線</span></div>
      </div>
      <button class="btn primary" id="again">🚶 再玩一次 Play again</button>
      <br><a class="home" href="../ershui-planet/">← 回到二水小行星首頁</a>
    </section></main>`;
  const jingle = new Audio("../hwg5-u01-u02/assets/audio/sfx/celebrate.mp3");
  jingle.play().catch(() => {});
  app.querySelector("#again").addEventListener("click", renderGame);
}

export function start(bank) {
  BANK = bank;
  MISSION = bank.mission;
  document.title = bank.unit;
  renderStart();
}
