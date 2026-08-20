---
rdq_version: 1
edition: chatgpt-app
task: Image Slides 雲端上傳與映像清理
domain: dev
date: 2026-08-20
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：Image Slides 圖片上傳與 Firebase 清理

## 一句話任務
讓 Image Slides 圖片跨裝置同步顯示，並設定 Functions 映像保留 7 天。

## 已確認
- Image Slides 改為教師直接選取本機圖片並上傳 Firebase Storage；Lesson 保存雲端資產路徑。
- 上傳後教師與學生都能觀看圖片，但學生端不能上傳、刪除或修改教材。
- 既有本機路徑圖片第一次使用時逐張重新選取，依原本投影片順序匯入。
- 原始 PNG 保留；圖片完整置中、維持比例，不裁切、不拉伸，小圖不強制放大。
- 上傳要有進度、失敗重試、格式／大小檢查；保存 Firebase Storage 路徑，不依賴短期網址。
- 既有 Teacher Studio 雲端 Lesson 同步與 **HWG7 Unit 1 Lesson 1 的 14 Steps** 必須保留。
- Firebase Functions Artifact Registry 舊容器映像設定自動清理，保留 **7 天**。

## 待確認假設
- 圖片上傳沿用既有教師通行碼工作階段，不新增 Google 登入或複雜 IAM → 預設採用。
- 圖片資產使用學生可讀、教師可寫的最小權限規則；不開放學生寫入 → 預設採用。

## 已採納建議
- 保留原始 PNG，另以顯示尺寸限制避免過大檔案。
- 提供進度、重試與錯誤訊息。
- 以穩定 Storage 路徑保存資產。
- 破圖時提供「重新選取圖片」按鈕。
- 保留原有投影片順序。

## 本次不納入
- Base64 圖片直接存 Firestore。
- 只限本機瀏覽器的 Object URL 圖片。
- Google 登入、額外 IAM、學生端上傳或刪除。
- 修改或刪除匿名作答成績。

## 一段式需求規格
在 Firebase 專案 **hwg7teaching** 的正式網站 **lesson-hub-v03**，將 Image Slides 編輯器由本機路徑文字改為本機檔案選取與 Firebase Storage 上傳；教師完成既有通行碼驗證後可上傳圖片，Lesson 保存穩定 Storage 資產路徑，教師與學生可讀取但學生不可寫入。第一次匯入既有路徑圖片時逐張重新選取並維持原投影片順序；保留原始 PNG，提供格式／大小檢查、上傳進度、失敗重試與破圖重新選取。圖片在所有瀏覽器完整置中且不裁切、不拉伸，小圖不放大。Firebase Functions Artifact Registry 設定舊容器映像保留 **7 天**後自動清理；不得修改匿名成績、Google 登入、既有教師通行碼或其他未授權服務。

## 驗收條件
- [ ] 選取並上傳圖片後，Teacher Studio 與 Lesson Flow 可正常顯示。
- [ ] 一般 Chrome、無痕視窗與另一台筆電可讀取同一雲端圖片與 **14 Steps**。
- [ ] 學生可觀看但不能上傳、刪除或修改 Image Slides。
- [ ] Functions 映像清理政策為 7 天，網站、Functions 與規則測試通過。
