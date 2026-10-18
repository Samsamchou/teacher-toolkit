// 場景 08：Bridge 黃昏柔光。歌曲 119.74–133.58 s（第 37–39 句）。本地秒＝全曲−119.74。只有 Amy 張嘴，其他五人閉嘴微笑。
// 歌詞↔畫面（本地秒；逐字時間取自 engine/song-data.js，回聲依原曲人聲包絡）：
//   #37 What day is today? (what day is today?)(0–4.69)【Amy】→ Amy 手放嘴邊輕聲問；"What"(0.02) 主泡泡「What day is today?」；
//                                                    "today"(2.52) 回聲泡泡第一次、曬衣繩上的星期卡依序晃一下；"(what day…)"(4.34) 回聲泡泡第二次
//   #38 Wednesday, we draw. Friday, we play.(5.16–7.80)【Amy】→ "Wednesday"(5.20) WED 卡亮、Amy 指它；畫架上蠟筆一筆一筆畫出太陽，
//                                                    "draw"(5.96) 畫光芒；"Friday"(6.16) FRI 卡亮 → 兩位女同學（原 KR、US 造型）甩跳繩、男同學（原 UK 造型）跳；"play"(7.28) 跳最高＋星星
//   #39 Every day is a good day. (oh-oh-oh)(7.80–13.84)【Amy】→ "Every"(7.80) 七張星期卡飛成一圈；真的太陽從地平線慢慢升進圈中；
//                                                    "good day"(9.20) 圈發光；六人慢慢左右擺；"oh-oh-oh"(13.12) 光芒一閃、亮片飄起（接 Dance Break）
const S8 = 119.74;
const T8 = { what: 119.76 - S8, day: 120.16 - S8, today: 122.26 - S8, echo: 124.08 - S8, wednesday: 124.94 - S8, draw: 125.70 - S8, friday: 125.90 - S8,
  play: 127.02 - S8, every: 127.54 - S8, good: 128.94 - S8, day2: 129.12 - S8, oh: 132.86 - S8 };
