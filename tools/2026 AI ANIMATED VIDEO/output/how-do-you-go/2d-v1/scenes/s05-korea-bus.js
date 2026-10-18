// 場景 05：Korea | by bus。歌曲 52.38–69.66 s（男女對唱：日本男孩問、韓國女孩答）。本地時間 t 從 0 起算。
// 動作依原曲逐字時碼（engine/song-data.js）編排，每個關鍵字都有對應畫面：
//   Where are you from?(0–0.92)        → 男孩（JP）攤手發問、"from" 時頭上跳出「?」
//   I'm from Korea(2.08)               → 女孩（KR）手放胸前；韓國國旗泡泡
//   Hello(2.86), hello(3.86)!          → 兩人向鏡頭揮手，第二次 hello 雙手揮
//   It's nice to see(5.92) you!        → 互相靠近、"see" 擊掌（星光）
//   How do you go to school(8.30)?     → 男孩再攤手問、「?」
//   I go to school by bus(10.14)       → 女孩指向公車站牌＋「by bus」字卡
//   The bus(10.98) is here(11.46)!     → 藍色市區公車從左駛入、"here" 停穩車身前傾回彈；兩人歡呼跳起
//   I wave(12.36) goodbye(12.78)       → 女孩向候車亭下的爸爸揮手，爸爸揮手回應
//   Let's(14.36) go to school(15.08)!  → 轉側面走向車門、"school" 踏上車門階梯
//   (You(15.44) and(16.26) I(16.70)!)  → 門口轉回正面：互指 → 牽手 → 牽手舉高跳起＋星星爆發
// 對嘴（同一條原曲人聲包絡，只給當句的演唱者）：男孩唱兩句問句；女孩唱 I'm from Korea / I go… / The bus is here…；
//   Hello…nice to see you 與 Let's go…You and I 兩人一起唱。
// 嘴型資料：scenes/s05-korea-bus.lipsync.js（lipsync/song_lipsync.py --start 52.38 --dur 17.28）
const S5_DAD = { skin: '#f3cfb3', hair: '#1f1a1f', pony: false, jacket: '#6f82b8', jacketD: '#596b9e', under: '#fff', pants: '#3b3f4a', shoe: '#4a3f3a', pack: null, blinkOff: .6, adult: true };
const WT5 = { from1: .60, korea: 2.08, hello1: 2.86, hello2: 3.86, its: 4.36, nice: 5.22, see: 5.92, you1: 6.38, how: 6.96, school1: 8.30, i1: 9.02, bus1: 10.14,
  the: 10.56, bus2: 10.98, here: 11.46, i2: 11.88, wave: 12.36, goodbye: 12.78, lets: 14.36, go: 14.70, school3: 15.08, you2: 15.44, and: 16.26, i3: 16.70 };
