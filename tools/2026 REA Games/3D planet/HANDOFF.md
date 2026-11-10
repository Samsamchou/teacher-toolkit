# 3D Planet 二水小行星・逛街版 交接（2026-10-25）

> **做下一個地點（例：彰化市）先讀 `新地點小行星製作手冊.md`**；完整踩坑在 `工作流程與踩坑紀錄.md`（第四節＝v4）。Colab 3D 模型腳本：`godot-ershui-planet/tools/colab_hy3d/`。

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

## v4 真實二水街屋＋Listen and Guess（2026-11-08，RDQ-spec-ershui-planet-real-streets-listen-guess-20261108.md，confirmed rev 2）
- **街屋清冊**：`資料/街屋清冊-初稿-20261108.md`（網路查證，約 80 筆）；程式版 `godot-ershui-planet/tools/shops_ershui.py`（48 家店＋8 棟新地標，用門牌在 OSM 同名道路上內插位置；連鎖用通用名、住家不放名字門牌）。光文路 82 號是五分田（遊戲顯示「飲料店」）；清心福全已收。未放進去的 5 家：自行車出租、霖園茶業、水煎包麵線、雪莉髮型、阿添切仔麵（那一段太擠）。
- **地圖**：OSM 重新下載 `資料/osm/ershui-downtown-20261108.json`（範圍往北放大）；`build_osm_map.py` RAD 460→600；OSM 沒畫到的店面補 5 m 寬店屋（14 棟），4 條主要街道（光文路、員集路三／四段、惠民路）空著的臨街面補一般透天（231 棟）。建築 550→863。
- **2.5D 店面**：`tools/make_storefronts.py` 畫 24 種店內圖（`assets/textures/storefronts.png`）；`world.gd` `_shopfront` 貼在店家一樓＋亭仔腳招牌＋真店名（Label3D）；店面和店名跟著方塊一起淡出（`_show_shops`）。
- **8 棟新地標**（亞洲旅社、詹貴賓牙醫、德成百貨行、美珍鞋坊、恩生診所、二水鄉農會、安德宮、水餃店）：Codex 參考圖 `資料/generated-images/buildings-v4/` → Colab G4 **Hunyuan3D-2**（每棟約 1 分鐘；腳本在 scratchpad/hy3d：要 `transformers==4.48.3 diffusers==0.31.0 huggingface_hub<0.30`，而且要用 subprocess 另開 python 跑，不然 Jupyter kernel 的 Pillow 舊版衝突）→ `tools/shrink_glb_texture.py`（2048 PNG→512 JPEG、調亮 1.15；3.6 MB→0.6 MB）→ `assets/models/bld_<id>.glb`；原檔在 `資料/hy3d-models/`。Tripo 帳號只剩 140 點，老師選 Colab。
- **首頁空拍**：改沿光文路 車站→亞洲旅社→牙醫→德成→鞋坊→員集路…（`_build_fly_route`）。
- **Listen and Guess**（首頁第 7 種模式，要學號）：外框 `site/public/ershui-3d-quest-planetlisten/`（`listen-app.mjs` 題目面板：選擇／拖放（五處可挖、挖 3 格、一定挖地點、學校句沒有 the → the 當干擾字）／口說（不顯示答案句、AI 總分 80 以上才可揭曉、連 2 次未滿出「句型示範」嗶聲蓋地點、AI 連 2 次失敗改選擇題）；任務代號 ershui-3d-quest-planetlisten，missions.mjs 已加）。遊戲 `game.gd` `_listen_question`／`_host_ask`／`_poll_host`／`play_amb`；情境 `data/listen.json`；語音 `tools/make_listen_voice.py`（Ken＝Guy +18Hz，學生答句＝AnaNeural）；環境音 `tools/make_ambience.py`（KIE Suno Sounds 每層 2.5 點，分層生成再疊，重點聲 -16、背景 -36；老師選定 `資料/ambience/final/`：診所／餐廳／飲料店用 B）。測試：`PERSONAL=1 LISTEN=1 --test`；網頁 `?fakeai=1`（只在 localhost／預覽網址）。
- **口說 AI**：老師選 B＝在 g6-english-online-learning 自建（和 hwg5-su-to-u04-story 同做法：Firebase AI Logic、gemini-3.7-flash、reCAPTCHA Enterprise App Check）。11/08 已開 API（recaptchaenterprise、firebaseappcheck、firebasevertexai、aiplatform）、建 reCAPTCHA 金鑰 6LdUgxUu…（只允許 hwg5-clock-tower.web.app／firebaseapp.com／ershui-preview）、註冊在 web app 1:738830028920:web:01690c8e…、AI Logic（服務名 firebaseml.googleapis.com）App Check **ENFORCED**。**真麥克風還沒測**（要老師 iPad）。
- pck 52→66 MB。只上預覽 ershui-preview；正式站未動。
- KIE 花費：環境音約 117 點（8970→8853）；Colab 約 8 單位。

