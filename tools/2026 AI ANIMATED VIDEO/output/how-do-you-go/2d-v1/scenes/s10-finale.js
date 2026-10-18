// 場景 10：Final Chorus（最終副歌）＋尾奏。歌曲 126.86–172.133 s（SRT 第 42–52 句＋13.5 s 尾奏）。本地秒＝全曲−126.86。
// 全員跟原曲群唱對嘴。歌詞↔畫面：
//   Friends around the world(0) say hello!(2.48)          → 地球升起，"hello" 全員揮手
//   Taiwan(3.10) Singapore(3.92) Japan(4.74) Korea(5.74)   → 唱到哪一國，那位同學往前一步、頭上大國旗、身邊亮起
//   come and clap your hands!(5.94–7.28)                  → 全員隨拍點拍手（"clap"、"hands" 落在拍手上）
//   The UK(8.26) the USA(9.06)                            → UK、USA 同學依序往前
//   Friends at school(10.92–11.50)                        → 六人靠攏、學校發光
//   hip(12.30), hip(12.50), hooray!(13.18)                 → 兩次握拳＋大跳＋紙花
//   Here we go ×2(13.92–15.10) / Tell me, tell me(15.76) how do you go?(16.60) → pump / ear / shrug
//   Off to school — let's go!(17.60–21.0)                  → 指向學校 → "go" 跳
//   Different places(21.72), friends at school(23.10)      → 六張國家明信片在頭上排成一列，再收向學校
//   Learning together(24.38) is so cool!(27.34)           → 捧書 → "cool" 戴上墨鏡、歡呼
//   See you at school!(28.12–29.92) (Hello!)(31.08)       → 揮手 → 雙手大揮
//   尾奏 31.76–45.27                                       → 踏步、拍手、跳舞；最後走向學校，結尾字卡「See you at school!」，最後 1 秒淡出
const S10 = 126.86;
const W10 = { hello: 129.34, tw: 129.96, sg: 130.78, jp: 131.60, kr: 132.60, come: 132.80, uk: 135.12, us: 135.92, friends: 137.78, school1: 138.36, hip1: 139.16, hip2: 139.36, hooray: 140.04, here: 140.78, tell: 142.62, how: 143.46, off: 144.46, school2: 144.9, go: 147.6, diff: 148.58, fr2: 149.96, learn: 151.24, cool: 154.20, see: 154.98, hi: 157.94, outro: 158.62, walk: 166.6, end: 172.133 };
for (const k in W10) W10[k] -= S10;
const STEP10 = [W10.tw, W10.sg, W10.jp, W10.kr, W10.uk, W10.us];   // 各國被唱到的時間（依 ORDER）
const SCENE = {
  dur: 45.273, songStart: S10, tag: 'Friends at school!',
  draw(c, t) {
    const glow = Math.max(prog(t, W10.friends, W10.school1 + .3) * (1 - prog(t, W10.hooray + .3, W10.hooray + .9)),
                          prog(t, W10.fr2, W10.fr2 + .4) * (1 - prog(t, W10.learn, W10.learn + .5)), prog(t, W10.walk, W10.walk + 1));
    grpYard(c, t, { glow, pop: Math.sin(clamp(prog(t, W10.school2, W10.school2 + .45)) * Math.PI) });
    // 地球 / globe on "Friends around the world"
    const gk = E.out(prog(t, -.1, .6)) * (1 - E.in(prog(t, W10.tw - .3, W10.tw + .2)));
    if (gk > 0) { c.save(); c.globalAlpha = gk; grpGlobe(c, W / 2, 470 - (1 - gk) * 140, 170, t, t * 1.2, prog(t, W10.hello - .3, W10.hello + .6)); c.restore(); }
    // 明信片 / postcards on "Different places"
    for (let i = 0; i < 6; i++) {
      const k = grpPop(t, W10.diff + i * .15, W10.fr2 + .2), toSchool = E.inOut(prog(t, W10.fr2 + .2, W10.fr2 + .9));
      if (k <= 0 && toSchool <= 0) continue;
      const x = lerp(GRP_XS[i], W / 2, toSchool), y = lerp(330, 560, toSchool), s = (k > 0 ? k : 0) * (1 - toSchool * .8);
      if (s > .02) s10Postcard(c, ORDER[i], x, y, s, t, i);
    }
    const tl = [[0, 'sway'], [W10.hello - .1, 'wave2'], [W10.tw - .1, 'idle'], [W10.come, 'clap'], [W10.uk - .2, 'idle'], [W10.friends, 'idle'], [W10.hip1 - .05, 'pump'], [W10.hooray - .05, 'jump'],
      [W10.here - .2, 'pump'], [W10.tell, 'ear'], [W10.how, 'shrug'], [W10.off, 'point'], [W10.go - .05, 'jump'], [W10.go + .5, 'step'], [W10.diff, 'idle'], [W10.learn, 'book'], [W10.cool - .05, 'cheer'],
      [W10.see, 'wave'], [W10.hi - .05, 'wave2'], [W10.outro, 'step'], [W10.outro + 3.5, 'clap'], [W10.outro + 5.3, 'sway'], [W10.outro + 7.0, 'pump'], [W10.walk, 'idle']];
    grpRow(c, t, tl, { tweak: (i, p) => {
      // 唱到自己國家：往前一步並放大、身後亮圈 / step forward when your country is sung
      const st = STEP10[i], fw = Math.sin(clamp(prog(t, st - .1, st + 1.1)) * Math.PI);
      if (fw > 0) { p.y += 40 * fw; p.scale *= 1 + .12 * fw; p.hop = Math.max(p.hop || 0, Math.sin(clamp(prog(t, st - .05, st + .3)) * Math.PI) * 40); if (t < W10.come || t > W10.uk - .2) { p.ra = [lerp(p.ra[0], 2.45, fw), lerp(p.ra[1], .3 + Math.sin(t * 11) * .3, fw)]; } }
      // Friends at school：靠攏 / huddle
      const hd = prog(t, W10.friends - .2, W10.friends + .3) * (1 - prog(t, W10.hip1 - .2, W10.hip1)); if (hd > 0) p.x = lerp(p.x, W / 2 + (p.x - W / 2) * .78, E.inOut(hd));
      if (t >= W10.off && t < W10.go - .05) { p.look = clamp((960 - p.x) / 400, -1, 1); if (p.x > 1000) [p.la, p.ra] = [p.ra, p.la]; }
      // 尾奏最後：轉身走向學校 / outro: walk towards the school and shrink into depth
      const wk = E.inOut(prog(t, W10.walk, W10.walk + 3.4));
      if (wk > 0) { p.x = lerp(p.x, W / 2 + (p.x - W / 2) * .3, wk); p.y = lerp(p.y, 740, wk); p.scale *= 1 - .45 * wk; p.bounce = (p.bounce || 0) + Math.abs(Math.sin(t * 8 + i)) * 10 * wk; p.ra = [.25, .1]; p.la = [.25, .1]; }
      if (t > W10.cool - .05 && t < W10.see) p.shades = true;
      return p; } , sing: (tt) => tt < W10.outro + .3 });
    // 唱到國家時的大國旗 / big flag for the country being sung
    STEP10.forEach((st, i) => countryBubble(c, ORDER[i], GRP_XS[i], 470, grpPop(t, st - .05, st + 1.25), t));
    if (t > W10.come) for (const ct of [133.2 - S10, 133.66 - S10]) if (t > ct && t < ct + .4) for (const x of GRP_XS) grpClapFx(c, x, 640, 1.4 * (1 - (t - ct) / .4));
    // 墨鏡 / sunglasses on "cool"
    const sg = grpPop(t, W10.cool - .05, W10.see + .4); if (sg > .02) for (let i = 0; i < 6; i++) s10Shades(c, GRP_XS[i], 905 - (262 + 70) * .92 + 0, sg, t);
    grpConfetti(c, t, W10.hooray - .05); grpConfetti(c, t, W10.go - .05); grpConfetti(c, t, W10.hi - .05, 2.6);
    const k1 = grpPop(t, W10.hip1, W10.hooray + 1); if (k1 > 0) grpTitle(c, 'Hip, hip, hooray!', W / 2, 300, k1, t, 110);
    const k2 = grpPop(t, W10.learn, W10.see - .1); if (k2 > 0) grpTitle(c, 'Learning together!', W / 2, 300, k2, t, 92);
    const k3 = grpPop(t, W10.see - .05, W10.outro + 1.2); if (k3 > 0) grpTitle(c, 'See you at school!', W / 2, 300, k3, t, 110);
    // 結尾字卡 / end card
    const ek = grpPop(t, W10.walk + 2.6, 1e9, .5); if (ek > 0) { grpTitle(c, 'How Do You Go?', W / 2, 330, ek, t, 140); grpTitle(c, 'See you at school!', W / 2, 470, ek * .8, t, 70, '#fff'); }
    grpNotes(c, t, 300, 600, prog(t, W10.outro, W10.outro + .4) * (1 - prog(t, W10.walk, W10.walk + .5)), 2); grpNotes(c, t, 1620, 600, prog(t, W10.outro, W10.outro + .4) * (1 - prog(t, W10.walk, W10.walk + .5)), 5);
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
    // 最後 1 秒淡出 / fade out over the final second
    const fo = prog(t, SCENE.dur - 1.0, SCENE.dur); if (fo > 0) { c.fillStyle = `rgba(255,255,255,${fo})`; c.fillRect(-20, -20, W + 40, H + 40); }
  },
};
function s10Postcard(c, code, x, y, s, t, i) {   // 國家明信片：國旗＋國名 / country postcard
  c.save(); c.translate(x, y + Math.sin(t * 3 + i) * 6); c.rotate((i % 2 ? 1 : -1) * .06); c.scale(s, s);
  rr(c, -110, -80, 220, 170, 16); fillStroke(c, '#fffaf0', 6); c.save(); c.translate(-80, -62); drawFlag(c, code, 160); c.restore();
  c.font = '800 30px "Inter","Segoe UI",sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText({ TW: 'Taiwan', SG: 'Singapore', JP: 'Japan', KR: 'Korea', UK: 'the UK', US: 'the USA' }[code], 0, 74); c.restore();
}
function s10Shades(c, x, y, k, t) {   // 墨鏡 / cool sunglasses
  c.save(); c.translate(x, y - (1 - Math.min(1, k)) * 120); c.scale(.92 * Math.min(1, k), .92 * Math.min(1, k)); c.fillStyle = '#1d1a24';
  for (const sx of [-26, 26]) { rr(c, sx - 24, -14, 48, 30, 10); c.fill(); }
  c.fillRect(-4, -8, 8, 6); c.fillStyle = 'rgba(255,255,255,.6)'; for (const sx of [-34, 18]) c.fillRect(sx, -9, 10, 5); c.restore();
}
