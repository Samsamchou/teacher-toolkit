# 世界作息之旅：一站製作手冊（STATION_MANUAL）

- 寫成日期：2026-11-20 晚。老師要求：之後做下一站的人（老師、助手或 AI）照這一份做，不再重犯前面踩過的坑。
- 以下路徑都從本資料夾 `tools/MIKE ESCPAEROOM/hwg7-u04-world-routines/` 算起；網站資料夾是 `tools/monster-in-my-mind-site/`。
- 進度看 `HANDOFF.md`（按時間往下寫，**越下面越新**）。本手冊和 HANDOFF 衝突時，以 HANDOFF 最新那段為準，並回來改這份。
- 第 8 節列出各份資料互相矛盾或過時的地方。

---

## 0. 各站目前狀態（2026-11-20 晚）

| # | 站（id） | 時間／作答 | 遊戲（換皮狀態） | 當地學生 3D 模型 | 網站 3D 立繪 | 情境動畫 |
|---|---|---|---|---|---|---|
| 1 | Taiwan（taiwan） | 6:45 拖放 | 校車衝刺，本機完成 | `taiwan_girl.glb` | ✅ 已上線 | v2 **被退件**（左右手拿法鏡像），修正中 |
| 2 | Japan（japan） | 12:15 口說 | 接便當，舊版上線、新版在本機 | `japan_boy.glb`、`japan_boy_lunch.glb` | ✅ 已上線 | ✅ 11/19 定案 |
| 3 | USA（usa） | 7:35 口說 | 校車衝刺，本機完成 | `usa_girl.glb`（老師選女生） | 還沒渲 | 分鏡草稿（寫男生，已過時） |
| 4 | UK（uk） | 4:30 拖放 | 時鐘忍者，本機完成 | `uk_boy.glb`＋`uk_desk.glb`、`uk_teaset.glb` | 還沒渲 | 分鏡草稿；模型已買（帳本） |
| 5 | Spain（spain） | 9:15 口說 | 時鐘忍者，本機完成 | 沒有 | 沒有 | **沒有分鏡、沒有參考圖** |
| 6 | Egypt（egypt） | 6:35 口說 | 接便當，本機完成 | 沒有 | 沒有 | 分鏡草稿 |
| 7 | Kenya（kenya） | 5:40 拖放 | 校車衝刺，本機完成 | 沒有 | 沒有 | 分鏡草稿 |
| 8 | India（india） | 2:40 口說 | 接便當，本機完成 | 沒有 | 沒有 | 分鏡草稿 |
| 9 | Singapore（singapore） | 9:45 拖放 | 行李轉盤，本機完成 | 沒有 | 沒有 | 分鏡草稿 |
| 10 | Australia（australia） | 7:15 口說 | 行李轉盤，本機完成 | 沒有 | 沒有 | 分鏡草稿 |

- 十站的遊戲換皮都已在本機做完；**都還沒複製到網站、沒部署**。所以「下一站」主要的工作是：3D 學生 → 網站立繪 → 情境動畫 → 一起部署。
- 當地學生的性別要和網站答句配音一致（`web/make_audio.py` 的 `GENDER`）：台灣女、日本男、美國女、英國男、西班牙女、埃及男、肯亞女、印度男、新加坡女、澳洲男。
- Tripo 餘額（帳本）605 點；五站（埃及～澳洲）全做 925 點、省點版 705 點，都不夠，要先問老師（`tabletop/five_stations_summary.md`）。

---

## 1. 一站要做哪些東西

| # | 東西 | 檔案位置 | 做好的判斷標準 |
|---|---|---|---|
| 1 | 站別資料（問句、密碼、答句、延伸句、作答方式、解謎類型、遊戲） | 網站 `functions/routines-content.json`（單一來源，10 站都已寫好） | 只核對，不重寫。改了要重新部署函式＋網站 |
| 2 | 解謎卡 | `puzzles/src/cards.html` 依網址參數即時畫（0–9 都有） | `python puzzles/src/render.py <四位數>` 出圖看過；網站上卡片沒被裁切 |
| 3 | 問句／答句語音 | `web/audio/`（`web/make_audio.py`，46 檔已做） | 已存在；**還沒有人耳聽過** |
| 4 | 當地學生參考圖 | `tabletop/refs/<國>_boy.png`、`_girl.png`、`_pair.jpg`（西班牙還沒有） | 正面、A 字站姿、雙手張開手指分開、全身、白底、沒字、沒其他人；老師看過 |
| 5 | 分鏡 | `tabletop/<國>_storyboard.md` | 老師確認分鏡、學生性別服裝、Tripo 點數 |
| 6 | 3D 模型（學生＋2 件不會動的大道具） | `tabletop/models/<名稱>.glb` | `check_glb.py`：65 根骨頭、兩手手指都有權重；帳本已記 |
| 7 | 網站 3D 立繪 | `tabletop/src/portraits.py` → `web/art3d/char_<id>.png` | 透明背景、腳踩地、揮手不擋臉；`content.ts` 的 `CHAR_3D` 加上 id |
| 8 | 情境動畫場景程式 | `tabletop/src/<場景>.py`（例：`taiwan_breakfast.py`） | 檢查圖老師說可以才正式渲 |
| 9 | 配音＋字時間 | `tabletop/src/<國>_voice.py` → `tabletop/audio/<國>_*.mp3`、`<國>_words.json` | 句子和分鏡一致、聲線和網站一致 |
| 10 | 合成 | `tabletop/src/<國>_compose.py` → `tabletop/out/<場景>.mp4`（1080p）＋`web/video/<id>.mp4`（720p） | 抽格看過；**老師定案** |
| 11 | 遊戲換皮 | `games/<遊戲>/data/<id>.json`、`art/<id>/`、`audio/times/`、`web/` | 好／壞機器人都過、瀏覽器實跑 0 錯誤（第 4 節） |
| 12 | 帳本 | `tabletop/tripo-ledger.json`、`tabletop/colab_usage.log` | 每次花點數、跑 Colab 都記 |
| 13 | 交接 | `HANDOFF.md` 加一段（日期、成果、花費、踩坑、還沒做的） | 下一個人只讀 HANDOFF 就能接 |

---

