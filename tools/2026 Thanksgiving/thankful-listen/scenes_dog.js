// my dog 的 5 句。u = 從 "because" 開始算的秒數。說話的人：kid（橘衣男孩）。
// 原則：手一定碰到它在操作的東西（球在手裡／嘴裡／拋物線上、摸狗時手在狗頭上），
// 人和狗的臉不重疊，手臂不擋臉。狗用本檔自己的 dog_draw（比 engine 的 drawDog 多了坐、趴、站起來撲人、叼東西）。
window.TARGETS = window.TARGETS || {};
window.SCENES = window.SCENES || {};

const DOG_C = { fur: '#d7a15e', furD: '#b9834a', dark: '#8d5a2b', cream: '#fbe9cc', nose: '#3a2418' };

// ---------- 狗的骨架（區域座標，面向右，腳底 y = 0）----------
function dog_local(pose, p = {}) {
  if (pose === 'sit') return { H: [38, -148], back: [-14, -114], collar: [30, -118] };
  if (pose === 'lie') return { H: [74, -62], back: [-10, -58], collar: [52, -40] };
  if (pose === 'up') {
    const a = (p.upAng ?? 50) * Math.PI / 180, dir = [Math.cos(a), -Math.sin(a)], Hp = [-34, -48];
    const Sh = [Hp[0] + dir[0] * 100, Hp[1] + dir[1] * 100];
    return { H: [Sh[0] + 8, Sh[1] - 46], Sh, Hp, dir, a, back: [Hp[0] + dir[0] * 55 - Math.sin(a) * 30, Hp[1] + dir[1] * 55 - Math.cos(a) * 30] };
  }
  return { H: [82, -128], back: [-8, -106], collar: [56, -104] };
}
// 世界座標的重點：頭中心、頭頂、嘴、背
function dog_points(x, y, s, p = {}) {
  const g = dog_local(p.pose || 'stand', p), F = p.flip ? -1 : 1, hop = p.hop || 0;
  const tl = (p.tilt || 0) * Math.PI / 180;
  const rot = ([a, b]) => [a * Math.cos(tl) - b * Math.sin(tl), a * Math.sin(tl) + b * Math.cos(tl)];
  const Wp = ([a, b]) => [x + F * s * a, y + s * (b - hop)];
  const m = rot([46, 26]), tp = rot([0, -42]);
  return { head: Wp(g.H), top: Wp([g.H[0] + tp[0], g.H[1] + tp[1]]), mouth: Wp([g.H[0] + m[0], g.H[1] + m[1]]), back: Wp(g.back), sh: g.Sh ? Wp(g.Sh) : null };
}