// 誰在唱（本地秒區間）/ who sings when
const S5_SING = { JP: [[0, .95], [2.86, 8.68], [14.36, 17.28]], KR: [[1.36, 6.96], [9.0, 13.78], [14.36, 17.28]] };
const S5_GY = 805, S5_FEET = 900;                    // 車道地面 / road ground；人行道站位 / sidewalk feet line
const S5_BUS_STOP = 290, S5_DOOR = [930, 1230];      // 公車停靠時車尾 x；車門（公車本地座標）/ door span in bus coords
const SCENE = {
  dur: 17.28, songStart: 52.38, tag: 'Korea | by bus',
  draw(c, t) {
    s05City(c, t);
    // 公車：10.0→11.46 s 從左駛入，"here" 停穩；停車時車頭下沉再回彈 / bus pulls in and settles on "here"
    const bx = track([[0, -1750], [10.0, -1750], [WT5.here, S5_BUS_STOP, 'out']], t);
    const u = t - WT5.here + .08, pitch = u > 0 ? Math.sin(u * 11) * Math.exp(-u * 4.5) * .018 : 0;
    const open = track([[0, 0], [11.62, 0], [12.05, 1, 'out']], t);
    s05Bus(c, bx, S5_GY, bx / 62, pitch, open, t);
    if (open > 0 && open < 1) s05Puff(c, bx + 1080, S5_GY - 40, open);    // 開門「噗嘶」/ door hiss
    s05Shelter(c, t);
    s05StopSign(c, 1180, t);
    // 爸爸：候車亭下送行，"goodbye" 揮手回應 / dad waves back on "goodbye"
    const dw = s05W(t, WT5.wave + .1, 15.4, .25), bt = s05Beat(t);
    kidFront(c, S5_DAD, { x: 330, y: 880, scale: .78, look: 1, bounce: bt * 4, la: [.2, .15], ra: s05Mix([.2, .15], [[dw, [2.45, .4 + Math.sin(t * 10) * .45]]]), sway: .02 * dw }, t);
    // 兩個孩子 / the two kids
    for (const who of ['JP', 'KR']) s05Kid(c, who, t);
    // 「?」：兩句問句 / question cards
    const q1 = E.back(prog(t, WT5.from1, WT5.from1 + .3)) * (1 - prog(t, 1.5, 1.8)), q2 = E.back(prog(t, WT5.school1, WT5.school1 + .3)) * (1 - prog(t, 9.0, 9.3));
    if (q1 > 0) wordCard(c, 800, 440, '?', q1);
    if (q2 > 0) wordCard(c, 800, 440, '?', q2);
    // "Korea"：國旗泡泡 / flag bubble
    const fk = E.back(prog(t, WT5.korea, WT5.korea + .35)) * (1 - prog(t, 4.1, 4.45));
    countryBubble(c, 'KR', 1080, 430, fk, t);
    // "see"：擊掌星光 / high-five sparkle
    if (t > WT5.see && t < WT5.see + .7) s05Spark(c, 940, 600, prog(t, WT5.see, WT5.see + .7));
    // "by bus" 字卡 / word card
    const ck = E.back(prog(t, WT5.bus1, WT5.bus1 + .3)) * (1 - prog(t, 11.9, 12.2));
    if (ck > 0) wordCard(c, 1420, 300, 'by bus', ck);
    // "I!"：門口星星爆發 / burst on the final "I"
    if (t > WT5.i3) burst(c, 1370, 470, prog(t, WT5.i3, WT5.i3 + .6));
    tag(c, SCENE.tag, .2, t);
    drawLyrics(c, t);
  },
};
// ── 小工具 / helpers ──
function s05W(t, a, b, r = .2) { return prog(t, a - r, a) * (1 - prog(t, b - r, b)); }          // 在 a 時到位、b 時收回 / pose window
function s05Mix(base, layers) { let v = base.slice(); for (const [w, a] of layers) if (w > 0) v = [lerp(v[0], a[0], w), lerp(v[1], a[1], w)]; return v; }
function s05Beat(t) { return Math.pow(1 - beatAt(t + SCENE.songStart).f, 3); }                 // 拍點脈衝 / beat pulse
function s05Sings(who, t) { return S5_SING[who].some(([a, b]) => t >= a && t < b); }
const S5_WAVE = (t, ph = 0) => [2.45, .4 + Math.sin(t * 11 + ph) * .45];

