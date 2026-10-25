---
rdq_version: 1
edition: chatgpt-app
task: 3D Planet 二水鄉逛街版（地點句型猜猜看）
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

# RDQ 需求規格：3D Planet 二水鄉逛街版

## 一句話任務
仿基隆小行星，在 Godot 做一顆可俯瞰的「二水小行星」，讓 5–7 組學生猜 Ken／女性吉祥物要去哪裡，練地點單字與 Where … going? 句型。

## 已確認
- 技術：**Godot**，延伸現有 **godot-ershui-quest** 的二水路網並包成小星球；街景、路、樹、房子用程式產生（基隆小行星做法），地標用 **Tripo** 模型（沿用已有 14 個＋補新地標），招牌字用程式疊正確文字。
- 5 套題組放在同一個遊戲，老師開場選；每套約 12 個地點，順序與選項隨機。
- 本版就做 **女性吉祥物**（參考寶可夢設計方法上網研究）；中性機器人之後再做。
- 流程：首頁空中俯瞰二水飛行動畫 → 老師選 5–7 組、各組選科幻動漫風 emoji → Ken 從**二水火車站前廣場**出發 → 題目＋4 選項 → 各組押答案 → Start → 角色走到正確地點 → 猜對 +2 → 結果頁。分數左上、功能鈕右上。
- 單字：park, post office, supermarket, library, school, train station, tea shop, bookstore, hospital, restaurant, convenience store；句型 you／he／she 三組。
- 地點：原 13 處＋多座公園、多所學校、餐廳（驛站）、**台灣第一味**（tea shop）。
- 部署：先本機預覽，老師驗收後才放 **hwg5-clock-tower.web.app** 新資料夾。
- 截圖 251 張已放 `2026 REA Games\3D planet\資料`。

## 已採納建議
- ① hospital 查證後用「二水鄉衛生所」或診所代替並回報。
- ② 程式街景＋Tripo 地標混合建模。
- ③ 題目與答案句英文語音（0.8 倍速）。
- ④ 全組押注後才能 Start、不重複加分、結果頁可截圖。
- ⑤ 基隆小行星玩到看過所有系統（約 15 個任務）即可，不全破。

## 待確認假設
- 餐廳名 → 採 Google 地圖名稱「**二八水驛站**」（你寫的是「二水驛站」）。
- 句型分配 → Ken 被直接問用 you；旁白問 Ken 用 he；問吉祥物用 she；三種隨機混合。
- 答錯 0 分、不扣分；每套 12 題。
- 新增地點（其他公園、學校、全家等）先上網查證存在與位置再列清單給你看。
- emoji 用 Codex 生圖做 12 款科幻動漫風頭像供選。
- 飛行動畫在 Godot 裡即時運鏡，不另外做 MP4。
- 背景音樂沿用 `suno-bgm-original/bgm_street.mp3`；目標裝置是教室投影＋iPad。

## 本次不納入
- 中性機器人角色、打怪／戰鬥、登入與排行榜、Android App。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\** 建立 Godot 專案「二水小行星逛街版」：先試玩 **https://keelung-planet.aipost.tw/** 約 15 個任務並記錄玩法與介面；延伸 **godot-ershui-quest** 的路網與 Tripo 模型（含 Ken），程式產生其餘街景並包成可俯瞰的小星球；補查證二水其他公園、學校、hospital 替代地點，使每個單字至少有一處；上網研究寶可夢角色設計方法後做女性吉祥物（Tripo 建模）；首頁空中俯瞰動畫 → 選 5–7 組與科幻動漫風 emoji → 選 5 套題組之一 → 角色從**二水火車站前廣場**出發，每題 4 選項（I'm／He's／She's going to the __.）、各組押注、Start 後角色沿路網走到正確地點、猜對 +2、左上計分、右上功能鈕、英文語音 0.8 倍速，約 12 題後顯示結果頁；先本機預覽，驗收後才部署到 **hwg5-clock-tower.web.app**。

## 驗收條件
- [ ] 11 個單字各對應至少一個真實二水地點，角色能沿路網走到每一處。
- [ ] 5 套題組皆可完整玩到結果頁，分數正確、順序每次不同。
- [ ] 首頁俯瞰動畫、選組與 emoji、押注與 Start 流程在投影與 iPad 上可用。
- [ ] 女性吉祥物的設計說明與模型交老師確認後才放入。
