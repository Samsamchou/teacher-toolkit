# HWG5／HWG7 任務踩過的坑（做新任務前先看）

| 坑 | 怎麼發現的 | 以後怎麼做 |
|---|---|---|
| TTS 偷偷漏掉最後一句（SEG-07 少了 "Time Muncher is here!"） | 老師試聽時沒聽出來；用 whisper 轉文字對時間時才發現 4 個字對不上，最後 0.6 秒是靜音 | 每段旁白、每句 Tick 語音都要用轉文字核對；`interpolated` 必須是 0 |
| `OPENAI_API_KEY` 環境變數是一段中文字 | 第一次呼叫 TTS 時 header 編碼錯誤，請求根本沒送出 | 用 `openai-audio.mjs` 的 `readApiKey()`：檢查 `sk-` 格式，失敗就改讀 `.env.local` |
| 故事頁按 Next 跳過第 1 題 | 瀏覽器實走時，故事後直接出現第 2 題 | 故事按鈕自己的 click 先前進一次，共用的 `data-act` 委派又前進一次。故事和戰鬥按鈕改用 `data-story`／`data-battle`，並有回歸測試 |
| 拼字頁版面變成單欄 | 量版面時 panel 跑到 828 px 以下 | `<main>` 的 class 用了 `spell`，和拼字格子的 `.spell` 樣式衝突。題型 class 改成 `type-spell` |
| 觸控方向鍵沒反應（測試時） | 位置回報 x、y 不變 | `setPointerCapture` 對不在作用中的 pointer 會丟例外，後面的移動更新就沒執行。要用 try/catch 包起來 |
| 9:50 的時針和分針幾乎重疊 | 截圖放大看 | 時針短粗深色、分針長細藍色 |
| Google 雲端硬碟剛寫入的檔案，ffmpeg 只讀到一部分 | 慶祝音效轉出來只有 0.29 秒，同一檔在暫存資料夾是 1.39 秒 | 轉檔在暫存資料夾做完再複製進專案，並重新解碼確認長度 |
| Boss 第一階段強配置也打不完 | QA 機器人 60 秒只打掉一部分 | 自動瞄準在 Boss 戰優先打 Boss（小怪太近時除外），Boss 改 200 HP，射 Boss 傷害 ×1.25 |
| 內建瀏覽器的視窗尺寸會自己重設 | 截圖忽大忽小、座標拖曳點錯位置 | 版面用 `getBoundingClientRect` 量；控制用 pointer 事件加位置回報驗證；不要相信座標拖曳 |
| 舊網頁被瀏覽器快取 | 改完還是看到舊版 | 測試時對改過的檔案 `fetch(…, {cache:'reload'})` 再重新整理；正式站的 html/js 已設 `no-cache` |
| 測試資料被頁面自己寫回 | 改了 localStorage 後重新整理，又被 `pagehide` 存回舊進度 | 先按 Home（state 會清空）再改 localStorage |
| 部署帳號沒有權限 | `hosting:sites:list` 回 403 | 加 `--account u9431818@gmail.com` |
| 同一個 Firebase 專案的預設網站有別的 app（english-portal） | 部署前先 curl 首頁標題 | 只部署到 `hwg5-clock-tower` 這個 site；部署後讀回 english-portal 的標題和 JS |
| 共用 Git index 有很舊的 lock | commit 時 `index.lock` 已存在 | 先檢查 lock 檔的時間和有沒有 git 程式在跑，**經老師同意**才刪；只 add 老師指定的檔案 |
| 本機 main 落後遠端 | push 被拒絕 | 不要 pull 到有別的專案未提交變更的工作區；用暫存 index 把指定檔案疊到遠端最新 commit 上再 push |
| Firestore 模擬器從 Google Drive 資料夾啟動就失敗 | 啟動時立刻出現 "Change detected, updating rules" 接著 securityRules 錯誤 | 把 firebase 設定和 rules 複製到暫存資料夾再啟動；失敗後殘留的 java 要依連接埠找出來關掉 |
| 教師後台登入後還看到通行碼卡片 | 截圖 | `.login { display: grid }` 蓋過了 `hidden` 屬性；加 `[hidden] { display: none !important; }` |
| g6 專案的規則是「任何登入者可讀寫全部」，而且匿名登入原本就開著 | 部署前用 Rules API 讀出現行規則和登入設定 | 新集合要在 catch-all 規則裡用 `collection != '…'` 排除，並寫模擬器測試證明 english-portal 行為不變；原本的開放問題回報教師，不自行修改 |
| 不能在網頁輸入老師的真實通行碼 | 安全規範 | 正式驗證改用 REST 呼叫後台實際用到的 API；畫面登入請老師本人測 |
| 本機實走時作答紀錄上傳到正式 Firestore（HWG7，2026-10-18） | 查 `questAttempts` 有測試學號 | 本機測試網址一律加 `?emu=1`；若已上傳，用 gcloud token 以 REST 刪除並讀回 404 |
| 旁白 TTS 又漏唸最後一句（HWG7 SEG-02） | 逐字時間 `interpolated` 不是 0 | `--force --only SEG-xx` 重做；建置腳本遇到 interpolated≠0 直接報錯 |
| 新任務的戰鬥場數或 Boss 場次不同 | HWG5 程式寫死 B10/B11、SEG-09 | 新任務從 bank 讀 Boss（`battles.find(boss&&phase===1)`、`battles.at(-1)`）和 `endingSegment`；Godot 用 `KIND` 表對應機關、`BOSS1/BOSS2` 常數 |
| 瀏覽器窗格在背景時 Godot 不跑畫面、截圖逾時 | 只收到 ready，沒有 stats | 戰鬥邏輯靠 `qa_battles.gd`；網頁流程用 DOM 檢查；實際操作請老師或把窗格叫到前景再測 |
| 題庫拼字寫成大寫 "The USA"，句子卻是小寫 the USA（HWG7） | `parse_question_bank.py` 的 WARN | 拼字區分大小寫，一定要問老師；HWG7 定案用小寫，`build_content.py` 用 `SPELL_OVERRIDE` 記錄 |
| 拼字干擾字母剛好是答案裡的字母（Taiwan 配 i） | `build_content.py` 檢查 | 檢查已內建：干擾字母不能出現在答案字裡 |
| Tick 語音被標 FAIL，但其實沒漏字 | 轉文字把 by scooter 寫成 "Buy Scooter"、Wei 寫成 "Way" | 看 `heard:` 那一行：同音字、人名拼法不同不算漏字，不用重做；回報老師試聽那幾題 |
| Codex 第 4 階段把場地圖標「待確認」 | QA 報告說邊角裝飾伸進中央 65% | 場地只是背景，碰撞由程式決定；小侵入可直接採用，回報時說明理由 |
| 老師在外面，打不開本機 Markdown | 老師要求 | 設計稿、審閱表轉成 HTML 用 Drive `create_file`（text/html）上傳成 Google 文件，放在同一個資料夾，讀回確認再給連結 |
| Python 字串裡的 Windows 路徑 `\t`、`\e` 變成 Tab | 交接文件和 stages.md 的 `\teacher-toolkit` 變成 Tab＋`eacher-toolkit` | 寫中文文件改用 Edit／Write 工具，不要經過 shell 裡的 Python 字串（反斜線會被吃掉，還會變成 Tab 或 Backspace）；一定要用時路徑寫正斜線；寫完掃一次控制字元（ASCII 32 以下，換行除外） |
| 測試瀏覽器裡正式站的 Firebase 登入卡住 | `indexedDB.open("firebaseLocalStorageDb")` 逾時，沒有任何 identitytoolkit 請求 | 這是測試瀏覽器的狀態問題；正式站上傳改用 REST 模擬學生（匿名 signUp → 建立文件 → 學生讀回 403 → 管理者讀到 → 刪文件和帳號），老師本人再用後台確認 |
| 兩題共用同一張圖（回聲重播）時自動走題腳本選錯題 | 腳本只靠圖片檔名找題目 | 測試腳本用「圖片＋每一段台詞文字」比對，不只比圖片 |

