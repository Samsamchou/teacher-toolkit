# What if you were Ken in Ershui?｜交接（總覽 A9／畫風 I）

## 目前進度（2026-11-13）
- 規格卡（已確認）：`rdq/RDQ-spec-whatif-ken-ershui-20261113.md`
- 故事稿 v1（老師 11/13 核准）：Google 文件 https://docs.google.com/document/d/1vp8arioA3zCavOLGbVJ6D0BFy7ikwYTXZ1GuIUCWAMA/edit ；本機 `script/story-v1.html`
- 畫風樣張（老師核准，字幕選**卡拉 OK**）：`style-sample/`
- **第 1 段試片 v2**（Monday 火車站，24.6 秒，含 1 個 3D 鏡頭）：`renders/s01-trial-v2.mp4`＋`-720p.mp4`。
- **全片 v1（11/13 15:26 完成，4:59，等老師看）**：字幕版 `renders/whatif-ken-full-v1.mp4`＋`-720p.mp4`；聽力版 `renders/whatif-ken-full-v1-listening.mp4`＋`-720p.mp4`（720p 約 49 MB，傳不到手機，要在桌面版看）。
- **v2 修改（11/13 晚，規格卡 `rdq/RDQ-spec-whatif-ken-v2-fixes-20261113.md`）**：預覽 `renders/whatif-ken-v2-preview.mp4`（57 秒）老師看過後說「製作全片 v2」→ **全片 v2（5:14）✅ 老師 11/13 定案**：`renders/whatif-ken-full-v2(-listening)(-720p).mp4`。雲端：字幕版 1080p https://drive.google.com/file/d/1ICztDgfWY0lgOFo_hWErSa5ISBydLUEH/view ；聽力版 1080p https://drive.google.com/file/d/1RGOIqd-l4K2-sajOtIAJ6I6A3PvGl53s/view （目前私人）。
  - 下方字幕改到最下緣（`film.html` bottom 28px）；comic book 字幕左下（`cap: {x: 470}`）；museum 線索改播完整 `sfx/amb_museum.mp3` 18 秒＋背景音樂閃避（`F.duck`，render.py 的 volume 運算式）；全片變 5:14。
  - 3D 手勢：`b3d_shot.py` 的 `aim(bone, 方向, 掌心方向)` 會轉掌心；道具位置由真實手掌座標算（`hand_frame`）：信＝捏在食指與拇指間、托球＝單手掌心向上在肩旁（服務生）、風箏＝手掌張開夾住下方竹骨、風箏直立在旁邊。
  - 「You run and run」改成 3D 跑步鏡頭 `s03run`（164 格）：模型沒有跑步動作、走路放大會像踢腿 → 用骨頭角度程式做跑步（大腿擺 32°、收腿時膝蓋折 107°、手肘 90° 反向擺、身體前傾、腳貼地）。
  - v1 的 s02／s03／s08 3D 圖備份在 `renders/3d/_v1/`。
- 老師 11/13 回饋 v1：2D＋3D 接在一起可以、奶奶長相與聲音可以、Listen! 線索 2.5 秒可以；**不要中文字幕**（engine `SHOW_ZH = false`，zh 只留在資料裡）。

## 全片（11/13 開始，老師說「開始做全片」）
- 全片引擎：`film.html`（canvas 畫面＋DOM 字幕／HUD）＋時間軸 `film.js`（開場 → 11 個情境 → 結尾，秒數由配音長度自動排；約 4:59）。
  第 1 段試片用的舊引擎 `engine.html`＋`seg.js` 保留（`render.py --seg`）。