### v4 續（2026-11-08 下午）
- **位置修正（老師指出）**：亞洲旅社＝光文路便利商店（OK，9 號）隔壁往車站方向第 3 間（`rel`）；詹貴賓牙醫、德成百貨行移到亞洲旅社那一側（`reldoor`：從便利商店門口沿店面線往三角仔 6.5／11.5 遊戲 m）；恩生診所＝7-11（員集路四段 8）隔壁、退到路邊不壓馬路；兩家飲料店（teatop、tea2）與水餃店：沿街位置不變、拉到路邊（`FRONT_FIX`／`snap`）。地標一律 `lm`：不吸附到旁邊大建築、底下房子拿掉。
- **二水國小重建**（RDQ `rdq/RDQ-spec-ershui-elementary-rebuild-20261108.md`，confirmed rev 2，老師驗收「可以」）：真實大小、OSM 校界與 7 棟校舍輪廓；配置圖 `資料/school-layout-check-20261108.png`（v3）。南教學大樓＝紫紅磚主樓（拱窗、轉角塔），北教學大樓＋行政大樓＝米白 L 形；群育館＝Colab 模型 `bld_school_gym`（亮度 1.45）；跑道由程式找「離每棟校舍 ≥1.5 m、在校界內」最大的（約 109×58 m，老師：群育館不可以跟操場重疊）；司令台、球場、樹、大老樹、正門圓環。**西門＝明德橋靠校園那端**（有時鐘柱的校門是這座，Colab `bld_school_gate`，高柱直寫「二水國民小學」，GATE_PILLAR）；光文路正門＝一般門柱；不畫進校紅線。明德橋程式畫（矮牆＋不鏽鋼欄杆＋橋名牌＋紅磚廣場），因為模型的路和圳對不上真實位置。school 地點 kind="campus"、門口＝明德橋。研究 `scratchpad/school/research.md` 的重點已寫進規格卡。
- 測試：`CAMPUS=1 --test`（4 張俯瞰＋2 張西門特寫）；`ARRIVALS=1` 測試前先設 cam_up（之前截圖歪是測試問題，不是遊戲）。
- pck 68 MB；只上預覽 ershui-preview。Colab 今天合計約 10 單位。
- 2026-11-08 口說題修正（RDQ `rdq/RDQ-spec-listen-speak-fix-20261108.md`）：iPad 無法評分＝Safari 錄出 MP4 直接送 Gemini 被拒 → `listen-app.mjs` `toWav16k`（按錄音時建立 AudioContext、解碼、單聲道、16 kHz PCM WAV，照故事站）。最多錄 5 次、第 5 次仍未滿 80 才改選擇題；AI 沒回應／太短沒聲音不計次，AI 連 3 次沒回應才改選擇題；畫面「第 n／5 次」。電腦測試：遊戲語音 MP3 → WAV → AI 回 95 分、逐字正確。待老師 iPad 實測。
- 2026-11-08 題型比例（RDQ `rdq/RDQ-spec-listen-type-mix-20261108.md`）：每回合固定 4 口說＋2 拖放＋2 選擇，隨機分到 q01–q08；表存在 progress 的 cleared `types:sdcs…`（不用改 firestore.rules），換裝置繼續上次也一樣。預覽實測：一輪 4／2／2、重新登入後題型相同（測試學號 99906）。
- 2026-11-08 晚：環境音 v2 18 秒版（`tools/make_ambience_v2.py`：重點聲音拉長，餐廳吃東西／飲料店吸飲料各 8 秒、無中文句；學校程式合成西敏寺鐘 4 句；研究 scratchpad ambience_research.md）老師「全部可以，選 A（聽完 18 秒才出題）」；錄音時遊戲靜音（mute／unmute）；公園 Ken 陷進模型修好（門口推到模型外）。
- **2026-11-08 正式上線**（老師說「直接部署正式站」）：live 上次 11/07 14:08＝staging（C:/Users/User/AppData/Local/Temp/ershui-4sets-stage），只換 ershui-planet/（pck 69,380,000）、新增 ershui-3d-quest-planetlisten/、shared/missions.mjs（加 planetlisten 一行）後 deploy hosting（370 檔）；npm test 36/36；讀回全部 200；正式網域 AI 評分有回應。規則（firestore.rules）沒動。

