# teacher-toolkit — 我的班級工具總專案

## 對話開始時請先讀

- 專案藍圖：`CLAUDE.md`
- Obsidian 工作筆記：`G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md`
- Codex 專案基線：`agent.md`

## 工作模式

- **加新工具**：對 Codex 說「我想做一個 XXX 工具」→ 建立 `tools/<工具名>/` 子資料夾，保留來源與驗證紀錄。
- **開工接續**：說「開工」或「讀工作筆記、告訴我上次做到哪」→ 使用 Codex 內建 `startup` skill，讀取工作筆記並檢查 Git；不主動 pull。
- **結束工作**：說「收工」→ 使用 Codex 內建 `shutdown` skill，盤點變更、更新工作筆記，再依確認過的範圍 commit + push。
- Codex 已有原生 `startup`／`shutdown` skill，不在本專案放入 Claude Code 的 `.claude-skills` 或本機設定。

## 工作桌與三個家

- 📋 GDrive 工作桌：`G:\我的雲端硬碟\teacher-toolkit\`
- 🐙 GitHub repo：[Samsamchou/teacher-toolkit](https://github.com/Samsamchou/teacher-toolkit)
- 🌐 GitHub Pages：[https://samsamchou.github.io/teacher-toolkit/](https://samsamchou.github.io/teacher-toolkit/)
- 📘 Obsidian 駕駛艙：`G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md`
- 🔥 電子語音繪本館：Firebase 專案 `g4-remedial-all-vocab-app` 的獨立
  Hosting site `ershui-storybooks`；不得把金鑰寫入此 repo。

## 工具清單

- `tools/coordinate-hunter/`：座標獵人，11×11 整數格點、10 個隱藏座標、60 秒計時、得分與重新開始。
- `tools/sf3-4-voc/`：SF3–SF4 單字練習網站完整乾淨備份。
- `tools/allstorybooks/`：電子語音繪本館完整備份；含兩本四年級學扶繪本、
  來源 PDF／音訊、資產重建腳本、Firebase 設定與 `HANDOFF.md`。
- `tools/letterslistenandwrite/`：AI 英文字母聽寫（Firebase `g5-remedial-action-verbs`，
  https://g5-remedial-action-verbs.web.app）。v3 手寫辨識＝程式判四線格＋AI 認字；題組出題＋華麗拉霸。
  先讀該資料夾 `HANDOFF.md`；部署用 `--account u9431818@gmail.com`，在 C 槽暫存副本 npm ci 後建置。
- `tools/monster-in-my-mind-site/`：Monster in My Mind 正式 ChatGPT Sites 原始碼；
  國小五、六年級 English × SEL × Art × AI 四步驟網站，私人網址為
  `https://monster-in-my-mind.samchou.chatgpt.site`。
- `tools/monster-in-my-mind-legacy-vite/`：改寫為 ChatGPT Sites 前的 React／Vite
  歷史原型，只供比較與復原，不從此資料夾部署或繼續開發。
- `tools/2026 REA Games/`：REA（Reverse Engineer Anything）研究＋ Ken's Jump Island。
  `godot-jump-island/` 是 Mario 64 式手感、造型全原創的 13 關 3D 平台遊戲（HWG5 51 題，一星一題，
  12、13 關魔王），網站在 hwg5-clock-tower 的 `jump3d/`＋任務 `ershui-3d-quest-jump/`（共用學號登入外框）。
  先讀 `工作流程與踩坑紀錄.md`、`godot-jump-island/HANDOFF.md`；第三方 YouTube 影片與逐字稿不入庫。
  `3D planet/` 是仿「基隆小行星」的二水小行星逛街版（Godot＋OSM 真實街道＋22 棟 Tripo 復刻建築、6 種句型模式），
  先讀 `3D planet/HANDOFF.md` 與 `3D planet/工作流程與踩坑紀錄.md`；正式站 hwg5-clock-tower.web.app/ershui-planet/（10/25 上線，含個人模式＋教師後台）。
- `tools/2026 AI VIDEOS SENSE BAR/`：照「山獅霸」工作流（shanshiba-workflow 兩個 repo）在 Google Colab G4
  做 AI 短片；上游 repo clone 在裡面但不入庫，各片設定存 `films/<片名>/`。先讀 `HANDOFF.md`；
  範本片〈被狗吃掉的作業〉2026-10-23 驗收。影片與圖片音檔不入庫。
- `tools/RPG games/`：時鐘塔答題大作戰（回合制 RPG 答題，真 4×4 精靈幀、每份 100 分取最高分、Firestore `rpgAttempts`＋老師後台），
  Firebase site `rpg-quiz-battle`（專案 g6-english-online-learning）。先讀該資料夾 `HANDOFF.md` 與 skill `rpg-quiz-battle`；
  Firestore 規則只從 `escape room HWG5-U01-U02/site` 部署。
- `tools/vocabulary web/`：5 年級 HWG5／6（https://hwg6u01voc.web.app）與 6 年級 HWG7／8
  （https://hwg8u01voc.web.app）單字練習網站，2026-10-30 從 C 槽搬來，**之後只在這裡更新**。
  整個資料夾不入庫（.gitignore）；部署用 `stage-for-deploy.ps1` 到 C 槽暫存再 deploy，`--account u9431818@gmail.com`。
  先讀該資料夾 `CLAUDE.md`、`HANDOFF.md`。

## 工作注意事項

- 學生資料一律去識別化（只用座號與班級代號）。
- 不提交 `.env`、金鑰、token、cookies、登入狀態或本機 agent 設定。
- commit 訊息要寫清楚做了什麼與為什麼。
- 發布公開 repo、啟用 Pages、部署或產生付費資源前，先確認實際結果與範圍。
- 完成檔案後讀回檢查路徑、內容與測試結果。
