---
rdq_version: 1
edition: claude-code
task: SF3 R1 配樂降音量、讓人聲清楚
domain: video
date: 2026-10-26
status: confirmed
telemetry: {mode: lite, rounds: 1, questions: 3, q4_adopted: 4, revisions: 0}
downstream: self
---
# RDQ 需求規格：SF3 R1 配樂重新混音

## 已確認（1A、2A、3A；老師 2026-10-26 確認三項假設）
- 配樂比 v1 成片小 **6 dB**（以 v1 配樂音量為基準）；試聽樣本 -6 是選定版本，-8、-10 只供比較。
- 句子之間不回升（最多比說話時高 3 dB）。
- 片尾 14.4 秒配樂 2.5 秒內回到 v1 正常音量。
- 整片約 **-16 LUFS**、峰值 **≤ -1.5 dB**；S15 敲門聲不變；畫面、配音內容、字幕不變。

## 已採納建議
- ① S02–S07 試聽樣本 -6／-8／-10 dB（work/music_samples/）。
- ② 說話時配樂 1–4 kHz 再壓 8 dB。
- ③ 每句配音調成一致音量後 +2 dB。
- ④ 小喇叭模擬（300 Hz–6 kHz）檢查。

## 實作
scripts/assemble.py（MUSIC_DB、VOICE_DB；SAMPLE=1 只出試聽樣本）；v1 備份 work/assemble_v1_backup.py。

## 驗收條件
- [x] 老師聽過試聽樣本，選定 **-10 dB**（2026-10-26）。
- [ ] 每句台詞在小喇叭模擬下都清楚。
- [x] 片尾配樂恢復正常、過渡不突兀。
- [x] 四個成片檔都更新：正片 -16.4 LUFS、峰值 -1.8 dB（手機版 -1.9）。
