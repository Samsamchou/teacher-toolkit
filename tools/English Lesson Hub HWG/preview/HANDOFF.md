# English Lesson Hub V03 — Results 通行碼部署交接

## 已上線

- Firebase 專案：`hwg7teaching`
- 指定網站：<https://lesson-hub-v03.web.app>
- 發布範圍：`lesson-hub-v03` Hosting、Firestore 規則，以及 `teacher-access` 的 5 個 callable Functions。
- 已建立／更新功能：`teacherPasscodeLogin`、`teacherPasscodeLogout`、`teacherResultsList`、`teacherResultsRecordExport`、`teacherResultsDelete`（皆為 `asia-east1`、Node.js 22）。

## 教師成績使用方式

1. 開啟 Results，按「登入」。
2. 在同一頁輸入教師共用通行碼。
3. 通過後可看成績、匯出 CSV／JSON；必須成功匯出，且再次確認，才可刪除這批結果。
4. 重整或關閉瀏覽器後必須再次輸入通行碼。

## 安全範圍

- 不使用 Google 教師登入、Teacher Claim、自訂 Token 或額外教師 IAM 角色。
- 通行碼只在伺服器端既有 Secret 比對；專案、前端與此交接檔皆不保存其值。
- 學生保有 Firebase Anonymous Authentication；Firestore 不允許瀏覽器直接列出、更新或刪除作答結果。
- 連續 5 次錯誤會鎖定 15 分鐘。
- 伺服器只存匿名 Student ID；教師工作階段只在目前瀏覽器記憶體中保存。

## 已驗證

- 題庫／網站資料驗證：books 2、units 10、lessons 50、Type A 10、Type B 8。
- 後端安全測試：6 項通過。
- 前端／規則測試：24 項前端測試及 3 項 Firestore Emulator 規則測試通過。
- Firebase 成功部署 5 個 Results Functions，公開網站回應 HTTP 200，並且資產清單與本次建置一致。

## 尚需教師現場驗收

1. 輸入正確教師共用通行碼，確認 Results 可載入。
2. 輸入錯誤通行碼，確認顯示拒絕訊息；不要連續測試超過 5 次。
3. 匯出一筆測試資料後，確認刪除前有第二次確認，並確認匯出檔保留。
4. 用學生 iPad Safari 完成匿名作答與 QR Code 流程。

## 已知但不影響上線的項目

- Firebase 提示尚未設定 Artifact Registry 映像清理政策。我沒有自動啟用可能移除舊映像的設定；這不影響目前網站或 Functions。
- 本機瀏覽器自動化因 Windows sandbox helper 錯誤無法截圖；已完成程式、建置與公開網址驗證，但尚未替代教師實機驗收。
## 2026-08-18 教師投影工具更新

- 已只發布 Firebase Hosting site `lesson-hub-v03`；沒有更新 Cloud Functions、Firestore 規則、Firebase Secret 或預設 Hosting。
- 教師 Lesson 現在以左側小圖示收納抽籤、倒數與畫筆，且同時僅開啟一個面板；Lesson Flow 預設收合，主內容使用更大的投影範圍。
- 抽籤固定使用 01–30、同一輪不重複，按「抽一位」後維持 4 秒亂數動畫與 Safari-safe Web Audio；可重新開始。
- 畫筆支援自由線、直線、長方形、圓形、橡皮擦、顏色、粗細、清除與 PNG 匯出。自有頁面可匯出完整畫面；Wayground iframe 只匯出教師標註與課程標題。
- 本機 preflight 通過：題庫資料、教師通行碼安全檢查、26 項前端測試、6 項 Functions 測試、Firestore Emulator 3 項規則測試、正式建置與 Firebase preflight。
- 公開網址 <https://lesson-hub-v03.web.app> 回應 HTTP 200，並與本次建置資產清單一致。

### 仍需教師實機驗收

1. 用桌機投影或 1920×1080 螢幕確認收合 Lesson Flow 與 Wayground 可讀性。
2. 用 iPad Safari 點選抽籤，確認 4 秒音效、抽籤不重複、畫筆圖形與 PNG 下載。
3. Wayground 頁面確認 PNG 僅有教師標註與課程標題，外部 iframe 像素不會被擷取。

本機瀏覽器視覺自動化因 Windows sandbox helper 無法連線，未把它視為實機或視覺驗收通過。

## 2026-08-18 Starter、Teacher Studio 與警報音效更新

- 已再次僅發布 Firebase Hosting site `lesson-hub-v03`；本次沒有部署或改寫 Cloud Functions、Firestore 規則、索引、Secret 或預設 Hosting。
- 目前預設結構為 HWG5／HWG7 各 1 個 Starter（Lesson 1–3）與 4 個 Unit（各 Lesson 1–5），合計 10 個單元、46 節標準 Lesson。
- 舊的本機 Starter Lesson 4／5 設定會移除；Firestore 的歷史匿名作答紀錄不會被刪除。
- Teacher Studio 的單元預設收合，且一次只展開一個；Lesson 文字進入 Edit Lesson，右側 ▶ 開始上課，Duplicate／Reset 改收進「更多」選單。色票仍作為視覺區分，但不顯示 Pink Punch、Fuchsia Flash、Electric Blue 等名稱文字。
- 畫筆面板縮為約 122px 的雙欄圖示側欄；保留手繪、直線、長方形、圓形、橡皮擦、顏色、粗細、清除與 PNG 匯出。標註仍只留在目前頁面與瀏覽器工作階段。
- 倒數歸零會以雙振盪器警報持續 6 秒；全站音效關閉、重設、調整時間或離開工具時都會停止或保持靜音。

