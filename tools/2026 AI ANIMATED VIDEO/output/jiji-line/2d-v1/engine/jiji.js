// jiji.js — 集集線五站 2D 動畫：共用工具＋全片鏡頭表＋draw(t)
// 畫面以「全片秒」t 決定，同一個 t 永遠畫出同一格（可平行渲染）。
// 圖片座標一律用原圖像素（1680×944），由鏡頭換算到 1920×1080。
const W = 1920, H = 1080, IW = 1680, IH = 944, BASE = W / IW;
const ART = '../../art/scenes-v1/';
const IMG = {};
const IMG_FILES = {
  s01: 'S01-03_車窗揮手.png', s04: 'S04-07_月台小火車.png', map: 'S05-10-37_路線底圖.png',
  s06: 'S06_百年前運建材.png', s08: 'S08_二水車站-整修後.png', s11: 'S11_蒸汽火車加水維修.png',
  s12: 'S12_CT278蒸汽女王-公園.png',
  s13: 'S13-14_源泉車站.png', s15: 'S15_小哲疑問.png', s16: 'S16_八堡圳源頭取水口.png', s17: 'S17_古早開水圳.png',
  s19: 'S19_水圳旁拍手.png', s20: 'S20-22_集集車站正面.png', s21: 'S21_檜木與木紋.png', s23: 'S23_集集車站修復.png',
  s24a: 'S24a_集集老街.png', s24b: 'S24b_綠色隧道騎車.png', s25: 'S25_水里車站.png', s26: 'S26_水裡坑熱鬧山城.png',
  s27: 'S27_登山客往玉山.png', s28: 'S28_車窗看玉山.png', s29: 'S29_發電廠.png', s30: 'S30_吃枝仔冰.png',
  s31: 'S31_車埕車站.png', s32: 'S32_軌道終點車擋.png', s33: 'S33_埕是空地.png', s34: 'S34_木材集散地.png',
  s35a: 'S35a_貯木池以前.png', s35b: 'S35b_貯木池現在生態池.png', s36: 'S36_木業展示館故事書.png',
  s38: 'S38_全線通車剪綵.png', s39: 'S39_全家搭火車.png', s40: 'S40_夕陽揮手再見.png',
};
function loadImages() {
  return Promise.all(Object.entries(IMG_FILES).map(([k, f]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => { console.error('missing', f); res(); };
    im.src = ART + encodeURIComponent(f);
  })));
}
const FONT = '"Microsoft JhengHei","Noto Sans TC",sans-serif';
const INK = '#3b2a2e';

// ---------- 補間 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const backOut = k => { if (k <= 0) return 0; if (k >= 1) return 1; const s = 1.7; k -= 1; return k * k * ((s + 1) * k + s) + 1; };
// 彈出：t<a 時回傳 0（不畫），之後 0→1 帶回彈
const pop = (t, a, d = .35) => t < a ? 0 : backOut(prog(t, a, a + d));

