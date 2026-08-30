# Homeworkclass template notes

## 已包含

- normalized `homeworkclass-input-v1` JSON loader 與 synthetic fixture。
- 資料驅動班級、有效座號、科目、periodId、節次與課表。
- 四類 operational records 的 `semesterId`；作業及課堂事件另保留 `periodId`。
- demo snapshot schema v2 與依目前學期隔離的 localStorage key。
- Firebase repository 依目前 `semesterId` 查詢，所有操作頁及 context 拒絕非目前學期寫入。
- deny-all `firestore.rules` 及含 bootstrap markers 的 `firestore.rules.template`。
- fixture 驅動的 Rules tests、Emulator seed、CSV／XLSX／JSON 匯出及週六畫面支援。

## Bootstrap 必須取代的 Rules 標記

- `__ACTIVE_SEMESTER_ID__`
- `__VALID_CLASS_IDS__`
- `__VALID_SUBJECT_IDS__`
- `__VALID_PERIOD_IDS__`
- `__VALID_SEAT_EXPRESSION__`

若任何標記未取代，禁止部署。`scripts/render-firestore-rules.mjs` 可供本機／測試產生隔離輸出；模板根的 deny-all Rules 不會自動改寫。

## 明確未完成

- 不是既有 v1 正式站的多學期 migration。
- 沒有自動回填舊 documents 的 `semesterId/periodId`。
- 沒有宣稱舊學期已由 UI 與 Rules 完成唯讀遷移。
- 沒有綁定 Firebase project、Hosting target、Secrets、PIN、App Check site key 或教師電子郵件。
- 沒有執行或授權任何正式部署、計費、IAM、Secrets、Rules、Indexes、Functions 或資料修改。

## Legacy production 更新

既有正式資料仍採 append-only。跨學期更新須由 Skill 在隔離副本執行受控 migration 或相容 adapter，完成備份讀回、筆數／雜湊比對、可回復方案、Emulator／build／裝置 QA，並再次取得精確 Firebase 變更範圍的教師授權。initial-clone 模板不可替代此流程。
