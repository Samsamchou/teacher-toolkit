// 場景 10：Final Chorus。歌曲 151.78–170.80 s（第 47–50 句）。本地秒＝全曲−151.78。六人群唱，全員對嘴；能量最高。
// 歌詞↔畫面同 S03（engine/chorus.js），再加：黃昏紫色天空＋每句 "fun!"、"one!"、"yeah!" 放煙火。
//   #47 Monday to Sunday, every day is fun!           → 布條左→右亮；"fun!" 煙火
//   #48 Class by class, friend by friend, we are one! → 擊掌 → 手牽手 → "one" 大愛心＋煙火
//   #49 Monday to Sunday, every day is fun!           → 布條右→左亮；"fun!" 煙火
//   #50 Sing it with me, everybody, one, two, three! (yeah!) → 指鏡頭 → 張手 → 1、2、3 → "yeah!" 最大跳＋全場紙花＋煙火
const S10 = 151.78;
const SCENE = {
  dur: 19.02, songStart: S10, tag: 'Every day is fun!',
  draw(c, t) {
    const Wt = edChorusTimes(46, S10);
    grpYard(c, t, {});
    const g = c.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, 'rgba(90,60,160,.45)'); g.addColorStop(1, 'rgba(255,150,120,.18)'); c.fillStyle = g; c.fillRect(0, 0, W, 760);   // 黃昏 / dusk
    for (const [t0, x, y, col] of [[Wt.fun1, 360, 260, '#ffd84d'], [Wt.one, 1560, 230, '#ff8c78'], [Wt.fun2, 520, 220, '#7cc96a'], [Wt.hey, 960, 200, '#4fb3d9'], [Wt.hey + .25, 330, 260, '#f07c8c'], [Wt.hey + .45, 1600, 250, '#ffd84d']]) s10Firework(c, t, t0, x, y, col);
    edChorusBanner(c, t, Wt);
    edChorusKids(c, t, Wt);
    edChorusFx(c, t, Wt);
    if (t > Wt.hey + .3) grpConfetti(c, t, Wt.hey + .3, 2.6);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
function s10Firework(c, t, t0, x, y, col) {   // 煙火：上升 0.35 s 後炸開 / rise then burst
  const u = t - t0; if (u < 0 || u > 1.6) return;
  if (u < .35) { c.fillStyle = col; c.beginPath(); c.arc(x, 760 - (760 - y) * E.out(u / .35), 7, 0, 7); c.fill(); return; }
  const k = (u - .35) / 1.25; c.save(); c.globalAlpha = 1 - k;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = 30 + 150 * E.out(k); c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7 + k * 30); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r + k * 30); c.stroke(); }
  c.restore();
}
