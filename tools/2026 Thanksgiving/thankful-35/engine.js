// 共用繪圖引擎：時間 t（秒）→ 畫面。所有動畫都是 t 的純函數，方便之後逐格錄成 MP4。
const W = 1600, H = 900;
const E = {
  clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, k) => a + (b - a) * k,
  seg(t, a, b) { return E.clamp((t - a) / (b - a)); },
  easeOut: k => 1 - Math.pow(1 - k, 3),
  easeIn: k => k * k * k,
  easeInOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  back(k) { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  pop(t, a, d = .45) { const k = E.seg(t, a, a + d); return k <= 0 ? 0 : E.back(k); },
  wave: (t, f = 1, p = 0) => Math.sin((t * f + p) * Math.PI * 2),
  rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); },
};

// ---------- 基本形狀 ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function circle(ctx, x, y, r, fill, stroke, lw = 4) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function heart(ctx, x, y, s, fill, stroke) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 40, s / 40);
  ctx.beginPath(); ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-40, -14, -20, -42, 0, -22); ctx.bezierCurveTo(20, -42, 40, -14, 0, 14);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 4; ctx.stroke(); }
  ctx.restore();
}
function star(ctx, x, y, r, fill, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * .45 : r;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}
function sparkle(ctx, x, y, r, a = 1, color = '#fff6c2') {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill(); ctx.restore();
}
function glow(ctx, x, y, r, color, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

// ---------- 特效 ----------
const FX = {
  // 閃亮光點環繞
  sparkles(ctx, t, x, y, rad, n = 10, seed = 1, color) {
    for (let i = 0; i < n; i++) {
      const a = E.rand(seed + i) * Math.PI * 2 + t * .8, rr2 = rad * (.6 + .5 * E.rand(seed + i + 50));
      const tw = (Math.sin(t * 5 + i * 1.7) + 1) / 2;
      sparkle(ctx, x + Math.cos(a) * rr2, y + Math.sin(a) * rr2 * .7, 8 + 14 * tw, .3 + .7 * tw, color);
    }
  },
  // 往上飄的愛心
  floatHearts(ctx, t, x, y, n = 8, spread = 260, seed = 7, start = 0) {
    for (let i = 0; i < n; i++) {
      const life = 2.6, tt = (t - start - i * .25);
      if (tt < 0) continue;
      const k = (tt % life) / life;
      const hx = x + (E.rand(seed + i) - .5) * spread + Math.sin(tt * 3 + i) * 18;
      const hy = y - k * 320;
      ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI);
      heart(ctx, hx, hy, 22 + 18 * E.rand(seed + i + 9), i % 3 ? '#ff5d8f' : '#ff9ec0'); ctx.restore();
    }
  },
  // 從中心爆開的彩帶星星
  burst(ctx, t, x, y, start, n = 18, seed = 3) {
    const k = E.seg(t, start, start + 1.1); if (k <= 0 || k >= 1) return;
    const cols = ['#ffd23f', '#ff6b6b', '#4ecdc4', '#a78bfa', '#ff9f1c'];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + E.rand(seed + i) * .4, d = E.easeOut(k) * (160 + 80 * E.rand(seed + i + 3));
      ctx.save(); ctx.globalAlpha = 1 - k;
      star(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 12 + 8 * E.rand(i), cols[i % cols.length], k * 6 + i);
      ctx.restore();
    }
  },
  // 放射光芒
  rays(ctx, t, x, y, r, color = 'rgba(255,230,140,.35)', n = 14) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * .25); ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      ctx.rotate(Math.PI * 2 / n); ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(r, -r * .12); ctx.lineTo(r, r * .12); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
  // 冒煙／香味曲線
  steam(ctx, t, x, y, n = 3, color = 'rgba(255,255,255,.85)', h = 160) {
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const k = ((t * .7 + i / n) % 1);
      ctx.globalAlpha = Math.sin(k * Math.PI) * .9; ctx.strokeStyle = color; ctx.lineWidth = 10 - k * 5;
      ctx.beginPath();
      for (let j = 0; j <= 12; j++) {
        const yy = y - j / 12 * h * (0.4 + k * .8);
        const xx = x + (i - (n - 1) / 2) * 34 + Math.sin(j * .8 + t * 4 + i) * 14;
        j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  // 勾勾徽章
  check(ctx, x, y, k) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(E.back(Math.min(k * 1.3, 1)), E.back(Math.min(k * 1.3, 1)));
    circle(ctx, 0, 0, 56, '#22c55e', '#fff', 8);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-24, 2); ctx.lineTo(-6, 22); ctx.lineTo(28, -20); ctx.stroke(); ctx.restore();
  },
};

// ---------- 人物 ----------
// spec: 外觀；pose: 動作。座標 (x, y) 是腳底中心。
const PEOPLE = {
  kid: { skin: '#ffd9b8', hair: '#2b2118', hairStyle: 'spiky', shirt: '#ff8a3d', pants: '#3b5bdb', shoes: '#ffffff', h: 1 },
  mom: { skin: '#ffd2b0', hair: '#6b3a1f', hairStyle: 'pony', shirt: '#ff7aa8', pants: '#ff7aa8', dress: true, shoes: '#c2185b', h: 1.32 },
  dad: { skin: '#f5c9a0', hair: '#3e2723', hairStyle: 'short', shirt: '#42a5f5', pants: '#546e7a', shoes: '#3e2723', h: 1.4 },
  sister: { skin: '#ffdcc0', hair: '#5d4037', hairStyle: 'pigtails', shirt: '#ffd54f', pants: '#ffd54f', dress: true, shoes: '#ef6c00', h: .86 },
  grandma: { skin: '#f6d0b1', hair: '#cfd8dc', hairStyle: 'bun', shirt: '#9575cd', pants: '#9575cd', dress: true, shoes: '#5e35b1', glasses: true, h: 1.22 },
  teacher: { skin: '#ffd9b8', hair: '#4e342e', hairStyle: 'bob', shirt: '#26a69a', pants: '#26a69a', dress: true, shoes: '#00695c', glasses: true, h: 1.3 },
  mia: { skin: '#ffd9b8', hair: '#8d4925', hairStyle: 'pigtails', shirt: '#ab47bc', pants: '#ab47bc', dress: true, shoes: '#6a1b9a', h: 1 },
  leo: { skin: '#e8b58e', hair: '#1b1b1b', hairStyle: 'short', shirt: '#66bb6a', pants: '#795548', shoes: '#fafafa', h: 1.02 },
};

