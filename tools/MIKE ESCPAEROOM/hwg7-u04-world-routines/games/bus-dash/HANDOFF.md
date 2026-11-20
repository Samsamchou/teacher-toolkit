# Bus Dash／校車衝刺 交接（2026-11-19）

世界作息之旅台灣站的 Godot 4 小遊戲（之後美國、肯亞共用）。三條車道橫向跑酷：主角往右跑追校車，
手指上下拖（或方向鍵／W S）換車道，撿早餐、閃水窪／三角錐／狗／香蕉皮；每 10 秒一次時鐘回合：聽英文時間，
三個時鐘各佔一條車道，約 7 秒後主角所在的車道就是答案。老師 11/19 看過玩法說明圖（`../bus-dash-design/`）後同意製作。

狀態：**本機做完並測過，沒有部署、沒有 commit。真正的 iPad 還沒測，也還沒有學生試玩過。**

## 和接便當的關係

- 專案是從 `../bento-catch` 複製來的：`web_bridge.gd`（GAME 改成 bus-dash）、`clock_draw.gd`、字型、音效、配樂、匯出設定都一樣。
  `scripts/main.gd` 是用一支修改腳本從接便當的 main.gd 改寫的（換掉移動、物品、時鐘、背景這些函式），所以兩邊的 HUD、結算、
  Fever、連擊、Finish 按鈕、`rules.json`、postMessage 格式完全相同。接便當的 HANDOFF 講的匯出指令、訊息格式這裡都適用。
- 長度與星星讀 `data/rules.json`（主檔 `../rules.json`，改完跑 `python ../sync_rules.py`）。
- QA 用的狀態物件一樣叫 `window.__bento`（多了 `lane`、`laneY`、`okLane`、`badAhead`）。

## 設定檔（`data/taiwan.json`）和接便當不同的欄位

| 欄位 | 說明 |
|---|---|
| `scenery` | 上方捲動街景（會左右鏡射接續，所以圖的左右兩邊不必一樣） |
| `bus` | 校車（朝右）。一開始只露出車尾，時間越久越靠近；愛心還在就在結算時整台出現 |
| `player.poses.girl／boy` | 各 4 張：`run_a`、`run_b`、`happy`、`sad`。網址 `?hero=girl|boy` 決定用哪一組（學生頁會帶） |
| `player.height` | 主角在 720 高畫面裡的高度（像素） |
| `review_times` | 前面走過的站的時間；台灣是第一站所以是空的 |

畫面配置寫在 `_layout()`：街景佔上方 30%，下面三條車道；時鐘半徑＝車道高 × 0.47。

## 加美國、肯亞

1. `art_source/<國>/` 放 5 張 Codex 圖：`bg.png`、`items.png`（2 列 × 5，前 6 好後 4 壞）、`girl.png`、`boy.png`（一列 4 個姿勢）、`bus.png`。
   提示詞抄 `art_source/taiwan/*_prompt.txt`；主角圖要用 `-i` 附上 `web/art3d/hero_girl.png`／`hero_boy.png` 當參考。
2. `tools/cut_art.py` 的 `ITEMS`、`SCENERY_ROWS` 加上該國，執行 `python tools/cut_art.py <國>`。
3. 複製 `data/taiwan.json` 改內容，`review_times` 填前面各站的時間，執行 `python tools/make_audio.py --voice-only`。
4. 複製到 C 槽匯入、跑 `qa_smoke.gd`（好／壞兩種）、匯出，再用 `python tools/qa_web.py <web 資料夾> <輸出資料夾> [girl|boy]` 在瀏覽器實跑。

## 測試（11/19）

- `qa_smoke.gd` 好機器人連跑 4 次都過（3 顆星、4 個時鐘全對、分數 3300–3600）；壞機器人愛心掉光提早結束。
- 瀏覽器實跑（`qa/overview.jpg` 和各張截圖）：標題、接物、4 個時鐘回合（第 2 回合故意答錯）、Finish 按鈕、結算，沒有錯誤。
- 內建瀏覽器量過遊戲秒數和實際時間一致；`?hero=boy` 和 `?hero=girl` 都有換人。
- 難度是我估的（速度 320→490、壞東西 22%→30%、不會三條車道同時擋住），沒有學生試玩過，可能要調。

## 2026-11-20：跑步動作重做（老師 11/19 退件「衝刺時沒有跑步的動作」）

