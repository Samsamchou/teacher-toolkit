---
rdq_version: 1
edition: claude-code
task: 分配可選課堂單人遊戲，邊作答邊玩
domain: dev
date: 2026-11-17
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：分配加入課堂單人遊戲

## 一句話任務
Lesson Hub 分配（練習／測驗）除了 Forest of Words 與純答題，也能選 **單人籃球、Plink-oh!、Slot Machine、Bowling Game、World Pup Soccer**，學生邊作答邊玩。

## 已確認
- 原因：工具列「本堂課單人遊戲」只用於 Teacher-led 課堂；分配目前只接受 survivors／none。
- 1A 練習：每題完成（全對或用完次數）後玩，機會同課堂：全對 2、部分 1、答錯 0。
- 2A 遊戲分只是娛樂，不影響學習成績；報表與 CSV 另列「遊戲總分」。
- 3A 分配對話框遊戲選單加入 5 款，預設帶入工具列選的遊戲，可改。
- 4B 測驗模式：全部交卷後才玩，機會為各題機會總和。
- 完成後直接部署正式站（Hosting＋liveV2），部署後讀回驗證。

## 已採納建議
- ① 遊戲結果由伺服器決定（沿用課堂權威亂數／物理），學生不能改分。
- ② 舊分配與 Forest of Words 完全不變，只影響新分配。
- ④ 學生結果頁並列學習分數與遊戲戰果。
- ⑤ 練習模式每題機會須在該題用完，不累積；可放棄剩餘機會進下一題。

## 本次不納入
- ③ 先只做 Bowling 分階段（五款一次上）。
- 學生自選遊戲、遊戲分計入成績。

## 待確認假設
- 錄音題沿用課堂機會規則（AI 85 分以上視為全對）。
- 教材投影片、不計分題不給機會。

## 驗收條件
- [ ] 分配選 Bowling Game 後，學生端練習每題完成出現 Bowling，全對 2 次、部分 1 次。
- [ ] 測驗模式交卷後才出現遊戲，機會為總和；中途不顯示獎勵。
- [ ] 教師報表與 CSV 有遊戲總分；學習分數不受影響；舊分配（survivors／none）照舊。
- [ ] 正式站部署讀回一致。