## 教師已確認的規則（新任務預設沿用，除非老師改）

- 主角固定一位，同時是遊戲角色；吉祥物 Tick 負責提示和答對語音。
- 旁白只用英文，難字在句子下方附英中對照；作答畫面沒有中文。
- 完整答句題用整句答案卡。
- 每 3 題一戰（新任務要讓老師重新選）；Boss 2 場，各 67 秒。
- 故事旁白和 Tick 答對語音都要聽完才能按 Next；載入失敗 2 次才放行。
- 字型：Comic Relief。
- 續玩按鈕只在首頁；其他頁面只顯示 ✓ Saved；戰鬥中不存檔。
- 結果頁：大字學號＋角色微晃動、彩紙、慶祝音效、照實寫出 Boss 結果。
- 圖片由老師交給 Codex 內建 Image Gen 分階段生成；Claude 只寫清單和做 QA。第 1 階段停下讓老師確認，確認後第 2–4 階段一次連續完成。
- 首頁右上角〔教師後台〕＋六碼通行碼；後台列出結果頁內容和需要重試的題目，不列第一次就答對的題目。
- 角色可混搭：HWG7 沿用 Ken、Tick、Tom，新增 7 位交換學生和新 Boss；女生角色 Amy、Mina 穿長裙（教師定案）。
- 終章用「回聲／重播」框把前面同句不同空格的題目再考一次，沿用前面的題目圖。
- 審閱用的文件給 Google 文件連結（老師常在外面用手機看）。
