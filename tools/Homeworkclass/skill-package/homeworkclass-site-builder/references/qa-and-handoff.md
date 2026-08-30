# Homeworkclass QA、部署證據與交接契約

本文件用於 `homeworkclass-site-builder` 的隔離建置、驗證、正式部署讀回與 `PROJECT_HANDOFF.md` 交接。它不授權正式部署；來源確認與 Firebase 部署授權是兩道不同紅燈。

## 1. 狀態與用語

每次執行必須選用且只選用一個最終狀態：

| 狀態 | 定義 | 可使用的對外說法 |
|---|---|---|
| `BLOCKED` | 來源、測試、安全或權限仍有阻擋問題 | 「目前受阻，尚未完成建置／部署」 |
| `LOCAL_ONLY` | 本機或 Emulator 建置與 QA 通過，但未執行正式 Firebase 部署 | 「本機驗證完成，尚未部署」 |
| `DEPLOYMENT_ATTEMPTED` | 已嘗試部署，但指令失敗、目標不明、發布識別缺失或線上讀回未通過 | 「已嘗試部署，但尚未驗證完成」 |
| `DEPLOYED_VERIFIED` | 有明確部署授權、目標核對、成功發布識別，且線上內容與 Rules 均完成讀回 | 「已部署並完成讀回驗證」 |

下列事項都不能單獨稱為 deployed／已部署：

- `npm run build`、本機開發伺服器、靜態檔案生成或 localhost 預覽成功。
- Rules Emulator、Firebase Emulator Suite 或 Hosting Emulator 測試成功。
- 執行過 `firebase deploy`，但沒有成功結束碼、發布識別或線上讀回。
- 只有 Firebase CLI 顯示 Hosting URL，尚未核對實際頁面版本。
- 只有 preview channel、草稿、暫存網址、快取畫面或瀏覽器既有分頁。
- Hosting 成功但 Firestore Rules 失敗，或反之。

若正式部署未被明確授權，流程在 `LOCAL_ONLY` 停止，並把部署列為待辦；不得為了「完成 QA」自行部署。

## 2. 證據目錄與共同欄位

建議每次執行使用隔離的 `qa/evidence/<run_id>/`，不得覆寫前次證據。至少保留：

- `qa-summary.json`：所有 gate 的狀態、計數、命令與證據索引。
- `source-manifest.json`、`validation-report.json`、`normalized-semester.json`。
- `source-gate.json`：教師確認來源後另建；只授權本機建置，不授權 Firebase。
- `clone-manifest.json`：模板注入後的相對路徑、大小與 SHA-256；這不是 production build 證據。
- `build-manifest.json`：來源 ref、工具版本、命令結果與輸出雜湊。
- `test-results/`：unit、Rules Emulator、responsive、export 與 scanner 結果。
- `screenshots/`：依 viewport 與畫面命名。
- `deployment-evidence.json`：只有嘗試正式部署時建立。

每項 gate 證據至少含：

| 欄位 | 說明 |
|---|---|
| `run_id` | 本次執行唯一 ID |
| `gate_id` | 穩定 gate 名稱 |
| `status` | `PASS`、`FAIL`、`BLOCKED` 或 `SKIPPED` |
| `started_at`、`completed_at` | ISO 8601，含 `+08:00` |
| `tool_versions` | Node、套件管理器、Firebase CLI、測試工具等實際版本 |
| `command` | 已移除秘密與個資的實際命令；不得含 PIN、token 或 credential 路徑內容 |
| `exit_code` | 實際結束碼；未執行為 `null` |
| `assertions` | 預期、實際結果與通過狀態 |
| `artifact_paths` | 相對專案根目錄的證據路徑 |
| `artifact_sha256` | 重要證據檔 SHA-256 |
| `notes_zh` | 限制、跳過原因與下一步 |

`SKIPPED` 不等於 `PASS`。任何必要 gate 被跳過時，最終狀態不得超過該 gate 所允許的層級。

## 3. Pipeline gate

依序執行並保存證據；前一個阻擋 gate 失敗時，不得進入會寫入正式環境的後續步驟。

### G01：有效 fixture

以 `assets/fixtures/valid-semester.json` 的 `input` 執行同一套生產驗證器：

- JSON 可解析，契約為 `homeworkclass-input-v1`。
- 零 `ERROR`、零未解決來源差異。
- 精確計數：3 班、12 個有效座號、4 科、9 節、7 個課表格。
- 驗證狀態為 `NEEDS_CONFIRMATION`，不可因 fixture 合法而自動標成 `READY`。
- 重複執行所得正規化 JSON 與 issues 集合相同；僅 `run_id`、時間戳可不同。

