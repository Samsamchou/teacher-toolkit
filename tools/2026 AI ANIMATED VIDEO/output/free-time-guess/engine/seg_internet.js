// 第 7 段 surf the Internet：夜晚的書桌角落（不用任何品牌標誌，改用地球＋Wi-Fi 圖示）。
// 站在拉開的椅子前 → 坐下 → 腳推地、椅子滑到書桌前 → 掀開筆電螢幕 → 螢幕亮起、冷光照在臉上
// → 打字，瀏覽器視窗從螢幕「彈出」放大（教室後排也看得清楚）→ 觸控板捲動、點選：
// 首頁 → 地圖（紅色圖釘落下）→ 影片（按播放）→ 貓咪照片（按愛心）；每換一頁就有一個小圖示從螢幕飄到空中
// → 人往前湊近看、點頭，最後放鬆地繼續滑。
SEGMENTS.internet = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, keyed, STAND, SIT, mix, joints } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800;
  const SEAT_TOP = G - 82;
  const CHAIR0 = 530, CHAIR1 = 645;
  const DESK = { L: 725, R: 1085, top: 663 };
  const LAP = { L: 730, hinge: 800, y: DESK.top - 8, len: 58 }; // y = 筆電底座上緣
  const HINGE = { x: LAP.hinge, y: LAP.y - 3 };
  const TP = { x: 744, y: LAP.y - 4 };    // 觸控板（靠近人的一側）
  const KEYS = { x: 780, y: LAP.y - 4 };  // 鍵盤
  const ROUTER = { x: 1000, y: DESK.top };
  const PANEL = { x: 1150, y: 172, w: 690, h: 440 };
  const TAPS = [5.3, 6.45, 6.95, 7.98, 9.0];

  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixC = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
  const bump = (t, a, b) => (t > a && t < b) ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;

  // ---------- 鏡頭：全景 → 推近到書桌 ----------
  function cam(t) {
    const k = prog(t, 1.8, 3.7);
    return { z: lerp(1.0, 1.3, k) + 0.03 * prog(t, 3.7, 10), fx: lerp(960, 700, k), fy: lerp(600, 640, k), sx: lerp(960, 560, k), sy: lerp(600, 660, k) };
  }
  const toScreen = (c, p) => ({ x: c.sx + (p.x - c.fx) * c.z, y: c.sy + (p.y - c.fy) * c.z });

  // ---------- 房間 ----------
  const R = rng(23);
  const stars = Array.from({ length: 24 }, () => ({ x: 185 + R() * 270, y: 245 + R() * 150, r: 0.8 + R() * 1.6, p: R() * 6 }));
  const city = []; for (let x = 176; x < 464;) { const w = 22 + R() * 30, h = 30 + R() * 70; city.push({ x, w, h, lit: Array.from({ length: 6 }, () => R() < 0.35) }); x += w + 2; }
  const books = (x0, y, list) => { let x = x0; list.forEach(([w, h, col, lean]) => { ctx.save(); ctx.translate(x + w / 2, y); ctx.rotate(lean || 0); ctx.fillStyle = col; rr(-w / 2, -h, w, h, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-w / 2 + 3, -h + 8, w - 6, 3); ctx.restore(); x += w + 3; }); };

  function room(t) {
    const g = ctx.createLinearGradient(0, 0, 0, G);
    g.addColorStop(0, '#171041'); g.addColorStop(1, '#2a1d63');
    ctx.fillStyle = g; ctx.fillRect(-400, -200, 2800, G + 200);
    // 窗戶（夜空、月亮、城市燈火）
    ctx.fillStyle = '#3d2d84'; rr(160, 220, 320, 330, 10); ctx.fill();
    const sg = ctx.createLinearGradient(0, 236, 0, 534);
    sg.addColorStop(0, '#140f3a'); sg.addColorStop(0.6, '#2b1a63'); sg.addColorStop(1, '#6a2a7a');
    ctx.fillStyle = sg; ctx.fillRect(176, 236, 288, 298);
    ctx.fillStyle = C.light;
    stars.forEach(s => { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    glow(410, 290, 70, 'rgba(255,244,214,0.35)');
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(410, 290, 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1244'; ctx.beginPath(); ctx.arc(421, 283, 21, 0, 7); ctx.fill();
    city.forEach(b => {
      ctx.fillStyle = '#1b1348'; ctx.fillRect(b.x, 534 - b.h, Math.min(b.w, 464 - b.x), b.h);
      ctx.fillStyle = C.gold; b.lit.forEach((on, i) => { if (on && b.x + 6 + (i % 2) * 10 < 458) ctx.fillRect(b.x + 6 + (i % 2) * 10, 534 - b.h + 10 + Math.floor(i / 2) * 16, 5, 7); });
    });
    ctx.fillStyle = '#3d2d84'; ctx.fillRect(316, 236, 8, 298); ctx.fillRect(176, 381, 288, 8);
    ctx.fillStyle = '#4b3b80'; rr(145, 546, 350, 14, 4); ctx.fill();
    // 窗台小盆栽
    ctx.fillStyle = '#2fa59a'; [[-10, -16, -0.5], [6, -22, 0.2], [16, -12, 0.8]].forEach(([dx, dy, a]) => { ctx.beginPath(); ctx.ellipse(212 + dx, 522 + dy, 7, 16, a, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#a8742c'; rr(196, 520, 34, 27, 5); ctx.fill();
    // 窗簾
    ctx.fillStyle = '#4b2f86';
    ctx.beginPath(); ctx.moveTo(118, 205); ctx.lineTo(186, 205); ctx.quadraticCurveTo(170, 400, 196, 610); ctx.lineTo(112, 610); ctx.quadraticCurveTo(128, 400, 118, 205); ctx.fill();
    ctx.beginPath(); ctx.moveTo(454, 205); ctx.lineTo(522, 205); ctx.quadraticCurveTo(512, 400, 528, 610); ctx.lineTo(444, 610); ctx.quadraticCurveTo(470, 400, 454, 205); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; rr(100, 196, 440, 12, 6); ctx.fill();
    // 牆上掛畫（山與月）
    ctx.fillStyle = '#4b3b80'; rr(585, 300, 116, 140, 6); ctx.fill();
    ctx.fillStyle = '#23857c'; ctx.fillRect(597, 312, 92, 116);
    ctx.fillStyle = '#2fa59a'; ctx.beginPath(); ctx.moveTo(597, 428); ctx.lineTo(630, 372); ctx.lineTo(652, 400); ctx.lineTo(670, 380); ctx.lineTo(689, 428); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(668, 340, 10, 0, 7); ctx.fill();
    // 書桌上方的層板與書
    ctx.fillStyle = '#4b3b80'; rr(868, 452, 214, 10, 3); ctx.fill(); ctx.fillRect(890, 462, 8, 18); ctx.fillRect(1052, 462, 8, 18);
    books(882, 452, [[16, 62, '#2fa59a'], [20, 72, '#d9a24a'], [14, 56, '#8f80cf'], [18, 66, '#5b4a8a'], [16, 58, '#2fa59a', 0.35]]);
    ctx.fillStyle = '#a8742c'; rr(1030, 426, 30, 26, 5); ctx.fill();
    ctx.fillStyle = '#2fa59a'; [[-8, 0.6], [0, 0], [8, -0.6]].forEach(([dx, a]) => { ctx.beginPath(); ctx.ellipse(1045 + dx * 1.4, 412, 6, 15, a, 0, 7); ctx.fill(); });
    // 右側書櫃
    ctx.fillStyle = '#33256f'; rr(1240, 430, 270, 370, 6); ctx.fill();
    ctx.fillStyle = '#251a5a'; [445, 535, 625, 715].forEach(y => ctx.fillRect(1254, y, 242, 76));
    books(1260, 521, [[18, 64, '#d9a24a'], [14, 70, '#2fa59a'], [20, 58, '#8f80cf'], [16, 66, '#5b4a8a'], [22, 60, '#2fa59a']]);
    books(1360, 611, [[18, 66, '#8f80cf'], [16, 60, '#d9a24a'], [14, 70, '#2fa59a'], [20, 62, '#5b4a8a', -0.3]]);
    books(1272, 701, [[20, 60, '#5b4a8a'], [16, 68, '#d9a24a'], [18, 64, '#8f80cf']]);
    ctx.fillStyle = '#5b4a8a'; rr(1420, 486, 52, 36, 8); ctx.fill(); // 收納盒
    books(1300, 791, [[60, 26, '#2fa59a'], [64, 20, '#d9a24a']]);
    // 大盆栽
    ctx.fillStyle = '#23857c'; [[-40, -120, -0.6], [-10, -150, -0.1], [25, -135, 0.4], [45, -95, 0.9], [-50, -80, -1.0]].forEach(([dx, dy, a]) => { ctx.beginPath(); ctx.ellipse(1640 + dx, 730 + dy, 18, 52, a, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#7a68ad'; rr(1608, 730, 64, 70, 10); ctx.fill();
    // 地板＋踢腳板＋地毯
    ctx.fillStyle = '#3a2c78'; ctx.fillRect(-400, G - 12, 2800, 12);
    ctx.fillStyle = '#1a1240'; ctx.fillRect(-400, G, 2800, 300);
    ctx.strokeStyle = 'rgba(201,184,255,0.06)'; ctx.lineWidth = 2;
    [828, 862].forEach(y => { ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(2400, y); ctx.stroke(); });
    ctx.fillStyle = '#2b2070'; ctx.beginPath(); ctx.ellipse(700, 818, 300, 22, 0, 0, 7); ctx.fill();
    // 月光灑在地上
    ctx.fillStyle = 'rgba(201,184,255,0.05)'; ctx.beginPath(); ctx.moveTo(176, 534); ctx.lineTo(464, 534); ctx.lineTo(760, 905); ctx.lineTo(330, 905); ctx.closePath(); ctx.fill();
  }

  // ---------- 有輪子的書桌椅 ----------
  const chairX = t => lerp(CHAIR0, CHAIR1, prog(t, 1.35, 2.2));
  function chair(t) {
    const x = chairX(t), rot = (x - CHAIR0) / 9;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(x, G + 3, 70, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d2d84';
    ctx.save(); ctx.translate(x - 58, SEAT_TOP + 6); ctx.rotate(-0.08); rr(-10, -132, 20, 120, 9); ctx.fill(); ctx.restore(); // 椅背支架
    ctx.fillStyle = '#5b4a8a';
    ctx.save(); ctx.translate(x - 62, SEAT_TOP - 70); ctx.rotate(-0.08); rr(-13, -60, 26, 104, 12); ctx.fill(); ctx.restore(); // 椅背
    ctx.fillStyle = '#3d2d84'; ctx.fillRect(x - 6, SEAT_TOP + 14, 12, 34); // 氣壓棒
    ctx.fillStyle = '#4b3b80'; rr(x - 58, SEAT_TOP + 46, 116, 9, 4); ctx.fill(); // 椅腳
    [-50, 50].forEach(dx => {
      const cx = x + dx, cy = G - 9;
      ctx.fillStyle = '#251a5a'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8f80cf'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 7 * Math.cos(rot), cy + 7 * Math.sin(rot)); ctx.stroke();
    });
    ctx.fillStyle = '#5b4a8a'; rr(x - 54, SEAT_TOP, 104, 18, 8); ctx.fill(); // 座墊
    ctx.fillStyle = '#7a68ad'; rr(x - 50, SEAT_TOP, 96, 6, 3); ctx.fill();
  }

  // ---------- 書桌、路由器、筆電 ----------
  function desk() {
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(905, G + 3, 200, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b4630'; ctx.fillRect(DESK.L + 10, DESK.top + 16, 14, G - DESK.top - 16);
    ctx.fillStyle = '#7a4f35'; ctx.fillRect(945, DESK.top + 16, 130, G - DESK.top - 16);
    ctx.fillStyle = '#8a5a3c'; rr(953, DESK.top + 26, 114, 46, 4); ctx.fill(); rr(953, DESK.top + 80, 114, 46, 4); ctx.fill();
    ctx.fillStyle = C.gold; rr(996, DESK.top + 45, 28, 7, 3); ctx.fill(); rr(996, DESK.top + 99, 28, 7, 3); ctx.fill();
    ctx.fillStyle = '#8a5a3c'; rr(DESK.L, DESK.top, DESK.R - DESK.L, 18, 5); ctx.fill();
    ctx.fillStyle = '#d6a070'; rr(DESK.L, DESK.top, DESK.R - DESK.L, 5, 3); ctx.fill();
  }
  function router(t) {
    const x = ROUTER.x, y = ROUTER.y;
    ctx.fillStyle = '#3d2d84';
    [[-28, -0.18], [28, 0.18]].forEach(([dx, a]) => { ctx.save(); ctx.translate(x + dx, y - 26); ctx.rotate(a); rr(-4, -46, 8, 48, 4); ctx.fill(); ctx.restore(); });
    ctx.fillStyle = '#5b4a8a'; rr(x - 48, y - 30, 96, 30, 8); ctx.fill();
    ctx.fillStyle = '#6b5b95'; rr(x - 48, y - 30, 96, 9, 5); ctx.fill();
    const leds = ['#5ee0c8', '#5ee0c8', C.gold, '#5ee0c8'];
    leds.forEach((col, i) => {
      const on = Math.sin(t * (7 + i * 2.3) + i * 1.7) > -0.2;
      ctx.fillStyle = on ? col : '#2b2060';
      ctx.beginPath(); ctx.arc(x - 27 + i * 18, y - 12, 4, 0, 7); ctx.fill();
      if (on) glow(x - 27 + i * 18, y - 12, 12, col === C.gold ? 'rgba(255,211,107,0.6)' : 'rgba(94,224,200,0.6)');
    });
    // Wi-Fi 訊號弧線（一圈一圈往外亮）
    wifi(x, y - 84, 1.0, t, 'rgba(94,224,200,', 0.9);
  }
  function wifi(x, y, sc, t, colBase, aMax) {
    ctx.lineCap = 'round';
    ctx.fillStyle = colBase + aMax + ')'; ctx.beginPath(); ctx.arc(x, y, 5 * sc, 0, 7); ctx.fill();
    for (let i = 1; i <= 3; i++) {
      const ph = ((t * 1.3 - i * 0.22) % 1 + 1) % 1;
      const a = aMax * (0.35 + 0.65 * Math.max(0, Math.sin(Math.PI * ph)));
      ctx.strokeStyle = colBase + a + ')'; ctx.lineWidth = 5.5 * sc;
      ctx.beginPath(); ctx.arc(x, y, 13 * i * sc, -Math.PI * 0.77, -Math.PI * 0.23); ctx.stroke();
    }
  }
  const OPEN = 98;
  const lidAng = t => OPEN * prog(t, 2.5, 3.2, E.inOut);
  function lidGeom(th) {
    const a = th * Math.PI / 180;
    const d = { x: -Math.cos(a), y: -Math.sin(a) }, n = { x: d.y, y: -d.x }; // n = 螢幕那一面的方向
    return { d, n, edge: { x: HINGE.x + LAP.len * d.x, y: HINGE.y + LAP.len * d.y } };
  }
  const screenOn = t => prog(t, 3.15, 3.55);
  function laptop(t) {
    ctx.fillStyle = 'rgba(8,5,30,0.3)'; ctx.fillRect(LAP.L + 4, DESK.top - 1, 68, 2);
    ctx.fillStyle = '#9d93d0'; rr(LAP.L, LAP.y, 74, 8, 3); ctx.fill();
    ctx.fillStyle = '#c9c0f0'; ctx.fillRect(LAP.L + 2, LAP.y, 70, 2);
    const L = lidGeom(lidAng(t)), on = screenOn(t);
    const H = HINGE, e = L.edge;
    // 外殼
    ctx.strokeStyle = '#8f84c4'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(H.x - L.n.x * 1, H.y - L.n.y * 1); ctx.lineTo(e.x - L.n.x * 1, e.y - L.n.y * 1); ctx.stroke();
    // 螢幕面
    ctx.strokeStyle = mixC('#232055', '#bff6ff', on); ctx.lineWidth = 3.5; ctx.lineCap = 'butt';
    const s0 = { x: H.x + L.d.x * 6 + L.n.x * 3, y: H.y + L.d.y * 6 + L.n.y * 3 }, s1 = { x: e.x - L.d.x * 5 + L.n.x * 3, y: e.y - L.d.y * 5 + L.n.y * 3 };
    ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
    ctx.fillStyle = '#6b5b95'; ctx.beginPath(); ctx.arc(H.x, H.y, 4.5, 0, 7); ctx.fill();
    return { s0, s1, n: L.n };
  }
  // 螢幕冷光（照亮臉和桌面）
  function screenLight(t, scr) {
    const on = screenOn(t); if (on <= 0) return;
    const flick = 1 + 0.04 * Math.sin(t * 9);
    const c = { x: (scr.s0.x + scr.s1.x) / 2 + scr.n.x * 30, y: (scr.s0.y + scr.s1.y) / 2 + scr.n.y * 30 };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(c.x - 20, c.y - 10, 260 * on, `rgba(90,200,255,${0.22 * on * flick})`);
    glow((scr.s0.x + scr.s1.x) / 2, (scr.s0.y + scr.s1.y) / 2, 70 * on, `rgba(170,240,255,${0.5 * on})`);
    ctx.restore();
  }

  // ---------- 人物 ----------
  const sitPose = (x, ex) => ({ ...SIT(x, G, SEAT_TOP), a1: 30, e1: 70, a2: 25, e2: 60, ...ex });
  const handsOf = p => { const J = joints(p, S); return [J.A1.hand, J.A2.hand]; };
  function withHands(p, t1, t2, k = 1) {
    const h = handsOf(p), o = { ...p };
    if (t1) { o.h1x = lerp(h[0].x, t1.x, k); o.h1y = lerp(h[0].y, t1.y, k); o.b1 = 1; }
    if (t2) { o.h2x = lerp(h[1].x, t2.x, k); o.h2y = lerp(h[1].y, t2.y, k); o.b2 = 1; }
    return o;
  }
  const TOR = [[3.25, { v: 30 }], [3.7, { v: 17 }], [5.5, { v: 17 }], [5.9, { v: 25 }], [6.4, { v: 25 }], [6.8, { v: 18 }], [9.3, { v: 18 }], [9.9, { v: 12 }]];
  const CUR = [
    [4.15, { x: 420, y: 330 }], [4.95, { x: 420, y: 300 }], [5.2, { x: 505, y: 302 }], [5.45, { x: 505, y: 302 }],
    [5.9, { x: 345, y: 232 }], [6.15, { x: 345, y: 232 }], [6.38, { x: 650, y: 250 }], [6.6, { x: 650, y: 250 }],
    [6.88, { x: 328, y: 212 }], [7.2, { x: 328, y: 212 }], [7.6, { x: 470, y: 300 }], [7.92, { x: 655, y: 218 }], [8.15, { x: 655, y: 218 }],
    [8.9, { x: 345, y: 388 }], [9.6, { x: 345, y: 388 }], [10.6, { x: 420, y: 300 }], [16, { x: 440, y: 290 }],
  ];
  const cursor = t => keyed(CUR, t);
  const tapLift = t => TAPS.reduce((a, s) => a + bump(t, s - 0.16, s + 0.02), 0);

  function person(t) {
    let p;
    if (t < 0.45) p = { ...STAND(575, G), hd: 8 };
    else if (t < 1.3) p = mix({ ...STAND(575, G), hd: 8 }, sitPose(CHAIR0), prog(t, 0.45, 1.25));
    else if (t < 2.2) { // 腳推地，椅子往前滑
      const ph = prog(t, 1.35, 2.2, E.lin), env = Math.sin(Math.PI * ph);
      const w = Math.sin(ph * Math.PI * 4) * env;
      p = sitPose(chairX(t), { k1: 4 - 14 * w, k2: 8 + 14 * w, l1: 86 - 6 * w, l2: 82 + 6 * w, tor: 6 + 4 * env, hd: 6 });
    } else if (t < 2.5) { // 往前傾，手伸向螢幕上蓋邊緣
      const k = prog(t, 2.2, 2.5);
      const e = lidGeom(0).edge;
      p = withHands(sitPose(CHAIR1, { tor: lerp(6, 24, k), hd: 10 }), { x: e.x - 4, y: e.y + 2 }, null, k);
    } else if (t < 3.25) { // 掀開螢幕
      const L = lidGeom(lidAng(t));
      p = sitPose(CHAIR1, { tor: lerp(24, 30, prog(t, 2.5, 3.0)), hd: 10, h1x: L.edge.x + L.n.x * 4 - L.d.x * 2, h1y: L.edge.y + L.n.y * 4 - L.d.y * 2, b1: 1 });
    } else { // 打字、用觸控板
      const tor = keyed(TOR, t).v;
      const lean = prog(t, 5.5, 5.9) * (1 - prog(t, 6.4, 6.8));
      const nod = t > 8.2 && t < 9.0 ? 9 * Math.sin((t - 8.2) / 0.8 * Math.PI * 2) * Math.sin((t - 8.2) / 0.8 * Math.PI) : 0;
      const breathe = t > 9.9 ? 1.5 * Math.sin((t - 9.9) * 2) : 0;
      const base = sitPose(CHAIR1, { tor: tor + breathe * 0.4, hd: 12 + 6 * lean + nod });
      const typing = t > 3.65 && t < 4.2;
      const cu = cursor(t);
      const scroll = bump(t, 4.45, 5.0);
      const tp = { x: TP.x + (cu.y - 250) * -0.02 + 5 * Math.sin(Math.PI * prog(t, 4.45, 5.0)) * -1, y: TP.y - 6 * tapLift(t) - 2 * scroll };
      const tp2 = { x: KEYS.x + (typing ? 4 * Math.sin(t * 31) : 0), y: KEYS.y - (typing ? 5 * Math.abs(Math.sin(t * 23)) : 0) };
      // 3.25–3.6 手從上蓋移回鍵盤；3.6–4.2 兩手打字；之後近手移到觸控板
      const L = lidGeom(OPEN), from = { x: L.edge.x + L.n.x * 4, y: L.edge.y + L.n.y * 4 };
      const k1 = prog(t, 3.25, 3.6);
      const typeNear = { x: KEYS.x - 14 + (typing ? 3 * Math.sin(t * 27 + 1) : 0), y: KEYS.y - (typing ? 5 * Math.abs(Math.sin(t * 19 + 1)) : 0) };
      const toTP = prog(t, 4.15, 4.35);
      const near = t < 3.6 ? { x: lerp(from.x, typeNear.x, k1), y: lerp(from.y, typeNear.y, k1) - 14 * Math.sin(Math.PI * k1) } : { x: lerp(typeNear.x, tp.x, toTP), y: lerp(typeNear.y, tp.y, toTP) - 6 * Math.sin(Math.PI * toTP) };
      const farK = prog(t, 3.3, 3.65);
      p = withHands(base, null, tp2, farK);
      p.h1x = near.x; p.h1y = near.y; p.b1 = 1;
    }
    p.gy = G;
    const hair = (J, col, s, face) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(J.head.x - face * 2 * s, J.head.y - 3 * s, 24.5 * s, Math.PI * 0.85, Math.PI * 2.0); ctx.fill();
      ctx.beginPath(); ctx.arc(J.head.x - face * 19 * s, J.head.y - 17 * s, 10 * s, 0, 7); ctx.fill();
    };
    return figure(p, S, 'hero', { head: hair });
  }

  // ---------- 彈出的瀏覽器視窗（螢幕座標） ----------
  const pageF = t => prog(t, 5.35, 5.75) + prog(t, 6.5, 6.9) + prog(t, 8.03, 8.43);
  const LINE = '#b9b0e0';
  const lines = (x, y, ws, gap = 20) => { ctx.fillStyle = LINE; ws.forEach((w, i) => { rr(x, y + i * gap, w, 9, 4.5); ctx.fill(); }); };
  function nextBtn(x, y) {
    ctx.fillStyle = '#3d2d84'; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f1ecff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 4, y - 9); ctx.lineTo(x + 5, y); ctx.lineTo(x - 4, y + 9); ctx.stroke();
  }
  function pageHome(t) {
    const sy = 90 * prog(t, 4.45, 5.0);
    ctx.save(); ctx.translate(0, -sy);
    ctx.fillStyle = '#2fa59a'; rr(30, 80, 410, 170, 14); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(340, 130, 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#23857c'; ctx.beginPath(); ctx.moveTo(30, 250); ctx.lineTo(130, 150); ctx.lineTo(210, 220); ctx.lineTo(290, 160); ctx.lineTo(440, 250); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a24a'; rr(462, 80, 198, 80, 12); ctx.fill();
    lines(462, 176, [190, 150, 170]);
    lines(30, 270, [400, 360, 380, 250], 22);
    lines(462, 246, [180, 120]);
    [[30, '#8f80cf'], [360, '#5b4a8a']].forEach(([x, col]) => {
      ctx.fillStyle = '#f7f4ff'; rr(x, 360, 300, 120, 14); ctx.fill();
      ctx.fillStyle = col; rr(x + 12, 372, 110, 96, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x + 67, 410, 18, 0, 7); ctx.fill();
      lines(x + 136, 384, [140, 110, 128], 22);
    });
    ctx.restore();
  }
  function pageMap(t) {
    ctx.fillStyle = '#cfeee4'; ctx.fillRect(0, 58, 690, 382);
    ctx.fillStyle = '#9fdcc4'; rr(60, 110, 150, 110, 18); ctx.fill(); rr(470, 300, 170, 100, 18); ctx.fill();
    ctx.fillStyle = '#b8e2d6'; [[250, 90, 120, 70], [420, 100, 120, 90], [80, 280, 140, 90], [260, 300, 140, 100]].forEach(([x, y, w, h]) => { rr(x, y, w, h, 8); ctx.fill(); });
    ctx.strokeStyle = '#8fc8f0'; ctx.lineWidth = 22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 420); ctx.bezierCurveTo(200, 380, 380, 450, 700, 270); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(0, 260); ctx.lineTo(690, 240); ctx.moveTo(230, 58); ctx.lineTo(240, 440); ctx.moveTo(400, 58); ctx.lineTo(560, 440); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.setLineDash([2, 14]);
    ctx.beginPath(); ctx.moveTo(110, 165); ctx.quadraticCurveTo(200, 250, 345, 248); ctx.stroke(); ctx.setLineDash([]);
    // 紅色圖釘落下（整段唯一的紅色重點）
    const drop = prog(t, 5.62, 5.95, E.back), px = 345, py = 248;
    if (t > 5.62) {
      const ring = ((t - 5.95) % 1.2) / 1.2;
      if (t > 5.95) { ctx.strokeStyle = `rgba(232,67,58,${0.6 * (1 - ring)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(px, py, 14 + 34 * ring, 5 + 12 * ring, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,20,70,0.25)'; ctx.beginPath(); ctx.ellipse(px, py, 12 * drop, 4 * drop, 0, 0, 7); ctx.fill();
      const y = lerp(py - 120, py, clamp(drop, 0, 1.2));
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(px, y - 40, 22, Math.PI * 0.82, Math.PI * 2.18); ctx.lineTo(px, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, y - 40, 8.5, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#9fdcc4'; ctx.beginPath(); ctx.arc(110, 165, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d2d84'; ctx.beginPath(); ctx.arc(110, 165, 6, 0, 7); ctx.fill();
    nextBtn(650, 250);
  }
  function pageVideo(t) {
    const play = prog(t, 7.0, 7.25);
    ctx.fillStyle = '#1b1348'; rr(30, 75, 590, 270, 16); ctx.fill();
    ctx.save(); rr(30, 75, 590, 270, 16); ctx.clip();
    const vt = Math.max(0, t - 7.0);
    // 影片內容：月亮、緩緩移動的山丘、跳過去的小狐狸
    ctx.fillStyle = '#2b1a63'; ctx.fillRect(30, 75, 590, 270);
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(520, 130, 26, 0, 7); ctx.fill();
    [['#4b3b80', 0.6, 250], ['#2fa59a', 1.0, 290]].forEach(([col, sp, base]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(30, 345);
      for (let x = 30; x <= 620; x += 10) ctx.lineTo(x, base - 30 * Math.sin((x + vt * 60 * sp) * 0.012));
      ctx.lineTo(620, 345); ctx.closePath(); ctx.fill();
    });
    if (play > 0) { // 影片裡一隻小鳥拍翅膀飛過山丘
      const bx = 90 + ((vt * 70) % 560), by = 170 + 18 * Math.sin(vt * 2.2), flap = Math.sin(vt * 14);
      ctx.fillStyle = C.gold; ctx.globalAlpha = play;
      ctx.beginPath(); ctx.ellipse(bx, by, 22, 12, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + 20, by - 6, 10, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 28, by - 9); ctx.lineTo(bx + 40, by - 4); ctx.lineTo(bx + 28, by - 1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 20, by - 2); ctx.lineTo(bx - 36, by - 12); ctx.lineTo(bx - 34, by + 6); ctx.fill();
      ctx.fillStyle = '#e8b965';
      ctx.beginPath(); ctx.moveTo(bx - 10, by - 4); ctx.lineTo(bx + 8, by - 4); ctx.lineTo(bx - 4, by - 4 - 30 * flap); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b1a63'; ctx.beginPath(); ctx.arc(bx + 23, by - 8, 2.5, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 播放鍵
    const bA = 1 - play;
    if (bA > 0) {
      ctx.globalAlpha = bA; ctx.fillStyle = 'rgba(241,236,255,0.92)'; ctx.beginPath(); ctx.arc(325, 210, 44 * (1 + 0.15 * play), 0, 7); ctx.fill();
      ctx.fillStyle = '#3d2d84'; ctx.beginPath(); ctx.moveTo(310, 186); ctx.lineTo(346, 210); ctx.lineTo(310, 234); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 進度條
    ctx.fillStyle = '#5b4a8a'; rr(50, 325, 550, 8, 4); ctx.fill();
    const pr = 0.04 + 0.5 * clamp(vt / 6, 0, 1);
    ctx.fillStyle = C.gold; rr(50, 325, 550 * pr, 8, 4); ctx.fill();
    ctx.beginPath(); ctx.arc(50 + 550 * pr, 329, 8, 0, 7); ctx.fill();
    lines(30, 365, [420, 300]);
    lines(470, 365, [150]);
    nextBtn(655, 218);
  }
  function pageCat(t) {
    ctx.fillStyle = '#d9a24a'; rr(150, 75, 390, 262, 16); ctx.fill();
    ctx.fillStyle = '#e8b965'; ctx.beginPath(); ctx.arc(345, 200, 100, 0, 7); ctx.fill();
    const cx = 345, cy = 300, tw = Math.sin(t * 2.2);
    ctx.fillStyle = '#3d2d84';
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3d2d84'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(cx + 46, cy + 22); ctx.quadraticCurveTo(cx + 110, cy + 10, cx + 96 + 8 * tw, cy - 50); ctx.stroke(); // 尾巴
    ctx.beginPath(); ctx.ellipse(cx, cy - 8, 60, 52, 0, Math.PI, 2 * Math.PI); ctx.lineTo(cx + 60, cy + 30); ctx.lineTo(cx - 60, cy + 30); ctx.closePath(); ctx.fill(); // 身體
    ctx.beginPath(); ctx.arc(cx, cy - 88, 44, 0, 7); ctx.fill(); // 頭
    [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(cx + s * 40, cy - 108); ctx.lineTo(cx + s * 34, cy - 150); ctx.lineTo(cx + s * 12, cy - 128); ctx.closePath(); ctx.fill(); });
    const blink = (t % 3.1) > 2.95 ? 0.15 : 1;
    ctx.fillStyle = C.gold; [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(cx + s * 17, cy - 92, 7, 10 * blink, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#c9b8ff'; ctx.beginPath(); ctx.moveTo(cx - 5, cy - 76); ctx.lineTo(cx + 5, cy - 76); ctx.lineTo(cx, cy - 70); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(201,184,255,0.7)'; ctx.lineWidth = 2.5;
    [-1, 1].forEach(s => { [-4, 4].forEach(dy => { ctx.beginPath(); ctx.moveTo(cx + s * 12, cy - 72 + dy * 0.5); ctx.lineTo(cx + s * 42, cy - 76 + dy * 2); ctx.stroke(); }); });
    // 愛心（按了變金色）
    const liked = prog(t, 9.02, 9.25, E.back);
    const hs = 1 + 0.25 * bump(t, 9.02, 9.4);
    ctx.save(); ctx.translate(345, 390); ctx.scale(hs, hs);
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-30, -6, -16, -28, 0, -12); ctx.bezierCurveTo(16, -28, 30, -6, 0, 14); ctx.closePath();
    ctx.fillStyle = liked > 0 ? mixC('#8f80cf', '#ffd36b', clamp(liked, 0, 1)) : '#8f80cf'; ctx.fill();
    ctx.restore();
    if (t > 9.02 && t < 9.6) {
      const k = (t - 9.02) / 0.58; ctx.strokeStyle = `rgba(255,211,107,${1 - k})`; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(345 + Math.cos(a) * (24 + 20 * k), 388 + Math.sin(a) * (24 + 20 * k)); ctx.lineTo(345 + Math.cos(a) * (34 + 30 * k), 388 + Math.sin(a) * (34 + 30 * k)); ctx.stroke(); }
    }
    lines(160, 360, [140, 100]); lines(400, 360, [130, 90]);
  }
  const PAGES = [pageHome, pageMap, pageVideo, pageCat];

  function globeIcon(x, y, r, col, spin = 0) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.17);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, r * Math.abs(Math.cos(spin)) * 0.5 + 0.5, r, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.85, y - r * 0.5); ctx.lineTo(x + r * 0.85, y - r * 0.5); ctx.moveTo(x - r * 0.85, y + r * 0.5); ctx.lineTo(x + r * 0.85, y + r * 0.5); ctx.stroke();
  }
  function wifiIcon(x, y, r, col) { // y = 底部圓點
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.2;
    ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, 7); ctx.fill();
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(x, y, r * 0.42 * i, -Math.PI * 0.76, -Math.PI * 0.24); ctx.stroke(); }
  }
  function browserPanel(t) {
    const W = PANEL.w, H = PANEL.h;
    ctx.fillStyle = '#e9e4ff'; rr(0, 0, W, H, 22); ctx.fill();
    ctx.save(); rr(0, 0, W, H, 22); ctx.clip();
    const load = prog(t, 4.15, 4.5);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 58, W, H - 58); ctx.clip();
    ctx.globalAlpha = load;
    const pf = pageF(t);
    PAGES.forEach((pg, i) => { const ox = (i - pf) * W; if (Math.abs(ox) >= W) return; ctx.save(); ctx.translate(ox, 0); pg(t); ctx.restore(); });
    ctx.globalAlpha = 1;
    ctx.restore();
    // 上方工具列：三個圓點、網址列（地球＋Wi-Fi 圖示，無文字）
    ctx.fillStyle = '#3d2d84'; ctx.fillRect(0, 0, W, 58);
    [[28, C.gold], [52, '#5ee0c8'], [76, '#c9b8ff']].forEach(([x, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, 29, 7, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#f1ecff'; rr(104, 13, 500, 32, 16); ctx.fill();
    globeIcon(128, 29, 10, '#2fa59a', t * 1.8 * (1 - load) + 0.6);
    wifiIcon(156, 37, 18, '#2fa59a');
    ctx.fillStyle = LINE; rr(180, 24, 200 + 60 * Math.min(1, pf), 10, 5); ctx.fill();
    // 載入條
    if (load < 1) { ctx.fillStyle = C.gold; ctx.fillRect(0, 56, W * prog(t, 3.9, 4.5), 4); }
    TAPS.forEach((s, i) => { if (i === 0 || i === 1 || i === 3) { const k = prog(t, s + 0.1, s + 0.55); if (k > 0 && k < 1) { ctx.fillStyle = C.gold; ctx.fillRect(0, 56, W * k, 4); } } });
    ctx.restore();
    // 點選漣漪＋游標
    if (load > 0) {
      TAPS.forEach(s => {
        const k = (t - s) / 0.4; if (k < 0 || k > 1) return;
        const cu = cursor(s);
        ctx.strokeStyle = `rgba(255,211,107,${0.9 * (1 - k)})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(cu.x, cu.y, 10 + 34 * k, 0, 7); ctx.stroke();
      });
      const cu = cursor(t), press = 1 - 0.18 * tapLift(t);
      ctx.save(); ctx.translate(cu.x, cu.y); ctx.scale(1.35 * press, 1.35 * press); ctx.globalAlpha = load;
      const arrow = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(17, 29); ctx.lineTo(12, 18); ctx.lineTo(21, 18); ctx.closePath(); };
      ctx.fillStyle = '#ffffff'; ctx.save(); ctx.scale(1.18, 1.18); ctx.translate(-1.5, -2); arrow(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#2b1a63'; arrow(); ctx.fill();
      ctx.restore();
    }
  }

  // ---------- 從螢幕飄出來的小圖示 ----------
  const ICONS = [
    { t: 4.55, type: 'globe', to: { x: 330, y: 330 } },
    { t: 5.0, type: 'wifi', to: { x: 510, y: 205 } },
    { t: 5.8, type: 'pin', to: { x: 225, y: 480 } },
    { t: 7.1, type: 'play', to: { x: 690, y: 195 } },
    { t: 8.25, type: 'pic', to: { x: 370, y: 180 } },
    { t: 9.15, type: 'heart', to: { x: 560, y: 350 } },
  ];
  function glyph(type, t) {
    const L = '#f1ecff';
    if (type === 'globe') globeIcon(0, 0, 17, '#5ee0c8', t * 1.5);
    else if (type === 'wifi') wifiIcon(0, 12, 24, C.gold);
    else if (type === 'pin') { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(0, -6, 12, Math.PI * 0.82, Math.PI * 2.18); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#3d2d84'; ctx.beginPath(); ctx.arc(0, -6, 4.5, 0, 7); ctx.fill(); }
    else if (type === 'play') { ctx.fillStyle = L; ctx.beginPath(); ctx.moveTo(-8, -13); ctx.lineTo(14, 0); ctx.lineTo(-8, 13); ctx.closePath(); ctx.fill(); }
    else if (type === 'pic') { ctx.fillStyle = L; rr(-17, -13, 34, 26, 5); ctx.fill(); ctx.fillStyle = '#2fa59a'; ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-4, -2); ctx.lineTo(4, 6); ctx.lineTo(8, 2); ctx.lineTo(14, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(8, -5, 3.5, 0, 7); ctx.fill(); }
    else if (type === 'heart') { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(0, 13); ctx.bezierCurveTo(-26, -5, -14, -24, 0, -10); ctx.bezierCurveTo(14, -24, 26, -5, 0, 13); ctx.closePath(); ctx.fill(); }
  }
  function floatIcons(t, from) {
    ICONS.forEach((ic, i) => {
      if (t < ic.t) return;
      const k = prog(t, ic.t, ic.t + 1.1, E.inOut);
      const c1 = { x: from.x - 10, y: Math.min(from.y, ic.to.y) - 230 };
      const bx = (1 - k) * (1 - k) * from.x + 2 * k * (1 - k) * c1.x + k * k * ic.to.x;
      const by = (1 - k) * (1 - k) * from.y + 2 * k * (1 - k) * c1.y + k * k * ic.to.y + 7 * Math.sin(t * 1.8 + i * 1.3) * k;
      const sc = lerp(0.25, 1, prog(t, ic.t, ic.t + 0.45, E.back));
      glow(bx, by, 62 * sc, 'rgba(120,220,255,0.28)');
      ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc);
      ctx.fillStyle = '#3d2d84'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(143,227,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); ctx.stroke();
      glyph(ic.type, t);
      ctx.restore();
    });
  }

  function draw(c, t) {
    const cm = cam(t);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.save();
    ctx.translate(cm.sx, cm.sy); ctx.scale(cm.z, cm.z); ctx.translate(-cm.fx, -cm.fy);
    room(t);
    chair(t); desk(); router(t);
    const scr = laptop(t);
    person(t);
    screenLight(t, scr);
    ctx.restore();
    // 螢幕座標：光束＋放大的瀏覽器視窗
    const a = toScreen(cm, scr.s0), b = toScreen(cm, scr.s1), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const pop = prog(t, 3.65, 4.15, E.back), popA = prog(t, 3.65, 3.9);
    if (pop > 0) {
      const w = lerp(40, PANEL.w, pop), h = lerp(26, PANEL.h, pop);
      const x = lerp(mid.x, PANEL.x, pop), y = lerp(mid.y - 13, PANEL.y, pop);
      ctx.save(); ctx.globalAlpha = popA;
      ctx.fillStyle = 'rgba(143,227,255,0.10)';
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x + 20, y + 10); ctx.lineTo(x + 20, y + h - 10); ctx.lineTo(a.x, a.y); ctx.closePath(); ctx.fill();
      ctx.restore();
      glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.75, `rgba(120,220,255,${0.22 * popA})`);
      ctx.save(); ctx.globalAlpha = popA; ctx.translate(x, y); ctx.scale(w / PANEL.w, h / PANEL.h);
      browserPanel(t);
      ctx.restore();
    }
    floatIcons(t, mid);
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'surf', verb: true }, { w: 'the' }, { w: 'Internet' }], draw };
})();
