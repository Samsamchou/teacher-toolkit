# Classroom Club / 上課互動遊戲大集合

<!-- basketball-hold-20261126 -->
## 2026-11-26 Animal Basketball 等待時雙手拿球（已正式部署）

版本 `2026.11.26-basketball-hold.1`／production，只發布 Hosting（21:35）。教師回報還沒投籃前球浮在半空；改為六隻動物各一張新畫的「雙手捧球」預備姿勢圖（Codex CLI 生成，`public/basketball/hold.png`），出手時 3D 球從手上那顆球的位置升起；站立姿勢的鞋底也改成貼著球場。測試 127／127、3D 籃球 9／9（含球位置與腳線自動檢查）；正式站讀回 88／88 檔一致。登入後畫面、投影與 iPad 待教師驗收。

[部署紀錄](DEPLOYMENT-BASKETBALL-HOLD-20261126.md)、[規格](rdq/RDQ-spec-basketball-hold-ball-20261126.md)。
<!-- /basketball-hold-20261126 -->

<!-- basketball-3d-20261126 -->
## 2026-11-26 Animal Basketball 3D 與六張功能卡（已正式部署）

正式入口：<https://gamesinclass-5d9d1.web.app/?v=20261126basketball3d>（登入後點 Animal Basketball）。版本 `2026.11.26-basketball-3d.1`／production，只發布 Hosting。Animal Basketball 的球場改為 3D（投籃、慢動作重播、觀眾、英文播報、真實錄音音效），取消 Focus／Long shot，改成抽卡式功能卡：Extra Shot、Double Points、Swap Points、Slam Dunk、Steal、Hit or Miss。投有「+1」的分值拿卡（每組最多 2 張），按 POWER UP 抽卡；設定頁可逐張開關與調整比例。Unscramble 的籃球獎勵同步換成 3D（沒有卡片）。沒有 WebGL 2 時退回原本的 2D 球場。舊版未打完的籃球存檔不能續玩。

測試 127／127、Bowling 15／15、兩款 3D 測試 8／8 與 6／6；正式站讀回 87／87 個關鍵檔案雜湊一致、五個路由 HTTP 200。3D 流程只在本機逐格驗證；登入後的正式畫面、即時流暢度、聲音聽感、教室電腦、投影、iPad 與 Phonics 接入版仍待教師驗收。Git 未 stage／commit。

[部署紀錄](DEPLOYMENT-BASKETBALL-3D-20261126.md)、[實作與驗證](BASKETBALL3D-PILOT-20261126.md)、[功能卡規格](rdq/RDQ-spec-basketball-power-cards-20261126.md)。下方紀錄保留為歷史。
<!-- /basketball-3d-20261126 -->

<!-- bowling-3d-20261126 -->
## 2026-11-26 Bowling 3D 與功能卡演出（已正式部署）

正式入口：<https://gamesinclass-5d9d1.web.app/bowling?v=20261126bowling3d>。版本 `2026.11.26-bowling-3d.1`／production，只發布 Hosting。Bowling 的投球、撞瓶與六張功能卡改為 3D 物理演出（慢動作重播、鏡頭、粒子、觀眾、英文播報），音效換成 48 個 CC0 錄音與新背景音樂；首頁 Bowling、Unscramble 的 Bowling 單次獎勵、Phonics 接 Bowling 一起更新。Extra Shot 由多 5 次改為多 2 次。沒有 WebGL 2 的裝置自動使用原 2D 畫面。

測試 116／116、Bowling 規則 15／15、3D 測試 8／8；正式站讀回 61／61 個關鍵檔案雜湊一致、五個路由 HTTP 200。3D 流程只在本機逐格驗證；登入後的正式畫面、即時流暢度、聲音聽感、教室電腦、投影與 iPad 仍待教師驗收。Git 未 stage／commit／push。Basketball 的 3D 與功能卡尚未開始（規格已確認）。

[部署紀錄](DEPLOYMENT-BOWLING-3D-20261126.md)、[實作與驗證](BOWLING3D-PILOT-20261126.md)、[規格](rdq/RDQ-spec-basketball-bowling-spectacle-20261126.md)、[功能卡規格](rdq/RDQ-spec-bowling3d-power-cards-20261126.md)。下方紀錄保留為歷史。
<!-- /bowling-3d-20261126 -->