## 2. 流程與確認點

| 步驟 | 先給老師看什麼 | 要老師**當次**同意的 |
|---|---|---|
| 1 開工 | 讀 HANDOFF 最新段落、到 Tripo 頁面讀餘額 | — |
| 2 分鏡 | `tabletop/<國>_storyboard.md`＋待決定事項清單 | 分鏡、學生性別與服裝、道具清單與 Tripo 點數 |
| 3 參考圖 | 學生＋道具參考圖（Codex，免費） | 「可以建模」 |
| 4 Tripo 建模 | 報：餘額、這批要花幾點、做完剩幾點 | **點數**（每批都要問；卡住重生也要再問） |
| 5 檢查圖 | 每個鏡頭靜止檢查圖＋器具特寫（兩個角度）＋量測數字 | 先報 Colab 預估單位；檢查圖通過才正式渲 |
| 6 正式渲染＋合成 | 全片 MP4＋抽格總表 | 先報 Colab 預估（final 每 2 鏡約 0.7–2.0 單位，見 `colab_usage.log`）；做完報實際用量 |
| 7 定案 | — | 老師說「定案」才把影片放進網站 |
| 8 部署 | 比對線上結果＋部署範圍（哪些檔案、哪些函式） | **部署**（每次都要問，不能沿用上次同意） |
| 9 commit | 要 commit 的範圍 | commit 範圍 |

- **RDQ（`rdq` skill）什麼時候用**：開一個新的中大型工作（例：遊戲長度、開場配樂）、或**退件後重做**（例：11/20 B4 拿筷子）。產出 `../rdq/RDQ-spec-world-routines-<主題>-<日期>.md`，老師說「照這份開始」才動工。執行中的小調整不用 RDQ。
- **花錢的三件事**：Tripo 點數、Colab 單位、部署。Codex 生圖、edge-tts 配音免費，但成品一樣要給老師看。
- Colab：11/14 起每天可以超過 30 單位，不用為此停下來問；但仍要「開機前報預估、做完報實際、渲完就關、卡住馬上停」。
- 一國一國做完整（動畫＋遊戲＋3D 學生）再換下一國（`../rdq/RDQ-spec-world-routines-run-anim-next-20261119.md`）。建議先做 1–2 站試做，確認動作合理再做其他站（`five_stations_summary.md`）。

---

## 3. 3D 情境動畫（桌上微縮風）

長度約 20 秒、4 個鏡頭、12 fps（只渲偶數格，每格放兩次）、1080p＋720p。所有 Blender 都在 Colab，**本機不開 Blender**。

### 3.1 參考圖（Codex，免費）

- 提示詞範本：`tabletop/refs/ref_prompts.py`（人物用 `BASE`、道具用 `PROP`；`CHARS` 裡已有十國男女的描述）。
- 平行生圖：`tabletop/refs/gen.sh <名稱...>`。**Codex `-s workspace-write` 寫不進 G 槽**：先存暫存資料夾再複製回 `refs/`（gen.sh 就是這樣做）。不要用 `--full-auto`。
- 人物要求：正面全身、A 字站姿、雙手張開手指分開（Tripo 才綁得好骨架，避免握拳手）、白底、沒字、沒其他人、沒宗教符號。
- **吃東西、坐下的學生不要背書包**：日本男生的書包做在模型身上，吃飯時拿不掉。
- 要照特定制服時用 `codex exec -i <照片>` 附參考（台灣制服就是這樣做）。
- 器具拿法參考圖也可以用 Codex 畫（例：`refs/chopsticks_reference.png`，4 格），先給老師看，當擺姿勢的標準。

### 3.2 Tripo 建模

- 設定（帳本 `note`）：Tripo Studio、HD H3.1、30000 面、4K PBR、Private；人物加 Auto Rig（Humanoid、Mixamo）；匯出 GLB 2k。
- 點數：學生 75＝模型 55＋骨架 20；道具每件 55。玩具飛機、船、火車是帳號裡現成的，匯出 0 點。
- 每站只做 **2 件不會動的大東西**（場景、桌椅）；會被拿起來的東西（杯子、筷子、鉛筆、作業簿）用程式做成獨立小物件。
- 介面踩坑：
  - 匯出視窗在人物頁和道具頁的按鈕位置不同 → 每次先截圖再點。
  - 送出後卡在 Generating 超過 35 分鐘（`breakfast_shop`）→ 先問老師等或重生（重生要再同意 55 點）；那筆約一小時後被 Tripo 自動取消並退點。帳本要記退點。
- 下載抓檔：`python tabletop/grab_glb.py <名稱>`（等 Downloads 出現完整 GLB，複製成 `tabletop/models/<名稱>.glb`）。
  - 道具匯出時 Chrome 常只留下 `<uuid>.tmp`（檔案其實完整）→ grab_glb 會認。
  - Chrome 事後會把**早先的** `.tmp` 改名成 `tripo_convert_*.glb`，grab_glb 會把它當新檔抓錯 → 抓完一定看檔案大小／三角面數；不對就從 Downloads 挑最新的。匯出前可先跑 `python tabletop/grab_glb.py --mark`，把 Downloads 裡現有的檔案標成看過。**`--mark` 一定在按 Export 之前跑**（之後跑會把剛下載好的檔也標掉）。抓完用 `check_glb.py` 對 Tripo 頁面上的三角面數（11/20 第 1 批：媽媽第一次抓成燉豆鍋）。一批可以同時送出多個生成（實測 9 個並行沒問題）。
  - 老師不在電腦前、Chrome 截圖逾時（11/20）：先用 PowerShell 列出 Chrome 視窗，若有「另存新檔」對話框就關掉（它會卡住整個 Chrome）；螢幕關閉時 Chrome 不重畫，要先喚醒顯示器；視窗很小時改用 `find` 的 ref 點按鈕（Export、Auto Rig、對話框裡的 Export）、讀餘額與面數，不靠座標。
- 檢查：`python tabletop/check_glb.py`（列出每個 GLB 的面數、骨頭數、兩手手指骨數與有權重的頂點數）。人物要 65 根骨頭、兩手都有手指頂點。
  - 握拳手不能用（老師 11/10）：用另一專案的 `make_openhand.py` 鏡射好的手（見 `tools/3D人物建模檢查清單.md`）。
  - 面數超過 15 萬或 GLB 超過 20 MB：先減面再渲（感恩節／影片 8 的 `predecimate.py` 做法）。這個專案目前還沒遇到。
