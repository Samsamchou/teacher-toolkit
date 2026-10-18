// 場景 05：Pre-Chorus 2 學科（教室版，和 S02 走廊不同）。歌曲 78.64–87.84 s（第 24–27 句）。本地秒＝全曲−78.64。
// 歌詞↔畫面（本地秒；逐字時間取自 engine/song-data.js）：
//   #24 Chinese, English, math, and art,(0–2.14)【全員】→ 六人站一排，唱到哪一科、那位同學就把該科卡片舉高：
//       "Chinese"(0.22) Amy／"English"(0.76) 同學 SG／"math"(1.48) Andy（左手）／"art"(1.78) 同學 KR
//   #25 Music, PE, computer, let's start!(2.14–4.52)【全員】→ "Music"(2.44) 同學 UK／"PE"(2.76) 同學 US／"computer"(3.48) Andy 再用右手舉第二張（七科六人，Andy 舉兩張）；
//       "let's"(4.00) 卡片放下；"start"(4.16) 六人同時翻開課本
//   #26 Seven days, seven days, sing along,(4.52–6.50)【全員】→ "Seven"(4.76) 起，粉筆依半拍在黑板寫上 MON→SUN（4.76／5.05／5.34／5.62／5.91／6.20／6.49 寫完）
//   #27 Every day, every day, a happy song!(6.50–9.20)【全員】→ "day"(7.08／7.64) 黑板七天一起發亮、六人捧書跳一下；"happy"(8.20) 音符從課本飛出；"song"(8.60) 課本高舉過頭
const S5 = 78.64;
const T5 = { chinese: 78.86 - S5, english: 79.40 - S5, math: 80.12 - S5, and: 80.20 - S5, art: 80.42 - S5, music: 81.08 - S5, pe: 81.40 - S5, computer: 82.12 - S5,
  lets: 82.64 - S5, start: 82.80 - S5, seven1: 83.40 - S5, days1: 83.66 - S5, seven2: 84.12 - S5, days2: 84.24 - S5, sing: 84.64 - S5, along: 84.74 - S5,
  every1: 85.42 - S5, day1: 85.72 - S5, every2: 86.12 - S5, day2: 86.28 - S5, a: 86.76 - S5, happy: 86.84 - S5, song: 87.24 - S5 };
// 舉卡：[學科, 唱到的時刻, 同學序號(ORDER: TW SG JP KR UK US), 手(-1 左 / 1 右)] / who lifts which card, and with which hand
const LIFT5 = [['Chinese', T5.chinese, 0, -1], ['English', T5.english, 1, -1], ['math', T5.math, 2, -1], ['art', T5.art, 3, 1],
  ['music', T5.music, 4, 1], ['PE', T5.pe, 5, 1], ['computer', T5.computer, 2, 1]];
