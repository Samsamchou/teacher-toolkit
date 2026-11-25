# Safari Count（HWG5 U4 How Many Koalas Are There?）交接

- 規格卡：`../rdq/RDQ-spec-safari-count-hwg5-u4-20261124.md`（11/24 老師確認 confirmed）。
- 架構沿用 `../hwg7-u04-world-routines/`（網站流程、口說評分、桌上微縮 3D、Godot 遊戲）。
- 六國：台灣 → 日本 → 肯亞 → 印度 → 新加坡 → 澳洲；12 題（9 複數＋3 單數 There's one ___.）。
- 花費關卡：Tripo 約 1,050 點（11/24 只剩 20 點，要老師加購）；Colab 約 24 單位＋檢查圖；每批先報。

## 進度
- 11/24 RDQ 確認。下一步：查證動物地點 → 12 題謎題總表＋六國對話稿交老師確認。
- 11/24 查證六國地點（臺北動物園遊客列車、富士 Safari 叢林巴士＋牧場迷你馬、Nairobi、Ranthambore、Night Safari＋River Wonders、Werribee＋Moonlit）→ `謎題總表與對話稿_v1_20261124.md`（12 題、六國對話、12 段動畫）已交老師，待確認。
- ✅ 11/24 老師：謎題總表與對話稿 v1 照這份做；日本第 2 題改成下車去牧場看馬（Let's get off the bus and go to the farm.）。下一步：台灣一站試做（謎題圖、配音、網站骨架免費先做；Tripo 熊貓＋黑熊＋遊園列車約 205 點，要老師先加購）。
- 11/24 Tripo 圖庫找台灣模型（沒花點數，餘額 20）：熊貓＝bearwolf8600 坐著吃竹子（含底座，不用骨架）；黑熊＝milostgameofficial 四腳棕熊（要改色成黑＋白 V，走路要綁骨架）；遊園列車圖庫沒有合適的 → 用 World Routines 已有的 toy_train.glb 改色（0 點）。截圖 tripo_candidates_taiwan.jpg。下載各 5 點；黑熊綁骨架 Recraft 5＋Rig 20。
- 11/24 晚 台灣不花錢部分完成（老師：等 Tripo 點數補充再建模）：
  - 謎題卡：`puzzles/src/cards.html`（?ans=PANDA|BEARS&stage=puzzle|hint1|hint2|answer）、`src/render.py`、`src/cut_icons.py`；圖示由 Codex 生 `assets/source/taiwan_sheet.png`（提示詞 p_tw.txt）切成 bamboo／bear／blackwhite／pears。總表 `puzzles/out/taiwan_cards_sheet.jpg`。
  - 配音：`web/make_audio.py`（照 World Routines：Mei＝Ana、主角女生 Jenny／男生 Christopher +50Hz、−12%；旅伴問句 he／she 兩版）→ `web/audio/taiwan-*.mp3` 11 檔。
  - 題庫：`content/stations.json`（台灣兩題＋五國 comingSoon）；`publish_to_site.py` 複製到網站 `public/safari-count/` 與 `functions/safari-content.json`。
  - 網站骨架：`app/safari/SafariApp.tsx`＋`safari.css`，路由 `/safari-count`（ClassActivities，無首頁入口）。流程：選主角 → 地圖（只開台灣）→ 問句 → 謎題卡（兩層提示、輸入謎底）→ 數動物（暫用 emoji）→ 拖放／錄音 → 回答 → 動畫製作中 → Does he/she like pandas? 拖放 → 蓋章。
  - 本機 qa：`web/qa_walk.py` 17 張截圖、0 錯誤（`taiwan_skeleton_walk.jpg`）。tsc／eslint 乾淨。
  - **還沒做**：學號登入與雲端紀錄、AI 口說評分（現在錄完就能下一步）、老師頁、3D 情境圖與動畫、拍照遊戲、其他五國。**未部署、未 commit**。
- 11/24 晚 老師請我寫信問 Tripo 客服 support@tripo3d.ai：每月 3,000 點何時補（日期、時間、時區）、沒用完的點數會不會累積。已從老師 Gmail 寄出，等回信。
- 11/24 晚 查 Tripo 說明中心〈How to Get Help and Contact Support〉：**沒有線上客服對話**；帳務問題官方管道是 Email support@tripo3d.ai（已寄），寫明 3 個工作天內回覆。其他管道：Discord（非官方）、Studio 的 Web Feedback（回報錯誤用）。
- 11/24 晚 老師從 Tripo 使用紀錄找到：上個月補點是 **2026-10-24 22:35:49「积分充值 +3000」**。推測每月 24 日晚上約 22:35（Tripo 頁面顯示的時間）補 3000 點；11/24 22:35 後再看餘額。
- 11/24 晚 老師：情境動畫裡的 3D 動物要會走路、漫步、跑。查 Tripo：Auto Rig 有人形與四腳（quadruped）骨架；綁骨架後可套動作庫（Preset，人形看得到 Basic／Interactive／Scene／Emotional／Combat）或「AI Animation」用文字描述動作（每次 20 點、5 秒）；匯出 GLB 可帶多段動作給 Blender。四腳動物的預設動作清單要等有四腳骨架模型才看得到（API 文件有 quadruped:walk；跑步可能要用 AI Animation 描述）。
- 11/24 晚 老師：先寫程式與動作表（等點數補上前）。
  - `12段動作表_v1_20261124.md`：12 段動物動作（坐、漫步、小跑、趴、吃草、張望、跳、爬、爬樹、打哈欠）、路線、交通工具、Tripo 點數預估約 600–1,100（圖庫為主約 700）、Colab 約 24 單位。✅ 11/24 老師確認。
  - `tabletop/src/animal_path.py`（純 Python，本機可測：`python tabletop/src/animal_path.py` → self-test OK）：平滑路線（弧長）、從腳步量動作的地面速度、播放倍率（避免滑步）、群體錯開、最小間距。
  - `tabletop/src/animals.py`（Blender，只在 Colab）：Animal（讀帶動作的 GLB、找腳骨、量步速、NLA 播放／循環、walk 沿路線走、climb 爬樹、play 原地動作）、herd_walk、report（著地腳滑動 mm、群體最近距離）。**還沒在 Blender 實際跑過**：要等有帶動作的四腳模型（先用臺灣黑熊試）。colab_run 要再加上傳 animal_path.py／animals.py。
