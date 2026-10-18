// chorus.js — 三段副歌（S03／S06／S10）共用編舞。歌詞相同、動作相同，只換舞台與隊形。
// Shared choreography for the three choruses; each scene passes its own word times (local seconds) and staging.
//   Monday to Sunday, every day is fun!  → 上方星期布條：從 "Monday" 到 "Sunday" 七格依序亮（第二次由右到左）；"fun!" 握拳小跳
//   Class by class                       → 兩兩擊掌（"class" 第二次那一刻手掌相碰）
//   friend by friend, we are one!        → 手牽手；"we are one" 六人靠攏、"one" 中間冒出大愛心
//   (oh, oh, oh)                         → 手牽手左右擺
//   Sing it with me, everybody           → "Sing" 指向鏡頭；"everybody" 雙手張開
//   one, two, three! (hey!/yeah!)        → 每個數字頭上彈出 1／2／3；"hey/yeah" 大跳＋紙花
// W 參數（本地秒）：mon1, sun1, fun1, class1, class2, friend1, one, mon2, sun2, fun2, sing, every, n1, n2, n3, hey, end
function edChorusBanner(c, t, Wt, y = 250) {
  const xs = ED_DAY_ORDER.map((d, i) => 360 + i * 200);
  const lit1 = clamp((t - Wt.mon1) / (Wt.sun1 - Wt.mon1 + .001) * 6.999 + 1), lit2 = clamp((t - Wt.mon2) / (Wt.sun2 - Wt.mon2 + .001) * 6.999 + 1);
  ED_DAY_ORDER.forEach((d, i) => {
    let lit = 0;
    if (t >= Wt.mon1 && t < Wt.class1) lit = i < Math.floor(lit1 * 7) ? 1 : 0;                 // 第一次：左→右 / left to right
    if (t >= Wt.mon2 && t < Wt.sing) lit = (6 - i) < Math.floor(lit2 * 7) ? 1 : 0;           // 第二次：右→左 / right to left
    const pulse = t >= Wt.fun1 && t < Wt.fun1 + .4 || t >= Wt.fun2 && t < Wt.fun2 + .4 ? 1.12 : 1;
    edDayCard(c, d, xs[i], y, grpPop(t, -.2, 1e9, .4), lit, .72 * (lit ? pulse : 1));
  });
}
function edChorusKids(c, t, Wt, opt = {}) {
  const hop = (t0, h) => Math.sin(clamp(prog(t, t0, t0 + .32)) * Math.PI) * h;
  const tl = [[0, 'step'], [Wt.fun1 - .1, 'pump'], [Wt.class1, 'idle'], [Wt.mon2 - .2, 'step'], [Wt.fun2 - .1, 'pump'], [Wt.sing, 'point'], [Wt.every, 'idle'], [Wt.n1 - .05, 'idle'], [Wt.hey - .05, 'jump'], [Wt.hey + .6, 'cheer']];
  return grpRow(c, t, tl, Object.assign({ tweak: (i, p) => {
    p.hop = Math.max(p.hop || 0, hop(Wt.fun1, 36), hop(Wt.fun2, 36));
    // 兩兩擊掌 / high-five in pairs on "class by class"
    const hf = prog(t, Wt.class1 + .05, Wt.class2) * (1 - prog(t, Wt.friend1 - .15, Wt.friend1));
    if (hf > 0) { const toward = i % 2 ? -1 : 1, k = E.inOut(hf); p.x += toward * 55 * k; if (toward > 0) p.ra = [lerp(.2, 2.3, k), lerp(.15, -.3, k)]; else p.la = [lerp(.2, 2.3, k), lerp(.15, -.3, k)]; p.look = toward; }
    // 手牽手＋靠攏 / hold hands, then close in on "we are one"
    const hh = prog(t, Wt.friend1 - .15, Wt.friend1 + .2) * (1 - prog(t, Wt.mon2 - .35, Wt.mon2 - .05));
    if (hh > 0) { const k = E.inOut(hh); p.la = [lerp(p.la ? p.la[0] : .2, 1.45, k), lerp(p.la ? p.la[1] : .15, .05, k)]; p.ra = [lerp(p.ra ? p.ra[0] : .2, 1.45, k), lerp(p.ra ? p.ra[1] : .15, .05, k)];
      const close = E.inOut(prog(t, Wt.one - .6, Wt.one)) * (1 - E.inOut(prog(t, Wt.mon2 - .4, Wt.mon2)));
      p.x = lerp(p.x, W / 2 + (p.x - W / 2) * .9, close); p.sway = Math.sin((t - Wt.friend1) * Math.PI * 1.1) * .08 * k; }
    // "Sing it with me" 指向鏡頭；"everybody" 張開雙手 / point at camera, then open arms
    if (t >= Wt.sing && t < Wt.every) { p.look = 0; p.ra = [2.0, -.9]; }
    if (t >= Wt.every && t < Wt.n1 - .05) { const k = E.out(prog(t, Wt.every, Wt.every + .3)); p.la = [lerp(.2, 1.9, k), .2]; p.ra = [lerp(.2, 1.9, k), .2]; }
    // 數 1、2、3：每個數字舉手一次 / raise a hand on each count
    for (const [n, tn] of [[1, Wt.n1], [2, Wt.n2], [3, Wt.n3]]) if (t >= tn - .05 && t < tn + .45 && t < Wt.hey - .05) { const k = Math.sin(clamp(prog(t, tn - .05, tn + .45)) * Math.PI); if (n % 2) p.ra = [lerp(.2, 2.7, k), .1]; else p.la = [lerp(.2, 2.7, k), .1]; p.hop = Math.max(p.hop || 0, k * 14); }
    if (opt.tweak) p = opt.tweak(i, p, t) || p;
    return p; } }, opt.row || {}));
}
function edChorusFx(c, t, Wt) {
  // 愛心（"one"）/ heart on "we are one"
  const hk = grpPop(t, Wt.one - .05, Wt.mon2 - .4, .35, .3);
  if (hk > 0) { c.save(); c.translate(W / 2, 470); c.scale(hk * 2.2, hk * 2.2); c.beginPath(); c.moveTo(0, 30); c.bezierCurveTo(-56, -10, -30, -56, 0, -28); c.bezierCurveTo(30, -56, 56, -10, 0, 30); c.fillStyle = '#ff6b8a'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.restore(); }
  // 數字 1、2、3 / count numbers
  for (const [n, tn, x] of [[1, Wt.n1, 700], [2, Wt.n2, 960], [3, Wt.n3, 1220]]) { const k = grpPop(t, tn - .05, Wt.hey + .3, .25, .25); if (k > 0) grpTitle(c, String(n), x, 470, k, t, 150, ['#ff8c78', '#ffd84d', '#7cc96a'][n - 1]); }
  if (t > Wt.hey - .05) grpConfetti(c, t, Wt.hey - .05);
  if (t >= Wt.fun1 && t < Wt.fun1 + .6) burst(c, W / 2, 480, prog(t, Wt.fun1, Wt.fun1 + .6));
  if (t >= Wt.fun2 && t < Wt.fun2 + .6) burst(c, W / 2, 480, prog(t, Wt.fun2, Wt.fun2 + .6));
}
// 由 SONG 字幕找出某段副歌的本地字時（cueIdx0 = 該段第一句的 SONG.cues 索引）/ word times for one chorus
function edChorusTimes(cueIdx0, songStart) {
  const q = SONG.cues, w = (ci, wi) => q[cueIdx0 + ci][3][wi][0] - songStart;
  const l4 = q[cueIdx0 + 3][3], find = (re) => l4.find(x => re.test(x[2]))[0] - songStart;
  return { mon1: w(0, 0), sun1: w(0, 2), fun1: w(0, 6), class1: w(1, 0), class2: w(1, 2), friend1: w(1, 3), one: w(1, 8), mon2: w(2, 0), sun2: w(2, 2), fun2: w(2, 6),
    sing: w(3, 0), every: find(/^everybody/i), n1: find(/^one/i), n2: find(/^two/i), n3: find(/^three/i), hey: find(/^\((hey|yeah)/i), end: q[cueIdx0 + 3][1] - songStart };
}
