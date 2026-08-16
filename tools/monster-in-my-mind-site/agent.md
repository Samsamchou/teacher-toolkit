# Monster in My Mind v1.0

## Project baseline / 專案基線

- 我是國小英語老師 / I am an elementary English teacher.
- 所有檔案用繁體中文以及英文 / All project files use Traditional Chinese and English.
- 教學對象是國小 3–6 年級學生 / The teaching audience is Grade 3–6 elementary students.
- 本專案的主要使用者是臺灣國小五、六年級學生 / This project specifically serves Taiwanese Grade 5–6 students.

## Project identity / 專案識別

- 專案名稱 / Project name: Monster in My Mind v1.0
- 專案根目錄 / Project root: `C:\Users\User\.codex\.chatgpt-projects\g-p-69f1440eadb48191b002ad8440341283\site-staging`
- GDrive 原始碼鏡像 / GDrive source mirror: `G:\我的雲端硬碟\teacher-toolkit\tools\monster-in-my-mind-site`
- 私人正式網站 / Private production site: `https://monster-in-my-mind.samchou.chatgpt.site`

## Project goal / 專案目標

建立一個兼顧隱私、響應式設計與無障礙操作的 English × SEL × Art × AI 教學網站。學生透過四步驟完成 SEL 英語句子、設計 Monster、選擇畫風與場景，最後取得固定 16:9 的英文圖像提示詞。

Build a privacy-conscious, responsive English × SEL × Art × AI classroom site. Students complete a supported SEL sentence, design a monster, choose an art style and background, and receive a fixed 16:9 English image prompt through a four-step flow.

## Content, privacy, and safety / 內容、隱私與安全

- 保持 `sources/` 為唯讀參考資料 / Keep `sources/` read-only.
- 所有情緒、句型、Monster、畫風、背景與繁體中文翻譯集中在型別化本地資料中維護。
- Keep emotion, phrase, monster, style, background, and Traditional Chinese content in typed local data.
- 不要求學生姓名、不評分或排行煩惱、不公開作品，也不儲存學生個資。
- Do not request student names, score or rank worries, publish work, or store personal data.
- 第一版不串接付費圖像 API、不要求 API key，也不加入登入或資料庫。
- Version 1 does not use a paid image API, API key, login, or database.
- 不得將密碼、token、API key、Firebase 私密金鑰或其他秘密寫入原始碼、Git、GDrive 或文件。
- Never place passwords, tokens, API keys, Firebase secrets, or other credentials in source code, Git, GDrive, or documentation.

## Acceptance rules / 驗收標準

- 四步驟流程、Back／Next、Step 1 驗證、即時句子預覽、固定翻譯、Prompt 產生、複製、重設與列印功能可用。
- The four-step flow, Back/Next navigation, Step 1 validation, live sentence preview, fixed translation, prompt generation, copy, reset, and print features must work.
- 介面適用 Windows、Chromebook 與 iPad Safari，操作不可只依賴 hover。
- The interface must work on Windows, Chromebook, and iPad Safari without hover-only interaction.
- 保持大型、鍵盤可操作、觸控友善且具合理對比的控制項。
- Keep controls large, keyboard-accessible, touch-friendly, and reasonably contrasted.
- 每次交付前執行 `npm run lint`、`npm run build` 與 `npm test`，修正錯誤後才可回報完成。
- Before handoff, run `npm run lint`, `npm run build`, and `npm test`; fix failures before claiming completion.
- 建置可在本機專案根目錄進行；同步到 GDrive 時排除 `node_modules`、`dist`、快取與秘密資料，並讀回核對關鍵原始碼。
- Builds may run from the local project root; GDrive sync must exclude `node_modules`, `dist`, caches, and secrets, then read back key source files for verification.

## Initialization and publishing / 初始化與發佈

- 初始化只建立安全基線，不自行 commit、push、pull、修改 remote 或部署。
- Initialization establishes a safe baseline only; it does not commit, push, pull, change remotes, or deploy.
- GitHub、Firebase、Obsidian 或公開網站的外部變更，依使用者當次明確授權執行。
- External GitHub, Firebase, Obsidian, or public-site changes require the user's current explicit authorization.
