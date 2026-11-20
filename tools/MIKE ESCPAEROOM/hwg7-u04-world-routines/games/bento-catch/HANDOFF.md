# Bento Catch／接便當 交接（2026-11-19）

世界作息之旅（HWG7 U04 Daily routines）日本站的 Godot 4 小遊戲。學生扮演穿白色割烹着、戴白帽的午餐值日生，
拿托盤接營養午餐、閃開球鞋等雜物；每 12 秒一次「時鐘回合」：聽英文時間，接住正確的指針時鐘。

狀態：**本機做完並測過，沒有部署、沒有 commit、沒有 push。真正的 iPad 還沒測。**

## 怎麼開

- Godot 專案就是這個資料夾（`project.godot`），Godot 4.7.2，Compatibility 渲染器。
  G 槽跑 Godot 匯入很慢，建議把整個資料夾（不含 `.godot/`）複製到 C 槽再開。
- 網頁版在 `web/`，不能直接雙擊 `index.html`，要用 HTTP：
  `python -m http.server 8765 --directory web`，再開 `http://127.0.0.1:8765/index.html?country=japan`。
- 操作：手指（或滑鼠按住）在畫面任何地方左右拖，角色的托盤會跟到手指的位置；鍵盤左右鍵或 A／D。
  時鐘回合可點左上的藍色喇叭（或按空白鍵／R）再聽一次。

## 玩法與數字（都在 `scripts/main.gd` 最上面的常數）

- 接食物的時間 75 秒；時鐘回合進行時這個計時會暫停，所以一局實際大約 2 分鐘。
- 3 顆愛心。接到雜物或選錯時鐘各扣 1 顆；食物掉到地上不扣愛心，只會中斷連擊。
- 連擊每 6 次加一級，分數 ×2、×3。
- 時鐘回合 5 次（遊戲時間第 12、24、36、48、60 秒）：食物停住變淡 → 念出時間 → 3 個時鐘慢慢往下，
  約 7 秒後「角色所在的那一道」就是答案（那一道會有黃框提示）。答對 +100 分並進入 6 秒 Fever（分數 ×2、音樂加快、星星）。
  念的句子在作答前不會顯示文字；作答後才顯示「It's twelve fifteen.」和數字 12:15 當回饋。
- 星星：1 顆基本；分數 ≥ 700 且時鐘對 ≥ 2 → 2 顆；分數 ≥ 1600 且時鐘對 ≥ 4 → 3 顆；愛心掉光最多 2 顆。
  （門檻是我估的，還沒有學生試玩過，可能要調。）

## 匯出指令

```powershell
$godot = "C:\Users\User\Godot\Godot_v4.7.2-stable_win64_console.exe"
& $godot --headless --path . --import          # 第一次或換素材後，跑兩次比較保險（第一次字型可能還沒匯入完）
& $godot --headless --path . --export-release Web web/index.html
```

- 匯出設定在 `export_presets.cfg`：單執行緒（thread_support=false，不需要 COOP／COEP，可放 iframe 與 Firebase Hosting）。
- 匯出大小：`web/` 共約 41 MB，其中 `index.wasm` 39.5 MB（Godot 4.7 官方樣板固定這麼大），`index.pck` 2.6 MB。
  經 gzip 傳輸約 10 MB（Firebase Hosting 會自動壓縮）。原本希望 < 25 MB，未壓縮做不到，除非自己編譯精簡樣板。

## 加印度、埃及（設定檔格式）

網址 `?country=india` → 讀 `res://data/india.json`；找不到就退回 japan。新增一國要做：

1. `art_source/<國>/` 放三張 Codex 圖：`bg.png`、`items.png`（2 列 × 5 欄，前 6 個好東西、後 4 個壞東西）、
   `player.png`（一列 4 個姿勢：idle、run（面向右）、happy、sad，每個都雙手拿綠色托盤）。提示詞可抄 `art_source/japan/*_prompt.txt`。
