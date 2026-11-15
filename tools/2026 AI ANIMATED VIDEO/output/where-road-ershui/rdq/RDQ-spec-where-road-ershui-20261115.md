---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星問路句型桌上微縮動畫
domain: video
date: 2026-11-15
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: self（畫風 H 桌上微縮＋A9 字幕規則）
---

# RDQ 需求規格：Where's the ___? It's on ___ Road/Street.（二水小行星問路動畫）

## 一句話任務
把二水小行星「問路」模式的句型 **Where's the ___? / It's on ___ Road/Street.** 做成一支**桌上微縮（畫風 H）**動畫。Ken 問路，水鈴、圳寶、奶奶輪流回答，用 8 個地點，片尾加 Your turn 練習。

## 已確認
- **風格**：H 桌上微縮（1A）。
  - 桌上有一座二水迷你小鎮，建築用小行星現成的 Tripo 3D 模型。
  - 每條路漆成自己的顏色，插小路牌。
  - 鏡頭從高處俯瞰，再飛近目標建築。
  - 用 Blender 在 Colab 渲染。
- **角色**（2A）：Ken 問路，水鈴、圳寶、奶奶輪流回答。
- **地點**（3B）：精選 **8 個**。
- **片長與結構**（4C）：長版。每題問完先停 3 秒讓學生在地圖上找，再揭曉答案；片尾加 **Your turn!** 練習回合。
- 句子用遊戲原句：Where's the ___? / It's on ___ Road. / It's on ___ Street.
- 沿用老師規則：
  - 英文卡拉 OK 字幕（Comic Relief），放在最下緣，不要中文字幕。
  - 字幕版＋聽力版，各 1080p＋720p，不做手機版。
  - 先交 Google 文件故事稿，再做樣張和試片。
  - 3D 道具和動作要合邏輯，開 Colab 前報單位。

## 已採納建議
- ① 路上色、插路牌：每條路漆成它的顏色，插小路牌（Red Road／Blue Street）。
- ② Road 和 Street 分開表現：Road＝寬馬路，Street＝窄街道，路牌形狀不同。
- ③ 地點用遊戲的圖示：問句一出來，地圖上就跳出那個地點的圖示。
- ④ 片尾 Your turn：Where's the ___? 加 5 秒倒數，讓學生互相問。
- ⑤ 顏色對應固定一組，故事稿上註明（遊戲每場的顏色會變）。

## 待確認假設
- **8 個地點**（都有現成 3D 模型）：
  - train station 火車站、post office 郵局、school 學校、library 圖書館
  - hospital 醫院、bookstore 書店、supermarket 超市、museum 博物館
- **顏色對應**：8 個地點用 8 種不同顏色，Road 和 Street 各 4 條。在故事稿裡列出來給老師確認。
- **片長**約 **4 分鐘**：開場加 8 題（問句、停 3 秒、揭曉答句、鏡頭飛到建築）加 Your turn。
- **角色在桌上的呈現**：用小行星的 3D 模型（Ken、水鈴、圳寶）做成「桌上的小公仔」；奶奶沒有 3D 模型，用 2D 對話畫面或旁白框。這點在樣張時確認。
- **Colab 約 10–15 單位**（俯瞰地圖鏡頭加 8 個飛近鏡頭），一鏡一批；開機前先報單位和當天用量。
- 配音用 edge-tts 0.8 倍，Ken 和奶奶沿用 What IF 系列的聲音，水鈴和圳寶也沿用。

## 本次不納入
- 12 個地點全上。
- 2D 俯視地圖版、延續 What IF 版。

## 一段式需求規格
製作二水小行星問路動畫，畫風 H 桌上微縮：Blender＋小行星 Tripo 建築，在 Colab 渲染。

- **小鎮地圖**：桌上一座二水迷你小鎮，8 條路漆成 8 種顏色，Road 寬、Street 窄，插不同形狀的小路牌。
- **8 個地點**：火車站、郵局、學校、圖書館、醫院、書店、超市、博物館。
- **每一題的流程**：
  1. Ken 問 **Where's the ___?**，地圖上跳出那個地點的遊戲圖示。
  2. 停 3 秒讓學生在地圖上找。
  3. 水鈴、圳寶或奶奶回答 **It's on ___ Road/Street.**，那條路亮起來。
  4. 鏡頭從俯瞰飛近建築。
