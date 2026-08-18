# English Lesson Hub V03

HWG5 與 HWG7 的教師備課與學生 Vocabulary Quiz 網站。HWG5、HWG7 各有 Starter（Lesson 1–3）與 Unit 1–4（各 Lesson 1–5），共 10 個單元、46 節課。HWG7 為 Grade 6。

## 已完成的教學與學生流程

- HWG7 Unit 1 Lesson 1 保留原有 Type A 10 題、Type B 8 題題庫、圖片／音檔和穩定教師端電子書目錄。
- 圖片維持原始 PNG 不動；網站使用不裁切、不拉伸的 JPG 版本。音檔為原始副本。
- 教師模式保留手動 Next 的課堂流程；電子書只會以新分頁開啟，學生端完全不顯示電子書。
- 「學生掃碼」模式在教師投影顯示 QR。連結只含 `book`、`unit`、`lesson`，iPad Safari 掃描後直達本節 Vocabulary Quiz。
- Quiz 的英文採用本機打包的 Comic Relief；正式作答才隨機打散四個選項。
- 拉霸採用按鍵觸發的 Safari-safe 音效：加速轉動、逐軸停止、最後獎勵音；可靜音。
- 教師 Lesson 的抽籤、倒數與畫筆收為左側小圖示；點選才開啟面板。抽籤固定 01–30、不重複、4 秒音效／亂數動畫；畫筆支援自由線、直線、長方形、圓形、橡皮擦與 PNG 匯出。工具不再常駐擠壓投影主內容，Lesson Flow 可收合。
- 倒數歸零會播放 6 秒強烈警報音效；全站音效關閉時，警報也會保持靜音。
- 10 個單元各有固定多巴胺色票，讓單元卡、教師流程、QR 與學生 Quiz 一致辨識。
- Teacher Studio 的每個單元預設收合；點開後可由 Lesson 列直接進入 Edit Lesson，或按右側開始按鈕進入教師流程；Duplicate／Reset 收在每列的「更多」選單。

## Firebase 資料保護

- Firebase 專案：`hwg7teaching`；部署目標只會是新的 Hosting site `lesson-hub-v03`，不會覆寫 default Hosting site。
- 學生以 Anonymous Auth 寫入；Firestore 只保存匿名 Student ID 和作答資料，沒有姓名欄位。
- 學生只能建立自己的 Session，重送時只能讀回同一個 Session，不能列出、讀取他人、更新既有分數或刪除資料。
- Results 先顯示「登入」按鈕；按下後在同一頁輸入教師共用通行碼。通行碼僅由 Firebase Secret Manager 的伺服器端驗證。
- 驗證成功後，網站只在目前分頁記憶體保留短暫 Results 工作階段；重新整理或關閉分頁後需再次輸入。網站不使用 Google 登入、教師帳號、Teacher Claim 或自訂權杖。
- Results 的讀取、匯出紀錄與刪除都經由 Cloud Functions；瀏覽器不能直接列出或刪除 Results。CSV／JSON 匯出成功建立紀錄後，才會啟用二次確認的資料清除。
- 錯誤輸入在伺服器端採每位匿名工作階段 5 次／15 分鐘保護；通行碼、短暫工作階段憑證都不會寫入 Git、前端設定或瀏覽器儲存空間。

詳見 [FIREBASE_SETUP.md](FIREBASE_SETUP.md)。

## 本機驗證

```powershell
npm.cmd run preflight
```

## 上線前仍須完成的真人操作

1. Anonymous Authentication 已由教師啟用；不需要啟用或使用 Google 教師登入。
2. Secret Manager 的 `TEACHER_RESULTS_PASSCODE` 已由教師本人建立；不要把值貼到對話、終端、`.env` 或專案檔。
3. 正式 Hosting 會從同網域的 `/__/firebase/init.json` 取得 Firebase 公開組態，不需在專案保存 `.env.production` 或 API key；Cloud Functions 仍需專案可部署（通常需要 Blaze）。
4. 部署後，由教師本人在 Results 頁輸入通行碼，驗收正確登入、錯誤保護、匯出及刪除流程；不需要設定 Service Account Token Creator IAM。
5. 最後用實體 iPad Safari 掃 QR，驗收學生端只開啟本節 Quiz，不顯示教師電子書或 Teacher Studio。