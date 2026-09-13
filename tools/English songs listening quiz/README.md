# 國際歌謠聽力網站

正式網站：https://yestredayoncemore.web.app 。2026-09-12已發布核准15題、紅綠回饋與未完成成績保存；本機及正式HTML雜湊核對一致。

正式目錄：`G:/我的雲端硬碟/teacher-toolkit/tools/English songs listening quiz`。
首頁提供五年級／六年級國際歌謠；五年級 Yesterday Once More（15題），六年級 San Francisco（16題）均已上線。

## 本機使用與教師審閱

在 VS Code 開啟此目錄，終端機執行 `node server.mjs`。
- 網站首頁：http://localhost:8000
- 新15題校準審閱頁：http://localhost:8000/review
- 題庫：review/yesterday-once-more-cloze-review-v2-calibrated.json
- 審閱表：review/Yesterday-Once-More-15題校準審閱版-v2.md

2026-09-12使用者已核准15題，正式 public/index.html 與 /review 均已套用新版原句挖空題庫。時間沿用指定影片的自動對齊，不把內容核准當作人工音訊測量。審閱預覽在 review/ 下，不屬於 Hosting public 目錄，不會隨部署公開。
老師可在 /review 右上角開教師後台，展開 Mark Start / Mark End，逐題試聽、修正與匯出。目前正式首頁已使用核准題庫，後續修改可匯出保存。timingVerified 不代表自動對齊通過，應由教師完成逐句聽校後設定。

## 練習流程

先點 Tap to enable video，再輸入學號開始。歌曲從00:00播放；完整目標句結束後暫停並顯示挖空題。
每題最多2次，任一次答對均得滿分；第一次錯顯示 Try again，第二次錯得0分。
原句重播不限次數，重播時隱藏題目／選項並禁止選答，次數保留。答題結束從句尾接著播；最後一題後繼續全曲至結尾。
也可按「結束本次練習並保留成績」，或返回歌單提前結束。

## 教師如何查看成績

右上角「教師後台」依臺灣時間的練習開始日期顯示所有歌曲的當次練習，包含未完成的練習；日期可選今天、前一天、後一天。
欄位依序是：**學號、本次總分、歌曲、練習狀態、答對、答錯、未作答、答錯的句子、第一次錯選後再次答對的原句與選項**。歌曲僅顯示名稱；同學多次練習各保留一列，统计與CSV跟隨相同日期篩選。
總分=答對題數÷全題庫題數×100，最後四捨五入至2位小數。15題中答對3題、答錯2題、未作答10題，顯示20.00分。
答錯指「两次機會都錯」。第一次錯、第二次對算答對；僅第一次錯就離開的題目尚未結案，列入未作答。未作答題不混入錯題句子。
練習開始及每次選答都保存一份進度，無須等整首歌播完。暫停／離開頁面與提前結束也保存。學生的最終成績畫面仍於歌曲結束或主動提前結束時顯示。
每份進度都是不可修改的新文件，後台以 ownerUid + sessionId 合併並取最高 revision，避免同一次練習被計為多筆。CSV 與平均分數、練習次數使用相同合併結果。舊紀錄缺少錯題資訊時顯示「未記錄」，不猜測。

未設定 Firebase 時，僅使用瀏覽器本機紀錄，後台清楚標示本機模式；這些試作紀錄不加入日後雲端上傳佇列。
設定後，待送進度保存在此網站的 localStorage；每筆伺服器確認後才移除待送資料。關閉／斷網後，需回到同一瀏覽器同一網址，恢復網路才能補送。突然斷电且最後一筆尚未同步時，其他裝置只能看到最後已同步進度；不保證關頁瞬間完成網路傳送。清除瀏覽器資料會刪除尚未同步資料。

## Firebase 與 VS Code 部署

1. 在 Firebase Console 選擇 `yestredayoncemore`，註冊 Web App；把公開 firebaseConfig 填入 public/index.html。不能放服務帳戶私鑰。
2. Authentication 開啟 Anonymous、Email/Password。
3. 由老師親自在 Console 建立指定教師帳號與已指定的密碼；不要把密碼寫進網站或Git。
4. 將 public/index.html 的 TEACHER_EMAIL 和 firestore.rules 的教師 email 設為同一帳號。
5. 建立 Firestore，核對 Auth 的正式網域／localhost。新規則僅允許匿名 create、指定 Email 的 password 教師 read；所有 update/delete 禁止。
6. 題庫、真實 iPad 與跨裝置同步驗收後，才執行以下部署。本次已於2026-09-12取得明確授權並部署完成。

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --project yestredayoncemore --only hosting,firestore
```

老師親自完成登入。已有 firebase.json，不需重新初始化或覆蓋其他專案規則。若目標 Firebase 與其他網站共用，須先合併其他集合規則。

## 成績欄位與測試

quizResults 保留 quizId、quizTitle、studentId、score、correctCount、totalQuestions、submittedAt，另加 schemaVersion、ownerUid、sessionId、revision、wrongCount、answeredCount、unansweredCount、wrongSentences、status、recordedAt。
submittedAt 使用伺服器時間；recordedAt 為裝置紀錄時間。前端計分適合作為課堂練習紀錄，規則不能證明學生實際聽過或答案真實。

```powershell
npm install
npm test
npm run test:rules
```

規則測試使用 demo-song-quiz 本機模擬器。需安裝 Java 和 Firebase CLI。
最新結果見 TEST-REPORT.md；真實 iPad Safari 和正式 Auth／跨裝置成績尚待驗收。
過往说明保留於 docs/README-before-progress-20260912.md，遇到差異以本文件為準。

官方播放器參考：https://developers.google.com/youtube/iframe_api_reference

瀏覽器測試：另安裝 `npm install --no-save playwright`，執行 `node tests/browser.test.mjs`。真實YouTube測試先以 `$env:PORT=8022; node server.mjs` 啟動網站，再執行 `node tests/youtube-live.test.mjs`。需要已安裝Microsoft Edge；測試使用隔離瀏覽器，結果在tests/artifacts。

## 2026-09-12 選答顏色回饋
選錯的選項保留紅色並標示✗；選對的選項顯示綠色與✓。正確或用完2次後停留0.9秒再接續歌曲，此期間禁止重複選答及重播；主動提前結束會取消延遲，避免誤跳下一題。


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
