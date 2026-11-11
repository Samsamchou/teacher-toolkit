---
rdq_version: 1
edition: chatgpt-app
task: The Noisy Toy Pig v2 修正：字幕擋物件、S03 媽媽出畫
domain: video
date: 2026-11-11
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 2
  q4_adopted: 3
  revisions: 0
downstream: phonics-story-video
---

# RDQ 需求規格：The Noisy Toy Pig v2 修正

## 已確認（老師回 1A、2A；建議採納 1、2、3）
- **S06**：字幕移到畫面上方（牡蠣在畫面下方被擋）；不重拍。
- **S03**：重畫首幀（媽媽站近中間），Seedance 重拍加「鏡頭固定、不推近」，約 57 點（總計約 387，上限 550）。
- 其他鏡逐一檢查字幕是否擋到重點物件，擋到就該鏡字幕移上方（免費）。
- skill `phonics-story-video` 新增規則：首幀重點物件不放畫面下方 1/4（字幕區）；Seedance 預設鏡頭固定、不推近（需要特寫的鏡除外）。

## 待確認假設
- 新 S03 首幀先給老師看，再花點數重拍。
- 只重渲受影響段落（S03、S06 與字幕上移的鏡、完整故事段）。

## 驗收條件
- [ ] S06 牡蠣與男孩跳起都看得到。
- [ ] S03 媽媽摀耳朵的動作完整在畫面內。
- [ ] 其他鏡字幕不擋重點物件。
