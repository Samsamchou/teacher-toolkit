---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星 Guess 版「聽聲音」環境音加大到跟答案句一樣
domain: dev
date: 2026-11-17
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 0
  revisions: 0
downstream: self
---

# RDQ 需求規格：環境音音量

## 一句話任務
出題時的環境音線索改成和答案句同樣音量。

## 已知
- 音檔響度：環境音 −15.7～−20.9 LUFS；答案句約 −20 LUFS（差不多）。
- 播放：答案句 voice 固定 0 dB；環境音 = Sound 鍵 VOL_DB＋4（預設 Sound 1 ＝ −14 dB）→ 約小 14 dB。揭曉時 quiet 再小 16 dB。

## 已確認（老師「先這樣，直接開始」→ 採預設）
- 1A：只加大出題時的線索；揭曉時背景環境音維持小聲。
- 2A：出題環境音固定 0 dB（同答案句），Sound 0 才靜音。
- 3A：測試通過直接上正式站。

## 本次不納入
- ① 11 個音檔統一響度、② 限幅、③ Free Time 版、④（現行錄音靜音規則照舊，不用改）。

## 驗收條件
- [ ] game.gd play_amb 出題 0 dB、揭曉照舊；Godot 測試通過；正式站讀回 pck 已更新。
