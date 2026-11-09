// my family 的 5 句。u = 從 "because" 開始算的秒數。
// 家人：爸爸 dad、媽媽 mom、妹妹 sister，加上說話的孩子 kid（橘色上衣）。
// 原則：手一定碰到它在操作的東西（手搭肩、牽手、握座墊、扶盤子），手臂不擋臉，頭不重疊，坐姿小腿從座墊前緣垂下。
window.TARGETS = window.TARGETS || {};
window.SCENES = window.SCENES || {};

// ---------- 本檔專用小工具（family_ 前綴）----------
function family_heartPath(ctx, x, y, s) {
  const k = s / 40;
  ctx.beginPath(); ctx.moveTo(x, y + 14 * k);
  ctx.bezierCurveTo(x - 40 * k, y - 14 * k, x - 20 * k, y - 42 * k, x, y - 22 * k);
  ctx.bezierCurveTo(x + 20 * k, y - 42 * k, x + 40 * k, y - 14 * k, x, y + 14 * k);
  ctx.closePath();
}
// 重畫手掌（讓手蓋在道具上面）
function family_hand(ctx, who, x, y, s) { circle(ctx, x, y, 13 * s * PEOPLE[who].h, PEOPLE[who].skin); }
function family_mix(a, b, k) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// 椅子（正面）：seatY = 座墊上緣
function family_chair(ctx, x, seatY, S, color = '#8d5a3b') {
  ctx.fillStyle = '#5d3a22';
  ctx.fillRect(x - 52 * S, seatY, 12 * S, 790 - seatY); ctx.fillRect(x + 40 * S, seatY, 12 * S, 790 - seatY);
  ctx.fillStyle = color; rr(ctx, x - 62 * S, seatY - 170 * S, 124 * S, 170 * S, 22 * S); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, x - 48 * S, seatY - 156 * S, 96 * S, 36 * S, 14 * S); ctx.fill();
  ctx.fillStyle = '#a86d45'; rr(ctx, x - 66 * S, seatY - 6, 132 * S, 16, 8); ctx.fill();
}
// 腳踏車（側面，面向右）。bx = 座墊下方的位置；座墊上緣 y = 652
function family_bike(ctx, bx, rot, seatY = 652, bbY = 738) {
  const wy = 735, R = 55, rear = [bx - 60, wy], front = [bx + 125, wy], BB = [bx + 15, bbY];
  const st = [bx - 4, seatY + 12], ht = [bx + 104, 640], hb = [bx + 112, 670];
  [rear, front].forEach(([wx]) => {
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(wx, wy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, wy, R - 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(207,216,220,.9)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * (R - 7), wy + Math.sin(a) * (R - 7)); ctx.stroke(); }
    circle(ctx, wx, wy, 7, '#90a4ae');
  });
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 10; ctx.beginPath();
  ctx.moveTo(...rear); ctx.lineTo(...BB); ctx.lineTo(...st); ctx.lineTo(...rear);
  ctx.moveTo(...st); ctx.lineTo(...ht); ctx.moveTo(...BB); ctx.lineTo(...hb); ctx.stroke();
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(...ht); ctx.lineTo(...hb); ctx.stroke();
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(...hb); ctx.lineTo(...front); ctx.stroke();
  // 龍頭＋把手
  ctx.strokeStyle = '#78909c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(...ht); ctx.lineTo(bx + 100, 606); ctx.stroke();
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bx + 24, 603); ctx.lineTo(bx + 108, 603); ctx.stroke();
  ctx.strokeStyle = '#37474f'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(bx + 22, 603); ctx.lineTo(bx + 42, 603); ctx.moveTo(bx + 92, 603); ctx.lineTo(bx + 112, 603); ctx.stroke();
  // 座墊（後端翹出去讓爸爸扶）
  ctx.strokeStyle = '#78909c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(...st); ctx.lineTo(bx - 4, seatY); ctx.stroke();
  ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.ellipse(bx - 8, seatY, 46, 11, 0, 0, Math.PI * 2); ctx.fill();
  // 踏板
  const pa = rot * .8;
  ctx.strokeStyle = '#455a64'; ctx.lineWidth = 6;
  [0, Math.PI].forEach(o => { const px = BB[0] + Math.cos(pa + o) * 24, py = BB[1] + Math.sin(pa + o) * 24; ctx.beginPath(); ctx.moveTo(...BB); ctx.lineTo(px, py); ctx.stroke(); ctx.fillStyle = '#212121'; rr(ctx, px - 12, py - 4, 24, 8, 3); ctx.fill(); });
  circle(ctx, BB[0], BB[1], 12, '#90a4ae');
}
// 樹：season 0 春 1 夏 2 秋 3 冬（可為小數，用來漸變）
function family_tree(ctx, x, y, s, wts, t, seed) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-8, -150); ctx.lineTo(8, -150); ctx.lineTo(14, 0); ctx.fill();
  const crowns = [['#f8bbd0', '#f06292'], ['#43a047', '#66bb6a'], ['#ef6c00', '#ffb300'], ['#eceff1', '#ffffff']];
  wts.forEach((w, si) => {
    if (w <= 0) return;
    ctx.save(); ctx.globalAlpha = w;
    if (si === 3) { // 冬天：光禿禿的枝＋積雪
      ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      [[-1, -120, -60, -200], [1, -110, 60, -190], [0, -150, 0, -230], [-1, -170, -40, -230], [1, -160, 40, -225]].forEach(([, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
      [[-60, -200], [60, -190], [0, -230], [-40, -230], [40, -225]].forEach(([a, b]) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(a, b - 4, 18, 8, 0, 0, Math.PI * 2); ctx.fill(); });
    } else {
      const [c1, c2] = crowns[si];
      [[0, -210, 80], [-60, -170, 60], [60, -170, 60], [-30, -240, 55], [35, -235, 55]].forEach(([a, b, r]) => circle(ctx, a, b, r, c1));
      for (let i = 0; i < 14; i++) circle(ctx, (E.rand(seed + i) - .5) * 160, -240 + E.rand(seed + i + 20) * 110, si === 0 ? 11 : 9, c2);
      if (si === 2) for (let i = 0; i < 5; i++) circle(ctx, (E.rand(seed + i + 40) - .5) * 140, -200 + E.rand(seed + i + 60) * 80, 7, '#d84315');
    }
    ctx.restore();
  });
  ctx.restore();
}
// 拍立得相機（鏡頭朝左），放在桌面 y 上
function family_camera(ctx, x, y, t, blink, flash) {
  ctx.fillStyle = '#37474f'; rr(ctx, x - 44, y - 54, 88, 54, 10); ctx.fill();
  ctx.fillStyle = '#eceff1'; rr(ctx, x - 44, y - 54, 88, 14, 6); ctx.fill();
  ctx.fillStyle = '#90a4ae'; rr(ctx, x - 62, y - 42, 22, 32, 6); ctx.fill();
  circle(ctx, x - 64, y - 26, 16, '#263238', '#b0bec5', 4); circle(ctx, x - 68, y - 30, 5, 'rgba(255,255,255,.7)');
  ctx.fillStyle = '#ff7043'; rr(ctx, x - 22, y - 62, 18, 10, 4); ctx.fill();   // 快門鈕（頂端）
  circle(ctx, x + 26, y - 26, 7, blink ? '#ff1744' : '#5d1f1f');                // 倒數燈
  if (blink) glow(ctx, x + 26, y - 26, 30, 'rgba(255,60,60,.9)');
  if (flash > 0) { glow(ctx, x - 64, y - 26, 260 * flash, 'rgba(255,255,255,1)', flash); }
}
// 烤火雞
function family_turkey(ctx, x, y) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, 78, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 66, 11, 0, 0, Math.PI * 2); ctx.stroke();
  const g = ctx.createRadialGradient(x - 14, y - 46, 6, x, y - 30, 60); g.addColorStop(0, '#ffcc80'); g.addColorStop(1, '#c7742a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 30, 56, 36, 0, 0, Math.PI * 2); ctx.fill();
  [-1, 1].forEach(sd => { ctx.fillStyle = '#d98a3c'; ctx.beginPath(); ctx.ellipse(x + sd * 50, y - 46, 14, 22, sd * .7, 0, Math.PI * 2); ctx.fill(); circle(ctx, x + sd * 62, y - 64, 8, '#fff8e1'); });
  circle(ctx, x - 70, y - 4, 7, '#8bc34a'); circle(ctx, x + 70, y - 4, 7, '#e53935'); circle(ctx, x + 58, y + 4, 6, '#8bc34a');
}
function family_pie(ctx, x, y) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, 52, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0a052'; ctx.beginPath(); ctx.ellipse(x, y - 8, 44, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.ellipse(x, y - 11, 36, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffde7'; ctx.beginPath(); ctx.ellipse(x - 6, y - 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
}
// 飯碗：y = 碗底（桌面）
function family_bowl(ctx, x, y, r, color = '#4fc3f7') {
  circle(ctx, x, y - r * .62, r * .62, '#ffffff');                       // 白飯
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - r, y - r * .62); ctx.quadraticCurveTo(x - r, y, x - r * .4, y); ctx.lineTo(x + r * .4, y); ctx.quadraticCurveTo(x + r, y, x + r, y - r * .62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - r * .8, y - r * .5, r * 1.6, 3);
}
// 菜盤（媽媽傳給孩子）
function family_dish(ctx, x, y) {
  ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(x, y, 44, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ff8a65'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 36, 8, 0, 0, Math.PI * 2); ctx.stroke();
  [[-18, -8, '#66bb6a'], [-4, -12, '#ffd54f'], [12, -9, '#66bb6a'], [24, -6, '#ef5350'], [4, -4, '#ffd54f']].forEach(([a, b, c]) => circle(ctx, x + a, y + b, 9, c));
}
// 雨雲
function family_cloud(ctx, x, y, s, t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#64b5f6'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const k = (t * 1.6 + i * .37) % 1; const dx = -48 + i * 24; ctx.globalAlpha = a * (1 - k); ctx.beginPath(); ctx.moveTo(dx, 18 + k * 50); ctx.lineTo(dx - 3, 30 + k * 50); ctx.stroke(); }
  ctx.globalAlpha = a;
  ctx.fillStyle = '#90a4ae'; [[-40, 0, 30], [0, -16, 38], [40, 0, 30], [0, 6, 30]].forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}
function family_confetti(ctx, t, start, n = 60) {
  if (t < start) return;
  const cols = ['#ffd23f', '#ff6b6b', '#4ecdc4', '#a78bfa', '#ff9f1c', '#66bb6a', '#ff7aa8'];
  for (let i = 0; i < n; i++) {
    const tt = t - start - E.rand(i + 300) * .8; if (tt < 0) continue;
    const x = 200 + E.rand(i + 100) * 1200 + Math.sin(tt * 2 + i) * 30;
    const y = 280 + (tt * (150 + 120 * E.rand(i + 200))) % 540;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tt * 4 + i); ctx.scale(1, Math.cos(tt * 6 + i));
    ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-8, -5, 16, 10); ctx.restore();
  }
}

