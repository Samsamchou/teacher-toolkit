---
rdq_version: 1
edition: chatgpt-app
task: Safari Count 謎題卡 4 題修改
domain: lesson
date: 2026-11-25
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：Safari Count 謎題卡 4 題修改

## 一句話任務
改 ZEBRAS、ELEPHANTS、BEARS、TIGERS 四張謎題卡，重新輸出 12 題與六國總表。

## 已確認
- **TIGERS**：改成「字母往前一格」密碼（1B）。卡上寫 **UJHFST**，每個字母換成字母表裡前一個 → **TIGERS**；下方放 A–Z 字母條。
- **ZEBRAS**：對照表 8 種 → **12 種**（2A），排兩排、每排 6 個。
- **BEARS**：**BEE − E ＋ CARS − C**；題目只放蜜蜂、汽車圖，提示 1 才出現 BEE、CARS（3A）。
- **ELEPHANTS**：九宮格內不畫箭頭，改成跟 HORSES 一樣，旁邊列 8 個箭頭：**下／右／上／右／下／下／左／左**（第 4 個是「右」，「左」會走回 E）。
- 提示 2 一律只給第一個字母。

## 已採納建議
- ① 新增 4 種腳印對到其他動物字也會用的字母：**H、O、N、L**。
- ② 新腳印挑外型相近的：**貓掌**（像現有獸掌）、**雞腳**（像鳥腳）、**山羊蹄**（像鹿蹄）、**青蛙腳**（像壁虎腳）。
- ③ 同步更新〈謎題總表與對話稿_v1〉與〈其餘10題謎題卡內容_v1〉：BEARS、ZEBRAS、ELEPHANTS、TIGERS 列，以及題型分配（T05 只剩 LIONS；TIGERS 歸 T02 字母位移密碼）。
- ④ ELEPHANTS 答案頁在九宮格上畫出完整紅色路線。

## 待確認假設
- TIGERS 提示 1：「牠身上有條紋，6 個字母。每個字母在字母條上往左一格。」提示 2：「第一個字母是 T（U 的前一個）。」
- BEARS 提示 1：「蜜蜂是 BEE，汽車是 CARS。」提示 2：「BEE − E ＝ BE，第一個字母是 B。」
- ELEPHANTS 提示 1：前兩個箭頭標紅＋九宮格畫出 E → L → E；遊園車圖縮小放在箭頭上方。
- 新圖示用 Codex 生 2 張 2×2 圖（腳印 4 個；蜜蜂、汽車、另 2 格備用），圖上不放字。
- TIGERS 不再用遮擋，刪掉 `--qa-occlude` 與 `out/qa_occlude.png`。

## 本次不納入
- 不 commit、不部署、不跑 `publish_to_site.py`（網站那邊重跑才會更新）。

## 一段式需求規格
在 **hwg5-u04-safari-count/puzzles/src/cards.html** 修改四題：**ZEBRAS** 對照表擴成 **12 種**腳印（新增貓掌、雞腳、山羊蹄、青蛙腳，對 **H、O、N、L**，兩排各 6 個）；**ELEPHANTS** 改用 HORSES 的 arrows 模式，九宮格 **E P H／L E A／S T N** 不畫箭頭，旁邊列 **下右上右下下左左**，答案頁畫完整路線；**BEARS** 改為 **BEE − E ＋ CARS − C**，題目只放圖、提示 1 出現英文字；**TIGERS** 改為字母往前一格密碼 **UJHFST**＋A–Z 字母條。提示 2 一律只給第一個字母。新圖示用 Codex CLI 生成（先存 C 槽暫存再複製，提示詞存 `assets/source/`）。完成後跑 `render.py`（12 題×4 階段）與 `contact_sheets.py`，同步更新兩份謎題 md，HANDOFF 那一行改寫。不 commit、不部署。

## 驗收條件
- [ ] `render.py` 12×4 張 0 錯誤，六國總表重做。
- [ ] ELEPHANTS 謎面九宮格內沒有箭頭；旁邊 8 個箭頭照路線走完 9 格只得到 ELEPHANTS。
- [ ] ZEBRAS 對照表 12 種腳印各對一個字母、互不重複；BEARS 算式得 BEARS；TIGERS 解碼得 TIGERS。
- [ ] 兩份謎題 md 與 HANDOFF 已更新。
