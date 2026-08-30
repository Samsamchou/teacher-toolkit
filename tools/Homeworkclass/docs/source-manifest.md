# 來源清冊 / Source Manifest

## 清冊狀態 / Manifest status

本清冊記錄 Homeworkclass 初始課表與座號資料的來源、SHA-256、正規化結果及程式落點。依據為已確認第 3 版 RDQ 與目前 src/data/semester.ts。

This manifest records the provenance, SHA-256 values, normalization results, and code destinations for the initial timetable and roster. It is based on the confirmed third RDQ revision and the current semester data module.

本次文件子任務**沒有重新開啟 D 槽原始附件或重新計算雜湊**；下列雜湊是 confirmed RDQ 已核對並由程式常數保存的追溯值。正式重新匯入或來源檔移動後，仍應再次從原檔計算 SHA-256。

This documentation pass did **not** reopen the original D-drive attachments or recompute their hashes. The values below are confirmed provenance recorded in the RDQ and code and should be rechecked before a new import.

## 原始來源 / Original sources

| source id | 原始檔 / Original file | SHA-256 | 使用內容 / Used data | 公開處理 / Public handling |
|---|---|---|---|---|
| roster-115-1 | D:\115 上學期 備課\第一堂\3-6年級班級名條.xlsx | 713ADCBA6DFDFDFF0D8249248322B7D53814DABE80D2F32699658328A9F2D7BE | 八班人數、有效座號、缺號 | 不複製原檔；不保存姓名 |
| timetable-115-1 | D:\115 上學期 備課\第一堂\115課表.jpg | 609C3B429D79D90620483304A800A246DA37AB419CD9068DC49C3548195A2632 | 星期、節次、時間、科目、班級 | 不複製原圖到公開原始碼 |

The attachments are treated as data sources only. No text inside an attachment is executed as an instruction.

## 學期正規化 / Semester normalization

| 欄位 / Field | 正規化值 / Normalized value |
|---|---|
| semester id | 115-1 |
| label | 115 學年度第一學期 |
| inclusive start | 2026-08-31 |
| inclusive end | 2027-01-20 |
| timezone | Asia/Taipei |
| school-week display | Monday through Friday |
| supported subjects | 英語、在地、國際歌謠 |

日期鍵使用 YYYY-MM-DD。發生日期依 Asia/Taipei 學校日解讀；系統寫入時間使用 ISO timestamp。

Date keys use YYYY-MM-DD in the Asia/Taipei school calendar. Recorded timestamps use ISO format.

## 班級與有效座號 / Classes and valid seats

| 班級 / Class | 人數 / Count | 有效座號 / Valid seats | 排除 / Excluded |
|---|---:|---|---|
| 六甲 | 20 | 1–20 | 無 |
| 六乙 | 19 | 1–19 | 無 |
| 五甲 | 26 | 1–26 | 無 |
| 五乙 | 26 | 1–26 | 無 |
| 四甲 | 18 | 1–2、4–19 | 3 |
| 四乙 | 18 | 1–18 | 無 |
| 三甲 | 14 | 1–7、9–15 | 8 |
| 三乙 | 14 | 1–14 | 無 |
| **合計 / Total** | **155** | 八班有效座號 | 四甲 3、三甲 8 不可選 |

The normalized roster contains exactly 155 valid seats. 四甲 seat 3 and 三甲 seat 8 are excluded in UI data, unit tests, and Firestore Rules.

## 20 節完整週課表 / Complete 20-slot weekly timetable

