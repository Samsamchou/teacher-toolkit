// 時鐘塔答題大作戰：學號 → 選題組 → 回合制答題戰鬥 → 結果（每份 100 分，雲端留紀錄）。
// 題庫：quizzes/<id>/bank.json（拼字 spell：字母方塊；拖放 drag：字卡放進空格）。第一次送出就全對才算分。
import { STUDENT_ID, HERO, MONSTERS, MONSTER_ROWS, BALANCE } from "./config.mjs";
import { sfx, unlock, setMuted, isMuted } from "./sfx.mjs";
import { uploadAttempt, onCloudStatus, cloudStatus, retryUpload } from "./cloud.mjs";

const app = document.getElementById("app");
const overlay = document.getElementById("overlay");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const taipeiDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(d);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 私密模式：雲端仍會存 */ } },
};
const bestKey = (quiz, sid) => `rpg-best:${quiz}:${sid}`;
try { setMuted(localStorage.getItem("rpg-muted") === "1"); } catch { /* ignore */ }

// ---------------------------------------------------------------- 精靈圖
const ROW_Y = r => `${(r * 100) / 3}%`;
function sprite(el, src, row, { loop = true, dur = loop ? 0.75 : 0.5 } = {}) {
  el.style.backgroundImage = `url(${src})`;
  el.style.backgroundPositionY = ROW_Y(row);
  el.classList.remove("loop", "once");
  void el.offsetWidth;                      // 重新觸發動畫
  el.style.setProperty("--dur", `${dur}s`);
  el.classList.add(loop ? "loop" : "once");
}
[HERO.sprite, ...new Set(MONSTERS.map(m => m.sprite))].forEach(src => { const i = new Image(); i.src = src; });

// ---------------------------------------------------------------- 開始畫面
let sid = null;
function startScreen(msg = "") {
  app.innerHTML = `
  <section class="screen"><form class="card" id="f" autocomplete="off">
    <div class="hero-pic"><div class="sprite" id="pic"></div></div>
    <h1 class="title">時鐘塔答題大作戰</h1>
    <p class="subtitle">答對題目就能攻擊怪物，救回時鐘塔！</p>
    <label class="field" for="sid">學號（5 碼：年級＋班級＋座號）</label>
    <input class="sid" id="sid" inputmode="numeric" maxlength="5" placeholder="50101" required>
    <p class="msg" id="msg">${esc(msg)}</p>
    <button class="btn wide" type="submit">開始冒險 ▶</button>
  </form></section>`;
  sprite(app.querySelector("#pic"), HERO.sprite, HERO.rows.idle);
  const input = app.querySelector("#sid");
  input.focus();
  app.querySelector("#f").onsubmit = e => {
    e.preventDefault(); unlock(); sfx.click();
    const v = input.value.trim();
    if (!STUDENT_ID.test(v)) { app.querySelector("#msg").textContent = "學號格式不對：例如 50101（5 年 01 班 01 號）。"; return; }
    sid = v; menuScreen();
  };
}

// ---------------------------------------------------------------- 選題組
let quizIndex = null;
async function menuScreen() {
  quizIndex ||= await fetch("quizzes/index.json").then(r => r.json());
  app.innerHTML = `
  <section class="screen"><div class="card">
    <h1 class="title">選擇關卡</h1>
    <p class="who">學號 <b class="en">${esc(sid)}</b>　<button class="icon-btn" style="color:var(--purple);background:#ece8fb" id="chg">換人</button></p>
    <div id="list"></div>
  </div></section>`;
  const list = app.querySelector("#list");
  for (const q of quizIndex.quizzes) {
    const best = store.get(bestKey(q.id, sid), null);
    const b = document.createElement("button");
    b.className = "quiz-item";
    b.innerHTML = `<span class="ico">🕰️</span><span><b>${esc(q.title)}</b><small class="en">${esc(q.subtitle)}</small><br><small>${q.count} 題・滿分 100</small></span>
      <span class="best">${best == null ? "—" : best}<small>最高分</small></span>`;
    b.onclick = () => { sfx.click(); loadQuiz(q.id); };
    list.appendChild(b);
  }
  app.querySelector("#chg").onclick = () => { sid = null; startScreen(); };
}

