# English Lesson Hub V03 — Project Baseline / 專案基線

- 我是國小英語老師 / I am an elementary English teacher.
- 所有檔案用繁體中文以及英文 / All project files use Traditional Chinese and English.
- 教學對象是國小 3–6 年級學生 / The teaching audience is Grade 3–6 elementary students.

## Project goal / 專案目標

- 建立一站式英語教學駕駛艙（Teacher-configurable Lesson Cockpit），讓教師能在不修改程式碼的情況下編排 Lesson、管理教材、以 Previous / Next 授課，並使用原生 Vocabulary Quiz 與結果紀錄。
- Build a teacher-configurable English Lesson Cockpit where teachers can arrange lessons, manage teaching materials, teach with Previous / Next, and use the native Vocabulary Quiz and results records without changing source code.

## Phase 1 baseline / 第一階段基線

- 先完成使用 mock data 的可操作 V03 Preview，優先驗證 Lesson Studio、Lesson Cockpit、Teacher / Student Mode、教材 placeholder、Native Vocabulary Quiz、Celebration、Reward Slot Machine、Mock Results 與 Desktop / iPad responsive UX。
- Start with an operable V03 Preview using mock data. Prioritize validating Lesson Studio, Lesson Cockpit, Teacher / Student Mode, material placeholders, the native Vocabulary Quiz, celebration feedback, the Reward Slot Machine, mock results, and responsive Desktop / iPad UX.

## Source and acceptance baseline / 來源與驗收基線

- `Lesson_Hub_V03.docx` 與 `Lesson_Hub_V03.md` 是本專案目前的需求來源；兩份內容若有差異，需在變更前明確標示並確認。
- The current requirements sources are `Lesson_Hub_V03.docx` and `Lesson_Hub_V03.md`; any difference between them must be identified and confirmed before changing scope.
- 核心驗收：8 張預設 Lesson Cards、可動態新增／刪除／排序 Step、Start Lesson 後以 Previous / Next 推進、教材可由資料層更換、Practice Score 與 Slot Reward 分離、Reward Session 完成闖關後才正式保存。
- Core acceptance: eight default Lesson Cards; dynamic Step add / delete / reorder; Start Lesson followed by Previous / Next navigation; materials replaceable through the data layer; Practice Score separate from Slot Reward; and formal saving only after a Reward Session is completed.

## Safety baseline / 安全基線

- 保留既有教學來源與最終產物；初始化不刪除、不重設、不提交、不推送、不部署。
- Preserve teaching sources and final artifacts; initialization does not delete, reset, commit, push, or deploy.
