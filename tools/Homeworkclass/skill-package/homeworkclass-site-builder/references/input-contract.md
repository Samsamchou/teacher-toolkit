# Homeworkclass 標準輸入契約（v1）

本文件定義 `homeworkclass-site-builder` 的學期來源格式、驗證規則、錯誤報告與照片備援確認流程。來源解析與 Firebase 正式部署是兩道獨立紅燈；通過本契約只代表資料可供教師確認，不代表可改正式站或部署。

## 1. 契約識別與處理順序

- 契約代號：`homeworkclass-input-v1`
- 標準來源：`.xlsx`，優先於照片。
- 照片備援：課表照片（JPG／PNG）加上至少含學期、科目、班級、有效座號與節次的 Excel。
- 禁止格式：`.xlsm`、`.xls`、含巨集、外部連結、資料格公式、隱藏資料列或隱藏資料工作表的活頁簿。
- 解析流程：來源唯讀複製 → SHA-256 → 結構檢查 → 正規化 → 隱私清理 → 跨表驗證 → 產生報告 → 教師確認。
- `validation-report.json` 只會是 `BLOCKED` 或 `NEEDS_CONFIRMATION`。只有教師確認後另建的 `source-gate.json` 可為 `READY`；兩者都不得授權正式 Firebase 寫入。
- 任一來源檔案、教師修正或正規化結果改變時，舊 `review_hash` 與舊確認立即失效。

## 2. Excel 通用規則

- 工作表名稱必須完全符合下列 7 張表；`00_說明` 只供人閱讀。
- 第 1 列是欄名，第 2 列起是資料。欄名使用下表列出的英文 `snake_case`；欄位順序不影響語意。
- 尾端全空白列忽略；資料區中間的空白列保留列號並回報。
- 下表列出的欄名都必須存在；「必填：否」只表示該欄每列的值可留白，不表示可刪除整欄。缺少必要欄名是阻擋錯誤。標準範本中的任何未知欄位（包括姓名欄）都是阻擋錯誤；只有「照片＋原始名冊」備援流程可在隔離記憶體中先清除已知姓名欄，再產生不含姓名的標準工作簿。
- 未知且全空白工作表可回報警告；未知且含資料的工作表必須阻擋，以免漏匯入或夾帶個資。
- 所有文字先做 Unicode NFKC 正規化，再移除頭尾空白；ID 被修整時回報 `W-ID-TRIMMED`。
- ID 長度 1–32，首字必須是 Unicode 字母或數字，其餘只允許 Unicode 字母、數字、底線與連字號；不得有空白、斜線或反斜線。
- 日期接受 Excel 日期值或嚴格 `yyyy-mm-dd`；時間接受 Excel 時間值或 24 小時制 `HH:mm`。
- 空字串不等於缺值；必要欄位的空字串仍是錯誤。
- 不得默默截斷、猜測 ID、補造班級、科目、座號、節次或課表。

## 3. 固定工作表與欄位

### `00_說明`

人類可讀的填寫說明與版本資訊，不參與資料正規化。不得放姓名、聯絡方式或其他學生個資。

### `01_學期設定`

必須且只能有 1 筆資料。

| 欄位 | 必填 | 型別與規則 |
|---|---:|---|
| `contract_version` | 是 | 固定為 `homeworkclass-input-v1` |
| `semester_id` | 是 | 學期唯一 ID，例如 `116-1` |
| `semester_label` | 是 | 1–60 字，例如 `116 學年度第一學期` |
| `site_title` | 是 | 1–80 字，不得含教師姓名或學生個資 |
| `start_date` | 是 | 學期起日 |
| `end_date` | 是 | 學期迄日，必須大於或等於起日 |
| `timezone` | 是 | v1 固定為 `Asia/Taipei` |
| `source_note` | 否 | 0–200 字的非個資來源備註 |

### `02_科目`

| 欄位 | 必填 | 型別與規則 |
|---|---:|---|
| `subject_id` | 是 | 科目唯一 ID |
| `subject_label` | 是 | 1–60 字顯示名稱 |
| `short_label` | 是 | 1–4 字，在 `02_科目` 全表唯一 |
| `display_order` | 是 | 正整數，科目內唯一 |