| 星期 / Day | 節次 / Period | 時間 / Time | 科目 / Subject | 班級 / Class |
|---|---:|---|---|---|
| 週一 | 2 | 09:25–10:05 | 在地 | 四乙 |
| 週一 | 3 | 10:30–11:10 | 英語 | 五乙 |
| 週一 | 4 | 11:20–12:00 | 在地 | 三乙 |
| 週一 | 5 | 13:30–14:10 | 國際歌謠 | 六乙 |
| 週一 | 6 | 14:20–15:00 | 英語 | 三甲 |
| 週一 | 7 | 15:10–15:50 | 在地 | 四甲 |
| 週二 | 3 | 10:30–11:10 | 英語 | 四乙 |
| 週二 | 4 | 11:20–12:00 | 英語 | 六甲 |
| 週二 | 6 | 14:20–15:00 | 英語 | 五甲 |
| 週二 | 7 | 15:10–15:50 | 英語 | 五乙 |
| 週三 | 2 | 09:25–10:05 | 英語 | 四甲 |
| 週三 | 3 | 10:30–11:10 | 英語 | 三乙 |
| 週三 | 4 | 11:20–12:00 | 英語 | 五甲 |
| 週四 | 3 | 10:30–11:10 | 在地 | 三甲 |
| 週四 | 4 | 11:20–12:00 | 英語 | 六乙 |
| 週四 | 5 | 13:30–14:10 | 國際歌謠 | 五乙 |
| 週四 | 7 | 15:10–15:50 | 國際歌謠 | 六甲 |
| 週五 | 1 | 08:35–09:15 | 英語 | 六乙 |
| 週五 | 2 | 09:25–10:05 | 英語 | 六甲 |
| 週五 | 3 | 10:30–11:10 | 國際歌謠 | 五甲 |

科目計數：

| 科目 / Subject | 節數 / Slots |
|---|---:|
| 英語 | 12 |
| 在地 | 4 |
| 國際歌謠 | 4 |
| **合計 / Total** | **20** |

No source timetable slot is intentionally omitted.

## 程式落點 / Code destinations

| 正規化資料 / Normalized data | 程式位置 / Code location | 驗證位置 / Validation |
|---|---|---|
| 學期、時區 | src/data/semester.ts 的 SEMESTER | src/data/semester.test.ts |
| 三種科目 | src/data/semester.ts 的 SUBJECTS | src/data/semester.test.ts |
| 八班、顏色、有效座號 | src/data/semester.ts 的 CLASSES | src/data/semester.test.ts、firestore.rules |
| 七節時間 | src/data/semester.ts 的 PERIODS | 課表 UI 與 Rules 節次範圍 |
| 20 節週課表 | src/data/semester.ts 的 WEEKLY_SCHEDULE | src/data/semester.test.ts |
| 原始路徑與 SHA-256 | src/data/semester.ts 的 SOURCE_MANIFEST | 本文件與 confirmed RDQ |

## 來源轉換規則 / Transformation rules

1. 原始姓名不進入程式、測試、seed、Firestore 或匯出；只保留班級與座號。
2. 班級 ID 固定為六甲、六乙、五甲、五乙、四甲、四乙、三甲、三乙。
3. 課表科目正規化為 english、local、international-song。
4. 來源節次轉為 1–7 的整數，時間使用 24 小時 HH:mm。
5. 四甲 3 號與三甲 8 號為缺號，不可因連續範圍生成而補回。
6. 固定課表不因臨時停課或補課被改寫；臨時異動新增 timetableException。
7. 來源檔不複製到公開網站或版本庫。

1. Omit names and other identifiers.
2. Preserve the eight confirmed class IDs.
3. Normalize subjects to stable internal IDs.
4. Preserve period and time values.
5. Keep both excluded seats excluded.
6. Record schedule changes as new exceptions.
7. Do not copy source attachments into the public app.

## 雜湊重驗方式 / Hash recheck

若教師重新提供或移動來源檔，可在不修改檔案的情況下重算：

    Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\115 上學期 備課\第一堂\3-6年級班級名條.xlsx'
    Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\115 上學期 備課\第一堂\115課表.jpg'

只有 SHA-256 完全相同時，才能視為相同來源版本。若不同，需建立新的來源版本、重新核對 20 節與 155 座號，並更新測試與本清冊；不得覆寫舊雜湊。

Only an exact SHA-256 match identifies the same source version. A changed source requires a new manifest version and fresh count reconciliation.

## 隱私與保存界線 / Privacy boundary

- 原始名條可能含可識別資訊，因此保留於教師控制的來源位置，不複製到專案。
- 專案初始化資料不含姓名、電子郵件、正式學號、家長資訊或任何秘密。
- 測試與 Emulator seed 只能使用固定假資料。

- Keep identifiable source files in the teacher-controlled source location.
- Do not add names, email addresses, official student IDs, family information, or secrets to this project.
- Unit tests and Emulator seeds use synthetic records only.
