// 場景 09：Bridge 交通工具口號＋Dance Break（舞蹈段）。歌曲 105.44–126.86 s（SRT 第 38–41 句＋約 13.4 s 舞蹈段）。
// 本地秒＝全曲−105.44。全員跟原曲群唱對嘴（舞蹈段的 Friends, let's go／Ah／Ooh 也對嘴，但不上字幕）。
//   Car(0) bus(0.74) metro(1.12) train(1.68)! → 四張交通卡依字砸進上方一排，全員依序指向
//   (Hey!)(2.20)                               → 全員跳起
//   On foot(2.60), scooter(2.78)               → 步行、機車卡補上，六張到齊
//   say it again!(3.30)                        → 手放耳邊（ear）
//   Car, bus, metro, train!(3.78–5.22)          → 每張卡在唱到時再放大閃一次；(Hey!)(5.60) 跳
//   Let's go, let's go!(5.94–7.04)             → 握拳往上（pump），卡片飛走
//   舞蹈段 8.04–21.42                          → 變成舞台燈光；踏步→拍手→歡呼(Friends, let's go 12.56)→左右擺(Ah 15.32)→雙手揮(Ooh 18.16)→跳
const S9 = 105.44;
const ICONS9 = [['car', 105.44], ['bus', 106.18], ['metro', 106.56], ['train', 107.12], ['foot', 108.04], ['scooter', 108.22]].map(([k, s]) => [k, s - S9]);
const AGAIN9 = [109.22, 109.70, 110.12, 110.66].map(x => x - S9);
const T9 = { hey1: 107.64 - S9, say: 108.74 - S9, hey2: 111.04 - S9, lets: 111.38 - S9, end: 113.48 - S9, stage: 113.9 - S9, fr: 118.0 - S9, ah: 120.76 - S9, ooh: 123.6 - S9, jump: 125.9 - S9 };
const SCENE = {
  dur: 21.42, songStart: S9, tag: 'Car, bus, metro, train!',
  draw(c, t) {
    // 背景：操場 → 舞台（7.9–8.6 s 燈光漸入）/ yard cross-fades into the dance stage
    const sk = E.inOut(prog(t, T9.stage - .5, T9.stage + .3));
    if (sk < 1) grpYard(c, t, {});
    if (sk > 0) { c.save(); c.globalAlpha = sk; grpStage(c, t, t + S9); c.restore(); }
    // 交通卡一排 / row of six transport cards
    const xs = [310, 570, 830, 1090, 1350, 1610];
    ICONS9.forEach(([k, t0], i) => {
      let s = grpPop(t, t0 - .06, T9.lets + .2, .25, .3);
      const ag = AGAIN9[i]; if (ag !== undefined) s *= 1 + Math.sin(clamp(prog(t, ag, ag + .3)) * Math.PI) * .25;
      const fly = E.in(prog(t, T9.lets + .2, T9.lets + .8));
      transportIcon(c, k, xs[i], 300 - fly * 500, s * .85);
    });
    const tl = [[0, 'point'], [T9.hey1 - .05, 'jump'], [T9.hey1 + .4, 'point'], [T9.say, 'ear'], [AGAIN9[0], 'point'], [T9.hey2 - .05, 'jump'], [T9.lets, 'pump'], [T9.end, 'clap'],
      [T9.stage, 'step'], [T9.fr - .6, 'clap'], [T9.fr, 'cheer'], [T9.ah, 'sway'], [T9.ooh, 'wave2'], [T9.jump, 'jump']];
    grpRow(c, t, tl, { tweak: (i, p) => {
      // 指向剛唱到的那張卡 / point at the card just sung
      if (p.ra && t < T9.lets && !(t > T9.say && t < AGAIN9[0])) {
        let tgt = null; for (const [k, t0] of ICONS9) if (t >= t0 - .05) tgt = xs[ICONS9.findIndex(x => x[1] === t0)];
        for (let j = 0; j < AGAIN9.length; j++) if (t >= AGAIN9[j] - .05) tgt = xs[j];
        if (tgt !== null && (t < T9.hey1 - .05 || t > T9.hey1 + .4) && (t < T9.hey2 - .05)) { p.look = clamp((tgt - p.x) / 400, -1, 1); if (tgt < p.x - 40) [p.la, p.ra] = [p.ra, p.la]; }
      }
      // 舞蹈段：前後兩排交錯（奇數人往後一點、縮小）/ dance break: two staggered lines
      const fk = E.inOut(prog(t, T9.stage, T9.stage + .8)); if (fk > 0 && i % 2) { p.y -= 70 * fk; p.scale *= 1 - .1 * fk; }
      if (fk > 0) p.x = lerp(p.x, W / 2 + (p.x - W / 2) * .86, fk);
      return p; } });
    if (t > T9.hey1) burst(c, W / 2, 520, prog(t, T9.hey1, T9.hey1 + .6));
    if (t > T9.hey2) burst(c, W / 2, 520, prog(t, T9.hey2, T9.hey2 + .6));
    const lk = grpPop(t, T9.lets - .05, T9.end + .2); if (lk > 0) grpTitle(c, "Let's go!", W / 2, 330, lk, t, 120);
    const dk = grpPop(t, T9.stage + .3, T9.stage + 2.6); if (dk > 0) grpTitle(c, 'Dance time!', W / 2, 300, dk, t, 120, '#ff8c78');
    const fk2 = grpPop(t, T9.fr, T9.fr + 1.6); if (fk2 > 0) grpTitle(c, "Friends, let's go!", W / 2, 300, fk2, t, 96, '#9fe3c7');
    grpNotes(c, t, 260, 620, prog(t, T9.ah, T9.ah + .4), 1); grpNotes(c, t, 1660, 620, prog(t, T9.ah, T9.ah + .4), 4);
    grpConfetti(c, t, T9.jump);
    tag(c, sk > .5 ? 'Dance break!' : SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
