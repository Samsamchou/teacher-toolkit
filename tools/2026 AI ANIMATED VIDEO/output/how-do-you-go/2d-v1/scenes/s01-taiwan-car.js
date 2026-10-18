// 場景 01：Taiwan | by car。歌曲 14.83–21.83 s（SRT 第 5–6 句）。本地時間 t 從 0 起算。
// 動作依原曲逐字時碼（data/asr-candidates.json）編排，每個關鍵字都有對應畫面：
//   I'm from Taiwan(0.67)        → 車窗旁跳出台灣國旗泡泡
//   I go to school by car(2.71)  → 車在 "car" 前停穩、車身彈一下、"by car" 字卡
//   Here is my school(4.41)      → 下車、手指學校，學校在 "school" 彈跳發光
//   Here we(5.75) are(6.27)      → 駕駛（家長）在 "we" 揮手，女孩雙手歡呼、在 "are" 跳起
// 嘴型：scenes/s01-taiwan-car.lipsync.js（原曲人聲包絡＋逐字時碼，lipsync/song_lipsync.py 產生）
const CH_TW = { skin: '#f6cba6', hair: '#2a2024', pony: true, jacket: '#2fa59a', jacketD: '#23857c', under: '#fff', pants: '#2c3a67', shoe: '#38b2a6', pack: '#f4e6c6', blinkOff: 0 };
const CH_DAD = { skin: '#eebf98', hair: '#2a2024', blinkOff: 1.3 };
const WT = { taiwan: .67, car: 2.71, here1: 3.13, school: 4.41, here2: 4.97, we: 5.75, are: 6.27 };   // 本地秒 / local seconds
const SCENE = {
  dur: 6.89, songStart: 14.83, tag: 'Taiwan | by car',
  cues: [[0.0, 3.13, 'I’m from Taiwan. I go to school by car.'], [3.13, 6.95, 'Here is my school! Here we are!']],
  draw(c, t) {
    const gy = 800, beat = Math.sin(t * Math.PI * 2 * 1.03);   // 頭部隨拍輕擺 / head bob
    const g = c.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, '#9fdcf5'); g.addColorStop(1, '#e8f7ff');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const [cx, cy, s, v] of [[300, 150, 1, 14], [1150, 100, 1.3, 9], [1640, 210, .8, 18]]) cloud(c, ((cx + t * v) % 2300) - 200, cy, s);
    // 學校：唱到 "school" 時彈跳＋光暈 / school pops on "school"
    const px = -t * 6, sp = Math.sin(clamp(prog(t, WT.school, WT.school + .45)) * Math.PI);
    const glow = prog(t, WT.school - .1, WT.school + .3) * (1 - prog(t, WT.here2 + .4, WT.here2 + .9));
    c.save(); c.translate(px, 0);
    if (glow > 0) { const rg = c.createRadialGradient(1340, 520, 60, 1340, 520, 420); rg.addColorStop(0, `rgba(255,236,140,${.6 * glow})`); rg.addColorStop(1, 'rgba(255,236,140,0)'); c.fillStyle = rg; c.fillRect(900, 120, 900, 700); }
    block(c, 740, 470, 360, 230, '#bfe8d9');
    c.save(); c.translate(1340, 700); c.scale(1 + sp * .04, 1 + sp * .07); c.translate(-1340, -700);
    block(c, 1080, 360, 520, 340, '#ffe7c2'); block(c, 1180, 250, 220, 120, '#ff8c78');
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { c.fillStyle = '#7ec8e8'; rr(c, 1110 + k * 80, 400 + r * 90, 52, 58, 8); c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); }
    c.font = '800 34px "Inter",sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('SCHOOL', 1290, 325); c.textAlign = 'left';
    c.restore(); c.restore();
    for (const [x, s] of [[120, 1.1], [1800, 1.25], [560, .8]]) tree(c, x + px * .5, 700, s, t);
    c.fillStyle = '#f2dcc0'; c.fillRect(0, 690, W, 120); c.fillStyle = '#6c7584'; c.fillRect(0, gy, W, H - gy);
    c.fillStyle = '#4f5866'; c.fillRect(0, 806, W, 8);
    c.fillStyle = '#ffe9a8'; for (let x = -((t * 400) % 260); x < W; x += 260) c.fillRect(x, 930, 150, 12);
    // 車：0–2.6 s 駛入，在 "car" 前停穩；"car" 時車身彈一下 / car settles before "car", bounces on it
    const cx = track([[0, -520], [2.6, 760, 'out']], t);
    const brake = Math.sin(clamp(prog(t, 2.0, 2.6)) * Math.PI) * 10 + Math.sin(clamp(prog(t, WT.car, WT.car + .35)) * Math.PI) * 8;
    c.save(); c.translate(cx, 0); car(c, gy, cx / 70, brake, t); c.restore();
    // 駕駛（家長）：前窗；"we" 時揮手 / driver waves on "we"
    const dw = prog(t, WT.we - .15, WT.we + .15) * (1 - prog(t, 6.7, 6.95));
    c.save(); c.translate(cx + 470, gy - 236 - brake * .5); c.scale(.42, .42); adultHead(c, CH_DAD, t);
    if (dw > 0) { c.save(); c.translate(-90, -20 - dw * 50); c.rotate(Math.sin(t * 12) * .4); rr(c, -28, -50, 56, 76, 24); fillStroke(c, CH_DAD.skin, 8); c.restore(); }
    c.restore();
    // 女孩：0–3.3 s 後座跟唱；3.3 s 下車 / girl sings in the back seat, then steps out
    const open = track([[0, 0], [2.85, 0], [3.25, 1, 'out'], [5.6, 1], [6.1, 0, 'inOut']], t);
    const exitT = 3.3;
    if (t >= exitT) drawDoor(c, cx, gy, brake, open);  // 下車後：女孩站在門前
    if (t < exitT) {
      c.save(); c.translate(cx + 300, gy - 232 - brake * .5); c.rotate(beat * .05); c.scale(.5, .5);
      head(c, CH_TW, { walk: 0, talk: mouthAt(t), round: roundAt(t), look: 1 }, t); c.restore();
    } else {
      const k = t - exitT, walkK = prog(k, 0, .85), x = lerp(cx + 380, 1560, E.inOut(walkK)), moving = walkK > 0 && walkK < 1;
      const point = prog(t, WT.school - .5, WT.school - .2) * (1 - prog(t, WT.here2, WT.here2 + .25));
      const cheer = prog(t, WT.here2 + .1, WT.here2 + .45);
      const hop = Math.sin(clamp(prog(t, WT.are, WT.are + .45)) * Math.PI) * 70;
      const face = lerp(1, -1, E.inOut(prog(t, 3.95, 4.15)));   // 走到後轉身面向學校（2D 壓扁翻面）/ cartoon flip-turn toward school
      kid(c, CH_TW, { x, y: gy + 70, face, walk: k * 8.2, moving, point, cheer, hop, talk: mouthAt(t), round: roundAt(t), scale: .8,
        lean: moving ? .07 : -.04 * point, nod: moving ? 0 : beat * .04, look: 1, hairSway: Math.sin(t * 3) * .05 + hop * .002 }, t);
      if (t > WT.are) burst(c, 1570, 520 - hop, prog(t, WT.are, WT.are + .6));
    }
    if (t < exitT) drawDoor(c, cx, gy, brake, open);   // 還在車內：門在女孩前面
    // "Taiwan"：國旗泡泡（畫在門之上）/ flag bubble on "Taiwan"
    const fk = E.back(prog(t, WT.taiwan, WT.taiwan + .35)) * (1 - prog(t, 2.4, 2.75));
    if (fk > 0) flagBubble(c, cx + 300, gy - 420 - brake * .5, fk, t);
    // "by car" 字卡 / word card on "car"
    const ck = E.back(prog(t, WT.car, WT.car + .3)) * (1 - prog(t, 3.6, 3.9));
    if (ck > 0) wordCard(c, cx + 120, gy - 420, 'by car', ck);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
