// 場景 03：Japan | on foot。歌曲 28.98–37.08 s（SRT 第 9–10 句）。本地時間 t 從 0 起算。
// 動作依原曲逐字時碼（engine/song-data.js → SONG.cues）編排，每個關鍵字都有對應畫面：
//   He's(0) from Japan(1.02)        → 男孩走在日本住宅街（電線桿、矮牆、櫻花、自動販賣機），頭上跳出日本國旗泡泡
//   He goes to school(3.12)         → 前方「SCHOOL ➜」路標在 "school" 彈跳
//   on(3.52) foot(3.98)             → 「on foot」字卡；從 "on" 起每一步在地上留下發光腳印，"foot" 時腳印最亮
//   Step(4.58), step(5.60), step(5.78)! → 三個誇張大步跨上斑馬線，每個 "step" 剛好落地：腳印印章＋塵土＋數字 1/2/3＋畫面一震
//   The(6.20) day(6.74) feels(7.12) good(7.62)! → 停步、抬頭看太陽（太陽在 "day" 笑開放光），"feels" 雙手歡呼、"good" 跳起＋星星
// 對嘴：第一句是旁白式第三人稱（He's…），男孩不開口只微笑點頭；第二句（Step… feels good!）才跟原曲對嘴。
// 嘴型資料：scenes/s03-japan-foot.lipsync.js（lipsync/song_lipsync.py --start 28.98 --dur 8.10）
const CH_JP = CAST.JP;
const WT3 = { japan: 1.02, he: 1.70, goes: 2.64, school: 3.12, on: 3.52, foot: 3.98, step1: 4.58, step2: 5.60, step3: 5.78, the: 6.20, day: 6.74, feels: 7.12, good: 7.62 };
const S03_GY = 880, S03_BX = 760, S03_SC = .9;        // 腳底 y、男孩基準螢幕 x、縮放 / feet line, base screen x, scale
// 落地時間：一般走路兩步（"on"、"foot"）＋三個大步（三個 "step"）/ footfall times
const S03_LAND = [3.575, 3.958, WT3.step1, WT3.step2, WT3.step3];
const S03_LEAP = [[4.343, WT3.step1, 86], [5.30, WT3.step2, 86], [WT3.step2, WT3.step3, 44]];   // [起跳, 落地, 跳高] / [lift, land, height]

// 走路相位：落地時 sin(ph)=±1（雙腳最開）；停下時 ph=kπ（雙腳併攏，與站姿一致，不會跳格）
// walk phase: legs fully apart at each footfall, together (ph = kπ) when he stops
function s03Phase(t) {
  if (t < 4.343) return 8.2 * t + .53;                                  // 一般步行 / normal walk
  return track([[4.343, 36.128], [WT3.step1, 39.27, 'out'], [5.30, 39.27], [WT3.step2, 42.41, 'inOut'], [WT3.step3, 45.55, 'out'], [6.15, 47.12, 'out']], t);
}
// 前進距離（世界座標 px）/ distance walked
function s03Dist(t) {
  if (t < 4.343) return 300 * t;
  return track([[4.343, 1303], [WT3.step1, 1633, 'out'], [5.30, 1633], [WT3.step2, 1963, 'inOut'], [WT3.step3, 2243, 'out'], [6.15, 2323, 'out']], t);
}
// 鏡頭：距離的移動平均（±0.5 s），大步時鏡頭柔順跟上 / camera = moving average of distance
function s03Cam(t) { let s = 0; for (let j = -10; j <= 10; j++) s += s03Dist(t + j * .05); return s / 21; }

