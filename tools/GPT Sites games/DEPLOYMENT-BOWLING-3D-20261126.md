# Bowling 3D 正式部署（2026-11-26）

教師在對話中明確回覆「確認部署」後執行。2026-11-26 19:21:59（Asia/Taipei）完成 Firebase Hosting 發布。

- 正式入口：<https://gamesinclass-5d9d1.web.app/bowling?v=20261126bowling3d>
- 版本：`2026.11.26-bowling-3d.1`／production（取代 `2026.10.14-game-entry.1`）。
- Firebase project／site：`gamesinclass-5d9d1`；CLI 登入帳號 samchouou@gmail.com。
- 發布命令：`firebase deploy --only hosting --project gamesinclass-5d9d1 --non-interactive`；退出碼 0；成品 500 檔，上傳 68 個新檔。
- 只部署 Hosting。Functions、Firestore／Storage 規則、班級資料、教師通行碼都沒有變更。

## 上線內容

- Bowling 的投球、撞瓶與六張功能卡改為 3D（Three.js＋Rapier 物理）；首頁 Bowling、Unscramble 的 Bowling 單次獎勵、Phonics 接 Bowling 共用同一元件，一起更新。
- Extra Shot 由多 5 次改為多 2 次。
- 48 個 CC0 音檔與 edge-tts 播報（4.3 MB，`/bowling3d/audio/`），新背景音樂。
- 瀏覽器沒有 WebGL 2 或 3D 啟動失敗時，自動使用原 2D 球道與原音效。
- 規格：`rdq/RDQ-spec-basketball-bowling-spectacle-20261126.md`、`rdq/RDQ-spec-bowling3d-power-cards-20261126.md`；實作與驗證細節：`BOWLING3D-PILOT-20261126.md`。

## 證據

- 發布前讀回正式版本 `2026.10.14-game-entry.1`（Last-Modified 2026-10-14 15:50 台北時間）；10/14 之後本機 `src`、`public`、`functions` 只有這次的檔案有變動。
- C 槽隔離副本（`%TEMP%\gsg-bowling3d-20261126`）從最新來源重新建置：`npm test` 116／116、`npm run test:bowling` 15／15、`npm run test:bowling3d` 8／8、`npm run build`（發版檢查＋Vite）通過。未使用 G 槽舊 `dist`。
- 發布後從正式網址讀回 61／61 個檔案 SHA-256 與本次建置相同：`index.html`、`release.json`、主程式與 Bowling 的 JS／CSS、物理 Worker、49 個 `/bowling3d/audio/` 檔案、Comic Relief 字型。
- 五個路由（`/`、`/bowling`、`/unscramble`、`/phonics`、`/worldpup`）HTTP 200，內容等同本次 `index.html`，`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`。
- 正式站 `/bowling` 匿名開啟：教師登入頁正常顯示，載入新版主程式，console 無錯誤。
- 完整 500 檔有本機雜湊清單；只有上述 61 檔完成遠端核驗，不宣稱所有素材均已遠端核驗。
- 證據位置：`qa/bowling3d-production-20261126/`（`build-manifest.json`、`key-files.json`、`production-verification.json`）。

## 未驗證

- 沒有代填教師通行碼，所以**登入後的正式 Bowling 畫面沒有在正式站實測**；3D 流程只在本機 dev 伺服器逐格驗證過。
- 即時流暢度、聲音聽感、教室電腦、投影機、iPad／Safari 都待教師實機驗收。
- Phonics 接入版、正式遊戲內的 Swap／Lose／Double／No Shot、Winner 結算畫面、2D 備援路徑沒有個別實測。

## 復原

Firebase Console → Hosting → 發布紀錄，把 2026-10-14 的版本還原即可回到 `2026.10.14-game-entry.1`。

## 保存

- GDrive 正式來源與 `public/release.json` 已是 `2026.11.26-bowling-3d.1`／production。
- 沒有 Git stage／commit／push。
