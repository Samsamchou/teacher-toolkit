# Project Baseline / 專案基線

- 我是國小英語老師 / I am an elementary English teacher.
- 所有檔案用繁體中文以及英文 / All project files use Traditional Chinese and English.
- 教學對象是國小 3–6 年級學生 / The teaching audience is Grade 3–6 elementary students.
- 專案名稱為「英語作業與課堂紀錄」 / Project name: English Homework and Classroom Records.
- 專案根目錄為 `G:\我的雲端硬碟\teacher-toolkit\tools\Homeworkclass` / Project root is this Homeworkclass folder.
- 正式需求以 `rdq/RDQ-spec-homeworkclass-20260829.md` 的 `confirmed` 版本為準 / The confirmed RDQ specification is authoritative.
- 課表完整包含英語、在地、國際歌謠 20 節 / The timetable includes all 20 English, local-curriculum, and international-song lessons.
- 學生資料只使用班級與座號，不保存姓名、正式學號、家長或輔導資料 / Student data is limited to class and seat number.
- 通行碼、金鑰、token、cookies、Firebase secrets 與登入狀態不得寫入原始碼或 Git / Never commit credentials or session data.
- Firebase 正式 Rules、Blaze、Secrets、App Check 與部署都需要教師另行明確授權 / Production Firebase changes require separate teacher authorization.
- 先用假資料、Emulator 與本機展示模式驗證，不把真實紀錄送到未驗證環境 / Validate locally before using real records.
- 完成檔案後讀回，執行型別檢查、測試、建置、響應式與安全驗證，保存 QA 證據 / Read back and verify every deliverable.
- 本資料夾位於共用父層 Git 儲存庫；只處理 `tools/Homeworkclass`，不得包入其他專案變更 / Scope Git operations to this folder only.

