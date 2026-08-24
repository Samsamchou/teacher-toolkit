# HWG7 Sentence Review Firebase Functions

本目錄是 Firebase Functions v2 的部署來源。HWG7 SR 與 HWG5 SR 已部署至 `setencerevieworalpractice`；2026-08-24 已完成多單元題庫、正式 TTS、本機測試、部署閘門與正式靜態資產／安全讀回。HWG7 舊版部署證據保留於 `LOCAL-QA-REPORT-20260822.md`，HWG5 驗證摘要位於專案 `qa/hwg5-sr-local-validation-20260824.md`。

## 目前規格

- Runtime：Node.js 22；Region：`asia-east1`
- 題庫：HWG7 SR 13 題、HWG5 SR 15 題；每局從所選單元抽 12 題；兩位玩家各 6 回合
- 回合：第 1 回合 A 朗讀／B 回答，第 2 回合 A 回答／B 朗讀，之後交替；每局都由此模式重新開始
- 評分：HWG7 使用 `a1-v2-answer-only`，HWG5 使用 `hwg5-sr-v1-answer-only`；準確度 50%＋完整度 30%＋流暢度 20%；80 分（含）達標
- 題型二只評學生答句，不要求錄下問句；短答與完整答均可各自滿分
- HWG5 時間題使用 `clock-en-v1` 規則：英文數字字詞與 `o'clock` 先正規化後判讀，不以模糊連寫阿拉伯數字取代學生實際語句
- OpenAI 金鑰：正式環境只可使用 Firebase Secret `OPENAI_API_KEY`

## 匯出函式

| Function ID | 用途 |
|---|---|
| `startGame` | 建立／恢復兩位學生的當日局次，防止同組同時開兩局。 |
| `abandonGame` | 清除未完成局，不增加完成局數。 |
| `evaluateSpeech` | 驗證錄音與回合，呼叫 OpenAI 轉錄，再以固定 v2 公式評分；題型二只評答句。 |
| `completeGame` | 驗證 12 個不重複回合並冪等完成；下一局仍從固定題型配置開始。 |
| `teacherLogin` | 驗證六碼通行碼的 scrypt 雜湊並簽發短期 session。 |
| `teacherRecording` | 驗證教師 session 後直接串流錄音二進位；不產生或暴露簽名網址。 |
| `teacherApi` | 提供教師篩選、嘗試紀錄、CSV 來源資料、軟刪除與登出。 |
| `cleanupExpiredRecordings` | 每日刪除超過 30 天的錄音。 |

## 安全邊界

- 前端不保存逐字稿、分數、教師通行碼或 OpenAI 金鑰。
- OpenAI 請求不傳學生代碼或姓名。
- 教師通行碼只以 scrypt salt/hash 保存於 Admin-only Firestore。
- 教師錄音由受保護端點回傳 `Blob`；未登入為 401，過期為 410，Storage 暫時失敗為 503。
- Firestore 與 Storage 規則預設拒絕瀏覽器直接存取。

## 本機驗證

```powershell
npm --prefix functions run check
npm --prefix functions test
firebase emulators:exec --project demo-hwg7-sr --only auth,functions,firestore,hosting,storage "node functions/emulator/smoke.mjs"
```

2026-08-24 多單元結果：Functions `86/86`、網站 `56/56`、HWG5 專屬測試 `14/14`、HWG5 題圖版面 `45/45` 加缺圖 fallback；28 張正式題圖與 22 段 TTS 已逐檔和正式 Hosting 讀回雜湊一致。正式站 8 個 Functions 均為 `ACTIVE`，缺少 App Check 的請求為 401、錯誤來源為 403。實體 iPad Safari 麥克風仍須由教師在校內裝置完成人工驗收。

## 正式部署閘門

HWG5 SR 本次新增已完成部署；這次授權不自動延伸到後續修改。未來再次部署前仍須收到精確授權：

`確認部署 setencerevieworalpractice`