- ⚠️ 11/24 22:30 **待辦（老師要求，尚未完成）**：commit 8477497（Safari Count 動作表）誤帶進 25 個 English Lesson Hub 檔（drag-case 功能，另一個工作階段先放進暫存區；15 新增＋10 修改，清單用 `git diff --name-status 8477497^ 8477497 -- "tools/English Lesson Hub HWG"`）。老師選「拆成另一個 commit」。做法（只動暫存區，不碰工作目錄）：先確認 `.git/index.lock` 不存在、`git diff --cached` 是空的 → 新增檔 `git rm --cached`、修改檔 `git restore --source=8477497^ --staged` → commit「移除誤放的 Lesson Hub 檔」→ `git restore --source=8477497 --staged -- <25 檔>` → commit「English Lesson Hub：拖放題大小寫（drag-case）」→ 比對兩次後的 tree 與 8477497 相同 → push。11/24 因另一個工作階段鎖住 index（22:25）沒做成，老師就關機了。
- 11/25 開工：Tripo 餘額 **3,020**（每月補 3,000；上月剩的 20 點有保留＝會累積）。帳本已記。git 的 .git/index.lock（11/24 22:25）還在，拆 Lesson Hub commit 尚未做。
- 11/25 臺灣黑熊：圖庫棕熊 Recraft 5＋Auto Rig（Other＝四腳）20＝25 點（3,020 → **2,995**，帳本已記）。四腳動作庫只有 **Walk**（免費預覽／匯出，preset:quadruped:walk，2.6 秒，可選「原地播放」）。→ `tabletop/models/taiwan_bear_walk.glb`（8.4 MB，46 骨，腳＝*_Limb_4）。animals.py 已改成認 Limb_4 當腳。還要：改黑色＋白 V 字、Colab 走路檢查圖。
- 11/25 ✅ 老師確認〈其餘10題謎題卡內容_v1_20261125.md〉照這份做（交給謎題卡工作階段製作）。
- 11/25 網站從骨架做成 World Routines 式的正式流程（**只在本機預覽，沒部署、沒 commit**）：
  - **伺服器**：`functions/safari-core.mjs`（純規則：公開題庫、謎底／數量／拖放檢查、口說文法檢查、步驟順序、老師表格）＋`functions/safari.mjs`（createSafari：state、puzzle、count、answer、speak、stamp、teacherAction、purge）。
    - 頁面不再 import 題庫；`safariState` 只給 publicStations（沒有數量、拖放正解順序、Yes/No 答案）。數動物的畫面在謎題答對後才由伺服器給；句子在答對後才給。步驟順序伺服器也檢查（先解謎才能數、數完才能作答、兩隻動物都完成才有 like 題、like 完才能蓋章）。
    - 進度 `safari_progress/{studentKey}`（每題 puzzleAt／countAt／answeredAt／score／解謎錯次／數數錯次、likeAt、stampAt、分鐘）；錄音 `safari_records`＋storage `safari-recordings/{studentKey}/{站}-{動物}-{pass|prev}.wav`，每題留「通過那次＋前一次」，七個月到期。Firestore／Storage 規則本來就是全部拒絕（只有伺服器寫），不用改。
    - 口說：門檻 85，而且從 transcript 判斷「數量對、are／'s 對、名詞單複數 -s 對」三項都對才過；評分提示照 World Routines（要求 AI 照實寫、不幫學生改文法）。**每日 30 次和 World Routines 共用**（同一份 `routines_quotas`，過期清理也由 World Routines 負責）。
    - （11/25 下午已接線，見下一段；以下是當時的說明）部署前要接線：
      `import {createSafari} from './safari.mjs'`；`const safari=createSafari({db,bucket,Timestamp,HttpsError,member,safeInput,assess:assessRoutine})`；
      匯出 `safariState / safariPuzzle / safariCount / safariAnswer / scoreSafariSpeaking / safariStamp`（各為 `onCall(config,req=>safari.xxx(req))`，speak 對應 `safari.speak`、stamp 對應 `safari.stamp`）與排程 `purgeExpiredSafari`；
      monsterPortal 的 teacherExtra 改成 `async(a,b,f)=>(await routines.teacherAction(a,b,f))??safari.teacherAction(a,b,f)`；functions/package.json 的 check 加 safari*.mjs。
  - **學生頁** `app/safari/SafariApp.tsx`（外觀沿用骨架）：選主角＋學號登入（格式同 World Routines：501／502／601／602 開頭）→ 地圖（蓋章變 ★）→ 每題：問句 → 謎題卡（送伺服器檢查）→ 數數（1–9 送伺服器）→ 拖放或口說（AI 評分、顯示三項文法 ✅／❌）→ 回答 → 動畫（製作中）→ like 拖放 → 自動蓋章。中途重新整理會從伺服器進度接續。
  - **老師頁** `/safari-count/teacher`（`app/safari/SafariTeacher.tsx`，同六碼通行碼）：班級表（每隻動物一格＋解謎／數數錯次、like、蓋章＋分鐘）、點口說格看兩次聽寫與三項文法對錯並播錄音、下載 CSV。路由加在 `ClassActivities.tsx`。
  - **本機預覽** `scripts/local-preview.ts`：六個 callable＋三個老師動作，直接用 safari-core 的真規則（只有 AI 分數是固定 90 的假分數），老師示範碼 000000，另有三位示範學生。
  - **驗證**：tsc、eslint（整個專案）乾淨；`functions/tests/safari.test.mjs` 6 項（含記憶體假 Firestore 的台灣全流程）＋全部 51 項函式測試通過。Playwright 走一遍（`web/qa_site_walk.mjs`，在 C 槽建置副本 `%TEMP%\safari-build\site` 用 `--mode preview --port 3011` 跑）：登入 → 解謎（先答錯）→ 數數（先答錯）→ 拖放（先答錯）→ 中途重新整理接續 → 口說（假 90 分）→ like → 蓋章 → 老師頁表格／口說紀錄／播放／CSV，24 張截圖 `web/qa_site_1125/`（總表 `safari_site_walk_1125.jpg`）、0 個錯誤（老師頁未登入時查 session 的 401 是預期，World Routines 老師頁一樣）。
  - 待老師決定／後續：① 問句氣泡與配音直接說出動物名（Look! How many pandas are there?），謎底其實在問句裡；規格卡寫的是 How many ___ are there?，要不要在解謎前把動物名遮起來（配音也要改）？② 謎題卡 `public/safari-count/cards.html` 檔案內容重複了一次（兩份 `<html>` 接在一起，頁面還能用，但 `#ribbon` 等有兩個）——是謎題卡工作階段發布時的問題，沒動它。③ 單數題口說要求說 one（There's one panda.），There's a panda. 目前算數量不對。
