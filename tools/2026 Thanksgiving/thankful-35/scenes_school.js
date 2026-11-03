// my school 的 5 句。u = 從 "because" 開始算的秒數。
// 原則：手一定碰到它在操作的東西（放大鏡握在手上、球在手掌下、書拿在手裡、筷子送到嘴邊），手臂不擋臉，坐姿小腿從座墊前緣垂下。
window.TARGETS = window.TARGETS || {};
window.SCENES = window.SCENES || {};

TARGETS.school = {
  color: '#e57373',
  draw(ctx, x, y, s, t, k) { drawSchool(ctx, x - 30, y, s * .7, t); },
};

// ---------- 本檔共用小工具（school_ 前綴） ----------
// 從手指向目標點的物品角度（0 = 朝下，正值 = 往畫面右轉），給 itemAng 用
function school_angTo(hx, hy, tx, ty) { return Math.atan2(tx - hx, ty - hy) * 180 / Math.PI; }
// 手掌（畫在道具上面時補畫）
function school_hand(ctx, who, x, y, S) { circle(ctx, x, y, 13 * S, PEOPLE[who].skin); }
// 教室牆面＋木地板
function school_room(ctx, t, wall, stripe, floor = '#d9a066') {
  BG.room(ctx, t, wall, floor, stripe);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, 628, W, 12);
}
// 拱型大窗
function school_archWindow(ctx, x, y, w, h, t) {
  ctx.save(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 12, y + h + 12); ctx.lineTo(x - w / 2 - 12, y + w / 2); ctx.arc(x, y + w / 2, w / 2 + 12, Math.PI, 0); ctx.lineTo(x + w / 2 + 12, y + h + 12); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - w / 2, y + h); ctx.lineTo(x - w / 2, y + w / 2); ctx.arc(x, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y + h); ctx.closePath(); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#7cc8ff'); g.addColorStop(1, '#e1f5ff'); ctx.fillStyle = g; ctx.fillRect(x - w, y - 10, w * 2, h + 20);
  for (let i = 0; i < 2; i++) { const cx = x - w / 2 + ((t * 18 + i * 120) % (w + 120)) - 60, cy = y + h * (.35 + i * .2); circle(ctx, cx, cy, 16, '#fff'); circle(ctx, cx + 18, cy - 7, 20, '#fff'); circle(ctx, cx + 38, cy, 15, '#fff'); }
  ctx.restore();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.moveTo(x - w / 2, y + h * .58); ctx.lineTo(x + w / 2, y + h * .58); ctx.stroke();
}
// 樹
function school_tree(ctx, x, y, s, t, col = '#ff9f1c') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#795548'; rr(ctx, -14, -150, 28, 150, 10); ctx.fill();
  const sw = Math.sin(t * 1.5) * 4;
  [[0, -210, 78], [-52, -170, 58], [52, -170, 58], [0, -150, 60]].forEach(([a, b, r], i) => circle(ctx, a + sw, b, r, i % 2 ? col : '#ffb74d'));
  ctx.restore();
}
// 太陽
function school_sun(ctx, t, x, y, r = 46) {
  glow(ctx, x, y, r * 4, 'rgba(255,236,150,.9)');
  FX.rays(ctx, t, x, y, r * 2.6, 'rgba(255,220,120,.45)', 12);
  circle(ctx, x, y, r, '#ffd54f'); circle(ctx, x - r * .25, y - r * .25, r * .45, 'rgba(255,255,255,.35)');
}