// p: { t, pose:'stand'|'sit'|'up'|'lie', flip, hop, run, leap(0..1), wag, wagSpd, tilt, eyes:'open'|'happy'|'closed',
//      eyeK(眼睛放大), brow, tongue, mouth:'open', mouthItem(ctx), pawUp(0..1), paw:[世界x,y](站起來時前腳放的位置), earFlop }
function dog_draw(ctx, x, y, s, p = {}) {
  const t = p.t || 0, pose = p.pose || 'stand', F = p.flip ? -1 : 1, hop = p.hop || 0, C = DOG_C;
  const g = dog_local(pose, p);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * F, s);
  if (!p.noShadow) {
    const k = 1 / (1 + hop / 90);
    ctx.save(); ctx.globalAlpha = .2 * k; ctx.fillStyle = '#000'; ctx.beginPath();
    ctx.ellipse(pose === 'sit' ? -4 : (pose === 'up' ? -20 : 0), 0, (pose === 'up' ? 62 : 92) * k, 12 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.translate(0, -hop);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const wagA = (p.wag ?? 1) * Math.sin(t * (p.wagSpd || 14)) * 26;
  const tail = (tx, ty, base) => {
    ctx.save(); ctx.translate(tx, ty); ctx.rotate((base + wagA) * Math.PI / 180);
    ctx.strokeStyle = C.fur; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-14, -26, 2, -50); ctx.stroke();
    circle(ctx, 2, -50, 8, C.cream); ctx.restore();
  };
  const leg = (lx, ly, a, len, col) => {
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(a * Math.PI / 180);
    ctx.strokeStyle = col; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
    ctx.fillStyle = C.cream; ctx.beginPath(); ctx.ellipse(3, len, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  const ell = (cx, cy, rx, ry, rot, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); };
  const line = (a, b, col, w = 17) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };

  if (pose === 'stand') {
    const sw = p.run ? Math.sin(t * (p.runSpd || 11)) * 30 : 0, lp = p.leap || 0;
    tail(-66, -86, -40 - 25 * lp);
    leg(-30, -66, -sw + 55 * lp, 60, C.furD); leg(54, -66, sw - 60 * lp, 60, C.furD);
    ctx.save(); ctx.translate(0, -72); ctx.rotate(-10 * lp * Math.PI / 180);
    ell(0, 0, 74, 36, 0, C.fur); ell(8, 16, 48, 15, 0, C.cream); ctx.restore();
    leg(-46, -62, sw + 60 * lp, 60, C.fur); leg(40, -62, -sw - 65 * lp, 60, C.fur);
    ell(56, -98, 26, 36, .55, C.fur);
  } else if (pose === 'sit') {
    tail(-56, -16, -100);
    ell(-24, -42, 48, 40, 0, C.fur);
    leg(40, -72, 0, 66, C.furD);
    ctx.save(); ctx.translate(8, -80); ctx.rotate(.38); ell(0, 0, 36, 62, 0, C.fur); ell(16, -2, 15, 36, 0, C.cream); ctx.restore();
    ell(-20, -34, 30, 26, 0, C.fur);
    ctx.strokeStyle = 'rgba(90,50,20,.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-20, -34, 28, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    ell(4, -7, 22, 9, 0, C.cream);
    const pu = p.pawUp || 0;
    leg(24, -72, -80 * pu - 12 * pu * Math.sin(t * 7), 66, C.fur);
  } else if (pose === 'lie') {
    tail(-80, -20, -95);
    line([28, -20], [86, -10], C.furD, 16); ell(92, -9, 14, 8, 0, C.cream);
    ell(-44, -34, 38, 30, 0, C.fur);
    ell(-2, -30, 80, 28, 0, C.fur); ell(10, -14, 50, 10, 0, C.cream);
    ell(-20, -8, 22, 9, 0, C.cream);
    line([36, -16], [74, -7], C.fur, 16); ell(80, -6, 14, 8, 0, C.cream);
  } else if (pose === 'up') {
    const { Hp, Sh, dir, a } = g;
    let P = p.paw ? [(p.paw[0] - x) / (s * F), (p.paw[1] - y) / s + hop] : [Sh[0] + 40, Sh[1] + 52];
    let dx = P[0] - Sh[0], dy = P[1] - Sh[1], d = Math.hypot(dx, dy); if (d > 80) { dx *= 80 / d; dy *= 80 / d; }
    P = [Sh[0] + dx, Sh[1] + dy];
    tail(Hp[0] - 22, Hp[1] + 4, -75);
    ell(-14, -7, 22, 9, 0, C.furD);
    line([Sh[0] - 8, Sh[1] + 6], [P[0] - 10, P[1] + 10], C.furD); ell(P[0] - 8, P[1] + 10, 11, 9, 0, C.cream);
    ctx.save(); ctx.translate(Hp[0] + dir[0] * 52, Hp[1] + dir[1] * 52); ctx.rotate(-a);
    ell(0, 0, 70, 34, 0, C.fur); ell(6, 16, 46, 14, 0, C.cream); ctx.restore();
    ell(-36, -36, 34, 32, 0, C.fur); ell(-4, -7, 24, 10, 0, C.cream);
    line(Sh, P, C.fur); ell(P[0] + 2, P[1], 12, 9, 0, C.cream);
    ell(Sh[0] + 2, Sh[1] - 16, 26, 30, .3, C.fur);
  }
  // 項圈
  const H = g.H;
  ctx.strokeStyle = '#e53935'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(H[0] - 4, H[1] + 14, 36, Math.PI * .3, Math.PI * .85); ctx.stroke();
  circle(ctx, H[0] - 10, H[1] + 52, 8, '#ffd54f', '#e0a800', 2);
  // 頭
  ctx.save(); ctx.translate(H[0], H[1]); ctx.rotate((p.tilt || 0) * Math.PI / 180);
  const flop = (p.earFlop ?? 1) * (.12 * Math.sin(t * 6) + (p.tilt || 0) * .006);
  ell(6, -34, 13, 21, -.45 + flop * .5, C.dark);
  circle(ctx, 0, 0, 42, C.fur);
  ell(16, -24, 7, 13, .3, C.cream);
  ell(32, 14, 30, 21, 0, C.cream);
  ctx.save(); ctx.translate(-14, -28); ctx.rotate(.25 + flop); ell(0, 28, 17, 33, 0, C.dark); ell(2, 30, 9, 22, 0, 'rgba(255,255,255,.08)'); ctx.restore();
  ctx.save(); ctx.globalAlpha = .45; ell(12, 18, 9, 6, 0, '#ff8fa3'); ctx.restore();
  const e = p.eyes || 'open', ek = p.eyeK || 1;
  ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 5;
  if (e === 'happy') { ctx.beginPath(); ctx.arc(16, -2, 9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else if (e === 'closed') { ctx.beginPath(); ctx.arc(16, -10, 9, Math.PI * .15, Math.PI * .85); ctx.stroke(); }
  else {
    ctx.save(); ctx.translate(16, -6); ctx.scale(ek, ek);
    ell(0, 0, 9.5, 11.5, 0, '#2b2118'); circle(ctx, 3, -4, 4, '#fff'); circle(ctx, -3, 4, 2, '#fff'); ctx.restore();
  }
  if (p.brow) { ctx.save(); ctx.translate(10, -24); ctx.rotate(-.5); ell(0, 0, 7, 3, 0, C.dark); ctx.restore(); }
  ell(58, 4, 10, 8, 0, C.nose); circle(ctx, 55, 1, 3, 'rgba(255,255,255,.6)');
  ctx.strokeStyle = C.nose; ctx.lineWidth = 3.5;
  if (p.mouth === 'open') {
    const o = .6 + .4 * (Math.sin(t * 10) + 1) / 2;
    ell(42, 26, 14, 5 + 8 * o, 0, '#7a2430');
    ell(42, 30 + 3 * o, 8, 6 + 3 * o, 0, '#ff6f91');
  } else {
    ctx.beginPath(); ctx.moveTo(57, 11); ctx.lineTo(56, 18); ctx.quadraticCurveTo(48, 28, 38, 20); ctx.stroke();
    if (p.tongue) { ell(46, 32 + Math.sin(t * 10) * 2, 8, 13, 0, '#ff6f91'); ctx.strokeStyle = '#e04a72'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(46, 24); ctx.lineTo(46, 38); ctx.stroke(); }
  }
  if (p.mouthItem) { ctx.save(); ctx.translate(46, 26); p.mouthItem(ctx); ctx.restore(); }
  ctx.restore();
  ctx.restore();
  return dog_points(x, y, s, p);
}

// 跟 engine 的手臂算法一樣（兩節手臂），用來把孩子的手臂「再畫一次」疊在狗的前面
function dog_arm(ctx, kx, ky, s, side, target, o = {}) {
  const sp = PEOPLE.kid, F = o.flip ? -1 : 1, Lu = 44, Lf = 42, bob = o.bob || 0;
  ctx.save(); ctx.translate(kx, ky + bob); ctx.rotate((o.lean || 0) * Math.PI / 180); ctx.scale(s * F, s);
  if (o.sit) ctx.translate(0, 62);
  const sx = side * 40, sy = -153;
  let hx = (target[0] - kx) / (s * F), hy = (target[1] - ky - bob) / s - (o.sit ? 62 : 0);
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy);
  const maxD = Lu + Lf - 1; if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
  hx = sx + dx; hy = sy + dy;
  const base = Math.atan2(dy, dx), off = Math.acos(E.clamp((Lu * Lu + d * d - Lf * Lf) / (2 * Lu * d || 1), -1, 1));
  const e1 = [sx + Lu * Math.cos(base + off), sy + Lu * Math.sin(base + off)], e2 = [sx + Lu * Math.cos(base - off), sy + Lu * Math.sin(base - off)];
  const el = (side * e1[0] + e1[1] * .3) > (side * e2[0] + e2[1] * .3) ? e1 : e2;
  ctx.lineCap = 'round'; ctx.strokeStyle = sp.shirt; ctx.lineWidth = 20; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(el[0], el[1]); ctx.lineTo(hx, hy); ctx.stroke();
  circle(ctx, hx, hy, 13, sp.skin);
  ctx.restore();
}

// ---------- 小道具 ----------
function dog_cloud(ctx, x, y, s, col, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
  [[-60, 10, 42], [-20, -14, 52], [30, -6, 48], [70, 14, 36], [0, 22, 44]].forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}
function dog_pawprint(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + r * .25, r * .62, r * .5, 0, 0, Math.PI * 2); ctx.fill();
  [[-.62, -.45], [-.22, -.82], [.22, -.82], [.62, -.45]].forEach(([a, b]) => { ctx.beginPath(); ctx.ellipse(x + a * r, y + b * r, r * .2, r * .25, a * .5, 0, Math.PI * 2); ctx.fill(); });
}
function dog_handprint(ctx, x, y, r, col) {
  ctx.fillStyle = col; rr(ctx, x - r * .5, y - r * .35, r, r * .95, r * .3); ctx.fill();
  [[-.38, -.75, .55], [-.13, -.92, .65], [.13, -.92, .65], [.38, -.75, .55]].forEach(([a, b, l]) => { rr(ctx, x + a * r - r * .1, y + b * r - r * .1, r * .2, r * l, r * .1); ctx.fill(); });
  ctx.save(); ctx.translate(x - r * .5, y + r * .15); ctx.rotate(-.7); rr(ctx, -r * .1, -r * .45, r * .2, r * .5, r * .1); ctx.fill(); ctx.restore();
}
function dog_backpack(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -52, 14, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#1e88e5'; rr(ctx, -34, -52, 68, 100, 18); ctx.fill();
  ctx.fillStyle = '#64b5f6'; rr(ctx, -24, 0, 48, 36, 10); ctx.fill();
  circle(ctx, 0, -24, 6, '#ffd54f');
  ctx.restore();
}
function dog_tree(ctx, x, y, s, c1 = '#66bb6a', c2 = '#43a047') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#8d6e63'; rr(ctx, -16, -170, 32, 170, 10); ctx.fill();
  circle(ctx, -50, -190, 70, c2); circle(ctx, 50, -200, 66, c2); circle(ctx, 0, -250, 84, c1); circle(ctx, -20, -180, 60, c1);
  ctx.restore();
}
function dog_park(ctx, u) {
  BG.sky(ctx, u, '#7fd0ff', '#eaf8ff');
  glow(ctx, 330, 340, 220, 'rgba(255,240,170,.9)'); circle(ctx, 330, 340, 54, '#ffe066');
  [0, 1, 2].forEach(i => { const cx = 300 + ((u * 18 + i * 420) % 1400); dog_cloud(ctx, cx, 330 + i * 30, .7, 'rgba(255,255,255,.95)'); });
  ctx.fillStyle = '#a5d6a7'; ctx.beginPath(); ctx.ellipse(500, 720, 700, 140, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1300, 730, 600, 120, 0, 0, Math.PI * 2); ctx.fill();
  dog_tree(ctx, 230, 700, .9); dog_tree(ctx, 1400, 700, 1.0, '#7cb342', '#558b2f');
  const g = ctx.createLinearGradient(0, 690, 0, H); g.addColorStop(0, '#8bc34a'); g.addColorStop(1, '#558b2f');
  ctx.fillStyle = g; ctx.fillRect(0, 690, W, H + 300 - 690);
  for (let i = 0; i < 26; i++) { const fx = E.rand(i + 40) * W, fy = 710 + E.rand(i + 70) * 120; circle(ctx, fx, fy, 6, ['#fff', '#ffeb3b', '#f48fb1'][i % 3]); circle(ctx, fx, fy, 2.5, '#ff9800'); }
}

