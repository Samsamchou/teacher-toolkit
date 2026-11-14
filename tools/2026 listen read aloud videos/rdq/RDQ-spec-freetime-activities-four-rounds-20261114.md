---
rdq_version: 1
edition: claude-code
task: Free Time 11 個活動 4 輪節奏朗讀影片
domain: video
date: 2026-11-14
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 1
downstream: rhythm-vocabulary-video
---

# RDQ 需求規格：Free Time 活動朗讀影片（6＋5＋6＋5）

## 一句話任務
用 Free Time 版的 **11 個活動**，做「Ken 3D 兩輪＋雙圖示兩輪」的節奏朗讀影片。

## 已確認
- 11 個活動：**watch TV、study English、play online games、go camping、surf the Internet、go jogging、play the recorder、listen to music、play baseball、play basketball、ride a bike**。
- 流程：R1 6 張 Ken 3D → R2 5 張 Ken 3D → R3 6 張雙圖示卡 → R4 5 張雙圖示卡；R1/R3 同字、R2/R4 同字（建議④）。
- 分組與順序（老師 2026-11-14 指定）：R1/R3＝**watch TV、study English、go camping、go jogging、play online games、surf the Internet**；R2/R4＝**listen to music、play the recorder、play baseball、play basketball、ride a bike**。
- 圖示：每個活動取 **_2＋_3**，合併成一張卡；用 `資料/freetime/clues/icons/` 的 512 px 原檔。
- Ken 3D：Godot 本機重拍，藏題目／答題面板，鏡頭拉近 Ken（1A）。
- 5 張那兩輪的總覽：**上 3 張、下 2 張置中**，卡片和 6 張那兩輪一樣大（2A）。
- 語音：老師已預先同意 **22 段、上限 US$0.30**，不自動重送（3A）。
- 字型：**Comic Relief Bold**（交替規則，這支輪到 Relief）。

## 待確認假設
- 只拍 Ken，不拍水鈴、圳寶。
- 3D 圖不加英文招牌、不用 Codex 重畫；如果重拍後有不好看的，再回報老師。
- 片長約 115 秒（以實際語音排程為準）。

## 已採納建議
- ① Ken 圖每個活動附 2 個候選角度，先交總覽給老師挑。
- ② 字幕大小寫：**TV** 全大寫、**English**、**Internet** 首字母大寫，其他全小寫。
- ③ 先做試片（R1＋R3 各 6 張），老師通過才做全片。
- ④ 3D 輪和圖示輪的字與順序完全對應。

## 本次不納入
- 每個活動的圖示1（_1）；水鈴／圳寶的圖；修改 Free Time 遊戲本身。

## 一段式需求規格
在 **`productions/freetime-activities/v01/`** 用 **rhythm-vocabulary-video** 做一支 1080p30 節奏朗讀 MP4，字型 **Comic Relief Bold**。新增 **6+5+6+5（22 張）** 路由，以及 5 張總覽「上 3 下 2 置中」版型。Ken 3D 圖用 **godot-ershui-freetime** 本機重拍（藏 HUD、拉近、每個活動 2 個候選），老師挑定。圖示卡用 512 px 的 _2＋_3 並排。語音用 OpenAI gpt-4o-mini-tts，marin／coral 共 22 段，上限 US$0.30（已授權）。經 ASR、頻譜錨點檢查後，先做試片（R1＋R3），通過後做全片，老師說「確定為正式版」才登記。

## 驗收條件
- [ ] 11 個活動的 Ken 候選總覽交給老師，每個活動選定 1 張，都看得出是哪個活動。
- [ ] 試片：每個片語老師聲＋兒童聲各一次、對拍、沒有截尾；TV／English／Internet 大小寫正確；字型是 Comic Relief。
- [ ] 全片 4 輪 6+5+6+5 順序正確；5 張總覽是上 3 下 2；verify 與瀏覽器檢查都通過。
- [ ] 老師明確驗收。
