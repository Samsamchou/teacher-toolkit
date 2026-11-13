// 第 1 段（Monday 火車站）時間軸。秒數以本段開頭為 0。配音時間由 render.py 注入 window.LINES。
(function () {
  window.ARR3D = f => `renders/3d/s01/f${String(Math.max(0, Math.min(139, f))).padStart(4, '0')}.png`;   // 3D 抵達鏡頭（Colab Blender）
  const L = () => window.LINES;
  const at = (key, i) => SEGT[key] + L()[key].words[i].t0;   // 某句第 i 個字開始的時間
  const SEGT = { s01_grandma: 0.6, s01_ken: 10.6, s01_link: 16.2 };
  const T = { clue0: 7.6, clue1: 10.1, arr0: 10.2, train0: 16.0, win0: 19.0, end: 24.6 };

  window.SEG = {
    dur: T.end,
    audio: [   // render.py 用來混音：[檔案, 開始秒, 音量 dB]
      ["audio/s01/s01_grandma.mp3", SEGT.s01_grandma, 0],
      ["audio/s01/s01_ken.mp3", SEGT.s01_ken, 0],
      ["audio/s01/s01_link.mp3", SEGT.s01_link, 0],
      ["sfx/station_clue.mp3", T.clue0 - 0.1, -3],
      ["sfx/rain_loop.wav", 0, -20, 19.5],
      ["sfx/train_pass.mp3", T.train0 - 0.2, -8],
    ],
    captions: [
      { key: "s01_grandma", t0: SEGT.s01_grandma, who: "Grandma", zh: "今天星期一，下雨天。現在七點半。你要去哪裡？" },
      { key: "s01_ken", t0: SEGT.s01_ken, who: "Ken", zh: "我要去火車站。我想搭火車。", x: 1160 },
      { key: "s01_link", t0: SEGT.s01_link, who: "", zh: "嘟嘟！你搭集集線火車，在火車上寫了一封信。", hold: 1.0, x: 1300, top: 50 },
    ],
    get hud() {
      return [
        { lab: "DAY", val: "MONDAY", x: 90, y: 70, align: "left", t0: at("s01_grandma", 1), t1: T.clue1 },
        { lab: "WEATHER", val: "☂ RAINY", x: 1410, y: 230, w: 420, align: "right", size: 64, t0: at("s01_grandma", 3), t1: T.clue1 },
        { lab: "TIME", val: "7:30", x: 1410, y: 70, w: 420, align: "right", t0: at("s01_grandma", 6), t1: T.clue1 },
      ];
    },
    draw(t) {
      if (t < T.arr0) {                               // 鏡頭 1＋2：家門口、奶奶問 → 線索
        $("sh_home").style.display = "block";
        cam("sh_home", t, 0, T.clue0, 1.0, 1.07, 0, -30, 0, 0);
        const talk = t > SEGT.s01_grandma && t < SEGT.s01_grandma + L().s01_grandma.dur;
        placeChar("gm", 300, 830, 470, { bob: talk ? Math.abs(Math.sin(t * 9)) * 6 : 0, sy: 1 + Math.sin(t * 2.2) * 0.006 });
        placeChar("kh", 1620, 830, 450, { sy: 1 + Math.sin(t * 2.0 + 1) * 0.006 });
        const dim = clamp((t - T.clue0 + 0.2) / 0.3);
        $("sh_home").style.filter = `brightness(${1 - 0.45 * dim}) blur(${dim * 4}px)`;
        rain(t, 1.0); bokeh(t, 10, 7, 0.6);
        listenIcon(t, T.clue0, T.clue1);
      } else if (t < T.train0) {                      // 鏡頭 3：抵達火車站（3D；未渲染時 2D 代替）
        listenIcon(t, 0, -1);
        $("sh_arrive").style.display = "block";
        const f = Math.round((t - T.arr0) * 24);
        const img3d = $("arr3d");
        if (window.ARR3D) { img3d.style.display = "block"; $("arr2d").style.display = "none"; const u = window.ARR3D(f); if (!img3d.src.endsWith(u)) { img3d.src = u; window._pending = img3d.decode(); } }
        else {
          cam("arr2d", t, T.arr0, T.train0, 1.04, 1.1, 0, 0, 0, 0);
          $("st_bg").style.filter = "saturate(0.7) brightness(0.85) hue-rotate(-15deg)";
          const k = ease((t - T.arr0) / 4.2);
          placeChar("ka", lerp(1860, 1560, k), 830, 420, { bob: k < 1 ? Math.abs(Math.sin(t * 8)) * 10 : 0 });
        }
        rain(t, 0.8);
      } else if (t < T.win0) {                        // 鏡頭 4：集集線火車經過，雨慢慢停
        $("sh_train").style.display = "block";
        cam("sh_train", t, T.train0, T.win0, 1.05, 1.08, 20, -40, 0, 0);
        const tr = $("train"), h = 300, w = tr.naturalWidth * h / tr.naturalHeight;
        const k = (t - T.train0) / (T.win0 - T.train0);
        tr.style.height = h + "px"; tr.style.left = lerp(-w * 0.75, 1960, k) + "px";
        tr.style.top = (642 - h + Math.sin(t * 30) * 1.5) + "px";
        rain(t, 0.6 * (1 - k));
      } else {                                        // 鏡頭 5：車窗內 Ken 寫信
        $("sh_window").style.display = "block";
        cam("sh_window", t, T.win0, T.end, 1.0, 1.1, 0, 20, 0, -10);
        drops(t, 1 - 0.7 * clamp((t - T.win0) / 4));
      }
    },
  };
})();
