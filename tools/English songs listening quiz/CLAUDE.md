# English songs listening quiz — Claude 交接與專案規則

> 取代 `agent.md`（Codex 基線）在 Claude 環境的角色；`agent.md` 保留不動。
> 上層規則見 `../../CLAUDE.md`（teacher-toolkit）。本專案沿用父層 Git，不建立巢狀 Git。

## 這是什麼

國小 5–6 年級英語歌曲「原句挖空」聽力練習網站。老師是使用者；學生用學號進入，聽歌到目標句結束後暫停，三選一填空。

- 正式站：https://yestredayoncemore.web.app（Firebase 專案 `yestredayoncemore`，帳號 u9431818@gmail.com）
- 五年級：Yesterday Once More（YouTube，15 題，每題 6.67 分）
- 六年級：San Francisco（本機 MP4，16 題，每題 6.25 分，直達 `#song/san-francisco`）
- 前端是單一檔案 `public/index.html`（約 128 KB）；沒有建置步驟。

## 開工前先讀

1. `PROJECT_HANDOFF.md`（逐日決策與發布紀錄，最完整）
2. `README.md`（流程、教師後台、部署指令）
3. `TEST-REPORT.md`（最新測試與正式站讀回）
4. `rdq/`、根目錄 `RDQ-spec-*.md`（已確認需求，**不要重問**）
5. Obsidian 工作筆記：`G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md`

## 已確認的產品規則（改動前必須尊重）

- 整首從頭播；完整目標句播完**自動暫停**才出題（不可用等候時間代替）。
- 每題最多 2 次：第一次錯顯示 Try again；任一次答對得滿分；第二次錯 0 分。
- 重播不限次數、不消耗作答次數；重播時隱藏題目與選項並禁止選答。
- 選錯紅色✗、選對綠色✓，停留 0.9 秒後接續播放；提前結束會取消延遲。
- 答完從句尾接續；最後一題後播到片尾才顯示總成績。
- 總分 = 答對題數 ÷ 全題庫題數 × 100，最後才四捨五入到 2 位。
- 每次選答即保存進度（不可變文件，後台以 ownerUid+sessionId 取最高 revision）。
- 教師後台 9 欄順序固定：學號、本次總分、歌曲、練習狀態、答對、答錯、未作答、答錯的句子、答錯一次到再次答對的句子與錯誤選項（第九欄完整標題見 README）。
- 日期依臺灣時間的「練習開始日」歸屬，離線補送不改日期。
- 資料保存 14 個曆月（成績與播放診斷皆是）；每日 04:00 Asia/Taipei 由 `purgeExpiredQuizResults` 清除。
- 學生資料只用學號；診斷資料不存 IP、Cookie、完整 User-Agent。

## 專案結構

| 路徑 | 內容 |
|---|---|
| `public/index.html` | 整個學生＋教師前端（唯一會被 Hosting 發布的程式；`public/media/` 為影片） |
| `public/media/` | San Francisco 原始 48 MB、iPad 一般版 23 MB、輕量版 15 MB |
| `review/` | 教師審閱稿、題庫 JSON、對齊證據、字表證據（**不在** Hosting public，不會公開） |
| `functions-retention/` | 14 個月清除排程（Node 22，asia-east1，codebase `song-quiz-retention`） |
| `firestore.rules` | 匿名只能新增、指定教師可讀、禁止更新／刪除 |
| `server.mjs` | 本機伺服器，支援 Range 206/416，`/review` 預覽 |
| `tests/` | 核心、日期、規則、影片、iPad 復原、Range、保存期限測試 |
| `docs/` | 搬移雜湊、發布讀回、`SKILL_WORKFLOW_NOTES.md`（技能素材，非正式 Skill） |

## 常用指令（PowerShell，於本資料夾）

```powershell
node server.mjs                       # 本機 http://localhost:8000 ；/review 為審閱頁；改埠: $env:PORT=8013
npm test                              # core + date
npm run test:rules                    # 需 Java + firebase-tools，使用 demo-song-quiz 模擬器
npm run test:video                    # 16 題真實 MP4 流程（需 Edge）
npm run test:ipad                     # iPad 復原
npm run test:media-range              # 20 路 Range
npm run test:retention                # 清除邏輯
```

