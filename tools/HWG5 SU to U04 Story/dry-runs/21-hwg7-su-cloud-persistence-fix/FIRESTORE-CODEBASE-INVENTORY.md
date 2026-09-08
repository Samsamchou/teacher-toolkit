# Firestore／Storage 程式盤點（規則修改前）

- 日期：2026-09-08
- Firestore：`(default)`、Standard、Native mode、`asia-east1`
- Authentication：學生匿名登入；教師須為已驗證的 `samchouou@gmail.com`
- 預設策略：未明確列出的 Firestore 文件與 Storage 路徑全部拒絕。

## reading_records 資料模型與操作

- 學生建立一筆不可更新、不可刪除的評分文件；欄位為 `ownerUid`、`studentId`、`theme`、`unit`、`date`、`sentenceId`、`targetText`、`transcript`、`score`、`feedback`、`audioUrl`、`audioPath`、`expiresAt`、`timestamp`。
- 學生只能讀自己的文件；教師可以依日期或學號查詢全班文件並刪除教師選定的文件。
- 學生查詢：`ownerUid == currentOwnerUid`、`studentId == currentStudentId`、`date == today`、`theme == currentTheme`、`unit == currentUnit`，再於前端依 `sentenceId` 計數。
- 教師查詢：`date == selectedDate`；或 `studentId == selectedStudent` 且 `date == selectedDate`。
- 既有舊版以 auto-ID 寫文件，音檔為純數字 `.webm`；新版需改為固定 `attemptId` 文件 ID 與 `timestamp-attemptId.wav`，才能在逾時後安全讀回而不重複。

## audio_records Storage 模型與操作

- 路徑固定為 `audio_records/{ownerUid}/{studentId}/{fileName}`。
- 學生只能建立與讀取自己 UID 下的音檔，不可更新或刪除；教師可讀取及刪除。
- 舊版需保留純數字 `.webm`＋WebM MIME；新版只允許已驗證 PCM WAV、固定檔名結構、10 MiB 上限、七個月 `expiresAt` 與相符 `attemptId` metadata。

## 新增的匿名失敗遙測

- `persistence_events/{attemptId}-{stage}` 僅保存 `stage`、`category`、`mimeType`、`bytes`、`date`、`expiresAt`、`timestamp`。
- 不保存音訊、逐字稿、姓名、學號、owner UID、憑證或原始錯誤訊息；學生只能建立且不能讀取，教師可按日期讀取彙總。

## 修改前確認的失敗點與安全界線

- 正式規則只接受舊式純數字 WebM，新版 WAV 上傳必然被拒絕。
- 前端使用 `.add()` 隨機文件 ID 且吞掉保存例外，無法辨識部分成功或安全重試。
- 修復不得放寬其他路徑、不得允許學生更新既有文件、不得讓學生讀取其他學生或遙測資料、不得改寫任何既有紀錄。