// ---------- 鏡頭：在原圖座標上看 (x,y)，放大 z（1＝整張圖填滿畫面） ----------
function camClamp(x, y, z) {
  const hw = IW / 2 / z, hh = IH / 2 / z;
  return [clamp(x, hw, IW - hw), clamp(y, hh, IH - hh), z];
}
function camAt(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
function withCam(c, cam, fn) {
  const [x, y, z] = camClamp(...cam);
  c.save(); c.translate(W / 2, H / 2); c.scale(BASE * z, BASE * z); c.translate(-x, -y); fn(); c.restore();
}
function drawImg(c, key, filter) {
  const im = IMG[key]; if (!im) { c.fillStyle = '#888'; c.fillRect(0, 0, IW, IH); return; }
  if (filter) c.filter = filter;
  c.drawImage(im, 0, 0, IW, IH); c.filter = 'none';
}

// ---------- 文字與圖卡 ----------
function rrect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function text(c, s, x, y, size, o = {}) {
  c.save(); c.font = `${o.weight || 900} ${size}px ${FONT}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  if (o.stroke !== false) { c.lineJoin = 'round'; c.lineWidth = o.lw || size * .16; c.strokeStyle = o.strokeColor || INK; c.strokeText(s, x, y); }
  c.fillStyle = o.color || '#fff'; c.fillText(s, x, y); c.restore();
}
// 圓角標籤（名牌、字卡）。k 為彈出係數 0..1
function label(c, s, x, y, size, k, o = {}) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = clamp(k * 1.5);
  c.font = `900 ${size}px ${FONT}`; const w = c.measureText(s).width + size * 1.1, h = size * 1.55;
  rrect(c, -w / 2, -h / 2, w, h, h * .32); c.fillStyle = o.bg || '#fff'; c.fill();
  c.lineWidth = size * .12; c.strokeStyle = o.border || INK; c.stroke();
  if (o.tail) { c.beginPath(); c.moveTo(-size * .3, h / 2 - 2); c.lineTo(0, h / 2 + size * .45); c.lineTo(size * .3, h / 2 - 2); c.closePath(); c.fillStyle = o.bg || '#fff'; c.fill(); c.stroke(); }
  c.fillStyle = o.color || INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, size * .04);
  c.restore();
}
// 台鐵風格站名牌（白底、黑字、下方藍條）
function stationSign(c, name, x, y, k, w = 520) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = clamp(k * 1.4);
  const h = w * .42;
  c.fillStyle = '#5b5b5b'; c.fillRect(-w * .36, h / 2, 14, h * .9); c.fillRect(w * .36 - 14, h / 2, 14, h * .9);
  rrect(c, -w / 2, -h / 2, w, h, 16); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#1f5fa8'; c.fillRect(-w / 2 + 8, h / 2 - h * .26, w - 16, h * .26 - 8);
  c.font = `900 ${h * .5}px ${FONT}`; c.fillStyle = '#222'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(name.split('').join(' '), 0, -h * .1);
  c.font = `800 ${h * .14}px ${FONT}`; c.fillStyle = '#fff'; c.fillText('集集線', 0, h / 2 - h * .14);
  c.restore();
}
// 叮：同心圓波紋
function ripple(c, x, y, t, a, r = 120, color = '#ffd84a') {
  const k = prog(t, a, a + .7); if (k <= 0 || k >= 1) return;
  c.save(); c.strokeStyle = color; c.globalAlpha = 1 - k;
  for (let i = 0; i < 3; i++) { c.lineWidth = 10 - i * 3; c.beginPath(); c.arc(x, y, r * (k + i * .25), 0, Math.PI * 2); c.stroke(); }
  c.restore();
}
function sparkle(c, x, y, s, t, a, d = .8, color = '#fff6b0') {
  const k = prog(t, a, a + d); if (k <= 0 || k >= 1) return;
  const g = Math.sin(k * Math.PI);
  c.save(); c.translate(x, y); c.rotate(k * 1.2); c.scale(g * s, g * s); c.fillStyle = color; c.strokeStyle = INK; c.lineWidth = .08;
  c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? .28 : 1, an = i * Math.PI / 4; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  c.closePath(); c.fill(); c.stroke(); c.restore();
}
function crown(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.beginPath();
  c.moveTo(-1, .5); c.lineTo(-1, -.4); c.lineTo(-.5, .1); c.lineTo(0, -.7); c.lineTo(.5, .1); c.lineTo(1, -.4); c.lineTo(1, .5); c.closePath();
  c.fillStyle = '#ffcf3a'; c.fill(); c.lineWidth = .1; c.strokeStyle = INK; c.stroke();
  for (const px of [-1, 0, 1]) { c.beginPath(); c.arc(px, px ? -.4 : -.7, .13, 0, 7); c.fillStyle = '#e8473f'; c.fill(); c.stroke(); }
  c.restore();
}
// 揮手動作線 )))
function waveLines(c, x, y, t, a, b, s = 1) {
  if (t < a || t > b) return;
  const ph = (t * 4) % 1;
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = '#fff'; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) { c.globalAlpha = clamp(1 - Math.abs(ph - i / 3) * 2.2); c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 40 + i * 22, -0.9, 0.2); c.stroke(); }
  c.restore();
}

// ---------- 路線地圖（只畫五站） ----------
const ROUTE = [[330, 350], [385, 420], [470, 488], [600, 540], [750, 558], [850, 552], [960, 534], [1060, 500], [1160, 472], [1230, 456], [1285, 420], [1325, 365], [1390, 298], [1440, 262]];
const STATIONS = [['二水', 0], ['源泉', 2], ['集集', 5], ['水里', 9], ['車埕', 13]]; // [名稱, ROUTE 索引]
const routeLen = (() => { let L = [0]; for (let i = 1; i < ROUTE.length; i++) L.push(L[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1])); return L; })();
function routePoint(d) { // d = 0..總長
  for (let i = 1; i < ROUTE.length; i++) if (d <= routeLen[i]) {
    const k = (d - routeLen[i - 1]) / (routeLen[i] - routeLen[i - 1]);
    return [lerp(ROUTE[i - 1][0], ROUTE[i][0], k), lerp(ROUTE[i - 1][1], ROUTE[i][1], k), Math.atan2(ROUTE[i][1] - ROUTE[i - 1][1], ROUTE[i][0] - ROUTE[i - 1][0])];
  }
  const n = ROUTE.length - 1; return [...ROUTE[n], 0];
}
function drawRoute(c, upto, o = {}) { // upto: 0..1 畫到哪
  const L = routeLen[routeLen.length - 1] * clamp(upto); if (L <= 0) return;
  const path = () => { c.beginPath(); c.moveTo(...ROUTE[0]); for (let i = 1; i < ROUTE.length; i++) { if (routeLen[i] <= L) c.lineTo(...ROUTE[i]); else { const p = routePoint(L); c.lineTo(p[0], p[1]); break; } } };
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  path(); c.lineWidth = 22; c.strokeStyle = INK; c.stroke();
  path(); c.lineWidth = 14; c.strokeStyle = '#d8343a'; c.stroke();
  path(); c.lineWidth = 14; c.strokeStyle = '#fff'; c.setLineDash([18, 18]); c.stroke(); c.setLineDash([]);
  c.restore();
}
function stationFrac(i) { return routeLen[STATIONS[i][1]] / routeLen[routeLen.length - 1]; }
function drawStations(c, upto, active = -1, t = 0, labels = true) {
  STATIONS.forEach(([name, idx], i) => {
    if (stationFrac(i) > upto + 1e-6) return;
    const [x, y] = ROUTE[idx]; const on = i === active;
    const r = on ? 22 + 3 * Math.sin(t * 8) : 17;
    c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = on ? '#ffd84a' : '#fff'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.restore();
    if (labels) { const up = i === 1 || i === 3; label(c, name, x + (i === 0 ? -105 : 0), y + (i === 0 ? 0 : up ? -62 : 62), 34, 1, { bg: on ? '#ffd84a' : '#fff' }); }
  });
}
// 小 DR1000 圖示（黃色車頭、橘色 V）
function trainIcon(c, x, y, ang, s = 1) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  rrect(c, -46, -20, 92, 40, 10); c.fillStyle = '#c9ccd1'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#ef6b2a'; c.fillRect(-42, 4, 72, 7);
  rrect(c, 26, -20, 22, 40, 8); c.fillStyle = '#ffc928'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(28, -2); c.lineTo(37, 10); c.lineTo(46, -2); c.strokeStyle = '#ef6b2a'; c.lineWidth = 5; c.stroke();
  c.restore();
}
function mapLabels(c, k = 1) {
  if (k <= 0) return; c.save(); c.globalAlpha = k;
  text(c, '濁水溪', 250, 470, 40, { color: '#1d6fb8', strokeColor: '#fff', lw: 9 });
  text(c, '彰化縣', 210, 720, 46, { color: '#5b7d2a', strokeColor: '#fff', lw: 9 });
  text(c, '南投縣', 1250, 680, 46, { color: '#2f6b3a', strokeColor: '#fff', lw: 9 });
  c.restore();
}
// 站名牌轉場：地圖上小火車從上一站開到這一站，再彈出站名牌
function stationCard(c, lt, d, si) {
  const from = si === 0 ? 0 : stationFrac(si - 1), to = stationFrac(si);
  const k = ease(prog(lt, .2, 1.6));
  const [px, py] = routePoint(routeLen[routeLen.length - 1] * lerp(from, to, k));
  const cam = [lerp(840, px, .35), lerp(472, py, .35), 1.25];
  withCam(c, cam, () => {
    drawImg(c, 'map'); mapLabels(c);
    drawRoute(c, 1); drawStations(c, 1, k >= 1 ? si : -1, lt);
    const p = routePoint(routeLen[routeLen.length - 1] * lerp(from, to, k)); trainIcon(c, p[0], p[1] - 4, p[2], 1.05);
  });
  ripple(c, W / 2, 330, lt, 1.6, 200);
  stationSign(c, STATIONS[si][0], W / 2, 330, pop(lt, 1.6, .4), 560);
}

// ---------- 字幕、段落標籤 ----------
const SPEAKER = { F: { color: '#5fb8ff', name: '小晨' }, M: { color: '#ff9a3c', name: '小哲' } };
function unitAt(t) { return TL.units.find(u => t >= u.t0 - .05 && t < u.t1 + .25); }
function drawSubtitle(c, t) {
  if (window.NOSUB) return;
  const u = unitAt(t); if (!u) return;
  const sp = SPEAKER[u.who];
  c.save(); c.font = `800 52px ${FONT}`;
  const tw = c.measureText(u.text).width, chip = 150, w = tw + chip + 70, x = (W - w) / 2, y = 945, h = 86;
  c.globalAlpha = clamp(prog(t, u.t0 - .05, u.t0 + .1)) * clamp(1 - prog(t, u.t1 + .1, u.t1 + .25));
  rrect(c, x, y, w, h, 24); c.fillStyle = 'rgba(30,22,26,.78)'; c.fill();
  rrect(c, x + 14, y + 13, chip - 10, h - 26, 18); c.fillStyle = sp.color; c.fill();
  c.fillStyle = '#1e161a'; c.font = `900 38px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sp.name, x + 14 + (chip - 10) / 2, y + h / 2 + 1);
  c.fillStyle = '#fff'; c.font = `800 52px ${FONT}`; c.textAlign = 'left'; c.fillText(u.text, x + chip + 30, y + h / 2 + 2);
  c.restore();
}
function sectionAt(t) { return TL.sections.find(s => t >= s.t0 && t < s.t1) || TL.sections[TL.sections.length - 1]; }
function drawSectionTag(c, t) {
  const s = sectionAt(t); const k = prog(t, s.t0 + .3, s.t0 + .8); if (k <= 0) return;
  c.save(); c.globalAlpha = k; c.font = `900 40px ${FONT}`; const w = c.measureText(s.label).width + 60;
  rrect(c, 34, 30, w, 70, 20); c.fillStyle = 'rgba(255,255,255,.92)'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s.label, 64, 66); c.restore();
}

