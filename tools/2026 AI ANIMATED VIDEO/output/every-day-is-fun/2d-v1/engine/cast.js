// cast.js（Every Day Is Fun 版：國旗徽章改星星、加 Amy／Andy／Grandma）— 全曲共用：六位角色、正面角色 kidFront()、舞步庫、六國國旗、拍點與歌詞工具。
// Shared cast, front-facing kid, dance-move library, six flags, beat & lyric helpers. Loaded after engine.js + song-data.js.

// ── 角色（依 data/characters-v2.json 轉成平塗配色）/ cast palette ──
const CAST = {
  TW: { name: 'Taiwan', skin: '#f6cba6', hair: '#2a2024', pony: true, jacket: '#2fa59a', jacketD: '#23857c', under: '#fff', pants: '#2c3a67', shoe: '#38b2a6', pack: '#f4e6c6', blinkOff: 0, flag: null, star: true },
  SG: { name: 'Singapore', skin: '#b97a52', hair: '#1f1a1c', pony: true, jacket: '#b49ce0', jacketD: '#9a80cc', under: '#ddd2f4', pants: '#efe2c4', shoe: '#8f5fd1', pack: '#9fe3c7', blinkOff: .9, flag: null, star: true },
  JP: { name: 'Japan', skin: '#f7d2b0', hair: '#1d1a1f', pony: false, fringe: true, jacket: '#3d78c9', jacketD: '#2f62a8', under: '#fff', pants: '#c8b48a', shoe: '#3d78c9', pack: '#2f62a8', blinkOff: 1.7, flag: null, star: true },
  KR: { name: 'Korea', skin: '#f8d6bd', hair: '#1f1a1f', pony: false, bob: true, jacket: '#f07c8c', jacketD: '#d8606f', under: '#fff1e0', pants: '#2c3a67', shoe: '#f07c8c', pack: '#ffd84d', blinkOff: 2.3, flag: null, star: true },
  UK: { name: 'Alan', skin: '#f6d4bc', hair: '#8a4b2a', pony: false, curly: true, jacket: '#283a6e', jacketD: '#1f2e58', under: '#ffd84d', pants: '#4a4c55', shoe: '#283a6e', pack: '#3a3d48', blinkOff: .4, flag: null, star: true, freckles: true },
  US: { name: 'Wendy', skin: '#efc19a', hair: '#7a4426', pony: true, jacket: '#f59a3c', jacketD: '#dc8128', under: '#ffe1bd', pants: '#4a78b8', shoe: '#e0474c', pack: '#e0474c', blinkOff: 2.9, flag: null, star: true },
  GRANDMA: { name: 'Grandma', skin: '#f2cdb0', hair: '#d9d6d2', pony: false, bun: true, glasses: true, jacket: '#c97b8f', jacketD: '#ad6378', under: '#fff7ec', pants: '#6b5a7a', shoe: '#5a4a44', pack: null, blinkOff: .7, adult: true },
  MOM: { name: 'Mom', skin: '#efc19a', hair: '#7a4426', pony: false, bob: true, jacket: '#4fb3a9', jacketD: '#3c9a90', under: '#fff', pants: '#3a4a6a', shoe: '#5a4a44', pack: null, blinkOff: 1.1, adult: true },
};
const ORDER = ['TW', 'SG', 'JP', 'KR', 'UK', 'US'];
// 本曲角色：Amy＝原 TW 女孩、Andy＝原 JP 男孩，其餘四位為同學 / this song: Amy = TW palette, Andy = JP palette
const AMY = CAST.TW, ANDY = CAST.JP; CAST.TW.name = 'Amy'; CAST.JP.name = 'Andy';

