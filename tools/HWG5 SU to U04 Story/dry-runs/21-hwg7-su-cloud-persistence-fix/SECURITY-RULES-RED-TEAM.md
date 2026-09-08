# Firebase Security Rules 紅隊檢查

- 日期：2026-09-08
- 目標：本機 `firestore.rules`、`storage.rules`
- 資料庫：Firestore Standard `(default)`、Native mode、`asia-east1`
- 測試方式：Firebase Firestore＋Storage Emulator、`@firebase/rules-unit-testing`
- 結果：51／51 全部通過；規則測試沒有略過。

## 攻擊結果

| 攻擊向量 | 結果 | 證據／說明 |
|---|---|---|
| 未登入公開列出 | 阻擋 | `reading_records`、`persistence_events` 未登入查詢均拒絕 |
| 跨學生讀寫 | 阻擋 | ownerUid、Storage UID 路徑與學生查詢均受限 |
| 建立時冒用 owner | 阻擋 | `ownerUid` 必須等於 `request.auth.uid` |
| 更新後繞過驗證 | 阻擋 | 學生更新全部拒絕；validator 仍保留在 update 分支 |
| 修改不可變欄位 | 阻擋 | 所有學生更新拒絕，無法改 owner／時間／分數 |
| 缺少必要欄位 | 阻擋 | `hasAll` 與嚴格 validator 拒絕 |
| 型別混淆 | 阻擋 | 分數、遙測 bytes、timestamp、expiresAt 逐欄型別驗證 |
| 額外欄位污染 | 阻擋 | `hasOnly` 拒絕 reading record 與遙測的未知欄位 |
| 巨大字串／檔案 | 阻擋 | 所有字串有上限；音檔與遙測 bytes 上限 10 MiB |
| 負值／超界分數 | 阻擋 | score 僅允許 0–100 |
| 跨 bucket／路徑穿越 | 阻擋 | audioUrl 固定正式 bucket；audioPath／Storage path 嚴格比對 |
| 副檔名與 MIME 偽裝 | 阻擋 | legacy WebM 與 current WAV 分別精確綁定 MIME |
| WAV attemptId 不相符 | 阻擋 | 檔名、metadata、Firestore document ID 必須相符 |
| 缺少／污染 Storage metadata | 阻擋 | expiresAt／attemptId 採 `hasAll`＋`hasOnly` |
| 偽造建立時間／到期日 | 阻擋 | timestamp 必須等於 request.time；到期限制 210–216 天 |
| 偽造教師 | 阻擋 | 錯誤信箱或未驗證信箱不能列出、刪除資料 |
| 學生讀取遙測 | 阻擋 | 學生只能建立，教師才可讀／刪除 |
| 將個資塞入遙測 | 阻擋 | studentId、rawError 等額外欄位被嚴格 schema 拒絕 |
| 查詢與規則不相容 | 通過 | 學生 owner 查詢、教師日期／學號查詢、教師遙測日期查詢皆通過 |
| 權限提升／混合個資／計數器重放／孤兒子集合 | 不適用 | 專案沒有可由學生設定的角色、user profile、計數器或子集合 |

## 剩餘風險

- `persistence_events` 允許任何已登入的匿名使用者建立一筆嚴格、小型且不可讀改的事件；Rules 無法可靠實作每人速率限制。正式 App Check 目前仍是監控模式，因此惡意大量建立仍是較低等級的費用風險。
- 控制方式：固定文件 ID、嚴格 schema／大小／到期、預設拒絕、教師限定讀取；完成真實 iPad 驗收後，再由教師另行決定是否強制 App Check 或改成後端彙總。
- Emulator 驗證規則語法與授權分支，但不等於正式 App Check、Firebase Console 或真實 iPad 麥克風驗收。
