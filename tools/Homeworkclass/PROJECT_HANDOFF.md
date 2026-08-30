# 專案交接 / Project Handoff

## 交接摘要 / Handoff summary

Homeworkclass 是單一教師使用的「英語作業與課堂紀錄」響應式網站。需求已完成 Full RDQ 訪談並確認第 3 次修訂；目前工作區已有 React、TypeScript、Vite、Firebase client、Cloud Function、Firestore Rules、Emulator 測試與本機展示程式碼。

Homeworkclass is a responsive assignment and classroom-record app for one teacher. The third revision of the Full RDQ is confirmed. The workspace contains React/TypeScript/Vite source, Firebase client code, a Cloud Function, Firestore Rules, Emulator tests, and a local demo implementation.

**目前已正式上線。** 正式站為 <https://hwclass-479d2.web.app>；2026-08-29 已完成 `hwclass-479d2` 的 Firestore、Rules／Indexes、Secret Manager、App Check、Firebase Authentication、第二代 callable、最小 IAM 與 Hosting 部署及讀回。教師通行碼登入與重新整理後工作階段均已通過。

**重要版本界線：** 2026-08-29 新增的「國定假日／撤銷國定假日」增量已依教師授權部署 Firestore Rules 與 Hosting；教師本人登入後已讀回 Firebase 模式、國定假日表單及重新整理後工作階段。沒有為驗證而建立 append-only 正式假日／撤銷紀錄。任何後續正式變更仍須重新確認。

**The production deployment is live.** The Firebase services above were deployed and read back on 2026-08-29. Live custom-token sign-in and session persistence after reload passed. See `docs/production-deployment-20260829.md` for exact evidence and remaining limits.

## 2026-08-30 可重製 Skill 交接 / Reusable Skill handoff

- 已安裝：`C:\Users\User\.codex\skills\homeworkclass-site-builder`
- 專案可攜副本：`skill-package/homeworkclass-site-builder`
- 需求：`rdq/RDQ-spec-homeworkclass-site-builder-20260829.md`（confirmed）
- 模式：`semester-update` 與 `teacher-clone` 互斥；不同教師必須使用自己擁有的獨立 Firebase。
- 輸入契約：`homeworkclass-input-v1`；標準 Excel 7 張工作表，照片＋名冊只作需人工核對的備援。
- 隱私：正規化結果只保留班級與有效座號；禁止姓名、正式學號、聯絡資料、PIN、hash、Secrets、token、Firebase 來源身分與原教師資料進入 Skill 或 clone。
- 來源 gate：驗證報告保持 `NEEDS_CONFIRMATION`；教師確認目前 `review_hash` 後另建 `source-gate.json`，且固定為 `approvalScope: source-only`、`deploymentAuthorized: false`。
- 安裝讀回：portable 與 installed 均為 68 檔，逐檔 SHA-256 差異 0，`__pycache__` 0。
- Skill 自測：官方格式 PASS；17 項離線正負案例 PASS；整包掃描 68 檔、0 secret、0 email、0來源身分、0絕對路徑、0未核准 binary。
- 隔離 clone：合成資料為 3 班、12 個有效座號、4 科、9 節次、7 課表格（含週六）；clone 掃描 54 檔、0 命中。
- 實際 QA：frontend 4 files／10 tests PASS；Firestore Rules Emulator 6 tests PASS；frontend production build PASS；Functions TypeScript build PASS；CSV／XLSX／JSON 讀回 PASS；360×800、768×1024、1440×900 均無整頁水平溢位、可見按鈕均至少 44×44、console error／warning 0。
- 相依安全：frontend 與 Functions 的 production `npm audit --omit=dev` 均為 0；Functions 以 lockfile override 將間接 `uuid` 固定為 11.1.1。測試主機為 Node 24，Functions 目標仍明確鎖定 Node 22，因此安裝時出現預期 engine warning，但 TypeScript build 通過。
- 同教師更新阻擋：目前正式站為沒有 `semesterId` 的 legacy v1；規劃器輸出 `REQUIRES_LEGACY_V1_ADAPTER_OR_MIGRATION`。不可直接替換課表或部署新版 Rules；先做唯讀 adapter，或另行提出具匯出、讀回、rollback 與明確授權的 Admin migration。
- 本次狀態：`LOCAL_ONLY`。未建立 `.firebaserc`、未設定 PIN／Secrets、未連正式 Firestore、未部署或修改 Firebase。
- 尚未完成：實體手機／平板、200% 字級、完整鍵盤／對比／列印；同教師 legacy adapter／migration；任何新教師 Firebase 建立與正式部署。這些都不影響 Skill 已完成安裝，但在正式發布前仍是必要關卡。

## 唯一正式需求 / Authoritative requirement

