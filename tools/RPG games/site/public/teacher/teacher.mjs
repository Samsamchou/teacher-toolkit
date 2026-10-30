// 老師後台：用闖關任務的同一個老師帳號（Email/Password，6 位數通行碼）登入。
// Firestore 規則只讓這個帳號讀 rpgAttempts。通行碼不存在程式碼裡。
import { FIREBASE_CONFIG, SDK, COLLECTION, useEmulators } from "../js/cloud.mjs";

const TEACHER_EMAIL = "quest-teacher@hwg5-clock-tower.web.app";
const [{ initializeApp }, A, F] = await Promise.all([
  import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)]);
const app = initializeApp(FIREBASE_CONFIG, "rpg-teacher");
const auth = A.getAuth(app), db = F.getFirestore(app);
useEmulators(auth, A, db, F);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = iso => iso ? new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) : "";
const cls = sid => sid.slice(0, 3);   // 年級＋班級
let all = [], quizzes = {}, banks = {};

$("login").onsubmit = async e => {
  e.preventDefault();
  const code = $("code").value.trim();
  if (!/^\d{6}$/u.test(code)) { $("loginMsg").textContent = "請輸入 6 位數字。"; return; }
  $("loginMsg").textContent = "登入中…";
  try { await A.signInWithEmailAndPassword(auth, TEACHER_EMAIL, code); }
  catch (err) {
    const c = err?.code || "";
    $("loginMsg").textContent = c.includes("too-many") ? "嘗試太多次，請稍後再試。" : c.includes("network") ? "網路連線失敗。" : "通行碼不正確。";
  } finally { $("code").value = ""; }
};
$("logout").onclick = () => A.signOut(auth);
A.onAuthStateChanged(auth, user => {
  const ok = Boolean(user && !user.isAnonymous && user.email === TEACHER_EMAIL);
  $("login").hidden = ok; $("dash").hidden = !ok; $("logout").hidden = !ok;
  if (ok) { $("loginMsg").textContent = ""; load(); }
});

async function load() {
  $("msg").textContent = "讀取中…";
  try {
    const [snap, idx] = await Promise.all([F.getDocs(F.collection(db, COLLECTION)), fetch("../quizzes/index.json").then(r => r.json())]);
    all = snap.docs.map(d => d.data()).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    quizzes = Object.fromEntries(idx.quizzes.map(q => [q.id, q]));
    const ids = [...new Set([...idx.quizzes.map(q => q.id), ...all.map(r => r.quiz)])];
    const cur = $("quiz").value;
    $("quiz").innerHTML = ids.map(id => `<option value="${esc(id)}">${esc(quizzes[id]?.title || id)}</option>`).join("");
    if (ids.includes(cur)) $("quiz").value = cur;
    $("msg").textContent = `共 ${all.length} 筆紀錄`;
    await render();
  } catch (err) { $("msg").textContent = "讀取失敗：" + (err?.code || err?.message || err); }
}
$("reload").onclick = load;
$("quiz").onchange = () => render(true);
$("cls").onchange = () => render();

