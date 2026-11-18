---
rdq_version: 1
edition: chatgpt-app
task: Free Time 兩版（兩人一組／全班猜猜看）首次下載加速＋全班版押注列加 G1–G5
domain: dev
date: 2026-11-18
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 3
  revisions: 0
downstream: self
---

# RDQ 需求規格：Free Time 載入加速＋組號

## 一句話任務
照 Guess 版做法讓 Free Time 遊戲檔變小、存在裝置上、卡住自動重試；全班猜猜看押注列每組頭像左邊加 G1–G5。

## 已知
- 兩版共用 `ershui-freetime/` 遊戲檔；每台約 95 MB（pck 88 MB br＋wasm 7 MB），沒有快取與重試。
- pck 內 19 組沒用到的舊模型貼圖約 15 MB（已解壓場景檔核對，ken／zunbo_rigged 貼圖仍被 openhand 使用，保留）。

## 已確認
- 1A：G1–G5 放在頭像左邊（同逛街版 11/14）。
- 2B：本機測試通過直接上正式站（部署前比對 live＝staging）。
- 3A：人物貼圖不縮小。

## 已採納建議
- ① 步驟卡加 Free Time 兩個網址。
- ② 提醒教室大螢幕電腦上課前先開一次。
- ③ 檢查默劇影片（ogv 4.5 MB）能否壓小且不影響畫質。

## 待確認假設
- 大樓貼圖 768→512、法線 512→256、背景音樂 96k、環境音 128k（同 Guess 版）。
- 載入頁用同一套 web-loader（存裝置、20 秒重試 3 次＋重試鈕、MB／速度）。

## 本次不納入
- 3D 模型減面、人物貼圖縮小。

## 一段式需求規格
godot-ershui-freetime：export 排除 19 組孤兒貼圖、bld 貼圖與音訊同 Guess 版處理、ogv 檢查壓縮；押注列頭像左邊加 G1–G5；Godot 測試通過、Playwright 驗證快取與重試；套用 web-loader 後比對 live＝staging 上正式站並讀回；更新步驟卡。

## 驗收條件
- [x] 下載量明顯小於 95 MB（回報實際數字）；第二次開啟從裝置讀取。
- [x] 全班版押注列顯示 G1–G5；Godot 測試通過；正式站讀回正常。
- [x] 步驟卡含 Free Time 網址。