- 做完馬上記 `tabletop/tripo-ledger.json`（項目、點數、前後餘額）。

### 3.3 場景程式

- **從 `tabletop/src/taiwan_breakfast.py` 複製**（最新、最完整），改名 `<場景>.py`。日本那支 `japan_lunch.py` 可參考教室課桌椅的 `probe_desk()`。
- 共用引擎是感恩節的 `2026 Thanksgiving/classroom-tabletop/src/engine.py`（`colab_run.py` 直接上傳，不另存副本）。
- **程式只能用 ASCII**（註解也是）：`colab exec` 在 Windows 用 cp950 讀檔。
- 開頭的 `DUR`（每鏡秒數）和 `VOICE`（配音開始時間）要和 compose 的 `SHOTS` 一致。
- 尺寸：`KID = 0.070`（學生高 7 cm）、主角 `GIRL = KID * 1.06`（帽子）、當地學生 `PUPIL = KID * 1.04`。
- 可以直接複製的函式：
  - 場景：`hand_box`（鐘的指針，時鐘用程式做，任何時間都行）、`rays_down`、`drop`、`steam`（定格動畫的蒸氣）。
  - 量家具（**不要用猜的**）：`probe_table`／`table_set`（往下打光線找桌面與凳面高度）、`shop()` 找櫃台前緣與高度。印出 `DESK ...` 行。
  - 人物：`hand`、`mouth`、`hips_height`、`animate`、`stand`、`seat`、`local_dir`、姿勢表 `LEGS`、`P_CARRY`、`P_REACH`、`P_LAP`、`L_REST`。
  - 道具跟著手：`key_obj`、`aim_rod`、`rod_between`、`lerp_keys`、`cam_move`。
  - 手：**不要複製，一律 `from hands import *`**（`tabletop/src/hands.py`，11/20 從台灣 B4 抽出，`colab_run.py` 會自動一起上傳）。內含 `hand`、`mouth`（嘴的位置跟著頭轉；第一次呼叫記下參考姿勢，或像英國站在 `metrics()` 量好後寫進 `H._MOUTH_REF[ch.name]`）、`FINGERS`、`PALM_SIGN`、握法表 `G_CHOP`／`G_CUP`／`G_RELAX`、`STICK_L`、`arm_space`、`rot_bone`、`hand_frame`、`curl`、`orient_hand`、`to_local`、`to_world`、`ik_arm`（兩段手臂 IK）、`key_hand`、`rod_between`、`lerp_keys`。新握法（握筆、湯匙、牙刷…）寫在自己的場景檔；確定好用再搬進 `hands.py`，搬完要重渲台灣 B4 第 24 格比對（11/20 驗證：抽出後和定案版逐像素相同）。B4 裡的 `body()`（先腿、脊椎前傾 `LEAN`、頭，再擺手臂，IK 才看得到前傾後的肩膀）仍在場景檔。
  - Tripo 模型自帶多餘東西：`drop_tray_sticks()` 用 bmesh 依座標刪面（座標是那個模型專用，換模型要重量）。
  - **坐姿（老師 11/20 兩次退件：看起來站在椅子後面、雙腿穿過椅墊）**：
    1. 椅面高度＝膝高 − 大腿厚（`hands.seat_under()` 從變形後的網格量，Q 版大腿約 5–6 mm），人坐上去大腿平放、壓進椅墊約 1 mm、小腿垂直、腳踩地。不要用模型原本的椅子高度。
    2. 椅子前緣在膝蓋後面約 2.5 mm（小腿在椅面前方垂下），屁股和椅背之間留空隙。
    3. Tripo 桌椅常黏在一起（椅背穿過桌面）：先畫頂點剖面圖確認；黏住就用 `strip_chair()` 刪掉模型的椅子、`build_chair()` 程式做椅子（英國站）。
    4. 任何 bmesh 依座標切模型之前先 `bpy.context.view_layer.update()`（11/20：沒更新時切到未放大模型的一條細片）。
    5. 檢查圖固定加兩個腿部鏡頭：側面座高（K2L）、前方低角度（K2L2），確認大腿蓋住椅墊、沒有穿過。
- 會印量測行：`DESK`（家具、肩膀、嘴、桌面位置）、`CONTACT`（筷尖到目標、到嘴距離）、`DESK REACH t= need ... arm ...`（需要的距離 vs 手臂全長）；引擎每格印 `CHK`、`GND`（腳離地 mm）。交檢查圖時附上這些數字。
- 程式用 `os.environ.get(...)` 讀的調整值（`TRAY_DY`、`SEAT_DY`、`LEAN`、`STICK_L`、`MOUTH_Y`、`PALM_R` 等）：**`colab_run.py` 不會把本機環境變數帶到 Colab**，要改就直接改程式裡的預設值。
- 四鏡的固定結構（日本、台灣都這樣）：
  1. 第 1 鏡 5.6 秒：全景，主角發問、當地學生用**靠時鐘那一側的手**指時鐘回答。
  2. 第 2 鏡 3.8 秒：一個拿東西的動作（手真的碰到東西才動）。
  3. 第 3 鏡 3.0 秒：打招呼／當地語言一句。
  4. 第 4 鏡 7.6–8.2 秒：主要動作＋再唸一次答句；畫面一角有時鐘。另加檢查用鏡頭 `<鏡>C`（近景）、`<鏡>S`（側面）。
- 頭的 twist 是（側傾, 左右轉, 點頭）：左右轉用第二個數，點頭用第三個數、負的是低頭。坐著的人 `GND` 是負值是正常的。

### 3.4 Q 版比例規則（台灣 B4 學到的）