### `03_班級`

| 欄位 | 必填 | 型別與規則 |
|---|---:|---|
| `class_id` | 是 | 班級唯一 ID |
| `class_label` | 是 | 1–60 字顯示名稱 |
| `short_label` | 是 | 1–4 字，在 `03_班級` 全表唯一 |
| `display_order` | 是 | 正整數，班級內唯一 |
| `color_override` | 否 | `#RRGGBB`；空白時由網站調色盤配置 |

若指定 `color_override`，前景文字對背景的 WCAG 對比至少 4.5:1；相鄰班級顏色宜達 DeltaE2000 15 以上。未達標時不得直接採用原色，報告須列出替代色供教師確認。

### `04_有效座號`

每列代表一個在該學期有效的班級座號；標準表不得有姓名欄。

| 欄位 | 必填 | 型別與規則 |
|---|---:|---|
| `class_id` | 是 | 必須存在於 `03_班級` |
| `seat_number` | 是 | 1–999 的整數；`class_id + seat_number` 必須唯一 |

每一班至少要有 1 個有效座號。座號不必連續，也不得用最大座號推算班級人數。

### `05_節次`

| 欄位 | 必填 | 型別與規則 |
|---|---:|---|
| `period_id` | 是 | 節次唯一 ID |
| `period_label` | 是 | 1–60 字顯示名稱 |
| `display_order` | 是 | 正整數，節次內唯一 |
| `start_time` | 是 | 24 小時制開始時間 |
| `end_time` | 是 | 必須晚於 `start_time` |

節次的時間區間不得互相重疊。即使課表當下未使用該節，時間倒置或重疊仍是輸入錯誤。

### `06_固定課表`

每列代表單一教師的一個固定授課格。

| 欄位 | 必填 | 型別與規則 |
|---|---:|---|
| `weekday` | 是 | 整數 1–7；1=週一，7=週日 |
| `period_id` | 是 | 必須存在於 `05_節次` |
| `class_id` | 是 | 必須存在於 `03_班級` |
| `subject_id` | 是 | 必須存在於 `02_科目` |
| `note` | 否 | 0–200 字的非個資備註 |

同一教師的 `weekday + period_id` 只能有一列。不同 `period_id` 若在同一天的實際時間重疊，仍視為碰撞。相同 `period_id` 的重複列只回報 `E-SLOT-COLLISION`，不再重複回報同一對資料的 `E-TIME-OVERLAP`。

## 4. 容量上限

v1 採下列明確上限，超過時回報 `E-LIMIT`，不得截斷後繼續：

| 資料 | 上限 |
|---|---:|
| 班級 | 32 |
| 科目 | 16 |
| 節次 | 16 |
| 每班有效座號 | 60 |
| 固定課表列 | 512 |

## 5. 跨表與語意驗證

- `semester_id`、各類 ID、`display_order` 與複合座號鍵依各表規則保持唯一。
- 所有外鍵必須存在；不得因名稱相似自動建立或配對。
- `start_date <= end_date`，且學期時區必須是 `Asia/Taipei`。
- 每班至少一個有效座號；每個座號必須是整數。
- 每節 `start_time < end_time`；節次時間不可重疊。
- 同一 `weekday + period_id` 不可安排兩班或兩科。
- 未被課表使用的班級、科目或節次可保留，但以 `W-UNUSED-CLASS`、`W-UNUSED-SUBJECT`、`W-UNUSED-PERIOD` 提醒，不阻擋。
- v1 不從 Excel 匯入國定假日、臨時停課、調課、作業、繳交或課堂事件。這些資料必須由應用程式以 append-only 事件另行管理。

## 6. 錯誤碼最低集合

驗證器至少支援：

