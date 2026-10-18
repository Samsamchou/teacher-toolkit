// 場景 06：Chorus 2（副歌二）。歌曲 69.66–84.06 s（SRT 第 25–30 句＋2.4 s 間奏）。本地時間 t 從 0 起算。
// 六人在校園操場群舞，全員跟原曲群唱對嘴。歌詞↔畫面（本地秒＝全曲−69.66）：
//   Here we go, here we go!(0–1.66)            → 握拳往上（pump），每個 "go" 小跳
//   Friends around the world(1.66) say hello!(3.08) → 地球從後方升起；"hello" 全員揮手＋國旗圖釘
//   By metro(4.02) or on foot(5.02)             → 捷運、步行圖卡在唱到時彈出，全員指向
//   Learning(5.24) with my friends(6.30) feels good(7.08)! → 捧書（book）→ "friends" 互相靠近 → "good" 舉手歡呼
//   Here we go, here we go!(7.78)               → 左右踏步（step）
//   Off to school(9.94–10.32) — let's go!(11.32) → 指向學校，學校發光；"go" 全員跳起＋紙花
//   間奏 12.00–14.40                           → 拍手後揮手道別，準備換到 UK 火車站
const S6 = 69.66;
const T6 = { friends: 71.32 - S6, hello: 72.74 - S6, by: 73.16 - S6, metro: 73.68 - S6, foot: 74.68 - S6, learn: 74.90 - S6, fr2: 75.96 - S6, good: 76.74 - S6, here3: 77.44 - S6, off: 79.60 - S6, school: 79.98 - S6, lets: 80.58 - S6, go: 80.98 - S6, end: 81.66 - S6 };
const SCENE = {
  dur: 14.40, songStart: S6, tag: 'Friends around the world',
  draw(c, t) {
    const glow = prog(t, T6.school - .1, T6.school + .3) * (1 - prog(t, T6.end + .4, T6.end + 1));
    grpYard(c, t, { glow, pop: Math.sin(clamp(prog(t, T6.school, T6.school + .45)) * Math.PI) });
    // 地球：Friends around the world 升起，say hello 插上六國圖釘 / globe rises, pins on "hello"
    const gk = E.out(prog(t, T6.friends - .2, T6.friends + .5)) * (1 - E.in(prog(t, T6.by - .1, T6.by + .4)));
    if (gk > 0) { c.save(); c.globalAlpha = gk; grpGlobe(c, W / 2, 470 - (1 - gk) * 160, 170, t, t * 1.2, prog(t, T6.hello - .2, T6.hello + .6)); c.restore(); }
    const tl = [[0, 'pump'], [T6.friends, 'sway'], [T6.hello - .1, 'wave2'], [T6.by, 'point'], [T6.learn, 'book'], [T6.fr2, 'idle'], [T6.good - .1, 'cheer'], [T6.here3, 'step'], [T6.off, 'point'], [T6.lets, 'cheer'], [T6.go, 'jump'], [T6.end + .4, 'clap'], [13.2, 'wave']];
    const goTimes = [70.08, 71.00, 78.20, 79.16].map(x => x - S6);
    grpRow(c, t, tl, { tweak: (i, p) => {
      for (const g of goTimes) p.hop = Math.max(p.hop || 0, Math.sin(clamp(prog(t, g, g + .3)) * Math.PI) * 28);
      if (t >= T6.by && t < T6.learn) { const tgt = t < T6.foot - .3 ? 700 : 1220; p.look = clamp((tgt - p.x) / 400, -1, 1); if (tgt < p.x - 40) [p.la, p.ra] = [p.ra, p.la]; }
      // "with my friends"：靠近並互搭肩 / lean together, arms on shoulders
      const hug = prog(t, T6.fr2 - .2, T6.fr2 + .2) * (1 - prog(t, T6.good - .15, T6.good));
      if (hug > 0) { p.x = lerp(p.x, W / 2 + (p.x - W / 2) * .8, E.inOut(hug)); p.la = [lerp(p.la[0], 1.6, hug), lerp(p.la[1], .1, hug)]; p.ra = [lerp(p.ra[0], 1.6, hug), lerp(p.ra[1], .1, hug)]; p.sway = Math.sin(t * Math.PI * 1.1) * .1 * hug; }
      if (t >= T6.off && t < T6.lets) { p.look = clamp((960 - p.x) / 400, -1, 1); if (p.x > 1000) [p.la, p.ra] = [p.ra, p.la]; }
      return p; } });
    transportIcon(c, 'metro', 700, 380, grpPop(t, T6.metro - .1, T6.learn)); transportIcon(c, 'foot', 1220, 380, grpPop(t, T6.foot - .1, T6.learn));
    if (t > T6.metro - .1 && t < T6.learn + .3) { s06Label(c, 700, 500, 'metro', grpPop(t, T6.metro, T6.learn)); s06Label(c, 1220, 500, 'on foot', grpPop(t, T6.foot, T6.learn)); }
    const lk = grpPop(t, T6.learn, T6.here3); if (lk > 0) grpTitle(c, 'Learning together!', W / 2, 330, lk, t, 84);
    if (t > T6.good) burst(c, W / 2, 420, prog(t, T6.good, T6.good + .7));
    grpConfetti(c, t, T6.go - .05);
    const ok = grpPop(t, T6.off, T6.end + .3); if (ok > 0) grpTitle(c, 'Off to school!', W / 2, 330, ok, t, 96);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
function s06Label(c, x, y, text, k) { if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k * .62, k * .62); c.translate(-x, -y); wordCard(c, x, y, text, 1); c.restore(); }
