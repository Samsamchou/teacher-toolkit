# QA 與發佈閘門

## 內容 QA

- JSON schema 與自訂驗證全數通過。
- theme/unit/item ID 唯一；題數與教師原稿一致。
- 每句英文、中文、難字、重音、連音、節奏、語調、評分焦點逐句回讀。
- SSML XML 可解析，靜態示範音檔逐句存在且人工聽讀。
- 不可用 dry-run 樣本、AI 自行補寫或未確認翻譯取代教師內容。

## 本機功能 QA

- 頁面載入、主題/單元切換、翻譯、示範音、錄音開始/停止、逾時與失敗狀態。
- 結構化評分：合法結果、缺欄位、型別錯誤、超範圍、非 JSON、提示注入式內容。
- 評分欄位與公式保留，畫面不因模型回覆字序或額外文字失敗。
- 每日每題三次的成功計分與失敗不扣次。
- Firestore 文件與 Storage metadata 都有到期資訊；月曆月跨月案例測試。
- 教師權限、Firestore/Storage Rules 與 App Check 做 emulator/規則測試。

## 真機與外部 QA

以下不能由單純 local test 取代：

- Chrome/iPad 的麥克風允許、錄音格式與實際學生流程。
- Firebase Console 中 reCAPTCHA Enterprise、App Check enforcement、Agent Platform、Functions、TTL/lifecycle、budget/usage alerts。
- 教師登入與授權規則。
- 正式 URL 的 TTS、AI 評分、寫入、讀取與刪除生命週期。

## 三個獨立批准

1. `確認內容`：允許把已回讀題庫寫入本機來源；不代表安裝或部署。
2. `確認安裝 Skill`：允許把已驗證的 Skill 複製到指定 Skills 目錄；不代表部署。
3. `確認正式部署`：只在顯示專案 ID、hosting target、預計配額、費用/個資風險、測試結果與變更清單後，允許正式部署。

GitHub push、Firebase Console 登入或新增付費資源若未包含在明確授權中，要再分開確認。登入由教師本人完成；不可要求密碼。

## 發佈前讀回

- `git status --short` 與只包含目標路徑的 diff。
- 測試總數與失敗數。
- Firebase project ID、hosting site、Functions region、模型、App Check provider。
- 班級 26 人、實際題數、每題 3 次、理論每日上限、擬設門檻與警示。
- retention 是七個月曆月；TTL/Storage 刪除可能延遲。
- 備份目標與 SHA/manifest；不可把複製嘗試說成備份成功。

正式部署後才可報告正式 URL 與部署結果；還要以正式網址走一次學生與教師流程，明列無法自動驗證的項目。
