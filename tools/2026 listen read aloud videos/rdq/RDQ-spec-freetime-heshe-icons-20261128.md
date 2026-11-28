---
rdq_version: 1
edition: claude-code
task: Free Time 雙圖示卡 he/she 版（Super Fun 節奏）
domain: video
date: 2026-11-28
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: rhythm-vocabulary-video
---

# RDQ 需求規格：Free Time 雙圖示卡 he/she 版

## 一句話任務
把雙圖示卡版改成**第三人稱單數**，每張卡加上 he／she／Mandy／Andy 人物插圖，節奏沿用 Super Fun 正式版。

## 已確認
- 11 個片語，照老師給的順序：**listens to music、rides a bike、plays baseball、plays basketball、plays the recorder、plays online games、surfs the Internet、watches TV、goes camping、goes jogging、studies English**。
- 字尾變化標紅字，其餘白字：listen**s**、ride**s**、play**s**、surf**s**、watch**es**、go**es**、stud**ies**。
- 字幕和語音**只有動詞片語**，不含主詞；主詞靠插圖表示（1B）。
- 人物下面有小名牌：**he、she、Mandy、Andy**（2A）。
- 語音：新生成 22 段（11 個片語 × 老師 marin／兒童 coral）。老師已預先同意**上限 US$0.30**，不自動重送（3A）。
- 建議 ①–⑤ 全部採納：
  - ① 主詞照 he → she → Mandy → Andy 循環分配。
  - ② Mandy、he、she 的新圖用 Codex 生成（不另外收費），先給老師看再用。
  - ③ 版面：人物在左、雙圖示卡在右。
  - ④ 片尾總覽的小字也標紅字。
  - ⑤ 字型用 Comic Relief Bold。

## 主詞分配（建議①）
| # | 片語 | 主詞 |
|---|---|---|
| 1 | listens to music | he |
| 2 | rides a bike | she |
| 3 | plays baseball | Mandy |
| 4 | plays basketball | Andy |
| 5 | plays the recorder | he |
| 6 | plays online games | she |
| 7 | surfs the Internet | Mandy |
| 8 | watches TV | Andy |
| 9 | goes camping | he |
| 10 | goes jogging | she |
| 11 | studies English | Mandy |

## 待確認假設
- Andy 用現成的 HWG7 角色圖（`escape room HWG7-U01-U02/assets/imagegen/characters/CHAR-06-Andy.png`）。
- Mandy 是新角色，畫風和 Andy 一樣；he、she 各畫一個不特定的男生、女生，和 Andy、Mandy 長得不同，避免混淆。
- 節奏、伴奏、音量沿用 Super Fun 正式版：128 BPM、每張卡 2 小節、原速語音、本機 style 6、換卡音效、−14 LUFS。
- 片長約 62 秒；片尾總覽 4＋4＋3，每格是「人物＋圖示卡」縮圖。
- 圖示沿用原本每個活動的 _2＋_3 雙圖示。
- Internet、TV、English 的大小寫不變。

## 本次不納入
- 句子含主詞的版本；Ken 3D 版的 he/she 版；卡拉版；修改已定案的兩支正式片。

## 一段式需求規格
在 **`productions/freetime-activities/v04-heshe-icons/`** 用 rhythm-vocabulary-video 的 Super Fun 模式做一支 1080p MP4，字型 Comic Relief Bold。11 張卡照上面的順序和主詞分配，每張卡左邊是人物（he／she／Mandy／Andy，下面有名牌），右邊是雙圖示卡。字幕是第三人稱動詞片語，字尾 **s／es／ies** 用紅字，總覽小字也一樣。語音新生成 22 段原速（gpt-4o-mini-tts，marin／coral，上限 US$0.30），經 ASR 檢查、裁邊、起音對齊小節第 1 拍。Mandy、he、she 的新圖用 Codex 生成，先交老師確認。全片 verify 和瀏覽器檢查都通過後，再交老師驗收。

## 驗收條件
- [ ] 四個人物圖（Andy 現成；Mandy、he、she 新圖）老師看過同意。
- [ ] 11 張卡順序、主詞分配、紅字位置都正確；人物名牌清楚。
- [ ] 每個片語老師聲、兒童聲各一次，落在小節第 1 拍，沒有被截掉；verify 與瀏覽器檢查都通過。
- [ ] 老師明確驗收。