- 配音 39 句：`src/voices.json` → `python src/make_voice.py audio`（已有的會跳過；edge-tts 連線逾時會自動重試）。
- 音效：`python src/make_sfx.py`（pop／whoosh／wind 程式合成；線索聲＝遊戲環境音最響的 2.6 秒 `sfx/clue_<地點>.mp3`）；配樂＝遊戲 `bgm_street.mp3`（-26 dB 循環）。
- 3D 抵達鏡頭 s02–s11：`src/b3d_shot.py`（建築、天氣、道具在 `SHOTS` 表；招牌拼錯或品牌字用色板蓋住＋正確英文 `PLATE`；窄店面兩側自動加無字鄰居房子）。
  **一鏡一批**：`bash work/run_pershot.sh s02 s03 ...`（每鏡渲完立刻下載，少格自動重渲 1 次，全部完再自動關 Colab）；每鏡 140 格約 6 分鐘、約 0.85 單位。G4 開不起來時 `GPU=L4` 可換卡。
  ⚠ Colab 有時 exec 卡住（狀態 IDLE、0 格）：`colab_3d.py` 現在每鏡最多等 25 分鐘；同一台連續卡兩次就 `stop` 換新機器。
  ⚠ 不要把 10 鏡放同一批：11/13 一批跑了 2 小時 13 分，Colab 把 session 結束，VM 上的圖全沒了（白花約 7 單位）。渲染中也不要另外 `colab exec` 去查進度。
- 輸出：`python src/render.py video <名稱>`（字幕版）、加 `--nokara`（聽力版）；縮圖總表 `SHEET_STEP=3 python src/render.py sheet`。
- 綠幕去背 v2（`src/cutout.py`）：只去純綠，水鈴綠裙、圳寶青綠外殼不會被吃掉。

## 怎麼做（一段一段）
1. 配音：`src/voices.json` 加句子 → `python src/make_voice.py audio/sXX sXX`（edge-tts，產生 MP3＋逐字時間 JSON）。
2. 素材：Codex CLI（在 `C:\Users\User\whatif-ken-work\gen` 跑，Codex 不能寫 G 槽）→ 複製到 `assets/raw/`；人物綠幕去背 `python src/cutout.py`。
3. 2D 時間軸：`seg.js`（鏡頭、字幕、HUD、音效）；引擎 `engine.html`（每格只由 t 決定）。
4. 3D 抵達鏡頭：`src/b3d_arrive.py`（Blender 5.2）＋`python src/colab_3d.py sXX 0,48,96 32 50`（試渲）→ `... all 64 100`（正式）→ `python src/colab_3d.py stop`。輸出 `renders/3d/sXX/`，seg.js 用 `window.ARR3D` 接上。
5. 檢查與輸出：`python src/render.py still <秒>`、`sheet`、`video <名稱>`（1080p 24fps、-16 LUFS）；另轉 720p。

## 規則與踩坑
- 人物與字幕都在 y 835 以上；字幕框不能壓到人物（每句可設 `x`、`top`）。
- 3D：鏡頭從人物斜前方拍（不拍背影）；Ken 用 `ken_openhand.glb`＋外部貼圖（basecolor／normal／rm 要一起上傳，不然變粉紅金屬）；材質改成不金屬、粗糙 0.7；門口燈 `visible_glossy=False`（地上才不會有白色方塊反光）。
- 握傘：手指沿骨頭本地 Z 軸彎 70°（`CURL_AXIS=0,0,1`），先用 `hand` 模式出手部特寫確認。
- Colab G4 常 Service Unavailable：`colab_3d.py` 會自動重試 5 次。試渲每批約 20 秒；140 格正式渲染約 6.5 分鐘（64 樣本）。
- 背景圖是 CSS 背景，要先預載（engine 的 `bgUrls`），不然第一格是空的。

## 花費
- Colab：第 1 段 3D 鏡頭（含開機、裝 Blender、5 次試渲、2 次手部特寫、正式渲染）約 2 單位（166.41 → 164.44）。
- Colab 全片 3D（s02–s11）：一鏡一批約 9.4 單位；加上中午斷線白花約 7、試渲，11/13 全天共約 24.7 單位（166.41 → 141.67）。
- v2 修改：測試格＋4 鏡正式（含一次卡住空轉約 1 單位）約 9.6 單位（141.67 → 132.11）。
- KIE、Tripo：0。Codex 生圖 8 張（老師 ChatGPT 方案）。

## 下一步
- ✅ v2 定案（11/13）。之後要改：只重做有改的段落，3D 只重渲那一鏡（一鏡一批）。（只重做有改的段落；3D 改哪鏡就只重渲那鏡）或核准定案。
- 老師看第 1 段試片 v1 → 修改或核准 → 其餘 10 個情境＋開場＋結尾（每段約 1 個 3D 抵達鏡頭，約 0.5–1 單位）。
- 角色還要做：圳寶、水鈴的 2D 立牌（遊戲裡有參考圖 `3D planet/資料/generated-images/`）。
