# 〈Birds〉課堂動畫交接

- RDQ（confirmed）：`rdq/RDQ-spec-birds-mv-20261105.md` — 畫風 B＋C＋E（E 3D 世界 Three.js 底＋B 電影光影＋C 灰轉彩四季主線）、五六年級、全曲 3:42、喪親段照原作、字幕版＋聽力版、KIE 飛翔 3–5 鏡先報價、2 場景試片。
- 流程：skill `mv-to-2d-animation`；3D 引擎沿用 `output/stand-out-fit-in/3d-v3/`。
- 已完成（2026-11-05）：抽音軌 `sources/birds.mp3`、歌詞 `sources/lyrics.txt`（55 句）、Whisper 兩次 `data/asr-*.json`、句首表 `src/timing.py`→`data/lines.json`、逐句抽格 `frames/contact-*.jpg`、逐句分析表 `planning/01-逐句分析表.md`＋Google 文件 https://docs.google.com/document/d/1Fb2947m3S5RAmcrq8rMHQWJ6ay8uNi4G82Tyoj4oHeQ/edit
- 老師決定（11/05）：#55 結尾＝長大的她牽著自己的小孩回到開場森林；AI 飛翔鏡＝#12、#16、#41、#53。
- 角色定裝 v1（Codex）`characters/`；15 張姿勢圖 `characters/poses/`（D13D 第一次被審查擋，改「站直平舉、不寫風吹」成功）。
- Tripo 15 個 GLB `models/`（帳本 `models/tripo-ledger.json`：生成 825 點、匯出不扣點，剩 180）；排排站檢查圖 `characters/models-lineup.png`。翅膀 WINGS 是獨立道具，裝到任何姿勢背後。
- Chrome 下載卡 .tmp 時檔案已完整：檢查 glTF 檔頭長度後直接複製（不要叫老師按）。
- 下一步：s01＋s02 兩場景試片（Three.js，沿用 stand-out-fit-in/3d-v3 引擎）。
- 版權：原曲音訊、歌詞、抽格、分析表 MD 都不入庫（本資料夾 `.gitignore`）。

## 11/05 試片 s01＋s02（等老師回饋）
- 3D 專案 `3d/`：`engine/world.js`（後製：景深、光暈、季節調色 uSat/uTint、暗角；Tripo 靜態姿勢＝換模型；天空、雲海、樹、羽毛、光點、鏡頭關鍵格）、
  `engine/player.html`（紙條字幕 Comic Relief＋中文、關鍵字紅色＋畫面上方跳字）、`engine/render.py`（`--stills` 一次抽多格）、`engine/qasheet.py`、`engine/song-data.js`（`src/gen_song.py` 產生）。
- 場景 `scenes/s01.js`（0–32.5）、`scenes/s02.js`（32.5–66）。成片 `3d/renders/Birds-3D-pilot-s01s02.mp4`（1080p 66 s）＋`-720p.mp4`（6.4 MB）；抽格 `3d/renders/qa/`。
- 渲染：`python -I render.py player.html --query scene=s01 --fps 24`（約 12–15 分鐘／場景）；全片用各場景 `*-silent.mp4` concat 再配原曲。
- 踩坑：夕陽在角色頭正後方會被光暈洗白臉 → 太陽移到側邊＋跟鏡頭的補光；跳字放 y=100 避開近景臉；
  程式錐形山太假 → 改雲海；鏡頭不能低於雲片頂（sprite 高約 size×.55/2）否則全白；正對太陽會全白 → 太陽移到畫面側邊、sunGlow .35；
  Object.assign 不能改 Three 物件 position；補光要在 camAt 之後放。
- 下一步：老師看試片 → 其餘 6 場景（s03–s08）→ KIE 飛翔 4 鏡報價（#12、#16、#41、#53）→ 聽力版（nosub）。

