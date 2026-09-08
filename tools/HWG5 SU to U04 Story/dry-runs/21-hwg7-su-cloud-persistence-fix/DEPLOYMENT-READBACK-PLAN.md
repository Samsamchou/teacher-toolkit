# HWG7 SU 雲端保存修復：正式部署與讀回計畫

- 狀態：僅完成計畫，尚未執行正式部署
- Firebase 專案：`hwg5-su-to-u04-story`
- Hosting：`https://hwg5-su-to-u04-story.web.app`
- Firestore：Standard edition、`(default)`、`asia-east1`
- Storage bucket：`hwg5-su-to-u04-story.firebasestorage.app`

## 教師確認後才會發布的項目

1. `firestore.rules`：相容舊式 WebM，新增固定 `attemptId` 的 WAV 成績文件與匿名保存異常事件。
2. `storage.rules`：相容舊式 WebM，允許已驗證、固定路徑、有限大小且 metadata 相符的 WAV。
3. `firestore.indexes.json`：啟用 `persistence_events.expiresAt` TTL；既有 `reading_records.expiresAt` 保持不變。
4. Hosting：發布本機已通過 QA 的學生端保存流程與教師端匿名失敗彙總。

## 本輪明確不變更

- 不部署 Functions。
- 不變更 Authentication 登入方式或教師白名單。
- 不變更 App Check enforcement、雲端配額、每月預算或警示。
- 不變更既有 Storage 215 天 lifecycle。
- 不搬移、回寫、補建或刪除任何既有學生紀錄與音檔。
- 不同步 Google Drive、不建立 Git commit、不推送 GitHub；這些須另行授權。

## 發布順序與讀回

1. 前置核對 Firebase 專案 ID、正式網址、目前 Rules／TTL／Hosting release；若 Firebase CLI 登入已過期，由教師本人完成瀏覽器驗證。
2. 先發布 Firestore Rules、Firestore indexes 與 Storage Rules；讀回已生效的 Rules 及 `persistence_events.expiresAt` TTL。
3. 再發布 Hosting；讀回正式首頁、`recording-reliability-core.js`、`ai-scoring.js` 的 HTTP 狀態與 SHA-256。
4. 不登入學生帳號、不錄音的正式 smoke 通過後，才開始實機驗收。
5. 至少使用 1 台學校 iPad＋Safari 連續完成 HWG7 SU 四題，核對：學生綠色完成、每日次數、教師後台四筆資料、四個 WAV 可播放。
6. 另做一次可控的保存失敗演練，核對琥珀色提示與「重新儲存紀錄（不重新評分）」不扣次數且不產生重複資料。
7. 上述驗收通過後，才通知缺漏學生重新錄製；2026-09-08 未上雲的舊錄音無法從 Firebase 復原。

## 回復方式

- Hosting 異常：在 Firebase Hosting release history 回復到部署前版本。
- Rules 異常：恢復部署前讀回並保留的 Firestore／Storage Rules，再重新發布；舊式 WebM 相容規則在新版本中仍保留，可降低切換風險。
- TTL 異常：停在人工檢查，不手動刪除既有資料；TTL 是背景作業，不保證到期瞬間刪除。
- 任一步驟讀回不一致即停止，不繼續下一階段。

## 目前已知部署前事項

- 2026-09-08 本機 Hosting Emulator 包裝命令顯示既有 Firebase CLI 登入憑證已過期；正式部署前可能需要教師本人重新登入。
- 本機 22 位學生×4 題與 Emulator 測試不能取代校園 Wi-Fi、正式 App Check、真實 AI 與實體 iPad 驗收。
