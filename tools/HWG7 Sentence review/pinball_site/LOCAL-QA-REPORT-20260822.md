# HWG7 SR 口說評測網站｜正式部署與最終 QA 報告

## 結論

Firebase 專案 setencerevieworalpractice 已正式部署，線上驗證 15／15 通過，可交給學生進行小規模試用。

- 正式網址：https://setencerevieworalpractice.web.app
- 線上驗證時間：2026-08-22 16:26（Asia/Taipei）
- 題庫版本：hwg7-sr-v1-confirmed
- 評分公式版本：a1-v1
- 正式題庫：13 題；每局 12 題；A、B 各 6 回合；達標門檻 80 分（含）

本次沒有關機。實體 iPad Safari 的麥克風權限與教師本人輸入通行碼登入，仍須由教師在真機親自抽查；這兩項不影響網站目前提供學生試用。

## 已部署範圍

- Firebase Hosting：首頁、13 張題圖、遊戲、口說錄音、評分結果與教師後台。
- Cloud Functions v2：startGame、abandonGame、evaluateSpeech、completeGame、teacherLogin、teacherApi、cleanupExpiredRecordings。
- Runtime：Node.js 22；區域：asia-east1。
- Firestore：(default)、asia-east1、刪除保護已啟用。
- Cloud Storage：setencerevieworalpractice.firebasestorage.app、ASIA-EAST1；recordings/ 30 天生命週期。
- 排程清理：每天 03:15（Asia/Taipei）。
- OpenAI Secret：OPENAI_API_KEY v1 已啟用，只供後端 Function 使用；前端與報告不含金鑰。
- Web App Check：reCAPTCHA Enterprise 已設定；只允許正式 web.app 與 firebaseapp.com 網域。Functions 會驗證 App Check token，缺少 token 時回 401。
- 帳務保護：每月 TWD 300 預算；50%、90%、100% 門檻通知。
- AI 硬上限：每位學生每日 60 次、每局每分鐘 12 次、專案每日 2,000 次；重複請求 claim 租期 2 分鐘。

## 已確認的學生流程

- 首頁單元順序固定為 HWG7 SR、HWG5 SR、HWG8 SR、HWG6 SR；只有 HWG7 可選，其餘停用並顯示「題庫準備中」。
- 首頁第一、第二個學生代碼分別固定為 A、B；只接受兩個不同的 5 碼代碼。
- 13 題均在題幹上方顯示自己的圖片，並有替代文字與缺圖穩定版面。
- 同一局嚴格輪流：A 題型一、B 題型二；只有完整結束才翻轉下一局為 A 題型二、B 題型一。
- 放棄局不翻轉；重送已完成局為冪等，不會重複翻轉。
- 每題最多 3 次有效嘗試；80 分（含）達標。三次未達標會顯示正確示範、記錄 not_met，仍可發射彈珠。
- 題型二畫面明確提示「先讀問句，再說出答案」；短答與完整答若列在可接受答案中，答句本身均按滿分答案版本計算。

## 固定評分公式參考

OpenAI 僅負責英文轉錄與質性回饋；分數由網站後端的版本化公式決定。

### 題型一：Read aloud

    總分 = 文字準確度 × 40% + 完整度 × 35% + 流暢度 × 25%

### 題型二：Read and answer

預設同一段錄音必須包含「朗讀問句＋口說答句」。

    答句準確度 = 核心答案正確度 × 70% + 句型正確度 × 30%
    題型二準確度 = 問句準確度 × 30% + 答句準確度 × 70%
    題型二完整度 = 問句完整度 × 30% + 答句完整度 × 70%
    總分 = 準確度 × 50% + 完整度 × 30% + 流暢度 × 20%

必要核心答案錯誤或沒有回答時，題型二總分上限為 59。若日後要改成只錄答句，題庫必須明確加入 answerOnly: true 並另立公式版本；目前沒有這項覆寫。

## 最終驗證證據