## 11/05 新試片 v2（老師回饋：每句要有詞義畫面、翅膀在上背部）
- RDQ：`rdq/RDQ-spec-birds-meaning-visuals-20261105.md`、`rdq/RDQ-spec-birds-story-cards-20261105.md`（都 confirmed）。
- 詞義畫面表 `planning/02-詞義畫面表.md`＋Google 文件 https://docs.google.com/document/d/1x-_7MlBqcSrOwHu_W94EyyxKQcRAfBqvrKrAMbef4uE/edit（`src/meaning.py` 產生，也產生 `3d/engine/cards-data.js`）。
- 圖卡：右上角拍立得照片（`3d/engine/cards.js`）；Codex 插圖 12 張 `3d/cards/C01–C12`（總表 `characters/cards-12.jpg`）；程式動畫目前做了 P01–P08（s01＋s02 用），P09–P15 待做。
- 圖卡出現時 camAt 自動「純平移」畫面 20%（`window.CARD_SHIFT`），角色讓出右上角；`window.FEATHER` 讓女孩胸前羽毛閃（`pendantGlow`）。跳字移到左上角。
- 翅膀：`centerPivot` 把支點移到翅膀中心，裝在上背部（媽媽 1.32 m、女孩 .9 m，後方 .11–.15）。
- 故事小調整：#4 共撐一把傘（`umbrella()`）、#11 羽毛滑落被媽媽接住。
- 成片 `3d/renders/Birds-3D-pilot-v2.mp4`＋`-720p.mp4`（6.9 MB）。
- 下一步：老師看 v2 → s03–s08（含 P09–P15 程式動畫、灰色版圖卡 cardGray）→ KIE 飛翔 4 鏡報價 → 聽力版（nosub＝無字幕無圖卡）。
- 11/05 v3：老師回饋「每句前畫面晃一秒」→ 原因是圖卡平移跟著每句縮回推出；改成**以鏡頭為單位**（camAt 找兩個 'cut' 之間的鏡頭，`window.SHOT_SHIFT(a,b)` 有圖卡就整鏡固定讓位）＋圖卡**無縫接力**（下一張緊接時和進場重疊 .32 秒）。
  規則：重渲前在換句處連抽 8 格（每格 1/24 秒）檢查動態。成片 `3d/renders/Birds-3D-pilot-v3.mp4`＋`-720p.mp4`。

## 11/05 全片 v1（s01–s08）
- s03–s08 由 3 個子代理照 `3d/planning/scene-brief.md` 製作（s03_kit.js、s05_room.js、s07_world.js 是共用小工具）；我抽格審查後 s07/s08 退修一輪。
- 新增程式圖卡 P09–P15（cards.js）；修 P10 日出、P14 鳥太小。測試頁 `3d/engine/cards-test.html?n=..&k=..`。
- 修跳字字型：player.html popWord 改 800 粗（900 沒載入，'d' 變 'a'），s01–s08 全部重渲。
- 全片：`3d/renders/Birds-3D-full-v1.mp4`（222.5 秒，1 GB，crf 20，暗場顆粒難壓）＋ `-720p.mp4`（23 MB）。總表 `renders/qa/full-v1-sheet.jpg`。
- 待老師看：同學是膠囊小人（較簡單）、s04 #28 越肩鏡頭她很小、s03 教室她偏小；之後 KIE 飛翔鏡頭報價、聽力版 nosub=1。

## 11/05 晚 V02→V04（老師看 V01 回饋，RDQ `rdq/RDQ-spec-birds-storm-chase-20261105.md`）
- s06 Bridge 照原作重寫：#39 餐廳排擠（背後笑、悄悄話、沒人同坐）→ #40 夜裡衝出門、兩人長翅膀起飛 → #41 KIE 暴風追趕（AI 鏡頭）→ #42 側面中遠景兩手快碰到 → 間奏閃電 3 下、白光後只剩羽毛 → 漸黑接 s07。
- s05：媽媽不再飛走，改成檯燈旁抱著安慰。
- 圖卡：meaning.py `CARD_OPT`（size 'tiny'＝20% 不讓位；pos 'tl'＝左上）；#7/#8/#11、#39–#42 小卡，#41 左上。
- KIE #41：`kie/seedance.py`（上限 200），480p 30.4＋720p 65.6＝96 credits；畫格 `kie/K41/f720/`，player.html 的 `AI` 陣列在 145.4–153.2 用畫格取代 3D，前後 0.15 秒暗一下（`?noai=1` 可關）。
- 全片 `3d/renders/Birds-3D-full-v4(-720p).mp4`。待老師看；之後聽力版（nosub=1）。
