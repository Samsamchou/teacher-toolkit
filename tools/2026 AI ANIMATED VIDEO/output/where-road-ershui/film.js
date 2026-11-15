// 二水桌上小鎮問路動畫｜試片時間軸（開場＋第 1 題 train station / Red Road）。3D 底圖＝renders/3d/trial/f####.png（每 2 格一張，定格感）。
// 時間要和 src/town.py 的 T_FIG 15.6、T_MAP 20.3、T_ANS 26.9、T_FLY0 28.8、T_FLY1 30.8、T_END 37.5 一致。
(function () {
  const L = k => window.LINES[k], D = k => L(k).dur;
  const F = { segs: [], captions: [], hud: [], audio: [], need: {}, duck: [] }; let NOW = 0;
  const seg = (dur, draw, pre) => { const s = { t0: NOW, dur, draw, pre }; F.segs.push(s); NOW += dur; return s; };
  const say = (key, at, o = {}) => { F.captions.push(Object.assign({ key, t0: at }, o)); F.audio.push([`audio/${key.slice(0, 3)}/${key}.mp3`, at, 0]); };
  const sfx = (f, at, db = 0, len) => F.audio.push(len ? [f, at, db, len] : [f, at, db]);
  F.need.icon_station = "assets/icons/station_2.png"; F.need.train = "assets/jiji_train_cut.png";
  const T_END = 37.5, T_ANS = 26.9;
  say("s00_0", 0.6); say("s00_1", 4.88); say("s00_2", 11.0); say("s00_3", 15.8, { who: "Ken" });
  say("s01_ask", 20.6, { who: "Ken" }); say("s01_find", 22.6); say("s01_ans", T_ANS, { who: "Shuiling" });
  say("s01_thx", 31.0, { who: "Ken" }); say("s01_link", 33.0);
  sfx("sfx/whoosh.wav", 15.55, -10); sfx("sfx/whoosh.wav", 20.25, -10); sfx("sfx/pop.wav", 20.8, -6);
  [0, 1, 2].forEach(i => sfx("sfx/pop.wav", 23.6 + i, -10)); sfx("sfx/pop.wav", T_ANS + 0.1, -4); sfx("sfx/whoosh.wav", 28.8, -8);
  sfx("sfx/train_pass.mp3", 32.6, -10, 4.5);
  seg(T_END, (lt, t) => {
    cover("f3d", 0.5);
    // 問句：車站圖示從右上跳出（問號泡泡）
    if (t > 20.8 && t < 28.8) {
      const k = back(clamp((t - 20.8) / 0.4)), out = clamp((28.8 - t) / 0.3), im = img("icon_station");
      X.save(); X.globalAlpha = out; X.translate(1640, 250); X.scale(k, k);
      X.fillStyle = "#fff"; X.beginPath(); X.arc(0, 0, 135, 0, Math.PI * 2); X.fill(); X.lineWidth = 10; X.strokeStyle = "#ffb347"; X.stroke();
      if (im && im.width) { const s = 190 / Math.max(im.width, im.height); X.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); }
      X.restore(); bigText("?", 1760, 140, 110 * k, out, "#ffb347", 0.15);
    }
    // Find it! ＋ 倒數 3-2-1
    if (t > 22.6 && t < 26.7) {
      bigText("Find it!", 960, 140, 110, clamp((t - 22.6) / 0.3), "#fff", -0.04);
      if (t > 23.6) { const c = Math.max(1, 3 - Math.floor(t - 23.6)), p = (t - 23.6) % 1;
        X.save(); X.translate(960, 330); X.fillStyle = "rgba(255,179,71,0.25)"; X.beginPath(); X.arc(0, 0, 95, 0, Math.PI * 2); X.fill();
        X.strokeStyle = "#ffb347"; X.lineWidth = 11; X.beginPath(); X.arc(0, 0, 95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p)); X.stroke(); X.restore();
        bigText(String(c), 960, 330, 130, 1, "#fff"); }
    }
    // 揭曉：Red Road 大字
    if (t > T_ANS && t < 30.6) bigText("Red Road", 960, 160, 130, clamp((t - T_ANS) / 0.35) * clamp((30.6 - t) / 0.3), "#ff4d4d", -0.03);
    // 串場：小火車從左滑到右
    if (t > 32.6 && t < 37.2) { const im = img("train"); if (im && im.width) { const h = 210, w = im.width * h / im.height, k = (t - 32.6) / 4.6;
      X.drawImage(im, lerp(-w, 1960, k), 840 - h + Math.sin(t * 30) * 1.5, w, h); } }
  }, async lt => {
    const f = String(Math.min(898, Math.floor(lt * 24 / 2) * 2)).padStart(4, "0");
    if (IM.f3d && IM.f3d.f === f) return;
    delete IM.f3d; try { await load("f3d", `renders/3d/trial/f${f}.png`); IM.f3d.f = f; } catch (e) {}
  });
  F.dur = NOW;
  F.audio.push(["sfx/bgm.mp3", 0, -27, F.dur, "loop", F.duck]);
  window.FILM = F; window.SEG = { dur: F.dur, audio: F.audio };
  window.ready = Promise.all([document.fonts.load('700 40px "Comic Relief"'), ...Object.entries(F.need).map(([n, u]) => load(n, u))]);
})();
