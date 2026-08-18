# Firebase Results 共用通行碼啟用與上線檢查

這份專案不儲存通行碼、教育雲登入狀態、Firebase Secret 或服務帳號金鑰。Results 頁面會先顯示「登入」按鈕；按下後才在同一頁顯示通行碼欄位。驗證只會在 Firebase Cloud Functions 執行。

## 1. Console 前置設定

由教師本人在 `hwg7teaching` 完成：

1. Firestore Database 使用 Native mode；已存在就不要重建。
2. Authentication → Sign-in method：確認 **Anonymous** 已啟用。
3. 確認專案可使用 Cloud Functions（通常需要 Blaze／已綁定 Billing）。
4. 在 Google Cloud Console 的 Secret Manager 保留名為 `TEACHER_RESULTS_PASSCODE` 的 Secret；值只由教師本人私下管理。

不要把通行碼貼入 Codex 對話、終端指令、`.env.production`、程式碼、題庫或 Git。網站只會取得 Firebase Web App 公開組態；它不是管理員憑證，也不含教師通行碼。

## 2. 部署順序

1. 正式 Hosting 由同網域的 `/__/firebase/init.json` 自動提供目前網站所屬專案的公開組態；前端會核對 `projectId=hwg7teaching`，不需建立 `.env.production` 或把 API key 寫入專案。Vite 本機預覽沒有此保留端點，會維持 Local Preview；正式 Firebase 測試請使用 Hosting 網址。
2. 安裝 Functions 依賴：

```powershell
npm.cmd --prefix functions ci
```

3. 執行完整檢查：

```powershell
npm.cmd run preflight
```

4. Secret 建立後，先通過首次部署閘門；它只檢查 Secret 的版本資訊，不讀取通行碼值：

```powershell
npm.cmd run teacher-access:initial-gate
```

5. 僅部署這個專案的 Functions、安全規則與專用 Hosting：

```powershell
firebase deploy --only functions:teacherPasscodeLogin,functions:teacherPasscodeLogout,functions:teacherResultsList,functions:teacherResultsRecordExport,functions:teacherResultsDelete,firestore:rules,hosting:lesson-hub-v03 --project hwg7teaching
```

這不會部署或覆寫預設的 `hwg7teaching` Hosting site，也不需要設定 Service Account Token Creator IAM。

## 3. 同頁 Results 工作階段

- 教師按 **登入**，再在同一頁輸入教師共用通行碼。
- Cloud Function 驗證 Secret 後，建立只在目前瀏覽器分頁記憶體存在的短暫工作階段；重新整理、關閉 Results 或關閉分頁後會要求再次輸入。
- 瀏覽器保持 Anonymous Auth，不能直接讀取全班 Results。每次 Results 讀取、匯出紀錄與刪除都帶著短暫工作階段交由 Function 驗證。
- 通行碼錯誤每位匿名工作階段最多 5 次，15 分鐘後自動解除；錯誤次數、工作階段與匯出紀錄均禁止瀏覽器直接讀寫。

## 4. 真人安全驗收

使用沒有學生個資的測試資料確認：

1. 學生 A 完成一次 Quiz；學生 B 無法讀取學生 A 的文件，亦無法列出全班 Results。
2. 在獨立的私密瀏覽器工作階段輸入錯誤通行碼，確認錯誤提示與 5 次／15 分鐘保護；不要在平常教師分頁做完 5 次錯誤測試。
3. 教師本人於 Results 按登入並輸入通行碼，確認同頁顯示成績；重新整理後必須再次輸入。
4. 教師可查看結果、下載 CSV 和 JSON；安全匯出紀錄建立後才可按刪除，確認後重新整理不再出現該筆資料。
5. 以實體 iPad Safari 掃教師投影 QR，確認只打開本節 Quiz，不顯示教師電子書或 Teacher Studio。

完成真人驗收後，才可將 `config/firebase-preflight.json` 的對應 live evidence 更新為 `true` 並通過：

```powershell
npm.cmd run teacher-access:formal-gate
```

若 App Check 尚未設定，須明確保留此風險，不應宣稱為完全強化的正式環境。