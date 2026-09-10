# Classroom Club / 上課互動遊戲大集合

第一版已於 2026-09-07 正式部署至 Firebase，六碼通行碼已安全設定。 / First release was deployed to Firebase on 2026-09-07, with the six-digit passcode configured securely.

- 正式站 / Production: https://gamesinclass-5d9d1.web.app
- Firebase Console: https://console.firebase.google.com/project/gamesinclass-5d9d1/overview

## 2026-09-10 淨灘遊戲正式版 / Beach Cleanup release

- 淨灘遊戲與五個角色的肩膀、撿拾動作修正版已正式發布。 / Beach Cleanup and corrected character arms are live.
- 兩組六回合、A–E 路徑；手動點選垃圾或約 25 秒自動探索，海浪、微風與背景音樂。 / Two teams, six rounds, manual or automatic coastal exploration.
- 20 項測試及建置通過；正式站 16 個檔案雜湊一致。 / 20 tests passed; all 16 deployed files match.
- 教師已親自確認原六碼登入、登出成功；未更改通行碼。 / Teacher confirmed successful sign-in and sign-out.
- 最新驗證：DEPLOYMENT-20260910.md；角色驗證：BEACH-CHARACTERS-20260910.md。 / See the dated deployment and character records.
- 下方早期部署與待驗證敘述保留作歷史；登入狀態以本節為準。 / This section supersedes earlier login status.

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

## Firebase / 正式部署

- Project / 專案：gamesinclass-5d9d1
- Hosting site：gamesinclass-5d9d1
- 使用者升級後，已於 2026-09-05 在控制台讀取確認 Blaze。 / Blaze verified in the console.
- Firebase Auth custom token + Cloud Functions + private Firestore/Storage rules.
- 通行碼在伺服器驗證，僅 Secret Manager 保存加鹽 scrypt 驗證值。限制登入嘗試、工作階段最長 8 小時。 / Server-side verification, throttling and eight-hour sessions.
- Hosting、teacherLogin Function、Firestore 規則與 Storage 規則均已正式發布；完整紀錄見 DEPLOYMENT.md 與 DEPLOYMENT-RECEIPT-20260907.md。 / Hosting, teacherLogin, Firestore rules and Storage rules are live.

## 驗證與限制 / Validation and limits

原始功能驗證詳 QA-20260905.md；正式部署前重新執行功能測試 10/10、權限測試 6/6與 production build，全部通過。正式站 11/11 個檔案的 SHA-256 均與本機部署成品相符。 / Pre-deployment tests and production file verification passed.

已實測批次 51 張、總數 57；備份還原後 114 張、課堂順序保留、重開頁面仍有資料；揭曉實測 8.386 秒。正式站仍需教師以有效通行碼完成一次登入、上傳與跨裝置讀取驗收。 / A valid-passcode login, upload and cross-device production check remain for the teacher.

React/Vite、Firebase、IndexedDB、Canvas、JSZip；不連接 AI 服務。畫面裝飾是 CSS，示範素材是程式生成的幾何測試圖。 / No AI runtime service; CSS and geometric fixtures.

## 來源與專案界線 / Sources and scope

參考互動：https://ooopenlab.cc/template/lMjL016EafWutUMQAOvk/result?isTemplateModal=true
僅參考互動，未複製其程式或素材。 / Interaction reference only.

RDQ 兩輪 8 題已確認，規格位於 rdq/RDQ-spec-classroom-games-20260905.md。
沿用 teacher-toolkit 父層 Git；版本控制與部署文件只處理此子目錄，保留其他專案變更。 / This project uses the parent teacher-toolkit repository while preserving unrelated project changes.

## 2026-09-05 糖果樂園改版 / Candy redesign

最新規格覆蓋前文「英文介面」敘述：首頁與管理區為英文大字＋繁體中文小字，上課遊戲純英文。加入三段字級、刮擦與勝利音效、四角色 6 秒慶祝、跳過與減少動態。
四款角色與完整生成提示：public/celebration/*.png 與同名 .json；使用內建 image_gen，生成素材一次後由網頁播放。
詳 rdq/RDQ-spec-candy-bilingual-celebration-20260905.md、QA-candy-20260905.md。此版本已於 2026-09-07 正式部署。
