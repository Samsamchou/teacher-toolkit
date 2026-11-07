# Ken's Jump Island — 交接（2026-10-23 正式版候選：13 關＋美術＋學號登入）

需求：`../rdq/RDQ-spec-ken-jump-island-20261023.md`（confirmed，修訂 1：13 關＋魔王關、51 題全分配）。
灰盒版（第 1、12 關）老師 10/23 iPad 試過手感可以，之後做完全部 13 關、美術與學號登入。

## 玩法
- 3D 平台遊戲，Mario 64 式手感，造型全原創（主角 Ken、果凍史萊姆、魔王泡泡國王／雷雲大王）；**不使用任天堂任何素材、名稱或程式碼**。
- 一顆星星＝一題。碰星星 → 出這關下一題（沿用二水 3D 闖關 `quiz.gd`，答錯有提示、同一題重答）→ 答對收星，集滿過關。中途按「離開」星星會留著。
- 依序解鎖：過了前一關才開下一關（`game.gd` 的 `PREVIEW = false`；電腦測試加 `-- --unlock` 全開）。
- 魔王關：魔王血量＝題數；答對 → 魔王暈 5 秒 → 踩頭扣 1 血；沒踩到會放金色暈眩星（不用答題）。第 12 關泡泡國王；第 13 關雷雲大王走得快、壓地連放兩圈衝擊波。
- 掉落回最近的旗子；沒有生命數、Game Over、計時。13 關都過 → 外框顯示成績頁。
- 操作：iPad 左半邊浮動搖桿（推一半就全速）、右下 JUMP／LONG；電腦 WASD／方向鍵、Space 跳、Shift 跳遠。

## 13 關（`scripts/levels.gd`；第 2–11 關用 `scripts/level_builder.gd` 的模組組成）
| 關 | 題數 | 主題 | 重點 |
|---|---|---|---|
| 1 火車站島 | 4 | 草地 | 教學：單跳、二段跳、跳遠、三段跳（手工設計，灰盒驗收過） |
| 2 驛站島 | 4 | 秋天 | 踩石頭、二段跳高台、第一次移動平台、三段跳高柱 |
| 3 便利商店島 | 4 | 薄荷 | 方塊塔、長平台三段跳、跳遠、高台 |
| 4 國小島 | 3 | 草地 | 往上的台階石、史萊姆操場、高柱＋高台 |
| 5 飲料店島 | 3 | 粉紅 | 兩段移動平台、石頭、高台＋小塔 |
| 6 超市島 | 3 | 沙漠 | 連續三次跳遠 |
| 7 郵局島 | 3 | 黃昏 | 三段移動平台、轉彎 |
| 8 書局島 | 3 | 紫色 | 越疊越高的石頭、高柱＋小塔 |
| 9 大賣場島 | 3 | 藍綠 | 很多史萊姆、跳遠 |
| 10 圖書館島 | 3 | 雪地 | 高塔、移動平台、高台、石頭 |
| 11 農情館島 | 3 | 農場 | 總複習 |
| 12 水公園魔王島 | 7 | 夕陽 | 泡泡國王 |
| 13 大草原魔王島 | 8 | 暴風 | 雷雲大王（最後一關） |

題目分配沿用二水 3D 闖關 13 地點（共 51 題，每題一次）。關卡代號＝題庫 `bank.json` 的 `locations`。

## 美術與聲音
- 方塊：`assets/terrain.gdshader`（仿 Kenney 草皮＋泥土，純顏色、不用貼圖），每關配色在 `levels.gd` 的 `THEMES`。
- 裝飾：Kenney Platformer Kit 4.1（CC0，`assets/kenney/`，25 個模型＋colormap，462 KB），只放在大平台角落、避開路線，沒有碰撞。
- 音效：Kenney（CC0）；背景音樂：沿用 `quest3d/music/` 的 Suno 曲（一般關 street、魔王 boss），網頁版進關卡後才下載，答題時降音量。
- 中文字型子集：`python -I -X utf8 tools/build_font.py C:/Windows/Fonts/NotoSansTC-VF.ttf <bank.json>`（改了介面文字要重做，否則 iPad 會出現方框字）。

## 手感數值（`scripts/player.gd` 開頭常數）
參考公開文件的 SM64 參數換算（1 單位 ≈ 0.0137 m，Ken 2.2 m）。10/23 老師要求放寬：搖桿推一半就全速（`touch_pad.gd` 的 `FULL_AT`）、三段跳門檻 20→12（約 4.9 m/s）、連跳時間 0.35 秒。
實測：單跳 2.9 m、點一下 1.6 m、原地二段跳 4.5 m、三段跳 7.9 m、跑速 13.2 m/s、跑步單跳 11 m 遠、跳遠 19.9 m 遠。

