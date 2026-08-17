# English Lesson Hub V03

HWG5 與 HWG7 的教師備課與學生 Vocabulary Quiz 網站。HWG5、HWG7 各有 Starter、Unit 1–4；每個單元固定建立 Lesson 1–5，共 10 個單元、50 節課。HWG7 為 Grade 6。

## 已完成的教學與學生流程

- HWG7 Unit 1 Lesson 1 保留原有 Type A 10 題、Type B 8 題題庫、圖片／音檔和穩定教師端電子書目錄。
- 圖片維持原始 PNG 不動；網站使用不裁切、不拉伸的 JPG 版本。音檔為原始副本。
- 教師模式保留手動 Next 的課堂流程；電子書只會以新分頁開啟，學生端完全不顯示電子書。
- 「學生掃碼」模式在教師投影顯示 QR。連結只含 `book`、`unit`、`lesson`，iPad Safari 掃描後直達本節 Vocabulary Quiz。
- Quiz 的英文採用本機打包的 Comic Relief；正式作答才隨機打散四個選項。
- 拉霸採用按鍵觸發的 Safari-safe 音效：加速轉動、逐軸停止、最後獎勵音；可靜音。
- 10 個單元各有固定多巴胺色票，讓單元卡、教師流程、QR 與學生 Quiz 一致辨識。

## Firebase 資料保護

- Firebase 專案：`hwg7teaching`；部署目標只會是新的 Hosting site `lesson-hub-v03`，不會覆寫 default Hosting site。
- 學生以 Anonymous Auth 寫入；Firestore 只保存匿名 Student ID 和作答資料，沒有姓名欄位。
- 學生只能建立自己的 Session，重送時只能讀回同一個 Session，不能列出、讀取他人或更改任何分數。
- 教師 Results 僅顯示一個六位數通行碼欄位。通行碼由 Firebase Secret Manager 保存，Cloud Function 驗證後才簽發短暫 `teacher: true` custom token；前端、題庫與 Git 不會保存通行碼。
- 登出會刪除暫時教師帳號並清除瀏覽器工作階段；伺服器端同時限制匿名帳號與全站的錯誤嘗試。
- UI 會先產生 CSV／JSON 匯出與 `exportEvents` 紀錄，才啟用「刪除已匯出資料」。

詳見 [FIREBASE_SETUP.md](FIREBASE_SETUP.md)。

## 本機驗證

```powershell
npm.cmd run preflight
```

## 部署前仍須完成的真人操作

1. Anonymous Authentication 已由教師啟用；不要為這個流程啟用或使用 Google 教師登入。
2. 在 Google Cloud Secret Manager 建立 `TEACHER_RESULTS_PASSCODE`，由教師本人私下輸入通行碼；不要把值貼到對話、終端、`.env` 或專案檔。
3. 確認專案可部署 Cloud Functions（通常需要 Blaze），並保留 Firebase Web App 公開設定於本機 `.env.production`；可從 `.env.example` 複製。
4. Functions 初次部署後，依實際 runtime service account 授予最小的 Service Account Token Creator 權限並等待傳播，才能簽發 custom token。
5. 以匿名測試帳號驗收：錯誤通行碼被拒絕、正確通行碼取得 `teacher: true`、學生互相隔離、教師可匯出後刪除；最後用實體 iPad Safari 掃 QR 驗收。