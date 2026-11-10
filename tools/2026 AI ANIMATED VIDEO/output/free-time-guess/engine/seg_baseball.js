// 第 1 段 play baseball：夜間球場。投手投球 → 打者揮棒擊中 → 球飛進夜空變成星星 → 打者丟棒跑向一壘
SEGMENTS.baseball = (() => {
  const { C, clamp, lerp, E, prog, step, keyed, rng, figure, glow } = FT;
  const S = 1.55;            // 人物比例
  const GROUND_HOME = 806, GROUND_MOUND = 774;

  // ---------- 背景：夜間球場 ----------
  const R = rng(7);
  const stars = Array.from({ length: 70 }, () => ({ x: R() * 1920, y: R() * 330, r: 0.8 + R() * 1.8, p: R() * 6 }));
  const crowd = Array.from({ length: 900 }, () => ({ x: R() * 1920, y: 0, k: R(), lit: R() < 0.05, p: R() * 6 }));
  crowd.forEach(c => { c.y = standTop(c.x) + 14 + c.k * (572 - standTop(c.x) - 22); });
  function standTop(x) { const u = (x - 960) / 960; return 420 + 70 * u * u; }

  function background(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0, C.sky0); g.addColorStop(0.5, C.sky1); g.addColorStop(0.82, '#5a2a80'); g.addColorStop(1, C.glow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 600);
    ctx.fillStyle = C.light;
    stars.forEach(s => { ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 看台
    ctx.fillStyle = '#251a5a'; ctx.beginPath(); ctx.moveTo(0, 600);
    for (let x = 0; x <= 1920; x += 20) ctx.lineTo(x, standTop(x));
    ctx.lineTo(1920, 600); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6a3f9e'; ctx.lineWidth = 4; ctx.beginPath();
    for (let x = 0; x <= 1920; x += 20) x ? ctx.lineTo(x, standTop(x)) : ctx.moveTo(x, standTop(x));
    ctx.stroke();
    crowd.forEach(c => {
      ctx.fillStyle = c.lit ? C.gold : (c.k < 0.5 ? '#3d2d84' : '#33256f');
      ctx.globalAlpha = c.lit ? 0.5 + 0.5 * Math.sin(t * 3 + c.p) : 1;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.lit ? 2.2 : 3.2, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 照明燈塔
    [[240, 150], [1690, 150]].forEach(([x, y]) => {
      ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = C.light;
      ctx.beginPath(); ctx.moveTo(x - 60, y + 40); ctx.lineTo(x + 60, y + 40); ctx.lineTo(x + (x < 960 ? 700 : -100), 900); ctx.lineTo(x + (x < 960 ? 100 : -700), 900); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#1a1240'; ctx.fillRect(x - 6, y + 40, 12, 560 - y);
      ctx.fillStyle = '#2a1e5e'; ctx.fillRect(x - 78, y - 10, 156, 64);
      glow(x, y + 22, 210, 'rgba(255,244,214,0.55)');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
        const lx = x - 54 + i * 36, ly = y + 6 + j * 30;
        glow(lx, ly, 22, 'rgba(255,244,214,0.9)'); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(lx, ly, 9, 0, 7); ctx.fill();
      }
    });
    // 外野牆
    ctx.fillStyle = '#173f4c'; ctx.fillRect(0, 572, 1920, 34);
    ctx.fillStyle = C.gold; ctx.fillRect(0, 570, 1920, 4);
    // 草地＋割草條紋
    const gg = ctx.createLinearGradient(0, 606, 0, 905);
    gg.addColorStop(0, '#1d6b62'); gg.addColorStop(1, '#134a4c');
    ctx.fillStyle = gg; ctx.fillRect(0, 606, 1920, 300);
    let y = 606, h = 14, i = 0;
    while (y < 905) { if (i % 2) { ctx.fillStyle = 'rgba(255,255,255,0.045)'; ctx.fillRect(0, y, 1920, h); } y += h; h *= 1.22; i++; }
    // 內野紅土（夜色調）
    ctx.fillStyle = '#7b4566'; ctx.beginPath(); ctx.ellipse(1080, 812, 980, 78, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,200,0.10)'; ctx.beginPath(); ctx.ellipse(1080, 800, 960, 58, 0, Math.PI, 2 * Math.PI); ctx.fill();
    // 投手丘＋投手板
    ctx.fillStyle = '#8a5070'; ctx.beginPath(); ctx.ellipse(640, 790, 175, 32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9d6182'; ctx.beginPath(); ctx.ellipse(640, 782, 120, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4efff'; ctx.fillRect(620, 774, 44, 6);
    // 本壘板、打擊區、一壘線、一壘
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4;
    ctx.strokeRect(1175, 792, 70, 26); ctx.strokeRect(1305, 792, 70, 26);
    ctx.beginPath(); ctx.moveTo(1290, 812); ctx.lineTo(1920, 838); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(1250, 800); ctx.lineTo(1290, 800); ctx.lineTo(1300, 808); ctx.lineTo(1270, 816); ctx.lineTo(1240, 808); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1748, 818); ctx.lineTo(1786, 822); ctx.lineTo(1770, 832); ctx.lineTo(1730, 828); ctx.closePath(); ctx.fill();
  }

  // ---------- 投手（面向右、右投） ----------
  const PK = [
    [0.0, { x: 640, y: 626, tor: 0, l1: 10, k1: 4, l2: -10, k2: -4, a1: 25, e1: 150, a2: 20, e2: 160, hd: 0 }],
    [1.3, { x: 640, y: 626, tor: 0, l1: 10, k1: 4, l2: -10, k2: -4, a1: 25, e1: 150, a2: 20, e2: 160, hd: 0 }],
    [2.15, { x: 632, y: 618, tor: -10, l1: 95, k1: 8, l2: -4, k2: -2, a1: 35, e1: 165, a2: 30, e2: 170, hd: 0 }],
    [2.75, { x: 650, y: 646, tor: 6, l1: 52, k1: 14, l2: -42, k2: -12, a1: -105, e1: -165, a2: 95, e2: 105, hd: 0 }],
    [3.05, { x: 668, y: 650, tor: 18, l1: 46, k1: 10, l2: -52, k2: -22, a1: -185, e1: -200, a2: 60, e2: -10, hd: 0 }],
    [3.2, { x: 676, y: 652, tor: 28, l1: 42, k1: 8, l2: -58, k2: -32, a1: -245, e1: -262, a2: 30, e2: -40, hd: 0 }],
    [3.6, { x: 684, y: 648, tor: 36, l1: 38, k1: 6, l2: -78, k2: -52, a1: -322, e1: -345, a2: 25, e2: -30, hd: 0 }],
    [4.6, { x: 676, y: 628, tor: 2, l1: 14, k1: 8, l2: -12, k2: -6, a1: -350, e1: -335, a2: 15, e2: 40, hd: -18 }],
    [99, { x: 676, y: 628, tor: 2, l1: 14, k1: 8, l2: -12, k2: -6, a1: -350, e1: -335, a2: 15, e2: 40, hd: -18 }],
  ];
  const capHead = (brimCol) => (J, col, s, face) => {
    const ctx = FT.ctx;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(J.head.x, J.head.y - 4 * s, 25 * s, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(J.head.x + face * 24 * s, J.head.y - 6 * s, 17 * s, 5 * s, 0, 0, 7); ctx.fill();
  };
  function pitcher(ctx, t) {
    const p = keyed(PK, t); p.face = 1; p.gy = GROUND_MOUND;
    return figure(p, S, 'npc', {
      head: capHead(),
      behind: (J, far, s) => { // 手套在遠側手
        ctx.fillStyle = '#3a2c66'; ctx.beginPath(); ctx.ellipse(J.A2.hand.x, J.A2.hand.y, 17 * s, 14 * s, 0.4, 0, 7); ctx.fill();
      },
    });
  }

  // ---------- 捕手（面向左、蹲姿） ----------
  function catcher(ctx, t) {
    const reach = prog(t, 3.3, 3.7) * (1 - prog(t, 4.0, 4.6));
    const up = prog(t, 4.5, 5.3);             // 全壘打後捕手站起來、往後退一步看球
    const p = { x: lerp(1475, 1545, up), y: lerp(742, 628, up), tor: lerp(-18, -2, up), face: -1,
                l1: lerp(-78, -10, up), k1: lerp(8, -4, up), l2: lerp(-66, 12, up), k2: lerp(14, 6, up),
                a1: lerp(-70 - 10 * reach, -20, up), e1: lerp(-95 - 15 * reach, -60, up), a2: lerp(-15, 10, up), e2: lerp(25, 20, up),
                hd: -prog(t, 3.9, 4.4) * 14 - up * 10, gy: lerp(GROUND_HOME + 6, 780, up) };
    return figure(p, S, 'npc', {
      head: (J, col, s, face) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(J.head.x, J.head.y - 3 * s, 25 * s, Math.PI, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#3a2c66'; ctx.lineWidth = 3 * s;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(J.head.x - 26 * s, J.head.y - 6 * s + i * 9 * s); ctx.lineTo(J.head.x - 8 * s, J.head.y - 6 * s + i * 9 * s); ctx.stroke(); }
      },
      front: (J, col, s) => {
        ctx.fillStyle = '#3a2c66'; ctx.beginPath(); ctx.ellipse(J.A1.hand.x - 6 * s, J.A1.hand.y, 21 * s, 19 * s, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#4b3b80'; ctx.beginPath(); ctx.ellipse(J.A1.hand.x - 10 * s, J.A1.hand.y, 11 * s, 11 * s, 0, 0, 7); ctx.fill();
      },
    });
  }

  // ---------- 打者（面向左） ----------
  const HX = 1272, HY = 662;
  function batState(t) {
    // 回傳 { pose, grip, dir(單位向量), len(0–1 視覺長度), held }
    const base = { x: HX, y: HY, tor: -10, face: -1, l1: -24, k1: -6, l2: 22, k2: 4, hd: 0 };
    const U = S;
    let grip, ang = null, swingDir = null, len = 1;
    if (t < 3.45) {
      const w = Math.sin(t * 2.6);
      grip = { x: HX + 30 * U, y: HY - 98 * U + 2 * w };
      ang = 158 + 5 * w; base.y = HY + 2 * Math.sin(t * 2.6 + 1);
    } else if (t < 3.62) {
      const k = prog(t, 3.45, 3.62);
      grip = { x: HX + lerp(30, 34, k) * U, y: HY + lerp(-98, -84, k) * U };
      ang = lerp(158, 120, k); base.l1 = lerp(-24, -38, k); base.k1 = lerp(-6, -10, k);
    } else if (t < 3.82) {
      const k = prog(t, 3.62, 3.82, E.in);
      grip = { x: HX + lerp(34, -28, k) * U, y: HY + lerp(-84, -62, k) * U };
      const phi = Math.PI * k;
      swingDir = { x: Math.cos(phi), y: 0.14 };
      len = Math.max(0.16, Math.abs(Math.cos(phi)));
      base.tor = lerp(-10, -22, k); base.l1 = -38; base.k1 = -10; base.l2 = lerp(22, 14, k);
    } else if (t < 4.3) {
      const k = prog(t, 3.82, 4.3, E.out);
      grip = { x: HX + lerp(-28, -22, k) * U, y: HY + lerp(-62, -104, k) * U };
      ang = lerp(-90, -285, k); base.tor = lerp(-22, -14, k); base.l1 = -38; base.k1 = -10; base.l2 = lerp(14, 4, k); base.k2 = lerp(4, -10, k);
      base.hd = lerp(0, 16, k);
    } else {
      grip = { x: HX - 22 * U, y: HY - 104 * U }; ang = -285;
      base.tor = -14; base.l1 = -38; base.k1 = -10; base.l2 = 4; base.k2 = -10; base.hd = 16;
    }
    const dir = swingDir ? (() => { const m = Math.hypot(swingDir.x, swingDir.y); return { x: swingDir.x / m, y: swingDir.y / m }; })()
                         : { x: Math.sin(FT.rad(ang)), y: Math.cos(FT.rad(ang)) };
    return { pose: base, grip, dir, len };
  }
  const BAT_L = 96 * S;
  function sweetSpot(t) { const b = batState(t); return { x: b.grip.x + b.dir.x * BAT_L * b.len * 0.78, y: b.grip.y + b.dir.y * BAT_L * b.len * 0.78 }; }
  const CONTACT_T = 3.8;
  function drawBat(ctx, g, dir, len, s) {
    const L = BAT_L * len, nx = -dir.y, ny = dir.x;
    const tip = { x: g.x + dir.x * L, y: g.y + dir.y * L }, back = { x: g.x - dir.x * 12 * s, y: g.y - dir.y * 12 * s };
    ctx.fillStyle = '#e3ad6e';
    ctx.beginPath();
    ctx.moveTo(back.x + nx * 3.5 * s, back.y + ny * 3.5 * s);
    ctx.lineTo(tip.x + nx * 7.5 * s, tip.y + ny * 7.5 * s);
    ctx.arc(tip.x, tip.y, 7.5 * s, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
    ctx.lineTo(back.x - nx * 3.5 * s, back.y - ny * 3.5 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b97f45'; ctx.beginPath(); ctx.arc(back.x, back.y, 5.5 * s, 0, 7); ctx.fill();
    if (len < 0.4) { ctx.fillStyle = '#f2c48c'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 8 * s, 0, 7); ctx.fill(); }
  }

  function batter(ctx, t) {
    const helmet = (J, col, s, face) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(J.head.x, J.head.y - 2 * s, 27 * s, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
      ctx.beginPath(); ctx.ellipse(J.head.x + face * 26 * s, J.head.y - 5 * s, 14 * s, 4.5 * s, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(J.head.x - face * 8 * s, J.head.y + 4 * s, 13 * s, 0, 7); ctx.fill(); // 護耳
    };
    if (t < 4.9) {
      const b = batState(t);
      const p = { ...b.pose, gy: GROUND_HOME,
        h1x: b.grip.x, h1y: b.grip.y, b1: 1,
        h2x: b.grip.x + b.dir.x * 11 * S * b.len, h2y: b.grip.y + b.dir.y * 11 * S * b.len, b2: 1 };
      figure(p, S, 'hero', { head: helmet, front: (J, col, s) => drawBat(ctx, b.grip, b.dir, b.len, s) });
      return;
    }
    // 丟棒：球棒落地
    const dropK = prog(t, 4.9, 5.35, E.in);
    const b = batState(4.89);
    const g0 = b.grip, g1 = { x: 1205, y: GROUND_HOME + 2 };
    const g = { x: lerp(g0.x, g1.x, dropK), y: lerp(g0.y, g1.y, dropK) - 60 * Math.sin(Math.PI * dropK) * 0.4 };
    const ang = lerp(-285, -268, dropK) + (dropK >= 1 ? 4 * Math.max(0, 1 - (t - 5.35) * 4) * Math.sin((t - 5.35) * 30) : 0);
    drawBat(ctx, g, { x: Math.sin(FT.rad(ang)), y: Math.cos(FT.rad(ang)) }, 1, S);
    // 跑向一壘（轉身朝右）
    const runK = prog(t, 5.15, 8.4, k => k);
    const xEase = E.inOut(runK);
    const x = lerp(HX, 1730, xEase);
    const speed = runK > 0 && runK < 1 ? Math.min(1, Math.min(runK, 1 - runK) * 6) : 0;
    const phi = (x - HX) / 105 * Math.PI;
    let p;
    if (t < 5.15) {
      p = { x: HX, y: HY, tor: -6, face: 1, l1: -20, k1: -10, l2: 18, k2: 4, a1: 10, e1: 40, a2: -10, e2: 30, hd: 12 };
    } else if (runK < 1) {
      const sw = Math.sin(phi) * speed;
      p = { x, y: HY + 4 + 44 * E.inOut(Math.min(1, runK * 3)) - 8 * Math.abs(Math.sin(phi)) * speed, tor: 14 * speed + 2, face: 1,
            l1: 42 * sw, k1: 42 * sw - 18 - 52 * Math.max(0, -Math.cos(phi)) * speed,
            l2: -42 * sw, k2: -42 * sw - 18 - 52 * Math.max(0, Math.cos(phi)) * speed,
            a1: -38 * sw, e1: -38 * sw + 85 * speed, a2: 38 * sw, e2: 38 * sw + 85 * speed, hd: 0 };
    } else {
      // 站上一壘，回頭看球飛走的天空
      const k = prog(t, 8.4, 9.0);
      p = { x: 1730, y: HY + 40, tor: lerp(2, -4, k), face: 1, l1: 10, k1: 6, l2: -10, k2: -6,
            a1: lerp(10, 150, k), e1: lerp(30, 175, k), a2: lerp(-10, -140, k), e2: lerp(20, -170, k), hd: lerp(0, -25, k) };
    }
    p.gy = p.y + 144;
    figure(p, S, 'hero', { head: helmet });
  }

  // ---------- 球 ----------
  function FT_jointsHand(t) { // 投手手的位置（不畫）
    const p = keyed(PK, t); p.face = 1;
    const sh = step({ x: p.x, y: p.y }, 66 * S, 180 - p.tor);
    const el = step(sh, 40 * S, p.a1); return step(el, 38 * S, p.e1);
  }
  const REL = FT_jointsHand(3.2), CON = sweetSpot(CONTACT_T), STAR = { x: 760, y: 175 };
  function ballPos(t) {
    if (t < 3.2) return t >= 2.55 ? FT_jointsHand(t) : null;
    if (t < CONTACT_T) {
      const k = (t - 3.2) / (CONTACT_T - 3.2);
      return { x: lerp(REL.x, CON.x, k), y: lerp(REL.y, CON.y, k) + 26 * Math.sin(Math.PI * k) * -0.6 + 18 * k * k, r: 1 };
    }
    const u = prog(t, CONTACT_T, 6.4, E.out);
    return { x: lerp(CON.x, STAR.x, u), y: lerp(CON.y, STAR.y, 1 - Math.pow(1 - u, 1.6)) - 120 * Math.sin(Math.PI * u), r: lerp(1, 0.35, u) };
  }
  function ball(ctx, t) {
    if (t >= 3.2 && t < 6.4) { // 紅色軌跡（唯一紅色物件）
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 1; i <= 16; i++) {
        const a = ballPos(Math.max(3.2, t - (i - 1) * 0.03)), b = ballPos(Math.max(3.2, t - i * 0.03));
        if (!a || !b) continue;
        ctx.strokeStyle = `rgba(232,67,58,${0.75 * (1 - i / 17)})`; ctx.lineWidth = 14 * (a.r || 1) * (1 - i / 20);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }
    const b = ballPos(t);
    if (b && t < 6.4) {
      const r = 10 * (b.r || 1) * (t < 3.2 ? 0.95 : 1);
      glow(b.x, b.y, r * 3.2, 'rgba(255,244,214,0.55)');
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = C.red; ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath(); ctx.arc(b.x - r * 0.9, b.y, r * 0.7, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x + r * 0.9, b.y, r * 0.7, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    }
    if (t >= 6.2) { // 變成一顆閃亮的星
      const k = prog(t, 6.2, 6.8, E.back);
      const pulse = 1 + 0.12 * Math.sin((t - 6.2) * 4);
      glow(STAR.x, STAR.y, 70 * k * pulse, 'rgba(255,211,107,0.75)');
      ctx.save(); ctx.translate(STAR.x, STAR.y); ctx.rotate((t - 6.2) * 0.6); ctx.scale(k * pulse, k * pulse);
      ctx.fillStyle = '#fff7dc'; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? 7 : 26, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  function impact(ctx, t) {
    const k = (t - CONTACT_T) / 0.28; if (k < 0 || k > 1) return;
    glow(CON.x, CON.y, 140 * (0.5 + k), `rgba(255,244,214,${0.8 * (1 - k)})`);
    ctx.save(); ctx.strokeStyle = `rgba(255,211,107,${1 - k})`; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + 0.3, r0 = 30 + 60 * k, r1 = 60 + 110 * k;
      ctx.beginPath(); ctx.moveTo(CON.x + Math.cos(a) * r0, CON.y + Math.sin(a) * r0); ctx.lineTo(CON.x + Math.cos(a) * r1, CON.y + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  }

  function draw(ctx, t) {
    const zoom = 1 + 0.035 * prog(t, 0, 10, E.inOut);
    const shake = (t > CONTACT_T && t < CONTACT_T + 0.2) ? 5 * Math.sin((t - CONTACT_T) * 120) * (1 - (t - CONTACT_T) / 0.2) : 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(960 + shake, 600); ctx.scale(zoom, zoom); ctx.translate(-960, -600);
    background(ctx, t);
    pitcher(ctx, t);
    catcher(ctx, t);
    batter(ctx, t);
    ball(ctx, t);
    impact(ctx, t);
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'play', verb: true }, { w: 'baseball' }], draw };
})();