- 規格：rdq/RDQ-spec-homeworkclass-20260829.md
- 增量規格：rdq/RDQ-spec-national-holiday-20260829.md（confirmed；本機驗收與正式部署完成）
- 狀態：confirmed
- RDQ 修訂：3
- 專案根目錄：G:\我的雲端硬碟\teacher-toolkit\tools\Homeworkclass
- Git 邊界：沿用共用父層儲存庫，只處理 tools/Homeworkclass，不得包入其他專案變更。

- Specification: rdq/RDQ-spec-homeworkclass-20260829.md
- Status: confirmed, revision 3
- Work only inside this Homeworkclass folder.

需求已經過 RDQ 訪談與使用者確認。請勿重複詢問已確認事項，但保留 Firebase 正式變更、秘密設定、計費及部署所需的個別授權關卡。

The requirements are confirmed. Do not reopen them, but retain every separate authorization gate for production Firebase changes.

## 已確認資料 / Confirmed data

| 項目 / Item | 值 / Value |
|---|---|
| 學期 | 2026-08-31 至 2027-01-20，inclusive |
| 時區 | Asia/Taipei |
| 週課表 | 20 節：英語 12、在地 4、國際歌謠 4 |
| 班級 | 六甲、六乙、五甲、五乙、四甲、四乙、三甲、三乙 |
| 有效座號 | 155；四甲缺 3、三甲缺 8 |
| 前期作業視窗 | 前 5 個實際上課日，可跨週 |
| 未結案 | 較舊未補交作業持續顯示 |
| 需關注預設 | 遲到 1、聊天 1、未帶用品 1、不守秩序 2；門檻 4 |
| 保留政策 | 本學期及前一學期；第一版不自動刪除 |

原始來源路徑、SHA-256 與完整 20 節表見 docs/source-manifest.md。

See docs/source-manifest.md for source paths, hashes, roster counts, and the full timetable.

## 目前程式結構 / Current implementation map

| 路徑 / Path | 責任 / Responsibility |
|---|---|
| src/data/semester.ts | 學期、班級色、155 座號、節次、20 節課表與來源 manifest |
| src/domain/logic.ts | 週日期、實際上課日、國定假日優先序／撤銷／衝突、未結案投影、最新繳交狀態、需關注分數 |
| src/components | 週課表、作業繳交、課堂事件、後臺報表及設定 UI |
| src/services/repository.ts | demo localStorage 與 Firebase Firestore repository |
| src/services/export.ts | CSV、XLSX、JSON 備份 |
| src/auth/AuthContext.tsx | demo／Firebase 登入、30 分鐘共用工作階段、7 天私人工作階段 |
| functions/src/index.ts | 6 位 PIN、bcrypt、5 次鎖 15 分鐘、custom token |
| firestore.rules | 固定教師身分、欄位白名單、有效座號、append-only |
| docs/security.md | Firebase 安全架構、Emulator 指令與正式部署關卡 |

Source presence does not equal runtime or deployment verification.

## 資料模式 / Data modes

### demo：安全預設 / Safe default

- VITE_DATA_MODE=demo。
- 資料保存在目前瀏覽器 localStorage，鍵名 homeworkclass.snapshot.v1。
- 後臺只檢查輸入是否為 6 位數，不做後端驗證，也沒有 5 次鎖定。
- 只可使用假資料；清除站台資料會遺失紀錄。
- 可下載完整 JSON，也可在確認後整份還原本機 snapshot。

- Demo data stays in the current browser.
- Any six-digit test value only passes the local format check; this is not authentication.
- Use synthetic data only.

### firebase：正式模式 / Production mode

- VITE_DATA_MODE=firebase 且 Web App 公開設定完整時才建立 Firebase repository。
- PIN 送至 callable Function，由 bcrypt 驗證並簽發固定 uid homeworkclass-teacher、role teacher 的 custom token。
- 同一來源 IP 連錯 5 次鎖 15 分鐘；正式 runtime 強制 App Check。
- 作業、繳交、課堂事件與課表例外為 append-only；設定權重可有界更新。
- 瀏覽器禁止 Firebase 全量還原；未來需受控、可稽核的 Admin 匯入流程。
- 2026-08-29 已完成正式部署與登入讀回；本回合未建立或刪除正式教學紀錄。

- Firebase mode is active at the production Hosting URL and uses authenticated append-only cloud storage.

## 安全與隱私不變條件 / Security and privacy invariants

