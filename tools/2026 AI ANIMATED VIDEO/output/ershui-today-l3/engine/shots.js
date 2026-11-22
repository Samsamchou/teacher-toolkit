// shots.js — 〈二水三景點〉逐句鏡頭表（句號 i 對應 timeline.lines[i]，文字稿見 Google 文件）
// 程式畫面：位置地圖（2.5D 傾斜）、集集線二水→源泉、站名翻牌、時間軸、月曆、花旗木位置圖（3D-B 未完成前的暫代）、黑板字卡。

// ---- 共用小畫 ----
function sky(c, top = '#8fd0ff', bot = '#e8f6ff') { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function blurBg(c, key, a = .55) { c.save(); c.filter = 'blur(14px) brightness(1.05)'; c.drawImage(IMG[key] || OFF, -40, -30, W + 80, H + 60); c.filter = 'none'; c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(0, 0, W, H); c.restore(); }
function thumb(c, key, x, y, w, k, name, en) { // 景點小圖卡
  if (k <= 0) return; const h = w * 9 / 16;
  c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = clamp(k * 1.5);
  rrect(c, -w / 2 - 12, -h / 2 - 12, w + 24, h + 120, 22); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.save(); rrect(c, -w / 2, -h / 2, w, h, 14); c.clip(); if (IMG[key]) c.drawImage(IMG[key], -w / 2, -h / 2, w, h); c.restore();
  text(c, name, 0, h / 2 + 40, 40, { color: INK, stroke: false });
  if (en) text(c, en, 0, h / 2 + 86, 32, { color: '#2f6b3f', stroke: false, font: EN, weight: 700 });
  c.restore();
}
function locoIcon(c, x, y, s, color = '#222', hot = false) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = color; c.strokeStyle = hot ? '#ffd84a' : INK; c.lineWidth = hot ? 8 : 4;
  rrect(c, -90, -40, 120, 60, 10); c.fill(); c.stroke(); rrect(c, 20, -70, 60, 90, 8); c.fill(); c.stroke();
  c.fillRect(-70, -75, 22, 36); c.beginPath(); c.arc(-95, -10, 28, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#fff'; for (const wx of [-60, -15, 40]) { c.beginPath(); c.arc(wx, 28, 20, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = color; c.stroke(); }
  c.restore();
}
function steamPuffs(c, x, y, t, n = 6, s = 1) { // 白煙
  c.save(); for (let i = 0; i < n; i++) { const ph = (t * .5 + i / n) % 1; c.globalAlpha = (1 - ph) * .75; c.fillStyle = '#fff';
    c.beginPath(); c.arc(x - ph * 260 * s, y - ph * 200 * s, (30 + ph * 90) * s, 0, 7); c.fill(); } c.restore();
}

// ---- 2.5D 傾斜地圖：二水車站 → 二八水水公園（約 300 公尺） ----
function mapErshui(c, lt, d) {
  sky(c, '#bfe3ff', '#f4fbff');
  const tilt = lerp(0, .52, ease(prog(lt, 0, 1.4)));            // 由正上方慢慢傾斜成 2.5D
  const sy = 1 - tilt * .55; c.save(); c.translate(W / 2, 520); c.transform(1, 0, 0, sy, 0, 0);
  c.fillStyle = '#cfe8b0'; rrect(c, -880, -520, 1760, 1040, 40); c.fill();
  c.fillStyle = '#bcbcbc'; c.fillRect(-880, 120, 1760, 30); c.fillRect(-880, 165, 1760, 30);  // 縱貫線鐵道
  c.strokeStyle = '#6b6b6b'; c.lineWidth = 3; for (let x = -880; x < 880; x += 26) { c.beginPath(); c.moveTo(x, 118); c.lineTo(x, 197); c.stroke(); }
  c.fillStyle = '#f2efe6'; c.fillRect(-120, -60, 60, 500);                                   // 街道
  c.fillRect(-880, -80, 1760, 50);
  // 車站
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 6; rrect(c, -380, 40, 300, 70, 10); c.fill(); c.stroke();
  c.fillStyle = '#e0a21a'; c.fillRect(-380, 40, 300, 14);
  // 公園
  c.fillStyle = '#8fd17a'; rrect(c, 160, -400, 520, 300, 40); c.fill(); c.stroke();
  for (const [tx, ty] of [[220, -350], [620, -360], [640, -150], [200, -140]]) { c.fillStyle = '#3f9a45'; c.beginPath(); c.arc(tx, ty, 34, 0, 7); c.fill(); }
  locoIcon(c, 420, -250, .7);
  // 路線虛線（逐步畫出）
  const P = [[-230, 40], [-230, -55], [-90, -55], [-90, -250], [160, -250]];
  const k = ease(prog(lt, 1.2, d * .7)); let tot = 0; const segs = [];
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segs.push(l); tot += l; }
  c.setLineDash([26, 18]); c.lineWidth = 16; c.strokeStyle = '#ff6b3d'; c.lineCap = 'round'; c.beginPath(); c.moveTo(...P[0]);
  let left = tot * k; for (let i = 1; i < P.length && left > 0; i++) { const f = Math.min(1, left / segs[i - 1]); c.lineTo(lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)); left -= segs[i - 1]; }
  c.stroke(); c.setLineDash([]); c.restore();
  const P2 = (x, y) => [W / 2 + x, 520 + y * sy];
  label(c, '二水車站', ...P2(-230, 200), 46, pop(lt, .6), { bg: '#fff' });
  label(c, '二八水水公園', ...P2(420, -40), 46, pop(lt, 1.0), { bg: '#d9f2c9' });
  label(c, '走路約 300 公尺', ...P2(-330, -160), 52, pop(lt, d * .7), { bg: '#ffe36e' });
}

