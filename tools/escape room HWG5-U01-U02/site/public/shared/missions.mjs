// Mission registry used by the teacher dashboard (portal cards are in index.html).
// Add a line when a new mission folder goes live.
export const MISSIONS = [
  { slug: "hwg5-u01-u02", unit: "HWG5 U01+U02", title: "Ken and the Frozen Clock Tower" },
  { slug: "hwg7-u01-u02", unit: "HWG7 U01+U02", title: "Ken and the World Map Mix-Up" },
  { slug: "ershui-3d-quest", unit: "二水 3D 英語闖關 HWG5 R1", title: "Ershui 3D English Quest" },
  { slug: "ershui-3d-quest-hwg7", unit: "二水 3D 英語闖關 HWG7 U01-U02", title: "Ershui 3D English Quest 6" },
  { slug: "ershui-3d-quest-jump", unit: "Ken's Jump Island SF3 R1", title: "Ken's Jump Island · SF3 R1" },
  { slug: "ershui-3d-quest-planet", unit: "二水小行星逛街版", title: "Ershui Planet Street Walk" },
  { slug: "ershui-3d-quest-planetlisten", unit: "二水小行星 Listen and Guess", title: "Ershui Planet · Listen and Guess" },
  { slug: "ershui-3d-quest-freetime", unit: "二水小行星 Free Time 兩人一組", title: "Ershui Planet · Free Time Pair Challenge" },
  { slug: "ershui-3d-quest-hwg5u01", unit: "二水 3D 英語闖關 HWG5-U01 綜合小考", title: "Ershui 3D Quest · HWG5 U01" },
  { slug: "ershui-3d-quest-hwg5u02", unit: "二水 3D 英語闖關 HWG5-U02 綜合小考", title: "Ershui 3D Quest · HWG5 U02" },
  { slug: "ershui-3d-quest-hwg5r1", unit: "二水 3D 英語闖關 HWG5-review1 綜合小考", title: "Ershui 3D Quest · HWG5 Review 1" },
  { slug: "ershui-3d-quest-hwg7u01", unit: "二水 3D 英語闖關 HWG7-U01 綜合小考", title: "Ershui 3D Quest · HWG7 U01" },
  { slug: "ershui-3d-quest-hwg7u02", unit: "二水 3D 英語闖關 HWG7-U02 綜合小考", title: "Ershui 3D Quest · HWG7 U02" },
  { slug: "ershui-3d-quest-hwg7r1", unit: "二水 3D 英語闖關 HWG7-review1 綜合小考", title: "Ershui 3D Quest · HWG7 Review 1" },
];

// 二水 3D 英語闖關：每個年級四套題目輪流出（2026-11-01）。學生從年級入口頁進入，
// 外框（quest3d-app.mjs）抽一套；每套是獨立任務代號，教師後台「四套完成總覽」照這裡的順序列出。
export const QUEST_SETS = {
  hwg5: {
    unit: "二水 3D 英語闖關 HWG5", title: "Ershui 3D English Quest · 4 sets",
    sets: [
      { slug: "ershui-3d-quest", short: "HWG5 R1 闖關題" },
      { slug: "ershui-3d-quest-hwg5u01", short: "HWG5-U01 綜合小考" },
      { slug: "ershui-3d-quest-hwg5u02", short: "HWG5-U02 綜合小考" },
      { slug: "ershui-3d-quest-hwg5r1", short: "HWG5-review1 綜合小考" },
    ],
  },
  hwg7: {
    unit: "二水 3D 英語闖關 HWG7", title: "Ershui 3D English Quest 6 · 4 sets",
    sets: [
      { slug: "ershui-3d-quest-hwg7", short: "HWG7 U01-U02 闖關題" },
      { slug: "ershui-3d-quest-hwg7u01", short: "HWG7-U01 綜合小考" },
      { slug: "ershui-3d-quest-hwg7u02", short: "HWG7-U02 綜合小考" },
      { slug: "ershui-3d-quest-hwg7r1", short: "HWG7-review1 綜合小考" },
    ],
  },
};
