// 所有格文法動畫｜時間軸（規格卡 rdq/RDQ-spec-possessive-adjectives-20261115.md，英文稿 情境英文稿-draft-20261115.md v1）。
// 試片範圍：文法講解（六種變化＋規則＋填空示範）→ 第 1 段 I → my（播一次 → Listen and repeat → 填空）。秒數由配音長度自動排。
(function () {
  window.FACE = { shuiling: { cx: 540, cy: 470, s: 430 } };   // 水鈴頭髮很高、臉偏右：頭像改裁臉（老師 11/15）
  const L = k => window.LINES[k], D = k => L(k).dur, W = (k, i) => L(k).words[i].t0;
  const F = { segs: [], captions: [], hud: [], audio: [], need: {}, duck: [] }; let NOW = 0;
  const seg = (dur, draw, pre) => { const s = { t0: NOW, dur, draw, pre }; F.segs.push(s); NOW += dur; return s; };
  const say = (key, at, o = {}) => { if (!o.nocap) F.captions.push(Object.assign({ key, t0: at }, o)); F.audio.push([`audio/${key.slice(0, 3)}/${key}.mp3`, at, 0]); };
  const sfx = (f, at, db = 0, len) => F.audio.push(len ? [f, at, db, len] : [f, at, db]);
  const need = (n, u) => { F.need[n] = u; };
  [["ken", "ken_cut"], ["mom", "mom_A_cut"], ["dad", "dad_B_cut"], ["shuiling", "shuiling_cut"], ["grandpa", "grandpa_cut"], ["grandma", "grandma_cut"],
   ["hand", "hand_you_cut"], ["book", "prop_book_cut"], ["baseball", "prop_baseball_cut"], ["bedroom", "ken_bedroom"]].forEach(([n, f]) => need(n, `assets/${f}.png`));
  need("f3d_s01_still", "renders/3d/s01/f0070.png");

  // 六種變化（主詞、所有格、中文、圖示）
  const ROWS = [
    { s: "I", p: "my", zs: "我", zp: "我的", icon: [["ken", 0.21]] },
    { s: "you", p: "your", zs: "你", zp: "你的", icon: "hand" },
    { s: "he", p: "his", zs: "他", zp: "他的", icon: [["dad", 0.2]] },
    { s: "she", p: "her", zs: "她", zp: "她的", icon: [["shuiling", 0.3]] },
    { s: "we", p: "our", zs: "我們", zp: "我們的", icon: [["ken", 0.21], ["shuiling", 0.3]] },
    { s: "they", p: "their", zs: "他們", zp: "他們的", icon: [["grandpa", 0.2], ["grandma", 0.21]] },
  ];
  const rowY = i => 215 + i * 132;
  function rowIcon(r, cx, cy, k) {
    if (r.icon === "hand") { iconImg("hand", cx, cy, 120, k); return; }
    if (r.icon.length === 1) headIcon(r.icon[0][0], cx, cy, 54, r.icon[0][1], k);
    else { headIcon(r.icon[0][0], cx - 30, cy, 46, r.icon[0][1], k); headIcon(r.icon[1][0], cx + 34, cy + 4, 46, r.icon[1][1], k); }
  }
  // 左邊的對照表：rows 0..n-1 都畫好；cur＝正在講的那一行（ks：主詞、箭頭、所有格、中文 的出現程度）
  function chart(lt, n, cur = -1, ks = {}, glow = -1) {
    txt("主詞", 140, 112, 36, BLUE, { zh: true }); txt("所有格", 440, 112, 36, RED, { zh: true });
    for (let i = 0; i < n; i++) {
      const r = ROWS[i], y = rowY(i), c = i === cur, kS = c ? ks.s ?? 1 : 1, kA = c ? ks.a ?? 1 : 1, kP = c ? ks.p ?? 1 : 1, kZ = c ? ks.z ?? 1 : 1;
      if (i === glow || (c && kS > 0)) { X.save(); X.fillStyle = `rgba(255,179,71,${0.16 + 0.06 * Math.sin(lt * 5)})`; X.beginPath(); X.roundRect(36, y - 58, 960, 116, 30); X.fill(); X.restore(); }
      if (kS > 0) txt(r.s, 140, y, 74, BLUE, { sc: 0.4 + 0.6 * back(kS), alpha: clamp(kS * 3) });
      arrowR(225, 315, y, kA);
      if (kP > 0) txt(r.p, 440, y, 82, RED, { sc: 0.4 + 0.6 * back(kP), alpha: clamp(kP * 3) });
      rowIcon(r, 640, y, kS);
      if (kZ > 0) { panel(730, y - 34, 255, 68, kZ, "rgba(20,12,48,0.7)", "rgba(255,179,71,0.8)", 20); txt(`${r.zs}→${r.zp}`, 857, y + 1, r.zs.length > 1 ? 30 : 34, "#fff", { zh: true, stroke: false, alpha: clamp(kZ * 3) }); }
    }
  }

  // ---------- 文法講解 G0：Whose book? ----------
  {
    const t0 = NOW, a = t0 + 0.5; say("g00_hi", a);
    const six = W("g00_hi", 6);
    seg(D("g00_hi") + 1.6, lt => {
      const gt = lt + t0; nightBg(lt, 3);
      iconImg("book", 960, 400 + Math.sin(lt * 2.4) * 14, 300, clamp((lt - 0.2) / 0.4), Math.sin(lt * 1.6) * 0.06);
      ["?", "?", "?"].forEach((q, i) => bigText(q, 700 + i * 260, 230 - (i === 1 ? 60 : 0), 150, clamp((lt - 0.4 - i * 0.15) / 0.3), ORANGE, (i - 1) * 0.25));
      bigText("WHOSE BOOK?", 960, 120, 110, clamp((gt - a - W("g00_hi", 0)) / 0.35));
      ROWS.forEach((r, i) => { const k = clamp((gt - a - six - i * 0.18) / 0.35); if (k > 0) txt(r.p, 310 + i * 260, 720, 96, RED, { sc: 0.4 + 0.6 * back(k), alpha: clamp(k * 3) }); });
    });
    ROWS.forEach((r, i) => sfx("sfx/pop.wav", a + six + i * 0.18, -10));
  }
  // ---------- G1–G6：對照表一行一行 ----------
  ROWS.forEach((r, i) => {
    const key = ["g01_i", "g02_you", "g03_he", "g04_she", "g05_we", "g06_they"][i];
    // 老師 11/15：一行單獨放大在畫面中央 → 介紹完消失 → 空 1 秒（書留著）→ 下一行；6 行後完整表一次出現
    const t0 = NOW, a = t0 + 0.35; say(key, a, { maxw: 1000 });
    const w0 = W(key, 0), w1 = W(key, 1), w2 = W(key, 2), off = 0.35 + D(key) + 0.5, GAP = 1.0;
    sfx("sfx/tag.wav", a + w1, -6); sfx("sfx/pop.wav", a + w2, -8); sfx("sfx/whoosh.wav", t0 + off, -14);
    seg(off + 0.3 + GAP, lt => {
      const at = lt - 0.35, out = clamp((off + 0.3 - lt) / 0.3); nightBg(lt + i * 7, 3);
      const kb = i === 0 ? clamp(at / 0.4) : 1; iconImg("book", 960, 520 + Math.sin((t0 + lt) * 2.4) * 10, 270, kb, -0.05);
      if (out <= 0) return;
      X.save(); X.globalAlpha = out;
      const y = 250, kS = clamp((at - w0 + 0.15) / 0.35), kA = clamp((at - w1 + 0.35) / 0.3), kP = clamp((at - w1) / 0.35), kZ = clamp((at - w1 - 0.3) / 0.35);
      X.fillStyle = `rgba(255,179,71,${0.16 + 0.06 * Math.sin(lt * 5)})`; X.beginPath(); X.roundRect(320, y - 95, 1320, 190, 50); X.fill(); X.restore();
      if (kS > 0) txt(r.s, 490, y, 120, BLUE, { sc: 0.4 + 0.6 * back(kS), alpha: clamp(kS * 3) * out });
      X.save(); X.globalAlpha = out; arrowR(670, 770, y, kA); X.restore();
      if (kP > 0) txt(r.p, 950, y, 130, RED, { sc: 0.4 + 0.6 * back(kP), alpha: clamp(kP * 3) * out });
      X.save(); X.globalAlpha = out;
      if (r.icon === "hand") iconImg("hand", 1200, y, 170, kS);
      else if (r.icon.length === 1) headIcon(r.icon[0][0], 1200, y, 78, r.icon[0][1], kS);
      else { headIcon(r.icon[0][0], 1190, y, 66, r.icon[0][1], kS); headIcon(r.icon[1][0], 1280, y + 6, 66, r.icon[1][1], kS); }
      X.restore();
      if (kZ > 0) { X.save(); X.globalAlpha = out; panel(1360, y - 46, 260, 92, kZ, "rgba(20,12,48,0.7)", "rgba(255,179,71,0.8)", 24); X.restore();
        txt(`${r.zs}→${r.zp}`, 1490, y + 1, r.zs.length > 1 ? 40 : 46, "#fff", { zh: true, stroke: false, alpha: clamp(kZ * 3) * out }); }
      const kt = clamp((at - w2) / 0.35) * out;
      X.save(); X.globalAlpha = out; tag(1150, 470, r.p, kt, 70, 0.1); X.restore();
      if (kt > 0) {
        txt(`${r.p} book`, 960, 740, 104, "#fff", { sc: 0.5 + 0.5 * back(kt), alpha: clamp(kt * 3) });
        txt(r.p, 960 - tw(" book", 104) / 2, 740, 104, RED, { sc: 0.5 + 0.5 * back(kt), alpha: clamp(kt * 3), stroke: false });
        txt(`${r.zp}書`, 960, 838, 54, "#ffd9b8", { zh: true, alpha: clamp((at - w2 - 0.2) / 0.3) * out });
      }
    });
  });
  // ---------- G6b：完整對照表一次出現＋旁白快速重念＋所有格整欄閃紅光＋停 3 秒 ----------
  {
    const t0 = NOW, a = t0 + 0.8; say("g06b_all", a, { x: 1420, maxw: 820 });
    sfx("sfx/pop.wav", t0, -6); sfx("sfx/tag.wav", t0 + 0.3, -8);
    const wAt = j => a + W("g06b_all", j * 2);
    seg(0.8 + D("g06b_all") + 3.0, lt => {
      const gt = t0 + lt; nightBg(lt + 40, 3);
      let cur = -1; for (let j = 0; j < 6; j++) if (gt >= wAt(j) - 0.05) cur = j;
      if (gt > a + D("g06b_all") + 0.3) cur = -1;
      const fl = clamp(1 - Math.abs(lt - 0.6) / 0.6);   // 所有格整欄閃紅光
      if (fl > 0) { X.save(); X.shadowColor = "rgba(255,60,60,0.95)"; X.shadowBlur = 50 * fl; X.strokeStyle = `rgba(255,80,80,${fl})`; X.lineWidth = 10;
        X.fillStyle = `rgba(255,80,80,${0.22 * fl})`; X.beginPath(); X.roundRect(345, 140, 200, 810, 40); X.fill(); X.stroke(); X.restore(); }
      X.save(); const k = back(clamp(lt / 0.4)); X.translate(500, 540); X.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k); X.translate(-500, -540); chart(lt, 6, -1, {}, cur); X.restore();
      iconImg("book", 1420, 470 + Math.sin(lt * 2.4) * 10, 300, 1, -0.05);
      if (cur >= 0) { tag(1420, 300, ROWS[cur].p, clamp((gt - a - W("g06b_all", cur * 2 + 1)) / 0.3), 76); }
    });
  }
  // ---------- G7：規則 所有格＋東西 ----------
  {
    const t0 = NOW, a = t0 + 0.4; say("g07_rule", a, { x: 1420, maxw: 820 });
    seg(D("g07_rule") + 2.6, lt => {
      const at = lt - 0.4; nightBg(lt + 50, 3); chart(lt, 6);
      const idx = Math.floor(clamp(at / 0.5, 0, 99)) % 6, p = ROWS[idx].p;
      panel(1065, 330, 270, 150, clamp(at / 0.3), "#ff5050", "#fff", 30); txt(p, 1200, 405, 84, "#fff", { stroke: false, alpha: clamp(at / 0.3) });
      bigText("+", 1400, 405, 110, clamp((at - 0.3) / 0.3));
      iconImg("book", 1610, 405, 210, clamp((at - 0.5) / 0.3), -0.06);
      txt(`${p} book`, 1420, 620, 104, "#fff", { alpha: clamp((at - 0.9) / 0.3) });
      txt(p, 1420 - tw(" book", 104) / 2, 620, 104, RED, { stroke: false, alpha: clamp((at - 0.9) / 0.3) });
      panel(1130, 720, 580, 100, clamp((at - 1.3) / 0.35), "rgba(20,12,48,0.75)", ORANGE, 24);
      txt("所有格 ＋ 東西", 1420, 771, 52, "#fff", { zh: true, stroke: false, alpha: clamp((at - 1.3) / 0.35) });
    });
  }
  // ---------- G8：填空示範（像參考片：把 my 拖進空格） ----------
  {
    const t0 = NOW, a = t0 + 0.4; say("g08_which", a, { nocap: true });
    const kw = W("g08_which", 6), c0 = a + D("g08_which") + 0.3, c1 = c0 + 3, fly = c1 + 0.6, ka = fly + 0.5;
    say("g08_ken", ka, { x: 1300, maxw: 900 });
    const kMy = W("g08_ken", 5);
    [0, 1, 2].forEach(i => sfx("sfx/beep.wav", c0 + i, -6)); sfx("sfx/whoosh.wav", c1, -8); sfx("sfx/ding.wav", fly, -4); sfx("sfx/tag.wav", ka + kMy, -6);
    const OPT = [["your", 1150], ["my", 1370], ["his", 1590]];
    seg(ka - t0 + D("g08_ken") + 1.4, lt => {
      const gt = t0 + lt; nightBg(lt + 80, 3); chart(lt, 6, -1, {}, gt > a ? 0 : -1);
      char("ken", 1800, 1010, 520, { sy: 1 + Math.sin(lt * 2) * 0.006, bob: gt > ka && gt < ka + D("g08_ken") ? Math.abs(Math.sin(lt * 9)) * 5 : 0 });
      txt("I'm Ken.", 1400, 170, 72, "#fff", { alpha: clamp(lt / 0.3) });
      txt("I'm", 1400 - tw(" Ken.", 72) / 2, 170, 72, BLUE, { stroke: false, alpha: clamp(lt / 0.3) });
      const fill = clamp((gt - c1) / 0.6);
      const bl = sentence(["This", "is", { blank: "my" }, "book."], 1380, 300, 68, { fill: gt > fly ? 1 : 0, alpha: clamp(lt / 0.3) });
      iconImg("book", 1330, 540, 230, clamp((lt - 0.3) / 0.4), -0.05);
      OPT.forEach(([w, x], i) => {
        const k = clamp((gt - a - kw - i * 0.15) / 0.35), right = w === "my";
        if (right && gt > c1) {   // 飛進空格
          if (gt < fly) { const e = ease(fill); bubble(w, lerp(x, bl.x, e), lerp(790, bl.y, e), 60, 1, 1); }
        } else bubble(w, x, 790, 60, k, gt > c1 ? -1 : 0);
      });
      if (gt > c0 && gt < c1) ring(1600, 540, 72, 3, gt - c0);
      if (gt > fly) bigText("✔", 1590, 400, 120, clamp((gt - fly) / 0.3), "#7be07b");
      const kd = clamp((gt - ka - kMy) / 0.5); dashLine(1730, 560, 1420, 520, kd); tag(1330, 410, "my", clamp((gt - ka - kMy - 0.3) / 0.35), 56);
    });
  }
  // ---------- G9：接下來看六個故事 ----------
  {
    const t0 = NOW, a = t0 + 0.3; say("g09_go", a);
    seg(D("g09_go") + 1.2, lt => {
      nightBg(lt + 120, 5); bigText("6 STORIES", 960, 140, 110, clamp(lt / 0.35), ORANGE);
      ROWS.forEach((r, i) => {
        const k = clamp((lt - 0.4 - i * 0.15) / 0.35), cx = 480 + (i % 3) * 480, cy = 420 + Math.floor(i / 3) * 300;
        panel(cx - 200, cy - 110, 400, 220, k, "rgba(20,12,48,0.75)", i === 0 ? ORANGE : "rgba(255,179,71,0.6)", 30);
        rowIcon(r, cx - 120, cy, k); txt(r.s, cx - 10, cy, 64, BLUE, { alpha: clamp(k * 3) }); arrowR(cx + 40, cx + 80, cy, k); txt(r.p, cx + 140, cy, 64, RED, { alpha: clamp(k * 3) });
        txt(`Story ${i + 1}`, cx, cy - 80, 30, "#ffd9b8", { alpha: clamp(k * 3), stroke: false });
      });
    });
    ROWS.forEach((r, i) => sfx("sfx/pop.wav", t0 + 0.4 + i * 0.15, -12));
  }

  // ======================= 第 1 段：I → my（Ken 的房間） =======================
  const S1 = ["s01_1", "s01_2", "s01_3", "s01_4", "s01_5"];
  const KEN = { x: 640, foot: 1000, h: 700 }, CHEST = [700, 520];
  const BOOK = [1350, 458, 132], BALL = [1720, 476, 86];
  // 標題卡
  {
    const t0 = NOW; say("s01_t", t0 + 0.6, { nocap: true }); sfx("sfx/whoosh.wav", t0, -8);
    seg(D("s01_t") + 1.8, lt => {
      nightBg(lt + 200, 9); txt("Story 1", 960, 230, 56, "#ffd9b8", { alpha: clamp(lt / 0.3) });
      headIcon("ken", 560, 540, 120, 0.21, clamp((lt - 0.1) / 0.4));
      const k = clamp((lt - 0.3) / 0.4); txt("I", 820, 540, 200, BLUE, { sc: 0.4 + 0.6 * back(k), alpha: clamp(k * 3) });
      arrowR(920, 1080, 540, clamp((lt - 0.6) / 0.3)); const k2 = clamp((lt - 0.8) / 0.4); txt("my", 1290, 540, 220, RED, { sc: 0.4 + 0.6 * back(k2), alpha: clamp(k2 * 3) });
      txt("我 → 我的", 960, 780, 64, "#fff", { zh: true, alpha: clamp((lt - 1.0) / 0.3) });
    });
  }
  // 第一次：正常速度（2D 房間 4 句 → 3D 打棒球）
  {
    const t0 = NOW, at = []; let c = t0 + 0.5;
    S1.slice(0, 4).forEach(k => { at.push(c); c += D(k) + 0.7; });
    at.forEach((x, i) => say(S1[i], x, { who: "Ken", x: 1150, maxw: 1100 }));
    const my = i => at[i] + W(S1[i], 2);   // This is my ...（第 3 個字）
    [1, 2, 3].forEach(i => { sfx("sfx/tag.wav", my(i), -5); }); sfx("sfx/pop.wav", at[2] + W(S1[2], 0), -8); sfx("sfx/pop.wav", at[3] + W(S1[3], 1), -8);
    seg(c - t0 + 0.2, lt => {
      const gt = t0 + lt;
      // 鏡頭：Ken 近景 → 整個房間 → 書桌和棒球
      if (gt < at[1]) camAt(lt, 0, at[1] - t0, 1.3, 1.22, 200, 170, 60, 40);
      else if (gt < at[2]) camAt(gt, at[1], at[1] + 1.0, 1.22, 1.0, 170, 0, 40, 0);
      else camAt(gt, at[2], at[2] + 1.0, 1.0, 1.15, 0, -120, 0, 40);
      const talk = S1.slice(0, 4).some((k, i) => gt > at[i] && gt < at[i] + D(k));
      withCam(() => {
        cover("bedroom", 0.5);
        if (gt < at[1] + 0.3) rays(lt, 1060, 180, 0.8 * clamp(1 - (gt - at[1]) / 0.3));
        // 書、棒球
        const kb = clamp((gt - at[2] - W(S1[2], 0)) / 0.35); if (kb > 0) iconImg("book", BOOK[0], BOOK[1] - (1 - ease(kb)) * 120, BOOK[2], kb, -0.05);
        const kc = clamp((gt - at[3] - W(S1[3], 1)) / 0.5);
        if (kc > 0) { const bounce = kc < 1 ? Math.abs(Math.cos(kc * Math.PI * 1.5)) * (1 - kc) * 260 : 0; iconImg("baseball", BALL[0], BALL[1] - bounce, BALL[2], 1, kc * 6); }
        char("ken", KEN.x, KEN.foot, KEN.h, { bob: talk ? Math.abs(Math.sin(lt * 9)) * 6 : 0, sy: 1 + Math.sin(lt * 2) * 0.006,
          rot: gt > at[0] && gt < at[0] + 1.2 ? Math.sin((gt - at[0]) * 10) * 0.03 : 0 });
        // I＝Ken：念到 I'm 時頭上出現藍色 I
        const ki = clamp((gt - at[0] - W(S1[0], 2)) / 0.35); if (gt < at[1] + 0.5) bigText("I", KEN.x + 10, 240, 120, ki, BLUE);
        // my room：房間外框＋名牌
        const kr = clamp((gt - my(1)) / 0.6);
        if (kr > 0) { X.save(); X.strokeStyle = RED; X.lineWidth = 14; X.setLineDash([40, 22]); X.lineDashOffset = -T * 60; X.globalAlpha = clamp(kr * 2) * clamp(1 - (gt - at[2] - 0.2) / 0.5);
          X.beginPath(); X.roundRect(40, -40, 1840, 1080, 40); X.stroke(); X.restore(); tag(960, 120, "my room", kr, 74, 0); }
        dashLine(CHEST[0], CHEST[1], BOOK[0] - 20, BOOK[1], clamp((gt - my(2)) / 0.5)); tag(BOOK[0] - 110, BOOK[1] - 90, "my", clamp((gt - my(2) - 0.3) / 0.35), 58);
        dashLine(CHEST[0], CHEST[1] - 60, BALL[0] - 10, BALL[1] - 30, clamp((gt - my(3)) / 0.5), RED, 380); tag(BALL[0], BALL[1] - 110, "my", clamp((gt - my(3) - 0.3) / 0.35), 58);
      });
      bokeh(lt, 6, 7, 0.4);
    });
    // 3D：打棒球（沿用 Free Time 版已渲好的 s11 鏡頭）
    const a5 = NOW; say("s01_5", a5 + 0.8, { who: "Ken", x: 1160 }); sfx("sfx/tag.wav", a5 + 0.8 + W("s01_5", 4), -5);
    seg(5.8, lt => {
      if (IM.f3d_s01 && IM.f3d_s01.im.width) cover("f3d_s01", 0.5);
      tag(1500, 150, "my free time", clamp((lt - 0.8 - W("s01_5", 4)) / 0.35), 70, 0.04);
    }, async lt => {
      const f = String(Math.max(0, Math.min(139, Math.round(lt * 24)))).padStart(4, "0");
      if (IM.f3d_s01 && IM.f3d_s01.f === f) return; delete IM.f3d_s01; await load("f3d_s01", `renders/3d/s01/f${f}.png`); IM.f3d_s01.f = f;
    });
  }
  // 第二次：Listen and repeat（慢速 → Your turn 倒數）
  const BG1 = [0, 1, 2, 3].map(() => "bedroom");
  {
    const t0 = NOW; say("s01_rep", t0 + 0.4, { nocap: true });
    seg(D("s01_rep") + 0.9, lt => {
      cover("bedroom", 0.5, "blur(10px) brightness(0.5)"); ear(760, 470, 1.6, clamp(lt / 0.4)); mic(1160, 470, 1.5, clamp((lt - 0.3) / 0.4));
      bigText("Listen and repeat!", 960, 720, 110, clamp((lt - 0.2) / 0.35), ORANGE);
    });
    S1.forEach((k, i) => {
      const ks = k + "s", s0 = NOW, a = s0 + 0.4, y0 = a + D(ks) + 0.5, total = Math.max(3, Math.ceil(D(ks) + 0.5));
      say(ks, a, { top: 470, size: 84, maxw: 1700, hold: 0.3 });
      for (let j = 0; j < total; j++) sfx("sfx/tick.wav", y0 + j, -10);
      const parts = L(k).text.split(" ");
      seg(y0 - s0 + total + 0.4, lt => {
        const gt = s0 + lt;
        if (i < 4) cover("bedroom", 0.5, "blur(10px) brightness(0.5)"); else cover("f3d_s01_still", 0.5, "blur(10px) brightness(0.5)");
        txt(`${i + 1} / 5`, 1780, 80, 40, "#ffd9b8", { stroke: false });
        if (gt < y0) { ear(960, 300, 1.2, clamp(lt / 0.3)); txt("Listen", 960, 400, 48, "#fff", { alpha: clamp(lt / 0.3) }); }
        else {
          const k2 = clamp((gt - y0) / 0.3); mic(960, 260, 1.1, k2); bigText("Your turn!", 960, 390, 80, k2, ORANGE);
          sentence(parts, 960, 560, 84, { alpha: k2 }); ring(960, 800, 80, total, gt - y0);
        }
      });
    });
  }
  // 填空：This is ___ baseball.
  {
    const t0 = NOW, a = t0 + 0.4; say("s01_q", a, { nocap: true });
    const c0 = a + D("s01_q") + 0.6, c1 = c0 + 3, fly = c1 + 0.6, ka = fly + 0.4; say("s01_qa", ka, { nocap: true });
    [0, 1, 2].forEach(i => sfx("sfx/beep.wav", c0 + i, -6)); sfx("sfx/whoosh.wav", c1, -8); sfx("sfx/ding.wav", fly, -4); sfx("sfx/tag.wav", ka + W("s01_qa", 2), -6);
    const OPT = [["his", 760], ["my", 1060], ["your", 1360]];
    seg(ka - t0 + D("s01_qa") + 1.6, lt => {
      const gt = t0 + lt; cover("bedroom", 0.5, "blur(5px) brightness(0.6)");
      bigText("Which word?", 960, 110, 96, clamp((gt - a) / 0.35), ORANGE);
      char("ken", 330, 1010, 600, { bob: gt > ka && gt < ka + D("s01_qa") ? Math.abs(Math.sin(lt * 9)) * 5 : 0 });
      iconImg("baseball", 1060, 330 + Math.sin(lt * 3) * 12, 200, clamp(lt / 0.4), lt * 0.6);
      const bl = sentence(["This", "is", { blank: "my" }, "baseball."], 1080, 590, 84, { fill: gt > fly ? 1 : 0 });
      const fill = clamp((gt - c1) / 0.6);
      OPT.forEach(([w, x], i) => {
        const k = clamp((gt - a - i * 0.15) / 0.35);
        if (w === "my" && gt > c1) { if (gt < fly) { const e = ease(fill); bubble(w, lerp(x, bl.x, e), lerp(820, bl.y, e), 70, 1, 1); } }
        else bubble(w, x, 820, 70, k, gt > c1 ? -1 : 0);
      });
      if (gt > c0 && gt < c1) ring(1650, 330, 80, 3, gt - c0);
      if (gt > fly) bigText("✔", 1650, 330, 140, clamp((gt - fly) / 0.3), "#7be07b");
      const kd = clamp((gt - ka - W("s01_qa", 2)) / 0.5); dashLine(420, 560, 990, 360, kd); tag(1060, 190, "my", clamp((gt - ka - W("s01_qa", 2) - 0.3) / 0.35), 58);
    });
  }

  // ======================= 通用故事段（第 2–6 段；第 1 段是手寫版） =======================
  // o: n, row(ROWS 索引), chars {id:{img,x,foot,h,flip,bgs:[背景名…]}}, props {id:{img,x,y,h,rot,line,word,anim,bg}},
  //    lines[{bg, cam:[s,x,y], subj:{word, chars}, tags:[{occ, label, obj|scene|top, owners:[charId], bend}], fx(lt,gt,line,at)}],
  //    final:{dir} 或 null（第 5 句 2D）、quiz:{bg, chars, obj, parts, opts, answer, owners, who}
  const DUO = { s05_1: "s05_1g", s05_5: "s05_5g", s05_1s: "s05_1gs", s05_5s: "s05_5gs" };
  const WHO = { ken: "Ken", mom: "Mom", dad: "Dad", shuiling: "Shuiling" };
  const posIdx = (key, occ = 0) => { const ws = L(key).words; let c = 0; for (let i = 0; i < ws.length; i++) if (POSW.includes(norm(ws[i].w))) { if (c === occ) return i; c++; } return 0; };
  const wIdx = (key, w, occ = 0) => { const ws = L(key).words; let c = 0; for (let i = 0; i < ws.length; i++) if (norm(ws[i].w) === w) { if (c === occ) return i; c++; } return 0; };
  const sayLine = (key, at, o = {}) => {
    const who = L(key).who; say(key, at, Object.assign({ who: DUO[key] ? "Ken & Shuiling" : WHO[who] }, o));
    if (DUO[key]) F.audio.push([`audio/${key.slice(0, 3)}/${DUO[key]}.mp3`, at, -2]);
  };
  function titleCard(n, r, i) {
    const t0 = NOW; say(`${n}_t`, t0 + 0.6, { nocap: true }); sfx("sfx/whoosh.wav", t0, -8);
    seg(D(`${n}_t`) + 1.8, lt => {
      nightBg(lt + 200 + i * 30, 9); txt(`Story ${i + 1}`, 960, 230, 56, "#ffd9b8", { alpha: clamp(lt / 0.3) });
      const kI = clamp((lt - 0.1) / 0.4);
      if (r.icon === "hand") iconImg("hand", 520, 540, 260, kI);
      else if (r.icon.length === 1) headIcon(r.icon[0][0], 520, 540, 120, r.icon[0][1], kI);
      else { headIcon(r.icon[0][0], 460, 540, 100, r.icon[0][1], kI); headIcon(r.icon[1][0], 590, 550, 100, r.icon[1][1], kI); }
      const k = clamp((lt - 0.3) / 0.4); txt(r.s, 830, 540, 180, BLUE, { sc: 0.4 + 0.6 * back(k), alpha: clamp(k * 3) });
      arrowR(990, 1110, 540, clamp((lt - 0.6) / 0.3)); const k2 = clamp((lt - 0.8) / 0.4); txt(r.p, 1350, 540, 200, RED, { sc: 0.4 + 0.6 * back(k2), alpha: clamp(k2 * 3) });
      txt(`${r.zs} → ${r.zp}`, 960, 780, 64, "#fff", { zh: true, alpha: clamp((lt - 1.0) / 0.3) });
    });
  }
  function chest(c) { return [c.x + (c.cx || 0), c.foot - c.h * 0.55]; }
  function drawStoryScene(o, gt, lt, at, li, keys, bgName, still = false) {
    // 角色、道具、虛線、名牌（全部畫在鏡頭裡）
    const talkers = {}; keys.forEach((k, i) => { if (gt > at[i] && gt < at[i] + D(k)) { talkers[L(k).who] = 1; if (DUO[k]) talkers.shuiling = 1; } });
    if (o.update) o.update(gt, at, li, still);
    cover(bgName, o.ay ?? 0.5, o.filter || "none");
    if (o.bgfx) o.bgfx(lt, gt, li, at);
    const propK = p => { if (still) return 1; if (p.line == null) return 1; if (li < p.line) return 0; if (li > p.line) return 1; return clamp((gt - at[p.line] - W(keys[p.line], p.word || 0)) / (p.anim === "bounce" ? 0.5 : 0.35)); };
    const drawProp = (id, p) => {
      if (p.bg && p.bg !== bgName) return; const k = propK(p); if (k <= 0) return;
      let dy = 0, rot = p.rot || 0;
      if (p.anim === "drop") dy = -(1 - ease(k)) * 140; if (p.anim === "bounce") { dy = -(k < 1 ? Math.abs(Math.cos(k * Math.PI * 1.5)) * (1 - k) * 260 : 0); rot += k * 6; }
      if (p.draw) p.draw(p, k, lt); else iconImg(p.img, p.x, p.y + dy + (p.float ? Math.sin(lt * 2.5) * 8 : 0), p.h, p.anim === "fade" ? 1 : k, rot);
    };
    Object.entries(o.props).forEach(([id, p]) => { if (p.under) drawProp(id, p); });
    Object.entries(o.chars).forEach(([id, c]) => {
      if (c.bgs && !c.bgs.includes(bgName)) return;
      const t = talkers[id] ? Math.abs(Math.sin(lt * 9)) * 6 : 0, walk = c.walk ? c.walk(gt, at, li) : null;
      char(c.img, c.x + (walk ? walk.dx : 0), c.foot, c.h, { flip: c.flip, bob: t + (walk ? walk.bob : 0), sy: 1 + Math.sin(lt * 2 + c.x) * 0.006 });
    });
    Object.entries(o.props).forEach(([id, p]) => { if (!p.under) drawProp(id, p); });
    // 名牌與虛線（每句的所有格；之前句子的名牌保留，但場景換了就不畫）
    o.lines.forEach((ln, i) => {
      if (i > li || !ln.tags) return; if ((ln.bg || o.lines[0].bg) !== bgName) return; if (o.lines[li] && o.lines[li].clear && i < li && !still) return;
      ln.tags.forEach(tg => {
        const wi = posIdx(keys[i], tg.occ || 0), tw0 = still ? -99 : at[i] + W(keys[i], wi), kd = clamp((gt - tw0) / 0.5), kt = clamp((gt - tw0 - 0.3) / 0.35);
        if (tg.top) { tag(tg.tx, tg.ty, tg.label, kt, 70, 0.04); return; }
        if (tg.scene) {   // 整個場景外框（my room…）
          if (kd > 0 && i === li) { X.save(); X.strokeStyle = RED; X.lineWidth = 14; X.setLineDash([40, 22]); X.lineDashOffset = -T * 60; X.globalAlpha = clamp(kd * 2) * (still ? 0 : 1);
            X.beginPath(); X.roundRect(40, 30, 1840, 1020, 40); X.stroke(); X.restore(); }
          tag(tg.x ?? 960, tg.y ?? 120, tg.label, kt, 74, 0); return;
        }
        const ob = tg.obj ? (o.props[tg.obj] || o.chars[tg.obj]) : null, tx = tg.tx ?? (ob ? ob.x : 960), ty = tg.ty ?? (ob ? (ob.y ?? ob.foot - ob.h * 0.5) : 300);
        (tg.owners || []).forEach((ow, j) => { const c = o.chars[ow], [cx, cy] = chest(c); dashLine(cx, cy - j * 30, tg.dx ?? tx, tg.dy ?? ty, kd, RED, tg.bend || 0); });
        tag(tg.lx ?? tx, tg.ly ?? (ty - (ob && ob.h ? ob.h * 0.62 : 120)), tg.label, kt, tg.size || 58, tg.rot ?? -0.06);
      });
    });
    // 主詞藍字（He、She、We、They 念到時出現在那個人頭上）
    const ln = o.lines[li];
    if (ln && ln.subj && !still) {
      const wi = wIdx(keys[li], ln.subj.word), ks = clamp((gt - at[li] - W(keys[li], wi)) / 0.35);
      if (gt < at[li] + D(keys[li]) + 0.6) ln.subj.chars.forEach(id => { const c = o.chars[id]; bigText(ln.subj.label || ln.subj.word.replace(/^./, m => m.toUpperCase()), c.x + (c.cx || 0), c.foot - c.h - 50, 100, ks, BLUE); });
    }
  }
  function story(o) {
    const n = o.n, r = ROWS[o.row], keys = [1, 2, 3, 4, 5].map(i => `${n}_${i}`);
    titleCard(n, r, o.row);
    // ---- 第一次：正常速度 ----
    const t0 = NOW, at = []; let c = t0 + 0.5;
    const nl = o.final ? 4 : 5;
    keys.slice(0, nl).forEach(k => { at.push(c); c += D(k) + 0.75; });
    at.forEach((x, i) => sayLine(keys[i], x, { x: o.lines[i].capx ?? 1150, maxw: 1150 }));
    o.lines.slice(0, nl).forEach((ln, i) => {
      (ln.tags || []).forEach(tg => sfx("sfx/tag.wav", at[i] + W(keys[i], posIdx(keys[i], tg.occ || 0)), -5));
      if (ln.sfx) ln.sfx.forEach(([f, w, db]) => sfx(f, at[i] + W(keys[i], w), db));
    });
    Object.values(o.props).forEach(p => { if (p.line != null && p.line < nl) sfx("sfx/pop.wav", at[p.line] + W(keys[p.line], p.word || 0), -9); });
    seg(c - t0 + 0.2, lt => {
      const gt = t0 + lt; let li = 0; at.forEach((x, i) => { if (gt >= x - 0.3) li = i; });
      const ln = o.lines[li], prev = o.lines[Math.max(0, li - 1)], cam = ln.cam || [1, 0, 0], pc = li === 0 ? (o.cam0 || cam) : (prev.cam || [1, 0, 0]);
      const ts = li === 0 ? t0 : at[li] - 0.3; camAt(gt, ts, ts + (li === 0 ? c - t0 : 0.9), pc[0], cam[0], pc[1], cam[1], pc[2], cam[2]);
      if ((ln.bg || o.lines[0].bg) !== ((prev.bg || o.lines[0].bg)) && li > 0) CAM = { s: cam[0], x: cam[1], y: cam[2] };   // 換場景直接切
      withCam(() => { drawStoryScene(o, gt, lt, at, li, keys, ln.bg || o.lines[0].bg); if (ln.fx) ln.fx(lt, gt, li, at); });
      bokeh(lt, 6, 7, 0.4);
    });
    // ---- 第 5 句：3D（沿用已渲好的鏡頭）或 2D ----
    if (o.final) {
      const a5 = NOW, k5 = keys[4], fdir = o.final.dir, id = `f3d_${n}`; sayLine(k5, a5 + 0.8, Object.assign({ x: 1160 }, o.final.cap || {}));
      const pw = posIdx(k5, 0); sfx("sfx/tag.wav", a5 + 0.8 + W(k5, pw), -5);
      if (o.final.sfx) o.final.sfx(a5);
      if (fdir) need(`${id}_still`, `${fdir}/f0070.png`);
      seg(5.8, lt => {
        if (o.final.draw) o.final.draw(lt);
        else if (IM[id] && IM[id].im.width) cover(id, 0.5);
        tag(1500, 150, o.final.label, clamp((lt - 0.8 - W(k5, pw)) / 0.35), 70, 0.04);
      }, fdir ? async lt => {
        const f = String(Math.max(0, Math.min(139, Math.round(lt * 24)))).padStart(4, "0");
        if (IM[id] && IM[id].f === f) return; delete IM[id]; await load(id, `${fdir}/f${f}.png`); IM[id].f = f;
      } : null);
    }
    // ---- Listen and repeat ----
    const bgOf = i => i === 4 && o.final ? (o.final.still || `f3d_${n}_still`) : (o.lines[i].bg || o.lines[0].bg);
    {
      const r0 = NOW; F.audio.push(["audio/s01/s01_rep.mp3", r0 + 0.4, 0]);
      seg(D("s01_rep") + 0.9, lt => {
        cover(bgOf(0), 0.5, "blur(10px) brightness(0.5)"); ear(760, 470, 1.6, clamp(lt / 0.4)); mic(1160, 470, 1.5, clamp((lt - 0.3) / 0.4));
        bigText("Listen and repeat!", 960, 720, 110, clamp((lt - 0.2) / 0.35), ORANGE);
      });
      keys.forEach((k, i) => {
        const ks = k + "s", s0 = NOW, a = s0 + 0.4, y0 = a + D(ks) + 0.5, total = Math.max(3, Math.ceil(D(ks) + 0.5));
        sayLine(ks, a, { top: 470, size: 84, maxw: 1700, hold: 0.3 });
        for (let j = 0; j < total; j++) sfx("sfx/tick.wav", y0 + j, -10);
        const parts = L(k).text.split(" ");
        seg(y0 - s0 + total + 0.4, lt => {
          const gt = s0 + lt; cover(bgOf(i), 0.5, "blur(10px) brightness(0.5)");
          txt(`${i + 1} / 5`, 1780, 80, 40, "#ffd9b8", { stroke: false });
          if (gt < y0) { ear(960, 300, 1.2, clamp(lt / 0.3)); txt("Listen", 960, 400, 48, "#fff", { alpha: clamp(lt / 0.3) }); }
          else {
            const k2 = clamp((gt - y0) / 0.3); mic(960, 260, 1.1, k2); bigText("Your turn!", 960, 390, 80, k2, ORANGE);
            sentence(parts, 960, 560, parts.length > 7 ? 70 : 84, { alpha: k2 }); ring(960, 800, 80, total, gt - y0);
          }
        });
      });
    }
    // ---- 填空 ----
    {
      const q = o.quiz, q0 = NOW, a = q0 + 0.4; F.audio.push(["audio/s01/s01_q.mp3", a, 0]);
      const c0 = a + D("s01_q") + 0.6, c1 = c0 + 3, fly = c1 + 0.6, ka = fly + 0.4, qa = `${n}_qa`; F.audio.push([`audio/${n}/${qa}.mp3`, ka, 0]);
      const pw = posIdx(qa, 0);
      [0, 1, 2].forEach(i => sfx("sfx/beep.wav", c0 + i, -6)); sfx("sfx/whoosh.wav", c1, -8); sfx("sfx/ding.wav", fly, -4); sfx("sfx/tag.wav", ka + W(qa, pw), -6);
      const OX = [760, 1060, 1360];
      seg(ka - q0 + D(qa) + 1.6, lt => {
        const gt = q0 + lt; cover(q.bg, 0.5, "blur(5px) brightness(0.6)");
        bigText("Which word?", 960, 110, 96, clamp((gt - a) / 0.35), ORANGE);
        q.chars.forEach(([img, x, h]) => char(img, x, 1010, h, { bob: gt > ka && gt < ka + D(qa) && img === (q.speaker || "ken") ? Math.abs(Math.sin(lt * 9)) * 5 : 0 }));
        iconImg(q.obj, 1060, 330 + Math.sin(lt * 3) * 12, q.objH || 220, clamp(lt / 0.4), q.spin ? lt * 0.6 : -0.04);
        const bl = sentence(q.parts, 1080, 590, 84, { fill: gt > fly ? 1 : 0 });
        const fill = clamp((gt - c1) / 0.6);
        q.opts.forEach((w, i) => {
          const x = OX[i], k = clamp((gt - a - i * 0.15) / 0.35);
          if (w === q.answer && gt > c1) { if (gt < fly) { const e = ease(fill); bubble(w, lerp(x, bl.x, e), lerp(820, bl.y, e), 70, 1, 1); } }
          else bubble(w, x, 820, 70, k, gt > c1 ? -1 : 0);
        });
        if (gt > c0 && gt < c1) ring(1650, 330, 80, 3, gt - c0);
        if (gt > fly) bigText("✔", 1650, 330, 140, clamp((gt - fly) / 0.3), "#7be07b");
        const kd = clamp((gt - ka - W(qa, pw)) / 0.5);
        q.owners.forEach(([x, y], j) => dashLine(x, y, 990, 360 + j * 20, kd));
        tag(1060, 190, q.answer, clamp((gt - ka - W(qa, pw) - 0.3) / 0.35), 58);
      });
    }
  }

  let PROPS3, PROPS6;
  // ---------- 第 2–6 段設定（座標＝1920×1080 畫面；背景 1536×1024 鋪滿，原圖 y×1.25−100） ----------
  [["entrance", "bg_entrance"], ["living", "bg_living"], ["sroom", "bg_shuiling_room"], ["classroom", "bg_classroom"], ["court", "bg_court"], ["gphouse", "bg_grandparents"],
   ["bottle", "prop_bottle_cut"], ["cap", "prop_cap_cut"], ["guitar", "prop_guitar_cut"], ["hat", "prop_hat_cut"], ["cat", "prop_cat_cut"], ["tv", "prop_tv_cut"],
   ["dog", "prop_dog_cut"], ["yeh", "ms_yeh_cut"]].forEach(([n, f]) => need(n, `assets/${f}.png`));
  need("dad_gtA", "assets/dad_guitar_A_cut.png"); need("dad_gtB", "assets/dad_guitar_B_cut.png");
  const notes = (x, y, lt, a = 1) => { for (let i = 0; i < 4; i++) { const p = (lt * 0.6 + i / 4) % 1; txt(i % 2 ? "♪" : "♫", x + Math.sin(p * 6 + i) * 50 + i * 30, y - p * 260, 70, ORANGE, { alpha: (1 - p) * a }); } };
  const hearts = (x0, y0, x1, y1, lt) => { for (let i = 0; i < 5; i++) { const p = (lt * 0.7 + i / 5) % 1; txt("♥", lerp(x0, x1, p) + Math.sin(p * 9 + i) * 30, lerp(y0, y1, p) - Math.sin(p * Math.PI) * 120, 64, "#ff6b8a", { alpha: Math.sin(p * Math.PI) }); } };

  // 第 2 段 you → your：玄關，媽媽對 Ken 說
  story({ n: "s02", row: 1,
    chars: { mom: { img: "mom", x: 470, foot: 1010, h: 780 }, ken: { img: "ken", x: 1240, foot: 1010, h: 650 } },
    props: { bottle: { img: "bottle", x: 860, y: 600, h: 200, line: 0, word: 3, anim: "pop", float: 1 },
             cap: { img: "cap", x: 820, y: 250, h: 120, line: 2, word: 2, anim: "drop" } },
    lines: [
      { bg: "entrance", cam: [1.08, 0, 30], tags: [{ obj: "bottle", label: "your", owners: ["ken"] }] },
      { cam: [1.15, 60, 40], fx: (lt, gt) => { for (let i = 0; i < 3; i++) { const p = (lt * 0.8 + i / 3) % 1; X.fillStyle = `rgba(120,200,255,${1 - p})`; X.beginPath(); X.ellipse(860 + Math.sin(i * 2) * 30, 480 - p * 120, 10, 14, 0, 0, Math.PI * 2); X.fill(); } } },
      { cam: [1.05, 0, 40], tags: [{ obj: "cap", label: "your", owners: ["ken"], bend: 120 }], fx: lt => rays(lt, 1330, 300, 0.6) },
      { cam: [1.15, -80, 30] },
    ],
    final: { dir: "renders/3d/s02", label: "my free time" },
    quiz: { bg: "entrance", chars: [["mom", 250, 700], ["ken", 520, 560]], speaker: "mom", obj: "cap", objH: 200, parts: ["This", "is", { blank: "your" }, "cap."], opts: ["my", "your", "her"], answer: "your", owners: [[540, 650]] },
  });

  // 第 3 段 he → his：客廳，爸爸
  story({ n: "s03", row: 2, update: (gt, at, li, still) => { const p = PROPS3.guitar; p.play = li === 4 && !still ? ease(clamp((gt - at[4] - 0.2) / 0.6)) : 0; },
    chars: { ken: { img: "ken", x: 430, foot: 1010, h: 640 }, dad: { img: "dad", x: 1020, foot: 1010, h: 820 } },
    props: PROPS3 = { guitar: { img: "guitar", x: 1490, y: 590, h: 400, line: 2, word: 2, anim: "drop",
                       draw: (p, k, lt) => { const play = p.play || 0; iconImg("guitar", lerp(1490, 1130, play), lerp(590 - (1 - ease(k)) * 140, 640, play), 400, k, lerp(0, -0.9, play) + (play ? Math.sin(lt * 14) * 0.03 : 0)); } },
             hat: { img: "hat", x: 1590, y: 255, h: 120, line: 3, word: 3, anim: "drop" } },
    lines: [
      { bg: "living", cam: [1.1, 120, 30], tags: [{ obj: "dad", label: "my", owners: ["ken"], ty: 520, ly: 140 }] },
      { cam: [1.15, 0, 40], subj: { word: "he", chars: ["dad"] }, fx: lt => notes(1150, 400, lt) },
      { cam: [1.05, -60, 30], tags: [{ obj: "guitar", label: "his", owners: ["dad"] }] },
      { cam: [1.08, -120, 50], tags: [{ obj: "hat", label: "his", owners: ["dad"], bend: 150, lx: 1450, ly: 170 }] },
    ],
    final: { label: "his free time", still: "living",
      sfx: a5 => { for (let i = 0; i < 12; i++) sfx(i % 2 ? "sfx/strum_up.wav" : "sfx/strum_down.wav", a5 + 0.3 + i * 0.45, i % 2 ? -14 : -10); },
      draw: lt => {   // 2.5D：遠景客廳（慢移）＋爸爸坐著刷弦（A/B 兩格跟著刷弦聲換）＋前景光點（快移）＋鏡頭推近
        const k = ease(clamp(lt / 5.8)), s = lerp(1.0, 1.14, k);
        X.save(); X.translate(960, 600); X.scale(s * 1.08, s * 1.08); X.translate(-960 - lt * 10, -600); cover("living", 0.5, "blur(3px) brightness(0.8)"); X.restore();
        rays(lt, 1500, 120, 0.5);
        const ph = (lt - 0.3) / 0.45, down = ph >= 0 && (ph % 1) < 0.28, bob = Math.abs(Math.sin(Math.max(0, ph) * Math.PI)) * 8;
        X.save(); X.translate(960, 640); X.scale(s, s); X.translate(-960 + lt * 6, -640);
        char(down ? "dad_gtB" : "dad_gtA", 900, 1050, 930, { bob, sy: 1 + Math.sin(lt * 2) * 0.005 });
        X.restore();
        notes(1260, 430, lt, clamp(lt / 0.5)); notes(560, 400, lt + 0.5, clamp(lt / 0.5));
        bokeh(lt * 4, 10, 17, 0.9);   // 前景光點移動得比較快＝景深
      } },
    quiz: { bg: "living", chars: [["dad", 330, 760]], speaker: "ken", obj: "guitar", objH: 300, parts: ["This", "is", { blank: "his" }, "guitar."], opts: ["his", "her", "our"], answer: "his", owners: [[340, 600]] },
  });

  // 第 4 段 she → her：水鈴的房間
  story({ n: "s04", row: 3,
    chars: { shuiling: { img: "shuiling", x: 760, foot: 1010, h: 620 }, ken: { img: "ken", x: 1110, foot: 1010, h: 640 } },
    props: { cat: { img: "cat", x: 300, y: 640, h: 210, line: 2, word: 3, anim: "pop" },
             tv: { img: "tv", x: 1560, y: 450, h: 260, line: 3, word: 3, anim: "drop" } },
    lines: [
      { bg: "sroom", cam: [1.15, 60, 40], fx: (lt, gt, li, at) => { const k = clamp((gt - at[0]) / 0.4); bigText("Hi!", 760, 300, 110, k * clamp((at[0] + 1.5 - gt) / 0.3 + 1), ORANGE); } },
      { cam: [1.0, 0, 0], subj: { word: "she", chars: ["shuiling"] }, tags: [{ occ: 0, obj: "shuiling", label: "my", owners: ["ken"], ty: 600, ly: 330, lx: 600 }, { occ: 1, scene: 1, label: "her room" }] },
      { cam: [1.1, 160, 30], tags: [{ obj: "cat", label: "her", owners: ["shuiling"], bend: 120 }] },
      { cam: [1.1, -120, 30], tags: [{ obj: "tv", label: "her", owners: ["shuiling"], bend: 150 }] },
      { cam: [1.12, -100, 30], subj: { word: "she", chars: ["shuiling"] }, tags: [{ top: 1, label: "her free time", tx: 1500, ty: 150 }],
        fx: (lt) => { X.save(); X.globalCompositeOperation = "screen"; const g = X.createRadialGradient(1560, 440, 20, 1560, 440, 500); g.addColorStop(0, `rgba(120,200,255,${0.35 + 0.15 * Math.sin(lt * 7)})`); g.addColorStop(1, "rgba(0,0,0,0)"); X.fillStyle = g; X.fillRect(1000, 0, 920, 1080); X.restore();
          for (let i = 0; i < 3; i++) { X.fillStyle = ["#ffcf4a", "#ff7aa8", "#7be07b"][i]; X.beginPath(); X.arc(1480 + i * 70, 420 + Math.sin(lt * 5 + i) * 25, 22, 0, Math.PI * 2); X.fill(); } } },
    ],
    final: { dir: "renders/3d/s04", label: "her free time", cap: { top: 40, x: 760 }, sfx: a5 => sfx("sfx/tv_mime.ogg", a5 - 0.1, -6, 5.9) },
    quiz: { bg: "sroom", chars: [["shuiling", 330, 620]], speaker: "ken", obj: "cat", objH: 230, parts: ["This", "is", { blank: "her" }, "cat."], opts: ["his", "her", "your"], answer: "her", owners: [[340, 650]] },
  });

  // 第 5 段 we → our：學校（教室 → 籃球場）
  story({ n: "s05", row: 4,
    chars: { ken: { img: "ken", x: 520, foot: 1010, h: 640, bgs: ["classroom", "court"] }, shuiling: { img: "shuiling", x: 830, foot: 1010, h: 610, bgs: ["classroom", "court"] },
             yeh: { img: "yeh", x: 1530, foot: 1000, h: 780, bgs: ["classroom"] } },
    props: { sign: { line: 0, word: 3, anim: "pop", bg: "classroom", x: 1020, y: 270, h: 150,
                     draw: (p, k) => { panel(840, 200, 360, 140, k, "#fff6e6", NAVY, 24); txt("601", 1020, 272, 96, NAVY, { stroke: false, alpha: clamp(k * 3) }); } },
             ball: { bg: "court", x: 1180, y: 860, h: 90, draw: (p, k, lt) => basketball(1180, 900 - Math.abs(Math.sin(lt * 4)) * 220, 45, lt * 3) } },
    lines: [
      { bg: "classroom", cam: [1.05, 40, 30], subj: { word: "we", chars: ["ken", "shuiling"] } },
      { cam: [1.0, 0, 0], tags: [{ scene: 1, label: "our classroom" }] },
      { cam: [1.08, -100, 30], tags: [{ obj: "yeh", label: "our", owners: ["ken", "shuiling"], ty: 560, ly: 140, lx: 1530, bend: -160 }] },
      { bg: "court", cam: [1.0, 0, 0], tags: [{ scene: 1, label: "our basketball court", y: 130 }] },
    ],
    final: { dir: "renders/3d/s05", label: "our free time" },
    quiz: { bg: "classroom", chars: [["ken", 260, 600], ["shuiling", 520, 570]], speaker: "ken", obj: "classroom", objH: 220, parts: ["This", "is", { blank: "our" }, "classroom."], opts: ["our", "their", "my"], answer: "our", owners: [[280, 640], [530, 650]] },
  });

  // 第 6 段 they → their：爺爺奶奶家
  story({ n: "s06", row: 5, update: (gt, at, li, still) => { PROPS6.dog.walk = li === 4 && !still ? gt - at[4] : 0; },
    chars: { grandpa: { img: "grandpa", x: 560, foot: 1010, h: 760, walk: (gt, at, li) => li === 4 ? { dx: (gt - at[4]) * 120, bob: Math.abs(Math.sin((gt - at[4]) * 8)) * 10 } : null },
             grandma: { img: "grandma", x: 1330, foot: 1010, h: 720, walk: (gt, at, li) => li === 4 ? { dx: (gt - at[4]) * 120, bob: Math.abs(Math.sin((gt - at[4]) * 8 + 1)) * 10 } : null },
             ken: { img: "ken", x: 1730, foot: 1010, h: 600 } },
    props: PROPS6 = { dog: { img: "dog", x: 960, y: 800, h: 230, line: 2, word: 3, anim: "bounce",
                    draw: (p, k, lt) => { const w = p.walk || 0; iconImg("dog", 960 + w * 120, 800 - (w ? Math.abs(Math.sin(w * 10)) * 18 : 0) - (k < 1 ? Math.abs(Math.cos(k * Math.PI * 1.5)) * (1 - k) * 200 : 0), 230, 1, k < 1 ? k * 6 : 0); } } },
    lines: [
      { bg: "gphouse", cam: [1.05, 0, 30], subj: { word: "they", chars: ["grandpa", "grandma"] }, tags: [{ obj: "grandpa", label: "my", owners: ["ken"], ty: 560, ly: 205, bend: 200 }, { obj: "grandma", label: "my", owners: ["ken"], ty: 560, ly: 245 }] },
      { clear: 1, cam: [1.0, 0, -10], tags: [{ label: "their", owners: ["grandpa", "grandma"], tx: 960, ty: 420, lx: 960, ly: 250, size: 70 }] },
      { clear: 1, cam: [1.12, 0, 60], tags: [{ obj: "dog", label: "their", owners: ["grandpa", "grandma"] }] },
      { cam: [1.18, 0, 70], subj: { word: "they", chars: ["grandpa", "grandma"] }, fx: lt => { hearts(560, 560, 960, 780, lt); hearts(1330, 560, 960, 780, lt + 0.4); } },
      { clear: 1, cam: [1.05, -100, 30], subj: { word: "they", chars: ["grandpa", "grandma"] }, tags: [{ occ: 1, top: 1, label: "their free time", tx: 1500, ty: 150 }] },
    ],
    final: { dir: "renders/3d/s06", label: "their free time", cap: { x: 760, maxw: 1200 }, sfx: a5 => { for (let i = 0; i < 13; i++) sfx("sfx/step.wav", a5 + 0.2 + i * 0.42, i % 2 ? -16 : -13); } },
    quiz: { bg: "gphouse", chars: [["grandpa", 220, 720], ["grandma", 470, 680]], speaker: "ken", obj: "dog", objH: 230, parts: ["This", "is", { blank: "their" }, "dog."], opts: ["our", "his", "their"], answer: "their", owners: [[230, 640], [480, 650]] },
  });

  // ======================= his / her、our / their 快速判斷（約 1 分鐘） =======================
  {
    const t0 = NOW; say("c00_hi", t0 + 0.4, { nocap: true }); sfx("sfx/whoosh.wav", t0, -8);
    const w = i => t0 + 0.4 + W("c00_hi", i);
    seg(D("c00_hi") + 1.0, lt => {
      const gt = t0 + lt; nightBg(lt + 300, 11);
      const k1 = clamp((gt - w(0)) / 0.35), k2 = clamp((gt - w(3)) / 0.35);
      txt("his", 620, 330, 150, RED, { sc: 0.4 + 0.6 * back(k1), alpha: clamp(k1 * 3) }); bigText("or", 960, 330, 80, k1); txt("her", 1300, 330, 150, RED, { sc: 0.4 + 0.6 * back(k1), alpha: clamp(k1 * 3) });
      txt("our", 620, 640, 150, RED, { sc: 0.4 + 0.6 * back(k2), alpha: clamp(k2 * 3) }); bigText("or", 960, 640, 80, k2); txt("their", 1300, 640, 150, RED, { sc: 0.4 + 0.6 * back(k2), alpha: clamp(k2 * 3) });
      bigText("QUICK CHECK!", 960, 880, 100, clamp((gt - w(6)) / 0.35), ORANGE);
    });
    const R = [
      { who: [["dad", 0, 820]], s: "he", obj: "guitar", objH: 320, noun: "guitar.", opts: ["his", "her"], ans: "his", bg: "living" },
      { who: [["shuiling", 0, 640]], s: "she", obj: "cat", objH: 240, noun: "cat.", opts: ["his", "her"], ans: "her", bg: "sroom" },
      { who: [["mom", 0, 820]], s: "she", obj: null, noun: "bag.", opts: ["her", "his"], ans: "her", bg: "entrance" },
      { who: [["ken", -130, 640], ["shuiling", 130, 610]], s: "we", obj: "classroom", objH: 230, noun: "classroom.", opts: ["their", "our"], ans: "our", bg: "classroom" },
      { who: [["grandpa", -130, 760], ["grandma", 130, 720]], s: "they", obj: "dog", objH: 250, noun: "dog.", opts: ["our", "their"], ans: "their", bg: "gphouse" },
      { who: [["grandpa", 0, 780]], s: "he", obj: "hat", objH: 180, noun: "hat.", opts: ["her", "his"], ans: "his", bg: "gphouse" },
    ];
    R.forEach((r, i) => {
      const s0 = NOW, c0 = s0 + 1.2, c1 = c0 + 2, fly = c1 + 0.5, ak = `c0${i + 1}_a`, aa = fly + 0.3;
      F.audio.push([`audio/c0${i + 1}/${ak}.mp3`, aa, 0]);
      [0, 1].forEach(j => sfx("sfx/beep.wav", c0 + j, -8)); sfx("sfx/ding.wav", fly, -4); sfx("sfx/pop.wav", s0 + 0.1, -10);
      seg(aa - s0 + D(ak) + 0.9, lt => {
        const gt = s0 + lt; cover(r.bg, 0.5, "blur(6px) brightness(0.5)");
        txt(`${i + 1} / 6`, 1780, 80, 40, "#ffd9b8", { stroke: false });
        r.who.forEach(([img, dx, h]) => char(img, 420 + dx, 1000, h));
        bigText(r.s, 420, 1000 - Math.max(...r.who.map(x => x[2])) - 60, 110, clamp(lt / 0.35), BLUE);
        if (r.obj) iconImg(r.obj, 1250, 380 + Math.sin(lt * 2.6) * 10, r.objH, clamp((lt - 0.15) / 0.35), -0.04);
        else { X.save(); X.strokeStyle = ORANGE; X.lineWidth = 10; X.setLineDash([24, 16]); X.lineDashOffset = -T * 50; X.beginPath(); X.arc(365, 500, 95, 0, Math.PI * 2); X.stroke(); X.restore(); }   // 媽媽的包包
        const bl = sentence(["This", "is", { blank: r.ans }, r.noun], 1180, 690, 84, { fill: gt > fly ? 1 : 0 });
        r.opts.forEach((w, j) => {
          const x = 1000 + j * 360, k = clamp((lt - 0.3 - j * 0.12) / 0.35);
          if (w === r.ans && gt > c1) { if (gt < fly) { const e = ease(clamp((gt - c1) / 0.5)); bubble(w, lerp(x, bl.x, e), lerp(890, bl.y, e), 70, 1, 1); } }
          else bubble(w, x, 890, 70, k, gt > c1 ? -1 : 0);
        });
        if (gt > c0 && gt < c1) ring(1700, 380, 72, 2, gt - c0);
        if (gt > fly) bigText("✔", 1700, 380, 130, clamp((gt - fly) / 0.3), "#7be07b");
      });
    });
  }

  // ======================= 結尾：回到課本兩個答句 =======================
  {
    const t0 = NOW, q1 = t0 + 0.5, a1 = q1 + D("e00_q1") + 0.4;
    say("e00_q1", q1, { who: "Mom", x: 1150 }); say("e00_a1", a1, { who: "Ken", x: 1150 });
    seg(a1 - t0 + D("e00_a1") + 1.0, lt => {
      const gt = t0 + lt; camAt(lt, 0, 6, 1.0, 1.06);
      withCam(() => { cover("entrance", 0.5); char("mom", 470, 1010, 780, { bob: gt > q1 && gt < q1 + D("e00_q1") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 });
        char("ken", 1240, 1010, 650, { bob: gt > a1 && gt < a1 + D("e00_a1") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 }); });
      const k = clamp((gt - a1 - W("e00_a1", 1)) / 0.4); if (k > 0) { panel(1420, 240, 420, 240, k, "rgba(20,12,48,0.8)", ORANGE, 30); X.save(); X.globalAlpha = clamp(k * 3); X.beginPath(); X.roundRect(1440, 260, 380, 200, 20); X.clip(); const im = img("f3d_s02_still"); if (im && im.width) X.drawImage(im, 1440, 260, 380, 214); X.restore(); }
    });
    const u0 = NOW, q2 = u0 + 0.5, a2 = q2 + D("e00_q2") + 0.4;
    say("e00_q2", q2, { who: "Dad", x: 960 }); say("e00_a2", a2, { who: "Ken", x: 960 });
    seg(a2 - u0 + D("e00_a2") + 1.0, lt => {
      const gt = u0 + lt; camAt(lt, 0, 6, 1.0, 1.06);
      withCam(() => { cover("sroom", 0.5); iconImg("tv", 1560, 450, 260);
        X.save(); X.globalCompositeOperation = "screen"; const g = X.createRadialGradient(1560, 440, 20, 1560, 440, 500); g.addColorStop(0, `rgba(120,200,255,${0.35 + 0.15 * Math.sin(lt * 7)})`); g.addColorStop(1, "rgba(0,0,0,0)"); X.fillStyle = g; X.fillRect(1000, 0, 920, 1080); X.restore();
        char("dad", 330, 1010, 820, { bob: gt > q2 && gt < q2 + D("e00_q2") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 });
        char("ken", 760, 1010, 640, { bob: gt > a2 && gt < a2 + D("e00_a2") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 });
        char("shuiling", 1300, 1010, 610); });
      const k = clamp((gt - a2 - W("e00_a2", 0)) / 0.35); if (k > 0) bigText("She", 1300, 320, 100, k, BLUE);
    });
    // 課本兩句卡片＋完整對照表＋Great job!
    const v0 = NOW, e = v0 + 4.5; say("e00_end", e, { x: 1480, maxw: 740 }); sfx("sfx/ding.wav", v0 + 0.5, -8);
    seg(4.5 + D("e00_end") + 4.0, lt => {
      nightBg(lt + 400, 13);
      if (lt < 4.5) {
        const box = (y, q, a, k, hiQ, hiA) => {
          panel(260, y, 1400, 300, k, "rgba(255,250,240,0.97)", "#8a7bd8", 34); if (k <= 0) return;
          X.save(); X.globalAlpha = clamp(k * 3); X.fillStyle = "#e6e0f7"; X.beginPath(); X.roundRect(264, y + 150, 1392, 146, [0, 0, 30, 30]); X.fill(); X.restore();
          sentence(q, 960, y + 75, 70, { alpha: clamp(k * 3), base: NAVY }); sentence(a, 960, y + 222, 70, { alpha: clamp(k * 3), base: NAVY });
        };
        box(110, ["What", "do", "you", "do", "in", "your", "free", "time?"], ["I", "go", "jogging", "in", "my", "free", "time."], clamp((lt - 0.2) / 0.4));
        box(560, ["What", "does", "she", "do", "in", "her", "free", "time?"], ["She", "watches", "TV", "in", "her", "free", "time."], clamp((lt - 1.2) / 0.4));
      } else {
        const at = lt - 4.5; chart(lt, 6); iconImg("book", 1420, 360, 240, 1, -0.05);
        bigText("GREAT JOB!", 1420, 600, 110, clamp((at - D("e00_end") + 0.5) / 0.4), ORANGE);
      }
    });
  }

  F.dur = NOW;
  F.audio.push(["sfx/bgm.mp3", 0, -26, F.dur, "loop", F.duck]);
  window.FILM = F; window.SEG = { dur: F.dur, audio: F.audio };
  window.ready = Promise.all([document.fonts.load('700 40px "Comic Relief"'), ...Object.entries(F.need).map(([n, u]) => load(n, u))]);
})();
