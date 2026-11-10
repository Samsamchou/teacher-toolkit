// 二水小行星 Free Time 兩人一組線索挑戰（Pair Clue Challenge）— 外框與教師後台用的題目表。
// 情境：tools/2026 REA Games/3D planet/資料/freetime/ken-A-scenarios-draft-20261109.json（老師 11/09 核准，固定順序）。
// 每回合 11 題＝選擇 3＋拖放 3＋口說 5，題型隨機分配（外框排，存在 cleared 的 "types:"）。
const PHRASES = {
  jogging: "go jogging", music: "listen to music", baseball: "play baseball", basketball: "play basketball",
  bike: "ride a bike", english: "study English", internet: "surf the Internet", tv: "watch TV",
  camping: "go camping", games: "play online games", recorder: "play the recorder",
};
export const BANK = {
  mission: "ershui-3d-quest-freetime",
  unit: "二水小行星 Free Time 兩人一組",
  title: "Ershui Planet · Free Time Pair Challenge",
  kind: "planet",
  maxScore: 110,
  pointsPer: 10,
  passSpeak: 80,
  items: Array.from({ length: 11 }, (_, i) => ({ seq: i + 1, id: `q${String(i + 1).padStart(2, "0")}`, type: "freetime" })),
  // 固定順序；answer＝options 的索引；activity＝遊戲用的活動代號（q01 english … q11 baseball）
  scenarios: [
    {"id": "q01", "activity": "english", "context": "Today is Monday. School is over. Time to go home.", "question": "What do you do in your free time?", "options": ["I watch TV in my free time.", "I study English in my free time.", "I play online games in my free time."], "answer": 1},
    {"id": "q02", "activity": "tv", "context": "It's Monday evening. It's rainy outside.", "question": "What do you do in your free time?", "options": ["I watch TV in my free time.", "I ride a bike in my free time.", "I play basketball in my free time."], "answer": 0},
    {"id": "q03", "activity": "jogging", "context": "Today is Tuesday. It's a cool, sunny morning. Time to go to school.", "question": "What do you do in your free time?", "options": ["I ride a bike in my free time.", "I watch TV in my free time.", "I go jogging in my free time."], "answer": 2},
    {"id": "q04", "activity": "music", "context": "It's Tuesday afternoon. School is over. It's very hot.", "question": "What do you do in your free time?", "options": ["I listen to music in my free time.", "I study English in my free time.", "I play basketball in my free time."], "answer": 0},
    {"id": "q05", "activity": "recorder", "context": "It's Tuesday evening. Time to go home.", "question": "What do you do in your free time?", "options": ["I surf the Internet in my free time.", "I play the recorder in my free time.", "I play basketball in my free time."], "answer": 1},
    {"id": "q06", "activity": "games", "context": "It's Wednesday evening. It's cloudy and cold.", "question": "What do you do in your free time?", "options": ["I watch TV in my free time.", "I study English in my free time.", "I play online games in my free time."], "answer": 2},
    {"id": "q07", "activity": "internet", "context": "Today is Thursday. It's rainy after school.", "question": "What do you do in your free time?", "options": ["I surf the Internet in my free time.", "I play online games in my free time.", "I go camping in my free time."], "answer": 0},
    {"id": "q08", "activity": "bike", "context": "Today is Saturday. It's sunny and windy.", "question": "What do you do in your free time?", "options": ["I go jogging in my free time.", "I ride a bike in my free time.", "I play baseball in my free time."], "answer": 1},
    {"id": "q09", "activity": "basketball", "context": "It's Saturday afternoon. It's sunny.", "question": "What do you do in your free time?", "options": ["I play baseball in my free time.", "I go camping in my free time.", "I play basketball in my free time."], "answer": 2},
    {"id": "q10", "activity": "camping", "context": "It's Saturday evening. The sky is clear.", "question": "What do you do in your free time?", "options": ["I go camping in my free time.", "I play basketball in my free time.", "I watch TV in my free time."], "answer": 0},
    {"id": "q11", "activity": "baseball", "context": "Today is Sunday. It's a sunny morning.", "question": "What do you do in your free time?", "options": ["I play basketball in my free time.", "I play baseball in my free time.", "I go jogging in my free time."], "answer": 1},
  ],
  // 活動代號 → 片語；句子＝I <phrase> in my free time.
  activities: Object.fromEntries(Object.entries(PHRASES).map(([k, phrase]) => [k, { phrase, sentence: `I ${phrase} in my free time.` }])),
};
