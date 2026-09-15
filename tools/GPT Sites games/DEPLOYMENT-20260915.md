# Unscramble Live｜Firebase 正式部署（2026-09-15）

## 發布結果

使用者明確授權「正式部署 Firebase」後，已發布至 gamesinclass-5d9d1。

- 正式教師入口：https://gamesinclass-5d9d1.web.app/unscramble
- Hosting：57 個檔案發布成功，CLI exit 0。
- 新增函式：classroom-games:liveActivity，asia-east1，Gen 2，Node.js 22；CLI exit 0。
- 發布副本：C:\Users\User\AppData\Local\Temp\gsg-release-unscramble-20260915。
- 沿用既有教師登入；本次沒有重新部署 teacherLogin、Firestore／Storage rules 或變更 Secrets。沒有 commit 或 push。

## 正式環境核對

2026-09-15 約 10:56（臺北時間）完成：

- 57／57 線上檔案 SHA-256 與本地通過版本一致。
- 首頁、/unscramble、/join 均 HTTP 200，回傳預期 SPA。
- 三個入口的 nosniff、DENY、strict-origin-when-cross-origin 標頭正確。
- 教師登入與活動 API 的 GET 均 405；未登入列出題組為 401。
- 不存在的測試場次加入請求回傳 404，驗證活動後端與 Firestore 讀取路徑可運作，未建立測試場次。
- Chrome：教師登入頁、1024×768 學生加入頁正常；無 JavaScript 執行錯誤，學生頁無橫向溢出。
- 證據：qa/unscramble-production-20260915/http-verification.json、browser-verification.json、teacher-login.png、student-join.png。

## 上課前操作與待驗收

1. 教師親自使用原六碼通行碼登入正式教師入口。
2. 按「載入七題家人題組」，把已封裝的七題與七張圖片儲存至正式資料庫。
3. 建立新場次，設定班級及 8 組，學生掃描此場次 QR。
4. 以教師螢幕和至少兩台實體平板驗證 Next 開放／鎖定、正誤與五次限制、重新整理後紀錄保存及教室音效。
5. 明天使用「複製題組」更名換圖，另建立班級場次，保留今天的題組與紀錄。

本次未代替教師登入，尚未執行正式題組初始化或已登入的跨裝置作答／寫入保存驗收。這些不可由公開頁面或 API 防護測試視為完成。本地已通過 57 項程式、7 項權限、15 項八組瀏覽器流程、5 項競態與模擬資料重啟保存；詳細歷史见 UNSCRAMBLE-IMPLEMENTATION-20260915.md。
## 同日追加：組數上限改為 10 組（已部署）

- 依教師「修正好之後，直接部署到正式站」授權，教師選單與後端上限改為 2–10 組；預設仍為 8 組。
- 9–10 組在寬螢幕投影改用三欄；1366×768、1440×1000、1920×1080 都能同時顯示十組作答卡。
- 本地十個獨立學生瀏覽器流程 15 項全通過：第 11 組拒絕、五次限制、切題鎖定、保存／重送／CSV、班級隔離。測試報告見 qa/unscramble-ten-groups-20260915/integration-results.json。
- Hosting 與 classroom-games:liveActivity 更新成功，Firebase CLI exit 0。發布副本為 C:\Users\User\AppData\Local\Temp\gsg-release-ten-groups-20260915。
- 已建立場次保留原組數；重新整理正式站並建立新場次，可選到 10 組。未重新部署 teacherLogin 或資料規則，未變更通行碼。
- 正式登入後的實體十台平板驗收仍待教師進行。
- 本次正式版本 57／57 檔案 HTTP 200 且 SHA-256 一致，活動 API 未登入回傳 401；正式教師入口載入新 JS/CSS。證據：qa/unscramble-ten-groups-20260915/production-verification.json。

## 收工保存範圍

GitHub 僅保存活動原始碼、測試與文字驗證紀錄。七張學生來源圖、functions/unscramble-assets 與含圖 QA 截圖保留於 GDrive 本機掛載專案，未公開上傳 GitHub。從 GitHub 另行還原部署時，需從本專案 GDrive 複製 functions/unscramble-assets/1.png–7.png；正式 Firebase 已包含圖片。GDrive 伺服器端同步狀態未另驗。
