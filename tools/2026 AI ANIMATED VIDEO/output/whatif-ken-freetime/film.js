// What if you were Ken in Ershui?（Free Time 版）｜全片時間軸（照故事稿 v1，老師 11/13 核准）。秒數由配音長度自動排。
// 每段＝爸媽問句（2D）→ 默劇 6 秒＋音效（舞台框）＋停頓 1 秒 → Ken 答句（3D 做活動 5.8 秒）→ 旁白串場（2D）。
(function () {
  const L = k => window.LINES[k], D = k => L(k).dur, W = (k, i) => L(k).words[i].t0;
  const F = { segs: [], captions: [], hud: [], audio: [], need: {}, duck: [] }; let NOW = 0;
  const seg = (dur, draw, pre) => { const s = { t0: NOW, dur, draw, pre }; F.segs.push(s); NOW += dur; return s; };
  const say = (key, at, o = {}) => { F.captions.push(Object.assign({ key, t0: at }, o)); F.audio.push([`audio/${key.slice(0, 3)}/${key}.mp3`, at, 0]); };
  const sfx = (f, at, db = 0, len) => F.audio.push(len ? [f, at, db, len] : [f, at, db]);
  const need = (n, u) => { F.need[n] = u; };
  const nrm = s => s.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  const wordAt = (k, w, from = 0) => { const ws = L(k).words; for (let i = from; i < ws.length; i++) if (nrm(ws[i].w) === w) return ws[i].t0; return ws[0].t0; };
  const PAR = window.PARENTS || { mom: "mom_A", dad: "dad_B" };   // 老師 11/13 挑：媽媽 A、爸爸 B
  [["ken", "ken_cut"], ["mom", `${PAR.mom}_cut`], ["dad", `${PAR.dad}_cut`], ["home_rain", "ken_home_rain"], ["home_day", "ken_home_day"],
   ["street", "ershui_street_day"], ["station_night", "ershui_station_night"], ["bedroom", "bedroom_mirror"]].forEach(([n, f]) => need(n, `assets/${f}.png`));
  const ASKER = { mom: ["mom", "Mom", 560], dad: ["dad", "Dad", 590] };

  // ---------- 開場 ----------
  {
    const t0 = NOW, wAt = t0 + 0.6, hAt = wAt + D("s00_wake") + 0.4;
    say("s00_wake", wAt); say("s00_huh", hAt); sfx("sfx/pop.wav", hAt + W("s00_huh", 1), -4);
    seg(hAt - t0 + D("s00_huh") + 0.6, lt => {
      const hl = t0 + lt;
      camAt(lt, 0, hAt - t0, 1.0, 1.25, 0, -260, 0, 40);
      if (hl > hAt) { const k = ease((hl - hAt) / 0.35); CAM = { s: lerp(CAM.s, 1.7, k), x: lerp(CAM.x, -560, k), y: lerp(CAM.y, 60, k) }; }
      withCam(() => cover("bedroom", 0.5), hl > hAt && hl < hAt + 0.5 ? 6 : 0);
      const blink = lt < 1.2 ? 1 - clamp(lt / 0.5) + (lt > 0.7 && lt < 0.9 ? 0.8 : 0) : 0;
      if (blink > 0) { X.fillStyle = `rgba(10,5,25,${clamp(blink)})`; X.fillRect(0, 0, 1920, 1080); }
      if (hl > hAt + W("s00_huh", 1)) bigText("?!", 1500, 300, 180, clamp((hl - hAt - W("s00_huh", 1)) / 0.3), "#ffb347", -0.15);
    });
    const ti = NOW; sfx("sfx/whoosh.wav", ti, -6); F.audio.push(["audio/s00/s00_title.mp3", ti + 0.5, 0]);
    seg(D("s00_title") + 1.8, lt => {
      camAt(lt, 0, 3.5, 1.08, 1.0);
      withCam(() => { cover("station_night", 0.5); rays(lt, 960, 420, 0.8); char("ken", 960, 840, 520, { sy: 1 + Math.sin(lt * 2) * 0.006 }); });
      bokeh(lt, 20, 7, 0.8);
      const k1 = clamp((lt - 0.2) / 0.4), k2 = clamp((lt - 0.6) / 0.4), k3 = clamp((lt - D("s00_title") - 0.3) / 0.4);
      X.save(); X.textAlign = "center"; X.globalAlpha = k1; X.font = '700 46px "Comic Relief"'; X.fillStyle = "#ffd9b8"; X.fillText("W H A T   I F   Y O U   W E R E", 960, 120); X.restore();
      bigText("KEN IN ERSHUI?", 960, 215, 118, k2);
      bigText("FREE TIME", 1490, 330, 96, k3, "#ffb347", -0.1);
    });
    sfx("sfx/pop.wav", ti + D("s00_title") + 0.3, -6);
    const b0 = NOW; say("s00_week", b0 + 0.4);
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    seg(D("s00_week") + 1.0, lt => {
      cover("home_day", 1.0, "blur(6px) brightness(0.75) saturate(0.8)");
      bigText("FREE TIME!", 960, 170, 110, clamp((lt - 0.3) / 0.4), "#ffb347");
      days.forEach((d, i) => { const k = clamp((lt - 1.0 - i * 0.25) / 0.35); calendar(210 + i * 250, 430, 0.62, d, k, i > 4 ? "#7c6cf0" : "#ff9a3c"); });
    });
    days.forEach((d, i) => sfx("sfx/pop.wav", b0 + 1.0 + i * 0.25, -12));
  }

  // ---------- 一個情境 ----------
  // o: n, asker, act, day (HUD), dayWord, time (HUD), timeWord, wx (HUD), wxWord, bg, filter, rain/wind/sun, mimeLen
  function scene(o) {
    const n = o.n, ask = `${n}_ask`, ken = `${n}_ken`, [aImg, aName, aH] = ASKER[o.asker];
    const MIME = o.mimeLen || 6.0;
    const t0 = NOW, aAt = t0 + 0.6, aEnd = aAt + D(ask), c0 = aEnd + 0.4, c1 = c0 + MIME + 1.2;
    say(ask, aAt, { who: aName, maxw: 1560, size: 46 });   // 問句很長（約 20 字）→ 小一點、寬一點，兩行就好
    const dW = wordAt(ask, o.dayWord), tW = wordAt(ask, o.timeWord, 3), xW = wordAt(ask, o.wxWord);
    F.hud.push({ lab: "DAY", val: o.day, x: 90, y: 70, align: "left", t0: aAt + dW, t1: c0 },
               { lab: "TIME", val: o.time, x: 1410, y: 70, w: 420, align: "right", t0: aAt + tW, t1: c0 });
    if (o.wx) F.hud.push({ lab: "WEATHER", val: o.wx, x: 1410, y: 230, w: 420, align: "right", size: 64, t0: aAt + xW, t1: c0 });
    if (o.act !== "music") sfx(`mime/${o.act}.ogg`, c0 + 0.15, -2, MIME);      // 默劇音效（music 老師要維持無聲）
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
    // Ken 答句＋3D 做活動（還沒渲時先顯示占位）
    const a0 = NOW; say(ken, a0 + 0.4, { who: "Ken", x: 1160 });
    seg(5.8, lt => {
      if (IM[`f3d_${n}`] && IM[`f3d_${n}`].im.width) cover(`f3d_${n}`, 0.5);
      else { cover(o.bg, o.ay ?? 1.0, "blur(8px) brightness(0.6)"); char("ken", 960, 840, 520); bigText(`3D: ${o.act}`, 960, 170, 70, 1, "#ffb347"); }
      if (o.rain) rain(lt, 0.8);
    }, async lt => {
      const f = String(Math.max(0, Math.min(139, Math.round(lt * 24)))).padStart(4, "0");
      if (IM[`f3d_${n}`] && IM[`f3d_${n}`].f === f) return;
      delete IM[`f3d_${n}`]; try { await load(`f3d_${n}`, `renders/3d/${n}/f${f}.png`); IM[`f3d_${n}`].f = f; } catch (e) {}
    });
    // 旁白串場（畫面之後換成每段的插圖；先用背景）
    const lk = `${n}_link`, l0 = NOW;
    say(lk, l0 + 0.2, Object.assign({ hold: 0.8, maxw: 1500 }, o.linkCap || {}));   // 串場句字幕在最下緣（插圖重點都畫在上方 3/4）
    need(`link_${n}`, `assets/link_${n}.png`);   // 串場插圖（Codex，重點在上方 3/4）
    seg(D(lk) + 1.0, lt => { camAt(lt, 0, 7, 1.0, 1.06, 0, o.panX || 0); withCam(() => cover(`link_${n}`, 0.5)); if (o.rain) rain(lt, 0.5); if (o.link) o.link(lt); });
  }

  // ---------- 11 個情境（路線 A；媽媽 6 次、爸爸 5 次） ----------
  scene({ n: "s01", asker: "mom", act: "english",    day: "MONDAY",    dayWord: "monday",    time: "4:10",  timeWord: "four",  wx: "☂ RAINY",  wxWord: "rainy", bg: "home_rain", rain: true });
  scene({ n: "s02", asker: "dad", act: "tv",         day: "MONDAY",    dayWord: "monday",    time: "7:30",  timeWord: "seven", wx: "☂ RAINY",  wxWord: "rainy", bg: "home_rain", rain: true, filter: "brightness(0.8)" });
  scene({ n: "s03", asker: "mom", act: "jogging",    day: "TUESDAY",   dayWord: "tuesday",   time: "7:00",  timeWord: "seven", wx: "☀ SUNNY",  wxWord: "sunny", bg: "home_day", sun: 0.5 });
  scene({ n: "s04", asker: "dad", act: "music",      day: "TUESDAY",   dayWord: "tuesday",   time: "4:20",  timeWord: "four",  wx: "☀ HOT",    wxWord: "hot",   bg: "street", sun: 0.9, sunColor: "255,150,90" });
  scene({ n: "s05", asker: "mom", act: "recorder",   day: "TUESDAY",   dayWord: "tuesday",   time: "6:15",  timeWord: "six",   wx: null,        wxWord: "",      bg: "home_day", filter: "sepia(0.3) brightness(0.85)" });
  scene({ n: "s06", asker: "dad", act: "games",      day: "WEDNESDAY", dayWord: "wednesday", time: "8:00",  timeWord: "eight", wx: "☁ CLOUDY", wxWord: "cloudy", bg: "home_rain", filter: "saturate(0.6) brightness(0.8)" });
  scene({ n: "s07", asker: "mom", act: "internet",   day: "THURSDAY",  dayWord: "thursday",  time: "4:40",  timeWord: "four",  wx: "☂ RAINY",  wxWord: "rainy", bg: "home_rain", rain: true });
  scene({ n: "s08", asker: "dad", act: "bike",       day: "SATURDAY",  dayWord: "saturday",  time: "9:30",  timeWord: "nine",  wx: "≋ WINDY",  wxWord: "windy", bg: "home_day", wind: true, sun: 0.5 });
  scene({ n: "s09", asker: "mom", act: "basketball", day: "SATURDAY",  dayWord: "saturday",  time: "2:50",  timeWord: "two",   wx: "☀ SUNNY",  wxWord: "sunny", bg: "street", sun: 0.7 });
  scene({ n: "s10", asker: "mom", act: "camping",    day: "SATURDAY",  dayWord: "saturday",  time: "6:40",  timeWord: "six",   wx: "✦ CLEAR",  wxWord: "clear", bg: "station_night" });
  scene({ n: "s11", asker: "dad", act: "baseball",   day: "SUNDAY",    dayWord: "sunday",    time: "8:40",  timeWord: "eight", wx: "☀ SUNNY",  wxWord: "sunny", bg: "home_day", sun: 0.6 });

  // ---------- 結尾（之後補畫面：11 個默劇小格飛入、倒數） ----------
  {
    const w0 = NOW; say("s12_week", w0 + 0.3, { top: 34, maxw: 1700 });
    const ACTS = ["english", "tv", "jogging", "music", "recorder", "games", "internet", "bike", "basketball", "camping", "baseball"];
    const dayOf = ["MON", "MON", "TUE", "TUE", "TUE", "WED", "THU", "SAT", "SAT", "SAT", "SUN"], wordOf = [0, 0, 1, 1, 1, 2, 3, 4, 4, 4, 5];
    ACTS.forEach(a => need(`thumb_${a}`, `renders/mime/${a}/f0036.jpg`));   // 重點 A 中間那格（動作最明顯）
    seg(D("s12_week") + 0.8, lt => {   // 一週回顧：11 個默劇小格照星期飛入 → WHAT A FREE WEEK!
      const tz = W("s12_week", 6) + 0.3, z = ease(clamp((lt - tz) / 1.4));
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
      bigText("WHAT A FREE WEEK!", 960, 540, 110, clamp((lt - tz - 0.4) / 0.3), "#ffb347");
    });
    ACTS.forEach((a, i) => sfx("sfx/pop.wav", w0 + 0.3 + W("s12_week", wordOf[i]), -14));
    const f0 = NOW; say("s12_end", f0 + 0.5, { x: 1180 }); const y0 = f0 + 0.5 + D("s12_end") + 0.4; say("s12_you", y0, { x: 1180 });
    seg(y0 - f0 + D("s12_you") + 6.0, lt => {
      camAt(lt, 0, 9, 1.0, 1.06);
      withCam(() => { cover("station_night", 0.5); rays(lt, 960, 420, 0.8); char("ken", 420, 840, 470, { sy: 1 + Math.sin(lt * 2) * 0.006 }); });
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