### 本次驗證與發布

- 隔離建置副本通過資料驗證：books 2、units 10、lessons 46、Type A 10、Type B 8。
- 30 項前端自動測試、教師存取安全連線檢查、初始安全閘門、Firestore 規則回歸指令與 Vite 正式建置皆已完成且通過。
- 已發布 40 個 Hosting 靜態檔案；公開首頁與新版 JavaScript 資產均回應 HTTP 200，並確認已包含緊湊畫筆工具標記。
- 此版本當時尚未接上 Firebase 公開 Web App 組態；後續「正式 Firebase 執行期連線」更新已改由 Hosting 保留端點提供，不在專案保存 API key。

### 仍需教師實機驗收

1. 桌機投影確認 Teacher Studio 的單元收合、Lesson Edit 與開始按鈕操作。
2. 實體 iPad Safari 在已開啟音效下測試倒數歸零的 6 秒警報；關閉全站音效後確認警報靜音。
3. Firebase 公開組態已由後續正式連線更新完成；請依下一節完成 Results 匯出與精確刪除驗收。

## 2026-08-18 正式 Firebase 執行期連線（驗收完成）

- 正式站已改由 Firebase Hosting 官方保留端點 `/__/firebase/init.json` 載入公開組態，並拒絕非 `hwg7teaching` 的組態；專案、終端輸出與 Git 均未保存 API key。
- 只重新部署 Hosting `lesson-hub-v03`，共 41 個檔案；目前資產為 `/assets/index-CgcR3ydO.js`，部署前資產為 `/assets/index-CWoje4j2.js`。Functions、Firestore 規則、Secret 與預設 Hosting 未變更。
- 完整 preflight 通過：33 項前端測試、6 項 Functions 測試、3 項 Firestore 規則測試、正式建置與 Firebase preflight。
- 正式 Anonymous Auth 已用 Student ID `69930` 與唯一 Session `codex-formal-69930-1787042041070-e809edbe` 驗證：建立、擁有者讀回成功；第二個匿名使用者讀取與列表均被拒絕。
- 教師本人已確認正確登入 Results、CSV 與 JSON 均成功下載、只刪除 1 筆測試資料，且重新整理後回到登入入口；`wrongPasscodeBlocked`、`resultsSessionVerified`、`exportDeleteVerified` 均有實際證據。
- App Check 依確認規格維持未強制，不能描述為完全強化環境。

## 2026-08-18 HWG7 Unit 1 Lesson 1 Vocabulary Quiz 更新（已發布）

- 本次只部署 Firebase Hosting site `lesson-hub-v03`，共 41 個靜態檔案；Cloud Functions、Firestore 規則、索引、Secret 與預設 Hosting 均未變更。

- HWG7 Unit 1 Lesson 1 的 Type B 第 4 題已改用本機 TTS 產生的 `Singapore` 音檔。原始教材 `4. Sinagapore.mp3` 保留不覆寫；正式網站資產改為 `/assets/hwg7-u01/audio/4-singapore.mp3`。
- 題庫同步為 r3 JSON 與 Markdown 審核稿，並與網站執行期題庫一致。Vocabulary Quiz 套用多巴胺配色；答對使用三音上行提示音。
- Student ID 現支援 `50101`、`50201`、`60201` 等格式並僅儲存匿名 ID。完成畫面會以最大字級顯示 ID、播放 10 秒慶祝音效及顯示慶祝動畫；全站音效關閉時維持靜音。

### 本次發布驗證

- 完整 preflight 通過：題庫資料、教師通行碼安全檢查、36 項前端測試、6 項 Functions 測試、3 項 Firestore Emulator 規則測試、正式建置與 Firebase preflight。
- 公開首頁與新版程式 `/assets/index--WYWvVPj.js` 回應 HTTP 200。
- 公開 Singapore 音檔回應 HTTP 200，SHA-256 為 `44d8159ec1303f47fa4a73d304077ac0f42568ff342ee4a9973e81f3036f2`，與已驗證建置相同。

### 仍需教師實機驗收

1. 用學生 iPad Safari 輸入 Student ID、完成一次 Type A／Type B，確認選項打散、答對音效與完成慶祝效果。
2. 在全站音效關閉後完成一次測驗，確認答對及完成音效皆維持靜音。

本機瀏覽器視覺自動化仍受 Windows sandbox helper 限制，未將它或實體 iPad Safari 視為已完成的視覺驗收。

### 雜湊更正

- 上述發布驗證的正確 Singapore 音檔 SHA-256 為 `44d8159ec1303f47fa4a73d304077ac0f42568ff342ee4a9973e81f3032776f2`；前一行有人工抄寫筆誤，請以本行為準。

## 2026-08-18 教師投影全螢幕 Lesson Flow（已發布）


