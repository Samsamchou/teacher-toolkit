---
rdq_version: 1
edition: chatgpt-app
task: 確認教師媒體授權後再上傳
domain: dev
date: 2026-08-19
status: draft
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 0
  revisions: 0
downstream: self
---

# RDQ 需求規格：教師媒體授權確認

## 一句話任務

讓 Teacher Studio 先由既有通行碼 Function 確認媒體授權已建立，成功後才顯示 MP4／PDF 選檔功能。

## 已確認

- 教師必須先輸入六位通行碼；伺服器確認媒體授權已建立，才顯示「選擇檔案」。
- 擴充既有 `teacherPasscodeLogin`，回傳媒體授權建立結果；不建立新的 Function。
- 授權尚未建立時，顯示紅色中文提示、隱藏選檔按鈕；驗證成功後才顯示綠色「可選擇檔案」。
- 維持既有匿名 Auth、通行碼 Secret、MP4／PDF 限制與 Storage 安全規則；不新增 Google 登入、IAM 或放寬 Storage 規則。

## 待確認假設

- 新增 Function／Storage 串接自動測試與部署後小型 MP4／PDF 實機驗收。
- 程式與測試完成後，正式 Firebase 發布仍須取得明確指示。

## 本次不納入

- 新增專用媒體授權 Function。
- 先選檔後才要求通行碼、背景自動重試或顯示 Firebase 原始錯誤。
- 圖片、音檔或其他媒體格式上傳。

## 一段式需求規格

在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG\preview** 調整既有 **teacherPasscodeLogin** 與 Teacher Studio 媒體上傳元件：通行碼正確時，後端須先成功建立呼叫者 Anonymous Auth UID 的 **teacherMediaAccess** 授權紀錄，再回傳明確的媒體授權成功資訊；前端未收到確認時不得顯示 MP4 或 PDF 的選檔控制項，而要顯示紅色中文「上傳授權仍未建立，請重新輸入教師通行碼後再選擇檔案。」。收到確認後才以綠色顯示「媒體上傳已解鎖，可選擇檔案。」並開放選檔。保留既有檔案大小、格式、匿名 Auth、Secret 與 Storage 規則，不建立新 Function 或放寬權限；新增 Function／Storage 授權串接測試及部署後小型 MP4、PDF 驗收步驟。

## 驗收條件

- [ ] 未確認媒體授權時，選檔按鈕不顯示，且畫面為紅色中文提示。
- [ ] 正確通行碼且 Function 成功建立授權後，顯示綠色已解鎖提示與選檔按鈕。
- [ ] Function 無法建立授權時，不會顯示選檔按鈕或 Firebase 原始錯誤。
- [ ] MP4／PDF 安全規則與現有匿名學生作答流程均通過回歸測試。
