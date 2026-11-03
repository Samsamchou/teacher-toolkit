---
rdq_version: 1
edition: claude-code
task: 去掉 Cosmo 嘴型 v2 臉頰上的洞
domain: video
date: 2026-11-03
status: confirmed
telemetry:
  mode: lite
  rounds: 0
  questions: 0
  q4_adopted: 0
  revisions: 0
downstream: 3d-teacher-lesson-video
---

# RDQ 需求規格：Cosmo 臉頰凹洞修正

## 一句話任務
老師嘴型 v2 的貼片範圍加高加寬、邊界柔化，消除 Cosmo 左臉頰的洞，13 個姿勢重新合成（不重生圖、不花錢）。

## 已確認
- 原因：原圖 Cosmo 的笑紋往上翹，尾端被貼片上緣硬切斷，看起來像一個洞（3D 原圖與 AI 生成圖本身都沒有洞）。
- 修法已在 Cosmo P02、P06 試過有效：範圍 1.9×寬、2.1×高，邊界高斯漸層 22 px。
- 延續 RDQ-spec-teacher-tilted-mouths-20261102（8 嘴型、13 姿勢、之後影片 3 試片 → 三支重渲染）。

## 待確認假設
- 建議①：新對照表每列加「原圖」欄並放大到臉頰。
- 建議②：Nova 6 個姿勢也一起修（老師 11/03：Nova 也有相同問題）。

## 一段式需求規格
以 **engine/face_set2.py**（加大、柔化的貼片範圍）重新合成 **13 個老師說話姿勢 × 8 嘴型**，不重新生圖；產出放大到臉頰、含原圖欄的新對照表給老師審；通過後做 **影片 3 試片**，再依序重渲染 **影片 3 v1.2、影片 2 v2.3、影片 1 v1.3**。

## 驗收條件
- [ ] 對照表上 Cosmo、Nova 臉頰都沒有洞、刻痕或灰痕。
- [ ] 嘴巴仍跟著頭的角度，位置不偏移。
