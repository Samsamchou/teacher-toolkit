# 國際歌謠聽力網站 / International Songs Listening

正式工作目錄：`G:/我的雲端硬碟/teacher-toolkit/tools/English songs listening quiz`。後续修改以此處為準。

首頁提供「六年級國際歌謠」與「五年級國際歌謠」。五年級 → Yesterday Once More → 原聽力練習；六年級先顯示歌單準備中。

本機啟動：`node server.mjs` → http://localhost:8000 。如連接埠已占用，可在 PowerShell 執行 `$env:PORT=8001` 再啟動。

預定 Firebase 專案：`yestredayoncemore`；目前只記錄目標，不部署，也未取得真實 firebaseConfig。最後完成本機與教師驗收後，才執行 `firebase deploy --project yestredayoncemore --only hosting,firestore`。

初始化與接續：PROJECT_HANDOFF.md；技能素材：docs/SKILL_WORKFLOW_NOTES.md。

---
以下保留原單曲版操作說明與測試限制：

# Song Lab：Yesterday Once More 歌曲聽力測驗

單頁 `public/index.html`，搭配 Firebase Hosting、Authentication、Firestore。學生輸入學號，聽完片段才在影片底部字幕列看到選擇題；教師從右上角登入。

## 目前交付與限制

- 原對話中的 `single_index_firebase_quiz_playerfix_v3.zip` 未能取回，這份是依可讀取的討論重新實作，並非原 ZIP 的逐行修訂。
- 內建 15 題 A1 聽辨**草稿**。原對話沒有可取回的完整題庫；秒數是待校對起點，不能視為已對準此影片。以簡短語意提問取代逐句歌詞重製；可匯入教師自己的挖空字幕題庫。
- `timingVerified:false` 會顯示草稿提示。老師需逐題核對題意、正解、句首與句尾，完成後設為 true，更新 quizId 版本，再發布課堂版。
- 未填 Firebase 設定時可測播放與本機題庫校對，**不會假裝上傳成績**。教師本機工具無雲端資料；設定 Firebase 後需實際登入。
- 尚未部署或建立雲端帳號。真實 iPad Safari、影片可嵌入性、15 題實際校時及 Firestore 連線仍需依下列清單驗收。自動化模擬測試不代表真實 YouTube 或 Firebase 已通過。

## VS Code 本機啟動

1. 用 VS Code 開啟本資料夾（能看到 firebase.json）。
2. 安裝 Node.js 後，開「終端機 → 新增終端機」。
3. 執行：

```powershell
node server.mjs
```

4. 開啟 http://localhost:8000 。不要直接雙擊 HTML 使用 file://。
5. 點 `Tap to enable video`，待顯示啟用，再輸入學號、開始作答。停止伺服器按 Ctrl+C。

## Firebase Console 設定

1. 選定本網站專用 Firebase 專案，註冊 Web App，複製 Firebase Web 設定至 `public/index.html` 的 `firebaseConfig`。只使用 Web App 公開設定，不能貼 Admin SDK 或服務帳戶私鑰。
2. Authentication → Sign-in method：啟用 **Anonymous** 與 **Email/Password**。
3. Authentication → Users：由老師親自建立教師 Email/Password 帳號，使用本次需求指定的密碼；密碼只在 Firebase Console 輸入，不儲存在網站、README、Git 或部署指令中。
4. 將 `public/index.html` 的 `TEACHER_EMAIL` 與 `firestore.rules` 的教師 email 改成同一個真實帳號。
5. 建立 Cloud Firestore 預設資料庫，採正式規則，不使用限時開放測試規則。首次成功提交後會建立 `quizResults`，無須手動建立集合。
6. Authentication 設定中核對正式網站網域；如需本機 Auth 測試，加入 localhost 授權網域。

學生與老師使用獨立 Firebase app / Auth 實例，老師登入不會把學生匿名身分替換掉。教師工作台關閉時登出，教師登入只保存在記憶體。前端沒有固定密碼比對或密碼提示常數。

## 部署（由老師在 VS Code 執行）

