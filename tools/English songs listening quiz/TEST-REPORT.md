> 2026-09-12最新狀態：使用者已核准15題，正式首頁已套用。下方未核准／舊題庫敘述是前次測試歷史，人工音訊测量仍未另做。

# 2026-09-12 校準與練習成績更新驗證

正式專案：G:/我的雲端硬碟/teacher-toolkit/tools/English songs listening quiz
本次預覽：http://localhost:8022/review#song/yesterday-once-more

## 已完成
- 15題指定影片音訊的兩輪自動逐字對齊；已提供原句、挖空、選項、答案、秒數、字表證據與音訊雜湊。
- 從全曲開始播放，句尾暫停出題；每題2次、第二次正確不扣分、無限重播且重播中隱藏／鎖定選答。
- 每次選答即保存當次成績；中途停止也保留。老師先看到總分，其次是答對／答錯／未作答與答錯原句。
- 同一次練習以sessionId和revision合併，CSV與統計不重複計算每次進度。
- 本機試作紀錄與待雲端同步佇列分開，避免日後設定Firebase時自動上傳示範紀錄。

## 實際測試
- 核心控制器／JavaScript語法：通過。涵蓋停止確認後才作答、重播期間鎖定、不中斷尾段、兩次機會配分、小數分數與session合併。
- 隔離Edge瀏覽器＋模擬播放器：通過重試、重播隱藏、次數保留、提前結束、錯題句子、重新整理後本機成績保留、歌曲結束後學生顯示100.00分。
- Firestore本機模擬器：157項斷言通過，包含學生create-only、指定老師read-only、禁止update/delete、未完成紀錄、1–15題各種配分。
- 真實YouTube影片：15/15題均觀察到PAUSED(2)且answering；第一題實際重播成功；沒有頁面JS錯誤。
- 停止並回定位後讀取的位置與設定end差距最大0.100秒。這是播放器回報位置，不是人工確認的歌聲尾音誤差。前3題及第一題重播使用1倍速，後段測試使用2倍速。
- 第15題完成時仍處於outro；最後播放器到292.701秒且ENDED後才顯示學生最終100.00分。

## 尚待驗收的界線
- 題庫內容與人工逐句聽校尚未核准。radio句尾兩輪相差0.70秒，其餘句尾差距最高0.34秒；相鄰句交界請優先試聽，特別是And、So開頭。
- small.en的兩輪搜尋範圍對齊不等於兩個獨立模型。較大型模型下載未完成且已停止，沒有使用其結果，也沒有付費API调用。
- 正式首頁內建舊題庫保留等待教師核准。新版在本機/review；該審閱HTML位於review目錄，不在Hosting public目錄。
- 真實iPad Safari尚未測試。正式Firebase設定仍為placeholder，未實測正式Auth及兩台裝置同步，未部署。
- 關閉頁面或斷網不能保證立即傳送；後台先顯示最後已同步的進度，待同瀏覽器同網址重新連線後補送。清除本機資料會清除未同步紀錄。

## 如何查看教師成績
開本機/review → 啟用影片 → 輸入學號 → 答幾題 → 按「結束本次練習並保留成績」→ 右上「教師後台」。
例如15題中答對3、答錯2、未作答10，顯示20.00分，並列出2句錯題。第一次錯第二次對仍列為答對。

部署需完成教師驗收和Firebase設定後，才在VS Code執行：
`firebase deploy --project yestredayoncemore --only hosting,firestore`

播放器API依據：https://developers.google.com/youtube/iframe_api_reference

## 2026-09-12 正式發布前檢查
- 15題教師核准並已套用。紅色rgb(185,28,28)、綠色rgb(21,128,61)、延遲鎖定與提前結束取消延遲的瀏覽器檢查通過。
- Firebase目標yestredayoncemore，Web App與正式Hosting公開設定一致；Anonymous與Email/Password已啟用，既有教師Email帳號存在且未停用。
- 既有規則只涵蓋quizResults；新版以指定教師唯讀與匿名新增取代原規則，保持禁止修改／刪除。

