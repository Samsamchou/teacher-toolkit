// 場景 07：Verse 3 課表猜謎＋AI 機器人。歌曲 106.10–119.74 s（第 32–36 句）。本地秒＝全曲−106.10。
// 歌詞↔畫面（本地秒；逐字時間取自 engine/song-data.js，beep／boop 取自原曲起音 117.72／118.01）：
//   #32 Does Andy have Chinese class on Tuesday?(0–2.90)【Andy】→ 大課表看板落下；"Andy"(0.40) Andy 用指示棒指看板上自己的名牌；
//                                                              "Chinese"(1.40) 中文卡彈出、飛向 "Tuesday"(2.46) Andy 那列的 TUE 格（TUE 欄頭發亮）
//   #33 No, he doesn't.(3.36–4.26)【Amy】             → Amy 搖頭、手指左右搖；中文卡被彈開掉落，TUE 格打紅色 ✗；Andy 聳肩笑 "ha-ha"
//   #34 Does Amy have computer class on Thursday?(4.26–6.84)【Amy】→ "Amy"(4.76) Amy 指自己的名牌；"computer"(5.42) 電腦卡彈出、飛向
//                                                              "Thursday"(6.50) Amy 那列的 THU 格（THU 欄頭發亮）
//   #35 Yes, she does.(7.44–9.08)【Andy】             → "Yes"(7.44) Andy 點頭比讚；電腦卡卡進格子、THU 格打綠色 ✓；Amy 跳一下；
//                                                              兩人轉側面走向右邊（鏡頭橫移 8.25–9.30，不硬切）
//   #36 She can chat with an AI robot. (beep-boop!)(9.08–11.95)【Andy】→ 電腦教室：圓頭 AI 機器人；"chat"(9.42) Amy 揮手、機器人螢幕臉開機、
//                                                              泡泡「Hi, Amy!」；"AI"(10.72) 胸前 AI 螢幕發亮；"robot"(11.20) 機器人揮手；
//                                                              "beep"(11.62)／"boop"(11.91) 機器人眼睛眨兩下、頭上冒星星；鏡頭慢慢推近
//   間奏(11.95–13.64)                                  → 三人隨拍跳舞（Amy、Andy 拍手，機器人點頭）
const S7 = 106.10;
const T7 = { does: 0, andy: 106.50 - S7, chinese: 107.50 - S7, tuesday: 108.56 - S7, no: 109.46 - S7, does2: 110.40 - S7, amy: 110.86 - S7, computer: 111.52 - S7,
  thursday: 112.60 - S7, yes: 113.54 - S7, she: 114.60 - S7, sheCan: 115.18 - S7, chat: 115.52 - S7, ai: 116.82 - S7, robot: 117.30 - S7, beep: 117.72 - S7, boop: 118.01 - S7 };
