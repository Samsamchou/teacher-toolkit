---
rdq_version: 1
edition: chatgpt-app
task: 擴充 Lesson Hub 的學生測驗與課程架構
domain: dev
date: 2026-08-17
status: draft
telemetry:
  mode: full
  rounds: 2
  questions: 5
  q4_adopted: 5
  revisions: 0
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：Lesson Hub 學生測驗與課程架構

## 一句話任務
將 English Lesson Hub 擴充為 10 個 Unit、每 Unit 5 節可調整課程，並提供 iPad QR 測驗入口、Comic Relief 題目字型、多巴胺色彩與優化拉霸音效。

## 已確認
- **HWG5** 與 **HWG7** 均採 **Starter、Unit 1–4**，共 10 個 Unit；每個 Unit 建立 **Lesson 1–5** 五節可編輯課。
- 現有 HWG7 Unit 1 的內容遷移到 **HWG7／Unit 1／Lesson 1**；其餘課程先使用既有五流程的可編輯範本。
- **HWG7 是 Grade 6**；Student ID 範例更新為 **60101**。
- 教師切換學生模式時顯示目前 Lesson 的 QR；學生掃碼後直接進該 Lesson 的 Vocabulary Quiz。
- QR 支援同 Wi-Fi LAN 與未來 Firebase 網址設定，只含 book／unit／lesson，不含 Student ID、權限或登入資料。
- Quiz 英文字體使用本機載入的 **Comic Relief**；學生端仍不顯示教師電子書。
- 全站採中央多巴胺色票，10 個 Unit 各有固定主色與足夠文字對比。
- 拉霸採按鍵提示、漸快轉輪、停輪／得獎三段式音效，並保留靜音與 iPad Safari 點按啟動相容性。
- 本機已儲存的 Lesson／結果資料需安全遷移，不遺失既有內容。

## 待確認假設
- **HWG5** 維持 Grade 5；50 節課先不補寫各自不同的教材內容。
- Firebase 僅預留正式網址設定，本次不部署、不寫入正式 Firestore。

## 已採納建議
- 安全資料遷移、隱私最小化 QR、本機 Comic Relief、可辨識的 Unit 色彩、三段式 Web Audio 拉霸音效。

## 本次不納入
- Firebase 正式部署與安全規則實測、49 節新教材內容、學生端電子書、保存帳密或 QR 中的個資。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG** 的 English Lesson Hub V03 中，將書籍層級改為 HWG5 與 HWG7 各含 Starter、Unit 1–4 的 10 個 Unit，每個 Unit 有 Lesson 1–5 與既有五流程可供教師調整；安全遷移目前 HWG7 Unit 1 的 Lesson 1 資料。HWG7 標示為 Grade 6，學生模式在教師投影畫面產生目前 Lesson 的 QR，學生 iPad 掃碼後只進入該課 Vocabulary Quiz，QR 依設定使用 LAN 或未來 Firebase URL 且不含個資。Quiz 英文以本機 Comic Relief 顯示；全站採 Unit 固定多巴胺色票與可讀對比；拉霸加入可靜音的三段式 Web Audio，並維持學生端無電子書、教師端電子書新分頁、本機預覽與未部署 Firebase 的既有限制。

## 驗收條件
- [ ] 顯示 10 個 Unit × 5 Lessons；既有 U01 Lesson 1 與本機資料都已遷移且可編輯。
- [ ] QR 導向正確 Lesson Quiz，LAN／正式網址可設定，且 QR 不含 Student ID 或權限資料。
- [ ] iPad Quiz 使用 Comic Relief；各 Unit 畫面顏色固定且具文字對比，學生端沒有電子書。
- [ ] 拉霸有三段式音效與靜音鍵；資料、介面及遷移測試全部通過。
