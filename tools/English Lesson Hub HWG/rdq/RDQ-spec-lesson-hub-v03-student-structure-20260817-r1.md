---
rdq_version: 1
edition: chatgpt-app
task: 部署 Lesson Hub 的學生測驗與課程架構
domain: dev
date: 2026-08-17
status: confirmed
telemetry:
  mode: full
  rounds: 2
  questions: 5
  q4_adopted: 5
  revisions: 1
downstream: elementary-vocabulary-site-builder
supersedes: RDQ-spec-lesson-hub-v03-student-structure-20260817.md
---

# RDQ 需求規格：Lesson Hub 學生測驗、課程架構與 Firebase 部署

## 確認紀錄
- 教師於 2026-08-17 確認「照這份開始」，授權依本規格建置、部署至 Firebase 專案 **hwg7teaching**，但不覆寫既有 default Hosting site。

## 一句話任務
將 English Lesson Hub 擴充為 10 個 Unit、每 Unit 5 節可調整課程，提供 iPad QR 測驗入口、Comic Relief、多巴胺色彩與拉霸音效，並安全部署到 Firebase。

## 已確認
- **HWG5** 與 **HWG7** 均採 **Starter、Unit 1–4**，共 10 個 Unit；每個 Unit 建立 **Lesson 1–5**。
- 既有 HWG7 Unit 1 內容遷移到 **HWG7／Unit 1／Lesson 1**；其他課程先用可編輯五流程範本。
- **HWG7 是 Grade 6**，Student ID 範例更新為 **60101**。
- 教師學生模式顯示目前 Lesson 的 QR；學生掃碼後只進該課 Vocabulary Quiz。
- QR 支援同 Wi-Fi LAN 與 Firebase 正式網址，只含 book／unit／lesson，不含 Student ID、權限或登入資料。
- Quiz 英文使用本機 **Comic Relief**；全站用 Unit 固定多巴胺色票；學生端不顯示教師電子書。
- 拉霸使用可靜音的按鍵提示、漸快轉輪、停輪／得獎三段式 Web Audio，支援 iPad Safari 點按啟動。
- Firebase 正式使用 **hwg7teaching**：學生採 Anonymous Auth；教師採 Google Sign-in 與 teacher custom claim。
- Firestore 只保存匿名 Student ID 與測驗資料；首次答案計分、可重試、冪等 sessionId、匯出 JSON／CSV 成功後才可刪除。

## 待確認假設
- **HWG5** 維持 Grade 5；49 節新課先不補寫各自不同的教材內容。
- 在 **hwg7teaching** 建立新的 Firebase Hosting site **lesson-hub-v03**，不覆寫任何既有 default Hosting site。
- 教師須親自完成 Firebase／Google 登入；部署後只為該已驗證帳號建立初始 teacher claim，不保存任何帳密。
- 實體 iPad Safari 最後點按測試由教師完成；我會提供可驗證的測試步驟與桌面／模擬觸控證據。

## 已採納建議
- 安全資料遷移、隱私最小化 QR、本機 Comic Relief、可辨識 Unit 色彩、三段式 Web Audio 拉霸音效。
- 部署前安全規則、匿名登入、教師權限、跨學生讀取拒絕、匯出／刪除與 Hosting 正式網址檢查。

## 本次不納入
- 49 節新課的不同教材內容、學生端電子書、保存帳密或 QR 個資、未驗證的第三方服務。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG** 中，將 English Lesson Hub V03 改為 HWG5 與 HWG7 各含 Starter、Unit 1–4 的 10 個 Unit，每 Unit 建立 Lesson 1–5 與可編輯五流程，安全遷移既有 HWG7 Unit 1 Lesson 1。HWG7 顯示 Grade 6；教師學生模式產生目前 Lesson 的隱私最小化 QR，學生 iPad 只進該課 Vocabulary Quiz，依設定支援 LAN 與 Firebase Hosting 網址。Quiz 英文以本機 Comic Relief 顯示，全站採固定 Unit 多巴胺色票，拉霸提供可靜音三段式 Web Audio。建立 Firebase 專案 **hwg7teaching** 的新 Hosting site **lesson-hub-v03**、Anonymous Auth、Google teacher claim、Firestore 規則、匿名成績資料、JSON／CSV 匯出及成功匯出後刪除流程；通過安全、遷移、正式網址與可用性測試後部署。

## 驗收條件
- [ ] 顯示 10 個 Unit × 5 Lessons；既有 U01 Lesson 1 與本機資料安全遷移且可編輯。
- [ ] QR 導向正確 Quiz，LAN／正式網址可設定，且 QR 與 Firestore 均不含學生姓名或權限資料。
- [ ] iPad Quiz 使用 Comic Relief；每 Unit 固定多巴胺色彩且具可讀對比；學生端沒有電子書。
- [ ] Firebase Anonymous Auth、教師 claim、Firestore 規則、跨學生拒讀、JSON／CSV 匯出與成功後刪除皆通過測試。
- [ ] 指定 Hosting site 正式網址可開啟；拉霸三段式音效與靜音功能通過桌面及 iPad 測試。
