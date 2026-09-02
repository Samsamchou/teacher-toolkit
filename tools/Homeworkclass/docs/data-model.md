# 資料模型 / Data Model

## 目的與不變條件 / Purpose and invariants

此模型支援單一教師在 115 學年度第一學期記錄八班的作業、繳交／補交及課堂事件。正式需求來源是 confirmed RDQ；目前 schemaVersion 為 1。

This model supports one teacher recording assignments, submission and make-up events, and classroom incidents for eight classes. The current snapshot schema is version 1.

核心不變條件：

- 學生資料只使用班級與座號，不保存姓名、正式學號、家長資料或輔導資料。
- 20 節固定課表與 155 個有效座號由版本化學期資料提供。
- 作業與課表例外採 append-only；作業登記錯誤以作廢狀態處理。繳交與課堂事件平時只新增，僅能由受保護後端依已確認刪除契約移入 30 天回收區。
- 目前狀態由事件歷程投影計算，不等於刪除舊紀錄。
- settings/main 是少數可更新資料，只允許有界的需關注權重與門檻。
- 所有日期解讀以 Asia/Taipei 的學校日期為準。

Core invariants:

- Store class and seat number only.
- Treat assignments and operational history as append-only events.
- Derive current state from event history.
- Limit mutable cloud settings to bounded attention weights.
- Interpret school dates in Asia/Taipei.

## 邏輯關聯 / Logical relationships

    Semester 115-1
      ├─ versioned weekly schedule (20 slots)
      ├─ timetableExceptions (cancel or add)
      ├─ assignments
      │    ├─ assignmentRevocations
      │    └─ submissionEvents by valid seat
      ├─ classroomIncidents by class/seat or factual note
      ├─ deletedRecords (30-day TTL payloads)
      ├─ deletionAudits (permanent minimal metadata)
      └─ settings/main attentionWeights

Assignment 是繳交事件的父資料。SubmissionEvent 必須引用既有 assignmentId，且 classId 必須與該作業相同。ClassroomIncident 可有座號或只有事實文字，但兩者至少一項存在。

An assignment is the parent of submission events. Each submission event must reference an existing assignment in the same class. A classroom incident requires either a valid seat number or a factual note.

## Snapshot 與儲存集合 / Snapshot and collections

瀏覽器端以 AppSnapshot 統一讀取資料：

| Snapshot 欄位 / Field | Firebase 來源 / Source | 說明 / Meaning |
|---|---|---|
| schemaVersion | 固定為 1 | 備份與未來 migration 的版本 |
| assignments | assignments | 作業主檔 |
| assignmentRevocations | assignmentRevocations | 作業作廢狀態；原作業仍保留 |
| submissionEvents | submissionEvents | 每位座號的繳交狀態事件 |
| classroomIncidents | classroomIncidents | 課堂事件 |
| deletedRecords | deletedRecords | 教師限定 30 天回收 payload；不進一般匯出 |
| deletionAudits | deletionAudits | 永久最小刪除稽核，不含內容與原因 |
| timetableExceptions | timetableExceptions | 停課、調課、補課事件 |
| attentionWeights | settings/main.attentionWeights | 目前權重與提示門檻 |
| exportedAt | 只在 JSON 匯出加入 | 備份產生時間，不是操作事件 |

The browser loads these collections into one AppSnapshot. Full JSON backups use the same schema and add exportedAt.

## Assignment / 作業

Firebase 路徑：assignments/{id}

| 欄位 / Field | 型別 / Type | 規則 / Rule |
|---|---|---|
| id | string | 文件 ID 必須相同；最長 200 字元 |
| classId | ClassId | 八班之一 |
| subjectId | english, local, international-song | 英語、在地、國際歌謠 |
| assignedDate | YYYY-MM-DD | 出題的學校日期 |
| period | integer 1–7 | 出題節次 |
| homeworkType | textbook, workbook, online-or-worksheet, quiz | 課本、習作、線上練習／學習單、小考 |
| content | string | 1–500 字元 |
| createdAt | ISO timestamp | 寫入時間；正式 Rules 要求 UTC Z 格式 |

Firebase 瀏覽器權限只允許 read 與 create；update、delete 均拒絕。若內容或日期登記錯誤，受保護的 `deleteTeacherRecord` callable 會新增同 ID 的 assignmentRevocation；原作業不改寫、不刪除，但作用中清單、繳交選單、假日衝突與一般報表都排除它。

Firebase browser access permits read and create only. Existing assignment documents cannot be updated or deleted.

## SubmissionEvent / 繳交與補交事件

Firebase 路徑：submissionEvents/{id}

| 欄位 / Field | 型別 / Type | 規則 / Rule |
|---|---|---|
| id | string | 文件 ID 必須相同 |
| assignmentId | string | 必須引用已存在且未作廢的作業 |
| classId | ClassId | 必須與父作業相同 |
| seatNumber | integer | 必須是該班有效座號 |
| outcome | submitted, still-missing, same-day-completed, later-submitted | 已交、仍未交、當天完成、日後補交 |
| reason | excused-absence, unexcused, other | 請假、無故、其他；still-missing 時必填 |
| note | optional string | 最長 500 字元 |
| occurredOn | YYYY-MM-DD | 狀態或實際補交的學校日期 |
| recordedAt | ISO timestamp | 系統寫入時間；用於排列歷程 |

