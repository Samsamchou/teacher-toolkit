# Luggage Belt／行李轉盤 交接（2026-11-20）

世界作息之旅新加坡站（第 9 站，9:45 go to bed）與澳洲站（第 10 站，7:15 take a shower）共用的 Godot 4 小遊戲。
飛機落地，學生站在機場行李轉盤前：轉盤由左往右慢慢轉，**用手指把這一站作息要用的東西往下拖、在轉盤下方任何地方放開＝收進右下角打開的行李箱**；
每 10 秒一次時鐘回合：轉盤停下、東西變淡，聽英文時間，紅／藍／黃三個貼著指針時鐘的大行李箱滾出來，把對的那一個拖上推車。
老師 11/20 看過設計稿與示意圖（`../luggage-belt-design/`）說「可以照示意圖做」。

狀態：**本機做完並測過，沒有部署、沒有 commit、沒有複製到網站資料夾。真正的 iPad 還沒測，也還沒有學生試玩過。**

## 怎麼開

- Godot 專案就是這個資料夾（`project.godot`，Godot 4.7.2，Compatibility）。G 槽匯入很慢：
  把專案（不含 `.godot/`、`*.import`、`art_source/`、`qa/`、`web/`、`tools/`）複製到 `%TEMP%\wrt_godot\luggage-belt` 再開／測／匯出，最後把 `web/*` 複製回來。
- 網頁版在 `web/`，要用 HTTP：`python -m http.server 8765 --directory web`，
  開 `http://127.0.0.1:8765/index.html?country=singapore&hero=girl`（`country=australia`；`hero=boy`）。沒給 country 就是新加坡。
- 操作：按住東西往下拖，在轉盤下方任何地方放開就收進行李箱（不用拖到箱子上）。在轉盤上放開＝放回轉盤。
  抓取範圍比圖片大 34 px，手指按在東西旁邊也抓得到。時鐘回合點橫幅左邊的藍色喇叭（或空白鍵／R）重聽。

## 和其他三款共用、完全一樣的部分

- 從 `../bus-dash` 複製：`web_bridge.gd`（GAME 改成 `luggage-belt`）、`clock_draw.gd`（只多一個可選參數 `bells=false`，不畫鬧鐘的鈴和腳，
  讓鐘面印在行李箱上；預設值不變）、字型 Comic Relief、音效、配樂、匯出設定、`make_audio.py`。
- `scripts/main.gd` 的 HUD（左上分數＋連擊、右上愛心＋倒數條＋4 個時鐘燈號）、Fever、連擊倍率、星星、Finish 按鈕、
  `_build_rounds()`（第 1 題＝本站時間，其餘從 `review_times` 抽）、結算畫面、`?hero=`、`?country=`、`-- country=`、
  postMessage 格式都和校車衝刺相同，只換了玩法。
- 長度與星星讀 `data/rules.json`（主檔 `../rules.json`，改完跑 `python ../sync_rules.py` 再匯出）：玩 60 秒、每 10 秒時鐘回合、共 4 回合、
  3 顆愛心；2 星＝550 分＋對 2 個，3 星＝1250 分＋對 3 個；愛心掉光最多 2 星。
- postMessage：`{channel:'world-routines', type:'game-ready'|'game-done', game:'luggage-belt', country, score, stars, clocksCorrect}`。
- QA 狀態物件一樣叫 `window.__bento`；加 `?qa=1` 會多給 `items`（轉盤上可抓的東西 [x, y, 是否壞東西]）、`pack`（行李箱開口）、
  `dropY`（放開線）、`speed`，時鐘回合多給 `cases`、`okCase`、`trolley`、`answerable`。

## 玩法與數字（`scripts/main.gd` 最上面的常數）

- 轉盤速度 84 → 120 px/秒（720 高的畫面），東西間距 250–310 px，畫面上約 4–5 件，每件最長邊 128 px。開局轉盤上就先放 3 件。
- 壞東西比例 26% → 34%，不會連續 3 個壞的；Fever 時只有 15% 且間距縮短一點。
- 好東西 30 分 × 連擊倍率（每 6 連擊 ×2、×3）× Fever ×2。好東西轉出右邊：不扣愛心，只中斷連擊。壞東西放進箱子：扣 1 顆愛心，箱子把它吐出來。
- 時鐘回合：轉盤停、東西變淡（不能抓）→ 三個行李箱從左邊滾進來（1.2 秒）→ 0.75 秒時念「It's nine forty-five.」→ 8 秒作答（橫幅下方藍色倒數條，沒有數字）。
  把行李箱拖到轉盤下方放開就放上推車（推車上有黃色虛線框）。答對 +100、主角開心跳、6 秒 Fever；答錯扣 1 顆愛心；
  **8 秒沒選＝算沒答對（燈號變紅），但不扣愛心**（老師決定）。作答後才顯示「It's nine forty-five.」和 9:45 數字。
  第 1 回合有黃色虛線箭頭教「拖到推車」；開局到第一次收進東西前也有箭頭教「往下拖進箱子」。
