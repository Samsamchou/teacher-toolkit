# 2026-08-29 Firebase 正式部署紀錄

## 部署結果

- 正式網址：<https://hwclass-479d2.web.app>
- Firebase 專案：`hwclass-479d2`
- Firestore／Functions region：`asia-east1`
- 計費：Blaze；教師已明確確認正式部署與可能費用。
- Firestore：default database、Standard edition、刪除保護啟用；PITR 未啟用。
- Authentication：已初始化；使用後端六位數通行碼驗證及 Firebase custom token，未啟用 Google、Email／Password、匿名或其他內建登入供應商。
- App Check：Web App 使用 reCAPTCHA Enterprise；正式 callable 強制 `enforceAppCheck: true`。
- Cloud Function：`verifyTeacherPin`，第二代、Node.js 22、256 MiB、15 秒 timeout、`maxInstances: 5`。
- Hosting、Firestore Rules 與 Indexes：已部署並讀回。
- Hosting headers：HTTP 200、HSTS 與 `X-Frame-Options: DENY` 已確認。
- Artifact Registry：`gcf-artifacts` 設定刪除 30 天前映像檔的清理政策。

## 安全設定讀回

- `TEACHER_PIN_BCRYPT_HASH` 與 `RATE_LIMIT_IP_SALT` 已存於 Secret Manager；值未寫入聊天、原始碼、Vite env 或 Git。
- 正式 Function 的運算服務帳戶只在自身服務帳戶資源上取得「服務帳戶憑證建立者」角色；未建立或下載服務帳戶金鑰。
- callable 收到的正式請求已由日誌確認 App Check 有效。
- Firestore Rules 維持固定教師 uid／role、欄位白名單、有效座號與 append-only 歷程。
- `_securityRateLimits.expiresAt` 的 TTL 尚未啟用；成功登入仍會清除目前來源的失敗計數，但其他過期文件不會自動清理。

## 部署後 QA

- 前端：3 test files、10 tests passed；production build 通過，360 modules。
- Firestore Rules：11/11 Emulator tests passed。
- 正式登入：通行碼驗證、custom token、Firebase Authentication 與教師後臺載入通過。
- 工作階段：共用裝置登入後重新載入仍保持教師後臺，沒有再次跳回登入視窗。
- 課表：2026-08-31 至 2027-01-20、20 節；英語 12、在地 4、國際歌謠 4 均顯示。
- 主要頁面：本週課表、作業繳交、課堂情況、後臺紀錄、設定均可讀取，瀏覽器沒有 Firebase、權限或執行錯誤。
- 登入競態修正：工作階段會在 custom-token 交換前先保存；若交換失敗立即清除，避免 `onAuthStateChanged` 將剛登入的教師登出。

## 尚未以正式資料驗證

- 本回合刻意未在 append-only 正式集合建立難以清除的測試作業、繳交事件、課堂事件或課表異動。
- 正式環境的寫入由 Firestore Rules 11/11 Emulator suite 覆蓋，但仍不等同真實資料寫入驗收。
- CSV／XLSX／列印／JSON 的完整逐檔讀回與正式資料匯出仍需教師使用實際紀錄驗收。
- 30 分鐘完整閒置、私人裝置 7 天到期、五次錯誤鎖定 15 分鐘與 TTL 自動清理仍需時間型驗收。
- Firestore 的 App Check 產品層 enforcement 尚未另行開啟；目前 callable Function 已強制 App Check，Firestore 仍由 Auth＋Rules 保護。

## 變更界線

- 本次未 commit 或 push Git，也未處理父層儲存庫的其他專案變更。
- 後續 Secrets、IAM、Rules、App Check、Functions、Hosting 或資料清理變更仍須另行取得教師明確授權。