1. 只保存班級與座號，不加入姓名、正式學號、家長、輔導或其他敏感資料。
2. 不把教師電子郵件作為登入識別，也不寫入公開原始碼、文件或 Git。
3. PIN、bcrypt hash、IP HMAC salt、App Check debug token、session token、cookie、服務帳戶或其他秘密不得出現在聊天、命令參數、Vite env、原始碼或 Git。
4. 教師本人在互動式工具中設定或輪替秘密；協作者不代輸、代存或回顯。
5. 正式 Rules、Indexes、App Check、TTL、IAM、Blaze、Functions 與 Hosting 都是獨立紅燈。
6. 作業與事件歷程不覆寫；補交或修正新增事件。
7. 「需關注」只是可調權重的教師提示，不是診斷、負面標籤或懲處結論。

1. Store class and seat only.
2. Do not use or record teacher email as the sign-in identity.
3. Never expose or commit secrets.
4. The teacher controls all secret entry and rotation.
5. Every production Firebase change is a separate gate.
6. Preserve append-only history.
7. Attention scores remain teacher-review prompts only.

## 匯出與保留 / Export and retention

- 報表依日期範圍、班級、座號、科目篩選。
- CSV、XLSX 與列印摘要只輸出目前篩選；XLSX 應有作業、未補交、繳交歷程、需關注、課堂事件與課表異動六張工作表。
- JSON 備份包含 schemaVersion 1 的完整 snapshot。
- 第一版保存本學期及前一學期，不自動刪除。
- 超過範圍時先匯出並讀回，再由教師確認；Firebase 清理需未來受控 Admin 流程。

- Filtered reports and full JSON backups are separate outputs.
- Version 1 performs no automatic destructive retention cleanup.

## 本回合 QA 狀態 / QA status in this handoff

已完成：

- 單元測試 exit 0：4 files、14 tests passed；涵蓋跨週前 5 個實際上課日、週六補課、國定假日優先序／撤銷／衝突、CSV 國定假日匯出內容、學期邊界、舊未結案、截止日歷史、補交、需關注門檻與 Firebase 登入競態。
- 前端正式建置 exit 0：TypeScript 與 Vite 完成，360 modules；ExcelJS 保持延遲載入。
- Functions TypeScript 既有建置 exit 0；本次 Firestore Emulator Rules suite 12/12 passed。
- seed 在無 Emulator host 時安全拒絕，loopback Emulator 實際寫入 6 筆固定假資料。
- 實際瀏覽器以假資料完成作業、未交→日後補交、課堂事件、設定與 XLSX 流程；360、768、1440 px 未造成整頁橫向溢位。
- 國定假日瀏覽器流程完成：同日 1 筆作業、1 筆課堂事件及 1 筆補課皆保留並標衝突；整日橫幅只顯示一次；重複有效假日被阻擋；撤銷原因空白被阻擋，撤銷後恢復本週 21 節與 8/31 七個時段；手機版無整頁溢位且 console error 為 0。
- 正式站通行碼登入、custom token、Firebase Authentication、重新整理後工作階段與五個後臺頁面均已讀回成功。
- 國定假日增量完成後，4 files／14 tests passed，production build 360 modules；只有既有的大型 chunk 警告。
- 基礎 Firestore、Rules／Indexes、App Check、Secrets、最小 IAM、Function 與 Hosting 證據見 `docs/production-deployment-20260829.md`；國定假日 Rules／Hosting 增量已部署，證據見 `docs/production-deployment-national-holiday-20260829.md`。
- 設定頁讀回 20 節（12／4／4）、八班 155 個有效座號、四甲缺 3、三甲缺 8。
- 前端 production audit 為 0 vulnerabilities；Functions 為 9 moderate、0 high、0 critical，皆是 Firebase 傳遞性 `uuid` 鏈，未使用會破壞性降級 `firebase-admin` 的 force fix。
- 專案與隔離 build output 的秘密／電子郵件掃描無命中。
- Firebase CLI 只讀核對後，依教師授權完成正式部署與逐項讀回。

Completed:

- Unit tests, frontend and Functions builds, 12 Rules tests, safe seed behavior, browser workflows, responsive overflow checks, dependency audits, and secret scans have current evidence.
- The production Firebase deployment and live sign-in readback are complete; open limitations are listed below.

仍待完成或刻意保留：

- Functions／Auth Emulator 的 PIN 正確、錯誤 5 次鎖定、15 分鐘恢復、登入工作階段完整矩陣。
- CSV、XLSX、列印與 JSON 的逐檔讀回，以及 demo 備份還原 round trip；本回合只確認 CSV 點擊無錯誤、XLSX 瀏覽器產生成功與 ExcelJS buffer smoke test。
- 完整鍵盤、對比、列印及實體手機／平板驗收。
- 目前執行主機沒有 `D:` 磁碟，因此未於最後一輪重新計算兩份來源檔雜湊；清冊保留既有 SHA-256。
- Functions 9 個 moderate 上游相依弱點仍需追蹤；不得以 `--force` 破壞性降級處理。
- `_securityRateLimits.expiresAt` TTL、Firestore 產品層 App Check enforcement，以及完整時間型登入矩陣仍待另行驗收／授權。
- 本回合不在 append-only 正式集合建立測試教學紀錄；正式寫入與完整 CSV／XLSX／列印／JSON 讀回留待教師用實際紀錄驗收。

