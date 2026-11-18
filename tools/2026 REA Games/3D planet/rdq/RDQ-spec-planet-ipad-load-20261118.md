---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星 Guess 版 12 台 iPad 同時載入慢（5 分鐘以上）、2 台卡住
domain: dev
date: 2026-11-18
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：iPad 載入加速與防卡住

## 一句話任務
讓 12 台 iPad 同時開 Guess 版時下載量變小、第二次起幾秒開好、卡住會自動重試。

## 已知
- 每台下載約 78 MB：index.pck 72.2 MB（br 後 70.5 MB，幾乎壓不小）＋index.wasm 39.5 MB（br 後 7.1 MB）。
- 12 台同時約 940 MB，5 分鐘一台 ≈ 全班共用約 30 Mbps。
- 快取只放 1 天（max-age=86400）；PWA 關閉；匯出同時打包電腦（S3TC/BPTC）與手機（ETC2/ASTC）兩套貼圖。
- 載入頁沒有斷線重試，進度條會停住。
- 逛街版和 Guess 版共用 `ershui-planet/` 同一套遊戲檔。

## 已確認
- 1A：Guess 版只在 iPad 上用。
- 2A：老師上課前先把 iPad 全部開好。
- 3B：本機測試通過直接上正式站（部署前比對 live＝staging）。

## 已採納建議
- ① 遊戲檔變小：iPad 只下載 iPad 用貼圖；聲音、3D 模型壓小。
- ② 存在 iPad 上：第一次下載後存進 iPad，下次幾秒開好；改版才重新下載。
- ③ 卡住自動重試：20 秒沒進度就自動重試，顯示「網路卡住，正在重試」＋「重試」按鈕。
- ④ 載入畫面顯示「已下載 X MB／共 Y MB」與速度。
- ⑤ 老師上課前分批開 iPad 的步驟卡。

## 待確認假設
- 逛街版（全班分組可能在教室電腦開）共用遊戲檔 → 依裝置自動選檔：iPad 下載 iPad 版、電腦下載電腦版，電腦照常可玩。
- 壓聲音、模型時畫質與音質要聽看起來差不多；壓縮後先給老師比對截圖或音檔再上線。
- 「存在 iPad 上」用網站快取（Cache Storage），不需要「加入主畫面」；改版時自動換新。
- 步驟卡放在 `3D planet/資料/guess/` 並傳給老師（A4 一頁）。

## 本次不納入
- 架設教室區網伺服器、改遊戲玩法、Free Time 版（之後可照做）。

## 一段式需求規格
量出 index.pck 內容大小，匯出時 iPad 版只放 ETC2/ASTC 貼圖、聲音與模型壓縮，目標明顯縮小（實測回報前後 MB）；網頁依裝置選 iPad 版或電腦版 pck。載入頁加入 Cache Storage 永久保存（依版本號換新）、20 秒無進度自動重試＋重試按鈕、顯示 MB 與速度。Godot 測試（Listen、分組）通過，本機模擬慢速網路與斷線重試、第二次開啟走快取；比對 live＝staging 後上正式站並讀回；附老師分批開 iPad 步驟卡。

## 驗收條件
- [x] iPad 下載量明顯小於 78 MB（回報實際數字）；電腦仍可玩逛街版。
- [x] 第二次開啟不再重新下載整包；改版後會自動更新。
- [x] 模擬斷線時 20 秒內自動重試並能完成載入；畫面顯示 MB 與速度。
- [x] Godot 測試通過、正式站讀回正常；步驟卡交給老師。
