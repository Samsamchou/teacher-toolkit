# 部分遊戲紀錄與 365 天新錄音期限：本機 QA 報告

日期：2026-09-01  
專案：`setencerevieworalpractice`（2026-09-01 已完成正式部署與讀回驗證）

## 已實作需求

- 每題必須依序完成「口說評分 → 允許發射 → 彈珠落袋計分」後，才把該題寫入教師紀錄。
- 第 1 題起即以同一個 `gameSessionId` 冪等更新；重送不會新增重複局，舊進度不得覆蓋較新進度。
- 部分局顯示已完成題目的實際口說平均（四捨五入）與當下彈珠總分；未作答題目不補 0 分。
- 1–11 題為部分局，不增加 `completedGameCount`，也不影響下一局固定的題型輪替規則。
- 第 12 題完成時，把同一筆部分紀錄升級為完整局；完整 12/12 若缺任一玩家的 6 個有效 `bestScore` 或彈珠分數，仍顯示「—／資料不完整」。
- 返回首頁會先嘗試補送待存進度，再將部分局標記結束；重新進入一律開新局，不續接舊局。
- 寫入失敗不阻擋下一題；下一題、返回首頁或完整結算時會重試。強制關閉瀏覽器時，以最後成功寫入的進度為準。
- 正式更新上線後建立的新錄音保存 365 天；既有錄音仍依各自既有的 `expiresAt` 清理，不追溯延長。
- 教師列表、明細及 CSV 均可辨識部分局／完整局與已完成題數。

## 自動驗證結果

| 項目 | 結果 |
|---|---:|
| 網站測試 | 60/60 通過 |
| Functions 單元測試 | 88/88 通過 |
| Functions 語法檢查 | 通過 |
| 題庫驗證 | HWG7 SR 13/13；250 局輪替抽樣通過；13 張題圖有效；0 error／0 warning |
| JSX 編譯檢查 | 通過（1 個 Babel script） |
| 公開檔案秘密掃描 | 394 個檔案通過，未發現金鑰或可疑秘密字串 |
| Firebase 設定鏡像 | 根目錄與 `config/` 內容一致 |
| Git whitespace 檢查 | 通過；僅有 Git 的 LF/CRLF 提示 |
| 部署閘門（無授權口令） | 預期阻擋，未部署 |

## Firebase Emulator 整合驗證

在隔離的本機暫存副本執行 Auth、Functions、Firestore、Hosting、Storage Emulator，已驗證：

- 第 1 題 checkpoint 寫入、相同內容重送冪等。
- 第 2 題 checkpoint 可向前更新；較舊進度不得回退覆蓋。
- 部分局教師明細顯示 2 次有效作答，且完整局計數仍為 0。
- 返回首頁後保留部分紀錄；完整 12 題可升級同一筆紀錄，完整局計數成為 1。
- 完成請求重送保持冪等。
- 未登入讀取教師錄音回 401；已登入可取得測試錄音。
- 瀏覽器直接匿名讀取 Firestore 與 Storage 均遭拒絕。
- 軟刪除後查詢不再顯示該局；教師登出後請求回 401。

註：因 Google Drive 串流目錄不適合直接安裝完整 `node_modules`，Emulator 在隔離的本機暫存副本執行；主機 Node.js 為 24，而正式 Functions 設定仍固定 Node.js 22。這不取代正式環境讀回驗證。

## 版面回歸

- HWG7 SR 13 題 × 3 個尺寸，共 39/39 通過。
- 尺寸：Windows Chrome 1366×768、1920×1080，以及 1024×768 iPad Safari User-Agent／觸控橫式模擬。
- 缺圖替代狀態另測 1 張並通過。
- iPad 項目是 Chromium 中的尺寸、UA 與觸控模擬，不等同實體 iPad Safari。

版面明細：`C:\Users\User\.codex\visualizations\2026\08\21\01a02411-24ce-74d3-a780-7fecb1ad22d5\qa\question-image-layout-hwg7-sr-20260824\summary.md`

## 正式部署與讀回（2026-09-01）

- 授權口令：`確認部署 setencerevieworalpractice`。
- 部署來源：不含本機 `.env.local` 的隔離副本；474 個來源檔案逐檔 SHA-256 相符，部署閘門通過。
- 第一次 Functions 探索在 Firebase CLI 預設 10 秒內逾時，尚未發布；改用既有驗證方式將探索時限提高至 60 秒後，使用相同程式碼重新部署成功。
- Firebase Hosting：395 個公開檔案發布完成，正式網址為 `https://setencerevieworalpractice.web.app/`。
- Functions：新增 `saveGameProgress`，並更新其餘 8 個 Functions；讀回 9/9 均為 `ACTIVE`、`asia-east1`、`nodejs22`。
- 部署副本執行 `npm audit --omit=dev`：0 個 high、0 個 critical，另有 9 個 moderate；建議修復涉及主要版本變更，因此本次未自動改版，避免未驗證的相容性風險。
- `evaluateSpeech` 仍綁定 Firebase Secret 名稱 `OPENAI_API_KEY`；未讀取或輸出 Secret 值。
- Storage：正式 bucket 原有的 `recordings/` 30 天刪除規則已改為 365 天，並從 Cloud Console 讀回；Google 提示規則最多需 24 小時生效。
- 新錄音的程式端 `expiresAt` 為 365 天；排程清理仍逐筆依既有 `expiresAt`，因此既有錄音不追溯延長。

### 正式 Hosting／API 證據

- 正式靜態檢查 9/9 通過。
- 4 個核心公開文字檔、28/28 題圖、22/22 TTS 均為 HTTP 200 且 SHA-256 與部署來源一致。
- HWG7 SR 13 題、HWG5 SR 15 題均為 ready；兩份私有 JSON 題庫均為 404。
- 缺少 App Check 的開局與新進度 API 均回 401 `app_check_required`；錯誤 Origin 回 403 `origin_not_allowed`。
- 教師錄音端點在缺少 App Check 時回 401；匿名 Firestore 與 Storage 均回 403。
- 正常 Chrome 成功載入首頁、取得 App Check、以測試代碼 `99991`／`99992` 開啟 HWG7 第一題，返回首頁時 `/api/game/abandon` 回 200；瀏覽器沒有 error log。

### 正式自動瀏覽器限制

隔離式 headless Chrome 取得 reCAPTCHA App Check token 時遇到既有的 24 小時 403 節流，因此完整自動瀏覽器腳本未標記為全數通過。沒有停用 App Check、建立 debug token或降低正式安全設定；改以正常 Chrome 完成開局／安全放棄，並把下列項目保留為人工／後續驗收。

## 尚未執行

- 尚未在實體 iPad Safari 上驗證 App Check、麥克風、觸控與真實學生流程。
- 尚未用正式語音建立一題「評分 → 發射 → 落袋 → 部分紀錄」測試資料，因此新錄音的 365 天 `expiresAt` 尚未以正式資料讀回。
- 因 headless App Check 節流，本次沒有以有效 App Check token單獨重驗教師端「有 App Check、無教師 session」的 401；本機 Emulator 已通過該項。

本次部署授權已使用；未來再次部署前仍須重新收到精確口令：

`確認部署 setencerevieworalpractice`