2. 在 `tools/cut_art.py` 的 `ITEMS` 加上該國 10 個物品的檔名，執行 `python tools/cut_art.py <國>`
   → 產生 `art/<國>/*.png` 和 `player_meta.json`（自動量出每個姿勢托盤的位置；托盤不是淺綠色的話要改偵測顏色）。
3. 複製 `data/japan.json` 成 `data/<國>.json` 改內容，執行 `python tools/make_audio.py --voice-only`
   （會替所有 json 的 `clock_rounds[].time` 產生 `audio/times/HHMM.mp3`，edge-tts en-US-AnaNeural，速度 −12%）。
4. 重新匯入、匯出。

`data/<國>.json` 欄位：

| 欄位 | 說明 |
|---|---|
| `country` | 國名代號 |
| `title`、`subtitle` | 標題畫面的英文字 |
| `target_time` | 這一站的目標時間（標題畫面的時鐘用），例如 `"12:15"` |
| `background` | 背景圖路徑（16:9） |
| `floor_y` | 腳站的位置＝背景圖高度的幾成（日本 0.9） |
| `player.poses` | idle／run／happy／sad 四張圖 |
| `player.meta` | `cut_art.py` 產生的托盤位置檔 |
| `player.run_faces_right` | run 那張是否面向右（往左走時自動鏡射） |
| `player.height` | 角色在 720 高畫面裡的高度（像素） |
| `player.catch_half_width` | 托盤可接住的半寬（像素） |
| `good_items[]` | `id`、`art`、`points` |
| `bad_items[]` | `id`、`art` |
| `clock_rounds[]` | `time`（正確答案）＋ `distractors`（兩個誘答時間）；第一個要放目標時間 |
| `voice_dir` | 語音資料夾，檔名 `HHMM.mp3` |
| `end_titles` | 1／2／3 顆星的結尾標題 |

指針時鐘是程式畫的（`scripts/clock_draw.gd`，時針會隨分鐘移動），任何時間都能顯示，不需要時鐘圖片。

## 和外層網頁的訊息（postMessage）

只有被 iframe 嵌入時才送，而且只送給同網域（`window.location.origin`）；沒有外層頁面時什麼都不做，不會出錯。

```js
// 標題畫面出現時
{channel:'world-routines', type:'game-ready', game:'bento-catch', country:'japan'}
// 一局結束時（每局一次；按 Play again 再玩完會再送一次）
{channel:'world-routines', type:'game-done', game:'bento-catch', country:'japan', score:410, stars:1, clocksCorrect:3}
```

外層頁面請檢查 `e.origin`、`e.source` 是那個 iframe、`e.data.channel === 'world-routines'`（範例見 `qa/embed_test.html`）。
遊戲和外層要放在同一個網域，否則訊息送不出去。分數是裝置自己回報的，沒有防作弊。

另外遊戲會把狀態寫在 iframe 裡的 `window.__bento`（state、score、hearts…）給測試腳本讀；
網址加 `?qa=1` 才會多給正確答案那一道的位置，`?qa_speed=3` 可加速（只給測試用）。

## 檔案

- `scripts/main.gd` 全部玩法與畫面；`scripts/clock_draw.gd` 時鐘；`scripts/web_bridge.gd` 網址參數與 postMessage；
  `scripts/qa_smoke.gd` 無畫面機器人測試。
- `data/japan.json` 設定；`art/japan/` 遊戲用圖；`art_source/japan/` Codex 原圖與提示詞（共 3 次生圖）。
- `audio/times/*.mp3` 語音；`audio/sfx/*.wav`、`audio/music_loop.ogg` 是 `tools/make_audio.py` 用 Python 合成的（自己寫的旋律，沒有第三方音樂）。
- `fonts/` Comic Relief Regular／Bold（所有英文字都用它，畫面沒有中文字）。
- `tools/qa_web.py` 瀏覽器測試；`qa/` 截圖與 `qa_web_report.json`。

## 測了什麼

