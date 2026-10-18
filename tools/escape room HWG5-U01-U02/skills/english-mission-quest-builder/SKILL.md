---
name: english-mission-quest-builder
description: 從老師的題庫（例如「HWG7 U01+U02 題目與答案表.docx」）從零做出一個新的「英語情境任務」（English Mission Quest）並部署：解析題庫 → 情境故事與題目配置 → 老師選戰鬥場數與每場秒數 → 老師選沿用上一任務角色或新角色 → Codex 圖片清單 → 英文旁白＋逐字標亮＋Tick 答對語音 → 拼字／拖放網站 → 真正 Godot 戰鬥 → 部署到同一網站 hwg5-clock-tower.web.app 的新任務資料夾並打開首頁卡片。只要老師說要做新的情境任務、escape room、闖關任務、English Mission Quest、把題庫做成故事＋遊戲、或提到 HWG7 U01+U02（或其他冊別單元）情境任務，就使用這個 skill，即使沒有說出 skill 名稱。不用於只做單一題型練習、單純生圖、一般 Lesson Hub 分配或修改已驗收任務的小地方。
---

# English Mission Quest 新任務：從題庫到上線

第一個任務是 **HWG5 U01+U02「Ken and the Frozen Clock Tower」**，教師已於 2026-10-18 驗收。它是所有新任務的**範本與證據**，路徑：

