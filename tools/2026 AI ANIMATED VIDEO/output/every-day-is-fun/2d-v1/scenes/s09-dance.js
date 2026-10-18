// 場景 09：Dance Break。歌曲 133.58–151.78 s（第 40–46 句，實唱星期口號 7 句）。本地秒＝全曲−133.58。六人群唱，全員對嘴。
// 歌詞↔畫面（字時由 SONG 自動取得）：
//   #40 #42 #44 #46 Monday, Tuesday, Wednesday, hey! → 舞台後方 MON／TUE／WED 三張大卡依字點亮；每次 "hey!" 換一種跳法（大跳／轉圈／雙手高舉／蹲跳）
//   #41 #43 #45     Thursday, Friday, Saturday, Sunday! → THU～SUN 四張依字點亮；每句換一次隊形（一排 → 前後兩排 → V 字）
//   地板格子與燈光隨拍點閃動（grpStage）
const S9 = 133.58;
const SCENE = {
  dur: 18.20, songStart: S9, tag: 'Dance break!',
  draw(c, t) {
    const st = t + S9;
    grpStage(c, t, st);
    const lines = SONG.cues.slice(39, 46);                           // 7 句口號 / the seven chant lines
    // 點亮的星期：取目前已唱到的最後一個星期字 / the most recently sung day word
    let litDay = null, litT = -9;
    for (const q of lines) for (const w of q[3]) { const m = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.exec(w[2]); if (m && st >= w[0] && w[0] > litT) { litT = w[0]; litDay = m[1].toUpperCase(); } }
    ED_DAY_ORDER.forEach((d, i) => {
      const lit = d === litDay ? 1 - prog(st, litT + .25, litT + .7) * .5 : 0;
      edDayCard(c, d, 300 + i * 220, 250 - (d === litDay ? 18 * (1 - prog(st, litT, litT + .25)) : 0), 1, lit, d === litDay ? .95 : .78);
    });
    // 每個 "hey!" 的時間與跳法 / hey times and their jump styles
    const heys = lines.filter((q, k) => k % 2 === 0).map(q => q[3].find(w => /^hey/i.test(w[2]))[0] - S9);
    const styles = ['jump', 'spin', 'cheer', 'squat'];
    const thuStarts = lines.filter((q, k) => k % 2 === 1).map(q => q[0] - S9);
    const formation = thuStarts.filter(x => t >= x).length;           // 0 一排 → 1 兩排 → 2 V 字 → 3 一排
    const tl = [[0, 'step'], [2.6, 'clap'], [5.0, 'pump'], [7.6, 'sway'], [10.0, 'step'], [12.6, 'clap'], [15.0, 'pump'], [17.2, 'cheer']];
    grpRow(c, t, tl, { tweak: (i, p) => {
      const f = formation % 4, k = E.inOut(prog(t, (thuStarts[formation - 1] ?? -9), (thuStarts[formation - 1] ?? -9) + .45));
      const tgt = f === 1 ? { dy: i % 2 ? -70 : 0, s: i % 2 ? .88 : 1, dx: 0 } : f === 2 ? { dy: -Math.abs(i - 2.5) * -26 - 70, s: 1 - Math.abs(2.5 - i) * -.03 - .1, dx: 0 } : { dy: 0, s: 1, dx: 0 };
      const prevF = (formation - 1 + 4) % 4, src = prevF === 1 ? { dy: i % 2 ? -70 : 0, s: i % 2 ? .88 : 1 } : prevF === 2 ? { dy: -Math.abs(i - 2.5) * -26 - 70, s: 1 - Math.abs(2.5 - i) * -.03 - .1 } : { dy: 0, s: 1 };
      const dy = formation === 0 ? 0 : lerp(src.dy, tgt.dy, k), sc = formation === 0 ? 1 : lerp(src.s, tgt.s, k);
      p.y += dy; p.scale *= sc;
      heys.forEach((h, n) => {
        const u = prog(t, h - .05, h + .45); if (u <= 0 || u >= 1) return;
        const style = styles[n % 4];
        if (style === 'jump' || style === 'cheer') { p.hop = Math.sin(u * Math.PI) * (style === 'jump' ? 80 : 50); p.la = [2.6, .2]; p.ra = [2.6, .2]; }
        if (style === 'spin') { p.hop = Math.sin(u * Math.PI) * 40; p.sway = Math.sin(u * Math.PI * 2) * .35; p.la = [2.2, .3]; p.ra = [.9, .5]; }   // 左右甩身 / body swing
        if (style === 'squat') { p.y += Math.sin(u * Math.PI) * 50; p.la = [1.4, .3]; p.ra = [1.4, .3]; }
      });
      return p; } , y: 905 });
    for (const h of heys) if (t > h) burst(c, W / 2, 520, prog(t, h, h + .6));
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
