// 第 9 段 study English：夜裡的書房。
// 走進來 → 從書櫃抽出紅色英文書 → 拿著書走到書桌，把書放在桌上 → 坐下、雙手抓椅面往前挪（椅子塞好）
// → 按檯燈開關（暖光照下來）→ 翻開封面（A B C 字母飄出來）→ 拿起鉛筆，在筆記本上一筆一筆寫 abc → 抬頭看書、點點頭
SEGMENTS.study = (() => {
  const { C, clamp, lerp, E, prog, rng, figure, glow, walk, STAND, SIT, mix, joints } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800;
  const FONT = "'Comic Relief'";

  // ---------- 配置 ----------
  // 桌面用「稍微俯視」的帶狀表示：後緣 DB、前緣 DF；後排檯燈、中排書、前排筆記本。人坐在書桌左端、面向右。
  const DESK = { L: 925, R: 1290, DB: 594, DF: 686, AP: 698 };
  const SEAT_TOP = 726;
  const CHAIR_OUT = 872, CHAIR_SIT = 900;
  // 書：書背是水平線（從坐的人看過去，書的下緣朝向他）；闔上時只蓋前半，封面往後翻
  const BOOK = { x0: 985, x1: 1085, back: 606, spine: 628, front: 650 };
  const NOTE = { x0: 978, x1: 1090, y0: 656, y1: 684 };
  const LAMP = { bx: 1004, by: 598, btn: { x: 988, y: 590 }, el: { x: 1032, y: 440 }, hd: { x: 1102, y: 458 } };
  const WRITE = { x: 1006, base: 679, size: 23 };
  const PENCIL0 = { tip: { x: 1000, y: 664 }, ang: 0.04 };
  const REST_G = { x: 984, y: 688 }, REST_ANG = -3.88;               // 寫完：手拿著筆放在桌邊（筆尖朝右上）
  const REST_TIP = { x: REST_G.x - 22 * Math.cos(REST_ANG), y: REST_G.y - 22 * Math.sin(REST_ANG) };         // 鉛筆斜躺在筆記本右半
  const SHELF_BOOK = { x: 690, w: 20, h: 70, base: 648 };          // 書櫃中層的紅色書
  const T = {
    walk1: [0, 1.05], reach: [1.05, 1.3], pull: [1.3, 1.5], chest: [1.5, 1.7], walk2: [1.7, 2.45], place: [2.45, 2.85],
    sit: [2.9, 3.35], scoot: [3.35, 3.7], lampReach: [3.75, 3.98], click: 3.98,
    coverReach: [4.2, 4.42], flip: [4.42, 4.95],
    pencil: [6.0, 6.35], write: 6.45, down: [8.6, 8.95], letter: 0.62, gap: 0.12, lookUp: [8.95, 9.2], nod: [9.2, 9.95],
  };
  const SHELF_X = 642, STAND_X = 868;
  const LETTERS = ['a', 'b', 'c'];

  // ---------- 小工具 ----------
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const lampOn = t => t < T.click ? 0 : clamp(prog(t, T.click, T.click + 0.12) * (t < T.click + 0.2 ? 0.75 + 0.25 * Math.sin((t - T.click) * 90) : 1), 0, 1);
  const flipAng = t => Math.PI * prog(t, T.flip[0], T.flip[1], E.inOut);

  // ---------- 背景：房間 ----------
  const R = rng(23);
  const winStars = Array.from({ length: 26 }, () => ({ x: 1110 + R() * 190, y: 350 + R() * 120, r: 0.8 + R() * 1.6, p: R() * 6 }));
  const SHELF = { L: 520, R: 760, top: 400 };
  const shelfBooks = [];
  { const cols = ['#2fa59a', '#d9a24a', '#6b5b95', '#c9b8ff', '#23857c', '#a8742c', '#8f80cf'];
    [0, 1, 2].forEach(row => {
      let x = SHELF.L + 18; const base = SHELF.top + 120 + row * 128;
      while (x < SHELF.R - 40) {
        const w = 14 + Math.floor(R() * 12), h = 62 + Math.floor(R() * 40), lean = R() < 0.12 && x > SHELF.L + 60;
        if (row === 1 && x + w > SHELF_BOOK.x - 3 && x < SHELF_BOOK.x + SHELF_BOOK.w + 3) { x = SHELF_BOOK.x + SHELF_BOOK.w + 3; continue; }
        shelfBooks.push({ x, w, h, base, c: cols[Math.floor(R() * cols.length)], lean, band: R() < 0.5 });
        x += w + 2 + (R() < 0.15 ? 26 : 0);
      }
    }); }

  function room(t) {
    // 牆
    const wg = ctx.createLinearGradient(0, 0, 0, G);
    wg.addColorStop(0, '#1d1450'); wg.addColorStop(1, '#2b1d62');
    ctx.fillStyle = wg; ctx.fillRect(0, 0, 1920, G);
    // 牆上淡淡的直條紋
    ctx.fillStyle = 'rgba(201,184,255,0.035)';
    for (let x = 0; x < 1920; x += 90) ctx.fillRect(x, 0, 45, G);
    // 踢腳板
    ctx.fillStyle = '#3a2a75'; ctx.fillRect(0, G - 22, 1920, 22);
    // 地板
    ctx.fillStyle = '#16103c'; ctx.fillRect(0, G, 1920, 200);
    ctx.fillStyle = 'rgba(201,184,255,0.06)';
    for (let i = 0; i < 6; i++) ctx.fillRect(0, G + 14 + i * i * 9, 1920, 2);

    // 窗戶（夜景）
    const WX0 = 1095, WX1 = 1315, WY0 = 330, WY1 = 560;
    ctx.fillStyle = '#3d2d84'; roundRect(WX0 - 16, WY0 - 16, WX1 - WX0 + 32, WY1 - WY0 + 32, 10); ctx.fill();
    const sg = ctx.createLinearGradient(0, WY0, 0, WY1);
    sg.addColorStop(0, '#0d0930'); sg.addColorStop(0.6, '#2b1a63'); sg.addColorStop(1, '#6a2a7a');
    ctx.fillStyle = sg; ctx.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);
    ctx.save(); ctx.beginPath(); ctx.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); ctx.clip();
    ctx.fillStyle = C.light;
    winStars.forEach(s => { ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    glow(1255, 385, 70, 'rgba(255,244,214,0.35)');
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(1255, 385, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#0f0b33'; ctx.beginPath(); ctx.arc(1265, 378, 20, 0, 7); ctx.fill();
    // 遠方屋頂與亮著的窗
    ctx.fillStyle = '#150f3d';
    [[1095, 520, 60], [1150, 500, 50], [1195, 528, 70], [1258, 508, 60]].forEach(([x, y, w]) => { ctx.fillRect(x, y, w, 80); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + w / 2, y - 22); ctx.lineTo(x + w + 6, y); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,211,107,0.8)';
    [[1110, 535], [1170, 515], [1215, 540], [1235, 540], [1275, 522]].forEach(([x, y]) => ctx.fillRect(x, y, 9, 11));
    ctx.restore();
    // 窗框十字
    ctx.fillStyle = '#3d2d84'; ctx.fillRect((WX0 + WX1) / 2 - 5, WY0, 10, WY1 - WY0); ctx.fillRect(WX0, (WY0 + WY1) / 2 - 5, WX1 - WX0, 10);
    // 窗簾
    ctx.fillStyle = '#5b4a8a';
    ctx.beginPath(); ctx.moveTo(WX0 - 40, WY0 - 34); ctx.lineTo(WX0 + 26, WY0 - 34); ctx.quadraticCurveTo(WX0 - 4, WY0 + 120, WX0 + 10, WY1 + 40); ctx.lineTo(WX0 - 40, WY1 + 40); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(WX1 + 40, WY0 - 34); ctx.lineTo(WX1 - 26, WY0 - 34); ctx.quadraticCurveTo(WX1 + 4, WY0 + 120, WX1 - 10, WY1 + 40); ctx.lineTo(WX1 + 40, WY1 + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6b5b95'; ctx.fillRect(WX0 - 50, WY0 - 42, WX1 - WX0 + 100, 10);
    // 月光斜照在地上
    ctx.save(); ctx.globalAlpha = 0.05 * (1 - 0.5 * lampOn(t)); ctx.fillStyle = C.light;
    ctx.beginPath(); ctx.moveTo(WX0, WY1); ctx.lineTo(WX1, WY1); ctx.lineTo(WX1 + 260, G + 100); ctx.lineTo(WX0 + 160, G + 100); ctx.closePath(); ctx.fill(); ctx.restore();

    // 牆上掛的小黑板（裝飾，無字）
    ctx.fillStyle = '#5a3a2c'; roundRect(845, 300, 150, 100, 8); ctx.fill();
    ctx.fillStyle = '#1f4f4a'; roundRect(853, 308, 134, 84, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(870, 335); ctx.quadraticCurveTo(900, 320, 930, 340); ctx.moveTo(872, 362); ctx.lineTo(950, 360); ctx.stroke();

    // 書櫃
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse((SHELF.L + SHELF.R) / 2, G + 3, 140, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b442c'; ctx.fillRect(SHELF.L, SHELF.top, SHELF.R - SHELF.L, G - SHELF.top);
    ctx.fillStyle = '#4a2e1f'; ctx.fillRect(SHELF.L + 12, SHELF.top + 12, SHELF.R - SHELF.L - 24, G - SHELF.top - 24);
    shelfBooks.forEach(b => {
      ctx.save(); ctx.translate(b.x, b.base); if (b.lean) ctx.rotate(0.2);
      ctx.fillStyle = b.c; roundRect(0, -b.h, b.w, b.h, 2); ctx.fill();
      if (b.band) { ctx.fillStyle = 'rgba(255,244,214,0.35)'; ctx.fillRect(0, -b.h + 10, b.w, 4); ctx.fillRect(0, -18, b.w, 4); }
      ctx.restore();
    });
    ctx.fillStyle = '#8a5a3c';
    for (let r = 0; r < 4; r++) ctx.fillRect(SHELF.L, SHELF.top + 120 + r * 128 - (r === 3 ? 0 : 0), SHELF.R - SHELF.L, 10);
    ctx.fillRect(SHELF.L - 8, SHELF.top - 10, SHELF.R - SHELF.L + 16, 14);
    // 書櫃上的小盆栽
    ctx.fillStyle = '#d9a24a'; roundRect(690, SHELF.top - 44, 40, 34, 6); ctx.fill();
    ctx.fillStyle = '#2fa59a';
    [[-14, -60, -0.5], [0, -70, 0], [14, -58, 0.5]].forEach(([dx, dy, a]) => { ctx.save(); ctx.translate(710 + dx, SHELF.top - 40 + dy / 2); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 8, 22, 0, 0, 7); ctx.fill(); ctx.restore(); });
  }

  // 書櫃裡的紅色英文書（還沒被拿走時）
  function shelfBook(t) {
    if (t >= T.pull[0]) return;
    const b = SHELF_BOOK;
    ctx.fillStyle = C.red; roundRect(b.x, b.base - b.h, b.w, b.h, 2); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(b.x, b.base - b.h + 12, b.w, 4); ctx.fillRect(b.x, b.base - 18, b.w, 4);
  }

  // ---------- 椅子（側面、朝右） ----------
  const chairX = t => lerp(CHAIR_OUT, CHAIR_SIT, prog(t, T.scoot[0], T.scoot[1]));
  function chair(c) {
    ctx.fillStyle = 'rgba(8,5,30,0.3)'; ctx.beginPath(); ctx.ellipse(c, G + 3, 60, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#4a3b78'; ctx.lineCap = 'round'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(c + 40, SEAT_TOP + 10); ctx.lineTo(c + 44, G); ctx.moveTo(c - 40, SEAT_TOP + 10); ctx.lineTo(c - 46, G); ctx.stroke();
    ctx.lineWidth = 10; ctx.strokeStyle = '#5b4a8a';
    ctx.beginPath(); ctx.moveTo(c - 42, SEAT_TOP + 6); ctx.lineTo(c - 54, 588); ctx.stroke();
    ctx.fillStyle = '#6b5b95'; roundRect(c - 64, 596, 20, 70, 8); ctx.fill();
    ctx.fillStyle = '#6b5b95'; roundRect(c - 50, SEAT_TOP - 2, 100, 16, 6); ctx.fill();
    ctx.fillStyle = '#8f80cf'; roundRect(c - 48, SEAT_TOP - 4, 94, 7, 3); ctx.fill();
  }

  // ---------- 書桌 ----------
  function desk() {
    const { L, R: Rr, DB, DF, AP } = DESK;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse((L + Rr) / 2, G + 4, 200, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3826'; ctx.fillRect(L + 6, AP, 14, G - AP);
    ctx.fillStyle = '#6b442c'; ctx.fillRect(Rr - 130, AP, 124, G - AP);
    ctx.fillStyle = '#7d5235'; roundRect(Rr - 122, AP + 10, 108, 40, 4); ctx.fill(); roundRect(Rr - 122, AP + 56, 108, 40, 4); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(Rr - 82, AP + 27, 28, 6); ctx.fillRect(Rr - 82, AP + 73, 28, 6);
    ctx.fillStyle = '#a36b45'; ctx.beginPath(); ctx.moveTo(L + 10, DB); ctx.lineTo(Rr - 6, DB); ctx.lineTo(Rr, DF); ctx.lineTo(L, DF); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,214,0.07)'; ctx.fillRect(L + 14, DB + 4, Rr - L - 24, 6);
    ctx.fillStyle = '#7d5235'; ctx.fillRect(L, DF, Rr - L, AP - DF);
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(L, DF, Rr - L, 3);
  }
  function deskDecor() { // 右邊一疊書、筆筒
    const books = [['#2fa59a', 150, 12], ['#d9a24a', 136, 11], ['#8f80cf', 142, 12], ['#23857c', 128, 10]];
    let y = DESK.DB + 40;
    books.forEach(([c, w, h], i) => { const x = 1205 - w / 2 + (i % 2 ? 6 : -4); ctx.fillStyle = c; roundRect(x, y - h, w, h, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,244,214,0.5)'; ctx.fillRect(x + w - 10, y - h + 2, 6, h - 4); y -= h + 1; });
    ctx.fillStyle = '#5b4a8a'; roundRect(1110, DESK.DB - 18, 32, 46, 6); ctx.fill();
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    [[C.gold, 1118, 1112, -50], ['#2fa59a', 1130, 1134, -56], ['#c9b8ff', 1124, 1123, -44]].forEach(([c, x0, x1, dy]) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x0, DESK.DB - 16); ctx.lineTo(x1, DESK.DB + dy + 2); ctx.stroke(); });
  }

  // ---------- 檯燈（放在書桌左後角，燈臂往前伸到書的上方） ----------
  function lamp(t) {
    const on = lampOn(t), press = t > T.click - 0.06 && t < T.click + 0.12 ? 2 : 0;
    const { bx, by, el, hd } = LAMP;
    ctx.fillStyle = '#23857c'; ctx.beginPath(); ctx.ellipse(bx, by + 4, 30, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2fa59a'; roundRect(bx - 26, by - 10, 52, 14, 6); ctx.fill();
    ctx.fillStyle = on > 0.5 ? C.gold : '#c9b8ff'; roundRect(LAMP.btn.x - 6, LAMP.btn.y - 3 + press, 12, 6, 3); ctx.fill();
    ctx.strokeStyle = '#2fa59a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(bx + 4, by - 8); ctx.lineTo(el.x, el.y); ctx.lineTo(hd.x, hd.y); ctx.stroke();
    ctx.fillStyle = '#23857c'; ctx.beginPath(); ctx.arc(el.x, el.y, 7, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(0.45);
    ctx.fillStyle = '#2fa59a'; ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(13, -12); ctx.lineTo(30, 28); ctx.lineTo(-30, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23857c'; ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(0, -12); ctx.lineTo(-6, 28); ctx.lineTo(-30, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = on > 0 ? '#fff4d6' : '#4a3b78'; ctx.beginPath(); ctx.ellipse(0, 28, 30, 6, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function lampLight(t) {
    const on = lampOn(t); if (on <= 0) return;
    const a = 0.45, m = { x: LAMP.hd.x - Math.sin(a) * 28, y: LAMP.hd.y + Math.cos(a) * 28 };
    const ux = Math.cos(a), uy = Math.sin(a); // 燈罩口方向
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 * on; ctx.fillStyle = '#ffd36b';
    ctx.beginPath(); ctx.moveTo(m.x - ux * 28, m.y - uy * 28); ctx.lineTo(m.x + ux * 28, m.y + uy * 28); ctx.lineTo(1140, DESK.DF); ctx.lineTo(960, DESK.DF); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.12 * on;
    ctx.beginPath(); ctx.moveTo(m.x - ux * 16, m.y - uy * 16); ctx.lineTo(m.x + ux * 16, m.y + uy * 16); ctx.lineTo(1100, DESK.DF); ctx.lineTo(995, DESK.DF); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    glow(m.x, m.y, 60, `rgba(255,244,214,${0.75 * on})`);
    glow(1035, 650, 200, `rgba(255,190,110,${0.30 * on})`);
    ctx.restore();
  }

  // ---------- 書（紅色封面＝唯一紅色） ----------
  // 桌上的書：書背是水平線 y=spine；闔上時封面蓋在前半（spine–front），翻開後封面倒到後半
  function deskBook(t) {
    const { x0, x1, back, spine, front } = BOOK;
    const th = flipAng(t), co = Math.cos(th), si = Math.sin(th);
    const open = th > Math.PI / 2;
    // 翻開後：後半由封面內頁＋第一頁構成，底下露出紅色封面邊
    if (open) { ctx.fillStyle = '#b8322b'; roundRect(x0 - 3, back - 3, x1 - x0 + 6, spine - back + 4, 3); ctx.fill(); }
    // 前半的紙頁（封面掀開才看得到）
    ctx.fillStyle = '#e9dcc4'; roundRect(x0 + 1, spine, x1 - x0 - 2, front - spine + 3, 2); ctx.fill();
    ctx.fillStyle = '#fff4d6'; roundRect(x0 + 1, spine, x1 - x0 - 2, front - spine, 2); ctx.fill();
    if (th > 0.05) frontPage(clamp(th / 1.2, 0, 1));
    // 封面（繞書背翻）
    const ey = spine + (front - spine) * co - 38 * si;
    if (!open) {
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(x0 - 2, spine); ctx.lineTo(x1 + 2, spine); ctx.lineTo(x1 + 2, ey + 2); ctx.lineTo(x0 - 2, ey + 2); ctx.closePath(); ctx.fill();
      if (co > 0.3) { // 封面字 ABC
        ctx.save(); ctx.translate((x0 + x1) / 2, (spine + ey) / 2 + 1); ctx.scale(1, co);
        ctx.fillStyle = '#fff4d6'; ctx.font = `700 17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('ABC', -14, 0);
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(28, 0, 6, 0, 7); ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#f6ead6'; ctx.beginPath(); ctx.moveTo(x0, spine); ctx.lineTo(x1, spine); ctx.lineTo(x1, ey); ctx.lineTo(x0, ey); ctx.closePath(); ctx.fill();
      backPage(prog(th, Math.PI * 0.75, Math.PI));
    }
    ctx.fillStyle = 'rgba(107,91,149,0.35)'; ctx.fillRect(x0, spine - 1, x1 - x0, 2);
    return { x: x0 + 10, y: ey - 3 };
  }
  function backPage(a) { // 後半頁：大大的 Aa Bb Cc
    if (a <= 0) return;
    const { x0, back, spine } = BOOK;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#3d2d84'; ctx.font = `700 17px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ['Aa', 'Bb', 'Cc'].forEach((s, i) => ctx.fillText(s, x0 + 18 + i * 32, (back + spine) / 2 + 1));
    ctx.restore();
  }
  function frontPage(a) { // 前半頁：三個圖框（青蘋果、球、貓）
    const { x0, spine, front } = BOOK, cy = (spine + front) / 2;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(107,91,149,0.6)'; ctx.lineWidth = 1.5;
    [0, 1, 2].forEach(i => ctx.strokeRect(x0 + 8 + i * 32, spine + 3, 22, front - spine - 6));
    ctx.fillStyle = '#2fa59a'; ctx.beginPath(); ctx.arc(x0 + 19, cy + 1, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6b442c'; ctx.beginPath(); ctx.moveTo(x0 + 19, cy - 5); ctx.lineTo(x0 + 20, cy - 8); ctx.stroke();
    ctx.fillStyle = '#d9a24a'; ctx.beginPath(); ctx.arc(x0 + 51, cy, 6.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff4d6'; ctx.beginPath(); ctx.moveTo(x0 + 45, cy); ctx.lineTo(x0 + 57, cy); ctx.stroke();
    ctx.fillStyle = '#8f80cf'; ctx.beginPath(); ctx.arc(x0 + 83, cy + 1, 5.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0 + 78, cy - 2); ctx.lineTo(x0 + 79, cy - 8); ctx.lineTo(x0 + 82, cy - 4); ctx.moveTo(x0 + 88, cy - 2); ctx.lineTo(x0 + 87, cy - 8); ctx.lineTo(x0 + 84, cy - 4); ctx.fill();
    ctx.restore();
  }
  // 拿在手上的書：直立（書背朝外）→ 放到桌上時倒下變成平放
  function heldBook(c, k) {
    const th = lerp(20, BOOK.front - BOOK.spine, k), len = lerp(70, BOOK.x1 - BOOK.x0, k);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.PI / 2 * E.inOut(k));
    ctx.fillStyle = C.red; roundRect(-th / 2, -len / 2, th, len, 3); ctx.fill();
    ctx.fillStyle = C.gold; ctx.globalAlpha = 1 - k; ctx.fillRect(-th / 2, -len / 2 + 10, th, 4); ctx.fillRect(-th / 2, len / 2 - 16, th, 4);
    ctx.restore();
  }
  // ---------- 筆記本與手寫字 ----------
  function notebook() {
    const { x0, x1, y0, y1 } = NOTE;
    ctx.fillStyle = 'rgba(8,5,30,0.25)'; roundRect(x0 + 2, y0 + 3, x1 - x0, y1 - y0, 3); ctx.fill();
    ctx.fillStyle = '#6b5b95'; roundRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, 3); ctx.fill();
    ctx.fillStyle = '#f1ecff'; roundRect(x0, y0, x1 - x0, y1 - y0, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(143,128,207,0.5)'; ctx.lineWidth = 1;
    [y0 + 8, WRITE.base + 0.5].forEach(y => { ctx.beginPath(); ctx.moveTo(x0 + 4, y); ctx.lineTo(x1 - 4, y); ctx.stroke(); });
    ctx.fillStyle = '#c9b8ff';
    for (let x = x0 + 6; x < x1; x += 9) { ctx.beginPath(); ctx.arc(x, y0 - 1, 2, 0, 7); ctx.fill(); }
  }
  let BOXES = null;
  const mkBoxes = () => { ctx.save(); ctx.font = `700 ${WRITE.size}px ${FONT}`; let x = WRITE.x; const o = LETTERS.map(l => { const w = ctx.measureText(l).width; const b = { x, w }; x += w + 4; return b; }); ctx.restore(); return o; };
  const letterBox = i => (BOXES || (BOXES = mkBoxes()))[i];
  const letterT = i => T.write + i * (T.letter + T.gap);
  function writing(t) {
    ctx.save(); ctx.font = `700 ${WRITE.size}px ${FONT}`; ctx.fillStyle = '#3d2d84'; ctx.textBaseline = 'alphabetic';
    LETTERS.forEach((l, i) => {
      const k = prog(t, letterT(i), letterT(i) + T.letter, E.lin); if (k <= 0) return;
      const b = letterBox(i);
      ctx.save(); ctx.beginPath(); ctx.rect(b.x - 2, WRITE.base - 30, (b.w + 4) * k, 40); ctx.clip();
      ctx.fillText(l, b.x, WRITE.base); ctx.restore();
    });
    ctx.restore();
  }
  function pencilTip(t) {
    for (let i = 0; i < LETTERS.length; i++) {
      const a = letterT(i), b = a + T.letter;
      if (t < a - T.gap) break;
      if (t < a) { // 筆尖移到下一個字母（稍微提起）
        const b0 = letterBox(i), pb = i ? letterBox(i - 1) : null, kk = prog(t, a - T.gap, a);
        const from = pb ? { x: pb.x + pb.w, y: WRITE.base - 6 } : { x: b0.x, y: WRITE.base - 10 };
        return { x: lerp(from.x, b0.x, kk), y: lerp(from.y, WRITE.base - 10, kk) - 4 * Math.sin(Math.PI * kk) };
      }
      if (t < b) { const b0 = letterBox(i), k = prog(t, a, b, E.lin); return { x: b0.x + b0.w * k, y: WRITE.base - 9 + 7 * Math.sin(k * Math.PI * 4 + i) }; }
    }
    if (t < letterT(0)) return { x: letterBox(0).x, y: WRITE.base - 10 };
    const last = letterBox(2);
    return { x: last.x + last.w + 3, y: WRITE.base - 6 };
  }
  const GRIP = 22;
  const gripOf = (tip, ang) => ({ x: tip.x + Math.cos(ang) * GRIP, y: tip.y + Math.sin(ang) * GRIP });
  function drawPencil(tip, ang) { // ang：從筆尖往筆尾的方向（弧度，0 = 朝右）
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, L = 58, w = 4.5;
    const p = d => ({ x: tip.x + ux * d, y: tip.y + uy * d });
    const a = p(9), b = p(L - 8), e = p(L), q = p(3.5);
    ctx.fillStyle = '#e3ad6e'; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(a.x + nx * w, a.y + ny * w); ctx.lineTo(a.x - nx * w, a.y - ny * w); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d2d84'; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(q.x + nx * 1.8, q.y + ny * 1.8); ctx.lineTo(q.x - nx * 1.8, q.y - ny * 1.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(a.x + nx * w, a.y + ny * w); ctx.lineTo(b.x + nx * w, b.y + ny * w); ctx.lineTo(b.x - nx * w, b.y - ny * w); ctx.lineTo(a.x - nx * w, a.y - ny * w); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a24a'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x - nx * w, b.y - ny * w); ctx.lineTo(a.x - nx * w, a.y - ny * w); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9b8ff'; ctx.beginPath(); ctx.moveTo(b.x + nx * w, b.y + ny * w); ctx.lineTo(e.x + nx * w, e.y + ny * w); ctx.lineTo(e.x - nx * w, e.y - ny * w); ctx.lineTo(b.x - nx * w, b.y - ny * w); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8f80cf'; ctx.beginPath(); ctx.arc(e.x, e.y, w, 0, 7); ctx.fill();
  }

  // ---------- 從書裡飄起來的 A B C ----------
  const FLOAT = [{ l: 'A', x: 1168, y: 474, c: C.gold }, { l: 'B', x: 1230, y: 444, c: '#fff4d6' }, { l: 'C', x: 1292, y: 474, c: '#8ce8d8' }];
  const FLOAT_T = 4.95;
  function floatingLetters(t) {
    FLOAT.forEach((f, i) => {
      const t0 = FLOAT_T + i * 0.2, k = prog(t, t0, t0 + 0.95, E.out); if (k <= 0) return;
      const src = { x: BOOK.x0 + 18 + i * 32, y: (BOOK.back + BOOK.spine) / 2 };
      const path = kk => ({ x: lerp(src.x, f.x, kk), y: lerp(src.y, f.y, kk) + 30 * Math.sin(Math.PI * kk) });
      const bob = 4 * Math.sin((t - t0) * 2.4 + i * 1.3) * k;
      const pos = path(k), sc = lerp(0.3, 1, k);
      if (k < 1) { ctx.fillStyle = `rgba(255,211,107,${0.7 * (1 - k)})`; for (let j = 1; j < 6; j++) { const q = path(Math.max(0, k - j * 0.05)); ctx.beginPath(); ctx.arc(q.x, q.y, 3.4 - j * 0.5, 0, 7); ctx.fill(); } }
      glow(pos.x, pos.y + bob, 48 * sc, 'rgba(255,211,107,0.32)');
      ctx.save(); ctx.translate(pos.x, pos.y + bob); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 1.6, 0, 1);
      ctx.font = `700 52px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = f.c; ctx.shadowColor = 'rgba(255,211,107,0.6)'; ctx.shadowBlur = 14;
      ctx.fillText(f.l, 0, 0); ctx.restore();
    });
  }

  // ---------- 人物 ----------
  function hands(p) { const J = joints(p, S); return [J.A1.hand, J.A2.hand]; }
  function withHands(p, t1, t2, k = 1) {
    const h = hands(p); const o = { ...p };
    if (t1) { o.h1x = lerp(h[0].x, t1.x, k); o.h1y = lerp(h[0].y, t1.y, k); o.b1 = -(p.face || 1); }
    if (t2) { o.h2x = lerp(h[1].x, t2.x, k); o.h2y = lerp(h[1].y, t2.y, k); o.b2 = -(p.face || 1); }
    return o;
  }
  const SITP = (x, extra = {}) => ({ ...SIT(x, G, SEAT_TOP), ...extra });
  const CHEST = (x, dy = 0) => ({ x: x + 50, y: 612 + dy });      // 抱書的位置（書的中心）
  const SHELF_GRAB = { x: SHELF_BOOK.x + 10, y: SHELF_BOOK.base - SHELF_BOOK.h / 2 + 6 };
  const BOOK_DESK = { x: (BOOK.x0 + BOOK.x1) / 2, y: (BOOK.spine + BOOK.front) / 2 };
  const RESTN = { x: 990, y: 688 }, RESTF = { x: 968, y: 680 };

  function person(t) {
    let p, book = null, pencil = null;
    if (t < T.walk1[1]) { // 走進房間到書櫃前
      const k = prog(t, T.walk1[0], T.walk1[1], q => q * (2 - q)); const x = lerp(40, SHELF_X, k);
      p = walk(x, G, (x - 40) / 92 * Math.PI, 1 - prog(t, 0.85, 1.05));
    } else if (t < T.chest[1]) { // 伸手抽出紅色的書、抱到胸前
      const base = STAND(SHELF_X, G);
      const r = prog(t, T.reach[0], T.reach[1]);
      const m = prog(t, T.pull[0], T.chest[1]);
      const bc = { x: lerp(SHELF_BOOK.x + SHELF_BOOK.w / 2, CHEST(SHELF_X).x, m), y: lerp(SHELF_BOOK.base - SHELF_BOOK.h / 2, CHEST(SHELF_X).y, m) + 10 * Math.sin(Math.PI * m) };
      const h1 = t < T.pull[0] ? SHELF_GRAB : { x: bc.x + 2, y: bc.y + 8 };
      const two = prog(t, T.pull[1], T.chest[1]);
      p = withHands({ ...base, hd: -6 * r * (1 - m) }, h1, { x: bc.x - 6, y: bc.y + 14 }, t < T.pull[0] ? r : 1);
      if (two < 1) { p.h2x = lerp(hands(base)[1].x, bc.x - 6, two); p.h2y = lerp(hands(base)[1].y, bc.y + 14, two); }
      if (t >= T.pull[0]) book = { c: bc, k: 0 };
    } else if (t < T.walk2[1]) { // 抱著書走到書桌
      const k = prog(t, T.walk2[0], T.walk2[1]); const x = lerp(SHELF_X, STAND_X, k);
      const w = walk(x, G, (x - SHELF_X) / 92 * Math.PI, Math.sin(Math.PI * k));
      const dy = w.y - (G - 146);
      const bc = { x: CHEST(x).x, y: CHEST(x).y + dy };
      p = { ...w, h1x: bc.x + 2, h1y: bc.y + 8, b1: -1, h2x: bc.x - 6, h2y: bc.y + 14, b2: -1 };
      book = { c: bc, k: 0 };
    } else if (t < T.sit[0]) { // 彎腰把書平放在桌上
      const k = prog(t, T.place[0], T.place[1]);
      const back = prog(t, T.place[1], T.sit[0]);
      const base = { ...STAND(STAND_X, G), tor: 22 * Math.sin(Math.PI * Math.min(1, k * 0.5 + back * 0.5)) };
      const c0 = CHEST(STAND_X), bc = { x: lerp(c0.x, BOOK_DESK.x, k), y: lerp(c0.y, BOOK_DESK.y, k) - 14 * Math.sin(Math.PI * k) };
      const w = lerp(20, BOOK.x1 - BOOK.x0, k);
      const hold1 = { x: bc.x - w / 2 + 8, y: bc.y + lerp(8, 2, k) }, hold2 = { x: bc.x - w / 2 + 2, y: bc.y + lerp(14, 4, k) };
      if (t < T.place[1]) { p = withHands(base, hold1, hold2, 1); book = { c: bc, k }; }
      else p = withHands(base, { x: BOOK.x0 + 8, y: BOOK_DESK.y + 2 }, { x: BOOK.x0 + 2, y: BOOK_DESK.y + 4 }, 1 - back);
    } else if (t < T.sit[1]) { // 坐下
      const k = prog(t, T.sit[0], T.sit[1]);
      p = mix(STAND(STAND_X, G), SITP(CHAIR_OUT, { a1: 20, e1: 40, a2: 14, e2: 34 }), k);
    } else if (t < T.scoot[1] + 0.02) { // 雙手抓椅面往前挪，把椅子塞好
      const c = chairX(t), lift = 4 * Math.sin(Math.PI * prog(t, T.scoot[0], T.scoot[1]));
      const base = SITP(c, { y: SEAT_TOP - 12 - lift });
      const k = prog(t, T.sit[1] - 0.1, T.scoot[0]);
      p = withHands(base, { x: c + 46, y: SEAT_TOP + 2 }, { x: c + 38, y: SEAT_TOP + 2 }, k);
    } else {
      const x = CHAIR_SIT, c = x;
      const settle = prog(t, T.scoot[1], T.scoot[1] + 0.25);
      // 頭與身體
      const lean = prog(t, T.coverReach[0], T.coverReach[1]) * (1 - prog(t, T.flip[1], T.flip[1] + 0.3));
      const look = prog(t, 5.05, 5.5) * (1 - prog(t, 5.85, 6.2));
      const wr = prog(t, T.pencil[0], T.write);
      const up = prog(t, T.lookUp[0], T.lookUp[1]);
      const nodK = t >= T.nod[0] && t < T.nod[1] ? Math.max(0, Math.sin((t - T.nod[0]) / (T.nod[1] - T.nod[0]) * Math.PI * 4)) : 0;
      let hd = 6 + 8 * lean - 16 * look + 14 * wr;
      hd = lerp(hd, 0, up) + 10 * nodK;
      let tor = 8 + 6 * lean + 5 * wr - 5 * up;
      const idle = t > 10 ? Math.sin((t - 10) * 1.6) : 0;
      const base = SITP(x, { tor, hd: hd + 1.5 * idle, y: SEAT_TOP - 12 + 1.2 * idle });
      // 近手（A1）：抓椅面 → 放桌上 → 按燈 → 翻封面 → 拿鉛筆寫字
      let h1 = { x: lerp(c + 46, RESTN.x, settle), y: lerp(SEAT_TOP + 2, RESTN.y, settle) };
      const lr = prog(t, T.lampReach[0], T.lampReach[1]) * (1 - prog(t, T.click + 0.1, T.click + 0.3));
      if (lr > 0) h1 = { x: lerp(h1.x, LAMP.btn.x, lr), y: lerp(h1.y, LAMP.btn.y - 6, lr) };
      if (t >= T.coverReach[0] && t < T.flip[1] + 0.3) {
        const edge = coverEdge(t), k = prog(t, T.coverReach[0], T.coverReach[1]), rel = prog(t, T.flip[1], T.flip[1] + 0.3);
        const e = { x: lerp(RESTN.x, edge.x, k), y: lerp(RESTN.y, edge.y, k) };
        h1 = { x: lerp(e.x, RESTN.x, rel), y: lerp(e.y, RESTN.y, rel) };
      }
      if (t >= T.pencil[0] - 0.3) {
        const reach = prog(t, T.pencil[0] - 0.3, T.pencil[0]);
        const g0 = gripOf(PENCIL0.tip, PENCIL0.ang);
        if (t < T.pencil[0]) h1 = { x: lerp(RESTN.x, g0.x, reach), y: lerp(RESTN.y, g0.y - 4, reach) };
        else if (t >= T.down[0]) { // 寫完把鉛筆放回筆記本右邊，手收回桌邊
          const dk = prog(t, T.down[0], T.down[1]), back = prog(t, T.down[1], T.down[1] + 0.3);
          const tw = pencilTip(t);
          const tip = { x: lerp(tw.x, REST_TIP.x, dk), y: lerp(tw.y, REST_TIP.y, dk) - 10 * Math.sin(Math.PI * dk) };
          const ang = lerp(-1.95, REST_ANG, dk);
          pencil = { tip, ang }; const g = gripOf(tip, ang); h1 = { x: g.x, y: g.y - 4 * (1 - dk) };
        }
        else {
          const pk = prog(t, T.pencil[0], T.pencil[1]);
          const tipW = pencilTip(t);
          const ang = lerp(PENCIL0.ang, -1.95, pk);
          const tip = { x: lerp(PENCIL0.tip.x, tipW.x, pk), y: lerp(PENCIL0.tip.y, tipW.y, pk) - 16 * Math.sin(Math.PI * pk) };
          pencil = { tip, ang };
          const g = gripOf(tip, ang); h1 = { x: g.x, y: g.y - 4 };
        }
      }
      // 遠手（A2）：壓著筆記本左邊
      const h2 = { x: lerp(c + 38, RESTF.x, settle), y: lerp(SEAT_TOP + 2, RESTF.y, settle) };
      p = withHands(base, h1, h2, 1);
    }
    p.gy = G;
    return { p, book, pencil };
  }
  function coverEdge(t) {
    const th = flipAng(t);
    return { x: BOOK.x0 + 10, y: BOOK.spine + (BOOK.front - BOOK.spine) * Math.cos(th) - 38 * Math.sin(th) - 2 };
  }

  // ---------- 鏡頭 ----------
  const CAM = [
    [0, { z: 1.2, fx: 860, fy: 620, sx: 960, sy: 600 }],
    [2.6, { z: 1.25, fx: 880, fy: 625, sx: 960, sy: 600 }],
    [4.0, { z: 1.5, fx: 985, fy: 640, sx: 960, sy: 640 }],
    [6.2, { z: 1.62, fx: 990, fy: 645, sx: 960, sy: 650 }],
    [8.6, { z: 1.62, fx: 990, fy: 645, sx: 960, sy: 650 }],
    [10, { z: 1.52, fx: 995, fy: 640, sx: 960, sy: 660 }],
  ];

  function draw(c, t) {
    const cam = FT.keyed(CAM, t);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(cam.sx, cam.sy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.fx, -cam.fy);
    room(t); shelfBook(t);
    chair(chairX(t));
    desk(); deskDecor();
    lamp(t);
    notebook(); writing(t);
    if (t < T.pencil[0]) drawPencil(PENCIL0.tip, PENCIL0.ang);
    if (t >= T.place[1]) deskBook(t);
    const P = person(t);
    const J = figure(P.p, S, 'hero');
    if (P.pencil) drawPencil(P.pencil.tip, P.pencil.ang);
    if (P.book) { // 書在手上：畫在身體前面，近手再蓋回書上
      heldBook(P.book.c, P.book.k);
      ctx.fillStyle = C.hero; ctx.beginPath(); ctx.arc(J.A1.hand.x, J.A1.hand.y, 9.5 * S, 0, 7); ctx.fill();
    }
    const on = lampOn(t);
    ctx.fillStyle = `rgba(8,5,32,${0.30 * (1 - on)})`; ctx.fillRect(0, 0, 1920, 1080);
    lampLight(t);
    floatingLetters(t);
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'study', verb: true }, { w: 'English' }], draw };
})();
