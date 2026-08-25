# 網站內層 Git 歷史說明

本網站在遷移前曾是獨立的本機 Git 工作樹：

- 分支：`main`
- 最後基線提交：`770a31e Build Grade 4 local curriculum ticket practice site`
- 遠端：未設定

2026-08-25 遷移盤點時，基線提交之後另有 5 個尚未提交、但必須保留的 Read and drag 相關檔案：

- `firebase-app/src/App.tsx`
- `firebase-app/src/TeacherDashboard.tsx`
- `firebase-app/src/styles.css`
- `firebase-app/src/RailwayReading.tsx`
- `tests/firebase-site.test.mjs`

新專案保留上述現行工作樹內容，但不保留內層 `.git`，避免 nested repository。此後版本歷史統一由父層 `Samsamchou/teacher-toolkit` 的 `tools/localcoursesErshui/` 管理。

目前 Read and drag 只完成 12 張雙語卡的前端原型、三區分類、拖曳／點選替代操作、整批檢查及成功訊息。它尚未完成 18 張卡正式規格、放錯立即退回、學生姓名、逐次拖曳事件持久化、分數與教師重播資料庫、完成慶祝動畫，也尚未部署。
