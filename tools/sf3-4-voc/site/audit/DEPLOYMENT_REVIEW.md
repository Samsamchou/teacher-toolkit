# SF3–SF4 單字網站：Firebase 部署前確認

檢查日期：2026-08-09
目前狀態：本機網站已建置並驗證；正式部署尚未獲得 Checkpoint B 授權。

## Firebase 目標

| 項目 | 值 |
|---|---|
| Project ID | `sf3sf4voc` |
| Web App ID | `1:351311660417:web:372546105037d5eb5e9480` |
| 預定 Hosting URL | `https://sf3sf4voc.web.app`（尚未上線） |
| Functions 區域 | `asia-east1` |
| Storage bucket | `sf3sf4voc.firebasestorage.app` |
| Firebase 方案 | Blaze（即付即用） |

## 教材與資產

- 2 冊：SF3、SF4
- 8 課
- 63 個單字
- 63 張正式單字圖片
- 51 個原始 MP3
- 12 個單字採後端 TTS 備援：who、study、where、these、those、table、bag、forty-five、fifty、what time、o'clock、like
- 圖片全部為 640×640 progressive JPEG，單檔不超過 320,000 bytes。

## 驗證結果

- 設定驗證：通過，63 個單字、63 張圖片、51 個 MP3。
- 專案完整性：通過，錯誤 0、警告 0。
- Functions lint：通過。
- 本機瀏覽器 E2E：25 通過、20 依裝置／專案設計略過、0 失敗。
- 舊專案殘留字串掃描：0 筆。
- 專案原始碼金鑰／私鑰掃描：0 筆。
- 前端明碼教師密碼：未發現；教師入口使用 Firebase Authentication 與自訂 claim。
- 此資料夾目前不是 Git repository，因此 `git diff --check` 不適用。

## 預估付費或外部服務呼叫

- 圖片生成：已完成 64 次生成嘗試（63 張採用、1 張重生）；若內容不再修改，部署階段不需再生成圖片。
- OpenAI TTS：完整走過 8 課時，每個瀏覽器快取週期最多約 75 個不同文字輸出（63 個例句 + 12 個無 MP3 的單字）。不同裝置、不同快取週期或重播失去快取時可能再次呼叫。
- OpenAI STT：錄音模式每次送出錄音即 1 次；每位學生完整錄完 63 個單字且不重試時約 63 次，重試會增加。
- 手寫辨識：使用瀏覽器端 Tesseract，不呼叫 OpenAI OCR。
- Firebase Blaze、Cloud Functions、Firestore、Storage 與網路流量可能依實際使用量計費。

## Firebase 即時安全狀態

已完成的本機準備：

- Firestore Rules 僅允許登入學生新增指定資料類型；讀取、修改與刪除限教師／管理員 claim。
- Storage Rules 禁止學生直接寫入；錄音由後端 Functions 儲存，讀取與刪除限教師／管理員。
- OpenAI 金鑰只允許使用 Firebase Secret `OPENAI_API_KEY`，不放入前端或專案檔案。
- Functions 已限制來源、教材文字、錄音大小、學生代號格式與請求頻率。

Firebase 後台目前仍待設定：

- Authentication 尚未啟用；Anonymous、教師 Email/Password 與教師 claim 均待設定。
- Cloud Firestore 尚未建立。
- Storage 尚未初始化。
- Hosting 尚未初始化／部署。
- Functions 尚未部署。
- `OPENAI_API_KEY` Secret 尚未綁定。
- App Check 尚未設定。
- 用量／預算警示與配額尚待確認。

因此部署保護機制目前正確顯示 `DEPLOYMENT_BLOCKED`。

## 裝置驗證界線

- iPad 與手機版面、觸控事件、麥克風流程已用 Chromium 模擬測試。
- 尚未在實體 iPad Safari、實體手機與真實學生語音上驗證。
- 上線後仍會再跑正式網址 E2E，並清除測試資料；實體裝置抽查需另外進行。

## 授權後將執行

1. 初始化 Authentication、Firestore、Storage、Functions、Hosting 與 App Check。
2. 由使用者本人完成教師帳號密碼與 OpenAI Secret 的安全輸入，不在對話或檔案中傳送憑證。
3. 設定教師 claim、規則、配額／預算警示。
4. 部署到唯一確認的 Project `sf3sf4voc`。
5. 在正式網址測試桌機、平板／手機模擬、資產、TTS/STT、Auth/Firestore 與 HTTPS 麥克風。
6. 清除正式環境測試資料並完成交接報告。

正式部署授權文字可使用：`我確認部署到 Firebase 專案 sf3sf4voc，並同意啟用上述服務與可能產生的用量費用。`
