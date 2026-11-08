// 二水小行星 Listen and Guess — 學號外框＋題目面板（RDQ 2026-11-08，rev 2）。
// 遊戲（iframe ../ershui-planet/）負責：Ken 說情境＋問 Where are you going? → 播環境音 → ask() 請外框出題；
// 外框出題（選擇／拖放／口說三選一，每題隨機、存在紀錄裡），學生作答後 poll() 回傳 {type:"answer", correct}；
// 遊戲讓 Ken 走過去揭曉、要聽完答句才能 Next。面板上的「再聽一次」「句型示範」也經 poll() 請遊戲播放。
// 計分：猜對 +10（滿分 80）。口說題 AI 總分 80 以上才可以去揭曉；猜對地點另外記。
// 雲端和個人模式同一套（questProgress＋questAttempts），只存學號與成績。
import { uploadAttempt, loadProgress, saveProgress } from "../shared/quest-cloud.mjs";
import { available as aiAvailable, scoreGuess } from "./speech-ai.mjs";

let BANK = null;
let MISSION = "";
const KEY = sid => `quest3d:v1:${MISSION}:${sid}`;
const STUDENT_ID = /^\d{5,8}$/u;
const ITEM_ID = /^q0[1-8]$/u;
const app = document.getElementById("app");
const quiz = document.getElementById("quiz");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const clip = (s, n = 80) => String(s ?? "").slice(0, n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let state = null;
let outbox = [];   // 給遊戲的訊息（poll 一次拿一個）

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
    total: BANK.items.length, finished: n, firstTry: correct(s), correct: correct(s), attempts: n, hintsUsed: 0,
    battlesDone: 0, score: scoreOf(s), maxScore: BANK.maxScore, mode: "listen", route: 0,
    modeLabel: "Listen and Guess", routeLabel: avg == null ? "—" : `口說平均 ${avg}`,
    current: s.completedAt ? n : Math.min(n + 1, BANK.items.length),
    note: `Listen and Guess・${avg == null ? "無口說題" : `口說平均 ${avg}`}・${s.completedAt ? "完成" : `第 ${Math.min(n + 1, 8)}/8 題`}`,
  };
}
function cloudRecord(s) {
  return {
    mission: MISSION, studentId: s.studentId, attemptId: s.attemptId, startedAt: s.startedAt,
    updatedAt: s.updatedAt, completedAt: s.completedAt || null, stepIndex: answered(s), stepCount: 8, version: 1,
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
      state.cleared = ["mode:listen", "set:0", `seed:${m.seed}`, "types:" + shuffle([...MIX]).map(t => CODE[t]).join("")];
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
    if (state && ITEM_ID.test(m.id) && BANK.places[m.lid]) openQuiz(m.id, m.lid);
  },
  poll() { return outbox.length ? JSON.stringify(outbox.shift()) : ""; },
};
const tell = m => outbox.push(m);

// ------------------------------------------------------------------ question panel
const answerText = p => `I'm going to ${p.the ? "the " : ""}${p.word}.`;
// 題型（老師 11/08，RDQ-spec-listen-type-mix）：每回合 8 題固定 4 口說＋2 拖放＋2 選擇，隨機分配到 q01–q08。
// 存在 cleared 的 "types:sdcs…"（s＝口說、d＝拖放、c＝選擇），換一台 iPad「繼續上次」也一樣；不用改資料庫規則。
const MIX = ["speak", "speak", "speak", "speak", "drag", "drag", "choice", "choice"];
const CODE = { speak: "s", drag: "d", choice: "c" };
function typeTable() {
  const row = (state.cleared || []).find(c => String(c).startsWith("types:"));
  if (row) {
    const code = String(row).slice(6);
    if (code.length === 8) return Object.fromEntries(BANK.items.map((it, i) => [it.id, { s: "speak", d: "drag", c: "choice" }[code[i]] || "choice"]));
  }
  const mix = shuffle([...MIX]);
  state.cleared = [...(state.cleared || []).filter(c => !String(c).startsWith("types:")), "types:" + mix.map(t => CODE[t]).join("")];
  persist(true);
  return Object.fromEntries(BANK.items.map((it, i) => [it.id, mix[i]]));
}
function pickType(id) {
  const t = typeTable()[id] || "choice";
  return t === "speak" && !aiAvailable() ? "choice" : t;   // AI 不能用時，口說題臨時改選擇題
}
let Q = null;   // 目前這一題 {id, lid, type, ...}

function openQuiz(id, lid) {
  const type = pickType(id);
  Q = { id, lid, type, place: BANK.places[lid], tries: 0, fails: 0 };
  quiz.hidden = false;
  if (type === "choice") drawChoice();
  else if (type === "drag") drawDrag(true);
  else drawSpeak();
}
function closeQuiz() { quiz.hidden = true; quiz.innerHTML = ""; Q = null; }
const head = sub => `<div class="qhead"><b>Where are you going?</b><span>${esc(sub)}</span>
  <button class="btn ghost small" data-act="replay">🔊 再聽一次 Listen again</button></div>`;

function finish(ok, pick, extra = {}) {
  const p = Q.place;
  state.results[Q.id] = { type: Q.type, attempts: Q.tries || 1, finalCorrect: ok, lid: Q.lid,
    q: "Where are you going?（聽環境音）", a: answerText(p), pick: clip(pick), ...extra };
  persist();
  tell({ type: "answer", correct: ok, pick });
  closeQuiz();
}

