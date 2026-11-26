# Basketball 等待時雙手拿球：正式部署（2026-11-26）

**狀態：已部署。** 教師確認規格（`rdq/RDQ-spec-basketball-hold-ball-20261126.md`，1B、2B、建議①②③），看過部署前檢查後回覆「確認部署」。2026-11-26 21:35:00（Asia/Taipei）完成 Firebase Hosting 發布：退出碼 0，成品 527 檔，上傳 20 個新檔。

- 目標：Firebase project／Hosting site `gamesinclass-5d9d1`。
- 版本：`2026.11.26-basketball-hold.1`／production（取代 `2026.11.26-basketball-3d.1`）。正式入口：<https://gamesinclass-5d9d1.web.app/?v=20261126hold>。
- 發布命令（C 槽建置副本）：`firebase deploy --only hosting --project gamesinclass-5d9d1 --non-interactive`。
- 只部署 Hosting；Functions、規則、班級資料都不動。

## 問題與修法

- 問題：還沒投籃前，球浮在動物旁邊。3D 球放在六隻動物共用的固定位置（離地 1.35 公尺），但預備姿勢圖是空手握拳，手的高度各不相同。
- 新圖：用 Codex CLI（不另收費，共 3 次生成，一次就合格）以原本三張角色圖當參考，畫出六隻動物「雙手捧球」的預備姿勢。去背、縮放後對齊原本預備姿勢的腳線，合成 `public/basketball/hold.png`（1.1 MB）。生圖紀錄、提示詞、原圖與 SHA-256 在 `generated-images/basketball-hold-20261126/`，處理腳本 `scripts/prepare-basketball-hold.py`。
- 等待時：顯示捧球圖，3D 球藏在畫上那顆球的位置（`src/basket3d/hold.mjs` 記錄每隻動物的球心與大小）。
- 出手（建議①）：按下分數後換成投籃姿勢，3D 球從畫上那顆球的位置與大小出現，往上升到出手點，不跳位、不會有兩顆球。
- 腳踩地面（順手修正，同一類「懸浮」問題）：原本的圖片腳下有空白，3D 裡動物離地 0.04–0.21 公尺。現在依每張圖的腳線把動物放低，預備、捧球、沒進球姿勢的鞋底都貼著球場；跳起的投籃與慶祝姿勢照原圖維持在空中，灌籃的高度另外補償。
- 慶祝與沒進的姿勢圖、規則、分數、卡片、音效、2D 備援都沒有改（建議②）。
- 自動檢查（建議③）：`tests/basket3d.test.mjs` 新增 3 項——圖檔雜湊與記錄的球位置一致、每個球心確實落在畫上的橘色球上、捧球圖的腳線等於原預備姿勢、原圖的腳線記錄正確。換圖時沒有重新量，測試就會失敗。

## 證據

- 單元測試：`npm test` 127／127、`test:bowling` 15／15、`test:bowling3d` 8／8、`test:basket3d` 9／9。
- `npm run build`（發版檢查＋Vite）通過；成品 527 檔。和上一次發布比對：新增 `/basketball/hold.png`；`index.html`、`release.json` 改變；17 個程式包換了檔名（主程式改動後重新編號）；其餘素材不變。
- 本機瀏覽器（逐格模式、1280×720）：
  - 六隻動物等待畫面各截一張：都雙手捧著球，沒有浮空的球，鞋底貼在投籃點上。
  - 貓、兔子、企鵝的出手逐格：0.15 秒時球從胸前出現、0.35–0.48 秒升到舉起的手上方、0.62 秒飛出，過程只有一顆球。
  - 功能卡：Slam Dunk（+3）、Hit or Miss、Extra Shot（之後的獎勵球等待時也是捧球圖）、Double Points 都正常完成；等待時都是捧球圖、3D 球隱藏。
- 清單：`qa/basketball-hold-production-20261126/`（`build-manifest.json`、`key-files.json`）。
- 正式站現況：`2026.11.26-basketball-3d.1`（Last-Modified 2026-11-26 21:08:50 台北時間）。

## 還沒驗證

- 登入後的正式畫面（不代填通行碼）；即時流暢度、教室投影、iPad。
- Unscramble 籃球獎勵與 Phonics 接入版沒有在這次重新走過（共用同一元件）。

## 發布後讀回

- 發布前再核對：正式站仍是 `2026.11.26-basketball-3d.1`；建置成品 527／527 檔與清單一致，來源與 G 槽一致。
- `node scripts/verify-bowling3d-production.mjs qa/basketball-hold-production-20261126`：正式版本 `2026.11.26-basketball-hold.1`，**88／88** 個關鍵檔案 SHA-256 一致（含 `/basketball/hold.png` 1,134,663 bytes、主程式、3D 程式包、全部 3D 音檔）；五個路由 HTTP 200，Last-Modified 2026-11-26 21:35:00 台北時間。結果存在 `qa/basketball-hold-production-20261126/production-verification.json`。
- 正式站匿名開啟：登入頁正常、`release.json` 為新版、`hold.png` 可讀取，console 無錯誤。

## 復原

Firebase Console → Hosting → 發布紀錄，還原 2026-11-26 21:08 的版本即回到 `2026.11.26-basketball-3d.1`。

## 保存

- GDrive 來源與正式站都是 `2026.11.26-basketball-hold.1`。
- 沒有 Git stage／commit／push。