<!-- game-entry-closeout-20261014 -->
## 2026-10-14 Soccer／Bowling 入口修復（已正式部署）

正式入口：<https://gamesinclass-5d9d1.web.app/?v=20261014entry1>。版本2026.10.14-game-entry.1／production，已完成Hosting發布。從總覽圖示點選Soccer／Bowling先顯示設定頁，舊比賽可另選繼續／看結果；刷新比賽保留進度。Bowling設定與結果頁可返回遊戲總覽，首頁圖示改為保齡球、球瓶與球道。

相關測試45／45、完整回歸116／116、本機23項瀏覽器流程及15種版面通過。正式37／37關鍵檔案SHA-256一致、四路由HTTP200、匿名登入頁無pageerror；實體iPad／Safari、投影與音效仍需教師驗收。GDrive及Obsidian工作筆記收工保存；Git未stage／commit／push。

[收工交接](CLOSEOUT-GAME-ENTRY-20261014.md)、[部署紀錄](DEPLOYMENT-GAME-ENTRY-20261014.md)、[修復交接](GAME-ENTRY-REPAIR-20261014.md)。下方紀錄保留為歷史。
<!-- /game-entry-closeout-20261014 -->



## 2026-10-12 Unscramble 原版單次獎勵（已正式部署）

正式入口：<https://gamesinclass-5d9d1.web.app/unscramble?v=20261012original1>。版本 2026.10.12-unscramble-original-solo.1，僅 Hosting 已發布。四款共用本站原版畫面、角色、動畫及音效，每題只完成一次操作，保留原版隨機結果、瞄準、靜音與略過。請重新整理教師與學生頁面以載入新前端。

新部署副本 116 項單元測試與建置通過；正式 95／95 檔（含 64 個原版素材／音效）雜湊一致，匿名師生入口六種尺寸通過，五個後端函式雜湊未變。未修改正式班級資料或 Git 提交。實體平板同步、保存、投影與教室音量仍待現場驗收。詳 [部署紀錄](DEPLOYMENT-UNSCRAMBLE-ORIGINAL-SOLO-20261012.md) 與 [正式 QA](qa/unscramble-original-production-20261012/)。下方本機段落保留為部署前歷史。


## 2026-10-12 Unscramble 原版單次獎勵（本機通過，尚未部署）

四款獎勵直接共用 Animal Basketball、Bowling、World Pup Soccer、Space Slot Machine 的原版場景、角色、動畫與音效；每題只完成一次操作，保留原版隨機結果，遊戲分數不計入英語紀錄。原版多人入口、學生重登、五次上限、CSV 與題句遮蔽均已回歸驗證。正式站尚未更新。

本機試玩：<http://127.0.0.1:5184/qa/unscramble-original-solo-20261012/preview.html>；[實作與驗證](UNSCRAMBLE-ORIGINAL-SOLO-20261012.md)、[QA 對照](qa/unscramble-original-solo-20261012/index.html)、[確認規格](rdq/RDQ-spec-unscramble-original-solo-games-20261012.md)。


## 2026-10-10 Unscramble 題句預覽與單人獎勵（已正式部署）

正式入口：<https://gamesinclass-5d9d1.web.app/unscramble?v=20261010reward1>。版本 `2026.10.10-unscramble-reward.1`，Hosting 與 `classroom-games:liveActivity` 已發布。教師展示題目時顯示圖片與既有問句／答句，開放作答後遮蔽正確句子。建立新場次可選籃球、保齡球、足球、Slot Machine 或關閉，全場使用同一款；答對每題可領取一次並可略過，舊場次維持關閉獎勵。

發布前 111 項單元測試與正式建置通過；正式 30 個 JS／CSS、版本、HTML 與字型檔雜湊一致，六種匿名師生頁面尺寸及 API 權限限制通過。其餘四個函式雜湊未變；未修改正式班級資料、規則、教師通行碼或 Git 提交。正式教師登入後的跨實體平板同步、作答保存與教室音量仍待驗收。詳 [部署紀錄](DEPLOYMENT-UNSCRAMBLE-REWARDS-20261010.md) 與 [正式 QA](qa/unscramble-rewards-production-20261010/)。下方 10 月 9 日段落保留為部署前歷史。

