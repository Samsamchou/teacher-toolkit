# 安全淨化與 Allowlist Clone / Security, Sanitization, and Allowlist Cloning

在建立 Skill 套件、教師重製站、學期更新隔離副本、build artifact 或交接包時讀取本文件。核心原則是：只複製明確允許的骨架，來源身分與正式資料零帶入，任何未知檔案或掃描缺口都 fail closed。

Use an explicit allowlist. Never clone the current project tree wholesale. A clean source tree is necessary but not sufficient: also scan generated code, compiled artifacts, reports, and the rendered clone.

## 三類受保護內容 / Protected content classes

### 秘密 / Secrets

不得進入 Skill、Clone、Git、聊天、命令參數、報告或 build：

- 六位 PIN、bcrypt hash、IP HMAC salt；
- Secret Manager 值、API／OAuth token、JWT、session、cookie、refresh token；
- App Check debug token；
- service-account JSON、private key、憑證與本機 Firebase CLI 登入資料。

Secret 名稱、環境變數名稱及 Function binding 名稱可存在於程式，但值不得存在。

### 來源身分 / Source identity

下列項目未必是秘密，仍不得從來源教師帶到另一位教師：

- Firebase project ID、project number、Web app ID、API key、auth domain、storage bucket、Hosting URL；
- App Check site key／registration、Auth users、Functions／Hosting release 身分；
- 教師姓名、電子郵件、絕對路徑、來源檔名與目前專案部署紀錄；
- `.firebaserc`、具體 Firebase env、正式站 URL、來源 manifest 與 handoff 證據。

公開的 Firebase Web config 仍是租戶身分，不得視為可跨教師沿用。

### 正式與來源資料 / Formal and source-derived data

- 學生姓名、正式學號、生日、電話、地址、家長／監護人或其他個資；
- 原始 Excel、照片、OCR overlay、修正檔與私人來源 manifest；
- 目前教師的班級、座號缺號、課表、學期日期、作業、繳交、課堂事件與設定；
- Firestore export、CSV／NDJSON、備份、Emulator import、瀏覽器 storage 或測試 session。

只有班級與有效座號也屬來源教師的正式資料拓樸；不含姓名不代表可放進空白 Clone。

## Allowlist Clone，不複製整棵專案 / Allowlist-only clone

Clone 建立器必須從空的隔離目錄開始，逐項複製 manifest 中允許的資產；禁止 `copy project recursively`、Git history 複製或把來源根目錄當模板。

### 可抽取的通用骨架

- React／TypeScript／Vite／Vitest 與 package lock；
- 不含 project identity 的 `firebase.json`；
- 通用 Firebase client、Auth session、repository 介面與 UI 元件骨架；
- project-neutral 的 callable Function、互動式 PIN hash helper 與 Secret 名稱；
- 空白／虛構 workbook、fixture、驗證器與測試工具。

即使可抽取，仍須在 rendered clone 重跑 scanner、tests 與 build；「通用」不是永久白名單。

### 必須參數化或重新產生

- `.env.example`：Firebase／App Check 值保持空白或明確 placeholder；
- Firestore Rules、Indexes、Rules fixtures：從已確認學期 schema 產生，含 `semesterId`、有效座號及舊學期唯讀；
- 學期資料、TypeScript types、seed、班級色彩、科目／節次設定與 UI labels；
- legacy adapter、v1 查詢與 export 投影；
- README、資料模型、安全說明、QA、source manifest 與 handoff：每次重新產生，不沿用來源教師的完成宣告。

空白模板的 Rules 應 fail closed；沒有已確認學期設定時，不得接受教學事件寫入。

### 永遠排除

- `.firebaserc`、`.env`、`.env.*` 實值、`.secret.local`；
- `.git/`、`.firebase/`、`node_modules/`、`dist/`、`functions/lib/`、coverage、cache、`__pycache__/` 與 debug logs；
- `.codex-remote-attachments/`、原始來源、私人 QA、production deployment／handoff／現站 RDQ；
- service account、keys、credentials、sessions、cookies、exports、backups 與正式資料；
- symlink、junction、realpath 超出隔離根目錄的項目；
- 未在 binary manifest 中逐檔核准的圖片、試算表、壓縮檔或其他 binary。

