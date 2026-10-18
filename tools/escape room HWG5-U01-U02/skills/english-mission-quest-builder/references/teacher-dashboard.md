# 教師後台：建置方法與內容

教師後台已經建好並上線（2026-10-18），所有任務共用。新任務只要接上去（見第 7 節）；只有在重建或修改後台時才需要讀完全文。

## 目錄

1. 老師要的功能（已確認）
2. 架構與資料流
3. 資料欄位（questAttempts）
4. 安全規則
5. 教師帳號與通行碼
6. 保存期限一年三個月（TTL）
7. 新任務怎麼接上
8. 測試
9. 部署與讀回
10. 已知限制與注意

## 1. 老師要的功能（已確認）

- **入口**：任務首頁右上角〔教師後台〕→ `/teacher/`，輸入**六碼通行碼**登入。通行碼由老師在對話中提供，Claude 不在網頁上代替老師輸入。
- **第一層：作答日期**。依台灣時間列出有作答的日期，最新的在前；每張卡片顯示各任務當天的學生人數和當天完成人數。
  - 學生跨天作答（例如今天開始、明天完成）時，兩天都列得到。
  - 一年大約只用 15 天，所以只列出有紀錄的那幾天，不顯示完整月曆。
- **第二層：點日期**，出現當天的全班列表。
  - 欄位：學號、狀態、完成題數、第一次答對（含百分比）、需重試題數、戰鬥、Boss、最後更新。
  - 可以搜尋學號、排序，也可以匯出當天、該任務的 CSV（UTF-8 BOM，Excel 打開中文正常）。
  - 當天有好幾個任務時，用分頁切換。
- **第三層：點學生**，顯示**結果頁的內容**和**需要重試的題目**。
  - 結果頁內容：大字學號、完成或進行中、Boss 結果、完成題數、第一次答對、戰鬥、道具圖示、作答日期。
  - 需要重試的題目：題號、題目和答案、作答次數、是否用提示、最後是否答對，依作答次數由多到少排列。
  - **第一次就答對的題目不列出。**
- **保存期限**：一年三個月，從學生最後一次作答起算，到期由 Firestore 自動刪除。

## 2. 架構與資料流

```
學生裝置（任務網站）
  └─ persist() 每次存檔 → uploadAttempt(cloudRecord(state))  1.5 秒防抖；結果頁 immediate
       └─ shared/quest-cloud.mjs：匿名登入 → setDoc(questAttempts/<attemptId>, {..., uid, expiresAt})
教師（/teacher/）
  └─ signInWithEmailAndPassword(TEACHER_EMAIL, 六碼) → getDocs(questAttempts) → 依日期分組
```

- **Firebase 專案**：`g6-english-online-learning`，Firestore 的 (default) 資料庫和 english-portal 共用。前端 config 在 `site/public/shared/quest-cloud.mjs`，這是公開的 web config，不是秘密。
- **SDK**：從 `https://www.gstatic.com/firebasejs/11.10.0/` 動態載入，網站本身不用打包。
- **離線**：上傳失敗不影響作答，下次存檔會補傳。HUD 的 ✓ Saved 旁邊有小圓點：綠＝已上傳、黃＝上傳中、紅＝離線。
- **檔案位置**：`site/public/teacher/{index.html, teacher.js, teacher.css}`、`site/public/shared/{quest-cloud.mjs, missions.mjs}`、`site/firestore.rules.template`、`site/scripts/make-rules.mjs`。

## 3. 資料欄位（questAttempts，每次作答一份文件，文件 ID＝attemptId）

| 欄位 | 內容 |
|---|---|
| uid | 學生裝置的匿名 uid，只有這台裝置能更新 |
| mission | 任務 slug，例如 `hwg5-u01-u02` |
| studentId | 學號，5–8 位數字；**不存姓名** |
| attemptId, startedAt, updatedAt, completedAt | 作答識別碼與時間（ISO；completedAt 未完成時是 null） |
| activeDays | 有作答的台灣日期 `YYYY-MM-DD` 清單，給第一層日期分組用 |
| stepIndex, stepCount | 進度 |
| items[] | `{seq, id, type, attempts, wrong, firstTryCorrect, hintUsed, finalCorrect}`，只放作答過的題目 |
| battles{} | 每場 `{status, quality, defeated, phaseCleared, bossDefeated}`，略過時 status 是 `skipped` |
| summary | `R.summary()` 的結果加上 bossDefeated |
| inventory | 拿到的道具名稱 |
| expiresAt | Firestore Timestamp，等於最後一次上傳時間加 456 天；TTL 依它刪除 |
| version | 目前是 2 |

## 4. 安全規則（重要：資料庫和 english-portal 共用）

- 部署前一定要先用 Rules API 讀出**現行規則**，不能直接覆蓋：
  - `GET https://firebaserules.googleapis.com/v1/projects/g6-english-online-learning/releases/cloud.firestore`
  - 再 GET 它的 rulesetName。
  - token 用 `gcloud auth print-access-token --account=u9431818@gmail.com`，並加上 header `x-goog-user-project`。
- english-portal 原本的規則是 `match /{document=**} { allow read, write: if request.auth != null; }`。我們改成 `match /{collection}/{document=**}` 再加上 `collection != 'questAttempts'`，其他集合的行為**完全不變**。
- questAttempts 的規則：
  - 學生裝置只能新增或更新 `uid == 自己` 的文件；更新時不能改 uid、studentId、mission。
  - 欄位白名單（不能多放姓名等欄位）；studentId 必須是數字；文件 ID 要等於 attemptId；items 最多 60 筆。
  - expiresAt 必須是 Timestamp，而且在現在到 470 天之間，學生不能把期限設得更長。
  - **只有教師 uid** 而且登入方式是 password，才能 get 和 list；匿名裝置連自己的紀錄也讀不回來。
  - 任何人都不能 delete；過期資料由 TTL 刪除。