## 2026-09-12 正式部署完成
- 使用者本輪明確核准15題、37檔commit/push，並追加「本機完成後直接部署正式Firebase」。
- 正式網站：https://yestredayoncemore.web.app 。Hosting及Firestore規則已部署成功，線上HTML與本機SHA-256一致：e0d65e2deb4bf9a6ceb1bd257728784078aa8e4fee26e9e1a9914967d5095dcf。
- 正式瀏覽器驗證：15題核准題庫、錯誤紅色、正確綠色、第二次答對保留滿分；答對1題提前結束顯示6.67分、未作答14題，成績取得伺服器確認；匿名讀取被拒絕，無頁面JS錯誤。
- 驗證使用獨立quizId deployment-check-20260912，未混入正式cloze-v2排行榜。未登入或修改老師密碼；真實教師登入操作及實體iPad仍待使用者驗收。
- 本輪Git推送結果與commit hash另寫入既有Obsidian工作筆記，其他工具不納入。


# 日期篩選與 San Francisco 審閱交付｜2026-09-13

正式專案：G:\我的雲端硬碟\teacher-toolkit\tools\English songs listening quiz

## 已完成
- 教師日期篩選、臺灣開始日期、舊紀錄替代時間標示、無日期紀錄、前一天／今天／後一天、全歌曲／版本、同步CSV。
- 新成績 schemaVersion 3，startedAt 在開始練習時固定；schemaVersion 2離線佇列仍可補送。
- 影片檔 adapter 與限定路徑、Range 206/416 本機伺服器；既有 YouTube 路徑保留。
- San Francisco 原字幕文字與音訊對齊 SRT、無字幕MP4、16題JSON及教師審閱稿。

## 驗證
- 真實 MP4 播放完成16題：啟用、逐題暫停、重播隐藏選項且次數保持、紅綠、第二次答對全分、答錯兩次0分、最後題後片尾，15題正確得到93.75分。零頁面JavaScript錯誤。
- 日期午夜分界、跨日補送、不同歌曲與版本、最新進度合併、兩種舊時間替代、無日期紀錄測試通過。
- 瀏覽器按日期切換及CSV測試：9/12兩筆25與50分，平均37.50；9/13一筆100分，CSV不混入另一日。
- Firestore Emulator 181項斷言通過（含schema3、schema2相容、錯誤時間與權限拒絕、1至16題計分）。
- Yesterday Once More 原有紅綠、重播、提前結束與儲存流程回歸通過。
- 原片與無字幕版解碼音訊 SHA256 完全相同；9個均勻取樣畫面確認底部歌詞移除。

## 審閱方式
目前伺服器：http://localhost:8013/review/san-francisco
點各題「試聽原句」可播放並在句尾暫停；上方連結可跑學生完整練習。
重新啟動：在專案目錄執行 node server.mjs，預設8000；8013需先設定 PowerShell $env:PORT=8013。

## 限制與待確認
- 兩輪時間定位是自動音訊對齊，未宣稱人工聽校。第8題句尾差0.76秒，優先審聽；12/13題冠詞校正待審。
- MP4裁除底部100px，1280×620；上方原有標題與標誌保留。
- 32誘答選項屬基本1200字；whole正解在其他常用800字。
- 尚未用實體iPad/Safari測試；桌面Edge真實MP4流程已驗證。
- 目前教師會讀取可見的全部成績再在本機合併與篩選；未加只查新日期欄位的查詢，以免漏掉舊資料，資料量很大時需另設日期索引與遷移策略。
- San Francisco尚未核准，僅在review資料夾，不會由Firebase public部署。


## 正式日期功能發布

2026-09-13：Firebase Hosting + Firestore 部署成功，目標 yestredayoncemore。正式 HTTP 200，HTML SHA256 與本機一致：027c2fb598366c423fb8696377744ee45c05a5fd311962a617a0a188a2102864。只發布 public/index.html；San Francisco 影片與題庫均留在 review，待教師審閱。

教師操作：登入教師後台 → 選擇練習日期 → 看本次總分、答對／錯題／未答與句子 → 下載該日期CSV。


正式發布確認：Hosting 成功發布2個檔案。正式HTML與MP4雜湊均符合本機；影片Range206通過，六年級入口、16題核准版本、影片啟用通過。未新增正式測試成績。
正式網址：https://yestredayoncemore.web.app/#song/san-francisco


# 教師後台紀錄與保存期限更新

正式專案：G:\我的雲端硬碟\teacher-toolkit\tools\English songs listening quiz

## 教師表格
9欄：學號、本次總分、歌曲、練習狀態、答對、答錯、未作答、答錯的句子、答錯一次到再次答對的句子與錯誤選項。
第九欄完整標題沿用老師指定句子。CSV同步日期篩選與上述資料。

新增欄位範例：When I was young／第一次選錯：A. your → 第二次答對：C. young。
只有兩次作答後答對才列入；第二次仍錯的句子列於原有「答錯的句子」。舊紀錄不臆測作答過程，顯示未記錄。