## 網站（hwg5-clock-tower：`tools/escape room HWG5-U01-U02/site/public/`）
- 遊戲：`jump3d/`（Godot 匯出，不入 git）。
- 任務：`ershui-3d-quest-jump/`（`index.html`、`data.js`＝build_mission.py 產生、`cover.webp`）。**題庫共用** `../ershui-3d-quest/bank/`（玩過二水闖關的學生不必重新下載）。
- 共用外框 `shared/quest3d-app.mjs`：`start(BANK, { game, bankBase, intro, meta, clearedLabel, credits })`；不帶參數時和原本一樣（舊任務不受影響）。
- `shared/missions.mjs` 加一行（教師後台）；首頁 `index.html` 加卡片；`firebase.json` 快取規則加 `jump3d`。
- Firestore 規則不用改（`ershui-3d-quest-jump` 符合 `ershui-3d-quest(-代號)`）。本機測試網址加 `?cloud=off` 不會寫進正式資料庫。

## 指令（Godot：`C:\Users\User\Godot\Godot_v4.7.2-stable_win64_console.exe`）
```
godot --headless --path . --import
godot --headless --fixed-fps 60 --path . -- --test "--bank=G:/我的雲端硬碟/teacher-toolkit/tools/escape room HWG5-U01-U02/site/public/ershui-3d-quest/bank"
#   只跑一段：加 --only=host / --only=bosses / --only=boss13
godot --path . -- --bank=<同上> --level=3 --capture=<png> --shot=3 [--overview]   # 截圖（--overview 從上方看整關）
godot --headless --path . --export-release "Web" "../../escape room HWG5-U01-U02/site/public/jump3d/index.html"
```
`--fixed-fps 60` 讓測試比真實時間快跑（全部約 8–10 分鐘）。

## 已驗證（2026-10-23）
- 自動測試 167 項全過（含 10/23 下午修正後重跑）：51 題分配；跳躍高度／距離；觸控搖桿；第 1 關每個障礙「該用的跳法過得去、簡單跳法過不去」；**第 1–11 關共 81 段路線全部用真物理由機器人跑過**；每關幾何（星星在平台上、方塊不重疊、每顆星都在路線上）；每關答完題過關；兩個魔王戰全程；外框進度（還原、依序解鎖、作答回報、cleared、13 關後 complete）。
- 測試踩到的坑：魔王戰測試偶爾失敗是因為 Ken 被放到星星上打開題目 → 遊戲暫停；已改測試（不是遊戲問題）。
- 網站原有 27 項測試（`npm test`）全過。
- 瀏覽器：灰盒版曾實走（碰星→答題→收星）；這次因為視窗縮小、瀏覽器停止畫面更新，外框＋iframe 實走沒做成，用 Godot 內的假外框測試代替。

## 網頁實走驗證（2026-10-23 下午，老師要求「自己在瀏覽器走完 13 關」）
- 新增 `scripts/autoplay.gd`（自動闖關）：從選關畫面依序玩 13 關，**不瞬間移動**，用真物理沿路線跑跳（含等移動平台、跳遠、三段跳、踩魔王），碰星星後在題目畫面填答、按「檢查答案」「聽 Tick 說」「Go! 繼續」，每關第一題故意先答錯一次。
- 只在本機與 Firebase 預覽頻道（網址含 `--`）可用：外框網址加 `?autoplay=1`（可加 `&autoplay-level=N` 只玩一關）；**正式站 hwg5-clock-tower.web.app 一律關閉**，學生不能用來自動答題。電腦版 `-- --autoplay [--autoplay-level=N --unlock]`。
- 結果：預覽網址用測試學號 **99901** 從登入頁開始，13 關全部過關（22.9 分鐘），成績頁 94/100、51/51 題、第一次就答對 38/51、通關 13/13（13 題故意先答錯，分數正確）。清掉本機存檔、同學號重新登入 → 從雲端還原出同樣的成績頁（跨裝置續玩 OK）。
- 過程中找到並修正一個**遊戲本身的問題**：Ken 斜斜頂著牆（高柱）時會整個卡住不動（撞牆限速太嚴）。`player.gd` 改成只在真的撞牆時限速、留 3 m/s 餘裕可沿牆滑開。修正後自動測試 167 項仍全過。
- 自動闖關本身調整過的地方（不是遊戲問題）：落地後放開搖桿、依距離決定助跑速度、空中對準平台中心、二段跳先原地跳、卡住往旁邊繞、用遊戲時間計時。
- **教師後台會有一筆測試學號 99901 的紀錄**（Ken's Jump Island），可以刪掉或留著當範例。

