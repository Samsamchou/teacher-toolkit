# Security Rules Devil's Advocate

日期：2026-08-27

| 攻擊 | 結果 | 證據／理由 |
|---|---|---|
| Public list exploit | 阻擋 | 未登入 list emulator 測試拒絕；預設 deny。 |
| Unauthorized get/create/update/delete | 阻擋 | 跨 UID get、學生 update/delete 均拒絕。 |
| Update bypass | 阻擋 | `allow update: if false`，紀錄不可更新。 |
| Ownership hijacking on create | 阻擋 | `ownerUid` 必須等於 `request.auth.uid`。 |
| Ownership hijacking on update | 阻擋 | 所有 update 拒絕。 |
| Immutable timestamp modification | 阻擋 | 所有 update 拒絕；create 使用 `request.time`。 |
| Type juggling | 阻擋 | 所有欄位做型別與範圍檢查。 |
| Create/update validation mismatch | 阻擋 | create 使用完整 validator；update 不允許。 |
| Resource exhaustion | 阻擋 | 每個字串有上限；Storage 10 MiB 上限。 |
| Required-field omission | 阻擋 | `hasAll` 加 `hasOnly`。 |
| Privilege escalation | 阻擋 | 教師權限只來自已驗證 Firebase token email，沒有可自填角色。 |
| Schema pollution | 阻擋 | emulator 額外欄位測試拒絕。 |
| Invalid state transition | 不適用 | 無狀態欄位且所有 update 拒絕。 |
| Path traversal/scoping | 阻擋 | Firestore `audioPath` 與 Storage path 都綁定 auth UID。 |
| Timestamp manipulation | 阻擋 | 偽造歷史 timestamp emulator 測試拒絕。 |
| Negative/overflow score | 阻擋 | score 僅允許 0–100。 |
| Mixed-content leak | 阻擋 | 沒有公開 users 集合；學生只能讀自己的紀錄。 |
| Counter/action replay | 不適用 | 無計數器寫入；成功次數由不可更新的新紀錄計算。 |
| Orphaned subcollection | 不適用 | 無子集合。 |
| Query mismatch | 通過 | 學生查詢含 `ownerUid`；教師日期與學號查詢由 teacher rule 允許。 |
| Validator pattern | 通過 | create 使用 domain validator；update 全面拒絕。 |

## 驗證結果

- Firestore/Storage emulator：6/6 通過。
- Firebase Rules deployment dry run：Firestore 與 Storage 皆 compiled successfully。
- 正式 Rules 尚未部署；正式資料未被讀取、修改或刪除。
