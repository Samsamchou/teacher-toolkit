// shots2.js — 第2站源泉 到 結尾 的鏡頭（分鏡 13–40）。座標：圖片內用原圖像素，ui 用畫面像素。
function boardText(c, s, x, y, size, color = '#222') {
  c.save(); c.font = `900 ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y); c.restore();
}
function vText(c, s, x, y, size, color = '#222') { // 直排
  const ch = s.split(''); const y0 = y - (ch.length - 1) * size * .55;
  ch.forEach((t, i) => boardText(c, t, x, y0 + i * size * 1.1, size, color));
}
function dashLine(c, x0, y0, x1, y1, k = 1, color = '#fff') {
  if (k <= 0) return; c.save(); c.globalAlpha = k; c.strokeStyle = color; c.lineWidth = 7; c.setLineDash([14, 10]); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); c.stroke(); c.restore();
}
function arrowHead(c, x, y, ang, k = 1, color = '#ffd84a') {
  if (k <= 0) return; c.save(); c.translate(x, y); c.rotate(ang); c.scale(k, k); c.beginPath(); c.moveTo(0, 0); c.lineTo(-34, -20); c.lineTo(-34, 20); c.closePath();
  c.fillStyle = color; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.restore();
}
function bigArrow(c, x0, y0, x1, y1, k) {
  if (k <= 0) return; const x = lerp(x0, x1, k), y = lerp(y0, y1, k);
  c.save(); c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 22; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x, y); c.stroke();
  c.strokeStyle = '#ffd84a'; c.lineWidth = 12; c.stroke(); c.restore(); arrowHead(c, x, y, Math.atan2(y1 - y0, x1 - x0), 1.2);
}
function calendarCard(c, x, y, top, main, k, cross = 0) {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k);
  rrect(c, -150, -110, 300, 220, 22); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#e8473f'; rrect(c, -150, -110, 300, 66, 22); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.font = `900 40px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(top, 0, -76);
  c.fillStyle = INK; c.font = `900 56px ${FONT}`; c.fillText(main, 0, 30);
  if (cross > 0) { c.strokeStyle = '#e8473f'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(-110, -40); c.lineTo(lerp(-110, 110, cross), lerp(-40, 90, cross)); c.stroke();
    if (cross > .5) { const q = (cross - .5) * 2; c.beginPath(); c.moveTo(110, -40); c.lineTo(lerp(110, -110, q), lerp(-40, 90, q)); c.stroke(); } }
  c.restore();
}
function cloud(c, x, y, s, a = 1) {
  if (a <= 0) return; c.save(); c.globalAlpha = a; c.fillStyle = '#fff'; c.translate(x, y); c.scale(s, s);
  for (const [dx, dy, r] of [[-60, 10, 50], [0, -15, 65], [60, 10, 50], [110, 20, 35], [-110, 20, 35]]) { c.beginPath(); c.arc(dx, dy, r, 0, 7); c.fill(); }
  c.restore();
}
function drop(c, x, y, s, a) { if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, -1.4); c.quadraticCurveTo(1, 0, 0, 1); c.quadraticCurveTo(-1, 0, 0, -1.4); c.fillStyle = '#5ec8ff'; c.fill(); c.lineWidth = .12; c.strokeStyle = INK; c.stroke(); c.restore(); }
// 小地圖（右上角），顯示五站與目前這一站
function miniMap(c, x, y, w, k, active) {
  if (k <= 0) return; const h = w * IH / IW;
  c.save(); c.globalAlpha = clamp(k * 1.5); c.translate(x, y); c.scale(k, k);
  rrect(c, -w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 20); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
  c.save(); rrect(c, -w / 2, -h / 2, w, h, 12); c.clip(); c.translate(-w / 2, -h / 2); c.scale(w / IW, w / IW);
  drawImg(c, 'map'); drawRoute(c, 1); drawStations(c, 1, active, 0, false); c.restore();
  c.restore();
}