證據：驗證器結束碼、實際計數、issues 數、正規化 SHA-256、fixture 斷言比對結果。

### G02：負向 fixture

以 `assets/fixtures/invalid-semester.json` 執行同一驗證器：

- 狀態必須為 `BLOCKED`，並回傳非零或明確的 blocked 結果。
- 至少精準出現：
  - `E-SEAT-DUPLICATE`，`class:comet|seat:1`
  - `E-FOREIGN-KEY`，孤兒科目 `robotics`
  - `E-TIME-RANGE`，`period:p8`
  - `E-SLOT-COLLISION`，`weekday:1|period:p0`
- 不得把碰撞列靜默合併、把孤兒科目自動建立、把時間自動交換，或刪掉重複座號後繼續。
- blocked 輸入不得進入 clone 資料注入、正式 build 或 Firebase 部署。

證據：必要錯誤碼與 record key 對照表、未產生可部署輸出的斷言。

### G03：實際來源 hash 與教師確認

1. 對每個來源檔記錄原檔名、角色、位元組數、媒體型別與完整 SHA-256。
2. 依 `references/input-contract.md` 清理個資並產生 `normalized-semester.json`。
3. 記錄 `normalized_sha256` 與由契約版本、來源 hashes、正規化 hash 計算的 `review_hash`。
4. 零錯誤且零未解決差異時，狀態只能是 `NEEDS_CONFIRMATION`。
5. 教師確認必須精確對應目前 hash：`確認來源：<review_hash>`。
6. 確認證據只記 `review_hash`、`confirmed_by_role: teacher`、`confirmed_at` 與可追溯的非敏感訊息參照；不複製整段聊天、姓名或 email。
7. 任一來源、修正、解析器版本或正規化結果改變時，重新計算 hash，舊確認失效。

驗證報告保持 `NEEDS_CONFIRMATION`；教師確認後由 `approve` 指令另建狀態為 `READY` 的 `source-gate.json`，且必須明列 `approvalScope: source-only` 與 `deploymentAuthorized: false`。

來源確認只允許進入建置，不等於 Firebase 部署授權。部署授權必須另有一筆清楚指向 Firebase 專案與 Hosting site 的紀錄。

### G04：隔離 clone build

使用正確模板的固定 commit／tag 建立新的隔離副本，不能直接改原站工作目錄：

- 記錄模板 repository、commit SHA 或來源目錄 manifest SHA-256。
- clone／複製時排除 `.env`、credentials、瀏覽器狀態、`.firebase` 快取、教師 PIN、PIN hash、原教師 Firestore 資料與未核准匯出檔。
- 先在尚未注入新學期資料的乾淨 clone 執行依賴安裝與基線 build，確認模板可重建。
- 再只注入已確認 `review_hash` 對應的正規化設定；不得把 fixture 斷言或原始姓名帶入網站。
- 記錄注入前後變更摘要、檔案數、重要檔案 SHA-256 與未預期差異。
- clone baseline 或注入後 build 失敗即停止；不得回頭直接修改來源模板來規避測試。

證據：來源 ref、隔離副本路徑、乾淨狀態、實際 install/build 命令與結束碼、`audit/clone-manifest.json`。路徑可記錄，但不得包含帳號、秘密或個資。production build 完成後再另建 `build-manifest.json`，兩者不可混稱。

### G05：unit tests

unit tests 至少覆蓋實際啟用的規則：

- `Asia/Taipei` 的學期日界、週界與週一至週日映射。
- 班級、科目、節次、有效座號完全資料驅動；不依賴現站固定數量。
- 作業類型與內容必填／選填邏輯、課表格對班級與科目的關聯。
- 繳交狀態互斥、未交座號必須在有效名單、補交以新事件記錄實際日期。
- 課堂情況事件不覆寫歷史；班級與個別座號查詢結果可由 append-only 事件重建。
- 舊學期唯讀，新學期資料不改寫舊學期。
- 若產品已包含 PIN／session 邏輯：6 位 PIN、5 次失敗鎖 15 分鐘、共享裝置閒置 30 分鐘、私人裝置最長 7 天；測試只能用假值，不輸出 PIN 或 hash。
- 匯出欄位、未補交判定與課堂情況警示依已確認設定產生，不另行猜測門檻。

必須保存測試總數、通過／失敗／跳過數、覆蓋率（若專案已有覆蓋率工具）與失敗案例名稱。只貼一行「tests passed」不算完整證據。

