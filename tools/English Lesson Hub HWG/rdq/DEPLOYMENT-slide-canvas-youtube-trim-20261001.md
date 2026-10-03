# 教材畫布／Comic Relief／YouTube 修剪：正式發布

使用者以「開始部署正式站」明確授權。2026-10-01 已發布至 [English Lesson Hub 課堂](https://lesson-hub-v03.web.app/lab)。

## 發布範圍與內容

- Firebase 專案 `hwg7teaching`，僅更新 `functions:teacher-access:liveV2` 與 `hosting:lesson-hub-v03`。
- 教材改用 16:9 畫布與上方工具列，提供正文方塊、選字顏色／粗體、四段字級、整合圖片入口、音訊、影片／外部簡報及五種主題。既有教材沿用新配置並保留原內容與原稿。
- Comic Relief 一般／粗體字型由網站自帶；學生題目依四段字級轉為 22／24／28／32px。
- 新增 YouTube 後自動開啟修剪，可設定起訖分、秒及拖曳時間軸，片段至少 5 秒；保存、重新開啟、轉題及師生播放保留範圍。到終點停止，重播從起點開始。
- CLI 確認兩次 Deploy complete，結束碼均為 0；Hosting 發布 101 個檔案。後端新版本 `livev2-00012-lap` 為 ACTIVE／Ready，建立與就緒版本一致，四個既有功能旗標維持啟用。

## 發布前驗證

- 合併兩輪 QA 共 35 個修改來源檔，與 G 槽、隔離測試副本及發布副本 SHA-256 一致；10 組前後端共用模組一致。
- 網站 223／223、Functions 10／10、Firestore／Storage 模擬器 11／11，共 244 項測試通過。追加 Chrome 操作 6 組、3 種寬度、6 個實際字形節點及公開 YouTube 00:05–00:10 實播通過。
- 正式雲端模式重新建置，公開 App Check 設定與現有專案網域核對；Firebase、教師存取、正式部署閘門及 46 堂課／2 份題庫資料檢查通過。
- 隔離副本不含上層原始題庫，因此資料來源檢查從 G 槽專案執行；未改動題庫路徑或原始教材。60 個既有 public 素材全部與發布副本逐檔一致。

## 發布後驗證

- **101／101** 正式檔案全部 HTTP 200，SHA-256 與發布建置逐檔一致；`/`、`/lab`、`/lab?join=` 均讀回新 `index.html`。
- 正式 Chrome 雲端介面、教師解鎖入口與 runtime `projectId=hwg7teaching` 通過；JavaScript 頁面錯誤為 0。
- 在正式頁面的臨時 DOM 測試英文一般字與粗體，Chrome 實際字形分別為 `ComicRelief-Regular`／`ComicRelief-Bold`，各 25 個字形；兩個字型資源成功讀取。臨時 DOM 未保存到教材。
- 驗收瀏覽器主動阻擋所有非讀取請求，包含頁面自動啟動的匿名 Auth／reCAPTCHA，因此截圖中的 `auth/network-request-failed` 是測試攔截造成，並非正式教師登入的測試結果。未登入教師帳號、未存取私人課程或提交正式資料；私人投影仍由教師驗收。
- 首輪 101 檔、字型與入口皆通過，最後因腳本錯把「已攔截的匿名初始化請求」視為失敗而停止；原證據另存 `attempt-01`。修正此驗收斷言後，只重跑瀏覽器，HTTP 證據經發布建置雜湊再次核對後沿用。最終 `production-readback.json` 為 PASS。

## 保存與界線

- 實作交接：`IMPLEMENTATION-slide-canvas-20261001.md`、`IMPLEMENTATION-youtube-trim-20261001.md`。
- 正式發布證據：`../qa/slide-canvas-youtube-trim-20261001/production/`。包含部署 log、後端讀回、正式建置 log、來源 manifest、靜態素材保留清單及 `release-dist.zip`；更新前四份文件保存於 `before-docs/`。
- 發布 ZIP SHA-256：`a510e8c4072cf27030add7c6bb831c3d8cd4288e34f5380938e4999b5605a724`。
- 本次未部署規則、Secrets、Worker、其他 Functions 或其他站台，未改寫正式課程／作答資料，未 Git stage／commit／push，未執行收工或 Obsidian 同步。
- 教師親自解鎖後的私有課程、教室 iPad／喇叭／投影與實際共享內容驗收仍保留；自動化公開影片與字型檢查不等同教室裝置驗收。
