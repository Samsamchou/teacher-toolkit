// 場景 08：USA | by scooter。歌曲 91.06–105.44 s。本地時間 t 從 0 起算。
// 動作依原曲逐字時碼（engine/song-data.js）編排，每個關鍵字都有對應畫面：
//   She's Wendy(0.64)                  → Wendy 在家門前向鏡頭揮手＋「Wendy」名牌
//   She's from the USA(2.38)           → 手放胸前；美國國旗泡泡
//   Does she go to school by metro(5.02)? → 歪頭；捷運小圖示＋「?」
//   No(5.62), she doesn't.             → 搖頭、搖手指；大紅 ✗ 打在捷運圖示上
//   She goes there by scooter(7.26)    → 媽媽騎機車（已戴安全帽）從左駛入，"scooter" 停穩＋「by scooter」字卡
//   With her mom(7.72)                 → 兩人之間冒出愛心
//   she rides(9.30) to school(10.22)   → Wendy 走到後座、跳上去坐好；路口黃色 SCHOOL 標誌在 "school" 閃動
//   Helmet(10.84) on(11.62)!           → 後架上的紅色安全帽飛起，"Helmet" 在頭頂發光，"on" 落下扣好（喀！星光）
//                                        → 戴好安全帽「之後」才起步騎車（安全順序），房子/籬笆視差捲動
//   That's(12.74) really(13.54) cool(13.78)! → 比讚、太陽眼鏡落下，"cool" 閃光＋星星爆發
// 對嘴：前四句是第三人稱旁白（She's…/Does she…），Wendy 不開口只微笑；只有 "Helmet on! That's really cool!" 跟原曲對嘴。
// 嘴型資料：scenes/s08-usa-scooter.lipsync.js（lipsync/song_lipsync.py --start 91.06 --dur 14.38）
const WT8 = { wendy: .64, usa: 2.38, does: 3.76, metro: 5.02, no: 5.62, doesnt: 5.86, scooter: 7.26, mom: 7.72, she: 8.86, rides: 9.30, school: 10.22,
  helmet: 10.84, on: 11.62, thats: 12.74, really: 13.54, cool: 13.78 };
