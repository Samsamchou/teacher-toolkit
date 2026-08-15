# teacher-toolkit

二水國小 3–6 年級英語教學工具總專案 / A toolkit for Grade 3–6 elementary English teaching.

## 目前內容 / Current contents

- `tools/coordinate-hunter/`：座標獵人純前端練習遊戲。
- `tools/sf3-4-voc/`：SF3–SF4 單字練習網站完整備份。
- `tools/allstorybooks/`：電子語音繪本館完整備份，收錄 `Friends meet`
  與 `School day`，每頁需完整聽兩次才會解鎖下一頁。
- `CLAUDE.md`：專案藍圖、資料位置與安全規則。
- `agent.md`：Codex 專案基線。

## 線上預覽 / Live site

- 專案首頁 / Project home：[samsamchou.github.io/teacher-toolkit](https://samsamchou.github.io/teacher-toolkit/)
- 座標獵人 / Coordinate Hunter：[開啟遊戲](https://samsamchou.github.io/teacher-toolkit/tools/coordinate-hunter/index.html)
- 電子語音繪本館 / Storybook Library：[開啟繪本館](https://ershui-storybooks.web.app/)

## 電子語音繪本館 / Storybook Library

備份位於 `tools/allstorybooks/`。完整架構、資產重建、Firebase 部署與驗證
流程請讀取 `tools/allstorybooks/HANDOFF.md`。

## 執行座標獵人 / Run Coordinate Hunter

直接開啟 `tools/coordinate-hunter/index.html`，或在專案根目錄啟動任何靜態檔案伺服器後預覽。

## 安全與同步 / Safety and sync

學生資料只使用座號與班級代號；不要提交 API key、token、cookies 或本機 agent 設定。Obsidian 工作筆記位於 `G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md`。