| 事實 | 規則 |
|---|---|
| 手臂只有約 14 mm（約真實比例 60%），頭很大 | 要拿的東西都放在學生**手邊**（桌子靠他那一側、腰邊、胸口）；不伸手到遠處或高處、不把手舉過大頭 |
| 照真實比例擺，手碰不到盤子和嘴 | 道具往學生挪（`TRAY_DY` 10 mm，前後鏡要一起用）、坐凳子前緣（`SEAT_DY` 3 mm）、杯子挪近 |
| 嘴巴在肩膀前方、頭很大 | 食物、杯子**從側面接近水平送到嘴邊**，不要從正前方或從下往上 |
| 嘴巴位置 | `mouth()`＝頭骨前 8.2 mm（原 13.5 mm 會浮在嘴唇前面）；換模型要重量 |
| 桌子太高（桌面到胸口） | 先量（`probe_table`／`probe_desk`），在程式裡縮放：日本課桌椅縮到身高 0.48 倍；台灣折疊桌 `TABLE_TOP = KID * 0.54` |
| 筷子、器具大小 | 依 Q 版手縮：`STICK_L` 12.5 mm |
| 換姿勢 | 學生一直面向鏡頭；坐下、站起來用**切鏡頭**，不做過程（避免椅子穿過身體） |
| 道具 | 只在手碰到時才動，放下才鬆手，動作結束手上不留道具；坐著腳踩地；手不擋臉；人物不懸浮 |

### 3.5 器具拿法：先查、寫下、再擺（11/20 兩次退件）

- 凡是筷子、杯子、文具、樂器、運動器材：**動手前先上網查正確拿法**，寫進分鏡；必要時用 Codex 畫參考圖給老師看。
- 每一種拿法在渲染前寫下這張表，貼在 HANDOFF：

  | 手 | 手心朝向（世界方向） | 拇指在器具的哪一側 | 哪幾指彎、彎多少（握法表） | 器具碰到手的哪裡 |
  |---|---|---|---|---|
  | 例：右手筷子 | 朝她左下方（夾東西）／朝下偏後（送到嘴） | 拇指在上支筷子內側，指腹壓住 | `G_CHOP`：無名指、小指收起托下支 | 下支：虎口→無名指指尖；上支：拇指＋食指＋中指指腹 |

- **筷子**：下支固定（卡在虎口、靠無名指指尖），上支像握筆（拇指＋食指＋中指指腹），只有上支開合、兩支平行、握在約 2/3 處；筷尖下到盤子 → 上支合起 → 抬手讓筷子接近水平送到嘴 → 食物碰到嘴唇才消失 → 咀嚼（頭小幅點動，不用程式畫嘴）→ 筷子擱回盤邊。
- **杯子**：手指真的彎曲包住杯身（`G_CUP`），杯子舉到下巴前，吸管碰到嘴。

#### PALM_SIGN 規則（11/20 老師退件：右手拿筷子、左手拿杯子都左右反了）

- `hand_frame()` 算手心方向：`palm = fwd × acr × PALM_SIGN`；`fwd`＝手腕→中指根，`acr`＝小指根→食指根。`curl()` 依手心方向彎手指、`orient_hand()` 依手心方向轉手，所以 sign 錯了，**手指會往手背彎、整隻手像鏡像**。
- 左右手是鏡像：同一個外積公式，**右手得到手背、左手得到手心**。所以：**`PALM_R = -1`、`PALM_L = +1`**（`taiwan_breakfast.py` 現在的預設值；舊值是猜的，兩手都錯）。
- 推導（Mixamo T-pose，人面向 −y，手心朝下、拇指朝前）：右手 fwd＝−x、acr≈−y → fwd×acr＝+z（朝上＝手背）→ 要乘 −1；左手 fwd＝+x、acr≈−y → −z（朝下＝手心）→ 乘 +1。
- **狀態：11/20 晚正在出圖驗證**；驗證結果出來前，新站照這組值，但仍要做下面的檢查。
- 每個新模型（Tripo 自動綁骨架也是 Mixamo 骨架，理論上一樣）第一次用手部動作時：
  1. 出**兩個角度的特寫**（前斜方近景＋側面），看手指是不是往手心彎、拇指在不在對的一側。
  2. 對照上面那張表與參考圖；寫下「手心朝哪、拇指在哪」的實際觀察。
  3. 過了才 light／final。

### 3.6 檢查鏡頭

- 在場景程式裡做**檢查專用鏡頭**（台灣：`B4C` 近景、`B4S` 右側；`SHOT` 以 `B4` 開頭就是同一段動作換相機）。
- 檢查鏡頭不放會擋在相機和手中間的人（台灣 B4 檢查鏡頭不放主角）。
- **相機太近會切進模型裡（畫面變黑）**：近景用長焦距從遠處拍（台灣 `B4C`／`B4S` 用 115 mm、距離約 0.14 m）。
- 每鏡至少出：準備／接觸／動作中／結束 4 格＋量測數字（`CONTACT`、`DESK`、`GND`）；器具動作再加兩個角度的特寫。
- 正式鏡頭的時鐘要在畫面裡，學生的臉看得到。

### 3.7 Colab 渲染（`tabletop/src/colab_run.py`）

```text
python tabletop/src/colab_run.py <test|light|final> <場景> "<鏡> <格|all>" ...
  例：python tabletop/src/colab_run.py test taiwan_breakfast "B4C 0,24,48" "B4S 24,48"
      python tabletop/src/colab_run.py final taiwan_breakfast "B1 all" "B2 all"
  test＝16 樣本 33%、light＝32 樣本 50%、final＝64 樣本 100%；all＝偶數格
  輸出 tabletop/qa/<月日-時分秒>/tout/<鏡>/f####.png＋<鏡>.log（DESK／CONTACT／CHK／GND／FRAME 行）
  總表：python tabletop/src/sheet4.py <qa 資料夾>（每鏡第一格拼一張 sheet.jpg）
```