const WALK7 = [8.25, 9.30];                                  // 走向電腦教室（鏡頭橫移）/ walk + camera pan
// 對嘴時段（本地秒）：第 34 句依教師決定由 Amy 對嘴 / who sings when (line #34 = Amy by teacher decision)
const SING7 = { AMY: [[3.30, 6.95]], ANDY: [[0, 3.10], [7.40, 12.05]] };
const sings7 = (who, t) => SING7[who].some(([a, b]) => t >= a && t < b);
// 看板格子中心（世界座標）/ timetable cell centres
const s07Col = i => 446 + 102.8 + 205.6 * i, S7_ROW = [280, 400];
const S7_TUE = [s07Col(1), S7_ROW[0]], S7_THU = [s07Col(3), S7_ROW[1]];
const S7_TAG_ANDY = [380, 280], S7_TAG_AMY = [1540, 400];   // 看板上的名牌 / name tags on the board
const SCENE = {
  dur: 13.64, songStart: S7, tag: 'Timetable quiz!',
  draw(c, t) {
    const cam = track([[0, 0], [WALK7[0], 0], [WALK7[1], 1920, 'inOut']], t);
    const push = 1 + .05 * E.inOut(prog(t, WALK7[1], 13.64));          // 鏡頭推近機器人 / slow push-in
    c.save(); c.translate(1150, 900); c.scale(push, push); c.translate(-1150, -900);
    c.save(); c.translate(-cam, 0);
    s07Classroom(c, t); s07ComputerRoom(c, t);
    s07Board(c, t);
    s07Robot(c, t);
    const pa = s07Kid(c, t, 'AMY', AMY), pn = s07Kid(c, t, 'ANDY', ANDY);
    s07Cards(c, t);
    s07Pointers(c, t, pa, pn);
    s07Fx(c, t, pa, pn);
    c.restore(); c.restore();
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// 角色世界座標 x / world x of each kid
function s07X(t, who) {
  const amy = who === 'AMY';
  return track([[0, amy ? 1590 : 330], [WALK7[0], amy ? 1590 : 330], [WALK7[1], amy ? 2920 : 2440, 'inOut']], t);
}
// 正面角色的手掌位置（世界座標；不含 sway 旋轉）/ hand position of a kidFront pose
function s07Hand(p, sg) {
  const a = sg > 0 ? (p.ra || [.18, .1]) : (p.la || [.18, .1]), s = p.scale || 1;
  const x1 = sg * 44 + Math.sin(sg * a[0]) * 60, y1 = -136 + Math.cos(a[0]) * 60;
  const x2 = x1 + Math.sin(sg * (a[0] + a[1])) * 56, y2 = y1 + Math.cos(a[0] + a[1]) * 56;
  return [p.x + x2 * s, p.y - (p.hop || 0) + (-150 + (p.bounce || 0) + y2) * s];
}
// 正面／側面切換：走路時側面，其餘正面；切換點壓扁翻面（同 s04）/ front vs side view with flip-turns
function s07Kid(c, t, who, ch) {
  const x = s07X(t, who), y = 900, amy = who === 'AMY';
  const moving = t >= WALK7[0] && t < WALK7[1];
  let sq = 1; for (const e of WALK7) sq = Math.min(sq, 1 - Math.sin(clamp(prog(t, e - .11, e + .11)) * Math.PI) * .95);
  const talk = sings7(who, t) ? mouthAt(t) : 0, round = sings7(who, t) ? roundAt(t) : 0;
  c.save(); c.translate(x, 0); c.scale(Math.max(.05, sq), 1); c.translate(-x, 0);
  if (moving) { kid(c, ch, { x, y, face: 1, walk: t * 9, moving: true, talk, round, scale: .86, lean: .06, look: 1 }, t); c.restore(); return null; }
  const b = beatAt(t + S7), p = { x, y, scale: 1.0, talk, round, bounce: Math.pow(1 - b.f, 3) * 4, look: amy ? -1 : 1 };
  if (!amy) {
    if (t >= .15 && t < 3.25) Object.assign(p, { ra: [lerp(.2, 2.75, E.out(prog(t, T7.andy - .3, T7.andy))), .05], bounce: 0 });   // 指自己的名牌 / points at own name
    if (t >= T7.no + .35 && t < 4.4) Object.assign(p, danceMove('shrug', b, t), { nod: Math.sin((t - T7.no) * 16) * .06 });        // 聳肩笑 / shrug + laugh
    if (t >= 4.4 && t < T7.yes - .1) Object.assign(p, { ra: [.6, -2.3], nod: .06 });                                                // 想一想 / thinking
    if (t >= T7.yes - .1 && t < WALK7[0]) Object.assign(p, { ra: [2.6, .25], nod: Math.sin(clamp(prog(t, T7.yes, T7.yes + .6)) * Math.PI * 2) * .1 });   // 比讚＋點頭
    if (t >= WALK7[1] && t < 12.0) Object.assign(p, { ra: [lerp(.2, 1.35, E.out(prog(t, WALK7[1], WALK7[1] + .3))), -.25], la: [.3, .2], look: 1 });  // 攤手介紹機器人
    if (t >= 12.0) Object.assign(p, danceMove('clap', b, t), { look: 1 });
  } else {
    if (t >= 1.0 && t < T7.no) Object.assign(p, { la: [.6, -2.3], nod: -.05 });                                                     // 想一想 / finger to chin
    if (t >= T7.no && t < 4.3) Object.assign(p, { nod: Math.sin((t - T7.no) * 22) * .14 * (1 - prog(t, 4.0, 4.3)), ra: [1.9 + Math.sin(t * 20) * .18, 1.0] });  // 搖頭＋搖手指
    if (t >= 4.3 && t < T7.yes) Object.assign(p, { la: [lerp(.2, 2.75, E.out(prog(t, T7.amy - .35, T7.amy))), .05], bounce: 0 });   // 指自己的名牌 / points at own name
    if (t >= T7.yes && t < WALK7[0]) Object.assign(p, { la: [2.5, .2], ra: [2.5, .2], hop: Math.sin(clamp(prog(t, T7.yes + .1, T7.yes + .5)) * Math.PI) * 46, look: -1 });  // 跳一下 / hop
    if (t >= WALK7[1] && t < 12.0) Object.assign(p, { ra: [2.45, .4 + Math.sin(t * 10) * .4], la: [.2, .15], look: 1 });           // 對機器人揮手 / waves at robot
    if (t >= T7.beep && t < 12.0) p.hop = Math.max(0, Math.sin(clamp(prog(t, T7.beep, T7.beep + .35)) * Math.PI)) * 22;
    if (t >= 12.0) Object.assign(p, danceMove('clap', b, t), { look: 1 });
  }
  kidFront(c, ch, p, t);
  c.restore();
  return p;
}
function s07Classroom(c, t) {
  c.fillStyle = '#fdf0dc'; c.fillRect(-300, 0, 2220, 800); c.fillStyle = '#e8cfa6'; c.fillRect(-300, 760, 2220, 340);   // 牆、地板 / wall, floor
  c.fillStyle = 'rgba(0,0,0,.05)'; for (let x = -300; x < 1920; x += 120) c.fillRect(x, 760, 4, 340);
  c.fillStyle = '#f3dcb8'; c.fillRect(-300, 700, 2220, 60);                                                              // 牆裙 / dado
  for (const wx of [120, 1800]) { rr(c, wx - 90, 160, 180, 220, 12); fillStroke(c, '#bfe8f5', 6); c.beginPath(); c.moveTo(wx, 160); c.lineTo(wx, 380); c.moveTo(wx - 90, 270); c.lineTo(wx + 90, 270); c.lineWidth = 4; c.stroke(); }
  // 盆栽 / potted plants
  for (const px of [140, 1780]) { c.save(); c.translate(px, 760); rr(c, -40, -70, 80, 70, 10); fillStroke(c, '#d9675b', 5);
    for (const [a, r] of [[-.5, 1], [0, 1.2], [.5, 1]]) { c.save(); c.translate(0, -70); c.rotate(a + Math.sin(t * 1.5 + px) * .04); c.beginPath(); c.ellipse(0, -46 * r, 18, 46 * r, 0, 0, 7); fillStroke(c, '#7cc96a', 5); c.restore(); } c.restore(); }
  // 走到電腦教室的門框 / door frame between rooms
  rr(c, 1900, 120, 60, 680, 8); fillStroke(c, '#c98f5a', 6);
}
// 大課表看板（Mon–Fri × Andy／Amy 兩列）/ big Mon–Fri timetable board with Andy & Amy rows
function s07Board(c, t) {
  const k = E.back(prog(t, 0, .45)), dy = (1 - k) * -620;   // 開場落下 / drops in at the start
  c.save(); c.translate(0, dy);
  rr(c, 430, 132, 1060, 360, 22); fillStroke(c, '#a87850', 8); rr(c, 446, 148, 1028, 328, 12); c.fillStyle = '#fffaf0'; c.fill();
  rr(c, 790, 92, 340, 64, 20); fillStroke(c, '#ffd84d', 6); c.font = '900 38px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('TIMETABLE', 960, 138);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const litTue = prog(t, T7.tuesday - .05, T7.tuesday + .2) * (1 - prog(t, 4.2, 4.8)), litThu = prog(t, T7.thursday - .05, T7.thursday + .2) * (1 - prog(t, 8.4, 9.0));
  days.forEach((d, i) => {
    const x = s07Col(i), lit = i === 1 ? litTue : i === 3 ? litThu : 0;
    if (lit > 0) { c.save(); c.globalAlpha = lit * .6; c.fillStyle = '#fff3a6'; rr(c, x - 100, 154, 200, 316, 14); c.fill(); c.restore(); }   // 整欄發亮 / column glow
    c.save(); c.translate(x, 188); c.scale(1 + lit * .12, 1 + lit * .12); rr(c, -92, -26, 184, 52, 14); fillStroke(c, ED_DAYS[d][2], 5);
    c.font = '900 34px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = INK; c.strokeText(d, 0, 12); c.fillStyle = '#fff'; c.fillText(d, 0, 12); c.restore();
  });
  // 格子：兩人的課（被問的格子是 "?"）/ cells: each row's subjects; the quizzed cells show "?"
  const rows = [['math', null, 'English', 'PE', 'music'], ['Chinese', 'art', 'music', null, 'English']];
  rows.forEach((row, r) => row.forEach((key, i) => {
    const x = s07Col(i), y = S7_ROW[r]; rr(c, x - 94, y - 54, 188, 108, 12); fillStroke(c, r ? '#eefaf6' : '#eef3ff', 4);
    if (key) { c.save(); c.translate(x, y - 12); edSubjectIcon(c, key, .55); c.restore(); c.font = '700 22px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(key, x, y + 42); }
    else { c.font = '900 64px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(59,42,46,.25)'; c.fillText('?', x, y + 22); }
  }));
  // 名牌（看板左右兩側伸出）：唱到名字時放大發亮 / name tags on the board, pulse when the name is sung
  for (const [nm, [x, y], col, tw] of [['Andy', S7_TAG_ANDY, '#dbe8ff', T7.andy], ['Amy', S7_TAG_AMY, '#d6f5ee', T7.amy]]) {
    const pulse = Math.sin(clamp(prog(t, tw - .1, tw + .4)) * Math.PI), glow = prog(t, tw - .1, tw + .1) * (1 - prog(t, tw + 2.2, tw + 2.8));
    if (glow > 0) { c.save(); c.globalAlpha = glow * .6; c.fillStyle = '#fff3a6'; c.beginPath(); c.ellipse(x, y, 120, 70, 0, 0, 7); c.fill(); c.restore(); }
    nameTag(c, nm, x, y, 1 + pulse * .25, col);
  }
  // ✗ 在週二、✓ 在週四 / cross on Tuesday, tick on Thursday
  edCross(c, S7_TUE[0], S7_TUE[1], prog(t, T7.no + .05, T7.no + .4), 1.1);
  edTick(c, S7_THU[0] + 58, S7_THU[1] - 18, prog(t, T7.yes, T7.yes + .35), .8);
  c.restore();
}
// 學科卡飛行：中文卡（被彈開）與電腦卡（卡進格子）/ flying subject cards
function s07Cards(c, t) {
  // 中文卡："Chinese" 彈出 → "Tuesday" 到達週二格 → "No" 被彈開掉落 / Chinese card
  const ck = grpPop(t, T7.chinese - .08, 1e9, .3);
  if (ck > 0 && t < T7.no + 1.1) {
    const u = E.inOut(prog(t, T7.chinese + .2, T7.tuesday)), from = [590, 650];
    let x = lerp(from[0], S7_TUE[0], u), y = lerp(from[1], S7_TUE[1], u) - Math.sin(u * Math.PI) * 140, s = lerp(.85, .62, u), rot = Math.sin(u * Math.PI) * -.25, a = 1;
    if (t >= T7.tuesday && t < T7.no) { const w = 1 - prog(t, T7.tuesday, T7.tuesday + .5); rot = Math.sin((t - T7.tuesday) * 30) * .12 * w; }   // 到達格子時抖一下 / lands with a wobble
    if (t >= T7.no) { const v = prog(t, T7.no, T7.no + .9); x = S7_TUE[0] - 230 * v; y = S7_TUE[1] - 200 * v + 640 * v * v; rot = -v * 4; a = 1 - prog(t, T7.no + .6, T7.no + 1.0); }   // 彈開 / bounced off
    c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); edSubjectCard(c, 'Chinese', 0, 0, ck, t < T7.chinese + .5 ? 1 - prog(t, T7.chinese, T7.chinese + .5) : 0, s); c.restore();
    if (t < T7.chinese + .45) burst(c, from[0], from[1], prog(t, T7.chinese, T7.chinese + .45));
    if (t >= T7.no && t < T7.no + .3) s07Bonk(c, S7_TUE[0] - 60, S7_TUE[1] + 30, prog(t, T7.no, T7.no + .3));
  }
  // 電腦卡："computer" 彈出 → "Thursday" 到達週四格 → "Yes" 卡進去發亮 / computer card
  const pk = grpPop(t, T7.computer - .08, WALK7[0] + .2, .3);
  if (pk > 0) {
    const u = E.inOut(prog(t, T7.computer + .2, T7.thursday)), from = [1330, 650];
    const x = lerp(from[0], S7_THU[0], u), y = lerp(from[1], S7_THU[1], u) - Math.sin(u * Math.PI) * 140;
    const snap = E.back(prog(t, T7.yes - .05, T7.yes + .25)), s = lerp(.85, .62, u) * (t >= T7.yes - .05 ? lerp(1.12, 1, snap) : 1);
    const rot = t < T7.yes ? Math.sin(u * Math.PI) * .25 + (t > T7.thursday ? Math.sin((t - T7.thursday) * 8) * .05 : 0) : 0;
    const lit = (t < T7.computer + .5 ? 1 - prog(t, T7.computer, T7.computer + .5) : 0) + prog(t, T7.yes, T7.yes + .2) * (1 - prog(t, T7.yes + .9, T7.yes + 1.5));
    c.save(); c.translate(x, y); c.rotate(rot); edSubjectCard(c, 'computer', 0, 0, pk, clamp(lit), s); c.restore();
    if (t < T7.computer + .45) burst(c, from[0], from[1], prog(t, T7.computer, T7.computer + .45));
    if (t >= T7.yes && t < T7.yes + .7) burst(c, S7_THU[0], S7_THU[1], prog(t, T7.yes, T7.yes + .7));
  }
}
// 指示棒：從手指向自己的名牌 / pointer stick from the hand to the speaker's own name tag
function s07Pointers(c, t, pa, pn) {
  if (pn && t >= .15 && t < 3.25) s07Stick(c, s07Hand(pn, 1), [S7_TAG_ANDY[0] + 8, S7_TAG_ANDY[1] + 44], prog(t, T7.andy - .25, T7.andy) * (1 - prog(t, 3.0, 3.25)));
  if (pa && t >= 4.3 && t < T7.yes) s07Stick(c, s07Hand(pa, -1), [S7_TAG_AMY[0] - 8, S7_TAG_AMY[1] + 44], prog(t, T7.amy - .3, T7.amy) * (1 - prog(t, T7.yes - .25, T7.yes)));
}
function s07Stick(c, [hx, hy], [tx, ty], k) {
  if (k <= 0) return; const ex = lerp(hx, tx, E.out(k)), ey = lerp(hy, ty, E.out(k));
  c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.lineWidth = 16; c.strokeStyle = INK; c.stroke(); c.lineWidth = 8; c.strokeStyle = '#d9a35b'; c.stroke();
  c.beginPath(); c.arc(ex, ey, 10, 0, 7); fillStroke(c, '#ef4a4a', 4);
  c.beginPath(); c.arc(hx, hy, 15, 0, 7); fillStroke(c, '#f6cba6', 5);   // 握棒的手 / hand on top of the stick
}
// 小特效：問號泡泡、"ha-ha"、比讚、碰撞 / small effects
function s07Fx(c, t, pa, pn) {
  if (t < WALK7[0]) {
    edBubble(c, '?', 205, 470, grpPop(t, T7.chinese - .4, T7.no - .1), 40, 46);                 // Andy 出題（頭的另一側，不擋指示棒）/ Andy's quiz
    edBubble(c, '?', 1715, 470, grpPop(t, T7.computer - .4, T7.yes - .1), -40, 46);             // Amy 出題 / Amy's quiz
    const hk = grpPop(t, T7.no + .4, 4.5, .25);                                                  // Andy 聳肩笑 / Andy laughs
    if (hk > 0) for (const [dx, dy, ph] of [[110, -300, 0], [150, -240, 1.4]]) { c.save(); c.translate(330 + dx, 900 + dy + Math.sin(t * 14 + ph) * 6); c.scale(hk, hk); c.rotate(-.12);
      c.font = '900 40px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = '#fff'; c.strokeText('ha!', 0, 0); c.fillStyle = '#f59a3c'; c.fillText('ha!', 0, 0); c.restore(); }
    if (pn && t >= T7.yes - .1) { const [hx, hy] = s07Hand(pn, 1); s07Thumb(c, hx, hy, E.back(prog(t, T7.yes - .1, T7.yes + .15))); }
  }
  // 電腦教室：「Hi, Amy!」、beep／boop 字 / computer room bubbles
  const rx = 1920 + 1480;
  edBubble(c, 'Hi, Amy!', rx - 290, 330, grpPop(t, T7.chat + .12, T7.beep - .15), 110, 44);
  for (const [w, tw, dx] of [['beep!', T7.beep, -170], ['boop!', T7.boop, 170]]) {
    const k = grpPop(t, tw - .03, tw + .9, .2); if (k <= 0) continue;
    grpTitle(c, w, rx + dx, 330 - prog(t, tw, tw + 1.1) * 40, k, t, 58, '#5ef2e6');
  }
}
function s07Bonk(c, x, y, k) { c.save(); c.translate(x, y); c.globalAlpha = 1 - k; c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * (30 + 40 * k), Math.sin(a) * (30 + 40 * k)); c.lineTo(Math.cos(a) * (55 + 50 * k), Math.sin(a) * (55 + 50 * k)); c.stroke(); } c.restore(); }
function s07Thumb(c, x, y, k) { if (k <= 0) return; c.save(); c.translate(x, y - 6); c.scale(k, k); rr(c, -18, -14, 36, 32, 10); fillStroke(c, ANDY.skin, 5); rr(c, -8, -44, 16, 36, 8); fillStroke(c, ANDY.skin, 5); c.restore(); }
// 電腦教室（世界 x 1920–3880）/ computer room
function s07ComputerRoom(c, t) {
  c.fillStyle = '#e9eeff'; c.fillRect(1960, 0, 2000, 800); c.fillStyle = '#c9d4e6'; c.fillRect(1960, 760, 2000, 340);
  c.fillStyle = 'rgba(60,80,120,.08)'; for (let x = 1960; x < 3960; x += 110) c.fillRect(x, 760, 4, 340); c.fillRect(1960, 860, 2000, 4);
  c.fillStyle = '#dfe5fb'; c.fillRect(1960, 700, 2000, 60);
  // 招牌 / sign
  rr(c, 2700, 70, 420, 84, 22); fillStroke(c, '#7cc96a', 6); c.font = '900 44px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = INK; c.strokeText('COMPUTER ROOM', 2910, 128); c.fillStyle = '#fff'; c.fillText('COMPUTER ROOM', 2910, 128);
  // 窗 / window
  rr(c, 2040, 170, 240, 220, 12); fillStroke(c, '#bfe8f5', 6); c.beginPath(); c.moveTo(2160, 170); c.lineTo(2160, 390); c.moveTo(2040, 280); c.lineTo(2280, 280); c.lineWidth = 4; c.stroke();
  // 後排電腦桌（避開角色站位）/ back desks with monitors, between the characters
  rr(c, 1980, 640, 1900, 30, 8); fillStroke(c, '#c98f5a', 5);
  for (const lx of [1920 + 175, 1920 + 760, 1920 + 1240, 1920 + 1750]) {
    rr(c, lx - 18, 610, 36, 34, 4); fillStroke(c, '#9aa6b8', 4);
    rr(c, lx - 80, 506, 160, 108, 12); fillStroke(c, '#5a6b85', 5); rr(c, lx - 68, 518, 136, 84, 6); c.fillStyle = '#bfe8f5'; c.fill();
    c.save(); c.translate(lx, 560); const ic = (lx / 10) % 3 | 0; c.fillStyle = ['#ff8c78', '#7cc96a', '#8b7fd8'][ic];
    if (ic === 0) { c.font = '900 34px "Inter",sans-serif'; c.textAlign = 'center'; c.fillText('ABC', 0, 12); }
    else if (ic === 1) { c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(-9, -5, 4, 0, 7); c.arc(9, -5, 4, 0, 7); c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.beginPath(); c.arc(0, 2, 13, .3, Math.PI - .3); c.stroke(); }
    else { for (let i = 0; i < 3; i++) { c.fillRect(-36 + i * 26, 20 - (i + 1) * 14, 18, (i + 1) * 14); } }
    c.restore();
  }
}
// AI 機器人（自創：圓頭、臉是螢幕、平塗＋墨線）/ the AI robot: round head, screen face, flat colours with ink outlines
function s07Robot(c, t) {
  const x = 1920 + 1480, y = 900; if (t < WALK7[0] - .5) return;
  const b = beatAt(t + S7), on = Math.pow(1 - b.f, 3);
  const scr = prog(t, T7.chat - .1, T7.chat + .2);                                            // 螢幕臉開機 / screen boots on "chat"
  const blink = Math.max(...[T7.beep, T7.boop].map(tb => Math.sin(clamp(prog(t, tb - .02, tb + .16)) * Math.PI)));   // 眨兩下 / two blinks
  const ai = prog(t, T7.ai - .05, T7.ai + .2);                                                 // 胸前 AI 發亮 / chest screen lights
  const wave = t >= T7.robot - .05 ? E.out(prog(t, T7.robot - .05, T7.robot + .2)) * (1 - prog(t, T7.beep - .1, T7.beep + .1)) : 0;
  const dance = t >= 12.0 ? 1 : 0, bob = (t >= T7.robot ? on * 8 : 0) + Math.sin(t * 2.2) * 3;
  const tilt = dance ? Math.sin((b.i + b.f) * Math.PI) * .12 : Math.sin(t * 1.6) * .04;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(0, 6, 90, 15, 0, 0, 7); c.fill();
  // 腿與腳 / legs and feet
  for (const sg of [-1, 1]) { rr(c, sg * 34 - 14, -100, 28, 90, 12); fillStroke(c, '#aab6c8', 5); rr(c, sg * 34 - 30, -24, 60, 28, 14); fillStroke(c, '#5a6b85', 5); }
  c.translate(0, -bob);
  // 手臂：左手垂下，右手在 "robot" 揮手；跳舞時雙手上下 / arms
  const la = dance ? [.5 + on * .6, .4] : [.35, .25], raA = lerp(.35, 2.5, wave), raE = lerp(.25, .4 + Math.sin(t * 11) * .45, wave);
  const ra = dance ? [.5 + (1 - on) * .6, .4] : [raA, raE];
  for (const [sg, a] of [[-1, la], [1, ra]]) { const [hx, hy] = limb(c, sg * 76, -222, sg * a[0], sg * a[1], 52, 46, 20, '#c7d3e3'); c.beginPath(); c.arc(hx, hy, 17, 0, 7); fillStroke(c, '#f59a3c', 5); }
  // 身體＋胸前 AI 螢幕 / body with "AI" chest screen
  rr(c, -78, -250, 156, 170, 44); fillStroke(c, '#e3ebf5', 7);
  rr(c, -48, -216, 96, 62, 16); fillStroke(c, '#2b3550', 5);
  if (ai > 0) { c.save(); c.globalAlpha = ai; c.font = '900 40px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.shadowColor = '#5ef2e6'; c.shadowBlur = 18 * ai; c.fillStyle = '#5ef2e6'; c.fillText('AI', 0, -170); c.restore(); }
  for (const bx of [-24, 0, 24]) { c.beginPath(); c.arc(bx, -122, 8, 0, 7); fillStroke(c, ['#ff8c78', '#ffd84d', '#7cc96a'][(bx / 24 + 1) | 0], 3); }
  // 頭（圓頭＋螢幕臉）/ round head with a screen face
  c.save(); c.translate(0, -345); c.rotate(tilt);
  rr(c, -16, 70, 32, 34, 6); fillStroke(c, '#aab6c8', 5);                                       // 脖子 / neck
  c.beginPath(); c.moveTo(0, -92); c.lineTo(0, -132); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  const ant = scr > 0 ? .5 + .5 * Math.sin(t * 6) : 0; c.beginPath(); c.arc(0, -140, 15, 0, 7); fillStroke(c, ant > 0 ? `rgb(255,${180 + ant * 60 | 0},90)` : '#e0474c', 5);   // 天線燈 / antenna light
  for (const sg of [-1, 1]) { rr(c, sg * 100 - 14, -26, 28, 52, 10); fillStroke(c, '#f59a3c', 5); }   // 耳朵螺栓 / ear bolts
  c.beginPath(); c.arc(0, 0, 96, 0, 7); fillStroke(c, '#e3ebf5', 7);
  rr(c, -70, -56, 140, 110, 32); fillStroke(c, '#22304a', 5);                                  // 螢幕臉 / screen face
  if (scr > 0) {
    c.save(); c.globalAlpha = scr; c.fillStyle = '#5ef2e6'; c.shadowColor = '#5ef2e6'; c.shadowBlur = 14;
    const eh = 34 * (1 - blink * .9), flash = blink > .5;
    for (const ex of [-30, 30]) { rr(c, ex - 12, -14 - eh / 2, 24, eh, 10); c.fill(); }
    if (flash) { c.fillStyle = '#fff'; for (const ex of [-30, 30]) { c.beginPath(); c.arc(ex, -14, 6, 0, 7); c.fill(); } }
    c.lineWidth = 6; c.strokeStyle = '#5ef2e6'; c.lineCap = 'round'; c.beginPath();
    if (blink > .2) { c.ellipse(0, 26, 9, 9, 0, 0, 7); c.stroke(); }                              // "o" 嘴 / beep mouth
    else { c.arc(0, 14, 18, .35, Math.PI - .35); c.stroke(); }
    c.shadowBlur = 0; c.fillStyle = 'rgba(255,140,170,.7)'; for (const ex of [-50, 50]) { c.beginPath(); c.ellipse(ex, 18, 9, 5, 0, 0, 7); c.fill(); }
    if (scr < 1) { c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(-66, -56 + scr * 110, 132, 6); }   // 開機掃描線 / boot scan line
    c.restore();
  } else { c.fillStyle = '#5ef2e6'; c.beginPath(); c.arc(50, 36, 5, 0, 7); c.fill(); }          // 待機小燈 / standby dot
  c.beginPath(); c.ellipse(-46, -60, 22, 9, -.5, 0, 7); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();   // 反光 / highlight
  c.restore();
  c.restore();
  // "beep"／"boop" 頭上冒星星 / stars pop from the head on beep and boop
  for (const tb of [T7.beep, T7.boop]) if (t >= tb && t < tb + .6) burst(c, x, y - bob - 470, prog(t, tb, tb + .6));
}