### G06：Firestore Rules Emulator

只在 Emulator 與明確的假專案 ID 執行，不接觸正式 Firestore。最低權限矩陣：

- 未授權使用者不可讀、寫、更新或刪除教師資料。
- 有效教師 session 只能操作被授權的目前學期與資料範圍。
- 舊學期可查詢與匯出，但不可新增、更新或刪除。
- append-only 事件允許建立合法新事件，但拒絕原地改寫與刪除；補交／修正以新事件表示。
- 不合法班級、科目、座號、日期、欄位與超出 schema 的 payload 被拒絕。
- 若 schema 含教師／tenant 欄位，跨 tenant 讀寫必須被拒絕；實際隔離仍以每位教師獨立 Firebase 為準。
- 管理操作與一般操作依實際角色矩陣各有 allow／deny 對照測試。

證據須含 Emulator 專案 ID、Rules SHA-256、測試案例名稱、allow／deny 預期與實際結果。Emulator 通過不能證明 Rules 已發布到正式專案。

### G07：production build

在隔離 clone 中，以鎖定依賴做乾淨的正式模式 build：

- 記錄 lockfile SHA-256、Node 與套件管理器版本、build 命令和結束碼。
- 不使用開發伺服器產物代替 production build。
- build 輸出必須存在入口頁與引用資產；所有引用檔案可解析且沒有遺失。
- 產生 `build-manifest.json`：檔案相對路徑、大小、SHA-256、總檔數與總位元組數。
- 以 production build 啟動本機靜態預覽並做 smoke test；不得只測 source mode。
- 對 source 與 build output 執行個資／秘密掃描；source map 若會洩漏路徑或設定，必須移除或明確核准。

### G08：響應式 QA

至少測試下列 viewport；使用同一 production build：

| ID | Viewport | 代表情境 |
|---|---|---|
| `mobile-360` | 360 × 800 | 小型手機、單手操作 |
| `tablet-768` | 768 × 1024 | 平板直向 |
| `desktop-1440` | 1440 × 900 | 桌機 |

每個 viewport 至少走完：教師登入／鎖定畫面、週課表與新增作業、每日繳交分類、課堂情況、班級報表、個別座號查詢與匯出入口。驗收：

- 頁面無非預期水平捲動；主要控制項、表格與對話框不被裁切。
- 對話框內容可完整捲動，鍵盤開啟或窄螢幕時仍可儲存／取消。
- 主要觸控目標至少 44 × 44 CSS px，文字縮放至 200% 仍能完成核心流程。
- 班級顏色同時有文字標籤，不以顏色作唯一資訊；焦點與錯誤訊息可見。
- 日期、週次、座號與長作業內容不重疊、不溢出重要欄位。
- 1440 寬度不把資訊無限制拉長；主要操作與狀態仍具清楚層級。

每個 viewport 保存各核心畫面截圖、console error 數、network failure 數與自動／人工斷言結果。截圖只用合成資料，不得含正式學生紀錄。

### G09：CSV、XLSX、JSON 匯出讀回

以同一組隔離 seed 產生當週、跨週、班級與個別座號報表，再用獨立於匯出器的 parser 讀回：

- 共同比對：學期、日期範圍、班級、有效座號、作業筆數、繳交狀態、補交日期、課堂事件與未結案數。
- CSV：以 UTF-8 正確讀取中文；欄名、欄數、列數與換行一致。以 `= + - @` 開頭的使用者文字不得成為試算表公式。
- XLSX：可由獨立 OOXML／試算表 parser 開啟；預期工作表、欄名、資料列與儲存格型別相符；不得含巨集、外部連結、隱藏個資表或未預期公式。
- JSON：可依 schema 解析；ID、ISO 8601 日期時間、狀態 enum 與 append-only event ID 不因顯示格式遺失。
- 三種格式的關鍵計數與狀態必須一致；顯示用合併儲存格或摘要列不得被誤算成資料。
- 匯出不得含姓名、PIN、PIN hash、secret、token、未核准 email 或 Firebase credential。

讀回證據至少保存 parser 名稱／版本、檔案 SHA-256、工作表或欄位清單、實際計數、逐欄差異與 PASS／FAIL。能下載檔案不等於讀回成功。

### G10：個資／秘密掃描器正負測試

掃描範圍至少涵蓋 source、production build、JSON／CSV、以及 XLSX 的 OOXML 內容與 shared strings；不能只看副檔名。測試 sentinel 只在系統暫存目錄即時建立，測完刪除，不得寫進 Skill、Git 或交接文件。

