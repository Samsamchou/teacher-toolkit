// 場景 00：Intro（開場）。歌曲 0–14.83 s（SRT 第 1–4 句＋6.8 s 前奏）。本地時間＝全曲時間。
// 六人與地球登場，全員跟原曲群唱對嘴。歌詞↔畫面：
//   Where are you from?(0–1.02) → 地球滾入舞台中央，六人依序彈出（每個字兩人）
//   (Hey!)(1.44)                → 全員跳起＋星星
//   How do you go?(2.02–2.88)   → 攤手（shrug），六個交通圖示繞著地球轉出
//   (Let's go!)(3.28)           → 指向前方＋小跳
//   Friends around the world(4.44–5.44) → 每人頭上依序彈出自己的國旗，地球插上六國圖釘
//   Come and sing along!(6.08–7.30) → 招手（wave2）→ "sing" 起出現音符 → 拍手
//   前奏 8.00–14.83             → 標題「How Do You Go?」隨拍點跳動；踏步、握拳、拍手，最後揮手換場
const SCENE = {
  dur: 14.83, songStart: 0, tag: 'How Do You Go?',
  draw(c, t) {
    grpSky(c, t, '#a7e3ff', '#fff4dd', 780);
    c.fillStyle = '#9fd38b'; c.fillRect(0, 700, W, 90); c.fillStyle = '#f2dcc0'; c.fillRect(0, 780, W, H - 780);
    grpBunting(c, t, 30);
    // 地球：0–1.0 s 從右滾入；之後慢轉 / globe rolls in then spins slowly
    const gx = track([[0, W + 300], [1.0, W / 2, 'out']], t), gr = 190, spin = -(gx - W / 2) / gr + t * .6;
    const gy = 430 + (t > 8 ? -Math.max(0, 1 - beatAt(t).f * 4) * 10 : 0);
    const titleK = E.back(prog(t, 8.0, 8.5));
    if (t < 9.5) grpGlobe(c, gx, gy - E.inOut(prog(t, 8, 9)) * 600, gr, t, spin, prog(t, 4.44, 5.6));
    // 交通圖示繞地球 / transport icons orbit the globe on "How do you go?"
    const ok = grpPop(t, 2.02, 4.3, .4, .4);
    if (ok > 0) ['car', 'bus', 'metro', 'train', 'foot', 'scooter'].forEach((k, i) => { const a = t * .9 + i * Math.PI / 3; transportIcon(c, k, gx + Math.cos(a) * 330, gy + Math.sin(a) * 190, ok * .55); });
    // 標題 / title on the instrumental, bouncing on beats
    if (titleK > 0) { const b = beatAt(t), bb = 1 + Math.pow(1 - b.f, 3) * .05 * (t > 8.5 ? 1 : 0); grpTitle(c, 'How Do You Go?', W / 2, 330, titleK * bb * (1 - E.in(prog(t, 14.2, 14.8))), t, 150); }
    // 六人依序彈出 / kids pop in two per word
    const popT = [0, .1, .62, .72, .86, 1.0];
    const tl = [[0, 'idle'], [1.3, 'jump'], [1.9, 'shrug'], [3.2, 'point'], [3.9, 'idle'], [6.0, 'wave2'], [6.9, 'clap'], [8.0, 'step'], [9.8, 'pump'], [11.6, 'clap'], [13.4, 'step'], [14.1, 'wave']];
    const rows = grpRow(c, t, tl, { tweak: (i, p) => {
      const k = E.back(prog(t, popT[i], popT[i] + .35)); if (k <= 0) { p.hidden = true; return p; }
      p.scale *= k; p.hop = (p.hop || 0) + (1 - k) * 80;
      const hey = Math.sin(clamp(prog(t, 1.4, 1.75)) * Math.PI), lg = Math.sin(clamp(prog(t, 3.28, 3.6)) * Math.PI);
      p.hop = Math.max(p.hop, hey * 70, lg * 35);
      return p; } });
    // 國旗泡泡依序 / flag bubbles one by one on "Friends around the world"
    rows.forEach((r, i) => { const t0 = 4.44 + i * .17; countryBubble(c, ORDER[i], r.x, 470, grpPop(t, t0, 7.6) * .8, t); });
    if (t > 1.44) burst(c, W / 2, 520, prog(t, 1.44, 2.1));
    grpNotes(c, t, 300, 560, prog(t, 7.0, 7.4) * (1 - prog(t, 13.5, 14)), 0); grpNotes(c, t, 1620, 560, prog(t, 7.0, 7.4) * (1 - prog(t, 13.5, 14)), 3);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
