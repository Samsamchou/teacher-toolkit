---
rdq_version: 1
edition: chatgpt-app
task: 啟用正式站匿名作答與 Results Firestore 流程
domain: dev
date: 2026-08-18
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 2
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：正式站 Anonymous Auth 與 Results

## 確認紀錄
- 使用者於 **2026-08-18** 回覆「照這份開始」，確認 `1A／2A／3A` 與建議 ①②③④⑤；可依本規格執行與部署。
- 實作時依全域安全規則改用 Firebase Hosting 官方 `/__/firebase/init.json`，達成相同公開組態目的且不在專案保存 API key。

## 一句話任務
讓 **lesson-hub-v03.web.app** 正式使用 Firebase Anonymous Auth、Firestore 作答保存及通行碼保護的教師 Results／匯出／刪除流程。

## 已確認
- 沿用 Firebase 專案 **hwg7teaching**、Hosting **lesson-hub-v03** 與唯一既有 Web App **lesson-hub-v03-web**，不建立新 App。
- 由 Firebase Hosting 同網域 `/__/firebase/init.json` 取得公開 Web App 組態，並核對專案 ID；不在專案、Git 或終端輸出保存 API key，也不讀取、變更或保存教師通行碼與 Secret。
- 學生使用 Anonymous Auth；Firestore 只保存匿名 Student ID 與作答資料，不保存姓名。
- 先驗證現有 5 個 Results Functions 與 Firestore 規則；若版本正確則只重建／部署 Hosting，只有測試失敗且差異明確時才重部署對應後端資源。
- 允許建立一筆專用匿名測試結果，驗證 Results、CSV／JSON 匯出後，只精確刪除該測試結果；不得刪除其他既有資料。
- App Check 本次不強制，正式紀錄中保留此風險；不宣稱已啟用或強制。
- 教師在真人驗收時親自輸入通行碼；Agent 不詢問、不顯示、不重用或保存通行碼。

## 待確認假設
- 專用測試 Student ID 使用 **69930**，搭配唯一 Session ID，避免與實際班級資料混淆。
- 錯誤通行碼只驗證一次拒絕；5 次／15 分鐘鎖定以自動測試驗證，不在教師正式分頁刻意觸發。
- Firebase CLI 目前登入者具有讀取 Web App 公開組態、部署指定資源與執行測試所需權限。

## 已採納建議
- 自動取得 Hosting 執行期公開 SDK 組態並拒絕錯誤專案；執行前端、Functions、規則、建置及安全閘門。
- 測試資料使用唯一 Session，匯出後僅刪除該筆；保留可回復的 Hosting 發布版本與資產紀錄。
- 真人驗證 Anonymous 作答、跨學生拒讀、通行碼登入、重新整理失效、CSV／JSON 匯出與精確刪除。

## 本次不納入
- 新建 Firebase App、修改 Secret／通行碼、Google 教師登入、Teacher Claim、自訂權杖或額外 IAM。
- 強制 App Check、刪除或改寫正式學生資料、改動題庫與 Lesson 介面。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG\preview** 沿用 **hwg7teaching／lesson-hub-v03-web**，由 Firebase Hosting 同網域 `/__/firebase/init.json` 載入並核對公開 Web App 組態，讓正式站以 Anonymous Auth 將匿名 Student ID 與作答寫入 `practiceResults`，並透過既有 5 個通行碼 Results Functions 完成教師查看、CSV／JSON 匯出及匯出後刪除。先比對並測試現有 Functions 與 Firestore 規則，正確時僅部署 Hosting；只有明確差異或測試失敗時才重部署對應後端。使用 **69930** 與唯一 Session 建立一筆測試結果，教師親自輸入通行碼完成真人驗收，最後只刪除該筆測試資料；App Check 維持未強制並記錄風險。

## 驗收條件
- [ ] 正式站顯示 Firebase 已連線；iPad Safari 匿名作答後，測試結果實際寫入 Firestore。
- [ ] 另一匿名使用者不能列出或讀取該結果；瀏覽器不能直接讀取全班 Results。
- [ ] 教師親自輸入通行碼後可查看測試結果，重新整理後需重新登入；錯誤通行碼會被拒絕。
- [ ] CSV 與 JSON 均成功匯出，且只刪除唯一測試結果，其他既有 Results 數量與文件不變。
- [ ] 自動測試、規則測試、Functions 測試、正式建置、安全閘門與公開 HTTP／資產驗證通過。
- [ ] `config/firebase-preflight.json` 只依實際證據更新；App Check 保持 `false` 並明確標示未強制。
