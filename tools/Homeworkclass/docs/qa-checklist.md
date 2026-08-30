# QA 檢核表 / QA Checklist

## 使用方式 / How to use

- [x] 代表本回合已有可讀證據。
- [ ] 代表尚未執行、尚未通過或需要教師／正式環境驗證。
- 不可因原始碼存在、指令曾送出或 Emulator 通過，就把正式部署項目勾選。

- [x] means readable evidence exists in the current workspace.
- [ ] means not run, not passed, or still requires teacher/live-environment verification.
- Source code, a submitted command, or an Emulator pass is never production deployment evidence.

## 2026-08-29 證據快照 / Evidence snapshot

| 檢查 / Check | 結果 / Result | 證據或限制 / Evidence or limitation |
|---|---|---|
| confirmed RDQ 讀回 | 已確認 / Verified | status: confirmed、revisions: 3；日期 2026-08-29 |
| 學期常數靜態檢視 | 已確認 / Verified by inspection | 2026-08-31 至 2027-01-20、Asia/Taipei |
| 課表與座號靜態檢視 | 已確認 / Verified by inspection | 程式含 20 節與八班 155 座號；四甲缺 3、三甲缺 8 |
| npm.cmd test | **通過 / Passed** | exit 0；4 files、14 tests passed（隔離建置副本；含國定假日優先序、週六補課恢復、衝突計數、CSV 內容與 Firebase 登入競態回歸） |
| npm.cmd run build | **通過 / Passed** | exit 0；TypeScript 與 Vite 360 modules；只有 >500 kB chunk 警告 |
| npm.cmd --prefix functions run build | **通過 / Passed** | exit 0；Functions TypeScript 編譯完成 |
| npm.cmd run test:rules | **通過 / Passed** | Firestore Emulator 12/12 tests passed；含有效假日／撤銷、欄位驗證與 append-only 拒絕 |
| Emulator seed | **通過 / Passed** | loopback Emulator 寫入 6 筆固定假資料；無 host 時安全拒絕 |
| 瀏覽器展示流程 | **部分通過 / Partially passed** | 作業、未交→日後補交、課堂事件、設定與 XLSX；另完成假日整日橫幅、衝突、重複阻擋、撤銷恢復與手機版無整頁溢位 |
| 國定假日正式部署 | **已部署並讀回 / Live** | Rules／Hosting exit 0；正式 asset、Firebase 登入、國定假日表單及重新整理後工作階段通過 |
| 前端 production audit | **通過 / Passed** | 0 vulnerabilities |
| Functions production audit | **待上游修正 / Upstream open** | 9 moderate、0 high、0 critical；皆為 Firebase 傳遞性 uuid 鏈，force fix 會破壞性降級 firebase-admin |
| Firebase 正式部署 | **已部署並讀回 / Live** | `hwclass-479d2`、`asia-east1`；Firestore、Rules／Indexes、App Check、Secrets、Auth、Function、最小 IAM 與 Hosting 完成 |
| 正式教師登入 | **通過 / Passed** | custom token 登入成功；重新載入後仍在教師後臺，五個主要頁面無 Firebase／權限錯誤 |

Local build commands were run from an isolated mirror because Google Drive locks generated `node_modules`. Production changes and read-back evidence are recorded in `docs/production-deployment-20260829.md`.

## A. 需求與來源 / Requirements and sources

- [x] rdq/RDQ-spec-homeworkclass-20260829.md 為 confirmed 第 3 次修訂。
- [x] rdq/RDQ-spec-national-holiday-20260829.md 已確認、完成本機驗收並獲教師另行授權正式部署。
- [x] 專案期間為 2026-08-31 至 2027-01-20，使用 Asia/Taipei。
- [x] 固定課表靜態資料為 20 節：英語 12、在地 4、國際歌謠 4。
- [x] 八班有效座號合計 155；四甲 3 號與三甲 8 號不在資料常數。
- [x] source manifest 記錄兩份來源路徑、SHA-256 與隱私界線。
- [ ] 從原始 D 槽附件重新計算 SHA-256 並與清冊逐字比對。
- [x] 執行 semester.test.ts，確認計數、缺號及八種不同主色。

- [x] Confirmed requirements and normalized data are present.
- [ ] Recompute the source hashes on a host where the original `D:` files are available. Automated semester tests already pass.

## B. 單元邏輯 / Domain logic

- [x] 前 5 個實際上課日可跨週，略過已登記停課並納入補課／調課。
- [x] 較舊但仍未補交的作業不因超過 5 個上課日而消失。
- [x] 同作業同座號以最新 recordedAt 事件決定目前狀態，舊事件仍保留。
- [x] 新增 later-submitted 後，該座號離開目前未補交清單，但原始未交事件及截止日狀態仍可查。
- [x] 每週需關注預設權重為 1／1／2／1，達 4 分才提示。
- [x] 有效國定假日優先於固定課與補課／調課，前 5 個實際上課日會略過；撤銷後恢復原排程效果。
- [x] 國定假日衝突計數保留既有作業、課堂事件與補課／調課，不自動改動原紀錄。
- [x] CSV 純函式測試讀回 UTF-8 BOM、課表異動區段、假日狀態、衝突摘要與撤銷原因。
- [ ] 權重變更後，摘要依目前權重重算且仍顯示「需教師確認」而非負面標籤。

