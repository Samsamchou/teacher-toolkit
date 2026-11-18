# 母音拼讀字母題：大小寫與字母組合 — 正式部署 2026-11-18

教師以 RDQ 回覆「先這樣，直接開始」（1A、2A、3A），本機驗收後授權「部署 Hosting＋liveV2」。規格：`rdq/RDQ-spec-vowel-case-combo-20261118.md`。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- **liveV2**：`livev2-00024-seq` → `livev2-00025-rik`，ACTIVE／Ready；7 個 LIVE_* 設定（含 `LIVE_AI_MODEL`）與 Secret 綁定前後相同。
- Hosting **lesson-hub-v03**：`b8124e78932d0a87` → `sites/lesson-hub-v03/versions/f02c74c0d84956f0`（UTC 2026-11-18T07:53:53.650Z）。
- 13 個 Functions 只更新 liveV2；預設 Hosting、規則不變。

## 本次上線

- 字母方塊照老師輸入的大小寫顯示（English、TV、the Internet）；只改大小寫時保留已標記字母。
- 相鄰標記字母自動成組（ur、er、ay、ar、ai）；a_e、i_e 在編輯頁按「a_e／i_e 連成一組」→ 點字母 →「完成連結」（標籤 ✕ 可取消）。
- 學生整組點完後變綠底紅字＋紅色括線＋「ur」「a_e」標籤；只點一個字母時只有綠色。計分與完成判定不變；組合資訊只在整組點完後才送到學生端。
- 片語只在單字之間換行；單字比卡片寬時才在字內換行。
- 分配作答頁的母音題（另一個介面）沒有組合顏色。

## 發布驗證

- 隔離副本 `%TEMP%\lesson-hub-vowel-release-20261118`：model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 330/330、Functions 10/10、語法、建置通過；site-data 於原專案 errors 0。
- 部署前線上版本與上一筆紀錄相同；後端相對線上只改 `generated/live-domain.mjs`。部署後雲端原始碼 44 檔與副本逐位元相同。
- `.env.hwg7teaching` 由線上 LIVE_* 值產生，只留在 Temp。
- 公開讀回 209/209（189 全文 SHA、20 gzip ETag＋長度），三入口 200；前端程式含「連成一組」與組合標籤樣式。
- 本機實測截圖：`qa/vowel-case-combo-20261118/screenshots/`。

## 未驗證與交接

- **正式站教師實際編輯（含 a_e 連結）、課堂學生點選與大電視顯示尚待教師驗收**；未寫入正式課程或學生資料。舊課程不需重新編輯，相鄰組合自動生效；a_e／i_e 需老師連結一次。
- 沒有 Git stage／commit／push（repo index SHA 前後相同）。證據：`qa/vowel-case-combo-20261118/production/`。