## Free Time 版兩種玩法（2026-11-10，Ken A 路線 11 題；`godot-ershui-freetime/`）
規格：`rdq/RDQ-spec-freetime-planet-hwg7u03-20261109.md`（rev 1–3）。**尚未部署**（老師自己上預覽頻道）。
- **猜地點題組已移除**（game.gd 重寫；`data/sets.json`、`data/listen.json` 刪除；舊語音 a_/q_/listen_ 用匯出排除）。保留街道、學校、空拍、聲音、存檔、外框。
- 題目資料：`data/freetime_ken_a.json`（11 題情境、選項、答案、from/to、移動方式 walk/jog/bike、演出 indoor:/out:）。
- **每題一步一步解鎖（老師 11/10）**：① 按 ▶ Play 聽情境（不自動播，iPad 聲音從按鍵那一下開始；聽完一次才解鎖，可重聽）→ ② 線索（只有兩人一組；按 ▶ Clue 才播；音效／影片播完、3 張圖都出來、動畫播完才解鎖作答，可 Again）→ ③ 作答 → ④ Ken 演出。鎖住的區塊變灰＋「Listen first」提示。
- **A 全班分組猜猜看**（首頁左鍵，不登入）：4–8 組（預設 6）＋圖示；押注規則＝每組先 10 分，每題選 A/B/C 並押 1/2/3 分，答對＋押分、答錯－押分（最低 0，不能押超過手上分數）。揭曉：Ken 從出發地走／跑／騎到地點做活動；室內進門才載入 Ken 的家（姿勢＝home_check 驗收版）。11 題後排名＋Ken 雙手高舉（Mixamo Cheering）＋彩帶。存檔 `user://ershui_freetime_save.json`。不出現線索。
- **B 兩人一組線索挑戰**：外框 `escape room HWG5-U01-U02/site/public/ershui-3d-quest-freetime/`（兩人學號連打 10 碼，例 6010160126；兩人各寫一份 questAttempts＋questProgress；選擇 3／拖放 3／口說 5，口說沿用 Listen and Guess：錄音靜音、最多 5 次、16 kHz WAV、≥80 分；兩人輪流說）。missions.mjs 已加一行（本機）。遊戲 iframe `../ershui-freetime/`。線索每題一種（音效 3、3 icons 3、無聲影片 3、程式動畫 2，seed 洗牌）。
- 室內姿勢：`scripts/pose_bake.gd`（繼承 home_check.gd，不改它）把 6 個驗收姿勢＋道具烤成 `data/interior/`；Mixamo 動作烤成 `assets/anims/baked/ken_*.res`（遊戲與網頁不需要 FBX）。重烤：`Godot --path . res://scenes/pose_bake.tscn`。play online games＝surf 姿勢＋戴耳機。
- 程式動畫線索：`scripts/clue_anim.gd`（11 個無字黑白小動畫，6 秒一輪）。線索素材：`tools/make_freetime_assets.py`（edge-tts 語音 ft_*.mp3＋icons 縮 256＋音效＋影片轉 Theora .ogv，Godot 不能播 MP4）。
- 測試：`--test`（A 整回合）、`PAIR=1 --test`（B 假外框）、`CLUEANIM=1 --test`（11 張動畫）、`ONLYQ=n` 只跑第 n 題；截圖在 `test_shots/`；印 `LOCKCHECK` 驗證鎖。檢查表：`python -I tools/modes_sheet.py` → `資料/freetime/modes-check-v1.png`。網頁自動測試：外框網址加 `?fakeai=1&cloud=off&autotest=1`（只在 localhost）。
- **11/10 晚驗收（第 3 個 agent）**：自動測試加了真正的斷言（`_check`，結尾印 `TEST SUMMARY`，有失敗就 exit 1）：A 整回合 72/72、B 整回合 78/78（每題：聽完前選項／押注／線索鎖住、Start 要全部組押完、線索播完才開作答、分數照押注規則、室內在家裡演、Next 要先聽答案句、最後排名＋Cheering）。跟拍鏡頭一片黑已修（見踩坑）。home_check 24 張逐像素相同。網頁版 Playwright 測試腳本在當次 scratchpad（未入庫），外框 `?fakeai=1&cloud=off&autotest=1`。真的口說 AI 0 次（App Check 只允許正式／預覽網域，本機只能假 AI）。
- 網頁匯出：`web-build-freetime/`（export_presets 改了路徑，**不會再蓋到二水小行星的 web-build/**），並複製到 `site/public/ershui-freetime/`。
