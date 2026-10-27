# 已結束分配標示與刪除 — 正式部署 2026-10-17

使用者明確要求「部署 Hosting 與 liveV2 到正式站，照之前的隔離副本流程，部署後讀回驗證」。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- Firebase **hwg7teaching**，Hosting **lesson-hub-v03**：`59f6a4b49bf7f134` → `sites/lesson-hub-v03/versions/066eeb180f4a7d72`，發布 UTC 2026-10-17T08:18:57.088Z。
- **liveV2**：`livev2-00019-tez` → `livev2-00020-wuk`，ACTIVE／Ready；LIVE 設定與 Secret 參照保留，環境變數無差異。
- 13 個 Functions 只更新 liveV2；預設 Hosting 不變；未部署 Firestore／Storage 規則、Worker 或其他專案。

## 本次上線

- 教師在「分配與學生作答」按「結束分配」後：清單標示「（已結束）」並排到最後；報表上方顯示「已結束」；結束分配按鈕、QR code、學生連結與複製按鈕隱藏。期限已過的分配也視為已結束。
- 已結束分配可在「已結束」橫幅或分配卡片上按右鍵，或按紅色「刪除分配」按鈕（iPad 用），先出現確認框（可先下載 CSV）再永久刪除。
- 後端新增教師動作 `assignmentDelete`：只限分配擁有者、只限已結束或已過期；刪除 `lessonAssignmentsV1/{code}` 與其 runs／attempts／members、對應的 `assignmentCreationsV1` 紀錄、`lessonAssignmentAudioV1` 錄音紀錄及 Storage `assignmentAudioV1/{uid}/{id}/audio、score.json`。分配主文件最後刪除，中途失敗可重試。**刪除無法復原。**

## 發布驗證

- 隔離副本 `%TEMP%\lesson-hub-assignment-delete-20261017`，`.env.production` 為 firebase transport＋公開 App Check；functions 無 `.env*`。
- model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 測試 309/309、Functions 測試 10/10、語法、正式建置通過；site-data 在原專案執行（資料檔逐位元相同）errors 0。
- 模擬器整合 17/17，含新增「真 Firestore 刪除整棵分配、claim 與錄音，且不動其他分配」。
- 部署前線上版本與上一輪紀錄相同；後端相對線上僅 `index.cjs`（錄音刪除函式）、`src/assignment-service.mjs`、`src/live-teacher-scope.mjs` 三檔變更。部署後雲端原始碼 42 檔與隔離副本逐位元相同。
- 公開讀回 209/209：189 檔全文 SHA-256、20 個大檔 gzip-9 ETag＋長度；三個入口 200 且與 index.html 相同；init.json 專案正確。正式 `/lab` 已載入新 CSS（含刪除確認樣式）；未登入時 liveV2 回 403 為預期。
- 本機模擬資料實測：結束後清單顯示（已結束）、橫幅、按鈕與連結隱藏；右鍵開啟確認、確認後分配從清單消失。

## 未驗證與交接

- **正式站登入後的結束／刪除尚待教師實測**；本輪沒有讀寫或刪除任何正式分配、課程或學生資料。
- 沒有 Git stage／commit／push（repo index SHA 前後相同）。
- 證據與腳本：`qa/assignment-delete-production-20261017/`（`cloud.cjs`、`http.cjs`、`srcdiff.py` 以環境變數 `LH_RELEASE`、`LH_EVIDENCE` 指定 Temp 目錄名稱）。
