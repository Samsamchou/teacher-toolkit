// 二水小行星 Listen and Guess — 學號外框＋題目面板（RDQ 2026-11-08 rev 2；2026-11-12 三種線索版 RDQ-spec-listen-guess-3clues-20261112）。
// 遊戲（iframe ../ershui-planet/）負責：Ken 說情境＋問 Where are you going? →（環境音線索才）播環境音 → ask() 請外框出題；
// 外框出題（選擇／拖放／口說），學生作答後 poll() 回傳 {type:"answer", correct}；遊戲讓 Ken 走過去揭曉、要聽完答句才能 Next。
// [1112] 每回合 10 題（10 個地點各一題；11/12 晚加博物館後從 11 個地點抽 10 個）、題型 5 口說＋3 拖放＋2 選擇；每題只出一種線索：
//   amb 環境音（遊戲播）／icons 兩個圖示／video 默劇影片（外框面板上方顯示，放在遊戲檔外 clues/，出題時才下載）。
//   題型表、線索表由遊戲用 seed 排好，report({type:"start", types, clues}) 交給外框存在 cleared（"types:…"、"clues:…"），
//   換裝置「繼續上次」一樣；不用改 firestore.rules。圖示／影片載入失敗 → 改請遊戲播環境音。
// 口說規則（照 Free Time 兩人一組 11/12）：說對地點＋文法對（I'm going to、the 的有無、地點單字）＋AI 總分 ≥ 80 才過；
//   文法錯並排「你說的句子／正確句子」紅字、算一次；第 3 次起還說錯地點 → 顯示三個選項地點；第 5 次沒過 → 直接去揭曉、記答錯。
// 計分：猜對 +10（滿分 100）。雲端和個人模式同一套（questProgress＋questAttempts），只存學號與成績。
import { uploadAttempt, loadProgress, saveProgress } from "../shared/quest-cloud.mjs";
import { available as aiAvailable, scoreGuess } from "./speech-ai.mjs";

