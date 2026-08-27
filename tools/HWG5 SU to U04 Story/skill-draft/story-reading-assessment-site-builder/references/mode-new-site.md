# 模式：重製新站

## 隔離原則

新站是獨立專案。可以重用流程與經驗，不可重用正式站的 Firebase config、App Check site key、秘密、教師密碼、學生資料或 production target。

## 工作流程

1. 依內容契約完成題庫回讀；沒有教師確認就停在 dry run。
2. dry run 生成本機靜態內容預覽與預計專案樹。預覽不含錄音、AI 評分、雲端 TTS 或 Firebase。
3. 教師確認後，在新資料夾建立可獨立測試的網站：學生輸入學號、選主題/單元、聽示範、錄音、評分、翻譯、難字提示與教師後台。
4. 先用固定測試資料驗證評分核心、結構化 JSON、三次限制、記錄 schema 與七個月到期日。
5. 只有教師另外授權 Firebase 設定後，才建立或連接新 Firebase project。

## 安全預設

- 依執行當下官方 Firebase 文件與本地 Firebase skills 選用目前支援的 Firebase AI Logic SDK 與穩定模型；在變更前顯示實際模型與後端設定。
- AI 評分使用結構化 JSON schema 與應用程式端驗證；格式不合就拒絕，不以脆弱字串解析硬接。
- 正式 App Check 使用 reCAPTCHA Enterprise；本機 debug token 只存於本機且必須被 Git 忽略。
- AI 金鑰與服務帳戶不進前端。TTS 使用受保護的 Callable Function 並驗證 App Check。
- 新站教師後台預設使用 Firebase Authentication 與教師 claim/rules，不複製前端明碼密碼。
- 每日每題最多三次計分；班級預估預設 26 人。變更配額前顯示 `班級人數 × 題數 × 每題次數` 與安全餘量。
- Firestore 記錄使用 `expiresAt = 建立日 + 7 個月曆月`。Storage 設到期 metadata/lifecycle；清理可能延遲，不保證到期瞬間刪除。
- 提供告知與同意文字；正式啟用前確認學生姓名/學號、錄音與成績的可見範圍。

## Dry run 輸出限制

`preview/public/index.html` 只是題庫與發音分析的審核頁，不是完整學生站，也不是部署證據。不得以 dry run 的靜態頁聲稱麥克風、AI、TTS、App Check、Auth、Firestore 或 retention 已完成。
