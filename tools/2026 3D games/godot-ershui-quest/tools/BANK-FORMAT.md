# 3D 闖關任務：題庫格式與「新增任務」步驟

同一份遊戲（`site/public/quest3d/`）給所有 3D 任務共用。每個任務只是一個資料夾：

```
site/public/<任務代號>/
  index.html     任務頁（build_mission.py 第一次會自動產生）
  data.js        網頁外框與教師後台用的題目摘要（自動產生）
  cover.webp     首頁卡片封面（自己放）
  bank/          遊戲讀的題庫（自動產生）
    bank.json              題目、配題、任務資訊，"pak" 欄位寫 bank.pak 的檔名
    bank-<雜湊>.pak        所有素材合成一個檔：題目插圖、聽力插圖、Tick 語音、聽力音檔、中文字型子集
    fonts/NotoSansTC-OFL.txt
```

遊戲開場時從 `bankBase`（= 任務頁網址 + `bank/`）只下載兩個檔：bank.json 和 bank-<雜湊>.pak，顯示「Loading questions… %」；
失敗會自動重試 3 次。iPad 上一次抓 95 個小檔又慢又會漏，所以改成一個檔（2026-10-22）。
pak 檔名含內容雜湊，Firebase 設長期快取（`firebase.json` 的 `**/*.pak`）；題目一改檔名就變，不會讀到舊題。
pak 格式：`QB01` + 索引長度（4 位元組 little-endian）+ 索引 JSON `{"files":[{"path","offset","size"}]}` + 各檔內容。
**換題目不用重新匯出 Godot。** 只有改遊戲本身（地圖、怪物、特效、程式）才要重新匯出到 `quest3d/`。

## 新增一個任務（例：六年級）

1. 準備兩個檔案（格式見下方）：
   - `questions.json`：題目
   - `quiz_plan.json`：13 個地點各出哪些題目
2. 執行：
   ```
   python -I -X utf8 tools/build_mission.py --mission hwg6-r1-3d --unit "二水 3D 英語闖關 HWG6 R1" --title "Ershui 3D English Quest 6" --questions <questions.json> --plan <quiz_plan.json>
   ```
   程式會檢查每個地點都有題、每題只用一次、總數 ≤ 60，然後印出兩段要貼的文字。
3. 放一張 `cover.webp` 到任務資料夾。
4. 把印出的那一行貼進 `shared/missions.mjs`（教師後台才看得到成績）。
5. 把印出的卡片貼進首頁 `index.html` 的任務卡片區。
6. `npm test` → 部署預覽頻道 → 實機確認 → 正式站。

可加 `--site <資料夾>` 先輸出到別處試做，不動正式網站。

## questions.json

```json
{
  "weekStripOrder": ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  "weekStripLabels": {"Sun": "Sun.", "...": "..."},
  "items": [ 題目, 題目, ... ]
}
```

素材路徑可以寫 `res://assets/...`（遊戲專案內）或任何本機路徑；程式會複製進 `bank/`，PNG／JPG 會轉成最長邊 768 的 WebP。

### 共用欄位（每題都要）

| 欄位 | 說明 |
|---|---|
| `id` | 題號，例如 `Q01`、`L01`，整份唯一 |
| `seq` | 排序用數字 |
| `type` | `drag`（拖放填空）、`spell`（拼字）、`listen`（聽力選擇） |
| `hint1En` / `hint2En` | 第 1、2 次答錯的提示 |
| `correctEn` | 答對後顯示的句子 |
| `image` | 題目插圖（聽力題可省略） |
| `audio` | 拖放／拼字題：答對回饋語音；聽力題：題目音檔 |
| `lines` | 對話行 `[{ "speaker": "Tick", "text": "What {1} is it?" }]`，`{n}` 是第 n 個空格 |
| `weekStrip` | 星期條，`{ "highlight": "Tue", "zhLabel": "星期二" }` 或 `null` |
| `clock` | 時鐘指針，`{ "time": "9:50", "cx": 765, "cy": 344, "r": 204 }`（座標以 1536×1024 圖為準）或 `null` |
| `mirrorFrame` | 是否加鏡框，通常 `false` |

### drag（拖放）

```json
"blanks": [ { "id": 1, "answer": "time" }, { "id": 2, "answer": "9:50" } ],
"distractors": ["day", "9:15", "5:50"]
```

