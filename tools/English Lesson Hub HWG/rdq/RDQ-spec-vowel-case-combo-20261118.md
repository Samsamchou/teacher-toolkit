---
rdq_version: 1
edition: claude-code
task: 母音拼讀字母題：照輸入大小寫顯示、字母組合綠底紅字
domain: dev
date: 2026-11-18
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 0
  revisions: 0
downstream: self
---

# RDQ 需求規格：母音題大小寫與字母組合

## 一句話任務
「點選母音拼讀字母」題的字母方塊照老師輸入的大小寫顯示（English、TV、the Internet）；er、ur、ay、a_e、i_e 等字母組合在學生點完整組後顯示綠底紅字＋紅色括線與標籤。

## 已確認
- 大寫原因：字母方塊樣式強制小寫；資料本來就保留大小寫。改為照輸入顯示，所有專有名詞通用。
- 教師回覆「先這樣，直接開始」，三題採推薦選項：
  - 1A：相鄰且都標記的字母自動成一組；a_e、i_e 這類隔開的組合由老師按「連成一組」連起來。
  - 2A：組合方塊綠底紅字，下方紅色括線連起，並顯示「ur」「a_e」小標籤。
  - 3A：每個字母點對先變綠；整組點完才一起變綠底紅字。計分不變。

## 待確認假設
- study 的 y、the 的 e 這類單一字母非短母音，維持只有綠色。
- 相鄰規則在顯示時計算，已建立的課程也會自動套用（若有相鄰但各自獨立的母音會被當成一組，老師需改標記）。
- 組合資訊只在整組點完後才讓學生端知道，不提前洩漏答案。
- 完成後先不部署；若改到後端，部署需 Hosting＋liveV2。

## 本次不納入
- 建議①～⑤（編輯頁即時組合預覽之外的額外說明文字、提示文字等）；本機測試截圖仍作為一般驗收。

## 驗收條件
- [ ] study English、watch TV、surf the Internet 在編輯頁與學生頁照輸入大小寫顯示。
- [ ] surf 的 ur、Internet 的 er 點完整組後綠底紅字＋括線＋標籤；只點一個字母時只有綠色。
- [ ] 老師可把 make 的 a、e 連成一組，學生點完後顯示 a_e。
- [ ] 計分、完成判定與既有測試不變；新增測試通過。

## 實作結果（2026-11-18；同日教師授權後已部署 liveV2 `livev2-00025-rik`、Hosting `f02c74c0d84956f0`，見 `rdq/DEPLOYMENT-vowel-case-combo-20261118.md`）
- 字母方塊改照輸入大小寫顯示（`live.css` 拿掉強制小寫）；只改大小寫（english → English）時保留已標記的字母。
- `domain.mjs` 新增 `vowelCombos`／`vowelComboLabel`：相鄰標記字母自動成組；`vowelWords[].links` 存老師連的 a_e 組合（驗證：同一單字、已標記、至少 2 個）。學生端看不到 `links`，進度只回傳「整組已點完」的組合（`vowelProgress.combos`）。
- 編輯頁：組合即時顯示，「a_e／i_e 連成一組」→ 點字母 →「完成連結」，可按標籤 ✕ 取消。
- 另修：片語只在單字之間換行（不再出現 th|e、Inter|net）；單字比卡片還寬時才在字內換行。
- 驗證（Temp 副本）：Node 330/330（新增 4 項）、Functions 10/10、建置通過；本機編輯頁與學生預覽實測（1366、1920 寬）截圖於 `qa/vowel-case-combo-20261118/screenshots/`。點一個字母只綠、整組點完才綠底紅字。
- 部署需 Hosting＋liveV2（後端共用 `functions/generated/live-domain.mjs` 已同步）。分配作答頁的母音題（另一個介面）沒有加組合顏色。