// ---- 集集線 二水 → 源泉（2.9 公里，約 5 分鐘） ----
function mapLine(c, lt, d) {
  sky(c, '#d8f0ff', '#f6fbff');
  const x0 = 360, x1 = 1560, y = 520, k = ease(prog(lt, .6, d * .8));
  c.save(); c.lineCap = 'round'; c.strokeStyle = '#7a5a3a'; c.lineWidth = 26; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.setLineDash([30, 24]); c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.setLineDash([]);
  c.strokeStyle = '#bbb'; c.lineWidth = 12; c.beginPath(); c.moveTo(x1, y); c.lineTo(1840, y - 60); c.stroke();
  for (const [x, n] of [[x0, '二水'], [x1, '源泉']]) { c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.arc(x, y, 38, 0, 7); c.fill(); c.stroke(); text(c, n, x, y + 100, 60, { color: INK, stroke: false }); }
  // 小火車（黃色車頭）
  const tx = lerp(x0, x1, k); c.save(); c.translate(tx, y - 54); rrect(c, -90, -40, 180, 80, 16); c.fillStyle = '#f5c400'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#2b3a55'; c.fillRect(30, -24, 44, 26); c.fillStyle = '#e05a1e'; c.fillRect(-90, 14, 180, 10); c.restore();
  c.restore();
  text(c, '集集線', 960, 300, 64, { color: '#2f6b3f', stroke: false });
  label(c, '2.9 公里', 960, 640, 50, pop(lt, 1.0), { bg: '#fff' });
  // 時鐘 5 分鐘
  const cx = 300, cy = 250, a = -Math.PI / 2 + k * Math.PI * 2 * (5 / 60);
  c.save(); c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy, 110, 0, 7); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,107,61,.45)'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 100, -Math.PI / 2, a); c.closePath(); c.fill();
  c.strokeStyle = INK; c.lineWidth = 10; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 85, cy + Math.sin(a) * 85); c.stroke(); c.restore();
  label(c, '約 5 分鐘', cx, cy + 170, 44, pop(lt, d * .6), { bg: '#ffe36e' });
}

