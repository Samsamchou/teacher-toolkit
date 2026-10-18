// 場景 06：Chorus 2。歌曲 87.84–106.10 s（第 28–31 句＋oh oh 和聲）。本地秒＝全曲−87.84。六人群唱，全員對嘴。
// 歌詞↔畫面與 S03 相同（engine/chorus.js）；為避免重複，舞台改成午後暖光、六人前後兩排交錯（奇數位往後一排、稍小）。
//   #28 Monday to Sunday, every day is fun!           → 布條左→右亮；"fun!" 小跳
//   #29 Class by class, friend by friend, we are one! → 擊掌 → 手牽手 → "one" 大愛心
//   (oh, oh, oh) 95.3–97.1                            → 手牽手左右擺
//   #30 Monday to Sunday, every day is fun!           → 布條右→左亮
//   #31 Sing it with me, everybody, one, two, three! (hey!) → 指鏡頭 → 張手 → 1、2、3 → "hey!" 大跳＋紙花
const S6 = 87.84;
const SCENE = {
  dur: 18.26, songStart: S6, tag: 'Every day is fun!',
  draw(c, t) {
    const Wt = edChorusTimes(27, S6);
    grpYard(c, t, {});
    const g = c.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, 'rgba(255,170,90,.28)'); g.addColorStop(1, 'rgba(255,220,150,.08)'); c.fillStyle = g; c.fillRect(0, 0, W, 760);   // 午後暖光 / warm afternoon tint
    edChorusBanner(c, t, Wt, 240);
    edChorusKids(c, t, Wt, { tweak: (i, p) => { if (i % 2) { p.y -= 60; p.scale *= .9; } return p; } });
    edChorusFx(c, t, Wt);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
