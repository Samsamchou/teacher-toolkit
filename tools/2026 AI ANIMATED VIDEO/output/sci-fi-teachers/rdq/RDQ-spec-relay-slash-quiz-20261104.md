---
status: confirmed
date: 2026-11-04
mode: Lite
---
# RDQ 規格卡：斜線台詞、六人 Game time、接力唸（影片 4 v1.2／影片 1 v1.4／影片 2 v2.4）

## 一段式需求規格
影片 4：4 句「爺爺／外公」類台詞 TTS 唸成「斜線」→ 字幕與語音都改「爺爺」或「外公」；Game time 從 3 題擴成 6 位家人（男女交錯）；結尾六個單字由 both 齊唸改成 Nova、Cosmo 接力。影片 1 結尾、影片 2 開場的七天齊唸也改接力。接力時整串字幕留在畫面，正在唸的字變亮、單字卡同步亮起。

## 影片 4 → v1.2（全片重渲染）
- 05-grandfather／grandmother／brother／sister：「爺爺」或「外公」、「奶奶」或「外婆」、「哥哥」或「弟弟」、「姊姊」或「妹妹」。
- 08-quiz 六題：grandfather → sister → mother → brother → grandmother → father（每題 Who is he/she? → 3 秒 → He's/She's my ___.）。
- 09-end：Father（Nova）、mother（Cosmo）、grandfather（Nova）、grandmother（Cosmo）、brother（Nova）、sister（Cosmo）。

## 影片 1 → v1.4（只渲染結尾、接回 v1.3）
- 「Let's say all seven days together!」→「Let's say all seven days!」
- 七天接力：Sunday（Nova）、Monday（Cosmo）…Saturday（Nova）。

## 影片 2 → v2.4（全片重渲染）
- 01-open 七天齊唸改接力，同上。

## 決定
1A、2A、3A；建議①②③④全部採納（skill 踩坑：中文台詞不寫「／」；整串單字不用 both，改接力）。

## 驗收
- whisper 聽不到「斜線」；接力無重疊；字幕 0 溢出；三支 720p 傳老師驗收。

## 待確認假設
- 接力每個字之間留 0.3 秒；Game time 增加約 30 秒，影片 4 約 9 分鐘。
