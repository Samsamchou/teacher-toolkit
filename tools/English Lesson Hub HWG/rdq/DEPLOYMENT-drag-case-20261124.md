# 拖放／下拉題區分大小寫 — 正式部署 2026-11-24

教師在 HWG5 U03〈Where's the ___?〉拖放題設正解 Street、干擾 street，被「空格需有正解，干擾不能等於正解。」擋住無法 Teacher-led。依 `rdq/RDQ-spec-drag-case-sensitive-20261124.md` 修正，教師授權「部署 Hosting＋liveV2」。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- **liveV2**：`livev2-00026-xat` → `livev2-00027-nux`，ACTIVE／Ready；7 個 LIVE_* 設定（含 `LIVE_AI_MODEL`）與 Secret 綁定前後相同。
- Hosting **lesson-hub-v03**：`34412addf3b034e1` → `sites/lesson-hub-v03/versions/0da483dc7c8e9fae`（UTC 2026-11-24T14:22:22.934Z）。
- 13 個 Functions 只更新 liveV2；預設 Hosting、規則不變。

## 本次上線

- 拖放與下拉選單：正解與干擾可只差大小寫；學生要選到大小寫完全一樣的卡才算對。完全相同（Street／Street）仍擋。
- 打字填空：維持不分大小寫。
- 分配作答頁：題目結束後選到只差大小寫的錯卡，回饋框顯示「🔠 注意大小寫」；還能再試時不顯示。
- 編輯頁：干擾答案下方顯示「🔠 只差大小寫」提示。
- 課堂 Teacher-led 拖放題需全對才結束，因此課堂不會出現「注意大小寫」。

## 發布驗證

- 隔離副本 `%TEMP%\lesson-hub-drag-case-release-20261124`：model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 335/335、Functions 10/10、語法、建置通過；site-data 於原專案 errors 0。
- 部署前線上版本與上一筆紀錄相同；後端相對線上只改 `generated/assignment-domain.mjs`、`generated/parity.mjs`。部署後雲端原始碼 44 檔與副本逐位元相同。
- `.env.hwg7teaching` 由線上 LIVE_* 值產生，只留在 Temp。
- 公開讀回 209/209（189 全文 SHA、20 gzip ETag＋長度），三入口 200。
- 本機實測：Street／street 拖放題可開始 Teacher-led；測驗分配選 street 得 0 分並顯示提示。截圖 `qa/drag-case-20261124/screenshots/`。

## 未驗證與交接

- **教師在正式站開啟原 HWG5 U03 課程按「檢查並開始 Teacher-led」、學生平板實作尚待驗收**；未寫入正式課程或學生資料。
- 沒有 Git stage／commit／push（repo index 前後相同）。證據：`qa/drag-case-20261124/production/`。