- 11/25 謎題卡其餘 10 題完成（照〈其餘10題謎題卡內容_v1〉）：`puzzles/src/cards.html` 加 mirror（LIONS）、grid（HORSES 箭頭走法、ELEPHANTS 夜間遊園車路線）、prints（ZEBRAS 8 種腳印對照）、algebra（RHINO、KOALAS＋A=1 字母表）、occlude（TIGERS，canvas 切半；`render.py --qa-occlude` → `out/qa_occlude.png` 證明 8 個 6 字母動物字上半部都不同）、morse（TURTLES）、addsub 擴充（MONKEYS 月曆圈星期一＋鑰匙）、clues（LION 鬃毛＋王冠＋ROAR!!）。Codex 生 6 張圖示表（提示詞 `assets/source/p_*.txt`），`cut_icons.py` 改成會丟掉鄰格跨界的碎片（原本鏡子把手被切進草叢）、加 `:raw`／`:hole`。英文字全改 Comic Relief（PANDA、BEARS 也重渲）。`render.py`（不給參數＝12 題，有錯 exit 1）12×4 張 0 錯誤；`contact_sheets.py` → `out/<國家>_cards_sheet.jpg` 六張。也順便修掉 cards.html 重複兩份 `<html>` 的問題（網站要重跑 `publish_to_site.py` 才會更新）。**偏弱、要老師看**：TIGERS 只露上半部仍偏難；MONKEYS 月曆上的 S M T W T F S 字偏小；ELEPHANTS 答案頁紅線壓在字上；提示 2 一律只給第一個字母（老師 11/25 確認；ZEBRAS、TURTLES 的提示 2 因此和提示 1 差不多）。**11/25 再改（RDQ `rdq/RDQ-spec-safari-puzzle-fixes-20261125.md`）**：ZEBRAS 對照表 12 種（加貓掌 H、雞腳 O、山羊蹄 N、青蛙腳 L，Codex `prints3`）；ELEPHANTS 改成 HORSES 式（格內無箭頭，旁列 下右上右下下左左，老師原寫的第 4 個「左」會走回 E）；BEARS 改 BEE − E ＋ CARS − C（Codex `props3`）；TIGERS 改 T02 字母位移密碼 UJHFST（刪掉遮擋程式與 qa_occlude）。兩份謎題 md 已同步，12×4 張重渲 0 錯誤。老虎頭像會洩漏謎底，改成只在答案頁出現（規則：謎面、提示都不能放謎底動物的圖）。未 commit、未部署。
- 11/25 臺灣黑熊走路檢查（Colab 共約 0.5 單位，tabletop/colab_usage.log）：
  - 毛改黑：`tabletop/src/make_recolor.py`（複製自 World Routines）→ `models/taiwan_blackbear_walk.glb`（骨架與 Walk 動作保留）。
  - 新增 `tabletop/src/colab_run.py`（Safari 用，session "sct"，多上傳 animal_path／animals）、場景 `tabletop/src/taiwan_bears.py`（TW2；TW2S 側面、TW2C 胸口特寫）。
  - 修正：NLA 屬性是 `extrapolation`；動物移出 E.CHARS（鏡頭自動對焦找 Head 骨會當）；量測訊息改 DESK 開頭才會留在 log；面向改由動作自動算（腳往後推的反方向，熊＝本身朝 -x，補 90.6 度）。
  - 腳步：Tripo 四腳 Walk 是原地踏步（關掉「原地播放」也沒有前進資料），腳尖只抬 2 mm，「最低＝踩地」判斷失效 → 改成「每格最慢的兩隻腳＝踩地」擬合身體速度（`fit_ground_speed`，熊 0.024 m/s）。剩下的滑步約 2 mm／2 格（WARN），側面連拍看起來是自然走路；特寫避免拍腳。
  - 檢查圖：qa/1125-081613（側面 12 格＋預覽 mp4、主鏡頭 0／140 格）。待改：胸口白 V 從這兩個角度看不到、開頭兩隻熊重疊、最後走進水池邊。
  - ⚠️ 我誤把「下載」資料夾裡一個 11/21 的舊 tripo_convert*.glb 搬進專案又搬回去，原檔名遺失，現在叫 `Downloads/tripo_convert_from_1121_restored.glb`（內容未改）。
