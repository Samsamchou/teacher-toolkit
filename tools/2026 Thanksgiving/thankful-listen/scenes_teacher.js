// my teacher 的 5 句。u = 從 "because" 開始算的秒數。
// 原則：手一定碰到它在操作的東西（指揮棒尖端碰黑板、手指點在作業上、手搭在肩上、手掌圈在耳朵旁），
// 手臂不擋臉、兩人頭不重疊；坐姿用 sit，小腿從座墊前緣垂下，課桌畫在孩子前面。
window.TARGETS = window.TARGETS || {};
window.SCENES = window.SCENES || {};

TARGETS.teacher = {
  color: '#26a69a',
  draw(ctx, x, y, s, t, k) {
    const book = c => { c.fillStyle = '#e57373'; rr(c, -24, 4, 48, 60, 6); c.fill(); c.fillStyle = '#fffdf5'; c.fillRect(-20, 10, 4, 50); c.fillStyle = '#ffd54f'; star(c, 4, 34, 12, '#ffd54f'); };
    drawPerson(ctx, 'teacher', x, y, s, { t, armR: 20 + 30 * Math.max(0, E.wave(t, 1.2)) * k, armL: 10, itemL: book, mouth: 'smile', blinkSeed: 2 });
  },
};

// ---------- 這組自己的小工具 ----------
// 物品指向角度（drawPerson 的 itemAng：0 = 朝下，正值 = 往畫面右轉）
function teacher_aim(hx, hy, px, py) { return Math.atan2(px - hx, py - hy) * 180 / Math.PI; }

