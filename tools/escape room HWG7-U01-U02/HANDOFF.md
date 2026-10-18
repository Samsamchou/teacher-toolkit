# HWG7 U01+U02 情境任務｜交接

> 「Ken and the World Map Mix-Up」，用 `english-mission-quest-builder` skill 製作；範本是 `escape room HWG5-U01-U02`。
> 正式網址：https://hwg5-clock-tower.web.app/hwg7-u01-u02/（2026-10-18 教師授權後部署）

## 進度（2026-10-18）

| 步驟 | 狀態 |
|---|---|
| 1–2 解析題庫 | 完成：`content/bank.json`，拼字 11、拖放 17 |
| 3–5 故事、戰鬥、角色 | 教師定案：`DESIGN-v0.2-故事與題目配置.md`（另有 Google Doc） |
| 6 Codex 圖片 | 4 階段全部完成。Claude 驗收：第 2、3 階段全過；第 4 階段 GAME-11、GAME-13 的場地邊角裝飾稍微伸進中央留白區，只是背景、不影響碰撞，Claude 建議採用 |
| 7 旁白與題庫 | 教師定案：`content/build_content.py` → `question-bank.v0.1.json`、`STORY-題庫審閱-v0.1.md`（另有 Google Doc） |
| 8 語音 | 完成（教師授權）：見下節 |
| 9 網站 | 本機完成：`site/public/hwg7-u01-u02/`（在 HWG5 專案的共用 site 裡），建置 `node scripts/build-hwg7-u01-u02.mjs` |
| 10 Godot | 本機完成：`godot/world-map-battles/`，QA_BATTLES PASS，已匯出到 `site/public/hwg7-u01-u02/game/` |
| 11 教師後台 | 已接上：`missions.mjs` 加一行；`cloudRecord()` 的 Boss 改讀最後一場（B10）。正式站以 REST 實測上傳（見下） |
| 12 首頁卡片 | 已上線：首頁兩張卡片都可進入 |
| 13 部署 | 已部署（hosting only，Firestore 規則沒動） |

## 語音

- 旁白 `assets/audio/narration/SEG-01..06.mp3`：gpt-4o-mini-tts、marin、0.8 倍速。
  - whisper-1 逐字時間：6 段全部 matched＝字數、interpolated 0。
  - SEG-02 第一次少唸最後一句，已用 `--force --only SEG-02` 重做；舊檔保留為 `SEG-02.dropped-last-sentence.mp3`。
- Tick 答對語音 `assets/audio/feedback/Q01..Q28.mp3`：25 段通過字詞檢查。
  - Q20、Q22、Q23 標 FAIL，但只是轉文字拼法問題：「Buy Scooter」「BiMetro」「Way」（Wei），每個字母都有聽到。仍請教師試聽。

## 網站製作時要注意（和 HWG5 不同）

- 故事 6 段，結局是 `endingSegment: "SEG-06"`；HWG5 的 `rules.js buildSteps()` 寫死 `SEG-09`，要改成讀 `bank.endingSegment`。
- 沒有星期條、時鐘；`weekStrip` 全部是 null。
- 回聲地圖（#25、#26、#28）沿用 `mirrorFrame` 欄位，外框樣式改成地圖框。
- 戰鬥 10 場；獎勵名稱在 `BATTLES[].rewards`，Godot 效果對照見設計稿第 4 節。
- 拼字 `the USA` 是小寫（教師決定），`caseSensitive: true`。
- 7 枚徽章圖示 ICON-01..07 外框大小差 4–5 px，建置時統一縮放。

## 本機試玩（2026-10-18）

```
cd "G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site"
python -m http.server 4190 --bind 127.0.0.1 --directory public
```

- 打開 http://127.0.0.1:4190/hwg7-u01-u02/?emu=1
  - **本機測試一定要加 `?emu=1`**，否則作答紀錄會上傳到正式 Firestore。
  - 2026-10-18 測試時有一筆學號 99901 的紀錄上傳到正式站，已用 REST 刪除，讀回 404。

