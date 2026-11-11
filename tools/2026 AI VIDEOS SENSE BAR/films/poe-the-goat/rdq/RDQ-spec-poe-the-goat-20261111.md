---
rdq_version: 1
edition: chatgpt-app
task: Poe the Goat 五句 phonics 故事短片（B3）
domain: video
date: 2026-11-11
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: hybrid-ai-film
---

# RDQ 需求規格：Poe the Goat phonics 短片

## 一句話任務
把 5 句 Poe the Goat 故事做成五年級 o_e／oa／ow phonics 教學短片：Seedance 拍故事、程式疊教學段。

## 已確認
- 台詞（第 1–3 句取自課本圖，第 4–5 句選 B）：
  1. Poe the Goat has a rose.
  2. Poe the Goat has a rose and a note.
  3. Poe the Goat rows a boat with the rose and the note.
  4. The wind blows. Snow falls on the boat and the goat.
  5. Poe puts on a coat and a robe and rows home with the rose and the note.
- 對象五年級；結構 2B：每句播兩次（第 2 次慢速）、目標字母變色、跟唸倒數，最後做 o_e／oa／ow 分類，全片約 3–4 分鐘。
- 做法 3A：B3 AI 短片＋程式疊教學段；角色 4A：原創山羊 Poe（橘色救生衣、黃色小船，參考課本圖的感覺但不複製插圖）。

## 已採納建議
- 5 鏡全部用 KIE Seedance 動作鏡，不用 H3 對嘴（旁白第三人稱）。
- 三色區分：o_e 紅、oa 藍、ow 綠；AI 畫面裡不出現任何字，字全部用程式疊。
- 先試拍 1 鏡 480p（約 20 點）確認 Poe 長相與畫風，再拍其餘 4 鏡。
- 片尾 3 題「聽字選拼法」。
- 同時輸出字幕版＋聽力版（聽力版不出整句字幕）。

## 待確認假設
- 配音：一位美式旁白，0.8 倍，用 VoxCPM2（**Colab 仍會用到一點**，只做配音／配樂，不跑 H3）。
- 片子順序：片頭 → 5 句逐句（正常速度＋畫面 → 慢速＋字母變色 → 跟唸 5-4-3-2-1）→ 分類（o_e：rose, note, robe, home／oa：Goat, boat, coat／ow：rows, blows, snow）→ 3 題（boat、snow、robe）→ 片尾。
- 「Poe」的 oe 不是目標拼法，不上色（跟課本一樣）；home 算 o_e 上紅色。
- 畫面 16:9 1080p；配樂很小聲；字幕 Comic Relief、後排看得到的大字。
- KIE 預算上限 **450 點**，超過先問。

## 本次不納入
- H3 對嘴鏡頭、新角色、課本插圖直接當畫面。

## 一段式需求規格
用 **hybrid-ai-film（B3）** 流程，為**五年級** phonics **o_e／oa／ow** 做一支約 **3–4 分鐘**英語短片。故事 5 句：「Poe the Goat has a rose.／Poe the Goat has a rose and a note.／Poe the Goat rows a boat with the rose and the note.／The wind blows. Snow falls on the boat and the goat.／Poe puts on a coat and a robe and rows home with the rose and the note.」。主角是原創山羊 **Poe**（橘色救生衣、黃色小船、湖景小鎮，不複製課本插圖），用 Codex CLI 畫定裝照和每鏡首幀（畫面不得有字）；5 鏡全部用 **KIE Seedance 2.0 Mini**，先試拍 1 鏡 **480p** 給老師確認，其餘用 720p，總預算 **450 點**以內；旁白一位美式聲音 **0.8 倍**（VoxCPM2）。程式疊教學層：每句正常＋慢速各一次，目標字母三色（**o_e 紅、oa 藍、ow 綠**），跟唸 5-4-3-2-1，最後分類與 3 題聽字選拼法；Comic Relief 大字幕、配樂很小聲、-16 LUFS；輸出**字幕版＋聽力版**。成果放 `films/poe-the-goat/`。

## 驗收條件
- [ ] 5 鏡 Poe 長相一致、動作符合句意（划船、颳風下雪、穿外套和袍子、划回家）。
- [ ] 每個目標字母顏色正確，變色時間對到旁白唸到的那個字。
- [ ] KIE 實際花費 ≤ 450 點並記錄。
- [ ] 字幕版＋聽力版 1080p 各一支，老師看過核准。
