---
rdq_version: 1
edition: chatgpt-app
task: 簡化 English Lesson Hub Results 的教師共用通行碼入口
domain: dev
date: 2026-08-18
status: pending_confirmation
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：Results 共用通行碼入口

## 確認紀錄

- 教師於 2026-08-18 選定 `1A／2A／3A`，並採納建議 ①②③④⑤。
- 本文件確認後，才會調整程式、測試與部署；目前不變更正式網站。

## 一句話任務

將 Results 改成「按登入、在同一頁輸入教師共用通行碼、查看成績」的簡潔入口，不使用 Google 教師登入或個別教師權限設定，同時維持學生資料隔離。

## 已確認

- Results 頁面先顯示簡潔的登入按鈕；按下後，原位置切換為共用通行碼輸入欄與送出按鈕，不跳轉頁面、不開啟 Google 登入。
- 通行碼驗證成功後，立即在同一個 Results 頁面顯示成績結果。
- 登入只在目前瀏覽器工作階段有效；重新整理、關閉分頁或重新開啟 Results 時，必須再次輸入。
- 結果頁提供查看、CSV／JSON 匯出，以及「先成功匯出、再二次確認」的資料清除流程。
- 輸入錯誤累計 5 次後，伺服器端暫停 15 分鐘；前端只顯示不洩漏細節的提示。
- 不使用 Google 教師登入、Teacher Claim、自訂權杖，或要求教師手動設定 Service Account Token Creator IAM。
- 教師共用通行碼只在伺服器端 Secret 驗證，絕不出現在前端程式碼、Git、設定檔、測試輸出或瀏覽器儲存空間。
- 學生仍使用匿名 Student ID；學生端與瀏覽器直接 Firestore 存取均不得讀取其他學生或全班 Results。

## 已採納建議

① 以既有畫面風格保留單一「登入」按鈕，登入後在原卡片顯示輸入欄位。

② 以伺服器端 Secret 驗證共用通行碼，不把憑證交給瀏覽器。

③ 以受驗證的後端 Results 操作取代 Google／Teacher Claim／Custom Token 流程，教師無須管理帳號或 IAM。

④ Firestore 繼續拒絕學生直接讀取成績；Results 僅能經由已驗證的後端操作取得。

⑤ 採短工作階段與 5 次／15 分鐘靜默防猜測保護，不增加教師管理步驟。

## 本次不納入

- 個別教師帳號、Google SSO、教師角色分級、登入稽核名單。
- 記住裝置 7 天、跨分頁或跨瀏覽器維持登入。
- 將通行碼嵌入網頁、前端環境變數、QR Code 或教學素材。

## 風險與處理

- 共用通行碼的知情者皆能查看 Results；若需要撤銷存取，教師可更新伺服器端 Secret，舊通行碼立即失效。
- 短工作階段會在重新整理後再次要求輸入，這是已確認的便利性與保護取捨。

## 一段式需求規格

在 `preview` 網站中，將 Results 的 Google 教師登入畫面替換為同頁共用通行碼入口：教師按下登入後，在原卡片輸入通行碼；伺服器端以 Secret 驗證成功後，於同一個 Results 頁呈現成績。登入只存續於目前瀏覽器工作階段；錯誤 5 次後暫停 15 分鐘。教師可查看、匯出 CSV／JSON，並在成功匯出後經二次確認清除資料。移除 Google、Teacher Claim、自訂權杖與需教師手動設定的 IAM 流程；通行碼不進前端、Git 或瀏覽器儲存空間，學生與直接 Firestore 存取仍無法讀取 Results。

## 驗收條件

- [ ] Results 頁只有簡潔登入入口；按下後同頁出現通行碼欄位，沒有 Google 登入或 Teacher Claim 文案。
- [ ] 正確通行碼可顯示 Results；重新整理或另開 Results 後會再次要求通行碼。
- [ ] 錯誤輸入連續 5 次後，15 分鐘內無法繼續嘗試，且畫面不洩漏驗證細節。
- [ ] 成績可檢視並成功匯出 CSV／JSON；資料清除必須先完成匯出且通過二次確認。
- [ ] 前端、Git、設定檔與測試輸出均不含通行碼；瀏覽器儲存空間不保存通行碼。
- [ ] 學生匿名登入、跨學生讀取拒絕與瀏覽器直讀 Results 拒絕測試通過。
- [ ] 完成桌面瀏覽器實測、建置測試與 Firebase 正式部署後，才標示為完成。