- 11/25 拍照數動物小遊戲 Safari Photo（Godot 4.7.2）：`games/photo-count/`，六國資料、headless 測試 12/12、Web 匯出、Playwright 六國（滑鼠＋iPad 觸控 iframe）全過；postMessage channel 'safari-count'／type 'game-done'（score、stars）。SafariApp 尚未嵌入；未部署、未 commit。詳見 games/photo-count/HANDOFF.md。
- 11/25 老師三項決定，已做（**未部署、未 commit**）：
  - ✅ **index.mjs 接線完成**：`createSafari`、匯出 `safariState / safariPuzzle / safariCount / safariAnswer / scoreSafariSpeaking / safariStamp`、排程 `purgeExpiredSafari`（每天 03:50）；教師後台 teacherExtra 先問 World Routines 再問 Safari；functions/package.json 的 check 加 safari*.mjs（通過）。
  - ✅ **解謎前遮住動物名**：問句氣泡顯示 `Look! How many ___ are there?`＋「解開謎題就知道是什麼動物」；伺服器給的公開題庫只有遮住的問句，謎題答對後才給完整問句與複數名詞（數數標題、口說標題、回答畫面才出現動物名）。新配音 `web/audio/<站>-<動物>-qm.mp3`（`make_audio.py` 產生，唸 Look! How many ... are there?，whisper 確認沒有唸出動物名，many 和 are 中間停頓約 0.4 秒）；原本的 `-q.mp3` 留在回答畫面用。已跑 `publish_to_site.py`（同時把謎題卡工作階段修好的 cards.html 發布到網站，題庫內容沒變）。
    - 仍要知道：謎題卡網址還是 `cards.html?ans=PANDA`（卡片頁面需要答案才能畫謎題），只在開發者工具看得到，畫面上看不到。
  - ✅ **There's a panda. 也算對**：單數題數量說 one 或 a 都過；評分提示也告訴 AI 說 a 不扣分。測試已加。
  - 驗證：tsc、整個專案 eslint 乾淨；51 項函式測試通過；Playwright 重走（加檢查：解謎前畫面不能出現 panda）0 錯誤，截圖更新在 `web/qa_site_1125/`。
  - 注意：拍照遊戲工作階段同時在改 SafariApp.tsx／safari*.mjs（蓋章加 stars／gameScore），兩邊修改都保留。
  - 拍照遊戲工作階段之後把遊戲接進站內（like 之後多一步 `game`，蓋章改由遊戲結束時送 minutes／stars／gameScore，老師頁與 CSV 加星星與分數），並自己走過台灣全流程到 ★★★ 蓋章、0 錯誤。~~⚠️ walk 要加玩遊戲那一步~~ → 11/25 已加：`web/qa_site_walk.mjs` 在 like 之後照 `games/photo-count/tools/qa_web.py` 的方法玩遊戲（讀 iframe 的 `window.__safari`，框內數量剛好才按快門，5 回合），並檢查蓋章頁星星＝遊戲星星。重跑結果：5/5 張照片、641 分 ★★★，蓋章、老師頁、CSV（Taiwan 拍照星星 3、拍照分數 641）都對，主控台 0 錯誤，28 張截圖 `web/qa_site_1125_game/`（總表 `web/safari_site_walk_game_1125.jpg`）。踩坑：改了 `scripts/local-preview.ts` 要**重開** vite 預覽伺服器（外掛只在啟動時載入），否則蓋章不會存星星。
- 11/25 拍照遊戲第二輪（老師要求）：動物照真實比例、無尾熊／猴子在樹枝上、題目語音＋🔊重聽、框邊公平判定；已接進 SafariApp（Like 題後玩遊戲 → 星星隨蓋章存到伺服器、老師頁顯示★、CSV 加拍照星星／分數）。本機預覽台灣全程 0 錯誤；未部署、未 commit。
- 11/25 ✅ 動畫 RDQ 規格卡 confirmed（`rdq/RDQ-spec-safari-count-animations-20261125.md`）：每國一批兩段（檢查圖→老師→正式→試片）、Tripo 上限 1,000 點、Colab 上限 30 單位（每批做完回報）、旁白＋卡拉 OK 字幕＋配樂、新動作每種先試一段、畫風統一偏寫實、結尾停 1 秒、交通工具先找圖庫。用量起算：Tripo 2,995、Colab 本專案已用約 0.5。
- 11/25 台灣批次檢查圖（給老師）：熊貓改用 Codex 寫實參考圖＋Tripo 生成（55 點，2,995 → **2,940**；上限 1,000 已用 55）；`src/taiwan_zoo.py`（TW1 熊貓＋後方遊園列車、TW2 兩隻黑熊＋結尾停 1 秒；TW2S 側面、TW2F 正面）。胸口白 V 改畫進貼圖：`src/paint_chest_v.py` → `models/taiwan_blackbear_v.glb`（骨頭上貼小方塊從沒看到過）。總表 qa/taiwan_check_batch1.jpg。等老師看。

### 11/25 台灣批正式渲染＋試片
- 老師同意後正式渲染 TW1＋TW2（qa/1125-124153/tout，final 64 samples，1.06 單位；Safari 累計約 1.63／30）。
- 旁白：`tabletop/src/safari_voice.py <station>`（Jenny −12%，網站答句，字時間存 audio/safari_words.json）。
- 合成：`tabletop/src/safari_compose.py TW1 <run>/tout TW2 <run>/tout` → `tabletop/out/taiwan_panda.mp4`、`taiwan_bears.mp4`（＋_720）。
  答句在結尾前 0.5 s 說完；數字＋動物紅字；配樂 music_holiday（WR 同一首）比旁白低 18 dB；整片 −15.9 LUFS。
- 踩坑：loudnorm 對 1.4 秒的短句（補靜音到 6 秒）只做到 −24 LUFS → 改量測 ebur128 後用固定增益（目標 −16.3）。
- 新 CLIPS 要加到 safari_compose.py 的 CLIPS 表（SHOT → station、key、秒數、徽章）。
- 2026-11-25 拍照小遊戲第三輪：11 種動物全換成 Codex 生的寫實 8 格動作圖、6 國背景＋印度／澳洲樹枝貼圖、夜景月光邊緣光；測試全過，已複製到網站 public（未部署、未 commit）。詳見 `games/photo-count/HANDOFF.md`。