// ---------- 開場：狗坐著搖尾巴、歪頭、吐舌頭 ----------
TARGETS.dog = {
  color: '#d7a15e',
  draw(ctx, x, y, s, t, k) {
    dog_draw(ctx, x, y, s * 1.3, { t, pose: 'sit', flip: true, tongue: true, wagSpd: 16, tilt: 10 * Math.sin(t * 1.5), eyeK: 1.15 });
  },
};

// 1. it is cute —— 大大的狗狗歪頭、水汪汪大眼睛、吐舌頭、舉手手；孩子雙手捧臉、愛心眼
SCENES.dog_1 = {
  dur: 8.5, sfx: [[0.3, 'pop'], [1.2, 'sparkle'], [2.6, 'heart'], [2.8, 'boing'], [3.7, 'pop'], [4.3, 'chime'], [5.5, 'sparkle'], [6.6, 'boing']],
  draw(ctx, u) {
    BG.room(ctx, u, '#fff0f6', '#e6b07c', '#ffe1ee'); BG.window(ctx, 1190, 140, 270, 210, u);
    ctx.fillStyle = '#f8bbd0'; ctx.beginPath(); ctx.ellipse(880, 805, 470, 52, 0, 0, Math.PI * 2); ctx.fill();
    const love = E.seg(u, 2.6, 3.2), dx = 960, dy = 772, ds = 1.75;
    if (love > 0) {
      FX.rays(ctx, u, 900, 540, 640, 'rgba(255,150,190,.2)', 16);
      glow(ctx, 900, 540, 380, 'rgba(255,170,200,.85)', love);
      heart(ctx, 900, 650, 560 * E.pop(u, 2.6, .7) * (1 + .05 * E.wave(u, 1.2)), 'rgba(255,122,168,.45)');
    }
    // 狗窩
    ctx.fillStyle = '#ab47bc'; ctx.beginPath(); ctx.ellipse(dx - 10, 790, 200, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e1bee7'; ctx.beginPath(); ctx.ellipse(dx - 10, 778, 168, 26, 0, 0, Math.PI * 2); ctx.fill();
    const tilt = 20 * E.easeInOut(E.seg(u, 1, 1.6)) - 40 * E.easeInOut(E.seg(u, 5.4, 6.0));
    const eyeK = 1 + .45 * E.easeOut(E.seg(u, 1.1, 1.7));
    const pawUp = E.easeOut(E.seg(u, 3.7, 4.1)) * (1 - E.seg(u, 5.1, 5.5));
    const hop = u > 2.6 && u < 3.7 ? Math.abs(E.wave(u, 2.4)) * 14 : 0;
    const pt = dog_draw(ctx, dx, dy, ds, { t: u, pose: 'sit', flip: true, noShadow: true, tilt, eyeK, tongue: u > 2.6, pawUp, hop,
      wagSpd: u > 2.6 ? 24 : 12, eyes: u > 6.6 && u < 7.4 ? 'happy' : 'open' });
    // 水汪汪大眼睛的閃光
    if (u > 1.1) {
      const ex = pt.head[0] - 16 * ds, ey = pt.head[1] - 8 * ds;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + u, r = 48 + 6 * E.wave(u, 1.5, i * .25); sparkle(ctx, ex + Math.cos(a) * r, ey + Math.sin(a) * r * .8, 10 + 6 * E.wave(u, 2, i * .3), E.seg(u, 1.1, 1.5)); }
    }
    FX.burst(ctx, u, pt.head[0], pt.head[1], 2.6, 20, 4);
    if (u > 2.6) FX.sparkles(ctx, u, pt.head[0], pt.head[1] + 60, 230, 12, 6, '#fff6c2');
    // 孩子：雙手捧著臉頰，看傻了
    const kx = 470, ks = 1.1, hk = E.easeOut(E.seg(u, 1.0, 1.4));
    const kb = u > 2.6 ? -Math.abs(E.wave(u, 1.6)) * 10 : 0;
    const cheekY = 790 + kb + ks * (-235 + 26);
    const rest = side => [kx + side * 52, 790 + kb - 76];
    const reach = side => hk > 0 ? [E.lerp(rest(side)[0], kx + side * 94, hk), E.lerp(rest(side)[1], cheekY, hk)] : null;
    drawPerson(ctx, 'kid', kx, 790, ks, { t: u, bob: kb, eyes: u > 2.6 ? 'happy' : 'open', mouth: u > 2.6 ? 'open' : (u > .6 ? 'o' : 'smile'),
      reachL: reach(-1), reachR: reach(1), armL: 10, armR: 10 });
    if (u > 2.6) {
      const hs = 30 * E.pop(u, 2.6, .5) * (1 + .12 * E.wave(u, 2));
      [-1, 1].forEach(sd => heart(ctx, kx + sd * 26 * ks, 790 + kb + ks * (-235 + 8) + hs * .28, hs, '#ff3d7f', '#fff'));
      FX.floatHearts(ctx, u, kx + 40, 440, 6, 220, 3, 2.8);
      FX.floatHearts(ctx, u, 880, 470, 6, 300, 13, 3.3);
    }
  },
};