- 用自己的工作階段 **`wrt`**；**不要動 `v9`**（科幻雙老師影片 9 的）。
- 會自動：開機（G4，開不起來改 L4）、第一次裝 Blender、上傳 `models/*.glb`＋`engine.py`＋場景程式（md5 一樣就不重傳）、用「短 exec 啟動分離工作＋每 40 秒短 exec 輪詢」（`detached()`）、下載解壓、記 `tabletop/colab_usage.log`、最後一批後**閒置 20 分鐘自動 stop**。
- 已知行為與踩坑：
  - 長的 `colab exec` 會卡死（11/19 兩次各空等 10 分鐘）→ 一定走 `detached()`，不要自己寫長 exec。
  - 短指令偶爾逾時 → `short()` 自動重試 3 次。
  - 上傳失敗會停下（`upload failed ...`）→ **同一行指令重跑**（已傳過的不再傳）。
  - 閒置 20 分鐘後 session 關掉 → 下一次會重開機、重裝 Blender、全部重傳（約多 1–2 分鐘）。
  - 一批全部渲完才下載，而且開工時會清空 Colab 上的 `/content/tout`：**中途斷線這一批全沒了**。所以正式渲一批只放 2 鏡（台灣：B1+B2 約 21 分、B3+B4 約 26–27 分）。
  - G4 回 Service Unavailable → 自動改 L4。L4 1080p 64 樣本約 10–11 秒／格。
  - `colab_usage.log` 的單位是「前後餘額相減」，含其他 session、而且很多批顯示 0.00：只能當大概，報老師時說「約」。
- 用量參考：日本全片約 4.3 單位；台灣 11/20 共約 4.5 單位（含 B4 重做約 2.2）。網站立繪一張約 0.2。

### 3.8 合成（配音、字幕、配樂）

- 配音：複製 `tabletop/src/taiwan_voice.py` → `<國>_voice.py`（edge-tts，`WordBoundary` 取每個字的時間 → `audio/<國>_<key>.mp3`＋`<國>_words.json`）。聲線和網站一樣：問句 `en-US-JennyNeural`、女生 `en-US-AnaNeural`、男生 `en-US-ChristopherNeural` +50Hz，都是 −12%。當地語言一句（台灣「早安！」用 `zh-TW-HsiaoChenNeural`）要換成該國語言的聲音，給老師聽。
- 合成：複製 `tabletop/src/taiwan_compose.py` → `<國>_compose.py`，改 `SHOTS`、`KEY`（標紅的時間字）、Badge 文字（左上角「國名 時間」）、特殊行（`zaoan`、`eat` 拆兩句是台灣專用）。
  ```text
  python tabletop/src/<國>_compose.py tabletop/qa/<批次1> tabletop/qa/<批次2>
  ```
  改一鏡只重渲那一鏡，合成時給新舊兩個 qa 資料夾（後面的蓋過前面的）。
- 字幕規則：
  - Comic Relief 82 px 卡拉 OK（`\kf` 白→金），時間字紅色；不放中文字幕。
  - 預設在下方，MarginV 174（「往上 56 px」規則）；**底邊至少 84 px**。
  - `karaoke(..., top=)`：`top > 0`＝從上緣算（例 B1 `top=240`，放在黑板／牆面，不擋人和時鐘）；`top < 0`＝從下緣算的距離（台灣 B4 v2 `top=-96`）。每鏡出圖後看字幕有沒有蓋到臉、手、時鐘、食物。
  - **前一句一定要在下一句開始前結束**（留 0.2 秒），重疊 0.05 秒下一句就會被推高一行。
- 音量：人聲 loudnorm −16 LUFS；配樂（`tabletop/audio/music_holiday.wav`，感恩節開場片 holiday s7 純音樂）約 −34 LUFS、淡入 0.6 秒、淡出 1.2 秒（老師：配樂要很小聲）。loudnorm 的 TP 不能低於 −9。
- ffmpeg：在本機暫存資料夾分三步（混音 → 燒字幕 → 720p），最後才複製到 G 槽；一次做完曾卡 8 分鐘。字型複製到工作資料夾用相對路徑 `fontsdir=fonts`（Git Bash 會改壞絕對路徑）。
- 影格數不夠會停下（`<鏡>: n frames, need m`）：秒數 × 12。

### 3.9 抽格檢查 → 給老師

- 每鏡抽格拼總表（例：`tabletop/out/taiwan_breakfast_frames.jpg`），**看大圖**，不只看縮圖。逐項看：
  - 器具拿法和 3.5 的表一致（手心、拇指、手指彎向）；
  - 道具碰到才動、食物碰到嘴唇才消失、沒有浮在空中；
  - 腳踩地／坐著腳垂下；手不擋臉；字幕沒蓋到重點；時鐘時間正確。
- 交給老師：1080p MP4＋抽格總表＋這次花費。老師定案後才 `web/video/<id>.mp4` 上網站。

---

## 4. 遊戲：四款各自怎麼加一國

### 4.1 四款共用

- 長度與星星：主檔 `games/rules.json`（60 秒、每 10 秒時鐘回合、4 回合；2 星 550 分＋對 2 個、3 星 1250 分＋對 3 個），改完 `python games/sync_rules.py` 複製到各遊戲 `data/rules.json`，再重新匯出。
- 時鐘回合：第 1 題＝本站時間（`clock_rounds[0]`，`target_time`），其餘從 `review_times`（前面走過的站，依旅程順序）抽；誘答自動產生（同一小時差 30 分、下一小時同分鐘）。
- 語音：`python tools/make_audio.py --voice-only`（edge-tts `en-US-AnaNeural` −12%，只補缺的 `audio/times/HHMM.mp3`；`--all` 全部重做）。
- 美術：Codex CLI 生圖，在 C 槽空資料夾生成再複製回 `art_source/<國>/`，提示詞存 `*_prompt.txt`。物品圖 2 列 × 5（前 6 好、後 4 壞），不能有字、人臉、黏在一起。生完每張都看（肯亞的 mandazi 像 samosa、校車駕駛是小孩，都重生過）。
- 遊戲畫面只有英文，字型 Comic Relief（沒有中文字）。
- **在 C 槽副本做**：G 槽跑 Godot 很慢。複製到 `%TEMP%\wrt_godot\<遊戲>`（不含 `.godot/`、`*.import`、`web/`、`qa/`、`art_source/`），在那裡匯入兩次、測試、匯出，再把 `web/*` 複製回來。
  ```powershell
  $godot = "C:\Users\User\Godot\Godot_v4.7.2-stable_win64_console.exe"
  & $godot --headless --path . --import          # 跑兩次（第一次字型可能還沒匯入完）
  & $godot --headless --path . --script res://scripts/qa_smoke.gd -- country=<id>        # 好機器人
  & $godot --headless --path . --script res://scripts/qa_smoke.gd -- country=<id> bad    # 壞機器人
  & $godot --headless --path . --export-release Web web/index.html
  ```
