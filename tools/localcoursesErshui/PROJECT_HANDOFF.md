# 二水國小「在地課程」專案交接摘要

- 初次交接日期：2026-08-09
- 主目錄遷移日期：2026-08-25
- 唯一現行專案根目錄：`G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui`
- 舊來源／回復副本：`C:\firebase-deploy\在地課程`（不再作為開工位置）
- 目前主成果：四年級上學期四個單元、20 節課教案；三個單元的圖像／影音前置教材；「坐火車趣集集」Firebase 互動網站
- 正式網站：<https://hwg8-u01-listen-and-speak.web.app>
- Google 文件：<https://docs.google.com/document/d/1ZIVs007MKpiabjw3pRdrfbp406K_4b9oe6XpVupZm04/edit>

## 一、目前總狀態

本專案已從最初的「三年級 Colors 融入在地課程」探索，轉為以四年級原有在地課程單元為主軸，完成四年級上學期四個單元的教案架構、20 節逐節教學流程、課綱對應、教材圖像及部分數位教材。後續再把第 3–10 週〈坐火車趣集集〉第 4 節發展成可公開使用的 Firebase 模擬購票網站，並加入教師後台、學習紀錄、PDF、作答重播及無聲螢幕錄影機制。

目前可直接延續工作的三個主要入口如下：

1. 四份教案：`G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui\在地課程4年級上學期教案`
2. 網站原始碼：`G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui\sites\grade4-local-curriculum`
3. 課程大架構 Google 文件：上方 Google 文件連結

## 二、已確認的設計原則

1. 課程分析只針對正式名稱為「在地課程」的內容，不把〈繽紛校園（一）〉等其他課程混入。
2. 以三、四年級原有在地課程單元與既定學習活動為主軸，不大幅改變單元核心。
3. 英語是主要融入領域；社會與綜合活動作為支援。每個活動都要符合四年級程度。
4. 英語單字、句型與生活用語優先取自三、四年級英語部定課程、彈性課程計畫及《臺北市國民小學英語聽說評量手冊》。例如依課程改用 `What’s this? It’s a ... / What’s that? It’s a ...`。
5. 課綱對應要分開列出「學習表現」與「學習內容」，包含完整編號與敘述，方便直接貼入課程計畫。
6. 每節課先列核心口說、句型、生活用語、核心字詞、延伸字詞與中譯，以及教師課前需準備的數位教材、手作教材和學習單。
7. 每節課以 Warm-up、Presentation、Production、Wrap-up 四階段撰寫；各階段先有一句主標題，再具體寫出教師操作、學生任務、師生互動、時間與成果。
8. 無法實地踏查時，改用官方照片、影片、地圖、教師預錄導覽與教室資料探究，不假裝學生已親自到場。
9. 教材事實先查官方或可信來源，再生成提示詞或圖片；重要資料採「主要來源＋交叉來源」。AI 圖只作教學示意，站名、路線、地標與年代仍需人工核對。
10. 產生圖片前要先和教師確認提示詞。教材內中文須為繁體中文，英文偏好 Comic Sans／兒童易讀字體。

## 三、課程研究與參考來源

本機已整理並使用的核心來源包括：

- `3年級 校定課程.pdf`
- `4年級 校定課程.pdf`
- `何嘉仁三年級英語部定課程計畫.docx`
- `何嘉仁三年級彈性課程計畫.docx`
- `何嘉仁四年級英語部定課程計畫.docx`
- `何嘉仁四年級彈性課程計畫.docx`
- `臺北市國民小學英語聽說評量手冊.pdf`
- `語文領域-英語文.pdf`
- `課程綱要國民中小學暨普通型高級中等校-社會領域.pdf`
- `課程綱要國民中小學暨普通型高級中等學校─綜合活動領域.pdf`

## 四、主要教案成果

四份現行教案均已確認含有學習目標、領域課綱對應、學習表現、學習內容及四階段教學流程。共涵蓋 2＋8＋4＋6＝20 節課。

| 單元 | 節數 | 現行 Word 檔 |
|---|---:|---|
| 第 1–2 週〈扇形車庫〉 | 2 | `在地課程4年級上學期教案\01_第1-2週_扇形車庫.docx` |
| 第 3–10 週〈坐火車趣集集〉 | 8 | `在地課程4年級上學期教案\02_第3-10週_坐火車趣集集.docx` |
| 第 11–14 週〈閱覽鐵道風華〉 | 4 | `在地課程4年級上學期教案\03_第11-14週_閱覽鐵道風華.docx` |
| 第 15–20 週〈介紹五分車與認識小火車鐵道〉 | 6 | `在地課程4年級上學期教案\04_第15-20週_介紹五分車與認識小火車鐵道.docx` |

