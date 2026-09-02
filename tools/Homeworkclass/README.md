# 英語作業與課堂紀錄 / English Homework and Classroom Records

這是供單一國小英語教師使用的響應式紀錄網站。網站以週課表為入口，管理作業、繳交與補交歷程、課堂事件、跨週查詢及匯出。

This responsive web app is designed for one elementary English teacher. It uses the weekly timetable as the main entry point for assignments, submission and make-up history, classroom incidents, cross-week reporting, and exports.

## 目前狀態 / Current status

目前已正式部署至 [https://hwclass-479d2.web.app](https://hwclass-479d2.web.app)，使用 Firebase 專案 `hwclass-479d2` 與 `asia-east1`。2026-08-29 已完成 Firestore、Rules／Indexes、App Check、Secret Manager、第二代 Cloud Function、Firebase Authentication、自訂權杖最小 IAM 與 Hosting 設定；教師通行碼登入及重新整理後工作階段均已在正式站通過。所有內建登入供應商維持關閉，本回合未新增或刪除正式教學紀錄。

2026-08-29 新增的「國定假日／撤銷國定假日」已完成本機驗收，並依教師明確授權正式部署 Firestore Rules 與 Hosting。教師本人登入後已讀回 Firebase 模式、設定頁國定假日表單及重新整理後工作階段；沒有建立虛構的正式假日或撤銷紀錄。

2026-09-02「作業作廢／課堂事件刪除／30 天回收區」增量已完成本機與 Emulator 驗證，並依教師明確授權部署 `asia-east1-deleteTeacherRecord`、Firestore Rules、`deletedRecords.purgeAt` TTL 與 Hosting。正式 Rules、Function、TTL、Hosting release、4 個靜態檔案雜湊及 Firebase 驗證模式均已讀回；本次沒有建立或刪除正式教學紀錄。

The production site is live at `https://hwclass-479d2.web.app`. Firestore, Rules/Indexes, App Check, Secret Manager, a second-generation callable Function, Firebase Authentication, minimal custom-token IAM, and Hosting were deployed and read back on 2026-08-29. Live teacher sign-in and session persistence after reload passed. Built-in sign-in providers remain disabled, and this verification did not create or delete production teaching records.

正式需求以 [第 3 版 confirmed RDQ](rdq/RDQ-spec-homeworkclass-20260829.md) 為準。

The authoritative requirements are the confirmed third revision of the RDQ specification.

## 可重製 Skill / Reusable Skill

2026-08-30 已完成並安裝個人 Codex Skill `homeworkclass-site-builder`。專案內可攜副本位於 [skill-package/homeworkclass-site-builder](skill-package/homeworkclass-site-builder)，個人安裝位置為 `C:\Users\User\.codex\skills\homeworkclass-site-builder`。需求依據是 [Skill confirmed RDQ](rdq/RDQ-spec-homeworkclass-site-builder-20260829.md)。

Skill 支援兩個互斥模式：同一位教師新增學期（`semester-update`），或替其他教師建立不含原教師資料與 Firebase 身分的隔離空白站（`teacher-clone`）。來源確認只允許本機建置；Firebase、IAM、Secrets、App Check、Rules、Functions、Hosting、計費與正式資料異動仍需另行逐項授權。

安裝前後均為 68 檔、逐檔 SHA-256 差異 0；官方格式驗證、17 項離線正負自測與整包個資／秘密／來源身分掃描均通過。隔離 clone 另通過 10 項前端測試、6 項 Firestore Rules Emulator 測試、前端與 Functions build、CSV／XLSX／JSON 讀回，以及 360／768／1440 響應式檢查。前端與 Functions production dependency audit 均為 0 vulnerabilities。

目前正式 Homeworkclass 仍是沒有 `semesterId` 的 legacy v1。Skill 的 `semester-update` 規劃器會以 `REQUIRES_LEGACY_V1_ADAPTER_OR_MIGRATION` 阻擋直接覆寫；下一學期更新前必須先做唯讀相容層或另行授權的受控 migration。此次 Skill 建置與安裝沒有修改或部署 Firebase 正式站。

## 已確認範圍 / Confirmed scope

| 項目 / Item | 已確認內容 / Confirmed value |
|---|---|
| 網站名稱 / Site name | 英語作業與課堂紀錄 |
| 使用者 / User | 單一教師；無學生、家長或多教師入口 |
| 學期 / Semester | 2026-08-31 至 2027-01-20，起訖日均納入 |
| 時區 / Timezone | Asia/Taipei |
| 課表 / Timetable | 20 節：英語 12、在地 4、國際歌謠 4 |
| 班級 / Classes | 六甲、六乙、五甲、五乙、四甲、四乙、三甲、三乙 |
| 名冊 / Roster | 155 個有效座號；只保存班級與座號 |
| 週檢視 / Week view | 週一至週五；停課、調課、補課、國定假日與撤銷皆另存歷程 |
| 作業視窗 / Assignment window | 前 5 個實際上課日，可跨週；較舊未結案作業不消失 |

八班採不同多巴胺主色，但顏色不作為唯一識別；畫面同時顯示班級文字、狀態文字或圖示。

Each class has a distinct dopamine-inspired color. Color is never the only identifier; class and status text or icons remain visible.

## 主要功能 / Main features

1. **週課表登記作業**：點日期與節次後自動帶入科目、班級與上課時間，再選課本、習作、線上練習／學習單或小考並輸入內容。
2. **座號式繳交登記**：先一鍵全班已交，再逐號記錄請假、無故或其他原因，以及仍未交、當天完成或日後補交；人數由有效座號自動計算。
3. **補交歷程不覆寫**：補交以新事件保存實際日期，原始未交狀態仍可回查。
4. **課堂事件**：依日期、節次、班級與科目記錄遲到、聊天、不守秩序、未帶課本／習作／文具，可指定座號或只留簡短事實。
5. **查詢與提示**：依日期範圍、班級、座號及科目查詢；預設權重為遲到 1、聊天 1、未帶用品 1、不守秩序 2，達 4 分只提示「需教師確認」，不自動診斷或懲處。
6. **匯出與備份**：提供篩選範圍的 CSV、XLSX、列印摘要，以及全資料 JSON 備份。
7. **國定假日**：可在學期任一日期建立整日不上課；同日舊資料保留並標示衝突，撤銷以必填原因新增歷程，不刪除原假日或其他紀錄。
8. **受控刪除**：錯誤作業以作廢狀態保留原件並原子回收關聯繳交歷程；課堂事件移入教師限定的 30 天回收區。回收資料不可還原，永久稽核只留類型、原始 ID、時間與筆數。

1. Assign homework from a dated timetable slot.
2. Track each valid seat and calculate totals from the roster.
3. Preserve make-up submissions as new dated events.
4. Record factual classroom incidents by class period.
5. Filter reports and show teacher-review prompts without automated labels.
6. Export CSV/XLSX/print reports and a full JSON backup.
7. Add append-only whole-day holidays and reasoned revocations without deleting prior records.

## 資料模式 / Data modes

| 模式 / Mode | 儲存位置 / Storage | 登入與安全 / Sign-in and security | 使用界線 / Intended use |
|---|---|---|---|
| demo（預設） | 當前瀏覽器 localStorage，鍵名 homeworkclass.snapshot.v1 | 只檢查輸入是否為 6 位數；沒有後端驗證或 IP 鎖定。JSON 可在瀏覽器整份還原 | 只用假資料做本機展示；不可當正式學生紀錄系統 |
| firebase | Firestore、Firebase Authentication、Cloud Functions | 後端驗證 6 位 PIN、簽發固定教師 custom token、App Check、Rules 與每 IP 限流 | 正式站已啟用；每次增量仍須先通過測試、取得授權並完成部署後讀回 |

In demo mode, any six-digit value only satisfies the local format check. It is not authentication. Data stays on that browser and can be lost when site storage is cleared.

In Firebase mode, browser writes use authenticated Firestore access. Normal assignment, submission, classroom-incident, and timetable-exception writes remain append-only. Confirmed deletions can only run through the App Check- and teacher-protected callable; browsers still cannot directly update or delete Firestore documents. Browser-based cloud restore is intentionally disabled.

## 通行碼與工作階段 / PIN and session policy

- 教師後臺只接受 6 位數通行碼；真實 PIN 必須由教師本人於部署階段設定，且不得寫入前端、Git、聊天或文件。
- Firebase Function 以 bcrypt 雜湊驗證；同一來源 IP 連錯 5 次鎖定 15 分鐘，成功登入會清除該 IP 的失敗計數。
- 共用裝置使用 sessionStorage，閒置 30 分鐘登出；滑鼠點擊或鍵盤活動會延長閒置期限。
- 私人裝置使用 localStorage，最長保留 7 天；另提供手動登出。
- 六位 PIN 不是高熵密碼或 MFA；App Check、bcrypt 與限流只能降低風險。

- The real PIN is teacher-controlled and must never be committed or pasted into project files.
- Firebase mode locks the source IP for 15 minutes after five failed attempts.
- Shared-device sessions expire after 30 minutes of inactivity.
- Private-device sessions expire after seven days.
- A six-digit PIN is not MFA; the surrounding controls reduce but do not eliminate risk.

## 本機展示 / Local demo

先安裝 Node.js 22 與 npm。安全預設在 [.env.example](.env.example)；不要把秘密填入 Vite 環境檔。

Install Node.js 22 and npm first. The safe default is demo mode, and no secret belongs in a Vite environment file.

    Copy-Item -LiteralPath .env.example -Destination .env.local
    npm.cmd ci
    npm.cmd run dev

開啟 Vite 顯示的本機網址，以假資料驗證桌機、平板與手機流程。展示模式只做格式檢查，可輸入任一 6 位測試數字；不要使用真實通行碼或真實學生紀錄。

Open the local Vite URL and test with synthetic data only. Do not reuse a production PIN or real student records in demo mode.

## 本機檢查 / Local checks

    npm.cmd test
    npm.cmd run build
    npm.cmd --prefix functions ci
    npm.cmd --prefix functions run build
    npm.cmd run test:rules

Rules 測試需要 Firebase CLI 可使用的 Java 與本機 Firestore Emulator。完整狀態與未完成關卡見 [QA checklist](docs/qa-checklist.md)。

The Rules suite requires a Firebase CLI-compatible Java runtime and the local Firestore Emulator. See the QA checklist for verified evidence and open gates.

## 匯出、備份與保留 / Export, backup, and retention

- CSV、XLSX 與列印摘要只包含目前篩選範圍。
- JSON 備份包含 schemaVersion 1 的作用中資料、作業作廢狀態、最小刪除稽核、課表例外與權重設定；30 天回收 payload 刻意排除。
- demo 模式可在確認後以 JSON 整份還原；Firebase 模式不得從瀏覽器覆寫雲端歷程，未來須使用受控且可稽核的 Admin 匯入流程。
- 保留政策為本學期及前一學期。第一版不自動刪除；超過範圍時先提示匯出，再由教師明確確認受控清理。

- Filtered reports export to CSV/XLSX/print.
- The JSON backup contains the full schema-version-1 snapshot.
- Demo restore can replace local data after confirmation; production restore requires an audited backend workflow.
- Retain the current and previous semester. Version 1 does not perform automatic destructive deletion.

## 文件導覽 / Documentation

- [資料模型 / Data model](docs/data-model.md)
- [來源清冊 / Source manifest](docs/source-manifest.md)
- [QA 檢核表 / QA checklist](docs/qa-checklist.md)
- [Firebase 安全基線 / Firebase security baseline](docs/security.md)
- [專案交接 / Project handoff](PROJECT_HANDOFF.md)
- [已確認 RDQ / Confirmed RDQ](rdq/RDQ-spec-homeworkclass-20260829.md)
- [國定假日增量 RDQ](rdq/RDQ-spec-national-holiday-20260829.md)
- [國定假日增量正式部署紀錄](docs/production-deployment-national-holiday-20260829.md)
- [作業／課堂事件刪除增量正式部署紀錄](docs/production-deployment-deletion-20260902.md)

## Firebase 正式環境變更原則 / Production change control

本次正式部署已依教師逐項授權完成。後續若要輪替秘密、放寬 Rules、變更 App Check／IAM／Functions、清理資料或重新部署，仍須先確認範圍與取得明確授權；需要再次驗證身分時由教師本人操作。基礎部署見 [2026-08-29 正式部署紀錄](docs/production-deployment-20260829.md)，國定假日增量見 [同日增量部署紀錄](docs/production-deployment-national-holiday-20260829.md)，受控刪除增量見 [2026-09-02 部署紀錄](docs/production-deployment-deletion-20260902.md)。

Future production changes still require explicit teacher authorization. See the dated production deployment record for the evidence that supports the current live status.
