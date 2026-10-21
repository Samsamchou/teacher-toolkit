// Teacher dashboard. The 6-digit passcode is the password of one Firebase Email/Password account;
// it is never stored in this code. Firestore rules let only that account read questAttempts.
// Flow: login → list of days that have answers (Taiwan time) → click a day → that day's class list
// → click a student → result-page summary + the questions that needed retries.
import { FIREBASE_CONFIG, SDK, COLLECTION, useEmulators, RETENTION_DAYS } from "../shared/quest-cloud.mjs";
import { MISSIONS } from "../shared/missions.mjs";

const TEACHER_EMAIL = "quest-teacher@hwg5-clock-tower.web.app";
const [{ initializeApp }, A, F] = await Promise.all([
  import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)]);
const app = initializeApp(FIREBASE_CONFIG, "quest-teacher");
const auth = A.getAuth(app);
const db = F.getFirestore(app);
useEmulators(auth, A, db, F);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const banks = {};           // mission slug -> BANK (question text, reward icons, battles)
let all = [];               // every attempt the teacher can read
let day = null;             // selected YYYY-MM-DD
let mission = null;         // selected mission slug within the day
let selected = null;        // selected attemptId

// ---------------------------------------------------------------- login
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const code = $("code").value.trim();
  if (!/^\d{6}$/u.test(code)) { $("loginMsg").textContent = "請輸入 6 位數字。"; return; }
  $("loginMsg").textContent = "登入中…";
  try {
    await A.signInWithEmailAndPassword(auth, TEACHER_EMAIL, code);
  } catch (err) {
    const c = err?.code || "";
    $("loginMsg").textContent = c.includes("too-many-requests") ? "嘗試太多次，請稍後再試。"
      : c.includes("network") ? "網路連線失敗，請稍後再試。" : "通行碼不正確。";
  } finally { $("code").value = ""; }
});
$("logout").addEventListener("click", () => A.signOut(auth));
A.onAuthStateChanged(auth, user => {
  const ok = Boolean(user && !user.isAnonymous && user.email === TEACHER_EMAIL);
  $("login").hidden = ok; $("logout").hidden = !ok;
  if (ok) { $("loginMsg").textContent = ""; showDates(); load(); }
  else { $("dates").hidden = true; $("day").hidden = true; }
});

// ---------------------------------------------------------------- data
const taipei = iso => iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date(iso)) : "";
// days an attempt was worked on; older records without activeDays fall back to their start/update days
const daysOf = r => r.activeDays?.length ? r.activeDays : [...new Set([taipei(r.startedAt), taipei(r.updatedAt)].filter(Boolean))];
const missionInfo = slug => MISSIONS.find(m => m.slug === slug) || { slug, unit: slug, title: "" };

async function load() {
  $("datesMsg").textContent = "讀取中…";
  try {
    const snap = await F.getDocs(F.collection(db, COLLECTION));
    all = snap.docs.map(d => d.data());
    await Promise.all([...new Set(all.map(r => r.mission))].map(async slug => {
      if (!banks[slug]) banks[slug] = (await import(`../${slug}/data.js`)).BANK;
    }));
    renderDates();
    if (day && !$("day").hidden) renderDay();
  } catch (err) {
    $("datesMsg").textContent = "讀取失敗：" + (err?.code || err?.message || err);
  }
}
$("refresh").addEventListener("click", load);

// ---------------------------------------------------------------- step 1: dates
function showDates() { $("dates").hidden = false; $("day").hidden = true; }
const weekday = d => "日一二三四五六"[new Date(d + "T12:00:00+08:00").getUTCDay()];
function renderDates() {
  const byDay = new Map();
  for (const r of all) for (const d of daysOf(r)) {
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }
  const days = [...byDay.keys()].sort().reverse();
  $("datesMsg").textContent = days.length ? `共 ${days.length} 天有作答紀錄` : "還沒有作答紀錄。";
  $("dateList").innerHTML = days.map(d => {
    const list = byDay.get(d);
    const perMission = MISSIONS.concat([...new Set(list.map(r => r.mission))].filter(s => !MISSIONS.some(m => m.slug === s)).map(missionInfo))
      .map(m => {
        const rs = list.filter(r => r.mission === m.slug);
        if (!rs.length) return "";
        const students = new Set(rs.map(r => r.studentId)).size;
        const done = rs.filter(r => r.completedAt && taipei(r.completedAt) === d).length;
        return `<span class="mtag">${esc(m.unit)}：${students} 人${done ? `（當天完成 ${done}）` : ""}</span>`;
      }).join("");
    return `<li><button class="date-card" data-day="${d}"><b>${d.replaceAll("-", "/")}（${weekday(d)}）</b>${perMission}</button></li>`;
  }).join("");
}
$("dateList").addEventListener("click", e => {
  const b = e.target.closest("[data-day]"); if (!b) return;
  day = b.dataset.day; mission = null; selected = null;
  $("dates").hidden = true; $("day").hidden = false;
  renderDay();
});
$("backToDates").addEventListener("click", () => { selected = null; showDates(); renderDates(); });

