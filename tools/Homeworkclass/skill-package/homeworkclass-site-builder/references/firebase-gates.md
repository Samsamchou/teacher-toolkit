# Firebase 關卡、隔離與 v1 遷移 / Firebase Gates, Isolation, and v1 Migration

在學期更新、教師重製、v1 正式站相容、Firebase 設定或部署任務中讀取本文件。來源資料確認與 Firebase 正式變更是兩道互不替代的紅燈；通過本機測試不會自動取得任何正式環境權限。

Use this reference for semester updates, teacher clones, v1 production compatibility, Firebase setup, migration, or deployment. Source approval and production mutation approval are separate gates. Local success never grants production authority.

## 狀態用語 / Status vocabulary

只使用下列可驗證狀態，避免把嘗試或本機成果誤報為正式完成：

- `BLOCKED`：來源、掃描、測試、權限或目標仍有阻擋。
- `NEEDS_SOURCE_CONFIRMATION`：解析已完成，但教師尚未確認目前 `review_hash`。
- `SOURCE_CONFIRMED`：教師確認的 hash 與目前來源完全相符；只授權使用該正規化資料。
- `LOCAL_VALIDATED`：隔離副本的資料、測試、Rules Emulator、build、響應式與匯出驗證通過。
- `DEPLOYMENT_PLANNED`：已列出目標專案、資源、變更、風險、回復與讀回方法，尚未授權。
- `DEPLOYMENT_AUTHORIZED`：教師已針對本次精確目標與範圍明確授權。
- `DEPLOYMENT_ATTEMPTED`：執行過部署命令，但結果尚未完整讀回。
- `DEPLOYED_READ_BACK`：部署成功，且目標、資源版本與主要流程已從正式環境讀回。

不得將 `SOURCE_CONFIRMED`、`LOCAL_VALIDATED`、`DEPLOYMENT_PLANNED` 或 `DEPLOYMENT_ATTEMPTED` 寫成「已部署」。

## 紅燈一：來源確認 / Gate 1: source confirmation

在任何程式生成、學期資料套用、migration 計畫定稿或教師重製前，必須具備：

1. 唯讀來源 manifest、來源 SHA-256、正規化資料 SHA-256 與目前契約版本。
2. 零阻擋錯誤的驗證報告，並列出班級、有效座號、科目、節次與固定課表計數。
3. 照片備援時，所有低信心格、照片與 Excel 差異、無法配對 ID 及排課碰撞都已由教師逐項處理。
4. 教師確認文字中的 `review_hash` 完全等於目前報告；來源、修正或正規化結果改變時，舊確認立即失效。

來源確認只代表「可使用這份學期資料」，不代表可修改目前程式、寫入 Firestore、設定 Secrets、啟用計費或部署。

## 每位教師完整隔離 / Per-teacher isolation

教師重製模式必須讓每位教師分別擁有並負責自己的：

- Firebase／Google Cloud 專案與計費；
- Firebase Authentication 使用者及 custom token；
- Firestore、Rules、Indexes 與資料；
- Cloud Functions、runtime service account、IAM 與 Secrets；
- App Check 註冊、site key、debug token 與 enforcement；
- Hosting site、release、網址與部署紀錄。

不得從來源教師複製 `.firebaserc`、Firebase Web config、project ID、Auth 使用者、Secrets、App Check 設定、服務帳戶、瀏覽器 session、正式資料、部署歷史或 Firebase CLI 登入狀態。Firebase Web API key 雖是用戶端設定，仍屬專案身分，Clone 時必須移除。

教師本人完成帳號登入、六位通行碼輸入、Blaze／計費同意及正式部署授權。不得代填憑證，也不得將 PIN、hash、salt 或 token 放入聊天、檔案或命令參數。

固定 teacher uid 可在彼此隔離的專案中重用；它不是跨教師共用身分。若改為中央或多租戶專案，必須另開需求與安全設計，不能沿用此模型。

## v1 正式站：legacy adapter 優先 / v1 production: prefer a legacy adapter

既有 v1 教學文件可能沒有 `semesterId`。不得為了符合新 schema 而由瀏覽器批次更新、覆寫或刪除舊事件。優先使用唯讀 legacy adapter：

1. 先以只讀方式盤點 v1 collections、文件數、日期範圍與可重現摘要；匯出後必須實際讀回並核對計數及 hash。
2. 教師明確指定唯一的 `legacySemesterId`、顯示名稱與日期邊界；不得從文件日期或目前課表自行猜測。
3. Adapter 只在讀取／投影層把缺少 `semesterId` 的文件視為該 legacy 學期，不回寫原文件。
4. Adapter 設定缺失、來源跨越已確認邊界、文件無法唯一歸屬或計數不一致時 fail closed。
5. 所有新事件必須帶 `semesterId`，且只能寫入狀態為 active 的學期；舊學期由 UI 與 Firestore Rules 同時拒絕 create、update、delete。
6. legacy 文件維持 append-only；補交與修正仍以新事件表示，不改寫歷史。
7. Adapter 的合併查詢、排序、未結案投影與匯出必須有跨舊／新 schema 測試，並證明重跑不會重複資料。

Legacy adapter 只屬「同一教師、同一 v1 正式站」的學期更新模式；不得進入其他教師的空白 Clone，也不得攜帶任何 v1 正式資料。

## 受控 migration / Controlled migration

只有當 adapter 無法滿足已確認需求，才設計後端 migration。Migration 是正式資料變更，必須在紅燈二中單獨列名與授權：

