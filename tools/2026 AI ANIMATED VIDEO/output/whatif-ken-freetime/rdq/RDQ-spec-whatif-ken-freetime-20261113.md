---
rdq_version: 1
edition: chatgpt-app
task: What if you were Ken in Ershui? Free Time 版動畫
domain: video
date: 2026-11-13
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: whatif-situation-video
---

# RDQ 需求規格：What if you were Ken in Ershui?（Free Time 版，HWG7 U03）

## 一句話任務
把二水小行星 Free Time **路線 A** 的 11 題 Ken 第一人稱情境句，做成一支 What if 連續故事動畫，線索以默劇影片加音效為主，答句接 3D 鏡頭，先交 Google 文件故事稿。

## 已確認
- 句子：`godot-ershui-freetime/data/freetime_ken_a.json` **路線 A** 11 題（1A）。依序：
  - 一：study English、watch TV
  - 二：go jogging、listen to music、play the recorder
  - 三：play online games
  - 四：surf the Internet
  - 六：ride a bike、play basketball、go camping
  - 日：play baseball
- Ken 第一人稱。問句 **What do you do in your free time?**，答句 **I ___ in my free time.**；遊戲原句不改。
- 問的人：**Ken 的爸爸、媽媽輪流**（2B），新做兩個 2D 角色（Codex 生圖、A-pose、手掌張開）。
- 每個情境的順序：
  1. 問句（2D）
  2. **默劇影片 6 秒＋音效**（music 維持無聲）
  3. 停頓讓學生猜
  4. Ken 答句，接 **3D 鏡頭：Ken 在真實地點做那個活動**（3A）
- 3D 用 Colab G4 Blender，約 11 鏡，含試渲約 **12–14 單位**，**分兩天渲**。
- 每個情境**加時間句**（4A），例如 It's four thirty.，只加在影片裡。
- 沿用 Ken 版定案規則：
  - 英文卡拉 OK；**不要中文字幕**；字幕放最下緣。
  - 英文字一律 Comic Relief。
  - 輸出字幕版＋聽力版，各 1080p＋720p，不做手機版。
  - 先交 Google 文件故事稿，老師核准後才做畫面。

## 已採納建議
- ① 默劇用 720p 原檔（`3D planet/資料/freetime/clues/video/raw/`，每個活動用遊戲最後採用的那一版），放在畫面中央的舞台框裡播；框外是暗下來的 2D 背景，加 Watch! 標籤。
- ② 3D 動作盡量用 Mixamo 現成動作，在 `godot-ershui-freetime/assets/anims/`：
  - 慢跑 jogging
  - 運球 dribble
  - 打棒球 baseball_hit
  - 上網、玩線上遊戲 typing
  - 讀英文 writing
  - 看電視 sitting_laughing／sitting_idle
  - 騎車、吹直笛、聽音樂、露營用 `aim()` 程式擺姿勢
  - 道具要真的拿住，每個先渲手部特寫。
- ③ 串場句用遊戲每題的中文描述（`zh`）改寫成第二人稱英文旁白，把 11 個情境連成一個故事。
- ④ 片尾問學生 **What do YOU do in your free time?**，加 5 秒倒數，可以接口說練習。
- ⑤ 一週回顧改成 11 個默劇小格照星期飛入，最後 **WHAT A FREE WEEK!**。

## 待確認假設
- 片長約 **5 分鐘**。估算：每個情境約 25 秒（問句 6＋默劇 6＋停頓 1＋3D 5.8＋串場 6），乘 11，再加開場和結尾。
- 配音 edge-tts 0.8 倍：Ken＝Guy +18Hz（同 Ken 版）；媽媽、爸爸、旁白另選聲音，樣張時一起給老師聽。
- 冷開場沿用「早上醒來照鏡子發現自己是 Ken」，片名「WHAT IF YOU WERE KEN IN ERSHUI?」，副標「FREE TIME」。
- 室內活動（讀書、看電視、吹直笛、打電動、上網）需要 Ken 家的室內 3D 場景：先看小行星 `data/interior/` 現有的室內能不能直接用，不夠再報價。
- 3D 地點：Ken 家（兩樓紅磚屋 C）、二水國小東側門、圖書館、水心之初大草原，用小行星現有模型。
- Colab 渲染前，每次先加總當天用量；超過 30 單位先問老師。

