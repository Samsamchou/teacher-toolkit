// 第 10 段 go camping：黃昏的山間草地。
// 背背包走進來 → 放下背包 → 打開快速帳篷 → 跪下敲營釘 → 去柴堆拿木柴 → 在石圈裡疊柴 → 劃火柴生火
// → 天黑、星星和月亮出來、帳篷裡的燈亮起 → 坐在木頭上烤火
SEGMENTS.camping = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, walk, STAND, KNEEL, SIT, mix, joints } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800;
  // 配置（左→右）：林邊柴堆、石圈營火、坐的木頭、背包、帳篷
  const PILE = { x: 330, y: G };
  const RING = { x: 640, y: G + 4 };
  const SEAT = { x: 838, top: G - 58 };
  const PACK_GROUND = { x: 972, y: G - 50 };
  const TENT = { L: 1080, A: 1212, R: 1425 };
  const BAG = { x: 1092, y: G - 14 };
  const PEG = { x: 1070, y: G + 2 };
  const STRIKES = [4.55, 4.9, 5.25];

  // ---------- 顏色小工具 ----------
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixC = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
  const night = t => prog(t, 8.6, 9.8);

  // ---------- 背景 ----------
  const R = rng(11);
  const stars = Array.from({ length: 110 }, () => ({ x: R() * 1920, y: R() * 430, r: 0.8 + R() * 2, th: R() * 0.9, p: R() * 6 }));
  const ridge = (base, amp, f1, f2, ph) => x => base - amp * (0.6 * Math.sin(x * f1 + ph) + 0.4 * Math.sin(x * f2 + ph * 2.3));
  const MTS = [
    { y: ridge(470, 70, 0.004, 0.011, 0.5), c: '#2a1d5c', rim: '#5a3a8e' },
    { y: ridge(540, 55, 0.0055, 0.013, 2.1), c: '#211650' },
    { y: ridge(610, 40, 0.007, 0.017, 4.0), c: '#170f3e' },
  ];
  const TREES = [[40, 640, 1.3], [150, 650, 1.0], [230, 662, 0.7], [1720, 650, 1.05], [1830, 640, 1.35], [1610, 662, 0.7]];

  function background(t) {
    const n = night(t);
    const g = ctx.createLinearGradient(0, 0, 0, 640);
    g.addColorStop(0, mixC('#2b1a63', '#0b0726', n));
    g.addColorStop(0.55, mixC('#6a2a7a', '#1d1450', n));
    g.addColorStop(0.85, mixC('#e0457b', '#3a2470', n));
    g.addColorStop(1, mixC('#ff9a8a', '#4a2a7a', n));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 660);
    // 夕陽餘暉（天黑後消失）
    glow(980, 520, 520, `rgba(255,140,150,${0.45 * (1 - n)})`);
    // 星星：天越黑出現越多
    ctx.fillStyle = C.light;
    stars.forEach(s => {
      const a = clamp((n - s.th) * 4, 0, 1) * (0.6 + 0.4 * Math.sin(t * 2.2 + s.p)) + (s.th < 0.08 ? 0.35 : 0);
      if (a <= 0) return; ctx.globalAlpha = Math.min(1, a);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 月亮（彎月）
    if (n > 0.15) {
      const a = prog(n, 0.15, 0.7);
      glow(1500, 265, 130, `rgba(255,244,214,${0.35 * a})`);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff4d6';
      ctx.beginPath(); ctx.arc(1500, 265, 44, 0, 7); ctx.fill();
      ctx.fillStyle = mixC('#2b1a63', '#0b0726', n); ctx.beginPath(); ctx.arc(1520, 253, 40, 0, 7); ctx.fill();
      ctx.restore();
    }
    // 三層山
    MTS.forEach(m => {
      ctx.fillStyle = m.c; ctx.beginPath(); ctx.moveTo(0, 700);
      for (let x = 0; x <= 1920; x += 16) ctx.lineTo(x, m.y(x));
      ctx.lineTo(1920, 700); ctx.closePath(); ctx.fill();
      if (m.rim) { ctx.strokeStyle = m.rim; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 0; x <= 1920; x += 16) x ? ctx.lineTo(x, m.y(x)) : ctx.moveTo(x, m.y(x)); ctx.stroke(); }
    });
    // 草地
    const gg = ctx.createLinearGradient(0, 630, 0, 905);
    gg.addColorStop(0, '#1d5c55'); gg.addColorStop(1, '#113c42');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, 660);
    for (let x = 0; x <= 1920; x += 40) ctx.lineTo(x, 640 + 10 * Math.sin(x * 0.004));
    ctx.lineTo(1920, 905); ctx.lineTo(0, 905); ctx.closePath(); ctx.fill();
    // 草叢
    ctx.strokeStyle = 'rgba(120,220,190,0.18)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) { const x = (i * 211) % 1920, y = 700 + (i * 53) % 190; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y - 14); ctx.moveTo(x, y); ctx.lineTo(x + 5, y - 16); ctx.stroke(); }
    // 松樹
    TREES.forEach(([x, gy, k]) => {
      ctx.fillStyle = '#0f0a2e';
      for (let i = 0; i < 4; i++) {
        const w = (120 - i * 22) * k, top = gy - (90 + i * 70) * k - 40 * k, bot = gy - i * 70 * k;
        ctx.beginPath(); ctx.moveTo(x - w / 2, bot); ctx.lineTo(x, top); ctx.lineTo(x + w / 2, bot); ctx.closePath(); ctx.fill();
      }
      ctx.fillRect(x - 8 * k, gy - 10, 16 * k, 24);
    });
  }

  // ---------- 道具 ----------
  function tentH(t) { if (t < 3.33) return 0; const k = prog(t, 3.33, 3.75, E.back); return k * (1 + 0.03 * Math.sin((t - 3.33) * 26) * Math.exp(-(t - 3.33) * 5)); }
  function tent(t) {
    const h = tentH(t), n = night(t);
    if (h <= 0.001) { // 帳篷收納袋
      ctx.fillStyle = '#2fa59a'; roundRect(BAG.x - 38, BAG.y - 14, 76, 28, 13); ctx.fill();
      ctx.fillStyle = '#23857c'; ctx.fillRect(BAG.x - 4, BAG.y - 14, 8, 28);
      return;
    }
    const A = { x: TENT.A, y: G - 240 * h };
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse((TENT.L + TENT.R) / 2, G + 4, 200, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2fa59a'; ctx.beginPath(); ctx.moveTo(TENT.L, G);
    ctx.bezierCurveTo(TENT.L + 8, G - 170 * h, A.x - 80, A.y, A.x, A.y);
    ctx.bezierCurveTo(A.x + 100, A.y, TENT.R - 18, G - 150 * h, TENT.R, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23857c'; ctx.beginPath(); ctx.moveTo(TENT.L, G);
    ctx.bezierCurveTo(TENT.L + 8, G - 170 * h, A.x - 80, A.y, A.x, A.y);
    ctx.quadraticCurveTo(A.x - 10, G - 120 * h, TENT.L + 175, G); ctx.closePath(); ctx.fill();
    // 門（天黑後裡面的燈亮）
    const lamp = prog(t, 9.3, 9.7);
    ctx.fillStyle = mixC('#124a48', '#ffd36b', lamp); ctx.beginPath();
    ctx.moveTo(TENT.L + 40, G); ctx.quadraticCurveTo(TENT.L + 70, G - 170 * h, TENT.L + 100, G - 175 * h);
    ctx.quadraticCurveTo(TENT.L + 140, G - 120 * h, TENT.L + 150, G); ctx.closePath(); ctx.fill();
    // 縫線
    ctx.strokeStyle = 'rgba(140,235,220,0.55)'; ctx.lineWidth = 3;
    [[0.35, 0.2], [0.6, 0.62], [0.85, 0.9]].forEach(([u]) => { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(lerp(A.x, TENT.R, u) - 10, G - 140 * h * (1 - u), lerp(A.x, TENT.R, u), G); ctx.stroke(); });
    // 營繩
    if (h > 0.85) {
      ctx.strokeStyle = 'rgba(201,184,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(TENT.L + 30, G - 130 * h); ctx.lineTo(PEG.x, PEG.y - pegH(t) + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(TENT.R - 30, G - 120 * h); ctx.lineTo(TENT.R + 40, G + 2); ctx.stroke();
      ctx.fillStyle = '#c9b8ff'; ctx.fillRect(TENT.R + 37, G - 8, 6, 10);
    }
    if (lamp > 0) glow(TENT.L + 95, G - 70, 170, `rgba(255,211,107,${0.35 * lamp})`);
  }
  function pegH(t) { return 30 - 8 * STRIKES.filter(s => t >= s).length; }
  function peg(t) {
    if (tentH(t) < 0.85) return;
    ctx.fillStyle = '#c9b8ff'; ctx.fillRect(PEG.x - 3, PEG.y - pegH(t), 6, pegH(t));
    ctx.fillRect(PEG.x - 8, PEG.y - pegH(t), 16, 4);
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function backpack(c, rot = 0) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(rot);
    ctx.fillStyle = '#d9a24a'; roundRect(-34, -50, 68, 100, 18); ctx.fill();
    ctx.fillStyle = '#a8742c'; roundRect(-34, -50, 68, 30, 14); ctx.fill();
    roundRect(-24, 8, 48, 30, 8); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(-38, 40, 76, 14); // 睡墊
    ctx.restore();
  }
  function logShape(cx, cy, len, ang, r = 11) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = '#8a5a3c'; roundRect(-len / 2, -r, len, 2 * r, r); ctx.fill();
    ctx.fillStyle = '#d6a070'; ctx.beginPath(); ctx.ellipse(len / 2 - 3, 0, r * 0.55, r, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a8744a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(len / 2 - 3, 0, r * 0.25, r * 0.5, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  function woodpile(t) {
    const taken = t >= 7.05;
    logShape(PILE.x, G - 11, 110, 0); logShape(PILE.x + 6, G - 11, 110, 0);
    if (!taken) { logShape(PILE.x - 10, G - 33, 104, 0); logShape(PILE.x + 18, G - 33, 104, 0); logShape(PILE.x + 4, G - 55, 100, 0); }
  }
  function seat() { // 坐的大木頭
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(SEAT.x - 8, G + 4, 86, 10, 0, 0, 7); ctx.fill();
    logShape(SEAT.x - 8, SEAT.top + 29, 160, 0, 29);
  }
  function stones(front) {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, x = RING.x + Math.cos(a) * 78, y = RING.y + Math.sin(a) * 16;
      if ((Math.sin(a) > 0) !== front) continue;
      ctx.fillStyle = '#5b4a8a'; ctx.beginPath(); ctx.ellipse(x, y - 8, 22, 15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a68ad'; ctx.beginPath(); ctx.ellipse(x - 4, y - 14, 12, 6, 0, 0, 7); ctx.fill();
    }
  }
  // 三根柴：拿著時水平疊在手上，放進石圈後變成三角錐
  const TEEPEE = [{ x: RING.x - 26, y: RING.y - 34, a: -1.05 }, { x: RING.x + 26, y: RING.y - 34, a: 1.05 }, { x: RING.x, y: RING.y - 38, a: Math.PI / 2 }];
  function carriedLogs(t, hands) {
    if (t < 7.05) return;
    const mid = { x: (hands[0].x + hands[1].x) / 2, y: (hands[0].y + hands[1].y) / 2 };
    TEEPEE.forEach((tp, i) => {
      const k = prog(t, 8.02 + i * 0.08, 8.24 + i * 0.08);
      const from = { x: mid.x, y: mid.y - 8 - i * 20, a: 0 };
      logShape(lerp(from.x, tp.x, k), lerp(from.y, tp.y, k), lerp(96, 84, k), lerp(from.a, tp.a, k), 10);
    });
  }

  // ---------- 火 ----------
  function fire(t) {
    const f = prog(t, 8.6, 9.1, E.out); if (f <= 0) return;
    const x = RING.x, y = RING.y - 22;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(x, y - 40, 460 * (0.5 + 0.5 * f), `rgba(255,120,60,${0.30 * f})`);
    glow(x, y - 30, 170 * f, `rgba(255,170,80,${0.45 * f})`);
    ctx.restore();
    const layers = [[C.red, 1.0], ['#ff8a3d', 0.78], [C.gold, 0.55], ['#fff4d6', 0.3]];
    layers.forEach(([col, sc], li) => {
      ctx.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        const ox = (i - 2) * 20 * sc, hh = (150 - Math.abs(i - 2) * 34) * sc * f * (0.82 + 0.18 * Math.sin(t * 11 + i * 1.9 + li) + 0.08 * Math.sin(t * 27 + i * 3.1));
        const w = 26 * sc * (1 + 0.15 * Math.sin(t * 7 + i));
        const sway = 10 * Math.sin(t * 5 + i * 0.8) * sc;
        ctx.beginPath(); ctx.moveTo(x + ox - w, y);
        ctx.quadraticCurveTo(x + ox - w * 0.9, y - hh * 0.55, x + ox + sway, y - hh);
        ctx.quadraticCurveTo(x + ox + w * 0.9, y - hh * 0.55, x + ox + w, y);
        ctx.closePath(); ctx.fill();
      }
    });
    // 火星往上飄
    const P = rng(5);
    for (let i = 0; i < 16; i++) {
      const sp = 60 + P() * 70, ph = P(), dx = (P() - 0.5) * 80;
      const age = ((t - 8.7) * sp / 260 + ph) % 1; if (t < 8.7) continue;
      const ex = x + dx * age + 12 * Math.sin(t * 3 + i), ey = y - 60 - age * 260;
      ctx.globalAlpha = (1 - age) * f; ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.arc(ex, ey, 3.2 * (1 - age) + 1, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 人物 ----------
    function hands(p) { const J = joints(p, S); return [J.A1.hand, J.A2.hand]; }
  function withHands(p, t1, t2, k = 1) { // 讓兩手（逐步）移到目標點
    const h = hands(p); const o = { ...p };
    if (t1) { o.h1x = lerp(h[0].x, t1.x, k); o.h1y = lerp(h[0].y, t1.y, k); o.b1 = -(p.face || 1); }
    if (t2) { o.h2x = lerp(h[1].x, t2.x, k); o.h2y = lerp(h[1].y, t2.y, k); o.b2 = -(p.face || 1); }
    return o;
  }
  const CROUCH = (x) => ({ x, y: G - 118, tor: 38, face: 1, l1: 60, k1: -10, l2: 10, k2: -55, a1: 30, e1: 40, a2: 25, e2: 35, hd: 10 });
  const packWorn = J => ({ x: J.sh.x - 34 * S, y: J.sh.y + 40 * S });

  function walkSeg(t, t0, t1, x0, x1, ease = E.inOut) {
    const k = prog(t, t0, t1, ease), x = lerp(x0, x1, k);
    const amp = Math.min(1, Math.min(t - t0, t1 - t) / 0.18);
    const w = walk(x, G, Math.abs(x - x0) / 92 * Math.PI, clamp(amp, 0, 1));
    return x1 < x0 ? FT.mirror(w) : w;
  }
  const L = q => FT.mirror(q); // 朝左

  function person(t) {
    let p, pack = 'none', mallet = false, logs = false, match = false;
    const WX = 990; // 帳篷前站的位置
    if (t < 2.3) { // 背背包走進營地
      const k = prog(t, 0, 2.3, q => q * (2 - q)); const x = lerp(-80, WX, k);
      p = walk(x, G, (x + 80) / 92 * Math.PI, 1 - prog(t, 2.0, 2.3)); pack = 'worn';
    } else if (t < 2.95) { // 放下背包（往後放到地上）
      const base = STAND(WX, G);
      pack = t < 2.45 ? 'worn' : 'moving';
      const J = joints(base, S), pw = packWorn(J);
      const kk = prog(t, 2.45, 2.85);
      const pc = { x: lerp(pw.x, PACK_GROUND.x, kk), y: lerp(pw.y, PACK_GROUND.y, kk) - 30 * Math.sin(Math.PI * kk) };
      const reach = prog(t, 2.3, 2.45) * (1 - prog(t, 2.85, 2.95));
      p = withHands({ ...base, tor: -4 * reach }, { x: pc.x + 30, y: pc.y - 40 }, { x: pc.x + 18, y: pc.y - 46 }, reach);
      if (pack === 'moving') { p._pack = pc; p._packRot = -0.12 * kk; }
    } else if (t < 3.1) {
      p = walkSeg(t, 2.95, 3.1, WX, WX + 30);
    } else if (t < 3.48) { // 蹲下打開帳篷袋
      const k = prog(t, 3.1, 3.4);
      p = withHands(mix(STAND(WX + 30, G), CROUCH(WX + 30), k), { x: BAG.x - 8, y: BAG.y - 12 }, { x: BAG.x - 22, y: BAG.y - 14 }, k);
    } else if (t < 3.98) { // 快速帳篷彈開，人站起來退一步
      p = mix(CROUCH(WX + 30), { ...STAND(WX - 2, G), a1: 30, e1: 70, a2: 20, e2: 60 }, prog(t, 3.5, 3.95));
    } else if (t < 4.25) { // 跪下準備敲營釘
      p = mix({ ...STAND(WX - 2, G), a1: 30, e1: 70, a2: 20, e2: 60 }, { ...KNEEL(WX - 6, G), tor: 30 }, prog(t, 3.98, 4.25));
      mallet = t > 4.1;
    } else if (t < 5.4) { // 敲營釘三下
      let u = 1;
      for (const s of STRIKES) {
        if (t >= s - 0.33 && t < s - 0.08) { u = 1 - prog(t, s - 0.33, s - 0.08, E.out); break; }
        if (t >= s - 0.08 && t < s) { u = prog(t, s - 0.08, s, E.in); break; }
      }
      p = { ...KNEEL(WX - 6, G), tor: 30, a1: lerp(165, 52, u), e1: lerp(-160, 12, u), a2: 28, e2: 38 };
      mallet = true;
    } else if (t < 5.7) {
      p = mix({ ...KNEEL(WX - 6, G), tor: 30, a1: 52, e1: 12 }, STAND(WX, G), prog(t, 5.4, 5.7));
    } else if (t < 6.85) { // 走回林邊柴堆（朝左）
      p = walkSeg(t, 5.7, 6.85, WX, 430);
    } else if (t < 7.15) { // 蹲下拿三根柴
      const k = prog(t, 6.85, 7.08);
      p = withHands(mix(L(STAND(430, G)), L(CROUCH(430)), k), { x: PILE.x + 30, y: G - 50 }, { x: PILE.x + 46, y: G - 48 }, k);
      logs = t >= 7.05;
    } else if (t < 7.35) { // 抱柴站起來
      p = withHands(mix(L(CROUCH(430)), L(STAND(430, G)), prog(t, 7.15, 7.35)), { x: 430 - 70, y: G - 200 }, { x: 430 - 56, y: G - 196 }, 1);
      logs = true;
    } else if (t < 7.78) { // 轉身抱柴走到石圈旁（朝右）
      const w = walkSeg(t, 7.35, 7.78, 430, 548);
      const dy = w.y - (G - 146);
      p = { ...w, h1x: w.x + 70, h1y: G - 200 + dy, b1: -1, h2x: w.x + 56, h2y: G - 196 + dy, b2: -1 };
      logs = true;
    } else if (t < 8.0) { // 跪在石圈前
      const k = prog(t, 7.78, 8.0);
      const base = mix(STAND(548, G), { ...KNEEL(556, G), tor: 26 }, k);
      p = { ...base, h1x: base.x + 72, h1y: lerp(G - 200, G - 110, k), b1: -1, h2x: base.x + 58, h2y: lerp(G - 196, G - 106, k), b2: -1 };
      logs = true;
    } else if (t < 8.3) { // 疊柴
      const k = prog(t, 8.0, 8.25);
      const base = { ...KNEEL(556, G), tor: 26 + 6 * Math.sin(Math.PI * k) };
      p = { ...base, h1x: lerp(base.x + 72, RING.x - 20, k), h1y: lerp(G - 110, G - 60, k), b1: -1, h2x: lerp(base.x + 58, RING.x - 34, k), h2y: lerp(G - 106, G - 56, k), b2: -1 };
      logs = true;
    } else if (t < 9.0) { // 劃火柴點火，火起來手往後縮
      const base = { ...KNEEL(556, G), tor: 24 };
      const flick = prog(t, 8.32, 8.42) * (1 - prog(t, 8.42, 8.5));
      const back = prog(t, 8.62, 8.85);
      p = { ...base, tor: lerp(24, 6, back), h1x: lerp(RING.x - 34, 556 + 40, back), h1y: G - 70 - 26 * flick + lerp(0, -40, back), b1: -1, a2: 20, e2: 50 };
      match = t >= 8.38 && t < 8.66; logs = true;
    } else if (t < 9.3) {
      p = mix({ ...KNEEL(556, G), tor: 6, a1: 20, e1: 60 }, STAND(560, G), prog(t, 9.0, 9.3)); logs = true;
    } else if (t < 9.78) { // 繞到木頭前
      p = walkSeg(t, 9.3, 9.78, 560, SEAT.x + 8); logs = true;
    } else { // 轉身坐下，面向營火烤手
      const k = prog(t, 9.78, 10.2);
      const sit = { ...SIT(SEAT.x + 8, G, SEAT.top), a1: 66, e1: 94, a2: 60, e2: 86, y: SEAT.top - 12 + 1.5 * Math.sin(t * 2) };
      p = L(mix(STAND(SEAT.x + 8, G), sit, k)); logs = true;
    }
    p.gy = G;
    const hat = (J, col, s) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(J.head.x, J.head.y - 6 * s, 22 * s, Math.PI, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(J.head.x, J.head.y - 6 * s, 34 * s, 6 * s, 0, 0, 7); ctx.fill();
    };
    const J = figure(p, S, 'hero', {
      head: hat,
      behind: (J) => { if (pack === 'worn') backpack(packWorn(J)); },
      front: (J, col, s) => {
        if (mallet) { // 槌子：把手接在前臂延長線上
          const dx = J.A1.hand.x - J.A1.el.x, dy = J.A1.hand.y - J.A1.el.y, m = Math.hypot(dx, dy);
          const ux = dx / m, uy = dy / m, end = { x: J.A1.hand.x + ux * 52, y: J.A1.hand.y + uy * 52 };
          ctx.strokeStyle = '#c98a5a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(J.A1.hand.x - ux * 8, J.A1.hand.y - uy * 8); ctx.lineTo(end.x, end.y); ctx.stroke();
          ctx.save(); ctx.translate(end.x, end.y); ctx.rotate(Math.atan2(uy, ux)); ctx.fillStyle = '#6b5b95'; roundRect(-12, -22, 24, 44, 6); ctx.fill(); ctx.restore();
        }
        if (match) {
          const hnd = J.A1.hand;
          ctx.strokeStyle = '#e3ad6e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hnd.x, hnd.y); ctx.lineTo(hnd.x + 22, hnd.y - 14); ctx.stroke();
          glow(hnd.x + 24, hnd.y - 18, 36, 'rgba(255,211,107,0.8)');
          ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(hnd.x + 24, hnd.y - 22, 5, 9, 0.4, 0, 7); ctx.fill();
        }
      },
    });
    return { J, pack, p, logs };
  }

  function sparks(t) {
    STRIKES.forEach(s => {
      const k = (t - s) / 0.18; if (k < 0 || k > 1) return;
      ctx.save(); ctx.strokeStyle = `rgba(255,211,107,${1 - k})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 5); ctx.beginPath(); ctx.moveTo(PEG.x + Math.cos(a) * (14 + 20 * k), PEG.y - 30 + Math.sin(a) * (14 + 20 * k)); ctx.lineTo(PEG.x + Math.cos(a) * (28 + 34 * k), PEG.y - 30 + Math.sin(a) * (28 + 34 * k)); ctx.stroke(); }
      ctx.restore();
    });
  }

  function draw(c, t) {
    const zoom = 1.2 + 0.035 * prog(t, 0, 11, E.inOut);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(900, 700); ctx.scale(zoom, zoom); ctx.translate(-880, -690);
    background(t);
    tent(t); peg(t);
    woodpile(t); seat(); stones(false);
    if (t >= 2.85) backpack(PACK_GROUND, -0.12);
    // 人和柴（柴在人前面）
    const P = person(t);
    if (P.logs) {
      if (t < 8.0) carriedLogs(t, [P.J.A1.hand, P.J.A2.hand]);
      else carriedLogs(t, [{ x: 556 + 72, y: G - 110 }, { x: 556 + 58, y: G - 106 }]);
    }
    if (P.p._pack) backpack(P.p._pack, P.p._packRot);
    stones(true);
    sparks(t);
    // 天黑
    const n = night(t);
    if (n > 0) { ctx.fillStyle = `rgba(8,5,32,${0.38 * n})`; ctx.fillRect(0, 0, 1920, 1080); }
    fire(t);
    ctx.restore();
  }

  return { act: 11, answer: [{ w: 'go', verb: true }, { w: 'camping' }], draw };
})();
