# 各階段作法與範本檔對照

範本根目錄 `R = G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02`。新任務根目錄 `N = …\tools\escape room <冊別>-<單元>`。網站共用 `W = R\site`。

## 目錄

1. 範本檔對照表
2. 題庫與故事
3. 戰鬥計畫
4. 角色沿用
5. 圖片清單
6. 內容、語音
7. 網站
8. Godot
9. 首頁與部署
10. 驗證清單

## 1. 範本檔對照表

| 用途 | 範本檔（複製後改寫） | 新任務放哪裡 |
|---|---|---|
| 設計文件 | `R\DESIGN-v0.4-故事與題目配置.md` | `N\DESIGN-v0.x-…md` |
| Codex 圖片清單 | `R\IMAGEGEN-清單-v0.1.md` | `N\IMAGEGEN-清單-v0.1.md` |
| 題庫＋旁白唯一來源 | `R\content\build_content.py` | `N\content\build_content.py` |
| 旁白 TTS | `R\content\generate_narration_tts.mjs` | `N\content\` |
| 逐字時間 | `R\content\transcribe_word_timing.mjs` | `N\content\` |
| Tick 答對語音 | `R\content\generate_feedback_tts.mjs`、`openai-audio.mjs` | `N\content\` |
| 網站程式 | `W\public\hwg5-u01-u02\{index.html,app.js,rules.js,storage.js,styles.css}` | `W\public\<slug>\` |
| 素材建置 | `W\scripts\build-assets.mjs` | `W\scripts\build-<slug>.mjs`（不要改壞 HWG5 那支） |
| 網站測試 | `W\tests\site.test.mjs` | `W\tests\<slug>.test.mjs`，並把 `package.json` 的 test 改成兩支都跑 |
| Godot 專案 | `R\godot\clock-tower-battles\` | `N\godot\<遊戲名>\` |
| 首頁 | `W\public\index.html`、`portal.css` | 直接改卡片 |

**場數、段落數和 HWG5 不同時**，改用 HWG7 的檔案當範本（`H = …\tools\escape room HWG7-U01-U02`）：`H\content\build_content.py`（對照 bank.json 和 battle-plan.json 檢查、`LAST_SEG`、`SPELL_OVERRIDE`）、`W\scripts\build-hwg7-u01-u02.mjs`、`W\tests\hwg7-u01-u02.test.mjs`、`W\public\hwg7-u01-u02\`（Boss 從 bank 讀、`endingSegment`、`pinOrder`／`itemOrder`）、`H\godot\world-map-battles\`（`KIND` 表、`BOSS1`／`BOSS2`、機關圖格位常數）。

複製時同步改：localStorage 前綴（例如 `hwg7-quest:v1:`，不要和 HWG5 的 `hwg5-clocktower:v1:` 相同）、`BATTLE_CHANNEL`、遊戲 `VERSION` 字串、export path、`build-shell.py` 的輸出路徑。

## 2. 題庫與故事

- `parse_question_bank.py` 的輸出要讀完，`NOTE same sentence…` 代表題庫有同句不同空格，故事要拉開。範本用「記憶之鏡」重播前面的場景。
- 每題要有：
  - 畫面句 `contextEn`：英文短句，每句 4–10 字，不能洩題。
  - 對話行 `lines`：說話者和 `{1}` 空格。
  - 干擾選項：至少 2 個，不能是之後才要拼的字。
  - 提示：hint1 指證據、hint2 縮小範圍，都不能直接給答案。
  - 答對解析 `correctEn`：會被 Tick 念出來。
- 用 `build_content.py` 的檢查確保旁白、畫面句、難字表沒有提前出現答案字。
- 故事旁白每段 4–9 句，附 3–6 個難字英中對照。

## 3. 戰鬥計畫

- `battle_plan.py` 只算場次和秒數；Boss 數值、機關、道具效果在 Godot `battles.gd`／`battle.gd`。
- 老師改了某場秒數，就同時改：`content/build_content.py` 的 `BATTLES[].seconds`、`battles.gd` 的 `SECONDS`、`qa_battles.gd` 的長度檢查（它讀 `battles.gd`）、設計文件、製作手冊。
- 獎勵要對應剛做完的題目內容，例如科目道具、星期齒輪。每種獎勵都要在 `battle.gd` 有真實效果，不能只是裝飾。

## 4. 角色沿用（步驟 5）

| 選項 | 要做的事 | 省下的圖 |
|---|---|---|
| A 全部沿用 | 從 `R\assets\imagegen\characters\`、`mascots\` 複製 CHAR-01–04、MASCOT-01–04、BOSS-01，連同 `.png.json` sidecar；遊戲用的 `GAME-01-ken`、`GAME-02-tick-fx`、`GAME-05-boss` 也可沿用 | 第 1 階段 7 張＋部分圖集 |
| B 全新 | 照範本第 1 階段重做 REF／CHAR／MASCOT／BOSS，生完就停，等老師確認外觀 | 無 |
| C 混搭 | 只沿用老師點名的角色，其他重做；新角色畫風要以沿用的錨點當參考 | 視情況 |

- 固定外觀描述要逐字放進新清單。Jenny 是**及踝青綠色長裙**，這是教師定案。
- 沿用時在新清單寫明「錨點來自 HWG5，SHA-256 不變」，並在 QA 報告讀回雜湊。
- 新的場景、題目圖、Boss 與場地仍要新生成，因為主題不同。

## 5. 圖片清單

- 分 4 階段：錨點 → 表情、故事、圖示 → 題目插圖 → Godot 2×2 圖集，每階段結束都停下來等教師確認。
- 題目插圖可以重複使用前面的圖（例如記憶之鏡重播），清單裡要寫明。
- 星期條、時鐘指針、課表、對話文字都由網站疊加，圖裡一律不能有文字。
- Godot 圖集格式同範本：正方形 2×2、角色和道具真透明、場地中央 65% 留空。
- 每階段讀 `assets/imagegen/qa/stageN-qa-report.md` 和接觸表，逐張檢查文字、角色一致、alpha、能否推出答案。

## 6. 內容、語音

- `build_content.py` 輸出 `question-bank.v0.x.json` 和教師審閱表，教師審閱表定案後才做語音。
- 旁白語音：
  - `node generate_narration_tts.mjs` 先跑檢查模式，取得授權後加 `--execute`。
  - 接著跑 `node transcribe_word_timing.mjs --execute`。
  - 每段 `matched` 都要等於字數，`interpolated` 必須是 0；不是 0 就代表 TTS 漏字，用 `--force --only SEG-xx` 重做。
- Tick 答對語音：`node generate_feedback_tts.mjs --execute`，要看到「全部通過字詞檢查」。
- 金鑰：環境變數 `OPENAI_API_KEY` 不是有效金鑰，程式會改讀 `HWG7 Sentence review\pinball_site\.env.local`，絕不印出或寫進檔案。

## 7. 網站

- 規則都在 `rules.js`（純函式，可以測）：流程、seeded 字卡、評分、品質 4/3/2/1、提示階梯。
- `app.js` 的故事和戰鬥按鈕用自己的 data 屬性，不能用 `data-act="next"`（會造成重複前進，見 lessons）。
- 必測：
  - `npm test` 全過。
  - 1024×768 沒有溢出。
  - 故事聽完才解鎖，且逐字標亮跟著語音。
  - Tick 語音播完才解鎖。
  - 存檔、重新整理後續玩。
  - 結果頁：大字學號＋角色晃動、慶祝音效（`assets/audio/sfx/celebrate.mp3`，Kenney CC0，可沿用）。

## 8. Godot

- Godot：`%USERPROFILE%\Downloads\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe`。模板用專案內的 `templates\web_nothreads_release.zip`。
- 順序：`--headless --editor --import` → `--script res://tools/qa_battles.gd`（要看到 QA_BATTLES PASS）→ `--export-release "Web" "<site>/public/<slug>/game/engine.html"` → `python tools/build-shell.py`。
- 平衡參考（HWG5 定案）：
  - Boss 200 HP，第一階段打到一半就算成功，Boss 戰 67 秒。
  - 強配置約 40–55 秒過關，弱配置差一點過不了。