let BANK = null;
let MISSION = "";
const KEY = sid => `quest3d:v1:${MISSION}:${sid}`;
const STUDENT_ID = /^\d{5,8}$/u;
const ITEM_ID = /^q(0[1-9]|10)$/u;
const app = document.getElementById("app");
const quiz = document.getElementById("quiz");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const clip = (s, n = 80) => String(s ?? "").slice(0, n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let state = null;
let outbox = [];   // 給遊戲的訊息（poll 一次拿一個）
const N = () => BANK.items.length;

// ------------------------------------------------------------------ storage
const local = {
  load(sid) { try { const r = localStorage.getItem(KEY(sid)); return r ? JSON.parse(r) : null; } catch { return null; } },
  save(s) { try { localStorage.setItem(KEY(s.studentId), JSON.stringify(s)); } catch { /* private mode */ } },
};
function newAttempt(studentId) {
  const now = new Date();
  return { studentId, attemptId: `${studentId}-${now.getTime().toString(36)}`, startedAt: now.toISOString(),
    updatedAt: now.toISOString(), results: {}, cleared: [], activeDays: [], types: {} };
}
const newer = (a, b) => (!a ? b : !b ? a : String(a.updatedAt) >= String(b.updatedAt) ? a : b);
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

const answered = s => BANK.items.filter(i => s.results[i.id]).length;
const correct = s => BANK.items.filter(i => s.results[i.id]?.finalCorrect).length;
const scoreOf = s => correct(s) * BANK.pointsPer;
const speakAvg = s => {
  const v = BANK.items.map(i => s.results[i.id]?.ai).filter(Boolean);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};
function summaryOf(s) {
  const n = answered(s);
  const avg = speakAvg(s);
  return {
    total: N(), finished: n, firstTry: correct(s), correct: correct(s), attempts: n, hintsUsed: 0,
    battlesDone: 0, score: scoreOf(s), maxScore: BANK.maxScore, mode: "listen", route: 0,
    modeLabel: "Listen and Guess", routeLabel: avg == null ? "—" : `口說平均 ${avg}`,
    current: s.completedAt ? n : Math.min(n + 1, N()),
    note: `Listen and Guess・${avg == null ? "無口說題" : `口說平均 ${avg}`}・${s.completedAt ? "完成" : `第 ${Math.min(n + 1, N())}/${N()} 題`}`,
  };
}
function cloudRecord(s) {
  return {
    mission: MISSION, studentId: s.studentId, attemptId: s.attemptId, startedAt: s.startedAt,
    updatedAt: s.updatedAt, completedAt: s.completedAt || null, stepIndex: answered(s), stepCount: N(), version: 1,
    activeDays: s.activeDays.slice(-60),
    items: BANK.items.filter(i => s.results[i.id]).map(i => {
      const r = s.results[i.id];
      return { seq: i.seq, id: i.id, type: r.type, attempts: r.attempts || 1, wrong: r.finalCorrect ? 0 : 1,
        firstTryCorrect: !!r.finalCorrect, hintUsed: false, finalCorrect: !!r.finalCorrect,
        quality: r.finalCorrect ? 4 : 0, q: clip(r.q), a: clip(r.a), pick: clip(r.pick) };
    }),
    battles: {}, summary: summaryOf(s),
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

// ------------------------------------------------------------------ plans (types / clues)
// 題型（老師 11/12）：每回合 10 題固定 5 口說＋3 拖放＋2 選擇；線索：4 環境音＋3 圖示＋3 影片。
const MIX = ["speak", "speak", "speak", "speak", "speak", "drag", "drag", "drag", "choice", "choice"];
const CLUE_MIX = ["a", "a", "a", "a", "i", "i", "i", "v", "v", "v"];
const CODE = { speak: "s", drag: "d", choice: "c" };
const CLUE_KIND = { a: "amb", i: "icons", v: "video" };
const count = (str, ch) => [...str].filter(c => c === ch).length;
const validTypes = c => typeof c === "string" && c.length === N() && count(c, "s") === 5 && count(c, "d") === 3 && count(c, "c") === 2;
const validClues = c => typeof c === "string" && c.length === N() && /^[aiv]+$/u.test(c);
const row = prefix => (state.cleared || []).find(c => String(c).startsWith(prefix));
function typeCode() {
  const r = row("types:");
  if (r && validTypes(String(r).slice(6))) return String(r).slice(6);
  const code = shuffle([...MIX]).map(t => CODE[t]).join("");
  state.cleared = [...(state.cleared || []).filter(c => !String(c).startsWith("types:")), "types:" + code];
  persist(true);
  return code;
}
function typeTable() {
  const code = typeCode();
  return Object.fromEntries(BANK.items.map((it, i) => [it.id, { s: "speak", d: "drag", c: "choice" }[code[i]] || "choice"]));
}
function clueOf(id) {
  const r = row("clues:");
  const code = r && validClues(String(r).slice(6)) ? String(r).slice(6) : "";
  const i = BANK.items.findIndex(it => it.id === id);
  return CLUE_KIND[code[i]] || "amb";
}
// 本機測試（localhost＋?fakeai=1）：?forcetype=speak|drag|choice、?forceclue=amb|icons|video 讓每題都是同一種
const LOCAL_TEST = ["127.0.0.1", "localhost"].includes(location.hostname) && new URLSearchParams(location.search).has("fakeai");
const FORCE_TYPE = LOCAL_TEST ? new URLSearchParams(location.search).get("forcetype") : null;
const FORCE_CLUE = LOCAL_TEST ? new URLSearchParams(location.search).get("forceclue") : null;
function pickType(id) {
  const t = (FORCE_TYPE && ["speak", "drag", "choice"].includes(FORCE_TYPE)) ? FORCE_TYPE : (typeTable()[id] || "choice");
  return t === "speak" && !aiAvailable() ? "choice" : t;   // AI 不能用時，口說題臨時改選擇題
}

// ------------------------------------------------------------------ bridge used by the Godot game
window.ershuiHost = {
  getInitial() {
    return state ? { studentId: state.studentId, results: state.results, cleared: state.cleared, mode: "listen" } : {};
  },
  report(json) {
    if (!state) return;
    let m;
    try { m = JSON.parse(json); } catch { return; }
    if (m.type === "start" && Number.isInteger(m.seed)) {
      if (Object.keys(state.results).length || state.completedAt) state = newAttempt(state.studentId);
      const types = validTypes(m.types) ? m.types : shuffle([...MIX]).map(t => CODE[t]).join("");
      const clues = validClues(m.clues) ? m.clues : shuffle([...CLUE_MIX]).join("");
      state.cleared = ["mode:listen", "set:0", `seed:${m.seed}`, `types:${types}`, `clues:${clues}`];
      state.results = {};
      state.completedAt = null;
      persist(true);
    } else if (m.type === "complete") {
      state.completedAt = new Date().toISOString();
      persist(true);
      closeQuiz();
      renderResult();
    }
  },
  ask(json) {
    let m;
    try { m = JSON.parse(json); } catch { return; }
    if (state && ITEM_ID.test(m.id) && BANK.places[m.lid]) openQuiz(m.id, m.lid, m.clue);
  },
  poll() { return outbox.length ? JSON.stringify(outbox.shift()) : ""; },
  cancel() { closeQuiz(); outbox = []; },   // 遊戲出題中按 Home：收起題目面板
};
const tell = m => outbox.push(m);

// ------------------------------------------------------------------ question panel
const answerText = p => `I'm going to ${p.the ? "the " : ""}${p.word}.`;
let Q = null;   // 目前這一題 {id, lid, type, clue, ...}

function openQuiz(id, lid, clueFromGame) {
  stopRec();
  stopClue();
  const type = pickType(id);
  let clue = ["amb", "icons", "video"].includes(clueFromGame) ? clueFromGame : clueOf(id);
  if (FORCE_CLUE && ["amb", "icons", "video"].includes(FORCE_CLUE)) clue = FORCE_CLUE;
  const others = shuffle(Object.keys(BANK.places).filter(k => k !== lid));
  Q = { id, lid, type, clue, place: BANK.places[lid], tries: 0, fails: 0, clueDone: clue === "amb",
    hint3: shuffle([lid, others[0], others[1]]) };   // 口說第 3 次起的三個選項
  quiz.hidden = false;
  quiz.classList.toggle("bigclue", clue !== "amb");   // [1112 晚] 影片／圖示線索：面板變寬、線索放大（看完縮回）
  quiz.classList.remove("cluedone");
  quiz.innerHTML = `<div id="qhead"></div><div class="clue" id="qclue"></div><div id="qbody"></div>`;
  drawHead();
  drawClue();
  if (type === "choice") drawChoice();
  else if (type === "drag") drawDrag(true);
  else drawSpeak();
}
function closeQuiz() { stopRec(); stopClue(); quiz.hidden = true; quiz.innerHTML = ""; Q = null; }
const SUB = { choice: "看線索，選出你要去的地方", drag: "點字卡放進空格，猜猜你要去哪裡", speak: "用英文說出你要去哪裡（自己猜！）" };
function drawHead() {
  const lbl = Q.clue === "amb" ? "🔊 再聽一次 Listen again" : "🔁 再看線索 Clue again";
  quiz.querySelector("#qhead").innerHTML = `<div class="qhead"><b>Where are you going?</b><span>${esc(SUB[Q.type] || "")}</span>
    <button class="btn ghost small" data-act="replay">${lbl}</button></div>`;
}
// 作答區：線索還沒看完時鎖住
function setBody(html) {
  const b = quiz.querySelector("#qbody");
  if (!b) return;
  b.innerHTML = `${Q.clueDone ? "" : `<p class="lockmsg">先看完線索再作答 Watch the clue first</p>`}<div class="${Q.clueDone ? "" : "locked"}">${html}</div>`;
}
function redrawBody() {
  if (!Q) return;
  if (Q.type === "choice") drawChoice(Q.msg || "");
  else if (Q.type === "drag") drawDrag();
  else drawSpeak(Q.msg || "", Q.last || null, Q.lastJ || null);
}

// ---- 線索：兩個圖示（一個一個出現）／默劇影片（無聲，播完才開放作答）／環境音（遊戲播，這裡只顯示提示）
let clueTimers = [];
function stopClue() {
  clueTimers.forEach(clearTimeout); clueTimers = [];
  const v = quiz.querySelector("#qclue video");
  if (v) { try { v.pause(); } catch { /* ignore */ } }
}
const clueUrl = f => `${BANK.clueBase || "clues/"}${f}`;
function clueReady() {
  if (!Q || Q.clueDone) return;
  Q.clueDone = true;
  window.__listenClueShown = { id: Q.id, clue: Q.clue };
  quiz.classList.add("cluedone");
  redrawBody();
  const body = quiz.querySelector("#qbody");
  if (body && body.scrollIntoView) setTimeout(() => body.scrollIntoView({ block: "nearest", behavior: "smooth" }), 380);
}
function clueFailed(why) {   // 圖示／影片下載失敗：改請遊戲播環境音（這題記成環境音）
  if (!Q) return;
  console.warn("clue failed", why);
  stopClue();
  Q.clueFallback = Q.clue;
  Q.clue = "amb";
  quiz.classList.remove("bigclue");
  drawHead();
  quiz.querySelector("#qclue").innerHTML = `<p class="sound">線索載入失敗，改聽聲音 🔊 Listen!</p>`;
  tell({ type: "amb" });
  clueTimers.push(setTimeout(clueReady, 2500));
}
function drawClue() {
  const box = quiz.querySelector("#qclue");
  if (!box) return;
  const q = Q;
  if (Q.clue === "amb") {
    box.innerHTML = `<p class="sound">🔊 聽聲音猜地點 Listen to the sounds</p>`;
    return;
  }
  if (Q.clue === "icons") {
    box.innerHTML = `<p class="tag">看圖猜地點 Look at the pictures</p><div class="icons">
      <img alt="clue 1" src="${clueUrl(`icons/${Q.lid}_1.webp`)}"><img alt="clue 2" src="${clueUrl(`icons/${Q.lid}_2.webp`)}"></div>`;
    const imgs = [...box.querySelectorAll("img")];
    let loaded = 0, failed = false;
    const go = () => {
      if (Q !== q) return;
      clueTimers.push(setTimeout(() => imgs[0].classList.add("on"), 200));
      clueTimers.push(setTimeout(() => imgs[1].classList.add("on"), 1800));
      clueTimers.push(setTimeout(clueReady, 3200));
    };
    imgs.forEach(im => {
      im.addEventListener("load", () => { if (++loaded === 2 && !failed) go(); }, { once: true });
      im.addEventListener("error", () => { if (!failed && Q === q) { failed = true; clueFailed("icon"); } }, { once: true });
    });
    clueTimers.push(setTimeout(() => { if (Q === q && loaded < 2 && !failed) { failed = true; clueFailed("icon timeout"); } }, 12000));
    return;
  }
  // video（[1112] RDQ mime-sfx）：影片有音效 → 學生按 ▶ 才播放（有聲音；iPad 要使用者按一下才能有聲播放）；
  // 播到結尾才開放作答；先下載（preload），12 秒還讀不到就當失敗、改請遊戲播環境音。
  box.innerHTML = `<p class="tag">看 Ken 比手畫腳、聽聲音 Watch and listen</p>
    <div class="vwrap"><video playsinline preload="auto" src="${clueUrl(`video/${Q.lid}.mp4`)}"></video>
    <button class="btn primary vplay" data-act="vplay">▶ 播放 Play</button></div>`;
  const v = box.querySelector("video");
  v.addEventListener("ended", () => {
    if (Q !== q) return;
    const b = box.querySelector(".vplay");
    if (b) { b.textContent = "▶ 再看一次 Again"; b.hidden = false; }
    quiz.classList.add("cluedone");
    clueReady();
  });
  v.addEventListener("error", () => { if (Q === q) clueFailed("video"); }, { once: true });
  clueTimers.push(setTimeout(() => { if (Q === q && v.readyState < 2 && !Q.clueDone && Q.clue === "video") clueFailed("video timeout"); }, 12000));
}
function playVideo() {
  const v = quiz.querySelector("#qclue video");
  const b = quiz.querySelector("#qclue .vplay");
  if (!v || rec) return;   // 錄音中不播（免得錄進去）
  const q = Q;
  v.muted = false;
  v.currentTime = 0;
  quiz.classList.remove("cluedone");   // 再看一次：影片放大
  quiz.scrollTop = 0;
  if (b) b.hidden = true;
  v.play().catch(() => { v.controls = true; if (b) b.hidden = false; });
  window.__listenVideoTaps = (window.__listenVideoTaps || 0) + 1;
  // 保險：卡住也不會永遠鎖住（從按下 ▶ 起 20 秒）
  if (!Q.clueDone) clueTimers.push(setTimeout(() => { if (Q === q) clueReady(); }, 20000));
}
function pauseVideo() {
  const v = quiz.querySelector("#qclue video");
  if (v && !v.paused) { v.pause(); const b = quiz.querySelector("#qclue .vplay"); if (b) b.hidden = false; }
}
function replayClue() {
  if (!Q) return;
  if (Q.clue === "amb") { tell({ type: "replay" }); return; }
  stopClue();
  if (Q.clue === "icons") {
    const imgs = [...quiz.querySelectorAll("#qclue img")];
    imgs.forEach(im => im.classList.remove("on"));
    quiz.classList.remove("cluedone");
    quiz.scrollTop = 0;
    clueTimers.push(setTimeout(() => imgs[0]?.classList.add("on"), 200));
    clueTimers.push(setTimeout(() => imgs[1]?.classList.add("on"), 1800));
    clueTimers.push(setTimeout(() => quiz.classList.add("cluedone"), 3200));
  } else {
    playVideo();
  }
}

function finish(ok, pick, extra = {}) {
  const p = Q.place;
  state.results[Q.id] = { type: Q.type, clue: Q.clueFallback ? `${Q.clueFallback}→amb` : Q.clue, attempts: Q.tries || 1, finalCorrect: ok, lid: Q.lid,
    q: `Where are you going?（${{ amb: "聽環境音", icons: "看兩個圖示", video: "看默劇影片" }[Q.clue] || "線索"}）`, a: answerText(p), pick: clip(pick), ...extra };
  persist();
  tell({ type: "answer", correct: ok, pick });
  closeQuiz();
}

// 選擇題：4 個地點句子
function drawChoice(msg = "") {
  Q.msg = msg;
  const others = shuffle(Object.keys(BANK.places).filter(k => k !== Q.lid)).slice(0, 3);
  Q.opts ||= shuffle([Q.lid, ...others]);
  setBody(`${msg ? `<p class="msg">${esc(msg)}</p>` : ""}
    <div class="choices">${Q.opts.map((k, i) => `<button class="btn opt" data-pick="${k}">${"ABCD"[i]}　${esc(answerText(BANK.places[k]))}</button>`).join("")}</div>`);
}

// 拖放題：(Where) (are) you (going)? (I'm) going to the (____). 五處可挖空，挖 3 格，一定包含地點
function dragModel() {
  const p = Q.place;
  const toks = [["Where", 1], ["are", 1], ["you", 0], ["going?", 1], ["\n", 0], ["I'm", 1], ["going", 0], ["to", 0]];
  if (p.the) toks.push(["the", 0]);
  toks.push([p.word, 2], [".", 0]);
  const gramIdx = toks.map((t, i) => t[1] === 1 ? i : -1).filter(i => i >= 0);
  const blanks = [toks.findIndex(t => t[1] === 2), ...shuffle(gramIdx).slice(0, 2)].sort((a, b) => a - b);
  const answers = blanks.map(i => toks[i][0].replace("?", ""));
  const placeDistract = shuffle(Object.keys(BANK.places).filter(k => k !== Q.lid)).slice(0, 2).map(k => BANK.places[k].word);
  const gramDistract = shuffle(BANK.fillers.filter(w => !answers.includes(w))).slice(0, 2);
  if (!p.the) gramDistract[0] = "the";   // 學校：放 the 當干擾字（老師 11/08）
  const tiles = shuffle([...answers, ...placeDistract, ...gramDistract]).map((t, i) => ({ id: `t${i}`, text: t }));
  return { toks, blanks, answers, tiles, placed: blanks.map(() => null) };
}
function drawDrag(init = false) {
  if (init) Q.drag = dragModel();
  const D = Q.drag;
  const used = new Set(D.placed.filter(Boolean));
  let line = "";
  D.toks.forEach((t, i) => {
    const b = D.blanks.indexOf(i);
    if (t[0] === "\n") { line += "<br>"; return; }
    if (b >= 0) {
      const tile = D.tiles.find(x => x.id === D.placed[b]);
      line += `<button class="slot ${tile ? "filled" : ""}" data-slot="${b}">${tile ? esc(tile.text) : "&nbsp;"}</button>${t[0].endsWith("?") ? "?" : ""} `;
    } else line += `<span class="w">${esc(t[0])}</span> `;
  });
  const pool = D.tiles.map(t => used.has(t.id) ? `<span class="tile ghost"></span>` : `<button class="tile" data-tile="${t.id}">${esc(t.text)}</button>`).join("");
  const full = D.placed.every(Boolean);
  setBody(`<p class="sent">${line.replace(/ \./, ".")}</p><div class="pool">${pool}</div>
    <div class="row"><button class="btn ghost" data-act="clear">Clear 清除</button>
    <button class="btn primary" data-act="check" ${full ? "" : "disabled"}>Go! 出發 ✓</button></div>`);
}

// ------------------------------------------------------------------ speaking rules（照 Free Time 11/12）
// 地點關鍵字：full＝完整單字；part＝聽得出是哪裡、但單字不完整（算文法錯，改成完整單字）。比對「最早出現」的地點，
// 所以後面說理由（I want to drink tea…）不會蓋掉前面說的地點。
const PLACE_KEYS = {
  post: { full: ["post office", "postoffice"], part: ["post"] },
  supermarket: { full: ["supermarket", "super market"], part: [] },
  school: { full: ["school"], part: [] },
  library: { full: ["library"], part: [] },
  hospital: { full: ["hospital"], part: [] },
  park: { full: ["park"], part: [] },
  restaurant: { full: ["restaurant"], part: [] },
  tea: { full: ["tea shop", "teashop"], part: ["tea"] },
  station: { full: ["train station"], part: ["station"] },
  bookstore: { full: ["bookstore", "book store"], part: ["bookshop", "book shop"] },
  // 11/12 虛構的二水鐵道博物館：museum／railway museum 都算完整（railway museum 的 the 放在 railway 前面）
  museum: { full: ["museum", "railway museum", "train museum"], part: [] },
};
const tokens = t => String(t || "").replace(/[’‘`]/g, "'").replace(/[“”"]/g, "").replace(/[.,!?;:]+/g, " ").split(/\s+/).filter(Boolean);
// 回傳 {lid, start, len, full} 或 null
function findPlace(low) {
  let best = null;
  for (const [lid, K] of Object.entries(PLACE_KEYS)) {
    for (const [kind, list] of [["full", K.full], ["part", K.part]]) {
      for (const k of list) {
        const kw = k.split(" ");
        for (let i = 0; i + kw.length <= low.length; i++) {
          if (!kw.every((x, j) => low[i + j] === x)) continue;
          // part「post」「tea」「station」後面接的是完整單字的一部分（office／shop）就交給 full
          const cand = { lid, start: i, len: kw.length, full: kind === "full" };
          if (!best || i < best.start || (i === best.start && cand.len > best.len)) best = cand;
          break;
        }
      }
    }
  }
  return best;
}
const guessedLid = transcript => findPlace(tokens(transcript).map(x => x.toLowerCase()))?.lid || "";
const SUBJ = ["he's", "she's", "we're", "you're", "they're", "it's", "he", "she", "we", "you", "they", "it", "i", "im", "i'm"];
// 回傳 { ok, errors:[{said, correct}], said:[{t, bad}], fixed:[{t, fix}] }；fixed 只改文法、地點照學生說的（不洩漏答案）
function grammarCheck(transcript, aiErrors = []) {
  const w = tokens(transcript);
  const low = w.map(x => x.toLowerCase());
  const bad = w.map(() => false);
  const seg = w.map(t => [{ t, fix: false }]);   // 每個字改成什麼（[]＝刪掉）
  const pre = w.map(() => []);                    // 插在這個字前面
  const tail = [];
  const errors = [];
  const fx = t => ({ t, fix: true });
  const insertBefore = (i, ts) => { if (i < w.length) pre[i].push(...ts.map(fx)); else tail.push(...ts.map(fx)); };
  if (!w.length) return { ok: true, errors, said: [], fixed: [] };
  // 1. going（go／goes／went → going）
  let gi = low.indexOf("going");
  if (gi < 0) {
    const vi = low.findIndex(x => ["go", "goes", "went", "gone"].includes(x));
    if (vi >= 0) { errors.push({ said: w[vi], correct: "going" }); bad[vi] = true; seg[vi] = [fx("going")]; gi = vi; }
  }
  if (gi >= 0) {
    // 2. 主詞：I'm（I am 也可以）
    const p1 = low[gi - 1], p2 = low[gi - 2];
    if (gi === 0) { errors.push({ said: "（沒有 I'm）", correct: "I'm" }); insertBefore(0, ["I'm"]); }
    else if (p1 === "i'm" || (p1 === "am" && p2 === "i")) { /* ok */ }
    else if (["is", "are", "am"].includes(p1) && SUBJ.includes(p2)) {
      errors.push({ said: `${w[gi - 2]} ${w[gi - 1]}`, correct: "I'm" }); bad[gi - 2] = bad[gi - 1] = true; seg[gi - 2] = [fx("I'm")]; seg[gi - 1] = [];
    } else if (SUBJ.includes(p1) || ["is", "are", "am"].includes(p1)) {
      errors.push({ said: w[gi - 1], correct: "I'm" }); bad[gi - 1] = true; seg[gi - 1] = [fx("I'm")];
    } else { errors.push({ said: "（沒有 I'm）", correct: "I'm" }); insertBefore(gi, ["I'm"]); }
  }
  const P = findPlace(low);
  // 3. to（going 後面）
  if (gi >= 0 && gi + 1 <= w.length) {
    const t1 = low[gi + 1];
    if (t1 === "to") { /* ok */ }
    else if (["at", "in", "into", "for"].includes(t1)) { errors.push({ said: w[gi + 1], correct: "to" }); bad[gi + 1] = true; seg[gi + 1] = [fx("to")]; }
    else if (P && P.start > gi) { errors.push({ said: `going ${w[gi + 1] || ""}`.trim(), correct: `going to ${w[gi + 1] || ""}`.trim() }); insertBefore(gi + 1, ["to"]); }
  }
  // 4. the：school 不加、其他要加（以學生說的地點為準，不洩漏答案）
  if (P) {
    const word = BANK.places[P.lid];
    const a = P.start - 1;
    const art = a >= 0 && ["the", "a", "an"].includes(low[a]) ? a : -1;
    if (word.the) {
      if (art >= 0 && low[art] !== "the") { errors.push({ said: w[art], correct: "the" }); bad[art] = true; seg[art] = [fx("the")]; }
      else if (art < 0) { errors.push({ said: `to ${w.slice(P.start, P.start + P.len).join(" ")}`, correct: `to the ${w.slice(P.start, P.start + P.len).join(" ")}` }); insertBefore(P.start, ["the"]); }
    } else if (art >= 0) {
      errors.push({ said: `${w[art]} ${w[P.start]}`, correct: word.word }); bad[art] = true; seg[art] = [];
    }
    // 5. 地點單字要完整（post → post office、station → train station、tea → tea shop、bookshop → bookstore）
    if (!P.full) {
      errors.push({ said: w.slice(P.start, P.start + P.len).join(" "), correct: word.word });
      for (let k = 0; k < P.len; k++) { bad[P.start + k] = true; seg[P.start + k] = []; }
      seg[P.start] = word.word.split(" ").map(fx);
      // station 前面已經有 train（train station 拆開說）就不用再補
      if (P.lid === "station" && low[P.start - 1] === "train") { seg[P.start] = [{ t: w[P.start], fix: false }]; bad[P.start] = false; errors.pop(); }
    }
  }
  // AI 說的文法錯：說錯的字真的在逐字稿裡、程式還沒抓到、而且不是在改地點（地點另外判）才算
  for (const e of aiErrors || []) {
    const s = String(e?.said || "").trim(), c = String(e?.correct || "").trim();
    if (!s || !c || s.toLowerCase() === c.toLowerCase()) continue;
    const ps = findPlace(tokens(s).map(x => x.toLowerCase())), pc = findPlace(tokens(c).map(x => x.toLowerCase()));
    if ((ps || pc) && ps?.lid !== pc?.lid) continue;
    const sw = tokens(s).map(x => x.toLowerCase()), cw = tokens(c);
    let at = -1;
    for (let i = 0; i + sw.length <= low.length; i++) if (sw.every((x, k) => low[i + k] === x)) { at = i; break; }
    if (at < 0 || bad.slice(at, at + sw.length).some(Boolean) || seg.slice(at, at + sw.length).some(sg => sg.some(x => x.fix))) continue;
    errors.push({ said: s, correct: c, by: "ai" });
    for (let k = 0; k < sw.length; k++) { bad[at + k] = true; seg[at + k] = []; }
    seg[at] = cw.map(fx);
  }
  const said = w.map((t, i) => ({ t, bad: bad[i] }));
  const fixed = [];
  w.forEach((_, i) => { fixed.push(...pre[i], ...seg[i]); });
  fixed.push(...tail);
  if (fixed.length) fixed[0] = { ...fixed[0], t: fixed[0].t[0].toUpperCase() + fixed[0].t.slice(1) };
  return { ok: errors.length === 0, errors, said, fixed };
}
function judgeSpeak(res) {
  const lid = guessedLid(res.transcript);
  const g = grammarCheck(res.transcript, Array.isArray(res.grammar_errors) ? res.grammar_errors : []);
  const placeOk = lid === Q.lid;
  const scoreOk = res.total_score >= BANK.passSpeak;
  const why = [];
  if (!placeOk) why.push(lid ? `地點不對（說成 ${BANK.places[lid].word}）` : "沒有聽到地點");
  if (!g.ok) why.push("文法：" + g.errors.map(e => `${e.said}→${e.correct}`).join("、"));
  if (!scoreOk) why.push(`分數 ${res.total_score} < ${BANK.passSpeak}`);
  return { lid, placeOk, g, scoreOk, pass: placeOk && g.ok && scoreOk, why: why.join("；") };
}
const tokHtml = (arr, cls) => arr.map(x => (x.bad || x.fix) ? `<b class="${cls}">${esc(x.t)}</b>` : esc(x.t)).join(" ");

// 口說題：不顯示答案句，只給句型提示
let rec = null;
const HINT_FROM = 3;          // 第 3 次起還說錯地點：給三個選項地點
const MAX_TRIES = 5;          // 第 5 次仍沒通過 → 直接去揭曉、記答錯（不再改選擇題）
const MAX_AI_ERRORS = 3;      // AI／網路沒回應不算次數；3 次才改選擇題
function drawSpeak(msg = "", result = null, J = null) {
  Q.msg = msg;
  const pass = !!(J && J.pass);
  const out = !pass && J && Q.tries >= MAX_TRIES;
  setBody(`<p class="sent hint">I'm going to the <span class="blank">______</span>.</p>
    <p class="msg">第 ${Math.min(Q.tries + (pass || out ? 0 : 1), MAX_TRIES)}／${MAX_TRIES} 次${Q.best ? `・最高 ${Q.best} 分` : ""}</p>
    ${result ? `<div class="ai ${pass ? "good" : "try"}">
      <p class="said">你說：「${esc(result.transcript || "（聽不清楚）")}」</p>
      <p class="scores"><b>${result.total_score}</b> 總分　發音 ${result.accuracy}・流暢 ${result.fluency}・完整 ${result.completeness}</p>
      ${J && !J.g.ok ? `<div class="cmp"><div><span>你說的句子 You said</span><p>${tokHtml(J.g.said, "bad")}</p></div>
        <div><span>正確句子 Correct</span><p>${tokHtml(J.g.fixed, "fix")}.</p></div></div>
        <p class="need">文法要改：${J.g.errors.map(e => `${esc(e.said)} → ${esc(e.correct)}`).join("、")}</p>` : ""}
      ${J && !J.placeOk ? `<p class="need">${J.lid ? "不是這個地方，再看一次線索！Not this place — check the clue again." : "沒有聽到地點，再看一次線索、說完整句子！"}</p>` : ""}
      ${J && J.placeOk && J.g.ok && !J.scoreOk ? `<p class="need">要 ${BANK.passSpeak} 分以上才能去揭曉，再錄一次！</p>` : ""}
      <p>${esc(result.feedback)}</p></div>` : ""}
    ${Q.hint && !pass ? `<div class="hintbox">提示 Hint：${Q.hint3.map(k => `<b>${esc(BANK.places[k].word)}</b>`).join("　・　")}</div>` : ""}
    ${out ? `<p class="need">錄了 ${MAX_TRIES} 次還沒過，這題記答錯。去看答案！</p>` : ""}
    <p class="msg">${esc(msg)}</p>
    <div class="row">
      ${pass ? `<button class="btn primary" data-act="reveal">Go! 去揭曉 ▶</button>`
        : out ? `<button class="btn primary" data-act="release">去揭曉 See the answer ▶</button>`
        : `<button class="btn primary rec" data-act="rec">${Q.tries ? "🎙 再錄一次 Record again" : "🎙 錄音 Record"}</button>
           ${J && !J.placeOk ? `<button class="btn ghost" data-act="replay">${Q.clue === "amb" ? "🔊 再聽一次" : "🔁 再看線索"}</button>` : ""}
           ${Q.fails >= 2 ? `<button class="btn ghost" data-act="pattern">🔈 聽句型示範</button>` : ""}`}
    </div>`);
  if (result) quiz.querySelector(".row")?.scrollIntoView({ block: "nearest" });
}
// ---- 錄音 → WAV（2026-11-08 修正）：iPad Safari 錄出 MP4，Gemini 不收；在裝置上解碼、混成單聲道、轉 16 kHz 16-bit PCM WAV 再送。
let actx = null;
function audioCtx() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!actx && C) actx = new C();
  if (actx?.state === "suspended") actx.resume().catch(() => {});
  return actx;
}
async function toWav16k(blob) {
  const ctx = audioCtx();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  const n = decoded.numberOfChannels;
  const mono = new Float32Array(decoded.length);
  for (let c = 0; c < n; c++) {
    const d = decoded.getChannelData(c);
    for (let i = 0; i < d.length; i++) mono[i] += d[i] / n;
  }
  const sr = 16000;
  const ratio = decoded.sampleRate / sr;
  const len = Math.max(1, Math.floor(mono.length / ratio));
  const out = new Int16Array(len);
  let peak = 0, sum = 0;
  for (let i = 0; i < len; i++) {
    const x = i * ratio, k = Math.floor(x), f = x - k;
    const v = (mono[k] || 0) * (1 - f) + (mono[k + 1] || 0) * f;
    const cl = Math.max(-1, Math.min(1, v));
    peak = Math.max(peak, Math.abs(cl)); sum += cl * cl;
    out[i] = cl < 0 ? cl * 0x8000 : cl * 0x7fff;
  }
  const buf = new ArrayBuffer(44 + out.length * 2);
  const dv = new DataView(buf);
  const w = (o, t) => { for (let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
  w(0, "RIFF"); dv.setUint32(4, 36 + out.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, "data"); dv.setUint32(40, out.length * 2, true);
  new Int16Array(buf, 44).set(out);
  return { buf, seconds: len / sr, peak, rms: Math.sqrt(sum / len) };
}
function b64(buf) {
  const u8 = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}
window.__planetToWav = toWav16k;   // 電腦測試用（MP3 → WAV → AI）
window.__listenGrammar = t => grammarCheck(t);   // 電腦測試用
window.__listenPlace = t => guessedLid(t);

function stopRec() {   // 換題時丟掉還在錄的音
  if (!rec) return;
  rec.onstop = null;
  if (rec.state === "recording") rec.stop();
  rec.stream?.getTracks().forEach(t => t.stop());
  rec = null;
  tell({ type: "unmute" });
}
async function startRec() {
  if (rec) { if (rec.state === "recording") rec.stop(); return; }
  audioCtx();   // Safari：一定要在按鈕的那一下建立／喚醒 AudioContext，之後才能解碼
  const q = Q;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {
    drawSpeak("沒有麥克風權限：請在 Safari 允許使用麥克風後再試。"); return;
  }
  const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || "";
  const chunks = [];
  rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    tell({ type: "unmute" });
    const blob = new Blob(chunks, { type: rec?.mimeType || type || "audio/mp4" });
    rec = null;
    if (Q !== q) return;
    drawSpeak("AI 評分中… Scoring…", Q.last || null, Q.lastJ || null);
    quiz.querySelector("[data-act=rec]")?.setAttribute("disabled", "");
    let wav;
    try {
      wav = await toWav16k(blob);
    } catch (err) {
      console.warn("decode failed", err);
      drawSpeak("錄音沒有存好，請再錄一次（這次不算次數）。");
      return;
    }
    if (wav.seconds < 0.8 || wav.peak < 0.02) {
      drawSpeak("聽不到聲音，請靠近一點、大聲說（這次不算次數）。");
      return;
    }
    try {
      const words = Object.values(BANK.places).map(p => p.word);
      const res = await scoreGuess({ base64Audio: b64(wav.buf), mimeType: "audio/wav", words, fake: { sentence: answerText(Q.place) } });
      if (Q !== q) return;
      Q.aiErrors = 0;
      Q.tries++;
      Q.best = Math.max(Q.best || 0, res.total_score);
      Q.last = res;
      const J = judgeSpeak(res);
      Q.lastJ = J;
      if (!J.pass) {
        Q.fails++;
        if (!J.placeOk && Q.tries >= HINT_FROM) Q.hint = true;
        Q.why = J.why;
      }
      window.__listenLastJudge = { tries: Q.tries, pass: J.pass, lid: J.lid, placeOk: J.placeOk, grammarOk: J.g.ok, errors: J.g.errors,
        fixed: J.g.fixed.map(x => x.t).join(" "), scoreOk: J.scoreOk, why: J.why, hint: !!Q.hint, transcript: res.transcript, total: res.total_score };
      drawSpeak("", res, J);
    } catch (err) {
      console.warn("speech AI failed", err);
      if (Q !== q) return;
      Q.aiErrors = (Q.aiErrors || 0) + 1;
      if (Q.aiErrors >= MAX_AI_ERRORS) { Q.type = "choice"; Q.note = "AI 沒有回應，改選擇題"; drawHead(); drawChoice("AI 暫時沒有回應，這題改用選的。"); return; }
      drawSpeak("AI 暫時沒有回應，請再錄一次（這次不算次數）。");
    }
  };
  // 錄音前先請遊戲靜音（背景音樂、環境音）、停掉默劇影片（有音效），等 0.4 秒讓聲音真的停下來再開始錄（老師 11/08）
  pauseVideo();
  tell({ type: "mute" });
  await new Promise(r => setTimeout(r, 400));
  if (!rec || Q !== q) { stream.getTracks().forEach(t => t.stop()); if (rec) tell({ type: "unmute" }); rec = null; return; }
  rec.start();
  const btn = quiz.querySelector("[data-act=rec]");
  if (btn) { btn.textContent = "⏹ 說完了 Stop"; btn.classList.add("on"); }
  const mine = rec;
  setTimeout(() => mine.state === "recording" && mine.stop(), 8000);
}

quiz.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || !Q) return;
  const act = b.dataset.act;
  if (act === "replay") { replayClue(); return; }
  if (act === "vplay") { playVideo(); return; }
  if (act === "pattern") { tell({ type: "pattern" }); return; }
  if (!Q.clueDone) return;   // 線索還沒看完：不能作答
  if (b.dataset.pick) {
    const spoke = Q.note ? `（${Q.note}）` : "";
    if (!Q.note) Q.tries = 1;
    finish(b.dataset.pick === Q.lid, answerText(BANK.places[b.dataset.pick]) + spoke, Q.best ? { ai: Q.best } : {});
    return;
  }
  if (Q.type === "drag") {
    const D = Q.drag;
    if (b.dataset.tile) { const i = D.placed.indexOf(null); if (i >= 0) D.placed[i] = b.dataset.tile; drawDrag(); return; }
    if (b.dataset.slot) { D.placed[Number(b.dataset.slot)] = null; drawDrag(); return; }
    if (act === "clear") { D.placed = D.placed.map(() => null); drawDrag(); return; }
    if (act === "check" && D.placed.every(Boolean)) {
      const said = D.placed.map(id => D.tiles.find(t => t.id === id).text);
      const ok = said.every((w, i) => w === D.answers[i]);
      Q.tries = 1;
      finish(ok, said.join(" / "));
      return;
    }
  }
  if (Q.type === "speak") {
    if (act === "rec") { startRec(); return; }
    if (act === "reveal" && Q.last && Q.lastJ?.pass) {
      finish(true, `說：${Q.last.transcript}（AI ${Q.last.total_score}，錄 ${Q.tries} 次）`, { ai: Q.last.total_score, said: clip(Q.last.transcript) });
      return;
    }
    if (act === "release" && Q.last && Q.tries >= MAX_TRIES) {   // 5 次沒過：去揭曉、記答錯
      finish(false, `說：${Q.last.transcript}（${MAX_TRIES} 次未通過：${Q.why || ""}）`,
        { ai: Q.best, said: clip(Q.last.transcript), note: clip(`口說 ${MAX_TRIES} 次未通過：${Q.why || ""}`, 120) });
    }
  }
});

// ------------------------------------------------------------------ screens
function renderStart(message = "") {
  state = null;
  closeQuiz();
  app.innerHTML = `<main class="screen"><section class="panel">
    <h1>${esc(BANK.unit)}</h1>
    <p class="en">${esc(BANK.title)}</p>
    <p>聽聲音、看圖示、看 Ken 比手畫腳，猜猜 Ken 要去二水的哪裡！<br>Where are you going? — I'm going to the ___.</p>
    <form id="startForm">
      <label for="sid">學號 Student ID</label>
      <input id="sid" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="50100" required>
      <p class="msg" id="msg">${esc(message)}</p>
      <button class="btn primary" type="submit">▶ Start</button>
    </form>
    <p class="small">每一輪 ${N()} 題・猜對一題 +${BANK.pointsPer} 分・iPad 請橫放、戴耳機更好聽<br>English audio is AI-generated, not a human recording.<br>Sound effects: KIE AI (Suno Sounds), Kenney (CC0) · Mime videos: KIE AI (Seedance) · Icons: AI-generated · Music: Suno · 3D buildings: Tripo</p>
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
    state = saved ? { activeDays: [], cleared: [], results: {}, types: {}, ...saved } : newAttempt(sid);
    if (saved && saved !== mine && mine?.attemptId !== saved.attemptId) {
      state.attemptId = `${sid}-${Date.now().toString(36)}`;
      if (Object.keys(state.results).length && !state.completedAt) persist(true);
    }
    renderGame();
  });
}
function renderGame() {
  outbox = [];
  app.innerHTML = `<div class="game"><iframe id="game" title="${esc(BANK.unit)}" src="../ershui-planet/index.html" allow="autoplay; fullscreen; microphone"></iframe></div>`;
}
function renderResult() {
  const sm = summaryOf(state);
  app.innerHTML = `<main class="screen result">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
    <section class="panel">
      <h1>Great listening!</h1>
      <p class="en">逛完二水了！</p>
      <p class="big-id">${esc(state.studentId)}</p>
      <p class="score">${sm.score}<small> / ${BANK.maxScore}</small></p>
      <div class="stats">
        <div><b>${sm.correct}/${N()}</b><span>猜對</span></div>
        <div><b>${esc(sm.routeLabel)}</b><span>口說</span></div>
      </div>
      <button class="btn primary" id="again">🎧 再玩一次 Play again</button>
      <br><a class="home" href="../ershui-planet/">← 回到二水小行星首頁</a>
    </section></main>`;
  new Audio("../hwg5-u01-u02/assets/audio/sfx/celebrate.mp3").play().catch(() => {});
  app.querySelector("#again").addEventListener("click", renderGame);
}

export function start(bank) {
  BANK = bank;
  MISSION = bank.mission;
  document.title = bank.unit;
  renderStart();
}