// 教室牆面＋上方感恩節葉子掛飾
function teacher_classroom(ctx, u, wall, stripe) {
  BG.room(ctx, u, wall, '#d7a86e', stripe);
  ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(150, 300); ctx.quadraticCurveTo(800, 340, 1450, 300); ctx.stroke();
  const cols = ['#ff9f1c', '#e85d04', '#ffd166', '#d00000'];
  for (let i = 0; i < 17; i++) {
    const x = 190 + i * 76, k = (x - 150) / 1300, y = 300 + 160 * k * (1 - k) + 4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(u * 2 + i) * .12); ctx.fillStyle = cols[i % 4];
    ctx.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 + Math.PI / 2, r = j % 2 ? 6 : 14; ctx.lineTo(Math.cos(a) * r, 12 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

// 學生椅：seat = 座墊上緣
function teacher_chair(ctx, x, seat, color = '#4db6ac') {
  ctx.fillStyle = '#607d8b'; ctx.fillRect(x - 50, seat, 9, 790 - seat); ctx.fillRect(x + 41, seat, 9, 790 - seat);
  ctx.fillStyle = color; rr(ctx, x - 62, seat - 150, 124, 70, 14); ctx.fill();
  ctx.fillStyle = '#607d8b'; ctx.fillRect(x - 50, seat - 84, 9, 84); ctx.fillRect(x + 41, seat - 84, 9, 84);
  ctx.fillStyle = color; rr(ctx, x - 60, seat - 4, 120, 16, 7); ctx.fill();
}

// 學生課桌：top = 桌面高度；桌面下有抽屜擋板（擋住坐著孩子的大腿），桌腳到地面
function teacher_desk(ctx, x, top, w = 230) {
  ctx.fillStyle = '#90a4ae'; ctx.fillRect(x - w / 2 + 14, top + 20, 12, 790 - top - 20); ctx.fillRect(x + w / 2 - 26, top + 20, 12, 790 - top - 20);
  ctx.fillStyle = '#b0bec5'; rr(ctx, x - w / 2 + 8, top + 14, w - 16, 52, 6); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x - w / 2 + 20, top + 30, w - 40, 8);
  const g = ctx.createLinearGradient(0, top - 6, 0, top + 18); g.addColorStop(0, '#ffcc80'); g.addColorStop(1, '#d7a15e');
  ctx.fillStyle = g; rr(ctx, x - w / 2, top - 6, w, 24, 8); ctx.fill();
}

// 對話框：中心 (cx, cy)，尾巴尖端 (tx, ty)
function teacher_bubble(ctx, cx, cy, w, h, tx, ty, k = 1, fill = '#fff') {
  if (k <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  const bx = E.clamp(tx - cx, -w / 2 + 40, w / 2 - 40);
  ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  ctx.fillStyle = fill; rr(ctx, -w / 2, -h / 2, w, h, 30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx - 22, h / 2 - 6); ctx.lineTo(tx - cx, ty - cy); ctx.lineTo(bx + 22, h / 2 - 6); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.fillStyle = fill; rr(ctx, -w / 2, -h / 2, w, h, 30); ctx.fill();
  ctx.restore();
}

// 圖示（中心在 0,0，大約半徑 45）
function teacher_apple(ctx) {
  const g = ctx.createRadialGradient(-12, -10, 4, 0, 0, 46); g.addColorStop(0, '#ff8a80'); g.addColorStop(1, '#d32f2f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -26);
  ctx.bezierCurveTo(30, -46, 56, -8, 34, 26); ctx.bezierCurveTo(20, 46, 6, 40, 0, 36); ctx.bezierCurveTo(-6, 40, -20, 46, -34, 26); ctx.bezierCurveTo(-56, -8, -30, -46, 0, -26); ctx.fill();
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(4, -44); ctx.stroke();
  ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.ellipse(18, -42, 14, 7, -.5, 0, Math.PI * 2); ctx.fill();
  circle(ctx, -16, -12, 7, 'rgba(255,255,255,.6)');
}
function teacher_catFace(ctx) {
  ctx.fillStyle = '#ffb74d';
  ctx.beginPath(); ctx.moveTo(-38, -14); ctx.lineTo(-30, -48); ctx.lineTo(-8, -30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(38, -14); ctx.lineTo(30, -48); ctx.lineTo(8, -30); ctx.fill();
  circle(ctx, 0, 2, 38, '#ffb74d');
  ctx.fillStyle = '#ff8a80'; ctx.beginPath(); ctx.moveTo(-30, -20); ctx.lineTo(-27, -38); ctx.lineTo(-16, -28); ctx.fill(); ctx.beginPath(); ctx.moveTo(30, -20); ctx.lineTo(27, -38); ctx.lineTo(16, -28); ctx.fill();
  circle(ctx, -14, -2, 6, '#3e2723'); circle(ctx, 14, -2, 6, '#3e2723'); circle(ctx, -12, -4, 2, '#fff'); circle(ctx, 16, -4, 2, '#fff');
  ctx.fillStyle = '#e57373'; ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(6, 10); ctx.lineTo(0, 16); ctx.fill();
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 16); ctx.quadraticCurveTo(-6, 24, -12, 20); ctx.moveTo(0, 16); ctx.quadraticCurveTo(6, 24, 12, 20);
  [-1, 1].forEach(sd => { ctx.moveTo(sd * 18, 12); ctx.lineTo(sd * 46, 6); ctx.moveTo(sd * 18, 16); ctx.lineTo(sd * 46, 20); });
  ctx.stroke();
}
function teacher_sun(ctx, t = 0) {
  ctx.save(); ctx.rotate(t * .8); ctx.fillStyle = '#ffb300';
  for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(-8, -32); ctx.lineTo(0, -50); ctx.lineTo(8, -32); ctx.fill(); }
  ctx.restore();
  const g = ctx.createRadialGradient(-8, -8, 4, 0, 0, 32); g.addColorStop(0, '#fff59d'); g.addColorStop(1, '#ffca28');
  circle(ctx, 0, 0, 30, g);
  ctx.strokeStyle = '#e65100'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-10, -4, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(15, -4); ctx.arc(10, -4, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 6, 11, Math.PI * .15, Math.PI * .85); ctx.stroke();
}
function teacher_cloud(ctx, x, y, s, fill) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = fill;
  [[-34, 6, 26], [-10, -12, 32], [20, -6, 28], [40, 10, 20], [0, 12, 28]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}
// 問號（用線條畫，不是文字）
function teacher_qmark(ctx, x, y, s, color = '#7e57c2') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -14, 16, Math.PI * 1.05, Math.PI * 2.35); ctx.quadraticCurveTo(0, 2, 0, 12); ctx.stroke();
  circle(ctx, 0, 30, 7, color); ctx.restore();
}
function teacher_bulb(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  FX.rays(ctx, t, 0, -6, 110, 'rgba(255,235,120,.45)', 12);
  glow(ctx, 0, -6, 90, 'rgba(255,245,170,.95)');
  const g = ctx.createRadialGradient(-10, -16, 4, 0, -6, 40); g.addColorStop(0, '#fffde7'); g.addColorStop(1, '#ffd54f');
  circle(ctx, 0, -8, 36, g);
  ctx.fillStyle = '#ffd54f'; ctx.fillRect(-16, 18, 32, 10);
  ctx.fillStyle = '#90a4ae'; rr(ctx, -16, 26, 32, 22, 6); ctx.fill(); ctx.fillStyle = '#607d8b'; ctx.fillRect(-16, 32, 32, 4); ctx.fillRect(-16, 40, 32, 4);
  ctx.strokeStyle = '#ff8f00'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(-6, 4); ctx.moveTo(6, 18); ctx.lineTo(6, 4); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function teacher_check(ctx, x, y, s, color = '#2e7d32') {
  if (s <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-3, 8); ctx.lineTo(12, -10); ctx.stroke(); ctx.restore();
}
// 攤開的作業簿（正對觀眾立在桌上）：stage 0 = 卡住（問號），1 = 寫出答案（打勾）
function teacher_notebook(ctx, x, y, u, solved) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#42a5f5'; rr(ctx, -66, -44, 132, 88, 8); ctx.fill();
  ctx.fillStyle = '#fffdf5'; rr(ctx, -62, -40, 60, 80, 4); ctx.fill(); rr(ctx, 2, -40, 60, 80, 4); ctx.fill();
  ctx.strokeStyle = '#bbdefb'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-56, -22 + i * 18); ctx.lineTo(-8, -22 + i * 18); ctx.moveTo(8, -22 + i * 18); ctx.lineTo(56, -22 + i * 18); ctx.stroke(); }
  for (let i = 0; i < 5; i++) circle(ctx, 0, -32 + i * 16, 3, '#90a4ae');
  // 左頁：亂塗的線（寫不出來）
  ctx.strokeStyle = '#78909c'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let j = 0; j <= 14; j++) { const xx = -54 + j * 3.2, yy = -26 + Math.sin(j * 2.1) * 4; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
  // 右頁：三題（小圖示＋空格）
  [[-26, 0], [-8, 1], [10, 2]].forEach(([yy, i]) => {
    if (i === 0) circle(ctx, 16, yy - 4, 5, '#e53935'); else if (i === 1) star(ctx, 16, yy - 4, 6, '#ffb300'); else heart(ctx, 16, yy - 2, 12, '#ec407a');
    const k = solved ? E.pop(u, solved + i * .45, .35) : 0;
    if (k > 0) { ctx.strokeStyle = '#1e88e5'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(26, yy - 2); ctx.lineTo(26 + 18 * Math.min(k, 1), yy - 2); ctx.stroke(); teacher_check(ctx, 52, yy - 6, k * .6); }
    else { ctx.save(); ctx.globalAlpha = .9; teacher_qmark(ctx, 38, yy - 4, .3, '#e53935'); ctx.restore(); }
  });
  ctx.restore();
}
function teacher_pencil(ctx, hx, hy, ang) {   // 筆尖在手下方一點、筆身往上斜（世界座標）
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-ang * Math.PI / 180);
  ctx.fillStyle = '#ffca28'; rr(ctx, -5, -46, 10, 54, 3); ctx.fill();
  ctx.fillStyle = '#f48fb1'; rr(ctx, -5, -54, 10, 10, 3); ctx.fill();
  ctx.fillStyle = '#ffe0b2'; ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(0, 20); ctx.fill();
  circle(ctx, 0, 18, 2.5, '#37474f'); ctx.restore();
}
// 側面小貓（故事泡泡裡用），面向右
function teacher_storyCat(ctx, x, y, s, rot, step, dizzy) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.strokeStyle = '#ff9800'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  [[-22, 1], [-10, -1], [14, -1], [24, 1]].forEach(([lx, d]) => { ctx.beginPath(); ctx.moveTo(lx, -14); ctx.lineTo(lx + d * step * 8, 6); ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(-34, -24); ctx.quadraticCurveTo(-56, -40, -46, -62); ctx.stroke();
  ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.ellipse(0, -24, 38, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(30, -50); ctx.lineTo(34, -72); ctx.lineTo(44, -54); ctx.fill(); ctx.beginPath(); ctx.moveTo(46, -52); ctx.lineTo(56, -70); ctx.lineTo(58, -48); ctx.fill();
  circle(ctx, 44, -40, 20, '#ffb74d');
  if (dizzy) { ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(46, -48); ctx.lineTo(54, -40); ctx.moveTo(54, -48); ctx.lineTo(46, -40); ctx.stroke(); }
  else { circle(ctx, 50, -44, 4, '#3e2723'); }
  circle(ctx, 63, -36, 3, '#e57373');
  ctx.restore();
}
function teacher_banana(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = '#ffd600';
  ctx.beginPath(); ctx.ellipse(0, -4, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
  [[-1, .5], [1, -.5], [0, 0]].forEach(([d, a]) => { ctx.save(); ctx.rotate(d * 1.1 + a * .2); ctx.beginPath(); ctx.ellipse(0, -16, 6, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
  ctx.fillStyle = '#795548'; circle(ctx, 0, -6, 4, '#795548'); ctx.restore();
}
// 笑出眼淚：從眼角往外噴的水滴
function teacher_laughTears(ctx, u, x, y, s, start, seed) {
  if (u < start) return;
  for (let i = 0; i < 6; i++) {
    const k = ((u - start) * 1.6 + i / 6 + E.rand(seed + i) * .2) % 1, sd = i % 2 ? 1 : -1;
    const px = x + sd * (44 + k * 60) * s, py = y + (-k * 50 + k * k * 120) * s;
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(px, py, 6 * s, 9 * s, sd * .5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
function teacher_laughLines(ctx, u, x, y, s) {
  ctx.save(); ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = .6 + .4 * Math.abs(E.wave(u, 3));
  [-1, 1].forEach(sd => [[-.5, 0], [0, 1], [.5, 2]].forEach(([a]) => {
    const ang = -Math.PI / 2 + sd * (.75 + a * .45), r0 = 112 * s, r1 = (132 + 8 * Math.abs(E.wave(u, 4))) * s;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0); ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1); ctx.stroke();
  }));
  ctx.restore();
}

// 黑板上的兩張圖：火雞（turkey）、南瓜派（pie）
function teacher_turkeyIcon(ctx) {
  const fan = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  fan.forEach((c, i) => { ctx.save(); ctx.rotate(-1.2 + i * .48); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -52, 16, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
  circle(ctx, 0, 6, 40, '#8d5a2b'); circle(ctx, 0, -30, 24, '#a1693a');
  circle(ctx, -8, -34, 5, '#2b2118'); circle(ctx, 8, -34, 5, '#2b2118');
  ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.moveTo(-6, -26); ctx.lineTo(6, -26); ctx.lineTo(0, -16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.ellipse(6, -16, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  [-14, 14].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 42); ctx.lineTo(x, 58); ctx.moveTo(x - 8, 60); ctx.lineTo(x + 8, 60); ctx.stroke(); });
}
function teacher_pieIcon(ctx) {
  ctx.fillStyle = '#d7a15e'; ctx.beginPath(); ctx.ellipse(0, 10, 66, 34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8892b'; ctx.beginPath(); ctx.ellipse(0, 4, 54, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c98a45'; ctx.lineWidth = 6; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 60, 6 + Math.sin(a) * 30, 6, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#fffdf5'; [[-6, -8], [6, -12], [0, -18]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#d7a15e'; rr(ctx, -66, 10, 132, 24, 10); ctx.fill();
}
// 粉筆字：一個字母一個字母出現
function teacher_chalkWord(ctx, word, x, y, start, u, step = .14) {
  if (u < start) return;
  const n = Math.max(0, Math.min(word.length, Math.floor((u - start) / step) + 1));
  ctx.save(); ctx.font = '60px "Comic Relief"'; ctx.textBaseline = 'middle';
  const total = ctx.measureText(word).width; let cx = x - total / 2;
  for (let i = 0; i < n; i++) {
    const ch = word[i], w = ctx.measureText(ch).width, k = E.back(E.clamp((u - start - i * step) / .25));
    ctx.save(); ctx.translate(cx + w / 2, y); ctx.scale(k, k);
    ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 8; ctx.fillStyle = '#fbfbf2'; ctx.textAlign = 'center'; ctx.fillText(ch, 0, 0);
    ctx.restore(); cx += w;
  }
  ctx.restore();
}

// 1. she teaches me English：老師用指揮棒指著黑板上的圖，寫出英文字並念出來，孩子舉手跟讀
SCENES.teacher_1 = {
  dur: 10.5,
  sfx: [[0.5, 'pop'], [0.6, 'chime'], [2.4, 'w_t_turkey'], [3.0, 'sparkle'], [4.1, 'w_k_turkey'], [4.9, 'whoosh'], [5.5, 'pop'], [5.6, 'chime'], [5.9, 'w_t_pie'], [6.4, 'sparkle'], [7.5, 'w_k_pie'], [8.5, 'ding'], [8.6, 'sparkle']],
  draw(ctx, u) {
    teacher_classroom(ctx, u, '#e8f4ea', '#d6eedc');
    PROP.chalkboard(ctx, 470, 330, 500, 230);
    ctx.fillStyle = '#6d4c41'; rr(ctx, 206, 572, 528, 14, 6); ctx.fill();
    ctx.fillStyle = '#fff'; rr(ctx, 260, 564, 26, 8, 3); ctx.fill(); ctx.fillStyle = '#ffd54f'; rr(ctx, 300, 564, 22, 8, 3); ctx.fill();
    const items = [{ x: 345, f: teacher_turkeyIcon, t0: .5, word: 'turkey', w0: 2.45 }, { x: 595, f: teacher_pieIcon, t0: 5.5, word: 'pie', w0: 5.95 }];
    items.forEach(it => {
      const k = E.pop(u, it.t0, .5); if (k <= 0) return;
      glow(ctx, it.x, 432, 100, 'rgba(255,255,220,.4)', Math.min(k, 1));
      ctx.save(); ctx.translate(it.x, 428); ctx.scale(k * .85, k * .85); it.f(ctx); ctx.restore();
      if (u < it.t0 + 1.2) FX.sparkles(ctx, u, it.x, 428, 80, 6, it.t0 * 10, '#fffde7');
      teacher_chalkWord(ctx, it.word, it.x, 525, it.w0, u);
    });
    // 指揮棒尖端碰到正在教的那張圖（右下角），老師跟著走過去
    const m = E.easeInOut(E.seg(u, 4.9, 5.5));
    const tip = [398 + 250 * m, 470];
    const tx = tip[0] + 287, walking = m > 0 && m < 1;
    const S = 1.05 * PEOPLE.teacher.h, len = 170;
    const sh = [tx - 40 * S, 790 - 153 * S];
    const dd = Math.hypot(sh[0] - tip[0], sh[1] - tip[1]);
    const hand = [tip[0] + (sh[0] - tip[0]) / dd * len, tip[1] + (sh[1] - tip[1]) / dd * len];
    const ang = teacher_aim(hand[0], hand[1], tip[0], tip[1]);
    const pointer = c => { c.strokeStyle = '#8d6e63'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, len / S); c.stroke(); circle(c, 0, len / S, 5, '#ef5350'); };
    const tTalk = (u > 2.4 && u < 3.3) || (u > 5.9 && u < 6.7);
    const kTalk = (u > 4.1 && u < 4.9) || (u > 7.5 && u < 8.3);
    const kRaise = E.clamp(E.easeOut(E.seg(u, 3.7, 4.0)) * (1 - E.seg(u, 4.9, 5.2)) + E.easeOut(E.seg(u, 7.1, 7.4)));
    const kx = 1240;
    teacher_chair(ctx, kx, 700);
    drawPerson(ctx, 'teacher', tx, 790, 1.05, {
      t: u, flip: true, blinkSeed: 2, mouth: tTalk ? 'talk' : 'smile', eyes: u > 8.5 ? 'happy' : 'open',
      bob: walking ? -Math.abs(E.wave(u, 3)) * 8 : 0,
      reachR: hand, itemR: pointer, itemAngR: ang, armL: kTalk ? 40 + 12 * E.wave(u, .8) : 12,
    });
    drawPerson(ctx, 'kid', kx, 700, 1.0, {
      t: u, sit: true, flip: true, swing: 1, eyes: u > 8.5 ? 'happy' : 'open', mouth: kTalk ? 'talk' : (u > 8.5 ? 'open' : 'smile'),
      reachR: [kx - 45, 652], reachL: [E.lerp(kx + 45, kx + 125, kRaise), E.lerp(652, 470, kRaise)], armFrontL: kRaise > .5,
      bob: u > 8.5 ? -Math.abs(E.wave(u, 2)) * 8 : 0,
    });
    teacher_desk(ctx, kx, 662, 240);
    PROP.book(ctx, kx, 632, .3, 1, 0, '#ef5350');
    // 孩子跟讀時，泡泡裡出現那張圖
    [[4.1, 4.95, teacher_turkeyIcon], [7.5, 8.35, teacher_pieIcon]].forEach(([a, b, f]) => {
      const bk = E.pop(u, a, .35) * (1 - E.seg(u, b, b + .25)); if (bk <= 0) return;
      teacher_bubble(ctx, 1075, 420, 170, 130, kx - 70, 470, bk);
      ctx.save(); ctx.translate(1075, 420); ctx.scale(.62 * bk, .62 * bk); f(ctx); ctx.restore();
    });
    const sk = E.pop(u, 8.5, .55);
    if (sk > 0) {
      const sx = kx + 20, sy = 352 + 4 * E.wave(u, 1);
      FX.rays(ctx, u, sx, sy, 180 * Math.min(sk, 1), 'rgba(255,215,64,.25)', 14);
      glow(ctx, sx, sy, 110, 'rgba(255,230,120,.9)', Math.min(sk, 1));
      star(ctx, sx, sy, 54 * sk, '#ffc107', Math.sin(u * 2) * .15);
      star(ctx, sx, sy, 34 * sk, '#ffe082', Math.sin(u * 2) * .15);
      FX.burst(ctx, u, sx, sy, 8.55); FX.sparkles(ctx, u, kx - 60, 520, 160, 8, 4);
    }
  },
};

// 2. she helps me
SCENES.teacher_2 = {
  dur: 8.5, sfx: [[0.4, 'boing'], [1.0, 'whoosh'], [2.9, 'pop'], [3.8, 'ding'], [3.95, 'sparkle'], [4.4, 'page'], [4.85, 'page'], [5.3, 'page'], [5.8, 'chime']],
  draw(ctx, u) {
    teacher_classroom(ctx, u, '#fff3e0', '#ffe5c2');
    BG.window(ctx, 1090, 330, 250, 170, u);
    const kx = 620, solved = u > 3.8, think = u < 3.8;
    teacher_chair(ctx, kx, 700, '#7986cb');
    // 卡住：左手抓耳朵旁的頭、皺眉；想通了：左手放回桌上、右手的鉛筆開始寫
    const pen = solved ? [664 + 10 * Math.sin(u * 9) * E.seg(u, 4.3, 4.5) * (1 - E.seg(u, 5.9, 6.1)), 626 + 3 * Math.sin(u * 18)] : [662, 628];
    drawPerson(ctx, 'kid', kx, 700, 1.0, {
      t: u, sit: true, eyes: u < 2.9 ? 'sad' : (u < 3.8 ? 'open' : 'happy'), mouth: u < 2.9 ? 'sad' : (u < 3.8 ? 'o' : 'open'),
      reachL: think ? [540, 540 + 5 * E.wave(u, 4)] : [588, 652], armFrontL: think,
      reachR: pen, tilt: think ? -6 : 0, bob: solved && u > 6 ? -Math.abs(E.wave(u, 2)) * 8 : 0,
    });
    teacher_desk(ctx, 670, 662, 260);
    teacher_notebook(ctx, 696, 614, u, solved ? 4.4 : 0);
    // 孩子的手和鉛筆畫在作業簿前面
    teacher_pencil(ctx, pen[0], pen[1], -30);
    circle(ctx, pen[0], pen[1], 13, PEOPLE.kid.skin);
    if (!think) circle(ctx, 588, 652, 13, PEOPLE.kid.skin);
    // 冒汗
    if (u < 3.4) for (let i = 0; i < 2; i++) { const k = (u * 1.1 + i * .5) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(700 + i * 14, 470 + k * 50, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // 老師走過來，彎腰，用手指點作業簿上的題目
    const walk = E.easeOut(E.seg(u, .8, 2.4)), tx = E.lerp(1500, 880, walk), bend = E.easeInOut(E.seg(u, 2.4, 2.9)) * (1 - E.easeInOut(E.seg(u, 6.4, 7)));
    const pointing = u > 2.7 && u < 6.5;
    drawPerson(ctx, 'teacher', tx, 790, 1.05, {
      t: u, flip: true, blinkSeed: 2, lean: -6 * bend, mouth: u > 2.9 && u < 4.4 ? 'talk' : 'smile', eyes: u > 4 ? 'happy' : 'open',
      bob: walk > 0 && walk < 1 ? -Math.abs(E.wave(u, 3)) * 10 : 0,
      reachR: pointing ? (u < 4.3 ? [744, 594 + (u < 4 ? 4 * Math.abs(E.wave(u, 2)) : 0)] : [E.lerp(744, 784, E.seg(u, 4.3, 4.6)), E.lerp(594, 652, E.seg(u, 4.3, 4.6))]) : null, armR: 12, armL: 14,
    });
    // 問號雲 → 燈泡
    const ck = E.pop(u, .3, .45) * (1 - E.seg(u, 3.7, 3.9));
    if (ck > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(ck, 1);
      circle(ctx, 585, 450, 9, '#eceff1'); circle(ctx, 570, 428, 13, '#eceff1');
      ctx.translate(555, 370); ctx.rotate(.06 * E.wave(u, 1.3)); ctx.scale(ck * 1.2, ck * 1.2);
      teacher_cloud(ctx, 0, 0, 1.25, '#eceff1'); teacher_qmark(ctx, -14, -6, .9); teacher_qmark(ctx, 30, 2, .6, '#9575cd');
      ctx.restore();
    }
    const lk = E.pop(u, 3.8, .5);
    if (lk > 0) { teacher_bulb(ctx, 555, 372 + 4 * E.wave(u, 1), .9 * lk, u); FX.burst(ctx, u, 555, 372, 3.85); }
    if (u > 5.8) { FX.sparkles(ctx, u, 700, 560, 200, 10, 9); FX.floatHearts(ctx, u, 760, 520, 5, 300, 4, 6); }
  },
};

// 3. she is kind to me
SCENES.teacher_3 = {
  dur: 9, sfx: [[0.6, 'whoosh'], [2.3, 'heart'], [3.2, 'chime'], [3.4, 'sparkle'], [4.6, 'pop'], [5.4, 'pop'], [6.4, 'heart'], [6.5, 'sparkle']],
  draw(ctx, u) {
    // 校園一角的長椅
    BG.sky(ctx, u, '#9ad7ff', '#fff3d6');
    BG.leaves(ctx, u, 10, 21);
    drawSchool(ctx, 300, 640, .55, u);
    const gg = ctx.createLinearGradient(0, 630, 0, 900); gg.addColorStop(0, '#9ccc65'); gg.addColorStop(1, '#689f38');
    ctx.fillStyle = gg; ctx.fillRect(0, 630, W, 600);
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(1270, 430, 34, 220);
    [[1287, 400, 90, '#ff9f1c'], [1230, 450, 60, '#e85d04'], [1350, 455, 62, '#ffb703']].forEach(([x, y, r, c]) => circle(ctx, x, y, r, c));
    const kx = 600, cheer = E.seg(u, 3.0, 3.6);
    // 彩虹＋太陽（老師安慰之後才出現）
    if (cheer > 0) {
      ctx.save(); ctx.globalAlpha = cheer; ctx.lineWidth = 14;
      ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc'].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(kx, 520, 190 - i * 14, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); });
      ctx.restore();
    }
    // 長椅：椅背在人後面
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(460, 560, 12, 230); ctx.fillRect(770, 560, 12, 230);
    ctx.fillStyle = '#a1887f'; rr(ctx, 440, 566, 360, 26, 8); ctx.fill(); rr(ctx, 440, 606, 360, 26, 8); ctx.fill();
    ctx.fillStyle = '#8d6e63'; rr(ctx, 430, 686, 380, 22, 8); ctx.fill();
    const sad = u < 3.4;
    // 孩子：手放腿上 → 接過愛心貼紙 → 貼在胸口
    let kr = [628, 672], kHeart = false;
    if (u > 5.1 && u < 5.8) kr = [E.lerp(628, 688, E.easeInOut(E.seg(u, 5.1, 5.4))), E.lerp(672, 640, E.easeInOut(E.seg(u, 5.1, 5.4)))];
    else if (u >= 5.8 && u < 6.9) { const k = E.easeInOut(E.seg(u, 5.8, 6.4)); kr = [E.lerp(688, 616, k), E.lerp(640, 632, k)]; kHeart = u < 6.4; if (u > 6.5) kr = [E.lerp(616, 628, E.seg(u, 6.5, 6.9)), E.lerp(632, 672, E.seg(u, 6.5, 6.9))]; }
    const stuck = u >= 6.4;
    drawPerson(ctx, 'kid', kx, 690, 1.0, {
      t: u, sit: true, eyes: sad ? 'sad' : (stuck ? 'happy' : 'open'), mouth: sad ? 'sad' : (stuck ? 'open' : 'smile'), tilt: sad ? -8 : 0,
      reachL: [574, 672], reachR: kr, armFrontR: u > 5.8 && u < 6.9,
      bob: stuck ? -Math.abs(E.wave(u, 1.6)) * 6 : 0,
    });
    if (stuck) { const hk = E.pop(u, 6.4, .4); glow(ctx, 612, 630, 90, 'rgba(255,150,190,.8)', Math.min(hk, 1)); heart(ctx, 612, 634, 30 * hk, '#ff5d8f', '#fff'); }
    // 眼淚
    if (u < 3.6) for (let i = 0; i < 4; i++) { const k = (u * .9 + i * .25) % 1; ctx.save(); ctx.globalAlpha = (1 - k) * (1 - E.seg(u, 3.0, 3.6)); ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(kx + (i % 2 ? 30 : -30), 540 + k * 50, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // 老師走過來 → 手輕輕搭在孩子肩上 → 拿出愛心貼紙遞給他
    const walk = E.easeOut(E.seg(u, .6, 2.0)), tx = E.lerp(1500, 820, walk);
    let tr = null, tHeart = false;
    const shoulder = [648, 594 + 3 * Math.abs(E.wave(u, .9))];
    if (u > 2.1 && u < 4.4) tr = [E.lerp(735, shoulder[0], E.easeOut(E.seg(u, 2.1, 2.4))), E.lerp(690, shoulder[1], E.easeOut(E.seg(u, 2.1, 2.4)))];
    else if (u >= 4.4 && u < 5.8) { const k = E.easeInOut(E.seg(u, 4.4, 4.9)); tr = [E.lerp(shoulder[0], 712, k), E.lerp(shoulder[1], 640, k)]; tHeart = u > 4.6; }
    else if (u >= 5.8 && u < 6.3) { const k = E.easeInOut(E.seg(u, 5.8, 6.3)); tr = [E.lerp(712, 742, k), E.lerp(640, 694, k)]; }
    drawPerson(ctx, 'teacher', tx, 790, 1.05, {
      t: u, flip: true, blinkSeed: 2, mouth: 'smile', eyes: u > 2.4 ? 'happy' : 'open', tilt: u > 2.2 ? -6 : 0,
      bob: walk > 0 && walk < 1 ? -Math.abs(E.wave(u, 3)) * 10 : 0, reachR: tr, armR: 12, armL: 12,
    });
    // 愛心貼紙：在老師手上 → 兩人都拿著 → 在孩子手上
    if (tHeart || kHeart) {
      const hp = kHeart && !tHeart ? [kr[0] - 2, kr[1] - 4] : [tr[0] - 12, tr[1] - 4];
      const hk = E.pop(u, 4.6, .35);
      glow(ctx, hp[0], hp[1], 60, 'rgba(255,170,200,.8)'); heart(ctx, hp[0], hp[1] + 6, 30 * Math.min(hk, 1.2), '#ff5d8f', '#fff');
      circle(ctx, tHeart ? tr[0] : kr[0], tHeart ? tr[1] : kr[1], 13 * (tHeart ? 1.365 : 1), tHeart ? PEOPLE.teacher.skin : PEOPLE.kid.skin);
    }
    // 頭上的小雨雲 → 散開，太陽出來
    const rain = 1 - E.seg(u, 2.8, 3.3);
    if (rain > 0) {
      ctx.save(); ctx.globalAlpha = rain; ctx.translate(kx, 360 + 3 * E.wave(u, .8));
      teacher_cloud(ctx, 0, 0, 1.4 * (1 + .3 * (1 - rain)), '#90a4ae');
      ctx.strokeStyle = '#64b5f6'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const k = (u * 1.8 + i * .37) % 1, x = -48 + i * 24; ctx.beginPath(); ctx.moveTo(x, 34 + k * 40); ctx.lineTo(x - 4, 48 + k * 40); ctx.stroke(); }
      ctx.restore();
    }
    const sk = E.pop(u, 3.1, .5);
    if (sk > 0) { glow(ctx, kx, 345, 130, 'rgba(255,240,150,.9)', Math.min(sk, 1)); ctx.save(); ctx.translate(kx, 345); ctx.scale(sk * 1.1, sk * 1.1); teacher_sun(ctx, u); ctx.restore(); FX.burst(ctx, u, kx, 345, 3.15); }
    if (u > 2.3) FX.sparkles(ctx, u, 705, 560, 230, 8, 12, '#ffe3ef');
    if (stuck) FX.floatHearts(ctx, u, 700, 520, 8, 360, 15, 6.4);
  },
};

// 4. she tells funny stories
SCENES.teacher_4 = {
  dur: 9, sfx: [[0.5, 'pop'], [1.2, 'bounce'], [1.6, 'bounce'], [2.0, 'bounce'], [2.6, 'boing'], [3.3, 'bounce'], [3.5, 'sparkle'], [5.8, 'whoosh'], [6.3, 'boing'], [6.5, 'sparkle']],
  draw(ctx, u) {
    teacher_classroom(ctx, u, '#fff8e1', '#ffefc4');
    PROP.chalkboard(ctx, 380, 340, 360, 200);
    ctx.fillStyle = '#6d4c41'; rr(ctx, 190, 552, 380, 12, 5); ctx.fill();
    // 故事泡泡：小貓走路 → 踩到香蕉皮滑倒 → 頭昏眼花；後來香蕉皮又掉到牠頭上
    const bx = 800, by = 378, bw = 480, bh = 166, bk = E.pop(u, .4, .45);
    teacher_bubble(ctx, bx, by, bw, bh, 548, 452, bk, '#fffef5');
    if (bk > 0) {
      ctx.save(); ctx.translate(bx, by); ctx.scale(bk, bk); ctx.translate(-bx, -by);
      rr(ctx, bx - bw / 2 + 8, by - bh / 2 + 8, bw - 16, bh - 16, 24); ctx.clip();
      const sg = ctx.createLinearGradient(0, by - bh / 2, 0, by + bh / 2); sg.addColorStop(0, '#e1f5fe'); sg.addColorStop(1, '#fff9c4');
      ctx.fillStyle = sg; ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      const gy = by + 46; ctx.fillStyle = '#aed581'; ctx.fillRect(bx - bw / 2, gy, bw, 40);
      const walkK = E.seg(u, 1.0, 2.6), cx0 = E.lerp(bx - 170, bx - 10, walkK);
      const fly = E.seg(u, 2.6, 3.3), landed = u >= 3.3;
      let cx = cx0, cy = gy, rot = 0;
      if (fly > 0) { cx = bx - 10 + fly * 50; cy = gy - Math.sin(fly * Math.PI) * 80 - fly * 46; rot = -fly * Math.PI; }
      if (landed) { cx = bx + 40; cy = gy - 46; rot = -Math.PI + .05 * E.wave(u, 2); }
      // 香蕉皮：踩到之後飛起來旋轉，第二次掉到小貓肚子上
      let px = bx + 20, py = gy, prot = 0;
      if (fly > 0) { const k = E.seg(u, 2.6, 3.8); px = bx + 20 - k * 120; py = gy - Math.sin(k * Math.PI) * 90; prot = k * 12; }
      if (u > 3.8) { px = bx - 100; py = gy; prot = 0; }
      if (u > 5.8) { const k = E.seg(u, 5.8, 6.3); px = E.lerp(bx - 100, bx + 40, k); py = gy - Math.sin(k * Math.PI) * 100 - k * 58; prot = k * 10; }
      teacher_banana(ctx, px, py, 1.3, prot);
      teacher_storyCat(ctx, cx, cy, 1.15, rot, walkK > 0 && walkK < 1 ? Math.sin(u * 14) : 0, landed);
      if (landed) for (let i = 0; i < 4; i++) { const a = u * 4 + i * Math.PI / 2; star(ctx, cx - 52 + Math.cos(a) * 34, cy + 24 + Math.sin(a) * 10, 10, '#ffc107', a); }
      if (u > 2.55 && u < 3.0) FX.burst(ctx, u, bx + 10, gy - 20, 2.55, 10, 5);
      ctx.restore();
    }
    // 老師邊講邊演：踮腳走 → 滑倒（雙手往上甩、往後仰）→ 一起大笑
    const slip = E.seg(u, 2.6, 2.75) * (1 - E.seg(u, 3.2, 3.5));
    const telling = u < 2.6, laughT = u > 3.3;
    drawPerson(ctx, 'teacher', 430, 790, 1.05, {
      t: u, blinkSeed: 2, mouth: slip > .5 ? 'o' : (laughT ? 'open' : 'talk'), eyes: slip > .5 ? 'open' : (laughT ? 'happy' : 'open'),
      lean: -8 * slip + (laughT ? 3 * E.wave(u, 1.5) : 0),
      armL: telling ? 40 + 25 * E.wave(u, 1.3) : (slip > .5 ? 128 : 95 + 25 * E.wave(u, 1.1)),
      armR: telling ? 40 + 25 * E.wave(u, 1.3, .5) : (slip > .5 ? 128 : 95 + 25 * E.wave(u, 1.1, .5)),
      bob: telling ? -Math.abs(E.wave(u, 1.4)) * 14 : (laughT ? -Math.abs(E.wave(u, 3)) * 6 : 0),
    });
    // 兩個學生看到滑倒笑翻了：抱肚子、身體抖、笑出眼淚
    [['kid', 1010, 1, 'open'], ['mia', 1250, 3, 'open']].forEach(([who, x, seed]) => {
      const laugh = E.seg(u, 2.9, 3.1), sh = laugh ? E.wave(u, 7, seed * .3) : 0, s = .98;
      drawPerson(ctx, who, x, 790, s, {
        t: u, flip: true, blinkSeed: seed, eyes: laugh > .5 ? 'happy' : 'open', mouth: laugh > .5 ? 'open' : (u > 2 ? 'o' : 'smile'),
        lean: laugh * 5 * sh, bob: -laugh * Math.abs(E.wave(u, 4, seed * .2)) * 10,
        reachL: laugh > .5 ? [x + 26, 702] : null, reachR: laugh > .5 ? [x - 26, 702] : null, armL: 10, armR: 10, armFrontL: true, armFrontR: true,
      });
      const hy = 790 - 235 * s * PEOPLE[who].h;
      if (laugh > .5) { teacher_laughTears(ctx, u, x, hy + 8, s, 3.1, seed * 7); teacher_laughLines(ctx, u, x, hy, s * PEOPLE[who].h); }
    });
    if (u > 3.3) FX.sparkles(ctx, u, 1130, 560, 260, 8, 21, '#fff3c4');
  },
};

// 5. she listens to me
SCENES.teacher_5 = {
  dur: 8.5, sfx: [[0.75, 'pop'], [1.9, 'pop'], [2.9, 'pop'], [4.3, 'chime'], [4.45, 'sparkle'], [5.4, 'heart'], [5.6, 'sparkle']],
  draw(ctx, u) {
    teacher_classroom(ctx, u, '#ede7f6', '#e0d6f5');
    PROP.bookshelf(ctx, 330, 790, 260, 360);
    BG.window(ctx, 1150, 330, 210, 160, u);
    const kx = 560, tx = 960, talking = u > .6 && u < 4.8;
    const lean = -5 * E.easeInOut(E.seg(u, .5, 1.1)) * (1 - E.easeInOut(E.seg(u, 5.0, 5.6))) - 1;
    const happy = u > 5.2;
    // 聲音的波紋從孩子嘴巴傳到老師耳朵
    const S = 1.05 * PEOPLE.teacher.h, th = lean * Math.PI / 180;
    const ear = [tx + 235 * S * Math.sin(th) - 74 * S * Math.cos(th), 790 - 235 * S * Math.cos(th) - 74 * S * Math.sin(th)];
    drawPerson(ctx, 'kid', kx, 790, 1.0, {
      t: u, mouth: talking ? 'talk' : (happy ? 'open' : 'smile'), eyes: happy ? 'happy' : 'open', tilt: u > 2.9 && u < 4.3 ? -8 : 0,
      armR: talking ? 35 + 25 * E.wave(u, .9) : (happy ? 140 : 14), armL: happy ? 140 : 14,
      bob: happy ? -Math.abs(E.wave(u, 1.8)) * 12 : 0,
    });
    // 老師身體往前傾、手掌圈在耳朵旁、一直點頭 → 聽完露出微笑
    const cup = u > .8 && u < 5.1;
    drawPerson(ctx, 'teacher', tx, 790, 1.05, {
      t: u, flip: true, blinkSeed: 2, lean, tilt: cup ? 6 * E.wave(u, 1.1) : 0,
      mouth: happy ? 'open' : 'smile', eyes: happy ? 'happy' : 'open',
      reachR: cup ? [ear[0] - 4, ear[1] + 14] : null, armFrontR: cup, armR: 12, armL: 12,
    });
    if (cup) { // 圈起來的手掌
      ctx.save(); ctx.strokeStyle = PEOPLE.teacher.skin; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ear[0] - 4, ear[1] + 4, 20, -Math.PI * .55, Math.PI * .35, true); ctx.stroke(); ctx.restore();
    }
    if (talking) {
      const m = [kx + 30, 790 - 235 + 40], dx = ear[0] - 30 - m[0], dy = ear[1] - m[1], a = Math.atan2(dy, dx);
      for (let i = 0; i < 3; i++) {
        const k = (u * .9 + i / 3) % 1;
        ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI) * .9; ctx.strokeStyle = '#7e57c2'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.translate(m[0] + dx * k, m[1] + dy * k); ctx.rotate(a); ctx.beginPath(); ctx.arc(0, 0, 14 + 10 * k, -.8, .8); ctx.stroke(); ctx.restore();
      }
    }
    // 孩子說的事：球、愛心、難過的雨雲 → 老師聽完，雨雲變成太陽
    const bk = E.pop(u, .55, .35) * (1 - E.seg(u, 5.6, 5.9));
    teacher_bubble(ctx, 650, 362, 330, 112, 598, 452, bk);
    if (bk > 0) {
      ctx.save(); ctx.translate(650, 362); ctx.scale(bk, bk);
      const k1 = E.pop(u, .75, .35), k2 = E.pop(u, 1.9, .35), k3 = E.pop(u, 2.9, .35), sunK = E.pop(u, 4.3, .45);
      if (k1 > 0) PROP.ball(ctx, -100, 0, 30 * k1, u * .3);
      if (k2 > 0) heart(ctx, 0, 10, 62 * k2, '#ff5d8f');
      const cloudA = 1 - E.seg(u, 4.2, 4.5);
      if (k3 > 0 && cloudA > 0) {
        ctx.save(); ctx.globalAlpha = cloudA; teacher_cloud(ctx, 100, -6, .72 * k3, '#90a4ae');
        ctx.strokeStyle = '#64b5f6'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const k = (u * 1.6 + i * .33) % 1; ctx.beginPath(); ctx.moveTo(84 + i * 14, 18 + k * 20); ctx.lineTo(82 + i * 14, 26 + k * 20); ctx.stroke(); }
        ctx.restore();
      }
      if (sunK > 0) { glow(ctx, 100, 0, 60, 'rgba(255,240,150,.9)'); ctx.save(); ctx.translate(100, 0); ctx.scale(.8 * sunK, .8 * sunK); teacher_sun(ctx, u); ctx.restore(); }
      ctx.restore();
    }
    // 聽完：兩人中間跳出大愛心
    const hk = E.pop(u, 5.4, .55);
    if (hk > 0) {
      FX.rays(ctx, u, 735, 470, 260 * Math.min(hk, 1), 'rgba(255,140,180,.18)', 14);
      glow(ctx, 735, 470, 180, 'rgba(255,150,190,.8)', Math.min(hk, 1));
      heart(ctx, 735, 488, 92 * hk * (1 + .05 * E.wave(u, 1.3)), '#ff5d8f', '#fff');
      FX.burst(ctx, u, 735, 470, 5.45); FX.floatHearts(ctx, u, 735, 470, 8, 340, 31, 5.6); FX.sparkles(ctx, u, 735, 470, 240, 10, 33);
    }
  },
};
