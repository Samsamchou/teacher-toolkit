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
- **下方字幕離底邊 84px**（`film.html` 的 `#kara` bottom 84px＝老師 11/15 要求比舊版 28px 往上 56 px，之後所有動畫通用；可用 `window.KARA_BOTTOM` 改），不擋中間的建築與景物；遇到擋住主角的段落用 `cap: { x: 470, maxw: 860 }` 移到左下，或 `top: 50` 移到上方。
- 人物立牌腳底 y≈830；DAY 左上、TIME／WEATHER 右上。

## 共用踩坑規則（老師 2026-11-20 指定：所有動畫影片與動畫程式）
- **有動作的畫面先上網查真實姿勢**（老師 11/21）：運動、樂器、工具等動作，開工前搜尋教學資料、把檢查點寫進規格卡，照檢查點做，先給關鍵姿勢檢查圖；側身的運動不用正面人偶硬演，球要飛向目標。
- 完整清單（15 類、174 條，11/20 擴充 9–11 月全部動畫專案）：`G:\我的雲端硬碟\teacher-toolkit\tools\動畫共用踩坑規則.md`。**開工前讀和這支片有關的類別；踩到新坑當天補進那份檔案（現象 → 原因 → 規則＋出處），再把這段短版同步到 15 份影片 skill。**
- 節奏朗讀影片、語音與音訊工具（11/28，總規則第 21 類）：TTS 會真的唸錯（plays→praise、goes→those）→ small.en 複核（tiny.en 會誤聽）、老師同意才重生並加咬字提示；句中長停頓或拖長的嘶聲只剪中段；按拍子排的片裁頭尾靜音（30／50 ms）、錨點用第一個母音起音、放不進一格就重生；付費語音保守預留會擋整批 → 分批，老師同意前不跑付費預覽指令；響度拉到 −14 LUFS 要軟限幅（−3 dBFS）、寫 WAV 前先縮放，加鼓只放大鼓組；AI 音樂（Suno）速度不準要逐小節對齊，參考片配樂有版權只復刻結構；遊戲截圖用測試模式藏 UI 與浮動字；Git Bash 呼叫 API 加 `MSYS_NO_PATHCONV=1`，Windows ffmpeg stderr 用 utf-8；改共用程式後用舊正式片回歸比對；CRLF 檔用 `git -c core.autocrlf=false add`。
- 桌上微縮十站（世界作息之旅 11/21）：握拳／指東西用 `curl_hinge`、總彎度 200～230 度，拇指同時搜對掌＋外展到貼中指（≤1.2 mm）；長柄餐具握柄上翹約 20 度、印手肘／手腕對肩高；道具放手肘前方、手腕扭 >90 度會出皮膚尖刺；每格所有骨頭的旋轉、位置、縮放都打關鍵影格；道具和載具照主角身高定比例；看檢查圖先確認是這一批的；字幕全景放下方（蓋腳就離底 100 px）；響度量成片；部署前看線上最後一次發布、逐檔比對、只部署 hosting。
- 地圖動畫（kaz-map-animation 11/22）：skill 不可改、不入庫；交通工具要沿路線走（每格一個只活一格的 icon）；飛機圖示機頭朝左；跨 180 度經線的國家要另給平移外框才會上色；飛行短片不顯示本站時間（?:??）；字幕另疊 Comic Relief；長旁白用 edge-tts WordBoundary；詳見共用踩坑規則 §17。
- 動作鏡頭（11/21 動詞片）：KIE 720p 是重新生成，拍好要重新抽格量事件秒數；要出現的東西寫「全程在畫面裡」、鏡頭寫 LOCKED-OFF；字卡放在動作不經過的角落；畫面上移補底邊用素色不拉長；子代理等第一段通過才分、不准花錢、各用自己的 ledger。
- 動作先查真實做法再擺：拿東西、握筆、樂器、騎車、球類先查、寫成表（哪隻手／手心朝向／拇指位置／接觸點／怎麼到嘴）；左右手是鏡像（Mixamo `PALM_SIGN` 右 −1、左 +1）；動詞照字面演；每個效果要有起因（碰到才動、接觸成立才算完成），接觸用數字驗（手到物 ≤2 cm、輪胎 ±1 cm、2D 0–1 px）。
- 人物不浮、不陷、不背對：量真實地面（3D `ground_z`；2D 新背景先疊格線量地面）；坐姿大腿蓋住椅墊、小腿在椅面前垂下（椅面＝膝高 − 大腿厚度）；說話時身體不上下彈（只留約 3 px 呼吸；What if 系列例外，問的人說話時輕彈）；手和道具不擋臉；車頭朝前進方向、騎乘用坐姿；鏡頭在主角右前方 3/4。
- 檢查圖先交：第一批固定有手部特寫（兩角度、不開景深）與腿部鏡頭；3D 鏡頭先交特寫檢查圖、2D 每段先出 4×4 總表；動作的開始／中間／結束都抽格，原尺寸放大看手和頭頸。
- 對嘴依畫風：AI／點陣角色不用程式畫嘴（生同角度張嘴圖、只貼回嘴部小塊）；全向量剪紙可程式嘴；精準對嘴用 wav2vec2 強制對齊（edge-tts 逐字時間早約 0.16 秒）；說話句用中景；歌曲片對嘴原曲、不另配 TTS。
- 配音：顯示文字和送 TTS 的文字分開（`TTS_FIX`），台詞不放「／」和音標；發音教學只用老師錄音或 Wikimedia；edge-tts 60 秒逾時＋重試 10 次；已變速的音檔不再變速；whisper 只抓時間，字幕照劇本，念錯與否給老師聽。
- 生圖：Codex CLI prompt 走 stdin（`codex exec ... -s workspace-write -i ref.png - < prompt.txt`），先輸出到 C 槽再複製，同時最多 3 張；圖上不放字（字、國旗、月曆用程式疊或 Commons SVG）；付費 API 先報價、老師同意上限。
- AI 短片：H3 照明只寫正向描述、要避免的東西連字都不寫；Seedance／KIE 只寫身體動作與空手、另列不准出現的東西、鏡頭固定；多出的片長用剪的不重生；KIE 先 480p 試 1 鏡，錯誤碼看 body 的 `code`。
- Blender：用座標改模型前 `view_layer.update()`；材質色是線性色彩；`transform_apply(location=False, rotation=False, scale=True)`；拼接物件合成單一網格（Freestyle 才不閃）；Tripo 家具黏住就換程式家具；Tripo 抓檔先 `--mark` 再按 Export、用三角面數核對；>15 萬面先 predecimate＋`use_persistent_data`；燈光換場景重調。
- Colab：Blender 只在 Colab；exec 只跑立刻返回的指令、渲染用分離執行、每 50 秒短 exec 保持連線、一鏡一批、渲完立刻下載；先建資料夾再上傳、上傳前 `ast.parse`；給老師看之前先停機；開機前報預估、做完報實際；不手改 `colab_usage.log`。
- 合成：不用 `-shortest`（先接無聲畫面再配完整音軌＋`apad`）；ffmpeg 9.0.1 不用 `-loop 1`、不用 `drawtext`、加 `-nostdin`；舊 .ogg 用 soundfile 解碼；配樂說話時比人聲低 18 dB、無配音段 1/4、整片 −16 LUFS（有閃避的混音不用 loudnorm）；前一句字幕早 0.2 秒結束；重點物件不放畫面下方 1/4。
- 交件：分鏡 → 試片 → 全片，每關等老師；改版只重做改到的段落、先交段落預覽、定案資料夾不動；聽力版只拿掉卡拉 OK 字幕；只交 1080p＋720p（720p 維持原畫質，不為 30 MB 壓縮）；自己先抽格，把可能被抓的地方先說出來，附用量與未驗證項目。
- 檔案：大量 PNG／影格／建置放 C 槽暫存，不放 G 槽；用腳本改字串先 `assert count == 1`、改完 `ast.parse`；不用 heredoc 寫程式；反斜線路徑會被吃成 tab 或響鈴字元，寫完讀回檢查。