- 主角站左下推車旁，不移動，只做反應：平常是站姿（雙腳著地、伸手握住推車把手的柱子，輕輕呼吸），
  答對／每 6 連擊時換 happy 圖跳一跳，拿錯／答錯／逾時換 sad 圖。

## 設定檔（`data/singapore.json`、`data/australia.json`）

| 欄位 | 說明 |
|---|---|
| `title`、`subtitle` | 標題畫面（Luggage Belt／Pack for bedtime in Singapore!） |
| `howto_good`、`howto_bad` | 標題畫面前兩張說明卡的標題（Pack these!／Leave these!） |
| `target_time` | 本站時間（標題畫面行李箱上的鐘、第 1 回合必考），新加坡 9:45、澳洲 7:15 |
| `background` | 機場行李大廳背景（16:9，轉盤、推車、行李箱都是程式疊上去的） |
| `player.poses` | `res://art/hero/girl_`、`boy_`（會讀 `stand`、`happy`、`sad` 三張），`player.meta` 對齊頭部用 |
| `good_items[]`／`bad_items[]` | 6 好 4 壞，`points` 每件分數 |
| `review_times` | 前面各站時間。新加坡：6:45、12:15、7:35、4:30、9:15、6:35、5:40、2:40（台灣、日本、美國、英國、西班牙、埃及、肯亞、印度）；澳洲再加 9:45 |
| `clock_rounds[]` | 第一個是本站時間＋兩個誘答（新加坡 9:15／10:45，澳洲 7:45／8:15）；後面兩個只在複習時間不夠時才會用到 |
| `end_titles` | 1／2／3 星的結尾標題（3 星：Sweet dreams!／Squeaky clean!） |

畫面配置寫在 `_layout()`：轉盤在畫面 50%–66.5% 高、出口在左邊；推車在左下、打開的行李箱在右下（80% 寬）；
時鐘行李箱停在 30%／55%／80% 寬。共用素材的位置（行李箱上的白色圓、推車平台、行李箱開口、轉盤表面）由 `tools/cut_art.py` 量好寫在 `art/shared/meta.json`。

## 美術（全部 Codex CLI 生圖，8 張，每張一次就過、沒有重生）

- `art_source/singapore/`：`bg.png`（樟宜機場夜晚：星空、月亮、熱帶花園、室內圓形瀑布）、`items.png`
  （睡衣、泰迪熊、牙刷、故事書、枕頭、月亮小夜燈｜榴槤、滴水的雨傘、口香糖、汽笛喇叭）。
- `art_source/australia/`：`bg.png`（雪梨機場黃昏：歌劇院、港灣大橋、尤加利樹）、`items.png`
  （毛巾、肥皂、洗髮精、黃色小鴨、浴帽、沐浴球｜泥巴足球、泥巴球鞋、仙人掌、卡通蜘蛛）。
- `art_source/shared/`：`bags.png`（紅藍黃三個正面行李箱，正面有空白圓；打開的粉紅行李箱；推車；轉盤出口）、`belt.png`（一段直的轉盤）。
  原本規劃一張共用圖，我拆成兩張：轉盤要很寬又要能重複，單獨一張比較好切。
- 每張旁邊有 `*_prompt.txt`。切圖：`python tools/cut_art.py singapore|australia|shared`（共用 `../bento-catch/tools/cut_art.py` 的切圖函式）。
  轉盤：切 10 片橡膠板寬的一段當可重複的圖，下面的不鏽鋼裙邊改成平均的漸層（原圖的反光條紋接不起來）；裙邊上的白色箭頭是程式畫的。
