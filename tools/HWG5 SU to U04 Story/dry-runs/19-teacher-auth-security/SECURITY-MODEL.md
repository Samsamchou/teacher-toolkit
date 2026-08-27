# 教師登入與資料權限模型（本機原型）

日期：2026-08-27

## 實際資料與查詢

- Firestore edition：Standard、Native mode、`(default)`、`asia-east1`。
- 唯一集合：`reading_records`。
- 學生建立欄位：`ownerUid / studentId / theme / unit / date / sentenceId / targetText / transcript / score / feedback / audioUrl / audioPath / expiresAt / timestamp`。
- 學生讀取：只查自己的 `ownerUid`，並再依 `studentId / date / theme / unit` 篩選。
- 教師讀取：依日期或學號＋日期查詢全班資料。
- 更新：應用程式沒有更新需求，規則一律拒絕。
- 刪除：只有已驗證的指定教師 Google 帳戶可刪除 Firestore 紀錄；Storage 音檔仍由生命週期規則自動清理，或由教師權限明確刪除。

## 驗證與授權

- 學生：Firebase Anonymous Authentication；網站不要求學生輸入個人 Google 帳戶。
- 教師：Firebase Google Authentication；前端提示與 Security Rules 都要求已驗證的指定教師帳戶。
- 權限來源是 Firebase ID token，不採用前端自填角色或 Firestore 文件中的角色欄位。
- 舊紀錄沒有 `ownerUid`，不搬移、不回寫；因此部署新規則後只允許教師讀取，不會暴露給新的匿名工作階段。

## App Check

- Web App 已註冊 reCAPTCHA Enterprise。
- Firebase AI Logic 基準保護已強制執行；重播保護未強制。
- 2026-08-27 讀回時，Firestore 與 Storage 尚在監控模式。
- 本機原型已在預設 Firebase App 初始化 App Check，正式部署並驗證學生寫入後，才可分別切換 Firestore／Storage 強制執行，避免中斷現有正式站。

## 攻擊面與預期結果

- 未登入讀寫、跨 UID 讀取、偽造教師 email、未驗證教師 email：拒絕。
- 額外欄位、錯誤型別、過長字串、分數超界、跨 UID 音檔路徑、非近期 server timestamp：拒絕。
- 學生更新或刪除紀錄、覆寫音檔、讀取其他學生音檔：拒絕。
- 教師全班查詢及明確刪除：允許。

這份文件是部署前的安全模型與原型假設，仍須搭配 emulator 規則測試、Firebase Console 讀回及正式站教師登入驗收。