先完成題庫校時與專案設定。這包已有 firebase.json，不必重新 init 或覆蓋 index.html。

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only hosting,firestore
```

`firebase login` 開啟瀏覽器後由老師親自授權。`firebase use --add` 選擇正確專案並設別名 default；部署前確認所選目標。也可以明確指定：

```powershell
firebase deploy --project YOUR_PROJECT_ID --only hosting,firestore
```

若選擇 `firebase init`，只勾 Hosting 與 Firestore、public 目錄為 public、單頁路由選 N；對現有 index.html 與規則覆蓋詢問選 N。

這會發布 Hosting 並更新該專案規則；若是已有其他服務共用的專案，先整合既有規則，勿直接覆蓋其他集合的權限。

## 教師後台

- 輸入教師密碼，Firebase 以設定的 TEACHER_EMAIL 登入。
- 排行榜、總提交數、平均分數均篩選當前 quizId；相同學生多次提交會各計一筆，沒有暗中去重。
- CSV 含全部 7 個成績欄位、UTF-8 BOM 與公式注入防護。複製學生連結保留 quizId，清除其他參數。
- 展開題庫工具，在**教師專用播放器**播放影片；選題號，聽到句首按 Mark Start、句尾按 Mark End，按「套用時間」與「試聽片段」。學生播放器仍維持遮罩。
- 題庫可貼 JSON → 載入 → 匯出；匯入驗證題數、選项、正解、時間順序與範圍。時間不可重疊。
- 校對後按「下載更新後 index.html」，取代 public/index.html 再部署。此下載來自原始 HTML，不包含當前學生資料、登入表單或排行榜內容。只匯出 JSON 不會更新其他裝置。
- 有未載入的 JSON 編輯時，先按「載入 JSON」，再匯出。改時間的輸入框先按「套用時間」。

題庫格式：

```json
{
  "quizId": "yesterday-once-more-a1-v2",
  "quizTitle": "Yesterday Once More · A1",
  "videoId": "FmL6It-NW2s",
  "timingVerified": false,
  "questions": [
    {"start": 13, "end": 17, "prompt": "聽到哪一個年齡描述？", "choices": ["young", "old", "new"], "answer": 0}
  ]
}
```

上面僅示範 1 題結構；匯入必須提供 15 題。answer 從 0 開始。亦支援原討論的 questions 陣列格式：sentence、target、choices、start、end；會將 sentence 第一個 target 改為挖空並以 choices 中 target 的位置取得正解。

## 播放器修正

1. 先註冊全域 onYouTubeIframeAPIReady，再載入 API；不等待 Firebase 才初始化影片。
2. 保留 controls=1、playsinline=1、origin 與正常 Referrer。透明 youtube-shield 阻擋學生點擊，disablekb 與 iframe tabindex=-1 阻擋一般鍵盤控制。
3. 啟用按鈕必須觀察到 PLAYING 才視為成功，接著立刻暫停。開始與答題按鈕直接呼叫 loadVideoById，播放前沒有 await。
4. 每題帶 startSeconds 與 endSeconds；60ms 監看播放器實際時間。狀態為 loading → listening → stopping → answering；只有實際聽過片段且收到停止狀態才顯示題目。
5. 舊片段結束事件、異常跳播、未完整播放、重复點擊不會跳題。背景分頁會暫停，回來需點重聽；播放受阻或停滯時保留目前題目並顯示重試按鈕。
6. endSeconds 是播放器側限制，另有前端停止監看。YouTube 是外部服務，非逐音訊樣本精確播放器；廣告、網路、嵌入限制仍可能影響體驗，不能以 controls=1 保證消除所有黑屏。

## 成績與規則

`quizResults` 僅含 quizId、quizTitle、studentId、score、correctCount、totalQuestions、submittedAt。最後欄位使用 serverTimestamp；分數為 round(correctCount / 15 × 100)。

規則只允許匿名帳號 create，指定 Email 的 password 教師 read；所有帳號禁止 update/delete，其他集合預設拒絕。不把任何非匿名帳號都當老師。規則驗證全部欄位、型別、15 題總數、分數一致性及伺服器時間。

分數在前端計算，規則無法證明學生真的聽完或答案真實，適合作為課堂練習紀錄。學生不能讀成績集合。重試沿用同一筆文件 ID 以避免重複新增；寫入成功前顯示等待訊息，失敗則保留本頁結果供重試。頁面不將學生資料保存到瀏覽器儲存空間，重新整理會失去未送出的结果。極少數「伺服器已收但確認遺失」可能重試遇到禁止更新，此時由老師後台核對該筆，不能把錯誤當作儲存成功。

## 驗證

```powershell
node tests/core.test.mjs
```

自動測試涵蓋完整片段與暫停確認、禁止先答、過期事件、跳播、提早結束、中斷重播、重複答題、題庫驗證、CSV 防護和 JS 語法。實際執行結果見 TEST-REPORT.md。

正式驗收請使用桌機 Chrome 與實體 iPad Safari：

1. 初始頁不持續播放；點啟用後短暫播放並停止。
2. 輸入學號開始，確認每一題 start/end 對準完整句；播放中沒有題目，句尾停下才出現 3 個選項。
3. 點選答案立即進下一段，快速雙點不跳題；完成 15 題換算百分制。
4. 切背景分頁、網路中斷或禁止自動播放，再回來點重試，同一題完整重播。
5. 完成後只在伺服器確認後顯示已儲存；另一台裝置教師後台立即出現一筆，CSV 學號前導零需以 Excel 文字欄匯入。
6. 錯誤密碼不能登入；學生讀取失敗；非指定教師讀取失敗；所有 update/delete 失敗。可在 Firebase Console Rules Playground 使用對應匿名/password 認證模擬。
7. 教師 Mark 與 JSON 修改匯出後，重新部署、用另一裝置確認新 quizId 與新題庫。

## 官方參考

- https://developers.google.com/youtube/iframe_api_reference
- https://firebase.google.com/docs/auth/web/anonymous-auth
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/hosting/quickstart