- 依已確認 RDQ 規格，教師模式隱藏 English Lesson Hub 全站橫幅，Lesson Flow 以 1920×1080／16:9 的單一瀏覽器視窗高度呈現。
- Live Interactive Practice iframe 填滿教學舞台，新增全螢幕按鈕，並支援 F 快捷鍵；Wayground 等外部平台若自行需要捲動，保留其 iframe 內部捲軸。
- Previous／Next 教學控制列縮為底部喚回列；游標移至底部或鍵盤 Tab 聚焦時才展開。方向鍵可切換 Lesson Flow。
- 圖片、影片、電子書啟動頁與圖片投影片改為優先使用完整舞台，不裁切內容；Teacher Studio 與 Results 管理介面未調整。
- 本次只重新部署 Firebase Hosting `lesson-hub-v03`；Cloud Functions、Firestore 規則、索引、Secret 與預設 Hosting 未變更。

### 本次驗證

- 隔離副本完整 preflight 通過：題庫資料、安全檢查、38 項前端測試、6 項 Functions 測試、3 項 Firestore Emulator 規則測試、正式建置與 Firebase preflight。
- 最終公開資產 `/assets/index-DcrUNvDc.js` 與 `/assets/index-B6px5GUc.css` 均回應 HTTP 200；CSS 已核對含有 `100dvh` 與全螢幕舞台規則。
- 本機視覺自動化仍被 Windows sandbox helper 阻擋，未將截圖、投影機實機或 iPad Safari 視為已驗收。

### 教師現場確認

1. 在筆電接投影機的 1920×1080 畫面開啟任一 Lesson，確認 Lesson Hub 外層沒有上下捲動。
2. 進入 Live Interactive Practice，確認 iframe 填滿舞台、底部控制列會收合，並測試方向鍵與 F。

## 2026-08-18 Quiz 直式圖、QR 與 Word Master Monster（已發布）

- 圖片投影片改為完整置中顯示；直式圖以 `object-fit: contain` 保留比例，不裁切、不拉伸，教師投影舞台會把剩餘空間留給背景。
- Vocabulary Quiz 入口移除匿名資料與計分規則說明；欄位改為「輸入學號」，Start Vocabulary Quiz 保持最大字級。
- 教師模式的 Quiz 入口右上新增「掃碼開始 Quiz」QR；掃描後只帶入 `mode`、`book`、`unit`、`lesson`，直接開啟同一節的學生作答入口。
- 新增透明背景、1:1 的 3D Q 版 Word Master Monster，共用於 Quiz 入口、答題與完成畫面；系統減少動態時保持靜止。
- 本次只部署 Firebase Hosting `lesson-hub-v03`；Cloud Functions、Firestore 規則、索引、Secret 與預設 Hosting 未變更。

### 本次驗證

- 隔離副本完整 preflight 通過：40 項前端測試、6 項 Functions 測試、3 項 Firestore Emulator 規則測試、正式建置與 Firebase preflight。
- 正式首頁、學生 QR 入口與 `/assets/mascots/word-master-monster-v1.png` 均回應 HTTP 200；角色素材為 1254×1254 RGBA PNG，SHA-256 `FCB736886F97BA7FD72C3073FA250C32EF42389457180980FEDE8766705C663C`。
- 本機視覺自動化仍被 Windows sandbox helper 阻擋，未將實體投影機或學生裝置視覺效果列為已驗收。

### 教師現場確認

1. 在 1920×1080 投影畫面檢查直式投影片四邊完整可見。
2. 在教師 Quiz 入口掃 QR，確認學生裝置直接開啟 HWG7 Unit 1 Lesson 1 的作答頁。
3. 在系統「減少動態」設定下重新開啟 Quiz，確認角色不再跳動。

## 2026-08-19 教師媒體重新驗證（已發布）

- 教師 MP4／PDF 上傳遇到 `storage/unauthorized` 時，介面會保留已選檔案、要求重新輸入通行碼，成功後只自動重試一次。
- 重試流程強制建立新的 Results／媒體授權工作階段；原始 Firebase 英文錯誤與 Storage 路徑不會顯示給教師。
- 已正式發布 Hosting `lesson-hub-v03`；公開首頁回應 HTTP 200，資產為 `/assets/index-7MQDeMer.js`，並已讀回強制重新驗證、重試與中文提示標記。學生 Quiz 入口仍回應 HTTP 200。
- 本次嘗試重新發布 Functions 時，Firebase 在載入使用者程式碼的 10 秒檢查逾時；本次修補沒有更動 Functions 原始碼，先前已發布的五個 `teacher-access` callable Functions 均仍存在於 `asia-east1`。
- 隔離副本通過：48 項前端測試、6 項 Functions 測試、3 項 Firestore Emulator 規則測試、Firebase preflight、教師通行碼正式閘門與 Vite 正式建置。

### 仍需教師實機驗收

1. 在 Teacher Studio 選一個小型 MP4；若看到通行碼欄位，輸入教師通行碼後確認檔案會自動重試並上傳。
2. 以小型 PDF 重複一次，按 Save Lesson 後確認 Lesson Flow 可開啟第一頁與全螢幕。
3. 若仍失敗，保留新的中文提示截圖；不要貼出通行碼。

## 2026-08-19 教師媒體授權確認（已發布）

