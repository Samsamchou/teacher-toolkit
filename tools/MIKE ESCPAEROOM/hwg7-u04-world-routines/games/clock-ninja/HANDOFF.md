# Clock Ninja／時鐘忍者 交接（2026-11-20）

世界作息之旅英國站（do my homework，4:30）和西班牙站（have dinner，9:15）共用的 Godot 4 小遊戲。
畫面不捲動、主角不移動：東西從畫面下方慢慢拋上來（在空中約 2.5 秒），學生**用手指點（或劃過）**該拿的東西，
東西帶著一道刀光飛進書包（英國）／落到餐盤上（西班牙）；外圈有紅光的東西不要點。每 10 秒一次時鐘回合：
聽英文時間，三個大指針時鐘（紅、藍、黃）浮在中間，直接點正確的那一個。
老師 11/20 看過玩法說明與示意圖（`../clock-ninja-design/`）後說「可以照示意圖做」。

狀態：**本機做完並測過，沒有部署、沒有 commit、沒有複製到網站資料夾。真正的 iPad 還沒測，也還沒有學生試玩過。**

## 和校車衝刺／接便當的關係

- 專案從 `../bus-dash` 複製：`web_bridge.gd`（GAME 改成 `clock-ninja`）、`clock_draw.gd`、字型、音效、配樂、
  匯出設定、`make_audio.py` 都一樣。`scripts/main.gd` 保留校車衝刺的 HUD、分數／連擊／Fever／愛心／星星、
  Finish 按鈕、`_build_rounds()`（`review_times`）、`howto_good`、`?hero=`、`?country=`、`-- country=`、
  postMessage、`window.__bento`，只換掉玩法（拋物、點擊／劃過、時鐘回合改成直接點時鐘）。
- 長度與星星讀 `data/rules.json`（主檔 `../rules.json`，改完跑 `python ../sync_rules.py`）。
- 主角圖是校車衝刺 `art/taiwan/` 的女生／男生複製到 `art/hero/`（只留用到的 `run_3`（站姿）、`happy`、`sad`）＋ `player_meta.json`。

## 怎麼開

- Godot 4.7.2，Compatibility 渲染器。G 槽跑 Godot 很慢：把資料夾（不含 `.godot/`、`*.import`、`web/`、`qa/`、`art_source/`）
  複製到 `%TEMP%\wrt_godot\clock-ninja`，在那裡 `--import` 兩次、測試、匯出，再把 `web/*` 複製回來。
- 網頁版在 `web/`，要用 HTTP：`python -m http.server 8765 --directory web`，
  開 `http://127.0.0.1:8765/index.html?country=uk&hero=girl`（或 `country=spain`、`hero=boy`）。沒帶 country 就是英國。
- 操作：手指點東西（或按住劃過去）。時鐘回合點時鐘；也可點藍色喇叭（或空白鍵／R）重聽；鍵盤 1／2／3 選左中右時鐘；F＝Finish。

## 玩法與數字（`scripts/main.gd` 最上面的常數）

- 一局 60 秒（時鐘回合時暫停）、3 顆愛心、4 個時鐘回合（第 10、20、30、40 秒），全答完右上出現 Finish。
- 拋物：每 1.7 秒（開頭）→ 1.25 秒（最後）一波，一波 1–3 個（前 20% 的時間最多 2 個），一波最多 1 個壞東西；
  壞東西比例 22% → 30%，Fever 時 12%、出得快一點。每個東西在空中 2.35–2.7 秒（`AIR_TIME`），最高點在畫面 24%–50% 高。
- 點擊範圍：好東西＝圖的一半＋30 px（`HIT_PAD`，比圖大一圈）；壞東西只有點在圖的正中 80% 內才算（`BAD_HIT`）。
  同一點附近有好有壞時，算好的。劃過去：一路經過的都算（壞東西要劃得很正才算）。
