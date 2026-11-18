# 作答中斷接續（共用平板、學號直接接續）— 正式部署 2026-11-18

教師確認 RDQ 規格（1C、2A、3C；建議①②③⑤），先要求「照做，先不部署」，本機驗收後再明確授權「部署 Hosting＋liveV2」。規格：`rdq/RDQ-spec-resume-progress-20261118.md`。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- **liveV2**：`livev2-00023-wuq` → `livev2-00024-seq`，ACTIVE／Ready；7 個 LIVE_* 設定（含 `LIVE_AI_MODEL`）與 Secret 綁定前後相同。
- Hosting **lesson-hub-v03**：`2c9fe24aa6b7412d` → `sites/lesson-hub-v03/versions/b8124e78932d0a87`（UTC 2026-11-18T05:03:29.666Z）。
- 13 個 Functions 只更新 liveV2（其他 12 個不變）；預設 Hosting、Firestore 規則不變。

## 本次上線

- 不再綁定裝置：同一台平板可換學號；同一學號在另一台裝置輸入即接續原題、分數與遊戲機會（revision +1）。舊裝置下次操作回到學號輸入頁，顯示「這個學號已在其他裝置接續，請重新輸入學號加入。」另一台裝置的 AI 錄音評分中時暫不接手。
- 作答頁、遊戲頁、成績頁加「不是你？換學號」；已選答案未送出時換學號先確認，關分頁或重新整理跳瀏覽器離開提醒。
- 學號輸入頁說明：「關掉也沒關係，用任何裝置輸入同一個學號，就能從上次的題目接續。」
- 教師報表新增「最後作答」欄（時間＋目前第幾題／已完成），CSV 新增「最後作答時間、目前題號」；隱藏「協助學生更換裝置」。
- 已知限制：只輸入學號即可接續，同學可能冒用學號（教師 3C 已接受）；最後作答時間只在送出答案／換題時更新。

## 發布驗證

- 乾淨隔離副本 `%TEMP%\lesson-hub-resume-release-20261118`：model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 326/326、Functions 10/10、語法、建置通過；site-data 於原專案 errors 0。部署前本機模擬器 12/12 與 7 張實測截圖見 `qa/resume-progress-20261118/`。
- 部署前線上版本與 11/18 紀錄相同；後端相對線上只改 `src/assignment-service.mjs`。
- `.env.hwg7teaching` 於部署前由線上 liveV2 的 LIVE_* 值產生，只留在 Temp，未存入專案或 qa。
- 部署後雲端原始碼 44 檔與副本逐位元相同；公開讀回 209/209（189 全文 SHA、20 gzip ETag＋長度），三入口 200；部署的前端程式含「換學號」「其他裝置接續」「最後作答」。

## 未驗證與交接

- **教室共用平板實際輪流作答、換裝置接續、iPad Safari 離開提醒尚待教師驗收**；未寫入正式分配或學生資料。
- 瀏覽器若顯示舊頁，重新整理即可。進行中的分配不受影響，舊分配也適用新接續規則。
- 沒有 Git stage／commit／push（repo index SHA 前後相同）。證據：`qa/resume-progress-20261118/production/`（不含部署原始碼 zip）。