// 粉筆寫完每一天的時刻（"Seven" 起每半拍一天）/ chalk finishes each day on a half-beat grid from "Seven"
const CHALK5 = ED_DAY_ORDER.map((d, i) => T5.seven1 + i * .288);
const DOWN5 = T5.lets - .15;                                     // 卡片收起、手放下拿課本 / cards pop away, arms come down to the books
const SCENE = {
  dur: 9.20, songStart: S5, tag: 'Ready for class!',
  draw(c, t) {
    s05Room(c, t);
    s05Board(c, t);
    const row = grpRow(c, t, [[0, 'idle'], [T5.seven1 - .1, 'sway']], { tweak: s05Tweak });
    // 舉高的學科卡 / lifted subject cards
    for (const [key, w, i, sd] of LIFT5) {
      const up = prog(t, w - .26, w); if (up <= 0) continue;
      const dn = prog(t, DOWN5 - .16, DOWN5); if (dn >= 1) { if (t < DOWN5 + .3) { const r = row[i], [hx, hy] = s05Hand(Object.assign({}, r.pose, sd < 0 ? { la: [2.65, .05] } : { ra: [2.65, .05] }), sd); s05Puff(c, hx, hy - 52, prog(t, DOWN5, DOWN5 + .3)); } continue; }   // 卡片在高處「啵」一聲收起 / card pops away up high
      const r = row[i], [hx, hy] = s05Hand(r.pose, sd), k = E.back(up) * (1 - E.in(dn));
      c.save(); c.translate(hx + sd * 6, hy - 52 * k); c.rotate(sd * .06 + Math.sin(t * 4 + i) * .04);
      edSubjectCard(c, key, 0, 0, k, 1 - prog(t, w + .1, w + 1.1), .72); c.restore();
      if (up >= 1 && t < w + .5) burst(c, hx, hy - 60, prog(t, w, w + .5) * .9 + .1);
    }
    // 課本（"start" 翻開）/ books open on "start"
    const bk = prog(t, DOWN5 + .08, DOWN5 + .24);
    if (bk > 0) row.forEach((r, i) => {
      const lift = E.out(prog(t, T5.song - .2, T5.song + .05)), p = r.pose, sc = p.scale || .92;
      const by = lerp(s05Hand(p, -1)[1] + 4, r.headY - 70, lift);                       // 跟著手 / follows the hands
      s05Book(c, p.x, by, E.back(bk), E.out(prog(t, T5.start - .2, T5.start)), sc * lerp(1.1, 1.35, lift), i, t);
      // "happy song"：音符從課本飛出 / notes fly out of the books
      const nk = prog(t, T5.happy - .2, T5.happy + .05); if (nk > 0) grpNotes(c, t, p.x, by - 30, nk * (1 - prog(t, 9.0, 9.2)), i);
      if (t > T5.song) burst(c, p.x, by - 20, prog(t, T5.song, T5.song + .6) * .9);
    });
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// 手的位置（與 kidFront 相同算法）/ hand position, same maths as kidFront
function s05Hand(p, sd) {
  const a = sd < 0 ? (p.la || [.18, .1]) : (p.ra || [.18, .1]), sc = p.scale || .92;
  const x = sd * (44 + Math.sin(a[0]) * 60 + Math.sin(a[0] + a[1]) * 56), y = -136 + Math.cos(a[0]) * 60 + Math.cos(a[0] + a[1]) * 56 - 150 + (p.bounce || 0);
  return [p.x + x * sc, p.y - (p.hop || 0) + y * sc];
}
// 每位同學的個別動作 / per-kid poses
function s05Tweak(i, p, t) {
  // 舉卡：唱到該科時手臂舉高，"let's" 時放下 / lift the arm on the subject word, lower on "let's"
  for (const [, w, k, sd] of LIFT5) {
    if (k !== i || t < w - .3) continue;
    const u = E.out(prog(t, w - .3, w - .02)) * (1 - E.inOut(prog(t, DOWN5, DOWN5 + .2))), arm = [lerp(.2, 2.65, u), lerp(.15, .05, u)];
    if (sd < 0) p.la = arm; else p.ra = arm;
    if (t < w + .4) p.hop = Math.max(p.hop || 0, Math.sin(clamp(prog(t, w - .05, w + .3)) * Math.PI) * 26);
    p.look = sd;
  }
  // 捧課本 / hold the book at the chest
  const hold = E.inOut(prog(t, DOWN5, DOWN5 + .2));
  if (hold > 0) {
    const A = p.la || [.2, .15], B = p.ra || [.2, .15];
    p.la = [lerp(A[0], 0, hold), lerp(A[1], -1.55, hold)]; p.ra = [lerp(B[0], 0, hold), lerp(B[1], -1.55, hold)];   // 書捧在胸下，不遮嘴 / book below the chin
    p.nod = .08 * hold * (t < T5.seven1 ? 1 : 0);
    for (const w of [T5.day1, T5.day2]) p.hop = Math.max(p.hop || 0, Math.sin(clamp(prog(t, w - .05, w + .3)) * Math.PI) * 28);   // "day" 跳一下 / hop on "day"
  }
  // "song"：課本高舉過頭 / books overhead on "song"
  const up = E.out(prog(t, T5.song - .2, T5.song + .05));
  if (up > 0) { p.la = [lerp(0, 2.7, up), lerp(-1.55, .25, up)]; p.ra = [lerp(0, 2.7, up), lerp(-1.55, .25, up)]; p.hop = Math.sin(clamp(prog(t, T5.song - .05, T5.song + .35)) * Math.PI) * 30; p.sway = 0; }
  return p;
}
// 教室：粉橘牆、窗、木地板、時鐘 / classroom: peach wall, windows, wood floor, clock
function s05Room(c, t) {
  c.fillStyle = '#ffe6d1'; c.fillRect(0, 0, W, 770);
  c.fillStyle = '#f7d3b6'; c.fillRect(0, 600, W, 170); c.fillStyle = '#e0a97e'; c.fillRect(0, 596, W, 12);       // 護牆板 / wainscot
  for (const wx of [250, 1690]) {                                // 窗＋陽光 / windows with sunbeams
    rr(c, wx - 130, 150, 260, 300, 14); fillStroke(c, '#bfe8f5', 7);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(wx - 100, 170); c.lineTo(wx - 40, 170); c.lineTo(wx - 110, 300); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(wx, 150); c.lineTo(wx, 450); c.moveTo(wx - 130, 300); c.lineTo(wx + 130, 300); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    rr(c, wx - 150, 444, 300, 20, 8); fillStroke(c, '#fff6d6', 5);
  }
  c.save(); c.globalAlpha = .12 + .04 * Math.sin(t * 1.5); c.fillStyle = '#fff3a6';
  for (const wx of [250, 1690]) { c.beginPath(); c.moveTo(wx - 130, 450); c.lineTo(wx + 130, 450); c.lineTo(wx + 260 * Math.sign(960 - wx), 900); c.lineTo(wx - 120 * Math.sign(wx - 960) - 240, 900); c.closePath(); c.fill(); }
  c.restore();
  // 時鐘 / wall clock
  c.save(); c.translate(1690, 80); c.beginPath(); c.arc(0, 0, 44, 0, 7); fillStroke(c, '#fff', 6);
  c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -28); c.moveTo(0, 0); c.lineTo(20, 8); c.stroke(); c.restore();
  // 木地板 / wood floor
  c.fillStyle = '#d9a86e'; c.fillRect(0, 770, W, H - 770);
  c.fillStyle = 'rgba(120,70,30,.13)'; for (let r = 0; r < 5; r++) { c.fillRect(0, 770 + r * 64, W, 3); for (let k = 0; k < 9; k++) c.fillRect(((k * 260 + r * 130) % 2080) - 80, 770 + r * 64, 3, 64); }
}
// 黑板：粉筆寫七天；"day" 發亮 / blackboard: chalk writes the seven days; glow on "day"
function s05Board(c, t) {
  rr(c, 470, 60, 980, 300, 16); fillStroke(c, '#c98f5a', 8); rr(c, 490, 80, 940, 260, 8); c.fillStyle = '#2f5d4a'; c.fill();
  rr(c, 600, 356, 720, 18, 6); fillStroke(c, '#c98f5a', 5);                                            // 粉筆槽 / chalk tray
  c.fillStyle = '#fffbe6'; c.fillRect(1180, 348, 40, 9); c.fillStyle = '#ffb3c1'; c.fillRect(1236, 348, 34, 9);
  // 一直都在的標題 / title already on the board
  c.font = '700 46px "Comic Sans MS","Segoe Print","Inter",sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,251,230,.92)'; c.fillText('Let\'s learn!', 960, 150);
  c.strokeStyle = 'rgba(255,251,230,.6)'; c.lineWidth = 4; c.beginPath(); c.moveTo(830, 166); c.quadraticCurveTo(960, 180, 1090, 166); c.stroke();
  // "day" 時七天一起發亮 / the whole week glows on "day"
  const glow = Math.max(...[T5.day1, T5.day2].map(w => prog(t, w - .05, w + .08) * (1 - prog(t, w + .25, w + .55))), prog(t, T5.song - .05, T5.song + .1) * .7);
  ED_DAY_ORDER.forEach((d, i) => {
    const x = 556 + i * 134, end = CHALK5[i], k = prog(t, end - .26, end); if (k <= 0) return;
    if (glow > 0) { c.save(); c.globalAlpha = glow * .5; c.fillStyle = '#fff3a6'; rr(c, x - 62, 212, 124, 104, 18); c.fill(); c.restore(); }
    c.save(); c.beginPath(); c.rect(x - 66, 196, 132 * k, 130); c.clip();                     // 由左到右寫出 / revealed left → right
    c.font = '700 54px "Comic Sans MS","Segoe Print","Inter",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fffbe6'; c.fillText(d, x, 272);
    c.strokeStyle = ED_DAYS[d][2]; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 46, 296); c.lineTo(x + 46, 296); c.stroke();   // 彩色底線 / colour underline
    c.restore();
    if (k < 1) s05Chalk(c, x - 56 + 120 * k, 262 + Math.sin(k * 20) * 14);                    // 粉筆跟著寫 / chalk follows the stroke
    else if (t < end + .3) star(c, x + 56, 220, 14 * (1 - prog(t, end, end + .3)));
  });
}
function s05Chalk(c, x, y) { c.save(); c.translate(x, y); c.rotate(-.7); rr(c, -8, -46, 16, 52, 5); fillStroke(c, '#fffbe6', 4); c.restore(); }
// 課本：closed→open；顏色依座號 / book that opens (cover swings open)
function s05Book(c, x, y, k, open, s, i, t) {
  if (k <= 0) return; const col = ['#ff8c78', '#4fb3d9', '#ffd84d', '#f07c8c', '#8b7fd8', '#7cc96a'][i];
  c.save(); c.translate(x, y); c.scale(k * s, k * s);
  // 右頁（打開後才看到）/ right page
  if (open > 0) { c.beginPath(); c.moveTo(0, -36); c.lineTo(52, -42); c.lineTo(52, 30); c.lineTo(0, 36); c.closePath(); fillStroke(c, '#fffdf6', 5);
    c.strokeStyle = 'rgba(59,42,46,.35)'; c.lineWidth = 3; for (let r = 0; r < 4; r++) { c.beginPath(); c.moveTo(10, -22 + r * 13); c.lineTo(42, -26 + r * 13); c.stroke(); } }
  else { rr(c, -2, -40, 52, 76, 6); fillStroke(c, col, 5); }
  // 封面從右翻到左（水平壓扁）/ cover swings from right to left
  const sw = Math.cos(open * Math.PI);                                  // 1 → -1
  c.save(); c.scale(sw, 1);
  if (sw > 0) { rr(c, 0, -40, 50, 76, 6); fillStroke(c, col, 5); starShape(c, 25, -2, 14, '#fff'); }
  else { c.beginPath(); c.moveTo(0, -36); c.lineTo(52, -42); c.lineTo(52, 30); c.lineTo(0, 36); c.closePath(); fillStroke(c, '#fffdf6', 5);
    c.strokeStyle = 'rgba(59,42,46,.35)'; c.lineWidth = 3; for (let r = 0; r < 4; r++) { c.beginPath(); c.moveTo(10, -22 + r * 13); c.lineTo(42, -26 + r * 13); c.stroke(); } }
  c.restore(); c.restore();
}
function s05Puff(c, x, y, k) { if (k <= 0 || k >= 1) return; c.save(); c.globalAlpha = 1 - k; c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 4; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, r = 20 + 50 * E.out(k); c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * .7, 18 * (1 - k * .5), 0, 7); c.fill(); c.stroke(); } c.restore(); }   // 小煙霧 / little puff