## 本次不納入
- 路線 B、圳寶與水鈴的第三人稱路線（He／She ___s）。
- 放進遊戲當線索影片。
- KIE 新影片、Tripo 新模型。

## 一段式需求規格
製作 **What if you were Ken in Ershui?（Free Time 版，HWG7 U03）**，屬於總覽 A9 畫風 I，照 skill `whatif-situation-video`。句子用 Free Time 路線 A（`freetime_ken_a.json`）11 題，Ken 第一人稱，遊戲原句不改。

每個情境由**爸爸或媽媽**輪流問：情境句加**時間句**，再問 What do you do in your free time? 接著在舞台框裡播 **720p 默劇影片 6 秒＋KIE 音效**（music 無聲），停頓讓學生猜。然後 Ken 答 I ___ in my free time.，接 **Colab G4 Blender 3D 鏡頭**：Ken 在真實地點做那個活動，盡量用 Mixamo 動作，道具真的拿住。情境之間用遊戲 `zh` 改寫的英文旁白串場。

片子從冷開場、片名開始，經過 11 個情境，接 11 個默劇小格的一週回顧（WHAT A FREE WEEK!），最後問學生 **What do YOU do in your free time?** 加 5 秒倒數。

順序：先交 **Google 文件故事稿**（英文＋中文句意＋2D／3D 標記）→ 畫風樣張（含爸爸、媽媽角色）→ 1 段試片（含 1 個 3D 鏡）→ 全片字幕版＋聽力版。3D 約 11 鏡、**12–14 單位**、分兩天渲，每次開 Colab 前先報單位和當天已用量。

## 驗收條件
- [ ] Google 文件故事稿老師核准：11 個情境都有時間句、爸爸或媽媽的問句、默劇線索、Ken 答句、串場句。
- [ ] 畫風樣張（爸爸、媽媽角色與聲音）和 1 段試片老師核准：默劇框夠清楚、音效聽得到。
- [ ] 3D 鏡頭動作合邏輯：活動做得像，道具真的拿住，室內場景合理。
- [ ] 全片字幕版和聽力版約 5 分鐘，句子和遊戲原句一致（只多了時間句），-16 LUFS。

## 進度紀錄
- 2026-11-13：規格卡老師確認（照這份開始）。故事稿 v1：`script/story-v1.html`（由 `script/make_story.py` 產生，句子改那裡）＋Word 版 `script/Free Time 故事文字稿 v1.docx`（Google 文件連線當時出錯，先交 Word；雲端硬碟可用 Google 文件開）。估片長約 6:01（比假設 5 分鐘長；縮短選項：默劇只播前 4 秒、拿掉 2／6／7 串場句）。等老師看稿。
- 2026-11-13 晚：老師「稿子可以，做樣張」（片長約 6 分維持，不縮短）。樣張 `style-sample/`：爸媽候選 A／B、聲音候選 A／B／C、片名、默劇框、爸媽問句、第 1 段 22 秒試聽片。實際排出來全片約 6:13（3D 未渲）。默劇用 720p 原檔（遊戲最後採用版：baseball_3、basketball_2、bike_3、camping_3、english_2、games_2、internet_2、jogging_1、music_1、recorder_3、tv_3）。等老師挑角色與聲音。
- 2026-11-13 夜：老師挑媽媽 A＋爸爸 B、聲音媽媽 A（Aria）＋爸爸 A（Andrew）。11 張串場插圖與結尾一週回顧完成，2D 全片約 6:13。老師同意**明天（11/14）開 Colab** 做第 1 段試片的 3D 鏡（Ken 房間書桌＋Mixamo writing，約 2–3 單位）。