// 2. it plays with me —— 公園：孩子丟球（球離手）→ 狗跑過去跳起來在空中咬住 → 叼回來放在孩子腳邊 → 孩子摸摸頭
SCENES.dog_2 = {
  dur: 9, sfx: [[0.55, 'whoosh'], [1.0, 'pop'], [2.3, 'ding'], [2.4, 'boing'], [2.75, 'bounce'], [4.7, 'bounce'], [5.0, 'boing'], [5.2, 'chime'], [5.9, 'heart'], [7.2, 'sparkle']],
  draw(ctx, u) {
    dog_park(ctx, u);
    const kx = 400, ks = 1.05, sh = [kx + 42 * ks, 790 - 153 * ks];
    // ---- 狗的位置與姿勢 ----
    let d;
    if (u < .95) d = { x: 600, pose: 'sit', flip: false, tilt: -14 - 10 * E.seg(u, .85, .95) };
    else if (u < 1.85) d = { x: E.lerp(600, 980, E.seg(u, .95, 1.85)), pose: 'stand', run: true };
    else if (u < 2.75) { const k = E.seg(u, 1.85, 2.75); d = { x: E.lerp(980, 1180, k), pose: 'stand', hop: 440 * k * (1 - k), leap: Math.sin(k * Math.PI) }; }
    else if (u < 3.25) d = { x: 1180, pose: 'stand', flip: u > 3.0, hop: u > 2.95 && u < 3.1 ? 12 : 0 };
    else if (u < 4.55) d = { x: E.lerp(1180, 566, E.seg(u, 3.25, 4.55)), pose: 'stand', flip: true, run: true };
    else d = { x: 566, pose: 'sit', flip: true };
    // 空中接球點 = 跳最高時嘴巴的位置
    const C = dog_points(1080, 790, 1, { pose: 'stand', hop: 110 }).mouth;
    // ---- 孩子的手：從後下方往前上方甩出（以肩膀為圓心） ----
    const swing = th => [sh[0] + 84 * Math.cos(th * Math.PI / 180), sh[1] + 84 * Math.sin(th * Math.PI / 180)];
    let hand = null;
    if (u < .85) hand = swing(E.lerp(100, -36, E.easeIn(E.seg(u, .4, .85))));
    else if (u < 1.6) hand = swing(E.lerp(-36, -62, E.easeOut(E.seg(u, .85, 1.1))));
    const B1 = swing(-36);
    // ---- 球 ----
    let ball = null, inMouth = false;
    if (u < .85) ball = hand;
    else if (u < 2.35) { const k = E.seg(u, .85, 2.35); ball = [E.lerp(B1[0], C[0], k), E.lerp(B1[1], C[1], k) - 4 * 270 * k * (1 - k)]; }
    else if (u < 4.7) inMouth = true;
    else {
      const M = dog_points(566, 790, 1, { pose: 'sit', flip: true }).mouth, k = E.seg(u, 4.7, 5.2);
      const fall = k < .6 ? E.easeIn(k / .6) : 1 - Math.sin((k - .6) / .4 * Math.PI) * .18;
      ball = [E.lerp(M[0], 468, k), E.lerp(M[1], 770, fall)];
    }
    // 速度線、落地灰塵
    if (d.run || d.leap) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; const F = d.flip ? -1 : 1; for (let i = 0; i < 3; i++) { const yy = 700 - (d.hop || 0) - i * 26, x0 = d.x - F * (110 + i * 14 + 20 * E.wave(u, 4, i * .3)); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - F * 70, yy); ctx.stroke(); } ctx.restore(); }
    const dust = E.seg(u, 2.75, 3.3); if (dust > 0 && dust < 1) for (let i = 0; i < 6; i++) { ctx.save(); ctx.globalAlpha = 1 - dust; circle(ctx, 1180 + (i - 2.5) * 30 * (1 + dust), 785 - dust * 30 * E.rand(i), 14 + 10 * dust, '#e6d3a3'); ctx.restore(); }
    const happy = u > 4.9;
    const pt = dog_draw(ctx, d.x, 790, 1, { t: u, pose: d.pose, flip: d.flip, hop: d.hop, run: d.run, leap: d.leap, tilt: d.tilt || (happy ? -8 : 0),
      tongue: u < .95 || happy, eyes: happy ? 'happy' : 'open', wagSpd: happy ? 24 : 14, mouth: happy && u < 5.6 ? 'open' : null,
      mouthItem: inMouth ? c => PROP.ball(c, 0, 0, 20, 0) : null });
    if (ball && u >= .85) PROP.ball(ctx, ball[0], ball[1], 20, u < 2.35 ? u * 3 : 0);
    FX.burst(ctx, u, C[0], C[1], 2.35, 16, 5);
    // 孩子：丟球 → 看著 → 歡呼 → 摸摸狗頭
    let reachR = hand;
    if (u > 5.0) reachR = [pt.top[0] + 6 * E.wave(u, 1.6), pt.top[1] + 6];
    const cheer = u > 2.4 && u < 4.6;
    drawPerson(ctx, 'kid', kx, 790, ks, { t: u, reachR, armR: 12, armL: cheer ? 135 + 8 * E.wave(u, 2) : 10,
      eyes: u > 2.4 ? 'happy' : 'open', mouth: u > 2.4 ? 'open' : (u > .9 ? 'o' : 'smile'), bob: cheer ? -Math.abs(E.wave(u, 2)) * 14 : 0 });
    if (u < .85) PROP.ball(ctx, hand[0], hand[1] - 4, 20, 0);   // 球握在手上（畫在手的前面）
    if (u > 5.0) { FX.floatHearts(ctx, u, 480, 470, 8, 300, 5, 5.2); FX.sparkles(ctx, u, 480, 560, 220, 10, 8); FX.burst(ctx, u, 500, 520, 5.1, 16, 9); }
  },
};

