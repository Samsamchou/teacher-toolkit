# HWG7 SU 雲端紀錄保存修復：本機 QA 報告

- 日期：2026-09-08
- 狀態：本機實作與自動 QA 通過；尚未備份、提交、推送或正式部署
- 正式目標（未變更）：`hwg5-su-to-u04-story`
- 正式網址（本輪未變更）：https://hwg5-su-to-u04-story.web.app

## 已驗證根因

新版頁面將錄音統一成 `audio/wav` 並使用 `timestamp-attemptId.wav`，但正式 Firestore／Storage Rules 仍只接受純數字 `.webm`。前端原本捕捉並吞掉保存錯誤，隨後仍計次、顯示綠色「評分完成」及清除記憶體錄音，因此產生學生有分數、教師後台沒有資料的假成功。

正式環境於 2026-09-08 的唯讀盤點只找到 50108 的 3 筆 Firestore 紀錄及 3 個 WebM 音檔；其他學生沒有可直接復原的雲端物件。本次未搬移、回寫、補建或刪除任何既有資料。

## 本機實作

1. 新版 WAV 路徑、Storage metadata 與 Firestore 文件 ID 共用同一個 `attemptId`；舊式純數字 WebM 仍相容。
2. Storage 與 Firestore 都成功後，才顯示綠色完成、計入每日三次並清除記憶體錄音。
3. AI 已評分但保存失敗時顯示琥珀色狀態與分數，提供「重新儲存紀錄（不重新評分）」且不計次。
4. 上傳或寫入其實成功但回應逾時時，先讀回固定位置；相符即接續，不重複建立，不相符則停止並提示教師。
5. 新增不含音訊、逐字稿、姓名、學號、owner UID、憑證或原始錯誤的 `persistence_events`，教師後台只顯示按日期彙總的 AI／音檔／成績失敗數。
6. `reading_records` 與 `persistence_events` 均使用七個日曆月 `expiresAt`；Storage `audio_records/` 保持既有 215 天 lifecycle。

## 測試結果

- Firestore＋Storage Emulator：Standard edition 實際啟動。
- 命令：`firebase emulators:exec --only firestore,storage --project hwg5-su-to-u04-story-rules-test "npm run check && npm test"`
- 結果：**51 tests／51 passed／0 failed／0 skipped**。
- 最終重跑：2026-09-08 14:12（Asia/Taipei）；已包含音檔下載位置 5 秒逾時保護。
- 涵蓋：舊 WebM、新 WAV、MIME／副檔名、attemptId、owner UID、bucket、路徑穿越、必要欄位、型別、大小、時間、教師權限、匿名遙測、部分成功讀回、衝突停止、22 位學生×4 題並行與首頁內嵌程式解析。
- 本機 HTTP smoke：`/` 173,165 bytes、`/recording-reliability-core.js` 17,352 bytes、`/ai-scoring.js` 4,515 bytes，均為 HTTP 200。
- Browser preview：Codex in-app browser、1024×768 iPad 橫向；首頁元件完整可見，console 只有既有 Tailwind CDN production warning。未登入、未授權麥克風、未呼叫正式 AI、未寫入 Firebase。
- Secret scan：未找到 OpenAI／Gemini／TTS 金鑰、私鑰或字串型 App Check debug token。

## 安全評估與限制

- Security Rules audit：4／5；所有紅隊測試均阻擋或不適用。
- 剩餘低度風險：App Check 仍在監控模式時，匿名登入者理論上可大量建立嚴格、小型且會 TTL 到期的失敗事件；Rules 無法可靠做每人速率限制。
- Firebase Hosting Emulator 的包裝命令因既有 Firebase CLI 登入憑證過期而回傳非零，但其內部三個 HTTP smoke 均成功；另以不需登入的本機 HTTP server 重跑後 3／3 通過。
- 本機模擬不能取代學校 iPad＋Safari、校園 Wi-Fi、正式 App Check、真實 AI 評分與教師登入驗收。

## 正式部署前關卡

須由教師另行確認後，才可發布 `firestore.rules`、`storage.rules`、`firestore.indexes.json`（新增 `persistence_events.expiresAt` TTL）與 Hosting。正式發布後先讀回 Rules／TTL／Hosting，再用至少 1 台學校 iPad＋Safari 連續完成 4 題；通過後才安排缺漏學生各重錄一次。

完整部署範圍、順序、排除項目與回復方式見 `DEPLOYMENT-READBACK-PLAN.md`。