function drawPerson(ctx, who, x, y, s, p = {}) {
  const sp = typeof who === 'string' ? PEOPLE[who] : who;
  const S = s * (sp.h || 1);
  ctx.save(); ctx.translate(x, y + (p.bob || 0)); ctx.rotate((p.lean || 0) * Math.PI / 180); ctx.scale(S * (p.flip ? -1 : 1), S);
  // 影子
  if (!p.sit) { ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, 60, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if (p.sit) ctx.translate(0, 62);   // 坐姿：y 參數 = 座墊高度，屁股落在座墊上
  const legY = -70, bodyTop = -175, headY = -235;
  ctx.lineCap = 'round';
  // 腿
  if (p.sit) {
    // 大腿朝前（正面看是短短一塊），小腿從座墊前緣垂下
    [-20, 20].forEach((lx, i) => {
      const sw = (i ? -1 : 1) * 6 * Math.sin((p.t || 0) * 3 + i) * (p.swing || 0);
      ctx.save(); ctx.translate(lx, -52); ctx.rotate(sw * Math.PI / 180);
      ctx.strokeStyle = sp.dress ? sp.skin : sp.pants; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.stroke();
      ctx.fillStyle = sp.shoes; rr(ctx, -16, 40, 34, 18, 9); ctx.fill(); ctx.restore();
    });
    ctx.fillStyle = sp.dress ? sp.shirt : sp.pants; rr(ctx, -50, -92, 100, 46, 22); ctx.fill();
  } else {
    [[-18, p.legL || 0], [18, p.legR || 0]].forEach(([lx, a]) => {
      ctx.save(); ctx.translate(lx, legY); ctx.rotate(a * Math.PI / 180);
      ctx.strokeStyle = sp.dress ? sp.skin : sp.pants; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 58); ctx.stroke();
      ctx.fillStyle = sp.shoes; rr(ctx, -16, 52, 34, 18, 9); ctx.fill(); ctx.restore();
    });
  }
  // 身體
  ctx.fillStyle = sp.shirt;
  if (sp.dress) { ctx.beginPath(); ctx.moveTo(-34, bodyTop + 6); ctx.lineTo(34, bodyTop + 6); ctx.lineTo(56, legY + 8); ctx.lineTo(-56, legY + 8); ctx.closePath(); ctx.fill(); }
  else { rr(ctx, -42, bodyTop, 84, 112, 30); ctx.fill(); if (!p.sit) { ctx.fillStyle = sp.pants; rr(ctx, -40, legY - 20, 80, 30, 12); ctx.fill(); } }
  if (p.apron) { ctx.fillStyle = '#fffaf0'; rr(ctx, -26, bodyTop + 30, 52, 80, 14); ctx.fill(); ctx.fillStyle = '#ffb3c7'; circle(ctx, 0, bodyTop + 70, 8, '#ffb3c7'); }
  // 手臂：兩節（上臂＋前臂）。
  //   p.armL / p.armR：角度（0 = 往下，正值 = 往外抬）
  //   p.reachL / p.reachR：[世界座標 x, y]，手掌伸到那一點（例如鍋子、對方的肩膀）
  //   p.itemAngL / p.itemAngR：手上物品指向的世界角度（0 = 朝下，正值 = 往畫面右轉）；不給就保持直立
  //   p.armFrontL / p.armFrontR：手臂畫在頭的前面
  const flipS = p.flip ? -1 : 1, Lu = 44, Lf = 42;
  const toLocal = ([wx, wy]) => [(wx - x) / (S * flipS), (wy - y - (p.bob || 0)) / S - (p.sit ? 62 : 0)];
  const arm = (side, ang, reach, item, itemAng) => {
    const sx = side * 40, sy = bodyTop + 22;
    let hx, hy;
    if (reach) { [hx, hy] = toLocal(reach); }
    else { const a = (ang ?? 8) * Math.PI / 180; hx = sx + side * Math.sin(a) * (Lu + Lf - 2); hy = sy + Math.cos(a) * (Lu + Lf - 2); }
    let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy);
    const maxD = Lu + Lf - 1; if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
    hx = sx + dx; hy = sy + dy;
    const base = Math.atan2(dy, dx), off = Math.acos(E.clamp((Lu * Lu + d * d - Lf * Lf) / (2 * Lu * d || 1), -1, 1));
    const e1 = [sx + Lu * Math.cos(base + off), sy + Lu * Math.sin(base + off)], e2 = [sx + Lu * Math.cos(base - off), sy + Lu * Math.sin(base - off)];
    const el = (side * e1[0] + e1[1] * .3) > (side * e2[0] + e2[1] * .3) ? e1 : e2;   // 手肘往外、往下彎
    ctx.strokeStyle = sp.shirt; ctx.lineWidth = 20; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(el[0], el[1]); ctx.lineTo(hx, hy); ctx.stroke();
    if (item) {
      ctx.save(); ctx.translate(hx, hy);
      if (itemAng !== undefined) ctx.rotate(-flipS * itemAng * Math.PI / 180);
      if (p.flip && itemAng === undefined) ctx.scale(-1, 1);
      item(ctx); ctx.restore();
    }
    circle(ctx, hx, hy, 13, sp.skin);
  };
  const armL = () => arm(-1, p.armL, p.reachL, p.itemL, p.itemAngL), armR = () => arm(1, p.armR, p.reachR, p.itemR, p.itemAngR);
  if (!p.armFrontL) armL(); if (!p.armFrontR) armR();
  // 頭
  ctx.save(); ctx.translate(0, headY); ctx.rotate((p.tilt || 0) * Math.PI / 180);
  if (sp.hairStyle === 'pony') { ctx.fillStyle = sp.hair; ctx.beginPath(); ctx.ellipse(62 + Math.sin((p.t || 0) * 4) * 3, 10, 26, 46, .4, 0, Math.PI * 2); ctx.fill(); }
  if (sp.hairStyle === 'bun') { circle(ctx, 0, -78, 30, sp.hair); }
  if (sp.hairStyle === 'pigtails') { ctx.fillStyle = sp.hair; [-1, 1].forEach(sd => { ctx.fillStyle = sp.hair; ctx.beginPath(); ctx.ellipse(sd * 86, 18 + Math.sin((p.t || 0) * 5 + sd) * 3, 22, 38, sd * -.3, 0, Math.PI * 2); ctx.fill(); circle(ctx, sd * 74, -12, 9, '#ff4081'); }); }
  if (sp.hairStyle === 'bob') { ctx.fillStyle = sp.hair; ctx.beginPath(); ctx.ellipse(0, -2, 86, 76, 0, Math.PI, Math.PI * 2); ctx.fill(); rr(ctx, -88, -6, 30, 54, 14); ctx.fill(); rr(ctx, 58, -6, 30, 54, 14); ctx.fill(); }
  circle(ctx, 0, 0, 72, sp.skin);
  // 頭髮
  ctx.fillStyle = sp.hair; ctx.beginPath();
  if (sp.hairStyle === 'spiky') {
    ctx.moveTo(-74, 6);
    for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; ctx.lineTo(Math.cos(a) * (i % 2 ? 92 : 74), Math.sin(a) * (i % 2 ? 92 : 74) - 4); }
    ctx.lineTo(74, 6); ctx.quadraticCurveTo(30, -30, -20, -26); ctx.quadraticCurveTo(-60, -20, -74, 6);
  } else {
    ctx.arc(0, -4, 76, Math.PI * 1.0, Math.PI * 2.0); ctx.quadraticCurveTo(70, -22, 40, -26); ctx.quadraticCurveTo(10, -34, -20, -22); ctx.quadraticCurveTo(-60, -26, -76, -4);
  }
  ctx.fill();
  if (sp.glasses) { ctx.strokeStyle = '#444'; ctx.lineWidth = 4; circle(ctx, -26, 8, 18, null, '#444', 4); circle(ctx, 26, 8, 18, null, '#444', 4); }
  // 臉
  const ex = 26, ey = 8, eyes = p.eyes || 'open';
  const blink = p.t !== undefined && ((p.t * 1.0 + (p.blinkSeed || 0)) % 3.2) < .12;
  ctx.fillStyle = '#2b2118'; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  [-ex, ex].forEach(xx => {
    if (eyes === 'happy') { ctx.beginPath(); ctx.arc(xx, ey + 6, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (eyes === 'closed' || blink) { ctx.beginPath(); ctx.moveTo(xx - 11, ey); ctx.lineTo(xx + 11, ey); ctx.stroke(); }
    else if (eyes === 'sad') { ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.ellipse(xx, ey + 2, 8, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(xx - 14, ey - 18 + (xx > 0 ? -5 : 5)); ctx.lineTo(xx + 14, ey - 18 + (xx > 0 ? 5 : -5)); ctx.stroke(); }
    else { ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.ellipse(xx, ey, 9, 12, 0, 0, Math.PI * 2); ctx.fill(); circle(ctx, xx + 3, ey - 4, 3.5, '#fff'); }
  });
  ctx.save(); ctx.globalAlpha = p.sick ? .0 : .55; circle(ctx, -44, 30, 12, '#ff8fa3'); circle(ctx, 44, 30, 12, '#ff8fa3'); ctx.restore();
  const m = p.mouth || 'smile';
  ctx.lineWidth = 6;
  if (m === 'smile') { ctx.beginPath(); ctx.arc(0, 34, 18, Math.PI * .15, Math.PI * .85); ctx.stroke(); }
  else if (m === 'open' || m === 'talk') {
    const o = m === 'talk' ? (Math.sin((p.t || 0) * 22) + 1) / 2 : 1;
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(0, 38, 16, 6 + 10 * o, 0, 0, Math.PI * 2); ctx.fill();
  }
  else if (m === 'o') { circle(ctx, 0, 40, 9, '#c0392b'); }
  else if (m === 'sad') { ctx.beginPath(); ctx.arc(0, 52, 16, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else if (m === 'chew') { const o = (Math.sin((p.t || 0) * 14) + 1) / 2; ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(0, 40, 12, 3 + 6 * o, 0, 0, Math.PI * 2); ctx.fill(); }
  if (p.sick) { ctx.save(); ctx.globalAlpha = .28 * p.sick; circle(ctx, 0, 0, 72, '#7bd389'); ctx.restore(); }
  ctx.restore();
  if (p.armFrontL) armL(); if (p.armFrontR) armR();
  ctx.restore();
}

// ---------- 背景 ----------
const BG = {
  sky(ctx, t, top = '#8fd3ff', bottom = '#fff1c9') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H + 300);
  },
  room(ctx, t, wall = '#ffe9c7', floor = '#e0a96d', stripe = '#ffdcae') {
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = stripe; for (let x = 0; x < W; x += 80) ctx.fillRect(x, 0, 36, 640);
    const g = ctx.createLinearGradient(0, 640, 0, H); g.addColorStop(0, floor); g.addColorStop(1, '#b97a45');
    ctx.fillStyle = g; ctx.fillRect(0, 640, W, H + 300 - 640);
    ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 3; for (let x = -200; x < W; x += 140) { ctx.beginPath(); ctx.moveTo(x, 640); ctx.lineTo(x + 160, H); ctx.stroke(); }
    // 漂浮光塵
    for (let i = 0; i < 18; i++) { const k = (t * .05 + E.rand(i)) % 1; sparkle(ctx, E.rand(i + 3) * W, 600 - k * 560, 5, .5 * Math.sin(k * Math.PI)); }
  },
  window(ctx, x, y, w, h, t, night = 0) {
    rr(ctx, x - 12, y - 12, w + 24, h + 24, 16); ctx.fillStyle = '#ffffff'; ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, night ? '#1e2a5a' : '#7cc8ff'); g.addColorStop(1, night ? '#4a3f7a' : '#d9f1ff');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (night) { circle(ctx, x + w * .7, y + h * .3, 26, '#fff7c2'); for (let i = 0; i < 8; i++) sparkle(ctx, x + E.rand(i) * w, y + E.rand(i + 9) * h * .7, 5, .5 + .5 * Math.sin(t * 3 + i)); }
    else { circle(ctx, x + w * .75, y + h * .3, 30, '#ffe066'); ctx.fillStyle = '#fff'; [0, 1].forEach(i => { const cx = x + ((t * 20 + i * 140) % (w + 120)) - 60; circle(ctx, cx, y + h * .55, 20, '#fff'); circle(ctx, cx + 22, y + h * .55 - 8, 24, '#fff'); circle(ctx, cx + 46, y + h * .55, 18, '#fff'); }); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  },
  bunting(ctx, t) { // 感恩節三角旗
    const cols = ['#ff9f1c', '#e85d04', '#ffd166', '#9c6644', '#d00000'];
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 40); ctx.quadraticCurveTo(W / 2, 90, W, 40); ctx.stroke();
    for (let i = 0; i < 20; i++) {
      const x = 40 + i * 80, k = x / W, y = 40 + 4 * 50 * k * (1 - k) * .9 + 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + i) * .06); ctx.fillStyle = cols[i % 5];
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(0, 44); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  },
  leaves(ctx, t, n = 14, seed = 11) { // 飄落的楓葉
    const cols = ['#ff9f1c', '#e85d04', '#d00000', '#ffba08'];
    for (let i = 0; i < n; i++) {
      const sp = 60 + 50 * E.rand(seed + i), k = ((t * sp / H) + E.rand(seed + i + 1)) % 1;
      const x = E.rand(seed + i + 2) * W + Math.sin(t * 1.5 + i) * 40, y = -40 + k * (H + 80);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.fillStyle = cols[i % 4]; ctx.globalAlpha = .85;
      ctx.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5, r = j % 2 ? 7 : 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
    }
  },
};

