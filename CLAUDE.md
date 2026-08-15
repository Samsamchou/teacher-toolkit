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
- 🔥 Firebase 專案：尚未在本次初始化中確認；不得把金鑰寫入此 repo。

## 工具清單

- `tools/coordinate-hunter/`：座標獵人，11×11 整數格點、10 個隱藏座標、60 秒計時、得分與重新開始。

## 工作注意事項

- 學生資料一律去識別化（只用座號與班級代號）。
- 不提交 `.env`、金鑰、token、cookies、登入狀態或本機 agent 設定。
- commit 訊息要寫清楚做了什麼與為什麼。
- 發布公開 repo、啟用 Pages、部署或產生付費資源前，先確認實際結果與範圍。
- 完成檔案後讀回檢查路徑、內容與測試結果。
