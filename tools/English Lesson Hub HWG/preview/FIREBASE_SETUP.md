# Firebase 安全通行碼啟用與上線檢查

這份專案不儲存密碼、教育雲登入狀態、Firebase Secret 或服務帳號金鑰。教師頁面只有一個通行碼欄位，但驗證只會在 Firebase Cloud Functions 執行。

## 1. Console 前置設定

由教師本人在 `hwg7teaching` 完成：

1. Firestore Database 使用 Native mode；已存在就不要重建。
2. Authentication → Sign-in method：確認 **Anonymous** 已啟用。
3. 確認專案可使用 Cloud Functions（通常需要 Blaze／已綁定 Billing）。
4. 在 Google Cloud Console 的 Secret Manager 建立名為 `TEACHER_RESULTS_PASSCODE` 的 Secret，並在 Secret value 欄位私下輸入教師通行碼。

不要把通行碼貼入 Codex 對話、終端指令、`.env.production`、程式碼、題庫或 Git。網站只會取得 Firebase Web App 公開組態；它不是管理員憑證，也不含教師通行碼。

## 2. 部署順序

1. 從 `.env.example` 複製為本機 `.env.production`，填入公開 `VITE_FIREBASE_*` 值與 `VITE_FIREBASE_FUNCTIONS_REGION=asia-east1`。
2. 安裝 Functions 依賴：

```powershell
npm.cmd --prefix functions ci
```

3. 執行完整檢查：

```powershell
npm.cmd run preflight
```

4. Secret 建立後，先通過首次部署閘門（只檢查 Secret 的版本資訊，不讀取通行碼值）：

```powershell
npm.cmd run teacher-access:initial-gate
```

5. 僅部署這個專案的 Functions、安全規則與專用 Hosting：

```powershell
firebase deploy --only functions:teacherPasscodeLogin,functions:teacherPasscodeLogout,firestore:rules,hosting:lesson-hub-v03 --project hwg7teaching
```

這不會部署或覆寫預設的 `hwg7teaching` Hosting site。

## 3. IAM 與 live claim 驗證

Function 會以 Firebase Admin SDK 簽發 custom token。部署後先以 Functions 資訊確認實際 runtime service account，再只對該帳號授予它自己 `roles/iam.serviceAccountTokenCreator` 所需的 `iam.serviceAccounts.signBlob` 權限。等待 IAM 傳播後重新部署 Functions，並用測試通行碼登入一次確認 Token 真的含有 `teacher: true`。

完成 Secret、IAM 與 live claim 測試後，更新 `config/firebase-preflight.json` 的驗證證據，再通過正式上線閘門：

```powershell
npm.cmd run teacher-access:formal-gate
```

不要下載、貼出或放入服務帳號 JSON 金鑰；請使用受管 Cloud Functions 身分與 IAM。

## 4. 安全驗收

在沒有學生個資的測試帳號上確認：

1. 學生 A 完成一次 Quiz；學生 B 無法讀取學生 A 的文件。
2. 錯誤通行碼會被拒絕；重複錯誤嘗試會暫時鎖定。`teacherLoginAttempts` 只允許 Function 使用，任何瀏覽器都無法讀寫。
3. 正確通行碼會建立只限本次瀏覽器工作階段的 `teacher: true` Token；教師登出後，暫時教師帳號會被刪除。
4. 教師可看到結果、下載 CSV 和 JSON；下載成功後才可啟用刪除，刪除後重新整理不再出現該筆資料。
5. 以實體 iPad Safari 掃教師投影 QR，確認只打開本節 Quiz，不顯示教師電子書或 Teacher Studio。

若 App Check 尚未設定，須明確保留此風險，不應宣稱為完全強化的正式環境。