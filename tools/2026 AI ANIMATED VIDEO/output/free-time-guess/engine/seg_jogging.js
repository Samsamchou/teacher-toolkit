// 第 2 段 go jogging：傍晚的城市公園。
// 把腳放在長椅上拉筋（兩下）→ 放下腳、轉身 → 按運動手錶開始計時 → 慢跑起步
// → 鏡頭跟著沿公園步道慢跑（路燈、樹、天際線視差捲動），對面遛狗的人錯身而過
// → 放慢成走路、停下 → 按手錶停止計時 → 用手背擦額頭的汗 → 雙手叉腰喘氣
SEGMENTS.jogging = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, ik, joints, keyed } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 830, FOOT_Y = G + 6;
  const S2 = 1.27, G2 = 778 - 52;   // 遠側步道：腳比主角高約 55 px、縮小到 0.82                // 對面車道（較遠）遛狗的人
  const X0 = 760;                          // 主角起點（世界座標）
  const BENCH = { x: 560, w: 236, top: G - 82 };
  const TH = 50 * S, SH = 50 * S;
  const deg = r => r * 180 / Math.PI;
  const frac = v => v - Math.floor(v);
  const TEAL = '#2fa59a', TEAL_D = '#23857c', SHOE = '#e8433a', SHOE_D = '#b8342c';

  // ---------- 速度與步伐（數值積分，固定 → 可重現） ----------
  const VJ = 400, VW = 150;
  function speed(t) {
    if (t < 7.5) return VJ * prog(t, 3.15, 3.9);
    if (t < 7.95) return lerp(VJ, VW, prog(t, 7.5, 7.95));
    return lerp(VW, 0, prog(t, 7.95, 8.5));
  }
  const jg = t => 1 - prog(t, 7.45, 7.95);           // 1 = 慢跑，0 = 走路
  const amp = t => clamp(speed(t) / 140, 0, 1);
  const cycleD = g => lerp(176, 320, g);              // 一個完整步態週期走多遠
  const DT = 1 / 1000, N = 16500;
  const TX = new Float64Array(N + 1), TP = new Float64Array(N + 1);
  (() => {
    let xx = 0, ph = 0;
    for (let i = 0; i <= N; i++) {
      TX[i] = xx; TP[i] = ph;
      const t = i * DT, v = speed(t), a = amp(t);
      xx += v * DT;
      ph += 2 * Math.PI * v * DT / (cycleD(jg(t)) * Math.max(a, 0.3));
    }
  })();
  const look = (A, t) => { const f = clamp(t / DT, 0, N - 1e-6), i = Math.floor(f); return lerp(A[i], A[i + 1], f - i); };
  const heroX = t => X0 + look(TX, t);
  const XE = heroX(16);
  const camX = t => look(TX, Math.max(0, t - 0.45)); // 鏡頭稍微落後，跑步時人跑到畫面中間

  // ---------- 姿勢工具 ----------
  function legAngles(hip, foot, face) {
    const r = ik(hip, foot, TH, SH, -face);
    return { l: deg(Math.atan2(r.elbow.x - hip.x, r.elbow.y - hip.y)), k: deg(Math.atan2(r.hand.x - r.elbow.x, r.hand.y - r.elbow.y)), kn: r.elbow, ft: r.hand };
  }
  // IK 手 → 轉回角度（方便和別的姿勢混合）
  function toAngles(p) {
    const J = joints(p, S), o = { ...p };
    [[1, J.A1], [2, J.A2]].forEach(([i, A]) => {
      o['a' + i] = deg(Math.atan2(A.el.x - J.sh.x, A.el.y - J.sh.y));
      o['e' + i] = deg(Math.atan2(A.hand.x - A.el.x, A.hand.y - A.el.y));
      delete o['h' + i + 'x']; delete o['h' + i + 'y']; delete o['b' + i];
    });
    return o;
  }
  const ANG = ['tor', 'hd', 'a1', 'e1', 'a2', 'e2', 'l1', 'k1', 'l2', 'k2'];
  function blend(p0, p1, k) {
    const o = { ...p1 };
    for (const n in p1) {
      if (typeof p1[n] !== 'number' || typeof p0[n] !== 'number' || n === 'face' || n[0] === 'b') continue;
      if (ANG.includes(n)) { let d = p1[n] - p0[n]; d = ((d + 540) % 360) - 180; o[n] = p0[n] + d * k; }
      else o[n] = lerp(p0[n], p1[n], k);
    }
    return o;
  }
  function withHands(p, t1, t2, k1, k2, b1, b2) {
    const J = joints(p, S), o = { ...p };
    if (t1 && k1 > 0) { o.h1x = lerp(J.A1.hand.x, t1.x, k1); o.h1y = lerp(J.A1.hand.y, t1.y, k1); o.b1 = b1; }
    if (t2 && k2 > 0) { o.h2x = lerp(J.A2.hand.x, t2.x, k2); o.h2y = lerp(J.A2.hand.y, t2.y, k2); o.b2 = b2; }
    return o;
  }
  // 以髖部為軸左右翻轉（含 IK 目標）
  function mirrorAt(p) {
    const o = FT.mirror(p);
    [1, 2].forEach(i => { if (p['h' + i + 'x'] !== undefined) { o['h' + i + 'x'] = 2 * p.x - p['h' + i + 'x']; o['b' + i] = -p['b' + i]; } });
    return o;
  }
  const STANDP = (x) => ({ x, y: G - 146, tor: 1, face: 1, l1: 6, k1: 3, l2: -6, k2: -3, a1: 6, e1: 14, a2: -6, e2: 10, hd: 0 });

  // ---------- 慢跑／走路步態（朝右，腳由距離決定，不滑步） ----------
  function gaitPose(t) {
    const x = heroX(t), ph = look(TP, t), g = jg(t), a = amp(t);
    const D = cycleD(g), sf = lerp(0.62, 0.34, g), ae = Math.max(a, 0.3);
    const half = 0.5 * sf * D * ae * Math.min(1, a / 0.3);
    const back = lerp(0, 0.32, g) * half; // 慢跑：腳落在身體下方、往後推得比較遠
    const lift = lerp(22, 78, g) * a;
    const u1 = frac(ph / (2 * Math.PI));
    const bob = lerp(-3, 4.5, g) * a * Math.cos(4 * Math.PI * (u1 - sf / 2));
    const hipY = lerp(G - 146, lerp(G - 142, G - 144, g), a) + bob;
    const hip = { x, y: hipY };
    const foot = u => {
      if (u < sf) return { x: x - back + lerp(half, -half, u / sf), y: FOOT_Y };
      const v = (u - sf) / (1 - sf);
      return { x: x - back + lerp(-half, half, E.inOut(v)), y: FOOT_Y - lift * Math.sin(Math.PI * Math.pow(v, 0.6)) };
    };
    const f1 = foot(u1), f2 = foot(frac(u1 + 0.5));
    const L1 = legAngles(hip, f1, 1), L2 = legAngles(hip, f2, 1);
    const fw = half > 0.5 ? clamp((f1.x - x + back) / half, -1, 1) : 0;
    const sw = lerp(20, 30, g) * a, ea = lerp(16, 92, g) * a + 10 * (1 - a);
    const a1 = 6 - sw * fw, a2 = 6 + sw * fw;
    return { x, y: hipY, tor: 1 + lerp(2, 10, g) * a, face: 1, l1: L1.l, k1: L1.k, l2: L2.l, k2: L2.k,
      a1, e1: a1 + ea, a2, e2: a2 + ea, hd: -lerp(1, 5, g) * a };
  }

  // ---------- 拉筋（朝左，右腳放在長椅上） ----------
  const LEAN = [[0.6, { v: 0 }], [1.0, { v: 1 }], [1.18, { v: 1 }], [1.42, { v: 0.4 }], [1.72, { v: 1 }], [1.9, { v: 1 }], [2.15, { v: 0 }]];
  function stretchPose(t) {
    const up = prog(t, 0.15, 0.65) * (1 - prog(t, 2.05, 2.45));
    const lean = keyed(LEAN, t).v;
    const X = X0, hipY = G - 147 + 5 * lean + 2 * up;
    const hip = { x: X, y: hipY };
    // 設計成朝右（椅子在右），最後整個翻轉
    const fOn = { x: X + 136, y: BENCH.top - 8 }, fG = { x: X + 6, y: FOOT_Y };
    const f1 = { x: lerp(fG.x, fOn.x, up), y: lerp(fG.y, fOn.y, up) - 58 * Math.sin(Math.PI * up) };
    const L1 = legAngles(hip, f1, 1), L2 = legAngles(hip, { x: X - 8, y: FOOT_Y }, 1);
    const base = { x: X, y: hipY, tor: 2 + 4 * up + 26 * lean, face: 1, l1: L1.l, k1: L1.k, l2: L2.l, k2: L2.k,
      a1: 8, e1: 16, a2: -4, e2: 10, hd: 12 * lean };
    const reach = prog(t, 0.6, 0.95) * (1 - prog(t, 2.0, 2.25));
    const sp = 0.08 + 0.3 * lean;
    const tg = { x: lerp(L1.kn.x, L1.ft.x, sp), y: lerp(L1.kn.y, L1.ft.y, sp) - 22 };
    const p = withHands(base, tg, { x: tg.x - 8, y: tg.y - 6 }, reach, reach, 1, 1);
    return mirrorAt(p);
  }

  // ---------- 看／按運動手錶（朝右） ----------
  function watchSpot(base) { const J = joints(base, S); return { x: J.sh.x + 68, y: J.sh.y + 34 }; }
  function watchPose(base, raise, press) {
    const w = watchSpot(base);
    // 手錶戴在近側手腕；遠側手的手指從上面按錶側按鈕
    const farT = { x: w.x + lerp(-6, 4, press), y: w.y - lerp(46, 22, press) };
    const p = withHands({ ...base, hd: base.hd + 16 * raise }, { x: w.x, y: w.y }, farT, raise, raise * prog(raise, 0.3, 1), 1, 1);
    return p;
  }
  const BEEPS = [2.98, 8.82];

  // ---------- 結束動作（停下後） ----------
  function endBase(t) {
    const r = t - 8.4, a = lerp(1, 0.45, prog(t, 8.4, 13));
    const b = Math.sin(2 * Math.PI * (1.25 * r - 0.025 * r * r));
    const p = STANDP(XE);
    p.y -= 2.6 * a * b; p.tor = 3 - 2 * a * b; p.hd = -2 * a * b;
    return p;
  }
  function endPose(t) {
    const base = endBase(t);
    if (t < 9.12) { // 按手錶停止計時、低頭看
      const raise = prog(t, 8.48, 8.75) * (1 - prog(t, 8.98, 9.2));
      const press = prog(t, 8.72, 8.82) * (1 - prog(t, 8.9, 9.0));
      return { pose: watchPose(base, raise, press), wipe: 0 };
    }
    const J = joints(base, S);
    if (t < 9.95) { // 用手背擦額頭的汗
      const up = prog(t, 9.12, 9.38) * (1 - prog(t, 9.68, 9.95));
      const s = prog(t, 9.36, 9.62);
      const tg = { x: J.head.x + lerp(30, 2, s), y: J.head.y - 32 - 3 * Math.sin(Math.PI * s) };
      // 手肘往上往後抬，前臂只在眼睛以上掃過額頭
      return { pose: withHands({ ...base, hd: base.hd - 6 * up }, tg, null, up, 0, -1, 1), wipe: s };
    }
    const k = prog(t, 9.92, 10.3); // 雙手叉腰喘氣
    return { pose: withHands(base, { x: base.x + 8, y: base.y - 18 }, { x: base.x - 6, y: base.y - 16 }, k, k, 1, 1), wipe: 1 };
  }

  function heroPose(t) {
    if (t < 2.55) return stretchPose(t);
    const W0 = STANDP(X0);
    const watchStart = () => watchPose(W0, prog(t, 2.6, 2.84) * (1 - prog(t, 3.12, 3.4)), prog(t, 2.86, 2.98) * (1 - prog(t, 3.04, 3.14)));
    if (t < 3.08) return watchStart();
    if (t < 3.5) return blend(toAngles(watchStart()), gaitPose(t), prog(t, 3.08, 3.5));
    if (t < 8.3) return gaitPose(t);
    const e = endPose(t).pose;
    if (t < 8.62) return blend(gaitPose(t), toAngles(e), prog(t, 8.3, 8.62));
    return e;
  }

  // ---------- 背景 ----------
  const R = rng(23);
  const stars = Array.from({ length: 50 }, () => ({ x: R() * 1920, y: 130 + R() * 260, r: 0.8 + R() * 1.6, p: R() * 6 }));
  const BLD = []; { let x = -120; while (x < 2500) { const w = 70 + R() * 110, h = 110 + R() * 230; BLD.push({ x, w, h, c: R() < 0.5 ? '#2a1d5c' : '#251852', ant: R() < 0.25, seed: Math.floor(R() * 1e6) }); x += w + 6 + R() * 26; } }
  const TREES = []; { let x = -200; while (x < 3200) { TREES.push({ x, k: 0.8 + R() * 0.45, v: R() }); x += 190 + R() * 170; } }
  const BUSH = []; { let x = -100; while (x < 3600) { BUSH.push({ x, k: 0.7 + R() * 0.6 }); x += 300 + R() * 260; } }
  const LAMPS = [300, 920, 1540, 2160, 2780, 3400];

  function background(t, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, 660);
    g.addColorStop(0, '#24175a'); g.addColorStop(0.5, '#5a2a7a'); g.addColorStop(0.82, '#d8457e'); g.addColorStop(1, '#ff9a8a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 680);
    glow(1250, 600, 560, 'rgba(255,150,140,0.42)');
    ctx.fillStyle = C.light;
    stars.forEach(s => { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 天際線（最遠，視差 0.15）
    const o1 = -cam * 0.15;
    BLD.forEach(b => {
      const x = b.x + o1; if (x > 1940 || x + b.w < -20) return;
      const top = 650 - b.h;
      ctx.fillStyle = b.c; ctx.fillRect(x, top, b.w, b.h + 10);
      if (b.ant) { ctx.fillRect(x + b.w / 2 - 2, top - 34, 4, 34); glow(x + b.w / 2, top - 36, 10, 'rgba(255,211,107,0.8)'); }
      const r = rng(b.seed + 1);
      for (let yy = top + 16; yy < 640; yy += 26) for (let xx = x + 12; xx < x + b.w - 14; xx += 22) {
        const v = r(); if (v < 0.62) continue;
        ctx.fillStyle = v > 0.9 ? 'rgba(255,211,107,0.85)' : 'rgba(255,211,107,0.35)'; ctx.fillRect(xx, yy, 9, 12);
      }
    });
    // 草地
    const gg = ctx.createLinearGradient(0, 640, 0, 905);
    gg.addColorStop(0, '#1d5c55'); gg.addColorStop(1, '#113c42');
    ctx.fillStyle = gg; ctx.fillRect(0, 640, 1920, 270);
    // 公園的樹（視差 0.45）
    const o2 = -cam * 0.45;
    TREES.forEach(tr => {
      const x = tr.x + o2, k = tr.k; if (x < -160 || x > 2080) return;
      const gy = 690;
      ctx.fillStyle = '#1a1240'; ctx.fillRect(x - 8 * k, gy - 90 * k, 16 * k, 92 * k);
      const col = tr.v < 0.5 ? '#183f52' : '#1c4a58', hi = tr.v < 0.5 ? '#21566a' : '#256070';
      ctx.fillStyle = col;
      [[0, -150, 70], [-48, -118, 52], [48, -116, 54], [0, -200, 50]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * k, gy + dy * k, r * k, 0, 7); ctx.fill(); });
      ctx.fillStyle = hi;
      [[14, -168, 40], [40, -132, 30]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * k, gy + dy * k, r * k, 0, 7); ctx.fill(); });
    });
    // 樹後面的草地前緣
    ctx.fillStyle = '#185049'; ctx.fillRect(0, 688, 1920, 60);
    // 矮樹叢（視差 0.8）
    const o3 = -cam * 0.8;
    BUSH.forEach(b => {
      const x = b.x + o3, k = b.k; if (x < -120 || x > 2040) return;
      ctx.fillStyle = '#16463f';
      [[0, 0, 34], [-30, 8, 24], [30, 8, 26]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * k, 704 + dy * k - 8 * k, r * k, Math.PI, 0); ctx.fill(); });
    });
  }
  function path(cam) {
    ctx.fillStyle = '#4a3c78'; ctx.fillRect(0, 706, 1920, 166);
    ctx.fillStyle = '#6a5aa0'; ctx.fillRect(0, 706, 1920, 5);
    ctx.fillStyle = 'rgba(20,12,60,0.22)'; ctx.fillRect(0, 752, 1920, 4); // 兩條車道的分隔
    ctx.fillStyle = '#2e2560'; ctx.fillRect(0, 866, 1920, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, 803, 1920, 3);
    // 步道磚縫（跟世界一起移動，看得出速度）
    ctx.strokeStyle = 'rgba(20,12,60,0.35)'; ctx.lineWidth = 3;
    const off = ((-cam % 150) + 150) % 150;
    for (let x = off - 150; x < 1980; x += 150) { ctx.beginPath(); ctx.moveTo(x, 712); ctx.lineTo(x - 26, 864); ctx.stroke(); }
    // 前景草叢
    ctx.strokeStyle = 'rgba(120,220,190,0.2)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const o = ((-cam % 1920) + 1920) % 1920;
    for (let i = 0; i < 26; i++) { const x = ((i * 157 + o) % 1980) - 30, y = 892 + (i * 37) % 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y - 14); ctx.moveTo(x, y); ctx.lineTo(x + 5, y - 15); ctx.stroke(); }
  }

  // ---------- 世界道具 ----------
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function lampPost(x) {
    const base = 712, top = 420;
    ctx.fillStyle = 'rgba(255,211,107,0.10)'; ctx.beginPath(); ctx.ellipse(x, 800, 150, 34, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1e5e'; ctx.fillRect(x - 6, top + 20, 12, base - top - 20);
    rr(x - 14, base - 18, 28, 20, 4); ctx.fill();
    ctx.fillStyle = '#3a2c66'; ctx.beginPath(); ctx.moveTo(x - 24, top + 4); ctx.lineTo(x + 24, top + 4); ctx.lineTo(x + 14, top - 18); ctx.lineTo(x - 14, top - 18); ctx.closePath(); ctx.fill();
    glow(x, top + 18, 120, 'rgba(255,211,107,0.55)');
    ctx.fillStyle = '#fff4d6'; rr(x - 14, top + 4, 28, 26, 6); ctx.fill();
    ctx.fillStyle = '#3a2c66'; ctx.fillRect(x - 18, top + 28, 36, 6);
  }
  function bench() {
    const x = BENCH.x, w = BENCH.w, top = BENCH.top;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(x, G + 6, w / 2 + 16, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1e5e';
    [-1, 1].forEach(sd => {
      const lx = x + sd * (w / 2 - 22);
      ctx.fillRect(lx - 5, top - 92, 10, 96);                 // 椅背支柱
      ctx.fillRect(lx - 6, top + 8, 12, G + 4 - top - 8);     // 椅腳
      ctx.fillRect(lx - 4 + sd * 4, top - 38, 10, 40);        // 扶手支柱
      rr(lx - 12 + sd * 6, top - 44, 30, 10, 5); ctx.fill();  // 扶手
    });
    // 椅背木條
    [[top - 92, 18], [top - 64, 18]].forEach(([y, h]) => { ctx.fillStyle = '#a8744a'; rr(x - w / 2, y, w, h, 6); ctx.fill(); ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x - w / 2 + 6, y + h - 5, w - 12, 5); });
    // 座位
    ctx.fillStyle = '#c98a5a'; rr(x - w / 2 - 6, top, w + 12, 12, 5); ctx.fill();
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x - w / 2, top + 12, w, 7);
  }
  // 小狗（設計朝右，畫的時候翻成朝左）
  function dog(x, gy, ph, t) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(-0.82, 0.82);
    ctx.fillStyle = 'rgba(8,5,30,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 54, 7, 0, 0, 7); ctx.fill();
    const leg = (hx, a, col) => { const r = a * Math.PI / 180; ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, -40); ctx.lineTo(hx + Math.sin(r) * 38, -40 + Math.cos(r) * 38); ctx.stroke(); };
    const s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    leg(-28, 24 * s2, '#a8742c'); leg(28, 24 * s1, '#a8742c');
    ctx.fillStyle = '#d9a24a';
    ctx.beginPath(); ctx.ellipse(0, -48, 42, 17, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -60); ctx.lineTo(44, -86); ctx.lineTo(56, -70); ctx.lineTo(34, -40); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(48, -82 + 1.5 * Math.sin(ph * 2), 15, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(63, -77 + 1.5 * Math.sin(ph * 2), 11, 7, 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2c66'; ctx.beginPath(); ctx.arc(73, -79, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#a8742c'; ctx.beginPath(); ctx.ellipse(41, -82, 7, 13, 0.35, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d9a24a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-38, -54);
    const wag = 12 * Math.sin(t * 12); ctx.quadraticCurveTo(-54, -62, -58 + wag * 0.3, -82 + wag * 0.2); ctx.stroke();
    leg(-22, 24 * s1, '#d9a24a'); leg(34, 24 * s2, '#d9a24a');
    ctx.strokeStyle = TEAL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(34, -70); ctx.lineTo(46, -64); ctx.stroke();
    ctx.restore();
    return { x: x - 40, y: gy - 67 }; // 項圈（翻轉後）
  }
  // 遛狗的人：從右邊走來、往左走，在對面車道和主角錯身
  const NPC_V = 105, CROSS_T = 5.6, NX0 = heroX(CROSS_T) + 40;
  function walker(t) {
    const x = NX0 - NPC_V * (t - CROSS_T) + NPC_V * 0; // 世界座標
    const dist = (NX0 + NPC_V * CROSS_T) - x;
    const w = FT.mirror(FT.walk(x, G2 + 26, dist / 77 * Math.PI, 1));
    const dx = x - 96, dph = dist / 46 * Math.PI;
    const collar = { x: dx - 33, y: G2 - 53 };
    const hand = { x: x - 42, y: G2 - 128 + 2 * Math.sin(dist / 77 * Math.PI * 2) };
    w.h1x = hand.x; w.h1y = hand.y; w.b1 = 1; w.gy = G2;
    // 牽繩（稍微下垂）
    dog(dx, G2 + 2, dph, t);
    figure(w, S2, 'npc', {
      head: (J, col, s, face) => { // 毛帽
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(J.head.x, J.head.y - 5 * s, 24 * s, Math.PI, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(J.head.x, J.head.y - 31 * s, 7 * s, 0, 7); ctx.fill();
      },
      front: (J, col) => {
        if (col === C.rim) return;
        const hd = J.A1.hand;
        ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hd.x, hd.y);
        ctx.quadraticCurveTo((hd.x + collar.x) / 2, Math.max(hd.y, collar.y) + 26, collar.x, collar.y); ctx.stroke();
      },
    });
  }

  // ---------- 主角配件 ----------
  let curV = 0, curT = 0;
  function headband(J, col, s, face) {
    const rim = col === C.rim;
    // 頭帶尾巴：靜止時下垂，跑步時往後飄
    const k = clamp(curV / VJ, 0, 1);
    const bx = J.head.x - face * 20 * s, by = J.head.y - 8 * s;
    [[24, 0], [19, 14]].forEach(([len, off], i) => {
      const a = -face * (8 + off + k * (62 + 8 * Math.sin(curT * 19 + i * 1.7)));
      const ex = bx + Math.sin(a * Math.PI / 180) * len * s, ey = by + Math.cos(a * Math.PI / 180) * len * s;
      ctx.strokeStyle = rim ? C.rim : TEAL_D; ctx.lineWidth = 5.5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    });
    ctx.save(); ctx.beginPath(); ctx.arc(J.head.x, J.head.y, 23.5 * s, 0, 7); ctx.clip();
    ctx.fillStyle = rim ? C.rim : TEAL; ctx.fillRect(J.head.x - 26 * s, J.head.y - 14 * s, 52 * s, 9 * s);
    ctx.restore();
  }
  function redShoe(ft, s, face, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ft.x + face * 9.5 * s, ft.y + 2 * s, 16 * s, 7.6 * s, 0, 0, 7); ctx.fill();
    if (col === C.rim) return;
    ctx.fillStyle = '#f1ecff'; ctx.beginPath(); ctx.ellipse(ft.x + face * 9.5 * s, ft.y + 7 * s, 15.5 * s, 2.6 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(ft.x + face * 4 * s - 3 * s, ft.y - 3 * s, 6 * s, 2 * s);
  }
  function watch(J, rim, beep) {
    const A = J.A1, x = lerp(A.el.x, A.hand.x, 0.78), y = lerp(A.el.y, A.hand.y, 0.78);
    const ang = Math.atan2(A.hand.y - A.el.y, A.hand.x - A.el.x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = rim ? C.rim : '#3a2c66'; rr(-11, -16, 22, 32, 6); ctx.fill();
    if (!rim) { ctx.fillStyle = beep > 0 ? '#fff4d6' : TEAL; rr(-8, -11, 16, 22, 4); ctx.fill(); }
    ctx.restore();
    if (!rim && beep > 0) glow(x, y, 46 * beep, `rgba(255,211,107,${0.85 * beep})`);
  }
  const beepAt = t => Math.max(...BEEPS.map(b => { const k = (t - b) / 0.35; return k >= 0 && k <= 1 ? 1 - k : 0; }));

  function hero(t) {
    const p = heroPose(t); p.gy = G;
    curV = speed(t); curT = t;
    const face = p.face;
    const J = figure(p, S, 'hero', {
      head: headband,
      behind: (J, far, s, f) => { redShoe(J.L2.ft, s, f, far === C.rim ? C.rim : SHOE_D); },
      front: (J, col, s, f) => { redShoe(J.L1.ft, s, f, col === C.rim ? C.rim : SHOE); watch(J, col === C.rim, beepAt(t)); },
    });
    return J;
  }

  // ---------- 汗 ----------
  function drop(x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#bfe9ff';
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.9); ctx.quadraticCurveTo(x + r, y - r * 0.4, x, y + r); ctx.quadraticCurveTo(x - r, y - r * 0.4, x, y - r * 1.9); ctx.fill(); ctx.restore();
  }
  const SWEAT = [6.3, 6.75, 7.2, 7.6, 8.0].map(ts => ({ ts, J: joints(heroPose(ts), S) }));
  function sweat(t, J) {
    SWEAT.forEach(({ ts, J: J0 }, i) => {
      const age = t - ts; if (age < 0 || age > 0.55) return;
      const x = J0.head.x - 20 + (-70 - 20 * i % 2) * age, y = J0.head.y - 14 - 120 * age + 520 * age * age;
      drop(x, y, 5, 1 - age / 0.55);
    });
    // 額頭上的汗珠：擦掉之前一直在
    const on = prog(t, 7.7, 8.0) * (1 - prog(t, 9.42, 9.55));
    if (on > 0) { drop(J.head.x + 27, J.head.y - 4, 4.5, on); drop(J.head.x + 18, J.head.y + 10, 3.8, on); }
    // 擦汗時甩掉的汗
    const fa = t - 9.6;
    if (fa > 0 && fa < 0.5) {
      const hx = XE - 14, hy = G - 146 - 160;
      [[-1, 0], [-0.6, 0.4], [-1.2, 0.8]].forEach(([vx, d]) => drop(hx - 30 + vx * 160 * fa, hy - 10 + d * 20 - 60 * fa + 500 * fa * fa, 4, 1 - fa / 0.5));
    }
  }

  function draw(c, t) {
    const zoom = 1.2 + 0.03 * prog(t, 0, 12, E.inOut);
    const cam = camX(t);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(960, 800); ctx.scale(zoom, zoom); ctx.translate(-960, -800);
    background(t, cam);
    path(cam);
    ctx.save(); ctx.translate(-cam, 0);
    LAMPS.forEach(x => { if (x - cam > -200 && x - cam < 2120) lampPost(x); });
    walker(t);
    bench();
    const J = hero(t);
    sweat(t, J);
    ctx.restore();
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'go', verb: true }, { w: 'jogging' }], draw };
})();
