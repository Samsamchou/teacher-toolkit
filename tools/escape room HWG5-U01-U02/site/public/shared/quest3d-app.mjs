// 二水 3D 英語闖關 — 共用網頁外框（所有 3D 任務共用這一份）。
// 任務資料夾的 index.html：import { BANK } from "./data.js"; import { start } from "../shared/quest3d-app.mjs"; start(BANK);
// 另一款遊戲也可以共用這個外框：start(BANK, { game, bankBase, intro, meta, credits })
//   例：Ken's Jump Island（ershui-3d-quest-jump）用 ../jump3d/ 的遊戲、共用 HWG5 的題庫 ../ershui-3d-quest/bank/。
// Start → 學號（5–8 位數字）→ 共用 Godot 遊戲（iframe ../quest3d/index.html）→ 結果頁。
// 遊戲從「任務資料夾/bank/」讀題目、插圖、語音與中文字型，所以換任務不必重新匯出遊戲。
// 遊戲透過 window.ershuiHost 讀初始進度、回報每題結果；外框負責：
//   - 本機存檔（localStorage）與跨裝置進度（Firestore questProgress，用學號讀寫）
//   - 教師後台紀錄（Firestore questAttempts，格式與 HWG5／HWG7 任務相同，另加 summary.score 與 items[].quality）
// 計分：每題 100/題數 分 × 品質/4（一次答對 4、錯一次 3、錯兩次 2、三次以上 1），總分四捨五入。
// 四套輪替（2026-11-01）：start(BANK, { sets: QUEST_SETS.hwg5 })。學生登入後先接續「做到一半的套」，
//   沒有的話從「還沒完成的套」隨機抽一套；四套都完成後再隨機抽一套重玩（開新紀錄，教師後台看每套最高分）。
//   每一套是獨立的任務代號（自己的 data.js、bank/、進度與教師紀錄）。老師測試：網址加 ?set=2 直接玩第 2 套。
import { uploadAttempt, loadProgress, saveProgress } from "./quest-cloud.mjs";
import { pickSet } from "./quest-sets.mjs";

let BANK = null;
let MISSION = "";
let OPTS = {};
// 第一個任務沿用原本的存檔鍵，學生舊進度不會不見
const keyOf = (m, sid) => m === "ershui-3d-quest" ? `ershui3d:v1:${sid}` : `quest3d:v1:${m}:${sid}`;
const KEY = sid => keyOf(MISSION, sid);
const STUDENT_ID = /^\d{5,8}$/u;
const app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
let state = null;

// ------------------------------------------------------------------ storage
const local = {
  load(sid, m = MISSION) { try { const r = localStorage.getItem(keyOf(m, sid)); return r ? JSON.parse(r) : null; } catch { return null; } },
  save(s) { try { localStorage.setItem(KEY(s.studentId), JSON.stringify(s)); } catch { /* private mode: cloud still works */ } },
};
function newAttempt(studentId) {
  const now = new Date();
  return { studentId, attemptId: `${studentId}-${now.getTime().toString(36)}`, startedAt: now.toISOString(),
    updatedAt: now.toISOString(), results: {}, cleared: [], activeDays: [] };
}
const newer = (a, b) => (!a ? b : !b ? a : String(a.updatedAt) >= String(b.updatedAt) ? a : b);
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

// ------------------------------------------------------------------ score
export function scoreOf(results) {
  const per = 100 / BANK.items.length;
  let sum = 0;
  for (const it of BANK.items) {
    const r = results[it.id];
    if (r?.finalCorrect) sum += per * Math.min(4, Math.max(1, r.quality || 1)) / 4;
  }
  return Math.round(sum);
}
function summaryOf(s) {
  const recs = BANK.items.map(i => s.results[i.id] || {});
  return {
    total: BANK.items.length,
    finished: recs.filter(r => r.finalCorrect).length,
    firstTry: recs.filter(r => r.finalCorrect && r.firstTry).length,
    attempts: recs.reduce((n, r) => n + (r.attempts || 0), 0),
    hintsUsed: recs.filter(r => r.hintUsed).length,
    battlesDone: s.cleared.length,
    score: scoreOf(s.results),
    bossDefeated: s.cleared.includes("lawn"),
  };
}

