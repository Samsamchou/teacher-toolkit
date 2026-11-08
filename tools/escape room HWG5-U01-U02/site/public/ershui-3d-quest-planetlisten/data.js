// 二水小行星 Listen and Guess（聽環境音猜地點）— 學號外框與教師後台用的題目表。
// 規格：tools/2026 REA Games/3D planet/rdq/RDQ-spec-ershui-planet-real-streets-listen-guess-20261108.md
// 8 個地點每次隨機排序（遊戲排），每題隨機出 choice／drag／speak 其中一種（外框排，存在作答紀錄裡）。
export const BANK = {
  mission: "ershui-3d-quest-planetlisten",
  unit: "二水小行星 Listen and Guess",
  title: "Ershui Planet · Listen and Guess",
  kind: "planet",
  maxScore: 80,
  pointsPer: 10,
  passSpeak: 80,
  items: Array.from({ length: 8 }, (_, i) => ({ seq: i + 1, id: `q0${i + 1}`, type: "listen" })),
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
  },
  // 拖放題的句型干擾字
  fillers: ["What", "is", "he", "she", "We're", "go", "at", "a"],
  modes: { listen: "Listen and Guess" },
  routes: ["8 places"],
};