function buildShots2() {
  const y = SEC('yuanquan'), j = SEC('jiji'), sh = SEC('shuili'), ch = SEC('checheng'), en = SEC('ending');
  // ===== 第2站 源泉 =====
  shot(y.t0, U(13).t0 + .9, (c, lt, d) => stationCard(c, lt, d, 1));
  // 分鏡 13：源泉小站，站牌寫「源泉」
  imgShot(U(13).t0 + .9, U(14).t0, 's13', [840, 472, 1.0], [900, 460, 1.15], c => { c.save(); c.fillStyle = '#fbfbf8'; c.fillRect(877, 409, 74, 87); c.restore(); vText(c, '源泉', 914, 452, 34); });
  // 分鏡 14：站牌翻轉成舊名「鼻仔頭」再翻回來
  imgShot(U(14).t0, U(15).t0, 's13', [900, 455, 2.2], [910, 455, 2.4], (c, lt, d) => {
    const flip = t => Math.cos(Math.PI * clamp(t)); // 1 → -1
    const a = prog(lt, .15, .55), b = prog(lt, d - .55, d - .15);
    const sx = b > 0 ? -flip(b) : flip(a); const name = (a >= .5 && b < .5) ? '鼻仔頭' : '源泉';
    c.save(); c.translate(914, 452); c.scale(Math.max(.02, Math.abs(sx)), 1); c.translate(-914, -452);
    c.fillStyle = name === '源泉' ? '#fbfbf8' : '#efe3c4'; c.fillRect(877, 409, 74, 87); c.strokeStyle = '#aaa'; c.lineWidth = 2; c.strokeRect(877, 409, 74, 87);
    if (name === '源泉') vText(c, '源泉', 914, 452, 34); else vText(c, '鼻仔頭', 914, 452, 26, '#6b3b1f');
    c.restore();
  }, null, (c, lt) => label(c, '舊名', 1300, 250, 54, pop(lt, .6), { bg: '#efe3c4' }));
  // 分鏡 15：小哲疑問，大問號
  imgShot(U(15).t0, U(16).t0, 's15', [840, 472, 1.0], [700, 420, 1.15], null, null, (c, lt) => {
    const k = pop(lt, .2, .45); if (k > 0) { c.save(); c.translate(1250, 330); c.rotate(Math.sin(lt * 6) * .12); c.scale(k, k); text(c, '？', 0, 0, 260, { color: '#ffd84a', lw: 30 }); c.restore(); }
  });
  // 分鏡 16：八堡圳源頭（取水口）
  imgShot(U(16).t0, U(17).t0, 's16', [840, 472, 1.0], [960, 560, 1.2], (c, lt) => {
    bigArrow(c, 520, 330, 860, 600, ease(prog(lt, .3, .9)));
    label(c, '八堡圳源頭', 470, 270, 46, pop(lt, .2), { bg: '#d3f5f2' });
  });
  // 分鏡 17：古早開水圳＋徽章
  imgShot(U(17).t0, U(18).t0, 's17', [840, 472, 1.0], [760, 430, 1.2], null, 'sepia(.1)', (c, lt) => {
    const k = pop(lt, .4, .5); if (k > 0) { c.save(); c.translate(W / 2, 190); c.scale(k, k); label(c, '台灣最古老的水圳之一', 0, 0, 58, 1, { bg: '#ffe36e' }); c.restore(); sparkle(c, W / 2 + 380, 150, 60, lt, .7, 1); sparkle(c, W / 2 - 380, 230, 50, lt, .9, 1); }
  });
  // 分鏡 18：濁水溪 → 八堡圳 → 彰化平原，稻田由黃變綠
  shot(U(18).t0, U(19).t0, (c, lt, d) => withCam(c, camAt([520, 560, 1.35], [420, 600, 1.5], ease(prog(lt, 0, d))), () => {
    drawImg(c, 'map', 'saturate(.35) sepia(.55) brightness(1.05)');
    const g = ease(prog(lt, 2.4, d - .4));
    if (g > 0) { c.save(); c.globalAlpha = g; c.beginPath(); c.arc(150, 760, 120 + 520 * g, 0, 7); c.clip(); drawImg(c, 'map', 'saturate(1.35)'); c.restore(); }
    if (lt > .1) flow(c, RIVER.slice(0, Math.max(2, Math.ceil(RIVER.length * clamp((lt - .1) / 1.2)))), lt, '#2a86d6', 18);
    if (lt > 1.2) flow(c, CANAL.slice(0, Math.max(2, Math.ceil(CANAL.length * clamp((lt - 1.2) / 1.0)))), lt, '#36c2c9', 14);
    label(c, '濁水溪', 760, 560, 34, pop(lt, .5), { bg: '#d7ecff' });
    label(c, '八堡圳', 360, 600, 34, pop(lt, 1.4), { bg: '#d3f5f2' });
    label(c, '彰化平原・稻田', 230, 760, 38, pop(lt, 2.6), { bg: '#dff5c8' });
  }));
  // 分鏡 19：「源」「泉」大字，中間湧出泉水；兩人拍手
  imgShot(U(19).t0, y.t1, 's19', [840, 472, 1.0], [820, 450, 1.08], null, null, (c, lt) => {
    const k1 = pop(lt, .1), k2 = pop(lt, .5);
    if (k1 > 0) { c.save(); c.translate(1150, 230); c.scale(k1, k1); text(c, '源', 0, 0, 170, { color: '#5ec8ff', lw: 26 }); c.restore(); }
    if (k2 > 0) { c.save(); c.translate(1550, 230); c.scale(k2, k2); text(c, '泉', 0, 0, 170, { color: '#5ec8ff', lw: 26 }); c.restore(); }
    if (lt > .8) for (let i = 0; i < 7; i++) { const ph = ((lt - .8) * 1.3 + i / 7) % 1; drop(c, 1350 + Math.sin(i * 2.1) * 60 * ph, 300 - Math.sin(ph * Math.PI) * 170, 16, 1 - ph * .6); }
    sparkle(c, 640, 330, 70, lt, .9, .5); sparkle(c, 700, 300, 50, lt, 1.4, .5);
  });

  // ===== 第3站 集集 =====
  shot(j.t0, U(20).t0 + .9, (c, lt, d) => stationCard(c, lt, d, 2));
  const jijiBoards = c => { c.save(); c.fillStyle = '#fbfbf6'; c.fillRect(732, 430, 220, 60); c.restore();
    ['集', '集', '車', '站'].forEach((ch, i) => { c.save(); c.fillStyle = '#fff'; c.fillRect(736 + i * 54, 433, 50, 54); c.strokeStyle = '#8a7a66'; c.lineWidth = 3; c.strokeRect(736 + i * 54, 433, 50, 54); c.restore(); boardText(c, ch, 761 + i * 54, 461, 36); }); };
  // 分鏡 20：集集車站正面
  imgShot(U(20).t0 + .9, U(21).t0, 's20', [840, 472, 1.0], [842, 470, 1.18], jijiBoards);
  // 分鏡 21：檜木木紋＋「快 100 歲」
  imgShot(U(21).t0, U(22).t0, 's21', [700, 472, 1.1], [980, 472, 1.1], null, null, (c, lt) => {
    label(c, '檜木', 1350, 260, 54, pop(lt, .6), { bg: '#dff5c8', tail: true });
    label(c, '快 100 歲', 1500, 780, 64, pop(lt, 2.0), { bg: '#ffe36e' });
  });
  // 分鏡 22：日曆 1999.9.21，車站搖晃歪斜（卡通化）
  shot(U(22).t0, U(23).t0, (c, lt, d) => {
    const q = prog(lt, 1.2, 2.6), tilt = ease(prog(lt, 2.2, 3.6));
    const sx = q > 0 && q < 1 ? Math.sin(lt * 55) * 9 * (1 - q * .5) : 0;
    c.fillStyle = '#cfe3f2'; c.fillRect(0, 0, W, H);
    c.save(); c.translate(sx, 0);
    withCam(c, [842, 470, 1.12], () => { c.save(); c.translate(842, 760); c.rotate(-.06 * tilt); c.translate(-842, -760); drawImg(c, 's20'); jijiBoards(c); c.restore(); });
    c.restore();
    calendarCard(c, 300, 270, '九二一大地震', '1999.9.21', pop(lt, .2));
    if (q > 0 && q < 1) { label(c, '搖搖晃晃！', 1500, 220, 56, 1, { bg: '#ffb3a7' }); }
  });
  // 分鏡 23：細心修復
  imgShot(U(23).t0, U(24).t0, 's23', [840, 472, 1.0], [760, 430, 1.2], null, null, (c, lt, d) => {
    label(c, '細心修復', 1550, 200, 56, pop(lt, .4), { bg: '#dff5c8' });
    sparkle(c, 960, 360, 120, lt, d - 1.1, 1);
  });
  // 分鏡 24：集集老街 → 綠色隧道騎腳踏車
  const mid24 = U(24).t0 + 2.4;
  imgShot(U(24).t0, mid24, 's24a', [840, 472, 1.0], [840, 430, 1.2], null, null, (c, lt) => label(c, '集集老街', 360, 200, 56, pop(lt, .3), { bg: '#ffe0b3' }));
  imgShot(mid24, j.t1, 's24b', [840, 520, 1.25], [840, 472, 1.0], null, null, (c, lt) => {
    label(c, '綠色隧道', 360, 200, 56, pop(lt, .2), { bg: '#dff5c8' });
    c.save(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineCap = 'round'; c.lineWidth = 6;
    for (let i = 0; i < 6; i++) { const ph = (lt * .9 + i / 6) % 1, yy = 380 + i * 55; c.globalAlpha = Math.sin(ph * Math.PI); c.beginPath(); c.moveTo(1900 - ph * 700, yy); c.lineTo(1780 - ph * 700, yy); c.stroke(); }
    c.restore();
  });

  // ===== 第4站 水里 =====
  shot(sh.t0, U(25).t0 + .9, (c, lt, d) => stationCard(c, lt, d, 3));
  imgShot(U(25).t0 + .9, U(26).t0, 's25', [840, 472, 1.0], [840, 420, 1.2], c => { c.save(); c.fillStyle = '#f3d9c9'; c.fillRect(732, 369, 214, 29); c.restore(); boardText(c, '水 里 車 站', 839, 384, 26, '#5a3a2a'); });
  imgShot(U(26).t0, U(27).t0, 's26', [840, 472, 1.0], [980, 472, 1.15], null, 'sepia(.1)', (c, lt) => {
    const k = pop(lt, .3); if (k > 0) { c.save(); c.translate(330, 230); c.scale(k, k); rrect(c, -190, -70, 380, 140, 14); c.fillStyle = '#efe3c4'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#6b3b1f'; c.stroke();
      c.font = `900 72px ${FONT}`; c.fillStyle = '#6b3b1f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('水裡坑', 0, 4); c.restore(); }
    label(c, '熱鬧的交通中心', 1450, 200, 50, pop(lt, 2.0), { bg: '#ffe0b3' });
  });
  imgShot(U(27).t0, U(28).t0, 's27', [700, 560, 1.2], [1000, 380, 1.2], null, null, (c, lt) => {
    label(c, '玉山', 1450, 160, 60, pop(lt, 1.6), { bg: '#dfe9ff', tail: true });
    label(c, '從水里出發', 330, 200, 50, pop(lt, .3), { bg: '#ffe0b3' });
  });
  // 分鏡 28：車窗看出去，雲散開露出玉山
  imgShot(U(28).t0, U(29).t0, 's28', [840, 472, 1.0], [980, 380, 1.22], (c, lt, d) => {
    const k = ease(prog(lt, .4, 2.4));
    cloud(c, 1060 - 360 * k, 230, 1.9, 1 - k * .7); cloud(c, 1150 + 380 * k, 270, 1.7, 1 - k * .7); cloud(c, 1100 - 120 * k, 330, 1.5, 1 - k);
  }, null, (c, lt) => label(c, '玉山', 1400, 170, 60, pop(lt, 2.3), { bg: '#dfe9ff' }));
  imgShot(U(29).t0, U(30).t0, 's29', [840, 472, 1.0], [880, 430, 1.15], (c, lt) => {
    for (const [x, yy] of [[1445, 205], [1260, 300]]) { c.save(); c.globalAlpha = .5 + .5 * Math.sin(lt * 8); c.fillStyle = '#fff36e'; c.beginPath(); c.arc(x, yy, 14, 0, 7); c.fill(); c.restore(); }
  }, null, (c, lt) => { label(c, '大觀發電廠', 420, 200, 50, pop(lt, .4), { bg: '#fff' }); label(c, '明湖發電廠', 420, 300, 50, pop(lt, 1.2), { bg: '#fff' }); });
  imgShot(U(30).t0, sh.t1, 's30', [840, 472, 1.0], [800, 420, 1.15], null, null, (c, lt) => {
    label(c, '古早味枝仔冰', 1480, 200, 54, pop(lt, .8), { bg: '#ffe36e' });
    sparkle(c, 700, 350, 60, lt, .3, .8); sparkle(c, 1130, 300, 60, lt, .6, .8);
  });

  // ===== 第5站 車埕 =====
  shot(ch.t0, U(31).t0 + .9, (c, lt, d) => stationCard(c, lt, d, 4));
  imgShot(U(31).t0 + .9, U(32).t0, 's31', [700, 472, 1.15], [980, 472, 1.15]);
  imgShot(U(32).t0, U(33).t0, 's32', [840, 520, 1.1], [840, 560, 1.25], null, null, (c, lt) => {
    miniMap(c, 1560, 230, 560, pop(lt, .2), 4); label(c, '終點', 1700, 380, 50, pop(lt, .7), { bg: '#ffd84a' });
  });
  imgShot(U(33).t0, U(34).t0, 's33', [840, 472, 1.0], [840, 500, 1.1], null, null, (c, lt) => {
    const k = pop(lt, .1, .45); if (k > 0) { c.save(); c.translate(W / 2, 230); c.scale(k, k); text(c, '埕 ＝ 空地', 0, 0, 150, { color: '#ffe36e', lw: 26 }); c.restore(); }
  });
  imgShot(U(34).t0, U(35).t0, 's34', [700, 472, 1.2], [980, 472, 1.2], null, 'sepia(.1)', (c, lt) => label(c, '木材集散地', 1500, 190, 56, pop(lt, 2.8), { bg: '#ffe0b3' }));
  const mid35 = U(35).t0 + 2.8;
  imgShot(U(35).t0, mid35, 's35a', [840, 472, 1.0], [840, 440, 1.1], null, 'sepia(.1)', (c, lt) => label(c, '以前：泡木頭', 360, 200, 54, pop(lt, .2), { bg: '#efe3c4' }));
  imgShot(mid35, U(36).t0, 's35b', [840, 440, 1.1], [840, 472, 1.0], null, null, (c, lt) => label(c, '現在：生態池', 360, 200, 54, pop(lt, .1), { bg: '#dff5c8' }));
  imgShot(U(36).t0, ch.t1, 's36', [840, 472, 1.0], [840, 500, 1.25], null, null, (c, lt) => {
    label(c, '木業展示館', 1500, 190, 54, pop(lt, .3), { bg: '#ffe0b3' }); sparkle(c, 960, 520, 90, lt, 1.6, 1.2);
  });

  // ===== 結尾 =====
  // 分鏡 37：五站依序叮一聲亮起，小火車走完全線
  shot(en.t0, U(38).t0, (c, lt, d) => {
    const T0 = U(37).t0 - en.t0, step = (U(37).t1 - U(37).t0 - .6) / 4;
    const lit = i => lt >= T0 + i * step;
    const k = ease(prog(lt, T0, T0 + 4 * step));
    withCam(c, [840, 472, 1.0], () => {
      drawImg(c, 'map'); mapLabels(c); drawRoute(c, 1);
      STATIONS.forEach(([name, idx], i) => { const [x, yy] = ROUTE[idx]; const on = lit(i);
        c.save(); c.beginPath(); c.arc(x, yy, on ? 24 : 17, 0, 7); c.fillStyle = on ? '#ffd84a' : '#fff'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.restore();
        ripple(c, x, yy, lt, T0 + i * step, 90);
        const up = i === 1 || i === 3; label(c, name, x + (i === 0 ? -105 : 0), yy + (i === 0 ? 0 : up ? -62 : 62), on ? 40 : 34, 1, { bg: on ? '#ffd84a' : '#fff' }); });
      const p = routePoint(routeLen[routeLen.length - 1] * k); trainIcon(c, p[0], p[1] - 4, p[2], 1.1);
    });
    const kk = pop(lt, T0 + 4 * step + .4); if (kk > 0) label(c, '集集線 走完囉！', W / 2, 170, 64, kk, { bg: '#ffe36e' });
  });
  // 分鏡 38：停駛打叉 → 2026.6.25 全線通車
  imgShot(U(38).t0, U(39).t0, 's38', [840, 472, 1.0], [840, 440, 1.12], null, null, (c, lt, d) => {
    const swap = 2.2;
    if (lt < swap + .2) calendarCard(c, 300, 260, '停駛將近五年', '停駛', pop(lt, .1) * (1 - prog(lt, swap, swap + .2)), prog(lt, .9, 1.7));
    else calendarCard(c, 300, 260, '全線通車', '2026.6.25', pop(lt, swap + .2));
    if (lt > swap + .4) for (let i = 0; i < 18; i++) { const ph = ((lt - swap) * .6 + i / 18) % 1; c.save(); c.globalAlpha = 1 - ph; c.fillStyle = ['#ffd84a', '#ff7a7a', '#7ad0ff', '#9be27a'][i % 4];
      c.translate(200 + (i * 97) % 1600, -20 + ph * 700); c.rotate(ph * 6 + i); c.fillRect(-10, -5, 20, 10); c.restore(); }
  });
  imgShot(U(39).t0, U(39).t1 + .2, 's39', [840, 472, 1.0], [960, 430, 1.15], null, null, (c, lt) => label(c, '和家人一起搭火車', 480, 190, 54, pop(lt, .3), { bg: '#ffe0b3' }));
  // 分鏡 40：夕陽下揮手，掰掰
  imgShot(U(39).t1 + .2, TL.dur, 's40', [900, 430, 1.2], [840, 472, 1.0], null, null, (c, lt, d) => {
    const k = pop(lt, .2, .5); if (k > 0) { c.save(); c.translate(W / 2, 220); c.scale(k, k); text(c, '掰掰！下次見！', 0, 0, 120, { color: '#ffe36e', lw: 24 }); c.restore(); }
    const f = prog(lt, d - 1.2, d); if (f > 0) { c.save(); c.globalAlpha = f; c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.restore(); }
  });
}