const SCENE = {
  dur: 8.10, songStart: 28.98, tag: 'Japan | on foot',
  cues: [[0.0, 4.32, 'He’s from Japan. He goes to school on foot.'], [4.58, 8.10, 'Step, step, step! The day feels good!']],
  draw(c, t) {
    const beat = Math.sin(t * Math.PI * 2 * 1.03);
    const d = s03Dist(t), cam = s03Cam(t), bx = S03_BX + d - cam;
    // 大步落地畫面一震 / impact shake on each big step
    let shake = 0; for (const L of S03_LAND.slice(2)) { const k = prog(t, L, L + .25); if (k > 0 && k < 1) shake += Math.sin(k * 40) * (1 - k) * 7; }
    c.save(); c.translate(0, shake);
    // 天空：唱到 "day" 變得更亮 / sky brightens on "day"
    const bright = E.out(prog(t, WT3.day - .1, WT3.day + .5));
    const g = c.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, bright > 0 ? mixHex('#8fd3f4', '#7fd0ff', bright) : '#8fd3f4'); g.addColorStop(1, mixHex('#e9f8ff', '#fff6dc', bright));
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
    s03Sun(c, 1640, 170, t, bright);
    for (const [cx, cy, s, v] of [[260, 150, 1, 12], [980, 90, 1.25, 8], [1380, 250, .75, 16]]) s03Cloud(c, ((cx + t * v - cam * .03) % 2300 + 2300) % 2300 - 200, cy, s);
    // 遠景：富士山（視差 0.04）/ far: Mt Fuji
    s03Fuji(c, 1150 - cam * .04, 640);
    // 中景：日式住宅（視差 0.45）/ mid: Japanese houses
    for (let i = 0; i < 12; i++) s03House(c, -160 + i * 330 - cam * .45, 660, i);
    // 近景：矮牆、櫻花樹、自動販賣機（視差 0.8）/ near: block wall, cherry trees, vending machine
    const n8 = cam * .8;
    for (let i = 0; i < 6; i++) s03Sakura(c, 120 + i * 760 - n8, 700, i % 2 ? .9 : 1.05, t);
    s03Wall(c, -n8, 690);
    s03Vending(c, 1320 - n8, 790);
    s03Vending(c, 3700 - n8, 790);
    // 電線桿與電線（視差 1）/ utility poles + wires
    const poles = [300, 1000, 1700, 2400, 3100, 3800, 4500].map(x => x - cam);
    s03Wires(c, poles);
    for (const px of poles) s03Pole(c, px, 800);
    // 路標：唱到 "school" 彈跳 / school sign pops on "school"
    s03Sign(c, 2290 - cam, 800, t);
    // 地面：柏油路＋白色路肩線＋斑馬線（視差 1）/ road, white edge line, zebra crossing
    c.fillStyle = '#c9c2b4'; c.fillRect(-20, 780, W + 40, 30);          // 路肩 / curb strip
    c.fillStyle = '#8f949c'; c.fillRect(-20, 806, W + 40, H - 790);
    c.fillStyle = '#f4f4ef'; c.fillRect(-20, 818, W + 40, 10);
    c.fillStyle = 'rgba(255,255,255,.88)';
    for (let x = 2330; x < 3260; x += 120) { const sx = x - cam; if (sx > -120 && sx < W + 20) { c.save(); c.translate(sx, 0); c.beginPath(); c.moveTo(0, 842); c.lineTo(66, 842); c.lineTo(84, 930); c.lineTo(10, 930); c.closePath(); c.fill(); c.restore(); } }
    c.fillStyle = 'rgba(0,0,0,.08)'; for (let x = (-cam % 90 + 90) % 90 - 90; x < W; x += 90) c.fillRect(x, 960, 30, 4);
    // 腳印（從 "on" 起出現）/ footprints, from "on"
    S03_LAND.forEach((L, i) => s03Print(c, S03_BX + s03Dist(L) + 74 - cam, S03_GY + (i % 2 ? 6 : 14), t, L, i));
    // 影子 / shadow
    const p = s03Pose(t, bx, beat);
    c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(bx + 8, S03_GY + 6, 78 - (p.hop || 0) * .25, 13, 0, 0, 7); c.fill();
    s03Speed(c, bx, t);
    kid(c, CH_JP, p, t);
    // 塵土＋數字章：每個大步落地 / dust puff + number stamp on each "step"
    S03_LAND.slice(2).forEach((L, i) => s03Impact(c, S03_BX + s03Dist(L) + 74 - cam, S03_GY, t, L, i + 1));
    // 落花 / falling petals
    s03Petals(c, t);
    c.restore();
    // "Japan"：國旗泡泡（跟著男孩頭上）/ flag bubble follows his head
    const fk = E.back(prog(t, WT3.japan, WT3.japan + .35)) * (1 - prog(t, 2.9, 3.25));
    if (fk > 0) countryBubble(c, 'JP', bx + 10, S03_GY - 500, fk, t);
    // "on foot" 字卡 + "foot" 時腳丫圖示 / word card on "on", foot icon on "foot"
    const ok = E.back(prog(t, WT3.on, WT3.on + .3)) * (1 - prog(t, 5.0, 5.3));
    if (ok > 0) wordCard(c, 1010, 215, 'on foot', ok);
    const ik = E.back(prog(t, WT3.foot - .04, WT3.foot + .26)) * (1 - prog(t, 5.0, 5.3));
    if (ik > 0) transportIcon(c, 'foot', 1270, 215, ik * .7);
    // "good"：星星爆發 / burst on "good"
    if (t > WT3.good) burst(c, bx + 10, S03_GY - 420 - (p.hop || 0), prog(t, WT3.good, WT3.good + .6));
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// 男孩姿勢時間軸 / boy's pose timeline
function s03Pose(t, bx, beat) {
  const ph = s03Phase(t), moving = t < 6.15;
  let hop = 0, leaping = 0;
  for (const [a, b, h] of S03_LEAP) { const k = prog(t, a, b); if (k > 0 && k < 1) { hop = Math.sin(k * Math.PI) * h; leaping = Math.sin(k * Math.PI); } }
  hop += Math.sin(clamp(prog(t, WT3.good - .1, WT3.good + .4)) * Math.PI) * 70;     // "good" 跳起
  // 每個 "step" 落地：單手握拳舉高（第一個 step 拉長音時一直舉著）/ fist up on each step
  const raise = Math.max(prog(t, WT3.step1 - .14, WT3.step1) * (1 - prog(t, 5.2, 5.36)),
    prog(t, WT3.step2 - .1, WT3.step2) * (1 - prog(t, 6.0, 6.25))) * (1 - prog(t, WT3.feels - .15, WT3.feels));
  const cheer = prog(t, WT3.feels - .08, WT3.feels + .25);                          // "feels" 雙手歡呼
  const lookUp = E.inOut(prog(t, WT3.day - .3, WT3.day + .1)) * (1 - E.inOut(prog(t, WT3.good, WT3.good + .4)) * .6);
  const sustain = prog(t, WT3.step1, WT3.step1 + .15) * (1 - prog(t, 5.15, 5.3));    // 第一個長音 step：弓步撐住、身體微晃
  const singing = t >= WT3.step1 - .1;                                              // 第二句才對嘴
  return {
    x: bx, y: S03_GY, face: 1, scale: S03_SC, walk: ph, moving, hop, raise, cheer,
    lean: (t < 4.343 ? .07 : 0) + leaping * .16 + sustain * (.08 + Math.sin(t * 7) * .03),
    nod: (t < WT3.step1 ? beat * .05 : (moving ? 0 : beat * .03)) - lookUp * .16,
    talk: singing ? mouthAt(t) : 0, round: singing ? roundAt(t) : 0, look: 1,
  };
}
// 混色 / mix two hex colours
function mixHex(a, b, k) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const m = s => Math.round(lerp((A >> s) & 255, (B >> s) & 255, k)); return `rgb(${m(16)},${m(8)},${m(0)})`; }
function s03Cloud(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#fff'; c.beginPath(); for (const [a, b, r] of [[0, 0, 44], [50, -18, 52], [104, 0, 44], [52, 14, 42]]) c.arc(a, b, r, 0, 7); c.fill(); c.restore(); }
// 太陽：唱到 "day" 放大、光芒轉快、笑開 / smiling sun grows and grins on "day"
function s03Sun(c, x, y, t, k) {
  c.save(); c.translate(x, y); const s = 1 + E.back(k) * .25; c.scale(s, s);
  if (k > 0) { const rg = c.createRadialGradient(0, 0, 60, 0, 0, 260); rg.addColorStop(0, `rgba(255,230,120,${.55 * k})`); rg.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = rg; c.fillRect(-260, -260, 520, 520); }
  c.save(); c.rotate(t * (.25 + k * 1.2));
  for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); rr(c, -9, -132 - (i % 2) * 10, 18, 40, 9); fillStroke(c, '#ffc94a', 5); }
  c.restore();
  c.beginPath(); c.arc(0, 0, 86, 0, 7); fillStroke(c, '#ffd84d', 7);
  c.fillStyle = INK; for (const ex of [-28, 28]) { c.beginPath(); if (k > .5) { c.lineWidth = 7; c.strokeStyle = INK; c.arc(ex, 0, 13, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } else { c.ellipse(ex, -4, 8, 12, 0, 0, 7); c.fill(); } }
  c.fillStyle = 'rgba(255,120,90,.45)'; for (const ex of [-50, 50]) { c.beginPath(); c.ellipse(ex, 24, 14, 8, 0, 0, 7); c.fill(); }
  c.beginPath(); if (k > .05) { c.moveTo(-30, 22); c.quadraticCurveTo(0, 22 + 46 * k, 30, 22); c.closePath(); c.fillStyle = '#b3374a'; c.fill(); } else { c.moveTo(-24, 26); c.quadraticCurveTo(0, 46, 24, 26); }
  c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.restore();
}
function s03Fuji(c, x, base) {
  c.save(); c.translate(x, base);
  c.beginPath(); c.moveTo(-520, 0); c.lineTo(-110, -330); c.quadraticCurveTo(0, -360, 110, -330); c.lineTo(520, 0); c.closePath(); fillStroke(c, '#8fb2d8', 6);
  c.beginPath(); c.moveTo(-110, -330); c.quadraticCurveTo(0, -360, 110, -330); c.lineTo(170, -282); c.lineTo(110, -262); c.lineTo(60, -290); c.lineTo(0, -255); c.lineTo(-60, -292); c.lineTo(-115, -262); c.lineTo(-170, -282); c.closePath(); fillStroke(c, '#fff', 5);
  c.restore();
}
// 日式住宅：瓦屋頂、白牆、拉門 / house with tiled roof
function s03House(c, x, base, i) {
  if (x < -360 || x > W + 60) return;
  const walls = ['#fbf3e4', '#f2e6d0', '#fff8ee', '#efe7da'], roofs = ['#4b5a78', '#5b4d63', '#3f6070', '#6a5148'];
  const w = 260 + (i * 37) % 50, h = 170 + (i * 53) % 60, wall = walls[i % 4], roof = roofs[(i * 3) % 4];
  c.save(); c.translate(x, base);
  rr(c, 0, -h, w, h, 6); fillStroke(c, wall, 6);
  c.beginPath(); c.moveTo(-30, -h + 6); c.quadraticCurveTo(w / 2, -h - 8, w + 30, -h + 6); c.lineTo(w - 20, -h - 90); c.lineTo(20, -h - 90); c.closePath(); fillStroke(c, roof, 6);
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 4; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-10 + k * 6, -h - k * 22); c.lineTo(w + 10 - k * 6, -h - k * 22); c.stroke(); }
  for (let k = 0; k < 2; k++) { rr(c, 30 + k * (w - 130), -h + 34, 70, 56, 6); fillStroke(c, '#bfe3f2', 5); c.beginPath(); c.moveTo(65 + k * (w - 130), -h + 34); c.lineTo(65 + k * (w - 130), -h + 90); c.lineWidth = 4; c.stroke(); }
  c.restore();
}
// 水泥磚矮牆 / concrete-block wall
function s03Wall(c, x0, top) {
  const off = ((x0 % 120) + 120) % 120 - 120;
  c.fillStyle = '#d9d3c7'; c.fillRect(-20, top, W + 40, 100); c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.moveTo(-20, top); c.lineTo(W + 20, top); c.stroke();
  c.fillStyle = '#c7c0b2'; c.fillRect(-20, top - 14, W + 40, 16); c.beginPath(); c.moveTo(-20, top - 14); c.lineTo(W + 20, top - 14); c.stroke();
  c.strokeStyle = 'rgba(59,42,46,.25)'; c.lineWidth = 3;
  for (let r = 0; r < 3; r++) { c.beginPath(); c.moveTo(-20, top + 33 * (r + 1)); c.lineTo(W + 20, top + 33 * (r + 1)); c.stroke(); for (let x = off + (r % 2) * 60; x < W + 20; x += 120) { c.beginPath(); c.moveTo(x, top + 33 * r); c.lineTo(x, top + 33 * (r + 1)); c.stroke(); } }
}
// 櫻花樹（牆後）/ cherry tree behind the wall
function s03Sakura(c, x, base, s, t) {
  if (x < -300 || x > W + 300) return;
  c.save(); c.translate(x, base); c.scale(s, s);
  c.beginPath(); c.moveTo(-18, 0); c.lineTo(-12, -170); c.lineTo(-60, -230); c.lineTo(-44, -240); c.lineTo(0, -190); c.lineTo(50, -250); c.lineTo(62, -238); c.lineTo(14, -168); c.lineTo(20, 0); c.closePath(); fillStroke(c, '#8a5a44', 6);
  const sw = Math.sin(t * 1.4 + x * .01) * 4; c.translate(sw, 0);
  for (const [a, b, r, col] of [[-90, -250, 86, '#ffc6d9'], [80, -265, 92, '#ffb3cc'], [0, -310, 104, '#ffd3e2'], [-10, -220, 70, '#ffbfd4']]) { c.beginPath(); c.arc(a, b, r, 0, 7); fillStroke(c, col, 6); }
  c.fillStyle = '#ff94b6'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(-120 + rnd(i + 3) * 240, -340 + rnd(i + 9) * 160, 7, 0, 7); c.fill(); }
  c.restore();
}
// 自動販賣機 / vending machine
function s03Vending(c, x, base) {
  if (x < -200 || x > W + 100) return;
  c.save(); c.translate(x, base);
  rr(c, 0, -230, 130, 230, 10); fillStroke(c, '#e2474b', 6);
  rr(c, 14, -214, 102, 104, 6); fillStroke(c, '#eef8fb', 4);
  const cols = ['#3d78c9', '#ffd84d', '#38b2a6', '#f59a3c'];
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { rr(c, 22 + k * 24, -204 + r * 50, 16, 36, 5); c.fillStyle = cols[(k + r) % 4]; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); }
  for (let k = 0; k < 4; k++) { c.fillStyle = '#ffd84d'; c.fillRect(24 + k * 24, -100, 12, 8); }
  rr(c, 22, -60, 86, 30, 6); fillStroke(c, '#3b2a2e', 4);
  c.restore();
}
function s03Pole(c, x, base) {
  if (x < -60 || x > W + 60) return;
  rr(c, x - 16, 150, 32, base - 150, 8); fillStroke(c, '#b9b4ab', 6);
  rr(c, x - 70, 210, 140, 16, 6); fillStroke(c, '#8f8a82', 5);
  rr(c, x - 22, 380, 44, 90, 6); fillStroke(c, '#9aa0a8', 5);            // 變壓器 / transformer
}
function s03Wires(c, xs) {
  c.strokeStyle = INK; c.lineWidth = 3;
  for (let i = 0; i < xs.length - 1; i++) for (const [dx, y] of [[-60, 214], [60, 214], [0, 300]]) { c.beginPath(); c.moveTo(xs[i] + dx, y); c.quadraticCurveTo((xs[i] + xs[i + 1]) / 2, y + 60, xs[i + 1] + dx, y); c.stroke(); }
}
// 「SCHOOL ➜」藍色路標，唱到 "school" 彈跳 / blue road sign bounces on "school"
function s03Sign(c, x, base, t) {
  if (x < -200 || x > W + 200) return;
  const k = Math.sin(clamp(prog(t, WT3.school, WT3.school + .45)) * Math.PI), glow = prog(t, WT3.school - .05, WT3.school + .2) * (1 - prog(t, WT3.school + 1.2, WT3.school + 1.6));
  c.save(); c.translate(x, base);
  rr(c, -9, -380, 18, 380, 6); fillStroke(c, '#c8ccd3', 5);
  c.translate(0, -400); c.scale(1 + k * .14, 1 + k * .14); c.rotate(-k * .06);
  if (glow > 0) { c.fillStyle = `rgba(255,236,140,${.7 * glow})`; rr(c, -140, -78, 280, 156, 30); c.fill(); }
  rr(c, -120, -60, 240, 120, 18); fillStroke(c, '#2f62a8', 7);
  c.font = '800 40px "Inter","Segoe UI",sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('SCHOOL ➜', 0, 14);
  c.restore(); c.textAlign = 'left';
}
// 腳印：落地瞬間蓋章（放大→縮回），之後留在路上 / footprint stamps in and stays
function s03Print(c, x, y, t, L, i) {
  if (t < L || x < -60 || x > W + 60) return;
  const big = i >= 2, k = prog(t, L, L + .18), s = (big ? 1.6 : 1.25) * (1 + (1 - E.out(k)) * .6);
  const hot = i === 1 ? prog(t, L, L + .1) * (1 - prog(t, L + .6, L + 1)) : 0;    // "foot" 那一步特別亮 / glow on "foot"
  c.save(); c.translate(x, y); c.scale(s, s * .55); c.rotate(-.1);
  if (big || hot > 0) { c.fillStyle = `rgba(255,216,77,${big ? .55 * (1 - prog(t, L + .2, L + 1.2)) + .2 : .6 * hot})`; c.beginPath(); c.ellipse(4, 0, 46, 32, 0, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(47,98,168,.8)';
  c.beginPath(); c.ellipse(8, 0, 24, 17, 0, 0, 7); c.fill();                     // 前腳掌 / ball of foot
  c.beginPath(); c.ellipse(-26, 2, 15, 12, 0, 0, 7); c.fill();                   // 腳跟 / heel
  c.fillRect(-28, -6, 34, 14);
  for (let k2 = 0; k2 < 5; k2++) { c.beginPath(); c.arc(36 + Math.sin(k2 * .8) * 4, -16 + k2 * 8, 6 - k2 * .7, 0, 7); c.fill(); }   // 腳趾 / toes
  c.restore();
}
// 落地衝擊：塵土＋數字星章 1/2/3 / landing impact with dust and a number star
function s03Impact(c, x, y, t, L, n) {
  const k = prog(t, L, L + .55); if (k <= 0 || k >= 1) return;
  c.save(); c.globalAlpha = 1 - E.in(k);
  for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + sg * (30 + 70 * E.out(k) + i * 22), y - 10 - i * 8 - E.out(k) * 20, 16 + i * 4, 0, 7); c.fillStyle = '#efe6d8'; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(59,42,46,.5)'; c.stroke(); }
  c.restore();
  const pk = E.back(prog(t, L, L + .2)) * (1 - prog(t, L + .45, L + .6)); if (pk <= 0) return;
  c.save(); c.translate(x + 175, y - 70); c.scale(pk, pk); c.rotate(-.12);
  c.beginPath(); for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10, r = i % 2 ? 40 : 62; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); fillStroke(c, '#ffd84d', 6);
  c.font = '900 52px "Inter","Segoe UI",sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText(String(n), 0, 18); c.restore();
}
function s03Petals(c, t) {
  for (let i = 0; i < 16; i++) {
    const x = ((rnd(i) * 2200 + t * (40 + rnd(i + 5) * 50)) % 2100) - 100, y = ((rnd(i + 11) * 900 + t * (60 + rnd(i + 2) * 40)) % 820) + 60;
    c.save(); c.translate(x + Math.sin(t * 2 + i) * 20, y); c.rotate(t * 2 + i); c.fillStyle = '#ff9fbf'; c.beginPath(); c.ellipse(0, 0, 9, 5, 0, 0, 7); c.fill(); c.restore();
  }
}
// 大步時身後的速度線 / speed lines behind him while leaping
function s03Speed(c, bx, t) {
  for (const [a, b] of S03_LEAP) {
    const k = prog(t, a, b + .12); if (k <= 0 || k >= 1) continue;
    c.save(); c.globalAlpha = Math.sin(k * Math.PI); c.strokeStyle = '#fff'; c.lineCap = 'round';
    for (const [dy, len, w] of [[-300, 120, 10], [-220, 170, 12], [-140, 110, 10]]) { c.lineWidth = w; c.beginPath(); c.moveTo(bx - 90 - len, S03_GY + dy); c.lineTo(bx - 90, S03_GY + dy); c.stroke(); }
    c.restore();
  }
}
