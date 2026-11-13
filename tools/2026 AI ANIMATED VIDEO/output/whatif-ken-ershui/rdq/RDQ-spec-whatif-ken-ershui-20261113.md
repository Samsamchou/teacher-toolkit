---
rdq_version: 1
edition: chatgpt-app
task: What if you were Ken in Ershui? 一週連續故事動畫
domain: video
date: 2026-11-13
status: confirmed
telemetry:
  mode: full
  rounds: 2
  questions: 7
  q4_adopted: 5
  revisions: 0
downstream: self（總覽 A9 畫風 I）
---

# RDQ 需求規格：What if you were Ken in Ershui?（A9 第一支）

## 一句話任務
把二水小行星 Listen and Guess 的 11 句 Ken 情境句，串成一支「一週七天」的連續故事動畫（2D 為主＋抵達地點的 3D 鏡頭），先交 Google 文件故事稿。

## 已確認
- 句子來源：Listen and Guess（`3D planet/godot-ershui-planet/data/listen.json`）11 個地點**全上**（2B），有幾天去兩個地方：一 火車站＋郵局、二 學校、三 圖書館、四 診所＋書店、五 餐廳、六 公園＋飲料店、日 超市＋博物館（沿用遊戲原本的星期與天氣）。
- 兩個主角：Ken（回答）＋問的人；問的人**輪流**（1D）：圳寶、水鈴、Ken 的奶奶。
- 每個情境＝星期＋天氣＋**時間句**＋Where are you going? → Ken：I'm going to (the) ___. I want to ___.
- 時間句混用整點、半點、幾分（3C），合乎生活作息（例 It's three forty.）。
- 情境之間加串場句，連成連續故事；What if 開場、What if 問題收尾。
- 第一個產出＝**Google 文件故事稿**，老師看過才做畫面。
- 3D 鏡頭用 **Blender＋Colab G4 Cycles**（3B）。
- 用途：上課投影，先看片再玩遊戲。遊戲裡的句子不改，時間句只加在影片裡。

## 已採納建議
- ① 有頭有尾：星期一火車站出發，星期日博物館看老火車，回到 What if 問題收尾。
- ② Fly 式冷開場：前約 10 秒先演一件怪事，再出片名問句。
- ③ Google 文件每句附中文句意，並標 2D／3D 鏡頭。
- ④ 3D 只用在「抵達地點」：11 鏡 × 約 4 秒 ≈ 45 秒，其餘 2D。
- ⑤ 3D 用二水小行星現成的 Ken 綁骨模型與二水建築（不花 Tripo）。

## 待確認假設
- 片長：11 個情境＋串場，預估 **3–3.5 分鐘**（比 2–3 分鐘略長；要縮就把串場句減少）。
- Colab：3D 11 鏡約 **5–7 單位**（含試渲）；開 G4 前再報一次。
- 配音 edge-tts 0.8 倍；Ken＝Guy（童聲），問的人改成三種聲音（圳寶男童、水鈴女童、奶奶），串場旁白＝Jenny；共 5 種聲音（原假設「兩種聲音」不夠用）。
- 奶奶是新角色，**只出現在 2D**（Codex 生立牌），不做 3D 模型。
- 片中每題有約 2 秒線索（環境音或兩個圖示）再讓 Ken 回答，老師可暫停讓學生猜。
- 字幕 Comic Relief；做字幕版＋聽力版，不做手機版。

## 本次不納入
- 第一組短句（I'm／He's／She's／We're、問路）。
- 放進遊戲當線索影片。
- KIE Seedance 鏡頭、Tripo 新模型。

## 一段式需求規格
製作 **What if you were Ken in Ershui?** 連續故事動畫（總覽 A9 畫風 I：2D 扁平夜色＋視差為主，What IF 敘事），Ken 一週七天去 **11** 個二水地點（一 火車站→郵局、二 學校、三 圖書館、四 診所→書店、五 餐廳、六 公園→飲料店、日 超市→博物館），每個情境由圳寶／水鈴／奶奶輪流問「星期＋天氣＋時間＋Where are you going?」，Ken 用 Listen and Guess 原句回答（地點＋I want to…），情境之間有串場句，冷開場→片名→一週→博物館老火車→What if 問題收尾；先交 **Google 文件故事稿**（英文＋中文句意＋2D／3D 標記），老師核准後做畫風樣張→1 段試片→全片；3D 只用在 11 個抵達鏡頭，用小行星現成 Ken 與建築在 **Colab G4 Blender Cycles** 渲染（先報單位）。

## 驗收條件
- [ ] Google 文件故事稿老師核准（11 情境都有星期、天氣、時間、問句、答句、理由，串場句連得起來）。
- [ ] 畫風樣張與 1 段試片（含 1 個 3D 抵達鏡頭）老師核准。
- [ ] 全片字幕版＋聽力版，片長約 3–3.5 分鐘，句子與遊戲原句一致（除了新增的時間句）。

## 進度紀錄
- 2026-11-13：規格卡老師確認（照這份開始）。故事稿 v1 已建 Google 文件 https://docs.google.com/document/d/1vp8arioA3zCavOLGbVJ6D0BFy7ikwYTXZ1GuIUCWAMA/edit （本機 `script/story-v1.html`）。
  實際字數估算全稿約 4 分鐘（超過假設的 3–3.5 分鐘），刪 3 句「可刪」串場約 3:45，等老師決定。
- 2026-11-13：畫風樣張核准，字幕選**卡拉 OK**（英文逐字變色＋底線）。第 1 段試片 v1 老師回饋：2D 與 3D 畫面接在一起可以；奶奶長相與聲音可以；「Listen!」線索約 2.5 秒可以；**不要中文字幕**（影片只留英文卡拉 OK；中文句意只留在 Google 文件故事稿）→ v2 已改（`renders/s01-trial-v2.mp4`）。