// What the teacher dashboard receives (same shape as the other missions).
function cloudRecord(s) {
  return {
    mission: MISSION, studentId: s.studentId, attemptId: s.attemptId, startedAt: s.startedAt,
    updatedAt: s.updatedAt, completedAt: s.completedAt || null,
    stepIndex: s.cleared.length, stepCount: BANK.battles.length, version: 1,
    activeDays: s.activeDays.slice(-60),
    items: BANK.items.filter(i => s.results[i.id]?.attempts).map(i => {
      const r = s.results[i.id];
      return { seq: i.seq, id: i.id, type: i.type, attempts: r.attempts, wrong: r.wrong || 0,
        firstTryCorrect: !!(r.finalCorrect && r.firstTry), hintUsed: !!r.hintUsed, finalCorrect: !!r.finalCorrect,
        quality: r.finalCorrect ? r.quality : 0 };
    }),
    battles: Object.fromEntries(s.cleared.map(id => [id, { status: "cleared",
      bossDefeated: BANK.battles.find(b => b.id === id)?.boss ? true : null }])),
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
    const bankBase = new URL(OPTS.bankBase || "bank/", location.href).href;
    return state ? { studentId: state.studentId, results: state.results, cleared: state.cleared, bankBase } : { bankBase };
  },
  report(json) {
    if (!state) return;
    let m;
    try { m = JSON.parse(json); } catch { return; }
    if (m.type === "item" && BANK.items.some(i => i.id === m.id) && m.result) {
      state.results[m.id] = {
        attempts: Number(m.result.attempts) || 0, wrong: Number(m.result.wrong) || 0, firstTry: !!m.result.firstTry,
        hintUsed: !!m.result.hintUsed, quality: Number(m.result.quality) || 0, finalCorrect: !!m.result.finalCorrect };
      persist();
    } else if (m.type === "cleared" && Array.isArray(m.cleared)) {
      state.cleared = m.cleared.map(String).filter(id => BANK.battles.some(b => b.id === id));
      persist();
    } else if (m.type === "complete") {
      state.completedAt = new Date().toISOString();
      persist(true);
      const cur = SET_INFO.find(i => i.slug === MISSION);
      if (cur) cur.saved = { ...state };
      renderResult();
    }
  },
};

// ------------------------------------------------------------------ screens
function renderStart(message = "") {
  state = null;
  app.innerHTML = `<main class="screen"><section class="panel">
    <h1>${esc(OPTS.unit || BANK.unit)}</h1>
    <p class="en">${esc(OPTS.title || BANK.title)}</p>
    <p>${OPTS.intro || "走進二水的街道，在每個地點回答英文問題、打敗怪物！<br>Walk around Ershui, answer questions and beat the monsters!"}</p>
    <form id="startForm">
      <label for="sid">學號 Student ID</label>
      <input id="sid" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="60101" required>
      <p class="msg" id="msg">${esc(message)}</p>
      <button class="btn primary" type="submit">▶ Start</button>
    </form>
    <p class="small">${OPTS.sets ? `${OPTS.sets.length} sets 四套題目輪流出` : `${BANK.items.length} questions`} · ${BANK.battles.length} ${esc(OPTS.meta || "places")} · iPad 請橫放<br>English audio is AI-generated, not a human recording.<br>${esc(OPTS.credits || "Music: Suno · Sound effects: Kenney (CC0)")}</p>
    <a class="home" href="../">← 回到任務首頁</a>
  </section></main>`;
  const form = app.querySelector("#startForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const sid = app.querySelector("#sid").value.trim();
    if (!STUDENT_ID.test(sid)) { app.querySelector("#msg").textContent = "請輸入 5–8 位數字的學號。"; return; }
    form.querySelector("button").disabled = true;
    app.querySelector("#msg").textContent = "讀取進度中… Loading your progress…";
    if (OPTS.sets) {
      await beginSet(sid);
      return;
    }
    const cloud = await withTimeout(loadProgress(MISSION, sid), 6000);
    const mine = local.load(sid);
    const saved = newer(mine, cloud && cloud.studentId === sid ? cloud : null);
    if (saved?.completedAt) {
      state = { activeDays: [], ...saved };
      renderResult();
      return;
    }
    state = saved ? { activeDays: [], cleared: [], results: {}, ...saved } : newAttempt(sid);
    // 換了一台 iPad：教師紀錄（questAttempts）只能由建立它的那台裝置更新，所以這台開一筆新的紀錄，
    // 帶著全部作答結果繼續；教師後台最新那一筆就是完整分數。
    if (saved && saved !== mine && mine?.attemptId !== saved.attemptId) {
      const now = new Date();
      state.attemptId = `${sid}-${now.getTime().toString(36)}`;
    }
    persist(true);
    renderGame();
  });
}