const S8_GY = 905, S8_FEET = 862;                         // 機車輪著地線 / road line；Wendy 人行道站位 / sidewalk feet
const S8_STOP = 960, S8_RIDE = 11.85, S8_V = 700;          // 機車停車 x；起步時間；巡航速度 px/s
const S8_W = .8, S8_M = .92;                               // Wendy／媽媽縮放 / scales
const S8_SEAT_W = [-120, -208], S8_SEAT_M = [5, -208];     // 後座／前座臀部位置（機車本地座標）/ hip spots on the scooter
const SCENE = {
  dur: 14.38, songStart: 91.06, tag: 'USA | by scooter',
  draw(c, t) {
    // 騎車距離與鏡頭：起步後鏡頭跟著機車（背景往左捲）/ ride distance + follow camera
    const u = t - S8_RIDE, d = u <= 0 ? 0 : (u < .8 ? .5 * S8_V / .8 * u * u : .5 * S8_V * .8 + S8_V * (u - .8)), cam = d * .85;
    const sx = track([[0, -520], [6.0, -520], [WT8.scooter, S8_STOP, 'out']], t) + d - cam;    // 機車螢幕 x / scooter screen x
    const brake = Math.sin(clamp(prog(t, WT8.scooter - .25, WT8.scooter + .2)) * Math.PI) * .03;
    const bump = (u > 0 ? Math.sin(t * 15) * 2.5 : 0) + (t < WT8.scooter ? Math.sin(t * 18) * 1.5 : 0);
    s08Street(c, t, cam);
    // Wendy 的狀態 / Wendy state
    const g = s08Girl(t, sx, bump, brake);
    if (!g.onBike) s08DrawGirl(c, g, t);
    s08Scooter(c, sx, S8_GY - bump, (sx + cam) / 46, brake, t, g);
    if (g.onBike) s08DrawGirl(c, g, t);
    s08Mom(c, sx, bump, brake, t);
    s08Bars(c, sx, S8_GY - bump, brake);
    // 排氣：起步前發動、起步時噴一口 / exhaust puffs
    for (const p0 of [9.95, 10.4, S8_RIDE - .1, S8_RIDE + .3]) if (t > p0 && t < p0 + .8) s08Puff(c, sx - 215, S8_GY - bump - 60, prog(t, p0, p0 + .8));
    // ── 字卡與特效 / cards & effects ──
    const wk = E.back(prog(t, WT8.wendy, WT8.wendy + .3)) * (1 - prog(t, 2.1, 2.4));
    nameTag(c, 'Wendy', 1250, 470, wk, '#ffe1bd');
    const fk = E.back(prog(t, WT8.usa, WT8.usa + .35)) * (1 - prog(t, 4.3, 4.6));
    countryBubble(c, 'US', 1250, 430, fk, t);
    const mk = E.back(prog(t, WT8.metro, WT8.metro + .3)) * (1 - prog(t, 6.45, 6.75));
    transportIcon(c, 'metro', 960, 400, mk);
    if (mk > 0) wordCard(c, 1060, 300, '?', mk * (1 - prog(t, WT8.no - .1, WT8.no + .1)));
    const xk = E.back(prog(t, WT8.no, WT8.no + .25)) * (1 - prog(t, 6.45, 6.75));
    if (xk > 0) s08Cross(c, 960, 400, xk);
    const sk = E.back(prog(t, WT8.scooter, WT8.scooter + .3)) * (1 - prog(t, 8.7, 9.0));
    if (sk > 0) wordCard(c, 760, 300, 'by scooter', sk);
    const hk = prog(t, WT8.mom - .05, WT8.mom + .45) * (1 - prog(t, 8.9, 9.2));
    if (hk > 0) s08Heart(c, 1135, 430 - hk * 40, E.back(Math.min(1, hk * 2)), t);
    s08FlyHelmet(c, t, g);
    if (t > WT8.helmet - .05 && t < WT8.helmet + .55) s08Glint(c, g.head[0], g.head[1] - 180, prog(t, WT8.helmet - .05, WT8.helmet + .55));
    if (t > WT8.on && t < WT8.on + .7) { s08Glint(c, g.head[0] - 40, g.head[1] - 50, prog(t, WT8.on, WT8.on + .7)); s08Click(c, g.head[0] + 70, g.head[1] - 110, prog(t, WT8.on, WT8.on + .7)); }
    if (t > WT8.cool) { burst(c, g.head[0] + 20, g.head[1], prog(t, WT8.cool, WT8.cool + .6)); s08Glint(c, g.head[0] + 30, g.head[1] - 5, prog(t, WT8.cool, WT8.cool + .5)); }
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// ── Wendy：正面 → 側面走到後座 → 跳上坐好 / front → side walk → hop onto the pillion ──
function s08Win(t, a, b, r = .2) { return prog(t, a - r, a) * (1 - prog(t, b - r, b)); }
function s08Mix(base, layers) { let v = base.slice(); for (const [w, a] of layers) if (w > 0) v = [lerp(v[0], a[0], w), lerp(v[1], a[1], w)]; return v; }
function s08Girl(t, sx, bump, brake) {
  const sing = t >= WT8.helmet - .05;                                        // 只有最後一句對嘴 / lip-sync only "Helmet on…"
  const talk = sing ? mouthAt(t) : 0, round = sing ? roundAt(t) : 0;
  const turn = prog(t, 8.0, 8.18);                                           // 正面 → 側面（壓扁翻面）
  const walkK = prog(t, 8.18, 8.85), hopK = prog(t, 9.0, 9.42);
  const seatX = sx + S8_SEAT_W[0], seatY = S8_GY - bump + S8_SEAT_W[1];
  const standHip = S8_FEET - 150 * S8_W;
  let x = lerp(1250, seatX + 20, E.inOut(walkK)), hipY = standHip;
  if (hopK > 0) { x = lerp(seatX + 20, seatX, E.inOut(hopK)); hipY = lerp(standHip, seatY, E.inOut(hopK)) - Math.sin(hopK * Math.PI) * 70; }
  const face = turn < 1 ? -1 : lerp(-1, 1, E.inOut(prog(t, 8.85, 9.02)));     // 走左邊 → 轉回朝右
  const onBike = hopK > .55;
  // 頭的位置（給安全帽、特效用）/ head position for effects
  const lean = onBike ? .06 : 0, head = [x + (6 + Math.sin(lean) * 190) * S8_W * Math.sign(face || 1), hipY - 190 * S8_W];
  return { t, turn, x, hipY, face, onBike, sit: E.inOut(hopK), walkK, moving: walkK > 0 && walkK < 1, talk, round, head, sing, lean };
}
function s08DrawGirl(c, g, t) {
  const ch = CAST.US;
  if (g.turn < .5) {   // 正面 / front view (kidFront)
    const bt = Math.pow(1 - beatAt(t + SCENE.songStart).f, 3), base = [.2, .15];
    const wave = s08Win(t, 0, 1.15, .25), chest = s08Win(t, 1.75, 3.2), shake = s08Win(t, WT8.no, 6.35, .12);
    const think = s08Win(t, WT8.does + .2, 5.4, .3), hug = s08Win(t, WT8.mom, 8.0, .2);
    const cheer = s08Win(t, WT8.scooter, 7.62, .15);
    const la = s08Mix(base, [[chest * 0, base], [cheer, [2.6, .2]], [hug, [-.45, -1.75]]]);
    const ra = s08Mix(base, [[wave, [2.45, .4 + Math.sin(t * 11) * .45]], [chest, [-.35, -1.8]], [think, [-.25, -2.35]], [shake, [2.05, .75 + Math.sin(t * 18) * .35]], [cheer, [2.6, .2]], [hug, [-.45, -1.75]]]);
    let look = lerp(0, 1, think * .6); look = lerp(look, -1, s08Win(t, 6.3, WT8.scooter + .2, .3)); look = lerp(look, -1, hug);
    const nod = Math.sin((t - WT8.no) * 22) * .16 * shake + .12 * think + Math.sin(t * 6.5) * .03;
    const hop = Math.sin(clamp(prog(t, WT8.scooter, WT8.scooter + .4)) * Math.PI) * 45;
    const p = { x: g.x, y: S8_FEET, scale: S8_W, la, ra, bounce: bt * 6, hop, look, nod, talk: 0 };
    if (g.turn > 0) { const k = Math.max(.04, 1 - g.turn * 2); c.save(); c.translate(g.x, 0); c.scale(k, 1); c.translate(-g.x, 0); kidFront(c, ch, p, t); c.restore(); }
    else kidFront(c, ch, p, t);
    return;
  }
  // 側面 / side view (own figure so she can sit)
  const f = g.turn < 1 ? -Math.max(.04, g.turn * 2 - 1) : g.face;
  if (!g.onBike) { c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(g.x, S8_FEET + 4, 50, 10, 0, 0, 7); c.fill(); }
  const th = s08Win(t, WT8.thats, 99, .25), lookUp = s08Win(t, 10.55, 11.5, .2);
  const momBack = [S8_SEAT_M[0] - 40 - S8_SEAT_W[0], -50];                   // 抱住媽媽腰（後座本地座標）/ hold mom's waist
  const hold = g.onBike ? [(momBack[0]) / S8_W, momBack[1] / S8_W] : null;
  s08Side(c, ch, { x: g.x, y: g.hipY, scale: S8_W, face: f, sit: g.sit, walk: (t - 8.18) * 10, moving: g.moving, lean: g.lean,
    talk: g.talk, round: g.round, look: 1, nod: -.18 * lookUp + Math.sin(t * 7) * .03 * (g.onBike ? 1 : 0),
    reachB: hold, reachF: hold && th < 1 ? hold : null, armF: [lerp(.3, 2.0, th), lerp(.4, .6, th)], armFk: th, thumb: th,
    helmet: t >= WT8.on ? 1 : 0, shades: E.out(prog(t, WT8.really - .25, WT8.really + .05)) }, t);
}
// 側面角色（可坐、可伸手）：比照 engine kid() 的比例，原點在臀部 / side-view kid that can sit, origin at the hip
function s08Side(c, ch, p, t) {
  const s = p.scale || 1, f = p.face || 1, sit = p.sit || 0, lean = p.lean || 0;
  c.save(); c.translate(p.x, p.y); c.scale(s * f, s);
  const ph = p.walk || 0, mv = p.moving ? 1 : 0, bob = Math.abs(Math.sin(ph)) * 8 * mv, sw = Math.sin(ph) * .5 * mv;
  c.translate(0, -bob);
  const leg = (x, sgn) => { const a1 = lerp(sgn * sw, 1.05, sit), a2 = lerp(Math.max(0, -sgn * sw) * .9, -1.0, sit);
    const [fx, fy] = limb(c, x, 0, a1, a2, 70, 72, 26, ch.pants); shoe(c, fx, fy, ch); };
  leg(-14, -1);                                                                     // 後腿 / back leg
  if (ch.pack) { c.save(); c.translate(-6, -150); c.rotate(lean * .5); rr(c, -78, 0, 62, 100, 18); fillStroke(c, ch.pack, 6); c.restore(); }
  const arm = (sx, reach, ang, col) => reach ? s08Reach(c, sx, -126, reach[0], reach[1], 62, 56, 22, col) : limb(c, sx, -126, ang[0], ang[1], 62, 56, 22, col);
  arm(-4, p.reachB, [.25 - sw * .8, .2], ch.jacketD);                               // 後手 / back arm
  c.save(); c.rotate(lean);
  rr(c, -42, -150, 84, 150, 28); fillStroke(c, ch.jacket, 7);
  rr(c, -20, -150, 40, 70, 14); c.fillStyle = ch.under; c.fill();
  c.beginPath(); c.moveTo(0, -150); c.lineTo(0, 0); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
  c.save(); c.translate(6, -190); c.rotate(-lean * .6 + (p.nod || 0));
  head(c, ch, { walk: ph, moving: p.moving, talk: p.talk, round: p.round, look: p.look, hairSway: Math.sin(t * 3) * .05 + (p.moving ? 0 : 0) }, t);
  if (p.shades > 0) s08Shades(c, p.shades);
  if (p.helmet) s08Helmet(c, p.helmetCol || '#e0474c');
  c.restore(); c.restore();
  leg(14, 1);                                                                       // 前腿 / front leg
  const fArm = p.reachF ? null : (p.armF || [.25 + sw * .8, .2]);
  const [hx, hy] = arm(6, p.reachF, fArm, ch.jacket);                               // 前手 / front arm
  if (p.thumb > .5) { c.beginPath(); c.arc(hx, hy, 15, 0, 7); fillStroke(c, ch.skin, 5); rr(c, hx - 6, hy - 34, 12, 26, 6); fillStroke(c, ch.skin, 4); }
  c.restore();
}
// 兩段骨 IK：伸手到目標，手肘朝下 / two-bone IK reach (elbow down)
function s08Reach(c, sx, sy, tx, ty, l1, l2, w, col) {
  const dx = tx - sx, dy = ty - sy, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - .5);
  const th = Math.atan2(dx, dy), A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const a1 = th - A, ex = sx + Math.sin(a1) * l1, ey = sy + Math.cos(a1) * l1;
  return limb(c, sx, sy, a1, Math.atan2(tx - ex, ty - ey) - a1, l1, l2, w, col);
}
// 安全帽（頭部座標，朝右）/ helmet in head coords
function s08Helmet(c, col) {
  c.beginPath(); c.moveTo(-50, -14); c.lineTo(-30, 54); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();     // 帽帶 / strap
  c.beginPath(); c.ellipse(0, -14, 76, 72, 0, Math.PI, Math.PI * 2); c.closePath(); fillStroke(c, col, 7);
  c.beginPath(); c.ellipse(0, -14, 50, 50, 0, Math.PI * 1.15, Math.PI * 1.6); c.lineWidth = 12; c.strokeStyle = 'rgba(255,255,255,.75)'; c.stroke();
  rr(c, 46, -26, 46, 16, 8); fillStroke(c, col, 5);                                                         // 帽簷 / visor
}
function s08Shades(c, k) {
  c.save(); c.translate(0, -60 * (1 - k)); c.globalAlpha = k;
  for (const [x, w] of [[-40, 30], [10, 34]]) { rr(c, x, -6, w, 22, 8); c.fillStyle = '#23202a'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); }
  c.beginPath(); c.moveTo(-10, 2); c.lineTo(10, 2); c.lineWidth = 5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(16, -2, 8, 5); c.restore();
}
// 媽媽：騎機車（戴黃色安全帽），雙手握把手 / mom riding with her helmet on, hands on the grips
function s08Mom(c, sx, bump, brake, t) {
  c.save(); c.translate(sx, S8_GY - bump); c.rotate(-brake);
  const hx = S8_SEAT_M[0], hy = S8_SEAT_M[1], grip = [(118 - hx) / S8_M, (-316 - hy) / S8_M];
  const nod = Math.sin(t * 6.5) * .02 + .08 * s08Win(t, WT8.mom, 8.6, .25);       // "mom" 時點頭微笑 / nods on "mom"
  s08Side(c, CAST.MOM, { x: hx, y: hy, scale: S8_M, face: 1, sit: 1, lean: .2, look: 1, nod, reachB: grip, reachF: grip, helmet: 1, helmetCol: '#ffd84d' }, t);
  c.restore();
}
// 機車（側面，朝右）：本地座標原點 = 兩輪間地面 / side-view scooter, origin on the ground between wheels
function s08Scooter(c, x, gy, wr, brake, t, g) {
  c.save(); c.translate(x, gy);
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(5, 4, 250, 14, 0, 0, 7); c.fill();
  c.save(); c.rotate(-brake);
  rr(c, -205, -80, 100, 18, 9); fillStroke(c, '#b8bec8', 5);                                   // 排氣管 / exhaust
  c.beginPath(); c.ellipse(-130, -118, 118, 62, 0, 0, 7); fillStroke(c, '#7fd1c7', 7);         // 後車殼 / rear cowl
  c.fillStyle = '#ff6b6b'; rr(c, -252, -138, 16, 28, 6); c.fill();                             // 尾燈 / tail light
  rr(c, -262, -205, 70, 12, 6); fillStroke(c, '#5a5f6b', 4);                                   // 後架 / rear rack
  if (t < 10.55) { c.save(); c.translate(-226, -200); c.scale(.62, .62); s08Helmet(c, '#e0474c'); c.restore(); }   // 備用安全帽 / spare helmet
  rr(c, -215, -222, 228, 34, 17); fillStroke(c, '#7a5a4c', 6);                                 // 坐墊 / seat
  rr(c, -78, -126, 34, 10, 5); fillStroke(c, '#5a5f6b', 4);                                    // 後座踏板 / pillion peg
  rr(c, -40, -112, 175, 28, 10); fillStroke(c, '#5fb8ad', 6);                                  // 腳踏板 / floorboard
  c.beginPath(); c.moveTo(118, -86); c.lineTo(150, -268); c.lineTo(182, -268); c.lineTo(196, -86); c.closePath(); fillStroke(c, '#7fd1c7', 7);   // 前擋板 / leg shield
  c.beginPath(); c.arc(175, -46, 60, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(228, -56); c.lineTo(122, -56); c.closePath(); fillStroke(c, '#7fd1c7', 6);   // 前土除 / fender
  c.restore();
  for (const wx of [-165, 175]) { c.save(); c.translate(wx, -46); c.rotate(wr); c.beginPath(); c.arc(0, 0, 46, 0, 7); fillStroke(c, '#34343c', 7); c.beginPath(); c.arc(0, 0, 22, 0, 7); fillStroke(c, '#cfd3da', 5);
    c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.lineWidth = 5; c.strokeStyle = '#5a5f6b'; c.stroke(); c.restore(); }
  c.restore();
}
// 把手、頭燈（畫在媽媽手上面）/ handlebar + headlight, over mom's hands
function s08Bars(c, x, gy, brake) {
  c.save(); c.translate(x, gy); c.rotate(-brake);
  c.lineWidth = 12; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.moveTo(168, -262); c.lineTo(150, -322); c.stroke();
  c.lineWidth = 6; c.strokeStyle = '#9aa0ac'; c.beginPath(); c.moveTo(168, -262); c.lineTo(150, -322); c.stroke();
  rr(c, 120, -334, 66, 18, 9); fillStroke(c, '#5a5f6b', 5);
  c.beginPath(); c.arc(176, -300, 20, 0, 7); fillStroke(c, '#ffd84d', 5);
  c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.moveTo(160, -330); c.lineTo(150, -372); c.stroke(); rr(c, 136, -392, 28, 22, 8); fillStroke(c, '#cfd3da', 4);
  c.restore();
}
// 飛起來的安全帽：後架 → 頭頂（"Helmet" 發光）→ "on" 落下 / spare helmet flight
function s08FlyHelmet(c, t, g) {
  if (t < 10.55 || t >= WT8.on) return;
  const rack = [g.x - 106 + 0, g.hipY + 8], top = [g.head[0], g.head[1] - 180], land = [g.head[0], g.head[1]];
  let x, y, sc = S8_W, rot = 0;
  if (t < WT8.helmet + .1) { const k = E.out(prog(t, 10.55, WT8.helmet + .1)); x = lerp(rack[0], top[0], k); y = lerp(rack[1], top[1], k) - Math.sin(k * Math.PI) * 60; sc = lerp(.62, S8_W, k); rot = (1 - k) * -1.2; }
  else if (t < 11.38) { x = top[0]; y = top[1] + Math.sin((t - WT8.helmet) * 9) * 8; rot = Math.sin((t - WT8.helmet) * 7) * .12; }
  else { const k = E.in(prog(t, 11.38, WT8.on)); x = top[0]; y = lerp(top[1], land[1], k); }
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc); s08Helmet(c, '#e0474c'); c.restore();
}
// ── 背景：美國郊區街道（視差）/ suburban US street with parallax ──
function s08Street(c, t, cam) {
  const g = c.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, '#9fdcf5'); g.addColorStop(1, '#eef9ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.beginPath(); c.arc(1700, 140, 62, 0, 7); c.fillStyle = '#ffe48a'; c.fill();
  for (const [cx, cy, s, v] of [[220, 130, 1, 10], [900, 90, 1.25, 7], [1450, 200, .8, 12]]) s08Cloud(c, ((cx + t * v - cam * .08) % 2300 + 2300) % 2300 - 200, cy, s);
  // 遠方樹叢（0.3）/ far tree line
  for (let i = -1; i < 12; i++) { const x = ((i * 210 - cam * .3) % 2520 + 2520) % 2520 - 300; c.beginPath(); c.arc(x, 600, 110, Math.PI, 0); c.fillStyle = i % 2 ? '#9fd39a' : '#8cc788'; c.fill(); }
  // 草坪 / lawns
  c.fillStyle = '#8fd17a'; c.fillRect(0, 600, W, 200);
  // 房子（0.6）/ houses
  const cols = [['#f7d9a8', '#d8644f'], ['#cfe6f7', '#5a6f9e'], ['#f6cfd6', '#8a5a6e'], ['#dff0d0', '#c9773f']];
  for (let i = -1; i < 9; i++) { const x = i * 620 + 760 - cam * .6; if (x < -560 || x > W + 60) continue; s08House(c, x, 700, cols[(i % 4 + 4) % 4], i === 0); }
  // 白色尖木籬笆＋信箱＋樹（1.0）/ picket fence, mailboxes, trees
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 4;
  const off = ((cam % 40) + 40) % 40;
  rr(c, -10, 728, W + 20, 12, 4); fillStroke(c, '#fff', 4);
  for (let x = -off - 40; x < W + 40; x += 40) { c.beginPath(); c.moveTo(x, 790); c.lineTo(x, 708); c.lineTo(x + 12, 694); c.lineTo(x + 24, 708); c.lineTo(x + 24, 790); c.closePath(); fillStroke(c, '#fff', 4); }
  for (let i = -1; i < 9; i++) { const x = i * 620 + 1480 - cam; if (x > -120 && x < W + 120) s08Mailbox(c, x, 800, t); }
  for (let i = -1; i < 9; i++) { const x = i * 620 + 1090 - cam; if (x > -260 && x < W + 260 && i !== 0) s08Tree(c, x, 790, t); }
  // 人行道、路緣、馬路 / sidewalk, curb, road
  c.fillStyle = '#dcdcd6'; c.fillRect(0, 790, W, 82); c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 3;
  for (let x = -(cam % 140) - 140; x < W + 140; x += 140) { c.beginPath(); c.moveTo(x, 790); c.lineTo(x - 20, 872); c.stroke(); }
  c.fillStyle = '#b9bcc4'; c.fillRect(0, 872, W, 16);
  c.fillStyle = '#6c7380'; c.fillRect(0, 888, W, H - 888);
  c.fillStyle = '#ffd84d'; for (let x = -((cam * 1) % 260) - 260; x < W; x += 260) c.fillRect(x, 1046, 150, 12);
  // 黃色學區標誌：唱到 "school" 閃動 / yellow SCHOOL sign pulses on "school"
  const sp = Math.sin(clamp(prog(t, WT8.school, WT8.school + .45)) * Math.PI);
  s08SchoolSign(c, 1800 - cam, 860, 1 + sp * .15, sp, t);
}
function s08House(c, x, base, col, mine) {
  rr(c, x, base - 250, 420, 250, 6); fillStroke(c, col[0], 6);
  c.beginPath(); c.moveTo(x - 30, base - 240); c.lineTo(x + 210, base - 380); c.lineTo(x + 450, base - 240); c.closePath(); fillStroke(c, col[1], 6);
  rr(c, x + 175, base - 140, 70, 140, 8); fillStroke(c, '#fff6d6', 5); c.beginPath(); c.arc(x + 230, base - 70, 5, 0, 7); c.fillStyle = INK; c.fill();
  for (const wx of [x + 40, x + 290]) { rr(c, wx, base - 200, 90, 80, 6); fillStroke(c, '#bfe8f5', 5); c.beginPath(); c.moveTo(wx + 45, base - 200); c.lineTo(wx + 45, base - 120); c.moveTo(wx, base - 160); c.lineTo(wx + 90, base - 160); c.lineWidth = 4; c.stroke(); }
  rr(c, x + 185, base - 330, 50, 50, 25); fillStroke(c, '#bfe8f5', 5);
  if (mine) { c.fillStyle = '#7a6a60'; c.fillRect(x + 392, base - 330, 6, 120); c.save(); c.translate(x + 398, base - 330); drawFlag(c, 'US', 66); c.restore(); }   // Wendy 家門前的國旗 / flag at Wendy's house
}
function s08Mailbox(c, x, base, t) {
  rr(c, x - 6, base - 90, 12, 90, 4); fillStroke(c, '#9a6b4b', 4);
  rr(c, x - 36, base - 130, 72, 44, 20); fillStroke(c, '#4a78b8', 5);
  rr(c, x + 30, base - 150, 8, 36, 3); fillStroke(c, '#e0474c', 3);
}
function s08Tree(c, x, base, t) {
  rr(c, x - 16, base - 150, 32, 150, 10); fillStroke(c, '#9a6b4b', 6);
  const sw = Math.sin(t * 1.3 + x * .01) * 4;
  for (const [a, b, r, col] of [[0, -210, 90, '#58b368'], [-60, -160, 62, '#6cc279'], [64, -168, 66, '#4aa35c']]) { c.beginPath(); c.arc(a + x + sw, b + base, r, 0, 7); fillStroke(c, col, 6); }
}
function s08SchoolSign(c, x, base, s, glow, t) {
  if (x < -200 || x > W + 200) return;
  rr(c, x - 7, base - 300, 14, 300, 5); fillStroke(c, '#8a909c', 4);
  c.save(); c.translate(x, base - 360); c.scale(s, s);
  if (glow > 0) { c.fillStyle = `rgba(255,236,140,${.55 * glow})`; c.beginPath(); c.arc(0, 0, 150, 0, 7); c.fill(); }
  c.beginPath(); c.moveTo(0, -100); c.lineTo(90, -20); c.lineTo(90, 90); c.lineTo(-90, 90); c.lineTo(-90, -20); c.closePath(); fillStroke(c, '#ffd84d', 7);
  c.fillStyle = INK; for (const [kx, kh] of [[-28, 1], [26, .85]]) { c.beginPath(); c.arc(kx, -22 + (1 - kh) * 30, 13 * kh, 0, 7); c.fill(); rr(c, kx - 13 * kh, -6 + (1 - kh) * 30, 26 * kh, 44 * kh, 8); c.fill(); }
  c.font = '800 30px "Inter",sans-serif'; c.textAlign = 'center'; c.fillText('SCHOOL', 0, 76); c.textAlign = 'left';
  c.restore();
}
function s08Cloud(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#fff'; c.beginPath(); for (const [a, b, r] of [[0, 0, 44], [50, -18, 52], [104, 0, 44], [52, 14, 42]]) c.arc(a, b, r, 0, 7); c.fill(); c.restore(); }
// ── 特效 / effects ──
function s08Cross(c, x, y, k) {   // 大紅 ✗ / big red cross
  c.save(); c.translate(x, y); c.scale(k, k); c.lineCap = 'round';
  for (const lw_c of [[44, INK], [30, '#e0474c']]) { c.lineWidth = lw_c[0]; c.strokeStyle = lw_c[1]; c.beginPath(); c.moveTo(-90, -90); c.lineTo(90, 90); c.moveTo(90, -90); c.lineTo(-90, 90); c.stroke(); }
  c.restore();
}
function s08Heart(c, x, y, k, t) {
  if (k <= 0) return; c.save(); c.translate(x, y + Math.sin(t * 5) * 6); c.scale(k * (1 + Math.sin(t * 9) * .04), k);
  c.beginPath(); c.moveTo(0, 40); c.bezierCurveTo(-90, -20, -50, -90, 0, -40); c.bezierCurveTo(50, -90, 90, -20, 0, 40); fillStroke(c, '#ff6b8a', 7);
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-30, -38, 12, 8, -.6, 0, 7); c.fill(); c.restore();
}
function s08Glint(c, x, y, k) {   // 十字閃光 / four-point glint
  const r = 60 * Math.sin(Math.PI * clamp(k)); if (r <= 0) return;
  c.save(); c.translate(x, y); c.rotate(k * .8); c.fillStyle = '#fff8c8'; c.strokeStyle = '#ffd84d'; c.lineWidth = 3;
  c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * .18 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fill(); c.stroke(); c.restore();
}
function s08Click(c, x, y, k) {   // 「CLICK!」扣上 / helmet click
  c.save(); c.globalAlpha = 1 - E.in(k); c.translate(x, y - k * 30); c.rotate(.12); c.scale(.6 + E.back(Math.min(1, k * 3)) * .4, .6 + E.back(Math.min(1, k * 3)) * .4);
  c.font = '900 46px "Inter","Segoe UI",sans-serif'; c.lineWidth = 8; c.strokeStyle = INK; c.lineJoin = 'round'; c.strokeText('CLICK!', 0, 0); c.fillStyle = '#ffd84d'; c.fillText('CLICK!', 0, 0);
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .5; star(c, 70 + Math.cos(a) * (60 + 40 * k), -12 + Math.sin(a) * (60 + 40 * k), 12); }
  c.restore();
}
function s08Puff(c, x, y, k) { c.fillStyle = `rgba(230,230,235,${.8 * (1 - k)})`; for (const [dx, dy, r] of [[0, 0, 18], [-30, -10, 24], [-62, -4, 20]]) { c.beginPath(); c.arc(x + dx * (1 + k * 1.5), y + dy - k * 20, r * (1 + k), 0, 7); c.fill(); } }