- 範本專案：`G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\`（先讀它的 `HANDOFF.md`）
- 正式網站：https://hwg5-clock-tower.web.app（首頁＝任務入口，每個任務一個子資料夾）
- 網站唯一來源：範本專案的 `site/`（`firebase.json`、`public/index.html` 首頁、`public/<任務 slug>/`）

第二個任務 **HWG7 U01+U02「Ken and the World Map Mix-Up」** 用這個 skill 做到上線（2026-10-18，教師已在 iPad 試玩、看到後台紀錄）：`…\tools\escape room HWG7-U01-U02\`。它的程式已經**不寫死場數**（Boss 從 bank 讀、結局段落用 `endingSegment`、Godot 用 `KIND` 表），**場數或段落數和 HWG5 不同時，改抄 HWG7 的檔案**（`content/build_content.py`、`site/scripts/build-hwg7-u01-u02.mjs`、`site/tests/hwg7-u01-u02.test.mjs`、`site/public/hwg7-u01-u02/`、`godot/world-map-battles/`）。

新任務**不要另開網站**：做在自己的專案資料夾，網站檔輸出到上面那個共用的 `site/public/<slug>/`，從同一個 `site/` 部署，HWG5 必須保持可玩。

各階段的實際作法、範本檔對照與命令在 [references/stages.md](references/stages.md)；踩過的坑在 [references/lessons.md](references/lessons.md)，動手前都讀一次。

教師後台（首頁右上角〔教師後台〕、六碼通行碼、依作答日期分類、結果頁＋需重試題目、資料保存一年三個月）已上線且所有任務共用；建置方法、資料欄位、安全規則、TTL、測試與部署都在 [references/teacher-dashboard.md](references/teacher-dashboard.md)。新任務只要照它的第 7 節接上。

## 原則（為什麼這樣做）

- **老師做決定，Claude 做苦工。** 每個標「⛔ 老師決定」的關卡都要停下來，用簡短表格列出選項與建議，等老師回覆再往下。老師沒說的事用範本的預設值，並說清楚用了什麼。
- **題庫是唯一的語言來源。** 題目、答案、粗體空格逐字照 docx；故事與干擾選項不能加入題庫外的核心句型。用 `scripts/parse_question_bank.py` 解析，並把題目和 docx 逐字比對（範本的 `build_content.py` 有內建檢查）。
- **作答畫面無中文**（例外只限老師核准的，例如 HWG5 的拼星期亮格中文與「國語」課本）。中文只出現在故事旁白的難字英中對照。
- **花錢、對外的動作逐項取得授權**：Codex 生圖（老師自己交給 Codex）、OpenAI TTS／轉文字、Firebase 部署、Git commit/push。上一次授權不延伸到下一次。
- **誠實回報**：自動測試、模擬、瀏覽器實測、iPad 實機、老師驗收是不同層級；沒做的就寫沒做。

## 流程

建立 plan 清單，依序做；⛔ 處停下。

1. **開新專案與讀範本**
   - 新資料夾：`tools/escape room <冊別>-<單元>/`，例如 `escape room HWG7-U01-U02`。
   - 任務 slug：小寫加連字號，例如 `hwg7-u01-u02`，以後的網址就是 `/<slug>/`。
   - 讀範本的 `HANDOFF.md`、`DESIGN-v0.4-故事與題目配置.md` 和 lessons.md。
2. **解析題庫**：`python -I scripts/parse_question_bank.py "<題庫>.docx" --out content/bank.json`
   - 回報拼字幾題、拖放幾題（gap 和 complete-answer 各幾題），以及所有 WARN 和 NOTE。
   - 沒有粗體的題目、格式不符的列，先問老師，不要猜。
3. **⛔ 老師決定：故事方向與規則**
   - 依題庫設計故事：主題、場景章節，以及每題怎麼融入故事。
   - 排序規則：同一個字要先拼字再出現在拖放字卡；完整答句題放後段，例如 HWG5 的「記憶之鏡」；同句不同空格的題目要拉開。
   - 寫成 `DESIGN-v0.1`，問老師：故事走向、旁白語言（預設只用英文加難字英中對照）、完整答句用整句卡或拆字卡、題目順序與干擾選項（每題至少 2 個）。
4. **⛔ 老師決定：戰鬥場數與每一場秒數**
   - 執行 `python -I scripts/battle_plan.py --items <總題數>`，把「每 2／3／4 題一戰」三個方案的完整表格給老師。每一場都列出接在第幾題後、這場前答幾題、秒數、是否 Boss，加上預估全程分鐘數。
   - 老師可以選方案，也可以逐場改秒數；改完用 `--every N --boss B --seconds "…" --json content/battle-plan.json` 存檔並再給老師看一次。
   - 預設值依 HWG5：一般場 20→30 秒，最後 2 場 Boss 各 67 秒。全程超過一節課（約 40 分鐘）要提醒老師。
5. **⛔ 老師決定：角色——沿用、新創或混搭**（在寫圖片清單**之前**問）
   - **A 沿用**上一任務的主角群（Ken、Tick、Jenny、Tom、Jack、Time Muncher）：直接複製已核准的錨點圖、sidecar 和遊戲圖集，省掉第 1 階段生圖。新圖要用這些錨點當參考。
   - **B 新角色**：重新設計主角、夥伴與 Boss，從第 1 階段錨點開始生圖，並等老師確認外觀。
   - **C 混搭**：例如沿用 Ken＋Tick，換新同學或新 Boss。只為新角色做錨點。
   - 注意題庫裡的人名（例如 Jack、Jenny）。若和舊角色同名，要問老師是不是同一個人。
   - 細節見 stages.md 的「角色沿用」。
6. **Codex 圖片清單**
   - 照範本 `IMAGEGEN-清單-v0.1.md` 的格式寫新清單：分階段、不能有文字、真透明、sidecar、rejected 保留、第 1 階段後停。
   - 張數依步驟 4 的戰鬥場數和步驟 5 的角色選擇計算。
   - 給老師一段可以直接貼給 Codex 的指令。
   - 每個階段完成後，讀接觸表和 QA 報告，檢查有沒有文字、人物是否一致、透明是否正確，回報後再給下一階段的指令。
7. **旁白與題庫 JSON**
   - 複製 HWG7 的 `content/build_content.py`（它對照 `bank.json` 和 `battle-plan.json` 檢查），改寫 STORY、ITEMS、BATTLES，執行到內建檢查全部通過。
   - 結局段落設 `LAST_SEG`（沒有題目）；回聲／重播題用 `mirrorFrame` 並沿用前面的題目圖。
   - 產出教師審閱表，**同時轉成 Google 文件給連結**（老師常在外面用手機），⛔ 旁白文字要老師定案。
8. **語音（⛔ 付費，需授權）**
   - 旁白：`generate_narration_tts.mjs`（marin／0.8）。
   - 逐字時間：`transcribe_word_timing.mjs`（whisper-1）。用轉文字核對旁白，**有漏字就重做該段**。
   - Tick 答對語音：`generate_feedback_tts.mjs`，會自動核對並重試。
   - 每段都要聽完才能按 Next。
   - 旁白 `interpolated` 不是 0 就重做那段（HWG5、HWG7 各發生一次）；Tick 語音的 FAIL 先看 `heard:`，同音字或人名拼法不同不算漏字。
9. **網站**
   - 複製範本 `site/public/hwg5-u01-u02/` 的程式到 `site/public/<slug>/`，以及 `site/scripts/build-assets.mjs`（改成新任務的路徑與素材對照）和測試。
   - 新任務自己一支建置腳本 `site/scripts/build-<slug>.mjs` 和測試 `site/tests/<slug>.test.mjs`，`package.json` 的 build／test 串起來；不要改壞 HWG5。
   - 要改的常數：`MISSION`、localStorage 前綴、`BATTLE_CHANNEL`、首頁標題；HUD 的收集物（HWG5 星期齒輪、HWG7 國旗徽章）和道具清單放在 data.js（`pinOrder`、`itemOrder`、`rewardIcons`）。
   - HWG5 專屬的元件（星期條、Q01 時鐘、記憶之鏡）依新題庫決定要不要保留。
   - `npm run build`、`npm test`，再到瀏覽器 1024×768 實走：故事聽完才解鎖、拖放、拼字、提示、Tick 語音、存檔續玩、結果頁。
   - **本機測試網址一定加 `?emu=1`**，否則作答會上傳到正式 Firestore。
10. **Godot 戰鬥**
    - 複製 HWG7 的 `godot/world-map-battles/`（場數不寫死）為新專案，改 `battles.gd`：名稱、提示、秒數＝步驟 4 定案、`KIND`（每場用哪種機關）、場地／敵人／機關／道具圖格位、`BOSS1`／`BOSS2`。
    - 道具名稱直接用新任務的名字（`battle.gd` 的 `ITEM_NAMES` 和 `p("…")`），網站傳一樣的名字；export path 和 `build-shell.py` 指到 `site/public/<slug>/game/`，通道改名。
    - 先跑 `tools/qa_battles.gd` 到 PASS，強／弱兩種配置的 Boss 結果要合理。
    - 匯出到 `site/public/<slug>/game/`，再執行 `tools/build-shell.py`。
    - 瀏覽器確認引擎 ready、鍵盤與觸控方向鍵真的會移動（看位置回報），戰果另外保存。瀏覽器窗格在背景時 Godot 不更新畫面，這一項就交給老師實機試玩並寫明「未驗證」。
11. **接上教師後台**：照 teacher-dashboard.md 第 7 節（MISSION 常數、missions.mjs、data.js 結構），正式站要實測一筆上傳和教師讀回，再刪除測試資料。測試瀏覽器的 Firebase 登入卡住時，改用 REST 模擬學生上傳（見 lessons），最後請老師本人登入後台確認新分頁。
12. **首頁卡片**：在 `site/public/index.html` 把這個任務的卡片從「即將開放」改成連到 `<slug>/` 的 Start；有下一個任務就加一張上鎖卡。
13. **⛔ 部署（需授權）**
    - 在範本 `site/` 執行：`firebase deploy --only hosting:hwg5-clock-tower --project g6-english-online-learning --account u9431818@gmail.com`
    - 讀回：抽樣檔案和本機逐位元相同、wasm 是 `application/wasm`、首頁標題正確、HWG5 仍可進入。
    - 同專案的預設網站 english-portal 不准動，要讀回確認標題和 JS 沒變。
14. **交接**：新專案 `HANDOFF.md` 和遊戲 `製作手冊.md`，分開列出已驗證、老師已確認、尚待 iPad 實機，以及部署狀態和網址。收工時用 shutdown skill。

## 回報格式

每個 ⛔ 關卡用同一種形式：一句現況 → 選項表（含建議與影響，例如全程分鐘數、要生幾張圖）→ 一個問題。完成時回報網址、改了哪些檔、驗證了什麼、還沒驗證什麼。