// ---------------------------------------------------------------- 戰鬥
let S = null;   // 這一場的狀態
async function loadQuiz(id) {
  const bank = await fetch(`quizzes/${id}/bank.json`).then(r => r.json());
  const base = `quizzes/${id}/`;
  const items = bank.items.map(it => ({ ...it, image: base + it.image, audio: base + it.audio }));
  items.forEach(it => { const i = new Image(); i.src = it.image; });   // 預先載入題目圖
  const n = items.length;
  const segs = MONSTERS.map((_, i) => [Math.floor((i * n) / MONSTERS.length), Math.floor(((i + 1) * n) / MONSTERS.length)]);
  const now = new Date();
  S = {
    bank, items, segs, idx: 0, correct: 0, answers: [],
    heroHp: HERO.maxHp, energy: 0, ultArmed: false, combo: 0, maxCombo: 0, ults: 0, kos: 0, defeated: 0,
    mon: null, busy: false, startedAt: now.toISOString(), t0: Date.now(),
    attemptId: `${sid}-${now.getTime().toString(36)}`, activeDays: [taipeiDay(now)],
  };
  battleScreen();
  // 本機測試用：?seg=2 直接從第 3 段（Boss）開始；正式網址不理會
  const seg = ["localhost", "127.0.0.1"].includes(location.hostname) ? Number(new URLSearchParams(location.search).get("seg")) || 0 : 0;
  if (seg) S.idx = segs[Math.min(seg, segs.length - 1)][0];
  await spawnMonster(Math.min(seg, segs.length - 1));
  showQuestion();
}

function battleScreen() {
  app.innerHTML = `
  <section class="battle">
    <header class="topbar">
      <span class="stage" id="stage"></span><span id="prog" class="en"></span><span class="spacer"></span>
      <button class="icon-btn" id="mute" aria-label="音效開關">${isMuted() ? "🔇" : "🔊"}</button>
      <button class="icon-btn" id="quit">離開</button>
    </header>
    <div class="arena" id="arena">
      <div class="hud left"><div class="name">${esc(HERO.name)} <span class="en" id="hhp"></span></div>
        <div class="bar" id="hbar"><i></i></div>
        <div class="bar mp" id="mbar" title="能量"><i></i></div></div>
      <div class="hud right"><div class="name"><span id="mname"></span> <span class="en" id="mhp"></span></div>
        <div class="bar" id="mobar"><i></i></div></div>
      <div class="combo" id="combo"></div>
      <div class="fighter hero"><div class="shadow"></div><div class="sprite" id="hero"></div></div>
      <div class="fighter mon" id="monBox"><div class="shadow"></div><div class="sprite" id="mon"></div></div>
    </div>
    <div class="qpanel" id="q"></div>
  </section>`;
  sprite($("hero"), HERO.sprite, HERO.rows.idle);
  $("mute").onclick = () => { setMuted(!isMuted()); try { localStorage.setItem("rpg-muted", isMuted() ? "1" : "0"); } catch { /* */ } $("mute").textContent = isMuted() ? "🔇" : "🔊"; };
  $("quit").onclick = () => { if (confirm("確定要離開？這一場的分數會以目前進度記錄。")) { stopAudio(); upload(false, true); menuScreen(); } };
  window.onkeydown = e => { if (e.key === "Enter" && !S?.busy) $("check")?.click(); };
  updateHud();
}
const $ = id => document.getElementById(id);

async function spawnMonster(i) {
  const m = MONSTERS[i];
  const [a, b] = S.segs[i];
  S.mon = { i, ...m, maxHp: (b - a) * BALANCE.hpPerQuestion, dmg: 0, last: b - 1 };
  const box = $("monBox");
  box.style.setProperty("--scale", m.scale);
  box.style.transform = `scale(${m.scale})`;
  box.style.transformOrigin = "bottom center";
  $("mon").style.filter = m.filter;
  sprite($("mon"), m.sprite, MONSTER_ROWS.idle);
  box.classList.remove("enter"); void box.offsetWidth; box.classList.add("enter");
  updateHud();
  await banner(`${m.boss ? "👑 Boss 出現！" : "怪物出現！"}<small>${esc(m.name)}</small>`, 1100);
}