// ---------------------------------------------------------------- step 2: one day's class list
const dayRows = () => all.filter(r => daysOf(r).includes(day));
const bank = () => banks[mission];
const total = () => bank().items.length;
const retries = r => (r.items || []).filter(i => !i.firstTryCorrect && i.attempts > 0);
const firstTry = r => r.summary?.firstTry ?? (r.items || []).filter(i => i.firstTryCorrect).length;
const finished = r => r.summary?.finished ?? (r.items || []).filter(i => i.finalCorrect).length;
const battles = r => Object.keys(r.battles || {}).length;
// 總分（滿分 100）：只有會計分的任務（二水 3D 英語闖關）有 summary.score，其他任務顯示「—」
const score = r => (typeof r.summary?.score === "number" ? r.summary.score : null);
const itemPoints = (r, it) => {
  const x = (r.items || []).find(i => i.seq === it.seq);
  return x?.finalCorrect ? Math.round(100 / total() * Math.min(4, Math.max(1, x.quality || 1)) / 4 * 10) / 10 : 0;
};
const when = iso => iso ? new Date(iso).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const lastBattle = () => bank().battles.at(-1)?.id;
const bossText = r => {
  const b = r.battles?.[lastBattle()];
  if (!b) return "—";
  if (b.status === "skipped") return "略過";
  return b.bossDefeated ? "打倒" : "未打倒";
};

function renderDay() {
  const rows = dayRows();
  const slugs = [...new Set(rows.map(r => r.mission))];
  if (!mission || !slugs.includes(mission)) mission = slugs[0];
  $("dayTitle").textContent = `${day.replaceAll("-", "/")}（${weekday(day)}）`;
  $("missionTabs").innerHTML = slugs.map(s => `<button role="tab" class="tab ${s === mission ? "on" : ""}" data-slug="${s}">${esc(missionInfo(s).unit)}</button>`).join("");
  renderTable();
  showDetail(rows.find(r => r.attemptId === selected));
}
$("missionTabs").addEventListener("click", e => {
  const b = e.target.closest("[data-slug]"); if (!b) return;
  mission = b.dataset.slug; selected = null; renderDay();
});
$("search").addEventListener("input", renderTable);
$("sort").addEventListener("change", renderTable);

function currentList() {
  const q = $("search").value.trim();
  const list = dayRows().filter(r => r.mission === mission && (!q || r.studentId.includes(q)));
  const by = $("sort").value;
  return list.sort((a, b) =>
    by === "firstTry" ? firstTry(a) / total() - firstTry(b) / total() :
    by === "retries" ? retries(b).length - retries(a).length :
    by === "updated" ? String(b.updatedAt).localeCompare(String(a.updatedAt)) :
    by === "score" ? (score(b) ?? -1) - (score(a) ?? -1) :
    a.studentId.localeCompare(b.studentId) || String(a.startedAt).localeCompare(String(b.startedAt)));
}
function renderTable() {
  if (!mission) { $("table").tBodies[0].innerHTML = ""; return; }
  const list = currentList();
  $("dayMsg").textContent = `${missionInfo(mission).unit}｜這一天有 ${new Set(list.map(r => r.studentId)).size} 位學生、${list.length} 筆作答紀錄`;
  $("table").tBodies[0].innerHTML = list.map(r => `
    <tr data-id="${esc(r.attemptId)}" class="${r.attemptId === selected ? "sel" : ""}">
      <td class="sid">${esc(r.studentId)}</td>
      <td>${r.completedAt ? '<span class="pill done">完成</span>' : '<span class="pill">進行中</span>'}</td>
      <td class="n">${score(r) ?? "—"}</td>
      <td>${finished(r)}/${total()}</td>
      <td>${firstTry(r)}/${total()}（${Math.round(firstTry(r) / total() * 100)}%）</td>
      <td>${retries(r).length}</td>
      <td>${battles(r)}/${bank().battles.length}</td>
      <td>${bossText(r)}</td>
      <td>${when(r.updatedAt)}</td>
    </tr>`).join("") || `<tr><td colspan="9" class="hint">這一天沒有符合的紀錄。</td></tr>`;
}
$("table").addEventListener("click", e => {
  const tr = e.target.closest("tr[data-id]"); if (!tr) return;
  selected = tr.dataset.id; renderTable(); showDetail(all.find(r => r.attemptId === selected));
});

