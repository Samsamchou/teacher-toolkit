---
rdq_version: 1
task: 用 11/02 學生筆跡優化字母辨識
domain: dev
date: 2026-11-02
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：11/02 筆跡資料集與辨識優化

## 已確認
- 資料來源：Firestore letterPracticeAttempts／Sessions，日期 2026-11-02（14 位學生、7 台 iPad）
- 預覽網址的作答本來就在正式資料庫，不需搬移
- 1C：匯出＋找判錯原因＋調整程式規則＋必要時調整 AI 提示詞或模型，用 dryRun 重測
- 2A：我先逐張看圖初步標記，老師只看「有疑問」的
- 3B：AI 重測費用上限 US$5
- 採納建議：①先免費統計 ②比對 4 台卡住的 iPad ③存成固定回歸測試集 ④優先處理 r、h、g、N 四種已知誤判
- 筆跡只放本機暫存／G 槽，不入公開 repo；只用學號

## 待確認假設
- 用 gcloud（u9431818）唯讀讀 Firestore，不需教師密碼
- 699xx 測試學號排除
- 重測一律 dryRun，不寫入資料庫；改動上正式站前再問老師

## 驗收條件
- [ ] 當天筆數、判對／判錯數、各字母判錯排行
- [ ] 每筆判錯附原因分類（AI 認錯／格線太嚴／學生真的寫錯）
- [ ] 調整後重測：寫錯的仍全判錯，寫對的判對率不下降
- [ ] 實際 AI 花費 ≤ US$5