- `teacherPasscodeLogin` 會在建立匿名媒體授權紀錄後回傳明確的媒體授權成功資訊；Teacher Studio 只有收到此確認才顯示 MP4／PDF 選檔。
- 尚未確認時顯示紅色「上傳授權仍未建立」提示；成功後顯示綠色「媒體上傳已解鎖，可選擇檔案。」。不再保留先選檔後自動重試的流程。
- 已正式發布 Firebase Hosting `lesson-hub-v03` 與既有的 `teacherPasscodeLogin`（`teacher-access`、`asia-east1`）；Storage／Firestore 規則、Secret 與其他 Functions 未變更。
- 正式首頁回應 HTTP 200，已讀回新版資產 `/assets/index-DkkEIeZg.js`，其中包含紅色授權提示與成功解鎖文字。Function 雲端狀態為 `ACTIVE`；未帶匿名 Auth 的標準 callable 請求回應 HTTP 401。
- 隔離副本完整 preflight 通過：48 項網站測試、6 項 Functions 測試、3 項 Firestore Emulator 規則測試、正式建置、Firebase preflight 與教師通行碼正式閘門。

### 仍需教師實機驗收

1. 在 Teacher Studio 輸入教師通行碼；成功後確認才出現「選擇檔案」。
2. 上傳小型 MP4，再上傳小型 PDF；兩者都應能在按 Save Lesson 後於 Lesson Flow 使用。
3. 若出現紅色提示，請保留截圖但不要貼出通行碼。

## 2026-08-19 教師媒體直接上傳與 HWG7 U1 L1 影片（已發布）

- Teacher Studio 的 MP4／PDF 現在不再要求教師通行碼；正式 Firebase 站會先建立匿名 Firebase Auth，再直接顯示「選擇檔案」。Results 的六位數通行碼、伺服器端 Secret、匯出與刪除流程維持不變。
- Firebase Storage 已發布直接匿名上傳規則：僅固定 `teacher-media/{lessonId}/{video|presentation}/{fileName}` 路徑、MP4／PDF MIME、單檔 500 MB；瀏覽器不能列出檔案。任何已知教材路徑仍須匿名 Firebase Auth 才能讀取。
- 已以 `C:\firebase-deploy\shortsaboutsentences\outputs\HWG7 U01 Clips\08_final\final_classroom_64s_APPROVED.mp4` 正式匿名上傳至 HWG7 Unit 1 Lesson 1，雲端讀回為 20,405,839 bytes、`video/mp4`；Range 播放讀取回應 HTTP 206。
- HWG7 Unit 1 Lesson 1 的正式範本只保存 Storage 路徑與檔案中繼資料，不保存下載憑證。Lesson Flow 會在匿名 Firebase 工作階段中即時取得播放網址；既有瀏覽器的舊下載網址會在遷移時移除。
- 已發布 Storage 規則、Hosting `lesson-hub-v03`（最終公開資產 `/assets/index-BmaCPKcw.js`）與 `teacherPasscodeLogin`／`teacherPasscodeLogout`。兩個 Functions 均確認 `ACTIVE`；未帶匿名 Auth 的 Results callable 請求回應 HTTP 401。

### 本次驗證

- 隔離副本通過 49 項網站測試、Vite 正式建置與 Firebase preflight；包含直接匿名媒體上傳、500 MB／MIME／路徑限制、Results 通行碼隔離與不寫入下載憑證的測試。
- 正式首頁回應 HTTP 200，最終 bundle 含 HWG7 U1 L1 影片路徑，且不含已發布的影片下載憑證。
- Firebase Storage 規則已由服務端編譯並發布；指定影片已用正式匿名 Auth 建立、讀回與 Range 播放驗證。

### 仍需教師實機驗收

