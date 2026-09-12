# 國際歌謠聽力網站

正式網站：https://yestredayoncemore.web.app 。2026-09-12已發布核准15題、紅綠回饋與未完成成績保存；本機及正式HTML雜湊核對一致。

正式目錄：`G:/我的雲端硬碟/teacher-toolkit/tools/English songs listening quiz`。
首頁提供五年級／六年級國際歌謠；五年級收錄 Yesterday Once More。

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

右上角「教師後台」顯示當前題庫版本的每次練習，包含未完成的練習。
欄位依序是：**本次總分、學號、練習狀態、答對、答錯、未作答、答錯的完整句子、最近儲存時間**。分數優先顯示並由高到低排序；同學多次練習各保留一列。
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
