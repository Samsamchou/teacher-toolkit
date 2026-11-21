---
rdq_version: 1
edition: claude-code
task: 試片 v1 講解段對照表改成逐行出現、逐行消失
domain: video
date: 2026-11-15
status: confirmed
telemetry: { mode: lite, rounds: 1, questions: 3, q4_adopted: 3, revisions: 0 }
downstream: self
---

# RDQ 需求規格：對照表逐行出現（試片 v1 → v2）

## 已確認（老師 11/15：1A 2B 3C＋建議全採）
- 每一行單獨**放大在畫面中央**介紹 → 介紹完消失 → **空 1 秒** → 下一行，共 6 行。
- 空檔時**保留那本書**，只清掉該行與片語。
- 6 行介紹完後，**完整對照表一次出現**（左邊），旁白再把六組快速念一次（I, my. You, your…），念到哪一行哪一行發光。
- 建議①：完整表出現時所有格那一欄閃紅光；②：空檔放輕「咻」轉場音；③：完整表停 3 秒再進規則段。

## 驗收條件
- [x] 每行之間確實空 1 秒、畫面只剩書
- [x] 完整表出現＋旁白重念＋紅欄閃光＋停 3 秒
- [x] 規則段、填空示範、第 1 段不變