同一作業與座號可有多筆事件。系統依 recordedAt 排序，以最新一筆作為目前狀態；舊事件繼續保留。無任何事件時，目前實作預設為 submitted；教師可先執行「一鍵全班已交」建立明確事件，再逐號新增例外。

Multiple events may exist for the same assignment and seat. The latest recordedAt value determines current state, while all earlier events remain. With no event, the current implementation defaults to submitted.

狀態範例：

    2026-09-01 still-missing, reason=excused-absence
    2026-09-03 later-submitted, occurredOn=2026-09-03

投影後目前狀態為 later-submitted，但第一筆請假未交仍可在歷程與匯出中回查。

The current projection is later-submitted, but the original missing event remains auditable.

## ClassroomIncident / 課堂事件

Firebase 路徑：classroomIncidents/{id}

| 欄位 / Field | 型別 / Type | 規則 / Rule |
|---|---|---|
| id | string | 文件 ID 必須相同 |
| classId | ClassId | 八班之一 |
| subjectId | SubjectId | 三種科目之一 |
| date | YYYY-MM-DD | 事件發生的學校日期 |
| period | integer 1–7 | 發生節次 |
| category | late, chatting, disorder, missing-materials | 遲到、聊天、不守秩序、未帶用品 |
| seatNumber | optional integer | 若填寫，必須是該班有效座號 |
| note | optional string | 簡短事實，1–500 字元 |
| weight | integer 0–10 | 寫入時保存的事件分值 |
| recordedAt | ISO timestamp | 系統寫入時間 |

seatNumber 與 note 至少填一項。事件不可從瀏覽器更新或刪除；教師確認刪除後，只能由受保護 callable 在 transaction 內複製到回收區再刪除原文件。

At least one of seatNumber or note is required. Incident documents are append-only.

## 作廢、回收與刪除稽核 / Revocation, recycle bin, and audit

`deleteTeacherRecord` 只接受固定 uid `homeworkclass-teacher` 與 `role: teacher`，正式 runtime 強制 App Check。合法刪除日期限制在目前學期 2026-08-31 至 2027-01-20。

| 集合 / Collection | 保留 | 欄位摘要 | 瀏覽器權限 |
|---|---|---|---|
| assignmentRevocations | 永久 | id, assignmentId, deletedAt | 固定教師 read；write 拒絕 |
| deletedRecords | 30 天 TTL | id, recordType, originalId, parentAssignmentId（如適用）, payload, deletedAt, purgeAt | 固定教師 read；write 拒絕 |
| deletionAudits | 永久 | id, recordType, originalId, deletedAt, deletedCount | 固定教師 read；write 拒絕 |

作業刪除會在單一 Firestore transaction 中建立 revocation，將所有關聯 submissionEvents 複製到 deletedRecords，再刪除作用中 submissionEvents 並寫入 audit；原 assignment 保留。為維持 Firestore 500-write 上限的安全餘裕，作用中 callable 最多處理 240 筆關聯事件，超過時整筆拒絕且不留下部分狀態。課堂事件則在同一 transaction 中複製、刪除並寫入 audit。固定 audit ID 使重試具冪等性。

回收 payload 不提供還原；`purgeAt` 為伺服器刪除時間加 30 天。Firestore TTL 清理可能晚於標示時間，前端即使讀到延遲清理資料也不再顯示過期 payload。一般匯出排除 deletedRecords；永久 audit 不包含原內容或刪除原因。

目前「需關注」摘要會依**現在的 settings 權重**重新計算篩選範圍內的所有事件，而不是永久鎖定事件寫入時的 weight。達門檻只顯示「需教師確認」，不產生診斷或懲處結論。

The attention summary intentionally recalculates historical categories with the current settings. Reaching the threshold only creates a teacher-review prompt.

預設設定：

| 類別 / Category | 分數 / Weight |
|---|---:|
| late | 1 |
| chatting | 1 |
| disorder | 2 |
| missing-materials | 1 |
| threshold | 4 |

## TimetableException / 課表例外

Firebase 路徑：timetableExceptions/{id}

固定 20 節週課表位於 src/data/semester.ts，不因臨時異動被覆寫。每次停課、調課、補課、國定假日或撤銷國定假日都新增一筆例外。

The 20-slot base timetable remains unchanged. Each cancellation, moved lesson, or make-up lesson is a new exception document.

| type | 必要欄位 / Required fields | 行為 / Effect |
|---|---|---|
| cancel | date, scheduleSlotId, createdAt | 指定日期取消一個固定 slot |
| add | date, replacement, createdAt | 指定日期新增節次、時間、班級與科目 |
| holiday | date, holidayName, createdAt | 指定日期整日不上課，優先於同日固定課與 add；note 選填 |
| holiday-revoke | date, targetHolidayId, note, createdAt | 以必填原因撤銷原假日，恢復原固定課與既有 add 效果 |