來源報告可保存在該教師的隔離私人工作區，但不得進入 Skill asset、公開 Git、`dist` 或另一位教師的 Clone。

## Scanner 使用與輸出 / Scanner behavior

`scripts/scan_package.py` 是最低基線，不取代結構化資料驗證或人工影像檢視。

- `--profile skill` 用於 Skill 套件；只允許 Skill manifest 核准的 workbook／fixture binary。
- `--profile clone` 用於 rendered clone；不得因副檔名在 binary allowlist 就自動信任，仍需逐檔 hash 與來源角色。
- `--output` 必須位於掃描根目錄外，避免 report 改變被掃描內容。
- 非秘密的來源 Firebase identifier 可用 `<SOURCE_IDENTIFIER>` placeholder 代表的 `--deny-value` 傳入；PIN、token、email、姓名或其他個資不得放入命令列。若無安全的記憶體／受限檔案輸入方式完成 exact scan，狀態必須保持 `BLOCKED`。
- Scanner report 只列 `rule_id`、相對路徑、行號、匿名 fingerprint 與計數，不回顯命中文字。
- 任一 hit、不可讀文字、未知 binary、link、disallowed directory 或 scanner 執行錯誤都使狀態為 `BLOCKED`；不得用忽略清單掩蓋未知來源。

必要規則至少涵蓋：

| Rule family | 必須阻擋 |
|---|---|
| `ID001` | 來源 Firebase／Hosting／教師身分 exact match |
| `ID002` | 非核准 email、絕對使用者路徑 |
| `SEC001` | private key、service account、Google API key、JWT／OAuth token |
| `SEC002` | bcrypt、PIN 語境、session／cookie／refresh token、Secret 值 |
| `CFG001` | 私有 env、`.firebaserc`、具體來源 Firebase config |
| `DATA001` | 姓名／學號／家長等未核准欄位與正式教學資料 |
| `DATA002` | export、backup、session、Emulator import 等可疑資料檔 |
| `SRC001` | 未核准 binary、不可讀文字、來源附件／manifest |
| `FS001`／`FS002` | symlink、junction、Git／cache／build 等禁止目錄 |
| `GEN001` | 目前班級／日期／節次常數、缺少 `semesterId` 或舊學期唯讀 |

目前 scanner 對 lockfile 的一般 email pattern 例外處理是為避免 npm 相依 metadata 誤報；來源教師 email 的 exact fingerprint 仍必須跨所有文字檔與 build output 檢查。不得全域忽略 lockfile。

不要以全域 `\d{6}` 搜尋 PIN，因日期、節次與計數會誤報；只在 PIN／passcode／通行碼或 Secret assignment 語境檢查。

## 結構化個資與 binary 驗證 / Structured PII and binary validation

Regex 無法證明 workbook 或影像無個資：

1. Excel 必須由來源 pipeline 解析工作表與欄位；姓名欄只在記憶體移除並回報筆數，不回顯值。
2. 身分證、生日、聯絡方式、家長資料或未知含值欄位一律阻擋。
3. Skill 的空白 workbook 與 fixture 必須是虛構資料，且以 asset manifest 固定 SHA-256。
4. 來源照片不進 Clone；若 Skill 自身需要說明圖，必須逐圖人工檢視、記錄來源角色及 hash。
5. ZIP／archive、Firestore export、資料庫檔與 source map 預設禁止；確有需要時另開範圍與驗證規格。

Scanner 不得把學生姓名、教師 email、路徑、原始格值或圖片 OCR 文字寫入 console、JSON、Markdown 或例外訊息。

## 兩階段身分掃描 / Two-stage identity scan

### 階段 A：模板與產生前