## 驗證紀錄

- `npm test`：27 項全過（HWG5 16 項＋HWG7 11 項）。
- Godot `tools/qa_battles.gd`：QA_BATTLES PASS。
  - 強配置：Boss 第一階段 46.7 秒破盾，第二階段 42.1 秒擊敗。
  - 弱配置：兩階段都差一點沒過。這和 HWG5 的平衡一致。
- 瀏覽器 1024×768 實走（以 DOM 檢查，不是截圖）：
  - 6 段故事都要聽完才解鎖 Next。
  - 拼字、拖放、答錯出現提示 1、Tick 語音聽完才解鎖 Next。
  - 10 場戰鬥的名稱和獎勵都正確。
  - 回聲框出現在 #25、#26、#28。
  - 重新整理後可以續玩。
  - 結果頁：大字學號、28/28、慶祝音效。
  - 沒有破圖，沒有水平溢出。
- **未驗證**：
  - 瀏覽器裡真正操作 Godot 戰鬥。引擎有載入並回報 ready，但瀏覽器窗格在背景，畫面不更新，所以沒辦法測移動；要請教師本機試玩。
  - 各畫面的垂直溢出，尤其是長整句卡（#27、#28）。
  - iPad 實機。

## Godot 改了什麼（相對 HWG5）

- `battles.gd`：
  - 10 場的名稱、提示和秒數。
  - `KIND` 表把每場對應到 HWG5 的機關種類。
  - 機關和道具圖格位。
  - `BOSS1 = 9`、`BOSS2 = 10`。
- `battle.gd`：
  - 道具名稱改成 HWG7 的名稱；網站直接傳 HWG7 名稱，不需要對照表。
  - 機關改讀 `kind`，Boss 改讀 `Battles.BOSS1/BOSS2`。
  - 新增 `draw_mechanisms()`，換上 HWG7 的機關圖：行李轉盤、錦鯉池、燈籠、灑水器、平交道柵欄、廢氣雲、雨水窪、行李箱。
- 通道是 `worldmap-battle-v1`。

## 部署紀錄（2026-10-18）

- 指令：`firebase deploy --only hosting:hwg5-clock-tower --project g6-english-online-learning --account u9431818@gmail.com`，只部署網站，Firestore 規則沒有動。
- 讀回：
  - 抽樣 20 個檔案和本機逐位元相同：首頁、missions.mjs、teacher.js、HWG7 程式與 data.js、game 的 index/js/pck/wasm、mp3、webp，以及 HWG5 的 app.js 和 data.js。
  - `engine.wasm` 是 `application/wasm`。
  - `/`、`/hwg5-u01-u02/`、`/hwg7-u01-u02/`、`/teacher/` 都是 200。
  - english-portal 首頁的 SHA-256 和部署前相同（623239ed…）。
- 教師後台上傳實測（REST）：
  - 用匿名學生帳號寫入一筆 hwg7-u01-u02 測試紀錄（學號 99902）：成功。
  - 學生裝置讀回：403，符合規則。
  - 管理者讀到 mission＝hwg7-u01-u02。
  - 之後已刪除測試文件和測試匿名帳號；查詢 99901、99902 都是 0 筆。
- 為什麼用 REST：Claude 的測試瀏覽器裡，這個網域的 `firebaseLocalStorageDb`（IndexedDB）卡住，連單純開啟都逾時，匿名登入因此卡住。這是測試瀏覽器的狀態問題，不是網站程式；同一套上傳程式在 HWG5 正式站已驗證過。
- **教師已確認（2026-10-18）**：
  - 用 iPad 在正式網址實際玩過一次。
  - 〔教師後台〕出現 HWG7 分頁和紀錄。
  - 教師回報時沒有提出問題；整體驗收以教師之後的回覆為準。
