# GPT Sites games — 上課互動遊戲大集合（Claude Code 接手）

本專案原由 Codex 開發，現由 Claude Code 全權接手。基線以 `agent.md` 為準，本檔只補充接手資訊。

## 對話開始時請先讀

- `agent.md`：專案基線（國小英語教師、3–6 年級、檔案用繁體中文＋英文、先 RDQ 再製作）
- `README.md`：依日期倒序的功能與部署歷史（最新在最上方）
- 最新部署：`DEPLOYMENT-BASKETBALL-HOLD-20261126.md`（版本 `2026.11.26-basketball-hold.1`，2026-11-26 21:35）；之前 `DEPLOYMENT-BASKETBALL-3D-20261126.md`、 `DEPLOYMENT-BOWLING-3D-20261126.md`。3D 實作細節在 `BOWLING3D-PILOT-20261126.md`、`BASKETBALL3D-PILOT-20261126.md`
- 最新 `CLOSEOUT-*.md`：`CLOSEOUT-GAME-ENTRY-20261014.md`（11/26 之後尚未寫收工紀錄）
- `rdq/`：各功能已確認的需求規格；新功能先走 RDQ 再動工

## 專案概況

- React／Vite + Firebase（Hosting、Cloud Functions、Firestore／Storage 規則）。
- Firebase 專案與 Hosting site：`gamesinclass-5d9d1`；正式站 <https://gamesinclass-5d9d1.web.app>。
- 教師以六碼通行碼登入（伺服器驗證）；不使用 Gmail 教師登入。
- 遊戲：Scratch & Reveal、Beach Cleanup、Spin、Animal Basketball、Unscramble、Vocabulary、Plink-oh!、Bowling、Space Slot Machine、World Pup Soccer、Phonics。
- 英文介面規則：管理區英文大＋繁中小，遊戲畫面純英文；字型 Comic Relief。

## Skills（已從 Codex 複製到 `.claude/skills/`）

- `class-game`：復刻遊戲、擴充可自建題組、Phonics 聲音拼圖（來源：`skills/class-game/`，內容一致）
- `gpt-image-2-api`：AI 圖片只走 Images API gpt-image-2；須確認成本、金鑰不入庫、保留 JSON 紀錄與 SHA-256
- `initialize-project`：專案初始化（agent.md、.gitignore）
- 另有全域 `rdq`、`startup`、`shutdown` 可用（`~/.claude/skills`）。

## 工作規則

- 沿用父層 teacher-toolkit Git；只處理本子目錄，保留他人／其他專案的未提交變更。
- 不提交 `.env`、金鑰、token、服務帳戶；`.gitignore` 已涵蓋。學生資料去識別化。
- **正式部署（firebase deploy）、付費 API、發布公開內容皆須教師明確授權**，並核對精確目標；部署後從正式網址讀回版本與資產雜湊。
- 區分證據層級：單元測試、本機瀏覽器、模擬器、正式伺服器、實體裝置；不把本機測試當成實機驗收。
- Google Drive 對 `node_modules` 同步易衝突：本機預覽用 `scripts/*-preview.ps1`（複製到暫存目錄執行），以本資料夾 `src` 為唯一正式來源。
- 每次重大交付新增 `DEPLOYMENT-*.md`／`CLOSEOUT-*.md`，並更新 README 頂端段落。

## 3D 遊戲（2026-11-26 起）

- Bowling 的 3D 在 `src/bowling3d/`：`physics.mjs`／`planner.mjs`（物理與「照規則瓶數」規劃）、`stage.js`／`director.js`／`cards3d.js`／`fx.js`（場景、導播、功能卡）、`audio3d.js`、`Bowling3DLane.jsx`（接進 `BowlingGame.jsx` 的元件）。分數永遠由 `bowling-model.mjs` 決定。
- 試片頁 `bowling3d-pilot.html`（`scripts/bowling3d-preview.ps1`，埠 5221）只在本機，不會進正式建置。
- 音效來源與授權記在 `public/bowling3d/audio/manifest.json`，用 `scripts/prepare-bowling3d-audio.mjs` 重做；下載新素材前先列清單問教師。
- 測試與建置在 C 槽暫存副本跑；正式建置 `npm run build` 會檢查 `public/release.json` 的來源雜湊，改了清單內的檔案要先更新版本。
- Animal Basketball 的 3D 在 `src/basket3d/`（試片頁 `basket3d-pilot.html`，同一個預覽腳本）。2026-11-26 已接進 `BasketballGame.jsx`（`Basket3DLane.jsx` 延後載入，沒有 WebGL 2 時退回 2D），規則改為六張功能卡（`basketball-model.mjs` 存檔版本 3）；同日已部署正式站。紀錄：`BASKETBALL3D-PILOT-20261126.md`；規格：`rdq/RDQ-spec-basketball-power-cards-20261126.md`。
- 兩款共用的 3D 模組在 `src/game3d/`（舞台基礎、鏡頭、觀眾、卡片套件、畫面疊層 `ShowOverlays.jsx`）；改這裡要兩款都重測。
- 瀏覽器逐格測試：遊戲內 `window.__basket3dQA`／`window.__bowling3dQA`（`manual=true` 後 `engine().step(秒)`、`okay()`）。內建瀏覽器在背景時每秒只有 2 格，不能拿來判斷流暢度。

## 待辦

1. 教師在正式站登入後驗收 Bowling 3D 與 Basketball 3D：流暢度、聲音、六張功能卡、Unscramble 獎勵、Phonics 接入版；教室電腦、投影、iPad／Safari。
2. Animal Basketball：等待時雙手捧球已部署（`2026.11.26-basketball-hold.1`，21:35；新圖 `public/basketball/hold.png`，球位置與腳線在 `src/basket3d/hold.mjs`）。換角色圖要重跑 `scripts/prepare-basketball-hold.py` 並重新量球位置。Phonics 接入版還沒在瀏覽器走過；Slam Dunk 專屬灌籃圖要先報價。
3. Git 尚未 stage／commit／push；工作區有大量既有變更，提交前先與教師確認範圍。
