// 場景 01：Verse 1 週末。歌曲 17.12–36.18 s（第 3–8 句＋yeah 和聲）。本地秒＝全曲−17.12。
// 歌詞↔畫面（本地秒；逐字時間取自 engine/song-data.js）：
//   #3 What day is today?(0–2.47)【Amy】      → Amy 歪頭、"?" 泡泡；Amy 名牌
//   #4 It's Saturday.(2.54–4.12)【Andy】      → "Saturday"(3.56) SAT 星期卡從 Andy 頭上彈出；角落日曆顯示 SAT；Andy 名牌
//   #5 Let's go to the park! (oh-oh-oh)(4.12–7.07)【兩人】→ "go"(5.20) 轉身跑進公園；"park"(6.22) Amy 放起風箏；"oh-oh-oh" 風箏翻三圈
//   #6 What day is today?(9.26–11.77)【Andy】 → 兩人走向右邊（鏡頭橫移，不硬切），Andy 邊走邊問，"?" 泡泡
//   #7 It's Sunday.(12.18–13.58)【Amy】       → 到 Amy 奶奶家門口轉正面；"Sunday"(12.70) 角落日曆 SAT→SUN 翻頁，SUN 卡從 Amy 頭上彈出
//   #8 Let's visit Grandma! (yay!)(13.58–16.01)【兩人】→ "visit"(14.42) 門打開；"Grandma"(14.86) 奶奶出現揮手；"yay"(15.66) 兩人跳起
//   和聲 yeah(15.7–19.06)【兩人】             → 奶奶端出餅乾、愛心飄起，三人揮手
const S1 = 17.12;
const T1 = { q1: 0, today1: 18.74 - S1, sat: 20.68 - S1, lets1: 21.24 - S1, go: 22.32 - S1, park: 23.34 - S1, oh: 23.84 - S1, q2: 26.38 - S1, today2: 27.98 - S1,
  itsSun: 29.30 - S1, sun: 29.82 - S1, lets2: 30.70 - S1, visit: 31.54 - S1, grandma: 31.98 - S1, yay: 32.78 - S1 };
