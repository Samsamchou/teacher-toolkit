# 電子語音繪本館交接文件 / Storybook Library Handoff

更新日期：2026-08-15
正式網站：<https://ershui-storybooks.web.app/>

## 目前完成內容

- 網站首頁：學生輸入 5 位數學號並按 Enter 後，顯示「學扶／五年級／六年級」。
- 學扶書櫃：收錄 `Friends meet`（7 頁）與 `School day`（12 頁）。
- 五、六年級目前只顯示「繪本即將上架」。
- 每頁朗讀必須完整播放兩次，第二次 `ended` 後才顯示右側下一頁箭頭。
- 播放期間喇叭停用，不能用連點跳過；進入下一頁後重新由 `0 / 2` 計算。
- 全書完成後播放 5 秒慶祝動畫，再顯示回首頁按鈕。

## 主要路徑

- `index.html`、`site.css`、`site.js`：入口網站與學號／分類流程。
- `remedial/index.html`：學扶繪本書櫃。
- `remedial/G4/public/`：`Friends meet` 閱讀器、7 張頁圖及 7 段 MP3。
- `remedial/G4/school-day/public/`：`School day` 閱讀器、12 張頁圖及 12 段 MP3。
- `remedial/G4/scripts/build_story_assets.py`：重建 `Friends meet` 資產。
- `remedial/G4/school-day/scripts/build_story_assets.py`：重建 `School day` 資產。
- `firebase.json`、`.firebaserc`：Firebase Hosting 設定。

## 來源與特殊狀況

- 兩本 PDF 都是圖片型 PDF，沒有可直接擷取的文字層；句子需以頁面渲染、OCR 或人工視覺核對。
- `School day` 的來源音訊雖以 `.wav` 命名，實際編碼是 48 kHz 單聲道 MP3。
- 封面與完成慶祝圖位於各閱讀器的 `assets/generated/`。
- 原始 PDF、來源音訊、切割腳本與聯絡表保留在專案中，但 Firebase Hosting 會排除它們。

## 本機預覽

```powershell
& "C:\firebase-deploy\allstorybooks\start-site.ps1"
```

預覽網址：<http://127.0.0.1:4173/>

## 重建繪本資產

```powershell
$python = "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

& $python "C:\firebase-deploy\allstorybooks\remedial\G4\scripts\build_story_assets.py"
& $python "C:\firebase-deploy\allstorybooks\remedial\G4\school-day\scripts\build_story_assets.py"
```

重建後必須核對 PDF 頁數、PNG／MP3 數量、每段語音內容與 `story-data.json`。

## 更新正式網站

Firebase 專案為 `g4-remedial-all-vocab-app`，獨立 Hosting site 為
`ershui-storybooks`，本專案 target 名稱為 `storybooks`。

```powershell
& "$env:APPDATA\npm\firebase.cmd" deploy --only hosting:storybooks
```

部署前後都要確認沒有把 PDF、WAV、Python、Markdown、Firebase 快取、
debug log、`.tools` 或本機 agent 設定發布出去。

## 已完成驗證

- 發布成品共 54 個檔案；原始 PDF／WAV 與工具檔案未發布。
- `site.js` 與兩本書的 `app.js` 通過 `node --check`。
- 19 段 MP3 均可完整解碼。
- 公開網站已實測學號 Enter、三個分類、兩本書入口、頁圖與音訊載入。
- 頁圖為 1376×768；音訊在瀏覽器為 ready state 4。
- 桌面與 390×844 行動版無水平溢出；公開網站瀏覽器錯誤為 0。

## 後續擴充原則

1. 新繪本各自建立獨立資料夾與 `story-data.json`，不要改動已完成書籍的資產。
2. 沿用「完整聽兩次才解鎖」規則，並以音訊 `ended` 事件計數。
3. 書櫃新增卡片後，同時驗證桌面、行動版、頁圖、語音與返回首頁流程。
4. 只有在教師提供新書或指定五、六年級內容後，才啟用對應分類。
