# 2026-09-12 初始化與首頁修改驗證

- 來源搬入 14 檔，修改前 SHA-256 全部相同；原 C: 版本保留作復原快照。
- 正式工作目錄：G:/我的雲端硬碟/teacher-toolkit/tools/English songs listening quiz。
- 初始化完成 agent.md、.gitignore、PROJECT_HANDOFF.md、docs/MIGRATION.json、技能流程筆記；沿用父層 Git，未 commit/push。
- 9 項核心測試全部通過。
- Edge 瀏覽器驗證：首頁 → 六年級空歌單 → 返回首頁 → 五年級歌單 → Yesterday Once More → 重新整理仍在練習。
- 模擬影片完成 15 題、100 分、錯誤題庫拒絕、下一位同學、768px 平板無水平溢出，全部通過，無頁面 JS 例外。
- 真實 YouTube 在新 G: 來源的 localhost:8001 成功載入與啟用。題庫校時及實體 iPad 仍待驗收。
- Firebase 預定目標 yestredayoncemore 僅記錄於文件；沒有部署、取得專案 Web config、建立帳號或修改雲端資料。
- 本機预覽：node server.mjs（預設 8000）；本次因既有快照伺服器使用 8000，新版使用 PORT=8001。
- 新年級首頁截圖：docs/grade-home-preview.png。舊 preview-*.png 與 TEST-REPORT.md 是搬移前單曲版本證據。

2026-09-12：完成15題兩輪音訊自動對齊審閱版；加入逐題保存與教師總分、正誤題數、錯題原句。保留題庫教師核准門檻。

## 收工 2026-09-12
- 已保存15題自動校準v2、原句／選項／字表證據、教師後台總分優先與未完成練習成績。
- 15題真實YouTube暫停與全曲結尾測試通過；規則模擬器157項通過；教師仍需試聽，尤其radio與相鄰句界。
- 正式首頁仍保留舊題庫；新版請用 node server.mjs 啟動後開 /review。審閱HTML不在Firebase Hosting public目錄。
- 下次先教師審閱15題與時間；核准後更新正式題庫，再測實體iPad與Firebase跨裝置成績，最後另行部署。
- 本次收工只同步此子專案；其他工具的變更保留。Git最終結果記錄於Obsidian工作筆記。

## 2026-09-12 開工核准與顏色回饋
- 使用者已明確核准37檔commit/push到既有origin/main，並核准15題。正式首頁已換成cloze-v2。
- 選錯紅色✗、選對綠色✓；結案回饋0.9秒後續播，延遲中鎖定選答，提前結束取消延遲。
- 實體iPad與正式Firebase仍待驗收；此次不部署Firebase。

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


# RDQ 追加規格與修訂｜2026-09-13

狀態：confirmed；依老師明確修訂，零題流程。

- 教師成績表：學號、本次總分、歌曲／版本，之後欄位與原順序保持一致。總分大字強調移至第二欄。
- San Francisco 第6、16題原句與挖空句：love-in → loving；同步JSON、審閱表與學生試作頁。
- 第8題尾字 hair 已確認；保持66.82–75.02秒，未推定老師確認精確停止時間。
- 原字幕擷取與原始音訊對齊證據保留，不覆寫來源文字。
- 新歌整份題庫仍待審；本次僅部署既有教師表格欄序。


# San Francisco 正式發布｜2026-09-13

使用者明確核准：加入六年級國際歌謠歌單，並正式部署。

- 入口：首頁 → 六年級國際歌謠 → San Francisco。
- 直達連結：https://yestredayoncemore.web.app/#song/san-francisco
- 同一 public/index.html 內含兩首歌；切換歌曲會重新載入對應影片與題庫，保留已寫入的練習紀錄。
- 正式題庫 san-francisco-g6-cloze-v1，16題，每題6.25分。
- 第6、16題使用老師指定 loving；第8題尾字 hair。題庫內容核准，不將此核准冒稱人工逐秒測量。
- 影片 public/media/san-francisco.mp4，1280×620，完整原音訊，底部字幕已裁除。
- 五年級 Yesterday Once More 15題保留；教師日期後台共用，學號／總分／歌曲欄序維持。
- 學生成績 schema3／startedAt 沿用現行規則，兩次機會、重播、提前結束與片尾計分沿用。
- 本機完整16題測試使用瀏覽器本機成績，避免測試資料混入正式學生成績。
- 未做實體 iPad/Safari 驗證。

發布結果與HTTP/影片驗證另存 San-Francisco-release-verification.json。


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

## 收工確認｜2026-09-13

- San Francisco六年級16題、日期篩選、教師9欄與單次練習刪除，以及14個月清除排程均已正式發布。
- 經使用者核准，13:28臺灣時間手動清除成功；到期與刪除皆0筆、函式錯誤0筆。每日04:00排程持續啟用。
- 收工複核核心播放、日期及保存期限測試皆通過，Git diff --check通過。
- 本次僅提交歌曲聽力子專案。實際push SHA另於Obsidian工作筆記讀回記錄。
- 下次：教師實體iPad及後台操作驗收，之後依新指示整理可重用Skill；不把自動時間校準冒稱人工逐句測量。
