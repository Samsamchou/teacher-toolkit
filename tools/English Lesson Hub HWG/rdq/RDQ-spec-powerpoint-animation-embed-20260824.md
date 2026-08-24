---
rdq_version: 1
edition: chatgpt-app
task: 新增 PowerPoint 動畫嵌入流程
domain: dev
date: 2026-08-24
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 4
downstream: self
---

# RDQ 需求規格：PowerPoint 動畫嵌入流程

## 一句話任務
在 English Lesson Hub 新增獨立的「PowerPoint（動畫）」流程，讓教師從 OneDrive 官方 Embed 在 Lesson Flow 頁內播放標準 On Click 動畫，同時保留既有 PDF 簡報流程。

## 已確認
- 教師以筆電投影，點擊簡報畫面後用滑鼠左鍵逐步播放既有動畫及換頁。
- 指定套用位置為 **HWG5 Starter · Lesson 1 · Step 1**；該 Step 改用新的「PowerPoint（動畫）」流程，其他 Lesson 不自動新增或變更。
- 教師將 PPTX 直接上傳至 OneDrive，並將 PowerPoint for the web 官方 Embed URL 或 iframe code 貼入 Teacher Studio；Google Drive 不納入本次播放流程。
- 教師修改簡報後直接更新 OneDrive 上的同一檔案，不建立 Google Drive／OneDrive 自動同步。
- OneDrive 播放副本採「知道連結的任何人都能檢視」，學生不需 Microsoft 登入。
- 新增獨立「PowerPoint（動畫）」流程；既有「簡報（PDF）」保持不變，作為斷網或嵌入失敗的備援。
- 本次以一般 On Click、出現、淡入、移動等 PowerPoint for the web 支援動畫為驗收範圍，不要求 Animation Trigger 或所有桌面版轉場完全一致。
- 僅接受 `.pptx`；舊 `.ppt` 需先另存成 `.pptx`。播放區提供全螢幕、縮小、新分頁及桌面 PowerPoint 備援。
- Microsoft 登入只由教師在官方頁面完成；Lesson Hub 不保存帳密、Cookie、Token 或第三方工作階段。




- 教師提供的最新 PowerPoint 官方 `1drv.ms/p/` iframe 取代前兩組，採 16:9（1600×900）與 `em=2` 播放模式；URL SHA-256 為 `9F2A1C1C57A4244BE2C24D64D63B5360B25A459C875B56B25470D6378AF571B0`。實作只使用純 HTTPS `src`，完整分享 token 不寫入公開 Git／RDQ；前兩個 `wdEaaCheck` 版本不再使用。
- 本輪先完成規格；程式、測試與預覽通過後，Firebase Hosting 部署仍需教師另行明確授權。

## 已採納建議
- ① 僅支援 `.pptx`；② 保留 PDF 備援；③ 提供四種播放／開啟按鈕；④ 使用實際 PPTX 逐頁驗收；⑤ 不保存第三方登入資料。

## 本次不納入
- Teacher Studio 直接把 PPTX 上傳 Firebase 後自行解析動畫、Microsoft Graph 自動上傳、Google Drive 播放來源、在 Lesson Hub 內編輯 PPTX，以及保證所有桌面版觸發器／轉場完全相同。

## 一段式需求規格
在 **English Lesson Hub** 的 Teacher Studio 新增可選的 **PowerPoint（動畫）** Step，並將 **HWG5 Starter · Lesson 1 · Step 1** 設為此類型；教師先將 **.pptx** 直接上傳至 **OneDrive** 並設定公開檢視，再把 PowerPoint for the web 官方 HTTPS Embed URL 或單一 iframe code 貼入 Teacher Studio。系統只擷取並驗證 Microsoft 官方 iframe `src`，於 Lesson Flow 提供頁內播放、全螢幕、縮小、新分頁及桌面 PowerPoint 備援，讓教師點入簡報後以滑鼠左鍵播放標準 **On Click** 動畫。既有 **簡報（PDF）** 不變；Google Drive 不作為本次播放來源，Lesson Hub 不直接上傳或解析 PPTX、不自動登入或保存第三方憑證，也不承諾網頁版未支援的 Animation Trigger 與複雜桌面效果。

## 驗收條件
- [x] Teacher Studio 可新增 PowerPoint（動畫）Step，且 HWG5 Starter · Lesson 1 · Step 1 正確使用此類型；合法 Microsoft Embed 可通過，非 HTTPS、script、多 iframe 或非 Microsoft 來源會被拒絕。
- [ ] 儲存並重新載入 Lesson 後，OneDrive 簡報能在一般與全螢幕畫面完整顯示，Lesson Hub 外層不產生額外捲動。
- [ ] 實際 PPTX 的標準 On Click 動畫與滑鼠換頁可用；全螢幕、縮小、新分頁、桌面 PowerPoint 備援皆可操作。
- [x] 原有 PDF 簡報、Image Slides、Web Practice、雲端 Lesson 儲存與學生 Quiz 不受影響；程式不含 Microsoft／Google 帳密或 Cookie；正式站尚未部署本次版本。

## 2026-08-24 本機驗收紀錄
- 乾淨隔離副本通過 73／73 項 Node 測試、46 節課資料驗證與 Vite 正式建置；14 Steps 遷移測試確認只替換指定 Lesson 的 Step 1，其餘 13 Steps 保留。
- Teacher Studio 欄位、Microsoft 來源白名單、單一 iframe src 擷取、全螢幕／縮小、新分頁與桌面 PowerPoint 備援均已通過本機預覽。
- 最新官方 Embed（SHA-256：9F2A1C1C57A4244BE2C24D64D63B5360B25A459C875B56B25470D6378AF571B0）已通過程式格式辨識：`1drv.ms/p/`、`em=2` 與 16:9 `wdAr`。未登入的乾淨 Headless Chrome 實測仍最終導向 `onedrive.live.com/edit` 且 iframe 空白，同時記錄 `res-1.cdn.office.net` 載入失敗，因此實際播放與 On Click 動畫尚未通過。
- 下一步需在教師 Chrome 進行本機 Lesson Hub 預覽；若仍要求登入，再確認 OneDrive 權限為「知道連結的任何人都能檢視」後重新取得 Embed code。Firebase Hosting 本次尚未部署。
