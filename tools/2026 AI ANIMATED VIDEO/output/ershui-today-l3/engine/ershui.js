// ershui.js — 〈二水三景點：跟著探索隊去看看〉旁白式 2D 動畫（三年級〈二水的現在〉第3節）
// 畫面由「全片秒」T 決定（同一個 T 永遠同一格，可平行渲染）。背景圖座標＝原圖 1536×864。
// 引擎改寫自 jiji-line/2d-v2-extended/engine/jiji.js（集集線延長版，2026-10-19 驗收）。
const W = 1920, H = 1080, IW = 1536, IH = 864, BASE = W / IW;
const ART = '../art/';
const IMG = {};
const BG = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B08g', 'B09', 'B10', 'B11', 'B12'];
const CH = ['13', '14', '15', '18', '19', '20', '21', '22', '23', '28', '29', '30', '33', '34', '36', '37', '38'];
const IMG_FILES = {};
BG.forEach(k => IMG_FILES[k] = 'bg/' + k + '.png');
CH.forEach(k => IMG_FILES['c' + k] = 'chars/' + k + '.png');
// 3D-A 小行星空拍（Godot 逐格，172 格）；3D-B 花旗木鐵道（Colab Blender，A 252 格＋B 236 格）
if (typeof A3D !== 'undefined') A3D.forEach((_, i) => IMG_FILES['a' + i] = '3d/a/f' + String(i).padStart(4, '0') + '.jpg');
if (typeof B3D !== 'undefined') Object.keys(B3D).forEach(f => IMG_FILES['b' + f] = '3d/b/f' + String(f).padStart(4, '0') + '.jpg');
function loadImages() {
  return Promise.all(Object.entries(IMG_FILES).map(([k, f]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res();
    im.src = ART + f.split('/').map(encodeURIComponent).join('/');
  })));
}
const FONT = '"Microsoft JhengHei","Noto Sans TC",sans-serif';
const EN = '"Comic Relief","Microsoft JhengHei",sans-serif';
const INK = '#2e2a3b';

// ---------- 補間 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const backOut = k => { if (k <= 0) return 0; if (k >= 1) return 1; const s = 1.7; k -= 1; return k * k * ((s + 1) * k + s) + 1; };
const pop = (t, a, d = .35) => t < a ? 0 : backOut(prog(t, a, a + d));

