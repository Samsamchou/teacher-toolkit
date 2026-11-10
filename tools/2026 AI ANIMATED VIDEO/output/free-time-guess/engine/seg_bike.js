// 第 4 段 ride a bike：黃昏河濱自行車道。
// 走到停好的腳踏車旁 → 從座墊上拿起安全帽戴上 → 扣好下巴扣環 → 握車把 → 用腳把側腳架往後踢起
// → 遠側腳從座墊後方跨過去 → 近側腳踩上抬高的踏板 → 一踩起步、坐上座墊 → 雙腳踩踏板騎向右方（鏡頭跟拍、背景視差）
// → 按鈴兩聲 → 停止踩踏滑行煞車 → 往前滑下座墊、近側腳踩地停好
SEGMENTS.bike = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, walk, mix, joints, keyed } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800, Z = 1.22;
  const deg = r => r * 180 / Math.PI, rad = FT.rad;

  // ---------- 腳踏車幾何（相對五通 BB，朝右） ----------
  const BB0 = 760, BBY = G - 52, WR = 72, CR = 31;
  const REAR = { x: -90, y: -20 }, FRONT = { x: 126, y: -20 };
  const SEATC = { x: -30, y: -80 }, POST = { x: -38, y: -98 };
  const HT_T = { x: 77, y: -120 }, HT_B = { x: 84, y: -96 };
  const CLAMP = { x: 92, y: -136 }, GRIP = { x: 84, y: -160 }, BELL = { x: 97, y: -147 };
  const HIP_SEAT = { x: -36, y: -130 }, HIP_STAND = { x: 15, y: -92 }, HIP_END = { x: -4, y: -88 }; // 坐在座墊上／跨站在車架上
  const STAND_PIV = { x: -22, y: 6 };

  // ---------- 速度、距離、踏板角度（預先積分，只由 t 決定） ----------
  const T_GO = 5.75, T_CRUISE = 7.2, T_COAST = 9.4, T_STOP = 10.3, VMAX = 500;
  const vel = t => t < T_GO ? 0 : t < T_COAST ? VMAX * E.inOut(clamp((t - T_GO) / (T_CRUISE - T_GO), 0, 1))
    : VMAX * (1 - E.inOut(clamp((t - T_COAST) / (T_STOP - T_COAST), 0, 1)));
  const DT = 1 / 1000, N = 18000;
  const Dtab = new Float64Array(N + 1), CAMtab = new Float64Array(N + 1);
  const sxOf = t => 370 * prog(t, 6.0, 10.3);
  for (let i = 1; i <= N; i++) Dtab[i] = Dtab[i - 1] + vel((i - 0.5) * DT) * DT;
  for (let i = 0; i <= N; i++) CAMtab[i] = Math.max(i ? CAMtab[i - 1] : 0, Dtab[i] - sxOf(i * DT));
  const look = (tab, t) => { const f = clamp(t / DT, 0, N), i = Math.floor(f), k = f - i; return i >= N ? tab[N] : lerp(tab[i], tab[i + 1], k); };
  const dist = t => look(Dtab, t), camX = t => look(CAMtab, t);
  const DC = dist(T_COAST), GEAR = DC / 3.5;           // 滑行開始時近側踏板剛好在 7 點鐘、遠側在 2 點鐘
  const crank = t => -30 + 360 * Math.min(dist(t), DC) / GEAR; // 度；0 = 朝右，90 = 朝下
  const bbX = t => BB0 + dist(t);

  // ---------- 小工具 ----------
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const pedalRel = c => ({ x: CR * Math.cos(rad(c)), y: CR * Math.sin(rad(c)) });
  const ankleOnPedal = pd => ({ x: pd.x - 12, y: pd.y - 17 }); // 鞋底踩在踏板上、腳掌在踏板軸上
  function legAng(hip, ank) { // 腿部兩節 IK → 大腿/小腿角度（膝蓋朝前）
    const L = 50 * S, r = FT.ik(hip, ank, L, L, -1);
    return [deg(Math.atan2(r.elbow.x - hip.x, r.elbow.y - hip.y)), deg(Math.atan2(r.hand.x - r.elbow.x, r.hand.y - r.elbow.y))];
  }
  function setLegs(p, a1, a2) {
    const h = { x: p.x, y: p.y };
    if (a1) [p.l1, p.k1] = legAng(h, a1);
    if (a2) [p.l2, p.k2] = legAng(h, a2);
    return p;
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const line = (a, b, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };

  // ---------- 背景（視差） ----------
  const R = rng(23);
  const stars = Array.from({ length: 60 }, () => ({ x: R() * 1920, y: 230 + R() * 200, r: 0.8 + R() * 1.6, p: R() * 6 }));
  const city = []; { let x = 0; while (x < 2400) { const w = 50 + R() * 90, h = 40 + R() * 120; city.push({ x, w, h, win: Array.from({ length: 6 }, () => [R(), R(), R() < 0.45]) }); x += w + 6 + R() * 20; } }
  const farTrees = Array.from({ length: 26 }, (_, i) => ({ x: i * 110 + R() * 60, r: 18 + R() * 16 }));
  const ripples = Array.from({ length: 40 }, () => ({ x: R() * 2400, y: 626 + R() * 90, w: 30 + R() * 90 }));
  const wrap = (x, span) => ((x % span) + span) % span;

  function background(t, cx) {
    const g = ctx.createLinearGradient(0, 200, 0, 600);
    g.addColorStop(0, '#2b1a63'); g.addColorStop(0.5, '#6a2a7a'); g.addColorStop(0.82, '#e0457b'); g.addColorStop(1, '#ff9a8a');
    ctx.fillStyle = g; ctx.fillRect(-200, 150, 2400, 460);
    glow(1100, 590, 520, 'rgba(255,140,150,0.45)');
    ctx.fillStyle = C.light;
    stars.forEach(s => { ctx.globalAlpha = 0.25 + 0.3 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 遠方城市天際線（0.1 倍）
    const o1 = cx * 0.1;
    city.forEach(b => {
      const x = wrap(b.x - o1 + 200, 2400) - 200, top = 588 - b.h;
      ctx.fillStyle = '#3a2470'; ctx.fillRect(x, top, b.w, b.h + 4);
      b.win.forEach(([u, v, on]) => { if (!on) return; ctx.fillStyle = 'rgba(255,211,107,0.7)'; ctx.fillRect(x + 6 + u * (b.w - 16), top + 8 + v * (b.h - 22), 5, 7); });
    });
    // 對岸樹叢（0.3 倍）
    const o2 = cx * 0.3;
    ctx.fillStyle = '#2a1d5c'; ctx.fillRect(-200, 586, 2400, 22);
    farTrees.forEach(tr => { const x = wrap(tr.x - o2 + 200, 2860) - 200; ctx.fillStyle = '#241750'; ctx.beginPath(); ctx.arc(x, 592 - tr.r * 0.6, tr.r, 0, 7); ctx.fill(); });
    // 河面
    const rg = ctx.createLinearGradient(0, 606, 0, 730);
    rg.addColorStop(0, '#3b2a7c'); rg.addColorStop(1, '#22195a');
    ctx.fillStyle = rg; ctx.fillRect(-200, 606, 2400, 126);
    // 橋（0.3 倍）：拱橋＋橋上燈＋倒影
    const bx = wrap(560 - o2 + 900, 3200) - 900;
    bridge(bx, t);
    // 水面波光（0.5 倍）
    const o3 = cx * 0.5;
    ctx.strokeStyle = 'rgba(255,190,200,0.22)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ripples.forEach(r => { const x = wrap(r.x - o3 + 200, 2400) - 200, sh = 8 * Math.sin(t * 1.5 + r.x); ctx.beginPath(); ctx.moveTo(x + sh, r.y); ctx.lineTo(x + sh + r.w, r.y); ctx.stroke(); });
  }
  function bridge(x0, t) {
    const L = 1000, deck = 520, n = 4, span = L / n;
    // 倒影
    for (let i = 0; i <= 16; i++) {
      const lx = x0 + i * L / 16;
      ctx.fillStyle = 'rgba(255,211,107,0.22)';
      for (let j = 0; j < 5; j++) { const w = 14 - j * 2 + 3 * Math.sin(t * 3 + i + j); ctx.fillRect(lx - w / 2, 620 + j * 16, w, 6); }
    }
    ctx.fillStyle = '#2e1f66';
    ctx.beginPath(); ctx.moveTo(x0 - 20, deck); ctx.lineTo(x0 + L + 20, deck); ctx.lineTo(x0 + L + 20, 612);
    for (let i = n - 1; i >= 0; i--) {
      const a = x0 + i * span, b = a + span;
      ctx.lineTo(b - 8, 612); ctx.quadraticCurveTo((a + b) / 2, 520, a + 8, 612);
    }
    ctx.lineTo(x0 - 20, 612); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3590'; ctx.fillRect(x0 - 20, deck - 6, L + 40, 9);
    // 欄杆與燈
    ctx.strokeStyle = '#4a3590'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 - 20, deck - 22); ctx.lineTo(x0 + L + 20, deck - 22); ctx.stroke();
    for (let i = 0; i <= 16; i++) {
      const lx = x0 + i * L / 16;
      ctx.beginPath(); ctx.moveTo(lx, deck - 6); ctx.lineTo(lx, deck - 34); ctx.stroke();
      glow(lx, deck - 38, 22, 'rgba(255,211,107,0.8)');
      ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(lx, deck - 38, 3.5, 0, 7); ctx.fill();
    }
  }
  // 地面層（跟腳踏車同速，世界座標）
  const LAMP_GAP = 600;
  function ground(t, cx) {
    const x0 = cx - 400, x1 = cx + 2400;
    // 河岸欄杆
    ctx.fillStyle = '#1b1448'; ctx.fillRect(x0, 726, x1 - x0, 20);
    ctx.strokeStyle = '#5b4a8a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, 700); ctx.lineTo(x1, 700); ctx.moveTo(x0, 716); ctx.lineTo(x1, 716); ctx.stroke();
    ctx.lineWidth = 5;
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { ctx.beginPath(); ctx.moveTo(x, 696); ctx.lineTo(x, 730); ctx.stroke(); }
    // 樹（路燈之間）
    for (let k = Math.floor((x0 - 300) / LAMP_GAP); k * LAMP_GAP < x1 + 300; k++) {
      const x = k * LAMP_GAP + 300 + 40 * Math.sin(k * 2.3), s = 0.85 + 0.2 * Math.sin(k * 1.7);
      ctx.fillStyle = '#2a1a5c'; ctx.fillRect(x - 7, 640, 14, 104);
      ctx.fillStyle = '#1e5a55';
      [[0, -150, 70], [-46, -110, 52], [48, -112, 54], [0, -96, 60]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, 744 + dy * s, r * s, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#2b7a6f'; ctx.beginPath(); ctx.arc(x + 14 * s, 744 - 166 * s, 34 * s, 0, 7); ctx.fill();
    }
    // 自行車道
    ctx.fillStyle = '#3d3480'; ctx.fillRect(x0, 742, x1 - x0, 8);
    ctx.fillStyle = '#2d2668'; ctx.fillRect(x0, 750, x1 - x0, 122);
    ctx.fillStyle = 'rgba(201,184,255,0.45)';
    for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) roundRect(x, 828, 64, 7, 3), ctx.fill();
    ctx.fillStyle = '#16424a'; ctx.fillRect(x0, 872, x1 - x0, 60);
    // 路燈
    for (let k = Math.floor(x0 / LAMP_GAP); k * LAMP_GAP < x1; k++) lamp(k * LAMP_GAP, t);
  }
  function lamp(x, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,211,107,0.07)';
    ctx.beginPath(); ctx.moveTo(x + 30, 470); ctx.lineTo(x + 130, 800); ctx.lineTo(x - 70, 800); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,211,107,0.10)'; ctx.beginPath(); ctx.ellipse(x + 30, 790, 120, 18, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3a2c66'; roundRect(x - 10, 730, 20, 16, 4); ctx.fill();
    ctx.fillRect(x - 4, 470, 8, 262);
    ctx.strokeStyle = '#3a2c66'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, 476); ctx.quadraticCurveTo(x, 452, x + 26, 456); ctx.stroke();
    glow(x + 30, 470, 70, 'rgba(255,211,107,0.55)');
    ctx.fillStyle = '#5b4a8a'; ctx.beginPath(); ctx.moveTo(x + 14, 466); ctx.lineTo(x + 46, 466); ctx.lineTo(x + 40, 456); ctx.lineTo(x + 20, 456); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.ellipse(x + 30, 468, 12, 5, 0, 0, 7); ctx.fill();
  }
  function foreground(cx) { // 前景草叢（1.3 倍）
    const o = cx * 1.3;
    for (let i = 0; i < 14; i++) {
      const x = wrap(i * 190 + 60 - o + 300, 2660) - 300 + cx;
      ctx.fillStyle = '#0f3036';
      [[0, 0, 34], [26, 6, 26], [-24, 8, 24]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, 906 + dy, r, Math.PI, 0); ctx.fill(); });
    }
  }

  // ---------- 安全帽 ----------
  function helmet(c, rot = 0, strap = 'none', chin = null) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(rot);
    const s = S;
    ctx.fillStyle = '#d9a24a';
    ctx.beginPath(); ctx.ellipse(0, 0, 27 * s, 23 * s, 0, Math.PI, 2 * Math.PI); ctx.lineTo(27 * s, 3 * s); ctx.lineTo(-27 * s, 3 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16 * s, -4 * s); ctx.lineTo(35 * s, -2 * s); ctx.lineTo(25 * s, 4 * s); ctx.closePath(); ctx.fill(); // 帽簷
    ctx.fillStyle = '#a8742c';
    [-13, -2, 9].forEach(v => { ctx.save(); ctx.translate(v * s, -15 * s); ctx.rotate(0.15 * v / 10); roundRect(-4 * s, -3 * s, 8 * s, 12 * s, 3 * s); ctx.fill(); ctx.restore(); });
    ctx.fillRect(-27 * s, 0, 54 * s, 3.5 * s);
    ctx.restore();
    ctx.strokeStyle = '#3a2c66'; ctx.lineWidth = 2.6 * S; ctx.lineCap = 'round';
    if (strap === 'dangle') {
      ctx.beginPath(); ctx.moveTo(c.x - 8 * S, c.y + 2 * S); ctx.lineTo(c.x - 6 * S, c.y + 20 * S);
      ctx.moveTo(c.x + 10 * S, c.y + 2 * S); ctx.lineTo(c.x + 9 * S, c.y + 18 * S); ctx.stroke();
    } else if (strap === 'chin' && chin) {
      ctx.beginPath(); ctx.moveTo(c.x - 8 * S, c.y + 2 * S); ctx.lineTo(chin.x - 2 * S, chin.y); ctx.lineTo(c.x + 12 * S, c.y + 2 * S); ctx.stroke();
      ctx.fillStyle = '#3a2c66'; ctx.fillRect(chin.x - 5 * S, chin.y - 2 * S, 7 * S, 4 * S);
    }
  }
  const helmetOnHead = J => ({ x: J.head.x - 1 * S, y: J.head.y - 6 * S });
  const chinOf = J => ({ x: J.head.x + 7 * S, y: J.head.y + 22 * S });

  // ---------- 腳踏車 ----------
  function wheel(cx, cy, rot, front) {
    ctx.fillStyle = 'rgba(14,10,43,0.0)';
    ctx.strokeStyle = '#1a1240'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(cx, cy, WR - 5, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#8f80cf'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, WR - 12, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(201,184,255,0.55)'; ctx.lineWidth = 1.8;
    for (let i = 0; i < 16; i++) {
      const a = rot + i * Math.PI / 8, off = (i % 2 ? 0.18 : -0.18);
      ctx.beginPath(); ctx.moveTo(cx + 6 * Math.cos(a + off * 4), cy + 6 * Math.sin(a + off * 4)); ctx.lineTo(cx + (WR - 13) * Math.cos(a), cy + (WR - 13) * Math.sin(a)); ctx.stroke();
    }
    // 輪圈上的反光片（看得出在轉）
    const ra = rot + 0.3;
    ctx.fillStyle = C.gold; ctx.save(); ctx.translate(cx + (WR - 30) * Math.cos(ra), cy + (WR - 30) * Math.sin(ra)); ctx.rotate(ra); roundRect(-7, -3.5, 14, 7, 3); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#c9b8ff'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
  }
  function crankArm(B, c, near) {
    const pd = add(B, pedalRel(c));
    line(B, pd, near ? 7 : 6, near ? '#d6cff5' : '#8f80cf');
    ctx.fillStyle = near ? '#6b5b95' : '#4b3b80'; roundRect(pd.x - 13, pd.y - 4, 26, 8, 3); ctx.fill();
    ctx.fillStyle = near ? '#c9b8ff' : '#8f80cf'; ctx.beginPath(); ctx.arc(pd.x, pd.y, 3, 0, 7); ctx.fill();
  }
  function bikeBack(st) {
    const B = { x: st.x, y: BBY };
    // 影子
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(B.x + 17, G + 4, 150, 10, 0, 0, 7); ctx.fill();
    crankArm(B, st.c + 180, false);
    wheel(B.x + REAR.x, B.y + REAR.y, st.rot, false);
    wheel(B.x + FRONT.x, B.y + FRONT.y, st.rot, true);
  }
  function bikeFrame(st) {
    const B = { x: st.x, y: BBY }, P = q => add(B, q);
    const T1 = '#2fa59a', T2 = '#23857c';
    // 擋泥板
    ctx.strokeStyle = '#5b4a8a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(B.x + REAR.x, B.y + REAR.y, WR + 6, rad(-170), rad(-25)); ctx.stroke();
    ctx.beginPath(); ctx.arc(B.x + FRONT.x, B.y + FRONT.y, WR + 6, rad(-155), rad(-35)); ctx.stroke();
    // 尾燈（紅色反光，唯一紅色點綴）
    const tl = P({ x: REAR.x - 52, y: REAR.y - 46 });
    ctx.fillStyle = C.red; roundRect(tl.x - 5, tl.y - 4, 10, 8, 3); ctx.fill();
    glow(tl.x - 4, tl.y, 18 + 16 * st.lamp, `rgba(232,67,58,${0.35 + 0.4 * st.lamp})`);
    // 後下叉、後上叉
    line(P(REAR), B, 7, T2); line(P(REAR), P(SEATC), 7, T2);
    // 鍊條＋大齒盤＋飛輪
    const rc = P(REAR);
    ctx.strokeStyle = '#8f80cf'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(B.x, B.y - 18); ctx.lineTo(rc.x, rc.y - 8); ctx.moveTo(B.x, B.y + 18); ctx.lineTo(rc.x, rc.y + 8); ctx.stroke();
    ctx.fillStyle = '#8f80cf'; ctx.beginPath(); ctx.arc(rc.x, rc.y, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9b8ff'; ctx.beginPath(); ctx.arc(B.x, B.y, 19, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b5b95'; ctx.beginPath(); ctx.arc(B.x, B.y, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const a = rad(st.c) + i * 2 * Math.PI / 5; ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.x + 12 * Math.cos(a), B.y + 12 * Math.sin(a)); ctx.stroke(); }
    // 主車架
    line(P(HT_B), B, 10, T1);                     // 下管
    line(P({ x: 79, y: -113 }), P(SEATC), 9, T1);  // 上管
    line(B, P(SEATC), 9, T1);                      // 立管
    line(P(HT_T), P(HT_B), 12, T1);                // 頭管
    // 前叉
    const fa = P(FRONT), hb = P(HT_B);
    ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hb.x, hb.y); ctx.quadraticCurveTo(hb.x + 18, hb.y + 50, fa.x, fa.y); ctx.stroke();
    // 座管＋座墊
    line(P(SEATC), P(POST), 6, '#c9b8ff');
    const sd = P({ x: -40, y: -106 });
    ctx.fillStyle = '#3a2c66'; ctx.beginPath();
    ctx.moveTo(sd.x - 26, sd.y + 1); ctx.quadraticCurveTo(sd.x - 22, sd.y - 3, sd.x, sd.y - 1); ctx.lineTo(sd.x + 26, sd.y + 2);
    ctx.quadraticCurveTo(sd.x + 10, sd.y + 9, sd.x - 4, sd.y + 9); ctx.quadraticCurveTo(sd.x - 24, sd.y + 10, sd.x - 26, sd.y + 1); ctx.fill();
    // 龍頭、車把、握把、車鈴
    const ht = P(HT_T), cl = P(CLAMP), gp = P(GRIP);
    line(ht, cl, 7, '#c9b8ff');
    ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cl.x, cl.y); ctx.quadraticCurveTo(cl.x + 10, cl.y - 18, gp.x + 6, gp.y + 1); ctx.stroke();
    line({ x: gp.x + 8, y: gp.y }, { x: gp.x - 8, y: gp.y }, 10, '#3a2c66');
    line({ x: gp.x + 4, y: gp.y + 4 }, { x: gp.x + 16, y: gp.y + 13 }, 3, '#8f80cf'); // 煞車把
    const bl = P(BELL);
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(bl.x, bl.y, 6.5, Math.PI, 0); ctx.lineTo(bl.x + 6.5, bl.y + 2); ctx.lineTo(bl.x - 6.5, bl.y + 2); ctx.fill();
    // 前燈（花鼓發電：越快越亮）
    const lp = P({ x: 92, y: -108 });
    if (st.lamp > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,236,170,${0.16 * st.lamp})`;
      ctx.beginPath(); ctx.moveTo(lp.x + 6, lp.y - 4); ctx.lineTo(lp.x + 330, G - 10); ctx.lineTo(lp.x + 120, G + 14); ctx.closePath(); ctx.fill();
      ctx.restore();
      glow(lp.x + 6, lp.y, 30 * st.lamp + 6, `rgba(255,244,214,${0.8 * st.lamp})`);
    }
    ctx.fillStyle = '#d6cff5'; roundRect(lp.x - 4, lp.y - 6, 13, 12, 4); ctx.fill();
    ctx.fillStyle = st.lamp > 0.05 ? '#fff4d6' : '#8f80cf'; ctx.fillRect(lp.x + 7, lp.y - 4, 3, 8);
    // 側腳架（近側）
    const pv = P(STAND_PIV), sa = lerp(rad(108), rad(188), st.stand), sl = 52;
    const tip = { x: pv.x + sl * Math.cos(sa), y: pv.y + sl * Math.sin(sa) };
    line(pv, tip, 6, '#8f80cf');
    ctx.fillStyle = '#8f80cf'; ctx.beginPath(); ctx.ellipse(tip.x, tip.y, 7, 3.5, sa, 0, 7); ctx.fill();
    crankArm(B, st.c, true);
  }

  // ---------- 人物 ----------
  const STANDX = BB0 + HIP_STAND.x, STANDY = BBY + HIP_STAND.y;
  const NEAR_G = { x: STANDX + 20, y: G + 8 }, FAR_G = { x: STANDX - 8, y: G + 8 };
  const FAR_G2 = { x: BB0 + 5, y: G + 8 };
  const handsOf = p => { const J = joints(p, S); return [J.A1.hand, J.A2.hand]; };
  function withHands(p, t1, t2, k = 1, b = -1) {
    const h = handsOf(p), o = { ...p };
    if (t1) { o.h1x = lerp(h[0].x, t1.x, k); o.h1y = lerp(h[0].y, t1.y, k); o.b1 = b; }
    if (t2) { o.h2x = lerp(h[1].x, t2.x, k); o.h2y = lerp(h[1].y, t2.y, k); o.b2 = b; }
    return o;
  }
  const baseStand = () => setLegs({ x: STANDX, y: STANDY, tor: 0, face: 1, hd: 0, a1: 6, e1: 14, a2: -6, e2: 10 }, NEAR_G, FAR_G);
  const HANG = { x: BB0 - 42, y: BBY - 110 }; // 安全帽放在座墊上
  const gripW = (bx, far) => ({ x: bx + GRIP.x + (far ? 6 : 2), y: BBY + GRIP.y + (far ? -2 : 0) });
  const STAND_TIP = st => ({ x: BB0 + STAND_PIV.x + 52 * Math.cos(lerp(rad(108), rad(188), st)), y: BBY + STAND_PIV.y + 52 * Math.sin(lerp(rad(108), rad(188), st)) });

  function state(t) {
    const out = { mounted: false, helm: 'head', strap: 'chin', hp: null, bell: 0 };
    const bx = bbX(t), c = crank(t);
    out.bike = { x: bx, rot: dist(t) / WR, c, stand: 0, lamp: clamp(vel(t) / 260, 0, 1) };
    out.bike.stand = prog(t, 4.36, 4.52, E.out);
    let p;
    const helmetHeadPose = (hd) => ({ ...baseStand(), hd });
    if (t < 2.25) { // 走過來
      const k = prog(t, 0, 2.1, q => q * (2 - q)), x = lerp(-130, STANDX, k);
      const w = walk(x, G, (x + 130) / 92 * Math.PI, 1 - prog(t, 1.8, 2.1));
      p = mix(w, baseStand(), prog(t, 2.05, 2.25));
      out.helm = 'hang';
    } else if (t < 2.5) { // 伸手拿掛在車把上的安全帽
      const k = prog(t, 2.25, 2.5);
      p = withHands({ ...baseStand(), tor: -4 * k, hd: 10 * k }, { x: HANG.x - 30, y: HANG.y - 2 }, { x: HANG.x + 30, y: HANG.y - 4 }, k, -1);
      out.helm = 'hang';
    } else if (t < 3.2) { // 拿起來、戴到頭上
      const k = prog(t, 2.5, 3.15);
      const base = { ...helmetHeadPose(lerp(10, 6, k)), tor: lerp(-4, 0, k) };
      const J = joints(base, S), on = helmetOnHead(J);
      const hp = { x: lerp(HANG.x, on.x, k), y: lerp(HANG.y, on.y, k) - 70 * Math.sin(Math.PI * Math.min(1, k * 1.05)) };
      const rot = 0;
      p = { ...base, h1x: hp.x - 30, h1y: hp.y - 2, b1: -1, h2x: hp.x + 30, h2y: hp.y - 4, b2: 1 };
      out.helm = k < 1 ? 'hand' : 'head'; out.hp = hp; out.hrot = rot; out.strap = 'dangle';
    } else if (t < 3.8) { // 扣下巴扣環
      const base = helmetHeadPose(6);
      const J = joints(base, S), on = helmetOnHead(J), ch = chinOf(J);
      const k = prog(t, 3.2, 3.45), back = prog(t, 3.65, 3.8);
      const a = { x: lerp(on.x - 30, ch.x - 8, k), y: lerp(on.y - 2, ch.y + 22, k) };
      const b2 = { x: lerp(on.x + 30, ch.x + 6, k), y: lerp(on.y - 4, ch.y + 18, k) };
      const jig = t > 3.45 && t < 3.62 ? 3 * Math.sin((t - 3.45) * 60) : 0;
      p = { ...base, h1x: a.x + jig, h1y: a.y + 4 * back, b1: -1, h2x: b2.x - jig, h2y: b2.y, b2: 1 };
      out.strap = t >= 3.58 ? 'chin' : 'dangle'; out.click = t >= 3.58 && t < 3.85 ? (t - 3.58) / 0.27 : 0;
    } else if (t < 4.15) { // 雙手握車把
      const k = prog(t, 3.8, 4.12);
      const base = { ...baseStand(), hd: lerp(6, 0, k), tor: 6 * k };
      p = withHands(setLegs(base, NEAR_G, FAR_G), gripW(BB0), gripW(BB0, true), k, 1);
    } else if (t < 4.65) { // 近側腳把側腳架往後踢起
      const reach = prog(t, 4.15, 4.36), kick = prog(t, 4.36, 4.52, E.out), ret = prog(t, 4.52, 4.65);
      const tipDown = STAND_TIP(0), tipUp = STAND_TIP(1);
      let ank;
      if (t < 4.36) ank = { x: lerp(NEAR_G.x, tipDown.x + 16, reach), y: lerp(NEAR_G.y, tipDown.y - 14, reach) - 16 * Math.sin(Math.PI * reach) };
      else if (t < 4.52) ank = { x: lerp(tipDown.x + 16, tipUp.x + 4, kick), y: lerp(tipDown.y - 14, tipUp.y - 4, kick) };
      else ank = { x: lerp(tipUp.x + 4, NEAR_G.x, ret), y: lerp(tipUp.y - 4, NEAR_G.y, ret) - 14 * Math.sin(Math.PI * ret) };
      const base = setLegs({ ...baseStand(), tor: 6, hd: 6 * Math.sin(Math.PI * prog(t, 4.15, 4.65)) }, ank, FAR_G);
      p = withHands(base, gripW(BB0), gripW(BB0, true), 1, 1);
    } else if (t < 5.45) { // 遠側腳從座墊後方跨過去
      const st0 = setLegs({ ...baseStand(), tor: 6 }, NEAR_G, FAR_G);
      const st1 = setLegs({ ...baseStand() }, NEAR_G, FAR_G2);
      const K = keyed([
        [4.65, { tor: 6, l2: st0.l2, k2: st0.k2, y: 0 }],
        [4.88, { tor: 24, l2: -62, k2: -128, y: -4 }],
        [5.1, { tor: 36, l2: -122, k2: -108, y: -8 }],
        [5.3, { tor: 26, l2: -44, k2: -24, y: -4 }],
        [5.45, { tor: 14, l2: st1.l2, k2: st1.k2, y: 0 }],
      ], t);
      const base = setLegs({ ...baseStand(), tor: K.tor, y: STANDY + K.y }, NEAR_G, null);
      base.l2 = K.l2; base.k2 = K.k2;
      p = withHands(base, gripW(BB0), gripW(BB0, true), 1, 1);
    } else if (t < T_GO) { // 跨在車上，近側腳踩上抬高的踏板
      const k = prog(t, 5.45, T_GO);
      const pa = ankleOnPedal(add({ x: bx, y: BBY }, pedalRel(c)));
      const ank = { x: lerp(NEAR_G.x, pa.x, k), y: lerp(NEAR_G.y, pa.y, k) - 26 * Math.sin(Math.PI * k) };
      p = setLegs({ ...baseStand(), tor: lerp(14, 18, k) }, ank, FAR_G2);
      p = withHands(p, gripW(bx), gripW(bx, true), 1, 1);
      out.mounted = true;
    } else { // 起步、坐上座墊、踩踏、滑行、停車下座墊
      const B = { x: bx, y: BBY };
      const sit = prog(t, T_GO, 6.35);
      const off = prog(t, 10.35, 10.95);
      const hipRel = { x: lerp(lerp(HIP_STAND.x, HIP_SEAT.x, sit), HIP_END.x, off), y: lerp(lerp(HIP_STAND.y, HIP_SEAT.y, sit), HIP_END.y, off) };
      const hip = add(B, hipRel);
      const bob = sit * (1 - off) * 1.2 * Math.sin(rad(c) * 2);
      const tor = lerp(lerp(18, 28, sit), 18, off);
      const idle = t > 11 ? 1.5 * Math.sin((t - 11) * 2.2) : 0;
      const nearPd = ankleOnPedal(add(B, pedalRel(c))), farPd = ankleOnPedal(add(B, pedalRel(c + 180)));
      // 遠側腳：起步後離地、踩上另一邊踏板
      const lift = prog(t, 6.0, 6.3);
      const farA = { x: lerp(FAR_G2.x, farPd.x, lift), y: lerp(FAR_G2.y, farPd.y, lift) - 18 * Math.sin(Math.PI * lift) };
      // 近側腳：停好後放到地上
      const endG = { x: bbX(10.4) + 16, y: G + 8 };
      const nearA = { x: lerp(nearPd.x, endG.x, off), y: lerp(nearPd.y, endG.y, off) - 20 * Math.sin(Math.PI * off) };
      p = setLegs({ x: hip.x, y: hip.y + bob + idle, tor: tor + 0.6 * idle, face: 1, hd: lerp(lerp(0, -12, sit), 0, off) }, nearA, farA);
      // 按鈴：拇指往車鈴撥兩下
      const rings = [9.0, 9.24];
      let fl = 0; rings.forEach(r => { fl = Math.max(fl, prog(t, r - 0.06, r, E.out) * (1 - prog(t, r, r + 0.1))); });
      const g1 = gripW(bx), g2 = gripW(bx, true);
      p.h1x = g1.x + 6 * fl; p.h1y = g1.y + 4 * fl; p.b1 = 1; p.h2x = g2.x; p.h2y = g2.y; p.b2 = 1;
      out.bell = rings.reduce((m, r) => (t >= r && t < r + 0.6 ? Math.max(m, 1 - (t - r) / 0.6) : m), 0);
      out.bellT = rings.filter(r => t >= r).map(r => t - r);
      out.mounted = true;
    }
    if (!out.mounted) p.gy = G;
    out.layer = out.mounted || t >= 5.2; // 遠側腳越過座墊後，就畫在車架後面
    out.p = p;
    return out;
  }

  // 騎上車後：近側腳、近側手重畫在車架前面
  function nearLimbs(J) {
    const s = S;
    [[C.rim, true], [C.hero, false]].forEach(([col, off]) => {
      ctx.save(); if (off) ctx.translate(4.5 * s, -1.5 * s);
      FT.limb(J.hip, J.L1.kn, J.L1.ft, 22 * s, col);
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(J.L1.ft.x + 9 * s, J.L1.ft.y + 2 * s, 15 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
      FT.limb(J.sh, J.A1.el, J.A1.hand, 17 * s, col);
      ctx.beginPath(); ctx.arc(J.A1.hand.x, J.A1.hand.y, 9.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function bellWaves(st, t) {
    if (!st.bellT) return;
    const bl = add({ x: st.bike.x, y: BBY }, BELL);
    st.bellT.forEach(a => {
      if (a > 0.6) return;
      ctx.strokeStyle = `rgba(255,211,107,${1 - a / 0.6})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = 16 + i * 14 + a * 60;
        ctx.beginPath(); ctx.arc(bl.x, bl.y - 4, r, rad(-75), rad(-15)); ctx.stroke();
        ctx.beginPath(); ctx.arc(bl.x, bl.y - 4, r, rad(-165), rad(-105)); ctx.stroke();
      }
    });
  }

  function draw(c, t) {
    const cx = camX(t);
    const st = state(t);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(960, 800); ctx.scale(Z, Z); ctx.translate(-960, -800);
    background(t, cx);
    ctx.save(); ctx.translate(-cx, 0);
    ground(t, cx);
    const helmExtra = (J) => {
      if (st.helm === 'head') helmet(helmetOnHead(J), 0, st.strap, chinOf(J));
      else if (st.helm === 'hand') helmet(st.hp, st.hrot, 'dangle');
    };
    if (!st.layer) {
      bikeBack(st.bike); bikeFrame(st.bike);
      if (st.helm === 'hang') { // 安全帽用帶子掛在近側握把上
        const gp = add({ x: BB0, y: BBY }, GRIP);
        ctx.strokeStyle = '#3a2c66'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(HANG.x - 12, HANG.y + 2); ctx.lineTo(gp.x - 2, gp.y + 2); ctx.lineTo(HANG.x + 14, HANG.y + 2); ctx.stroke();
        helmet(HANG, 0, 'dangle');
      }
      const J = figure(st.p, S, 'hero', { head: helmExtra });
      if (st.click) { const ch = chinOf(J); ctx.save(); ctx.globalAlpha = 1 - st.click; ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, r0 = 10 + 20 * st.click; ctx.beginPath(); ctx.moveTo(ch.x + 30 + Math.cos(a) * r0, ch.y + 12 + Math.sin(a) * r0); ctx.lineTo(ch.x + 30 + Math.cos(a) * (r0 + 10), ch.y + 12 + Math.sin(a) * (r0 + 10)); ctx.stroke(); }
        ctx.restore(); }
    } else {
      bikeBack(st.bike);
      const J = figure(st.p, S, 'hero', { head: helmExtra });
      bikeFrame(st.bike);
      nearLimbs(J);
    }
    bellWaves(st, t);
    foreground(cx);
    ctx.restore();
    ctx.restore();
  }

  return { act: 11, answer: [{ w: 'ride', verb: true }, { w: 'a' }, { w: 'bike' }], draw };
})();