// ---------- 道具 ----------
const PROP = {
  stove(ctx, x, y, t, on = 1) {
    ctx.fillStyle = '#cfd8dc'; rr(ctx, x - 130, y - 150, 260, 150, 18); ctx.fill();
    ctx.fillStyle = '#90a4ae'; rr(ctx, x - 130, y - 160, 260, 22, 8); ctx.fill();
    circle(ctx, x - 80, y - 60, 16, '#607d8b'); circle(ctx, x + 80, y - 60, 16, '#607d8b');
    if (on) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; ctx.save(); ctx.globalAlpha = .7 + .3 * Math.sin(t * 20 + i); ctx.fillStyle = i % 2 ? '#ff9f1c' : '#4fc3f7'; ctx.beginPath(); ctx.ellipse(x - 60 + i * 24, y - 168, 7, 12 + 5 * Math.sin(t * 18 + i), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  },
  pan(ctx, x, y, t, flip = 0) {
    ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.ellipse(x, y, 90, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#263238'; rr(ctx, x + 80, y - 8, 110, 16, 8); ctx.fill();
    // 食物在鍋裡跳
    const foods = ['#ffd54f', '#81c784', '#e57373', '#ffb74d'];
    for (let i = 0; i < 6; i++) { const jump = Math.max(0, Math.sin(t * 8 + i * 1.3)) * 40 * flip; circle(ctx, x - 50 + i * 20, y - 10 - jump, 12, foods[i % 4]); }
  },
  plate(ctx, x, y, s = 1, full = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 80, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 66, 18, 0, 0, Math.PI * 2); ctx.stroke();
    if (full > 0) { ctx.globalAlpha = full; circle(ctx, -24, -10, 20, '#ffd54f'); circle(ctx, 8, -14, 22, '#e57373'); circle(ctx, 30, -6, 16, '#81c784'); ctx.globalAlpha = 1; }
    ctx.restore();
  },
  book(ctx, x, y, s, open = 1, t = 0, color = '#5c6bc0') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = color; rr(ctx, -110, -70, 220, 140, 10); ctx.fill();
    ctx.fillStyle = '#fffdf5';
    ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(-50, -72, -100, -60); ctx.lineTo(-100, 60); ctx.quadraticCurveTo(-50, 48, 0, 60); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(50, -72, 100, -60); ctx.lineTo(100, 60); ctx.quadraticCurveTo(50, 48, 0, 60); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d7ccc8'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-86, -30 + i * 22); ctx.lineTo(-16, -30 + i * 22); ctx.moveTo(16, -30 + i * 22); ctx.lineTo(86, -30 + i * 22); ctx.stroke(); }
    // 翻頁
    const k = (t * .8) % 1;
    ctx.save(); ctx.scale(Math.cos(k * Math.PI), 1); ctx.fillStyle = '#fff8e1';
    ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(50, -72, 96, -60); ctx.lineTo(96, 60); ctx.quadraticCurveTo(50, 48, 0, 60); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
  },
  sofa(ctx, x, y) {
    ctx.fillStyle = '#4db6ac'; rr(ctx, x - 300, y - 210, 600, 140, 50); ctx.fill();
    ctx.fillStyle = '#26a69a'; rr(ctx, x - 320, y - 110, 640, 110, 40); ctx.fill();
    rr(ctx, x - 340, y - 170, 80, 170, 36); ctx.fill(); rr(ctx, x + 260, y - 170, 80, 170, 36); ctx.fill();
  },
  lamp(ctx, x, y, t) {
    glow(ctx, x, y - 230, 260, 'rgba(255,236,160,.75)', .8 + .1 * Math.sin(t * 2));
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(x - 6, y - 220, 12, 220); ctx.fillRect(x - 50, y - 10, 100, 12);
    ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.moveTo(x - 70, y - 210); ctx.lineTo(x + 70, y - 210); ctx.lineTo(x + 44, y - 300); ctx.lineTo(x - 44, y - 300); ctx.closePath(); ctx.fill();
  },
  bed(ctx, x, y) {
    ctx.fillStyle = '#8d6e63'; rr(ctx, x - 330, y - 220, 40, 220, 12); ctx.fill(); rr(ctx, x + 290, y - 150, 40, 150, 12); ctx.fill();
    ctx.fillStyle = '#ffffff'; rr(ctx, x - 300, y - 130, 600, 80, 24); ctx.fill();
    ctx.fillStyle = '#e3f2fd'; rr(ctx, x - 290, y - 170, 140, 60, 26); ctx.fill();
  },
  blanket(ctx, x, y) { ctx.fillStyle = '#7986cb'; rr(ctx, x - 160, y - 150, 450, 110, 40); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 5; i++) circle(ctx, x - 100 + i * 90, y - 100, 14, 'rgba(255,255,255,.35)'); },
  box(ctx, x, y, s = 1, color = '#d7a86e') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; rr(ctx, -55, -45, 110, 90, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-55, -8, 110, 14); ctx.restore();
  },
  thermometer(ctx, x, y, level) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#fff'; rr(ctx, -10, -80, 20, 90, 10); ctx.fill(); circle(ctx, 0, 14, 16, '#fff');
    ctx.fillStyle = '#e53935'; rr(ctx, -5, -70 + (1 - level) * 70, 10, 80 - (1 - level) * 70, 5); ctx.fill(); circle(ctx, 0, 14, 11, '#e53935'); ctx.restore();
  },
  bowl(ctx, x, y, t) {
    FX.steam(ctx, t, x, y - 30, 2, 'rgba(255,255,255,.8)', 45);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y - 20, 50, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.ellipse(x, y - 20, 50, 12, 0, 0, Math.PI * 2); ctx.fill();
  },
};

