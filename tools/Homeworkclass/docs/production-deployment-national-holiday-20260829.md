# 2026-08-29 國定假日增量正式部署紀錄

## 部署結果

- 教師於 2026-08-29 明確指示「正式部署」。
- Firebase 專案／Hosting site：`hwclass-479d2`。
- 正式網址：<https://hwclass-479d2.web.app>。
- Functions region：`asia-east1`；本次沒有修改或重新部署 Functions。
- 本次最小部署範圍：Firestore Rules、Firebase Hosting。
- 未部署／未變更：Firestore Indexes、Functions、Secrets、IAM、App Check 設定及正式教學資料。
- Firebase CLI 版本：15.23.0；Rules 與 Hosting 兩次部署皆 exit 0，CLI 均回報 `Deploy complete`。

## 部署來源與驗證

- 因 Google Drive 會鎖定 `node_modules` 與 Firebase 日誌，使用全新 Windows Temp 隔離部署目錄。
- 部署、讀回與文件保存完成後，已刪除該 Temp 部署目錄及其中的 production env 副本、依賴與日誌。
- 工作區與隔離部署來源共 39 個檔案逐一 SHA-256 相符；`.env.production.local` 只核對雜湊及必要鍵值是否存在，未輸出 site key。
- production env：Firebase mode、`asia-east1`、reCAPTCHA Enterprise、App Check site key 已設定，未啟用 Emulator。
- 前端測試：4 files、14 tests passed。
- Firestore Rules：12/12 Emulator tests passed；涵蓋 holiday、holiday-revoke、必填欄位、目標日期與 append-only 拒絕。
- Vite production build：360 modules；只有大於 500 kB 的既有 chunk 警告。

正式 build 檔案：

| 檔案 | bytes | SHA-256 |
|---|---:|---|
| `index.html` | 608 | `0B87035D905F9662F7067C1FE1FF283891037CE3DF2BBCA9443F84B76028A681` |
| `assets/index-BNJG_0_F.js` | 858573 | `75FFB015D5C54176A9E030E218934E3B500C8E4B660CB7D65823FAC817CB56BF` |
| `assets/index-CEFSG66i.css` | 44727 | `53259B83E9446A1089C6B2543F19A63C12A24C2EA8D6BF9ED982871BD33033CD` |
| `assets/exceljs.min-B9qbbmB3.js` | 929571 | `5DBDD2B71360BFBC61ECCECC03044EA89DEB6AF0F6262DFF3CEE422E5644ADBF` |

## 部署後讀回

- Firestore Rules 正式編譯成功、上傳成功並發布至 `cloud.firestore`。
- Hosting 找到並上傳 4 個 build 檔案，版本完成 finalize 與 release。
- 正式首頁可開啟；公開首頁、八班、20 節與教師後臺入口均正常顯示。
- 正式頁面實際載入 `/assets/index-BNJG_0_F.js` 與 `/assets/index-CEFSG66i.css`，和上述 build 檔名一致。
- 教師登入視窗顯示「Firebase 驗證模式」，沒有落入 demo 模式。
- 教師本人輸入通行碼後成功進入教師工作臺；正式資料模式顯示 `Firebase`。
- 設定頁成功讀回第三種異動「國定假日」、必填假日名稱與選填備註；正式課表異動歷程目前為 0 筆。
- 重新整理後仍維持登入，回到本週課表並顯示安全登出；等待 Firebase Auth 恢復完成後工作階段正常。
- 正式站實際載入 reCAPTCHA Enterprise 與本次 JS／CSS asset，瀏覽器 console error 為 0。

## 尚未建立正式測試資料的項目

- 協作者沒有取得或代輸六位數通行碼；教師本人完成輸入後才進行上述讀回。
- 未建立虛構的正式國定假日、撤銷、作業或課堂事件；條件式「撤銷國定假日」按鈕及 append-only 正式寫入，應以教師核准的真實日期驗收。
- 本次沒有重新驗證完整 CSV／XLSX／列印／JSON 正式資料匯出、30 分鐘／7 天工作階段、五次錯誤鎖 15 分鐘或 TTL。

## 變更界線

- 本次不 commit、不 push，也不處理父層儲存庫的其他專案。
- 後續 Rules、Hosting、Functions、Secrets、IAM、App Check 或資料清理仍須重新取得明確授權。