### spell（拼字）

```json
"spell": { "answer": "Tuesday", "distractorLetters": "hrn", "groups": [7], "caseSensitive": true }
```
`groups` 是每個字的字母數（兩個字的如 `"social studies"` 寫 `[6, 7]`）。

### listen（聽力選擇）

```json
"options": [ { "text": "fry" }, { "text": "flag", "image": "res://assets/listening/flag.png" }, { "text": "fly" } ],
"answer": 2,
"transcript": null
```
`answer` 是正確選項的索引（從 0 開始）。選項可以只有文字、只有圖片（`{ "image": "..." }`），或兩者都有。

## quiz_plan.json

13 個地點代號固定（遊戲的二水街道），每個地點至少一題；`park`、`lawn` 是 Boss 關：

```json
{ "locations": {
  "station": ["Q01","Q05","L01"], "inn": [...], "seven": [...], "school": [...],
  "teatop": [...], "market": [...], "post": [...], "bookstore": [...], "pxmart": [...],
  "library": [...], "farm": [...], "park": [...], "lawn": [...]
} }
```

## 計分與進度

- 總分 100：每題 100/N × 品質/4，品質 = max(1, 5 − 作答次數)。
- 跨裝置續玩與教師紀錄由網頁外框處理（Firestore `questProgress` / `questAttempts`），每個任務代號各自獨立；本機暫存鍵是 `quest3d:v1:<任務代號>:<學號>`（二水 HWG5 R1 沿用舊鍵 `ershui3d:v1:<學號>`）。

## 電腦上測試某份題庫

```
Godot_v4.7.2-stable_win64_console.exe --path . -- --test --bank=<site/public/任務/bank>
```

## 2026-11-01 新增題型（Wayground 綜合小考）

| type | 用途 | 欄位 |
|---|---|---|
| `choice` | 選擇題（聽力或閱讀；文字／圖片選項、O／X、題組） | `prompt` 說明、`stem` 題幹、`passage`＋`notes` 短文、`image` 圖、`audio` 題目音檔（有就有播放鍵）、`options`、`answer`（索引） |
| `order` | 重新排序（聽力排序、句子重組、字母排成單字） | `prompt`、`chunks`（顯示順序，已打亂）、`answer`（正確順序）、可選 `image`、`audio` |
| `label` | 標籤題（2×2 四格圖，算 1 題） | `prompt`、`image`、`labels: [{text, panel}]`（panel 1 左上、2 右上、3 左下、4 右下） |

- 拼字、拖放題加 `prompt` 時圖片放大；`audio`（Tick 回饋）可省略，省略就不用「聽 Tick 說」直接下一題。
- 有 `teacherText` 的題目，教師後台「需要重試的題目」顯示這段文字（data.js 的 `qText`）。
- 六套綜合小考由 `tools/build_wayground_sets.py` 從 English exam 專案的 `quiz_items.json`＋0.8 倍速音檔＋圖片轉檔（含 11/01 改成重新排序的 12 題），
  `tools/verify_wayground_sets.py` 逐題核對（題數、正解、音檔逐位元組、圖片、審閱稿文字），報告在 `data/wayground/驗證報告.md`。

## 四套輪替（年級入口）

- `shared/missions.mjs` 的 `QUEST_SETS.hwg5／hwg7`：每個年級 4 套（原任務＋3 套綜合小考），每套獨立任務代號（`ershui-3d-quest-hwg5u01` 等，不能再加連字號，Firestore 規則只接受一段代號）。
- 年級入口頁 `ershui-3d-quest/`、`ershui-3d-quest-hwg7/` 呼叫 `start(BANK, { sets })`；抽套規則在 `shared/quest-sets.mjs`（做到一半先接續 → 未完成隨機 → 全完成隨機重玩、避開剛玩完的）。
- 老師測試：網址加 `?set=N` 直接玩第 N 套；`?cloud=off` 不上傳。
- 教師後台「四套完成總覽」：每生一行，每套最高分／進行中。
- 測試：`--allq --bank=<bank>`（每題答錯一次再答對、每種題型截圖，看 `ALLQ DONE`）；`--pathcheck`（看 `PATH CHECK: 0 problems`）。
