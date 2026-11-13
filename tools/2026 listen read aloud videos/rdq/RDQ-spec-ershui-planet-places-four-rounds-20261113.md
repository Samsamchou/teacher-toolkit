---
rdq_version: 1
edition: claude-code
task: 二水小行星 12 地點 4 輪節奏朗讀影片
domain: video
date: 2026-11-13
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: rhythm-vocabulary-video
---

# RDQ 需求規格：二水小行星地點單字朗讀（4 輪 × 6 張）

## 一句話任務
用逛街版的 **12 個地點**，做一支「3D 建築兩輪＋雙圖示兩輪」的節奏朗讀影片。

## 已確認
- 12 個字：**post office、supermarket、school、library、hospital、park、restaurant、tea shop、train station、bookstore、museum、convenience store**（第 12 個＝便利商店，1A）。
- 流程：第 1 輪 6 個 3D 地點 → 第 2 輪另外 6 個 3D → 第 3 輪 6 張圖示卡 → 第 4 輪另外 6 張圖示卡。
- **圖示卡＝同一地點的圖示1＋圖示2 合併成一張**（呼應學生功課：畫兩個圖示讓別人猜地點）。
- 3D 建築：school＝**二水國小明德橋旁的校門**；park＝**二八水水公園**；其餘照預設：二水郵局、二水超市、二水鄉立圖書館、恩生診所、二八水驛站、紅招牌飲料店、二水火車站、書店、二水鐵道博物館、民族路便利商店。
- 建議全部採納（①–⑤）。

## 待確認假設
- 第 1、3 輪＝post office、supermarket、school、library、hospital、park；第 2、4 輪＝restaurant、tea shop、train station、bookstore、museum、convenience store（順序照網站）。
- 圖示卡用現成的「兩圖示並排」原圖（`listen-3clues/icons/raw/*.png`），裁成正方形卡：左圖示1、右圖示2。
- convenience store 沒有圖示：用同一套剪影風格，以 **Codex CLI 內建生圖**新做 1 張雙圖示（ChatGPT 方案內，不另計費），給老師看過才用。
- 每輪開頭 6 張總覽用 3 欄 × 2 列；每個字老師 marin 一次、兒童感 coral 一次，0.85 倍速，片長約 2.5 分鐘。
- 英文字幕維持正式片用的 Comic Sans Bold（字型問題另外決定）。

## 已採納建議
- ① 3D 圖用 Godot 本機重拍高解析，每棟裁成正方形、建築置中。
- ② 拍攝時隱藏建築頭上的中英文名牌。
- ③ 黑色剪影圖示卡加白底＋圓角框，在黑板上看得清楚。
- ④ 新語音 24 段（12 字 × 2 聲）用 OpenAI Speech，估計低於 US$0.2；**生成前報確切金額、等老師同意**。
- ⑤ 先做試片（第 1 輪＋第 3 輪各 6 張），老師通過才做全片。

## 本次不納入
- 每個地點兩張圖示分開出現；二水國小正門以外的其他角度；上傳網站或雲端。

## 一段式需求規格
在 **`tools/2026 listen read aloud videos/productions/ershui-planet-places/v01/`** 用 **rhythm-vocabulary-video** 做一支 1080p30 節奏朗讀 MP4。新增 **four-rounds-six** 模式（24 張圖：第 1–2 輪各 6 張 3D 建築圖，第 3–4 輪是相同 12 個字的圖示卡，各 6 張；總覽 3×2）。3D 圖從 **godot-ershui-planet** 本機重拍，隱藏名牌，正方形裁切。school 用 **二水國小明德橋旁校門**，park 用 **二八水水公園**。圖示卡是同一地點兩個黑色剪影並排在白底圓角卡上；**convenience store** 的雙圖示用 Codex CLI 新生成。新語音生成前先報價。先交試片（第 1＋3 輪），通過後再做全片，老師說「確定為正式版」才登記正式版。

## 驗收條件
- [ ] 24 張卡片總覽圖給老師看過：12 張 3D 都看得出地點，12 張圖示卡都是兩個圖示。
- [ ] 試片：每個字老師聲＋兒童聲各一次、對拍、沒截尾；字幕大小寫正確（全小寫）。
- [ ] 全片 4 輪順序正確，`verify` 與瀏覽器播放檢查通過。
- [ ] 老師明確驗收。