// 對嘴時段（本地秒）/ who sings when
const SING1 = { AMY: [[0, 2.5], [4.12, 7.1], [12.18, 13.6], [13.58, 19.06]], ANDY: [[2.54, 4.15], [4.12, 7.1], [9.26, 11.8], [13.58, 19.06]] };
const sings1 = (who, t) => SING1[who].some(([a, b]) => t >= a && t < b);
const SCENE = {
  dur: 19.06, songStart: S1, tag: 'Saturday & Sunday',
  draw(c, t) {
    const cam = track([[0, 0], [8.6, 0], [12.0, 2000, 'inOut']], t);
    // 天空與遠山（視差）/ sky + far hills (parallax)
    grpSky(c, t, '#a7e3ff', '#f2fbff', 760);
    c.save(); c.translate(-cam * .3, 0); for (let i = -1; i < 5; i++) { c.beginPath(); c.ellipse(i * 700 + 300, 760, 520, 230, 0, Math.PI, 0); c.fillStyle = i % 2 ? '#bfe6b4' : '#a8dba0'; c.fill(); } c.restore();
    c.save(); c.translate(-cam, 0);
    s01Park(c, t); s01House(c, t, E.out(prog(t, T1.visit - .1, T1.visit + .4)));
    c.fillStyle = '#9fd38b'; c.fillRect(-200, 740, 4400, 60); c.fillStyle = '#e9d6b9'; c.fillRect(-200, 800, 4400, 300);   // 草地＋步道 / grass + path
    c.fillStyle = 'rgba(255,255,255,.5)'; for (let x = -200; x < 4200; x += 160) { rr(c, x, 860, 90, 10, 5); c.fill(); }
    // 奶奶：門打開後出現 / Grandma appears at the door
    const gk = E.back(prog(t, T1.grandma - .25, T1.grandma + .15));
    if (gk > 0) { const wave = t > T1.grandma ? 1 : 0;
      kidFront(c, CAST.GRANDMA, Object.assign({ x: 3000, y: 880, scale: .92 * Math.min(1, gk) }, t < 16 ? { ra: [2.45 * wave + .2 * (1 - wave), .4 + Math.sin(t * 10) * .4 * wave] } : { la: [-.3, -1.8], ra: [-.3, -1.8] }), t);
      if (t > 16) s01Cookies(c, 3000, 880 - 262 * .92 * 1.12, E.back(prog(t, 16, 16.4)));
      if (t > 16.3) for (let i = 0; i < 3; i++) { const ph = ((t - 16.3) * .6 + i / 3) % 1; s01Heart(c, 3000 + (i - 1) * 90 + Math.sin(ph * 6) * 20, 420 - ph * 200, 1 - ph); } }
    // 兩位主角 / Amy & Andy
    s01Kid(c, t, 'AMY', AMY); s01Kid(c, t, 'ANDY', ANDY);
    // 風箏 / kite on "park"
    s01Kite(c, t);
    c.restore();
    // 角落日曆：SAT（"Saturday" 起）→ SUN（"Sunday" 翻頁）/ corner calendar
    const ck = E.back(prog(t, T1.sat - .05, T1.sat + .3)), flip = prog(t, T1.sun - .1, T1.sun + .25);
    if (ck > 0) { c.save(); c.translate(1760, 150); c.scale(flip < .5 ? 1 - flip * 2 : (flip - .5) * 2, 1); edDayCard(c, flip < .5 ? 'SAT' : 'SUN', 0, 0, ck, flip > .5 ? 1 - prog(t, T1.sun + .3, T1.sun + 1.4) : 1 - prog(t, T1.sat + .3, T1.sat + 1.4), .8); c.restore(); }
    // 主角頭上的大星期卡 / big day card above the speaker
    const satK = grpPop(t, T1.sat - .05, T1.go - .1), sunK = grpPop(t, T1.sun - .05, T1.visit - .2);
    if (satK > 0) edDayCard(c, 'SAT', s01X(t, 'ANDY') - cam, 360, satK, 1);
    if (sunK > 0) edDayCard(c, 'SUN', s01X(t, 'AMY') - cam, 360, sunK, 1);
    // 名牌與問號 / name tags and question bubbles
    nameTag(c, 'Amy', s01X(t, 'AMY') - cam, 470, grpPop(t, .1, 2.6), '#d6f5ee');
    nameTag(c, 'Andy', s01X(t, 'ANDY') - cam, 470, grpPop(t, T1.sat - 1.0, 5.0), '#dbe8ff');
    edBubble(c, '?', s01X(t, 'AMY') - cam + 120, 380, grpPop(t, T1.today1 - .5, 2.6), -40, 70);
    edBubble(c, '?', s01X(t, 'ANDY') - cam + 120, 380, grpPop(t, T1.today2 - .5, 11.9), -40, 70);
    if (t > T1.yay) burst(c, 1000, 520, prog(t, T1.yay, T1.yay + .7));
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// 角色世界座標 x / world x of each kid over time
function s01X(t, who) {
  const amy = who === 'AMY';
  return track([[0, amy ? 720 : 1020], [T1.go, amy ? 720 : 1020], [6.05, amy ? 1080 : 1380, 'inOut'], [8.6, amy ? 1080 : 1380], [12.0, amy ? 2760 : 3240, 'inOut']], t);
}
// 正面／側面切換：跑步與走路時側面，其餘正面；切換點做壓扁翻面 / front vs side view with flip-turns
function s01Kid(c, t, who, ch) {
  const x = s01X(t, who), y = 880;
  const runs = [[T1.go, 6.05], [8.6, 12.0]], moving = runs.some(([a, b]) => t >= a && t < b);
  let sq = 1; for (const [a, b] of runs) { sq = Math.min(sq, 1 - Math.sin(clamp(prog(t, a - .11, a + .11)) * Math.PI) * .95, 1 - Math.sin(clamp(prog(t, b - .11, b + .11)) * Math.PI) * .95); }
  const talk = sings1(who, t) ? mouthAt(t) : 0, round = sings1(who, t) ? roundAt(t) : 0;
  c.save(); c.translate(x, 0); c.scale(Math.max(.05, sq), 1); c.translate(-x, 0);
  if (moving) {
    kid(c, ch, { x, y, face: 1, walk: t * (t < 7 ? 11 : 8), moving: true, talk, round, scale: .86, lean: t < 7 ? .1 : .05, look: 1 }, t);
  } else {
    const amy = who === 'AMY'; let p = { x, y, scale: 1.0, talk, round, bounce: Math.pow(1 - beatAt(t + S1).f, 3) * 5 };
    if (amy && t < 2.6) Object.assign(p, { nod: Math.sin(clamp(prog(t, .2, 2.4)) * Math.PI) * .16, ra: [.6, -2.3] });   // 歪頭、手指點下巴 / head tilt, finger to chin
    if (!amy && t >= 2.54 && t < T1.go) Object.assign(p, { ra: [lerp(.2, 2.6, E.out(prog(t, T1.sat - .2, T1.sat + .1))), .2] });   // 舉手指向 SAT 卡
    if (t >= T1.lets1 && t < T1.go) Object.assign(p, { la: [2.0, .5], ra: [2.0, .5], hop: Math.sin(clamp(prog(t, T1.lets1, T1.lets1 + .35)) * Math.PI) * 30 });
    if (amy && t >= 6.05 && t < 8.6) Object.assign(p, { ra: [2.3, .3 + Math.sin(t * 3) * .1], la: [1.2, .4] });   // 拉風箏線 / holding the kite string
    if (!amy && t >= 6.05 && t < 8.6) Object.assign(p, { la: [2.45, .4 + Math.sin(t * 9) * .4], ra: [.2, .15], look: -1 });   // Andy 揮手看風箏
    if (amy && t >= 12.0 && t < T1.lets2) Object.assign(p, { ra: [lerp(.2, 2.6, E.out(prog(t, T1.sun - .2, T1.sun + .1))), .2] });   // 指 SUN 卡
    if (t >= T1.lets2 && t < T1.yay) Object.assign(p, { look: amy ? 1 : -1, la: [.4, .2], ra: [.4, .2] });
    if (t >= T1.yay) Object.assign(p, Math.floor(t) % 2 ? { la: [2.45, .4 + Math.sin(t * 10) * .4], ra: [.2, .15] } : { ra: [2.45, .4 + Math.sin(t * 10) * .4], la: [.2, .15] },
      { hop: Math.max(0, Math.sin(clamp(prog(t, T1.yay, T1.yay + .4)) * Math.PI) * 60), look: amy ? 1 : -1 });
    kidFront(c, ch, p, t);
  }
  c.restore();
}
function s01Park(c, t) {
  // 公園大門 / park gate
  c.save(); c.translate(330, 800);
  for (const sx of [-130, 130]) { rr(c, sx - 18, -330, 36, 330, 10); fillStroke(c, '#c98f5a', 6); }
  rr(c, -170, -390, 340, 80, 20); fillStroke(c, '#7cc96a', 6); c.font = '900 52px "Inter",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.lineWidth = 8; c.strokeStyle = INK; c.strokeText('PARK', 0, -332); c.fillText('PARK', 0, -332); c.restore();
  // 鞦韆與溜滑梯（背景）/ swing set and slide
  c.save(); c.translate(1850, 790); c.lineWidth = 10; c.strokeStyle = INK; c.beginPath(); c.moveTo(-160, 0); c.lineTo(-110, -300); c.lineTo(110, -300); c.lineTo(160, 0); c.stroke();
  c.lineWidth = 7; c.strokeStyle = '#f59a3c'; c.beginPath(); c.moveTo(-160, 0); c.lineTo(-110, -300); c.lineTo(110, -300); c.lineTo(160, 0); c.stroke();
  for (const sx of [-50, 50]) { const sw = Math.sin(t * 2 + sx) * .18; c.save(); c.translate(sx, -300); c.rotate(sw); c.lineWidth = 4; c.strokeStyle = INK; c.beginPath(); c.moveTo(-26, 0); c.lineTo(-26, 210); c.moveTo(26, 0); c.lineTo(26, 210); c.stroke(); rr(c, -34, 206, 68, 14, 6); fillStroke(c, '#ff8c78', 4); c.restore(); }
  c.restore();
  for (const [x, s] of [[80, 1.1], [1500, .9], [2250, 1.15]]) grpTree(c, x, 760, s, t);
}
function s01House(c, t, door) {
  // Amy 奶奶家 / Grandma's house (door centre x = 3000)
  c.save(); c.translate(3000, 800);
  rr(c, -330, -380, 660, 380, 10); fillStroke(c, '#ffe7c2', 6);
  c.beginPath(); c.moveTo(-380, -370); c.lineTo(0, -600); c.lineTo(380, -370); c.closePath(); fillStroke(c, '#d9675b', 6);
  for (const wx of [-230, 230]) { rr(c, wx - 60, -300, 120, 110, 10); fillStroke(c, '#bfe8f5', 6); c.beginPath(); c.moveTo(wx, -300); c.lineTo(wx, -190); c.moveTo(wx - 60, -245); c.lineTo(wx + 60, -245); c.lineWidth = 4; c.stroke(); }
  rr(c, -95, -280, 190, 280, 12); c.fillStyle = '#5a3d33'; c.fill();                         // 門內 / doorway
  c.save(); c.translate(-95, 0); c.scale(1 - door * .85, 1); rr(c, 0, -280, 190, 280, 12); fillStroke(c, '#c98f5a', 6); c.beginPath(); c.arc(160, -140, 9, 0, 7); c.fillStyle = '#ffd84d'; c.fill(); c.restore();
  c.font = '800 34px "Inter",sans-serif'; c.textAlign = 'center'; rr(c, -120, -350, 240, 52, 14); fillStroke(c, '#fff6d6', 5); c.fillStyle = INK; c.fillText("Grandma's", 0, -313);
  for (const fx of [-300, -250, 250, 300]) { c.beginPath(); c.arc(fx, -12, 20, 0, 7); fillStroke(c, '#7cc96a', 4); c.beginPath(); c.arc(fx, -26, 9, 0, 7); c.fillStyle = '#f07c8c'; c.fill(); }   // 花 / flowers
  c.restore();
}
function s01Kite(c, t) {
  const k = prog(t, T1.park - .1, T1.park + .6); if (k <= 0 || t > 9.6) return;
  const hx = s01X(t, 'AMY') + 110, hy = 560;                      // Amy 手的位置 / Amy's hand
  const loop = clamp(prog(t, T1.oh, T1.oh + 1.8)) * Math.PI * 2 * 3;    // "oh-oh-oh" 翻三圈 / three loops
  const away = E.out(prog(t, 8.6, 9.6));
  const kx = hx + 260 * E.out(k) + Math.sin(t * 1.7) * 30 + away * 600, ky = hy - 380 * E.out(k) + Math.cos(t * 2.1) * 20 - away * 400;
  if (away < .3) { c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo((hx + kx) / 2, hy - 40, kx, ky + 50); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); }
  c.save(); c.translate(kx, ky); c.rotate(.2 + loop + Math.sin(t * 3) * .1);
  c.beginPath(); c.moveTo(0, -70); c.lineTo(46, 0); c.lineTo(0, 60); c.lineTo(-46, 0); c.closePath(); fillStroke(c, '#ff8c78', 6);
  c.beginPath(); c.moveTo(0, -70); c.lineTo(0, 60); c.moveTo(-46, 0); c.lineTo(46, 0); c.lineWidth = 4; c.stroke();
  for (let i = 0; i < 4; i++) { c.save(); c.translate(Math.sin(t * 6 + i) * 10, 70 + i * 34); c.rotate(.6); c.fillStyle = ['#ffd84d', '#4fb3d9', '#7cc96a', '#8b7fd8'][i]; c.fillRect(-10, -6, 20, 12); c.restore(); }
  c.restore();
}
function s01Cookies(c, x, y, k) { if (k <= 0) return; c.save(); c.translate(x, y + 40); c.scale(k, k); c.beginPath(); c.ellipse(0, 0, 70, 18, 0, 0, 7); fillStroke(c, '#fff', 5); for (const cx of [-34, 0, 34]) { c.beginPath(); c.arc(cx, -14, 20, 0, 7); fillStroke(c, '#d9a35b', 4); c.fillStyle = '#5a3d33'; for (const [dx, dy] of [[-6, -4], [6, 2], [0, 8]]) { c.beginPath(); c.arc(cx + dx, -14 + dy, 3, 0, 7); c.fill(); } } c.restore(); }
function s01Heart(c, x, y, a) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.beginPath(); c.moveTo(0, 18); c.bezierCurveTo(-34, -6, -18, -34, 0, -16); c.bezierCurveTo(18, -34, 34, -6, 0, 18); c.fillStyle = '#ff6b8a'; c.fill(); c.restore(); }