// ---------- 1. I can learn new things：放大鏡看葉子 → 新知識一個個冒出來 ----------
SCENES.school_1 = {
  dur: 8.5, sfx: [[0.3, 'whoosh'], [1.2, 'pop'], [2.2, 'sparkle'], [3.5, 'ding'], [4.0, 'pop'], [4.5, 'pop'], [5.0, 'pop'], [5.6, 'chime'], [6.2, 'sparkle']],
  draw(ctx, u) {
    school_room(ctx, u, '#e3f2fd', '#d3eafc');
    // 黑板＋粉筆畫的太陽系（沒有文字）
    PROP.chalkboard(ctx, 655, 390, 470, 190);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    const sx = 520, sy = 485;
    glow(ctx, sx, sy, 60, 'rgba(255,224,130,.6)'); circle(ctx, sx, sy, 24, 'rgba(255,224,130,.95)');
    [[64, 22], [112, 38], [160, 54]].forEach(([a, b]) => { ctx.beginPath(); ctx.ellipse(sx, sy, a, b, 0, 0, Math.PI * 2); ctx.stroke(); });
    circle(ctx, sx + 64 * Math.cos(u * 1.4), sy + 22 * Math.sin(u * 1.4), 8, '#90caf9');
    circle(ctx, sx + 112 * Math.cos(u * .9 + 2), sy + 38 * Math.sin(u * .9 + 2), 11, '#ef9a9a');
    circle(ctx, sx + 160 * Math.cos(u * .6 + 4), sy + 54 * Math.sin(u * .6 + 4), 13, '#a5d6a7');
    // 右半邊：粉筆葉子
    ctx.beginPath(); ctx.moveTo(800, 560); ctx.quadraticCurveTo(752, 480, 818, 420); ctx.quadraticCurveTo(880, 490, 800, 560); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(800, 560); ctx.lineTo(816, 432); ctx.stroke();
    ctx.restore();
    // 老師：手握教鞭，鞭尖點在黑板上的太陽
    const tap = 5 * Math.max(0, E.wave(u, 1.2));
    const tHand = [402, 588 - tap], tTip = [sx - 6, sy + 10 - tap];
    const tLen = Math.hypot(tTip[0] - tHand[0], tTip[1] - tHand[1]) / (.95 * 1.3);
    const pointer = c => { c.strokeStyle = '#8d6e63'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, tLen); c.stroke(); circle(c, 0, tLen, 5, '#fff'); };
    drawPerson(ctx, 'teacher', 300, 790, .95, { t: u, blinkSeed: 2, mouth: u < 3.4 ? 'talk' : 'smile', eyes: u > 3.6 ? 'happy' : 'open', reachR: tHand, itemR: pointer, itemAngR: school_angTo(tHand[0], tHand[1], tTip[0], tTip[1]), armL: 12 });
    // 實驗桌＋葉子
    PROP.table(ctx, 1060, 655, 330, '#90a4ae');
    const kx = 985;
    const lower = E.easeInOut(E.seg(u, .2, 1.0));
    const cheer = E.seg(u, 5.2, 5.5);
    const jump = u > 5.5 ? -Math.abs(E.wave(u, 1.6)) * 26 : 0;
    // 放大鏡：握把在手上，鏡片朝葉子
    const hand = [E.lerp(1118, 1124, lower), E.lerp(600, 634, lower)];
    const angM = E.lerp(205, 215, lower);
    const magnifier = c => {
      c.fillStyle = '#6d4c41'; rr(c, -6, -8, 12, 34, 5); c.fill();
      c.fillStyle = '#b0bec5'; c.fillRect(-4, 24, 8, 8);
      const g = c.createRadialGradient(-8, 52, 2, 0, 56, 26); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(160,220,255,.55)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 56, 23, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffb300'; c.lineWidth = 6; c.stroke();
    };
    // 葉子在鏡片正下方
    const leafX = 1089, leafY = 646;
    ctx.save(); ctx.translate(leafX, leafY); ctx.rotate(-.15); ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke(); ctx.restore();
    drawPerson(ctx, 'kid', kx, 790, 1.05, {
      t: u, tilt: cheer > 0 ? 0 : 10 * lower, bob: jump,
      eyes: u > 3.5 ? 'happy' : 'open', mouth: u > 3.5 ? 'open' : (u > 1.2 ? 'o' : 'smile'),
      reachR: cheer > 0 ? null : hand, armR: 155, itemR: magnifier, itemAngR: cheer > 0 ? 180 : angM,
      reachL: cheer > 0 ? null : [958, 648], armL: 150,
    });
    // 放大的葉子泡泡：鏡片 → 大圓圈裡看到葉脈和瓢蟲
    const bk = E.pop(u, 1.2, .5) * (1 - E.seg(u, 3.2, 3.6));
    if (bk > 0) {
      const bx = 1262, by = 440, br = 108;
      ctx.save(); ctx.globalAlpha = Math.min(1, bk); ctx.setLineDash([8, 10]); ctx.strokeStyle = 'rgba(255,179,0,.9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(1100, 575); ctx.lineTo(bx - br * .7, by + br * .7); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      ctx.save(); ctx.translate(bx, by); ctx.scale(bk, bk);
      glow(ctx, 0, 0, br * 1.6, 'rgba(255,240,170,.8)');
      ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fillStyle = '#e8f5e9'; ctx.fill(); ctx.save(); ctx.clip();
      ctx.rotate(-.3); ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.ellipse(0, 0, 150, 70, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-150, 0); ctx.lineTo(150, 0); ctx.stroke();
      ctx.lineWidth = 3; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 34, 0); ctx.lineTo(i * 34 + 30, -50); ctx.moveTo(i * 34, 0); ctx.lineTo(i * 34 + 30, 50); ctx.stroke(); }
      // 瓢蟲沿著葉脈爬
      const lb = -60 + E.seg(u, 1.4, 3.3) * 110;
      ctx.translate(lb, -14); circle(ctx, 0, 0, 24, '#e53935'); ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(20, 0, 13, 0, Math.PI * 2); ctx.fill();
      [[-8, -10], [-10, 9], [6, -12], [6, 11]].forEach(([a, b]) => circle(ctx, a, b, 5, '#212121'));
      ctx.strokeStyle = '#212121'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(16, 0); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 10; ctx.stroke();
      ctx.restore();
      if (u > 1.6) FX.sparkles(ctx, u, bx, by, 140, 6, 12);
    }
    // 新知識冒出來：燈泡、地球、蝴蝶、火箭
    const ideas = [
      [3.5, 985, 372, c => { glow(c, 0, -6, 90, 'rgba(255,240,120,.95)'); circle(c, 0, -10, 34, '#fff176'); c.fillStyle = '#90a4ae'; rr(c, -16, 20, 32, 22, 6); c.fill(); c.strokeStyle = '#ff9800'; c.lineWidth = 4; c.beginPath(); c.moveTo(-8, 20); c.lineTo(-8, 2); c.moveTo(8, 20); c.lineTo(8, 2); c.stroke(); c.beginPath(); c.arc(0, -6, 9, Math.PI * .8, Math.PI * 2.2); c.stroke(); }],
      [4.0, 820, 430, c => { circle(c, 0, 0, 40, '#42a5f5'); c.fillStyle = '#66bb6a'; c.beginPath(); c.ellipse(-12, -10, 16, 12, .5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(14, 14, 14, 9, -.3, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#ffcc80'; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 62, 16, -.3, 0, Math.PI * 2); c.stroke(); }],
      [4.5, 1160, 400, c => { const f = Math.abs(Math.sin(u * 8)) * .6 + .4; c.save(); c.scale(f, 1); c.fillStyle = '#ab47bc'; c.beginPath(); c.ellipse(-24, -14, 26, 20, -.4, 0, Math.PI * 2); c.ellipse(24, -14, 26, 20, .4, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffca28'; c.beginPath(); c.ellipse(-18, 16, 16, 13, .4, 0, Math.PI * 2); c.ellipse(18, 16, 16, 13, -.4, 0, Math.PI * 2); c.fill(); c.restore(); c.fillStyle = '#4e342e'; rr(c, -5, -24, 10, 50, 5); c.fill(); }],
      [5.0, 1290, 500, c => { c.rotate(.5); c.fillStyle = '#eceff1'; rr(c, -18, -44, 36, 76, 18); c.fill(); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(-18, -24); c.quadraticCurveTo(0, -70, 18, -24); c.fill(); circle(c, 0, -6, 9, '#4fc3f7'); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(-18, 18); c.lineTo(-32, 36); c.lineTo(-18, 32); c.fill(); c.beginPath(); c.moveTo(18, 18); c.lineTo(32, 36); c.lineTo(18, 32); c.fill(); c.fillStyle = '#ff9800'; c.beginPath(); c.moveTo(-10, 34); c.lineTo(0, 54 + 8 * Math.sin(u * 20)); c.lineTo(10, 34); c.fill(); }],
    ];
    ideas.forEach(([st, x, y, fn], i) => {
      const k = E.pop(u, st, .5); if (k <= 0) return;
      ctx.save(); ctx.translate(x, y + Math.sin(u * 2.4 + i) * 8); ctx.scale(k, k); fn(ctx); ctx.restore();
      FX.burst(ctx, u, x, y, st, 10, 20 + i);
    });
    if (u > 3.5) { FX.sparkles(ctx, u, 1050, 440, 300, 12, 9); }
    if (u > 5.5) FX.burst(ctx, u, 985, 470, 5.6, 22, 31);
  },
};

// ---------- 2. I can see my friends：早上走進校門，Leo 跑來擊掌，Mia 揮手 ----------
SCENES.school_2 = {
  dur: 8.5, sfx: [[0.2, 'whoosh'], [1.4, 'whoosh'], [2.9, 'pop'], [3.0, 'ding'], [3.6, 'boing'], [4.2, 'heart'], [5.0, 'chime'], [5.6, 'sparkle']],
  draw(ctx, u) {
    BG.sky(ctx, u, '#8fd8ff', '#fff3d0');
    school_sun(ctx, u, 1300, 360, 40);
    // 遠處的學校與校門（背景層，地面 y = 680）
    ctx.fillStyle = '#c5e1a5'; ctx.fillRect(0, 610, W, 300);
    drawSchool(ctx, 800, 660, .62, u);
    school_tree(ctx, 330, 690, .9, u); school_tree(ctx, 1270, 690, .9, u, '#e85d04');
    // 校門：兩根柱子＋拱門花環
    [470, 1130].forEach(px => {
      const g = ctx.createLinearGradient(px - 34, 0, px + 34, 0); g.addColorStop(0, '#d7ccc8'); g.addColorStop(1, '#a1887f');
      ctx.fillStyle = g; rr(ctx, px - 34, 420, 68, 270, 8); ctx.fill();
      ctx.fillStyle = '#8d6e63'; rr(ctx, px - 44, 404, 88, 24, 6); ctx.fill();
      circle(ctx, px, 388, 18, '#fff59d'); glow(ctx, px, 388, 50, 'rgba(255,245,160,.7)');
    });
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(470, 420); ctx.quadraticCurveTo(800, 300, 1130, 420); ctx.stroke();
    const flagCols = ['#ff9f1c', '#e85d04', '#ffd166', '#66bb6a', '#4fc3f7'];
    for (let i = 0; i < 11; i++) {
      const k = (i + .5) / 11, fx = E.lerp(470, 1130, k), fy = E.lerp(420, 420, k) - 4 * 120 * k * (1 - k) + 6 + 0;
      ctx.save(); ctx.translate(fx, fy * 1 + 2); ctx.rotate(Math.sin(u * 2 + i) * .08); ctx.fillStyle = flagCols[i % 5];
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(0, 34); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // 前景走道
    const pg = ctx.createLinearGradient(0, 680, 0, 900); pg.addColorStop(0, '#ffe0b2'); pg.addColorStop(1, '#ffcc80');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(0, 700); ctx.lineTo(W, 700); ctx.lineTo(W, 1200); ctx.lineTo(0, 1200); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(141,110,99,.25)'; ctx.lineWidth = 3; for (let x = -100; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 700); ctx.lineTo(x - 60, 900); ctx.stroke(); }
    BG.leaves(ctx, u, 8, 21);
    // 孩子走進來（背著書包）
    const walkK = E.easeOut(E.seg(u, 0, 1.6));
    const kx = E.lerp(300, 710, walkK), walking = u < 1.6;
    const step = walking ? E.wave(u, 2.2) * 22 : 0;
    // Leo 跑過來
    const runK = E.easeOut(E.seg(u, 1.3, 2.6)), lx = E.lerp(1300, 935, runK), running = u > 1.3 && u < 2.6;
    const lstep = running ? E.wave(u, 3) * 28 : 0;
    // Mia 跑到旁邊揮手
    const miaK = E.easeOut(E.seg(u, 1.6, 3.0)), mx = E.lerp(1560, 1135, miaK), miaRun = u > 1.6 && u < 3.0;
    const mstep = miaRun ? E.wave(u, 3, .3) * 24 : 0;
    // 擊掌：兩人的手在中間碰在一起
    const P = [822, 588];
    const up = E.easeInOut(E.seg(u, 2.45, 2.9)), done = E.seg(u, 3.3, 3.6);
    const party = u > 3.6;
    const hop = (ph) => party ? -Math.abs(E.wave(u, 1.5, ph)) * 34 : 0;
    // 書包（在身體後面）
    const kbob = (walking ? -Math.abs(E.wave(u, 2.2)) * 10 : 0) + hop(0);
    ctx.fillStyle = '#1e88e5'; rr(ctx, kx - 72, 790 + kbob - 178, 40, 96, 14); ctx.fill(); ctx.fillStyle = '#1565c0'; rr(ctx, kx - 76, 790 + kbob - 128, 26, 36, 8); ctx.fill();
    const kidHigh = up > 0 && done < 1;
    drawPerson(ctx, 'kid', kx, 790, 1.05, {
      t: u, bob: kbob, legL: step, legR: -step,
      eyes: u > 2.9 ? 'happy' : 'open', mouth: u > 1.0 ? (u > 2.9 ? 'open' : 'talk') : 'smile',
      reachR: kidHigh ? [E.lerp(kx + 60, P[0], up), E.lerp(720, P[1], up)] : null,
      armR: party ? 160 + 10 * E.wave(u, 3) : (walking ? 10 + step * .5 : 12), armL: party ? 150 : (walking ? 10 - step * .5 : 10),
    });
    drawPerson(ctx, 'leo', lx, 790, 1.05, {
      t: u, flip: true, blinkSeed: 1.3, bob: (running ? -Math.abs(E.wave(u, 3)) * 14 : 0) + hop(.3), legL: lstep, legR: -lstep,
      eyes: u > 2.9 ? 'happy' : 'open', mouth: u > 1.3 ? 'open' : 'smile',
      reachR: kidHigh ? [E.lerp(lx - 60, P[0] + 4, up), E.lerp(720, P[1], up)] : null,
      armR: party ? 160 : (running ? 30 + lstep : 12), armL: party ? 160 + 10 * E.wave(u, 3, .5) : (running ? 30 - lstep : (u < 1.3 ? 150 : 12)),
    });
    drawPerson(ctx, 'mia', mx, 790, 1.0, {
      t: u, flip: true, blinkSeed: 2.1, bob: (miaRun ? -Math.abs(E.wave(u, 3, .3)) * 12 : 0) + hop(.6), legL: mstep, legR: -mstep,
      eyes: u > 3 ? 'happy' : 'open', mouth: u > 1.6 ? 'open' : 'smile',
      armL: 150 + 20 * E.wave(u, 2.2), armR: party ? 150 : (miaRun ? 20 : 12),
    });
    // 擊掌特效
    if (u > 2.85) { FX.burst(ctx, u, P[0], 430, 3.05, 16, 4); const fk = E.seg(u, 2.85, 3.4); if (fk < 1) { ctx.save(); ctx.globalAlpha = 1 - fk; ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 8; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r0 = 24 + fk * 40, r1 = 44 + fk * 70; ctx.beginPath(); ctx.moveTo(P[0] + Math.cos(a) * r0, P[1] + Math.sin(a) * r0); ctx.lineTo(P[0] + Math.cos(a) * r1, P[1] + Math.sin(a) * r1); ctx.stroke(); } ctx.restore(); } }
    if (party) {
      FX.floatHearts(ctx, u, 920, 420, 10, 620, 13, 3.8);
      FX.sparkles(ctx, u, 920, 450, 420, 14, 17);
      FX.burst(ctx, u, 920, 400, 4.9, 24, 9);
    }
    // 打招呼的泡泡（揮手圖示）
    const bk = E.pop(u, .3, .4) * (1 - E.seg(u, 1.2, 1.5));
    if (bk > 0) {
      ctx.save(); ctx.translate(1170, 400); ctx.scale(-1, 1); PROP.speech(ctx, 0, 0, 120, 90, bk); ctx.restore();
      ctx.save(); ctx.translate(1170, 400); ctx.scale(bk, bk); ctx.rotate(.25 * E.wave(u, 2)); circle(ctx, 0, 6, 20, '#ffd9b8');
      ctx.fillStyle = '#ffd9b8'; for (let i = 0; i < 4; i++) { rr(ctx, -18 + i * 10, -26, 8, 30, 4); ctx.fill(); } ctx.restore();
    }
  },
};

// ---------- 3. I can play basketball：運球 → 投籃 → 空心進球，朋友歡呼 ----------
function school_hoop(ctx, t, swish = 0) {
  // 籃板與柱子（籃圈中心 1180, 430）
  ctx.fillStyle = '#90a4ae'; ctx.fillRect(1182, 430, 18, 360);
  ctx.fillStyle = '#ffffff'; rr(ctx, 1100, 330, 170, 106, 10); ctx.fill(); ctx.strokeStyle = '#1e88e5'; ctx.lineWidth = 6; rr(ctx, 1100, 330, 170, 106, 10); ctx.stroke();
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 5; ctx.strokeRect(1150, 372, 62, 46);
  ctx.fillStyle = '#ff5722'; ctx.fillRect(1176, 422, 10, 10);
}
function school_rimFront(ctx, t, swish = 0) {
  // 網子（球通過時往下鼓）
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
  const d = 10 * swish;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(1180 + i * 12, 434); ctx.quadraticCurveTo(1180 + i * 10, 460 + d, 1180 + i * 6, 486 + d); ctx.stroke(); }
  for (let j = 0; j < 3; j++) { const yy = 450 + j * 14 + d * (j + 1) / 3, ww = 36 - j * 5; ctx.beginPath(); ctx.moveTo(1180 - ww, yy); ctx.quadraticCurveTo(1180, yy + 6, 1180 + ww, yy); ctx.stroke(); }
  ctx.strokeStyle = '#ff5722'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(1180, 430, 42, 9, 0, 0, Math.PI); ctx.stroke();
}
function school_rimBack(ctx) { ctx.strokeStyle = '#d84315'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(1180, 430, 42, 9, 0, Math.PI, Math.PI * 2); ctx.stroke(); }

SCENES.school_3 = {
  dur: 8.5,
  sfx: [[0.23, 'bounce'], [0.68, 'bounce'], [1.14, 'bounce'], [1.59, 'bounce'], [2.05, 'bounce'], [3.1, 'whoosh'], [4.0, 'ding'], [4.1, 'chime'], [4.6, 'bounce'], [4.9, 'pop'], [5.4, 'sparkle']],
  draw(ctx, u) {
    BG.sky(ctx, u, '#7fd0ff', '#fff4d6');
    school_sun(ctx, u, 330, 360, 36);
    // 學校牆＋窗戶
    ctx.fillStyle = '#ef9a9a'; ctx.fillRect(0, 470, W, 200); ctx.fillStyle = '#e57373'; ctx.fillRect(0, 462, W, 16);
    for (let i = 0; i < 9; i++) { const wx = 120 + i * 160; rr(ctx, wx, 510, 80, 70, 8); ctx.fillStyle = '#b3e5fc'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); }
    // 球場地板
    const fg = ctx.createLinearGradient(0, 660, 0, 900); fg.addColorStop(0, '#4db6ac'); fg.addColorStop(1, '#00897b');
    ctx.fillStyle = fg; ctx.fillRect(0, 660, W, 400);
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(1180, 760, 330, 70, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 690); ctx.lineTo(W, 690); ctx.stroke();
    school_hoop(ctx, u);
    // 球的位置
    const kx = 700, R = 26;
    const top = 709, bot = 790 - R;           // 運球：手 ↔ 地面
    let ball, handR = null, armR = 12, itemAng;
    const f = 2.2;
    const dribbling = u < 2.27;
    const flyK = E.seg(u, 3.1, 4.0), dropK = E.seg(u, 4.0, 4.3);
    const shoot = [812, 532];
    let squat = 0;
    if (dribbling) {
      const p = (u * f) % 1, d = 1 - Math.abs(1 - 2 * p);
      const by = top + (bot - top) * d;
      ball = [785, by];
      handR = [785, Math.min(by - R - 12, top - R - 12 + .3 * (bot - top))];
    } else if (u < 3.1) {
      const g = E.easeInOut(E.seg(u, 2.27, 2.75));
      ball = [E.lerp(785, shoot[0], g), E.lerp(top, shoot[1], g)];
      handR = [ball[0] - 10, ball[1] + R + 10];
      squat = 10 * E.seg(u, 2.75, 3.0) * (1 - E.seg(u, 3.0, 3.1));
      ball[1] += squat; handR[1] += squat;
    } else if (u < 4.0) {
      const x = E.lerp(shoot[0], 1180, flyK), y = E.lerp(shoot[1], 412, flyK) - 4 * 100 * flyK * (1 - flyK);
      ball = [x, y];
    } else if (u < 4.3) {
      ball = [1180, E.lerp(412, 560, E.easeIn(dropK))];
    } else {
      // 落地後小小彈跳、滾向右邊
      const v = u - 4.3, bounceH = [130, 60, 24, 8];
      let tt = v, y = bot, i = 0;
      const durs = bounceH.map(h => .32 * Math.sqrt(h / 130) * 2);
      const firstFall = .22;
      if (tt < firstFall) y = E.lerp(560, bot, (tt / firstFall) ** 2);
      else { tt -= firstFall; while (i < durs.length && tt > durs[i]) { tt -= durs[i]; i++; } if (i < durs.length) { const k = tt / durs[i]; y = bot - bounceH[i] * 4 * k * (1 - k); } }
      ball = [1180 + Math.min(v, 2.2) * 50, y];
    }
    const thrown = u >= 3.1;
    const cheer = u > 4.05;
    const kJump = cheer ? -Math.abs(E.wave(u, 1.5)) * 30 : 0;
    // 朋友在旁邊看，進球後跳起來歡呼
    drawPerson(ctx, 'mia', 300, 790, .95, { t: u, blinkSeed: 1.7, bob: cheer ? -Math.abs(E.wave(u, 1.6, .4)) * 30 : 0, eyes: cheer ? 'happy' : 'open', mouth: cheer ? 'open' : (u > 3.1 ? 'o' : 'smile'), armL: cheer ? 160 : 20 + 15 * E.wave(u, 1.2), armR: cheer ? 160 : 20 + 15 * E.wave(u, 1.2, .5) });
    drawPerson(ctx, 'leo', 505, 790, .95, { t: u, blinkSeed: 2.4, bob: cheer ? -Math.abs(E.wave(u, 1.6, .7)) * 30 : 0, eyes: cheer ? 'happy' : 'open', mouth: cheer ? 'open' : (u > 3.1 ? 'o' : 'smile'), armL: cheer ? 155 : 12, armR: cheer ? 165 : 12 });
    drawPerson(ctx, 'kid', kx, 790, 1.05, {
      t: u, bob: kJump + squat * .8, eyes: cheer ? 'happy' : 'open', mouth: cheer ? 'open' : (thrown ? 'o' : 'smile'),
      reachR: thrown ? null : handR, armR: cheer ? 160 + 8 * E.wave(u, 3) : 150, armL: cheer ? 150 : 20,
    });
    // 球在籃圈前後：先畫後半圈，球，再畫前半圈與網子
    school_rimBack(ctx);
    const swish = u > 4.0 && u < 4.4 ? Math.sin(E.seg(u, 4.0, 4.4) * Math.PI) : 0;
    const behind = u >= 4.0 && u < 4.3;
    if (!behind) { school_rimFront(ctx, u, swish); }
    // 飛行殘影
    if (u > 3.1 && u < 4.0) for (let i = 1; i <= 4; i++) {
      const k = Math.max(0, flyK - i * .05); const x = E.lerp(shoot[0], 1180, k), y = E.lerp(shoot[1], 412, k) - 4 * 100 * k * (1 - k);
      ctx.save(); ctx.globalAlpha = .18 * (5 - i) / 4; circle(ctx, x, y, R, '#ffb74d'); ctx.restore();
    }
    PROP.ball(ctx, ball[0], ball[1], R, dribbling ? 0 : u);
    if (behind) school_rimFront(ctx, u, swish);
    // 運球時補畫手掌，確定手在球上
    if (!thrown && handR) school_hand(ctx, 'kid', handR[0], handR[1], 1.05);
    if (u > 4.0) {
      FX.burst(ctx, u, 1180, 430, 4.0, 22, 6);
      glow(ctx, 1180, 430, 200, 'rgba(255,230,120,.75)', 1 - E.seg(u, 4.0, 5.2) * .6);
      FX.rays(ctx, u, 1180, 430, 260 * E.easeOut(E.seg(u, 4.0, 4.5)), 'rgba(255,220,120,.3)', 14);
      FX.sparkles(ctx, u, 1150, 450, 220, 10, 14);
    }
    if (u > 4.9) { FX.burst(ctx, u, 700, 430, 4.9, 20, 8); FX.floatHearts(ctx, u, 520, 440, 8, 520, 5, 5.0); }
  },
};

// ---------- 4. I can read books：從書架拿一本書 → 坐到懶骨頭上看，故事飛出來 ----------
SCENES.school_4 = {
  dur: 8.5, sfx: [[0.2, 'sparkle'], [1.5, 'whoosh'], [1.8, 'page'], [3.6, 'boing'], [4.2, 'page'], [4.4, 'chime'], [5.4, 'page'], [6.6, 'page'], [5.0, 'sparkle']],
  draw(ctx, u) {
    school_room(ctx, u, '#fff3e0', '#ffe8cc', '#c48b5a');
    school_archWindow(ctx, 820, 330, 200, 250, u);
    // 掛燈
    [[600, 360], [1040, 360]].forEach(([x, y], i) => { ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 280); ctx.lineTo(x, y); ctx.stroke(); glow(ctx, x, y + 20, 110, 'rgba(255,230,150,.75)', .8 + .2 * Math.sin(u * 2 + i)); ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.moveTo(x - 30, y + 20); ctx.lineTo(x + 30, y + 20); ctx.lineTo(x + 16, y - 4); ctx.lineTo(x - 16, y - 4); ctx.closePath(); ctx.fill(); });
    PROP.bookshelf(ctx, 430, 790);
    PROP.bookshelf(ctx, 1330, 790);
    // 地毯
    ctx.fillStyle = '#ce93d8'; ctx.beginPath(); ctx.ellipse(1060, 800, 260, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f3e5f5'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(1060, 800, 230, 26, 0, 0, Math.PI * 2); ctx.stroke();
    // 那本特別的書：書架第三排右邊
    const bookSlot = [527, 626, 26, 60];
    const pull = E.easeInOut(E.seg(u, 1.4, 1.9));
    ctx.fillStyle = '#4e342e'; ctx.fillRect(bookSlot[0] - 1, bookSlot[1] - 2, bookSlot[2] + 2, bookSlot[3] + 2);   // 書被拿走後的空位
    // 懶骨頭
    const bbx = 1060;
    const bg = ctx.createRadialGradient(bbx - 30, 690, 10, bbx, 720, 140); bg.addColorStop(0, '#ffb74d'); bg.addColorStop(1, '#ef6c00');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(bbx, 690, 108, 82, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bbx, 752, 128, 46, 0, 0, Math.PI * 2); ctx.fill();
    // 孩子的位置與動作
    const walkIn = E.easeOut(E.seg(u, 0, 1.2));
    const walkOut = E.easeInOut(E.seg(u, 2.1, 3.4));
    const hopK = E.seg(u, 3.4, 3.9);
    const S = 1.05;
    const closedBook = c => { c.fillStyle = '#7e57c2'; rr(c, -16, -4, 32, 44, 4); c.fill(); c.fillStyle = '#fffde7'; c.fillRect(-12, 0, 4, 36); star(c, 4, 18, 9, '#ffd54f'); };
    let book = null;
    if (u < 1.4) {
      // 書在書架上發光
      glow(ctx, bookSlot[0] + 13, bookSlot[1] + 30, 70, 'rgba(255,240,140,.9)', .6 + .4 * Math.sin(u * 5));
      ctx.fillStyle = '#7e57c2'; ctx.fillRect(...bookSlot); star(ctx, bookSlot[0] + 13, bookSlot[1] + 30, 9, '#ffd54f');
    }
    const sitting = hopK >= .5 || u >= 3.9;
    if (!sitting) {
      let kx, flip, reachR = null, itemR = null, legSw = 0, bob = 0;
      if (u < 2.1) {
        kx = E.lerp(900, 640, walkIn); flip = true;
        if (u < 1.2) { legSw = E.wave(u, 2.2) * 20; bob = -Math.abs(E.wave(u, 2.2)) * 8; }
        if (u > 1.1) {
          // 手伸到書上，把書拉出來
          const reachIn = E.easeOut(E.seg(u, 1.1, 1.4));
          const bx = bookSlot[0] + 13 + pull * 30, by = bookSlot[1] + 30 + pull * 8;
          reachR = [E.lerp(kx - 50, bx, reachIn), E.lerp(720, by, reachIn)];
          if (u > 1.4) { book = [bx, by]; }
        }
      } else {
        kx = E.lerp(640, 1000, walkOut); flip = false;
        legSw = u < 3.4 ? E.wave(u, 2.2) * 20 : 0; bob = u < 3.4 ? -Math.abs(E.wave(u, 2.2)) * 8 : 0;
        itemR = closedBook;
      }
      let y = 790;
      if (hopK > 0) { kx = E.lerp(1000, bbx, hopK); y = 790 - Math.sin(hopK * Math.PI) * 70; }
      drawPerson(ctx, 'kid', kx, y, S, {
        t: u, flip, bob, legL: legSw, legR: -legSw,
        eyes: u > 1.0 && u < 2.1 ? 'happy' : 'open', mouth: u > 1.4 ? 'open' : 'smile',
        reachR, itemR, armR: 12, armL: 12, armFrontR: !!reachR,
      });
      if (book) {
        // 書拿在手上（正面朝外，慢慢轉正）
        ctx.save(); ctx.translate(book[0], book[1]); ctx.scale(E.lerp(.8, 1.1, pull), E.lerp(1, 1.1, pull));
        ctx.fillStyle = '#7e57c2'; rr(ctx, -16, -30, 32, 60, 4); ctx.fill(); star(ctx, 2, 0, 9, '#ffd54f'); ctx.restore();
        school_hand(ctx, 'kid', book[0], book[1] + 10, S);
      }
    } else {
      // 坐在懶骨頭上，打開的書放在腿上，雙手扶著書邊
      const land = E.seg(u, 3.65, 3.9);
      const seat = 719 - (1 - land) * Math.sin(Math.max(hopK, .5) * Math.PI) * 70 + (u > 3.9 && u < 4.1 ? Math.sin(E.seg(u, 3.9, 4.1) * Math.PI) * 8 : 0);
      const reading = E.seg(u, 4.0, 4.3);
      const bx = bbx, by = seat - 52;
      const hL = [bx - 54, by + 4], hR = [bx + 54, by + 4];
      drawPerson(ctx, 'kid', bbx, seat, S, {
        t: u, sit: true, swing: 1, tilt: u > 4.3 ? 6 : 0,
        eyes: u > 5.4 ? 'happy' : 'open', mouth: u > 4.3 ? (u > 5.4 ? 'open' : 'o') : 'smile',
        reachL: hL, reachR: hR,
      });
      if (reading > 0) {
        ctx.save(); ctx.translate(bx, by); ctx.scale(reading, 1); PROP.book(ctx, 0, 0, .5, 1, u > 4.3 ? u - 4.3 : 0, '#7e57c2'); ctx.restore();
      } else { ctx.fillStyle = '#7e57c2'; rr(ctx, bx - 30, by - 36, 60, 72, 6); ctx.fill(); star(ctx, bx, by, 14, '#ffd54f'); }
      school_hand(ctx, 'kid', hL[0], hL[1], S); school_hand(ctx, 'kid', hR[0], hR[1], S);
      if (u > 4.2) {
        glow(ctx, bx, by + 10, 120, 'rgba(255,240,170,.6)', E.seg(u, 4.2, 4.8));
        // 故事從書裡飛出來：城堡、龍、火箭、魚、皇冠、星星
        const items = [
          c => { c.fillStyle = '#90caf9'; c.fillRect(-36, -20, 72, 50); c.fillRect(-46, -50, 22, 40); c.fillRect(24, -50, 22, 40); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(-48, -50); c.lineTo(-35, -72); c.lineTo(-22, -50); c.fill(); c.beginPath(); c.moveTo(22, -50); c.lineTo(35, -72); c.lineTo(48, -50); c.fill(); c.fillStyle = '#5d4037'; rr(c, -10, 4, 20, 26, 8); c.fill(); },
          c => { c.fillStyle = '#66bb6a'; c.beginPath(); c.ellipse(0, 0, 40, 22, 0, 0, Math.PI * 2); c.fill(); circle(c, 38, -22, 18, '#66bb6a'); circle(c, 44, -26, 4, '#212121'); c.fillStyle = '#a5d6a7'; c.beginPath(); c.moveTo(-10, -14); c.lineTo(-30, -50 - 10 * Math.sin(u * 8)); c.lineTo(8, -18); c.fill(); c.fillStyle = '#ff7043'; c.beginPath(); c.moveTo(56, -20); c.lineTo(80, -26 + 4 * Math.sin(u * 12)); c.lineTo(80, -12); c.fill(); c.strokeStyle = '#66bb6a'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(-38, 4); c.quadraticCurveTo(-64, 10, -70, -10); c.stroke(); },
          c => { c.rotate(.5); c.fillStyle = '#eceff1'; rr(c, -18, -44, 36, 76, 18); c.fill(); c.fillStyle = '#ab47bc'; c.beginPath(); c.moveTo(-18, -24); c.quadraticCurveTo(0, -70, 18, -24); c.fill(); circle(c, 0, -6, 9, '#4fc3f7'); c.fillStyle = '#ff9800'; c.beginPath(); c.moveTo(-10, 34); c.lineTo(0, 54 + 8 * Math.sin(u * 20)); c.lineTo(10, 34); c.fill(); },
          c => { c.fillStyle = '#4fc3f7'; c.beginPath(); c.ellipse(0, 0, 40, 22, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(34, 0); c.lineTo(60, -20); c.lineTo(60, 20); c.fill(); circle(c, -18, -6, 5, '#fff'); },
          c => { c.fillStyle = '#ffd54f'; c.beginPath(); c.moveTo(-40, 20); c.lineTo(-40, -20); c.lineTo(-20, 0); c.lineTo(0, -30); c.lineTo(20, 0); c.lineTo(40, -20); c.lineTo(40, 20); c.closePath(); c.fill(); circle(c, 0, 6, 7, '#e53935'); },
          c => star(c, 0, 0, 34, '#fff176'),
        ];
        for (let i = 0; i < 10; i++) {
          const st = 4.4 + i * .4; const k = E.seg(u, st, st + 3.0); if (k <= 0 || k >= 1) continue;
          const side = i % 2 ? 1 : -1, x = bx + side * (150 + 110 * E.rand(i + 40)) * E.easeOut(E.seg(k, 0, .3)), y = by - 6 - E.easeOut(E.seg(k, .22, 1)) * (230 + 80 * E.rand(i + 60)) + Math.sin(u * 3 + i) * 8;
          ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI); ctx.translate(x, y); ctx.rotate(Math.sin(u + i) * .25); ctx.scale(.5 + .6 * k, .5 + .6 * k); items[i % items.length](ctx); ctx.restore();
        }
        FX.sparkles(ctx, u, bx, by - 160, 320, 12, 23);
      }
    }
    if (u > 5.4) FX.floatHearts(ctx, u, 1060, 470, 5, 300, 19, 5.4);
  },
};

// ---------- 5. I can eat lunch with my friends：三人坐長椅一起吃便當、聊天大笑 ----------
SCENES.school_5 = {
  dur: 9, sfx: [[0.3, 'pop'], [1.0, 'yum'], [2.0, 'pop'], [2.6, 'boing'], [3.6, 'yum'], [4.6, 'pop'], [5.4, 'sparkle'], [5.8, 'boing'], [6.4, 'yum'], [7.0, 'chime']],
  draw(ctx, u) {
    school_room(ctx, u, '#fffde7', '#fff6c4', '#bcaaa4');
    BG.window(ctx, 250, 320, 230, 190, u);
    BG.window(ctx, 1120, 320, 230, 190, u);
    // 牆上的食物海報（只有圖）
    ctx.fillStyle = '#ffffff'; rr(ctx, 690, 330, 220, 170, 14); ctx.fill(); ctx.strokeStyle = '#ffb74d'; ctx.lineWidth = 6; ctx.stroke();
    circle(ctx, 750, 420, 34, '#e53935'); ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.ellipse(758, 382, 12, 6, -.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.ellipse(850, 420, 22, 44, .5, 0, Math.PI * 2); ctx.fill();
    BG.bunting(ctx, u);
    // 長椅（先畫）→ 三個人 → 桌面＋便當
    const seat = 722;
    ctx.fillStyle = '#8d6e63'; rr(ctx, 420, seat - 4, 760, 18, 6); ctx.fill(); ctx.fillStyle = '#6d4c41'; ctx.fillRect(450, seat + 12, 14, 790 - seat - 12); ctx.fillRect(1136, seat + 12, 14, 790 - seat - 12);
    const people = [
      { who: 'mia', x: 585, s: 1.0, ph: .45, tool: 'spoon', seed: 2.1 },
      { who: 'kid', x: 800, s: 1.05, ph: 0, tool: 'chop', seed: 0 },
      { who: 'leo', x: 1015, s: 1.0, ph: .75, tool: 'fork', seed: 1.3 },
    ];
    const laugh = (u > 2.6 && u < 3.5) || (u > 5.8 && u < 9);
    const talker = u > .4 && u < 2.4 ? 'mia' : (u > 4.4 && u < 5.8 ? 'leo' : null);
    const tools = {
      chop: c => { c.strokeStyle = '#6d4c41'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-4, -4); c.lineTo(-2, 48); c.moveTo(4, -4); c.lineTo(3, 48); c.stroke(); },
      spoon: c => { c.fillStyle = '#78909c'; rr(c, -4, -4, 8, 38, 4); c.fill(); c.beginPath(); c.ellipse(0, 40, 11, 8, 0, 0, Math.PI * 2); c.fill(); },
      fork: c => { c.fillStyle = '#78909c'; rr(c, -3, -4, 6, 34, 3); c.fill(); c.fillRect(-8, 30, 16, 5); for (let i = -1; i <= 1; i++) c.fillRect(-8 + (i + 1) * 6.5, 30, 3, 16); },
    };
    const foods = ['#ffffff', '#ffd54f', '#e57373'];
    const tips = [];
    people.forEach((pp, idx) => {
      const S = pp.s * PEOPLE[pp.who].h;
      const headY = seat - 173 * S, mouth = [pp.x, headY + 40 * S];
      const box = [pp.x + 18, 672];
      // 吃飯循環：便當夾菜 → 送到嘴邊 → 嚼 → 回到便當
      const per = 2.6, f = ((u / per) + pp.ph) % 1;
      let hand, eatK, chewing = false;
      const low = [box[0] + 22, 650], high = [pp.x + 46 * S, mouth[1] + 46 * S];
      if (laugh) { hand = [box[0] + 30, 664]; eatK = 0; }
      else if (f < .3) { hand = [low[0] - 6 * Math.sin(f / .3 * Math.PI), low[1] + 6 * Math.sin(f / .3 * Math.PI)]; eatK = 0; }
      else if (f < .5) { eatK = E.easeInOut((f - .3) / .2); hand = [E.lerp(low[0], high[0], eatK), E.lerp(low[1], high[1], eatK)]; }
      else if (f < .7) { eatK = 1; hand = high; chewing = f > .58; }
      else { eatK = 1 - E.easeInOut((f - .7) / .3); hand = [E.lerp(low[0], high[0], eatK), E.lerp(low[1], high[1], eatK)]; chewing = true; }
      const target = eatK > .02 ? [E.lerp(box[0] + 4, mouth[0] + 10 * S, eatK), E.lerp(box[1] + 6, mouth[1] + 2, eatK)] : [box[0] + 4, box[1] + 4];
      const ang = school_angTo(hand[0], hand[1], target[0], target[1]);
      const talking = talker === pp.who;
      const bob = laugh ? -Math.abs(E.wave(u, 2.2, idx * .3)) * 10 : 0;
      drawPerson(ctx, pp.who, pp.x, seat, pp.s, {
        t: u, sit: true, swing: .6, blinkSeed: pp.seed, bob,
        eyes: laugh ? 'happy' : 'open',
        mouth: laugh ? 'open' : (talking ? 'talk' : (chewing ? 'chew' : 'smile')),
        tilt: laugh ? (idx - 1) * 6 : (talking ? 5 : 0),
        reachR: [hand[0], hand[1] + bob], itemR: tools[pp.tool], itemAngR: ang,
        reachL: [box[0] - 44, 668 + bob * .2],
      });
      // 夾著的食物：一路從便當到嘴邊，到嘴邊就吃掉
      if (!laugh && f >= .3 && f < .62) {
        const L = (pp.tool === 'spoon' ? 40 : 46) * S, a = ang * Math.PI / 180;
        tips.push([hand[0] + Math.sin(a) * L, hand[1] + bob + Math.cos(a) * L, foods[idx]]);
      }
    });
    tips.forEach(([x, y, c]) => circle(ctx, x, y, 10, c, 'rgba(0,0,0,.25)', 3));
    // 桌面（蓋住腿上半）＋便當＋牛奶
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(430, 690, 18, 100); ctx.fillRect(1152, 690, 18, 100);
    const tg = ctx.createLinearGradient(0, 676, 0, 704); tg.addColorStop(0, '#ffcc80'); tg.addColorStop(1, '#e0a96d');
    ctx.fillStyle = tg; rr(ctx, 400, 676, 800, 28, 10); ctx.fill();
    const ag = ctx.createLinearGradient(0, 700, 0, 742); ag.addColorStop(0, '#c68b59'); ag.addColorStop(1, '#a1714a'); ctx.fillStyle = ag; rr(ctx, 414, 698, 772, 44, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(430, 712); ctx.lineTo(1170, 712); ctx.stroke();
    people.forEach((pp, idx) => {
      const bx = pp.x + 18;
      ctx.fillStyle = ['#f06292', '#42a5f5', '#66bb6a'][idx]; rr(ctx, bx - 46, 654, 92, 26, 8); ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(ctx, bx - 40, 650, 48, 14, 6); ctx.fill();
      circle(ctx, bx + 18, 656, 8, '#ffd54f'); circle(ctx, bx + 32, 656, 7, '#81c784'); circle(ctx, bx + 4, 652, 5, '#e57373');
      // 牛奶盒放在另一邊
      const mx = pp.x - 70; ctx.fillStyle = '#ffffff'; rr(ctx, mx - 12, 640, 24, 38, 3); ctx.fill(); ctx.fillStyle = '#64b5f6'; ctx.fillRect(mx - 12, 656, 24, 12);
      ctx.fillStyle = '#e3f2fd'; ctx.beginPath(); ctx.moveTo(mx - 12, 640); ctx.lineTo(mx, 630); ctx.lineTo(mx + 12, 640); ctx.fill();
    });
    // 左手扶著便當：補畫手掌在便當邊
    people.forEach(pp => { const S = pp.s * PEOPLE[pp.who].h; const bob = laugh ? -Math.abs(E.wave(u, 2.2, people.indexOf(pp) * .3)) * 10 : 0; school_hand(ctx, pp.who, pp.x + 18 - 44, 668 + bob * .2, S); });
    // 聊天泡泡（圖示）：Mia 說小狗的趣事、Leo 講足球
    const b1 = E.pop(u, .4, .4) * (1 - E.seg(u, 2.3, 2.6));
    if (b1 > 0) {
      ctx.save(); ctx.translate(430, 400); ctx.scale(-1, 1); PROP.speech(ctx, 0, 0, 150, 110, b1); ctx.restore();
      ctx.save(); ctx.translate(430, 400); ctx.scale(b1 * .55, b1 * .55); drawDog(ctx, -10, 70, .9, { t: u, wag: 1, tongue: true, eyes: 'happy' }); ctx.restore();
    }
    const b2 = E.pop(u, 4.4, .4) * (1 - E.seg(u, 5.7, 6.0));
    if (b2 > 0) {
      PROP.speech(ctx, 1180, 400, 150, 110, b2);
      ctx.save(); ctx.translate(1180, 400); ctx.scale(b2, b2); ctx.rotate(u * 3);
      circle(ctx, 0, 0, 34, '#ffffff', '#212121', 4); star(ctx, 0, 0, 14, '#212121'); ctx.restore();
    }
    if (laugh) {
      // 笑聲線條＋愛心
      people.forEach((pp, idx) => {
        const S = pp.s * PEOPLE[pp.who].h, hy = seat - 173 * S;
        ctx.save(); ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = .6 + .4 * Math.sin(u * 10 + idx);
        [-1, 1].forEach(sd => { for (let j = 0; j < 3; j++) { const a = (-.5 + j * .5) + (sd < 0 ? Math.PI : 0); const r0 = 100 * S, r1 = 122 * S; ctx.beginPath(); ctx.moveTo(pp.x + Math.cos(a) * r0, hy + Math.sin(a) * r0); ctx.lineTo(pp.x + Math.cos(a) * r1, hy + Math.sin(a) * r1); ctx.stroke(); } });
        ctx.restore();
      });
    }
    if (u > 5.8) { FX.floatHearts(ctx, u, 800, 420, 10, 640, 27, 5.8); FX.sparkles(ctx, u, 800, 450, 420, 14, 29); FX.burst(ctx, u, 800, 400, 6.9, 22, 13); }
  },
};
