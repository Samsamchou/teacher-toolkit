# 3D Planet 二水小行星・逛街版 交接（2026-10-25）

規格：`rdq/RDQ-spec-ershui-planet-stroll-20261025.md`（status: confirmed）。參考作品分析：`資料/keelung-planet-分析筆記-20261025.md`。

## 資料夾
- `godot-ershui-planet/`：Godot 4.7.2 專案（GL Compatibility）。主場景 `scenes/main.tscn`；`scripts/world.gd`（星球、路網、建築）、`scripts/game.gd`（流程、介面、聲音、存檔）。
- `web-build/`：網頁匯出（pck 23.6 MB、wasm 37.7 MB）。**尚未部署**；本機預覽：`2026 REA Games/.claude/launch.json` 的 `ershui-planet-web`（http://localhost:8791）。
- `資料/`：251 張錄影截圖、OSM 原始資料（`osm/`）、兩份查證報告、Codex 生圖（`generated-images/`）。

## 地圖怎麼來的
- 路網、建築輪廓、警察局（二水分駐所）、消防分隊、廟宇、郵局、圖書館…都來自 **OpenStreetMap**（© OpenStreetMap contributors，ODbL 1.0；上線時要在畫面標示出處）。
- `tools/fetch_osm.py downtown|southeast` 下載 → `tools/build_osm_map.py` 轉成 `data/map.json`、`data/sets.json`。
- 比例：真實 1 m → 遊戲 0.55 m；星球半徑 R = 280。市區取車站周邊 460 m；**東南街區**（二水國中、源泉國小、林先生廟）與**八堡圳公園**一帶照真實街道，但和市區的距離壓縮（真實約 2.5–4 km），用聯外道路接起來。
- 豐柏廣場、復興國小、八堡圳農情館、水心之初大草原仍是「外圈示意」（照方位放、沒有真實街道）。
- 建築外觀依 `資料/research-ershui-streetscape-20261025.md`：紅磚洋樓、洗石子公館、磁磚透天、低矮老店屋、日式宿舍、鐵皮屋；三角仔三棟紅磚洋樓、中山堂（坍塌版）、宏和醫院、第七號官舍有名牌。

## 玩法（已做）
首頁空拍 → 5–7 組＋科幻 emoji（Codex 生圖 12 款）→ 5 套題組（每套 12 站、每次順序隨機；第 1 題固定 Ken＋tea shop/post office/library/supermarket）→ 押注 → Start → 角色沿真實路網走到地點 → 猜對 +2 → 必須按「Listen 聽句子」聽完正確句子才能 Next → 結果頁。
- 右上：Map、Fast ×3、音量、Repeat、**Save 保留**、Home。首頁有「Continue 繼續上次」。存檔在瀏覽器（`user://ershui_planet_save.json`），看完結果自動刪除。
- 語音：edge-tts 0.8 倍速（`tools/make_voice.py`，37 句）。音效：Kenney CC0。音樂：Suno 原創 bgm_street。

## 驗證
- `Godot_v4.7.2-stable_win64_console.exe --path . -- --test`（可設環境變數 `SET=0..4`）：跑完整套 12 題、存檔→讀檔、截圖 `test_*.png`。2026-10-25 Set 1、Set 3 都跑完，存讀檔回到同一題、分數相同。
- 網頁版在內建瀏覽器開啟、進到第 1 題，主控台沒有錯誤。
- **沒測**：iPad 實機、教室投影、真人點擊整套、聲音實際播放。

## 吉祥物（2026-10-25 老師選 B 水鈴、核准 Tripo 點數）
- 水鈴：第一版（雙手捧鈴）自動綁骨後頭髮走路會歪 → 用 Codex 重畫 A-pose（`資料/generated-images/mascot_B_shuiling_apose.png`）再做 → `assets/models/shuiling_rigged.glb`（9614 面、walk）。
- 圳寶：`assets/models/zunbo_rigged.glb`（9748 面、walk）。題型新增 Zun-Bo, where are you going? / I'm going to the __.（機器人聲音 en-US-AriaNeural +30Hz）。
- Tripo 花費：生成 55×3、減面 35、綁骨 20×3、套 walk 動畫免費；餘額 3000 → 2740。模型在 Tripo 帳號資產裡（未改成 Private，需老師在 Tripo 手動確認）。
- 吉祥物描邊用 0.3 倍粗細（太粗會有黑線穿過頭髮）；只有 walk 動畫，停下時回到綁骨站姿。檢查場景 `scenes/mascot_check.tscn`。

