# HWG5 Story Reading Practice 交接 / Handoff

## 目前狀態 / Current status

- 正式網站 / Production site：<https://hwg5-su-to-u04-story.web.app>
- Firebase 專案 / Firebase project：`hwg5-su-to-u04-story`
- GitHub 主儲存庫 / GitHub repository：<https://github.com/Samsamchou/teacher-toolkit>
- 版本化路徑 / Versioned path：`tools/HWG5 SU to U04 Story`
- 正式程式提交 / Implementation commit：`929443062938a92a1e23255c37b094a5e74b7129`
- 收尾文件提交 / Documentation commit：`d38d876ef2aaa43f9c38ff4e6dacb905edc33a03`
- 目前使用 Firebase AI Logic／Agent Platform、`gemini-3.7-flash`、結構化 JSON、reCAPTCHA Enterprise App Check，以及受 App Check 保護的 Cloud TTS Callable Function。
- The current implementation uses Firebase AI Logic / Agent Platform, `gemini-3.7-flash`, structured JSON, reCAPTCHA Enterprise App Check, and an App Check-protected Cloud TTS callable function.

## 下次首要工作 / Next primary task

建立一個可重複使用的 Codex Skill，暫定名稱為 `story-reading-assessment-site-builder`。Skill 必須支援以下兩種模式，並以本專案作為已驗證的基準實作。

Create a reusable Codex skill, provisionally named `story-reading-assessment-site-builder`. It must support the following two modes and use this project as the verified reference implementation.

### 模式 A：重製新網站 / Mode A: build a new site

教師只需提供：

1. 網站名稱。
2. 主題與單元清單。
3. 每個單元的句子文本與發音分析。

The teacher provides only the site name, theme/unit list, and sentence text with pronunciation analysis for each unit.

Skill 應完成：

- 需求讀回與題庫預覽，禁止猜測缺少的正式句子或發音標準。
- 將教師資料轉成可驗證的結構化題庫，保留句子、難字／音素、重音、連音、節奏與語調欄位。
- 複製本網站的學生登入、主題選擇、示範音、錄音、AI 評分、每題每日最多 3 次、剩餘次數、教師紀錄及 7 個月保存機制。
- 使用 Firebase AI Logic／Agent Platform、穩定模型、結構化 JSON、reCAPTCHA Enterprise App Check 與後端 TTS，不在前端或 Git 儲存 AI／TTS 金鑰或 App Check debug token。
- 先完成本機測試、題庫／資產驗證、秘密掃描與瀏覽器預覽；使用者明確要求部署並確認 Firebase 目標後，才建立或更新雲端資源。
- 建立專案備份、限定 Git 範圍提交、部署讀回與交接紀錄。

The skill must read back and preview the teacher-approved bank, generate a validated structured data source, reproduce the verified practice/scoring/reporting/retention flow, run local and browser QA, and deploy only after an explicit target confirmation.

### 模式 B：擴增現有正式網站 / Mode B: extend the production site

教師可直接提供新單元，例如「HWG5 U04 句子的文本發音分析」，並要求擴增與部署。

The teacher may directly provide a new unit, such as “HWG5 U04 sentence text and pronunciation analysis,” and request expansion plus deployment.

Skill 應完成：

- 固定目標為現有專案 `hwg5-su-to-u04-story`，除非教師另行明確指定。
- 解析並預覽新單元；確認單元代碼、顯示名稱、句子順序、示範音文字與發音分析後再寫入正式題庫。
- 只新增或更新指定單元，不改動其他單元的句子、評分欄位、畫面、Firebase 目標或既有學生紀錄。
- 新資料繼續寫入 `reading_records`，使用建立日後七個日曆月的 `expiresAt`；錄音繼續放在 `audio_records/`，沿用 215 天 Storage lifecycle。
- 執行回歸測試、結構化 JSON 驗證、App Check／TTS／評分 smoke test、秘密掃描與正式網站讀回。
- 當教師的同一則要求明確包含「部署／佈署」時，可視為該次 Hosting／Functions／必要 Firebase 設定的部署授權；仍須在執行前顯示實際專案 ID、網站網址、模型、配額、資料路徑與保留期限。
- Google Drive 與 GitHub 只處理 `tools/HWG5 SU to U04 Story`，不得混入父儲存庫其他平行工作。

## 建議輸入格式 / Suggested input format

```text
模式：新建網站／擴增 HWG5 正式站
網站名稱：
主題與單元：

單元：HWG5 U04
1. 句子：...
   難字／音素：...
   重音：...
   連音與節奏：...
   語調：...

要求：只預覽／建立本機版／建立並部署
```

The skill should also accept natural-language input, but normalize it into the above contract and show a reviewable question bank before finalizing educational data.

## 必要驗收 / Required acceptance

- 題庫內容與教師輸入逐項一致，缺少欄位不自行補猜。
- 評分結果必須通過結構化 JSON 驗證並保留既有畫面欄位。
- App Check 正式環境使用 reCAPTCHA Enterprise；本機 debug token 不寫入 Git。
- AI 金鑰與 TTS 憑證不出現在前端、Git、測試報告或交接文件。
- 新建站與擴增站都要有題庫測試、靜態整合測試、瀏覽器 smoke test、正式網址讀回、備份雜湊與限定範圍 Git 驗證。
- 不把自動測試等同於學校 iPad／真實學生語音驗收；第一次正式使用前仍需真人麥克風校準。

## 已知待改善 / Known follow-ups

- 現有教師後台仍使用前端提示密碼，不是可靠的安全邊界；Skill 正式化時應將新站預設改為 Firebase Auth／教師身分宣告與安全規則。
- Functions 相依套件目前有 10 個 moderate 間接弱點；不可直接使用會造成破壞性降版的 `npm audit fix --force`。
- 保留的 `HWG5 SU to U04 Story pre-sync 20260826-1605` 是未提交的舊版復原副本；其中舊 TTS 金鑰已在 Cloud Console 刪除。未取得刪除授權前不要移除該副本。

## 下次開工入口 / Next startup entry

1. 先讀本檔、`agent.md`、已確認的 RDQ 規格、`public/index.html`、`public/ai-scoring.js`、`public/ai-scoring-core.js`、`functions/index.js`、`tests/`、`retention/` 與 `usage/`。
2. 使用 `$skill-creator` 建立 Skill；不要只寫說明文件，需包含模板、題庫 schema、驗證腳本、部署前閘門與兩種模式的範例。
3. 以本專案做「擴增既有站」dry run，再建立一個不部署的示例新站驗證「重製新站」模式。
4. 教師確認 Skill 行為與題庫預覽後，才安裝到個人 Codex skills 目錄並進行正式擴增／部署。
