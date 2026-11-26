---
rdq_version: 1
edition: chatgpt-app
task: 三個教師後台右鍵／長按學號刪除學生進度
domain: dev
date: 2026-11-26
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：教師後台刪除學生紀錄

## 一句話任務
World Routines I 版、he/she 版、Safari Count 三個教師後台，在學號上按右鍵或長按，可刪除該生在這個版本的進度與分數。

## 已確認
- 範圍：`/world-routines/teacher`、`/world-routines-he-she/teacher`、`/safari-count/teacher`。
- 刪除內容（1B）：只刪**進度與分數**（過關、蓋章、拍照星數、分鐘、提示數）；**口說錄音保留**，照原本 7 個月後自動刪。
- 防誤刪（2A）：跳出確認視窗，要輸入那位學生的學號才會刪。
- 部署（3A）：本機用假資料實際刪一次，截圖給老師看，老師說可以才部署。
- 老師的提問已回答：三版都存口說錄音（每題最多 2 個、7 個月）；都能接續（Safari 到題內步驟，World Routines 以站為單位）。

## 已採納建議
- ① iPad 長按學號（約 0.6 秒）也能叫出刪除。
- ② 留刪除紀錄：日期時間、版本、班級、學號、刪掉的進度摘要（完成幾站／幾題）；教師後台看得到。不存錄音。
- ③ 刪除前自動下載這位學生的 CSV（和現有「下載 CSV」同欄位，只有這一列）。
- ④ 上線後由老師親手用新功能刪測試學號 **50199**（Safari，501 班）。

## 待確認假設
- 只刪「這個版本」：同一個學號在其他版本的紀錄不受影響。
- 刪除後該生從表格消失；錄音雖然保留，但要等該生重新開始、表格再出現這一列，才點得到舊錄音。該生重新練習時，新錄音會覆蓋同一題的舊錄音。
- 每日 30 次口說評分次數（三版共用）不因刪除歸零。
- 刪除只在老師登入（六碼通行碼）後可用；函式端再檢查一次登入。

## 本次不納入
- 刪除錄音（1B 未選）、整班一次刪除、復原已刪除的紀錄。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\monster-in-my-mind-site** 的三個教師後台（**app/routines/RoutinesTeacher.tsx** 的 I 版與 hs 版、**app/safari/SafariTeacher.tsx**）表格學號欄加右鍵（contextmenu）與 iPad 長按 0.6 秒選單「刪除這位學生的紀錄」；確認視窗要求輸入相同學號才可按刪除；刪除前先下載該生一列 CSV；呼叫新的教師動作（**functions/routines.mjs** 的 `routineDelete`、**functions/safari.mjs** 的 `safariDelete`，經 `monsterPortal` 六碼通行碼驗證），只刪該版本的進度文件（`routines_progress`／`routines_hs_progress`／`safari_progress` 中該學號的文件），保留 records 與 Storage 錄音，並寫一筆刪除紀錄（日期時間、版本、班級、學號、完成摘要，7 個月到期）；教師後台顯示該版本的刪除紀錄。加函式測試，在 C 槽暫存副本建置，用本機預覽假資料刪一次並截圖給老師；老師同意後先比對線上函式與 hosting，再部署 `monsterPortal` 與 hosting（`--account u9431818@gmail.com`），讀回正式站；最後只 commit 本次改動檔案並 push。

## 驗收條件
- [ ] 三個後台在學號上右鍵、iPad 長按都會出現刪除；輸入錯誤學號時刪除鍵不能按。
- [ ] 刪除後該生從該版本表格消失、其他版本不受影響；該生再登入從頭開始。
- [ ] 刪除前下載了該生 CSV；後台看得到刪除紀錄。
- [ ] 函式測試、tsc、lint 通過；部署後老師親手刪 50199 成功。