## iPad
- 是 Godot 網頁版，iPad 用 Safari 開網址即可玩（不用安裝）；所有操作都是點按（押注、Start、聽句子、Next、保留），沒有拖曳或鍵盤。
- 已在電腦瀏覽器模擬 1024×768 看首頁；**未在真 iPad 測**。網頁版約 65 MB（wasm 37.7 + pck 27.4），學校網路首次載入可能要數分鐘（同 HWG5 任務經驗）。

## 待辦／待老師決定
1. 真 iPad 實測（載入時間、觸控、聲音）。
2. 2026-10-25 已部署**預覽頻道** ershui-planet（到期 11-01）：https://hwg5-clock-tower--ershui-planet-macshnp6.web.app/ershui-planet/ 。網站資料夾 `escape room HWG5-U01-U02/site/public/ershui-planet/`（複製自 web-build），firebase.json 快取規則加了 ershui-planet。部署帳號 `--account u9431818@gmail.com`。正式站 live 沒動；首頁沒加卡片。老師 iPad 驗收後才上正式站。
3. 基隆小行星沒能在內建瀏覽器實際完成任務；分析改用錄影＋網站程式註解。
## v2（2026-10-25 下午，RDQ-spec-ershui-planet-v2-modes-buildings-20261025.md）
- 第一階段：iPad 選路線修好（按鈕四種狀態都換色）、Ken 細描邊、抵達鏡頭自動找不被擋的角度＋擋住的街屋變半透明（`tools/arrival_sheet.py` 產生 21 站檢查表 `arrival_checklist.png`）。
- 六種人物模式（首頁「3. Who walks?」）：ken／zunbo(he)／yuyu(she)／mix／we／where（顏色路名：依 OSM 路名分組，同一條路整場同色；寬路 Road、窄路 Street；到達時路面變色）。語音 80 句。
- 清心福全（疑似歇業）→ **五分田-二水光化店**（光文路 82 號）。
- 第二階段：22 處建築依網路最新照片＋老師的 Google 地圖連結（只看不存）→ Codex 參考圖（`資料/generated-images/buildings/`，provenance.json 有提示詞與 SHA-256）→ Tripo（`資料/tripo-buildings-20261025.json` 有每個 task 網址）→ `assets/models/bld_<id>.glb`；中文招牌用 Label3D 疊（模型上是英文佔位字）。二水國中第一次＋免費重試都壞掉（透空走廊讓 Tripo 混亂），改畫實心版本再做成功。Tripo 餘額 2740 → 1475。
- 網頁 pck 52.1 MB（復刻模型貼圖 768）。預覽頻道已更新。
## v3（2026-10-25 晚，RDQ-spec-ershui-planet-v3-login-fixes-20261026.md）
- **首頁**：先在太空看整顆星球轉（6.5 秒，星空天空 shader `world.set_space()`）→ 俯衝到二水車站 → 接原本的街道低空飛；點畫面跳過。測試：`INTRO=1` 拍 9 張。
- **問路題**：畫面「Where's the park?  二八水水公園」（`_zh_name`，全聯／OK超商／7-ELEVEN／五分田／台灣第一味用短名），語音只念英文。
- **文法**：Street 答句改「It's on __ Street.」，`make_voice.py` 重錄 20 句 Road/Street 語音。
- **押注鏡頭**：`world.face_view()` 繞角色一圈找不被擋的方向、角色轉身面向鏡頭；鏡頭站進街屋方塊範圍也變半透明（`fade_between` 加 rect 判斷）。21 站檢查表：`資料/v3-checks/face_checklist.png`（`ARRIVALS=1` 會多拍 `face_*`，`python -I tools/arrival_sheet.py face`）。
- **個人模式**：首頁「個人／分組」。個人＝`site/public/ershui-3d-quest-planet/`（自己的外框 `planet-app.mjs`，沒動正式任務共用的 quest3d-app.mjs）→ 學號 → iframe `../ershui-planet/`。遊戲在外框裡（`window.parent.ershuiHost`）就只顯示一排句子按鈕、答對 +10、滿分 120。
  - 一輪的資料：`cleared` 存 `mode:ken`、`set:2`、`seed:123456`；`results` 存 q01–q12 對錯與題目／答案／選了什麼。遊戲用 seed 重新排出同一份題目，所以換 iPad 也能「繼續上次」。
  - 雲端：questProgress（跨裝置）＋ questAttempts（教師後台），任務代號 `ershui-3d-quest-planet`（符合既有 rules，不用改 firestore.rules）。
  - 教師後台 `teacher.js`：planet 顯示「作答／答對／答錯／模式・路線・進度」、總分滿分 120、答錯題目附「選了什麼」；**任務 data.js 讀不到時不再整個後台讀取失敗**。`missions.mjs` 加一行。
  - 測試：Godot `PERSONAL=1`（假外框，答 5 題→回首頁→繼續，`same_rounds=true`）；網站用 Firebase 模擬器（`firebase emulators:start --only auth,firestore --config firebase.emulator.json --project g6-english-online-learning`，網址加 `?emu=1`，教師帳號用模擬器 REST 建 `emu-teacher-uid-01`）：學號 99901 → 12 題 → 結果 80/120 → 後台顯示正確 → 清掉本機存檔重登，從雲端接回 Q4/12。