// 孩子：正面對話 → 側面走向車門、踏上階梯 → 門口轉回正面 / front dialogue → side walk & board → front again
function s05Kid(c, who, t) {
  const ch = CAST[who], jp = who === 'JP', sg = jp ? 1 : -1;      // sg：朝向對方的方向 / toward the partner
  const bt = s05Beat(t), sing = s05Sings(who, t);
  // 位置：說「nice to see you」時靠近；"Let's go" 走到車門；"school" 踏上階梯 / position track
  const x0 = jp ? 800 : 1080, x1 = jp ? 835 : 1045, xd = jp ? 1300 : 1445;
  const x = track([[4.4, x0], [5.3, x1], [13.95, x1], [14.95, xd, 'inOut']], t);
  const stepK = prog(t, 14.95, 15.3), y = lerp(S5_FEET, 752, E.inOut(stepK)) - Math.sin(stepK * Math.PI) * 34;
  const scale = lerp(.85, .72, E.inOut(stepK));
  const turn = prog(t, 13.72, 13.95) * (1 - prog(t, 15.3, 15.52));   // 0 正面 / 1 側面（卡通壓扁翻面）
  const talk = sing ? mouthAt(t) : 0, round = sing ? roundAt(t) : 0;
  if (turn >= .5) {   // 側面走路 / side view walking
    const moving = t > 13.95 && t < 15.3;
    const raise = jp ? 0 : s05W(t, WT5.lets, 15.2, .25), point = jp ? s05W(t, WT5.go, 15.25, .25) : 0;
    c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(x, y + 4, 62 * scale, 12 * scale, 0, 0, 7); c.fill();
    kid(c, ch, { x, y, face: Math.max(.04, turn * 2 - 1), walk: (t - 13.95) * 9.5, moving, raise, point, talk, round, scale, look: 1,
      lean: moving ? .06 : 0, hairSway: Math.sin(t * 3) * .05 }, t);
    return;
  }
  // 正面姿勢時間軸 / front pose timeline
  const base = [.2, .15], out = jp ? 'la' : 'ra', inn = jp ? 'ra' : 'la';   // 外側手 / 內側手（朝對方）
  let A = { la: base, ra: base };
  const doorPhase = t > 15.3;
  const shrug = jp ? Math.max(s05W(t, 0, 1.05), s05W(t, WT5.how, 8.75)) : 0;                     // 男孩攤手問 / palms-up question
  const chest = jp ? 0 : s05W(t, 1.5, 2.9);                                                       // "I'm from Korea" 手放胸前
  const hi1 = s05W(t, WT5.hello1, WT5.hello2 - .05, .22), hi2 = s05W(t, WT5.hello2, 4.5, .18);  // 揮手 / waves
  const five = s05W(t, WT5.see - .02, 6.75, .4);                                                  // 擊掌 / high-five
  const pointSign = jp ? 0 : s05W(t, WT5.i1 + .35, 10.55, .3);                                   // 女孩指公車站牌
  const cheer = doorPhase ? 0 : s05W(t, WT5.here, 12.1, .2);                                      // "here" 歡呼
  const bye = jp ? 0 : s05W(t, WT5.wave, 13.75, .25);                                             // "wave goodbye"
  const youP = doorPhase ? s05W(t, WT5.you2 + .1, WT5.and, .2) : 0;                               // 互指 / point at each other
  const hold = doorPhase ? prog(t, WT5.and - .2, WT5.and) : 0, lift = doorPhase ? prog(t, WT5.i3 - .2, WT5.i3) : 0;   // 牽手 → 舉高
  // 外側手：揮手、歡呼；女孩另用右手（外側）放胸前、指站牌 / outer arm: waves, cheer (+ KR chest & sign point)
  A[out] = s05Mix(base, [[shrug, [.9, -1.4]], [chest, [-.35, -1.8]], [hi1, S5_WAVE(t)], [hi2, S5_WAVE(t, 1)], [pointSign, [2.35, -.15]], [cheer, [2.6, .2]], [lift, [2.6, .2]]]);
  // 內側手（朝對方）：擊掌、揮別爸爸（女孩左手）、互指、牽手 / inner arm: high-five, goodbye wave, point, hold hands
  A[inn] = s05Mix(base, [[shrug, [.9, -1.4]], [hi2, S5_WAVE(t, 2)], [five, [2.45, -.35]], [cheer, [2.6, .2]], [bye, S5_WAVE(t, .5)],
    [youP, [1.75, -.1]], [hold * (1 - lift), [.62, .05]], [lift, [2.3, -.25]]]);
  // 看哪裡：看對方；看站牌；公車從左來時看左；揮別看爸爸 / gaze
  let look = jp ? 1 : -1;
  if (!jp) look = lerp(look, 1, s05W(t, WT5.i1 + .3, 9.95, .25));
  look = lerp(look, -1, s05W(t, 10.2, 11.3, .2));
  look = lerp(look, 0, s05W(t, 11.5, 12.2, .2));
  look = lerp(look, -1, s05W(t, 12.35, 13.7, .2));
  if (doorPhase) look = lerp(sg, 0, lift);
  const hop = (Math.sin(clamp(prog(t, WT5.here, WT5.here + .42)) * Math.PI) + Math.sin(clamp(prog(t, WT5.i3, WT5.i3 + .42)) * Math.PI)) * 50;
  const nod = sg * .06 * (s05W(t, 0, 1.0) + s05W(t, WT5.how, 8.7)) * (jp ? 1 : 0) + (jp ? 0 : -.08 * s05W(t, WT5.how + .2, 8.7)) + Math.sin(t * 6.5) * .03 * (1 - shrug);
  const p = { x, y, scale, la: A.la, ra: A.ra, bounce: bt * 6, hop, talk, round, look, nod, sway: sg * .03 * five };
  if (turn > 0) { const k = Math.max(.04, 1 - turn * 2); c.save(); c.translate(x, 0); c.scale(k, 1); c.translate(-x, 0); kidFront(c, ch, p, t); c.restore(); }
  else kidFront(c, ch, p, t);
}