- 點到好東西：+10 分（設定檔 `points`）、連擊每 6 次升一級 ×2、×3、Fever 再 ×2。好東西掉下去：不扣愛心，只中斷連擊（小聲的 miss 音）。
- 點到壞東西：扣 1 顆愛心、"Oops!"、主角難過。
- 時鐘回合：空中的東西停住、變淡、不能點 → 0.75 秒時念出時間（作答前畫面沒有文字或數字時間）→ 三個時鐘依序彈出、輕輕上下飄 →
  7 秒內點一個（`CLOCK_ANSWER`）。答對 +100 分＋6 秒 Fever；答錯扣 1 顆愛心；**7 秒沒點：算沒答對、不扣愛心**（這版的決定）。
  作答後：對的時鐘綠圈並在下方顯示數字時間（如 4:30），點錯的打紅叉，上方顯示 Great!／Oops!／Time's up! 和 "It's four thirty."
- 第 1 題＝本站時間（`clock_rounds[0]`），後 3 題從 `review_times` 抽（英國 6:45、12:15、7:35 全用；西班牙 4 個抽 3 個）。
- 星星（`rules.json`）：550 分＋對 2 個＝2 顆；1250 分＋對 3 個＝3 顆；愛心掉光最多 2 顆。
- 主角站在左下角不動，答對／每 6 連擊歡呼跳、點錯／答錯難過。

## 設定檔（`data/uk.json`、`data/spain.json`）

| 欄位 | 說明 |
|---|---|
| `country`、`title`、`subtitle` | 國名代號、標題畫面英文字 |
| `howto_good`、`howto_bad` | 標題畫面第 1、2 張說明卡的標題（太長會自動斷成兩行） |
| `target_time` | 本站時間（標題畫面時鐘、第 1 題） |
| `background` | 背景圖（16:9，畫面以「填滿、對齊底部」方式顯示，桌子永遠在下方） |
| `holder.art` | 書包／餐盤圖 |
| `holder.width` | 在 720 高畫面裡的寬度（像素） |
| `holder.bottom` | 圖的底邊在畫面高度的幾成（英國 1.04＝稍微超出下緣，西班牙 0.985） |
| `holder.mouth` | 東西飛進去的點＝圖由上往下的幾成（書包開口 0.3、餐盤中心 0.45） |
| `holder.pile` | true＝接到的東西留在盤子上（最多 7 個，西班牙）；false＝飛進去就不見（書包） |
| `player.height`、`player.idle`、`player.poses`、`player.meta` | 主角高度、站姿用哪張（`run_3`）、圖檔前綴、頭部位置檔 |
| `good_items[]`／`bad_items[]` | `id`、`art`（好東西多 `points`） |
| `review_times` | 前面走過的站的時間（誘答自動產生：同一小時差 30 分、下一小時同分鐘） |
| `clock_rounds[]` | `time`＋兩個 `distractors`；第一個是本站時間，其餘在 review 不夠時才用 |
| `voice_dir`、`end_titles`、`fx` | 語音資料夾、1／2／3 星結尾標題、特效圖（slash、sparkle、sparkles、burst） |

## 加一個國家

1. `art_source/<國>/`：`bg.png`（房間＋中間空、沒有時鐘）、`items.png`（2 列 × 5，前 6 好後 4 壞）、
   放東西的容器（`bag.png` 或 `plate.png`）。提示詞抄 `art_source/uk/*_prompt.txt`；用 Codex CLI 在 C 槽空資料夾生圖。
2. `tools/cut_art.py` 的 `ITEMS`、`HOLDER` 加上該國，執行 `python tools/cut_art.py <國>` → `art/<國>/`。
3. 複製 `data/uk.json` 改內容，`review_times` 填前面各站的時間，執行 `python tools/make_audio.py --voice-only`（只補缺的音檔）。
4. 複製到 C 槽、匯入、跑 `qa_smoke.gd`、匯出、跑 `qa_web.py`。

## 匯出

