---
rdq_version: 1
edition: chatgpt-app
task: The boy and the noisy toy pig：oy／oi phonics 故事短片（B4）
domain: video
date: 2026-11-11
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 2
  revisions: 0
downstream: phonics-story-video
---

# RDQ 需求規格：The Noisy Toy Pig（oy／oi）

## 一句話任務
把課本 4 句 the boy 句子＋3 句新句子做成六年級 oy／oi phonics 故事短片（phonics-story-video 流程）。

## 已確認（老師回「先這樣，直接開始」＝採推薦選項）
- 7 句台詞（1–4 課本、5–7 選 A 組）：
  1. The boy has some soybeans and coins.
  2. He puts them in his toy.
  3. Oh, no! 4. It makes a big noise!（同一鏡）
  5. "Oink! Oink!" says the toy pig.
  6. Mom points at the toy and joins the fun.
  7. Out comes a toy oyster, and the boy jumps for joy!
- 玩具＝**粉紅小豬撲滿**（不是課本的恐龍）；男孩、媽媽都原創設計，不照課本造型。
- 旁白沿用 Poe 的 **C 溫暖男聲（narC）**；KIE 上限 **550 點**。

## 已採納建議
- 測驗誘答（長得像、母音拼法不同）：**coin／cone**、**boy／bay**、**point／paint**。
- 黃豆寫明「一小碗乾的黃色黃豆」，避免畫成綠色毛豆。

## 待確認假設
- 顏色：**oy 紅、oi 藍**。
- 6 鏡全 Seedance（約 37 秒、約 300 點），試拍 1 鏡 480p（S03 噪音鏡）。
- 結構同 Poe：片頭 → 每句 3 次（S03 鏡的兩句一起）→ 分類 → 3 題 → 完整故事 → The End，約 4 分鐘。
- Colab：配音（7 句＋10 單字，只做 narC）＋配樂，約 3 單位。

## 本次不納入
- "Oink! Oink!" 漫畫對話框字效、試拍改雙人鏡。

## 一段式需求規格
用 **phonics-story-video** 流程，為**六年級** phonics **oy／oi** 做一支約 **4 分鐘**故事短片，台詞 7 句如上。角色：原創小男孩、媽媽、粉紅小豬撲滿（裝黃豆和錢幣、搖起來很吵、發出 oink、肚子跳出玩具牡蠣）。Codex 生定裝照、客廳場景、6 張首幀（畫面無字）；KIE Seedance 6 鏡，試拍 480p 一鏡，720p 正式，總上限 **550 點**；旁白 **narC** 0.8 倍、第二次 0.65 倍；目標字母 **oy 紅、oi 藍**；分類 oy／oi 兩欄；測驗 coin／cone、boy／bay、point／paint；片尾完整故事不停頓；字幕版＋聽力版。成果在 `films/toy-noise/`。

## 驗收條件
- [ ] 6 鏡男孩、媽媽、小豬撲滿長相一致，動作合句意。
- [ ] 目標字母顏色正確、念到才變色。
- [ ] KIE ≤ 550 點並記錄。
- [ ] 字幕版＋聽力版老師核准。
