# HWG5 U01+U02「Ken and the Frozen Clock Tower」交接

> 更新：2026-10-18｜Claude 專案。舊的 HWG7 版在 `../escape room/`，那個版本不動。
>
> **教師驗收**：2026-10-18 教師回覆「所有的任務都完成之後，我就直接確認驗收完畢了」，本任務驗收完成。下一個任務 HWG7 U01+U02 會用 `english-mission-quest-builder` skill 從零製作。

## 正式網址

**https://hwg5-clock-tower.web.app**

- **首頁**：「英語情境任務來闖關｜English Mission Quest」任務入口，原始檔是 `site/public/index.html` 和 `portal.css`。
  - HWG5 U01+U02 → `/hwg5-u01-u02/`（本任務）。
  - HWG7 U01+U02 →「即將開放」卡片，還不能點，等之後製作新任務。
  - 新任務放在 `site/public/hwg7-u01-u02/`，再把首頁卡片改成連結。

- Firebase 專案 `g6-english-online-learning`，用帳號 u9431818@gmail.com。
- 這是新建的獨立 Hosting site `hwg5-clock-tower`。
- 同專案原本的預設網站 `g6-english-online-learning.web.app`（english-portal）沒有被動到，部署後讀回的標題和 JS 都和部署前一樣。
- 只部署 Hosting，沒有 Firestore、Functions、規則或付費資源。
- 部署指令（在 `site/`）：`firebase deploy --only hosting:hwg5-clock-tower --project g6-english-online-learning --account u9431818@gmail.com`
  - 預設登入帳號 samchouou@gmail.com 沒有這個專案的權限，所以要加 `--account`。

## 教師後台（2026-10-18 上線）

- **入口**：首頁右上角〔教師後台〕，網址 https://hwg5-clock-tower.web.app/teacher/ 。
- **登入**：輸入六碼通行碼。通行碼是 Firebase 教師帳號 `quest-teacher@hwg5-clock-tower.web.app` 的密碼，由 Firebase 加密保存，**不在程式或 repo 裡**。
  - 帳號的 uid 記在 `site/quest-teacher.json`，uid 不是秘密。
  - 要換通行碼，在 Firebase Console → Authentication 改這個帳號的密碼即可，不必改程式。
- **學生端**：用匿名登入（專案原本就開著），每次存檔都把作答紀錄上傳到 Firestore 的 `questAttempts`，每次作答一份文件。離線時不影響作答，下次存檔會補傳。HUD 的 ✓ Saved 旁邊有一個小圓點：綠色＝已上傳、黃色＝上傳中、紅色＝離線。
- **2026-10-18 第二版（教師授權上線）**：
  - 先列作答日期（台灣時間），點日期才出現當天的全班列表。學生跨天作答時，兩天都列得到（紀錄裡有 `activeDays`）。
  - 資料保存一年三個月：每次上傳時設 `expiresAt` 為最後作答起算 456 天，Firestore TTL 政策（`questAttempts.expiresAt`，狀態 ACTIVE）會自動刪除到期資料。
  - 規則 ruleset 改為 `0f65fbe5-2e69-4f6b-bdab-9674bbbd5be3`，前一版是 `68f4ccb1…`。
  - 正式站實測：紀錄帶有當天日期，期限是 456.3 天後；教師讀得到，匿名裝置讀取被拒（403）。測試資料已刪除。
  - 完整建置方法寫在 skill 的 `references/teacher-dashboard.md`。
- **後台內容**：
  - 全班列表可以搜尋、排序，也可以匯出 CSV（UTF-8 BOM）。
  - 點一位學生會看到結果頁內容，下面列出**需要重試的題目**：作答次數、是否用提示、最後是否答對。第一次就答對的不列出。
- **Firestore 規則**：`site/firestore.rules.template`，用 `node scripts/make-rules.mjs` 產生 `firestore.rules`，再部署 `--only firestore:rules`。
  - 專案原本的規則是「任何登入者可讀寫全部」，english-portal 依賴它。新規則對其他集合**完全照舊**，只把 `questAttempts` 排除在外：學生裝置只能新增或更新自己的紀錄，只有教師帳號能讀，任何人都不能刪除。
  - 部署前的 ruleset 是 `de93f80c-cd83-4512-bad4-990ebdd2b01d`，部署後是 `68f4ccb1-33bf-4560-b3c9-59ed6d161cd9`。需要時可以在 Firebase Console 還原。