Not yet verified:

- Function/Auth rate-limit and timed-session matrices, complete export/restore readback, accessibility/print/real-device checks, source-hash recomputation on a host with `D:`, upstream Functions audit remediation, TTL, and production write verification.

完整檢核見 docs/qa-checklist.md。不要把「程式碼存在」寫成「功能已通過」。

See docs/qa-checklist.md. Do not equate source presence with a passing test.

## 下一步 / Next steps

國定假日增量已正式部署，教師登入、設定頁表單及重新整理後工作階段均已讀回。正式新增／撤銷只應使用教師核准的真實日期，不得使用虛構假日在 append-only 正式集合做測試。

### 1. 完成尚未覆蓋的本機驗收

- 在非雲端同步的隔離副本重新 `npm ci`；Google Drive 會鎖住產生中的 `node_modules`，不要把隔離依賴視為正式來源檔。
- 逐檔下載並讀回 CSV、XLSX、列印與 JSON，完成一次 demo「備份→增加假資料→還原→逐筆相同」round trip。
- 補做完整鍵盤、對比、列印、1024 px 與實體手機／平板驗收。
- 在可存取 `D:` 來源附件的主機重新計算兩個 SHA-256，與 source manifest 逐字核對。
- 正式部署前重跑前端與 Functions production audit；Functions 現有 9 moderate 不可用 force downgrade 掩蓋。

Repeat the isolated build/test evidence after material code changes, then finish export/restore readback, accessibility, print, real-device, and source-hash checks.

### 2. 完成 Function／Auth Emulator 安全驗收

- 驗證 PIN 格式錯誤也計入嘗試、第五次鎖 15 分鐘、成功清除計數。
- 驗證共用裝置 30 分鐘閒置、私人裝置 7 天及手動登出。
- Firestore Rules 12/12 與 seed 6 筆已通過；後續修改 Rules／schema 時必須重跑。

Complete the remaining Function/Auth rate-limit and session Emulator matrix.

### 3. 正式環境後續維運

既有正式版本及國定假日增量均已部署。後續優先事項：

1. 由教師用第一筆實際作業驗證正式 append-only 寫入、重新載入與跨頁查詢。
2. 逐檔下載並讀回 CSV、XLSX、列印與 JSON；保留一份可驗證的正式備份。
3. 另行決定是否啟用 `_securityRateLimits.expiresAt` TTL 與 Firestore 產品層 App Check enforcement。
4. 完成 30 分鐘閒置、私人裝置 7 天、五次錯誤鎖 15 分鐘的時間型驗收。
5. 任何 Secrets、IAM、Rules、App Check、Functions、Hosting 或資料清理變更仍須另行授權。

## 已知限制與風險 / Known limitations and risks

- 六位 PIN 不是 MFA；校園共用 NAT 也可能讓同一出口 IP 的裝置共享鎖定。
- demo 是單一瀏覽器 localStorage，既不安全也不耐清除，只供展示。
- 目前沒有自動保留清理或 Firebase Admin 還原工具。
- Firestore Rules 測試不能證明 App Check、IAM、custom-token signing 或真實裝置已在線上成功。
- 最後一輪執行主機沒有 `D:`，所以未重新讀取來源附件計算雜湊。
- Google Drive 會鎖住產生中的 `node_modules`；本機檢查使用非同步磁碟的隔離副本。
- Functions production audit 尚有 9 個 moderate 傳遞性 `uuid` 弱點；目前沒有不破壞 Firebase 相依版本的自動修正。

- The PIN is not MFA.
- Demo storage is not durable or secure.
- Production restore and retention cleanup are not implemented.
- Emulator success cannot prove live App Check, IAM, or device behavior.
- Source hashes were not recomputed on the final host because `D:` was unavailable.
- Builds use an isolated non-synced mirror because Google Drive locks generated dependencies.
- The Functions production dependency tree still has nine moderate upstream `uuid` findings and no non-breaking automatic fix.

## 收尾原則 / Closeout rule

後續交接必須精確報告：改了什麼、實際跑了哪些命令、哪些讀回成功、哪些仍待教師授權。不得以 attempted、queued 或 local-only 結果宣稱已部署。

Future handoffs must distinguish edited source, executed checks, successful readback, and separately authorized production work. Never claim deployment from an attempted or local-only action.
