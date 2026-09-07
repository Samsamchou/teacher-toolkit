# Firebase 正式部署紀錄 / Production deployment receipt

日期：2026-09-07

專案：`gamesinclass-5d9d1`

正式站：https://gamesinclass-5d9d1.web.app

Firebase Console：https://console.firebase.google.com/project/gamesinclass-5d9d1/overview

## 已發布資源 / Released resources

- Firebase Hosting site：`gamesinclass-5d9d1`
- Cloud Function：`teacherLogin`，第二代 HTTPS Function，`asia-east1`，Node.js 22，256 MiB
- Firestore：`(default)` Native database 與 `firestore.rules`
- Cloud Storage：`gamesinclass-5d9d1.firebasestorage.app` 與 `storage.rules`
- Secret Manager：`CLASSROOM_TEACHER_PIN`，version 2 enabled
- Runtime service account：具備讀取該 Secret 與簽發 Firebase custom token 所需的最小權限
- Firestore TTL：`loginLimits.expiresAt` 已送出啟用，部署後讀回狀態為 `CREATING`
- Artifact Registry：`asia-east1/gcf-artifacts` 已設定刪除 7 天以上建置映像的清理政策

通行碼、scrypt 驗證值、CLI token 與其他憑證未寫入此文件、專案原始碼或 Git。

## CORS 與安全設定 / CORS and security

Storage bucket 只允許下列正式來源使用 `GET`：

- `https://gamesinclass-5d9d1.web.app`
- `https://gamesinclass-5d9d1.firebaseapp.com`

允許的 response headers 為 `Content-Type`、`Content-Length`，max age 為 3600 秒。Firestore 與 Storage 均使用登入後私人規則，未設定公開讀取。

正式 Hosting 回應已讀回以下安全標頭：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 建置與自動驗證 / Build and automated verification

Google Drive 路徑對大量套件與 Vite `dist` 寫入發生 EPERM，因此正式建置使用全新本機暫存副本；正式原始碼仍以本專案為準。

- Root `npm ci`：成功，125 packages
- Functions `npm ci`：成功，291 packages
- `npm test`：10/10 通過
- `npm run test:rules`：6/6 通過
- `npm run build`：成功，Vite 8.2.2，1861 modules
- Function JavaScript syntax check：通過
- 正式站檔案：11/11 回傳 HTTP 200，SHA-256 與部署成品完全相符
- SPA fallback `/scratch`：HTTP 200，回傳應用程式 HTML
- `GET /api/teacher-login`：HTTP 405，符合預期
- malformed `POST /api/teacher-login`：HTTP 400，符合預期
- Chrome 目視檢查：雙語登入畫面與糖果樂園配色正常，Console 無錯誤或警告

## 實際部署注意事項 / Deployment notes

- Firebase CLI 的 Storage selector 使用 `storage`；`storage:rules` 會被解讀為不存在的 target。
- Functions source discovery 在這台 Windows 環境需要設定 `FUNCTIONS_DISCOVERY_TIMEOUT=60000`。
- 首次 Function 部署已建立 Function，但因 Artifact Registry 尚無清理政策而以 exit 1 結束；補上 7 天清理政策後，重新發布 Hosting、Firestore 與 Storage，最終命令 exit 0。
- 正式發布的 Hosting release 已 finalized 並完成 release。

## 尚待教師親測 / Remaining teacher checks

- 使用有效六碼通行碼完成一次正式站登入與登出。
- 上傳一張實際教學圖片、儲存課堂清單、重新整理並確認雲端資料持續存在。
- 從第二台裝置登入並讀取同一份圖片與課堂清單。
- 在正式 75–86 吋觸控螢幕檢查刮圖、畫筆、全螢幕、喇叭音量與揭曉／慶祝動畫。
- 如需費用提醒，可另外建立 Google Cloud Billing budget alert。
