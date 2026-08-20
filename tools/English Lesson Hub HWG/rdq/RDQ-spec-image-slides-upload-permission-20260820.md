---
rdq_version: 1
edition: chatgpt-app
task: 修正 Image Slides 圖片上傳權限
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

# RDQ 需求規格：Image Slides 上傳權限修正

## 一句話任務
讓教師在不輸入通行碼的 Image Slides 介面直接選取圖片上傳，同時維持學生不可寫入。

## 已確認
- 發生環境：一般 Chrome 的 Teacher Studio，尚未先進入 Results 輸入教師通行碼。
- Image Slides 要直接選取本機圖片，不在圖片上傳介面要求再次輸入通行碼。
- 圖片上傳後要保存穩定 Firebase Storage 路徑，並能跨一般 Chrome、無痕視窗與另一台筆電讀取。
- 學生只能讀取圖片，不能上傳、刪除或修改教材；不放寬成匿名使用者可寫入 Storage。
- 保留原始圖片、投影片順序、完整比例、不裁切、不拉伸與小圖不強制放大。
- 錯誤訊息要區分未授權、授權過期、規則拒絕與網路失敗；不可顯示原始 Storage 路徑。
- 採納建議 ①②③④⑤：清楚錯誤、匿名 Auth token 更新與一次重試、教師寫入／學生只讀、跨裝置測試、一次性教師專用解鎖連結。

## 待確認假設
- 以一次性教師專用解鎖連結建立短期媒體授權；Image Slides 不顯示通行碼欄位。若沒有有效解鎖連結，介面顯示可操作的教師解鎖提示，而不是放開匿名寫入。
- 本次先完成程式、測試與正式站驗收，並且再次部署至正式 Firebase Hosting、Functions 與 Firestore 規則。

## 已採納建議
- 將授權失敗、授權過期、Storage 規則拒絕與網路錯誤分開提示。
- 上傳前更新匿名 Auth token，失敗時自動重試一次。
- 維持教師可寫、學生只讀的 Storage 規則。
- 在一般 Chrome、無痕視窗與另一台筆電驗證雲端圖片讀取。
- 使用一次性教師專用解鎖連結，避免 Image Slides 內重複輸入通行碼。

## 本次不納入
- Google 登入、複雜 IAM、學生端上傳或刪除。
- 直接開放匿名使用者寫入或列出 Storage。
- Base64 圖片寫入 Firestore、修改匿名成績或改變既有 Results 流程。
- 以瀏覽器本機路徑或只在單一分頁有效的 Object URL 作為跨裝置教材。

## 一段式需求規格
在 Firebase 專案 **hwg7teaching** 的正式網站 **lesson-hub-v03**，修正 Teacher Studio 的 Image Slides 圖片上傳授權流程：教師在 Image Slides 介面不輸入通行碼即可按「加入圖片」並選取本機 PNG／JPG／WebP，系統透過一次性教師專用解鎖連結建立短期媒體授權，更新匿名 Auth token 並在必要時自動重試一次；若授權不存在、過期、Storage 規則拒絕或網路失敗，顯示可區分且可採取行動的中文提示，不顯示原始 Storage 路徑。圖片以穩定 Storage 路徑保存，教師可寫入，學生只能讀取，並保留原始檔、投影片順序、完整比例與跨裝置讀取能力。完成後在一般 Chrome、無痕視窗與另一台筆電驗證上傳後的圖片可讀取，並驗證學生不能上傳、刪除或修改教材；本次先完成程式與測試，驗收通過後再次部署至正式 Firebase Hosting、Functions 與 Firestore 規則。

## 驗收條件
- [ ] 一般 Chrome 未先進入 Results 時，啟用一次性教師解鎖後，可直接選取圖片並看到上傳進度與成功狀態。
- [ ] 授權過期或規則拒絕時，不再只顯示模糊紅字；更新 token 與一次重試後仍失敗時，提示下一步。
- [ ] 按 Save Lesson 後，一般 Chrome、無痕視窗與另一台筆電都能讀取同一張雲端圖片，圖片不裁切、不拉伸。
- [ ] 學生端可讀取圖片，但不能上傳、刪除、修改或列出教師教材；測試不修改匿名成績。