- 結構：`E-SHEET-MISSING`、`E-SHEET-UNKNOWN`、`E-COLUMN-MISSING`、`E-COLUMN-UNKNOWN`、`E-ID-FORMAT`、`E-ID-DUPLICATE`、`E-FORMULA`、`E-EXTERNAL-LINK`、`E-MACRO`、`E-HIDDEN-DATA`。
- 關聯與範圍：`E-FOREIGN-KEY`、`E-DATE-RANGE`、`E-TIME-RANGE`、`E-SEAT-DUPLICATE`、`E-CLASS-NO-SEAT`、`E-SLOT-COLLISION`、`E-TIME-OVERLAP`、`E-LIMIT`。
- 隱私與來源：`E-PII-UNAPPROVED`、`E-PII-VALUE`、`E-SOURCE-MISMATCH`、`E-SOURCE-UNRESOLVED`、`W-PII-DROPPED`、`W-ID-TRIMMED`、`W-SHEET-UNKNOWN`、`W-UNUSED-*`。

## 7. 個資清理

- 正式正規化結果只保留班級與有效座號，不保留學生姓名。
- 標準範本若出現 `姓名`、`學生姓名`、`name`、`student_name` 等欄位，回報 `E-PII-UNAPPROVED` 並阻擋。只有照片＋原始名冊備援轉換器可在解析記憶體中移除已知姓名欄，只回報欄名與移除筆數 `W-PII-DROPPED`；報告、日誌與錯誤內容不得回顯姓名值。
- 身分證字號、生日、電話、地址、電子郵件、監護人資料或其他未核准個資一律回報 `E-PII-UNAPPROVED` 並阻擋。
- `source_note`、`note` 與網站標題若偵測到疑似個資，必須遮蔽顯示並交由教師處理；不得自動接受。
- 原始來源只留在隔離工作區；產出 manifest 保存雜湊與必要檔案中繼資料，不把原始個資複製到 Skill、fixture、Git 或正式站。

## 8. 正規化 JSON 與 fixture 封套

測試 fixture 的 `input` 使用與 Excel 對應的 `snake_case` 欄位；通過驗證後，`normalized-semester.json` 轉成下列應用程式專用 `camelCase` 結構。陣列順序依 `display_order`，座號依班級順序再依座號排序，課表依 `weekday`、節次順序排序。

```json
{
  "contractVersion": "homeworkclass-input-v1",
  "semester": {
    "id": "116-1",
    "label": "116 學年度第一學期",
    "siteTitle": "範例站",
    "startDate": "2027-09-01",
    "endDate": "2028-01-19",
    "timezone": "Asia/Taipei",
    "sourceNote": ""
  },
  "subjects": [],
  "classes": [],
  "periods": [],
  "schedule": []
}
```

Skill 測試 fixture 採 `{ "fixture": ..., "input": ... }` 封套。生產正規化器只接收 `input`；`fixture` 是測試斷言，不得匯入網站。有效 fixture 的 `validation_status` 為 `NEEDS_CONFIRMATION`，因為零錯誤仍需教師確認；教師確認後另建的 `source-gate.json` 才可為 `READY`，驗證報告不改寫。無效 fixture 的 `required_issues` 表示報告至少必須包含這些錯誤碼與 record key；額外錯誤必須有確定依據，不能靠猜測產生。

## 9. 驗證產出

每次執行至少產生：

- `source-manifest.json`：來源角色、原檔名、媒體型別、位元組數、SHA-256；照片另含像素尺寸與方向。
- `normalized-semester.json`：通過個資清理的正規化資料，不含 fixture 斷言。
- `validation-report.json`：機器可讀的完整狀態與議題。
- `validation-report.md`：教師可讀的繁體中文摘要。
- `validation-issues.csv`：可篩選的逐筆問題清單。
- `source-gate.json`：只有教師精確確認目前 `review_hash` 後由 `approve` 指令另建；包含解析器版本、完整 review hash、來源清單、正規化 hash、`approvalScope: source-only` 與 `deploymentAuthorized: false`。

`validation-report.json` 的最低欄位：

```json
{
  "contract_version": "homeworkclass-input-v1",
  "parser_version": "1.0.0",
  "run_id": "UUID",
  "status": "BLOCKED | NEEDS_CONFIRMATION",
  "source_files": [],
  "normalized_sha256": "64-char lowercase hex",
  "review_hash": "HC1-12-char uppercase hex",
  "review_hash_full": "64-char lowercase hex",
  "counts": {
    "classes": 0,
    "seats": 0,
    "subjects": 0,
    "periods": 0,
    "schedule_slots": 0
  },
  "issues": [],
  "pii_columns_dropped": [],
  "reconciliation": {}
}
```

