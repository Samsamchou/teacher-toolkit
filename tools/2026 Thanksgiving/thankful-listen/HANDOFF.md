# thankful-listen 交接（2026-11-09）

感恩例句聆聽網頁＋感恩節卡片。規格卡：`../rdq/RDQ-spec-thankful-listen-card-20261109.md`（confirmed）。

## 網頁 `index.html`
- 35 句（7 個對象 × 5 句），一個對象一頁。播放器沿用 thankful-35 的動畫引擎、Ana 配音和卡拉 OK 字幕。`engine.js`、`data.js`、`scenes_*.js`、`audio/`、`sfx/`、`fonts/` 都是從 `../thankful-35/` 複製過來的；那邊改了，要再複製一次。
- 規則：
  - 每句要播到結尾才算聽過（✓）。
  - 一頁 5 句都聽過，才能翻下一頁；前面的頁面隨時可以回去。
  - 7 頁都聽過，頁碼全部解鎖，出現「去寫卡片 ✏️」。
- 功能：
  - 「🐢 慢速」用 `playbackRate 0.7`（不另做音檔），動畫時間也跟著乘 0.7，保持同步。
  - ★ 標記句子，卡片頁會列出標記的句子，並附 6 句文化句和 6 句結尾句。
  - 每句旁邊的小插圖是即時從動畫中段截一格（`thumbOf`）。
- 進度只存在裝置的 localStorage（`thankful-listen-v1`），不收學生資料。右上角淡色「重新開始」可以清除。
- 本機測試：在本資料夾執行 `python -m http.server 8741`，再開 http://localhost:8741/index.html。

## 卡片 `card/`
- `python card/make_print.py`（只在示範插圖需要更新時，才要開著上面的 server 重匯 `ex_*.png`）會輸出：
  - `card_A4.pdf`：學生卡，橫式 A4，彩色，B 版 Pippy 設計。
  - `example_A3.pdf`：A3 示範卡（Ian：my mom／my friends＋兩張動畫插圖）。
  - `wordbank_A4.pdf`：詞語庫參考單，直式 A4。
- 樣稿：`variant_A/B/C.png`（老師選 B）。`border_coloring.png` 是 A 版的 Codex 著色邊框，備用。

## 待辦
- 上線方式等老師決定。音檔、圖片在 `.gitignore` 裡，放 GitHub Pages 要另外開例外。
