---
rdq_version: 1
edition: chatgpt-app
task: 修正投影片與雲端課程同步
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

# RDQ 需求規格：Image Slides 與雲端 Lesson 同步

## 一句話任務
修正圖片投影片裁切，並讓 Teacher Studio 的全部課程跨裝置安全同步。

## 已確認
- Image Slides 的直式、橫式與小尺寸圖片均須完整置中、維持原始比例、不裁切、不拉伸；小圖不強制放大。
- Teacher Studio 的 **46 節預設 Lesson** 與所有 **Custom Lessons** 均使用 Firebase 雲端共用設定。
- 首次啟用時，完整匯入目前一般 Chrome 的本機 Lesson 設定，保留 **HWG7 Unit 1 Lesson 1 的 14 Steps**。
- 同一 Lesson 被另一台裝置更新後，舊畫面儲存時必須要求重新載入，不能靜默覆蓋。
- 讀寫雲端教材須通過既有六位數教師通行碼；不新增 Google 登入或複雜 IAM，學生端不能讀寫教材設定。

## 待確認假設
- 教師通行碼的教材讀寫工作階段採目前瀏覽器記憶體模式；重整、關閉或換筆電後需再次輸入通行碼 → 預設採用。
- 雲端教材保留最後一次成功版本與本機離線副本，不建立可瀏覽的歷史版本清單 → 預設採用。

## 已採納建議
- 僅在通行碼成功驗證後讀寫教材；瀏覽器不直接取得資料庫寫入權。
- Firebase 實際成功後才顯示「已儲存至雲端」；斷線或失敗時明確提示。
- 保留 Local Storage 作離線備援，Firebase 為跨裝置唯一來源。
- Image Slides 依實際圖片尺寸計算完整比例舞台，移除裁切高度規則。
- 部署前驗證一般 Chrome、無痕視窗與第二個瀏覽器皆顯示相同 Lesson Steps。

## 本次不納入
- Google 教師登入、Teacher Claim、額外 IAM 角色或學生端教材編輯。
- 可瀏覽並手動回復的多版本歷史紀錄。
- Image Slides 圖片檔直接上傳功能。

## 一段式需求規格
在 Firebase 專案 **hwg7teaching** 的正式網站 **lesson-hub-v03** 修正 Image Slides 舞台：依圖片原始長寬完整置中顯示直式、橫式與小尺寸圖片，不裁切、不拉伸，小圖不強制放大，並移除衝突的零高度與隱藏裁切規則。新增 Teacher Studio 雲端 Lesson 設定：以現有伺服器端六位數教師通行碼建立短期教師工作階段，透過受控後端讀寫全站 46 節預設 Lesson 及所有 Custom Lessons；首次將目前 Chrome 本機資料完整匯入 Firebase，保留 **HWG7 Unit 1 Lesson 1** 的 **14 Steps**。雲端資料採修訂版本檢查，舊裝置儲存時必須要求重新載入，避免覆蓋別台筆電的新版本；只有 Firebase 成功後才顯示雲端保存成功，保留 Local Storage 作離線備援。學生端維持匿名作答，不能讀寫教材設定；不使用 Google 登入、Teacher Claim 或額外 IAM。完成後以一般 Chrome、無痕視窗與第二個瀏覽器驗證同一 Lesson 的 Steps 一致，再依教師確認部署 Firebase Hosting、Functions 與必要 Firestore 規則。

## 驗收條件
- [ ] 直式、橫式、小尺寸圖片在一般與投影 Lesson Flow 均完整可見且保持比例。
- [ ] 一般 Chrome 儲存的 14 Steps，無痕視窗與另一瀏覽器重新開啟後均讀到 14 Steps。
- [ ] 舊畫面嘗試覆蓋另一裝置的新版本時，被要求重新載入，資料不遺失。
- [ ] 未通過教師通行碼與學生端均無法讀取或寫入教材設定。
