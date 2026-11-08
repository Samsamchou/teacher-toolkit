---
rdq_version: 1
edition: chatgpt-app
task: Listen and Guess 口說題：修好 AI 評分＋可錄 5 次
domain: dev
date: 2026-11-08
status: confirmed
telemetry:
  mode: lite
  rounds: 0
  questions: 0
  q4_adopted: 0
  revisions: 0
downstream: self
---

# RDQ 需求規格：口說題 AI 評分修正

## 一句話任務
修好 Listen and Guess 口說題在 iPad 上「無法進行 AI 評分」的問題，並改成最多錄 5 次，第 5 次仍未滿 80 分才改成選擇題。

## 已確認
- 老師 iPad 實測：錄完送 AI 都顯示無法評分，第 2 次後就跳成選擇題。
- 原因（已查證）：iPad Safari 錄出來是 MP4 音訊，直接送給 AI 被拒；AI 本身正常（預覽網址送 WAV 測試有回分數）。故事站（hwg5-su-to-u04-story）的做法是先在 iPad 上把錄音解碼、轉成單聲道 WAV 再送。
- 新規則：學生**至少可以錄 5 次**；**第 5 次評分仍未滿 80 分**才改成選擇題；80 分以上照舊可去揭曉。

## 待確認假設
- 網路或 AI 暫時沒回應（不是分數問題）不算在 5 次裡；連續 3 次沒回應才改選擇題，避免學生卡住。
- 「聽句型示範」維持：連續 2 次未滿 80 分出現（嗶聲蓋住地點）。
- 錄音最長 8 秒；太短或沒聲音時提示「再大聲一點」，不算次數。

## 一段式需求規格
修改 **site/public/ershui-3d-quest-planetlisten/listen-app.mjs**：錄音完成後照 hwg5-su-to-u04-story 的做法，用 AudioContext（按錄音鍵時建立）把 Safari 的 MP4/WebM 解碼、混成單聲道、轉成 16-bit PCM **WAV** 再送 Gemini 3.7 Flash；口說題計次改成最多 **5 次**，第 5 次仍未滿 **80 分**才改選擇題，AI 沒回應不計次、連續 3 次才改選擇題；畫面顯示「第 n／5 次」。先在電腦用遊戲裡的英文語音檔走一遍「解碼→WAV→AI 評分」，再上預覽頻道 **ershui-preview** 請老師 iPad 實測。

## 驗收條件
- [ ] 電腦測試：MP3 語音檔 → 轉 WAV → AI 回傳句子與四個分數。
- [ ] 老師 iPad 錄音後看到「你說：…」與分數，不再出現無法評分。
- [ ] 錄滿 5 次都未滿 80 分才跳選擇題；畫面有「第 n／5 次」。
