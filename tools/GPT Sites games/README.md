# Classroom Club / 上課互動遊戲大集合

第一版已完成本機實作與驗證；尚未部署、尚未設定正式通行碼。 / First release implemented and locally tested; production deployment and passcode setup are pending.

## 已完成 / Features
- 英文卡片式首頁；遊戲入口可新增、改名、排序、隱藏。 / English game hub with editable game links.
- 共用私人圖片庫、每個遊戲獨立的課堂清單。第一版實作 Scratch & Reveal。 / Shared private library and per-game lessons; Scratch & Reveal is the first built-in game.
- PNG、JPG、WebP；每張最多 20 MB、4,000 萬像素；無固定 50 張上限。不同尺寸完整等比例顯示。 / Mixed-size images, preserved aspect ratio, no fixed image-count cap.
- 選圖、排序、命名與保存課堂，一次播放一張。 / Ordered, named lessons with one image at a time.
- 滑鼠與 Pointer Events 觸控刮圖；左上角小圖示工具列含手寫、直線、正方形、長方形、圓形、選色、橡皮擦、復原、清除筆跡。 / Scratch and annotation tools.
- 右下角 8 秒全圖揭曉；重新覆蓋圖片、前後切換。 / Animated reveal, re-cover and image navigation.
- ZIP 備份圖片、課堂與外部遊戲連結；還原加入副本、不覆蓋原資料。匯入限制 512 MB。 / Additive ZIP backup restore, 512 MB import limit.
- 正式版僅六碼通行碼登入；不使用 Gmail 教師登入。 / Six-digit teacher passcode only.

## 本機預覽 / Local preview

執行 scripts/local-preview.ps1。Google Drive 對大量套件檔案的同步會造成安裝衝突，因此腳本將來源複製至本機暫存執行目錄。 / Run scripts/local-preview.ps1; dependency runtime stays outside Google Drive.

- 目前示範預覽 / Current demo: http://127.0.0.1:5178/
- 初始 6 張幾何示範圖片，資料只存該瀏覽器；清除網站資料可能刪掉示範資料。 / Six geometric fixtures; browser-local demo data.
- 正式建置不含示範登入捷徑，需 Firebase 設定才能登入。 / Production build requires Firebase and a valid server-verified passcode.
- 雲端同步尚未啟用；本機預覽不能當成跨裝置同步成功的證據。 / Local preview does not verify cloud sync.
- 重新啟動使用相同暫存目錄；請以本專案 src 原始碼為準，不在暫存目錄改正式來源。 / Edit authoritative source here, not the cache.

## Firebase / 部署目標

- Project / 專案：gamesinclass-5d9d1
- 預定 Hosting site / Planned site：gamesinclass-5d9d1
- 使用者升級後，已於 2026-09-05 在控制台讀取確認 Blaze。 / Blaze verified in the console.
- Firebase Auth custom token + Cloud Functions + private Firestore/Storage rules.
- 通行碼在伺服器驗證，僅 Secret Manager 保存加鹽 scrypt 驗證值。限制登入嘗試、工作階段最長 8 小時。 / Server-side verification, throttling and eight-hour sessions.
- 正式發布另行確認，詳 DEPLOYMENT.md；此輪沒有改動正式雲端資源。 / See DEPLOYMENT.md; no production mutations in this implementation.

## 驗證與限制 / Validation and limits

詳 QA-20260905.md。功能測試 7/7、權限測試 6/6、正式建置成功；前後端 production dependency audit 均為 0 vulnerabilities。 / See QA report.

已實測批次 51 張、總數 57；備份還原後 114 張、課堂順序保留、重開頁面仍有資料；揭曉實測 8.386 秒。實際觸控螢幕、全螢幕與正式跨裝置登入仍待驗收。 / Hardware and cloud checks remain pending.

React/Vite、Firebase、IndexedDB、Canvas、JSZip；不連接 AI 服務。畫面裝飾是 CSS，示範素材是程式生成的幾何測試圖。 / No AI runtime service; CSS and geometric fixtures.

## 來源與專案界線 / Sources and scope

參考互動：https://ooopenlab.cc/template/lMjL016EafWutUMQAOvk/result?isTemplateModal=true
僅參考互動，未複製其程式或素材。 / Interaction reference only.

RDQ 兩輪 8 題已確認，規格位於 rdq/RDQ-spec-classroom-games-20260905.md。
沿用 teacher-toolkit 父層 Git，僅處理此子目錄，保留其他專案變更。本次沒有 commit/push。 / Parent Git repository; no commit/push in this turn.

## 2026-09-05 糖果樂園改版 / Candy redesign

最新規格覆蓋前文「英文介面」敘述：首頁與管理區為英文大字＋繁體中文小字，上課遊戲純英文。加入三段字級、刮擦與勝利音效、四角色 6 秒慶祝、跳過與減少動態。
四款角色與完整生成提示：public/celebration/*.png 與同名 .json；使用內建 image_gen，生成素材一次後由網頁播放。
詳 rdq/RDQ-spec-candy-bilingual-celebration-20260905.md、QA-candy-20260905.md。正式部署仍未執行。
