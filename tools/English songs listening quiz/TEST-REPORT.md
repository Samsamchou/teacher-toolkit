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
