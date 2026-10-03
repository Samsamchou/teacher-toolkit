# 教材投影片畫布完善版本 — 本機交接

狀態：依使用者「先這樣，直接開始」與 [確認規格](RDQ-spec-slide-canvas-20261001.md) 完成實作與本機驗證。尚未部署、未改寫正式課程、未 Git stage／commit／push，未執行 Obsidian 收工同步。

## 已完成的操作

- 16:9 自由畫布，上方集中新增文字、圖片、音檔、影片／簡報、主題、復原／重做與轉成題目。
- 新增文字只建立正文方塊，可直接輸入。英文固定 Comic Relief（已包含正常與粗體字型）；中文以系統中文字型補足。選字可改色、粗體及字級；沒有選字時套用整個方塊。貼上文字只取純文字，保留換行與中文；大字／多行會自動增高，與文字修改一起復原。
- 物件拖曳、右下角縮放、複製、鎖定／解鎖、刪除，以及位置／旋轉／圖層數值設定。外部簡報可先點「點選編排」選取再移動；選取後可操作原簡報。刪除影片同步來源會一起清除，復原會一起恢復，素材原檔保留。
- 圖片入口含上傳、拖放、搜尋、剪貼簿及 HTTPS 圖片連結；搜尋沿用既有 SafeSearch、來源與授權確認。
- 音檔可上傳 MP3／WAV 或錄音，最多 10 分鐘；錄音轉為 16 kHz 單聲道 PCM WAV，沿用原素材授權。拒絕麥克風權限有提示，關閉錄音會停止並釋放麥克風。
- 影片入口整合 MP4／WebM、YouTube、Google Drive 影片、Canva 與 Google Slides，提供連結預覽及開新分頁。沿用既有影片轉檔與教師同步控制；每頁仍只有一個全班同步影片來源。
- 五種主題：清爽白板、柔紫課堂、森林學堂、海洋探索、深色舞台。可套用本張或本堂所有教材投影片，保留文字、物件與手動格式；整堂套用不修改題目。

| 選項 | 教師 1280×720 畫布 | 轉題後學生字級 |
| --- | --- | --- |
| 標準 | 40px | 22px |
| 大字（新增預設） | 48px | 24px |
| 特大 | 64px | 28px |
| 強調 | 80px | 32px |

畫布會按視窗寬度縮放，教師字級以上述設計尺寸為基準。舊文字字級轉為最接近的固定選項；原始設定保留於原稿。

## 舊教材與轉題

舊投影片開啟即顯示新版畫布，保留原始標題、正文、文字物件、圖片、音訊、影片及連結；有外部簡報與其他素材時採分欄，避免簡報覆蓋原物件。首次保存畫布時記錄 `slideCanvas.original`，可從「頁面名稱、備註與原稿 → 還原原稿」恢復原始資料。單純開啟不批次改寫正式課程；本機測試中還原前後的整份教材內容雜湊一致。

轉題新增副本並保留來源投影片，全部既有題型均可建立草稿。學生題幹採圖片左、文字右及上表字級，保留選字顏色／粗體；教師可編輯帶入的教材，修改不影響來源。副本先隱藏；教師完成題幹、選項與正解，勾選確認後再顯示。新選擇題不帶入預設正解；其他需要正解的題型也清空相應內容。

後端與前端共用畫布資料驗證。學生課堂快照會移除原稿與教師備註，沿用既有素材權限與課程版本衝突保護。

## 驗證與證據

QA 目錄：[qa/slide-canvas-20261001](../qa/slide-canvas-20261001/)。隔離驗證目錄：`C:\Users\User\AppData\Local\Temp\lesson-hub-slide-canvas-20261001`；來源檔案雜湊比對見 `source-manifest.json`。依賴使用既有、相同 lockfile 的本機套件，未下載或安裝新套件。