// ------------------------------------------------------------------ four sets (四套輪替)
let SET_INFO = [];   // [{ slug, short, saved }] 這位學生每一套的進度
async function loadSetInfo(sid) {
  return Promise.all(OPTS.sets.map(async s => {
    const cloud = await withTimeout(loadProgress(s.slug, sid), 6000);
    const mine = local.load(sid, s.slug);
    return { ...s, saved: newer(mine, cloud && cloud.studentId === sid ? cloud : null) };
  }));
}
const doneCount = () => SET_INFO.filter(i => i.saved?.completedAt).length;
async function beginSet(sid) {
  SET_INFO = await loadSetInfo(sid);
  const forced = Number(new URLSearchParams(location.search).get("set")) || 0;
  const pick = pickSet(SET_INFO, forced);
  try {
    BANK = (await import(`../${pick.slug}/data.js`)).BANK;
  } catch {
    renderStart("題目讀取失敗，請重新整理再試一次。");
    return;
  }
  MISSION = pick.slug;
  OPTS.bankBase = `../${pick.slug}/bank/`;
  const saved = pick.saved;
  if (!saved || saved.completedAt) {
    state = newAttempt(sid);   // 新的一套，或四套都完成後重玩（開新紀錄，舊分數留在教師後台）
  } else {
    state = { activeDays: [], cleared: [], results: {}, ...saved };
    // 換了一台 iPad：教師紀錄只能由建立它的那台裝置更新，所以開一筆新紀錄、帶著全部作答結果繼續
    const mine = local.load(sid);
    if (mine?.attemptId !== saved.attemptId) state.attemptId = `${sid}-${Date.now().toString(36)}`;
  }
  persist(true);
  renderSetIntro(pick);
}
function setDots() {
  return `<p class="sets">${SET_INFO.map(i => `<span class="${i.saved?.completedAt ? "on" : ""} ${i.slug === MISSION ? "now" : ""}" title="${esc(i.short)}">${i.saved?.completedAt ? "✓" : "?"}</span>`).join("")}</p>`;
}
function renderSetIntro(pick) {
  const n = Object.values(state.results).filter(r => r.finalCorrect).length;
  const allDone = doneCount() === SET_INFO.length;
  app.innerHTML = `<main class="screen"><section class="panel">
    <h1>${n ? "繼續闖關！" : "這次的題目"}</h1>
    <p class="en">${n ? "Continue your quest" : "Your question set"}</p>
    <p class="set-name">${esc(pick.short)}</p>
    <p>${BANK.items.length} questions${n ? `　已完成 ${n} 題` : ""}</p>
    ${setDots()}
    <p class="small">四套題目已完成 ${doneCount()} / ${SET_INFO.length} 套${allDone ? "（全部完成！這次是重玩，老師看每套最高分）" : ""}</p>
    <button class="btn primary" id="go">▶ Start</button>
    <br><a class="home" href="../">← 回到任務首頁</a>
  </section></main>`;
  app.querySelector("#go").addEventListener("click", renderGame);
}

function renderGame() {
  app.innerHTML = `<div class="game"><iframe id="game" title="${esc(BANK.unit)}" src="${esc(OPTS.game || "../quest3d/index.html")}" allow="autoplay; fullscreen"></iframe></div>`;
}

function renderResult() {
  const sm = summaryOf(state);
  const avg = sm.finished ? Math.round(BANK.items.reduce((n, i) => n + (state.results[i.id]?.quality || 0), 0) / sm.finished) : 0;
  app.innerHTML = `<main class="screen result">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
    <section class="panel">
      <h1>Mission Complete!</h1>
      <p class="en">任務完成！</p>
      <p class="big-id">${esc(state.studentId)}</p>
      <p class="score">${sm.score}<small> / 100</small></p>
      <p class="stars" aria-label="average ${avg} of 4 stars">${"★".repeat(avg)}${"☆".repeat(4 - avg)}</p>
      <div class="stats">
        <div><b>${sm.finished}/${sm.total}</b><span>完成題數</span></div>
        <div><b>${sm.firstTry}/${sm.total}</b><span>第一次就答對</span></div>
        <div><b>${sm.battlesDone}/${BANK.battles.length}</b><span>${esc(OPTS.clearedLabel || "通關地點")}</span></div>
      </div>
      ${OPTS.sets ? `<p class="set-name small-set">${esc(BANK.short || BANK.unit)}</p>${setDots()}<p class="small">四套題目已完成 ${doneCount()} / ${SET_INFO.length} 套</p>` : ""}
      <button class="btn primary" id="cheer">🎉 Cheer again</button>
      <button class="btn ghost" id="again">${OPTS.sets ? "下一套 Next set" : "再玩一次 Play again"}</button>
      <br><a class="home" href="../">← 回到任務首頁</a>
    </section></main>`;
  const jingle = new Audio("../hwg5-u01-u02/assets/audio/sfx/celebrate.mp3");
  const play = () => { jingle.currentTime = 0; jingle.play().catch(() => {}); };
  play();
  app.querySelector("#cheer").addEventListener("click", play);
  app.querySelector("#again").addEventListener("click", async () => {
    if (OPTS.sets) {
      app.querySelector("#again").disabled = true;
      await beginSet(state.studentId);
      return;
    }
    if (!confirm("要開始新的一輪嗎？這一輪的分數會保留在老師的紀錄裡。")) return;
    state = newAttempt(state.studentId);
    persist(true);
    renderGame();
  });
}

export function start(bank, opts = {}) {
  BANK = bank;
  OPTS = opts;
  MISSION = bank.mission;
  document.title = bank.unit;
  renderStart();
}
