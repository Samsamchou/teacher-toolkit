# English Lesson Hub V03 — Results 通行碼部署交接

## 2026-09-26 22:51 課堂錯題、上傳影片、落球、音樂與工具列正式發布

使用者確認 [本輪 RDQ 規格](../rdq/RDQ-spec-classroom-followup-20260926.md) 的 1A／2A／3A 及建議，之後另行明確授權正式部署。全班錯題與錯題 CSV 依「部分＋全錯」人數由多至少排序，前三個非零人數層級以紅／淺紅／粉紅區分，同分並列，原題號、學號、每選項作答及評分明細保留；學生個別報告仍用原題序。教師上傳影片的內建播放、暫停與進度改成全班同步控制，等候後端確認時不再被上一秒舊快照撤銷；素材仍透過既有授權讀取。落球 1–5 在球盤頂端一按即落，新回合固定紅柱 −1／紫柱 +1，碰撞分、音效及落格分分開顯示；舊回合照舊規則，歷史分數不重算。教師背景音樂在所有教材投影片自動暫停、題目頁自動播放；音量及瀏覽器阻擋時的啟用提示保留。工具列 Eyes Up Front 藍色、公布答案綠色、開放作答紫色，其餘動作分色並保留文字辨識。

在隔離副本 `C:\Users\User\AppData\Local\Temp\lesson-hub-audio-20260926` 驗證：網站單元 189/189、Functions 10/10、Vite 建置通過；本機 Firestore 模擬器 4/4，涵蓋報告、遊戲、影片指令與多選題；原專案 `npm run validate` 為 PASS／46 堂課／errors 0。本機 Chrome 合成課堂的落球專項驗收通過：頂部 1–5 點一次即落、只扣一次機會、暫停及重整不重扣、390px 手機無橫向溢出及頁面錯誤；平板／手機截圖存於 [QA 證據](qa/classroom-followup-20260926)。完整三遊戲舊腳本在籃球頁舊標籤處逾時，本輪僅宣稱落球專項通過；無頭瀏覽器也不能證明實際碰柱音效已聽到。

正式部署只更新 `teacher-access:liveV2` 與 `hosting:lesson-hub-v03`。第一次後端指令因 Firebase 預設登入帳號缺少 `iam.serviceAccounts.ActAs` 而在預檢階段遭拒，未變更服務；以已登入、具既有 Owner/ActAs 權限的帳號作單次 `--account` 指定後成功，沒有切換全域預設登入或增加 IAM 權限。`liveV2` 由 `livev2-00008-vop` 更新為 `livev2-00009-wuq` 且 Ready；v2／素材／影片／圖片搜尋旗標仍 true，Worker URL 存在。`liveMediaV2` 及 `liveImageSearchV2` 維持 `livemediav2-00005-boj`／`liveimagesearchv2-00004-nuq`。Hosting CLI 顯示 97 檔、release complete；正式 `/lab` 與本次入口 JS、課堂 JS、CSS 均 HTTP 200 且 SHA-256 與隔離建置相同。完整逐檔雜湊見 [正式部署紀錄](../rdq/DEPLOYMENT-classroom-followup-20260926.md)。沒有部署 Firestore／Storage 規則、其他 Functions 或 Worker，沒有執行課程、素材或歷史資料寫入，也未 Git commit／push。

本機 Chrome 無登入唯讀開啟正式 `/lab` 為 HTTP 200，顯示 English Lesson Hub 與雲端教師入口，沒有頁面 JavaScript 錯誤。教師仍需在正式站真機確認上傳影片連續播放逾 3 秒、暫停／跳轉與兩台 Safari 同步、碰柱實際音效，以及投影片／題目頁背景音樂切換；HTTP、模擬器與前次音效實機回報均不能替代這些新版驗收。正式入口：https://lesson-hub-v03.web.app/lab 。

## 2026-09-26 20:05 即時評分音效與教師背景音樂正式發布

