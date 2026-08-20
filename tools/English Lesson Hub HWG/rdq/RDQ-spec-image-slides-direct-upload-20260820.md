---
rdq_version: 1
edition: chatgpt-app
task: Image Slides 直接圖片上傳
domain: dev
date: 2026-08-20
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：Image Slides 直接圖片上傳

## 一句話任務
取消 Image Slides 專用解鎖，讓教師選取圖片後以 Firebase Anonymous Auth 直接上傳。

## 已確認
- 採用 1A：PNG／JPG／WebP 選檔後直接上傳，不要求通行碼、解鎖連結或短期 Claim。
- 採用 2B：從 Lesson 移除或替換圖片時，只解除教材引用，不從 Firebase Storage 刪除原檔。
- 採用 3A：完整移除前端解鎖介面、解鎖 Functions、Firestore 解鎖規則及 Storage Claim 檢查，測試後正式部署。
- 保留 Anonymous Auth、固定 Storage 路徑、單張 20 MB、隨機檔名、禁止列出及跨裝置讀取。
- Results 教師通行碼、Teacher Studio 雲端 Lesson、匿名作答與成績資料流程維持不變。
- 採納建議 ①②③④⑤。

## 待確認假設
- 本次只修改 Image Slides；MP4／PDF 既有直接上傳流程不變。
- 學生模式不顯示圖片上傳與移除介面，但直接匿名寫入規則無法把技術性 API 呼叫辨識成教師。

## 已採納建議
- 上傳仍須有效 Firebase Anonymous Auth。
- Storage 禁止列出物件，只允許讀取已知圖片路徑。
- 圖片使用隨機檔名，避免覆寫及快取舊檔。
- 驗證上傳、Save Lesson、跨裝置讀取與學生模式介面。
- 正式部署後以一次性測試圖片進行線上驗收。

## 本次不納入
- Image Slides 教師專用登入、一次性解鎖、短期 Claim 或 App Check 強制。
- 從瀏覽器刪除雲端圖片、清理既有未引用圖片或修改匿名成績資料。

## 一段式需求規格
在 Firebase 專案 **hwg7teaching** 的正式網站 **lesson-hub-v03**，將 Image Slides 改為以 Firebase Anonymous Auth 直接上傳本機 **PNG／JPG／WebP**，單張上限 **20 MB**，使用固定教材路徑與隨機檔名，禁止 Storage 列出及刪除；教師從 Lesson 移除或替換圖片時只更新 Lesson 引用，不刪除雲端原檔。完整移除一次性解鎖前端、解鎖 Functions、Firestore 解鎖規則與短期 Claim 檢查，保留 Results、Teacher Studio 雲端 Lesson、MP4／PDF 與匿名成績流程。完成自動測試、正式建置及安全規則測試後，部署 Firebase Hosting、Functions、Firestore 與 Storage 規則，並驗證正式站可直接上傳及跨裝置讀取。

## 驗收條件
- [ ] Image Slides 沒有解鎖提示；按「加入圖片」即可直接上傳。
- [ ] Storage 僅接受已匿名登入的合規圖片，拒絕列出、刪除、錯誤 MIME 與超過 20 MB。
- [ ] 移除或替換圖片只更新 Lesson 引用，Save Lesson 後另一裝置可讀取保留圖片。
- [ ] 舊解鎖 Functions 已從正式 Firebase 移除，Results 與匿名成績流程不受影響。
