# 正式部署紀錄：AI 錄音題修復（2026-10-27）

教師於 2026-10-27 明確授權部署 liveV2、liveAudioV2（加 `LIVE_AI_MODEL=gemini-3.5-flash`）與 lesson-hub-v03 Hosting，並要求部署後實測。規格：`rdq/RDQ-spec-ai-audio-fix-20261027.md`（confirmed）。

## 原因
- 正式站 `liveAudioV2` 的環境變數缺少 `LIVE_AI_MODEL`（2026-10-15 部署後遺失），所以評分在呼叫 Gemini 前就失敗。
- 舊程式在失敗後把錄音標成 `uncertain`、扣 1 次並設定 `pendingAudio`，學生不能重送也不能重錄。

## 變更
- `functions/src/live-audio.mjs`：送出前檢查 AI 設定（缺漏時不扣次數）；可退還的儲存庫在評分失敗或卡住超過 5 分鐘時會釋放後重新保留；Gemini 回 429／500／503 時重試一次；學生看得懂的錯誤訊息。
- `functions/src/assignment-audio-repository.mjs`：新增 `release`（還原這題紀錄、清掉 `pendingAudio`、刪除 attempt、標記 `released`）；`reserve` 可重用 `released` 錄音，並自動釋放已失敗或卡住的舊錄音；`claim` 記錄 `claimedAt`。
- `src/assignments/assignment-domain.mjs`（同步到 `functions/generated/`）：`feedbackFor` 帶出 `ai: {total, feedback}`。
- `src/assignments/AssignmentAudio.jsx`、`AssignmentStudent.jsx`、`assignments.css`：彩色大按鈕（🎙 紅／⏹ 深色／📤 紫／🔄 外框）、錄音倒數、評分中提示、「再送一次」、回饋卡顯示 AI 口說評分與一句回饋。
- 測試：`tests/assignments.test.mjs` 新增 5 項錄音復原測試，`tests/live-services.test.mjs` 新增 1 項 503 重試測試。

## 模型選擇（實測）
同一段 TTS 錄音「dirt」：`gemini-3.7-flash`、`gemini-3.8-flash` 兩次都 90 秒逾時；`gemini-3.5-flash` 分別在 5.1 秒、7.5 秒回傳合理分數（98、96），有一次回 503。因此改用 3.5-flash，並加上 503 自動重試。

## 驗證（隔離副本 `%TEMP%\lesson-hub-ai-audio-20261027`）
- `npm test` 315/315、`test:functions` 10/10、`check:functions`、`verify:teacher-access`、`vite build` 通過。
- 本機測試頁（假麥克風＋假 AI，第一次失敗、第二次成功）：桌機與 768px 寬度檢查開始、錄音中、試聽、評分中、失敗後再送、成功回饋卡六個畫面。

## 部署結果
- `liveV2`：`livev2-00020-wuk` → `livev2-00021-hut`（ACTIVE）。
- `liveAudioV2`：`liveaudiov2-00004-tep` → `liveaudiov2-00005-yel`（ACTIVE），secret `LESSON_LIVE_GEMINI_KEY` 仍綁定。
- 兩者的 LIVE_* 旗標與部署前相同，只新增 `LIVE_AI_MODEL=gemini-3.5-flash`；liveMediaV2、liveImageSearchV2、liveRetentionV2 沒有變動。部署用 `.env.hwg7teaching` 只放在 Temp 副本。
- Hosting `lesson-hub-v03`：release complete；`/lab` 入口 11 個 asset 及含新功能的 `LiveApp-CpiYyEGx.js`、`LiveApp-BYmrkb0e.css`，SHA-256 與建置結果相同。

## 正式站實測
- 99901 不符合學號格式（第一碼須為 3–6、座號 01–30）。60121 已綁定教師裝置，所以改用虛構學號 **69930** 加入分配 642749。
- 第 4 題「church」用假麥克風送出「dirt」的 TTS：評分中提示正常，8.8 秒得到結果：「AI 口說評分 25 / 100」，回饋為「目標字是 church，你唸成了 dirt……」，換算 1.25 / 5 分。「再試一次」後開始錄音按鈕可以使用。伺服器紀錄為 HTTP 200、8.36 秒。
- 資料庫：69930 一筆 `complete`；60121 那筆 `uncertain` 會在教師裝置重送或重錄時自動釋放。

## 待辦
- 教師用實體 iPad／Safari 的真實麥克風錄一次。
- 60121 在教師裝置上重送或重錄，確認卡住的錄音已解開。
- 分配 642749 的明細裡有 69930 的測試紀錄，可以忽略，或用教師後台釋放／刪除。
- 證據：`qa/ai-audio-fix-20261027/`。未 Git commit／push。
