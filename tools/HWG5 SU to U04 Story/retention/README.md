# 七個月資料保存設定 / Seven-month retention

## 應用程式欄位 / Application fields

- 新增的 `reading_records` 文件包含 `expiresAt`，值為建立日後七個日曆月。
- 新增的 Storage 物件包含 `expiresAt` 自訂中繼資料及 Firestore `audioPath`。
- 不回寫、不搬移或刪除未滿七個月的既有資料。

## Firestore TTL

- Collection group：`reading_records`
- TTL field：`expiresAt`
- 已於 2026-08-26 部署；控制台讀回狀態為「建構中」、偏移 `0 秒`。
- TTL 刪除是非即時的背景作業；到期後可能延遲。

## Cloud Storage lifecycle

- 設定檔：`storage-lifecycle.json`
- Bucket：`hwg5-su-to-u04-story.firebasestorage.app`
- 僅比對 `audio_records/` 前綴。
- 已於 2026-08-26 建立「刪除物件」規則；控制台讀回條件為物件建立至今超過 `215 天` 且名稱符合該前綴。
- Cloud Storage lifecycle 以整數天計算，無法直接表示日曆月。七個月最長為 215 天，因此使用 215 天，確保不會在七個月到期前刪除；實際清除可能晚 0–3 天，再加上生命週期作業延遲。

## 驗證 / Verification

- Firestore CLI 已讀回 `reading_records.expiresAt` 的 `ttl: true`。
- Cloud Console 已讀回 Storage 規則；其他 Storage 前綴不在此規則範圍內。
- Firebase TTL 與 Storage lifecycle 都是背景作業，不保證在到期瞬間刪除。