- **專案設定變更**：在 g6 專案開啟 Email/Password 登入（教師授權）。匿名登入維持原樣。
- **⚠ 原本就存在的問題（未處理，等教師決定）**：匿名登入加上「任何登入者可讀寫全部」，代表任何人都能讀寫 english-portal 的資料。
- **驗證紀錄**：
  - 規則模擬器測試 19/19，其中 4 項確認 english-portal 行為不變；網站測試 16/16；模擬器端到端測試；正式站 11 檔雜湊一致。
  - 正式站實測：學生紀錄上傳成功；教師帳號能讀到 Q01 兩次、Q02 第一次答對；匿名裝置讀取被拒（403）。測試紀錄和測試帳號都已刪除。
  - 教師後台的畫面登入要由教師本人實測，Claude 不在網頁輸入通行碼。
- **本機測試**：`tests/rules.emulator.mjs`；模擬器設定 `firebase.emulator.json`。網址加 `?emu=1`（只在 127.0.0.1 有效）會連本機模擬器。
  - 模擬器要從非 Google Drive 的資料夾啟動，否則 rules 檔一啟動就被判定為變更而失敗。

## 讀取順序

1. `DESIGN-v0.4-故事與題目配置.md`：已定案的設計。
2. `content/STORY-題庫審閱-v0.1.md`：旁白與 32 題。
3. `site/README.md`：網站。
4. `godot/clock-tower-battles/製作手冊.md`：戰鬥玩法、數值、重建與 QA。
5. `IMAGEGEN-清單-v0.1.md` 與 `assets/imagegen/qa/`：71 張圖。

## 目前狀態

| 項目 | 狀態 |
|---|---|
| 設計、71 張圖、旁白＋題庫 | ✅ 定案 |
| 旁白語音 9 段 | ✅ marin／0.8。SEG-07 原檔漏掉最後一句，已重做，舊檔保留為 `SEG-07.dropped-last-sentence.mp3` |
| 字幕式逐字標亮 | ✅ 9 段都用 OpenAI whisper-1 逐字時間（SEG-01 的估算版保留為 `.timing.approx.json`） |
| Tick 答對語音 32 段 | ✅ 每段都經轉文字核對，字詞全部吻合；必須聽完才能按 Next |
| Godot 戰鬥 11 場 | ✅ 真正 Godot 4.7.2 Web；QA_BATTLES PASS；網站以 iframe 嵌入 |
| 正式部署 | ✅ 2026-10-18 第二次部署（146 檔）：首頁、任務資料夾、Boss 67 秒、結果頁動畫與音效；13 個抽樣檔案和本機逐位元相同 |
| Boss 戰秒數 | ✅ 第 10、11 場由 60 秒延長為 67 秒（教師要求） |
| 結果頁 | ✅ 大字學號＋Ken 微晃動、彩紙、Tick；進入時播放慶祝音效，可按 🎉 Cheer again 重播 |
| 慶祝音效 | ✅ Kenney Music Jingles `jingles_STEEL02`（CC0，上揚的鋼鼓音型）轉成 MP3；來源、授權、雜湊在 `assets/audio/sfx/` |
| 網站測試 | ✅ `npm test` 14 項通過 |
| 實體 iPad、喇叭、校網 | ⏳ 未測 |
| 教師報表、學號名冊、跨裝置存檔 | ⏳ 未做；紀錄只存在學生這台裝置的 localStorage |

## 重建順序（改題庫、旁白或遊戲時）

1. `content/build_content.py`：產生題庫 JSON，並跑內容檢查。
2. 旁白文字有改時才做，會呼叫付費 API，需要教師授權：
   - `generate_narration_tts.mjs --execute --force --only SEG-xx`
   - `transcribe_word_timing.mjs --execute --only SEG-xx`
3. 解析句有改時才做，同樣需要授權：`generate_feedback_tts.mjs --execute --force --only Qxx`
4. 遊戲：在 `godot/clock-tower-battles` 依序跑 QA、匯出、`tools/build-shell.py`。
5. `site/`：`npm run build`（輸出到 `public/hwg5-u01-u02/`）、`npm test`，再部署。

## 注意

- 電腦的 `OPENAI_API_KEY` 環境變數不是有效金鑰。所有音訊程式改讀 `HWG7 Sentence review/pinball_site/.env.local`，這個檔案在 gitignore 裡。
- 遊戲第一次載入要下載約 51 MB（wasm＋pck），校網可能需要一段時間。網站在載入中會顯示百分比，載入失敗時可以略過戰鬥。
- 內建瀏覽器的視窗大小模擬會被重設，拖曳用的座標點擊測試不可靠。控制改用 pointer 事件和位置回報驗證。
- Google Drive 掛載資料夾剛寫入的檔案，馬上用 ffmpeg 讀取可能只讀到一部分（慶祝音效第一次轉檔只得到 0.29 秒）。轉檔請在暫存資料夾做完再複製進專案，並重新解碼確認長度。
- 網站在 2026-10-18 搬進 `public/hwg5-u01-u02/` 子資料夾。學生的 localStorage 存檔鍵沒有改，舊進度仍可續玩。
