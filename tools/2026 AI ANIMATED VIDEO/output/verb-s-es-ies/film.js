// 動詞 -s／-es／-ies 文法動畫｜第一部分：雪人國度講解（規格卡 rdq/RDQ-spec-verb-s-es-ies-20261121.md，英文稿 v1）。
// 秒數由配音長度自動排。畫風 I 引擎（film.html）；所有格那支的時間軸備份在 src/_possessive_ref/。
(function () {
  window.FACE = { shuiling: { cx: 540, cy: 470, s: 430 } };
  POSW = ["rides", "plays", "goes", "watches", "studies", "flies"]; SUBW = ["i", "im", "you", "he", "hes", "she", "shes", "we", "they"];
  const L = k => window.LINES[k], D = k => L(k).dur, W = (k, i) => L(k).words[i].t0;
  const F = { segs: [], captions: [], hud: [], audio: [], need: {}, duck: [] }; let NOW = 0;
  const seg = (dur, draw, pre) => { const s = { t0: NOW, dur, draw, pre }; F.segs.push(s); NOW += dur; return s; };
  const say = (key, at, o = {}) => { if (!o.nocap) F.captions.push(Object.assign({ key, t0: at }, o)); F.audio.push([`audio/${key.slice(0, 3)}/${key}.mp3`, at, 0]); };
  const sfx = (f, at, db = 0, len) => F.audio.push(len ? [f, at, db, len] : [f, at, db]);
  const need = (n, u) => { F.need[n] = u; };
  [["ken", "ken_cut"], ["mom", "mom_A_cut"], ["dad", "dad_B_cut"], ["shuiling", "shuiling_cut"], ["zunbo", "zunbo_cut"],
   ["snow", "bg_snowland"], ["camp", "campfire_group"], ["snowc", "snowman_cold_cut"], ["snoww", "snowman_warm_cut"], ["flame", "flame_cut"], ["ball", "snowball_cut"],
   ["bike", "prop_bike_cut"], ["bball", "prop_basketball_cut"], ["shoes", "prop_shoes_cut"], ["ebook", "prop_englishbook_cut"]].forEach(([n, f]) => need(n, `assets/${f}.png`));

  // ---------- 小工具 ----------
  const K = (lt, t, d = 0.35) => clamp((lt - t) / d);
  const talk = (gt, at, key) => gt > at && gt < at + D(key) ? Math.abs(Math.sin(gt * 9)) * 6 : 0;
  function snowfall(t, n = 70, seed = 7) {
    const r = rnd(seed); X.save(); X.fillStyle = "#fff";
    for (let i = 0; i < n; i++) { const x0 = r() * 1920, sp = 40 + r() * 70, s = 2 + r() * 4, ph = r() * 1080, sw = r() * 6;
      X.globalAlpha = 0.35 + r() * 0.5; X.beginPath(); X.arc((x0 + Math.sin(t * 1.2 + sw) * 30 + 1920) % 1920, (ph + t * sp) % 1080, s, 0, Math.PI * 2); X.fill(); }
    X.restore();
  }
  function snowBg(t, dark = 0, cold = 0) {   // 雪人國度背景；cold＝藍色冷調
    cover("snow", 0.5); snowfall(t);
    if (cold > 0) { X.save(); X.fillStyle = `rgba(60,120,255,${0.18 * cold})`; X.fillRect(0, 0, 1920, 1080); X.restore(); }
    if (dark > 0) { X.save(); X.fillStyle = `rgba(20,12,52,${dark})`; X.fillRect(0, 0, 1920, 1080); X.restore(); }
  }
  function snowman(cx, foot, h, warm = 0, k = 1) {   // warm 0＝發抖的冷雪人、1＝溫暖開心
    if (k <= 0) return; const hh = h * (0.4 + 0.6 * back(k)), a = clamp(k * 3);
    if (warm < 1) { char("snowc", cx + Math.sin(T * 38) * 3 * (1 - warm), foot, hh, { alpha: a }); if (warm < 0.5) puffs(T, cx + hh * 0.2, foot - hh * 0.72, Math.round(cx)); }
    if (warm > 0) { X.save(); const g = X.createRadialGradient(cx, foot - hh * 0.5, 10, cx, foot - hh * 0.5, hh * 0.9);
      g.addColorStop(0, `rgba(255,170,80,${0.4 * warm})`); g.addColorStop(1, "rgba(255,170,80,0)"); X.fillStyle = g; X.fillRect(cx - hh, foot - hh * 1.4, hh * 2, hh * 1.6); X.restore();
      char("snoww", cx, foot, hh, { alpha: a * warm, sy: 1 + Math.sin(T * 4) * 0.012 * warm }); }
  }
  function flame(cx, cy, h, k = 1, label, lsize = 60) {   // 小火苗＋紅色名牌（-s／-es／-ies）
    if (k <= 0) return; const yy = cy + Math.sin(T * 5 + cx) * 8;
    X.save(); X.globalCompositeOperation = "lighter"; const g = X.createRadialGradient(cx, yy, 5, cx, yy, h * 0.9);
    g.addColorStop(0, `rgba(255,150,40,${0.45 * clamp(k * 2)})`); g.addColorStop(1, "rgba(255,150,40,0)"); X.fillStyle = g; X.fillRect(cx - h, yy - h, h * 2, h * 2); X.restore();
    sprite("flame", cx, yy, h * (0.4 + 0.6 * back(k)) * (1 + Math.sin(T * 9 + cx) * 0.03), Math.sin(T * 4 + cx) * 0.05, clamp(k * 3));
    if (label) tag(cx, yy + h * 0.62, label, k, lsize, 0);
  }
  function vword(base, end, cx, y, size, k = 1, endK = 1, o = {}) {   // 動詞：字幹白色＋字尾紅色（endK＝字尾跳出程度）
    if (k <= 0) return cx; const wb = tw(base, size), we = end ? tw(end, size) : 0, x0 = cx - (wb + we) / 2, a = clamp(k * 3) * (o.alpha ?? 1);
    txt(base, x0 + wb / 2, y, size, o.color || "#fff", { alpha: a });
    if (end && endK > 0) { X.save(); X.shadowColor = "rgba(255,120,40,0.9)"; X.shadowBlur = 30 * clamp(endK * 2);
      txt(end, x0 + wb + we / 2, y, size, RED, { alpha: a * clamp(endK * 3), sc: 0.4 + 0.6 * back(endK), strokeColor: "#fff", lw: 0.1 }); X.restore(); }
    return x0 + wb + we / 2;
  }
  function pair(a, base, end, cx, y, size, k1, k2) {   // ride → rides
    const wa = tw(a, size), wb = tw(base + end, size), gap = 200, x0 = cx - (wa + gap + wb) / 2;
    if (k1 > 0) txt(a, x0 + wa / 2, y, size, "#fff", { alpha: clamp(k1 * 3), sc: 0.5 + 0.5 * back(k1) });
    arrowR(x0 + wa + 45, x0 + wa + gap - 55, y, clamp(k2 * 1.5));
    vword(base, end, x0 + wa + gap + wb / 2, y, size, k2, clamp(k2 * 1.5 - 0.5));
  }
  function zcard(s, cx, y, k, size = 50, stroke = ORANGE) {   // 中文說明卡
    if (k <= 0) return; const w = tw(s, size, true) + size * 1.6, h = size * 1.9;
    panel(cx - w / 2, y - h / 2, w, h, k, "rgba(20,12,48,0.82)", stroke, 24); txt(s, cx, y + 2, size, "#fff", { zh: true, stroke: false, alpha: clamp(k * 3) });
  }
  function title(num, s, k) {   // 左上角規則標題
    if (k <= 0) return; panel(70, 60, 110, 110, k, RED, "#fff", 55); txt(num, 125, 118, 70, "#fff", { stroke: false, alpha: clamp(k * 3) });
    txt(s, 215, 116, 62, "#fff", { zh: true, align: "left", alpha: clamp(k * 3), lw: 0.14 });
  }
  const DBLUE = "#1c56c8";
  function label(s, cx, y, size, color, k) { if (k > 0) txt(s, cx, y, size, color, { alpha: clamp(k * 3), sc: 0.5 + 0.5 * back(k), strokeColor: "#fff", lw: 0.12 }); }

  // ---------- V0：Ken ride／Mom rides — 為什麼多了 s？ ----------
  {
    const t0 = NOW, a = t0 + 0.6, b = a + D("v00_ken") + 0.7, c = b + D("v00_mom") + 0.8;
    say("v00_ken", a, { who: "Ken" }); say("v00_mom", b, { who: "Ken" }); say("v00_why", c);
    const wRide = W("v00_ken", 3), wRides = W("v00_mom", 4);
    sfx("sfx/pop.wav", a + wRide, -10); sfx("sfx/tag.wav", b + wRides, -6); sfx("sfx/ding.wav", c + W("v00_why", 3), -8);
    seg(c - t0 + D("v00_why") + 1.6, lt => {
      const gt = t0 + lt; nightBg(lt, 5);
      const kM = K(gt, b - 0.3), kQ = K(gt, c - 0.2);
      char("ken", 400, 800, 560, { bob: talk(gt, a, "v00_ken") || talk(gt, b, "v00_mom") }); iconImg("bike", 640, 700, 230, K(gt, a + wRide), 0);
      txt("I", 400, 150, 96, BLUE, { alpha: K(gt, a + 0.2) });
      if (kM > 0) { char("mom", 1500, 800, 620, { alpha: clamp(kM * 2), flip: true }); iconImg("bike", 1260, 700, 230, K(gt, b + wRides), 0); txt("She", 1500, 110, 96, BLUE, { alpha: clamp(kM * 3) }); }
      // 中間：ride vs rides
      vword("ride", "", 760, 330, 120, K(gt, a + wRide));
      vword("ride", "s", 1150, 330, 120, K(gt, b + wRides), K(gt, b + wRides + 0.25, 0.4));
      if (kQ > 0) { const p = 1 + Math.sin(gt * 6) * 0.04; X.save(); X.translate(1262, 330); X.scale(p, p); X.strokeStyle = ORANGE; X.lineWidth = 9; X.setLineDash([18, 14]); X.lineDashOffset = -gt * 60;
        X.globalAlpha = clamp(kQ * 3); X.beginPath(); X.arc(0, 4, 78, 0, Math.PI * 2); X.stroke(); X.restore();
        bigText("?", 1400, 250, 150, K(gt, c + W("v00_why", 2)), ORANGE, 0.2);
        zcard("為什麼多了一個 s？", 960, 520, K(gt, c + W("v00_why", 2)), 56); }
    });
  }

  // ---------- V1：雪人國度 — he、she、一個人名：孤單又寒冷 ----------
  const SX = [470, 960, 1450], NAMES = ["Ken", "Mom", "Dad", "Shuiling", "Zun-Bo"];
  const trio = (lt, ks, warm = [0, 0, 0], foot = 790, h = 440) => {
    ["he", "she"].forEach((w, i) => { snowman(SX[i], foot, h, warm[i], ks[i]); label(w, SX[i], foot - h * 0.3, 92, DBLUE, ks[i]); });
    snowman(SX[2], foot, h, warm[2], ks[2]); label(NAMES[Math.floor(lt / 0.9) % NAMES.length], SX[2], foot - h * 0.3, 60, DBLUE, ks[2]);
  };
  {
    const t0 = NOW, a = t0 + 0.8, b = a + D("v01_land") + 0.6, c = b + D("v01_three") + 0.6;
    say("v01_land", a); say("v01_three", b); say("v01_cold", c);
    sfx("sfx/whoosh.wav", t0, -8); [1, 2, 3].forEach((i, n) => sfx("sfx/pop.wav", b + W("v01_three", [1, 2, 3][n]), -8)); sfx("sfx/wind.wav", c, -10, D("v01_cold") + 2);
    seg(c - t0 + D("v01_cold") + 1.8, lt => {
      const gt = t0 + lt, cold = K(gt, c, 0.8); snowBg(lt, 0, cold);
      const out = 1 - K(gt, b - 0.4, 0.3);
      if (out > 0) { X.save(); X.globalAlpha = out; bigText("SNOWMAN LAND", 960, 300, 150, K(lt, 0.3)); zcard("雪人國度", 960, 470, K(lt, 0.7), 64); X.restore(); }
      const ks = [1, 2, 3].map(i => K(gt, b + W("v01_three", i))); trio(lt, ks);
      ["他", "她", "一個人名"].forEach((z, i) => zcard(z, SX[i], 838, K(gt, b + W("v01_three", i + 1) + 0.3), 44, "#8fd0ff"));
      if (cold > 0) { bigText("So cold!", 960, 170, 110, K(gt, c + W("v01_cold", 5)), "#9fdcff");
        zcard("只有一個人 → 好孤單、好冷！", 960, 300, K(gt, c + W("v01_cold", 0) + 0.2), 54, "#8fd0ff"); }
    });
  }

  // ---------- V2：三團小火苗來幫忙 ----------
  const FL = ["-s", "-es", "-ies"];
  {
    const t0 = NOW, a = t0 + 0.5, b = a + D("v02_fire") + 0.5;
    say("v02_fire", a); say("v02_names", b, { nocap: true });
    const wn = [0, 1, 3].map(i => W("v02_names", i));
    sfx("sfx/whoosh.wav", a + 0.3, -8); wn.forEach(w => sfx("sfx/ding.wav", b + w, -8));
    seg(b - t0 + D("v02_names") + 1.5, lt => {
      const gt = t0 + lt; snowBg(lt + 30, 0, 1); trio(lt + 30, [1, 1, 1]);
      FL.forEach((f, i) => { const k = K(gt, a + 0.3 + i * 0.25, 0.7), y = lerp(-150, 190, ease(k)); const kn = K(gt, b + wn[i]);
        if (k > 0) flame(SX[i], y, 230, 1, kn > 0 ? f : null, 70 + 14 * (1 - kn)); });
      zcard("三團小火苗來幫忙！", 960, 900, K(gt, b), 54);
    });
  }
  {   // 示範：He play ＋ 火苗 → plays，雪人變溫暖
    const t0 = NOW, a = t0 + 0.5; say("v02_warm", a, { x: 1180, maxw: 900 });
    const wAfter = W("v02_warm", 3), wWarm = W("v02_warm", 9), fly0 = a + wAfter, hit = fly0 + 0.9;
    sfx("sfx/whoosh.wav", fly0, -8); sfx("sfx/ding.wav", hit, -4);
    seg(a - t0 + D("v02_warm") + 2.4, lt => {
      const gt = t0 + lt, warm = K(gt, hit, 1.0); snowBg(lt + 60, 0.15, 1 - warm);
      snowman(420, 800, 520, warm); label("he", 420, 800 - 520 * 0.3, 104, DBLUE, 1);
      const kf = K(gt, fly0, 0.9), size = 150, wb = tw("play", size), xs = 1180 - (wb + tw("s", size)) / 2 + wb + tw("s", size) / 2;
      txt("He", 1180 - (wb + tw("s", size)) / 2 - 150, 330, size, BLUE, {});
      vword("play", "s", 1180, 330, size, 1, K(gt, hit, 0.4));
      if (gt < hit + 0.1) flame(lerp(1500, xs, ease(kf)), lerp(120, 330, ease(kf)), lerp(240, 120, ease(kf)), 1, kf < 0.2 ? "-s" : null);
      else if (warm > 0) { X.save(); X.globalCompositeOperation = "lighter"; const g = X.createRadialGradient(xs, 330, 5, xs, 330, 260 * (1 - warm * 0.5));
        g.addColorStop(0, `rgba(255,150,40,${0.6 * (1 - warm)})`); g.addColorStop(1, "rgba(255,150,40,0)"); X.fillStyle = g; X.fillRect(xs - 300, 30, 600, 600); X.restore(); }
      zcard("動詞後面加上小火苗 → 變溫暖！", 1180, 560, K(gt, hit + 0.3), 52);
      if (warm > 0.6) bigText("Warm!", 420, 130, 100, K(gt, a + wWarm), ORANGE);
    });
  }

  // ---------- 規則場景共用：左邊人物＋雪人、右邊規則 ----------
  function example(gt, at, key, who, prop, subj, base, end, rest, lt) {   // 例句：人物＋道具＋大字（字尾紅）
    const k = K(gt, at - 0.3); if (k <= 0) return;
    char(who, 330, 745, who === "zunbo" ? 470 : (who === "shuiling" ? 490 : 540), { alpha: clamp(k * 2), bob: 0 });
    char("ken", 1780, 745, 360, { alpha: clamp(k * 2), flip: true, bob: talk(gt, at, key) });
    iconImg(prop, 590, 640, 180, K(gt, at + 0.2), 0);
    const size = 92, ws = tw(subj + " ", size), wv = tw(base + end, size), wr = tw(" " + rest, size), x0 = 1190 - (ws + wv + wr) / 2, a = clamp(k * 3);
    txt(subj, x0 + ws / 2 - tw(" ", size) / 2, 590, size, BLUE, { alpha: a }); vword(base, end, x0 + ws + wv / 2, 590, size, k, K(gt, at + 0.6, 0.4)); txt(rest, x0 + ws + wv + wr / 2 + tw(" ", size) / 2, 590, size, "#fff", { alpha: a });
  }

  // ---------- V3：火苗 1 ＋s ----------
  {
    const t0 = NOW, a = t0 + 0.6, b = a + D("v03_rule") + 0.8; say("v03_rule", a); say("v03_dad", b, { who: "Ken" });
    const w = i => a + W("v03_rule", i); [5, 7].forEach(i => sfx("sfx/tag.wav", w(i), -6)); sfx("sfx/whoosh.wav", t0, -10);
    seg(b - t0 + D("v03_dad") + 1.6, lt => {
      const gt = t0 + lt, ex = K(gt, b - 0.4); snowBg(lt + 90, 0.42); title("1", "直接加 s", K(lt, 0.2)); flame(1700, 150, 210, K(lt, 0.3), "-s", 64);
      const up = ease(ex);
      if (gt < w(4)) vword("verb + ", "s", 960, 440, 150, K(gt, w(2)), K(gt, w(3), 0.3));
      X.save(); X.translate(0, -up * 60); X.globalAlpha = 1 - up * 0.15;
      pair("ride", "ride", "s", 960, lerp(360, 300, up), lerp(130, 96, up), K(gt, w(4)), K(gt, w(5)));
      pair("play", "play", "s", 960, lerp(560, 440, up), lerp(130, 96, up), K(gt, w(6)), K(gt, w(7))); X.restore();
      example(gt, b, "v03_dad", "dad", "bball", "He", "play", "s", "basketball", lt);
    });
  }

  // ---------- V4：火苗 2 ＋es（五顆小雪球 s、sh、ch、x、o） ----------
  {
    const END = ["s", "sh", "ch", "x", "o"], wi = [0, 1, 3, 5, 6];
    const t0 = NOW, a = t0 + 0.6, b = a + D("v04_rule") + 0.5, c = b + D("v04_five") + 0.9, d = c + D("v04_go") + 0.8;
    say("v04_rule", a); say("v04_five", b, { nocap: true }); say("v04_go", c); say("v04_sl", d, { who: "Ken" });
    sfx("sfx/whoosh.wav", t0, -10); wi.forEach(i => sfx("sfx/pop.wav", b + W("v04_five", i), -6)); [1, 3].forEach(i => sfx("sfx/tag.wav", c + W("v04_go", i), -6));
    seg(d - t0 + D("v04_sl") + 1.6, lt => {
      const gt = t0 + lt, ph2 = K(gt, c - 0.5), ex = K(gt, d - 0.4); snowBg(lt + 130, 0.42); title("2", "加 es", K(lt, 0.2)); if (gt < a + W("v04_rule", 5)) vword("verb + ", "es", 960, 440, 150, K(gt, a + W("v04_rule", 2)), K(gt, a + W("v04_rule", 3), 0.3)); flame(1700, 150, 210, K(lt, 0.3), "-es", 64);
      // 五顆小雪球滾出來
      const by = lerp(430, 300, ease(ph2)), bs = lerp(210, 150, ease(ph2)), aB = 1 - ex;
      if (aB > 0) END.forEach((e, i) => { const k = K(gt, b + W("v04_five", wi[i]), 0.6); if (k <= 0) return;
        const xT = lerp(400, 1520, i / 4), xT2 = lerp(520, 1400, i / 4), x = lerp(-150, lerp(xT, xT2, ease(ph2)), ease(k));
        X.save(); X.globalAlpha = aB; sprite("ball", x, by, bs, (1 - ease(k)) * -7, 1); txt(e, x, by + 4, bs * 0.42, RED, { strokeColor: "#fff", lw: 0.12 }); X.restore(); });
      if (ph2 < 1) { const WD = [["pas", "s"], ["wa", "sh"], ["wat", "ch"], ["fi", "x"], ["g", "o"]]; X.save(); X.globalAlpha = 1 - ph2;
        WD.forEach(([p, e], i) => { const k = K(gt, a + W("v04_rule", 5) + i * 0.12), x = lerp(400, 1520, i / 4), sz = 80, wp = tw(p, sz), we = tw(e, sz); if (k <= 0) return;
          const hi = K(gt, b + W("v04_five", wi[i]) + 0.3);
          txt(p, x - (wp + we) / 2 + wp / 2, 640, sz, "#fff", { alpha: clamp(k * 3) * (1 - ph2) }); txt(e, x + (wp + we) / 2 - we / 2, 640, sz, hi > 0 ? RED : ORANGE, { alpha: clamp(k * 3) * (1 - ph2), sc: 1 + 0.15 * hi, strokeColor: hi > 0 ? "#fff" : NAVY, lw: hi > 0 ? 0.1 : 0.16 }); });
        X.restore(); }
      if (ph2 <= 0) zcard("字尾是 s、sh、ch、x、o → 加 es", 960, 830, K(gt, b + W("v04_five", 0) + 0.3), 54);
      if (ph2 > 0 && ex < 1) { X.save(); X.globalAlpha = 1 - ex;
        pair("go", "go", "es", 960, 520, 120, K(gt, c + W("v04_go", 0)), K(gt, c + W("v04_go", 1)));
        pair("watch", "watch", "es", 960, 700, 120, K(gt, c + W("v04_go", 2)), K(gt, c + W("v04_go", 3))); X.restore(); }
      if (ex > 0) { pair("go", "go", "es", 960, 330, 100, 1, 1); example(gt, d, "v04_sl", "shuiling", "shoes", "She", "go", "es", "jogging", lt); }
    });
  }

  // ---------- V5：火苗 3  y → i ＋es ----------
  {
    const t0 = NOW, a = t0 + 0.6, b = a + D("v05_rule") + 0.8, c = b + D("v05_st") + 0.8;
    say("v05_rule", a); say("v05_st", b); say("v05_zb", c, { who: "Ken" });
    const wY = a + W("v05_rule", 2), wI = a + W("v05_rule", 4), wES = a + W("v05_rule", 6);
    sfx("sfx/whoosh.wav", t0, -10); sfx("sfx/pop.wav", wY, -6); sfx("sfx/ding.wav", wI, -6); sfx("sfx/tag.wav", wES, -6); [1, 3].forEach(i => sfx("sfx/tag.wav", b + W("v05_st", i), -6));
    seg(c - t0 + D("v05_zb") + 1.6, lt => {
      const gt = t0 + lt, ph2 = K(gt, b - 0.5), ex = K(gt, c - 0.4); snowBg(lt + 170, 0.42); title("3", "y 變 i，加 es", K(lt, 0.2)); flame(1700, 150, 210, K(lt, 0.3), "-ies", 60);
      if (ph2 < 1) {   // 大字示範：study 的 y 被劃掉、掉下去 → i ＋ es
        X.save(); X.globalAlpha = 1 - ph2; const size = 190, cy = 420, wS = tw("stud", size), wy = tw("y", size), x0 = 960 - (wS + tw("ies", size)) / 2;
        txt("stud", x0 + wS / 2, cy, size, "#fff", { alpha: 1 - ph2 });
        const ky = K(gt, wY, 0.3), kfall = K(gt, wI - 0.25, 0.5), ki = K(gt, wI), kes = K(gt, wES);
        if (kfall < 1) { X.save(); X.translate(x0 + wS + wy / 2, cy + ease(kfall) * 500); X.rotate(ease(kfall) * 1.2); X.globalAlpha = (1 - kfall) * (1 - ph2);
          txt("y", 0, 0, size, "#cfd3ff", {});
          if (ky > 0) { X.strokeStyle = RED; X.lineWidth = 16; X.lineCap = "round"; X.beginPath(); X.moveTo(-60, -90); X.lineTo(-60 + 120 * ky, -90 + 190 * ky); X.stroke();
            if (ky >= 1) { X.beginPath(); X.moveTo(60, -90); X.lineTo(-60, 100); X.stroke(); } }
          X.restore(); }
        const wi = tw("i", size);
        if (ki > 0) txt("i", x0 + wS + wi / 2, cy, size, RED, { sc: 0.4 + 0.6 * back(ki), alpha: clamp(ki * 3) * (1 - ph2), strokeColor: "#fff", lw: 0.1 });
        if (kes > 0) txt("es", x0 + wS + wi + tw("es", size) / 2, cy, size, RED, { sc: 0.4 + 0.6 * back(kes), alpha: clamp(kes * 3) * (1 - ph2), strokeColor: "#fff", lw: 0.1 });
        X.restore();
        if (ph2 <= 0) zcard("子音＋y：把 y 改成 i，再加 es", 960, 680, K(gt, wY + 0.2), 54);
      }
      if (ph2 > 0 && ex < 1) { X.save(); X.globalAlpha = 1 - ex;
        pair("study", "stud", "ies", 960, 380, 120, K(gt, b + W("v05_st", 0)), K(gt, b + W("v05_st", 1)));
        pair("fly", "fl", "ies", 960, 580, 120, K(gt, b + W("v05_st", 2)), K(gt, b + W("v05_st", 3))); X.restore(); }
      if (ex > 0) { pair("study", "stud", "ies", 960, 330, 100, 1, 1); example(gt, c, "v05_zb", "zunbo", "ebook", "He", "stud", "ies", "English", lt); }
    });
  }

  // ---------- V6：I／You／We／They 一大群雪人圍著火堆 — 不用火苗 ----------
  {
    const t0 = NOW, a = t0 + 0.7, b = a + D("v06_many") + 0.8; say("v06_many", a); say("v06_no", b);
    const BIG = ["I", "You", "We", "They"], EX = [["I", "ride"], ["We", "play"], ["They", "go"]];
    sfx("sfx/whoosh.wav", t0, -8); BIG.forEach((x, i) => sfx("sfx/pop.wav", a + W("v06_many", i), -8)); sfx("sfx/beep.wav", b + W("v06_no", 2), -8);
    seg(b - t0 + D("v06_no") + 2.0, lt => {
      const gt = t0 + lt, ph2 = K(gt, b - 0.3); camAt(lt, 0, 20, 1.0, 1.06);
      withCam(() => cover("camp", 0.62)); snowfall(lt, 40, 11);
      X.save(); X.fillStyle = "rgba(20,12,52,0.35)"; X.fillRect(0, 0, 1920, 330); X.restore();
      BIG.forEach((w, i) => label(w, 330 + i * 360, lerp(150, 110, ease(ph2)), lerp(120, 84, ease(ph2)), BLUE, K(gt, a + W("v06_many", i))));
      if (ph2 <= 0) zcard("人很多，互相取暖 → 很溫暖！", 960, 300, K(gt, a + W("v06_many", 4)), 54);
      if (ph2 > 0) {
        const kNo = K(gt, b + W("v06_no", 0));   // 火苗＋紅色禁止線
        if (kNo > 0) { flame(1800, 250, 140, kNo); X.save(); X.globalAlpha = clamp(kNo * 3); X.strokeStyle = RED; X.lineWidth = 18; X.lineCap = "round";
          X.beginPath(); X.arc(1800, 250, 95, 0, Math.PI * 2); X.stroke(); X.beginPath(); X.moveTo(1733, 183); X.lineTo(1867, 317); X.stroke(); X.restore(); }
        EX.forEach(([s, v], i) => { const k = K(gt, b + W("v06_no", 4 + i * 2)); if (k <= 0) return; const x = 380 + i * 480, size = 96, ws = tw(s + " ", size), wv = tw(v, size);
          txt(s, x - (ws + wv) / 2 + ws / 2, 240, size, BLUE, { alpha: clamp(k * 3) }); txt(v, x + (ws + wv) / 2 - wv / 2, 240, size, "#fff", { alpha: clamp(k * 3), sc: 0.5 + 0.5 * back(k) }); });
        zcard("不用小火苗，動詞不加 s", 960, 370, K(gt, b + W("v06_no", 2) + 0.2), 54);
      }
    });
  }

  // ---------- V7：總整理（老師的雪人圖：he／she／人名 ＋ 動詞 s／es／ies） ----------
  {
    const t0 = NOW, a = t0 + 0.6, b = a + D("v07_sum") + 0.9; say("v07_sum", a, { x: 1240, maxw: 1000 }); say("v07_go", b);
    const w = i => a + W("v07_sum", i); const ROW = [["ride", "s", 6, "-s"], ["go", "es", 7, "-es"], ["stud", "ies", 10, "-ies"]];
    sfx("sfx/whoosh.wav", t0, -8); ROW.forEach(r => sfx("sfx/tag.wav", w(r[2]), -6)); sfx("sfx/ding.wav", b, -6);
    seg(b - t0 + D("v07_go") + 2.2, lt => {
      const gt = t0 + lt, end = K(gt, b - 0.2); snowBg(lt + 230, 0.3);
      if (end < 1) { X.save(); X.globalAlpha = 1 - end;
        snowman(400, 830, 640, 1, K(lt, 0.2));
        label("he", 400, 545, 74, DBLUE, K(gt, w(1))); label("she", 400, 630, 74, DBLUE, K(gt, w(2)));
        label(NAMES[Math.floor(lt / 0.9) % NAMES.length], 400, 715, 54, DBLUE, K(gt, w(3)));
        bigText("+", 800, 420, 150, K(gt, w(5)));
        ROW.forEach((r, i) => { const k = K(gt, w(r[2])), y = 200 + i * 200; flame(1010, y, 150, k); vword(r[0], r[1], 1330, y, 120, k, K(gt, w(r[2]) + 0.2, 0.4)); tag(1680, y, r[3], k, 56, 0); });
        X.restore(); }
      if (end > 0) { bigText("3 STORIES", 960, 360, 170, end, ORANGE); FL.forEach((f, i) => flame(560 + i * 400, 620, 200, K(gt, b + 0.3 + i * 0.2), f, 60)); }
    });
  }

  F.dur = NOW;
  F.audio.push(["sfx/bgm.mp3", 0, -26, F.dur, "loop", F.duck]);
  window.FILM = F; window.SEG = { dur: F.dur, audio: F.audio };
  window.ready = Promise.all([document.fonts.load('700 40px "Comic Relief"'), ...Object.entries(F.need).map(([n, u]) => load(n, u))]);
})();
