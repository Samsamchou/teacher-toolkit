# Basketball 3D 與六張功能卡正式部署（2026-11-26）

教師在對話中先回覆「準備部署」，看過部署前檢查後再回覆「確認部署」才執行。2026-11-26 21:08:50（Asia/Taipei）完成 Firebase Hosting 發布。

- 正式入口：<https://gamesinclass-5d9d1.web.app/?v=20261126basketball3d>（登入後點 Animal Basketball）
- 版本：`2026.11.26-basketball-3d.1`／production（取代 `2026.11.26-bowling-3d.1`）。
- Firebase project／site：`gamesinclass-5d9d1`；CLI 登入帳號 samchouou@gmail.com。
- 發布命令：`firebase deploy --only hosting --project gamesinclass-5d9d1 --non-interactive`；退出碼 0；成品 526 檔，上傳 45 個新檔。
- 只部署 Hosting。Functions、Firestore／Storage 規則、班級資料、教師通行碼都沒有變更。

## 上線內容

- Animal Basketball 球場改為 3D：投籃、慢動作重播、鏡頭、觀眾、英文播報，23 個球場音檔（`/basket3d/audio/`，910 KB）加上與 Bowling 共用的音效。
- 取消 Focus／Long shot 與 4 分球，改成六張抽卡式功能卡：Extra Shot、Double Points、Swap Points、Slam Dunk、Steal、Hit or Miss；設定頁可逐張開關與調整比例。
- Unscramble 的籃球獎勵換成 3D（沒有卡片）；Phonics 接籃球共用同一元件，一起更新。
- 沒有 WebGL 2 或 3D 啟動失敗時，自動使用原 2D 球場。
- Bowling：共用模組整理後的版本（畫面與規則沒有改）。
- **對使用中的人的影響**：舊版還沒打完的籃球存檔不能續玩，要開新局。
- 規格：`rdq/RDQ-spec-basketball-bowling-spectacle-20261126.md`、`rdq/RDQ-spec-basketball-power-cards-20261126.md`；實作與驗證細節：`BASKETBALL3D-PILOT-20261126.md`。

## 證據

- 發布前讀回正式版本 `2026.11.26-bowling-3d.1`（Last-Modified 2026-11-26 19:21:56 台北時間，即上一次 Bowling 發布，之後沒有別的發布）。
- `public/release.json`：版本、8 個改過的來源雜湊、新增 14 個來源檔（共 101 個）、`basketball3d` 區塊。
- C 槽隔離副本（`%TEMP%\gsg-bowling3d-20261126`）從最新來源建置：`npm test` 127／127、`test:bowling` 15／15、`test:bowling3d` 8／8、`test:basket3d` 6／6、`test:plinkoh` 25／25、`test:slot` 9／9、`test:worldpup` 25／25；`npm run build`（發版檢查＋Vite）通過。發布前再核對成品 526／526 檔與建置清單一致、來源與 G 槽一致。
- 和上一次發布的建置清單比對：新增 24 個 `/basket3d/` 檔案；`index.html`、`release.json` 內容改變；19 個 JS／CSS 程式包換了檔名，17 個舊檔名移除；其餘圖片、音檔、字型都沒有變。試片頁不在成品裡。
- 發布後從正式網址讀回 **87／87** 個檔案 SHA-256 與本次建置相同：`index.html`、`release.json`、主程式、`Basket3DLane`、`BowlingGame`、共用 3D 程式包、物理 Worker、24 個 `/basket3d/audio/`、49 個 `/bowling3d/audio/`、Comic Relief 字型。
- 五個路由（`/`、`/bowling`、`/unscramble`、`/phonics`、`/worldpup`）HTTP 200，內容等同本次 `index.html`，`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`，Last-Modified 2026-11-26 21:08:50 台北時間。
- 正式站匿名開啟：教師登入頁正常顯示，載入新版主程式，`Basket3DLane` 與 `BowlingGame` 程式包可載入，籃球音檔可讀取，console 無錯誤。
- 完整 526 檔有本機雜湊清單；只有上述 87 檔完成遠端核驗，不宣稱所有素材均已遠端核驗。
- 證據位置：`qa/basketball3d-production-20261126/`（`build-manifest.json`、`key-files.json`、`production-verification.json`）。

## 本機實測（開發伺服器，逐格模式）

- 籃球：一般投籃、六張卡、三組時 Swap 選對象、Steal 同分選對象與無分可偷、多投兩球、投籃途中離開再續玩、結算畫面、減少動態、2D 備援、Unscramble 籃球獎勵。
- Bowling（共用模組改動後）：正式遊戲抽 Double Points（21 → 42，OKAY 按鈕正常）、一般投球（+8）、Unscramble 的 Bowling 獎勵。

## 未驗證

- 沒有代填教師通行碼，所以**登入後的正式籃球畫面沒有在正式站實測**；3D 流程只在本機開發伺服器逐格驗證過。
- 即時流暢度、聲音聽感、教室電腦、投影機、iPad／Safari 都待教師實機驗收（內建瀏覽器在背景時每秒只有 2 格）。
- Phonics 接入版只跑了單元測試，沒有在瀏覽器實際走過。
- Slam Dunk 用的是現有投籃姿勢圖，沒有專屬的灌籃姿勢。

## 復原

Firebase Console → Hosting → 發布紀錄，把 2026-11-26 19:21 的版本還原即可回到 `2026.11.26-bowling-3d.1`。

## 保存

- GDrive 正式來源與 `public/release.json` 已是 `2026.11.26-basketball-3d.1`／production。
- 沒有 Git stage／commit／push。