// ---------- 狗（側面，面向右；flip 面向左）----------
// p: { t, sit, run, jump, wag, tongue, bark, eyes:'open'|'happy'|'closed', lie, tilt }
function drawDog(ctx, x, y, s, p = {}) {
  const t = p.t || 0, fur = '#d7a15e', dark = '#8d5a2b', belly = '#f5deb3';
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (p.flip ? -1 : 1), s);
  ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, 90, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const hop = p.jump ? -Math.abs(Math.sin(t * 5)) * 60 : (p.run ? -Math.abs(Math.sin(t * 9)) * 10 : 0);
  ctx.translate(0, hop);
  const legSw = p.run ? Math.sin(t * 9) * 25 : 0;
  ctx.strokeStyle = fur; ctx.lineWidth = 16; ctx.lineCap = 'round';
  const leg = (lx, a, len = 46) => { ctx.save(); ctx.translate(lx, -40); ctx.rotate(a * Math.PI / 180); ctx.strokeStyle = fur; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke(); circle(ctx, 0, len, 10, dark); ctx.restore(); };
  if (p.lie) { ctx.translate(0, 30); }
  const wag = (p.wag ?? 1) * Math.sin(t * 14) * 25;
  ctx.save(); ctx.translate(-62, p.sit ? -40 : -70); ctx.rotate((-50 + wag) * Math.PI / 180);
  ctx.strokeStyle = fur; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-10, -30, 6, -50); ctx.stroke(); ctx.restore();
  if (p.sit) { leg(-40, 60, 34); leg(30, 0); leg(46, 0); ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(-20, -50, 52, 40, -.5, 0, Math.PI * 2); ctx.fill(); }
  else if (!p.lie) { leg(-46, legSw); leg(-30, -legSw); leg(38, -legSw); leg(54, legSw); ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -62, 74, 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(6, -50, 46, 18, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -40, 80, 30, 0, 0, Math.PI * 2); ctx.fill(); circle(ctx, 60, -16, 12, dark); circle(ctx, 30, -14, 12, dark); }
  const hx = p.sit ? 36 : 70, hy = p.sit ? -112 : (p.lie ? -66 : -104);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate((p.tilt || 0) * Math.PI / 180);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-30, -4, 16, 32, .3 + Math.sin(t * 6) * .08, 0, Math.PI * 2); ctx.fill();
  circle(ctx, 0, 0, 42, fur);
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(30, 14, 28, 20, 0, 0, Math.PI * 2); ctx.fill();
  circle(ctx, 54, 6, 10, '#3e2723');
  const e = p.eyes || 'open';
  if (e === 'happy') { ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(14, -6, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else if (e === 'closed') { ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(22, -8); ctx.stroke(); }
  else { circle(ctx, 14, -8, 8, '#2b2118'); circle(ctx, 17, -11, 3, '#fff'); }
  if (p.bark) { const o = (Math.sin(t * 16) + 1) / 2; ctx.fillStyle = '#5d1f1f'; ctx.beginPath(); ctx.ellipse(40, 28, 12, 4 + 8 * o, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(36, 22, 10, .2, Math.PI * .9); ctx.stroke(); }
  if (p.tongue) { ctx.fillStyle = '#ff6f91'; ctx.beginPath(); ctx.ellipse(34, 38 + Math.sin(t * 10) * 2, 8, 13, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(hx - 6, hy + 30, 26, .2, Math.PI * .9); ctx.stroke(); circle(ctx, hx - 4, hy + 56, 7, '#ffd54f');
  ctx.restore();
}

// ---------- 學校建築（正面，y = 地面）----------
function drawSchool(ctx, x, y, s, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ef9a9a'; rr(ctx, -300, -280, 600, 280, 12); ctx.fill();
  ctx.fillStyle = '#e57373'; ctx.fillRect(-300, -290, 600, 26);
  ctx.fillStyle = '#ffccbc'; ctx.beginPath(); ctx.moveTo(-90, -280); ctx.lineTo(0, -380); ctx.lineTo(90, -280); ctx.closePath(); ctx.fill();
  circle(ctx, 0, -320, 26, '#fff', '#8d6e63', 5);
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -320); ctx.lineTo(0, -338); ctx.moveTo(0, -320); ctx.lineTo(12, -316); ctx.stroke();
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { if (r === 1 && (c === 2 || c === 3)) continue; const wx = -260 + c * 90, wy = -240 + r * 110; rr(ctx, wx, wy, 64, 60, 8); ctx.fillStyle = '#b3e5fc'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); }
  ctx.fillStyle = '#8d6e63'; rr(ctx, -50, -120, 100, 120, 10); ctx.fill(); ctx.fillStyle = '#6d4c41'; ctx.fillRect(-2, -120, 4, 120);
  ctx.fillStyle = '#9e9e9e'; ctx.fillRect(330, -380, 8, 380);
  ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.moveTo(338, -376); ctx.quadraticCurveTo(380, -366 + Math.sin(t * 4) * 8, 420, -360); ctx.lineTo(420, -320); ctx.quadraticCurveTo(380, -326 + Math.sin(t * 4 + 1) * 8, 338, -336); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------- 其他共用道具 ----------
Object.assign(PROP, {
  // 桌子：y = 桌面高度（人站在 y=790 時，桌面約 650 才搆得到）
  table(ctx, x, y, w = 360, color = '#a1887f', ground = 790) {
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - w / 2 + 20, y, 16, ground - y); ctx.fillRect(x + w / 2 - 36, y, 16, ground - y);
    ctx.fillStyle = color; rr(ctx, x - w / 2, y - 14, w, 24, 8); ctx.fill();
  },
  chalkboard(ctx, x, y, w = 520, h = 260) {
    ctx.fillStyle = '#8d6e63'; rr(ctx, x - w / 2 - 14, y - 14, w + 28, h + 28, 10); ctx.fill();
    ctx.fillStyle = '#2e7d4f'; ctx.fillRect(x - w / 2, y, w, h);
  },
  ball(ctx, x, y, r = 30, t = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 4); circle(ctx, 0, 0, r, '#ff7f27');
    ctx.strokeStyle = '#5d2e0f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 1.3, 0, r, -.7, .7); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.3, 0, r, Math.PI - .7, Math.PI + .7); ctx.stroke(); ctx.restore();
  },
  // 籃框：y = 地面；籃圈中心在 (x - 42, y - 470)
  hoop(ctx, x, y) {
    ctx.fillStyle = '#9e9e9e'; ctx.fillRect(x - 8, y - 470, 16, 470);
    ctx.fillStyle = '#fff'; rr(ctx, x - 110, y - 560, 140, 100, 8); ctx.fill(); ctx.strokeStyle = '#e53935'; ctx.lineWidth = 5; ctx.strokeRect(x - 70, y - 520, 56, 40);
    ctx.strokeStyle = '#ff5722'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x - 42, y - 470, 36, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x - 42 + i * 11, y - 466); ctx.lineTo(x - 42 + i * 6, y - 420); ctx.stroke(); }
  },
  bookshelf(ctx, x, y, w = 300, h = 380) {
    ctx.fillStyle = '#8d6e63'; rr(ctx, x - w / 2, y - h, w, h, 8); ctx.fill();
    const cols = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#ff8a65'];
    for (let r = 0; r < 4; r++) { ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - w / 2 + 10, y - h + 20 + r * 90 + 76, w - 20, 8); for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[(i + r) % 6]; ctx.fillRect(x - w / 2 + 16 + i * 33, y - h + 30 + r * 90 + (i % 3) * 6, 26, 66 - (i % 3) * 6); } }
  },
  cookie(ctx, x, y, r = 18) { circle(ctx, x, y, r, '#d7a15e'); [[-6, -5], [6, 2], [-2, 7]].forEach(([a, b]) => circle(ctx, x + a * r / 18, y + b * r / 18, 3.5 * r / 18, '#4e342e')); },
  snackBag(ctx, x, y, s = 1, color = '#ff7043') { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-34, -50); ctx.lineTo(34, -50); ctx.lineTo(40, 40); ctx.lineTo(-40, 40); ctx.closePath(); ctx.fill(); circle(ctx, 0, -2, 18, '#fff59d'); ctx.restore(); },
  // 對話泡泡（裡面畫圖示，不放文字）
  speech(ctx, x, y, w, h, k = 1) {
    if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#fff'; rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.fill(); ctx.beginPath(); ctx.moveTo(-20, h / 2 - 4); ctx.lineTo(-44, h / 2 + 34); ctx.lineTo(8, h / 2 - 4); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 4; rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.stroke(); ctx.restore();
  },
});

