# 作業與課堂事件刪除增量：正式部署紀錄

## 結果

- 狀態：`DEPLOYED_VERIFIED`
- 部署日期：2026-09-02（Asia/Taipei）
- 正式專案：`hwclass-479d2`
- project number：`588111744992`
- Hosting site／網址：`hwclass-479d2`／<https://hwclass-479d2.web.app>
- Function region：`asia-east1`
- 授權依據：教師在本機驗證結果與精確範圍已列明後，明確要求「正式站部署」。

本次只發布作業作廢、課堂事件刪除、30 天回收區及空白備註修正所需的 Firestore Indexes／TTL、Rules、`deleteTeacherRecord` Function 與 Hosting。沒有變更 PIN、Secrets、IAM、Authentication、App Check 註冊或計費設定，也沒有 migration、建立測試教學紀錄、刪除正式紀錄或輪替憑證。

## 來源與產物

- confirmed RDQ：`rdq/RDQ-spec-assignment-incident-deletion-20260902.md`
- 部署來源 Git HEAD：`4d659fc8690f83b368797fd116e24fd03540a453`，另含本次尚未 commit 的 Homeworkclass 範圍變更。
- `firestore.rules` SHA-256：`556244841BA7B449A9595AB1E8DA1ADB172E62724F44F9C7CA1AB7CA669BF690`
- `firestore.indexes.json` SHA-256：`35A9227863186157BE9F8382E02AD825EA9A64F3E1701240D6ECEBAEB69A0992`
- 最終 `firebase.json` SHA-256：`F181CE875EE342E35B1588715BE861E321D548C8E540076A242BC1BA988539A5`
- Hosting build manifest SHA-256：`BDD775E3C041B291B49305D31D6A5508B0A3FA959089D0809CA883FE8FCCCCDB`
- Functions `lib` manifest SHA-256：`D412F2976804EF6E576BE738F8B73DCF2794B02E8C6B0697077C8E7CB7A5C24D`
- 根目錄 lockfile SHA-256：`5B4FFB06AA2301ECAE7FFC189050FEFB1B301BD2FCDA7E94E7544E4A48AC72FE`
- Functions lockfile SHA-256：`5B77185749E9E707DF74C380AEB3FFD7C5FFB3A029D6E5E7DE0DB86D090B5268`

本次使用 `C:\Users\User\AppData\Local\Temp\homeworkclass-production-deploy-20260902-01` 隔離重建；正式資料與秘密未複製進測試 fixture。隔離目錄在證據讀回完成後刪除。

## 部署前驗證

| 關卡 | 結果 |
|---|---|
| 前端單元測試 | 5 files、21 tests passed |
| production build | 2152 modules；4 個 Hosting 檔案 |
| Functions TypeScript build | exit 0 |
| Firestore Rules Emulator | 15/15 passed |
| Auth／Functions／Firestore Emulator | 3/3 passed；原子連動回收、冪等、課堂事件回收、未登入拒絕 |
| 秘密／個資模式掃描 | source、Rules、`dist`、Functions `lib` 共 0 命中 |
| 前端 production audit | 0 vulnerabilities |
| Functions production audit | 9 moderate、0 high、0 critical；Firebase 傳遞性相依鏈，未執行破壞性 force fix |

Functions Emulator 使用主機 Node 24；正式 runtime 仍由 `firebase.json` 與讀回結果鎖定為 Node.js 22。

## 實際部署

以下命令均明確指定 `--project hwclass-479d2`，且 exit code 均為 0：

1. `firebase deploy --only firestore:indexes --project hwclass-479d2 --non-interactive`
2. `firebase deploy --only functions:deleteTeacherRecord --project hwclass-479d2 --non-interactive`
3. `firebase deploy --only firestore:rules --project hwclass-479d2 --non-interactive`
4. `firebase deploy --only hosting --project hwclass-479d2 --non-interactive`
5. 線上讀回發現首頁 `/` 原為預設一小時快取；補上首頁 `no-cache` 後，再執行同一個 Hosting 部署命令。

