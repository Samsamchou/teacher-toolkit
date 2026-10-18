// 場景 00：Intro。歌曲 0–17.12 s（第 1–2 句＋約 8 秒前奏）。本地秒＝全曲秒。六人群唱，全員對嘴。
// 歌詞↔畫面（字時取自 engine/song-data.js）：
//   #1 Monday(0.00), Tuesday(1.44), Wednesday(1.60), hey!(2.08) (hey!)  → 三張星期卡依字從上方掉進日曆架；"hey!" 六人跳起＋星星
//   #2 Thursday(3.96), Friday(5.94), Saturday(6.20), Sunday!(6.72) (yeah!)(7.30) → 其餘四張依字掉入，七張到齊；"yeah!" 雙手高舉
//   前奏 7.7–17.12 → 片名「Every Day Is Fun!」隨拍點跳動；六人踏步→拍手→握拳；最後七張卡只剩 SAT 放大發光，接 S01（週六）
const SCENE = {
  dur: 17.12, songStart: 0, tag: 'Every Day Is Fun!',
  draw(c, t) {
    grpYard(c, t, {});
    const days = SONG.cues[0][3].slice(0, 3).map(w => w[0]).concat(SONG.cues[1][3].slice(0, 4).map(w => w[0]));   // 七個星期字的時間 / the seven day-word times
    const heyT = SONG.cues[0][3][3][0], yeahT = SONG.cues[1][3][4][0];
    // 日曆架與七張卡 / calendar rail with seven cards dropping in on their words
    const satFocus = E.inOut(prog(t, 15.4, 16.6));
    c.save(); c.globalAlpha = 1 - satFocus * .2; rr(c, 230, 160, 1460, 16, 8); fillStroke(c, '#c98f5a', 5); c.restore();
    ED_DAY_ORDER.forEach((d, i) => {
      const t0 = days[i] - .12, u = prog(t, t0, t0 + .35); if (u <= 0) return;
      const x = 340 + i * 206, y = lerp(-140, 290, E.back(u)), lit = 1 - prog(t, t0 + .35, t0 + 1.2);
      if (d === 'SAT' && satFocus > 0) return;   // SAT 交給下方的放大動畫畫 / SAT is drawn by the zoom below
      const fade = satFocus;
      if (fade >= 1) return;
      c.save(); c.globalAlpha = 1 - fade; edDayCard(c, d, x, y, 1, lit, .82); c.restore();
    });
    // 結尾：SAT 卡放大置中，接下一景「週六」/ SAT zooms to centre to lead into S01
    if (satFocus > 0) { c.save(); edDayCard(c, 'SAT', lerp(340 + 5 * 206, W / 2, satFocus), lerp(290, 380, satFocus), 1, satFocus, lerp(.82, 1.5, satFocus)); c.restore(); }
    // 片名 / title on the instrumental, bouncing on beats
    const tk = grpPop(t, 7.9, 15.2, .45, .4); if (tk > 0) { const b = beatAt(t); grpTitle(c, 'Every Day Is Fun!', W / 2, 520, tk * (1 + Math.pow(1 - b.f, 3) * .05), t, 120); }
    const tl = [[0, 'idle'], [heyT - .05, 'jump'], [heyT + .5, 'step'], [yeahT - .05, 'cheer'], [8.2, 'step'], [10.5, 'clap'], [12.8, 'pump'], [14.6, 'wave2'], [15.6, 'idle']];
    grpRow(c, t, tl, { tweak: (i, p) => {
      // 每張卡掉下時，相同位置附近的同學抬頭看 / kids glance up at each card as it lands
      const lastIdx = days.reduce((a, d, k) => (t >= d - .12 ? k : a), -1);
      if (lastIdx >= 0 && t < 7.9) p.look = clamp(((340 + lastIdx * 206) - p.x) / 500, -1, 1);
      if (t >= 15.6) { p.look = clamp((W / 2 - p.x) / 600, -1, 1); }
      return p; } });
    if (t > heyT) burst(c, W / 2, 560, prog(t, heyT, heyT + .6));
    if (t > yeahT) burst(c, W / 2, 560, prog(t, yeahT, yeahT + .6));
    grpNotes(c, t, 230, 620, prog(t, 8, 8.4) * (1 - prog(t, 15, 15.5)), 0); grpNotes(c, t, 1690, 620, prog(t, 8, 8.4) * (1 - prog(t, 15, 15.5)), 3);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
