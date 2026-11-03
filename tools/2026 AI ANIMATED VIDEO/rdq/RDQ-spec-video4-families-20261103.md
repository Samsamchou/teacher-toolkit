---
rdq_version: 1
edition: claude-code
task: 影片 4 SF3 U01 Families 單字教學動畫
domain: video
date: 2026-11-03
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: 3d-teacher-lesson-video
---

# RDQ 需求規格：影片 4〈Families〉

## 一句話任務
照 skill 3d-teacher-lesson-video 做 8–10 分鐘的四年級 SF3 U01 Families 單字教學動畫：-er、th、短母音，並帶入 He's my ___. / She's my ___.。

## 已確認
- 對象 **四年級**；長度 **8–10 分鐘**（1A）。
- 單字：**father (dad)、mother (mom)、grandfather (grandpa)、grandmother (grandma)、sister、brother**；句型 **He's my ___. / She's my ___.**，片尾 **It's me.**（建議③）。
- 發音重點（只用老師錄音）：**-er**（er.mp3）、**th 有聲 /ð/**（[th] voiced）、短母音 **a**（grand-）、**i**（sister）、**o 唸 /ʌ/**（mother、brother，用短 u 錄音）；片中說明 o 唸 /ʌ/、father 的 a 唸 /ɑ/（建議①）。
- 情境圖：Codex 原創「Emma 一家在客廳拍全家福」，不用課本插圖（2A）。
- **Emma 介紹家人的華麗剪紙對話段**，新角色＋斜臉嘴型（3A）。
- 短稱 dad／mom／grandpa／grandma 一起帶唸、句子練習兩種都用（建議②）；He's 藍色、She's 粉紅色＋男女圖示（建議④）；最後 3 題猜猜看（建議⑤）。
- 沿用：Nova／Cosmo、聲音、0.8 倍、"Repeat after me."、Comic Relief、Codex 生圖（額度用完再問是否用 API）、本機渲染、不 push。

## 待確認假設
- Emma 一家 7 人（Emma＋6 位家人）原創造型，和 Amy／Ben 同一個科幻太空站世界；家人不說話，只有 Emma 說話（只做 Emma 的嘴型）。
- 素材約 **35–45 張 Codex**：7 張定裝、全家福客廳場景 1–2 張、Emma 說話姿勢 4 個＋每個 4 種斜臉嘴型、家人各 1 個姿勢。
- 從 **video3-isit** 複製程式成 **video4-families**；腳本開新 Google 文件。
- 發音帶唸格式照影片 1：示範 → Repeat after me → 兩輪各留 2 秒 → 整字兩輪 → 句子留 3 秒。

## 一段式需求規格
用 skill **3d-teacher-lesson-video**，從 **video3-isit** 複製建立 **video4-families**，製作 **8–10 分鐘**的四年級 **SF3 U01 Families** 單字片：開場全家福（Codex 原創）→ 6 個家人單字與短稱（-er、th /ð/、短母音 a／i、o 唸 /ʌ/ 的說明，發音只用老師錄音）→ He's my ___.（藍）／She's my ___.（粉）句型帶唸 → Emma 介紹家人的華麗剪紙對話（斜臉嘴型）→ It's me. → 3 題猜猜看 → 片尾；每一關給老師確認。

## 驗收條件
- [ ] 腳本、定裝圖、素材、配音、樣張、試片逐關通過。
- [ ] 每個發音都用老師錄音，mother／brother 的 o 用短 u；片中說明 /ʌ/ 與 /ɑ/。
- [ ] 畫面上的字都由程式寫；全片 8–10 分鐘；嘴型跟著斜臉、無灰痕。
