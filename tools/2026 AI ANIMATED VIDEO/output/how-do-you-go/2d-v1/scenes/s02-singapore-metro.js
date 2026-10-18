// 場景 02：Singapore | by metro。歌曲 21.72–28.98 s（SRT 第 7–8 句）。本地時間 t 從 0 起算。
// 動作依原曲逐字時碼（data/asr-candidates.json）編排：
//   She's(0) from Singapore(0.82)   → 女孩在月台向鏡頭揮手；新加坡國旗泡泡
//   She goes to school(2.62)        → 捷運列車在月台門後駛入；車頭顯示「SCHOOL」在 "school" 亮起
//   by metro(3.14)                  → 列車停穩、月台門與車門滑開＋「by metro」字卡
//   Ready(3.80) for school(4.90)?   → 女孩歪頭、問號泡泡；"school" 時車頭 SCHOOL 再閃一次
//   Ready(5.38), let's(6.16) go(6.80)! → 單手握拳舉高，"let's go" 走進車廂，門開始關
// 對嘴：第一句是旁白式第三人稱（She's…），女孩不開口只微笑；第二句（Ready…let's go）才跟原曲對嘴。
// 嘴型資料：scenes/s02-singapore-metro.lipsync.js（lipsync/song_lipsync.py --start 21.72 --dur 7.26）
const CH_SG = { skin: '#b97a52', hair: '#1f1a1c', pony: true, jacket: '#b49ce0', jacketD: '#9a80cc', under: '#ddd2f4', pants: '#efe2c4', shoe: '#8f5fd1', pack: '#9fe3c7', blinkOff: .9 };
const WT2 = { singapore: .82, school1: 2.62, by: 2.90, metro: 3.14, ready1: 3.80, school2: 4.90, ready2: 5.38, lets: 6.16, go: 6.80 };
const DOORS = [380, 1160, 1940];      // 月台門中心 x / platform-door centres
const SCENE = {
  dur: 7.26, songStart: 21.72, tag: 'Singapore | by metro',
  cues: [[0.0, 3.80, 'She’s from Singapore. She goes to school by metro.'], [3.80, 7.26, 'Ready for school? Ready, let’s go!']],
  draw(c, t) {
    const beat = Math.sin(t * Math.PI * 2 * 1.03);
    // 車站牆面 / station wall
    c.fillStyle = '#e9eef4'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#dfe6ee'; for (let x = 0; x < W; x += 120) for (let y = 0; y < 260; y += 60) { rr(c, x + 4 + ((y / 60) % 2) * 60, y + 4, 112, 52, 6); c.fill(); }
    c.fillStyle = '#c7d2de'; c.fillRect(0, 250, W, 14);
    // 天花板燈條 / ceiling lights
    for (let x = 140; x < W; x += 420) { rr(c, x, 40, 240, 22, 11); c.fillStyle = '#fffbe6'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#b8c3cf'; c.stroke(); }
    stationSign(c, 760, 110, t);
    // 列車：1.45→2.95 s 從右減速駛入（月台門後）/ train glides in behind the screen doors
    const tx = track([[0, 2400], [1.45, 2400], [2.95, 0, 'out']], t);
    const open = track([[0, 0], [3.14, 0], [3.6, 1, 'out'], [6.95, 1], [7.26, .55, 'in']], t);
    train(c, tx, t, open);
    // 女孩：上車時（走進門內）畫在月台門後面 / girl drawn behind the screen doors once she steps in
    const g = girlPose(t), inside = g.depth > .5;
    if (inside) kid(c, CH_SG, g, t);
    screenDoors(c, open, t);
    // 月台地板與黃線 / platform floor + yellow safety line
    c.fillStyle = '#cfd6de'; c.fillRect(0, 770, W, H - 770);
    c.fillStyle = '#ffd84d'; c.fillRect(0, 784, W, 14);
    c.fillStyle = '#bcc5cf'; for (let x = 0; x < W; x += 160) c.fillRect(x, 800, 4, H - 800);
    c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(g.x, g.y + 4, 60 * g.scale, 12 * g.scale, 0, 0, 7); c.fill();
    if (!inside) kid(c, CH_SG, g, t);
    // "Singapore"：國旗泡泡 / flag bubble
    const fk = E.back(prog(t, WT2.singapore, WT2.singapore + .35)) * (1 - prog(t, 2.5, 2.85));
    if (fk > 0) sgFlagBubble(c, g.x + 10, 400, fk, t);
    // "by metro" 字卡 / word card
    const mk = E.back(prog(t, WT2.metro, WT2.metro + .3)) * (1 - prog(t, 4.3, 4.6));
    if (mk > 0) wordCard(c, 1560, 200, 'by metro', mk);
    // "Ready for school?" 問號泡泡 / question bubble
    const qk = E.back(prog(t, WT2.ready1, WT2.ready1 + .3)) * (1 - prog(t, 5.25, 5.45));
    if (qk > 0) wordCard(c, g.x + 160, 500, '?', qk);
    if (t > WT2.ready2) burst(c, g.x + 60, 480, prog(t, WT2.ready2, WT2.ready2 + .6));
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// 女孩姿勢時間軸 / girl's pose timeline
function girlPose(t) {
  const walkK = prog(t, WT2.lets - .05, WT2.go - .15);               // "let's" 走向車門
  const stepK = prog(t, WT2.go - .2, WT2.go + .25);                  // "go" 跨進車廂
  const x = lerp(lerp(900, 1160, E.inOut(walkK)), 1160, stepK);
  const depth = stepK;
  const wave = prog(t, 0, .25) * (1 - prog(t, 1.3, 1.6));           // "She's" 揮手
  const tilt = Math.sin(clamp(prog(t, WT2.ready1, WT2.ready2)) * Math.PI) * .14;   // 歪頭問 "Ready for school?"
  const raise = prog(t, WT2.ready2 - .1, WT2.ready2 + .15) * (1 - prog(t, WT2.lets - .05, WT2.lets + .2));
  const hop = Math.sin(clamp(prog(t, WT2.ready2, WT2.ready2 + .4)) * Math.PI) * 40;
  const singing = t >= WT2.ready1;                                    // 第二句才對嘴
  return {
    x, y: lerp(900, 770, E.inOut(depth)) - 0, face: 1, scale: lerp(.95, .74, E.inOut(depth)),
    walk: t * 8.2, moving: walkK > 0 && walkK < 1 || (stepK > 0 && stepK < 1), wave, raise, hop,
    talk: singing ? mouthAt(t) : 0, round: singing ? roundAt(t) : 0, look: 1,
    nod: tilt + (walkK > 0 ? 0 : beat2(t) * .04), depth, hairSway: Math.sin(t * 3) * .05,
  };
}
function beat2(t) { return Math.sin(t * Math.PI * 2 * 1.03); }
function stationSign(c, x, y, t) {
  rr(c, x, y, 400, 92, 18); fillStroke(c, '#2e3b55', 6);
  c.font = '800 46px "Inter","Segoe UI",sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText('METRO', x + 150, y + 62);
  // 小列車圖示 / tiny train icon
  rr(c, x + 30, y + 22, 92, 50, 14); c.fillStyle = '#ffd84d'; c.fill();
  c.fillStyle = '#2e3b55'; rr(c, x + 44, y + 32, 28, 18, 4); c.fill(); rr(c, x + 80, y + 32, 28, 18, 4); c.fill();
}
function train(c, tx, t, open) {
  c.save(); c.translate(tx, 0);
  // 車身（長於畫面）/ body
  rr(c, -80, 330, W + 400, 440, 40); fillStroke(c, '#f4f6f9', 7);
  c.fillStyle = '#8b5cc7'; c.fillRect(-76, 640, W + 392, 26);          // 紫色腰線 / stripe
  c.fillStyle = '#e04f5f'; c.fillRect(-76, 672, W + 392, 10);
  // 車窗 / windows（車門之間）
  for (let i = 0; i < 4; i++) { const wx = DOORS[0] + 190 + i * 390 - (i > 1 ? 0 : 0); if (DOORS.some(d => Math.abs(d - (wx + 110)) < 200)) continue; }
  for (const wx of [560, 760, 1340, 1540]) { rr(c, wx, 400, 160, 150, 18); fillStroke(c, '#a9dcf2', 6); }
  // 車門（隨月台門一起開）/ train doors
  for (const d of DOORS) {
    c.fillStyle = '#4a4560'; rr(c, d - 120, 380, 240, 380, 10); c.fill();                // 車廂內部暗色 / interior
    for (const sgn of [-1, 1]) {
      const off = sgn * open * 112;
      rr(c, d + (sgn < 0 ? -120 : 0) + off, 380, 120, 380, 8); fillStroke(c, '#e7ebf1', 5);
      rr(c, d + (sgn < 0 ? -100 : 20) + off, 410, 80, 150, 10); fillStroke(c, '#a9dcf2', 4);
    }
  }
  // 車頭顯示器：唱到 "school" 亮起 / destination display lights on "school"
  const lit = Math.max(prog(t, WT2.school1, WT2.school1 + .15) * (1 - prog(t, WT2.school1 + .9, WT2.school1 + 1.2)),
                       prog(t, WT2.school2, WT2.school2 + .15) * (1 - prog(t, WT2.school2 + .6, WT2.school2 + .9)), .25);
  rr(c, 1000, 340, 320, 46, 10); c.fillStyle = '#20222c'; c.fill();
  c.font = '800 34px "Inter",sans-serif'; c.textAlign = 'center'; c.fillStyle = `rgba(255,190,60,${lit})`; c.fillText('➜ SCHOOL', 1160, 375); c.textAlign = 'left';
  c.restore();
}
function screenDoors(c, open, t) {
  // 月台門：玻璃面板＋上方框；門中心處滑開 / platform screen doors
  c.fillStyle = '#5b6b80'; c.fillRect(0, 290, W, 34);
  for (let x = 0; x < W; x += 6) { }
  const pane = 'rgba(190,230,248,.28)';
  // 固定面板（門與門之間）/ fixed panes
  let prev = -200;
  for (const d of DOORS.concat([W + 400])) {
    const a = prev + 140, b = d - 140;
    if (b > a) { c.fillStyle = pane; c.fillRect(a, 324, b - a, 446); c.lineWidth = 6; c.strokeStyle = '#5b6b80'; c.strokeRect(a, 324, b - a, 446); }
    prev = d;
  }
  for (const d of DOORS) {
    for (const sgn of [-1, 1]) {
      const off = sgn * open * 118, x0 = d + (sgn < 0 ? -128 : 8) + off;
      c.fillStyle = pane; c.fillRect(x0, 330, 120, 440); c.lineWidth = 5; c.strokeStyle = '#7d8ca0'; c.strokeRect(x0, 330, 120, 440);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0 + 18, 350, 10, 300);
    }
    c.fillStyle = '#8b5cc7'; rr(c, d - 60, 300, 120, 16, 8); c.fill();     // 門上指示燈 / door light
    if (open > .05 && open < .95) { c.fillStyle = '#ffd84d'; c.beginPath(); c.arc(d, 308, 8 + Math.sin(t * 20) * 3, 0, 7); c.fill(); }
  }
}
function sgFlagBubble(c, x, y, k, t) {   // 新加坡國旗：上紅下白，左上白色新月與五星 / Singapore flag
  c.save(); c.translate(x, y + Math.sin(t * 4) * 4); c.scale(k, k);
  rr(c, -95, -62, 190, 124, 24); fillStroke(c, '#fff', 6);
  c.beginPath(); c.moveTo(-14, 62); c.lineTo(0, 86); c.lineTo(14, 62); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#ef3340'; c.fillRect(-75, -45, 150, 50); c.fillStyle = '#fff'; c.fillRect(-75, 5, 150, 50);
  c.beginPath(); c.arc(-50, -20, 17, 0, 7); c.fillStyle = '#fff'; c.fill();
  c.beginPath(); c.arc(-43, -20, 16, 0, 7); c.fillStyle = '#ef3340'; c.fill();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; miniStar(c, -27 + Math.cos(a) * 10, -20 + Math.sin(a) * 10, 4); }
  c.lineWidth = 4; c.strokeStyle = INK; c.strokeRect(-75, -45, 150, 100);
  c.restore();
}
function miniStar(c, x, y, r) { c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr_ = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr_, y + Math.sin(a) * rr_); } c.closePath(); c.fill(); }