```powershell
$godot = "C:\Users\User\Godot\Godot_v4.7.2-stable_win64_console.exe"
& $godot --headless --path . --import     # 跑兩次
& $godot --headless --path . --export-release Web web/index.html
```

`web/` 約 45 MB（`index.wasm` 39.5 MB 是 Godot 官方樣板、`index.pck` 約 5.3 MB 含兩國）。

## 和外層網頁的訊息

格式和另外兩款一樣，只是 `game:'clock-ninja'`：

```js
{channel:'world-routines', type:'game-ready', game:'clock-ninja', country:'uk'}
{channel:'world-routines', type:'game-done', game:'clock-ninja', country:'uk', score:1820, stars:3, clocksCorrect:3}
```

`window.__bento`：state、score、hearts、stars、clocksCorrect、clockIdx、country、w、h、playT；
`?qa=1` 再多給 `good`／`bad`（空中東西的位置與速度）、`clocks`（三個時鐘位置與哪個對）、`finish`、`caught` 等給測試用。

## 檔案

- `scripts/main.gd` 玩法與畫面；`scripts/clock_draw.gd` 時鐘；`scripts/web_bridge.gd`；`scripts/qa_smoke.gd` 無畫面機器人。
- `art_source/uk/`、`art_source/spain/`、`art_source/fx/`：Codex 原圖與提示詞（英國物品表重生過一次，舊的是 `items_v1.png`）。
- `art/uk/`、`art/spain/`、`art/fx/`、`art/hero/`：遊戲用圖。`tools/cut_art.py` 切圖（借用 `../bento-catch/tools/cut_art.py` 的函式）。
- `audio/times/*.mp3`：edge-tts 語音（en-US-AnaNeural，−12%）。音效、配樂與校車衝刺相同。
- `qa/uk/`、`qa/spain/`：瀏覽器截圖、`overview.jpg` 總表、`art_sheet.jpg` 切圖總表。

## 測試（11/20）

無頭測試（在 C 槽副本）：`godot --headless --path . --script res://scripts/qa_smoke.gd -- country=uk [bad|child|slow]`

- 好機器人（點好東西＋對的時鐘，50 秒時按 Finish）：**英國 5/5、西班牙 5/5 都 3 星**，每次 4/4 時鐘、有 Fever、
  第 1 題＝本站時間（4:30／9:15）、按 Finish 後在 50.0 秒結束。分數英國 2580–3370、西班牙 2750–3040。
- 壞機器人（點紅光東西＋錯的時鐘）：兩國各 2 次都愛心掉光（6.4–19.7 秒結束）、時鐘 0 個。
- 估難度用的兩種「小孩」機器人（不算過關測試）：
  - child（看到東西 0.8 秒後才點、每 0.45 秒最多點一次、點偏 ±40 px、放掉 10%、第 3 題答錯）：1590–2280 分、3 星。
  - slow（1 秒後才點、每 0.8 秒一次、放掉 25%、第 3 題答錯）：830–930 分、2 星。
  - 所以：認真、穩穩點的孩子拿得到 1250 分（3 星）；慢慢點的拿 2 星。東西一波 1–3 個、每 1.25–1.7 秒一波，不算手忙腳亂。
- 瀏覽器實跑（`python tools/qa_web.py web <輸出> girl uk`、`boy spain`，Playwright＋Chromium、真的滑鼠點擊）：
  標題 → 點東西 → 4 個時鐘回合（第 2 回合故意點錯）→ Finish → 結算，**兩國都 0 個 console 錯誤**。
  英國：score 1520、3 星、clocks 3/4；西班牙：score 1430、3 星、clocks 3/4。截圖與總表在 `qa/uk/`、`qa/spain/`（`overview.jpg`），輸出在 `qa/qa_web_log.txt`。
  無頭 Chromium 比真實時間慢很多（一局要好幾分鐘），所以腳本上限設 1200 秒；不要和 Godot 無頭測試同時跑。

## 和設計／示意圖不同的地方

