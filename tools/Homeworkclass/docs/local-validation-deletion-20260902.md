# 2026-09-02 作業與課堂事件刪除：本機驗證紀錄

> 本文件保留部署前的 `LOCAL_ONLY` 證據。2026-09-02 後續正式部署與讀回已完成，請見 `docs/production-deployment-deletion-20260902.md`。

## 範圍與授權界線

- 需求規格：`rdq/RDQ-spec-assignment-incident-deletion-20260902.md`（confirmed）。
- 本回合只完成原始碼、本機隔離建置、Emulator 與瀏覽器驗證。
- **沒有部署** Firestore Rules、Indexes／TTL、Cloud Functions 或 Hosting，也沒有刪除正式站資料。
- 正式發布前仍須由教師另行明確授權上述四個部署範圍。

## 已完成行為

- 「已出的作業」每筆新增 44×44 px 刪除按鈕與確認視窗。
- 作業刪除保留原 assignment，新增 `assignmentRevocations` 作廢狀態；作用中課表、繳交選單、一般報表與假日衝突統計都排除作廢作業。
- 關聯 `submissionEvents` 由 `deleteTeacherRecord` callable 在同一 transaction 移入 `deletedRecords` 後刪除；超過 240 筆時整筆拒絕，不做部分刪除。
- 課堂事件每筆新增 44×44 px 刪除按鈕；刪除後移入 `deletedRecords`，作用中事件與需關注統計立即排除。
- 回收資料使用伺服器 `deletedAt` 與 30 天後 `purgeAt`；`firestore.indexes.json` 已準備 TTL field override。本機模式也會在讀取時排除並於下次保存時清掉到期 payload。
- `deletionAudits` 永久只存類型、原始 ID、刪除時間與連動筆數；不存內容與刪除原因。
- JSON 備份保留作廢狀態與稽核，但排除 `deletedRecords`；CSV、XLSX 與列印也只呈現作用中資料。
- Firestore 寫入前遞迴省略 `undefined`，已選座號且備註空白的課堂事件不再傳送 `note: undefined`。
- Firestore Rules 維持瀏覽器不可直接 update／delete；回收、作廢與稽核集合只允許固定教師讀取，寫入只由 Admin SDK callable 執行。已作廢作業不可再新增繳交事件。

## 自動驗證

由於 Google Drive 鎖住同步中的 `node_modules`，命令在不含正式資料與秘密的 `C:\Users\User\AppData\Local\Temp\homeworkclass-validation-20260902` 隔離副本執行；原始碼仍以本專案為唯一來源。

| 驗證 | 結果 | 證據 |
|---|---|---|
| 前端 TypeScript | 通過 | `tsc -b` exit 0 |
| Functions TypeScript | 通過 | `npm --prefix functions run build` exit 0 |
| 前端 production build | 通過 | Vite 2152 modules；只有既有 >500 kB chunk 警告 |
| 單元測試 | 通過 | 5 files、21 tests；含 repository、作廢投影、到期清理、undefined 省略、JSON 排除回收資料及既有回歸測試 |
| Firestore Rules Emulator | 通過 | 15/15；含固定教師邊界、瀏覽器不可刪除、隱藏集合只讀及作廢作業拒絕新繳交 |
| Auth／Functions／Firestore Emulator | 通過 | 3/3；作業 2 筆繳交原子連動、冪等重試、課堂事件回收、未登入拒絕 |
| 前端 production audit | 通過 | 0 vulnerabilities |
| Functions production audit | 待上游修正 | 10 moderate、0 high、0 critical；Firebase Admin 傳遞性 `uuid` 鏈，audit 回報無可用修正 |

## 瀏覽器與響應式驗證

- 以本機 production preview 與純假資料登入展示後臺。
- 桌面版實際讀回作業與課堂事件刪除按鈕均為 44×44 px；兩個確認視窗文字與「取消／確認刪除」完整，測試時只開啟後取消，未刪除任何瀏覽器資料。
- 360、768、1440 px 均無整頁水平溢位；360 px 確認視窗完整落在 viewport 內，確認按鈕高度 44 px。
- 後臺「30 天回收區」與「永久稽核摘要」可見，空資料狀態正確。
- production build 在一般 Vite preview 會嘗試讀取 Firebase Hosting 專用的 `/__/firebase/init.json`，因此本機 console 有一筆預期的初始化 JSON 錯誤並安全退回展示模式；Firebase Hosting 正式環境才會提供該端點。這不是正式站讀回證據。

## 正式部署紅燈

若教師之後要求正式部署，至少需分別部署並讀回：

1. Cloud Functions：新增 `asia-east1-deleteTeacherRecord`。
2. Firestore Rules：新增三個隱藏集合只讀規則及作廢作業的新繳交拒絕。
3. Firestore Indexes／TTL：為 `deletedRecords.purgeAt` 啟用 30 天到期清理。
4. Hosting：發布刪除按鈕、確認視窗與回收區 UI。

部署後仍應由教師本人用可刪除的測試紀錄驗證一次完整流程；不得拿真實且無法接受刪除的教學紀錄做測試。
