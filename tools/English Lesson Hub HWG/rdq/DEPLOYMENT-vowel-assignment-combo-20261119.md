# 分配作答頁母音題字母組合顏色 — 正式部署 2026-11-19

教師開工指定「分配作答頁的母音題也加上字母組合顏色」，本機驗收後授權「部署 Hosting＋liveV2」。延續規格：`rdq/RDQ-spec-vowel-case-combo-20261118.md`。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- **liveV2**：`livev2-00025-rik` → `livev2-00026-xat`，ACTIVE／Ready；7 個 LIVE_* 設定（含 `LIVE_AI_MODEL`）與 Secret 綁定前後相同。
- Hosting **lesson-hub-v03**：`f02c74c0d84956f0` → `sites/lesson-hub-v03/versions/34412addf3b034e1`（UTC 2026-11-18T09:06:00.446Z）。
- 13 個 Functions 只更新 liveV2；預設 Hosting、規則不變。

## 本次上線

- 分配作答頁母音題在題目結束後（全對、練習用完 4 次、測驗交卷），回饋框顯示學生選對的字母（綠）與完整找到的字母組合（綠底紅字＋紅括線＋ur／er／a_e 標籤）。
- 還能再試時不顯示，避免洩漏答案；伺服器只回報學生有選的字母。
- 有字母組合時，自動開遊戲頁的時間從 1.5 秒延到 4 秒，讓學生看清楚。
- 已知限制：重新整理頁面後的回饋框只顯示分數，不含字母組合。

## 發布驗證

- 隔離副本 `%TEMP%\lesson-hub-vowel-assign-release-20261119`：model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 331/331、Functions 10/10、語法、建置通過；site-data 於原專案 errors 0。
- 部署前線上版本與上一筆紀錄相同；後端相對線上只改 `generated/assignment-domain.mjs`。部署後雲端原始碼 44 檔與副本逐位元相同。
- `.env.hwg7teaching` 由線上 LIVE_* 值產生，只留在 Temp。
- 公開讀回 209/209（189 全文 SHA、20 gzip ETag＋長度），三入口 200；前端程式含 `lh-vowel-result`。
- 本機實測（1024×768）：第一次部分答對只出現 Try Again、沒有組合；第二次全對顯示 ur、er、a_e×2。截圖 `qa/vowel-assignment-combo-20261119/screenshots/`。

## 未驗證與交接

- **正式站以母音題建立新分配、iPad 學生實作尚待教師驗收**；未寫入正式分配或學生資料。
- 沒有 Git stage／commit／push（repo index SHA 前後相同）。證據：`qa/vowel-assignment-combo-20261119/production/`。