// ---------- 鏡頭表 ----------
const U = n => TL.units[n - 1];
const SEC = k => TL.sections.find(s => s.key === k);
const SHOTS = [];
function shot(t0, t1, draw) { SHOTS.push({ t0, t1, draw }); }
// 簡便：圖片＋鏡頭移動＋疊加
function imgShot(t0, t1, key, camA, camB, over, filter, ui) {   // over：跟著圖片移動；ui：固定在畫面上
  shot(t0, t1, (c, lt, d, T) => { withCam(c, camAt(camA, camB, ease(prog(lt, 0, d))), () => { drawImg(c, key, filter); over && over(c, lt, d, T); }); ui && ui(c, lt, d, T); });
}
const XF = .45; // 鏡頭交叉淡化秒數
const OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H;
function buildShots() {
  const o = SEC('open'), e = SEC('ershui');
  // 分鏡 1–3：車窗揮手；名牌依說話者彈出
  imgShot(0, U(4).t0, 's01', [1000, 470, 1.18], [1060, 450, 1.3], (c, lt, d, T) => {
    waveLines(c, 690, 430, T, U(1).t0, U(2).t1, 1.1);
    label(c, '小晨', 885, 255, 46, pop(T, U(2).t0), { bg: SPEAKER.F.color, tail: true });
    label(c, '小哲', 1270, 200, 46, pop(T, U(3).t0), { bg: SPEAKER.M.color, tail: true });
    sparkle(c, 1130, 455, 45, T, U(3).t0 + .1, .9);
  });
  // 分鏡 4：拉遠看到小火車，車頭牌子寫「集集線」
  imgShot(U(4).t0, U(5).t0, 's04', [700, 460, 1.7], [840, 472, 1.0], (c, lt) => {
    c.save(); c.fillStyle = '#fff'; c.fillRect(519, 304, 84, 28);
    c.font = `900 22px ${FONT}`; c.fillStyle = '#c0262d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('集集線', 561, 319); c.restore();
  });
  // 分鏡 5：路線地圖從二水沿濁水溪畫進山裡（只畫五站）
  shot(U(5).t0, U(6).t0, (c, lt, d) => withCam(c, camAt([700, 470, 1.25], [840, 472, 1.0], ease(prog(lt, 0, d))), () => {
    drawImg(c, 'map'); mapLabels(c, prog(lt, .2, .8));
    const up = ease(prog(lt, .8, d - .6)); drawRoute(c, up); drawStations(c, up, 0, lt);
    label(c, '起點', 330, 270, 36, pop(lt, .6), { bg: '#ffd84a', tail: true });
  }));
  // 分鏡 6：一百多年前運建材
  imgShot(U(6).t0, U(7).t0, 's06', [700, 520, 1.25], [1100, 380, 1.35], null, 'sepia(.25)', (c, lt) => {
    label(c, '一百多年前', 330, 190, 60, pop(lt, .3), { bg: '#f3e2b8' });
    label(c, '日月潭發電廠', 1580, 190, 46, pop(lt, 1.6), { bg: '#fff' });
  });
  // 分鏡 7：五個站名牌依序彈出，小火車鳴笛出發
  imgShot(U(7).t0, e.t0, 's04', [840, 472, 1.0], [700, 520, 1.45], (c, lt, d, T) => {
    c.save(); c.fillStyle = '#fff'; c.fillRect(519, 304, 84, 28); c.font = `900 22px ${FONT}`; c.fillStyle = '#c0262d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('集集線', 561, 319); c.restore();
    if (lt > 1.9) { const ph = (lt * 3) % 1; c.save(); c.strokeStyle = '#fff'; c.lineWidth = 8; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { c.globalAlpha = clamp(1 - Math.abs(ph - i / 3) * 2); c.beginPath(); c.arc(700, 250, 60 + i * 30, -2.4, -.7); c.stroke(); } c.restore();
    }
  }, null, (c, lt) => { STATIONS.forEach(([n], i) => label(c, n, 560 + i * 200, 190, 52, pop(lt, .15 + i * .32), { bg: '#fff' }));
    label(c, '叭叭！', 1500, 360, 52, pop(lt, 1.9), { bg: '#ffd84a' }); });
  // 第1站 站名牌轉場
  shot(e.t0, U(8).t0 + .9, (c, lt, d) => stationCard(c, lt, d, 0));
  // 分鏡 8：二水車站（整修後）外觀，牆上站名由程式寫上
  imgShot(U(8).t0 + .9, U(9).t0, 's08', [900, 470, 1.15], [960, 480, 1.3], (c) => {
    c.save(); c.fillStyle = '#f6efe0'; c.fillRect(1362, 444, 136, 40);
    c.font = `900 30px ${FONT}`; c.fillStyle = '#2b2b2b'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('二水車站', 1430, 465); c.restore();
  });
  // 分鏡 9：俯視鐵軌示意：縱貫線直行、集集線從這裡分出去
  shot(U(9).t0, U(10).t0, (c, lt, d) => junction(c, lt, d));
  // 分鏡 10：「二八水」大字＋濁水溪、八堡圳兩條水流
  shot(U(10).t0, U(11).t0, (c, lt, d) => withCam(c, camAt([520, 520, 1.45], [470, 520, 1.6], ease(prog(lt, 0, d))), () => {
    drawImg(c, 'map'); erbaFlows(c, lt);
  }, () => {}));
  // 分鏡 11：以前蒸汽火車加水、維修
  imgShot(U(11).t0, U(12).t0, 's11', [840, 472, 1.05], [760, 430, 1.3], (c, lt) => {
    label(c, '加水', 560, 160, 46, pop(lt, .4), { bg: '#bfe6ff', tail: true });
    label(c, '維修', 1250, 560, 46, pop(lt, 1.6), { bg: '#ffe0b3', tail: true });
  }, 'sepia(.15)');
  // 分鏡 12：CT278「蒸汽女王」
  imgShot(U(12).t0, e.t1, 's12', [840, 472, 1.0], [980, 380, 1.25], (c, lt, d, T) => {
    sparkle(c, 330, 460, 70, lt, .05, .5);
    c.save(); c.fillStyle = '#b5302c'; c.fillRect(1029, 224, 92, 42);
    c.font = `900 30px ${FONT}`; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CT278', 1075, 246); c.restore();
    const k = pop(lt, .9, .45);
    if (k > 0) { crown(c, 1440, 120, 46 * k); label(c, '蒸汽女王', 1440, 215, 50, k, { bg: '#ffe36e' });
      c.save(); c.globalAlpha = k; c.strokeStyle = '#fff'; c.lineWidth = 6; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(1360, 235); c.lineTo(1135, 250); c.stroke(); c.restore(); }
  });
}
// 分鏡 9 的鐵軌示意圖
function rails(c, pts, w = 26) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  const path = () => { c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach(p => c.lineTo(...p)); };
  path(); c.lineWidth = w + 26; c.strokeStyle = '#b9a98c'; c.stroke();
  path(); c.lineWidth = w + 10; c.strokeStyle = '#7a5b3e'; c.setLineDash([8, 22]); c.stroke(); c.setLineDash([]);
  path(); c.lineWidth = w; c.strokeStyle = '#6b6f75'; c.stroke(); path(); c.lineWidth = w - 12; c.strokeStyle = '#b9a98c'; c.stroke();
  c.restore();
}
function polyAt(pts, k) {
  let L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = L[L.length - 1] * clamp(k);
  for (let i = 1; i < pts.length; i++) if (d <= L[i]) { const q = (d - L[i - 1]) / (L[i] - L[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
  return [...pts[pts.length - 1], 0];
}
function junction(c, lt, d) {
  c.fillStyle = '#e9f2d8'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#d4e6b5'; for (let i = 0; i < 9; i++) c.fillRect(i * 230 - 40, 640, 180, 300);
  const main = [[-100, 420], [2020, 420]], branch = [[700, 420], [900, 440], [1100, 520], [1350, 690], [2020, 900]];
  rails(c, main); rails(c, branch);
  // 二水車站小房子
  c.save(); rrect(c, 560, 200, 260, 110, 10); c.fillStyle = '#f6efe0'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#ffc928'; c.fillRect(560, 200, 260, 22); c.strokeRect(560, 200, 260, 22); c.restore();
  text(c, '二水車站', 690, 265, 40, { color: INK, stroke: false });
  // 縱貫線長列車（左→右）
  const mx = lerp(-700, 2100, prog(lt, 0, d));
  c.save(); for (let i = 0; i < 6; i++) { rrect(c, mx + i * 125, 395, 118, 50, 12); c.fillStyle = '#e8eaed'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#2f62b8'; c.fillRect(mx + i * 125 + 6, 418, 106, 8); } c.restore();
  // 集集線小火車從分岔處轉出去
  const k = ease(prog(lt, 1.2, d - .3)); const p = polyAt(branch, k); trainIcon(c, p[0], p[1], p[2], 1.6);
  label(c, '縱貫線', 300, 340, 46, pop(lt, .3), { bg: '#dfe9ff' });
  label(c, '集集線', 1380, 560, 46, pop(lt, 1.0), { bg: '#ffe7a8' });
  label(c, '起點', 760, 520, 42, pop(lt, 1.6), { bg: '#ffd84a', tail: true });
  const kk = pop(lt, 2.6); if (kk > 0) { sparkle(c, 700, 420, 90, lt, 2.6, 1.4); label(c, '交會', 960, 330, 50, kk, { bg: '#ff9a3c', tail: true }); }
}
// 分鏡 10：二八水
const RIVER = [[1420, 300], [1375, 365], [1350, 435], [1290, 490], [1150, 535], [1000, 578], [850, 614], [700, 612], [600, 594], [500, 560], [400, 532], [300, 494], [200, 474], [100, 462], [0, 470]];
const CANAL = [[330, 505], [290, 560], [220, 620], [120, 680], [-20, 740]];
function flow(c, pts, t, color, w) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach(p => c.lineTo(...p));
  c.lineWidth = w + 8; c.strokeStyle = '#fff'; c.stroke(); c.lineWidth = w; c.strokeStyle = color; c.stroke();
  c.setLineDash([22, 26]); c.lineDashOffset = -t * 90; c.lineWidth = w * .4; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke(); c.restore();
}
function erbaFlows(c, lt) {
  if (lt > .2) flow(c, RIVER.slice(0, Math.max(2, Math.ceil(RIVER.length * clamp((lt - .2) / 1.2)))), lt, '#2a86d6', 18);
  if (lt > 1.6) flow(c, CANAL.slice(0, Math.max(2, Math.ceil(CANAL.length * clamp((lt - 1.6) / 1.2)))), lt, '#36c2c9', 14);
  label(c, '濁水溪', 620, 660, 34, pop(lt, .9), { bg: '#d7ecff' });
  label(c, '八堡圳', 150, 560, 34, pop(lt, 2.2), { bg: '#d3f5f2' });
  const k = pop(lt, 2.9, .45); if (k > 0) { c.save(); c.translate(420, 300); c.scale(k, k); text(c, '二八水', 0, 0, 120, { color: '#ffe36e', lw: 22 }); c.restore(); }
}

// ---------- 主畫面 ----------
function draw(c, T) {
  const cur = SHOTS.findIndex(s => T >= s.t0 && T < s.t1);
  const i = cur < 0 ? SHOTS.length - 1 : cur, s = SHOTS[i];
  s.draw(c, T - s.t0, s.t1 - s.t0, T);
  // 與上一個鏡頭交叉淡化（上一鏡頭先畫在離屏畫布，再整張半透明疊上）
  if (i > 0 && T - s.t0 < XF) {
    const p = SHOTS[i - 1]; const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.clearRect(0, 0, W, H);
    p.draw(o, T - p.t0, p.t1 - p.t0, T);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1 - ease((T - s.t0) / XF); c.drawImage(OFF, 0, 0); c.restore();
  }
  drawSectionTag(c, T);
  drawSubtitle(c, T);
}
