// 2D 動畫引擎：純函式 renderFrame(t)，同一個 t 永遠畫出同一格（可平行、可重播、可 diff）。
// Deterministic 2D engine: renderFrame(t) is a pure function of time.
const W = 1920, H = 1080, INK = '#3b2a2e';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: k => k,
  inOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  back: k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
};
// 以時間 key 補間 / keyframe tween: keys=[[t,v,ease?],...]
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
      return lerp(v0, v1, (E[e || 'inOut'])(prog(t, t0, t1)));
    }
  }
  return keys[keys.length - 1][1];
}
// 決定性亂數（手繪抖動 boil 用）/ seeded noise for hand-drawn "boil"
function rnd(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function boil(t, seed, amp = 1.6, fps = 12) { const f = Math.floor(t * fps); return [(rnd(f * 3 + seed) - .5) * 2 * amp, (rnd(f * 5 + seed + 9) - .5) * 2 * amp]; }

function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function fillStroke(c, fill, lw = 6) { if (fill) { c.fillStyle = fill; c.fill(); } c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }

// 肢體：兩段骨 + 圓端，角度為弧度（0=向下）/ two-bone limb, angles from straight-down
function limb(c, x, y, a1, a2, l1, l2, w, col) {
  const x1 = x + Math.sin(a1) * l1, y1 = y + Math.cos(a1) * l1;
  const x2 = x1 + Math.sin(a1 + a2) * l2, y2 = y1 + Math.cos(a1 + a2) * l2;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = INK; c.lineWidth = w + 10; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  return [x2, y2];
}

// 角色：pose = {x,y(腳底),face(1右/-1左),walk(相位),wave(0-1),point(0-1 指向前上方),cheer(0-1 雙手高舉),raise(0-1 單手握拳舉高),hop(px),talk,round,lean,nod,scale,alpha}
function kid(c, ch, p, t) {
  const s = p.scale || 1, f = p.face || 1;
  c.save(); c.translate(p.x, p.y - (p.hop || 0)); c.scale(s * f, s); if (p.alpha !== undefined) c.globalAlpha = p.alpha;
  const ph = p.walk || 0, mv = p.moving ? 1 : 0;
  const bob = Math.abs(Math.sin(ph)) * 8 * mv, lean = (p.lean || 0);
  const sw = Math.sin(ph) * .5 * mv;
  // 後腿 / back leg
  { const [bx, by] = limb(c, -14, -150 - bob, -sw, Math.max(0, sw) * .9, 70, 72, 26, ch.pants); shoe(c, bx, by, ch); }
  // 背包 / backpack
  c.save(); c.translate(-6, -300 - bob); c.rotate(lean * .5);
  rr(c, -78, 0, 62, 100, 18); fillStroke(c, ch.pack, 6); c.restore();
  // 後手 / back arm
  const swa = -sw * .9;
  const ch_ = E.out(p.cheer || 0);
  limb(c, lerp(-4, -34, ch_), -276 - bob, lerp(swa * .8, -2.35, ch_), lerp(.12 + Math.max(0, -swa) * .3, -.15 + Math.sin(t * 9 + 1) * .12, ch_), 62, 56, 22, ch.jacketD);
  // 前手（可揮手）/ front arm with wave
  const wv = p.wave || 0, pt = E.out(p.point || 0);
  let up = lerp(swa * -.8, 2.5, E.out(wv)), el = lerp(.12, .25 + Math.sin(t * 11) * .5, wv);
  up = lerp(up, 2.05, pt); el = lerp(el, -.05, pt);                       // 指向學校 / point
  up = lerp(up, 2.35, ch_); el = lerp(el, .15 + Math.sin(t * 9) * .12, ch_);   // Y 字歡呼
  const rs = E.out(p.raise || 0); up = lerp(up, 2.6, rs); el = lerp(el, .25, rs);   // 單手握拳舉高 / one fist up
  const behind = Math.max(ch_, rs), sx_ = lerp(6, 34, behind);   // 歡呼：雙手舉過頭 / cheer
  if (behind > .5) limb(c, sx_, -276 - bob, up, el, 62, 56, 22, ch.jacket);   // 歡呼時手臂畫在頭後，不遮臉 / behind head
  // 身體 / torso
  c.save(); c.translate(0, -150 - bob); c.rotate(lean);
  rr(c, -42, -150, 84, 150, 28); fillStroke(c, ch.jacket, 7);
  rr(c, -20, -150, 40, 70, 14); c.fillStyle = ch.under; c.fill();            // 內搭 / undershirt
  c.beginPath(); c.moveTo(0, -150); c.lineTo(0, 0); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
  // 頭 / head
  c.save(); c.translate(6, -190); c.rotate(-lean * .6 + (p.nod || 0));
  head(c, ch, p, t); c.restore();
  c.restore();
  // 前腿 / front leg
  { const [fx, fy] = limb(c, 14, -150 - bob, sw, Math.max(0, -sw) * .9, 70, 72, 26, ch.pants); shoe(c, fx, fy, ch); }
  if (behind <= .5) limb(c, sx_, -276 - bob, up, el, 62, 56, 22, ch.jacket);
  c.restore();
}
function shoe(c, x, y, ch) {
  c.save(); c.translate(x, y); rr(c, -16, -18, 52, 24, 12); fillStroke(c, ch.shoe, 6);
  c.fillStyle = '#fff'; c.fillRect(-12, -2, 44, 5); c.restore();
}
function head(c, ch, p, t) {
  // 馬尾 / ponytail 擺動
  const sway = Math.sin((p.walk || 0) * 1 + 1) * (p.moving ? .35 : .06) + (p.hairSway || 0);
  if (ch.pony) { c.save(); c.translate(-44, -40); c.rotate(.5 + sway); rr(c, -22, -6, 30, 92, 15); fillStroke(c, ch.hair, 6); c.restore(); }
  c.beginPath(); c.ellipse(0, 0, 62, 66, 0, 0, Math.PI * 2); fillStroke(c, ch.skin, 7);
  // 瀏海 / hair cap
  c.beginPath(); c.moveTo(-64, -6); c.bezierCurveTo(-70, -80, 70, -88, 64, -6);
  c.bezierCurveTo(40, -42, 6, -30, -14, -52); c.bezierCurveTo(-26, -34, -46, -26, -64, -6); c.closePath(); fillStroke(c, ch.hair, 6);
  // 眼 / eyes（每 3.4 秒眨一次，錯開）
  const bl = ((t + ch.blinkOff) % 3.4) < .14 ? .1 : 1;
  c.fillStyle = INK;
  for (const ex of [-24, 26]) { c.beginPath(); c.ellipse(ex + (p.look || 0) * 4, 6, 8, 12 * bl, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#fff'; for (const ex of [-24, 26]) { c.beginPath(); c.arc(ex + 3, 1, 3, 0, 7); c.fill(); }
  // 腮紅 / blush
  c.fillStyle = 'rgba(255,120,120,.35)'; for (const ex of [-40, 42]) { c.beginPath(); c.ellipse(ex, 28, 12, 7, 0, 0, 7); c.fill(); }
  // 嘴 / mouth（talk 0-1 = 張口）
  const tk = p.talk || 0;
  c.beginPath();
  const ro = p.round || 0;                                                 // 圓唇（o/u）較窄較高
  if (tk > .05) { c.ellipse(2, 36, lerp(13, 7.5, ro), 4 + tk * lerp(11, 13, ro), 0, 0, Math.PI * 2); c.fillStyle = '#b3374a'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); }
  else { c.moveTo(-14, 34); c.quadraticCurveTo(2, 50, 18, 34); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); }
}

// 簡單掃描：把 SRT 當字幕 / subtitle lookup
function cueAt(cues, t) { return cues.find(c => t >= c[0] && t < c[1]); }
function drawSubtitle(c, text) {
  if (!text) return;
  c.save(); c.font = '700 54px "Inter","Segoe UI","Microsoft JhengHei",sans-serif'; c.textAlign = 'center';
  const w = c.measureText(text).width + 70;
  c.fillStyle = 'rgba(30,20,28,.72)'; rr(c, W / 2 - w / 2, 930, w, 88, 24); c.fill();
  c.fillStyle = '#fff'; c.fillText(text, W / 2, 992); c.restore();
}
function tag(c, text, t0, t) {
  const k = E.out(prog(t, t0, t0 + .5)); if (k <= 0) return;
  c.save(); c.translate(60 - (1 - k) * 400, 56); c.font = '700 40px "Inter","Segoe UI",sans-serif';
  const w = c.measureText(text).width + 60; rr(c, 0, 0, w, 72, 36); fillStroke(c, '#fff6d6', 6);
  c.fillStyle = INK; c.fillText(text, 30, 50); c.restore();
}

// 口型：優先用原曲對嘴 LIPSYNC（lipsync/song_lipsync.py），否則用 TTS 的 VOICE / lip-sync source
function lipSrc() { return typeof LIPSYNC !== 'undefined' ? LIPSYNC : (typeof VOICE !== 'undefined' ? VOICE : null); }
function sampleEnv(arr, fps, t) { const f = t * fps, i = Math.floor(f); if (!arr || i < 0 || i >= arr.length - 1) return 0; return lerp(arr[i], arr[i + 1], f - i); }
function mouthAt(t) { const L = lipSrc(); return L ? sampleEnv(L.env, L.fps, t) : 0; }
function roundAt(t) { const L = lipSrc(); return L && L.round ? sampleEnv(L.round, L.fps, t) : 0; }
// 卡拉 OK 字幕：已唱過的字為黃色、正在唱的字放大 / karaoke subtitle from word timings
function drawKaraoke(c, cue, words, t) {
  if (!cue) return;
  const ws = words.filter(w => w[0] >= cue[0] - .05 && w[0] < cue[1] - .05);
  if (!ws.length) return drawSubtitle(c, cue[2]);
  const toks = cue[2].split(' ');                       // 用正式歌詞的字（含標點），時間依序對到 ASR 字
  c.save(); c.font = '700 54px "Inter","Segoe UI",sans-serif'; c.textBaseline = 'alphabetic';
  const sp = c.measureText(' ').width * 1.35, widths = toks.map(x => c.measureText(x).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (toks.length - 1);
  c.fillStyle = 'rgba(30,20,28,.72)'; rr(c, W / 2 - total / 2 - 35, 930, total + 70, 88, 24); c.fill();
  let x = W / 2 - total / 2;
  toks.forEach((tk, i) => {
    const w = ws[Math.min(i, ws.length - 1)], on = t >= w[0], cur = on && t < w[1];
    c.save(); c.translate(x + widths[i] / 2, 992); const k = cur ? 1 + .07 * Math.sin(Math.PI * prog(t, w[0], w[1])) : 1; c.scale(k, k);
    c.textAlign = 'center'; c.fillStyle = on ? '#ffd84d' : '#fff'; c.fillText(tk, 0, 0); c.restore();
    x += widths[i] + sp;
  });
  c.restore();
}

// 共用小道具 / shared props（字卡、星星、爆發特效）
function wordCard(c, x, y, text, k) {
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(-.05);
  c.font = '800 56px "Inter","Segoe UI",sans-serif'; const w = c.measureText(text).width + 70;
  rr(c, -w / 2, -50, w, 96, 30); fillStroke(c, '#ffd84d', 7); c.fillStyle = INK; c.textAlign = 'center'; c.fillText(text, 0, 18); c.restore();
}
function burst(c, x, y, k) {
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = 60 + 160 * E.out(k); star(c, x + Math.cos(a) * r, y + Math.sin(a) * r * .7, 16 * (1 - k * .6)); }
}
function star(c, x, y, r) { c.save(); c.translate(x, y); c.fillStyle = '#ffd84d'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr_ = i % 2 ? r * .35 : r; c.lineTo(Math.cos(a) * rr_, Math.sin(a) * rr_); } c.closePath(); c.fill(); c.restore(); }