- 主角沒有專門的「站著」圖，站姿用校車衝刺跑步圖的第 3 格（單腳抬起、像原地踏步）加一點呼吸起伏；
  示意圖裡是站著揮手。若老師要真正站姿，需要再生一張主角圖。
- 示意圖裡空中東西有虛線弧線軌跡，遊戲裡沒有畫軌跡（只有被點到後飛進書包那一道刀光）。
- 背景比示意圖簡單：英國房間沒有筆筒、國旗抱枕，桌上是空的（避免和要點的東西混淆）。
- 英國漫畫第一次生成的圖有小人物臉，依設計「不出現人或動物」重生一次（舊圖 `art_source/uk/items_v1.png`）。

## 這版自己做的決定（請老師確認）

1. 時鐘回合 7 秒沒點：算沒答對、**不扣愛心**（畫面顯示 Time's up!）。
2. 點和劃都算。時鐘只能用「點」選（劃過去不算），避免劃到中間的時鐘時先碰到左邊那個。
3. 壞東西的點擊範圍比圖小、好東西比圖大一圈；兩個重疊時算好的。劃過壞東西要劃得很正才扣愛心。
4. 好東西每個 10 分（設計寫 +10）；結尾標題英國 "Homework done!"、西班牙 "Dinner time!"。
5. 時鐘回合題目：英國＝4:30＋6:45、12:15、7:35；西班牙＝9:15＋從 6:45、12:15、7:35、4:30 隨機抽 3 個。

## 沒測到

- **真正的 iPad Safari 沒測**：載入時間、聲音解鎖、手指點擊與劃過的手感、效能都要實機確認。
- **聲音沒有人耳聽過**（語音、音效、Fever 加速）。新語音 0200、0315、0330、0430、0445、0500、0845、0915、0930、1000 是 edge-tts 產生。
- 難度是用機器人估的，沒有學生試玩過。
- 沒有複製到網站 public、沒有部署、沒有 commit。

## 2026-11-20 晚：主角改用真正站姿（OPEN_QUESTIONS N6，老師「照建議」）—本機做完，未部署、未 commit、未複製到網站資料夾

- 從行李轉盤複製 `art/hero/girl_stand.png`、`boy_stand.png` 和含 `stand` 的 `player_meta.json`（原有欄位一字不變，只多 stand）到 `art/hero/`。
- `data/uk.json`、`data/spain.json`：`player.idle` 由 `run_3` 改成 `stand`；`player.height` 210 → 212。
  原因：遊戲用站姿圖高度算縮放（`player_k = height / idle 圖高`），站姿圖高 410、run_3 是 406，改成 212 讓縮放和以前完全一樣（0.517），happy／sad 大小不變，站姿也和其他姿勢同比例。
  程式沒改；`run_3` 圖留著當備用（沒用到）。
- 檢查：腳踩在地板線上（腳底在畫面 98.5% 高、影子在腳下），頭的大小、位置和以前一樣（對照 `qa/hero_stand_compare.png`：左英國舊圖剛好是 happy、右二是西班牙舊 run_3 與新 stand）。
  站姿是為行李轉盤畫的，所以有一隻手往前伸（原本是握推車把手），在這裡看起來像在打招呼／指著東西，我覺得可以；老師若不喜歡要另外生一張。
- 無頭測試（`%TEMP%\wrt_godot\clock-ninja-fix`）：英國、西班牙好機器人各 5/5 `QA_SMOKE_OK`（3 星、4/4、有 Fever）；壞機器人各 1 次愛心掉光、0 時鐘。
- 瀏覽器實跑：`uk girl rounds 4 playT 41.4 score 1630 stars 3 clocks 3 hearts 2 errors []`、`spain boy rounds 4 playT 41.9 score 1530 stars 3 clocks 3 hearts 2 errors []`。截圖 `qa/uk/`、`qa/spain/`（`overview.jpg`）。`web/` 已重新匯出（pck 5.5 MB）。
