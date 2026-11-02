---
rdq_version: 1
edition: claude-code
task: 兩位老師嘴型改同角度、影片 1–3 重渲染
domain: video
date: 2026-11-02
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: 3d-teacher-lesson-video
---

# RDQ 需求規格：老師斜臉嘴型修正

## 一句話任務
Ms. Nova／Mr. Cosmo 說話時的嘴型改成跟頭同角度、沒有灰痕，影片 1、2、3 全部重新渲染。

## 已確認
- 原因：老師嘴型是 AI 重畫整張臉後剪嘴巴貼回，角度與膚色對不上（Cosmo 頭較斜更明顯）。
- 保留 **8 種嘴型**（M01_rest～M08_mid），全部依原姿勢角度重新生成（1B）。
- 只做三支片說話用到的 **13 個姿勢**：Nova P02、P03、P05、P06、P07、P09；Cosmo P02、P03、P04、P05、P06、P07、P10 → 約 **104 張**（建議②）。
- 生圖先用 **Codex**；Codex 額度用完後改用 **gpt-image-2 API**（medium）補圖（老師同意，3B）。
- 先做 **Cosmo P04** 嘴型對照表給老師看，通過再批次（建議①）。
- 修正順序：先用 **影片 3 試片** → 通過後三支依序重渲染（2A）。
- 眨眼貼片沿用（建議③）；版本 **影片 1 v1.3、影片 2 v2.3、影片 3 v1.2**，舊版保留（建議④）；完成後更新 skill 踩坑表（建議⑤）。

## 待確認假設
- API 補圖上限 **US$6**（約 100 張 medium 以內）；超過先停下來問。
- 合成方式沿用 `mouth_variants.py` 做法：同角度編輯圖 → 相位相關對位 → 只貼「和原圖不同的嘴部小塊」→ 羽化對色；舊貼片移到 `superseded/`。
- 嘴型切換規則不變（依字母對應 8 種嘴型）。

## 一段式需求規格
用 skill **3d-teacher-lesson-video**：為 **13 個老師說話姿勢**各生 **8 種同角度嘴型**（Codex 優先，額度用完改 gpt-image-2 API medium，上限 US$6），以對位＋只貼嘴部小塊取代舊貼片；先交 **Cosmo P04** 對照表，通過後批次並交全部對照表；再做 **影片 3** 試片，通過後依序重渲染 **影片 3 v1.2、影片 2 v2.3、影片 1 v1.3** 並各壓 30 MB 內 720p。

## 驗收條件
- [ ] 對照表：每張嘴與頭同角度，無灰痕、無錯位。
- [ ] 試片：老師說話時嘴巴自然，Cosmo 不再有灰色痕跡。
- [ ] 三支片重渲染後格數與時間軸和舊版一致。
