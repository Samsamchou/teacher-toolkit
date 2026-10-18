// 場景 02：Pre-Chorus 1 學科。歌曲 36.18–45.92 s（第 9–12 句）。本地秒＝全曲−36.18。
// 歌詞↔畫面（本地秒；逐字時間取自 engine/song-data.js）：
//   #9  Chinese, English, math, and art,(0–2.46)【全員】→ 走廊布告欄的學科卡依字翻開："Chinese"(0.56) 中／"English"(0.90) ABC／"math"(1.60) 1+2／"art"(2.18) 調色盤；最近的同學舉手指那張卡
//   #10 Music, PE, computer, let's start!(2.46–4.74)【全員】→ "Music"(2.46) 音符／"PE"(3.08) 籃球／"computer"(3.44) 螢幕翻開；"start"(4.30) 上課鐘響、鐘搖晃，六人跳起
//   #11 Seven days, seven days, sing along,(4.74–6.88)【全員】→ "Seven"(4.74) 學科卡收起，七張星期卡依序彈出、排成一圈旋轉；"seven"(5.82) 整圈發光；六人隨拍拍手
//   #12 Every day, every day, a happy song!(6.88–9.74)【全員】→ "day"(7.46／8.04) 星期卡一起跳一下；"happy"(8.62) 音符從每張星期卡飛出；"song"(8.96) 六人雙手張開
const S2 = 36.18;
const T2 = { chinese: 36.74 - S2, english: 37.08 - S2, math: 37.78 - S2, and: 38.12 - S2, art: 38.36 - S2, music: 38.64 - S2, pe: 39.26 - S2, computer: 39.62 - S2,
  lets: 40.10 - S2, start: 40.48 - S2, seven1: 40.92 - S2, days1: 41.60 - S2, seven2: 42.00 - S2, days2: 42.14 - S2, sing: 42.46 - S2, along: 42.68 - S2,
  every1: 43.06 - S2, day1: 43.64 - S2, every2: 44.00 - S2, day2: 44.22 - S2, a: 44.52 - S2, happy: 44.80 - S2, song: 45.14 - S2 };