正向測試（scanner 應阻擋）至少包含合成的：

- service-account 私密金鑰標記或 token-like credential。
- `.env` 型秘密、管理員憑證或原始 6 位教師 PIN 欄位。
- 學生姓名欄、email、電話、生日或監護人資料。
- 藏在 JSON、CSV、XLSX shared strings 與 build asset 中的相同 sentinel。

負向測試（scanner 應放行）至少包含：

- 允許的班級 ID、1–999 座號、科目、節次、日期與色碼。
- SHA-256、`HC1-` review hash、合成事件 ID 與非個資來源備註。
- 經核准的 Firebase 公開專案識別資訊；不得因字樣出現就把公開 project ID 誤判為 secret。
- 已清除姓名的 fixture 與三種匯出格式。

驗收要求：所有正向案例均命中正確 rule ID 並以非零／blocked 結束；所有負向案例零誤報。證據記錄 scanner 版本、目標 SHA-256、case ID、預期、實際、rule ID 與結束碼，但不得保存 sentinel 原值。

## 4. 正式 Firebase 部署與讀回

只有來源為 `READY`、G01–G10 必要項目通過，且教師另行明確授權指定 Firebase project／Hosting site 後，才可進入正式部署。

### 部署前目標核對

- 從專案設定與 CLI 分別讀出 Firebase project ID、project number（若可得）、Hosting site ID、目前 alias 與部署帳號狀態。
- 兩個來源必須一致；不得只依目錄名稱或記憶猜測目標。
- 每位教師使用自己的 Firebase、Secrets、PIN 設定與 App Check；不得沿用另一教師環境。
- 記錄即將發布的 commit SHA、`review_hash`、`normalized_sha256`、Rules SHA-256 與 build manifest SHA-256。
- 部署授權記錄需含 `authorized: true`、指定 target、授權時間與非敏感訊息參照；來源確認不得代替它。

### 部署命令證據

每個實際部署部分分別記錄：命令、開始／完成時間、結束碼、已遮蔽日誌、Firebase CLI 版本、目標 ID 與回傳的 release／version 識別。Hosting、Firestore Rules、Functions 或其他實際使用的部分不可用一個模糊的「deploy success」取代。

若任一必要部分失敗、超時、目標不符或回傳不確定，立即標成 `DEPLOYMENT_ATTEMPTED`；不要用重試掩蓋第一次失敗，也不得擅自改 deploy target。

### 線上讀回證據

部署命令成功後仍須完成：

1. 從 Firebase CLI／API 或正式控制台可追溯輸出讀回 Hosting release ID、Rules release／revision 與發布時間。
2. 對正式 canonical URL 做全新請求，記錄 HTTP 狀態、最終 URL、TLS、檢查時間；入口與必要 JS／CSS 資產均為 2xx。
3. 由頁面中的非秘密 release marker 或 build manifest 比對正式內容與本次 build SHA；清除 service worker／瀏覽器快取後再核對一次。
4. 以正式網址完成不寫入真實學生資料的 smoke flow：載入、登入入口、週課表、報表與匯出入口可見；console 與必要 network request 無阻擋錯誤。
5. 讀回正式 Rules 的 revision／hash，與預期 Rules SHA-256 或可驗證版本對應；只測 Emulator 不算。
6. 若 App Check 是必要條件，記錄 enforcement 狀態與可驗證的成功／拒絕結果，不保存 token。

`deployment-evidence.json` 最低欄位：

```json
{
  "run_id": "uuid",
  "state": "DEPLOYMENT_ATTEMPTED | DEPLOYED_VERIFIED",
  "authorized": true,
  "authorization_ref": "non-sensitive reference",
  "target": {
    "firebase_project_id": "public id",
    "hosting_site_id": "public id",
    "alias": "production"
  },
  "source": {
    "commit_sha": "git sha",
    "review_hash": "HC1-...",
    "normalized_sha256": "sha256",
    "rules_sha256": "sha256",
    "build_manifest_sha256": "sha256"
  },
  "commands": [],
  "releases": {
    "hosting_release_id": null,
    "rules_revision": null,
    "published_at": null
  },
  "readback": [],
  "remaining_failures": []
}
```

只有 `remaining_failures` 為空，必要 commands 結束碼全為 0，release IDs 齊全，且全部線上讀回斷言通過時，`state` 才能是 `DEPLOYED_VERIFIED`。

## 5. `PROJECT_HANDOFF.md` 必備欄位