使用者確認 [RDQ 音效規格](../rdq/RDQ-spec-live-audio-feedback-20260926.md) 的 1A／2A／3A 與四項建議，並明確授權「程式完成與測試之後直接正式部署」。學生三種結果採原創 WebAudio 提示音；伺服器只在本人成功交卷回覆傳回本次 `attemptId` 與 `full`／`partial`／`wrong`，輪詢快照不帶結果或正解；母音題完成自動交卷也傳回同格式。每次嘗試僅播一次，學生可關閉音效；待評／不計分不播。教師背景音樂只在教師頁手動開啟，預設關閉、20% 音量、可暫停／調音量／循環；本機或 YouTube 教材播放時自動暫停，Google Drive 跨網域無法觀測播放狀態，因此整張 Drive 影片投影片保守暫停背景音樂。原曲是 Pixabay 的 [Upbeat Happy Corporate（kornevmusic）](https://pixabay.com/music/corporate-upbeat-happy-corporate-487426/)，[授權摘要](https://pixabay.com/service/license-summary/)；前三支 YouTube 只作風格參考，未擷取原音。素材來源與 SHA-256 記在 `public/live-audio/upbeat-happy-corporate-487426.source.json`。

隔離建置副本 `C:\Users\User\AppData\Local\Temp\lesson-hub-audio-20260926` 與工作區 11 個實作檔 SHA-256 相同。正式雲端 preflight 6/6 通過；`npm test` 180/180、Functions 10/10、相關 Firestore emulator 整合各 1/1、本機 HTTP 合成教室三種結果／母音自動交卷／重送不洩漏測試通過。`npm run validate` 在隔離副本因缺少相鄰 `question-bank` 來源檔而回報找不到檔案；在原始專案執行同一腳本 `status: PASS`、`errors: []`。`npm run check:functions` 與正式 Vite 建置通過。瀏覽器自動操作在測試期間逾時，未宣稱 Safari／實際喇叭已驗收。

部署時先將上輪已驗證的完整 `functions/.env.hwg7teaching` 複製至隔離副本，核對 v2／素材／影片／圖片搜尋旗標與 Worker URL 存在；從舊正式 bundle 讀取相同的公開 App Check 站台鍵，僅放入本次建置程序環境，未寫入專案。第一次 `--only functions:liveV2` 因漏寫 codebase 被 CLI 於部署前拒絕，沒有變更；接著只部署 `functions:teacher-access:liveV2`，正式讀回 `livev2-00008-vop` Ready，v2／素材／影片／圖片搜尋旗標皆 true、Worker 已設定。`liveMediaV2` 仍為 `livemediav2-00005-boj`、`liveImageSearchV2` 仍為 `liveimagesearchv2-00004-nuq`，皆 Ready 且旗標正常。再只部署 `hosting:lesson-hub-v03`（97 檔，CLI 顯示 release complete）。正式 `/lab`、`LiveApp-D5wimKHm.js`、`LiveApp-PMhWEOEF.css`、MP3 及來源紀錄 HTTP 200、SHA-256 與建置副本逐檔相同。未修改課程、歷史紀錄、Firestore／Storage 規則、其他 Functions 或 Secret；未 Git commit／push。

教師於 2026-09-26 回報已確認三種作答音效，以及教材影片播放時背景音樂的暫停／恢復。這是教師實機回報，不延伸宣稱兩台 Safari、母音題或 Drive 跨網域投影片均逐項驗收。後續「所有教材投影片都暫停、問題頁自動播放」屬新一輪需求，見 [新 RDQ 規格](../rdq/RDQ-spec-classroom-followup-20260926.md)，不得與本次已部署版本混淆。

## 2026-09-26 教材投影片版面及雲端圖片正式修復

教師回報教材投影片上傳後及母音題既有圖片均顯示「雲端素材尚未啟用」。正式讀回確認 `liveMediaV2` 的 `LIVE_MEDIA_ENABLED`／`LIVE_VIDEO_ENABLED` 與 `liveImageSearchV2` 的圖片搜尋旗標皆為 false；前次修復使用的隔離部署副本 `functions/.env.hwg7teaching` 只含 `LIVE_V2_ENABLED`，造成這些服務更新時旗標遺失。已將 2026-09-24 已驗證的非機密完整旗標設定複製回隔離副本，並逐項比對目前仍運作的影片派送服務設定一致。未修改教師通行碼、Secret、Firestore／Storage 規則或課程／素材文件。

已只更新 `teacher-access:liveMediaV2` 與 `teacher-access:liveImageSearchV2`；正式讀回皆 ACTIVE：`livemediav2-00005-boj`、`liveimagesearchv2-00004-nuq`，v2／素材／影片／圖片搜尋旗標皆 true。第一次 Firebase 函式規格載入在 10 秒逾時，使用本機 CLI 支援的 `FUNCTIONS_DISCOVERY_TIMEOUT=60000` 重試後成功。下次部署任何 live Functions 前，須先用 `scripts/live-cloud-preflight.mjs` 檢查完整旗標；不要再次從只含 v2 單一旗標的副本部署。

`src/live/LiveApp.jsx` 為教材投影片加專用 `lh-slide-canvas`，`src/live/compact.css` 將標題限於響應式 22–32px、縮小畫布留白，圖片／影片可用最高 `min(72vh,760px)` 的區域；互動題使用原本題幹版面。已發布 95 檔到 `lesson-hub-v03`。正式 `/lab`、`LiveApp-ChI8H3vu.js`、`LiveApp-B7LY7dtd.css` HTTP 200 且 SHA-256 與建置副本相同。Hosting Releases 管理 API 讀回回應 403，因此本次以 CLI「release complete」與公開檔案雜湊作發布證據，未記錄無法核實的版本 ID。

隔離副本設定預檢全通過、網站測試 186/186、Functions 10/10、Vite 建置成功；原專案位置題庫資料驗證 `errors: []`。本機瀏覽器預覽確認標題卡片高度約 96px，未對正式站建立或改寫測試課程。已請教師於正式站自行重新整理、解鎖，回報母音題既有三圖及教材投影片新圖片上傳是否恢復；這一步尚待真人回覆，不能稱正式圖片流程已驗收。規格卡見 [RDQ](../rdq/RDQ-spec-slide-media-recovery-20260926.md)。未 Git commit／push。

## 2026-09-25 固定教師課程庫修復完成（23:10 後端補強）

使用者授權修復及部署，並親自解鎖正式站確認「已看到原課程」。根因為舊版以瀏覽器匿名 UID 篩選課程，換瀏覽器或匿名身分後清單為空，並非課程被刪除。已於驗證真實教師工作階段後，由後端私人設定 `liveTeacherWorkspacesV2/primary` 解析固定教師歸屬；前端不可指定歸屬。學生身分、教師通行碼、App Check 及媒體權限檢查保留。此為本站同一通行碼的固定教師課程庫，不是多教師獨立帳號系統。

安全接回原歸屬的 2 堂課；修復時 `HWG7 U02 words` 為 v218、8 頁（5 題＋3 投影片）。檢查 10 個素材紀錄及 20 個 Storage 物件存在；設定前後課程與素材內容雜湊相同。只新增私人歸屬設定，未重寫原課程、版本、歷史課堂或媒體；其他歸屬的 2 堂課未合併。私人備份留在本機 Temp 的 `lesson-hub-teacher-recovery-20260925/teacher-workspace-1790348227706.json`，勿公開或提交 Git。

正式 Hosting 為 `b129e60ca4450054`（2026-09-25T14:59:39.032Z，95 檔）；線上 index／LiveApp JS／CSS HTTP 與雜湊已核對。後端最新讀回 ACTIVE：`livev2-00007-wix`、`livemediav2-00004-yap`；圖片搜尋沿用本輪 `liveimagesearchv2-00003-vip`。最後只补部署 liveV2／liveMediaV2：新素材保留真實上傳者 ownerUid 與 Storage 路徑，另以 workspaceOwnerUid 管理固定教師權限，確保既有 FFmpeg worker 相容；舊素材仍依 ownerUid 相容讀取。未更動 worker、安全規則或其他服務。

最終 staging `npm test` 186/186、Functions 10/10、相關 Firestore／Storage 整合 10/10 通過（測試集合可能重複涵蓋 Functions，不加總成獨立案例數）。整合涵蓋跨瀏覽器課程／版本／媒體讀取、拒絕冒用及未授權學生、上傳者隔離、真實 FFmpeg 轉檔、報告歷史快照。部署前四個後端來源檔與 staging 雜湊一致。新影片跨瀏覽器流程為模擬器驗證，尚未新增正式影片做真機驗收；既有課程可見已由教師確認。前次舊音訊整合測試問題仍見下方紀錄，未宣称全站所有整合測試通過。

未 Git commit／push，未刪除任何資料。正式入口 https://lesson-hub-v03.web.app/lab 。換瀏覽器時需重新親自輸入本站教師通行碼，不應因未解鎖的空清單重建課程。課程修復完成，下一步可選擇驗收新影片上傳與另一瀏覽器讀回。

## 2026-09-25 22:12 母音片語空格修正正式發布

使用者明確授權前後端部署。已先更新 `hwg7teaching` 的 `teacher-access:liveV2`，讀回 ACTIVE／`livev2-00005-rap`；再發布 `lesson-hub-v03` Hosting `b4c74811d368dcb7`（95 檔，2026-09-25T14:12:12.187Z）。正式入口 https://lesson-hub-v03.web.app/lab 。僅更新上述兩項，未修改正式課程、歷史資料、安全規則或其他 Functions。

162 單元＋10 Functions 測試、雲端建置、preflight 與來源／staging 比對通過。額外 Firestore 整合 4/5 通過：母音點選、多人隔離、草稿及改名通過；舊音訊測試在 `tests/live-cloud.integration.mjs:162` 使用 `report.responses.sort` 失敗，目前 report API 不含該欄位，本次沒有擴改音訊測試或功能。不可稱整合全數通過。

正式 `/lab` HTTP 200；線上 index 與 LiveApp JS／CSS 均 HTTP 200、SHA-256 與建置相同：index `0d203cb7f6c51a835b28c3dfa54bcf4ac59b8de9f9101751972d97b80f2b44b7`；`LiveApp-DdkXFtFF.js` `5dfba3e6811a6029628ca209cb740cc92380febc5c31c146f88c4465ed01f7a4`；`LiveApp-T-ahxTni.css` `8bf1a242021e5a553d1310dced508b31b8bb0ef6ec230b3826e947b74f82fb49`。

教師下一步：重新整理後，將舊題 bybike／bybus 手動补成 by bike／by bus，確認母音標記及學生間隔；不必重傳圖片。舊題不自動猜測分詞，歷史紀錄不改。正式登入後及 iPad 真機尚待教師驗收。本次未 Git commit／push。下方未部署段落為歷史狀態。

## 2026-09-25 母音片語空格修正（本機，尚未部署）

教師要求 bybike 顯示為 by bike。編輯器原本會刪除空格，後端也禁止空格；已改為支援含空格最多 24 字元、至少兩個字母的片語。教師與學生端空格呈現不可點選的間隔；只修改空格會依字母順序保留／重定位正解，修改字母仍清空標記。舊題與歷史快照不自動轉換；教師需將 bybike／bybus 改填 by bike／by bus。部署須同時更新 liveV2 與 Hosting，不能只發布前端；本次未重新部署，正式版仍為下方 20:35 版本。

## 2026-09-25 20:35 最新正式版與收工

正式 https://lesson-hub-v03.web.app/lab 為 Hosting `a14e86ef739f550a`，收工重新查證一致。新課程先命名、既有課程儲存名稱、緊湊題幹與 28–36px 選項已上線；最後一輪只部署 Hosting，不改評分後端或歷史資料。160 單元＋2 相關整合、建置／安全／46 課資料檢查通過；本機教師／學生／預覽單行題幹約 91px、選項 36px，名稱重整讀回及正解綠色通過。正式 index／JS／CSS 雜湊吻合。完整證據見 [最新部署紀錄](../rdq/DEPLOYMENT-course-name-compact-20260925.md)。

下一步：課堂結束後重新整理正式頁，驗收 iPad Safari、實際投影、長文字與觸控畫筆、錯題報告。前輪兩台跨 Wi-Fi Safari 影片播放／暫停／跳秒已由教師回報通過，不等於最新版 UI 真機驗收。原預覽是舊前端，後續用正式入口。共用 repo `main` 混有其他專案，本次未 stage／commit／push；HEAD `24157d756e52864c5af87f21ead9e83af8a80c1c` 不含未提交更新。GDrive 本機保存，遠端同步未獨立驗證。電腦維持運作、不停止其他工作。

## 2026-09-25 19:29 正式發布完成

使用者明確授權「正式部署」。正式 https://lesson-hub-v03.web.app/lab 已更新為 Hosting 53c31ec9bfe0dbe8（95 files），必要 liveV2 後端 ACTIVE／livev2-00004-xoj。包含太空背景與前輪課堂標註／錯題報告；157 單元＋10 Functions＋7 整合、原題庫及安全檢查通過，線上 index／JS／CSS／背景 SHA256 相同。未動其他服務、規則或資料，未 Git 提交。正式登入後與新版 iPad 真機驗收仍待教師執行；下方「未部署」是歷史狀態。詳細版本、復原與限制見 [正式發布紀錄](../rdq/DEPLOYMENT-formal-space-academy-20260925.md)。

## 2026-09-25 太空學院視覺（本機，未部署）

RDQ 1A／2A 全採納，並依教師追加要求使用內建 ImageGen 生成原創背景。/lab 備課、授課、學生端共用星空、行星與立體卡片；題目實色底，等待輕微動態、作答靜態，支援減少動態。157 單元＋10 Functions 與建置通過；真機及發布另行驗收。詳見 [太空主題交接](../rdq/IMPLEMENTATION-space-academy-20260925.md)。

## 2026-09-25 課堂標註與錯題報告（本機新版，未部署）

已依教師確認實作原選項綠色正解、覆蓋式畫筆／橡皮擦與依題自動同步、水平排序、學號答題燈號、學生逐題／全班錯題對照與歷史報告入口。153 單元＋10 Functions＋7 Firestore 整合及本機建置通過；Chrome 合成課堂 844476 已完成兩題與報告讀回。Safari/iPad 真機、窄螢幕及實際列印仍待驗收；此次沒有雲端部署或 Git 提交。以 [本輪交接](../rdq/IMPLEMENTATION-classroom-review-20260925.md) 為準。上次 US$1 雲端試部署已結束，不是本輪發布授權。

## 2026-09-25 兩台Safari核心驗收完成（尚未發布正式站）

教師親自解鎖後，建立獨立QA課堂384412；兩台不同Wi-Fi的Safari加入、影片有聲播放/暫停/跳至5秒、未選禁送、提交前無正解標記，由教師回報通過。代理教師端讀回2位參與者99999/66666、2筆作答與逐選項評分明細，實際為0/3及2/3；未測全選正解3/3真機案例。教師手動確認結束，phase=complete；已返回備課停止教師輪詢並請關閉學生頁。課程與合成紀錄保留，沒有發布或重新部署；實際費用未結算。完整證據與未驗項目見 [真機驗收紀錄](../rdq/CLOUD-TRIAL-DEVICE-QA-20260925.md)。

## 2026-09-25 15:05 受控雲端預覽更新（最新）

使用者同意US$1管理預算、1教師＋2學生裝置、30分鐘、1支10MB以下影片、不測AI。已核實既有雲端配置並只更新liveV2（revision livev2-00003-kul）與既有預覽（version c526995137d22cd1；92檔；到期2026-10-02 15:05台灣時間）。正式live仍bb89a7c8ef3fdef6，未更新；影片worker、其他Functions與安全規則未改。146單元＋10Functions＋6整合測試通過，首頁與LiveApp JS/CSS線上雜湊一致。Chrome已開啟教師驗證入口，等待教師本人輸入通行碼後接續兩平板、跨Wi-Fi、影片與作答驗收。費用未結算，US$1非硬上限。以 [受控試部署紀錄](../rdq/CLOUD-TRIAL-20260925.md) 為準；先前「雲端未備齊」來自本機缺值，不應重建雲端資源。

## 2026-09-25 研究優先：暫不修改網站

使用者確認截圖 12 項研究範圍及三項建議，要求研究整理完才改站；此次序優先於先前邊研究邊做樣板。指定帳號已由使用者回報登入，但瀏覽橋接仍 timeout，實際建題／畫面對照為 0/12。已保存[確認規格](../rdq/RDQ-spec-wayground-research-first-20260925.md)及[官方文件初稿／實測清單](../rdq/WAYGROUND-RESEARCH-12-TYPES-20260925.md)。本輪只寫研究文件，未改產品程式、預覽或正式站；不要把文件初稿當成研究完成。

## 2026-09-25 第二次預覽：題型編輯樣板與背景效能

原預覽已更新，正式站未改。籃球背景改用 384 KB WebP（原 3.18 MB），角色圖亦壓縮；新增選項卡片、替代答案欄、排序控制、拖放區域視覺調整、獨立媒體入口與評量側欄。121 單元、四題型／響應式、三遊戲、母音題及課堂閉環回歸通過。固定慢網模擬背景下載約 16.4 秒 → 2.1 秒，非校園實測。**Wayground 控制連線仍逾時，u9431818@gmail.com 尚未登入建題，不能稱為完整復刻。** 詳細證據與下一步見 [本輪交接](../rdq/IMPLEMENTATION-studio-performance-20260925.md)。

## 2026-09-25 新版預覽已發布，師生三圖顯示已驗收

指定帳號 `u9431818@gmail.com` 已加入 Firebase CLI；連到真實 v2 後端的新版前端已發布至原 [Hosting 預覽](https://lesson-hub-v03--wayground-v2-20260924-my8u1xpl.web.app/lab)，84 檔、到期 2026-10-02 09:16:54（台灣時間）。首頁、互動 JS／CSS 與籃球圖片線上雜湊均吻合建置；Chrome 雲端 Teacher-led 入口無頁面錯誤。教師本人回報老師端與一般學生端的母音題三張圖片均顯示；其他課堂功能與 iPad 尚待驗收。正式站的 live channel 發布時間維持 2026-09-07。見[部署讀回](../rdq/DEPLOYMENT-wayground-v2-preview-20260924.md)及[圖片驗收紀錄](../qa/preview-20260925/MANUAL-QA.md)。

## 2026-09-25 收工：最新前端待預覽部署

已保存晚間修正與八張本機 QA 截圖。Firebase CLI 收工讀回仍只列出非指定帳號，最新前端未更新至預覽；正式 Hosting 未發布。下一次由教師加入指定帳號後接續已授權的預覽更新與真實圖片／師生驗收。兩把金鑰與後端已完成，不須重做。共用 Git 混有其他專案變更，本次未提交／推送。見[本次收工交接](../rdq/CLOSEOUT-20260925-preview-pending.md)。

## 2026-09-24 晚間圖片／編輯器／課間遊戲修正，預覽前端待更新

母音題改為每字獨立圖片上傳與狀態提示；後端三字完整檢查保留、未完成草稿可先存。題目編輯器分色分區，題目移除 Slides／Canva 連結、私有備註與「教材／題幹」，分數和時間改為選單。籃球、Plink-oh!、拉霸依來源素材、舞台與動畫做單人適配，保留教師控制與分數隔離；詳細來源見 [SOURCE.md](public/live-games/SOURCE.md)。121 單元、10 Functions、9 規則、草稿雲端整合與三款遊戲平板／手機瀏覽器回歸通過。六個 v2 Functions 已更新；兩項圖片相關 IAM 權限已依教師同意授予且讀回。Hosting 預覽仍是本次前端修改之前的版本，因 Firebase CLI 當時僅登入非指定帳號而暫停更新；正式站未改。精確閘門與教師手動登入步驟見[最新部署交接](../rdq/DEPLOYMENT-wayground-v2-preview-20260924.md)。真實圖片、教師通行碼、兩裝置課堂與 iPad 仍待教師驗收。

## 2026-09-24 Teacher-led v2 雲端預覽已部署，正式站待教師驗收

兩個金鑰已由教師設定，指定帳號部署了六個 v2 Functions、私有 Cloud Run/FFmpeg、App Check 與安全規則；真實 Hosting 預覽已連到同專案 v2 後端。正式 live Hosting 尚未更新，教師通行碼與兩裝置課堂驗收仍待本人操作。精確網址、測試證據、保留限制和正式發布閘門見[最新部署交接](../rdq/DEPLOYMENT-wayground-v2-preview-20260924.md)。以下舊段落的「未部署／金鑰不存在」均為當時歷史狀態，不代表現在。

## 2026-09-24 點選母音拼讀字母（本機完成，正式部署待人工閘門）

Teacher-led v2 已新增固定三字三圖、教師標記正確字母位置的題型；學生紅光／綠光與對錯符號、減少動畫、斷線恢復、後端隱藏答案及一次 2 次遊戲機會均已實作。108 單元、10 Functions、循序 19 模擬器測試、正式建置及完整瀏覽器流程通過；教師報告讀回 1/1 學習分。四張 QA 截圖見 [vowel-letters-20260924](../qa/vowel-letters-20260924/)。詳細實作、當前金鑰狀態、官方費率與教師手動輸入時點見 [本次部署閘門](../rdq/IMPLEMENTATION-vowel-letter-selection-20260924.md)。兩個新 Secret 目前不存在，尚未啟用 App Check／雲端 worker，**未部署新版**。下方收工段落是先前歷史狀態。

## 2026-09-24 收工暫停：晚間從金鑰權限接續

使用者已改為授權「部署、設定金鑰」，但隨後要求先收工；本次尚未部署新版、未成功設定兩個新 Secret，也未更動 IAM。403 原因為 Firebase 預設帳號不符；已只讀驗證 u9431818@gmail.com 具有必要 Secret／Service Usage 權限，晚間指令必須明確帶 --account，金鑰由使用者在隱藏提示輸入。Cloud Run／Cloud Build／AI 按量費用尚待確認，App Check 尚待設定。見[收工交接與精確接續指令](../rdq/CLOSEOUT-20260924-deployment-paused.md)。下方「未部署」仍為事實，但較早「不部署」是歷史授權狀態。

## 2026-09-24 單人課間遊戲（未部署）

RDQ 已確認並實作三款單人改編版：每題答對／通過 2 次、答錯 1 次，錄音 80 分、文字雲有效提交 2 次；待評不誤判、改判補差額、跨題保留、教師中斷與重連防重領。遊戲分數獨立，來源專案與正式站未改動。105 單元＋10 Functions＋18 模擬器測試及三款遊戲／原閉環瀏覽器回歸通過。見[單人遊戲交接](../rdq/IMPLEMENTATION-single-player-rewards-20260924.md)與[確認規格](../rdq/RDQ-spec-single-player-rewards-20260924.md)。不部署、不設定金鑰；真實 iPad／音效／課堂網路待教師驗收。

## 2026-09-24 Pixabay＋Cloud Run/FFmpeg（未部署）

使用者已確認服務選型並要求先不部署。已加入 v2 私有素材、Pixabay 後端與 Cloud Run worker 程式；97 單元＋10 Functions＋16 模擬器測試通過。沒有建立雲端資源、設定正式金鑰或改寫正式資料。實際雲端／容器／真機驗證尚待授權，詳見[第三階段交接與部署前清單](../rdq/IMPLEMENTATION-wayground-phase3-20260924.md)。

## 2026-09-24 Teacher-led v2 本機開發（未部署）

已接續雲端 v2、錄音評分流程、FFmpeg 本機影片轉檔、關閉狀態的 Pixabay 搜尋 adapter 與自由畫布。詳細狀態／未完成項目見 [第二階段交接](../rdq/IMPLEMENTATION-wayground-phase2-20260924.md)。不可把下方歷史「已上線」解讀成 v2 已部署；正式站仍維持原版本。

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
- 本次沒有部署 Firebase Hosting、Functions 或規則；PowerPoint 功能 commit `841efb18df82c4c64e50da17b74c01a76536cb47` 已推送至 `origin/main`，完整分享 token 未寫入公開 Git。

## 2026-08-24 PowerPoint Firebase Hosting 正式部署

- 部署時間：2026/08/24 17:01:06（Asia/Taipei）。來源為 `main` HEAD `70b45a052ce89f6c1c3559adafacb612baa0ea95`，PowerPoint 功能 commit 為 `841efb18df82c4c64e50da17b74c01a76536cb47`。
- 由已提交原始碼建立乾淨暫存副本；根目錄與 Functions 依 lockfile 安裝後 audit 均為 0 vulnerabilities。完整 preflight 通過：46 節課資料驗證、73／73 網站測試、10／10 Functions 測試、7／7 Firestore／Storage 規則測試、Functions 語法、教師安全檢查、Firebase preflight 與 Vite 正式建置。
- 已只部署 Firebase Hosting target `lesson-hub-v03`，共 42 個靜態檔案；正式網址為 <https://lesson-hub-v03.web.app>。Functions、Firestore／Storage 規則、Secret、匿名成績資料與預設 Hosting 均未變更。
- 正式首頁回應 HTTP 200，`/__/firebase/init.json` 的 projectId 為 `hwg7teaching`；線上 `index.html` SHA-256 與本次建置完全相同，`/assets/index-C547H5_T.js` 與 `/assets/index-WP5t51tY.css` 亦逐檔相符。
- 無登入 Headless Chrome 驗證頁面錯誤 0；Teacher Studio 可展開 HWG5 Starter Lesson 1，Step 1 顯示 `PowerPoint（動畫）`、OneDrive Embed URL／iframe 欄位與 Save Lesson。未解鎖狀態使用 7 Steps 本機預設資料。
- 正式雲端既有 14 Steps 尚未由教師通行碼解鎖、載入與儲存，最新 OneDrive Embed 也尚未寫入雲端 Lesson。完整分享 token 仍未寫入 Git 或 HANDOFF；實際 PowerPoint Viewer 與 On Click 動畫仍需教師 Chrome 驗收。
- 部署後又以教師最新提供的 OneDrive 官方 iframe，在無登入的頂層頁面與真正 iframe 環境重測；兩者仍導向 `onedrive.live.com/edit` 空白頁，Microsoft Office CDN 模組回應 404。替代 `/embed` 路由回應 500，`/view.aspx` 與 `/redir` 則要求登入。
- 因此沒有把失效的最新 iframe 寫入雲端 Lesson，也沒有再次部署。下一步是重新產生可在無痕視窗匿名播放、且不落到 `/edit` 的官方 Embed；完整分享 token 持續不寫入 Git、HANDOFF 或工作筆記。

## 2026-08-24 Google Slides 線上簡報（動畫）（已部署）

- **HWG5 Starter · Lesson 1 · Step 1** 已改用教師提供、可匿名播放的 Google Slides 發布網址；顯示名稱統一為「線上簡報（動畫）」，內部資料類型仍保留 `powerpoint`，避免破壞既有 14 Steps 與雲端 Lesson 格式。其餘 45 節標準 Lesson 不變。
- Google 來源只接受 `https://docs.google.com/presentation/d/e/.../pubembed`，並限制 `start`、`loop`、`delayms`、`slide` 等已知參數；一般 `/edit`、未發布分享網址、未知參數、非 HTTPS 與偽造子網域均拒絕。
- Teacher Studio 可貼 Google Slides 已發布 URL／單一 iframe code，也保留既有 Microsoft Embed。iframe 來源中的固定 `1548×900` 不套用，網站一律以 `width: 100%; height: 100%` 填滿投影區。
- Google Slides 顯示「全螢幕／新分頁」，不顯示「桌面 PowerPoint」；Microsoft 來源才保留桌面 PowerPoint 備援。
- 遷移測試涵蓋既有 14 Steps：舊預設 PowerPoint Step 1 會升級為 Google Slides，其餘 13 Steps 保留；教師已明確自訂的簡報則維持原設定。

### 本次測試與正式發布

- 乾淨隔離副本通過 74／74 網站測試、10／10 Functions 測試、7／7 Firestore／Storage Emulator 規則測試、46 節課資料驗證、Firebase preflight 與 Vite 正式建置。
- 1366×768 與 1920×1080 一般投影均無 Lesson Hub 額外上下捲動；1920×1080 全螢幕 iframe 為 1896×1024。Google Slides 連續點擊產生 4 個不同畫面雜湊，證明投影片／已建立動畫可由滑鼠左鍵推進。
- 已只部署 Firebase Hosting target `lesson-hub-v03`；Functions、Firestore／Storage 規則、Secret、匿名成績與雲端教材資料均未變更。正式網址為 <https://lesson-hub-v03.web.app>。
- 正式站標題讀回為「線上簡報（動畫）」；Google iframe 已載入，「桌面 PowerPoint」按鈕為 0，「全螢幕」與「新分頁」各 1。線上主程式 `/assets/index-D5EmMqUd.js` SHA-256 為 `55f4bfb03d6aba98296e74bb1b2d3beb61c946d43eb0ac10d57224e0ce3bee9c`，與本機正式建置一致，且沒有 4xx 資源錯誤。
- 未解鎖的匿名 Teacher Studio 仍顯示 7 Steps 預設資料；程式已自動驗證 14 Steps 遷移保留，但正式雲端 14 Steps 仍需教師本人解鎖後讀回確認，不在本次 Hosting-only 部署中改寫。

## 2026-08-25 可信口說站頁內嵌與正式 Chrome 驗收（已部署）

- Lesson Hub 已將正式口說站 `https://setencerevieworalpractice.web.app/` 納入精確可信來源；該來源預設在 Lesson Hub 頁內載入，iframe 明確委派 `microphone *` 與 `fullscreen *`。其他未知 `*.web.app`／`*.firebaseapp.com` 網址仍維持新分頁，不會因此取得麥克風委派。
- 口說站 Hosting 標頭允許可信 Firebase Hosting 父頁內嵌，並保留麥克風 Permissions Policy；沒有讀取、保存或轉送帳密、Cookie、Token 或瀏覽器登入狀態。
- 本次來源提交為 `c43cdaa698e19f82cc0ef64803f4c9e04c14b23f`，精準包含 9 個 Lesson Hub／口說站的可信嵌入、標頭、部署閘門與測試檔。

### 測試與正式部署

- Lesson Hub 以乾淨隔離副本通過 76／76 網站測試、10／10 Functions 單元測試、7／7 Firestore／Storage Emulator 規則測試與 Vite 正式建置。
- 口說站通過 13／13 題庫驗證、57／57 測試與部署閘門。
- 已正式部署口說站 Hosting `setencerevieworalpractice`（395 個檔案）與 Lesson Hub Hosting `lesson-hub-v03`（42 個檔案）；本階段未部署 Functions、Firestore／Storage 規則、Secrets 或修改正式匿名成績資料。
- 正式靜態讀回確認口說站 CSP 可接受 `https://*.web.app`／`https://*.firebaseapp.com` 父頁、麥克風 Permissions Policy 存在，且 Lesson Hub 線上資產雜湊與本次建置一致。

### Windows Chrome 正式整合驗收

- 教師解鎖雲端教材後，正式 **HWG7 Unit 1 Lesson 1** 讀回仍為 **14 Steps**；原 Lesson 全程未被測試修改。
- 另建立獨立臨時 Custom Lesson `QA TEMP · Oral Embed 2026-08-25`，只在其中設定口說站 URL。正式 iframe 的 `src`、麥克風／全螢幕委派與頁內首頁顯示均正確，Lesson Hub 外層沒有額外上下捲動。
- 教師本人允許 Chrome 麥克風後，實際朗讀 `She would like some noodles.`；AI 評分成功，畫面自動進入第 2 題，粉紅隊增加 5 分，證明頁內錄音與評分鏈路可用。測試於未完成整局時返回首頁，沒有把不完整測試冒充完整成績驗收。
- 臨時 Custom Lesson 已由教師本人確認刪除。Chrome 控制橋在刪除後讀回時逾時，因此「最終刪除畫面」以教師確認為準；原有 14 Steps Lesson 未受影響。

### 剩餘人工確認

1. 原生全螢幕切換無法由自動化穩定觸發；教師可在實際投影時手動按一次「全螢幕」，確認 Chrome 原生全螢幕呈現。
2. 隔離 Headless Chrome 的 App Check 曾因 403 節流停止重試；一般教師 Chrome 已實際通過 App Check、進題、錄音與 AI 評分，不應在節流期間反覆建立全新瀏覽器設定檔。

## 2026-09-07 HWG5 Unit 1 Lesson 1 Vocabulary Quiz（程式與測試完成，未部署）

- 教師已核准 7 張無中文星期圖片與 14 題題庫；題庫 `hwg5-u01-l1-vocabulary` 含 Look and Choose 7 題、Listen and Choose 7 題，均依 Sunday–Saturday 排列，審核稿固定四個選項、正式作答時逐題打散。
- 僅 HWG5 Unit 1 Lesson 1 啟用新題庫；既有 HWG7 Unit 1 Lesson 1 題庫完整保留。題庫改採 `quizId` 路由，避免兩個 Lesson 互相讀錯資料。
- 既有 14 Steps Lesson 遷移測試證實只更新原 Vocabulary Quiz Step，另外 13 Steps 保留；若舊設定沒有 Quiz Step，才會新增到最後。
- 7 張網站圖片存於 `public/assets/hwg5-u01/days/`，7 個原始 MP3 的網站副本存於 `public/assets/hwg5-u01/audio/`；原始圖卡與 MP3 均未覆寫。
- 題庫／審核稿一致性與來源雜湊檢查通過；網站資料驗證通過（2 books、10 units、46 lessons、2 quiz sources）。乾淨隔離副本通過 79／79 項 Node 測試與 Vite 正式建置。
- 1920×1080 Headless Chrome 實際開啟學生網址，確認 HWG5 路由、學號示例 `50101`、Sunday 第一題、四個打散選項、1488×1072 圖片完整解碼；7 個 MP3 均 HTTP 200 且可由 Chrome 解碼。驗收未完成作答，沒有送出 Firestore 成績。
- Chrome 擴充控制橋連續逾時，因此本輪以 Headless Chrome 取代自動 UI 操作；不能把它描述為教師實體投影或真人聽覺驗收。
- 本輪沒有部署 Firebase Hosting／Functions／規則，也沒有提交或推送 Git。下一步需教師另行明確授權正式部署。

## 2026-09-07 HWG5 Unit 1 Lesson 1 Vocabulary Quiz（正式部署完成）

- 教師本輪明確授權「正式部署 Firebase」。已發布至專案 `hwg7teaching` 的 Hosting target `lesson-hub-v03`，正式站為 https://lesson-hub-v03.web.app 。
- 學生入口：https://lesson-hub-v03.web.app/?mode=student&book=hwg5&unit=u01&lesson=1 。包含 Look and Choose 7 題及 Listen and Choose 7 題。
- 部署前比對來源、設定與 public 素材共 63 檔，與先前通過 79 項網站測試及正式建置的乾淨副本完全相同。
- 部署檢查發現舊 Firestore 規則固定滿分 18，會拒絕新 HWG5 成績；已改為依核准 quizId 驗證 HWG5 7＋7／HWG7 10＋8 題，並驗證分類計數與總分相符。補上 HWG5 合法寫入、讀回、錯誤滿分／計數／分數、未登入及不可覆寫等測試；Firestore／Storage Emulator 共 8／8 通過。
- 正式發布範圍：`hosting:lesson-hub-v03,firestore:rules`。Firebase CLI 回報規則編譯、規則發布及 Hosting release 全部成功。Functions、Storage 規則、正式成績及雲端 Lesson 文件未修改。
- 正式 HTTP 讀回 56／56 個網站檔案皆為 200，SHA-256 與建置逐檔一致；Hosting runtime projectId 確認為 `hwg7teaching`。入口 `index.html` SHA-256：`016a5209f8af1a07b84f4ca4713d471a89b776953fc788511ab3cdb60a25c937`；主程式 `assets/index-BwXyPSY-.js` SHA-256：`2bc0071b05e24344baa6e0a922a731ace259363b00ce55b089662fa90d6dccf4`。
- 正式 1920×1080 Chrome 驗收通過：學號示例 50101、第一題 Sunday 完整圖片、四個隨機選項、滿分 14，無頁面捲動；7 個 MP3 全部 HTTP 200 並可解碼。截圖經目視檢查。成績寫入測試在 Emulator 完成；正式站未提交測試成績，勿描述為已在正式 Results 讀回新成績。
- 正式驗收檔：`audit/hwg5-u01-l1-vocabulary-quiz/production-browser-qa.json`、`production-first-question-1920x1080.png`、`production-release.json`。本輪未 Git commit／push。

## 2026-09-27 題目媒體／拉霸／影片專注模式（本機完成，未部署）
- 已確認 1B／2A／3A 與全部建議；規格：`../rdq/RDQ-spec-classroom-media-focus-20260927.md`。
- 新舊題目圖片縮半且保留原圖、題幹與答案 1:2／圖文 1:2、點圖放大；圖片音檔共存；各組拉霸滾輪音效、右上大字加分與回合總分；教師播片自動學生 Eyes Up Front，暫停／结束保持專注直到教師解除或換頁。
- 193/193 網站測試、10/10 Functions、7/7 模擬器整合、Chrome 雙瀏覽器及 46 堂課資料驗證通過，22 檔與驗證副本雜湊一致。
- 詳細交接：`../rdq/IMPLEMENTATION-classroom-media-focus-20260927.md`；成果與紀錄：`../qa/classroom-media-focus-20260927/`。
- 尚未部署、未批次更改正式舊圖、未 Git commit／push。部署需另行授權；之後教師親自解鎖課程庫執行舊圖升級，再做實體 iPad／教室喇叭驗收。

## 2026-09-27 題目媒體／拉霸／影片專注模式（正式部署完成）
- 使用者明確「確認部署」後，已發布 `hwg7teaching` 的 `hosting:lesson-hub-v03`（101 檔）及 `teacher-access` 的 `liveV2`／`liveMediaV2`。正式入口：https://lesson-hub-v03.web.app/lab 。此紀錄取代上方本機完成階段的「未部署」狀態。
- 後端 `livev2-00010-kaz`、`livemediav2-00006-zoc` 均 Ready；正式入口與 JS/CSS、插圖、音效共 7 檔 HTTP 200 且 SHA-256 與建置一致。正式 Chrome 雲端介面及教師登入入口 smoke 通過，無 JavaScript 頁面錯誤。
- 正式舊圖尚未批次升級；教師需親自解鎖課程庫執行「將舊題目圖片縮半」，並於實際 iPad／教室喇叭驗收。未驗收正式私有課程及外部 YouTube 實播。
- 詳細部署紀錄：`../rdq/DEPLOYMENT-classroom-media-focus-20260927.md`；7 個部署驗證檔案：`../qa/classroom-media-focus-20260927/production/`。未 Git stage／commit／push，未更新 Obsidian，未關機。
- 登入安全待辦：本次 CLI 帳號查詢意外將登入權杖回傳至工具輸出，已告知使用者；應由使用者撤銷受影響授權並重新登入。專案紀錄不含權杖值。

## 2026-09-27 收工保存 / Closeout
- 本次正式部署後交接與 Obsidian 四區已保存並讀回；詳見 ../rdq/CLOSEOUT-classroom-media-focus-20260927.md。Git 混合工作区未 stage／commit／push，實機驗收、舊圖升級及登入授權撤銷待辦保留。電腦與其他工作維持運作。


## 2026-10-01 全對才進遊戲／無限重試（正式部署完成）
- 使用者「先這樣，直接開始」確認 RDQ，再以「直接部署正式站」授權發布。規格：`../rdq/RDQ-spec-mastery-retry-20261001.md`。
- 除塗鴉／文字雲／開放式／錄音外，10 種客觀題須全對才獲兩次遊戲機會。未全對保留答案無限重試；倒數歸零可改，但教師鎖題／公布／換頁停止作答，同題不重複發獎。
- Try Again／Great 英文語音與兩張同角色 256×256 透明小超人搭配短暫動畫；全對 1.5 秒後顯示遊戲，提示不蓋答案。保留靜音／減少動畫，輪詢、重送、刷新不重播。四個網站素材共 40,708 bytes，原始 PNG／WAV 與來源記錄保留。
- 207/207 網站、10/10 Functions、8/8 Firestore 整合、Chrome 師生獨立瀏覽器 10 種題型、46 堂課資料驗證、安全／正式部署檢查與 Vite 建置通過；33 個交付檔與測試／發布副本雜湊一致。
- 已發布 `hwg7teaching` 的 Hosting `lesson-hub-v03`（109 檔）及 `teacher-access:liveV2`。後端 `livev2-00011-laf` Ready；109/109 正式檔案 HTTP 200 且 SHA-256 一致，正式 Chrome 雲端介面／教師入口／兩圖兩音解碼通過。請重新整理 https://lesson-hub-v03.web.app/lab 。
- 詳細交接：`../rdq/IMPLEMENTATION-mastery-retry-20261001.md`；部署：`../rdq/DEPLOYMENT-mastery-retry-20261001.md`；QA：`../qa/mastery-retry-20261001/`；本機試聽：http://127.0.0.1:5191/qa-mastery/ 。
- 正式私人課程與教室 iPad／喇叭未由自動化驗收，未提交正式測試資料。未發布規則／Secrets／Worker／liveMediaV2，未 Git stage／commit／push，未執行收工或 Obsidian 同步。既有舊圖升級與實機待辦保留。

<!-- lesson-hub-mastery-closeout-20261001 -->
## 2026-10-01 收工保存 / Closeout
- 本次正式部署後交接與 Obsidian 四區已保存、讀回；詳見 ../rdq/CLOSEOUT-mastery-retry-20261001.md。33 個來源檔／4 個原始素材核對一致，正式入口與四個回饋素材 5/5 讀回一致；後端 livev2-00011-laf ACTIVE。Git 混合工作區未 stage／commit／push，HEAD 與遠端 main 皆 24157d756e52864c5af87f21ead9e83af8a80c1c；範圍確認與教室 iPad／喇叭驗收待處理。GDrive 雲端服務端同步未另驗，電腦與其他工作維持運作。

## 2026-10-01 教材投影片畫布完善版本（本機完成，未部署）
- 使用者「先這樣，直接開始」確認 RDQ 推薦選項及建議，已實作 16:9 畫布、上方集中工具列、Comic Relief 正文方塊／選字格式／四段字級、圖片整合入口、音檔上傳錄音、MP4／YouTube／Canva／Google Slides 與五主題。
- 舊教材顯示新配置並保留內容／素材／連結／原稿；原稿還原雜湊一致。轉題保留來源並建立可編輯的隱藏副本，學生圖左文右及22／24／28／32px，完成正解後由教師確認顯示；學生快照不含原稿及教師備註。
- 網站217/217、Functions10/10、本機 Firestore／Storage10/10、Vite建置、共用模型、教師安全及46堂課來源資料驗證通過；Chrome兩套操作檢查17組、四種寬度、模擬觸控與全螢幕通過。模擬器驗證需使用 `--test-concurrency=1`，避免規則測試清空資料庫干擾保存測試。
- 交接：`../rdq/IMPLEMENTATION-slide-canvas-20261001.md`；規格：`../rdq/RDQ-spec-slide-canvas-20261001.md`；QA／來源雜湊：`../qa/slide-canvas-20261001/`。本機預覽：http://127.0.0.1:5192/lab 。
- 未部署、未改寫正式舊課程、未 Git stage／commit／push、未收工或 Obsidian 同步；自動化使用合成素材／假麥克風／外部預覽與搜尋測試資料，實際共享內容及iPad／喇叭／投影仍待教師驗收。正式發布須另行授權並一起更新 Hosting 與 liveV2；既有正式版本及實機待辦保留。
## 2026-10-01 Comic Relief 投影修正／YouTube 修剪（本機完成，未部署）

- 已修正預覽字型資源失敗，Comic Relief 400／700 與授權文件放入專案；編輯、投影與學生題幹實際字形共 6 個節點確認為 Comic Relief。
- 加入 YouTube 後自動開啟修剪；可設定起訖分、秒與拖曳時間軸，片段至少 5 秒。選取既有影片可按「✂ 修剪影片」重改；保存、復原、轉題、教師同步與學生題幹保留範圍，到終點停止，重播由起點開始。
- 223/223 網站、10/10 Functions、11/11 本機 Firestore／Storage，共244項通過；Chrome操作6組、3種寬度、實際字型、待播不跳轉及課堂片段終點通過。公開 YouTube 00:05–00:10 實播讀回起點約5.0787、終點約10.0172秒；學校裝置及正式私有教材仍由教師驗收。
- 交接：`../rdq/IMPLEMENTATION-youtube-trim-20261001.md`；證據與來源／驗證副本雜湊：`../qa/slide-canvas-youtube-trim-20261001/`。本機預覽：http://127.0.0.1:5192/lab ，重新整理即可使用。
- 原教材與前一輪 QA 保留；未部署、未 Git stage／commit／push、未收工或 Obsidian 同步。正式發布須另行授權並一起更新 Hosting 與 liveV2。

## 2026-10-01 教材畫布／Comic Relief／YouTube 修剪（正式部署完成）

- 使用者以「開始部署正式站」明確授權，已發布至 https://lesson-hub-v03.web.app/lab 。此紀錄取代上方兩階段的未部署狀態。
- 更新 `hwg7teaching` 的 `hosting:lesson-hub-v03`（101 檔）及 `functions:teacher-access:liveV2`；後端 `livev2-00012-lap` ACTIVE／Ready，建立與就緒版本一致。
- 畫布上方工具列、五主題、正文／選字格式、整合媒體、轉題字級、Comic Relief 自帶一般／粗體字型與 YouTube 最短 5 秒起訖修剪一併上線。35 個來源檔與測試／發布副本一致，既有 public 素材 60/60 保留。
- 正式雲端建置、教師存取與部署閘門通過，244 項測試及本機 Chrome／公開 YouTube 實播證據保留。發布與正式讀回詳見 `../rdq/DEPLOYMENT-slide-canvas-youtube-trim-20261001.md`、`../qa/slide-canvas-youtube-trim-20261001/production/`。
- 正式 101/101 檔案 HTTP 200＋SHA-256 一致；Chrome 雲端入口與 runtime 專案通過，正式字型資源實際字形確認 Regular／Bold。QA 主動攔截匿名 Auth／reCAPTCHA 的非讀取請求，截圖的 Auth 網路提示由此造成；未驗收正式教師登入或私人教材，未送出課程寫入。
- 原稿與既有教材內容保留；未批次更改正式課程／作答資料。未發布規則、Secrets、Worker、其他 Functions，未 Git stage／commit／push，未執行收工或 Obsidian 同步。教師私有教材、iPad／喇叭與實際投影仍待教師驗收。


<!-- lesson-hub-slide-canvas-closeout-20261001 -->
## 2026-10-01 教材畫布／Comic Relief／YouTube 修剪：收工保存
- 專案交接與 Obsidian 四區已保存、讀回，原有筆記全文／frontmatter 保留；詳見 ../rdq/CLOSEOUT-slide-canvas-youtube-trim-20261001.md。
- 收工再次核對35個來源／發布ZIP與正式入口、主JS／CSS、兩字型共5項一致；livev2-00012-lap維持ACTIVE／Ready。前一輪244項測試與101/101正式發布核對保留。
- Git main與遠端同為24157d756e52864c5af87f21ead9e83af8a80c1c，索引0，未stage／commit／push。187檔同步候選見 ../rdq/GIT-SCOPE-slide-canvas-20261001.md；混合工作區與舊Live基線須先確認範圍。
- GDrive掛載副本已保存，雲端服務端同步未另驗。教師私有課程／iPad／教室喇叭／投影、既有舊圖升級及CLI授權待辦保留；電腦與其他工作維持運作。
## 2026-10-03 教材畫布187檔Git同步授權

- 使用者指定依`../rdq/GIT-SCOPE-slide-canvas-20261001.md`的187個路徑提交並推送。
- 本次提交10/1教材畫布／YouTube修剪與其所需Live基線，接在既有`353016c9482268feffdd3f5672aecded77f59e39`之後。四個後來接入新遊戲的共用程式檔採10/1驗證副本，10/3新遊戲來源及本機變更保留。
- 提交快照另行建置與測試；最終提交編號、遠端讀回及工作區保留核對見`../qa/git-sync-slide-canvas-20261003/result.json`。