- `--headless --import` 與 `--headless --quit-after`：沒有腳本錯誤。
- `--headless --script res://scripts/qa_smoke.gd`（機器人玩整局）與 `-- bad`（故意選錯）：都印出 `QA_SMOKE_OK`。
- `python tools/qa_web.py`（Playwright＋Chromium，本機 HTTP，跑完自動關伺服器）：
  標題 → 開始 → 滑鼠拖曳左右（角色位置有跟到）→ 方向鍵與 D 鍵、放開後不會繼續滑 → 5 個時鐘回合（第 3 回合故意選錯）
  → 重聽按鈕 → Fever → 結束畫面 → Play again；iframe 內用觸控點擊開始、收到 game-ready 與 game-done；
  4:3（1024×768 觸控）版面。瀏覽器 console 沒有錯誤。截圖我都看過：腳踩在地板上、雙手拿托盤、時鐘數字清楚、字型是 Comic Relief。

## 沒測到、已知限制

- **真正的 iPad Safari 沒測**：載入時間、聲音解鎖（Tap to start 之後才出聲）、手指拖曳手感、效能都要實機確認。
- **聲音沒有人耳聽過**：自動測試聽不到聲音，只確認檔案有載入、沒有錯誤。語音、音效音量比例和 Fever 時音樂加快請老師聽一次。
- 沒有做 30 fps 上限：Godot 網頁版跟著瀏覽器的畫面更新率跑，引擎的 max_fps 在網頁上不可靠；
  目前改成觸控裝置粒子數減半。如果 iPad 實測會卡，再處理。
- 多指觸控：只認第一根手指（Godot 把觸控轉成滑鼠事件，單一輸入來源）。
- 手指按住後滑出 iframe 外放開，角色會停在最後的位置，下次按下就恢復，不會卡鍵；分頁切到背景時會靜音並清掉按鍵。
- 背景圖牆上有一個沒有數字的裝飾時鐘，和題目無關，若覺得會干擾可重生一張背景。
- 星星門檻、掉落速度是估的，沒有學生試玩資料。
- `.godot/` 快取沒有複製到 G 槽，第一次開專案會重新匯入。

## 2026-11-19 晚：長度改由設定檔控制（規格卡 rdq/RDQ-spec-world-routines-game-length-20261119.md）

**上面「玩法與數字」的 75 秒／5 回合／700・1600 分已經是舊的，以這一段為準。**

- 長度、回合數、星星門檻讀 `data/rules.json`；主檔在 `games/rules.json`（四款遊戲共用），改完跑 `python games/sync_rules.py` 再重新匯出。
  目前：接 60 秒、每 10 秒一次時鐘回合、共 4 回合；2 星＝550 分＋對 2 個；3 星＝1250 分＋對 3 個。實際一局約 1 分 40 秒。
- 時鐘回合出題（`_build_rounds()`）：第 1 題＝`clock_rounds[0]`（本站時間）；接著 `review_times`（前面走過的站的時間，誘答自動產生：
  同一小時差 30 分、下一小時同分鐘）；不夠再從本站其他回合抽。日本站 `review_times: ["6:45"]`（台灣）。
  新增一國時把前面各站的時間都填進 `review_times`，再跑 `python tools/make_audio.py --voice-only`（只補缺的音檔，`--all` 全部重做）。
- 4 個時鐘回合都答完後，右上出現黃色「Finish ✓」按鈕（鍵盤 F），按了直接結算。遊戲字型沒有中文，所以按鈕只有英文。
- 測試：`qa_smoke.gd` 好／壞兩種機器人都過；瀏覽器實測 Finish 按鈕可按（`qa/09_finish_button.png`、`qa/10_end_after_finish.png`）。
  無頭瀏覽器跑得比實際慢，量時間要用真的瀏覽器（內建瀏覽器量過：遊戲時間與實際時間一致）。`tools/qa_web.py` 還是舊的 5 回合寫法，沒有更新。
- 網頁版已重新匯出到 `web/` 並用 `publish_to_site.py` 複製到網站的 public；**還沒部署**。

