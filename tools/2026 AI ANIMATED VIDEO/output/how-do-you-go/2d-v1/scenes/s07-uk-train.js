// 場景 07：UK | by train。歌曲 84.06–91.06 s（前面是 2.4 s 間奏，本場景剛好從 "Where" 開始）。本地時間 t 從 0 起算。
// 動作依原曲逐字時碼（engine/song-data.js → SONG.cues）編排，每個關鍵字都有對應畫面：
//   Where(0) is Alan(0.94) from?    → 紅磚柱旁跳出「?」卡；Alan 先從柱子後探頭，"Alan" 時跳出來揮手＋名牌
//   He is from the UK(2.70)         → 英國國旗泡泡
//   How(3.26) does he go(4.48) to school(4.88)? → 「?」卡＋歪頭想；"go" 轉頭指向左邊軌道（遠方車燈亮起）；"school" 時發車看板 SCHOOL 亮起
//   He goes to school(5.76) by(6.04) train(6.56) → 火車從左邊駛入、減速，"train" 剛好停穩（車身一晃）；「by train」字卡、車門打開，Alan 走向車門上車
// 對嘴：兩句都是旁白式第三人稱（Where is Alan… / He goes…），Alan 全程不開口，只微笑、點頭、揮手、反應。
// 嘴型資料：scenes/s07-uk-train.lipsync.js（本場景不使用 mouthAt，只保留檔案以利日後調整）
const CH_UK = CAST.UK;
const WT7 = { where: 0, alan: .94, from1: 1.26, he1: 1.80, uk: 2.70, how: 3.26, does: 4.02, go: 4.48, school1: 4.88, he2: 5.22, school2: 5.76, by: 6.04, train: 6.56 };
const S07_GY = 900, S07_PIL = 520, S07_STOP = 1240;   // Alan 腳底 y、紅磚柱中心 x、車頭停車位置 / feet line, pillar x, nose stop x
const S07_DOOR = -330;                                 // 停車後對準 Alan 的車門（相對車頭）/ boarding door offset from the nose

// 火車車頭 x：4.75 s 從左側高速進站，減速到 "train" 剛好停住 / nose x: brakes into the station, stops on "train"
function s07TrainX(t) { return track([[0, -300], [4.75, -300], [WT7.train, S07_STOP, 'out']], t); }

