# Comic Relief 投影修正與 YouTube 修剪

日期：2026-10-01。依使用者追加的兩項需求完成修改；原教材畫布需求與已編輯內容保留。使用者以「開始部署正式站」授權後，已發布至 https://lesson-hub-v03.web.app/lab 。部署紀錄：`DEPLOYMENT-slide-canvas-youtube-trim-20261001.md`。

## 已完成

1. Comic Relief 的 400／700 字型改由專案內 8 個 WOFF2 檔載入，授權文件一併保留。修正本機依賴路徑的字型讀取失敗；編輯、投影與學生題幹實際使用 ComicRelief-Regular／ComicRelief-Bold。
2. 新增 YouTube 連結後自動開啟修剪視窗。老師可輸入開始與結束的分、秒，也可拖動雙端時間軸。片段至少 5 秒；秒數為 0–59，已知影片長度時禁止超過終點。可預覽、取消、使用完整影片及再次修改。
3. 選取已有 YouTube 物件後按「✂ 修剪影片」即可設定範圍。範圍保存在物件的 `trim: { start, end }`，不改動原連結；保存、重開、復原、題目副本均保留範圍。相同影片的物件副本使用同一範圍。
4. 教師端、投影預覽與學生題幹沿用該播放範圍。伺服器將跳轉位置限制在起訖時間內，播放到終點的學生快照顯示停止；重播從片段起點開始。既有 MP4、簡報及未修剪的影片流程保留。

## 實際驗證

- 網站單元測試 223/223；Functions 10/10；本機 Firestore／Storage 11/11，共 244 項通過。伺服器端驗證拒絕少於 5 秒的範圍，保存讀回與學生權限均通過。
- Chrome 操作測試 6 組：字型的實際字形、雙端時間軸拖曳、4 秒拒絕／5 秒接受、超過影片長度拒絕、保存／重開／改剪／復原／轉題、課堂跳轉及停止。1440／820／390px 無橫向溢出，無頁面 JavaScript 錯誤。
- 以 Chrome 的 `CSS.getPlatformFontsForNode` 分別檢查一般／粗體在編輯、全螢幕投影、學生題幹的 6 個節點，全部為自訂 Comic Relief 字型；字型檔 HTTP 200／快取 304。
- 真實公開 YouTube 示範影片 `M7lc1UVf-VE` 已讀取長度並實播 00:05–00:10：第一次觀測播放位置約 5.0787 秒，停止約 10.0172 秒，狀態為 ENDED。這是公開影片的自動化驗證，未代替教師的課堂裝置或私有教材驗收。
- Vite 最終建置通過，8 個字型檔均納入打包。驗證在隔離目錄 `C:\Users\User\AppData\Local\Temp\lesson-hub-slide-canvas-20261001`；專案原正式建置及正式資料未改寫。

播放器使用 YouTube 的 `cueVideoById` 與 `loadVideoById` 指定範圍；跳轉後另以 100ms 檢查終點。待播或緩衝時不強制起點跳轉，避免播放器無法開始。影片長度尚未載入時，介面提示可按影片內播放鍵載入，或直接輸入起訖時間。[YouTube IFrame API 官方說明](https://developers.google.com/youtube/iframe_api_reference)

## 檔案與重現

預覽：[http://127.0.0.1:5192/lab](http://127.0.0.1:5192/lab)。重新整理既有預覽頁即可使用。

來源：`preview/src/comic-relief.css`、`preview/src/assets/fonts/comic-relief/`、`preview/src/live/YouTubeTrim.jsx`、`SlideCanvas.jsx`、`VideoPlayer.jsx`、`video.mjs`、`slide-canvas.mjs`、`domain.mjs`；前後端共用模型已同步到 `preview/functions/generated/`。

完整證據與原檔備份：`qa/slide-canvas-youtube-trim-20261001/`。`browser-results.json` 含實際字型名稱；`actual-youtube.json` 與 `actual-youtube-clip.json` 含公開影片檢查；`source-manifest.json` 記錄來源／驗證副本／字型雜湊；`before/` 保留修改前 7 檔；`attempt-01/`、`attempt-02/` 保留初期驗證失敗紀錄。前一輪教材畫布 QA 目錄保留。

在隔離目錄重現：

```powershell
node --test tests/*.test.mjs
node --test functions/test/*.test.cjs
node scripts/verify-youtube-trim.cjs
firebase emulators:exec --only firestore,storage --config firebase.emulator.json --project demo-lesson-hub "node --test --test-concurrency=1 tests/firestore-rules.integration.mjs tests/storage-rules.integration.mjs tests/slide-canvas-cloud.integration.mjs tests/youtube-trim-cloud.integration.mjs"
npm.cmd run build
```

## 後續

已依使用者「開始部署正式站」授權更新 Hosting 與 `liveV2`，後端 `livev2-00012-lap` Ready。正式發布與讀回證據位於 `../qa/slide-canvas-youtube-trim-20261001/production/`。未 Git stage／commit／push、未執行收工或 Obsidian 同步；iPad／教室喇叭／實際投影及正式私有課程驗收待辦保留。
