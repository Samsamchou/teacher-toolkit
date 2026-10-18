// 場景 11：Outro。歌曲 170.80–190.00 s（第 51–52 句＋前後音樂）。本地秒＝全曲−170.80。六人群唱，全員對嘴。
// 歌詞↔畫面（字時取自 engine/song-data.js 與 data/asr-*.json）：
//   前奏 0–3.86                                  → 放學：六人從校門走出來，夕陽
//   #51 Seven(3.86) days, seven(5.82) days, see(6.76) you on Monday!(8.40) → "Seven days" 七張星期卡在校門上方排成彩虹（兩次 "seven" 各長出一半）；"see you" 揮手；"Monday" MON 卡放大發光
//   間奏 10–13.44                                → 六人左右擺
//   #52 (bye-bye!)(13.44–16.0，實唱約 5 次 bye)  → 雙手大揮；之後結尾片名卡「Every Day Is Fun! See you on Monday!」，最後 1 秒淡出
const S11 = 170.80;
const SCENE = {
  dur: 19.20, songStart: S11, tag: 'See you on Monday!',
  draw(c, t) {
    const q51 = SONG.cues[50][3], seven1 = q51[0][0] - S11, seven2 = q51[2][0] - S11, see = q51[4][0] - S11, mon = q51[7][0] - S11, bye = SONG.cues[51][0] - S11;
    grpYard(c, t, {});
    const g = c.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, 'rgba(255,140,90,.35)'); g.addColorStop(1, 'rgba(255,210,140,.15)'); c.fillStyle = g; c.fillRect(0, 0, W, 760);   // 夕陽 / sunset
    // 星期卡彩虹：第一個 "seven" 出前四張，第二個出後三張 / rainbow arc of day cards
    ED_DAY_ORDER.forEach((d, i) => {
      const t0 = i < 4 ? seven1 + i * .18 : seven2 + (i - 4) * .18, k = grpPop(t, t0, 1e9, .35); if (k <= 0) return;
      const a = Math.PI * (1 - i / 6), x = W / 2 + Math.cos(a) * 640, y = 420 - Math.sin(a) * 250;
      const isMon = d === 'MON', mk = isMon ? E.out(prog(t, mon - .05, mon + .35)) * (1 - prog(t, 12.5, 13.2)) : 0;
      edDayCard(c, d, lerp(x, W / 2, mk), lerp(y, 330, mk), k * (1 - prog(t, 16.0, 16.6)), isMon ? Math.max(mk, 0) : 0, lerp(.7, 1.5, mk));
    });
    // 六人：0–3.86 從校門走出（由小變大）/ walk out of the school gate, growing from depth
    const out = E.out(prog(t, 0, 3.6));
    const tl = [[0, 'idle'], [see - .1, 'wave'], [mon - .05, 'cheer'], [10.0, 'sway'], [bye - .1, 'wave2'], [16.2, 'idle']];
    grpRow(c, t, tl, { tweak: (i, p) => {
      p.x = lerp(W / 2 + (p.x - W / 2) * .3, p.x, out); p.y = lerp(760, p.y, out); p.scale *= lerp(.5, 1, out);
      if (t < 3.6) p.bounce = (p.bounce || 0) + Math.abs(Math.sin(t * 8 + i)) * 10;
      return p; } });
    // 結尾片名卡 / end card
    const ek = grpPop(t, 16.2, 1e9, .5);
    if (ek > 0) { grpTitle(c, 'Every Day Is Fun!', W / 2, 330, ek, t, 130); grpTitle(c, 'See you on Monday!', W / 2, 470, ek * .85, t, 72, '#fff'); }
    if (t > mon) burst(c, W / 2, 330, prog(t, mon, mon + .7));
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
    const fo = prog(t, SCENE.dur - 1.0, SCENE.dur); if (fo > 0) { c.fillStyle = `rgba(255,255,255,${fo})`; c.fillRect(-20, -20, W + 40, H + 40); }   // 最後 1 秒淡出 / fade out
  },
};