- **部署**：只上預覽頻道 ershui-planet（到期 11-01）。正式站沒動。
- **10/25 21:00 正式站只更新教師後台**（老師同意）：teacher.js、missions.mjs（只加 planet 一行）、ershui-3d-quest-planet/（只為了讓後台讀 data.js）。做法：先用 Hosting API 列出正式站 301 個檔、逐檔比對 sha256，在 scratchpad/live-stage 組「正式站現況＋這 5 個檔」再 `firebase deploy --only hosting`；首頁 index.html、quest3d-app.mjs 用正式站原檔，Jump Island（jump3d、ershui-3d-quest-jump）與遊戲 ershui-planet/ 仍未上正式站、首頁沒有卡片。
- 正式資料庫測試（預覽頻道、學號 99901）：Q1 真的在遊戲裡作答、Q2–Q12 用外框 report() 送；結果 80/120；清本機存檔重登從雲端接回 12 題。老師可在正式後台看到 99901 的「二水小行星逛街版」紀錄。
- 注意：上正式站時要一起上 ershui-planet/（遊戲），不然正式站的個人模式頁面 iframe 會 404。

## 正式上線（2026-10-25 21:10，老師說「部署上正式站」）
- 正式站：https://hwg5-clock-tower.web.app/ershui-planet/ （首頁選 個人／分組）；個人模式 https://hwg5-clock-tower.web.app/ershui-3d-quest-planet/
- 首頁加了卡片「二水小行星逛街版」（連到 ershui-planet/，封面 ershui-3d-quest-planet/cover.webp，取自首頁太空空拍第 4 張）。本機 site/public/index.html 也加了同一張卡（排在 Jump Island 卡片後）。
- 部署方式同後台那次：scratchpad/live-stage＝正式站現況＋遊戲資料夾＋封面＋卡片，逐檔比對後只差這 11 個檔才部署。Ken's Jump Island 仍未上正式站。

## 去品牌化＋闖關換新建築（2026-10-26，RDQ-spec-debrand-and-quest-models-20261026.md）
- 店名改通用：全聯→超市、五分田／台灣第一味→飲料店、7-ELEVEN／OK超商→便利商店、大盟書局→書店（game.gd ZH_SHOW、world.gd BLD_SIGN、map.json、build_osm_map.py）。問路題：便利商店（光文路／民族路）、超市（民生路）；兩間飲料店都在光文路，改用招牌顏色分辨：飲料店（紅招牌）／（藍招牌）。
- 模型上的品牌字樣用素色看板蓋住（world.gd SIGN_PLATE；全聯、7-ELEVEN 兩側也蓋）。檢查：`SIGNS=1 ARRIVALS=1 ONLY=id1,id2` 拍正面招牌特寫（test_sign_*）。檢查表在 `資料/debrand-checks/`。
- 修正：首頁空拍中途點按鈕，遊戲裡天空會一直是星空 → 非 fly 鏡頭一律 set_space(0)。招牌 Label3D 改單面（背面不會出現反字）。
- 二水 3D 闖關（`tools/2026 3D games/godot-ershui-quest`）改用這裡的 bld_*.glb（10 棟＋公園火車頭＋草原地景），刪掉 11 組舊模型；遊戲檔 26.9 MB（新建築底色貼圖 512）。
- 10/26 已上正式站（staging 只差 quest3d、ershui-planet、兩個任務 data.js 共 6 檔）。