// 對嘴：只有 Amy（教師決定）/ only Amy's mouth moves in this scene (teacher decision)
const SING8 = { AMY: [[0, 13.84]] };
const sings8 = (who, t) => (SING8[who] || []).some(([a, b]) => t >= a && t < b);
// 六人站位（世界＝畫面座標）/ positions
const S8_POS = { SG: 190, JP: 430, TW: 690, KR: 1240, UK: 1480, US: 1720 };
const S8_ROPE = [6.0, 8.05];                                     // 跳繩時段 / jump-rope window
const S8_SUN = { x: 960, y0: 735, y1: 345 };                    // 太陽起點／終點 / sun rises from the horizon into the ring
const S8_LINE = i => [640 + i * 196, 178];                      // 曬衣繩上星期卡位置 / day cards on the string
const SCENE = {
  dur: 13.84, songStart: S8, tag: 'Sunset bridge',
  draw(c, t) {
    const rise = E.inOut(prog(t, T8.every, 12.4)), sunY = lerp(S8_SUN.y0, S8_SUN.y1, rise);
    s08Sky(c, t, rise, sunY);
    s08Ring(c, t, 'back');
    s08Ground(c, t);
    s08Easel(c, t);
    s08Line(c, t);
    s08Ring(c, t, 'cards');                                     // 星期卡畫在角色後面，不遮人 / cards behind the kids
    const poses = s08Kids(c, t);
    s08Rope(c, t, poses);
    s08Bubbles(c, t, poses);
    // "play" 星星；"oh-oh-oh" 亮片 / stars on "play", sparkles on "oh-oh-oh"
    if (t >= T8.play && t < T8.play + .7) burst(c, S8_POS.UK, 470, prog(t, T8.play, T8.play + .7));
    s08Sparkles(c, t);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// 黃昏天空：太陽升起時天空變亮 / sunset sky that warms up as the sun rises
function s08Sky(c, t, rise, sunY) {
  const g = c.createLinearGradient(0, 0, 0, 760);
  g.addColorStop(0, s08Mix('#6d5fa8', '#7fb6e8', rise)); g.addColorStop(.55, s08Mix('#f39a86', '#ffd9a0', rise)); g.addColorStop(1, s08Mix('#ffd29a', '#fff1c4', rise));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // 太陽光芒（緩慢旋轉，"oh" 時一閃）/ slow rotating sun rays, flash on "oh"
  const flash = Math.sin(clamp(prog(t, T8.oh - .05, T8.oh + .6)) * Math.PI);
  c.save(); c.translate(S8_SUN.x, sunY); c.rotate(t * .06);
  for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(-40, 0); c.lineTo(40, 0); c.lineTo(0, 900); c.closePath(); c.fillStyle = `rgba(255,240,190,${.10 + .12 * rise + .15 * flash})`; c.fill(); }
  c.restore();
  const rg = c.createRadialGradient(S8_SUN.x, sunY, 60, S8_SUN.x, sunY, 420); rg.addColorStop(0, `rgba(255,230,150,${.75})`); rg.addColorStop(1, 'rgba(255,230,150,0)');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  c.beginPath(); c.arc(S8_SUN.x, sunY, 112 * (1 + flash * .05), 0, 7); fillStroke(c, s08Mix('#ff9f5a', '#ffd84d', rise), 7);   // 太陽 / the sun
  if (rise > .55) { const k = prog(rise, .55, .8); c.save(); c.globalAlpha = k; c.translate(S8_SUN.x, sunY); c.fillStyle = INK;     // 太陽笑臉 / smiling sun
    for (const ex of [-34, 34]) { c.beginPath(); c.ellipse(ex, -12, 8, 12, 0, 0, 7); c.fill(); }
    c.beginPath(); c.arc(0, 14, 34, .35, Math.PI - .35); c.lineWidth = 7; c.strokeStyle = INK; c.lineCap = 'round'; c.stroke();
    c.fillStyle = 'rgba(255,120,120,.4)'; for (const ex of [-62, 62]) { c.beginPath(); c.ellipse(ex, 18, 15, 9, 0, 0, 7); c.fill(); } c.restore(); }
  // 遠雲 / soft clouds
  for (const [cx, cy, s, v] of [[260, 300, 1, 6], [1500, 250, 1.2, 4], [2100, 330, .9, 8]]) {
    const x = ((cx + t * v) % 2300) - 200; c.save(); c.translate(x, cy); c.scale(s, s); c.fillStyle = `rgba(255,236,226,${.8})`; c.beginPath();
    for (const [a, b, r] of [[0, 0, 40], [46, -16, 48], [96, 0, 40], [48, 12, 38]]) c.arc(a, b, r, 0, 7); c.fill(); c.restore();
  }
}
function s08Mix(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; }
// 遠山、草地、遊戲場地面（遮住地平線下的太陽）/ hills and ground (hide the sun below the horizon)
function s08Ground(c, t) {
  for (const [x, rx, ry, col] of [[200, 520, 150, '#d792a0'], [1700, 560, 170, '#d08aa0'], [960, 700, 120, '#c98aa8']]) { c.beginPath(); c.ellipse(x, 770, rx, ry, 0, Math.PI, 0); c.fillStyle = col; c.fill(); }
  c.fillStyle = '#a9c47f'; c.fillRect(0, 720, W, 60); c.fillStyle = '#ecc9a2'; c.fillRect(0, 770, W, H - 770);
  c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 40; x < W; x += 240) { rr(c, x, 860, 110, 9, 5); c.fill(); }
  c.fillStyle = 'rgba(255,150,110,.10)'; c.fillRect(0, 0, W, H);   // 黃昏暖色濾鏡 / warm sunset tint
}
// 畫架與蠟筆太陽：WED 時一筆一筆畫出 / easel with a crayon sun drawn stroke by stroke
function s08Easel(c, t) {
  c.save(); c.lineCap = 'round'; c.lineWidth = 14; c.strokeStyle = INK;
  for (const [x0, x1] of [[230, 175], [390, 445]]) { c.beginPath(); c.moveTo(x0, 470); c.lineTo(x1, 770); c.stroke(); }
  c.lineWidth = 7; c.strokeStyle = '#c98f5a'; for (const [x0, x1] of [[230, 175], [390, 445]]) { c.beginPath(); c.moveTo(x0, 470); c.lineTo(x1, 770); c.stroke(); }
  c.restore();
  rr(c, 160, 160, 300, 320, 10); fillStroke(c, '#fffdf6', 6); rr(c, 150, 470, 320, 22, 8); fillStroke(c, '#c98f5a', 5);
  const cx = 310, cy = 310, R = 62;
  const kc = prog(t, T8.wednesday, T8.wednesday + .6), kr = prog(t, T8.wednesday + .55, T8.friday + .25), kf = prog(t, T8.friday + .1, T8.friday + .7);
  let tip = null;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (kf > 0) { c.globalAlpha = kf * .7; c.fillStyle = '#ffd84d'; c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * 7, r = R - 6 + rnd(i) * 6; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.fill(); c.globalAlpha = 1; }
  if (kc > 0) { c.beginPath(); for (let i = 0; i <= 60 * kc; i++) { const a = -Math.PI / 2 + i / 60 * Math.PI * 2, r = R + (rnd(i + 3) - .5) * 4; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.lineWidth = 10; c.strokeStyle = '#ff9f1c'; c.stroke();
    if (kc < 1) { const a = -Math.PI / 2 + kc * Math.PI * 2; tip = [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; } }
  // 8 道光芒依序畫出（"draw" 時正在畫）/ eight rays drawn one after another
  for (let i = 0; i < 8; i++) { const k = clamp(kr * 8 - i); if (k <= 0) continue; const a = -Math.PI / 2 + i * Math.PI / 4, r0 = R + 14, r1 = R + 14 + 44 * k;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineWidth = 10; c.strokeStyle = '#ff9f1c'; c.stroke();
    if (k < 1) tip = [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]; }
  if (kf > .3) { c.globalAlpha = prog(kf, .3, 1); c.fillStyle = INK; for (const ex of [-20, 20]) { c.beginPath(); c.arc(cx + ex, cy - 8, 6, 0, 7); c.fill(); }
    c.beginPath(); c.arc(cx, cy + 6, 22, .4, Math.PI - .4); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); }
  c.restore();
  if (tip) s08Crayon(c, tip[0], tip[1], t);
  else if (kc > 0 && t < T8.friday + .9) s08Crayon(c, cx + 110, cy + 120 - prog(t, T8.friday + .25, T8.friday + .9) * 30, t);   // 畫完放下 / crayon rests after drawing
}
function s08Crayon(c, x, y, t) {
  c.save(); c.translate(x, y); c.rotate(-.75 + Math.sin(t * 20) * .05);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(14, -26); c.lineTo(-14, -26); c.closePath(); fillStroke(c, '#ff9f1c', 4);
  rr(c, -14, -110, 28, 86, 6); fillStroke(c, '#ff9f1c', 5); rr(c, -14, -88, 28, 44, 3); fillStroke(c, '#fff6d6', 4); c.restore();
}
// 曬衣繩＋七張星期卡；"Every" 起飛向圓圈 / string of seven day cards that fly into the ring on "Every"
function s08Line(c, t) {
  const fly = prog(t, T8.every, T8.every + 1.4);
  if (fly < 1) { c.save(); c.globalAlpha = 1 - fly; c.beginPath(); c.moveTo(560, 140); c.quadraticCurveTo(1240, 190, 1900, 140); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.restore(); }
}
// 星期卡（前半在繩上，後半在圓圈）；圈分前後兩層，太陽在中間 / day cards — on the string, then in a ring around the sun
function s08CardPos(t, i) {
  const [lx, ly] = S8_LINE(i), u = E.inOut(prog(t, T8.every + i * .08, T8.every + .9 + i * .08));
  const a = -Math.PI / 2 + i * Math.PI * 2 / 7 + Math.max(0, t - T8.every) * .18, rx = 320, ry = 225;
  const sway = Math.sin(t * 1.8 + i) * .05 + (t > T8.today && t < T8.today + 1.6 ? Math.sin(clamp(prog(t, T8.today + i * .12, T8.today + i * .12 + .4)) * Math.PI) * .35 : 0);
  return { x: lerp(lx, S8_SUN.x + Math.cos(a) * rx, u), y: lerp(ly, S8_SUN.y1 + Math.sin(a) * ry, u) - Math.sin(u * Math.PI) * 60, rot: sway * (1 - u), back: u > .5 && Math.sin(a) < -.2, u };
}
function s08Ring(c, t, layer) {
  const glow = prog(t, T8.good - .1, T8.good + .4) + Math.sin(clamp(prog(t, T8.oh - .05, T8.oh + .6)) * Math.PI) * .5;
  if (layer === 'back') {
    if (glow > 0) { c.save(); c.globalAlpha = Math.min(1, glow) * .5; c.strokeStyle = '#fff3a6'; c.lineWidth = 46; c.beginPath(); c.ellipse(S8_SUN.x, S8_SUN.y1, 320, 225, 0, 0, 7); c.stroke(); c.restore(); }
    return;
  }
  ED_DAY_ORDER.forEach((d, i) => {
    const p = s08CardPos(t, i);
    const lit = Math.max(d === 'WED' ? prog(t, T8.wednesday - .05, T8.wednesday + .15) * (1 - prog(t, T8.every, T8.every + .5)) : 0,
      d === 'FRI' ? prog(t, T8.friday - .05, T8.friday + .15) * (1 - prog(t, T8.every, T8.every + .5)) : 0, clamp(glow) * (.6 + .4 * Math.sin(t * 3 + i)));
    const pop = (d === 'WED' ? Math.sin(clamp(prog(t, T8.wednesday - .05, T8.wednesday + .35)) * Math.PI) : 0) + (d === 'FRI' ? Math.sin(clamp(prog(t, T8.friday - .05, T8.friday + .35)) * Math.PI) : 0);
    const dim = t < T8.wednesday ? .82 : 1;
    c.save(); c.globalAlpha = dim; c.translate(p.x, p.y);
    if (p.u < .5) { c.beginPath(); c.moveTo(-26, -40); c.lineTo(-26, -52); c.moveTo(26, -40); c.lineTo(26, -52); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); }   // 夾子 / pegs
    c.rotate(p.rot); edDayCard(c, d, 0, 0, 1, lit, lerp(.52, .62, p.u) * (1 + pop * .3)); c.restore();
  });
}
// 六人：Amy 唱、其他人閉嘴微笑 / six kids; only Amy sings
function s08Kids(c, t) {
  const out = {}, b = beatAt(t + S8), on = Math.pow(1 - b.f, 3);
  const slow = Math.sin((t - T8.every) * Math.PI * 2 / 2.3);           // 慢擺：約 4 拍一次 / slow sway, about 4 beats per cycle
  const swayK = E.inOut(prog(t, T8.every, T8.every + .6));
  for (const code of ['SG', 'JP', 'KR', 'US', 'UK', 'TW']) {
    const amy = code === 'TW', x = S8_POS[code];
    let p = { x, y: amy ? 912 : 900, scale: amy ? .95 : .85, bounce: on * 3, sway: Math.sin(t * 1.4 + x) * .02, look: x < S8_POS.TW ? 1 : -1, la: [.2, .15], ra: [.2, .15] };
    if (amy) {
      if (t < 4.9) Object.assign(p, { ra: [1.2, -3.49], nod: .06 + Math.sin(t * 1.3) * .03, look: 1 });                                  // 手放嘴邊輕聲問 / hand by the mouth
      if (t >= T8.wednesday - .2 && t < T8.draw) Object.assign(p, { ra: [lerp(.2, 2.55, E.out(prog(t, T8.wednesday - .2, T8.wednesday + .05))), .1], look: 1 });  // 指 WED 卡
      if (t >= T8.draw && t < T8.friday) Object.assign(p, { la: [2.0, .1], look: -1 });                                                 // 指畫架 / points at the easel
      if (t >= T8.friday && t < T8.every) Object.assign(p, { ra: [lerp(1.6, 2.6, E.out(prog(t, T8.friday - .1, T8.friday + .15))), .1], look: 1 });  // 指 FRI 卡
    } else {
      if ((code === 'SG' || code === 'JP') && t >= T8.wednesday && t < T8.every) Object.assign(p, { look: code === 'SG' ? 1 : -1, nod: code === 'SG' ? .08 : -.08 });   // 看畫 / watch the drawing
      if (code === 'JP' && t >= T8.draw && t < T8.every) Object.assign(p, { la: [2.1, .1] });
    }
    // 跳繩：KR 與 US 甩繩、UK 跳 / jump rope
    const rk = prog(t, S8_ROPE[0], S8_ROPE[0] + .3) * (1 - prog(t, S8_ROPE[1] - .3, S8_ROPE[1])), ph = (b.i + b.f) * Math.PI * 2;
    if (rk > 0 && code === 'KR') Object.assign(p, { ra: [lerp(.2, 1.25 + Math.sin(ph) * .35, rk), lerp(.15, .3, rk)], look: 1 });
    if (rk > 0 && code === 'US') Object.assign(p, { la: [lerp(.2, 1.25 + Math.sin(ph) * .35, rk), lerp(.15, .3, rk)], look: -1 });
    if (rk > 0 && code === 'UK') { const air = Math.pow(Math.max(0, Math.cos(ph)), 1.5); Object.assign(p, { hop: air * (t > T8.play - .3 && t < T8.play + .5 ? 90 : 50) * rk, la: [.7, .3], ra: [.7, .3], ll: .1, rl: .1, look: 0 }); }
    // "Every day is a good day"：六人慢慢左右擺 / everyone sways slowly
    if (swayK > 0) { const sp = { la: [2.35 + slow * .12, .35], ra: [2.35 - slow * .12, .35], sway: slow * .14, bounce: on * 3, look: slow > 0 ? 1 : -1, hop: 0, nod: slow * .05 }; p = blendPose(p, Object.assign({}, p, sp), swayK); }   // 保留 x／y／scale 再補間
    p.talk = sings8(amy ? 'AMY' : code, t) ? mouthAt(t) : 0; p.round = sings8(amy ? 'AMY' : code, t) ? roundAt(t) : 0;
    out[code] = p;
  }
  // 依 x 由後往前畫（UK 在繩中間最後畫）/ draw order
  for (const code of ['SG', 'JP', 'KR', 'US', 'UK', 'TW']) kidFront(c, CAST[code], out[code], t);
  return out;
}
// 正面角色手的位置 / hand position (same maths as kidFront)
function s08Hand(p, sg) {
  const a = sg > 0 ? (p.ra || [.18, .1]) : (p.la || [.18, .1]), s = p.scale || 1;
  const x1 = sg * 44 + Math.sin(sg * a[0]) * 60, y1 = -136 + Math.cos(a[0]) * 60;
  const x2 = x1 + Math.sin(sg * (a[0] + a[1])) * 56, y2 = y1 + Math.cos(a[0] + a[1]) * 56;
  return [p.x + x2 * s, p.y - (p.hop || 0) + (-150 + (p.bounce || 0) + y2) * s];
}
// 跳繩：每拍轉一圈，繩子在拍點時掃過腳下（UK 剛好在空中）/ rope turns once per beat, passing under UK's feet on the beat
function s08Rope(c, t, poses) {
  const rk = prog(t, S8_ROPE[0], S8_ROPE[0] + .3) * (1 - prog(t, S8_ROPE[1] - .3, S8_ROPE[1])); if (rk <= 0) return;
  const b = beatAt(t + S8), ph = (b.i + b.f) * Math.PI * 2;
  const [ax, ay] = s08Hand(poses.KR, 1), [bx, by] = s08Hand(poses.US, -1), my = (ay + by) / 2;
  const low = 915, high = 470, ymid = lerp(high, low, (Math.cos(ph) + 1) / 2);     // 繩子中點高度 / rope midpoint height
  c.save(); c.globalAlpha = rk; c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2, 2 * ymid - my, bx, by);
  c.lineWidth = 11; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#ff6b8a'; c.stroke(); c.restore();
  if (Math.sin(ph) < 0) kidFront(c, CAST.UK, poses.UK, t);                          // 繩在後面時重畫 UK 蓋住繩子 / rope behind UK on the back swing
  for (const [hx, hy] of [[ax, ay], [bx, by]]) { rr(c, hx - 8, hy - 26, 16, 40, 6); fillStroke(c, '#ffd84d', 4); }   // 握把 / handles
}
// 主泡泡＋兩次回聲泡泡 / main question bubble + two echo bubbles
function s08Bubbles(c, t, poses) {
  const out = 1 - prog(t, 4.95, 5.2);
  edBubble(c, 'What day is today?', 780, 448, grpPop(t, T8.what - .05, 4.95), -70, 38);
  for (const [tw, x, y, s, a] of [[T8.today, 1060, 340, .8, .7], [T8.echo, 1300, 250, .66, .5]]) {
    const k = grpPop(t, tw - .05, 4.95); if (k <= 0) continue;
    c.save(); c.globalAlpha = a * out; edBubble(c, 'what day is today?', x, y, k * s, -60, 38); c.restore();
    c.save(); c.globalAlpha = a * out * (1 - prog(t, tw, tw + 1)); c.strokeStyle = '#fff'; c.lineWidth = 5;                // 回聲波紋 / echo ripples
    for (let i = 1; i <= 2; i++) { c.beginPath(); c.arc(x - 200 * s, y, 20 * i + 30 * prog(t, tw, tw + 1), -.8, .8); c.stroke(); } c.restore();
  }
  // 輕聲的聲波（嘴邊）/ soft whisper waves by Amy's mouth
  if (t < 4.9) { const p = poses.TW, hx = p.x + 90, hy = p.y - 365 * p.scale; c.save(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.globalAlpha = .4 + .4 * mouthAt(t);
    for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(hx, hy, 10 + i * 12, -.7, .7); c.stroke(); } c.restore(); }
}
// "good day" 後的亮片，"oh-oh-oh" 時一次冒出 / floating sparkles
function s08Sparkles(c, t) {
  const k = prog(t, T8.good, T8.good + 1);
  if (k <= 0) return;
  for (let i = 0; i < 18; i++) { const ph = ((t * .25 + rnd(i) ) % 1), x = 120 + rnd(i + 30) * 1680, y = 760 - ph * 600;
    const a = k * Math.sin(ph * Math.PI) * (.6 + .4 * Math.sin(t * 5 + i)); if (a <= 0) continue; c.save(); c.globalAlpha = a; star(c, x, y, 10 + rnd(i + 9) * 8); c.restore(); }
  if (t >= T8.oh && t < T8.oh + .7) burst(c, S8_SUN.x, S8_SUN.y1, prog(t, T8.oh, T8.oh + .7));
}
