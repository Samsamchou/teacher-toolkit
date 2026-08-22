---
rdq_version: 1
edition: chatgpt-app
task: 完成多單元口說彈珠站與安全部署
domain: dev
date: 2026-08-22
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 1
downstream: english-practice-pinball-builder
---

# RDQ 需求規格：HWG Sentence Review 多單元網站

## 一句話任務
將現有 HWG7 口說彈珠本機版改為可擴充四單元、安全教師後台及跨裝置輪替，經驗證與獨立授權後部署至指定 Firebase。

## 已確認
- 首頁依序顯示 **HWG7 SR／HWG5 SR／HWG8 SR／HWG6 SR**；本次題庫屬 **HWG7 SR**，其他單元可日後新增。
- 第 5 題固定為 **They’re his caps.**；既有 13 題、80 分門檻、三次有效作答及短答／完整答滿分規則不變。
- A／B 依首頁第一、第二個輸入的學生代碼決定；同一組學生、同一單元、同一臺北日期，首局 A 做題型一、B 做題型二，只有完整結束的遊戲才跨裝置交換下一局題型。
- 未完成單元停用並顯示「題庫準備中」；單元卡與題庫均由資料設定產生。
- 右上角顯示「教師後台」及 6 碼輸入框；通行碼不使用 Firebase Secret Manager，也不得寫入前端，而由後端驗證受限 Firestore 中的加鹽慢速雜湊，成功後核發短效教師權限。
- 後台含單元／班級／學生／題目篩選、最佳分數、每次作答、逐字稿、30 天內錄音播放、CSV 成績匯出及軟刪除。
- 圖片採不洩漏答案的中性中文替代文字；難字、流暢度及語調納入分項與建議，但自然輕化不自動判錯。
- Firebase 目標確定沿用 **setencerevieworalpractice**（接受 `setence` 拼法）、Web App **0822**（App ID：**1:688324983383:web:3fd6d0221c54526558c112**）、預設 Hosting **https://setencerevieworalpractice.web.app**。

## 待確認假設
- 教師登入閒置 30 分鐘失效；連錯 5 次鎖定 15 分鐘；實際通行碼由教師在一次性本機設定流程親自輸入，只把雜湊寫入 Admin-only Firestore，不寫入本卡、前端、Git、日誌或一般可讀文件。
- 已在對話中揭露的通行碼不重複使用於正式環境，正式設定時改用新的 6 碼通行碼。
- `照這份開始`只授權實作與安全驗證；正式部署另需教師明確回覆 **確認部署 setencerevieworalpractice**。

## 已採納建議
- 停用未完成單元、建立資料驅動單元登錄、後端雜湊驗證與登入限速、Firestore transaction 輪替、App Check／精確 CORS／用量警示／5 人試測全部納入。

## 本次不納入
- HWG5／HWG6／HWG8 的實際題庫內容、自訂網域、學生 PIN／Google 登入、將單一音素或口音差異直接判為不及格。

## 一段式需求規格
在現有專案建立資料驅動的四單元首頁，僅啟用 **HWG7 SR**；以兩個五碼學生代碼及臺北日期在 Firestore transaction 保存每局題型交換狀態，只有完整結束的遊戲才翻轉。保留 HWG7 既有評分規則並確認 **his**，補齊中性中文圖片替代文字與容許自然語流的發音回饋。右上角教師後台維持 6 碼輸入體驗，但由 Cloud Function 驗證 Admin-only Firestore 中的加鹽慢速雜湊並核發短效教師權限，提供完整查詢、錄音、匯出及軟刪除功能。完成 Emulator、安全、跨裝置、併發及 5 人試測後，再經獨立部署確認發布至 **setencerevieworalpractice**。

## 驗收條件
- [ ] 四張單元卡順序正確；只有 HWG7 可開始，日後新增題庫無須重寫首頁。
- [ ] 同組學生同日跨裝置完成兩局後，A／B 題型確實互換，未完成局不翻轉且無競態重複。
- [ ] 教師通行碼不出現在前端、Git、日誌或一般 Firestore 讀取；雜湊、限速、逾時、直接 API 繞過、後台權限、CSV、錄音與軟刪除均通過測試。
- [ ] 13 題內容、圖片替代文字、發音回饋、評分與 Firebase 安全閘門通過；未收到部署確認前線上站不變。
