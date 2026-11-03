// my friends 的 5 句。u = 從 "because" 開始算的秒數。說話的是 kid（橘衣男孩），朋友是 mia（紫洋裝、雙馬尾）與 leo（綠上衣）。
// 原則：手一定碰到它在操作的東西（跳繩握把、對方的手、書、餅乾），手臂不擋臉，頭不重疊，坐姿先畫椅子再畫人。
window.TARGETS = window.TARGETS || {};
window.SCENES = window.SCENES || {};

// ---------- 本檔專用小工具 ----------
// 彎腰：上半身繞髖部旋轉 ang 度（正值 = 頭往畫面右邊倒）。reach 座標用世界座標，內部自動換算。
function friends_bend(ctx, who, x, y, s, ang, p = {}) {
  if (!ang) { drawPerson(ctx, who, x, y, s, p); return; }
  const sp = PEOPLE[who], S = s * sp.h, hy = y - 70 * S, a = ang * Math.PI / 180;
  const inv = pt => { if (!pt) return pt; const dx = pt[0] - x, dy = pt[1] - hy, c = Math.cos(-a), sn = Math.sin(-a); return [x + dx * c - dy * sn, hy + dx * sn + dy * c]; };
  // 下半身（腿）不轉
  ctx.save(); ctx.beginPath(); ctx.rect(x - 300, hy, 600, 400); ctx.clip();
  drawPerson(ctx, who, x, y, s, { ...p, reachL: [x, y - 165 * S], reachR: [x, y - 165 * S], itemL: null, itemR: null });
  ctx.restore();
  circle(ctx, x, hy, 36 * S, sp.dress ? sp.shirt : sp.pants);
  // 上半身繞髖部轉
  ctx.save(); ctx.translate(x, hy); ctx.rotate(a); ctx.translate(-x, -hy);
  ctx.beginPath(); ctx.rect(x - 400, hy - 700, 800, 702); ctx.clip();
  drawPerson(ctx, who, x, y, s, { ...p, reachL: inv(p.reachL), reachR: inv(p.reachR), itemAngL: p.itemAngL !== undefined ? p.itemAngL - ang * (p.flip ? -1 : 1) : undefined, itemAngR: p.itemAngR !== undefined ? p.itemAngR - ang * (p.flip ? -1 : 1) : undefined });
  ctx.restore();
}

// 坐在地上：屁股貼地，兩腿往右前方伸直（g = 地面高度）
function friends_groundSit(ctx, who, x, g, s, p = {}) {
  const sp = PEOPLE[who], S = s * sp.h;
  ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x + 40 * S, g + 2, 110 * S, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x - 400, g - 800, 800, 800 - 2); ctx.clip();
  drawPerson(ctx, who, x, g - 16 * S, s, { ...p, sit: true });
  ctx.restore();
  ctx.lineCap = 'round';
  [0, 1].forEach(i => {
    const hx = x - 14 * S + i * 26 * S, hy = g - 20 * S, fx = x + (78 + i * 22) * S, fy = g - (10 + i * 2) * S;
    ctx.strokeStyle = sp.dress ? sp.skin : sp.pants; ctx.lineWidth = 22 * S; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = sp.shoes; rr(ctx, fx + 4 * S, fy - 26 * S, 18 * S, 34 * S, 9 * S); ctx.fill();
  });
}

function friends_tree(ctx, x, y, s, t, cols = ['#ff9f1c', '#e85d04', '#ffba08']) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#795548'; rr(ctx, -16, -170, 32, 170, 10); ctx.fill();
  const sw = Math.sin(t * 1.2 + x) * 3;
  [[-60, -200, 70], [55, -205, 72], [0, -265, 85], [-30, -170, 55], [35, -165, 55]].forEach(([a, b, r], i) => circle(ctx, a + sw, b, r, cols[i % cols.length]));
  ctx.restore();
}

// 戶外公園：天空、太陽、遠山、草地、樹
function friends_park(ctx, u, o = {}) {
  BG.sky(ctx, u, o.top || '#8fd3ff', o.bottom || '#fff1c9');
  if (o.sun !== false) { glow(ctx, o.sunX || 1250, o.sunY || 360, 220, 'rgba(255,240,170,.9)'); FX.rays(ctx, u, o.sunX || 1250, o.sunY || 360, 240, 'rgba(255,230,140,.3)', 12); circle(ctx, o.sunX || 1250, o.sunY || 360, 52, '#ffe066'); }
  ctx.fillStyle = o.hill || '#aed581'; ctx.beginPath(); ctx.moveTo(0, 620);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 590 - 40 * Math.sin(x / 260) - 20 * Math.sin(x / 90 + 1));
  ctx.lineTo(W, H + 300); ctx.lineTo(0, H + 300); ctx.fill();
  (o.trees || []).forEach(([x, sc, c]) => friends_tree(ctx, x, 640, sc, u, c));
  const g = ctx.createLinearGradient(0, 630, 0, H); g.addColorStop(0, o.grass || '#9ccc65'); g.addColorStop(1, o.grass2 || '#689f38');
  ctx.fillStyle = g; ctx.fillRect(0, 630, W, H + 300 - 630);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 26; i++) { const x = E.rand(i + 40) * W, y = 650 + E.rand(i + 70) * 230; ctx.beginPath(); ctx.ellipse(x, y, 16, 4, 0, 0, Math.PI * 2); ctx.fill(); }
}

// 長椅：seatY = 座墊上緣；先畫椅背、再畫人、最後不用再畫（座墊被大腿蓋住）
function friends_bench(ctx, x, seatY, w, ground = 790, col = '#c46a2b', dark = '#8d4a1e') {
  ctx.fillStyle = '#5d4037'; ctx.fillRect(x - w / 2 + 30, seatY - 150, 14, 150); ctx.fillRect(x + w / 2 - 44, seatY - 150, 14, 150);
  ctx.fillStyle = col; for (let i = 0; i < 3; i++) { rr(ctx, x - w / 2 + 10, seatY - 150 + i * 40, w - 20, 28, 10); ctx.fill(); }
  ctx.fillStyle = '#4e342e'; ctx.fillRect(x - w / 2 + 40, seatY + 10, 18, ground - seatY - 10); ctx.fillRect(x + w / 2 - 58, seatY + 10, 18, ground - seatY - 10);
  ctx.fillStyle = dark; rr(ctx, x - w / 2, seatY - 2, w, 26, 10); ctx.fill();
  ctx.fillStyle = col; rr(ctx, x - w / 2, seatY - 6, w, 18, 9); ctx.fill();
}