// ── 國旗 / flags（簡化但辨識正確）──  drawFlag(c, code, w)：以左上 (0,0) 畫 w × 2w/3
function drawFlag(c, code, w) {
  const h = w * 2 / 3; c.save();
  if (code === 'TW') {
    c.fillStyle = '#fe0000'; c.fillRect(0, 0, w, h); c.fillStyle = '#000095'; c.fillRect(0, 0, w / 2, h / 2);
    c.save(); c.translate(w / 4, h / 4); c.fillStyle = '#fff'; c.beginPath();
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, r = (i % 2 ? .085 : .16) * w; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill();
    c.beginPath(); c.arc(0, 0, .075 * w, 0, 7); c.fillStyle = '#000095'; c.fill(); c.beginPath(); c.arc(0, 0, .062 * w, 0, 7); c.fillStyle = '#fff'; c.fill(); c.restore();
  } else if (code === 'SG') {
    c.fillStyle = '#ef3340'; c.fillRect(0, 0, w, h / 2); c.fillStyle = '#fff'; c.fillRect(0, h / 2, w, h / 2);
    c.beginPath(); c.arc(w * .17, h * .25, w * .11, 0, 7); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(w * .21, h * .25, w * .105, 0, 7); c.fillStyle = '#ef3340'; c.fill();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; starShape(c, w * .32 + Math.cos(a) * w * .065, h * .25 + Math.sin(a) * w * .065, w * .025, '#fff'); }
  } else if (code === 'JP') {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.beginPath(); c.arc(w / 2, h / 2, h * .3, 0, 7); c.fillStyle = '#bc002d'; c.fill();
  } else if (code === 'KR') {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h / 2); c.rotate(Math.atan2(2, 3)); const r = h * .25;
    c.beginPath(); c.arc(0, 0, r, Math.PI, 0); c.fillStyle = '#cd2e3a'; c.fill(); c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.fillStyle = '#0047a0'; c.fill();
    c.beginPath(); c.arc(-r / 2, 0, r / 2, 0, 7); c.fillStyle = '#cd2e3a'; c.fill(); c.beginPath(); c.arc(r / 2, 0, r / 2, 0, 7); c.fillStyle = '#0047a0'; c.fill(); c.restore();
    c.strokeStyle = '#000'; c.lineWidth = Math.max(1.5, w * .022);
    for (const [x, y, ang] of [[.2, .22, -.59], [.8, .78, -.59], [.8, .22, .59], [.2, .78, .59]]) { c.save(); c.translate(w * x, h * y); c.rotate(ang); for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-w * .06, k * w * .03); c.lineTo(w * .06, k * w * .03); c.stroke(); } c.restore(); }
  } else if (code === 'UK') {
    c.fillStyle = '#012169'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fff'; c.lineWidth = h * .2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke();
    c.strokeStyle = '#c8102e'; c.lineWidth = h * .07; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(w * .42, 0, w * .16, h); c.fillRect(0, h * .37, w, h * .26);
    c.fillStyle = '#c8102e'; c.fillRect(w * .45, 0, w * .1, h); c.fillRect(0, h * .41, w, h * .18);
  } else if (code === 'US') {
    for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#fff' : '#b22234'; c.fillRect(0, i * h / 13, w, h / 13 + .5); }
    c.fillStyle = '#3c3b6e'; c.fillRect(0, 0, w * .4, h * 7 / 13);
    c.fillStyle = '#fff'; for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(w * (.045 + k * .078) + (r % 2) * w * .039, h * (.06 + r * .12), w * .012, 0, 7); c.fill(); }
  }
  c.lineWidth = Math.max(2, w * .03); c.strokeStyle = INK; c.strokeRect(0, 0, w, h); c.restore();
}
function starShape(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }
// 國旗泡泡 / flag speech bubble (k = pop scale 0–1)
function countryBubble(c, code, x, y, k, t) {
  if (k <= 0) return; c.save(); c.translate(x, y + Math.sin(t * 4) * 4); c.scale(k, k);
  rr(c, -95, -62, 190, 124, 24); fillStroke(c, '#fff', 6);
  c.beginPath(); c.moveTo(-14, 62); c.lineTo(0, 86); c.lineTo(14, 62); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.translate(-75, -50); drawFlag(c, code, 150); c.restore();
}
// 名牌 / name tag
function nameTag(c, text, x, y, k, col = '#fff6d6') {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); c.font = '800 44px "Inter","Segoe UI",sans-serif';
  const w = c.measureText(text).width + 56; rr(c, -w / 2, -40, w, 76, 38); fillStroke(c, col, 6); c.fillStyle = INK; c.textAlign = 'center'; c.fillText(text, 0, 14); c.restore();
}