## 2026-11-20：埃及版（第 6 站 6:35）、印度版（第 8 站 2:40）—本機做完，未部署、未 commit、未複製到網站 public

- 網址 `?country=egypt`、`?country=india`。標題維持 "Bento Catch"（三國同一個遊戲名，**請老師確認**要不要改成各國自己的名字）。

| | 埃及 egypt | 印度 india |
|---|---|---|
| 句子 | I have breakfast at six thirty-five. | I go home at two forty. |
| 副標 | Breakfast time in Egypt! | Home time in India! |
| 第一張說明卡 `howto_good` | Catch breakfast! | Pack to go home! |
| 場景 | 開羅家裡的廚房，窗外日出、棕櫚樹、遠方宣禮塔，藍綠花磚、銅燈 | 印度小學中庭，奶油黃拱廊校舍、苦楝樹、萬壽菊、打開的綠色校門（外面有嘟嘟車、腳踏車） |
| 角色 | 埃及女孩（捲髮馬尾、黃色長袖 T 恤、藍長褲、白球鞋），拿淺綠色托盤 | 印度男孩（淺藍短袖制服襯衫、深藍短褲），拿**淺綠色竹編淺籃**（比托盤更像「裝東西回家」） |
| 要接的 6 個 | ful medames 蠶豆泥、ta'ameya 埃及綠色炸豆餅、baladi 圓麵包、水煮蛋、白起司配番茄、薄荷紅茶 | 不鏽鋼三層便當盒（tiffin）、書包、水壺、筆記本（空白標籤）、鉛筆盒、芒果（放學點心） |
| 要閃的 4 個 | 藍色拖鞋、紅色玩具車、黃色小鴨、紫色毛線球 | 風箏、陀螺（lattu）、板球、溜溜球（＝放學路上的誘惑） |
| `end_titles` 3 星 | Yummy! Great job! | All packed! Great job! |
| `review_times` | 6:45、12:15、7:35、4:30、9:15 | 同左＋6:35、5:40 |
| 其他 4 回合（只有複習時間不夠時才會用到） | 7:10、6:20、8:25、5:50 | 3:10、1:45、2:25、3:55 |

- 第 1 回合誘答：埃及 6:05／7:35，印度 2:10／3:40（同一小時差 30 分＋下一小時同分鐘）。
  因為 `review_times` 有 5～7 個，實際上每局 = 本站時間＋隨機 3 個前面各站的時間。
- 美術：Codex 生圖 6 張（`art_source/egypt/`、`art_source/india/` 各 `bg／items／player.png`＋提示詞），**一次就過，沒有重生**；
  每張都看過：沒有文字、物品沒有黏在一起、沒有多餘人物。總表 `qa/egypt/art_sheet.jpg`、`qa/india/art_sheet.jpg`。
- `tools/cut_art.py`：`ITEMS` 加兩國；新增 `CATCHER` 設定（每國的托盤／籃子偵測顏色）。日本維持原本的 RGB 判斷（結果逐位數相同，已比對），
  埃及的黃綠托盤和印度竹籃用 HSV（色相 62–115°）判斷——原本的 RGB 判斷只抓到托盤底部一條細線，接物高度會偏低。
- `scripts/main.gd`：① 第一張說明卡標題讀 `howto_good`（沒寫＝"Catch the lunch!"，日本不變）；② `-- country=xxx` 指令參數（無頭測試用）；
  ③ 結算畫面小時鐘改畫本站 `target_time`（日本仍是 12:15）；④ `?qa=1` 時 `window.__bento` 多給 `badX`、`goodX`、`catchHW`，並每 0.1 秒更新（只給測試機器人）。
- `scripts/qa_smoke.gd`：`-- country=egypt [bad]`；第一回合比對設定檔 `target_time`、複習回合比對 `review_times`；好機器人要 3 顆星才算過；
  機器人改成會閃開快掉到托盤的雜物（原本只追食物，印度版 12 次有 3 次撞光愛心）。
