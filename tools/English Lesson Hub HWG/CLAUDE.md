# English Lesson Hub V03 (HWG) — Claude 專案指引

本檔由 Codex 專案基線 `agent.md` 與各 HANDOFF／CLOSEOUT 整理而來，供 Claude 接續使用。`agent.md` 仍是 Codex 的原始基線，兩者衝突時先向使用者確認。上層 `../../CLAUDE.md`（teacher-toolkit）的規則同樣適用。

## 基本設定

- 使用者是國小英語老師，教學對象國小 3–6 年級；所有檔案用繁體中文與英文。
- 目標：教師可免改程式碼編排 Lesson、管理教材、用 Previous / Next 授課，並使用原生 Vocabulary Quiz 與結果紀錄。
- 需求來源：`Lesson_Hub_V03.docx`、`Lesson_Hub_V03.md`；兩者有差異時，變更前先標示並確認。
- 核心驗收：8 張預設 Lesson Cards；Step 可動態新增／刪除／排序；Start Lesson 後以 Previous / Next 推進；教材可由資料層更換；Practice Score 與 Slot Reward 分離；Reward Session 完成後才正式保存。
- 安全基線：保留教學來源與最終產物；沒有明確授權不刪除、不重設、不 commit／push、不部署、不寫正式學生資料。學生資料一律去識別化。不提交 `.env`、金鑰、token。

## 對話開始時請先讀

1. 本檔與 `agent.md`
2. `rdq/CLOSEOUT-godot-six-heroes-20261016.md`（最新收工狀態與下次接續）
3. `preview/HANDOFF.md`（最新狀態在最上方，下方是歷史紀錄；「未部署」敘述多為歷史）
4. 最上層的 `HANDOFF-*.md`（godot-six-heroes、godot-heroes-trial、phonics、six-level，皆 2026-10-15/16）
5. Obsidian 筆記 `G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md`

## 目錄地圖

| 路徑 | 內容 |
|---|---|
| `preview/` | 網站主程式（Vite + React，`src/live/`）、Firebase Functions（`functions/`，liveV2）、規則、測試、`HANDOFF.md` |
| `godot/` | 真正 Godot 遊戲：`forest-of-words-six-heroes-20261016`（現行完整六關）及較早的試玩／舊版 |
| `question-bank/` | 題庫 JSON、審查紀錄與驗證腳本（Python） |
| `rdq/` | RDQ 需求規格（`RDQ-spec-*`）、`CLOSEOUT-*`、`DEPLOYMENT-*` |
| `qa/` | 各輪驗證證據與腳本 |
| `skills/` | Codex 專案 skill 原件（`godot-games`） |
| `research/`、`prototypes/`、`generated-*`、`HWG5/HWG7` 圖卡資料夾 | 研究、原型、AI 生成與單字圖卡來源，視為教學來源，不刪改 |

## 目前狀態（截至 2026-10-27 部署）

- 2026-10-27 晚：右鍵刪除單一學生紀錄＋AI 口說 85 分過關已上線（liveV2 `livev2-00022-qix`、liveAudioV2 `liveaudiov2-00006-hic`），見 `rdq/DEPLOYMENT-student-reset-audio-pass-20261027.md`。
- 2026-10-27：AI 錄音題修復已上線（liveV2 `livev2-00021-hut`、liveAudioV2 `liveaudiov2-00005-yel`，模型 `gemini-3.5-flash`）。部署時 Functions 環境變數必須包含 `LIVE_AI_MODEL`，見 `rdq/DEPLOYMENT-ai-audio-fix-20261027.md`。

- 正式入口：https://lesson-hub-v03.web.app/lab ；Firebase 專案 `hwg7teaching`，Hosting `lesson-hub-v03` 版本 `066eeb180f4a7d72`，Function `liveV2` 為 `livev2-00020-wuk`（2026-10-17 課程配色＋已結束分配刪除，見 `rdq/DEPLOYMENT-course-color-20261017.md`、`rdq/DEPLOYMENT-assignment-delete-20261017.md`）。
- 部署用 `firebase deploy --account u9431818@gmail.com`（預設登入帳號缺 ActAs 權限）；流程與讀回腳本見 `qa/assignment-delete-production-20261017/`（`cloud.cjs before|deploy|hosting|after`、`http.cjs`、`srcdiff.py`，以 `LH_RELEASE`／`LH_EVIDENCE` 指定 Temp 目錄）。
- 已上線：三英雄與技能、完整六關、Boss、教師明細／CSV、觸控修補。新分配使用 `gameVersion2`，舊分配維持相容。
- 待辦：教師以正式站建立新分配並用實體 iPad／Safari 驗收；GitHub 新版同步需先列清單確認範圍，本輪未 commit／push。
- 工作區 Git 有大量未提交變更（含其他專案）；不要擅自 stage 全部，commit 前先與使用者確認範圍。

## 常用指令（接續前先實際核對 `package.json`）

- 網站：`preview/` 內 `npm test`、`npm run validate`、`npm run build`；Functions 在 `preview/functions/`。
- 題庫：`question-bank/validate_question_bank*.py`。
- Godot：先找本機 Godot 並取 `--version`（案例使用 4.7.2）；細節見 godot-games skill 的 validation 參考。
- 不確定的指令先讀 `package.json`／scripts，不要照抄歷史文件中的路徑與數字當成現況。

## Skill

- Codex 專案 skill `godot-games` 已複製為 Claude 個人 skill：`C:\Users\User\.claude\skills\godot-games\`（SKILL.md＋references、assets、scripts；略去 Codex 專用的 `agents/openai.yaml`）。專案內原件 `skills/godot-games/` 保持不動。
- 其餘 Codex skill（english-exam、ershui-local-curriculum-builder、rdq、shutdown、startup、soil-* 系列）早已存在於 `~/.claude/skills`，不需重複複製。
- 其他 Codex 個人 skill（`~/.codex/skills/` 下 `gem-*` 等）與本專案無直接關係，未複製。
- 該 skill 中提到的 `$godot-games`、AGENTS 為 Codex 寫法；在 Claude 中以 Skill 工具呼叫 `godot-games`，規則改讀本檔與 `agent.md`。

## 工作原則

- 修改前先讀實際檔案與 Git 狀態；區分「測試／模擬器通過」與「教師真機驗收」，不冒稱未做的驗證。
- 正式部署、付費生成、資料庫寫入、GitHub 推送各自需要使用者明確授權，且不從先前的授權推導。
- 題目、答案與成績權威留在受保護的服務端；金鑰不進 repo。
- 完成後讀回檔案確認，並更新對應的 HANDOFF／CLOSEOUT。