// ── 拍點 / beats ── beatAt(songTime) → {i, f}（第 i 拍、拍內 0–1）
function beatAt(st) {
  const b = SONG.beats; if (st < b[0]) return { i: -1, f: (st - b[0] + .44) / .44 };
  let lo = 0, hi = b.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (b[m] <= st) lo = m; else hi = m - 1; }
  const nx = b[lo + 1] || b[lo] + .441; return { i: lo, f: (st - b[lo]) / (nx - b[lo]) };
}
// 歌詞（卡拉 OK）：直接用全曲 SONG.cues；?nosub=1 時不畫（聽力版）/ lyrics from song data
const NOSUB = /[?&]nosub=1/.test(location.search);
function drawLyrics(c, t) {
  if (NOSUB) return; const st = t + SCENE.songStart;
  const cue = SONG.cues.find(q => st >= q[0] && st < q[1] + .25 && !SONG.cues.some(o => o !== q && st >= o[0] && o[0] > q[0]));
  if (!cue) return;
  const local = [cue[0] - SCENE.songStart, cue[1] - SCENE.songStart, cue[2]];
  drawKaraoke(c, local, cue[3].map(w => [w[0] - SCENE.songStart, w[1] - SCENE.songStart, w[2]]), t);
}
// 唱到某字的時間（本地秒）/ local time of the n-th occurrence of a word inside [from,to) song seconds
function wordTime(word, from = 0, n = 0) {
  const want = word.toLowerCase().replace(/[^a-z']/g, ''); let k = 0;
  for (const q of SONG.cues) for (const w of q[3]) if (w[0] >= from && w[2].toLowerCase().replace(/[’]/g, "'").replace(/[^a-z']/g, '') === want) { if (k++ === n) return w[0] - SCENE.songStart; }
  return null;
}

// ── 正面角色 / front-facing kid ──
// pose: {x, y, scale, la:[肩,肘], ra:[肩,肘]（向外為正，0=下垂）, ll, rl（腿外張角）, bounce, sway(身體左右傾), hop, talk, round, look, nod, alpha}
function kidFront(c, ch, p, t) {
  const s = p.scale || 1; c.save(); c.translate(p.x, p.y - (p.hop || 0)); c.scale(s, s); if (p.alpha !== undefined) c.globalAlpha = p.alpha;
  const bob = p.bounce || 0, sw = p.sway || 0, ad = ch.adult ? 1.12 : 1;
  c.scale(ad, ad);
  // 影子 / shadow
  c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(0, 6 + (p.hop || 0) / s / ad, 70, 13, 0, 0, 7); c.fill();
  // 腿 / legs
  const legs = [[-1, p.ll || .06], [1, p.rl || .06]];
  for (const [sg, a] of legs) { const [fx, fy] = limb(c, sg * 20, -150 + bob, sg * a, -sg * (p.knee || 0) * .5, 72, 72, 28, ch.pants); c.save(); c.translate(fx, fy); rr(c, -26 + sg * 6, -18, 52, 26, 13); fillStroke(c, ch.shoe, 6); c.fillStyle = '#fff'; c.fillRect(-20 + sg * 6, -2, 40, 5); c.restore(); }
  c.save(); c.translate(0, -150 + bob); c.rotate(sw);
  // 背包肩帶 + 身體 / torso
  if (ch.pack) { rr(c, -58, -140, 116, 110, 22); fillStroke(c, ch.pack, 6); }
  rr(c, -48, -152, 96, 152, 30); fillStroke(c, ch.jacket, 7);
  c.beginPath(); c.moveTo(-22, -152); c.lineTo(0, -112); c.lineTo(22, -152); c.closePath(); c.fillStyle = ch.under; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
  if (ch.pack) { c.strokeStyle = shade(ch.pack); c.lineWidth = 10; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * 34, -148); c.lineTo(sg * 30, -40); c.stroke(); } }
  if (ch.flag) { c.save(); c.translate(8, -96); drawFlag(c, ch.flag, 30); c.restore(); }
  if (ch.star) starShape(c, 22, -84, 13, '#ffd84d');   // 胸前星星徽章 / chest star badge   // 胸前國旗徽章 / chest flag patch
  // 手 / arms
  const la = p.la || [.18, .1], ra = p.ra || [.18, .1];
  limb(c, -44, -136, -la[0], -la[1], 60, 56, 22, ch.jacketD);
  limb(c, 44, -136, ra[0], ra[1], 60, 56, 22, ch.jacketD);
  for (const [sg, a] of [[-1, la], [1, ra]]) {     // 手掌 / hands
    const x1 = sg * 44 + Math.sin(sg * a[0]) * 60, y1 = -136 + Math.cos(a[0]) * 60, x2 = x1 + Math.sin(sg * (a[0] + a[1])) * 56, y2 = y1 + Math.cos(a[0] + a[1]) * 56;
    c.beginPath(); c.arc(x2, y2, 15, 0, 7); fillStroke(c, ch.skin, 5);
  }
  // 頭 / head
  c.save(); c.translate(0, -196); c.rotate(p.nod || 0); headFront(c, ch, p, t); c.restore();
  c.restore(); c.restore();
}
function shade(col) { const n = parseInt(col.slice(1), 16); const f = v => Math.max(0, Math.round(v * .78)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function headFront(c, ch, p, t) {
  if (ch.pony) { c.save(); c.translate(52, -30); c.rotate(.55 + Math.sin(t * 5 + ch.blinkOff) * .12); rr(c, -16, -6, 32, 96, 16); fillStroke(c, ch.hair, 6); c.restore(); }
  if (ch.bob) { rr(c, -72, -50, 144, 120, 40); fillStroke(c, ch.hair, 6); }
  if (ch.bun) { c.beginPath(); c.arc(0, -78, 30, 0, 7); fillStroke(c, ch.hair, 6); }   // 奶奶髮髻 / bun
  c.beginPath(); c.ellipse(0, 0, 64, 66, 0, 0, 7); fillStroke(c, ch.skin, 7);
  // 頭髮 / hair cap
  c.beginPath(); c.moveTo(-66, -4);
  if (ch.curly) { for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8; c.arc(Math.cos(a) * 58, Math.sin(a) * 58 - 6, 16, a - 1, a + 1); } }
  else { c.bezierCurveTo(-72, -86, 72, -86, 66, -4); }
  if (ch.fringe) { c.bezierCurveTo(52, -26, 30, -40, 10, -30); c.bezierCurveTo(-10, -44, -40, -30, -66, -4); }
  else if (ch.bob) { c.bezierCurveTo(50, -30, -50, -30, -66, -4); }
  else { c.bezierCurveTo(44, -40, 10, -30, -12, -52); c.bezierCurveTo(-24, -34, -46, -26, -66, -4); }
  c.closePath(); fillStroke(c, ch.hair, 6);
  const bl = ((t + ch.blinkOff) % 3.4) < .14 ? .1 : 1, lk = (p.look || 0) * 5;
  c.fillStyle = INK; for (const ex of [-24, 24]) { c.beginPath(); c.ellipse(ex + lk, 6, 8, 12 * bl, 0, 0, 7); c.fill(); }
  c.fillStyle = '#fff'; for (const ex of [-24, 24]) { c.beginPath(); c.arc(ex + 3 + lk, 1, 3, 0, 7); c.fill(); }
  if (ch.glasses) { c.lineWidth = 5; c.strokeStyle = INK; for (const ex of [-24, 24]) { c.beginPath(); c.arc(ex, 6, 19, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(-5, 4); c.lineTo(5, 4); c.stroke(); }
  c.fillStyle = 'rgba(255,120,120,.35)'; for (const ex of [-42, 42]) { c.beginPath(); c.ellipse(ex, 28, 12, 7, 0, 0, 7); c.fill(); }
  if (ch.freckles) { c.fillStyle = 'rgba(150,80,50,.5)'; for (const [fx, fy] of [[-38, 20], [-32, 26], [-44, 26], [36, 20], [42, 26], [30, 26]]) { c.beginPath(); c.arc(fx, fy, 2.2, 0, 7); c.fill(); } }
  const tk = p.talk || 0, ro = p.round || 0; c.beginPath();
  if (tk > .05) { c.ellipse(0, 36, lerp(13, 7.5, ro), 4 + tk * lerp(11, 13, ro), 0, 0, 7); c.fillStyle = '#b3374a'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); }
  else { c.moveTo(-14, 34); c.quadraticCurveTo(0, 50, 14, 34); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); }
}

// ── 舞步庫 / dance moves ── danceMove(name, beat{i,f}, k(0–1 進場), side) → partial pose
// 每個動作都跟拍點走：f = 拍內進度。onBeat = 拍點上的「重拍」脈衝。
function danceMove(name, b, t, side = 1) {
  const on = Math.pow(1 - b.f, 3), alt = (b.i % 2) ? 1 : -1, sw = Math.sin((b.i + b.f) * Math.PI);
  switch (name) {
    case 'idle': return { la: [.2, .15], ra: [.2, .15], bounce: on * 8, sway: sw * .03 };
    case 'pump': { const up = alt > 0 ? on : 0, up2 = alt < 0 ? on : 0;     // 交替握拳往上 / alternating fist pumps
      return { la: [lerp(.6, 2.7, up2), lerp(1.6, .2, up2)], ra: [lerp(.6, 2.7, up), lerp(1.6, .2, up)], bounce: on * 12 }; }
    case 'wave': return { la: [.2, .15], ra: [2.45, .4 + Math.sin(t * 11) * .45], bounce: on * 6, sway: sw * .04 };
    case 'wave2': return { la: [2.45, .4 + Math.sin(t * 11 + 1) * .45], ra: [2.45, .4 + Math.sin(t * 11) * .45], bounce: on * 6 };
    case 'clap': {                                                         // 拍點上手掌在胸前相碰 / hands meet on the beat
      const open = b.f < .5 ? E.out(b.f * 2) : 1 - E.in((b.f - .5) * 2);
      const a = [lerp(-.25, .45, open), lerp(-2.05, -1.05, open)];
      return { la: a, ra: a, bounce: on * 8, clapFx: b.f < .12 }; }
    case 'cheer': return { la: [2.6 + sw * .1, .2], ra: [2.6 - sw * .1, .2], bounce: on * 14 };
    case 'ear': return { la: [.2, .15], ra: [2.1, 1.6], nod: .12 * side, bounce: on * 5 };          // 手放耳邊 "tell me"
    case 'shrug': return { la: [.9, -1.4], ra: [.9, -1.4], nod: sw * .1, bounce: on * 6 };          // 攤手 "how do you go?"
    case 'point': return { la: [.2, .15], ra: [2.0, -.1], bounce: on * 8, sway: -.04 };              // 指向前方
    case 'sway': return { la: [2.5, .3], ra: [2.5, .3], sway: sw * .18, bounce: on * 6 };
    case 'step': return { la: [.5 + alt * .3, .6], ra: [.5 - alt * .3, .6], ll: .06 + (alt > 0 ? on * .35 : 0), rl: .06 + (alt < 0 ? on * .35 : 0), bounce: on * 10, sway: alt * .05 };
    case 'hips': return { la: [.5, -.9], ra: [.5, -.9], sway: sw * .1, bounce: on * 8 };
    case 'jump': return { la: [2.6, .2], ra: [2.6, .2], hop: Math.sin(Math.min(1, b.f * 1.2) * Math.PI) * 60, ll: .2, rl: .2 };
    case 'book': return { la: [-.4, -1.7], ra: [-.4, -1.7], nod: .15, bounce: on * 4, book: true };  // 雙手捧書 "learning"
  }
  return {};
}
// 依時間表選舞步 / choose move from a timeline [[localStart, moveName], ...]
function moveAt(timeline, t) { let m = timeline[0][1]; for (const [s, n] of timeline) if (t >= s) m = n; return m; }
function blendPose(a, b, k) {   // 動作切換時 0.18 s 補間 / blend two poses
  const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[key], vb = b[key];
    if (Array.isArray(va) || Array.isArray(vb)) { const A = va || [.2, .15], B = vb || [.2, .15]; o[key] = [lerp(A[0], B[0], k), lerp(A[1], B[1], k)]; }
    else if (typeof va === 'number' || typeof vb === 'number') o[key] = lerp(va || 0, vb || 0, k);
    else o[key] = k < .5 ? va : vb;
  } return o;
}
function dancePose(timeline, t, side = 1) {
  const b = beatAt(t + SCENE.songStart); let idx = 0; for (let i = 0; i < timeline.length; i++) if (t >= timeline[i][0]) idx = i;
  const cur = danceMove(timeline[idx][1], b, t, side), k = clamp((t - timeline[idx][0]) / .18);
  if (idx > 0 && k < 1) return blendPose(danceMove(timeline[idx - 1][1], b, t, side), cur, E.inOut(k));
  return cur;
}
function drawBook(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(-44, -6); c.lineTo(0, 4); c.lineTo(44, -6); c.lineTo(44, 40); c.lineTo(0, 50); c.lineTo(-44, 40); c.closePath(); fillStroke(c, '#fff', 5); c.beginPath(); c.moveTo(0, 4); c.lineTo(0, 50); c.stroke(); c.restore(); }
// 交通工具小圖示 / transport icons (for chorus cards)
function transportIcon(c, kind, x, y, k) {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k);
  rr(c, -80, -80, 160, 160, 34); fillStroke(c, '#fff', 6);
  const col = { car: '#ff8c78', bus: '#3d78c9', metro: '#8b5cc7', train: '#c0392b', foot: '#38b2a6', scooter: '#2fa59a' }[kind];
  c.lineWidth = 5; c.strokeStyle = INK;
  if (kind === 'car') { c.beginPath(); c.moveTo(-50, 20); c.lineTo(-50, -2); c.lineTo(-24, -6); c.lineTo(-8, -30); c.lineTo(26, -30); c.lineTo(40, -6); c.lineTo(52, 0); c.lineTo(52, 20); c.closePath(); fillStroke(c, col, 5); wheel(-26, 24); wheel(30, 24); }
  if (kind === 'bus') { rr(c, -56, -40, 112, 66, 12); fillStroke(c, col, 5); for (const wx of [-42, -14, 14]) { rr(c, wx, -30, 22, 20, 4); fillStroke(c, '#bfe8f5', 3); } wheel(-30, 30); wheel(32, 30); }
  if (kind === 'metro') { rr(c, -46, -48, 92, 84, 20); fillStroke(c, col, 5); rr(c, -32, -34, 64, 30, 6); fillStroke(c, '#bfe8f5', 3); c.beginPath(); c.arc(-22, 18, 7, 0, 7); c.arc(22, 18, 7, 0, 7); c.fillStyle = '#ffd84d'; c.fill(); c.beginPath(); c.moveTo(-30, 40); c.lineTo(-44, 56); c.moveTo(30, 40); c.lineTo(44, 56); c.stroke(); }
  if (kind === 'train') { rr(c, -58, -36, 116, 58, 14); fillStroke(c, col, 5); for (const wx of [-44, -8, 28]) { rr(c, wx, -26, 22, 20, 4); fillStroke(c, '#fff6d6', 3); } wheel(-34, 30); wheel(0, 30); wheel(34, 30); }
  if (kind === 'foot') { for (const [fx, fy, r] of [[-22, 12, -.3], [22, -18, .3]]) { c.save(); c.translate(fx, fy); c.rotate(r); c.beginPath(); c.ellipse(0, 0, 16, 26, 0, 0, 7); fillStroke(c, col, 5); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-10 + i * 7, -32, 4, 0, 7); c.fillStyle = col; c.fill(); } c.restore(); } }
  if (kind === 'scooter') { c.beginPath(); c.moveTo(-44, 16); c.lineTo(-10, 16); c.lineTo(10, -6); c.lineTo(40, -6); c.lineTo(46, 16); c.closePath(); fillStroke(c, col, 5); c.beginPath(); c.moveTo(34, -6); c.lineTo(28, -40); c.lineTo(42, -42); c.stroke(); rr(c, -36, -10, 40, 12, 6); fillStroke(c, '#5a4a44', 4); wheel(-34, 28); wheel(40, 28); }
  c.restore();
  function wheel(wx, wy) { c.beginPath(); c.arc(wx, wy, 13, 0, 7); fillStroke(c, '#34343c', 4); }
}