// ---- 站名翻牌：鼻仔頭 → 源泉（1962） ----
function signFlip(c, lt, d) {
  blurBg(c, 'B07', .35);
  const f = prog(lt, d * .45, d * .45 + .6), sx = Math.abs(Math.cos(f * Math.PI)), name = f < .5 ? '鼻仔頭' : '源泉';
  c.save(); c.translate(960, 470); c.scale(sx, 1);
  rrect(c, -380, -170, 760, 300, 26); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 10; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#2f8a4a'; c.fillRect(-372, 60, 744, 62);
  text(c, name.split('').join(' '), 0, -50, 120, { color: '#222', stroke: false }); c.restore();
  c.fillStyle = '#666'; c.fillRect(700, 600, 18, 260); c.fillRect(1202, 600, 18, 260);
  label(c, '1962 年改名', 960, 200, 54, pop(lt, d * .45 + .5), { bg: '#ffe36e' });
}

// ---- 時間軸：一台台蒸汽火車，最後一台是 CT278 ----
function lastSteam(c, lt, d) {
  sky(c, '#fff3dc', '#fffaf0');
  c.fillStyle = '#8a6a4a'; c.fillRect(0, 640, W, 16);
  for (let i = 0; i < 6; i++) { const k = pop(lt, .2 + i * .28); if (k <= 0) continue;
    const last = i === 5; const x = 230 + i * 300; c.save(); c.globalAlpha = last ? 1 : .55; locoIcon(c, x, 590, last ? 1.05 : .8, last ? '#111' : '#555', last && lt > 2.2); c.restore();
    if (last) label(c, 'CT278', x, 420, 48, pop(lt, 2.0), { bg: '#b5302c', color: '#fff' }); }
  label(c, '台灣最後買進的蒸汽火車', 960, 220, 56, pop(lt, 2.4), { bg: '#fff' });
  sparkle(c, 1730, 470, 70, lt, 2.3, .9);
}

// ---- 花旗木位置圖（3D-B 完成前的暫代畫面：正上方看 S 型彎） ----
function cassiaMap(c, lt, d, part) {
  sky(c, '#d9efc9', '#eef8e6');
  const tr = t => [lerp(140, 1780, t), 430 + Math.sin(t * Math.PI * 1.6 - .4) * 120];
  const path = (off, w, color, dash) => { c.save(); c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; if (dash) c.setLineDash(dash); c.beginPath();
    for (let i = 0; i <= 60; i++) { const [x, y] = tr(i / 60); i ? c.lineTo(x, y + off) : c.moveTo(x, y + off); } c.stroke(); c.restore(); };
  path(150, 70, '#d9d4cc');                    // 152 縣道
  path(90, 46, '#b9b9b9');                     // 自行車道
  path(62, 7, '#2f7a4a');                      // 綠色欄杆
  path(0, 30, '#8a6a4a'); path(0, 10, '#ddd', [18, 14]);   // 集集線（一條）
  // 一排花旗木（源泉車站往東到派出所，約 500 m）
  const grow = ease(prog(lt, .4, 2.0));
  for (let i = 0; i <= 22; i++) { const t = .18 + i * .62 / 22; if (i / 22 > grow) break; const [x, y] = tr(t);
    c.fillStyle = '#f6a6c1'; c.beginPath(); c.arc(x, y + 116, 30, 0, 7); c.fill(); c.fillStyle = '#ffd2e1'; c.beginPath(); c.arc(x - 8, y + 108, 14, 0, 7); c.fill(); }
  const [sx, sy] = tr(.16), [px, py] = tr(.82);
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 6; rrect(c, sx - 70, sy - 80, 140, 50, 10); c.fill(); c.stroke();
  rrect(c, px - 50, py + 170, 100, 70, 10); c.fillStyle = '#cfe0ff'; c.fill(); c.stroke();
  label(c, '源泉車站', sx, sy - 140, 42, pop(lt, .2), { bg: '#fff' });
  label(c, '源泉派出所', px + 170, py + 210, 42, pop(lt, .5), { bg: '#fff' });
  label(c, '集集線', tr(.5)[0], tr(.5)[1] - 70, 40, pop(lt, .8), { bg: '#f1e2c8' });
  label(c, '自行車道', tr(.36)[0] - 60, tr(.36)[1] + 200, 38, pop(lt, 1.1), { bg: '#eee' });
  if (part === 1) label(c, '約 500 公尺，60 多棵花旗木', 960, 130, 52, pop(lt, 2.2), { bg: '#ffe36e' });
  if (part === 2) {
    label(c, '車站裡面 ×', 520, 200, 46, pop(lt, .6), { bg: '#ffd9d9' });
    label(c, '另一條鐵路 ×', 980, 200, 46, pop(lt, 1.6), { bg: '#ffd9d9' });
    label(c, '集集線旁的自行車道 ○', 1480, 200, 46, pop(lt, 2.8), { bg: '#d7f5d0' });
  }
}

