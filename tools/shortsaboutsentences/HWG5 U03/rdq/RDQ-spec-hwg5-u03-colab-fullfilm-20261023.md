---
rdq_version: 1
edition: claude-code
task: HWG5 U03 用 Colab 流程完成含字幕完整版
domain: video
date: 2026-10-23
status: confirmed
completed: 2026-10-23（教師核准完整版）
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: shanshiba Colab film workflow（self）
---

# RDQ 需求規格：HWG5 U03 Colab 完整版

## 一句話任務
用 shanshiba Colab 流程補做 9 段影片，接上已核准 4 段，完成 HWG5 U03 的英文字幕完整版。

## 已確認
- H3 授權地區：了解風險，全程在 Colab（美國／歐盟機房）跑（1A）。
- 聲音：沿用已核准 VoxCPM2 英文配音，每段 guide WAV 當固定音軌送 H3（2A）。
- 保留已核准 C02 v01、C04 v01、C05 v01、C06 v02；只做 C01、C03、C07–C13 共 9 段（3A）。
- 成品比照 Six Friends：封面＋封底＋英文字幕版＋無字幕版，不加配樂（4C）。
- 台詞、說話者以 full-film-dialogue-lock.json 為準（第 17 句 Ershui Elementary School）。

## 待確認假設
- 首尾幀 → 沿用 21 張核准皮克斯風分鏡（不跑 chars／masters／frames 生圖）。
- 規格 → 1536×864、24fps、每段 8 秒 192 幀，與已核准 4 段一致；成片輸出 1080p（另附 720p）。
- 重生上限 → 每段最多 3 個 take（Colab 重新計算，RunPod 舊 take 不算）；總預算上限 40 units。
- 封面／封底 → 用 Codex CLI 生圖，先給你看再用。
- 字幕 → Comic Relief、最多兩行、依實際配音對時、說話者分色。
- 工作位置 → 在 shanshiba repo 複製 `pipeline/hwg5_u03/` 執行；成品與 QA 另存 `HWG5 U03/Colab_fullfilm_v01/`；不 commit、不公開。

## 已採納建議
- ① 先試 C01 當閘門，你核准後才跑其餘 8 段。
- ② 提示詞鎖定明亮照明、禁止聚光燈／變暗；QA 自動量亮度曲線，比首幀暗超過 30% 判不合格。
- ③ 首幀＋尾幀都送 H3（h3_shot.py 的 last_frame）。
- ④ 語音辨識改英文比對（make_film.py 的 lang 改 English）。
- ⑤ 每段做驗收頁（嘴型抽格＋亮度對照），再進閘門。

## 本次不納入
- AI 配樂、片尾 AI 工具卡；重做配音；重做已核准 4 段；RunPod；公開上傳或 Git 推送。

## 一段式需求規格
在 Colab G4 上依 **shanshiba Colab film workflow** 製作 **HWG5 U03** 完整影片：於 shanshiba repo 建立 `pipeline/hwg5_u03/`，以 `H3_C06_voice-first_v01/inputs/` 的 **21 張核准分鏡**為首尾幀、`audio/fullfilm/C0x_guide_v01.wav` 為固定音軌（voice_mode fixed，跳過 Breeze 配音），以 **1536×864、24fps、8 秒**生成 **C01、C03、C07–C13 共 9 段**；提示詞鎖定明亮照明並禁止聚光燈、變暗、轉場與新增道具，語音辨識比對改英文。先開機只跑 **C01** 並做驗收頁（嘴型抽格＋亮度曲線），教師核准後才跑其餘 8 段；每段最多 **3 個 take**、總上限 **40 units**，等待閘門時 keepalive、交給教師看時停機。全部核准後與已核准 **C02 v01、C04 v01、C05 v01、C06 v02** 依 C01–C13 合成，加 Codex CLI 生成並經教師同意的封面、封底，輸出 **英文字幕版與無字幕版**（1080p，另附 720p）、SRT／ASS；成品與 QA 存 `HWG5 U03/Colab_fullfilm_v01/`，不加配樂、不公開、不 commit。

## 驗收條件
- [ ] 13 段皆為教師核准版本，台詞與說話者 18 句無遺漏。
- [ ] 每段亮度不低於首幀 70%，無聚光燈、轉場或新增道具。
- [ ] 完整版字幕對時、封面封底經教師同意，教師完整看聽核准。
- [ ] 實際 units 用量回報，未超過 40 units。