function adultHead(c, ch, t) {   // 成人短髮 / adult, short hair
  c.beginPath(); c.ellipse(0, 0, 60, 70, 0, 0, 7); fillStroke(c, ch.skin, 8);
  c.beginPath(); c.moveTo(-62, 0); c.bezierCurveTo(-66, -90, 66, -90, 62, 0); c.bezierCurveTo(50, -40, -40, -50, -62, 0); fillStroke(c, ch.hair, 7);
  const bl = ((t + ch.blinkOff) % 3.4) < .14 ? .1 : 1; c.fillStyle = INK;
  for (const ex of [-20, 26]) { c.beginPath(); c.ellipse(ex, 8, 7, 10 * bl, 0, 0, 7); c.fill(); }
  c.beginPath(); c.moveTo(-12, 38); c.quadraticCurveTo(4, 50, 20, 38); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
}
function flagBubble(c, x, y, k, t) {   // 台灣國旗：紅底、藍色左上角、白日 12 道光芒 / Taiwan flag
  c.save(); c.translate(x, y + Math.sin(t * 4) * 4); c.scale(k, k);
  rr(c, -95, -62, 190, 124, 24); fillStroke(c, '#fff', 6);
  c.beginPath(); c.moveTo(-14, 62); c.lineTo(0, 86); c.lineTo(14, 62); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#fe0000'; c.fillRect(-75, -45, 150, 100); c.fillStyle = '#000095'; c.fillRect(-75, -45, 75, 50);
  c.save(); c.translate(-37.5, -20); c.fillStyle = '#fff'; c.beginPath();
  for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, r = i % 2 ? 10 : 19; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill();
  c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fillStyle = '#000095'; c.fill(); c.beginPath(); c.arc(0, 0, 7.5, 0, 7); c.fillStyle = '#fff'; c.fill(); c.restore();
  c.lineWidth = 4; c.strokeStyle = INK; c.strokeRect(-75, -45, 150, 100);
  c.restore();
}
function cloud(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#fff'; c.beginPath(); for (const [a, b, r] of [[0, 0, 44], [50, -18, 52], [104, 0, 44], [52, 14, 42]]) c.arc(a, b, r, 0, 7); c.fill(); c.restore(); }
function block(c, x, y, w, h, col) { rr(c, x, y, w, h, 14); fillStroke(c, col, 6); }
function tree(c, x, base, s, t) {
  c.save(); c.translate(x, base); c.scale(s, s); rr(c, -22, -190, 44, 190, 12); fillStroke(c, '#9a6b4b', 6);
  const sw = Math.sin(t * 1.3 + x) * 5; c.translate(sw, 0);
  for (const [a, b, r, col] of [[0, -260, 120, '#58b368'], [-80, -200, 80, '#6cc279'], [86, -210, 86, '#4aa35c']]) { c.beginPath(); c.arc(a, b, r, 0, 7); fillStroke(c, col, 6); }
  c.restore();
}
function car(c, gy, wr, brake, t) {
  c.save(); c.translate(0, -brake * .3);
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(230, gy + 36, 330, 26, 0, 0, 7); c.fill();   // 影子 / shadow
  c.translate(0, -brake * .2);
  c.beginPath(); c.moveTo(-10, gy - 30); c.lineTo(-10, gy - 140); c.quadraticCurveTo(-8, gy - 175, 40, gy - 182); c.lineTo(180, gy - 190);
  c.quadraticCurveTo(250, gy - 310, 330, gy - 312); c.lineTo(470, gy - 304); c.quadraticCurveTo(520, gy - 290, 556, gy - 190);
  c.lineTo(620, gy - 170); c.quadraticCurveTo(650, gy - 150, 650, gy - 110); c.lineTo(650, gy - 30); c.closePath(); fillStroke(c, '#fafafa', 7);
  c.beginPath(); c.moveTo(214, gy - 200); c.quadraticCurveTo(262, gy - 292, 330, gy - 294); c.lineTo(440, gy - 290); c.quadraticCurveTo(480, gy - 270, 508, gy - 200); c.closePath(); fillStroke(c, '#9bd7ee', 6);
  c.fillStyle = '#ffd84d'; rr(c, 612, gy - 150, 36, 22, 8); c.fill(); c.fillStyle = '#ff6b6b'; rr(c, -8, gy - 150, 18, 30, 6); c.fill();
  for (const wx of [120, 530]) { c.save(); c.translate(wx, gy - 6); c.rotate(wr); c.beginPath(); c.arc(0, 0, 66, 0, 7); fillStroke(c, '#34343c', 7); c.beginPath(); c.arc(0, 0, 36, 0, 7); fillStroke(c, '#cfd3da', 5); for (let i = 0; i < 5; i++) { c.rotate(Math.PI * 2 / 5); c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 30); c.lineWidth = 6; c.strokeStyle = '#5a5f6b'; c.stroke(); } c.restore(); }
  c.restore();
}
function drawDoor(c, cx, gy, brake, open) {   // 前緣鉸鏈、scaleX 模擬外開；窗是鏤空＋淡藍玻璃 / door with see-through window
  c.save(); c.translate(cx + 440, gy - brake * .5); c.transform(lerp(1, .2, open), -open * .1, 0, 1, 0, 0);
  c.beginPath(); c.moveTo(-250, -34); c.lineTo(0, -34); c.lineTo(0, -188); c.lineTo(-32, -292); c.lineTo(-190, -296); c.lineTo(-250, -196); c.closePath();
  c.moveTo(-222, -204); c.lineTo(-18, -204); c.lineTo(-50, -282); c.lineTo(-170, -282); c.closePath();
  c.fillStyle = '#fafafa'; c.fill('evenodd'); c.lineWidth = 6; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); c.moveTo(-222, -204); c.lineTo(-18, -204); c.lineTo(-50, -282); c.lineTo(-170, -282); c.closePath(); c.fillStyle = 'rgba(155,215,238,.3)'; c.fill();
  rr(c, -70, -150, 40, 8, 4); c.fillStyle = INK; c.fill(); c.restore();
}