1. 從來源 `.firebaserc`、Firebase env、部署記錄與來源 manifest 暫存在記憶體中建立 deny set；報告只保存匿名 fingerprint。
2. 掃描 Skill asset allowlist，確認沒有來源 project、教師、路徑、資料或部署證據。
3. 驗證 `.env.example` 只有 placeholder，空白 Skill 不含 `.firebaserc`。
4. 驗證 fixture 使用明顯虛構學期、班級與座號，且無現站名冊拓樸。

### 階段 B：rendered clone 與 deploy artifact

1. 生成 Clone 後再掃整個 Clone；新教師設定可存在於其私人工作區，但來源 deny set 必須零命中。
2. production build 後，把 `dist` 當獨立掃描根目錄；Functions build 後同樣掃描 `functions/lib`。
3. 掃描 HTML、JS、source map、JSON、CSS、報表、下載範例與匯出檔，防止 Vite 將來源 env 或資料嵌入 bundle。
4. 生成 `.firebaserc` 後確認它只包含教師已確認的新目標；所有 Firebase 命令仍明確指定同一 `--project`。
5. build 或設定變更後，先前 scanner PASS 與 artifact hash 失效，必須重跑。

## Clone 模式安全驗收 / Clone security acceptance

至少同時滿足：

- `SOURCE_ID_HITS=0`
- `SECRET_HITS=0`
- `ABSOLUTE_PATH_HITS=0`
- `UNAPPROVED_BINARY_COUNT=0`
- `FORMAL_DATA_DOCUMENT_COUNT=0`
- 無 disallowed directory、link、私人 env、來源附件、deployment evidence 或 unresolved scanner error

並完成下列行為驗證：

1. Fresh Auth／Firestore Emulator 啟動後為空；只在明確 seed 後出現標示 synthetic 的預期 fixture 文件。
2. Seed 在未設定 loopback `FIRESTORE_EMULATOR_HOST` 時安全失敗，絕不退回正式專案。
3. Rules tests 驗證未登入、錯 uid／role、未知欄位、無效座號、append-only、跨學期及舊學期寫入拒絕。
4. Functions 只用本機假秘密驗證正確 PIN、第五次錯誤鎖定、15 分鐘恢復與成功清除計數；不接觸 Secret Manager。
5. 使用至少兩個虛構學期驗證 legacy／新 schema 查詢、舊學期唯讀、匯出分學期及重跑不重複。
6. production build、360／768／1440 px、匯出讀回及 browser console 通過，且 build artifact 再掃描為 PASS。
7. 新 Firebase 目標與來源不同，且屬該教師；帳號、計費、Secrets、App Check 與部署均停在 `references/firebase-gates.md` 的第二道紅燈前。

## Scanner 負向測試 / Negative tests

在隔離 fixture 中注入下列任一項，scanner 必須非零退出、狀態 `BLOCKED`，且 report 不顯示原值：

- 來源 project identifier 或 Hosting domain；
- email／絕對來源路徑；
- private-key marker、bcrypt、PIN 語境或 session token；
- 隱藏 `.env`、`.firebaserc`、service-account 檔或 source attachment；
- symlink／junction、未核准 binary、export／backup；
- 現站班級／日期常數或缺少學期隔離的生成結果。

負向測試 fixture 本身不得放真實值；使用明顯虛構 sentinel，並只驗證 rule ID、路徑、狀態與不回顯不變條件。

## 完成報告 / Completion report

交接只報告：

- allowlist manifest 與檔案 SHA-256；
- scanner profile、版本、PASS／BLOCKED、各 rule 計數；
- 正規化資料計數與 fixture／正式資料區分；
- tests、Rules Emulator、build、響應式與匯出結果；
- 尚未驗證項目及 Firebase gate 狀態。

不得把來源識別、個資或 Secret 值放進報告。`LOCAL_VALIDATED` 只代表本機成果；只有依 `firebase-gates.md` 獲得精確授權並完成正式讀回後，才能標記 `DEPLOYED_READ_BACK`。