- **片尾**：Your turn 練習回合，出現 Where's the ___? 和 5 秒倒數。
- **字幕和輸出**：英文卡拉 OK、Comic Relief、不要中文字幕；輸出字幕版和聽力版。
- **製作順序**：Google 文件故事稿（含顏色對應表）→ 樣張（桌上小鎮俯瞰、路牌、角色公仔）→ 1 段試片 → 全片。Colab 約 10–15 單位。

## 驗收條件
- [ ] 故事稿核准：8 題問答、顏色對應表、Road／Street 各 4。
- [ ] 樣張核准：桌上小鎮看得清楚路的顏色和路牌，Road 和 Street 看得出差別，角色呈現方式可以。
- [ ] 全片：每題都看得到答案的路與建築，片尾有 Your turn；字幕版加聽力版，-16 LUFS。

## 進度紀錄
- 2026-11-15：規格卡老師確認。故事稿 v1：Google 文件 https://docs.google.com/document/d/1P_jc0FzoQzPYC8T_JptLBzido8lwkJw0S0_XxPR0VBo/edit ；本機 `script/make_story.py`（顏色對應在 ROADS）。估片長約 2:50（比假設 4 分短）。等老師看稿。
- 2026-11-15：老師要每題加一句串場、Your turn 加到 4 題（郵局、學校、書店、博物館）→ 故事稿 v2：https://docs.google.com/document/d/1ys_kcFtAGH_TkEbhFuAML3Z3JvXpBXCXsA_cf8uvRiA/edit （約 3:52）。等老師看稿。
- 2026-11-15：樣張（`src/town.py`，Colab 約 1.3 單位，餘額 75.61）：v1 過曝全白、路牌站在路口 → 燈降到約 1/5、路牌移到路的 1/4 處 → v2 `style-sample/rd_overview|figures|roadstreet.png` 交老師看。待改：俯瞰鏡頭要更近、路牌在俯瞰時要更大。
- 2026-11-15：第 1 段試片 v1 `renders/rd-trial-s01-v1.mp4`（37.5 秒；town.py MODE all＋film.js 2D 疊字）。3D 每 2 格一張（定格感），Colab 2.96 單位（餘額 72.65）。已知要改：景深太淺畫面模糊（俯瞰 f11→f32、近景→f22）、2D 小火車蓋在車站屋頂。等老師回饋再一起重渲。
- 2026-11-15：試片 v2 `renders/rd-trial-s01-v2.mp4`：光圈 f32／f22 畫面清楚、2D 小火車移到車站前方。Colab 2.31 單位（餘額 70.34）。等老師回饋。
- 2026-11-15：老師回饋（俯瞰仍模糊、地點上方要明顯圖案、字幕往上）→ RDQ Lite 1A 2A 3A＋建議全收：3D 圓形圖示牌（遊戲圖示 _2，面向鏡頭）、路牌 x1.5、俯瞰關景深、64 樣本、字幕 bottom 110px、車站改火車正面圖示。1080p 檢查圖 `renders/3d/test/rd_overview.png`、`rd_station.png` 清楚了，交老師看。待改：近景時圖示牌太大（擋畫面）、學校圖示牌頂端被切。
- 2026-11-15 晚：試片 v3 `renders/rd-trial-s01-v3(-720p).mp4`：1080p、俯瞰關景深清楚、8 個 3D 圖示牌（面向鏡頭）、近景縮小、俯瞰拉遠（學校牌不切）、字幕上移 110px。第一次整段渲被 colab exec 25 分鐘逾時殺掉（浪費 1.65 單位）→ 改 FR_RANGE 分 3 批（`work/run_trial_batches.sh`）成功。Colab 本次約 5 單位，餘額 65.36。小瑕疵：Red Road 大字蓋到學校牌、問句圖示圈蓋右上角。等老師回饋。
- ✅ 2026-11-15 晚：老師「試片其他都通過」。唯一要改：Find it! 那行字幕加上架構句 **Find it! It's on _______ _______.**（全片每題都要）。明天（11/16）做全片：s02–s11 配音、3D 8 題＋Your turn（分批 FR_RANGE，約 16–20 單位）、字幕版＋聽力版。
