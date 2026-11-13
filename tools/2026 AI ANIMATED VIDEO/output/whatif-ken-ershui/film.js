// What if you were Ken in Ershui?｜全片時間軸（照 Google 文件故事稿 v1）。秒數由配音長度自動排。
// 每段＝問句（2D）→ 線索 2.5 秒（Listen!／Look!）→ Ken 答句（3D 抵達鏡頭 5.8 秒）→ 串場（2D）。
(function () {
  const L = k => window.LINES[k], D = k => L(k).dur, W = (k, i) => L(k).words[i].t0;
  const F = { segs: [], captions: [], hud: [], audio: [], need: {}, duck: [] }; let NOW = 0;
  const seg = (dur, draw, pre) => { const s = { t0: NOW, dur, draw, pre }; F.segs.push(s); NOW += dur; return s; };
  const say = (key, at, o = {}) => { F.captions.push(Object.assign({ key, t0: at }, o)); F.audio.push([`audio/${key.slice(0, 3)}/${key}.mp3`, at, 0]); };
  const sfx = (f, at, db = 0, len) => F.audio.push(len ? [`sfx/${f}`, at, db, len] : [`sfx/${f}`, at, db]);
  const need = (n, u) => { F.need[n] = u; };
  [["ken", "ken_cut"], ["grandma", "grandma_cut"], ["zunbo", "zunbo_cut"], ["shuiling", "shuiling_cut"], ["home_rain", "ken_home_rain"], ["home_day", "ken_home_day"],
   ["street", "ershui_street_day"], ["station_night", "ershui_station_night"], ["hills", "jiji_hills"], ["train", "jiji_train_cut"], ["window", "ken_train_window"],
   ["bedroom", "bedroom_mirror"], ["court", "school_court"], ["book", "book_old_train"], ["clinic", "clinic_doctor"], ["comic", "ken_comic"], ["plate", "table_plate"],
   ["dumpling", "dumpling_cut"], ["park", "park_sky"], ["bubbletea", "ken_bubbletea"], ["museum", "museum_train"]].forEach(([n, f]) => need(n, `assets/${f}.png`));
  const PLACES = ["station", "post", "school", "library", "hospital", "bookstore", "restaurant", "park", "tea", "supermarket", "museum"];
  PLACES.forEach(p => { need(`ic_${p}_1`, `assets/icons/${p}_1.png`); need(`ic_${p}_2`, `assets/icons/${p}_2.png`); });
  for (let i = 1; i <= 11; i++) need(`thumb${i}`, `renders/3d/s${String(i).padStart(2, "0")}/f0139.png`);
  const RUN_LAST = Math.round((D("s03_link") + 1.0) * 24);   // 3D 跑步鏡頭最後一格（b3d_shot.py 的 s03run 用同一個長度）
  const ASKER = { grandma: ["grandma", "Grandma", 470], zunbo: ["zunbo", "Zun-Bo", 430], shuiling: ["shuiling", "Shuiling", 440] };

  // ---------- 開場 ----------
  {
    const t0 = NOW, wAt = t0 + 0.6, hAt = wAt + D("s00_wake") + 0.4;
    say("s00_wake", wAt); say("s00_huh", hAt); sfx("pop.wav", hAt + W("s00_huh", 1), -4);
    seg(hAt - t0 + D("s00_huh") + 0.6, lt => {
      const hl = t0 + lt;
      camAt(lt, 0, hAt - t0, 1.0, 1.25, 0, -260, 0, 40);
      if (hl > hAt) { const k = ease((hl - hAt) / 0.35); CAM = { s: lerp(CAM.s, 1.7, k), x: lerp(CAM.x, -560, k), y: lerp(CAM.y, 60, k) }; }
      withCam(() => cover("bedroom", 0.5), hl > hAt && hl < hAt + 0.5 ? 6 : 0);
      const blink = lt < 1.2 ? 1 - clamp(lt / 0.5) + (lt > 0.7 && lt < 0.9 ? 0.8 : 0) : 0;
      if (blink > 0) { X.fillStyle = `rgba(10,5,25,${clamp(blink)})`; X.fillRect(0, 0, 1920, 1080); }
      if (hl > hAt + W("s00_huh", 1)) bigText("?!", 1500, 300, 180, clamp((hl - hAt - W("s00_huh", 1)) / 0.3), "#ffb347", -0.15);
    });
    const ti = NOW; sfx("whoosh.wav", ti, -6); F.audio.push(["audio/s00/s00_title.mp3", ti + 0.5, 0]);
    seg(D("s00_title") + 1.6, lt => {
      camAt(lt, 0, 3.5, 1.08, 1.0);
      withCam(() => { cover("station_night", 0.5); rays(lt, 960, 420, 0.8); char("ken", 960, 840, 520, { sy: 1 + Math.sin(lt * 2) * 0.006 }); });
      bokeh(lt, 20, 7, 0.8);
      const k1 = clamp((lt - 0.2) / 0.4), k2 = clamp((lt - 0.6) / 0.4);
      X.save(); X.textAlign = "center"; X.globalAlpha = k1; X.font = '700 46px "Comic Relief"'; X.fillStyle = "#ffd9b8"; X.fillText("W H A T   I F   Y O U   W E R E", 960, 120); X.restore();
      bigText("KEN IN ERSHUI?", 960, 215, 118, k2);
    });
    const b0 = NOW; say("s00_break", b0 + 0.4); sfx("pop.wav", b0 + 0.4, -8);
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    seg(D("s00_break") + 1.0, lt => {
      cover("home_day", 1.0, "blur(6px) brightness(0.75) saturate(0.8)");
      bigText("SPRING BREAK!", 960, 170, 110, clamp((lt - 0.3) / 0.4), "#ffb347");
      days.forEach((d, i) => { const k = clamp((lt - 1.2 - i * 0.28) / 0.35); sfx; calendar(210 + i * 250, 430, 0.62, d, k, i > 4 ? "#7c6cf0" : "#ff9a3c"); });
    });
    days.forEach((d, i) => sfx("pop.wav", b0 + 1.2 + i * 0.28, -12));
  }

  // ---------- 一個情境 ----------
  function scene(o) {
    const n = o.n, ask = o.askKey || `${n}_ask`, ken = `${n}_ken`, [aImg, aName, aH] = ASKER[o.asker];
    const t0 = NOW, aAt = t0 + 0.6, aEnd = aAt + D(ask), c0 = aEnd + 0.3, c1 = c0 + (o.clueLen || 2.5);
    if (o.clueLen) F.duck.push([c0 - 0.4, c1 + 0.3]);   // 長線索聲播放時，背景音樂調小
    say(ask, aAt, { who: aName });
    F.hud.push({ lab: "DAY", val: o.day, x: 90, y: 70, align: "left", t0: aAt + W(ask, 1), t1: c1 },
               { lab: "WEATHER", val: o.wx, x: 1410, y: 230, w: 420, align: "right", size: 64, t0: aAt + W(ask, 3), t1: c1 },
               { lab: "TIME", val: o.time, x: 1410, y: 70, w: 420, align: "right", t0: aAt + W(ask, 6), t1: c1 });
    if (o.clue === "sound") sfx(o.clueFile || `clue_${o.place}.mp3`, c0 - 0.1, -3, o.clueLen); else { sfx("pop.wav", c0, -8); sfx("pop.wav", c0 + 0.35, -8); }
    if (o.rain) sfx("rain_loop.wav", t0, -20, c1 - t0 + 5.8);
    if (o.wind) sfx("wind.wav", t0, -16, c1 - t0);
    seg(c1 - t0, lt => {
      const gt = t0 + lt;
      camAt(lt, 0, c0 - t0, 1.0, 1.07, 0, -30);
      const talk = gt > aAt && gt < aEnd;
      withCam(() => {
        cover(o.bg, o.ay ?? 1.0, o.filter || "none");
        char(aImg, 300, 830, aH, { bob: talk ? Math.abs(Math.sin(lt * 9)) * 6 : 0, sy: 1 + Math.sin(lt * 2.2) * 0.006 });
        char("ken", 1620, 830, 450, { sy: 1 + Math.sin(lt * 2 + 1) * 0.006, dx: o.shiver ? Math.sin(lt * 45) * 2.5 : 0 });
        if (o.shiver) { puffs(lt, 1590, 480, 9); puffs(lt + 0.4, 330, 470, 4); }
      });
      if (o.rain) rain(lt, 1.0); if (o.wind) leaves(lt, 1.0); if (o.sun) rays(lt, 1700, 80, o.sun, o.sunColor);
      bokeh(lt, 8, 7, 0.5);
      dim(clamp((gt - c0 + 0.2) / 0.3));
      if (o.clue === "sound") listenIcon(gt, c0, c1); else lookIcons(gt, c0, c1, `ic_${o.place}_1`, `ic_${o.place}_2`);
    });
    const a0 = NOW; say(ken, a0 + 0.4, { who: "Ken", x: 1160 });
    seg(5.8, lt => { cover(`f3d_${n}`, 0.5); if (o.rain) rain(lt, 0.8); if (o.wind) leaves(lt, 0.6); },
        async lt => {
          const f = String(Math.max(0, Math.min(139, Math.round(lt * 24)))).padStart(4, "0");
          if (IM[`f3d_${n}`] && IM[`f3d_${n}`].f === f) return;
          delete IM[`f3d_${n}`]; await load(`f3d_${n}`, `renders/3d/${n}/f${f}.png`); IM[`f3d_${n}`].f = f;
        });
    if (o.link) {
      const lk = `${n}_link`, l0 = NOW;
      say(lk, l0 + 0.2, Object.assign({ hold: 0.8 }, o.link.cap || { top: 50 }));
      seg(D(lk) + 1.0, lt => o.link.draw(lt, l0 + 0.2, lk), o.link.pre);
    }
  }
  const at = (lk, i, l0) => l0 + W(lk, i);   // 串場句第 i 個字的時間（全片秒數）

  // ---------- 1 Monday 火車站（奶奶） ----------
  scene({ n: "s01", askKey: "s01_grandma", asker: "grandma", day: "MONDAY", time: "7:30", wx: "☂ RAINY", bg: "home_rain", rain: true, clue: "sound", place: "station",
    link: { draw(lt, l0, lk) {
      if (lt < 3.0) {
        const k = lt / 3.0; camAt(lt, 0, 3, 1.05, 1.08, 20, -40);
        withCam(() => { cover("hills", 0.5); const im = img("train"); if (im) { const h = 300, w = im.width * h / im.height; X.drawImage(im, lerp(-w * 0.75, 1960, k), 642 - h + Math.sin(lt * 30) * 1.5, w, h); } });
        rain(lt, 0.6 * (1 - k));
      } else { camAt(lt, 3, 7.5, 1.0, 1.1, 0, 20, 0, -10); withCam(() => cover("window", 0.5)); drops(lt, 1 - 0.7 * clamp((lt - 3) / 4)); }
    }, cap: { x: 1300, top: 50 } } });
  sfx("train_pass.mp3", F.segs[F.segs.length - 1].t0 - 0.2, -8);

  // ---------- 2 Monday 郵局（圳寶） ----------
  scene({ n: "s02", asker: "zunbo", day: "MONDAY", time: "3:40", wx: "☁ CLOUDY", bg: "street", filter: "saturate(0.7) brightness(0.92) hue-rotate(-8deg)", clue: "icons", place: "post",
    link: { draw(lt, l0, lk) {
      const gt = l0 + lt - 0.2 + 0.2; camAt(lt, 0, 5, 1.0, 1.05);
      withCam(() => cover("street", 1.0, "saturate(0.7) brightness(0.9) hue-rotate(-8deg)"));
      const k = clamp(lt / 2.4); envelope(lerp(500, 1650, ease(k)), lerp(720, 140, ease(k)) + Math.sin(lt * 6) * 25, 1.1 - 0.5 * k, Math.sin(lt * 4) * 0.4);
      const tm = at(lk, 3, l0) + 0.6 - l0;
      calendar(960, 520, 1.0, lt < tm + 0.15 ? "MONDAY" : "TUESDAY", clamp((lt - (at(lk, 2, l0) - l0)) / 0.35) * (lt > tm && lt < tm + 0.3 ? Math.abs(Math.cos((lt - tm) / 0.3 * Math.PI)) : 1), lt < tm + 0.15 ? "#ff9a3c" : "#5bb5ff");
    } } });

  // ---------- 3 Tuesday 學校（水鈴） ----------
  scene({ n: "s03", asker: "shuiling", day: "TUESDAY", time: "9:00", wx: "≋ WINDY", bg: "home_day", wind: true, clue: "sound", place: "school",
    link: { draw(lt) { cover("f3d_s03run", 0.5); leaves(lt, 1.0); },        // 老師 11/13：改成 3D Ken 用跑的追球
      pre: async lt => {
        const f = String(Math.max(0, Math.min(RUN_LAST, Math.round(lt * 24)))).padStart(4, "0");
        if (IM.f3d_s03run && IM.f3d_s03run.f === f) return;
        delete IM.f3d_s03run; await load("f3d_s03run", `renders/3d/s03run/f${f}.png`); IM.f3d_s03run.f = f;
      } } });
  F.audio.push(["sfx/wind.wav", NOW - 7.0, -12, 6.8]);

  // ---------- 4 Wednesday 圖書館（奶奶） ----------
  scene({ n: "s04", asker: "grandma", day: "WEDNESDAY", time: "2:30", wx: "☂ RAINY", bg: "home_rain", rain: true, clue: "icons", place: "library",
    link: { draw(lt, l0, lk) {
      const ta = at(lk, 9, l0) - l0; camAt(lt, 0, ta, 1.0, 1.3, 260, 260, 30, 30);
      withCam(() => cover("book", 0.5), lt > ta && lt < ta + 0.5 ? 9 : 0);
      bigText("ACHOO!", 1300, 520, 150, clamp((lt - ta) / 0.3), "#fff", 0.08);
    } } });
  { const ls = F.segs[F.segs.length - 1]; sfx("pop.wav", ls.t0 + 0.2 + W("s04_link", 9), -2); }

  // ---------- 5 Thursday 醫院（奶奶） ----------
  scene({ n: "s05", asker: "grandma", day: "THURSDAY", time: "8:15", wx: "❄ COLD", bg: "home_day", filter: "saturate(0.65) brightness(0.92) hue-rotate(18deg)", shiver: true, clue: "sound", place: "hospital",
    link: { draw(lt, l0, lk) {
      const ta = at(lk, 9, l0) - l0; camAt(lt, 0, 8, 1.0, 1.08, 0, 30);
      withCam(() => cover("clinic", 0.5, `brightness(${0.85 + 0.2 * clamp((lt - ta) / 1.2)})`));
      rays(lt, 960, 120, clamp((lt - ta) / 1.2) * 1.2);
    }, cap: { x: 1250 } } });

  // ---------- 6 Thursday 書店（圳寶） ----------
  scene({ n: "s06", asker: "zunbo", day: "THURSDAY", time: "4:00", wx: "☀ SUNNY", bg: "street", filter: "saturate(1.1) brightness(1.03)", sun: 0.6, clue: "icons", place: "bookstore",
    link: { draw(lt, l0, lk) {
      camAt(lt, 0, 7, 1.0, 1.08, 40, 40); withCam(() => cover("comic", 0.5));
      [5, 6, 7].forEach((wi, j) => bigText("HA!", 1250 + j * 170, 260 + (j % 2) * 90, 96, clamp((lt - (at(lk, wi, l0) - l0)) / 0.25), "#ffb347", -0.2 + j * 0.2));
      bigText("GRRR...", 760, 760, 64, clamp((lt - (at(lk, 11, l0) - l0)) / 0.3), "#fff", -0.1);
    }, cap: { x: 470, maxw: 860 } } });   // 老師 11/13：字幕放左下角，不擋 Ken 和漫畫

  { const ls = F.segs[F.segs.length - 1]; [5, 6, 7].forEach(i => sfx("pop.wav", ls.t0 + 0.2 + W("s06_link", i), -6)); }
  // ---------- 7 Friday 餐廳（水鈴） ----------
  scene({ n: "s07", asker: "shuiling", day: "FRIDAY", time: "6:20", wx: "☀ HOT", bg: "street", filter: "sepia(0.35) saturate(1.3) hue-rotate(-20deg) brightness(0.95)", sun: 0.8, sunColor: "255,150,90", clue: "sound", place: "restaurant",
    link: { draw(lt, l0, lk) {
      camAt(lt, 0, 6, 1.0, 1.06); withCam(() => cover("plate", 0.5));
      const t3 = at(lk, 2, l0) - l0, t20 = at(lk, 3, l0) - l0; const times = [0, 1, 2].map(i => at(lk, i, l0) - l0);
      for (let i = 0; i < 17; i++) times.push(t3 + 0.3 + (t20 - t3 - 0.3) * i / 17);
      let cnt = 0; const r = rnd(4);
      times.forEach((ts, i) => {
        const k = clamp((lt - ts) / 0.35), ang = r() * Math.PI * 2, rad = 40 + r() * 150;
        const tx = 960 + Math.cos(ang) * rad * 1.3, ty = 600 + Math.sin(ang) * rad * 0.55;
        if (k > 0) { cnt++; sprite("dumpling", tx, lerp(-100, ty, ease(k)), 120, (r() - 0.5) * 0.6); }
      });
      if (cnt) bigText(String(cnt), 1650, 300, 170, 1, "#ffb347");
      bigText("YUM!", 960, 330, 140, clamp((lt - (at(lk, 5, l0) - l0)) / 0.3), "#fff", -0.06);
    } } });

  { const ls = F.segs[F.segs.length - 1]; sfx("pop.wav", ls.t0 + 0.2 + W("s07_link", 5), -4); }
  // ---------- 8 Saturday 公園（圳寶） ----------
  scene({ n: "s08", asker: "zunbo", day: "SATURDAY", time: "10:30", wx: "☀ SUNNY", bg: "home_day", sun: 0.5, clue: "icons", place: "park",
    link: { draw(lt, l0, lk) {
      camAt(lt, 0, 8, 1.0, 1.04, 0, 20); withCam(() => cover("park", 1.0));
      const th = at(lk, 9, l0) - l0; rays(lt, 1750, 60, 0.5 + 0.8 * clamp((lt - th) / 0.8));
      const kb = char("ken", 420, 830, 420, { sy: 1 + Math.sin(lt * 2) * 0.006 });
      const hx = kb.x + kb.w * 0.93, hy = kb.y + kb.h * 0.6;               // Ken 的手（風箏線從手拉出去）
      const up = [3, 4, 5].reduce((a, wi) => a + ease(clamp((lt - (at(lk, wi, l0) - l0)) / 0.6)), 0) / 3;
      const kx = lerp(hx + 160, 1380, up), ky = lerp(hy - 120, 210, up) + Math.sin(lt * 2) * 12;
      X.save(); X.strokeStyle = "rgba(255,255,255,0.9)"; X.lineWidth = 3; X.beginPath(); X.moveTo(hx, hy); X.quadraticCurveTo((hx + kx) / 2, Math.max(hy, ky) + 60, kx, ky + 100); X.stroke(); X.restore();
      kite(kx, ky, 0.9, Math.sin(lt * 2) * 0.15, lt);
      if (up > 0.02) bigText(`${Math.round(5 + up * 45)} m`, 1660, 420, 110, 1, "#fff");
      if (lt > th) { X.fillStyle = "rgba(120,190,255,0.9)"; for (let i = 0; i < 3; i++) { const p = ((lt - th) * 1.2 + i / 3) % 1; X.beginPath(); X.ellipse(kb.x + kb.w * (0.25 + i * 0.25), kb.y + 40 + p * 60, 8, 12, 0, 0, Math.PI * 2); X.fill(); } }
    } } });

  // ---------- 9 Saturday 飲料店（水鈴） ----------
  scene({ n: "s09", asker: "shuiling", day: "SATURDAY", time: "1:50", wx: "☀ HOT", bg: "park", sun: 1.0, clue: "sound", place: "tea",
    link: { draw(lt, l0, lk) {
      camAt(lt, 0, 7, 1.0, 1.06, 30, 30); withCam(() => cover("bubbletea", 0.5));
      bigText("AHH!", 1640, 500, 130, clamp((lt - (at(lk, 7, l0) - l0)) / 0.3), "#5bb5ff", 0.1);
      const tm = at(lk, 8, l0) - l0, tf = tm + 1.0;
      calendar(1640, 235, 0.7, lt < tf + 0.15 ? "SATURDAY" : "SUNDAY", clamp((lt - tm) / 0.35) * (lt > tf && lt < tf + 0.3 ? Math.abs(Math.cos((lt - tf) / 0.3 * Math.PI)) : 1), lt < tf + 0.15 ? "#7c6cf0" : "#ef4f5a");
    }, cap: { x: 1540, maxw: 740 } } });

  { const ls = F.segs[F.segs.length - 1]; sfx("pop.wav", ls.t0 + 0.2 + W("s09_link", 7), -4); }
  // ---------- 10 Sunday 超市（奶奶） ----------
  scene({ n: "s10", asker: "grandma", day: "SUNDAY", time: "9:45", wx: "☀ SUNNY", bg: "home_day", sun: 0.5, clue: "icons", place: "supermarket",
    link: { draw(lt, l0, lk) {
      withCam(() => cover("street", 1.0, "saturate(1.1) brightness(1.03)"));
      char("zunbo", 420, 830, 430); char("shuiling", 1500, 830, 440); const kb = char("ken", 960, 830, 450);
      const hx = 960, hy = kb.y + kb.h * 0.62;
      const t1 = at(lk, 2, l0) - l0, t2 = at(lk, 4, l0) - l0, t3 = at(lk, 7, l0) - l0;
      if (lt > t1) cookies(hx + 110, hy - 10, clamp((lt - t1) / 0.3), 0.1);
      if (lt > t2) { const k = ease(clamp((lt - t2) / 0.6)); cookies(lerp(hx, 520, k), lerp(hy, 560, k) - Math.sin(k * Math.PI) * 140, 1, k * 6); }
      if (lt > t3) { const k = ease(clamp((lt - t3) / 0.6)); cookies(lerp(hx, 1400, k), lerp(hy, 570, k) - Math.sin(k * Math.PI) * 140, 1, -k * 6); }
    } } });

  // ---------- 11 Sunday 博物館（水鈴），沒有串場 ----------
  scene({ n: "s11", asker: "shuiling", day: "SUNDAY", time: "2:00", wx: "☁ CLOUDY", bg: "street", filter: "saturate(0.7) brightness(0.92) hue-rotate(-8deg)", clue: "sound", place: "museum",
    clueFile: "amb_museum.mp3", clueLen: 18.0 });   // 老師 11/13：博物館音效要完整播完（遊戲原檔 18 秒）

  // ---------- 結尾 ----------
  {
    const e0 = NOW; say("s12_look", e0 + 0.3, { top: 50 });
    seg(D("s12_look") + 0.9, lt => {
      camAt(lt, 0, 5.5, 1.0, 1.1, 60, 60); withCam(() => cover("museum", 0.5));
      const tb = W("s12_look", 10) + 0.3, k = back(clamp((lt - tb) / 0.4));
      if (k > 0) {
        const cx = 1500, cy = 560, r = 210 * k, im = img("book");
        X.save(); X.beginPath(); X.arc(cx, cy, r, 0, Math.PI * 2); X.clip();
        if (im) X.drawImage(im, im.width * 0.22, im.height * 0.18, im.width * 0.38, im.height * 0.48, cx - r * 1.2, cy - r * 1.4, r * 2.4, r * 2.8);
        X.restore(); X.lineWidth = 12; X.strokeStyle = "#fff"; X.beginPath(); X.arc(cx, cy, r, 0, Math.PI * 2); X.stroke();
      }
    });
    sfx("pop.wav", e0 + 0.3 + W("s12_look", 10) + 0.3, -6);
    const w0 = NOW; say("s12_week", w0 + 0.3, { top: 34, maxw: 1700 });
    const dayOf = ["MON", "MON", "TUE", "WED", "THU", "THU", "FRI", "SAT", "SAT", "SUN", "SUN"], wordOf = [0, 0, 1, 2, 3, 3, 4, 5, 5, 6, 6];
    seg(D("s12_week") + 0.8, lt => {
      const tz = W("s12_week", 7) + 0.3, z = ease(clamp((lt - tz) / 1.4));
      cover("station_night", 0.5, `brightness(${0.5 + 0.5 * z})`); rays(lt, 960, 420, z);
      for (let i = 0; i < 11; i++) {
        const k = back(clamp((lt - 0.3 - W("s12_week", wordOf[i]) - (i > 0 && wordOf[i] === wordOf[i - 1] ? 0.25 : 0)) / 0.35)); if (k <= 0) continue;
        const col = i % 4, row = Math.floor(i / 4), cx = 390 + col * 380 + (row === 2 ? 190 : 0), cy = 330 + row * 205;
        const s = k * (1 - 0.65 * z), w = 330 * s, h = 186 * s, x = lerp(cx, 960 + (cx - 960) * 0.3, z), y = lerp(cy, 520 + (cy - 520) * 0.3, z);
        X.save(); X.globalAlpha = 1 - z * 0.85; X.fillStyle = "#fff"; X.fillRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12);
        const im = img(`thumb${i + 1}`); if (im && im.width) X.drawImage(im, x - w / 2, y - h / 2, w, h);
        X.restore(); if (z < 0.2) bigText(dayOf[i], x - w / 2 + 50, y + h / 2 - 10, 34, 1, "#ffb347");
      }
      bigText("WHAT A WEEK!", 960, 540, 120, clamp((lt - tz - 0.4) / 0.3), "#ffb347");
    });
    for (let i = 0; i < 11; i++) sfx("pop.wav", w0 + 0.3 + W("s12_week", wordOf[i]), -14);
    const f0 = NOW; say("s12_end", f0 + 0.5, { x: 1180 }); sfx("whoosh.wav", f0, -8);
    seg(D("s12_end") + 3.6, lt => {
      camAt(lt, 0, 9, 1.0, 1.06);
      withCam(() => { cover("station_night", 0.5); rays(lt, 960, 420, 0.8); char("ken", 420, 830, 470, { sy: 1 + Math.sin(lt * 2) * 0.006 }); });
      bokeh(lt, 20, 11, 0.8);
      bigText("WHAT IF YOU WERE", 960, 110, 56, clamp(lt / 0.4), "#ffd9b8");
      bigText("KEN IN ERSHUI?", 960, 215, 118, clamp((lt - 0.3) / 0.4));
      const tq = 0.5 + D("s12_end"); if (lt > tq) bigText("?", 1450, 520, 260 + Math.sin(lt * 5) * 14, clamp((lt - tq) / 0.3), "#ffb347");
    });
  }

  F.dur = NOW;
  F.audio.push(["sfx/bgm.mp3", 0, -26, F.dur, "loop", F.duck]);
  window.FILM = F; window.SEG = { dur: F.dur, audio: F.audio };
  window.ready = Promise.all([document.fonts.load('700 40px "Comic Relief"'), ...Object.entries(F.need).map(([n, u]) => load(n, u))]);
})();
