---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星 v2：六種人物模式、建築復刻、抵達鏡頭
domain: dev
date: 2026-10-25
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: godot-games
---

# RDQ 需求規格：二水小行星 v2

## 一句話任務
修正 iPad 試玩問題，加入六種人物／句型模式，並依網路最新樣貌復刻所有會去的地點建築。

## 已確認
- 修正：Set 2–5 在 iPad 選不到；Ken 描邊太粗；抵達時看不到人物與整棟建築（22 站逐一檢查）。
- 建築：所有會去的地點（約 22 處）依網路最新照片復刻（**1B**：只看不存照片 → Codex 參考圖 → Tripo 建模）。
- 首頁流程：選組＋圖示 → **選人物模式** → 選路線（5 套都可用）。六種模式：
  1. Ken：Where are you going? I'm going to the __.
  2. 圳寶：Where is he going? He's going to the __.
  3. 水鈴：Where is she going? She's going to the __.
  4. 三人綜合（現行三種句型隨機）
  5. 三人一起走：Where are you going? We're going to the __.
  6. 三人一起走：Where's the __? 依真實道路，大馬路 It's on __ Road.、小巷 It's __ Street.（**2A**）；10 色 red/yellow/green/blue/black/white/purple/pink/orange/brown；**同一條路整場同一顏色（3A）**；到達時建築前那段路變成答案顏色。
- 林先生廟只當地標，不出題（**4B**）。

## 已採納建議
- ① Tripo 預估 1,100–1,600 點（餘額 2,740）。
- ② 抵達時擋住視線的房子自動半透明。
- ③ 顏色選項旁加色塊。
- ④ 分三階段交付，每階段放預覽網址給老師 iPad 看：①修正＋六模式（不花點）②建築復刻 ③顏色街道模式。
- ⑤ 22 站抵達截圖檢查表。

## 待確認假設
- 模式 6 每題問 1 棟建築，4 個顏色選項；三人一起走到該建築。
- 模式 5、6 三人並排走；鏡頭跟著 Ken。
- 一條路只有一個顏色名；長路（員集路）整條同色。
- 預覽網址沿用 ershui-planet 頻道；正式站要老師驗收後才上。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\godot-ershui-planet** 改版二水小行星：修好 iPad 選路線、Ken 細描邊、每站抵達鏡頭同時看到人物與整棟建築（擋住的房子半透明，22 站截圖檢查表）；首頁加人物模式六選一（Ken／圳寶 he／水鈴 she／三人綜合／三人 We're／三人問路 It's on __ Road・It's __ Street，10 色、同路同色、到達時路面變色、選項附色塊），五套路線皆可搭配；依網路最新照片（不保存）以 Codex 畫參考圖、Tripo 建模復刻約 22 個目的地建築，預估 **1,100–1,600** 點；分三階段部署到預覽頻道 **ershui-planet** 給老師 iPad 驗收，正式站不動。

## 驗收條件
- [ ] iPad 上 Set 1–5 都能選，Ken 一眼認得出。
- [ ] 22 站抵達畫面都看得到角色與整棟建築（檢查表）。
- [ ] 六種模式各跑完一套 12 題，句型與語音正確；模式 6 路面顏色與答案一致。
- [ ] 老師看過建築復刻，認得出是二水的地點。
