---
rdq_version: 1
edition: claude-code
task: 拖放／下拉題正解與干擾可只差大小寫（Street／street）
domain: dev
date: 2026-11-24
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 2
  q4_adopted: 3
  revisions: 0
downstream: self
---

# RDQ 需求規格：拖放／下拉題區分大小寫

## 一句話任務
拖放題與下拉選單題的正解、干擾答案可以只差大小寫（Street／street）；課程可通過檢查開始 Teacher-led，學生必須選到大小寫完全一樣的卡才算對；打字填空題維持不分大小寫。

## 已確認
- 原因：`src/live/parity.mjs` 的 `norm()` 會轉小寫，建課檢查（第 79 行）與判分（第 159 行）都把 Street 當成 street。
- 1A：打字填空題（blank）維持不分大小寫。
- 2A：拖放（drag）與下拉選單（dropdown）一起改成區分大小寫，檢查與判分一致。
- 建議①：完全相同的字（Street／Street）仍擋住。
- 建議②：學生選到「只差大小寫」的錯卡時，題目結束後的回饋顯示「注意大小寫」（課堂與分配作答頁）。
- 建議③：編輯頁在只差大小寫的干擾答案旁顯示小提示「只差大小寫」。

## 待確認假設
- 同一題兩個空格正解只差大小寫（Bike／bike）時，以前拖錯大小寫也算對，改後算錯；目前未見此類題目。
- 首尾空白、全形半形與連續空白仍視為相同（只放寬大小寫）。
- 「注意大小寫」只在題目結束後出現，不在還能再試時提前提示答案。
- 完成後先本機驗收；部署需 Hosting＋liveV2，另行授權。

## 本次不納入
- 其他題型（多項選擇、句子重組、拼字）的大小寫規則不變。

## 驗收條件
- [ ] 正解 Street、干擾 street 的拖放題可存檔並開始 Teacher-led；Street／Street 仍被擋。
- [ ] 拖放、下拉選 street 判錯，選 Street 判對；打字填空打 street 仍判對。
- [ ] 選到只差大小寫的錯卡時，題目結束後回饋出現「注意大小寫」。
- [ ] 編輯頁該干擾答案旁出現「只差大小寫」提示。
- [ ] 新增測試通過、既有測試不變（Temp 副本跑完整測試）。

## 實作結果（2026-11-24；同日教師授權後已部署 liveV2 `livev2-00027-nux`、Hosting `0da483dc7c8e9fae`，見 `rdq/DEPLOYMENT-drag-case-20261124.md`）
- `parity.mjs`：拖放／下拉比對保留大小寫（仍忽略首尾空白、全形半形、連續空白）；打字填空維持不分大小寫。判分 details 加 `caseOnly`。
- 分配作答頁：題目結束後回饋框顯示「🔠 注意大小寫」；還能再試時不顯示。
- 編輯頁：干擾答案下方顯示「🔠 只差大小寫：street（刻意設計…）」。
- 差異：課堂 Teacher-led 拖放題採全對才過（mastery），沒有「答錯而結束」的狀態，所以「注意大小寫」只在分配作答頁出現。
- 驗證（Temp 副本）：Node 335/335（新增 `tests/drag-case.test.mjs` 4 項）、Functions 10/10；本機實測 Street／street 題可開始 Teacher-led、測驗分配選 street 判 0 分並顯示提示。截圖 `qa/drag-case-20261124/screenshots/`。
