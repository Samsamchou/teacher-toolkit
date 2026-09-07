---
rdq_version: 1
edition: chatgpt-app
task: 建立 HWG5 U1 L1 單字測驗
domain: dev
date: 2026-09-07
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：HWG5 Unit 1 Lesson 1 Vocabulary Quiz

## 一句話任務
以現有 Sunday–Saturday 圖片與 MP3 建立兩型各 7 題、每題四選一的 Vocabulary Quiz。

## 已確認
- 範圍是 **HWG5 → Unit 1 → Lesson 1**；Type A 與 Type B 各 7 題。
- Type A 為 **Look and Choose**，Type B 為 **Listen and Choose**，兩型皆顯示四個英文文字選項。
- 審核稿固定選項順序；正式作答時才逐題隨機打散選項。
- 出題順序為 Type A 7 題後接 Type B 7 題；各型依 Sunday–Saturday 排列。
- 本輪先完成審核稿、JSON 與一致性檢查；題庫內容核准後再接入網站、測試與本機預覽，不部署 Firebase。

## 待確認假設
- 圖卡已直接印出 Sun.–Sat. 與中文星期名稱，Type A 因此屬於「由圖卡辨識完整星期單字」的入門題型。
- MP3 先依檔名建立答案對應；正式接入前仍需逐檔聽辨確認實際語音。

## 已採納建議
- 使用獨立 quizId，保留既有 HWG7 題庫與作答資料。
- Markdown 審核稿與 JSON 網站資料檔執行逐題一致性檢查。
- 原始圖片與 MP3 不覆寫；網站素材另存安全檔名並記錄 SHA-256。
- 音檔若有誤先回報，不自行以 TTS 置換。
- Results 保留 quizId、book、unit、lesson 與完整題型名稱。

## 本次不納入
- 未經教師逐題核准前，不接入正式網站、不上傳媒體、不部署 Firebase。
- 不修改既有 HWG7 題庫、Lesson 設定或 Firestore 成績。

## 一段式需求規格
從 **HWG5 單字圖卡/HWG5U1** 讀取 Sunday–Saturday 共 7 張 JPG，從其 **mp3** 子資料夾讀取同名 7 個 MP3，建立 quizId **hwg5-u01-l1-vocabulary** 的 14 題題庫；Look and Choose 與 Listen and Choose 各 7 題，每題固定四個英文選項、唯一正解與固定 questionId，審核稿順序固定而正式作答順序隨機。先交付 Markdown、JSON、來源雜湊與一致性報告，取得教師內容核准後才進行網站整合。

## 驗收條件
- [x] 7 張圖片與 7 個 MP3 均存在，檔名能一一配對。
- [x] 教師已於 2026-09-07 核准 7 張圖片與 14 題題庫的素材、四個選項與正解。
- [x] Markdown 與 JSON 的題號、素材、選項與正解一致且驗證通過。
- [x] 核准後完成網站接入、7 個 MP3 瀏覽器解碼、79 項自動測試、正式建置與 1920×1080 本機 Chrome 預覽。

## 2026-09-07 接入結果

- 僅 **HWG5 → Unit 1 → Lesson 1** 啟用 `hwg5-u01-l1-vocabulary`；既有 HWG7 題庫與其他 45 節 Lesson 不變。
- 既有雲端／本機 14 Steps 在結構遷移時只更新原 Vocabulary Quiz Step；其餘 13 Steps 保留。
- 7 張無中文圖片與 7 個原始 MP3 已另存網站安全路徑；來源檔未覆寫。
- 自動化能確認 7 個 MP3 皆回應 HTTP 200 且可由 Chrome 解碼，但不把此技術檢查描述為真人發音品質評估；題目內容採教師本次核准為準。
- 本輪沒有部署 Firebase，也沒有送出 Firestore 測試成績。
