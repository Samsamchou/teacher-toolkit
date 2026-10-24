// 畫風 B 樣張：電影光影風（借鏡 Ifverse 的光影處理，角色仍是我們的六位學生）。
// 黃昏紫＋暖橘配色、亮窗與路燈光錐、角色邊緣光（rim light）、遠景柔焦、地點招牌字、暗角。
const SCENE = {
  dur: 1, songStart: 0, tag: '',
  draw(c, t) {
    // 天空：黃昏漸層 / dusk sky
    const sky = c.createLinearGradient(0, 0, 0, 760);
    sky.addColorStop(0, '#2b1f4f'); sky.addColorStop(.45, '#6b3f7a'); sky.addColorStop(.8, '#e98a5e'); sky.addColorStop(1, '#ffc27a');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    sbGlowCircle(c, 1500, 640, 260, 'rgba(255,190,120,.55)');                 // 落日光暈 / setting sun glow
    c.fillStyle = '#ffd59a'; c.beginPath(); c.arc(1500, 690, 70, 0, 7); c.fill();
    for (let i = 0; i < 40; i++) starShape(c, rnd(i) * W, rnd(i + 3) * 300, 2 + rnd(i + 9) * 3, `rgba(255,255,255,${.3 + rnd(i + 5) * .5})`);
    // 遠景城市剪影（柔焦）/ distant skyline, blurred for depth
    c.save(); c.filter = 'blur(3px)'; c.fillStyle = '#3a2a5a';
    for (let i = 0; i < 16; i++) { const x = i * 130 - 40, h = 120 + rnd(i + 11) * 170; c.fillRect(x, 760 - h, 110, h); }
    c.fillStyle = 'rgba(255,200,120,.55)';
    for (let i = 0; i < 70; i++) { const x = Math.floor(rnd(i + 20) * 16) * 130 - 20 + Math.floor(rnd(i + 40) * 4) * 22, y = 760 - 60 - rnd(i + 60) * 220; c.fillRect(x, y, 10, 14); }
    c.restore();
    // 學校（中景）：亮窗＋招牌 / school with lit windows and a glowing sign
    c.save(); c.translate(W / 2, 760);
    c.fillStyle = '#45325f'; c.fillRect(-420, -360, 840, 360); c.fillStyle = '#382950'; c.fillRect(-140, -470, 280, 120);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) { if (r === 1 && k === 3) continue;
      const x = -370 + k * 108, y = -310 + r * 130, lit = rnd(k * 3 + r) > .2;
      c.fillStyle = lit ? '#ffc56b' : '#2a2140'; c.fillRect(x, y, 76, 82);
      if (lit) { sbGlowRect(c, x, y, 76, 82); c.fillStyle = 'rgba(120,70,30,.35)'; c.fillRect(x + 36, y, 4, 82); } }
    c.fillStyle = '#ffb860'; c.fillRect(-70, -140, 140, 140);                    // 亮著的大門 / lit doorway
    sbGlowRect(c, -70, -140, 140, 140);
    c.font = '900 54px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center';
    c.shadowColor = '#ffcf7a'; c.shadowBlur = 24; c.fillStyle = '#ffe6b0'; c.fillText('SCHOOL', 0, -400); c.shadowBlur = 0;
    c.restore();
    // 地面＋窗光投在地上 / ground with spill light
    const gr = c.createLinearGradient(0, 760, 0, H); gr.addColorStop(0, '#5a3f5e'); gr.addColorStop(1, '#2a1d35'); c.fillStyle = gr; c.fillRect(0, 760, W, H - 760);
    sbGlowCircle(c, W / 2, 800, 380, 'rgba(255,180,100,.28)');
    // 路燈＋光錐 / street lamps with light cones
    for (const lx of [230, 1690]) {
      c.fillStyle = '#1e1630'; c.fillRect(lx - 8, 330, 16, 470); c.fillRect(lx - 8, 330, 70 * (lx < W / 2 ? 1 : -1), 12);
      const hx = lx + 62 * (lx < W / 2 ? 1 : -1);
      c.save(); c.globalCompositeOperation = 'lighter';
      const cone = c.createLinearGradient(0, 345, 0, 900); cone.addColorStop(0, 'rgba(255,214,140,.45)'); cone.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = cone; c.beginPath(); c.moveTo(hx - 18, 345); c.lineTo(hx + 18, 345); c.lineTo(hx + 210, 900); c.lineTo(hx - 210, 900); c.closePath(); c.fill(); c.restore();
      sbGlowCircle(c, hx, 350, 60, 'rgba(255,220,150,.9)');
    }
    // 六位學生：先畫在離屏畫布，再加邊緣光與黃昏調色 / six students with rim light
    const kids = [[260, 'TW', 'wave'], [550, 'SG', 'idle'], [840, 'JP', 'point'], [1110, 'KR', 'idle'], [1390, 'UK', 'hips'], [1670, 'US', 'cheer']];
    const off = document.createElement('canvas'); off.width = W; off.height = H; const o = off.getContext('2d');
    kids.forEach(([x, code, mv], i) => kidFront(o, CAST[code], Object.assign({ x, y: 960, scale: 1.0, look: (W / 2 - x) / 900 }, danceMove(mv, { i: 2, f: .35 }, .6)), .6 + i * .3));
    // 邊緣光：同一張角色圖以暖橘陰影發光描邊 / rim light via warm shadow glow around the silhouettes
    // 角色本體先加黃昏冷調（只染角色、不染背景）/ dusk tint on the characters only
    const tint = document.createElement('canvas'); tint.width = W; tint.height = H; const tg = tint.getContext('2d');
    tg.drawImage(off, 0, 0); tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = 'rgba(70,40,110,.28)'; tg.fillRect(0, 0, W, H);
    // 單側邊緣光：暖光從右上（學校與夕陽方向）打過來 / one-sided warm rim from the light source
    c.save(); c.shadowColor = 'rgba(255,175,85,1)'; c.shadowBlur = 3; c.shadowOffsetX = 7; c.shadowOffsetY = -5; c.drawImage(off, 0, 0); c.restore();
    c.drawImage(tint, 0, 0);
    // 前景：落葉與光點 / foreground dust & bokeh
    c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 22; i++) { c.fillStyle = `rgba(255,210,150,${.06 + rnd(i + 70) * .12})`; c.beginPath(); c.arc(rnd(i + 80) * W, 90 + rnd(i + 90) * 330, 5 + rnd(i + 100) * 18, 0, 7); c.fill(); } c.restore();   // 光點只放在天空 / bokeh in the sky only
    // 字幕樣式示意＋暗角 / caption sample and vignette
    const vg = c.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,25,.75)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    drawKaraoke(c, [0, 2, 'What if every day was a school day?'], [[0, .3, 'What'], [.3, .5, 'if'], [.5, .7, 'every'], [.7, .9, 'day'], [.9, 1.1, 'was'], [1.1, 1.3, 'a'], [1.3, 1.5, 'school'], [1.5, 2, 'day?']], .8);
    sbLabel(c, '畫風 B：電影光影風 / Cinematic light (Ifverse-inspired)');
  },
};
function sbGlowCircle(c, x, y, r, col) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
function sbGlowRect(c, x, y, w, h) { c.save(); c.shadowColor = 'rgba(255,190,90,.9)'; c.shadowBlur = 30; c.fillStyle = 'rgba(255,200,110,.5)'; c.fillRect(x, y, w, h); c.restore(); }
function sbLabel(c, text) { c.save(); c.font = '700 26px "Microsoft JhengHei","Segoe UI",sans-serif'; const w = c.measureText(text).width + 36; c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.roundRect(30, 26, w, 48, 24); c.fill(); c.fillStyle = '#fff'; c.fillText(text, 48, 59); c.restore(); }
