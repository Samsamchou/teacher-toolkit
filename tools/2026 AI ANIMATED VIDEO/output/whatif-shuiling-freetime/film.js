// What if you were Ken in Ershui? — Shuiling's Free Time｜全片時間軸（故事稿 v1，老師 11/14 核准）。秒數由配音長度自動排。
// 每段＝爸媽問句（2D）→ 水鈴默劇 6 秒＋音效（舞台框）→ Your turn!（架構句＋s/es 提醒＋倒數 3 秒）→ Ken 念答案（字尾 s/es 換色）＋3D 水鈴 → 旁白串場。
// 沿用 Ken 版 Free Time 的 film.html（mimeStage、kara、hud…）。
(function () {
  const L = k => window.LINES[k], D = k => L(k).dur, W = (k, i) => L(k).words[i].t0;
  const F = { segs: [], captions: [], hud: [], audio: [], need: {}, duck: [] }; let NOW = 0;
  const seg = (dur, draw, pre) => { const s = { t0: NOW, dur, draw, pre }; F.segs.push(s); NOW += dur; return s; };
  const say = (key, at, o = {}) => { F.captions.push(Object.assign({ key, t0: at }, o)); F.audio.push([`audio/${key.slice(0, 3)}/${key}.mp3`, at, 0]); };
  const sfx = (f, at, db = 0, len) => F.audio.push(len ? [f, at, db, len] : [f, at, db]);
  const need = (n, u) => { F.need[n] = u; };
  const nrm = s => s.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  const wordAt = (k, w, from = 0) => { const ws = L(k).words; for (let i = from; i < ws.length; i++) if (nrm(ws[i].w) === w) return ws[i].t0; return ws[0].t0; };
  [["ken", "ken_cut"], ["shuiling", "shuiling_cut"], ["mom", "mom_A_cut"], ["dad", "dad_B_cut"], ["home_rain", "ken_home_rain"], ["home_day", "ken_home_day"],
   ["street", "ershui_street_day"], ["station_night", "ershui_station_night"], ["door", "open_door"]].forEach(([n, f]) => need(n, `assets/${f}.png`));
  const ASKER = { mom: ["mom", "Mom", 560], dad: ["dad", "Dad", 590] };
  const INDOOR = ["english", "tv", "recorder", "games", "internet"];
  // 第三人稱動詞字尾（Your turn 提醒＋Ken 答句換色）
  const SUF = { jogging: ["goes", 2], recorder: ["plays", 1], english: ["studies", 3], tv: ["watches", 2], music: ["listens", 1], internet: ["surfs", 1],
                games: ["plays", 1], basketball: ["plays", 1], bike: ["rides", 1], baseball: ["plays", 1], camping: ["goes", 2] };

  // ---------- 開場：叮咚！水鈴來 Ken 家 ----------
  {
    const t0 = NOW, bAt = t0 + 1.2, sAt = bAt + D("s00_bell") + 0.4;
    sfx("sfx/dingdong.wav", t0 + 0.2, -4); say("s00_bell", bAt); say("s00_shui", sAt);
    seg(sAt - t0 + D("s00_shui") + 0.7, lt => {
      camAt(lt, 0, sAt - t0 + 2, 1.12, 1.0, 0, 0, -20, 0);
      withCam(() => cover("door", 0.45));
      const k = clamp((lt - 0.2) / 0.25) * clamp((1.1 - lt) / 0.2);
      if (k > 0) { bigText("DING-DONG!", 1420, 260, 120, k, "#ffb347", -0.12); }
    });
    const ti = NOW; sfx("sfx/whoosh.wav", ti, -6); F.audio.push(["audio/s00/s00_title.mp3", ti + 0.5, 0]);
    seg(D("s00_title") + 2.0, lt => {
      camAt(lt, 0, 3.5, 1.08, 1.0);
      withCam(() => { cover("station_night", 0.5); rays(lt, 960, 420, 0.8);
        char("ken", 800, 840, 500, { sy: 1 + Math.sin(lt * 2) * 0.006 }); char("shuiling", 1120, 840, 470, { sy: 1 + Math.sin(lt * 2 + 1) * 0.006 }); });
      bokeh(lt, 20, 7, 0.8);
      const k1 = clamp((lt - 0.2) / 0.4), k2 = clamp((lt - 0.6) / 0.4), k3 = clamp((lt - D("s00_title") - 0.3) / 0.4);
      X.save(); X.textAlign = "center"; X.globalAlpha = k1; X.font = '700 46px "Comic Relief"'; X.fillStyle = "#ffd9b8"; X.fillText("W H A T   I F   Y O U   W E R E", 960, 120); X.restore();
      bigText("KEN IN ERSHUI?", 960, 215, 118, k2);
      bigText("SHUILING'S FREE TIME", 1440, 330, 72, k3, "#ffb347", -0.08);
    });
    sfx("sfx/pop.wav", ti + D("s00_title") + 0.3, -6);
    const b0 = NOW; say("s00_week", b0 + 0.4, { maxw: 1500 });
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    seg(D("s00_week") + 1.4, lt => {
      cover("home_day", 1.0, "blur(6px) brightness(0.75) saturate(0.8)");
      char("mom", 300, 840, 520, { alpha: clamp(lt / 0.4) }); char("dad", 1620, 840, 550, { alpha: clamp(lt / 0.4) });
      bigText("SHUILING'S WEEK", 960, 170, 96, clamp((lt - 0.3) / 0.4), "#ffb347");
      days.forEach((d, i) => { const k = clamp((lt - 1.0 - i * 0.25) / 0.35); calendar(585 + (i % 4) * 250, 380 + Math.floor(i / 4) * 250 + (i > 3 ? 0 : 0) , 0.55, d, k, i > 4 ? "#7c6cf0" : "#ff9a3c"); });
    });
    days.forEach((d, i) => sfx("sfx/pop.wav", b0 + 1.0 + i * 0.25, -12));
  }

  // ---------- Your turn! 畫面：架構句 She ____ in her free time. ＋ s/es 提醒 ＋ 倒數 3 秒 ----------
  function yourTurn(lt, o, cd0) {
    cover(o.bg, o.ay ?? 1.0, "blur(10px) brightness(0.45) saturate(0.8)");
    char("ken", 300, 860, 470, { sy: 1 + Math.sin(lt * 3) * 0.008 });
    const k = back(clamp(lt / 0.4));
    bigText("Your turn!", 960, 150, 120, k, "#ffb347", -0.05);
    // 白色句框
    const a = clamp((lt - 0.3) / 0.3), y = 470;
    X.save(); X.globalAlpha = a; X.fillStyle = "rgba(255,255,255,0.96)"; X.beginPath(); X.roundRect(560, y - 95, 1260, 190, 40); X.fill();
    X.font = '700 76px "Comic Relief"'; X.textBaseline = "middle"; X.fillStyle = "#1d1240"; X.textAlign = "left";
    X.fillText("She", 620, y); X.fillText("in her free time.", 1080, y);
    X.strokeStyle = "#ff5d73"; X.lineWidth = 8; X.setLineDash([22, 14]); X.beginPath(); X.moveTo(790, y + 40); X.lineTo(1050, y + 40); X.stroke(); X.setLineDash([]);
    X.restore();
    // s / es 提醒（指向空格）
    const b = back(clamp((lt - 0.8) / 0.35));
    if (b > 0) {
      X.save(); X.globalAlpha = clamp(b); X.translate(920, y + 170); X.scale(b, b);
      X.fillStyle = "#ff5d73"; X.beginPath(); X.roundRect(-190, -48, 380, 96, 48); X.fill();
      X.beginPath(); X.moveTo(-18, -46); X.lineTo(0, -80); X.lineTo(18, -46); X.fill();
      X.fillStyle = "#fff"; X.font = '700 56px "Comic Relief"'; X.textAlign = "center"; X.textBaseline = "middle"; X.fillText("verb + s / es", 0, 2); X.restore();
    }
    // 倒數 3-2-1
    if (lt > cd0) {
      const c = Math.max(1, 3 - Math.floor(lt - cd0)), p = (lt - cd0) % 1;
      X.save(); X.translate(1560, 800); X.fillStyle = "rgba(255,179,71,0.25)"; X.beginPath(); X.arc(0, 0, 110, 0, Math.PI * 2); X.fill();
      X.strokeStyle = "#ffb347"; X.lineWidth = 12; X.beginPath(); X.arc(0, 0, 110, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p)); X.stroke(); X.restore();
      bigText(String(c), 1560, 800, 150 + (1 - p) * 20, 1, "#fff");
    }
  }

  // ---------- 一個情境 ----------
  function scene(o) {
    const n = o.n, ask = `${n}_ask`, turn = `${n}_turn`, ken = `${n}_ken`, [aImg, aName, aH] = ASKER[o.asker];
    const MIME = 6.0;
    const t0 = NOW, aAt = t0 + 0.6, aEnd = aAt + D(ask), c0 = aEnd + 0.4, c1 = c0 + MIME + 0.6;
    say(ask, aAt, { who: aName, maxw: 1560, size: 46 });
    const dW = wordAt(ask, o.dayWord), tW = wordAt(ask, o.timeWord, 3), xW = wordAt(ask, o.wxWord);
    F.hud.push({ lab: "DAY", val: o.day, x: 90, y: 70, align: "left", t0: aAt + dW, t1: c0 },
               { lab: "TIME", val: o.time, x: 1410, y: 70, w: 420, align: "right", t0: aAt + tW, t1: c0 });
    if (o.wx) F.hud.push({ lab: "WEATHER", val: o.wx, x: 1410, y: 230, w: 420, align: "right", size: 64, t0: aAt + xW, t1: c0 });
    if (o.act !== "music") sfx(`mime/sfx/${o.act}.ogg`, c0 + 0.15, -2, MIME);      // 默劇音效（music 老師要維持無聲）
    F.duck.push([c0 - 0.2, c0 + MIME + 0.3]);
    if (o.rain) sfx("sfx/rain_loop.wav", t0, -20, c0 - t0);
    if (o.wind) sfx("sfx/wind.wav", t0, -16, c0 - t0);
    need(`mime_${o.act}`, `renders/mime/${o.act}/f0001.jpg`);
    seg(c1 - t0, lt => {
      const gt = t0 + lt;
      camAt(lt, 0, c0 - t0, 1.0, 1.07, 0, -30);
      const talk = gt > aAt && gt < aEnd;
      withCam(() => {
        cover(o.bg, o.ay ?? 1.0, o.filter || "none");
        char(aImg, 330, 840, aH, { bob: talk ? Math.abs(Math.sin(lt * 9)) * 6 : 0, sy: 1 + Math.sin(lt * 2.2) * 0.006 });
        char("ken", 1600, 840, 450, { sy: 1 + Math.sin(lt * 2 + 1) * 0.006 });
      });
      if (o.rain) rain(lt, 1.0); if (o.wind) leaves(lt, 1.0); if (o.sun) rays(lt, 1700, 80, o.sun, o.sunColor);
      bokeh(lt, 8, 7, 0.5);
      dim(clamp((gt - c0 + 0.3) / 0.3));
      mimeStage(`mime_${o.act}`, gt, c0, c1, c0 + MIME + 0.05);
    }, async lt => {
      const gt = t0 + lt; if (gt < c0) return;
      const f = String(Math.max(1, Math.min(144, 1 + Math.floor((gt - c0 - 0.15) * 24)))).padStart(4, "0");
      const key = `mime_${o.act}`; if (IM[key] && IM[key].f === f) return;
      delete IM[key]; await load(key, `renders/mime/${o.act}/f${f}.jpg`); IM[key].f = f;
    });
    // Your turn!（旁白 + 倒數 3 秒，每秒一聲）
    const y0 = NOW, cd0 = 0.4 + D(turn) + 0.5;
    F.audio.push([`audio/${n}/${turn}.mp3`, y0 + 0.4, 0]); sfx("sfx/whoosh.wav", y0, -10);
    [0, 1, 2].forEach(i => sfx("sfx/pop.wav", y0 + cd0 + i, -10));
    seg(cd0 + 3.2, lt => yourTurn(lt, o, cd0));
    // Ken 念答案＋3D 水鈴做活動（還沒渲時先顯示占位）
    const a0 = NOW; say(ken, a0 + 0.4, Object.assign({ who: "Ken", x: 1160, suf: SUF[o.act] }, o.kenCap || {}));
    seg(5.8, lt => {
      if (IM[`f3d_${n}`] && IM[`f3d_${n}`].im.width) cover(`f3d_${n}`, 0.5);
      else { cover(o.bg, o.ay ?? 1.0, "blur(8px) brightness(0.6)"); char("shuiling", 960, 840, 500); bigText(`3D: Shuiling — ${o.act}`, 960, 170, 64, 1, "#ffb347"); }
      if (o.rain && !INDOOR.includes(o.act)) rain(lt, 0.8);
    }, async lt => {
      const f = String(Math.max(0, Math.min(139, Math.round(lt * 24)))).padStart(4, "0");
      if (IM[`f3d_${n}`] && IM[`f3d_${n}`].f === f) return;
      delete IM[`f3d_${n}`]; try { await load(`f3d_${n}`, `renders/3d/${n}/f${f}.png`); IM[`f3d_${n}`].f = f; } catch (e) {}
    });
    // 旁白串場（Codex 插圖，重點在上方 3/4）
    const lk = `${n}_link`, l0 = NOW;
    say(lk, l0 + 0.2, Object.assign({ hold: 0.8, maxw: 1500 }, o.linkCap || {}));
    need(`link_${n}`, `assets/link_${n}.png`);
    seg(D(lk) + 1.0, lt => { camAt(lt, 0, 7, 1.0, 1.06, 0, o.panX || 0); withCam(() => cover(`link_${n}`, 0.5)); if (o.rain) rain(lt, 0.5); });
  }

  // ---------- 11 個情境（水鈴路線；媽媽 6 次、爸爸 5 次） ----------
  scene({ n: "s01", asker: "mom", act: "jogging",    day: "MONDAY",    dayWord: "monday",    time: "4:30", timeWord: "four",  wx: "☀ SUNNY",  wxWord: "sunny",  bg: "street", sun: 0.5 });
  scene({ n: "s02", asker: "dad", act: "recorder",   day: "MONDAY",    dayWord: "monday",    time: "7:15", timeWord: "seven", wx: "≋ WINDY",  wxWord: "windy",  bg: "home_day", wind: true, filter: "brightness(0.6) saturate(0.7) hue-rotate(20deg)" });
  scene({ n: "s03", asker: "mom", act: "english",    day: "TUESDAY",   dayWord: "tuesday",   time: "4:10", timeWord: "four",  wx: "☂ RAINY",  wxWord: "rainy",  bg: "home_rain", rain: true });
  scene({ n: "s04", asker: "dad", act: "tv",         day: "TUESDAY",   dayWord: "tuesday",   time: "8:00", timeWord: "eight", wx: "☂ RAINY",  wxWord: "rainy",  bg: "home_rain", rain: true, filter: "brightness(0.75)" });
  scene({ n: "s05", asker: "mom", act: "music",      day: "WEDNESDAY", dayWord: "wednesday", time: "1:30", timeWord: "one",   wx: "☀ HOT",    wxWord: "hot",    bg: "street", sun: 0.9, sunColor: "255,150,90" });
  scene({ n: "s06", asker: "dad", act: "internet",   day: "WEDNESDAY", dayWord: "wednesday", time: "6:40", timeWord: "six",   wx: "☁ CLOUDY", wxWord: "cloudy", bg: "home_rain", filter: "saturate(0.6) brightness(0.8)" });
  scene({ n: "s07", asker: "mom", act: "games",      day: "THURSDAY",  dayWord: "thursday",  time: "7:30", timeWord: "seven", wx: "☂ RAINY",  wxWord: "rainy",  bg: "home_rain", rain: true, wind: true, filter: "brightness(0.75)" });
  scene({ n: "s08", asker: "dad", act: "basketball", day: "FRIDAY",    dayWord: "friday",    time: "4:20", timeWord: "four",  wx: "☀ SUNNY",  wxWord: "sunny",  bg: "street", sun: 0.7 });
  scene({ n: "s09", asker: "mom", act: "bike",       day: "SATURDAY",  dayWord: "saturday",  time: "9:00", timeWord: "nine",  wx: "≋ WINDY",  wxWord: "windy",  bg: "home_day", wind: true, sun: 0.5 });
  scene({ n: "s10", asker: "dad", act: "baseball",   day: "SATURDAY",  dayWord: "saturday",  time: "2:40", timeWord: "two",   wx: "☀ SUNNY",  wxWord: "sunny",  bg: "home_day", sun: 0.6 });
  scene({ n: "s11", asker: "mom", act: "camping",    day: "SUNDAY",    dayWord: "sunday",    time: "6:15", timeWord: "six",   wx: "✦ CLEAR",  wxWord: "clear",  bg: "station_night" });

  // ---------- 結尾：一週回顧（11 個水鈴默劇小格）→ 問學生 ----------
  {
    const w0 = NOW; say("s12_week", w0 + 0.3, { top: 34, maxw: 1700 });
    const ACTS = ["jogging", "recorder", "english", "tv", "music", "internet", "games", "basketball", "bike", "baseball", "camping"];
    const dayOf = ["MON", "MON", "TUE", "TUE", "WED", "WED", "THU", "FRI", "SAT", "SAT", "SUN"], wordOf = [0, 0, 1, 1, 2, 2, 3, 4, 5, 5, 6];
    ACTS.forEach(a => need(`thumb_${a}`, `renders/mime/${a}/f0036.jpg`));
    seg(D("s12_week") + 0.8, lt => {
      const tz = W("s12_week", 7) + 0.3, z = ease(clamp((lt - tz) / 1.4));
      cover("station_night", 0.5, `brightness(${0.5 + 0.5 * z})`); rays(lt, 960, 420, z);
      for (let i = 0; i < 11; i++) {
        const same = ACTS.slice(0, i).filter((_, j) => wordOf[j] === wordOf[i]).length;
        const k = back(clamp((lt - 0.3 - W("s12_week", wordOf[i]) - same * 0.22) / 0.35)); if (k <= 0) continue;
        const col = i % 4, row = Math.floor(i / 4), cx = 390 + col * 380 + (row === 2 ? 190 : 0), cy = 300 + row * 215;
        const s = k * (1 - 0.65 * z), w = 330 * s, h = 186 * s, x = lerp(cx, 960 + (cx - 960) * 0.3, z), y = lerp(cy, 520 + (cy - 520) * 0.3, z);
        X.save(); X.globalAlpha = 1 - z * 0.85; X.fillStyle = "#fff"; X.fillRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12);
        const im = img(`thumb_${ACTS[i]}`); if (im && im.width) X.drawImage(im, x - w / 2, y - h / 2, w, h);
        X.restore(); if (z < 0.2) bigText(dayOf[i], x - w / 2 + 50, y + h / 2 - 10, 34, 1, "#ffb347");
      }
      bigText("WHAT A BUSY WEEK!", 960, 540, 110, clamp((lt - tz - 0.4) / 0.3), "#ffb347");
    });
    ACTS.forEach((a, i) => sfx("sfx/pop.wav", w0 + 0.3 + W("s12_week", wordOf[i]), -14));
    const f0 = NOW; say("s12_end", f0 + 0.5, { x: 1180 }); const y0 = f0 + 0.5 + D("s12_end") + 0.4; say("s12_you", y0, { x: 1180, maxw: 1100 });
    seg(y0 - f0 + D("s12_you") + 6.0, lt => {
      camAt(lt, 0, 9, 1.0, 1.06);
      withCam(() => { cover("station_night", 0.5); rays(lt, 960, 420, 0.8);
        char("ken", 330, 840, 470, { sy: 1 + Math.sin(lt * 2) * 0.006 }); char("shuiling", 560, 840, 430, { sy: 1 + Math.sin(lt * 2 + 1) * 0.006 }); });
      bokeh(lt, 20, 11, 0.8);
      bigText("WHAT IF YOU WERE", 960, 110, 56, clamp(lt / 0.4), "#ffd9b8"); bigText("KEN IN ERSHUI?", 960, 215, 118, clamp((lt - 0.3) / 0.4));
      const tc = y0 - f0 + D("s12_you") + 0.5; if (lt > tc) { const c = Math.max(1, 5 - Math.floor(lt - tc)); bigText(String(c), 1450, 520, 260, 1, "#ffb347"); }
    });
  }

  F.dur = NOW;
  F.audio.push(["sfx/bgm.mp3", 0, -26, F.dur, "loop", F.duck]);
  window.FILM = F; window.SEG = { dur: F.dur, audio: F.audio };
  window.ready = Promise.all([document.fonts.load('700 40px "Comic Relief"'), ...Object.entries(F.need).map(([n, u]) => load(n, u))]);
})();