function monHp() {
  const m = S.mon;
  const left = m.maxHp - m.dmg;
  return S.idx <= m.last && S.answers.length <= m.last ? Math.max(1, left) : Math.max(0, left);
}
function updateHud() {
  if (!$("hbar")) return;
  const hp = Math.max(0, S.heroHp);
  $("hhp").textContent = `${hp}/${HERO.maxHp}`;
  $("hbar").firstElementChild.style.width = `${(hp / HERO.maxHp) * 100}%`;
  $("hbar").classList.toggle("low", hp < HERO.maxHp * 0.3);
  $("mbar").firstElementChild.style.width = `${Math.min(100, S.energy)}%`;
  $("mbar").classList.toggle("full", S.energy >= 100);
  if (S.mon) {
    const mh = monHp();
    $("mname").textContent = S.mon.name;
    $("mhp").textContent = `${mh}/${S.mon.maxHp}`;
    $("mobar").firstElementChild.style.width = `${(mh / S.mon.maxHp) * 100}%`;
    $("mobar").classList.toggle("low", mh < S.mon.maxHp * 0.3);
  }
  const segNo = S.mon ? S.mon.i + 1 : 1;
  $("stage").textContent = `第 ${segNo} 關`;
  $("prog").textContent = `${Math.min(S.idx + 1, S.items.length)} / ${S.items.length}`;
  $("combo").textContent = S.combo >= 2 ? `${S.combo} COMBO!` : "";
}

let audio = null;
const stopAudio = () => { if (audio) { audio.pause(); audio = null; } };
// ---------------------------------------------------------------- 作答：拼字（字母方塊）與拖放（字卡進空格）
const slotCount = it => it.type === "spell" ? it.spell.answer.replaceAll(" ", "").length : it.blanks.length;
function buildTiles(it) {
  const texts = it.type === "spell"
    ? [...it.spell.answer.replaceAll(" ", ""), ...it.spell.distractorLetters]
    : [...it.blanks, ...it.distractors];
  return shuffle(texts).map((text, i) => ({ id: `t${i}`, text }));   // id 不透露答案位置
}
const tileText = id => S.cur.tiles.find(t => t.id === id)?.text ?? "";
const isComplete = () => S.cur.placed.every(Boolean);
const answerOf = it => S.cur.placed.map(tileText).join(it.type === "spell" ? "" : " / ");
const wantList = it => it.type === "spell" ? [...it.spell.answer.replaceAll(" ", "")] : it.blanks;

function showQuestion() {
  const it = S.items[S.idx];
  S.cur = { tiles: buildTiles(it), placed: Array(slotCount(it)).fill(null), locked: false };
  const ws = it.weekStrip;
  const week = ws ? `<ol class="week" aria-label="Week">${S.bank.weekOrder.map(d => {
    const on = d === ws.highlight, zh = on && ws.zhLabel;
    return `<li class="${on ? "on" : ""} ${zh ? "zh" : ""}">${esc(zh ? ws.zhLabel : S.bank.weekLabels[d])}</li>`;
  }).join("")}</ol>` : "";
  $("q").innerHTML = `
    <div class="qpic">${week}<img class="qimg ${it.mirror ? "mirror" : ""}" src="${esc(it.image)}" alt=""></div>
    <div class="qtext">
      <div class="qhead"><span class="qno">Q${S.idx + 1}</span><button class="read" id="read">🔊 讀題</button><span id="ultBox"></span></div>
      <p class="ctx">${esc(it.context)}</p>
      <div id="work"></div>
    </div>`;
  $("read").onclick = () => {
    stopAudio(); audio = new Audio(it.audio);
    $("read").classList.add("playing");
    audio.onended = audio.onerror = () => $("read")?.classList.remove("playing");
    audio.play().catch(() => $("read")?.classList.remove("playing"));
  };
  drawUlt();
  drawWork();
  updateHud();
}

function drawUlt() {
  const box = $("ultBox");
  if (!box) return;
  box.innerHTML = S.energy >= 100 ? `<button class="ult-btn ${S.ultArmed ? "armed" : ""}" id="ult">${S.ultArmed ? "⚡ 大招準備好了！答對就發動" : "⚡ 時光爆發"}</button>` : "";
  if ($("ult")) $("ult").onclick = () => { if (!S.ultArmed) { S.ultArmed = true; sfx.energy(); drawUlt(); } };
}