## 正式環境讀回

### Firestore

- composite indexes：8，與部署檔一致。
- field overrides：1。
- `deletedRecords.purgeAt` TTL：`true`。
- release：`projects/hwclass-479d2/releases/cloud.firestore`
- ruleset：`projects/hwclass-479d2/rulesets/f0f4b1ba-7a40-4e63-b574-2745a09283e2`
- ruleset 建立：2026-09-02 11:34:05（Asia/Taipei）。
- release 更新：2026-09-02 11:34:06（Asia/Taipei）。
- 線上 Rules SHA-256 與本機 `firestore.rules` 完全一致。

### Cloud Function

| 欄位 | 讀回值 |
|---|---|
| 名稱 | `deleteTeacherRecord` |
| region／state | `asia-east1`／`ACTIVE` |
| generation／runtime | 2nd Gen (`gcfv2`)／Node.js 22 |
| memory／timeout | 256 MB／30 秒 |
| max instances／concurrency | 5／80 |
| trigger | callable |
| Secret bindings | 0 |
| deployment hash | `adb45e7aef4d583493b77e3c5ddc520cbbd9c2e2` |

未登入且未攜帶 App Check token 的負向 callable 請求得到 HTTP 401、`UNAUTHENTICATED`，未寫入資料。正式已登入刪除流程刻意沒有拿真實教學紀錄做測試。

### Hosting

- live release：`projects/hwclass-479d2/sites/hwclass-479d2/channels/live/releases/1788320488598000`
- live version：`projects/hwclass-479d2/sites/hwclass-479d2/versions/6a603db5c7b94b95`
- version state：`FINALIZED`
- release time：2026-09-02 11:41:28（Asia/Taipei）。

| 正式檔案 | HTTP | SHA-256 與本機 |
|---|---:|---|
| `index.html` | 200 | 完全一致；`90AA45651170CA8811CE71DE0495218FE731D6F2A0CD4E5BF466337679B89E35` |
| `assets/index-B6mfbmSx.js` | 200 | 完全一致；`6372A566AD4D3F22B9BF6126D4C3BCB8738EFBB4A1D5EB1AEB80C46579C78BE4` |
| `assets/index-BF-3KPA8.css` | 200 | 完全一致；`5133982B7F7E7352EAC118BA5F99B0B03B6CEAC55B72B637942DBE1A93A4F87B` |
| `assets/exceljs.min-v4NjpxKP.js` | 200 | 完全一致；`2E9BF75A9A7342664EDC6F00CA1305D7CD962924F2BADFEA0C5B0683B80B1D32` |

- `/__/firebase/init.json` 的 project ID 為 `hwclass-479d2`。
- `/` 與 `/index.html` 均讀回 `Cache-Control: no-store, must-revalidate, no-cache`。
- `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、Referrer Policy 與 Permissions Policy 均讀回。
- 全新瀏覽器分頁顯示「英語作業與課堂紀錄」、20 節課表與教師後臺入口；登入視窗顯示「Firebase 驗證模式」。
- 正式站瀏覽器 console warning／error：0。

## 尚待教師驗收

1. 教師本人登入後，以確定可刪除的錯誤作業或課堂事件驗證刪除、重新整理與 30 天回收區；本次不建立虛構正式資料，也不替教師刪除既有紀錄。
2. 完整鍵盤焦點循環、Escape、200% 文字、列印與實體手機／平板仍是既有可用性待辦。
3. TTL 已啟用，但 30 天後的實際清理時間只能在未來有回收資料後觀察；TTL 不是即時刪除保證。
4. `_securityRateLimits.expiresAt` 是另一個尚未啟用的 TTL，不屬本次 `deletedRecords.purgeAt` 授權。

## 回復界線

如需回復，Hosting release、Rules、Function 與 TTL 必須分開規劃並再次取得授權。不要直接刪除 Function、關閉 TTL 或覆寫 Rules；正式資料即使已進入回收區，也不因程式 rollback 自動還原。
