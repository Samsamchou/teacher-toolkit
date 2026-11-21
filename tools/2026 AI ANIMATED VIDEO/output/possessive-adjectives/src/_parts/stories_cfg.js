  let PROPS3, PROPS6;
  // ---------- 第 2–6 段設定（座標＝1920×1080 畫面；背景 1536×1024 鋪滿，原圖 y×1.25−100） ----------
  [["entrance", "bg_entrance"], ["living", "bg_living"], ["sroom", "bg_shuiling_room"], ["classroom", "bg_classroom"], ["court", "bg_court"], ["gphouse", "bg_grandparents"],
   ["bottle", "prop_bottle_cut"], ["cap", "prop_cap_cut"], ["guitar", "prop_guitar_cut"], ["hat", "prop_hat_cut"], ["cat", "prop_cat_cut"], ["tv", "prop_tv_cut"],
   ["dog", "prop_dog_cut"], ["yeh", "ms_yeh_cut"]].forEach(([n, f]) => need(n, `assets/${f}.png`));
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
      { bg: "living", cam: [1.1, 120, 30], tags: [{ obj: "dad", label: "my", owners: ["ken"], ty: 520, ly: 230 }] },
      { cam: [1.15, 0, 40], subj: { word: "he", chars: ["dad"] }, fx: lt => notes(1150, 400, lt) },
      { cam: [1.05, -60, 30], tags: [{ obj: "guitar", label: "his", owners: ["dad"] }] },
      { cam: [1.08, -120, 50], tags: [{ obj: "hat", label: "his", owners: ["dad"], bend: 150, lx: 1450, ly: 170 }] },
      { clear: 1, cam: [1.15, -10, 40], subj: { word: "he", chars: ["dad"] }, tags: [{ top: 1, label: "his free time", tx: 1500, ty: 150 }],
        fx: (lt, gt, li, at) => { notes(1180, 480, lt); } },
    ],
    final: null,
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
    final: null,
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
      { cam: [1.08, -100, 30], tags: [{ obj: "yeh", label: "our", owners: ["ken", "shuiling"], ty: 560, ly: 300, lx: 1530 }] },
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
      { bg: "gphouse", cam: [1.05, 0, 30], subj: { word: "they", chars: ["grandpa", "grandma"] }, tags: [{ obj: "grandpa", label: "my", owners: ["ken"], ty: 560, ly: 330, bend: 200 }, { obj: "grandma", label: "my", owners: ["ken"], ty: 560, ly: 330 }] },
      { cam: [1.0, 0, -10], tags: [{ label: "their", owners: ["grandpa", "grandma"], tx: 960, ty: 420, lx: 960, ly: 250, size: 70 }] },
      { cam: [1.12, 0, 60], tags: [{ obj: "dog", label: "their", owners: ["grandpa", "grandma"] }] },
      { cam: [1.18, 0, 70], subj: { word: "they", chars: ["grandpa", "grandma"] }, fx: lt => { hearts(560, 560, 960, 780, lt); hearts(1330, 560, 960, 780, lt + 0.4); } },
      { clear: 1, cam: [1.05, -100, 30], subj: { word: "they", chars: ["grandpa", "grandma"] }, tags: [{ occ: 1, top: 1, label: "their free time", tx: 1500, ty: 150 }] },
    ],
    final: null,
    quiz: { bg: "gphouse", chars: [["grandpa", 220, 720], ["grandma", 470, 680]], speaker: "ken", obj: "dog", objH: 230, parts: ["This", "is", { blank: "their" }, "dog."], opts: ["our", "his", "their"], answer: "their", owners: [[230, 640], [480, 650]] },
  });
