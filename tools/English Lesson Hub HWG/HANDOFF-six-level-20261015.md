# 六關英語冒險與分配後台 — 2026-10-15



狀態：v05已於2026-10-15正式部署；v06拼字／慶祝／學號／逐關時間修訂已完成本機驗收，尚未部署。原單關試玩與教材保留。



- 主來源：preview/src/assignments/、preview/src/live/SpellQuestion.jsx與spelling.mjs、preview/functions/src/assignment-*.mjs；既有liveV2/liveAudioV2/liveMediaV2/liveRetentionV2加入分配流程。

- Godot：godot/english-survivors-six-level-20261015/project.godot；製作手冊-v04.md；downloads/兩份ZIP；local-demo/可執行的35題下載版。

- QA：qa/six-level-assignments-20261015/QA-REPORT.md、verification.json、browser/、downloads-readback.json、release/hosting/。

- 本機教師/正式流程模擬：http://127.0.0.1:5198/lab；35題分配碼311869（測試學號50101，350/350與遊戲200分）；混合題型651527（85/90，含人工評分）。皆為隔離合成資料。

- 下載體驗：http://127.0.0.1:5199/；35題測驗示範330/350。此伺服器暫從Temp/web-final執行；交付完整新版在local-demo，執行node server.mjs可重開。

- 研發服務副本：C:/Users/User/AppData/Local/Temp/lesson-hub-six-20261015；原始來源已逐檔同步回本專案並記錄SHA。預覽服務保持開啟供教師檢視。

- 生產建置：僅沿用目前正式站公開的firebase傳輸/App Check站點設定，存入忽略的preview/.env.production；不含API私密金鑰。未將env放入下載包。

- 下一步：教師看手冊/結果頁/單機六關後，另行明確授權部署hwg7teaching的hosting:lesson-hub-v03與functions:teacher-access:liveV2、liveAudioV2、liveMediaV2、liveRetentionV2。先完成既有教師驗證正式發布gate；教師PIN由本人在VS Code終端機輸入，不在聊天或檔案保存。

- 部署後需正式網址資產SHA與後端版本讀回，再由教師以真實iPad/Safari、校網、觸控與音訊驗收。沒有Git提交/推送或Obsidian寫入。





## 2026-10-15 追加：作答／遊戲分頁與音效 v05

- RDQ已確認：rdq/RDQ-spec-page-switch-audio-20261015.md，三項建議全部採納；另追加豐富遊戲音效。

- 作答及遊戲獨立全畫面切換、固定提交／重試操作列、長題只捲內容；Godot引擎保留暫停不重載。

- 14種本機合成音效、6關背景音樂、音量／音樂／靜音控制，無新增音效媒體下載。

- 製作手冊-v05.md、兩份ZIP、local-demo及preview來源已更新。前版素材、手冊v04與原單關保留；本次覆寫檔備份在qa/page-switch-audio-20261015/before。

- QA：275項測試、30項Godot戰鬥通過；桌機／平板／手機版面、13種其他題型操作列、長題與下載版實測。證據qa/page-switch-audio-20261015/。

- 預覽：http://127.0.0.1:5198/lab?assignment=741522（本機合成驗收50102）；下載體驗http://127.0.0.1:5201/（合成50104）；5199仍可啟動。

- 最新部署候選為qa/page-switch-audio-20261015/release/hosting。尚未正式部署、Git提交／推送或Obsidian寫入。真實iPad／校網及主觀音效驗收仍待教師確認。





## 2026-10-15 六關／分配／分頁／豐富音效：正式部署完成

- 使用者「部署正式站」授權後，hwg7teaching的lesson-hub-v03與liveV2／liveAudioV2／liveMediaV2／liveRetentionV2已發布。本段取代上方未部署與待授權狀態。正式入口 https://lesson-hub-v03.web.app/lab 。

- 最終Hosting sites/lesson-hub-v03/versions/c4e7cea861957728；189/189正式檔SHA、三入口、兩ZIP通過；413來源一致。四個後台ACTIVE／Ready，各41部署來源檔一致；原LIVE設定與Secret參照保留，其他9個Functions未變更。

- 275網站／10Functions／11模擬器通過。正式匿名入口、無效分配碼拒絕、Godot冷載入及console error0；未登入私人課程、提交正式學生答案或呼叫付費AI。

- 詳見rdq/DEPLOYMENT-survivors-assignment-20261015.md與qa/survivors-production-20261015/。手冊v05、下載包及本機副本上線說明同步；單關、v04及舊資料保留。

- 下一步：教師本人登入後台，用自己的題組分配給學生；驗收實體iPad/Safari、校網、觸控與音效。未Git提交推送／Obsidian同步。



<!-- lesson-hub-survivors-closeout-20261015 -->
## 2026-10-15 收工已保存／Obsidian已讀回
- 詳見rdq/CLOSEOUT-survivors-20261015.md；正式站及4個Ready版本維持，收工9公開檔＋3入口、413來源、2ZIP與前端封存雜湊相符。
- GDrive已保存讀回；Obsidian指定筆記四區精準追加，原內容逐位元保留。取代上方「未Obsidian同步」狀態；雲端服務端同步未另驗。
- Git main本機／遠端88f2fdba89a4fdde3d7c2f3a319fa28c5268f393，索引空，未stage／commit／push。314來源候選＋2收工文件的316檔提案見rdq/GIT-SCOPE-survivors-20261015.md，需先確認精準範圍。
- 下一步為教師本人建立正式分配及實體iPad／Safari、校網、觸控與音效驗收；勿從歷史未部署段落重做。電腦與其他工作持續運作。
<!-- /lesson-hub-survivors-closeout-20261015 -->


