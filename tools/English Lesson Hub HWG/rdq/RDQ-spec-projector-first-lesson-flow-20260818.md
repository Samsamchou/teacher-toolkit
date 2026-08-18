---
rdq_version: 1
edition: chatgpt-app
task: 教師投影版面全螢幕化
domain: dev
date: 2026-08-18
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 1
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：教師投影版面

## 一句話任務
將所有 Lesson Flow 改為筆電投影優先的一站式全螢幕教學版面。

## 已確認
- 所有 Lesson Flow 使用全螢幕投影模式，並以 1920×1080／16:9 驗收。
- 教學時隱藏全站橫幅，只保留小型課程名稱與必要控制。
- Previous／Next 底欄平時自動隱藏，滑鼠移至底部才顯示。
- 外部互動教材 iframe 填滿可用舞台並提供全螢幕按鈕。
- 圖片與影片完整顯示、不裁切；方向鍵切換流程，F 切換教材全螢幕。
- Teacher Studio 與 Results 維持管理介面；開始上課才進入投影模式。

## 已確認限制
- 外部平台本身需要時保留其內部捲軸；Lesson Hub 不產生額外上下捲動。
- 本次不優化 iPad 與手機版。
- 本次先完成程式與測試，接著正式部署。

## 本次不納入
- 修改 Wayground 等外部網站的登入、版面或內部捲軸。
- Firebase、Firestore、Results 安全流程調整。

## 驗收條件
- [ ] 1920×1080 下教師 Lesson Flow 不出現 Lesson Hub 的垂直捲動。
- [ ] 外部 iframe 佔滿教學舞台並可切換全螢幕。
- [ ] 頂端橫幅隱藏；底部控制列可自動隱藏與喚回。
- [ ] 圖片、影片、方向鍵與 F 快捷鍵均可正常使用。
