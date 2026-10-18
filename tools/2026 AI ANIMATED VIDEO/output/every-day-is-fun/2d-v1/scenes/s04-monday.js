// 場景 04：Verse 2 週一上學。歌曲 64.66–78.64 s（第 17–23 句）。本地秒＝全曲−64.66。
// 歌詞↔畫面（本地秒；逐字時間取自 engine/song-data.js 與 data/asr-*.json）：
//   #17 Today is Monday. Time for school.(0–2.32)【Andy】→ 兩人走進教室；"Monday"(1.16) MON 星期卡彈出；"Time for school"(1.38) 上課鐘響
//   #18 Do you have music class on Monday?(2.32–4.53)【Andy】→ 黑板出現週一課表；"music"(3.18) 音樂卡飛出、Andy 指著它
//   #19 No, I don't.(4.58–5.40)【Amy】            → Amy 搖頭；音樂卡打上紅色 ✗
//   #20 Do you have PE class on Monday?(5.40–7.77)【Andy】→ "PE"(6.22) 課表的 PE 列發光，Andy 指黑板
//   #21 Yes, I do.(7.90–8.66)【Amy】              → Amy 比讚；PE 列打上綠色 ✓
//   #22 Me, too. I like playing basketball in PE class.(8.66–12.14)【Andy】→ "Me"(9.02) Andy 手放胸口；兩人走向體育館（鏡頭橫移）；"basketball"(10.72) 籃球彈到 Andy 手上
//   #23 (dribble, dribble!)(12.14–13.98)【兩人】   → 實唱 4 次 dribble：12.14／13.06／13.32／13.60 球各落地一次；最後投籃「唰」進框
const S4 = 64.66;
const T4 = { monday: 65.82 - S4, time: 66.04 - S4, music: 67.84 - S4, no: 69.24 - S4, pe: 70.88 - S4, yes: 72.56 - S4, me: 73.68 - S4, basketball: 75.38 - S4 };
const DRIB4 = [76.80, 77.72, 77.98, 78.26].map(x => x - S4);   // 球落地時刻 / bounce times on each "dribble"
const SING4 = { AMY: [[4.58, 5.45], [7.90, 8.70], [12.14, 13.98]], ANDY: [[0, 4.55], [5.40, 7.80], [8.66, 13.98]] };
const sings4 = (who, t) => SING4[who].some(([a, b]) => t >= a && t < b);
const SCENE = {
  dur: 13.98, songStart: S4, tag: 'Monday: time for school!',
  draw(c, t) {
    const cam = track([[0, 0], [10.2, 0], [11.4, 1960, 'inOut']], t);
    c.save(); c.translate(-cam, 0);
    s04Classroom(c, t); s04Gym(c, t);
    s04Kid(c, t, 'AMY', AMY); s04Kid(c, t, 'ANDY', ANDY);
    s04Ball(c, t);
    c.restore();
    // 上課鐘 / school bell on "Time for school"
    const ring = prog(t, T4.time - .05, T4.time + .1) * (1 - prog(t, 2.4, 2.9));
    if (t < 3.2 && cam < 10) edBell(c, 1490, 200, ring, t, .9);
    // MON 星期卡 / MON day card on "Monday"
    const mk = grpPop(t, T4.monday - .05, 10.1, .3, .4);
    if (mk > 0) edDayCard(c, 'MON', 330, 260, mk, 1 - prog(t, T4.monday + .4, T4.monday + 1.6), .9);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
function s04X(t, who) {
  const amy = who === 'AMY';
  return track([[0, amy ? -120 : -420], [2.0, amy ? 720 : 1160, 'out'], [10.2, amy ? 720 : 1160], [11.4, amy ? 2660 : 3060, 'inOut']], t);
}
function s04Kid(c, t, who, ch) {
  const x = s04X(t, who), y = 880, amy = who === 'AMY';
  const walks = [[0, 2.0], [10.2, 11.4]], moving = walks.some(([a, b]) => t >= a && t < b);
  let sq = 1; for (const [a, b] of walks) for (const e of [a, b]) if (e > 0) sq = Math.min(sq, 1 - Math.sin(clamp(prog(t, e - .11, e + .11)) * Math.PI) * .95);
  const talk = sings4(who, t) ? mouthAt(t) : 0, round = sings4(who, t) ? roundAt(t) : 0;
  c.save(); c.translate(x, 0); c.scale(Math.max(.05, sq), 1); c.translate(-x, 0);
  if (moving) { kid(c, ch, { x, y, face: 1, walk: t * 8.5, moving: true, talk, round, scale: .86, lean: .05, look: 1 }, t); c.restore(); return; }
  const p = { x, y, scale: 1.0, talk, round, bounce: Math.pow(1 - beatAt(t + S4).f, 3) * 4, look: amy ? 1 : -1 };
  if (!amy) {
    if (t >= 2.6 && t < T4.no) Object.assign(p, { ra: [lerp(.2, 2.2, E.out(prog(t, T4.music - .3, T4.music))), .1], look: 1 });   // 指音樂卡（右上）
    if (t >= 5.4 && t < 7.9) Object.assign(p, { la: [lerp(.2, 2.3, E.out(prog(t, T4.pe - .3, T4.pe))), .1], look: -1 });         // 指黑板 PE 列（左上）
    if (t >= T4.me - .1 && t < 10.2) Object.assign(p, { ra: [-.3, -1.9], nod: .08 });                                           // 手放胸口 "Me, too"
    if (t >= 11.4) Object.assign(p, { ra: [.55, -.15], la: [.25, .15], look: 1, knee: 1, bounce: 0 });                          // 運球 / dribbling
    if (t >= DRIB4[3] + .05) Object.assign(p, { ra: [2.5, -.1], la: [2.3, .1], hop: Math.sin(clamp(prog(t, DRIB4[3] + .05, DRIB4[3] + .35)) * Math.PI) * 40 }); // 投籃 / shoot
  } else {
    if (t >= T4.no && t < 5.4) Object.assign(p, { nod: Math.sin((t - T4.no) * 22) * .14 * (1 - prog(t, 5.1, 5.4)), la: [.2, .15], ra: [.2, .15] });  // 搖頭 / shake head
    if (t >= T4.yes - .05 && t < 8.9) Object.assign(p, { ra: [2.6, .25], nod: Math.sin(clamp(prog(t, T4.yes, T4.yes + .5)) * Math.PI * 2) * .1 });  // 比讚＋點頭 / thumbs up
    if (t >= 11.4) Object.assign(p, Object.assign(danceMove('cheer', beatAt(t + S4), t), { look: 1 }));                         // 幫 Andy 加油
  }
  kidFront(c, ch, p, t);
  c.restore();
}
function s04Classroom(c, t) {
  c.fillStyle = '#fff1d6'; c.fillRect(-300, 0, 2280, 800); c.fillStyle = '#e8cfa6'; c.fillRect(-300, 760, 2280, 340);   // 牆、地板 / wall, floor
  c.fillStyle = 'rgba(0,0,0,.05)'; for (let x = -300; x < 1980; x += 120) c.fillRect(x, 760, 4, 340);
  for (const wx of [-170, 1700]) { rr(c, wx - 110, 140, 220, 260, 12); fillStroke(c, '#bfe8f5', 6); c.beginPath(); c.moveTo(wx, 140); c.lineTo(wx, 400); c.moveTo(wx - 110, 270); c.lineTo(wx + 110, 270); c.lineWidth = 4; c.stroke(); }
  // 黑板＋週一課表 / blackboard with Monday timetable
  rr(c, 520, 80, 880, 380, 14); fillStroke(c, '#2f5d4a', 8);
  c.font = '800 44px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fffbe6'; c.fillText('MONDAY', 960, 140);
  const rows = ['Chinese', 'math', 'PE', 'English'], ap = prog(t, 2.32, 2.9);
  rows.forEach((key, i) => {
    const k = clamp(ap * 4 - i); if (k <= 0) return; const y = 190 + i * 66, lit = key === 'PE' ? prog(t, T4.pe - .05, T4.pe + .2) : 0;
    c.save(); c.globalAlpha = k;
    if (lit > 0) { c.fillStyle = `rgba(255,230,120,${.45 * lit})`; rr(c, 600, y - 30, 720, 60, 12); c.fill(); }
    c.fillStyle = '#fffbe6'; c.font = '700 36px "Inter","Segoe UI",sans-serif'; c.textAlign = 'left'; c.fillText(`${i + 1}.`, 620, y + 12);
    c.save(); c.translate(720, y); edSubjectIcon(c, key, .55); c.restore();
    c.fillStyle = '#fffbe6'; c.fillText(key === 'PE' ? 'PE' : key[0].toUpperCase() + key.slice(1), 780, y + 12);
    c.restore();
  });
  edTick(c, 1210, 190 + 2 * 66, prog(t, T4.yes, T4.yes + .35), .8);                 // PE ✓ on "Yes, I do"
  // 音樂卡（"music" 飛出，"No" 打 ✗）/ music card
  const mk = grpPop(t, T4.music - .1, 7.6, .35, .4);
  if (mk > 0) { edSubjectCard(c, 'music', 1560, 300, mk, 0, .9); edBubble(c, '?', 1660, 170, mk * (1 - prog(t, T4.no, T4.no + .2)), -30, 50); edCross(c, 1560, 290, prog(t, T4.no, T4.no + .35), 1.2); }
  c.font = '800 30px "Inter",sans-serif'; c.textAlign = 'left';
}
function s04Gym(c, t) {
  c.fillStyle = '#d8ecf6'; c.fillRect(1980, 0, 2300, 800); c.fillStyle = '#e3b06f'; c.fillRect(1980, 760, 2300, 340);
  c.fillStyle = 'rgba(120,70,30,.12)'; for (let x = 1980; x < 4280; x += 90) c.fillRect(x, 760, 3, 340);
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(3700, 1000, 260, Math.PI, Math.PI * 1.5); c.stroke();
  rr(c, 2560, 110, 420, 90, 20); fillStroke(c, '#f59a3c', 6); c.font = '900 56px "Inter",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('GYM', 2770, 176);
  // 籃框 / hoop at world x 3560
  rr(c, 3640, 160, 26, 640, 8); fillStroke(c, '#7a8594', 6);
  rr(c, 3470, 180, 200, 140, 10); fillStroke(c, '#fff', 6); rr(c, 3530, 230, 80, 60, 6); c.lineWidth = 5; c.strokeStyle = '#ef4a4a'; c.stroke();
  c.beginPath(); c.ellipse(3520, 330, 56, 12, 0, 0, 7); c.lineWidth = 7; c.strokeStyle = '#ef7a2a'; c.stroke();
  const sw = prog(t, 13.85, 13.98); c.strokeStyle = '#fff'; c.lineWidth = 3;
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(3520 + i * 16, 336); c.lineTo(3520 + i * 10 + Math.sin(t * 30) * 4 * sw, 400 + sw * 10); c.stroke(); }
}
function s04Ball(c, t) {
  // "basketball"(10.72) 籃球彈出到 Andy 手上；Dribble 4 下；投籃 / ball appears, dribbles on each "dribble", then the shot
  const kp = prog(t, T4.basketball - .1, T4.basketball + .25); if (kp <= 0) return; const k = E.back(kp);   // 先判斷 prog，避免 E.back(0)≈2e-16 提早畫出
  const ax = s04X(t, 'ANDY'), handX = ax + 82, handY = 880 - 150 - 136 + 112, floorY = 862;
  if (t < 11.4) { edBall(c, ax + 70, 640, 34 * Math.min(1, k), t * 2); if (t < T4.basketball + .4) burst(c, ax + 70, 640, prog(t, T4.basketball, T4.basketball + .4)); return; }
  if (t < DRIB4[0] - .3) { edBall(c, handX, handY + 34, 34, 0); return; }
  if (t < DRIB4[3] + .05) {   // 落地時刻 = DRIB4[i]，兩次落地之間回到手上 / hits the floor exactly on each "dribble"
    let i = DRIB4.findIndex(d => t < d); const prev = i <= 0 ? DRIB4[0] - .3 : DRIB4[i - 1], next = i < 0 ? DRIB4[3] : DRIB4[i];
    const u = clamp((t - prev) / (next - prev)), down = u < .5 ? 1 - Math.pow(1 - u * 2, 2) : 1 - Math.pow((u - .5) * 2, 2);
    const by = lerp(handY + 34, floorY - 34, down > 0 ? (u < .5 ? E.in(u * 2) : 1 - E.out((u - .5) * 2)) : 0);
    edBall(c, handX, by, 34, t * 4);
    if (Math.abs(t - next) < .06) { c.save(); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(handX, floorY + 4, 50, 10, 0, 0, 7); c.fill(); c.restore(); }
    return;
  }
  // 投籃弧線到籃框（約 0.3 秒）/ shot arc into the hoop
  const u = clamp((t - DRIB4[3] - .05) / .3), sx = handX, sy = 880 - 430, ex = 3520, ey = 320;
  edBall(c, lerp(sx, ex, u), lerp(sy, ey, u) - Math.sin(u * Math.PI) * 220, 34, t * 6);
  if (u >= 1) burst(c, ex, ey + 40, prog(t, DRIB4[3] + .35, DRIB4[3] + .7));
}
function s04Thumb(c, x, y, k) { if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); rr(c, -16, -10, 32, 30, 8); fillStroke(c, AMY.skin, 4); rr(c, -6, -34, 14, 30, 7); fillStroke(c, AMY.skin, 4); c.restore(); }
