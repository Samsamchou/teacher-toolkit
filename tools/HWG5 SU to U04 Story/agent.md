# 專案基線 / Project Baseline

- 我是國小英語老師。/ I am an elementary English teacher.
- 所有專案檔案使用繁體中文以及英文。/ All project files use Traditional Chinese and English.
- 教學對象是國小 3–6 年級學生。/ The teaching audience is Grade 3–6 elementary students.
- 專案名稱：HWG5 SU to U04 Story。/ Project name: HWG5 SU to U04 Story.
- 專案目標：提供 HWG5 SU–U04 英語故事朗讀、AI 發音評分及教師紀錄。/ Goal: Provide HWG5 SU–U04 story reading, AI pronunciation scoring, and teacher records.
- 正式 Firebase 專案固定為 `hwg5-su-to-u04-story`；部署前必須先通過本機與瀏覽器驗證。/ The production Firebase project is `hwg5-su-to-u04-story`; local and browser verification are required before deployment.
- 學生錄音與相連紀錄保存 7 個月；不得把 API 金鑰、App Check debug token 或教師憑證寫入前端或 Git。/ Student audio and linked records are retained for seven months; never store API keys, App Check debug tokens, or teacher credentials in frontend code or Git.
- 備份時只處理 `tools/HWG5 SU to U04 Story`，不得混入 `teacher-toolkit` 其他工作。/ During backup, only handle `tools/HWG5 SU to U04 Story`; do not mix in unrelated `teacher-toolkit` work.