// ---------- 第一步：家人出場（爸爸、妹妹、媽媽站在一起）----------
TARGETS.family = {
  color: '#ff9f1c',
  draw(ctx, x, y, s, t, k) {
    const m = s * .74, sx = x + 30 * m, dx = sx - 170 * m, mx = sx + 170 * m;
    // 妹妹在中間（矮），爸媽一人一手搭在她肩上，另一手揮手
    drawPerson(ctx, 'sister', sx, y, m, { t, armL: 22 + 18 * Math.max(0, E.wave(t, 1.3, .3)), armR: 22 + 18 * Math.max(0, E.wave(t, 1.3, .8)), mouth: 'open', eyes: 'happy', blinkSeed: 2 });
    drawPerson(ctx, 'dad', dx, y, m, { t, reachR: [sx - 30 * m, y - 137 * m], armL: 20 + 30 * Math.max(0, E.wave(t, 1.2)) * k, mouth: 'smile', blinkSeed: .5 });
    drawPerson(ctx, 'mom', mx, y, m, { t, reachL: [sx + 30 * m, y - 137 * m], armR: 20 + 30 * Math.max(0, E.wave(t, 1.2, .5)) * k, mouth: 'smile', blinkSeed: 1 });
  },
};

// 1. they love me —— 家人把愛心送進孩子胸口 → 全家抱在一起，背後巨大愛心發光
SCENES.family_1 = {
  dur: 8.5, sfx: [[0.15, 'pop'], [0.7, 'whoosh'], [1.4, 'heart'], [1.2, 'whoosh'], [1.9, 'heart'], [1.7, 'whoosh'], [2.4, 'heart'], [2.7, 'whoosh'], [3.3, 'chime'], [3.4, 'heart'], [5.0, 'sparkle'], [6.5, 'heart']],
  draw(ctx, u) {
    BG.room(ctx, u, '#fff0e2', '#dfa36b', '#ffe3c8');
    // 牆上的全家福相框（只有小臉，沒有字）
    [[330, 360, '#ffb74d'], [1270, 360, '#4fc3f7']].forEach(([fx, fy, c], j) => {
      ctx.fillStyle = '#8d6e63'; rr(ctx, fx - 70, fy - 52, 140, 104, 10); ctx.fill(); ctx.fillStyle = c; ctx.fillRect(fx - 58, fy - 40, 116, 80);
      [-36, -12, 12, 36].forEach((o, i) => { circle(ctx, fx + o, fy + (i % 2 ? 6 : -2), i % 3 ? 11 : 14, '#ffd9b8'); ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(fx + o, fy + (i % 2 ? 2 : -6), i % 3 ? 11 : 14, Math.PI, Math.PI * 2); ctx.fill(); });
    });
    const hug = E.easeInOut(E.seg(u, 2.5, 3.3)), arms = u > 3.25;
    const X = { dad: E.lerp(400, 520, hug), kid: 710, sister: E.lerp(960, 880, hug), mom: E.lerp(1180, 1050, hug) };
    const b = arms ? -Math.abs(E.wave(u, .9)) * 8 : 0;   // 抱緊時一起輕輕彈
    // 巨大愛心＋愛心形光芒（在人物後面）
    const hs = E.pop(u, 3.3, .7);
    if (hs > 0) {
      FX.rays(ctx, u, 790, 520, 760, 'rgba(255,150,180,.2)', 18);
      glow(ctx, 790, 520, 520, 'rgba(255,170,200,.75)', hs);
      for (let i = 0; i < 3; i++) {   // 一圈圈往外擴散的愛心光環
        const k = ((u - 3.3) * .55 + i / 3) % 1;
        ctx.save(); ctx.globalAlpha = (1 - k) * .8 * Math.min(1, hs); family_heartPath(ctx, 790, 660, 400 + k * 520); ctx.strokeStyle = '#fff3f7'; ctx.lineWidth = 10 * (1 - k) + 2; ctx.stroke(); ctx.restore();
      }
      const pul = 1 + .04 * E.wave(u, 1.2);
      heart(ctx, 790, 660, 430 * hs * pul, '#ff6f9c');
      heart(ctx, 790, 660, 365 * hs * pul, '#ff9ec0');
    }
    // 送愛心：爸爸、妹妹、媽媽先把愛心捧在胸前，再拋給孩子
    const send = [['dad', .6, 625, 56], ['sister', 1.1, 689, 44], ['mom', 1.6, 635, 56]];
    const kidChest = [X.kid, 659];
    const holding = {}, flying = [];
    let got = 0;
    send.forEach(([who, t0, cy, hsz]) => {
      const px = X[who];
      if (u < t0) holding[who] = { x: px, y: cy, s: hsz * E.pop(u, .05, .4) };
      else if (u < t0 + .8) { const k = E.easeInOut(E.seg(u, t0, t0 + .8)); flying.push([E.lerp(px, kidChest[0], k), E.lerp(cy, kidChest[1], k) - Math.sin(k * Math.PI) * 170, hsz * (1 - .3 * k)]); }
      else got++;
    });
    const sP = { dad: 1.47, mom: 1.386, sister: .903, kid: 1.05 };
    const holdArms = who => {
      const h = holding[who]; if (!h) return null;
      const off = (who === 'sister' ? 28 : 36);
      return { reachL: [h.x - off, h.y + 4], reachR: [h.x + off, h.y + 4] };
    };
    const after = (who, t0) => u >= t0 && !arms ? { armL: 35 * (1 - E.seg(u, t0 + .3, t0 + .9)) + 10, armR: 35 * (1 - E.seg(u, t0 + .3, t0 + .9)) + 10 } : {};
    const happy = arms || u > 2.4;
    if (!arms) {
      // 妹妹（先畫，媽媽的手要蓋在她肩上）
      drawPerson(ctx, 'sister', X.sister, 790, 1.05, Object.assign({ t: u, bob: b, eyes: happy ? 'happy' : 'open', mouth: happy ? 'open' : 'smile', blinkSeed: 2, tilt: arms ? 6 : 0 },
        after('sister', 1.1), holdArms('sister') || {}, arms ? { reachL: [X.kid + 90, 690 + b], armR: 140 + 10 * E.wave(u, 1.2) } : {}));
      // 孩子
      drawPerson(ctx, 'kid', X.kid, 790, 1.05, {
        t: u, bob: b, eyes: got > 0 ? 'happy' : 'open', mouth: got > 0 ? 'open' : (flying.length ? 'o' : 'smile'), tilt: arms ? -6 : 0,
        reachL: arms ? [590, 660 + b] : null, reachR: arms ? [X.kid + 90, 690 + b] : null, armL: 10, armR: 10,
      });
      // 爸爸、媽媽
      drawPerson(ctx, 'dad', X.dad, 790, 1.05, Object.assign({ t: u, bob: b, eyes: happy ? 'happy' : 'open', mouth: 'smile', blinkSeed: .5, tilt: arms ? 6 : 0 },
        after('dad', .6), holdArms('dad') || {}, arms ? { reachR: [672, 624 + b], armL: 140 + 10 * E.wave(u, 1.2, .5) } : {}));
      drawPerson(ctx, 'mom', X.mom, 790, 1.05, Object.assign({ t: u, bob: b, eyes: happy ? 'happy' : 'open', mouth: 'smile', blinkSeed: 1, tilt: arms ? -6 : 0 },
        after('mom', 1.6), holdArms('mom') || {}, arms ? { reachL: [X.sister + 32, 646 + b], armR: 140 + 10 * E.wave(u, 1.2, .2) } : {}));
    } else {
      // 全家面對面擁抱（側面）：孩子和媽媽面對面抱；爸爸從孩子背後抱住孩子，妹妹從媽媽背後抱住媽媽
      const dS = 1.05 * PEOPLE.dad.h, sS = 1.05 * PEOPLE.sister.h, mS = 1.05 * PEOPLE.mom.h;
      const mx = 905, sw = 3 * E.wave(u, .5);
      const kx = mx - (30 * mS + 80 * .95), dx = kx - 150, sx = mx + 160;
      drawSide(ctx, 'dad', dx, 790, 1.05, { t: u, lean: 6 + sw, tilt: 8, eyes: 'happy', mouth: 'smile', skip: 'nearArm', farArm: 50 });
      drawSide(ctx, 'sister', sx, 790, 1.05, { t: u, flip: true, lean: 6 + sw, tilt: -4, eyes: 'happy', mouth: 'open', skip: 'nearArm', farArm: 50 });
      drawHugPair(ctx, u, 'mom', mx, 1.05, .95, { pat: true });
      // 爸爸的手從孩子背後環到孩子胸前（在下巴下方），妹妹的手環過媽媽的腰
      const dSh = sideShoulder('dad', dx, 790, 1.05, { lean: 6 + sw }), sSh = sideShoulder('sister', sx, 790, 1.05, { flip: true, lean: 6 + sw });
      drawWrapArm(ctx, dSh[0], dSh[1], kx + 30 * .95 + 4, 700, PEOPLE.dad.shirt, PEOPLE.dad.skin, 26, 45);
      circle(ctx, dSh[0], dSh[1], 17, PEOPLE.dad.shirt);
      drawWrapArm(ctx, sSh[0], sSh[1], mx - 30 * mS - 4, 712, PEOPLE.sister.shirt, PEOPLE.sister.skin, 18, 14);
      circle(ctx, sSh[0], sSh[1], 12, PEOPLE.sister.shirt);
    }
    // 捧在手上的愛心（手掌蓋在愛心兩側）
    Object.entries(holding).forEach(([who, h]) => {
      if (h.s <= 0) return;
      heart(ctx, h.x, h.y + 14, h.s, '#ff5d8f', '#fff');
      const off = who === 'sister' ? 28 : 36;
      family_hand(ctx, who, h.x - off, h.y + 4, 1.05); family_hand(ctx, who, h.x + off, h.y + 4, 1.05);
    });
    flying.forEach(([x, y, s]) => { glow(ctx, x, y, 70, 'rgba(255,200,220,.9)'); heart(ctx, x, y + 10, s, '#ff5d8f', '#fff'); });
    // 孩子胸口的愛心：收到越多越大、越亮
    if (got > 0) {
      const sz = 30 + got * 12 + (arms ? 6 * E.wave(u, 1.4) : 0);
      const hp = arms ? [800, 330] : [kidChest[0], kidChest[1] + b];
      glow(ctx, hp[0], hp[1], 60 + got * 30, 'rgba(255,230,120,.9)');
      heart(ctx, hp[0], hp[1] + 12, sz, '#ff3d7f', '#fff');
    }
    if (arms) { FX.floatHearts(ctx, u, 790, 380, 10, 700, 9, 3.4); FX.sparkles(ctx, u, 790, 470, 470, 16, 2); FX.burst(ctx, u, 790, 470, 3.35, 22); }
  },
};