// 3. it makes me happy —— 孩子難過頭上烏雲 → 狗衝過來撲上來舔臉 → 烏雲散開出現彩虹 → 孩子笑著摸狗
SCENES.dog_3 = {
  dur: 8.5, sfx: [[0.2, 'whoosh'], [1.25, 'boing'], [1.6, 'bounce'], [2.2, 'yum'], [2.75, 'pop'], [3.0, 'chime'], [3.8, 'bounce'], [4.2, 'heart'], [5.2, 'sparkle'], [6.6, 'boing']],
  draw(ctx, u) {
    const joy = E.seg(u, 2.6, 3.4);
    BG.room(ctx, u, '#fff4e0', '#d9a066', '#ffe8c2'); BG.window(ctx, 1150, 140, 280, 220, u);
    PROP.lamp(ctx, 1320, 790, u);
    ctx.fillStyle = `rgba(60,70,95,${.42 * (1 - joy)})`; ctx.fillRect(0, 0, W, H + 300);
    const kx = 560, ks = 1.05;
    // 彩虹（烏雲散掉後）
    if (joy > 0) {
      const cols = ['#ff5252', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#7e57c2'];
      ctx.save(); ctx.globalAlpha = joy * .85; ctx.lineWidth = 20;
      cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(650, 720, 400 - i * 20, Math.PI, Math.PI * 2 * (.5 + .5 * E.easeOut(joy))); ctx.stroke(); });
      ctx.restore(); glow(ctx, 650, 420, 360, 'rgba(255,240,170,.7)', joy);
    }
    // ---- 狗 ----
    const lickOn = u > 2.0 && u < 3.5;
    let d;
    if (u < 1.25) d = { x: E.lerp(1460, 760, E.easeOut(E.seg(u, .1, 1.25))), pose: 'stand', run: true };
    else if (u < 3.6) { const k = E.seg(u, 1.25, 1.6); d = { x: E.lerp(760, 700, k), pose: 'up', hop: 34 * Math.sin(k * Math.PI) + (k >= 1 ? Math.abs(E.wave(u, 2)) * 5 : 0), tilt: lickOn ? 10 : 0 }; }
    else { const k = E.seg(u, 3.6, 3.9); d = { x: E.lerp(700, 720, k), pose: 'sit', hop: 20 * Math.sin(k * Math.PI) }; }
    const paw = [kx + 40, 702];
    // ---- 孩子 ----
    const sad = u < 2.1, kb = u > 3.0 ? -Math.abs(E.wave(u, 1.6)) * 10 : 0;
    const dogSit = dog_points(d.x, 790, 1, { pose: 'sit', flip: true });
    const pet = u > 3.95 ? [dogSit.top[0] + 6 * E.wave(u, 1.4), dogSit.top[1] + 6] : null;
    drawPerson(ctx, 'kid', kx, 790, ks, { t: u, bob: kb, lean: sad ? -3 : 0,
      eyes: sad ? 'open' : (lickOn ? 'closed' : 'happy'), mouth: sad ? (u > 1.4 ? 'o' : 'sad') : 'open',
      reachR: pet, armR: 8, armL: u > 4.2 ? 135 + 8 * E.wave(u, 2) : 8 });
    if (u < 1.6) for (let i = 0; i < 2; i++) { const k = (u * 1.3 + i * .5) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(kx + (i ? 28 : -28) * ks, 790 + ks * (-235 + 26) + k * 50, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    const pt = dog_draw(ctx, d.x, 790, 1, { t: u, pose: d.pose, flip: true, run: d.run, hop: d.hop, tilt: d.tilt, paw,
      mouth: lickOn ? 'open' : null, tongue: !lickOn, eyes: u > 3.9 ? 'happy' : 'open', wagSpd: 24 });
    if (pet) dog_arm(ctx, kx, 790, ks, 1, pet, { bob: kb });
    // 舔臉：舌頭從狗嘴伸到孩子的臉頰
    if (lickOn) {
      const cheek = [kx + 46 * ks, 790 + ks * (-235 + 30)], ext = Math.max(0, Math.sin((u - 2.0) * Math.PI * 2.2));
      const tip = [E.lerp(pt.mouth[0], cheek[0], ext), E.lerp(pt.mouth[1], cheek[1], ext)];
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#ff6f91'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(pt.mouth[0], pt.mouth[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      ctx.strokeStyle = '#e04a72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pt.mouth[0], pt.mouth[1]); ctx.lineTo(E.lerp(pt.mouth[0], tip[0], .8), E.lerp(pt.mouth[1], tip[1], .8)); ctx.stroke(); ctx.restore();
      if (ext > .8) for (let i = 0; i < 3; i++) sparkle(ctx, cheek[0] + 20 + i * 14, cheek[1] - 20 + i * 12, 9, .9, '#bfefff');
    }
    // 烏雲＋雨 → 散開
    const cloudA = 1 - E.seg(u, 2.6, 3.0), cs = 1 + .4 * E.seg(u, 2.6, 3.0);
    if (cloudA > 0) {
      dog_cloud(ctx, kx, 360, .9 * cs, '#78849a', cloudA);
      ctx.save(); ctx.globalAlpha = cloudA; ctx.strokeStyle = '#64b5f6'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const k = (u * 1.6 + E.rand(i + 5)) % 1, rx = kx - 75 + i * 25; ctx.beginPath(); ctx.moveTo(rx, 400 + k * 45); ctx.lineTo(rx - 3, 412 + k * 45); ctx.stroke(); }
      ctx.restore();
    }
    FX.burst(ctx, u, kx, 380, 2.7, 18, 7);
    if (u > 3.0) { FX.sparkles(ctx, u, 640, 520, 330, 12, 3); FX.floatHearts(ctx, u, 620, 470, 8, 340, 21, 3.8); }
  },
};