// 一疊書（中心 x,y；n 本）
const FRIENDS_BOOKCOLS = ['#e53935', '#1e88e5', '#43a047', '#fdd835'];
function friends_book(ctx, x, y, col, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = col; rr(ctx, -46, -10, 92, 20, 5); ctx.fill();
  ctx.fillStyle = '#fffdf5'; ctx.fillRect(-40, -5, 84, 10); ctx.fillStyle = col; ctx.fillRect(-46, -10, 8, 20);
  ctx.restore();
}
function friends_stack(ctx, x, y, list) { list.forEach((c, i) => friends_book(ctx, x, y - i * 20, FRIENDS_BOOKCOLS[c])); }

// 咬過的餅乾（bites = 缺口數）
function friends_cookie(ctx, x, y, r, bites = 0) {
  ctx.save();
  if (bites > 0) {
    ctx.beginPath(); ctx.rect(x - r * 3, y - r * 3, r * 6, r * 6);
    for (let i = 0; i < bites; i++) { const a = -0.6 + i * .7; ctx.moveTo(x + Math.cos(a) * r * 1.05 + r * .45, y + Math.sin(a) * r * 1.05); ctx.arc(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, r * .45, 0, Math.PI * 2); }
    ctx.clip('evenodd');
  }
  PROP.cookie(ctx, x, y, r); ctx.restore();
}
// 半塊餅乾（side -1 = 左半，1 = 右半），斷口鋸齒
function friends_halfCookie(ctx, x, y, r, side) {
  ctx.save(); ctx.beginPath();
  ctx.arc(x, y, r, side > 0 ? -Math.PI / 2 : Math.PI / 2, side > 0 ? Math.PI / 2 : Math.PI * 1.5);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x + (i % 2 ? side * 5 : -side * 2), y + r - i * r / 3);
  ctx.closePath(); ctx.clip(); PROP.cookie(ctx, x, y, r); ctx.restore();
}

function friends_raincloud(ctx, x, y, s, t, rain = 1, gray = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (rain > 0) for (let i = 0; i < 7; i++) { const k = (t * 1.6 + E.rand(i + 5)) % 1; ctx.save(); ctx.globalAlpha = rain * (1 - k); ctx.fillStyle = '#64b5f6'; ctx.beginPath(); ctx.ellipse(-70 + i * 23, 40 + k * 70, 5, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  const c = gray ? '#90a4ae' : '#ffffff', c2 = gray ? '#78909c' : '#eceff1';
  circle(ctx, -50, 10, 38, c2); circle(ctx, 0, -12, 52, c); circle(ctx, 52, 6, 40, c2); ctx.fillStyle = c; rr(ctx, -86, 0, 172, 42, 21); ctx.fill();
  ctx.restore();
}
function friends_rainbow(ctx, x, y, r, k) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = .85;
  ['#ff5252', '#ff9f1c', '#ffeb3b', '#66bb6a', '#42a5f5', '#7e57c2'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(x, y, r - i * 22, Math.PI, Math.PI + Math.PI * E.easeOut(k)); ctx.stroke(); });
  ctx.restore();
}
function friends_sun(ctx, x, y, r, t, k) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  glow(ctx, 0, 0, r * 3, 'rgba(255,236,150,.9)'); FX.rays(ctx, t, 0, 0, r * 2.4, 'rgba(255,214,90,.55)', 12);
  circle(ctx, 0, 0, r, '#ffd54f'); circle(ctx, 0, 0, r * .8, '#ffe082');
  ctx.strokeStyle = '#8d5a2b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.arc(sd * r * .32, -r * .05, r * .14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
  ctx.beginPath(); ctx.arc(0, r * .15, r * .35, Math.PI * .15, Math.PI * .85); ctx.stroke();
  ctx.restore();
}

// ---------- 介紹畫面：mia 與 leo 牽手並排 ----------
TARGETS.friends = {
  color: '#ab47bc',
  draw(ctx, x, y, s, t, k) {
    const fs = s * .82, mx = x - 60, lx = x + 110;
    const hand = [x + 25, y - 85];
    const b = Math.abs(E.wave(t, 1.1)) * 6;
    drawPerson(ctx, 'mia', mx, y, fs, { t, bob: -b, armL: 25 + 35 * Math.max(0, E.wave(t, 1.2)) * k, reachR: hand, mouth: 'smile', blinkSeed: .7 });
    drawPerson(ctx, 'leo', lx, y, fs, { t, bob: -b, armR: 25 + 35 * Math.max(0, E.wave(t, 1.2, .5)) * k, reachL: hand, mouth: 'smile', blinkSeed: 2.1 });
  },
};