- 瀏覽器驗證：
  - 監聽 `stats` 事件，裡面有 Ken 的 `x`、`y`。
  - 鍵盤：在父頁送 `ArrowLeft`，x 應該變小。
  - 觸控：在 iframe 內對方向鍵送 pointer 事件，兩指交錯放開後方向要正確。

## 9. 首頁與部署

- 首頁卡片：`<a class="mission open" href="<slug>/">`；上鎖的卡片用 `div.mission.locked`。卡片圖用這個任務的首頁主視覺。
- `firebase.json` 已經用 `**/game/*.@(wasm|pck)` 處理快取，新任務不用改。
- 預設登入帳號 samchouou 沒有權限，一定要加 `--account u9431818@gmail.com`。
- 部署後讀回：
  - 首頁、新任務 index、app.js、data.js、game/index.html、engine.pck、engine.wasm、至少一個 mp3 和 webp，都和本機逐位元相同。
  - HWG5 的 `/hwg5-u01-u02/` 仍是 200。
  - `https://g6-english-online-learning.web.app/` 的標題仍是 english-portal。

## 9.5 教師後台（每個新任務都要接上；完整說明見 teacher-dashboard.md）

教師後台在 `W\public\teacher\`，是共用的，新任務不用另做。要讓新任務的紀錄出現在後台：

1. 新任務 `app.js` 的 `MISSION` 常數改成新的 slug，保留 `cloudRecord()` 和 `uploadAttempt()` 的呼叫：`persist()` 每次存檔上傳，結果頁立即上傳。
2. 在 `W\public\shared\missions.mjs` 加一行 `{ slug, unit, title }`，後台就會多一個分頁。後台會讀 `/<slug>/data.js` 取得題目文字和道具圖示。
3. 如果新任務的 Boss 最後一場不叫 `B11`，要同時改 `cloudRecord()` 的 `summary.bossDefeated`，以及 `teacher.js` 的 `bossText()`（目前讀 `battles.B11`）。
4. 不用改 Firestore 規則：`questAttempts` 依 `mission` 欄位區分，規則已允許 3–40 字元的 slug。

## 10. 驗證清單（交接時逐項標明）

- 自動：`build_content.py` 通過、`npm test` 全過、QA_BATTLES PASS。
- 瀏覽器實走：故事、拖放、拼字、Tick 語音、戰鬥載入與控制、結果頁、續玩。
- 正式站讀回：雜湊一致、MIME 正確、english-portal 沒變。
- 待老師：iPad 實機（手指拖曳、喇叭、校網載入時間）、整體驗收。