| 驗證 | 結果 |
|---|---:|
| 題庫結構與圖片 | PASS；13／13 題、13 張圖、10 個滿分答案版本、0 warning、0 error |
| 抽題與輪流模擬 | PASS；500／500 局嚴格輪流 |
| 網站單元／版面／評分測試 | PASS；29／29 |
| Functions 單元與安全測試 | PASS；47／47 |
| Firebase Emulator | PASS；完成翻轉、放棄不翻、重送冪等、教師篩選／詳情／登出、匿名存取拒絕 |
| 13 題圖片同屏 | PASS；26／26（Windows 1366×768、iPad 橫式 1024×768 模擬） |
| 缺圖替代畫面 | PASS；提示可見、框高與題幹位置穩定 |
| 正式部署門檻 | PASS；目標專案、Node 22、13 題、App Check 均確認 |
| 正式線上綜合 QA | PASS；15／15，瀏覽器 console／載入錯誤 0 |
| 正式完整局 | PASS；12／12 題達標、12／12 錄音保存、完成後翻轉一次 |
| 第 13 題 | PASS；逐字稿 She would like some salad.、99 分、達標 |
| App Check／來源限制 | PASS；缺 App Check 401、錯誤 Origin 403 |
| 匿名 Firestore／Storage | PASS；403／403 |
| npm production audit | 0 critical、0 high、9 moderate |

完整局使用本機合成英語音檔驗證正式 gpt-4o-mini-transcribe 與後端流程。12 題中 11 題為 100 分；第 5 題合成音被轉錄為 There his caps.，仍依固定公式得 87 分並通過 80 分門檻。另有單元測試確認標準句 They’re his caps. 可得滿分。

## 正式線上安全與邊界

- Hosting CSP 已加入 reCAPTCHA Enterprise 官方來源；首頁不再產生 CSP 或 favicon 錯誤。
- LOCAL-QA-REPORT-20260822.md、星號.log、qa/、tmp/、scripts/ 與題庫原始 JSON 不會公開；實際 HTTP 回應已確認 404。
- 瀏覽器不可直接讀寫 Firestore／Storage；正式資料只由後端 Admin SDK 存取。
- 教師驗證文件位於 Admin-only privateConfig/teacherAuth，只保存 scrypt salt、hash 與參數，不保存六碼明文。
- 教師登入有 5 次失敗鎖 15 分鐘、閒置 30 分鐘、絕對到期與不透明 session token。
- 錄音預設保存 30 天，Storage lifecycle 與排程 Function 共同清理。
- 最終線上 QA 使用的固定測試代碼、測試局、合成錄音、作答與個別用量文件均已精準刪除；三組測試代碼查回 0。專案每日用量總計保留作帳務稽核。

## 交付與 QA 證據

- Google Docs 題庫：https://docs.google.com/document/d/1ikQIKRV8XiLJDvZ0twrGY77uuJo6f7CHWAdOd15h1Q0/edit
- 線上機器可讀報告：qa/live-deployment-20260822/report.json
- 線上畫面：qa/live-deployment-20260822/desktop-home-1366x768.png、ipad-landscape-home-1024x768.png、ipad-landscape-game-first-question-1024x768.png
- 逐題版面報告：qa/question-image-layout-20260822/report.json 與 summary.md
- 失敗診斷證據保留於 QA 目錄，方便日後追查 CSP 修正；不會部署到 Hosting。

## 已知限制與學生試用建議

- iPad 驗證使用 Chromium headless、1024×768 橫式、觸控與 Safari User-Agent 模擬，不等同實體 Safari WebKit。
- Windows 應用程式的互動瀏覽器橋接因本機沙箱 helper_unknown_error 無法啟動，因此改用隔離的 Chrome DevTools Protocol；未取用使用者瀏覽器 cookies 或登入狀態。
- 9 個 moderate 為 Firebase／Google 的傳遞相依套件告警；直接套件 firebase-admin 14.3.0、firebase-functions 7.3.2 已是目前安裝來源的最新版，未用強制 override 破壞相容性。
- Firebase 產品層級的 App Check enforcement 尚未另行強制；Functions 已自行驗證 token，匿名 Firestore／Storage 也由規則拒絕。可先觀察正式流量，再決定是否開啟產品層級 enforcement。

建議先讓 5 位學生在實體 iPad Safari 橫式完成一局，教師同時確認：麥克風允許、12 回合都能錄音、三次未達標仍能發射、完整局後題型翻轉、教師後台能看到紀錄。通過後即可擴大到全班。
