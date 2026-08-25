# 路由與 API 契約

本文件是實作導引；機器可讀版本位於 `contracts/api-contract.json`。

## 1. 頁面路由

| 路由 | 對象 | 授權 | 功能 |
|---|---|---|---|
| `/` | 學生、教師 | 公開 | 四單元首頁及教師後台入口 |
| `/units/roundhouse` | 學生 | 公開 | 預留頁，不建立虛構練習 |
| `/units/train-tickets` | 學生 | 公開 | 學號首頁、六步購票、SAMPLE 票 |
| `/units/railway-reading` | 學生 | 公開 | 預留頁 |
| `/units/narrow-gauge` | 學生 | 公開 | 預留頁 |
| `/teacher` | 教師 | ChatGPT 登入＋白名單 | 左欄紀錄與右欄摘要／重播／PDF |

教師頁需使用平台提供的 ChatGPT 登入。頁面及 API 都要在伺服器端執行白名單檢核；前端顯示或隱藏按鈕不構成授權。

## 2. 共通 API 原則

- Base path：`/api`
- 格式：除 PDF 串流外均為 `application/json; charset=utf-8`。
- 時間：UTC ISO 8601；介面再轉成臺北時區。
- ID：伺服器產生不可猜測的 attempt ID。
- 學生權杖：建立 attempt 後回傳短效 token；後續以 `Authorization: Bearer <token>` 傳送。
- D1 只保存 token hash，不保存明文 token。
- 教師 API 不接受學生 token，必須使用已驗證 ChatGPT 身分及白名單。
- 錯誤回應包含穩定 `code`、可朗讀繁體中文 `message` 及可選 `field`。
- 伺服器不得記錄學生 IP 為產品資料或分析欄位。

## 3. 學生 API

### 3.1 建立 attempt

`POST /api/attempts`

Request:

```json
{
  "studentId": "40100",
  "unitId": "unit.train-tickets",
  "contentVersion": "tickets-v1"
}
```

驗證：

- `studentId` 必須符合 `^[0-9]{5}$`。
- `unitId` 本階段只接受 `unit.train-tickets`。
- 伺服器建立 `attempt_id`、到期時間及 `event.attempt_started`。

Response `201`:

```json
{
  "attemptId": "opaque-server-id",
  "attemptToken": "one-time-visible-short-lived-token",
  "nextSeq": 2,
  "status": "in_progress",
  "expiresAt": "server-computed-365-day-expiry"
}
```

### 3.2 追加事件

`POST /api/attempts/{attemptId}/events`

Request:

```json
{
  "events": [
    {
      "seq": 2,
      "step": "origin",
      "action": "field_selected",
      "clientElapsedMs": 1450,
      "payload": {
        "field": "origin",
        "value": "station.ershui"
      },
      "before": {
        "origin": null
      },
      "after": {
        "origin": "station.ershui"
      }
    }
  ]
}
```

規則：

- 每批最多 25 筆。
- `seq` 必須由伺服器回報的 `nextSeq` 連續增加。
- 只接受事件 schema 中的步驟、動作、欄位與模擬值。
- 同一 `attempt_id + seq` 的完全相同重送回傳成功，不能重複寫入。
- 相同 seq 但內容不同回傳 `409 EVENT_SEQUENCE_CONFLICT`。
- attempt 完成後回傳 `409 ATTEMPT_LOCKED`。
- 伺服器加上 `serverReceivedAt`。

Response `200`:

```json
{
  "acceptedThroughSeq": 2,
  "nextSeq": 3,
  "attemptStatus": "in_progress"
}
```

### 3.3 取得當次同步狀態

`GET /api/attempts/{attemptId}/sync`

- 需要 attempt token。
- 只回傳 `nextSeq`、狀態、已接收證據頁碼及 PDF 狀態。
- 不回傳其他學生或其他 attempt。

### 3.4 上傳七頁 PDF

`POST /api/attempts/{attemptId}/evidence`

- Content-Type：`multipart/form-data`
- 欄位：
  - `pdf`：七頁 PDF。
  - `checksum`：SHA-256。
  - `pageCount`：固定 `7`。
  - `contentVersion`：`tickets-v1`。
- 需要 attempt token。
- 只接受已寫入 `event.attempt_completed`、七個頁面 manifest 完整且狀態尚未上傳的 attempt。
- 伺服器檢查檔案類型、大小上限、頁數、checksum、attempt 及頁碼順序。
- R2 key 由伺服器產生，前端不能提供檔名或路徑。
- R2 寫入成功後才更新 D1 `pdf_key` 及狀態。

Response `201`:

```json
{
  "status": "received",
  "pageCount": 7,
  "teacherReceived": true
}
```

