"""Free Time 兩人一組外框的題目表 data.js：由遊戲的四份路線資料產生（兩邊一定一致）。

來源：godot-ershui-freetime/data/freetime_{ken_a,ken_b,shuiling,zunbo}.json
產出：tools/escape room HWG5-U01-U02/site/public/ershui-3d-quest-freetime/data.js
用法：python -I tools/make_freetime_frame_data.py
"""
import json, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "escape room HWG5-U01-U02", "site", "public", "ershui-3d-quest-freetime", "data.js"))
ROUTES = [("ken_a", "Ken A", "Ken"), ("ken_b", "Ken B", "Ken"), ("shuiling", "Shuiling 水鈴", "Shuiling"), ("zunbo", "Zun-Bo 圳寶", "Zun-Bo")]

routes = {}
for rid, label, name in ROUTES:
    D = json.load(open(os.path.join(HERE, "data", "freetime_%s.json" % rid), encoding="utf-8"))
    subj = D.get("subject", "I")
    poss = D.get("possessive", "my")
    ph = D.get("phrases3", D["phrases"])
    routes[rid] = {
        "id": rid, "label": label, "name": name, "subject": subj, "possessive": poss,
        "question": D.get("question", "What do you do in your free time?"),
        "pattern": "%s ______ in %s free time." % (subj, poss),
        "example": "%s %s in %s free time." % (subj, ph["tv"], poss),
        "scenarios": [{"id": it["id"], "activity": it["act"], "context": it["context"], "question": it["question"],
                       "options": it["options"], "answer": it["answer"]} for it in D["items"]],
        "activities": {k: {"phrase": v, "sentence": "%s %s in %s free time." % (subj, v, poss)} for k, v in ph.items()},
    }

js = """// 二水小行星 Free Time 兩人一組線索挑戰（Pair Clue Challenge）— 外框與教師後台用的題目表。
// ★ 這個檔是產生的，不要手改：python -I tools/make_freetime_frame_data.py
//   （來源：tools/2026 REA Games/3D planet/godot-ershui-freetime/data/freetime_<路線>.json）
// 四條路線：ken_a、ken_b（I / my）、shuiling（She / her）、zunbo（He / his）；每條 11 題固定順序。
// 這一輪玩哪條路線由遊戲在 report({type:"start", route}) 告訴外框，存在 cleared 的 "route:<id>"。
// 每回合 11 題＝選擇 3＋拖放 3＋口說 5，題型隨機分配（外框排，存在 cleared 的 "types:"）。
const ROUTES = %s;
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
""" % json.dumps(routes, ensure_ascii=False, indent=1)
open(OUT, "w", encoding="utf-8", newline="\n").write(js)
print("wrote", OUT, len(js))
