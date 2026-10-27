# 正式部署紀錄：右鍵刪除學生紀錄＋AI 口說 85 分過關（2026-10-27 晚）

教師明確授權部署 liveV2、liveAudioV2（保留 `LIVE_AI_MODEL=gemini-3.5-flash`）與 lesson-hub-v03 Hosting。規格：`rdq/RDQ-spec-student-reset-audio-pass-20261027.md`（1A 2A 3A，建議①–④）。

## 變更
- `functions/src/assignment-service.mjs`：新增教師動作 `assignmentStudentDelete`（只限分配擁有者）。先在交易中刪除學生的 run 與裝置綁定，再刪除該生的 attempts、錄音紀錄與 Storage 錄音檔；名單內學生刪除後會變回未作答。`live-teacher-scope.mjs` 也加入這個動作。
- `src/assignments/AssignmentTeacher.jsx`：在明細的學生列（有作答紀錄的）按右鍵 → 確認視窗顯示學號、完成題數與總分 → 刪除後重新載入；如果開著該生的明細，會一起關閉。
- `src/assignments/assignment-domain.mjs`：`AUDIO_PASS_SCORE=85`、`audioPoints`，AI 85 分以上算滿分（關閉該題、給獎勵），未達 85 分照比例計分。`assignment-audio-repository.mjs` 的 finalize 改用 `audioPoints`。
- `AssignmentAudio.jsx`＋css：提示「🎯 AI 口說評分 85 分以上就過關！」。
- 舊分數不回溯。

## 驗證
- 隔離副本 `%TEMP%\lesson-hub-ai-audio-20261027`：`npm test` 317/317（新增：單一學生刪除後可以重新加入、只刪該生、權限；98／85 分滿分過關、84 分不過關）、Functions 10/10、check、build 通過；本機測試頁看得到過關提示。

## 部署結果
- liveV2 `livev2-00021-hut` → `livev2-00022-qix`；liveAudioV2 `liveaudiov2-00005-yel` → `liveaudiov2-00006-hic`；兩者 ACTIVE，LIVE_* 旗標不變（含 `LIVE_AI_MODEL=gemini-3.5-flash`），Gemini secret 仍綁定。
- Hosting lesson-hub-v03 release complete；`/lab` 入口 11 個 asset 及含新功能的 `LiveApp-CEDBBoaz.js` 等，共 13 檔 SHA-256 與建置結果相同。
- 教師右鍵刪除需要教師登入，**尚未在正式站實際點過**。

## 待辦
- 教師在 642749 的明細對 69930 按右鍵刪除，確認可以刪除；再讓 60123 視需要刪除後重測。
- 證據：`qa/student-reset-20261027/`。未 Git commit／push。