## 部署
- 預覽頻道 `jump-graybox`（10/23 11:51 部署，到期 10/30 11:51）：首頁 https://hwg5-clock-tower--jump-graybox-7bw0qxd4.web.app/ → 「Ken's Jump Island」卡片；任務頁 `/ershui-3d-quest-jump/`。
  預覽頻道用的是**正式 Firestore**：在預覽登入的學號會寫進教師後台（測試請用 99901 這類測試學號）。
- 正式站 live 沒動（最後發布 10/22 22:57）；要老師在預覽確認後才上。
- 遊戲檔 index.pck 3.98 MB（Ken 模型＋貼圖約 3.0 MB；Kenney 25 個模型合計 < 0.3 MB）。REA 6.7.0 打不開 Godot 4.7 的 PCK v4，改用 Python 讀 PCK 目錄列出大檔。

## 待辦
1. 老師在預覽網址用學號試：登入 → 第 1 關 → 換一台 iPad 用同學號 → 進度還在；教師後台看得到「Ken's Jump Island」。
2. 確認後部署正式站（`firebase deploy --only hosting --project g6-english-online-learning --account u9431818@gmail.com`）。
3. 可選：jump3d 直接讀 `../quest3d/index.wasm`（同一顆引擎），省 7 MB 下載。

## 2026-11-11 iPad 自動跑版（第 1 關已由老師確認）
- 規格卡：`../rdq/RDQ-spec-jump-island-run-ipad-20261109.md`、`-moves-landmarks-20261110.md`、`-level1-feedback-20261111.md`。
- 自動跑關卡在 `scripts/run_levels.gd`（目前只有 station）；`game.gd` 的 `_run_intro`（載入畫面＋3-2-1-GO）、`_run_stomp`（1.5 秒內連踩）、`_pop_text`（畫面上方大字）、`_load_landmark`。
- 題庫：`tools/make_sf3_listen_audio.py`（TTS＋慢速檔）→ `tools/build_sf3_bank.py` → 網站 `ershui-3d-quest-jump/bank/`。地標：`tools/make_landmarks.py`。匯出後一定跑 `tools/patch_jump_shell.py`。
- 測試：`--runbot --level=1 --bank=<bank 資料夾> --landmarks=<landmarks 資料夾> --nolimit`，印出 load_ms、stomps、first4s_max_frame_ms。
- 勿在網頁版執行中新增音效匯流排（全部聲音會消失）。`data/` 有 `.gdignore`，素材不進 pck。
- 下一步：第 2–13 關改自動跑（建築、招牌、終點門；第 4 關起踢牆跳；12、13 關側面魔王；農情館無模型）。正式站尚未上。

## 2026-11-07 第 2–13 關自動跑版完成，已上正式站
- 規格卡：`../rdq/RDQ-spec-jump-island-levels-2-13-20261107.md`（分三批、側面魔王、慢慢變難）、`-score-items-hazards-20261107.md`（分數只顯示不送後台、水果＋寶箱、刺殼蝸牛 −50）、`-clear-screen-more-items-20261107.md`（華麗過關、蝸牛／寶箱逐關增加）。
- `run_levels.gd`：路線積木 `c_flat/c_gap/c_up/c_down/c_stones/c_slimes/c_star/c_hop/c_sign/c_wall/c_movers/c_goal/c_fruit/c_qbox/c_snail`；`_level(theme,time,place,gate,lm_h)`、`_finish` → `_fill_items`（SNAILS／QBOXES 表，第 7 關起紅殼快蝸牛，離史萊姆組 12 m）；魔王場 `_arena`（左右高牆、goal=1e9）。
- `game.gd`：`_apply_time`（7 種天色）、`_gate_custom`（終點門轉 90 度）、`_wall_help`、分數 `_gain/_hurt`＋本機最高分 `user://jump_best.json`、`_celebrate` → `_results_screen`（1–3 星 60/75/90%、NEW RECORD!）、側面魔王 `_sb_*`（泡泡國王／雷雲大王，踩頭掉星、3 題倒下 → 彩虹門）。
- 答完最後一題**不會**立刻過關，要跑到終點門（runbot 一定加 `--fresh` 才測得到）。
- runbot 參數：`--fresh --botlog --hitsnails --atx=X --goalview=N --capture=PNG --shot=s --clearshot=PATH --bossdown`。截圖總表在 `screenshots/`（jpg 不入庫，資料夾有 .gdignore）。
- 結果（--fresh）：13 關全過、0 掉落；1–11 關 46–63 秒；魔王 56／68 秒。
- **正式站 2026-11-07 已上**：用 staging `C:/Users/User/AppData/Local/Temp/ershui-4sets-stage`（加 jump3d/、ershui-3d-quest-jump/，換 index.html＋shared/missions.mjs）部署 hosting；部署前先 `hosting:channel:list` 確認 live 時間＝staging 時間。
- 待辦：老師 iPad 課堂實測（魔王難度、衝擊波、踩頭手感）。