function slotHtml(i, mark) {
  const id = S.cur.placed[i];
  const cls = mark ? (mark[i] ? "ok" : "bad") : "";
  return `<button class="slot ${id ? "filled" : ""} ${cls}" data-slot="${i}" ${S.cur.locked ? "disabled" : ""}>${id ? esc(tileText(id)) : ""}</button>`;
}
function drawWork(mark = null) {
  const it = S.items[S.idx];
  const spell = it.type === "spell";
  let body;
  if (spell) {
    let k = 0;
    body = `<p class="prompt">${esc(it.prompt)}</p><div class="spell">${it.spell.groups.map(len =>
      `<span class="word">${Array.from({ length: len }, () => slotHtml(k++, mark)).join("")}</span>`).join("")}</div>`;
  } else {
    body = `<p class="lines">${it.lines.map(l => `<span class="sp">${esc(l.speaker)}:</span> ${esc(l.text).replace(/\{(\d)\}/g, (_, d) => slotHtml(Number(d) - 1, mark))}`).join("<br>")}</p>`;
  }
  const used = new Set(S.cur.placed.filter(Boolean));
  const pool = S.cur.tiles.map(t => used.has(t.id) ? `<span class="tile gone ${spell ? "letter" : ""}"></span>`
    : `<button class="tile ${spell ? "letter" : ""}" data-tile="${t.id}" ${S.cur.locked ? "disabled" : ""}>${esc(t.text)}</button>`).join("");
  $("work").innerHTML = `${body}
    <div class="pool">${pool}</div>
    <div class="acts"><button class="btn ghost small" id="clear" ${S.cur.locked ? "disabled" : ""}>清除</button>
      <button class="btn small" id="check" ${isComplete() && !S.cur.locked ? "" : "disabled"}>確認 ✓</button></div>`;
  $("clear").onclick = () => { sfx.click(); S.cur.placed.fill(null); drawWork(); };
  $("check").onclick = () => answer();
}

// 點字卡：放進第一個空格；點已填的格子：退回
function place(tileId, slot) {
  const old = S.cur.placed.indexOf(tileId);
  if (old >= 0) S.cur.placed[old] = null;
  S.cur.placed[slot] = tileId;
  sfx.click(); drawWork();
}
function tapTile(id) { const e = S.cur.placed.indexOf(null); if (e >= 0) place(id, e); }
function tapSlot(i) { if (S.cur.placed[i]) { S.cur.placed[i] = null; sfx.click(); drawWork(); } }

