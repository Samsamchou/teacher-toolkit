---
rdq_version: 1
edition: chatgpt-app
task: 修正教師媒體上傳授權
domain: dev
date: 2026-08-19
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：教師媒體上傳授權修復

## 一句話任務

修正 **lesson-hub-v03** 的教師 MP4／PDF 上傳授權，讓既有教師通行碼能在目前瀏覽器工作階段安全解鎖、失效後可自動重試選取檔案。

## 已確認

- 上傳只使用目前影片／簡報區的教師通行碼；不新增 Google 登入、IAM 角色或其他帳號。
- 授權只在目前瀏覽器工作階段有效；重整或登出後必須重新輸入通行碼。
- 未授權錯誤要改成中文提示；教師重新驗證後，系統自動重試該次已選的 MP4 或 PDF 一次。
- 通行碼驗證成功時建立媒體上傳授權，登出時撤銷；不在前端、程式碼或規格檔保存通行碼。
- 需要加入未解鎖拒絕、解鎖後允許、登出後再次拒絕的自動測試，並以小型 MP4／PDF 做部署後實機驗收。

## 待確認假設

- 正式 Firebase 發布需在程式與測試完成後，再取得明確部署指示。

## 已採納建議

- 同步建立／撤銷 **teacherMediaAccess** 媒體授權紀錄。
- 移除 Firebase 英文原始錯誤與 Storage 路徑，提供可採取行動的中文訊息。
- 以自動測試驗證授權全流程。
- 部署後用小型 MP4 與 PDF 各驗收一次。
- 本次僅處理影片與 PDF，不擴大到圖片、音檔或其他媒體格式。

## 本次不納入

- Google 教師登入、自訂 Claims、額外 IAM 權限與跨瀏覽器記住登入。
- 圖片、音檔與其他格式的 Firebase Storage 上傳。

## 一段式需求規格

在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG\preview** 修正 Firebase Functions、Firestore／Storage 授權串接與 Teacher Studio 上傳介面：成功驗證既有教師通行碼後，後端須為呼叫者的 Anonymous Auth UID 建立具到期時間的 **teacherMediaAccess** 授權紀錄，Storage 規則只允許具有效授權的工作階段上傳或刪除 **teacher-media** 下的 MP4 與 PDF，登出時僅撤銷對應工作階段的授權。上傳發生授權失效時，前端不可顯示原始 Firebase 錯誤或檔案路徑，而要提示重新輸入通行碼，保留本次選取檔案並在驗證成功後自動重試一次。新增自動測試與小型 MP4／PDF 實機驗收步驟；完成程式與測試後，等待使用者明確指示才部署至 **hwg7teaching／lesson-hub-v03**。

## 驗收條件

- [ ] 未輸入通行碼時，影片與 PDF 上傳都被 Storage 規則拒絕。
- [ ] 正確通行碼在目前工作階段建立有效媒體授權，上傳成功。
- [ ] 授權失效後可重新驗證並自動重試一次，畫面不顯示 Firebase 原始錯誤。
- [ ] 登出、重整或工作階段失效後再次拒絕上傳；自動測試與部署後 MP4／PDF 驗收均通過。