// ---------------------------------------------------------------- detail = result page + retried questions
function questionText(seq) {
  const it = bank().items.find(i => i.seq === seq);
  if (!it) return "";
  if (it.type === "spell") return `拼字：${it.spell.answer}`;
  if (it.type === "listen") return `聽力：${it.transcript ? it.transcript + " → " : ""}${it.answerText}`;
  return it.lines.map(l => `${l.speaker}: ${l.text.replace(/\{(\d)\}/g, (_, d) => `〔${it.blanks[Number(d) - 1].answer}〕`)}`).join("　");
}
function showDetail(r) {
  if (!r) { $("detail").innerHTML = '<p class="hint">點選左邊的學生，查看結果頁與需要重試的題目。</p>'; return; }
  const re = retries(r).sort((a, b) => b.attempts - a.attempts || a.seq - b.seq);
  const icon = name => bank().rewardIcons?.[name] ? `<img src="../${r.mission}/${bank().rewardIcons[name]}" alt="${esc(name)}" title="${esc(name)}">` : "";
  $("detail").innerHTML = `
    <div class="result">
      <p class="state">${r.completedAt ? "Mission Complete!" : `進行中（第 ${r.stepIndex ?? 0} / ${r.stepCount ?? "?"} 步）`}</p>
      <p class="big-id">${esc(r.studentId)}</p>
      <p class="boss">Boss：${bossText(r)}</p>
      <div class="stats">
        ${score(r) !== null ? `<div><b>${score(r)}</b><span>總分（滿分 100）</span></div>` : ""}
        <div><b>${finished(r)}/${total()}</b><span>完成題數</span></div>
        <div><b>${firstTry(r)}/${total()}</b><span>第一次就答對</span></div>
        <div><b>${battles(r)}/${bank().battles.length}</b><span>戰鬥</span></div>
      </div>
      <div class="items">${(r.inventory || []).map(icon).join("")}</div>
      <p class="meta">作答日期 ${daysOf(r).join("、")}｜最後更新 ${when(r.updatedAt)}${r.completedAt ? `｜完成 ${when(r.completedAt)}` : ""}</p>
    </div>
    <h3>需要重試的題目（${re.length} 題）</h3>
    ${re.length ? `<table class="retry"><thead><tr><th>題</th><th>題目與答案</th><th>作答次數</th><th>提示</th><th>最後</th></tr></thead><tbody>
      ${re.map(i => `<tr><td>Q${String(i.seq).padStart(2, "0")}<br><small>${esc(i.id)}</small></td><td>${esc(questionText(i.seq))}</td>
        <td class="n">${i.attempts}</td><td>${i.hintUsed ? "有" : "—"}</td><td>${i.finalCorrect ? "答對" : "未完成"}</td></tr>`).join("")}
      </tbody></table>` : '<p class="hint">作答過的題目都是第一次就答對。</p>'}
    <p class="note">第一次就答對的題目不列出。</p>`;
}

// ---------------------------------------------------------------- CSV of the selected day + mission (UTF-8 BOM for Excel)
$("csv").addEventListener("click", () => {
  if (!mission) return;
  const scored = currentList().some(r => score(r) !== null);
  const perItem = scored ? bank().items.map(it => `${String(it.seq).padStart(2, "0")} ${it.id}`) : [];
  const head = ["日期", "任務", "學號", "開始", "完成", ...(scored ? ["總分"] : []), "完成題數", "第一次答對", "總題數", "需重試題數", "戰鬥", "Boss", "需重試的題目（作答次數）", ...perItem];
  const list = currentList().sort((a, b) => a.studentId.localeCompare(b.studentId));
  const lines = [head, ...list.map(r => [day, missionInfo(mission).unit, r.studentId, r.startedAt || "", r.completedAt || "",
    ...(scored ? [score(r) ?? ""] : []),
    finished(r), firstTry(r), total(), retries(r).length, battles(r), bossText(r),
    retries(r).map(i => `Q${String(i.seq).padStart(2, "0")}(${i.attempts}次)`).join("; "),
    ...(scored ? bank().items.map(it => itemPoints(r, it)) : [])])];
  const csv = "﻿" + lines.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `${mission}-${day}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
});

console.info(`records are kept ${RETENTION_DAYS} days after the last activity`);
