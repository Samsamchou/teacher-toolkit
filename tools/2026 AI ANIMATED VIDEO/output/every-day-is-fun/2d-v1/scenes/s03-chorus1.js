// 場景 03：Chorus 1。歌曲 45.92–64.66 s（第 13–16 句＋oh oh 和聲）。本地秒＝全曲−45.92。六人群唱，全員對嘴。
// 歌詞↔畫面（字時由 SONG 自動取得，見 engine/chorus.js 開頭的對照表）：
//   #13 Monday to Sunday, every day is fun!            → 布條七格左→右依序亮；"fun!" 握拳小跳＋星星
//   #14 Class by class, friend by friend, we are one!  → 兩兩擊掌 → 手牽手 → 靠攏，"one" 冒出大愛心
//   (oh, oh, oh, oh) 53.8–55.5                         → 手牽手左右擺
//   #15 Monday to Sunday, every day is fun!            → 布條右→左再亮一次；"fun!" 握拳小跳
//   #16 Sing it with me, everybody, one, two, three! (hey!) → 指向鏡頭 → 張開雙手 → 頭上彈出 1、2、3 → "hey!" 大跳＋紙花
const S3 = 45.92;
const SCENE = {
  dur: 18.74, songStart: S3, tag: 'Monday to Sunday!',
  draw(c, t) {
    const Wt = edChorusTimes(12, S3);
    grpYard(c, t, {});
    edChorusBanner(c, t, Wt);
    edChorusKids(c, t, Wt);
    edChorusFx(c, t, Wt);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
