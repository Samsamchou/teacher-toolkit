// 二水小行星 Free Time 兩人一組線索挑戰（Pair Clue Challenge）— 雙學號外框＋題目面板（rev 3，老師確認）。
// 照 Listen and Guess 外框（../ershui-3d-quest-planetlisten/listen-app.mjs）改寫。
// 遊戲（iframe ../ershui-freetime/）負責：播情境＋線索 → ask() 請外框出題；外框出題（選擇 3／拖放 3／口說 5，
// 每回合隨機分配、存在 cleared 的 "types:"），學生作答後 poll() 回傳 {type:"answer", correct, pick}，遊戲讓 Ken 演出答案。
// 兩人共用一台 iPad：登入時把兩個學號連在一起輸入（例如 6010160126 ＝ 60101＋60126）；口說題兩人輪流錄音。
// 進度（questProgress）兩個學號各存一份、cleared 裡有 "pair:A+B"；作答紀錄（questAttempts）每人各一份、內容相同。
import { uploadAttempt, loadProgress, saveProgress } from "../shared/quest-cloud.mjs";
import { available as aiAvailable, scoreGuess } from "./speech-ai.mjs";

let BANK = null;
let MISSION = "";
const KEY = sid => `quest3d:v1:${MISSION}:${sid}`;
const STUDENT_ID = /^\d{5,8}$/u;          // 和小行星其他任務同一條（資料庫規則 ^[0-9]{5,8}$）
const PAIR_INPUT = /^\d{10}$/u;           // 兩個 5 位數學號連在一起
const ITEM_ID = /^q(0[1-9]|1[01])$/u;
const app = document.getElementById("app");
const quiz = document.getElementById("quiz");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const clip = (s, n = 80) => String(s ?? "").slice(0, n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let state = null;  // { pair:[A,B], attemptIds:{A,B}, startedAt, updatedAt, completedAt, results, cleared, activeDays }
let outbox = [];   // 給遊戲的訊息（poll 一次拿一個）

// ------------------------------------------------------------------ pair login
// 回傳 [A, B] 或錯誤訊息字串
function splitPair(raw) {
  const v = String(raw || "").replace(/\s+/g, "");
  if (!PAIR_INPUT.test(v)) return "請把兩個人的學號連在一起輸入，共 10 位數字（例如 6010160126）。Type both student IDs together: 10 digits.";
  const a = v.slice(0, 5), b = v.slice(5);
  if (!STUDENT_ID.test(a) || !STUDENT_ID.test(b)) return "學號格式不對。Please check the student IDs.";
  if (a === b) return "兩個學號不能一樣。The two student IDs must be different.";
  return [a, b];
}
const pairTag = p => `pair:${p[0]}+${p[1]}`;

// ------------------------------------------------------------------ storage
const local = {
  load(sid) { try { const r = localStorage.getItem(KEY(sid)); return r ? JSON.parse(r) : null; } catch { return null; } },
  save(rec) { try { localStorage.setItem(KEY(rec.studentId), JSON.stringify(rec)); } catch { /* private mode */ } },
};
const newId = sid => `${sid}-${Date.now().toString(36)}`;
function newAttempt(pair) {
  const now = new Date().toISOString();
  return { pair, attemptIds: Object.fromEntries(pair.map(sid => [sid, newId(sid)])), startedAt: now, updatedAt: now,
    completedAt: null, results: {}, cleared: [pairTag(pair)], activeDays: [] };
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
const N = () => BANK.items.length;
// 這一輪的路線（ken_a／ken_b／shuiling／zunbo）：遊戲開始時 report({type:"start", route}) → 存在 cleared 的 "route:<id>"
const routeIdOf = s => {
  const row = (s?.cleared || []).find(c => String(c).startsWith("route:"));
  const id = row ? String(row).slice(6) : "";
  return BANK.routes?.[id] ? id : (BANK.defaultRoute || "ken_a");
};
const R = (s = state) => BANK.routes[routeIdOf(s)];
function summaryOf(s) {
  const n = answered(s);
  const avg = speakAvg(s);
  return {
    total: N(), finished: n, firstTry: correct(s), correct: correct(s), attempts: n, hintsUsed: 0,
    battlesDone: 0, score: scoreOf(s), maxScore: BANK.maxScore, mode: "pair", route: 0,
    modeLabel: `Free Time Pair Challenge · ${R(s).label}`, routeLabel: avg == null ? "—" : `口說平均 ${avg}`,
    current: s.completedAt ? n : Math.min(n + 1, N()),
    note: `Free Time 兩人一組（${s.pair[0]}＋${s.pair[1]}）・路線 ${R(s).label}・${avg == null ? "無口說題" : `口說平均 ${avg}`}・${s.completedAt ? "完成" : `第 ${Math.min(n + 1, N())}/${N()} 題`}`,
  };
}
// 每個學號各一份；欄位和 Listen and Guess 的 cloudRecord 一樣（教師後台 kind "planet" 讀 summary.note、items）
function cloudRecord(s, sid) {
  return {
    mission: MISSION, studentId: sid, attemptId: s.attemptIds[sid], startedAt: s.startedAt,
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
function progressRecord(s, sid) {
  return { mission: MISSION, studentId: sid, attemptId: s.attemptIds[sid], startedAt: s.startedAt,
    updatedAt: s.updatedAt, completedAt: s.completedAt || null, results: s.results, cleared: s.cleared,
    version: 1, activeDays: s.activeDays.slice(-60) };
}
// quest-cloud 只留一筆待送（後送的會蓋掉前一筆），所以兩個學號都用 immediate，各自立刻送出。
function persist() {
  state.updatedAt = new Date().toISOString();
  const d = today();
  if (!state.activeDays.includes(d)) state.activeDays.push(d);
  for (const sid of state.pair) {
    local.save(progressRecord(state, sid));
    saveProgress(progressRecord(state, sid), { immediate: true });
    uploadAttempt(cloudRecord(state, sid), { immediate: true });
  }
}
// 登入：兩個學號的本機＋雲端進度，取 cleared 有同一組 "pair:A+B" 的最新一份；沒有就重新開始
async function loadPair(pair) {
  const tag = pairTag(pair);
  const clouds = await Promise.all(pair.map(sid => withTimeout(loadProgress(MISSION, sid), 6000)));
  const locals = pair.map(sid => local.load(sid));
  const ok = (r, sid) => r && r.studentId === sid && Array.isArray(r.cleared) && r.cleared.includes(tag) ? r : null;
  let best = null;
  pair.forEach((sid, i) => { best = newer(best, ok(locals[i], sid)); best = newer(best, ok(clouds[i], sid)); });
  if (!best) return { s: newAttempt(pair), fresh: false };
  const s = { pair, attemptIds: {}, startedAt: best.startedAt, updatedAt: best.updatedAt, completedAt: best.completedAt || null,
    results: best.results || {}, cleared: best.cleared, activeDays: best.activeDays || [] };
  // 這台裝置自己建的紀錄（同一次開始）沿用 attemptId；從別台裝置接續的就開新的 attemptId（questAttempts 只能改自己建的）
  let fresh = false;
  pair.forEach((sid, i) => {
    const l = ok(locals[i], sid);
    if (l && l.startedAt === best.startedAt && l.attemptId) s.attemptIds[sid] = l.attemptId;
    else { s.attemptIds[sid] = newId(sid); fresh = true; }
  });
  return { s, fresh };
}

// ------------------------------------------------------------------ bridge used by the Godot game
window.ershuiHost = {
  getInitial() {
    return state ? { studentId: state.pair[0], pair: [...state.pair], results: state.results, cleared: state.cleared, mode: "pair" } : {};
  },
  report(json) {
    if (!state) return;
    let m;
    try { m = JSON.parse(json); } catch { return; }
    if (m.type === "start" && Number.isInteger(m.seed)) {
      if (Object.keys(state.results).length || state.completedAt) state = newAttempt(state.pair);
      const route = BANK.routes?.[m.route] ? m.route : (BANK.defaultRoute || "ken_a");
      state.cleared = ["mode:pair", "set:0", `seed:${m.seed}`, `route:${route}`, pairTag(state.pair), "types:" + shuffle([...MIX]).map(t => CODE[t]).join("")];
      state.results = {};
      state.completedAt = null;
      persist();
    } else if (m.type === "complete") {
      state.completedAt = new Date().toISOString();
      persist();
      closeQuiz();
      renderResult();
    }
  },
  ask(json) {
    let m;
    try { m = JSON.parse(json); } catch { return; }
    if (state && m && typeof m.id === "string" && ITEM_ID.test(m.id)) openQuiz(m.id);   // activity 以 data.js 為準
  },
  poll() { return outbox.length ? JSON.stringify(outbox.shift()) : ""; },
};
const tell = m => outbox.push(m);

// ------------------------------------------------------------------ question panel
const scenarioOf = id => R().scenarios.find(s => s.id === id);
const sentenceOf = act => R().activities[act].sentence;
// 每回合 11 題固定 5 口說＋3 拖放＋3 選擇，隨機分配到 q01–q11；存在 cleared 的 "types:sdc…"，換台 iPad 也一樣。
const MIX = ["speak", "speak", "speak", "speak", "speak", "drag", "drag", "drag", "choice", "choice", "choice"];
const CODE = { speak: "s", drag: "d", choice: "c" };
function typeCode() {
  const row = (state.cleared || []).find(c => String(c).startsWith("types:"));
  if (row && String(row).length === 6 + N()) return String(row).slice(6);
  const code = shuffle([...MIX]).map(t => CODE[t]).join("");
  state.cleared = [...(state.cleared || []).filter(c => !String(c).startsWith("types:")), "types:" + code];
  persist();
  return code;
}
function typeTable() {
  const code = typeCode();
  return Object.fromEntries(BANK.items.map((it, i) => [it.id, { s: "speak", d: "drag", c: "choice" }[code[i]] || "choice"]));
}
// 口說題輪流：本回合第 1、3、5 個口說題＝第一個學號，第 2、4 個＝第二個學號
function speakerOf(id) {
  const code = typeCode();
  const idx = BANK.items.findIndex(it => it.id === id);
  let k = 0;
  for (let i = 0; i <= idx; i++) if (code[i] === "s") k++;
  return state.pair[(Math.max(k, 1) - 1) % 2];
}
function pickType(id) {
  const t = typeTable()[id] || "choice";
  return t === "speak" && !aiAvailable() ? "choice" : t;   // AI 不能用時，口說題臨時改選擇題
}
let Q = null;   // 目前這一題 {id, sc, act, type, ...}

function openQuiz(id) {
  const sc = scenarioOf(id);
  if (!sc) return;
  stopRec();
  const type = pickType(id);
  Q = { id, sc, act: sc.activity, type, tries: 0, fails: 0, by: type === "speak" ? speakerOf(id) : null };
  quiz.hidden = false;
  if (type === "choice") drawChoice();
  else if (type === "drag") drawDrag(true);
  else drawSpeak();
}
function closeQuiz() { quiz.hidden = true; quiz.innerHTML = ""; Q = null; }
const head = sub => `<div class="qhead"><b>${esc(R().question)}</b><span>${esc(sub)}</span>
  <button class="btn ghost small" data-act="replay">🔊 再聽一次 Listen again</button></div>`;

function finish(ok, pick, extra = {}) {
  state.results[Q.id] = { type: Q.type, attempts: Q.tries || 1, finalCorrect: ok, act: Q.act, route: routeIdOf(state),
    q: clip(Q.sc.context), a: sentenceOf(Q.act), pick: clip(pick), ...extra };
  persist();
  tell({ type: "answer", correct: ok, pick });
  closeQuiz();
}

// 選擇題：情境的 3 個選項（固定順序）
function drawChoice(msg = "") {
  quiz.innerHTML = `${head(`看線索，選出 ${R().name} 會做什麼 Choose the answer`)}${msg ? `<p class="msg">${esc(msg)}</p>` : ""}
    <div class="choices">${Q.sc.options.map((o, i) => `<button class="btn opt" data-pick="${i}">${"ABC"[i]}　${esc(o)}</button>`).join("")}</div>`;
}

// 拖放題：I [ ][ ]… in my free time.（水鈴：She … in her free time.／圳寶：He … in his free time.）每個答案字一格；字卡＝答案字＋3 個其他活動的字
function dragModel() {
  const answers = R().activities[Q.act].phrase.split(" ");
  const low = new Set(answers.map(w => w.toLowerCase()));
  const pool = [];
  for (const [k, a] of Object.entries(R().activities)) {
    if (k === Q.act) continue;
    for (const w of a.phrase.split(" ")) {
      const l = w.toLowerCase();
      if (!low.has(l) && !pool.some(p => p.toLowerCase() === l)) pool.push(w);
    }
  }
  const tiles = shuffle([...answers, ...shuffle(pool).slice(0, 3)]).map((t, i) => ({ id: `t${i}`, text: t }));
  return { answers, tiles, placed: answers.map(() => null) };
}
function drawDrag(init = false) {
  if (init) Q.drag = dragModel();
  const D = Q.drag;
  const used = new Set(D.placed.filter(Boolean));
  const slots = D.placed.map((id, b) => {
    const tile = D.tiles.find(x => x.id === id);
    return `<button class="slot ${tile ? "filled" : ""}" data-slot="${b}">${tile ? esc(tile.text) : "&nbsp;"}</button>`;
  }).join(" ");
  const pool = D.tiles.map(t => used.has(t.id) ? `<span class="tile ghost"></span>` : `<button class="tile" data-tile="${t.id}">${esc(t.text)}</button>`).join("");
  const full = D.placed.every(Boolean);
  quiz.innerHTML = `${head(`點字卡放進空格，拼出 ${R().name} 的答案 Tap the words`)}
    <p class="sent"><span class="w">${esc(R().subject)}</span> ${slots} <span class="w">in ${esc(R().possessive)} free time.</span></p><div class="pool">${pool}</div>
    <div class="row"><button class="btn ghost" data-act="clear">Clear 清除</button>
    <button class="btn primary" data-act="check" ${full ? "" : "disabled"}>Go! ✓</button></div>`;
}

// 口說題：不顯示答案句，只給句型；兩人輪流
let rec = null;
function drawSpeak(msg = "", result = null) {
  const pass = result && result.total_score >= BANK.passSpeak;
  quiz.innerHTML = `${head(`用英文說出 ${R().name} 會做什麼（自己猜！）Say your guess`)}
    <p class="turn">🎙 輪到 ${esc(Q.by)} 說 / ${esc(Q.by)}'s turn</p>
    <p class="sent hint">${esc(R().subject)} <span class="blank">______</span> in ${esc(R().possessive)} free time.</p>
    <p class="msg">第 ${Math.min(Q.tries + (pass ? 0 : 1), MAX_TRIES)}／${MAX_TRIES} 次${Q.best ? `・最高 ${Q.best} 分` : ""}</p>
    ${result ? `<div class="ai ${pass ? "good" : "try"}">
      <p class="said">你說：「${esc(result.transcript || "（聽不清楚）")}」</p>
      <p class="scores"><b>${result.total_score}</b> 總分　發音 ${result.accuracy}・流暢 ${result.fluency}・完整 ${result.completeness}</p>
      <p>${esc(result.feedback)}</p>
      ${pass ? "" : `<p class="need">要 ${BANK.passSpeak} 分以上才能去揭曉，再錄一次！</p>`}</div>` : ""}
    <p class="msg">${esc(msg)}</p>
    <div class="row">
      ${pass ? `<button class="btn primary" data-act="reveal">Go! 去揭曉 ▶</button>`
        : `<button class="btn primary rec" data-act="rec">${Q.tries ? "🎙 再錄一次 Record again" : "🎙 錄音 Record"}</button>
           ${Q.fails >= 2 ? `<button class="btn ghost" data-act="pattern">🔈 聽句型示範</button>` : ""}`}
    </div>`;
  if (result) quiz.querySelector(".row")?.scrollIntoView({ block: "nearest" });   // 面板較矮時讓按鈕看得到
}
// ---- 錄音 → 16 kHz WAV（iPad Safari 錄出 MP4，Gemini 不收；在裝置上解碼、混單聲道再送）
const MAX_TRIES = 5;          // 第 5 次仍未滿 80 分才改選擇題
const MAX_AI_ERRORS = 3;      // AI／網路沒回應不算次數；3 次才改選擇題
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
window.__freetimeToWav = toWav16k;   // 電腦測試用

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
  audioCtx();   // Safari：一定要在按鈕的那一下建立／喚醒 AudioContext
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
    if (Q !== q) return;   // 題目已經換了
    drawSpeak("AI 評分中… Scoring…");
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
      const phrases = Object.values(R().activities).map(a => a.phrase);
      const res = await scoreGuess({ base64Audio: b64(wav.buf), mimeType: "audio/wav", phrases, pattern: R().pattern, example: R().example, who: R().name });
      if (Q !== q) return;
      Q.aiErrors = 0;
      Q.tries++;
      Q.best = Math.max(Q.best || 0, res.total_score);
      Q.last = res;
      if (res.total_score < BANK.passSpeak) {
        Q.fails++;
        if (Q.tries >= MAX_TRIES) {   // 第 5 次仍未滿 80 分 → 改成選擇題
          Q.type = "choice";
          Q.note = `口說 ${MAX_TRIES} 次最高 ${Q.best} 分，改選擇題`;
          drawChoice(`錄了 ${MAX_TRIES} 次還沒到 ${BANK.passSpeak} 分，改用選的。最高分：${Q.best}`);
          return;
        }
      }
      drawSpeak("", res);
    } catch (err) {
      console.warn("speech AI failed", err);
      if (Q !== q) return;
      Q.aiErrors = (Q.aiErrors || 0) + 1;
      if (Q.aiErrors >= MAX_AI_ERRORS) { Q.type = "choice"; Q.note = "AI 沒有回應，改選擇題"; drawChoice("AI 暫時沒有回應，這題改用選的。"); return; }
      drawSpeak("AI 暫時沒有回應，請再錄一次（這次不算次數）。");
    }
  };
  // 錄音前先請遊戲靜音，等 0.4 秒讓聲音真的停下來再開始錄
  tell({ type: "mute" });
  await new Promise(r => setTimeout(r, 400));
  if (!rec || Q !== q) { stream.getTracks().forEach(t => t.stop()); if (rec) tell({ type: "unmute" }); rec = null; return; }
  rec.start();
  const btn = quiz.querySelector("[data-act=rec]");
  if (btn) { btn.textContent = "⏹ 說完了 Stop"; btn.classList.add("on"); }
  const mine = rec;
  setTimeout(() => mine.state === "recording" && mine.stop(), 8000);
}
// 從逐字稿猜學生說的是哪個活動（籃球／棒球先比，再比其他）。
// 用關鍵字比對，所以第三人稱句子也算對：She goes jogging…（jog）、He watches TV…（tv）、She studies English…（english）、
// He plays…、She listens to music…、He rides a bike…、She surfs the Internet…
const KEYWORDS = [
  ["basketball", ["basketball", "basket ball"]], ["baseball", ["baseball", "base ball"]],
  ["recorder", ["recorder"]], ["games", ["online game", "games", "game"]], ["internet", ["internet", "surf"]],
  ["tv", [" tv ", " t v ", "television"]], ["english", ["english"]], ["music", ["music"]],
  ["bike", ["bike", "bicycle"]], ["jogging", ["jog"]], ["camping", ["camp"]],
];
function guessedAct(transcript) {
  const t = ` ${String(transcript).toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ")} `;
  return KEYWORDS.find(([, ks]) => ks.some(k => t.includes(k)))?.[0] || "";
}

quiz.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || !Q) return;
  const act = b.dataset.act;
  if (act === "replay") { tell({ type: "replay" }); return; }
  if (act === "pattern") { tell({ type: "pattern" }); return; }
  if (b.dataset.pick != null && b.dataset.pick !== "") {
    const i = Number(b.dataset.pick);
    const spoke = Q.note ? `（${Q.note}）` : "";
    if (!Q.note) Q.tries = 1;
    finish(i === Q.sc.answer, Q.sc.options[i] + spoke, { ...(Q.best ? { ai: Q.best } : {}), ...(Q.by ? { by: Q.by } : {}) });
    return;
  }
  if (Q.type === "drag") {
    const D = Q.drag;
    if (b.dataset.tile) { const i = D.placed.indexOf(null); if (i >= 0) D.placed[i] = b.dataset.tile; drawDrag(); return; }
    if (b.dataset.slot) { D.placed[Number(b.dataset.slot)] = null; drawDrag(); return; }
    if (act === "clear") { D.placed = D.placed.map(() => null); drawDrag(); return; }
    if (act === "check" && D.placed.every(Boolean)) {
      const said = D.placed.map(id => D.tiles.find(t => t.id === id).text);
      const ok = said.every((w, i) => w.toLowerCase() === D.answers[i].toLowerCase());
      Q.tries = 1;
      finish(ok, `${R().subject} ${said.join(" ")} in ${R().possessive} free time.`);
      return;
    }
  }
  if (Q.type === "speak") {
    if (act === "rec") { startRec(); return; }
    if (act === "reveal" && Q.last) {
      const g = guessedAct(Q.last.transcript);
      finish(g === Q.act, `${Q.by} 說：${Q.last.transcript}（AI ${Q.last.total_score}，錄 ${Q.tries} 次）`,
        { ai: Q.last.total_score, said: clip(Q.last.transcript), by: Q.by });
    }
  }
});