### 11/25 日本批開始（老師：熊貓列車改向後接續其他動畫）
- TW1 列車車頭朝右：`taiwan_zoo.py` train(..., rot_z=math.pi)。重渲時 Colab G4、L4 都 503（Service Unavailable），等等再試。
- 圖庫：沒有寫實獅子、沒有叢林巴士 → Codex 參考圖 refs/lion_ref.png、jungle_bus_ref.png（斑馬紋＋鐵網車窗）、lion_lying_ref.png（趴著的母獅）。
- 迷你馬：圖庫 drakman「Realistic Bay Horse」Recraft 5＋Rig Other 20 → models/japan_horse_walk.glb（腳骨部分叫 bone_N，animals.py 靠「最低的末端骨」找腳）。
- ⚠️ 踩坑：Tripo AI Animation 只能用在人形骨架，四腳只有 Walk（白花 20 點，已記帳）。→ 小跑＝Walk 加快播放；趴著的獅子＝另做靜態模型。
- 獅子 Image to Model 55（2,895 → 2,840）。Safari 累計 Tripo 155／1,000。
- 11/25 13:30 日本模型齊：japan_lion_walk（Image to Model 55＋Rig 20，骨架很稀，四腳只有 Walk）、japan_lion_lying（靜態 55）、
  japan_jungle_bus（斑馬紋鐵網窗，靜態 55）、japan_horse_walk、japan_boy（WR Haruto 複製）。日本批 Tripo 共 230（2,940 → 2,710），Safari 累計 285／1,000。
