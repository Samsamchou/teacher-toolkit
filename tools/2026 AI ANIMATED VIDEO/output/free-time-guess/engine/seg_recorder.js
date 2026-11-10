// 第 11 段 play the recorder：黃昏的房間一角（窗、立燈、小桌、譜架）。
// 走到小桌 → 掀開直笛盒 → 拿出直笛 → 走到譜架前 → 雙手把直笛舉到嘴邊（往前下方 45°，左手在上、右手在下）
// → 吸一口氣 → 吹奏：手指一按一放、音符從笛尾飄出來，身體跟著輕輕搖、腳打拍子
SEGMENTS.recorder = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, walk, STAND, mix, joints } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800;
  const WALL = 700;                       // 牆腳線
  const TABLE = { L: 540, R: 700, top: 600, foot: 735 };
  const CASE = { L: 548, R: 692, top: 572, bot: 600 };
  const STAND_X = 1070;                   // 譜架
  const P0 = 470, P1 = 760;               // 拿笛處、吹奏處
  const RL = 125, RR = 6.5, GRIP = 0.74;  // 直笛長度、半徑、右手握的位置
  const PLAY0 = 5.75, BEAT = 0.38;

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixC = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ---------- 旋律（Hot Cross Buns 加變化）：n = 由上往下按住幾個孔 ----------
  const TUNE = [1, 2, 3, null, 1, 2, 3, null, 3, 3, 3, 3, 2, 2, 2, 2, 1, 2, 3, null, 5, 4, 3, 2, 1, null];
  const NOTES = [];
  TUNE.forEach((n, i) => { if (n !== null) NOTES.push({ t: PLAY0 + i * BEAT, n, i }); });
  const LOOP = TUNE.length * BEAT;
  function noteAt(t) { // 現在按的指法
    if (t < PLAY0 - 0.25) return 3;
    const u = (t - PLAY0) % LOOP; let n = 1;
    for (let i = 0; i < TUNE.length; i++) { if (i * BEAT <= u && TUNE[i] !== null) n = TUNE[i]; }
    return n;
  }
  function onsets(t) { // 已經吹出來的音（含循環）
    const out = [];
    for (let k = 0; k < 3; k++) NOTES.forEach(nt => { const tt = nt.t + k * LOOP; if (tt <= t && t - tt < 2.8) out.push({ ...nt, t: tt, id: nt.i + k * TUNE.length }); });
    return out;
  }

  // ---------- 背景：房間 ----------
  const R = rng(23);
  const stars = Array.from({ length: 26 }, () => ({ x: 1170 + R() * 260, y: 300 + R() * 170, r: 0.8 + R() * 1.6, th: R() * 0.8, p: R() * 6 }));
  const roofs = [[1160, 520], [1200, 500], [1250, 512], [1290, 488], [1335, 506], [1380, 494], [1420, 515], [1460, 515]];
  const dark = t => prog(t, 1, 10);

  function room(t) {
    const n = dark(t);
    // 牆
    ctx.fillStyle = '#2a1d5c'; ctx.fillRect(0, 0, 1920, WALL);
    ctx.fillStyle = '#251952'; ctx.fillRect(0, 590, 1920, WALL - 590);       // 護牆板
    ctx.fillStyle = '#33246a'; ctx.fillRect(0, 586, 1920, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 30; x < 1920; x += 120) ctx.fillRect(x, 600, 4, WALL - 610);
    ctx.fillStyle = '#1a1240'; ctx.fillRect(0, WALL - 14, 1920, 14);           // 踢腳板
    // 地板
    ctx.fillStyle = '#3a2754'; ctx.fillRect(0, WALL, 1920, 905 - WALL);
    ctx.fillStyle = 'rgba(255,220,240,0.05)';
    for (let i = 0, y = WALL + 12; y < 905; i++, y += 16 + i * 6) ctx.fillRect(0, y, 1920, 3);
    // 窗戶
    window_(t, n);
    // 牆上的畫
    ctx.fillStyle = '#1a1240'; ctx.fillRect(588, 372, 112, 86);
    ctx.fillStyle = '#4a2377'; ctx.fillRect(597, 381, 94, 68);
    ctx.fillStyle = '#2fa59a'; ctx.beginPath(); ctx.moveTo(597, 449); ctx.lineTo(632, 405); ctx.lineTo(655, 430); ctx.lineTo(671, 414); ctx.lineTo(691, 449); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(670, 396, 7, 0, 7); ctx.fill();
    // 書架（右）
    ctx.fillStyle = '#1f1548'; ctx.fillRect(1560, 430, 170, WALL - 430);
    ctx.fillStyle = '#2c1f62'; [470, 560, 650].forEach(y => ctx.fillRect(1566, y, 158, 8));
    const BK = ['#2fa59a', '#d9a24a', '#8f80cf', '#5b4a8a', '#23857c', '#c9b8ff', '#a8742c'];
    [[442, 470], [532, 560], [622, 650]].forEach(([y0, y1], r) => {
      let x = 1572; for (let i = 0; x < 1700; i++) {
        const w = 12 + ((i * 7 + r * 3) % 4) * 3, h = (y1 - y0) - 4 - ((i * 5 + r) % 3) * 5;
        ctx.fillStyle = BK[(i + r * 2) % BK.length]; ctx.fillRect(x, y1 - h, w, h); x += w + 2;
      }
    });
    // 立燈（左）
    const lx = 330;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(lx, 762, 50, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1240'; ctx.beginPath(); ctx.ellipse(lx, 756, 40, 9, 0, 0, 7); ctx.fill();
    ctx.fillRect(lx - 4, 420, 8, 336);
    glow(lx, 420, 360, `rgba(255,211,107,${0.16 + 0.12 * n})`);
    glow(lx, 455, 120, 'rgba(255,230,160,0.55)');
    ctx.fillStyle = '#d9a24a'; ctx.beginPath(); ctx.moveTo(lx - 40, 350); ctx.lineTo(lx + 40, 350); ctx.lineTo(lx + 64, 438); ctx.lineTo(lx - 64, 438); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.moveTo(lx - 30, 350); ctx.lineTo(lx + 2, 350); ctx.lineTo(lx + 8, 438); ctx.lineTo(lx - 50, 438); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.ellipse(lx, 438, 64, 7, 0, 0, 7); ctx.fill();
    // 地毯
    ctx.fillStyle = '#2f2160'; ctx.beginPath(); ctx.ellipse(880, 812, 330, 46, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4b3b80'; ctx.beginPath(); ctx.ellipse(880, 810, 300, 38, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(201,184,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(880, 810, 262, 30, 0, 0, 7); ctx.stroke();
  }
  function window_(t, n) {
    const X0 = 1150, X1 = 1450, Y0 = 290, Y1 = 560;
    ctx.fillStyle = '#1a1240'; ctx.fillRect(X0 - 16, Y0 - 16, X1 - X0 + 32, Y1 - Y0 + 32);
    const g = ctx.createLinearGradient(0, Y0, 0, Y1);
    g.addColorStop(0, mixC('#2b1a63', '#0b0726', n)); g.addColorStop(0.6, mixC('#7a2f80', '#1d1450', n)); g.addColorStop(1, mixC('#ff8f8a', '#4a2a7a', n));
    ctx.fillStyle = g; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, X1 - X0, Y1 - Y0); ctx.clip();
    ctx.fillStyle = C.light;
    stars.forEach(s => { const a = clamp((n - s.th) * 3, 0, 1) * (0.6 + 0.4 * Math.sin(t * 2.3 + s.p)); if (a <= 0) return; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    const ma = 0.35 + 0.65 * n;
    glow(1380, 345, 80, `rgba(255,244,214,${0.35 * ma})`);
    ctx.globalAlpha = ma; ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(1380, 345, 26, 0, 7); ctx.fill();
    ctx.fillStyle = mixC('#2b1a63', '#0b0726', n); ctx.beginPath(); ctx.arc(1392, 337, 23, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    // 遠方屋頂
    ctx.fillStyle = '#170f3e'; ctx.beginPath(); ctx.moveTo(X0, Y1);
    roofs.forEach(([x, y], i) => { ctx.lineTo(x - 18, y + 10); ctx.lineTo(x, y); ctx.lineTo(x + 22, y + 10); });
    ctx.lineTo(X1, Y1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; [[1195, 530], [1262, 532], [1340, 528], [1418, 535]].forEach(([x, y], i) => { ctx.globalAlpha = 0.4 + 0.6 * clamp(n * 2 - i * 0.2, 0, 1); ctx.fillRect(x, y, 8, 9); });
    ctx.globalAlpha = 1; ctx.restore();
    // 窗格、窗台、窗簾
    ctx.fillStyle = '#1a1240'; ctx.fillRect((X0 + X1) / 2 - 6, Y0, 12, Y1 - Y0); ctx.fillRect(X0, (Y0 + Y1) / 2 - 5, X1 - X0, 10);
    ctx.fillStyle = '#3d2d84'; ctx.fillRect(X0 - 30, Y1 + 14, X1 - X0 + 60, 14);
    // 窗台上的小盆栽
    ctx.fillStyle = '#d9a24a'; ctx.beginPath(); ctx.moveTo(1185, Y1 + 14); ctx.lineTo(1215, Y1 + 14); ctx.lineTo(1219, Y1 - 12); ctx.lineTo(1181, Y1 - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2fa59a'; [[-12, -26, -0.5], [0, -34, 0], [12, -26, 0.5]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(1200 + dx, Y1 - 12 + dy, 9, 18, r, 0, 7); ctx.fill(); });
    [[X0 - 70, -1], [X1 + 70, 1]].forEach(([cx, s]) => {
      ctx.fillStyle = '#5b4a8a'; ctx.beginPath();
      ctx.moveTo(cx - 42, Y0 - 34); ctx.lineTo(cx + 42, Y0 - 34);
      ctx.quadraticCurveTo(cx + 18 * s + 10, (Y0 + Y1) / 2, cx + 44, Y1 + 120); ctx.lineTo(cx - 44, Y1 + 120);
      ctx.quadraticCurveTo(cx + 18 * s - 10, (Y0 + Y1) / 2, cx - 42, Y0 - 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a3b7a'; ctx.lineWidth = 4;
      [-18, 4, 24].forEach(o => { ctx.beginPath(); ctx.moveTo(cx + o, Y0 - 30); ctx.quadraticCurveTo(cx + o + 10 * s, (Y0 + Y1) / 2, cx + o * 1.1, Y1 + 116); ctx.stroke(); });
    });
    ctx.fillStyle = '#8f80cf'; ctx.fillRect(X0 - 140, Y0 - 42, X1 - X0 + 280, 10); // 窗簾桿
    ctx.beginPath(); ctx.arc(X0 - 140, Y0 - 37, 9, 0, 7); ctx.arc(X1 + 140, Y0 - 37, 9, 0, 7); ctx.fill();
  }

  // ---------- 家具 ----------
  function table() {
    ctx.fillStyle = 'rgba(8,5,30,0.3)'; ctx.beginPath(); ctx.ellipse((TABLE.L + TABLE.R) / 2, TABLE.foot + 2, 95, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b4632';
    ctx.fillRect(TABLE.L + 10, TABLE.top + 10, 12, TABLE.foot - TABLE.top - 10); ctx.fillRect(TABLE.R - 22, TABLE.top + 10, 12, TABLE.foot - TABLE.top - 10);
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(TABLE.L + 4, TABLE.top + 10, TABLE.R - TABLE.L - 8, 34);   // 抽屜
    ctx.fillStyle = '#d6a070'; ctx.beginPath(); ctx.arc((TABLE.L + TABLE.R) / 2, TABLE.top + 27, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#a8744a'; roundRect(TABLE.L - 8, TABLE.top, TABLE.R - TABLE.L + 16, 12, 5); ctx.fill();
  }
  function caseLid(t) { return prog(t, 2.45, 2.85); }
  function recorderCase(t, part) {
    const k = caseLid(t), w = CASE.R - CASE.L;
    if (part === 'back') {
      if (k > 0) { // 打開的盒蓋（看到內裡）
        const h = 40 * k;
        ctx.fillStyle = '#3a2c66'; roundRect(CASE.L, CASE.top - h - 4, w, h + 8, 6); ctx.fill();
        ctx.fillStyle = '#23857c'; ctx.fillRect(CASE.L + 6, CASE.top - h + 2, w - 12, Math.max(0, h - 4));
      }
      // 盒子內裡
      ctx.fillStyle = '#1d6b62'; ctx.fillRect(CASE.L + 4, CASE.top - 6, w - 8, 10);
      return;
    }
    // 盒身正面
    ctx.fillStyle = '#4b3b80'; roundRect(CASE.L, CASE.top, w, CASE.bot - CASE.top, 6); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(CASE.L + 6, CASE.top + 4, w - 12, 4);
    if (k <= 0) { // 蓋著
      ctx.fillStyle = '#5b4a8a'; roundRect(CASE.L, CASE.top - 12, w, 14, 6); ctx.fill();
    }
    ctx.fillStyle = C.gold; ctx.fillRect((CASE.L + CASE.R) / 2 - 7, CASE.top - (k > 0 ? 0 : 6), 14, 9); // 扣環
  }
  function musicStand() {
    const x = STAND_X;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(x, 792, 70, 9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#1a1240'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, 700); ctx.lineTo(x - 56, 788); ctx.moveTo(x, 700); ctx.lineTo(x + 56, 788); ctx.moveTo(x, 700); ctx.lineTo(x + 8, 782); ctx.stroke();
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, 700); ctx.lineTo(x, 588); ctx.stroke();
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(x - 7, 690, 14, 14);
    // 譜架面（稍微轉向觀眾的 3/4 角度）＋樂譜
    ctx.save(); ctx.translate(x, 548); ctx.rotate(-0.08);
    ctx.fillStyle = '#1a1240'; roundRect(-82, -58, 164, 106, 6); ctx.fill();
    ctx.fillStyle = '#2c1f62'; ctx.fillRect(-86, 44, 172, 10);                 // 托架
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(-74, -66, 70, 106); ctx.fillRect(2, -64, 70, 104);
    ctx.fillStyle = '#e9dcc0'; ctx.fillRect(-5, -66, 7, 106);
    ctx.strokeStyle = 'rgba(58,44,102,0.55)'; ctx.lineWidth = 1.6;
    [-50, -14, 22].forEach(y0 => {
      for (let i = 0; i < 5; i++) { const y = y0 + i * 4.5; ctx.beginPath(); ctx.moveTo(-68, y); ctx.lineTo(-10, y); ctx.moveTo(8, y + 2); ctx.lineTo(66, y + 2); ctx.stroke(); }
    });
    // 小音符（不是文字）
    ctx.fillStyle = '#3a2c66';
    const pts = [[-60, -44], [-46, -40], [-32, -46], [-18, -38], [-58, -8], [-40, -12], [-24, -4], [16, -42], [32, -46], [48, -38], [62, -44], [18, -6], [36, -10], [54, -2], [-52, 30], [-30, 26], [20, 30], [44, 26]];
    pts.forEach(([px, py]) => { ctx.beginPath(); ctx.ellipse(px, py, 3.6, 2.6, -0.4, 0, 7); ctx.fill(); ctx.fillRect(px + 2.6, py - 13, 1.6, 13); });
    ctx.restore();
  }

  // ---------- 直笛 ----------
  // top = 吹口端點，ang = 笛身方向（弧度，0 = 朝右）；holes = 按住幾孔（null = 不畫指法）
  function recorderShape(top, ang, opt = {}) {
    ctx.save(); ctx.translate(top.x, top.y); ctx.rotate(ang);
    // 尾端喇叭口＋腳管
    ctx.fillStyle = '#efe0bb';
    ctx.beginPath(); ctx.moveTo(104, -RR); ctx.quadraticCurveTo(118, -RR - 0.5, RL, -RR - 3.5); ctx.lineTo(RL, RR + 3.5); ctx.quadraticCurveTo(118, RR + 0.5, 104, RR); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8c28f'; ctx.beginPath(); ctx.ellipse(RL, 0, 2.6, RR + 3.5, 0, 0, 7); ctx.fill();
    // 主管
    ctx.fillStyle = '#f6ead0'; ctx.fillRect(40, -RR, 66, RR * 2);
    // 頭管（稍粗）
    ctx.fillStyle = '#f6ead0'; roundRect(14, -RR - 1.2, 30, (RR + 1.2) * 2, 3); ctx.fill();
    // 接環
    ctx.fillStyle = '#d8c28f'; ctx.fillRect(42, -RR - 1, 4, RR * 2 + 2); ctx.fillRect(101, -RR - 0.6, 4, RR * 2 + 1.2);
    // 吹口（深色）
    ctx.fillStyle = '#7a5640'; ctx.beginPath(); ctx.moveTo(0, -3.2); ctx.lineTo(16, -RR - 1.2); ctx.lineTo(16, RR + 1.2); ctx.lineTo(0, 3.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5c3f30'; ctx.fillRect(14, -RR - 1.2, 3, (RR + 1.2) * 2);
    // 音窗
    ctx.fillStyle = '#3a2c66'; ctx.beginPath(); ctx.moveTo(22, -RR - 1.2); ctx.lineTo(29, -RR - 1.2); ctx.lineTo(29, -1.5); ctx.closePath(); ctx.fill();
    // 亮面
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(18, -RR + 1.2, 86, 1.8);
    // 指孔（朝外側）
    HOLES.forEach(hx => { ctx.fillStyle = '#4b3b80'; ctx.beginPath(); ctx.ellipse(hx, -2.2, 2.3, 2.0, 0, 0, 7); ctx.fill(); });
    ctx.restore();
  }
  const HOLES = [50, 58, 66, 76, 84, 92, 99];
  // 手指：走在笛身後面（從靠身體那側繞過來），按住的孔在笛身上加指腹
  function fingers(top, ang, n, part, colTop, colBot) {
    ctx.save(); ctx.translate(top.x, top.y); ctx.rotate(ang);
    HOLES.forEach((hx, i) => {
      const col = i < 3 ? colTop : colBot, down = i < n;
      if (part === 'back') {
        ctx.strokeStyle = col; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx - 3, RR + 6);
        if (down) ctx.lineTo(hx, -2); else ctx.quadraticCurveTo(hx - 4, -RR - 1, hx - 2, -RR - (i < 3 ? 5.5 : 3.5));
        ctx.stroke();
      } else if (down) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(hx, -2.6, 3.8, 3.4, 0, 0, 7); ctx.fill();
      }
    });
    ctx.restore();
  }
  const dirv = a => ({ x: Math.cos(a), y: Math.sin(a) });
  const INNER = a => ({ x: -Math.sin(a), y: Math.cos(a) }); // 靠身體那一側（朝右吹奏時是左下）

  // ---------- 音符 ----------
  function noteGlyph(x, y, sz, type, col, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sz, sz);
    glow(0, -8, 30, col === C.red ? 'rgba(232,67,58,0.35)' : 'rgba(255,211,107,0.35)');
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
    if (type === 0) { // ♪
      ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 6.2, -0.4, 0, 7); ctx.fill();
      ctx.fillRect(5.6, -30, 3.2, 29);
      ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(7.2, -29); ctx.quadraticCurveTo(20, -22, 15, -10); ctx.stroke();
    } else { // ♫
      ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 6.2, -0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(22, -5, 8.5, 6.2, -0.4, 0, 7); ctx.fill();
      ctx.fillRect(5.6, -30, 3.2, 29); ctx.fillRect(27.6, -35, 3.2, 29);
      ctx.beginPath(); ctx.moveTo(5.6, -30); ctx.lineTo(30.8, -35); ctx.lineTo(30.8, -28); ctx.lineTo(5.6, -23); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 人物 ----------
  const hands = p => { const J = joints(p, S); return [J.A1.hand, J.A2.hand]; };
  function walkSeg(t, t0, t1, x0, x1) {
    const k = prog(t, t0, t1), x = lerp(x0, x1, k);
    const amp = clamp(Math.min(t - t0, t1 - t) / 0.18, 0, 1);
    return walk(x, G, Math.abs(x - x0) / 92 * Math.PI, amp);
  }
  // 吹奏時的身體：輕輕搖擺、前腳打拍子
  function playBody(t) {
    const u = Math.max(0, t - PLAY0), on = prog(t, PLAY0 - 0.3, PLAY0 + 0.4);
    const sway = Math.sin(u * Math.PI / (BEAT * 4)) * on;
    const tap = Math.max(0, Math.sin(u * Math.PI / (BEAT * 2))) ** 3 * on;
    const breath = prog(t, 5.3, 5.6) * (1 - prog(t, 5.65, 5.85));
    return { ...STAND(P1, G), x: P1 + 4 * sway, y: G - 146 - 4 * breath, tor: -1 + 2.6 * sway - 2 * breath, hd: 7 - 2 * breath,
      l1: 6 + 9 * tap, k1: 3 - 4 * tap, l2: -6, k2: -3 };
  }
  // 吹奏時直笛：吹口貼嘴、往前下方 45°
  function playRec(p) {
    const J = joints(p, S), s = S;
    const mouth = { x: J.head.x + 27 * s * 0.62, y: J.head.y + 15 * s * 0.62 };
    return { top: mouth, ang: Math.PI / 4 + 0.03 * (p.tor || 0) / 3 };
  }
  const CARRY_ANG = 1.2;
  function carryGrip(p) { return { x: p.x + 46, y: p.y - 14 }; }

  function person(t) {
    let p, rec = null, n = null, mode = 'none';
    const grabT = 3.15, CASE_REC = { top: { x: CASE.R - 10, y: CASE.top - 3 }, ang: Math.PI }; // 吹口朝右放在盒裡
    if (t < 2.2) { // 走到小桌前
      const k = prog(t, 0, 2.2, q => q * (2 - q)); const x = lerp(-90, P0, k);
      p = walk(x, G, (x + 90) / 92 * Math.PI, 1 - prog(t, 1.95, 2.2));
      rec = CASE_REC; mode = 'case';
    } else if (t < 3.15) { // 彎腰、掀開盒蓋、手伸到直笛
      const lean = prog(t, 2.2, 2.45);
      const base = { ...STAND(P0, G), tor: 22 * lean, hd: 6 * lean, l1: 6 + 6 * lean };
      const lidK = Math.min(caseLid(t), 0.6), lidH = 40 * lidK;
      const h0 = hands(base)[0];
      let tgt;
      if (t < 2.45) tgt = { x: lerp(h0.x, 600, lean), y: lerp(h0.y, CASE.top - 10, lean) };
      else if (t < 2.9) tgt = { x: 600, y: CASE.top - 10 - lidH };
      else { const k = prog(t, 2.9, 3.15); const g = { x: CASE_REC.top.x - RL * GRIP, y: CASE_REC.top.y - 2 }; tgt = { x: lerp(600, g.x, k), y: lerp(CASE.top - 10 - 24, g.y, k) }; }
      p = { ...base, h1x: tgt.x, h1y: tgt.y, b1: 1 };
      rec = CASE_REC; mode = 'case';
    } else if (t < 3.8) { // 拿起直笛（先往上提，再轉直、站起來）
      const up = prog(t, 3.15, 3.4), k = prog(t, 3.4, 3.8);
      const base = mix({ ...STAND(P0, G), tor: 22, hd: 6, l1: 12 }, STAND(P0, G), k);
      const g0 = { x: CASE_REC.top.x - RL * GRIP, y: CASE_REC.top.y - 2 - 14 * up };
      const g1 = carryGrip(base);
      const g = { x: lerp(g0.x, g1.x, k), y: lerp(g0.y, g1.y, k) };
      p = { ...base, h1x: g.x, h1y: g.y, b1: 1 };
      const ang = lerp(Math.PI, CARRY_ANG, k) + 0.1 * up * (1 - k);
      rec = { top: { x: g.x - RL * GRIP * Math.cos(ang), y: g.y - RL * GRIP * Math.sin(ang) }, ang }; mode = 'hand';
    } else if (t < 4.75) { // 拿著直笛走到譜架前
      const w = walkSeg(t, 3.8, 4.75, P0, P1);
      const g = carryGrip(w);
      p = { ...w, h1x: g.x, h1y: g.y, b1: 1 };
      rec = { top: { x: g.x - RL * GRIP * Math.cos(CARRY_ANG), y: g.y - RL * GRIP * Math.sin(CARRY_ANG) }, ang: CARRY_ANG }; mode = 'hand';
    } else { // 舉到嘴邊、雙手就位 → 吹奏
      const k = prog(t, 4.75, 5.35);
      const body = mix(STAND(P1, G), playBody(t), k);
      const pr = playRec(body);
      const gc = carryGrip(body);
      const gp = { x: pr.top.x + RL * GRIP * Math.cos(pr.ang), y: pr.top.y + RL * GRIP * Math.sin(pr.ang) };
      const ang = lerp(CARRY_ANG, pr.ang, k);
      const g = { x: lerp(gc.x, gp.x, k), y: lerp(gc.y, gp.y, k) };
      const top = { x: g.x - RL * GRIP * Math.cos(ang), y: g.y - RL * GRIP * Math.sin(ang) };
      const inn = INNER(ang);
      const h1 = { x: g.x + inn.x * 9, y: g.y + inn.y * 9 };
      // 左手（遠側）在上
      const up = { x: top.x + 58 * Math.cos(ang) + inn.x * 9, y: top.y + 58 * Math.sin(ang) + inn.y * 9 };
      const k2 = prog(t, 5.0, 5.45);
      const h2r = hands(body)[1];
      p = { ...body, h1x: h1.x, h1y: h1.y, b1: 1, h2x: lerp(h2r.x, up.x, k2), h2y: lerp(h2r.y, up.y, k2), b2: 1 };
      rec = { top, ang }; mode = 'play';
      if (k2 >= 1) n = noteAt(t);
    }
    p.gy = G;
    return { p, rec, n, mode };
  }
  const bun = (J, col, s, face) => { // 頭頂後方的包包頭
    const bx = J.head.x - face * 15 * s, by = J.head.y - 17 * s;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 11 * s, 0, 7); ctx.fill();
  };

  function draw(c, t) {
    const zoom = 1.25 + 0.06 * prog(t, 4.5, 11, E.inOut);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    const fx = lerp(900, 960, prog(t, 3.8, 9, E.inOut));
    ctx.translate(960, 790); ctx.scale(zoom, zoom); ctx.translate(-fx, -790);
    room(t);
    table();
    const P = person(t);
    recorderCase(t, 'back');
    if (P.mode === 'case') recorderShape(P.rec.top, P.rec.ang);
    recorderCase(t, 'front');
    musicStand();
    // 吹出來的音符（在人後面先畫光，音符本身畫在最上層）
    figure(P.p, S, 'hero', {
      head: bun,
      front: (J) => {
        if (P.mode === 'case' || !P.rec) return;
        if (P.n !== null) fingers(P.rec.top, P.rec.ang, P.n, 'back', C.heroFar, C.hero);
        recorderShape(P.rec.top, P.rec.ang);
        if (P.n !== null) fingers(P.rec.top, P.rec.ang, P.n, 'front', C.heroFar, C.hero);
        else if (P.mode !== 'none') { // 握著：手掌包住笛身
          ctx.fillStyle = C.hero; ctx.beginPath(); ctx.arc(J.A1.hand.x, J.A1.hand.y, 9.5 * S, 0, 7); ctx.fill();
        }
      },
    });
    // 音符從笛尾飄出
    if (P.mode === 'play') {
      onsets(t).forEach(nt => {
        const q = person(nt.t), d = dirv(q.rec.ang);
        const b = { x: q.rec.top.x + d.x * (RL + 6), y: q.rec.top.y + d.y * (RL + 6) };
        const age = (t - nt.t) / 2.8;
        const pitch = (6 - nt.n) * 7;
        const x = b.x + 18 + 40 * age + 190 * age * age + 12 * Math.sin(age * 7 + nt.id);
        const y = b.y - 14 - pitch - 330 * age + 40 * age * age;
        const a = clamp(age * 8, 0, 1) * (1 - prog(age, 0.6, 1));
        const col = nt.id % 4 === 3 ? C.red : (nt.id % 2 ? C.light : C.gold);
        noteGlyph(x, y, 0.9 + 0.35 * prog(age, 0, 0.3, E.out), nt.id % 3 === 1 ? 1 : 0, col, a);
        if (t - nt.t < 0.3) glow(b.x, b.y, 34, `rgba(255,211,107,${0.6 * (1 - (t - nt.t) / 0.3)})`); // 吹出時笛口微亮
      });
    }
    ctx.restore();
  }

  return { act: 11, answer: [{ w: 'play', verb: true }, { w: 'the' }, { w: 'recorder' }], draw };
})();