## 2026-10-09 Unscramble 題句預覽與單人獎勵（本機驗證，尚未部署）

教師建立場次時可為整場選擇籃球、保齡球、足球、Slot Machine 或關閉獎勵；舊場次預設關閉。題目預覽會在圖片上顯示該題問句與答句，開放作答後正確句子會從投影 DOM 移除，圖片仍保留。學生答對後每題只能領取一次所選遊戲，完整回合可略過，教師切題會立即關閉；重登、重新整理與競態請求都不能重播已領取的獎勵。

本機 Firebase 模擬器已驗證五種設定、四款遊戲、8–11 秒一般回合、減少動畫、載入失敗可略過、2–15 組相容、答案不洩漏及既有完整遊戲回歸。正式站與正式資料均未變更。詳 [RDQ 規格](rdq/RDQ-spec-unscramble-sentence-preview-solo-reward-20261009.md) 與 [QA 證據](qa/unscramble-rewards-20261009/)。

<!-- bowling-closeout-20260927 -->
## 2026-09-27 Bowling 已部署並完成載入優化

正式入口：https://gamesinclass-5d9d1.web.app/bowling 。18 張圖片由 28.2 MB 降至 0.62 MB；預載、完整後顯示、重試及快取完成。收工時最新正式整合版為 `2026.09.27-hw5u02-shuffle.1`，仍完整保留 Bowling。詳 [收工交接](CLOSEOUT-BOWLING-20260927.md) 與 [部署紀錄](DEPLOYMENT-BOWLING-20260927.md)。GitHub 尚未同步；實機音效與操作待教師驗收。


## 2026-09-21 VOCABULARY 教師批改註記（已正式部署）

正式版本 `2026.09.21-vocabulary-annotations.1`：教師左側五色筆／橡皮擦／復原只修改教師圖層，批改與分數回傳學生原作答區；可補註記但不重複加分，歷史可切換原稿與批改圖。學生 Submit 固定右上角。

正式入口：https://gamesinclass-5d9d1.web.app/vocabulary 。本機與正式驗證通過；實體平板及正式登入後同步仍待教師確認。本次尚未提交／推送 Git。詳 [部署證據](DEPLOYMENT-VOCABULARY-ANNOTATIONS-20260921.md)、[改版紀錄](VOCABULARY-ANNOTATIONS-20260921.md)、[收工交接](CLOSEOUT-VOCABULARY-ANNOTATIONS-20260921.md)。

## 2026-09-20 VOCABULARY LIVE（已正式部署）

正式入口：https://gamesinclass-5d9d1.web.app/vocabulary 。版本 `2026.09.20-vocabulary.1`，Hosting 與新後端 `vocabularyActivity` 已發布。五題 SF1 U01：Mike、Ken、Emma、Wendy、Alan；Comic Relief 三選項、五色手寫與橡皮擦、即時縮圖、筆跡重播、教師 1–5 分、累積總分、10 秒結算慶祝及歷史最終截圖。

原通行碼登入後，開啟活動並按「載入 SF1 U01 五題圖卡」。本機 92 項回歸、17 項整合及 15 組瀏覽器流程通過；正式四個檔案雜湊、三個 API 防線、三種瀏覽器尺寸通過。正式登入後跨平板作答與教室音效仍待實機驗收。詳 [部署紀錄](DEPLOYMENT-VOCABULARY-20260920.md)、[操作說明](VOCABULARY-IMPLEMENTATION-20260920.md) 及 [收工交接](CLOSEOUT-VOCABULARY-20260920.md)。下方舊版內容保留為歷史。

## 2026-09-19 Plink-oh! 歡樂落球（本機完成，未部署）

新增內建落球遊戲：2–15組、預設六回合、老師自由選組、真實碰撞加分、同裝置進度恢復。遊戲純英文，管理區英中雙語。先於本機試玩及驗收音效，正式站尚未更新。

