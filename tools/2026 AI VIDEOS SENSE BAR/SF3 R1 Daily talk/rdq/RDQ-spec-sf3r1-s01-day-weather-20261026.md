---
rdq_version: 1
edition: claude-code
task: S01 用程式疊加 Sunday／sunny 畫面
domain: video
date: 2026-10-26
status: confirmed
telemetry: {mode: lite, rounds: 1, questions: 3, q4_adopted: 4, revisions: 0}
downstream: self
---
# RDQ 需求規格：SF3 R1 S01 Sunday／sunny 疊加動畫

## 一句話任務
在 S01 的 Seedance 影片上，用程式加上月曆、一週列表、太陽和天氣小卡，讓畫面表現旁白 It's Sunday today. It's sunny.

## 已確認（1C、2A、3A；老師 2026-10-26 確認四項假設）
- Sunday：月曆翻頁停在 **SUNDAY**，接著 Mon–Sun 一週列表亮起 **Sun**。
- sunny：右上角天空卡通太陽（光芒轉動）＋ **sunny 晴天** 小卡。
- 疊在原 S01 影片上，不擋角色，念到才出現；月曆與一週列表在左上，太陽與小卡在右上。
- 旁白 0.6 秒開始；疊加物念完後留到 S01 結束。月曆不寫日期數字。疊加物不進入下方三分之一。
- 字由程式排版：英文 **Comic Relief**、中文微軟正黑體粗體；不重新生成 AI 影片、不花點數。

## 已採納建議
- ① 出現時間對上旁白（work/word_times.json：Sunday 0.86 秒、sunny 2.64 秒）。
- ② 可重用元件 `scripts/day_weather.py`（CONF 改星期／天氣；天氣圖示 sunny、cloudy、rainy）。
- ③ 小卡中英對照：Sunday 星期天、sunny 晴天。
- ④ 先給老師看樣張（work/day_weather_sample.jpg）再做整段動畫。

## 驗收條件
- [x] 老師確認樣張版面（2026-10-26）。
- [x] Sunday、sunny 的出現時間對上旁白的字。
- [x] 角色沒有被遮住，底部留給字幕。
- [x] 換成其他星期或天氣只需改 CONF。