- 主角圖全部重畫：`art_source/taiwan/girl_v2.png`、`boy_v2.png`（2 列 × 4：run_1…run_6 一個跑步循環＋happy＋sad），
  `dust_v2.png`（3 張揚塵＋速度線）。老師看過檢查圖（`qa/hero_v2_check.jpg`、`qa/run_girl.gif`、`run_boy.gif`）後同意放進遊戲。
- `tools/cut_art.py` 改成切 8 格，所有姿勢同一比例，並在 `art/<國>/player_meta.json` 記每張圖頭部的位置（ax）；
  遊戲用頭部對齊，所以只有手腳在動。`--gif` 會輸出跑步預覽。
- `data/taiwan.json`：`player.poses` 改成路徑前綴（`res://art/taiwan/girl_`），加 `player.meta` 和 `fx`（dust、speed）。
- `main.gd`：每 0.085 秒換一格（6 格循環）；第 1、4 格（腳落地）在腳後冒一團揚塵；速度快或 Fever 時身後有速度線。
- 測試：好／壞機器人都過，瀏覽器實跑一整局沒有錯誤。網頁版已重新匯出並複製到網站 public。**未部署。**

## 2026-11-20：美國版（第 3 站，7:35 go to school）—本機做完，未部署、未 commit、未複製到網站資料夾

- 網址 `?country=usa&hero=girl|boy`。設定檔 `data/usa.json`：標題仍是 Bus Dash、副標 "Catch the school bus in the USA!"、
  `target_time` 7:35、`review_times` 6:45／12:15（台灣、日本）、另外 4 回合 8:15／7:00／3:30／7:50。
- 美術（Codex 生圖，原圖與提示詞在 `art_source/usa/`，切好的在 `art/usa/`）：美國住宅區街景、黃色美式校車、
  6 個要撿的（書包、午餐盒、蘋果、鉛筆盒、書、水壺）＋4 個要閃的（水窪、滑板、倒下的垃圾桶、松鼠）。
  **主角、揚塵、速度線沒有重畫**，`usa.json` 直接指到 `art/taiwan/` 的檔案。
- `tools/cut_art.py`：`ITEMS`、`SCENERY_ROWS` 加上 usa；資料夾裡沒有 `girl_v2.png` 的國家會跳過主角和揚塵的切圖。
- `scripts/main.gd` 只改兩處：① 標題畫面第一張說明卡的標題讀設定檔 `howto_good`（沒寫就是原本的 "Grab breakfast!"，
  台灣不變；美國是 "Grab your things!"）；② `_pick_country()` 在非網頁執行時可用指令參數 `-- country=usa` 指定國家（給無頭測試用）。
- `scripts/qa_smoke.gd`：第一回合改成比對設定檔的 `target_time`。用法：`--script res://scripts/qa_smoke.gd -- country=usa [bad]`。
- `tools/qa_web.py`：多第 4 個參數（國家，預設 taiwan）：`python tools/qa_web.py <web> <輸出> girl usa`。
- 語音：edge-tts 補了 0330、0700、0735、0750、0815、1215 六個檔。
- 測試：好機器人 美國 8 次過 7 次、台灣 10 次全過；壞機器人兩國都過。失敗的那一次是機器人自己在第 30 秒把愛心撞光
  （台灣也有兩次撞光愛心，只是剛好撐過 4 個時鐘）——碰撞範圍是固定數字，和換皮無關，是測試機器人不夠穩，不是遊戲壞掉。
  瀏覽器實跑：台灣 girl、美國 girl、美國 boy 都跑完一局、0 錯誤（第 2 回合故意答錯，所以 clocks 3）。
  瀏覽器測試不要和 Godot 無頭測試同時跑：電腦忙的時候按 Finish 後 5 秒內等不到結算會逾時（遇過一次，單獨重跑就過）。
- 截圖 `qa/usa/`：美術總表 `art_sheet.jpg`、實跑總表 `overview.jpg`。`web/` 已換成含美國版的新匯出（pck 3.9 → 5.5 MB）。
- 還沒做：複製到網站 public、真 iPad、學生試玩；物品選擇和 "Grab your things!" 這句等老師確認。

## 2026-11-20：肯亞版（第 7 站，5:40 get up）—本機做完，未部署、未 commit、未複製到網站資料夾

- 網址 `?country=kenya&hero=girl|boy`。設定檔 `data/kenya.json`：副標 "It's 5:40 in Kenya. Catch the bus!"、
  `howto_good` "Grab your things!"、`target_time` 5:40（第 1 回合 5:40，干擾 6:40／5:20）、
  `review_times` 6:45／12:15／7:35／4:30／9:15／6:35（台灣、日本、美國、英國、西班牙、埃及），
  另外 4 回合 6:00／5:15／6:20／6:50（複習時間有 6 個，所以第 2–4 回合實際上都會抽到複習時間）。
