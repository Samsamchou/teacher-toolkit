# __SITE_TITLE__

這是 Homeworkclass Skill 的「其他教師空白重製」可執行模板。它保留 React、TypeScript、Vite、Firebase Authentication 自訂權杖、Cloud Functions、Firestore、App Check、匯出、國定假日與響應式介面，但不綁定任何正式 Firebase 專案、教師帳號、通行碼、名冊或部署歷程。

## 安全預設

- `.env.example` 預設為 `VITE_DATA_MODE=demo`；所有 Firebase Web App 欄位均為空白。
- `firestore.rules` 是 deny-all，不能直接當正式 Rules。
- `firestore.rules.template` 只能由 Homeworkclass Skill 以教師確認過的 `semester.json` 取代五個標記、產生 clone 專用 Rules，通過 Emulator 測試與人工檢視後才可另行請求部署授權。
- 任意六位數只適用本機 demo 格式檢查，不是正式驗證；正式 PIN 由教師本人在安全互動式終端機設定。
- 不要提交 `.env*.local`、`.firebaserc`、Secrets、服務帳戶、App Check debug token、session、`node_modules`、`dist`、`functions/lib` 或 log。

## Synthetic fixture

`src/data/semester.json` 是 `homeworkclass-input-v1` 範例，`__SEMESTER_ID__` 目前由 synthetic 116-1 星河資料示範：3 班、12 個有效座號、4 科、9 個節次、7 筆固定課程，並含週六課程。資料完全虛構，clone pipeline 會以教師確認過的 normalized input 覆寫此檔。

Normalized contract 欄位：

- `semester`: `id,label,siteTitle,startDate,endDate,timezone,sourceNote`
- `subjects`: `id,label,shortLabel,displayOrder`
- `classes`: `id,label,shortLabel,displayOrder,accent,accentSoft,ink,seats[]`
- `periods`: `id,label,displayOrder,startTime,endTime`
- `schedule`: `id,weekday,periodId,classId,subjectId,note?`

Runtime 只把 `displayOrder` 衍生成相容舊畫面的數字節次；`semesterId` 與 `periodId` 會保留在作業、繳交、課堂事件及課表異動資料中。班級、科目、節次與每週課數都從 JSON 取得。

## 本機驗證

```powershell
Copy-Item -LiteralPath .env.example -Destination .env.local
npm ci
npm test
npm run build
npm run test:rules
```

Rules 測試會在記憶體中以目前 `semester.json` 產生規則；不會覆寫 deny-all 的 `firestore.rules`。`scripts/seed-emulator.mjs` 只接受含明確連接埠的 loopback `FIRESTORE_EMULATOR_HOST`，並從同一份 JSON 取得學期、班級、科目、periodId、座號與日期。

## Firebase clone

本模板沒有 `.firebaserc`。教師須建立自己擁有的 Firebase 專案並親自完成登入、計費、App Check、Secrets、PIN 與每項部署授權。不要從另一位教師的正式專案複製環境檔、資料或 deployment metadata。

## 多學期界線

此模板提供「單一 active 學期」initial-clone 介面，操作頁只查詢及寫入目前 `SEMESTER.id`。它**沒有自動完成既有 v1 正式站的跨學期 migration**。

既有 v1 正式站若要更新學期，必須透過 Homeworkclass Skill 的受控 migration／legacy adapter：先匯出與讀回、核對筆數及雜湊，再由受信任後端回填 `semesterId/periodId`，驗證舊學期唯讀與新學期可寫後，才可另行授權 Rules、Indexes、Functions 或資料遷移。不得由瀏覽器覆寫或刪除正式歷程。

詳見 [TEMPLATE-NOTES.md](TEMPLATE-NOTES.md)。
