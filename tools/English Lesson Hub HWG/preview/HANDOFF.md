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