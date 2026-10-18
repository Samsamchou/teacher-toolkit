// group.js — 群舞／副歌場景共用（S00、S04、S06、S09、S10）。名稱一律 grp 開頭，避免與各場景衝突。
// Shared helpers for the group / chorus scenes. All names start with "grp".

const GRP_XS = [235, 525, 815, 1105, 1395, 1685];   // 六人站位 / six positions (ORDER: TW SG JP KR UK US)

// 天空＋雲 / sky with drifting clouds
function grpSky(c, t, top = '#9fdcf5', bottom = '#e8f7ff', gy = 760) {
  const g = c.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (const [cx, cy, s, v] of [[200, 130, 1, 12], [900, 90, 1.25, 8], [1500, 180, .85, 16], [1950, 120, 1, 10]]) {
    const x = ((cx + t * v) % 2400) - 240; c.save(); c.translate(x, cy); c.scale(s, s); c.fillStyle = '#fff'; c.beginPath();
    for (const [a, b, r] of [[0, 0, 44], [50, -18, 52], [104, 0, 44], [52, 14, 42]]) c.arc(a, b, r, 0, 7); c.fill(); c.restore();
  }
}
// 學校建築（可發光彈跳）/ school building (pop = 0–1 bounce, glow 0–1)
function grpSchool(c, x, y, s, pop = 0, glow = 0) {
  c.save(); c.translate(x, y);
  if (glow > 0) { const rg = c.createRadialGradient(0, -200, 60, 0, -200, 480); rg.addColorStop(0, `rgba(255,236,140,${.6 * glow})`); rg.addColorStop(1, 'rgba(255,236,140,0)'); c.fillStyle = rg; c.fillRect(-520, -680, 1040, 700); }
  c.scale(s * (1 + pop * .04), s * (1 + pop * .07));
  rr(c, -330, -340, 660, 340, 16); fillStroke(c, '#ffe7c2', 6);
  rr(c, -120, -450, 240, 120, 14); fillStroke(c, '#ff8c78', 6);
  c.beginPath(); c.arc(0, -390, 34, 0, 7); fillStroke(c, '#fff', 5);     // 時鐘 / clock
  c.beginPath(); c.moveTo(0, -390); c.lineTo(0, -412); c.moveTo(0, -390); c.lineTo(15, -386); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { if (r === 1 && (k === 2 || k === 3)) continue; rr(c, -290 + k * 100, -300 + r * 120, 72, 74, 10); fillStroke(c, '#7ec8e8', 4); }
  rr(c, -70, -130, 140, 130, 12); fillStroke(c, '#c98f5a', 5);           // 大門 / door
  c.font = '800 40px "Inter",sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('SCHOOL', 0, -470 + 18); c.textAlign = 'left';
  c.restore();
}
function grpTree(c, x, base, s, t) {
  c.save(); c.translate(x, base); c.scale(s, s); rr(c, -22, -190, 44, 190, 12); fillStroke(c, '#9a6b4b', 6);
  c.translate(Math.sin(t * 1.3 + x) * 5, 0);
  for (const [a, b, r, col] of [[0, -260, 120, '#58b368'], [-80, -200, 80, '#6cc279'], [86, -210, 86, '#4aa35c']]) { c.beginPath(); c.arc(a, b, r, 0, 7); fillStroke(c, col, 6); }
  c.restore();
}
// 六國國旗彩帶 / bunting with the six flags
function grpBunting(c, t, y = 120) {
  c.beginPath(); c.moveTo(-20, y); c.quadraticCurveTo(W / 2, y + 90, W + 20, y); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
  for (let i = 0; i < 12; i++) {
    const u = (i + .5) / 12, x = lerp(-20, W + 20, u), yy = y + 180 * u * (1 - u);
    c.save(); c.translate(x, yy); c.rotate(Math.sin(t * 2 + i) * .06); c.translate(-36, 0); drawFlag(c, ORDER[i % 6], 72); c.restore();
  }
}
// 校園操場背景 / school-yard backdrop
function grpYard(c, t, opt = {}) {
  grpSky(c, t);
  grpTree(c, 110, 700, 1.15, t); grpTree(c, 1810, 700, 1.25, t);
  grpSchool(c, W / 2, 700, 1, opt.pop || 0, opt.glow || 0);
  c.fillStyle = '#9fd38b'; c.fillRect(0, 690, W, 80);                    // 草地 / grass
  c.fillStyle = '#f2dcc0'; c.fillRect(0, 760, W, H - 760);               // 操場 / yard
  c.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 60; x < W; x += 240) rr(c, x, 840, 120, 10, 5), c.fill();
  if (opt.bunting !== false) grpBunting(c, t, 40);
}
// 地球 / globe（spin 弧度）
function grpGlobe(c, x, y, r, t, spin = 0, pins = 0) {
  c.save(); c.translate(x, y);
  c.beginPath(); c.arc(0, 0, r, 0, 7); fillStroke(c, '#6ec6ef', 7);
  c.save(); c.beginPath(); c.arc(0, 0, r - 4, 0, 7); c.clip();
  const lands = [[-.6, -.35, .34, .22], [-.15, .1, .2, .36], [.35, -.25, .42, .2], [.55, .25, .18, .14], [.1, -.55, .2, .1], [-.5, .45, .16, .12]];
  for (let k = -1; k <= 1; k++) for (const [lx, ly, lw, lh] of lands) {
    const px = ((lx + spin / Math.PI + k * 2 + 3) % 2) - 1;
    c.beginPath(); c.ellipse(px * r * 1.4, ly * r, lw * r, lh * r, .3, 0, 7); c.fillStyle = '#7cc96a'; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(59,42,46,.6)'; c.stroke();
  }
  c.restore();
  c.beginPath(); c.ellipse(-r * .35, -r * .4, r * .25, r * .12, -.6, 0, 7); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill();
  // 六個國家圖釘 / six pins
  const P = [[.42, -.28], [.36, .12], [.55, -.4], [.5, -.33], [-.2, -.5], [-.62, -.3]];
  for (let i = 0; i < 6; i++) { const k = clamp(pins * 6 - i); if (k <= 0) continue; const [px, py] = P[i];
    c.save(); c.translate(px * r, py * r); c.scale(E.back(k), E.back(k)); c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -24); c.lineTo(10, -24); c.closePath(); c.fillStyle = INK; c.fill();
    c.beginPath(); c.arc(0, -30, 14, 0, 7); fillStroke(c, ['#fe0000', '#ef3340', '#bc002d', '#0047a0', '#012169', '#b22234'][i], 4); c.restore(); }
  c.restore();
}
// 音符 / music notes rising from (x,y)
function grpNotes(c, t, x, y, k = 1, seed = 0) {
  if (k <= 0) return;
  for (let i = 0; i < 5; i++) {
    const ph = ((t * .7 + i * .2 + seed * .13) % 1), nx = x + Math.sin(ph * 6 + i) * 40 + (i - 2) * 26, ny = y - ph * 260;
    c.save(); c.globalAlpha = k * (1 - ph); c.translate(nx, ny); c.rotate(Math.sin(t * 3 + i) * .2);
    c.fillStyle = ['#ff8c78', '#8b5cc7', '#3d78c9', '#38b2a6', '#f59a3c'][i]; c.beginPath(); c.ellipse(0, 0, 13, 10, -.4, 0, 7); c.fill();
    c.fillRect(9, -42, 5, 42); if (i % 2) c.fillRect(9, -42, 22, 7); c.restore();
  }
}
// 彩帶紙花 / confetti burst from t0
function grpConfetti(c, t, t0, dur = 2.2) {
  const k = (t - t0) / dur; if (k < 0 || k > 1) return;
  for (let i = 0; i < 90; i++) {
    const x = (rnd(i) * 1.2 - .1) * W, vy = 300 + rnd(i + 50) * 500, y = -40 + (t - t0) * vy, rot = (t - t0) * (3 + rnd(i + 9) * 6);
    c.save(); c.globalAlpha = 1 - Math.max(0, k - .7) / .3; c.translate(x + Math.sin((t - t0) * 4 + i) * 30, y); c.rotate(rot);
    c.fillStyle = ['#ff8c78', '#ffd84d', '#38b2a6', '#8b5cc7', '#3d78c9', '#f07c8c'][i % 6]; c.fillRect(-9, -5, 18, 10); c.restore();
  }
}
// 拍手火花 / clap spark
function grpClapFx(c, x, y, s) { c.save(); c.translate(x, y); c.strokeStyle = '#ffb703'; c.lineWidth = 5 * s; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(a) * 26 * s, Math.sin(a) * 26 * s); c.lineTo(Math.cos(a) * 44 * s, Math.sin(a) * 44 * s); c.stroke(); } c.restore(); }
// 標題字卡 / title card
function grpTitle(c, text, x, y, k, t, size = 120, col = '#ffd84d') {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); c.rotate(Math.sin(t * 2) * .02);
  c.font = `900 ${size}px "Inter","Segoe UI",sans-serif`; c.textAlign = 'center'; c.lineJoin = 'round';
  c.lineWidth = size * .2; c.strokeStyle = INK; c.strokeText(text, 0, 0); c.fillStyle = col; c.fillText(text, 0, 0);
  c.restore();
}
// 六人一排：timeline 為 [[本地秒, 舞步], ...]，或 (i)=>timeline；sing(t,i) 決定誰對嘴；tweak(i,pose,t) 可個別調整
// Draw the six kids in a row with a shared (or per-kid) dance timeline. Returns array of {x, y, pose}.
function grpRow(c, t, timeline, opt = {}) {
  const ys = opt.y || 905, sc = opt.scale || .92, out = [];
  const sing = opt.sing || (() => true);
  for (let i = 0; i < 6; i++) {
    const code = ORDER[i], tl = typeof timeline === 'function' ? timeline(i) : timeline;
    let p = Object.assign({ x: (opt.xs || GRP_XS)[i], y: ys, scale: sc }, dancePose(tl, t - (opt.stagger || 0) * i, i % 2 ? -1 : 1));
    const singing = sing(t, i); p.talk = singing ? mouthAt(t) : 0; p.round = singing ? roundAt(t) : 0;
    if (opt.tweak) p = opt.tweak(i, p, t) || p;
    if (p.hidden) { out.push({ x: p.x, y: p.y, pose: p }); continue; }
    kidFront(c, CAST[code], p, t);
    const hx = p.x, hy = p.y - (p.hop || 0) - 260 * (p.scale || sc);
    const handY = p.y - (p.hop || 0) - 262 * (p.scale || sc);           // 胸前手的高度 / hand height at chest
    if (p.book) drawBook(c, hx, handY - 10 * (p.scale || sc), (p.scale || sc) * 1.1);
    if (p.clapFx) grpClapFx(c, hx, handY + 10 * (p.scale || sc), p.scale || sc);
    out.push({ x: p.x, y: p.y, pose: p, headY: hy - 120 * (p.scale || sc) });
  }
  return out;
}
// 時間到 t0 時彈出（0→1，帶回彈），到 t1 收起 / pop-in/out helper
function grpPop(t, t0, t1 = 1e9, dIn = .3, dOut = .25) { const p0 = prog(t, t0, t0 + dIn); return p0 <= 0 ? 0 : E.back(p0) * (1 - prog(t, t1, t1 + dOut)); }
// 舞台（舞蹈段）/ dance stage with sweeping spotlights and beat-pulsing floor
function grpStage(c, t, st) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b1f5c'); g.addColorStop(1, '#5a3a8f'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const b = beatAt(st), pulse = Math.pow(1 - b.f, 2);
  for (let i = 0; i < 4; i++) {
    const a = Math.sin(t * .9 + i * 1.7) * .45, x0 = 240 + i * 480;
    c.save(); c.translate(x0, -20); c.rotate(a); const lg = c.createLinearGradient(0, 0, 0, 900);
    lg.addColorStop(0, `rgba(255,240,180,${.35 + .15 * pulse})`); lg.addColorStop(1, 'rgba(255,240,180,0)'); c.fillStyle = lg;
    c.beginPath(); c.moveTo(-30, 0); c.lineTo(30, 0); c.lineTo(220, 900); c.lineTo(-220, 900); c.closePath(); c.fill(); c.restore();
  }
  for (let i = 0; i < 40; i++) { const x = rnd(i) * W, y = rnd(i + 7) * 520, tw = .5 + .5 * Math.sin(t * 3 + i); starShape(c, x, y, 4 + tw * 5, `rgba(255,255,255,${.3 + .5 * tw})`); }
  // 地板格子跟拍點亮 / floor tiles light on the beat
  const cols = ['#ff8c78', '#ffd84d', '#38b2a6', '#8b5cc7', '#3d78c9', '#f07c8c'];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 12; k++) {
    const on = (k + r + b.i) % 3 === 0; c.fillStyle = on ? cols[(k + b.i) % 6] : '#3a2d6e'; c.globalAlpha = on ? .55 + .45 * pulse : 1;
    c.beginPath(); const y0 = 760 + r * 110, y1 = y0 + 110, sk = (k - 6) * 160;
    c.moveTo(W / 2 + sk * (1 + r * .12), y0); c.lineTo(W / 2 + (sk + 160) * (1 + r * .12), y0); c.lineTo(W / 2 + (sk + 160) * (1 + (r + 1) * .12), y1); c.lineTo(W / 2 + sk * (1 + (r + 1) * .12), y1); c.closePath(); c.fill();
  }
  c.globalAlpha = 1;
}
