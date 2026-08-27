# HWG5 Story Reading Practice 交接 / Handoff

## 目前狀態 / Current status

- 正式網站 / Production site：<https://hwg5-su-to-u04-story.web.app>
- Firebase 專案 / Firebase project：`hwg5-su-to-u04-story`
- GitHub 主儲存庫 / GitHub repository：<https://github.com/Samsamchou/teacher-toolkit>
- 版本化路徑 / Versioned path：`tools/HWG5 SU to U04 Story`
- 本次正式程式提交 / Current implementation commit：`47f32ef3740a3f6a2e669e94dd734e78579cb4d8`
- 既有安全修復基線 / Previous security baseline：`929443062938a92a1e23255c37b094a5e74b7129`
- 2026-08-27 已正式部署 HWG5 與 HWG7 的 SU–U04，共 84 題；Hosting、Firestore Rules 與 Storage Rules 均已發布並讀回。
- The 2026-08-27 production release contains 84 assessed sentences across HWG5 and HWG7 SU–U04; Hosting, Firestore Rules, and Storage Rules were released and read back.
- 目前使用 Firebase AI Logic／Agent Platform、`gemini-3.7-flash`、結構化 JSON、reCAPTCHA Enterprise App Check，以及受 App Check 保護的 Cloud TTS Callable Function。
- 教師後臺已改用 Firebase Google Authentication，只允許已驗證的 `samchouou@gmail.com`；學生使用匿名登入與 owner UID 隔離，規則採預設拒絕及嚴格欄位驗證。
- The current implementation uses Firebase AI Logic / Agent Platform, structured JSON, reCAPTCHA Enterprise App Check, an App Check-protected Cloud TTS callable, anonymous student ownership, and verified allow-listed Google teacher access.
- Cloud Billing 已建立每月 NT$300 的 50%／80%／100% 實際支出警示；警示只通知，不會自動停止服務。
- Firestore 依每筆 `expiresAt` 做七個日曆月 TTL；Storage 的 `audio_records/` 沿用 215 天 lifecycle。兩者皆可能延遲執行，不保證到期瞬間刪除。
- Google Drive 備份已核對 211 檔、1,228,022 bytes，來源／備份缺檔、多檔與 SHA-256 差異皆為 0。

## 已完成的可重複 Skill / Completed reusable skill

`story-reading-assessment-site-builder` 已安裝於 `C:\Users\User\.codex\skills\story-reading-assessment-site-builder`，並以本專案完成「擴增既有站」與「重製新站但不部署」兩種 dry run。專案內保留可版控草稿、schema、驗證腳本、發布閘門與範例。

The installed `story-reading-assessment-site-builder` supports both extending this production site and generating a new no-deploy preview, with a versioned draft retained in this project.

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

- 尚未以學校實際學生裝置完成麥克風錄音、TTS 播放、AI 評分、Firestore 寫入及 Storage 上傳的全流程驗收。
- Firestore／Storage App Check 目前先維持監控；須在真實學生流程確認成功後，再由教師明確確認強制執行，避免直接鎖死正式站。
- 教師 Google 登入入口與 Auth provider 已設定，但帳號選擇與首次登入驗收必須由教師本人完成。
- Functions 相依套件目前有 10 個 moderate 間接弱點；不可直接使用會造成破壞性降版的 `npm audit fix --force`。
- 保留的 `HWG5 SU to U04 Story pre-sync 20260826-1605` 是未提交的舊版復原副本；其中舊 TTS 金鑰已在 Cloud Console 刪除。未取得刪除授權前不要移除該副本。

## 下次開工入口 / Next startup entry

1. 先讀本檔、`agent.md`、已確認的 RDQ、`public/`、`functions/`、`tests/`、`retention/`、`usage/` 與 `dry-runs/19-teacher-auth-security/`。
2. 在學校實際 Chrome／iPad 上由教師本人完成 Google 教師登入，再以測試學號完成一題真實錄音、TTS、AI 評分、Firestore 紀錄與 Storage 音檔讀回。
3. 確認學生端正式讀寫無誤後，再決定是否強制執行 Firestore／Storage App Check；變更前須顯示實際專案 ID、影響服務與復原方式。
4. 新增單元時使用 `$story-reading-assessment-site-builder` 的模式 B；先預覽並確認教師題庫，再做隔離 dry run、回歸測試、備份與經授權的正式部署。