交接需自足、可讀回，至少包含下列章節與欄位；未知項目明寫 `UNKNOWN`，未執行寫 `NOT_RUN`，不得留模糊空白。

### A. 專案與範圍

- 專案名稱、站名、Skill 版本／commit、run ID、交接時間與 `Asia/Taipei`。
- 模式：同教師新增學期，或其他教師隔離空白站。
- 本次包含／排除範圍、實際修改路徑、未碰觸的正式資源。
- 最終狀態：`BLOCKED`、`LOCAL_ONLY`、`DEPLOYMENT_ATTEMPTED` 或 `DEPLOYED_VERIFIED`。

### B. 來源與確認

- 來源檔名、角色、SHA-256、source manifest 路徑。
- `contract_version`、`semester_id`、期間、時區與班級／座號／科目／節次／課表格計數。
- `normalized_sha256`、`review_hash`、驗證報告路徑與 issues 摘要。
- 教師來源確認狀態、確認時間與非敏感參照；hash 不符時明列失效。
- 照片備援的未解決格與 Excel／照片差異數。

### C. 隔離與變更

- 模板 repository／路徑、來源 commit／manifest hash、隔離 clone 路徑與 branch／commit。
- 注入前後變更摘要、資料遷移版本、舊學期唯讀策略。
- Git working tree 狀態；平行工作或未納入變更不得被藏起來。
- 個資／秘密排除結果；不得記錄姓名、email、PIN、PIN hash、token、private key 或 secret 值。

### D. Firebase 與安全邊界

- 公開 Firebase project ID、Hosting site ID、alias 與每位教師獨立隔離的確認。
- Rules 檔案與 SHA-256、Rules Emulator 結果路徑、App Check 狀態。
- 僅記安全政策：6 位 PIN、5 次失敗鎖 15 分鐘、共享裝置閒置 30 分鐘、私人裝置最長 7 天；不得寫入 PIN、hash 或登入帳號。
- append-only 事件、舊學期唯讀、備份／保留與匯出政策版本。

### E. QA 結果

- G01–G10 每項 PASS／FAIL／BLOCKED／SKIPPED、命令、結束碼與證據路徑。
- unit 測試通過／失敗／跳過數；Rules allow／deny 案例數。
- production build manifest、工具版本與輸出 SHA-256。
- 360／768／1440 各畫面截圖、console／network 錯誤與人工檢查結果。
- CSV／XLSX／JSON 各自 SHA-256、parser、讀回計數與差異數。
- scanner 正負案例數、rule IDs、誤報／漏報數。
- 所有已知限制、未測實機／瀏覽器與未解決失敗。

### F. 部署與讀回

- 是否取得正式部署授權、授權 target 與非敏感參照。
- 若未部署：明寫 `LOCAL_ONLY` 與「尚未部署」。
- 若嘗試但未完全驗證：明寫 `DEPLOYMENT_ATTEMPTED`、成功與失敗部分、缺少的證據。
- 若已驗證：正式 URL、Hosting release ID、Rules revision、發布時間、build／Rules 對照與 `deployment-evidence.json` 路徑。
- 線上 HTTP、release marker、資產、smoke flow、App Check 與 Rules 讀回結果。

### G. 後續與復原

- 仍需教師決定、登入或授權的事項。
- 下一個安全步驟與明確停止條件。
- 回復到上一 release／commit 的程序與所需授權；不可直接執行破壞性 rollback。
- 備份 manifest、匯出與保留期限位置。
- 維護者能重現本次 build／test／readback 的命令索引。

## 6. 完成判定清單

- [ ] 有效與負向 fixture 均由生產驗證器測試，結果符合斷言。
- [ ] 實際來源 manifest、normalized hash、review hash 與教師確認一致。
- [ ] 隔離 clone baseline 與注入後 build 均可重建。
- [ ] unit、Rules Emulator、production build 全部通過或明確阻擋。
- [ ] 360、768、1440 核心流程完成並有截圖與錯誤計數。
- [ ] CSV、XLSX、JSON 均由獨立 parser 讀回且一致。
- [ ] scanner 正向零漏報、負向零誤報，source 與 build 均通過。
- [ ] `PROJECT_HANDOFF.md` 欄位完整，沒有秘密與個資。
- [ ] 未獲部署授權時明寫 `LOCAL_ONLY／尚未部署`。
- [ ] 已嘗試但缺證據時明寫 `DEPLOYMENT_ATTEMPTED`，不稱已部署。
- [ ] 只有部署與正式讀回全部通過時，才標記 `DEPLOYED_VERIFIED／已部署並驗證`。
