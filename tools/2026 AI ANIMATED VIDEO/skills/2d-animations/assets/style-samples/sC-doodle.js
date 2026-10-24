// 畫風 C 樣張：黑底塗鴉寓言風（借鏡 Day One Films 的畫面語言，角色仍是我們的六位學生）。
// 黑底、極簡道具、手寫字卡代替旁白、單一強調色（紅色「內心的聲音」）、顏色隨情緒回來（左灰 → 右彩）、DAY 計數器。
const HAND = '"Ink Free","Segoe Print","Comic Sans MS",cursive';
const SCENE = {
  dur: 1, songStart: 0, tag: '',
  draw(c, t) {
    c.fillStyle = '#0c0c0f'; c.fillRect(0, 0, W, H);
    // 頂燈光錐（舞台聚光）/ soft spotlight from above
    c.save(); c.globalCompositeOperation = 'lighter';
    const cone = c.createLinearGradient(0, 0, 0, 960); cone.addColorStop(0, 'rgba(255,248,230,.10)'); cone.addColorStop(1, 'rgba(255,248,230,.02)');
    c.fillStyle = cone; c.beginPath(); c.moveTo(860, 0); c.lineTo(1060, 0); c.lineTo(1500, 960); c.lineTo(420, 960); c.closePath(); c.fill(); c.restore();
    // 地面一條手繪線＋極簡道具（窗、日曆）/ one wobbly floor line and minimal props
    scWobblyLine(c, 60, 935, 1860, 935, '#3a3a40', 3);
    c.save(); c.translate(1610, 200); c.strokeStyle = '#4a4a52'; c.lineWidth = 3; c.strokeRect(-90, -70, 180, 140); c.beginPath(); c.moveTo(0, -70); c.lineTo(0, 70); c.moveTo(-90, 0); c.lineTo(90, 0); c.stroke();
    c.fillStyle = '#e8e2d0'; c.beginPath(); c.arc(40, -35, 14, 0, 7); c.fill(); c.restore();                       // 窗外的月亮 / moon in the window
    c.font = `600 30px ${HAND}`; c.fillStyle = '#8a8a90'; c.fillText('DAY 1', 70, 80);                           // 計數器 / day counter
    // 紅色「內心的聲音」影子人（單一強調色）/ the red inner-voice shadow
    const sh = document.createElement('canvas'); sh.width = W; sh.height = H; const sg = sh.getContext('2d');
    kidFront(sg, CAST.UK, { x: 250, y: 930, scale: 1.25, la: [.5, -.4], ra: [1.3, .3] }, 0);
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1a0606'; sg.fillRect(0, 0, W, H);
    c.save(); c.shadowColor = 'rgba(255,60,30,.95)'; c.shadowBlur = 34; c.drawImage(sh, 0, 0); c.drawImage(sh, 0, 0); c.restore();
    for (const ex of [220, 280]) { c.save(); c.shadowColor = '#ff3b1f'; c.shadowBlur = 16; c.fillStyle = '#ff5a3a'; c.beginPath(); c.ellipse(ex, 930 - 346 * 1.25 + 6, 9, 6, 0, 0, 7); c.fill(); c.restore(); }
    c.save(); c.font = `700 52px ${HAND}`; c.fillStyle = '#ff4a2a'; c.shadowColor = 'rgba(255,60,30,.6)'; c.shadowBlur = 12; c.rotate(-.04); c.fillText('too hard...', 110, 330); c.restore();
    // 六位學生：顏色從左到右慢慢回來（左邊灰、右邊全彩）/ six students: colour returns left → right
    const kids = [[560, 'TW', 'idle', 0], [800, 'SG', 'idle', .2], [1040, 'JP', 'point', .45], [1280, 'KR', 'wave', .7], [1520, 'UK', 'cheer', .9], [1760, 'US', 'cheer', 1]];
    kids.forEach(([x, code, mv, col], i) => {
      const off = document.createElement('canvas'); off.width = W; off.height = H; const o = off.getContext('2d');
      const pose = Object.assign({ x, y: 930, scale: .9, look: i === 0 ? -1 : 0 }, danceMove(mv, { i: 2, f: .4 }, .6));
      if (i === 0) Object.assign(pose, { la: [.15, .1], ra: [.15, .1], nod: .2, bounce: -14 });                 // 左邊的孩子垂頭喪氣 / the first kid droops
      kidFront(o, CAST[code], pose, .3 + i * .4);
      // 奶油色外框讓角色在黑底上跳出來（手繪感）/ cream outline so figures pop on black
      c.save(); c.filter = `grayscale(${1 - col}) brightness(${.75 + col * .25})`;
      c.shadowColor = '#efe6d2'; c.shadowBlur = 0;
      for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { c.shadowOffsetX = dx; c.shadowOffsetY = dy; c.drawImage(off, 0, 0); }
      c.shadowColor = 'transparent'; c.drawImage(off, 0, 0); c.restore();
    });
    // 手寫字卡＝旁白 / handwritten caption as narration
    c.save(); c.font = `700 64px ${HAND}`; c.textAlign = 'center'; c.fillStyle = '#f3ecdc'; c.fillText('Every day is a new start.', 1120, 300);
    scWobblyLine(c, 820, 325, 1420, 325, '#ff4a2a', 4); c.restore();
    // 右邊的孩子身邊冒出小星光（顏色回來的那一刻）/ sparkles where colour has returned
    for (let i = 0; i < 9; i++) starShape(c, 1420 + rnd(i) * 460, 360 + rnd(i + 4) * 110, 6 + rnd(i + 8) * 8, ['#ffd84d', '#7cc96a', '#4fb3d9', '#f07c8c'][i % 4]);
    drawKaraoke(c, [0, 2, 'Every day is a good day.'], [[0, .3, 'Every'], [.3, .5, 'day'], [.5, .7, 'is'], [.7, .9, 'a'], [.9, 1.3, 'good'], [1.3, 2, 'day.']], 1.0);
    scLabel(c, '畫風 C：黑底塗鴉寓言風 / Doodle fable on black (Day One-inspired)');
  },
};
function scWobblyLine(c, x0, y0, x1, y1, col, w) {   // 手繪抖動線 / hand-drawn wobbly line
  c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath();
  for (let i = 0; i <= 40; i++) { const u = i / 40, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + (rnd(i + x0) - .5) * 4; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke(); c.restore();
}
function scLabel(c, text) { c.save(); c.font = '700 26px "Microsoft JhengHei","Segoe UI",sans-serif'; const w = c.measureText(text).width + 36; c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.roundRect(W - w - 30, 26, w, 48, 24); c.fill(); c.fillStyle = '#bdbdc4'; c.fillText(text, W - w - 12, 59); c.restore(); }
