# HWG7 Sentence Review Firebase Functions

本目錄是 Firebase Functions v2 的正式部署套件。2026-08-22 已部署至 Firebase 專案 `setencerevieworalpractice`，並完成本機、Emulator 與正式網址驗證。

## 執行環境

- Runtime：Node.js 22（`firebase.json` 與 `functions/package.json` 雙重鎖定）
- `firebase-admin`：`14.3.0`
- `firebase-functions`：`7.3.2`
- Region：`asia-east1`
- OpenAI 金鑰：正式環境只能使用 Firebase Secret `OPENAI_API_KEY`

## 匯出函式

| Function ID | 用途 |
|---|---|
| `startGame` | 以 Firestore transaction 建立／恢復兩位學生的當日局次，防止同一組同時開兩局。 |
| `abandonGame` | 清除未完成局；不增加完成局數，也不翻轉 A／B 題型。 |
| `evaluateSpeech` | 驗證正式題目、回合、嘗試與錄音格式，呼叫 OpenAI，使用固定 `a1-v1` 公式評分並保存嘗試。 |
| `completeGame` | 驗證 12 個不重複正式回合後，以 transaction 完成該局並只翻轉一次下一局題型。 |
| `teacherLogin` | 驗證六碼通行碼的 scrypt 雜湊，套用 5 次失敗／15 分鐘鎖定並簽發不透明短期 session。 |
| `teacherApi` | 提供教師篩選、完整嘗試／逐字稿、5 分鐘錄音網址、CSV 來源資料、軟刪除與登出。 |
| `cleanupExpiredRecordings` | 每日刪除超過 30 天的學生錄音。 |

所有 HTTP 端點只接受精確 CORS 來源與 JSON POST，正式環境要求 Firebase App Check。瀏覽器不得直接讀寫 Firestore 或 Storage；規則預設全部拒絕，只有 Admin SDK 可存取。

## 個資與秘密邊界

- 前端不保存逐字稿、分數、教師通行碼或 OpenAI 金鑰。
- OpenAI 請求使用通用檔名，不傳學生代碼、姓名或題號。
- `evaluateSpeech` 只接受不透明 `gameSessionId`、`turnIndex`、`attemptNumber`；額外欄位與學生代碼會被拒絕。
- 教師通行碼不放前端、不使用 Secret Manager；只在 Admin-only Firestore 保存 scrypt salt/hash。
- 本機 `.env.local` 已由 Git 忽略，只供本機伺服器使用；它不等同正式 Firebase Secret。

## 本機驗證

```powershell
npm --prefix functions ci
npm --prefix functions run check
npm --prefix functions test
firebase emulators:exec --only functions,firestore,storage "node functions/emulator/smoke.mjs" --project demo-hwg7-sr
```

2026-08-22 最終驗證結果：Functions 單元測試 `47/47`；Node 22.23.2、Firebase CLI 15.28.1 Emulator 端到端情境通過；正式線上綜合 QA `15/15`，包含 12 回合完整局、只翻轉一次、重送冪等、下一局交換題型與第 13 題正式轉錄。詳見根目錄 `LOCAL-QA-REPORT-20260822.md`。

## 正式部署閘門

App Check 網站金鑰、Firebase Secret、教師通行碼雜湊、用量／帳務警示均已設定。實體 iPad Safari 麥克風仍由教師本人於學生試用時抽查。`firebase.json` 的 predeploy 會呼叫 `scripts/deployment-gate.mjs`；未來任何再次部署若缺少下列精確授權或 App Check，仍會中止：

`確認部署 setencerevieworalpractice`

2026-08-22 已收到該口令並完成本次部署；這次授權不自動延伸到未來部署。未來再次修改正式 Secret、教師驗證設定或規則時，仍須重新確認範圍與授權。