// ---------- 鏡頭（原圖座標 x,y，放大 z） ----------
function camClamp(x, y, z) { const hw = IW / 2 / z, hh = IH / 2 / z; return [clamp(x, hw, IW - hw), clamp(y, hh, IH - hh), z]; }
function camAt(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
function withCam(c, cam, fn) {
  const [x, y, z] = camClamp(...cam);
  c.save(); c.translate(W / 2, H / 2); c.scale(BASE * z, BASE * z); c.translate(-x, -y); fn(); c.restore();
}
function drawImg(c, key, filter) {
  const im = IMG[key]; if (!im) { c.fillStyle = '#9bb'; c.fillRect(0, 0, IW, IH); return; }
  if (filter) c.filter = filter; c.drawImage(im, 0, 0, IW, IH); c.filter = 'none';
}

// ---------- 文字、標籤 ----------
function rrect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function text(c, s, x, y, size, o = {}) {
  c.save(); c.font = `${o.weight || 900} ${size}px ${o.font || FONT}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  if (o.stroke !== false) { c.lineJoin = 'round'; c.lineWidth = o.lw || size * .16; c.strokeStyle = o.strokeColor || INK; c.strokeText(s, x, y); }
  c.fillStyle = o.color || '#fff'; c.fillText(s, x, y); c.restore();
}
function label(c, s, x, y, size, k, o = {}) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = clamp(k * 1.5);
  c.font = `900 ${size}px ${o.font || FONT}`; const w = c.measureText(s).width + size * 1.1, h = size * 1.55;
  rrect(c, -w / 2, -h / 2, w, h, h * .32); c.fillStyle = o.bg || '#fff'; c.fill();
  c.lineWidth = size * .12; c.strokeStyle = o.border || INK; c.stroke();
  if (o.tail) { c.beginPath(); c.moveTo(-size * .3, h / 2 - 2); c.lineTo(0, h / 2 + size * .45); c.lineTo(size * .3, h / 2 - 2); c.closePath(); c.fillStyle = o.bg || '#fff'; c.fill(); c.stroke(); }
  c.fillStyle = o.color || INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, size * .06);
  c.restore();
}
// 英文字卡（右上角，Comic Relief）
function enCard(c, s, k, x = W - 60, y = 150) {
  if (k <= 0) return;
  c.save(); c.font = `700 64px ${EN}`; const w = c.measureText(s).width + 80, h = 104;
  c.translate(x - w / 2, y); c.scale(k, k); c.globalAlpha = clamp(k * 1.5);
  rrect(c, -w / 2, -h / 2, w, h, 26); c.fillStyle = '#fffbe8'; c.fill(); c.lineWidth = 7; c.strokeStyle = '#2f6b3f'; c.stroke();
  c.fillStyle = '#2f6b3f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 4); c.restore();
}
function sparkle(c, x, y, s, t, a, d = .8, color = '#fff6b0') {
  const k = prog(t, a, a + d); if (k <= 0 || k >= 1) return;
  const g = Math.sin(k * Math.PI);
  c.save(); c.translate(x, y); c.rotate(k * 1.2); c.scale(g * s, g * s); c.fillStyle = color; c.strokeStyle = INK; c.lineWidth = .08;
  c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? .28 : 1, an = i * Math.PI / 4; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  c.closePath(); c.fill(); c.stroke(); c.restore();
}
function bigMark(c, ok, x, y, s, k) { // 綠色 ○／紅色 ×
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k * s, k * s); c.lineCap = 'round'; c.lineWidth = 26;
  c.strokeStyle = '#fff'; c.globalAlpha = .9;
  if (ok) { c.beginPath(); c.arc(0, 0, 100, 0, 7); c.lineWidth = 46; c.stroke(); c.lineWidth = 30; c.strokeStyle = '#1fa64a'; c.stroke(); }
  else { for (const sgn of [1, -1]) { c.beginPath(); c.moveTo(-95, -95 * sgn); c.lineTo(95, 95 * sgn); c.lineWidth = 50; c.strokeStyle = '#fff'; c.stroke(); c.lineWidth = 32; c.strokeStyle = '#e23b3b'; c.stroke(); } }
  c.restore();
}

// ---------- 角色（核准透明 PNG，畫面座標；腳底在 footY） ----------
// 只留約 3 px 呼吸，不上下彈（共用踩坑：說話時身體不彈）
function chr(c, id, x, footY, h, k = 1, t = 0, flip = false) {
  const im = IMG['c' + id]; if (!im || k <= 0) return;
  const w = im.width * h / im.height, br = Math.sin(t * 2.2 + x) * 1.5;
  c.save(); c.translate(x, footY); c.globalAlpha = clamp(k * 1.6);
  c.scale(flip ? -1 : 1, 1);
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, -4, w * .38, 14, 0, 0, 7); c.fill();
  const s = .7 + .3 * backOut(clamp(k));
  c.scale(s, s); c.drawImage(im, -w / 2, -h + br, w, h - br); c.restore();
}

// ---------- 字幕（往上 56 px：框底邊離畫面底 ≥ 84 px）、段落標籤 ----------
const SPEAKER = { '女': { color: '#5fb8ff', name: '女孩' }, '男': { color: '#ff9a3c', name: '男孩' } };
function unitAt(t) { return TL.units.find(u => t >= u.t0 - .05 && t < u.t1 + .25); }
function drawSubtitle(c, t) {
  if (window.NOSUB) return;
  const u = unitAt(t); if (!u) return;
  const sp = SPEAKER[u.who];
  c.save(); c.font = `800 50px ${EN}`;
  const chip = 150;
  let lines = [u.text];
  if (c.measureText(u.text).width > W - chip - 220) {
    const marks = [...u.text.matchAll(/[，、：]/g)].map(m => m.index);
    const mid = u.text.length / 2, cut = marks.reduce((a, b) => Math.abs(b - mid) < Math.abs(a - mid) ? b : a, marks[0] ?? Math.floor(mid));
    lines = [u.text.slice(0, cut + 1), u.text.slice(cut + 1)];
  }
  const tw = Math.max(...lines.map(s => c.measureText(s).width)), w = tw + chip + 70, x = (W - w) / 2, h = 84 + (lines.length - 1) * 62, y = 990 - h;
  c.globalAlpha = clamp(prog(t, u.t0 - .05, u.t0 + .1)) * clamp(1 - prog(t, u.t1 + .05, u.t1 + .2));
  rrect(c, x, y, w, h, 24); c.fillStyle = 'rgba(30,26,40,.8)'; c.fill();
  rrect(c, x + 14, y + h / 2 - 30, chip - 10, 60, 18); c.fillStyle = sp.color; c.fill();
  c.fillStyle = '#1e1a28'; c.font = `900 36px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sp.name, x + 14 + (chip - 10) / 2, y + h / 2 + 1);
  c.fillStyle = '#fff'; c.font = `800 50px ${EN}`; c.textAlign = 'left';
  lines.forEach((s, i) => c.fillText(s, x + chip + 30, y + 44 + i * 62));
  c.restore();
}
const TAGS = { '1': '二八水水公園', '2': '二八水水公園', '3': '二八水水公園', '4': '源泉車站', '5': '源泉車站',
  '6': '二水花旗木鐵道', '7': '二水花旗木鐵道', '8': '鐵道安全', '9': '一起念英文' };