// 七張學科卡：鍵名、翻開時刻（＝唱到該字）/ the seven subject cards and the word that flips each one
const SUBJ2 = [['Chinese', T2.chinese], ['English', T2.english], ['math', T2.math], ['art', T2.art], ['music', T2.music], ['PE', T2.pe], ['computer', T2.computer]];
const S2_CARD_X = i => 960 + (i - 3) * 235, S2_CARD_Y = 330;   // 布告欄上的卡位 / card slots on the board
// 舞步時間表（本地秒）/ dance timeline
const DANCE2 = [[0, 'step'], [T2.lets - .1, 'cheer'], [T2.seven1 - .1, 'clap'], [T2.every1 - .08, 'pump'], [T2.happy - .1, 'idle']];
const SCENE = {
  dur: 9.74, songStart: S2, tag: 'Our subjects!',
  draw(c, t) {
    s02Hallway(c, t);
    s02Board(c, t);
    // 上課鐘（"start" 響）/ school bell rings on "start"
    const ring = prog(t, T2.start - .05, T2.start + .1) * (1 - prog(t, T2.seven1 + .3, T2.seven1 + .8));
    s02BellMount(c); edBell(c, 1700, 150, ring, t, 1.05);
    // 星期卡轉輪（"Seven" 起）/ day-card wheel from "Seven"
    s02DayRing(c, t);
    const row = grpRow(c, t, DANCE2, { tweak: s02Tweak });
    // "happy song"：音符從每張星期卡飛出 / notes fly out of every day card
    const nk = prog(t, T2.happy - .2, T2.happy + .05);
    if (nk > 0) for (let i = 0; i < 7; i++) { const q = s02RingPos(t, i); grpNotes(c, t, q.x, q.y - 30, nk * (1 - prog(t, 9.45, 9.74)), i); }
    if (t > T2.start) burst(c, 960, 520, prog(t, T2.start, T2.start + .7));            // 跳起星星 / jump sparkle
    if (t > T2.song) for (const r of row) burst(c, r.x, r.headY + 20, prog(t, T2.song, T2.song + .6) * .9);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// 每位同學的個別動作 / per-kid tweak on top of the shared dance
function s02Tweak(i, p, t) {
  // 學科翻開時，離那張卡最近的同學舉手指向它 / nearest kid points up at the card being flipped
  SUBJ2.forEach(([, w], j) => {
    const cx = S2_CARD_X(j), near = GRP_XS.reduce((b, x, k) => Math.abs(x - cx) < Math.abs(GRP_XS[b] - cx) ? k : b, 0);
    if (near !== i || t < w - .2 || t > w + .7) return;
    const k = E.out(prog(t, w - .2, w)) * (1 - prog(t, w + .45, w + .7)), arm = [lerp(.5, 2.55, k), lerp(.6, -.05, k)];
    if (cx < GRP_XS[i]) p.la = arm; else p.ra = arm; p.look = cx < GRP_XS[i] ? -1 : 1;
  });
  // "start"：握拳跳起 / jump on "start"
  if (t >= T2.start - .05 && t < T2.seven1) p.hop = Math.sin(clamp(prog(t, T2.start - .05, T2.start + .4)) * Math.PI) * 60;
  // "happy song"：雙手張開 / arms open wide
  if (t >= T2.happy - .1) { const k = E.out(prog(t, T2.happy - .1, T2.happy + .2)); p.la = [lerp(.2, 1.95, k), lerp(.15, -.3, k)]; p.ra = [lerp(.2, 1.95, k), lerp(.15, -.3, k)];
    p.hop = Math.sin(clamp(prog(t, T2.song - .05, T2.song + .35)) * Math.PI) * 34; }
  return p;
}
// 走廊背景：牆、置物櫃、地磚 / school hallway backdrop
function s02Hallway(c, t) {
  const g = c.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, '#d6eefa'); g.addColorStop(1, '#eef8ff'); c.fillStyle = g; c.fillRect(0, 0, W, 760);
  c.fillStyle = '#fffdf6'; c.fillRect(0, 0, W, 26); for (let x = 160; x < W; x += 420) { rr(c, x, 0, 200, 22, 8); c.fillStyle = '#fff3a6'; c.fill(); }   // 天花板燈 / ceiling lights
  // 置物櫃（背景）/ lockers along the wall
  for (let x = -20; x < W; x += 120) { rr(c, x + 4, 520, 112, 240, 8); fillStroke(c, (x / 120) % 2 ? '#7ec8e8' : '#8fd2ee', 5);
    c.fillStyle = 'rgba(59,42,46,.35)'; for (let k = 0; k < 3; k++) c.fillRect(x + 34 + k * 18, 548, 10, 5); rr(c, x + 90, 620, 10, 34, 5); c.fillStyle = INK; c.fill(); }
  c.fillStyle = '#5aa8cc'; c.fillRect(0, 752, W, 14);
  // 地磚 / floor tiles
  c.fillStyle = '#e9eef2'; c.fillRect(0, 766, W, H - 766);
  c.fillStyle = 'rgba(80,110,140,.10)'; for (let r = 0; r < 4; r++) for (let k = 0; k < 14; k++) if ((r + k) % 2) c.fillRect(k * 140, 766 + r * 80, 140, 80);
}
// 學科布告欄：卡片依字翻開（背面「?」→正面圖示）/ subject board, cards flip open on each word
function s02Board(c, t) {
  rr(c, 110, 200, 1700, 262, 18); fillStroke(c, '#d9a35b', 8); rr(c, 128, 218, 1664, 226, 10); c.fillStyle = '#e8c48f'; c.fill();   // 軟木板 / cork board
  c.fillStyle = 'rgba(120,70,30,.18)'; for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(140 + rnd(i) * 1640, 230 + rnd(i + 3) * 200, 3, 0, 7); c.fill(); }
  const lab = 1 - prog(t, T2.seven1 - .5, T2.seven1 - .3);            // 標題在轉輪出現前收起 / label folds before the wheel
  if (lab > 0) { c.save(); c.translate(960, 198); c.scale(1, lab); rr(c, -200, -30, 400, 60, 30); fillStroke(c, '#fff6d6', 6); c.font = '900 36px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('OUR SUBJECTS', 0, 13); c.restore(); }
  // "Seven" 前學科卡縮小、往兩側讓位給星期轉輪 / before "Seven" the cards shrink and slide aside for the day wheel
  const mv = E.inOut(prog(t, T2.seven1 - .55, T2.seven1 - .1)), SIDE = [220, 360, 500, 640, 1280, 1420, 1560];
  SUBJ2.forEach(([key, w], i) => {
    const x = lerp(S2_CARD_X(i), SIDE[i], mv), y = S2_CARD_Y, f = prog(t, w - .24, w - .02), sc = lerp(1, .68, mv);   // 翻面 0→1（唱到字時已全開）/ flip completes on the word
    const sx = Math.abs(Math.cos(f * Math.PI)) * sc, lit = f >= .5 ? 1 - prog(t, w + .1, w + 1.2) : 0;
    c.save(); c.translate(x, y); c.scale(Math.max(.02, sx), sc);
    if (f < .5) s02CardBack(c, i); else edSubjectCard(c, key, 0, 0, 1, lit, .9);
    c.restore();
    c.beginPath(); c.arc(x, y - 78 * sc, 9 * sc, 0, 7); fillStroke(c, '#ef4a4a', 4);       // 圖釘 / pin
    if (f >= 1 && t < w + .5) s02Sparkle(c, x, y, prog(t, w + .05, w + .5));
  });
}
function s02CardBack(c, i) {   // 卡片背面 / card back with "?"
  rr(c, -72, -72, 144, 144, 22); fillStroke(c, ['#bfe8f5', '#d6cff5', '#ffe2b8'][i % 3], 6);
  c.save(); c.globalAlpha = .45; c.strokeStyle = '#fff'; c.lineWidth = 6; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-60 + k * 40, 60); c.lineTo(-20 + k * 40, -60); c.stroke(); } c.restore();
  c.font = '900 72px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.lineWidth = 10; c.strokeStyle = INK; c.strokeText('?', 0, 26); c.fillStyle = '#fff'; c.fillText('?', 0, 26);
}
function s02Sparkle(c, x, y, k) { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3, r = 70 + 50 * E.out(k); star(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 13 * (1 - k * .7)); } }
function s02BellMount(c) {   // 鐘的牆上支架 / wall bracket for the bell
  c.lineWidth = 8; c.strokeStyle = INK; c.beginPath(); c.moveTo(1700, 30); c.lineTo(1700, 96); c.stroke(); rr(c, 1650, 22, 100, 18, 8); fillStroke(c, '#c9ced6', 5);
}
// 星期卡轉輪：七張卡排成一個圓、像摩天輪一樣轉（卡片保持直立）/ day-card wheel: seven upright cards on a turning circle
const S2_RING = { x: 960, y: 300, r: 166 };
function s02RingPos(t, i) {
  const pp = prog(t, T2.seven1 - .12 + i * .1, T2.seven1 + .22 + i * .1), open = pp > 0 ? E.back(pp) : 0;   // 依序從中心彈到圈上；先判斷 prog / one by one from the hub
  const a = i / 7 * Math.PI * 2 - Math.PI / 2 + Math.max(0, t - T2.seven1) * .85;
  let hop = 0; for (const w of [T2.every1, T2.day1, T2.every2, T2.day2]) hop = Math.max(hop, Math.sin(clamp(prog(t, w - .02, w + .3)) * Math.PI) * 26);   // "every day" 一起跳 / hop
  return { x: S2_RING.x + Math.cos(a) * S2_RING.r * open, y: S2_RING.y + Math.sin(a) * S2_RING.r * open - hop, s: .68 * Math.min(1, open * 1.1), open, on: pp > 0 };
}
function s02DayRing(c, t) {
  const hp = prog(t, T2.seven1 - .2, T2.seven1 + .15); if (hp <= 0) return;
  const flash = Math.max(prog(t, T2.seven2 - .03, T2.seven2 + .1) * (1 - prog(t, T2.seven2 + .3, T2.seven2 + 1.0)), prog(t, T2.song - .05, T2.song + .1) * (1 - prog(t, 9.3, 9.74)) * .8);
  // 中心輪軸＋輻條 / hub and spokes
  c.save(); c.translate(S2_RING.x, S2_RING.y); const hk = E.back(hp);
  c.lineWidth = 6; c.strokeStyle = 'rgba(59,42,46,.35)'; for (let i = 0; i < 7; i++) { const q = s02RingPos(t, i); if (!q.on) continue; c.beginPath(); c.moveTo(0, 0); c.lineTo(q.x - S2_RING.x, q.y - S2_RING.y); c.stroke(); }
  c.scale(hk, hk); c.rotate(Math.sin(t * 3) * .05);
  c.beginPath(); c.arc(0, 0, 58 + flash * 8, 0, 7); fillStroke(c, '#ffd84d', 7);
  c.font = '900 52px "Inter","Segoe UI",sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('7', 0, 6); c.font = '900 20px "Inter","Segoe UI",sans-serif'; c.fillText('DAYS', 0, 32);
  c.restore();
  for (let i = 0; i < 7; i++) { const q = s02RingPos(t, i); if (q.on) edDayCard(c, ED_DAY_ORDER[i], q.x, q.y, 1, Math.max(flash, 1 - prog(t, T2.seven1 + i * .1, T2.seven1 + .6 + i * .1)), q.s); }
}