同一資料夾另保留 4 份〈坐火車趣集集〉歷次修改前備份。資料夾目前共有 8 份 DOCX；所有教案均未把教材圖片直接嵌入 Word，圖片放在相對應教材資料夾中。

### 早期參考版本

根目錄另有兩份 Animals 融入教案：

- `二水國小四年級在地課程_Animals融入教學詳案.docx`
- `二水國小四年級在地課程_Animals融入教學詳案_教室資料探究版.docx`

這兩份是重啟四年級完整任務前的早期版本，只作參考，不是目前四年級上學期四單元的主教案。

## 五、教材與圖像成果

`在地課程4年級上學期教案` 目前共有 112 個檔案：65 PNG、24 JPG、8 DOCX、5 HTML、4 MP4、4 Markdown、1 WebP、1 CSV。

| 教材資料夾 | 檔案數 | 已產出重點 |
|---|---:|---|
| `01_第1-2週_扇形車庫 教材` | 0 | 尚未製作獨立教材檔 |
| `02_第3-10週_坐火車趣集集 教材` | 73 | 官方來源清冊、圖片 QA、二水站暖身圖 3 張、一致性參考板 3 張、12 張分鏡圖、12 張無字乾淨母版、雙語 Flow 提示詞、4 個 Flow 原始影片及聯絡表 |
| `03_第11-14週_閱覽鐵道風華 教材` | 14 | 六張支線故事圖卡（2 張圖檔）、四類景觀照片組、山線／海線教學簡圖原版與 v2 校對版、雙圈圖範例答案、三種來源卡、學生版雙圈圖學習單及參考圖 |
| `04_第15-20週_介紹五分車與認識小火車鐵道 教材` | 17 | 八張五分車事件卡（2 張圖檔）、雙圖、軌距與糖業運輸簡圖、今昔照片組、六步流程卡、資料卡、雙圈圖答案、資料偵探卡、6 張學習單與教師讀本文字稿 |

### 山線／海線簡圖的重要決定

原版簡圖曾因路線與站點錯誤被退回，後來依教師提供的四張參考圖製作 `04_臺灣西部山線海線教學簡圖_v2_校對版.png`。規格為山線綠色、海線藍色，向南延伸到二水，標示竹南、苗栗、豐原、臺中、白沙屯、大甲、沙鹿、彰化、員林、二水，並加入方向、鄰近地標及 mountain／coast／plain／city 景觀。此 v2 檔仍建議教師在正式印製前做一次最後人工核圖。

### Flow 影片狀態

- 12 張分鏡圖與 12 張乾淨母版已存在。
- 中文／英文 Google Flow 動態提示詞已整理，並加入溫暖親切的中文旁白與主題音效要求；不使用字幕。
- 目前只有 4 個 Flow 原始 MP4，不是完整 12 段。
- 已知 `Railway_map_lights_up_route_202607281821.mp4` 曾出現中文字亂碼與錯誤站名；這支不能直接當正式教材。
- 因 Flow 操作速度太慢，教師已明確停止代操作影片生成。後續若續作，應由教師依已整理提示詞逐段生成並人工核對二水、集集、水里、車埕四站。

## 六、Google 文件狀態

文件標題為「三、四年級在地課程：英語、社會與綜合活動融入擴充大架構」，目前只有 1 個分頁。

本次交接已重新確認：

- 「三、上學期架構」仍在文件中。
- 「四、下學期架構」仍在文件中。
- 〈坐火車趣集集〉與〈介紹五分車與認識小火車鐵道〉文字仍可找到。
- 「四年級逐單元學習活動詳案」已找不到，符合把詳案拆成四份 Word 的決定。

此 Google 文件是跨年級大架構；四年級上學期逐節詳案則以本機四份 Word 為準。

## 七、Firebase 網站成果

### 專案與正式環境

- 原始碼：`sites\grade4-local-curriculum`
- Firebase project：`hwg8-u01-listen-and-speak`
- 計費方案：Blaze
- Hosting：<https://hwg8-u01-listen-and-speak.web.app>
- Firestore：`tickets-v2`
- Storage：`tickets-v2/{uid}/{attemptId}/`
- Functions 區域：`asia-east1`
- 資料保存期限：一年

