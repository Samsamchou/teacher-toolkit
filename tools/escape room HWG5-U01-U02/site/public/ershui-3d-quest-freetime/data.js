// 二水小行星 Free Time 兩人一組線索挑戰（Pair Clue Challenge）— 外框與教師後台用的題目表。
// ★ 這個檔是產生的，不要手改：python -I tools/make_freetime_frame_data.py
//   （來源：tools/2026 REA Games/3D planet/godot-ershui-freetime/data/freetime_<路線>.json）
// 四條路線：ken_a、ken_b（I / my）、shuiling（She / her）、zunbo（He / his）；每條 11 題固定順序。
// 這一輪玩哪條路線由遊戲在 report({type:"start", route}) 告訴外框，存在 cleared 的 "route:<id>"。
// 每回合 11 題＝選擇 3＋拖放 3＋口說 5，題型隨機分配（外框排，存在 cleared 的 "types:"）。
const ROUTES = {
 "ken_a": {
  "id": "ken_a",
  "label": "Ken A",
  "name": "Ken",
  "subject": "I",
  "possessive": "my",
  "question": "What do you do in your free time?",
  "pattern": "I ______ in my free time.",
  "example": "I watch TV in my free time.",
  "scenarios": [
   {
    "id": "q01",
    "activity": "english",
    "context": "Today is Monday. School is over. It's rainy. Time to go home.",
    "question": "What do you do in your free time?",
    "options": [
     "I ride a bike in my free time.",
     "I study English in my free time.",
     "I play basketball in my free time."
    ],
    "answer": 1
   },
   {
    "id": "q02",
    "activity": "tv",
    "context": "It's Monday evening. It's rainy outside.",
    "question": "What do you do in your free time?",
    "options": [
     "I watch TV in my free time.",
     "I ride a bike in my free time.",
     "I play basketball in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q03",
    "activity": "jogging",
    "context": "Today is Tuesday. It's a cool, sunny morning. Time to go to school.",
    "question": "What do you do in your free time?",
    "options": [
     "I play online games in my free time.",
     "I watch TV in my free time.",
     "I go jogging in my free time."
    ],
    "answer": 2
   },
   {
    "id": "q04",
    "activity": "music",
    "context": "It's Tuesday afternoon. School is over. It's very hot.",
    "question": "What do you do in your free time?",
    "options": [
     "I listen to music in my free time.",
     "I go jogging in my free time.",
     "I play basketball in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q05",
    "activity": "recorder",
    "context": "It's Tuesday evening. Time to go home.",
    "question": "What do you do in your free time?",
    "options": [
     "I play baseball in my free time.",
     "I play basketball in my free time.",
     "I play the recorder in my free time."
    ],
    "answer": 2
   },
   {
    "id": "q06",
    "activity": "games",
    "context": "It's Wednesday evening. It's cloudy and cold.",
    "question": "What do you do in your free time?",
    "options": [
     "I play basketball in my free time.",
     "I play online games in my free time.",
     "I go camping in my free time."
    ],
    "answer": 1
   },
   {
    "id": "q07",
    "activity": "internet",
    "context": "Today is Thursday. It's rainy after school.",
    "question": "What do you do in your free time?",
    "options": [
     "I surf the Internet in my free time.",
     "I ride a bike in my free time.",
     "I go camping in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q08",
    "activity": "bike",
    "context": "Today is Saturday. It's sunny and windy.",
    "question": "What do you do in your free time?",
    "options": [
     "I watch TV in my free time.",
     "I ride a bike in my free time.",
     "I study English in my free time."
    ],
    "answer": 1
   },
   {
    "id": "q09",
    "activity": "basketball",
    "context": "It's Saturday afternoon. It's sunny.",
    "question": "What do you do in your free time?",
    "options": [
     "I surf the Internet in my free time.",
     "I play the recorder in my free time.",
     "I play basketball in my free time."
    ],
    "answer": 2
   },
   {
    "id": "q10",
    "activity": "camping",
    "context": "It's Saturday evening. The sky is clear.",
    "question": "What do you do in your free time?",
    "options": [
     "I go camping in my free time.",
     "I play basketball in my free time.",
     "I play baseball in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q11",
    "activity": "baseball",
    "context": "Today is Sunday. It's a sunny morning.",
    "question": "What do you do in your free time?",
    "options": [
     "I play online games in my free time.",
     "I play baseball in my free time.",
     "I listen to music in my free time."
    ],
    "answer": 1
   }
  ],
  "activities": {
   "jogging": {
    "phrase": "go jogging",
    "sentence": "I go jogging in my free time."
   },
   "music": {
    "phrase": "listen to music",
    "sentence": "I listen to music in my free time."
   },
   "baseball": {
    "phrase": "play baseball",
    "sentence": "I play baseball in my free time."
   },
   "basketball": {
    "phrase": "play basketball",
    "sentence": "I play basketball in my free time."
   },
   "bike": {
    "phrase": "ride a bike",
    "sentence": "I ride a bike in my free time."
   },
   "english": {
    "phrase": "study English",
    "sentence": "I study English in my free time."
   },
   "internet": {
    "phrase": "surf the Internet",
    "sentence": "I surf the Internet in my free time."
   },
   "tv": {
    "phrase": "watch TV",
    "sentence": "I watch TV in my free time."
   },
   "camping": {
    "phrase": "go camping",
    "sentence": "I go camping in my free time."
   },
   "games": {
    "phrase": "play online games",
    "sentence": "I play online games in my free time."
   },
   "recorder": {
    "phrase": "play the recorder",
    "sentence": "I play the recorder in my free time."
   }
  }
 },
 "ken_b": {
  "id": "ken_b",
  "label": "Ken B",
  "name": "Ken",
  "subject": "I",
  "possessive": "my",
  "question": "What do you do in your free time?",
  "pattern": "I ______ in my free time.",
  "example": "I watch TV in my free time.",
  "scenarios": [
   {
    "id": "q01",
    "activity": "recorder",
    "context": "Today is Monday. It's rainy after school.",
    "question": "What do you do in your free time?",
    "options": [
     "I ride a bike in my free time.",
     "I play basketball in my free time.",
     "I play the recorder in my free time."
    ],
    "answer": 2
   },
   {
    "id": "q02",
    "activity": "internet",
    "context": "It's Monday evening. It's cold and windy.",
    "question": "What do you do in your free time?",
    "options": [
     "I surf the Internet in my free time.",
     "I play baseball in my free time.",
     "I go camping in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q03",
    "activity": "bike",
    "context": "Today is Tuesday. It's sunny and windy. Time to go to school.",
    "question": "What do you do in your free time?",
    "options": [
     "I watch TV in my free time.",
     "I ride a bike in my free time.",
     "I play online games in my free time."
    ],
    "answer": 1
   },
   {
    "id": "q04",
    "activity": "basketball",
    "context": "It's Tuesday afternoon. School is over. It's sunny.",
    "question": "What do you do in your free time?",
    "options": [
     "I play basketball in my free time.",
     "I go camping in my free time.",
     "I surf the Internet in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q05",
    "activity": "tv",
    "context": "It's Wednesday evening. It's rainy outside.",
    "question": "What do you do in your free time?",
    "options": [
     "I go jogging in my free time.",
     "I play baseball in my free time.",
     "I watch TV in my free time."
    ],
    "answer": 2
   },
   {
    "id": "q06",
    "activity": "english",
    "context": "Today is Thursday. School is over. It's cold and rainy.",
    "question": "What do you do in your free time?",
    "options": [
     "I go camping in my free time.",
     "I study English in my free time.",
     "I go jogging in my free time."
    ],
    "answer": 1
   },
   {
    "id": "q07",
    "activity": "camping",
    "context": "It's Friday evening. It's cool. The sky is clear.",
    "question": "What do you do in your free time?",
    "options": [
     "I play baseball in my free time.",
     "I go camping in my free time.",
     "I play basketball in my free time."
    ],
    "answer": 1
   },
   {
    "id": "q08",
    "activity": "baseball",
    "context": "Today is Saturday. It's a warm, sunny morning.",
    "question": "What do you do in your free time?",
    "options": [
     "I play baseball in my free time.",
     "I surf the Internet in my free time.",
     "I play the recorder in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q09",
    "activity": "music",
    "context": "It's Saturday afternoon. It's very hot.",
    "question": "What do you do in your free time?",
    "options": [
     "I go jogging in my free time.",
     "I play basketball in my free time.",
     "I listen to music in my free time."
    ],
    "answer": 2
   },
   {
    "id": "q10",
    "activity": "jogging",
    "context": "Today is Sunday. It's a cool, sunny morning.",
    "question": "What do you do in your free time?",
    "options": [
     "I go jogging in my free time.",
     "I study English in my free time.",
     "I play online games in my free time."
    ],
    "answer": 0
   },
   {
    "id": "q11",
    "activity": "games",
    "context": "It's Sunday evening. It's dark and cold.",
    "question": "What do you do in your free time?",
    "options": [
     "I ride a bike in my free time.",
     "I play online games in my free time.",
     "I play basketball in my free time."
    ],
    "answer": 1
   }
  ],
  "activities": {
   "jogging": {
    "phrase": "go jogging",
    "sentence": "I go jogging in my free time."
   },
   "music": {
    "phrase": "listen to music",
    "sentence": "I listen to music in my free time."
   },
   "baseball": {
    "phrase": "play baseball",
    "sentence": "I play baseball in my free time."
   },
   "basketball": {
    "phrase": "play basketball",
    "sentence": "I play basketball in my free time."
   },
   "bike": {
    "phrase": "ride a bike",
    "sentence": "I ride a bike in my free time."
   },
   "english": {
    "phrase": "study English",
    "sentence": "I study English in my free time."
   },
   "internet": {
    "phrase": "surf the Internet",
    "sentence": "I surf the Internet in my free time."
   },
   "tv": {
    "phrase": "watch TV",
    "sentence": "I watch TV in my free time."
   },
   "camping": {
    "phrase": "go camping",
    "sentence": "I go camping in my free time."
   },
   "games": {
    "phrase": "play online games",
    "sentence": "I play online games in my free time."
   },
   "recorder": {
    "phrase": "play the recorder",
    "sentence": "I play the recorder in my free time."
   }
  }
 },
 "shuiling": {
  "id": "shuiling",
  "label": "Shuiling 水鈴",
  "name": "Shuiling",
  "subject": "She",
  "possessive": "her",
  "question": "What does she do in her free time?",
  "pattern": "She ______ in her free time.",
  "example": "She watches TV in her free time.",
  "scenarios": [
   {
    "id": "q01",
    "activity": "jogging",
    "context": "Today is Monday. School is over. It's cool and sunny.",
    "question": "What does she do in her free time?",
    "options": [
     "She watches TV in her free time.",
     "She goes jogging in her free time.",
     "She surfs the Internet in her free time."
    ],
    "answer": 1
   },
   {
    "id": "q02",
    "activity": "recorder",
    "context": "It's Monday evening. It's cold and windy.",
    "question": "What does she do in her free time?",
    "options": [
     "She plays baseball in her free time.",
     "She goes camping in her free time.",
     "She plays the recorder in her free time."
    ],
    "answer": 2
   },
   {
    "id": "q03",
    "activity": "english",
    "context": "Today is Tuesday. It's rainy after school.",
    "question": "What does she do in her free time?",
    "options": [
     "She studies English in her free time.",
     "She rides a bike in her free time.",
     "She plays basketball in her free time."
    ],
    "answer": 0
   },
   {
    "id": "q04",
    "activity": "tv",
    "context": "It's Tuesday evening. It's still rainy outside.",
    "question": "What does she do in her free time?",
    "options": [
     "She goes jogging in her free time.",
     "She plays baseball in her free time.",
     "She watches TV in her free time."
    ],
    "answer": 2
   },
   {
    "id": "q05",
    "activity": "music",
    "context": "It's Wednesday afternoon. School is over. It's very hot.",
    "question": "What does she do in her free time?",
    "options": [
     "She listens to music in her free time.",
     "She plays basketball in her free time.",
     "She goes jogging in her free time."
    ],
    "answer": 0
   },
   {
    "id": "q06",
    "activity": "internet",
    "context": "It's Wednesday evening. It's cloudy and cold.",
    "question": "What does she do in her free time?",
    "options": [
     "She goes camping in her free time.",
     "She surfs the Internet in her free time.",
     "She plays basketball in her free time."
    ],
    "answer": 1
   },
   {
    "id": "q07",
    "activity": "games",
    "context": "It's Thursday evening. It's rainy and windy.",
    "question": "What does she do in her free time?",
    "options": [
     "She plays online games in her free time.",
     "She rides a bike in her free time.",
     "She goes jogging in her free time."
    ],
    "answer": 0
   },
   {
    "id": "q08",
    "activity": "basketball",
    "context": "Today is Friday. School is over. It's sunny.",
    "question": "What does she do in her free time?",
    "options": [
     "She plays the recorder in her free time.",
     "She plays online games in her free time.",
     "She plays basketball in her free time."
    ],
    "answer": 2
   },
   {
    "id": "q09",
    "activity": "bike",
    "context": "Today is Saturday. It's a sunny, windy morning.",
    "question": "What does she do in her free time?",
    "options": [
     "She listens to music in her free time.",
     "She rides a bike in her free time.",
     "She studies English in her free time."
    ],
    "answer": 1
   },
   {
    "id": "q10",
    "activity": "baseball",
    "context": "It's Saturday afternoon. It's warm and sunny.",
    "question": "What does she do in her free time?",
    "options": [
     "She plays baseball in her free time.",
     "She watches TV in her free time.",
     "She surfs the Internet in her free time."
    ],
    "answer": 0
   },
   {
    "id": "q11",
    "activity": "camping",
    "context": "It's Sunday evening. It's cool. The sky is clear.",
    "question": "What does she do in her free time?",
    "options": [
     "She plays basketball in her free time.",
     "She plays baseball in her free time.",
     "She goes camping in her free time."
    ],
    "answer": 2
   }
  ],
  "activities": {
   "jogging": {
    "phrase": "goes jogging",
    "sentence": "She goes jogging in her free time."
   },
   "music": {
    "phrase": "listens to music",
    "sentence": "She listens to music in her free time."
   },
   "baseball": {
    "phrase": "plays baseball",
    "sentence": "She plays baseball in her free time."
   },
   "basketball": {
    "phrase": "plays basketball",
    "sentence": "She plays basketball in her free time."
   },
   "bike": {
    "phrase": "rides a bike",
    "sentence": "She rides a bike in her free time."
   },
   "english": {
    "phrase": "studies English",
    "sentence": "She studies English in her free time."
   },
   "internet": {
    "phrase": "surfs the Internet",
    "sentence": "She surfs the Internet in her free time."
   },
   "tv": {
    "phrase": "watches TV",
    "sentence": "She watches TV in her free time."
   },
   "camping": {
    "phrase": "goes camping",
    "sentence": "She goes camping in her free time."
   },
   "games": {
    "phrase": "plays online games",
    "sentence": "She plays online games in her free time."
   },
   "recorder": {
    "phrase": "plays the recorder",
    "sentence": "She plays the recorder in her free time."
   }
  }
 },
 "zunbo": {
  "id": "zunbo",
  "label": "Zun-Bo 圳寶",
  "name": "Zun-Bo",
  "subject": "He",
  "possessive": "his",
  "question": "What does he do in his free time?",
  "pattern": "He ______ in his free time.",
  "example": "He watches TV in his free time.",
  "scenarios": [
   {
    "id": "q01",
    "activity": "jogging",
    "context": "Today is Monday. It's an early, sunny morning.",
    "question": "What does he do in his free time?",
    "options": [
     "He goes jogging in his free time.",
     "He watches TV in his free time.",
     "He plays online games in his free time."
    ],
    "answer": 0
   },
   {
    "id": "q02",
    "activity": "internet",
    "context": "It's Monday afternoon. It's rainy after school.",
    "question": "What does he do in his free time?",
    "options": [
     "He rides a bike in his free time.",
     "He goes jogging in his free time.",
     "He surfs the Internet in his free time."
    ],
    "answer": 2
   },
   {
    "id": "q03",
    "activity": "recorder",
    "context": "It's Monday evening. It's dark and cold.",
    "question": "What does he do in his free time?",
    "options": [
     "He plays baseball in his free time.",
     "He plays the recorder in his free time.",
     "He plays basketball in his free time."
    ],
    "answer": 1
   },
   {
    "id": "q04",
    "activity": "music",
    "context": "It's Tuesday afternoon. School is over. It's very hot.",
    "question": "What does he do in his free time?",
    "options": [
     "He goes jogging in his free time.",
     "He listens to music in his free time.",
     "He plays basketball in his free time."
    ],
    "answer": 1
   },
   {
    "id": "q05",
    "activity": "tv",
    "context": "It's Tuesday evening. It's rainy outside.",
    "question": "What does he do in his free time?",
    "options": [
     "He watches TV in his free time.",
     "He goes camping in his free time.",
     "He rides a bike in his free time."
    ],
    "answer": 0
   },
   {
    "id": "q06",
    "activity": "bike",
    "context": "It's Wednesday afternoon. It's sunny and windy.",
    "question": "What does he do in his free time?",
    "options": [
     "He studies English in his free time.",
     "He plays online games in his free time.",
     "He rides a bike in his free time."
    ],
    "answer": 2
   },
   {
    "id": "q07",
    "activity": "english",
    "context": "It's Wednesday evening. It's cloudy and cold.",
    "question": "What does he do in his free time?",
    "options": [
     "He studies English in his free time.",
     "He goes camping in his free time.",
     "He plays baseball in his free time."
    ],
    "answer": 0
   },
   {
    "id": "q08",
    "activity": "games",
    "context": "It's Thursday evening. It's cold and rainy.",
    "question": "What does he do in his free time?",
    "options": [
     "He goes jogging in his free time.",
     "He plays online games in his free time.",
     "He plays basketball in his free time."
    ],
    "answer": 1
   },
   {
    "id": "q09",
    "activity": "basketball",
    "context": "Today is Saturday. It's a sunny morning.",
    "question": "What does he do in his free time?",
    "options": [
     "He watches TV in his free time.",
     "He plays the recorder in his free time.",
     "He plays basketball in his free time."
    ],
    "answer": 2
   },
   {
    "id": "q10",
    "activity": "baseball",
    "context": "It's Saturday afternoon. It's cool and sunny.",
    "question": "What does he do in his free time?",
    "options": [
     "He surfs the Internet in his free time.",
     "He listens to music in his free time.",
     "He plays baseball in his free time."
    ],
    "answer": 2
   },
   {
    "id": "q11",
    "activity": "camping",
    "context": "It's Saturday evening. It's cool. The sky is clear.",
    "question": "What does he do in his free time?",
    "options": [
     "He goes camping in his free time.",
     "He plays basketball in his free time.",
     "He plays baseball in his free time."
    ],
    "answer": 0
   }
  ],
  "activities": {
   "jogging": {
    "phrase": "goes jogging",
    "sentence": "He goes jogging in his free time."
   },
   "music": {
    "phrase": "listens to music",
    "sentence": "He listens to music in his free time."
   },
   "baseball": {
    "phrase": "plays baseball",
    "sentence": "He plays baseball in his free time."
   },
   "basketball": {
    "phrase": "plays basketball",
    "sentence": "He plays basketball in his free time."
   },
   "bike": {
    "phrase": "rides a bike",
    "sentence": "He rides a bike in his free time."
   },
   "english": {
    "phrase": "studies English",
    "sentence": "He studies English in his free time."
   },
   "internet": {
    "phrase": "surfs the Internet",
    "sentence": "He surfs the Internet in his free time."
   },
   "tv": {
    "phrase": "watches TV",
    "sentence": "He watches TV in his free time."
   },
   "camping": {
    "phrase": "goes camping",
    "sentence": "He goes camping in his free time."
   },
   "games": {
    "phrase": "plays online games",
    "sentence": "He plays online games in his free time."
   },
   "recorder": {
    "phrase": "plays the recorder",
    "sentence": "He plays the recorder in his free time."
   }
  }
 }
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
  defaultRoute: "ken_a",
  routes: ROUTES,
  // 舊欄位（教師後台讀）：Ken A 的題目與句子
  scenarios: ROUTES.ken_a.scenarios,
  activities: ROUTES.ken_a.activities,
};