## 刪除與權限
在學號上按右鍵，或點學號旁⋯，選「刪除這一次練習」，確認學號、歌曲、日期及分數後刪除。
先建立防補送標記，再刪除相同ownerUid/sessionId的所有快照；保留其他次練習。同次刪除可重試；只有指定教師可操作。
學生不可讀取成績、不可刪除或修改成績。學生只可查看自己指定的刪除標記以丟棄被刪除的待送進度。

## 14個月保存
採臺灣時間的14個曆月，月底取最後有效日。2026/09/13開始 → 2027/11/13到期。
新資料schema4保存固定startedAt、expiresAt及retryDetails。待送的舊schema2/3由新版網頁升級，保留其原始時間，無重試細節則明列未記錄。
新安全規則不再接受舊網頁直接送出schema2/3，避免過期舊格式重新寫回；已開啟的舊網頁請重新整理，瀏覽器待送進度會由新版處理。
每天04:00 Asia/Taipei，purgeExpiredQuizResults在asia-east1執行；依同次練習最早開始時間判斷，缺少時依最早紀錄、提交、雲端建立時間。到期後下一次排程永久刪除所有快照及到期標記。
本機暫存於開頁、送出及每分鐘執行到期清理；關閉／離線裝置不能遠端實體抹除。下載CSV及自行備份不在遠端清除範圍。
清除程式為相容舊資料，每日讀取全集合、分頁500筆、刪除分批400筆。用量會依快照數增加；函式最多1個執行個體、512MiB、540秒，排程失敗最多重試3次。
當前資料庫未啟用PITR（已讀回POINT_IN_TIME_RECOVERY_DISABLED）。

## 驗證
- 195項Firestore規則斷言通過：教師刪除、匿名拒絕、其他練習保留、補送拒絕、期限拒絕、舊格式讀取與刪除。
- 真實Emulator整合清除通過：同次全部快照、舊資料替代時間、已標記刪除、到期標記、重跑安全。
- 瀏覽器驗證：9欄、重試原句與A/B/C文字、取消／確認刪除、只移除選取練習、本機到期清除。
- 原有紅綠選答、第二次全分、重播不扣次數、提前結束、片尾計分、日期篩選測試通過。
- 排程套件已安裝並成功載入函式設定；本機使用Node24測試，正式宣告Node22執行環境，由Cloud Build驗證。

## 維護指令
一般網站與規則：firebase deploy --only hosting,firestore --project yestredayoncemore --account u9431818@gmail.com
排程套件：cd functions-retention；npm ci；npm test
返回專案根目錄後：firebase deploy --only functions:song-quiz-retention --config firebase.retention.json --project yestredayoncemore --account u9431818@gmail.com
獨立firebase.retention.json使後續只部署網站時不意外更動排程。

發布狀態與手動觸發結果另存 retention-release-verification.json。


## 2026-09-13 正式發布確認

- Hosting與Firestore規則發布完成，正式HTML與本機SHA256一致。
- purgeExpiredQuizResults為ACTIVE，Node.js22，asia-east1；Cloud Scheduler為ENABLED，每日04:00，Asia/Taipei。
- 服務帳號已有Firestore所需權限（沿用既有角色，未新增IAM角色）。
- Blaze已啟用。函式建置映像設定保留7日；這是部署產物管理，與學生成績14個月政策不同。
- 正式資料只讀盤點35筆快照，0笔到期、0筆缺少可用日期，未寫入或刪除正式資料。
- 自動核准審查拒絕了立即手動觸發清除，理由為尚未明確授權現在手動永久刪除。本次改用狀態查核、Emulator實際執行與正式資料dry run；每日排程已啟用，首次排程尚未執行。
- 手動試跑如有需要，須使用者明確回覆「核准立即清除到期資料」後才觸發；不將只讀盤點冒稱正式執行成功。
- 驗證詳情：docs/retention-release-verification.json。


## 手動清除執行成功｜2026-09-13

使用者明確核准立即清除到期資料後，已觸發一次正式排程。
執行完成時間（UTC）：2026-09-13T05:28:10.101229Z。
刪除練習快照：0 筆；刪除到期防補送標記：0 筆；缺少可用日期的群組：0。
Cloud Scheduler 本次狀態成功，函式錯誤0筆。目前無到期資料，現有練習保留；每日臺灣時間04:00排程持續啟用。先前手動觸發的核准限制已由本次明確核准解除。