若事件已同步但 PDF 尚未成功，回傳可重試狀態，不得顯示「教師已收到」。

## 4. 教師 API

所有 `/api/teacher/*` 端點均執行：

1. 驗證 ChatGPT 使用者。
2. 取得可信電子郵件。
3. 以參數化查詢確認 `teacher_allowlist.active = 1`。
4. 記錄必要的匯出或刪除稽核，不把電子郵件曝露給學生端。

### 4.1 查詢清單

`GET /api/teacher/attempts?unitId=&from=&to=&studentId=&status=&cursor=`

- 預設按日期新到舊。
- 每筆顯示日期、學號、完成時間、狀態及 attempt 末六碼。
- 同一學號多次作答均保留。
- 使用游標分頁，單次上限 50 筆。

### 4.2 取得摘要

`GET /api/teacher/attempts/{attemptId}`

回傳起訖、日期、車次、開始／完成時間、錯誤／修正次數、事件數、同步狀態及七頁狀態。

### 4.3 取得重播事件

`GET /api/teacher/attempts/{attemptId}/events`

- 依 `seq` 遞增。
- 回傳重播需要的 before／after、步驟、動作及相對時間。
- 不回傳 token hash 或內部安全欄位。

### 4.4 預覽或下載 PDF

`GET /api/teacher/attempts/{attemptId}/evidence?disposition=inline|attachment`

- 每次請求重新授權。
- 從 R2 串流，不產生公開 URL。
- 加上 `Cache-Control: private, no-store`。
- 檔名使用單元、日期及 attempt 末六碼；不得讓使用者控制路徑。

### 4.5 匯出清單

`GET /api/teacher/attempts/export?...`

- 使用與清單相同的篩選條件。
- CSV 只含教學所需欄位，不含教師 email、token、IP 或 R2 內部 key。

### 4.6 手動刪除

`DELETE /api/teacher/attempts/{attemptId}`

Request:

```json
{
  "confirmation": "DELETE",
  "reason": "teacher_manual_delete"
}
```

順序：

1. 檢查授權及二次確認。
2. 刪除 R2 PDF。
3. 確認 R2 不存在。
4. 交易式刪除 D1 事件、manifest 與 attempt。
5. 寫入不含學習內容的 `deletion_log`。

### 4.7 清理到期資料

`POST /api/teacher/retention/cleanup`

- 每批最多 25 筆，避免教師後台開啟時長時間阻塞。
- 使用同一個「先 R2、後 D1」流程。
- 回傳掃描數、刪除數、失敗數與下個 cursor。

## 5. 錯誤碼

| HTTP | Code | 用途 |
|---:|---|---|
| 400 | `INVALID_STUDENT_ID` | 非五位數字 |
| 400 | `INVALID_SIMULATION_VALUE` | 非白名單站名、日期、車次或欄位 |
| 400 | `INVALID_EVIDENCE` | PDF 類型、頁數、大小或 checksum 不符 |
| 401 | `ATTEMPT_TOKEN_REQUIRED` | 學生端缺少或 token 無效 |
| 401 | `TEACHER_SIGN_IN_REQUIRED` | 教師尚未登入 |
| 403 | `TEACHER_NOT_ALLOWED` | 已登入但不在白名單 |
| 404 | `ATTEMPT_NOT_FOUND` | 找不到或無權存取 |
| 409 | `EVENT_SEQUENCE_CONFLICT` | seq 重複、倒序或內容衝突 |
| 409 | `ATTEMPT_LOCKED` | 已完成，不可改寫 |
| 409 | `EVIDENCE_NOT_READY` | 七頁或完成事件尚未齊全 |
| 413 | `EVIDENCE_TOO_LARGE` | PDF 超過限制 |
| 429 | `RATE_LIMITED` | 請求過於頻繁 |
| 503 | `SYNC_DEFERRED` | 暫時無法寫入，可安全重試 |

## 6. 離線同步

- 暫存媒介：IndexedDB，不使用 localStorage 作為正式紀錄。
- 本機佇列以 `attemptId + seq` 為鍵。
- 重新連線後先呼叫同步狀態，再從 `nextSeq` 補傳。
- 已被伺服器接受的相同事件重送必須冪等。
- PDF 上傳另行重試；事件成功不代表 PDF 成功。
- 只有事件及 PDF 都成功後，學生端顯示「教師已收到」。

## 7. D1 查詢實作規則

- 使用 prepared statements。
- 一個 `prepare()` 只包含一個 SQL statement。
- 多個互相依賴的 statement 使用 D1 `batch([...])`。
- 所有排序、篩選、刪除與白名單查詢都在伺服器端。
- 資料結構以 `db/schema.ts` 及 `db/migrations/0001_initial.sql` 為準。
