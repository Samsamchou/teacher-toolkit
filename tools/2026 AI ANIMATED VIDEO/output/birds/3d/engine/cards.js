// cards.js — 〈Birds〉詞義圖卡：右上角的「拍立得回憶照片」（老師 11/05 RDQ）
// Polaroid meaning cards in the top-right corner. Codex illustrations (C) or code-drawn animations (P),
// each photo = left half literal picture + right half everyday metaphor. Everything is a function of time.
// 用法：drawCards(ctx, st)；需要全域 SONG（song-data.js）與 CARDS（cards-data.js）。
const IMG = {};
export async function preloadCards() {
  const codes = [...new Set(CARDS.filter(c => c.how === 'C').map(c => c.code))];
  await Promise.all(codes.map(code => new Promise(res => { const im = new Image(); im.onload = () => { IMG[code] = im; res(); }; im.onerror = () => res(); im.src = '../cards/' + code + '.png'; })));
}
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const easeOut = k => 1 - Math.pow(1 - k, 3);
const backOut = k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// 每張圖卡的出現時間：句首 +0.1 秒進場；若下一張緊接著來，就和下一張的進場重疊 0.32 秒（無縫接力）
// Card windows: in at line start + .1 s; when the next card follows closely, stay until it has dropped in.
function windows() {
  if (windows.cache) return windows.cache;
  const w = CARDS.map(c => { const cue = SONG.cues[c.n - 1]; return { card: c, t0: cue[0] + .1, end: cue[1] - .05 }; });
  w.forEach((x, i) => { const nx = w[i + 1]; x.t1 = nx && nx.t0 - x.end < .6 ? nx.t0 + .32 : x.end; });
  return (windows.cache = w);
}
const stateOf = (x, st) => ({ card: x.card, k: (st - x.t0) / (x.t1 - x.t0), tIn: st - x.t0, tOut: x.t1 - st, dur: x.t1 - x.t0 });
export function cardStates(st) { return windows().filter(x => st >= x.t0 && st < x.t1).map(x => stateOf(x, st)); }
export function cardState(st) { const a = cardStates(st); return a.length ? a[a.length - 1] : null; }
// 鏡頭平移（以鏡頭為單位）：這個鏡頭 [a, b] 期間只要有圖卡，就整個鏡頭固定讓位 1，否則 0
// Shot-based shift: 1 for the whole shot if any card shows during it — constant inside a shot, changes only at cuts.
export function shotShift(a, b) { return windows().some(x => x.t0 < b && x.t1 > a) ? 1 : 0; }
export function featherPulse(st) { const s = cardState(st); if (!s) return 0; return Math.max(0, 1 - s.tIn / .7) * Math.sin(Math.min(1, s.tIn / .12) * Math.PI / 2); }

