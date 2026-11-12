// 二水小行星 Listen and Guess（聽線索猜地點）— 學號外框與教師後台用的題目表。
// 規格：tools/2026 REA Games/3D planet/rdq/RDQ-spec-ershui-planet-real-streets-listen-guess-20261108.md
//      ＋ RDQ-spec-listen-guess-3clues-20261112.md（三種線索版：10 個地點、每回合 10 題、5 口說＋3 拖放＋2 選擇）
// 11 個地點（11/12 晚加虛構的二水鐵道博物館）：每回合遊戲用 seed 洗牌、取前 10 個；題型表、線索表由遊戲用 seed 排好，start 時交給外框存在 cleared（"types:"、"clues:"）。
export const BANK = {
  mission: "ershui-3d-quest-planetlisten",
  unit: "二水小行星 Listen and Guess",
  title: "Ershui Planet · Listen and Guess",
  kind: "planet",
  maxScore: 100,
  pointsPer: 10,
  passSpeak: 80,
  items: Array.from({ length: 10 }, (_, i) => ({ seq: i + 1, id: `q${String(i + 1).padStart(2, "0")}`, type: "listen" })),
  // 地點（和遊戲 data/listen.json 同一份）；the＝答句有沒有 the
  places: {
    post: { word: "post office", the: true, zh: "郵局" },
    supermarket: { word: "supermarket", the: true, zh: "超市" },
    school: { word: "school", the: false, zh: "學校" },
    library: { word: "library", the: true, zh: "圖書館" },
    hospital: { word: "hospital", the: true, zh: "診所" },
    park: { word: "park", the: true, zh: "公園" },
    restaurant: { word: "restaurant", the: true, zh: "餐廳" },
    tea: { word: "tea shop", the: true, zh: "飲料店" },
    station: { word: "train station", the: true, zh: "火車站" },
    bookstore: { word: "bookstore", the: true, zh: "書店" },
    // 2026-11-12 虛構地點（二水沒有）：二水鐵道博物館 Railway Museum（RDQ-spec-ershui-planet-railway-museum-20261112）
    museum: { word: "museum", the: true, zh: "博物館", fictional: true },
  },
  // 線索檔（放在遊戲檔外面，出題時才下載）：兩個圖示 clues/icons/<地點>_1.webp、_2.webp；默劇影片 clues/video/<地點>.mp4
  clueBase: "clues/",
  // 拖放題的句型干擾字
  fillers: ["What", "is", "he", "she", "We're", "go", "at", "a"],
  modes: { listen: "Listen and Guess" },
  routes: ["10 of 11 places"],
};