// 4. it is my good friend —— 夕陽下坐在木頭上，孩子摟著狗，兩個頭靠在一起，中間出現愛心，愛心裡蓋上手印＋腳印
SCENES.dog_4 = {
  dur: 8.5, sfx: [[0.3, 'whoosh'], [1.4, 'pop'], [2.6, 'heart'], [3.0, 'chime'], [4.6, 'pop'], [4.75, 'pop'], [5.0, 'sparkle'], [6.4, 'chime']],
  draw(ctx, u) {
    const dusk = E.seg(u, 0, 8.5);
    const g = ctx.createLinearGradient(0, 200, 0, 760);
    g.addColorStop(0, '#5b4b8a'); g.addColorStop(.55, '#ff8a5c'); g.addColorStop(1, '#ffd27a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H + 300);
    ctx.save(); ctx.globalAlpha = .35 * dusk; ctx.fillStyle = '#2a1f4d'; ctx.fillRect(0, 0, W, H + 300); ctx.restore();
    for (let i = 0; i < 16; i++) { const a = E.seg(u, 3 + i * .2, 4 + i * .2); sparkle(ctx, 220 + E.rand(i + 3) * 1180, 300 + E.rand(i + 30) * 180, 7, a * (.5 + .5 * E.wave(u, .8, i * .2))); }
    const sy = 600 + 90 * E.easeIn(dusk);
    FX.rays(ctx, u * .4, 1190, sy, 700, 'rgba(255,230,160,.18)', 14);
    glow(ctx, 1190, sy, 300, 'rgba(255,200,120,.9)'); circle(ctx, 1190, sy, 80, '#ffb347'); circle(ctx, 1190, sy, 66, '#ffcf6b');
    ctx.fillStyle = '#7e5a9b'; ctx.beginPath(); ctx.ellipse(1150, 760, 520, 90, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a0618a'; ctx.beginPath(); ctx.ellipse(350, 770, 520, 110, 0, 0, Math.PI * 2); ctx.fill();
    const gg = ctx.createLinearGradient(0, 730, 0, H); gg.addColorStop(0, '#5d8a3a'); gg.addColorStop(1, '#2f5222');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, 760); ctx.quadraticCurveTo(700, 690, 1600, 770); ctx.lineTo(1600, H + 300); ctx.lineTo(0, H + 300); ctx.closePath(); ctx.fill();
    dog_tree(ctx, 300, 760, 1.05, '#4e7d32', '#3b6526');
    // 木頭：上緣 y = 720
    ctx.fillStyle = '#8d5a3b'; rr(ctx, 560, 720, 380, 62, 30); ctx.fill();
    ctx.fillStyle = '#b07a52'; ctx.beginPath(); ctx.ellipse(930, 751, 22, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8d5a3b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(930, 751, 11, 15, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#6d4630'; for (let i = 0; i < 4; i++) { rr(ctx, 600 + i * 80, 740 + (i % 2) * 14, 50, 6, 3); ctx.fill(); }
    // 狗坐在木頭上（面向夕陽），孩子坐在牠左邊
    const kx = 660, ks = 1.05, dx = 800;
    const lean = E.easeInOut(E.seg(u, 2.2, 2.9));
    const pt = dog_draw(ctx, dx, 720, 1, { t: u, pose: 'sit', noShadow: true, tilt: -16 * lean, tongue: lean < .5, eyes: lean > .5 ? 'happy' : 'open', wag: .8, wagSpd: 10 });
    const hk = E.easeInOut(E.seg(u, 1.2, 2.0));
    const rest = [kx + 52, 700], back = [pt.back[0] - 4, pt.back[1] + 6 + 3 * E.wave(u, .7)];
    const reachR = hk > 0 ? [E.lerp(rest[0], back[0], hk), E.lerp(rest[1], back[1], hk)] : null;
    drawPerson(ctx, 'kid', kx, 720, ks, { t: u, sit: true, swing: .6, tilt: 12 * lean, reachR, armR: 8, armL: 6, eyes: lean > .5 ? 'happy' : 'open', mouth: 'smile' });
    // 中間的大愛心 + 手印與腳印
    const hp = E.pop(u, 2.7, .6);
    if (hp > 0) {
      const hx = 800, hy = 405 + 6 * E.wave(u, .8);
      glow(ctx, hx, hy - 30, 150 * hp, 'rgba(255,170,190,.7)');
      heart(ctx, hx, hy + 30, 140 * hp * (1 + .05 * E.wave(u, 1.2)), '#ff5d8f', '#fff');
      const a = E.pop(u, 4.6, .4), b = E.pop(u, 4.75, .4);
      if (a > 0) { ctx.save(); ctx.translate(hx - 26, hy - 12); ctx.scale(a, a); ctx.rotate(-.2); dog_handprint(ctx, 0, 0, 34, '#fff'); ctx.restore(); }
      if (b > 0) { ctx.save(); ctx.translate(hx + 28, hy - 6); ctx.scale(b, b); ctx.rotate(.2); dog_pawprint(ctx, 0, 0, 28, '#fff'); ctx.restore(); }
      FX.burst(ctx, u, hx, hy - 20, 4.7, 18, 2);
      FX.sparkles(ctx, u, hx, hy, 190, 10, 12);
    }
    if (u > 3) FX.floatHearts(ctx, u, 740, 560, 5, 300, 17, 3.2);
  },
};

// 5. it waits for me at home —— 狗坐在門口等（窗外太陽從早走到晚、時鐘轉）→ 門開了孩子背書包回家 → 狗衝過去撲上來搖尾巴
SCENES.dog_5 = {
  dur: 9, sfx: [[0.3, 'whoosh'], [1.3, 'whoosh'], [2.9, 'pop'], [3.3, 'ding'], [3.7, 'whoosh'], [4.4, 'bounce'], [4.9, 'boing'], [5.1, 'boing'], [5.3, 'chime'], [5.8, 'heart'], [6.8, 'sparkle']],
  draw(ctx, u) {
    const tt = E.seg(u, 0, 3.6);
    BG.room(ctx, u, '#fdf0d5', '#9fb4c8', '#f6e2bf');
    ctx.fillStyle = '#26a69a'; ctx.beginPath(); ctx.ellipse(960, 800, 330, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b2dfdb'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(960, 800, 300, 30, 0, 0, Math.PI * 2); ctx.stroke();
    // 窗戶：太陽從左走到右，天空由藍變橘變紫
    const wx = 290, wy = 330, ww = 270, wh = 210;
    const lerpC = (a, b, k) => { const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16)); return `rgb(${pa.map((v, i) => Math.round(E.lerp(v, pb[i], k))).join(',')})`; };
    const sky = tt < .5 ? lerpC('7cc8ff', 'ffb36b', tt * 2) : lerpC('ffb36b', '6a4c9c', (tt - .5) * 2);
    rr(ctx, wx - 14, wy - 14, ww + 28, wh + 28, 14); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    const sunX = wx + 20 + tt * (ww - 40), sunY = wy + wh * (.85 - .6 * Math.sin(tt * Math.PI));
    glow(ctx, sunX, sunY, 90, 'rgba(255,240,170,.9)'); circle(ctx, sunX, sunY, 28, tt < .6 ? '#ffe066' : '#ff8a3d');
    ctx.fillStyle = '#7cb342'; ctx.beginPath(); ctx.ellipse(wx + ww / 2, wy + wh + 10, ww * .7, 50, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    // 地上的窗光（跟著太陽移動）
    ctx.save(); ctx.globalAlpha = .28 * (1 - E.seg(tt, .75, 1)); ctx.fillStyle = '#fff6c2';
    const lx = 520 - tt * 260; ctx.beginPath(); ctx.moveTo(lx, 690); ctx.lineTo(lx + 220, 690); ctx.lineTo(lx + 300, 790); ctx.lineTo(lx + 60, 790); ctx.closePath(); ctx.fill(); ctx.restore();
    // 時鐘（沒有數字，只有刻度和轉動的指針）
    const cx = 760, cy = 380;
    circle(ctx, cx, cy, 58, '#fff', '#8d6e63', 8);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = i % 3 ? 3 : 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44); ctx.lineTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52); ctx.stroke(); }
    const spin = E.easeInOut(tt) * Math.PI * 2 * 7 + u * .1;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(spin / 12) * 28, cy - Math.cos(spin / 12) * 28); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(spin) * 42, cy - Math.cos(spin) * 42); ctx.stroke();
    circle(ctx, cx, cy, 6, '#e53935');
    if (tt > 0 && tt < 1) for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 72 + i * 10, -Math.PI / 2 + spin * .2, -Math.PI / 2 + spin * .2 + .8); ctx.stroke(); ctx.restore(); }
    // 門（右邊）：門框 → 打開後看到外面的夕陽
    const dl = 1120, dw = 200, dt = 420, open = E.easeInOut(E.seg(u, 3.7, 4.3));
    ctx.fillStyle = '#6d4c41'; rr(ctx, dl - 16, dt - 16, dw + 32, 790 - dt + 16, 10); ctx.fill();
    const og = ctx.createLinearGradient(0, dt, 0, 790); og.addColorStop(0, '#ff9a62'); og.addColorStop(1, '#ffd38a');
    ctx.fillStyle = og; ctx.fillRect(dl, dt, dw, 790 - dt);
    if (open > 0) {
      ctx.save(); ctx.globalAlpha = .35 * open; ctx.fillStyle = '#ffe0a0';
      ctx.beginPath(); ctx.moveTo(dl, 790); ctx.lineTo(dl + dw, 790); ctx.lineTo(dl + dw - 40, 830); ctx.lineTo(dl - 260, 830); ctx.closePath(); ctx.fill(); ctx.restore();
      glow(ctx, dl + dw / 2, 600, 260, 'rgba(255,220,150,.7)', open);
    }
    const leafW = dw * (1 - .82 * open);
    ctx.fillStyle = '#a1662f'; ctx.fillRect(dl + dw - leafW, dt, leafW, 790 - dt);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; if (leafW > 40) { ctx.fillRect(dl + dw - leafW + leafW * .15, dt + 30, leafW * .7, 130); ctx.fillRect(dl + dw - leafW + leafW * .15, dt + 200, leafW * .7, 140); }
    circle(ctx, dl + dw - leafW + Math.min(24, leafW * .3), 610, 9, '#ffd54f');
    // 敲門聲／鑰匙聲（聲波）
    const snd = E.seg(u, 3.2, 3.8); if (snd > 0 && snd < 1) for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalAlpha = 1 - snd; ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(dl - 10, 600, 30 + i * 22 + snd * 30, Math.PI * .75, Math.PI * 1.25); ctx.stroke(); ctx.restore(); }
    // 傍晚變暗
    ctx.save(); ctx.fillStyle = '#3a2a5a'; ctx.globalAlpha = .25 * E.seg(u, 1.5, 3.6) * (1 - E.seg(u, 4.0, 5.0)); ctx.fillRect(0, 0, W, H + 300); ctx.restore();
    // ---- 孩子：背著書包走進門 ----
    const kIn = E.easeOut(E.seg(u, 4.0, 4.9)), kx = E.lerp(1250, 1060, kIn), ks = 1.05;
    // ---- 狗 ----
    let d;
    if (u < 1.2) d = { x: 820, pose: 'sit', wag: .25, brow: true };
    else if (u < 2.9) d = { x: 820, pose: 'lie', wag: .15, brow: true };
    else if (u < 4.35) d = { x: 820, pose: 'sit', wag: u > 3.7 ? 1 : .5, eyeK: 1.2, tilt: u > 3.25 ? 12 : 0 };
    else if (u < 4.95) d = { x: E.lerp(820, 905, E.seg(u, 4.35, 4.95)), pose: 'stand', run: true };
    else if (u < 6.4) { const k = E.seg(u, 4.95, 5.25); d = { x: E.lerp(905, 920, k), pose: 'up', hop: 30 * Math.sin(k * Math.PI) + (k >= 1 ? Math.abs(E.wave(u, 2.2)) * 10 : 0), happy: true }; }
    else { const k = E.seg(u, 6.4, 6.7); d = { x: 902, pose: 'sit', hop: 22 * Math.sin(k * Math.PI), happy: true, tilt: -10 }; }
    const happy = !!d.happy;
    // 撲上來時孩子舉手歡呼；狗坐下後孩子的手放在牠頭頂摸摸
    const sitPts = dog_points(902, 790, 1, { pose: 'sit', tilt: -10 });
    const pet = u > 6.7 ? [sitPts.top[0] + 6 * E.wave(u, 1.5), sitPts.top[1] + 6] : null;
    if (d.happy) glow(ctx, 990, 600, 320, 'rgba(255,220,150,.5)');
    const kid = () => {
      dog_backpack(ctx, kx + 44, 650, .95);
      drawPerson(ctx, 'kid', kx, 790, ks, { t: u, flip: true, bob: kIn < 1 ? -Math.abs(E.wave(u, 3)) * 10 : 0, reachR: pet, armR: 10, armL: happy ? 130 + 8 * E.wave(u, 2) : 10,
        eyes: happy ? 'happy' : 'open', mouth: u > 4.6 ? 'open' : 'smile' });
    };
    if (u > 4.0 && !pet) kid();
    // 等待時的嘆氣
    if (u > 1.4 && u < 2.8) { const k = (u - 1.4) % .7 / .7; ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI) * .7; circle(ctx, 820 + 105 + k * 30, 790 - 70 - k * 30, 8 + k * 8, '#fff'); ctx.restore(); }
    const pt = dog_draw(ctx, d.x, 790, 1, { t: u, pose: d.pose, run: d.run, hop: d.hop, wag: d.wag ?? 1, wagSpd: happy ? 30 : 14, brow: d.brow, eyeK: d.eyeK,
      tilt: d.tilt || 0, paw: [kx - 40, 702], tongue: happy, mouth: happy && u < 5.8 ? 'open' : null, eyes: happy ? 'happy' : 'open' });
    if (pet) kid();   // 狗坐下後孩子畫在前面，手放在狗頭頂
    if (u > 3.25 && u < 4.4) { const a = E.pop(u, 3.25, .3); [-1, 1].forEach(sd => { ctx.save(); ctx.globalAlpha = .9; ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pt.top[0] + sd * 22 * a, pt.top[1] - 18 * a); ctx.lineTo(pt.top[0] + sd * 34 * a, pt.top[1] - 40 * a); ctx.stroke(); ctx.restore(); }); }
    if (happy) { FX.burst(ctx, u, 990, 560, 5.1, 20, 6); FX.floatHearts(ctx, u, 990, 520, 8, 300, 23, 5.3); FX.sparkles(ctx, u, 990, 600, 260, 12, 14); }
  },
};