export function drawCards(c, st, opt = {}) { for (const s of cardStates(st)) drawOne(c, s, opt); }   // 先畫滑出的、再畫落下的
function drawOne(c, s, { gray = 0 } = {}) {
  const { card } = s; const W = card.big ? 768 : 576, PH = W * .62, M = W * .045, BOT = W * .14;   // 40% 或 30% 畫面寬
  const H = PH + M + BOT;
  const inK = clamp(s.tIn / .38), outK = clamp(1 - s.tOut / .32);
  const x0 = 1920 - 40 - W, y0 = 36;
  c.save();
  c.translate(x0 + W / 2 + outK * 900, y0 + H / 2 - (1 - easeOut(inK)) * 260);
  c.rotate((-4 + (card.repeat ? 3 : 0)) * Math.PI / 180 + (1 - inK) * .12);
  const sc = .7 + .3 * backOut(inK); c.scale(sc, sc); c.globalAlpha = Math.min(1, inK * 2.2) * (1 - outK * .6);
  // 拍立得白框＋陰影 / polaroid frame
  c.shadowColor = 'rgba(30,20,10,.45)'; c.shadowBlur = 26; c.shadowOffsetY = 10;
  c.fillStyle = '#fbf8f1'; c.fillRect(-W / 2, -H / 2, W, H); c.shadowColor = 'transparent';
  // 一小片膠帶 / a strip of tape
  c.save(); c.translate(0, -H / 2 + 4); c.rotate(.04); c.fillStyle = 'rgba(232,214,170,.82)'; c.fillRect(-60, -16, 120, 30); c.restore();
  // 照片區 / photo area
  const px = -W / 2 + M, py = -H / 2 + M, pw = W - 2 * M, ph = PH;
  c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip(); c.translate(px, py);
  if (card.how === 'C' && IMG[card.code]) { const im = IMG[card.code], r = Math.max(pw / im.width, ph / im.height); c.drawImage(im, (pw - im.width * r) / 2, (ph - im.height * r) / 2, im.width * r, im.height * r); }
  else { c.fillStyle = '#f6efe0'; c.fillRect(0, 0, pw, ph); (PROG[card.code] || PROG.none)(c, pw, ph, s.tIn, s.k, card); }
  if (gray > 0) { c.globalCompositeOperation = 'saturation'; c.fillStyle = `rgba(128,128,128,${gray})`; c.fillRect(0, 0, pw, ph); c.globalCompositeOperation = 'source-over'; }
  // 照片的光澤 / a soft gloss
  const g = c.createLinearGradient(0, 0, pw, ph); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, pw, ph);
  c.restore();
  c.strokeStyle = 'rgba(80,60,40,.18)'; c.lineWidth = 2; c.strokeRect(px, py, pw, ph);
  // 白邊手寫中文關鍵詞 / handwritten label on the white strip
  c.fillStyle = '#3d3036'; c.font = `700 ${Math.round(BOT * .5)}px "DFKai-SB","BiauKai","KaiTi",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(card.label, 0, H / 2 - BOT / 2 - 2);
  c.restore();
}

// ── 程式動畫圖卡（左＝字面、右＝生活比喻）/ code-drawn cards ──
const half = (c, w, h, fL, fR) => { c.save(); c.beginPath(); c.rect(0, 0, w / 2 - 3, h); c.clip(); fL(w / 2 - 3, h); c.restore();
  c.fillStyle = '#e3d6bd'; c.fillRect(w / 2 - 3, 0, 6, h); c.save(); c.translate(w / 2 + 3, 0); c.beginPath(); c.rect(0, 0, w / 2 - 3, h); c.clip(); fR(w / 2 - 3, h); c.restore(); };
function heartPath(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * .3); c.bezierCurveTo(x - s * .6, y - s * .2, x - s * .4, y - s * .75, x, y - s * .38); c.bezierCurveTo(x + s * .4, y - s * .75, x + s * .6, y - s * .2, x, y + s * .3); c.closePath(); }
function kid(c, x, y, s, col = '#c8352e') { c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(x, y - s * .78, s * .16, 0, 7); c.fill(); c.fillStyle = '#3a2a25'; c.beginPath(); c.arc(x, y - s * .82, s * .17, Math.PI, 0); c.fill();
  c.fillStyle = col; c.fillRect(x - s * .15, y - s * .62, s * .3, s * .36); c.fillStyle = '#4a6a9a'; c.fillRect(x - s * .13, y - s * .26, s * .1, s * .26); c.fillRect(x + s * .03, y - s * .26, s * .1, s * .26); }
const PROG = {
  none(c, w, h) {},
  // #2 心臟把血推出去→變成河；水滴匯成大浪 / heart pumps dots into a river; drops become a wave
  'P01-blood-flood'(c, w, h, t, k) { half(c, w, h, (W, H) => {
      const beat = 1 + .12 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.2)), 4); c.save(); c.translate(W * .28, H * .36); c.scale(beat, beat); heartPath(c, 0, 0, H * .38); c.fillStyle = '#e0475a'; c.fill(); c.restore();
      const river = H * (.12 + .3 * k); c.fillStyle = '#c93a48'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 6) c.lineTo(x, H - river + Math.sin(x * .05 + t * 4) * 6); c.lineTo(W, H); c.fill();
      for (let i = 0; i < 14; i++) { const p = ((t * .9 + i / 14) % 1); c.fillStyle = '#e0475a'; c.beginPath(); c.arc(W * .3 + p * W * .6, H * .4 + p * p * (H * .55 - river * .5), 6, 0, 7); c.fill(); } },
    (W, H) => { const wave = H * (.15 + .5 * k); c.fillStyle = '#5aa7d6'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 6) c.lineTo(x, H - wave + Math.sin(x * .04 + t * 3) * 10 - (x / W) * wave * .4 * k); c.lineTo(W, H); c.fill();
      for (let i = 0; i < 10; i++) { const p = ((t * .8 + i / 10) % 1); c.fillStyle = '#7cc3ea'; c.beginPath(); c.ellipse(W * (.1 + .08 * i), p * (H - wave), 5, 8, 0, 0, 7); c.fill(); } }); },
  // #6 倒掉的積木重新堆好；打勾 / re-stacking blocks; a big tick
  'P02-make-it-right'(c, w, h, t, k) { half(c, w, h, (W, H) => { const cols = ['#e8a33d', '#5aa7d6', '#e0475a'];
      cols.forEach((col, i) => { const kk = clamp(k * 3.2 - i * .9), fx = W * (.2 + i * .25), fy = H * .82; const tx = W * .5, ty = H * .82 - i * H * .2;
        c.save(); c.translate(fx + (tx - fx) * ease(kk), fy + (ty - fy) * ease(kk) - Math.sin(kk * Math.PI) * 40); c.rotate((1 - kk) * (i - 1) * .9); c.fillStyle = col; c.fillRect(-H * .1, -H * .1, H * .2, H * .2); c.restore(); }); },
    (W, H) => { const kk = clamp((k - .15) / .6); c.strokeStyle = '#3aa65a'; c.lineWidth = 16; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      const a = [W * .22, H * .52], b = [W * .42, H * .72], d = [W * .8, H * .28]; c.moveTo(...a);
      if (kk < .35) c.lineTo(a[0] + (b[0] - a[0]) * kk / .35, a[1] + (b[1] - a[1]) * kk / .35); else { c.lineTo(...b); const m = (kk - .35) / .65; c.lineTo(b[0] + (d[0] - b[0]) * m, b[1] + (d[1] - b[1]) * m); } c.stroke(); }); },
  // #7 四季樹；月曆翻頁 / four-season tree; calendar pages
  'P03-seasons'(c, w, h, t, k, card) { half(c, w, h, (W, H) => { const S = [['#f6b8c8', '#9ad07a'], ['#5aa84a', '#bfe39a'], ['#e8862e', '#f2c26a'], ['#ffffff', '#cfe3f2']]; const cur = Math.min(3, Math.floor(k * 4.4));
      S.forEach((s, i) => { const x = (i % 2) * W / 2, y = Math.floor(i / 2) * H / 2; c.fillStyle = i === cur ? s[1] : '#efe8da'; c.fillRect(x + 4, y + 4, W / 2 - 8, H / 2 - 8);
        c.fillStyle = '#7a5a40'; c.fillRect(x + W / 4 - 4, y + H * .28, 8, H * .18); c.fillStyle = i === cur ? s[0] : '#d8d0c0'; c.beginPath(); c.arc(x + W / 4, y + H * .22, H * .11, 0, 7); c.fill();
        if (card.repeat && i === 2) { c.fillStyle = 'rgba(120,120,120,.55)'; c.fillRect(x + 4, y + 4, W / 2 - 8, H / 2 - 8); } }); },
    (W, H) => { const M = ['MAR', 'JUN', 'SEP', 'DEC'], cur = Math.min(3, Math.floor(k * 4.4)), f = (k * 4.4) % 1;
      c.fillStyle = '#fff'; c.fillRect(W * .18, H * .18, W * .64, H * .66); c.fillStyle = '#e0475a'; c.fillRect(W * .18, H * .18, W * .64, H * .16);
      c.fillStyle = '#fff'; c.font = `900 ${H * .1}px "Comic Relief",sans-serif`; c.textAlign = 'center'; c.fillText(M[cur], W / 2, H * .3);
      c.fillStyle = '#c9bfae'; for (let i = 0; i < 12; i++) c.fillRect(W * (.24 + (i % 4) * .14), H * (.42 + Math.floor(i / 4) * .12), W * .08, H * .06);
      if (f > .7 && cur < 3) { const p = (f - .7) / .3; c.save(); c.translate(W * .18, H * .34); c.scale(1, 1 - p); c.fillStyle = '#f4ede0'; c.fillRect(0, 0, W * .64, H * .5); c.restore(); } }); },
  // #8 身高尺長高；種子發芽 / growing on a height chart; seed to tree
  'P04-grow'(c, w, h, t, k, card) { half(c, w, h, (W, H) => { c.fillStyle = '#f2d98a'; c.fillRect(W * .62, H * .08, W * .16, H * .86); c.fillStyle = '#7a5a40';
      for (let i = 0; i < 9; i++) c.fillRect(W * .62, H * (.1 + i * .1), W * (i % 2 ? .06 : .1), 3);
      const s = H * ((card.repeat ? .55 : .35) + .4 * ease(k)); kid(c, W * .38, H * .94, s, card.repeat ? '#a8302a' : '#c8352e'); },
    (W, H) => { c.fillStyle = '#8a6040'; c.fillRect(0, H * .84, W, H * .16); const g = ease(k); c.fillStyle = '#6a4a30'; c.beginPath(); c.ellipse(W / 2, H * .84, 12, 8, 0, 0, 7); c.fill();
      c.strokeStyle = '#5a8a3a'; c.lineWidth = 6 + 10 * g; c.beginPath(); c.moveTo(W / 2, H * .84); c.lineTo(W / 2, H * (.84 - .55 * g)); c.stroke();
      c.fillStyle = '#6fb04a'; c.beginPath(); c.arc(W / 2, H * (.84 - .55 * g), 10 + 70 * g * g, 0, 7); c.fill(); }); },
  // #10 沙漏；泡泡破掉 / hourglass; a popping bubble
  'P05-temporary'(c, w, h, t, k, card) { half(c, w, h, (W, H) => { const cx = W / 2, top = H * .12, mid = H * .5, bot = H * .88, r = W * .28;
      c.strokeStyle = '#7a5a40'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx - r, top); c.lineTo(cx + r, top); c.lineTo(cx + 6, mid); c.lineTo(cx + r, bot); c.lineTo(cx - r, bot); c.lineTo(cx - 6, mid); c.closePath(); c.stroke();
      const sand = card.repeat ? '#a8a29a' : '#e8b85a', a = 1 - k; c.fillStyle = sand;
      c.beginPath(); c.moveTo(cx - r * a, mid - (mid - top) * a); c.lineTo(cx + r * a, mid - (mid - top) * a); c.lineTo(cx, mid); c.fill();
      c.beginPath(); c.moveTo(cx - r * Math.sqrt(k), bot); c.lineTo(cx + r * Math.sqrt(k), bot); c.lineTo(cx, bot - (bot - mid) * k * .8); c.fill(); if (k < .98) c.fillRect(cx - 2, mid, 4, bot - mid); },
    (W, H) => { const pop = k > .72; const y = H * (.8 - .6 * Math.min(k, .72) / .72), r = H * .16;
      if (!pop) { c.strokeStyle = 'rgba(120,170,220,.9)'; c.lineWidth = 4; c.beginPath(); c.arc(W / 2 + Math.sin(t * 2) * 10, y, r, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(W / 2 - r * .35, y - r * .35, r * .18, 0, 7); c.fill(); }
      else { const p = (k - .72) / .28; c.strokeStyle = `rgba(120,170,220,${1 - p})`; c.lineWidth = 4; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r * (.6 + p), y + Math.sin(a) * r * (.6 + p)); c.lineTo(W / 2 + Math.cos(a) * r * (.9 + p), y + Math.sin(a) * r * (.9 + p)); c.stroke(); } } }); },
  // #11 杯子滑落；沙從指縫溜走 / a cup slides off; sand through fingers
  'P06-slide'(c, w, h, t, k) { half(c, w, h, (W, H) => { c.fillStyle = '#b58a5a'; c.fillRect(0, H * .6, W * .7, H * .06); c.fillRect(W * .62, H * .66, W * .05, H * .34);
      const x = W * (.2 + .55 * ease(clamp(k / .7))), fall = clamp((k - .7) / .3), y = H * .6 + fall * fall * H * .38;
      c.save(); c.translate(x, y); c.rotate(fall * 1.4); c.fillStyle = '#5aa7d6'; c.fillRect(-22, -50, 44, 50); c.fillStyle = '#fff'; c.fillRect(-18, -46, 36, 10); c.restore(); },
    (W, H) => { c.fillStyle = '#f1c9a5'; c.beginPath(); c.ellipse(W / 2, H * .35, W * .3, H * .12, 0, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) { c.fillRect(W * (.28 + i * .12), H * .36, W * .07, H * .14); }
      c.fillStyle = '#e8b85a'; for (let i = 0; i < 40; i++) { const p = ((t * .7 + i / 40) % 1); c.beginPath(); c.arc(W * (.33 + (i % 4) * .12), H * .5 + p * H * .45, 3, 0, 7); c.fill(); }
      c.fillStyle = '#e8b85a'; c.beginPath(); c.ellipse(W / 2, H * .3, W * .22 * (1 - k * .8), H * .06 * (1 - k * .8), 0, 0, 7); c.fill(); }); },
  // #12 吹不熄的愛心；永遠在的星星 / a heart the wind can't blow out; ever-present stars
  'P07-love-never-die'(c, w, h, t, k, card) { half(c, w, h, (W, H) => { if (card.repeat) { c.fillStyle = '#9a9a9a'; c.fillRect(0, 0, W, H); }
      c.strokeStyle = 'rgba(120,150,190,.7)'; c.lineWidth = 4; for (let i = 0; i < 4; i++) { const x = ((t * .9 + i / 4) % 1) * W; c.beginPath(); c.moveTo(x - 60, H * (.25 + i * .15)); c.quadraticCurveTo(x - 20, H * (.2 + i * .15), x, H * (.25 + i * .15)); c.stroke(); }
      const p = 1 + .08 * Math.sin(t * 4); c.save(); c.translate(W / 2, H * .52); c.scale(p, p); c.shadowColor = '#ff6a8a'; c.shadowBlur = 40; heartPath(c, 0, 0, H * .5); c.fillStyle = '#ff5a7a'; c.fill(); c.restore(); },
    (W, H) => { c.fillStyle = '#1d2450'; c.fillRect(0, 0, W, H); for (let i = 0; i < 26; i++) { const x = ((i * 137) % 97) / 97 * W, y = ((i * 61) % 89) / 89 * H * .9, s = 2 + 3 * (.5 + .5 * Math.sin(t * 3 + i));
      c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); } }); },
  // #15 同一點往不同方向飛的鳥＋箭頭；畢業揮手各奔東西（灰色版 #32、金色版 #49 由 card.n 決定）
  'P09-different-directions'(c, w, h, t, k, card) { const col = card.n === 32 ? '#8a8a8a' : card.n === 49 ? '#e8b030' : '#4a6a9a';
    half(c, w, h, (W, H) => { const cx = W / 2, cy = H * .55; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + .3, r = 20 + ease(k) * W * .4;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .8; c.strokeStyle = col; c.lineWidth = 3; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
        c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(14, 0); c.quadraticCurveTo(-4, -16 * (.6 + .4 * Math.sin(t * 9 + i)), -12, -2); c.quadraticCurveTo(-4, 4, 14, 0); c.fill(); c.restore(); } },
      (W, H) => { [-1, 1].forEach((d, i) => { const x = W / 2 + d * W * (.12 + .25 * ease(k)); kid(c, x, H * .9, H * .55, i ? '#3a7ac8' : '#c8352e');
        c.strokeStyle = '#f1c9a5'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + d * H * .1, H * .9 - H * .45); c.lineTo(x + d * H * .2, H * .9 - H * .6 + Math.sin(t * 8) * 6); c.stroke(); });
        c.fillStyle = '#2a2a3a'; c.beginPath(); c.moveTo(W / 2 - 22, H * .2); c.lineTo(W / 2 + 22, H * .2); c.lineTo(W / 2, H * .12); c.fill(); }); },
  // #18 日落又日出（快轉）
  'P10-sunset-sunrise'(c, w, h, t, k) { const dip = Math.sin(k * Math.PI), y = h * .25 + h * .65 * dip, day = 1 - dip;   // 前半落下、後半升起 / sets then rises
    c.fillStyle = `rgb(${40 + 200 * day},${60 + 150 * day},${110 + 120 * day})`; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffcf4a'; c.beginPath(); c.arc(w * (.2 + .6 * k), y, h * .1, 0, 7); c.fill();
    c.fillStyle = '#5a7a3a'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * .7); c.quadraticCurveTo(w * .5, h * .55, w, h * .72); c.lineTo(w, h); c.fill(); },
  // #19 夢想泡泡＋看葉子飄落
  'P11-dream-leaves'(c, w, h, t, k) { half(c, w, h, (W, H) => { kid(c, W * .4, H * .95, H * .6); c.fillStyle = '#fff'; c.strokeStyle = '#c8bfae'; c.lineWidth = 3;
      [[.55, .38, .04], [.62, .3, .06]].forEach(([x, y, r]) => { c.beginPath(); c.arc(W * x, H * y, H * r, 0, 7); c.fill(); c.stroke(); });
      c.beginPath(); c.ellipse(W * .72, H * .17, W * .22, H * .12, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ffcf4a'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(W * (.62 + i * .08), H * .17, 7, 0, 7); c.fill(); } },
    (W, H) => { for (let i = 0; i < 9; i++) { const p = (t * .25 + i / 9) % 1; c.save(); c.translate(W * (.15 + (i * .37) % .7) + Math.sin(t * 2 + i) * 20, p * H); c.rotate(t * 2 + i);
      c.fillStyle = ['#e8862e', '#d9582b', '#f0a43a'][i % 3]; c.beginPath(); c.ellipse(0, 0, 14, 7, 0, 0, 7); c.fill(); c.restore(); } }); },
  // #20 葉子從綠變黃變紅
  'P12-changing-seasons'(c, w, h, t, k) { const cols = ['#5aa84a', '#c8c040', '#e8862e', '#c9472a']; const f = k * 3, i = Math.min(2, Math.floor(f)), m = f - i;
    const lerpC = (a, b, x) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const r = ((A >> 16) * (1 - x) + (B >> 16) * x) | 0, g = (((A >> 8) & 255) * (1 - x) + ((B >> 8) & 255) * x) | 0, bb = ((A & 255) * (1 - x) + (B & 255) * x) | 0; return `rgb(${r},${g},${bb})`; };
    c.save(); c.translate(w / 2, h / 2); c.rotate(-.5); c.fillStyle = lerpC(cols[i], cols[i + 1], m); c.beginPath(); c.moveTo(0, -h * .38); c.quadraticCurveTo(w * .25, 0, 0, h * .38); c.quadraticCurveTo(-w * .25, 0, 0, -h * .38); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -h * .38); c.lineTo(0, h * .45); c.stroke(); c.restore();
    cols.forEach((cl, j) => { c.fillStyle = cl; c.beginPath(); c.arc(w * (.2 + j * .2), h * .9, 10, 0, 7); c.fill(); }); },
  // #23 對著流星許願
  'P13-wishing'(c, w, h, t, k) { c.fillStyle = '#1d2450'; c.fillRect(0, 0, w, h); for (let i = 0; i < 20; i++) { c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(((i * 137) % 97) / 97 * w, ((i * 61) % 89) / 89 * h * .6, 2, 0, 7); c.fill(); }
    const p = clamp(k * 1.4); const x = w * (.9 - .6 * p), y = h * (.1 + .3 * p); const g = c.createLinearGradient(x, y, x + 120, y - 60); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, 'rgba(255,246,200,0)');
    c.strokeStyle = g; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 120, y - 60); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill();
    kid(c, w * .3, h * .98, h * .5); c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(w * .3, h * .66, 9, 0, 7); c.fill(); },
  // #38 往高處飛＋風箏越飛越高
  'P14-fly-high'(c, w, h, t, k) { half(c, w, h, (W, H) => { c.fillStyle = '#cfe6f6'; c.fillRect(0, 0, W, H); const y = H * (.85 - .7 * ease(k));
      c.strokeStyle = '#e0475a'; c.lineWidth = 6; c.beginPath(); c.moveTo(W * .2, H * .9); c.lineTo(W * .2, H * .2); c.stroke(); c.fillStyle = '#e0475a'; c.beginPath(); c.moveTo(W * .2, H * .1); c.lineTo(W * .13, H * .22); c.lineTo(W * .27, H * .22); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 1; i < 6; i++) { c.beginPath(); c.arc(W * .6, y + i * 26, 5 - i * .6, 0, 7); c.fill(); }   // 往上的軌跡 / rising trail
      c.save(); c.translate(W * .6, y); c.scale(2.6, 2.6); c.fillStyle = '#fff'; c.strokeStyle = '#7a8fa0'; c.lineWidth = 1; c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(0, -24 * (.6 + .4 * Math.sin(t * 10)), -18, -2); c.quadraticCurveTo(0, 6, 20, 0); c.fill(); c.stroke(); c.restore(); },
    (W, H) => { c.fillStyle = '#bfe0f4'; c.fillRect(0, 0, W, H); const kx = W * (.4 + .3 * ease(k)), ky = H * (.75 - .55 * ease(k));
      c.strokeStyle = '#7a5a40'; c.lineWidth = 2; c.beginPath(); c.moveTo(W * .15, H * .95); c.quadraticCurveTo(W * .3, H * .6, kx, ky); c.stroke();
      c.save(); c.translate(kx, ky); c.rotate(Math.sin(t * 3) * .2); c.fillStyle = '#e8743a'; c.beginPath(); c.moveTo(0, -30); c.lineTo(20, 0); c.lineTo(0, 30); c.lineTo(-20, 0); c.fill(); c.restore(); }); },
  // #40 月光照亮地面；手電筒照亮黑暗
  'P15-light-on-ground'(c, w, h, t, k) { half(c, w, h, (W, H) => { c.fillStyle = '#141a3a'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(W * .7, H * .2, H * .1, 0, 7); c.fill();
      const g = c.createRadialGradient(W * .45, H * .82, 5, W * .45, H * .82, W * .35 * (.4 + .6 * ease(k))); g.addColorStop(0, 'rgba(255,243,196,.85)'); g.addColorStop(1, 'rgba(255,243,196,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(W * .45, H * .82, W * .35, H * .1, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,243,196,.12)'; c.beginPath(); c.moveTo(W * .66, H * .26); c.lineTo(W * .2, H * .82); c.lineTo(W * .7, H * .82); c.fill(); },
    (W, H) => { c.fillStyle = '#1a1a22'; c.fillRect(0, 0, W, H); const a = -.6 + .4 * Math.sin(t * 1.2);
      c.save(); c.translate(W * .2, H * .3); c.rotate(a); c.fillStyle = 'rgba(255,240,180,.35)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(W * .9, -H * .25); c.lineTo(W * .9, H * .35); c.fill(); c.fillStyle = '#5a5a6a'; c.fillRect(-40, -10, 40, 20); c.restore(); }); },
  // #13 點頭＋燈泡亮 / nod and a light bulb
  'P08-i-know'(c, w, h, t, k) { const cx = w * .4, cy = h * .6, nod = Math.sin(t * 6) * .12 * (k < .6 ? 1 : 0);
    c.save(); c.translate(cx, cy); c.rotate(nod); c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(0, 0, h * .22, 0, 7); c.fill(); c.fillStyle = '#3a2a25'; c.beginPath(); c.arc(0, -h * .03, h * .23, Math.PI * 1.05, Math.PI * 1.95); c.fill();
    c.fillStyle = '#2a2026'; c.beginPath(); c.arc(-h * .07, h * .02, 5, 0, 7); c.arc(h * .07, h * .02, 5, 0, 7); c.fill(); c.strokeStyle = '#a0504a'; c.lineWidth = 4; c.beginPath(); c.arc(0, h * .07, h * .06, .2, Math.PI - .2); c.stroke(); c.restore();
    const on = k > .35; c.save(); c.translate(w * .72, h * .3); if (on) { c.shadowColor = '#ffd84d'; c.shadowBlur = 50; } c.fillStyle = on ? '#ffe36a' : '#e8e0c8'; c.beginPath(); c.arc(0, 0, h * .13, 0, 7); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#9a8a7a'; c.fillRect(-h * .06, h * .11, h * .12, h * .08); if (on) { c.strokeStyle = '#f2b23a'; c.lineWidth = 5; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * h * .18, Math.sin(a) * h * .18); c.lineTo(Math.cos(a) * h * .25, Math.sin(a) * h * .25); c.stroke(); } } c.restore(); },
};