- 網站測試 **217/217**（其中本次畫布／錄音契約 20 項）、Functions **10/10**、Firestore／Storage 模擬器 **10/10**；共 **237** 項。
- Vite 建置、Functions 語法、共用模組一致性、教師安全檢查與離線 Firebase 設定檢查通過。
- 原專案教材資料 **46 堂／2 本／10 單元**驗證通過，errors 0。
- `browser-results.json`：12 組本機操作檢查通過；選字格式、復原重做、物件操作、五主題、圖片／音訊／影片、保存重載、轉題、師生獨立工作階段與實際作答／過關回饋。
- `legacy-browser-results.json`：5 組通過；原稿完整雜湊一致、外部簡報選取、麥克風拒絕／取消、純文字貼上／多行增高與模擬觸控拖曳。兩份紀錄的 pageErrors 均為空。
- Chrome 寬度 1440／1180／820／390px 無橫向溢出；全螢幕投影隱藏編輯工具。五種主題與學生題幹截圖已目視檢查。

模擬器測試需依序執行：規則測試會清空同一個 demo 資料庫。先前並行失敗的紀錄保留為 `emulator-attempt-concurrent.log`，最終 `emulator-tests.log` 是依序通過結果。畫布修正前的瀏覽器失敗證據保留在 `attempt-01` 至 `attempt-03`。

重做本次模擬器驗證的命令（在隔離目錄）：

```powershell
firebase emulators:exec --only firestore,storage --config firebase.emulator.json --project demo-lesson-hub "node --test --test-concurrency=1 tests/firestore-rules.integration.mjs tests/storage-rules.integration.mjs tests/slide-canvas-cloud.integration.mjs"
```

## 預覽與待教師驗收

本機預覽：[http://127.0.0.1:5192/lab](http://127.0.0.1:5192/lab)。點「＋ 建立互動課程」輸入名稱，進入新版畫布後即可使用上方工具列；本機課程不會同步到正式課程庫。伺服器從隔離目錄執行 `npm run dev -- --port 5192 --strictPort`。

自動驗證採 Chrome 假麥克風、合成圖片／音訊／影片、模擬圖片搜尋及外部平台預覽頁；沒有提交正式測試課程或成績，沒有呼叫付費生成／AI 評分。實際 YouTube／Canva／Google Slides 共享內容、正式圖片搜尋、iPad Safari 錄音、教室喇叭及實際投影可讀性仍待教師驗收。共享連結需有觀看權限，外部平台限制嵌入時可開新分頁。

正式入口仍維持現有版本。收到明確部署授權後，需要一起更新 `hosting:lesson-hub-v03` 與 `teacher-access:liveV2` 的共用模型，再做正式讀回；本次未變更其他 Functions、Firestore／Storage 規則、Secrets 或 Worker。
## 2026-10-01 投影字型與 YouTube 修剪補強

使用者回報投影字型後，發現上一輪僅檢查 CSS 字型名稱，沒有驗證字型檔載入及實際字形。本次已修正為專案內載入 Comic Relief，並對編輯／投影／學生題幹的一般與粗體共 6 個節點檢查實際字形，全部通過。

新增 YouTube 起訖分、秒及雙端時間軸修剪，最短 5 秒，保存／重開／復原／轉題及師生同步保留範圍。完整追加紀錄：`IMPLEMENTATION-youtube-trim-20261001.md`。最新測試 244/244、瀏覽器 6 組及公開 YouTube 5 秒實播通過；最新 QA：`../qa/slide-canvas-youtube-trim-20261001/`。

## 2026-10-01 正式部署完成

使用者以「開始部署正式站」授權，已更新 `hosting:lesson-hub-v03`（101 檔）及 `teacher-access:liveV2`（`livev2-00012-lap` Ready）。正式入口：https://lesson-hub-v03.web.app/lab 。此紀錄取代上方本機階段的未部署狀態；既有教材內容保留，未批次改寫正式資料。詳見 `DEPLOYMENT-slide-canvas-youtube-trim-20261001.md`。