// ── 背景：首爾街景 / Seoul street ──
function s05City(c, t) {
  const g = c.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, '#a6daf6'); g.addColorStop(1, '#eaf7ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (const [cx, cy, s, v] of [[260, 120, 1, 10], [1000, 80, 1.2, 7], [1580, 170, .8, 13]]) s05Cloud(c, ((cx + t * v) % 2300) - 200, cy, s);
  // 遠山＋南山塔 / far hills + N Seoul Tower
  c.fillStyle = '#b5d9c6'; c.beginPath(); c.moveTo(0, 470); c.quadraticCurveTo(300, 300, 620, 420); c.quadraticCurveTo(900, 250, 1240, 400); c.quadraticCurveTo(1560, 300, 1920, 430); c.lineTo(1920, 600); c.lineTo(0, 600); c.fill();
  c.fillStyle = '#93b9a8'; rr(c, 905, 210, 14, 90, 4); c.fill(); rr(c, 888, 232, 48, 18, 8); c.fill(); rr(c, 909, 170, 6, 44, 3); c.fill();
  // 公寓大樓（101동…）/ apartment blocks with Korean building numbers
  for (const [x, y, w, col, n] of [[-30, 200, 330, '#f4ead8', '101'], [470, 260, 290, '#e7eef7', '102'], [1220, 180, 320, '#f7e4dc', '103'], [1640, 250, 320, '#eaf1e2', '104']]) {
    rr(c, x, y, w, 560, 10); fillStroke(c, col, 6);
    for (let r = 0; r < 7; r++) for (let k = 0; k < Math.floor(w / 62); k++) { rr(c, x + 22 + k * 62, y + 70 + r * 44, 40, 26, 4); c.fillStyle = (r + k) % 5 ? '#bcdcef' : '#ffe7a6'; c.fill(); }
    c.font = '800 34px "Malgun Gothic","Inter",sans-serif'; c.fillStyle = '#8a7f86'; c.fillText(n + '동', x + 24, y + 48);
  }
  // 街邊商店（韓文招牌）/ street-level shops with Hangul signs
  for (const [x, w, col, txt] of [[0, 300, '#ffd7a1', '빵집'], [300, 340, '#c9e7ff', '편의점'], [640, 320, '#ffd1dc', '카페'], [960, 320, '#d8f0c8', '문구'], [1280, 330, '#fff0b8', '분식'], [1610, 330, '#e3d7ff', '꽃집']]) {
    rr(c, x, 520, w, 190, 0); fillStroke(c, '#f8f3ea', 6);
    rr(c, x + 18, 532, w - 36, 52, 10); fillStroke(c, col, 5);
    c.font = '800 38px "Malgun Gothic","Inter",sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText(txt, x + w / 2, 572); c.textAlign = 'left';
    rr(c, x + 30, 600, w - 60, 100, 8); fillStroke(c, '#bfe3f2', 5);
  }
  // 車道＋斑馬線 / road + zebra crossing
  c.fillStyle = '#6c7584'; c.fillRect(0, 708, W, 112); c.fillStyle = '#5c6474'; c.fillRect(0, 708, W, 8);
  c.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { const yy = 722 + i * 24, sk = i * 6; c.beginPath(); c.moveTo(1600 - sk, yy); c.lineTo(1890 + sk, yy); c.lineTo(1894 + sk, yy + 12); c.lineTo(1596 - sk, yy + 12); c.fill(); }
  // 人行道：路緣、黃色導盲磚、地磚 / curb, yellow tactile strip, paving
  c.fillStyle = '#aab0bb'; c.fillRect(0, 815, W, 22); c.fillStyle = '#8f96a3'; c.fillRect(0, 834, W, 5);
  c.fillStyle = '#e4d6c6'; c.fillRect(0, 839, W, H - 839);
  c.fillStyle = '#ffcf3a'; c.fillRect(660, 846, 960, 22); c.fillStyle = 'rgba(160,120,0,.35)'; for (let x = 668; x < 1612; x += 16) { c.beginPath(); c.arc(x, 857, 3, 0, 7); c.fill(); }
  c.strokeStyle = 'rgba(120,90,70,.18)'; c.lineWidth = 3; for (let y = 880; y < H; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  for (let x = 0; x < W; x += 120) for (let y = 880; y < H; y += 60) { c.beginPath(); c.moveTo(x + ((y / 60) % 2) * 60, y); c.lineTo(x + ((y / 60) % 2) * 60, y + 60); c.stroke(); }
  // 紅綠燈（行人綠燈）/ pedestrian signal
  c.fillStyle = '#4b5160'; rr(c, 1832, 420, 14, 440, 6); c.fill(); rr(c, 1810, 400, 58, 100, 12); fillStroke(c, '#343844', 5);
  c.beginPath(); c.arc(1839, 428, 16, 0, 7); c.fillStyle = '#5a3a3a'; c.fill(); c.beginPath(); c.arc(1839, 470, 16, 0, 7); c.fillStyle = '#4ee08a'; c.fill();
}
function s05Cloud(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#fff'; c.beginPath(); for (const [a, b, r] of [[0, 0, 44], [50, -18, 52], [104, 0, 44], [52, 14, 42]]) c.arc(a, b, r, 0, 7); c.fill(); c.restore(); }
// 候車亭（畫在公車前面）/ bus shelter, in front of the bus
function s05Shelter(c, t) {
  c.fillStyle = 'rgba(190,230,248,.32)'; c.fillRect(125, 485, 505, 345); c.lineWidth = 5; c.strokeStyle = '#7d8ca0'; c.strokeRect(125, 485, 505, 345);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(150, 505, 10, 290); c.fillRect(420, 505, 10, 290);
  rr(c, 150, 540, 120, 170, 8); fillStroke(c, '#fff6d6', 5);                     // 路線圖 / route map
  c.strokeStyle = '#3d78c9'; c.lineWidth = 6; c.beginPath(); c.moveTo(170, 690); c.lineTo(210, 620); c.lineTo(250, 640); c.lineTo(250, 560); c.stroke();
  for (const [px, py] of [[170, 690], [210, 620], [250, 640], [250, 560]]) { c.beginPath(); c.arc(px, py, 7, 0, 7); fillStroke(c, '#fff', 3); }
  rr(c, 300, 750, 300, 22, 8); fillStroke(c, '#c98a55', 5);                     // 長椅 / bench
  for (const lx of [320, 580]) { c.fillStyle = '#5a6070'; c.fillRect(lx - 4, 772, 8, 60); }
  for (const px of [112, 632]) { rr(c, px - 9, 470, 18, 380, 6); fillStroke(c, '#5a6070', 5); }
  rr(c, 80, 440, 600, 50, 14); fillStroke(c, '#2b5fa8', 6);                     // 屋頂＋站名 / roof + sign
  c.font = '800 30px "Malgun Gothic","Inter",sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('버스 정류장  BUS STOP', 380, 476); c.textAlign = 'left';
}
// 公車站牌（圓牌＋路線 7）/ bus stop pole with route 7
function s05StopSign(c, x, t) {
  rr(c, x - 8, 420, 16, 440, 6); fillStroke(c, '#5a6070', 5);
  c.beginPath(); c.arc(x, 420, 58, 0, 7); fillStroke(c, '#2f7fe0', 6);
  rr(c, x - 32, 392, 64, 40, 10); fillStroke(c, '#fff', 4); c.fillStyle = '#2f7fe0'; for (const wx of [x - 24, x - 4, x + 14]) c.fillRect(wx, 398, 12, 12);
  c.beginPath(); c.arc(x - 18, 434, 6, 0, 7); c.arc(x + 18, 434, 6, 0, 7); c.fillStyle = INK; c.fill();
  c.font = '800 22px "Malgun Gothic","Inter",sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('버스', x, 466);
  rr(c, x - 50, 492, 100, 64, 10); fillStroke(c, '#fff6d6', 5);
  c.font = '800 34px "Inter",sans-serif'; c.fillStyle = '#2f7fe0'; c.fillText('7', x - 22, 538);
  c.font = '800 20px "Malgun Gothic","Inter",sans-serif'; c.fillStyle = INK; c.fillText('학교', x + 18, 532); c.textAlign = 'left';
}
// 藍色市區公車：本地座標 x=車尾、y=地面；pitch = 剎車前傾 / city bus, local x from rear, y from ground
function s05Bus(c, x, gy, wr, pitch, open, t) {
  if (x < -1300) return;
  c.save(); c.translate(x, gy);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(625, 4, 650, 16, 0, 0, 7); c.fill();
  c.save(); c.translate(820, -62); c.rotate(pitch); c.translate(-820, 62);
  rr(c, 0, -440, 1250, 380, 38); c.fillStyle = '#2f7fe0'; c.fill();
  c.fillStyle = '#1f5fb8'; c.fillRect(8, -150, 1234, 84); c.fillStyle = '#fff'; c.fillRect(8, -164, 1234, 12);
  rr(c, 0, -440, 1250, 380, 38); fillStroke(c, null, 7);
  for (const wx of [40, 230, 420, 610]) { rr(c, wx, -392, 172, 140, 14); fillStroke(c, '#bfe8f5', 6); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(wx + 18, -380, 12, 110); }
  rr(c, 806, -392, 104, 140, 14); fillStroke(c, '#bfe8f5', 6);
  c.beginPath(); c.arc(120, -230, 0, 0, 7);
  // 側面路線號 / side route number
  c.beginPath(); c.arc(130, -205, 30, 0, 7); fillStroke(c, '#fff', 5); c.font = '800 38px "Inter",sans-serif'; c.fillStyle = '#2f7fe0'; c.textAlign = 'center'; c.fillText('7', 130, -192);
  // 車門：內部、扶手、階梯、摺疊門片 / doorway: interior, handrail, steps, folding leaves
  const [d0, d1] = S5_DOOR;
  rr(c, d0, -384, d1 - d0, 324, 10); c.fillStyle = '#3a3550'; c.fill();
  c.fillStyle = '#7d8294'; c.fillRect(d0 + 6, -92, d1 - d0 - 12, 18); c.fillStyle = '#9aa0b0'; c.fillRect(d0 + 6, -74, d1 - d0 - 12, 14);
  c.fillStyle = '#ffd84d'; rr(c, d1 - 34, -370, 10, 270, 5); c.fill(); rr(c, d0 + 24, -370, 10, 270, 5); c.fill();
  const lw = lerp((d1 - d0) / 2, 26, open);
  for (const [lx, sgn] of [[d0, 1], [d1 - lw, -1]]) { rr(c, lx, -384, lw, 324, 8); fillStroke(c, '#2f7fe0', 5); if (lw > 50) { rr(c, lx + 14, -364, lw - 28, 200, 8); fillStroke(c, '#bfe8f5', 4); } }
  rr(c, d0, -384, d1 - d0, 324, 10); fillStroke(c, null, 6);
  // 車頭顯示器 / destination LED
  rr(c, d0 + 10, -432, d1 - d0 - 10, 38, 8); c.fillStyle = '#20222c'; c.fill();
  c.font = '800 28px "Malgun Gothic","Inter",sans-serif'; c.fillStyle = '#ffb84a'; c.fillText('7  학교 SCHOOL', (d0 + d1) / 2 + 5, -403); c.textAlign = 'left';
  // 頭燈、尾燈、後照鏡 / lights + mirror
  c.fillStyle = '#ffd84d'; rr(c, 1228, -128, 20, 30, 8); c.fill(); c.fillStyle = '#ff6b6b'; rr(c, 2, -136, 16, 44, 6); c.fill();
  c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.moveTo(1246, -410); c.lineTo(1296, -410); c.lineTo(1296, -380); c.stroke(); rr(c, 1282, -384, 28, 58, 10); fillStroke(c, '#34343c', 5);
  // 輪拱 / wheel arches
  for (const wx of [250, 820]) { c.beginPath(); c.arc(wx, -62, 80, Math.PI, 0); c.closePath(); c.fillStyle = '#1d2a44'; c.fill(); }
  c.restore();
  for (const wx of [250, 820]) { c.save(); c.translate(wx, -62); c.rotate(wr); c.beginPath(); c.arc(0, 0, 62, 0, 7); fillStroke(c, '#34343c', 7); c.beginPath(); c.arc(0, 0, 32, 0, 7); fillStroke(c, '#cfd3da', 5);
    for (let i = 0; i < 5; i++) { c.rotate(Math.PI * 2 / 5); c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 26); c.lineWidth = 6; c.strokeStyle = '#5a5f6b'; c.stroke(); } c.restore(); }
  c.restore();
}
function s05Puff(c, x, y, k) { c.fillStyle = `rgba(255,255,255,${.7 * (1 - k)})`; for (const [dx, dy, r] of [[-40, 0, 26], [0, -14, 32], [44, 0, 26]]) { c.beginPath(); c.arc(x + dx * (1 + k), y + dy - k * 30, r * (1 + k * .6), 0, 7); c.fill(); } }
function s05Spark(c, x, y, k) {   // 擊掌星光 / clap sparkle
  const s = 1 - k * .5; c.save(); c.globalAlpha = 1 - k;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3, r = 30 + 90 * E.out(k); star(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 18 * s); }
  star(c, x, y, 40 * s); c.restore();
}
