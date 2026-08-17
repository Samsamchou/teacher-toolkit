---
rdq_version: 1
edition: chatgpt-app
task: 製作 HWG7 U01 第一節課教材與題庫
domain: dev
date: 2026-08-17
status: draft
telemetry:
  mode: full
  rounds: 2
  questions: 8
  q4_adopted: 10
  revisions: 2
downstream: self
supersedes: RDQ-spec-hwg7-u01-lesson1-20260817-r1.md
---

# RDQ 需求規格：HWG7 Unit 1 第一節課

## 一句話任務
為 English Lesson Hub 製作 HWG7 Unit 1 第一節課的教師端電子書、手動簡報導覽及可審核的 Vocabulary Quiz A／B 題庫，並以 Firebase 安全保存匿名成績。

## 已確認
- Type A 使用 **HWG7 U01/Landmark food AI pics** 的 10 張圖片製作 10 題；Type B 使用 **Here We Go(7)單字圖卡/HWG7 U1/mp3** 的 8 個音檔製作 8 題；每題固定列 4 個選項供教師審核，正式作答才隨機排序。
- 題庫顯示與正解統一為 **Singapore**；原始 `4. Sinagapore.mp3` 不覆寫。
- 圖片保留比例且不超過 **1920×1080**，不裁切、不拉伸、不放大；原始 PNG 永久保留，另存 JPG。
- 簡報只使用手動 Previous／Next，不自動輪播；翰林 E-book 只放教師端，學生 iPad Safari 不顯示電子書。
- Firebase 專案為 **hwg7teaching**；學生輸入五碼 Student ID，格式為「年級 1 碼＋班級 2 碼＋座號 2 碼」，例如 **50101**，座號限制 01–30，不存姓名。
- 第一次答案決定 practice score；答錯可繼續重試，答對後才播放一次 Celebration。保存 firstAnswer、firstAttemptCorrect、attemptCount 與 finalAnswer。
- 教師 Results Dashboard 使用 Firebase Google Sign-in，只允許指定教師帳號；學生裝置另用 Firebase Anonymous Auth，學生不得讀取其他人的結果。
- 成績保存到學期結束；成功匯出 JSON／CSV 並由教師確認後才刪除，留下匯出與刪除時間紀錄。

## 待確認假設
- 題庫同步保存為 Markdown 審核稿與 JSON 網站資料檔，兩者由同一份資料產生並執行一致性檢查。
- 指定教師 Google 帳號於後續登入設定時由教師親自完成，不在規格卡記錄電子郵件。

## 已採納建議
- 每次練習以 `sessionId＋studentId＋quizId` 建立冪等識別，避免重複提交。
- 題目使用固定 questionId，素材記錄 SHA-256；保存首次答案、嘗試次數與最後答案。
- Student ID 搭配 Firebase Anonymous Auth；Firestore 預設拒絕未授權讀取與跨學生資料存取。
- 學期末刪除前先匯出 JSON／CSV 並記錄時間；完成 Desktop 與 iPad 橫直向 QA 後才接受介面。

## 本次不納入
- 其他 Unit、正式站部署、保存教育雲帳密、自動代登入、學生端電子書及未提供素材的完整 Lesson Flow。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG** 中，先建立 HWG7 Unit 1 第一節課的 Markdown／JSON 可審核題庫：Type A 依 10 張圖片製作 10 題 Look and Choose，Type B 依 8 個音檔製作 8 題 Listen and Choose，每題列 4 個選項、唯一正解、固定 questionId、素材路徑與 SHA-256；教師確認後才整合網站。圖片另存不超過 **1920×1080** 的 JPG 且永久保留 PNG。網站使用 Firebase **hwg7teaching**：五碼匿名 Student ID 搭配 Anonymous Auth，第一次答案計分、答錯可重試、答對才慶祝；教師以 Google Sign-in 查看結果，資料以冪等 session 識別保存，學期末成功匯出並確認後刪除。電子書僅教師端顯示，簡報只允許手動 Previous／Next。

## 驗收條件
- [ ] Markdown／JSON 題庫均有 Type A 10 題與 Type B 8 題，每題恰有 4 個選項、唯一正解、questionId、素材路徑及 SHA-256，兩檔內容一致。
- [ ] 原始 PNG／MP3 不覆寫；JPG 符合比例與解析度限制；`Singapore` 顯示正確；簡報無自動輪播且學生端無電子書。
- [ ] 首次答案計分、重試、Celebration、attempt 欄位與冪等提交均有自動化測試，Practice Score 不受後續重試改寫。
- [ ] Firestore 通過 Anonymous Auth／教師 Google allowlist 安全規則、跨學生讀取拒絕、JSON／CSV 匯出及「成功匯出後才可刪除」測試。
