---
name: whatif-situation-video
description: What IF 情境猜句動畫（總覽 A9／畫風 I）：把二水小行星／英語闖關遊戲裡的情境句（星期、天氣、時間＋問句＋答句＋線索），串成一支「What if you were ___ in Ershui?」第二人稱連續故事動畫——2D 扁平紫藍夜色（Codex 生圖＋canvas 程式動畫、卡拉 OK 英文字幕、DAY／TIME／WEATHER 大標籤、Listen!／Look! 線索停頓）為主，每段答句接一個 Colab G4 Blender 的 3D 鏡頭（小行星現成 Ken 與二水建築），輸出字幕版＋聽力版。沿用老師 2026-11-13 定案的〈What if you were Ken in Ershui?〉v2 流程（RDQ → Google 文件故事稿 → 樣張 → 1 段試片 → 全片 → 只改段落預覽 → 定案）。只要使用者提到：What IF／What if 風格動畫、情境猜句動畫、把 Ken／圳寶／水鈴的情境句做成動畫、Listen and Guess 句子做影片、二水小行星句子做動畫、Free Time 版 What if 動畫（HWG7 U03 What do you do in your free time?）、A9、畫風 I、修改 Ken in Ershui 動畫，就使用這個 skill，即使沒說出名稱。不用於歌曲 MV（2d-animations）、真人 MV 改編（mv-to-2d-animation）、雙老師教學長片（3d-teacher-lesson-video）、AI 生成短片（hybrid-ai-film、hwg-sentence-film-h3）、Phonics 故事（phonics-story-video）、剪影猜句（Free Time 猜句子影片 build.py）。
---

# What IF 情境猜句動畫（A9／畫風 I）