1. 在 [正式站](https://lesson-hub-v03.web.app) 開啟 Teacher Studio → HWG7 → Unit 1 → Lesson 1，確認 Teaching Video 直接出現「選擇檔案」，沒有通行碼欄位。
2. 開啟 Lesson Flow 的 Teaching Video，確認指定影片能在實際投影瀏覽器播放；再自行上傳一個小型 MP4 與 PDF，確認兩種教材都可儲存並使用。

本機瀏覽器自動化連線受 Windows sandbox helper 限制，未將實體投影瀏覽器的畫面與音訊列為已完成的視覺驗收。

## 2026-08-19 Teaching Video 外置控制列（程式與測試完成，未部署）

- 已確認 RDQ 規格卡：`rdq/RDQ-spec-external-video-controls-20260819.md`。
- 所有 Teaching Video 改用外置控制列；原生影片控制列不再覆蓋已燒錄在影片底部的字幕。
- 控制列包含播放／暫停、前後 5 秒、進度、時間、音量／靜音與全螢幕；播放時淡化、暫停時清楚顯示。
- Space 與左右鍵只在影片畫面取得焦點時操作影片，避免干擾 Lesson Flow 快捷鍵。
- 隔離驗證副本通過 51 項網站測試與 Vite 正式建置；未部署 Firebase Hosting。
- 原工作副本的 `node_modules/firebase/package.json` 為 0 位元組，完整驗證改在隔離副本重建依賴後完成，未修改原專案依賴。
- 下一步：取得教師明確部署授權後，才可發布 Hosting 並進行投影瀏覽器實機驗收。

## 2026-08-19 Teaching Video 外置控制列（已部署）

- 已只發布 Firebase Hosting target `lesson-hub-v03`；未發布 Functions、Firestore 規則或 Storage 規則。
- 隔離副本完整 preflight 通過：資料驗證、51 項網站測試、6 項 Functions 測試、3 項 Firestore 規則測試、正式建置、Firebase preflight 與教師 Results 正式安全閘門。
- Firebase 發布完成，共 42 個靜態檔案；正式網址為 <https://lesson-hub-v03.web.app>。
- 正式首頁與 `/assets/index-pKxsUCb7.js` 均回應 HTTP 200；已讀回外置控制列、全螢幕與影片鍵盤操作標記。
- 仍需教師在實際投影瀏覽器暫停一段有底部字幕的影片，確認字幕完整可讀及全螢幕操作符合教室需求。

## 2026-08-19 Teaching Video 完整比例（程式與測試完成，未部署）

- 已確認 RDQ 規格卡：`rdq/RDQ-spec-video-full-frame-20260819.md`。
- 影片會讀取實際 `videoWidth`／`videoHeight`，並依可用舞台尺寸等比例完整置中；16:9、直式與超寬來源都不裁切，周圍保留深色留白。
- 一般 Lesson Flow、投影模式與全螢幕都改用相同完整比例規則；外置控制列維持在影片框之外，不會覆蓋燒錄字幕。
- 隔離測試副本通過 52 項網站測試與 Vite 正式建置；比例測試包含 16:9、直式、超寬與無效舞台尺寸。
- 未部署 Firebase Hosting、Functions、Firestore 或 Storage 規則。

### 教師現場確認（部署後）

1. 暫停一段字幕位於下緣的影片，確認字幕與影片下緣均完整可見。
2. 點選全螢幕，再確認影片完整、深色留白正常，控制列不遮住字幕。
3. 以一支直式與一支超寬影片重複測試。
## 2026-08-19 Teaching Video 完整比例（已部署）

- 已只發布 Firebase Hosting target `lesson-hub-v03`；未發布 Functions、Firestore 規則、Storage 規則或成績資料。
- Firebase 共發布 42 個靜態檔案，正式網址為 <https://lesson-hub-v03.web.app>。
- 發布前隔離副本通過 52 項網站測試、Vite 正式建置、Results 正式安全閘門與 Firebase preflight。
- 正式首頁、`/assets/index-BpWGERu-.js` 與 `/assets/index-HPtMyVgC.css` 均讀回 HTTP 200；JS 含 `ResizeObserver`，CSS 含完整比例舞台規則。
- 仍需教師以投影瀏覽器暫停含底部字幕的影片，並在全螢幕、直式、超寬來源各確認一次實際畫面。
## 2026-08-20 Image Slides 與 Teacher Studio 雲端同步（已部署）

- Image Slides 移除投影模式的零高度與隱藏裁切規則；圖片採原始尺寸、`object-fit: contain`、完整置中。直式、橫式與小尺寸圖片均不裁切、不拉伸，小圖不強制放大。
- Teacher Studio 新增「雲端教材」控制：以既有六位數教師通行碼建立短期工作階段後，透過受控 Functions 讀取／保存全部 46 節預設 Lesson 與 Custom Lessons。Firestore 瀏覽器直接讀寫 `teacherLessonConfigs` 一律拒絕。
- 第一次雲端啟用不會自動上傳：必須在保有最新設定的一般 Chrome 確認「匯入目前 Lesson 至雲端」，避免無痕視窗的預設 7 Steps 覆蓋既有 14 Steps。
- 雲端設定含遞增版本；兩台筆電同時編輯時，舊版本儲存會被拒絕，介面要求先「載入雲端最新版」。只有 Firebase 成功回覆後才顯示已儲存至雲端；Local Storage 保留為離線備援。
- 隔離副本已通過：54 項網站測試、6 項 Functions 測試、Functions 語法檢查、Vite 正式建置、Firestore 規則測試與 Firebase preflight。
- 已正式發布 Hosting target `lesson-hub-v03`、Functions codebase `teacher-access` 與 Firestore 規則；未發布預設 Hosting、Storage 規則，也未修改或刪除匿名成績資料。
- 正式網址為 <https://lesson-hub-v03.web.app>；首頁回應 HTTP 200，線上資產為 `/assets/index-CF6ZLgXV.js` 與 `/assets/index-D90zSz78.css`。
- 雲端已列出 7 個 Node.js 22 Functions，其中 `teacherLessonConfigLoad` 與 `teacherLessonConfigSave` 為本次新建，其餘 5 個既有教師 Results／通行碼 Functions 均保留並更新成功。
- 線上 JavaScript 已讀回雲端載入、雲端儲存、首次匯入與版本衝突保護標記；線上 CSS 已讀回 `object-fit: contain` 與 `overflow: visible` 的 Image Slides 完整顯示規則。
- Firebase CLI 提示 asia-east1 尚未設定舊容器映像自動清理政策；本次未擅自新增或刪除 Artifact Registry 映像政策，不影響目前網站與 Functions 運作。

### 部署後教師驗收順序

1. 在目前一般 Chrome 確認 **HWG7 Unit 1 Lesson 1** 仍為 **14 Steps**，解鎖雲端教材後按「匯入目前 Lesson 至雲端」。
2. 在無痕視窗輸入教師通行碼，載入雲端教材，確認同一 Lesson 為 14 Steps。
3. 在另一台筆電重複第 2 步；再以兩台裝置製造一次版本衝突，確認舊畫面被要求重新載入。
4. 投影環境測試直式、橫式與小尺寸 Image Slides，確認四邊完整可見且不被裁切。

## 2026-08-20 Image Slides 一次性教師解鎖（已部署）

- 已確認 RDQ 規格卡：`rdq/RDQ-spec-image-slides-upload-permission-20260820.md`。
- Image Slides 不再顯示教師通行碼欄位；未解鎖時提供「開啟教師解鎖頁」與「重新檢查授權」。教師解鎖頁會在新分頁開啟，原 Lesson Editor 草稿不會因導頁消失。
- Results 驗證教師通行碼後才可建立一次性連結。連結有效 10 分鐘且只能兌換一次；伺服器只保存權杖 SHA-256，不保存原始權杖。兌換後把短期 `lessonHubTeacherMediaExpiresAt` claim 綁定到該匿名 Auth。
- Image Slides 圖片上傳與刪除只接受有效短期 claim；遇到授權失效會重新整理 token 並自動重試一次。學生匿名 Auth 只能讀取已知圖片路徑，不能上傳、刪除或列出圖片。
- 已移除舊的 `teacherMediaGrant` 長時授權 Function 與前端入口，避免繞過一次性連結。MP4／PDF 既有直接匿名上傳流程未變更。
- 錯誤提示已區分未解鎖、已過期、Storage 規則拒絕與網路中斷，且不顯示 Firebase Storage 原始路徑。

### 本次驗證與正式發布

- 乾淨隔離副本完整 preflight 通過：55 項網站測試、6 項 Functions 測試、7 項 Firestore／Storage Emulator 規則測試、Functions 語法、Vite 正式建置與 Firebase preflight。
- 已正式發布 Hosting `lesson-hub-v03`、Functions codebase `teacher-access`、Firestore 規則與 Storage 規則；未修改或刪除匿名成績資料。
- 正式站 <https://lesson-hub-v03.web.app>、JavaScript 與 CSS 資產均回應 HTTP 200；Firebase runtime project 為 `hwg7teaching`。
- 雲端共有 9 個 Node.js 22 教師 Functions，全部為 `ACTIVE`；`teacherMediaUnlockCreate`／`teacherMediaUnlockRedeem` 已新建，舊 `teacherMediaGrant` 已刪除。
- 未登入呼叫兩個解鎖 Functions 均回 HTTP 401 `UNAUTHENTICATED`；臨時匿名學生呼叫建立解鎖及偽造兌換均回 HTTP 403 `PERMISSION_DENIED`，測試匿名帳號隨即刪除。
- Windows sandbox helper 仍阻擋自動瀏覽器畫面驗收；不把教師通行碼登入、實際選圖與跨裝置畫面視為已驗收。

### 教師實機驗收順序

1. 在正式站進入任一 Image Slides 編輯區，確認沒有通行碼欄位，且顯示「需要教師解鎖」。
2. 按「開啟教師解鎖頁」，由教師本人登入 Results；建立並按下「在此分頁啟用圖片上傳」。
3. 回到原 Lesson Editor 分頁，確認自動顯示解鎖截止時間，再選取一張小型 JPG／PNG、上傳並按 Save Lesson。
4. 以無痕視窗或另一台筆電載入同一節 Lesson，確認圖片可讀；若要在該裝置上傳，必須另外建立並兌換新的單次連結。
5. 以學生模式確認圖片可見，但沒有上傳、刪除或列出圖片的操作。


## 2026-08-20 Image Slides 直接匿名上傳（已部署）

- 已確認 RDQ 規格卡：`rdq/RDQ-spec-image-slides-direct-upload-20260820.md`；採用 1A／2B／3A 與建議 ①②③④⑤。
- Image Slides 現在與既有 MP4／PDF 一樣，先建立 Firebase Anonymous Auth 後直接選檔上傳；不顯示通行碼、不開啟解鎖連結，也不依賴教師 custom claim。
- 教師從 Lesson 移除或替換圖片時只解除課程引用，不從 Firebase Storage 刪除雲端原檔。介面會明確提示「雲端原檔保留」。
- Storage 僅允許匿名使用者在固定 `teacher-image-slides/{lessonId}/{randomFileName}` 路徑新增 PNG／JPG／WebP，單檔上限 20 MB；不能列出、覆寫或刪除。已知路徑仍需 Anonymous Auth 才能讀取。
- 已移除前端一次性解鎖介面、`teacherMediaUnlockCreate`／`teacherMediaUnlockRedeem` Functions、Firestore 解鎖紀錄規則與 Storage claim 檢查。教師 Results 六位數通行碼、Lesson 雲端同步、匿名 Quiz 成績與 MP4／PDF 直接上傳流程均保留。
- 本方案接受已確認的風險：技術能力足夠的匿名使用者若自行組合合法 Storage API 請求，仍可能新增符合路徑、格式與大小限制的圖片；但不能列目錄、覆寫或刪除既有圖片。

### 本次測試與正式發布

- 乾淨隔離副本通過：54 項網站測試、6 項 Functions 測試、7 項 Firestore／Storage Emulator 規則測試、Functions 語法、正式 Vite 建置、教師 Results 安全檢查與 Firebase preflight。
- 已正式發布 Hosting `lesson-hub-v03`（42 個檔案）、Functions codebase `teacher-access`、Firestore 規則與 Storage 規則；未修改或刪除匿名成績資料。
- Functions 探測因本機 Firebase CLI 預設 10 秒限制曾逾時；以 CLI 支援的 `FUNCTIONS_DISCOVERY_TIMEOUT=60` 完成部署。正式雲端只剩 7 個 Node.js 22 Functions；兩個舊圖片解鎖 Functions 均已成功刪除。
- 正式站 <https://lesson-hub-v03.web.app> 回應 HTTP 200；公開資產為 `/assets/index-LetM7CAn.js` 與 `/assets/index-DGKhjZ-R.css`。新版 JavaScript 含直接上傳與雲端原檔保留文字，且不含兩個舊解鎖 Function 名稱。
- 未登入呼叫 `teacherResultsList` 仍回 HTTP 401 `UNAUTHENTICATED`，教師 Results 保護未放寬。
- 正式 Storage 實測使用臨時 Anonymous Auth 上傳並讀回 68-byte PNG：`teacher-image-slides/smoke-test/1787236476239-b7b638ec-dd8a-4032-936f-72fc31dfcf2c.png`。覆寫、列目錄與刪除皆回 `storage/unauthorized`；測試圖片依 2B 保留，臨時匿名帳號已刪除。

### 教師驗收

1. 正式站強制重新整理後，進入任一 Image Slides 編輯區，確認沒有通行碼或解鎖按鈕。
2. 直接按「加入圖片（可多選）」上傳一張 PNG／JPG／WebP，確認上傳成功後按 Save Lesson。
3. 在無痕視窗或另一台筆電載入雲端 Lesson，確認同一張圖片能顯示；移除圖片後確認 Lesson 不再引用，但雲端原檔保留。

## 2026-08-21 Image Slides 完整顯圖與 4B 舊圖清理（已部署）

- 已確認 RDQ 規格卡：rdq/RDQ-spec-image-slides-full-frame-delete-20260820.md；採用 1A／2A／3A／4B 與建議 ①②③④⑤。
- Image Slides 一般投影與全螢幕都固定為「精簡標題列／完整圖片框／精簡 Previous 與 Next」三列 Grid。圖片依實際可用框尺寸重新計算，完整置中、不裁切、不拉伸；小圖不放大。
- 已修正投影模式較早的 Flex 規則覆蓋三列 Grid 的問題；圖片框使用明確高度與隱藏溢出，ResizeObserver、視窗縮放與全螢幕切換都會重新配適。
- 4B 行為：按「移除」不再二次確認；移除或替換後，只有在雲端 Save Lesson 成功時，受保護的 teacherLessonConfigSave Function 才刪除不再被任何 Lesson 引用的 teacher-image-slides/ 舊圖。
- 匿名瀏覽器仍不能列出、覆寫或刪除 Storage 圖片。伺服器只接受嚴格合法的 Image Slides 路徑；暫時性刪除失敗會保留待刪清單，於下次雲端 Save Lesson 自動重試。
- 本節取代前一節「Image Slides 直接匿名上傳」中「移除／替換後雲端原檔保留」的舊行為；直接匿名新增圖片仍維持不變。

### 本次測試與正式發布

- 完整 preflight 通過：63 項 Node 測試（Functions 10 項另行重跑）、7 項 Firestore／Storage Emulator 規則測試、Functions 語法、安全檢查、Firebase preflight 與 Vite 正式建置。
- Headless Chrome 實際驗收通過 1366×768 與 1920×1080；兩種解析度的一般及全螢幕共 4 種畫面都沒有 Lesson Hub 額外上下捲動。720×1080 直式圖四邊皆位於圖片框內，比例不變且未放大。
- 已正式部署 Functions codebase teacher-access 的 7 個 Node.js 22 callable Functions，以及 Hosting target lesson-hub-v03；本次未重部署或放寬 Firestore／Storage 規則，也未修改匿名成績。
- 正式站為 <https://lesson-hub-v03.web.app>；首頁及新版 /assets/index-A318an8o.js、/assets/index-hZ3rqFMC.css 均回應 HTTP 200。線上 JS 含尺寸重算與 Save 後伺服器刪圖提示；線上 CSS 含 object-fit: scale-down。
- 未登入呼叫 teacherLessonConfigSave 回 HTTP 401，證實伺服器刪圖流程仍受教師工作階段保護。

### 教師實機驗收

1. 在正式站強制重新整理，開啟任一含直式圖片的 Image Slides，於一般及全螢幕確認圖片最底部文字完整。
2. 在 Teacher Studio 替換或移除一張圖片並按 Save Lesson；應顯示雲端儲存成功及舊圖清理結果。
3. 另一台筆電載入雲端最新版，確認 Lesson 不再引用舊圖；如需確認 Storage 實體物件已刪除，可由教師本人至 Firebase Console 檢查。

## 2026-08-21 Web Practice 公開與 Embed 連結（已部署）

- 已確認 RDQ 規格卡：`rdq/RDQ-spec-web-practice-public-embed-links-20260821.md`；採用 1A／2A／3A 與建議 ①②③④⑤，並以安全替代方案取代第三方完整網頁代理及自動登入。
- Teacher Studio 的同一欄位可接受 HTTPS 公開分享網址、Embed URL 或完整 iframe code，並即時顯示「頁內嵌入／新分頁開啟／格式有誤」與測試連結。
- Canva 公開分享連結及未知一般 HTTPS 網址改用大型啟動卡，教師點擊後開新分頁，Lesson Hub 原分頁保留，不再先顯示失敗 iframe。
- Canva Embed、明確 Embed URL、完整 iframe code 與既有 Wayground 網址保留頁內框架、全螢幕及新分頁備援。完整 iframe code 只擷取單一 HTTPS `src`，不執行其他 HTML、script、style 或事件屬性。
- 教師如需登入 Canva／Wayground，只在平台官方頁面親自登入並沿用瀏覽器工作階段；Lesson Hub 不讀取、傳送或保存帳密、Cookie 或第三方登入憑證，也不代理或重新代管第三方完整網站。

### 本次測試與正式發布

- 乾淨隔離副本完整 preflight 通過：69 項網站測試、10 項 Functions 測試、7 項 Firestore／Storage Emulator 規則測試、Functions 語法、安全檢查、Firebase preflight 與 Vite 正式建置。
- Headless Chrome 實際驗收 Canva 公開連結、Canva Embed 與 Wayground；1366×768、1920×1080 皆無 Lesson Hub 額外上下或左右捲動，啟動卡與 iframe 都完整位於投影範圍內。Canva Embed 的頁內框架、全螢幕與新分頁備援均通過。
- Wayground 頁面可在框架內載入；目前既有代碼 `336134` 由 Wayground 回報「無效的遊戲代碼」，屬外部平台代碼狀態，不是 Lesson Hub 內嵌失敗。
- 本次只部署 Firebase Hosting target `lesson-hub-v03`（42 個檔案）；未部署 Functions、Firestore／Storage 規則，也未修改匿名成績或雲端教材資料。
- 正式站 <https://lesson-hub-v03.web.app> 回應 HTTP 200，且無 JavaScript 頁面錯誤。線上 `/assets/index-BxqlDge-.js`、`/assets/index-B1aKcEW9.css` 與 `/assets/rolldown-runtime-CbXtAM7H.js` 的 SHA-256 均與本機正式建置完全一致。

### 教師實機驗收

1. 正式站強制重新整理，將 `https://canva.link/6dmyzbaseejgv3s` 貼入任一 Live Interactive Practice，確認顯示「新分頁開啟」，而非拒絕連線 iframe。
2. 若要留在 Lesson Hub 頁內互動，請從 Canva 取得官方 Embed URL 或 iframe code；貼上後確認顯示「頁內嵌入」，並測試全螢幕與新分頁備援。
3. Wayground 若顯示「無效的遊戲代碼」，請在 Wayground 產生目前有效的加入網址後更新 Practice URL。

## 2026-08-24 PowerPoint 動畫 Embed（程式完成，尚未部署）

- 已確認 RDQ 規格卡：rdq/RDQ-spec-powerpoint-animation-embed-20260824.md。新增獨立「PowerPoint（動畫）」Step，既有「簡報（PDF）」保持不變。
- **HWG5 Starter · Lesson 1 · Step 1** 會改為新類型；遷移測試證明既有 14 Steps 只替換 Step 1，其餘 13 Steps 保留，另外 45 節標準 Lesson 不變。
- Teacher Studio 可貼入 OneDrive／PowerPoint for the web 官方 HTTPS Embed URL 或單一 iframe code；只儲存經 Microsoft 網域白名單驗證的 src，拒絕非 HTTPS、帳密 URL、script、事件屬性、多 iframe 與非 Microsoft 來源。
- Lesson Flow 提供頁內播放、全螢幕／縮小、新分頁與桌面 PowerPoint 備援；一般短分享網址會顯示「需正式 Embed」警示，含 `wdAr` 與 `wdEaaCheck` 的 PowerPoint 官方 `1drv.ms/p/` Embed 則可辨識為正式格式。Lesson Hub 不保存 Microsoft 帳密、Cookie 或 Token。
- 最新教師 Embed 採 16:9（1600×900）、`em=2` 播放模式，URL SHA-256 為 `9F2A1C1C57A4244BE2C24D64D63B5360B25A459C875B56B25470D6378AF571B0`；前兩個 `wdEaaCheck` 版本不再使用，完整分享 token 未寫入公開 Git。
- 最新補丁在乾淨隔離副本通過 73／73 項 Node 測試、46 節課資料驗證與 Vite 正式建置；Teacher Studio 顯示「可嵌入」，Save Lesson、本機重新載入、一般畫面、全螢幕／縮小、新分頁及桌面 PowerPoint 按鈕均通過。
- 未登入的乾淨 Headless Chrome 載入最新 `em=2` Embed 時，Microsoft 最終仍導向 `onedrive.live.com/edit` 且 iframe 為空白；測試同時記錄 `res-1.cdn.office.net` 載入失敗，因此目前只能確認官方播放格式，實際投影片及 On Click 動畫仍需在教師 Chrome 預覽驗收。
- 本次沒有部署 Firebase Hosting、Functions 或規則，也沒有 commit／push；完整分享 token 未寫入公開 Git。