- 測試標準：好機器人 5 次都 `QA_SMOKE_OK`、3 星、4/4 時鐘、第 1 回合＝本站時間；壞機器人愛心掉光、0 時鐘；瀏覽器實跑（真的滑鼠／觸控，故意答錯一回合）→ Finish → 結算，console 0 錯誤、iframe 收到 `game-ready`／`game-done`（country 正確）。
- `qa_web.py` 和 Godot 無頭測試**不要同時跑**（電腦忙會逾時）；伺服器用 port 0（系統挑空埠）。無頭瀏覽器比真實時間慢，量時間要用真的瀏覽器。
- postMessage：`{channel:'world-routines', type:'game-ready'|'game-done', game, country, score, stars, clocksCorrect}`，只送給同網域。網站用它蓋章。
- 還沒做的共同驗證：真 iPad、聲音人耳聽、學生試玩。

### 4.2 各款差異

| 遊戲 | 站 | 要放的圖（`art_source/<國>/`） | `tools/cut_art.py` 要加 | 設定檔（複製哪個） | 特別欄位／注意 | 瀏覽器測試 |
|---|---|---|---|---|---|---|
| 接便當 `bento-catch` | 日本、埃及、印度 | `bg.png`、`items.png`、`player.png`（一列 4 姿勢 idle／run／happy／sad，都拿托盤） | `ITEMS`；托盤不是淺綠就加 `CATCHER`（HSV 色相判斷） | `data/japan.json` | `floor_y`、`player.meta`（cut_art 產生）、`catch_half_width`、`howto_good` | `python tools/qa_web.py <國> [輸出] [專案根目錄]` |
| 校車衝刺 `bus-dash` | 台灣、美國、肯亞 | `bg.png`、`items.png`、`bus.png`（主角沿用 `art/taiwan/`，不用重畫） | `ITEMS`、`SCENERY_ROWS`；白底被包住的洞加 `HOLES` | `data/taiwan.json` | `scenery`、`bus`、`player.poses` 指到 `art/taiwan/`、`fx`、網址 `&hero=` | `python tools/qa_web.py <web> <輸出> <girl|boy> <國>` |
| 時鐘忍者 `clock-ninja` | 英國、西班牙 | `bg.png`（中間空、沒有時鐘）、`items.png`、`bag.png` 或 `plate.png` | `ITEMS`、`HOLDER` | `data/uk.json` | `holder.width／bottom／mouth／pile`、`howto_bad` | `python tools/qa_web.py web <輸出> <girl|boy> <國>` |
| 行李轉盤 `luggage-belt` | 新加坡、澳洲 | `bg.png`（上 10% 天花板、10–46% 窗戶、46–64% 空白牆腳、下面地板）、`items.png` | `ITEMS` | `data/singapore.json` | 主角站姿 `art/hero/<who>_stand.png`；行李箱與推車是共用素材 | `python tools/qa_web.py <web> <輸出> <girl|boy> <國>` |

---

## 5. 網站

### 5.1 放進網站

1. 確認要上的東西都已定案（影片老師說「定案」、遊戲測過）。**`web/video/taiwan.mp4` 現在是被退件的 v2，修好定案前不能部署。**
2. 新的當地學生立繪：`portraits.py` 的 `CHARS` 加一行 → `python tabletop/src/colab_run.py final portraits "char_<id> 0"` → 裁透明邊縮圖存 `web/art3d/char_<id>.png`（裁圖用哪支程式沒有記錄，做的人請補進 HANDOFF）→ 網站 `app/routines/content.ts` 的 `CHAR_3D` 加上 id。
3. `python publish_to_site.py`：把解謎卡頁、`web/art`、`web/audio`、`web/video`、`web/music`、`web/art3d`、字型、每款遊戲的 `games/<遊戲>/web` 複製到網站 `public/world-routines/`。
4. **刪掉 `public/world-routines/games/bento-catch/.gdignore`**（publish 會把遊戲 `web/` 裡的 `.gdignore` 一起帶過去）。
5. 網站自己會判斷：`video/<id>.mp4` 讀不到就顯示「動畫還在製作中」；`games/<遊戲>/index.js` 不存在就顯示「遊戲還在製作中」（以前會把首頁塞進遊戲框）。

### 5.2 本機預覽與走查

- G 槽的 node_modules 不完整：在 C 槽建置副本做（scratchpad 的 `site-build`，用 `sync_site.sh` 同步 app／functions／public／scripts／設定檔，不含金鑰；資料夾消失就重建後 `npm ci`）。建置要用到根目錄 `.env.local`、函式要 `functions/.env.talktofriends-6b58d`：**只複製、不讀內容**。
- 預覽：`npx vite --config vite.firebase.config.ts --mode preview`（port 3001），假資料在 `scripts/local-preview.ts`（口說固定 90 分）。
- 走查：`python web/qa_walk.py <輸出資料夾>`（`/world-routines?open=all`，選男生 → 台灣拖放 → 日本口說 → 蓋章 → 直式寬度）；老師後台 `python web/qa_teacher.py <資料夾>`。**這兩支只走台灣和日本**：新站要加進腳本或手動走一遍（聽問句 → 解謎 → 作答 → 時鐘與句子 → 影片 → 遊戲 → 蓋章）。
- 跳動的按鈕 Playwright 判定 not stable → `click(..., force=True)`。
- 也要跑：typecheck、lint、函式測試（41 項）。

### 5.3 部署前比對（每次部署前都要做）

