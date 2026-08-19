---
rdq_version: 1
edition: chatgpt-app
task: 教師媒體直接上傳與正式驗證
domain: dev
date: 2026-08-19
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：教師媒體直接上傳

## 一句話任務

取消教師媒體上傳通行碼，以指定 MP4 實測後部署正式站。

## 已確認

- Teacher Studio 所有 Lesson 的 MP4 與 PDF 均直接顯示「選擇檔案」，不需輸入通行碼。
- 接受任何能開啟 Teacher Studio 的匿名訪客可上傳受限制的教材檔案。
- 測試檔為 **C:\firebase-deploy\shortsaboutsentences\outputs\HWG7 U01 Clips\08_final\final_classroom_64s_APPROVED.mp4**，放入 **HWG7 Unit 1 Lesson 1／Teaching Video**，並保留為正式教材。
- 保留 MP4／PDF、500 MB、固定 lesson/mediaType 路徑與 Storage 禁止列出檔案的限制。
- 實測必須讀回上傳後的檔案大小，儲存 Lesson 後驗證 Lesson Flow 可播放；測試通過後才正式部署。
- 保存目前 Storage 規則與網站版本的可回復點，且不保留未連結的測試檔案。

## 待確認假設

- PDF 的直接上傳會與 MP4 使用相同規則與介面。
- 不新增 Google 登入、通行碼、IAM 或額外後端 Function。

## 已採納建議

- 保留格式、大小、固定路徑與禁止列出檔案限制。
- 實測上傳後讀回大小並驗證 Lesson Flow 播放。
- 保留部署前的回復點。
- 不留未連結的測試檔案。

## 本次不納入

- 每次上傳或每次開啟 Teacher Studio 的通行碼。
- Google 教師登入、IP 白名單、檔案列表與任意 Storage 路徑。
- 圖片、音檔或其他媒體格式的直接上傳。

## 一段式需求規格

在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG\preview** 移除 Teacher Studio MP4／PDF 上傳面板的教師通行碼、媒體授權確認與重新驗證流程；所有既有與未來 Lesson 均立即顯示檔案選擇器。調整 Firebase Storage 規則，允許 Anonymous Auth 使用者僅在既有 lessonId 與 video／presentation 固定路徑建立、更新或刪除 **MP4／PDF**，單檔不超過 **500 MB**，且維持 `list` 拒絕；不新增 Function、登入或 IAM。以 **C:\firebase-deploy\shortsaboutsentences\outputs\HWG7 U01 Clips\08_final\final_classroom_64s_APPROVED.mp4** 上傳至 **HWG7 Unit 1 Lesson 1／Teaching Video**，讀回檔案大小，儲存 Lesson 後在 Lesson Flow 驗證影片可播放，清除任何未連結的測試物件；完成程式、安全規則、回歸與實機測試後，正式部署 Firebase Storage 規則與 Hosting。

## 驗收條件

- [ ] Teacher Studio 的 MP4 與 PDF 一開啟即有選擇檔案控制項，畫面無通行碼欄位或授權提示。
- [ ] Storage 僅允許匿名使用者寫入合法 lessonId、固定媒體類型、MP4／PDF 與 500 MB 以內的檔案，且禁止列出檔案。
- [ ] 指定 MP4 已保留在 HWG7 Unit 1 Lesson 1，讀回檔案大小符合來源，Lesson Flow 可播放。
- [ ] 自動測試、Storage 規則測試、正式預檢通過，並完成 Firebase Storage 規則與 Hosting 部署。