預覽 http://127.0.0.1:5194/ ，重新啟動 `scripts/plinkoh-preview.ps1`。音效 A/B 及有聲錄影入口： http://127.0.0.1:5194/qa/plinkoh-20260919/index.html 。詳 [本機交付](PLINKOH-IMPLEMENTATION-20260919.md) 與 [參考差異](qa/plinkoh-20260919/reference-gap.md)。候選音效仍待教師聽辨，不宣稱已完整復刻原版聲音。


## 2026-09-15 Spin 載入修復整合版（已正式部署）

版本 2026.09.15-fastload.1：保留原 GIF、MP4 播放副本縮小約 74.5%、開始僅等待必要素材、下載進度與逾時重試、自由選組及句子重組最新版整合。61 項測試通過，17／17 項正式檔案雜湊一致。詳 [修復交接](SPIN-FASTLOAD-20260915.md) 與 [正式部署紀錄](DEPLOYMENT-20260915.md)。

## 2026-09-15 Spin 改版（已正式部署）

八個 GIF 動作區置中放大、每回合老師自由選組且每組一次、大轉盤置中與六秒完整旋轉音效已完成。本機預覽 http://127.0.0.1:5192/ ，啟動 scripts/spin-preview.ps1。60 項測試、六組六回合、五種尺寸與聲音訊號檢查通過。已正式部署；首頁與新版 JS/CSS 雜湊一致、八個 GIF 可存取，大型媒體全量下載核對逾時。詳 [部署紀錄](DEPLOYMENT-SPIN-20260915.md) 與 [交付紀錄](SPIN-REFRESH-20260915.md)。

## 2026-09-15 句子重組多巴胺改版（已正式部署）

已完成大圖60/40、十組卡片放大學號與正確答案、學生35/65與字卡放大、Next浮動、師生背景聲及獨立音量。57程式測試、16十組流程及六種版面尺寸驗證通過。已依教師確認部署至正式站，包含右鍵／⋯刪除活動紀錄；教師可重新整理正式頁面使用。

本地 http://127.0.0.1:5184/unscramble ，開啟「本地新版｜請從這場預覽」。詳細操作、截圖、試聽與限制見 [本地交付](UNSCRAMBLE-DOPAMINE-20260915.md)。

## 2026-09-15 句子重組即時活動（已正式部署）

已部署 Hosting 與新增 liveActivity 至 gamesinclass-5d9d1。57／57 線上檔案雜湊一致，教師登入頁、學生加入頁與 API 權限檢查通過。

正式入口：https://gamesinclass-5d9d1.web.app/unscramble 。教師使用原通行碼登入，按「載入七題家人題組」，再建立 2–10 組場次。題組可保存、複製及換圖；每個班級另建場次保存紀錄。實體平板同步、正式登入後的紀錄保存及教室音效仍待教師驗收。

詳 [部署紀錄](DEPLOYMENT-20260915.md)、[本地交付紀錄](UNSCRAMBLE-IMPLEMENTATION-20260915.md) 與 `rdq/RDQ-spec-live-unscramble-20260915.md`。本地預覽 http://127.0.0.1:5184/unscramble ，啟動 `scripts/unscramble-preview.ps1`。
## 2026-09-19 句子重組重登與 15 組（已正式部署）

正式版本 `2026.09.19-unscramble-rejoin.3` 將新場次範圍擴充為 2–15 組。教師可解除單一組別的登入，讓完全相同的組員接回原組、作答次數與歷次紀錄；每次接回會建立新的登入憑證，先前各代登入與加入請求持續失效。Hosting 與 `classroom-games:liveActivity` 已部署，未變更正式題組資料、Firestore／Storage 規則或 `teacherLogin`。詳 [正式部署紀錄](DEPLOYMENT-UNSCRAMBLE-REJOIN-20260919.md)。

## 2026-09-13 動物投籃（已正式部署）

新增 Animal Basketball：2–6 組、六種動物、老師每回合自由選組且每組一次、動態真實機率、追加回合保留分數。內建 Image 繪製六角色共 24 姿勢。50 項測試及建置通過，六組五回合完整流程已驗證。