// ---- 月曆：3 月中～4 月上旬 ----
function calendar(c, lt, d) {
  blurBg(c, 'B08', .6);
  const k = prog(lt, .8, 2.2);
  for (let m = 0; m < 12; m++) { const x = 330 + (m % 6) * 252, y = 330 + Math.floor(m / 6) * 270;
    const hot = m === 2 || m === 3; c.save(); c.globalAlpha = hot ? 1 : .55;
    rrect(c, x - 110, y - 110, 220, 220, 22); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
    c.fillStyle = '#e8e8e8'; c.fillRect(x - 104, y - 104, 208, 56);
    if (hot) { const f = m === 2 ? [.5, 1] : [0, .33]; c.fillStyle = '#ff8fb6'; c.fillRect(x - 100 + 200 * f[0], y - 30, 200 * (f[1] - f[0]) * clamp(k * 2 - (m === 3 ? 1 : 0)), 120); }
    text(c, `${m + 1} 月`, x, y - 74, 40, { color: INK, stroke: false }); c.restore(); }
  label(c, '3 月中 ～ 4 月上旬', 960, 120, 60, pop(lt, 2.0), { bg: '#ffd2e1' });
}

// ---- 拼貼回顧 ----
function collage(c, lt, d, hi = -1, extra) {
  sky(c, '#fff6e0', '#fffdf6');
  const items = [['B03', '二八水水公園', 'water park'], ['B07', '源泉車站', 'station'], ['B08', '二水花旗木鐵道', 'railway']];
  items.forEach(([k, n, e], i) => { const big = hi === i ? 1.12 : 1; thumb(c, k, 380 + i * 580, 430, 460 * big, pop(lt, .2 + i * .25), n, e); });
  extra && extra(c, lt, d);
}
function collageHi(lt) { // 第 27 句：說到哪個景點就放大
  const ln = L(27); const f = (lt) / (ln.t1 - ln.t0); return f < .25 ? -1 : f < .55 ? 0 : f < .8 ? 1 : 2;
}

// ---- 黑板英文帶念 ----
function board(c) {
  c.fillStyle = '#7a5332'; c.fillRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2f5d48'); g.addColorStop(1, '#244a3a');
  c.fillStyle = g; rrect(c, 40, 40, W - 80, H - 80, 20); c.fill();
}
function wordCard(c, w, lt, d) {
  const flip = prog(lt, 0, .7), sx = Math.abs(Math.cos(flip * Math.PI)), front = flip >= .5;
  c.save(); c.translate(960, 440); c.scale(Math.max(.02, sx), 1);
  rrect(c, -430, -320, 860, 640, 34); c.fillStyle = front ? '#fffbe8' : '#ffd84a'; c.fill(); c.lineWidth = 10; c.strokeStyle = INK; c.stroke();
  if (front) { const key = w.img.split(' ')[0];
    c.save(); rrect(c, -390, -280, 780, 400, 20); c.clip(); if (IMG[key]) { const im = IMG[key]; const cw = im.width, ch = im.width * 400 / 780; c.drawImage(im, 0, (im.height - ch) / 2, cw, ch, -390, -280, 780, 400); } c.restore();
    text(c, w.word, 0, 210, 110, { color: '#2f6b3f', stroke: false, font: EN, weight: 700 }); }
  else text(c, '?', 0, 0, 260, { color: INK, stroke: false });
  c.restore();
}