async function bankOf(id) {
  if (!banks[id]) banks[id] = await fetch(`../quizzes/${id}/bank.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  return banks[id];
}
const rowsOf = () => all.filter(r => r.quiz === $("quiz").value && (!$("cls").value || cls(r.studentId) === $("cls").value));

function bestByStudent(rows) {
  const m = new Map();
  for (const r of rows) {
    const s = m.get(r.studentId) || { sid: r.studentId, attempts: [], best: null, finished: 0 };
    s.attempts.push(r);
    if (r.finished) s.finished++;
    if (r.finished && (!s.best || r.score > s.best.score)) s.best = r;
    m.set(r.studentId, s);
  }
  return [...m.values()].sort((a, b) => a.sid.localeCompare(b.sid));
}

async function render(resetCls = false) {
  const quizRows = all.filter(r => r.quiz === $("quiz").value);
  const classes = [...new Set(quizRows.map(r => cls(r.studentId)))].sort();
  const curCls = resetCls ? "" : $("cls").value;
  $("cls").innerHTML = `<option value="">全部</option>` + classes.map(c => `<option value="${c}">${c[0]} 年 ${c.slice(1)} 班</option>`).join("");
  $("cls").value = classes.includes(curCls) ? curCls : "";
  const rows = rowsOf();
  const studs = bestByStudent(rows);
  $("students").innerHTML = `<tr><th>學號</th><th class="num">最高分</th><th class="num">完成次數</th><th class="num">最近分數</th><th>最近作答</th><th class="num">打倒怪物</th><th class="num">最高連擊</th></tr>` +
    (studs.map(s => {
      const last = s.attempts[0];
      const b = s.best;
      const sc = v => v == null ? "—" : `<span class="score ${v < 60 ? "low" : v >= 90 ? "high" : ""}">${v}</span>`;
      return `<tr class="click" data-sid="${esc(s.sid)}"><td class="en">${esc(s.sid)}</td><td class="num">${sc(b?.score)}</td><td class="num">${s.finished}</td>
        <td class="num">${sc(last.score)}${last.finished ? "" : `<small class="muted">（未完 ${last.answered}/${last.total}）</small>`}</td><td>${fmt(last.updatedAt)}</td>
        <td class="num">${b ? `${b.game?.defeated ?? 0}/${b.game?.monsters ?? 3}` : "—"}</td><td class="num">${b?.game?.maxCombo ?? "—"}</td></tr>`;
    }).join("") || `<tr><td colspan="7" class="muted">還沒有紀錄</td></tr>`);
  $("students").querySelectorAll("tr.click").forEach(tr => tr.onclick = () => showStudent(tr.dataset.sid));

  // 每題答錯率：每位學生每題取最近一次作答
  const bank = await bankOf($("quiz").value);
  const latest = new Map();   // `${sid}|${qid}` -> ok
  for (const r of [...rows].reverse()) for (const a of r.answers || []) latest.set(`${r.studentId}|${a.id}`, a);
  const stat = new Map();
  for (const [k, a] of latest) {
    const q = k.split("|")[1];
    const s = stat.get(q) || { n: 0, wrong: 0, picks: {} };
    s.n++; if (!a.ok) { s.wrong++; s.picks[a.chosen] = (s.picks[a.chosen] || 0) + 1; }
    stat.set(q, s);
  }
  const items = (bank?.items || []).map(it => ({ it, s: stat.get(it.id) || { n: 0, wrong: 0, picks: {} } }));
  items.sort((a, b) => (b.s.n ? b.s.wrong / b.s.n : -1) - (a.s.n ? a.s.wrong / a.s.n : -1));
  $("items").innerHTML = `<tr><th>題</th><th>正解</th><th class="num">答錯率</th><th>最常選錯</th></tr>` + items.map(({ it, s }) => {
    const rate = s.n ? Math.round((s.wrong / s.n) * 100) : null;
    const top = Object.entries(s.picks).sort((a, b) => b[1] - a[1])[0];
    return `<tr><td class="en">${esc(it.id)}</td><td class="en">${esc(it.answerText)}</td>
      <td class="num">${rate == null ? "—" : `<span class="bar" style="width:${rate * 0.6}px"></span> ${rate}%`} <small class="muted">(${s.wrong}/${s.n})</small></td>
      <td class="en">${top ? `${esc(top[0])} ×${top[1]}` : ""}</td></tr>`;
  }).join("");
  $("detail").hidden = true;
}

function showStudent(sid) {
  const list = rowsOf().filter(r => r.studentId === sid);
  $("detail").hidden = false;
  $("detail").innerHTML = `<h3>學號 <span class="en">${esc(sid)}</span> 的每次紀錄</h3><div class="scroll"><table>
    <tr><th>開始</th><th class="num">分數</th><th class="num">答對</th><th>狀態</th><th class="num">打倒怪物</th><th class="num">連擊</th><th class="num">大招</th><th class="num">倒下</th><th class="num">用時</th><th>各題（綠＝對）</th></tr>
    ${list.map(r => `<tr><td>${fmt(r.startedAt)}</td><td class="num score">${r.score}</td><td class="num">${r.correct}/${r.total}</td>
      <td>${r.finished ? "完成" : `未完成（${r.answered} 題）`}</td><td class="num">${r.game?.defeated ?? 0}</td><td class="num">${r.game?.maxCombo ?? 0}</td>
      <td class="num">${r.game?.ults ?? 0}</td><td class="num">${r.game?.kos ?? 0}</td><td class="num">${Math.round((r.game?.durationSec || 0) / 60)} 分</td>
      <td style="white-space:normal">${(r.answers || []).map(a => `<span class="ans ${a.ok ? "y" : "n"}" title="${esc(a.chosen)}">${esc(a.id.replace("Q", ""))}</span>`).join("")}</td></tr>`).join("")}
  </table></div>`;
  $("detail").scrollIntoView({ behavior: "smooth" });
}

// ---------------------------------------------------------------- CSV
function download(name, rows) {
  const csv = "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
$("csvBest").onclick = () => {
  const studs = bestByStudent(rowsOf());
  download(`${$("quiz").value}-成績-${stamp()}.csv`, [["學號", "年級", "班級", "座號", "最高分", "完成次數", "最高分答對", "總題數", "打倒怪物", "最高連擊", "最近作答"],
    ...studs.map(s => [s.sid, s.sid[0], s.sid.slice(1, 3), s.sid.slice(3), s.best?.score ?? "", s.finished, s.best?.correct ?? "", s.best?.total ?? "",
      s.best?.game?.defeated ?? "", s.best?.game?.maxCombo ?? "", fmt(s.attempts[0].updatedAt)])]);
};
$("csvAll").onclick = async () => {
  const bank = await bankOf($("quiz").value);
  const qids = (bank?.items || []).map(i => i.id);
  download(`${$("quiz").value}-每次紀錄-${stamp()}.csv`, [["學號", "開始時間", "完成", "分數", "答對", "已答", "總題數", "打倒怪物", "最高連擊", "大招", "倒下", "用時(秒)", ...qids],
    ...rowsOf().map(r => {
      const m = Object.fromEntries((r.answers || []).map(a => [a.id, a.ok ? "O" : `X:${a.chosen}`]));
      return [r.studentId, fmt(r.startedAt), r.finished ? "是" : "否", r.score, r.correct, r.answered, r.total, r.game?.defeated, r.game?.maxCombo, r.game?.ults, r.game?.kos, r.game?.durationSec, ...qids.map(q => m[q] ?? "")];
    })]);
};