- 場景程式 `tabletop/src/japan_safari.py`（JP1 6.5 秒：3 隻趴著＋2 隻走、巴士從右開進；JP2 7.0 秒：6 匹小馬繞圍欄小跑＝Walk×1.7、Haruto 在欄外）。數字都是 GUESS，等檢查圖。
- TW1 列車轉向重渲：Colab 13:28 重試成功開機。
- 11/25 14:40 日本檢查圖 6 輪後送老師（tabletop/qa/japan_check_batch2.jpg）：JP1 五隻獅子（2 走＋3 趴）結尾都看得到、巴士側面由右往左開進停在後面；JP2 六匹白色迷你馬繞圍欄小跑，Haruto 在圍欄後右邊。
  - 本機新工具 `tabletop/src/gltf_fk.py`：不開 Blender 看 GLB 走路時每隻腳有沒有動（fit() 量步速）。
  - animals.py 新功能：`clip_speed_h`（量不到步速時用熊的 0.44 身高/秒）、`fix_legs=[(壞腿末端骨, 好腿末端骨)]`（IK 鏡像好腿、慢半步）、腳骨改成每條 Limb 鏈的最末骨。
  - 白馬 bone_17 是一條前腳（掛在 Head_1 下），用 0_Left_Limb_4 鏡像補。滑步中位數：獅子 1.8 mm、小馬 2–3 mm（中遠景看不出）。
  - 沒用的模型移到 models/_unused/（colab_run 只上傳 models/*.glb）。
- 日本批 Tripo 390 點（Safari 累計 445／1,000）；Colab Safari 累計 3.33／30。
- 2026-11-25 拍照遊戲上 30 天預覽網址（到 12/25）：https://talktofriends-6b58d--safari-photo-qg3cduse.web.app/ ；正式站未動；六國線上全程通過；待 iPad 實機。詳見 games/photo-count/HANDOFF.md。
- 11/25 15:50 日本正式渲染（qa/1125-151947/tout，1.16 單位；Safari Colab 累計 4.49／30）＋合成 → tabletop/out/japan_lions.mp4（6.5 秒，−15.9 LUFS）、japan_horses.mp4（7.0 秒，−15.6 LUFS）＋_720。
  旁白：safari_voice.py 加 EXTRA 表（stations.json 日本以後還是 comingSoon，答句照對話稿 v1）。等老師看試片。
- 台灣 TW1 v2（列車車頭朝右）已重渲重合成並交老師；TW1、TW2 都還沒說定案。
- 拍照遊戲 session 要等「謎題卡」（safari-count-10）＋「解題方式」（safari-count）都完成後，整流程重新放 30 天預覽頻道 → 兩邊完成時要通知它（local_a363674b…）。

### 11/25 題目三項修正（老師 1A、2C、3A＋建議①–⑤，規格卡 `rdq/RDQ-spec-safari-count-question-fixes-20261125.md` confirmed）
- **單數句 There is one ___.**：`content/stations.json` 台灣熊貓 slots ["is","one"]、spoken There is one panda.，干擾字 much／panda／'s／two（不放和答案相同的字，修掉重複的 are）；`safari_voice.py` 肯亞 RHINO、澳洲 LION 也改 There is；口說仍接受 There's；評分提示與口說小抄改成 There is（或 There's）。`web/audio/taiwan-panda-a-g/b.mp3` 重配、TW1 旁白重配並重新合成 `tabletop/out/taiwan_panda.mp4`（whisper：There is one panda.）。
- **like 依據**：stations.json `like.clue`（台灣 I love pandas!，其他五國的句子寫在對話稿最後一段）。配音 `web/audio/<站>-like-clue-<g|b>.mp3`（g＝主角女生→旅伴男生 Christopher；b＝旅伴女生 Maisie，和 Mei 的 Ana 分開）。`tabletop/src/safari_clue.py taiwan bears` → 熊的動畫最後加 3.2 秒線索卡（旅伴＋泡泡＋❤️，背景用熊貓的乾淨數數圖）→ `out/taiwan_bears_clue_g/b(_720).mp4`。like 題畫面也有旅伴泡泡＋❤️，🔊 先唸線索再唸問句。公開題庫給 clue，不給 yes。
- **數數圖**：`web/count/taiwan-panda.jpg`（TW1 f0144）、`taiwan-bears.jpg`（TW2 f0168），檢查圖 `web/count/taiwan_count_check.jpg`（已傳老師）。伺服器 scene 多 `picture`；數數畫面顯示圖片＋「Look at the picture and count. 看圖數一數。」（圖片載入失敗才退回 emoji）。
- **動畫接進網站**：`publish_to_site.py` 會把 `tabletop/out/*_720.mp4` 複製成 `public/safari-count/films/<站>-<動物>[-clue-g|b].mp4`、數數圖到 `public/safari-count/count/`。作答後的「Watch the story」播動畫，播完才能 Next；最後一隻動物播 clue 版（依主角男女）。
- 驗證：函式測試 51/51（加了干擾字不重複、數數圖、公開 clue 的測試）、tsc、`npm run lint` 乾淨；walk（`web/qa_site_walk.mjs`，含數數圖、兩段動畫看完、like 線索、拍照遊戲）0 錯誤，30 張截圖 `web/qa_site_1125_fixes/`（重點 `fixes_overview.jpg`，總表 `web/safari_site_walk_fixes_1125.jpg`）。
- ✅ 影音不入庫（老師 11/25）：`monster-in-my-mind-site/.gitignore` 排除 public/safari-count/films、audio、count；`MIKE ESCPAEROOM/.gitignore` 排除本資料夾所有 mp4／mp3／wav 與 web/count/。檔案只留在 G 槽，部署前跑 publish_to_site.py 複製到網站。未部署、未 commit。
- 11/25 老師退件（巴士）：JP2 停在草地板外、車頭撞山、前輪懸空；JP1 輪子陷進路面 → 巴士 z＝FLOOR＋ROAD_T、路加寬到 0.10、JP2 巴士移到 (0.27, 0.20)。檢查圖 qa/japan_bus_check.jpg OK，正式重渲中。
- 11/25 ✅ 老師通過數數圖（taiwan-panda.jpg、taiwan-bears.jpg）與 like 線索卡（男女兩版）。仍未部署、未 commit。
- 11/25 16:00 老師要關機 30 分鐘。日本正式重渲（巴士修正）15:35 開跑、約 29 分鐘；若電腦關機時還沒下載，開機後：
  1) `colab ls` 看 sct 還在不在；在的話跑 `python src/colab_run.py final japan_safari "JP1 all" "JP2 all"` 會重跑（輸出不續傳），或先手動下載 /content/out。
  2) 合成：`python src/safari_compose.py JP1 <run>/tout JP2 <run>/tout` → out/japan_lions.mp4、japan_horses.mp4，交老師。
  3) 完成後通知拍照遊戲 session（local_a363674b…）日本新影片好了。
- 其他：Safari 整套第一次上線（網站＋7 個雲端功能）在 safari-count session 等老師確認。
- 11/25 16:30 日本 v2（巴士修正）重渲完成 qa/1125-160153，合成 out/japan_lions.mp4（−15.9）、japan_horses.mp4（−15.6）＋_720，已交老師、已通知拍照遊戲 session。Colab sct 已手動停止。Safari Colab 累計 5.65／30。
  等老師：台灣 TW1 v2＋TW2、日本 v2 是否定案；定案後做肯亞（斑馬×8 走、犀牛×1 走＋低頭吃草＝靜態或程式擺頭）。

### 11/25 ✅ 台灣、日本四段定案（老師）
- 定案片：tabletop/out/taiwan_panda.mp4（TW1 v2 列車朝右）、taiwan_bears.mp4、japan_lions.mp4（v2 巴士修正）、japan_horses.mp4（v2）＋各自 _720。
- 下一批：肯亞（斑馬×8 排隊過馬路、吉普車停下等；黑犀牛×1 慢走＋低頭吃草停兩下）。

### 11/25 ✅ 第一次部署到正式站（老師「Deploy everything」）
- 網址：https://talktofriends-6b58d.web.app/safari-count（學生）、/safari-count/teacher（老師，同六碼通行碼）。首頁沒有入口，只能用連結進。只開台灣。
- 部署前比對：
  - 線上最後發布 11/24 18:44（World Routines he/she 埃及）。
  - 把 Safari 拿掉重建＝`index-D3Fp-jST.js`，和線上同一個檔名 → 線上就是 G 槽減掉 Safari。
  - public 雙向比對：沒有 LIVE-ONLY／DIFFERENT，新增的 69 個檔都是 safari-count。
- 函式：
  - 7 個 Safari 函式（safariState、safariPuzzle、safariCount、safariAnswer、scoreSafariSpeaking、safariStamp、purgeExpiredSafari）在我部署前已經存在：11/25 16:46 被別人建好，revision -00001。
    - 我下載線上原始碼比對，和本機一模一樣，所以沒有重新部署。是哪個工作階段部署的不清楚。
  - 我只部署 `monsterPortal`（老師頁的 safari／safariRecords／safariRecording）。和線上原本的差異只有 Safari 接線。
  - 清理政策錯誤照舊，沒有設定。
- 網站：`firebase deploy --only hosting`，主程式 `index-vWJpO504.js`。日本兩支影片（japan-lions、japan-horses）還沒定案，從建置裡拿掉，沒上線。
- 建置副本：`%TEMP%\safari-build\site`，從 G 槽完整鏡像（robocopy /MIR，不含 node_modules、.env）。
- 驗證：
  - 部署前 tsc、`npm run lint`、函式測試 51/51 都通過。
  - 部署後用內建瀏覽器、測試學號 50199 走：登入 → 地圖 → 熊貓謎題 → 數數圖 → 數 1 → 拖放 There is one panda. → 動畫播放，主控台 0 錯誤。
  - 老師頁登入畫面正常（未登入的 401 是預期）。
- **還沒驗**：
  - 真的 AI 口說評分（會花錢，沒按）；
  - 拍照遊戲、蓋章、老師頁真資料；
  - iPad 實機。
- ⚠️ 測試學號 50199 在正式資料庫留下一筆台灣熊貓進度（501 班會看到）。7 個月後自動到期，要早點刪的話再說。
- 2026-11-25 傍晚 完整 Safari Count 上預覽網址 /safari-count（7 個 Safari 雲端功能已上正式後端、reCAPTCHA 暫加預覽網域，到期要移除）；實走到口說錄音頁正常。詳見 games/photo-count/HANDOFF.md。

### 11/25 肯亞批開始
- 模型：kenya_jeep（圖庫 bjorn.erik.hoel 橄欖綠敞篷吉普，5 點）、kenya_zebra_walk、kenya_rhino_walk（Codex 純側面參考圖 → Image to Model 55＋Rig 20，各一次就四腳都會動——純側面參考圖比 3/4 角度好綁）。肯亞 Tripo 155 點，Safari 累計 600／1,000。
- animals.py 新 `graze(t0, t1, down_deg)`：Head_* 骨頭沿身體側軸低頭，第二條 NLA 軌（COMBINE），走路時先停（walk 分段）。
- 場景 `tabletop/src/kenya_safari.py`：KE1 7 秒 8 隻斑馬一列從左到右過紅土路、吉普車在路上停等；KE2 7 秒 犀牛走→低頭吃草→走→低頭吃草（到結尾）。
- 17:00 Colab G4／L4 又 503 → 背景每 5 分鐘重試檢查圖（最多 1 小時）。
- 11/25 補：老師 16:40 在主工作階段把台灣、日本四段動畫定案。台灣兩段的定案檔就是已上線的版本（逐位元組相同）。日本 v2（16:03，巴士修正）比網站 public 裡的舊版（15:21）新，但日本站還沒開放、也沒上線；開站時重跑 publish_to_site.py 再部署。16:46 那次函式部署：查 Cloud 稽核紀錄，是某個 Claude Code 工作階段用 Firebase CLI 部署的；謎題卡與主工作階段都說不是它們。
- 11/25 單數答句改成「There is one ___.」（網站 session 的題目修正規格，老師核准；台灣熊貓片已由網站 session 重配音）→ safari_voice.py 的 EXTRA 犀牛、獅子也改成 There is one。
- 11/25 17:50 肯亞檢查圖 4 輪後送老師（qa/kenya_check4.jpg）：KE1 8 隻斑馬結尾都在畫面、不重疊，吉普車停在紅土路上等；KE2 犀牛走→低頭吃草（鼻尖降到草叢）→走→低頭吃草。
  - 踩坑：graze 第一次頭往上抬（繞 side 軸的正角度＝抬頭）→ 改負角度；38° 只降 1 cm，改 75°。
  - Colab 17:20–17:38 G4 503，背景重試第 3 次成功。
- 11/25 19:29 老師核准正式渲染 → Colab final（qa/1125-192927，KE1／KE2 各 85 格，1.29 單位；今日 Colab 合計約 6.9 單位）。
  - 旁白 edge-tts Jenny −12%：kenya_zebras_a「There are eight zebras.」、kenya_rhino_a「There is one rhino.」。
  - 試片 out/kenya_zebras.mp4、kenya_rhino.mp4（＋_720），7.0 秒，−16.0／−16.1 LUFS；抽格 out/kenya_sheet.png（結尾 8 隻斑馬都在、不重疊；犀牛低頭吃草）。等老師定案。
- 11/25 老師退件 KE1：「斑馬倒退走」。原因：Tripo 把斑馬骨架前後綁反（Walk 往尾巴跨步，舊的方向判斷也跟著錯）。修法：animals.py 新增 `reverse_clip=True`（倒著播 Walk），新增本機檢查 `src/walk_dir_check.py`（犀牛、獅子、白馬、黑熊都 ok，只有斑馬 BACKWARDS）。檢查圖 qa/kenya_rev_check.jpg（0.20 單位），KE1 重新正式渲染。
  - KE1 v2：qa/1125-195827（85 格，0.58 單位）→ out/kenya_zebras.mp4（−16.0 LUFS），抽格 out/kenya_zebras_sheet.png：頭朝右、往右走，結尾 8 隻。今日 Colab 約 7.7 單位。等老師定案。

### 11/25 晚 ✅ 日本站開放並上正式站（老師：「把日本站也打開」→ 本工作階段「Deploy」）
- 題庫：stations.json 日本（Haruto 男生聲、Fuji Safari Park、jungle bus）。
  - LIONS 拖放：There are five lions.，干擾字 much／lion／is／four。
  - HORSES 口說：問句前有 Let's get off the bus and go to the farm.，答句 There are six horses.。
  - like 題 yes:false、likes:horses、clue「I like horses!」，拖放 `___, PRONOUN ___. Pronoun ___ horses.`（No／doesn't／likes；干擾 Yes／does／like）。
  - 頁面 PRONOUN→he/she、Pronoun→He/She；make_audio 的 No 答句會接「He likes horses.」。
- 數數圖：`web/count/japan-lions.jpg`（v2 JP1 f0016，沒有巴士，5 隻清楚）、`japan-horses.jpg`（JP2 f0168，6 匹）。檢查圖 `web/count/japan_count_check.jpg`。
- 線索卡：`safari_clue.py japan horses` → `out/japan_horses_clue_g/b`。
- ⚠️ **我的錯，已修正**：下午 15:16 重配熊貓旁白時，用了舊的 TW1 畫格（qa/1125-124153，列車車頭朝後）合成，蓋掉了老師核准的 v2（qa/1125-134428，車頭朝右），而且這版上了正式站。已改用 v2 畫格重新合成（旁白 There is one panda.），這次一起部署。重新合成時要用 HANDOFF 記的最新 run 資料夾。
- 部署前比對：
  - 線上最後一次發布就是我下午那次，函式沒被動過，G 槽和建置副本完全相同。
  - public 和線上的差異只有日本 21 個新檔＋熊貓影片。
- 部署內容：7 個 Safari 函式＋monsterPortal（題庫有變），以及網站，主程式 `index-BhP9svlL.js`。
- 驗證：
  - 函式測試 51/51、tsc、lint 都通過。
  - 本機日本全程走一遍（含拍照遊戲 ★★★），台灣再走一遍沒有退步，兩邊都 0 錯誤，截圖 `web/qa_site_1125_japan/`。
  - 正式站：日本開站 → LIONS 鏡像謎題卡 → 數數圖，沒有新錯誤；熊貓影片和 v2 逐位元組相同。
  - 真 AI 口說、iPad 還沒驗。
- 16:46 那次部署 7 個函式的是拍照遊戲工作階段（老師同意過）。它也部署了預覽頻道 safari-photo，並把預覽網域加進 reCAPTCHA 金鑰的允許清單，12/25 到期時要移除。
- 2026-11-25 晚 測試學號 50197、50199 的正式資料庫紀錄已刪（老師要求）；50198 還在。

### 11/25 晚 印度批（老師：「肯亞兩段可以定案、接著做印度」）
- 肯亞 KE1 v2＋KE2 ✅ 定案。
- 模型（Tripo 185 點，Safari 累計 785／1,000，餘額 2,210）：圖庫老虎都是卡通／人形 → Codex 純側面參考圖。
  india_tiger_walk（55＋Rig 20，四腳都動、walk_dir_check ok）、india_langur_sit、india_langur_leap（各 55，靜態不綁骨架）。
- 場景 src/india_safari.py：IN1 兩隻老虎從長草走出來、tiger2 3.2 秒停下左右張望（animals.py 新增 look()：Head_ 骨繞垂直軸 ±55°）；吉普車 kenya_jeep 沿用。
  IN2 兩棵樹、4 隻一直坐著＋3 隻輪流跳到對面樹（坐姿模型→跳躍模型沿拋物線→坐姿模型），4.0 秒後 7 隻都坐好。
- 旁白 india_tigers_a「There are two tigers.」1.51 秒、india_monkeys_a「There are seven monkeys.」1.66 秒；safari_compose 已加 IN1／IN2。
- 檢查圖第 2 輪 qa/india_check2_in1.jpg、india_check2_in2.jpg（Colab 約 0.2 單位）送老師，等核准正式渲染。
- 11/25 老師：「Tripo不要設限制」→ 取消 Safari 1,000 點上限（仍記帳、每批回報）；「印度兩段可以正式渲染」→ Colab final IN1＋IN2。
- 印度 final：qa/1125-212912（IN1／IN2 各 85 格，1.36 單位）→ out/india_tigers.mp4（−15.5 LUFS）、india_monkeys.mp4（−15.7 LUFS），＋_720；抽格 out/india_sheet.png。等老師定案。
- 11/25 測試學號 50198 紀錄也已刪除（50197／50198／50199 全清）。

### 11/25 晚 新加坡批（老師：「定案，做新加坡」）— 收工時停在第 1 輪檢查圖
- 印度 IN1＋IN2 ✅ 定案。
- 模型（Tripo 285 點，餘額 1,925；老師已取消上限）：singapore_elephant_walk（H3.1＋Rig，四腳動、方向 ok；小象＝同模型 ×0.5）、
  singapore_turtle_walk（H3.1；第 1 次 Rig 右前腳把龜殼拉出尖刺 → 重綁；遠側前腳在參考圖是抬起的 → LEGFIX fix_leg）、
  singapore_night_tram（H3.1 靜態，長軸 x、拖車頭在 −x → TRAM_YAW 180）。另有一隻 H3.5 大象（60 點、排隊約 1 小時）未使用。
  Tripo 預設改成 H3.5 Preview（60 點）；要 H3.1（55 點、1–2 分鐘）得在 AI Model 下拉選。
- 場景 src/singapore_safari.py：SG1 夜間 3 大象＋小象跟媽媽、遊園車在後方路上同向慢慢開、燈籠；SG2 河邊 6 隻曬太陽＋3 隻爬進淺水、前面木棧道。
- 旁白 singapore_elephants_a 1.63 秒、singapore_turtles_a 1.51 秒；safari_compose 已加 SG1／SG2。
- 第 1 輪檢查圖 qa/singapore_check1.jpg（已傳老師）。下次要修：
  1. SG1 夜晚不夠暗（地面像白天）→ 降補光、地面顏色變暗、月光偏藍。
  2. SG1 結尾帶頭的大象被右邊切掉 → 鏡頭拉遠或整排往左。
  3. SG2 河岸、石頭、水顏色太淡近白 → 顏色加深、曝光降低；烏龜偏小 → 鏡頭拉近或 TURT_H 加大。
  4. SG2S 低角度被欄杆擋（只是檢查鏡頭，可把 S 鏡頭放到欄杆前）。
- colab_run.py 修正：新 Colab 機器的 pid 會重複 → 上傳快取沒清、engine.py 沒上傳（ModuleNotFoundError）。token 改用隨機數。
- 今日 Colab 約 9.5 單位。全部未 commit 的影音、圖片、glb 不入庫。
- 收工 11/25 22:3x：git 的 .git/index.lock 一直被應用程式背景 git 程序佔住，沒有 commit／push。下次要 commit 的範圍：tabletop/src/*.py（含新的 kenya/india/singapore_safari.py、walk_dir_check.py、colab_run.py 等）、HANDOFF.md、tools/動畫共用踩坑規則.md、hwg7-u04-world-routines/tabletop/tripo-ledger.json。影音、圖片、glb、qa、out、models、refs 不入庫。
