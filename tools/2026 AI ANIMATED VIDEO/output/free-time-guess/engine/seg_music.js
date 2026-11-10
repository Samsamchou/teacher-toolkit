// 第 5 段 listen to music：夜晚的臥室。
// 站在窗邊書桌前 → 拿起耳罩式耳機、雙手把頭帶套過頭頂、耳罩落在耳朵上 → 拿起手機
// → 轉身走到床尾 → 轉身坐在床沿 → 低頭看手機、另一手手指點播放（螢幕亮、等化器跳動）
// → 音符從耳罩飄出、聲波一圈圈擴散 → 跟著節拍點頭、腳打拍子、往後撐著床陶醉地搖擺
SEGMENTS.music = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, walk, STAND, mix, joints } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800;
  // 配置（左→右）：窗戶＋書桌（檯燈、耳機、手機）、空地（地毯）、床（床尾在左、床頭在右）
  const WIN = { L: 300, R: 620, T: 270, B: 560 };
  const DESK = { L: 400, R: 720, top: G - 135 };
  const HP_DESK = { x: 630, y: DESK.top - 16 };       // 耳機（正面 U 形）立在桌上，耳罩中心
  const PHONE_DESK = { x: 690, y: DESK.top - 3 };     // 手機平放在桌上
  const BED = { L: 1100, R: 1700, top: G - 88 };
  const DX = 765;                                     // 書桌前站的位置
  const BX = 1072, SEATX = 1132;                      // 床尾前站的位置、坐下時髖部
  const PLAY = 6.3;                                   // 按下播放
  const BEAT = 0.5;                                   // 一拍 0.5 秒（120 BPM）

  const roundRect = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const L = q => FT.mirror(q);
  // 節拍脈衝：拍點上 1，很快衰減
  const pulse = t => { if (t < PLAY + 0.2) return 0; const ph = ((t - PLAY - 0.2) / BEAT) % 1; return Math.exp(-ph * 7); };
  const groove = t => prog(t, PLAY + 0.1, PLAY + 0.7);          // 律動開始的強度
  const calm = t => 1 - 0.45 * prog(t, 10.2, 11.2);              // 倒數後律動稍微變小

  // ---------- 背景：臥室 ----------
  const R = rng(23);
  const stars = Array.from({ length: 26 }, () => ({ x: WIN.L + 20 + R() * (WIN.R - WIN.L - 40), y: WIN.T + 18 + R() * (WIN.B - WIN.T - 60), r: 1 + R() * 2, p: R() * 6 }));
  function room(t) {
    // 牆
    ctx.fillStyle = '#241a55'; ctx.fillRect(0, 0, 1920, G);
    ctx.fillStyle = '#2b2063'; ctx.fillRect(0, 0, 1920, 330);   // 上半牆稍亮（兩色調）
    ctx.fillStyle = '#1d1548'; ctx.fillRect(0, G - 26, 1920, 26); // 踢腳板
    ctx.fillStyle = '#3a2c7a'; ctx.fillRect(0, G - 28, 1920, 3);
    // 地板（木地板條紋）
    ctx.fillStyle = '#2e2160'; ctx.fillRect(0, G, 1920, 200);
    ctx.strokeStyle = 'rgba(201,184,255,0.07)'; ctx.lineWidth = 2;
    [G + 22, G + 52, G + 92].forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1920, y); ctx.stroke(); });
    // 地毯
    ctx.fillStyle = '#4a3a8a'; ctx.beginPath(); ctx.ellipse(890, G + 26, 250, 22, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(201,184,255,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(890, G + 26, 228, 17, 0, 0, 7); ctx.stroke();
    // 月光從窗戶灑在地上
    ctx.fillStyle = 'rgba(201,184,255,0.055)'; ctx.beginPath();
    ctx.moveTo(WIN.L, WIN.B); ctx.lineTo(WIN.R, WIN.B); ctx.lineTo(WIN.R + 330, G + 60); ctx.lineTo(WIN.L + 300, G + 60); ctx.closePath(); ctx.fill();
    window_(t);
    shelf();
    // 牆上掛的小星星串燈
    for (let i = 0; i < 9; i++) {
      const x = 1180 + i * 62, y = 300 + 26 * Math.sin(i / 8 * Math.PI);
      const a = 0.55 + 0.35 * Math.sin(t * 2.4 + i * 1.3);
      glow(x, y + 6, 26, `rgba(255,211,107,${0.45 * a})`);
      ctx.fillStyle = C.gold; ctx.globalAlpha = 0.6 + 0.4 * a; ctx.beginPath(); ctx.arc(x, y + 6, 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(201,184,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const x = 1180 + i * 62, y = 300 + 26 * Math.sin(i / 8 * Math.PI); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function window_(t) {
    const { L: l, R: r, T: tp, B: b } = WIN;
    ctx.fillStyle = '#5b4a8a'; roundRect(l - 16, tp - 16, r - l + 32, b - tp + 32, 10); ctx.fill();
    const g = ctx.createLinearGradient(0, tp, 0, b);
    g.addColorStop(0, '#0e0a2b'); g.addColorStop(1, '#2b1a63');
    ctx.fillStyle = g; ctx.fillRect(l, tp, r - l, b - tp);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp, r - l, b - tp); ctx.clip();
    // 遠方屋頂剪影
    ctx.fillStyle = '#171040';
    ctx.beginPath(); ctx.moveTo(l, b);
    [[l, 500], [l + 60, 500], [l + 60, 470], [l + 130, 470], [l + 130, 515], [l + 200, 515], [l + 200, 480], [l + 240, 455], [l + 280, 480], [r, 480], [r, b]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,211,107,0.55)'; [[l + 80, 485], [l + 150, 528], [l + 228, 492]].forEach(([x, y]) => ctx.fillRect(x, y, 12, 12));
    ctx.fillStyle = C.light;
    stars.forEach(s => { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    glow(530, 340, 90, 'rgba(255,244,214,0.35)');
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(530, 340, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#16103d'; ctx.beginPath(); ctx.arc(544, 331, 27, 0, 7); ctx.fill();
    ctx.restore();
    // 窗格
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect((l + r) / 2 - 6, tp, 12, b - tp); ctx.fillRect(l, (tp + b) / 2 - 6, r - l, 12);
    ctx.fillStyle = '#4a3a78'; ctx.fillRect(l - 26, b + 10, r - l + 52, 14); // 窗台
    // 窗簾（兩側、有摺痕）
    [[l - 70, 1], [r + 70, -1]].forEach(([x, d]) => {
      ctx.fillStyle = '#6b4a9e'; ctx.beginPath();
      ctx.moveTo(x - 40, tp - 40); ctx.lineTo(x + 40, tp - 40);
      ctx.quadraticCurveTo(x + 20 * d + 10, (tp + b) / 2, x + 34, b + 120); ctx.lineTo(x - 34, b + 120);
      ctx.quadraticCurveTo(x - 10, (tp + b) / 2, x - 40, tp - 40); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#563a86'; ctx.lineWidth = 5;
      [-14, 10].forEach(o => { ctx.beginPath(); ctx.moveTo(x + o, tp - 30); ctx.quadraticCurveTo(x + o + 6 * d, (tp + b) / 2, x + o * 1.3, b + 112); ctx.stroke(); });
    });
    ctx.fillStyle = '#8a7ac0'; ctx.fillRect(l - 130, tp - 48, r - l + 260, 9); // 窗簾桿
  }
  function shelf() { // 床上方牆上的書架
    const x0 = 1250, y = 440;
    ctx.fillStyle = '#6e4630'; ctx.fillRect(x0, y, 330, 12);
    ctx.fillStyle = '#5a3826'; ctx.fillRect(x0 + 24, y + 12, 10, 22); ctx.fillRect(x0 + 296, y + 12, 10, 22);
    const books = [['#2fa59a', 20, 70], ['#d9a24a', 16, 58], ['#7a68ad', 24, 76], ['#23857c', 14, 62], ['#c9b8ff', 18, 66]];
    let bx = x0 + 18;
    books.forEach(([c, w, h]) => { ctx.fillStyle = c; ctx.fillRect(bx, y - h, w, h); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx + 3, y - h + 10, w - 6, 4); bx += w + 3; });
    ctx.save(); ctx.translate(bx + 6, y); ctx.rotate(0.28); ctx.fillStyle = '#a8742c'; ctx.fillRect(0, -56, 18, 56); ctx.restore();
    // 小盆栽
    const px = x0 + 250;
    ctx.fillStyle = '#2fa59a';
    [[-14, -40, -0.5], [0, -50, 0], [14, -40, 0.5]].forEach(([dx, dy, a]) => { ctx.beginPath(); ctx.ellipse(px + dx, y - 26 + dy / 2, 8, 20, a, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#d9a24a'; ctx.beginPath(); ctx.moveTo(px - 20, y - 28); ctx.lineTo(px + 20, y - 28); ctx.lineTo(px + 14, y); ctx.lineTo(px - 14, y); ctx.closePath(); ctx.fill();
  }
  function desk(t) {
    // 桌腳、抽屜
    ctx.fillStyle = 'rgba(8,5,30,0.3)'; ctx.beginPath(); ctx.ellipse((DESK.L + DESK.R) / 2, G + 4, 180, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6e4630'; ctx.fillRect(DESK.L + 12, DESK.top + 10, 16, G - DESK.top - 10); ctx.fillRect(DESK.R - 30, DESK.top + 10, 16, G - DESK.top - 10);
    ctx.fillStyle = '#7a5038'; ctx.fillRect(DESK.R - 170, DESK.top + 12, 156, 44);
    ctx.fillStyle = '#d9a24a'; roundRect(DESK.R - 108, DESK.top + 30, 32, 7, 3); ctx.fill();
    ctx.fillStyle = '#8a5a3c'; roundRect(DESK.L, DESK.top, DESK.R - DESK.L, 16, 4); ctx.fill();
    ctx.fillStyle = '#a8744a'; ctx.fillRect(DESK.L + 6, DESK.top + 2, DESK.R - DESK.L - 12, 4);
    // 兩本書
    ctx.fillStyle = '#7a68ad'; roundRect(510, DESK.top - 14, 70, 14, 3); ctx.fill();
    ctx.fillStyle = '#2fa59a'; roundRect(516, DESK.top - 26, 60, 12, 3); ctx.fill();
    // 檯燈（暖光一直開著）
    const bx = 450;
    glow(bx + 60, DESK.top - 30, 230, 'rgba(255,211,107,0.22)');
    ctx.fillStyle = 'rgba(255,211,107,0.10)'; ctx.beginPath();
    ctx.moveTo(bx + 46, DESK.top - 104); ctx.lineTo(bx + 92, DESK.top - 96); ctx.lineTo(bx + 150, DESK.top); ctx.lineTo(bx + 10, DESK.top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; ctx.beginPath(); ctx.ellipse(bx, DESK.top - 4, 30, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5b4a8a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, DESK.top - 8); ctx.lineTo(bx + 18, DESK.top - 90); ctx.lineTo(bx + 62, DESK.top - 118); ctx.stroke();
    ctx.save(); ctx.translate(bx + 68, DESK.top - 110); ctx.rotate(0.55);
    ctx.fillStyle = '#d9a24a'; ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(14, -16); ctx.lineTo(30, 18); ctx.lineTo(-30, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.ellipse(0, 18, 26, 6, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function bed() {
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse((BED.L + BED.R) / 2, G + 4, 320, 12, 0, 0, 7); ctx.fill();
    // 床頭板（右）
    ctx.fillStyle = '#6e4630'; roundRect(BED.R - 10, G - 270, 34, 270, 10); ctx.fill();
    ctx.fillStyle = '#8a5a3c'; roundRect(BED.R - 4, G - 262, 22, 150, 8); ctx.fill();
    // 床架、床腳
    ctx.fillStyle = '#6e4630'; ctx.fillRect(BED.L + 6, G - 30, 18, 30); ctx.fillRect(BED.R - 30, G - 30, 18, 30);
    ctx.fillStyle = '#8a5a3c'; roundRect(BED.L, G - 52, BED.R - BED.L, 26, 6); ctx.fill();
    // 床墊
    ctx.fillStyle = '#d8ccf5'; roundRect(BED.L + 4, BED.top, BED.R - BED.L - 8, 38, 12); ctx.fill();
    ctx.fillStyle = '#b7a9e6'; ctx.fillRect(BED.L + 10, BED.top + 26, BED.R - BED.L - 20, 6);
    // 枕頭
    ctx.fillStyle = '#9c8fd0'; ctx.beginPath(); ctx.ellipse(BED.R - 80, BED.top - 14, 66, 22, -0.08, 0, 7); ctx.fill();
    // 棉被（蓋住右半張床，左邊捲起的邊）
    ctx.fillStyle = '#2fa59a'; ctx.beginPath();
    ctx.moveTo(1290, BED.top - 4); ctx.lineTo(BED.R - 150, BED.top - 10); ctx.quadraticCurveTo(BED.R - 20, BED.top - 6, BED.R - 14, BED.top + 10);
    ctx.lineTo(BED.R - 14, BED.top + 58); ctx.lineTo(1290, BED.top + 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23857c'; roundRect(1270, BED.top - 8, 40, 66, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(140,235,220,0.45)'; ctx.lineWidth = 3;
    [1380, 1470, 1560].forEach(x => { ctx.beginPath(); ctx.moveTo(x, BED.top + 2); ctx.lineTo(x - 10, BED.top + 56); ctx.stroke(); });
  }

  // ---------- 耳機 ----------
  // k = 0：正面 U 形（拿在手上）；k = 1：側面戴在頭上（兩個耳罩重疊在耳朵）
  function headphones(cx, cy, k, s, sil) {
    if (sil) return; // 輪廓光那一層不畫，避免頭帶出現兩條
    const rx = lerp(30, 28, k) * s, ry = lerp(33, 31, k) * s, spread = rx * (1 - k);
    const band = sil || '#3a2c66', cup = sil || '#2fa59a', cupD = sil || '#23857c', pad = sil || '#1f6f68';
    ctx.strokeStyle = band; ctx.lineWidth = 6.5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(cx, cy - 6 * s, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();
    if (!sil) { ctx.strokeStyle = '#5b4a8a'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.ellipse(cx, cy - 6 * s, rx - 1.5 * s, ry - 1.5 * s, 0, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); }
    // 頭帶兩端接到耳罩的小臂
    ctx.strokeStyle = band; ctx.lineWidth = 4 * s;
    if (k < 0.7) { ctx.globalAlpha = 1 - k / 0.7; [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(cx + d * rx * 0.98, cy - 8 * s); ctx.lineTo(cx + d * spread, cy - 9 * s); ctx.stroke(); }); ctx.globalAlpha = 1; }
    const cupAt = (x, dark, side) => { // 耳罩：圓角膠囊＋側邊深色耳墊＋一條亮線（不要畫成同心圓，會像眼睛）
      const w = 15 * s, h = 26 * s;
      ctx.fillStyle = dark ? cupD : cup; roundRect(x - w / 2, cy - h / 2, w, h, 7 * s); ctx.fill();
      ctx.fillStyle = dark ? pad : cupD; roundRect(side > 0 ? x + w / 2 - 5 * s : x - w / 2, cy - h / 2 + 2 * s, 5 * s, h - 4 * s, 2.5 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; roundRect(x + 2 * s, cy - h / 2 + 4 * s, 2.6 * s, h * 0.45, 1.3 * s); ctx.fill();
    };
    if (spread > 1) cupAt(cx + spread, true, -1);
    cupAt(cx - spread, false, spread > 1 ? 1 : -1);
  }
  // 手機：中心、角度、亮度狀態
  function phone(x, y, ang, t, s, sil) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = sil || '#2a2058'; roundRect(-12, -20, 24, 40, 5); ctx.fill();
    if (!sil) {
      const lit = prog(t, 5.7, 5.95);
      ctx.fillStyle = lit > 0 ? `rgba(201,184,255,${0.35 + 0.5 * lit})` : '#3a2c66';
      roundRect(-9, -16, 18, 32, 3); ctx.fill();
      if (t >= PLAY) { // 按下播放：螢幕更亮、等化器跳動
        const k = prog(t, PLAY, PLAY + 0.15);
        glow(0, 0, 44 * k, 'rgba(255,211,107,0.55)');
        ctx.fillStyle = C.gold;
        for (let i = 0; i < 4; i++) { const h = 5 + 13 * Math.abs(Math.sin(t * 7 + i * 1.7)) * (0.6 + 0.4 * pulse(t)); ctx.fillRect(-7 + i * 4, 10 - h, 2.6, h); }
      } else if (lit > 0) { // 播放鍵（三角形）
        ctx.fillStyle = `rgba(255,211,107,${lit})`; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(6, 0); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- 人物姿勢（只由 t 決定） ----------
  function handsOf(p) { const J = joints(p, S); return [J.A1.hand, J.A2.hand]; }
  function withHands(p, t1, t2, k = 1) {
    const h = handsOf(p); const o = { ...p };
    if (t1) { o.h1x = lerp(h[0].x, t1.x, k); o.h1y = lerp(h[0].y, t1.y, k); o.b1 = -(p.face || 1); }
    if (t2) { o.h2x = lerp(h[1].x, t2.x, k); o.h2y = lerp(h[1].y, t2.y, k); o.b2 = -(p.face || 1); }
    return o;
  }
  const standDesk = (lean = 0) => L({ ...STAND(DX, G), tor: lean, hd: lean * 0.4 });
  const SITR = (x) => ({ x, y: BED.top - 12, tor: 6, face: 1, l1: 76, k1: 2, l2: 70, k2: -2, a1: 30, e1: 70, a2: 25, e2: 60, hd: 0 });
  function headOf(p) { return joints(p, S).head; }
  // 耳機狀態：{ x, y, k, worn }
  function hpState(t, p) {
    if (t < 0.85) return { x: HP_DESK.x, y: HP_DESK.y, k: 0, on: 'desk' };
    const hd = headOf(p);
    const ear = { x: hd.x - (p.face || 1) * 8 * S, y: hd.y + 2 * S };
    if (t >= 2.15) return { ...ear, k: 1, on: 'head' };
    const f = p.face || 1;
    // 真實順序：拿到臉前面（轉成側面＝耳罩朝自己）→ 舉高越過頭頂 → 往後往下套到耳朵
    const front = { x: hd.x + f * 62, y: hd.y + 16 };
    const over = { x: hd.x + f * 22, y: hd.y - 56 };
    const k = E.inOut(prog(t, 1.0, 1.45));
    if (t < 1.45) {
      const u = prog(t, 0.85, 1.45);
      const arc = -40 * Math.sin(Math.PI * u);
      return { x: lerp(HP_DESK.x, front.x, u), y: lerp(HP_DESK.y, front.y, u) + arc, k, on: 'hand' };
    }
    if (t < 1.8) {
      const u = prog(t, 1.45, 1.8);
      return { x: lerp(front.x, over.x, u), y: lerp(front.y, over.y, E.out(u)), k: 1, on: 'hand' };
    }
    const u = prog(t, 1.8, 2.15);
    return { x: lerp(over.x, ear.x, u), y: lerp(over.y, ear.y, E.in(u) * 0.3 + u * 0.7), k: 1, on: 'hand' };
  }
  function walkSeg(t, t0, t1, x0, x1) {
    const k = prog(t, t0, t1), x = lerp(x0, x1, k);
    const amp = clamp(Math.min(t - t0, t1 - t) / 0.2, 0, 1);
    const w = walk(x, G, Math.abs(x - x0) / 92 * Math.PI, amp);
    return x1 < x0 ? FT.mirror(w) : w;
  }
  // 坐姿（朝左）＋律動
  function seatedPose(t) {
    const g = groove(t) * calm(t), b = pulse(t);
    const back = prog(t, 7.7, 8.5);                         // 往後靠、撐著床
    const sway = Math.sin((t - PLAY) * Math.PI / BEAT / 2) * g; // 兩拍一次左右搖
    const look = prog(t, 5.55, 5.85) * (1 - prog(t, 6.6, 7.0)); // 低頭看手機
    const base = SITR(SEATX);
    const p = { ...base,
      tor: lerp(10, -9, back) + 2.5 * sway,
      hd: 14 * look + g * (lerp(4, -4, back) + 10 * b) ,
      l1: base.l1 + 5 * b * g, k1: base.k1 + 14 * b * g,
      y: base.y + 1.5 * b * g,
    };
    return L(p);
  }
  function poseAt(t) {
    let p, phoneIn = 'desk', hp;
    if (t < 0.85) { // 伸手拿耳機
      const k = prog(t, 0.1, 0.8);
      const base = standDesk(20 * k);
      p = withHands(base, { x: HP_DESK.x, y: HP_DESK.y - 50 }, null, k);
    } else if (t < 2.45) { // 雙手拿著兩個耳罩舉高、套到頭上
      const lean = 20 * (1 - prog(t, 0.85, 1.4));
      const base = standDesk(lean);
      const s = hpState(t, base);
      const spread = 30 * S * (1 - s.k);
      const join = prog(t, 0.85, 1.15);  // 第二隻手接過來
      const off = prog(t, 2.2, 2.45);    // 戴好後手放下
      const h1 = { x: s.x - spread, y: s.y }, h2 = { x: s.x + spread + 4, y: s.y + 2 };
      if (t < 1.15) { // 先用手抓著頭帶，再換到耳罩
        const top = { x: s.x, y: s.y - 33 * S };
        p = withHands(base, { x: lerp(top.x, h1.x, join), y: lerp(top.y, h1.y, join) }, h2, 1);
        p = withHands(base, { x: p.h1x, y: p.h1y }, h2, 1);
        const free = handsOf(base)[1];
        p.h2x = lerp(free.x, h2.x, join); p.h2y = lerp(free.y, h2.y, join);
      } else {
        if (off <= 0) p = withHands(base, h1, h2, 1);
        else { // 手放下：繞著肩膀轉下來（極座標內插），手肘不會往外戳
          const J0 = joints(base, S), rest = handsOf(base), k = E.inOut(off);
          const polar = (h, r) => {
            const a0 = Math.atan2(h.y - J0.sh.y, h.x - J0.sh.x), a1 = Math.atan2(r.y - J0.sh.y, r.x - J0.sh.x);
            let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
            const d = lerp(Math.hypot(h.x - J0.sh.x, h.y - J0.sh.y), Math.hypot(r.x - J0.sh.x, r.y - J0.sh.y), k);
            return { x: J0.sh.x + d * Math.cos(a0 + da * k), y: J0.sh.y + d * Math.sin(a0 + da * k) };
          };
          const q1 = polar(h1, rest[0]), q2 = polar(h2, rest[1]);
          p = { ...base, h1x: q1.x, h1y: q1.y, b1: 1, h2x: q2.x, h2y: q2.y, b2: 1 };
        }
      }
      hp = s;
    } else if (t < 3.3) { // 拿起手機、拿到胸前
      const reach = prog(t, 2.45, 2.85) * (1 - prog(t, 2.95, 3.3));
      const base = standDesk(16 * reach);
      const chest = { x: DX - 46, y: G - 205 };
      const held = prog(t, 2.95, 3.3);
      p = withHands(base, held > 0 ? { x: lerp(PHONE_DESK.x, chest.x, held), y: lerp(PHONE_DESK.y - 4, chest.y, held) } : { x: PHONE_DESK.x, y: PHONE_DESK.y - 4 }, null, held > 0 ? 1 : prog(t, 2.45, 2.85));
      phoneIn = t >= 2.85 ? 'hand' : 'desk';
    } else if (t < 4.85) { // 轉身，拿著手機走到床尾
      const w = t < 3.45 ? { ...STAND(DX, G) } : walkSeg(t, 3.45, 4.85, DX, BX);
      p = { ...w, h1x: w.x + 46, h1y: w.y + 146 - 205 + 3 * Math.sin(t * 9), b1: -1 };
      phoneIn = 'hand';
    } else if (t < 5.5) { // 轉身面向書桌，往後坐到床沿
      const k = prog(t, 4.95, 5.5);
      const st = L(STAND(BX, G)), sit = seatedPose(5.5);
      const m = mix(st, sit, k);
      p = { ...m, h1x: lerp(BX - 46, SEATX - 96, k), h1y: lerp(G - 205, G - 152, k), b1: 1 };
      phoneIn = 'hand';
    } else { // 坐著：看手機、點播放、聽音樂
      const sp = seatedPose(t);
      const hold = { x: SEATX - 96, y: G - 152 };
      const lap = { x: SEATX - 60, y: G - 128 };
      const down = prog(t, 6.65, 7.1);
      const h1 = { x: lerp(hold.x, lap.x, down), y: lerp(hold.y, lap.y, down) + 2 * pulse(t) * groove(t) };
      // 另一隻手：點螢幕 → 收回 → 往後撐在床上
      const screen = { x: h1.x - 2, y: h1.y - 16 };
      const reach = prog(t, 5.85, 6.2) * (1 - prog(t, 6.45, 6.8));
      const press = prog(t, 6.2, 6.3) * (1 - prog(t, 6.3, 6.42));
      const prop = prog(t, 7.7, 8.5);
      const rest = handsOf(sp)[1];
      const propAt = { x: SEATX + 66, y: BED.top - 4 };
      const free = { x: lerp(rest.x, propAt.x, prop), y: lerp(rest.y, propAt.y, prop) };
      const tap = { x: screen.x + 14 - 6 * press, y: screen.y - 36 + 12 * press };
      p = { ...sp, h1x: h1.x, h1y: h1.y, b1: 1, h2x: lerp(free.x, tap.x, reach), h2y: lerp(free.y, tap.y, reach), b2: prop > 0.5 ? -1 : 1, _tap: reach };
      phoneIn = 'hand';
    }
    p.gy = G;
    if (!hp) hp = t < 0.85 ? { x: HP_DESK.x, y: HP_DESK.y, k: 0, on: 'desk' } : { k: 1, on: 'head' };
    return { p, phoneIn, hp };
  }
  const earOf = (J, f = -1) => ({ x: J.head.x - f * 8 * S, y: J.head.y + 2 * S });

  // ---------- 音符與聲波 ----------
  function noteShape(x, y, sc, kind, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
    const head = (hx, hy) => { ctx.beginPath(); ctx.ellipse(hx, hy, 10, 7.5, -0.45, 0, 7); ctx.fill(); };
    if (kind === 0) { // ♪
      head(0, 0); ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(8.5, -2); ctx.lineTo(8.5, -40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8.5, -40); ctx.quadraticCurveTo(22, -30, 20, -14); ctx.quadraticCurveTo(17, -26, 8.5, -28); ctx.closePath(); ctx.fill();
    } else { // ♫
      head(0, 0); head(26, -6); ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.moveTo(8.5, -2); ctx.lineTo(8.5, -40); ctx.moveTo(34.5, -8); ctx.lineTo(34.5, -46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, -42); ctx.lineTo(36, -48); ctx.lineTo(36, -39); ctx.lineTo(7, -33); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  const NOTE_EVERY = 0.38, NOTE_LIFE = 2.7;
  const NR = rng(41);
  const NOTES = Array.from({ length: 40 }, (_, i) => ({ dx: 0.6 + NR() * 0.8, side: i % 3 === 2 ? -1 : 1, sw: 10 + NR() * 14, ph: NR() * 6, kind: NR() < 0.4 ? 1 : 0, sc: 0.9 + NR() * 0.35,
    col: i % 5 === 3 ? C.red : (i % 2 ? C.gold : '#c9b8ff') }));
  function notes(t) {
    if (t < PLAY + 0.15) return;
    const n0 = Math.max(0, Math.floor((t - PLAY - 0.15 - NOTE_LIFE) / NOTE_EVERY)), n1 = Math.floor((t - PLAY - 0.15) / NOTE_EVERY);
    for (let i = n0; i <= n1; i++) {
      const ts = PLAY + 0.15 + i * NOTE_EVERY, age = (t - ts) / NOTE_LIFE;
      if (age < 0 || age > 1) continue;
      const N = NOTES[i % NOTES.length];
      const J = joints(poseAt(ts).p, S), e = earOf(J);
      // 從耳罩後側飄出：多數往右上（頭的後方），少數往左上
      const x = e.x + N.side * (46 + 150 * N.dx * age) + N.sw * Math.sin(age * 5 + N.ph);
      const y = e.y - 40 - 220 * E.out(age);
      const a = clamp(age * 6, 0, 1) * (1 - prog(age, 0.6, 1, E.lin));
      const sc = 1.2 * N.sc * (0.5 + 0.5 * prog(age, 0, 0.18, E.back));
      ctx.globalAlpha = a;
      if (N.col === C.red) glow(x + 10, y - 16, 40 * sc, 'rgba(232,67,58,0.35)');
      noteShape(x, y, sc, N.kind, N.col, 0.25 * Math.sin(age * 4 + N.ph));
      ctx.globalAlpha = 1;
    }
  }
  function rings(t, J) { // 每拍從耳罩擴散的聲波弧線
    if (t < PLAY + 0.2) return;
    const e = earOf(J);
    for (let j = 0; j < 3; j++) {
      const ph = ((t - PLAY - 0.2) / BEAT - j / 3) % 1; if (ph < 0) continue;
      const r = 26 * S + ph * 70, a = (1 - ph) * 0.7 * groove(t);
      ctx.strokeStyle = `rgba(255,211,107,${a})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(e.x, e.y, r, -0.75, 0.75); ctx.stroke();
    }
  }

  // ---------- 畫人物 ----------
  function person(t) {
    const { p, phoneIn, hp } = poseAt(t);
    const extras = {
      head: (J, col, s, f) => { if (hp.on === 'head') { const e = earOf(J, f); headphones(e.x, e.y, 1, s, col === C.rim ? C.rim : null); } },
      front: (J, col, s) => {
        if (phoneIn === 'hand') {
          const h = J.A1.hand, f = p.face || 1;
          phone(h.x + f * 2, h.y - 12, f * 0.35, t, 1, col === C.rim ? C.rim : null);
        }
      },
    };
    const J = figure(p, S, 'hero', extras);
    if (p._tap > 0.3) { // 點手機時，遠側那隻手其實在身體前面：手臂畫在上層，伸出食指
      ctx.globalAlpha = clamp((p._tap - 0.3) / 0.3, 0, 1);
      FT.limb(J.A2.el, J.A2.hand, null, 16 * S, C.heroFar);
      ctx.fillStyle = C.heroFar; ctx.beginPath(); ctx.arc(J.A2.hand.x, J.A2.hand.y, 9 * S, 0, 7); ctx.fill();
      const ph = { x: J.A1.hand.x - 2, y: J.A1.hand.y - 12 }, dx = ph.x - J.A2.hand.x, dy = ph.y - J.A2.hand.y, m = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = C.heroFar; ctx.lineWidth = 5.5 * S; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(J.A2.hand.x, J.A2.hand.y); ctx.lineTo(J.A2.hand.x + dx / m * 13 * S, J.A2.hand.y + dy / m * 13 * S); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (t >= PLAY && t < PLAY + 0.45) { // 點下去的漣漪
      const k = (t - PLAY) / 0.45, ph = { x: J.A1.hand.x - 2, y: J.A1.hand.y - 12 };
      ctx.strokeStyle = `rgba(255,211,107,${1 - k})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(ph.x, ph.y, 10 + 34 * k, 0, 7); ctx.stroke();
    }
    // 拿在手上的耳機畫在手的上面
    if (hp.on === 'hand') headphones(hp.x, hp.y, hp.k, S, null);
    return J;
  }

  function draw(c, t) {
    const zoom = 1.28 + 0.05 * prog(t, 0, 10, E.inOut);
    const cx = lerp(800, 985, prog(t, 3.0, 5.8));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(960, 800); ctx.scale(zoom, zoom); ctx.translate(-cx, -760);
    room(t);
    desk(t);
    if (poseAt(t).hp.on === 'desk') headphones(HP_DESK.x, HP_DESK.y, 0, S, null);
    if (poseAt(t).phoneIn === 'desk') { ctx.fillStyle = '#2a2058'; roundRect(PHONE_DESK.x - 18, PHONE_DESK.y - 5, 36, 6, 2); ctx.fill(); }
    bed();
    const J = person(t);
    rings(t, J);
    notes(t);
    // 夜晚房間的暗角
    const v = ctx.createRadialGradient(cx, 600, 300, cx, 600, 1100);
    v.addColorStop(0, 'rgba(8,5,30,0)'); v.addColorStop(1, 'rgba(8,5,30,0.45)');
    ctx.fillStyle = v; ctx.fillRect(-200, -200, 2400, 1400);
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'listen', verb: true }, { w: 'to', verb: true }, { w: 'music' }], draw };
})();