function drawTag(c, T) {
  const ln = TL.lines.filter(l => T >= l.t0 - .3).pop(); if (!ln || ln.i < 3) return;
  const s = ln.i >= 27 && ln.i <= 28 ? '今天的回顧' : ln.i >= 30 ? '下次見！' : TAGS[ln.seg]; if (!s) return;
  c.save(); c.font = `900 40px ${FONT}`; const w = c.measureText(s).width + 60;
  rrect(c, 34, 30, w, 70, 20); c.fillStyle = 'rgba(255,255,255,.92)'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, 64, 66); c.restore();
}
// 英文字卡：該句旁白期間顯示（句子的 card 欄）
function drawLineCard(c, T) {
  const ln = TL.lines.find(l => T >= l.t0 && T < l.t1 + .6); if (!ln || !ln.card || ln.card.includes('words') || ln.card.includes('___')) return;
  const s = ln.card.replace('→', '→');
  enCard(c, s, pop(T - ln.t0, .3) * clamp(1 - prog(T, ln.t1 + .3, ln.t1 + .6)));
}

// ---------- 鏡頭表 ----------
const SHOTS = [];
function shot(t0, t1, draw) { SHOTS.push({ t0, t1, draw }); }
function imgShot(t0, t1, key, camA, camB, over, filter, ui) {
  shot(t0, t1, (c, lt, d, T) => { withCam(c, camAt(camA, camB, ease(prog(lt, 0, d))), () => { drawImg(c, key, filter); over && over(c, lt, d, T); }); ui && ui(c, lt, d, T); });
}
const L = i => TL.lines.find(l => l.i === i);
const LS = i => L(i).t0 - .15;                // 這句開始（略提早）
const LE = i => (L(i + 1) ? L(i + 1).t0 - .15 : TL.dur);
const XF = .45;
const OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H;

function draw(c, T) {
  const cur = SHOTS.findIndex(s => T >= s.t0 && T < s.t1);
  const i = cur < 0 ? SHOTS.length - 1 : cur, s = SHOTS[i];
  s.draw(c, T - s.t0, s.t1 - s.t0, T);
  if (i > 0 && T - s.t0 < XF && SHOTS[i - 1].t1 >= s.t0 - .01) {
    const p = SHOTS[i - 1]; const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.clearRect(0, 0, W, H);
    p.draw(o, T - p.t0, p.t1 - p.t0, T);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1 - ease((T - s.t0) / XF); c.drawImage(OFF, 0, 0); c.restore();
  }
  drawTag(c, T); drawLineCard(c, T); drawSubtitle(c, T);
}