const SCENE = {
  dur: 7.00, songStart: 84.06, tag: 'UK | by train',
  cues: [[0.0, 3.26, 'Where is Alan from? He is from the UK.'], [3.26, 7.00, 'How does he go to school? He goes to school by train.']],
  draw(c, t) {
    const beat = Math.sin(t * Math.PI * 2 * 1.03);
    // 對面紅磚站房＋拱窗 / far red-brick station building with arched windows
    c.fillStyle = '#c96a4f'; c.fillRect(0, 0, W, 700);
    c.strokeStyle = 'rgba(90,40,30,.28)'; c.lineWidth = 3;
    for (let y = 190, r = 0; y < 640; y += 30, r++) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (r % 2) * 40; x < W; x += 80) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 30); c.stroke(); } }
    for (let x = 120; x < W; x += 360) s07Arch(c, x, 300);
    s07Poster(c, 1530, 330);
    // 對面月台與軌道 / far platform + track bed
    c.fillStyle = '#d9d2c3'; c.fillRect(0, 640, W, 44); c.fillStyle = '#ffffff'; c.fillRect(0, 676, W, 8);
    c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.moveTo(0, 640); c.lineTo(W, 640); c.stroke();
    c.fillStyle = '#7d7268'; c.fillRect(0, 684, W, 100);
    c.fillStyle = '#5e5249'; for (let x = 10; x < W; x += 70) c.fillRect(x, 740, 40, 14);   // 枕木 / sleepers
    c.fillStyle = '#b8bcc4'; c.fillRect(0, 734, W, 8);
    // 遠方車燈：火車快到時從左邊照過來 / headlight glow from the left before the train appears
    const glow = prog(t, WT7.go - .35, WT7.go + .1) * (1 - prog(t, 4.9, 5.1));
    if (glow > 0) { const rg = c.createRadialGradient(0, 560, 20, 0, 560, 520); rg.addColorStop(0, `rgba(255,240,170,${.85 * glow})`); rg.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = rg; c.fillRect(0, 40, 540, 1040); }
    // 火車 / train
    const tx = s07TrainX(t), rock = Math.sin(clamp(prog(t, WT7.train, WT7.train + .4)) * Math.PI) * 9;
    const open = track([[0, 0], [WT7.train + .04, 0], [WT7.train + .32, 1, 'out']], t);
    s07Train(c, tx, rock, open, t);
    // 雨棚與英國三色小旗串 / platform canopy with bunting
    s07Canopy(c, t);
    s07Board(c, 1250, 200, t);
    s07Clock(c, 1690, 200, t);
    // 近月台 / near platform
    c.fillStyle = '#e6dfd0'; c.fillRect(0, 770, W, H - 770);
    c.fillStyle = '#ffffff'; c.fillRect(0, 770, W, 14); c.fillStyle = '#ffd84d'; c.fillRect(0, 800, W, 12);
    c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.moveTo(0, 770); c.lineTo(W, 770); c.stroke();
    c.strokeStyle = 'rgba(59,42,46,.12)'; c.lineWidth = 3; for (let x = 0; x < W; x += 150) { c.beginPath(); c.moveTo(x, 812); c.lineTo(x - 60, H); c.stroke(); }
    s07Bench(c, 1500, 905);
    // Alan（畫在紅磚柱前一層之前：躲在柱子後）/ Alan, drawn before the pillar so he can hide behind it
    const a = s07Pose(t, beat);
    c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(a.x + 6, a.y + 5, 72 * a.scale, 13 * a.scale, 0, 0, 7); c.fill();
    kid(c, CH_UK, a, t);
    s07Pillar(c, S07_PIL, 935);
    // "Where…?"：柱子旁的問號 / question card by the pillar on "Where"
    const wk = E.back(prog(t, WT7.where + .05, WT7.where + .35)) * (1 - prog(t, WT7.alan + .05, WT7.alan + .3));
    if (wk > 0) wordCard(c, S07_PIL + 190, 420, '?', wk);
    // "Alan" 名牌 / name tag
    const nk = E.back(prog(t, WT7.alan, WT7.alan + .3)) * (1 - prog(t, WT7.uk - .3, WT7.uk - .05));
    if (nk > 0) nameTag(c, 'Alan', a.x + 10, 470 - (a.hop || 0), nk);
    // "the UK" 國旗泡泡 / flag bubble
    const fk = E.back(prog(t, WT7.uk, WT7.uk + .35)) * (1 - prog(t, WT7.how + .1, WT7.how + .4));
    if (fk > 0) countryBubble(c, 'UK', a.x + 10, 430, fk, t);
    // "How does he go to school?" 問號 / question card
    const qk = E.back(prog(t, WT7.how, WT7.how + .3)) * (1 - prog(t, WT7.school1 + .15, WT7.school1 + .4));
    if (qk > 0) wordCard(c, a.x + 200, 470, '?', qk);
    // "by train" 字卡＋停車星星 / word card and burst on "train"
    const ck = E.back(prog(t, WT7.train, WT7.train + .3));
    if (ck > 0) wordCard(c, 1530, 570, 'by train', ck);
    if (t > WT7.train) burst(c, S07_STOP - 20, 520, prog(t, WT7.train, WT7.train + .6));
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// Alan 姿勢時間軸 / Alan's pose timeline
function s07Pose(t, beat) {
  // 柱後 → 探頭 → "Alan" 跳出來 → 停車後走向車門 / hide, peek, pop out, then walk to the door
  const board = prog(t, WT7.train + .18, 7.0);
  const x0 = track([[0, S07_PIL - 30], [.28, S07_PIL - 30], [.5, S07_PIL + 78, 'out'], [.86, S07_PIL + 78], [1.2, 840, 'out']], t);
  const x = lerp(x0, S07_STOP + S07_DOOR - 20, E.inOut(board));
  const moving = (t > .28 && t < .5) || (t > .86 && t < 1.2) || (board > 0 && board < 1);
  const hop = Math.sin(clamp(prog(t, WT7.alan - .06, WT7.alan + .3)) * Math.PI) * 55 + Math.sin(clamp(prog(t, WT7.train, WT7.train + .35)) * Math.PI) * 40;
  const wave = prog(t, WT7.alan, WT7.alan + .2) * (1 - prog(t, WT7.he1 + .3, WT7.he1 + .6));
  const peek = Math.sin(clamp(prog(t, .3, .9)) * Math.PI);                               // 探頭時身體往前傾 / lean out to peek
  // 轉向：唱 "does" 轉頭看左邊軌道，火車經過時轉回右邊 / face left toward the train, then back
  const face = lerp(1, -1, E.inOut(prog(t, WT7.does, WT7.does + .14))) * 1 + 0;
  const back = E.inOut(prog(t, 5.62, 5.76));
  const f = lerp(face, 1, back);
  const point = prog(t, WT7.go - .15, WT7.go + .1) * (1 - prog(t, 5.3, 5.55));             // "go" 指向遠方車燈 / point at the headlight
  const think = Math.sin(clamp(prog(t, WT7.how, WT7.does)) * Math.PI) * .14;               // "How…?" 歪頭想 / tilt head
  const raise = prog(t, WT7.by - .1, WT7.by + .15) * (1 - prog(t, WT7.train + .2, WT7.train + .4));   // "by" 握拳期待
  const cheer = prog(t, WT7.train - .05, WT7.train + .15) * (1 - prog(t, WT7.train + .25, WT7.train + .4));
  return {
    x, y: lerp(S07_GY, 806, E.inOut(board)), face: Math.abs(f) < .08 ? .08 * Math.sign(f || 1) : f,
    scale: lerp(.9, .8, E.inOut(board)), walk: t * 8.2, moving, hop, wave, point, raise, cheer,
    lean: peek * .2 + (moving ? .06 : 0), nod: think + (moving ? 0 : beat * .04), talk: 0, round: 0, look: 1,
  };
}
// 對面站房拱窗 / arched window on the far wall
function s07Arch(c, x, y) {
  c.beginPath(); c.moveTo(x, y + 190); c.lineTo(x, y + 70); c.arc(x + 70, y + 70, 70, Math.PI, 0); c.lineTo(x + 140, y + 190); c.closePath(); fillStroke(c, '#f2e3c9', 7);
  c.beginPath(); c.moveTo(x + 18, y + 176); c.lineTo(x + 18, y + 72); c.arc(x + 70, y + 72, 52, Math.PI, 0); c.lineTo(x + 122, y + 176); c.closePath(); fillStroke(c, '#9fd0e6', 5);
  c.beginPath(); c.moveTo(x + 70, y + 20); c.lineTo(x + 70, y + 176); c.moveTo(x + 18, y + 110); c.lineTo(x + 122, y + 110); c.lineWidth = 5; c.stroke();
}
function s07Poster(c, x, y) {
  rr(c, x, y, 200, 150, 10); fillStroke(c, '#fff6d6', 6);
  c.font = '800 34px "Inter","Segoe UI",sans-serif'; c.fillStyle = '#283a6e'; c.textAlign = 'center'; c.fillText('Platform', x + 100, y + 62); c.font = '900 56px "Inter","Segoe UI",sans-serif'; c.fillStyle = '#c0392b'; c.fillText('2', x + 100, y + 124); c.textAlign = 'left';
}
// 火車：紅色車身、奶油色窗帶、英國式黃色車頭 / red train with cream window band and yellow UK-style nose
function s07Train(c, X, rock, open, t) {
  if (X < -260) return;
  c.save(); c.translate(X, 0); c.rotate(rock * .0012); c.translate(0, -Math.abs(rock) * .3);
  const L = 2700, top = 352, bot = 742;
  // 車輪轉向架 / bogies
  for (const bx of [-180, -520, -900, -1240, -1620, -1960, -2340]) for (const dx of [-50, 50]) { c.save(); c.translate(bx + dx, bot + 6); c.rotate(X / 40); c.beginPath(); c.arc(0, 0, 30, 0, 7); fillStroke(c, '#34343c', 6); c.fillStyle = '#9aa0a8'; c.fillRect(-4, -22, 8, 44); c.restore(); }
  // 車身外形 / body outline
  c.beginPath(); c.moveTo(-L, top); c.lineTo(-150, top); c.quadraticCurveTo(-10, top + 4, 40, top + 150); c.lineTo(52, bot - 20); c.quadraticCurveTo(52, bot, 30, bot); c.lineTo(-L, bot); c.closePath(); fillStroke(c, '#c0392b', 7);
  // 奶油窗帶 / cream band
  c.save(); c.clip(); c.fillStyle = '#f4e6c6'; c.fillRect(-L, top + 60, L + 100, 150);
  // 黃色車頭警示板 / yellow warning nose
  c.beginPath(); c.moveTo(-60, top); c.quadraticCurveTo(-10, top + 4, 40, top + 150); c.lineTo(60, bot); c.lineTo(-90, bot); c.lineTo(-90, top); c.closePath(); c.fillStyle = '#ffd84d'; c.fill();
  c.restore();
  c.beginPath(); c.moveTo(-L, top); c.lineTo(-150, top); c.quadraticCurveTo(-10, top + 4, 40, top + 150); c.lineTo(52, bot - 20); c.quadraticCurveTo(52, bot, 30, bot); c.lineTo(-L, bot); c.closePath(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
  // 車頭擋風玻璃、車燈、目的地 / windscreen, headlights, destination
  c.beginPath(); c.moveTo(-70, top + 30); c.lineTo(-120, top + 30); c.lineTo(-120, top + 150); c.lineTo(28, top + 150); c.quadraticCurveTo(0, top + 50, -70, top + 30); c.closePath(); fillStroke(c, '#2e3b55', 6);
  for (const hy of [bot - 70]) { c.beginPath(); c.arc(30, hy, 14, 0, 7); fillStroke(c, '#fffbe6', 5); }
  rr(c, -300, top + 14, 180, 40, 8); c.fillStyle = '#20222c'; c.fill();
  c.font = '800 28px "Inter",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffbe3c'; c.fillText('SCHOOL', -210, top + 44); c.textAlign = 'left';
  // 車廂接縫 / car joint
  c.fillStyle = INK; c.fillRect(-1360, top, 10, bot - top);
  // 車窗與車門 / windows and doors
  const doors = [S07_DOOR, -1010, -1700, -2380];
  for (let x = -250; x > -L + 60; x -= 190) { if (doors.some(d => Math.abs(x + 70 - d) < 150) || Math.abs(x + 70 + 1355) < 90) continue; rr(c, x - 70, top + 80, 140, 110, 14); fillStroke(c, '#a9dcf2', 5); }
  for (const d of doors) {
    c.fillStyle = '#3a3248'; rr(c, d - 90, top + 50, 180, bot - top - 60, 8); c.fill();                  // 車廂內部 / interior
    if (d === S07_DOOR) { c.fillStyle = '#ffe9a8'; c.globalAlpha = open * .5; c.fillRect(d - 80, top + 60, 160, 260); c.globalAlpha = 1; }
    for (const sg of [-1, 1]) {
      const off = d === S07_DOOR ? sg * open * 86 : 0, x0 = d + (sg < 0 ? -90 : 0) + off;
      rr(c, x0, top + 50, 90, bot - top - 60, 6); fillStroke(c, '#ffd84d', 5);
      rr(c, x0 + 18, top + 80, 54, 110, 8); fillStroke(c, '#a9dcf2', 4);
    }
    if (d === S07_DOOR && open > .02 && open < .98) { c.fillStyle = '#7ce07c'; c.beginPath(); c.arc(d, top + 36, 9, 0, 7); c.fill(); }
  }
  c.restore();
}
// 雨棚＋木質鋸齒簷＋三色小旗 / canopy with saw-tooth valance and bunting
function s07Canopy(c, t) {
  c.fillStyle = '#5b6f5a'; c.fillRect(0, 0, W, 130); c.lineWidth = 6; c.strokeStyle = INK;
  c.beginPath(); c.moveTo(0, 130); for (let x = 0; x <= W; x += 40) { c.lineTo(x + 20, 172); c.lineTo(x + 40, 130); } c.lineTo(W, 0); c.lineTo(0, 0); c.closePath(); c.fillStyle = '#f2ead6'; c.fill(); c.stroke();
  c.fillStyle = '#5b6f5a'; c.fillRect(0, 0, W, 112); c.beginPath(); c.moveTo(0, 112); c.lineTo(W, 112); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.15)'; for (let x = 0; x < W; x += 160) c.fillRect(x, 0, 60, 112);
  const cols = ['#c8102e', '#fff', '#012169'];
  c.beginPath(); c.moveTo(0, 196); c.quadraticCurveTo(W / 4, 236, W / 2, 196); c.quadraticCurveTo(W * 3 / 4, 236, W, 196); c.lineWidth = 3; c.stroke();
  for (let i = 0; i < 24; i++) {
    const x = 40 + i * 80, u = (x % (W / 2)) / (W / 2), y = 196 + 4 * u * (1 - u) * 20 * 1, sw = Math.sin(t * 3 + i) * .08;
    c.save(); c.translate(x, y); c.rotate(sw); c.beginPath(); c.moveTo(-22, 0); c.lineTo(22, 0); c.lineTo(0, 40); c.closePath(); fillStroke(c, cols[i % 3], 4); c.restore();
  }
}
// 發車看板：唱到 "school" 時 SCHOOL 亮起 / departure board lights SCHOOL on each "school"
function s07Board(c, x, y, t) {
  c.lineWidth = 5; c.strokeStyle = INK; for (const dx of [-120, 120]) { c.beginPath(); c.moveTo(x + dx, 112); c.lineTo(x + dx, y + 30); c.stroke(); }
  rr(c, x - 210, y + 30, 420, 100, 14); fillStroke(c, '#20222c', 7);
  const lit = Math.max(prog(t, WT7.school1, WT7.school1 + .12) * (1 - prog(t, WT7.school1 + .6, WT7.school1 + .85)),
    prog(t, WT7.school2, WT7.school2 + .12) * (1 - prog(t, WT7.school2 + .6, WT7.school2 + .85)));
  if (lit > 0) { c.fillStyle = `rgba(255,190,60,${.25 * lit})`; rr(c, x - 200, y + 40, 400, 80, 10); c.fill(); }
  c.font = '800 44px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center';
  c.fillStyle = `rgba(255,190,60,${.55 + .45 * lit})`; c.save(); c.translate(x, y + 96); c.scale(1 + lit * .08, 1 + lit * .08); c.fillText('08:15  SCHOOL', 0, 0); c.restore(); c.textAlign = 'left';
}
// 掛鐘 / hanging station clock
function s07Clock(c, x, y, t) {
  c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.moveTo(x, 112); c.lineTo(x, y + 20); c.stroke();
  c.beginPath(); c.arc(x, y + 82, 66, 0, 7); fillStroke(c, '#283a6e', 7); c.beginPath(); c.arc(x, y + 82, 52, 0, 7); fillStroke(c, '#fffdf4', 4);
  c.fillStyle = INK; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.arc(x + Math.sin(a) * 42, y + 82 - Math.cos(a) * 42, 3.5, 0, 7); c.fill(); }
  const m = (15 + t * 1.2) / 60 * Math.PI * 2, h = (8 + 15 / 60) / 12 * Math.PI * 2;
  c.lineCap = 'round'; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y + 82); c.lineTo(x + Math.sin(h) * 26, y + 82 - Math.cos(h) * 26); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.moveTo(x, y + 82); c.lineTo(x + Math.sin(m) * 40, y + 82 - Math.cos(m) * 40); c.stroke();
}
// 紅磚柱（Alan 躲在後面）/ red-brick pillar Alan hides behind
function s07Pillar(c, x, base) {
  const w = 180, top = 112;
  rr(c, x - w / 2, top, w, base - top, 8); fillStroke(c, '#b5533c', 7);
  c.strokeStyle = 'rgba(70,30,20,.35)'; c.lineWidth = 3;
  for (let y = top + 30, r = 0; y < base - 40; y += 30, r++) { c.beginPath(); c.moveTo(x - w / 2 + 4, y); c.lineTo(x + w / 2 - 4, y); c.stroke(); for (let k = x - w / 2 + (r % 2 ? 30 : 60); k < x + w / 2; k += 60) { c.beginPath(); c.moveTo(k, y); c.lineTo(k, y + 30); c.stroke(); } }
  rr(c, x - w / 2 - 14, base - 46, w + 28, 46, 6); fillStroke(c, '#e2d6bd', 6);
  rr(c, x - w / 2 - 14, top + 52, w + 28, 32, 6); fillStroke(c, '#e2d6bd', 6);
}
function s07Bench(c, x, base) {
  for (const dx of [-120, 120]) { rr(c, x + dx - 8, base - 90, 16, 90, 4); fillStroke(c, '#3a3d48', 5); }
  rr(c, x - 170, base - 104, 340, 22, 8); fillStroke(c, '#8a5a3c', 6);
  rr(c, x - 170, base - 170, 340, 22, 8); fillStroke(c, '#8a5a3c', 6);
  rr(c, x - 170, base - 140, 340, 22, 8); fillStroke(c, '#8a5a3c', 6);
}