**範本片**：〈What if you were Ken in Ershui?〉v2，5:14，2026-11-13 老師定案。
專案 `G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI ANIMATED VIDEO\output\whatif-ken-ershui\`——先讀 `HANDOFF.md` 與 `工作流程紀錄.md`（時間軸、花費、17 條踩坑）。
本 skill 的 `assets/template/` 有全部程式（`film.html`、`film.js`、`src/`、`work/*.sh`、`gen/queue.py`＋`jobs.json`）、兩張 RDQ 規格卡、故事稿範例。

**新片**：在 `output/whatif-<片名>/` 建資料夾，複製 `assets/template/` 的內容（不要複製舊片的 audio／assets／renders），再照下面流程改。

相關：`rdq`（需求）、總覽 `tools/影片與動畫工作流總覽.md` 的 A9。記憶：`image-gen-via-codex-cli`、`no-parallel-blender-local`（Blender 只在 Colab）、`3d-character-model-checklist`、`code-animation-logical-poses`、`font-comic-relief-all-videos`、`no-phone-version-teaching-videos`。

## 字體與版面（老師規則）

- 所有英文字一律 **Comic Relief**（Bold 為主；`fonts/ComicRelief-Bold.ttf`）。
- **不要中文字幕**（老師 11/13）：影片只有英文卡拉 OK；中文句意只放在 Google 文件故事稿。
- **下方字幕放畫面最下緣**（`film.html` 的 `#kara` bottom 28px），不擋中間的建築與景物；遇到擋住主角的段落用 `cap: { x: 470, maxw: 860 }` 移到左下，或 `top: 50` 移到上方。
- 人物立牌腳底 y≈830；DAY 左上、TIME／WEATHER 右上。

## 流程（每個 ▶ 都等老師確認）

1. **先把句子拿給老師看**（老師 11/13：「我要先看到句子才有辦法回答」）：從遊戲 JSON 抽出句子，整理成表（情境／問句／答句／線索），貼在對話裡。
2. **RDQ** ▶（Full）：用哪一組或哪條路線的句子、幾個情境、主角與問的人（輪流或固定）、要不要加時間句、片長、3D 用 Colab 與否、用途（課堂投影）。規格卡 `rdq/RDQ-spec-<片名>-<日期>.md`。
3. **故事稿（Google 文件）** ▶：What if 冷開場 → 片名 → 設定 → 每個情境（問句＋線索＋答句＋串場句）→ 結尾回顧＋What if 問句。每句附中文句意、標 2D／3D。遊戲原句不改，只**加**時間句和串場句。先估片長（約 2.4 字／秒）。
4. **配音**：`src/voices.json`（edge-tts，0.8 倍＝rate -20%；Ken＝Guy +18Hz、奶奶＝Ava -25% -18Hz、圳寶＝Ana -25Hz、水鈴＝Ana、旁白＝Jenny）→ `python src/make_voice.py audio`（逐字時間給卡拉 OK；已有的跳過，逾時自動重試）。
5. **畫風樣張** ▶：Codex 生 2–3 張（片名、一段對話、卡拉 OK）。
6. **Codex 生圖**：`C:\Users\User\whatif-<片名>-work\gen\`（Codex 不能寫 G 槽）放 `queue.py`＋`jobs.json`（每筆 `out`、`refs`、`prompt`、`green`）→ `python queue.py`（最多同時 3 張，自動加畫風句與「不能有字」）→ 複製到專案 `assets/raw/` → 人物 `python src/cutout.py raw.png assets/<name>_cut.png`（只去純綠，綠衣服不會被吃）。人物要 A-pose、手掌張開（老師：握拳不能接受）。
7. **時間軸**：`film.js` 一行一個 `scene({...})`（n、asker、day、time、wx、bg、天氣特效、clue 種類、place、link 串場畫面）；秒數由配音長度自動排。檢查：`python src/render.py still 20.5 45`、`SHEET_STEP=3 python src/render.py sheet`。
8. **3D 鏡頭試渲** ▶（開 Colab 前報單位＋**當天已用量**）：`b3d_shot.py` 的 `SHOTS` 加鏡頭 → `GPU=G4 python src/colab_3d.py sXX hand 32 60`（手部特寫）、`... sXX 30,100 24 40`（試渲格）→ 自己先看手有沒有真的拿住道具。
9. **第 1 段試片** ▶：一個情境（含 1 個 3D 鏡）→ 老師看 2D／3D 接起來、角色、聲音、線索長度。
10. **全片** ▶：3D 用 `bash work/run_pershot.sh s02 s03 ...`（**一鏡一批**、渲完下載、少格重渲一次、全部完自動關 Colab；每鏡 140 格約 6 分鐘、約 0.85 單位）→ `bash work/compose.sh`（字幕版→720p→聽力版→720p）。每 6 秒抽一格總表自己先看，再傳給老師。
11. **修改** ▶：回饋用 RDQ Lite 收斂 → 只改有改的段落 → `python src/render.py preview <名稱> 53.3-59.1 76.3-88.9 …`（約 1 分鐘預覽，720p 小檔手機也收得到）→ 老師說可以才輸出全片。
12. **定案**：更新 HANDOFF、規格卡進度紀錄、總覽、記憶；給 Google 雲端硬碟網址（G 槽自動同步，預設私人；要分享先問）。

## 片子結構（老師核准）

冷開場（怪事，約 7 秒）→ 片名「WHAT IF YOU WERE / ___ IN ERSHUI?」→ 設定句（例 spring break 七張月曆）→ 每個情境：
- **問句 2D**：問的人（左）＋主角（右），問的人說話時上下輕彈；DAY／WEATHER／TIME 在念到那個字時跳出。
- **線索 2.5 秒**：畫面變暗＋Listen!（環境聲）或 Look!（兩個遊戲圖示）。老師可暫停讓學生猜。**某個線索聲聽不出來就完整播完**（`clueFile`、`clueLen`，背景音樂自動閃避）。
- **答句 3D 5.8 秒**：主角走到建築門口轉向鏡頭；字幕在最下緣（`x: 1160`）。
- **串場 2D**：旁白第二人稱（You …），把下一天接起來。
→ 結尾：最後地點的回扣畫面 → 一週回顧（11 張 3D 縮圖照星期飛入）→ WHAT A WEEK! → 片名＋大問號。
聽力版＝`--nokara`（拿掉所有字幕，大標籤與線索圖示保留）。

## 3D 規則（Blender 5.2，只在 Colab G4 跑）

- 模型：小行星 `ken_openhand.glb`＋3 張外部貼圖一起上傳（不然變粉紅金屬）；建築 `godot-ershui-planet/assets/models/bld_*.glb`（Free Time 版另有 `godot-ershui-freetime/assets/models/`）。材質 metallic 0、roughness 0.7；門口燈 `visible_glossy=False`。
- 鏡頭在主角右前方 3/4、主角在畫面左 1/3；不拍背影。
- 招牌拼錯或品牌字 → `PLATE` 蓋色板＋正確英文（老師去品牌規則）。窄店面自動加無字鄰居房子。
- **手拿道具要真的拿住**（老師 11/13）：`ARM[道具] = (上臂, 前臂, 手指方向, 掌心方向, 彎指, 拇指)`；`aim(骨頭, 方向, 掌心方向)` 會轉掌心；道具位置用 `hand_frame()` 的真實手掌座標。已驗收：信＝拇指與食指捏住一角、信露在手外；球＝單手掌心向上托在肩旁；風箏＝手掌張開夾住下方竹骨、風箏直立在身旁；傘＝握傘柄。新道具一律先渲手部特寫。
- **動作要合邏輯**：說「跑」就要跑。模型只有 walk／idle，走路動畫是原地的；放大走路會像踢腿 → 用骨頭角度做步態（`SHOTS[...]["run"]`：大腿擺 32°、收腿膝蓋折、手肘 90° 反向擺、身體前傾、腳貼地、速度由腿長算）。
- Colab：G4 常 Service Unavailable（自動重試 5 次，`GPU=L4` 可換）；exec 卡住（IDLE、0 格）每鏡最多等 25 分鐘，同一台連續卡兩次就 `python src/colab_3d.py stop` 換新機器；渲染中只用 `colab ls`／`colab status` 查，不要另外 exec。**整批多鏡不要放同一個 exec**（2 小時以上會被結束、圖全丟）。
- 花費：一天超過 30 單位要先問老師（11/13 超過沒問，要記得先加總）。

## 下一支：Free Time 版（HWG7 U03）開工要先確認

- 正式站 `https://hwg5-clock-tower.web.app/ershui-3d-quest-freetime/`；題庫 `tools/2026 REA Games/3D planet/godot-ershui-freetime/data/`：`freetime_ken_a.json`、`freetime_ken_b.json`（第一人稱 What do you do in your free time? → I ___ in my free time.）、`freetime_zunbo.json`、`freetime_shuiling.json`（第三人稱 What does he/she do…? → He/She ___s…，用 `phrases3`）。每條路線 11 題，每題有 `context`（星期、放學／週末、天氣）、`act`、`from`／`to`／`travel`、`perform`、`zh`。
- RDQ 要問：用哪條路線（或混用）、主角是誰（第一人稱 Ken 或第三人稱圳寶／水鈴）、問的人、要不要加時間句、線索用遊戲的哪一種（默劇影片＋`assets/clues/video_sfx/<act>.ogg` 音效／圖示）。
- 3D 鏡頭從「走到建築門口」改成「**做那個活動**」：`godot-ershui-freetime/assets/anims/` 有 Mixamo FBX（jogging、dribble、baseball_hit、typing、writing、sitting_laughing、sitting_idle、driving、cheering、plant_a_plant、kneeling_idle；FBX 不入庫、只在本機），骨架和 `ken_openhand.glb` 同為 mixamorig，可上傳到 Colab 匯入當 action 用。沒有的動作（騎腳踏車、吹直笛、看電視、露營…）用 `aim()` 程式擺姿勢，道具照手拿規則。Ken 的 rest pose 右手舉高——Godot 版要先轉 T-pose（`scripts/retarget.gd`），Blender 匯入 FBX 時也要先確認雙臂方向（記憶 3d-character-model-checklist）。
- 家與室內：`data/homes.json`（Ken 家＝兩樓紅磚屋 C）、`data/interior/`；室內活動可能要新的室內 3D 場景，報 Colab 單位時要算進去。

## 檔案（`assets/template/`）

| 檔案 | 用途 |
|---|---|
| `film.html` | 2D 引擎（canvas，`renderAt(t)`；字幕／HUD 是 DOM） |
| `film.js` | 時間軸範例（Ken 版全片 11 個情境） |
| `src/voices.json`、`make_voice.py` | 角色聲音＋全部台詞 → MP3＋逐字時間 |
| `src/make_sfx.py` | pop／whoosh／wind 合成、遊戲環境音裁線索 |
| `src/cutout.py` | 綠幕去背 v2 |
| `src/render.py` | still／sheet／video（`--nokara`）／preview（指定秒數段落） |
| `src/b3d_shot.py` | 3D 鏡頭（SHOTS、PLATE、ARM、hand_frame、跑步步態） |
| `src/b3d_arrive.py` | 第 1 鏡（火車站）舊腳本，參考用 |
| `src/colab_3d.py` | Colab 一鍵：開機、裝 Blender、上傳、渲染、下載、記用量、`stop` |
| `work/run_pershot.sh`、`work/compose.sh` | 一鏡一批渲染、全片字幕版＋聽力版合成 |
| `gen/queue.py`、`gen/jobs.json` | Codex 生圖佇列與 21 張圖的提示詞範例 |
| `rdq/`、`script/story-v1.html`、`HANDOFF.md`、`工作流程紀錄.md` | 規格卡、故事稿、交接與完整紀錄範例 |