- `tools/qa_web.py`：`python tools/qa_web.py <國> [輸出資料夾] [專案根目錄]`，伺服器埠號由系統挑（可和其他測試同時開）；
  4 回合都答完會按 Finish；截圖先存本機暫存再複製（G 槽寫入慢會讓時鐘回合答太晚）；最後產生 `overview.jpg`。`qa/embed_test.html` 會把 `?country=` 帶進 iframe。
- 語音：edge-tts 補了 0145、0225、0240、0310、0355、0430、0540、0550、0620、0635、0710、0735、0825、0915。
- `web/` 已重新匯出（pck 2.6 → 7.8 MB，wasm 不變）。

### 測試（11/20，都在 C 槽副本 `%TEMP%\wrt_godot\bento-catch-eg`）

- `qa_smoke.gd` 新機器人：埃及、印度、日本各 5 次好機器人全部 `QA_SMOKE_OK`（3 顆星、4/4 時鐘、愛心 3），壞機器人三國都愛心掉光、時鐘 0。
- 瀏覽器實跑（真的滑鼠拖曳、方向鍵、D 鍵、觸控、iframe）三國都過：4 回合（第 3 回合故意答錯）→ Finish → 結算 → Play again，
  iframe 收到 game-ready／game-done（country 正確），console 0 錯誤。截圖：`qa/egypt/`、`qa/india/`、`qa/japan/`（各有 `overview.jpg`）。
  （根目錄 `qa/*.png` 是 11/19 的舊截圖，沒有動。）

### 沒做／待確認

- 沒有複製到網站 public（`publish_to_site.py` 沒跑）、沒部署、真 iPad 沒測、聲音沒有人耳聽過。
- 請老師確認：遊戲名要不要跟著國家改；印度用籃子（不是托盤）；物品清單；埃及女孩／印度男孩的造型。

## 2026-11-20 晚：老師「照建議」小修（OPEN_QUESTIONS C1、C5）—本機做完，未部署、未 commit、未複製到網站 public

- C1 遊戲名跟著國家：`data/egypt.json` `title` → "Breakfast Catch"、`data/india.json` → "Home Time Catch"；日本仍是 "Bento Catch"。
  標題畫面本來就讀 `cfg.title`（預設 "Bento Catch"），結算畫面沒有遊戲名。另外瀏覽器分頁標題原本固定是專案名 "Bento Catch"：
  `web_bridge.gd` 加 `set_title()`（`DisplayServer.window_set_title`），`main.gd` 用 `_set_tab_title.call_deferred()` 呼叫
  （要延後：引擎在 `_ready` 之後才把專案名寫進 `document.title`，直接在 `_ready` 改會被蓋掉）。實測分頁標題：japan Bento Catch／egypt Breakfast Catch／india Home Time Catch。
  postMessage 的 `game` 仍是 `bento-catch`（`web_bridge.gd` 的 `GAME` 沒動，iframe 實測訊息正確）。專案名 `project.godot` 沒改。
- C5：`data/egypt.json` 第 1 回合誘答 6:05／7:35 → 6:05／7:05（7:35 是美國站時間）。誘答只畫時鐘、不念，所以不用新音檔（`make_audio.py --voice-only` 跑過，沒有缺檔）。
- 無頭測試（最後一版，`%TEMP%\wrt_godot\bento-catch-fix`）：埃及、印度、日本好機器人各 5/5 `QA_SMOKE_OK`（3 星、4/4、愛心 3），壞機器人各 1 次愛心掉光、0 時鐘。
- 瀏覽器實跑：埃及、印度都 4 回合（第 3 回合故意錯）→ Finish → 結算 → Play again、iframe 觸控開始、收到 game-ready／game-done（game=bento-catch、country 正確）、console 0 錯誤。
  看過截圖：標題 "Breakfast Catch"／"Home Time Catch"；埃及第 1 回合三個時鐘是 6:05、6:35、7:05。截圖 `qa/egypt/`、`qa/india/`（`overview.jpg`）。`web/` 已重新匯出。