// ---------- 側面人物（面向右；flip 面向左）----------
// 用在需要「看得出方向」的動作：擁抱、騎腳踏車、走路。座標 (x, y) = 腳底中心；坐姿 sit:true 時 y = 屁股（座位）高度。
// p: { t, flip, lean, tilt, bob, eyes:'open'|'happy'|'closed', mouth:'smile'|'open'|'talk',
//      nearArm/farArm: 角度（0 = 往下，正值 = 往前抬），reachNear/reachFar: [世界x, 世界y]，
//      nearLeg/farLeg: 角度（0 = 往下，正值 = 往前），footNear/footFar: [世界x, 世界y]（例如踏板），
//      sit, only: 'nearArm'（只畫靠近鏡頭的手臂，用來疊在別人身上）, skip: 'nearArm' }
function drawSide(ctx, who, x, y, s, p = {}) {
  const sp = typeof who === 'string' ? PEOPLE[who] : who;
  const S = s * (sp.h || 1), F = p.flip ? -1 : 1;
  const hipY = -70, shY = -153, headY = -235;
  ctx.save();
  ctx.translate(x, y + (p.bob || 0));
  if (p.sit) ctx.translate(0, 70 * S);                 // 坐姿：屁股在 y
  ctx.rotate(F * (p.lean || 0) * Math.PI / 180);
  ctx.scale(S * F, S);
  const toLocal = ([wx, wy]) => {
    // 只處理平移、縮放、翻轉（lean 很小時誤差可忽略）
    return [(wx - x) / (S * F), (wy - y - (p.bob || 0)) / S - (p.sit ? 70 : 0)];
  };
  const dark = (hex, k = .82) => { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * k, g = ((n >> 8) & 255) * k, b = (n & 255) * k; return `rgb(${r | 0},${g | 0},${b | 0})`; };
  const ik = (sx, sy, tx, ty, L1, L2, bendSign) => {
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const m = L1 + L2 - 1;
    if (d > m) { dx *= m / d; dy *= m / d; d = m; }
    const base = Math.atan2(dy, dx), off = Math.acos(E.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * (d || 1)), -1, 1));
    const a = base + bendSign * off;
    return { j: [sx + L1 * Math.cos(a), sy + L1 * Math.sin(a)], e: [sx + dx, sy + dy] };
  };
  const limb = (sx, sy, ang, len) => { const a = ang * Math.PI / 180; return [sx + Math.sin(a) * len, sy + Math.cos(a) * len]; };
  const legCol = sp.dress ? sp.skin : sp.pants;
  const leg = (near) => {
    const hx = near ? 6 : -6, hy = hipY + (p.sit ? -6 : 0);
    const tgt = near ? p.footNear : p.footFar;
    let foot;
    if (tgt) foot = toLocal(tgt); else foot = limb(hx, hy, (near ? p.nearLeg : p.farLeg) || 0, 70);
    const r = ik(hx, hy, foot[0], foot[1], 36, 36, -1);   // 膝蓋往前彎
    ctx.strokeStyle = near ? legCol : dark(legCol); ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(r.j[0], r.j[1]); ctx.lineTo(r.e[0], r.e[1]); ctx.stroke();
    ctx.fillStyle = near ? sp.shoes : dark(sp.shoes); rr(ctx, r.e[0] - 12, r.e[1] - 6, 36, 18, 9); ctx.fill();
  };
  const arm = (near) => {
    const sx = near ? 4 : -4, sy = shY;
    const tgt = near ? p.reachNear : p.reachFar;
    let hand;
    if (tgt) hand = toLocal(tgt); else hand = limb(sx, sy, (near ? p.nearArm : p.farArm) ?? 8, 84);
    const r = ik(sx, sy, hand[0], hand[1], 44, 42, 1);     // 手肘往下、往後彎
    ctx.strokeStyle = near ? sp.shirt : dark(sp.shirt); ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(r.j[0], r.j[1]); ctx.lineTo(r.e[0], r.e[1]); ctx.stroke();
    circle(ctx, r.e[0], r.e[1], 13, near ? sp.skin : dark(sp.skin, .9));
  };
  if (p.only === 'nearArm') { arm(true); ctx.restore(); return; }
  if (!p.sit) { ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, 50, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // 後面的手腳
  arm(false); leg(false);
  // 身體
  ctx.fillStyle = sp.shirt;
  if (sp.dress) { ctx.beginPath(); ctx.moveTo(-24, -170); ctx.lineTo(26, -170); ctx.lineTo(42, hipY + 8); ctx.lineTo(-40, hipY + 8); ctx.closePath(); ctx.fill(); }
  else { rr(ctx, -30, -175, 60, 112, 26); ctx.fill(); ctx.fillStyle = sp.pants; rr(ctx, -30, hipY - 18, 60, 30, 12); ctx.fill(); }
  leg(true);
  // 頭
  ctx.save(); ctx.translate(6, headY); ctx.rotate((p.tilt || 0) * Math.PI / 180);
  ctx.fillStyle = sp.hair;
  if (sp.hairStyle === 'bun') circle(ctx, -46, -58, 28, sp.hair);
  if (sp.hairStyle === 'pony') { ctx.beginPath(); ctx.ellipse(-82 + Math.sin((p.t || 0) * 4) * 3, 4, 22, 44, -.3, 0, Math.PI * 2); ctx.fill(); }
  if (sp.hairStyle === 'pigtails') { ctx.beginPath(); ctx.ellipse(-74, 18 + Math.sin((p.t || 0) * 5) * 3, 20, 36, .3, 0, Math.PI * 2); ctx.fill(); circle(ctx, -62, -12, 9, '#ff4081'); }
  if (sp.hairStyle === 'bob') { ctx.beginPath(); ctx.ellipse(-14, 4, 80, 74, 0, Math.PI * .55, Math.PI * 1.9); ctx.fill(); }
  circle(ctx, 0, 0, 70, sp.skin);
  circle(ctx, 66, 6, 10, sp.skin);                        // 鼻子
  circle(ctx, -40, 4, 13, dark(sp.skin, .93));            // 耳朵
  ctx.fillStyle = sp.hair; ctx.beginPath();
  if (sp.hairStyle === 'spiky') {
    ctx.moveTo(-72, 14);
    for (let i = 0; i <= 7; i++) { const a = Math.PI * .85 + i / 7 * Math.PI * .95; const r2 = i % 2 ? 92 : 72; ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2 - 4); }
    ctx.quadraticCurveTo(40, -36, 10, -28); ctx.quadraticCurveTo(-30, -20, -44, -6); ctx.closePath();
  } else {
    ctx.arc(0, -4, 74, Math.PI * .8, Math.PI * 1.85); ctx.quadraticCurveTo(46, -38, 14, -30); ctx.quadraticCurveTo(-24, -24, -40, -4); ctx.quadraticCurveTo(-60, 20, -70, 20); ctx.closePath();
  }
  ctx.fill();
  if (sp.glasses) { ctx.strokeStyle = '#444'; ctx.lineWidth = 4; circle(ctx, 38, 6, 16, null, '#444', 4); ctx.beginPath(); ctx.moveTo(22, 4); ctx.lineTo(-30, 0); ctx.stroke(); }
  const e = p.eyes || 'open';
  ctx.strokeStyle = '#2b2118'; ctx.fillStyle = '#2b2118'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (e === 'happy') { ctx.beginPath(); ctx.arc(38, 12, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else if (e === 'closed') { ctx.beginPath(); ctx.moveTo(28, 6); ctx.lineTo(48, 6); ctx.stroke(); }
  else { ctx.beginPath(); ctx.ellipse(38, 6, 8, 11, 0, 0, Math.PI * 2); ctx.fill(); circle(ctx, 41, 2, 3, '#fff'); }
  ctx.save(); ctx.globalAlpha = .55; circle(ctx, 30, 30, 12, '#ff8fa3'); ctx.restore();
  const m = p.mouth || 'smile';
  if (m === 'smile') { ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(46, 30, 12, Math.PI * .2, Math.PI * .8); ctx.stroke(); }
  else { const o = m === 'talk' ? (Math.sin((p.t || 0) * 22) + 1) / 2 : 1; ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(50, 36, 9, 4 + 7 * o, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (p.skip !== 'nearArm') arm(true);
  ctx.restore();
}

// ---------- 擁抱用的環抱手臂 ----------
// 從肩膀 (x1,y1) 彎過對方身體，手掌停在對方背後邊緣 (x2,y2)；bulge = 往下彎的程度（正值往下）
function drawWrapArm(ctx, x1, y1, x2, y2, shirt, skin, w = 24, bulge = 40) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + bulge;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = w + 6;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
  ctx.strokeStyle = shirt; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
  circle(ctx, x2, y2, w * .62, skin); ctx.restore();
}

// ---------- 面對面擁抱（側面）：孩子面向右、大人面向左 ----------
// 大人手臂從孩子頭後繞到背後（手掌露在孩子背後），孩子手臂環過大人的腰到背後。回傳孩子的 x。
function drawHugPair(ctx, t, adult, ax, s = 1.05, kidS = .95, o = {}) {
  const aS = s * PEOPLE[adult].h, kS = kidS * PEOPLE.kid.h;
  const sw = 3 * E.wave(t, .5), pat = o.pat ? Math.max(0, E.wave(t, 1.5)) : 0;
  const aLean = -8 + sw, kLean = 4 + sw;
  const kx = ax - (30 * aS + 80 * kS) - 20;
  drawSide(ctx, adult, ax, 790, s, { t, flip: true, lean: aLean, tilt: 14, eyes: 'happy', mouth: o.adultMouth || 'smile', skip: 'nearArm', farArm: 40 });
  const [shX, shY] = sideShoulder(adult, ax, 790, s, { flip: true, lean: aLean });
  drawSide(ctx, 'kid', kx, 790, kidS, { t, lean: kLean, tilt: -6, eyes: 'happy', mouth: 'open', skip: 'nearArm', farArm: 15 });
  // 孩子近側的手：環過大人的腰，手掌在大人背後
  drawWrapArm(ctx, kx + 4 * kS, 790 - 153 * kS, ax + 30 * aS + 6, 790 - 88 * aS, PEOPLE.kid.shirt, PEOPLE.kid.skin, 21, 18);
  // 大人近側的手：肩膀 → 沿身側往下的上臂 → 腰部高度的手肘 → 前臂環過孩子的腰 → 手掌在孩子背上（整隻手連在一起、不擋臉）
  const elbow = [shX - 10, 790 - 100 * aS];
  const hand = [kx - 30 * kS - 6, 790 - 92 * kS - 8 * pat];
  drawElbowArm(ctx, [shX, shY], elbow, hand, PEOPLE[adult].shirt, PEOPLE[adult].skin, 24);
  circle(ctx, shX, shY, 16, PEOPLE[adult].shirt);           // 肩膀圓頭：手臂從身體長出來
  return kx;
}

// 兩節手臂（指定手肘位置）：肩 → 肘 → 手，線條相連、圓角
function drawElbowArm(ctx, sh, el, hd, shirt, skin, w = 24) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = w + 6;
  ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...el); ctx.lineTo(...hd); ctx.stroke();
  ctx.strokeStyle = shirt; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...el); ctx.lineTo(...hd); ctx.stroke();
  circle(ctx, hd[0], hd[1], w * .62, skin); ctx.restore();
}

// 側面人物近側肩膀的世界座標（和 drawSide 用同一套平移、翻轉、傾斜），手臂一定從這裡長出來
function sideShoulder(who, x, y, s, p = {}) {
  const sp = PEOPLE[who], S = s * (sp.h || 1), F = p.flip ? -1 : 1;
  const a = F * (p.lean || 0) * Math.PI / 180;
  const lx = 4 * S * F, ly = -153 * S;                       // 縮放＋翻轉後、旋轉前
  const rx = lx * Math.cos(a) - ly * Math.sin(a), ry = lx * Math.sin(a) + ly * Math.cos(a);
  return [x + rx, y + (p.bob || 0) + (p.sit ? 70 * S : 0) + ry];
}