<!-- spell-results-v06-20261015 -->
## 2026-10-15 v06追加：大小寫／片語、慶祝音效、大字學號與後段時間
- 使用者RDQ確認「先這樣，直接開始」，另授權拉長題目間遊戲時間且後關較長；規格rdq/RDQ-spec-spell-results-20261015.md。
- Chinese／English保留大小寫，social studies固定空格；舊題與既有分配／成績保留舊規則，教師編輯器提示檢查。
- 7.8秒CC0勝利音樂＋掌聲、沿用音量／靜音、播放受阻按鈕；學號與相同遊戲角色並列，桌面80px／手機約39px。
- 六關遊戲時間15／17／19／21／23／25秒；真Godot全六關計時及暫停檢查通過。289 Node（含10 Functions）、12模擬器、網頁／離線／Godot建置與下載讀回通過。
- v06手冊與兩ZIP已更新，v05／v04與原圖保留。詳見rdq/IMPLEMENTATION-spell-results-20261015.md與qa/spell-results-20261015/。
- 本機結果http://127.0.0.1:5205/lab?assignment=714015（合成50105，30/30）；下載試玩http://127.0.0.1:5206/（合成50106，20/350）。此修訂尚未部署；正式站仍v05，不從本機傳輸dist直接發布。
- 待教師實體iPad／Safari、校網、觸控及喇叭驗收；未Git提交推送／本輪Obsidian寫入。先前316檔Git提案需重新盤點。
<!-- /spell-results-v06-20261015 -->


<!-- spell-results-production-20261015 -->
## 2026-10-15 v06 已正式部署
- 本輪使用者「部署正式站」授權後，已先更新 liveV2 **livev2-00017-hig**／Ready，再發布 Hosting **sites/lesson-hub-v03/versions/420627ea43cda9fe**。正式入口 https://lesson-hub-v03.web.app/lab 。本段取代先前 v06 未部署／正式仍v05的狀態。
- 上線：大小寫拼字與片語空格、7.8秒勝利音效、大字學號並列、六關15／17／19／21／23／25秒；手冊v06與兩下載包狀態同步。舊題快照／歷史成績保留。
- 289 Node、正式 gate／建置通過；193/193 HTTP／SHA、41 後台來源、441來源讀回、其他12 Functions未改。9份課程與Phonics36題／100分／24音檔前後完全相同。
- 詳見 rdq/DEPLOYMENT-spell-results-20261015.md 與 qa/spell-results-production-20261015/。原文件／ZIP已備份，assets內28個素材相關檔不變。
- 待教師本人登入私人題組及實體iPad/Safari、校網／觸控／喇叭驗收；本輪未Git提交推送／Obsidian寫入。先前Git範圍提案須重新盤點。
<!-- /spell-results-production-20261015 -->


<!-- lesson-hub-v06-phonics-closeout-20261015 -->
## 最新收工 / Closeout — 2026-10-15T21:00:41+08:00

- 最新正式版：https://lesson-hub-v03.web.app/lab；Hosting 420627ea43cda9fe（2026-10-15 19:26:19台灣）；liveV2 livev2-00017-hig。此段取代本案較早未部署或v05段落，保留歷史。
- Phonics 36題、24原音檔、100分已存私人教師題庫；練習首次＋3次重試共4次、錯不扣分、逐題最佳分，全對100分。遊戲獎勵仍依首次全對提交次數分級；測驗首次分。未建立正式學生分配。
- v06大小寫／片語、慶祝音效與學號角色並列、六關15／17／19／21／23／25秒均已部署；手冊製作手冊-v06.md及下載包同步。
- 收工10公開資產（含兩ZIP）／3入口、4後台Ready與441檔有效來源讀回通過；原清冊3個文案修正差異已另存，原證據保留。部署時193資產／41後台與289新跑測試證據保留。
- Obsidian四段追加讀回，原文／frontmatter保留；GDrive掛載檔案已讀回，服務端同步未獨立驗證。
- Git main／origin main均88f2fdba89a4fdde3d7c2f3a319fa28c5268f393，索引空；未stage／commit／push，精確範圍待確認。
- 完整交接：rdq/CLOSEOUT-v06-phonics-20261015.md；Git候選：rdq/GIT-SCOPE-v06-phonics-20261015.md；證據：qa/spell-results-production-20261015/closeout/。
- 下次：教師登入正式後台檢視Phonics與原音、設定分配；驗收實體iPad／Safari與教室喇叭。電腦及其他工作保持運作。
<!-- /lesson-hub-v06-phonics-closeout-20261015 -->


<!-- lesson-hub-approved-git326-20261015 -->
## GitHub精確範圍已確認 / Approved scope — 2026-10-15T21:11:22+08:00

- 教師明確確認：「確認，只同步這份326檔清單到GitHub，其他專案不要動。」本節取代前文對本次326檔仍待範圍確認的狀態；舊紀錄保留為確認前歷史。
- 授權僅限GIT-SCOPE-v06-phonics-20261015.md列出的326個精確路徑，Samsamchou/teacher-toolkit的origin/main；不加入其他專案、私人Phonics題庫／原音／雲端收據、QA、ZIP、環境檔或秘密。
- 程式與已發布來源保持；本次只在清單內4份交接文件追加此授權。核准時雜湊清冊suggested-git-scope.json保留，提交前內容另存qa/spell-results-production-20261015/closeout/git-sync-326/stage-manifest.json。
- 此段保存時尚未執行提交／推送；實際結果以Git提交紀錄、Obsidian工作筆記最新Git同步段落與git-sync-326/receipt.json為準。
<!-- /lesson-hub-approved-git326-20261015 -->