1. 線上檔案清單：`python live_list.py <access token> <輸出資料夾>`（token 用 `gcloud auth print-access-token` 當場取得，**不印出、不存檔**）→ `files.json`、`releases.json`（看最後發布時間和檔數）。
2. 比對：`python cmp_live2.py`（讀 `live-host2/files.json`，和網站 `public/` 雙向比對：Hosting 的 hash＝gzip level 7 或 8、header 第 9 byte＝2、第 10 byte＝10 的 sha256；算不出來的就下載逐位元組比）。結果分 same-hash／same-bytes／LIVE-ONLY／LOCAL-ONLY／DIFFERENT。
   - 這兩支在 scratchpad（`C:\Users\User\AppData\Local\Temp\claude\...\scratchpad\`），重開機可能消失；消失就照上面說明重寫。
3. 程式檔（`index.html`、`/assets/`）另外比：拿掉這次改動重建（scratchpad `make_base.py` 的做法），JS／CSS 檔名和線上相同＝線上是本機舊版。重建時 `app/data/pending-audio.json` 要用原本的（`[]`），否則 JS 檔名會不同。
4. 雲端函式：`gcloud functions describe monsterPortal --region asia-east1` 找原始碼 zip，下載後 `diff --strip-trailing-cr` 逐檔比。
5. 向老師報：線上最後發布時間、有沒有別人改過、這次要上的檔案與函式。**老師當次同意才部署。**

### 5.4 部署

- 在 C 槽建置副本 build 後部署，加 `--account <老師的部署帳號，見專案 CLAUDE.md>`。
- **網站和雲端函式分兩個指令**：一起跑時最後會報「asia-east1 沒有映像清理政策」錯誤，hosting 發布被中斷（11/19）。
  ```text
  firebase deploy --only "functions:routinesGameDone,functions:monsterPortal" --account <帳號>   # 只列這次改到的函式
  firebase deploy --only hosting --account <帳號>
  ```
  （Artifact Registry 清理政策 `firebase functions:artifacts:setpolicy` 要老師同意才設。）
- **不能用預覽頻道**：reCAPTCHA Enterprise 金鑰只允許正式網域，`portal.mjs` 也要求 Origin＝正式網域。
- **首頁入口仍藏著**：`app/ClassActivities.tsx` 的 `SHOW_ROUTINES_TILE = false`。老師實測（AI 口說、後台真資料、iPad、配樂）通過後才改 true、重 build、只部署 hosting。
- 部署後驗證：Playwright 無頭瀏覽器會被 reCAPTCHA 擋（401），`web/qa_live.py` 只能驗首頁；用內建瀏覽器、測試學號 60199 走一站，確認影片、遊戲 wasm、art3d 回 200。
- 11/20 晚已部署：網站（學生頁、後台分鐘數、四款遊戲、台灣 v3 影片）＋函式 `routinesGameDone`、`monsterPortal`。英國影片 v2 11/20 深夜已部署。下次待部署：第 5～10 站影片（定案後）。

---

## 6. 老師的固定規則與退件紀錄

| 日期 | 規則／退件 |
|---|---|
| 11/03 | 程式動畫動作要合邏輯：工具對著目標、擁抱手不擋臉、坐姿不能被座墊蓋掉 |
| 11/07 | Blender 只在 Colab 跑，本機不開；閒置自動關 |
| 11/09 | 交通工具車頭朝前進方向；上車從車門旁淡入淡出 |
| 11/10 | 握拳手不能接受（3D 人物先查雙手張開）；所有影片英文字用 Comic Relief；道具由接觸事件驅動、接觸要量；動作結束不留道具；發布前 4 格檢查圖 |
| 11/14 | 樂器、文具、運動器材先查正確拿法；3D 鏡頭一律先出多角度特寫檢查圖，通過才正式渲；Colab 每天可超過 30 單位（仍要報） |
| 11/15 | 所有影片下方字幕往上 56 px（1080p 底邊 ≥ 84 px） |
| 11/19 | 日本午餐動畫定案；配樂要很小聲；部署前先比對線上版本；每站一定先聽完問句才能開謎題；台灣制服照校慶圖（黃上衣、綠袖子與領口、紅藍「2」校徽、綠短褲黃條紋），不背書包 |
| 11/19 | **退件**：校車衝刺主角衝刺時沒有跑步動作（兩張圖幾乎一樣）→ 重畫 6 格跑步循環＋揚塵，11/20 通過 |
| 11/19 | 先不部署；遊戲長度 1 分 40 秒內、10 站要能在 2 節課走完 |
| 11/20 | 美國當地學生用女生（和網站女聲一致） |
| 11/20 | **退件**：台灣 B4 吃蛋餅「十分不合邏輯」（手掌張開、筷子從下往上戳到鼻子、蛋餅浮在嘴前）→ RDQ 重做，筷子查正確拿法 |
| 11/20 | **退件**：台灣全片 v2 右手拿筷子、左手拿杯子左右反了 → `PALM_SIGN` 改為右 −1、左 +1，驗證中（3.5 節） |
| 11/20 | 等台灣動畫定案後，網站＋函式一起部署 |

---

## 7. 常見錯誤速查表

| 症狀 | 原因 | 解法 |
|---|---|---|
| 手指往手背彎、左右手拿法像鏡像 | `PALM_SIGN` 猜錯 | 右 −1、左 +1；兩角度特寫確認手心與拇指 |
| 手碰不到盤子或嘴，`DESK REACH` need > arm | Q 版手臂只有約 14 mm | 道具挪到手邊、坐凳前緣、從側面送到嘴 |
| 食物浮在嘴前 | 嘴的位置估太前 | `mouth()` 用頭骨前 8.2 mm；碰到嘴唇才消失 |
| 筷子戳到鼻子、擋眼睛 | 從正前方、由下往上送 | 筷子接近水平、從學生右側送到嘴邊 |
| 托盤上有兩雙筷子 | Tripo 模型自帶 | `drop_tray_sticks()` 用 bmesh 刪，看圖確認托盤沒破洞 |
| 近景畫面變黑或切掉 | 相機切進頭裡 | 長焦距（約 115 mm）從遠處拍 |
| 桌面到學生胸口 | 家具照模型原尺寸 | 先 probe 量，再在程式裡縮 |
| 學生吃飯還背書包 | 書包做在模型身上 | 參考圖就不要書包 |
| 舉手時擋到臉 | 舉了靠鏡頭那隻手 | 改舉遠側的手；指時鐘用靠時鐘那一側的手 |
| 頭轉錯方向 | twist 順序搞錯 | （側傾, 左右轉, 點頭），點頭負的是低頭 |
| 改了環境變數沒效果 | `colab_run.py` 不轉傳本機環境變數 | 直接改程式裡的預設值 |
| `colab exec` 卡住不動 | 長 exec 會卡死 | 只用 `colab_run.py` 的 `detached()` |
| 一批渲到一半斷線全沒了 | 整批渲完才下載、開工清空 tout | 一批只放 2 鏡；重跑同一行 |
| `upload failed` | 上傳中斷 | 同一行指令重跑（已傳的跳過） |
| G4 開不起來 | Service Unavailable | 自動改 L4 |
| 正式渲前 session 已關 | 閒置 20 分自動 stop | 正常；重跑會重開機重裝 |
| ffmpeg 合成卡很久 | 一次做混音＋燒字幕＋寫 G 槽 | 本機暫存分三步，最後才複製 |
| 字幕字型不對 | fontsdir 絕對路徑被 Git Bash 改壞 | 字型複製到工作資料夾，`fontsdir=fonts` |
| 第二句字幕跑到上一行 | 兩句時間重疊 | 前一句在下一句開始前 0.2 秒結束 |
| loudnorm 報錯 | TP 低於 −9 | TP 設 −9 以上 |
| 字幕蓋住臉、時鐘或食物 | 這一鏡人物或時鐘位置特殊 | `top=` 正數放上方、負數調底邊距離（≥ 84 px） |
| grab_glb 抓到舊模型 | Chrome 事後把舊 `.tmp` 改名 | 看大小／面數；先 `--mark` |
| Tripo 卡在 Generating | Tripo 端問題 | 問老師；約 1 小時後自動取消退點，帳本記退點 |
| Codex 生圖存不進 G 槽 | `-s workspace-write` 權限 | 存暫存資料夾再複製 |
| Godot 匯入、測試很慢 | 在 G 槽跑 | 複製到 `%TEMP%\wrt_godot\<遊戲>` |
| 托盤接物高度偏低 | 托盤顏色判斷只抓到細線 | `cut_art.py` 的 `CATCHER` 用 HSV |
| 切圖兩個東西黏在一起 | 圖示間距太小 | 在預期位置附近找最少墨水的欄切 |
| 輪胎、行李架中間是白的 | 白底被圖包住 | `HOLES`＋`clear_holes()` |
| 好機器人偶爾撞光愛心 | 機器人一次跨兩道 | 已修（中間車道有壞東西先等）；不是遊戲壞 |
| 瀏覽器測試按 Finish 後逾時 | 和 Godot 無頭測試同時跑 | 分開跑 |
| 開到別的遊戲 | 測試伺服器固定埠號撞到 | `qa_web.py` 用 port 0 |
| Playwright 點不到跳動的按鈕 | 判定 not stable | `force=True` |
| 遊戲框裡出現網站首頁 | 遊戲檔案不存在、站台回首頁 | 學生頁已改查 `index.js`；確認 publish 有帶到遊戲 |
| 部署後 hosting 沒更新 | 函式和 hosting 一起部署被清理政策錯誤中斷 | 分兩個指令 |
| 預覽網址上函式被擋 | reCAPTCHA 網域、portal Origin 檢查 | 不用預覽頻道；藏入口部署正式站 |
| 正式站無頭測試 401 | reCAPTCHA 擋無頭瀏覽器 | 用內建瀏覽器手動測 |
| 重建後 JS 檔名和線上不同 | `pending-audio.json` 被 prepare-data 改掉 | 用原本的 `[]` |
| 老師後台本機回 Invalid station | 假函式攔走老師的 `routines` 查詢 | 只攔四個學生用名稱 |
| public 裡多了 `.gdignore` | publish 連遊戲 web 的 `.gdignore` 一起複製 | 部署前刪掉 |

---

## 8. 各份資料互相矛盾或過時的地方（以較新的為準）

| 主題 | 舊說法（出處） | 新說法（出處，較新） |
|---|---|---|
| 情境動畫長度 | 每支約 30–45 秒（`../rdq/RDQ-spec-hwg7-u04-world-routines-v2-20261119.md`） | 約 20 秒、4 鏡（日本、台灣成品與各國分鏡） |
| 美國當地學生 | 建議男生 usa_boy（`tabletop/usa_school_storyboard.md`） | 老師 11/20 選女生，已建 `usa_girl.glb`（HANDOFF、帳本） |
| 英國站 | 分鏡「草稿、模型還沒做」（`tabletop/uk_storyboard.md`） | 帳本已記 uk_boy、uk_desk、uk_teaset 共 185 點，模型在 `tabletop/models/`；HANDOFF 還沒寫這段 |
| 台灣 B4 長度 | 7.6 秒（`taiwan_breakfast_storyboard.md`） | 8.2 秒、兩句（程式 `DUR`、HANDOFF） |
| 台灣 B4 字幕位置 | 頭頂上方牆面（HANDOFF 11/20 中午、B4 拿筷子 RDQ） | 下方距底 96 px，`top=-96`（HANDOFF 11/20 傍晚、`taiwan_compose.py`） |
| 接便當長度與星星 | 75 秒、5 回合、700／1600 分（`games/bento-catch/HANDOFF.md` 前半） | 60 秒、4 回合、550／1250 分（同檔最後段、`games/rules.json`） |
| 接便當 `tools/qa_web.py` | 還是舊的 5 回合寫法（11/19 段） | 11/20 埃及／印度段已改成 4 回合＋Finish |
| Colab 每天上限 | 超過 30 單位先問（`colab_run.py` 仍會印 WARNING） | 11/14 起可以超過，仍要報（記憶 no-parallel-blender-local） |
| Colab 輪詢與下載 | 每 50 秒輪詢、每鏡完成就下載（記憶 colab-cli-long-exec-pitfalls） | `colab_run.py` 實際是每 40 秒、整批完成才下載 → 一批只放 2 鏡 |
| persistent data | 引擎 `setup_render` 要開 `use_persistent_data`（記憶 colab-tabletop-render-efficiency） | 這個專案用的感恩節 `engine.py` 沒有設；目前模型小、10–11 秒／格，影響未驗證 |
| PALM_SIGN | 舊值是猜的 | 右 −1、左 +1（`taiwan_breakfast.py` 現值），11/20 晚驗證中 |
| 西班牙 | 五站總表沒有西班牙 | 西班牙沒有參考圖、分鏡、模型（只有遊戲換皮） |