## 流程（每個 ▶ 都等老師確認）

1. **先把句子拿給老師看**（老師 11/13：「我要先看到句子才有辦法回答」）：從遊戲 JSON 抽出句子，整理成表（情境／問句／答句／線索），貼在對話裡。
2. **RDQ** ▶（Full）：用哪一組或哪條路線的句子、幾個情境、主角與問的人（輪流或固定）、要不要加時間句、片長、3D 用 Colab 與否、用途（課堂投影）。規格卡 `rdq/RDQ-spec-<片名>-<日期>.md`。
3. **故事稿（Google 文件）** ▶：What if 冷開場 → 片名 → 設定 → 每個情境（問句＋線索＋答句＋串場句）→ 結尾回顧＋What if 問句。每句附中文句意、標 2D／3D。遊戲原句不改，只**加**時間句和串場句。先估片長（約 2.4 字／秒）。
4. **配音**：`src/voices.json`（edge-tts，0.8 倍＝rate -20%；Ken＝Guy +18Hz、奶奶＝Ava -25% -18Hz、圳寶＝Ana -25Hz、水鈴＝Ana、旁白＝Jenny）→ `python src/make_voice.py audio`（逐字時間給卡拉 OK；已有的跳過，逾時自動重試）。
5. **畫風樣張** ▶：Codex 生 2–3 張（片名、一段對話、卡拉 OK）。
6. **Codex 生圖**：`C:\Users\User\whatif-<片名>-work\gen\`（Codex 不能寫 G 槽）放 `queue.py`＋`jobs.json`（每筆 `out`、`refs`、`prompt`、`green`）→ `python queue.py`（最多同時 3 張，自動加畫風句與「不能有字」）→ 複製到專案 `assets/raw/` → 人物 `python src/cutout.py raw.png assets/<name>_cut.png`（只去純綠，綠衣服不會被吃）。人物要 A-pose、手掌張開（老師：握拳不能接受）。
7. **時間軸**：`film.js` 一行一個 `scene({...})`（n、asker、day、time、wx、bg、天氣特效、clue 種類、place、link 串場畫面）；秒數由配音長度自動排。檢查：`python src/render.py still 20.5 45`、`SHEET_STEP=3 python src/render.py sheet`。
8. **3D 鏡頭試渲** ▶（開 Colab 前報單位）：`b3d_shot.py` 的 `SHOTS` 加鏡頭 → `GPU=G4 python src/colab_3d.py sXX hand 32 60`（手部特寫）、`... sXX 30,100 24 40`（試渲格）→ 自己先看手有沒有真的拿住道具。
9. **第 1 段試片** ▶：一個情境（含 1 個 3D 鏡）→ 老師看 2D／3D 接起來、角色、聲音、線索長度。
10. **全片** ▶：3D 用 `bash work/run_pershot.sh s02 s03 ...`（**一鏡一批**、渲完下載、少格重渲一次、全部完自動關 Colab；每鏡 140 格約 6 分鐘、約 0.85 單位）→ `bash work/compose.sh`（字幕版→720p→聽力版→720p）。每 6 秒抽一格總表自己先看，再傳給老師。
11. **修改** ▶：回饋用 RDQ Lite 收斂 → 只改有改的段落 → `python src/render.py preview <名稱> 53.3-59.1 76.3-88.9 …`（約 1 分鐘預覽，720p 小檔手機也收得到）→ 老師說可以才輸出全片。
12. **定案**：更新 HANDOFF、規格卡進度紀錄、總覽、記憶；給 Google 雲端硬碟網址（G 槽自動同步，預設私人；要分享先問）。

## 片子結構（老師核准）

冷開場（怪事，約 7 秒）→ 片名「WHAT IF YOU WERE / ___ IN ERSHUI?」→ 設定句（例 spring break 七張月曆）→ 每個情境：
- **問句 2D**：問的人（左）＋主角（右），問的人說話時上下輕彈；DAY／WEATHER／TIME 在念到那個字時跳出。
- **線索 2.5 秒**：畫面變暗＋Listen!（環境聲）或 Look!（兩個遊戲圖示）。老師可暫停讓學生猜。**某個線索聲聽不出來就完整播完**（`clueFile`、`clueLen`，背景音樂自動閃避）。
- **答句 3D 5.8 秒**：主角走到建築門口轉向鏡頭；字幕在下方（`x: 1160`）。
- **串場 2D**：旁白第二人稱（You …），把下一天接起來。
→ 結尾：最後地點的回扣畫面 → 一週回顧（11 張 3D 縮圖照星期飛入）→ WHAT A WEEK! → 片名＋大問號。
聽力版＝`--nokara`（拿掉所有字幕，大標籤與線索圖示保留）。

## 3D 規則（Blender 5.2，只在 Colab G4 跑）

- 模型：小行星 `ken_openhand.glb`＋3 張外部貼圖一起上傳（不然變粉紅金屬）；建築 `godot-ershui-planet/assets/models/bld_*.glb`（Free Time 版另有 `godot-ershui-freetime/assets/models/`）。材質 metallic 0、roughness 0.7；門口燈 `visible_glossy=False`。
- 鏡頭在主角右前方 3/4、主角在畫面左 1/3；不拍背影。
- 招牌拼錯或品牌字 → `PLATE` 蓋色板＋正確英文（老師去品牌規則）。窄店面自動加無字鄰居房子。
- **手拿道具要真的拿住**（老師 11/13）：`ARM[道具] = (上臂, 前臂, 手指方向, 掌心方向, 彎指, 拇指)`；`aim(骨頭, 方向, 掌心方向)` 會轉掌心；道具位置用 `hand_frame()` 的真實手掌座標。已驗收：信＝拇指與食指捏住一角、信露在手外；球＝單手掌心向上托在肩旁；風箏＝手掌張開夾住下方竹骨、風箏直立在身旁；傘＝握傘柄。新道具一律先渲手部特寫。
- **握筆（老師 11/14，照職能治療的「動態三指握筆」）**：拇指與食指指腹捏住筆尖上方約 2.5 cm、中指在下托、無名指小指收向掌心；虎口圓弧、筆桿斜靠虎口約 50° 指向**右肩**（不指臉）；手以小指側放在紙上（不是整個手掌貼紙）。做法：`b3d_act.py` 先定筆的位置與角度，再用 `ccd()`（逐指 IK）把拇指、食指、中指指尖移到筆上的目標點；Ken 手臂比 X Bot 短，寫字時手只到大腿高度 → `lift` 把上臂往前抬（右 24°、左約 13°）；左手 `set_hand` 掌心平放壓住書；桌面＝最低指尖高度但一定高於大腿。手部特寫兩個角度（`hand`、`hand2`）都要看。
- **吹直笛（老師 11/14，查過正確持笛法）**：左手在上（拇指按背面拇指孔，食指、中指、無名指指腹按正面 1–3 孔）、右手在下（食指到小指按 4–7 孔，拇指在背面 4、5 孔之間托住）；從正面看到的是兩手手背，**手指橫放在直笛正面、微彎不握拳**；直笛與身體約 45°；手肘自然下垂略外張。做法：`recorder_pose()`——指節放在孔外側一個手指長、手腕再往外一個手掌長，手臂用 `two_bone()`（解析式兩段 IK，手肘朝下）到位，再用 `ccd()` 把每根手指指腹移到孔上。不要把手腕放在直笛旁邊再彎手指（會變成握棍子的拳頭）。
- **Free Time 版（HWG7 U03）11/14 全片 v2 定案**（`output/whatif-ken-freetime/`，6:13，11 個 3D 鏡頭）。
- **Free Time 版 v1 → v2 老師 5 項回饋（11/14）與做法**（程式在 `output/whatif-ken-freetime/src/b3d_act.py`）：
  - 握筆：筆線由手掌座標直接定（虎口 → 捏點 → 紙面，`tripod_geom`），不要從手指反推；Ken 拇指短，量到搆不到就把筆往虎口移（印出指尖到筆軸的距離確認 ≤1 cm）。
  - 坐沙發／椅子：腿用 `two_bone` 把腳踝固定在地上（`sit_feet_floor`），座墊前緣放在整段動作裡膝蓋與小腿的後面；腿絕不能穿過家具。
  - 騎腳踏車：車架照 Ken 的腿長、手臂長設計（`bike_setup`）：五通在髖關節前下方、踏板角度遞增＝往前踩、車把經龍頭接到前叉；車輪、曲柄、踏板用 `keyed_prop` 轉動並掛在 `RIG` 下。
  - 運球：手臂 IK 跟著球（`dribble_pose`），推球與接球兩段手掌貼球，球放在身體右前方、避開大腿；先印肩、髖、膝座標再選位置。
  - 揮棒：球棒沿下手（左手）掌心橫向，上手用 IK 握上去且從前臂方向包住握把（手腕不折）；來球方向＝站姿時左肩指的方向（投手），擊球點在球棒甜蜜點；揮完用 `clip_end` 停住，不跑。
  - 驗收流程：`python src/colab_3d.py <鏡> cu 24 50` 渲多角度特寫 → `work/make_check_sheet.py` 做一張有中文標題的檢查圖給老師 → 通過才正式渲 → 只含修改鏡頭的預覽片 → 通過才合成全片。
  - 用腳本改程式時，替換的錨點要先確認只出現一次（`assert s.count(a) == 1`），不然會刪錯一大段。
- **動作要合邏輯**：說「跑」就要跑。模型只有 walk／idle，走路動畫是原地的；放大走路會像踢腿 → 用骨頭角度做步態（`SHOTS[...]["run"]`：大腿擺 32°、收腿膝蓋折、手肘 90° 反向擺、身體前傾、腳貼地、速度由腿長算）。
- Colab：G4 常 Service Unavailable（自動重試 5 次，`GPU=L4` 可換）；exec 卡住（IDLE、0 格）每鏡最多等 25 分鐘，同一台連續卡兩次就 `python src/colab_3d.py stop` 換新機器；渲染中只用 `colab ls`／`colab status` 查，不要另外 exec。**整批多鏡不要放同一個 exec**（2 小時以上會被結束、圖全丟）。
- 花費：開機前報預估、做完報實際用量、渲完即關機（老師 11/14：每日可以超過 30 單位）。

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
