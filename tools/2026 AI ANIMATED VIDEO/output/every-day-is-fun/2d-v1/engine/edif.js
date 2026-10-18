// edif.js — Every Day Is Fun 專用道具：星期卡、學科卡、✓／✗、課表、鐘、籃球、教室與公園背景元件。
// Song-specific props. Names start with "ed" to avoid clashes with scenes.

const ED_DAYS = { MON: ['MON', 'Monday', '#ff8c78'], TUE: ['TUE', 'Tuesday', '#f59a3c'], WED: ['WED', 'Wednesday', '#ffd84d'], THU: ['THU', 'Thursday', '#7cc96a'],
  FRI: ['FRI', 'Friday', '#4fb3d9'], SAT: ['SAT', 'Saturday', '#8b7fd8'], SUN: ['SUN', 'Sunday', '#f07c8c'] };
const ED_DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
// 星期卡（日曆頁）：k = 彈出比例；lit = 0–1 發光 / calendar day card
function edDayCard(c, day, x, y, k = 1, lit = 0, s = 1) {
  if (k <= 0) return; const [ab, full, col] = ED_DAYS[day];
  c.save(); c.translate(x, y); c.scale(k * s, k * s);
  if (lit > 0) { c.save(); c.globalAlpha = lit * .55; c.fillStyle = '#fff3a6'; c.beginPath(); c.arc(0, 0, 120, 0, 7); c.fill(); c.restore(); }
  rr(c, -78, -86, 156, 172, 18); fillStroke(c, '#fffdf6', 6);
  c.save(); rr(c, -78, -86, 156, 54, [18, 18, 0, 0]); c.fillStyle = col; c.fill(); c.restore();
  rr(c, -78, -86, 156, 172, 18); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  for (const rx of [-42, 42]) { c.beginPath(); c.arc(rx, -86, 9, 0, 7); fillStroke(c, '#c9ced6', 4); }   // 日曆環 / rings
  c.font = '900 38px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(ab, 0, -44);
  c.fillStyle = INK; c.font = '800 25px "Inter","Segoe UI",sans-serif'; c.fillText(full, 0, 28);
  c.restore();
}
// 學科卡 / subject card：key = Chinese|English|math|art|music|PE|computer
const ED_SUBJ = { Chinese: '#ff8c78', English: '#4fb3d9', math: '#ffd84d', art: '#f07c8c', music: '#8b7fd8', PE: '#f59a3c', computer: '#7cc96a' };
function edSubjectIcon(c, key, s = 1) {
  c.save(); c.scale(s, s); c.lineWidth = 5; c.strokeStyle = INK; c.lineJoin = 'round';
  if (key === 'Chinese') { c.font = '900 70px "Microsoft JhengHei","Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('中', 0, 24); }
  if (key === 'English') { c.font = '900 50px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('ABC', 0, 18); }
  if (key === 'math') { c.font = '900 52px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('1+2', 0, 18); }
  if (key === 'art') { c.beginPath(); c.ellipse(0, 0, 40, 30, -.2, 0, 7); fillStroke(c, '#fff3d6', 5); for (const [px, py, col] of [[-18, -8, '#ff6b6b'], [0, -14, '#ffd84d'], [18, -6, '#4fb3d9'], [-6, 10, '#7cc96a']]) { c.beginPath(); c.arc(px, py, 7, 0, 7); c.fillStyle = col; c.fill(); } }
  if (key === 'music') { c.fillStyle = INK; c.beginPath(); c.ellipse(-14, 20, 13, 10, -.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(20, 12, 13, 10, -.4, 0, 7); c.fill(); c.fillRect(-4, -32, 6, 52); c.fillRect(30, -40, 6, 52); c.beginPath(); c.moveTo(-4, -32); c.lineTo(36, -40); c.lineTo(36, -28); c.lineTo(-4, -20); c.closePath(); c.fill(); }
  if (key === 'PE') edBall(c, 0, 0, 34);
  if (key === 'computer') { rr(c, -40, -32, 80, 52, 6); fillStroke(c, '#bfe8f5', 5); c.beginPath(); c.moveTo(-14, 20); c.lineTo(-20, 34); c.lineTo(20, 34); c.lineTo(14, 20); c.closePath(); fillStroke(c, '#c9ced6', 4); }
  c.restore();
}
function edSubjectCard(c, key, x, y, k = 1, lit = 0, s = 1, label = true) {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k * s, k * s);
  if (lit > 0) { c.save(); c.globalAlpha = lit * .55; c.fillStyle = '#fff3a6'; c.beginPath(); c.arc(0, 0, 118, 0, 7); c.fill(); c.restore(); }
  rr(c, -80, -80, 160, 160, 24); fillStroke(c, ED_SUBJ[key], 6); rr(c, -66, -66, 132, 100, 16); c.fillStyle = '#fffdf6'; c.fill();
  c.save(); c.translate(0, -16); edSubjectIcon(c, key, .95); c.restore();
  if (label) { c.font = '800 26px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(key, 0, 62); }
  c.restore();
}
function edBall(c, x, y, r, rot = 0) {   // 籃球 / basketball
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.arc(0, 0, r, 0, 7); fillStroke(c, '#f08a35', 5);
  c.lineWidth = 3.5; c.strokeStyle = INK; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
  c.beginPath(); c.arc(-r * 1.25, 0, r * .9, -.75, .75); c.stroke(); c.beginPath(); c.arc(r * 1.25, 0, r * .9, Math.PI - .75, Math.PI + .75); c.stroke(); c.restore();
}
// ✓ 與 ✗（k = 0–1 畫出進度）/ tick and cross drawn progressively
function edTick(c, x, y, k, s = 1) {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round'; c.lineJoin = 'round';
  const pts = [[-34, 0], [-10, 26], [38, -30]], L1 = Math.hypot(24, 26), L2 = Math.hypot(48, 56), d = k * (L1 + L2);
  c.beginPath(); c.moveTo(...pts[0]); if (d <= L1) c.lineTo(-34 + 24 * d / L1, 26 * d / L1); else { c.lineTo(...pts[1]); const u = (d - L1) / L2; c.lineTo(-10 + 48 * u, 26 - 56 * u); }
  c.lineWidth = 26; c.strokeStyle = INK; c.stroke(); c.lineWidth = 16; c.strokeStyle = '#3cc46b'; c.stroke(); c.restore();
}
function edCross(c, x, y, k, s = 1) {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
  const a = Math.min(1, k * 2), b = Math.max(0, k * 2 - 1);
  for (const [w, col] of [[26, INK], [16, '#ef4a4a']]) { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(-32, -32); c.lineTo(-32 + 64 * a, -32 + 64 * a); if (b > 0) { c.moveTo(32, -32); c.lineTo(32 - 64 * b, -32 + 64 * b); } c.stroke(); }
  c.restore();
}
// 上課鐘（ring 0–1 搖晃）/ school bell
function edBell(c, x, y, ring, t, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(Math.sin(t * 28) * .35 * ring);
  c.beginPath(); c.moveTo(-40, 30); c.quadraticCurveTo(-40, -40, 0, -44); c.quadraticCurveTo(40, -40, 40, 30); c.lineTo(50, 40); c.lineTo(-50, 40); c.closePath(); fillStroke(c, '#ffd84d', 6);
  c.beginPath(); c.arc(0, 48, 11, 0, 7); fillStroke(c, '#f59a3c', 5); c.beginPath(); c.arc(0, -50, 9, 0, 7); fillStroke(c, '#f59a3c', 5); c.restore();
  if (ring > .05) { c.save(); c.translate(x, y); c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round'; for (const sg of [-1, 1]) for (let i = 1; i <= 2; i++) { c.globalAlpha = ring; c.beginPath(); c.arc(0, 0, 55 + i * 20, sg > 0 ? -.5 : Math.PI - .5, sg > 0 ? .5 : Math.PI + .5); c.stroke(); } c.restore(); }
}
// 說話泡泡 / speech bubble
function edBubble(c, text, x, y, k, tailDx = -30, size = 40) {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); c.font = `800 ${size}px "Inter","Segoe UI",sans-serif`;
  const w = c.measureText(text).width + 60, h = size * 1.7;
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.moveTo(tailDx - 14, h / 2 - 2); c.lineTo(tailDx, h / 2 + 26); c.lineTo(tailDx + 16, h / 2 - 2);
  c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.fillStyle = INK; c.textAlign = 'center'; c.fillText(text, 0, size * .36); c.restore();
}
// 角色切換正面／側面時的壓扁翻面（0→1）/ cartoon flip helper: returns horizontal squash factor
function edFlip(t, t0, d = .22) { const k = prog(t, t0, t0 + d); return Math.abs(Math.cos(k * Math.PI)); }