- [x] Domain tests pass for actual-class dates, Saturday make-up classes, term bounds, outstanding work, historical cutoffs, event projection, and attention scoring.

執行：

    npm.cmd ci
    npm.cmd test

## C. 教師主要流程 / Teacher workflows

### 週課表與作業 / Timetable and assignment

- [x] 週頁只顯示週一至週五，且能前後切換週。
- [ ] 學期起訖日以外不可誤登正式資料。
- [x] 20 個固定 slot 的日期、節次、時間、科目與班級皆正確。
- [ ] 點 slot 後能新增四種作業類型及 1–500 字內容。
- [x] 各班顏色另有班級文字／科目文字或圖示，不依賴顏色辨識。
- [ ] 停課不覆寫固定課表；補課／調課會建立新例外事件。
- [x] 國定假日整日只顯示一個橫幅，當天課程為零，且禁止新增作業與課堂事件。
- [x] 假日名稱與撤銷原因必填；重複有效假日被阻擋，撤銷以 append-only 新事件保留原因。
- [x] 撤銷後固定課與先前補課恢復；瀏覽器假資料測得本週 21 節、8/31 共 7 個時段。
- [x] 假日仍允許後臺補交登記，既有作業與課堂事件保持可查。

### 繳交與補交 / Submission and make-up

- [x] 先選班級與日期後，顯示前 5 個實際上課日作業。
- [x] 較舊未結案作業另列並可繼續補登。
- [ ] 一鍵全班已交會為 155 名冊中的該班有效座號建立事件。
- [x] 不可選四甲 3 號或三甲 8 號。
- [x] still-missing 必須選請假、無故或其他原因。
- [ ] same-day-completed 與 later-submitted 保存狀態日期／實際補交日期。
- [x] 已完成、仍未交、日後補交的計數與座號在瀏覽器假資料流程中一致。
- [ ] 當天完成需再做一次完整手動驗收。

### 課堂事件與報表 / Incidents and reports

- [ ] 四種事件類別都能保存。
- [ ] 可填有效座號、簡短事實，或兩者皆填；不可兩者皆空。
- [ ] 週、跨週、班級、座號與科目篩選結果正確。
- [ ] 未補交清單可回查作業日期、科目、內容、原因與狀態日期。
- [x] 繳交歷程可回查原始未交與補交事件。
- [x] 需關注提示附分數、事件次數、類別與最近日期，並保留教師最後判斷。

## D. 響應式、無障礙與列印 / Responsive, accessibility, and print

- [x] 360 px 手機：導覽、表單與課表主要內容可見，整頁無橫向溢位。
- [ ] 768 px 平板：橫直向均可完成四項主要流程。
- [ ] 1024 px 與 1440 px 桌機：週課表、報表及設定頁維持清楚層級。
- [ ] 所有互動可用鍵盤操作；焦點樣式可見。
- [ ] 表單 label、錯誤訊息、role=status／alert 由螢幕閱讀器可辨識。
- [ ] 班級色、狀態色與主要文字達合理對比；顏色不是唯一線索。
- [x] 寬表格只在指定容器水平捲動，不造成整頁橫向溢位。
- [ ] 列印摘要隱藏操作按鈕，頁首、篩選條件與資料表不截斷。

- [x] 360／768／1440 px 已驗證主要畫面寬度，沒有整頁橫向溢位。
- [ ] 完整鍵盤、對比、列印及實體裝置仍待驗收。

## E. 匯出、備份與保留 / Export, backup, and retention

- [ ] CSV 為 UTF-8 BOM，Excel 開啟繁體中文無亂碼；欄位與目前篩選一致。
- [ ] XLSX 可讀回六張工作表：作業明細、未補交清單、繳交歷程、需關注摘要、課堂事件、課表異動。
- [ ] XLSX 標題、凍結列、篩選、欄寬與空資料提示正確。
- [ ] 列印摘要與目前日期、班級、座號、科目篩選一致。
- [ ] JSON 備份含 schemaVersion 1、全部四種資料陣列、權重與 exportedAt。
- [ ] demo 還原前要求確認；不支援的 schema 拒絕。
- [ ] 完成一次「先備份 → 增加假資料 → 還原 → 計數及事件逐筆相同」讀回驗證。
- [x] Firebase repository 原始碼明確拒絕瀏覽器 replaceAll。
- [ ] Firebase 受控 Admin 還原流程尚未設計、授權或驗證。
- [x] 保留政策記錄為本學期及前一學期，第一版不自動刪除。
- [ ] 超過兩學期的提示、匯出讀回及受控清理流程尚未實作驗收。

- [ ] Read back every export and complete one round-trip demo restore test.
- [ ] Production restore and retention cleanup remain future audited Admin workflows.

## F. 本機 Firebase／Emulator 安全 / Local Firebase and Emulator security

