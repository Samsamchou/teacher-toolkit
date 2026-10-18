# Ken and the Frozen Clock Tower｜網站 v1

> `public/index.html` 是任務首頁「英語情境任務來闖關｜English Mission Quest」；本任務在 `public/hwg5-u01-u02/`。下表的 `public/…` 檔案都在這個子資料夾裡。

HWG5 U01+U02 情境任務網站。內容：9 段故事旁白（需聽完才能繼續）、32 題（拼字 11、拖放 21）、11 場戰鬥（目前是佔位畫面），最後是結果頁。

## 執行與驗證

在 `site/` 資料夾：

```bash
npm run build   # 從 masters 重建 WebP、複製 MP3／字型、由題庫 JSON 產生 public/data.js（需 ffmpeg）
npm test        # 12 項：題庫對照、素材存在、星期條規則、流程、計分、存檔、無中文、重複前進回歸
npm run check   # 語法檢查
npm run serve   # http://127.0.0.1:4190/（首頁）→ /hwg5-u01-u02/（本任務）
```

改題庫或旁白時：
1. 先改 `content/build_content.py`，再執行 `python -I build_content.py`（會重跑全部內容檢查）。
2. 再執行 `npm run build`。
3. 旁白文字有改時，用 `node content/generate_narration_tts.mjs --execute --force` 重做語音。這會呼叫付費 API，要先取得教師授權。

## 檔案

| 檔案 | 用途 |
|---|---|
| `public/rules.js` | 純規則：流程順序、字卡（seeded shuffle，續玩順序不變）、評分、品質 4／3／2／1、提示階梯、時鐘角度 |
| `public/storage.js` | localStorage 自動存檔；每個學號一筆進行中紀錄，完成後移到歷史（保留 10 筆） |
| `public/app.js` | 介面：首頁、故事、拖放、拼字、戰鬥佔位、結果 |
| `public/data.js` | 由 `scripts/build-assets.mjs` 產生，不要手改 |
| `scripts/build-assets.mjs` | 用 ffmpeg 從 PNG masters 轉 WebP、裁切圖集四格；masters 不會被修改 |

## 已實作的規則

- **故事頁**：▶ Listen 播放 0.8 倍速 marin 語音，播放到結束才解鎖 Next。
  - 已聽過的段落不再要求重聽。
  - 音檔連續失敗 2 次才解鎖，並記錄為 `fallback`。
- **拖放題**：
  - 可以先點字卡再點空格，也可以直接拖曳。
  - 點已填的空格可以清除。
  - 答錯時保留已放的卡，方便直接修正。
- **拼字題**：
  - 點字母會依序填入空格，依單字分組（social studies 是 6＋7）。
  - 大小寫要正確，可以無限重試。
- **提示**：
  - 第 1 次答錯顯示 hint 1，第 2 次以後顯示 hint 2。
  - 答對後顯示解析。
  - 每題記錄 attempts、firstTryCorrect、hintUsed、quality。
- **星期條**：
  - 順序是 Sun.–Sat.。
  - 拼星期題亮起的那一格顯示中文，Q01 不顯示星期條。
- **Q01 時鐘**：SVG 在空白鐘面上畫 9:50；短粗深色是時針，長細藍色是分針。
- **記憶之鏡**：Q27–Q30 加上 CSS 橢圓金框。
- **存檔與續玩**：
  - 每次 Check、每場戰鬥結束、離開頁面時都會存檔。
  - 首頁輸入學號後，可以選「Continue」或「Start over」。
  - HUD 顯示 ✓ Saved；瀏覽器不能存檔時顯示 Not saved。

## 已加入（2026-10-18）

- **旁白逐字標亮**：念到的句子黃底、念到的字金色，時間來自 whisper-1 逐字時間。
- **Tick 答對語音**：答對後在綠色區按 🔊 播放，播完才解鎖 Next；載入失敗 2 次才放行。
- **Godot 戰鬥**：`public/game/` 由 `godot/clock-tower-battles` 匯出。戰鬥頁以 iframe 嵌入，訊息會檢查 origin、source、channel、instance、runId。
  - 戰果另外存在 `state.battles[id].result`，不影響學習分數。
  - 可以略過，紀錄為 `skipped`。
- **部署**：https://hwg5-clock-tower.web.app ，設定在 `firebase.json`（site `hwg5-clock-tower`）。

## 尚未完成（不要當作已完成）

- **實機**：實體 iPad Safari 的手指操作、喇叭聽感和校網載入時間還沒測。
- **教師資料**：沒有教師後台、CSV、學號名冊或跨裝置存檔。紀錄只存在學生這台裝置的 localStorage。
