// 場景 04：Chorus 1（副歌一）。歌曲 37.08–52.38 s（SRT 第 11–16 句＋3.3 s 間奏）。本地時間 t 從 0 起算。
// 六人在校園操場群舞，全員跟原曲群唱對嘴。歌詞↔畫面（本地秒＝全曲−37.08）：
//   Here we go, here we go!(0–1.74)     → 交替握拳往上（pump），每個 "go" 加一跳
//   Tell me, tell me(1.74–2.76)          → 手放耳邊（ear）
//   how do you go?(2.76–3.54)            → 攤手（shrug）＋大問號
//   By car(4.04) / by bus(5.02) / by train(5.86) → 唱到交通工具時對應圖卡彈出，全員指向它
//   Sing it, sing it once again!(6.28)   → 雙手舉高左右擺（sway）＋音符
//   Here we go, here we go!(7.96)        → 左右踏步（step）
//   Off to school(10.04–10.46)           → 指向學校，學校彈跳發光；let's go!(11.46) 全員跳起＋紙花
//   間奏 11.98–15.30                     → 拍手（clap）→ 握拳 → 揮手，準備換場
const S4 = 37.08;
const T4 = { car: 41.12 - S4, bus: 42.10 - S4, train: 42.94 - S4, by1: 40.62 - S4, sing: 43.36 - S4, here3: 45.04 - S4, off: 47.12 - S4, school: 47.54 - S4, lets: 48.24 - S4, go: 48.54 - S4, end: 49.06 - S4 };
const SCENE = {
  dur: 15.30, songStart: S4, tag: 'Here we go!',
  draw(c, t) {
    const glow = prog(t, T4.school - .1, T4.school + .3) * (1 - prog(t, T4.end + .4, T4.end + 1));
    const pop = Math.sin(clamp(prog(t, T4.school, T4.school + .45)) * Math.PI);
    grpYard(c, t, { glow, pop });
    const tl = [[0, 'pump'], [1.74, 'ear'], [2.76, 'shrug'], [T4.by1 - .1, 'point'], [T4.sing, 'sway'], [T4.here3, 'step'], [T4.off, 'point'], [T4.lets, 'cheer'], [T4.go, 'jump'], [T4.end + .4, 'clap'], [13.0, 'pump'], [14.3, 'wave']];
    // 每個 "go" 小跳 / small hop on every "go"
    const goTimes = [37.54, 38.48, 45.72, 46.70].map(x => x - S4);
    grpRow(c, t, tl, { tweak: (i, p) => {
      for (const g of goTimes) p.hop = Math.max(p.hop || 0, Math.sin(clamp(prog(t, g, g + .3)) * Math.PI) * 28);
      if (t >= T4.by1 - .1 && t < T4.sing) { const tgt = t < T4.bus - .05 ? 560 : t < T4.train - .05 ? 960 : 1360; p.look = clamp((tgt - p.x) / 400, -1, 1); if (tgt < p.x - 40) [p.la, p.ra] = [p.ra, p.la]; }   // 看向並指向圖卡（目標在左邊就換左手）/ look & point at the card
      if (t >= T4.off && t < T4.lets) { p.look = clamp((960 - p.x) / 400, -1, 1); if (p.x > 1000) [p.la, p.ra] = [p.ra, p.la]; }
      return p; } });
    // 大問號 / big question mark on "how do you go?"
    const qk = grpPop(t, 2.76, 3.9); if (qk > 0) grpTitle(c, '?', W / 2, 420, qk, t, 220, '#fff');
    // 交通圖卡 / transport cards
    transportIcon(c, 'car', 560, 380, grpPop(t, T4.car - .1, T4.sing + .1)); transportIcon(c, 'bus', 960, 380, grpPop(t, T4.bus - .1, T4.sing + .1)); transportIcon(c, 'train', 1360, 380, grpPop(t, T4.train - .1, T4.sing + .1));
    if (t > T4.car - .1 && t < T4.sing + .4) for (const [x, k, w] of [[560, T4.car, 'car'], [960, T4.bus, 'bus'], [1360, T4.train, 'train']]) wordCardSmall(c, x, 500, w, grpPop(t, k, T4.sing + .1));
    grpNotes(c, t, 480, 560, prog(t, T4.sing, T4.sing + .3) * (1 - prog(t, T4.here3, T4.here3 + .3)), 1);
    grpNotes(c, t, 1440, 560, prog(t, T4.sing, T4.sing + .3) * (1 - prog(t, T4.here3, T4.here3 + .3)), 2);
    grpConfetti(c, t, T4.go - .05);
    const ok = grpPop(t, T4.off, T4.end + .3); if (ok > 0) grpTitle(c, 'Off to school!', W / 2, 330, ok, t, 96);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
function wordCardSmall(c, x, y, text, k) { if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k * .62, k * .62); c.translate(-x, -y); wordCard(c, x, y, text, 1); c.restore(); }