- [x] 原始碼設計為 6 位 PIN 後端 bcrypt 驗證，不把 PIN 放在前端。
- [x] Function 常數為連錯 5 次鎖 15 分鐘；成功後刪除該 IP 失敗計數。
- [x] 共用裝置閒置 30 分鐘、私人裝置 7 天及手動登出邏輯存在。
- [x] Rules 要求固定 uid homeworkclass-teacher 與 role: teacher 同時成立。
- [x] assignments、submissionEvents、classroomIncidents、timetableExceptions 的 update／delete 由 Rules 拒絕。
- [x] _securityRateLimits 對瀏覽器預設拒絕，原始 IP 不應寫入資料庫。
- [ ] Functions Emulator 驗證正確 PIN、錯誤 PIN、第五次鎖定、15 分鐘後恢復、成功清除計數。
- [ ] Auth Emulator 驗證登入、重新整理、共用／私人工作階段及手動登出。
- [x] Firestore Rules suite 11/11 通過：未登入、錯 uid、錯 role、欄位白名單、缺號、父作業班級及 append-only。
- [x] seed script 在無 FIRESTORE_EMULATOR_HOST 時安全拒絕，loopback Emulator 實寫 6 筆假資料。
- [x] 搜尋專案原始碼與隔離 build output，未發現 PIN、hash、salt、token、私鑰、Firebase API key 值或電子郵件。

執行前提與指令：

    npm.cmd ci
    npm.cmd --prefix functions ci
    npm.cmd --prefix functions run build
    npm.cmd run test:rules

## G. Firebase 正式部署與後續紅燈 / Production Firebase status and future gates

下列勾選項目已有正式環境讀回證據；未勾選項目仍須另行授權或時間型驗收：

- [x] 教師本人登入，核對 Web App、project id、`asia-east1`、Hosting site 與 Blaze 狀態。
- [x] 以 Firebase CLI 只讀 `apps:list WEB` 確認可存取 hwclass-479d2；不是只依賴 .firebaserc。
- [x] 教師確認 Blaze 正式部署與可能費用；預算警示仍需另行核對。
- [x] 建立 reCAPTCHA Enterprise App Check；正式 callable 強制檢查，正式登入請求 token 有效。
- [x] 教師本人建立 TEACHER_PIN_BCRYPT_HASH 與 RATE_LIMIT_IP_SALT；值未進入聊天、命令參數、原始碼或 Git。
- [x] runtime service account 在自身資源取得最小 custom-token signing 權限；未下載 service-account key。
- [ ] 為 _securityRateLimits.expiresAt 啟用 TTL 並核對 24 小時清理行為。
- [x] Rules 12/12、建置、依賴與秘密掃描完成；本次只部署 Rules 與 Hosting，未變更 Indexes／Functions。
- [x] 教師明確授權正式部署與必要的最小 IAM 變更。
- [x] 部署後讀回 project、Rules／indexes、Function region／memory／timeout／maxInstances、App Check 與 Hosting headers。
- [x] 正式通行碼登入、Authentication 初始化、重新整理後工作階段及手動後臺導覽通過。
- [x] 國定假日增量部署後，教師本人重新登入並讀回設定頁「國定假日」、必填假日名稱與選填備註；重新整理後仍在教師後臺。
- [ ] 正式站建立真實國定假日後，再讀回條件式「撤銷國定假日」按鈕與正式寫入；本次不建立虛構 append-only 紀錄。
- [ ] 30 分鐘閒置、7 天期限、五次錯誤鎖定、正式資料寫入與完整匯出仍待時間型／實際資料驗收。
- [x] 正式網址與 2026-08-29 部署紀錄已保存；讀回成功後才標記已部署。

The production deployment and live sign-in readback are complete. TTL, Firestore product-level App Check enforcement, timed session/rate-limit checks, production writes, and full export readback remain separately controlled items.

## H. 文件交接 / Documentation handoff

- [x] README 說明功能、兩種資料模式、安全政策、匯出與部署紅燈。
- [x] data-model 說明集合、欄位、append-only 投影、備份與保留政策。
- [x] source-manifest 記錄來源、SHA-256、20 節與 155 座號。
- [x] PROJECT_HANDOFF 說明目前狀態、阻擋事項與下一步。
- [x] 已回填 2026-08-29 自動測試、建置、Rules、seed、audit、正式部署、登入與瀏覽器證據。
- [x] `docs/production-deployment-20260829.md` 記錄正式網址、安全設定、讀回與未完成項目。
- [x] `docs/production-deployment-national-holiday-20260829.md` 記錄本次 Rules／Hosting、artifact 雜湊、正式 asset 與待教師登入項目。

## 發布前最低完成條件 / Minimum release criteria

1. 單元測試、前端 build、Functions build 與 Rules suite 全部 exit 0。
2. 四項教師流程在手機、平板、桌機以假資料實測。
3. CSV／XLSX／列印／JSON 備份皆讀回，完成一次還原 round trip。
4. Secrets 與個資掃描無未核准內容。
5. Firebase 正式紅燈逐項取得授權、執行並讀回。

Release requires passing local tests, device workflows, export/readback, privacy scans, and every separately authorized production gate.