- 主角：`art/hero/` 的 happy、sad 和 `player_meta.json` 是從 `../bus-dash/art/taiwan/` 複製的（沒重畫）。
  校車衝刺沒有「站著」的圖（happy 是雙腳離地的跳躍），站在推車旁會像浮在空中，所以**另外生了站姿** `art_source/hero/girl_stand.png`、`boy_stand.png`
  （`codex exec -i` 附上校車衝刺的 happy、run_2 當參考），`python tools/cut_art.py hero` 切成 `art/hero/<who>_stand.png` 並把頭部位置寫進 `player_meta.json`。
- 行李箱上的時鐘：鐘面位置由 `cut_art.py` 量白色圓（白圓被箱子兩側切掉一點，所以量中間那一行的上下長度當直徑）；
  把手中間的洞挖成透明。
- `qa/art_sheet.jpg`：所有切好的圖。

## 加新的一站

1. `art_source/<國>/` 放 `bg.png`、`items.png`（提示詞抄 `art_source/singapore/*_prompt.txt`；背景要照「上 10% 天花板、10–46% 窗戶、46–64% 空白牆腳、下面空地板」的比例，轉盤才會落在牆腳上）。
2. `tools/cut_art.py` 的 `ITEMS` 加上 10 個檔名，跑 `python tools/cut_art.py <國>`。
3. 複製 `data/singapore.json` 改內容，`review_times` 填前面各站時間，跑 `python tools/make_audio.py --voice-only`（edge-tts，免費；只補缺的音檔）。
4. 複製到 C 槽、`--import` 兩次、跑測試、匯出。

## 匯出

```powershell
$godot = "C:\Users\User\Godot\Godot_v4.7.2-stable_win64_console.exe"
& $godot --headless --path $env:TEMP\wrt_godot\luggage-belt --import     # 跑兩次
& $godot --headless --path $env:TEMP\wrt_godot\luggage-belt --export-release Web web/index.html
```

`web/`：`index.wasm` 39.5 MB（Godot 官方樣板）、`index.pck` 約 6.0 MB。

## 測試

- `scripts/qa_smoke.gd`（無頭機器人，真的呼叫按下／拖曳／放開的函式）：
  `--script res://scripts/qa_smoke.gd -- country=australia [bad|idle|child]`
  - 好機器人（每 0.8 秒拖一件好東西、放開點隨機在轉盤下方任何地方、拖對的行李箱）：要 4／4 時鐘、看到 Fever、第 1 回合＝`target_time`。
  - 壞機器人（只拖壞東西、拖錯行李箱）：要愛心掉光。
  - idle（什麼都不碰）：4 回合都逾時、0 個對、愛心還是 3 顆（驗證「逾時不扣愛心」）。
  - child（細心但慢的學生：每 1.5 秒才拖一件、20% 的機會放掉、第 3 回合答錯）：只看分數，用來調難度。
- 結果（11/20，最後一版）：好機器人兩國各 5 次全過、10 次都是 3 星（新加坡 2020–2320 分、澳洲 1570–2380 分，4／4 時鐘、都看到 Fever、第 1 回合都是本站時間）；
  壞機器人兩國都愛心掉光（新加坡第 20 秒、澳洲第 10 秒結束）；idle 兩國都 0／4、愛心 3 顆；
  child 機器人：新加坡 1350、澳洲 1500（先前另跑 6 次是 1080–1380），也就是細心但慢的學生大約剛好在 3 星的 1250 分上下。
  ```
  QA_SMOKE_OK country=singapore mode=good score=2020 stars=3 clocks=4 hearts=3 best_combo=18 packed=18 play_t=60.0 rounds=["9:45", "7:35", "6:35", "9:15"]
  QA_SMOKE_OK country=singapore mode=bad score=0 stars=1 clocks=0 hearts=0 best_combo=0 packed=1 play_t=20.0
  QA_SMOKE_OK country=singapore mode=idle score=0 stars=1 clocks=0 hearts=3 play_t=60.0
  QA_SMOKE_OK country=australia mode=good score=1960 stars=3 clocks=4 hearts=3 best_combo=17 packed=17 play_t=60.0 rounds=["7:15", "9:45", "2:40", "5:40"]
  QA_SMOKE_OK country=australia mode=bad score=0 stars=1 clocks=0 hearts=0 best_combo=0 packed=2 play_t=10.0
  QA_SMOKE_OK country=australia mode=idle score=0 stars=1 clocks=0 hearts=3 play_t=60.0
  ```