## 部署（需使用者當輪明確核准才做）

```powershell
firebase deploy --only firestore:rules --config firebase.json --project yestredayoncemore --account u9431818@gmail.com --non-interactive
firebase deploy --only "functions:song-quiz-retention" --config firebase.retention.json --project yestredayoncemore --account u9431818@gmail.com --non-interactive
firebase deploy --only hosting --config firebase.json --project yestredayoncemore --account u9431818@gmail.com --non-interactive
```

- Google Drive 路徑裝不了 Functions 相依套件時，把 `functions-retention` 與 `firebase.retention.json` 複製到本機乾淨目錄，`npm ci`、核對 hash 後再部署。
- 函式探索逾時可設 `FUNCTIONS_DISCOVERY_TIMEOUT=60`。
- 部署後必須讀回：HTTP 200、`index.html` 與影片 SHA-256 與本機一致、Range 206。

## 安全與紀律

- 不把密碼、私鑰、service account 寫入任何檔案；教師密碼由老師自己在 Console 建立。
- 手動觸發清除排程＝永久刪資料，須使用者明確說「核准立即清除到期資料」。
- 新歌題庫須先給老師審閱（原句、挖空句、選項、正解、時間點、字表依據），**核准後才**改學生頁。
- 自動對齊的秒數不是人工聽校；不得宣稱「已人工校時」。
- 桌面 Edge 自動化不等於實體 iPad Safari 通過；兩者分開記錄。
- 完成檔案後讀回檢查路徑、內容與測試結果；commit 訊息寫清楚做什麼與為什麼。

## 待辦／未決（接手時先確認）

1. **實體 iPad 複驗**（2026-09-14 課堂 19 台中 7 台失敗，9/20 已發布修復但未實機驗證）：一次點擊啟用、停滯復原、切輕量版、句首續播、分數與次數保留、切分頁／鎖定返回、16 題與片尾。
2. 教師本人登入後台，確認同日成績與播放診斷可分別顯示且診斷不含學號。
3. **教師 Email 疑點**：`public/index.html` 的 `TEACHER_EMAIL` 與 `firestore.rules` 目前都是 `teacher@example.com`（佔位字串）。確認正式環境實際使用的教師帳號；若 repo 與線上不同，先釐清再動，**不要自行猜測或填入信箱**。
4. 時間軸仍為自動對齊，教師可在 `/review` 逐題試聽微調；San Francisco 第 8 題句尾差 0.76 秒、第 12/13 題冠詞優先審聽。
5. 教師後台目前讀取全部成績再本機篩選；資料量大時需日期索引與遷移策略。
6. 最低支援 Safari 13.1／iPadOS 13.4。
7. 實體 iPad 驗收通過後，才把 `docs/SKILL_WORKFLOW_NOTES.md` 整理成正式 Skill（見下節）。

## 關於 Skill

- **此資料夾內目前沒有已建立的正式 Skill**（`SKILL.md` 只有 `node_modules/playwright-core` 內建的）。唯一相關的是 `docs/SKILL_WORKFLOW_NOTES.md`，其狀態明寫「流程筆記，尚非已安裝或已驗收的 Skill」。
- 流程中用到的既有 Skill：`rdq`（需求訪談，已用 3 次，規格存於 `rdq/`）、`startup`／`shutdown`（開工／收工）。
- `quiz-publisher`（Blooket／Wayground）與本專案無關，勿混用。
- 新增一首歌的建議流程（Skill 化前的草稿）：取得影片與完整歌詞 → 對齊句首句尾 → 產出教師審閱稿（原句、挖空句、3 選項、字表證據）→ 老師核准 → 才加入 `public/index.html` 歌單 → 核心＋瀏覽器＋真實影片測試 → 部署讀回。歌曲合約：年級、歌名、videoId 或影片檔、quizId、題數、句首／句尾、選項與正解、教師驗收。