// 選擇題：4 個地點句子
function drawChoice(msg = "") {
  const others = shuffle(Object.keys(BANK.places).filter(k => k !== Q.lid)).slice(0, 3);
  Q.opts ||= shuffle([Q.lid, ...others]);
  quiz.innerHTML = `${head("聽聲音，選出你要去的地方")}${msg ? `<p class="msg">${esc(msg)}</p>` : ""}
    <div class="choices">${Q.opts.map((k, i) => `<button class="btn opt" data-pick="${k}">${"ABCD"[i]}　${esc(answerText(BANK.places[k]))}</button>`).join("")}</div>`;
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
  quiz.innerHTML = `${head("點字卡放進空格，猜猜你要去哪裡")}
    <p class="sent">${line.replace(/ \./, ".")}</p><div class="pool">${pool}</div>
    <div class="row"><button class="btn ghost" data-act="clear">Clear 清除</button>
    <button class="btn primary" data-act="check" ${full ? "" : "disabled"}>Go! 出發 ✓</button></div>`;
}

// 口說題：不顯示答案句，只給句型提示
let rec = null;
function drawSpeak(msg = "", result = null) {
  const pass = result && result.total_score >= BANK.passSpeak;
  quiz.innerHTML = `${head("用英文說出你要去哪裡（自己猜！）")}
    <p class="sent hint">I'm going to the <span class="blank">______</span>.</p>
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
}
// ---- 錄音 → WAV（2026-11-08 修正，RDQ-spec-listen-speak-fix）：iPad Safari 錄出 MP4，Gemini 不收；
// 照 hwg5-su-to-u04-story 的做法：在裝置上解碼、混成單聲道、轉 16 kHz 16-bit PCM WAV 再送。
const MAX_TRIES = 5;          // 老師：至少可以錄 5 次，第 5 次仍未滿 80 分才改選擇題
const MAX_AI_ERRORS = 3;      // AI／網路沒回應不算次數；連續 3 次才改選擇題
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
  // 降到 16 kHz（線性內插），檔案小、上傳快
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

async function startRec() {
  if (rec) { rec.stop(); return; }
  audioCtx();   // Safari：一定要在按鈕的那一下建立／喚醒 AudioContext，之後才能解碼
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
    const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/mp4" });
    rec = null;
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
      const words = Object.values(BANK.places).map(p => p.word);
      const res = await scoreGuess({ base64Audio: b64(wav.buf), mimeType: "audio/wav", words });
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
      Q.aiErrors = (Q.aiErrors || 0) + 1;
      if (Q.aiErrors >= MAX_AI_ERRORS) { Q.type = "choice"; drawChoice("AI 暫時沒有回應，這題改用選的。"); return; }
      drawSpeak("AI 暫時沒有回應，請再錄一次（這次不算次數）。");
    }
  };
  // 錄音前先請遊戲靜音（背景音樂、環境音），等 0.4 秒讓聲音真的停下來再開始錄（老師 11/08）
  tell({ type: "mute" });
  await new Promise(r => setTimeout(r, 400));
  rec.start();
  const btn = quiz.querySelector("[data-act=rec]");
  if (btn) { btn.textContent = "⏹ 說完了 Stop"; btn.classList.add("on"); }
  setTimeout(() => rec?.state === "recording" && rec.stop(), 8000);
}
function guessedLid(transcript) {
  const t = ` ${String(transcript).toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ")} `;
  const hit = Object.entries(BANK.places).filter(([, p]) => t.includes(` ${p.word} `) || t.includes(` ${p.word.replace(" ", "")} `));
  return hit.length === 1 ? hit[0][0] : hit.find(([k]) => k === Q.lid)?.[0] || (hit[0]?.[0] ?? "");
}

quiz.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || !Q) return;
  const act = b.dataset.act;
  if (act === "replay") { tell({ type: "replay" }); return; }
  if (act === "pattern") { tell({ type: "pattern" }); return; }
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
    if (act === "check") {
      const said = D.placed.map(id => D.tiles.find(t => t.id === id).text);
      const ok = said.every((w, i) => w === D.answers[i]);
      Q.tries = 1;
      finish(ok, said.join(" / "));
      return;
    }
  }
  if (Q.type === "speak") {
    if (act === "rec") { startRec(); return; }
    if (act === "reveal") {
      const g = guessedLid(Q.last.transcript);
      finish(g === Q.lid, `說：${Q.last.transcript}（AI ${Q.last.total_score}，錄 ${Q.tries} 次）`, { ai: Q.last.total_score, said: clip(Q.last.transcript) });
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
    <p>聽聽看是什麼聲音，猜猜 Ken 要去二水的哪裡！<br>Where are you going? — I'm going to the ___.</p>
    <form id="startForm">
      <label for="sid">學號 Student ID</label>
      <input id="sid" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="50100" required>
      <p class="msg" id="msg">${esc(message)}</p>
      <button class="btn primary" type="submit">▶ Start</button>
    </form>
    <p class="small">每一輪 8 題・猜對一題 +${BANK.pointsPer} 分・iPad 請橫放、戴耳機更好聽<br>English audio is AI-generated, not a human recording.<br>Sound effects: KIE AI (Suno Sounds), Kenney (CC0) · Music: Suno · 3D buildings: Tripo</p>
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
      <p class="en">聽完二水了！</p>
      <p class="big-id">${esc(state.studentId)}</p>
      <p class="score">${sm.score}<small> / ${BANK.maxScore}</small></p>
      <div class="stats">
        <div><b>${sm.correct}/8</b><span>猜對</span></div>
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
