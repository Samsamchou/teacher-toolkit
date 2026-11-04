// my grandma 的 5 句。u = 從 "because" 開始算的秒數。
// 原則（同 scenes_mom.js）：手一定碰到它在操作的東西，手臂與道具不擋臉，兩人頭不重疊，坐姿小腿從座面前緣垂下。
window.TARGETS = window.TARGETS || {};
window.SCENES = window.SCENES || {};

TARGETS.grandma = {
  color: '#9575cd',
  draw(ctx, x, y, s, t, k) { drawPerson(ctx, 'grandma', x, y, s, { t, armR: 20 + 32 * Math.max(0, E.wave(t, 1.1)) * k, mouth: 'smile', blinkSeed: 2 }); },
};

// ---------- 奶奶專用小工具 ----------
// 依 engine.js 的手臂規則算出「手實際會畫在哪」（搆不到時會被夾在手臂長度內）
function grandma_hand(who, x, y, s, p, side, target) {
  const S = s * (PEOPLE[who].h || 1), f = p.flip ? -1 : 1;
  const sx = x + side * 40 * S * f, sy = y + (p.bob || 0) + ((p.sit ? 62 : 0) - 153) * S;
  let dx = target[0] - sx, dy = target[1] - sy; const d = Math.hypot(dx, dy), m = 85 * S;
  if (d > m) { dx *= m / d; dy *= m / d; }
  return [sx + dx, sy + dy];
}
// 手臂補畫（人坐在桌子後面、手伸到桌面上：桌子畫完後，把桌面線以下的手臂補畫在桌面上）
function grandma_armOverlay(ctx, who, x, y, s, p, side, target, clipY = 610) {
  if (!target) return;
  const sp = PEOPLE[who], S = s * (sp.h || 1), f = p.flip ? -1 : 1, Lu = 44, Lf = 42;
  const oy = y + (p.bob || 0), sit = p.sit ? 62 : 0;
  const W2 = (lx, ly) => [x + lx * S * f, oy + (ly + sit) * S];
  const sx = side * 40, sy = -153;
  let hx = (target[0] - x) / (S * f), hy = (target[1] - oy) / S - sit;
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy); const maxD = Lu + Lf - 1;
  if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
  hx = sx + dx; hy = sy + dy;
  const base = Math.atan2(dy, dx), off = Math.acos(E.clamp((Lu * Lu + d * d - Lf * Lf) / (2 * Lu * d || 1), -1, 1));
  const e1 = [sx + Lu * Math.cos(base + off), sy + Lu * Math.sin(base + off)], e2 = [sx + Lu * Math.cos(base - off), sy + Lu * Math.sin(base - off)];
  const el = (side * e1[0] + e1[1] * .3) > (side * e2[0] + e2[1] * .3) ? e1 : e2;
  const a = W2(sx, sy), b = W2(el[0], el[1]), c = W2(hx, hy);
  ctx.save(); ctx.beginPath(); ctx.rect(0, clipY, W, 400); ctx.clip();
  ctx.strokeStyle = sp.shirt; ctx.lineWidth = 20 * S; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
  ctx.restore();
  circle(ctx, c[0], c[1], 13 * S, sp.skin);
  return c;
}
// 隔熱手套（畫在手的位置上）
function grandma_mitt(ctx, x, y, ang = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = '#e53935'; rr(ctx, -17, -20, 34, 40, 15); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-17, 0, 9, 13, -.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; rr(ctx, -18, 14, 36, 11, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; circle(ctx, 4, -6, 4, 'rgba(255,255,255,.4)'); circle(ctx, -4, 4, 3, 'rgba(255,255,255,.4)');
  ctx.restore();
}
// 搖椅：y = 座面高度
function grandma_rocker(ctx, x, y) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8d5a3b'; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(x - 95, y - 250); ctx.lineTo(x - 88, y + 6); ctx.moveTo(x + 95, y - 250); ctx.lineTo(x + 88, y + 6); ctx.stroke();
  ctx.fillStyle = '#a1694a'; rr(ctx, x - 105, y - 268, 210, 30, 14); ctx.fill();
  ctx.fillStyle = '#b39ddb'; rr(ctx, x - 82, y - 240, 164, 220, 30); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 3; i++) circle(ctx, x - 40 + i * 40, y - 170 + (i % 2) * 40, 10, 'rgba(255,255,255,.3)');
  // 腳與弧形搖桿
  ctx.strokeStyle = '#8d5a3b'; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(x - 80, y + 10); ctx.lineTo(x - 70, 768); ctx.moveTo(x + 80, y + 10); ctx.lineTo(x + 70, 768); ctx.stroke();
  ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x - 160, 752); ctx.quadraticCurveTo(x, 812, x + 160, 752); ctx.stroke();
  ctx.fillStyle = '#a1694a'; rr(ctx, x - 112, y - 8, 224, 30, 14); ctx.fill();
  ctx.fillStyle = '#ce93d8'; rr(ctx, x - 104, y - 18, 208, 22, 11); ctx.fill();
}
// 圓坐墊（腳凳）：y = 座面高度
function grandma_pouf(ctx, x, y) {
  const g = ctx.createLinearGradient(0, y, 0, 790); g.addColorStop(0, '#ffb74d'); g.addColorStop(1, '#ef8f2f');
  ctx.fillStyle = g; rr(ctx, x - 85, y, 170, 790 - y, 26); ctx.fill();
  ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.ellipse(x, y + 4, 85, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 85, y + 46); ctx.lineTo(x + 85, y + 46); ctx.stroke();
}
// 雲朵形狀（說故事泡泡）
function grandma_cloudPath(ctx, w, h, pad = 0) {
  ctx.beginPath(); ctx.ellipse(0, 0, w / 2 - 30 + pad, h / 2 - 26 + pad, 0, 0, Math.PI * 2);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, bx = Math.cos(a) * (w / 2 - 46), by = Math.sin(a) * (h / 2 - 40), r = 44 + 8 * (i % 2) + pad;
    ctx.moveTo(bx + r, by); ctx.arc(bx, by, r, 0, Math.PI * 2);
  }
}
// 小龍（面向右；dir=-1 面向左）
function grandma_dragon(ctx, x, y, s, dir, t, fire = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  const flap = Math.sin(t * 9);
  // 尾巴
  ctx.strokeStyle = '#43a047'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-30, 4); ctx.quadraticCurveTo(-62, 14 + Math.sin(t * 5) * 8, -78, -6); ctx.stroke();
  ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.moveTo(-78, -6); ctx.lineTo(-92, -16); ctx.lineTo(-86, 4); ctx.fill();
  // 後翅膀
  ctx.fillStyle = '#7cb342'; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-30, -10 - 44 * flap); ctx.lineTo(10, -14); ctx.fill();
  // 身體
  ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.ellipse(0, 0, 36, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c5e1a5'; ctx.beginPath(); ctx.ellipse(4, 8, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
  // 脖子與頭
  ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(40, -22); ctx.stroke();
  ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.ellipse(50, -26, 20, 14, .1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.moveTo(38, -36); ctx.lineTo(34, -52); ctx.lineTo(46, -38); ctx.fill();
  circle(ctx, 54, -30, 4.5, '#1b1b1b'); circle(ctx, 55.5, -31.5, 1.6, '#fff');
  // 前翅膀
  ctx.fillStyle = '#9ccc65'; ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(-14, -14 - 56 * flap); ctx.lineTo(22, -40 * flap - 8); ctx.lineTo(18, -12); ctx.fill();
  // 噴火（小小的、可愛的）
  if (fire > 0) {
    for (let i = 0; i < 5; i++) {
      const k = ((t * 3 + i / 5) % 1);
      ctx.save(); ctx.globalAlpha = fire * (1 - k);
      circle(ctx, 70 + k * 70, -26 + Math.sin(i * 2 + t * 10) * 6 * k, 8 + k * 14, i % 2 ? '#ff7043' : '#ffca28');
      ctx.restore();
    }
  }
  ctx.restore();
}
function grandma_castle(ctx, x, y, t, lit = 0) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#9fa8da'; ctx.fillRect(-60, -40, 120, 80);
  ctx.fillStyle = '#7986cb'; ctx.fillRect(-86, -86, 40, 126); ctx.fillRect(46, -86, 40, 126); ctx.fillRect(-18, -70, 36, 40);
  for (let i = 0; i < 5; i++) ctx.fillRect(-60 + i * 26, -50, 16, 12);
  ctx.fillStyle = '#ef5350';
  [[-66, -86], [66, -86], [0, -70]].forEach(([cx, cy], i) => { const w = i === 2 ? 24 : 28; ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.lineTo(cx + w, cy); ctx.lineTo(cx, cy - 46); ctx.fill(); });
  ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.moveTo(0, -116); ctx.quadraticCurveTo(14, -122 + Math.sin(t * 6) * 4, 28, -116); ctx.lineTo(28, -104); ctx.quadraticCurveTo(14, -110 + Math.sin(t * 6 + 1) * 4, 0, -104); ctx.fill();
  ctx.strokeStyle = '#5c6bc0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -116); ctx.lineTo(0, -98); ctx.stroke();
  const win = `rgba(255,224,130,${.55 + .45 * lit})`;
  ctx.fillStyle = win; [[-72, -60], [60, -60], [-72, -20], [60, -20]].forEach(([wx, wy]) => { rr(ctx, wx, wy, 12, 18, 6); ctx.fill(); });
  ctx.fillStyle = '#5c4033'; ctx.beginPath(); ctx.moveTo(-16, 40); ctx.lineTo(-16, 8); ctx.arc(0, 8, 16, Math.PI, 0); ctx.lineTo(16, 40); ctx.fill();
  if (lit > 0) glow(ctx, 0, -20, 130, 'rgba(255,230,140,.6)', lit);
  ctx.restore();
}
// 雨傘：手握在 (hx, hy)，傘往左傾 tilt（弧度，負值 = 左邊低）
function grandma_umbrellaFrame(hx, hy, tilt, len) {
  const tx = hx + len * Math.sin(tilt), ty = hy - len * Math.cos(tilt);
  return { hx, hy, tx, ty, tilt };
}
function grandma_umbrella(ctx, F, rx, ry, t) {
  // 傘柄（彎鉤在手下方）
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(F.tx, F.ty); ctx.lineTo(F.hx, F.hy);
  const dx = F.hx - F.tx, dy = F.hy - F.ty, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const ex = F.hx + ux * 26, ey = F.hy + uy * 26; ctx.lineTo(ex, ey); ctx.stroke();
  ctx.beginPath(); ctx.arc(ex - uy * 14, ey + ux * 14, 14, Math.atan2(uy, ux) - Math.PI / 2 - Math.PI, Math.atan2(uy, ux) - Math.PI / 2 + .2, true); ctx.stroke();
  ctx.restore();
  // 傘面
  ctx.save(); ctx.translate(F.tx, F.ty); ctx.rotate(F.tilt);
  const n = 6, cols = ['#9575cd', '#ce93d8'];
  const rim = i => -rx + i * 2 * rx / n;
  const dome = () => { ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2); for (let i = n; i > 0; i--) ctx.quadraticCurveTo((rim(i) + rim(i - 1)) / 2, -16, rim(i - 1), 0); ctx.closePath(); };
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.save(); ctx.translate(0, 6); dome(); ctx.fill(); ctx.restore();
  dome(); ctx.save(); ctx.clip();
  for (let i = 0; i < n; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(0, -ry - 4); ctx.lineTo(rim(i) * 1.6, 20); ctx.lineTo(rim(i + 1) * 1.6, 20); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = '#6a4fa3'; ctx.lineWidth = 3; for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(0, -ry); ctx.quadraticCurveTo(rim(i) * .8, -ry * .6, rim(i), 0); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-rx * .35, -ry * .55, rx * .25, ry * .18, -.3, 0, Math.PI * 2); ctx.fill();
  circle(ctx, 0, -ry - 6, 9, '#5d4037');
  ctx.restore();
}
function grandma_underUmbrella(F, rx, ry, px, py) {
  const dx = px - F.tx, dy = py - F.ty, c = Math.cos(F.tilt), s = Math.sin(F.tilt);
  const lx = dx * c + dy * s, ly = -dx * s + dy * c;
  if (Math.abs(lx) >= rx) return false;
  return ly > -ry * Math.sqrt(1 - (lx / rx) ** 2);
}
// 骰子（pips = 點數，用圓點畫，不是數字）
function grandma_die(ctx, x, y, s, rot, pips) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = '#ffffff'; rr(ctx, -16, -16, 32, 32, 7); ctx.fill(); ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 2.5; ctx.stroke();
  const P = { 1: [[0, 0]], 2: [[-8, -8], [8, 8]], 3: [[-8, -8], [0, 0], [8, 8]], 4: [[-8, -8], [8, -8], [-8, 8], [8, 8]], 5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]], 6: [[-8, -9], [8, -9], [-8, 0], [8, 0], [-8, 9], [8, 9]] }[pips];
  P.forEach(([a, b]) => circle(ctx, a, b, 3.6, pips === 1 ? '#e53935' : '#263238'));
  ctx.restore();
}
function grandma_pawn(ctx, x, y, color, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-12, -10, -6, -14); ctx.lineTo(6, -14); ctx.quadraticCurveTo(12, -10, 14, 0); ctx.closePath(); ctx.fill();
  circle(ctx, 0, -22, 11, color); circle(ctx, -3, -25, 3.5, 'rgba(255,255,255,.6)');
  ctx.restore();
}
function grandma_crown(ctx, x, y, s) {
  if (s <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.moveTo(-40, 14); ctx.lineTo(-44, -22); ctx.lineTo(-20, -2); ctx.lineTo(0, -32); ctx.lineTo(20, -2); ctx.lineTo(44, -22); ctx.lineTo(40, 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f9a825'; ctx.lineWidth = 4; ctx.stroke();
  circle(ctx, 0, 2, 6, '#e53935'); circle(ctx, -24, 6, 5, '#42a5f5'); circle(ctx, 24, 6, 5, '#66bb6a');
  ctx.restore();
}

// 1. she tells me stories
SCENES.grandma_1 = {
  dur: 8.5, sfx: [[0.4, 'pop'], [1.0, 'sparkle'], [2.2, 'whoosh'], [3.8, 'whoosh'], [4.2, 'boing'], [5.6, 'chime'], [5.9, 'sparkle'], [6.6, 'heart']],
  draw(ctx, u) {
    BG.room(ctx, u, '#ffe8cc', '#b07a4c', '#ffdcb5'); BG.window(ctx, 250, 150, 240, 200, u, 1);
    // 地毯
    ctx.fillStyle = '#d1c4e9'; ctx.beginPath(); ctx.ellipse(640, 795, 420, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b39ddb'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(640, 795, 380, 34, 0, 0, Math.PI * 2); ctx.stroke();
    const end = E.seg(u, 5.5, 6.0);
    // 奶奶坐在搖椅上慢慢搖，邊講邊比手勢（手勢往泡泡方向，在臉的外側）
    const gx = 490, seat = 690, rock = 2.2 * Math.sin(u * 2.2);
    ctx.save(); ctx.translate(gx, 790); ctx.rotate(rock * Math.PI / 180); ctx.translate(-gx, -790);
    grandma_rocker(ctx, gx, seat);
    drawPerson(ctx, 'grandma', gx, seat, 1.0, {
      t: u, sit: true, blinkSeed: 2, mouth: u < 6.2 ? 'talk' : 'smile', eyes: end > .5 ? 'happy' : 'open', tilt: 4,
      reachL: [gx - 30, 684], armR: 118 + 26 * Math.max(0, E.wave(u, .6)),
    });
    ctx.restore();
    // 孩子坐在圓坐墊上專心聽
    const kx = 785, kseat = 700;
    grandma_pouf(ctx, kx, kseat);
    const clap = u > 5.8 ? Math.abs(E.wave(u, 1.6)) : 0;
    const wow = u > 3.8 && u < 5.5;
    drawPerson(ctx, 'kid', kx, kseat, 1.0, {
      t: u, sit: true, swing: 1, tilt: -6, eyes: end > .5 ? 'happy' : 'open', mouth: end > .5 ? 'open' : (wow ? 'open' : 'o'),
      bob: wow ? -6 * Math.abs(E.wave(u, 1.5)) : 0,
      reachL: u > 5.8 ? [kx - 6 - 20 * clap, 640] : [kx - 26, 690], reachR: u > 5.8 ? [kx + 6 + 20 * clap, 640] : [kx + 26, 690],
    });
    // 從奶奶頭邊冒出的小泡泡 → 大故事泡泡
    const bk = E.pop(u, .4, .6);
    const bx = 1125, by = 440, bw = 450, bh = 290;
    [[590, 396, 10, .1], [650, 368, 14, .22], [730, 350, 18, .34], [822, 352, 22, .46]].forEach(([x, y, r, d]) => {
      const k = E.pop(u, d, .35); if (k > 0) { circle(ctx, x, y + 3, r * k + 3, 'rgba(120,90,160,.25)'); circle(ctx, x, y, r * k, '#ffffff'); }
    });
    if (bk > 0) {
      ctx.save(); ctx.translate(bx, by); ctx.scale(bk, bk);
      glow(ctx, 0, 0, 330, 'rgba(255,240,200,.7)');
      ctx.fillStyle = 'rgba(120,90,160,.28)'; ctx.save(); ctx.translate(0, 8); grandma_cloudPath(ctx, bw, bh, 6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ffffff'; grandma_cloudPath(ctx, bw, bh); ctx.fill();
      // 故事小劇場（裁在泡泡裡）
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, bw / 2 - 34, bh / 2 - 30, 0, 0, Math.PI * 2); ctx.clip();
      const sky = ctx.createLinearGradient(0, -130, 0, 130); sky.addColorStop(0, '#283593'); sky.addColorStop(1, '#7e57c2');
      ctx.fillStyle = sky; ctx.fillRect(-240, -150, 480, 300);
      for (let i = 0; i < 14; i++) sparkle(ctx, -200 + E.rand(i + 40) * 400, -110 + E.rand(i + 60) * 120, 6, .4 + .6 * Math.abs(Math.sin(u * 2 + i)));
      circle(ctx, 140, -70, 28, '#fff59d'); circle(ctx, 152, -78, 24, '#3f3a8f');
      ctx.fillStyle = '#558b2f'; ctx.beginPath(); ctx.ellipse(-80, 140, 220, 80, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#689f38'; ctx.beginPath(); ctx.ellipse(130, 150, 200, 80, 0, 0, Math.PI * 2); ctx.fill();
      // 小龍繞著城堡飛：前半圈在城堡後面（小一點），後半圈飛到前面
      const ph = u * 1.5 + 1.25, dX = Math.cos(ph) * 135, dY = -14 + Math.sin(ph) * 42, front = Math.sin(ph) > 0;
      const dir = -Math.sin(ph) >= 0 ? 1 : -1;
      const fire = E.seg(u, 3.8, 4.1) * (1 - E.seg(u, 4.9, 5.2));
      const landK = E.easeInOut(E.seg(u, 5.3, 6.0));
      const fx = E.lerp(dX, 76, landK), fy = E.lerp(dY, -150, landK);
      const dragon = () => grandma_dragon(ctx, fx - 10, fy, (front || landK > 0 ? 1.15 : .85) * (1 - .15 * landK), landK > .5 ? -1 : dir, u, fire);
      if (!front && landK === 0) dragon();
      grandma_castle(ctx, -10, 50, u, end);
      if (front || landK > 0) dragon();
      // 圓滿結局：城堡上空開出愛心煙火
      if (end > 0) {
        for (let i = 0; i < 3; i++) FX.burst(ctx, u, -120 + i * 120, -80 + (i % 2) * 30, 5.7 + i * .35, 12, 5 + i);
        FX.floatHearts(ctx, u, 0, 60, 6, 300, 21, 6.0);
      }
      ctx.restore();
      ctx.restore();
    }
    if (end > 0) { FX.sparkles(ctx, u, kx, 470, 150, 8, 13); }
  },
};

// 2. she takes care of me（下雨了，奶奶撐傘、幫我圍圍巾）
SCENES.grandma_2 = {
  dur: 8.5, sfx: [[0.1, 'whoosh'], [1.0, 'whoosh'], [2.4, 'pop'], [3.2, 'whoosh'], [4.6, 'chime'], [5.0, 'heart'], [5.3, 'sparkle']],
  draw(ctx, u) {
    BG.sky(ctx, u, '#6f86a6', '#c7d3e0');
    // 遠方的樹與房子
    ctx.fillStyle = '#90a4ae'; rr(ctx, 1150, 470, 260, 200, 10); ctx.fill(); ctx.fillStyle = '#78909c'; ctx.beginPath(); ctx.moveTo(1130, 480); ctx.lineTo(1280, 380); ctx.lineTo(1430, 480); ctx.fill();
    ctx.fillStyle = '#ffe082'; rr(ctx, 1190, 520, 60, 50, 6); ctx.fill(); rr(ctx, 1310, 520, 60, 50, 6); ctx.fill();
    [[260, 560, '#e07a3a'], [380, 600, '#c96a2f'], [1500, 580, '#d9822b']].forEach(([x, y, c]) => { ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - 10, y, 20, 670 - y); circle(ctx, x, y - 30, 90, c); circle(ctx, x - 50, y + 10, 60, c); circle(ctx, x + 50, y + 10, 60, c); });
    const g = ctx.createLinearGradient(0, 660, 0, 900); g.addColorStop(0, '#7cb342'); g.addColorStop(1, '#558b2f'); ctx.fillStyle = g; ctx.fillRect(0, 660, W, 400);
    ctx.fillStyle = '#b0bec5'; ctx.fillRect(0, 760, W, 70);
    // 水窪
    ctx.fillStyle = 'rgba(144,202,249,.7)'; ctx.beginPath(); ctx.ellipse(470, 800, 90, 14, 0, 0, Math.PI * 2); ctx.fill();
    // 烏雲
    for (let i = 0; i < 6; i++) { const cx = 150 + i * 260 + Math.sin(u * .5 + i) * 20; circle(ctx, cx, 240, 80, '#546e7a'); circle(ctx, cx + 70, 220, 70, '#607d8b'); circle(ctx, cx - 60, 250, 60, '#607d8b'); }

    const kx = 640;
    const gIn = E.easeOut(E.seg(u, .4, 2.3)), gx = E.lerp(1560, kx + 145, gIn);
    const walking = gIn > 0 && gIn < 1, gbob = walking ? -Math.abs(E.wave(u, 2.6)) * 9 : 0;
    const covered = E.seg(u, 2.0, 2.4);
    const wrap = E.seg(u, 3.1, 4.5);            // 圍巾圍上的進度
    const warm = E.seg(u, 4.5, 5.0);
    // 奶奶面向左（flip），遠側（畫面右）的手撐傘，傘往孩子那邊斜；近側的手幫孩子圍圍巾
    const gs = .9, ks = .88;
    const gp = { flip: true, bob: gbob };
    const farT = [gx + 82, 622];
    const hFar = grandma_hand('grandma', gx, 790, gs, gp, -1, farT);
    const F = grandma_umbrellaFrame(hFar[0], hFar[1], -.22, 228);
    const RX = 300, RY = 82;
    const c0 = Math.cos(F.tilt), s0 = Math.sin(F.tilt);
    const rimL = [F.tx - RX * c0, F.ty - RX * s0], rimR = [F.tx + RX * c0, F.ty + RX * s0];
    const sheltered = (px, py) => {
      if (px <= rimL[0] || px >= rimR[0]) return false;
      const q = (px - rimL[0]) / (rimR[0] - rimL[0]);
      return py > E.lerp(rimL[1], rimR[1], q) - RY * .95 * Math.sqrt(1 - (2 * q - 1) ** 2);
    };
    if (warm > 0) glow(ctx, kx + 30, 580, 300, 'rgba(255,200,120,.8)', warm);
    grandma_umbrella(ctx, F, RX, RY, u);
    // 近側的手：先拿著圍巾 → 在孩子脖子前繞一圈 → 圍好後輕放在孩子肩上
    let nearT;
    if (u < 3.1) nearT = [gx - 60, 700];
    else if (wrap < 1) { const a = wrap * Math.PI * 2; nearT = [kx + 30 + Math.cos(a) * 24, 652 + Math.sin(a) * 8]; }
    else nearT = [kx + 40, 668];
    const shiver = (1 - warm) * E.wave(u, 7) * 3;
    drawPerson(ctx, 'kid', kx + shiver, 790, ks, {
      t: u, eyes: warm > .5 ? 'happy' : 'open', mouth: warm > .5 ? 'open' : (covered > .5 ? 'o' : 'sad'),
      reachL: warm > .5 ? null : [kx + 20, 690], reachR: warm > .5 ? null : [kx - 20, 690], armL: 14, armR: 14, armFrontL: true, armFrontR: true,
      tilt: -4,
    });
    // 圍巾（紅色條紋）：圍上去的長度隨進度增加，尾巴垂在胸前
    if (u > 3.1) {
      const w = 92 * Math.min(1, wrap * 1.4);
      ctx.save(); ctx.translate(kx + shiver, 0);
      ctx.fillStyle = '#e53935'; rr(ctx, 46 - w, 636, w, 24, 11); ctx.fill();
      ctx.fillStyle = '#ffeb3b'; for (let i = 0; i < 4; i++) if (46 - w < 28 - i * 22) ctx.fillRect(28 - i * 22, 636, 7, 24);
      const tail = E.seg(wrap, .6, 1);
      if (tail > 0) { ctx.fillStyle = '#e53935'; rr(ctx, 14, 648, 24, 64 * tail, 10); ctx.fill(); ctx.fillStyle = '#ffeb3b'; if (tail > .6) ctx.fillRect(14, 648 + 64 * tail - 16, 24, 6); }
      ctx.restore();
    }
    // 尚未圍上時，圍巾掛在奶奶手上
    drawPerson(ctx, 'grandma', gx, 790, gs, {
      t: u, flip: true, bob: gbob, blinkSeed: 2, mouth: u > 2.4 ? 'smile' : 'open', eyes: warm > .5 ? 'happy' : 'open',
      reachL: farT, reachR: nearT, armFrontR: true,
      itemR: u < 3.1 ? (c => { c.fillStyle = '#c62828'; rr(c, -4, -4, 26, 84, 10); c.fill(); c.fillStyle = '#e53935'; rr(c, -24, -4, 26, 96, 10); c.fill(); c.fillStyle = '#ffeb3b'; c.fillRect(-24, 30, 26, 7); c.fillRect(-24, 62, 26, 7); c.fillRect(-4, 50, 26, 7); }) : null, itemAngR: 0,
    });
    // 雨：傘下面淋不到
    ctx.save(); ctx.strokeStyle = 'rgba(225,240,255,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 130; i++) {
      const sp = 900 + 300 * E.rand(i + 7), y = ((E.rand(i + 3) * 760 + u * sp) % 760) + 230, x = E.rand(i) * 1500 + 50 - (y - 230) * .06;
      if (sheltered(x, y) || sheltered(x + 2, y - 30)) continue;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 30); ctx.stroke();
    }
    // 打在傘面與地面的水花
    for (let i = 0; i < 12; i++) {
      const k = (u * 2.2 + E.rand(i + 30)) % 1, lx = (E.rand(i + 11) - .5) * 1.7 * RX;
      const ly = -RY * Math.sqrt(1 - (lx / RX) ** 2);
      const px = F.tx + lx * c0 - ly * s0, py = F.ty + lx * s0 + ly * c0;
      ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(px, py - 4, 6 + k * 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      const gx2 = 250 + E.rand(i + 70) * 1100; if (!sheltered(gx2, 790)) { ctx.beginPath(); ctx.ellipse(gx2, 790 + (i % 3) * 8, 6 + k * 18, 2 + k * 4, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
    // 淋濕時：頭上滴水
    if (covered < 1) for (let i = 0; i < 3; i++) { const k = (u * 1.3 + i * .33) % 1; ctx.save(); ctx.globalAlpha = (1 - covered) * (1 - k); ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(kx - 60 + i * 60, 520 + k * 60, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // 冷得發抖的線條
    if (warm < 1) { ctx.save(); ctx.globalAlpha = 1 - warm; ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 5; ctx.lineCap = 'round'; [-1, 1].forEach(sd => { for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.moveTo(kx + sd * (78 + j * 14), 600 + j * 30); ctx.lineTo(kx + sd * (86 + j * 14), 618 + j * 30); ctx.stroke(); } }); ctx.restore(); }
    // 變暖和：愛心、星星
    if (warm > 0) {
      FX.burst(ctx, u, kx, 500, 4.6); FX.floatHearts(ctx, u, kx + 70, 520, 6, 240, 17, 4.8); FX.sparkles(ctx, u, kx, 580, 190, 10, 9);
    }
  },
};

// 3. she gives me hugs
SCENES.grandma_3 = {
  dur: 8.5, sfx: [[0.2, 'whoosh'], [0.7, 'pop'], [1.8, 'bounce'], [2.0, 'heart'], [2.9, 'heart'], [3.5, 'sparkle'], [4.6, 'heart'], [5.4, 'chime']],
  draw(ctx, u) {
    BG.sky(ctx, u, '#ffcf99', '#fff1d6');
    // 奶奶家的門廊
    ctx.fillStyle = '#ffccbc'; rr(ctx, 1080, 300, 420, 420, 10); ctx.fill();
    ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.moveTo(1050, 320); ctx.lineTo(1290, 180); ctx.lineTo(1530, 320); ctx.fill();
    ctx.fillStyle = '#a1694a'; rr(ctx, 1200, 470, 130, 250, 12); ctx.fill(); circle(ctx, 1310, 600, 8, '#ffd54f');
    ctx.fillStyle = '#b3e5fc'; rr(ctx, 1360, 420, 100, 90, 8); ctx.fill();
    const g = ctx.createLinearGradient(0, 700, 0, 900); g.addColorStop(0, '#9ccc65'); g.addColorStop(1, '#689f38'); ctx.fillStyle = g; ctx.fillRect(0, 700, W, 300);
    ctx.fillStyle = '#d7ccc8'; ctx.beginPath(); ctx.ellipse(900, 800, 520, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(220, 440, 30, 280); circle(ctx, 235, 420, 110, '#ef8a3a'); circle(ctx, 170, 470, 70, '#e85d04'); circle(ctx, 300, 470, 70, '#f4a259');
    BG.leaves(ctx, u, 10, 23);

    const gx = 1000;
    const run = E.easeInOut(E.seg(u, .2, 1.85)), kx = E.lerp(260, gx - 150, run);
    const running = run > 0 && run < 1;
    const hug = E.seg(u, 1.8, 2.05);
    const open = E.easeOut(E.seg(u, .4, 1.1));
    const sway = hug * 2.2 * E.wave(u, .5);
    const hx = (kx + gx) / 2;
    // 暖暖的光 + 繞著兩人轉的愛心圈
    if (hug > 0) {
      FX.rays(ctx, u, hx, 520, 600, 'rgba(255,190,120,.22)', 18);
      glow(ctx, hx, 540, 420, 'rgba(255,170,190,.75)', hug);
      for (let i = 0; i < 10; i++) {
        const a = u * .9 + i / 10 * Math.PI * 2, r = E.pop(u, 2.0 + i * .06, .5);
        if (r > 0) heart(ctx, hx + Math.cos(a) * 270, 540 + Math.sin(a) * 190, 30 * r, i % 2 ? '#ff7aa8' : '#ffb3c7');
      }
    }
    // 跑過去（正面）→ 擁抱（側面、面對面）：雙手環抱對方的背，孩子臉貼在奶奶胸前，奶奶身體微微後仰低頭看孩子
    const patting = u > 2.6 && u < 7;
    const pat = patting ? Math.max(0, E.wave(u, 1.5)) : 0;
    if (hug < .5) {
      drawPerson(ctx, 'grandma', gx, 790, 1.05, { t: u, flip: true, blinkSeed: 2, mouth: 'open', armL: E.lerp(12, 118, open), armR: E.lerp(12, 118, open) });
      drawPerson(ctx, 'kid', kx, 790, 1.05, {
        t: u, bob: running ? -Math.abs(E.wave(u, 3)) * 16 : 0,
        legL: running ? 26 * E.wave(u, 3) : 0, legR: running ? -26 * E.wave(u, 3) : 0,
        mouth: 'open', armL: 95 + 10 * E.wave(u, 3), armR: 95,
      });
    } else {
      drawHugPair(ctx, u, 'grandma', gx, 1.05, .95, { pat: true });
    }
    if (patting) {
      for (let i = 0; i < 7; i++) {
        const st = 2.85 + i * (1 / 1.5); const k = E.seg(u, st, st + .6); if (k <= 0 || k >= 1) continue;
        ctx.save(); ctx.globalAlpha = 1 - k; heart(ctx, gx - 175 - 20 * k, 690 - 30 * k, 20 + 26 * E.easeOut(k), '#ff5d8f', '#fff'); ctx.restore();
      }
    }
    if (hug > 0) { FX.burst(ctx, u, hx, 360, 1.95); FX.sparkles(ctx, u, hx, 520, 330, 12, 4); }
  },
};

// 4. she makes yummy food（奶奶烤餅乾）
SCENES.grandma_4 = {
  dur: 9, sfx: [[0.2, 'sizzle'], [1.1, 'ding'], [1.6, 'whoosh'], [2.0, 'sizzle'], [3.6, 'pop'], [4.3, 'pop'], [5.1, 'yum'], [5.3, 'chime'], [5.6, 'sparkle']],
  draw(ctx, u) {
    BG.room(ctx, u, '#fff3d6', '#d9a066', '#ffe7b8'); BG.window(ctx, 1150, 150, 260, 200, u);
    // 吊櫃
    ctx.fillStyle = '#ffcc80'; rr(ctx, 250, 250, 340, 130, 14); ctx.fill(); ctx.fillStyle = '#ffb74d'; rr(ctx, 262, 262, 152, 106, 10); ctx.fill(); rr(ctx, 426, 262, 152, 106, 10); ctx.fill();
    // 嵌入式烤箱（在奶奶胸口高度，手搆得到）
    const ox = 420;
    ctx.fillStyle = '#ffcc80'; rr(ctx, ox - 150, 700, 300, 90, 10); ctx.fill();
    ctx.fillStyle = '#cfd8dc'; rr(ctx, ox - 140, 500, 280, 205, 14); ctx.fill();
    ctx.fillStyle = '#90a4ae'; rr(ctx, ox - 140, 500, 280, 34, 12); ctx.fill();
    circle(ctx, ox - 100, 517, 9, '#455a64'); circle(ctx, ox - 70, 517, 9, '#455a64');
    // 計時鈴
    const ring = E.seg(u, 1.0, 1.6);
    ctx.save(); ctx.translate(ox + 95, 517); ctx.rotate(ring > 0 && ring < 1 ? Math.sin(u * 50) * .35 : 0);
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(0, 4, 12, Math.PI, 0); ctx.lineTo(13, 8); ctx.lineTo(-13, 8); ctx.fill(); circle(ctx, 0, 10, 4, '#f9a825'); ctx.restore();
    if (ring > 0 && ring < 1) for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalAlpha = 1 - ring; ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ox + 95, 517, 20 + i * 12 + ring * 20, -Math.PI * .9, -Math.PI * .1); ctx.stroke(); ctx.restore(); }
    // 烤箱內部
    ctx.fillStyle = '#3e2723'; rr(ctx, ox - 120, 546, 240, 146, 10); ctx.fill();
    glow(ctx, ox, 630, 150, 'rgba(255,140,40,.9)');
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ox - 116, 664); ctx.lineTo(ox + 116, 664); ctx.stroke();
    // 烤盤與餅乾：先在烤箱裡 → 拉出來 → 端到桌上
    const pull = E.easeInOut(E.seg(u, 2.0, 2.6)), carry = E.easeInOut(E.seg(u, 2.8, 3.9));
    const gx = E.lerp(610, 840, carry);
    const trayX = E.lerp(E.lerp(ox, ox + 125, pull), 930, carry);
    const trayY = E.lerp(660, 642, carry) - Math.sin(carry * Math.PI) * 20;
    const puff = E.seg(u, 0, 1.4);
    const drawTray = (cx, cy, taken) => {
      ctx.fillStyle = '#90a4ae'; rr(ctx, cx - 52, cy - 6, 104, 12, 5); ctx.fill();
      ctx.fillStyle = '#b0bec5'; rr(ctx, cx - 60, cy - 10, 10, 14, 4); ctx.fill(); rr(ctx, cx + 50, cy - 10, 10, 14, 4); ctx.fill();
      for (let i = 0; i < 4; i++) if (!(taken && i === 3)) PROP.cookie(ctx, cx - 36 + i * 24, cy - 14, 9 + 2 * puff);
    };
    // 門：上掀到下翻（打開後只看到底下一條門板）
    const doorK = E.easeInOut(E.seg(u, 1.5, 1.95));
    const inOven = carry < .05;
    if (inOven) drawTray(trayX, trayY, false);
    if (doorK < 1) {
      const h = 160 * (1 - doorK);
      ctx.fillStyle = '#b0bec5'; rr(ctx, ox - 130, 700 - h - 4, 260, h + 4, 12); ctx.fill();
      ctx.fillStyle = 'rgba(255,170,80,.55)'; if (h > 40) { rr(ctx, ox - 100, 700 - h + 26, 200, h - 56, 10); ctx.fill(); }
      ctx.fillStyle = '#607d8b'; rr(ctx, ox - 90, 700 - h + 6, 180, 12, 6); ctx.fill();
    }
    if (doorK > 0) { ctx.fillStyle = '#b0bec5'; rr(ctx, ox - 140, 698, 280, 22 * doorK, 6); ctx.fill(); }
    // 香味飄到孩子那邊
    if (u < 2.0) {
      ctx.save(); ctx.globalAlpha = E.seg(u, .2, .8) * (1 - E.seg(u, 1.6, 2.0));
      for (let i = 0; i < 2; i++) { ctx.strokeStyle = ['#ffb74d', '#ffd54f'][i]; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); for (let j = 0; j <= 30; j++) { const k = j / 30, x = ox + 60 + k * 590, y = 540 - k * 30 + Math.sin(k * 10 - u * 5 + i * 2) * 20 - i * 26; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.restore();
    }
    if (doorK > .5) FX.steam(ctx, u, trayX, trayY - 20, 3, 'rgba(255,255,255,.85)', 110);
    // 桌子在烤箱右邊
    PROP.table(ctx, 1010, 650, 270);
    const onTable = u > 3.9;
    const took = u > 4.3;
    // 奶奶戴隔熱手套：近側的手開門、伸進去拉烤盤，再兩手端烤盤
    const gp = { flip: false };
    let tL, tR;
    if (u < 1.45) { tL = [gx - 58, 702]; tR = [gx + 58, 702]; }
    else if (u < 2.0) { const d = E.seg(u, 1.5, 1.95); tL = [ox + 80, E.lerp(612, 690, d)]; tR = [gx + 58, 702]; if (u < 1.5) tL = [ox + 80, 612]; }
    else if (u < 2.65) { tL = [trayX + 56, trayY - 4]; tR = [gx + 58, 702]; }
    else if (!onTable) { tL = [trayX - 56, trayY - 4]; tR = [trayX + 56, trayY - 4]; }
    else { const r = E.seg(u, 3.9, 4.3); tL = [E.lerp(trayX - 56, gx - 58, r), E.lerp(trayY - 4, 702, r)]; tR = [E.lerp(trayX + 56, gx + 58, r), E.lerp(trayY - 4, 702, r)]; }
    drawPerson(ctx, 'grandma', gx, 790, 1.05, {
      t: u, apron: true, blinkSeed: 2, mouth: u > 3.9 ? 'open' : 'smile', eyes: u > 5.2 ? 'happy' : 'open',
      bob: carry > 0 && carry < 1 ? -Math.abs(E.wave(u, 2.5)) * 8 : 0, reachL: tL, reachR: tR,
    });
    if (!inOven) drawTray(trayX, trayY, took);
    grandma_mitt(ctx, ...grandma_hand('grandma', gx, 790, 1.05, gp, -1, tL), .1);
    grandma_mitt(ctx, ...grandma_hand('grandma', gx, 790, 1.05, gp, 1, tR), -.1);
    // 孩子：聞香 → 拿一塊餅乾 → 咬一口、摸肚子
    const kx = 1100;
    const cookieTray = [930 + 36, 628];
    let kL = null, kR = null, cookie = null;
    if (u > 4.0 && u < 4.35) kL = cookieTray;
    else if (u >= 4.35) { const lift = E.easeInOut(E.seg(u, 4.35, 4.9)); kL = [E.lerp(cookieTray[0], kx - 36, lift), E.lerp(cookieTray[1], 636, lift)]; }
    if (u > 5.2) kR = [kx + 6 + 12 * E.wave(u, 1.6), 702 + 6 * E.wave(u, 1.6, .25)];
    const kp = { };
    drawPerson(ctx, 'kid', kx, 790, 1.05, {
      t: u, eyes: u < 2 ? 'closed' : (u > 5.1 ? 'happy' : 'open'), mouth: u > 4.9 ? 'chew' : (u < 2 ? 'smile' : 'o'),
      bob: u < 2 ? -6 * Math.abs(E.wave(u, 1)) : (u > 5.2 ? -Math.abs(E.wave(u, 1.6)) * 8 : 0),
      reachL: kL, reachR: kR, armL: 10, armR: 10, armFrontL: true, armFrontR: true,
    });
    if (took) {
      const [cx, cy] = grandma_hand('kid', kx, 790, 1.05, { bob: u < 2 ? 0 : (u > 5.2 ? -Math.abs(E.wave(u, 1.6)) * 8 : 0) }, -1, kL);
      const bites = u > 4.95 ? (u > 6.2 ? 2 : 1) : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 40, cy - 40, 80, 80);
      if (bites > 0) ctx.arc(cx + 14, cy - 16, 11, 0, Math.PI * 2, true);
      if (bites > 1) { ctx.moveTo(cx + 22, cy); ctx.arc(cx + 22, cy, 10, 0, Math.PI * 2, true); }
      ctx.clip(); PROP.cookie(ctx, cx, cy - 8, 17); ctx.restore();
      if (u > 4.95) for (let i = 0; i < 4; i++) { const k = (u * 1.4 + i * .25) % 1; ctx.save(); ctx.globalAlpha = 1 - k; circle(ctx, kx - 20 + i * 12, 640 + k * 70, 4, '#d7a15e'); ctx.restore(); }
    }
    if (u > 5.0) {
      FX.burst(ctx, u, kx + 40, 400, 5.1, 14); FX.sparkles(ctx, u, kx + 20, 540, 160, 10, 6);
      for (let i = 0; i < 5; i++) { const a = u * 1.6 + i / 5 * Math.PI * 2; star(ctx, kx + Math.cos(a) * 140, 410 + Math.sin(a) * 28, 16 * E.pop(u, 5.2 + i * .1, .4), '#ffd54f', u * 2 + i); }
      FX.floatHearts(ctx, u, 960, 500, 5, 160, 31, 5.6);
    }
  },
};

// 5. she plays games with me（一起玩桌遊）
SCENES.grandma_5 = {
  dur: 8.5, sfx: [[0.1, 'bounce'], [0.9, 'whoosh'], [1.2, 'bounce'], [1.5, 'bounce'], [1.9, 'ding'], [2.2, 'pop'], [2.6, 'pop'], [3.0, 'pop'], [3.4, 'pop'], [3.7, 'chime'], [4.0, 'sparkle'], [4.3, 'boing']],
  draw(ctx, u) {
    BG.room(ctx, u, '#e3f2fd', '#c48b5a', '#d4e9fb'); BG.window(ctx, 1180, 140, 260, 210, u);
    // 牆上的畫框（圖形，不放字）
    ctx.fillStyle = '#ffffff'; rr(ctx, 300, 240, 200, 150, 10); ctx.fill(); ctx.fillStyle = '#a5d6a7'; ctx.fillRect(316, 256, 168, 118); circle(ctx, 440, 290, 18, '#ffe082'); ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.moveTo(316, 374); ctx.lineTo(380, 300); ctx.lineTo(450, 374); ctx.fill();
    PROP.sofa(ctx, 810, 790);                  // 座墊上緣約 y = 680
    const kx = 690, gx = 945, seat = 680;
    const win = E.seg(u, 3.7, 4.0);
    const cheer = u > 4.0;
    // 遊戲路徑：左端 → 中央星星 ← 右端
    const path = i => [690 + i * 30, 650 - 28 * Math.sin(i / 8 * Math.PI)];
    // 孩子的棋子：搖骰子 → 擲出 4 點 → 跳 4 格到星星
    const hopT = i => 2.0 + i * .4;
    let kPawnI = 0, hopY = 0;
    for (let i = 0; i < 4; i++) { const k = E.seg(u, hopT(i), hopT(i) + .36); if (k > 0) { kPawnI = i + k; } if (k > 0 && k < 1) hopY = Math.sin(k * Math.PI) * 26; }
    const ia = Math.floor(kPawnI), ib = Math.min(8, ia + 1), fr = kPawnI - ia;
    const kp = [E.lerp(path(ia)[0], path(ib)[0], fr), E.lerp(path(ia)[1], path(ib)[1], fr) - hopY];
    const gPawn = path(6);
    // 骰子
    const throwK = E.seg(u, .85, 1.85);
    let die, dieRot = 0, pips = 4;
    const kHandDice = [kx + 72 + 8 * E.wave(u, 4), 598 + 6 * E.wave(u, 4, .25)];
    if (u < .85) { die = kHandDice; dieRot = u * 8; pips = 1 + Math.floor(u * 9) % 6; }
    else {
      const k = throwK, x = E.lerp(kHandDice[0], 862, E.easeOut(k));
      const b = k < .5 ? Math.sin(k / .5 * Math.PI) * 70 : (k < .8 ? Math.sin((k - .5) / .3 * Math.PI) * 22 : Math.sin((k - .8) / .2 * Math.PI) * 6);
      die = [x, E.lerp(598, 662, Math.min(1, k * 2)) - b]; dieRot = (1 - E.easeOut(k)) * 9; pips = k < 1 ? 1 + Math.floor(u * 9) % 6 : 4;
    }
    // 奶奶：手扶桌邊看 → 孩子贏了拍手
    const clap = cheer ? Math.abs(E.wave(u, 1.8)) : 0;
    drawPerson(ctx, 'grandma', gx, seat, 1.05, {
      t: u, sit: true, flip: true, blinkSeed: 2, tilt: -5, eyes: cheer ? 'happy' : 'open', mouth: cheer ? 'open' : (u > 1.8 ? 'o' : 'smile'),
      reachR: cheer ? [gx - 6 - 22 * clap, 588] : [gx - 52, 655], reachL: cheer ? [gx + 6 + 22 * clap, 588] : [gx + 40, 660],
    });
    // 孩子：贏了之後在座位上跳、雙手舉高
    const kbob = cheer ? -Math.abs(E.wave(u, 1.8)) * 22 : 0;
    let kR = null, kArmR = 12, kArmL = 12, kL = [kx - 40, 655];
    if (u < .85) kR = kHandDice;
    else if (u < 1.9) { kArmR = E.lerp(80, 30, E.seg(u, .85, 1.4)); }
    else if (u < 3.75) kR = [kp[0], kp[1] - 40];
    if (cheer) { kR = null; kL = null; kArmR = 145 + 8 * E.wave(u, 1.8); kArmL = 145 + 8 * E.wave(u, 1.8, .5); }
    drawPerson(ctx, 'kid', kx, seat, 1.05, {
      t: u, sit: true, swing: cheer ? 2 : .5, tilt: 4, bob: kbob,
      eyes: cheer ? 'happy' : 'open', mouth: cheer ? 'open' : (u > .85 && u < 2 ? 'o' : 'smile'),
      reachR: kR, reachL: kL, armR: kArmR, armL: kArmL,
    });
    // 桌子（在兩人前面，擋住腿）＋ 桌上的遊戲盤
    const tg = ctx.createLinearGradient(0, 660, 0, 800); tg.addColorStop(0, '#ffb74d'); tg.addColorStop(1, '#ef8f2f');
    ctx.fillStyle = '#a1694a'; ctx.beginPath(); ctx.moveTo(560, 668); ctx.lineTo(1060, 668); ctx.lineTo(1030, 612); ctx.lineTo(590, 612); ctx.closePath(); ctx.fill();
    ctx.fillStyle = tg; rr(ctx, 548, 664, 524, 132, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) circle(ctx, 600 + i * 84, 730, 12, 'rgba(255,255,255,.35)');
    // 遊戲盤
    ctx.fillStyle = '#fff8e1'; ctx.beginPath(); ctx.moveTo(652, 664); ctx.lineTo(968, 664); ctx.lineTo(944, 614); ctx.lineTo(676, 614); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.stroke();
    const sqc = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28'];
    for (let i = 0; i <= 8; i++) { if (i === 4) continue; const [x, y] = path(i); ctx.fillStyle = sqc[i % 4]; ctx.beginPath(); ctx.ellipse(x, y, 13, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    const [sx, sy] = path(4);
    if (win > 0) glow(ctx, sx, sy - 10, 120, 'rgba(255,235,120,.9)', win);
    star(ctx, sx, sy - 2, 18 + 6 * win, '#ffd54f', u * win);
    // 奶奶的紫色棋子、孩子的橘色棋子
    // 伸到桌面上的手臂補畫在桌子上面（孩子拿棋子的手、扶桌的手；奶奶扶桌的手）
    const kpS = { sit: true, bob: kbob }, gpS = { sit: true, flip: true };
    grandma_armOverlay(ctx, 'kid', kx, seat, 1.05, kpS, 1, kR);
    grandma_armOverlay(ctx, 'kid', kx, seat, 1.05, kpS, -1, kL);
    if (!cheer) { grandma_armOverlay(ctx, 'grandma', gx, seat, 1.05, gpS, 1, [gx - 52, 655]); grandma_armOverlay(ctx, 'grandma', gx, seat, 1.05, gpS, -1, [gx + 40, 660]); }
    // 棋子畫在手的前面：手指捏著棋子的頭
    grandma_pawn(ctx, gPawn[0], gPawn[1], '#7e57c2');
    grandma_pawn(ctx, kp[0], kp[1], '#e53935');
    // 骰子：在手裡時畫在手上
    grandma_die(ctx, die[0], die[1] - (u < .85 ? 4 : 12), 1.2, dieRot, pips);
    if (throwK >= 1 && u < 3) { ctx.save(); ctx.globalAlpha = 1 - E.seg(u, 2.4, 3); glow(ctx, 862, 652, 60, 'rgba(255,255,200,.9)'); ctx.restore(); FX.sparkles(ctx, u, 862, 640, 50, 6, 9); }
    // 贏了：王冠、彩帶、星星
    if (cheer) {
      grandma_crown(ctx, kx, seat - 173 * 1.05 - 108 + kbob, E.pop(u, 4.1, .5));
      FX.burst(ctx, u, 810, 300, 3.75, 22, 5);
      FX.sparkles(ctx, u, 810, 470, 330, 14, 3);
      for (let i = 0; i < 24; i++) { const k = ((u - 4) * .5 + E.rand(i + 90)) % 1; ctx.save(); ctx.translate(250 + E.rand(i) * 1100, 300 + k * 520); ctx.rotate(u * 4 + i); ctx.fillStyle = ['#ff6b6b', '#ffd23f', '#4ecdc4', '#a78bfa', '#ff9f1c'][i % 5]; ctx.fillRect(-7, -4, 14, 8); ctx.restore(); }
    }
  },
};