- `firestore.rules.template` 裡的 `__TEACHER_UID__` 由 `node scripts/make-rules.mjs` 從 `quest-teacher.json` 代入，產生 `firestore.rules`。
- **⚠ 原本就存在的問題**：專案的匿名登入本來就開著，所以任何人都能讀寫 english-portal 的資料。已回報教師，要修必須另外取得同意。

## 5. 教師帳號與通行碼

- 帳號：`quest-teacher@hwg5-clock-tower.web.app`（假 email），密碼就是六碼通行碼。Firebase Auth 以 scrypt 雜湊保存，連續猜錯會被節流。
- 建立步驟（已完成；重建時才需要）：
  1. 開啟 Email/Password 登入：`PATCH identitytoolkit admin/v2 …/config?updateMask=signIn.email`，body `{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}`。不要動匿名登入。
  2. 先用 `accounts:lookup` 確認這個 email 還不存在，再用 `POST v1/projects/<p>/accounts`（gcloud token）建立帳號。
  3. 只把 uid 寫進 `site/quest-teacher.json`。**通行碼不寫進任何檔案**，事後用 grep 掃描確認。
  4. 用 `accounts:signInWithPassword` 驗證：正確通行碼成功、錯誤的失敗。
- 換通行碼：在 Firebase Console → Authentication 改這個帳號的密碼即可，uid 不變，規則不用重新部署。
- 先建帳號、再部署含 uid 的規則：因為開啟 Email/Password 後任何人都能註冊，規則一定要用 **uid** 判斷教師，不能用 email。

## 6. 保存期限一年三個月（TTL）

- 前端每次上傳都把 `expiresAt` 設為現在加 `RETENTION_DAYS = 456` 天（約 15 個月），所以期限從最後一次作答起算。
- 在 Firestore 建立 TTL 政策（只需一次）：

  ```
  gcloud firestore fields ttls update expiresAt --collection-group=questAttempts --enable-ttl --project=g6-english-online-learning --account=u9431818@gmail.com
  ```

  用 `gcloud firestore fields ttls list --project=…` 讀回，狀態要是 ACTIVE。
- Firestore 文件說過期文件通常在 24 小時內刪除，但不保證準時。後台上有寫明「保存一年三個月」。

## 7. 新任務怎麼接上

1. 新任務 `app.js` 改 `MISSION` 常數；保留 `today()`、`state.activeDays`、`cloudRecord()`，以及 `persist()` 和結果頁的上傳呼叫。
2. 在 `site/public/shared/missions.mjs` 加一行 `{ slug, unit, title }`。
3. 後台會讀 `/<slug>/data.js`：用 `items`（題目文字）、`battles`（最後一場當作 Boss）、`rewardIcons`。新任務的 data.js 結構要相同。
4. 規則不用改，部署 hosting 即可。最後在正式站用測試學號實測上傳，並用教師帳號（REST）讀回，再刪掉測試資料。

## 8. 測試

- **規則**：`site/tests/rules.emulator.mjs`，共 25 項，涵蓋學生、教師、english-portal 不變、expiresAt 和 activeDays。
  - 測試庫裝在 Google Drive 外：`%LOCALAPPDATA%/quest-test-deps`（`@firebase/rules-unit-testing@4`、`firebase@11`）。
  - **模擬器要從非 Google Drive 的資料夾啟動**：把 `firebase.json` 和 rules 複製到 scratchpad 再執行 `firebase emulators:exec --only firestore …`。
- **網站**：`npm test`，含後台的原始碼檢查：沒有六碼字串、retries 篩選、日期分組。
- **端到端**：
  - 網址加 `?emu=1`（只在 127.0.0.1 有效）會連本機模擬器：Auth 9099、Firestore 8087。
  - 用 `Bearer owner` 建立教師帳號、寫入範例資料。注意專案路徑要用 `g6-english-online-learning`，不能用 demo 名稱，因為頁面的 config 是正式專案 ID。
- **正式站**：
  - 用測試學號作答後，HUD 小圓點要變綠。
  - 用 REST 以教師帳號 runQuery 讀到紀錄；臨時匿名帳號讀取要得到 403。
  - 最後用 gcloud token 刪除測試文件和測試帳號。

## 9. 部署與讀回（每次都要教師授權）

- 規則：`firebase deploy --only firestore:rules --project g6-english-online-learning --account u9431818@gmail.com`
  - 部署前確認現行 ruleset 是不是上次讀到的那個。
  - 部署後讀回內容，必須和本機 `firestore.rules` 逐字相同。
  - 記下前後的 ruleset 名稱，需要時可以還原。
- 網站：`firebase deploy --only hosting:hwg5-clock-tower …`，讀回雜湊；english-portal 的標題和 JS 不能變。
- TTL：第 6 節的 gcloud 指令，讀回狀態。

## 10. 已知限制與注意

- 學號登入沒有密碼，同學可能冒用別人的學號，這是教師已接受的低門檻設計。
- 只會收到後台上線後的作答；之前的作答只存在學生自己的 iPad。
- 同一個學生在不同裝置開始作答，會出現兩筆紀錄（各自的 attemptId）。
- Claude 不在網頁上輸入教師的真實通行碼；畫面登入要請教師本人測試。