首頁有四個單元入口：〈扇形車庫〉、〈坐火車趣集集〉、〈閱覽鐵道風華〉、〈介紹五分車與認識小火車鐵道〉。已部署正式站目前只有〈坐火車趣集集〉的模擬購票為完整互動功能；現行本地工作樹另已加入〈閱覽鐵道風華〉Read and drag 前端原型，但尚未部署，也尚未完成後端紀錄需求。

### 學生端已完成

1. 首頁標題「火車線上購票網站—Buy Train Tickets Online」，全站英文字級放大並採多巴胺配色。
2. 七步模擬購票：輸入五位學號、選最近尚未經過的週五至週日、由二水選集集／水里／車埕、選時段與車次、核對行程、產生練習車票、完成與慶祝。
3. 09:00–12:00 只顯示已核對的臺鐵車次 2707、2711、2713；不同目的地有相應抵達時間。
4. 每一步答對顯示 `You’re right!`、動畫與音效。
5. 摘要會顯示日期、車次、出發與抵達資料，缺值時不能勾選。
6. 練習票採兒童友善 3D 手繪／多巴胺配色；欄位已改為 DATE／TRAIN、FROM 下方 DEPART、TO 下方 ARRIVAL、STUDENT 右下角，取消 CAR／SEAT。
7. 完成後產生 7 頁 PDF、分數與慶祝畫面。

### 教師後台已完成

1. 只顯示遮蔽密碼欄，密碼由 Firebase Secret Manager 保存，不寫入前端、Git 或本交接檔。
2. 成功登入後取得 `teacher: true` 權限；可依練習日期與學號篩選、匯出 CSV、看 PDF、查看詳細資料及刪除紀錄。
3. 教師後台的日期已改為學生按下「開始練習」當下的臺灣日期 `practiceDateTaipei`，不是學生所選的搭車日期 `travelDate`。
4. 支援裝置可由學生主動授權分享目前分頁，以 `getDisplayMedia({audio:false})` 與 `MediaRecorder` 錄製無聲畫面；格式支援 WebM／MP4，上限 80 MB。
5. 不支援或拒絕錄影時，以事件資料重建七步驟的實際畫面與操作狀態；原始事件文字清單預設收合。
6. 舊紀錄可由後端依伺服器 `createdAt` 回填練習日期；無可信日期者標為未確認。

### 雲端 Functions

本次交接透過 Firebase CLI 重新確認下列 4 個 Functions 仍存在，皆位於 `asia-east1`、Node.js 22：

- `activateTeacherAccess`（callable）
- `backfillPracticeDates`（callable）
- `cleanupExpiredTicketAttempts`（scheduled）
- `createTicketAttemptV2`（callable）

### 已部署基線與本地現況驗證

- 2026-08-09 已部署基線：`npm.cmd run firebase:test` 12 項測試全部通過。
- 2026-08-25 現行本地工作樹：正式前端建置成功，13 項測試全部通過；新增第 13 項只檢查 Read and drag 基本雙圈圖結構。
- Firebase 前端正式建置成功。
- 正式網址以 Node.js 讀取回應為 HTTP 200，頁面標題為「4年級上學期 在地課程」。
- 建置仍有大型 JavaScript chunk 警告，但不影響本次建置及測試通過。

## 八、程式與自動化工具

根目錄保留下列產製／驗證工具，可供重建文件與教材：

- `build_animals_local_course_docx.py`
- `build_google_doc_sync_payload.py`
- `build_grade4_sem1_docs.py`
- `build_teaching_assets.cjs`
- `compose_lesson1_worksheet_png.py`
- `extract_course_sources.py`
- `grade4_sem1_lesson_data.py`
- `verify_grade4_sem1_docs.py`
- `verify_teaching_assets.py`
- `RDQ-skill-validation-report-20260727.md`

網站另有：

- `FIREBASE_DEPLOYMENT.md`：正式部署、安全與維護說明。
- `rdq\RDQ-spec-teacher-practice-date-screen-replay-english-font-20260730.md`：已確認的日期、錄影／重播與英文字級需求。
- `tests\firebase-site.test.mjs`：現行本地工作樹共有 13 項網站驗收測試。
- `tests\firebase-rules.test.mjs`：Firestore／Storage emulator 規則測試。

## 九、尚未完成或需要再次確認