// 1. they play with me —— 跳繩：mia 與 leo 甩繩，kid 在中間跳
SCENES.friends_1 = (() => {
  const F = 1.15, U0 = .3;
  const theta = u => Math.PI + 2 * Math.PI * F * Math.max(0, u - U0);
  const sfx = [];
  for (let n = 1; n <= 8; n++) { const tt = U0 + (n - .5) / F; if (tt < 8.3) sfx.push([tt, 'bounce']); }
  sfx.push([.1, 'whoosh'], [3.4, 'chime'], [5.2, 'sparkle']);
  return {
    dur: 8.5, sfx,
    draw(ctx, u) {
      friends_park(ctx, u, { trees: [[230, 1.0, ['#ff9f1c', '#e85d04', '#ffba08']], [1400, 1.1, ['#ffba08', '#ff7043', '#ff9f1c']]], sunX: 1200, sunY: 380 });
      BG.leaves(ctx, u, 10, 21);
      const th = theta(u), cs = Math.cos(th), sn = Math.sin(th);
      const mx = 500, lx = 1100, kx = 800;
      const hm = [592 + 8 * sn, 662 + 16 * cs], hl = [1008 - 8 * sn, 662 + 16 * cs];
      const jump = 88 * Math.max(0, cs);
      const rope = (ang, a) => {
        const c2 = Math.cos(ang), s2 = Math.sin(ang);
        const p0 = [592 + 8 * s2, 662 + 16 * c2], p2 = [1008 - 8 * s2, 662 + 16 * c2];
        const mid = 610 + 192 * c2, cy = 2 * mid - (p0[1] + p2[1]) / 2;
        ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
        ctx.strokeStyle = '#d81b60'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(800, cy, p2[0], p2[1]); ctx.stroke();
        ctx.strokeStyle = '#ff80ab'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      };
      const ropeAll = () => { if (u > U0) { rope(th - .35, .18); rope(th - .18, .3); } rope(th, 1); };
      if (cs < 0) ropeAll();   // 繩子在上面：畫在孩子後面
      // 握把畫成手中的小把手
      const handle = c => { c.fillStyle = '#ffd54f'; rr(c, -7, -20, 14, 34, 6); c.fill(); };
      drawPerson(ctx, 'mia', mx, 790, 1.05, { t: u, reachR: hm, itemR: handle, itemAngR: 0, armL: 30 + 25 * Math.max(0, E.wave(u, 1.2)), mouth: 'open', eyes: 'happy', bob: -Math.abs(E.wave(u, F)) * 6, blinkSeed: .7 });
      drawPerson(ctx, 'leo', lx, 790, 1.05, { t: u, flip: true, reachR: hl, itemR: handle, itemAngR: 0, armL: 30 + 25 * Math.max(0, E.wave(u, 1.2, .5)), mouth: 'open', eyes: 'happy', bob: -Math.abs(E.wave(u, F, .3)) * 6, blinkSeed: 2.1 });
      // 跳起時地上的影子變小
      ctx.save(); ctx.globalAlpha = .15; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(kx, 792, 60 - jump * .25, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      drawPerson(ctx, 'kid', kx, 790, 1.05, { t: u, bob: -jump, armL: 35 + jump * .3, armR: 35 + jump * .3, legL: jump * .12, legR: -jump * .12, eyes: 'happy', mouth: 'open' });
      if (cs >= 0) ropeAll();  // 繩子在下面：畫在孩子前面（從腳下穿過）
      // 每次落地的小星星
      const ph = ((th - Math.PI / 2) / (2 * Math.PI)) % 1;   // 落地瞬間 ph≈0
      if (u > U0 + .4 && ph < .35) { const k = ph / .35; for (let i = 0; i < 5; i++) { const a = Math.PI + i / 4 * Math.PI; ctx.save(); ctx.globalAlpha = 1 - k; star(ctx, kx + Math.cos(a) * (40 + 60 * k), 790 + Math.sin(a) * (20 + 30 * k), 10, ['#ffd23f', '#ff6b6b', '#4ecdc4'][i % 3], k * 4); ctx.restore(); } }
      if (u > 3.2) { FX.sparkles(ctx, u, 800, 470, 380, 12, 3); FX.floatHearts(ctx, u, 800, 430, 8, 600, 5, 3.4); }
      FX.burst(ctx, u, 800, 420, 3.4);
    },
  };
})();

// 2. they make me happy —— 盪鞦韆的孩子頭上烏雲下雨；朋友扮鬼臉、跳舞 → 烏雲變太陽與彩虹，孩子笑了
SCENES.friends_2 = {
  dur: 8.5, sfx: [[.2, 'whoosh'], [1.2, 'whoosh'], [2.2, 'boing'], [2.8, 'boing'], [3.4, 'boing'], [3.9, 'pop'], [4.1, 'chime'], [4.6, 'sparkle'], [5.4, 'heart']],
  draw(ctx, u) {
    const joy = E.seg(u, 3.9, 4.8);
    friends_park(ctx, u, { top: '#90a4ae', bottom: '#cfd8dc', hill: '#9cad8a', grass: '#8fae6a', grass2: '#5f7f43', sun: false, trees: [[250, 1.05, ['#c98b4a', '#b0703a', '#d9a35e']], [1380, 1.0, ['#c98b4a', '#b0703a', '#d9a35e']]] });
    if (joy > 0) { ctx.save(); ctx.globalAlpha = joy; friends_park(ctx, u, { sun: false, trees: [[250, 1.05], [1380, 1.0]] }); ctx.restore(); }
    friends_rainbow(ctx, 800, 900, 640, E.seg(u, 4.2, 5.4));
    // 鞦韆架（橫桿在畫面上方外）
    const sw = u > 4.6 ? 7 * Math.sin((u - 4.6) * 2.6) * E.seg(u, 4.6, 5.4) : 0;
    ctx.strokeStyle = '#1e88e5'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(560, 790); ctx.lineTo(650, 220); ctx.moveTo(1040, 790); ctx.lineTo(950, 220); ctx.stroke();
    ctx.strokeStyle = '#1565c0'; ctx.beginPath(); ctx.moveTo(600, 230); ctx.lineTo(1000, 230); ctx.stroke();
    // 鞦韆 + 孩子一起繞橫桿擺動
    ctx.save(); ctx.translate(800, 230); ctx.rotate(sw * Math.PI / 180); ctx.translate(-800, -230);
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(722, 230); ctx.lineTo(722, 700); ctx.moveTo(878, 230); ctx.lineTo(878, 700); ctx.stroke();
    ctx.fillStyle = '#ef6c00'; rr(ctx, 708, 696, 184, 20, 8); ctx.fill();
    const sad = u < 3.9;
    drawPerson(ctx, 'kid', 800, 700, 1.05, {
      t: u, sit: true, swing: joy, eyes: sad ? (u > 2.9 ? 'open' : 'sad') : 'happy', mouth: sad ? (u > 2.9 ? 'o' : 'sad') : 'open',
      reachL: [722, 612], reachR: [878, 612], tilt: sad ? 0 : 4 * E.wave(u, 1.5), bob: joy > 0 ? -Math.abs(E.wave(u, 2)) * 6 * joy : 0,
    });
    // 臉頰上的眼淚（傷心時）
    if (u < 3.6) for (let i = 0; i < 2; i++) { const k = (u * 1.1 + i * .5) % 1; ctx.save(); ctx.globalAlpha = (1 - k) * (1 - E.seg(u, 3, 3.6)); ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(800 + (i ? 30 : -30), 532 + k * 50, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.restore();
    // 頭上的烏雲 → 太陽
    const cloudK = 1 - E.easeIn(E.seg(u, 3.9, 4.5));
    if (cloudK > 0) { ctx.save(); ctx.globalAlpha = cloudK; friends_raincloud(ctx, 800 + 6 * E.wave(u, .5), 345, .95 * (0.5 + .5 * cloudK), u, 1 - E.seg(u, 3.6, 3.9), 1); ctx.restore(); }
    friends_sun(ctx, 800, 350, 46, u, E.pop(u, 4.0, .6));
    // 朋友走進來
    const inK = E.easeOut(E.seg(u, .9, 2.1));
    const mx = E.lerp(160, 470, inK), lx = E.lerp(1460, 1130, inK);
    const walking = inK > 0 && inK < 1;
    const funny = u > 2.1;
    const wig = 8 * E.wave(u, 4);
    drawPerson(ctx, 'mia', mx, 790, 1.0, {
      t: u, blinkSeed: .7, bob: walking ? -Math.abs(E.wave(u, 3)) * 10 : (funny ? -Math.abs(E.wave(u, 1.6)) * 8 : 0),
      eyes: funny ? 'happy' : 'open', mouth: funny ? 'open' : 'smile', tilt: funny ? 10 * E.wave(u, 1.6) : 0,
      reachL: funny ? [mx - 80, 572 + wig] : null, reachR: funny ? [mx + 80, 572 - wig] : null, armFrontL: funny, armFrontR: funny, armL: 10, armR: 10,
    });
    if (funny && u < 4.6) { ctx.save(); ctx.globalAlpha = 1 - E.seg(u, 4.3, 4.6); ctx.fillStyle = '#ff6f91'; ctx.beginPath(); ctx.ellipse(mx + 2, 612 + (walking ? 0 : -Math.abs(E.wave(u, 1.6)) * 8), 10, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    const dance = funny ? E.wave(u, 1.3) : 0;
    drawPerson(ctx, 'leo', lx, 790, 1.0, {
      t: u, flip: true, blinkSeed: 2.1, bob: walking ? -Math.abs(E.wave(u, 3)) * 10 : (funny ? -Math.abs(E.wave(u, 2.6)) * 16 : 0),
      eyes: funny ? 'happy' : 'open', mouth: funny ? 'open' : 'smile', lean: 7 * dance,
      armL: funny ? 150 + 25 * dance : 10, armR: funny ? 150 - 25 * dance : 10, legL: funny ? 12 * Math.max(0, dance) : 0, legR: funny ? -12 * Math.max(0, -dance) : 0,
    });
    // 逗趣的音符／星星
    if (funny && u < 4.4) for (let i = 0; i < 6; i++) { const k = ((u - 2.1) * .7 + i / 6) % 1; ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI); star(ctx, (i % 2 ? lx : mx) + Math.sin(k * 6 + i) * 40, 470 - k * 140, 12, ['#ffd23f', '#ff6b6b', '#4ecdc4'][i % 3], k * 5); ctx.restore(); }
    if (joy > 0) { FX.burst(ctx, u, 800, 360, 4.0, 22, 4); FX.sparkles(ctx, u, 800, 480, 420, 14, 6); FX.floatHearts(ctx, u, 800, 470, 9, 640, 13, 4.8); }
  },
};

// 3. they help me —— 孩子絆倒、書掉一地；mia 拉他起來，leo 撿書還給他
SCENES.friends_3 = {
  dur: 8.5, sfx: [[1.0, 'boing'], [1.3, 'whoosh'], [1.7, 'bounce'], [1.9, 'pop'], [2.0, 'pop'], [2.9, 'pop'], [3.35, 'pop'], [3.8, 'pop'], [4.0, 'whoosh'], [5.6, 'page'], [6.4, 'ding'], [6.6, 'chime'], [7, 'sparkle']],
  draw(ctx, u) {
    friends_park(ctx, u, { top: '#81d4fa', bottom: '#fff3e0', sun: false, trees: [[240, .9, ['#ff9f1c', '#e85d04', '#ffba08']]] });
    drawSchool(ctx, 1200, 625, .55, u);
    // 石板路
    ctx.fillStyle = '#d7ccc8'; ctx.beginPath(); ctx.moveTo(0, 760); ctx.lineTo(W, 760); ctx.lineTo(W, 830); ctx.lineTo(0, 830); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 3; for (let x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 760); ctx.lineTo(x - 20, 830); ctx.stroke(); }
    // 石頭
    ctx.fillStyle = '#78909c'; ctx.beginPath(); ctx.ellipse(800, 786, 26, 16, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.ellipse(794, 780, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    const landing = [[1035, 782, .08], [1060, 780, -.05], [1085, 783, .1]];
    // ---- leo（右邊）：走過來、彎腰撿書、站起、送回來 ----
    const lin = E.easeOut(E.seg(u, 1.9, 2.7)), lback = E.easeInOut(E.seg(u, 4.7, 5.3));
    const lx = E.lerp(E.lerp(1500, 1160, lin), 990, lback);
    const bend = -55 * (E.easeInOut(E.seg(u, 2.6, 2.95)) - E.easeInOut(E.seg(u, 4.2, 4.6)));
    const picks = [3.0, 3.45, 3.9];
    const picked = picks.filter(p => u >= p).length;
    let lReachR = null, lItemR = null, lReachL = null, lArmL = 10, lArmR = 10;
    const stackItem = n => c => { for (let i = 0; i < n; i++) friends_book(c, 0, -14 - i * 20, FRIENDS_BOOKCOLS[i]); };
    if (u > 2.6 && u < 4.6) {
      // 手伸向下一本書；手上疊著已撿起的書
      const i = Math.min(picked, 2);
      const from = picked === 0 ? [lx - 60, 700] : landing[Math.min(picked - 1, 2)];
      const to = picked >= 3 ? [lx - 70, 690] : landing[i];
      const st = picked === 0 ? 2.6 : (picked >= 3 ? 3.9 : picks[picked - 1]), en = picked >= 3 ? 4.5 : picks[picked];
      const k = E.easeInOut(E.seg(u, st + .05, en));
      lReachR = [E.lerp(from[0], to[0], k), E.lerp(from[1], to[1], k) - 8];
      if (picked > 0) lItemR = stackItem(picked);
    }
    let stackHeld = null;   // 雙手捧著的書堆中心
    if (u >= 4.6 && u < 5.35) stackHeld = [lx, 694];
    if (u >= 4.6) { lArmL = 10; }
    // 交接：5.35–5.9 兩人一起拿，之後到孩子手上
    const hand = E.easeInOut(E.seg(u, 5.35, 5.9)), toKid = E.easeInOut(E.seg(u, 5.9, 6.4));
    if (u >= 4.6 && u < 5.35) { lReachR = [lx - 48, 694]; lReachL = [lx + 48, 694]; }
    if (u >= 5.35) { stackHeld = [E.lerp(E.lerp(990, 905, hand), 800, toKid), 694]; if (u < 5.9) lReachR = [stackHeld[0] + 46, 694]; else lArmR = 10, lArmL = 150 + 15 * E.wave(u, 1.5); }
    // 地上的書（還沒被撿的）
    for (let i = 0; i < 3; i++) {
      if (picked > i) continue;
      const k = E.seg(u, 1.05 + i * .08, 1.75 + i * .1);
      if (k <= 0) continue;
      const sx = 800, sy = 694 - i * 20, [ex, ey, er] = landing[i];
      const x = E.lerp(sx, ex, k), y = E.lerp(sy, ey, E.easeIn(k)) - Math.sin(k * Math.PI) * 140;
      friends_book(ctx, x, y, FRIENDS_BOOKCOLS[i], k < 1 ? k * 7 + i : er);
    }
    // ---- 孩子：走路抱書 → 絆倒 → 坐在地上 → 被拉起來 → 接書 ----
    const kxWalk = E.lerp(560, 770, E.seg(u, 0, 1.0));
    const fall = E.seg(u, 1.0, 1.35);
    const sitting = u >= 1.35 && u < 3.95;
    const up = E.seg(u, 3.95, 4.3);
    const mHand = E.easeOut(E.seg(u, 2.4, 2.9));
    const P = u < 3.6 ? [712, 655] : [E.lerp(712, 718, E.seg(u, 3.6, 4.1)), E.lerp(655, 640, E.seg(u, 3.6, 4.1))];
    const holding = u >= 2.8 && u < 4.5;
    if (u < 1.35) {
      const walking = u < 1.0;
      drawPerson(ctx, 'kid', kxWalk, 790, 1.05, {
        t: u, lean: 30 * E.easeIn(fall), bob: walking ? -Math.abs(E.wave(u, 2.4)) * 10 : 0,
        eyes: fall > 0 ? 'closed' : 'open', mouth: fall > 0 ? 'o' : 'smile',
        reachL: fall > 0 ? null : [kxWalk - 48, 694], reachR: fall > 0 ? null : [kxWalk + 48, 694], armL: 150, armR: 130, armFrontL: true, armFrontR: true,
      });
      if (fall <= 0) friends_stack(ctx, kxWalk, 694, [0, 1, 2]);
    } else if (sitting) {
      const bump = E.seg(u, 1.35, 1.6);
      ctx.save(); ctx.translate(0, -Math.sin(bump * Math.PI) * 14);
      friends_groundSit(ctx, 'kid', 800, 790, 1.05, {
        t: u, eyes: u < 3.4 ? 'sad' : 'open', mouth: u < 3.4 ? 'sad' : 'smile', tilt: u < 2.8 ? 6 * E.wave(u, .8) : 0,
        reachL: holding ? P : [770, 745], reachR: [858, 760 + 4 * E.wave(u, 2)],
      });
      ctx.restore();
      // 跌倒的灰塵
      if (u < 2.1) { const k = E.seg(u, 1.35, 2.1); for (let i = 0; i < 6; i++) { ctx.save(); ctx.globalAlpha = .6 * (1 - k); circle(ctx, 800 + (i - 2.5) * 40 * (1 + k), 780 - 30 * k * E.rand(i + 2), 18 + 16 * k, '#efebe9'); ctx.restore(); } }
      // 頭昏眼花的小星星＋眼淚
      if (u < 2.8) for (let i = 0; i < 4; i++) { const a = u * 4 + i * Math.PI / 2; star(ctx, 800 + Math.cos(a) * 95, 505 + Math.sin(a) * 22, 13, '#ffd23f', u * 3); }
      if (u > 1.6 && u < 3.3) { const k = ((u - 1.6) * 1.2) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(832, 610 + k * 50, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    } else {
      const got = u >= 5.35;
      const sx = stackHeld ? stackHeld[0] : 800;
      drawPerson(ctx, 'kid', 800, 790, 1.05, {
        t: u, bob: -Math.sin(up * Math.PI) * 22, eyes: u > 4.3 ? 'happy' : 'open', mouth: u > 4.3 ? 'open' : 'smile',
        reachL: holding ? P : (u >= 5.9 ? [sx - 46, 694] : null), reachR: got ? [sx - 46 + (u >= 5.9 ? 92 : 0), 694] : null,
        armL: 10, armR: 10, armFrontL: u >= 5.9, armFrontR: got,
      });
    }
    // ---- mia（左邊）：跑過來，伸手拉孩子起來 ----
    const min = E.easeOut(E.seg(u, 1.5, 2.4));
    const mx = E.lerp(180, 620, min);
    drawPerson(ctx, 'mia', mx, 790, 1.05, {
      t: u, blinkSeed: .7, bob: min > 0 && min < 1 ? -Math.abs(E.wave(u, 3)) * 10 : 0,
      eyes: u > 4.3 ? 'happy' : 'open', mouth: u > 4.3 ? 'open' : 'smile',
      reachR: holding ? P : (mHand > 0 && u < 2.8 ? [E.lerp(mx + 40, P[0], mHand), E.lerp(720, P[1], mHand)] : null),
      armR: 10, armL: u > 4.5 ? 150 + 15 * E.wave(u, 1.4) : 10,
    });
    // leo
    friends_bend(ctx, 'leo', lx, 790, 1.05, bend, {
      t: u, flip: true, blinkSeed: 2.1, bob: (lin > 0 && lin < 1) || (lback > 0 && lback < 1) ? -Math.abs(E.wave(u, 3)) * 10 : 0,
      eyes: u > 4.3 ? 'happy' : 'open', mouth: 'smile',
      reachR: lReachR, itemR: lItemR, itemAngR: lItemR ? 0 : undefined, reachL: lReachL, armL: lArmL, armR: lArmR, armFrontR: !!stackHeld, armFrontL: !!stackHeld,
    });
    if (stackHeld) friends_stack(ctx, stackHeld[0], stackHeld[1], [0, 1, 2]);
    // 書堆畫在手前面：再補畫手掌
    if (stackHeld && u >= 5.35) {
      const kidHands = u >= 5.9 ? [[stackHeld[0] - 46, 694], [stackHeld[0] + 46, 694]] : [[stackHeld[0] - 46, 694]];
      kidHands.forEach(([hx, hy]) => circle(ctx, hx, hy, 13.6, PEOPLE.kid.skin));
      if (u < 5.9) circle(ctx, stackHeld[0] + 46, 694, 13.9, PEOPLE.leo.skin);
    } else if (stackHeld) { [[stackHeld[0] - 48, 694], [stackHeld[0] + 48, 694]].forEach(([hx, hy]) => circle(ctx, hx, hy, 13.9, PEOPLE.leo.skin)); }
    else if (u < 1.0) { [[kxWalk - 48, 694], [kxWalk + 48, 694]].forEach(([hx, hy]) => circle(ctx, hx, hy, 13.6, PEOPLE.kid.skin)); }
    FX.check(ctx, 800, 360, E.seg(u, 6.4, 7.0));
    FX.burst(ctx, u, 800, 360, 6.5);
    if (u > 6.4) { FX.sparkles(ctx, u, 800, 440, 420, 12, 9); FX.floatHearts(ctx, u, 800, 470, 7, 520, 3, 6.6); }
  },
};

// 4. they share snacks with me —— 長椅上：mia 打開零食袋給一塊餅乾；leo 把餅乾掰成兩半分一半
SCENES.friends_4 = {
  dur: 8.5, sfx: [[.4, 'pop'], [.6, 'sparkle'], [2.3, 'ding'], [2.7, 'yum'], [3.7, 'pop'], [3.75, 'sizzle'], [4.9, 'ding'], [5.2, 'yum'], [5.6, 'chime'], [6.0, 'heart']],
  draw(ctx, u) {
    friends_park(ctx, u, { top: '#7ec8ff', bottom: '#ffe8c2', sunX: 1330, sunY: 350, trees: [[300, 1.1, ['#ff9f1c', '#e85d04', '#ffba08']], [1320, 1.0, ['#ffba08', '#ff7043', '#d84315']]] });
    BG.leaves(ctx, u, 9, 33);
    // 野餐籃放在地上
    ctx.fillStyle = '#a1662f'; rr(ctx, 1210, 720, 130, 76, 14); ctx.fill(); ctx.strokeStyle = '#7b4a1e'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(1275, 722, 48, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#e53935'; ctx.fillRect(1210, 732, 130, 14);
    friends_bench(ctx, 800, 705, 740);
    const mx = 580, kx = 800, lx = 1020, Y = 705;
    // 1) mia：左手抓著放在腿上的零食袋，右手拿餅乾遞給孩子
    const open = E.seg(u, .3, .7);
    const H1 = [692, 652];
    let mReachR = null, mItemR = null;
    if (u >= .9 && u < 1.4) { const k = E.easeInOut(E.seg(u, .9, 1.3)); mReachR = [E.lerp(622, 598, k), E.lerp(670, 626, k)]; }
    else if (u >= 1.4 && u < 2.4) { const k = E.easeInOut(E.seg(u, 1.4, 2.1)); mReachR = [E.lerp(598, H1[0], k), E.lerp(626, H1[1], k)]; mItemR = c => friends_cookie(c, 0, -26, 26); }
    else if (u >= 2.4 && u < 2.9) { const k = E.easeInOut(E.seg(u, 2.4, 2.9)); mReachR = [E.lerp(H1[0], 622, k), E.lerp(H1[1], 670, k)]; }
    else if (u >= 5.2) { mReachR = [598, 626 + 4 * E.wave(u, 1)]; }
    drawPerson(ctx, 'mia', mx, Y, 1.05, {
      t: u, sit: true, swing: .6, blinkSeed: .7, eyes: u > 2.3 ? 'happy' : 'open', mouth: u > 5.4 ? 'chew' : (u > 2.3 ? 'open' : 'smile'), tilt: u > 1.4 && u < 2.6 ? 8 : 0,
      reachL: [556, 634], reachR: mReachR, armR: 12, itemR: mItemR,
    });
    // 零食袋在腿上，被左手抓著袋口左上角
    PROP.snackBag(ctx, 585, 668, .78, '#ff7043');
    if (open > 0) {
      ctx.save(); ctx.fillStyle = '#ffccbc'; ctx.beginPath(); ctx.moveTo(558, 629); for (let i = 0; i <= 8; i++) ctx.lineTo(558 + i * 6.75, 629 - (i % 2 ? 7 : 0) * open); ctx.lineTo(612, 629); ctx.fill(); ctx.restore();
      for (let i = 0; i < 3; i++) friends_cookie(ctx, 572 + i * 14, 626 - 10 * E.back(open) - (i === 1 ? 6 : 0), 13);
    }
    circle(ctx, 556, 634, 13.6, PEOPLE.mia.skin);   // 抓袋子的手畫在袋子前
    if (mReachR && mReachR[1] < 640 && mReachR[0] < 620) circle(ctx, mReachR[0], mReachR[1], 13.6, PEOPLE.mia.skin);
    FX.burst(ctx, u, 585, 610, .45, 12, 8);
    // 2) leo：雙手拿大餅乾 → 啪！掰成兩半 → 左半遞給孩子
    const H2 = [905, 640];
    const snap = E.easeOut(E.seg(u, 3.7, 3.95));
    let lReachL = null, lReachR = null, lItemL = null, lItemR = null;
    const halfL = c => friends_halfCookie(c, 0, -26, 30, -1), halfR = c => friends_halfCookie(c, 0, -26, 30, 1);
    if (u >= 2.9 && u < 3.7) { const k = E.easeOut(E.seg(u, 2.9, 3.2)); lReachL = [E.lerp(lx - 46, 1000, k), E.lerp(670, 655, k)]; lReachR = [E.lerp(lx + 46, 1040, k), E.lerp(670, 655, k)]; }
    const wholeCookie = u >= 2.9 && u < 3.7;
    if (u >= 3.7) {
      const give = E.easeInOut(E.seg(u, 4.2, 4.8)) - E.easeInOut(E.seg(u, 5.0, 5.5));
      lReachL = [E.lerp(1000 - 22 * snap, H2[0], give), E.lerp(655, H2[1], give)]; lItemL = u < 4.95 ? halfL : null;
      lReachR = [1040 + 22 * snap, 655 - (u > 5.4 ? 12 * E.seg(u, 5.4, 5.8) : 0)]; lItemR = halfR;
    }
    // 3) 孩子：左手接 mia 的餅乾、右手接 leo 的半塊
    const gotA = u >= 2.3, gotB = u >= 4.95;
    let kReachL = [kx - 30, 672], kReachR = [kx + 30, 672], kItemL = null, kItemR = null;
    if (u >= 1.9 && u < 2.3) kReachL = [E.lerp(kx - 30, H1[0], E.easeOut(E.seg(u, 1.9, 2.1))), E.lerp(672, H1[1], E.easeOut(E.seg(u, 1.9, 2.1)))];
    if (gotA) { const k = E.easeInOut(E.seg(u, 2.3, 2.7)); kReachL = [E.lerp(H1[0], 735, k), E.lerp(H1[1], 655, k)]; kItemL = c => friends_cookie(c, 0, -26, 26, u > 2.8 ? 1 + (u > 6.2 ? 1 : 0) : 0); }
    if (u >= 4.5 && u < 4.95) kReachR = [E.lerp(kx + 30, H2[0], E.easeOut(E.seg(u, 4.5, 4.75))), E.lerp(672, H2[1], E.easeOut(E.seg(u, 4.5, 4.75)))];
    if (gotB) { const k = E.easeInOut(E.seg(u, 4.95, 5.4)); kReachR = [E.lerp(H2[0], 868, k), E.lerp(H2[1], 655, k)]; kItemR = halfL; }
    const chew = (u > 2.8 && u < 4.2) || u > 5.6;
    drawPerson(ctx, 'kid', kx, Y, 1.05, {
      t: u, sit: true, swing: 1, eyes: gotA ? 'happy' : 'open', mouth: chew ? 'chew' : (gotA ? 'open' : 'smile'),
      tilt: u < 2.6 ? -6 * E.seg(u, 1.4, 1.9) : (u > 4.0 && u < 5.2 ? 6 : 0),
      reachL: kReachL, reachR: kReachR, itemL: kItemL, itemR: kItemR,
    });
    // 遞送中的餅乾畫在兩人手臂前面，看得清楚
    if (mItemR) { friends_cookie(ctx, mReachR[0], mReachR[1] - 26, 26); circle(ctx, mReachR[0], mReachR[1], 13.6, PEOPLE.mia.skin); if (u >= 1.9) circle(ctx, kReachL[0], kReachL[1], 13.6, PEOPLE.kid.skin); }
    drawPerson(ctx, 'leo', lx, Y, 1.05, {
      t: u, sit: true, swing: .6, blinkSeed: 2.1, eyes: u > 3.7 ? 'happy' : 'open', mouth: u > 5.8 ? 'chew' : (u > 3.6 ? 'open' : 'smile'), tilt: u > 4.1 && u < 5.1 ? -8 : 0,
      reachL: lReachL || [lx - 30, 672], reachR: lReachR || [lx + 30, 672], itemL: lItemL, itemR: lItemR,
    });
    if (wholeCookie) { const k = E.pop(u, 2.9, .4); ctx.save(); ctx.translate(1020, 632); ctx.scale(k, k); PROP.cookie(ctx, 0, 0, 30); ctx.restore(); circle(ctx, lReachL[0], lReachL[1], 13.9, PEOPLE.leo.skin); circle(ctx, lReachR[0], lReachR[1], 13.9, PEOPLE.leo.skin); }
    // 掰開的碎屑
    if (u > 3.7 && u < 4.6) { const k = E.seg(u, 3.7, 4.6); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (E.rand(i + 3) - .5) * 2.4; ctx.save(); ctx.globalAlpha = 1 - k; circle(ctx, 1020 + Math.cos(a) * 90 * k, 625 + Math.sin(a) * 70 * k + 120 * k * k, 4 + 3 * E.rand(i), '#c68642'); ctx.restore(); } }
    FX.burst(ctx, u, 1020, 600, 3.75, 14, 5);
    if (u > 2.4) FX.sparkles(ctx, u, 720, 600, 110, 6, 2);
    if (u > 5.2) { FX.floatHearts(ctx, u, 800, 470, 9, 560, 17, 5.4); FX.sparkles(ctx, u, 800, 470, 440, 14, 12); }
    FX.burst(ctx, u, 800, 420, 5.5, 20, 9);
  },
};

// 5. they talk with me —— 晚上一起坐在沙發聊天，對話泡泡輪流出現（貓、球、火箭），最後一起大笑
const friends_icons = {
  cat(c) {
    c.fillStyle = '#ffa726'; c.beginPath(); c.moveTo(-34, -14); c.lineTo(-26, -48); c.lineTo(-6, -26); c.fill(); c.beginPath(); c.moveTo(34, -14); c.lineTo(26, -48); c.lineTo(6, -26); c.fill();
    circle(c, 0, 0, 36, '#ffa726'); circle(c, -13, -4, 5, '#3e2723'); circle(c, 13, -4, 5, '#3e2723'); circle(c, 0, 8, 5, '#ff6f91');
    c.strokeStyle = '#3e2723'; c.lineWidth = 3; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 12, 12); c.lineTo(sd * 44, 6); c.moveTo(sd * 12, 16); c.lineTo(sd * 44, 20); c.stroke(); });
  },
  fish(c) { c.fillStyle = '#4fc3f7'; c.beginPath(); c.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(20, 0); c.lineTo(38, -14); c.lineTo(38, 14); c.fill(); circle(c, -12, -3, 4, '#fff'); },
  ball(c, t) {
    c.save(); c.rotate(t * 3); circle(c, 0, 0, 34, '#ffffff', '#37474f', 3);
    c.fillStyle = '#37474f'; c.beginPath(); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); } c.fill();
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + Math.PI / 2; c.beginPath(); c.arc(Math.cos(a) * 30, Math.sin(a) * 30, 8, 0, Math.PI * 2); c.fill(); }
    c.restore();
  },
  goal(c) { c.strokeStyle = '#90a4ae'; c.lineWidth = 5; c.strokeRect(-30, -22, 60, 40); c.lineWidth = 1.5; for (let i = -24; i < 30; i += 10) { c.beginPath(); c.moveTo(i, -22); c.lineTo(i, 18); c.stroke(); } },
  rocket(c) {
    c.fillStyle = '#ff7043'; c.beginPath(); c.moveTo(-14, 26); c.lineTo(-26, 40); c.lineTo(-10, 36); c.fill(); c.beginPath(); c.moveTo(14, 26); c.lineTo(26, 40); c.lineTo(10, 36); c.fill();
    c.fillStyle = '#eceff1'; c.beginPath(); c.moveTo(0, -46); c.quadraticCurveTo(22, -20, 15, 32); c.lineTo(-15, 32); c.quadraticCurveTo(-22, -20, 0, -46); c.fill();
    circle(c, 0, -8, 9, '#4fc3f7', '#607d8b', 3); c.fillStyle = '#ffca28'; c.beginPath(); c.moveTo(-9, 34); c.lineTo(0, 56); c.lineTo(9, 34); c.fill();
  },
  laugh(c) { circle(c, 0, 0, 30, '#ffd54f'); c.strokeStyle = '#5d4037'; c.lineWidth = 4; [-1, 1].forEach(sd => { c.beginPath(); c.arc(sd * 11, -4, 7, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, 8, 13, 0, Math.PI); c.fill(); circle(c, -20, 2, 4, '#4fc3f7'); circle(c, 20, 2, 4, '#4fc3f7'); },
};
SCENES.friends_5 = {
  dur: 8.5, sfx: [[.3, 'pop'], [1.6, 'sparkle'], [2.4, 'pop'], [3.6, 'bounce'], [4.5, 'pop'], [5.6, 'whoosh'], [6.5, 'chime'], [6.8, 'heart']],
  draw(ctx, u) {
    BG.room(ctx, u, '#fff0dc', '#c48b5a', '#ffe4c0'); BG.window(ctx, 1170, 140, 280, 220, u, 1);
    PROP.lamp(ctx, 250, 760, u);
    // 牆上的小燈串
    for (let i = 0; i < 9; i++) { const x = 480 + i * 80, y = 150 + 18 * Math.sin(i * .9); glow(ctx, x, y, 34, 'rgba(255,220,120,.8)', .6 + .4 * Math.sin(u * 3 + i)); circle(ctx, x, y, 8, ['#ffd54f', '#ff8a65', '#81c784'][i % 3]); }
    PROP.sofa(ctx, 800, 790);
    const pos = { mia: 610, kid: 800, leo: 990 }, Y = 680, s = .92;
    const turns = [['mia', .3, 2.3, ['cat', 'fish']], ['kid', 2.4, 4.4, ['ball', 'goal']], ['leo', 4.5, 6.4, ['rocket']]];
    const cur = turns.find(([, a, b]) => u >= a && u < b);
    const speaker = cur ? cur[0] : null, laughing = u >= 6.5;
    ['mia', 'kid', 'leo'].forEach((who, i) => {
      const x = pos[who], talking = speaker === who;
      const tilt = laughing ? 6 * E.wave(u, 1.4, i * .3) : (speaker && !talking ? Math.sign(pos[speaker] - x) * 12 : 0);
      // 前一位說完時，其他人笑一下
      const react = turns.some(([w, , b]) => w !== who && u > b - .6 && u < b + .2);
      const p = {
        t: u, sit: true, swing: .5, blinkSeed: i * .9, tilt, eyes: laughing || react ? 'happy' : 'open',
        mouth: talking ? 'talk' : (laughing || react ? 'open' : 'smile'), bob: laughing ? -Math.abs(E.wave(u, 2.2, i * .2)) * 12 : 0,
        reachL: [x - 30, 666], reachR: [x + 30, 666],
      };
      if (talking) { const g = 50 + 22 * Math.max(0, E.wave(u, 1.1)); if (who === 'mia') { p.reachL = null; p.armL = g; } else { p.reachR = null; p.armR = who === 'leo' ? g : g * .7; } }
      if (laughing) { p.reachL = null; p.reachR = null; p.armL = 130 + 20 * E.wave(u, 1.5, i * .3); p.armR = 130 + 20 * E.wave(u, 1.5, i * .3 + .5); }
      drawPerson(ctx, who, x, Y, s, p);
    });
    // 對話泡泡（圖示，不放文字）
    turns.forEach(([who, a, b, icons]) => {
      const k = E.pop(u, a, .4) * (1 - E.seg(u, b - .2, b));
      if (k <= 0) return;
      const bx = pos[who] + 70, by = 372, w = icons.length > 1 ? 250 : 170;
      PROP.speech(ctx, bx, by, w, 116, k);
      ctx.save(); ctx.translate(bx, by); ctx.scale(k * 1.08, k * 1.08);
      icons.forEach((ic, j) => { ctx.save(); ctx.translate(icons.length > 1 ? (j ? 58 : -52) : 0, 2 + 3 * E.wave(u, 1.5, j * .4)); if (ic === 'rocket') ctx.translate(0, -6 * E.wave(u, 2)); friends_icons[ic](ctx, u); ctx.restore(); });
      if (who === 'leo') for (let j = 0; j < 3; j++) star(ctx, -62 + j * 60 + (j === 1 ? 0 : 0), j === 1 ? -40 : 34, 10, '#ffd54f', u * 2 + j);
      ctx.restore();
    });
    if (laughing) {
      ['mia', 'kid', 'leo'].forEach((who, i) => { const k = E.pop(u, 6.5 + i * .15, .4); ctx.save(); ctx.translate(pos[who] + (i - 1) * 30, 360 - 8 * Math.abs(E.wave(u, 2, i * .3))); ctx.scale(k * .9, k * .9); friends_icons.laugh(ctx); ctx.restore(); });
      FX.burst(ctx, u, 800, 380, 6.5, 20, 6); FX.floatHearts(ctx, u, 800, 460, 9, 640, 21, 6.7); FX.sparkles(ctx, u, 800, 460, 460, 14, 15);
    }
  },
};
