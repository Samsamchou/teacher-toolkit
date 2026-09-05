# 部署交接 / Deployment handoff

狀態：本機版本可供審閱，尚未正式發布。2026-09-05 已在控制台確認專案 gamesinclass-5d9d1 為 Blaze。 / Local build ready for review; Blaze verified; not deployed.

## 部署前最後確認 / Final authorization

依已確認 RDQ，正式部署另行授權。確認目標為 gamesinclass-5d9d1 後才啟用服務、上傳 Functions/Rules/Hosting；Blaze 啟用本身不代表本代理已獲正式發布授權。 / Confirm production target before cloud changes.

## 執行順序 / Sequence

1. 先唯讀檢查目標專案既有 Hosting releases、Functions、Auth、Firestore 和 Storage。若有既有正式內容，提出具體差異，禁止直接覆蓋。 / Inspect existing production resources first.
2. 讓使用者親自完成 Firebase CLI 登入，確認使用者授權的專案權限；不用教師 Gmail 做網站登入。 / User completes admin authentication personally.
3. 確認並初始化 Firebase Auth、Firestore 原生資料庫、Storage bucket；選擇適合的資料位置，Cloud Function 目前 asia-east1。若資源已存在，保留既有位置。 / Initialize only absent services; retain existing locations.
4. 套用 storage.cors.json 到實際 bucket（從專案查得，勿猜 bucket 名稱）。不得設定公開讀取。 / Configure CORS on verified bucket, keep private access.
5. 在使用者本機 VS Code 終端執行 node scripts/set-passcode.mjs，使用者親自輸入兩次隱藏六碼。不得請使用者在聊天回覆通行碼。 / User enters the passcode twice in their own trusted terminal.
6. 確認 Secret Manager 僅有必要服務存取；Cloud Function 使用的服務帳號具簽發 custom token 必要權限，最小範圍設定 signBlob。 / Verify minimal secret access and custom-token signing IAM.
7. 設置 loginLimits.expiresAt TTL 清理；討論雲端費用預算通知，提醒預算通知不是硬性停機額度。 / Configure TTL and agreed budget alerts.
8. 重新同步 source 至暫存 runtime，npm ci/build、functions npm ci；只部署此 codebase teacherLogin、此專案 rules 和 Hosting site。不要無限制部署其他 Functions。 / Scope deployment to this site and codebase.
9. 真實手機/第二台電腦登入、上傳/選課/讀圖/備份；未登入請求必須被拒絕；檢查退出登入與 8 小時授權期限。 / Verify real cross-device and unauthorized access flows.
10. 老師在 Chrome/Edge 的觸控大螢幕親測手指、全螢幕、縮放後位置、畫筆與 8 秒揭曉。 / Teacher validates hardware behavior.

## 通行碼處理 / Passcode handling

- 不把通行碼或驗證值放到前端、Git、檔案、對話、參數或診斷紀錄。 / No PIN/hash in source, local files, logs or arguments.
- scripts/set-passcode.mjs 僅把加鹽 scrypt 值從記憶體經 stdin 傳給 Secret Manager，並防止 Firebase CLI 將 secret request 寫進本機 debug log。 / Secret setup uses memory and stdin; CLI diagnostics are suppressed only for that child process to avoid credential leakage.
- 設定程式尚未實際執行；正式登入端點尚未端到端驗證。 / Setup script not executed; live login unverified.
- 變更通行碼後需重新部署函式使用新 secret version；已發出的會話最長仍存續至 8 小時期限，若需立即失效應撤銷使用者 refresh tokens。 / Rotating PIN requires function redeploy; revoke sessions if immediate invalidation is required.

## 回退 / Recovery

保留前一個 Hosting release、Rules 與 Functions 版本，更新前先備份資料。還原 ZIP 會新增副本；內建 Scratch 入口不會被備份覆蓋，外部連結以新入口加入。 / Preserve releases and rules; additive ZIP restore leaves the built-in entry unchanged.