// 2. they help me —— 學騎腳踏車：爸爸扶著座墊跑，媽媽和妹妹在前面加油；爸爸放手，孩子自己騎出去
SCENES.family_2 = {
  dur: 8.5, sfx: [[0.2, 'whoosh'], [1.6, 'boing'], [3.0, 'whoosh'], [3.6, 'chime'], [4.6, 'pop'], [5.2, 'sparkle'], [6.0, 'ding']],
  draw(ctx, u) {
    BG.sky(ctx, u, '#8fd3ff', '#eafaff');
    circle(ctx, 330, 380, 46, '#ffe066'); glow(ctx, 330, 380, 160, 'rgba(255,240,150,.7)');
    for (let i = 0; i < 3; i++) { const cx = 300 + ((u * 18 + i * 520) % 1500) - 100, cy = 330 + i * 30; circle(ctx, cx, cy, 24, '#fff'); circle(ctx, cx + 28, cy - 10, 30, '#fff'); circle(ctx, cx + 58, cy, 22, '#fff'); }
    ctx.fillStyle = '#a5d6a7'; ctx.beginPath(); ctx.ellipse(420, 720, 520, 120, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(1250, 720, 560, 140, 0, 0, Math.PI * 2); ctx.fill();
    const wts = [0, 1, 0, 0];
    family_tree(ctx, 250, 700, .85, wts, u, 3); family_tree(ctx, 980, 690, .7, wts, u, 9);
    const g = ctx.createLinearGradient(0, 690, 0, 900); g.addColorStop(0, '#9ccc65'); g.addColorStop(1, '#7cb342'); ctx.fillStyle = g; ctx.fillRect(0, 690, W, 400);
    ctx.fillStyle = '#e8d3a8'; ctx.fillRect(0, 752, W, 70); ctx.fillStyle = '#d7bd8a'; ctx.fillRect(0, 752, W, 6);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = '#cdb07a'; rr(ctx, (i * 150 + 40) % W, 785, 50, 6, 3); ctx.fill(); }
    // 媽媽、妹妹在遠一點的草地上加油（先拍手，成功後跳起來）
    const free = u >= 3, win = u > 3.4;
    [['mom', 1180, .8, 1.056], ['sister', 1312, .8, .69]].forEach(([who, px, s, S], i) => {
      const cy = 705 - 120 * S, clap = 8 + 8 * E.wave(u, 2.4, i * .3);
      const jump = win ? -Math.abs(E.wave(u, 1.6, i * .25)) * 22 : 0;
      drawPerson(ctx, who, px, 705, s, win
        ? { t: u, bob: jump, armL: 150 + 10 * E.wave(u, 1.6), armR: 150 - 10 * E.wave(u, 1.6), eyes: 'happy', mouth: 'open', blinkSeed: i }
        : { t: u, reachL: [px - clap, cy], reachR: [px + clap, cy], mouth: 'open', blinkSeed: i });
    });
    // 腳踏車位置：放手前慢慢前進，放手後自己騎出去
    const bx = u < 3 ? 540 + 43 * u : 669 + 250 * E.easeOut(E.seg(u, 3, 5.2));
    if (free && u < 5.6) {   // 速度線
      ctx.save(); ctx.globalAlpha = .7 * (1 - E.seg(u, 4.6, 5.6)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const yy = 600 + i * 40, x0 = bx - 140 - (i % 2) * 30; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - 90 - 30 * E.wave(u, 3, i * .2), yy); ctx.stroke(); }
      ctx.restore();
    }
    const SEAT = 652, BBY = 712, kS = 1.2;
    family_bike(ctx, bx, bx / 55, SEAT, BBY);
    // 孩子側面騎車：屁股坐在座墊上、雙手握把手、兩腳分別踩在兩邊踏板上，踏板轉、腳跟著轉
    const pa = (bx / 55) * .8, BB = [bx + 15, BBY];
    const pedal = o => [BB[0] + Math.cos(pa + o) * 24, BB[1] + Math.sin(pa + o) * 24 - 4];
    drawSide(ctx, 'kid', bx - 6, SEAT, kS, {
      t: u, sit: true, lean: 4, eyes: free ? 'happy' : 'open', mouth: free ? 'open' : 'o',
      reachNear: [bx + 100, 605], reachFar: [bx + 96, 601], footNear: pedal(0), footFar: pedal(Math.PI),
    });
    ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.ellipse(bx - 48, SEAT + 2, 18, 9, 0, 0, Math.PI * 2); ctx.fill();   // 座墊後端（爸爸扶的地方）
    // 安全帽（側面，蓋在頭頂）
    const hx = bx - 6 + 6 * kS + Math.sin(4 * Math.PI / 180) * 165 * kS, hy = SEAT - 165 * kS;
    ctx.save(); ctx.fillStyle = '#29b6f6'; ctx.beginPath(); ctx.arc(hx - 10, hy - 26, 90, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(hx - 20, hy - 114, 20, 88); ctx.fillStyle = '#0288d1'; rr(ctx, hx - 104, hy - 32, 200, 13, 6); ctx.fill(); ctx.restore();
    if (!free) for (let i = 0; i < 2; i++) { const k = (u * 1.3 + i * .5) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(bx - 100 - i * 14, 500 + k * 50, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // 爸爸：彎身扶著座墊後端一起跑 → 放手 → 舉手歡呼
    const dx = u < 3 ? bx - 187 : 669 - 187 + 40 * E.easeOut(E.seg(u, 3, 3.6));
    const run = u < 3, hold = u < 3, release = u >= 3 && u < 3.5;
    drawPerson(ctx, 'dad', dx, 790, 1.05, {
      t: u, blinkSeed: .5, legL: run ? 22 * E.wave(u, 1.6) : 0, legR: run ? -22 * E.wave(u, 1.6) : 0, bob: run ? -Math.abs(E.wave(u, 1.6)) * 8 : 0,
      reachR: hold ? [bx - 52, SEAT + 2] : (release ? [669 - 66 + 30, 660] : null), armR: 150, armL: u >= 3.5 ? 150 + 8 * E.wave(u, 1.5) : 12,
      mouth: u >= 3.5 ? 'open' : 'smile', eyes: u >= 3.5 ? 'happy' : 'open',
    });
    if (win) {
      FX.burst(ctx, u, bx + 20, 480, 4.6, 20); FX.sparkles(ctx, u, bx + 20, 500, 260, 12, 4);
      FX.floatHearts(ctx, u, 1240, 470, 6, 240, 5, 3.8); FX.floatHearts(ctx, u, dx, 400, 4, 160, 13, 4.2);
      glow(ctx, bx + 20, 520, 260, 'rgba(255,240,150,.5)', E.seg(u, 4.4, 5));
    }
  },
};

// 3. they eat dinner with me —— 晚上一家四口坐在餐桌旁一起吃飯，媽媽把菜傳給孩子
SCENES.family_3 = {
  dur: 8.5, sfx: [[0.3, 'sizzle'], [1.1, 'pop'], [2.2, 'ding'], [3.0, 'pop'], [3.8, 'yum'], [5.0, 'chime'], [5.6, 'yum'], [6.4, 'sparkle']],
  draw(ctx, u) {
    BG.room(ctx, u, '#ffe0b2', '#b9845a', '#ffd59a');
    ctx.fillStyle = 'rgba(80,40,10,.18)'; ctx.fillRect(0, 0, W, H);   // 晚上，室內稍暗
    BG.window(ctx, 1210, 330, 150, 120, u, 1);
    // 吊燈
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(800, 0); ctx.lineTo(800, 300); ctx.stroke();
    glow(ctx, 800, 360, 620, 'rgba(255,214,120,.55)', .9 + .1 * E.wave(u, .7));
    ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.moveTo(740, 340); ctx.lineTo(860, 340); ctx.lineTo(825, 296); ctx.lineTo(775, 296); ctx.closePath(); ctx.fill();
    circle(ctx, 800, 344, 14, '#fff8d6');
    // 座位：爸爸、妹妹、孩子、媽媽（小孩的椅子比較高）
    const P = [
      { who: 'dad', x: 470, seat: 700, S: 1.4, ph: 0 },
      { who: 'sister', x: 690, seat: 670, S: .86, ph: .45 },
      { who: 'kid', x: 900, seat: 680, S: 1.0, ph: .2 },
      { who: 'mom', x: 1130, seat: 700, S: 1.32, ph: .7 },
    ];
    P.forEach(p => family_chair(ctx, p.x, p.seat, Math.max(p.S, 1)));
    // 菜盤的位置：媽媽端起 → 傳到孩子手上 → 孩子放到桌上
    let D;
    if (u < 1.0) D = [1030, 642];
    else if (u < 1.5) { const k = E.easeInOut(E.seg(u, 1.0, 1.5)); D = [1030, E.lerp(642, 612, k)]; }
    else if (u < 2.4) { const k = E.easeInOut(E.seg(u, 1.5, 2.4)); D = [E.lerp(1030, 995, k), 612]; }
    else if (u < 3.0) { const k = E.easeInOut(E.seg(u, 2.4, 3.0)); D = [E.lerp(995, 962, k), E.lerp(612, 642, k)]; }
    else D = [962, 642];
    const momHolds = u >= 1.0 && u < 2.4, kidHolds = u >= 2.1 && u < 3.05;
    const L = 44;
    const eat = (p, k) => {   // k 0 = 筷子在碗裡，1 = 送到嘴邊
      const bx = p.x - 8 * p.S, tipB = [bx, 652 - 14 * p.S], tipM = [p.x, p.seat - 127 * p.S];
      const a = E.lerp(-35, -150, k), tip = [E.lerp(tipB[0], tipM[0], k), E.lerp(tipB[1], tipM[1], k) - Math.sin(k * Math.PI) * 6 * p.S];
      const r = a * Math.PI / 180;
      return { hand: [tip[0] - L * p.S * Math.sin(r), tip[1] - L * p.S * Math.cos(r)], ang: a, k };
    };
    const chop = full => c => { c.strokeStyle = '#8d6e63'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-4, -4); c.lineTo(-2, L); c.moveTo(4, -4); c.lineTo(2, L); c.stroke(); if (full) { circle(c, 0, L, 7, '#fffde7'); } };
    const bowlL = p => [p.x - 8 * p.S - 26 * p.S, 640];
    const handsOnTop = [];
    P.forEach(p => {
      let o = { t: u, sit: true, blinkSeed: p.ph * 3, eyes: 'open', mouth: 'smile' };
      const cyc = (u * .55 + p.ph) % 1, k = E.easeInOut(E.clamp(cyc < .5 ? cyc * 2.4 : (1 - cyc) * 2.4));
      const eating = p.who === 'kid' ? u > 3.3 : (p.who === 'mom' ? u > 2.7 : true);
      if (eating) {
        const ke = p.who === 'kid' ? E.easeInOut(E.clamp((u - 3.3) * .55 % 1 < .5 ? ((u - 3.3) * .55 % 1) * 2.4 : (1 - (u - 3.3) * .55 % 1) * 2.4)) : k;
        const e = eat(p, ke);
        o.reachR = e.hand; o.itemR = chop(ke > .3); o.itemAngR = e.ang; o.armFrontR = true;
        if (ke > .75) o.mouth = 'chew'; else if (ke > .5) o.mouth = 'open';
      } else if (p.who === 'mom') {
        o.reachR = [p.x + 30 * p.S, 636]; o.itemR = chop(false); o.itemAngR = -60;   // 筷子先放在碗邊
      }
      // 左手扶碗
      o.reachL = bowlL(p); handsOnTop.push([p.who, ...bowlL(p)]);
      if (p.who === 'mom' && momHolds) { o.reachL = [D[0] + 36, D[1] - 4]; handsOnTop.pop(); handsOnTop.push(['mom', D[0] + 36, D[1] - 4]); }
      if (p.who === 'kid') {
        if (kidHolds) { o.reachR = [D[0] - 36, D[1] - 4]; o.itemR = null; handsOnTop.push(['kid', D[0] - 36, D[1] - 4]); }
        else if (u < 3.3) { o.reachR = u < 2.1 ? null : [p.x + 30, 640]; o.armR = 12; o.itemR = null; }
        o.eyes = u < 3.3 ? 'happy' : 'open';
        if (u < 2.1) o.mouth = 'o';
      }
      if (u > 4.6) o.eyes = 'happy';
      drawPerson(ctx, p.who, p.x, p.seat, 1.0, o);
    });
    // 桌子（在人物前面，遮住腿）
    ctx.fillStyle = '#7b4a2a'; ctx.fillRect(340, 760, 24, 40); ctx.fillRect(1236, 760, 24, 40);
    const tg = ctx.createLinearGradient(0, 650, 0, 770); tg.addColorStop(0, '#ff8f3d'); tg.addColorStop(1, '#d9591b');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(320, 656);
    ctx.lineTo(1280, 656); ctx.lineTo(1280, 760);
    for (let i = 0; i <= 16; i++) { const xx = 1280 - i * 60; ctx.quadraticCurveTo(xx - 30, 784, xx - 60, 760); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 16; i++) circle(ctx, 350 + i * 60, 712, 6, 'rgba(255,240,200,.35)');
    ctx.fillStyle = '#ffe0b2'; rr(ctx, 310, 644, 980, 16, 8); ctx.fill();
    // 桌上的菜
    family_pie(ctx, 580, 650);
    family_turkey(ctx, 795, 650);
    FX.steam(ctx, u, 795, 600, 2, 'rgba(255,255,255,.7)', 70);
    if (u < 3.0) { /* 孩子的筷子先放在桌上 */ }
    P.forEach((p, i) => {
      family_bowl(ctx, p.x - 8 * p.S, 652, 26 * p.S, ['#4fc3f7', '#f48fb1', '#ffb74d', '#81c784'][i]);
    });
    if (u < 3.3) { ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(918, 650); ctx.lineTo(968, 646); ctx.moveTo(918, 655); ctx.lineTo(968, 652); ctx.stroke(); }
    family_dish(ctx, D[0], D[1]);
    if (u > 3) FX.steam(ctx, u, D[0], D[1] - 14, 1, 'rgba(255,255,255,.6)', 40);
    handsOnTop.forEach(([who, x, y]) => family_hand(ctx, who, x, y, 1.0));
    if (u > 2.2 && u < 3.4) { ctx.save(); ctx.globalAlpha = Math.sin(E.seg(u, 2.2, 3.4) * Math.PI); heart(ctx, 1000, 560, 44, '#ff5d8f', '#fff'); ctx.restore(); }
    if (u > 4.6) { FX.floatHearts(ctx, u, 800, 450, 9, 800, 21, 4.6); FX.sparkles(ctx, u, 800, 470, 480, 14, 3); }
  },
};

// 4. they are always with me —— 一家人手牽手一直走，春夏秋冬一直換，家人始終在孩子身邊
SCENES.family_4 = {
  dur: 8.5, sfx: [[0.2, 'chime'], [2.0, 'whoosh'], [2.2, 'sparkle'], [4.0, 'whoosh'], [4.2, 'sparkle'], [6.0, 'whoosh'], [6.2, 'sparkle'], [7.0, 'heart'], [7.2, 'chime']],
  draw(ctx, u) {
    // 季節權重：春 0–2、夏 2–4、秋 4–6、冬 6 之後；交界 0.5 秒漸變
    const tr = c => E.easeInOut(E.seg(u, c - .25, c + .25));
    const a1 = tr(2), a2 = tr(4), a3 = tr(6);
    const wts = [1 - a1, a1 - a2, a2 - a3, a3];
    const SK = [['#a7dcff', '#ffe4f0'], ['#4fb8ff', '#d9f5ff'], ['#ffb26b', '#ffe7c2'], ['#9fb4d8', '#eef3fb']];
    const GR = ['#9ccc65', '#66bb6a', '#d4a24c', '#f4f7fb'];
    const mixC = (arr) => { let c = arr[0]; for (let i = 1; i < 4; i++) c = family_mix(c, arr[i], [a1, a2, a3][i - 1]); return c; };
    BG.sky(ctx, u, mixC(SK.map(s => s[0])), mixC(SK.map(s => s[1])));
    // 太陽或月亮一天天劃過天空（時間一直過去）
    for (let i = 0; i < 4; i++) {
      const k = E.seg(u, i * 2.1, i * 2.1 + 2.1); if (k <= 0 || k >= 1) continue;
      const sx = E.lerp(250, 1350, k), sy = 470 - Math.sin(k * Math.PI) * 140;
      glow(ctx, sx, sy, 120, 'rgba(255,240,150,.8)'); circle(ctx, sx, sy, 40, i === 3 ? '#fffde7' : '#ffe066');
    }
    // 遠山＋往後捲動的樹（表示一直往前走）
    ctx.fillStyle = family_mix(mixC(GR), '#ffffff', .35); ctx.beginPath(); ctx.ellipse(500, 700, 620, 130, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(1250, 710, 560, 120, 0, 0, Math.PI * 2); ctx.fill();
    const scroll = u * 110;
    for (let i = 0; i < 6; i++) { const tx = ((i * 330 - scroll) % 1980 + 1980) % 1980 - 100; family_tree(ctx, tx, 690, .8, wts, u, i * 7); }
    ctx.fillStyle = mixC(GR); ctx.fillRect(0, 690, W, 400);
    ctx.fillStyle = family_mix('#e8d3a8', '#ffffff', a3 * .6); ctx.fillRect(0, 752, W, 70);
    for (let i = 0; i < 12; i++) { const px = ((i * 160 - scroll * 1.3) % 1920 + 1920) % 1920 - 160; ctx.fillStyle = 'rgba(0,0,0,.08)'; rr(ctx, px, 786, 60, 7, 3); ctx.fill(); }
    // 季節粒子：花瓣、蝴蝶、落葉、雪
    if (wts[0] > 0) for (let i = 0; i < 16; i++) { const k = (u * .18 + E.rand(i)) % 1; ctx.save(); ctx.globalAlpha = wts[0] * .9; ctx.translate(E.rand(i + 5) * W + Math.sin(u * 2 + i) * 30, 260 + k * 560); ctx.rotate(u * 2 + i); ctx.fillStyle = '#f8bbd0'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (wts[1] > 0) for (let i = 0; i < 4; i++) { const bx2 = 300 + i * 300 + Math.sin(u * 1.3 + i) * 60, by = 380 + Math.sin(u * 2 + i * 2) * 40, f = Math.abs(Math.sin(u * 12 + i)); ctx.save(); ctx.globalAlpha = wts[1]; ctx.fillStyle = ['#ffca28', '#ab47bc', '#29b6f6', '#ff7043'][i]; ctx.beginPath(); ctx.ellipse(bx2 - 9 * f, by, 10 * f + 2, 12, 0, 0, Math.PI * 2); ctx.ellipse(bx2 + 9 * f, by, 10 * f + 2, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (wts[2] > 0) { ctx.save(); ctx.globalAlpha = wts[2]; BG.leaves(ctx, u, 18, 3); ctx.restore(); }
    // 最後：一家人背後亮起一顆大愛心
    const fin = E.seg(u, 6.9, 7.5);
    if (fin > 0) { const hk = E.back(fin); glow(ctx, 800, 560, 560, 'rgba(255,190,210,.8)', fin); heart(ctx, 800, 650, 440 * hk * (1 + .03 * E.wave(u, 1.2)), 'rgba(255,111,156,.85)'); heart(ctx, 800, 650, 370 * hk * (1 + .03 * E.wave(u, 1.2)), 'rgba(255,170,200,.9)'); }
    // 一家人手牽手（孩子在中間）
    const walk = E.wave(u, 1.3), bob = -Math.abs(walk) * 6;
    const lg = { legL: 18 * walk, legR: -18 * walk };
    const M1 = [600, 665 + bob], M2 = [805, 665 + bob], M3 = [1035, 668 + bob];
    drawPerson(ctx, 'dad', 480, 790, 1.05, Object.assign({ t: u, bob, reachR: M1, armL: 12 + 10 * walk, eyes: u > 7.0 ? 'happy' : 'open', blinkSeed: .5 }, lg));
    drawPerson(ctx, 'kid', 700, 790, 1.05, Object.assign({ t: u, bob, reachL: M1, reachR: M2, eyes: u > 7.0 ? 'happy' : 'open', mouth: u > 7.0 ? 'open' : 'smile' }, { legL: -18 * walk, legR: 18 * walk }));
    drawPerson(ctx, 'mom', 920, 790, 1.05, Object.assign({ t: u, bob, reachL: M2, reachR: M3, eyes: u > 7.0 ? 'happy' : 'open', blinkSeed: 1 }, lg));
    drawPerson(ctx, 'sister', 1120, 790, 1.05, Object.assign({ t: u, bob, reachL: M3, armR: 12 - 10 * walk, eyes: u > 7.0 ? 'happy' : 'open', mouth: 'open', blinkSeed: 2 }, { legL: -18 * walk, legR: 18 * walk }));
    // 冬天戴上圍巾
    if (wts[3] > 0) {
      ctx.save(); ctx.globalAlpha = wts[3];
      [['dad', 480, 1.47, '#e53935'], ['kid', 700, 1.05, '#43a047'], ['mom', 920, 1.386, '#7e57c2'], ['sister', 1120, .903, '#ff7043']].forEach(([, x, S, c]) => {
        ctx.fillStyle = c; rr(ctx, x - 46 * S, 790 + bob - 172 * S, 92 * S, 22 * S, 10 * S); ctx.fill();
        rr(ctx, x + 14 * S, 790 + bob - 160 * S, 18 * S, 50 * S, 6 * S); ctx.fill();
      });
      ctx.restore();
      for (let i = 0; i < 40; i++) { const k = (u * .22 + E.rand(i + 70)) % 1; ctx.save(); ctx.globalAlpha = wts[3] * .9; circle(ctx, E.rand(i + 90) * W + Math.sin(u * 1.5 + i) * 20, 260 + k * 560, 4 + 4 * E.rand(i), '#ffffff'); ctx.restore(); }
    }
    // 牽著的手之間有一顆顆小光點一直傳遞（愛一直連著）
    const chain = [[480 + 59, 565], M1, [700, 640], M2, [920, 610], M3, [1120 - 30, 660]];
    for (let j = 0; j < 3; j++) {
      const k = ((u * .35 + j / 3) % 1) * (chain.length - 1), i = Math.floor(k), f = k - i;
      const p = [E.lerp(chain[i][0], chain[i + 1][0], f), E.lerp(chain[i][1], chain[i + 1][1], f)];
      sparkle(ctx, p[0], p[1], 14, .9);
    }
    [M1, M2, M3].forEach(m => glow(ctx, m[0], m[1], 40, 'rgba(255,230,140,.8)', .6 + .4 * E.wave(u, 1.5)));
    if (fin > 0) { FX.burst(ctx, u, 800, 450, 7.0, 22); FX.floatHearts(ctx, u, 800, 420, 8, 700, 3, 7.0); FX.sparkles(ctx, u, 800, 480, 460, 12, 6); }
  },
};

// 5. they make me happy —— 孩子本來頭上有烏雲；爸爸戴搞笑眼鏡跳舞、妹妹跳、媽媽笑 → 孩子笑了；全家拍照、閃光、彩帶
SCENES.family_5 = {
  dur: 9, sfx: [[0.3, 'boing'], [0.9, 'boing'], [1.6, 'pop'], [1.9, 'sparkle'], [3.3, 'ding'], [3.8, 'ding'], [4.3, 'ding'], [4.8, 'ding'], [5.0, 'pop'], [5.1, 'sparkle'], [5.9, 'whoosh'], [6.4, 'chime']],
  draw(ctx, u) {
    BG.room(ctx, u, '#fff8d6', '#d9a066', '#fff0b8');
    BG.window(ctx, 260, 330, 200, 150, u);
    PROP.sofa(ctx, 780, 760);
    const laugh = u > 1.5, flashT = 5.0;
    const pose = E.seg(u, 4.3, 4.7) > 0;
    // 相機放在右邊的小桌上
    PROP.table(ctx, 1290, 690, 140);
    const blink = u > 3.3 && u < flashT && ((u - 3.3) % .5) < .25;
    const fl = u > flashT ? 1 - E.seg(u, flashT, flashT + .6) : 0;
    family_camera(ctx, 1295, 680, u, blink, 0);
    // 爸爸：搞笑眼鏡＋紅鼻子，亂舞
    const dance = u > .3 && u < 4.3;
    const dB = dance ? -Math.abs(E.wave(u, 1.6)) * 18 : (pose ? -Math.abs(E.wave(u, 1.2)) * 10 : 0);
    const dad = { t: u, blinkSeed: .5, bob: dB, mouth: 'open', eyes: 'happy',
      armL: dance ? 100 + 60 * E.wave(u, 1.6) : (pose ? 150 : 12), armR: dance ? 100 - 60 * E.wave(u, 1.6) : (pose ? 145 : 12),
      legL: dance ? 25 * Math.max(0, E.wave(u, .8)) : 0, legR: dance ? -25 * Math.max(0, -E.wave(u, .8)) : 0 };
    drawPerson(ctx, 'dad', 480, 790, 1.05, dad);
    ctx.save(); ctx.translate(480, 790 + dB); ctx.scale(1.47, 1.47);
    circle(ctx, -27, -227, 22, 'rgba(180,230,255,.35)', '#212121', 6); circle(ctx, 27, -227, 22, 'rgba(180,230,255,.35)', '#212121', 6);
    ctx.strokeStyle = '#212121'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-5, -228); ctx.lineTo(5, -228); ctx.stroke();
    circle(ctx, -27, -224, 7, '#2b2118'); circle(ctx, 27, -224, 7, '#2b2118');
    circle(ctx, 0, -209, 12, '#ff3d3d'); circle(ctx, -4, -213, 4, 'rgba(255,255,255,.7)');
    ctx.restore();
    // 孩子
    const kB = laugh ? -Math.abs(E.wave(u, 1.4)) * 10 : 0;
    drawPerson(ctx, 'kid', 720, 790, 1.05, { t: u, bob: kB, eyes: laugh ? 'happy' : 'sad', mouth: laugh ? 'open' : 'sad',
      armL: pose ? 150 : (laugh ? 20 : 8), armR: pose ? 150 : (laugh ? 20 : 8) });
    // 妹妹：跳上跳下
    const sJ = (u > .5 && u < 4.3) || pose ? -Math.abs(E.wave(u, 1.3, .3)) * 26 : 0;
    drawPerson(ctx, 'sister', 910, 790, 1.05, { t: u, bob: sJ, eyes: 'happy', mouth: 'open', blinkSeed: 2,
      armL: u > .5 ? 150 + 10 * E.wave(u, 1.3) : 12, armR: u > .5 ? 150 - 10 * E.wave(u, 1.3) : 12 });
    // 媽媽：拍手笑 → 走去按相機快門 → 回來擺姿勢
    const go = E.easeInOut(E.seg(u, 2.6, 3.1)), back = E.easeInOut(E.seg(u, 3.5, 4.1));
    const mx = 1100 + 60 * go - 60 * back, walking = (go > 0 && go < 1) || (back > 0 && back < 1);
    const mom = { t: u, blinkSeed: 1, mouth: 'open', eyes: 'happy', bob: walking ? -Math.abs(E.wave(u, 3)) * 10 : 0 };
    if (u < 2.6) { const c = 10 + 10 * E.wave(u, 2.2); Object.assign(mom, { reachL: [mx - c, 640], reachR: [mx + c, 640] }); }
    else if (u >= 3.1 && u < 3.5) { const press = E.seg(u, 3.1, 3.3); Object.assign(mom, { reachR: [1282, E.lerp(600, 618, press)], armL: 12, mouth: 'smile', eyes: 'open' }); }
    else if (pose) Object.assign(mom, { armL: 150, armR: 150 });
    drawPerson(ctx, 'mom', mx, 790, 1.05, mom);
    // 烏雲 → 太陽
    family_cloud(ctx, 720, 410, 1, u, 1 - E.seg(u, 1.3, 1.8));
    const sunK = E.pop(u, 1.6, .5);
    if (sunK > 0 && u < 4.3) { ctx.save(); ctx.translate(720, 366); ctx.scale(sunK * (1 - E.seg(u, 3.9, 4.3)), sunK * (1 - E.seg(u, 3.9, 4.3))); FX.rays(ctx, u, 0, 0, 70, 'rgba(255,214,0,.6)', 12); circle(ctx, 0, 0, 38, '#ffd54f'); ctx.strokeStyle = '#8d5a00'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 4, 18, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); circle(ctx, -12, -6, 4, '#8d5a00'); circle(ctx, 12, -6, 4, '#8d5a00'); ctx.restore(); }
    if (laugh && u < 4.3) { FX.sparkles(ctx, u, 720, 520, 160, 8, 7); FX.floatHearts(ctx, u, 720, 470, 5, 200, 4, 1.6); }
    // 閃光
    if (fl > 0) {
      family_camera(ctx, 1295, 680, u, false, fl);
      ctx.save(); ctx.globalAlpha = fl * .85; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    // 拍好的照片從相機上方吐出來
    const ph = E.easeOut(E.seg(u, 5.6, 6.4));
    if (ph > 0) {
      const px = 1300, py = E.lerp(640, 470, ph), sc = E.lerp(.5, 1, ph);
      ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc); ctx.rotate(.06 * Math.sin(u * 2));
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12; ctx.fillStyle = '#fff'; rr(ctx, -66, -80, 132, 160, 6); ctx.fill(); ctx.shadowBlur = 0;
      ctx.save(); rr(ctx, -56, -70, 112, 112, 4); ctx.clip();
      const dev = E.seg(u, 6.2, 7.2);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(-56, -70, 112, 112);
      ctx.globalAlpha = dev;
      drawPerson(ctx, 'dad', -34, 46, .2, { armL: 150, armR: 150, eyes: 'happy', mouth: 'open' });
      drawPerson(ctx, 'kid', -6, 46, .2, { armL: 150, armR: 150, eyes: 'happy', mouth: 'open' });
      drawPerson(ctx, 'sister', 16, 46, .2, { armL: 150, armR: 150, eyes: 'happy', mouth: 'open' });
      drawPerson(ctx, 'mom', 38, 46, .2, { armL: 150, armR: 150, eyes: 'happy', mouth: 'open' });
      ctx.globalAlpha = 1 - dev; ctx.fillStyle = '#5d4037'; ctx.fillRect(-56, -70, 112, 112);
      ctx.restore();
      heart(ctx, 0, 62, 22, '#ff5d8f');
      ctx.restore();
    }
    family_confetti(ctx, u, flashT, 90);
    if (u > flashT) { FX.burst(ctx, u, 790, 440, flashT + .1, 24); FX.sparkles(ctx, u, 790, 500, 460, 14, 9); }
  },
};