1. 〈扇形車庫〉教材資料夾仍空白。
2. 12 段 Flow 正式影片尚未完成；現有 4 個原始 MP4 不可視為正式 90 秒影片成品。
3. 山線／海線 v2 校對版雖已產出，仍需教師做最終站序、位置、地標與文字核對。
4. 「雙圈圖 Read and drag」已有本地前端原型：12 張雙語卡、三區分類、拖曳／點選替代操作、整批檢查及成功訊息；尚未做到規格要求的 18 張卡、放錯立即退回、姓名欄、逐次拖曳事件持久化、分數／事件重播資料庫與完成慶祝動畫，亦尚未部署。
5. 已部署正式站中，〈閱覽鐵道風華〉及其餘兩個單元仍是占位頁；本地只有前述 Read and drag 原型。
6. 臺鐵車次資料查證日為 2026-07-29；正式上課前必須再查臺鐵官方時刻，不能把目前資料視為永久時刻表。
7. `README-SPEC.md` 仍保留早期 ChatGPT Sites／Cloudflare 規劃，內容已落後於現行 Firebase 架構；目前應以 `FIREBASE_DEPLOYMENT.md` 和 Firebase 原始碼為準。
8. `firebase:test-rules` 需要本機 Java／Firebase Emulator；先前未完成本機 emulator 規則測試。雲端規則編譯、正式功能與學生端流程曾通過，但後續仍建議補測。
9. Firebase App Check 的 Console 強制執行狀態未在本次交接核對；部署文件仍把 reCAPTCHA Enterprise 設定與觀察後啟用強制執行列為維護步驟。
10. iPad／瀏覽器的螢幕分享能力依裝置而異；拒絕或不支援時會使用事件重建備援，仍應在實際上課用 iPad 做一次完整演練。

## 十、建議的下一步順序

1. 完成〈閱覽鐵道風華〉Read and drag 規格差距：18 張卡、立即退回、姓名、逐次事件、分數、教師重播、慶祝動畫與完整測試；教師確認後才部署。
2. 補做〈扇形車庫〉教材，讓四個上學期單元都有獨立教材檔。
3. 由教師使用已確認提示詞完成 12 段 Flow 影片，逐段檢查旁白、站名、路線與音效，再剪成 90 秒成品。
4. 對山線／海線 v2 圖與各圖卡做最後一次「官方來源＋人工核圖」。
5. 正式上課前更新臺鐵時刻資料，重跑當時完整網站測試套件。
6. 安裝 Java 後執行 `npm.cmd run firebase:test-rules`。
7. 更新或封存過時的 `README-SPEC.md`，避免後續誤用舊的 ChatGPT Sites 架構。
8. 若要跨電腦協作，先為網站 Git 儲存庫設定明確的 GitHub 遠端，再推送；不要覆蓋現有不相關網站。

## 十一、Git、Google Drive 與 Obsidian 收工狀態

- 新唯一主目錄為 `G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui`；C 槽原專案完整保留為回復副本，不再雙向維護。
- 遷移前網站內層 Git 基線為 `770a31e Build Grade 4 local curriculum ticket practice site`，無 remote；其後 5 個 Read and drag 工作樹檔案已連同現行內容納入新專案。內層 `.git` 已排除，後續由父層 `Samsamchou/teacher-toolkit` 管理。詳見 `sites\grade4-local-curriculum\LEGACY_GIT_HISTORY.md`。
- G 槽專案共 273 個檔案；`migration\MIGRATION_MANIFEST_20260825.csv` 列 272 個 payload、171,028,218 bytes，逐檔 SHA-256 不一致 0；清冊 SHA-256 為 `33639eeaaac945c5a35c7c1b0f7efafdd499d63de9cdb051a2a10af304b82464`。
- 主要遷移提交 `bf44925d287582a7179356fcd9a3786924aae667` 已推送；當次以 GitHub API 讀回 `main`，與本機 HEAD 及 `origin/main` 相同。其他 8 個不相關未追蹤根目錄未納入。
- Obsidian `G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md` 已更新並讀回，包含新主路徑、完成狀態、Git、遷移驗證、限制與下次入口。
- Google 文件已在本次交接以連接器只讀確認，沒有再修改內容。
- G 槽掛載資料的逐檔讀回不等於 Google Drive 遠端上傳完成；仍須以 Google Drive 桌面程式的同步狀態為準。

## 十二、下次開工的第一句指令

可直接對 Codex 說：

> 繼續二水國小在地課程專案。唯一主目錄是 `G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui`。先讀取該目錄的 `AGENTS.md`、`PROJECT_HANDOFF.md` 與 `WORK_LOG.md`，再只處理「尚未完成或需要再次確認」的項目，不要重做已完成成果。
