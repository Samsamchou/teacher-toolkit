// 第 8 段 play online games：晚上的電競角落（紫／青 RGB 燈）。
// 站在電競椅前 → 坐下、把椅子往前推 → 拿起耳機戴上、把麥克風拉到嘴邊 → 雙手拿起手把
// → 按手把中間的開機鍵 → 螢幕亮起，連線大廳：Wi-Fi 訊號＋隊友頭像一個個上線
// → 太空射擊遊戲：自己的飛船閃避隕石、和兩位隊友一起打紅色敵艦（按鍵＝雷射）
// → 擊落敵艦，螢幕跳出獎盃與星星 → 雙手把手把高舉歡呼 → 放下，看著勝利畫面
SEGMENTS.games = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, joints, STAND, mix } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 820;
  const HY = 733;                 // 坐姿髖部高度（椅墊頂 745）
  const SEAT_TOP = 745;
  const DESK = { L: 790, R: 1890, top: 668 };
  const MON = { x: 1128, y: 316, w: 504, h: 286 };          // 螢幕外框
  const SC = { x: MON.x + 12, y: MON.y + 12, w: 480, h: 262 }; // 螢幕顯示區
  const HS_DESK = { x: 884, y: DESK.top - 30 };             // 耳機放在桌上（頭帶圓心）
  const CT_DESK = { x: 842, y: DESK.top - 9 };
  const GPS = 0.85;                                          // 手把大小              // 手把放在桌上
  const HOME_T = 3.7, ON_T = 3.78;
  const SHOTS = [5.35, 5.55, 7.38, 7.62, 7.86, 8.1];        // 自己按鍵發射
  const MATE_SHOTS = [[7.5, 0], [7.74, 1], [7.98, 0], [8.2, 1]];
  const BOOM_T = 8.35, WIN_T = 8.62;
  const GREEN = '#5ee0a0';

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixC = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
  const power = t => prog(t, ON_T, ON_T + 0.35);
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // RGB 燈色：青 → 紫 → 粉紫 循環（不用紅色）
  function rgb(t, ph = 0) {
    const cols = ['#3fd6c6', '#8f6bff', '#d36bff', '#3fd6c6'];
    const u = ((t * 0.35 + ph) % 1 + 1) % 1 * 3, i = Math.floor(u);
    return mixC(cols[i], cols[i + 1], u - i);
  }

  // ---------- 房間 ----------
  const R = rng(23);
  const winStars = Array.from({ length: 26 }, () => ({ x: 125 + R() * 290, y: 185 + R() * 160, r: 0.8 + R() * 1.6, p: R() * 6 }));
  const city = Array.from({ length: 11 }, (_, i) => ({ x: 118 + i * 28 + R() * 6, w: 22 + R() * 10, h: 50 + R() * 110 }));
  function room(t) {
    const pw = power(t);
    const g = ctx.createLinearGradient(0, 0, 0, 700);
    g.addColorStop(0, '#120d36'); g.addColorStop(1, '#22175a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 700);
    // 窗戶：夜晚城市＋月亮
    ctx.fillStyle = '#2e2266'; rr(98, 158, 344, 384, 10); ctx.fill();
    ctx.save(); rr(112, 172, 316, 356, 6); ctx.clip();
    const sg = ctx.createLinearGradient(0, 172, 0, 528); sg.addColorStop(0, '#0d0930'); sg.addColorStop(1, '#3a1f6e');
    ctx.fillStyle = sg; ctx.fillRect(112, 172, 316, 356);
    ctx.fillStyle = C.light;
    winStars.forEach(s => { ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    glow(352, 236, 80, 'rgba(255,244,214,0.35)');
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(352, 236, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#0f0b33'; ctx.beginPath(); ctx.arc(366, 228, 23, 0, 7); ctx.fill();
    city.forEach((b, i) => {
      ctx.fillStyle = i % 2 ? '#1a1347' : '#221a58'; ctx.fillRect(b.x, 528 - b.h, b.w, b.h);
      ctx.fillStyle = 'rgba(255,211,107,0.55)';
      for (let yy = 528 - b.h + 10; yy < 520; yy += 16) for (let xx = b.x + 5; xx < b.x + b.w - 5; xx += 9) if (((xx * 7 + yy * 3) | 0) % 5 === 0) ctx.fillRect(xx, yy, 4, 6);
    });
    ctx.restore();
    ctx.fillStyle = '#2e2266'; ctx.fillRect(266, 172, 8, 356); ctx.fillRect(112, 346, 316, 8);
    ctx.fillStyle = '#3d2f7e'; rr(88, 536, 364, 16, 5); ctx.fill(); // 窗台
    // 牆上的六角形燈板（開機後跟著 RGB 變色）
    const HEX = [[560, 360], [612, 390], [560, 420], [664, 360], [612, 330]];
    HEX.forEach(([x, y], i) => {
      const col = pw > 0 ? rgb(t, i * 0.12) : '#2b2166';
      if (pw > 0) glow(x, y, 70, col, 0.35 * pw);
      ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = mixC('#2b2166', '#2b2166', 0);
      hexagon(x, y, 27); ctx.fill();
      ctx.globalAlpha = 0.85 * pw; ctx.fillStyle = col; hexagon(x, y, 22); ctx.fill(); ctx.restore();
    });
    // 牆板：右上層架（路由器＋盆栽＋小公仔）
    ctx.fillStyle = '#3d2f7e'; rr(1660, 352, 230, 14, 4); ctx.fill();
    ctx.fillStyle = '#2b2166'; ctx.fillRect(1680, 366, 10, 22); ctx.fillRect(1860, 366, 10, 22);
    router(t, 1735, 352);
    plant(1840, 352);
    // LED 燈條（桌子後面）＋牆面洗光
    const lc = pw > 0 ? rgb(t, 0.3) : '#4a3a8a';
    glow(1380, 650, 520, lc, 0.10 + 0.22 * pw);
    ctx.fillStyle = lc; ctx.globalAlpha = 0.5 + 0.5 * pw; ctx.fillRect(1000, 652, 880, 5); ctx.globalAlpha = 1;
    // 地板
    const fg = ctx.createLinearGradient(0, 700, 0, 905);
    fg.addColorStop(0, '#231a52'); fg.addColorStop(1, '#16103c');
    ctx.fillStyle = fg; ctx.fillRect(0, 700, 1920, 205);
    ctx.fillStyle = '#2f2468'; ctx.fillRect(0, 696, 1920, 8); // 踢腳板
    ctx.strokeStyle = 'rgba(201,184,255,0.06)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const y = 716 + i * i * 3 + i * 14; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1920, y); ctx.stroke(); }
    // 地毯
    ctx.fillStyle = '#2d1f63'; ctx.beginPath(); ctx.ellipse(760, 836, 330, 40, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(63,214,198,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(760, 836, 300, 32, 0, 0, 7); ctx.stroke();
  }
  function hexagon(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); }
  function wifiIcon(x, y, r, col, lit) { // lit：0–3 亮幾格
    ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, 7); ctx.fill();
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = col; ctx.globalAlpha = lit >= i ? 1 : 0.22; ctx.lineWidth = r * 0.16;
      ctx.beginPath(); ctx.arc(x, y, r * (0.15 + i * 0.28), -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke();
    }
    ctx.restore();
  }
  function router(t, x, y) {
    const pw = power(t);
    ctx.fillStyle = '#4b3b80'; ctx.save(); ctx.translate(x - 22, y); ctx.rotate(-0.25); ctx.fillRect(-3, -40, 6, 40); ctx.restore();
    ctx.save(); ctx.translate(x + 22, y); ctx.rotate(0.25); ctx.fillRect(-3, -40, 6, 40); ctx.restore();
    ctx.fillStyle = '#4b3b80'; rr(x - 40, y - 20, 80, 20, 6); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; rr(x - 40, y - 20, 80, 7, 4); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const on = i === 0 || (pw > 0 && (Math.sin(t * 9 + i * 2) > -0.2));
      ctx.fillStyle = on ? GREEN : '#2b2166'; ctx.beginPath(); ctx.arc(x - 24 + i * 12, y - 8, 3, 0, 7); ctx.fill();
    }
    if (pw > 0) { // Wi-Fi 訊號往外擴
      const lit = 1 + Math.floor(((t - ON_T) * 3) % 3);
      wifiIcon(x, y - 52, 46, `rgba(94,224,160,${0.85 * pw})`, lit);
    }
  }
  function plant(x, y) {
    ctx.fillStyle = '#d9a24a'; rr(x - 16, y - 30, 32, 30, 6); ctx.fill();
    ctx.fillStyle = '#2fa59a';
    [[-0.5, 34], [0, 42], [0.5, 34], [-0.95, 26], [0.95, 26]].forEach(([a, l]) => {
      ctx.save(); ctx.translate(x, y - 28); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -l / 2, 7, l / 2, 0, 0, 7); ctx.fill(); ctx.restore();
    });
  }

  // ---------- 桌子、電腦、螢幕 ----------
  function desk(t) {
    const pw = power(t);
    // 桌腳
    ctx.fillStyle = '#2b2166'; ctx.fillRect(915, DESK.top + 20, 18, 808 - DESK.top - 20); ctx.fillRect(1838, DESK.top + 20, 18, 808 - DESK.top - 20);
    ctx.fillStyle = '#251c5a'; ctx.fillRect(925, 760, 925, 10);
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(1380, 812, 520, 12, 0, 0, 7); ctx.fill();
    // 主機（玻璃側板＋三顆風扇）
    const T = { x: 1680, y: 446, w: 118, h: DESK.top - 446 };
    ctx.fillStyle = '#2b2166'; rr(T.x, T.y, T.w, T.h, 8); ctx.fill();
    ctx.fillStyle = '#17113f'; rr(T.x + 10, T.y + 12, T.w - 20, T.h - 24, 6); ctx.fill();
    [0, 1, 2].forEach(i => fan(T.x + T.w / 2, T.y + 46 + i * 64, 24, t, i));
    ctx.fillStyle = pw > 0 ? GREEN : '#3a2c66'; ctx.beginPath(); ctx.arc(T.x + T.w - 14, T.y + 10, 3.5, 0, 7); ctx.fill();
    // 螢幕腳架
    ctx.fillStyle = '#3a2c66'; ctx.fillRect(MON.x + MON.w / 2 - 12, MON.y + MON.h - 4, 24, DESK.top - MON.y - MON.h - 4);
    ctx.fillStyle = '#4b3b80'; rr(MON.x + MON.w / 2 - 70, DESK.top - 10, 140, 10, 5); ctx.fill();
    // 螢幕
    if (pw > 0) glow(SC.x + SC.w / 2, SC.y + SC.h / 2, 420, 'rgba(63,214,198,1)', 0.16 * pw);
    ctx.fillStyle = '#2b2166'; rr(MON.x, MON.y, MON.w, MON.h, 12); ctx.fill();
    ctx.fillStyle = '#4b3b80'; rr(MON.x, MON.y + MON.h - 10, MON.w, 10, 5); ctx.fill();
    ctx.fillStyle = pw > 0 ? rgb(t, 0.6) : '#3a2c66'; ctx.fillRect(MON.x + MON.w / 2 - 14, MON.y + MON.h - 6, 28, 3);
    screen(t);
    // 桌面
    ctx.fillStyle = '#4b3b80'; rr(DESK.L, DESK.top, DESK.R - DESK.L, 22, 5); ctx.fill();
    ctx.fillStyle = '#6b5b95'; ctx.fillRect(DESK.L + 4, DESK.top, DESK.R - DESK.L - 8, 4);
    ctx.fillStyle = mixC('#3a2c66', '#3fd6c6', 0.25 * pw); ctx.fillRect(DESK.L + 4, DESK.top + 18, DESK.R - DESK.L - 8, 3);
    // 鍵盤（RGB 鍵帽）＋滑鼠墊＋馬克杯
    ctx.fillStyle = '#2b2166'; rr(1200, DESK.top - 4, 330, 6, 3); ctx.fill();
    ctx.fillStyle = '#3a2c66'; rr(1230, DESK.top - 14, 230, 12, 4); ctx.fill();
    for (let i = 0; i < 12; i++) { ctx.fillStyle = pw > 0 ? rgb(t, i * 0.06) : '#4b3b80'; ctx.globalAlpha = 0.4 + 0.6 * pw; ctx.fillRect(1238 + i * 18.5, DESK.top - 18, 13, 5); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2fa59a'; rr(1012, DESK.top - 40, 34, 40, 6); ctx.fill();
    ctx.strokeStyle = '#2fa59a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(1048, DESK.top - 22, 10, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = '#23857c'; ctx.fillRect(1012, DESK.top - 40, 34, 6);
  }
  function fan(x, y, r, t, i) {
    const pw = power(t), col = pw > 0 ? rgb(t, i * 0.2) : '#3a2c66';
    if (pw > 0) glow(x, y, r * 2.2, col, 0.45 * pw);
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    // 風扇轉速：開機後慢慢加速
    const ang = t < ON_T ? 0 : (t - ON_T) * 9 * Math.min(1, (t - ON_T) / 0.8) + i;
    ctx.fillStyle = '#4b3b80';
    for (let b = 0; b < 5; b++) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang + b * Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(r * 0.48, 0, r * 0.42, r * 0.16, 0.5, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#2b2166'; ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, 7); ctx.fill();
  }

  // ---------- 螢幕內容（以螢幕左上角為原點） ----------
  const SR = rng(41);
  const sStars = Array.from({ length: 46 }, () => ({ x: SR() * 480, y: 40 + SR() * 222, r: 0.7 + SR() * 1.4, v: 40 + SR() * 90 }));
  const AV = [ // 自己、三位隊友
    { col: '#f1ecff', ring: C.gold }, { col: '#3fd6c6', ring: '#3fd6c6' }, { col: '#ffd36b', ring: '#ffd36b' }, { col: '#b9a6ff', ring: '#b9a6ff' },
  ];
  const AV_IN = [4.0, 4.22, 4.44, 4.66];
  const SHIP_Y = [[5.0, 150], [5.75, 150], [5.98, 84], [6.42, 84], [6.66, 196], [6.95, 196], [7.2, 150], [99, 150]];
  const shipY = t => FT.keyed(SHIP_Y.map(([a, b]) => [a, { y: b }]), t).y;
  const shipX = t => lerp(-40, 120, prog(t, 4.95, 5.35, E.out));
  const MATES = [{ x: 56, y: 72, ph: 0 }, { x: 50, y: 222, ph: 2 }];
  const mateX = (m, t) => lerp(-60, m.x, prog(t, 5.05, 5.45, E.out)) + 6 * Math.sin(t * 2.3 + m.ph);
  const mateY = (m, t) => m.y + 8 * Math.sin(t * 2.9 + m.ph);
  const ROCKS = [{ y: 156, t0: 5.0, v: 330, r: 30 }, { y: 84, t0: 5.62, v: 330, r: 25 }, { y: 244, t0: 6.1, v: 260, r: 15 }];
  const enemyX = t => lerp(560, 390, prog(t, 6.85, 7.3, E.out));
  const enemyY = t => 150 + 22 * Math.sin((t - 6.85) * 2.6);
  function avatar(x, y, r, a, k, bounce = 0) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y - bounce); ctx.scale(k, k);
    ctx.fillStyle = '#1b1650'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = a.ring; ctx.lineWidth = r * 0.12; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, 7); ctx.clip();
    ctx.fillStyle = a.col; ctx.beginPath(); ctx.arc(0, -r * 0.18, r * 0.36, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, r * 0.78, r * 0.62, r * 0.5, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(r * 0.72, r * 0.72, r * 0.22, 0, 7); ctx.fill(); // 上線綠點
    ctx.strokeStyle = '#1b1650'; ctx.lineWidth = r * 0.07; ctx.stroke();
    ctx.restore();
  }
  function ship(x, y, col, sc = 1, flame = 1, t = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.fillStyle = C.gold;
    const fl = 14 + 6 * Math.sin(t * 40 + x);
    ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-14 - fl * flame, 0); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-10, -9); ctx.lineTo(-16, -18); ctx.lineTo(-18, -7); ctx.lineTo(-14, 0); ctx.lineTo(-18, 7); ctx.lineTo(-16, 18); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1650'; ctx.beginPath(); ctx.ellipse(4, 0, 7, 4, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function rock(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#7a68ad'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr2 = r * (0.82 + 0.18 * Math.sin(i * 2.7)); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.2, r * 0.26, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.3, r * 0.25, r * 0.17, 0, 7); ctx.fill();
    ctx.restore();
  }
  function enemy(x, y, t) {
    const hit = [...SHOTS, ...MATE_SHOTS.map(m => m[0])].some(s => s > 7.2 && t >= s + 0.27 && t < s + 0.37);
    ctx.save(); ctx.translate(x, y); ctx.scale(1.35, 1.35);
    glow(0, 0, 52, 'rgba(232,67,58,0.45)');
    ctx.fillStyle = hit ? '#fff4d6' : C.red;
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(4, -14); ctx.lineTo(22, -30); ctx.lineTo(16, -10); ctx.lineTo(26, 0); ctx.lineTo(16, 10); ctx.lineTo(22, 30); ctx.lineTo(4, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1650'; ctx.beginPath(); ctx.ellipse(-4, 0, 9, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(-4, 0, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  function laser(x0, y0, ts, t, col, stopX) {
    const x = x0 + 900 * (t - ts); if (t < ts || x - 26 > stopX) return;
    ctx.fillStyle = col; glow(Math.min(x, stopX), y0, 16, col, 0.6);
    rr(Math.min(x, stopX) - 26, y0 - 2.5, 26, 5, 2.5); ctx.fill();
  }
  function trophy(x, y, k, t) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    // 光芒
    ctx.save(); ctx.rotate(t * 0.6); ctx.fillStyle = 'rgba(255,211,107,0.18)';
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -130); ctx.lineTo(12, -130); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    glow(0, -6, 90, 'rgba(255,211,107,0.55)');
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.moveTo(-38, -52); ctx.lineTo(38, -52); ctx.quadraticCurveTo(38, 8, 0, 14); ctx.quadraticCurveTo(-38, 8, -38, -52); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = C.gold;
    ctx.beginPath(); ctx.arc(-40, -30, 16, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(40, -30, 16, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillRect(-7, 12, 14, 22); rr(-30, 32, 60, 14, 4); ctx.fill();
    ctx.fillStyle = '#e8b04a'; ctx.beginPath(); ctx.moveTo(10, -52); ctx.lineTo(30, -52); ctx.quadraticCurveTo(28, -2, 4, 10); ctx.quadraticCurveTo(22, -12, 10, -52); ctx.fill();
    star(0, -24, 13, '#fff4d6');
    ctx.restore();
  }
  function starAt(x, y, r) { star(x, y, r, C.gold); }
  function star(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
  }
  function screen(t) {
    ctx.save(); ctx.translate(SC.x, SC.y);
    ctx.beginPath(); ctx.rect(0, 0, SC.w, SC.h); ctx.clip();
    const pw = power(t);
    ctx.fillStyle = mixC('#0c0a22', '#0d1238', pw); ctx.fillRect(0, 0, SC.w, SC.h);
    if (pw <= 0) { // 關機：只有玻璃反光
      ctx.fillStyle = 'rgba(201,184,255,0.06)';
      ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(170, 0); ctx.lineTo(60, SC.h); ctx.lineTo(-50, SC.h); ctx.closePath(); ctx.fill();
      ctx.restore(); return;
    }
    // 星空捲動
    ctx.fillStyle = C.light;
    const run = t >= 4.95 && t < WIN_T + 0.3 ? 1 : 0.25;
    sStars.forEach(s => { const x = ((s.x - s.v * (t - ON_T) * (t > 4.95 ? 1 : 0.25)) % 480 + 480) % 480; ctx.globalAlpha = 0.35 + 0.5 * run * 0.6; ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 大廳 → 遊戲：頭像從中間移到上方列
    const toBar = prog(t, 4.88, 5.15);
    AV.forEach((a, i) => {
      const k = prog(t, AV_IN[i], AV_IN[i] + 0.22, E.back);
      const bx = lerp(105 + i * 90, 262 + i * 38, toBar), by = lerp(140, 26, toBar), r = lerp(34, 16, toBar);
      const bounce = t > WIN_T + 0.1 ? Math.abs(Math.sin((t - WIN_T) * 6 + i * 0.9)) * 5 * (1 - prog(t, 11, 12)) : 0;
      avatar(bx, by, r, a, k, bounce);
    });
    // Wi-Fi 圖示（右上角）
    wifiIcon(SC.w - 30, 38, 30, '#ffffff', t < 4.0 ? 1 + Math.floor((t - ON_T) * 10) % 3 : 3);
    if (t < 4.95) { // 大廳：「準備」三角播放鍵在頭像下方
      const k = prog(t, 4.75, 4.9, E.back) * (1 - prog(t, 4.88, 5.0));
      if (k > 0) { ctx.fillStyle = GREEN; ctx.save(); ctx.translate(240, 216); ctx.scale(k, k); ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(16, 0); ctx.lineTo(-12, 14); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    // 遊戲中
    if (t >= 4.95) {
      const fade = 1 - prog(t, WIN_T, WIN_T + 0.3);
      ctx.save(); ctx.globalAlpha = fade;
      ROCKS.forEach((r, i) => { if (t < r.t0) return; const x = 520 - r.v * (t - r.t0); if (x > -40) rock(x, r.y, r.r, (t - r.t0) * (1.5 + i)); });
      const ex = enemyX(t), ey = enemyY(t), alive = t >= 6.85 && t < BOOM_T;
      SHOTS.forEach(s => laser(shipX(s) + 22, shipY(s), s, t, C.gold, alive || t < BOOM_T ? (s > 7 ? ex - 18 : 600) : 600));
      MATE_SHOTS.forEach(([s, m]) => laser(mateX(MATES[m], s) + 22, mateY(MATES[m], s), s, t, m ? '#ffd36b' : '#3fd6c6', ex - 18));
      if (alive) enemy(ex, ey, t);
      MATES.forEach((m, i) => ship(mateX(m, t), mateY(m, t), i ? '#ffd36b' : '#3fd6c6', 1.15, 1, t));
      ship(shipX(t), shipY(t), '#f1ecff', 1.55, 1, t);
      ctx.restore();
      // 敵艦爆炸
      const bk = (t - BOOM_T) / 0.5;
      if (bk >= 0 && bk < 1) {
        const x = enemyX(BOOM_T), y = enemyY(BOOM_T);
        glow(x, y, 90 * (0.4 + bk), `rgba(255,211,107,${1 - bk})`);
        ctx.strokeStyle = `rgba(255,244,214,${1 - bk})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 12 + 60 * bk, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3; ctx.fillStyle = i % 2 ? C.red : C.gold; ctx.globalAlpha = 1 - bk; ctx.fillRect(x + Math.cos(a) * 70 * bk - 4, y + Math.sin(a) * 70 * bk - 4, 8, 8); }
        ctx.globalAlpha = 1;
      }
    }
    // 勝利：獎盃＋星星
    if (t >= WIN_T) {
      const k = prog(t, WIN_T, WIN_T + 0.45, E.back);
      trophy(240, 150, k * (1 + 0.03 * Math.sin(t * 4)), t);
      const P = rng(9);
      for (let i = 0; i < 14; i++) {
        const a = P() * Math.PI * 2, d = 90 + P() * 110, ph = P() * 6;
        const kk = prog(t, WIN_T + 0.1 + i * 0.03, WIN_T + 0.6 + i * 0.03, E.out);
        if (kk <= 0) continue;
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 5 + ph);
        star(240 + Math.cos(a) * d * kk, 150 + Math.sin(a) * d * 0.62 * kk, 6 + (i % 3) * 3, i % 4 ? C.gold : '#fff4d6');
      }
      ctx.globalAlpha = 1;
    }
    // 開機白光
    const fl = prog(t, ON_T, ON_T + 0.06) * (1 - prog(t, ON_T + 0.08, ON_T + 0.4));
    if (fl > 0) { ctx.fillStyle = `rgba(230,250,255,${0.85 * fl})`; ctx.fillRect(0, 0, SC.w, SC.h); }
    ctx.restore();
  }

  // ---------- 電競椅（cx = 坐的人的髖部 x） ----------
  function chair(cx, squash) {
    const st = SEAT_TOP + squash;
    ctx.fillStyle = 'rgba(8,5,30,0.4)'; ctx.beginPath(); ctx.ellipse(cx + 6, 822, 100, 11, 0, 0, 7); ctx.fill();
    // 五爪腳＋輪子
    ctx.fillStyle = '#2b2166'; rr(cx - 82, 796, 176, 12, 6); ctx.fill();
    ctx.fillStyle = '#4b3b80'; [cx - 76, cx + 6, cx + 88].forEach(x => { ctx.beginPath(); ctx.arc(x, 814, 8, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#3a2c66'; ctx.fillRect(cx - 2, st + 26, 16, 800 - st - 26);
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(cx - 5, st + 40, 22, 18);
    // 椅背（往後微仰）＋青色條紋＋頭枕
    ctx.save(); ctx.translate(cx - 44, st + 8); ctx.rotate(-0.12);
    ctx.fillStyle = '#3a2c66'; rr(-30, -238, 52, 248, 22); ctx.fill();
    ctx.fillStyle = '#2fa59a'; rr(-6, -222, 10, 210, 5); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; rr(-24, -228, 40, 34, 14); ctx.fill();
    ctx.fillStyle = '#4b3b80'; rr(-26, -110, 44, 40, 14); ctx.fill(); // 腰枕
    ctx.restore();
    // 扶手（遠側）
    ctx.fillStyle = '#2b2166'; ctx.fillRect(cx + 4, st - 44, 10, 46);
    ctx.fillStyle = '#4b3b80'; rr(cx - 34, st - 54, 80, 12, 6); ctx.fill();
    // 椅墊
    ctx.fillStyle = '#3a2c66'; rr(cx - 54, st, 122, 28, 12); ctx.fill();
    ctx.fillStyle = '#2fa59a'; ctx.fillRect(cx - 40, st + 2, 94, 5);
  }

  // ---------- 道具：耳機、手把 ----------
  function headsetProp(x, y, s, rot, side = 0) { // (x,y) 是頭帶圓心；side 0 = 正面看，1 = 側面看（戴上時）
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = '#6b5b95'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
    const br = lerp(22, 25, side), sp = lerp(21, 2, side);
    ctx.beginPath(); ctx.arc(0, 0, br * s, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    if (side < 0.9) cup(-sp * s, 4 * s, s, 0.82); cup(sp * s, 4 * s, s, 1);
    ctx.restore();
  }
  function cup(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#2fa59a'; rr(x - 7 * s, y - 10 * s, 14 * s, 20 * s, 6 * s); ctx.fill();
    ctx.fillStyle = '#3fd6c6'; rr(x - 2 * s, y - 6 * s, 4 * s, 12 * s, 2 * s); ctx.fill();
    ctx.restore();
  }
  const BOOM_UP = -1.25, BOOM_DOWN = 0.42; // 麥克風桿角度（弧度，0 = 朝右）
  function wornHeadset(J, s, boom, t) {
    const hx = J.head.x, hy = J.head.y;
    ctx.strokeStyle = '#6b5b95'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx - 2 * s, hy - 1 * s, 25 * s, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.fillStyle = '#2fa59a'; rr(hx - 12 * s, hy - 11 * s, 18 * s, 24 * s, 7 * s); ctx.fill();
    ctx.fillStyle = power(t) > 0 ? rgb(t, 0.1) : '#23857c'; rr(hx - 6 * s, hy - 6 * s, 6 * s, 14 * s, 3 * s); ctx.fill();
    // 麥克風桿：從耳罩轉到嘴邊
    const px = hx - 3 * s, py = hy + 6 * s, L = 27 * s;
    const ex = px + Math.cos(boom) * L, ey = py + Math.sin(boom) * L;
    ctx.strokeStyle = '#6b5b95'; ctx.lineWidth = 3.4 * s;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + Math.cos(boom - 0.35) * L * 0.6, py + Math.sin(boom - 0.35) * L * 0.6, ex, ey); ctx.stroke();
    ctx.fillStyle = '#4b3b80'; ctx.beginPath(); ctx.arc(ex, ey, 4.4 * s, 0, 7); ctx.fill();
    if (boom > 0.2 && power(t) > 0) { glow(ex, ey, 9 * s, 'rgba(94,224,160,0.8)'); }
    return { x: ex, y: ey };
  }
  // 手把：正面造型（兩個握把、十字鍵、四顆按鍵、中間開機鍵）。c = 中心，rot 傾斜，press 按下的程度
  function gamepad(c, rot, press, home, t, hands) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(rot); ctx.scale(GPS, GPS);
    ctx.fillStyle = '#4b3b80';
    ctx.beginPath(); ctx.moveTo(-30, -16); ctx.lineTo(30, -16);
    ctx.quadraticCurveTo(48, -16, 52, 6); ctx.quadraticCurveTo(56, 28, 44, 30); ctx.quadraticCurveTo(34, 31, 26, 14);
    ctx.lineTo(-26, 14); ctx.quadraticCurveTo(-34, 31, -44, 30); ctx.quadraticCurveTo(-56, 28, -52, 6); ctx.quadraticCurveTo(-48, -16, -30, -16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; rr(-36, -16, 72, 6, 3); ctx.fill();
    // 十字鍵
    ctx.fillStyle = '#2b2166'; ctx.fillRect(-38, -5, 18, 6); ctx.fillRect(-32, -11, 6, 18);
    // 四顆按鍵（按下時金色亮）
    [[30, -8], [38, -2], [22, -2], [30, 4]].forEach(([x, y], i) => {
      ctx.fillStyle = i === 1 && press > 0 ? mixC('#3fd6c6', '#ffd36b', press) : ['#3fd6c6', '#b9a6ff', '#ffd36b', '#2fa59a'][i];
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
    });
    if (press > 0) glow(38, -2, 16, 'rgba(255,211,107,0.9)', press);
    // 搖桿
    ctx.fillStyle = '#2b2166'; ctx.beginPath(); ctx.arc(-12, 7, 6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(12, 7, 6, 0, 7); ctx.fill();
    // 開機鍵
    const hc = home > 0 ? mixC('#5b4a8a', '#3fd6c6', home) : '#5b4a8a';
    if (home > 0.05) glow(0, -6, 18, 'rgba(63,214,198,0.9)', home);
    ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -6, 4.5, 0, 7); ctx.fill();
    if (hands) { // 拇指壓在手把上（遠手左、近手右）
      ctx.fillStyle = C.heroFar; ctx.beginPath(); ctx.arc(-44, 18, 10, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-28, -2, 9, 5, -0.5, 0, 7); ctx.fill();
      ctx.fillStyle = C.hero; ctx.beginPath(); ctx.arc(44, 18, 11, 0, 7); ctx.fill();
      const tp = hands.thumb; // 拇指位置（按鍵或開機鍵）
      ctx.beginPath(); ctx.ellipse(tp.x, tp.y + 2.5 * press + 2.5 * hands.homePress, 9, 5, -0.6, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // 手把在世界座標中，左右握把位置
  function grips(c, rot) {
    const r = (x, y) => ({ x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) });
    return { near: r(44 * GPS, 18 * GPS), far: r(-44 * GPS, 18 * GPS) };
  }

  // ---------- 人物時間軸 ----------
  const SITP = (x) => ({ x, y: HY, tor: 6, face: 1, l1: 86, k1: 4, l2: 82, k2: 8, a1: 30, e1: 70, a2: 25, e2: 60, hd: 0 });
  const LAP = (p) => ({ n: { x: p.x + 62, y: p.y - 12 }, f: { x: p.x + 50, y: p.y - 16 } });
  const hold = (hx, t) => ({ x: hx + 82, y: 640 });
  function withH(p, n, f) { return { ...p, h1x: n.x, h1y: n.y, b1: -1, h2x: f.x, h2y: f.y, b2: -1 }; }
  function headOf(p) { return joints(p, S).head; }
  const pressAmt = t => { let m = 0; SHOTS.forEach(s => { m = Math.max(m, prog(t, s - 0.06, s, E.out) * (1 - prog(t, s + 0.04, s + 0.14))); }); return m; };

  function person(t) {
    let p, hs = 'desk', hsPos = null, hsRot = 0, boom = BOOM_UP, ct = 'desk', ctPos = { ...CT_DESK }, ctRot = 0, thumbs = false;
    let homePress = 0, squash = 0, hsSide = 0;
    const hx = lerp(700, 730, prog(t, 1.08, 1.35));
    if (t < 0.45) { // 站在椅子前
      p = { ...STAND(700, G), hd: -4 };
    } else if (t < 1.08) { // 坐下（屁股落在椅墊上）
      const k = prog(t, 0.45, 1.0);
      p = mix(STAND(700, G), SITP(700), k);
      squash = 4 * prog(t, 0.92, 1.0) * (1 - prog(t, 1.0, 1.15));
    } else if (t < 1.35) { // 雙腳一撐，椅子往桌子滑
      p = { ...SITP(hx), l1: 86 - 6 * Math.sin(Math.PI * prog(t, 1.08, 1.35)), k1: 4 - 10 * Math.sin(Math.PI * prog(t, 1.08, 1.35)) };
    } else if (t < 1.62) { // 身體前傾，雙手拿耳機
      const k = prog(t, 1.35, 1.62);
      const base = { ...SITP(hx), tor: lerp(6, 38, k) };
      const lap = LAP(base);
      p = withH(base, { x: lerp(lap.n.x, HS_DESK.x + 22, k), y: lerp(lap.n.y, HS_DESK.y + 2, k) }, { x: lerp(lap.f.x, HS_DESK.x - 22, k), y: lerp(lap.f.y, HS_DESK.y + 2, k) });
    } else if (t < 2.18) { // 拿起來、坐正、戴到頭上
      const k = clamp((t - 1.62) / (2.18 - 1.62), 0, 1);
      const base = { ...SITP(hx), tor: lerp(38, 6, E.inOut(Math.min(1, k * 1.6))), hd: 0 };
      const head = headOf(base);
      const tgt = { x: head.x - 2 * S, y: head.y - 1 * S };
      // 先舉到頭的前上方，再從上面套到頭上（手不經過臉前）
      const mid = { x: head.x + 22 * S, y: head.y - 52 * S };
      const k1 = E.inOut(clamp(k / 0.5, 0, 1)), k2 = E.inOut(clamp((k - 0.5) / 0.5, 0, 1));
      hsPos = k < 0.5 ? { x: lerp(HS_DESK.x, mid.x, k1), y: lerp(HS_DESK.y, mid.y, k1) } : { x: lerp(mid.x, tgt.x, k2), y: lerp(mid.y, tgt.y, k2) };
      hsRot = 0; hs = 'hand'; hsSide = prog(k, 0.45, 0.9);
      const hk = prog(k, 0.5, 1); // 舉到頭邊時，近手移到耳罩（頭的後半），不擋臉
      p = withH(base, { x: hsPos.x + lerp(20, -4, hk) * S, y: hsPos.y + lerp(2, 4, hk) * S }, { x: hsPos.x - 10 * S, y: hsPos.y - 18 * S });
    } else if (t < 2.75) { // 戴好；近手把麥克風桿往下拉到嘴邊
      hs = 'worn';
      const base = { ...SITP(hx), tor: 6 };
      const head = headOf(base);
      const kb = prog(t, 2.32, 2.62);
      boom = lerp(BOOM_UP, BOOM_DOWN, kb);
      const px = head.x - 3 * S, py = head.y + 6 * S, L = 27 * S;
      const tip = { x: px + Math.cos(boom) * L, y: py + Math.sin(boom) * L };
      const lap = LAP(base);
      // 近手放回腿上；遠手（在頭後面那一側）去拉麥克風桿，不會擋到臉
      const kn = prog(t, 2.18, 2.42);
      const near = { x: lerp(head.x - 4 * S, lap.n.x, kn), y: lerp(head.y + 4 * S, lap.n.y, kn) };
      const a = prog(t, 2.18, 2.32), rel = prog(t, 2.62, 2.75);
      const start = { x: head.x - 10 * S, y: head.y - 18 * S };
      let far = { x: lerp(start.x, tip.x, a), y: lerp(start.y, tip.y + 2 * S, a) };
      if (t >= 2.32) far = { x: tip.x, y: tip.y + 2 * S };
      far = { x: lerp(far.x, lap.f.x, rel), y: lerp(far.y, lap.f.y, rel) };
      p = withH(base, near, far);
    } else if (t < 3.08) { // 前傾，雙手去拿桌上的手把
      hs = 'worn'; boom = BOOM_DOWN;
      const k = prog(t, 2.75, 3.08);
      const base = { ...SITP(hx), tor: lerp(6, 24, k) };
      const lap = LAP(base), g = grips(CT_DESK, 0);
      p = withH(base, { x: lerp(lap.n.x, g.near.x, k), y: lerp(lap.n.y, g.near.y, k) }, { x: lerp(lap.f.x, g.far.x, k), y: lerp(lap.f.y, g.far.y, k) });
    } else { // 拿著手把
      hs = 'worn'; boom = BOOM_DOWN; ct = 'hand'; thumbs = true;
      const kUp = prog(t, 3.08, 3.45);
      let tor = lerp(24, 10, kUp), hd = 0;
      let c = { x: lerp(CT_DESK.x, hold(hx).x, kUp), y: lerp(CT_DESK.y, hold(hx).y, kUp) - 14 * Math.sin(Math.PI * kUp) };
      let rot = 0;
      homePress = prog(t, HOME_T - 0.12, HOME_T, E.out) * (1 - prog(t, HOME_T + 0.06, HOME_T + 0.2));
      if (t >= 4.85 && t < 8.75) { // 打遊戲：身體跟著飛船前傾／後仰，手把跟著傾斜
        const sy = shipY(t), vy = (shipY(t + 0.05) - shipY(t - 0.05)) / 0.1;
        const fight = prog(t, 7.1, 7.4) * (1 - prog(t, 8.4, 8.7));
        const inG = prog(t, 4.85, 5.1) * (1 - prog(t, 8.5, 8.75));
        tor = 8 + inG * (3 + 3 * fight + (sy - 150) * 0.025);
        rot = inG * clamp(vy * 0.0011, -0.22, 0.22);
        c = { x: c.x + inG * (3 + 4 * fight), y: c.y + inG * ((sy - 150) * 0.05) + 1.5 * Math.sin(t * 13) * fight };
        hd = inG * (2 + 2 * fight);
      }
      // 勝利：手把高舉過頭、身體往後靠，揮兩下，再放下
      const up = prog(t, 8.82, 9.22, E.back) * (1 - prog(t, 10.15, 10.7));
      const dip = prog(t, 8.62, 8.8) * (1 - prog(t, 8.8, 8.95));
      if (up > 0 || dip > 0) {
        const pump = prog(t, 9.25, 10.1) > 0 && t < 10.15 ? Math.abs(Math.sin((t - 9.25) * Math.PI / 0.42)) * 16 : 0;
        const baseSh = joints({ ...SITP(hx), tor: lerp(tor, -14, up) }, S).sh;
        const top = { x: baseSh.x + 84, y: baseSh.y - 84 + pump * 0.7 };
        c = { x: lerp(c.x, top.x, up), y: lerp(c.y + 10 * dip, top.y, up) };
        tor = lerp(tor, -14, up); hd = lerp(hd, -8, up);
        rot = lerp(rot, 0, up);
      }
      if (t > 10.7) { tor = 6; hd = 2 + 1.5 * Math.sin(t * 1.6); c.y += 1.2 * Math.sin(t * 1.6); }
      const base = { ...SITP(hx), tor, hd };
      const g = grips(c, rot);
      p = withH(base, g.near, g.far);
      ctPos = c; ctRot = rot;
    }
    p.gy = undefined;
    const press = pressAmt(t);
    // 拇指：開機時在中間開機鍵，打遊戲時在右邊按鍵
    const thumbPos = t < 4.4 ? { x: lerp(30, 4, prog(t, 3.45, 3.58)) , y: lerp(-4, -6, prog(t, 3.45, 3.58)) } : { x: 34, y: -6 };
    const J = figure(p, S, 'hero', {
      head: (J, col, s) => {
        if (hs === 'worn') wornHeadset(J, s, boom, t);
      },
      front: (J) => {
        if (hs === 'hand') headsetProp(hsPos.x, hsPos.y, S, hsRot, hsSide);
        if (ct === 'hand') gamepad(ctPos, ctRot, press, Math.max(homePress, prog(t, HOME_T, HOME_T + 0.1) * (1 - prog(t, 4.6, 5.0)) * 0.7), t, { thumb: thumbPos, homePress });
      },
    });
    // 歡呼時手把旁冒出小金星
    if (t > 8.95 && t < 10.6) {
      const P = rng(17);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * (0.1 + 0.8 * P()), d = 40 + P() * 50, t0 = 8.95 + i * 0.1;
        const kk = prog(t, t0, t0 + 0.5, E.out), fade = 1 - prog(t, t0 + 0.6, t0 + 1.0);
        if (kk <= 0 || fade <= 0) continue;
        ctx.globalAlpha = fade; starAt(ctPos.x + Math.cos(a) * d * kk, ctPos.y - 10 + Math.sin(a) * d * kk, 5 + (i % 3) * 2.5);
      }
      ctx.globalAlpha = 1;
    }
    return { J, hs, ct, hx, squash };
  }

  function draw(c, t) {
    const zoom = 1.24 + 0.05 * prog(t, 0, 10, E.inOut);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(960, 520); ctx.scale(zoom, zoom); ctx.translate(-1170, -560);
    room(t);
    desk(t);
    // 桌上的耳機、手把
    if (t < 1.62) headsetProp(HS_DESK.x, HS_DESK.y, S * 0.95, 0);
    if (t < 3.08) gamepad(CT_DESK, 0, 0, 0, t, null);
    const hx = lerp(700, 730, prog(t, 1.08, 1.35));
    const squash = 4 * prog(t, 0.92, 1.0) * (1 - prog(t, 1.0, 1.15));
    chair(hx, squash);
    person(t);
    // 螢幕光打在人身上（開機後）
    const pw = power(t);
    if (pw > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(980, 560, 300, 'rgba(63,214,198,1)', 0.07 * pw + (t >= BOOM_T && t < BOOM_T + 0.4 ? 0.08 * (1 - (t - BOOM_T) / 0.4) : 0));
      ctx.restore();
    }
    // 開機前房間比較暗
    const dark = 1 - pw;
    if (dark > 0) { ctx.fillStyle = `rgba(8,5,32,${0.22 * dark})`; ctx.fillRect(0, 0, 1920, 1080); }
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'play', verb: true }, { w: 'online' }, { w: 'games' }], draw };
})();
