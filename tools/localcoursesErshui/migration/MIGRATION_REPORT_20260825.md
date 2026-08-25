# 2026-08-25 二水在地課程遷移驗證報告

## 已確認範圍

- RDQ：`1A 2A 3A 4A`，五項建議全部採納。
- 舊來源：`C:\firebase-deploy\在地課程`
- 新唯一主目錄：`G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui`
- GitHub 目標：`Samsamchou/teacher-toolkit` 的 `tools/localcoursesErshui/`
- C 槽原專案保留，不刪除、不再作為日常工作位置。

## 乾淨遷移原則

保留課程來源、Word 教案、教材圖片與影片、提示詞、來源清冊、程式碼、測試、Firebase 設定、dependency lock files、QA、RDQ、交接文件及結構化工作歷程。

排除可重建或不應進版控的內容，包括內層 `.git`、`node_modules`、快取、建置輸出、測試 JRE、暫存、日誌、秘密及憑證。網站的 `firebase-app/.env.production.local` 含本機 App Check 設定，已明確排除；報告不記錄其值。

## 複製與驗證結果

- 乾淨複製腳本：`migration/copy_clean_project.ps1`
- SHA-256 清冊：`migration/MIGRATION_MANIFEST_20260825.csv`
- 初次逐檔複製結果：270 個正式 payload 檔、171,026,073 bytes。
- 初次來源／目的地 SHA-256 不一致：0。
- 初次目的地額外檔案：0。
- 本報告建立後亦加入最終清冊；最終檔數、總大小與清冊雜湊以清冊讀回及 Git 提交前稽核為準。

## 程式與網站驗證

- 4 支改為專案相對路徑的正式 Python 腳本及 3 支 legacy 產製腳本均通過 `py_compile`。
- 網站現行本地工作樹正式建置成功。
- `npm.cmd run firebase:test`：13/13 通過。
- 第 13 項只驗證〈閱覽鐵道風華〉Read and drag 基本雙圈圖結構；完整規格差距已寫入 `PROJECT_HANDOFF.md`。

## 同步證據邊界

逐檔雜湊與 G 槽讀回可證明指定掛載資料夾內的檔案一致。Google Drive 桌面程式是否已完成遠端上傳，仍須以其同步狀態為準；在未看到該狀態前，不把本機 G 槽存在誤報為雲端上傳已完成。