- 美術（Codex 生圖，原圖與提示詞在 `art_source/kenya/`，切好的在 `art/kenya/`）：清晨的肯亞小鎮路邊（日出、遠山、
  金合歡樹、彩色鐵皮屋頂小店、水果攤、茅草圓屋、玉米田、雞、紅土路）、黃色肯亞式校車（平頭中型巴士、車頂行李架、
  綠色制服學生、大人司機）、6 個要撿的（一杯奶茶 chai、mandazi、chapati、香蕉、綠色制服毛衣、水壺）＋
  4 個要閃的（紅泥水窪、石頭、睡著的山羊、舊腳踏車輪胎）。物品呼應 routines-content 的 "I drink tea and eat mandazi."
  **主角、揚塵、速度線沒有重畫**，`kenya.json` 指到 `art/taiwan/`。
- 重生過一次：`items.png`（第一次的 mandazi 像炸三角餃 samosa）、`bus.png`（第一次駕駛座是小孩在開車）；第二版都用了。
- `tools/cut_art.py`：`ITEMS`、`SCENERY_ROWS` 加 kenya；新增 `HOLES`＋`clear_holes()`：白底被包在圖裡面、從邊緣灌不到的地方
  （輪胎中間的洞、校車車頂行李架的空隙）改成透明。只處理表裡列出的圖，台灣、美國的切圖不受影響。
- 語音：edge-tts 補了 0430、0515、0540、0600、0620、0635、0650、0915 八個檔。
- `tools/qa_web.py`：伺服器改用 port 0（作業系統挑空的埠），可以和其他瀏覽器測試同時跑。
- `scripts/qa_smoke.gd`：**好機器人修了一個 bug**。逐格紀錄每次掉愛心的情況（台灣、肯亞都看過）：每一次都是機器人在第 0 道（或第 2 道）
  很安全，看到另一邊第 2 道（第 0 道）有早餐，就一次跨兩道，直接穿過中間車道正迎面而來的壞東西。其實留在原道就不會被撞，
  所以是測試機器人的問題，不是遊戲或肯亞版的問題（碰撞判定是固定數字，三國完全一樣）。修法：要跨兩道時，中間車道前方 280 px 內
  有壞東西就先等。通過標準沒有改。另外無頭模式的畫面是直的（車道高約 286 px，網頁 1280×720 約 161 px），換道比實際慢，所以無頭比較難。
- 測試（修好機器人後，同一份 C 槽副本）：好機器人 肯亞 5/5、台灣 5/5、美國 5/5 都是 3 顆星、4/4 時鐘、愛心 3 顆全留；壞機器人三國都愛心掉光、0 時鐘。
  修之前：肯亞 11 次有 4 次愛心掉光、沒拿到 3 星（第一輪 5 次只有 3 次 3 星，未達「5 次至少 4 次」）、台灣 5/5 過但幾乎每局掉 1 顆愛心、美國 5/5 過。
  瀏覽器實跑（真的滑鼠操作，第 2 回合故意答錯）：肯亞 girl、肯亞 boy、台灣 girl 都跑完一局、0 錯誤。
- 截圖 `qa/kenya/`：美術總表 `art_sheet.jpg`、實跑總表 `overview.jpg`。`web/` 已換成含肯亞版的新匯出（pck 5.5 → 7.2 MB）。
- 還沒做：複製到網站 public、真 iPad、學生試玩；物品選擇、副標與 "Grab your things!" 等老師確認。

## 2026-11-20 晚：老師「照建議」小修（OPEN_QUESTIONS B4）—本機做完，未部署、未 commit、未複製到網站資料夾

- B4：`data/kenya.json` 副標改成 "Catch the school bus in Kenya!"（和台灣、美國同一句型）。其他沒動。
- 重新匯出：C 槽副本 `%TEMP%\wrt_godot\bus-dash-fix`，`--import` 兩次 → `qa_smoke.gd` → 匯出 → `web/*` 複製回來（pck 7.25 MB）。
- 無頭測試：肯亞、台灣、美國各好機器人 5/5 `QA_SMOKE_OK`（3 星、4/4 時鐘、愛心 3）、壞機器人各 1 次愛心掉光 0 時鐘。
- 瀏覽器實跑 kenya girl：4 回合、Finish、結算、0 錯誤（無頭瀏覽器慢，分數 525／1 星不代表難度）。標題畫面截圖看過：副標正確、一行放得下。截圖與總表 `qa/kenya/`。