例外只能新增，不可從瀏覽器覆寫或刪除。同一天只能有一筆有效 holiday；撤銷不刪改原假日、作業、課堂事件或其他課表異動。同日既有資料以「資料衝突待確認」呈現。

Both types may include a note and remain append-only.

## Settings 與安全限流 / Settings and security rate limits

Firebase 路徑 settings/main 只保存：

    attentionWeights:
      late
      chatting
      disorder
      missing-materials
      threshold

固定教師可 read、create、update，但不可 delete；其他 settings 文件一律拒絕。

The fixed teacher may read, create, and update settings/main but cannot delete it. Other settings documents are rejected.

_securityRateLimits/{saltedIpHash} 只由可信任的 Cloud Function Admin SDK 存取。它保存失敗次數、鎖定截止時間、更新時間與 expiresAt；瀏覽器一律拒絕讀寫，且不保存原始 IP。正式環境建議為 expiresAt 啟用 24 小時 TTL。

The _securityRateLimits collection is Admin-SDK-only. It stores a salted HMAC document ID rather than a raw IP address.

## 學期、課表與座號 / Semester, timetable, and roster

目前版本：

| 欄位 / Field | 值 / Value |
|---|---|
| semester id | 115-1 |
| startDate | 2026-08-31 |
| endDate | 2027-01-20 |
| timezone | Asia/Taipei |
| base schedule | 20 slots |
| valid seats | 155 |

週頁以 ISO 週一為起點，只顯示週一至週五。前 5 個「實際上課日」會套用固定課表及 cancel／add／holiday／holiday-revoke 例外，可跨週；有效 holiday 不算實際上課日，較舊但最新狀態仍為 still-missing 的作業另列為未結案，不會因超過 5 個上課日而消失。

The week view starts on Monday and displays Monday through Friday. The five most recent actual class dates account for timetable exceptions and may cross week boundaries. Older outstanding work remains visible.

完整來源、雜湊與正規化結果見 [source manifest](source-manifest.md)。

See the source manifest for provenance, hashes, and normalized counts.

## Demo 與 Firebase 的資料語意 / Demo and Firebase semantics

| 行為 / Behavior | demo | firebase |
|---|---|---|
| repository | LocalRepository | FirestoreRepository |
| storage | browser localStorage | Firestore |
| event creation | 應用程式流程採 append | Rules 強制 create-only |
| full restore | 可在確認後 replaceAll | 瀏覽器明確拒絕 |
| authentication | 只做 6 位格式檢查 | Function 驗證 PIN 並 custom-token 登入 |
| durability | 單一瀏覽器；清除站台資料會遺失 | 雲端同步；尚未正式部署驗證 |
| suitable data | 假資料 | 完成部署關卡後的正式資料 |

Demo mode does not provide a security boundary. Firebase mode is designed for authenticated, append-only cloud writes, but the current project has not been deployed.

## 匯出、備份與還原 / Export, backup, and restore

- CSV：單一檔案，依序包含作業明細、未補交清單、繳交歷程、需關注摘要與課堂事件。
- XLSX：上述五張工作表；標題列凍結、篩選及橫向列印設定。
- 列印：顯示目前篩選的教師摘要。
- JSON：作用中資料、作廢狀態、永久最小稽核與 exportedAt；刻意排除 deletedRecords 回收 payload。
- demo 還原：先檢查 schemaVersion 1 與必要陣列，再要求教師確認，然後整份取代 localStorage。
- Firebase 還原：瀏覽器禁止；未來必須由受控後端匯入工具執行，保留稽核紀錄。

- CSV/XLSX/print outputs use the current report filters.
- JSON contains the full snapshot.
- Cloud restore is not a browser capability and requires a future audited Admin workflow.

## 保留與刪除政策 / Retention and deletion policy

學期資料保留政策仍為只保存本學期及前一學期，且不自動做整學期破壞性清理：

1. 先辨識超過兩學期的資料。
2. 先提示並完成 JSON／XLSX 匯出與讀回。
3. 由教師明確確認清理範圍。
4. Firebase 只能使用受控 Admin 流程刪除，留下執行時間、範圍、計數及備份證據。
5. 個別刪除流程是獨立例外：deletedRecords 只保留 30 天；demo 讀取時也會排除到期 payload，Firebase 由 purgeAt TTL 清除。

The retention target is the current and previous semester. Version 1 performs no automatic destructive cleanup. Production cleanup remains a separately authorized Admin workflow.

## Schema 演進 / Schema evolution

- 備份匯入必須先檢查 schemaVersion。
- 新欄位不得直接塞入正式文件；需同步更新 TypeScript 型別、Rules 欄位白名單、匯出、測試及本文件。
- 若學期、課表或名冊來源改版，新增版本與有效日期，不覆寫既有來源雜湊或歷史事件。

- Validate schemaVersion before import.
- Any field change requires coordinated updates to types, Rules, exports, tests, and documentation.
- Version timetable and roster changes rather than rewriting provenance.