// ------------------------------------------------------------------ screens
function renderStart(message = "") {
  state = null;
  closeQuiz();
  app.innerHTML = `<main class="screen"><section class="panel">
    <h1>Free Time 兩人一組線索挑戰</h1>
    <p class="en">Pair Clue Challenge · Guess their free time!</p>
    <p>登入後選路線：Ken A／Ken B／水鈴 Shuiling／圳寶 Zun-Bo<br>每題：聽情境 → 看線索 → 作答（選擇 3、拖放 3、口說 5）→ 角色演出答案<br>口說題兩人輪流錄音。I ___ in my free time.／She ___ in her free time.／He ___ in his free time.</p>
    <form id="startForm">
      <label for="sid">兩人學號連在一起 Both student IDs</label>
      <input id="sid" type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="6010160126" required>
      <p class="pairview" id="pairview"></p>
      <p class="msg" id="msg">${esc(message)}</p>
      <button class="btn primary" type="submit">▶ Start</button>
    </form>
    <p class="small">每一輪 ${N()} 題・答對一題 +${BANK.pointsPer} 分・iPad 請橫放<br>English audio is AI-generated, not a human recording.<br>Sound effects: KIE AI (Suno Sounds), Kenney (CC0) · Music: Suno · 3D buildings: Tripo</p>
    <a class="home" href="../ershui-freetime/">← 回到二水小行星 Free Time 首頁</a>
  </section></main>`;
  const form = app.querySelector("#startForm");
  const input = app.querySelector("#sid");
  const view = app.querySelector("#pairview");
  input.addEventListener("input", () => {
    const p = splitPair(input.value);
    view.textContent = Array.isArray(p) ? `${p[0]} ＋ ${p[1]}` : "";
    if (Array.isArray(p)) app.querySelector("#msg").textContent = "";
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const p = splitPair(input.value);
    if (!Array.isArray(p)) { app.querySelector("#msg").textContent = p; return; }
    form.querySelector("button").disabled = true;
    app.querySelector("#msg").textContent = "讀取進度中… Loading your progress…";
    const { s, fresh } = await loadPair(p);
    state = s;
    if (fresh && Object.keys(state.results).length && !state.completedAt) persist();
    renderGame();
  });
}
function renderGame() {
  outbox = [];
  app.innerHTML = `<div class="game"><iframe id="game" title="${esc(BANK.unit)}" src="../ershui-freetime/index.html" allow="autoplay; fullscreen; microphone"></iframe></div>`;
}
function renderResult() {
  const sm = summaryOf(state);
  app.innerHTML = `<main class="screen result">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
    <section class="panel">
      <h1>Great teamwork!</h1>
      <p class="en">兩人一組挑戰完成！</p>
      <p class="big-id pair">${esc(state.pair[0])} ＋ ${esc(state.pair[1])}</p>
      <p class="en">Route 路線：${esc(R().label)}</p>
      <p class="score">${sm.score}<small> / ${BANK.maxScore}</small></p>
      <div class="stats">
        <div><b>${sm.correct}/${N()}</b><span>答對</span></div>
        <div><b>${esc(sm.routeLabel)}</b><span>口說</span></div>
      </div>
      <button class="btn primary" id="again">🔁 再玩一次 Play again</button>
      <br><a class="home" href="../ershui-freetime/">← 回到二水小行星 Free Time 首頁</a>
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