每筆 `issues[]` 至少含：

| 欄位 | 說明 |
|---|---|
| `severity` | `ERROR`、`WARNING` 或 `INFO` |
| `code` | 穩定錯誤碼 |
| `sheet` | Excel 工作表；JSON fixture 可為對應邏輯表 |
| `row` | Excel 原列號；不適用時為 `null` |
| `column` | 欄名；跨列議題可為 `null` |
| `record_key` | 不含個資的穩定鍵 |
| `value_redacted` | 遮蔽後的值或 `null` |
| `message_zh` | 可執行的繁體中文說明 |
| `expected` | 合法格式或預期關聯 |
| `suggested_action` | 教師或維護者下一步 |
| `blocking` | 布林值 |

狀態規則：

- 有任一 `ERROR` 或未解決來源差異：`BLOCKED`，`review_hash` 為 `null`。
- 零 `ERROR`、零未解決來源差異，但尚未確認：`NEEDS_CONFIRMATION`。
- 教師確認紀錄中的 hash 完全等於目前 `review_hash` 時，另建 `source-gate.json` 並把該 gate 標成 `READY`；不得回寫驗證報告。
- `review_hash` 為目前來源 SHA-256 集合、正規化 JSON SHA-256、契約版本與解析器版本的確定性摘要，格式 `HC1-` 加 12 個大寫十六進位字元；完整 64 字元雜湊同時保存在 manifest、驗證報告與 source gate。
- 教師確認文字：`確認來源：<review_hash>`。這項確認不等於 Firebase 部署授權。

## 10. 照片備援與人工確認輸出

照片備援只用於固定課表。班級、科目、有效座號、節次與學期設定仍需由 Excel 提供；不得從照片猜座號或建立學生資料。

每次照片解析另產生：

- `photo-source-manifest.json`：每張原圖檔名、SHA-256、尺寸、方向、處理版本。
- `photo-overlay-<page>.png`：標出辨識區塊與 `region_id`，供教師逐格核對。
- `photo-slots.csv`：`source_page,region_id,weekday,period_id,class_text_redacted,subject_text_redacted,resolved_class_id,resolved_subject_id,confidence,status,teacher_correction`。
- `photo-review-report.json` 與 `.md`：已配對、低信心、未解決、疑似個資遮蔽與總筆數。
- `photo-vs-excel.csv`：若同時提供完整 Excel 課表，逐格列出 `weekday,period_id,excel_class_id,excel_subject_id,photo_class_id,photo_subject_id,resolution`。

Excel 是首選來源，但照片與 Excel 的差異不得靜默忽略。每筆差異必須由教師選擇 `USE_EXCEL`、`USE_PHOTO` 或填寫修正；未處理的低信心格、無法對應 ID、碰撞與差異均為 `E-SOURCE-UNRESOLVED` 或 `E-SOURCE-MISMATCH`，狀態保持 `BLOCKED`。所有差異解決後，再對正規化結果計算新的 `review_hash`。

## 11. 最小驗收

- `assets/fixtures/valid-semester.json`：必須解析成功、零阻擋錯誤，計數精確為 3 班、12 個有效座號、4 科、9 節、7 個課表格，狀態為 `NEEDS_CONFIRMATION`。
- `assets/fixtures/invalid-semester.json`：狀態必須為 `BLOCKED`，且至少回報 `E-SEAT-DUPLICATE`、`E-FOREIGN-KEY`、`E-TIME-RANGE`、`E-SLOT-COLLISION`，record key 與 fixture 斷言相符。
- 兩份 fixture 均不得含姓名、電子郵件、秘密、Firebase 設定或現站班級資料。
- 驗證結果可重現：相同輸入與相同驗證器版本必須得到相同的正規化 JSON 與議題集合；`run_id`、時間戳等執行中繼資料除外。