- 先產生唯讀 dry-run 計畫，列出來源／目的 collection、預期讀寫數、ID 對應、重跑策略、上限與回復方法。
- 使用可重現的 deterministic ID、checkpoint 與冪等寫入；不得靠用戶端全量覆寫。
- 寫入後逐 collection 核對來源數、目的數、內容摘要、失敗數與重跑結果。
- 舊資料在完整匯出讀回、migration parity、教師確認及另一次刪除授權前不得刪除。
- 超過兩學期的清理須有與 export ID／hash、學期、文件數及確認時間綁定的短效單次憑證；`confirmed: true` 之類的 client boolean 不構成證據。
- Adapter 下線、Rules 收緊及舊資料清理是不同變更，各自需要部署／刪除授權與讀回。

## 紅燈二：Firebase 正式變更 / Gate 2: production Firebase mutation

每次正式變更前提供可審核計畫，至少包含：

- 目標教師與精確 Firebase project ID；
- 目前登入帳號是否能存取該目標，但不顯示帳號或 token；
- 本次資源範圍：Hosting、Rules、Indexes、Functions、Secrets、IAM、App Check、Auth、計費、資料 migration／delete；
- 每項檔案／設定差異、可能費用、資料影響、回復方式與部署後讀回方法；
- 已通過的測試與尚未驗證項目；
- 是否有正式資料寫入或刪除，以及預期文件數上限。

教師授權必須同時指明目標專案與本次資源。下列授權互不包含：

| 變更 | 不會自動授權 |
|---|---|
| Hosting | Rules、Functions、Secrets、計費或資料寫入 |
| Firestore Rules | Indexes、migration、資料刪除或 Hosting |
| Indexes | Rules、資料改寫或 Functions |
| Functions | Secrets 值、IAM、App Check、Hosting 或 migration |
| Secrets | Function 重新部署、PIN 輪替後 session 撤銷或 IAM |
| App Check | Firebase 其他產品 enforcement 或 debug token 建立 |
| Migration | 舊資料刪除、adapter 下線或超出核准數量的重試 |
| Blaze／計費 | 任意部署或持續產生成本的資源 |

「照做」、「更新網站」或來源確認不能推定上述授權。授權內容含糊、目標不一致或實際 diff 超出計畫時停止並重新詢問。

## 部署前 fail-closed 檢查 / Pre-deployment checks

1. 在隔離副本重跑資料驗證、單元測試、Rules Emulator、Functions build、production build、秘密／身分掃描及主要響應式流程。
2. Clone 必須通過 `references/security-and-sanitization.md` 的 allowlist 與零來源身分命中驗收。
3. v1 更新須先證明 legacy 計數、匯出讀回、舊學期唯讀、新事件 `semesterId` 與重跑冪等。
4. `.firebaserc`、Firebase config 與每個部署命令的明確 `--project` 必須指向同一已授權目標；任何不一致立即停止。
5. 部署 artifact 必須是本次已測試版本；掃描 `dist` 與 `functions/lib`，不要部署舊 build 或其他工作區產物。
6. 缺少 `dist`、依賴未完整、Rules tests 未重跑、scanner 非 PASS、CLI 登入不確定或正式目標無法讀取時，不執行部署。
7. 只部署已授權的最小資源，不以方便為由加入 Functions、Indexes、IAM、Secrets 或資料遷移。

命令範圍需明示，例如：

```text
firebase deploy --only firestore:rules --project <TARGET_PROJECT_ID>
firebase deploy --only hosting --project <TARGET_PROJECT_ID>
```

範例不是執行授權；只有教師針對當次目標與 diff 的確認才是。

## 部署後讀回 / Post-deployment read-back

每個已授權資源都必須從正式環境讀回，不以 CLI exit 0、上傳完成或 Console 畫面存在取代：

- project ID、Hosting site／release、公開 URL、HTTP status、cache 與安全 headers；
- Rules／Indexes 的實際版本或可比對摘要，以及正式登入者可／不可執行的最小安全流程；
- Function 名稱、region、generation、runtime、memory、timeout、instance limits、App Check enforcement 證據及 Secret binding 名稱／數量；不得讀出 Secret 值；
- Auth custom-token 登入、固定 uid／role、重新整理後 session 與登出；
- App Check 的註冊目標、provider 與對應產品 enforcement；
- migration 的來源／目的／失敗文件數、內容摘要、冪等重跑及 export read-back；
- 目前學期、班級／座號／科目／節次／課表計數，以及舊學期唯讀與主要新增／匯出流程；
- 瀏覽器 console error 與手機、平板、桌機的關鍵流程。

正式 smoke test 預設只讀。若確實需要寫入 synthetic 文件，部署授權必須另列 collection、文件數上限、可辨識測試 ID、保存或清理方式；測試後刪除仍是獨立資料刪除授權。沒有這項範圍時，不得為了「驗證成功」建立或刪除正式教學紀錄。

讀回失敗或結果與計畫不符時，狀態維持 `DEPLOYMENT_ATTEMPTED` 或 `BLOCKED`，保存實際證據並停止擴大操作。不要自動重試付費、IAM、Secrets、migration 或刪除動作。

## 結案最低證據 / Minimum completion evidence

- 本次來源 `review_hash` 與教師來源確認紀錄；
- 本機 QA、scanner report、build artifact hash 與精確部署 scope；
- 教師正式部署授權紀錄；
- 每項正式資源的部署結果與讀回證據；
- 未驗證、待人工操作、可能費用及回復限制。

只有上述證據與實際目標一致時，才能標記 `DEPLOYED_READ_BACK`。
