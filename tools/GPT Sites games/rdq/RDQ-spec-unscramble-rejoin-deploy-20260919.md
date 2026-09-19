# RDQ｜Unscramble 重新加入與 15 組正式部署

- 日期：2026-09-19
- 狀態：completed
- 專案：GPT Sites games
- Firebase 專案／Hosting site：`gamesinclass-5d9d1`
- 版本：`2026.09.19-unscramble-rejoin.3`

## 需求

將已完成本機驗證的 Unscramble 2–15 組、教師解除登入與安全重新加入功能部署至正式 Firebase。

## 部署範圍

- Firebase Hosting
- Functions codebase `classroom-games` 的 `liveActivity`

## 明確排除

- 不部署 `teacherLogin`
- 不變更 Firestore／Storage 規則
- 不建立、修改或刪除正式題組、場次與作答資料
- 不 commit、不 push
- 不再發送 C2C 訊息

## 驗收

- 正式 `release.json` 回報 `2026.09.19-unscramble-rejoin.3`
- 正式靜態檔案與部署建置的 SHA-256 相符
- `/api/live-activity` 可連線，未授權教師操作仍被拒絕
- 正式頁面無載入錯誤，基本桌機與手機版面無水平溢出
- 保存部署命令、退出碼與去識別化驗證證據

## 風險控制

- 只使用精確 deployment selector，避免重部署其他函式
- 正式驗證只做讀取與未授權防線測試，不寫入班級資料
- 若登入失效或 Firebase 權限不足，由使用者親自完成登入

## 完成結果

- Hosting 與 `classroom-games:liveActivity` 部署成功。
- 最終 Hosting 文案修正版單獨補部署，未重部署其他函式。
- 4 個本次 release 檔案 SHA-256 全數一致；正式版本、API 防線與三種瀏覽器尺寸 smoke test 通過。
- 證據位於 `qa/unscramble-rejoin-production-20260919/`。