試玩：http://127.0.0.1:5183/ 。啟動：`scripts/basketball-preview.ps1`。完整規則、原片差異及未驗收項目見 [實作紀錄](BASKETBALL-IMPLEMENTATION-20260913.md)。正式站：https://gamesinclass-5d9d1.web.app 。本次 Hosting 已發布，57／57 線上檔案雜湊一致，登入頁正常。包含角色待機晃動、球場現場合成聲及延長至 6.6 秒的結算音效。詳 [部署紀錄](DEPLOYMENT-20260913.md)。實體觸控與教室聽感待教師驗收。

## 2026-09-12 新增轉盤遊戲（已正式部署）

正式站：https://gamesinclass-5d9d1.web.app 。本次Hosting發布成功，49/49檔案線上雜湊一致，正式登入頁正常；沿用原六碼通行碼。完整紀錄：`DEPLOYMENT-20260912.md`。

同日追加：八個 GIF 已置中放大約 22%，按鈕移至右下方，正式更新後 49/49 檔案雜湊一致。已改用Comic Relief與多巴胺配色、放大各組分數，問答加入固定美式0.8倍速朗讀；否定答句不朗讀空格答案。詳 `SPIN-REDESIGN-20260912.md`。

五年級 HWG5 Unit One：**Spin, ask, answer, do and roll**。2–6組、六回合、6秒中心轉針、星期問答、8個不提前重複的動作GIF、3D骰子加分、提前結束與8秒慶祝。

本機預覽：http://127.0.0.1:5182/ ，在首頁選同名遊戲。重新啟動：`scripts/spin-preview.ps1`。30項測試、正式建置及完整瀏覽器流程通過，詳 `SPIN-IMPLEMENTATION-20260912.md` 與 `qa/spin-20260912/`。下方9月10日內容保留作歷史紀錄；最新正式版本以本節與9月12日部署紀錄為準。

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


### 2026-09-15 句子重組圖片優化已上線

版本 `2026.09.15-unscramble-images.2`：上傳自動 WebP／480px 縮圖、私人記憶體快取、容量比較、原圖及题組備份。正式兩組共 14 張圖片已更新，重新整理後圖片正常；原九組七題的顯示紀錄前後一致。另修正大原圖下載 20 秒逾時被誤報解碼錯誤，圖片傳輸改為 60 秒。

詳細容量、備份編號及驗證範圍見 `UNSCRAMBLE-IMAGE-FASTLOAD-20260915.md` 與 `DEPLOYMENT-20260915.md`。

## 2026-09-19 Plink-oh! Power-ups + Winner（本機）
已新增六張三選一卡牌、每組三次額度、Second Chance 雙球刷新恢復、五秒慶祝音效及動畫。舊局沿用原規則，新局啟用卡牌。詳見 [改版交付](PLINKOH-POWERUPS-IMPLEMENTATION-20260919.md) 與 [QA 檢視](qa/plinkoh-powerups-20260919/index.html)。未部署。

## 2026-09-19 Plink-oh! 六卡插畫已正式發布
版本 `2026.09.19-plinkoh-cards.1` 已依明確授權發布至 [正式站](https://gamesinclass-5d9d1.web.app/)。六張 SVG 改為具體遊戲動作與得分結果插畫；包含先前完成的卡牌功能及五秒 Winner。詳見 [發布紀錄](DEPLOYMENT-PLINKOH-CARDS-20260919.md) 與 [六卡圖像總覽](qa/plinkoh-card-art-20260919/index.html)。

## 2026-09-27 Bowling Game（本機試玩）

首頁已加入歡樂保齡球，支援 2–8 組、預設 6 回合、老師自由選組、逐瓶計分、六張 Power-up、同裝置恢復與五秒 Winner。已依教師選擇，以影片處理音效 B 為主，其餘使用補製版 C。執行 `powershell -NoProfile -File scripts/bowling-preview.ps1` 後開啟 <http://127.0.0.1:5197/bowling>。規則、來源差異、音效對照和測試結果見 [保齡球本機交付](BOWLING-IMPLEMENTATION-20260927.md)。尚未正式部署。