- `tools/qa_web.py <web> <輸出> [girl|boy] [國家]`：Playwright 開真的瀏覽器、用滑鼠真的拖：標題 → 開始 → 拖東西（一半放在箱子上、一半放在空地板）
  → 4 個時鐘回合把行李箱拖上推車（第 2 回合故意拖錯）→ Finish → 結算，最後拼一張 `overview.jpg`。
  **伺服器用作業系統給的空閒連接埠**（原本抄來的固定 8793 和 clock-ninja 撞到，曾經開到別的遊戲）。
  不要和 Godot 無頭測試同時跑（電腦忙會逾時）。
- 瀏覽器實跑（11/20，最後一版匯出）：
  `singapore girl rounds 4 playT 41.6 score 750 stars 2 clocks 3 hearts 2 drags 11 errors []`、
  `australia boy rounds 4 playT 41.9 score 870 stars 2 clocks 3 hearts 2 drags 14 errors []`
  （第 2 回合故意拖錯所以 3／4、少 1 顆愛心；無頭瀏覽器很慢，測試腳本 0.9 秒才拖一次，所以分數低，不代表難度）。
- 截圖：`qa/singapore/`、`qa/australia/`（各有 `overview.jpg`），`qa/art_sheet.jpg`。

## 沒測到、已知限制

- **真正的 iPad Safari 沒測**：手指拖曳手感、載入時間、聲音解鎖、效能都要實機確認。
- **聲音沒有人耳聽過**（新的語音 0240、0400、0430、0540、0630、0635、0915、0945、1000 是 edge-tts 產生的）。
- 多指：只認第一根手指（和其他三款一樣）。
- 站姿是新生的圖，happy／sad 是校車衝刺的舊圖；三張畫風一致，但站姿的臉朝右、happy 朝前，切換時會轉身（我覺得自然，請老師看）。
- 難度是我估的，沒有學生試玩資料。
- 無頭測試結束時 Godot 會印「resources still in use at exit」，是測試直接 quit 造成的，遊戲本身沒有錯誤。

## 2026-11-20 晚：澳洲卡通蜘蛛換成沾泥巴的夾腳拖（OPEN_QUESTIONS L4，老師「照建議」）—本機做完，未部署、未 commit、未複製到網站資料夾

- 重生 `art_source/australia/items.png`（Codex CLI，C 槽空資料夾，`codex exec --skip-git-repo-check -s workspace-write -i ref_items_v1.png - < prompt.txt`，免費、一次就過）：
  用舊圖當參考、提示詞只把第 10 個換成「沾滿泥巴、會滴泥的亮橘色夾腳拖（從上方斜看、Y 字帶看得清楚）」。前 9 個和舊圖幾乎一樣（逐像素平均差約 1%）。
  舊圖保留為 `items_v1.png`、舊提示詞 `items_prompt_v1.txt`；新提示詞 `items_prompt.txt`。
- 選橘色是為了和藍色泥巴球鞋分得開。
- `tools/cut_art.py`：澳洲第 10 格名稱 `spider` → `muddy_flipflop`；重切 `art/australia/`（10 個物品都重切，刪掉 `spider.png`）。`data/australia.json` 壞東西改成 `{"id": "muddy_flipflop", "art": "res://art/australia/muddy_flipflop.png"}`。
  切圖總表 `qa/australia/art_sheet_v2.jpg`（都看過：去背乾淨、沒有白邊、夾腳拖旁的小泥塊有保留）。
- `tools/qa_web.py` 修一個測試腳本的時間差：Finish 剛出現的那一格，`window.__bento.finish` 還是 [0, 0]（按鈕位置是畫的時候才設定），腳本拿舊值去點左上角，所以 8 秒等不到結算
  （這次連舊匯出也會遇到，看運氣）。改成點之前重讀位置。遊戲本身沒問題：學生看得到按鈕時位置已經設好。
- 無頭測試（`%TEMP%\wrt_godot\luggage-belt-fix`）：澳洲、新加坡好機器人各 5/5 `QA_SMOKE_OK`（3 星、4/4）；壞機器人各 1 次愛心掉光。
- 瀏覽器實跑：`australia girl rounds 4 playT 42 score 780 stars 2 clocks 3 hearts 2 drags 13 errors []`（第 2 回合故意錯）。標題卡與轉盤上都看得到夾腳拖。截圖 `qa/australia/`（`overview.jpg`）。`web/` 已重新匯出（pck 6.0 MB）。
