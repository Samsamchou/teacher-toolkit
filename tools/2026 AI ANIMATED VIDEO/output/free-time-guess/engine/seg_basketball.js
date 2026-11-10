// 第 6 段 play basketball：夜晚社區籃球場（鐵絲網、城市天際線、照明燈）。
// 運球（手在最高點、球在中間碰地）走向籃框 → 停下原地運兩下 → 雙手收球 → 屈膝 → 跳投（投籃手跟隨）
// → 球帶著後旋畫弧線空心入網（籃網晃動）→ 落地彈跳、後旋讓球往回滾 → 落地握拳慶祝、朋友坐板凳拍手
SEGMENTS.basketball = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, walk, STAND, SIT, mix, joints, step, keyed } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800, Z = 0.92;          // 鏡頭縮小 0.8，才放得下真實比例的籃框
  const BR = 27;                              // 籃球半徑
  const FY = G + 8;                           // 站立時腳的高度（跟 STAND 一樣）
  const FLOOR_Y = G + 4 - BR;                 // 球碰地時球心高度
  const RIM = { x: 1614, y: 178, rx: 52, ry: 9 };
  const NET_H = 86;
  const BOARD = { x: 1700, top: 30, bot: 212 };
  const POLE = { x: 1885, base: 742 };
  const BENCH = { x: 2095, top: G - 58 };   // 底線外的板凳（朋友面向左看）
  const X0 = 330, XS = 1130;                  // 起點、投籃點
  const WALK0 = 0.5, WALK1 = 4.3;             // 運球前進
  const PD = 0.56;                            // 運球週期（t = 0, 0.56, … 5.6 時球在手上最高點）
  const TG = 5.6, TD = 5.85, TJ = 6.2, TR = 6.45, TL = 6.72, TT = 7.3; // 收球、屈膝、起跳、出手、落地、進框
  const deg = r => r * 180 / Math.PI;

  // ---------- 背景 ----------
  const R = rng(21);
  const stars = Array.from({ length: 90 }, () => ({ x: -700 + R() * 3400, y: -180 + R() * 520, r: 0.8 + R() * 1.8, p: R() * 6 }));
  const blds = [];
  for (let x = -720; x < 2760;) {
    const w = 90 + R() * 130, top = 300 + R() * 250, far = R() < 0.45;
    const wins = [];
    for (let wy = top + 22; wy < 690; wy += 34) for (let wx = x + 16; wx < x + w - 22; wx += 30) if (R() < 0.28) wins.push([wx, wy, R()]);
    blds.push({ x, w, top: far ? top - 60 : top, far, wins });
    x += w + (far ? -30 : 6);
  }
  blds.sort((a, b) => (b.far ? 1 : 0) - (a.far ? 1 : 0));
  const LIGHTS = [150, 1250, 2420];

  function background(t) {
    const g = ctx.createLinearGradient(0, -200, 0, 720);
    g.addColorStop(0, C.sky0); g.addColorStop(0.5, C.sky1); g.addColorStop(0.85, '#4f2580'); g.addColorStop(1, '#7a2f86');
    ctx.fillStyle = g; ctx.fillRect(-800, -400, 3800, 1120);
    ctx.fillStyle = C.light;
    stars.forEach(s => { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 彎月
    glow(560, 215, 120, 'rgba(255,244,214,0.3)');
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(560, 215, 40, 0, 7); ctx.fill();
    ctx.fillStyle = '#251a5c'; ctx.beginPath(); ctx.arc(578, 203, 36, 0, 7); ctx.fill();
    // 城市天際線
    blds.forEach(b => {
      ctx.fillStyle = b.far ? '#2a1e62' : '#1c1450';
      ctx.fillRect(b.x, b.top, b.w, 720 - b.top);
      if (!b.far) { ctx.fillStyle = '#2c2170'; ctx.fillRect(b.x, b.top, b.w, 6); }
      b.wins.forEach(([wx, wy, k]) => {
        ctx.fillStyle = k < 0.55 ? 'rgba(255,211,107,0.75)' : 'rgba(201,184,255,0.35)';
        if (b.far) ctx.globalAlpha = 0.55;
        ctx.fillRect(wx, wy, 12, 16); ctx.globalAlpha = 1;
      });
    });
    // 照明燈（光束＋燈頭）
    LIGHTS.forEach(x => {
      ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = C.light;
      ctx.beginPath(); ctx.moveTo(x - 50, 160); ctx.lineTo(x + 50, 160); ctx.lineTo(x + 520, 940); ctx.lineTo(x - 420, 940); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#17103d'; ctx.fillRect(x - 7, 170, 14, 550);
      ctx.fillStyle = '#2a1e5e'; ctx.fillRect(x - 64, 124, 128, 50);
      glow(x, 150, 190, 'rgba(255,244,214,0.5)');
      for (let i = 0; i < 4; i++) { const lx = x - 45 + i * 30; glow(lx, 149, 20, 'rgba(255,244,214,0.9)'); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(lx, 149, 8, 0, 7); ctx.fill(); }
    });
    // 鐵絲網圍籬
    const FT0 = 430, FB = 712;
    ctx.save(); ctx.beginPath(); ctx.rect(-800, FT0, 3800, FB - FT0); ctx.clip();
    ctx.fillStyle = 'rgba(20,14,60,0.25)'; ctx.fillRect(-800, FT0, 3800, FB - FT0);
    ctx.strokeStyle = 'rgba(201,184,255,0.16)'; ctx.lineWidth = 2;
    for (let x = -1100; x < 3000; x += 26) {
      ctx.beginPath(); ctx.moveTo(x, FT0); ctx.lineTo(x + (FB - FT0), FB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, FB); ctx.lineTo(x + (FB - FT0), FT0); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#3a2f78';
    for (let x = -760; x < 2800; x += 250) ctx.fillRect(x - 5, FT0 - 6, 10, FB - FT0 + 6);
    ctx.fillRect(-800, FT0 - 8, 3800, 8);
    // 球場地面
    const gg = ctx.createLinearGradient(0, 712, 0, 1000);
    gg.addColorStop(0, '#2a3f78'); gg.addColorStop(1, '#1b2858');
    ctx.fillStyle = gg; ctx.fillRect(-800, 712, 3800, 400);
    ctx.fillStyle = 'rgba(255,244,214,0.05)'; ctx.fillRect(-800, 712, 3800, 10);
    // 禁區（上色）＋白線
    ctx.fillStyle = '#2f5a8c';
    ctx.beginPath(); ctx.moveTo(1265, 740); ctx.lineTo(1780, 740); ctx.lineTo(1800, 880); ctx.lineTo(1250, 880); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(241,236,255,0.55)'; ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1258, 810, 46, 70, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-800, 726); ctx.lineTo(2800, 726); ctx.stroke();       // 邊線
    ctx.beginPath(); ctx.moveTo(1930, 726); ctx.lineTo(1990, 960); ctx.stroke();       // 底線
    ctx.beginPath(); ctx.ellipse(1640, 810, 640, 112, 0, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke(); // 三分線
    ctx.beginPath(); ctx.moveTo(-40, 726); ctx.lineTo(-90, 960); ctx.stroke();         // 中線
  }

  // ---------- 籃架 ----------
  function hoopBack(t) {
    // 柱子＋底座護墊
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(POLE.x, POLE.base + 4, 70, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d3380'; ctx.fillRect(POLE.x - 13, 64, 26, POLE.base - 64);
    ctx.fillStyle = '#4c42a0'; ctx.fillRect(POLE.x - 13, 64, 8, POLE.base - 64);
    ctx.fillStyle = '#2fa59a'; roundRect(POLE.x - 24, POLE.base - 150, 48, 150, 10); ctx.fill();
    ctx.fillStyle = '#23857c'; ctx.fillRect(POLE.x + 6, POLE.base - 150, 18, 150);
    // 伸臂
    ctx.strokeStyle = '#3d3380'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(POLE.x, 74); ctx.lineTo(BOARD.x + 30, 74); ctx.stroke();
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(POLE.x, 150); ctx.lineTo(BOARD.x + 30, 80); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(POLE.x, 150); ctx.lineTo(BOARD.x + 30, 170); ctx.stroke();
    // 籃板（側面略帶角度：窄窄的玻璃面＋框）
    ctx.fillStyle = 'rgba(214,226,255,0.28)';
    ctx.beginPath(); ctx.moveTo(BOARD.x, BOARD.top); ctx.lineTo(BOARD.x + 34, BOARD.top - 10); ctx.lineTo(BOARD.x + 34, BOARD.bot - 6); ctx.lineTo(BOARD.x, BOARD.bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e6e0ff'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(241,236,255,0.8)'; ctx.lineWidth = 3;   // 小方框
    ctx.beginPath(); ctx.moveTo(BOARD.x + 6, 128); ctx.lineTo(BOARD.x + 22, 124); ctx.lineTo(BOARD.x + 22, 188); ctx.lineTo(BOARD.x + 6, 192); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#c9c2e8'; ctx.fillRect(BOARD.x - 6, BOARD.top - 2, 8, BOARD.bot - BOARD.top + 4);
    // 籃框後半圈＋支架
    ctx.fillStyle = '#c9c2e8'; ctx.fillRect(BOARD.x - 14, RIM.y - 6, 14, 20);
    ctx.strokeStyle = '#d9772c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(RIM.x, RIM.y, RIM.rx, RIM.ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
  }
  // 籃網：球經過時被撐開往下拉，之後晃動
  function netShape(t) {
    const b = ballAt(t);
    let push = 0, bx = 0;
    if (t > TT - 0.05 && b.y > RIM.y - 10 && b.y < RIM.y + NET_H + BR) {
      push = clamp(1 - Math.abs((b.y - (RIM.y + NET_H * 0.55)) / (NET_H * 0.55 + BR)), 0, 1); bx = b.x - RIM.x;
    }
    const d = t - (TT + 0.3);
    const wob = d > 0 ? Math.exp(-d * 3.2) : 0;
    const sway = 9 * Math.sin(d * 18) * wob;
    return { len: NET_H + 18 * push + 8 * wob * Math.abs(Math.sin(d * 18)), bot: 28 + 10 * push, sway: sway + bx * 0.3 * push };
  }
  function net(t, front) {
    const n = netShape(t);
    const N = 12;
    ctx.strokeStyle = front ? 'rgba(241,236,255,0.9)' : 'rgba(201,184,255,0.45)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    const ring = (k) => ({ cx: RIM.x + n.sway * k * k, cy: RIM.y + n.len * k, rx: lerp(RIM.rx - 4, n.bot, k), ry: lerp(RIM.ry, 5, k) });
    const pt = (i, k) => { const r = ring(k); const a = i / N * Math.PI * 2; return { x: r.cx + r.rx * Math.cos(a), y: r.cy + r.ry * Math.sin(a), f: Math.sin(a) > 0 }; };
    // 斜交的網線（逐段：前面那半邊畫在球前面）
    for (let i = 0; i < N; i++) for (const dir of [1, -1]) for (let s = 0; s < 4; s++) {
      const p = pt(i + dir * s * 0.5, s / 4), q = pt(i + dir * (s + 1) * 0.5, (s + 1) / 4);
      if (p.f !== front && q.f !== front) continue;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    if (front) { const r = ring(1); ctx.beginPath(); ctx.ellipse(r.cx, r.cy, r.rx, r.ry, 0, 0, Math.PI); ctx.stroke(); }
  }
  function hoopFront(t) {
    net(t, true);
    ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(RIM.x, RIM.y, RIM.rx, RIM.ry, 0, 0, Math.PI); ctx.stroke();
    // 進球瞬間的金色閃光
    const k = (t - TT - 0.05) / 0.45;
    if (k > 0 && k < 1) {
      glow(RIM.x, RIM.y + 30, 150 * (0.5 + k), `rgba(255,211,107,${0.45 * (1 - k)})`);
      ctx.save(); ctx.strokeStyle = `rgba(255,211,107,${1 - k})`; ctx.lineWidth = 5;
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (0.95 + 1.1 * i / 7), r0 = 70 + 40 * k, r1 = 100 + 70 * k;
        ctx.beginPath(); ctx.moveTo(RIM.x + Math.cos(a) * r0, RIM.y + 20 + Math.sin(a) * r0 * 0.8); ctx.lineTo(RIM.x + Math.cos(a) * r1, RIM.y + 20 + Math.sin(a) * r1 * 0.8); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------- 小工具 ----------
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function legIK(hip, foot, face) {
    const r = FT.ik(hip, foot, 50 * S, 50 * S, -face);
    return { l: deg(Math.atan2(r.elbow.x - hip.x, r.elbow.y - hip.y)), k: deg(Math.atan2(r.hand.x - r.elbow.x, r.hand.y - r.elbow.y)) };
  }
  function plant(p, f1, f2) {
    const a = legIK(p, f1, p.face || 1), b = legIK(p, f2, p.face || 1);
    return { ...p, l1: a.l, k1: a.k, l2: b.l, k2: b.k };
  }
  const shoulder = p => step({ x: p.x, y: p.y }, 66 * S, 180 - (p.tor || 0));
  const handAt = (sh, a, e) => step(step(sh, 40 * S, a), 38 * S, e);

  // ---------- 主角的身體（不含手） ----------
  function jumpH(t) { if (t < TJ || t > TL) return 0; const k = (t - TJ) / (TL - TJ); return 4 * 68 * k * (1 - k); }
  function heroX(t) {
    if (t < WALK0) return X0;
    if (t < WALK1) return lerp(X0, XS, prog(t, WALK0, WALK1, E.inOut));
    return XS + 10 * prog(t, TJ, TL);     // 跳投時身體略往前
  }
  function heroHipY(t) {
    let y = G - 146;
    if (t >= WALK1 && t < TG) y += 8 * prog(t, WALK1, WALK1 + 0.3);              // 原地運球微蹲
    else if (t >= TG && t < TJ) y += lerp(8, 0, prog(t, TG, TG + 0.2)) + 36 * prog(t, TD - 0.05, 6.06) * (1 - prog(t, 6.06, TJ, E.in)); // 屈膝蓄力
    else if (t >= TL) y += 26 * prog(t, TL, TL + 0.1, E.out) * (1 - prog(t, TL + 0.1, 7.1)); // 落地緩衝
    if (t >= 7.48 && t < 8.4) y += 10 * Math.abs(Math.sin((t - 7.48) / 0.92 * Math.PI * 2)); // 慶祝時膝蓋彈
    return y - jumpH(t);
  }
  function bodyPose(t) {
    const x = heroX(t), y = heroHipY(t);
    if (t >= WALK0 && t < WALK1) { // 走路（手另外處理）
      const amp = clamp(Math.min(t - WALK0, WALK1 - t) / 0.3, 0, 1);
      const w = walk(x, G, (x - X0) / 92 * Math.PI, amp);
      return { ...w, walking: true };
    }
    let p = { x, y, tor: 0, face: 1, hd: 0, a2: -8, e2: 18 };
    if (t >= TG && t < TJ) p.tor = 8 * prog(t, TD - 0.05, 6.06) * (1 - prog(t, 6.06, TJ));
    if (t > TJ - 0.02 && t < TL) { // 空中：腳尖朝下
      const k = Math.sin(Math.PI * clamp((t - TJ) / (TL - TJ), 0, 1));
      return { ...p, l1: 6 + 8 * k, k1: -6 - 18 * k, l2: -4 + 4 * k, k2: -10 - 20 * k };
    }
    return plant(p, { x: x + 14, y: FY }, { x: x - 18, y: FY });
  }

  // ---------- 球的位置（主控） ----------
  function dribble(t, x, hipY) {
    const u = ((t % PD) + PD) % PD / PD;
    const d = Math.abs(1 - 2 * u);
    const yT = hipY + 34, yF = FLOOR_Y;
    const bx = x + 60;
    const by = yF - (yF - yT) * Math.sin(d * Math.PI / 2);
    // 手：0–0.15 跟著球往下推，0.15–0.85 抬起等球，0.85–1 接球往上帶
    const top = u => yF - (yF - yT) * Math.sin(Math.abs(1 - 2 * u) * Math.PI / 2);
    let hy;
    if (u < 0.15) hy = by - BR - 6;
    else if (u > 0.85) hy = by - BR - 6;
    else hy = top(0.15) - BR - 6 - 14 * Math.sin(Math.PI * (u - 0.15) / 0.7);
    return { ball: { x: bx, y: by, a: u * 1.2 }, hand: { x: bx - 4, y: hy } };
  }
  const SHOT = [
    [TG, { dx: 60, dy: 34 }], [TD, { dx: 46, dy: -80 }], [6.06, { dx: 46, dy: -76 }],
    [6.3, { dx: 52, dy: -195 }], [TR, { dx: 62, dy: -228 }],
  ];
  function heldBall(t) { // TG–TR：球在手上
    const k = keyed(SHOT, t);
    return { x: heroX(t) + k.dx, y: heroHipY(t) + k.dy, a: 0 };
  }
  // 出手後：預先模擬（重力、籃網減速、地板彈跳、後旋往回滾）
  const GR = 2000;
  const REL = heldBall(TR);
  const SIM = (() => {
    const out = [], DT = 1 / 480, T = TT - TR;
    let x = REL.x, y = REL.y, vx = (RIM.x - REL.x) / T, vy = (RIM.y - REL.y) / T - 0.5 * GR * T, a = 0, w = -9, bounces = 0, rolling = false;
    for (let i = 0; i <= 480 * 10; i++) {
      out.push({ x, y, a });
      const tt = TR + i * DT;
      if (!rolling) vy += GR * DT;
      if (tt > TT && y > RIM.y && y < RIM.y + NET_H + 6 && Math.abs(x - RIM.x) < 50) { // 在網子裡被拉慢、置中
        vx += ((RIM.x - 6 - x) * 40 - vx * 7) * DT; vy -= vy * 6.5 * DT;
      }
      x += vx * DT; y += vy * DT; a += w * DT;
      if (y >= FLOOR_Y && vy > 0) {
        y = FLOOR_Y; vy = -0.6 * vy; bounces++;
        vx = bounces === 1 ? -150 : vx * 0.85;
        w = vx / BR;
        if (Math.abs(vy) < 90) { vy = 0; rolling = true; }
      }
      if (rolling) { const dv = 110 * DT; vx = Math.abs(vx) <= dv ? 0 : vx - Math.sign(vx) * dv; w = vx / BR; }
    }
    return out;
  })();
  function simAt(t) {
    const f = clamp((t - TR) * 480, 0, SIM.length - 1), i = Math.floor(f), k = f - i;
    const A = SIM[i], B = SIM[Math.min(i + 1, SIM.length - 1)];
    return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), a: lerp(A.a, B.a, k) };
  }
  function ballAt(t) {
    if (t < TG) { return dribble(t, heroX(t), heroHipY(t)).ball; }
    if (t < TR) return heldBall(t);
    return simAt(t);
  }

  // ---------- 主角（手接到球上） ----------
  function heroPose(t) {
    const p = bodyPose(t);
    let over = false; // 近側手要畫在球上面
    if (t < TG) {
      const d = dribble(t, heroX(t), heroHipY(t));
      p.h1x = d.hand.x; p.h1y = d.hand.y; p.b1 = 1; over = true;
      if (!p.walking) { p.a2 = -10; p.e2 = 16; }
    } else if (t < TR) {
      const b = heldBall(t);
      const up = prog(t, 6.06, 6.3);
      // 投籃手在球的後下方、輔助手扶在球側
      const join = prog(t, TG, TG + 0.15);
      const sh = shoulder(p);
      const rest2 = handAt(sh, -8, 18);
      p.h1x = b.x - lerp(4, 18, prog(t, TG, TD)); p.h1y = b.y + lerp(-BR - 6, 16, prog(t, TG, TD)); p.b1 = 1;
      p.h2x = lerp(rest2.x, b.x - 2, join); p.h2y = lerp(rest2.y, b.y - 6 + 4 * up, join); p.b2 = 1;
      over = t < TG + 0.12;
    } else {
      const sh = shoulder(p);
      const rel = { x: REL.x - 18, y: REL.y + 16 };
      const relSh = shoulder(bodyPose(TR));
      const relOff = { x: rel.x - relSh.x, y: rel.y - relSh.y };
      const follow = handAt(sh, 146, 132);                 // 跟隨動作：手臂伸向籃框、手腕下壓
      const guide = handAt(sh, 125, 140);
      const rest1 = handAt(sh, 8, 16), rest2 = handAt(sh, -8, 18);
      const kF = prog(t, TR, TR + 0.12, E.out);
      let h1 = { x: lerp(sh.x + relOff.x, follow.x, kF), y: lerp(sh.y + relOff.y, follow.y, kF) };
      let h2 = { x: lerp(sh.x + relOff.x + 14, guide.x, kF), y: lerp(sh.y + relOff.y - 22, guide.y, kF) };
      // 落地後慢慢放下
      const down = prog(t, 7.15, 7.45);
      h2 = { x: lerp(h2.x, rest2.x, down), y: lerp(h2.y, rest2.y, down) };
      // 握拳慶祝：往上衝拳 → 拉下 → 再一次
      const pumpLow = handAt(sh, 40, 150), pumpHigh = handAt(sh, 120, 150);   // 往前上方衝拳，不擋臉
      const keys = [
        [7.2, { k: 0, j: 0 }], [7.45, { k: 0, j: 1 }], [7.62, { k: 1, j: 1 }], [7.82, { k: 0, j: 1 }],
        [8.0, { k: 0.75, j: 1 }], [8.18, { k: 0, j: 1 }], [8.6, { k: 0, j: 1 }], [9.1, { k: 0, j: 0 }],
      ];
      const kk = keyed(keys, t);
      const pump = { x: lerp(pumpLow.x, pumpHigh.x, kk.k), y: lerp(pumpLow.y, pumpHigh.y, kk.k) };
      const fromFollow = prog(t, 7.15, 7.45);
      const tgt = kk.j > 0.001 && t < 8.6 ? pump : rest1;
      if (t < 8.6) h1 = { x: lerp(h1.x, tgt.x, fromFollow), y: lerp(h1.y, tgt.y, fromFollow) };
      else { const kr = prog(t, 8.6, 9.1); h1 = { x: lerp(pumpLow.x, rest1.x, kr), y: lerp(pumpLow.y, rest1.y, kr) }; }
      p.h1x = h1.x; p.h1y = h1.y; p.b1 = t < 7.45 ? 1 : -1;
      p.h2x = h2.x; p.h2y = h2.y; p.b2 = t < 7.3 ? 1 : -1;
      if (t > 9.1) { p.y += 1.5 * Math.sin((t - 9.1) * 2.2); }
    }
    p.gy = G;
    return { p, over };
  }
  const hair = (J, col, s, face) => { // 短髮＋頭帶（同色剪影的小造型）
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(J.head.x - face * 3 * s, J.head.y - 3 * s, 25 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#7d6fc4'; // 頭帶
    ctx.save(); ctx.translate(J.head.x, J.head.y); ctx.rotate(-0.08 * face);
    ctx.fillRect(-24 * s, -12 * s, 48 * s, 7 * s); ctx.restore();
  };
  const wristband = (J, col, s) => { ctx.fillStyle = '#7d6fc4'; const h = J.A1.hand, e = J.A1.el; const m = { x: lerp(h.x, e.x, 0.22), y: lerp(h.y, e.y, 0.22) }; ctx.beginPath(); ctx.arc(m.x, m.y, 9 * s, 0, 7); ctx.fill(); };

  // ---------- 球 ----------
  function drawBall(b) {
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.fillStyle = '#b8612a'; ctx.beginPath(); ctx.arc(0, 0, BR, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, BR, 0, 7); ctx.clip();
    ctx.fillStyle = '#e0853c'; ctx.beginPath(); ctx.arc(-4, -4, BR - 2, 0, 7); ctx.fill();
    ctx.rotate(b.a);
    ctx.strokeStyle = '#4a2614'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-BR, 0); ctx.lineTo(BR, 0); ctx.moveTo(0, -BR); ctx.lineTo(0, BR); ctx.stroke();
    ctx.beginPath(); ctx.arc(-BR * 1.32, 0, BR * 0.98, -0.8, 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(BR * 1.32, 0, BR * 0.98, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,230,190,0.35)'; ctx.beginPath(); ctx.ellipse(-9, -11, 7, 4, -0.6, 0, 7); ctx.fill();
    ctx.restore();
  }
  function ballShadow(b) {
    const h = clamp((FLOOR_Y - b.y) / 500, 0, 1);
    ctx.fillStyle = `rgba(8,5,30,${0.35 * (1 - h * 0.7)})`;
    ctx.beginPath(); ctx.ellipse(b.x + 4, G + 6, BR * (1.1 - 0.5 * h), 6 * (1 - 0.5 * h), 0, 0, 7); ctx.fill();
  }
  function trail(t) { // 唯一的紅色：出手到進框的軌跡
    if (t < TR || t > TT + 0.25) return;
    const fade = 1 - prog(t, TT, TT + 0.25);
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 1; i <= 16; i++) {
      const ta = Math.max(TR, t - (i - 1) * 0.03), tb = Math.max(TR, t - i * 0.03);
      if (ta > TT + 0.02) continue;
      const a = simAt(ta), b = simAt(Math.min(tb, TT));
      ctx.strokeStyle = `rgba(232,67,58,${0.7 * fade * (1 - i / 17)})`; ctx.lineWidth = 22 * (1 - i / 20);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 朋友（坐板凳、進球後拍手） ----------
  function bench() {
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(BENCH.x + 10, G + 4, 120, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(BENCH.x - 90, BENCH.top + 12, 12, G - BENCH.top - 10); ctx.fillRect(BENCH.x + 96, BENCH.top + 12, 12, G - BENCH.top - 10);
    ctx.fillStyle = '#8a5a3c'; roundRect(BENCH.x - 104, BENCH.top, 226, 16, 6); ctx.fill();
    ctx.fillStyle = '#a8744a'; ctx.fillRect(BENCH.x - 100, BENCH.top + 2, 218, 4);
    // 水壺
    ctx.fillStyle = '#2fa59a'; roundRect(BENCH.x + 64, BENCH.top - 40, 20, 40, 6); ctx.fill();
    ctx.fillStyle = '#c9b8ff'; ctx.fillRect(BENCH.x + 67, BENCH.top - 48, 14, 9);
  }
  function friend(t) {
    const base = FT.mirror({ ...SIT(BENCH.x - 10, G, BENCH.top), a1: 40, e1: 80, a2: 34, e2: 74, hd: 0 });
    base.y = BENCH.top - 12 + 1.2 * Math.sin(t * 2.1 + 1);
    const sh = shoulder(base);
    const clap = prog(t, 7.4, 7.6) * (1 - prog(t, 8.9, 9.2));
    let p = base;
    if (clap > 0) {
      const open = 0.5 + 0.5 * Math.cos((t - 7.6) * Math.PI * 2 * 3.2);
      const c = { x: sh.x - 58, y: sh.y + 22 };
      const r1 = handAt(sh, -40, -80), r2 = handAt(sh, -34, -74);
      p = { ...base, h1x: lerp(r1.x, c.x - 4 - 14 * open, clap), h1y: lerp(r1.y, c.y - 6 * open, clap), b1: 1,
                     h2x: lerp(r2.x, c.x + 4 + 2 * open, clap), h2y: lerp(r2.y, c.y + 4 * open, clap), b2: 1 };
    }
    p.gy = G;
    figure(p, S, 'npc', {
      head: (J, col, s, face) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(J.head.x, J.head.y - 4 * s, 25 * s, Math.PI, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.ellipse(J.head.x + face * 24 * s, J.head.y - 6 * s, 17 * s, 5 * s, 0, 0, 7); ctx.fill();
      },
    });
    // 拍手的小閃光
    if (clap > 0.9) {
      const ph = ((t - 7.6) * 3.2) % 1;
      if (ph < 0.25) {
        const c = { x: sh.x - 62, y: sh.y + 16 };
        ctx.save(); ctx.strokeStyle = `rgba(255,211,107,${1 - ph * 4})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const a = -Math.PI * (0.25 + 0.25 * i) - 0.2; ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * 26, c.y + Math.sin(a) * 26); ctx.lineTo(c.x + Math.cos(a) * 42, c.y + Math.sin(a) * 42); ctx.stroke(); }
        ctx.restore();
      }
    }
  }

  function draw(c, t) {
    // 鏡頭：先跟著運球的人（近），走近籃框時慢慢拉遠，把人和籃框一起框進來
    const k = prog(t, 3.0, 5.2);
    const zoom = lerp(1.06, Z, k) * (1 + 0.02 * prog(t, 5.2, 10));
    const cx = lerp(heroX(t) + 150, 1290, k);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(960, 868); ctx.scale(zoom, zoom); ctx.translate(-cx, -800);
    background(t);
    hoopBack(t);
    net(t, false);
    bench(); friend(t);
    const H = heroPose(t);
    const b = ballAt(t);
    ballShadow(b);
    const J = figure(H.p, S, 'hero', { head: hair, front: wristband });
    const flick = prog(t, TR, TR + 0.12) * (1 - prog(t, 7.15, 7.35));
    if (flick > 0) { // 出手後手腕下壓（手指朝籃框往下）
      const h = J.A1.hand, dx = h.x - J.A1.el.x, dy = h.y - J.A1.el.y, m = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) + 1.25 * flick, L = 20 * S;
      FT.limb(h, { x: h.x + Math.cos(a) * L, y: h.y + Math.sin(a) * L }, null, 11 * S, C.hero);
    }
    trail(t);
    drawBall(b);
    if (H.over) { // 近側手臂畫在球上面
      FT.limb(J.sh, J.A1.el, J.A1.hand, 17 * S, C.hero);
      ctx.fillStyle = C.hero; ctx.beginPath(); ctx.arc(J.A1.hand.x, J.A1.hand.y, 9.5 * S, 0, 7); ctx.fill();
      wristband(J, C.hero, S);
    }
    hoopFront(t);
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'play', verb: true }, { w: 'basketball' }], draw };
})();