// 拖放（滑鼠＋觸控）；沒移動就當作點一下
let drag = null, suppressClick = false;
document.addEventListener("pointerdown", e => {
  const t = e.target.closest?.(".tile[data-tile], .slot.filled");
  if (!t || t.disabled || !S?.cur || S.cur.locked || S.busy) return;
  const from = t.dataset.slot != null ? Number(t.dataset.slot) : null;
  drag = { id: t.dataset.tile || S.cur.placed[from], from, x: e.clientX, y: e.clientY, ghost: null, src: t };
});
window.addEventListener("pointermove", e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
    drag.ghost = document.createElement("div");
    drag.ghost.className = `tile drag-ghost ${S.items[S.idx].type === "spell" ? "letter" : ""}`;
    drag.ghost.textContent = tileText(drag.id);
    document.body.append(drag.ghost);
  }
  if (drag.ghost) { drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`; e.preventDefault(); }
}, { passive: false });
window.addEventListener("pointerup", e => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.ghost) return;
  d.ghost.remove(); suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 50);
  const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-slot]");
  if (slot && !slot.disabled) place(d.id, Number(slot.dataset.slot));
  else if (d.from != null) { S.cur.placed[d.from] = null; drawWork(); }   // 從格子拖出去＝退回
});
window.addEventListener("pointercancel", () => { drag?.ghost?.remove(); drag = null; });
document.addEventListener("click", e => {
  if (suppressClick) { suppressClick = false; e.stopPropagation(); return; }
  if (!S?.cur || S.cur.locked || S.busy) return;
  const t = e.target.closest?.("[data-tile]");
  if (t && !t.disabled) return tapTile(t.dataset.tile);
  const sl = e.target.closest?.("[data-slot]");
  if (sl && !sl.disabled) return tapSlot(Number(sl.dataset.slot));
}, true);

async function answer() {
  if (S.busy || !isComplete()) return;
  S.busy = true; stopAudio(); unlock();
  const it = S.items[S.idx];
  const want = wantList(it);
  const mark = S.cur.placed.map((id, i) => tileText(id) === want[i]);
  const ok = mark.every(Boolean);
  S.cur.locked = true;
  drawWork(mark);
  S.answers.push({ id: it.id, chosen: answerOf(it), ok });
  if (ok) { S.correct++; await heroAttack(); }
  else { await monsterAttack(); await secretScroll(it); }
  upload(false);

  // 這一段的最後一題：怪物倒下或逃走
  if (S.idx === S.mon.last) await endSegment();
  S.idx++;
  if (S.idx >= S.items.length) { S.busy = false; return finish(); }
  if (S.idx > S.mon.last) await spawnMonster(S.mon.i + 1);
  S.busy = false;
  showQuestion();
}

async function heroAttack() {
  S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
  const ult = S.ultArmed;
  let dmg = BALANCE.baseDamage + Math.min(BALANCE.comboCap, (S.combo - 1) * BALANCE.comboBonus);
  if (ult) { dmg = Math.round(dmg * BALANCE.ultMultiplier); S.ultArmed = false; S.energy = 0; S.ults++; }
  sfx.correct();
  sprite($("hero"), HERO.sprite, HERO.rows.attack, { loop: false, dur: 0.5 });
  await sleep(260);
  if (ult) { sfx.ult(); fx("flash ult"); await sleep(250); }
  else fx("bolt");
  await sleep(200);
  sfx.hit();
  S.mon.dmg += dmg;
  sprite($("mon"), S.mon.sprite, MONSTER_ROWS.hurt, { loop: false, dur: 0.45 });
  shake(); popNumber(`-${dmg}`, "mon", ult);
  if (!ult) S.energy = Math.min(100, S.energy + BALANCE.energyPerCorrect);
  if (S.energy >= 100 && !ult) sfx.energy();
  updateHud();
  await sleep(520);
  sprite($("hero"), HERO.sprite, HERO.rows.idle);
  sprite($("mon"), S.mon.sprite, MONSTER_ROWS.idle);
}

async function monsterAttack() {
  S.combo = 0;
  sfx.wrong();
  sprite($("mon"), S.mon.sprite, MONSTER_ROWS.attack, { loop: false, dur: 0.5 });
  await sleep(260);
  fx("bolt enemy");
  await sleep(200);
  sfx.hurt();
  S.heroHp -= S.mon.atk;
  sprite($("hero"), HERO.sprite, HERO.rows.hurt, { loop: false, dur: 0.45 });
  shake(); popNumber(`-${S.mon.atk}`, "hero");
  updateHud();
  await sleep(560);
  sprite($("mon"), S.mon.sprite, MONSTER_ROWS.idle);
  if (S.heroHp <= 0) {
    S.kos++;
    await banner("Ken 倒下了…<small>沒關係！喝下時光藥水，再站起來！</small>", 1600);
    S.heroHp = HERO.maxHp;
    popNumber(`+${HERO.maxHp}`, "hero", false, "heal");
    updateHud();
  }
  sprite($("hero"), HERO.sprite, HERO.rows.idle);
}

async function endSegment() {
  const m = S.mon;
  updateHud();
  if (m.dmg >= m.maxHp) {
    S.defeated++;
    sfx.defeat();
    sprite($("mon"), m.sprite, MONSTER_ROWS.defeat, { loop: false, dur: 0.9 });
    sprite($("hero"), HERO.sprite, HERO.rows.win);
    await sleep(900);
    $("monBox").style.opacity = "0";
    await banner(`⭐ 打倒 ${esc(m.name)}！`, 1200);
  } else {
    await banner(`${esc(m.name)} 逃走了…<small>答對更多題、接連答對，攻擊會更強！</small>`, 1600);
    $("monBox").style.opacity = "0";
  }
  $("monBox").style.opacity = "";
  sprite($("hero"), HERO.sprite, HERO.rows.idle);
}

// 答錯：名師解題秘笈
function secretScroll(it) {
  const right = it.answerText;
  overlay.innerHTML = `<div class="scroll" role="dialog" aria-modal="true">
    <h3>📜 解題秘笈</h3>
    <p class="ans">正確答案：${esc(right)}</p>
    <p>${esc(it.explanation)}</p>
    ${it.correctEn ? `<p class="en-line">${esc(it.correctEn)}</p>` : ""}
    <button class="btn wide" id="go">我懂了，繼續 ▶</button></div>`;
  overlay.hidden = false;
  return new Promise(res => {
    const go = overlay.querySelector("#go");
    go.focus();
    go.onclick = () => { sfx.click(); overlay.hidden = true; overlay.innerHTML = ""; res(); };
  });
}

// ---------------------------------------------------------------- 特效
function fx(cls) {
  const d = document.createElement("div");
  d.className = cls;
  $("arena").appendChild(d);
  setTimeout(() => d.remove(), 1000);
}
function shake() { const a = $("arena"); a.classList.remove("shake"); void a.offsetWidth; a.classList.add("shake"); }
function popNumber(text, who, big = false, extra = "") {
  const d = document.createElement("div");
  d.className = `pop ${big ? "big" : ""} ${extra}`;
  d.textContent = text;
  d.style[who === "mon" ? "right" : "left"] = "18%";
  d.style.top = "30%";
  $("arena").appendChild(d);
  setTimeout(() => d.remove(), 1100);
}
async function banner(html, ms) {
  const d = document.createElement("div");
  d.className = "banner"; d.innerHTML = html;
  $("arena")?.appendChild(d);
  await sleep(ms);
  d.remove();
}

// ---------------------------------------------------------------- 紀錄與結果
const scoreOf = () => Math.round((S.correct / S.items.length) * 100);
function upload(finished, immediate = false) {
  const now = new Date();
  const day = taipeiDay(now);
  if (!S.activeDays.includes(day)) S.activeDays.push(day);
  uploadAttempt({
    quiz: S.bank.id, studentId: sid, attemptId: S.attemptId, version: 1,
    startedAt: S.startedAt, updatedAt: now.toISOString(), ...(finished ? { finishedAt: now.toISOString() } : {}),
    finished, score: scoreOf(), correct: S.correct, answered: S.answers.length, total: S.items.length,
    answers: S.answers,
    game: { defeated: S.defeated, monsters: MONSTERS.length, maxCombo: S.maxCombo, ults: S.ults, kos: S.kos,
            durationSec: Math.round((Date.now() - S.t0) / 1000) },
    activeDays: S.activeDays,
  }, { immediate: immediate || finished });
}

function finish() {
  window.onkeydown = null;
  const score = scoreOf();
  upload(true);
  const key = bestKey(S.bank.id, sid);
  const prev = store.get(key, null);
  const best = Math.max(prev ?? 0, score);
  store.set(key, best);
  if (S.defeated === MONSTERS.length) sfx.victory(); else sfx.defeat();
  const wrong = S.items.filter((it, i) => !S.answers[i]?.ok);
  const mins = Math.floor((Date.now() - S.t0) / 60000), secs = Math.round(((Date.now() - S.t0) % 60000) / 1000);
  app.innerHTML = `
  <section class="screen"><div class="card">
    <div class="hero-pic"><div class="sprite" id="pic"></div></div>
    <h1 class="title">${S.defeated === MONSTERS.length ? "時鐘塔得救了！" : "冒險完成！"}</h1>
    <p class="score">${score}<small> / 100</small></p>
    <div class="stars" aria-label="打倒 ${S.defeated} 隻怪物">${"⭐".repeat(S.defeated)}${"☆".repeat(MONSTERS.length - S.defeated)}</div>
    <p class="who">學號 <b class="en">${esc(sid)}</b>・最高分 <b class="en">${best}</b>${prev != null && score > prev ? "　🎉 新紀錄！" : ""}</p>
    <div class="stats">
      <div class="stat"><b>${S.correct}/${S.items.length}</b><small>答對</small></div>
      <div class="stat"><b>${S.maxCombo}</b><small>最高連擊</small></div>
      <div class="stat"><b>${S.ults}</b><small>大招次數</small></div>
      <div class="stat"><b>${mins}:${String(secs).padStart(2, "0")}</b><small>用時</small></div>
    </div>
    <p class="sync" id="sync"></p>
    ${wrong.length ? `<details class="review"><summary><b>看錯題（${wrong.length} 題）</b></summary>
      ${wrong.map(it => `<div class="it"><b>${esc(it.id)}</b>　正解：<b>${esc(it.answerText)}</b><br>${esc(it.explanation)}</div>`).join("")}</details>` : ""}
    <div class="row-btns">
      <button class="btn" id="again">再玩一次</button>
      <button class="btn ghost" id="menu">回選單</button>
    </div>
  </div></section>`;
  sprite(app.querySelector("#pic"), HERO.sprite, HERO.rows.win);
  const syncText = s => ({ syncing: "☁️ 上傳成績中…", synced: "✅ 成績已上傳給老師", offline: "⚠️ 網路不穩，成績還沒上傳（請先別關網頁）", off: "（測試模式：不上傳）" })[s] || "";
  const sync = app.querySelector("#sync");
  sync.textContent = syncText(cloudStatus());
  const off = onCloudStatus(s => { if (document.body.contains(sync)) sync.textContent = syncText(s); else off(); });
  if (cloudStatus() === "offline") retryUpload();
  app.querySelector("#again").onclick = () => { sfx.click(); loadQuiz(S.bank.id); };
  app.querySelector("#menu").onclick = () => { sfx.click(); menuScreen(); };
}

startScreen();