function buildShots() {
  const T = TL;
  // 1 嗨！我們是二水探索隊
  imgShot(0, LE(1), 'B01', [768, 432, 1.15], [768, 440, 1.0], null, null, (c, lt) => {
    chr(c, '21', 520, 1040, 560, pop(lt, .9, .45), lt); chr(c, '13', 900, 1050, 590, pop(lt, 1.3, .45), lt); chr(c, '29', 1360, 1040, 330, pop(lt, 1.8, .45), lt);
  });
  // 2 三個景點
  shot(LS(2), LE(2), (c, lt) => { sky(c, '#ffeeb8', '#fffaf0');
    [['B03', '二八水水公園', 'water park'], ['B07', '源泉車站', 'station'], ['B08', '二水花旗木鐵道', 'railway']].forEach(([k, n, e], i) => thumb(c, k, 380 + i * 580, 430, 460, pop(lt, .4 + i * .7), n, e)); });
  // 3 從二水車站走約 300 公尺（2.5D 傾斜地圖；3D-A 小行星空拍完成後接在後段）
  const m3 = LS(3) + 2.3;
  shot(LS(3), m3, (c, lt, d) => mapErshui(c, lt + 1.2, d + 1.2));
  shot(m3, LE(3), (c, lt, d) => { // 3D-A：沿真實街道從二水車站飛到二八水水公園（二水小行星模型，已拿掉虛構的鐵道博物館）
    const n = A3D.length, f = Math.min(n - 1, Math.floor(lt * 30)), im = IMG['a' + f];
    if (im) c.drawImage(im, 0, 0, W, H); const L3 = A3D[f];
    const lab = (id, s, bg, k) => { const q = L3[id]; if (!q || q[2] || q[0] < .03 || q[0] > .97 || q[1] < .05 || q[1] > .8) return; label(c, s, q[0] * W, q[1] * H - 70, 46, k, { bg, tail: true }); };
    lab('station', '二水車站', '#fff', clamp(1 - prog(lt, 2.2, 2.6)) * pop(lt, .2));
    lab('waterpark', '二八水水公園', '#d9f2c9', pop(lt, d * .55));
    label(c, '走路約 300 公尺', 560, 170, 50, pop(lt, 1.6) * clamp(1 - prog(lt, d - .6, d - .2)), { bg: '#ffe36e' }); });
  // 4 公園有大草地和遊樂場
  imgShot(LS(4), LE(4), 'B02', [768, 432, 1.0], [700, 470, 1.12], null, null, (c, lt) => chr(c, '15', 1420, 1050, 560, pop(lt, .4), lt));
  // 5 兩台黑色火車頭（B03 寫實版，教師 11/22 選）
  imgShot(LS(5), LE(5), 'B03', [560, 470, 1.3], [980, 450, 1.25], null, null, (c, lt) => chr(c, '22', 300, 1050, 540, pop(lt, .5), lt));
  // 6 以前燒煤、會冒白煙
  imgShot(LS(6), LE(6), 'B04', [768, 432, 1.0], [700, 420, 1.12], (c, lt) => steamPuffs(c, 600, 260, lt, 7, 1.2), 'sepia(.2)');
  // 7 大的 CT278、小的台糖火車頭
  imgShot(LS(7), LE(7), 'B03', [768, 450, 1.0], [768, 440, 1.04], null, null, (c, lt, d) => {
    label(c, 'CT278', 1360, 330, 50, pop(lt, .6), { bg: '#b5302c', color: '#fff', tail: true });
    label(c, '台糖 345', 470, 380, 46, pop(lt, d * .5), { bg: '#fff', tail: true });
  });
  // 8 1953 年從日本買來
  imgShot(LS(8), LE(8), 'B03', [1080, 420, 1.6], [1100, 400, 1.9], null, null, (c, lt) => label(c, '1953 年', 420, 260, 72, pop(lt, .6), { bg: '#ffe36e' }));
  // 9 台灣最後買進的蒸汽火車
  shot(LS(9), LE(9), (c, lt, d) => lastSteam(c, lt, d));
  // 10 退休了停在公園
  imgShot(LS(10), LE(10), 'B02', [900, 470, 1.3], [768, 432, 1.0], null, null, (c, lt) => { chr(c, '37', 1380, 1050, 520, pop(lt, .5), lt); chr(c, '30', 1700, 1040, 300, pop(lt, .9), lt); });
  // 11 坐集集線約五分鐘到源泉：路線圖 → 車窗
  const m11 = LS(11) + (LE(11) - LS(11)) * .62;
  shot(LS(11), m11, (c, lt, d) => mapLine(c, lt, d));
  imgShot(m11, LE(11), 'B05', [700, 432, 1.08], [840, 432, 1.08]);
  // 12 鼻仔頭 → 源泉
  shot(LS(12), LE(12), (c, lt, d) => signFlip(c, lt, d));
  // 13 八堡圳源頭
  imgShot(LS(13), LE(13), 'B06', [600, 450, 1.15], [700, 450, 1.2], null, null, (c, lt, d) => {
    chr(c, lt < d * .55 ? '18' : '19', 1560, 1050, 540, pop(lt, .3), lt); label(c, '八堡圳的源頭', 620, 200, 54, pop(lt, d * .5), { bg: '#d6efff' }); });
  // 14 濁水溪的水流進八堡圳、灌溉稻田
  imgShot(LS(14), LE(14), 'B06', [600, 450, 1.15], [1180, 450, 1.3], (c, lt) => {
    c.save(); c.strokeStyle = 'rgba(80,170,255,.85)'; c.lineWidth = 14; c.setLineDash([40, 30]); c.lineDashOffset = -lt * 120; c.lineCap = 'round';
    c.beginPath(); c.moveTo(200, 700); c.quadraticCurveTo(800, 640, 1450, 560); c.stroke(); c.restore(); });
  // 15 源泉車站很小，沒有站房、沒有站務員
  imgShot(LS(15), LE(15), 'B07', [768, 432, 1.0], [740, 440, 1.1], null, null, (c, lt) => chr(c, '23', 330, 1050, 540, pop(lt, .4), lt));
  // 16 無人車站
  imgShot(LS(16), LE(16), 'B07', [740, 440, 1.1], [760, 440, 1.15], null, null, (c, lt) => { label(c, '無人車站', 960, 200, 64, pop(lt, .5), { bg: '#ffe36e' }); chr(c, '33', 1680, 1040, 300, pop(lt, .3), lt); });
  // 17 提早打電話給臺鐵
  imgShot(LS(17), LE(17), 'B07', [760, 440, 1.15], [768, 432, 1.05], null, null, (c, lt) => label(c, '☎ 需要幫忙，提早打電話', 960, 200, 54, pop(lt, .5), { bg: '#fff' }));
  // 18 第三個景點：二水花旗木鐵道
  imgShot(LS(18), LE(18), 'B08', [768, 432, 1.2], [768, 432, 1.0], null, null, (c, lt) => chr(c, '14', 1480, 1050, 540, pop(lt, .6), lt));
  // 19、20 花旗木位置（3D-B；未完成前用程式位置圖）
  // 3D-B（Colab Blender）：A 鏡頭 1–252 格＝第 19 句俯瞰；B 鏡頭 253–488 格＝第 20 句降到自行車道。沒有 3D 圖時退回 2.5D 位置圖。
  const b3d = (c, f, lt, d, part) => {
    const im = IMG['b' + f]; if (!im) { cassiaMap(c, lt + (part === 2 ? 3 : 0), d, part); return; }
    c.drawImage(im, 0, 0, W, H); const L3 = (typeof B3D !== 'undefined' && B3D[f]) || {};
    const lab = (k, s, bg, kk, dx = 0, dy = 0) => { const q = L3[k]; if (!q || q[2] <= 0 || q[0] < .04 || q[0] > .96 || q[1] < .08 || q[1] > .78) return; const ax = q[0] * W, ay = q[1] * H - 4; if (dx || dy) { c.save(); c.globalAlpha = clamp(kk); c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.moveTo(ax + dx, ay - 50 + dy); c.lineTo(ax, ay); c.stroke(); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(ax, ay, 9, 0, 7); c.fill(); c.restore(); }
      label(c, s, ax + dx, ay - 50 + dy, 40, kk, { bg, tail: !(dx || dy) }); };
    if (part === 1) {
      lab('源泉車站', '源泉車站', '#fff', pop(lt, .3)); lab('集集線', '集集線（一條）', '#f1e2c8', pop(lt, .9), 120, -150);
      lab('自行車道', '自行車道', '#eee', pop(lt, 1.5), -120, 260); lab('花旗木', '一排花旗木', '#ffd2e1', pop(lt, 2.1), 260, 230); lab('源泉派出所', '源泉派出所', '#d6e6ff', pop(lt, 2.7));
      label(c, '約 500 公尺，60 多棵花旗木', 960, 130, 52, pop(lt, 3.6), { bg: '#ffe36e' });
    } else {
      const k0 = clamp(1 - prog(lt, 3.0, 3.4));
      lab('欄杆', '欄杆', '#d7f5d0', pop(lt, .4) * k0); lab('集集線', '集集線', '#f1e2c8', pop(lt, .6) * k0); lab('自行車道', '自行車道', '#eee', pop(lt, .8) * k0);
      label(c, '車站裡面 ×', 520, 140, 46, pop(lt, .6), { bg: '#ffd9d9' });
      label(c, '另一條鐵路 ×', 980, 140, 46, pop(lt, 1.6), { bg: '#ffd9d9' });
      label(c, '集集線旁的自行車道 ○', 1480, 140, 46, pop(lt, 2.8), { bg: '#d7f5d0' });
    }
  };
  shot(LS(19), LS(20), (c, lt, d) => b3d(c, Math.min(252, 1 + Math.floor(lt * 30)), lt, d, 1));
  shot(LS(20), LE(20), (c, lt, d) => b3d(c, Math.min(488, 253 + Math.floor(lt * 30)), lt, d, 2));
  // 21 一串一串粉紅花 → 粉紅隧道
  const m21 = LS(21) + (LE(21) - LS(21)) * .45;
  imgShot(LS(21), m21, 'B09', [768, 432, 1.0], [768, 432, 1.12]);
  imgShot(m21, LE(21), 'B08', [900, 380, 1.3], [768, 432, 1.0], (c, lt) => { for (let i = 0; i < 26; i++) { const x = (i * 263 + lt * 60) % IW, y = (i * 151 + lt * 120) % IH;
    c.fillStyle = 'rgba(255,190,215,.9)'; c.beginPath(); c.ellipse(x, y, 9, 5, i, 0, 7); c.fill(); } });
  // 22 三月中到四月上旬
  shot(LS(22), LE(22), (c, lt, d) => calendar(c, lt, d));
  // 23 其他季節看不到粉紅花
  imgShot(LS(23), LE(23), 'B08', [768, 432, 1.0], [768, 432, 1.05], null, null, null);
  SHOTS[SHOTS.length - 1].draw = (c, lt, d) => { withCam(c, [768, 432, 1.02], () => { drawImg(c, 'B08');
    c.save(); c.globalAlpha = ease(prog(lt, .6, 2.0)); drawImg(c, IMG.B08g ? 'B08g' : 'B08'); c.restore(); }); };
  // 24 站在自行車道上、欄杆後面
  imgShot(LS(24), LE(24), 'B10', [768, 432, 1.0], [768, 432, 1.06], null, null, (c, lt) => bigMark(c, true, 1680, 400, 1, pop(lt, .8)));
  // 25 不可以走進鐵道
  imgShot(LS(25), LE(25), 'B11', [768, 432, 1.0], [700, 450, 1.12], null, null, (c, lt) => bigMark(c, false, 1680, 400, 1, pop(lt, .5)));
  // 26 危險、可能被罰錢
  imgShot(LS(26), LE(26), 'B11', [700, 450, 1.12], [700, 450, 1.15], null, null, (c, lt) => {
    const f = .5 + .5 * Math.sin(lt * 9); c.save(); c.strokeStyle = `rgba(226,59,59,${.5 + .5 * f})`; c.lineWidth = 26; c.strokeRect(13, 13, W - 26, H - 26); c.restore();
    bigMark(c, false, 1680, 400, 1, 1); chr(c, '34', 260, 1040, 320, pop(lt, .4), lt); });
  // 27 今天我們認識了三個景點
  shot(LS(27), LE(27), (c, lt, d) => collage(c, lt, d, collageHi(lt)));
  // 28 待在欄杆後面，安全最重要
  imgShot(LS(28), LE(28), 'B10', [768, 432, 1.0], [768, 432, 1.04], null, null, (c, lt) => { bigMark(c, true, 1680, 400, 1, pop(lt, .3)); chr(c, '19', 300, 1050, 540, pop(lt, .5), lt); });
  // 29 跟著我們一起念英文 → 六字帶念 → 30
  const W0 = T.words[0].t0 - .2;
  shot(LS(29), W0, (c, lt) => { board(c); text(c, 'Let’s read!', 960, 300, 120, { color: '#fff', stroke: false, font: EN, weight: 700 });
    chr(c, '21', 420, 1050, 620, pop(lt, .3), lt); chr(c, '13', 1500, 1050, 640, pop(lt, .6), lt); });
  T.words.forEach((w, k) => {
    const t1 = k + 1 < T.words.length ? T.words[k + 1].t0 - .2 : w.t1;
    shot(w.t0 - .2, t1, (c, lt, d, TT) => { board(c); wordCard(c, w, lt, d);
      const leadF = w.who === '女'; chr(c, leadF ? '21' : '13', leadF ? 230 : 1690, 1060, 520, 1, lt);
      const saying = w.say.some(([a, b]) => TT >= a && TT <= b + .1);
      const rep = w.say.some(([a, b]) => TT > b + .15 && TT < b + 1.9);
      if (saying) label(c, (leadF ? '女孩' : '男孩') + '：' + w.word, 960, 900, 48, 1, { bg: leadF ? '#5fb8ff' : '#ff9a3c', font: EN });
      if (rep) label(c, 'Repeat!  跟著念', 960, 900, 56, pop(TT - w.say.find(([a, b]) => TT > b)[1], .15), { bg: '#ffe36e', font: EN });
      text(c, `${k + 1} / 6`, 1790, 100, 40, { color: '#fff', stroke: false }); });
  });
  // 30 你最想去哪裡？ This is the ___.
  shot(T.words[T.words.length - 1].t1, LE(30), (c, lt, d) => collage(c, lt, d, -1, (c2, l2) => label(c2, 'This is the ___.', 960, 820, 64, pop(l2, .6), { bg: '#fffbe8', font: EN, color: '#2f6b3f' })));
  // 31 下次一起來二水探索吧！掰掰！
  imgShot(LS(31), T.dur + 1, 'B12', [768, 432, 1.08], [768, 440, 1.0], null, null, (c, lt) => {
    chr(c, '28', 520, 1040, 560, pop(lt, .2), lt); chr(c, '20', 900, 1050, 590, pop(lt, .4), lt); chr(c, '36', 1340, 1040, 360, pop(lt, .6), lt); });
}
